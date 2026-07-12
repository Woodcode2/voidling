// arrival.ts — the sky-fall spawn cinematic (Blueprint Act 1).
//
// Story beat: the void FALLS to New Earth. A shadow grows on the street, the
// tiny body drops in, lands with a squash-bounce, dust puffs, pebbles skitter.
// Answers "how did it get here?" and ties the match open to the splash art.
//
// Design constraints (deliberate):
//   • Purely visual. Physics, eating, input are untouched.
//   • Timestamp-driven (performance.now) — needs NO engine update hook.
//   • Hooks into player.ts in exactly three tiny places (see INSTALL notes).
//   • Replays on any reset() — a fresh match falls in during the countdown,
//     and an edge-fall respawn gets a quick charming re-entry.

export const ARRIVAL_FALL_MS = 1050;   // time from sky to touchdown
export const ARRIVAL_BOUNCE_MS = 220;  // squash-and-settle after touchdown
export const ARRIVAL_FX_MS = 650;      // dust ring + pebbles linger after landing
export const ARRIVAL_TOTAL_MS = ARRIVAL_FALL_MS + ARRIVAL_BOUNCE_MS + ARRIVAL_FX_MS;

const FALL_MS = ARRIVAL_FALL_MS;
const BOUNCE_MS = ARRIVAL_BOUNCE_MS;
const FX_MS = ARRIVAL_FX_MS;

let t0 = -1e9;          // start timestamp; far past = inactive by default

function now() {
  return (typeof performance !== 'undefined' ? performance.now() : Date.now());
}

// ── Stateless, elapsed-driven variants ────────────────────────────────────────
// `e` is ms since this body's fall began. These let ANY void (each rival keeps
// its own t0) run an independent sky-fall — not just the singleton player one.

/** Vertical draw offset in px. Positive = drawn ABOVE its true spot (falling). */
export function arrivalOffsetY(e: number, r: number): number {
  if (e < 0) return 0;
  if (e < FALL_MS) {
    const p = e / FALL_MS;
    const maxH = r * 7 + 240;      // start well off the top of the screen
    return maxH * (1 - p * p);     // ease-in: slow release, accelerating fall
  }
  if (e < FALL_MS + BOUNCE_MS) {
    const q = (e - FALL_MS) / BOUNCE_MS;
    return -r * 0.10 * Math.sin(Math.PI * q); // tiny squash dip, then settle
  }
  return 0;
}

/** Landing-spot shadow: small/faint high up, wide/dark at impact. */
export function arrivalDrawShadow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, e: number) {
  if (e < 0 || e >= FALL_MS) return;
  const p = e / FALL_MS;
  const grow = 0.25 + 0.75 * p * p;
  ctx.save();
  ctx.globalAlpha = 0.12 + 0.28 * p * p;
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.35, r * 0.95 * grow, r * 0.34 * grow, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Post-landing dust ring + six skittering pebbles. No-op outside its window. */
export function arrivalDrawFX(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, eLand: number) {
  const e = eLand - FALL_MS;
  if (e < 0 || e > FX_MS) return;
  const q = e / FX_MS;               // 0..1 across the effect
  const gy = y + r * 0.35;           // ground line under the body

  // Expanding dust ring
  ctx.save();
  ctx.globalAlpha = 0.5 * (1 - q);
  ctx.strokeStyle = '#D8C9B4';
  ctx.lineWidth = Math.max(2, r * 0.12 * (1 - q * 0.6));
  ctx.beginPath();
  ctx.ellipse(x, gy, r * (0.6 + q * 1.7), r * (0.22 + q * 0.6), 0, 0, Math.PI * 2);
  ctx.stroke();
  // A second, softer inner puff
  ctx.globalAlpha = 0.3 * (1 - q);
  ctx.fillStyle = '#E8DCC8';
  ctx.beginPath();
  ctx.ellipse(x, gy, r * (0.4 + q * 0.9), r * (0.15 + q * 0.35), 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Six pebbles arcing outward (deterministic — no allocations, no RNG)
  ctx.save();
  ctx.fillStyle = '#B9A98E';
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.35;
    const reach = r * (0.5 + q * 1.5) * (0.8 + (i % 3) * 0.15);
    const hop = Math.sin(Math.PI * Math.min(1, q * 1.25)) * r * (0.35 + (i % 2) * 0.2);
    const px = x + Math.cos(a) * reach;
    const py = gy + Math.sin(a) * reach * 0.35 - hop;
    ctx.globalAlpha = 0.7 * (1 - q);
    ctx.beginPath();
    ctx.arc(px, py, Math.max(1, r * 0.05), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export const arrival = {
  /** Call when the player (re)spawns. Restarts the fall. */
  begin() {
    t0 = now();
  },

  /** True while the body is still airborne or settling. */
  active(): boolean {
    return now() - t0 < FALL_MS + BOUNCE_MS;
  },

  offsetY(r: number): number { return arrivalOffsetY(now() - t0, r); },
  drawShadow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) { arrivalDrawShadow(ctx, x, y, r, now() - t0); },
  drawFX(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) { arrivalDrawFX(ctx, x, y, r, now() - t0); },
};
