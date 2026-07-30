// VOIDLING 3D — telemetry.
//
// The analytics pipeline (client → Supabase edge fn → vd_events) already
// existed and worked; it was wired into the 2D build only. When the 3D game
// became the root URL the table stopped receiving anything, so nobody could
// answer the questions that actually decide whether this ships: how long is a
// session, where do children quit, does anyone reach the shop, and does anyone
// want the $4.99 skins.
//
// Design rules, unchanged from the original layer:
//   • never block the frame, never throw, drop silently when offline
//   • no personal data — an anonymous per-install id and a per-boot session id
//   • one call site per meaningful moment, not a firehose
//
// Everything here is queued and batched by analytics.ts. A whole match costs
// about a dozen events.
import { bootAnalytics, logEvent, analyticsEnabled, setAnalyticsEnabled } from '../game/analytics';

export { analyticsEnabled, setAnalyticsEnabled };

// The 3D build's own version tag, so a funnel query can separate the two
// products that share this table. Bump when the shape of the funnel changes.
const VERSION = '3d-v1';

bootAnalytics(VERSION);

/** Ambient dimensions stamped onto every event, so queries don't need joins. */
const ctx: Record<string, unknown> = {};

/** Set a dimension carried by all later events (world, skin, level…). */
export function setCtx(k: string, v: unknown): void { ctx[k] = v; }

/** Record a moment. Safe from anywhere; failures are swallowed upstream. */
export function track(event: string, props: Record<string, unknown> = {}): void {
  try { logEvent(event, { ...ctx, ...props }); } catch { /* telemetry never breaks a game */ }
}

// ── session shape ───────────────────────────────────────────────────────────
// Session length is the single most-quoted retention number and it cannot be
// derived from event timestamps alone: a child who opens the app and puts the
// phone down leaves one app_open and nothing else, which is indistinguishable
// from a crash. Close the session explicitly.
const bootAt = Date.now();
let sessionClosed = false;
let matches = 0;

/** Count a completed or abandoned match toward the session summary. */
export function countMatch(): void { matches++; }

function closeSession(reason: string): void {
  if (sessionClosed) return;
  sessionClosed = true;
  track('session_end', { sec: Math.round((Date.now() - bootAt) / 1000), matches, reason });
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) closeSession('hidden');
  else sessionClosed = false;   // came back — the session continues
});
window.addEventListener('pagehide', () => closeSession('pagehide'));

// ── frame health ────────────────────────────────────────────────────────────
// A 3D game on a five-year-old iPad is a different game. Sample the frame rate
// continuously and report a summary with each match, so a quit spike can be
// checked against the device that produced it rather than guessed at.
let frames = 0;
let fpsAccStart = performance.now();
let worstSecond = 999;
let secFrames = 0;
let secStart = performance.now();

/** Call once per rendered frame. Costs two increments and a compare. */
export function tickFrame(): void {
  frames++; secFrames++;
  const now = performance.now();
  if (now - secStart >= 1000) {
    const fps = (secFrames * 1000) / (now - secStart);
    if (fps < worstSecond) worstSecond = fps;
    secFrames = 0; secStart = now;
  }
}

/** Average + worst-second frame rate since the last reset. */
export function fpsSummary(): { fps: number; low: number } {
  const el = Math.max(0.001, (performance.now() - fpsAccStart) / 1000);
  return {
    fps: Math.round(frames / el),
    low: worstSecond > 900 ? 0 : Math.round(worstSecond),
  };
}

export function resetFps(): void {
  frames = 0; fpsAccStart = performance.now();
  worstSecond = 999; secFrames = 0; secStart = performance.now();
}

// ── device shape ────────────────────────────────────────────────────────────
// This used to report devicePixelRatio, the exact viewport, CPU core count,
// device memory and touch capability. Together those are a DEVICE FINGERPRINT,
// and Apple's Kids rule forbids sending device information to a third party
// full stop — Supabase is a third party.
//
// The question it existed to answer was "was this child's device fast enough?",
// and one coarse bucket answers that without identifying anything. A hardware
// tier has a few thousand members; a fingerprint has one.
{
  const nav = navigator as Navigator & { deviceMemory?: number };
  const cores = nav.hardwareConcurrency ?? 0;
  const mem = nav.deviceMemory ?? 0;
  const tier = cores >= 8 && mem >= 6 ? 'high' : cores >= 4 && mem >= 3 ? 'mid' : 'low';
  track('device', { tier });
}
