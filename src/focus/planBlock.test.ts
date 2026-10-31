import { describe, expect, it } from 'vitest';
import { item, due } from '@/test/items';
import {
  canAddToCalendar,
  canPlanBlock,
  composerCalendarUrl,
  composerPlanLength,
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

describe('canAddToCalendar (composer)', () => {
  it('accepts date strings with time of day', () => {
    expect(canAddToCalendar('2026-10-28T14:30')).toBe(true);
    expect(canAddToCalendar('2026-10-28T14:30:00')).toBe(true);
    expect(canAddToCalendar('  2026-10-28T09:00:00  ')).toBe(true);
  });

  it('refuses dates without a time of day', () => {
    expect(canAddToCalendar('2026-10-28')).toBe(false);
    expect(canAddToCalendar('2026-12-31')).toBe(false);
  });

  it('refuses empty, whitespace, null or undefined date strings', () => {
    expect(canAddToCalendar('')).toBe(false);
    expect(canAddToCalendar('   ')).toBe(false);
    expect(canAddToCalendar(null)).toBe(false);
    expect(canAddToCalendar(undefined)).toBe(false);
  });
});

describe('composerPlanLength', () => {
  it('uses estimate minutes when positive', () => {
    expect(composerPlanLength(25)).toBe(25);
    expect(composerPlanLength(90)).toBe(90);
  });

  it('defaults to 60 minutes when estimate is null, undefined, 0, or negative', () => {
    expect(composerPlanLength(null)).toBe(60);
    expect(composerPlanLength(undefined)).toBe(60);
    expect(composerPlanLength(0)).toBe(60);
    expect(composerPlanLength(-15)).toBe(60);
  });
});

describe('composerCalendarUrl', () => {
  it('builds Google Calendar URL using given estimate length', () => {
    const url = composerCalendarUrl('new-task-1', 'Build feature', '2026-10-28T15:00:00', 45, 'https://example.com/app/');
    expect(url.startsWith('https://calendar.google.com/calendar/render?')).toBe(true);

    const parsed = new URL(url);
    expect(parsed.searchParams.get('action')).toBe('TEMPLATE');
    expect(parsed.searchParams.get('text')).toBe('Focus: Build feature');
    expect(parsed.searchParams.get('dates')).toBe('20261028T150000/20261028T154500');
    expect(parsed.searchParams.get('details')).toContain('https://example.com/app/#/sidecar?task=new-task-1&min=45');
  });

  it('defaults length to 60 minutes when minutes argument is omitted or null', () => {
    const url = composerCalendarUrl('new-task-2', 'Refactor code', '2026-10-28T10:00', null, 'https://example.com/');
    const parsed = new URL(url);
    expect(parsed.searchParams.get('dates')).toBe('20261028T100000/20261028T110000');
    expect(parsed.searchParams.get('details')).toContain('min=60');
  });

  it('strips markdown from title in composer task', () => {
    const url = composerCalendarUrl('new-task-3', 'Fix [critical bug](https://issue.com) in `auth`', '2026-10-28T11:00', 30, 'https://example.com/');
    const parsed = new URL(url);
    expect(parsed.searchParams.get('text')).toBe('Focus: Fix critical bug in auth');
  });
});
