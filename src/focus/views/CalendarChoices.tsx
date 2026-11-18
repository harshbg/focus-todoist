import type { TranslationKey } from '@/i18n';
import { useT } from '@/hooks/useT';
import { CALENDARS, type CalendarId } from '../domain/calendar';

export const CALENDAR_NAME: Record<CalendarId, TranslationKey> = {
  google: 'focus.calGoogle',
  outlook: 'focus.calOutlook',
  office365: 'focus.calOffice',
};
export const CALENDAR_SHORT: Record<CalendarId, TranslationKey> = {
  google: 'focus.calGoogleShort',
  outlook: 'focus.calOutlookShort',
  office365: 'focus.calOfficeShort',
};

/**
 * The calendars a planned block goes to, one checkbox each. `rowClassName`
 * lets each place keep its own look: the app's `checkrow`, the Focus page's
 * `fx-toggle`.
 */
export function CalendarChoices({ value, onChange, rowClassName }: {
  value: readonly CalendarId[];
  onChange: (next: CalendarId[]) => void;
  rowClassName: string;
}) {
  const { t } = useT();
  const toggle = (id: CalendarId, on: boolean) => onChange(CALENDARS.filter((other) => (other === id ? on : value.includes(other))));
  return <fieldset className="fx-calchoices">
    <legend>{t('focus.calAddTo')}</legend>
    {CALENDARS.map((id) => <label key={id} className={rowClassName}>
      <input type="checkbox" checked={value.includes(id)} onChange={(event) => toggle(id, event.target.checked)} />
      <span>{t(CALENDAR_NAME[id])}</span>
    </label>)}
  </fieldset>;
}
