import { useT } from '@/hooks/useT';

export function ProgressView() {
  const { t } = useT();
  return <div className="focus-theme fx-page"><header className="fx-hero"><h1 className="fx-hero-title">{t('focus.progressTitle')}</h1><p>{t('focus.comingNext')}</p></header></div>;
}
