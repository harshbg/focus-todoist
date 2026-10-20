import { describe, expect, it } from 'vitest';
import { emptySnapshot, type Snapshot } from '@/domain/types';
import { buildDemoSnapshot } from '@/demo/demoData';
import { readFocusLog } from './domain/logStore';
import { demoFocusEntries } from './demo';

describe('demo focus history', () => {
  it('is the same on every build and fills about ninety days', () => {
    const today = new Date(2026, 9, 20);
    const first = demoFocusEntries([], today);
    expect(demoFocusEntries([], today)).toEqual(first);
    expect(first.length).toBeGreaterThan(80);
    expect(first.every((entry) => entry.start < '2026-10-20')).toBe(true);
  });

  it('reads back from the demo account like a real log', () => {
    const snapshot: Snapshot = buildDemoSnapshot('en');
    const log = readFocusLog(snapshot);
    expect(log.length).toBeGreaterThan(80);
    expect(readFocusLog(emptySnapshot())).toEqual([]);
  });
});
