import { afterEach, describe, expect, it, vi } from 'vitest';
import { emptySnapshot, type Note, type Snapshot } from '@/domain/types';
import { useStore } from '@/store/store';
import { entryKey } from './domain/log';
import { readFocusLog } from './domain/logStore';
import { signalContent, latestSignal } from './domain/signal';
import { startBlock } from './domain/timer';
import { followSignal, loadFocusComments, useFocusStore } from './store';

/** The comments Todoist holds on the Inbox, as its REST API returns them. */
const server: { comments: Note[] } = vi.hoisted(() => ({ comments: [] }));
vi.mock('@/api/client', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/api/client')>(),
  request: vi.fn(async () => ({ results: server.comments, next_cursor: null })),
}));

const originalApply = useStore.getState().apply;
const originalRefresh = useStore.getState().refresh;

afterEach(() => {
  useFocusStore.getState().discard();
  useFocusStore.getState().dismiss();
  useStore.setState({ apply: originalApply, refresh: originalRefresh });
  vi.useRealTimers();
});

describe('focus store', () => {
  it('logs worked time without pauses, then rates, moves and deletes the entry', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 20, 9));
    const apply = vi.fn(async (_commands, optimistic) => {
      useStore.setState({ snapshot: optimistic(useStore.getState().snapshot) });
      return {};
    });
    const snapshot = emptySnapshot();
    snapshot.projects.inbox = {
      id: 'inbox', name: 'Inbox', color: 'charcoal', parent_id: null,
      child_order: 1, is_archived: false, is_deleted: false, is_favorite: false,
      inbox_project: true,
    };
    snapshot.user = { id: 'user-1', inbox_project_id: 'inbox' } as Snapshot['user'];
    useStore.setState({ snapshot, apply });

    const focus = useFocusStore.getState();
    focus.start({ mode: 'focus', focusMode: 'work', taskId: 'task-1', title: 'Draft notes', lane: 'Deep Dive', plannedMin: 30 });
    vi.advanceTimersByTime(6 * 60_000);
    focus.pause();
    vi.advanceTimersByTime(2 * 60_000);
    focus.resume();
    vi.advanceTimersByTime(24 * 60_000);
    const logged = await focus.finish();

    expect(logged).toMatchObject({ minutes: 30, taskId: 'task-1', source: 'timed', mode: 'work' });
    expect(readFocusLog(useStore.getState().snapshot)).toEqual([logged]);
    await focus.rate(5);
    expect(readFocusLog(useStore.getState().snapshot)[0].rating).toBe(5);

    await focus.editEntry(entryKey(logged!), { start: '2026-10-27T09:00', minutes: 25 });
    const moved = readFocusLog(useStore.getState().snapshot);
    expect(moved).toMatchObject([{ start: '2026-10-27T09:00', minutes: 25, rating: 5, mode: 'work' }]);
    await focus.deleteEntry(entryKey(moved[0]));
    expect(readFocusLog(useStore.getState().snapshot)).toEqual([]);
    expect(apply).toHaveBeenCalledTimes(4);
  });

  it('reads the log from Todoist again before writing, so a block saved elsewhere is kept', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 26, 11, 35));
    const snapshot = emptySnapshot();
    snapshot.projects.inbox = {
      id: 'inbox', name: 'Inbox', color: 'charcoal', parent_id: null,
      child_order: 1, is_archived: false, is_deleted: false, is_favorite: false,
      inbox_project: true,
    };
    snapshot.user = { id: 'user-1', inbox_project_id: 'inbox' } as Snapshot['user'];
    const elsewhere = {
      id: 'note-1', item_id: null, project_id: 'inbox', posted_at: '', posted_uid: 'user-1', is_deleted: false, file_attachment: null,
      content: 'Focus log · 2026-W44 · part 1 (edited by the app, please leave as is)\n\n{"v":1,"e":[["2026-10-26T00:10",60,"t-0","Katrina Analysis",null,null,"t","w"]]}',
    };
    // This tab was in the background: its copy has no log yet, Todoist has one block.
    const refresh = vi.fn(async () => {
      useStore.setState({ snapshot: { ...useStore.getState().snapshot, notes: { 'note-1': elsewhere } } });
    });
    const apply = vi.fn(async (_commands, optimistic) => {
      useStore.setState({ snapshot: optimistic(useStore.getState().snapshot) });
      return {};
    });
    useStore.setState({ snapshot, apply, refresh });

    const focus = useFocusStore.getState();
    focus.start({ mode: 'focus', focusMode: 'work', taskId: 't-1', title: 'Issuer Decline Analysis', lane: null, plannedMin: 60 });
    vi.advanceTimersByTime(60 * 60_000);
    await focus.finish();

    expect(refresh).toHaveBeenCalled();
    expect(apply.mock.calls[0][0]).toMatchObject([{ type: 'note_update', args: { id: 'note-1' } }]);
    expect(readFocusLog(useStore.getState().snapshot).map((entry) => entry.title)).toEqual(['Katrina Analysis', 'Issuer Decline Analysis']);
  });

  it('leaves unwind blocks and short focus blocks out of the log', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 20, 9));
    const apply = vi.fn();
    useStore.setState({ snapshot: emptySnapshot(), apply });
    const focus = useFocusStore.getState();

    focus.start({ mode: 'unwind', focusMode: 'work', taskId: null, title: 'Break', lane: null, plannedMin: 5 });
    vi.advanceTimersByTime(5 * 60_000);
    expect(await focus.finish()).toBeNull();
    focus.start({ mode: 'focus', focusMode: 'work', taskId: null, title: 'Draft', lane: null, plannedMin: 30 });
    vi.advanceTimersByTime(4 * 60_000);
    expect(await focus.finish()).toBeNull();
    expect(apply).not.toHaveBeenCalled();
  });

  it('shares a block through the signal comment and follows one started on another device', async () => {
    const inbox = {
      id: 'inbox', name: 'Inbox', color: 'charcoal', parent_id: null,
      child_order: 1, is_archived: false, is_deleted: false, is_favorite: false, inbox_project: true,
    };
    const snapshot: Snapshot = { ...emptySnapshot(), projects: { inbox }, user: { id: 'u', inbox_project_id: 'inbox' } as Snapshot['user'] };
    const apply = vi.fn(async (_commands, optimistic) => {
      useStore.setState({ snapshot: optimistic(useStore.getState().snapshot) });
      return {};
    });
    useStore.setState({ snapshot, apply, ready: true, connected: true });

    // Started here: the signal says so, from this device.
    useFocusStore.getState().start({ mode: 'focus', focusMode: 'work', taskId: 't-1', title: 'Write', lane: null, plannedMin: 30 });
    await vi.waitFor(() => expect(latestSignal(useStore.getState().snapshot)?.active?.taskId).toBe('t-1'));
    useFocusStore.getState().discard();
    await vi.waitFor(() => expect(latestSignal(useStore.getState().snapshot)?.active).toBeNull());
    expect(Object.values(useStore.getState().snapshot.notes).filter((n) => !n.is_deleted)).toHaveLength(1);

    // Another device starts a block later: this one follows it.
    const remote = startBlock({ mode: 'focus', focusMode: 'personal', taskId: 't-2', title: 'Read', lane: 'Reading', plannedMin: 60 }, Date.now());
    const note = Object.values(useStore.getState().snapshot.notes)[0];
    useStore.setState({ snapshot: { ...useStore.getState().snapshot, notes: { [note.id]: { ...note, content: signalContent({ v: 1, updatedAt: Date.now() + 1000, device: 'phone', active: remote }) } } } });
    followSignal();
    expect(useFocusStore.getState().active).toEqual(remote);

    // And stops when the other device stops it.
    useStore.setState({ snapshot: { ...useStore.getState().snapshot, notes: { [note.id]: { ...note, content: signalContent({ v: 1, updatedAt: Date.now() + 2000, device: 'phone', active: null }) } } } });
    followSignal();
    expect(useFocusStore.getState().active).toBeNull();
    useStore.setState({ ready: false, connected: false });
  });

  it('reads the Inbox comments the sync leaves out, and adds to the week’s comment instead of a new one', async () => {
    const inbox = {
      id: 'inbox', name: 'Inbox', color: 'charcoal', parent_id: null,
      child_order: 1, is_archived: false, is_deleted: false, is_favorite: false, inbox_project: true,
    };
    const header = (week: string) => `Focus log · ${week} · part 1 (edited by the app, please leave as is)`;
    const row = (start: string, minutes: number) => [start, minutes, 't-9', 'Chapter 4', null, null, 't', 'p'];
    const comment = (id: string, week: string, rows: unknown[][]): Note => ({
      id, item_id: null, project_id: 'inbox', content: `${header(week)}\n\n${JSON.stringify({ v: 1, e: rows })}`,
      posted_at: '2026-11-25T08:00:00Z', posted_uid: 'u', is_deleted: false, file_attachment: null,
    });
    // As the account was left: the same week written into three comments.
    server.comments = [
      comment('c1', '2026-W48', [row('2026-11-23T09:00', 60)]),
      comment('c2', '2026-W48', [row('2026-11-23T09:00', 60)]),
      comment('c3', '2026-W48', [row('2026-11-24T09:00', 30)]),
    ];
    const snapshot: Snapshot = { ...emptySnapshot(), projects: { inbox }, user: { id: 'u', inbox_project_id: 'inbox' } as Snapshot['user'] };
    const apply = vi.fn(async (_commands, optimistic) => {
      useStore.setState({ snapshot: optimistic(useStore.getState().snapshot) });
      return {};
    });
    const refresh = vi.fn(async () => undefined);
    useStore.setState({ snapshot, apply, refresh, ready: true, connected: true });

    await loadFocusComments();
    // Tidied at once: one comment for the week, holding both blocks.
    expect(apply.mock.calls[0][0]).toMatchObject([
      { type: 'note_update', args: { id: 'c1' } },
      { type: 'note_delete', args: { id: 'c2' } },
      { type: 'note_delete', args: { id: 'c3' } },
    ]);
    expect(readFocusLog(useStore.getState().snapshot).map((entry) => entry.minutes)).toEqual([60, 30]);

    // Todoist now holds the tidy comment; a new block goes into it.
    server.comments = [useStore.getState().snapshot.notes.c1];
    apply.mockClear();
    await useFocusStore.getState().logManual({ start: '2026-11-25T09:00', minutes: 45, taskId: null, title: 'Notes', lane: null, rating: null, mode: 'personal' });
    expect(apply).toHaveBeenCalledTimes(1);
    expect(apply.mock.calls[0][0]).toMatchObject([{ type: 'note_update', args: { id: 'c1' } }]);
    expect(readFocusLog(useStore.getState().snapshot).map((entry) => entry.minutes)).toEqual([60, 30, 45]);
    server.comments = [];
    useStore.setState({ ready: false, connected: false });
  });
});
