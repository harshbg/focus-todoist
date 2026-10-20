import { isMatch } from 'date-fns';
import { DEFAULT_FOCUS_PREFERENCES, type ExemptDay, type FocusPreferences } from './types';

function integerInRange(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
}

function sortedUniqueIntegers(value: unknown, min: number, max: number): number[] | null {
  if (!Array.isArray(value)) return null;
  const result = [...new Set(value.filter((item) => integerInRange(item, min, max)))];
  return result.length ? result.sort((a, b) => a - b) : null;
}

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
  const defaults = DEFAULT_FOCUS_PREFERENCES;
  const result: FocusPreferences = {
    ...defaults,
    workdays: [...defaults.workdays],
    exemptDays: [...defaults.exemptDays],
    lanes: [...defaults.lanes],
    blockLengths: [...defaults.blockLengths],
  };
  if (stored === null || typeof stored !== 'object' || Array.isArray(stored)) return result;

  const fields = stored as Record<string, unknown>;
  if (integerInRange(fields.dailyTargetMin, 15, 1440)) result.dailyTargetMin = fields.dailyTargetMin;
  if (integerInRange(fields.weeklyTargetMin, 60, 10080)) result.weeklyTargetMin = fields.weeklyTargetMin;
  if (integerInRange(fields.runThresholdMin, 1, 480)) result.runThresholdMin = fields.runThresholdMin;
  if (integerInRange(fields.breakMin, 1, 60)) result.breakMin = fields.breakMin;

  result.workdays = sortedUniqueIntegers(fields.workdays, 1, 7) ?? result.workdays;
  result.blockLengths = sortedUniqueIntegers(fields.blockLengths, 5, 240) ?? result.blockLengths;

  if (Array.isArray(fields.exemptDays)) {
    const byDate = new Map<string, ExemptDay>();
    for (const item of fields.exemptDays) {
      if (item === null || typeof item !== 'object' || Array.isArray(item)) continue;
      const { date, kind } = item as Record<string, unknown>;
      if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !isMatch(date, 'yyyy-MM-dd')) continue;
      if (kind !== 'pto' && kind !== 'holiday') continue;
      byDate.set(date, { date, kind });
    }
    result.exemptDays = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  }

  if (Array.isArray(fields.lanes)) {
    const seen = new Set<string>();
    result.lanes = [];
    for (const item of fields.lanes) {
      if (typeof item !== 'string') continue;
      const lane = item.trim();
      const key = lane.toLowerCase();
      if (!lane || seen.has(key)) continue;
      seen.add(key);
      result.lanes.push(lane);
      if (result.lanes.length === 12) break;
    }
  }

  if (typeof fields.taskComment === 'boolean') result.taskComment = fields.taskComment;
  if (typeof fields.sound === 'boolean') result.sound = fields.sound;
  return result;
}
