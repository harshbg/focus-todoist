import type { Item, Project, Snapshot } from '@/domain/types';

/**
 * Work / Personal mode (SPEC §10.2): a filter over the whole app built only on
 * what Todoist already has — a project marked as Work (by default the one
 * named "Work") and the `work` label — so it costs nothing on the Free plan.
 */
export type Mode = 'work' | 'personal';

/** The label that marks a task as Work wherever it lives. Matched case-insensitively. */
export const WORK_LABEL = 'work';

/** A project with this name (case-insensitive, trimmed) counts as Work without being marked. */
export const WORK_PROJECT_NAME = 'Work';

/**
 * The ids of every Work project: those marked in settings, those named
 * WORK_PROJECT_NAME, and every project nested under one of them (by
 * parent_id, any depth). Deleted and archived projects are left out.
 */
export function workProjectIds(snapshot: Snapshot, marked: readonly string[]): Set<string> {
  const projects = Object.values(snapshot.projects).filter((project) => !project.is_deleted && !project.is_archived);
  const markedIds = new Set(marked);
  const ids = new Set(projects.filter((project) => markedIds.has(project.id)
    || project.name.trim().toLowerCase() === WORK_PROJECT_NAME.toLowerCase()).map((project) => project.id));
  let changed = true;
  while (changed) {
    changed = false;
    for (const project of projects) {
      if (project.parent_id && ids.has(project.parent_id) && !ids.has(project.id)) {
        ids.add(project.id);
        changed = true;
      }
    }
  }
  return ids;
}

/** A task's mode: Work when its project is a Work project or it carries the work label; else Personal. */
export function itemMode(item: Item, workProjects: ReadonlySet<string>): Mode {
  return workProjects.has(item.project_id) || item.labels.some((label) => label.trim().toLowerCase() === WORK_LABEL)
    ? 'work' : 'personal';
}

/**
 * Which modes show a project in the sidebar: a Work project shows only in
 * Work; any other project shows in Personal, and also in Work while it holds
 * at least one open Work-labelled task. The Inbox shows in both.
 */
export function projectModes(project: Project, workProjects: ReadonlySet<string>, items: readonly Item[]): ReadonlySet<Mode> {
  if (project.inbox_project) return new Set<Mode>(['work', 'personal']);
  if (workProjects.has(project.id)) return new Set<Mode>(['work']);
  const modes = new Set<Mode>(['personal']);
  if (items.some((item) => item.project_id === project.id && !item.checked && !item.is_deleted
    && item.labels.some((label) => label.trim().toLowerCase() === WORK_LABEL))) modes.add('work');
  return modes;
}

/** `items` keyed by id, keeping only those in `mode`. */
export function scopeItems(items: Record<string, Item>, mode: Mode, workProjects: ReadonlySet<string>): Record<string, Item> {
  return Object.fromEntries(Object.entries(items).filter(([, item]) => itemMode(item, workProjects) === mode));
}

/** The snapshot as `mode` sees it: items scoped, projects limited to those shown in that mode (sections follow their project). */
export function scopeSnapshot(snapshot: Snapshot, mode: Mode, marked: readonly string[]): Snapshot {
  const workProjects = workProjectIds(snapshot, marked);
  const allItems = Object.values(snapshot.items);
  const projects = Object.fromEntries(Object.entries(snapshot.projects).filter(([, project]) =>
    !project.is_deleted && !project.is_archived && projectModes(project, workProjects, allItems).has(mode)));
  return {
    ...snapshot,
    items: scopeItems(snapshot.items, mode, workProjects),
    projects,
    sections: Object.fromEntries(Object.entries(snapshot.sections).filter(([, section]) => section.project_id in projects)),
  };
}

/**
 * Where a task added in `mode` goes and which labels it gets. In Work mode:
 * with no project chosen, the first Work project (marked first, then by
 * child_order) — or the Inbox if there is none — and the work label only when
 * the target project is not a Work project. In Personal mode: the chosen
 * project (or the Inbox) and no extra label.
 */
export function newTaskPlacement(
  snapshot: Snapshot,
  mode: Mode,
  marked: readonly string[],
  chosenProjectId: string | null,
): { projectId: string; addLabels: string[] } {
  const inboxId = snapshot.user?.inbox_project_id
    ?? Object.values(snapshot.projects).find((project) => project.inbox_project)?.id ?? '';
  const workProjects = workProjectIds(snapshot, marked);
  const firstWork = Object.values(snapshot.projects)
    .filter((project) => workProjects.has(project.id))
    .sort((a, b) => {
      const aMarked = marked.includes(a.id);
      const bMarked = marked.includes(b.id);
      if (aMarked !== bMarked) return aMarked ? -1 : 1;
      return a.child_order - b.child_order || a.id.localeCompare(b.id);
    })[0];
  const projectId = chosenProjectId ?? (mode === 'work' ? firstWork?.id ?? inboxId : inboxId);
  return { projectId, addLabels: mode === 'work' && !workProjects.has(projectId) ? [WORK_LABEL] : [] };
}
