# Task name formatting — build brief

Branch: `gemini/formatting` (this branch). Read `AGENTS.md` first.

## What the user wants

1. **Bold and italic** in task names, easy to apply.
2. **A colour** for a task's name, shown **only in this app** (not in Todoist).

## 1. Bold and italic (stored in Todoist, so Todoist shows them too)

Todoist task names already support Markdown `**bold**` and `*italic*`, and the
app already renders them in rows and the task panel (`renderTitle` in
`src/domain/markdown.ts`). Build:

- **Shortcuts in the name field** (`src/components/TaskNameField.tsx`, and the
  composer's name field if it is a different component): Cmd/Ctrl+B wraps the
  selection in `**…**` and Cmd/Ctrl+I in `*…*`. Pressing it again on an
  already wrapped selection unwraps it. With no selection, insert the pair and
  put the caret between. Put the text logic in a pure function,
  `toggleWrap(text, start, end, marker): { text, start, end }`, in
  `src/domain/markdown.ts`, with tests (wrap, unwrap, empty selection,
  selection that already includes the markers, `*` inside `**`).
- **The focus pages and the sidecar** show raw `**` today. Wherever
  `src/focus/` prints a task title (the queue, the trail, the current band,
  TaskSearch rows, the sidecar's title and running line, the Progress page),
  render it with `renderTitle` (HTML, via `dangerouslySetInnerHTML` as
  TaskRow does), or `plainTitle` where only text fits (aria-labels, the
  `title` attribute, the Google Calendar event text, the log entry's title).
- Keep upstream edits small and commented.

## 2. Colour, this app only

- Stored in the focus preferences, which already sync between devices
  through the settings comment in the Inbox: add
  `taskColors: Record<string, TaskColor>` to `FocusPreferences` in
  `src/focus/domain/types.ts`. The default is `{}`. Read it in
  `readFocusPreferences` (settings.ts): keep only non-empty string ids and
  known colours, and keep at most 300 entries. Add tests.
- `TaskColor` is one of `'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple'`.
  The CSS tokens `--task-color-<name>` go in `src/focus/views/focus.css`, with
  light and dark values. Pick readable text colours, not neon, with at least
  4.5:1 contrast on the app's light and dark backgrounds.
- **Setting it:** a "Colour" row in the task panel's right column
  (`TaskDetail.tsx`, next to the "Focus block" row that is already there). It
  shows six swatches and a "none" option. Choosing one calls
  `setFocusPreferences({ taskColors: … })`.
- **Showing it:** a task name with a colour gets `style={{ color: 'var(--task-color-<name>)' }}`
  everywhere the name is drawn: TaskRow, the task panel title, TimePanel, the
  focus queue and TaskSearch. One small hook, e.g. `useTaskColor(id)` in
  `src/focus/taskColors.ts`, so each upstream file changes by about one line.
- **Cleanup:** when the snapshot no longer has a task, or the task is
  completed, its entry is dropped the next time preferences are written. This
  is a pure function `pruneTaskColors(colors, snapshot)` with a test, called
  wherever the colour is set.
- Strings (en and fr) go after `'focus.planTitle'` in each file.

## Done means

`npm run lint`, `npm run typecheck`, `npm test` and `npm run build` all pass.
Commit on `gemini/formatting` and push that branch. **Do not merge into
`focus`. Do not push to `focus` or `main`**: the user is validating the live
site.
