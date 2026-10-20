# Pixel art — build brief (SPEC §5, §6)

All pixel art is SVG built from small character grids: no images, no canvas,
no new dependencies. Everything lives in `src/focus/pixel/`. Components take
plain props (numbers, booleans, already-translated strings) and know nothing
about Todoist, the store or i18n.

## Colours

`src/focus/pixel/pixel.css` defines these on `.focus-theme` and overrides them
for dark mode under `:root[data-theme="dark"] .focus-theme`. SVG fills use
`var(--px-…)` so the theme switch needs no JS.

| token | light | dark |
|---|---|---|
| `--px-sky` | `#a9c9e3` | `#3a4a66` |
| `--px-cloud` | `#f4f4f0` | `#8a96ad` |
| `--px-brick` | `#e08a3c` | `#c4742f` |
| `--px-brick-light` | `#f2b55a` | `#d9a04c` |
| `--px-brick-dark` | `#c95f2a` | `#a84f23` |
| `--px-mortar` | `#7a3b1a` | `#5a2a12` |
| `--px-leaf` | `#3e8a3a` | `#2f6e2c` |
| `--px-leaf-dark` | `#2c6b2a` | `#20501f` |
| `--px-trunk` | `#6b3d1e` | `#4f2c15` |
| `--px-ground` | `#c9773a` | `#8f5326` |
| `--px-ground-dark` | `#9c5426` | `#6b3c1b` |
| `--px-frame` | `#1e2a36` | `#0e141b` |
| `--px-paper` | `#f4f1ea` | `#24221e` |
| `--px-ink` | `#1f1d1a` | `#ece6da` |
| `--px-ghost` | `rgba(30,42,54,.14)` | `rgba(236,230,218,.12)` |
| `--px-gold` | `#f2c94c` | `#d9b343` |
| `--px-stone` | `#9aa3ab` | `#6f777e` |
| `--px-water` | `#5b9bd5` | `#3f6f9c` |
| `--px-flower` | `#e05a6d` | `#b8475a` |

Pixel panels (`.px-panel`): 4px `--px-frame` border, `box-shadow: 6px 6px 0
var(--px-frame)`, no radius, `image-rendering: pixelated`. Every `<svg>` uses
`shape-rendering="crispEdges"` and a `viewBox` in pixel units, scaling to its
container's width (`width: 100%; height: auto`).

Pixel text (timer digits, "DAILY QUEST") uses the font stack
`var(--px-font, "Silkscreen", "Press Start 2P", ui-monospace, monospace)`;
the font itself is added later, don't import one.

## Files and contracts

### `sprites.ts` (pure, tested in `sprites.test.ts`)

```ts
/** A sprite is rows of characters; '.' is transparent, any other char is looked up in the palette. */
export type Sprite = readonly string[];
export type Palette = Readonly<Record<string, string>>; // char -> CSS colour, e.g. 'var(--px-leaf)'

export interface PixelRect { x: number; y: number; w: number; h: number; fill: string }

/** One rect per horizontal run of the same char, so a 16×16 sprite isn't 256 nodes. Throws on a char missing from the palette. */
export function spriteRects(sprite: Sprite, palette: Palette, offsetX?: number, offsetY?: number): PixelRect[];

/** Width and height of a sprite (width = longest row). */
export function spriteSize(sprite: Sprite): { w: number; h: number };

/** Shared sprites: TREE (≈11×14), CLOUD (≈12×4), BRICK (8×5, light top edge, dark bottom edge, mortar outline). */
export const TREE: Sprite; export const CLOUD: Sprite; export const BRICK: Sprite;
export const PALETTE: Palette; // maps the chars used by the shared sprites to var(--px-*) colours
```

### `layout.ts` (pure, tested in `layout.test.ts`)

```ts
/** Brick positions (in brick units) for a pyramid of `rows` rows: bottom row has `rows` bricks, top has 1, each row centred on the one below (half-brick offset). Ordered bottom row first, left to right — the order they get laid. */
export function pyramidBricks(rows: number): Array<{ col: number; row: number }>; // col may be .5 steps; row 0 = bottom

/** How many of `total` bricks are laid at `progress` (0–1): floor(progress × total), clamped; progress 1 lays all. */
export function bricksLaid(progress: number, total: number): number;

/** Block positions for the weekly temple of `total` blocks (20 by default): a stepped base, columns, a roof — any shape that reads as a temple, built bottom-up in the returned order. Exactly `total` positions, no duplicates. */
export function templeBlocks(total: number): Array<{ col: number; row: number }>;
```

### `PixelSprite.tsx`

`<PixelSprite sprite palette x y />` renders `spriteRects` as `<rect>`s inside a `<g>`.

### `FocusScene.tsx` (timer scene, SPEC §5.1 item 2; screenshots show it)

```ts
interface FocusSceneProps {
  /** 0–1 through the current block; the pyramid lays bricks bottom-up as it rises. 1 = complete pyramid. */
  progress: number;
  /** Pre-formatted, e.g. "24:13". */
  time: string;
  quest: { label: string; minutesLabel: string; pips: [boolean, boolean, boolean, boolean] }; // label "DAILY QUEST", minutesLabel "30m / 4h"
  /** Shows <Fireworks/> over the scene. */
  celebrating?: boolean;
  /** 'wide' for the sidecar banner (≈ 3.5:1), 'card' for the main page (≈ 1.4:1). */
  variant?: 'card' | 'wide';
  /** Accessible description, already translated. */
  ariaLabel: string;
}
```

Layout: sky fill; 2 clouds; a pixel tree near each side; a brick-pattern ground
strip along the bottom (alternating `--px-ground` / `--px-ground-dark`
squares); a pyramid of 8 rows (36 bricks) centred on the ground, unlaid bricks
not drawn; the timer in a paper-coloured box with a frame-coloured border at
top right (big pixel digits); top left the quest label, the minutes label and
4 round-ish pips (lit = `--px-leaf`, unlit = `--px-stone`). Use HTML for the
text over the SVG (absolutely positioned) rather than SVG `<text>`, so it stays
crisp and selectable. Root element: `<div class="px-panel px-scene">`.

### `Fireworks.tsx`

Pure CSS keyframe bursts of 3–5 pixel-square sparks in `--px-gold`,
`--px-flower`, `--px-cloud`, ~1.6 s, looping while mounted. Under
`@media (prefers-reduced-motion: reduce)` show a static sparkle instead.
`aria-hidden`.

### `TempleScene.tsx` (Progress page §5.2 item 1)

```ts
interface TempleSceneProps {
  blocks: number;       // laid so far
  totalBlocks: number;  // 20 by default
  counter: string;      // "0 / 20", pre-formatted
  caption: string;      // "WEEKLY TEMPLE / BUILDING", pre-formatted
  ariaLabel: string;
}
```

Sky, ground strip, and the temple from `templeBlocks(totalBlocks)`: laid blocks
as bricks, unlaid ones drawn in `--px-ghost` so **at 0 the full outline still
shows** (the prototype rendered an empty sky — that's the bug to avoid).
Caption top left, counter top right, `px-panel` frame.

### `FootprintChart.tsx` (Progress page §5.2 item 6)

```ts
interface FootprintChartProps {
  days: Array<{ date: string; bricks: number; label?: string }>; // 30 entries; label shown under every 5th column
  maxBricks?: number;   // 16
  ariaLabel: string;
}
```

One column per day: `maxBricks` slots stacked bottom-up, laid ones as small
bricks, empty ones as outlined squares in `--px-ghost`. Not a `px-panel`; sits
on the page.

### `WorldScene.tsx` + `world.ts` (Progress page §5.2 item 7)

`world.ts` (pure, tested in `world.test.ts`):

```ts
/** One permanent detail per trophy id (all 39 in TROPHIES from ../domain/trophies), each a small sprite at a fixed spot in a 160×90 scene. */
export const WORLD_DETAILS: Readonly<Record<string, { sprite: Sprite; x: number; y: number }>>;
```

Test: every id in `TROPHIES` has exactly one detail; no detail sits outside
160×90. Details grow the clearing into a village, roughly in cabinet order:
first stone, path stones, saplings, trees, flowers, a fence, a bench, a well,
a hut, a lantern, a pond, a bridge, temple steps … `hours-10000` is a lit
temple at the centre.

```ts
interface WorldSceneProps { unlocked: readonly string[]; ariaLabel: string }
```

Sky, ground, then every unlocked detail. `px-panel` frame.

## Done means

- `sprites.test.ts`, `layout.test.ts`, `world.test.ts` cover the pure functions
  (run order, clamping, counts, no duplicates, bounds).
- `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` pass.
- Components are function components with named exports, no default exports,
  no state beyond what's needed, no effects except Fireworks' none-at-all
  (it's CSS).
- `pixel.css` is imported by each component that needs it
  (`import './pixel.css';`), like `src/components/CalendarSurface.tsx` does.
