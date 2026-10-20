import { BRICK, PALETTE } from './sprites';
import { templeBlocks } from './layout';
import { PixelSprite } from './PixelSprite';
import './pixel.css';

export interface TempleSceneProps {
  /** How many blocks have been laid so far. */
  blocks: number;
  /** Total blocks required to finish the temple (20 by default). */
  totalBlocks?: number;
  /** Pre-formatted progress counter, e.g. "0 / 20". */
  counter: string;
  /** Pre-formatted caption label, e.g. "WEEKLY TEMPLE / BUILDING". */
  caption: string;
  /** Accessible description for screen readers. */
  ariaLabel: string;
}

export function TempleScene({
  blocks,
  totalBlocks = 20,
  counter,
  caption,
  ariaLabel,
}: TempleSceneProps) {
  const width = 168;
  const height = 96;
  const groundHeight = 12;
  const groundY = height - groundHeight;

  // Ground squares: 4×4 alternating tiles matching the focus scene
  const groundTileSize = 4;
  const groundCols = Math.ceil(width / groundTileSize);
  const groundRows = groundHeight / groundTileSize;

  const allBlocks = templeBlocks(totalBlocks);
  const clampedBlocks = Math.max(0, Math.min(blocks, allBlocks.length));

  const minCol = allBlocks.length > 0 ? Math.min(...allBlocks.map((b) => b.col)) : 0;
  const maxCol = allBlocks.length > 0 ? Math.max(...allBlocks.map((b) => b.col)) : 0;
  const templeWidth = (maxCol - minCol + 1) * 8;
  const templeLeft = Math.round((width - templeWidth) / 2);

  return (
    <div
      className="px-panel px-scene px-temple-scene"
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

        {/* Ground strip */}
        <g className="px-ground">
          {Array.from({ length: groundRows }, (_, r) =>
            Array.from({ length: groundCols }, (_, c) => (
              <rect
                key={`${c}-${r}`}
                x={c * groundTileSize}
                y={groundY + r * groundTileSize}
                width={groundTileSize}
                height={groundTileSize}
                fill={(c + r) % 2 === 0 ? 'var(--px-ground)' : 'var(--px-ground-dark)'}
              />
            ))
          )}
        </g>

        {/* Temple: laid blocks as bricks, unlaid ones in --px-ghost */}
        <g className="px-temple">
          {allBlocks.map((b, i) => {
            const x = templeLeft + Math.round((b.col - minCol) * 8);
            const y = groundY - (b.row + 1) * 5;
            const isLaid = i < clampedBlocks;

            return isLaid ? (
              <PixelSprite
                key={`${b.col}-${b.row}-${i}`}
                sprite={BRICK}
                palette={PALETTE}
                x={x}
                y={y}
              />
            ) : (
              <rect
                key={`${b.col}-${b.row}-${i}`}
                x={x}
                y={y}
                width={8}
                height={5}
                fill="var(--px-ghost)"
              />
            );
          })}
        </g>
      </svg>

      {/* Caption overlay (top left) */}
      <div className="px-scene-caption">
        <span className="px-scene-caption-text">{caption}</span>
      </div>

      {/* Counter overlay (top right) */}
      <div className="px-scene-counter">
        <span className="px-scene-counter-digits">{counter}</span>
      </div>
    </div>
  );
}
