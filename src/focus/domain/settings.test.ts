import { describe, expect, it } from 'vitest';
import { readFocusPreferences, settingsFor } from './settings';
import { DEFAULT_FOCUS_PREFERENCES } from './types';

describe('readFocusPreferences', () => {
  it.each([null, undefined, 'settings', 3, true, []])('uses defaults for non-object input %s', (stored) => {
    expect(readFocusPreferences(stored)).toEqual(DEFAULT_FOCUS_PREFERENCES);
  });

  it('uses separate arrays for defaults returned to callers', () => {
    const result = readFocusPreferences(null);
    expect(result.workdays).not.toBe(DEFAULT_FOCUS_PREFERENCES.workdays);
    expect(result.lanes).not.toBe(DEFAULT_FOCUS_PREFERENCES.lanes);
    expect(result.blockLengths).not.toBe(DEFAULT_FOCUS_PREFERENCES.blockLengths);
  });

  it.each([
    ['dailyTargetMin', 15, 1440, 240],
    ['weeklyTargetMin', 60, 10080, 1200],
    ['runThresholdMin', 1, 480, 30],
    ['breakMin', 1, 60, 5],
  ] as const)('accepts the inclusive range for %s and falls back outside it', (field, min, max, fallback) => {
    expect(readFocusPreferences({ [field]: min })[field]).toBe(min);
    expect(readFocusPreferences({ [field]: max })[field]).toBe(max);
    for (const invalid of [min - 1, max + 1, min + 0.5, '30', null, Number.NaN, Infinity]) {
      expect(readFocusPreferences({ [field]: invalid })[field]).toBe(fallback);
    }
  });

  it('filters, de-duplicates, and sorts workdays, including both ISO endpoints', () => {
    expect(readFocusPreferences({ workdays: [7, 1, 3, 7, 0, 8, 2.5, '2'] }).workdays)
      .toEqual([1, 3, 7]);
    expect(readFocusPreferences({ workdays: [] }).workdays).toEqual([1, 2, 3, 4, 5]);
    expect(readFocusPreferences({ workdays: [0, '1'] }).workdays).toEqual([1, 2, 3, 4, 5]);
    expect(readFocusPreferences({ workdays: 'weekdays' }).workdays).toEqual([1, 2, 3, 4, 5]);
  });

  it('filters, de-duplicates, and sorts block lengths, including both endpoints', () => {
    expect(readFocusPreferences({ blockLengths: [240, 5, 30, 5, 4, 241, 5.5, '60'] }).blockLengths)
      .toEqual([5, 30, 240]);
    expect(readFocusPreferences({ blockLengths: [] }).blockLengths).toEqual([30, 60, 120]);
    expect(readFocusPreferences({ blockLengths: [4, 241] }).blockLengths).toEqual([30, 60, 120]);
    expect(readFocusPreferences({ blockLengths: null }).blockLengths).toEqual([30, 60, 120]);
  });

  it('keeps valid exempt days, with the later kind winning for duplicate dates', () => {
    expect(readFocusPreferences({ exemptDays: [
      { date: '2026-12-25', kind: 'holiday' },
      { date: '2024-02-29', kind: 'pto' },
      { date: '2026-12-25', kind: 'pto' },
      { date: '2025-02-29', kind: 'pto' },
      { date: '2026-02-30', kind: 'holiday' },
      { date: '2026-1-01', kind: 'pto' },
      { date: '2026-01-01', kind: 'sick' },
      { date: '2026-01-01', kind: 'holiday' },
      { date: 123, kind: 'pto' },
      null,
    ] }).exemptDays).toEqual([
      { date: '2024-02-29', kind: 'pto' },
      { date: '2026-01-01', kind: 'holiday' },
      { date: '2026-12-25', kind: 'pto' },
    ]);
    expect(readFocusPreferences({ exemptDays: [null, { date: '2026-02-30', kind: 'pto' }] }).exemptDays).toEqual([]);
    expect(readFocusPreferences({ exemptDays: '2026-01-01' }).exemptDays).toEqual([]);
  });

  it('trims lanes, keeps the first case-insensitive spelling, and limits them to 12', () => {
    const lanes = [' Deep Dive ', 'deep dive', '', '   ', null, ...Array.from({ length: 13 }, (_, i) => `Lane ${i + 1}`)];
    expect(readFocusPreferences({ lanes }).lanes)
      .toEqual(['Deep Dive', ...Array.from({ length: 11 }, (_, i) => `Lane ${i + 1}`)]);
    expect(readFocusPreferences({ lanes: [] }).lanes).toEqual([]);
    expect(readFocusPreferences({ lanes: [null, '  '] }).lanes).toEqual([]);
    expect(readFocusPreferences({ lanes: 'Deep Dive' }).lanes).toEqual(DEFAULT_FOCUS_PREFERENCES.lanes);
  });

  it('accepts booleans and falls back for malformed booleans', () => {
    expect(readFocusPreferences({ taskComment: true, sound: false })).toMatchObject({ taskComment: true, sound: false });
    expect(readFocusPreferences({ taskComment: 'true', sound: 0 })).toMatchObject({ taskComment: false, sound: true });
  });

  it('does not let one malformed field affect the other choices', () => {
    expect(readFocusPreferences({
      dailyTargetMin: 'bad',
      weeklyTargetMin: 1800,
      workdays: [2, 4],
      lanes: [' Writing '],
      taskComment: true,
    })).toEqual({
      ...DEFAULT_FOCUS_PREFERENCES,
      weeklyTargetMin: 1800,
      workdays: [2, 4],
      lanes: ['Writing'],
      taskComment: true,
    });
  });

  it('keeps valid workProjectIds, filters out non-strings and empty strings, and de-duplicates', () => {
    expect(readFocusPreferences({}).workProjectIds).toEqual([]);
    expect(readFocusPreferences({ workProjectIds: ['p1', '', 'p2', 123, null, 'p1', 'p3'] }).workProjectIds)
      .toEqual(['p1', 'p2', 'p3']);
    expect(readFocusPreferences({ workProjectIds: 'not-an-array' }).workProjectIds).toEqual([]);
  });

  it('validates personal settings with defaults and same ranges as work', () => {
    expect(readFocusPreferences({}).personal).toEqual(DEFAULT_FOCUS_PREFERENCES.personal);

    const valid = {
      dailyTargetMin: 120,
      weeklyTargetMin: 600,
      runThresholdMin: 20,
      workdays: [1, 3, 5],
      lanes: ['Personal Project', 'Exercise'],
    };
    expect(readFocusPreferences({ personal: valid }).personal).toEqual(valid);

    // Invalid values fall back to defaults
    expect(readFocusPreferences({
      personal: {
        dailyTargetMin: 10, // below 15
        weeklyTargetMin: 20000, // above 10080
        runThresholdMin: 0, // below 1
        workdays: [0, 8], // out of 1-7
        lanes: 'bad',
      },
    }).personal).toEqual(DEFAULT_FOCUS_PREFERENCES.personal);
  });
});

describe('settingsFor', () => {
  it('returns work targets and lanes for work mode, personal for personal mode, and shared exemptDays', () => {
    const prefs = readFocusPreferences({
      dailyTargetMin: 300,
      weeklyTargetMin: 1500,
      runThresholdMin: 45,
      workdays: [1, 2, 3, 4],
      lanes: ['Coding', 'Meetings'],
      exemptDays: [{ date: '2026-10-24', kind: 'pto' }],
      personal: {
        dailyTargetMin: 90,
        weeklyTargetMin: 450,
        runThresholdMin: 20,
        workdays: [6, 7],
        lanes: ['Guitar', 'Reading'],
      },
    });

    expect(settingsFor(prefs, 'work')).toEqual({
      dailyTargetMin: 300,
      weeklyTargetMin: 1500,
      runThresholdMin: 45,
      workdays: [1, 2, 3, 4],
      exemptDays: [{ date: '2026-10-24', kind: 'pto' }],
      lanes: ['Coding', 'Meetings'],
    });

    expect(settingsFor(prefs, 'personal')).toEqual({
      dailyTargetMin: 90,
      weeklyTargetMin: 450,
      runThresholdMin: 20,
      workdays: [6, 7],
      exemptDays: [{ date: '2026-10-24', kind: 'pto' }],
      lanes: ['Guitar', 'Reading'],
    });
  });
});
