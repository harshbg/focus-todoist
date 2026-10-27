import { bucketOf, groupWeek } from '@/domain/views';
import { addDays, format } from 'date-fns';
import type { Item } from '@/domain/types';

/** Pinned work stays first; the rest follows the Week page's group order. */
export function focusQueue(items: Item[], pinned: string[], now: Date, showQuickGroup = true): Item[] {
  const open = items.filter((item) => !item.checked && !item.is_deleted);
  const byId = new Map(open.map((item) => [item.id, item]));
  const chosen = pinned.map((id) => byId.get(id)).filter((item): item is Item => Boolean(item));
  const groups = groupWeek(open.filter((item) => {
    const bucket = bucketOf(item, now);
    return bucket === 'today' || bucket === 'anytime';
  }), now, showQuickGroup);
  const seen = new Set(chosen.map((item) => item.id));
  return [...chosen, ...Object.values(groups).flat().filter((item) => !seen.has(item.id)).slice(0, Math.max(0, 8 - chosen.length))];
}

export function searchTasks(items: Item[], query: string): Item[] {
  const term = query.trim().toLocaleLowerCase();
  if (!term) return [];
  return items.filter((item) => !item.checked && !item.is_deleted
    && item.content.toLocaleLowerCase().includes(term)).slice(0, 8);
}

/**
 * What the task field offers, at most eight: tasks with a time from today on
 * in time order, then today's and overdue ones without a time, then the rest
 * of the week. Typing filters them (any open task can match, the others last).
 */
export function taskChoices(items: Item[], query: string, now: Date): Item[] {
  const term = query.trim().toLocaleLowerCase();
  const today = format(now, 'yyyy-MM-dd');
  const weekEnd = format(addDays(now, 7), 'yyyy-MM-dd');
  const rank = (item: Item): number => {
    const date = item.due?.date;
    if (!date) return 3;
    if (date.includes('T') && date.slice(0, 10) >= today) return 0;
    if (date.slice(0, 10) <= today) return 1;
    return date.slice(0, 10) <= weekEnd ? 2 : 3;
  };
  return items
    .filter((item) => !item.checked && !item.is_deleted
      && (term ? item.content.toLocaleLowerCase().includes(term) : rank(item) < 3))
    .map((item) => ({ item, rank: rank(item) }))
    .sort((a, b) => {
      // Within a group, the earliest first; a task with no date after the dated ones.
      const x = a.item.due?.date ?? '9999';
      const y = b.item.due?.date ?? '9999';
      return a.rank - b.rank || (x < y ? -1 : x > y ? 1 : 0);
    })
    .slice(0, 8)
    .map(({ item }) => item);
}
