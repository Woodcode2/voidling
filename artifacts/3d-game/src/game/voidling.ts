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
  form?: number;          // v6 §3: evolution form index (0..4) → stacked visual layers
  cheekPuff?: number;     // v6 §9: 0..1, puffed cheeks after eating T3+
  dizzy?: number;         // v6 §9: 0..1, swirl eyes after being chomped
  lick?: number;          // v6 §9: 0..1, tongue-lick grin after a TRIPLE
}

export function drawVoidling(ctx: CanvasRenderingContext2D, x: number, y: number, v: VoidlingVisual) {
  const { r, skin } = v;
  ctx.save();
  ctx.translate(x, y);
  if (v.ghost) ctx.globalAlpha = 0.4;
  ctx.rotate(v.lean);

  // ── Glow: crisp concentric rings (v5 §6 — no radial halo / shadowBlur) ──────
  const ringCount = 3;
  const baseA = 0.2 + v.glow * 0.45;
  ctx.lineWidth = Math.max(1.5, r * 0.06);
  for (let i = 1; i <= ringCount; i++) {
    const wobble = Math.sin(v.t / 260 + i) * r * 0.02 * v.glow;
    ctx.strokeStyle = hexA(skin.glowColor, baseA * (1 - (i - 1) / ringCount));
    ctx.beginPath();
    ctx.arc(0, 0, r + i * (r * 0.12) + wobble, 0, Math.PI * 2);
    ctx.stroke();
  }

  // ── v6 §3: evolution form layers (behind body) ──────────────────────────────
  drawFormLayers(ctx, v);

  // ── Back accessories ────────────────────────────────────────────────────────
  drawSkinBack(ctx, skin, r, v.t);

  // ── Body (jelly squash + breathing) ─────────────────────────────────────────
  ctx.save();
  ctx.scale(v.wobbleX * v.breathe, v.wobbleY * v.breathe);
  // v6 §9: body drawn from a 3× supersampled, cached sprite (flat, no gradient/blur)
  const sprite = getBodySprite(skin.bodyColor);
  ctx.drawImage(sprite, -r, -r, r * 2, r * 2);
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

  // blush cheeks (v6 §9: swell with cheek puff)
  const puff = v.cheekPuff || 0;
  const blushA = (skin.extraBlush ? 0.5 : 0.22) + v.chomp * 0.3 + puff * 0.4;
  ctx.save();
  ctx.globalAlpha = Math.min(1, blushA);
  ctx.fillStyle = '#FF7DA8';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(s * r * (0.5 + puff * 0.04), r * 0.2, r * (0.16 + puff * 0.07), r * (0.11 + puff * 0.06), 0, 0, Math.PI * 2);
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
    // pupil (tracks look dir) — or a dizzy swirl after being chomped (v6 §9)
    if (v.blink < 0.7 && (v.dizzy || 0) > 0.01) {
      ctx.strokeStyle = '#1A0B33';
      ctx.lineWidth = Math.max(1.2, eyeRX * 0.2);
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let k = 0; k <= 26; k++) {
        const tt = k / 26;
        const ang = tt * Math.PI * 2 * 2.2 - v.t / 110 * s;
        const rad = tt * eyeRX * 0.82;
        const sx = Math.cos(ang) * rad, sy = Math.sin(ang) * rad;
        if (k === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
      }
      ctx.stroke();
    } else if (v.blink < 0.7) {
      const pr = eyeRX * 0.56;
      const px = v.lookX * eyeRX * 0.42;
      const py = v.lookY * eyeRY * 0.42;
      ctx.fillStyle = '#1A0B33';
      ctx.beginPath();
      ctx.ellipse(px, py, pr, pr * (eyeRY / eyeRX), 0, 0, Math.PI * 2);
      ctx.fill();
      // moving eye sparkle
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
  const lick = v.lick || 0;
  if (open < 0.14) {
    // gentle smile
    ctx.strokeStyle = '#1A0B33';
    ctx.lineWidth = Math.max(1.6, r * 0.05);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, my - r * 0.1, r * 0.24, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.stroke();
    // v6 §9: tongue-lick grin after a TRIPLE
    if (lick > 0.01) {
      ctx.fillStyle = '#FF6F91';
      ctx.beginPath();
      ctx.ellipse(r * 0.14, my - r * 0.02, r * 0.12, r * 0.09 * lick, 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
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

// v6 §3: each evolution form adds a permanent visual layer, drawn behind the body.
function drawFormLayers(ctx: CanvasRenderingContext2D, v: VoidlingVisual) {
  const { r, t } = v;
  const form = v.form || 0;
  if (form <= 0) return;

  // MUNCHER (1+): thin rotating dashed energy ring
  ctx.save();
  ctx.rotate((t / 1400) % (Math.PI * 2));
  ctx.strokeStyle = hexA(v.skin.glowColor, 0.6);
  ctx.lineWidth = Math.max(1.4, r * 0.05);
  ctx.setLineDash([r * 0.5, r * 0.4]);
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.18, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // GOBBLER (2+): three chunky debris shards orbiting outside
  if (form >= 2) {
    const spin = t / 900;
    for (let i = 0; i < 3; i++) {
      const a = spin + (i / 3) * Math.PI * 2;
      ctx.save();
      ctx.translate(Math.cos(a) * r * 1.42, Math.sin(a) * r * 1.42);
      ctx.rotate(a * 2);
      ctx.fillStyle = '#2A1747';
      ctx.strokeStyle = '#0E0620';
      ctx.lineWidth = 2;
      const s = r * 0.14;
      ctx.beginPath();
      ctx.moveTo(-s, -s * 0.6); ctx.lineTo(s * 0.8, -s);
      ctx.lineTo(s, s * 0.7); ctx.lineTo(-s * 0.6, s); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.restore();
    }
  }

  // DEVOURER (3+): crown of purple flame licks around the top
  if (form >= 3) {
    const licks = 7;
    for (let i = 0; i < licks; i++) {
      const a = -Math.PI / 2 + (i - (licks - 1) / 2) * 0.34;
      const flick = Math.sin(t / 160 + i) * 0.12;
      const len = r * (0.36 + Math.abs(Math.sin(t / 200 + i * 1.3)) * 0.26);
      const nx = -Math.sin(a), ny = Math.cos(a);
      const bx = Math.cos(a) * r, by = Math.sin(a) * r;
      const tx = Math.cos(a + flick) * (r + len), ty = Math.sin(a + flick) * (r + len);
      ctx.fillStyle = i % 2 ? '#B466FF' : '#7A2BE0';
      // v7 §6: teardrop flame lick — bulged base curving to a fine tip
      ctx.beginPath();
      ctx.moveTo(bx + nx * r * 0.13, by + ny * r * 0.13);
      ctx.quadraticCurveTo(tx + nx * r * 0.16, ty + ny * r * 0.16, tx, ty);
      ctx.quadraticCurveTo(tx - nx * r * 0.16, ty - ny * r * 0.16, bx - nx * r * 0.13, by - ny * r * 0.13);
      ctx.closePath();
      ctx.fill();
    }
  }

  // WORLD EATER (4): warp is rendered at the SCREEN EDGES in engine drawPostFX,
  // never as a character-attached ring (v7 §6). Nothing to draw on the body here.
}

// v6 §2: faint blue underdog trail streaming behind a moving void.
export function drawUnderdogTrail(ctx: CanvasRenderingContext2D, x: number, y: number, vx: number, vy: number, r: number) {
  const sp = Math.hypot(vx, vy);
  if (sp < 20) return;
  const ux = vx / sp, uy = vy / sp;
  ctx.save();
  for (let i = 1; i <= 3; i++) {
    ctx.globalAlpha = 0.16 * (1 - i / 4);
    ctx.fillStyle = '#5AC8FF';
    ctx.beginPath();
    ctx.arc(x - ux * r * 0.5 * i, y - uy * r * 0.5 * i, r * (1 - i * 0.12), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// v6 §9: cache the flat body (orb + crescent + highlight) as a supersampled
// sprite per body colour, so the hot per-frame path is one drawImage per void.
const SPRITE_R0 = 90;   // logical body radius the sprite is authored at
const SPRITE_SS = 3;    // 3× supersample for crisp scaling
const bodyCache = new Map<string, HTMLCanvasElement>();

function getBodySprite(color: string): HTMLCanvasElement {
  const cached = bodyCache.get(color);
  if (cached) return cached;
  const R = SPRITE_R0 * SPRITE_SS;
  const size = Math.ceil(R * 2 + 4);
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const g = c.getContext('2d')!;
  g.translate(size / 2, size / 2);
  // main orb
  g.fillStyle = color;
  g.beginPath(); g.arc(0, 0, R, 0, Math.PI * 2); g.fill();
  // bottom darker crescent, clipped to the body
  g.save();
  g.beginPath(); g.arc(0, 0, R, 0, Math.PI * 2); g.clip();
  g.globalAlpha = 0.22; g.fillStyle = '#000000';
  g.beginPath(); g.ellipse(0, R * 0.55, R * 1.05, R * 0.85, 0, 0, Math.PI * 2); g.fill();
  g.restore();
  // top-left highlight
  g.globalAlpha = 0.26; g.fillStyle = '#FFFFFF';
  g.beginPath(); g.ellipse(-R * 0.34, -R * 0.4, R * 0.32, R * 0.2, -0.6, 0, Math.PI * 2); g.fill();
  g.globalAlpha = 1;
  bodyCache.set(color, c);
  return c;
}

function hexA(hex: string, a: number) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return `rgba(${r},${g},${b},${a})`;
}
