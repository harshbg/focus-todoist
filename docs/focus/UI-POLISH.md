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

## Done means

`npm run lint`, `npm run typecheck`, `npm test` and `npm run build` all
pass. Commit on `gemini/ui-polish` and push it. Do not merge into `focus`.
