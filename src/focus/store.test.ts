import { afterEach, describe, expect, it, vi } from 'vitest';
import { emptySnapshot, type Snapshot } from '@/domain/types';
import { useStore } from '@/store/store';
import { entryKey } from './domain/log';
import { readFocusLog } from './domain/logStore';
import { useFocusStore } from './store';

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
});
