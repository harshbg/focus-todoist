import { describe, expect, it } from 'vitest';
import {
  BRICK,
  CLOUD,
  PALETTE,
  TREE,
  spriteRects,
  spriteSize,
  type Palette,
  type Sprite,
} from './sprites';

describe('spriteSize', () => {
  it('returns 0x0 for empty sprite', () => {
    expect(spriteSize([])).toEqual({ w: 0, h: 0 });
  });

  it('measures width as the longest row', () => {
    const sprite: Sprite = ['..', '....', '.'];
    expect(spriteSize(sprite)).toEqual({ w: 4, h: 3 });
  });

  it('matches dimensions of shared sprites', () => {
    expect(spriteSize(BRICK)).toEqual({ w: 8, h: 5 });
    expect(spriteSize(CLOUD)).toEqual({ w: 12, h: 4 });
    expect(spriteSize(TREE)).toEqual({ w: 11, h: 14 });
  });
});

describe('spriteRects', () => {
  const testPalette: Palette = {
    A: '#ff0000',
    B: '#00ff00',
  };

  it('coalesces horizontal runs of identical characters into a single rect', () => {
    const sprite: Sprite = ['AAA', '..B', 'ABB'];
    const rects = spriteRects(sprite, testPalette);

    expect(rects).toEqual([
      { x: 0, y: 0, w: 3, h: 1, fill: '#ff0000' },
      { x: 2, y: 1, w: 1, h: 1, fill: '#00ff00' },
      { x: 0, y: 2, w: 1, h: 1, fill: '#ff0000' },
      { x: 1, y: 2, w: 2, h: 1, fill: '#00ff00' },
    ]);
  });

  it('skips transparent "." characters', () => {
    const sprite: Sprite = ['.....', '..A..', '.....'];
    const rects = spriteRects(sprite, testPalette);
    expect(rects).toHaveLength(1);
    expect(rects[0]).toEqual({ x: 2, y: 1, w: 1, h: 1, fill: '#ff0000' });
  });

  it('applies offsetX and offsetY', () => {
    const sprite: Sprite = ['AA'];
    const rects = spriteRects(sprite, testPalette, 10, 20);
    expect(rects).toEqual([{ x: 10, y: 20, w: 2, h: 1, fill: '#ff0000' }]);
  });

  it('throws an error when a character is missing from the palette', () => {
    const sprite: Sprite = ['AAXAA'];
    expect(() => spriteRects(sprite, testPalette)).toThrow(
      'Missing palette entry for character "X"'
    );
  });

  it('renders all shared sprites successfully with PALETTE', () => {
    const brickRects = spriteRects(BRICK, PALETTE);
    const cloudRects = spriteRects(CLOUD, PALETTE);
    const treeRects = spriteRects(TREE, PALETTE);

    expect(brickRects.length).toBeGreaterThan(0);
    expect(cloudRects.length).toBeGreaterThan(0);
    expect(treeRects.length).toBeGreaterThan(0);

    // Verify horizontal runs reduce node count compared to raw pixels
    // 8x5 = 40 pixels, runs should be fewer than 20 rects
    expect(brickRects.length).toBeLessThan(20);
  });

  it('ensures all non-dot characters in shared sprites exist in PALETTE', () => {
    for (const sprite of [BRICK, CLOUD, TREE]) {
      for (const row of sprite) {
        for (const ch of row) {
          if (ch !== '.') {
            expect(PALETTE[ch]).toBeDefined();
            expect(PALETTE[ch]).toMatch(/^var\(--px-/);
          }
        }
      }
    }
  });
});
