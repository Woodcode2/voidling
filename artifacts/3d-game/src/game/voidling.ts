// Shared voidling renderer — used by the player AND every rival bot.
// Draws a cute jelly black-hole creature centered at (x,y) with a given skin.
//
// BATCH 1 (Blueprint Act 3): the five-stage identity system.
// Each evolution keeps everything from the stage before and ADDS:
//   0 VOIDLING    — clean cute orb, soft rim, one shy wandering sparkle
//   1 MUNCHER     — three tiny stars begin orbiting; body deepens (palette)
//   2 GOBBLER     — a visible star-ring + rising ember wisps + inner nebula
//   3 DEVOURER    — two COUNTER-ROTATING rings + a space-bending dark halo
//                   (replaces the old glowing cracks)
//   4 WORLD ENDER — a bright tilted ACCRETION RING, an ember corona around
//                   the rim (replaces the flame crown), the ground visibly
//                   dims beneath it, and a full galaxy churns inside.
// The newest stage's additions fade in over v.morph so every stage-up pops.
// Everything is procedural — zero sprite dependencies.
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
  nearFood?: boolean;     // Phase 7a: food inside vacuum radius → pupils dilate 15%
  form?: number;          // evolution form index (0..4) → stacked visual layers
  morph?: number;         // 0..1 crossfade of the newest form's additions
  cheekPuff?: number;     // 0..1, puffed cheeks after eating T3+
  dizzy?: number;         // 0..1, swirl eyes after being chomped
  lick?: number;          // 0..1, tongue-lick grin after a TRIPLE
}

export function drawVoidling(ctx: CanvasRenderingContext2D, x: number, y: number, v: VoidlingVisual) {
  const { r, skin } = v;
  ctx.save();
  ctx.translate(x, y);
  if (v.ghost) ctx.globalAlpha = 0.4;
  if (skin.id === 'ghost') ctx.globalAlpha *= 0.6; // translucent floaty ghost

  // ── WORLD ENDER: the ground itself dims beneath the void ──────────────────
  // Drawn before lean-rotation so the pool hugs the ground, not the body tilt.
  if ((v.form || 0) >= 4) {
    const a = (v.morph ?? 1) * 0.34;
    const g = ctx.createRadialGradient(0, r * 0.25, r * 0.4, 0, r * 0.25, r * 2.5);
    g.addColorStop(0, `rgba(6,2,16,${a})`);
    g.addColorStop(0.7, `rgba(6,2,16,${a * 0.5})`);
    g.addColorStop(1, 'rgba(6,2,16,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, r * 0.25, r * 2.5, r * 1.6, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.rotate(v.lean);

  // ── Glow: crisp concentric rings (combo heat) ──────────────────────────────
  const ringCount = 2;
  const baseA = 0.14 + v.glow * 0.32;
  ctx.lineWidth = Math.max(1, r * 0.04);
  for (let i = 1; i <= ringCount; i++) {
    const wobble = Math.sin(v.t / 260 + i) * r * 0.01 * v.glow;
    ctx.strokeStyle = hexA(skin.glowColor, baseA * (1 - (i - 1) / ringCount));
    ctx.beginPath();
    ctx.arc(0, 0, r + i * (r * 0.05) + wobble, 0, Math.PI * 2);
    ctx.stroke();
  }

  // ── Stage aura: orbit stars / rings / halo / accretion / corona (behind body)
  drawStageAura(ctx, v);

  // ── Back accessories (cosmetic skins) ──────────────────────────────────────
  drawSkinBack(ctx, skin, r, v.t);

  // ── Procedural body — crisp gradient orb, per-stage palette ────────────────
  ctx.save();
  ctx.scale(v.wobbleX * v.breathe, v.wobbleY * v.breathe);
  drawProceduralBody(ctx, v);
  ctx.restore();

  // ── Stage interior: core glow, nebula, galaxy (inside the orb) ─────────────
  drawStageInterior(ctx, v);

  // ── Face (crisp, unsquashed) ────────────────────────────────────────────────
  drawFace(ctx, v);

  // ── Front accessories (cosmetic skins) ─────────────────────────────────────
  drawSkinFront(ctx, skin, r, v.t, v.lick || 0);

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

  // blush cheeks (swell with cheek puff)
  const puff = v.cheekPuff || 0;
  // Personality — DEVOURER+ is cold (no blush), GOBBLER is too tough (half blush)
  const _formForBlush = v.form || 0;
  const _blushMult = _formForBlush >= 3 ? 0 : _formForBlush >= 2 ? 0.45 : 1;
  const blushA = ((skin.extraBlush ? 0.5 : 0.22) + v.chomp * 0.3 + puff * 0.4) * _blushMult;
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
    // pupil (tracks look dir) — or a dizzy swirl after being chomped
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
      const form = v.form || 0;
      const grow = form >= 1 ? 1.15 : 1;      // MUNCHER+ pupils grow 15%
      const pr = eyeRX * 0.56 * grow * (v.nearFood ? 1.15 : 1); // dilate 15% when food in vacuum
      const px = v.lookX * eyeRX * 0.42;
      const py = v.lookY * eyeRY * 0.42;
      const ender = form >= 4, devour = form >= 3;
      // premium skins with glowing eyes (lava, dragon) cast a warm halo
      if (v.skin.eyeGlow && !devour) {
        const pulse = 0.4 + Math.sin(v.t / 300) * 0.25;
        ctx.fillStyle = hexA(v.skin.eyeGlow, pulse);
        ctx.beginPath();
        ctx.ellipse(px, py, pr * 1.9, pr * 1.9 * (eyeRY / eyeRX), 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // DEVOURER eyes glow violet-white; WORLD ENDER eyes blaze white
      if (devour) {
        ctx.fillStyle = hexA(ender ? '#FFFFFF' : '#B466FF', 0.5);
        ctx.beginPath();
        ctx.ellipse(px, py, pr * 1.7, pr * 1.7 * (eyeRY / eyeRX), 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = ender ? '#FFFFFF' : devour ? '#E6D2FF' : '#1A0B33';
      ctx.beginPath();
      ctx.ellipse(px, py, pr, pr * (eyeRY / eyeRX), 0, 0, Math.PI * 2);
      ctx.fill();
      if (ender) {
        // lens-flare cross blazing across the eye
        ctx.strokeStyle = hexA('#FFFFFF', 0.9);
        ctx.lineWidth = Math.max(1, pr * 0.28);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(px - pr * 1.8, py); ctx.lineTo(px + pr * 1.8, py);
        ctx.moveTo(px, py - pr * 1.8); ctx.lineTo(px, py + pr * 1.8);
        ctx.stroke();
      } else {
        // moving eye sparkle
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(px - pr * 0.3, py - pr * 0.35, pr * 0.34, 0, Math.PI * 2);
        ctx.fill();
      }
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
    // tongue-lick grin after a TRIPLE
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
    // tiny drawn fangs at GOBBLER+ (form >= 2)
    if ((v.form || 0) >= 2) {
      const fw = mw * 0.28, fh = mh * 0.58;
      const ftop = my - mh * 0.78;
      ctx.fillStyle = '#FFFFFF';
      for (const sf of [-1, 1]) {
        const fcx = sf * mw * 0.36;
        ctx.beginPath();
        ctx.moveTo(fcx - fw / 2, ftop);
        ctx.lineTo(fcx + fw / 2, ftop);
        ctx.lineTo(fcx, ftop + fh);
        ctx.closePath();
        ctx.fill();
      }
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// STAGE AURA — everything that orbits or wraps OUTSIDE the body.
// Replaces the old debris chunks / flame crown / cracks with a single coherent
// cosmic identity: stars → rings → counter-rings + halo → accretion + corona.
// ══════════════════════════════════════════════════════════════════════════════
function drawStageAura(ctx: CanvasRenderingContext2D, v: VoidlingVisual) {
  const { r, t } = v;
  const form = v.form || 0;
  const morph = v.morph ?? 1;

  // ── VOIDLING (0): one shy sparkle that wanders by occasionally ─────────────
  if (form === 0) {
    const cycle = (t / 5200) % 1;              // long, lazy period
    if (cycle < 0.32) {                        // visible ~1/3 of the time
      const p = cycle / 0.32;                  // 0..1 across the pass
      const fade = Math.sin(p * Math.PI);      // in-and-out
      const ang = t / 1900;
      const rad = r * 1.35;
      drawStar(ctx, Math.cos(ang) * rad, Math.sin(ang) * rad * 0.6, Math.max(1.2, r * 0.06), fade * 0.85);
    }
    return;
  }

  // ── MUNCHER (1+): three tiny stars begin to orbit ──────────────────────────
  const ring1R = r * 1.3;
  const spin1 = t / 1600;
  {
    const a = form === 1 ? morph : 1;
    const n = 3;
    for (let i = 0; i < n; i++) {
      const ang = spin1 + (i / n) * Math.PI * 2;
      const tw = 0.55 + 0.45 * Math.abs(Math.sin(t / 340 + i * 2.1));
      drawStar(ctx, Math.cos(ang) * ring1R, Math.sin(ang) * ring1R * 0.92, Math.max(1.1, r * 0.05), a * tw);
    }
  }

  // ── GOBBLER (2+): the orbit becomes a visible star-RING + rising embers ────
  if (form >= 2) {
    const a = form === 2 ? morph : 1;
    // faint ring path so the orbit reads as a structure
    ctx.save();
    ctx.globalAlpha *= a * 0.30;
    ctx.strokeStyle = hexA(v.skin.glowColor, 1);
    ctx.lineWidth = Math.max(1, r * 0.025);
    ctx.beginPath();
    ctx.ellipse(0, 0, ring1R, ring1R * 0.92, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    // three more stars fill the ring (six total on ring 1)
    for (let i = 0; i < 3; i++) {
      const ang = spin1 + ((i + 0.5) / 3) * Math.PI * 2;
      const tw = 0.5 + 0.5 * Math.abs(Math.sin(t / 300 + i * 1.7 + 4));
      drawStar(ctx, Math.cos(ang) * ring1R, Math.sin(ang) * ring1R * 0.92, Math.max(1, r * 0.042), a * tw);
    }
    // rising ember wisps — three small warm motes drifting up off the body
    for (let i = 0; i < 3; i++) {
      const cyc = ((t / (1400 + i * 260)) + i * 0.37) % 1;
      const ex = Math.sin(i * 2.4 + t / 900) * r * 0.55;
      const ey = r * 0.2 - cyc * r * 1.15;
      const fade = (1 - cyc) * 0.55 * a;
      ctx.save();
      ctx.globalAlpha *= Math.max(0, fade);
      ctx.fillStyle = i % 2 === 0 ? '#C9A2FF' : '#FFB4E0';
      ctx.beginPath();
      ctx.arc(ex, ey, Math.max(0.8, r * 0.035 * (1 - cyc * 0.5)), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // ── DEVOURER (3+): a SECOND ring counter-rotates + space bends around it ───
  if (form >= 3) {
    const a = form === 3 ? morph : 1;
    const ring2R = r * 1.55;
    const spin2 = -t / 2100; // opposite direction — unmistakably alive
    // space-bend halo: a soft dark annulus just outside the body, like light
    // being pulled in (replaces the old cracks entirely)
    ctx.save();
    ctx.globalAlpha *= a;
    const g = ctx.createRadialGradient(0, 0, r * 1.02, 0, 0, r * 1.45);
    g.addColorStop(0, 'rgba(8,3,20,0.46)');
    g.addColorStop(0.55, 'rgba(8,3,20,0.16)');
    g.addColorStop(1, 'rgba(8,3,20,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.45, 0, Math.PI * 2);
    ctx.arc(0, 0, r * 1.0, 0, Math.PI * 2, true);
    ctx.fill();
    ctx.restore();
    // the counter-ring itself
    ctx.save();
    ctx.globalAlpha *= a * 0.36;
    ctx.strokeStyle = hexA('#B98CFF', 1);
    ctx.lineWidth = Math.max(1, r * 0.022);
    ctx.beginPath();
    ctx.ellipse(0, 0, ring2R, ring2R * 0.88, 0.35, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    for (let i = 0; i < 5; i++) {
      const ang = spin2 + (i / 5) * Math.PI * 2;
      const tw = 0.5 + 0.5 * Math.abs(Math.sin(t / 260 + i * 2.6));
      // ring 2 is tilted 0.35 rad — rotate the star positions to match
      const px = Math.cos(ang) * ring2R, py = Math.sin(ang) * ring2R * 0.88;
      const rx = px * Math.cos(0.35) - py * Math.sin(0.35);
      const ry = px * Math.sin(0.35) + py * Math.cos(0.35);
      drawStar(ctx, rx, ry, Math.max(1, r * 0.045), a * tw);
    }
  }

  // ── WORLD ENDER (4): the ACCRETION RING + ember corona ─────────────────────
  if (form >= 4) {
    const a = morph;
    // ember corona — short two-tone licks all around the rim (the flame crown,
    // reborn as a full-circle cosmic corona)
    const licks = 10;
    for (let i = 0; i < licks; i++) {
      const ang = (i / licks) * Math.PI * 2 + Math.sin(t / 700) * 0.05;
      const flick = Math.sin(t / 150 + i * 1.9) * 0.08;
      const len = r * (0.16 + Math.abs(Math.sin(t / 210 + i * 1.3)) * 0.14);
      const nx = -Math.sin(ang), ny = Math.cos(ang);
      const bx = Math.cos(ang) * r * 0.99, by = Math.sin(ang) * r * 0.99;
      const tx = Math.cos(ang + flick) * (r + len), ty = Math.sin(ang + flick) * (r + len);
      ctx.save();
      ctx.globalAlpha *= a;
      teardrop(ctx, bx, by, tx, ty, nx, ny, r * 0.075, '#C9A8FF');
      const itx = bx + (tx - bx) * 0.6, ity = by + (ty - by) * 0.6;
      teardrop(ctx, bx, by, itx, ity, nx, ny, r * 0.04, '#FFFFFF');
      ctx.restore();
    }
    // the accretion ring — a bright tilted ellipse slowly precessing, the
    // unmistakable signature of a thing that ends worlds
    const prec = 0.5 + Math.sin(t / 4200) * 0.12;
    ctx.save();
    ctx.rotate(prec);
    ctx.globalAlpha *= a;
    // outer warm band
    ctx.strokeStyle = hexA('#FFB36B', 0.85);
    ctx.lineWidth = Math.max(3, r * 0.105);
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.72, r * 0.52, 0, 0, Math.PI * 2);
    ctx.stroke();
    // bright white core line
    ctx.strokeStyle = hexA('#FFFFFF', 0.95);
    ctx.lineWidth = Math.max(1, r * 0.028);
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.72, r * 0.52, 0, 0, Math.PI * 2);
    ctx.stroke();
    // a few bright motes travelling the ring
    for (let i = 0; i < 4; i++) {
      const ang = t / 900 + (i / 4) * Math.PI * 2;
      drawStar(ctx, Math.cos(ang) * r * 1.72, Math.sin(ang) * r * 0.52, Math.max(1.2, r * 0.05), a * 0.9);
    }
    ctx.restore();
  }
}

// A tiny four-point twinkle star.
function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, alpha: number) {
  if (alpha <= 0.01) return;
  ctx.save();
  ctx.globalAlpha *= Math.min(1, alpha);
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(x, y, s * 0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = Math.max(0.8, s * 0.3);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - s, y); ctx.lineTo(x + s, y);
  ctx.moveTo(x, y - s); ctx.lineTo(x, y + s);
  ctx.stroke();
  ctx.restore();
}

// Pointed teardrop with slightly concave sides (kept from the proven flame code
// — now powering the WORLD ENDER's corona).
function teardrop(ctx: CanvasRenderingContext2D, bx: number, by: number, tx: number, ty: number, nx: number, ny: number, w: number, color: string) {
  const ctrlX = bx * 0.35 + tx * 0.65;  // on the flame axis, 65% toward tip
  const ctrlY = by * 0.35 + ty * 0.65;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(bx + nx * w, by + ny * w);
  ctx.quadraticCurveTo(ctrlX, ctrlY, tx, ty);
  ctx.quadraticCurveTo(ctrlX, ctrlY, bx - nx * w, by - ny * w);
  ctx.closePath();
  ctx.fill();
}

// ══════════════════════════════════════════════════════════════════════════════
// STAGE INTERIOR — what lives INSIDE the orb (clipped). Core glow, a drifting
// nebula, and the WORLD ENDER's full churning galaxy. The cracks are gone.
// ══════════════════════════════════════════════════════════════════════════════
function drawStageInterior(ctx: CanvasRenderingContext2D, v: VoidlingVisual) {
  const { r, t } = v;
  const form = v.form || 0;
  if (form <= 0) return;
  ctx.save();
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.clip();

  // MUNCHER (1+): soft inner core glow (stacked discs, no radial halo)
  {
    const a = (form === 1 ? (v.morph ?? 1) : 1) * (0.28 + 0.12 * Math.sin(t / 500));
    ctx.save();
    ctx.globalAlpha *= Math.max(0, a);
    for (let k = 3; k >= 1; k--) {
      ctx.fillStyle = hexA(v.skin.glowColor, 0.22);
      ctx.beginPath(); ctx.arc(0, 0, r * 0.16 * k, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  // GOBBLER (2+): deepen one shade + a slow drifting nebula wisp
  if (form >= 2) {
    const a = form === 2 ? (v.morph ?? 1) : 1;
    ctx.save();
    ctx.globalAlpha *= a * 0.16;
    ctx.fillStyle = '#000000';
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.globalAlpha *= a * 0.24;
    ctx.fillStyle = '#B478E8';
    ctx.rotate(t / 3600);
    ctx.beginPath();
    ctx.ellipse(r * 0.25, -r * 0.1, r * 0.5, r * 0.22, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // DEVOURER (3+): a second, colder nebula counter-drifts + denser inner dusk
  if (form >= 3) {
    const a = form === 3 ? (v.morph ?? 1) : 1;
    ctx.save();
    ctx.globalAlpha *= a * 0.2;
    ctx.fillStyle = '#5AC8FF';
    ctx.rotate(-t / 4400 + 2.1);
    ctx.beginPath();
    ctx.ellipse(r * 0.2, r * 0.05, r * 0.46, r * 0.18, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // WORLD ENDER (4): the full internal galaxy — dark heart, twin nebulae, stars
  if (form >= 4) {
    const a = v.morph ?? 1;
    ctx.save();
    ctx.globalAlpha *= a;
    ctx.fillStyle = hexA('#0D0821', 0.55);
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    const drift = t / 2400;
    const wisps: [string, number][] = [['#FF3CAC', drift], ['#2BD2FF', drift + Math.PI]];
    for (const [col, ph] of wisps) {
      ctx.save();
      ctx.globalAlpha *= 0.4;
      ctx.fillStyle = col;
      ctx.rotate(ph);
      ctx.beginPath(); ctx.ellipse(r * 0.2, 0, r * 0.55, r * 0.28, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = '#FFFFFF';
    for (let i = 0; i < 6; i++) {
      const ang = i * 2.3 + t / 3000;
      const rad = ((i * 53) % 100) / 100 * r * 0.8;
      const tw = 0.4 + 0.6 * Math.abs(Math.sin(t / 300 + i));
      ctx.globalAlpha = a * tw;
      ctx.beginPath(); ctx.arc(Math.cos(ang) * rad, Math.sin(ang) * rad, Math.max(0.8, r * 0.02), 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  ctx.restore(); // end body clip
}

// Faint blue underdog trail streaming behind a moving void.
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

// Stage-unique body palettes — each form gets a distinct hue so players
// feel a real transformation, not just size growth.
// [inner-highlight, mid-body, outer-rim]
const _STAGE_BODY: [string, string, string][] = [
  ['#1A1040', '#2D1B68', '#4535A0'], // 0 VOIDLING  — soft indigo  (shy, curious)
  ['#28104A', '#4B1E78', '#7A38A0'], // 1 MUNCHER   — warm plum    (hungry, eager)
  ['#28083A', '#601060', '#9C2090'], // 2 GOBBLER   — hot magenta  (cocky, bold)
  ['#1E0418', '#4C0828', '#841445'], // 3 DEVOURER  — deep crimson (cold, menacing)
  ['#040212', '#0C0630', '#181055'], // 4 WORLD ENDER — abyss      (vast, detached)
];
// Swirl hue shifts to match the body — RGBA prefix (alpha appended at draw time)
const _STAGE_SWIRL = [
  'rgba(180,155,255,', // indigo-lavender
  'rgba(220,140,255,', // pink-lavender
  'rgba(255,120,220,', // hot pink
  'rgba(255,110,160,', // blood rose
  'rgba(200,220,255,', // cold starlight
];

// Procedural orb body — deep-purple radial gradient + rotating swirl arcs +
// star specks. No PNG sprites, no white haloes, scales to any radius perfectly.
function drawProceduralBody(ctx: CanvasRenderingContext2D, v: VoidlingVisual) {
  const { r, t } = v;
  const form = v.form || 0;
  const swirl = t * 0.00005; // 0.05 rad/s slow rotation (t is ms clock)

  // ── Gradient fill, clipped to the orb circle ──────────────────────────────
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.clip();

  // per-stage gradient colors
  const [c0, c1, c2] = _STAGE_BODY[Math.min(form, 4)];
  const grd = ctx.createRadialGradient(r * -0.2, r * -0.2, r * 0.06, 0, 0, r);
  grd.addColorStop(0,    c0);
  grd.addColorStop(0.55, c1);
  grd.addColorStop(1,    c2);
  ctx.fillStyle = grd;
  ctx.fillRect(-r, -r, r * 2, r * 2);

  // ── Swirl arcs: 2 at base, 3 at GOBBLER+; brighter at higher forms ────────
  const swirlCount = form >= 2 ? 3 : 2;
  const swirlAlpha = Math.min(0.55, 0.07 + form * 0.06);
  ctx.lineWidth = Math.max(1.5, r * 0.052);
  ctx.lineCap = 'round';
  // swirl hue follows stage identity
  ctx.strokeStyle = `${_STAGE_SWIRL[Math.min(form, 4)]}${swirlAlpha})`;
  for (let i = 0; i < swirlCount; i++) {
    const a0 = swirl + (i / swirlCount) * Math.PI * 2;
    ctx.beginPath();
    for (let k = 0; k <= 44; k++) {
      const tt = k / 44;
      const ang = a0 + tt * Math.PI * 1.9;
      const rad = tt * r * 0.88;
      const px = Math.cos(ang) * rad, py = Math.sin(ang) * rad;
      if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }

  // ── Star specks — MUNCHER+ (form ≥ 1); more at higher stages ─────────────
  if (form >= 1) {
    const specks = 5 + form * 3;
    const phi = 2.399; // golden angle for even distribution
    ctx.fillStyle = '#FFFFFF';
    for (let i = 0; i < specks; i++) {
      const a = swirl * 0.65 + i * phi;
      const rad = ((i * 53) % 80) / 80 * r * 0.8;
      const tw = 0.25 + 0.75 * Math.abs(Math.sin(t / 700 + i));
      ctx.globalAlpha = 0.6 * tw;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * rad, Math.sin(a) * rad, Math.max(0.7, r * 0.018), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  ctx.restore(); // end circle clip

  // Soft DARK rim — keeps the orb crisp against the ground with no white ring;
  // grounding comes from the dark contact shadow.
  ctx.strokeStyle = 'rgba(16, 8, 30, 0.55)';
  ctx.lineWidth = Math.max(2, r * 0.05);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();
}

function hexA(hex: string, a: number) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return `rgba(${r},${g},${b},${a})`;
}

// ── Alive Pack §7: trailing sparkle — 3 tiny orbs drift behind GOBBLER+ voids ──
const SPARKLE_COLORS = ['#FFD23F', '#FFFFFF', '#C8A2FF'];
export function drawSparkleTrail(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  vx: number, vy: number,
  r: number,
  t: number,
) {
  const sp = Math.hypot(vx, vy);
  if (sp < 25) return; // only while actually moving
  const ux = vx / sp, uy = vy / sp;
  ctx.save();
  for (let i = 0; i < 3; i++) {
    const trail  = r * (0.55 + i * 0.38);          // distance behind center
    const perp   = Math.sin(t / 220 + i * 2.1) * r * 0.18; // lateral sway
    const sx = x - ux * trail - uy * perp;
    const sy = y - uy * trail + ux * perp;
    const sz = Math.max(1.5, r * (0.055 - i * 0.011));
    ctx.globalAlpha = (0.65 - i * 0.2) * (0.5 + 0.5 * Math.abs(Math.sin(t / 290 + i * 1.7)));
    ctx.fillStyle = SPARKLE_COLORS[i];
    ctx.beginPath();
    ctx.arc(sx, sy, sz, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
