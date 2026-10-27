import { useT } from '@/hooks/useT';
import { FEEDBACK_URL } from '@/app-info';

export function PrivacyInformation() {
  const { t } = useT();
  return <div className="privacy-information">
    <p>{t('privacy.intro')}</p>
    <h3>{t('privacy.todoistTitle')}</h3>
    <p>{t('privacy.todoist')}</p>
    <h3>{t('privacy.measureTitle')}</h3>
    <p>{t('privacy.measure')}</p>
    <p>{t('privacy.contact')} <a href={FEEDBACK_URL} target="_blank" rel="noopener noreferrer">{FEEDBACK_URL.replace(/^https:\/\//, '')}</a></p>
  </div>;
}
