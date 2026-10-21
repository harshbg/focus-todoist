import { getISOWeek, getISOWeekYear, parseISO } from 'date-fns';
import type { FocusEntry } from './types';

/**
 * The focus log as Todoist holds it: one comment per ISO week on the
 * "Focus log" project, split into parts when a week outgrows one comment.
 *
 *   Focus log · 2026-W43 · part 1 (edited by the app, please leave as is)
 *
 *   {"v":1,"e":[["2026-10-20T09:10",30,"8123456789","Causal analysis setup","Deep Dive",4,"t"]]}
 *
 * Each entry is a compact array [start, minutes, taskId, title, lane, rating,
 * source] with source "t" (timed) or "m" (manual), so a heavy week still fits.
 */

/** The first words of every log comment; what tells it apart from a user's comment. */
export const LOG_MARKER = 'Focus log';

/** Characters per comment, kept well under Todoist's own limit. */
export const LOG_COMMENT_LIMIT = 12000;

/** Longest title kept in an entry; longer ones are cut, ending with "…". */
export const LOG_TITLE_LIMIT = 120;

type CompactEntry = [string, number, string | null, string, string | null, number | null, 't' | 'm', ('w' | 'p')?];

const headerPattern = /^Focus log · (\d{4}-W\d{2}) · part ([1-9]\d*) \(edited by the app, please leave as is\)$/;

function isCompactEntry(value: unknown): value is CompactEntry {
  if (!Array.isArray(value) || (value.length !== 7 && value.length !== 8)) return false;
  const [start, minutes, taskId, title, lane, rating, source] = value;
  return typeof start === 'string'
    && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(start)
    && !Number.isNaN(parseISO(start).getTime())
    && typeof minutes === 'number' && Number.isInteger(minutes) && minutes >= 1
    && (typeof taskId === 'string' || taskId === null)
    && typeof title === 'string'
    && (typeof lane === 'string' || lane === null)
    && (rating === null || (typeof rating === 'number' && Number.isInteger(rating) && rating >= 1 && rating <= 5))
    && (source === 't' || source === 'm')
    && (value.length === 7 || value[7] === 'w' || value[7] === 'p');
}

function compactEntry(entry: FocusEntry): CompactEntry {
  const title = entry.title.length > LOG_TITLE_LIMIT
    ? `${entry.title.slice(0, LOG_TITLE_LIMIT - 1)}…`
    : entry.title;
  return [entry.start, entry.minutes, entry.taskId, title, entry.lane, entry.rating, entry.source === 'timed' ? 't' : 'm', entry.mode === 'work' ? 'w' : 'p'];
}

function commentContent(week: string, part: number, entries: CompactEntry[]): string {
  return `${logHeader(week, part)}\n\n${JSON.stringify({ v: 1, e: entries })}`;
}

/** The ISO week a floating start time belongs to, as `2026-W43` (ISO week-numbering year). */
export function weekKeyOf(start: string): string {
  const date = parseISO(start.slice(0, 10));
  return `${getISOWeekYear(date)}-W${String(getISOWeek(date)).padStart(2, '0')}`;
}

/** The comment's first line for a week and part (part counts from 1). */
export function logHeader(week: string, part: number): string {
  return `${LOG_MARKER} · ${week} · part ${part} (edited by the app, please leave as is)`;
}

/**
 * A log comment's week, part and entries, or null when the content is not a
 * log comment. A malformed entry is skipped, never fatal: one bad row must not
 * hide a week of focus.
 */
export function readLogComment(content: string): { week: string; part: number; entries: FocusEntry[] } | null {
  const separator = content.indexOf('\n\n');
  if (separator < 0) return null;
  const match = headerPattern.exec(content.slice(0, separator));
  if (!match) return null;

  let payload: unknown;
  try {
    payload = JSON.parse(content.slice(separator + 2));
  } catch {
    return null;
  }
  if (typeof payload !== 'object' || payload === null || !('v' in payload) || payload.v !== 1
    || !('e' in payload) || !Array.isArray(payload.e)) return null;

  const entries: FocusEntry[] = payload.e.filter(isCompactEntry).map((row) => ({
    start: row[0], minutes: row[1], taskId: row[2], title: row[3], lane: row[4],
    rating: row[5] as FocusEntry['rating'], source: row[6] === 't' ? 'timed' : 'manual',
    // Rows written before Work/Personal existed were deep work, so they read as Work.
    mode: row[7] === 'p' ? 'personal' : 'work',
  }));
  return { week: match[1], part: Number(match[2]), entries };
}

/**
 * The comments that hold a week's entries: sorted by start, titles cut to
 * LOG_TITLE_LIMIT, each comment at most LOG_COMMENT_LIMIT characters, parts
 * numbered from 1. An empty week is no comments.
 */
export function writeLogComments(week: string, entries: FocusEntry[]): string[] {
  if (entries.length === 0) return [];
  const rows = [...entries].sort((a, b) => a.start.localeCompare(b.start)).map(compactEntry);
  const comments: string[] = [];
  let part = 1;
  let current: CompactEntry[] = [];

  for (const row of rows) {
    const candidate = commentContent(week, part, [...current, row]);
    if (candidate.length <= LOG_COMMENT_LIMIT) {
      current.push(row);
      continue;
    }
    if (current.length > 0) {
      comments.push(commentContent(week, part, current));
      part += 1;
    }
    current = [row];
    if (commentContent(week, part, current).length > LOG_COMMENT_LIMIT) {
      throw new RangeError('Focus log entry exceeds the comment limit');
    }
  }
  comments.push(commentContent(week, part, current));
  return comments;
}

/** What makes two entries the same block: its start and its task (or title, for a block with no task). */
export function entryKey(entry: FocusEntry): string {
  return JSON.stringify([entry.start, entry.taskId, entry.taskId === null ? entry.title : null]);
}

/**
 * Entries from every part and every week, one per key, sorted by start. When
 * two share a key (two devices wrote the same block), the later one in the
 * input wins, since a rewrite carries the edit.
 */
export function mergeEntries(lists: FocusEntry[][]): FocusEntry[] {
  const byKey = new Map<string, FocusEntry>();
  for (const list of lists) {
    for (const entry of list) byKey.set(entryKey(entry), entry);
  }
  return [...byKey.values()].sort((a, b) => a.start.localeCompare(b.start));
}
