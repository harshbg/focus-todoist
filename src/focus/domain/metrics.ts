import type { FocusEntry, FocusSettings } from './types';
import { addDays, addMinutes, addWeeks, differenceInMinutes, format, getISODay, parseISO, startOfDay, startOfISOWeek } from 'date-fns';
import { weekKeyOf } from './log';

/**
 * Everything the focus pages show about the past, derived from the log. Each
 * function takes `now` rather than reading the clock, so tests can pin it.
 *
 * Dates are local calendar days as `yyyy-MM-dd`; a block counts on the day it
 * started. Weeks run Monday to Sunday.
 */

/** Minutes per local day. */
export function dayTotals(entries: FocusEntry[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const entry of entries) {
    const day = entry.start.slice(0, 10);
    totals.set(day, (totals.get(day) ?? 0) + entry.minutes);
  }
  return totals;
}

const dayKey = (date: Date): string => format(date, 'yyyy-MM-dd');

/** Minutes per ISO week, keyed like the log (`2026-W43`). */
export function weekTotals(entries: FocusEntry[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const entry of entries) {
    const week = weekKeyOf(entry.start);
    totals.set(week, (totals.get(week) ?? 0) + entry.minutes);
  }
  return totals;
}

export interface TodayProgress {
  minutes: number;
  target: number;
  /** Never below 0. */
  remaining: number;
  /** 0–1, capped at 1. */
  share: number;
  /** Four daily-quest pips; pip i is lit once today reaches (i + 1) quarters of the target. */
  pips: [boolean, boolean, boolean, boolean];
}

export function todayProgress(entries: FocusEntry[], settings: FocusSettings, now: Date): TodayProgress {
  const minutes = dayTotals(entries).get(dayKey(now)) ?? 0;
  const target = settings.dailyTargetMin;
  return {
    minutes,
    target,
    remaining: Math.max(0, target - minutes),
    // A target of 0 would read as NaN; treat it as already met.
    share: target > 0 ? Math.min(1, minutes / target) : 1,
    pips: [1, 2, 3, 4].map((quarter) => minutes >= quarter * target / 4) as TodayProgress['pips'],
  };
}

export interface TempleProgress {
  /** Minutes this week. */
  minutes: number;
  target: number;
  /** One block per full hour this week, capped at totalBlocks. */
  blocks: number;
  /** One per hour of the weekly target (20 by default). */
  totalBlocks: number;
}

export function weeklyTemple(entries: FocusEntry[], settings: FocusSettings, now: Date): TempleProgress {
  const minutes = weekTotals(entries).get(weekKeyOf(dayKey(now))) ?? 0;
  const target = settings.weeklyTargetMin;
  const totalBlocks = target / 60;
  return { minutes, target, blocks: Math.min(Math.floor(minutes / 60), totalBlocks), totalBlocks };
}

/** A workday that counts: one of `settings.workdays` and not marked as time off. */
export function isEligibleWorkday(date: string, settings: FocusSettings): boolean {
  return settings.workdays.includes(getISODay(parseISO(date)))
    && !settings.exemptDays.some((day) => day.date === date);
}

function eachDay(from: Date, through: Date, visit: (date: Date, key: string) => void): void {
  for (let date = startOfDay(from); date <= through; date = addDays(date, 1)) {
    visit(date, dayKey(date));
  }
}

function firstHistoryDay(entries: FocusEntry[]): Date | null {
  if (entries.length === 0) return null;
  return parseISO(entries.reduce((first, entry) => entry.start < first ? entry.start : first, entries[0].start).slice(0, 10));
}

export interface RunSummary {
  /**
   * Eligible workdays in a row with at least `runThresholdMin`, ending at the
   * latest one. Days that are not eligible are skipped: they pause the run,
   * never break it. Today, while still unfocused, neither counts nor breaks.
   */
  current: number;
  /** The longest such run in all history. */
  longest: number;
  /** Focused eligible days this week so far. */
  weekFocused: number;
  /** Eligible days this week up to and including today. */
  weekEligible: number;
}

export function focusRun(entries: FocusEntry[], settings: FocusSettings, now: Date): RunSummary {
  const totals = dayTotals(entries);
  let current = 0;
  let longest = 0;
  let rolling = 0;
  let weekFocused = 0;
  let weekEligible = 0;
  const today = dayKey(now);
  const first = firstHistoryDay(entries);
  if (first && first <= now) {
    eachDay(first, now, (_date, key) => {
      if (!isEligibleWorkday(key, settings)) return;
      const focused = (totals.get(key) ?? 0) >= settings.runThresholdMin;
      if (key < today || focused) {
        rolling = focused ? rolling + 1 : 0;
        longest = Math.max(longest, rolling);
        current = rolling;
      }
    });
  }
  eachDay(startOfISOWeek(now), now, (_date, key) => {
    if (!isEligibleWorkday(key, settings)) return;
    weekEligible += 1;
    if ((totals.get(key) ?? 0) >= settings.runThresholdMin) weekFocused += 1;
  });
  return { current, longest, weekFocused, weekEligible };
}

/**
 * Returns after a pause: focused eligible days that follow at least two
 * unfocused eligible days in a row, after some earlier focused day. Never
 * goes down.
 */
export function comebacks(entries: FocusEntry[], settings: FocusSettings, now: Date): number {
  const first = firstHistoryDay(entries);
  if (!first || first > now) return 0;
  const totals = dayTotals(entries);
  let hadFocus = false;
  let missed = 0;
  let count = 0;
  eachDay(first, now, (_date, key) => {
    if (!isEligibleWorkday(key, settings)) return;
    if ((totals.get(key) ?? 0) >= settings.runThresholdMin) {
      if (hadFocus && missed >= 2) count += 1;
      hadFocus = true;
      missed = 0;
    } else if (key < dayKey(now)) {
      missed += 1;
    }
  });
  return count;
}

/** Weeks whose total reached the weekly target. */
export function strongWeeks(entries: FocusEntry[], settings: FocusSettings): number {
  return [...weekTotals(entries).values()].filter((minutes) => minutes >= settings.weeklyTargetMin).length;
}

/** The biggest weekly total so far, 0 with no history. */
export function bestWeekMinutes(entries: FocusEntry[]): number {
  return Math.max(0, ...weekTotals(entries).values());
}

export interface QualitySummary {
  /** Rated blocks, all time. */
  ratings: number;
  /** Blocks rated 4 or 5, all time. */
  bright: number;
  /** Average rating this week, one decimal; null when nothing was rated. */
  weekAverage: number | null;
}

export function quality(entries: FocusEntry[], now: Date): QualitySummary {
  const rated = entries.filter((entry) => entry.rating !== null);
  const thisWeek = rated.filter((entry) => weekKeyOf(entry.start) === weekKeyOf(dayKey(now)));
  return {
    ratings: rated.length,
    bright: rated.filter((entry) => (entry.rating ?? 0) >= 4).length,
    weekAverage: thisWeek.length
      ? Math.round(thisWeek.reduce((sum, entry) => sum + (entry.rating ?? 0), 0) / thisWeek.length * 10) / 10
      : null,
  };
}

/** The lane with the most minutes this week; null when no block this week had one. */
export function mainLane(entries: FocusEntry[], now: Date): string | null {
  const totals = new Map<string, number>();
  const currentWeek = weekKeyOf(dayKey(now));
  for (const entry of entries) {
    if (entry.lane === null || weekKeyOf(entry.start) !== currentWeek) continue;
    totals.set(entry.lane, (totals.get(entry.lane) ?? 0) + entry.minutes);
  }
  const ranked = [...totals].sort(([a, am], [b, bm]) => bm - am || a.localeCompare(b));
  return ranked[0]?.[0] ?? null;
}

/**
 * The attention map's 18 columns: two-hour slots through the night and hourly
 * ones through the day. `end` is exclusive; hours are 0–24.
 */
export const ATTENTION_SLOTS: ReadonlyArray<{ start: number; end: number }> = [
  { start: 0, end: 2 }, { start: 2, end: 4 }, { start: 4, end: 6 }, { start: 6, end: 8 },
  { start: 8, end: 9 }, { start: 9, end: 10 }, { start: 10, end: 11 }, { start: 11, end: 12 },
  { start: 12, end: 13 }, { start: 13, end: 14 }, { start: 14, end: 15 }, { start: 15, end: 16 },
  { start: 16, end: 17 }, { start: 17, end: 18 }, { start: 18, end: 19 }, { start: 19, end: 20 },
  { start: 20, end: 22 }, { start: 22, end: 24 },
];

export interface AttentionMap {
  /** minutes[day][slot]: day 0 = Monday … 6 = Sunday, slot indexes ATTENTION_SLOTS. */
  minutes: number[][];
  /** 0 for an empty cell, else 1–4: ceil(4 × minutes / the busiest cell). */
  levels: number[][];
  /** The busiest cell; the earliest day, then earliest slot, wins a tie. Null with no blocks. */
  best: { day: number; slot: number; minutes: number } | null;
}

/**
 * Where the last `days` days of focus fell (today included). A block that
 * crosses a slot boundary, or midnight, splits its minutes across the slots
 * and days it covers.
 */
export function attentionMap(entries: FocusEntry[], now: Date, days?: number): AttentionMap {
  const minutes = Array.from({ length: 7 }, () => Array<number>(ATTENTION_SLOTS.length).fill(0));
  const first = startOfDay(addDays(now, 1 - (days ?? 90)));
  const last = addDays(startOfDay(now), 1);
  for (const entry of entries) {
    let cursor = parseISO(entry.start);
    const end = addMinutes(cursor, entry.minutes);
    if (cursor < first) cursor = first;
    while (cursor < end && cursor < last) {
      const hour = cursor.getHours();
      const slot = ATTENTION_SLOTS.findIndex(({ start, end: slotEnd }) => hour >= start && hour < slotEnd);
      const boundary = new Date(cursor);
      boundary.setHours(ATTENTION_SLOTS[slot].end, 0, 0, 0);
      const next = new Date(Math.min(boundary.getTime(), end.getTime(), last.getTime()));
      minutes[getISODay(cursor) - 1][slot] += differenceInMinutes(next, cursor);
      cursor = next;
    }
  }
  let best: AttentionMap['best'] = null;
  for (let day = 0; day < 7; day += 1) {
    for (let slot = 0; slot < ATTENTION_SLOTS.length; slot += 1) {
      const value = minutes[day][slot];
      if (value > (best?.minutes ?? 0)) best = { day, slot, minutes: value };
    }
  }
  const max = best?.minutes ?? 0;
  const levels = minutes.map((row) => row.map((value) => value ? Math.ceil(4 * value / max) : 0));
  return { minutes, levels, best };
}

/** Minutes per day for the last `days` days, oldest first, today last. */
export function cadence(entries: FocusEntry[], now: Date, days: number): Array<{ date: string; minutes: number }> {
  const totals = dayTotals(entries);
  return Array.from({ length: days }, (_, index) => {
    const date = dayKey(addDays(now, index + 1 - days));
    return { date, minutes: totals.get(date) ?? 0 };
  });
}

/** Days with at least `runThresholdMin` among the last 14, today included. */
export function calmCadence(entries: FocusEntry[], settings: FocusSettings, now: Date): number {
  return cadence(entries, now, 14).filter(({ minutes }) => minutes >= settings.runThresholdMin).length;
}

/** The pixel footprint: per day for the last 30 days, ceil(minutes / 30) bricks, at most 16. */
export function footprint(entries: FocusEntry[], now: Date): Array<{ date: string; bricks: number }> {
  return cadence(entries, now, 30).map(({ date, minutes }) => ({ date, bricks: Math.min(16, Math.ceil(minutes / 30)) }));
}

export type YearCell = 'focused' | 'pto' | 'holiday' | 'none' | 'future';

/**
 * The year grid: the 52 weeks ending with this one, oldest first, each listing
 * its workdays (settings.workdays only) with their state. An exempt day shows
 * its kind even when focus was logged on it, and ahead of time, so planned
 * leave is visible before it starts.
 */
export function yearGrid(
  entries: FocusEntry[],
  settings: FocusSettings,
  now: Date,
): Array<{ weekStart: string; days: Array<{ date: string; state: YearCell }> }> {
  const totals = dayTotals(entries);
  const firstWeek = addWeeks(startOfISOWeek(now), -51);
  const today = dayKey(now);
  return Array.from({ length: 52 }, (_, index) => {
    const start = addWeeks(firstWeek, index);
    const days = Array.from({ length: 7 }, (_, offset) => dayKey(addDays(start, offset)))
      .filter((date) => settings.workdays.includes(getISODay(parseISO(date))))
      .map((date) => {
        const exempt = settings.exemptDays.find((day) => day.date === date);
        const state: YearCell = exempt ? exempt.kind
          : date > today ? 'future'
            : (totals.get(date) ?? 0) >= settings.runThresholdMin ? 'focused' : 'none';
        return { date, state };
      });
    return { weekStart: dayKey(start), days };
  });
}

/** Focused eligible days per week for the same 52 weeks, oldest first. */
export function weeklyMomentum(
  entries: FocusEntry[],
  settings: FocusSettings,
  now: Date,
): Array<{ weekStart: string; focusedDays: number }> {
  return yearGrid(entries, settings, now).map(({ weekStart, days }) => ({
    weekStart,
    focusedDays: days.filter(({ state }) => state === 'focused').length,
  }));
}
