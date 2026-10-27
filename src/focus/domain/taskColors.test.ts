import { describe, expect, it } from 'vitest';
import { pruneTaskColors, taskColorStyle } from './taskColors';
import type { TaskColor } from './types';

describe('taskColorStyle', () => {
  it('returns CSS property for valid task colors', () => {
    expect(taskColorStyle('red')).toEqual({ color: 'var(--task-color-red)' });
    expect(taskColorStyle('blue')).toEqual({ color: 'var(--task-color-blue)' });
    expect(taskColorStyle('purple')).toEqual({ color: 'var(--task-color-purple)' });
  });

  it('returns undefined for missing or unknown colors', () => {
    expect(taskColorStyle(undefined)).toBeUndefined();
    expect(taskColorStyle(null)).toBeUndefined();
    expect(taskColorStyle('neon' as unknown as TaskColor)).toBeUndefined();
  });
});

describe('pruneTaskColors', () => {
  it('returns original colors when snapshot or snapshot.items is missing', () => {
    const colors: Record<string, TaskColor> = { 'task-1': 'red', 'task-2': 'green' };
    expect(pruneTaskColors(colors, null)).toEqual(colors);
    expect(pruneTaskColors(colors, undefined)).toEqual(colors);
    expect(pruneTaskColors(colors, {})).toEqual(colors);
  });

  it('keeps active tasks and prunes missing, completed, or deleted tasks', () => {
    const colors: Record<string, TaskColor> = {
      'active-1': 'red',
      'active-2': 'yellow',
      'completed-1': 'orange',
      'deleted-1': 'blue',
      'missing-1': 'purple',
    };

    const snapshot = {
      items: {
        'active-1': { checked: false, is_deleted: false },
        'active-2': { checked: false, is_deleted: false },
        'completed-1': { checked: true, is_deleted: false },
        'deleted-1': { checked: false, is_deleted: true },
        'other-task': { checked: false, is_deleted: false },
      },
    };

    expect(pruneTaskColors(colors, snapshot)).toEqual({
      'active-1': 'red',
      'active-2': 'yellow',
    });
  });

  it('returns empty object when all tasks are pruned or colors is empty', () => {
    expect(pruneTaskColors({}, { items: {} })).toEqual({});
    expect(
      pruneTaskColors(
        { 'task-1': 'red' },
        { items: { 'task-1': { checked: true, is_deleted: false } } },
      ),
    ).toEqual({});
  });
});
