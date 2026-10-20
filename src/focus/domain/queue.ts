import { bucketOf, groupWeek } from '@/domain/views';
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
