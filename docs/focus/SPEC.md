# Focus — design spec

A gamified deep-work timer added to Enhanced for Todoist. You pick a Todoist
task, protect a block of time for it, and the app keeps the record — in
Todoist, like everything else this app stores.

Reference: 15 screenshots of a prototype ("Focus Focus") kept outside the repo
(they contain work data). This spec is the source of truth; where it differs
from the screenshots, the spec wins.

---

## 1. Principles

1. **Todoist is the database.** No server, no new account. Every durable fact
   lives in Todoist; everything else is derived. If the app vanished, the log
   would still be readable in Todoist.
2. **Derive, never store, what can be computed.** Trophies, runs, the temple,
   the attention map — all are pure functions of the log + settings.
3. **Gentle, not punishing.** No random drops, no lost progress. A run pauses on
   weekends and marked time off; trophies never reset.
4. **Separate module.** All new code lives under `src/focus/` so the fork can
   keep merging upstream releases. Touch upstream files only to register the
   route, the sidebar entry, the settings fields and translation keys.

---

## 2. Data model

### 2.1 The focus log (durable, in Todoist)

A personal Todoist project named **`Focus log`** (created on first use; its id
remembered in settings). The app hides it from its own sidebar.

One **project comment per ISO week** (Mon–Sun, user's timezone), found by its
first line:

```
Focus log · 2026-W43 · part 1 (edited by the app, please leave as is)

{"v":1,"e":[ ...entries... ]}
```

Each entry is a compact array, oldest first:

```ts
// [start, minutes, taskId, title, lane, rating, source]
["2026-10-20T09:10", 30, "8123456789", "Causal analysis setup", "Deep Dive", 4, "t"]
```

| field   | type                | notes |
|---------|---------------------|-------|
| start   | local ISO minute    | when the block started, user's timezone, no seconds |
| minutes | integer ≥ 1         | focused minutes actually spent (pauses excluded) |
| taskId  | string \| null      | Todoist task id; null for a free-text block |
| title   | string              | snapshot of the task title, ≤ 120 chars (tasks get completed/deleted; the log must still read) |
| lane    | string \| null      | lane name at the time (see 2.3) |
| rating  | 1–5 \| null         | optional focus quality |
| source  | `"t"` \| `"m"`       | `t` = timed by the app, `m` = logged by hand ("Log past focus") |

Rules:
- A comment holds at most **12,000 characters**; when the next entry would
  overflow, start `part 2`, `part 3`… of the same week.
- Writes go through the app's existing command queue (`note_add` /
  `note_update` on `project_notes`), so they work offline and retry.
- Editing a rating or deleting an entry rewrites that week's comment.
- Read every week comment on sync; merge parts; de-duplicate on
  `start + taskId`.
- Two devices finishing blocks at once: on write, re-read the latest comment
  content from the snapshot and append, never overwrite blindly.

### 2.2 Settings (durable, in the existing settings comment)

Added to the app's `Preferences` (`src/store/prefs.ts`), so they travel in the
existing Inbox settings comment:

```ts
focus: {
  logProjectId: string | null;
  dailyTargetMin: number;      // default 240 (4 h)
  weeklyTargetMin: number;     // default 1200 (20 h)
  runThresholdMin: number;     // default 30 — minutes that keep a workday alive
  workdays: number[];          // default [1,2,3,4,5]  (Mon..Fri, ISO)
  lanes: string[];             // Todoist label names used as lanes
  blockLengths: number[];      // default [30, 60, 120]
  breakMin: number;            // default 5
  exemptDays: { date: string; kind: 'pto' | 'holiday' }[];
  taskComment: boolean;        // default false — also add a readable comment to the task
  sound: boolean;              // default true
}
```

### 2.3 Lanes = Todoist labels

A lane is a Todoist label from `focus.lanes` (default suggestions: Deep Dive,
Analysis, Planning, Communication, Documentation, Codex/ChatGPT — created on
first use if the user accepts). A task's lane is the first of its labels that
is a lane. Choosing a lane in the Focus UI **adds that label to the task** in
Todoist, so the phone app shows it too.

### 2.4 "Time required" = the task's estimate

Use the app's existing estimate machinery (`src/domain/estimates.ts`), which
already reads either a label or Todoist's native `duration`. Don't invent a new
field.

### 2.5 Running timer (device-local)

`localStorage` key `tde.focus.active`:

```ts
{ mode: 'focus' | 'unwind'; taskId: string | null; title: string; lane: string | null;
  plannedMin: number; startedAt: number /*epoch ms*/; pausedMs: number; pausedAt: number | null }
```

Remaining time is always computed from timestamps (never from an interval
counter), so a refresh, a sleep or a backgrounded tab cannot drift it. When a
focus block ends — naturally, or stopped early with ≥ 5 focused minutes — an
entry is appended to the log. Unwind blocks are never logged.

### 2.6 The task queue

The queue is **Todoist itself**: tasks due today + "anytime this week" (the
app's existing concepts), ordered as on the Week page, plus a device-local
"pinned next" list of task ids (`tde.focus.queue`) for "Add to queue". Typing a
new task name in "Add a focused piece of work" creates a real Todoist task
(today, with the chosen estimate and lane label).

---

## 3. Derived metrics (pure functions, `src/focus/domain/`)

All take `(entries, settings, now)` and are unit-tested with Vitest.

- **dayTotals / weekTotals** — minutes per local date / ISO week.
- **todayProgress** — minutes today, % of `dailyTargetMin`, minutes remaining.
- **dailyQuestPips** — 4 pips; pip *i* is lit when today ≥ (i+1) × dailyTarget/4.
- **weeklyTemple** — `blocks = floor(weekMinutes / 60)` of
  `weeklyTargetMin / 60` (20). Feeds the temple scene.
- **eligibleWorkday(date)** — weekday in `workdays` and not in `exemptDays`.
- **focusedDay(date)** — dayTotal ≥ `runThresholdMin`.
- **currentRun** — consecutive eligible workdays ending at the most recent one
  that are focused. *Today counts only once focused; an unfocused today does
  not break the run until the day is over.* Non-eligible days are skipped
  (they pause, never break).
- **longestRun** — max run over all history.
- **thisWeekWorkdays** — focused eligible days this week / eligible days so far.
- **comebacks** — number of focused eligible days preceded by ≥ 2 consecutive
  unfocused eligible days. Never decreases.
- **strongWeeks** — ISO weeks whose total ≥ `weeklyTargetMin`.
- **bestWeekMinutes** — max weekly total.
- **ratingsCount**, **brightBlocks** (rating ≥ 4), **avgQuality** (this week).
- **mainLane** — lane with most minutes this week.
- **attentionMap** — last 90 days; rows Mon–Sun; 18 columns:
  `12–2a, 2–4a, 4–6a, 6–8a`, then hourly `8a … 8p`, then `8–10p, 10p–12a`.
  A block spanning slots splits its minutes across them. Cell intensity in 4
  steps (quiet → strong) by quantile of non-zero cells.
- **bestWindow** — the cell with most minutes (`Thu · 12–1p`, `1h 18m`).
- **cadence7** — minutes per day for the last 7 days.
- **calmCadence** — focused days in the last 14 days (`8 / 14 days`).
- **footprint30** — per day for 30 days, `ceil(minutes / 30)` blocks, capped at
  16 per column.
- **yearGrid** — 52 weeks × workdays: `focused | pto | holiday | none | future`.
- **weeklyMomentum** — 52 weeks, intensity = focused days that week (0–5).

---

## 4. Trophies (39), `src/focus/domain/trophies.ts`

Tiers, in order: Bronze, Silver, Gold, Platinum, Palladium, Rhodium, Iridium,
Osmium. Each trophy: `{ id, tier, title, blurb, metric, goal }`; progress =
`min(metric / goal, 1)`; card shows `tier · N% to go` or `tier · unlocked`.

| family | goals (tier) | metric | blurb |
|---|---|---|---|
| Sessions | **First Stone** 1 (Bronze), 10 (Bronze), 25 (Silver), 50 (Gold), 100 (Palladium), 250 (Rhodium), 500 (Iridium), 1000 (Osmium) | completed blocks | "Completed focus sessions, no matter how long the path took." |
| Lifetime hours | 25 (Bronze), 50 (Silver), 100 (Silver), 200 (Gold), 500 (Gold), 1,000 (Platinum), 2,000 (Platinum), 3,000 (Palladium), 4,000 (Palladium), 5,000 (Rhodium), 6,000 (Rhodium), 7,000 (Iridium), 8,000 (Iridium), 9,000 (Osmium), **10,000 Hour Holy Grail** (Osmium) | total hours | "Lifetime deep work, built one protected block at a time." |
| Big weeks | **First 20h Week** (Gold, best week / weekly target), **40h Focus Week** (Palladium, best week / 2400 min) | bestWeekMinutes | "Your first 20-hour deep-work week." / "A 40-hour focus week — the summit, not a new daily expectation." |
| Strong weeks | 3 (Bronze), 12 (Gold), 25 (Rhodium), 52 (Osmium) | strongWeeks | "Weeks where you met the 20-hour focus target." |
| Bright blocks | 10 (Bronze), 25 (Gold), 100 (Rhodium), 250 (Osmium) | brightBlocks | "Four- or five-star sessions you chose to rate." |
| Ratings | 10 (Bronze), 50 (Palladium), 200 (Osmium) | ratingsCount | "Optional quality check-ins that sharpen your pattern." |
| Comebacks | 5 (Bronze), 25 (Palladium), 100 (Osmium) | comebacks | "Comebacks after a pause. These never reset." |

**Next up** strip: the three locked trophies with the highest progress.

**Current world**: a pixel scene that gains one permanent detail per unlocked
trophy (39 details: stone, path, sapling, tree, bench, well, hut, lantern,
flowers, fence, pond, bridge, temple steps, …, up to a lit temple for the Holy
Grail). Title by count: 0 "A clearing is waiting.", 1–4 "A path is forming.",
5–12 "A village takes root.", 13–25 "A town hums.", 26–38 "A city of focus.",
39 "The temple is lit."

---

## 5. Pages

Two routes, added to `useRoute.ts` and the sidebar:

- `#/focus` — **Focus**: the work surface.
- `#/progress` — **Progress**: the reflection surface.

Plus a floating **sidecar** (5.3).

### 5.1 Focus (`#/focus`)

1. **Hero** — "Deep Work" serif title, Cal Newport quote ("The ability to
   concentrate intensely is a skill that must be trained."), and the **Today's
   progress** card: big minutes, progress bar, "3 hrs 30 min remaining until
   your 4-hour deep-work target", daily-quest pips.
2. **Timer** (left, wide)
   - Focus / Unwind segmented control; eyebrow "ONE THING. NO RUSH."
   - Block length chips from `blockLengths`.
   - **Pixel scene**: sky, clouds, two pixel trees, brick ground, a pyramid
     that **builds brick by brick as the block progresses** (bricks =
     elapsed/planned × total), the timer in a pixel box top-right, daily quest
     top-left.
   - Start / Pause / Resume / Stop. Stop with < 5 minutes asks "Discard this
     block?".
   - **Block complete** card: ✓ "Block logged · <task>", optional 5-star
     "How did that block feel?", "Continue same task" 30 min / 1 hr / 2 hrs,
     **New task**, **Take 5 min** (starts Unwind). Fireworks pixel animation
     on completion (respect `prefers-reduced-motion`).
   - Footer links: "Open sidecar", hint row "30 min focus · 5 min reset ·
     Nothing gets blocked".
3. **Task queue** (right rail) — "Choose what's next."
   - Task field "Add a focused piece of work" (search existing Todoist tasks as
     you type; Enter on no match creates one).
   - Time required chips (sets the estimate), Lane chips (sets the label).
   - **Start task** / **+ Add to queue**.
   - "Ready when you are" list: task, estimate · lane, ▶ start, × remove from
     queue (does not touch the Todoist task). Count badge.
4. **Current focus** strip — task name + lane chips (editable while running).
5. **Attention trail** — "Your attention trail." Recent 20 entries: title,
   lane · date, minutes · rating★. Row menu: edit rating, edit minutes, delete.
   Button **Log past focus** (dialog: task, lane, date, start time, minutes).

### 5.2 Progress (`#/progress`)

Sections in this order, each with red eyebrow + serif headline:

1. **WEEKLY TEMPLE — "Your focus raises a temple."** Hours this week of target
   (`30m of 20 hr target`), pixel temple built from 20 blocks (one per hour),
   `n / 20` counter, small caption card bottom-right. *Must render an empty
   foundation + ghosted outline at 0 — the prototype showed a blank sky.*
2. **YOUR RHYTHM — "Small signals, useful insight."** Cards: Weekly progress %,
   Your main lane, Seven-day cadence (bars, hover for minutes).
3. **WEEKLY RECAP** card: total, blocks · return days, "<lane> has held your
   attention this week.", calm cadence, best window, quality avg.
4. **ATTENTION MAP — "When deep work actually clicks."** 7 × 18 heatmap, green
   scale, legend quiet → strong, Best window panel. Caption "LAST 90 DAYS ·
   1H DAY / 2H NIGHT".
5. **FOCUS RUN — "Protect the return."** Copy: "Thirty focused minutes keeps a
   workday alive. Weekends and marked time off pause the run." Cards: Current
   run, Longest run, This week. Year grid (workdays only) with legend Focused /
   PTO / Holiday. Weekly momentum strip (52). **Excuse a workday**: date,
   PTO | Holiday, **Mark exempt**; **Marked time off** chips with ×.
6. **PIXEL FOOTPRINT — "Thirty days of focus."** 30 columns of stacked bricks,
   "1 block = 30 min", recent logs line.
7. **TROPHY CABINET — "Your world grows with real focus."** `n / 39 unlocked`,
   Current world panel (scene + title + "Every earned trophy adds a permanent
   pixel-world detail. No random drops, no streak loss — just a visible record
   of returned attention." + Next up), then the trophy grid (5 columns desktop,
   2 on phone). Unlocked cards: warm tint, solid tier icon, full bar.
8. **GENTLE GUIDANCE — "Make returning easier."** (opt-in)
   - Reminder settings: Scheduled start alerts; One gentle restart (offer a
     30 min return after a missed planned block — once); Weekly insight prompt
     (Monday).
   - **Plan the next block**: date-time + length → **sets the Todoist task's
     due date-time and duration**, so it lands on Todoist's calendar and
     Todoist's own reminders fire on the phone. "Your next returns" lists the
     planned ones.
   - Browser notifications only while the app is open; say so plainly.

### 5.3 Sidecar

"Open sidecar" opens a compact always-on-top window using the **Document
Picture-in-Picture API** (Chrome/Edge); elsewhere it falls back to
`window.open('#/focus?sidecar=1', …, 'width=420,height=720')`. The sidecar
shows: timer, pixel scene with daily quest, block-complete card, task + lane,
queue. It shares state with the main tab via `localStorage` events /
`BroadcastChannel('tde-focus')`.

---

## 6. Visual system

Scoped under `.focus-theme` so the rest of the app is untouched.

- **Paper**: background `#f4f1ea`, card `#efebe3`, inset `#e9e4da`,
  hairlines `#d9d3c7`.
- **Ink**: text `#1f1d1a`, muted `#6f6a62`.
- **Rust** (primary actions, eyebrows): `#a8402e`, hover `#8f3424`.
- **Navy** (selected chip, frames, shadows): `#1e2a36`.
- **Cream** (secondary buttons): `#f3e9d2`, border `#d8c9a6`.
- **Green** (heatmap / focused): `#dfe6d8 → #a9c19c → #6f9a62 → #3f6e3a`.
- **Pixel palette**: sky `#a9c9e3`, cloud `#f4f4f0`, brick `#e08a3c / #f2b55a /
  #c95f2a`, mortar `#7a3b1a`, leaf `#3e8a3a / #2c6b2a`, trunk `#6b3d1e`.
- **Type** (self-hosted — the CSP is `font-src 'self'`, use `@fontsource`):
  - Headlines: *Newsreader* (or *Instrument Serif*), 48–64px, letter-spacing
    −0.03em.
  - Eyebrows & small labels: *IBM Plex Mono*, 10–11px, uppercase,
    letter-spacing 0.14em, rust.
  - Pixel UI (timer digits, DAILY QUEST): *Silkscreen* or *Press Start 2P*.
  - Body: the app's existing sans.
- **Frames**: pixel panels get a 4px navy border + 6px hard offset shadow, no
  radius. Cards elsewhere: 2px radius, hairline border.
- **Pixel art**: SVG `<rect>` grids from small arrays, `shape-rendering:
  crispEdges`; no raster images.
- **Dark mode**: "night paper" — background `#1b1a17`, card `#24221e`, ink
  `#ece6da`; pixel scene switches to dusk sky `#3a4a66`.
- Phone: single column, timer first, queue below.

---

## 7. i18n

English and French, like the rest of the app (`src/i18n/en.ts`, `fr.ts`), keys
prefixed `focus.`.

---

## 8. Tests

- Vitest for every function in `src/focus/domain/` (runs across weekends and
  exempt days; DST weeks; comment rollover at 12,000 chars; slot splitting;
  trophy thresholds).
- Demo mode gets ~90 days of generated focus history so every section renders
  in demo and in Playwright.
- Playwright journey: start a 30-min block in demo with a fake clock, finish,
  rate 4★, see it in the trail and in the Progress page.

---

## 9. Work packages (for the build agents)

1. `src/focus/domain/log.ts` — parse/serialise week comments, rollover, merge.
2. `src/focus/domain/metrics.ts` — section 3.
3. `src/focus/domain/trophies.ts` — section 4.
4. `src/focus/store.ts` — active timer, queue, write-through to Todoist.
5. `src/focus/pixel/` — scene, pyramid, temple, footprint bricks, world
   details, fireworks (SVG components).
6. `src/focus/views/FocusView.tsx` + components.
7. `src/focus/views/ProgressView.tsx` + components.
8. Sidecar (Document PiP + fallback).
9. Settings, route, sidebar, i18n wiring, demo data, e2e.

---

## 10. Changes after the first review (2026-10-20)

### 10.1 The log lives on the Inbox, not in its own project

The account is on Todoist Free, which allows 5 active personal projects, and
it already has 5. A "Focus log" project would not fit. The log's weekly
comments therefore sit on the **Inbox** (which never counts against the
limit), next to the settings comment, told apart by their `Focus log ·` first
line. `focusLogProject` returns the Inbox; `planLogWrite` never adds a project.

### 10.2 Work / Personal mode (all features free)

A switch at the top of the app: **Work** or **Personal**. It works like a
filter over the whole app, built on Todoist's own labels (free on every plan),
so nothing costs a project slot:

- A task is **Work** when it has the `work` label, or sits in a project the
  user marked as Work in Settings (optional, so a whole project needs no
  tagging). Everything else is **Personal**.
- In Work mode, every view (Week, Today, Inbox, projects, search, the matrix,
  the focus pages) shows only Work tasks; the sidebar shows only projects that
  are marked Work or hold Work tasks. Personal mode is the mirror image.
- A task added in Work mode gets the `work` label automatically (and lands in
  the default Work project if one is set). Added in Personal mode, it gets
  none.
- Focus entries record their mode (an optional 8th field `"w"` / `"p"` in the
  compact row; rows without it read as Personal), so tracking, targets,
  streaks and trophies are per mode. Each mode has its own targets, workdays
  and lanes: Work defaults to 4 h a day / 20 h a week on Mon–Fri with
  PTO/holidays; Personal defaults to 1 h a day / 5 h a week, every day.
- The current mode is remembered per device; the mode settings travel in the
  settings comment.
