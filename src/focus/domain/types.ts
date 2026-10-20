/**
 * The focus feature's data. A focus entry is the only fact stored (in a
 * Todoist comment, see log.ts); everything shown about it is derived.
 */
import type { Mode } from './mode';

export type FocusRating = 1 | 2 | 3 | 4 | 5;

/** `timed` by the app's timer, or `manual` from "Log past focus". */
export type FocusSource = 'timed' | 'manual';

export interface FocusEntry {
  mode: Mode;
  /**
   * When the block started, as a floating local time `yyyy-MM-ddTHH:mm`.
   * Floating like Todoist's own due times: 9:10 stays 9:10 on a trip.
   */
  start: string;
  /** Focused minutes actually spent, pauses excluded. At least 1. */
  minutes: number;
  /** The Todoist task, or null for a block that named no task. */
  taskId: string | null;
  /** The task's title when the block ran, so the log still reads once the task is gone. */
  title: string;
  /** The lane (a Todoist label name) at the time, if any. */
  lane: string | null;
  rating: FocusRating | null;
  source: FocusSource;
}

export type ExemptKind = 'pto' | 'holiday';

export interface ExemptDay {
  /** `yyyy-MM-dd`. */
  date: string;
  kind: ExemptKind;
}

/** The settings the rules read. They travel in the app's settings comment. */
export interface FocusSettings {
  /** Default 240. */
  dailyTargetMin: number;
  /** Default 1200. */
  weeklyTargetMin: number;
  /** Minutes in a day that keep a workday alive in the run. Default 30. */
  runThresholdMin: number;
  /** ISO weekdays that count as workdays, 1 = Monday … 7 = Sunday. Default Mon–Fri. */
  workdays: number[];
  exemptDays: ExemptDay[];
}

export const DEFAULT_FOCUS_SETTINGS: FocusSettings = {
  dailyTargetMin: 240,
  weeklyTargetMin: 1200,
  runThresholdMin: 30,
  workdays: [1, 2, 3, 4, 5],
  exemptDays: [],
};

/** Everything the focus feature keeps in the app's preferences (SPEC §2.2). */
export interface FocusPreferences extends FocusSettings {
  workProjectIds: string[];
  personal: Pick<FocusSettings, 'dailyTargetMin' | 'weeklyTargetMin' | 'runThresholdMin' | 'workdays'> & { lanes: string[] };
  /** Todoist label names offered as lanes, in the order shown. */
  lanes: string[];
  /** Block lengths offered, in minutes. */
  blockLengths: number[];
  breakMin: number;
  /** Also leave a readable comment on the task when a block ends. */
  taskComment: boolean;
  sound: boolean;
}

export const DEFAULT_FOCUS_PREFERENCES: FocusPreferences = {
  ...DEFAULT_FOCUS_SETTINGS,
  workProjectIds: [],
  personal: {
    dailyTargetMin: 60,
    weeklyTargetMin: 300,
    runThresholdMin: 15,
    workdays: [1, 2, 3, 4, 5, 6, 7],
    lanes: ['Reading', 'Learning', 'Writing', 'Health', 'Home'],
  },
  lanes: ['Deep Dive', 'Analysis', 'Planning', 'Communication', 'Documentation'],
  blockLengths: [30, 60, 120],
  breakMin: 5,
  taskComment: false,
  sound: true,
};
