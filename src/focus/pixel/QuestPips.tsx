import type { ReactElement } from 'react';
import { pipRects } from './coinPixels';
import './pixel.css';

export interface QuestPipProps {
  /** 0–1 fractional fill, or boolean (true = 1, false = 0). */
  fill: number | boolean;
  size?: number;
  className?: string;
}

export function QuestPip({ fill, size, className }: QuestPipProps): ReactElement {
  const numericFill = typeof fill === 'boolean' ? (fill ? 1 : 0) : fill;
  const rects = pipRects(numericFill);
  return (
    <svg
      viewBox="0 0 8 8"
      width={size}
      height={size}
      shapeRendering="crispEdges"
      className={className ? `px-coin ${className}` : 'px-coin'}
      aria-hidden="true"
    >
      {rects.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} fill={r.fill} />
      ))}
    </svg>
  );
}

export interface QuestPipsProps {
  /** Four pip fill fractions (0–1 each) or booleans. */
  fill: readonly [number, number, number, number] | readonly number[] | readonly boolean[];
  size?: number;
  className?: string;
  ariaLabel?: string;
}

/**
 * Four pixel-art coin pips for the daily quest, used across the scene overlay,
 * Today's progress card, and sidecar line (docs/focus/UI-POLISH.md §5).
 */
export function QuestPips({ fill, size, className, ariaLabel }: QuestPipsProps): ReactElement {
  return (
    <div
      className={className ? `px-quest-pips ${className}` : 'px-quest-pips'}
      role={ariaLabel ? 'img' : undefined}
      aria-label={ariaLabel}
      aria-hidden={!ariaLabel ? true : undefined}
    >
      {fill.map((f, i) => (
        <QuestPip key={i} fill={f} size={size} />
      ))}
    </div>
  );
}
