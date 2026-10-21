import type { Mode } from './mode';
import type { FocusEntry } from './types';

/** Keeps only the entries whose mode matches `mode`. */
export function entriesForMode(entries: readonly FocusEntry[], mode: Mode): FocusEntry[] {
  return entries.filter((entry) => entry.mode === mode);
}
