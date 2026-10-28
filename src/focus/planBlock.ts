import { useCallback, useRef, useState } from 'react';
import { useStore } from '@/store/store';
import { plainTitle } from '@/domain/markdown';
import { durationMinutes, readEstimate } from '@/domain/estimates';
import type { Item } from '@/domain/types';
import { googleCalendarUrl, sidecarLink } from './domain/calendar';

/**
 * Normalizes an API start date-time string so Todoist accepts it as a floating
 * or local datetime with seconds (e.g. "2026-10-28T14:30" -> "2026-10-28T14:30:00").
 */
export function normalizeStartDateTime(start: string): string {
  const trimmed = start.trim();
  if (trimmed.includes('T') && trimmed.split(':').length === 2) {
    return `${trimmed}:00`;
  }
  return trimmed;
}

/**
 * Determines whether a task can have a focus block planned on it.
 * Refuses null tasks, recurring tasks (which would overwrite their repeat rule),
 * and dates that lack a specific time of day.
 */
export function canPlanBlock(task: Item | null, start: string, minutes?: number): boolean {
  if (!task) return false;
  if (task.due?.is_recurring) return false;
  const trimmed = start.trim();
  if (!trimmed || !trimmed.includes('T')) return false;
  if (minutes !== undefined && (!Number.isFinite(minutes) || minutes <= 0)) {
    return false;
  }
  return true;
}

/**
 * Computes the initial planned block length in minutes for a task:
 * prefilled with the task's duration or estimate if it has one, else 60 minutes.
 */
export function initialPlanLength(task: Item | null): number {
  if (!task) return 60;
  const fromDuration = durationMinutes(task.duration);
  if (fromDuration !== null && fromDuration > 0) return fromDuration;
  const fromEstimate = readEstimate(task).minutes;
  if (fromEstimate !== null && fromEstimate > 0) return fromEstimate;
  return 60;
}

/**
 * Builds the Google Calendar event creation URL for a planned focus block,
 * embedding the sidecar deep-work URL in its details.
 */
export function getCalendarUrl(
  task: Item,
  start: string,
  minutes: number,
  baseOriginAndPath?: string,
): string {
  const base = baseOriginAndPath
    ?? (typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : '');
  const link = sidecarLink(base, task.id, minutes);
  return googleCalendarUrl({
    title: plainTitle(task.content),
    start,
    minutes,
    link,
  });
}

export type PlanBlockSchedule = (
  task: Item,
  start: string,
  minutes: number,
  addToCalendar: boolean,
) => Promise<boolean>;

export interface PlanBlockHook extends PlanBlockSchedule {
  schedule: PlanBlockSchedule;
  saving: boolean;
}

/**
 * Shared hook to schedule a planned focus block on a task (PLAN-UI.md §1).
 *
 * Synchronously opens Google Calendar in a new tab if requested (before any await,
 * avoiding browser popup blockers), then writes the due date-time and duration to Todoist.
 */
export function usePlanBlock(): PlanBlockHook {
  const updateTask = useStore((state) => state.updateTask);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  const schedule = useCallback<PlanBlockSchedule>(
    async (task, start, minutes, addToCalendar) => {
      if (!canPlanBlock(task, start, minutes) || savingRef.current) {
        return false;
      }

      if (addToCalendar) {
        const url = getCalendarUrl(task, start, minutes);
        // Opened synchronously in the click event before any await to avoid popup blocking.
        if (typeof window !== 'undefined') {
          window.open(url, '_blank', 'noopener');
        }
      }

      savingRef.current = true;
      setSaving(true);
      try {
        const date = normalizeStartDateTime(start);
        await updateTask(task.id, {
          due: { date, string: date, lang: 'en', timezone: null, is_recurring: false },
          duration: { amount: minutes, unit: 'minute' },
        });
        return true;
      } catch {
        return false;
      } finally {
        savingRef.current = false;
        setSaving(false);
      }
    },
    [updateTask],
  );

  const hookResult = Object.assign(
    (t: Item, s: string, m: number, c: boolean) => schedule(t, s, m, c),
    { schedule, saving },
  );

  return hookResult;
}
