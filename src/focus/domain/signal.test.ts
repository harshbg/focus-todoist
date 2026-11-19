import { describe, expect, it } from 'vitest';
import { emptySnapshot, type Note, type Snapshot } from '@/domain/types';
import { latestSignal, planSignalWrite, readSignal, signalContent, SIGNAL_HEADER, type FocusSignal } from './signal';
import { startBlock, type ActiveBlock } from './timer';

const block = startBlock({ mode: 'focus', focusMode: 'work', taskId: 't-1', title: 'Write the brief', lane: 'Deep Dive', plannedMin: 60 }, 1_000);
const signal = (updatedAt: number, active: ActiveBlock | null = block, device = 'laptop'): FocusSignal => ({ v: 1, updatedAt, device, active });

const note = (id: string, content: string, extra: Partial<Note> = {}): Note => ({
  id, item_id: null, project_id: 'inbox', content, posted_at: '', posted_uid: 'u', is_deleted: false, file_attachment: null, ...extra,
});
const snapshotWith = (...notes: Note[]): Snapshot => ({
  ...emptySnapshot(),
  projects: { inbox: { id: 'inbox', name: 'Inbox', color: 'charcoal', parent_id: null, child_order: 1, is_archived: false, is_deleted: false, is_favorite: false, inbox_project: true } },
  user: { id: 'u', inbox_project_id: 'inbox' } as Snapshot['user'],
  notes: Object.fromEntries(notes.map((n) => [n.id, n])),
});

describe('the focus signal', () => {
  it('round-trips a running block and an idle one', () => {
    expect(readSignal(signalContent(signal(5)))).toEqual(signal(5));
    expect(readSignal(signalContent({ ...signal(6), active: null }))).toEqual({ ...signal(6), active: null });
  });

  it('refuses other comments and malformed ones', () => {
    expect(readSignal('Focus log · 2026-W46 · part 1 (edited by the app, please leave as is)\n\n{}')).toBeNull();
    expect(readSignal(`${SIGNAL_HEADER}\n\nnot json`)).toBeNull();
    expect(readSignal(`${SIGNAL_HEADER}\n\n${JSON.stringify({ v: 1, updatedAt: 5, device: 'x', active: { mode: 'nap' } })}`)).toBeNull();
    expect(readSignal(`${SIGNAL_HEADER}\n\n${JSON.stringify({ v: 2, updatedAt: 5, device: 'x', active: null })}`)).toBeNull();
  });

  it('reads the newest signal on the Inbox, ignoring deleted and task comments', () => {
    const snapshot = snapshotWith(
      note('a', signalContent(signal(10))),
      note('b', signalContent(signal(30, null, 'phone'))),
      note('c', signalContent(signal(50)), { is_deleted: true }),
      note('d', signalContent(signal(60)), { item_id: 'task' }),
    );
    expect(latestSignal(snapshot)).toEqual(signal(30, null, 'phone'));
    expect(latestSignal(snapshotWith())).toBeNull();
  });

  it('rewrites the newest comment, removes the others, and adds one when there is none', () => {
    const snapshot = snapshotWith(note('a', signalContent(signal(10))), note('b', signalContent(signal(30))));
    const plan = planSignalWrite(snapshot, signal(40, null), new Date(40))!;
    expect(plan.commands.map((c) => [c.type, c.args.id])).toEqual([['note_update', 'b'], ['note_delete', 'a']]);
    expect(latestSignal(plan.optimistic(snapshot))).toEqual(signal(40, null));

    const fresh = planSignalWrite(snapshotWith(), signal(1), new Date(1))!;
    expect(fresh.commands[0]).toMatchObject({ type: 'note_add', args: { project_id: 'inbox', content: signalContent(signal(1)) } });
    expect(latestSignal(fresh.optimistic(snapshotWith()))).toEqual(signal(1));
    expect(planSignalWrite(snapshotWith(note('a', signalContent(signal(10)))), signal(10), new Date(10))).toBeNull();
  });
});
