import { format } from 'date-fns';
import { describe, expect, it } from 'vitest';
import {
  entryKey, LOG_COMMENT_LIMIT, LOG_TITLE_LIMIT, logHeader, mergeEntries,
  readLogComment, weekKeyOf, writeLogComments,
} from './log';
import type { FocusEntry } from './types';

const startAt = (year: number, month: number, day: number, hour = 9, minute = 0): string =>
  format(new Date(year, month - 1, day, hour, minute), "yyyy-MM-dd'T'HH:mm");

const entry = (start: string, extra: Partial<FocusEntry> = {}): FocusEntry => ({
  start, minutes: 30, taskId: 'task-1', title: 'Draft notes', lane: 'Deep Dive',
  rating: 4, source: 'timed', ...extra,
});

describe('the focus log', () => {
  it('writes and reads the header, compact rows and sources', () => {
    const week = '2026-W43';
    const rows = [
      entry(startAt(2026, 10, 20, 9, 10)),
      entry(startAt(2026, 10, 20, 10, 0), {
        taskId: null, title: 'Review', lane: null, rating: null, source: 'manual',
      }),
    ];
    const [comment] = writeLogComments(week, rows);

    expect(comment).toBe(`${logHeader(week, 1)}\n\n${JSON.stringify({ v: 1, e: [
      [rows[0].start, 30, 'task-1', 'Draft notes', 'Deep Dive', 4, 't'],
      [rows[1].start, 30, null, 'Review', null, null, 'm'],
    ] })}`);
    expect(readLogComment(comment)).toEqual({ week, part: 1, entries: rows });
  });

  it('uses the ISO week-numbering year at year boundaries', () => {
    expect(weekKeyOf(startAt(2026, 12, 31))).toBe('2026-W53');
    expect(weekKeyOf(startAt(2027, 1, 1))).toBe('2026-W53');
    expect(weekKeyOf(startAt(2024, 12, 30))).toBe('2025-W01');
  });

  it('ignores a comment that is not a focus log', () => {
    expect(readLogComment('A regular project note')).toBeNull();
  });

  it('skips malformed rows and keeps valid ones', () => {
    const good = entry(startAt(2026, 10, 20));
    const content = `${logHeader('2026-W43', 1)}\n\n${JSON.stringify({ v: 1, e: [
      [good.start, 30, good.taskId, good.title, good.lane, 4, 't'],
      [good.start, '30', null, 'wrong minutes', null, null, 'm'],
      [good.start, 30, null, 'missing source', null, null],
      [good.start, 30, null, 'wrong source', null, null, 'x'],
      [good.start, 30, null, 'wrong rating', null, 6, 'm'],
    ] })}`;
    expect(readLogComment(content)).toEqual({ week: '2026-W43', part: 1, entries: [good] });
  });

  it('cuts long titles to 120 characters including the ellipsis', () => {
    const [comment] = writeLogComments('2026-W43', [entry(startAt(2026, 10, 20), {
      title: 'A'.repeat(LOG_TITLE_LIMIT + 20),
    })]);
    const title = readLogComment(comment)?.entries[0].title;
    expect(title).toBe(`${'A'.repeat(LOG_TITLE_LIMIT - 1)}…`);
    expect(title).toHaveLength(LOG_TITLE_LIMIT);
  });

  it('splits a heavy week into numbered parts within the comment limit', () => {
    const rows = Array.from({ length: 100 }, (_, i) => entry(startAt(2026, 10, 20, 9, i), {
      taskId: `task-${i}`, title: `Block ${i} ${'A'.repeat(110)}`,
    }));
    const comments = writeLogComments('2026-W43', rows);

    expect(comments.length).toBeGreaterThan(1);
    comments.forEach((comment, i) => {
      expect(comment.startsWith(`${logHeader('2026-W43', i + 1)}\n\n`)).toBe(true);
      expect(comment.length).toBeLessThanOrEqual(LOG_COMMENT_LIMIT);
    });
    expect(comments.flatMap((comment) => readLogComment(comment)?.entries ?? [])).toEqual(rows);
  });

  it('keeps the later duplicate and sorts merged entries by start', () => {
    const early = entry(startAt(2026, 10, 20, 8));
    const original = entry(startAt(2026, 10, 20, 10));
    const edited = { ...original, rating: 5 as const, minutes: 45 };
    const freeText = entry(original.start, { taskId: null, title: 'Draft notes' });

    expect(entryKey(original)).toBe(entryKey(edited));
    expect(entryKey(original)).not.toBe(entryKey(freeText));
    expect(mergeEntries([[original, freeText], [edited, early]])).toEqual([early, edited, freeText]);
  });

  it('writes no comments for an empty week', () => {
    expect(writeLogComments('2026-W43', [])).toEqual([]);
  });
});
