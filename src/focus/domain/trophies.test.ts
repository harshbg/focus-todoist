import { describe, expect, it } from 'vitest';
import { nextUp, TIERS, TROPHIES, trophyProgress } from './trophies';
import type { TrophyMetrics, TrophyProgress } from './trophies';

function zeroMetrics(overrides: Partial<TrophyMetrics> = {}): TrophyMetrics {
  return {
    sessions: 0,
    totalMinutes: 0,
    bestWeekMinutes: 0,
    strongWeeks: 0,
    brightBlocks: 0,
    ratings: 0,
    comebacks: 0,
    ...overrides,
  };
}

describe('trophy cabinet definition', () => {
  it('has exactly 39 trophies with unique ids', () => {
    expect(TROPHIES).toHaveLength(39);
    const ids = new Set(TROPHIES.map((trophy) => trophy.id));
    expect(ids.size).toBe(39);
  });

  it('matches each family count from SPEC §4', () => {
    const counts = TROPHIES.reduce<Record<string, number>>((acc, trophy) => {
      acc[trophy.family] = (acc[trophy.family] ?? 0) + 1;
      return acc;
    }, {});

    expect(counts).toEqual({
      sessions: 8,
      hours: 15,
      bigWeek: 2,
      strongWeeks: 4,
      bright: 4,
      ratings: 3,
      comebacks: 3,
    });
  });

  it('uses only valid tiers defined in TIERS', () => {
    const validTiers = new Set(TIERS);
    for (const trophy of TROPHIES) {
      expect(validTiers.has(trophy.tier)).toBe(true);
      expect(trophy.goal).toBeGreaterThan(0);
    }
  });

  it('matches the table order, goals, and tiers from SPEC §4', () => {
    expect(TROPHIES[0]).toEqual({ id: 'sessions-1', family: 'sessions', tier: 'bronze', goal: 1 });
    expect(TROPHIES[1]).toEqual({ id: 'sessions-10', family: 'sessions', tier: 'bronze', goal: 10 });
    expect(TROPHIES[2]).toEqual({ id: 'sessions-25', family: 'sessions', tier: 'silver', goal: 25 });
    expect(TROPHIES[3]).toEqual({ id: 'sessions-50', family: 'sessions', tier: 'gold', goal: 50 });
    expect(TROPHIES[4]).toEqual({ id: 'sessions-100', family: 'sessions', tier: 'palladium', goal: 100 });
    expect(TROPHIES[5]).toEqual({ id: 'sessions-250', family: 'sessions', tier: 'rhodium', goal: 250 });
    expect(TROPHIES[6]).toEqual({ id: 'sessions-500', family: 'sessions', tier: 'iridium', goal: 500 });
    expect(TROPHIES[7]).toEqual({ id: 'sessions-1000', family: 'sessions', tier: 'osmium', goal: 1000 });

    expect(TROPHIES[8]).toEqual({ id: 'hours-25', family: 'hours', tier: 'bronze', goal: 25 });
    expect(TROPHIES[22]).toEqual({ id: 'hours-10000', family: 'hours', tier: 'osmium', goal: 10000 });

    expect(TROPHIES[23]).toEqual({ id: 'bigWeek-1200', family: 'bigWeek', tier: 'gold', goal: 1200 });
    expect(TROPHIES[24]).toEqual({ id: 'bigWeek-2400', family: 'bigWeek', tier: 'palladium', goal: 2400 });

    expect(TROPHIES[25]).toEqual({ id: 'strongWeeks-3', family: 'strongWeeks', tier: 'bronze', goal: 3 });
    expect(TROPHIES[28]).toEqual({ id: 'strongWeeks-52', family: 'strongWeeks', tier: 'osmium', goal: 52 });

    expect(TROPHIES[29]).toEqual({ id: 'bright-10', family: 'bright', tier: 'bronze', goal: 10 });
    expect(TROPHIES[32]).toEqual({ id: 'bright-250', family: 'bright', tier: 'osmium', goal: 250 });

    expect(TROPHIES[33]).toEqual({ id: 'ratings-10', family: 'ratings', tier: 'bronze', goal: 10 });
    expect(TROPHIES[35]).toEqual({ id: 'ratings-200', family: 'ratings', tier: 'osmium', goal: 200 });

    expect(TROPHIES[36]).toEqual({ id: 'comebacks-5', family: 'comebacks', tier: 'bronze', goal: 5 });
    expect(TROPHIES[38]).toEqual({ id: 'comebacks-100', family: 'comebacks', tier: 'osmium', goal: 100 });
  });
});

describe('trophyProgress', () => {
  it('reports 0 progress and locked state when all metrics are 0', () => {
    const list = trophyProgress(zeroMetrics());
    expect(list).toHaveLength(39);
    for (const item of list) {
      expect(item.value).toBe(0);
      expect(item.progress).toBe(0);
      expect(item.unlocked).toBe(false);
    }
  });

  it('unlocks a trophy exactly at its goal with progress 1', () => {
    const metrics: TrophyMetrics = {
      sessions: 1,
      totalMinutes: 25 * 60,
      bestWeekMinutes: 1200,
      strongWeeks: 3,
      brightBlocks: 10,
      ratings: 10,
      comebacks: 5,
    };

    const list = trophyProgress(metrics);
    const progressById = new Map(list.map((item) => [item.trophy.id, item]));

    const exactIds = [
      'sessions-1',
      'hours-25',
      'bigWeek-1200',
      'strongWeeks-3',
      'bright-10',
      'ratings-10',
      'comebacks-5',
    ];

    for (const id of exactIds) {
      const item = progressById.get(id);
      expect(item).toBeDefined();
      expect(item?.value).toBe(item?.trophy.goal);
      expect(item?.progress).toBe(1);
      expect(item?.unlocked).toBe(true);
    }

    // Higher tier goals remain locked with partial progress
    expect(progressById.get('sessions-10')?.unlocked).toBe(false);
    expect(progressById.get('sessions-10')?.progress).toBe(0.1);
    expect(progressById.get('hours-50')?.unlocked).toBe(false);
    expect(progressById.get('hours-50')?.progress).toBe(0.5);
    expect(progressById.get('bigWeek-2400')?.unlocked).toBe(false);
    expect(progressById.get('bigWeek-2400')?.progress).toBe(0.5);
  });

  it('caps progress at 1 when metrics exceed the goal', () => {
    const list = trophyProgress(
      zeroMetrics({
        sessions: 25,
        totalMinutes: 100 * 60,
        bestWeekMinutes: 3000,
        strongWeeks: 10,
        brightBlocks: 50,
        ratings: 30,
        comebacks: 15,
      }),
    );
    const progressById = new Map(list.map((item) => [item.trophy.id, item]));

    const sessions1 = progressById.get('sessions-1');
    expect(sessions1?.value).toBe(25);
    expect(sessions1?.progress).toBe(1);
    expect(sessions1?.unlocked).toBe(true);

    const hours25 = progressById.get('hours-25');
    expect(hours25?.value).toBe(100);
    expect(hours25?.progress).toBe(1);
    expect(hours25?.unlocked).toBe(true);

    const bigWeek1200 = progressById.get('bigWeek-1200');
    expect(bigWeek1200?.value).toBe(3000);
    expect(bigWeek1200?.progress).toBe(1);
    expect(bigWeek1200?.unlocked).toBe(true);

    const bigWeek2400 = progressById.get('bigWeek-2400');
    expect(bigWeek2400?.value).toBe(3000);
    expect(bigWeek2400?.progress).toBe(1);
    expect(bigWeek2400?.unlocked).toBe(true);
  });

  it('computes value as floor(totalMinutes / 60) for hours family', () => {
    // 59 min is 0 hours
    let list = trophyProgress(zeroMetrics({ totalMinutes: 59 }));
    let hours25 = list.find((item) => item.trophy.id === 'hours-25');
    expect(hours25?.value).toBe(0);
    expect(hours25?.progress).toBe(0);

    // 119 min is 1 whole hour
    list = trophyProgress(zeroMetrics({ totalMinutes: 119 }));
    hours25 = list.find((item) => item.trophy.id === 'hours-25');
    expect(hours25?.value).toBe(1);
    expect(hours25?.progress).toBe(1 / 25);

    // 120 min is 2 whole hours
    list = trophyProgress(zeroMetrics({ totalMinutes: 120 }));
    hours25 = list.find((item) => item.trophy.id === 'hours-25');
    expect(hours25?.value).toBe(2);
    expect(hours25?.progress).toBe(2 / 25);
  });

  it('evaluates bigWeek family using bestWeekMinutes and goals in minutes', () => {
    const list = trophyProgress(zeroMetrics({ bestWeekMinutes: 600 }));
    const bw1200 = list.find((item) => item.trophy.id === 'bigWeek-1200');
    const bw2400 = list.find((item) => item.trophy.id === 'bigWeek-2400');

    expect(bw1200?.value).toBe(600);
    expect(bw1200?.progress).toBe(0.5);
    expect(bw1200?.unlocked).toBe(false);

    expect(bw2400?.value).toBe(600);
    expect(bw2400?.progress).toBe(0.25);
    expect(bw2400?.unlocked).toBe(false);
  });
});

describe('nextUp', () => {
  it('skips unlocked trophies', () => {
    const list = trophyProgress(zeroMetrics({ sessions: 1 }));
    const result = nextUp(list);

    expect(result.some((item) => item.trophy.id === 'sessions-1')).toBe(false);
  });

  it('returns at most 3 trophies', () => {
    // All 39 locked
    const allLocked = trophyProgress(zeroMetrics());
    expect(nextUp(allLocked)).toHaveLength(3);

    // Only 2 locked
    const twoLocked: TrophyProgress[] = [
      { trophy: TROPHIES[0], value: 1, progress: 1, unlocked: true },
      { trophy: TROPHIES[1], value: 5, progress: 0.5, unlocked: false },
      { trophy: TROPHIES[2], value: 2, progress: 0.08, unlocked: false },
    ];
    expect(nextUp(twoLocked)).toHaveLength(2);

    // Only 1 locked
    const oneLocked: TrophyProgress[] = [
      { trophy: TROPHIES[0], value: 1, progress: 1, unlocked: true },
      { trophy: TROPHIES[1], value: 5, progress: 0.5, unlocked: false },
    ];
    expect(nextUp(oneLocked)).toHaveLength(1);

    // All unlocked
    const noneLocked: TrophyProgress[] = [
      { trophy: TROPHIES[0], value: 1, progress: 1, unlocked: true },
    ];
    expect(nextUp(noneLocked)).toEqual([]);
  });

  it('ranks locked trophies with highest progress first', () => {
    const list = trophyProgress(
      zeroMetrics({
        sessions: 9, // sessions-10 is 90%
        bestWeekMinutes: 960, // bigWeek-1200 is 80%
        comebacks: 3, // comebacks-5 is 60%
        brightBlocks: 1, // bright-10 is 10%
      }),
    );

    const result = nextUp(list);
    expect(result.map((item) => item.trophy.id)).toEqual(['sessions-10', 'bigWeek-1200', 'comebacks-5']);
    expect(result[0].progress).toBe(0.9);
    expect(result[1].progress).toBe(0.8);
    expect(result[2].progress).toBe(0.6);
  });

  it('breaks ties using cabinet order', () => {
    // At zero progress, the first 3 trophies in cabinet order are returned
    const allZero = trophyProgress(zeroMetrics());
    const resultAllZero = nextUp(allZero);
    expect(resultAllZero.map((item) => item.trophy.id)).toEqual(['sessions-1', 'sessions-10', 'sessions-25']);

    // Tied progress at 50%: sessions-50 (index 3) vs strongWeeks-12 (index 26)
    const tiedProgress = trophyProgress(
      zeroMetrics({
        sessions: 25, // unlocks sessions-1, sessions-10, sessions-25; sessions-50 is at 0.5
        strongWeeks: 6, // unlocks strongWeeks-3; strongWeeks-12 is at 0.5
      }),
    );
    const resultTied = nextUp(tiedProgress);
    expect(resultTied[0].trophy.id).toBe('sessions-50');
    expect(resultTied[1].trophy.id).toBe('strongWeeks-12');
  });

  it('does not mutate the input array', () => {
    const list = trophyProgress(zeroMetrics({ sessions: 5 }));
    const copy = [...list];
    nextUp(list);
    expect(list).toEqual(copy);
  });
});
