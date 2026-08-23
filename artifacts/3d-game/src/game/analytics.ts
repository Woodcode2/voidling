// VOIDLING analytics — real funnel data (Machine round).
// Batched client → Supabase edge function (ingest-events) → vd_events table.
// Design: never block gameplay, never throw, drop silently when offline.
//   • events queue in memory, flush every 12s / 20 events / on tab-hide (beacon)
//   • NO user id at all — a per-boot session id that is never persisted
//     (this header used to say "anonymous stable user id", which the code
//     below stopped being true about when vd_uid was removed; a stale comment
//     on the one file a privacy reviewer reads is worse than no comment)
//   • off by default — logEvent() returns early unless a grown-up switched it on
//   • first_open fired exactly once per install (localStorage marker)

const INGEST_URL = 'https://uzkzuxwykajzoicuxhic.supabase.co/functions/v1/ingest-events';
// Supabase anon key — public by design (the edge function validates + writes
// with its own service role; the events table itself has no anon access).
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6a3p1eHd5a2Fqem9pY3V4aGljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3NDE1MTksImV4cCI6MjA4NjMxNzUxOX0.8RmY1xXqd4bOlhKNAPF5N4GVchbkZ0O8hwtJbJ7LhKs';

// Which build is talking. The 2D game and the 3D game share this pipeline and
// the same vd_events table, so without a tag every funnel query mixes two
// different products. Set by bootAnalytics(); lands in the app_version column.
let APP_VERSION = 'v32';
const FLUSH_MS = 12000;
const FLUSH_N = 20;

function lsGet(k: string): string | null { try { return localStorage.getItem(k); } catch { return null; } }
function lsSet(k: string, v: string): void { try { localStorage.setItem(k, v); } catch { /* session-only */ } }

// ── NO PERSISTENT IDENTIFIER. EVER. ────────────────────────────────────────
// This used to mint a `vd_uid` into localStorage and send it with every batch,
// which is a persistent per-install identifier — and under COPPA a persistent
// identifier IS personal information when it is collected from a child. Apple's
// Kids rule is blunter still: an app in that category "may not send personally
// identifiable information OR DEVICE INFORMATION to third parties", and
// Supabase is a third party.
//
// There is now no user id at all. Analytics is per-boot and anonymous: a random
// session id that is never written to storage and cannot be joined across
// launches. Retention has to be measured some other way, or not at all. That is
// the correct trade for a game aimed at six-year-olds.
//
// The old key is actively deleted on load, so an install that already has one
// stops sending it and does not keep it lying around.
try { localStorage.removeItem('vd_uid'); } catch { /* ignore */ }
const sessionId = 's_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const platform = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } })
  .Capacitor?.isNativePlatform?.() ? 'ios' : 'web';

let queue: Array<{ event: string; ts: number; props: Record<string, unknown> }> = [];
let flushTimer: number | null = null;

function payload(events: typeof queue): string {
  // user_id is deliberately absent — see the note above.
  return JSON.stringify({ session_id: sessionId, app_version: APP_VERSION, platform, events });
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

// ── OFF UNTIL A GROWN-UP SAYS OTHERWISE ────────────────────────────────────
// Analytics used to start transmitting as an import side effect: first_open,
// day_open, app_open and a device fingerprint all left the device BEFORE THE
// FIRST FRAME RENDERED, before a child or a parent had seen anything. It is now
// opt-in, default OFF, behind a settings row that lives behind a parental gate.
const OPT_KEY = 'vd_analytics_on';
let enabled = lsGet(OPT_KEY) === '1';
/** Is anonymous analytics switched on? Default false. */
export function analyticsEnabled(): boolean { return enabled; }
/** Settings toggle. Turning it off also drops anything already queued. */
export function setAnalyticsEnabled(on: boolean): void {
  enabled = on;
  lsSet(OPT_KEY, on ? '1' : '0');
  if (!on) queue = [];
}

/** Queue an analytics event. Safe to call from anywhere, never throws. */
export function logEvent(event: string, props: Record<string, unknown> = {}): void {
  if (!enabled) return;
  queue.push({ event, ts: Date.now(), props });
  if (queue.length >= FLUSH_N) flush();
  else scheduleFlush();
}

// lifecycle events
document.addEventListener('visibilitychange', () => { if (document.hidden) flush(true); });
window.addEventListener('pagehide', () => flush(true));

let booted = false;
/**
 * Fire the install/return/open trio, tagged with which build is running.
 * Idempotent — safe to call from every entry point. This used to run as a bare
 * import side effect, which meant the tag could never be set before the first
 * three events had already gone out untagged.
 */
export function bootAnalytics(version: string): void {
  if (booted) return;
  booted = true;
  APP_VERSION = version;
  // first_open and the install date are GONE. `installed_at` existed to compute
  // D1/D7 cohorts, which is longitudinal tracking of a child by definition.
  // day_open stays because it carries nothing but the fact that a session began
  // today, and it only sends at all once analytics has been switched on.
  try { localStorage.removeItem('vd_first_open'); } catch { /* ignore */ }
  const today = new Date().toDateString();
  if (lsGet('vd_last_open_day') !== today) {
    lsSet('vd_last_open_day', today);
    logEvent('day_open', {});
  }
  logEvent('app_open', {});
}
