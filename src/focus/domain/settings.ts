import type { FocusPreferences } from './types';

/**
 * The focus preferences read back from this device or the settings comment.
 * Every field is checked on its own: one that is missing or malformed takes
 * its default (DEFAULT_FOCUS_PREFERENCES) and the rest are kept, so a comment
 * written by an older or newer build never loses the user's other choices.
 *
 * Accepted values:
 * - dailyTargetMin: integer 15–1440; weeklyTargetMin: integer 60–10080;
 *   runThresholdMin: integer 1–480; breakMin: integer 1–60.
 * - workdays: integers 1–7, de-duplicated and sorted; an empty result is the default.
 * - exemptDays: entries with a valid `yyyy-MM-dd` date and kind 'pto' | 'holiday';
 *   one per date (the later wins), sorted by date. Others are dropped.
 * - lanes: trimmed non-empty strings, de-duplicated case-insensitively (first
 *   spelling kept), at most 12, order kept. An empty list is allowed.
 * - blockLengths: integers 5–240, de-duplicated and sorted; an empty result is the default.
 * - taskComment, sound: booleans.
 */
export function readFocusPreferences(stored: unknown): FocusPreferences {
  throw new Error('not implemented');
}
