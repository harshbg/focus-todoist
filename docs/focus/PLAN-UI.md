# Planning a focus block, in the app's own look — build brief

Branch: `gemini/plan-ui` (based on `gemini/formatting`). Read `AGENTS.md` first.

## What the user said

1. "The UI should be in line with the app UI." The "Plan the next block"
   dialog that opens from the task panel (`src/focus/views/PlanDialog.tsx`)
   is wrapped in `.focus-theme`, so it gets a serif headline, a cream
   background, a mono label and the native `datetime-local` input. Everywhere
   else, the app's dialogs look like `ProjectSheet` / `ShareSheet`.
2. "This planning option is not available when I am first creating a task."
   It only exists in the task panel. It must also be offered in the composer
   (`src/components/overlays/Composer.tsx`) while creating a task.

## 1. The dialog, in the app's look

- Rebuild `PlanDialog` with the app's own pieces, as
  `src/components/overlays/ProjectSheet.tsx` does:
  - `Overlay` with `size="sm"`.
  - `.sheet-head`: an `h2` in the app's type, plus the close `iconbtn`.
  - `.sheet-body`.
  - `.sheet-foot`: a `btn` "Cancel" and a `btn primary` "Schedule".
  - No `focus-theme`, no `fx-*` classes, no serif or mono, no cream.
- Fields:
  - **When:** use the app's `DateField` (`src/components/DateField.tsx`, as
    the task panel's Start date uses it), so the date picker is the app's
    own, with its time setting.
  - **Length:** use the app's `EstimateField`, prefilled with the task's
    duration or estimate if it has one, else 60 minutes.
  - **"Also add to Google Calendar":** a checkbox styled as the app's
    settings checkboxes are (look in `src/views/SettingsView.tsx`). It
    defaults to `prefs.focus.calendarDefault` and saves the choice back.
  - A short muted note under the fields (the existing `focus.planNote`).
- The scheduling logic stays in one place. Move it from `PlanForm.tsx` into a
  hook, `usePlanBlock()` in `src/focus/planBlock.ts`. It returns
  `schedule(task, start, minutes, addToCalendar)`, which does the following:
  - Opens Google Calendar synchronously, before any `await`, with
    `googleCalendarUrl` and `sidecarLink`.
  - Then calls `updateTask` with the due date-time and duration.
  - Refuses recurring tasks, as today.
  - The Focus page's `PlanForm` (which keeps its focus look, since it lives
    on the Focus page) and the new `PlanDialog` both use it.
- The task panel's "Focus block" row (`TaskDetail.tsx`, the `propbtn`)
  must look like the other property fields. Check it beside "Duration" in
  light and dark.

## 2. In the composer, while creating a task

- Add a "Google Calendar" toggle to the composer, beside its date and
  duration controls. Use the app's chip/button style there, with a calendar
  icon and an `aria-pressed` state. It defaults to
  `prefs.focus.calendarDefault`.
- It only does something when the new task has a **date with a time** (from
  the date field or typed, e.g. "tomorrow 3pm"). Without a time, show it
  disabled with a tooltip ("Give the task a time to add it to your
  calendar").
- On submit with the toggle on, there's a pop-up problem: the task id only
  exists after `await createTaskId(…)`, but browsers block pop-ups opened
  after an await. So:
  1. Before the await, open `const tab = window.open('about:blank', '_blank')`.
  2. After the id is known, set `tab.location.href = googleCalendarUrl(…)`
     with `sidecarLink(base, id, minutes)`, then `tab.opener = null`.
  3. If creation fails, `tab.close()`.
  4. Length: the task's estimate if it was given, else 60.
- Keep the Composer edit small and commented (it is an upstream file). Put
  the logic (the "can add to calendar" test, the URL) in
  `src/focus/planBlock.ts` with tests.
- Strings (en and fr) go after `'focus.planTitle'` in each file.

## Done means

`npm run lint`, `npm run typecheck`, `npm test` and `npm run build` all
pass. Commit on `gemini/plan-ui` and push that branch. **Do not push to or
merge into `focus` or `main`.**
