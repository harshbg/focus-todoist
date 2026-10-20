# Work / Personal mode — the `src/focus/domain/mode.ts` contract

Create `src/focus/domain/mode.ts` with exactly these exports; the doc comments are the rules.

```ts
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
  throw new Error('not implemented');
}

/** A task's mode: Work when its project is a Work project or it carries the work label; else Personal. */
export function itemMode(item: Item, workProjects: ReadonlySet<string>): Mode {
  throw new Error('not implemented');
}

/**
 * Which modes show a project in the sidebar: a Work project shows only in
 * Work; any other project shows in Personal, and also in Work while it holds
 * at least one open Work-labelled task. The Inbox shows in both.
 */
export function projectModes(project: Project, workProjects: ReadonlySet<string>, items: readonly Item[]): ReadonlySet<Mode> {
  throw new Error('not implemented');
}

/** `items` keyed by id, keeping only those in `mode`. */
export function scopeItems(items: Record<string, Item>, mode: Mode, workProjects: ReadonlySet<string>): Record<string, Item> {
  throw new Error('not implemented');
}

/** The snapshot as `mode` sees it: items scoped, projects limited to those shown in that mode (sections follow their project). */
export function scopeSnapshot(snapshot: Snapshot, mode: Mode, marked: readonly string[]): Snapshot {
  throw new Error('not implemented');
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
  throw new Error('not implemented');
}
```
