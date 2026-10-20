import { describe, expect, it } from 'vitest';
import { bricksLaid, pyramidBricks, templeBlocks } from './layout';

describe('pyramidBricks', () => {
  it('returns empty array for 0 or negative rows', () => {
    expect(pyramidBricks(0)).toEqual([]);
    expect(pyramidBricks(-1)).toEqual([]);
  });

  it('lays 1 brick for a 1-row pyramid', () => {
    expect(pyramidBricks(1)).toEqual([{ col: 0, row: 0 }]);
  });

  it('lays 36 bricks for an 8-row pyramid in bottom-up, left-to-right order', () => {
    const bricks = pyramidBricks(8);
    expect(bricks).toHaveLength(36);

    // Row 0 (bottom) has 8 bricks
    const row0 = bricks.filter((b) => b.row === 0);
    expect(row0).toHaveLength(8);
    expect(row0.map((b) => b.col)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);

    // Row 7 (top) has 1 brick centred at half-brick offset 3.5
    const row7 = bricks.filter((b) => b.row === 7);
    expect(row7).toEqual([{ col: 3.5, row: 7 }]);

    // Verify ordering: bottom row first, then left-to-right
    for (let i = 1; i < bricks.length; i++) {
      const prev = bricks[i - 1];
      const curr = bricks[i];
      if (curr.row === prev.row) {
        expect(curr.col).toBeGreaterThan(prev.col);
      } else {
        expect(curr.row).toBeGreaterThan(prev.row);
      }
    }
  });

  it('centers each row on the one below with a 0.5-brick step', () => {
    const bricks = pyramidBricks(4);
    // Row 0: 0, 1, 2, 3 -> center = 1.5
    // Row 1: 0.5, 1.5, 2.5 -> center = 1.5
    // Row 2: 1.0, 2.0 -> center = 1.5
    // Row 3: 1.5 -> center = 1.5
    for (let r = 0; r < 4; r++) {
      const rowBricks = bricks.filter((b) => b.row === r);
      expect(rowBricks).toHaveLength(4 - r);
      const minCol = rowBricks[0].col;
      const maxCol = rowBricks[rowBricks.length - 1].col;
      expect((minCol + maxCol) / 2).toBe(1.5);
    }
  });
});

describe('bricksLaid', () => {
  it('handles bounds and clamping', () => {
    expect(bricksLaid(0, 36)).toBe(0);
    expect(bricksLaid(-0.2, 36)).toBe(0);
    expect(bricksLaid(1, 36)).toBe(36);
    expect(bricksLaid(1.5, 36)).toBe(36);
    expect(bricksLaid(0.5, 0)).toBe(0);
    expect(bricksLaid(-1, 0)).toBe(0);
  });

  it('floors progress * total', () => {
    expect(bricksLaid(0.5, 36)).toBe(18);
    expect(bricksLaid(0.25, 36)).toBe(9);
    expect(bricksLaid(0.01, 36)).toBe(0); // floor(0.36) = 0
    expect(bricksLaid(0.03, 36)).toBe(1); // floor(1.08) = 1
    expect(bricksLaid(0.999, 36)).toBe(35); // floor(35.964) = 35
  });
});

describe('templeBlocks', () => {
  it('returns empty array for 0 or negative total', () => {
    expect(templeBlocks(0)).toEqual([]);
    expect(templeBlocks(-5)).toEqual([]);
  });

  it('builds canonical 20-block classical temple with 3-step base, columns, and pediment roof', () => {
    const blocks = templeBlocks(20);
    expect(blocks).toHaveLength(20);

    // No duplicate positions
    const keys = new Set(blocks.map((b) => `${b.col},${b.row}`));
    expect(keys.size).toBe(20);

    // Ordered bottom-up
    for (let i = 1; i < blocks.length; i++) {
      expect(blocks[i].row).toBeGreaterThanOrEqual(blocks[i - 1].row);
    }

    // Row 0 has 5 bricks (bottom step of wide 3-step base)
    const row0 = blocks.filter((b) => b.row === 0);
    expect(row0).toHaveLength(5);
    expect(row0).toEqual([
      { col: 0, row: 0 },
      { col: 1, row: 0 },
      { col: 2, row: 0 },
      { col: 3, row: 0 },
      { col: 4, row: 0 },
    ]);

    // Row 1 has 4 bricks (middle step)
    const row1 = blocks.filter((b) => b.row === 1);
    expect(row1).toHaveLength(4);
    expect(row1).toEqual([
      { col: 0.5, row: 1 },
      { col: 1.5, row: 1 },
      { col: 2.5, row: 1 },
      { col: 3.5, row: 1 },
    ]);

    // Row 2 has 3 bricks (top step)
    const row2 = blocks.filter((b) => b.row === 2);
    expect(row2).toHaveLength(3);
    expect(row2).toEqual([
      { col: 1, row: 2 },
      { col: 2, row: 2 },
      { col: 3, row: 2 },
    ]);

    // Rows 3 & 4 have 2 bricks each (columns)
    const row3 = blocks.filter((b) => b.row === 3);
    const row4 = blocks.filter((b) => b.row === 4);
    expect(row3).toEqual([{ col: 1, row: 3 }, { col: 3, row: 3 }]);
    expect(row4).toEqual([{ col: 1, row: 4 }, { col: 3, row: 4 }]);

    // Row 5 has 3 bricks (pediment roof base)
    const row5 = blocks.filter((b) => b.row === 5);
    expect(row5).toEqual([
      { col: 1, row: 5 },
      { col: 2, row: 5 },
      { col: 3, row: 5 },
    ]);

    // Row 6 has 1 brick (triangular pediment peak)
    const row6 = blocks.filter((b) => b.row === 6);
    expect(row6).toEqual([{ col: 2, row: 6 }]);
  });

  it('returns exactly total positions without duplicates for various counts', () => {
    const totals = [1, 2, 3, 4, 5, 10, 15, 20, 25, 30, 40];
    for (const total of totals) {
      const blocks = templeBlocks(total);
      expect(blocks).toHaveLength(total);

      const keys = new Set(blocks.map((b) => `${b.col},${b.row}`));
      expect(keys.size).toBe(total);

      // Verify bottom-up ordering
      for (let i = 1; i < blocks.length; i++) {
        expect(blocks[i].row).toBeGreaterThanOrEqual(blocks[i - 1].row);
      }
    }
  });
});
