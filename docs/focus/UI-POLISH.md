# UI polish — build brief

Branch: `gemini/ui-polish` off `focus` (after `git pull`). Read `AGENTS.md` and
`docs/focus/PIXEL.md` first. Touch only the files named here.

## 1. The app icon

The app still ships the original project's icons. Make our own: a pixel-art
pyramid of orange bricks, the Focus page's style (`src/focus/pixel/FocusScene.tsx`
`BRICK_SHADES` and `Brick`: bevelled bricks, dark outline), 3 or 4 rows, on
a sky-blue square (`--px-sky` in `src/focus/pixel/pixel.css`) with a strip of
ground. Crisp edges, no gradients, readable at 32 px.

- Source: `public/icon.svg` (hand-written SVG, integer coordinates).
- Replace these, keeping their names and sizes: `public/favicon.svg`,
  `public/icon-192.png`, `public/icon-512.png`, `public/icon-maskable-192.png`,
  `public/icon-maskable-512.png` (maskable: the art inside the central 80%
  safe zone, sky filling the rest), and `public/apple-touch-icon.png` (180 × 180).
  Render the PNGs from the SVG with any tool you have on the Mac (e.g.
  `npx @resvg/resvg-js-cli`), and don't add it to package.json.
- Leave `og-image*.png` and `author.png` alone.

## 2. One clock face everywhere

The sidecar's clock is set in **Tektur, weight 800** (`@fontsource/tektur`,
already installed and imported in `src/focus/fonts.ts`). The prototype uses it
for the Focus page clock too. In `src/focus/pixel/pixel.css`, set
`.px-timer-digits` to `font-family: "Tektur", ui-monospace, monospace;
font-weight: 800; font-variant-numeric: tabular-nums;`. Keep the sizes, and
check that the clock box still fits at 360 px wide.

## 3. Sidecar page (`#/sidecar`, `src/focus/views/Sidecar.tsx`, styles under "The sidecar page" at the end of `src/focus/views/focus.css`)

Keep the structure, and adjust only CSS unless noted:

- In the scene, the left cloud sits on the quest's pips. In the wide scene,
  move the clouds into the right half of the sky
  (`FocusScene.tsx`, `cloud1`/`cloud2` for `isWide`, small edit).
- Dark mode (`[data-theme="dark"]` and `prefers-color-scheme: dark` like the rest
  of focus.css). The cards, the clock box, the quality box and the "done"
  card's green tint all need dark values that keep the navy frames readable
  (use a light frame colour in dark mode). The done card's green tint
  (`#dfe3cf`) becomes a dark olive.
- Phone width (390 px): the clock fits, the buttons wrap two per row, and
  nothing scrolls sideways.
- Keyboard: Space starts or pauses, Escape stops (ask with the same confirm
  the Stop button uses), 1/2/3 pick the first three lengths when nothing is
  running. Ignore keys while typing in the task field. Small `useEffect` in
  Sidecar.tsx.

## 4. (Done by Claude: the task field's list. Skip it.)

## 5. The daily quest, in the scene's pixel style (user request)

The daily quest shows up in three places: the overlay at the top left of the
scene (`FocusScene.tsx`, `.px-quest*` in pixel.css), the Focus page's
"Today's progress" card (`.fx-pips` in FocusView.tsx), and the sidecar's line
under the scene (`.fx-sc-pips` in Sidecar.tsx). Today the pips are flat CSS
circles. They should look like part of the pixel world:

- **One `QuestPips` component** in `src/focus/pixel/QuestPips.tsx`, used in all
  three places. Each pip is an SVG drawn on an 8 × 8 grid with
  `shapeRendering="crispEdges"`, so it reads as a pixel coin, not a smooth circle.
  - Shape by rows: `..XXXX..`, `.XXXXXX.`, then four rows of `XXXXXXXX`,
    then `.XXXXXX.`, `..XXXX..`.
  - Lit pip: face `#5d9443`. Add a highlight `#8cc46a` on the top-left edge
    pixels (top row and left column of the shape) and a shade `#3f6e2c` on
    the bottom-right edge pixels.
  - Unlit pip: the same shape in greys (face `#a5a7a2`, highlight `#c4c6c1`,
    shade `#7d7f7a`).
  - **The pip being filled** fills from the bottom: green rows up to its share,
    grey above. Snap to whole pixel rows.
- **Fractional progress**: add `pipFill: [number, number, number, number]` to
  `TodayProgress` in `src/focus/domain/metrics.ts` (each 0–1, so 3h 30m of
  4h is `[1, 1, 1, 0.5]`), with a test. Keep `pips` for existing callers. Pass
  `pipFill` instead of `pips` to `FocusScene`'s `quest` prop and to the other two
  places.
- **Type**: the quest's label ("DAILY QUEST") and minutes ("3h 30m / 4h") use
  **Courier Prime 700** (already loaded) on the Focus page too, as the sidecar
  already does (`--fx-type`):
  - The label is uppercase with letter-spacing 0.14em.
  - The minutes line sits under the pips with letter-spacing 0.04em.
  - Order: label, pips, minutes.
- Sizes: the pips are about the height of the label's capitals ×1.6 in the
  scene, and 16 px in the two small places. Spacing between pips is a quarter
  of a pip.

## Done means

`npm run lint`, `npm run typecheck`, `npm test` and `npm run build` all
pass. Commit on `gemini/ui-polish` and push it. Do not merge into `focus`.
