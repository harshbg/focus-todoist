import { describe, expect, it } from 'vitest';
import { TROPHIES } from '../domain/trophies';
import { spriteSize } from './sprites';
import { WORLD_DETAILS, WORLD_PALETTE } from './world';

describe('world', () => {
  it('provides exactly one detail for every trophy id in TROPHIES', () => {
    // Exactly 39 trophies in cabinet order
    expect(TROPHIES).toHaveLength(39);

    for (const trophy of TROPHIES) {
      const detail = WORLD_DETAILS[trophy.id];
      expect(detail, `Missing detail for trophy id: ${trophy.id}`).toBeDefined();
      expect(detail.sprite.length).toBeGreaterThan(0);
    }

    // No extra, unknown ids in WORLD_DETAILS
    const detailKeys = Object.keys(WORLD_DETAILS);
    expect(detailKeys).toHaveLength(TROPHIES.length);

    const trophyIds = new Set(TROPHIES.map((t) => t.id));
    for (const key of detailKeys) {
      expect(trophyIds.has(key)).toBe(true);
    }
  });

  it('keeps all details strictly within the 160×90 viewport', () => {
    const sceneWidth = 160;
    const sceneHeight = 90;

    for (const [id, detail] of Object.entries(WORLD_DETAILS)) {
      const { w, h } = spriteSize(detail.sprite);

      expect(w, `${id} sprite width must be > 0`).toBeGreaterThan(0);
      expect(h, `${id} sprite height must be > 0`).toBeGreaterThan(0);

      expect(detail.x, `${id} x must be >= 0`).toBeGreaterThanOrEqual(0);
      expect(detail.y, `${id} y must be >= 0`).toBeGreaterThanOrEqual(0);

      expect(
        detail.x + w,
        `${id} exceeds width: x (${detail.x}) + w (${w}) = ${detail.x + w} > ${sceneWidth}`
      ).toBeLessThanOrEqual(sceneWidth);

      expect(
        detail.y + h,
        `${id} exceeds height: y (${detail.y}) + h (${h}) = ${detail.y + h} > ${sceneHeight}`
      ).toBeLessThanOrEqual(sceneHeight);
    }
  });

  it('ensures all non-dot characters in world sprites exist in WORLD_PALETTE', () => {
    for (const [id, detail] of Object.entries(WORLD_DETAILS)) {
      for (const row of detail.sprite) {
        for (const ch of row) {
          if (ch !== '.') {
            expect(
              WORLD_PALETTE[ch],
              `Unknown sprite character "${ch}" in ${id}`
            ).toBeDefined();
            expect(WORLD_PALETTE[ch]).toMatch(/^var\(--px-/);
          }
        }
      }
    }
  });

  it('places hours-10000 as the lit temple at the horizontal centre', () => {
    const litTemple = WORLD_DETAILS['hours-10000'];
    expect(litTemple).toBeDefined();

    const { w } = spriteSize(litTemple.sprite);
    const centreX = litTemple.x + w / 2;
    // Exactly at or within 1px of canvas centre (80)
    expect(Math.abs(centreX - 80)).toBeLessThanOrEqual(1);
  });

  it('contains the first stone for sessions-1', () => {
    const firstStone = WORLD_DETAILS['sessions-1'];
    expect(firstStone).toBeDefined();
    const { w, h } = spriteSize(firstStone.sprite);
    expect(w).toBeGreaterThan(0);
    expect(h).toBeGreaterThan(0);
  });
});
