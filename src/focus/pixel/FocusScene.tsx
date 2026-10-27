import { useEffect, useRef, useState } from 'react';
import { CLOUD, PALETTE } from './sprites';
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
  /** Leaves the clock out, for a page that shows its own above the scene. */
  hideTimer?: boolean;
  /**
   * Fills a box whose height the page sets: the sky widens with the window
   * while the pyramid and trees keep their size, as in the sidecar.
   */
  fill?: boolean;
}

const TOTAL_BRICKS = 36;
const PYRAMID_ROWS = 8;
const ALL_BRICKS = pyramidBricks(PYRAMID_ROWS);

/** A brick in pyramid units, outline included; bricks sit edge to edge, so seams read twice as thick. */
const BRICK_W = 12;
const BRICK_H = 10;

/**
 * The three faces a classic platformer block comes in: [face, lit edge, shaded edge, deep shadow].
 * Picked per brick from its position, so the pyramid looks hand-laid but never changes.
 */
const BRICK_SHADES: ReadonlyArray<readonly [string, string, string, string]> = [
  ['#f6bd55', '#fde7a8', '#d9772c', '#b8521f'],
  ['#ef9632', '#f9c66a', '#cf5a22', '#a9401a'],
  ['#e3762d', '#f4a54f', '#c04a1d', '#9a3416'],
];

/**
 * One block, bevelled like the classic pyramid: a heavy outline, the light
 * falling from the top-left (a pale band across the top and down the left),
 * the shade on the right and a deeper one along the bottom.
 */
function Brick({ x, y, shade, className }: { x: number; y: number; shade: readonly [string, string, string, string]; className?: string }) {
  const [face, lit, shaded, deep] = shade;
  const o = 1.1; // outline
  const w = BRICK_W - 2 * o;
  const h = BRICK_H - 2 * o;
  return <g className={className}>
    <rect x={x} y={y} width={BRICK_W} height={BRICK_H} fill="var(--px-brick-outline, #17110b)" />
    <rect x={x + o} y={y + o} width={w} height={h} fill={face} />
    <rect x={x + o + w * 0.86} y={y + o + h * 0.16} width={w * 0.14} height={h * 0.84} fill={shaded} />
    <rect x={x + o + w * 0.12} y={y + o + h * 0.78} width={w * 0.88} height={h * 0.22} fill={deep} />
    <rect x={x + o} y={y + o} width={w} height={h * 0.16} fill={lit} />
    <rect x={x + o} y={y + o} width={w * 0.12} height={h} fill={lit} />
  </g>;
}

/**
 * The side trees: round, bushy canopies grown block by block with the pyramid. Cells
 * in growing order — the trunk, then each row of leaves from the widest up.
 * Columns are centred on 0.
 */
const TREE_ROWS = [11, 11, 11, 9, 7];
const TREE_CELLS: ReadonlyArray<{ col: number; row: number; trunk: boolean }> = [
  { col: 0, row: 0, trunk: true },
  { col: 0, row: 1, trunk: true },
  ...TREE_ROWS.flatMap((width, index) => Array.from({ length: width }, (_, i) => ({
    col: i - (width - 1) / 2, row: index + 2, trunk: false,
  }))),
];
const TREE_TOTAL_ROWS = TREE_ROWS.length + 2;

function GrowingTree({ x, groundY, cell, progress }: { x: number; groundY: number; cell: number; progress: number }) {
  const laid = bricksLaid(progress, TREE_CELLS.length);
  return <g className="px-tree">
    {TREE_CELLS.map((c, index) => {
      const cx = x + c.col * cell - cell / 2;
      const cy = groundY - (c.row + 1) * cell;
      if (index >= laid) {
        return <rect key={index} className={index === laid && progress > 0 && progress < 1 ? 'px-filling' : undefined} x={cx + 0.3} y={cy + 0.3} width={cell - 0.6} height={cell - 0.6}
          fill="var(--px-ghost-fill, rgba(255,255,255,.28))" stroke="var(--px-ghost-line, rgba(30,42,54,.22))" strokeWidth={0.4} />;
      }
      const [face, hi, lo] = c.trunk
        ? ['var(--px-trunk)', '#8a5530', '#4a2a12']
        : (index % 3 === 0 ? ['#58b04a', '#9fe07a', '#2c6b2a'] : index % 3 === 1 ? ['#3e8a3a', '#7cc35c', '#20501f'] : ['#4c9e3f', '#8fd46c', '#265f23']);
      return <g key={index}>
        <rect x={cx} y={cy} width={cell} height={cell} fill="var(--px-brick-outline, #1b130c)" />
        <rect x={cx + 0.5} y={cy + 0.5} width={cell - 1} height={cell - 1} fill={lo} />
        <rect x={cx + 0.5} y={cy + 0.5} width={cell - 1.4} height={cell - 1.4} fill={hi} />
        <rect x={cx + 0.9} y={cy + 0.9} width={cell - 1.8} height={cell - 1.8} fill={face} />
      </g>;
    })}
  </g>;
}

/** Fireworks run for this long after a block completes, then the sky goes quiet. */
const CELEBRATION_MS = 5000;

export function FocusScene({
  progress,
  time,
  quest,
  celebrating = false,
  variant = 'card',
  ariaLabel,
  hideTimer = false,
  fill = false,
}: FocusSceneProps) {
  const isWide = variant === 'wide';
  const panel = useRef<HTMLDivElement>(null);
  const [aspect, setAspect] = useState(3.5);
  useEffect(() => {
    const element = panel.current;
    if (!fill || !element || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setAspect(width / height);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [fill]);
  const [bursting, setBursting] = useState(false);
  useEffect(() => {
    if (!celebrating) { setBursting(false); return; }
    setBursting(true);
    const timer = window.setTimeout(() => setBursting(false), CELEBRATION_MS);
    return () => window.clearTimeout(timer);
  }, [celebrating]);
  // Wide: 280×80 (3.5:1), Card: 192×120 (1.6:1)
  const height = fill ? 120 : isWide ? 80 : 120;
  const width = fill ? Math.max(192, Math.round(height * aspect)) : isWide ? 280 : 192;
  const groundHeight = 12;
  const groundY = height - groundHeight;
  const skyHeight = groundY;

  // Pyramid scaling:
  // Complete 8-row pyramid spans about 45% of scene width and about 60% of sky height in card.
  // In wide, apply the same pyramid scale relative to its height.
  const pyramidUnitsW = PYRAMID_ROWS * BRICK_W;
  const pyramidUnitsH = PYRAMID_ROWS * BRICK_H;
  // One scale for both axes keeps the bricks square-cornered, as in the classic pyramid.
  const scale = (skyHeight * (fill ? 0.58 : 0.66)) / pyramidUnitsH;
  const scaleX = scale;
  const scaleY = scale;

  const pyramidWidth = pyramidUnitsW * scaleX;
  const pyramidHeight = pyramidUnitsH * scaleY;
  const pyramidLeft = Math.round((width - pyramidWidth) / 2);
  const pyramidTop = groundY - pyramidHeight;

  // Trees: tiered pines that grow with the block, centred in the space beside the pyramid.
  const treeCell = fill
    ? (skyHeight * 0.26) / TREE_TOTAL_ROWS
    : Math.min((pyramidLeft - 4) / 11.5, (skyHeight * 0.5) / TREE_TOTAL_ROWS);
  // A filled scene keeps its trees near the edges, however wide the sky.
  const treeInset = fill ? treeCell * 6 + 4 : pyramidLeft / 2;
  const leftTreeX = treeInset;
  const rightTreeX = width - treeInset;
  const treeProgress = Math.max(0, Math.min(1, progress));

  // Clouds: in the sky
  const cloud1 = fill ? { x: Math.round(width * 0.14), y: 16 } : isWide ? { x: 42, y: 10 } : { x: 26, y: 14 };
  const cloud2 = fill ? { x: Math.round(width * 0.54), y: 24 } : isWide ? { x: 196, y: 14 } : { x: 130, y: 20 };

  // Pyramid bricks to render at current progress
  const laidCount = bricksLaid(progress, TOTAL_BRICKS);
  const visibleBricks = ALL_BRICKS.slice(0, laidCount);

  // Ground tiles: one row of wide alternating squares
  const groundTileSize = 8;
  const groundCols = Math.ceil(width / groundTileSize);

  return (
    <div
      ref={panel}
      className={`px-panel px-scene px-scene--${variant}${fill ? ' px-scene--fill' : ''}`}
      role="img"
      aria-label={ariaLabel}
    >
      <svg
        aria-hidden="true"
        shapeRendering="crispEdges"
        viewBox={`0 0 ${width} ${height}`}
        style={fill ? { width: '100%', height: '100%', display: 'block' } : { width: '100%', height: 'auto', display: 'block' }}
      >
        {/* Sky */}
        <rect width={width} height={height} fill="var(--px-sky)" />

        {/* Clouds */}
        <PixelSprite sprite={CLOUD} palette={PALETTE} x={cloud1.x} y={cloud1.y} />
        <PixelSprite sprite={CLOUD} palette={PALETTE} x={cloud2.x} y={cloud2.y} />

        {/* Ground: a dark lip, a row of two-tone tiles, a dark base */}
        <g className="px-ground">
          <rect x={0} y={groundY} width={width} height={groundHeight} fill="var(--px-ground-base, #1b130c)" />
          <rect x={0} y={groundY} width={width} height={1.5} fill="var(--px-mortar)" />
          {Array.from({ length: groundCols }, (_, c) => (
            <rect key={c} x={c * groundTileSize} y={groundY + 1.5} width={groundTileSize} height={groundHeight - 4.5}
              fill={c % 2 === 0 ? 'var(--px-ground)' : 'var(--px-ground-dark)'} />
          ))}
        </g>

        {/* Trees grow block by block with the pyramid */}
        <GrowingTree x={leftTreeX} groundY={groundY} cell={treeCell} progress={treeProgress} />
        <GrowingTree x={rightTreeX} groundY={groundY} cell={treeCell} progress={treeProgress} />

        {/* Centred pyramid */}
        <g
          className="px-pyramid"
          transform={`translate(${pyramidLeft}, ${pyramidTop}) scale(${scaleX}, ${scaleY})`}
        >
          {/* Bricks still to lay wait as faint outlines, so the whole pyramid is in view from the start. */}
          {ALL_BRICKS.slice(laidCount).map((b, index) => (
            <rect key={`ghost-${b.col}-${b.row}`} className={index === 0 && progress > 0 && progress < 1 ? 'px-ghost-brick px-filling' : 'px-ghost-brick'}
              x={b.col * BRICK_W + 1} y={(PYRAMID_ROWS - 1 - b.row) * BRICK_H + 1} width={BRICK_W - 2} height={BRICK_H - 2}
              fill="var(--px-ghost-fill, rgba(255,255,255,.28))" stroke="var(--px-ghost-line, rgba(30,42,54,.28))" strokeWidth={0.8} />
          ))}
          {visibleBricks.map((b) => (
            <Brick
              key={`${b.col}-${b.row}`}
              x={b.col * BRICK_W}
              y={(PYRAMID_ROWS - 1 - b.row) * BRICK_H}
              shade={BRICK_SHADES[(Math.round(b.col * 2) * 7 + b.row * 5) % BRICK_SHADES.length]}
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
      {!hideTimer && <div className="px-timer-box">
        <span className="px-timer-digits">{time}</span>
      </div>}

      {/* Fireworks celebration */}
      {bursting && <Fireworks />}
    </div>
  );
}
