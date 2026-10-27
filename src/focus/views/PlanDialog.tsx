import { Overlay } from '@/components/overlays/Overlay';
import { Icon } from '@/components/Icon';
import type { Item } from '@/domain/types';
import { useT } from '@/hooks/useT';
import { PlanForm } from './PlanForm';

export interface PlanDialogProps {
  task: Item;
  onClose: () => void;
}

/**
 * Small modal dialog opened from a task's ⋯ menu to plan a focus block (CALENDAR.md §3).
 */
export function PlanDialog({ task, onClose }: PlanDialogProps) {
  const { t } = useT();

  return (
    <Overlay open onClose={onClose} label={t('focus.planBlock')} size="sm">
      <div className="focus-theme fx-plan-dialog">
        <div className="sheet-head">
          <div>
            <p className="fx-eyebrow">{t('focus.guidanceEyebrow')}</p>
            <h2 className="fx-h2">{t('focus.planNext')}</h2>
          </div>
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
        <div className="sheet-body">
          <PlanForm task={task} onScheduled={onClose} />
        </div>
      </div>
    </Overlay>
  );
}
