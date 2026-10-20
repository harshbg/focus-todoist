# Progress page — build brief (SPEC §5.2)

Replaces the placeholder `src/focus/views/ProgressView.tsx`. Same split as the
Focus page: **Codex** writes the markup and data, **Gemini** writes the CSS.

## 1. Data (Codex)

Only from `useFocusLog`, `useFocusPreferences`, `setFocusPreferences`
(src/focus/store.ts) and the pure functions in `src/focus/domain/metrics.ts`
and `trophies.ts` — everything is derived from the log; nothing new is stored
except exempt days, which go through `setFocusPreferences({ exemptDays })`.
Compute with `now = new Date()` once per render (a `useMemo` on the log,
prefs and the current day). Pixel components come from `src/focus/pixel/`.
All strings through `useT`, keys under `progress.` in en.ts and fr.ts.

## 2. Sections, in order (SPEC §5.2 has the copy)

1. **Weekly temple** — eyebrow "WEEKLY TEMPLE", h2 "Your focus raises a
   temple.", aside: big hours this week + "of 20 hr target". `<TempleScene>`
   from `weeklyTemple`.
2. **Your rhythm** — h2 "Small signals, useful insight." Three cards: Weekly
   progress (% of target, "30 min logged toward 20 hours."), Your main lane
   (`mainLane`, "Where your protected attention went." — "No lane yet" when
   null), Seven-day cadence (`cadence(…, 7)` as 7 bars with weekday initials,
   a `title` tooltip per bar with the minutes).
3. **Weekly recap** card beside or under rhythm: total this week, "N blocks ·
   N return days", "<lane> has held your attention this week.", CALM CADENCE
   `calmCadence / 14 days`, BEST WINDOW (from `attentionMap(…).best`),
   QUALITY `quality(…).weekAverage / 5` (— when null).
4. **Attention map** — h2 "When deep work actually clicks.", aside "LAST 90
   DAYS · 1H DAY / 2H NIGHT". A 7 × 18 grid (Mon–Sun rows, ATTENTION_SLOTS
   columns with labels like `12–2a`, `8–9a`, `12–1p`, `10p–12a`), cells
   coloured by `levels` 0–4; a side panel "BEST WINDOW / Thu · 12–1p / 1h 18m
   logged in this window." and a quiet→strong legend.
5. **Focus run** — h2 "Protect the return.", copy "Thirty focused minutes keeps
   a workday alive. Weekends and marked time off pause the run." Three stat
   cards (Current run / Longest run / This week `weekFocused / weekEligible`).
   The year grid (`yearGrid`): 52 columns × workday rows, cells by state, a
   legend Focused / PTO / Holiday, and "365 days · weekends intentionally
   omitted." Weekly momentum (`weeklyMomentum`): 52 cells, darker for more
   focused days. **Excuse a workday**: a date input, PTO | Holiday segmented
   control, **Mark exempt**; **Marked time off** chips (`PTO · Sep 3 ×`), × removes.
6. **Pixel footprint** — h2 "Thirty days of focus.", aside "1 block = 30 min",
   `<FootprintChart>` from `footprint` (label every 5th day like "Oct 3"),
   then "RECENT LOGS" with the last three days that had focus ("Fri, Aug 28 · 1h").
7. **Trophy cabinet** — h2 "Your world grows with real focus.", aside
   "N / 39 UNLOCKED". A framed **Current world** panel: `<WorldScene>` with the
   unlocked ids, title by count (SPEC §4), the "Every earned trophy…" copy,
   and "NEXT UP" with `nextUp` (title value / goal). Then the grid of all 39
   `trophyProgress` cards: tier eyebrow ("BRONZE · UNLOCKED" or "SILVER · 60%
   TO GO"), title (e.g. "25 sessions", "100 hr", "First 20h Week", "10,000 Hour
   Holy Grail"), the family blurb from SPEC §4, a progress bar, `value / goal`.
   Unlocked cards get `.is-unlocked`.

Trophy metrics: sessions = log length, totalMinutes = sum of minutes,
bestWeekMinutes, strongWeeks, brightBlocks / ratings from `quality`,
comebacks — all from metrics.ts.

## 3. Class contract (in addition to the `fx-` classes in FOCUS-PAGE.md §3)

| class | what |
|---|---|
| `pg-page` (with `focus-theme fx-page`) | page root |
| `pg-stat`, `pg-stat-value`, `pg-stat-unit`, `pg-stat-note` | a stat card (rhythm, run) |
| `pg-cards` | a responsive row of cards (3 across, 1 on phone) |
| `pg-bars` > `span` (height %, `title`) + `pg-bars-labels` | seven-day cadence |
| `pg-recap`, `pg-recap-total`, `pg-recap-line` | weekly recap |
| `pg-heat`, `pg-heat-row`, `pg-heat-cell` (`data-level="0".."4"`), `pg-heat-labels`, `pg-heat-best`, `pg-legend` | attention map |
| `pg-year`, `pg-year-col`, `pg-year-cell` (`data-state="focused|pto|holiday|none|future"`), `pg-momentum`, `pg-momentum-cell` (`data-days="0".."5"`) | year grid + momentum |
| `pg-exempt`, `pg-exempt-chips` | excuse a workday |
| `pg-world`, `pg-world-copy`, `pg-next` | current world panel |
| `pg-trophies`, `pg-trophy` (`.is-unlocked`), `pg-trophy-tier`, `pg-trophy-title`, `pg-trophy-blurb`, `pg-trophy-bar` > `span`, `pg-trophy-count` | trophy grid (5 across desktop, 2 on phone) |

## 4. CSS (Gemini) — `src/focus/views/progress.css`

Same visual system as focus.css (read it and reuse its tokens). Heat-map greens
`#e7e3da` (0) → `#dfe6d8` → `#a9c19c` → `#6f9a62` → `#3f6e3a` (4); year grid:
focused `#3f6e3a`, pto `#c9773a`, holiday `#6f8fb0`, none = hairline outline,
future = faint dotted outline. Momentum cells: shades of the same green by
`data-days`. Trophy cards: paper cards; unlocked ones a warm tint `#f6e9df`,
1px rust-tinted border and a 4px navy offset shadow; tier eyebrow in mono; bar
fill rust when unlocked, slate otherwise. Dark mode equivalents under
`:root[data-theme="dark"] .focus-theme`. Phone: every grid scrolls inside its
own box (`overflow-x: auto`), never the page.
