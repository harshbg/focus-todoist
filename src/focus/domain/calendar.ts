import { addMinutes, format, parseISO } from 'date-fns';
import { plainTitle } from '@/domain/markdown';

/**
 * Google Calendar integration and sidecar link generation for planned focus blocks.
 *
 * Scheduling a focus block can optionally open Google Calendar's public event-template
 * URL in a new tab so the user can save the event there without any API keys or OAuth.
 */

/**
 * Builds the sidecar URL for a specific task and planned duration.
 * Format: <origin><pathname>#/sidecar?task=<taskId>&min=<minutes>
 */
export function sidecarLink(base: string, taskId: string, minutes: number): string {
  const stripped = base.replace(/#.*$/, '');
  let prefix = stripped;
  if (stripped.length > 0) {
    if (stripped.endsWith('/') || stripped.endsWith('.html') || stripped.endsWith('.htm')) {
      prefix = stripped;
    } else if (stripped.includes('://') && !stripped.split('://')[1].includes('/')) {
      prefix = `${stripped}/`;
    }
  }
  return `${prefix}#/sidecar?task=${encodeURIComponent(taskId)}&min=${encodeURIComponent(minutes)}`;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** Formats a Date object in UTC to floating local format yyyyMMddTHHmmss */
function formatUtcAsFloating(d: Date): string {
  const yyyy = String(d.getUTCFullYear()).padStart(4, '0');
  const mm = pad2(d.getUTCMonth() + 1);
  const dd = pad2(d.getUTCDate());
  const hh = pad2(d.getUTCHours());
  const min = pad2(d.getUTCMinutes());
  const ss = pad2(d.getUTCSeconds());
  return `${yyyy}${mm}${dd}T${hh}${min}${ss}`;
}

/**
 * Computes the START/END dates string in floating local time (yyyyMMddTHHmmss/yyyyMMddTHHmmss).
 * Start is parsed without machine timezone offset (via Date.UTC) and end is start + minutes.
 */
export function formatCalendarDates(start: string, minutes: number): string {
  const [datePart, timePart] = start.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute, second = 0] = timePart.split(':').map(Number);
  // Using Date.UTC prevents the host machine's timezone or DST rules from altering the floating time.
  const startDate = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  const endDate = new Date(Date.UTC(year, month - 1, day, hour, minute + minutes, second));
  return `${formatUtcAsFloating(startDate)}/${formatUtcAsFloating(endDate)}`;
}

export interface GoogleCalendarInput {
  title: string;
  start: string; /* yyyy-MM-ddTHH:mm */
  minutes: number;
  link: string;
}

/**
 * Builds the public Google Calendar event template URL:
 * https://calendar.google.com/calendar/render?action=TEMPLATE&text=…&dates=START/END&details=…
 */
export function googleCalendarUrl(input: GoogleCalendarInput): string {
  const dates = formatCalendarDates(input.start, input.minutes);
  const text = encodeURIComponent(`Focus: ${plainTitle(input.title)}`);
  const details = encodeURIComponent(`Start this focus block:\n${input.link}`);
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${dates}&details=${details}`;
}

/** The calendars a planned block can be added to, in the order they are offered and opened. */
export type CalendarId = 'google' | 'outlook' | 'office365';
export const CALENDARS: readonly CalendarId[] = ['google', 'outlook', 'office365'];

/** Outlook's hosts: Outlook.com for personal accounts, Outlook on the web for work or school ones. */
const OUTLOOK_HOSTS = { outlook: 'outlook.live.com', office365: 'outlook.office.com' } as const;

/**
 * The start and end Outlook reads: ISO times carrying this device's offset for
 * that date, so the event lands at the planned hour whatever the calendar's
 * own time zone. The start is the block's floating local time.
 */
export function outlookDates(start: string, minutes: number): { startdt: string; enddt: string } {
  const begin = parseISO(start);
  const stamp = (date: Date) => format(date, "yyyy-MM-dd'T'HH:mm:ssXXX");
  return { startdt: stamp(begin), enddt: stamp(addMinutes(begin, minutes)) };
}

/** Outlook's "new event" page, filled in. */
export function outlookCalendarUrl(id: 'outlook' | 'office365', input: GoogleCalendarInput): string {
  const { startdt, enddt } = outlookDates(input.start, input.minutes);
  const query = [
    ['path', '/calendar/action/compose'],
    ['rru', 'addevent'],
    ['subject', `Focus: ${plainTitle(input.title)}`],
    ['startdt', startdt],
    ['enddt', enddt],
    ['body', `Start this focus block:\n${input.link}`],
  ].map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join('&');
  return `https://${OUTLOOK_HOSTS[id]}/calendar/0/deeplink/compose?${query}`;
}

/** The "new event" page of any calendar the app offers, filled in with the block. */
export function calendarUrl(id: CalendarId, input: GoogleCalendarInput): string {
  return id === 'google' ? googleCalendarUrl(input) : outlookCalendarUrl(id, input);
}
