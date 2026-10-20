import { addDays, format, getISODay, startOfDay } from 'date-fns';
import type { Item, Note } from '@/domain/types';
import { weekKeyOf, writeLogComments } from './domain/log';
import { itemMode } from './domain/mode';
import { DEFAULT_FOCUS_PREFERENCES, type FocusEntry, type FocusRating } from './domain/types';

/**
 * Ninety days of made-up focus for the demo account, so the Focus and
 * Progress pages have something to show without a real history. Seeded, so
 * the demo looks the same on every visit (and in the e2e journeys).
 */
export function demoFocusEntries(items: Item[], today: Date, seed = 43): FocusEntry[] {
  let state = seed;
  const random = () => {
    state = (state * 1_103_515_245 + 12_345) % 2_147_483_648;
    return state / 2_147_483_648;
  };
  const tasks = items.filter((item) => !item.parent_id).slice(0, 10);
  const lanes = DEFAULT_FOCUS_PREFERENCES.lanes;
  const entries: FocusEntry[] = [];
  // The demo's Website project is Work regardless of its translated name.
  const workProjects = new Set(['site']);

  for (let back = 90; back >= 1; back -= 1) {
    const day = startOfDay(addDays(today, -back));
    const weekend = getISODay(day) > 5;
    // A few quiet stretches, so runs break and comebacks happen.
    if (weekend ? random() < 0.85 : random() < 0.18) continue;
    const blocks = weekend ? 1 : 1 + Math.floor(random() * 4);
    let hour = 8 + Math.floor(random() * 3);
    for (let block = 0; block < blocks && hour < 21; block += 1) {
      const minutes = random() < 0.6 ? 30 : random() < 0.8 ? 60 : 90;
      const task = tasks[Math.floor(random() * tasks.length)];
      const rated = random() < 0.4;
      entries.push({
        start: format(new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, random() < 0.5 ? 0 : 30), "yyyy-MM-dd'T'HH:mm"),
        minutes,
        taskId: task?.id ?? null,
        title: task?.content ?? 'Deep work',
        lane: lanes[Math.floor(random() * lanes.length)] ?? null,
        rating: rated ? (2 + Math.floor(random() * 4)) as FocusRating : null,
        source: 'timed',
        mode: task ? itemMode(task, workProjects) : 'personal',
      });
      hour += Math.ceil(minutes / 60) + Math.floor(random() * 3);
    }
  }
  return entries;
}

/** The demo history as the Inbox comments the real log would be. */
export function demoFocusNotes(items: Item[], today: Date, inboxId: string, userId: string): Record<string, Note> {
  const byWeek = new Map<string, FocusEntry[]>();
  for (const entry of demoFocusEntries(items, today)) {
    const week = weekKeyOf(entry.start);
    byWeek.set(week, [...(byWeek.get(week) ?? []), entry]);
  }
  const notes: Record<string, Note> = {};
  for (const [week, entries] of byWeek) {
    writeLogComments(week, entries).forEach((content, index) => {
      const id = `demo-focus-${week}-${index + 1}`;
      notes[id] = {
        id, item_id: null, project_id: inboxId, content,
        posted_at: today.toISOString(), posted_uid: userId, is_deleted: false, file_attachment: null,
      };
    });
  }
  return notes;
}
