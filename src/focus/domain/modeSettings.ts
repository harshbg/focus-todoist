import type { Project } from '@/domain/types';
import { WORK_PROJECT_NAME } from './mode';

/**
 * Pure functions for the Work & Personal settings section (SPEC §10.2).
 */

/**
 * Top-level projects eligible to be marked as Work:
 * no parent, not archived or deleted, and not the Inbox.
 * Sorted by child_order, then by name.
 */
export function filterTopLevelProjects(
  projects: Record<string, Project>,
  inboxProjectId?: string | null,
): Project[] {
  return Object.values(projects)
    .filter((project) =>
      !project.parent_id
      && !project.is_deleted
      && !project.is_archived
      && !project.inbox_project
      && project.id !== inboxProjectId,
    )
    .sort((a, b) => a.child_order - b.child_order || a.name.localeCompare(b.name));
}

/**
 * Returns true if the project is named Work (case-insensitive, trimmed),
 * matching the behaviour of workProjectIds() in mode.ts.
 */
export function isBuiltInWorkProject(project: Project): boolean {
  return project.name.trim().toLowerCase() === WORK_PROJECT_NAME.toLowerCase();
}

/**
 * Toggles a project's Work status in the workProjectIds list.
 * Deduplicates, trims ids, and removes empty/blank strings.
 */
export function toggleWorkProject(
  currentIds: readonly string[],
  projectId: string,
  isWork: boolean,
): string[] {
  const set = new Set(
    currentIds
      .filter((id): id is string => typeof id === 'string')
      .map((id) => id.trim())
      .filter((id) => id.length > 0),
  );
  const trimmed = typeof projectId === 'string' ? projectId.trim() : '';
  if (trimmed) {
    if (isWork) {
      set.add(trimmed);
    } else {
      set.delete(trimmed);
    }
  }
  return [...set];
}

/** Clamp daily target to accepted range [15, 1440]. */
export function clampDailyTarget(minutes: number): number {
  return Math.max(15, Math.min(1440, Math.round(minutes)));
}

/** Clamp weekly target to accepted range [60, 10080]. */
export function clampWeeklyTarget(minutes: number): number {
  return Math.max(60, Math.min(10080, Math.round(minutes)));
}

/** Clamp run threshold to accepted range [1, 480]. */
export function clampRunThreshold(minutes: number): number {
  return Math.max(1, Math.min(480, Math.round(minutes)));
}

/**
 * Toggles an ISO workday (1–7, Monday to Sunday).
 * At least one workday is preserved so settings reload doesn't revert to default.
 * Output is sorted ascending.
 */
export function toggleWorkday(currentWorkdays: readonly number[], day: number): number[] {
  if (day < 1 || day > 7 || !Number.isInteger(day)) return [...currentWorkdays];
  const set = new Set(currentWorkdays.filter((d) => d >= 1 && d <= 7));
  if (set.has(day)) {
    if (set.size > 1) {
      set.delete(day);
    }
  } else {
    set.add(day);
  }
  return [...set].sort((a, b) => a - b);
}

/**
 * Parses a comma-separated string into lanes:
 * trimmed, non-empty, case-insensitively unique (first spelling kept), at most 12.
 */
export function parseLanesInput(raw: string): string[] {
  const seen = new Set<string>();
  const lanes: string[] = [];
  for (const part of raw.split(',')) {
    const lane = part.trim();
    const key = lane.toLowerCase();
    if (!lane || seen.has(key)) continue;
    seen.add(key);
    lanes.push(lane);
    if (lanes.length === 12) break;
  }
  return lanes;
}

/** Removes a lane case-insensitively. */
export function removeLane(currentLanes: readonly string[], laneToRemove: string): string[] {
  const target = laneToRemove.trim().toLowerCase();
  return currentLanes.filter((lane) => lane.trim().toLowerCase() !== target);
}
