import { format } from 'date-fns';
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
  return { ...input, startedAt: now, pausedMs: 0, pausedAt: null };
}

/** Pausing a paused block changes nothing. */
export function pauseBlock(block: ActiveBlock, now: number): ActiveBlock {
  return block.pausedAt === null ? { ...block, pausedAt: now } : block;
}

/** Resuming a running block changes nothing; otherwise the pause is added to pausedMs. */
export function resumeBlock(block: ActiveBlock, now: number): ActiveBlock {
  return block.pausedAt === null ? block : {
    ...block,
    pausedMs: block.pausedMs + Math.max(0, now - block.pausedAt),
    pausedAt: null,
  };
}

/** Time worked so far, pauses excluded (a pause under way counts as paused). Never negative. */
export function elapsedMs(block: ActiveBlock, now: number): number {
  return Math.max(0, (block.pausedAt ?? now) - block.startedAt - block.pausedMs);
}

/** Time left on the planned length, never below 0. */
export function remainingMs(block: ActiveBlock, now: number): number {
  return Math.max(0, block.plannedMin * 60_000 - elapsedMs(block, now));
}

export function isComplete(block: ActiveBlock, now: number): boolean {
  return remainingMs(block, now) === 0;
}

/**
 * The log entry a block ending now makes: focus blocks only, minutes =
 * round(elapsed / 1 min) capped at plannedMin, null below MIN_LOGGED_MINUTES.
 * `start` is startedAt as a floating local `yyyy-MM-ddTHH:mm`; rating null;
 * source 'timed'.
 */
export function blockEntry(block: ActiveBlock, now: number): FocusEntry | null {
  if (block.mode === 'unwind') return null;
  const workedMs = elapsedMs(block, now);
  if (workedMs < MIN_LOGGED_MINUTES * 60_000) return null;

  return {
    start: format(new Date(block.startedAt), "yyyy-MM-dd'T'HH:mm"),
    minutes: Math.min(Math.round(workedMs / 60_000), block.plannedMin),
    taskId: block.taskId,
    title: block.title,
    lane: block.lane,
    rating: null,
    source: 'timed',
  };
}

/**
 * The clock face: `mm:ss` under an hour, `h:mm:ss` from an hour. Seconds
 * round up, so the face reads 00:01 until the very end and 00:00 only when done.
 */
export function formatClock(ms: number): string {
  const seconds = Math.ceil(Math.max(0, ms) / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = String(seconds % 60).padStart(2, '0');
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${rest}`
    : `${String(minutes).padStart(2, '0')}:${rest}`;
}

/** An ActiveBlock read back from storage, or null when anything about it is off. */
export function readActiveBlock(stored: unknown): ActiveBlock | null {
  if (stored === null || typeof stored !== 'object' || Array.isArray(stored)) return null;
  const block = stored as Record<string, unknown>;
  if (
    (block.mode !== 'focus' && block.mode !== 'unwind')
    || (block.taskId !== null && typeof block.taskId !== 'string')
    || typeof block.title !== 'string'
    || (block.lane !== null && typeof block.lane !== 'string')
    || typeof block.plannedMin !== 'number' || !Number.isSafeInteger(block.plannedMin) || block.plannedMin <= 0
    || typeof block.startedAt !== 'number' || !Number.isSafeInteger(block.startedAt)
    || typeof block.pausedMs !== 'number' || !Number.isSafeInteger(block.pausedMs) || block.pausedMs < 0
    || (block.pausedAt !== null && (typeof block.pausedAt !== 'number' || !Number.isSafeInteger(block.pausedAt)))
  ) return null;
  if (block.pausedAt !== null && (block.pausedAt < block.startedAt || block.pausedMs > block.pausedAt - block.startedAt)) return null;
  return block as unknown as ActiveBlock;
}
