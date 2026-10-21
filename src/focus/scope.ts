import { useMemo } from 'react';
import type { Item, Snapshot } from '@/domain/types';
import { useStore, type AppState } from '@/store/store';
import { scopeSnapshot } from './domain/mode';
import { useMode } from './mode-store';

/** The demo's Website project, which plays the part of a Work project there. */
const DEMO_WORK_PROJECT = 'site';
const NO_EXTRA: readonly string[] = [];

/** The e2e journeys predate Work mode and expect every demo task in one list; they switch this off. */
const demoWorkOff = (() => {
  try { return typeof localStorage !== 'undefined' && localStorage.getItem('tde.demoWork') === 'off'; } catch { return false; }
})();

/**
 * The projects marked as Work. The demo has no project named Work, so its
 * Website project counts as one there — only for the demo, never written
 * into the account's preferences.
 */
export function markedWorkProjects(state: Pick<AppState, 'demo' | 'prefs'>): readonly string[] {
  const marked = state.prefs.focus.workProjectIds;
  return state.demo && !demoWorkOff ? [...marked, DEMO_WORK_PROJECT] : marked.length ? marked : NO_EXTRA;
}

/** markedWorkProjects for components, stable between renders. */
export function useMarkedWorkProjects(): readonly string[] {
  const demo = useStore((state) => state.demo);
  const marked = useStore((state) => state.prefs.focus.workProjectIds);
  return useMemo(() => markedWorkProjects({ demo, prefs: { focus: { workProjectIds: marked } } } as Pick<AppState, 'demo' | 'prefs'>), [demo, marked]);
}

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
  const workProjectIds = useMarkedWorkProjects();
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
