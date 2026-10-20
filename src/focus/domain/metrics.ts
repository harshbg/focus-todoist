import type { FocusEntry, FocusSettings } from './types';

/**
 * Everything the focus pages show about the past, derived from the log. Each
 * function takes `now` rather than reading the clock, so tests can pin it.
 *
 * Dates are local calendar days as `yyyy-MM-dd`; a block counts on the day it
 * started. Weeks run Monday to Sunday.
 */

/** Minutes per local day. */
export function dayTotals(entries: FocusEntry[]): Map<string, number> {
  throw new Error('not implemented');
}

/** Minutes per ISO week, keyed like the log (`2026-W43`). */
export function weekTotals(entries: FocusEntry[]): Map<string, number> {
  throw new Error('not implemented');
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
  throw new Error('not implemented');
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
  throw new Error('not implemented');
}

/** A workday that counts: one of `settings.workdays` and not marked as time off. */
export function isEligibleWorkday(date: string, settings: FocusSettings): boolean {
  throw new Error('not implemented');
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
  throw new Error('not implemented');
}

/**
 * Returns after a pause: focused eligible days that follow at least two
 * unfocused eligible days in a row, after some earlier focused day. Never
 * goes down.
 */
export function comebacks(entries: FocusEntry[], settings: FocusSettings, now: Date): number {
  throw new Error('not implemented');
}

/** Weeks whose total reached the weekly target. */
export function strongWeeks(entries: FocusEntry[], settings: FocusSettings): number {
  throw new Error('not implemented');
}

/** The biggest weekly total so far, 0 with no history. */
export function bestWeekMinutes(entries: FocusEntry[]): number {
  throw new Error('not implemented');
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
  throw new Error('not implemented');
}

/** The lane with the most minutes this week; null when no block this week had one. */
export function mainLane(entries: FocusEntry[], now: Date): string | null {
  throw new Error('not implemented');
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
  throw new Error('not implemented');
}

/** Minutes per day for the last `days` days, oldest first, today last. */
export function cadence(entries: FocusEntry[], now: Date, days: number): Array<{ date: string; minutes: number }> {
  throw new Error('not implemented');
}

/** Days with at least `runThresholdMin` among the last 14, today included. */
export function calmCadence(entries: FocusEntry[], settings: FocusSettings, now: Date): number {
  throw new Error('not implemented');
}

/** The pixel footprint: per day for the last 30 days, ceil(minutes / 30) bricks, at most 16. */
export function footprint(entries: FocusEntry[], now: Date): Array<{ date: string; bricks: number }> {
  throw new Error('not implemented');
}

export type YearCell = 'focused' | 'pto' | 'holiday' | 'none' | 'future';

/**
 * The year grid: the 52 weeks ending with this one, oldest first, each listing
 * its workdays (settings.workdays only) with their state. An exempt day shows
 * its kind even when focus was logged on it.
 */
export function yearGrid(
  entries: FocusEntry[],
  settings: FocusSettings,
  now: Date,
): Array<{ weekStart: string; days: Array<{ date: string; state: YearCell }> }> {
  throw new Error('not implemented');
}

/** Focused eligible days per week for the same 52 weeks, oldest first. */
export function weeklyMomentum(
  entries: FocusEntry[],
  settings: FocusSettings,
  now: Date,
): Array<{ weekStart: string; focusedDays: number }> {
  throw new Error('not implemented');
}
