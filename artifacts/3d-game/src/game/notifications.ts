// Daily Bite reminder (Machine round) — local notification at ~18:30 the next
// day, rescheduled after every play session. iOS only (Capacitor); no-op on web.
// Permission is requested AFTER the first finished match (never at boot — the
// player should love the game before we ask for anything).
import { track } from './services';

const REMINDER_ID = 1001;
const LINES = [
  ['Your DAILY BITE is ready 🍩', 'The city rebuilt itself overnight. Rude. Go eat it again.'],
  ['The void is hungry 😋', 'Daily Bite bonus coins are waiting. The mayor is nervous.'],
  ['Snack o’clock 🌆', 'One quick round? Your family already started without you.'],
  ['Streak check ⭐', 'Keep your Daily Bite streak alive — bonus coins today.'],
];

const isNative = (): boolean =>
  !!(window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.();

async function plugin() {
  const { LocalNotifications } = await import('@capacitor/local-notifications');
  return LocalNotifications;
}

/** Ask for permission once, after the first finished match. */
export async function requestNotifPermissionOnce(): Promise<void> {
  if (!isNative()) return;
  try {
    if (localStorage.getItem('vd_notif_asked')) return;
    localStorage.setItem('vd_notif_asked', '1');
  } catch { return; }
  try {
    const ln = await plugin();
    const res = await ln.requestPermissions();
    track('notif_permission', { granted: res.display === 'granted' });
  } catch { /* plugin unavailable */ }
}

/** (Re)schedule tomorrow's 18:30 Daily Bite reminder. Call after each session. */
export async function scheduleDailyReminder(): Promise<void> {
  if (!isNative()) return;
  try {
    const ln = await plugin();
    const perm = await ln.checkPermissions();
    if (perm.display !== 'granted') return;
    await ln.cancel({ notifications: [{ id: REMINDER_ID }] });
    const at = new Date();
    at.setDate(at.getDate() + 1);
    at.setHours(18, 30, 0, 0);
    const line = LINES[Math.floor(Math.random() * LINES.length)];
    await ln.schedule({
      notifications: [{
        id: REMINDER_ID,
        title: line[0],
        body: line[1],
        schedule: { at },
      }],
    });
  } catch { /* plugin unavailable */ }
}
