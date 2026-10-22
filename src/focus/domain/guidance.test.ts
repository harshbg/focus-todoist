import { describe, expect, it } from 'vitest';
import type { Item } from '@/domain/types';
import { missedBlock, plannedStart, startsBetween, weeklyInsight } from './guidance';
import type { FocusEntry } from './types';

const task = (id: string, date: string | null): Item => ({
  id, content: id, labels: [], checked: false, is_deleted: false, due: date ? { date } as Item['due'] : null,
} as unknown as Item);

const entry = (start: string, minutes: number, taskId: string | null = null, lane: string | null = null): FocusEntry => ({
  mode: 'work', start, minutes, taskId, title: 't', lane, rating: null, source: 'timed',
});

describe('gentle guidance', () => {
  it('reads a planned start only from a timed due date', () => {
    expect(plannedStart(task('a', '2026-10-20T09:30:00'))).toBe('2026-10-20T09:30');
    expect(plannedStart(task('b', '2026-10-20'))).toBeNull();
    expect(plannedStart(task('c', null))).toBeNull();
  });

  it('announces starts after the last check, up to now', () => {
    const items = [task('early', '2026-10-20T09:00:00'), task('now', '2026-10-20T09:05:00'), task('later', '2026-10-20T09:06:00')];
    expect(startsBetween(items, new Date(2026, 9, 20, 9, 0), new Date(2026, 9, 20, 9, 5)).map((item) => item.id)).toEqual(['now']);
  });

  it('offers a return for the latest planned block of today that never started', () => {
    const now = new Date(2026, 9, 20, 14, 0);
    const items = [
      task('yesterday', '2026-10-19T13:00:00'),
      task('started', '2026-10-20T10:00:00'),
      task('missed', '2026-10-20T11:00:00'),
      task('missedLater', '2026-10-20T13:30:00'),
      task('inGrace', '2026-10-20T13:50:00'),
    ];
    const entries = [entry('2026-10-20T09:50', 30, 'started')];
    expect(missedBlock(items, entries, now)?.id).toBe('missedLater');
    expect(missedBlock(items, [...entries, entry('2026-10-20T13:40', 20, 'missedLater')], now)?.id).toBe('missed');
    expect(missedBlock([items[1]], entries, now)).toBeNull();
  });

  it('sums up last week on Mondays only, and never an empty one', () => {
    const entries = [
      entry('2026-10-12T09:00', 60, 'a', 'Deep Dive'),
      entry('2026-10-14T09:00', 30, 'b', 'Analysis'),
      entry('2026-10-14T14:00', 45, 'c', 'Deep Dive'),
      entry('2026-10-19T09:00', 90, 'd', 'Analysis'),
    ];
    expect(weeklyInsight(entries, new Date(2026, 9, 19, 8))).toEqual({
      week: '2026-10-12', minutes: 135, blocks: 3, days: 2, lane: 'Deep Dive', bestDay: '2026-10-14',
    });
    expect(weeklyInsight(entries, new Date(2026, 9, 20, 8))).toBeNull();
    expect(weeklyInsight(entries, new Date(2026, 9, 12, 8))).toBeNull();
  });
});
