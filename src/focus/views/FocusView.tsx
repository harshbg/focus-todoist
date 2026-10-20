import '@/focus/fonts';
import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { useConfirm } from '@/components/overlays/Confirm';
import { toApiDate } from '@/domain/dates';
import { estimateOf, formatDuration } from '@/domain/estimates';
import type { Item } from '@/domain/types';
import { useT } from '@/hooks/useT';
import { useData } from '@/hooks/useData';
import { useStore } from '@/store/store';
import { FocusScene } from '../pixel/FocusScene';
import { entryKey } from '../domain/log';
import { todayProgress } from '../domain/metrics';
import { focusQueue } from '../domain/queue';
import { elapsedMs, formatClock, MIN_LOGGED_MINUTES, remainingMs } from '../domain/timer';
import type { FocusEntry, FocusRating } from '../domain/types';
import { useFocusLog, useFocusNow, useFocusPreferences, useFocusStore } from '../store';
import { TaskSearch } from './TaskSearch';
import './focus.css';

const QUEUE_KEY = 'tde.focus.queue';

function readQueue(): string[] {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(QUEUE_KEY) ?? '[]');
    return Array.isArray(value) ? [...new Set(value.filter((id): id is string => typeof id === 'string'))] : [];
  } catch { return []; }
}

function Rating({ value, onChange }: { value: FocusRating | null; onChange: (next: FocusRating | null) => void }) {
  const { t } = useT();
  return <div className="fx-stars" aria-label={t('focus.rating')}>
    {([1, 2, 3, 4, 5] as FocusRating[]).map((star) => (
      <button key={star} type="button" className="fx-star" aria-pressed={star <= (value ?? 0)}
        aria-label={t('focus.rateStars', { count: star })}
        onClick={() => onChange(value === star ? null : star)}>★</button>
    ))}
  </div>;
}

interface ManualDialogProps {
  items: Item[];
  lanes: string[];
  onClose: () => void;
  onSave: (entry: Omit<FocusEntry, 'source'>) => Promise<void>;
}

function ManualDialog({ items, lanes, onClose, onSave }: ManualDialogProps) {
  const { t } = useT();
  const [title, setTitle] = useState('');
  const [taskId, setTaskId] = useState<string | null>(null);
  const [lane, setLane] = useState<string | null>(null);
  const [date, setDate] = useState(toApiDate(new Date()));
  const [time, setTime] = useState(format(new Date(), 'HH:mm'));
  const [minutes, setMinutes] = useState(30);
  const [saving, setSaving] = useState(false);
  return <div className="fx-dialog" role="dialog" aria-modal="true" aria-label={t('focus.logPast')}>
    <form onSubmit={(event) => {
      event.preventDefault();
      if (!title.trim() || !date || !time || minutes < 1 || saving) return;
      setSaving(true);
      void onSave({ start: `${date}T${time}`, minutes: Math.round(minutes), taskId, title: title.trim(), lane, rating: null })
        .then(onClose).finally(() => setSaving(false));
    }}>
      <h2 className="fx-h2">{t('focus.logPast')}</h2>
      <label className="fx-label" htmlFor="fx-manual-task">{t('focus.task')}</label>
      <TaskSearch items={items} value={title} selectedId={taskId} placeholder={t('focus.taskPlaceholder')}
        onChange={(value) => { setTitle(value); setTaskId(null); }}
        onSelect={(item) => { setTitle(item.content); setTaskId(item.id); }} />
      <div className="fx-form-row"><label className="fx-label">{t('focus.lane')}
        <select value={lane ?? ''} onChange={(event) => setLane(event.target.value || null)}>
          <option value="">{t('focus.noLane')}</option>
          {lanes.map((name) => <option key={name} value={name}>{name}</option>)}
        </select>
      </label></div>
      <div className="fx-form-row">
        <label className="fx-label">{t('focus.date')}<input required type="date" value={date} max={toApiDate(new Date())} onChange={(event) => setDate(event.target.value)} /></label>
        <label className="fx-label">{t('focus.startTime')}<input required type="time" value={time} onChange={(event) => setTime(event.target.value)} /></label>
        <label className="fx-label">{t('focus.minutes')}<input required type="number" min="1" value={minutes} onChange={(event) => setMinutes(Number(event.target.value))} /></label>
      </div>
      <div className="fx-actions">
        <button className="fx-btn fx-btn--primary" type="submit" disabled={saving || !title.trim()}>{t('common.save')}</button>
        <button className="fx-btn fx-btn--ghost" type="button" onClick={onClose}>{t('common.cancel')}</button>
      </div>
    </form>
  </div>;
}

export function FocusView({ onOpen }: { onOpen: (id: string) => void }) {
  const { t, locale } = useT();
  const { items } = useData();
  const prefs = useFocusPreferences();
  const logs = useFocusLog();
  const now = useFocusNow();
  const { active, justLogged, start, pause, resume, finish, discard, rate, dismiss, logManual, editEntry, deleteEntry } = useFocusStore();
  const createTaskId = useStore((state) => state.createTaskId);
  const updateTask = useStore((state) => state.updateTask);
  const showQuickGroup = useStore((state) => state.prefs.showQuickGroup);
  const confirm = useConfirm();
  const [mode, setMode] = useState<'focus' | 'unwind'>('focus');
  const [length, setLength] = useState(prefs.blockLengths[0] ?? 30);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lane, setLane] = useState<string | null>(null);
  const [pinned, setPinned] = useState(readQueue);
  const [manualOpen, setManualOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const progress = todayProgress(logs, prefs, new Date(now));
  const selected = items.find((item) => item.id === selectedId) ?? null;
  const queue = useMemo(() => focusQueue(items, pinned, new Date(now), showQuickGroup), [items, pinned, now, showQuickGroup]);
  const recent = useMemo(() => [...logs].sort((a, b) => b.start.localeCompare(a.start)).slice(0, 20), [logs]);
  const chosenLane = selected ? prefs.lanes.find((name) => selected.labels.some((label) => label.toLowerCase() === name.toLowerCase())) ?? null : lane;
  const remaining = active ? remainingMs(active, now) : (mode === 'unwind' ? prefs.breakMin : length) * 60_000;
  const elapsed = active ? elapsedMs(active, now) : 0;

  const saveQueue = (next: string[]) => {
    setPinned(next);
    try { window.localStorage.setItem(QUEUE_KEY, JSON.stringify(next)); } catch { /* The queue still works in this tab. */ }
  };
  const choose = (item: Item) => {
    setSelectedId(item.id);
    setQuery(item.content);
    setLane(prefs.lanes.find((name) => item.labels.some((label) => label.toLowerCase() === name.toLowerCase())) ?? null);
    setLength(estimateOf(item) ?? prefs.blockLengths[0] ?? 30);
  };
  const create = async (): Promise<Item | null> => {
    if (!query.trim()) return null;
    const id = await createTaskId({ content: query.trim(), estimateMinutes: length,
      labels: lane ? [lane] : [], due: { date: toApiDate(new Date()), string: toApiDate(new Date()), lang: 'en', timezone: null, is_recurring: false } });
    const item = id ? useStore.getState().snapshot.items[id] : null;
    if (item) choose(item);
    return item ?? null;
  };
  const resolveChosen = async (): Promise<Item | null> => selected ?? create();
  const startFor = (item: Item | null, title = query.trim(), startMode: 'focus' | 'unwind' = mode, minutes = length) => {
    if (active || (startMode === 'focus' && !item && !title)) return;
    if (startMode === 'unwind') {
      start({ mode: 'unwind', taskId: null, title: t('focus.unwind'), lane: null, plannedMin: minutes });
      return;
    }
    start({ mode: startMode, taskId: item?.id ?? null, title: item?.content ?? title,
      lane: item ? prefs.lanes.find((name) => item.labels.some((label) => label.toLowerCase() === name.toLowerCase())) ?? null : lane,
      plannedMin: minutes });
  };
  const stop = async () => {
    if (!active) return;
    if (active.mode === 'focus' && elapsedMs(active, Date.now()) < MIN_LOGGED_MINUTES * 60_000) {
      if (await confirm({ title: t('focus.discardPrompt'), destructive: true, confirmLabel: t('focus.discard') })) discard();
    } else void finish();
  };
  const setEstimate = (minutes: number) => {
    setLength(minutes);
    if (selected) void updateTask(selected.id, { estimateMinutes: minutes });
  };
  const setLaneForTask = (next: string) => {
    setLane(next);
    if (!selected) return;
    const labels = selected.labels.filter((label) => !prefs.lanes.some((name) => name.toLowerCase() === label.toLowerCase()));
    void updateTask(selected.id, { labels: [...labels, next] });
  };
  const addToQueue = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const item = await resolveChosen();
      if (item && !pinned.includes(item.id)) saveQueue([...pinned, item.id]);
    } finally { setBusy(false); }
  };
  const startTask = async () => {
    if (busy) return;
    setBusy(true);
    try { const item = await resolveChosen(); if (item) startFor(item, item.content, 'focus', length); }
    finally { setBusy(false); }
  };

  return <div className="focus-theme fx-page">
    <header className="fx-hero">
      <div><h1 className="fx-hero-title">{t('focus.deepWork')}</h1>
        <blockquote className="fx-quote">{t('focus.quote')}<cite className="fx-quote-cite">{t('focus.quoteCite')}</cite></blockquote>
      </div>
      <div className="fx-today fx-card">
        <div className="fx-eyebrow">{t('focus.todayProgress')}</div>
        <div><strong className="fx-today-minutes">{progress.minutes}</strong> <span className="fx-today-unit">{t('focus.minutes')}</span></div>
        <div className="fx-bar"><span style={{ width: `${progress.share * 100}%` }} /></div>
        <p className="fx-today-note">{progress.remaining === 0 ? t('focus.targetReached') : t('focus.remaining', { remaining: formatDuration(progress.remaining, locale), target: formatDuration(progress.target, locale) })}</p>
        <div className="fx-quest"><span>{t('focus.dailyQuest')}</span><div className="fx-pips" aria-label={t('focus.questProgress', { count: progress.pips.filter(Boolean).length })}>
          {progress.pips.map((lit, index) => <i key={index} className={lit ? 'is-on' : ''} />)}
        </div></div>
      </div>
    </header>

    <div className="fx-grid"><main className="fx-main">
      <section className="fx-card">
        <div className="fx-seg">
          <button aria-pressed={mode === 'focus'} disabled={Boolean(active)} onClick={() => setMode('focus')}>{t('focus.focus')}</button>
          <button aria-pressed={mode === 'unwind'} disabled={Boolean(active)} onClick={() => setMode('unwind')}>{t('focus.unwind')}</button>
        </div>
        <p className="fx-eyebrow">{t('focus.eyebrow')}</p>
        <h2 className="fx-h2">{active?.mode === 'unwind' || (!active && mode === 'unwind') ? t('focus.unwind') : t('focus.focus')}</h2>
        <div className="fx-chips">{prefs.blockLengths.map((minutes) => <button key={minutes} className="fx-chip" aria-pressed={length === minutes} disabled={Boolean(active)} onClick={() => setLength(minutes)}>{formatDuration(minutes, locale)}</button>)}</div>
        <FocusScene progress={active ? elapsed / (active.plannedMin * 60_000) : justLogged ? 1 : 0}
          time={formatClock(remaining)} celebrating={Boolean(justLogged)}
          quest={{ label: t('focus.dailyQuest'), minutesLabel: t('focus.questMinutes', { minutes: progress.minutes, target: progress.target }), pips: progress.pips }}
          ariaLabel={t('focus.sceneLabel', { time: formatClock(remaining) })} />
        <div className="fx-actions">
          {!active && <button className="fx-btn fx-btn--primary" disabled={mode === 'focus' && !selected && !query.trim()} onClick={() => startFor(selected, query.trim(), mode, mode === 'unwind' ? prefs.breakMin : length)}>{t('focus.start')}</button>}
          {active && (active.pausedAt === null
            ? <button className="fx-btn fx-btn--secondary" onClick={pause}>{t('focus.pause')}</button>
            : <button className="fx-btn fx-btn--primary" onClick={resume}>{t('focus.resume')}</button>)}
          {active && <button className="fx-btn fx-btn--ghost" onClick={() => void stop()}>{t('focus.stop')}</button>}
        </div>
        {justLogged && <div className="fx-complete">
          <p className="fx-eyebrow">✓ {t('focus.blockLogged')}</p>
          <h3>{justLogged.taskId && useStore.getState().snapshot.items[justLogged.taskId]
            ? <button onClick={() => onOpen(justLogged.taskId!)}>{justLogged.title}</button> : justLogged.title}</h3>
          <Rating value={justLogged.rating} onChange={(value) => void rate(value)} />
          <div className="fx-actions"><span>{t('focus.continueSame')}</span>
            {prefs.blockLengths.map((minutes) => <button key={minutes} className="fx-btn fx-btn--secondary" onClick={() => start({ mode: 'focus', taskId: justLogged.taskId, title: justLogged.title, lane: justLogged.lane, plannedMin: minutes })}>{formatDuration(minutes, locale)}</button>)}
          </div>
          <div className="fx-actions"><button className="fx-btn fx-btn--ghost" onClick={() => { dismiss(); setSelectedId(null); setQuery(''); setLane(null); }}>{t('focus.newTask')}</button>
            <button className="fx-btn fx-btn--secondary" onClick={() => start({ mode: 'unwind', taskId: null, title: t('focus.unwind'), lane: null, plannedMin: prefs.breakMin })}>{t('focus.takeBreak', { minutes: prefs.breakMin })}</button>
          </div>
        </div>}
        <div className="fx-hint"><button className="fx-btn fx-btn--ghost" disabled>{t('focus.openSidecar')}</button><span>· {t('focus.hint')}</span></div>
      </section>
    </main><aside className="fx-rail"><section className="fx-card">
      <p className="fx-eyebrow">{t('focus.queueEyebrow')}</p><h2 className="fx-h2">{t('focus.chooseNext')}</h2>
      <label className="fx-label">{t('focus.addWork')}</label>
      <TaskSearch items={items} value={query} selectedId={selectedId} placeholder={t('focus.addWork')}
        onChange={(value) => { setQuery(value); setSelectedId(null); }} onSelect={choose}
        onCreate={() => { void create(); }} />
      <span className="fx-label">{t('focus.timeRequired')}</span>
      <div className="fx-chips">{prefs.blockLengths.map((minutes) => <button key={minutes} className="fx-chip" aria-pressed={length === minutes} onClick={() => setEstimate(minutes)}>{formatDuration(minutes, locale)}</button>)}</div>
      <span className="fx-label">{t('focus.lane')}</span>
      <div className="fx-chips">{prefs.lanes.map((name) => <button key={name} className="fx-chip" aria-pressed={chosenLane === name} onClick={() => setLaneForTask(name)}>{name}</button>)}</div>
      <div className="fx-actions"><button className="fx-btn fx-btn--primary" disabled={busy || Boolean(active) || (!selected && !query.trim())} onClick={() => void startTask()}>{t('focus.startTask')}</button>
        <button className="fx-btn fx-btn--secondary" disabled={busy || (!selected && !query.trim())} onClick={() => void addToQueue()}>{t('focus.addQueue')}</button></div>
      <div className="fx-section-head"><h3>{t('focus.ready')}</h3><span className="fx-badge">{queue.length}</span></div>
      <ul className="fx-queue">{queue.map((item) => {
        const taskLane = prefs.lanes.find((name) => item.labels.some((label) => label.toLowerCase() === name.toLowerCase()));
        return <li key={item.id} className="fx-queue-item"><button className="fx-queue-title" onClick={() => onOpen(item.id)}>{item.content}</button>
          <span className="fx-queue-meta">{[estimateOf(item) !== null ? formatDuration(estimateOf(item)!, locale) : null, taskLane].filter(Boolean).join(' · ')}</span>
          <button className="fx-icon-btn" disabled={Boolean(active)} aria-label={t('focus.startTaskNamed', { title: item.content })} onClick={() => startFor(item, item.content, 'focus', length)}>▶</button>
          {pinned.includes(item.id) && <button className="fx-icon-btn" aria-label={t('focus.removeQueue', { title: item.content })} onClick={() => saveQueue(pinned.filter((id) => id !== item.id))}>×</button>}
        </li>;
      })}</ul>
    </section></aside></div>

    {active && <section className="fx-current fx-card"><span className="fx-eyebrow">{t('focus.currentFocus')}</span>
      {active.taskId ? <button onClick={() => onOpen(active.taskId!)}>{active.title}</button> : <strong>{active.title}</strong>}
      {active.lane && <span className="fx-chip">{active.lane}</span>}
    </section>}

    <section className="fx-section"><div className="fx-section-head"><div><p className="fx-eyebrow">{t('focus.attentionEyebrow')}</p><h2 className="fx-h2">{t('focus.attentionTrail')}</h2></div>
      <button className="fx-btn fx-btn--secondary" onClick={() => setManualOpen(true)}>{t('focus.logPast')}</button></div>
      <ul className="fx-trail">{recent.map((entry) => <li key={entryKey(entry)} className="fx-trail-item">
        {entry.taskId && useStore.getState().snapshot.items[entry.taskId]
          ? <button className="fx-trail-title" onClick={() => onOpen(entry.taskId!)}>{entry.title}</button>
          : <strong className="fx-trail-title">{entry.title}</strong>}
        <span className="fx-trail-meta">{[entry.lane, new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(entry.start))].filter(Boolean).join(' · ')}</span>
        <span className="fx-trail-mins">{formatDuration(entry.minutes, locale)}{entry.rating ? ` · ${entry.rating}★` : ''}</span>
        <Rating value={entry.rating} onChange={(value) => void editEntry(entryKey(entry), { rating: value })} />
        <button className="fx-icon-btn" aria-label={t('focus.deleteEntry', { title: entry.title })} onClick={async () => {
          if (await confirm({ title: t('focus.deletePrompt'), destructive: true })) void deleteEntry(entryKey(entry));
        }}>×</button>
      </li>)}</ul>
    </section>
    {manualOpen && <ManualDialog items={items} lanes={prefs.lanes} onClose={() => setManualOpen(false)} onSave={logManual} />}
  </div>;
}
