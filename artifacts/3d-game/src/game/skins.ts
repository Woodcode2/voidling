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

// ── FRONT (over body + face) ─────────────────────────────────────────────────
export function drawSkinFront(ctx: CanvasRenderingContext2D, skin: SkinDef, r: number, t: number) {
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
    for (let i = 0; i < 3; i++) {
      const tw = (Math.sin(t / 200 + i * 2.4) + 1) * 0.5;
      if (tw > 0.6) drawStar(ctx, (i - 1) * r * 0.55, -r * 0.5 + i * r * 0.25, r * 0.1 * tw, '#FFFFFF');
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
  }
}

function clipBody(ctx: CanvasRenderingContext2D, r: number) {
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.clip();
}

function galaxyBody(ctx: CanvasRenderingContext2D, r: number, t: number) {
  ctx.save();
  clipBody(ctx, r);
  const rot = t / 3400;
  for (let i = 0; i < 4; i++) {
    const a = rot + (i / 4) * Math.PI * 2;
    const bx = Math.cos(a) * r * 0.38, by = Math.sin(a) * r * 0.38;
    const col = i % 2 ? '138,107,255' : '255,90,190';
    const grad = ctx.createRadialGradient(bx, by, 0, bx, by, r * 0.95);
    grad.addColorStop(0, `rgba(${col},0.55)`);
    grad.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(bx, by, r * 0.95, 0, Math.PI * 2); ctx.fill();
  }
  for (let i = 0; i < 11; i++) {
    const sa = i * 2.39917, sr = ((i * 37) % 100) / 100 * r * 0.88;
    const sx = Math.cos(sa) * sr, sy = Math.sin(sa * 1.3) * sr;
    const tw = (Math.sin(t / 300 + i) + 1) * 0.5;
    ctx.globalAlpha = 0.35 + tw * 0.6;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.arc(sx, sy, r * 0.028 + tw * r * 0.015, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function lavaBody(ctx: CanvasRenderingContext2D, r: number, t: number) {
  ctx.save();
  clipBody(ctx, r);
  const pulse = 0.5 + Math.sin(t / 380) * 0.5;
  // hot pool glowing up from the bottom
  const g = ctx.createLinearGradient(0, -r * 0.2, 0, r);
  g.addColorStop(0, 'rgba(255,120,20,0)');
  g.addColorStop(1, `rgba(255,90,10,${0.35 + pulse * 0.35})`);
  ctx.fillStyle = g;
  ctx.fillRect(-r, -r, r * 2, r * 2);
  // molten cracks
  ctx.strokeStyle = `rgba(255,${110 + pulse * 90 | 0},40,0.85)`;
  ctx.lineWidth = Math.max(2, r * 0.07);
  ctx.lineCap = 'round';
  for (let v = 0; v < 3; v++) {
    ctx.beginPath();
    let px = -r * 0.75, py = (v - 1) * r * 0.42;
    ctx.moveTo(px, py);
    for (let k = 1; k <= 5; k++) {
      px += r * 0.34;
      py += Math.sin(t / 480 + v * 2.1 + k) * r * 0.16;
      ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function midasBody(ctx: CanvasRenderingContext2D, r: number, t: number) {
  ctx.save();
  clipBody(ctx, r);
  // diagonal sheen sweeping across the gold
  const cx = (((t / 1500) % 1) * 2 - 1) * r * 1.6;
  ctx.translate(cx, 0);
  ctx.rotate(-0.5);
  const g = ctx.createLinearGradient(-r * 0.4, 0, r * 0.4, 0);
  g.addColorStop(0, 'rgba(255,240,180,0)');
  g.addColorStop(0.5, 'rgba(255,250,215,0.8)');
  g.addColorStop(1, 'rgba(255,240,180,0)');
  ctx.fillStyle = g;
  ctx.fillRect(-r * 0.4, -r * 1.6, r * 0.8, r * 3.2);
  ctx.restore();
}

function discoBody(ctx: CanvasRenderingContext2D, r: number, t: number) {
  ctx.save();
  clipBody(ctx, r);
  // rotating colored light patches
  const cols = ['#FF4D6D', '#4DD2FF', '#FFE04D', '#7A5CFF', '#4DFF9E'];
  ctx.globalAlpha = 0.5;
  for (let i = 0; i < 5; i++) {
    const a = t / 620 + (i / 5) * Math.PI * 2;
    const bx = Math.cos(a) * r * 0.48, by = Math.sin(a) * r * 0.48;
    ctx.fillStyle = cols[i];
    ctx.beginPath(); ctx.arc(bx, by, r * 0.3, 0, Math.PI * 2); ctx.fill();
  }
  // mirror-ball facet grid
  ctx.globalAlpha = 1;
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = Math.max(1, r * 0.02);
  const step = r * 0.34;
  for (let gx = -r; gx <= r; gx += step) { ctx.beginPath(); ctx.moveTo(gx, -r); ctx.lineTo(gx, r); ctx.stroke(); }
  for (let gy = -r; gy <= r; gy += step) { ctx.beginPath(); ctx.moveTo(-r, gy); ctx.lineTo(r, gy); ctx.stroke(); }
  ctx.restore();
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
