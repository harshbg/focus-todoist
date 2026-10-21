import '@/focus/fonts';
import { useMemo, useState } from 'react';
import { format, getISODay, parseISO, startOfISOWeek } from 'date-fns';
import { useT } from '@/hooks/useT';
import type { TranslationKey } from '@/i18n';
import {
  ATTENTION_SLOTS, attentionMap, bestWeekMinutes, cadence, calmCadence, comebacks,
  focusRun, footprint, mainLane, quality, strongWeeks, weeklyMomentum, weeklyTemple, yearGrid,
} from '@/focus/domain/metrics';
import { recentFocusedDays, worldStage } from '@/focus/domain/progressPresentation';
import { nextUp, trophyProgress } from '@/focus/domain/trophies';
import type { Trophy } from '@/focus/domain/trophies';
import type { ExemptKind } from '@/focus/domain/types';
import { setFocusPreferences, useFocusLog, useFocusPreferences } from '@/focus/store';
import { useMode } from '@/focus/mode-store';
import { entriesForMode } from '@/focus/domain/modeEntries';
import { settingsFor } from '@/focus/domain/settings';
import { FootprintChart } from '@/focus/pixel/FootprintChart';
import { TempleScene } from '@/focus/pixel/TempleScene';
import { WorldScene } from '@/focus/pixel/WorldScene';
import './focus.css';
import './progress.css';

function Duration({ minutes }: { minutes: number }) {
  const { t, locale } = useT();
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const number = new Intl.NumberFormat(locale);
  if (!hours) return <>{t('progress.durationMinutes', { minutes: number.format(minutes) })}</>;
  if (!rest) return <>{t('progress.durationHours', { hours: number.format(hours) })}</>;
  return <>{t('progress.durationHoursMinutes', { hours: number.format(hours), minutes: number.format(rest) })}</>;
}

function TrophyName({ trophy }: { trophy: Trophy }) {
  const { t, locale } = useT();
  const count = new Intl.NumberFormat(locale).format(trophy.goal);
  if (trophy.id === 'sessions-1') return <>{t('progress.trophy.firstStone')}</>;
  if (trophy.id === 'hours-10000') return <>{t('progress.trophy.holyGrail')}</>;
  if (trophy.id === 'bigWeek-1200') return <>{t('progress.trophy.firstWeek')}</>;
  if (trophy.id === 'bigWeek-2400') return <>{t('progress.trophy.fortyWeek')}</>;
  const key: TranslationKey = trophy.family === 'sessions' ? 'progress.trophy.sessions'
    : trophy.family === 'hours' ? 'progress.trophy.hours'
      : trophy.family === 'strongWeeks' ? 'progress.trophy.strongWeeks'
        : trophy.family === 'bright' ? 'progress.trophy.bright'
          : trophy.family === 'ratings' ? 'progress.trophy.ratings' : 'progress.trophy.comebacks';
  return <>{t(key, { count })}</>;
}

const dayKeys: TranslationKey[] = [
  'progress.day.mon', 'progress.day.tue', 'progress.day.wed', 'progress.day.thu',
  'progress.day.fri', 'progress.day.sat', 'progress.day.sun',
];
const tierKeys: Record<Trophy['tier'], TranslationKey> = {
  bronze: 'progress.tier.bronze', silver: 'progress.tier.silver', gold: 'progress.tier.gold',
  platinum: 'progress.tier.platinum', palladium: 'progress.tier.palladium',
  rhodium: 'progress.tier.rhodium', iridium: 'progress.tier.iridium', osmium: 'progress.tier.osmium',
};
const blurbKeys: Record<Trophy['family'], TranslationKey> = {
  sessions: 'progress.blurb.sessions', hours: 'progress.blurb.hours', bigWeek: 'progress.blurb.bigWeek',
  strongWeeks: 'progress.blurb.strongWeeks', bright: 'progress.blurb.bright',
  ratings: 'progress.blurb.ratings', comebacks: 'progress.blurb.comebacks',
};

export function ProgressView() {
  const { t, locale } = useT();
  const entries = useFocusLog();
  const prefs = useFocusPreferences();
  const mode = useMode();
  const modeEntries = useMemo(() => entriesForMode(entries, mode), [entries, mode]);
  const settings = useMemo(() => settingsFor(prefs, mode), [prefs, mode]);
  const [exemptDate, setExemptDate] = useState('');
  const [exemptKind, setExemptKind] = useState<ExemptKind>('pto');
  const [exemptError, setExemptError] = useState(false);
  const currentDay = format(new Date(), 'yyyy-MM-dd');
  const data = useMemo(() => {
    const now = new Date();
    const temple = weeklyTemple(modeEntries, settings, now);
    const weekStart = format(startOfISOWeek(now), 'yyyy-MM-dd');
    const weekEntries = modeEntries.filter((entry) => entry.start.slice(0, 10) >= weekStart && entry.start.slice(0, 10) <= currentDay);
    const run = focusRun(modeEntries, settings, now);
    const map = attentionMap(modeEntries, now);
    const q = quality(modeEntries, now);
    const trophies = trophyProgress({
      sessions: modeEntries.length,
      totalMinutes: modeEntries.reduce((total, entry) => total + entry.minutes, 0),
      bestWeekMinutes: bestWeekMinutes(modeEntries),
      strongWeeks: strongWeeks(modeEntries, settings),
      brightBlocks: q.bright,
      ratings: q.ratings,
      comebacks: comebacks(modeEntries, settings, now),
    });
    return {
      temple, weekBlocks: weekEntries.length, run, map, q, trophies,
      unlocked: trophies.filter((item) => item.unlocked),
      upcoming: nextUp(trophies),
      lane: mainLane(modeEntries, now),
      cadence: cadence(modeEntries, now, 7),
      calm: calmCadence(modeEntries, settings, now),
      footprint: footprint(modeEntries, now),
      recent: recentFocusedDays(modeEntries, currentDay),
      year: yearGrid(modeEntries, settings, now),
      momentum: weeklyMomentum(modeEntries, settings, now),
    };
  }, [modeEntries, settings, currentDay]);
  const number = new Intl.NumberFormat(locale);
  const dateFormat = new Intl.DateTimeFormat(locale, { weekday: 'short', month: 'short', day: 'numeric' });
  const shortDate = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' });
  const weekShare = data.temple.target > 0 ? Math.round(data.temple.minutes / data.temple.target * 100) : 100;
  const maxCadence = Math.max(1, ...data.cadence.map(({ minutes }) => minutes));
  const best = data.map.best;
  const bestLabel = best ? `${t(dayKeys[best.day])} · ${t(`progress.slot.${best.slot}` as TranslationKey)}` : t('progress.noWindow');

  return <div className="focus-theme fx-page pg-page">
    <h1 className="fx-hero-title">{t('nav.progress')}</h1>

    <section className="fx-section" aria-labelledby="pg-temple-title">
      <div className="fx-section-head"><div><p className="fx-eyebrow">{t('progress.weeklyTemple')}</p><h2 className="fx-h2" id="pg-temple-title">{t('progress.templeTitle')}</h2></div>
        <aside className="pg-stat"><strong className="pg-stat-value"><Duration minutes={data.temple.minutes} /></strong><span className="pg-stat-note">{t('progress.ofTarget', { target: number.format(data.temple.target / 60) })}</span></aside></div>
      <TempleScene blocks={data.temple.blocks} totalBlocks={data.temple.totalBlocks}
        counter={t('progress.templeCounter', { blocks: data.temple.blocks, total: data.temple.totalBlocks })}
        caption={t('progress.templeCaption')}
        ariaLabel={t('progress.templeScene', { blocks: data.temple.blocks, total: data.temple.totalBlocks })} />
    </section>

    <section className="fx-section" aria-labelledby="pg-rhythm-title">
      <div className="fx-section-head"><div><p className="fx-eyebrow">{t('progress.yourRhythm')}</p><h2 className="fx-h2" id="pg-rhythm-title">{t('progress.rhythmTitle')}</h2></div></div>
      <div className="pg-cards">
        <article className="fx-card pg-stat"><p className="fx-eyebrow">{t('progress.weeklyProgress')}</p><strong className="pg-stat-value">{number.format(weekShare)}<span className="pg-stat-unit">%</span></strong><div className="fx-bar"><span style={{ width: `${Math.min(100, weekShare)}%` }} /></div><p className="pg-stat-note">{t('progress.loggedToward', { minutes: number.format(data.temple.minutes), hours: number.format(data.temple.target / 60) })}</p></article>
        <article className="fx-card pg-stat"><p className="fx-eyebrow">{t('progress.mainLane')}</p><strong className="pg-stat-value">{data.lane ?? t('progress.noLane')}</strong><p className="pg-stat-note">{t('progress.mainLaneNote')}</p></article>
        <article className="fx-card pg-stat"><p className="fx-eyebrow">{t('progress.sevenDayCadence')}</p><div className="pg-bars" role="img" aria-label={t('progress.cadenceDescription')}>
          {data.cadence.map(({ date, minutes }) => <span key={date} style={{ height: `${Math.max(2, minutes / maxCadence * 100)}%` }} title={t('progress.cadenceTooltip', { date: dateFormat.format(parseISO(date)), minutes: number.format(minutes) })} />)}
        </div><div className="pg-bars-labels" aria-hidden="true">{data.cadence.map(({ date }) => <span key={date}>{t(dayKeys[getISODay(parseISO(date)) - 1]).slice(0, 1)}</span>)}</div></article>
      </div>
      <article className="fx-card pg-recap"><p className="fx-eyebrow">{t('progress.weeklyRecap')}</p><div className="pg-recap-total"><Duration minutes={data.temple.minutes} /></div>
        <p className="pg-recap-line">{t('progress.recapBlocks', { blocks: number.format(data.weekBlocks), days: number.format(data.run.weekFocused) })}</p>
        <p>{data.lane ? t('progress.recapLane', { lane: data.lane }) : t('progress.recapNoLane')}</p>
        <div className="pg-cards"><div><span className="fx-label">{t('progress.calmCadence')}</span><strong>{t('progress.calmValue', { count: data.calm })}</strong></div><div><span className="fx-label">{t('progress.bestWindow')}</span><strong>{bestLabel}</strong></div><div><span className="fx-label">{t('progress.quality')}</span><strong>{data.q.weekAverage === null ? t('progress.noQuality') : t('progress.qualityValue', { value: number.format(data.q.weekAverage) })}</strong></div></div>
      </article>
    </section>

    <section className="fx-section" aria-labelledby="pg-attention-title">
      <div className="fx-section-head"><div><p className="fx-eyebrow">{t('progress.attentionMap')}</p><h2 className="fx-h2" id="pg-attention-title">{t('progress.attentionTitle')}</h2></div><aside className="fx-eyebrow">{t('progress.attentionRange')}</aside></div>
      <div className="pg-heat"><div className="pg-heat-labels" aria-hidden="true"><span />{ATTENTION_SLOTS.map((_, index) => <span key={index}>{t(`progress.slot.${index}` as TranslationKey)}</span>)}</div>
        {data.map.levels.map((row, day) => <div className="pg-heat-row" key={day}><span>{t(dayKeys[day])}</span>{row.map((level, slot) => <span key={slot} className="pg-heat-cell" data-level={level} title={t('progress.heatTooltip', { day: t(dayKeys[day]), slot: t(`progress.slot.${slot}` as TranslationKey), minutes: number.format(data.map.minutes[day][slot]) })} />)}</div>)}
      </div>
      <aside className="pg-heat-best fx-card"><p className="fx-eyebrow">{t('progress.bestWindow')}</p><strong>{bestLabel}</strong><p>{best ? <><Duration minutes={best.minutes} /> {t('progress.loggedInWindow')}</> : t('progress.noWindowNote')}</p></aside>
      <div className="pg-legend"><span>{t('progress.quiet')}</span>{[0, 1, 2, 3, 4].map((level) => <i key={level} className="pg-heat-cell" data-level={level} />)}<span>{t('progress.strong')}</span></div>
    </section>

    <section className="fx-section" aria-labelledby="pg-run-title">
      <div className="fx-section-head"><div><p className="fx-eyebrow">{t('progress.focusRun')}</p><h2 className="fx-h2" id="pg-run-title">{t('progress.runTitle')}</h2><p>{t('progress.runCopy', { minutes: number.format(settings.runThresholdMin) })}</p></div></div>
      <div className="pg-cards"><article className="fx-card pg-stat"><p className="fx-eyebrow">{t('progress.currentRun')}</p><strong className="pg-stat-value">{data.run.current}</strong><span className="pg-stat-unit">{t('progress.days')}</span></article>
        <article className="fx-card pg-stat"><p className="fx-eyebrow">{t('progress.longestRun')}</p><strong className="pg-stat-value">{data.run.longest}</strong><span className="pg-stat-unit">{t('progress.days')}</span></article>
        <article className="fx-card pg-stat"><p className="fx-eyebrow">{t('progress.thisWeek')}</p><strong className="pg-stat-value">{data.run.weekFocused} / {data.run.weekEligible}</strong><span className="pg-stat-unit">{t('progress.days')}</span></article></div>
      <div className="pg-year" role="img" aria-label={t('progress.yearDescription')}>
        {data.year.map((week) => <div className="pg-year-col" key={week.weekStart}>{week.days.map((day) => <span className="pg-year-cell" key={day.date} data-state={day.state} title={t('progress.yearTooltip', { date: dateFormat.format(parseISO(day.date)), state: t(`progress.state.${day.state}` as TranslationKey) })} />)}</div>)}
      </div><div className="pg-legend"><span>{t('progress.yearCaption')}</span>{(['focused', 'pto', 'holiday'] as const).map((state) => <span key={state}><i className="pg-year-cell" data-state={state} />{t(`progress.state.${state}` as TranslationKey)}</span>)}</div>
      <p className="fx-eyebrow">{t('progress.weeklyMomentum')}</p><div className="pg-momentum" role="img" aria-label={t('progress.momentumDescription')}>
        {data.momentum.map((week) => <span key={week.weekStart} className="pg-momentum-cell" data-days={Math.min(5, week.focusedDays)} title={t('progress.momentumTooltip', { date: shortDate.format(parseISO(week.weekStart)), days: week.focusedDays })} />)}
      </div>
      <form className="pg-exempt fx-card" onSubmit={(event) => { event.preventDefault(); if (!exemptDate || !settings.workdays.includes(getISODay(parseISO(exemptDate)))) { setExemptError(true); return; } setFocusPreferences({ exemptDays: [...prefs.exemptDays.filter((day) => day.date !== exemptDate), { date: exemptDate, kind: exemptKind }].sort((a, b) => a.date.localeCompare(b.date)) }); setExemptDate(''); setExemptError(false); }}>
        <p className="fx-eyebrow">{t('progress.excuseWorkday')}</p><label className="fx-label">{t('progress.date')}<input type="date" required value={exemptDate} onChange={(event) => { setExemptDate(event.target.value); setExemptError(false); }} /></label>
        <div className="fx-seg" role="group" aria-label={t('progress.timeOffKind')}><button type="button" aria-pressed={exemptKind === 'pto'} onClick={() => setExemptKind('pto')}>{t('progress.state.pto')}</button><button type="button" aria-pressed={exemptKind === 'holiday'} onClick={() => setExemptKind('holiday')}>{t('progress.state.holiday')}</button></div>
        <button className="fx-btn fx-btn--primary" type="submit">{t('progress.markExempt')}</button>{exemptError && <p role="alert">{t('progress.workdayOnly')}</p>}
        <p className="fx-label">{t('progress.markedTimeOff')}</p><div className="pg-exempt-chips">{prefs.exemptDays.length ? prefs.exemptDays.map((day) => <button type="button" className="fx-chip" key={day.date} aria-label={t('progress.removeExempt', { kind: t(`progress.state.${day.kind}` as TranslationKey), date: dateFormat.format(parseISO(day.date)) })} onClick={() => setFocusPreferences({ exemptDays: prefs.exemptDays.filter((item) => item.date !== day.date) })}>{t(`progress.state.${day.kind}` as TranslationKey)} · {shortDate.format(parseISO(day.date))} ×</button>) : <span>{t('progress.noTimeOff')}</span>}</div>
      </form>
    </section>

    <section className="fx-section" aria-labelledby="pg-footprint-title"><div className="fx-section-head"><div><p className="fx-eyebrow">{t('progress.pixelFootprint')}</p><h2 className="fx-h2" id="pg-footprint-title">{t('progress.footprintTitle')}</h2></div><aside className="fx-eyebrow">{t('progress.brickKey')}</aside></div>
      <FootprintChart days={data.footprint.map((day, index) => ({ ...day, label: index % 5 === 0 ? shortDate.format(parseISO(day.date)) : undefined }))} ariaLabel={t('progress.footprintDescription')} />
      <p className="fx-eyebrow">{t('progress.recentLogs')}</p><p>{data.recent.length ? data.recent.map(({ date, minutes }, index) => <span key={date}>{index > 0 && ' · '}{dateFormat.format(parseISO(date))} · <Duration minutes={minutes} /></span>) : t('progress.noRecent')}</p>
    </section>

    <section className="fx-section" aria-labelledby="pg-trophies-title"><div className="fx-section-head"><div><p className="fx-eyebrow">{t('progress.trophyCabinet')}</p><h2 className="fx-h2" id="pg-trophies-title">{t('progress.trophyTitle')}</h2></div><aside className="fx-eyebrow">{t('progress.unlockedCount', { count: data.unlocked.length, total: data.trophies.length })}</aside></div>
      <div className="pg-world fx-card"><WorldScene unlocked={data.unlocked.map((item) => item.trophy.id)} ariaLabel={t('progress.worldScene', { count: data.unlocked.length })} /><div className="pg-world-copy"><p className="fx-eyebrow">{t('progress.currentWorld')}</p><h3>{t(`progress.world.${worldStage(data.unlocked.length)}` as TranslationKey)}</h3><p>{t('progress.worldCopy')}</p><div className="pg-next"><p className="fx-eyebrow">{t('progress.nextUp')}</p>{data.upcoming.length ? <ul>{data.upcoming.map((item) => <li key={item.trophy.id}><TrophyName trophy={item.trophy} /> · {item.trophy.family === 'bigWeek' ? <Duration minutes={item.value} /> : number.format(item.value)} / {item.trophy.family === 'bigWeek' ? <Duration minutes={item.trophy.goal} /> : number.format(item.trophy.goal)}</li>)}</ul> : <p>{t('progress.allEarned')}</p>}</div></div></div>
      <div className="pg-trophies">{data.trophies.map((item) => <article className={`pg-trophy${item.unlocked ? ' is-unlocked' : ''}`} key={item.trophy.id}>
        <p className="pg-trophy-tier">{t(tierKeys[item.trophy.tier])} · {item.unlocked ? t('progress.unlocked') : t('progress.toGo', { percent: Math.round((1 - item.progress) * 100) })}</p>
        <h3 className="pg-trophy-title" id={`pg-trophy-${item.trophy.id}`}><TrophyName trophy={item.trophy} /></h3><p className="pg-trophy-blurb">{item.trophy.id === 'bigWeek-2400' ? t('progress.blurb.fortyWeek') : t(blurbKeys[item.trophy.family])}</p>
        <div className="pg-trophy-bar" role="progressbar" aria-labelledby={`pg-trophy-${item.trophy.id}`} aria-valuenow={item.value} aria-valuemin={0} aria-valuemax={item.trophy.goal}><span style={{ width: `${item.progress * 100}%` }} /></div><p className="pg-trophy-count">{item.trophy.family === 'bigWeek' ? <Duration minutes={item.value} /> : number.format(item.value)} / {item.trophy.family === 'bigWeek' ? <Duration minutes={item.trophy.goal} /> : number.format(item.trophy.goal)}</p>
      </article>)}</div>
    </section>
  </div>;
}
