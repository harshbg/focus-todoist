import type { CSSProperties } from 'react';
import { TASK_COLORS, type TaskColor } from './types';

/**
 * Returns an inline style applying the task color CSS custom property,
 * or undefined when no color is set.
 */
export function taskColorStyle(color: TaskColor | undefined | null): CSSProperties | undefined {
  if (!color || !(TASK_COLORS as readonly string[]).includes(color)) return undefined;
  return { color: `var(--task-color-${color})` };
}

/**
 * Prunes task colour entries whose task is missing from the snapshot,
 * completed, or deleted. Called whenever task colours are written.
 */
export function pruneTaskColors(
  colors: Record<string, TaskColor>,
  snapshot?: { items?: Record<string, { checked?: boolean; is_deleted?: boolean }> | null } | null,
): Record<string, TaskColor> {
  if (!snapshot?.items) return { ...colors };
  const items = snapshot.items;
  const result: Record<string, TaskColor> = {};
  for (const [id, color] of Object.entries(colors)) {
    const item = items[id];
    if (item && !item.checked && !item.is_deleted) {
      result[id] = color;
    }
  }
  return result;
}
