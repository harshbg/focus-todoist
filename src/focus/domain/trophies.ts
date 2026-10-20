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
export const TROPHIES: readonly Trophy[] = [
  // Sessions: completed blocks
  { id: 'sessions-1', family: 'sessions', tier: 'bronze', goal: 1 },
  { id: 'sessions-10', family: 'sessions', tier: 'bronze', goal: 10 },
  { id: 'sessions-25', family: 'sessions', tier: 'silver', goal: 25 },
  { id: 'sessions-50', family: 'sessions', tier: 'gold', goal: 50 },
  { id: 'sessions-100', family: 'sessions', tier: 'palladium', goal: 100 },
  { id: 'sessions-250', family: 'sessions', tier: 'rhodium', goal: 250 },
  { id: 'sessions-500', family: 'sessions', tier: 'iridium', goal: 500 },
  { id: 'sessions-1000', family: 'sessions', tier: 'osmium', goal: 1000 },

  // Lifetime hours: total hours
  { id: 'hours-25', family: 'hours', tier: 'bronze', goal: 25 },
  { id: 'hours-50', family: 'hours', tier: 'silver', goal: 50 },
  { id: 'hours-100', family: 'hours', tier: 'silver', goal: 100 },
  { id: 'hours-200', family: 'hours', tier: 'gold', goal: 200 },
  { id: 'hours-500', family: 'hours', tier: 'gold', goal: 500 },
  { id: 'hours-1000', family: 'hours', tier: 'platinum', goal: 1000 },
  { id: 'hours-2000', family: 'hours', tier: 'platinum', goal: 2000 },
  { id: 'hours-3000', family: 'hours', tier: 'palladium', goal: 3000 },
  { id: 'hours-4000', family: 'hours', tier: 'palladium', goal: 4000 },
  { id: 'hours-5000', family: 'hours', tier: 'rhodium', goal: 5000 },
  { id: 'hours-6000', family: 'hours', tier: 'rhodium', goal: 6000 },
  { id: 'hours-7000', family: 'hours', tier: 'iridium', goal: 7000 },
  { id: 'hours-8000', family: 'hours', tier: 'iridium', goal: 8000 },
  { id: 'hours-9000', family: 'hours', tier: 'osmium', goal: 9000 },
  { id: 'hours-10000', family: 'hours', tier: 'osmium', goal: 10000 },

  // Big weeks: bestWeekMinutes
  { id: 'bigWeek-1200', family: 'bigWeek', tier: 'gold', goal: 1200 },
  { id: 'bigWeek-2400', family: 'bigWeek', tier: 'palladium', goal: 2400 },

  // Strong weeks: strongWeeks
  { id: 'strongWeeks-3', family: 'strongWeeks', tier: 'bronze', goal: 3 },
  { id: 'strongWeeks-12', family: 'strongWeeks', tier: 'gold', goal: 12 },
  { id: 'strongWeeks-25', family: 'strongWeeks', tier: 'rhodium', goal: 25 },
  { id: 'strongWeeks-52', family: 'strongWeeks', tier: 'osmium', goal: 52 },

  // Bright blocks: brightBlocks
  { id: 'bright-10', family: 'bright', tier: 'bronze', goal: 10 },
  { id: 'bright-25', family: 'bright', tier: 'gold', goal: 25 },
  { id: 'bright-100', family: 'bright', tier: 'rhodium', goal: 100 },
  { id: 'bright-250', family: 'bright', tier: 'osmium', goal: 250 },

  // Ratings: ratings
  { id: 'ratings-10', family: 'ratings', tier: 'bronze', goal: 10 },
  { id: 'ratings-50', family: 'ratings', tier: 'palladium', goal: 50 },
  { id: 'ratings-200', family: 'ratings', tier: 'osmium', goal: 200 },

  // Comebacks: comebacks
  { id: 'comebacks-5', family: 'comebacks', tier: 'bronze', goal: 5 },
  { id: 'comebacks-25', family: 'comebacks', tier: 'palladium', goal: 25 },
  { id: 'comebacks-100', family: 'comebacks', tier: 'osmium', goal: 100 },
];

function metricValue(family: TrophyFamily, metrics: TrophyMetrics): number {
  switch (family) {
    case 'sessions':
      return metrics.sessions;
    case 'hours':
      return Math.floor(metrics.totalMinutes / 60);
    case 'bigWeek':
      return metrics.bestWeekMinutes;
    case 'strongWeeks':
      return metrics.strongWeeks;
    case 'bright':
      return metrics.brightBlocks;
    case 'ratings':
      return metrics.ratings;
    case 'comebacks':
      return metrics.comebacks;
  }
}

export function trophyProgress(metrics: TrophyMetrics): TrophyProgress[] {
  return TROPHIES.map((trophy) => {
    const value = metricValue(trophy.family, metrics);
    const progress = Math.min(1, Math.max(0, value / trophy.goal));
    return {
      trophy,
      value,
      progress,
      unlocked: value >= trophy.goal,
    };
  });
}

const cabinetIndex = new Map(TROPHIES.map((trophy, index) => [trophy.id, index]));

/** The three locked trophies closest to done, most progress first; cabinet order breaks a tie. */
export function nextUp(progress: TrophyProgress[]): TrophyProgress[] {
  return progress
    .filter((entry) => !entry.unlocked)
    .sort((a, b) => {
      if (b.progress !== a.progress) {
        return b.progress - a.progress;
      }
      const orderA = cabinetIndex.get(a.trophy.id);
      const orderB = cabinetIndex.get(b.trophy.id);
      if (orderA !== undefined && orderB !== undefined) {
        return orderA - orderB;
      }
      return 0;
    })
    .slice(0, 3);
}
