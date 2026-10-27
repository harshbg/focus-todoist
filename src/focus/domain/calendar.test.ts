import { describe, expect, it } from 'vitest';
import { formatCalendarDates, googleCalendarUrl, sidecarLink } from './calendar';

describe('sidecarLink', () => {
  it('builds a sidecar link from origin + pathname', () => {
    expect(sidecarLink('https://todoist-enhanced.web.app/', 'task-42', 30))
      .toBe('https://todoist-enhanced.web.app/#/sidecar?task=task-42&min=30');
    expect(sidecarLink('http://localhost:5173/app/', '8123456789', 60))
      .toBe('http://localhost:5173/app/#/sidecar?task=8123456789&min=60');
  });

  it('normalizes base URLs without trailing slash', () => {
    expect(sidecarLink('https://example.com', 'task-1', 45))
      .toBe('https://example.com/#/sidecar?task=task-1&min=45');
  });

  it('preserves html file paths in base', () => {
    expect(sidecarLink('https://example.com/index.html', 'task-1', 45))
      .toBe('https://example.com/index.html#/sidecar?task=task-1&min=45');
  });

  it('strips any existing hash from base before appending sidecar route', () => {
    expect(sidecarLink('https://example.com/#/focus', 'task-1', 30))
      .toBe('https://example.com/#/sidecar?task=task-1&min=30');
    expect(sidecarLink('https://example.com/app/#/progress?tab=1', 'task-1', 30))
      .toBe('https://example.com/app/#/sidecar?task=task-1&min=30');
  });

  it('encodes taskId containing spaces, ampersands, and accents', () => {
    expect(sidecarLink('https://example.com/', 'task & subtask', 25))
      .toBe('https://example.com/#/sidecar?task=task%20%26%20subtask&min=25');
    expect(sidecarLink('https://example.com/', 'tâche d’été & Noël', 60))
      .toBe('https://example.com/#/sidecar?task=t%C3%A2che%20d%E2%80%99%C3%A9t%C3%A9%20%26%20No%C3%ABl&min=60');
  });
});

describe('formatCalendarDates', () => {
  it('formats dates in floating local format yyyyMMddTHHmmss/yyyyMMddTHHmmss without Z', () => {
    const dates = formatCalendarDates('2026-10-27T09:30', 60);
    expect(dates).toBe('20261027T093000/20261027T103000');
    expect(dates).not.toContain('Z');
  });

  it('handles end time crossing midnight into the next day', () => {
    expect(formatCalendarDates('2026-10-27T23:45', 30))
      .toBe('20261027T234500/20261028T001500');
  });

  it('handles end time crossing month and year boundary', () => {
    expect(formatCalendarDates('2026-12-31T23:30', 60))
      .toBe('20261231T233000/20270101T003000');
  });

  it('handles leap year day crossing (2024 leap year vs 2025 non-leap year)', () => {
    expect(formatCalendarDates('2024-02-28T23:30', 60))
      .toBe('20240228T233000/20240229T003000');
    expect(formatCalendarDates('2025-02-28T23:30', 60))
      .toBe('20250228T233000/20250301T003000');
  });
});

describe('googleCalendarUrl', () => {
  const sampleLink = 'https://example.com/#/sidecar?task=8123456789&min=60';

  it('constructs a valid Google Calendar render template URL', () => {
    const url = googleCalendarUrl({
      title: 'Deep dive into auth flow',
      start: '2026-10-27T14:00',
      minutes: 60,
      link: sampleLink,
    });

    expect(url.startsWith('https://calendar.google.com/calendar/render?')).toBe(true);

    const parsed = new URL(url);
    expect(parsed.searchParams.get('action')).toBe('TEMPLATE');
    expect(parsed.searchParams.get('text')).toBe('Focus: Deep dive into auth flow');
    expect(parsed.searchParams.get('dates')).toBe('20261027T140000/20261027T150000');
    expect(parsed.searchParams.get('details')).toBe(`Start this focus block:\n${sampleLink}`);
  });

  it('properly encodes spaces, ampersands, and accents in the title', () => {
    const url = googleCalendarUrl({
      title: 'R&D & café: révision complète',
      start: '2026-10-27T09:00',
      minutes: 30,
      link: sampleLink,
    });

    expect(url).toContain('text=Focus%3A%20R%26D%20%26%20caf%C3%A9%3A%20r%C3%A9vision%20compl%C3%A8te');

    const parsed = new URL(url);
    expect(parsed.searchParams.get('text')).toBe('Focus: R&D & café: révision complète');
  });

  it('encodes details so the sidecar link query parameters (&min=) do not leak into the calendar URL', () => {
    const url = googleCalendarUrl({
      title: 'Planning',
      start: '2026-10-27T10:00',
      minutes: 45,
      link: 'https://example.com/#/sidecar?task=abc-123&min=45',
    });

    // &min=45 in the link must be encoded as %26min%3D45, not a top-level param
    expect(url).toContain('%26min%3D45');

    const parsed = new URL(url);
    expect(parsed.searchParams.get('min')).toBeNull();
    expect(parsed.searchParams.get('details')).toContain('https://example.com/#/sidecar?task=abc-123&min=45');
  });

  it('formats dates crossing midnight correctly in the URL', () => {
    const url = googleCalendarUrl({
      title: 'Late session',
      start: '2026-10-27T23:30',
      minutes: 60,
      link: sampleLink,
    });

    expect(url).toContain('dates=20261027T233000/20261028T003000');
    expect(url).not.toContain('Z');
  });

  it('strips markdown formatting from task titles', () => {
    const url = googleCalendarUrl({
      title: 'Finish **feature** and *docs*',
      start: '2026-10-27T10:00',
      minutes: 45,
      link: sampleLink,
    });

    const parsed = new URL(url);
    expect(parsed.searchParams.get('text')).toBe('Focus: Finish feature and docs');
  });
});
