import { useState } from 'react';
import { format } from 'date-fns';
import { formatDuration } from '@/domain/estimates';
import type { Item } from '@/domain/types';
import { useT } from '@/hooks/useT';
import { useStore } from '@/store/store';
import { googleCalendarUrl, sidecarLink } from '../domain/calendar';
import { setFocusPreferences, useFocusPreferences } from '../store';
import { TaskSearch } from './TaskSearch';

export interface PlanFormProps {
  items?: Item[];
  task?: Item | null;
  lengths?: number[];
  onScheduled?: () => void;
}

/**
 * Shared form to plan a focus block on a task (SPEC §5.2, CALENDAR.md).
 * Sets the task's due date-time and duration in Todoist, and optionally opens
 * Google Calendar's event creation template in a new tab.
 */
export function PlanForm({ items, task: propTask, lengths: propLengths, onScheduled }: PlanFormProps) {
  const { t, locale } = useT();
  const updateTask = useStore((state) => state.updateTask);
  const prefs = useFocusPreferences();
  const lengths = propLengths ?? prefs.blockLengths;

  const [query, setQuery] = useState(propTask ? propTask.content : '');
  const [taskId, setTaskId] = useState<string | null>(propTask ? propTask.id : null);
  const [when, setWhen] = useState('');
  const [length, setLength] = useState(lengths[1] ?? lengths[0] ?? 60);
  const [addToCalendar, setAddToCalendar] = useState(() => prefs.calendarDefault);
  const [saving, setSaving] = useState(false);

  const task = propTask ?? (items ? items.find((item) => item.id === taskId) ?? null : null);
  // A recurring task's date is its rule; overwriting it would end the series.
  const recurring = Boolean(task?.due?.is_recurring);

  const toggleCalendar = (checked: boolean) => {
    setAddToCalendar(checked);
    setFocusPreferences({ calendarDefault: checked });
  };

  const schedule = async () => {
    if (!task || !when || recurring || saving) return;

    if (addToCalendar) {
      const base = typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : '';
      const link = sidecarLink(base, task.id, length);
      const url = googleCalendarUrl({
        title: task.content,
        start: when,
        minutes: length,
        link,
      });
      // Opened synchronously in the click handler before any await to avoid popup blocking.
      window.open(url, '_blank', 'noopener');
    }

    setSaving(true);
    try {
      const date = `${when}:00`;
      await updateTask(task.id, {
        due: { date, string: date, lang: 'en', timezone: null, is_recurring: false },
        duration: { amount: length, unit: 'minute' },
      });
      if (!propTask) {
        setQuery('');
        setTaskId(null);
      }
      setWhen('');
      onScheduled?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fx-plan-form">
      {!propTask && items && (
        <TaskSearch
          items={items}
          value={query}
          selectedId={taskId}
          placeholder={t('focus.taskPlaceholder')}
          onChange={(value) => { setQuery(value); setTaskId(null); }}
          onSelect={(item) => { setQuery(item.content); setTaskId(item.id); }}
        />
      )}
      <label className="fx-label">
        {t('focus.planWhen')}
        <input
          type="datetime-local"
          value={when}
          min={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
          onChange={(event) => setWhen(event.target.value)}
        />
      </label>
      <div className="fx-chips">
        {lengths.map((minutes) => (
          <button
            key={minutes}
            type="button"
            className="fx-chip"
            aria-pressed={length === minutes}
            onClick={() => setLength(minutes)}
          >
            {formatDuration(minutes, locale)}
          </button>
        ))}
      </div>
      {recurring && <p className="fx-hint">{t('focus.planRecurring')}</p>}
      <div className="fx-plan-actions">
        <button
          type="button"
          className="fx-btn fx-btn--primary"
          disabled={!task || !when || recurring || saving}
          onClick={() => void schedule()}
        >
          {t('focus.planSchedule')}
        </button>
        <label className="fx-toggle fx-plan-calendar">
          <input
            type="checkbox"
            checked={addToCalendar}
            onChange={(event) => toggleCalendar(event.target.checked)}
          />
          {t('focus.planCalendar')}
        </label>
      </div>
      <p className="fx-plan-note">{t('focus.planNote')}</p>
    </div>
  );
}
