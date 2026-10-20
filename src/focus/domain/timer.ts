import type { FocusEntry } from './types';

/**
 * The block that is running. Time is always worked out from timestamps, never
 * counted by ticks, so a reload, a sleeping laptop or a background tab cannot
 * make the clock drift. Times are epoch milliseconds.
 */
export interface ActiveBlock {
  /** `focus` blocks are logged; `unwind` breaks never are. */
  mode: 'focus' | 'unwind';
  taskId: string | null;
  title: string;
  lane: string | null;
  plannedMin: number;
  startedAt: number;
  /** Time spent paused so far, not counting a pause still under way. */
  pausedMs: number;
  /** When the current pause began; null while running. */
  pausedAt: number | null;
}

/** A focus block shorter than this is not logged. */
export const MIN_LOGGED_MINUTES = 5;

export function startBlock(
  input: Pick<ActiveBlock, 'mode' | 'taskId' | 'title' | 'lane' | 'plannedMin'>,
  now: number,
): ActiveBlock {
  throw new Error('not implemented');
}

/** Pausing a paused block changes nothing. */
export function pauseBlock(block: ActiveBlock, now: number): ActiveBlock {
  throw new Error('not implemented');
}

/** Resuming a running block changes nothing; otherwise the pause is added to pausedMs. */
export function resumeBlock(block: ActiveBlock, now: number): ActiveBlock {
  throw new Error('not implemented');
}

/** Time worked so far, pauses excluded (a pause under way counts as paused). Never negative. */
export function elapsedMs(block: ActiveBlock, now: number): number {
  throw new Error('not implemented');
}

/** Time left on the planned length, never below 0. */
export function remainingMs(block: ActiveBlock, now: number): number {
  throw new Error('not implemented');
}

export function isComplete(block: ActiveBlock, now: number): boolean {
  throw new Error('not implemented');
}

/**
 * The log entry a block ending now makes: focus blocks only, minutes =
 * round(elapsed / 1 min) capped at plannedMin, null below MIN_LOGGED_MINUTES.
 * `start` is startedAt as a floating local `yyyy-MM-ddTHH:mm`; rating null;
 * source 'timed'.
 */
export function blockEntry(block: ActiveBlock, now: number): FocusEntry | null {
  throw new Error('not implemented');
}

/**
 * The clock face: `mm:ss` under an hour, `h:mm:ss` from an hour. Seconds
 * round up, so the face reads 00:01 until the very end and 00:00 only when done.
 */
export function formatClock(ms: number): string {
  throw new Error('not implemented');
}

/** An ActiveBlock read back from storage, or null when anything about it is off. */
export function readActiveBlock(stored: unknown): ActiveBlock | null {
  throw new Error('not implemented');
}
