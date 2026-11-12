import { create } from 'zustand';
import type { CalendarId } from './domain/calendar';

export interface CalendarLink {
  id: CalendarId;
  url: string;
}

/**
 * Calendars still to add a planned block to. A click may open one new tab, so
 * when several calendars are chosen the first opens at once and the rest wait
 * here, as buttons (MoreCalendars), until each is clicked or put away.
 */
export const useCalendarFollowUps = create<{ links: CalendarLink[] }>(() => ({ links: [] }));

export function offerCalendars(links: CalendarLink[]): void {
  useCalendarFollowUps.setState({ links });
}

/** Opens one waiting calendar, from the click on its button, and takes it off the list. */
export function openFollowUp(link: CalendarLink): void {
  window.open(link.url, '_blank', 'noopener');
  useCalendarFollowUps.setState((state) => ({ links: state.links.filter((other) => other !== link) }));
}

export function dismissFollowUps(): void {
  useCalendarFollowUps.setState({ links: [] });
}
