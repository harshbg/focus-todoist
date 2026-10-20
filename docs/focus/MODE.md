# Work / Personal mode — build brief (SPEC §10.2)

The account (Todoist Free) has a project named **Work**; everything else is
personal. The mode is a filter over the whole app, built only on Todoist's own
projects and the `work` label. Two Codex jobs, in order.

## Job M1 — rules and data (no UI)

1. Create `src/focus/domain/mode.ts` from `docs/focus/mode.contract.ts` (its exports and doc comments are the contract) with
   `mode.test.ts`.
2. Focus entries carry their mode:
   - `FocusEntry.mode: Mode` in `src/focus/domain/types.ts`.
   - `log.ts`: the compact row gets an optional 8th field, `"w"` or `"p"`.
     `writeLogComments` always writes it; `readLogComment` accepts 7- and
     8-element rows, and a 7-element row reads as `'personal'`. Update
     log.test.ts (both lengths round-trip; a bad 8th value skips the row).
   - `timer.ts`: `ActiveBlock` gets `focusMode: Mode` (named so it doesn't
     clash with `mode: 'focus' | 'unwind'`), `startBlock` takes it,
     `blockEntry` copies it to the entry, `readActiveBlock` rejects a block
     without a valid one.
   - `demo.ts`: each demo entry's mode follows its task (`itemMode`) — the demo
     has no Work project, so give the demo snapshot's "Website" project the
     name-independent mark by passing its id as marked in the demo, or simply
     label two demo tasks `work`, whichever is smaller. Keep the demo test passing.
3. Preferences (`FocusPreferences` in types.ts + `readFocusPreferences`):
   - `workProjectIds: string[]` (default `[]`; non-empty strings, de-duplicated).
   - `personal: { dailyTargetMin; weeklyTargetMin; runThresholdMin; workdays; lanes }`
     with defaults 60 / 300 / 15 / [1..7] / ['Reading', 'Learning', 'Writing',
     'Health', 'Home'], validated with the same ranges as the work ones.
   - The existing top-level targets, workdays and lanes are Work's.
   - `settingsFor(prefs, mode): FocusSettings & { lanes: string[] }` in
     settings.ts (exempt days apply to both modes).
4. `src/focus/mode-store.ts`: `useMode(): Mode`, `setMode(mode)`, kept in
   localStorage `tde.mode` (try/catch; default `'work'`), shared across tabs
   via the `storage` event.
5. Tests for everything pure. All checks green.

## Job M2 — wiring (keep upstream edits small and commented)

1. **A Work | Personal switch** (`src/focus/views/ModeSwitch.tsx`, a segmented
   control) at the top of the sidebar, under the account header, and in the
   phone header. Its styles go in `src/focus/views/mode.css` using the app's
   own tokens (`--accent`, `--border`, …), not the focus-theme ones, since it
   sits in the app chrome.
2. **Every task list follows the mode**: in `src/hooks/useData.ts`, scope the
   items with `scopeItems` before the existing filters (one small edit). Then
   find every view or component that reads `snapshot.items` directly to list
   or count tasks (search, the matrix, review, insights, calendar, sidebar
   counts, the command palette…) and route it through the same scoping —
   prefer one shared helper over many edits.
3. **The sidebar** shows only the projects `projectModes` allows for the
   current mode (`projectTree` input scoped with `scopeSnapshot`).
4. **New tasks** (the composer / quick add, and the Focus page's "add a
   focused piece of work") use `newTaskPlacement` for the default project and
   the extra label.
5. **Focus and Progress pages**: the queue and task search only offer tasks of
   the current mode; a started block records the current mode; the trail,
   today's progress, the temple and every Progress metric use only the
   entries of the current mode and `settingsFor(prefs, mode)`; lanes offered
   are that mode's lanes.
6. **Settings**: a "Work & Personal" section — the top-level projects with a
   "Work" checkbox each (projects named Work show checked and can't be
   unticked), and the Personal targets (daily, weekly, run threshold,
   workdays) and lanes.
7. Strings in en.ts and fr.ts. Unit tests for any new pure helper; update
   tests and e2e minimally. All checks green, `npx playwright test` too.
