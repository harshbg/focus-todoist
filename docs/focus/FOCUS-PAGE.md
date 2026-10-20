# Focus page — build brief (SPEC §5.1)

The first usable surface: pick a Todoist task, run a block, see it logged.
Two agents build it at the same time against the class contract below:
**Codex** writes the markup, data and wiring; **Gemini** writes the CSS.

## 1. Wiring (Codex) — keep upstream edits tiny

- `src/domain/types.ts`: add `'focus'` and `'progress'` to `ViewId`.
- `src/hooks/useRoute.ts`: add both to the `known` list.
- `src/App.tsx`: render `<FocusView onOpen={openTask} />` for `focus` and
  `<ProgressView />` for `progress` (ProgressView is a placeholder for now:
  the hero title "Progress" and "Coming next." — it is built in a later round).
- `src/domain/sidebar.ts`: add `'focus'` and `'progress'` to `SIDEBAR_ITEMS`,
  and put them first in the `OTHER` default block. `readSidebarNav` already
  puts missing entries back, so existing accounts get them too.
- `src/components/Sidebar.tsx`: two `navEntry` cases using existing icons
  (look in `src/components/Icon.tsx`; e.g. a clock/timer-like one for Focus,
  `trend` or similar for Progress).
- i18n: every string through `useT`, keys prefixed `focus.` / `nav.focus` /
  `nav.progress`, in **both** `src/i18n/en.ts` and `src/i18n/fr.ts`.

## 2. FocusView (Codex) — `src/focus/views/FocusView.tsx` + small components beside it

Data comes only from: `useStore` (snapshot, prefs, actions), `useFocusStore`,
`useFocusLog`, `useFocusPreferences`, `useFocusNow` (src/focus/store.ts), and
the pure functions in `src/focus/domain/*`. Reuse the app's own helpers for
tasks (look at how `src/views/WeekView.tsx` and `src/hooks/useData.ts` pick
today's and this week's tasks, `src/domain/estimates.ts` for estimates, and
the store's existing task actions to create a task, set an estimate, add a
label). Never call the Todoist API directly.

Sections, top to bottom (markup uses the classes in §3):

1. **Hero** — "Deep Work" title, the Cal Newport quote with cite, and the
   **Today's progress** card: minutes today (`todayProgress`), a bar, "3 hrs 30
   min remaining until your 4-hour deep-work target" (or "Target reached." at
   100%), and the daily-quest pips.
2. **Timer card** (left column)
   - Focus / Unwind segmented control; eyebrow "ONE THING. NO RUSH."
   - Block length chips from `prefs.focus.blockLengths`.
   - `<FocusScene>` (src/focus/pixel) with `progress` = elapsed / planned,
     `time` = `formatClock(remainingMs)`, the quest props, `celebrating` while
     the block-complete card shows.
   - Buttons: Start (when idle, needs a task or a typed title) / Pause /
     Resume / Stop. Stop under `MIN_LOGGED_MINUTES` asks "Discard this block?"
     (use the app's existing confirm overlay if one fits, else `window.confirm`).
   - **Block complete** card when `justLogged` is set: ✓ "Block logged" + title,
     5-star rating (click again to clear) calling `rate`, "Continue same task"
     with the block lengths, **New task** (dismiss), **Take 5 min** (starts
     Unwind with `prefs.focus.breakMin`).
   - Hint row: "Open sidecar" (disabled placeholder for now) · "30 min focus ·
     5 min reset · Nothing gets blocked".
3. **Task queue** (right rail) — "Choose what's next."
   - A field "Add a focused piece of work" that searches open Todoist tasks as
     you type (title contains, case-insensitive, max 8 suggestions); picking one
     selects it; Enter with no match creates a real Todoist task due today with
     the chosen estimate and lane label.
   - Time required chips (set the selected task's estimate), Lane chips from
     `prefs.focus.lanes` (add that label to the selected task, removing other
     lane labels).
   - **Start task** / **+ Add to queue**.
   - "Ready when you are": the device-local queue (`localStorage`
     `tde.focus.queue`, an array of task ids; wrap in try/catch), then — when
     the queue is short — today's tasks and this week's anytime tasks as
     suggestions. Each row: title, `estimate · lane`, ▶ start, × remove from
     queue. Count badge.
4. **Current focus** strip — while a block runs: the task title and its lane chips.
5. **Attention trail** — "Your attention trail." The 20 latest log entries:
   title, `lane · date`, `minutes · rating★`. Row actions: change rating,
   delete (confirm). Button **Log past focus** opens a small dialog: task (same
   search field), lane, date, start time, minutes → `logManual`.

Clicking a task title anywhere calls `onOpen(taskId)` (opens the app's task detail).

## 3. Class contract (shared by Codex and Gemini)

Root: `<div class="focus-theme fx-page">`. Everything below is inside it.

| class | what |
|---|---|
| `fx-hero`, `fx-hero-title`, `fx-quote`, `fx-quote-cite` | hero block |
| `fx-today` (card), `fx-today-minutes`, `fx-today-unit`, `fx-bar` > `span` (width = %), `fx-today-note` | today's progress card |
| `fx-quest`, `fx-pips` > `i` (`.is-on` when lit) | small daily-quest row |
| `fx-grid` | two columns: main (`fx-main`) + rail (`fx-rail`); one column under 900px |
| `fx-card` | a plain card |
| `fx-eyebrow` | small red uppercase mono label |
| `fx-h2` | serif section headline |
| `fx-seg` > `button[aria-pressed]` | segmented control |
| `fx-chips` > `button.fx-chip[aria-pressed]` | chip row |
| `fx-actions` | a row of buttons |
| `fx-btn`, `fx-btn--primary` (rust), `fx-btn--secondary` (cream), `fx-btn--ghost` | buttons |
| `fx-complete`, `fx-stars` > `button.fx-star[aria-pressed]` | block-complete card |
| `fx-hint` | the small hint row |
| `fx-field` (wraps `input`), `fx-label` (mono field label), `fx-suggest` > `li` (`.is-active`) | task search |
| `fx-queue`, `fx-queue-item`, `fx-queue-title`, `fx-queue-meta`, `fx-icon-btn`, `fx-badge` | queue list |
| `fx-current` | current-focus strip |
| `fx-section`, `fx-section-head` (eyebrow + `fx-h2` on the left, an aside on the right) | page sections |
| `fx-trail`, `fx-trail-item`, `fx-trail-title`, `fx-trail-meta`, `fx-trail-mins` | attention trail |
| `fx-dialog`, `fx-form-row` | the Log past focus dialog |

## 4. CSS (Gemini) — `src/focus/views/focus.css`

Imported by FocusView (`import './focus.css';`). Visual system from SPEC §6:
paper background `#f4f1ea`, cards `#efebe3` with hairline `#d9d3c7` and 2px
radius, ink `#1f1d1a` / muted `#6f6a62`, rust `#a8402e` (hover `#8f3424`) for
primary buttons and eyebrows, navy `#1e2a36` for selected chips and segmented
buttons (white text), cream `#f3e9d2` / border `#d8c9a6` for secondary
buttons. Headlines: `var(--fx-serif, "Newsreader", "Instrument Serif",
Georgia, serif)`, 48–64px for the hero, 36–44px for `fx-h2`, letter-spacing
−0.03em, weight 400. Eyebrows and labels: `var(--fx-mono, "IBM Plex Mono",
ui-monospace, monospace)`, 10–11px, uppercase, letter-spacing .14em. Body:
inherit the app's sans. Generous whitespace like an editorial page; max width
about 1200px, centred. The quote has a 3px rust left border. The today card
uses the pixel-panel look (4px navy border, 6px hard offset shadow). Dark mode
under `:root[data-theme="dark"] .focus-theme`: background `#1b1a17`, cards
`#24221e`, hairlines `#3a3631`, ink `#ece6da`, muted `#a39b8e`; rust and navy
stay but selected chips become `#ece6da` on `#1b1a17`. Focus-visible outlines
on every control. Phone (< 600px): 16px side padding, hero title 40px,
no horizontal scroll.
