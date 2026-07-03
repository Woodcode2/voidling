// Shared voidling renderer — used by the player AND every rival bot.
// Draws a cute jelly black-hole creature centered at (x,y) with a given skin.
import type { SkinDef } from './config';
import { drawSkinBack, drawSkinFront } from './skins';

export interface VoidlingVisual {
  r: number;
  skin: SkinDef;
  t: number;              // ms clock for accessory animation
  lookX: number;          // pupil aim, ~[-1,1]
  lookY: number;
  open: number;           // mouth open 0..1 (approach)
  chomp: number;          // chomp burst 0..1
  blink: number;          // 0 open .. 1 closed
  wobbleX: number;        // jelly squash multipliers (~1)
  wobbleY: number;
  lean: number;           // slight body tilt (radians)
  glow: number;           // combo glow 0..1
  breathe: number;        // idle breathing scale (~1)
  ghost?: boolean;        // translucent respawn state
}

export function drawVoidling(ctx: CanvasRenderingContext2D, x: number, y: number, v: VoidlingVisual) {
  const { r, skin } = v;
  ctx.save();
  ctx.translate(x, y);
  if (v.ghost) ctx.globalAlpha = 0.4;
  ctx.rotate(v.lean);

  // ── Glow (pulses with combo) ───────────────────────────────────────────────
  const glowR = r * (1.35 + v.glow * 0.7) + Math.sin(v.t / 260) * r * 0.05 * v.glow;
  const g = ctx.createRadialGradient(0, 0, r * 0.4, 0, 0, glowR);
  g.addColorStop(0, hexA(skin.glowColor, 0.55 + v.glow * 0.35));
  g.addColorStop(1, hexA(skin.glowColor, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, glowR, 0, Math.PI * 2);
  ctx.fill();

  // ── Back accessories ────────────────────────────────────────────────────────
  drawSkinBack(ctx, skin, r, v.t);

  // ── Body (jelly squash + breathing) ─────────────────────────────────────────
  ctx.save();
  ctx.scale(v.wobbleX * v.breathe, v.wobbleY * v.breathe);
  // main orb
  ctx.fillStyle = skin.bodyColor;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  // bottom inner shade
  const shade = ctx.createRadialGradient(0, r * 0.35, r * 0.2, 0, r * 0.2, r);
  shade.addColorStop(0, 'rgba(0,0,0,0.28)');
  shade.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = shade;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  // top-left sheen
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.ellipse(-r * 0.34, -r * 0.4, r * 0.34, r * 0.22, -0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();

  // ── Face (crisp, unsquashed) ────────────────────────────────────────────────
  drawFace(ctx, v);

  // ── Front accessories ───────────────────────────────────────────────────────
  drawSkinFront(ctx, skin, r, v.t);

  ctx.restore();
}

function drawFace(ctx: CanvasRenderingContext2D, v: VoidlingVisual) {
  const { r, skin } = v;
  const eyeSep = r * 0.36;
  const eyeY = -r * 0.06;
  const angled = skin.eyeStyle === 'angled';
  const angry = skin.eyeStyle === 'angry';
  const lashes = skin.eyeStyle === 'lashes';
  const eyeRX = r * 0.21;
  const eyeRY = r * 0.21 * (angled ? 0.66 : 1) * (1 - v.blink * 0.92);

  // blush cheeks
  const blushA = (skin.extraBlush ? 0.5 : 0.22) + v.chomp * 0.3;
  ctx.save();
  ctx.globalAlpha = blushA;
  ctx.fillStyle = '#FF7DA8';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(s * r * 0.5, r * 0.2, r * 0.16, r * 0.11, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  for (const s of [-1, 1]) {
    const ex = s * eyeSep;
    ctx.save();
    ctx.translate(ex, eyeY);
    if (angry) ctx.rotate(s * 0.28);
    // sclera
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = Math.max(1, r * 0.03);
    ctx.beginPath();
    ctx.ellipse(0, 0, eyeRX, Math.max(0.5, eyeRY), 0, 0, Math.PI * 2);
    ctx.fill();
    if (v.blink < 0.6) ctx.stroke();
    // pupil (tracks look dir)
    if (v.blink < 0.7) {
      const pr = eyeRX * 0.56;
      const px = v.lookX * eyeRX * 0.42;
      const py = v.lookY * eyeRY * 0.42;
      ctx.fillStyle = '#1A0B33';
      ctx.beginPath();
      ctx.ellipse(px, py, pr, pr * (eyeRY / eyeRX), 0, 0, Math.PI * 2);
      ctx.fill();
      // shine
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(px - pr * 0.3, py - pr * 0.35, pr * 0.34, 0, Math.PI * 2);
      ctx.fill();
    }
    // eyelid line when nearly closed
    if (v.blink >= 0.6) {
      ctx.strokeStyle = '#1A0B33';
      ctx.lineWidth = Math.max(1.4, r * 0.045);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-eyeRX, 0);
      ctx.quadraticCurveTo(0, r * 0.04, eyeRX, 0);
      ctx.stroke();
    }
    // lashes
    if (lashes && v.blink < 0.6) {
      ctx.strokeStyle = '#3A1030';
      ctx.lineWidth = Math.max(1.2, r * 0.035);
      ctx.lineCap = 'round';
      for (let i = -1; i <= 1; i++) {
        const a = -0.5 + i * 0.5;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * eyeRX * 0.9 * s + (s < 0 ? 0 : 0), -eyeRY * 0.8);
        ctx.lineTo(Math.cos(a) * eyeRX * 1.4 * s, -eyeRY * 1.5);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // Mouth
  const open = Math.min(1, v.open + v.chomp);
  const my = r * 0.4;
  if (open < 0.14) {
    // gentle smile
    ctx.strokeStyle = '#1A0B33';
    ctx.lineWidth = Math.max(1.6, r * 0.05);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, my - r * 0.1, r * 0.24, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.stroke();
  } else {
    // open / chomp
    const mw = r * 0.26;
    const mh = r * (0.12 + open * 0.34);
    ctx.fillStyle = '#2A0E2E';
    ctx.beginPath();
    ctx.ellipse(0, my, mw, mh, 0, 0, Math.PI * 2);
    ctx.fill();
    // tongue
    ctx.fillStyle = '#FF6F91';
    ctx.beginPath();
    ctx.ellipse(0, my + mh * 0.45, mw * 0.7, mh * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function hexA(hex: string, a: number) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return `rgba(${r},${g},${b},${a})`;
}
