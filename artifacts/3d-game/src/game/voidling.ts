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
import { drawSkinBack, drawSkinFront, drawSkinBodyFX } from './skins';

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

  // ── Legendary skin interior FX (galaxy starfield, magma cracks, gold sheen,
  //    disco facets, dragon scales) — clipped inside the orb, over the stage body
  drawSkinBodyFX(ctx, skin, r, v.t);

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
  // Keep the cute cheeks at EVERY form (dialed back a touch at the top so the
  // cosmic forms still read powerful) — the blush is the strongest "alive" cue.
  const _formForBlush = v.form || 0;
  const _blushMult = _formForBlush >= 4 ? 0.55 : _formForBlush >= 3 ? 0.65 : _formForBlush >= 2 ? 0.82 : 1;
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
      const cosmic = form >= 3; // DEVOURER+ gain glowing cosmic eyes — still readable
      // premium skins with glowing eyes (lava, dragon) cast a warm halo
      if (v.skin.eyeGlow) {
        const pulse = 0.4 + Math.sin(v.t / 300) * 0.25;
        ctx.fillStyle = hexA(v.skin.eyeGlow, pulse);
        ctx.beginPath();
        ctx.ellipse(px, py, pr * 1.9, pr * 1.9 * (eyeRY / eyeRX), 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // cosmic iris — a soft luminous ring BEHIND a dark, readable pupil
      if (cosmic) {
        const irisCol = form >= 4 ? '#C4A8FF' : '#9B6BFF';
        const pulse = 0.45 + Math.sin(v.t / 320) * 0.2;
        ctx.fillStyle = hexA(irisCol, pulse);
        ctx.beginPath();
        ctx.ellipse(px, py, pr * 1.55, pr * 1.55 * (eyeRY / eyeRX), 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // pupil — ALWAYS dark & readable (never white-on-white)
      ctx.fillStyle = '#160A30';
      ctx.beginPath();
      ctx.ellipse(px, py, pr, pr * (eyeRY / eyeRX), 0, 0, Math.PI * 2);
      ctx.fill();
      // tiny starfield glints inside the pupil at high forms (cute-cosmic)
      if (cosmic) {
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        for (const [gx, gy, gs] of [[0.28, 0.18, 0.13], [-0.22, -0.26, 0.10]] as const) {
          ctx.beginPath();
          ctx.arc(px + gx * pr, py + gy * pr, pr * gs, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // moving eye sparkle — the friendly catchlight, kept at ALL forms
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(px - pr * 0.32, py - pr * 0.36, pr * 0.36, 0, Math.PI * 2);
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
    // (fangs removed — they read as generic-monster and clashed with the
    // cute-cosmic identity; menace comes from scale + the accretion disk)
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
  const col = _STAGE_SWIRL[Math.min(form, 4)]; // rgba prefix for the stage hue

  // ── THE COMPANION SPARK — the void's tiny loyal star, present at EVERY
  //    form. It grows and brightens as you evolve: instant silhouette
  //    identity for the default skin (it's part of the character, so every
  //    cosmetic keeps it too).
  {
    const ca = t / 1100 + 1.2;
    const cr2 = r * 1.22;
    const sx2 = Math.cos(ca) * cr2, sy2 = Math.sin(ca) * cr2 * 0.82;
    const sz = r * (0.07 + form * 0.014);
    const tw = 0.75 + 0.25 * Math.sin(t / 240);
    ctx.save();
    const g0 = ctx.createRadialGradient(sx2, sy2, 0, sx2, sy2, sz * 3);
    g0.addColorStop(0, `rgba(255,240,200,${(0.5 * tw).toFixed(2)})`);
    g0.addColorStop(1, 'rgba(255,240,200,0)');
    ctx.fillStyle = g0;
    ctx.beginPath(); ctx.arc(sx2, sy2, sz * 3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    drawStar(ctx, sx2, sy2, Math.max(1.5, sz), tw);
  }

  // Each form shows ONE clean signature (replaced, not stacked) so the void
  // reads as a bold hero at every stage instead of a pile of particles.

  // ── VOIDLING (0): one shy sparkle that wanders by occasionally ─────────────
  if (form === 0) {
    const cycle = (t / 5200) % 1;
    if (cycle < 0.32) {
      const p = cycle / 0.32;
      const fade = Math.sin(p * Math.PI);
      const ang = t / 1900;
      const rad = r * 1.35;
      drawStar(ctx, Math.cos(ang) * rad, Math.sin(ang) * rad * 0.6, Math.max(1.2, r * 0.06), fade * 0.85);
    }
    return;
  }

  // ── MUNCHER (1): three tidy orbiting stars ─────────────────────────────────
  if (form === 1) {
    const ring = r * 1.32, spin = t / 1600;
    for (let i = 0; i < 3; i++) {
      const ang = spin + (i / 3) * Math.PI * 2;
      const tw = 0.55 + 0.45 * Math.abs(Math.sin(t / 340 + i * 2.1));
      drawStar(ctx, Math.cos(ang) * ring, Math.sin(ang) * ring * 0.92, Math.max(1.1, r * 0.055), morph * tw);
    }
    return;
  }

  // ── GOBBLER (2): a glowing orbit ring + a handful of bright motes ──────────
  if (form === 2) {
    const ring = r * 1.34, spin = t / 1500;
    ctx.save();
    ctx.globalAlpha *= morph * 0.42;
    ctx.strokeStyle = `${col}0.85)`;
    ctx.lineWidth = Math.max(1.2, r * 0.03);
    ctx.beginPath();
    ctx.ellipse(0, 0, ring, ring * 0.9, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    for (let i = 0; i < 6; i++) {
      const ang = spin + (i / 6) * Math.PI * 2;
      const tw = 0.5 + 0.5 * Math.abs(Math.sin(t / 300 + i * 1.7));
      drawStar(ctx, Math.cos(ang) * ring, Math.sin(ang) * ring * 0.9, Math.max(1, r * 0.05), morph * tw);
    }
    return;
  }

  // ── DEVOURER (3): an elegant tilted accretion ring + soft space-warp halo ──
  if (form === 3) {
    ctx.save();
    ctx.globalAlpha *= morph;
    const g = ctx.createRadialGradient(0, 0, r * 1.0, 0, 0, r * 1.62);
    g.addColorStop(0, `${col}0.30)`);
    g.addColorStop(0.5, `${col}0.10)`);
    g.addColorStop(1, `${col}0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.62, 0, Math.PI * 2);
    ctx.arc(0, 0, r * 0.98, 0, Math.PI * 2, true);
    ctx.fill();
    ctx.restore();
    _accretionRing(ctx, v, r * 1.5, r * 0.46, 0.4, morph, false);
    return;
  }

  // ── WORLD ENDER (4): the finale — a luminous halo + a bold precessing
  //    accretion disk. Big, bright, readable: a proper "ends worlds" silhouette.
  if (form >= 4) {
    // soft luminous halo bathing the void in its own light
    ctx.save();
    ctx.globalAlpha *= morph;
    const halo = ctx.createRadialGradient(0, 0, r * 0.85, 0, 0, r * 1.55);
    halo.addColorStop(0, 'rgba(190,160,255,0)');
    halo.addColorStop(0.42, 'rgba(190,150,255,0.34)');
    halo.addColorStop(1, 'rgba(120,80,220,0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // the grand accretion disk — precessing, warm-cored, unmistakable
    const prec = 0.5 + Math.sin(t / 4200) * 0.12;
    _accretionRing(ctx, v, r * 1.82, r * 0.56, prec, morph, true);
  }
}

// A tilted, precessing accretion ring with a bright core line + travelling
// motes. Shared by DEVOURER (elegant) and WORLD ENDER (grand/bright).
function _accretionRing(
  ctx: CanvasRenderingContext2D, v: VoidlingVisual,
  rx: number, ry: number, tilt: number, a: number, grand: boolean,
) {
  const { r, t } = v;
  ctx.save();
  ctx.rotate(tilt);
  ctx.globalAlpha *= a;
  // outer luminous band (warm for the grand disk, amethyst for devourer)
  ctx.strokeStyle = grand ? 'rgba(255,196,150,0.9)' : 'rgba(200,150,255,0.7)';
  ctx.lineWidth = Math.max(3, r * (grand ? 0.12 : 0.07));
  ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); ctx.stroke();
  // bright white core line
  ctx.strokeStyle = 'rgba(255,255,255,0.95)';
  ctx.lineWidth = Math.max(1, r * 0.03);
  ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); ctx.stroke();
  // travelling bright motes
  const n = grand ? 5 : 3;
  for (let i = 0; i < n; i++) {
    const ang = t / 900 + (i / n) * Math.PI * 2;
    drawStar(ctx, Math.cos(ang) * rx, Math.sin(ang) * ry, Math.max(1.2, r * 0.05), 0.9);
  }
  ctx.restore();
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

  // MUNCHER (1): soft inner core glow
  if (form === 1) {
    const a = (v.morph ?? 1) * (0.30 + 0.12 * Math.sin(t / 500));
    ctx.save();
    ctx.globalAlpha *= Math.max(0, a);
    ctx.fillStyle = hexA(v.skin.glowColor, 0.22);
    for (let k = 3; k >= 1; k--) { ctx.beginPath(); ctx.arc(0, 0, r * 0.16 * k, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }

  // GOBBLER (2): a slow drifting nebula wisp (in-family violet)
  if (form === 2) {
    const a = v.morph ?? 1;
    ctx.save();
    ctx.globalAlpha *= a * 0.30;
    ctx.fillStyle = '#C77CFF';
    ctx.rotate(t / 3600);
    ctx.beginPath(); ctx.ellipse(r * 0.22, -r * 0.1, r * 0.55, r * 0.24, 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // DEVOURER (3): twin drifting nebulae (warm + cool, kept in family)
  if (form === 3) {
    const a = v.morph ?? 1;
    const neb: [string, number, number][] = [['#B072FF', t / 3600, 1], ['#7AA2FF', -t / 4400 + 2.1, 0.9]];
    for (const [c, ph, sc] of neb) {
      ctx.save();
      ctx.globalAlpha *= a * 0.26;
      ctx.fillStyle = c;
      ctx.rotate(ph);
      ctx.beginPath(); ctx.ellipse(r * 0.2, 0, r * 0.5 * sc, r * 0.2 * sc, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }

  // WORLD ENDER (4): churning galaxy + a BRIGHT singularity core so the void
  // glows from within — the luminous heart of a thing that ends worlds.
  if (form >= 4) {
    const a = v.morph ?? 1;
    const drift = t / 2400;
    const wisps: [string, number][] = [['#C77CFF', drift], ['#7AC2FF', drift + Math.PI]];
    for (const [c, ph] of wisps) {
      ctx.save();
      ctx.globalAlpha *= a * 0.34;
      ctx.fillStyle = c;
      ctx.rotate(ph);
      ctx.beginPath(); ctx.ellipse(r * 0.2, 0, r * 0.55, r * 0.28, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = '#FFFFFF';
    for (let i = 0; i < 7; i++) {
      const ang = i * 2.3 + t / 3000;
      const rad = ((i * 53) % 100) / 100 * r * 0.82;
      const tw = 0.4 + 0.6 * Math.abs(Math.sin(t / 300 + i));
      ctx.globalAlpha = a * tw;
      ctx.beginPath(); ctx.arc(Math.cos(ang) * rad, Math.sin(ang) * rad, Math.max(0.8, r * 0.02), 0, Math.PI * 2); ctx.fill();
    }
    // luminous singularity core (pulsing bright heart)
    ctx.globalAlpha = a * (0.7 + 0.3 * Math.sin(t / 380));
    const core = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.5);
    core.addColorStop(0, 'rgba(255,255,255,0.95)');
    core.addColorStop(0.35, 'rgba(222,186,255,0.6)');
    core.addColorStop(1, 'rgba(150,90,255,0)');
    ctx.fillStyle = core;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.5, 0, Math.PI * 2); ctx.fill();
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
// Dark core → lit rim (the black-hole look). Saturation & rim-luminosity
// ESCALATE toward a majestic climax instead of collapsing to near-black.
const _STAGE_BODY: [string, string, string][] = [
  ['#1A1040', '#2D1B68', '#4535A0'], // 0 VOIDLING    — soft indigo (curious)
  ['#241056', '#40208A', '#6A3AC8'], // 1 MUNCHER     — brighter violet (eager)
  ['#2A0A66', '#5A1CB0', '#9A44F0'], // 2 GOBBLER     — royal magenta (bold)
  ['#28065C', '#5A1CC0', '#B268FF'], // 3 DEVOURER    — radiant amethyst (powerful)
  ['#0E0636', '#241468', '#7A4FE0'], // 4 WORLD ENDER — deep core, luminous violet rim (event horizon)
];
// Swirl hue stays in a coherent violet family and brightens with the stage.
const _STAGE_SWIRL = [
  'rgba(180,155,255,', // indigo-lavender
  'rgba(205,150,255,', // violet
  'rgba(230,140,255,', // royal magenta
  'rgba(215,150,255,', // amethyst
  'rgba(205,180,255,', // luminous cosmic
];

// Procedural orb body — deep-purple radial gradient + rotating swirl arcs +
// star specks. No PNG sprites, no white haloes, scales to any radius perfectly.
function drawProceduralBody(ctx: CanvasRenderingContext2D, v: VoidlingVisual) {
  const { r, t } = v;
  const form = v.form || 0;
  const swirl = t * 0.00005; // 0.05 rad/s slow rotation (t is ms clock)

  // Universal ground-contrast (user: "hard to see in some areas"): a dark
  // pit-AO ring makes the void pop on light ground, and the luminous rim
  // stroke below handles dark ground — readable on any surface.
  {
    const ao = ctx.createRadialGradient(0, 0, r * 0.92, 0, 0, r * 1.36);
    ao.addColorStop(0, 'rgba(14,8,34,0.44)');
    ao.addColorStop(0.5, 'rgba(14,8,34,0.16)');
    ao.addColorStop(1, 'rgba(14,8,34,0)');
    ctx.fillStyle = ao;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.36, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Gradient fill, clipped to the orb circle ──────────────────────────────
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.clip();

  // per-stage gradient colors — hole.io read: the CENTRE is the deepest point
  // (near-black abyss) and the rim is the lit edge, so the body reads as a
  // pit INTO the ground instead of a ball sitting on it.
  const [c0, c1, c2] = _STAGE_BODY[Math.min(form, 4)];
  const grd = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
  grd.addColorStop(0,    '#060310'); // the abyss
  grd.addColorStop(0.40, c0);
  grd.addColorStop(0.76, c1);
  grd.addColorStop(1,    c2);
  ctx.fillStyle = grd;
  ctx.fillRect(-r, -r, r * 2, r * 2);

  // ── Stage nebulae — two soft hue clouds drifting inside the orb (form 1+),
  //    giving the interior cosmic depth beyond a flat gradient ───────────────
  if (form >= 1) {
    const NEB = ['rgba(120,80,220,', 'rgba(255,110,220,'];
    for (let i = 0; i < 2; i++) {
      const a = t / (5200 + i * 1700) + i * 2.6;
      const nx2 = Math.cos(a) * r * 0.42, ny2 = Math.sin(a) * r * 0.38;
      const gN = ctx.createRadialGradient(nx2, ny2, 0, nx2, ny2, r * 0.55);
      gN.addColorStop(0, NEB[i] + (0.10 + form * 0.03).toFixed(2) + ')');
      gN.addColorStop(1, NEB[i] + '0)');
      ctx.fillStyle = gN;
      ctx.fillRect(-r, -r, r * 2, r * 2);
    }
  }

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

  // Luminous event-horizon rim-light at EVERY form (stronger as you evolve) —
  // paired with the pit-AO ring above, the silhouette reads on any ground.
  {
    const rimA = form >= 4 ? 0.85 : form >= 3 ? 0.55 : 0.38;
    ctx.strokeStyle = hexA(_STAGE_BODY[Math.min(form, 4)][2], rimA);
    ctx.lineWidth = Math.max(1.5, r * 0.03);
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.985, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Crisp white hairline — the "logo edge". Makes the silhouette read as a
  // designed mark on any background (the default-skin identity fix).
  ctx.strokeStyle = 'rgba(255,255,255,0.38)';
  ctx.lineWidth = Math.max(1, r * 0.014);
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.012, 0, Math.PI * 2);
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
