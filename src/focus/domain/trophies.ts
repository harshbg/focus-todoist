/**
 * The trophy cabinet: 39 trophies, each a goal on one number read from the
 * log. Nothing is stored; a trophy is unlocked whenever its number reaches the
 * goal, so it can never be lost.
 */

export const TIERS = ['bronze', 'silver', 'gold', 'platinum', 'palladium', 'rhodium', 'iridium', 'osmium'] as const;
export type Tier = typeof TIERS[number];

/** The numbers trophies are measured on (see metrics.ts for each). */
export interface TrophyMetrics {
  /** Completed blocks, all time. */
  sessions: number;
  /** Focused minutes, all time. */
  totalMinutes: number;
  bestWeekMinutes: number;
  strongWeeks: number;
  /** Blocks rated 4 or 5. */
  brightBlocks: number;
  ratings: number;
  comebacks: number;
}

export type TrophyFamily = 'sessions' | 'hours' | 'bigWeek' | 'strongWeeks' | 'bright' | 'ratings' | 'comebacks';

export interface Trophy {
  /** Stable, used for i18n keys and the world detail it unlocks: e.g. `sessions-25`, `hours-10000`. */
  id: string;
  family: TrophyFamily;
  tier: Tier;
  /** The goal, in the metric's own unit (minutes for bigWeek, hours for hours). */
  goal: number;
}

export interface TrophyProgress {
  trophy: Trophy;
  /** The metric in the goal's unit (whole hours for `hours`). */
  value: number;
  /** 0–1. */
  progress: number;
  unlocked: boolean;
}

/** All 39, in cabinet order (SPEC §4). */
export const TROPHIES: readonly Trophy[] = [];

export function trophyProgress(metrics: TrophyMetrics): TrophyProgress[] {
  throw new Error('not implemented');
}

/** The three locked trophies closest to done, most progress first; cabinet order breaks a tie. */
export function nextUp(progress: TrophyProgress[]): TrophyProgress[] {
  throw new Error('not implemented');
}
