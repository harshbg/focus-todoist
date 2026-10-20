import type { FocusEntry } from './types';
import { dayTotals } from './metrics';

/** Shared display choices stay deterministic while the page supplies translated words. */
export function worldStage(unlocked: number): 'clearing' | 'path' | 'village' | 'town' | 'city' | 'temple' {
  if (unlocked === 0) return 'clearing';
  if (unlocked < 5) return 'path';
  if (unlocked < 13) return 'village';
  if (unlocked < 26) return 'town';
  if (unlocked < 39) return 'city';
  return 'temple';
}

/** The footprint's log line shows the last three distinct days with focus. */
export function recentFocusedDays(entries: FocusEntry[], through: string): Array<{ date: string; minutes: number }> {
  return [...dayTotals(entries)]
    .filter(([date, minutes]) => date <= through && minutes > 0)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 3)
    .map(([date, minutes]) => ({ date, minutes }));
}

