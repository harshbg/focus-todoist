import { describe, expect, it } from 'vitest';
import { item, due } from '@/test/items';
import {
  canPlanBlock,
  getCalendarUrl,
  initialPlanLength,
  normalizeStartDateTime,
} from './planBlock';

describe('canPlanBlock', () => {
  it('accepts a valid task with a start time and positive minutes', () => {
    const task = item({ id: 'task-1', content: 'Focus work' });
    expect(canPlanBlock(task, '2026-10-28T14:30', 60)).toBe(true);
    expect(canPlanBlock(task, '2026-10-28T14:30:00', 45)).toBe(true);
  });

  it('accepts a valid task when minutes argument is omitted', () => {
    const task = item({ id: 'task-1', content: 'Focus work' });
    expect(canPlanBlock(task, '2026-10-28T14:30')).toBe(true);
  });

  it('refuses null task', () => {
    expect(canPlanBlock(null, '2026-10-28T14:30', 60)).toBe(false);
  });

  it('refuses recurring tasks so the recurrence rule is not overwritten', () => {
    const task = item({
      id: 'task-recur',
      due: due('2026-10-28T09:00:00', { is_recurring: true, string: 'every day at 9am' }),
    });
    expect(canPlanBlock(task, '2026-10-28T14:00', 60)).toBe(false);
  });

  it('refuses dates that lack a time of day', () => {
    const task = item({ id: 'task-1' });
    expect(canPlanBlock(task, '2026-10-28', 60)).toBe(false);
    expect(canPlanBlock(task, '', 60)).toBe(false);
    expect(canPlanBlock(task, '   ', 60)).toBe(false);
  });

  it('refuses zero, negative, or non-finite minutes when minutes are provided', () => {
    const task = item({ id: 'task-1' });
    expect(canPlanBlock(task, '2026-10-28T14:00', 0)).toBe(false);
    expect(canPlanBlock(task, '2026-10-28T14:00', -15)).toBe(false);
    expect(canPlanBlock(task, '2026-10-28T14:00', Number.NaN)).toBe(false);
  });
});

describe('normalizeStartDateTime', () => {
  it('appends :00 to YYYY-MM-DDTHH:mm strings', () => {
    expect(normalizeStartDateTime('2026-10-28T14:30')).toBe('2026-10-28T14:30:00');
  });

  it('preserves YYYY-MM-DDTHH:mm:ss strings unchanged', () => {
    expect(normalizeStartDateTime('2026-10-28T14:30:45')).toBe('2026-10-28T14:30:45');
    expect(normalizeStartDateTime('2026-10-28T14:30:00')).toBe('2026-10-28T14:30:00');
  });

  it('trims leading and trailing whitespace', () => {
    expect(normalizeStartDateTime('  2026-10-28T09:15  ')).toBe('2026-10-28T09:15:00');
  });
});

describe('initialPlanLength', () => {
  it('prefills from task duration field when present and positive', () => {
    const task = item({
      duration: { amount: 45, unit: 'minute' },
      labels: ['est-25'],
    });
    expect(initialPlanLength(task)).toBe(45);
  });

  it('prefills from task estimate tag when duration is absent', () => {
    const task = item({
      duration: null,
      labels: ['work', 'est-25'],
    });
    expect(initialPlanLength(task)).toBe(25);
  });

  it('falls back to 60 minutes when task has neither duration nor estimate', () => {
    const task = item({
      duration: null,
      labels: ['work'],
    });
    expect(initialPlanLength(task)).toBe(60);
  });

  it('falls back to 60 minutes for null task', () => {
    expect(initialPlanLength(null)).toBe(60);
  });
});

describe('getCalendarUrl', () => {
  it('generates a Google Calendar event template URL embedding the sidecar deep-link', () => {
    const task = item({
      id: 'task-88',
      content: 'Write architectural specification',
    });
    const url = getCalendarUrl(task, '2026-10-28T10:00', 90, 'https://example.com/app/');

    expect(url.startsWith('https://calendar.google.com/calendar/render?')).toBe(true);

    const parsed = new URL(url);
    expect(parsed.searchParams.get('action')).toBe('TEMPLATE');
    expect(parsed.searchParams.get('text')).toBe('Focus: Write architectural specification');
    expect(parsed.searchParams.get('dates')).toBe('20261028T100000/20261028T113000');
    expect(parsed.searchParams.get('details')).toContain('https://example.com/app/#/sidecar?task=task-88&min=90');
  });

  it('strips markdown formatting from task title', () => {
    const task = item({
      id: 'task-89',
      content: 'Review **design** [RFC](https://example.com)',
    });
    const url = getCalendarUrl(task, '2026-10-28T14:00', 30, 'https://example.com/');
    const parsed = new URL(url);
    expect(parsed.searchParams.get('text')).toBe('Focus: Review design RFC');
  });
});
