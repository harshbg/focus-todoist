# Focus blocks on Google Calendar — build brief

Branch: `gemini/calendar` off `focus`. Read `AGENTS.md` and SPEC §5.2 #8 first.

## What the user wants

Planning a focus block gives a Todoist task a start time and a length (this
already works: `src/focus/views/PlanBlock.tsx`). Now:

1. A checkbox **"Also add to Google Calendar"** next to "Schedule focus". It
   is optional; scheduling works the same without it. Remember the last choice
   in focus preferences (`calendarDefault: boolean`, default `false`, read in
   `readFocusPreferences` like the other booleans, with a test).
2. When it is ticked, scheduling also opens Google Calendar's own "new event"
   page, filled in, in a new tab, so the user saves the event there. **No
   Google API, no OAuth, no keys**: use the public event-template URL:
   `https://calendar.google.com/calendar/render?action=TEMPLATE&text=…&dates=START/END&details=…`
   - `text`: `Focus: <task title>`.
   - `dates`: floating local times `yyyyMMddTHHmmss/yyyyMMddTHHmmss` (no `Z`, so
     Google reads them in the calendar's own time zone), end = start + length.
   - `details`: a line inviting to start the block and the **sidecar link**:
     `<origin><pathname>#/sidecar?task=<taskId>&min=<minutes>`. Clicking it opens
     the sidecar page with that task ready to start. (Claude is building the
     sidecar page and will read `task` and `min`; do not touch
     `src/focus/views/Sidecar.tsx` or `src/focus/pixel/`.)
   - Open it with `window.open(url, '_blank', 'noopener')` in the click handler
     itself, before any `await`, or the browser blocks the pop-up. Then
     update the task.
3. **From the task itself**: the task panel's ⋯ menu
   (`src/components/overlays/TaskDetail.tsx`, the `popover rowmenu` around line
   727) gets one entry, **"Plan a focus block…"**, that opens a small dialog
   with the same form (when, length chips, the calendar checkbox), the task
   already chosen. Extract the form from `PlanBlock.tsx` into a shared component
   (e.g. `src/focus/views/PlanForm.tsx`) rather than copying it. Keep the
   TaskDetail edit to a few lines with a short comment (it is an upstream file).
   Recurring tasks keep refusing, as now.

## Code

- Pure helpers in `src/focus/domain/calendar.ts` with `calendar.test.ts`:
  `sidecarLink(base: string, taskId: string, minutes: number): string` and
  `googleCalendarUrl(input: { title: string; start: string /* yyyy-MM-ddTHH:mm */; minutes: number; link: string }): string`.
  Test encoding (spaces, `&`, accents), the end time crossing midnight, and the
  exact `dates` format.
- Strings in `src/i18n/en.ts` and `fr.ts`: add yours right after the
  `'focus.reminderNote'` line in each file.
- CSS in `src/focus/views/focus.css`, appended at the end, using the `--fx-*`
  tokens.

## Done means

`npm run lint`, `npm run typecheck`, `npm test`, `npm run build` all pass.
Commit on `gemini/calendar` and push it. Do not merge into `focus`.
