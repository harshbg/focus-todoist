import { describe, expect, it } from 'vitest';
import type { Item } from '@/domain/types';
import { focusQueue, searchTasks, taskChoices } from './queue';

const task = (id: string, content: string, extras: Partial<Item> = {}): Item => ({
  id, content, labels: [], checked: false, is_deleted: false, due: null, ...extras,
} as Item);

describe('focus task choices', () => {
  it('keeps pinned tasks first, including tasks outside this week, without duplicates', () => {
    const now = new Date(2026, 9, 20, 9);
    const today = task('today', 'Today', { due: { date: '2026-10-20' } as Item['due'] });
    const pinned = task('pinned', 'Pinned');
    expect(focusQueue([today, pinned, task('done', 'Done', { checked: true })], ['pinned', 'today', 'missing'], now)
      .map((item) => item.id)).toEqual(['pinned', 'today']);
  });

  it('finds at most eight open title matches, ignoring case', () => {
    const items = Array.from({ length: 10 }, (_, i) => task(String(i), `Draft ${i}`));
    expect(searchTasks([task('closed', 'DRAFT', { checked: true }), ...items], ' dRaFt ').map((item) => item.id))
      .toEqual(['0', '1', '2', '3', '4', '5', '6', '7']);
  });

  it('fills a short queue with at most eight total tasks', () => {
    const now = new Date(2026, 9, 20, 9);
    const items = Array.from({ length: 12 }, (_, index) => task(String(index), `Task ${index}`, {
      due: { date: '2026-10-20' } as Item['due'],
    }));
    expect(focusQueue(items, ['9'], now)).toHaveLength(8);
    expect(focusQueue(items, ['9'], now)[0].id).toBe('9');
  });

  it('offers timed tasks in time order, then today and overdue, then the week, then the rest, and filters by typing', () => {
    const now = new Date(2026, 9, 27, 9);
    const due = (date: string) => ({ date } as Item['due']);
    const items = [
      task('later', 'Later timed', { due: due('2026-10-29T10:00:00') }),
      task('soon', 'Soon timed', { due: due('2026-10-27T14:30:00') }),
      task('overdue', 'Overdue', { due: due('2026-10-25') }),
      task('week', 'This week', { due: due('2026-10-30') }),
      task('far', 'Far away', { due: due('2026-12-01') }),
      task('none', 'No date'),
      task('done', 'Done timed', { checked: true, due: due('2026-10-27T10:00:00') }),
    ];
    expect(taskChoices(items, '', now).map((item) => item.id)).toEqual(['soon', 'later', 'overdue', 'week', 'far', 'none']);
    expect(taskChoices(items, 'a', now).map((item) => item.id)).toEqual(['later', 'far', 'none']);
    expect(taskChoices(Array.from({ length: 60 }, (_, i) => task(String(i), `T ${i}`)), '', now)).toHaveLength(50);
  });
});
