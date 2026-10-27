/**
 * 8x8 pixel-art quest coin drawing logic (docs/focus/UI-POLISH.md §5).
 * Pure functions: calculates pixel roles, row filling, and colors for coin pips.
 */

export const PIP_SHAPE: readonly string[] = [
  '..XXXX..',
  '.XXXXXX.',
  'XXXXXXXX',
  'XXXXXXXX',
  'XXXXXXXX',
  'XXXXXXXX',
  '.XXXXXX.',
  '..XXXX..',
];

export const PIP_COLORS = {
  lit: {
    face: '#5d9443',
    highlight: '#8cc46a',
    shade: '#3f6e2c',
  },
  unlit: {
    face: '#a5a7a2',
    highlight: '#c4c6c1',
    shade: '#7d7f7a',
  },
} as const;

export type PipPixelRole = 'highlight' | 'shade' | 'face';

/**
 * Returns the structural role of a pixel in the 8x8 coin shape:
 * - 'highlight': top-left edge pixels (top row and left column of the shape)
 * - 'shade': bottom-right edge pixels (bottom row and right column of the shape)
 * - 'face': interior and remaining shape pixels
 * - null: outside the 8x8 coin shape
 */
export function pipPixelRole(x: number, y: number): PipPixelRole | null {
  if (y < 0 || y >= 8 || x < 0 || x >= 8) return null;
  if (PIP_SHAPE[y][x] !== 'X') return null;

  // Top row (row 0) or left column (col 0) of the shape
  if (y === 0 || x === 0) return 'highlight';
  // Bottom row (row 7) or right column (col 7) of the shape
  if (y === 7 || x === 7) return 'shade';

  return 'face';
}

/**
 * Number of whole pixel rows filled with green (0 to 8).
 * Fills from the bottom, snapping to whole pixel rows.
 */
export function pipFilledRows(fill: number): number {
  if (Number.isNaN(fill) || fill <= 0) return 0;
  if (fill >= 1) return 8;
  return Math.max(0, Math.min(8, Math.round(fill * 8)));
}

/**
 * Color for pixel (x, y) given fractional fill (0–1).
 * Fills from bottom: green rows up to share, grey above.
 * Returns null if the pixel is outside the 8x8 coin shape.
 */
export function pipPixelColor(x: number, y: number, fill: number): string | null {
  const role = pipPixelRole(x, y);
  if (!role) return null;

  const filledRows = pipFilledRows(fill);
  // Bottom row is y = 7; filled rows count up from y = 7
  const isLit = y >= 8 - filledRows;
  const palette = isLit ? PIP_COLORS.lit : PIP_COLORS.unlit;
  return palette[role];
}

export interface PipRect {
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
}

/**
 * Coalesces horizontal runs of identical colors in each row into rects
 * for SVG rendering with crispEdges.
 */
export function pipRects(fill: number): PipRect[] {
  const rects: PipRect[] = [];
  for (let y = 0; y < 8; y++) {
    let x = 0;
    while (x < 8) {
      const color = pipPixelColor(x, y, fill);
      if (color === null) {
        x++;
        continue;
      }
      let run = 1;
      while (x + run < 8 && pipPixelColor(x + run, y, fill) === color) {
        run++;
      }
      rects.push({ x, y, w: run, h: 1, fill: color });
      x += run;
    }
  }
  return rects;
}

/**
 * Returns an 8x8 grid of colors (or null for transparent pixels).
 */
export function pipGrid(fill: number): Array<Array<string | null>> {
  return Array.from({ length: 8 }, (_, y) =>
    Array.from({ length: 8 }, (_, x) => pipPixelColor(x, y, fill))
  );
}
