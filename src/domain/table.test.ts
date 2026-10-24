import { describe, expect, it } from 'vitest';
import { tableColumnOrder, tableColumns } from './table';
import { pageClass } from './pageLayout';
import { defaultViewPrefs, type ViewPrefs } from './types';

describe('table columns', () => {
  const view = defaultViewPrefs('inbox');

  it('opens with the default columns, title first', () => {
    expect(tableColumns(view)).toEqual(['title', 'date', 'deadline', 'priority', 'estimate', 'labels']);
  });

  it('follows the order the user chose, and keeps the title first', () => {
    expect(tableColumns({ ...view, tableColumns: ['labels', 'project', 'title', 'date'] }))
      .toEqual(['title', 'labels', 'project', 'date']);
  });

  it('ignores a column listed twice or unknown to this version', () => {
    const odd = ['date', 'date', 'gone'] as unknown as Parameters<typeof tableColumns>[0]['tableColumns'];
    expect(tableColumns({ ...view, tableColumns: odd })).toEqual(['title', 'date']);
  });
});

describe('page layout', () => {
  const view = defaultViewPrefs('inbox');

  it('keeps a list to a reading width unless it asks for the whole page', () => {
    expect(pageClass({ ...view, mode: 'list' })).toBe('page narrow');
    expect(pageClass({ ...view, mode: 'list', fullWidth: true })).toBe('page');
  });

});

describe('the order of the columns (#333)', () => {
  const prefs = (extra: Partial<ViewPrefs> = {}): ViewPrefs => ({ ...defaultViewPrefs('project:p'), ...extra });

  it('lists every column but the title, the shown ones first when nothing was saved', () => {
    expect(tableColumnOrder(prefs())).toEqual(['date', 'deadline', 'priority', 'estimate', 'labels', 'description', 'project']);
  });

  it('keeps a saved order, hidden columns included', () => {
    const order = tableColumnOrder(prefs({ tableOrder: ['project', 'date', 'labels'], tableColumns: ['title', 'date', 'labels'] }));
    expect(order.slice(0, 3)).toEqual(['project', 'date', 'labels']);
    expect(order).toHaveLength(7);
  });

  it('ignores the title, duplicates and columns that do not exist', () => {
    const order = tableColumnOrder(prefs({ tableOrder: ['title', 'date', 'date', 'nope' as never] }));
    expect(order.filter((column) => column === 'date')).toHaveLength(1);
    expect(order).not.toContain('title');
    expect(order).not.toContain('nope');
  });
});
