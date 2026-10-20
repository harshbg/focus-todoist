import type { Palette, Sprite } from './sprites';
import { spriteRects } from './sprites';
import './pixel.css';

export interface PixelSpriteProps {
  sprite: Sprite;
  palette: Palette;
  x?: number;
  y?: number;
  className?: string;
}

export function PixelSprite({ sprite, palette, x = 0, y = 0, className }: PixelSpriteProps) {
  const rects = spriteRects(sprite, palette, x, y);
  return (
    <g className={className}>
      {rects.map((r, i) => (
        <rect
          key={i}
          x={r.x}
          y={r.y}
          width={r.w}
          height={r.h}
          fill={r.fill}
        />
      ))}
    </g>
  );
}
