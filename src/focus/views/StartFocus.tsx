import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Play } from 'lucide-react';
import { formatDuration } from '@/domain/estimates';
import { plainTitle } from '@/domain/markdown';
import type { Item } from '@/domain/types';
import { useT } from '@/hooks/useT';
import { settingsFor } from '../domain/settings';
import { useMode } from '../mode-store';
import { initialPlanLength } from '../planBlock';
import { useFocusPreferences, useFocusStore } from '../store';

/**
 * "Start focus" on a task: pick a length, and the block starts on that task
 * and the sidecar opens on it. The task's own duration or estimate is offered
 * first when it has one. Used in the task panel and among a row's buttons.
 */
export function StartFocus({ task, variant }: { task: Item; variant: 'panel' | 'row' }) {
  const { t, locale } = useT();
  const prefs = useFocusPreferences();
  const mode = useMode();
  const running = useFocusStore((state) => state.active);
  const start = useFocusStore((state) => state.start);
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!anchor) return;
    const away = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!menu.current?.contains(target) && !button.current?.contains(target)) setAnchor(null);
    };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.stopPropagation(); setAnchor(null); } };
    const close = () => setAnchor(null);
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', escape, true);
    window.addEventListener('scroll', close, true);
    return () => {
      document.removeEventListener('pointerdown', away);
      document.removeEventListener('keydown', escape, true);
      window.removeEventListener('scroll', close, true);
    };
  }, [anchor]);

  // The task's own length first, then the usual ones.
  const own = initialPlanLength(task);
  const lengths = [own, ...prefs.blockLengths.filter((minutes) => minutes !== own)];
  const lanes = settingsFor(prefs, mode).lanes;

  const begin = (minutes: number) => {
    setAnchor(null);
    start({
      mode: 'focus', focusMode: mode, taskId: task.id, title: plainTitle(task.content), plannedMin: minutes,
      lane: lanes.find((name) => task.labels.some((label) => label.toLowerCase() === name.toLowerCase())) ?? null,
    });
    window.location.hash = `#/sidecar?task=${encodeURIComponent(task.id)}&min=${minutes}`;
  };

  const label = running ? t('focus.startFocusBusy') : t('focus.startFocusOn');
  return <>
    <button
      ref={button}
      type="button"
      className={variant === 'panel' ? 'fselect-face propbtn' : undefined}
      aria-label={variant === 'row' ? label : undefined}
      title={label}
      aria-haspopup="menu"
      aria-expanded={Boolean(anchor)}
      disabled={Boolean(running)}
      onClick={(event) => {
        event.stopPropagation();
        setAnchor((open) => (open ? null : button.current?.getBoundingClientRect() ?? null));
      }}
    >
      <Play size={variant === 'row' ? 14 : 15} aria-hidden="true" className="ic" />
      {variant === 'panel' && <span>{t('focus.startFocusOn')}</span>}
    </button>
    {anchor && createPortal(
      <div
        ref={menu}
        className="popover fx-startmenu"
        role="menu"
        aria-label={t('focus.startFocusOn')}
        style={{ top: anchor.bottom + 6, left: Math.max(8, Math.min(anchor.left, window.innerWidth - 220)) }}
      >
        <p className="fx-startmenu-title">{t('focus.startFocusHow')}</p>
        {lengths.map((minutes, index) => <button key={minutes} type="button" role="menuitem"
          className={`btn${index === 0 ? ' primary' : ''}`} onClick={() => begin(minutes)}>
          {formatDuration(minutes, locale)}
        </button>)}
      </div>,
      // Inside an open dialog the menu must live in it: a modal dialog sits above everything else on the page.
      button.current?.closest('dialog') ?? document.body,
    )}
  </>;
}
