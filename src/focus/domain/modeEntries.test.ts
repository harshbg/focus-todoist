import { describe, expect, it } from 'vitest';
import type { Mode } from './mode';
import { entriesForMode } from './modeEntries';
import type { FocusEntry } from './types';

function makeEntry(mode: Mode, title: string, extra: Partial<FocusEntry> = {}): FocusEntry {
  return {
    mode,
    start: '2026-10-20T10:00',
    minutes: 25,
    taskId: null,
    title,
    lane: null,
    rating: 5,
    source: 'timed',
    ...extra,
  };
}

describe('entriesForMode', () => {
  it('returns empty array when input entries are empty', () => {
    expect(entriesForMode([], 'work')).toEqual([]);
    expect(entriesForMode([], 'personal')).toEqual([]);
  });

  it('keeps only entries whose mode is work', () => {
    const w1 = makeEntry('work', 'Work task 1');
    const p1 = makeEntry('personal', 'Personal task 1');
    const w2 = makeEntry('work', 'Work task 2');
    const p2 = makeEntry('personal', 'Personal task 2');

    const result = entriesForMode([w1, p1, w2, p2], 'work');
    expect(result).toEqual([w1, w2]);
  });

  it('keeps only entries whose mode is personal', () => {
    const w1 = makeEntry('work', 'Work task 1');
    const p1 = makeEntry('personal', 'Personal task 1');
    const w2 = makeEntry('work', 'Work task 2');
    const p2 = makeEntry('personal', 'Personal task 2');

    const result = entriesForMode([w1, p1, w2, p2], 'personal');
    expect(result).toEqual([p1, p2]);
  });

  it('returns empty array when no entries match the requested mode', () => {
    const entries = [
      makeEntry('personal', 'P1'),
      makeEntry('personal', 'P2'),
    ];
    expect(entriesForMode(entries, 'work')).toEqual([]);
  });

  it('preserves all entry properties and the original order', () => {
    const w1 = makeEntry('work', 'Alpha', { start: '2026-10-20T08:00', minutes: 45, lane: 'Deep Dive', taskId: 't-1' });
    const p1 = makeEntry('personal', 'Beta');
    const w2 = makeEntry('work', 'Gamma', { start: '2026-10-20T14:00', minutes: 30, rating: null, source: 'manual' });

    const input = [w1, p1, w2];
    const result = entriesForMode(input, 'work');
    expect(result).toEqual([w1, w2]);
    expect(result[0]).toBe(w1);
    expect(result[1]).toBe(w2);
  });
});
