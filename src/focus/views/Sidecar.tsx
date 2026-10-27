import '@/focus/fonts';
import { useEffect, useMemo, useState } from 'react';
import { useConfirm } from '@/components/overlays/Confirm';
import { formatDuration } from '@/domain/estimates';
import { useData } from '@/hooks/useData';
import { useT } from '@/hooks/useT';
import { useStore } from '@/store/store';
import { FocusScene } from '../pixel/FocusScene';
import { QuestPips } from '../pixel/QuestPips';
import { shortDuration } from '../domain/format';
import { todayProgress } from '../domain/metrics';
import { entriesForMode } from '../domain/modeEntries';
import { settingsFor } from '../domain/settings';
import { elapsedMs, formatClock, MIN_LOGGED_MINUTES, remainingMs } from '../domain/timer';
import type { FocusRating } from '../domain/types';
import { useMode } from '../mode-store';
import { useFocusLog, useFocusNow, useFocusPreferences, useFocusStore } from '../store';
import { TaskSearch } from './TaskSearch';
import './focus.css';

/** The task and length a link asked for, as in `#/sidecar?task=123&min=60` (a calendar event's link). */
function linkedBlock(): { taskId: string | null; minutes: number | null } {
  const params = new URLSearchParams(window.location.hash.split('?')[1] ?? '');
  const minutes = Number(params.get('min'));
  return { taskId: params.get('task'), minutes: Number.isInteger(minutes) && minutes >= 1 && minutes <= 240 ? minutes : null };
}

/**
 * The sidecar: the timer on a page of its own, kept in a tab or a window beside
 * the work. It is the same app in another tab, so the block it runs is the
 * one the Focus page shows (the store shares it across tabs).
 */
export function SidecarPage() {
  const { t, locale } = useT();
  const { items } = useData('focus');
  const prefs = useFocusPreferences();
  const focusMode = useMode();
  const logs = useFocusLog();
  const now = useFocusNow();
  const updateTask = useStore((state) => state.updateTask);
  const confirm = useConfirm();
  const { active, justLogged, start, pause, resume, finish, discard, rate, dismiss } = useFocusStore();
  const settings = useMemo(() => settingsFor(prefs, focusMode), [prefs, focusMode]);
  const progress = useMemo(() => todayProgress(entriesForMode(logs, focusMode), settings, new Date(now)), [logs, focusMode, settings, now]);

  const [linked] = useState(linkedBlock);
  const [taskId, setTaskId] = useState<string | null>(linked.taskId);
  const [query, setQuery] = useState('');
  const [lane, setLane] = useState<string | null>(null);
  const task = items.find((item) => item.id === taskId) ?? null;
  // The linked task arrives with the first sync; its title fills the field once it does.
  useEffect(() => { if (task && !query) setQuery(task.content); }, [task, query]);

  const laneOf = (labels: string[]) => settings.lanes.find((name) => labels.some((label) => label.toLowerCase() === name.toLowerCase())) ?? null;
  const chosenLane = task ? laneOf(task.labels) : lane;
  const lengths = linked.minutes && !prefs.blockLengths.includes(linked.minutes)
    ? [linked.minutes, ...prefs.blockLengths] : prefs.blockLengths;
  const remaining = active ? remainingMs(active, now) : (linked.minutes ?? prefs.blockLengths[0] ?? 30) * 60_000;
  const quest = {
    label: t('focus.dailyQuest'),
    minutesLabel: t('focus.questMinutes', { minutes: shortDuration(progress.minutes), target: shortDuration(progress.target) }),
    pipFill: progress.pipFill,
    pips: progress.pips,
  };

  const begin = (minutes: number) => {
    const title = task?.content ?? query.trim();
    if (!title) return;
    start({ mode: 'focus', focusMode, taskId: task?.id ?? null, title, lane: chosenLane, plannedMin: minutes });
  };
  const takeBreak = () => start({ mode: 'unwind', focusMode, taskId: null, title: t('focus.unwind'), lane: null, plannedMin: prefs.breakMin });
  const stop = async () => {
    if (!active) return;
    if (active.mode === 'focus' && elapsedMs(active, Date.now()) < MIN_LOGGED_MINUTES * 60_000) {
      if (await confirm({ title: t('focus.discardPrompt'), destructive: true, confirmLabel: t('focus.discard') })) discard();
    } else void finish();
  };
  const chooseLane = (name: string) => {
    setLane(name);
    if (!task) return;
    const others = task.labels.filter((label) => !settings.lanes.some((lane) => lane.toLowerCase() === label.toLowerCase()));
    void updateTask(task.id, { labels: [...others, name] });
  };
  const close = () => {
    // A tab the app opened can close itself; one opened from a link goes back to the Focus page.
    window.close();
    window.location.hash = '#/focus';
  };

  // Keyboard: Space starts or pauses, Escape stops, 1/2/3 pick the first three lengths when idle.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      if (event.key === ' ' || event.code === 'Space') {
        event.preventDefault();
        if (active) {
          if (active.pausedAt === null) pause();
          else resume();
        } else if (justLogged) {
          const minutes = prefs.blockLengths[0] ?? 25;
          start({ mode: 'focus', focusMode: justLogged.mode, taskId: justLogged.taskId, title: justLogged.title, lane: justLogged.lane, plannedMin: minutes });
        } else {
          const minutes = lengths[0] ?? prefs.blockLengths[0] ?? 25;
          begin(minutes);
        }
      } else if (event.key === 'Escape') {
        if (active) {
          event.preventDefault();
          void stop();
        }
      } else if (!active && (event.key === '1' || event.key === '2' || event.key === '3')) {
        const index = Number(event.key) - 1;
        if (justLogged) {
          const minutes = prefs.blockLengths[index];
          if (minutes !== undefined) {
            event.preventDefault();
            start({ mode: 'focus', focusMode: justLogged.mode, taskId: justLogged.taskId, title: justLogged.title, lane: justLogged.lane, plannedMin: minutes });
          }
        } else {
          const minutes = lengths[index];
          if (minutes !== undefined) {
            event.preventDefault();
            begin(minutes);
          }
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [active, justLogged, pause, resume, start, prefs.blockLengths, lengths, begin, stop]);

  // While a block runs the page keeps to the clock, the task and the scene.
  return <div className={`focus-theme fx-sc${active ? ' is-running' : ''}`}>
    {!active && <button className="fx-sc-close" aria-label={t('common.close')} onClick={close}>×</button>}

    <div className="fx-sc-status">
      {!active && justLogged && <p className="fx-sc-eyebrow">{t('focus.blockComplete')}</p>}
      <div className="fx-sc-clock" role="timer">{formatClock(remaining)}</div>
    </div>
    {active && <h1 className="fx-sc-running">{active.title}</h1>}

    <FocusScene variant="wide" hideTimer fill
      progress={active ? elapsedMs(active, now) / (active.plannedMin * 60_000) : justLogged ? 1 : 0}
      time={formatClock(remaining)} celebrating={Boolean(justLogged)} quest={quest}
      ariaLabel={t('focus.sceneLabel', { time: formatClock(remaining) })} />

    {active && <div className="fx-sc-buttons fx-sc-center">
      {active.pausedAt === null
        ? <button className="fx-sc-btn fx-sc-btn--go" onClick={pause}>{t('focus.pause')}</button>
        : <button className="fx-sc-btn fx-sc-btn--go" onClick={resume}>{t('focus.resume')}</button>}
      <button className="fx-sc-link" onClick={() => void stop()}>{t('focus.stop')}</button>
    </div>}

    {!active && justLogged && <section className="fx-sc-card fx-sc-card--done">
      <div className="fx-sc-logged">
        <span className="fx-sc-check" aria-hidden="true">✓</span>
        <div><p className="fx-sc-kicker">{t('focus.blockLogged')}</p><h1 className="fx-sc-title">{justLogged.title}</h1></div>
      </div>
      <div className="fx-sc-quality">
        <div><p className="fx-sc-type">{t('focus.quality')} {t('focus.optional')}</p><p className="fx-sc-ask">{t('focus.howFelt')}</p></div>
        <div className="fx-sc-stars" aria-label={t('focus.rating')}>{([1, 2, 3, 4, 5] as FocusRating[]).map((star) => (
          <button key={star} className="fx-sc-star" aria-pressed={star <= (justLogged.rating ?? 0)} aria-label={t('focus.rateStars', { count: star })}
            onClick={() => void rate(justLogged.rating === star ? null : star)}>★</button>
        ))}</div>
      </div>
      <p className="fx-sc-type">{t('focus.continueSame')}</p>
      <div className="fx-sc-buttons">
        {prefs.blockLengths.map((minutes) => <button key={minutes} className="fx-sc-btn fx-sc-btn--go"
          onClick={() => start({ mode: 'focus', focusMode: justLogged.mode, taskId: justLogged.taskId, title: justLogged.title, lane: justLogged.lane, plannedMin: minutes })}>{formatDuration(minutes, locale)}</button>)}
        <button className="fx-sc-btn" onClick={() => { dismiss(); setTaskId(null); setQuery(''); setLane(null); }}>{t('focus.newTask')}</button>
        <button className="fx-sc-btn" onClick={takeBreak}>{t('focus.takeBreak', { minutes: prefs.breakMin })}</button>
      </div>
    </section>}

    {!active && !justLogged && <section className="fx-sc-card">
      <p className="fx-sc-kicker">{t('focus.ready')}</p>
      {/* With no task yet, the title opens the task list below. */}
      {task || query.trim()
        ? <h1 className="fx-sc-title">{task?.content ?? query.trim()}</h1>
        : <button className="fx-sc-title fx-sc-pickbtn" onClick={() => document.querySelector<HTMLInputElement>('.fx-sc-pick input')?.focus()}>{t('focus.sidecarPick')}</button>}
      <p className="fx-sc-type">{t('focus.startBlock')}</p>
      <div className="fx-sc-buttons">
        {lengths.map((minutes) => <button key={minutes} className="fx-sc-btn fx-sc-btn--go" disabled={!task && !query.trim()}
          onClick={() => begin(minutes)}>{formatDuration(minutes, locale)}</button>)}
        <button className="fx-sc-btn" onClick={takeBreak}>{t('focus.takeBreak', { minutes: prefs.breakMin })}</button>
      </div>
    </section>}

    {!active && <>
      <div className="fx-sc-quest">
        <div><p className="fx-sc-kicker">{t('focus.dailyQuest')}</p><p className="fx-sc-type">{quest.minutesLabel}</p></div>
        <QuestPips
          fill={progress.pipFill}
          size={16}
          className="fx-sc-pips"
          ariaLabel={t('focus.questProgress', { count: progress.pips.filter(Boolean).length })}
        />
      </div>

      <div className="fx-sc-pick">
        <label className="fx-sc-field"><span className="fx-sc-kicker">{t('focus.sidecarTask')}</span>
          <TaskSearch items={items} value={query} selectedId={taskId} placeholder={t('focus.sidecarTask')}
            onChange={(value) => { setQuery(value); setTaskId(null); }}
            onSelect={(item) => { setQuery(item.content); setTaskId(item.id); setLane(laneOf(item.labels)); }} />
        </label>
        <div className="fx-sc-field"><span className="fx-sc-kicker">{t('focus.lane')}</span>
          <div className="fx-sc-lanes">{settings.lanes.map((name) => <button key={name} className="fx-sc-lane" aria-pressed={chosenLane === name}
            onClick={() => chooseLane(name)}>{name}</button>)}</div>
        </div>
      </div>
    </>}
  </div>;
}

/** Opens the sidecar in its own tab, or brings back the one already open. */
export function openSidecar(): void {
  window.open(`${window.location.pathname}#/sidecar`, 'focus-sidecar');
}
