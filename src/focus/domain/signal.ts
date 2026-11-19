import { command, newUuid, type Command } from '@/api/commands';
import type { Note, Snapshot } from '@/domain/types';
import { focusLogProject, type LogWrite } from './logStore';
import { readActiveBlock, type ActiveBlock } from './timer';

/**
 * The running block, shared between devices through Todoist (docs/focus/SIGNAL.md).
 *
 * One comment on the Inbox, rewritten whenever a block starts, pauses,
 * resumes or ends:
 *
 *   Focus now (edited by the app, please leave as is)
 *
 *   {"v":1,"updatedAt":1793500000000,"device":"k3x9…","active":{…ActiveBlock…}}
 *
 * `active` is null when nothing runs. Every device that syncs reads it and
 * follows the newest one, so a block started on the laptop shows on the phone.
 * Times are epoch milliseconds, so each screen counts down on its own clock.
 */

export const SIGNAL_HEADER = 'Focus now (edited by the app, please leave as is)';

export interface FocusSignal {
  v: 1;
  /** When the device that wrote it last changed the block, epoch ms: the newest wins. */
  updatedAt: number;
  /** A random id per browser, so a device can tell its own signal from another's. */
  device: string;
  active: ActiveBlock | null;
}

export function signalContent(signal: FocusSignal): string {
  return `${SIGNAL_HEADER}\n\n${JSON.stringify(signal)}`;
}

/** The signal a comment holds, or null when the comment is not one or is malformed. */
export function readSignal(content: string): FocusSignal | null {
  if (!content.startsWith(`${SIGNAL_HEADER}\n\n`)) return null;
  let payload: unknown;
  try {
    payload = JSON.parse(content.slice(SIGNAL_HEADER.length + 2));
  } catch {
    return null;
  }
  if (payload === null || typeof payload !== 'object') return null;
  const fields = payload as Record<string, unknown>;
  if (fields.v !== 1 || typeof fields.updatedAt !== 'number' || !Number.isFinite(fields.updatedAt)
    || typeof fields.device !== 'string' || !fields.device) return null;
  const active = fields.active === null ? null : readActiveBlock(fields.active);
  if (fields.active !== null && active === null) return null;
  return { v: 1, updatedAt: fields.updatedAt, device: fields.device, active };
}

function signalNotes(snapshot: Snapshot): Array<{ note: Note; signal: FocusSignal }> {
  const project = focusLogProject(snapshot);
  if (!project) return [];
  return Object.values(snapshot.notes)
    .filter((note) => !note.is_deleted && note.project_id === project.id && note.item_id === null)
    .map((note) => ({ note, signal: readSignal(note.content) }))
    .filter((record): record is { note: Note; signal: FocusSignal } => record.signal !== null)
    .sort((a, b) => b.signal.updatedAt - a.signal.updatedAt || a.note.id.localeCompare(b.note.id));
}

/** The newest signal in the account, or null when there is none. */
export function latestSignal(snapshot: Snapshot): FocusSignal | null {
  return signalNotes(snapshot)[0]?.signal ?? null;
}

/**
 * What makes the account hold `signal`: the newest signal comment rewritten
 * (or one added), and any other signal comments removed, so there stays one.
 * Null before the Inbox is known or when the account already says the same.
 */
export function planSignalWrite(snapshot: Snapshot, signal: FocusSignal, now: Date): LogWrite | null {
  const project = focusLogProject(snapshot);
  if (!project) return null;
  const content = signalContent(signal);
  const [primary, ...others] = signalNotes(snapshot);
  const commands: Command[] = [];
  let tempId: string | null = null;
  if (primary) {
    if (primary.note.content !== content) commands.push(command('note_update', { id: primary.note.id, content }));
  } else {
    tempId = newUuid();
    commands.push({ type: 'note_add', uuid: newUuid(), temp_id: tempId, args: { project_id: project.id, content } });
  }
  for (const other of others) commands.push(command('note_delete', { id: other.note.id }));
  if (commands.length === 0) return null;

  return {
    commands,
    optimistic: (state) => {
      const notes = { ...state.notes };
      if (primary) notes[primary.note.id] = { ...(notes[primary.note.id] ?? primary.note), content };
      if (tempId) {
        notes[tempId] = {
          id: tempId, item_id: null, project_id: project.id, content,
          posted_at: now.toISOString(), posted_uid: state.user?.id ?? '', is_deleted: false, file_attachment: null,
        };
      }
      for (const other of others) notes[other.note.id] = { ...(notes[other.note.id] ?? other.note), is_deleted: true };
      return { ...state, notes };
    },
  };
}
