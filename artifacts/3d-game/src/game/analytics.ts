// VOIDLING analytics — real funnel data (Machine round).
// Batched client → Supabase edge function (ingest-events) → vd_events table.
// Design: never block gameplay, never throw, drop silently when offline.
//   • events queue in memory, flush every 12s / 20 events / on tab-hide (beacon)
//   • anonymous stable user id + per-boot session id
//   • first_open fired exactly once per install (localStorage marker)

const INGEST_URL = 'https://uzkzuxwykajzoicuxhic.supabase.co/functions/v1/ingest-events';
// Supabase anon key — public by design (the edge function validates + writes
// with its own service role; the events table itself has no anon access).
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6a3p1eHd5a2Fqem9pY3V4aGljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3NDE1MTksImV4cCI6MjA4NjMxNzUxOX0.8RmY1xXqd4bOlhKNAPF5N4GVchbkZ0O8hwtJbJ7LhKs';

const APP_VERSION = 'v32';
const FLUSH_MS = 12000;
const FLUSH_N = 20;

function lsGet(k: string): string | null { try { return localStorage.getItem(k); } catch { return null; } }
function lsSet(k: string, v: string): void { try { localStorage.setItem(k, v); } catch { /* session-only */ } }

function stableId(): string {
  let id = lsGet('vd_uid');
  if (!id) {
    id = 'u_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    lsSet('vd_uid', id);
  }
  return id;
}

const userId = stableId();
const sessionId = 's_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const platform = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } })
  .Capacitor?.isNativePlatform?.() ? 'ios' : 'web';

let queue: Array<{ event: string; ts: number; props: Record<string, unknown> }> = [];
let flushTimer: number | null = null;

function payload(events: typeof queue): string {
  return JSON.stringify({ user_id: userId, session_id: sessionId, app_version: APP_VERSION, platform, events });
}

function flush(useBeacon = false): void {
  if (!queue.length) return;
  const batch = queue.splice(0, FLUSH_N);
  const body = payload(batch);
  try {
    // keepalive lets the final batch survive tab close (sendBeacon can't carry
    // the Authorization header the edge function requires)
    void fetch(INGEST_URL, {
      method: 'POST', keepalive: useBeacon,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ANON_KEY}`, apikey: ANON_KEY },
      body,
    }).catch(() => {});
  } catch { /* offline — drop */ }
  if (queue.length) flush(useBeacon); // drain remaining in FLUSH_N chunks
}

function scheduleFlush(): void {
  if (flushTimer !== null) return;
  flushTimer = window.setTimeout(() => { flushTimer = null; flush(); }, FLUSH_MS);
}

/** Queue an analytics event. Safe to call from anywhere, never throws. */
export function logEvent(event: string, props: Record<string, unknown> = {}): void {
  queue.push({ event, ts: Date.now(), props });
  if (queue.length >= FLUSH_N) flush();
  else scheduleFlush();
}

// lifecycle events
document.addEventListener('visibilitychange', () => { if (document.hidden) flush(true); });
window.addEventListener('pagehide', () => flush(true));

if (!lsGet('vd_first_open')) {
  lsSet('vd_first_open', String(Date.now()));
  logEvent('first_open', {});
}
// daily-return marker (D1/D7 computed server-side from these)
{
  const today = new Date().toDateString();
  if (lsGet('vd_last_open_day') !== today) {
    lsSet('vd_last_open_day', today);
    logEvent('day_open', { installed_at: Number(lsGet('vd_first_open')) || 0 });
  }
}
logEvent('app_open', {});
