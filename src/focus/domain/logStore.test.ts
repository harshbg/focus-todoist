import { format } from 'date-fns';
import { describe, expect, it } from 'vitest';
import { emptySnapshot, type Note, type Project, type Snapshot } from '@/domain/types';
import { entryKey, readLogComment, weekKeyOf, writeLogComments } from './log';
import {
  focusLogProject, planLogWrite, readFocusLog, removeEntry, upsertEntry,
} from './logStore';
import type { FocusEntry } from './types';

const at = (year: number, month: number, day: number, hour = 9, minute = 0): string =>
  format(new Date(year, month - 1, day, hour, minute), "yyyy-MM-dd'T'HH:mm");

const entry = (start: string, extra: Partial<FocusEntry> = {}): FocusEntry => ({
  mode: 'work',
  start, minutes: 30, taskId: 'task-1', title: 'Draft notes', lane: 'Deep Dive',
  rating: 4, source: 'timed', ...extra,
});

const project = (id: string, extra: Partial<Project> = {}): Project => ({
  id, name: 'Inbox', color: 'charcoal', parent_id: null,
  child_order: 1, is_archived: false, is_deleted: false, is_favorite: false,
  ...extra,
});

const note = (id: string, projectId: string, content: string, extra: Partial<Note> = {}): Note => ({
  id, item_id: null, project_id: projectId, content,
  posted_at: new Date(2026, 9, 20, 8).toISOString(), posted_uid: 'user-1',
  is_deleted: false, file_attachment: null, ...extra,
});

const snapshotWithProject = (): Snapshot => ({
  ...emptySnapshot(), projects: { p: project('p', { inbox_project: true }) },
  user: { id: 'user-1', inbox_project_id: 'p' } as Snapshot['user'],
});

describe('focus log store', () => {
  it('keeps the log on the Inbox, which never counts against the Free plan', () => {
    expect(focusLogProject(snapshotWithProject())?.id).toBe('p');
    const flagged = emptySnapshot();
    flagged.projects = { other: project('other', { name: 'Work' }), inbox: project('inbox', { inbox_project: true }) };
    expect(focusLogProject(flagged)?.id).toBe('inbox');
    expect(focusLogProject(emptySnapshot())).toBeNull();
  });

  it('reads only active project comments and merges weeks and parts', () => {
    const snapshot = snapshotWithProject();
    const first = entry(at(2026, 10, 19, 9));
    const second = entry(at(2026, 10, 20, 9), { taskId: 'task-2' });
    const edited = { ...second, rating: 5 as const };
    const nextWeek = entry(at(2026, 10, 26, 9), { taskId: 'task-3' });
    const week = weekKeyOf(first.start);
    snapshot.notes = {
      part2: note('part2', 'p', writeLogComments(week, [edited])[0].replace('part 1', 'part 2')),
      part1: note('part1', 'p', writeLogComments(week, [first, second])[0]),
      next: note('next', 'p', writeLogComments(weekKeyOf(nextWeek.start), [nextWeek])[0]),
      deleted: note('deleted', 'p', writeLogComments(week, [entry(at(2026, 10, 21))])[0], { is_deleted: true }),
      task: note('task', 'p', writeLogComments(week, [entry(at(2026, 10, 22))])[0], { item_id: 'task-4' }),
      plain: note('plain', 'p', 'Ordinary project comment'),
      elsewhere: note('elsewhere', 'other', writeLogComments(week, [entry(at(2026, 10, 23))])[0]),
    };
    expect(readFocusLog(snapshot)).toEqual([first, edited, nextWeek]);
    expect(readFocusLog(emptySnapshot())).toEqual([]);
  });

  it('adds the first comment of a week to the Inbox, and waits for the Inbox to be known', () => {
    const snapshot = snapshotWithProject();
    const row = entry(at(2026, 10, 20, 9, 10));
    const now = new Date(2026, 9, 20, 10);
    const plan = planLogWrite(snapshot, [row], now);
    expect(plan?.commands.map((cmd) => cmd.type)).toEqual(['note_add']);
    const [addNote] = plan!.commands;
    expect(addNote.args.project_id).toBe('p');
    const optimistic = plan!.optimistic(snapshot);
    expect(optimistic.notes[addNote.temp_id!]).toMatchObject({
      project_id: 'p', item_id: null, posted_at: now.toISOString(),
      posted_uid: 'user-1', is_deleted: false,
    });
    expect(readFocusLog(optimistic)).toEqual([row]);
    expect(planLogWrite(snapshot, [], now)).toBeNull();
    expect(planLogWrite(emptySnapshot(), [row], now)).toBeNull();
  });

  it('updates one existing part when an entry is added to its week', () => {
    const snapshot = snapshotWithProject();
    const first = entry(at(2026, 10, 20, 9));
    const added = entry(at(2026, 10, 20, 10), { taskId: 'task-2' });
    snapshot.notes.n1 = note('n1', 'p', writeLogComments(weekKeyOf(first.start), [first])[0]);
    const plan = planLogWrite(snapshot, [first, added], new Date(2026, 9, 20, 11))!;
    expect(plan.commands.map((cmd) => cmd.type)).toEqual(['note_update']);
    expect(plan.commands[0].args.id).toBe('n1');
    expect(readFocusLog(plan.optimistic(snapshot))).toEqual([first, added]);
    expect(snapshot.notes.n1.content).toBe(writeLogComments(weekKeyOf(first.start), [first])[0]);
  });

  it('adds a second part when the week grows beyond one comment', () => {
    const snapshot = snapshotWithProject();
    const weekStart = at(2026, 10, 20);
    const rows = Array.from({ length: 100 }, (_, i) => entry(at(2026, 10, 20, 9, i), {
      taskId: `task-${i}`, title: `Block ${i} ${'A'.repeat(110)}`,
    }));
    const onePart = rows.slice(0, 50);
    expect(writeLogComments(weekKeyOf(weekStart), onePart)).toHaveLength(1);
    expect(writeLogComments(weekKeyOf(weekStart), rows).length).toBeGreaterThan(1);
    snapshot.notes.n1 = note('n1', 'p', writeLogComments(weekKeyOf(weekStart), onePart)[0]);
    const plan = planLogWrite(snapshot, rows, new Date(2026, 9, 20, 12))!;
    expect(plan.commands.map((cmd) => cmd.type)).toEqual(['note_update', 'note_add']);
    expect(plan.commands[1].args.project_id).toBe('p');
    expect(readFocusLog(plan.optimistic(snapshot))).toEqual(rows);
  });

  it('deletes an emptied week and extra comments for the same part', () => {
    const snapshot = snapshotWithProject();
    const row = entry(at(2026, 10, 20));
    const content = writeLogComments(weekKeyOf(row.start), [row])[0];
    snapshot.notes.a = note('a', 'p', content);
    snapshot.notes.b = note('b', 'p', content);
    const now = new Date(2026, 9, 20, 12);
    const dedupe = planLogWrite(snapshot, [row], now)!;
    expect(dedupe.commands.map((cmd) => cmd.type)).toEqual(['note_delete']);
    expect(dedupe.commands[0].args.id).toBe('b');
    expect(dedupe.optimistic(snapshot).notes.b.is_deleted).toBe(true);
    const empty = planLogWrite(snapshot, [], now)!;
    expect(empty.commands.map((cmd) => cmd.type)).toEqual(['note_delete', 'note_delete']);
    expect(readFocusLog(empty.optimistic(snapshot))).toEqual([]);
  });

  it('does nothing for an unchanged log', () => {
    const snapshot = snapshotWithProject();
    const row = entry(at(2026, 10, 20));
    snapshot.notes.n1 = note('n1', 'p', writeLogComments(weekKeyOf(row.start), [row])[0]);
    expect(planLogWrite(snapshot, [row], new Date(2026, 9, 20, 12))).toBeNull();
  });

  it('upserts and removes entries by their keys', () => {
    const first = entry(at(2026, 10, 20, 9));
    const second = entry(at(2026, 10, 20, 10), { taskId: null, title: 'Free text' });
    const changed = { ...first, minutes: 45, rating: 5 as const };
    expect(upsertEntry([first, second], changed)).toEqual([changed, second]);
    expect(upsertEntry([first], second)).toEqual([first, second]);
    expect(removeEntry([first, second], entryKey(first))).toEqual([second]);
    expect(removeEntry([first], entryKey(second))).toEqual([first]);
    expect(readLogComment(writeLogComments(weekKeyOf(first.start), [first])[0])?.entries).toEqual([first]);
  });
});
