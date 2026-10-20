import { describe, expect, it } from 'vitest';
import { emptySnapshot, type Item, type Project, type Section, type Snapshot } from '@/domain/types';
import {
  itemMode, newTaskPlacement, projectModes, scopeItems, scopeSnapshot,
  WORK_LABEL, WORK_PROJECT_NAME, workProjectIds,
} from './mode';

const project = (id: string, name: string, extra: Partial<Project> = {}): Project => ({
  id, name, color: 'charcoal', parent_id: null, child_order: 1,
  is_archived: false, is_deleted: false, is_favorite: false, ...extra,
});

const item = (id: string, projectId: string, extra: Partial<Item> = {}): Item => ({
  id, user_id: 'user-1', project_id: projectId, section_id: null, parent_id: null,
  content: `Task ${id}`, description: '', priority: 1, due: null, deadline: null,
  duration: null, labels: [], child_order: 1, day_order: -1, collapsed: false,
  checked: false, is_deleted: false, added_at: null, completed_at: null,
  updated_at: null, responsible_uid: null, ...extra,
});

describe('constants', () => {
  it('defines the expected work label and default work project name', () => {
    expect(WORK_LABEL).toBe('work');
    expect(WORK_PROJECT_NAME).toBe('Work');
  });
});

describe('workProjectIds', () => {
  it('recognises projects named Work case-insensitively and trimmed', () => {
    const snapshot: Snapshot = {
      ...emptySnapshot(),
      projects: {
        p1: project('p1', 'Work'),
        p2: project('p2', '  work  '),
        p3: project('p3', 'WORK'),
        p4: project('p4', 'Personal'),
      },
    };
    expect(workProjectIds(snapshot, [])).toEqual(new Set(['p1', 'p2', 'p3']));
  });

  it('recognises projects marked in settings', () => {
    const snapshot: Snapshot = {
      ...emptySnapshot(),
      projects: {
        p1: project('p1', 'Client Project'),
        p2: project('p2', 'Home'),
      },
    };
    expect(workProjectIds(snapshot, ['p1', 'p999'])).toEqual(new Set(['p1']));
  });

  it('includes nested projects at any depth', () => {
    const snapshot: Snapshot = {
      ...emptySnapshot(),
      projects: {
        root: project('root', 'Work'),
        child1: project('child1', 'Subproject 1', { parent_id: 'root' }),
        child2: project('child2', 'Subproject 2', { parent_id: 'child1' }),
        child3: project('child3', 'Subproject 3', { parent_id: 'child2' }),
        other: project('other', 'Personal'),
        otherChild: project('otherChild', 'Personal Sub', { parent_id: 'other' }),
      },
    };
    expect(workProjectIds(snapshot, [])).toEqual(new Set(['root', 'child1', 'child2', 'child3']));
  });

  it('excludes deleted and archived projects and their children', () => {
    const snapshot: Snapshot = {
      ...emptySnapshot(),
      projects: {
        archivedWork: project('p1', 'Work', { is_archived: true }),
        deletedWork: project('p2', 'Work', { is_deleted: true }),
        markedArchived: project('p3', 'Marked', { is_archived: true }),
        childOfArchived: project('p4', 'Child', { parent_id: 'p1' }),
        activeWork: project('p5', 'Work'),
        childOfActive: project('p6', 'Child', { parent_id: 'p5' }),
      },
    };
    expect(workProjectIds(snapshot, ['p3'])).toEqual(new Set(['p5', 'p6']));
  });
});

describe('itemMode', () => {
  const workProjects = new Set(['work-1']);

  it('identifies tasks in a work project as work', () => {
    expect(itemMode(item('t1', 'work-1'), workProjects)).toBe('work');
  });

  it('identifies tasks carrying the work label (case-insensitively) as work wherever they live', () => {
    expect(itemMode(item('t1', 'personal-1', { labels: [WORK_LABEL] }), workProjects)).toBe('work');
    expect(itemMode(item('t2', 'personal-1', { labels: ['Work'] }), workProjects)).toBe('work');
    expect(itemMode(item('t3', 'personal-1', { labels: [' WORK '] }), workProjects)).toBe('work');
  });

  it('identifies tasks without the work label in a personal project as personal', () => {
    expect(itemMode(item('t1', 'personal-1', { labels: ['urgent', 'home'] }), workProjects)).toBe('personal');
    expect(itemMode(item('t2', 'personal-1', { labels: [] }), workProjects)).toBe('personal');
  });
});

describe('projectModes', () => {
  const workProjects = new Set(['work-1']);

  it('shows the Inbox in both work and personal mode', () => {
    const inbox = project('inbox', 'Inbox', { inbox_project: true });
    expect(projectModes(inbox, workProjects, [])).toEqual(new Set(['work', 'personal']));
  });

  it('shows a Work project only in Work mode', () => {
    const workProj = project('work-1', 'Work');
    expect(projectModes(workProj, workProjects, [])).toEqual(new Set(['work']));
  });

  it('shows an ordinary project in Personal mode, and in Work mode while holding open work-labelled tasks', () => {
    const personalProj = project('pers-1', 'Personal');
    expect(projectModes(personalProj, workProjects, [])).toEqual(new Set(['personal']));

    const openWorkTask = item('t1', 'pers-1', { labels: [WORK_LABEL] });
    expect(projectModes(personalProj, workProjects, [openWorkTask])).toEqual(new Set(['personal', 'work']));

    const completedWorkTask = item('t2', 'pers-1', { labels: [WORK_LABEL], checked: true });
    expect(projectModes(personalProj, workProjects, [completedWorkTask])).toEqual(new Set(['personal']));

    const deletedWorkTask = item('t3', 'pers-1', { labels: [WORK_LABEL], is_deleted: true });
    expect(projectModes(personalProj, workProjects, [deletedWorkTask])).toEqual(new Set(['personal']));

    const nonWorkTask = item('t4', 'pers-1', { labels: ['home'] });
    expect(projectModes(personalProj, workProjects, [nonWorkTask])).toEqual(new Set(['personal']));
  });
});

describe('scopeItems', () => {
  const workProjects = new Set(['work-1']);
  const items: Record<string, Item> = {
    t1: item('t1', 'work-1'),
    t2: item('t2', 'pers-1', { labels: [WORK_LABEL] }),
    t3: item('t3', 'pers-1'),
  };

  it('scopes items keyed by id to the requested mode', () => {
    expect(scopeItems(items, 'work', workProjects)).toEqual({ t1: items.t1, t2: items.t2 });
    expect(scopeItems(items, 'personal', workProjects)).toEqual({ t3: items.t3 });
  });
});

describe('scopeSnapshot', () => {
  it('scopes items, projects, and sections to the current mode', () => {
    const snapshot: Snapshot = {
      ...emptySnapshot(),
      projects: {
        inbox: project('inbox', 'Inbox', { inbox_project: true }),
        work: project('work', 'Work'),
        personal: project('personal', 'Personal'),
        archivedWork: project('archived', 'Work', { is_archived: true }),
      },
      sections: {
        sInbox: { id: 'sInbox', project_id: 'inbox', name: 'Queue', section_order: 1, is_archived: false, is_deleted: false } as Section,
        sWork: { id: 'sWork', project_id: 'work', name: 'Sprint', section_order: 1, is_archived: false, is_deleted: false } as Section,
        sPersonal: { id: 'sPersonal', project_id: 'personal', name: 'Errands', section_order: 1, is_archived: false, is_deleted: false } as Section,
      },
      items: {
        t1: item('t1', 'work'),
        t2: item('t2', 'personal'),
      },
    };

    const workScoped = scopeSnapshot(snapshot, 'work', []);
    expect(Object.keys(workScoped.projects)).toEqual(['inbox', 'work']);
    expect(Object.keys(workScoped.items)).toEqual(['t1']);
    expect(Object.keys(workScoped.sections)).toEqual(['sInbox', 'sWork']);

    const personalScoped = scopeSnapshot(snapshot, 'personal', []);
    expect(Object.keys(personalScoped.projects)).toEqual(['inbox', 'personal']);
    expect(Object.keys(personalScoped.items)).toEqual(['t2']);
    expect(Object.keys(personalScoped.sections)).toEqual(['sInbox', 'sPersonal']);
  });
});

describe('newTaskPlacement', () => {
  it('places a new task into the first work project in Work mode, marked projects first', () => {
    const snapshot: Snapshot = {
      ...emptySnapshot(),
      user: { inbox_project_id: 'inbox' } as Snapshot['user'],
      projects: {
        inbox: project('inbox', 'Inbox', { inbox_project: true }),
        workDefault: project('wDef', 'Work', { child_order: 1 }),
        workMarked: project('wMark', 'Engineering', { child_order: 5 }),
      },
    };
    // wMark is marked, so it comes before wDef despite wDef having smaller child_order
    expect(newTaskPlacement(snapshot, 'work', ['wMark'], null)).toEqual({
      projectId: 'wMark', addLabels: [],
    });
  });

  it('orders by child_order when comparing marked projects or unmarked work projects', () => {
    const snapshot: Snapshot = {
      ...emptySnapshot(),
      user: { inbox_project_id: 'inbox' } as Snapshot['user'],
      projects: {
        w1: project('w1', 'Work 1', { child_order: 10 }),
        w2: project('w2', 'Work 2', { child_order: 2 }),
      },
    };
    expect(newTaskPlacement(snapshot, 'work', ['w1', 'w2'], null)).toEqual({
      projectId: 'w2', addLabels: [],
    });
  });

  it('falls back to the Inbox and adds the work label if no Work project exists in Work mode', () => {
    const snapshot: Snapshot = {
      ...emptySnapshot(),
      user: { inbox_project_id: 'inbox' } as Snapshot['user'],
      projects: {
        inbox: project('inbox', 'Inbox', { inbox_project: true }),
        home: project('home', 'Home', { child_order: 1 }),
      },
    };
    expect(newTaskPlacement(snapshot, 'work', [], null)).toEqual({
      projectId: 'inbox', addLabels: [WORK_LABEL],
    });
  });

  it('adds the work label when target project is not a Work project in Work mode', () => {
    const snapshot: Snapshot = {
      ...emptySnapshot(),
      projects: {
        work: project('work', 'Work'),
        home: project('home', 'Home'),
      },
    };
    expect(newTaskPlacement(snapshot, 'work', [], 'home')).toEqual({
      projectId: 'home', addLabels: [WORK_LABEL],
    });
    expect(newTaskPlacement(snapshot, 'work', [], 'work')).toEqual({
      projectId: 'work', addLabels: [],
    });
  });

  it('places into chosen project or Inbox with no extra label in Personal mode', () => {
    const snapshot: Snapshot = {
      ...emptySnapshot(),
      user: { inbox_project_id: 'inbox' } as Snapshot['user'],
      projects: {
        inbox: project('inbox', 'Inbox', { inbox_project: true }),
        home: project('home', 'Home'),
        work: project('work', 'Work'),
      },
    };
    expect(newTaskPlacement(snapshot, 'personal', [], null)).toEqual({
      projectId: 'inbox', addLabels: [],
    });
    expect(newTaskPlacement(snapshot, 'personal', [], 'home')).toEqual({
      projectId: 'home', addLabels: [],
    });
    expect(newTaskPlacement(snapshot, 'personal', [], 'work')).toEqual({
      projectId: 'work', addLabels: [],
    });
  });
});
