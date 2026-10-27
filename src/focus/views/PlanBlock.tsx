import { useMemo } from 'react';
import { parseISO } from 'date-fns';
import { toApiDateTime } from '@/domain/dates';
import { formatDuration } from '@/domain/estimates';
import type { Item } from '@/domain/types';
import { useT } from '@/hooks/useT';
import { ReminderSettings } from './Guidance';
import { PlanForm } from './PlanForm';

/**
 * "Plan the next block" (SPEC §5.2): gives the task a due time and a duration
 * in Todoist, so the block lands on Todoist's calendar and Todoist's own
 * reminders fire on the phone. Nothing is kept by this app.
 */
export function PlanBlock({ items, lengths, onOpen }: { items: Item[]; lengths: number[]; onOpen: (id: string) => void }) {
  const { t, locale } = useT();

  /** Planned blocks still ahead: open tasks with a due time from now on, soonest first. */
  const upcoming = useMemo(() => {
    const now = toApiDateTime(new Date());
    return items.filter((item) => item.due?.date.includes('T') && item.due.date >= now)
      .sort((a, b) => a.due!.date.localeCompare(b.due!.date)).slice(0, 5);
  }, [items]);

  return <section className="fx-section fx-plan">
    <div className="fx-section-head"><div><p className="fx-eyebrow">{t('focus.guidanceEyebrow')}</p><h2 className="fx-h2">{t('focus.guidanceTitle')}</h2></div></div>
    <div className="fx-plan-grid">
      <div className="fx-card fx-plan-card">
        <p className="fx-label">{t('focus.planNext')}</p>
        <PlanForm items={items} lengths={lengths} />
      </div>
      <div className="fx-card fx-plan-card">
        <p className="fx-label">{t('focus.planUpcoming')}</p>
        {upcoming.length === 0
          ? <p className="fx-plan-note">{t('focus.planNone')}</p>
          : <ul className="fx-queue">{upcoming.map((item) => <li key={item.id} className="fx-queue-item"><i className="fx-mark" aria-hidden="true" />
            <div className="fx-queue-text"><button className="fx-queue-title" onClick={() => onOpen(item.id)}>{item.content}</button>
              <span className="fx-queue-meta">{new Intl.DateTimeFormat(locale, { weekday: 'short', hour: 'numeric', minute: '2-digit' }).format(parseISO(item.due!.date))}
                {item.duration ? ` · ${formatDuration(item.duration.unit === 'day' ? item.duration.amount * 1440 : item.duration.amount, locale)}` : ''}</span></div>
          </li>)}</ul>}
      </div>
      <ReminderSettings />
    </div>
  </section>;
}
