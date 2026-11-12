import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/Icon';
import { useT } from '@/hooks/useT';
import { setFocusPreferences, useFocusPreferences } from '../store';
import { CALENDAR_SHORT, CalendarChoices } from './CalendarChoices';

/**
 * The composer's calendar chip: it says which calendars the new task's block
 * goes to ("+ Calendar" when none), and opens the three checkboxes. The
 * choice is the same remembered one the planning dialog uses.
 */
export function CalendarChip({ disabled }: { disabled: boolean }) {
  const { t } = useT();
  const { calendars } = useFocusPreferences();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (event: PointerEvent) => { if (!wrap.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.stopPropagation(); setOpen(false); } };
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', escape, true);
    return () => { document.removeEventListener('pointerdown', away); document.removeEventListener('keydown', escape, true); };
  }, [open]);
  const on = calendars.length > 0;
  return <span className="fx-calchip-wrap" ref={wrap}>
    <button
      type="button"
      className={`fselect-face chipface fx-calchip${on ? '' : ' unset'}`}
      aria-expanded={open}
      aria-haspopup="dialog"
      disabled={disabled}
      title={disabled ? t('focus.planCalendarNoTime') : undefined}
      onClick={() => setOpen((value) => !value)}
    >
      <Icon name="calendar" size="sm" />
      <span className="fselect-value">{on ? calendars.map((id) => t(CALENDAR_SHORT[id])).join(' + ') : t('focus.planCalendarAdd')}</span>
    </button>
    {open && <div className="popover fx-calpop" role="dialog" aria-label={t('focus.calAddTo')}>
      <CalendarChoices value={calendars} onChange={(next) => setFocusPreferences({ calendars: next })} rowClassName="checkrow" />
    </div>}
  </span>;
}
