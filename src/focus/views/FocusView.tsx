import '@/focus/fonts';
import { markedWorkProjects } from '@/focus/scope';
import { useEffect, useMemo, useRef, useState } from 'react';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { HugeiconsIcon } from '@hugeicons/react';
import { PlayIcon } from '@hugeicons/core-free-icons';
import { useConfirm } from '@/components/overlays/Confirm';
import { Overlay } from '@/components/overlays/Overlay';
import { Icon } from '@/components/Icon';
import { TaskRow } from '@/components/TaskRow';
import { toApiDate } from '@/domain/dates';
import { estimateOf, formatDuration } from '@/domain/estimates';
import { plainTitle, renderTitle } from '@/domain/markdown';
import type { Item } from '@/domain/types';
import { useT } from '@/hooks/useT';
import { useData } from '@/hooks/useData';
import { useStore } from '@/store/store';
import { FocusScene } from '../pixel/FocusScene';
import { QuestPips } from '../pixel/QuestPips';
import { entryKey } from '../domain/log';
import { todayProgress } from '../domain/metrics';
import { focusQueue } from '../domain/queue';
import { continueLengths, elapsedMs, formatClock, MIN_LOGGED_MINUTES, remainingMs } from '../domain/timer';
import type { FocusEntry, FocusRating } from '../domain/types';
import { newTaskPlacement, type Mode } from '../domain/mode';
import { mergeLabels } from '../domain/labels';
import { useMode } from '../mode-store';
import { useFocusLog, useFocusNow, useFocusPreferences, useFocusStore } from '../store';
import { entriesForMode } from '../domain/modeEntries';
import { settingsFor } from '../domain/settings';
import { TaskSearch } from './TaskSearch';
import { openSidecar } from './Sidecar';
import { GuidanceNudges, ReminderSettings } from './Guidance';
import './focus.css';
import './focusPage.css';

const QUEUE_KEY = 'tde.focus.queue';

function readQueue(): string[] {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(QUEUE_KEY) ?? '[]');
    return Array.isArray(value) ? [...new Set(value.filter((id): id is string => typeof id === 'string'))] : [];
  } catch { return []; }
}

function Rating({ value, onChange }: { value: FocusRating | null; onChange: (next: FocusRating | null) => void }) {
  const { t } = useT();
  return <div className="fv-stars" aria-label={t('focus.rating')}>
    {([1, 2, 3, 4, 5] as FocusRating[]).map((star) => (
      <button key={star} type="button" aria-pressed={star <= (value ?? 0)}
        aria-label={t('focus.rateStars', { count: star })}
        onClick={() => onChange(value === star ? null : star)}>★</button>
    ))}
  </div>;
}

/** When a logged block began, as briefly as reads clearly: `09:30`, `Yesterday`, `Mon 12`. */
function whenLabel(start: string, locale: string, t: ReturnType<typeof useT>['t']): string {
  const at = parseISO(start);
  if (isToday(at)) return new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(at);
  if (isYesterday(at)) return t('focus.yesterday');
  return new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric' }).format(at);
}

interface ManualDialogProps {
  items: Item[];
  lanes: string[];
  focusMode: Mode;
  onClose: () => void;
  onSave: (entry: Omit<FocusEntry, 'source'>) => Promise<void>;
}

/** Log a block that happened away from the timer, in the app's own dialog. */
function ManualDialog({ items, lanes, focusMode, onClose, onSave }: ManualDialogProps) {
  const { t } = useT();
  const [title, setTitle] = useState('');
  const [taskId, setTaskId] = useState<string | null>(null);
  const [lane, setLane] = useState<string | null>(null);
  const [date, setDate] = useState(toApiDate(new Date()));
  const [time, setTime] = useState(format(new Date(), 'HH:mm'));
  const [minutes, setMinutes] = useState(30);
  const [saving, setSaving] = useState(false);
  const valid = Boolean(title.trim() && date && time && minutes >= 1);
  const save = () => {
    if (!valid || saving) return;
    setSaving(true);
    void onSave({ start: `${date}T${time}`, minutes: Math.round(minutes), taskId, title: plainTitle(title.trim()), lane, rating: null, mode: focusMode })
      .then(onClose).finally(() => setSaving(false));
  };
  return <Overlay open onClose={onClose} label={t('focus.logPast')} size="sm">
    <div className="sheet-head">
      <h2>{t('focus.logPast')}</h2>
      <button className="iconbtn" type="button" aria-label={t('common.close')} title={t('common.close')} onClick={onClose}><Icon name="close" /></button>
    </div>
    <div className="sheet-body fv-form">
      <div className="formfield"><span className="fieldlabel">{t('focus.task')}</span>
        <TaskSearch items={items} value={title} selectedId={taskId} placeholder={t('focus.taskPlaceholder')}
          onChange={(value) => { setTitle(value); setTaskId(null); }}
          onSelect={(item) => { setTitle(item.content); setTaskId(item.id); }} />
      </div>
      <div className="fv-form-row">
        <label className="formfield"><span className="fieldlabel">{t('focus.date')}</span>
          <input className="textfield" required type="date" value={date} max={toApiDate(new Date())} onChange={(event) => setDate(event.target.value)} /></label>
        <label className="formfield"><span className="fieldlabel">{t('focus.startTime')}</span>
          <input className="textfield" required type="time" value={time} onChange={(event) => setTime(event.target.value)} /></label>
        <label className="formfield"><span className="fieldlabel">{t('focus.minutesLabel')}</span>
          <input className="textfield" required type="number" min="1" value={minutes} onChange={(event) => setMinutes(Number(event.target.value))} /></label>
      </div>
      {lanes.length > 0 && <div className="formfield"><span className="fieldlabel">{t('focus.lane')}</span>
        <div className="chiprow">{lanes.map((name) => <button key={name} type="button" className="chip" aria-pressed={lane === name}
          onClick={() => setLane(lane === name ? null : name)}>{name}</button>)}</div>
      </div>}
    </div>
    <div className="sheet-foot">
      <button type="button" className="btn quiet" onClick={onClose}>{t('common.cancel')}</button>
      <button type="button" className="btn primary" disabled={!valid || saving} onClick={save}>{t('common.save')}</button>
    </div>
  </Overlay>;
}

/** The reminder switches, behind a bell on the title line: set once, rarely touched. */
function RemindersButton() {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (event: PointerEvent) => { if (!box.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', away); document.removeEventListener('keydown', escape); };
  }, [open]);
  return <div className="fv-popwrap" ref={box}>
    <button type="button" className="btn" aria-expanded={open} aria-label={t('focus.remindersTitle')} title={t('focus.remindersTitle')}
      onClick={() => setOpen((value) => !value)}><Icon name="bell" /></button>
    {open && <div className="fv-pop" role="dialog" aria-label={t('focus.remindersTitle')}><ReminderSettings /></div>}
  </div>;
}

/**
 * The Focus page: today's numbers on the title line, the pixel scene with the
 * one control that matters right now under it, then what's next and what's done.
 */
export function FocusView({ onOpen }: { onOpen: (id: string) => void }) {
  const { t, locale } = useT();
  const { items, childrenOf } = useData();
  const prefs = useFocusPreferences();
  const focusMode = useMode();
  const logs = useFocusLog();
  const now = useFocusNow();
  const { active, justLogged, lastPlannedMin, start, pause, resume, finish, discard, rate, dismiss, logManual, editEntry, deleteEntry } = useFocusStore();
  const snapshot = useStore((state) => state.snapshot);
  const createTaskId = useStore((state) => state.createTaskId);
  const showQuickGroup = useStore((state) => state.prefs.showQuickGroup);
  const confirm = useConfirm();
  const [length, setLength] = useState(prefs.blockLengths[0] ?? 30);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lane, setLane] = useState<string | null>(null);
  const [pinned, setPinned] = useState(readQueue);
  const [manualOpen, setManualOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const modeEntries = useMemo(() => entriesForMode(logs, focusMode), [logs, focusMode]);
  const settings = useMemo(() => settingsFor(prefs, focusMode), [prefs, focusMode]);
  const progress = useMemo(() => todayProgress(modeEntries, settings, new Date(now)), [modeEntries, settings, now]);
  const today = format(new Date(now), 'yyyy-MM-dd');
  const blocksToday = modeEntries.filter((entry) => entry.start.startsWith(today)).length;
  const selected = items.find((item) => item.id === selectedId) ?? null;
  const queue = useMemo(() => focusQueue(items, pinned, new Date(now), showQuickGroup), [items, pinned, now, showQuickGroup]);
  const recent = useMemo(() => [...modeEntries].sort((a, b) => b.start.localeCompare(a.start)).slice(0, 12), [modeEntries]);
  const laneOf = (item: Item) => settings.lanes.find((name) => item.labels.some((label) => label.toLowerCase() === name.toLowerCase())) ?? null;
  const chosenLane = lane && settings.lanes.some((name) => name.toLowerCase() === lane.toLowerCase()) ? lane : null;
  const remaining = active ? remainingMs(active, now) : justLogged ? 0 : length * 60_000;
  const elapsed = active ? elapsedMs(active, now) : 0;
  const taskExists = (id: string | null) => Boolean(id && snapshot.items[id]);

  const saveQueue = (next: string[]) => {
    setPinned(next);
    try { window.localStorage.setItem(QUEUE_KEY, JSON.stringify(next)); } catch { /* The queue still works in this tab. */ }
  };
  const choose = (item: Item) => {
    setSelectedId(item.id);
    setQuery(item.content);
    setLane(laneOf(item));
    setLength(estimateOf(item) ?? prefs.blockLengths[0] ?? 30);
  };
  const clearChoice = () => { setSelectedId(null); setQuery(''); setLane(null); };
  const create = async (): Promise<Item | null> => {
    if (!query.trim()) return null;
    const placement = newTaskPlacement(snapshot, focusMode, markedWorkProjects(useStore.getState()), null);
    const id = await createTaskId({
      content: query.trim(),
      project_id: placement.projectId,
      estimateMinutes: length,
      labels: mergeLabels(chosenLane ? [chosenLane] : [], placement.addLabels),
      due: { date: toApiDate(new Date()), string: toApiDate(new Date()), lang: 'en', timezone: null, is_recurring: false },
    });
    return id ? useStore.getState().snapshot.items[id] ?? null : null;
  };
  const startChosen = async () => {
    if (busy || active || (!selected && !query.trim())) return;
    setBusy(true);
    try {
      const item = selected ?? await create();
      if (!item) return;
      start({ mode: 'focus', focusMode, taskId: item.id, title: plainTitle(item.content), lane: laneOf(item) ?? chosenLane, plannedMin: length });
      clearChoice();
    } finally { setBusy(false); }
  };
  const startBreak = () => start({ mode: 'unwind', focusMode, taskId: null, title: t('focus.unwind'), lane: null, plannedMin: prefs.breakMin });
  const stop = async () => {
    if (!active) return;
    if (active.mode === 'focus' && elapsedMs(active, Date.now()) < MIN_LOGGED_MINUTES * 60_000) {
      if (await confirm({ title: t('focus.discardPrompt'), destructive: true, confirmLabel: t('focus.discard') })) discard();
    } else void finish();
  };

  const title = (text: string, id: string | null, className: string) => (taskExists(id)
    ? <button type="button" className={className} onClick={() => onOpen(id!)} dangerouslySetInnerHTML={{ __html: renderTitle(text) }} />
    : <span className={className} dangerouslySetInnerHTML={{ __html: renderTitle(text) }} />);

  let bar;
  if (active) {
    bar = <div className="fv-bar fv-bar--run">
      <div className="fv-now">
        <span className="fv-kicker">{active.mode === 'unwind' ? t('focus.unwind') : [t('focus.focusingOn'), active.lane].filter(Boolean).join(' · ')}</span>
        {title(active.title, active.taskId, 'fv-now-title')}
      </div>
      <span className="fv-time" aria-live="off">{formatClock(remaining)}</span>
      <div className="fv-ctl">
        {active.pausedAt === null
          ? <button type="button" className="btn lg" onClick={pause}>{t('focus.pause')}</button>
          : <button type="button" className="btn primary lg" onClick={resume}>{t('focus.resume')}</button>}
        <button type="button" className="btn quiet lg" onClick={() => void stop()}>{t('focus.stop')}</button>
      </div>
    </div>;
  } else if (justLogged) {
    bar = <div className="fv-bar fv-bar--done">
      <div className="fv-now">
        <span className="fv-kicker fv-kicker--ok"><Icon name="check" size="sm" /> {t('focus.blockLogged')} · {formatDuration(justLogged.minutes, locale)}</span>
        {title(justLogged.title, justLogged.taskId, 'fv-now-title')}
      </div>
      <div className="fv-feel">
        <span>{t('focus.howFelt')}</span>
        <Rating value={justLogged.rating} onChange={(value) => void rate(value)} />
      </div>
      <div className="fv-ctl">
        <span className="fv-ctl-label">{t('focus.continueSame')}</span>
        {continueLengths(prefs.blockLengths, lastPlannedMin).map((minutes, index) => <button key={minutes} type="button"
          className={index === 0 ? 'btn primary' : 'btn'}
          onClick={() => start({ mode: 'focus', focusMode: justLogged.mode, taskId: justLogged.taskId, title: plainTitle(justLogged.title), lane: justLogged.lane, plannedMin: minutes })}>
          {formatDuration(minutes, locale)}</button>)}
        <button type="button" className="btn quiet" onClick={startBreak}>{t('focus.takeBreak', { minutes: prefs.breakMin })}</button>
        <button type="button" className="btn quiet" onClick={() => { dismiss(); clearChoice(); }}>{t('focus.newTask')}</button>
      </div>
    </div>;
  } else {
    bar = <form className="fv-bar fv-bar--idle" onSubmit={(event) => { event.preventDefault(); void startChosen(); }}>
      <div className="fv-pick">
        <TaskSearch items={items} value={query} selectedId={selectedId} placeholder={t('focus.whatNext')}
          onChange={(value) => { setQuery(value); setSelectedId(null); }} onSelect={choose}
          onCreate={() => void startChosen()} />
        {selected && <button type="button" className="iconbtn fv-clear" aria-label={t('focus.clearTask')} title={t('focus.clearTask')} onClick={clearChoice}><Icon name="close" /></button>}
      </div>
      <div className="fv-opts">
        <div className="chiprow" role="group" aria-label={t('focus.timeRequired')}>
          {prefs.blockLengths.map((minutes) => <button key={minutes} type="button" className="chip" aria-pressed={length === minutes}
            onClick={() => setLength(minutes)}>{formatDuration(minutes, locale)}</button>)}
        </div>
        {settings.lanes.length > 0 && !selected && <div className="chiprow" role="group" aria-label={t('focus.lane')}>
          {settings.lanes.map((name) => <button key={name} type="button" className="chip" aria-pressed={chosenLane === name}
            onClick={() => setLane(chosenLane === name ? null : name)}>{name}</button>)}
        </div>}
        <span className="fv-grow" />
        <button type="button" className="btn quiet" onClick={startBreak}>{t('focus.takeBreak', { minutes: prefs.breakMin })}</button>
        <button type="submit" className="btn primary lg" disabled={busy || (!selected && !query.trim())}>
          <HugeiconsIcon icon={PlayIcon} size={15} strokeWidth={1.8} className="ic" />{t('focus.start')}</button>
      </div>
    </form>;
  }

  return <div className="page fv" data-view="focus">
    <div className="phead">
      <div className="phead-text"><h1 className="ptitle">{t('nav.focus')}</h1></div>
      <div className="pactions">
        <button type="button" className="btn" aria-label={t('focus.logPast')} onClick={() => setManualOpen(true)}><Icon name="plus" /><span className="fv-btn-label">{t('focus.logPast')}</span></button>
        <RemindersButton />
        <button type="button" className="btn" aria-label={t('focus.openSidecar')} onClick={openSidecar}><Icon name="external" /><span className="fv-btn-label">{t('focus.openSidecar')}</span></button>
      </div>
    </div>
    <div className="metrics">
      <span className="metric"><b>{formatDuration(progress.minutes, locale)}</b> {t('focus.ofTargetToday', { target: formatDuration(progress.target, locale) })}</span>
      <span className="sep">·</span>
      <span className="metric"><b>{blocksToday}</b> {t(blocksToday === 1 ? 'focus.blockOne' : 'focus.blockMany')}</span>
      <span className="sep">·</span>
      <span className="metric" title={t('focus.dailyQuest')}>
        <QuestPips fill={progress.pipFill} size={13} ariaLabel={t('focus.questProgress', { count: progress.pips.filter(Boolean).length })} />
      </span>
    </div>

    <GuidanceNudges items={items} entries={modeEntries} onReturn={(item, minutes) => start({ mode: 'focus', focusMode, taskId: item.id,
      title: plainTitle(item.content), lane: laneOf(item), plannedMin: minutes })} />

    <section className={`fv-stage${active ? ' is-running' : ''}`}>
      <div className="fv-scene">
        <FocusScene fill hideTimer progress={active ? elapsed / (active.plannedMin * 60_000) : justLogged ? 1 : 0}
          time={formatClock(remaining)} celebrating={Boolean(justLogged)}
          ariaLabel={t('focus.sceneLabel', { time: formatClock(remaining) })} />
      </div>
      {bar}
    </section>

    <div className="fv-cols">
      <section className="fv-list">
        <div className="fv-head"><h2 className="gname">{t('focus.upNext')}</h2><span className="gcount">{queue.length}</span></div>
        {queue.length === 0
          ? <p className="fv-empty">{t('focus.upNextEmpty')}</p>
          : <div className="fv-tasks">{queue.map((item) => <div key={item.id} className="taskwrap fv-taskwrap">
            <TaskRow item={item} childrenOf={childrenOf} onOpen={onOpen} />
            {pinned.includes(item.id) && <button type="button" className="iconbtn fv-unpin" aria-label={t('focus.removeQueue', { title: plainTitle(item.content) })}
              title={t('focus.removeQueue', { title: plainTitle(item.content) })} onClick={() => saveQueue(pinned.filter((id) => id !== item.id))}><Icon name="close" size="sm" /></button>}
          </div>)}</div>}
      </section>

      <section className="fv-list">
        <div className="fv-head"><h2 className="gname">{t('focus.recent')}</h2></div>
        {recent.length === 0
          ? <p className="fv-empty">{t('focus.recentEmpty')}</p>
          : <ul className="fv-log">{recent.map((entry) => <li key={entryKey(entry)} className="fv-log-row">
            <div className="fv-log-text">
              {title(entry.title, entry.taskId, 'fv-log-title')}
              <span className="meta fv-log-meta">
                <time dateTime={entry.start}>{whenLabel(entry.start, locale, t)}</time>
                {entry.lane && <span className="tag">{entry.lane}</span>}
                <Rating value={entry.rating} onChange={(value) => void editEntry(entryKey(entry), { rating: value })} />
              </span>
            </div>
            <span className="fv-log-mins">{formatDuration(entry.minutes, locale)}</span>
            <button type="button" className="iconbtn fv-log-del" aria-label={t('focus.deleteEntry', { title: plainTitle(entry.title) })}
              title={t('focus.deleteEntry', { title: plainTitle(entry.title) })} onClick={async () => {
                if (await confirm({ title: t('focus.deletePrompt'), destructive: true })) void deleteEntry(entryKey(entry));
              }}><Icon name="close" size="sm" /></button>
          </li>)}</ul>}
      </section>
    </div>
    {manualOpen && <ManualDialog items={items} lanes={settings.lanes} focusMode={focusMode} onClose={() => setManualOpen(false)} onSave={logManual} />}
  </div>;
}
