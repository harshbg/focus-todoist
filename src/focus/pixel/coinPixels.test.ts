import { describe, expect, it } from 'vitest';
import {
  PIP_COLORS,
  PIP_SHAPE,
  pipFilledRows,
  pipGrid,
  pipPixelColor,
  pipPixelRole,
  pipRects,
} from './coinPixels';

describe('questPips coin shape and roles', () => {
  it('has an 8x8 shape grid with exactly 52 active pixels', () => {
    expect(PIP_SHAPE).toHaveLength(8);
    let count = 0;
    for (const row of PIP_SHAPE) {
      expect(row).toHaveLength(8);
      for (const ch of row) {
        if (ch === 'X') count++;
      }
    }
    expect(count).toBe(52);
  });

  it('assigns highlight to top-left edge pixels (top row and left column)', () => {
    // Top row (y = 0): pixels at x = 2, 3, 4, 5
    for (const x of [2, 3, 4, 5]) {
      expect(pipPixelRole(x, 0)).toBe('highlight');
    }
    // Left column (x = 0): pixels at y = 2, 3, 4, 5
    for (const y of [2, 3, 4, 5]) {
      expect(pipPixelRole(0, y)).toBe('highlight');
    }
  });

  it('assigns shade to bottom-right edge pixels (bottom row and right column)', () => {
    // Bottom row (y = 7): pixels at x = 2, 3, 4, 5
    for (const x of [2, 3, 4, 5]) {
      expect(pipPixelRole(x, 7)).toBe('shade');
    }
    // Right column (x = 7): pixels at y = 2, 3, 4, 5
    for (const y of [2, 3, 4, 5]) {
      expect(pipPixelRole(7, y)).toBe('shade');
    }
  });

  it('assigns face to interior and other edge pixels', () => {
    expect(pipPixelRole(1, 1)).toBe('face');
    expect(pipPixelRole(6, 1)).toBe('face');
    expect(pipPixelRole(1, 6)).toBe('face');
    expect(pipPixelRole(6, 6)).toBe('face');
    expect(pipPixelRole(3, 3)).toBe('face');
    expect(pipPixelRole(4, 4)).toBe('face');
  });

  it('returns null for out-of-shape and out-of-bounds pixels', () => {
    expect(pipPixelRole(0, 0)).toBeNull();
    expect(pipPixelRole(1, 0)).toBeNull();
    expect(pipPixelRole(6, 0)).toBeNull();
    expect(pipPixelRole(7, 0)).toBeNull();
    expect(pipPixelRole(0, 1)).toBeNull();
    expect(pipPixelRole(7, 1)).toBeNull();
    expect(pipPixelRole(-1, 0)).toBeNull();
    expect(pipPixelRole(0, 8)).toBeNull();
  });
});

describe('pipFilledRows', () => {
  it('snaps to whole pixel rows and clamps between 0 and 8', () => {
    expect(pipFilledRows(0)).toBe(0);
    expect(pipFilledRows(-0.5)).toBe(0);
    expect(pipFilledRows(NaN)).toBe(0);
    expect(pipFilledRows(0.125)).toBe(1); // 1 / 8
    expect(pipFilledRows(0.25)).toBe(2);  // 2 / 8
    expect(pipFilledRows(0.5)).toBe(4);   // 4 / 8
    expect(pipFilledRows(0.75)).toBe(6);  // 6 / 8
    expect(pipFilledRows(1)).toBe(8);
    expect(pipFilledRows(1.5)).toBe(8);
  });
});

describe('pipPixelColor', () => {
  it('returns all unlit grey shades when fill = 0', () => {
    // Highlight
    expect(pipPixelColor(2, 0, 0)).toBe(PIP_COLORS.unlit.highlight);
    expect(pipPixelColor(0, 2, 0)).toBe(PIP_COLORS.unlit.highlight);
    // Face
    expect(pipPixelColor(3, 3, 0)).toBe(PIP_COLORS.unlit.face);
    // Shade
    expect(pipPixelColor(7, 3, 0)).toBe(PIP_COLORS.unlit.shade);
    expect(pipPixelColor(3, 7, 0)).toBe(PIP_COLORS.unlit.shade);
    // Outside
    expect(pipPixelColor(0, 0, 0)).toBeNull();
  });

  it('returns all lit green shades when fill = 1', () => {
    // Highlight
    expect(pipPixelColor(2, 0, 1)).toBe(PIP_COLORS.lit.highlight);
    expect(pipPixelColor(0, 2, 1)).toBe(PIP_COLORS.lit.highlight);
    // Face
    expect(pipPixelColor(3, 3, 1)).toBe(PIP_COLORS.lit.face);
    // Shade
    expect(pipPixelColor(7, 3, 1)).toBe(PIP_COLORS.lit.shade);
    expect(pipPixelColor(3, 7, 1)).toBe(PIP_COLORS.lit.shade);
    // Outside
    expect(pipPixelColor(0, 0, 1)).toBeNull();
  });

  it('fills from the bottom: green rows up to share, grey above', () => {
    // fill = 0.5 -> bottom 4 rows (y = 4, 5, 6, 7) are green, top 4 (y = 0, 1, 2, 3) are grey
    // Top rows (grey)
    expect(pipPixelColor(2, 0, 0.5)).toBe(PIP_COLORS.unlit.highlight);
    expect(pipPixelColor(0, 2, 0.5)).toBe(PIP_COLORS.unlit.highlight);
    expect(pipPixelColor(3, 2, 0.5)).toBe(PIP_COLORS.unlit.face);
    expect(pipPixelColor(7, 2, 0.5)).toBe(PIP_COLORS.unlit.shade);
    expect(pipPixelColor(3, 3, 0.5)).toBe(PIP_COLORS.unlit.face);

    // Bottom rows (green)
    expect(pipPixelColor(0, 4, 0.5)).toBe(PIP_COLORS.lit.highlight);
    expect(pipPixelColor(3, 4, 0.5)).toBe(PIP_COLORS.lit.face);
    expect(pipPixelColor(7, 4, 0.5)).toBe(PIP_COLORS.lit.shade);
    expect(pipPixelColor(0, 5, 0.5)).toBe(PIP_COLORS.lit.highlight);
    expect(pipPixelColor(1, 6, 0.5)).toBe(PIP_COLORS.lit.face);
    expect(pipPixelColor(2, 7, 0.5)).toBe(PIP_COLORS.lit.shade);
  });
});

describe('pipRects and pipGrid', () => {
  it('covers exactly 52 pixels across coalesced rects', () => {
    for (const fill of [0, 0.25, 0.5, 0.75, 1]) {
      const rects = pipRects(fill);
      const totalPixels = rects.reduce((sum, r) => sum + r.w * r.h, 0);
      expect(totalPixels).toBe(52);
      for (const r of rects) {
        expect(r.h).toBe(1);
        expect(r.w).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('produces an 8x8 grid matching pipPixelColor', () => {
    const grid = pipGrid(0.5);
    expect(grid).toHaveLength(8);
    for (let y = 0; y < 8; y++) {
      expect(grid[y]).toHaveLength(8);
      for (let x = 0; x < 8; x++) {
        expect(grid[y][x]).toBe(pipPixelColor(x, y, 0.5));
      }
    }
  });
});
