import { useT } from '@/hooks/useT';
import { dismissFollowUps, openFollowUp, useCalendarFollowUps } from '../calendarFollowUps';
import { CALENDAR_NAME } from './CalendarChoices';

/**
 * The calendars a block still waits for, after the first one opened: one
 * button each, since a browser lets a click open a single new tab.
 */
export function MoreCalendars() {
  const { t } = useT();
  const links = useCalendarFollowUps((state) => state.links);
  if (links.length === 0) return null;
  return <div className="fx-morecal" role="status" aria-live="polite">
    <p>{t('focus.calMore')}</p>
    <div className="fx-morecal-buttons">
      {links.map((link) => <button key={link.id} type="button" className="btn primary" onClick={() => openFollowUp(link)}>
        {t('focus.calAddToNamed', { name: t(CALENDAR_NAME[link.id]) })}
      </button>)}
      <button type="button" className="btn quiet" onClick={dismissFollowUps}>{t('focus.calDone')}</button>
    </div>
  </div>;
}
