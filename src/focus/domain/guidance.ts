import { addMinutes, format, isMonday, parseISO, startOfISOWeek, subWeeks } from 'date-fns';
import type { Item } from '@/domain/types';
import type { FocusEntry } from './types';

/**
 * Gentle guidance (SPEC §5.2 #8): the rules behind the opt-in nudges. They
 * only ever read Todoist's own due times and the focus log; nothing new is stored
 * in Todoist.
 */

/** How long after a planned start a block still counts as begun on time. */
export const RESTART_GRACE_MIN = 15;

/** The length offered when returning to a missed block. */
export const RESTART_LENGTH_MIN = 30;

function minute(date: Date): string {
  return format(date, "yyyy-MM-dd'T'HH:mm");
}

/** A task's planned start as `yyyy-MM-ddTHH:mm`, or null when its due date has no time. */
export function plannedStart(item: Item): string | null {
  const date = item.due?.date;
  if (!date || !date.includes('T')) return null;
  return date.slice(0, 16);
}

/** Tasks whose planned start falls in (from, to]: the ones to announce on this check. */
export function startsBetween(items: Item[], from: Date, to: Date): Item[] {
  const after = minute(from);
  const until = minute(to);
  return items.filter((item) => {
    const start = plannedStart(item);
    return start !== null && start > after && start <= until;
  });
}

/**
 * Today's most recent planned block that went by without a start: its start
 * is more than the grace period ago, and no block on that task began within
 * the grace period before it or at any point since. Null when none was missed.
 */
export function missedBlock(items: Item[], entries: FocusEntry[], now: Date): Item | null {
  const today = format(now, 'yyyy-MM-dd');
  const graceEnd = minute(addMinutes(now, -RESTART_GRACE_MIN));
  const missed = items.filter((item) => {
    const start = plannedStart(item);
    if (start === null || !start.startsWith(today) || start > graceEnd) return false;
    const earliest = minute(addMinutes(parseISO(start), -RESTART_GRACE_MIN));
    return !entries.some((entry) => entry.taskId === item.id && entry.start >= earliest);
  });
  return missed.sort((a, b) => plannedStart(b)!.localeCompare(plannedStart(a)!))[0] ?? null;
}

export interface WeeklyInsight {
  /** Monday of the week looked back on, `yyyy-MM-dd`. */
  week: string;
  minutes: number;
  blocks: number;
  /** Days with at least one block. */
  days: number;
  /** The lane with the most minutes, if any block had one. */
  lane: string | null;
  /** The day with the most minutes, `yyyy-MM-dd`, or null for an empty week. */
  bestDay: string | null;
}

/**
 * Last week in a few numbers, shown on Mondays only. Null on other days and
 * after an empty week: a prompt with nothing in it would only be a reproach.
 */
export function weeklyInsight(entries: FocusEntry[], now: Date): WeeklyInsight | null {
  if (!isMonday(now)) return null;
  const from = format(subWeeks(startOfISOWeek(now), 1), 'yyyy-MM-dd');
  const until = format(startOfISOWeek(now), 'yyyy-MM-dd');
  const week = entries.filter((entry) => entry.start >= from && entry.start < until);
  if (week.length === 0) return null;

  const byDay = new Map<string, number>();
  const byLane = new Map<string, number>();
  for (const entry of week) {
    const day = entry.start.slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + entry.minutes);
    if (entry.lane) byLane.set(entry.lane, (byLane.get(entry.lane) ?? 0) + entry.minutes);
  }
  const top = (totals: Map<string, number>) => [...totals].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? null;
  return {
    week: from,
    minutes: week.reduce((sum, entry) => sum + entry.minutes, 0),
    blocks: week.length,
    days: byDay.size,
    lane: top(byLane),
    bestDay: top(byDay),
  };
}
