import type { ActiveBlock } from './domain/timer';
import type { FocusEntry, FocusPreferences, FocusRating } from './domain/types';

/**
 * The focus feature's live state, apart from the app's own store so upstream
 * merges stay simple. What is durable goes to Todoist through the app's
 * `useStore.getState().apply(...)` with the commands from `planLogWrite`; the
 * running block lives only on this device.
 *
 * The running block is kept in localStorage under ACTIVE_KEY (read back with
 * readActiveBlock) and shared live with other tabs and the sidecar window
 * through the `storage` event and a BroadcastChannel named BROADCAST_CHANNEL,
 * so starting, pausing or finishing in one window shows in all of them.
 * Every storage and channel access is wrapped in try/catch: private windows
 * and old browsers must still get a working timer for this tab.
 *
 * On load, a stored block whose time ran out while no tab was open is finished
 * at once (logged at its planned length), so closing the laptop mid-block
 * loses nothing.
 */

export const ACTIVE_KEY = 'tde.focus.active';
export const BROADCAST_CHANNEL = 'tde-focus';

export interface FocusStore {
  active: ActiveBlock | null;
  /** The block just logged, for the "Block logged" card; cleared by dismiss() or the next start(). */
  justLogged: FocusEntry | null;

  start(input: Pick<ActiveBlock, 'mode' | 'taskId' | 'title' | 'lane' | 'plannedMin'>): void;
  pause(): void;
  resume(): void;
  /**
   * Ends the running block now. A focus block that qualifies (blockEntry) is
   * appended to the log and becomes justLogged; returns it, or null when
   * nothing was logged (unwind, too short, or no block).
   */
  finish(): Promise<FocusEntry | null>;
  /** Ends the running block without logging anything. */
  discard(): void;
  /** Sets the rating of justLogged, in the log too. */
  rate(rating: FocusRating | null): Promise<void>;
  dismiss(): void;
  /** "Log past focus": adds an entry with source 'manual'. */
  logManual(entry: Omit<FocusEntry, 'source'>): Promise<void>;
  /** Replaces the entry whose entryKey is `key` with it plus `patch` (which may move it to another week). */
  editEntry(key: string, patch: Partial<Omit<FocusEntry, 'source'>>): Promise<void>;
  deleteEntry(key: string): Promise<void>;
}

/**
 * Also exported from this file:
 *
 *   export const useFocusStore: UseBoundStore<StoreApi<FocusStore>>  (zustand `create`)
 *   export function useFocusLog(): FocusEntry[]
 *     — readFocusLog of the app's snapshot, memoised on the snapshot's notes and projects.
 *   export function useFocusPreferences(): FocusPreferences
 *     — the app's `prefs.focus`.
 *   export function setFocusPreferences(patch: Partial<FocusPreferences>): void
 *     — `useStore.getState().setPrefs({ focus: { ...current, ...patch } })`.
 *   export function useFocusNow(intervalMs = 1000): number
 *     — Date.now(), re-rendering every intervalMs while a block is running and
 *       not paused (no timer otherwise); when the running block completes, it
 *       calls finish() once.
 *
 * Every log change reads the current entries with readFocusLog, changes them
 * (upsertEntry / removeEntry), and sends planLogWrite's result through apply;
 * a null plan sends nothing.
 */
export type { FocusPreferences };
