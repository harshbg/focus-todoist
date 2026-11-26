import { formatDuration } from '@/domain/estimates';
import { useConfirm } from '@/components/overlays/Confirm';
import { useT } from '@/hooks/useT';
import { MIN_LOGGED_MINUTES, savableMinutes, type ActiveBlock } from '../domain/timer';
import { useFocusStore } from '../store';

/**
 * Ending a block before its time, said plainly: "Save 18 min & end" logs the
 * minutes worked so far, Discard throws the block away (after asking). A
 * break has nothing to save, so it only ends. Each page passes its own button
 * classes.
 */
export function EndBlockButtons({ active, now, saveClass, discardClass }: {
  active: ActiveBlock;
  now: number;
  saveClass: string;
  discardClass: string;
}) {
  const { t, locale } = useT();
  const confirm = useConfirm();
  const finish = useFocusStore((state) => state.finish);
  const discard = useFocusStore((state) => state.discard);

  if (active.mode === 'unwind') {
    return <button type="button" className={discardClass} onClick={() => void finish()}>{t('focus.endBreak')}</button>;
  }
  const minutes = savableMinutes(active, now);
  const tooShort = t('focus.saveTooShort', { minutes: MIN_LOGGED_MINUTES });
  return <>
    <button type="button" className={saveClass} disabled={minutes === null} title={minutes === null ? tooShort : undefined}
      onClick={() => void finish()}>
      {minutes === null ? t('focus.saveEndShort') : t('focus.saveEnd', { length: formatDuration(minutes, locale) })}
    </button>
    <button type="button" className={discardClass} onClick={async () => {
      if (await confirm({ title: t('focus.discardPrompt'), destructive: true, confirmLabel: t('focus.discard') })) discard();
    }}>{t('focus.discard')}</button>
  </>;
}
