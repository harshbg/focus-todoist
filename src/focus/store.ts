import { useEffect, useMemo, useState } from 'react';
import { create } from 'zustand';
import { useStore } from '@/store/store';
import { entryKey } from './domain/log';
import { planLogWrite, readFocusLog, removeEntry, upsertEntry } from './domain/logStore';
import { blockEntry, isComplete, pauseBlock, readActiveBlock, resumeBlock, startBlock } from './domain/timer';
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

function storedActive(): ActiveBlock | null {
  try {
    return readActiveBlock(JSON.parse(window.localStorage.getItem(ACTIVE_KEY) ?? 'null'));
  } catch {
    return null;
  }
}

let channel: BroadcastChannel | null = null;
let displayGeneration = 0;
try {
  if (typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined') {
    channel = new BroadcastChannel(BROADCAST_CHANNEL);
  }
} catch {
  // The timer still works in this tab when channel access is unavailable.
}

function publishActive(active: ActiveBlock | null): void {
  try {
    if (active) window.localStorage.setItem(ACTIVE_KEY, JSON.stringify(active));
    else window.localStorage.removeItem(ACTIVE_KEY);
  } catch {
    // Private windows may disallow local storage.
  }
  try {
    channel?.postMessage(active);
  } catch {
    // A failed channel must not stop the local timer.
  }
}

async function writeLog(after: FocusEntry[]): Promise<void> {
  const app = useStore.getState();
  const plan = planLogWrite(app.snapshot, after, new Date());
  if (plan) await app.apply(plan.commands, plan.optimistic);
}

export const useFocusStore = create<FocusStore>()((set, get) => ({
  active: typeof window === 'undefined' ? null : storedActive(),
  justLogged: null,
  start(input) {
    const active = startBlock(input, Date.now());
    displayGeneration += 1;
    set({ active, justLogged: null });
    publishActive(active);
  },
  pause() {
    const current = get().active;
    if (!current) return;
    const active = pauseBlock(current, Date.now());
    if (active === current) return;
    set({ active });
    publishActive(active);
  },
  resume() {
    const current = get().active;
    if (!current) return;
    const active = resumeBlock(current, Date.now());
    if (active === current) return;
    set({ active });
    publishActive(active);
  },
  async finish() {
    const current = get().active;
    if (!current) return null;
    const entry = blockEntry(current, Date.now());
    const generation = displayGeneration;
    set({ active: null });
    publishActive(null);
    if (!entry) return null;
    const entries = readFocusLog(useStore.getState().snapshot);
    await writeLog(upsertEntry(entries, entry));
    if (generation === displayGeneration) set({ justLogged: entry });
    return entry;
  },
  discard() {
    if (!get().active) return;
    set({ active: null });
    publishActive(null);
  },
  async rate(rating) {
    const current = get().justLogged;
    if (!current) return;
    const generation = displayGeneration;
    const entry = { ...current, rating };
    const entries = readFocusLog(useStore.getState().snapshot);
    await writeLog(upsertEntry(entries, entry));
    if (generation === displayGeneration) set({ justLogged: entry });
  },
  dismiss() {
    displayGeneration += 1;
    set({ justLogged: null });
  },
  async logManual(entry) {
    const entries = readFocusLog(useStore.getState().snapshot);
    await writeLog(upsertEntry(entries, { ...entry, source: 'manual' }));
  },
  async editEntry(key, patch) {
    const entries = readFocusLog(useStore.getState().snapshot);
    const current = entries.find((entry) => entryKey(entry) === key);
    if (!current) return;
    const generation = displayGeneration;
    const updated = { ...current, ...patch };
    await writeLog(upsertEntry(removeEntry(entries, key), updated));
    const justLogged = get().justLogged;
    if (generation === displayGeneration && justLogged && entryKey(justLogged) === key) set({ justLogged: updated });
  },
  async deleteEntry(key) {
    const entries = readFocusLog(useStore.getState().snapshot);
    const generation = displayGeneration;
    await writeLog(removeEntry(entries, key));
    const justLogged = get().justLogged;
    if (generation === displayGeneration && justLogged && entryKey(justLogged) === key) set({ justLogged: null });
  },
}));

function finishExpired(): void {
  const app = useStore.getState();
  const active = useFocusStore.getState().active;
  if (app.ready && app.connected && active && isComplete(active, Date.now())) {
    void useFocusStore.getState().finish();
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== ACTIVE_KEY) return;
    let active: ActiveBlock | null = null;
    try {
      active = readActiveBlock(JSON.parse(event.newValue ?? 'null'));
    } catch {
      // Malformed data from another tab is treated as no running block.
    }
    useFocusStore.setState({ active });
    finishExpired();
  });
  if (channel) {
    try {
      channel.onmessage = (event: MessageEvent<unknown>) => {
        try {
          useFocusStore.setState({ active: readActiveBlock(event.data) });
          finishExpired();
        } catch {
          // A malformed message must not interrupt this tab's timer.
        }
      };
    } catch {
      // The storage event still shares the timer when a channel cannot listen.
    }
  }
  useStore.subscribe(finishExpired);
  finishExpired();
}

export function useFocusLog(): FocusEntry[] {
  const notes = useStore((state) => state.snapshot.notes);
  const projects = useStore((state) => state.snapshot.projects);
  // The user names the Inbox, which holds the log; it can arrive after the notes.
  const user = useStore((state) => state.snapshot.user);
  return useMemo(() => readFocusLog({ ...useStore.getState().snapshot, notes, projects, user }), [notes, projects, user]);
}

export function useFocusPreferences(): FocusPreferences {
  return useStore((state) => state.prefs.focus);
}

export function setFocusPreferences(patch: Partial<FocusPreferences>): void {
  const app = useStore.getState();
  app.setPrefs({ focus: { ...app.prefs.focus, ...patch } });
}

export function useFocusNow(intervalMs = 1000): number {
  const active = useFocusStore((state) => state.active);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!active || active.pausedAt !== null) return;
    let finishing = false;
    const tick = () => {
      const current = Date.now();
      setNow(current);
      if (!finishing && isComplete(active, current)) {
        finishing = true;
        void useFocusStore.getState().finish();
      }
    };
    tick();
    const timer = window.setInterval(tick, intervalMs);
    return () => window.clearInterval(timer);
  }, [active, intervalMs]);
  return now;
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
