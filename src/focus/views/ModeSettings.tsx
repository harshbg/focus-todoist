import { useMemo } from 'react';
import { useT } from '@/hooks/useT';
import type { TranslationKey } from '@/i18n';
import { useStore } from '@/store/store';
import { setFocusPreferences, useFocusPreferences } from '@/focus/store';
import {
  clampDailyTarget,
  clampRunThreshold,
  clampWeeklyTarget,
  filterTopLevelProjects,
  isBuiltInWorkProject,
  parseLanesInput,
  removeLane,
  toggleWorkday,
  toggleWorkProject,
} from '@/focus/domain/modeSettings';
import './mode.css';

const ISO_WORKDAYS: Array<{ day: number; key: TranslationKey }> = [
  { day: 1, key: 'progress.day.mon' },
  { day: 2, key: 'progress.day.tue' },
  { day: 3, key: 'progress.day.wed' },
  { day: 4, key: 'progress.day.thu' },
  { day: 5, key: 'progress.day.fri' },
  { day: 6, key: 'progress.day.sat' },
  { day: 7, key: 'progress.day.sun' },
];

/** Matches the Row markup from SettingsView. */
function Row({
  title,
  hint,
  children,
  wide,
}: {
  title: string;
  hint?: React.ReactNode;
  children?: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={`setrow${wide ? ' setrow-wide' : ''}`}>
      <div>
        <strong>{title}</strong>
        {hint && <span>{hint}</span>}
      </div>
      {children}
    </div>
  );
}

/**
 * Settings section for Work & Personal modes (SPEC §10.2, MODE.md M2 item 6).
 * Configures top-level Work projects and Personal targets/lanes.
 */
export function ModeSettings() {
  const { t } = useT();
  const prefs = useFocusPreferences();
  const projects = useStore((s) => s.snapshot.projects);
  const user = useStore((s) => s.snapshot.user);

  const topLevelProjects = useMemo(
    () => filterTopLevelProjects(projects, user?.inbox_project_id),
    [projects, user?.inbox_project_id],
  );

  const personal = prefs.personal;

  return (
    <>
      <h2>{t('settings.modes')}</h2>

      <h3 className="setsubhead">{t('settings.modeWorkProjects')}</h3>
      <p className="setgroup-hint">{t('settings.modeWorkProjectsHint')}</p>

      {topLevelProjects.length === 0 ? (
        <p className="sethint">{t('settings.modeNoProjects')}</p>
      ) : (
        topLevelProjects.map((project) => {
          const isBuiltIn = isBuiltInWorkProject(project);
          const isWork = isBuiltIn || prefs.workProjectIds.includes(project.id);
          const hint = isBuiltIn ? t('settings.modeBuiltInWorkHint') : undefined;

          return (
            <Row key={project.id} title={project.name} hint={hint}>
              <label className="checkrow mode-project-check">
                <input
                  type="checkbox"
                  checked={isWork}
                  disabled={isBuiltIn}
                  onChange={(e) => {
                    const next = toggleWorkProject(
                      prefs.workProjectIds,
                      project.id,
                      e.target.checked,
                    );
                    setFocusPreferences({ workProjectIds: next });
                  }}
                />
                <span>{t('mode.work')}</span>
              </label>
            </Row>
          );
        })
      )}

      <h3 className="setsubhead">{t('settings.modePersonalTargets')}</h3>
      <p className="setgroup-hint">{t('settings.modePersonalTargetsHint')}</p>

      <Row title={t('settings.modeDailyTarget')} hint={t('settings.modeDailyTargetHint')}>
        <span className="setunit">
          <input
            key={personal.dailyTargetMin}
            className="estinput"
            inputMode="numeric"
            defaultValue={String(personal.dailyTargetMin)}
            aria-label={t('settings.modeDailyTarget')}
            onBlur={(event) => {
              const val = Number.parseInt(event.target.value, 10);
              const next = Number.isFinite(val)
                ? clampDailyTarget(val)
                : personal.dailyTargetMin;
              if (next !== personal.dailyTargetMin) {
                setFocusPreferences({
                  personal: { ...personal, dailyTargetMin: next },
                });
              }
              event.target.value = String(next);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur();
            }}
          />
          <span>{t('common.minutes')}</span>
        </span>
      </Row>

      <Row title={t('settings.modeWeeklyTarget')} hint={t('settings.modeWeeklyTargetHint')}>
        <span className="setunit">
          <input
            key={personal.weeklyTargetMin}
            className="estinput"
            inputMode="numeric"
            defaultValue={String(personal.weeklyTargetMin)}
            aria-label={t('settings.modeWeeklyTarget')}
            onBlur={(event) => {
              const val = Number.parseInt(event.target.value, 10);
              const next = Number.isFinite(val)
                ? clampWeeklyTarget(val)
                : personal.weeklyTargetMin;
              if (next !== personal.weeklyTargetMin) {
                setFocusPreferences({
                  personal: { ...personal, weeklyTargetMin: next },
                });
              }
              event.target.value = String(next);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur();
            }}
          />
          <span>{t('common.minutes')}</span>
        </span>
      </Row>

      <Row title={t('settings.modeRunThreshold')} hint={t('settings.modeRunThresholdHint')}>
        <span className="setunit">
          <input
            key={personal.runThresholdMin}
            className="estinput"
            inputMode="numeric"
            defaultValue={String(personal.runThresholdMin)}
            aria-label={t('settings.modeRunThreshold')}
            onBlur={(event) => {
              const val = Number.parseInt(event.target.value, 10);
              const next = Number.isFinite(val)
                ? clampRunThreshold(val)
                : personal.runThresholdMin;
              if (next !== personal.runThresholdMin) {
                setFocusPreferences({
                  personal: { ...personal, runThresholdMin: next },
                });
              }
              event.target.value = String(next);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur();
            }}
          />
          <span>{t('common.minutes')}</span>
        </span>
      </Row>

      <Row title={t('settings.modeWorkdays')} hint={t('settings.modeWorkdaysHint')}>
        <div className="mode-workdays-grid" role="group" aria-label={t('settings.modeWorkdays')}>
          {ISO_WORKDAYS.map(({ day, key }) => (
            <label className="checkrow" key={day}>
              <input
                type="checkbox"
                checked={personal.workdays.includes(day)}
                aria-label={t(key)}
                onChange={() => {
                  const next = toggleWorkday(personal.workdays, day);
                  setFocusPreferences({
                    personal: { ...personal, workdays: next },
                  });
                }}
              />
              <span>{t(key)}</span>
            </label>
          ))}
        </div>
      </Row>

      <Row title={t('settings.modeLanes')} hint={t('settings.modeLanesHint')} wide>
        <div className="mode-lanes-editor">
          {personal.lanes.length > 0 && (
            <div className="mode-lanes-chips">
              {personal.lanes.map((lane) => (
                <span key={lane.toLowerCase()} className="pill">
                  <span>{lane}</span>
                  <button
                    type="button"
                    className="mode-lane-remove"
                    aria-label={t('settings.modeRemoveLane', { name: lane })}
                    onClick={() => {
                      const next = removeLane(personal.lanes, lane);
                      setFocusPreferences({
                        personal: { ...personal, lanes: next },
                      });
                    }}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          <input
            key={personal.lanes.join(',')}
            className="textfield mode-lanes-input"
            defaultValue={personal.lanes.join(', ')}
            aria-label={t('settings.modeLanes')}
            placeholder={t('settings.modeLanesPlaceholder')}
            onBlur={(event) => {
              const next = parseLanesInput(event.target.value);
              setFocusPreferences({
                personal: { ...personal, lanes: next },
              });
              event.target.value = next.join(', ');
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur();
            }}
          />
        </div>
      </Row>
    </>
  );
}
