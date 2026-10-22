import { translate } from '@/i18n';
import { useStore } from '@/store/store';
import { startsBetween } from './domain/guidance';

/** How often planned starts are looked for; alerts can be up to this late. */
const CHECK_MS = 30_000;

/** Whether this browser can show notifications at all. */
export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Scheduled start alerts (SPEC §5.2 #8): a browser notification when a task's
 * planned time arrives. They come only while a tab of the app is open; the
 * phone gets Todoist's own reminders for the same due time.
 */
function checkStarts(from: Date, to: Date): void {
  const app = useStore.getState();
  if (!app.ready || !app.connected || !app.prefs.focus.guidance.startAlerts) return;
  if (!notificationsSupported() || Notification.permission !== 'granted') return;
  const open = Object.values(app.snapshot.items).filter((item) => !item.checked && !item.is_deleted);
  for (const item of startsBetween(open, from, to)) {
    try {
      const notification = new Notification(translate(app.prefs.locale, 'focus.alertTitle'), { body: item.content, tag: `focus-start-${item.id}` });
      notification.onclick = () => { window.focus(); location.hash = '#/focus'; notification.close(); };
    } catch {
      // Some browsers only notify from a service worker; the in-app planning list still shows it.
    }
  }
}

if (typeof window !== 'undefined') {
  let last = new Date();
  window.setInterval(() => {
    const now = new Date();
    checkStarts(last, now);
    last = now;
  }, CHECK_MS);
}
