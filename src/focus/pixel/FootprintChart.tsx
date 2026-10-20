import { BRICK, PALETTE } from './sprites';
import { PixelSprite } from './PixelSprite';
import './pixel.css';

export interface FootprintChartProps {
  /** Day entries (30 entries typically); label shown under every 5th column. */
  days: Array<{ date: string; bricks: number; label?: string }>;
  /** Maximum brick capacity per day column (16 by default). */
  maxBricks?: number;
  /** Accessible description for screen readers. */
  ariaLabel: string;
}

export function FootprintChart({
  days,
  maxBricks = 16,
  ariaLabel,
}: FootprintChartProps) {
  const slotWidth = 8;
  const slotHeight = 5;
  const colGap = 2;
  const rowGap = 1;
  const labelHeight = 14;

  const numDays = days.length;
  const chartWidth = numDays > 0 ? numDays * slotWidth + (numDays - 1) * colGap : 0;
  const chartHeight = maxBricks * slotHeight + (maxBricks - 1) * rowGap;
  const totalHeight = chartHeight + labelHeight;

  const totalLabels = days.filter((item) => Boolean(item.label)).length;

  return (
    <div
      className="px-footprint-chart"
      role="img"
      aria-label={ariaLabel}
    >
      <svg
        aria-hidden="true"
        shapeRendering="crispEdges"
        viewBox={`0 0 ${chartWidth} ${totalHeight}`}
        style={{ width: '100%', height: 'auto', display: 'block' }}
      >
        {days.map((d, dayIndex) => {
          const colX = dayIndex * (slotWidth + colGap);
          const clampedBricks = Math.max(0, Math.min(d.bricks, maxBricks));
          const showLabel = Boolean(d.label) && (totalLabels <= 7 || dayIndex % 5 === 0);

          return (
            <g key={d.date} className="px-footprint-col">
              {Array.from({ length: maxBricks }, (_, s) => {
                // Stack bottom-up: slot 0 is the bottom row
                const slotY = chartHeight - slotHeight - s * (slotHeight + rowGap);
                const isLaid = s < clampedBricks;

                return isLaid ? (
                  <PixelSprite
                    key={`b-${s}`}
                    sprite={BRICK}
                    palette={PALETTE}
                    x={colX}
                    y={slotY}
                  />
                ) : (
                  <rect
                    key={`e-${s}`}
                    x={colX}
                    y={slotY}
                    width={slotWidth}
                    height={slotHeight}
                    fill="none"
                    stroke="var(--px-ghost)"
                    strokeWidth={1}
                  />
                );
              })}

              {showLabel && (
                <text
                  x={colX}
                  y={chartHeight + 11}
                  fill="var(--px-ink)"
                  fontSize={7}
                  textAnchor="start"
                  fontFamily='var(--px-font, "Silkscreen", "Press Start 2P", ui-monospace, monospace)'
                >
                  {d.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
