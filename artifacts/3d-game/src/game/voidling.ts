// Shared voidling renderer — used by the player AND every rival bot.
// Draws a cute jelly black-hole creature centered at (x,y) with a given skin.
import type { SkinDef } from './config';
import { drawSkinBack, drawSkinFront } from './skins';
import { layerSprites } from './sprites'; // Phase 7a: layerSprites kept for flame-crown + galaxy-core accessories

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
  form?: number;          // v6 §3: evolution form index (0..4) → stacked visual layers
  morph?: number;         // v9 §3: 0..1 crossfade of the newest form's body morph
  cheekPuff?: number;     // v6 §9: 0..1, puffed cheeks after eating T3+
  dizzy?: number;         // v6 §9: 0..1, swirl eyes after being chomped
  lick?: number;          // v6 §9: 0..1, tongue-lick grin after a TRIPLE
}

export function drawVoidling(ctx: CanvasRenderingContext2D, x: number, y: number, v: VoidlingVisual) {
  const { r, skin } = v;
  ctx.save();
  ctx.translate(x, y);
  if (v.ghost) ctx.globalAlpha = 0.4;
  if (skin.id === 'ghost') ctx.globalAlpha *= 0.6; // v8 §8: translucent floaty ghost
  ctx.rotate(v.lean);

  // ── Glow: crisp concentric rings (v12 §0 — max +10% outward, was +36%) ──────
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

  // ── v6 §3: evolution form layers (behind body) ──────────────────────────────
  drawFormLayers(ctx, v);

  // ── Back accessories ────────────────────────────────────────────────────────
  drawSkinBack(ctx, skin, r, v.t);

  // ── Phase 7a §1: procedural body — crisp gradient orb, no sprite cutouts ────
  ctx.save();
  ctx.scale(v.wobbleX * v.breathe, v.wobbleY * v.breathe);
  drawProceduralBody(ctx, v);
  ctx.restore();

  // ── v9 §3: evolution body morphs (always procedural in Phase 7a) ──────────
  drawFormBody(ctx, v);

  // ── Face (crisp, unsquashed) ────────────────────────────────────────────────
  drawFace(ctx, v);

  // ── Front accessories ───────────────────────────────────────────────────────
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
      const form = v.form || 0;
      const grow = form >= 1 ? 1.15 : 1;      // v9 §3: MUNCHER+ pupils grow 15%
      const pr = eyeRX * 0.56 * grow * (v.nearFood ? 1.15 : 1); // dilate 15% when food in vacuum
      const px = v.lookX * eyeRX * 0.42;
      const py = v.lookY * eyeRY * 0.42;
      const ender = form >= 4, devour = form >= 3;
      // v9 §6: premium skins with glowing eyes (lava, dragon) cast a warm halo
      if (v.skin.eyeGlow && !devour) {
        const pulse = 0.4 + Math.sin(v.t / 300) * 0.25;
        ctx.fillStyle = hexA(v.skin.eyeGlow, pulse);
        ctx.beginPath();
        ctx.ellipse(px, py, pr * 1.9, pr * 1.9 * (eyeRY / eyeRX), 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // v9 §3: DEVOURER eyes glow violet-white; WORLD ENDER eyes blaze white
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
        // v9 §3: lens-flare cross blazing across the eye
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

// v6 §3 / v9 §3: each evolution form adds a permanent visual layer behind the body.
// The newest form's layer fades in over 500ms (v.morph) so the change is unmissable.
function drawFormLayers(ctx: CanvasRenderingContext2D, v: VoidlingVisual) {
  const { r, t } = v;
  const form = v.form || 0;
  if (form <= 0) return;

  // MUNCHER (1+): thin rotating dashed energy ring
  {
    ctx.save();
    ctx.globalAlpha *= form === 1 ? (v.morph ?? 1) : 1;
    ctx.rotate((t / 1400) % (Math.PI * 2));
    ctx.strokeStyle = hexA(v.skin.glowColor, 0.6);
    ctx.lineWidth = Math.max(1.4, r * 0.05);
    ctx.setLineDash([r * 0.5, r * 0.4]);
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.18, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // GOBBLER (2+): three recognizable debris chunks — brick / shingle / picket
  if (form >= 2) {
    ctx.save();
    ctx.globalAlpha *= form === 2 ? (v.morph ?? 1) : 1;
    drawDebris(ctx, v);
    ctx.restore();
  }

  // DEVOURER (3+): flame crown (turns white-violet at WORLD ENDER) — always procedural
  if (form >= 3) {
    ctx.save();
    ctx.globalAlpha *= form === 3 ? (v.morph ?? 1) : 1;
    drawFlames(ctx, v);
    ctx.restore();
  }

  // WORLD ENDER (4): a thin gravitational lens ring undulating just outside the outline
  if (form >= 4) {
    ctx.save();
    ctx.globalAlpha *= v.morph ?? 1;
    ctx.strokeStyle = hexA('#B98CFF', 0.5);
    ctx.lineWidth = Math.max(1, r * 0.03);
    ctx.beginPath();
    for (let k = 0; k <= 44; k++) {
      const ang = (k / 44) * Math.PI * 2;
      const rr = r * 1.06 + Math.sin(ang * 6 + t / 300) * r * 0.02;
      const px = Math.cos(ang) * rr, py = Math.sin(ang) * rr;
      if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

// v9 §3: GOBBLER's orbiting debris — a brick, a roof shingle and a fence picket,
// white-outlined (no dark squares).
function drawDebris(ctx: CanvasRenderingContext2D, v: VoidlingVisual) {
  const { r, t } = v;
  const spin = t / 900;
  const s = Math.max(9, r * 0.16);
  for (let i = 0; i < 3; i++) {
    const a = spin + (i / 3) * Math.PI * 2;
    ctx.save();
    ctx.translate(Math.cos(a) * r * 1.42, Math.sin(a) * r * 1.42);
    ctx.rotate(a * 1.3);
    ctx.lineJoin = 'round';
    if (i === 0) {
      // brick — red-brown rect with a mortar line
      ctx.fillStyle = '#A24B32';
      ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.rect(-s * 0.7, -s * 0.45, s * 1.4, s * 0.9); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(-s * 0.7, 0); ctx.lineTo(s * 0.7, 0); ctx.stroke();
    } else if (i === 1) {
      // roof shingle — grey trapezoid
      ctx.fillStyle = '#8A8F98';
      ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-s * 0.7, -s * 0.4); ctx.lineTo(s * 0.7, -s * 0.4);
      ctx.lineTo(s * 0.5, s * 0.4); ctx.lineTo(-s * 0.5, s * 0.4); ctx.closePath();
      ctx.fill(); ctx.stroke();
    } else {
      // fence picket — cream plank with a pointed top
      ctx.fillStyle = '#F2E6C8';
      ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.75); ctx.lineTo(s * 0.32, -s * 0.35);
      ctx.lineTo(s * 0.32, s * 0.6); ctx.lineTo(-s * 0.32, s * 0.6);
      ctx.lineTo(-s * 0.32, -s * 0.35); ctx.closePath();
      ctx.fill(); ctx.stroke();
    }
    ctx.restore();
  }
}

// v10 §6 / v9 §3: DEVOURER's flame crown — 7 two-tone teardrop flames flickering at ~8Hz.
// Warm orange/yellow fire normally; white-violet when reaching WORLD ENDER.
function drawFlames(ctx: CanvasRenderingContext2D, v: VoidlingVisual) {
  const { r, t } = v;

  // v10 §1: art sprite replaces procedural flames entirely
  const crownSprite = layerSprites.get('flame-crown');
  if (crownSprite) {
    const d = r * 3.2;
    const flicker = 1 + Math.sin(t / 80) * 0.04;
    ctx.save();
    ctx.scale(flicker, flicker);
    ctx.drawImage(crownSprite, -d / 2, -d * 0.9, d, d);
    ctx.restore();
    return;
  }

  const ender = (v.form || 0) >= 4;
  const outer = ender ? '#C9A8FF' : '#FF6A00'; // warm orange / cosmic violet
  const inner = ender ? '#FFFFFF' : '#FFD23F';  // warm yellow / bright white
  const licks = 7;
  for (let i = 0; i < licks; i++) {
    const a = -Math.PI / 2 + (i - (licks - 1) / 2) * 0.34;
    const flick = Math.sin(t / 160 + i) * 0.10;
    const pulse = 1 + 0.1 * Math.sin(t * 0.0503 + i * 1.7); // ~8Hz, scale 0.9–1.1
    const len = r * (0.34 + Math.abs(Math.sin(t / 220 + i * 1.3)) * 0.24) * pulse;
    const nx = -Math.sin(a), ny = Math.cos(a);
    const bx = Math.cos(a) * r, by = Math.sin(a) * r;
    const tx = Math.cos(a + flick) * (r + len), ty = Math.sin(a + flick) * (r + len);
    teardrop(ctx, bx, by, tx, ty, nx, ny, r * 0.15, outer);
    const itx = bx + (tx - bx) * 0.62, ity = by + (ty - by) * 0.62;
    teardrop(ctx, bx, by, itx, ity, nx, ny, r * 0.075, inner);
  }
}

// v10 §6: concave-sided pointed teardrop flame (spec: "pointed teardrop with slightly
// concave sides" — NOT convex "bunny ears"). Control point sits on the centre axis
// (65% toward the tip) so both sides curve INWARD, producing a sharp tapered tip.
function teardrop(ctx: CanvasRenderingContext2D, bx: number, by: number, tx: number, ty: number, nx: number, ny: number, w: number, color: string) {
  const ctrlX = bx * 0.35 + tx * 0.65;  // on the flame axis, 65% toward tip
  const ctrlY = by * 0.35 + ty * 0.65;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(bx + nx * w, by + ny * w);
  ctx.quadraticCurveTo(ctrlX, ctrlY, tx, ty);              // right side: concave inward
  ctx.quadraticCurveTo(ctrlX, ctrlY, bx - nx * w, by - ny * w); // left side: concave inward
  ctx.closePath();
  ctx.fill();
}

// v9 §3: form morphs painted INTO the orb (clipped): core glow, darken+swirl,
// glowing cracks, then the WORLD ENDER internal galaxy.
function drawFormBody(ctx: CanvasRenderingContext2D, v: VoidlingVisual) {
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

  // GOBBLER (2+): darken one shade + faint swirl texture
  if (form >= 2) {
    const a = form === 2 ? (v.morph ?? 1) : 1;
    ctx.save();
    ctx.globalAlpha *= a * 0.16;
    ctx.fillStyle = '#000000';
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.globalAlpha *= a * 0.22;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = Math.max(1, r * 0.03);
    ctx.beginPath();
    for (let k = 0; k <= 40; k++) {
      const tt = k / 40;
      const ang = tt * Math.PI * 4 + t / 1200;
      const rad = tt * r * 0.8;
      const px = Math.cos(ang) * rad, py = Math.sin(ang) * rad;
      if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.restore();
  }

  // DEVOURER (3+): 3 jagged glowing crack lines across the body
  if (form >= 3) {
    ctx.save();
    ctx.globalAlpha *= form === 3 ? (v.morph ?? 1) : 1;
    ctx.strokeStyle = hexA('#9D6BFF', 0.9);
    ctx.lineWidth = Math.max(1.4, r * 0.05);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let c = 0; c < 3; c++) {
      const base = c * 2.1 + 0.6;
      let px = Math.cos(base) * -r, py = Math.sin(base) * -r;
      ctx.beginPath(); ctx.moveTo(px, py);
      const ang = base + Math.PI;
      const ex = Math.cos(ang) * r, ey = Math.sin(ang) * r;
      const steps = 4;
      for (let k = 1; k <= steps; k++) {
        const tt = k / steps;
        const jx = px + (ex - px) * tt + Math.sin(c * 5 + k) * r * 0.14;
        const jy = py + (ey - py) * tt + Math.cos(c * 3 + k) * r * 0.14;
        ctx.lineTo(jx, jy);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  // WORLD ENDER (4): internal galaxy — 2 nebula wisps + 6 pinprick stars (always procedural)
  if (form >= 4) {
    const a = v.morph ?? 1;
    ctx.save();
    ctx.globalAlpha *= a;
    // v10 §1: art sprite replaces the procedural galaxy interior
    const galaxySprite = layerSprites.get('galaxy-core');
    if (galaxySprite) {
      ctx.drawImage(galaxySprite, -r, -r, r * 2, r * 2);
    } else {
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
    }
    ctx.restore();
  }

  ctx.restore(); // end body clip
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

// Phase 7a §1: procedural orb body — deep-purple radial gradient + rotating swirl arcs +
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

  const grd = ctx.createRadialGradient(r * -0.2, r * -0.2, r * 0.06, 0, 0, r);
  grd.addColorStop(0,   '#2A1745');
  grd.addColorStop(0.55, '#3B2165');
  grd.addColorStop(1,   '#4C3585');
  ctx.fillStyle = grd;
  ctx.fillRect(-r, -r, r * 2, r * 2);

  // ── Swirl arcs: 2 at base, 3 at GOBBLER+; brighter at higher forms ────────
  const swirlCount = form >= 2 ? 3 : 2;
  const swirlAlpha = Math.min(0.55, 0.07 + form * 0.06);
  ctx.lineWidth = Math.max(1.5, r * 0.052);
  ctx.lineCap = 'round';
  ctx.strokeStyle = `rgba(200,170,255,${swirlAlpha})`;
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

  // ── Prompt 7 Stage 3: soft DARK rim (was a bright white outline — the reported
  // "white halo" around the void). A subtle dark edge keeps the orb crisp against
  // the ground with no white ring; grounding comes from the dark contact shadow.
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
