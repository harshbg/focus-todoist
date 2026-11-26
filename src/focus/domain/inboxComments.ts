import type { Note, Snapshot } from '@/domain/types';
import { readLogComment } from './log';
import { focusLogProject, planLogWrite, readFocusLog, type LogWrite } from './logStore';
import { latestSignal, planSignalWrite, readSignal } from './signal';

/**
 * The app's own comments on the Inbox: the focus log and the "Focus now"
 * signal. Todoist's sync leaves out comments on a project nobody shares it
 * with, and the Inbox is one, so these are read on their own (like the
 * settings comment) and kept in the app's snapshot.
 */

/** A comment the focus feature wrote: a log part or the signal. */
export function isFocusComment(content: string): boolean {
  return readLogComment(content) !== null || readSignal(content) !== null;
}

/** A temp id the app gave a comment it has just added: a UUID, never a Todoist id. */
const TEMP_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-/i;

/**
 * The snapshot holding exactly the focus comments Todoist returned: each one
 * added or brought up to date, and a known one Todoist no longer has (deleted
 * on another device) taken out. One added here and not yet sent keeps its
 * temp id and stays. Other comments are left alone.
 */
export function mergeFocusComments(snapshot: Snapshot, fetched: Note[]): Snapshot {
  const project = focusLogProject(snapshot);
  if (!project) return snapshot;
  const mine = fetched.filter((note) => note.project_id === project.id && !note.item_id && !note.is_deleted && isFocusComment(note.content));
  const seen = new Set(mine.map((note) => note.id));
  const notes = { ...snapshot.notes };
  for (const note of Object.values(snapshot.notes)) {
    if (note.project_id === project.id && !note.item_id && !seen.has(note.id) && !TEMP_ID.test(note.id)
      && isFocusComment(note.content)) delete notes[note.id];
  }
  for (const note of mine) notes[note.id] = { ...note, item_id: null, file_attachment: note.file_attachment ?? null };
  return { ...snapshot, notes };
}

/**
 * What turns the account's focus comments back into one per week and part and
 * a single signal, losing no entry: the log written again from every entry it
 * holds, and the newest signal kept. Empty when there is nothing to tidy.
 */
export function planTidy(snapshot: Snapshot, now: Date): LogWrite[] {
  const project = focusLogProject(snapshot);
  if (!project) return [];
  const comments = Object.values(snapshot.notes)
    .filter((note) => !note.is_deleted && note.project_id === project.id && !note.item_id);
  const parts = comments.map((note) => readLogComment(note.content)).filter((part) => part !== null)
    .map((part) => `${part.week}#${part.part}`);
  const signals = comments.filter((note) => readSignal(note.content) !== null);
  const writes: LogWrite[] = [];
  if (new Set(parts).size < parts.length) {
    const log = planLogWrite(snapshot, readFocusLog(snapshot), now);
    if (log) writes.push(log);
  }
  const signal = latestSignal(snapshot);
  if (signals.length > 1 && signal) {
    const plan = planSignalWrite(snapshot, signal, now);
    if (plan) writes.push(plan);
  }
  return writes;
}
