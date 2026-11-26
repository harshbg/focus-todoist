import { describe, expect, it } from 'vitest';
import { emptySnapshot, type Note, type Snapshot } from '@/domain/types';
import { readLogComment } from './log';
import { readFocusLog } from './logStore';
import { isFocusComment, mergeFocusComments, planTidy } from './inboxComments';
import { SIGNAL_HEADER } from './signal';

const LOG = (week: string, rows: unknown[][]) =>
  `Focus log · ${week} · part 1 (edited by the app, please leave as is)\n\n${JSON.stringify({ v: 1, e: rows })}`;
const SIGNAL = (updatedAt: number, active: unknown = null) =>
  `${SIGNAL_HEADER}\n\n${JSON.stringify({ v: 1, updatedAt, device: 'dev1', active })}`;

const note = (id: string, content: string, extra: Partial<Note> = {}): Note => ({
  id, item_id: null, project_id: 'inbox', content, posted_at: '2026-11-20T08:00:00Z', posted_uid: 'u',
  is_deleted: false, file_attachment: null, ...extra,
});

const base = (notes: Note[] = []): Snapshot => ({
  ...emptySnapshot(),
  projects: { inbox: { id: 'inbox', name: 'Inbox', color: 'charcoal', parent_id: null, child_order: 0,
    is_archived: false, is_deleted: false, is_favorite: false, inbox_project: true } },
  user: { id: 'u', inbox_project_id: 'inbox' } as Snapshot['user'],
  notes: Object.fromEntries(notes.map((n) => [n.id, n])),
});

// As the account had them: one comment per finished block, some written twice.
const nps = ['2026-11-22T22:17', 120, 't1', 'NPS Deepdive', null, null, 't', 'w'];
const tm = ['2026-11-23T01:01', 60, 't2', 'TM Analysis', null, null, 't', 'w'];
const tm2 = ['2026-11-23T02:02', 30, 't2', 'TM Analysis', null, null, 't', 'w'];
const scattered = [
  note('a1', LOG('2026-W47', [nps])),
  note('a2', LOG('2026-W47', [nps])),
  note('b1', LOG('2026-W48', [tm])),
  note('b2', LOG('2026-W48', [tm])),
  note('b3', LOG('2026-W48', [tm2])),
  note('s1', SIGNAL(100)),
  note('s2', SIGNAL(300)),
  note('s3', SIGNAL(200)),
];

describe('the focus comments on the Inbox', () => {
  it('knows its own comments from the settings and from the user’s', () => {
    expect(isFocusComment(LOG('2026-W48', [tm]))).toBe(true);
    expect(isFocusComment(SIGNAL(1))).toBe(true);
    expect(isFocusComment('Focus for Todoist · settings (edited by the app, please leave as is)\n\n{}')).toBe(false);
    expect(isFocusComment('Call the bank')).toBe(false);
  });

  it('brings in what Todoist holds, which the sync leaves out', () => {
    const merged = mergeFocusComments(base(), [...scattered, note('x', 'Call the bank'), note('y', LOG('2026-W48', [tm]), { item_id: 'task' })]);
    expect(Object.keys(merged.notes).sort()).toEqual(scattered.map((n) => n.id).sort());
    expect(readFocusLog(merged).map((entry) => entry.minutes)).toEqual([120, 60, 30]);
  });

  it('drops a comment deleted elsewhere but keeps one still being added, and the rest', () => {
    const pending = note('0b6f1c2e-1111-4222-8333-444455556666', LOG('2026-W48', [tm2]));
    const settings = note('set', 'Focus for Todoist · settings (edited by the app, please leave as is)\n\n{}');
    const merged = mergeFocusComments(base([note('gone', LOG('2026-W46', [tm])), pending, settings]), [scattered[0]]);
    expect(merged.notes.gone).toBeUndefined();
    expect(merged.notes[pending.id]).toBeDefined();
    expect(merged.notes.set).toBeDefined();
    expect(merged.notes.a1).toBeDefined();
  });

  it('tidies the pile into one comment per week and one signal, keeping every block', () => {
    const snapshot = base(scattered);
    const writes = planTidy(snapshot, new Date(2026, 10, 26));
    const after = writes.reduce((state, write) => write.optimistic(state), snapshot);
    const live = Object.values(after.notes).filter((n) => !n.is_deleted);
    const logs = live.map((n) => readLogComment(n.content)).filter((part) => part !== null);
    expect(logs.map((part) => part.week).sort()).toEqual(['2026-W47', '2026-W48']);
    expect(readFocusLog(after).map((entry) => entry.minutes)).toEqual([120, 60, 30]);
    const signals = live.filter((n) => n.content.startsWith(SIGNAL_HEADER));
    expect(signals).toHaveLength(1);
    expect(signals[0].content).toContain('"updatedAt":300');
    // Tidy once, and there is nothing left to do.
    expect(planTidy(after, new Date(2026, 10, 26))).toEqual([]);
  });

  it('leaves a tidy account alone', () => {
    expect(planTidy(base([scattered[0], scattered[5]]), new Date())).toEqual([]);
  });
});
