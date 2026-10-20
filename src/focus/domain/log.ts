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

/** The ISO week a floating start time belongs to, as `2026-W43` (ISO week-numbering year). */
export function weekKeyOf(start: string): string {
  throw new Error('not implemented');
}

/** The comment's first line for a week and part (part counts from 1). */
export function logHeader(week: string, part: number): string {
  throw new Error('not implemented');
}

/**
 * A log comment's week, part and entries, or null when the content is not a
 * log comment. A malformed entry is skipped, never fatal: one bad row must not
 * hide a week of focus.
 */
export function readLogComment(content: string): { week: string; part: number; entries: FocusEntry[] } | null {
  throw new Error('not implemented');
}

/**
 * The comments that hold a week's entries: sorted by start, titles cut to
 * LOG_TITLE_LIMIT, each comment at most LOG_COMMENT_LIMIT characters, parts
 * numbered from 1. An empty week is no comments.
 */
export function writeLogComments(week: string, entries: FocusEntry[]): string[] {
  throw new Error('not implemented');
}

/** What makes two entries the same block: its start and its task (or title, for a block with no task). */
export function entryKey(entry: FocusEntry): string {
  throw new Error('not implemented');
}

/**
 * Entries from every part and every week, one per key, sorted by start. When
 * two share a key (two devices wrote the same block), the later one in the
 * input wins, since a rewrite carries the edit.
 */
export function mergeEntries(lists: FocusEntry[][]): FocusEntry[] {
  throw new Error('not implemented');
}
