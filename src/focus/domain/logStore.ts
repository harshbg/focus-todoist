import { command, newUuid, type Command } from '@/api/commands';
import type { Note, Project, Snapshot } from '@/domain/types';
import { entryKey, mergeEntries, readLogComment, weekKeyOf, writeLogComments } from './log';
import type { FocusEntry } from './types';

/**
 * Where the focus log lives in the account, and the commands that change it.
 * Pure: the store hands these commands to the app's `apply`, which shows the
 * change at once, queues it offline and sends it to Todoist.
 */

/**
 * The project whose comments hold the log: the Inbox. On Todoist Free an
 * account has 5 projects and may have used them all, while the Inbox never
 * counts; the settings comment lives there too. Null before the first sync.
 */
export function focusLogProject(snapshot: Snapshot): Project | null {
  const inboxId = snapshot.user?.inbox_project_id;
  const byId = inboxId ? snapshot.projects[inboxId] : undefined;
  return byId ?? Object.values(snapshot.projects).find((project) => project.inbox_project && !project.is_deleted) ?? null;
}

function logNotes(snapshot: Snapshot, projectId: string) {
  return Object.values(snapshot.notes)
    .filter((note) => !note.is_deleted && note.project_id === projectId && note.item_id === null)
    .map((note) => ({ note, parsed: readLogComment(note.content) }))
    .filter((record): record is { note: Note; parsed: NonNullable<ReturnType<typeof readLogComment>> } =>
      record.parsed !== null)
    .sort((a, b) => a.parsed.week.localeCompare(b.parsed.week)
      || a.parsed.part - b.parsed.part || a.note.id.localeCompare(b.note.id));
}

/**
 * Every entry in the log: the project's comments (not deleted, not on a task)
 * that readLogComment recognises, merged with mergeEntries in week then part
 * order. Empty without a project.
 */
export function readFocusLog(snapshot: Snapshot): FocusEntry[] {
  const project = focusLogProject(snapshot);
  return project ? mergeEntries(logNotes(snapshot, project.id).map(({ parsed }) => parsed.entries)) : [];
}

/** `entries` with `entry` in place of the one sharing its entryKey, or added. */
export function upsertEntry(entries: FocusEntry[], entry: FocusEntry): FocusEntry[] {
  return mergeEntries([entries.filter((existing) => entryKey(existing) !== entryKey(entry)), [entry]]);
}

/** `entries` without the one whose entryKey is `key`. */
export function removeEntry(entries: FocusEntry[], key: string): FocusEntry[] {
  return entries.filter((entry) => entryKey(entry) !== key);
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
 * the same week and part is deleted. The optimistic snapshot shows the notes
 * (posted_at = now, posted_uid = the user's id) exactly as the commands leave
 * them. Null when nothing would change, or before the Inbox is known.
 */
export function planLogWrite(snapshot: Snapshot, after: FocusEntry[], now: Date): LogWrite | null {
  const project = focusLogProject(snapshot);
  if (!project) return null;
  const projectId = project.id;
  const current = logNotes(snapshot, projectId);
  const byWeek = new Map<string, FocusEntry[]>();
  for (const entry of after) {
    const week = weekKeyOf(entry.start);
    byWeek.set(week, [...(byWeek.get(week) ?? []), entry]);
  }
  const weeks = new Set([...current.map(({ parsed }) => parsed.week), ...byWeek.keys()]);
  const commands: Command[] = [];
  const updates = new Map<string, string>();
  const additions = new Map<string, string>();
  const deletions = new Set<string>();

  for (const week of [...weeks].sort()) {
    const wanted = writeLogComments(week, byWeek.get(week) ?? []);
    const parts = new Map<number, Note[]>();
    for (const { note, parsed } of current) {
      if (parsed.week !== week) continue;
      parts.set(parsed.part, [...(parts.get(parsed.part) ?? []), note]);
    }
    for (let index = 0; index < wanted.length; index += 1) {
      const part = index + 1;
      const [primary, ...duplicates] = parts.get(part) ?? [];
      if (primary) {
        if (primary.content !== wanted[index]) {
          commands.push(command('note_update', { id: primary.id, content: wanted[index] }));
          updates.set(primary.id, wanted[index]);
        }
      } else {
        const tempId = newUuid();
        commands.push({ type: 'note_add', uuid: newUuid(), temp_id: tempId,
          args: { project_id: projectId, content: wanted[index] } });
        additions.set(tempId, wanted[index]);
      }
      for (const duplicate of duplicates) {
        commands.push(command('note_delete', { id: duplicate.id }));
        deletions.add(duplicate.id);
      }
      parts.delete(part);
    }
    for (const notes of parts.values()) {
      for (const note of notes) {
        commands.push(command('note_delete', { id: note.id }));
        deletions.add(note.id);
      }
    }
  }
  if (commands.length === 0) return null;

  return {
    commands,
    optimistic: (state) => {
      const notes = { ...state.notes };
      for (const [id, content] of updates) {
        const note = notes[id] ?? snapshot.notes[id];
        if (note) notes[id] = { ...note, content };
      }
      for (const [id, content] of additions) {
        notes[id] = {
          id, item_id: null, project_id: projectId, content,
          posted_at: now.toISOString(), posted_uid: state.user?.id ?? '',
          is_deleted: false, file_attachment: null,
        };
      }
      for (const id of deletions) {
        const note = notes[id] ?? snapshot.notes[id];
        if (note) notes[id] = { ...note, is_deleted: true };
      }
      return { ...state, notes };
    },
  };
}
