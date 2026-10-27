import '@/focus/fonts';
import { useEffect, useMemo, useState } from 'react';
import { useConfirm } from '@/components/overlays/Confirm';
import { formatDuration } from '@/domain/estimates';
import { useData } from '@/hooks/useData';
import { useT } from '@/hooks/useT';
import { useStore } from '@/store/store';
import { FocusScene } from '../pixel/FocusScene';
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
  const quest = { label: t('focus.dailyQuest'), minutesLabel: t('focus.questMinutes', { minutes: shortDuration(progress.minutes), target: shortDuration(progress.target) }), pips: progress.pips };
  const status = active
    ? (active.pausedAt !== null ? t('focus.paused') : active.mode === 'unwind' ? t('focus.unwind') : t('focus.inFocus'))
    : justLogged ? t('focus.blockComplete') : t('focus.ready');

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

  return <div className="focus-theme fx-sc">
    <header className="fx-sc-head">
      <span className="fx-sc-brand"><span aria-hidden="true">✦</span> {t('connect.appName')}</span>
      <button className="fx-sc-close" aria-label={t('common.close')} onClick={close}>×</button>
    </header>

    <div className="fx-sc-status">
      <p className="fx-sc-eyebrow">{status}</p>
      <div className="fx-sc-clock" role="timer">{formatClock(remaining)}</div>
    </div>

    <FocusScene variant="wide" hideTimer
      progress={active ? elapsedMs(active, now) / (active.plannedMin * 60_000) : justLogged ? 1 : 0}
      time={formatClock(remaining)} celebrating={Boolean(justLogged)} quest={quest}
      ariaLabel={t('focus.sceneLabel', { time: formatClock(remaining) })} />

    {active && <section className="fx-sc-card">
      <p className="fx-sc-kicker">{status}</p>
      <h1 className="fx-sc-title">{active.title}</h1>
      <div className="fx-sc-buttons">
        {active.pausedAt === null
          ? <button className="fx-sc-btn" onClick={pause}>{t('focus.pause')}</button>
          : <button className="fx-sc-btn fx-sc-btn--go" onClick={resume}>{t('focus.resume')}</button>}
        <button className="fx-sc-btn" onClick={() => void stop()}>{t('focus.stop')}</button>
      </div>
    </section>}

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
      <h1 className="fx-sc-title">{task?.content ?? (query.trim() || t('focus.sidecarPick'))}</h1>
      <p className="fx-sc-type">{t('focus.startBlock')}</p>
      <div className="fx-sc-buttons">
        {lengths.map((minutes) => <button key={minutes} className="fx-sc-btn fx-sc-btn--go" disabled={!task && !query.trim()}
          onClick={() => begin(minutes)}>{formatDuration(minutes, locale)}</button>)}
        <button className="fx-sc-btn" onClick={takeBreak}>{t('focus.takeBreak', { minutes: prefs.breakMin })}</button>
      </div>
    </section>}

    <div className="fx-sc-quest">
      <div><p className="fx-sc-kicker">{t('focus.dailyQuest')}</p><p className="fx-sc-type">{quest.minutesLabel}</p></div>
      <div className="fx-sc-pips" aria-label={t('focus.questProgress', { count: progress.pips.filter(Boolean).length })}>
        {progress.pips.map((lit, index) => <i key={index} className={lit ? 'is-on' : ''} />)}
      </div>
    </div>

    <div className="fx-sc-pick">
      <label className="fx-sc-field"><span className="fx-sc-kicker">{t('focus.sidecarTask')}</span>
        <TaskSearch items={items} value={query} selectedId={taskId} placeholder={t('focus.addWork')}
          onChange={(value) => { setQuery(value); setTaskId(null); }}
          onSelect={(item) => { setQuery(item.content); setTaskId(item.id); setLane(laneOf(item.labels)); }} />
      </label>
      <div className="fx-sc-field"><span className="fx-sc-kicker">{t('focus.lane')}</span>
        <div className="fx-sc-lanes">{settings.lanes.map((name) => <button key={name} className="fx-sc-lane" aria-pressed={chosenLane === name}
          disabled={Boolean(active)} onClick={() => chooseLane(name)}>{name}</button>)}</div>
      </div>
    </div>

    <p className="fx-sc-foot">{t('focus.sidecarHint')}</p>
  </div>;
}

/** Opens the sidecar in its own tab, or brings back the one already open. */
export function openSidecar(): void {
  window.open(`${window.location.pathname}#/sidecar`, 'focus-sidecar');
}
