# Fidelity pass — match the prototype more closely

A side-by-side review of the built pages against the prototype screenshots
(kept outside the repo) found these differences. Fix them; the markup changes
go in the views (Codex), the visual ones in focus.css / progress.css (Gemini).
Keep every class from the existing contracts; add new ones as needed.

## Focus page — timer card

1. **One centred column.** The Focus/Unwind toggle, "ONE THING. NO RUSH.",
   the length chips and the scene are centred in the card. Remove the big
   "Focus" h2 inside the card (the prototype has none).
2. **Card tones.** The timer card is the lightest surface (near white,
   `#fbfaf7`, dark `#24221e`); the task-queue rail is the darker beige
   (`#efebe3`). Today they are the same.
3. **Daily quest in the scene** reads `30m / 4h` (not "30 of 240 min"), small
   mono, with the 4 pips; lit pips are green.
4. **Timer box** is bigger: digits about 2× the current size, paper box with a
   3px frame border, top-right of the scene.
5. **No separate Start button under the scene when idle**: starting happens from
   the queue rail's **Start task** (and ▶ on a row). Show Pause / Resume /
   Stop under the scene only while a block runs.
6. **Block complete** replaces the length chips area and reads, centred:
   - "Focus block complete. Continue the same task or take a reset."
   - a dashed-border box: `FOCUS QUALITY` `OPTIONAL` label (mono), five square
     star buttons, and "How did that block feel?" to their right;
   - `CONTINUE SAME TASK` (mono, centred);
   - one row of buttons: **30 min / 1 hr / 2 hrs** filled rust, then
     **New task** and **Take 5 min** cream;
   - a links row: "↗ Open sidecar" · "✦ Preview the fireworks" (replays the
     fireworks for 3 s), and the hint "30 min focus · 5 min reset · Nothing gets blocked".

## Focus page — task queue rail

7. Field label is just `TASK` (mono, ink colour, not rust). The input is
   borderless on the rail colour, 18–20px, placeholder "Add a focused piece of
   work", with only a hairline under it.
8. `TIME REQUIRED` and `LANE` labels in mono ink; chips as now.
9. **Start task** is a wide filled rust button with a ▶ glyph; **+ Add to
   queue** an outlined button beside it. Disabled state stays rust at 45%
   opacity, never pink.
10. `READY WHEN YOU ARE` is a mono uppercase label with a **navy square count
    badge** (white number). Rows are not boxed: hairline separators only.
    Each row: a small rust pixel square at the left, the **title in bold** on
    the first line, the meta (`2 hrs · Deep Dive`) under it in small muted
    text, then on the right a square outlined ▶ button and a muted ×.

## Focus page — current focus and trail

11. **Current focus band** is always visible (not only while running): eyebrow
    `CURRENT FOCUS`, serif "Name the work.", then `TASK` + the selected task's
    title field, and `LANE` + the lane chips — a single horizontal band under
    the timer card, as in the prototype.
12. **Attention trail** rows: a white list in one rounded container with
    hairline dividers; each row has a small rust square, the title bold, the
    meta (`Analysis · Sep 10`) on a second line under it, and on the right
    `30 min · 4★` in mono. The per-row star picker and × appear only on hover
    or focus (always visible on touch screens), not permanently.
13. Buttons "Log past focus" and "Clear history" style → only "Log past focus",
    a small outlined mono button at the top right of the section.

## Progress page

14. **Year grid** spans the full card width: 52 columns of small squares with
    2px gaps (cells grow to fill), month labels under it; **weekly momentum**
    is a full-width row of 52 cells too.
15. **Trophy cards** get a small pixel trophy icon left of the title (a 10×10
    sprite per tier colour: bronze `#b8743a`, silver `#9aa3ab`, gold
    `#d9a93a`, platinum `#8fb3c9`, palladium `#a3a8b5`, rhodium `#c9cfd6`,
    iridium `#6b7a8f`, osmium `#3d5a73`), greyed when locked.
16. **Section eyebrows** ("WEEKLY TEMPLE", "YOUR RHYTHM", "ATTENTION MAP",
    "FOCUS RUN", "PIXEL FOOTPRINT", "TROPHY CABINET", "TASK QUEUE") use the
    app's sans in bold, 11px, uppercase, letter-spacing .16em, rust — not mono.
    Small field labels (`DAILY QUEST`, `TIME REQUIRED`, `LANE`, `CONTINUE SAME
    TASK`, stat-card labels) stay mono.
17. Stat cards ("CURRENT RUN", "LONGEST RUN", "THIS WEEK") have the 4px navy
    offset shadow like the prototype; numbers in the serif at ~44px with a small
    mono unit ("days", "/ 2").
