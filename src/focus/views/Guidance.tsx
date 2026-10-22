import { useEffect, useMemo, useState } from 'react';
import { parseISO } from 'date-fns';
import { formatDuration } from '@/domain/estimates';
import type { Item } from '@/domain/types';
import { useT } from '@/hooks/useT';
import { notificationsSupported } from '../alerts';
import { missedBlock, RESTART_LENGTH_MIN, weeklyInsight } from '../domain/guidance';
import type { FocusEntry } from '../domain/types';
import { setFocusPreferences, useFocusPreferences, useFocusStore } from '../store';

const RESTART_KEY = 'tde.focus.restartOffered';
const INSIGHT_KEY = 'tde.focus.insightSeen';

function readStored<T>(key: string, fallback: T): T {
  try { return JSON.parse(window.localStorage.getItem(key) ?? 'null') as T ?? fallback; } catch { return fallback; }
}
function writeStored(key: string, value: unknown): void {
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* Shown again next time, which is harmless. */ }
}

/** A clock for nudges that change by the minute, ticking even when no block runs. */
function useMinute(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

/**
 * The opt-in nudges at the top of the Focus page: one offer to return to a
 * planned block that went by (once per task), and last week's numbers on Mondays.
 */
export function GuidanceNudges({ items, entries, onReturn }: { items: Item[]; entries: FocusEntry[]; onReturn: (item: Item, minutes: number) => void }) {
  const { t, locale } = useT();
  const { guidance } = useFocusPreferences();
  const active = useFocusStore((state) => state.active);
  const now = useMinute();
  const [offered, setOffered] = useState<string[]>(() => readStored(RESTART_KEY, []));
  const [seenWeek, setSeenWeek] = useState<string | null>(() => readStored(INSIGHT_KEY, null));
  const missed = useMemo(() => guidance.gentleRestart ? missedBlock(items, entries, now) : null, [guidance.gentleRestart, items, entries, now]);
  const insight = useMemo(() => guidance.weeklyInsight ? weeklyInsight(entries, now) : null, [guidance.weeklyInsight, entries, now]);

  const settle = (id: string) => {
    // Only the latest few are kept; an old id can't come back as a missed block of today.
    const next = [...offered, id].slice(-20);
    setOffered(next);
    writeStored(RESTART_KEY, next);
  };
  const showRestart = missed && !active && !offered.includes(missed.id);
  const showInsight = insight && seenWeek !== insight.week;
  if (!showRestart && !showInsight) return null;

  return <div className="fx-nudges">
    {showRestart && <section className="fx-card fx-nudge" aria-live="polite">
      <p className="fx-eyebrow">{t('focus.restartEyebrow')}</p>
      <p className="fx-nudge-text">{t('focus.restartText', { title: missed.content })}</p>
      <div className="fx-actions">
        <button className="fx-btn fx-btn--primary" onClick={() => { settle(missed.id); onReturn(missed, RESTART_LENGTH_MIN); }}>
          {t('focus.restartGo', { length: formatDuration(RESTART_LENGTH_MIN, locale) })}</button>
        <button className="fx-btn fx-btn--ghost" onClick={() => settle(missed.id)}>{t('focus.notNow')}</button>
      </div>
    </section>}
    {showInsight && <section className="fx-card fx-nudge">
      <p className="fx-eyebrow">{t('focus.insightEyebrow')}</p>
      <p className="fx-nudge-text">{t('focus.insightText', {
        total: formatDuration(insight.minutes, locale), blocks: insight.blocks, days: insight.days,
      })}{insight.lane ? ` ${t('focus.insightLane', { lane: insight.lane })}` : ''}{insight.bestDay
        ? ` ${t('focus.insightBest', { day: new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(parseISO(insight.bestDay)) })}` : ''}</p>
      <div className="fx-actions">
        <button className="fx-btn fx-btn--secondary" onClick={() => { setSeenWeek(insight.week); writeStored(INSIGHT_KEY, insight.week); }}>{t('focus.gotIt')}</button>
      </div>
    </section>}
  </div>;
}

/** The three guidance switches, with what they can and cannot do said plainly. */
export function ReminderSettings() {
  const { t } = useT();
  const prefs = useFocusPreferences();
  const [permission, setPermission] = useState(() => notificationsSupported() ? Notification.permission : 'denied');
  const set = (patch: Partial<typeof prefs.guidance>) => setFocusPreferences({ guidance: { ...prefs.guidance, ...patch } });

  const toggleAlerts = async (on: boolean) => {
    set({ startAlerts: on });
    if (on && notificationsSupported() && Notification.permission === 'default') {
      setPermission(await Notification.requestPermission());
    }
  };

  return <div className="fx-card fx-plan-card">
    <p className="fx-label">{t('focus.remindersTitle')}</p>
    <label className="fx-toggle"><input type="checkbox" checked={prefs.guidance.startAlerts} disabled={!notificationsSupported()}
      onChange={(event) => void toggleAlerts(event.target.checked)} />{t('focus.reminderStart')}</label>
    {prefs.guidance.startAlerts && permission === 'denied' && <p className="fx-hint">{t('focus.reminderBlocked')}</p>}
    <label className="fx-toggle"><input type="checkbox" checked={prefs.guidance.gentleRestart}
      onChange={(event) => set({ gentleRestart: event.target.checked })} />{t('focus.reminderRestart')}</label>
    <label className="fx-toggle"><input type="checkbox" checked={prefs.guidance.weeklyInsight}
      onChange={(event) => set({ weeklyInsight: event.target.checked })} />{t('focus.reminderInsight')}</label>
    <p className="fx-plan-note">{t('focus.reminderNote')}</p>
  </div>;
}
