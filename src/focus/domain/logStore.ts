import type { Command } from '@/api/commands';
import type { Project, Snapshot } from '@/domain/types';
import type { FocusEntry } from './types';

/**
 * Where the focus log lives in the account, and the commands that change it.
 * Pure: the store hands these commands to the app's `apply`, which shows the
 * change at once, queues it offline and sends it to Todoist.
 */

/** The personal project that holds the log's comments. */
export const FOCUS_LOG_PROJECT = 'Focus log';

/** The project's colour in Todoist's own palette. */
export const FOCUS_LOG_COLOR = 'charcoal';

/**
 * The account's focus-log project: named FOCUS_LOG_PROJECT, not deleted, not
 * archived, not in a workspace. With more than one, the lowest child_order
 * wins, then the lowest id. Null when there is none.
 */
export function focusLogProject(snapshot: Snapshot): Project | null {
  throw new Error('not implemented');
}

/**
 * Every entry in the log: the project's comments (not deleted, not on a task)
 * that readLogComment recognises, merged with mergeEntries in week then part
 * order. Empty without a project.
 */
export function readFocusLog(snapshot: Snapshot): FocusEntry[] {
  throw new Error('not implemented');
}

/** `entries` with `entry` in place of the one sharing its entryKey, or added. */
export function upsertEntry(entries: FocusEntry[], entry: FocusEntry): FocusEntry[] {
  throw new Error('not implemented');
}

/** `entries` without the one whose entryKey is `key`. */
export function removeEntry(entries: FocusEntry[], key: string): FocusEntry[] {
  throw new Error('not implemented');
}

export interface LogWrite {
  commands: Command[];
  /** The snapshot as it will be once Todoist accepts the commands. */
  optimistic: (snapshot: Snapshot) => Snapshot;
}

/**
 * What makes the log hold `after`. Only weeks whose comments would change are
 * touched: for each, writeLogComments gives the wanted parts; an existing part
 * with different content gets `note_update`, a missing part `note_add` (with a
 * temp id), a part no longer needed `note_delete`, and a second comment for
 * the same week and part is deleted. Without a project, a `project_add`
 * (temp id, name FOCUS_LOG_PROJECT, color FOCUS_LOG_COLOR) comes first and
 * the new comments use its temp id — Todoist resolves it within the call.
 * The optimistic snapshot shows the project and the notes (posted_at = now,
 * posted_uid = the user's id) exactly as the commands leave them.
 * Null when nothing would change.
 */
export function planLogWrite(snapshot: Snapshot, after: FocusEntry[], now: Date): LogWrite | null {
  throw new Error('not implemented');
}
