import { describe, expect, it } from 'vitest';
import { recentFocusedDays, worldStage } from './progressPresentation';
import type { FocusEntry } from './types';

const entry = (start: string, minutes: number): FocusEntry => ({
  mode: 'work',
  start, minutes, taskId: null, title: 'Work', lane: null, rating: null, source: 'timed',
});

describe('progress presentation', () => {
  it('selects the six world stages at their boundaries', () => {
    expect([0, 1, 4, 5, 12, 13, 25, 26, 38, 39].map(worldStage))
      .toEqual(['clearing', 'path', 'path', 'village', 'village', 'town', 'town', 'city', 'city', 'temple']);
  });

  it('groups recent focus by day, sorts newest first, and omits future days', () => {
    expect(recentFocusedDays([
      entry('2026-10-16T09:00', 30), entry('2026-10-19T09:00', 45),
      entry('2026-10-19T11:00', 15), entry('2026-10-17T09:00', 20),
      entry('2026-10-20T09:00', 60), entry('2026-10-21T09:00', 60),
    ], '2026-10-20')).toEqual([
      { date: '2026-10-20', minutes: 60 },
      { date: '2026-10-19', minutes: 60 },
      { date: '2026-10-17', minutes: 20 },
    ]);
  });

});
