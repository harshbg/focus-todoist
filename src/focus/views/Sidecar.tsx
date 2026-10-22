import { useMemo } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { formatDuration } from '@/domain/estimates';
import { useData } from '@/hooks/useData';
import { useT } from '@/hooks/useT';
import { useStore } from '@/store/store';
import { FocusScene } from '../pixel/FocusScene';
import { shortDuration } from '../domain/format';
import { todayProgress } from '../domain/metrics';
import { entriesForMode } from '../domain/modeEntries';
import { focusQueue } from '../domain/queue';
import { settingsFor } from '../domain/settings';
import { elapsedMs, formatClock, remainingMs } from '../domain/timer';
import type { FocusRating } from '../domain/types';
import { useMode } from '../mode-store';
import { useFocusLog, useFocusNow, useFocusPreferences, useFocusStore } from '../store';

/**
 * The sidecar: the timer, the scene and what's next, in a small window that
 * stays beside the work. It runs in the page's own JavaScript (a second React
 * root), so it shares the stores and stays in step with the main tab.
 */
function Sidecar() {
  const { t, locale } = useT();
  const { items } = useData();
  const prefs = useFocusPreferences();
  const focusMode = useMode();
  const logs = useFocusLog();
  const now = useFocusNow();
  const showQuickGroup = useStore((state) => state.prefs.showQuickGroup);
  const { active, justLogged, start, pause, resume, finish, rate } = useFocusStore();
  const settings = useMemo(() => settingsFor(prefs, focusMode), [prefs, focusMode]);
  const progress = useMemo(() => todayProgress(entriesForMode(logs, focusMode), settings, new Date(now)), [logs, focusMode, settings, now]);
  const queue = useMemo(() => focusQueue(items, [], new Date(now), showQuickGroup).slice(0, 5), [items, now, showQuickGroup]);
  const length = prefs.blockLengths[0] ?? 30;
  const remaining = active ? remainingMs(active, now) : length * 60_000;

  return <div className="focus-theme fx-page fx-sidecar">
    <FocusScene variant="wide" progress={active ? elapsedMs(active, now) / (active.plannedMin * 60_000) : justLogged ? 1 : 0}
      time={formatClock(remaining)} celebrating={Boolean(justLogged)}
      quest={{ label: t('focus.dailyQuest'), minutesLabel: t('focus.questMinutes', { minutes: shortDuration(progress.minutes), target: shortDuration(progress.target) }), pips: progress.pips }}
      ariaLabel={t('focus.sceneLabel', { time: formatClock(remaining) })} />
    {active && <div className="fx-actions fx-center">
      <span className="fx-sidecar-title">{active.title}</span>
      {active.pausedAt === null
        ? <button className="fx-btn fx-btn--secondary" onClick={pause}>{t('focus.pause')}</button>
        : <button className="fx-btn fx-btn--primary" onClick={resume}>{t('focus.resume')}</button>}
      <button className="fx-btn fx-btn--ghost" onClick={() => void finish()}>{t('focus.stop')}</button>
    </div>}
    {!active && justLogged && <div className="fx-complete">
      <p className="fx-complete-title">✓ {t('focus.blockLogged')} · {justLogged.title}</p>
      <div className="fx-quality">
        <span className="fx-label">{t('focus.quality')}</span>
        <div className="fx-stars">{([1, 2, 3, 4, 5] as FocusRating[]).map((star) => (
          <button key={star} className="fx-star" aria-pressed={star <= (justLogged.rating ?? 0)}
            aria-label={t('focus.rateStars', { count: star })} onClick={() => void rate(justLogged.rating === star ? null : star)}>★</button>
        ))}</div>
      </div>
      <div className="fx-actions fx-center">
        {prefs.blockLengths.map((minutes) => <button key={minutes} className="fx-btn fx-btn--primary"
          onClick={() => start({ mode: 'focus', focusMode: justLogged.mode, taskId: justLogged.taskId, title: justLogged.title, lane: justLogged.lane, plannedMin: minutes })}>{formatDuration(minutes, locale)}</button>)}
        <button className="fx-btn fx-btn--secondary" onClick={() => start({ mode: 'unwind', focusMode, taskId: null, title: t('focus.unwind'), lane: null, plannedMin: prefs.breakMin })}>{t('focus.takeBreak', { minutes: prefs.breakMin })}</button>
      </div>
    </div>}
    {!active && <section>
      <div className="fx-ready"><span className="fx-label">{t('focus.ready')}</span><span className="fx-badge">{queue.length}</span></div>
      <ul className="fx-queue">{queue.map((item) => <li key={item.id} className="fx-queue-item"><i className="fx-mark" aria-hidden="true" />
        <div className="fx-queue-text"><span className="fx-queue-title">{item.content}</span></div>
        <button className="fx-icon-btn" aria-label={t('focus.startTaskNamed', { title: item.content })}
          onClick={() => start({ mode: 'focus', focusMode, taskId: item.id, title: item.content,
            lane: settings.lanes.find((name) => item.labels.some((label) => label.toLowerCase() === name.toLowerCase())) ?? null, plannedMin: length })}>▶</button>
      </li>)}</ul>
    </section>}
  </div>;
}

let open: { window: Window; root: Root } | null = null;

/** Copies the page's styles into another window's document, so the sidecar looks the same. */
function copyStyles(target: Document): void {
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      const style = target.createElement('style');
      style.textContent = Array.from(sheet.cssRules).map((rule) => rule.cssText).join('\n');
      target.head.appendChild(style);
    } catch {
      // A stylesheet from another origin can't be read; link it instead.
      if (sheet.href) {
        const link = target.createElement('link');
        link.rel = 'stylesheet';
        link.href = sheet.href;
        target.head.appendChild(link);
      }
    }
  }
  const theme = document.documentElement.dataset.theme;
  if (theme) target.documentElement.dataset.theme = theme;
}

interface DocumentPictureInPicture {
  requestWindow(options: { width: number; height: number }): Promise<Window>;
}

/**
 * Opens the sidecar: an always-on-top Picture-in-Picture window where the
 * browser has one (Chrome, Edge), else a small ordinary window on the Focus page.
 */
export async function openSidecar(): Promise<void> {
  if (open && !open.window.closed) { open.window.focus(); return; }
  const pip = (window as Window & { documentPictureInPicture?: DocumentPictureInPicture }).documentPictureInPicture;
  if (!pip) {
    window.open(`${location.pathname}#/focus`, 'focus-sidecar', 'width=460,height=760');
    return;
  }
  const win = await pip.requestWindow({ width: 420, height: 640 });
  copyStyles(win.document);
  win.document.body.style.margin = '0';
  const mount = win.document.createElement('div');
  win.document.body.appendChild(mount);
  const root = createRoot(mount);
  root.render(<Sidecar />);
  open = { window: win, root };
  win.addEventListener('pagehide', () => { root.unmount(); open = null; });
}
