import { describe, expect, it } from 'vitest';
import type { FocusEntry, FocusSettings } from './types';
import { DEFAULT_FOCUS_SETTINGS } from './types';
import {
  attentionMap, bestWeekMinutes, cadence, calmCadence, comebacks, dayTotals,
  focusRun, footprint, isEligibleWorkday, mainLane, quality, strongWeeks,
  todayProgress, weekTotals, weeklyMomentum, weeklyTemple, yearGrid,
} from './metrics';

const settings: FocusSettings = DEFAULT_FOCUS_SETTINGS;
const now = new Date(2026, 9, 20, 15, 0);

function entry(start: string, minutes: number, fields: Partial<FocusEntry> = {}): FocusEntry {
  return {
    start, minutes, taskId: null, title: 'Focus', lane: null, rating: null, source: 'timed', ...fields,
  };
}

describe('daily and weekly totals', () => {
  it('uses local start dates and ISO week years', () => {
    const entries = [entry('2026-12-31T23:30', 60), entry('2027-01-01T00:30', 30)];
    expect([...dayTotals(entries)]).toEqual([['2026-12-31', 60], ['2027-01-01', 30]]);
    expect([...weekTotals(entries)]).toEqual([['2026-W53', 90]]);
  });

  it('lights each pip at its exact quarter and caps progress', () => {
    for (const [minutes, pips] of [
      [59, [false, false, false, false]],
      [60, [true, false, false, false]],
      [120, [true, true, false, false]],
      [180, [true, true, true, false]],
      [240, [true, true, true, true]],
    ] as const) {
      expect(todayProgress([entry('2026-10-20T09:00', minutes)], settings, now))
        .toMatchObject({ minutes, pips });
    }
    expect(todayProgress([entry('2026-10-20T09:00', 300)], settings, now))
      .toMatchObject({ remaining: 0, share: 1 });
    expect(todayProgress([], settings, now)).toMatchObject({ remaining: 240, share: 0 });
  });

  it('counts only full temple hours and caps blocks at the target', () => {
    expect(weeklyTemple([entry('2026-10-19T09:00', 119)], settings, now))
      .toMatchObject({ minutes: 119, blocks: 1, totalBlocks: 20 });
    expect(weeklyTemple([entry('2026-10-20T09:00', 1500)], settings, now))
      .toMatchObject({ minutes: 1500, blocks: 20, totalBlocks: 20 });
  });
});

describe('workday runs and returns', () => {
  it('skips weekends and exempt days, and lets an unfocused today wait', () => {
    const leave: FocusSettings = {
      ...settings,
      exemptDays: [{ date: '2026-10-14', kind: 'pto' }, { date: '2026-10-15', kind: 'holiday' }],
    };
    const entries = [
      entry('2026-10-12T09:00', 30), entry('2026-10-13T09:00', 30),
      entry('2026-10-16T09:00', 30), entry('2026-10-19T09:00', 30),
      entry('2026-10-20T09:00', 29),
    ];
    expect(isEligibleWorkday('2026-10-14', leave)).toBe(false);
    expect(isEligibleWorkday('2026-10-17', leave)).toBe(false);
    expect(isEligibleWorkday('2026-10-16', leave)).toBe(true);
    expect(focusRun(entries, leave, now)).toEqual({ current: 4, longest: 4, weekFocused: 1, weekEligible: 2 });
  });

  it('breaks on a missed eligible day and finds the longest historical run', () => {
    const entries = [
      entry('2026-10-05T09:00', 30), entry('2026-10-06T09:00', 30),
      entry('2026-10-07T09:00', 30), entry('2026-10-09T09:00', 30),
      entry('2026-10-12T09:00', 30), entry('2026-10-13T09:00', 30),
      entry('2026-10-14T09:00', 30), entry('2026-10-15T09:00', 30),
      entry('2026-10-19T09:00', 30),
    ];
    expect(focusRun(entries, settings, now)).toEqual({ current: 1, longest: 5, weekFocused: 1, weekEligible: 2 });
    expect(focusRun(entries, settings, new Date(2026, 9, 16, 12))).toMatchObject({ current: 5, longest: 5 });
    expect(focusRun(entries.slice(0, 3), settings, new Date(2026, 9, 9, 12)))
      .toMatchObject({ current: 0, longest: 3 });
  });

  it('requires an earlier focus and two missed eligible days for a comeback', () => {
    const entries = [
      entry('2026-10-08T09:00', 30), // Mon–Wed before this do not count without prior focus.
      entry('2026-10-13T09:00', 30), // Fri 9 and Mon 12 are missed.
      entry('2026-10-16T09:00', 30), // Wed 14 and Thu 15 are missed.
    ];
    expect(comebacks(entries, settings, now)).toBe(2);
    expect(comebacks([entry('2026-10-08T09:00', 30)], settings, now)).toBe(0);
    expect(comebacks([entry('2026-10-19T09:00', 30), entry('2026-10-20T09:00', 30)], settings, now)).toBe(0);
  });
});

describe('weekly recap', () => {
  it('counts strong weeks and the largest week', () => {
    const entries = [entry('2026-10-12T09:00', 1200), entry('2026-10-19T09:00', 1300), entry('2026-10-05T09:00', 1199)];
    expect(strongWeeks(entries, settings)).toBe(2);
    expect(bestWeekMinutes(entries)).toBe(1300);
    expect(bestWeekMinutes([])).toBe(0);
  });

  it('counts ratings, rounds the weekly average, and breaks lane ties alphabetically', () => {
    const entries = [
      entry('2026-10-19T09:00', 30, { rating: 4, lane: 'Zebra' }),
      entry('2026-10-20T09:00', 30, { rating: 4, lane: 'Alpha' }),
      entry('2026-10-20T10:00', 30, { rating: 5, lane: null }),
      entry('2026-10-12T09:00', 80, { rating: 3, lane: 'Older' }),
      entry('2026-10-20T11:00', 10),
    ];
    expect(quality(entries, now)).toEqual({ ratings: 4, bright: 3, weekAverage: 4.3 });
    expect(quality([], now).weekAverage).toBeNull();
    expect(mainLane(entries, now)).toBe('Alpha');
    expect(mainLane([], now)).toBeNull();
  });
});

describe('attention and cadence', () => {
  it('splits across an hourly slot and midnight, scales levels, and breaks best ties by day then slot', () => {
    const map = attentionMap([
      entry('2026-10-19T11:30', 90),
      entry('2026-10-19T23:30', 60),
      entry('2026-10-20T12:00', 60),
      entry('2026-07-01T12:00', 100),
    ], now);
    expect(map.minutes[0][7]).toBe(30);
    expect(map.minutes[0][8]).toBe(60);
    expect(map.minutes[0][17]).toBe(30);
    expect(map.minutes[1][0]).toBe(30);
    expect(map.minutes[1][8]).toBe(60);
    expect(map.levels[0][7]).toBe(2);
    expect(map.levels[0][8]).toBe(4);
    expect(map.levels[0][0]).toBe(0);
    expect(map.best).toEqual({ day: 0, slot: 8, minutes: 60 });
    expect(attentionMap([
      entry('2026-10-19T10:00', 60), entry('2026-10-19T12:00', 60),
    ], now).best).toEqual({ day: 0, slot: 6, minutes: 60 });
    expect(attentionMap([], now).best).toBeNull();
  });

  it('keeps last-day series oldest first, counts calm days, and caps footprint bricks', () => {
    const entries = [entry('2026-10-19T09:00', 31), entry('2026-10-20T09:00', 500)];
    expect(cadence(entries, now, 3)).toEqual([
      { date: '2026-10-18', minutes: 0 },
      { date: '2026-10-19', minutes: 31 },
      { date: '2026-10-20', minutes: 500 },
    ]);
    expect(calmCadence(entries, settings, now)).toBe(2);
    expect(footprint(entries, now).slice(-2)).toEqual([
      { date: '2026-10-19', bricks: 2 }, { date: '2026-10-20', bricks: 16 },
    ]);
    expect(footprint([], now)).toHaveLength(30);
  });
});

describe('year grid and momentum', () => {
  it('shows exempt status over focus, future days, and exactly 52 weeks', () => {
    const leave: FocusSettings = {
      ...settings,
      exemptDays: [{ date: '2026-10-19', kind: 'pto' }, { date: '2026-10-20', kind: 'holiday' }],
    };
    const entries = [entry('2026-10-19T09:00', 60), entry('2026-10-20T09:00', 60)];
    const grid = yearGrid(entries, leave, now);
    expect(grid).toHaveLength(52);
    expect(grid.at(-1)).toEqual({
      weekStart: '2026-10-19',
      days: [
        { date: '2026-10-19', state: 'pto' },
        { date: '2026-10-20', state: 'holiday' },
        { date: '2026-10-21', state: 'future' },
        { date: '2026-10-22', state: 'future' },
        { date: '2026-10-23', state: 'future' },
      ],
    });
    const momentum = weeklyMomentum(entries, leave, now);
    expect(momentum).toHaveLength(52);
    expect(momentum.at(-1)).toEqual({ weekStart: '2026-10-19', focusedDays: 0 });
    expect(weeklyMomentum(entries, settings, now).at(-1)?.focusedDays).toBe(2);
  });
});
