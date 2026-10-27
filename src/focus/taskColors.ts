import type { CSSProperties } from 'react';
import type { Snapshot } from '@/domain/types';
import { useStore } from '@/store/store';
import { pruneTaskColors, taskColorStyle } from './domain/taskColors';
import { TASK_COLORS, type TaskColor } from './domain/types';
import { setFocusPreferences } from './store';

export { TASK_COLORS, type TaskColor, pruneTaskColors, taskColorStyle };

/**
 * Returns the custom colour assigned to a task in this app, if any.
 */
export function useTaskColor(id: string | null | undefined): TaskColor | undefined {
  return useStore((state) => (id ? state.prefs.focus?.taskColors?.[id] : undefined));
}

/**
 * Returns the full map of task colours from focus preferences.
 */
export function useTaskColors(): Record<string, TaskColor> {
  return useStore((state) => state.prefs.focus?.taskColors ?? {});
}

/**
 * Returns an inline style for the task colour, or undefined.
 */
export function useTaskColorStyle(id: string | null | undefined): CSSProperties | undefined {
  const color = useTaskColor(id);
  return taskColorStyle(color);
}

/**
 * Sets or clears a task's colour in focus preferences, pruning entries for
 * completed, deleted, or removed tasks.
 */
export function setTaskColor(
  taskId: string,
  color: TaskColor | null,
  snapshot?: Pick<Snapshot, 'items'> | null,
): void {
  const app = useStore.getState();
  const currentSnapshot = snapshot ?? app.snapshot;
  const currentColors = app.prefs.focus?.taskColors ?? {};
  const nextColors = { ...currentColors };
  if (color && (TASK_COLORS as readonly string[]).includes(color)) {
    nextColors[taskId] = color;
  } else {
    delete nextColors[taskId];
  }
  const pruned = pruneTaskColors(nextColors, currentSnapshot);
  setFocusPreferences({ taskColors: pruned });
}
