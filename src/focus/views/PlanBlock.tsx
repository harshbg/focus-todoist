import { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { toApiDateTime } from '@/domain/dates';
import { formatDuration } from '@/domain/estimates';
import type { Item } from '@/domain/types';
import { useT } from '@/hooks/useT';
import { useStore } from '@/store/store';
import { ReminderSettings } from './Guidance';
import { TaskSearch } from './TaskSearch';

/**
 * "Plan the next block" (SPEC §5.2): gives the task a due time and a duration
 * in Todoist, so the block lands on Todoist's calendar and Todoist's own
 * reminders fire on the phone. Nothing is kept by this app.
 */
export function PlanBlock({ items, lengths, onOpen }: { items: Item[]; lengths: number[]; onOpen: (id: string) => void }) {
  const { t, locale } = useT();
  const updateTask = useStore((state) => state.updateTask);
  const [query, setQuery] = useState('');
  const [taskId, setTaskId] = useState<string | null>(null);
  const [when, setWhen] = useState('');
  const [length, setLength] = useState(lengths[1] ?? lengths[0] ?? 60);
  const [saving, setSaving] = useState(false);
  const task = items.find((item) => item.id === taskId) ?? null;
  // A recurring task's date is its rule; overwriting it would end the series.
  const recurring = Boolean(task?.due?.is_recurring);

  /** Planned blocks still ahead: open tasks with a due time from now on, soonest first. */
  const upcoming = useMemo(() => {
    const now = toApiDateTime(new Date());
    return items.filter((item) => item.due?.date.includes('T') && item.due.date >= now)
      .sort((a, b) => a.due!.date.localeCompare(b.due!.date)).slice(0, 5);
  }, [items]);

  const schedule = async () => {
    if (!task || !when || recurring || saving) return;
    setSaving(true);
    try {
      const date = `${when}:00`;
      await updateTask(task.id, {
        due: { date, string: date, lang: 'en', timezone: null, is_recurring: false },
        duration: { amount: length, unit: 'minute' },
      });
      setQuery(''); setTaskId(null); setWhen('');
    } finally { setSaving(false); }
  };

  return <section className="fx-section fx-plan">
    <div className="fx-section-head"><div><p className="fx-eyebrow">{t('focus.guidanceEyebrow')}</p><h2 className="fx-h2">{t('focus.guidanceTitle')}</h2></div></div>
    <div className="fx-plan-grid">
      <div className="fx-card fx-plan-card">
        <p className="fx-label">{t('focus.planNext')}</p>
        <TaskSearch items={items} value={query} selectedId={taskId} placeholder={t('focus.taskPlaceholder')}
          onChange={(value) => { setQuery(value); setTaskId(null); }} onSelect={(item) => { setQuery(item.content); setTaskId(item.id); }} />
        <label className="fx-label">{t('focus.planWhen')}
          <input type="datetime-local" value={when} min={format(new Date(), "yyyy-MM-dd'T'HH:mm")} onChange={(event) => setWhen(event.target.value)} />
        </label>
        <div className="fx-chips">{lengths.map((minutes) => <button key={minutes} className="fx-chip" aria-pressed={length === minutes}
          onClick={() => setLength(minutes)}>{formatDuration(minutes, locale)}</button>)}</div>
        {recurring && <p className="fx-hint">{t('focus.planRecurring')}</p>}
        <button className="fx-btn fx-btn--primary" disabled={!task || !when || recurring || saving} onClick={() => void schedule()}>{t('focus.planSchedule')}</button>
        <p className="fx-plan-note">{t('focus.planNote')}</p>
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
