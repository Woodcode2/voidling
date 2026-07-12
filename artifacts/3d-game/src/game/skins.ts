// Procedural skin accessories. Drawn in body-local space: origin = voidling center,
// body radius = r, +y down. Back layers render behind the body, front over the face.
// The voidling face itself (eye style, blush) is handled in voidling.ts from skin flags.
import type { SkinDef, AccessoryType } from './config';
import { sticker, stickerCircle, roundRectPath, dot } from './draw';

function has(skin: SkinDef, a: AccessoryType) {
  return skin.accessories.includes(a);
}

// ── BACK (behind body) ───────────────────────────────────────────────────────
export function drawSkinBack(ctx: CanvasRenderingContext2D, skin: SkinDef, r: number, t: number) {
  drawLegendaryBack(ctx, skin, r, t); // wicked money-skin aura/trails
  // v8 §8: GHOST — a wavering scalloped tail trailing below the body
  if (skin.id === 'ghost') {
    const wig = Math.sin(t / 320) * r * 0.14;
    ctx.save();
    ctx.fillStyle = 'rgba(220,235,250,0.55)';
    ctx.beginPath();
    ctx.moveTo(-r * 0.72, r * 0.35);
    ctx.quadraticCurveTo(-r * 0.3, r * 1.15, -r * 0.28 + wig, r * 1.5);
    ctx.quadraticCurveTo(-r * 0.16 + wig, r * 1.2, 0 + wig, r * 1.45);
    ctx.quadraticCurveTo(r * 0.16 + wig, r * 1.2, r * 0.28 + wig, r * 1.5);
    ctx.quadraticCurveTo(r * 0.3, r * 1.15, r * 0.72, r * 0.35);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  if (has(skin, 'sparkleTrail')) {
    for (let i = 0; i < 5; i++) {
      const a = t / 500 + i * 1.3;
      const d = r * (1.1 + i * 0.28);
      const x = -Math.cos(a * 0.4) * d;
      const y = Math.sin(a * 0.7) * r * 0.5 + r * 0.2;
      const tw = (Math.sin(t / 200 + i) + 1) * 0.5;
      ctx.save();
      ctx.globalAlpha = 0.4 + tw * 0.4;
      drawStar(ctx, x, y, r * (0.16 - i * 0.02), '#FFE79A');
      ctx.restore();
    }
  }
  if (has(skin, 'devilTail')) {
    const wag = Math.sin(t / 300) * 0.3;
    ctx.save();
    ctx.strokeStyle = '#8A1E1E';
    ctx.lineWidth = Math.max(3, r * 0.14);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(r * 0.7, r * 0.4);
    ctx.quadraticCurveTo(r * 1.4, r * 0.2 + wag * r, r * 1.25, -r * 0.5 + wag * r);
    ctx.stroke();
    sticker(ctx, (c) => {
      c.moveTo(r * 1.25, -r * 0.5 + wag * r);
      c.lineTo(r * 1.5, -r * 0.85 + wag * r);
      c.lineTo(r * 1.4, -r * 0.4 + wag * r);
      c.closePath();
    }, '#C42A2A', { outline: 2, shadow: false });
    ctx.restore();
  }
}

// ── LEGENDARY BACK FX — wicked aura/trail effects behind the body ───────────
// Money skins must LOOK like money: each legendary gets a signature particle
// system, all t-driven procedural canvas (no assets, scales to any radius).
export function drawLegendaryBack(ctx: CanvasRenderingContext2D, skin: SkinDef, r: number, t: number) {
  switch (skin.id) {
    case 'lava': {
      // rising EMBERS + pulsing heat rim
      ctx.save();
      for (let i = 0; i < 9; i++) {
        const cycle = ((t / 1400 + i * 0.31) % 1);
        const a = (i * 2.399) % (Math.PI * 2);
        const dist0 = r * (0.75 + ((i * 37) % 40) / 100);
        const ex = Math.cos(a) * dist0 + Math.sin(t / 500 + i) * r * 0.06;
        const ey = Math.sin(a) * dist0 * 0.5 + r * 0.5 - cycle * r * 1.7;
        ctx.globalAlpha = (1 - cycle) * 0.85;
        ctx.fillStyle = i % 3 ? '#FF8A3C' : '#FFD23F';
        ctx.beginPath();
        ctx.arc(ex, ey, Math.max(1.4, r * 0.045 * (1 - cycle)), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      const pulse = 0.5 + Math.sin(t / 300) * 0.2;
      ctx.strokeStyle = `rgba(255,110,30,${pulse.toFixed(2)})`;
      ctx.lineWidth = Math.max(2, r * 0.07);
      ctx.beginPath(); ctx.arc(0, 0, r * 1.06, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
      break;
    }
    case 'galaxy': {
      // orbiting STAR TRAIL + nebula ring
      ctx.save();
      for (let i = 0; i < 10; i++) {
        const a = t / 1600 + (i / 10) * Math.PI * 2;
        const rr2 = r * (1.18 + Math.sin(t / 900 + i * 1.7) * 0.12);
        const tw = 0.3 + 0.7 * Math.abs(Math.sin(t / 420 + i * 2.1));
        ctx.globalAlpha = tw;
        drawStar(ctx, Math.cos(a) * rr2, Math.sin(a) * rr2 * 0.9, r * (0.05 + (i % 3) * 0.02), i % 2 ? '#B9CFFF' : '#F2C6FF');
      }
      ctx.globalAlpha = 0.5;
      const neb = ctx.createRadialGradient(0, 0, r * 0.95, 0, 0, r * 1.5);
      neb.addColorStop(0, 'rgba(120,80,220,0)');
      neb.addColorStop(0.5, 'rgba(150,90,255,0.30)');
      neb.addColorStop(0.75, 'rgba(255,110,220,0.16)');
      neb.addColorStop(1, 'rgba(120,80,220,0)');
      ctx.fillStyle = neb;
      ctx.beginPath(); ctx.arc(0, 0, r * 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      break;
    }
    case 'disco': {
      // 3 rotating LIGHT BEAMS + floor colour dots
      ctx.save();
      const COLS = ['rgba(255,90,240,', 'rgba(90,200,255,', 'rgba(255,210,63,'];
      for (let i = 0; i < 3; i++) {
        const a = t / 700 + (i / 3) * Math.PI * 2;
        const g = ctx.createLinearGradient(0, 0, Math.cos(a) * r * 2.4, Math.sin(a) * r * 2.4);
        g.addColorStop(0, COLS[i] + '0.34)');
        g.addColorStop(1, COLS[i] + '0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, r * 2.4, a - 0.16, a + 0.16);
        ctx.closePath();
        ctx.fill();
      }
      for (let i = 0; i < 8; i++) {
        const a = -t / 900 + i * 0.785;
        ctx.fillStyle = COLS[i % 3] + '0.5)';
        ctx.beginPath();
        ctx.arc(Math.cos(a) * r * 1.5, Math.sin(a) * r * 1.15, r * 0.05, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      break;
    }
    case 'dragon': {
      // flame tongues licking the rim + drifting smoke
      ctx.save();
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2 + Math.sin(t / 600 + i) * 0.15;
        const flick = 0.6 + Math.abs(Math.sin(t / 170 + i * 2.4)) * 0.6;
        const bx = Math.cos(a) * r * 1.02, by = Math.sin(a) * r * 1.02;
        const tx2 = Math.cos(a) * r * (1.02 + 0.3 * flick), ty2 = Math.sin(a) * r * (1.02 + 0.3 * flick);
        const g = ctx.createLinearGradient(bx, by, tx2, ty2);
        g.addColorStop(0, 'rgba(124,255,107,0.55)');
        g.addColorStop(1, 'rgba(30,185,84,0)');
        ctx.strokeStyle = g;
        ctx.lineWidth = Math.max(2.5, r * 0.09);
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(tx2, ty2); ctx.stroke();
      }
      ctx.restore();
      break;
    }
    case 'midas': {
      // radiant golden rays, slowly rotating
      ctx.save();
      ctx.globalAlpha = 0.4 + Math.sin(t / 800) * 0.12;
      for (let i = 0; i < 6; i++) {
        const a = t / 2600 + (i / 6) * Math.PI * 2;
        const g = ctx.createLinearGradient(0, 0, Math.cos(a) * r * 1.9, Math.sin(a) * r * 1.9);
        g.addColorStop(0, 'rgba(255,210,63,0.5)');
        g.addColorStop(1, 'rgba(255,210,63,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, r * 1.9, a - 0.09, a + 0.09);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
      break;
    }
    // ── mid-tier charms: coin skins earn a signature too (smaller than legendary) ──
    case 'kitty': {
      const a = t / 1400;
      const hx = Math.cos(a) * r * 1.28, hy = Math.sin(a) * r * 1.0;
      const tw = 0.5 + 0.5 * Math.abs(Math.sin(t / 400));
      ctx.save();
      ctx.globalAlpha = tw;
      ctx.fillStyle = '#FF7DA8';
      ctx.beginPath(); // little heart
      ctx.arc(hx - r * 0.045, hy - r * 0.02, r * 0.055, 0, Math.PI * 2);
      ctx.arc(hx + r * 0.045, hy - r * 0.02, r * 0.055, 0, Math.PI * 2);
      ctx.moveTo(hx - r * 0.095, hy);
      ctx.lineTo(hx, hy + r * 0.11);
      ctx.lineTo(hx + r * 0.095, hy);
      ctx.closePath(); ctx.fill();
      ctx.restore();
      break;
    }
    case 'ninja': {
      // dash afterimages trailing the body
      ctx.save();
      for (let i = 1; i <= 2; i++) {
        const wob = Math.sin(t / 260) * r * 0.1;
        ctx.globalAlpha = 0.12 / i;
        ctx.fillStyle = '#5E6E8C';
        ctx.beginPath();
        ctx.arc(-i * r * 0.34 + wob, 0, r * (1 - i * 0.08), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      break;
    }
    case 'wizard': {
      // three orbiting arcane sparks
      for (let i = 0; i < 3; i++) {
        const a = t / 1200 + (i / 3) * Math.PI * 2;
        const tw = 0.5 + 0.5 * Math.abs(Math.sin(t / 320 + i * 2));
        ctx.save();
        ctx.globalAlpha = tw;
        drawStar(ctx, Math.cos(a) * r * 1.25, Math.sin(a) * r * 0.95, r * 0.07, '#C9A6FF');
        ctx.restore();
      }
      break;
    }
    case 'pirate': {
      // gold doubloons glinting past
      for (let i = 0; i < 2; i++) {
        const cyc = ((t / 2600 + i * 0.5) % 1);
        const a = i * 2.6 + 0.8;
        ctx.save();
        ctx.globalAlpha = Math.sin(cyc * Math.PI) * 0.9;
        ctx.fillStyle = '#FFD23F';
        ctx.strokeStyle = '#C79A12';
        ctx.lineWidth = Math.max(1, r * 0.02);
        const gx = Math.cos(a) * r * 1.3, gy = Math.sin(a) * r * 1.0 - cyc * r * 0.5;
        ctx.beginPath(); ctx.arc(gx, gy, r * 0.07, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.restore();
      }
      break;
    }
    case 'astronaut': {
      // a tiny satellite orbits with a blinking beacon
      const a = t / 2000;
      const sx3 = Math.cos(a) * r * 1.35, sy3 = Math.sin(a) * r * 1.05;
      ctx.save();
      ctx.fillStyle = '#C9CCD6';
      ctx.fillRect(sx3 - r * 0.05, sy3 - r * 0.03, r * 0.1, r * 0.06);
      ctx.fillStyle = '#5E7FA6';
      ctx.fillRect(sx3 - r * 0.12, sy3 - r * 0.02, r * 0.05, r * 0.04);
      ctx.fillRect(sx3 + r * 0.07, sy3 - r * 0.02, r * 0.05, r * 0.04);
      if (Math.sin(t / 250) > 0.4) {
        ctx.fillStyle = '#FF3D68';
        ctx.beginPath(); ctx.arc(sx3, sy3 - r * 0.05, r * 0.02, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
      break;
    }
    case 'devil': {
      // smoldering dark embers rising
      ctx.save();
      for (let i = 0; i < 5; i++) {
        const cyc = ((t / 1700 + i * 0.37) % 1);
        const a = (i * 2.399) % (Math.PI * 2);
        const ex = Math.cos(a) * r * 0.9 + Math.sin(t / 600 + i) * r * 0.05;
        const ey = Math.sin(a) * r * 0.45 + r * 0.4 - cyc * r * 1.3;
        ctx.globalAlpha = (1 - cyc) * 0.7;
        ctx.fillStyle = i % 2 ? '#8A1E1E' : '#FF4D4D';
        ctx.beginPath(); ctx.arc(ex, ey, Math.max(1.2, r * 0.035 * (1 - cyc)), 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
      break;
    }
    case 'ghost': {
      // trailing spectral echoes
      ctx.save();
      for (let i = 1; i <= 3; i++) {
        const drift = Math.sin(t / 480 + i * 1.8) * r * 0.14;
        ctx.globalAlpha = 0.16 / i;
        ctx.fillStyle = '#CFE6FF';
        ctx.beginPath();
        ctx.arc(-i * r * 0.22 + drift, i * r * 0.1, r * (1 - i * 0.13), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      break;
    }
  }
}

// ── LEGENDARY BODY FX — painted INSIDE the orb, over the stage body ─────────
// Clipped to the body circle; ~0.5 alpha so form escalation still reads.
export function drawSkinBodyFX(ctx: CanvasRenderingContext2D, skin: SkinDef, r: number, t: number) {
  const id = skin.id;
  if (!['galaxy', 'lava', 'midas', 'disco', 'dragon'].includes(id)) return;
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.98, 0, Math.PI * 2);
  ctx.clip();
  if (id === 'galaxy') {
    // deep-space tint + two parallax star layers + spiral wisp
    ctx.fillStyle = 'rgba(10,6,40,0.55)';
    ctx.fillRect(-r, -r, r * 2, r * 2);
    for (let layer = 0; layer < 2; layer++) {
      const n = layer ? 14 : 9;
      const spd = layer ? 2600 : 1500;
      ctx.fillStyle = layer ? 'rgba(220,230,255,0.9)' : 'rgba(255,205,255,0.8)';
      for (let i = 0; i < n; i++) {
        const a = t / spd + i * 2.399;
        const rad = ((i * 53 + layer * 29) % 88) / 100 * r;
        const tw = 0.4 + 0.6 * Math.abs(Math.sin(t / 300 + i * 1.3));
        ctx.globalAlpha = tw;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * rad, Math.sin(a) * rad, Math.max(0.8, r * (layer ? 0.018 : 0.03)), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = 'rgba(190,140,255,0.6)';
    ctx.lineWidth = Math.max(1.5, r * 0.05);
    ctx.beginPath();
    for (let k = 0; k <= 40; k++) {
      const tt = k / 40;
      const ang = t / 3000 + tt * Math.PI * 2.2;
      const rad = tt * r * 0.85;
      const px = Math.cos(ang) * rad, py = Math.sin(ang) * rad * 0.8;
      if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
  } else if (id === 'lava') {
    // cooled crust + glowing magma crack network + molten core
    ctx.fillStyle = 'rgba(24,8,8,0.6)';
    ctx.fillRect(-r, -r, r * 2, r * 2);
    const core = ctx.createRadialGradient(0, r * 0.15, 0, 0, r * 0.15, r * 0.75);
    core.addColorStop(0, 'rgba(255,140,40,0.55)');
    core.addColorStop(1, 'rgba(255,140,40,0)');
    ctx.fillStyle = core;
    ctx.fillRect(-r, -r, r * 2, r * 2);
    const pulse = 0.65 + Math.sin(t / 260) * 0.3;
    ctx.strokeStyle = `rgba(255,122,43,${pulse.toFixed(2)})`;
    ctx.lineWidth = Math.max(1.5, r * 0.045);
    ctx.lineCap = 'round';
    // deterministic jagged cracks radiating from sub-centres
    for (let c = 0; c < 4; c++) {
      const baseA = c * 1.7 + 0.4;
      let px = Math.cos(baseA) * r * 0.2, py = Math.sin(baseA) * r * 0.2;
      ctx.beginPath(); ctx.moveTo(px, py);
      for (let seg = 1; seg <= 4; seg++) {
        const ja = baseA + Math.sin(c * 7 + seg * 3.1) * 0.55;
        px += Math.cos(ja) * r * 0.22; py += Math.sin(ja) * r * 0.22;
        ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
    ctx.strokeStyle = `rgba(255,210,63,${(pulse * 0.5).toFixed(2)})`;
    ctx.lineWidth = Math.max(0.8, r * 0.018);
    for (let c = 0; c < 4; c++) {
      const baseA = c * 1.7 + 0.4;
      let px = Math.cos(baseA) * r * 0.2, py = Math.sin(baseA) * r * 0.2;
      ctx.beginPath(); ctx.moveTo(px, py);
      for (let seg = 1; seg <= 4; seg++) {
        const ja = baseA + Math.sin(c * 7 + seg * 3.1) * 0.55;
        px += Math.cos(ja) * r * 0.22; py += Math.sin(ja) * r * 0.22;
        ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
  } else if (id === 'midas') {
    // molten gold sheen + travelling specular glint band
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 0, 0, 0, r * 1.2);
    g.addColorStop(0, 'rgba(255,232,140,0.75)');
    g.addColorStop(0.55, 'rgba(230,175,45,0.55)');
    g.addColorStop(1, 'rgba(160,110,20,0.6)');
    ctx.fillStyle = g;
    ctx.fillRect(-r, -r, r * 2, r * 2);
    const gx = ((t / 1300) % 2 - 0.5) * 2 * r * 1.4;
    const glint = ctx.createLinearGradient(gx - r * 0.4, -r, gx + r * 0.4, r);
    glint.addColorStop(0, 'rgba(255,255,255,0)');
    glint.addColorStop(0.5, 'rgba(255,255,240,0.55)');
    glint.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glint;
    ctx.fillRect(-r, -r, r * 2, r * 2);
    for (let i = 0; i < 4; i++) {
      const a = t / 700 + i * 1.57;
      const tw = Math.abs(Math.sin(t / 350 + i * 2));
      ctx.globalAlpha = tw * 0.9;
      drawStar(ctx, Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.5, r * 0.07, '#FFFFFF');
    }
  } else if (id === 'disco') {
    // hue-cycling sheen + mirrorball facet grid
    const hue = (t / 30) % 360;
    ctx.fillStyle = `hsla(${hue.toFixed(0)}, 85%, 62%, 0.30)`;
    ctx.fillRect(-r, -r, r * 2, r * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.lineWidth = Math.max(0.8, r * 0.02);
    const step = r * 0.34;
    const off = (t / 40) % step;
    for (let gx2 = -r - step + off; gx2 < r + step; gx2 += step) {
      ctx.beginPath(); ctx.moveTo(gx2, -r); ctx.lineTo(gx2 + r * 0.5, r); ctx.stroke();
    }
    for (let gy2 = -r - step + off; gy2 < r + step; gy2 += step) {
      ctx.beginPath(); ctx.moveTo(-r, gy2); ctx.lineTo(r, gy2 + r * 0.3); ctx.stroke();
    }
    for (let i = 0; i < 3; i++) {
      const a = t / 500 + i * 2.1;
      const tw = Math.abs(Math.sin(t / 260 + i * 1.4));
      ctx.globalAlpha = tw;
      drawStar(ctx, Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.45, r * 0.08, '#FFFFFF');
    }
  } else if (id === 'dragon') {
    // emerald scale rows (overlapping arcs), breathing glow
    ctx.fillStyle = 'rgba(10,60,30,0.45)';
    ctx.fillRect(-r, -r, r * 2, r * 2);
    ctx.strokeStyle = 'rgba(124,255,107,0.4)';
    ctx.lineWidth = Math.max(1, r * 0.03);
    const rowH = r * 0.3;
    for (let row = -3; row <= 3; row++) {
      const y = row * rowH + ((t / 900) % rowH);
      const shift = (row % 2) * rowH * 0.75;
      for (let cx2 = -r - rowH + shift; cx2 < r + rowH; cx2 += rowH * 1.5) {
        ctx.beginPath();
        ctx.arc(cx2, y, rowH * 0.75, Math.PI * 0.15, Math.PI * 0.85);
        ctx.stroke();
      }
    }
    const breathe = 0.25 + Math.abs(Math.sin(t / 700)) * 0.25;
    const g2 = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.8);
    g2.addColorStop(0, `rgba(124,255,107,${breathe.toFixed(2)})`);
    g2.addColorStop(1, 'rgba(124,255,107,0)');
    ctx.fillStyle = g2;
    ctx.fillRect(-r, -r, r * 2, r * 2);
  }
  ctx.restore();
}

// ── FRONT (over body + face) ─────────────────────────────────────────────────
export function drawSkinFront(ctx: CanvasRenderingContext2D, skin: SkinDef, r: number, t: number, lick = 0) {
  const o = Math.max(2, r * 0.06);

  if (has(skin, 'helmet')) {
    // glass dome — semi-transparent so the face reads through
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, -r * 0.05, r * 1.12, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(180,220,255,0.22)';
    ctx.fill();
    ctx.lineWidth = o;
    ctx.strokeStyle = '#FFFFFF';
    ctx.stroke();
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.ellipse(-r * 0.4, -r * 0.5, r * 0.4, r * 0.22, -0.6, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.restore();
    // antenna
    ctx.strokeStyle = '#C9CCD6';
    ctx.lineWidth = o;
    ctx.beginPath();
    ctx.moveTo(r * 0.55, -r * 0.95);
    ctx.lineTo(r * 0.7, -r * 1.25);
    ctx.stroke();
    dot(ctx, r * 0.7, -r * 1.28, r * 0.1, '#FF3D68');
  }

  if (has(skin, 'badge')) {
    stickerCircle(ctx, -r * 0.5, r * 0.45, r * 0.2, '#FFD23F', { outline: o, shadow: false });
    dot(ctx, -r * 0.5, r * 0.45, r * 0.08, '#FF3D68');
  }

  if (has(skin, 'tricorn')) {
    sticker(ctx, (c) => {
      c.moveTo(-r * 1.05, -r * 0.7);
      c.quadraticCurveTo(0, -r * 1.5, r * 1.05, -r * 0.7);
      c.quadraticCurveTo(r * 0.5, -r * 0.55, 0, -r * 0.62);
      c.quadraticCurveTo(-r * 0.5, -r * 0.55, -r * 1.05, -r * 0.7);
      c.closePath();
    }, '#26262E', { outline: o });
    // gold trim + skull dot
    dot(ctx, 0, -r * 0.92, r * 0.12, '#FFD23F');
    dot(ctx, -r * 0.05, -r * 0.94, r * 0.05, '#26262E');
    dot(ctx, r * 0.05, -r * 0.94, r * 0.05, '#26262E');
  }

  if (has(skin, 'eyepatch')) {
    sticker(ctx, (c) => c.ellipse(r * 0.34, -r * 0.12, r * 0.28, r * 0.24, 0, 0, Math.PI * 2), '#1A1A22', { outline: o, shadow: false });
    ctx.strokeStyle = '#1A1A22';
    ctx.lineWidth = Math.max(2, r * 0.07);
    ctx.beginPath();
    ctx.moveTo(r * 0.1, -r * 0.4);
    ctx.lineTo(-r * 0.95, -r * 0.2);
    ctx.stroke();
  }

  if (has(skin, 'earring')) {
    ctx.strokeStyle = '#FFD23F';
    ctx.lineWidth = Math.max(2, r * 0.08);
    ctx.beginPath();
    ctx.arc(-r * 0.82, r * 0.35, r * 0.16, -0.4, Math.PI + 0.4);
    ctx.stroke();
  }

  if (has(skin, 'tiara')) {
    sticker(ctx, (c) => {
      c.moveTo(-r * 0.6, -r * 0.72);
      c.lineTo(-r * 0.3, -r * 1.0);
      c.lineTo(0, -r * 0.78);
      c.lineTo(r * 0.3, -r * 1.0);
      c.lineTo(r * 0.6, -r * 0.72);
      c.closePath();
    }, '#FFD23F', { outline: o });
    dot(ctx, 0, -r * 0.82, r * 0.1, '#FF6FB0');
    dot(ctx, -r * 0.3, -r * 0.78, r * 0.07, '#8ECBFF');
    dot(ctx, r * 0.3, -r * 0.78, r * 0.07, '#8ECBFF');
  }

  if (has(skin, 'headband')) {
    // band across upper face
    sticker(ctx, (c) => roundRectPath(c, -r * 1.02, -r * 0.42, r * 2.04, r * 0.3, r * 0.12), '#D6294E', { outline: o, shadow: false });
    // trailing tails (flap)
    const flap = Math.sin(t / 160) * r * 0.25;
    ctx.strokeStyle = '#D6294E';
    ctx.lineWidth = Math.max(3, r * 0.16);
    ctx.lineCap = 'round';
    for (const s of [0, 1]) {
      ctx.beginPath();
      ctx.moveTo(-r * 0.95, -r * 0.3);
      ctx.quadraticCurveTo(-r * 1.5, -r * 0.1 + flap * (s ? 1 : 0.5), -r * 1.7, r * 0.2 + flap * (s ? 1.4 : 0.8));
      ctx.stroke();
    }
    dot(ctx, -r * 0.9, -r * 0.27, r * 0.09, '#FFFFFF');
  }

  if (has(skin, 'wizardHat')) {
    const tip = Math.sin(t / 600) * r * 0.12;
    sticker(ctx, (c) => {
      c.moveTo(-r * 0.7, -r * 0.6);
      c.quadraticCurveTo(r * 0.1, -r * 1.9, r * 0.4 + tip, -r * 2.0);
      c.quadraticCurveTo(r * 0.2, -r * 1.4, r * 0.7, -r * 0.6);
      c.closePath();
    }, '#3E2A73', { outline: o });
    // brim
    sticker(ctx, (c) => c.ellipse(0, -r * 0.6, r * 0.95, r * 0.24, 0, 0, Math.PI * 2), '#5B3AA6', { outline: o, shadow: false });
    // stars
    drawStar(ctx, -r * 0.1, -r * 1.1, r * 0.14, '#FFD23F');
    drawStar(ctx, r * 0.18, -r * 1.5, r * 0.1, '#FFE79A');
    dot(ctx, r * 0.4 + tip, -r * 2.0, r * 0.09, '#FFD23F');
  }

  if (has(skin, 'beard')) {
    sticker(ctx, (c) => {
      c.moveTo(-r * 0.5, r * 0.15);
      c.quadraticCurveTo(-r * 0.3, r * 1.2, 0, r * 1.05);
      c.quadraticCurveTo(r * 0.3, r * 1.2, r * 0.5, r * 0.15);
      c.quadraticCurveTo(0, r * 0.5, -r * 0.5, r * 0.15);
      c.closePath();
    }, '#EFEFF5', { outline: o });
  }

  if (has(skin, 'catEars')) {
    for (const s of [-1, 1]) {
      sticker(ctx, (c) => {
        c.moveTo(s * r * 0.35, -r * 0.75);
        c.lineTo(s * r * 0.7, -r * 1.25);
        c.lineTo(s * r * 0.85, -r * 0.65);
        c.closePath();
      }, skin.bodyColor, { outline: o });
      sticker(ctx, (c) => {
        c.moveTo(s * r * 0.5, -r * 0.78);
        c.lineTo(s * r * 0.68, -r * 1.1);
        c.lineTo(s * r * 0.78, -r * 0.72);
        c.closePath();
      }, '#FF9BC4', { outline: 0, shadow: false });
    }
  }

  if (has(skin, 'catMouth')) {
    ctx.strokeStyle = '#5A2E1A';
    ctx.lineWidth = Math.max(1.5, r * 0.05);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, r * 0.38);
    ctx.arc(-r * 0.1, r * 0.38, r * 0.1, 0, Math.PI);
    ctx.arc(r * 0.1, r * 0.38, r * 0.1, 0, Math.PI);
    ctx.stroke();
  }

  if (has(skin, 'whiskers')) {
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = Math.max(1.4, r * 0.045);
    ctx.lineCap = 'round';
    for (const s of [-1, 1]) {
      for (const dy of [-0.05, 0.08, 0.2]) {
        ctx.beginPath();
        ctx.moveTo(s * r * 0.3, r * 0.3 + dy * r);
        ctx.lineTo(s * r * 0.95, r * 0.28 + dy * r * 1.4);
        ctx.stroke();
      }
    }
  }

  if (has(skin, 'horns')) {
    for (const s of [-1, 1]) {
      sticker(ctx, (c) => {
        c.moveTo(s * r * 0.4, -r * 0.72);
        c.quadraticCurveTo(s * r * 0.95, -r * 0.95, s * r * 0.78, -r * 1.35);
        c.quadraticCurveTo(s * r * 0.55, -r * 1.0, s * r * 0.62, -r * 0.68);
        c.closePath();
      }, '#B01E1E', { outline: o });
    }
  }

  if (has(skin, 'devilBrow')) {
    ctx.strokeStyle = '#5A0E0E';
    ctx.lineWidth = Math.max(2.4, r * 0.09);
    ctx.lineCap = 'round';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(s * r * 0.12, -r * 0.42);
      ctx.lineTo(s * r * 0.48, -r * 0.28);
      ctx.stroke();
    }
  }

  // v8 §8: premium front glints/particles (over the face)
  if (skin.id === 'midas') {
    const spots = [[-r * 0.5, -r * 0.3], [r * 0.45, r * 0.1], [r * 0.1, -r * 0.55]];
    for (let i = 0; i < spots.length; i++) {
      const tw = (Math.sin(t / 240 + i * 2.1) + 1) * 0.5;
      if (tw > 0.55) drawStar(ctx, spots[i][0], spots[i][1], r * 0.12 * tw, '#FFF6C0');
    }
  }
  if (skin.id === 'lava') {
    ctx.save();
    for (let i = 0; i < 6; i++) {
      const p = ((t / 950) + i / 6) % 1;
      const ex = Math.sin(i * 3.1 + t / 420) * r * 0.6;
      const ey = r * 0.5 - p * r * 1.9;
      ctx.globalAlpha = (1 - p) * 0.85;
      ctx.fillStyle = i % 2 ? '#FFB03A' : '#FF5A1E';
      ctx.beginPath(); ctx.arc(ex, ey, r * 0.075 * (1 - p * 0.5), 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
  if (skin.id === 'disco') {
    // rotating rainbow light dots cast around the body + specular twinkles
    const cols = ['#FF4D6D', '#4DD2FF', '#FFE04D', '#7A5CFF', '#4DFF9E', '#FF8AD8'];
    for (let i = 0; i < 6; i++) {
      const a = t / 700 + (i / 6) * Math.PI * 2;
      const d = r * (1.25 + Math.sin(t / 400 + i) * 0.1);
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = cols[i];
      ctx.beginPath(); ctx.arc(Math.cos(a) * d, Math.sin(a) * d * 0.7, r * 0.12, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    for (let i = 0; i < 3; i++) {
      const tw = (Math.sin(t / 200 + i * 2.4) + 1) * 0.5;
      if (tw > 0.6) drawStar(ctx, (i - 1) * r * 0.55, -r * 0.5 + i * r * 0.25, r * 0.1 * tw, '#FFFFFF');
    }
  }

  // v9 §6: GALAXY — an orbiting comet with a fading tail sweeping around the body
  if (skin.id === 'galaxy') {
    const a = t / 900;
    const d = r * 1.25;
    const hx = Math.cos(a) * d, hy = Math.sin(a) * d * 0.75;
    ctx.save();
    // tail
    for (let k = 0; k < 6; k++) {
      const ta = a - k * 0.12;
      const tx = Math.cos(ta) * d, ty = Math.sin(ta) * d * 0.75;
      ctx.globalAlpha = (1 - k / 6) * 0.5;
      ctx.fillStyle = '#CDBBFF';
      ctx.beginPath(); ctx.arc(tx, ty, r * (0.09 - k * 0.012), 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.arc(hx, hy, r * 0.1, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // v9 §6: DRAGON — curved horns, a dorsal spine ridge, lazy smoke, flame on TRIPLE
  if (skin.id === 'dragon') {
    // horns
    for (const s of [-1, 1]) {
      sticker(ctx, (c) => {
        c.moveTo(s * r * 0.42, -r * 0.7);
        c.quadraticCurveTo(s * r * 1.0, -r * 1.0, s * r * 0.7, -r * 1.45);
        c.quadraticCurveTo(s * r * 0.5, -r * 1.05, s * r * 0.6, -r * 0.66);
        c.closePath();
      }, '#E8D8B0', { outline: o });
    }
    // dorsal spine ridge — 4 triangular plates down the back
    for (let i = 0; i < 4; i++) {
      const yy = -r * 0.5 + i * r * 0.36;
      sticker(ctx, (c) => {
        c.moveTo(-r * 0.98, yy);
        c.lineTo(-r * 1.3, yy - r * 0.12);
        c.lineTo(-r * 0.98, yy + r * 0.16);
        c.closePath();
      }, '#0E7A3C', { outline: 1, shadow: false });
    }
    // lazy smoke puff cycling ~every 3s from above
    const sm = (t % 3000) / 3000;
    ctx.save();
    ctx.globalAlpha = (1 - sm) * 0.5;
    ctx.fillStyle = '#9AA6B0';
    const sy = -r * 0.9 - sm * r * 1.2;
    ctx.beginPath(); ctx.arc(r * 0.2 + Math.sin(sm * 6) * r * 0.15, sy, r * 0.16 * (0.6 + sm), 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // flame breath on TRIPLE (driven by the tongue-lick timer)
    if (lick > 0.02) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, lick);
      for (let i = 0; i < 4; i++) {
        const fy = r * 0.4 + i * r * 0.3;
        const flick = Math.sin(t / 90 + i) * r * 0.08;
        ctx.fillStyle = i % 2 ? '#FFD23F' : '#FF6A00';
        ctx.beginPath();
        ctx.moveTo(-r * 0.12, fy);
        ctx.quadraticCurveTo(r * 0.15 + flick, fy + r * 0.2, 0, fy + r * 0.45);
        ctx.quadraticCurveTo(-r * 0.15 + flick, fy + r * 0.2, -r * 0.12, fy);
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
  }
}

// ── BODY SURFACE (over the flat body sprite, clipped to the orb) ──────────────
// v8 §8: premium skins get living, powerful surfaces — nebulae, molten crust,
// gold sheen, disco facets — all animated so they read in shop cards, the preview
// modal, in-game, and on rival bots (every path renders through drawVoidling).
export function drawSkinBody(ctx: CanvasRenderingContext2D, skin: SkinDef, r: number, t: number) {
  switch (skin.id) {
    case 'galaxy': return galaxyBody(ctx, r, t);
    case 'lava': return lavaBody(ctx, r, t);
    case 'midas': return midasBody(ctx, r, t);
    case 'disco': return discoBody(ctx, r, t);
    case 'dragon': return dragonBody(ctx, r, t);
    case 'ghost': return ghostBody(ctx, r, t);
    case 'devil': return devilBody(ctx, r);
  }
}

function clipBody(ctx: CanvasRenderingContext2D, r: number) {
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.clip();
}

// inner rim light stroke, clipped inside the body
function rimLight(ctx: CanvasRenderingContext2D, r: number, color: string, w = 0.06) {
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1.5, r * w);
  ctx.beginPath(); ctx.arc(0, 0, r - ctx.lineWidth / 2, 0, Math.PI * 2); ctx.stroke();
}

// v9 §6: GALAXY — deep base, two drifting nebula blobs, 8 twinkling stars, rim light.
function galaxyBody(ctx: CanvasRenderingContext2D, r: number, t: number) {
  ctx.save();
  clipBody(ctx, r);
  // layer 1: deep base
  ctx.fillStyle = '#0D0821';
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
  // layer 2: two nebula blobs at 40% opacity, drifting
  const blobs: [string, number][] = [['#FF3CAC', t / 3000], ['#2BD2FF', t / 3000 + Math.PI]];
  for (const [col, ph] of blobs) {
    const bx = Math.cos(ph) * r * 0.34, by = Math.sin(ph * 1.2) * r * 0.3;
    const grad = ctx.createRadialGradient(bx, by, 0, bx, by, r * 0.85);
    grad.addColorStop(0, hexA40(col));
    grad.addColorStop(1, col + '00');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(bx, by, r * 0.85, 0, Math.PI * 2); ctx.fill();
  }
  // layer 3: 8 white 1–2px stars twinkling
  for (let i = 0; i < 8; i++) {
    const sa = i * 2.39917, sr = ((i * 41) % 100) / 100 * r * 0.85;
    const sx = Math.cos(sa) * sr, sy = Math.sin(sa * 1.3) * sr;
    const tw = (Math.sin(t / 280 + i) + 1) * 0.5;
    ctx.globalAlpha = 0.3 + tw * 0.7;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.arc(sx, sy, 1 + tw, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  rimLight(ctx, r, '#B98CFF');
  ctx.restore();
}

// v9 §6: LAVA — near-black base, orange crack network with hot yellow cores, pulsing.
function lavaBody(ctx: CanvasRenderingContext2D, r: number, t: number) {
  ctx.save();
  clipBody(ctx, r);
  ctx.fillStyle = '#14090A';
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
  const pulse = 0.5 + Math.sin(t / 750) * 0.5; // ~1.5s cycle
  // crack network — outer #FF4D00 with #FFC300 cores
  ctx.lineCap = 'round';
  for (let pass = 0; pass < 2; pass++) {
    ctx.strokeStyle = pass === 0 ? '#FF4D00' : '#FFC300';
    ctx.lineWidth = pass === 0 ? Math.max(2.4, r * 0.09) : Math.max(1, r * 0.035);
    ctx.globalAlpha = pass === 0 ? 0.6 + pulse * 0.4 : 0.7 + pulse * 0.3;
    for (let v = 0; v < 3; v++) {
      ctx.beginPath();
      let px = -r * 0.8, py = (v - 1) * r * 0.42;
      ctx.moveTo(px, py);
      for (let k = 1; k <= 5; k++) {
        px += r * 0.36;
        py += Math.sin(t / 900 + v * 2.1 + k) * r * 0.16;
        ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
  }
  ctx.restore();
}

// v9 §6: KING MIDAS — metallic gold, bottom shade, diagonal sheen band sweeping every 2s.
function midasBody(ctx: CanvasRenderingContext2D, r: number, t: number) {
  ctx.save();
  clipBody(ctx, r);
  // base + bottom shade
  const bg = ctx.createLinearGradient(0, -r, 0, r);
  bg.addColorStop(0, '#FFD447');
  bg.addColorStop(1, '#C9971C');
  ctx.fillStyle = bg;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
  // diagonal sheen band sweeping every 2s
  const cx = (((t / 2000) % 1) * 2 - 1) * r * 1.6;
  ctx.save();
  ctx.translate(cx, 0);
  ctx.rotate(-0.5);
  const g = ctx.createLinearGradient(-r * 0.4, 0, r * 0.4, 0);
  g.addColorStop(0, 'rgba(255,243,196,0)');
  g.addColorStop(0.5, 'rgba(255,243,196,0.85)');
  g.addColorStop(1, 'rgba(255,243,196,0)');
  ctx.fillStyle = g;
  ctx.fillRect(-r * 0.4, -r * 1.6, r * 0.8, r * 3.2);
  ctx.restore();
  ctx.restore();
}

// v9 §6: DISCO — facet grid of alternating tiles with specular flashes.
function discoBody(ctx: CanvasRenderingContext2D, r: number, t: number) {
  ctx.save();
  clipBody(ctx, r);
  const step = r * 0.4;
  let row = 0;
  for (let gy = -r; gy < r; gy += step, row++) {
    let col = 0;
    for (let gx = -r; gx < r; gx += step, col++) {
      ctx.fillStyle = (row + col) % 2 ? '#52527A' : '#3A3A55';
      ctx.fillRect(gx, gy, step + 1, step + 1);
    }
  }
  // 2–3 specular flashes per second on random facets
  for (let i = 0; i < 3; i++) {
    const seed = Math.floor(t / 330) + i * 7;
    const fx = (((seed * 53) % 100) / 100 - 0.5) * 2 * r * 0.7;
    const fy = (((seed * 97) % 100) / 100 - 0.5) * 2 * r * 0.7;
    const life = (t % 330) / 330;
    ctx.globalAlpha = (1 - life) * 0.9;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(fx, fy, step * 0.5, step * 0.5);
  }
  ctx.restore();
}

// v9 §6: DRAGON — green scale rows (3 arcs of overlapping semicircles) + spine ridges.
function dragonBody(ctx: CanvasRenderingContext2D, r: number, t: number) {
  ctx.save();
  clipBody(ctx, r);
  // base gradient body
  const bg = ctx.createLinearGradient(0, -r, 0, r);
  bg.addColorStop(0, '#1DB954');
  bg.addColorStop(1, '#0E7A3C');
  ctx.fillStyle = bg;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
  // 3 rows of overlapping scale semicircles
  ctx.strokeStyle = 'rgba(9,60,30,0.7)';
  ctx.lineWidth = Math.max(1, r * 0.02);
  const sc = r * 0.24;
  for (let rowI = 0; rowI < 3; rowI++) {
    const yy = -r * 0.35 + rowI * sc * 1.1;
    const off = rowI % 2 ? sc * 0.5 : 0;
    for (let xx = -r - off; xx < r; xx += sc) {
      ctx.fillStyle = rowI % 2 ? '#19A94B' : '#17A247';
      ctx.beginPath();
      ctx.arc(xx + off, yy, sc * 0.55, Math.PI, 0);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
    }
  }
  ctx.restore();
}

// v9 §6: GHOST — pale ethereal body with a soft flicker + cyan rim.
function ghostBody(ctx: CanvasRenderingContext2D, r: number, t: number) {
  ctx.save();
  clipBody(ctx, r);
  // 20%-opacity phase flicker roughly every ~5s
  const flick = (t % 5000) < 180 ? 0.55 : 1;
  ctx.globalAlpha = 0.35 * flick;
  ctx.fillStyle = '#EAF2FF';
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
  // wavering inner highlight
  ctx.globalAlpha = 0.4;
  const wob = Math.sin(t / 320) * r * 0.08;
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath(); ctx.ellipse(-r * 0.25, -r * 0.25 + wob, r * 0.4, r * 0.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
  rimLight(ctx, r, '#7FDBFF');
  ctx.restore();
}

// v9 §6: DEVIL — true red with darker bottom shade (was reading brown).
function devilBody(ctx: CanvasRenderingContext2D, r: number) {
  ctx.save();
  clipBody(ctx, r);
  const g = ctx.createLinearGradient(0, -r * 0.3, 0, r);
  g.addColorStop(0, 'rgba(230,57,70,0)');
  g.addColorStop(1, '#B02A35');
  ctx.fillStyle = g;
  ctx.fillRect(-r, -r, r * 2, r * 2);
  ctx.restore();
}

function hexA40(hex: string): string {
  // 40% opacity rgba from a #RRGGBB color
  const h = hex.replace('#', '');
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},0.4)`;
}

function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = fill;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    const a2 = a + Math.PI / 5;
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    ctx.lineTo(Math.cos(a2) * r * 0.45, Math.sin(a2) * r * 0.45);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// Exposed for shop preview sparkle / share card if needed
export { drawStar };
