import { useMode, setMode } from '../mode-store';
import { useT } from '@/hooks/useT';
import './mode.css';

interface ModeSwitchProps {
  className?: string;
}

/**
 * Work | Personal segmented control (SPEC §10.2).
 * Switches the global focus mode between Work and Personal.
 */
export function ModeSwitch({ className }: ModeSwitchProps = {}) {
  const mode = useMode();
  const { t } = useT();

  return (
    <div
      className={`mode-switch${className ? ` ${className}` : ''}`}
      role="group"
      aria-label={t('mode.group')}
    >
      <button
        type="button"
        className="mode-switch-btn"
        aria-pressed={mode === 'work'}
        onClick={() => setMode('work')}
      >
        {t('mode.work')}
      </button>
      <button
        type="button"
        className="mode-switch-btn"
        aria-pressed={mode === 'personal'}
        onClick={() => setMode('personal')}
      >
        {t('mode.personal')}
      </button>
    </div>
  );
}
