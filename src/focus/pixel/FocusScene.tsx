import { BRICK, CLOUD, PALETTE, TREE } from './sprites';
import { bricksLaid, pyramidBricks } from './layout';
import { PixelSprite } from './PixelSprite';
import { Fireworks } from './Fireworks';
import './pixel.css';

export interface FocusSceneProps {
  /** 0–1 through the current block; the pyramid lays bricks bottom-up as it rises. 1 = complete pyramid. */
  progress: number;
  /** Pre-formatted, e.g. "24:13". */
  time: string;
  quest: {
    label: string;
    minutesLabel: string;
    pips: [boolean, boolean, boolean, boolean];
  };
  /** Shows <Fireworks/> over the scene. */
  celebrating?: boolean;
  /** 'wide' for the sidecar banner (≈ 3.5:1), 'card' for the main page (≈ 1.6:1). */
  variant?: 'card' | 'wide';
  /** Accessible description, already translated. */
  ariaLabel: string;
}

const TOTAL_BRICKS = 36;
const PYRAMID_ROWS = 8;
const ALL_BRICKS = pyramidBricks(PYRAMID_ROWS);

export function FocusScene({
  progress,
  time,
  quest,
  celebrating = false,
  variant = 'card',
  ariaLabel,
}: FocusSceneProps) {
  const isWide = variant === 'wide';
  // Wide: 280×80 (3.5:1), Card: 192×120 (1.6:1)
  const width = isWide ? 280 : 192;
  const height = isWide ? 80 : 120;
  const groundHeight = 12;
  const groundY = height - groundHeight;
  const skyHeight = groundY;

  // Pyramid scaling:
  // Complete 8-row pyramid spans about 45% of scene width and about 60% of sky height in card.
  // In wide, apply the same pyramid scale relative to its height.
  const scaleY = (skyHeight * 0.6) / 40;
  const scaleX = isWide ? scaleY : (width * 0.45) / 64;

  const pyramidWidth = 64 * scaleX;
  const pyramidHeight = 40 * scaleY;
  const pyramidLeft = Math.round((width - pyramidWidth) / 2);
  const pyramidTop = groundY - pyramidHeight;

  // Trees: 1.5× bigger, standing on the ground strip
  const treeScale = 1.5;
  const treeW = 11 * treeScale;
  const treeH = 14 * treeScale;
  const treeY = groundY - treeH;
  const leftTreeX = isWide ? 16 : 10;
  const rightTreeX = width - leftTreeX - treeW;

  // Clouds: in the sky
  const cloud1 = isWide ? { x: 42, y: 10 } : { x: 26, y: 14 };
  const cloud2 = isWide ? { x: 196, y: 14 } : { x: 130, y: 20 };

  // Pyramid bricks to render at current progress
  const laidCount = bricksLaid(progress, TOTAL_BRICKS);
  const visibleBricks = ALL_BRICKS.slice(0, laidCount);

  // Ground squares: 4×4 alternating tiles
  const groundTileSize = 4;
  const groundCols = Math.ceil(width / groundTileSize);
  const groundRows = groundHeight / groundTileSize; // 3 rows

  return (
    <div
      className={`px-panel px-scene px-scene--${variant}`}
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

        {/* Clouds */}
        <PixelSprite sprite={CLOUD} palette={PALETTE} x={cloud1.x} y={cloud1.y} />
        <PixelSprite sprite={CLOUD} palette={PALETTE} x={cloud2.x} y={cloud2.y} />

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

        {/* Trees (1.5× bigger) */}
        <g transform={`translate(${leftTreeX}, ${treeY}) scale(${treeScale})`}>
          <PixelSprite sprite={TREE} palette={PALETTE} />
        </g>
        <g transform={`translate(${rightTreeX}, ${treeY}) scale(${treeScale})`}>
          <PixelSprite sprite={TREE} palette={PALETTE} />
        </g>

        {/* Centred pyramid */}
        <g
          className="px-pyramid"
          transform={`translate(${pyramidLeft}, ${pyramidTop}) scale(${scaleX}, ${scaleY})`}
        >
          {visibleBricks.map((b) => (
            <PixelSprite
              key={`${b.col}-${b.row}`}
              sprite={BRICK}
              palette={PALETTE}
              x={b.col * 8}
              y={(PYRAMID_ROWS - 1 - b.row) * 5}
            />
          ))}
        </g>
      </svg>

      {/* Quest overlay (top left) */}
      <div className="px-quest">
        <span className="px-quest-label">{quest.label}</span>
        <span className="px-quest-minutes">{quest.minutesLabel}</span>
        <div className="px-quest-pips" aria-hidden="true">
          {quest.pips.map((lit, i) => (
            <span
              key={i}
              className={`px-quest-pip ${lit ? 'px-quest-pip--lit' : 'px-quest-pip--unlit'}`}
            />
          ))}
        </div>
      </div>

      {/* Timer overlay (top right) */}
      <div className="px-timer-box">
        <span className="px-timer-digits">{time}</span>
      </div>

      {/* Fireworks celebration */}
      {celebrating && <Fireworks />}
    </div>
  );
}
