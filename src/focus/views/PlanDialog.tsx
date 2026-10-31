import { useState } from 'react';
import { Overlay } from '@/components/overlays/Overlay';
import { DateField } from '@/components/DateField';
import { EstimateField } from '@/components/EstimateField';
import { Icon } from '@/components/Icon';
import type { Item } from '@/domain/types';
import { hasTime } from '@/domain/dates';
import { useT } from '@/hooks/useT';
import { canPlanBlock, initialPlanLength, usePlanBlock } from '../planBlock';
import { setFocusPreferences, useFocusPreferences } from '../store';
import './focus.css';

export interface PlanDialogProps {
  task: Item;
  onClose: () => void;
}

/**
 * Small modal dialog opened from a task's ⋯ menu or task panel to plan a focus block (PLAN-UI.md §1).
 * Built with the app's own dialog chrome (Overlay size="sm", sheet-head, sheet-body, sheet-foot).
 */
export function PlanDialog({ task, onClose }: PlanDialogProps) {
  const { t } = useT();
  const prefs = useFocusPreferences();
  const { schedule, saving } = usePlanBlock();

  // Prefill when with task's due date if it has one and carries a time, else empty
  const [when, setWhen] = useState(() => (task.due && hasTime(task.due) ? task.due.date : ''));
  // Prefill length with task's duration or estimate if it has one, else 60 minutes
  const [length, setLength] = useState(() => initialPlanLength(task));
  const [addToCalendar, setAddToCalendar] = useState(() => prefs.calendarDefault);

  const recurring = Boolean(task.due?.is_recurring);
  const canSchedule = canPlanBlock(task, when, length) && !saving;

  const toggleCalendar = (checked: boolean) => {
    setAddToCalendar(checked);
    setFocusPreferences({ calendarDefault: checked });
  };

  const handleSchedule = async () => {
    if (!canSchedule) return;
    const ok = await schedule(task, when, length, addToCalendar);
    if (ok) {
      onClose();
    }
  };

  return (
    <Overlay open onClose={onClose} label={t('focus.planNext')} size="sm">
      <div className="sheet-head">
        <h2>{t('focus.planNext')}</h2>
        <button
          className="iconbtn"
          type="button"
          aria-label={t('common.close')}
          title={t('common.close')}
          onClick={onClose}
        >
          <Icon name="close" />
        </button>
      </div>

      <div className="sheet-body plan-dialog-body">
        <div className="formfield">
          <span className="fieldlabel">
            {t('focus.planWhen')}
          </span>
          <DateField
            withTime
            value={when}
            label={t('focus.planWhen')}
            placeholder={t('date.pick')}
            onChange={(val) => setWhen(val)}
          />
        </div>

        <div className="formfield">
          <span className="fieldlabel">
            {t('detail.estimate')}
          </span>
          <EstimateField
            minutes={length}
            onCommit={(val) => setLength(val && val > 0 ? val : 60)}
            onChange={(val) => {
              if (val !== null && val > 0) setLength(val);
            }}
          />
        </div>

        <label className="checkrow">
          <input
            type="checkbox"
            checked={addToCalendar}
            onChange={(e) => toggleCalendar(e.target.checked)}
          />
          <span>{t('focus.planCalendar')}</span>
        </label>

        {recurring && (
          <p className="menuhint" style={{ color: 'var(--warn)' }}>
            {t('focus.planRecurring')}
          </p>
        )}

        <p className="menuhint">{t('focus.planNote')}</p>
      </div>

      <div className="sheet-foot">
        <button type="button" className="btn quiet" onClick={onClose}>
          {t('common.cancel')}
        </button>
        <button
          type="button"
          className="btn primary"
          disabled={!canSchedule}
          onClick={() => void handleSchedule()}
        >
          {t('focus.planSchedule')}
        </button>
      </div>
    </Overlay>
  );
}
