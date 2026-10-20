import { spriteSize } from './sprites';
import type { WorldDetail } from './world';
import { WORLD_DETAILS, WORLD_PALETTE } from './world';
import { PixelSprite } from './PixelSprite';
import './pixel.css';

export interface WorldSceneProps {
  /** Trophy ids that have been unlocked so far. */
  unlocked: readonly string[];
  /** Accessible description for screen readers. */
  ariaLabel: string;
}

export function WorldScene({ unlocked, ariaLabel }: WorldSceneProps) {
  const width = 160;
  const height = 90;
  const groundY = 50;

  // Deduplicate unlocked trophy ids and retrieve corresponding details
  const seen = new Set<string>();
  const detailsToRender: Array<{ id: string; detail: WorldDetail }> = [];

  for (const id of unlocked) {
    if (!seen.has(id)) {
      seen.add(id);
      const detail = WORLD_DETAILS[id];
      if (detail) {
        detailsToRender.push({ id, detail });
      }
    }
  }

  // Painter's algorithm: sort back-to-front so foreground details sit in front of background
  detailsToRender.sort((a, b) => {
    const bottomA = a.detail.y + spriteSize(a.detail.sprite).h;
    const bottomB = b.detail.y + spriteSize(b.detail.sprite).h;
    return bottomA - bottomB;
  });

  return (
    <div
      className="px-panel px-scene px-world-scene"
      role="img"
      aria-label={ariaLabel}
    >
      <svg
        aria-hidden="true"
        shapeRendering="crispEdges"
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: '100%', height: 'auto', display: 'block' }}
      >
        {/* Sky */}
        <rect width={width} height={height} fill="var(--px-sky)" />

        {/* Ground clearing */}
        <rect
          y={groundY}
          width={width}
          height={height - groundY}
          fill="var(--px-ground)"
        />
        <rect
          y={groundY}
          width={width}
          height={1}
          fill="var(--px-ground-dark)"
        />

        {/* Unlocked world details */}
        <g className="px-world-details">
          {detailsToRender.map(({ id, detail }) => (
            <PixelSprite
              key={id}
              sprite={detail.sprite}
              palette={WORLD_PALETTE}
              x={detail.x}
              y={detail.y}
            />
          ))}
        </g>
      </svg>
    </div>
  );
}
