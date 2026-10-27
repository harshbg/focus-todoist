import { isMatch } from 'date-fns';
import type { Mode } from './mode';
import {
  DEFAULT_FOCUS_PREFERENCES,
  type ExemptDay,
  type FocusPreferences,
  type FocusSettings,
  TASK_COLORS,
  type TaskColor,
} from './types';

function integerInRange(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
}

function sortedUniqueIntegers(value: unknown, min: number, max: number): number[] | null {
  if (!Array.isArray(value)) return null;
  const result = [...new Set(value.filter((item) => integerInRange(item, min, max)))];
  return result.length ? result.sort((a, b) => a - b) : null;
}

function lanesOf(value: unknown, fallback: readonly string[]): string[] {
  if (!Array.isArray(value)) return [...fallback];
  const seen = new Set<string>();
  const lanes: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string') continue;
    const lane = item.trim();
    const key = lane.toLowerCase();
    if (!lane || seen.has(key)) continue;
    seen.add(key);
    lanes.push(lane);
    if (lanes.length === 12) break;
  }
  return lanes;
}

/** The targets and lanes used by one mode; time off applies to both. */
export function settingsFor(prefs: FocusPreferences, mode: Mode): FocusSettings & { lanes: string[] } {
  return mode === 'work'
    ? { dailyTargetMin: prefs.dailyTargetMin, weeklyTargetMin: prefs.weeklyTargetMin,
      runThresholdMin: prefs.runThresholdMin, workdays: prefs.workdays, exemptDays: prefs.exemptDays, lanes: prefs.lanes }
    : { ...prefs.personal, exemptDays: prefs.exemptDays };
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
 * - taskComment, sound, calendarDefault: booleans.
 */
export function readFocusPreferences(stored: unknown): FocusPreferences {
  const defaults = DEFAULT_FOCUS_PREFERENCES;
  const result: FocusPreferences = {
    ...defaults,
    workdays: [...defaults.workdays],
    exemptDays: [...defaults.exemptDays],
    lanes: [...defaults.lanes],
    blockLengths: [...defaults.blockLengths],
    workProjectIds: [...defaults.workProjectIds],
    personal: { ...defaults.personal, workdays: [...defaults.personal.workdays], lanes: [...defaults.personal.lanes] },
    guidance: { ...defaults.guidance },
    taskColors: { ...defaults.taskColors },
  };
  if (stored === null || typeof stored !== 'object' || Array.isArray(stored)) return result;

  const fields = stored as Record<string, unknown>;
  if (integerInRange(fields.dailyTargetMin, 15, 1440)) result.dailyTargetMin = fields.dailyTargetMin;
  if (integerInRange(fields.weeklyTargetMin, 60, 10080)) result.weeklyTargetMin = fields.weeklyTargetMin;
  if (integerInRange(fields.runThresholdMin, 1, 480)) result.runThresholdMin = fields.runThresholdMin;
  if (integerInRange(fields.breakMin, 1, 60)) result.breakMin = fields.breakMin;

  result.workdays = sortedUniqueIntegers(fields.workdays, 1, 7) ?? result.workdays;
  result.blockLengths = sortedUniqueIntegers(fields.blockLengths, 5, 240) ?? result.blockLengths;

  if (Array.isArray(fields.workProjectIds)) {
    result.workProjectIds = [...new Set(
      fields.workProjectIds
        .filter((id): id is string => typeof id === 'string')
        .map((id) => id.trim())
        .filter((id) => id.length > 0),
    )];
  }
  if (fields.personal !== null && typeof fields.personal === 'object' && !Array.isArray(fields.personal)) {
    const personal = fields.personal as Record<string, unknown>;
    if (integerInRange(personal.dailyTargetMin, 15, 1440)) result.personal.dailyTargetMin = personal.dailyTargetMin;
    if (integerInRange(personal.weeklyTargetMin, 60, 10080)) result.personal.weeklyTargetMin = personal.weeklyTargetMin;
    if (integerInRange(personal.runThresholdMin, 1, 480)) result.personal.runThresholdMin = personal.runThresholdMin;
    result.personal.workdays = sortedUniqueIntegers(personal.workdays, 1, 7) ?? result.personal.workdays;
    result.personal.lanes = lanesOf(personal.lanes, result.personal.lanes);
  }

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

  result.lanes = lanesOf(fields.lanes, result.lanes);

  if (typeof fields.taskComment === 'boolean') result.taskComment = fields.taskComment;
  if (typeof fields.sound === 'boolean') result.sound = fields.sound;
  if (typeof fields.calendarDefault === 'boolean') result.calendarDefault = fields.calendarDefault;
  if (fields.guidance !== null && typeof fields.guidance === 'object' && !Array.isArray(fields.guidance)) {
    const guidance = fields.guidance as Record<string, unknown>;
    for (const key of ['startAlerts', 'gentleRestart', 'weeklyInsight'] as const) {
      if (typeof guidance[key] === 'boolean') result.guidance[key] = guidance[key];
    }
  }

  if (fields.taskColors !== null && typeof fields.taskColors === 'object' && !Array.isArray(fields.taskColors)) {
    const raw = fields.taskColors as Record<string, unknown>;
    const colors: Record<string, TaskColor> = {};
    let count = 0;
    for (const [id, color] of Object.entries(raw)) {
      const trimmed = id.trim();
      if (!trimmed) continue;
      if (typeof color === 'string' && (TASK_COLORS as readonly string[]).includes(color)) {
        colors[trimmed] = color as TaskColor;
        count += 1;
        if (count >= 300) break;
      }
    }
    result.taskColors = colors;
  }
  return result;
}
