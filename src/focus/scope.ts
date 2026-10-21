import { useMemo } from 'react';
import type { Item, Snapshot } from '@/domain/types';
import { useStore } from '@/store/store';
import { scopeSnapshot } from './domain/mode';
import { useMode } from './mode-store';

/**
 * Returns the Todoist snapshot scoped to the current focus mode (Work or Personal).
 *
 * Scopes items to those matching the mode, and projects to those visible in that
 * mode (Work projects in Work; others in Personal or in Work while they hold open
 * work tasks; Inbox in both). Sections follow their project. Memoised on the
 * snapshot, the current mode, and the marked Work project ids.
 */
export function useScopedSnapshot(): Snapshot {
  const snapshot = useStore((state) => state.snapshot);
  const workProjectIds = useStore((state) => state.prefs.focus.workProjectIds);
  const mode = useMode();

  return useMemo(
    () => scopeSnapshot(snapshot, mode, workProjectIds),
    [snapshot, mode, workProjectIds],
  );
}

/**
 * Returns the snapshot items scoped to the current focus mode.
 */
export function useScopedItems(): Record<string, Item> {
  const scoped = useScopedSnapshot();
  return scoped.items;
}
