# More calendars: Outlook.com and Microsoft 365, several at once — build brief

Branch: `gemini/calendars` off `focus`. Read `AGENTS.md`, then the current
Google Calendar code: `src/focus/domain/calendar.ts` (+ test),
`src/focus/planBlock.ts`, `src/focus/views/PlanForm.tsx`,
`src/focus/views/PlanDialog.tsx`, and the calendar chip in
`src/components/overlays/Composer.tsx` (search `fx-calchip`).

## What the user wants

Planning a focus block can add it to Google Calendar today. Add **Outlook.com**
(personal Microsoft accounts) and **Outlook for work or school** (Microsoft
365), and let the user pick **any combination** of the three.

## 1. Event links (pure, in `src/focus/domain/calendar.ts`, with tests)

- `type CalendarId = 'google' | 'outlook' | 'office365'`.
- `calendarUrl(id, { title, start /* yyyy-MM-ddTHH:mm, floating local */, minutes, link })`:
  - `google`: the existing `googleCalendarUrl` (keep it).
  - `outlook`: `https://outlook.live.com/calendar/0/deeplink/compose?path=%2Fcalendar%2Faction%2Fcompose&rru=addevent&subject=…&startdt=…&enddt=…&body=…`
  - `office365`: the same query on `https://outlook.office.com/calendar/0/deeplink/compose`.
  - For both Outlook links, `startdt`/`enddt` are ISO 8601 **with the
    browser's UTC offset for that date** (e.g. `2026-11-12T15:00:00-08:00`;
    use date-fns `format(date, "yyyy-MM-dd'T'HH:mm:ssXXX")` on the local
    Date), so the event lands at the right time whatever the calendar's
    time zone. `subject` is `Focus: <title>`, `body` the same text and
    sidecar link as Google's `details`.
  - Test: encoding, an end crossing midnight, and the offset in the
    `startdt` (build the expected value from the same local Date in the
    test, so it passes in any time zone).
- `CALENDARS: CalendarId[] = ['google', 'outlook', 'office365']`, in that order.

## 2. Preferences

- In `FocusPreferences` (`src/focus/domain/types.ts`), replace
  `calendarDefault: boolean` with `calendars: CalendarId[]` (default `[]`).
- `readFocusPreferences`: keep only known ids, without duplicates, in CALENDARS
  order. **Migration:** a stored `calendarDefault: true` with no
  `calendars` reads as `['google']`. Add tests.
- Update every use of `calendarDefault`.

## 3. Opening several (browsers allow one new tab per click)

- In `src/focus/planBlock.ts`, keep the existing rule of opening the
  first tab synchronously, before any `await`. With several calendars
  chosen, open **only the first** in a new tab (CALENDARS order). Then show
  the others as follow-up buttons, so each opens from its own click.
- The follow-up is a small component, `src/focus/views/MoreCalendars.tsx`.
  It shows a line of buttons, "Add to Outlook.com" and "Add to Outlook
  (work)", plus a "Done" that closes it.
  - It appears in the plan dialog / plan form after Schedule, instead of
    closing right away (close it when the user is done).
  - After a composer submit, it appears as a toast with those buttons. Use
    the app's toast if it supports actions (look at
    `useStore.getState().toast`). Otherwise use a small fixed panel at the
    bottom right in the app's style.
- The composer opens its first tab before `await createTaskId` and sets its
  URL once the id exists, as now. That stays as it is, for the first
  calendar only.

## 4. UI

- **Plan dialog** (`PlanDialog.tsx`, app look): replace the one checkbox with
  three, under a small label "Add to calendar":
  - "Google Calendar"
  - "Outlook.com"
  - "Outlook (work or school)"

  Ticking saves `calendars` at once, as the checkbox does now.
- **Focus page plan form** (`PlanForm.tsx`, focus look): the same three checkboxes.
- **Composer chip**: keep one chip.
  - Off: "+ Calendar".
  - On: the chosen calendars' short names, e.g. "Google + Outlook".
  - Clicking it opens a small popover (reuse the app's `popover` /
    `rowmenu` styles) with the three checkboxes. It is on when at least one
    calendar is ticked.
  - It stays disabled without a time, as now.
- Strings in `en.ts` and `fr.ts`, after `'focus.planCalendarAdd'`. In French:
  "Google Agenda", "Outlook.com", "Outlook (travail ou école)",
  "Ajouter à l’agenda".

## Done means

`npm run lint`, `npm run typecheck`, `npm test`, `npm run build` all
pass. Commit on `gemini/calendars` and push that branch. **Do not merge
into or push to `focus` or `main`.** No images.
