import { describe, expect, it } from 'vitest';
import {
  blockEntry, elapsedMs, formatClock, isComplete, pauseBlock, readActiveBlock,
  remainingMs, resumeBlock, startBlock,
} from './timer';

const minute = 60_000;
const startedAt = new Date(2026, 9, 20, 9, 10).getTime();
const input = {
  mode: 'focus' as const,
  taskId: '8123456789',
  title: 'Causal analysis setup',
  lane: 'Deep Dive',
  plannedMin: 30,
};

describe('running blocks', () => {
  it('starts with no time paused', () => {
    expect(startBlock(input, startedAt)).toEqual({
      ...input, startedAt, pausedMs: 0, pausedAt: null,
    });
  });

  it('does not count an ongoing pause and ignores repeated pause and resume', () => {
    const block = startBlock(input, startedAt);
    const paused = pauseBlock(block, startedAt + 2 * minute);
    expect(pauseBlock(paused, startedAt + 10 * minute)).toBe(paused);
    expect(elapsedMs(paused, startedAt + 12 * minute)).toBe(2 * minute);
    expect(remainingMs(paused, startedAt + 12 * minute)).toBe(28 * minute);

    const resumed = resumeBlock(paused, startedAt + 12 * minute);
    expect(resumed.pausedMs).toBe(10 * minute);
    expect(resumed.pausedAt).toBeNull();
    expect(resumeBlock(resumed, startedAt + 15 * minute)).toBe(resumed);
    expect(elapsedMs(resumed, startedAt + 15 * minute)).toBe(5 * minute);
  });

  it('clamps elapsed and remaining time and completes at the planned length', () => {
    const block = startBlock(input, startedAt);
    expect(elapsedMs(block, startedAt - minute)).toBe(0);
    expect(remainingMs(block, startedAt + 29 * minute)).toBe(minute);
    expect(isComplete(block, startedAt + 29 * minute)).toBe(false);
    expect(remainingMs(block, startedAt + 30 * minute)).toBe(0);
    expect(isComplete(block, startedAt + 30 * minute)).toBe(true);
    expect(remainingMs(block, startedAt + 40 * minute)).toBe(0);
  });
});

describe('logging a finished block', () => {
  it('never logs unwind or less than five focused minutes', () => {
    const block = startBlock(input, startedAt);
    expect(blockEntry({ ...block, mode: 'unwind' }, startedAt + 30 * minute)).toBeNull();
    expect(blockEntry(block, startedAt + 5 * minute - 1)).toBeNull();
    const paused = pauseBlock(block, startedAt + 4 * minute);
    expect(blockEntry(paused, startedAt + 20 * minute)).toBeNull();
  });

  it('rounds focused minutes, caps them, and writes a floating local start', () => {
    const block = startBlock(input, startedAt);
    expect(blockEntry(block, startedAt + 5 * minute)).toEqual({
      start: '2026-10-20T09:10', minutes: 5,
      taskId: input.taskId, title: input.title, lane: input.lane,
      rating: null, source: 'timed',
    });
    expect(blockEntry(block, startedAt + 5 * minute + 30_000)?.minutes).toBe(6);
    expect(blockEntry(block, startedAt + 40 * minute)?.minutes).toBe(30);
  });
});

describe('clock face', () => {
  it.each([
    [0, '00:00'], [1, '00:01'], [59_000, '00:59'],
    [3_599_000, '59:59'], [3_600_000, '1:00:00'],
    [3_661_001, '1:01:02'], [-1, '00:00'],
  ])('formats %i milliseconds as %s', (ms, expected) => {
    expect(formatClock(ms)).toBe(expected);
  });
});

describe('stored blocks', () => {
  const valid = startBlock(input, startedAt);

  it('reads a valid running or paused block', () => {
    expect(readActiveBlock(valid)).toEqual(valid);
    const paused = pauseBlock(valid, startedAt + minute);
    expect(readActiveBlock(paused)).toEqual(paused);
  });

  it.each([
    null, [], 'not an object', {},
    { ...valid, mode: 'break' },
    { ...valid, taskId: 12 },
    { ...valid, title: null },
    { ...valid, lane: false },
    { ...valid, plannedMin: 0 },
    { ...valid, plannedMin: 1.5 },
    { ...valid, startedAt: Number.NaN },
    { ...valid, pausedMs: -1 },
    { ...valid, pausedMs: Number.POSITIVE_INFINITY },
    { ...valid, pausedAt: 'yesterday' },
    { ...valid, pausedAt: startedAt - 1 },
    { ...valid, pausedAt: startedAt + minute, pausedMs: 2 * minute },
  ])('rejects an invalid stored block', (stored) => {
    expect(readActiveBlock(stored)).toBeNull();
  });
});
