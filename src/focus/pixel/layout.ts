/** Brick positions (in brick units) for a pyramid of `rows` rows: bottom row has `rows` bricks, top has 1, each row centred on the one below (half-brick offset). Ordered bottom row first, left to right — the order they get laid. */
export function pyramidBricks(rows: number): Array<{ col: number; row: number }> {
  if (rows <= 0) return [];
  const bricks: Array<{ col: number; row: number }> = [];
  for (let r = 0; r < rows; r++) {
    const count = rows - r;
    const colOffset = r * 0.5;
    for (let i = 0; i < count; i++) {
      bricks.push({ col: colOffset + i, row: r });
    }
  }
  return bricks;
}

/** How many of `total` bricks are laid at `progress` (0–1): floor(progress × total), clamped; progress 1 lays all. */
export function bricksLaid(progress: number, total: number): number {
  if (total <= 0) return 0;
  if (progress <= 0) return 0;
  if (progress >= 1) return total;
  return Math.max(0, Math.min(total, Math.floor(progress * total)));
}

/** Block positions for the weekly temple of `total` blocks (20 by default): a stepped base, columns, a roof — any shape that reads as a temple, built bottom-up in the returned order. Exactly `total` positions, no duplicates. */
export function templeBlocks(total: number): Array<{ col: number; row: number }> {
  if (total <= 0) return [];

  if (total === 1) return [{ col: 0, row: 0 }];
  if (total === 2) return [{ col: 0, row: 0 }, { col: 1, row: 0 }];
  if (total === 3) return [{ col: 0, row: 0 }, { col: 1, row: 0 }, { col: 0.5, row: 1 }];
  if (total === 4) return [{ col: 0, row: 0 }, { col: 1, row: 0 }, { col: 2, row: 0 }, { col: 1, row: 1 }];
  if (total === 5) return [{ col: 0, row: 0 }, { col: 1, row: 0 }, { col: 2, row: 0 }, { col: 0, row: 1 }, { col: 2, row: 1 }];

  // Canonical 20-block classical temple (default):
  // 3-step base (5 + 4 + 3), columns (2 + 2), triangular pediment roof (3 + 1)
  if (total === 20) {
    return [
      // Row 0: wide stepped base - bottom step (5 blocks)
      { col: 0, row: 0 }, { col: 1, row: 0 }, { col: 2, row: 0 }, { col: 3, row: 0 }, { col: 4, row: 0 },
      // Row 1: middle step (4 blocks)
      { col: 0.5, row: 1 }, { col: 1.5, row: 1 }, { col: 2.5, row: 1 }, { col: 3.5, row: 1 },
      // Row 2: top step (3 blocks)
      { col: 1, row: 2 }, { col: 2, row: 2 }, { col: 3, row: 2 },
      // Row 3: columns (2 blocks)
      { col: 1, row: 3 }, { col: 3, row: 3 },
      // Row 4: columns (2 blocks)
      { col: 1, row: 4 }, { col: 3, row: 4 },
      // Row 5: roof entablature / pediment base (3 blocks)
      { col: 1, row: 5 }, { col: 2, row: 5 }, { col: 3, row: 5 },
      // Row 6: roof pediment peak (1 block)
      { col: 2, row: 6 },
    ];
  }

  // Construct stepped base, columns, and roof dynamically for arbitrary `total`
  const colHeight = Math.max(1, Math.floor((total - 6) / 6));
  const wBase2 = Math.max(2, Math.floor((total - 2 * colHeight) / 3));
  const wBase1 = wBase2 + 2;
  const wBeam = wBase2;

  const positions: Array<{ col: number; row: number }> = [];
  const seen = new Set<string>();

  function add(col: number, row: number) {
    const key = `${col},${row}`;
    if (!seen.has(key)) {
      seen.add(key);
      positions.push({ col, row });
    }
  }

  // Stepped base row 0
  for (let c = 0; c < wBase1; c++) {
    add(c, 0);
  }

  // Stepped base row 1
  const offset1 = (wBase1 - wBase2) / 2;
  for (let c = 0; c < wBase2; c++) {
    add(offset1 + c, 1);
  }

  // Columns
  const leftCol = offset1;
  const rightCol = offset1 + wBase2 - 1;
  for (let r = 0; r < colHeight; r++) {
    add(leftCol, 2 + r);
    add(rightCol, 2 + r);
  }

  // Roof beam
  const beamRow = 2 + colHeight;
  for (let c = 0; c < wBeam; c++) {
    add(offset1 + c, beamRow);
  }

  // Roof peak
  let peakRow = beamRow + 1;
  let peakWidth = wBeam - 2;
  while (peakWidth >= 1 && positions.length < total) {
    const peakOffset = (wBase1 - peakWidth) / 2;
    for (let c = 0; c < peakWidth; c++) {
      add(peakOffset + c, peakRow);
    }
    peakRow++;
    peakWidth -= 2;
  }

  // If still fewer than `total`, add foundation blocks symmetrically
  let extra = 0;
  while (positions.length < total) {
    add(wBase1 + extra, 0);
    if (positions.length < total) {
      add(-1 - extra, 0);
    }
    extra++;
  }

  // If more than `total`, cap to `total`
  if (positions.length > total) {
    positions.length = total;
  }

  // Return strictly sorted bottom-up (row ascending, col ascending)
  positions.sort((a, b) => (a.row !== b.row ? a.row - b.row : a.col - b.col));
  return positions;
}
