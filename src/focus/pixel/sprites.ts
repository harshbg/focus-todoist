/** A sprite is rows of characters; '.' is transparent, any other char is looked up in the palette. */
export type Sprite = readonly string[];
export type Palette = Readonly<Record<string, string>>; // char -> CSS colour, e.g. 'var(--px-leaf)'

export interface PixelRect {
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
}

/** One rect per horizontal run of the same char, so a 16×16 sprite isn't 256 nodes. Throws on a char missing from the palette. */
export function spriteRects(
  sprite: Sprite,
  palette: Palette,
  offsetX = 0,
  offsetY = 0
): PixelRect[] {
  const rects: PixelRect[] = [];
  for (let y = 0; y < sprite.length; y++) {
    const row = sprite[y];
    let x = 0;
    while (x < row.length) {
      const char = row[x];
      if (char === '.') {
        x++;
        continue;
      }
      const fill = palette[char];
      if (fill === undefined) {
        throw new Error(`Missing palette entry for character "${char}"`);
      }
      let runLength = 1;
      while (x + runLength < row.length && row[x + runLength] === char) {
        runLength++;
      }
      rects.push({
        x: offsetX + x,
        y: offsetY + y,
        w: runLength,
        h: 1,
        fill,
      });
      x += runLength;
    }
  }
  return rects;
}

/** Width and height of a sprite (width = longest row). */
export function spriteSize(sprite: Sprite): { w: number; h: number } {
  const h = sprite.length;
  let w = 0;
  for (let i = 0; i < h; i++) {
    if (sprite[i].length > w) {
      w = sprite[i].length;
    }
  }
  return { w, h };
}

/** Shared sprites: TREE (≈11×14), CLOUD (≈12×4), BRICK (8×5, light top edge, dark bottom edge, mortar outline). */
export const TREE: Sprite = [
  '....ggg....',
  '...ggggg...',
  '..gggggggD.',
  '.ggggggggDD',
  '.ggggggggDD',
  'gggggggggDD',
  'gggggggggDD',
  '.gggggggDDD',
  '..ggggggDD.',
  '...ggggDD..',
  '....TTT....',
  '....TTT....',
  '....TTT....',
  '...TTTTT...',
];

export const CLOUD: Sprite = [
  '...cccccc...',
  '.cccccccccc.',
  'cccccccccccc',
  '..cccccccc..',
];

export const BRICK: Sprite = [
  'mmmmmmmm',
  'mLLLLLLm',
  'mbbbbbbm',
  'mddddddm',
  'mmmmmmmm',
];

/** Maps the chars used by the shared sprites to var(--px-*) colours. */
export const PALETTE: Palette = {
  // Brick: mortar outline, light top edge, brick body, dark bottom edge
  m: 'var(--px-mortar)',
  L: 'var(--px-brick-light)',
  b: 'var(--px-brick)',
  d: 'var(--px-brick-dark)',
  // Cloud
  c: 'var(--px-cloud)',
  // Tree: leaf, dark leaf, trunk
  g: 'var(--px-leaf)',
  D: 'var(--px-leaf-dark)',
  T: 'var(--px-trunk)',
};
