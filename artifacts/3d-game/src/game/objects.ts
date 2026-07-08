// Real toy-park objects, drawn in the "Electric Pop" sticker style.
// Every function draws centered at the origin (0,0), sized to fit within radius r.
// The same functions are reused at tiny scale as orbit icons.
import type { ObjectKind } from './config';
import { sticker, stickerCircle, stickerEllipse, highlight, dot, roundRectPath, silhouette } from './draw';

// outline width scales down for tiny icons so small objects don't turn into blobs
function ow(r: number) {
  return Math.max(1.3, Math.min(3, r * 0.16));
}

// deterministic palette pick
// v8 §4: one global wind oscillator (~6s period, −1..1) so the whole world
// breathes together — every organic sway reads from this same value.
// Prompt 7 Stage 1: scenery must not move on its own. wind() previously drove an
// ambient sway on trees/bushes/flowers/flowerpots/palms/umbrellas (procedural
// fallback path) and on grass tufts (world.ts) — all scenery. It now returns 0 so
// none of that oscillates; the only motion a structure ever has is the swallow
// animation while it is being eaten.
export function wind(_t: number) { return 0; }

function pick<T>(arr: T[], variant: number) {
  return arr[Math.abs(variant) % arr.length];
}

// ── T1 ───────────────────────────────────────────────────────────────────────
function drawApple(ctx: CanvasRenderingContext2D, r: number, _t: number) {
  const o = ow(r);
  const br = r * 0.86;
  // stem
  ctx.strokeStyle = '#7A4A2B';
  ctx.lineWidth = Math.max(1.4, r * 0.1);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, -br * 0.7);
  ctx.quadraticCurveTo(r * 0.12, -br * 1.15, r * 0.02, -br * 1.25);
  ctx.stroke();
  // leaf
  sticker(ctx, (c) => c.ellipse(r * 0.34, -br * 0.95, r * 0.3, r * 0.16, -0.5, 0, Math.PI * 2), '#5BD98A', { outline: o });
  // body (two lobes for an apple silhouette)
  sticker(ctx, (c) => {
    c.arc(-br * 0.34, 0, br * 0.72, 0, Math.PI * 2);
    c.arc(br * 0.34, 0, br * 0.72, 0, Math.PI * 2);
  }, '#EF4B4B', { outline: o });
  highlight(ctx, -br * 0.32, -br * 0.3, br * 0.5, 0.4);
}

function drawFlower(ctx: CanvasRenderingContext2D, r: number, t: number, variant = 0) {
  const o = ow(r);
  const petal = pick(['#FF6FB0', '#FFD23F', '#8ECBFF', '#FF8A5C', '#C9A6FF'], variant);
  const sway = 0; // Prompt 7 Stage 1: flowers are scenery — no wind lean / bob
  ctx.save();
  ctx.rotate(sway);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const px = Math.cos(a) * r * 0.52;
    const py = Math.sin(a) * r * 0.52;
    sticker(ctx, (c) => c.ellipse(px, py, r * 0.42, r * 0.28, a, 0, Math.PI * 2), petal, { outline: o });
  }
  stickerCircle(ctx, 0, 0, r * 0.34, '#FFD23F', { outline: o });
  dot(ctx, 0, 0, r * 0.16, '#F59E0B');
  ctx.restore();
}

function drawMushroom(ctx: CanvasRenderingContext2D, r: number, _t: number) {
  const o = ow(r);
  // stem
  sticker(ctx, (c) => roundRectPath(c, -r * 0.28, -r * 0.1, r * 0.56, r * 0.85, r * 0.22), '#FBEFD6', { outline: o });
  // cap
  sticker(ctx, (c) => {
    c.moveTo(-r * 0.92, r * 0.02);
    c.quadraticCurveTo(0, -r * 1.05, r * 0.92, r * 0.02);
    c.closePath();
  }, '#EF4B4B', { outline: o });
  // spots
  dot(ctx, -r * 0.34, -r * 0.28, r * 0.14, '#FFFFFF');
  dot(ctx, r * 0.28, -r * 0.22, r * 0.11, '#FFFFFF');
  dot(ctx, r * 0.02, -r * 0.5, r * 0.1, '#FFFFFF');
}

// ── T2 ───────────────────────────────────────────────────────────────────────
function drawDuck(ctx: CanvasRenderingContext2D, r: number, t: number, fleeing = false) {
  const o = ow(r);
  const bob = Math.sin(t / 300) * r * 0.05;
  ctx.save();
  ctx.translate(0, bob);
  // body
  stickerEllipse(ctx, r * 0.05, r * 0.2, r * 0.78, r * 0.6, '#FFD23F', 0, { outline: o });
  // tail
  sticker(ctx, (c) => {
    c.moveTo(-r * 0.65, r * 0.1);
    c.lineTo(-r * 0.98, -r * 0.15);
    c.lineTo(-r * 0.6, r * 0.32);
    c.closePath();
  }, '#FFC61A', { outline: o });
  // head
  stickerCircle(ctx, r * 0.62, -r * 0.3, r * 0.4, '#FFD23F', { outline: o });
  // beak
  sticker(ctx, (c) => {
    c.moveTo(r * 0.9, -r * 0.34);
    c.lineTo(r * 1.28, -r * 0.24);
    c.lineTo(r * 0.9, -r * 0.14);
    c.closePath();
  }, '#FF8A1C', { outline: o });
  // eye
  const eyeR = fleeing ? r * 0.13 : r * 0.09;
  dot(ctx, r * 0.68, -r * 0.36, eyeR, '#1A0B33');
  highlight(ctx, r * 0.0, -r * 0.05, r * 0.5, 0.28);
  ctx.restore();
}

function drawDog(ctx: CanvasRenderingContext2D, r: number, t: number, fleeing = false) {
  const o = ow(r);
  const wag = Math.sin(t / 160) * 0.5;
  const body = '#B07A46';
  const dark = '#8A5C30';
  // tail
  ctx.save();
  ctx.translate(-r * 0.62, -r * 0.1);
  ctx.rotate(wag);
  sticker(ctx, (c) => roundRectPath(c, -r * 0.12, -r * 0.6, r * 0.24, r * 0.6, r * 0.12), body, { outline: o });
  ctx.restore();
  // v8 §4: trot cycle — legs swing fore/aft in opposite phase
  const trot = Math.sin(t / (fleeing ? 90 : 150)) * r * 0.16;
  for (const l of [{ x: -0.4, s: trot }, { x: 0.35, s: -trot }]) {
    sticker(ctx, (c) => roundRectPath(c, r * l.x + l.s, r * 0.35, r * 0.22, r * 0.5, r * 0.08), dark, { outline: o, shadow: false });
  }
  // body
  stickerEllipse(ctx, -r * 0.05, r * 0.1, r * 0.7, r * 0.52, body, 0, { outline: o });
  // head
  stickerCircle(ctx, r * 0.55, -r * 0.25, r * 0.46, body, { outline: o });
  // ears
  sticker(ctx, (c) => c.ellipse(r * 0.3, -r * 0.45, r * 0.18, r * 0.34, 0.4, 0, Math.PI * 2), dark, { outline: o, shadow: false });
  sticker(ctx, (c) => c.ellipse(r * 0.82, -r * 0.42, r * 0.16, r * 0.3, -0.3, 0, Math.PI * 2), dark, { outline: o, shadow: false });
  // snout + nose
  stickerEllipse(ctx, r * 0.78, -r * 0.12, r * 0.26, r * 0.2, '#E8CBA0', 0, { outline: o, shadow: false });
  dot(ctx, r * 0.92, -r * 0.16, r * 0.1, '#2A1A0E');
  // eye
  dot(ctx, r * 0.5, -r * 0.34, fleeing ? r * 0.13 : r * 0.09, '#2A1A0E');
}

// ── T3 ───────────────────────────────────────────────────────────────────────
function drawPerson(ctx: CanvasRenderingContext2D, r: number, t: number, variant = 0, fleeing = false) {
  const o = ow(r);
  const shirt = pick(['#FF3D68', '#2D9CDB', '#33C46B', '#FF9F1C', '#9B5DE5'], variant);
  const skin = pick(['#F4C79B', '#E0A876', '#C98A5B', '#FBD9B8'], variant + 1);
  const hair = pick(['#3A2A1E', '#1A1A22', '#7A4A2B', '#E8C15A'], variant + 2);
  const leg = '#3B4A63';
  // v8 §4: real walk cycle — alternating legs, opposite arm swing, 2px vertical bob
  const ph = t / (fleeing ? 120 : 320);
  const stride = Math.sin(ph) * r * 0.2;           // fwd/back leg offset
  const armA = -stride * 0.9;                        // arms swing opposite the legs
  const bob = Math.abs(Math.sin(ph)) * r * 0.09;    // ~2px vertical bounce
  ctx.save();
  ctx.translate(0, -bob);
  // back arm (behind body, drawn first)
  sticker(ctx, (c) => roundRectPath(c, -r * 0.52 + armA, -r * 0.3, r * 0.16, r * 0.5, r * 0.07), skin, { outline: o, shadow: false });
  // legs (one forward, one back)
  sticker(ctx, (c) => roundRectPath(c, -r * 0.26 + stride, r * 0.25, r * 0.2, r * 0.6, r * 0.08), leg, { outline: o });
  sticker(ctx, (c) => roundRectPath(c, r * 0.06 - stride, r * 0.25, r * 0.2, r * 0.6, r * 0.08), leg, { outline: o, shadow: false });
  // body
  sticker(ctx, (c) => roundRectPath(c, -r * 0.4, -r * 0.35, r * 0.8, r * 0.72, r * 0.2), shirt, { outline: o });
  // front arm (over body)
  sticker(ctx, (c) => roundRectPath(c, r * 0.36 - armA, -r * 0.3, r * 0.16, r * 0.5, r * 0.07), skin, { outline: o, shadow: false });
  // head
  stickerCircle(ctx, 0, -r * 0.62, r * 0.34, skin, { outline: o });
  // hair cap
  sticker(ctx, (c) => {
    c.arc(0, -r * 0.62, r * 0.36, Math.PI, 0);
    c.closePath();
  }, hair, { outline: o, shadow: false });
  // eyes
  const ey = -r * 0.6;
  dot(ctx, -r * 0.11, ey, fleeing ? r * 0.07 : r * 0.05, '#1A0B33');
  dot(ctx, r * 0.11, ey, fleeing ? r * 0.07 : r * 0.05, '#1A0B33');
  ctx.restore();
}

function drawBench(ctx: CanvasRenderingContext2D, r: number, _t: number) {
  const o = ow(r);
  const wood = '#C77B3C';
  const woodDark = '#A15E28';
  // legs
  sticker(ctx, (c) => roundRectPath(c, -r * 0.7, r * 0.1, r * 0.16, r * 0.7, r * 0.05), woodDark, { outline: o });
  sticker(ctx, (c) => roundRectPath(c, r * 0.54, r * 0.1, r * 0.16, r * 0.7, r * 0.05), woodDark, { outline: o, shadow: false });
  // seat
  sticker(ctx, (c) => roundRectPath(c, -r * 0.92, r * 0.02, r * 1.84, r * 0.22, r * 0.1), wood, { outline: o });
  // backrest slats
  for (let i = 0; i < 2; i++) {
    sticker(ctx, (c) => roundRectPath(c, -r * 0.86, -r * 0.55 + i * r * 0.3, r * 1.72, r * 0.2, r * 0.1), wood, { outline: o, shadow: false });
  }
}

function drawBush(ctx: CanvasRenderingContext2D, r: number, t: number) {
  const sway = wind(t) * r * 0.05; // v8 §4 wind
  const g = '#2FA55A';
  // v5 §6: unified silhouette — no white seams between the three lobes
  silhouette(ctx, [
    { path: (c) => c.arc(-r * 0.5 + sway, r * 0.1, r * 0.52, 0, Math.PI * 2), fill: g },
    { path: (c) => c.arc(r * 0.5 + sway, r * 0.1, r * 0.52, 0, Math.PI * 2), fill: g },
    { path: (c) => c.arc(0 + sway, -r * 0.3, r * 0.6, 0, Math.PI * 2), fill: g },
  ], { expand: ow(r) + 1 });
  highlight(ctx, -r * 0.25 + sway, -r * 0.35, r * 0.5, 0.25);
  dot(ctx, r * 0.1 + sway, 0, r * 0.1, '#FF6FB0');
  dot(ctx, -r * 0.35 + sway, r * 0.18, r * 0.09, '#FFD23F');
}

// ── T4 ───────────────────────────────────────────────────────────────────────
function drawCar(ctx: CanvasRenderingContext2D, r: number, t: number, variant = 0) {
  const o = ow(r);
  const body = pick(['#FF3D68', '#2D9CDB', '#FFD23F', '#9B5DE5', '#33C46B'], variant);
  const roll = t / 400;
  // v8 §4: 1px suspension bob + puff of exhaust every ~2s
  const bob = Math.sin(t / 220) * r * 0.03;
  const puff = ((t % 2000) / 2000);
  if (puff < 0.35) {
    ctx.save();
    ctx.globalAlpha = (0.35 - puff) * 0.8;
    ctx.fillStyle = '#B9BCC6';
    ctx.beginPath();
    ctx.arc(-r * 0.95 - puff * r * 0.6, r * 0.28, r * 0.12 + puff * r * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.translate(0, bob);
  // wheels — rim notch makes rotation clearly visible
  for (const wx of [-0.52, 0.52]) {
    stickerCircle(ctx, r * wx, r * 0.42, r * 0.24, '#22222C', { outline: o });
    ctx.save();
    ctx.translate(r * wx, r * 0.42);
    ctx.rotate(roll);
    dot(ctx, 0, 0, r * 0.1, '#C9CCD6');
    ctx.fillStyle = '#5A5E6B';
    ctx.fillRect(-r * 0.03, -r * 0.2, r * 0.06, r * 0.2); // notch spoke
    ctx.restore();
  }
  // body lower
  sticker(ctx, (c) => roundRectPath(c, -r * 0.9, -r * 0.1, r * 1.8, r * 0.6, r * 0.22), body, { outline: o });
  // cabin
  sticker(ctx, (c) => {
    c.moveTo(-r * 0.5, -r * 0.08);
    c.lineTo(-r * 0.32, -r * 0.55);
    c.lineTo(r * 0.4, -r * 0.55);
    c.lineTo(r * 0.58, -r * 0.08);
    c.closePath();
  }, body, { outline: o, shadow: false });
  // window
  sticker(ctx, (c) => {
    c.moveTo(-r * 0.32, -r * 0.12);
    c.lineTo(-r * 0.2, -r * 0.46);
    c.lineTo(r * 0.34, -r * 0.46);
    c.lineTo(r * 0.44, -r * 0.12);
    c.closePath();
  }, '#BFEAFF', { outline: o, shadow: false });
  // headlight
  dot(ctx, r * 0.82, r * 0.08, r * 0.09, '#FFF3B0');
}

function drawTree(ctx: CanvasRenderingContext2D, r: number, t: number) {
  const sway = 0; // Prompt 7 Stage 1: trees are scenery — no wind sway / bob
  const green = '#33B463';
  // v5 §6: trunk + canopy share ONE silhouette (drawn back-to-front for fills)
  silhouette(ctx, [
    { path: (c) => roundRectPath(c, -r * 0.16, r * 0.05, r * 0.32, r * 0.8, r * 0.08), fill: '#8A5A2E' },
    { path: (c) => c.arc(-r * 0.42 + sway, -r * 0.15, r * 0.5, 0, Math.PI * 2), fill: green },
    { path: (c) => c.arc(r * 0.42 + sway, -r * 0.15, r * 0.5, 0, Math.PI * 2), fill: green },
    { path: (c) => c.arc(0 + sway, -r * 0.55, r * 0.56, 0, Math.PI * 2), fill: green },
    { path: (c) => c.arc(0 + sway, -r * 0.1, r * 0.5, 0, Math.PI * 2), fill: green },
  ], { expand: ow(r) + 1 });
  // details on the canopy
  ctx.save();
  ctx.translate(sway, 0);
  highlight(ctx, -r * 0.2, -r * 0.5, r * 0.5, 0.22);
  dot(ctx, r * 0.3, -r * 0.1, r * 0.09, '#EF4B4B');
  dot(ctx, -r * 0.3, -r * 0.35, r * 0.09, '#EF4B4B');
  ctx.restore();
}

function drawFountain(ctx: CanvasRenderingContext2D, r: number, t: number) {
  const o = ow(r);
  const stone = '#C7CBD6';
  const stoneDark = '#9CA2B2';
  // basin
  stickerEllipse(ctx, 0, r * 0.35, r * 0.95, r * 0.5, stone, 0, { outline: o });
  stickerEllipse(ctx, 0, r * 0.3, r * 0.78, r * 0.36, '#2D9CDB', 0, { outline: o, shadow: false });
  // column
  sticker(ctx, (c) => roundRectPath(c, -r * 0.16, -r * 0.5, r * 0.32, r * 0.7, r * 0.08), stoneDark, { outline: o, shadow: false });
  stickerEllipse(ctx, 0, -r * 0.5, r * 0.42, r * 0.18, stone, 0, { outline: o, shadow: false });
  // water arcs
  ctx.strokeStyle = '#BFEAFF';
  ctx.lineWidth = Math.max(1.5, r * 0.09);
  ctx.lineCap = 'round';
  const spout = (Math.sin(t / 200) + 1) * 0.5;
  for (const dir of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.55);
    ctx.quadraticCurveTo(dir * r * 0.5, -r * 0.9, dir * r * 0.55, r * 0.1);
    ctx.stroke();
  }
  dot(ctx, 0, -r * 0.7 - spout * r * 0.1, r * 0.1, '#EAF7FF');
}

function drawFoodcart(ctx: CanvasRenderingContext2D, r: number, _t: number) {
  const o = ow(r);
  // wheels
  for (const wx of [-0.5, 0.5]) {
    stickerCircle(ctx, r * wx, r * 0.6, r * 0.2, '#22222C', { outline: o });
    dot(ctx, r * wx, r * 0.6, r * 0.08, '#C9CCD6');
  }
  // body
  sticker(ctx, (c) => roundRectPath(c, -r * 0.75, -r * 0.05, r * 1.5, r * 0.6, r * 0.12), '#F2F2F5', { outline: o });
  // counter stripe
  sticker(ctx, (c) => roundRectPath(c, -r * 0.75, r * 0.25, r * 1.5, r * 0.16, r * 0.06), '#2D9CDB', { outline: o, shadow: false });
  // awning (scalloped stripes)
  const n = 5, aw = (r * 1.7) / n;
  for (let i = 0; i < n; i++) {
    const x = -r * 0.85 + i * aw;
    sticker(ctx, (c) => {
      c.moveTo(x, -r * 0.5);
      c.lineTo(x + aw, -r * 0.5);
      c.lineTo(x + aw, -r * 0.1);
      c.quadraticCurveTo(x + aw / 2, r * 0.12, x, -r * 0.1);
      c.closePath();
    }, i % 2 === 0 ? '#FF3D68' : '#FFFFFF', { outline: o, shadow: false });
  }
  // sign
  dot(ctx, 0, r * 0.05, r * 0.12, '#FFD23F');
}

// ── T5 ───────────────────────────────────────────────────────────────────────
function drawGazebo(ctx: CanvasRenderingContext2D, r: number, t: number) {
  const o = ow(r);
  const wave = Math.sin(t / 500);
  // base
  stickerEllipse(ctx, 0, r * 0.72, r * 0.95, r * 0.28, '#D8C6A8', 0, { outline: o });
  // posts
  for (const px of [-0.7, -0.24, 0.24, 0.7]) {
    sticker(ctx, (c) => roundRectPath(c, r * px - r * 0.06, -r * 0.1, r * 0.12, r * 0.85, r * 0.04), '#FBEFD6', { outline: o, shadow: false });
  }
  // floor band
  sticker(ctx, (c) => roundRectPath(c, -r * 0.86, r * 0.5, r * 1.72, r * 0.18, r * 0.06), '#EEDFC0', { outline: o, shadow: false });
  // roof
  sticker(ctx, (c) => {
    c.moveTo(-r * 0.98, -r * 0.05);
    c.lineTo(0, -r * 0.95);
    c.lineTo(r * 0.98, -r * 0.05);
    c.closePath();
  }, '#EF4B4B', { outline: o });
  // roof trim scallops
  ctx.fillStyle = '#FFFFFF';
  for (let i = -3; i <= 3; i++) {
    dot(ctx, i * r * 0.28, -r * 0.05, r * 0.07, '#FFFFFF');
  }
  // cupola + flag
  stickerCircle(ctx, 0, -r * 0.95, r * 0.12, '#FFD23F', { outline: o, shadow: false });
  ctx.strokeStyle = '#7A4A2B';
  ctx.lineWidth = Math.max(1.4, r * 0.05);
  ctx.beginPath();
  ctx.moveTo(0, -r * 1.05);
  ctx.lineTo(0, -r * 1.35);
  ctx.stroke();
  sticker(ctx, (c) => {
    c.moveTo(0, -r * 1.35);
    c.lineTo(r * 0.28 + wave * r * 0.04, -r * 1.28);
    c.lineTo(0, -r * 1.18);
    c.closePath();
  }, '#2D9CDB', { outline: o, shadow: false });
}

// ── v4 neighborhood objects ────────────────────────────────────────────────
function drawFlowerpot(ctx: CanvasRenderingContext2D, r: number, t: number, variant = 0) {
  const o = ow(r);
  const petal = pick(['#FF6FB0', '#FFD23F', '#8ECBFF', '#FF8A5C'], variant);
  // pot
  sticker(ctx, (c) => {
    c.moveTo(-r * 0.55, r * 0.15);
    c.lineTo(r * 0.55, r * 0.15);
    c.lineTo(r * 0.4, r * 0.8);
    c.lineTo(-r * 0.4, r * 0.8);
    c.closePath();
  }, '#C86B3C', { outline: o });
  sticker(ctx, (c) => roundRectPath(c, -r * 0.62, -r * 0.02, r * 1.24, r * 0.24, r * 0.08), '#E07C46', { outline: o, shadow: false });
  // little bloom
  const sway = 0; // Prompt 7 Stage 1: flowerpots are scenery — no wind lean / bob
  ctx.save();
  ctx.translate(0, -r * 0.2);
  ctx.rotate(sway);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    sticker(ctx, (c) => c.ellipse(Math.cos(a) * r * 0.34, Math.sin(a) * r * 0.34 - r * 0.2, r * 0.26, r * 0.18, a, 0, Math.PI * 2), petal, { outline: o, shadow: false });
  }
  dot(ctx, 0, -r * 0.2, r * 0.14, '#FFD23F');
  ctx.restore();
}

function drawGnome(ctx: CanvasRenderingContext2D, r: number, _t: number) {
  const o = ow(r);
  // body
  sticker(ctx, (c) => roundRectPath(c, -r * 0.42, -r * 0.05, r * 0.84, r * 0.85, r * 0.3), '#3F8CE0', { outline: o });
  // beard
  sticker(ctx, (c) => {
    c.moveTo(-r * 0.36, -r * 0.05);
    c.quadraticCurveTo(0, r * 0.75, r * 0.36, -r * 0.05);
    c.quadraticCurveTo(0, r * 0.15, -r * 0.36, -r * 0.05);
    c.closePath();
  }, '#F1F1F5', { outline: o, shadow: false });
  // face
  stickerCircle(ctx, 0, -r * 0.2, r * 0.3, '#F4C79B', { outline: o, shadow: false });
  dot(ctx, 0, -r * 0.14, r * 0.12, '#E88A5A'); // nose
  dot(ctx, -r * 0.14, -r * 0.26, r * 0.05, '#1A0B33');
  dot(ctx, r * 0.14, -r * 0.26, r * 0.05, '#1A0B33');
  // hat
  sticker(ctx, (c) => {
    c.moveTo(-r * 0.5, -r * 0.28);
    c.quadraticCurveTo(0, -r * 0.55, r * 0.5, -r * 0.28);
    c.lineTo(r * 0.06, -r * 1.15);
    c.closePath();
  }, '#E23B4E', { outline: o });
}

function drawMailbox(ctx: CanvasRenderingContext2D, r: number, _t: number) {
  const o = ow(r);
  // post
  sticker(ctx, (c) => roundRectPath(c, -r * 0.12, r * 0.05, r * 0.24, r * 0.85, r * 0.06), '#8A5A2E', { outline: o });
  // box
  sticker(ctx, (c) => {
    c.moveTo(-r * 0.55, r * 0.1);
    c.lineTo(-r * 0.55, -r * 0.3);
    c.arc(0, -r * 0.3, r * 0.55, Math.PI, 0);
    c.lineTo(r * 0.55, r * 0.1);
    c.closePath();
  }, '#3F7FD0', { outline: o });
  // flag
  sticker(ctx, (c) => roundRectPath(c, r * 0.5, -r * 0.5, r * 0.22, r * 0.22, r * 0.04), '#E23B4E', { outline: o, shadow: false });
  dot(ctx, -r * 0.2, -r * 0.2, r * 0.12, '#EAF2FF');
}

function drawHydrant(ctx: CanvasRenderingContext2D, r: number, _t: number) {
  const o = ow(r);
  const red = '#E23B4E';
  // base
  sticker(ctx, (c) => roundRectPath(c, -r * 0.5, r * 0.55, r * 1.0, r * 0.22, r * 0.06), '#C42A3C', { outline: o });
  // body
  sticker(ctx, (c) => roundRectPath(c, -r * 0.42, -r * 0.35, r * 0.84, r * 0.95, r * 0.24), red, { outline: o });
  // cap
  sticker(ctx, (c) => c.arc(0, -r * 0.4, r * 0.42, Math.PI, 0), red, { outline: o, shadow: false });
  dot(ctx, 0, -r * 0.55, r * 0.14, '#FFD23F'); // bolt
  // side nozzles
  dot(ctx, -r * 0.5, r * 0.02, r * 0.16, '#C42A3C');
  dot(ctx, r * 0.5, r * 0.02, r * 0.16, '#C42A3C');
}

function drawTrashcan(ctx: CanvasRenderingContext2D, r: number, _t: number) {
  const o = ow(r);
  const metal = '#5E6472';
  // body
  sticker(ctx, (c) => {
    c.moveTo(-r * 0.5, -r * 0.35);
    c.lineTo(r * 0.5, -r * 0.35);
    c.lineTo(r * 0.4, r * 0.75);
    c.lineTo(-r * 0.4, r * 0.75);
    c.closePath();
  }, metal, { outline: o });
  // ridges
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = Math.max(1, r * 0.05);
  for (const dx of [-0.2, 0.2]) {
    ctx.beginPath();
    ctx.moveTo(r * dx, -r * 0.3);
    ctx.lineTo(r * dx * 0.85, r * 0.7);
    ctx.stroke();
  }
  // lid
  sticker(ctx, (c) => roundRectPath(c, -r * 0.6, -r * 0.55, r * 1.2, r * 0.24, r * 0.1), '#6E7484', { outline: o, shadow: false });
  dot(ctx, 0, -r * 0.62, r * 0.1, '#8A90A0');
}

function drawBike(ctx: CanvasRenderingContext2D, r: number, _t: number, variant = 0) {
  const o = ow(r);
  const frame = pick(['#E23B4E', '#2D9CDB', '#33C46B', '#FF9F1C'], variant);
  const wr = r * 0.42;
  // wheels
  for (const wx of [-0.6, 0.6]) {
    ctx.save();
    ctx.strokeStyle = '#22222C';
    ctx.lineWidth = Math.max(2, r * 0.12);
    ctx.beginPath();
    ctx.arc(r * wx, r * 0.35, wr, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    dot(ctx, r * wx, r * 0.35, r * 0.08, '#C9CCD6');
  }
  // frame
  ctx.strokeStyle = frame;
  ctx.lineWidth = Math.max(2.4, r * 0.14);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-r * 0.6, r * 0.35);
  ctx.lineTo(0, r * 0.35);
  ctx.lineTo(-r * 0.1, -r * 0.2);
  ctx.lineTo(r * 0.45, -r * 0.2);
  ctx.lineTo(r * 0.6, r * 0.35);
  ctx.moveTo(0, r * 0.35);
  ctx.lineTo(r * 0.45, -r * 0.2);
  ctx.stroke();
  // seat + handle
  sticker(ctx, (c) => roundRectPath(c, -r * 0.22, -r * 0.34, r * 0.24, r * 0.12, r * 0.05), '#2A1A0E', { outline: 0, shadow: false });
  ctx.strokeStyle = '#2A1A0E';
  ctx.beginPath();
  ctx.moveTo(r * 0.45, -r * 0.2);
  ctx.lineTo(r * 0.6, -r * 0.4);
  ctx.stroke();
}

function drawBirdbath(ctx: CanvasRenderingContext2D, r: number, t: number) {
  const o = ow(r);
  const stone = '#C7CBD6';
  // pedestal
  sticker(ctx, (c) => roundRectPath(c, -r * 0.2, -r * 0.1, r * 0.4, r * 0.8, r * 0.08), '#9CA2B2', { outline: o });
  stickerEllipse(ctx, 0, r * 0.72, r * 0.55, r * 0.2, stone, 0, { outline: o });
  // basin
  stickerEllipse(ctx, 0, -r * 0.2, r * 0.85, r * 0.34, stone, 0, { outline: o });
  stickerEllipse(ctx, 0, -r * 0.24, r * 0.66, r * 0.24, '#8FBFE0', 0, { outline: o, shadow: false });
  // ripple + bird
  const bob = Math.sin(t / 400) * r * 0.03;
  dot(ctx, r * 0.2, -r * 0.26 + bob, r * 0.12, '#FF8A5C');
  dot(ctx, r * 0.14, -r * 0.3 + bob, r * 0.05, '#1A0B33');
}

function drawCafetable(ctx: CanvasRenderingContext2D, r: number, _t: number, variant = 0) {
  const o = ow(r);
  const shade = pick(['#E23B4E', '#2D9CDB', '#33C46B'], variant);
  // table top
  stickerEllipse(ctx, 0, r * 0.35, r * 0.7, r * 0.24, '#EFE7D5', 0, { outline: o });
  sticker(ctx, (c) => roundRectPath(c, -r * 0.06, r * 0.35, r * 0.12, r * 0.4, r * 0.03), '#B7AF98', { outline: o, shadow: false });
  // umbrella pole
  sticker(ctx, (c) => roundRectPath(c, -r * 0.05, -r * 0.7, r * 0.1, r * 1.1, r * 0.03), '#8A8570', { outline: o, shadow: false });
  // umbrella
  sticker(ctx, (c) => {
    c.moveTo(-r * 0.85, -r * 0.55);
    c.quadraticCurveTo(0, -r * 1.15, r * 0.85, -r * 0.55);
    c.quadraticCurveTo(0, -r * 0.4, -r * 0.85, -r * 0.55);
    c.closePath();
  }, shade, { outline: o });
  for (const dx of [-0.42, 0, 0.42]) {
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = Math.max(1, r * 0.04);
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.62);
    ctx.lineTo(r * dx, -r * 0.5);
    ctx.stroke();
  }
}

function drawShed(ctx: CanvasRenderingContext2D, r: number, _t: number, variant = 0) {
  const o = ow(r);
  const wall = pick(['#B98A5A', '#A87C4E', '#C79A6A'], variant);
  // walls
  sticker(ctx, (c) => roundRectPath(c, -r * 0.72, -r * 0.15, r * 1.44, r * 0.9, r * 0.04), wall, { outline: o });
  // roof
  sticker(ctx, (c) => {
    c.moveTo(-r * 0.85, -r * 0.1);
    c.lineTo(0, -r * 0.75);
    c.lineTo(r * 0.85, -r * 0.1);
    c.closePath();
  }, '#6E4A2A', { outline: o });
  // door
  sticker(ctx, (c) => roundRectPath(c, -r * 0.22, r * 0.05, r * 0.44, r * 0.7, r * 0.04), '#5A3E22', { outline: o, shadow: false });
  dot(ctx, r * 0.12, r * 0.4, r * 0.06, '#FFD23F');
}

function drawHouse(ctx: CanvasRenderingContext2D, r: number, _t: number, variant = 0) {
  const o = ow(r);
  const body = pick(['#F6E7B0', '#F6C6C6', '#BFE0F2', '#CFE6C4', '#EAD7F2'], variant);
  const roof = pick(['#C4736B', '#8A6BB0', '#6E93B8', '#7EA07A', '#C79A5A'], variant + 1);
  // body
  sticker(ctx, (c) => roundRectPath(c, -r * 0.72, -r * 0.05, r * 1.44, r * 0.95, r * 0.05), body, { outline: o });
  // roof
  sticker(ctx, (c) => {
    c.moveTo(-r * 0.9, 0);
    c.lineTo(0, -r * 0.78);
    c.lineTo(r * 0.9, 0);
    c.closePath();
  }, roof, { outline: o });
  // door
  sticker(ctx, (c) => roundRectPath(c, -r * 0.16, r * 0.32, r * 0.32, r * 0.58, r * 0.05), '#8A5A2E', { outline: o, shadow: false });
  dot(ctx, r * 0.08, r * 0.62, r * 0.05, '#FFD23F');
  // windows
  for (const wx of [-0.46, 0.46]) {
    sticker(ctx, (c) => roundRectPath(c, r * wx - r * 0.16, r * 0.15, r * 0.32, r * 0.32, r * 0.04), '#BFEAFF', { outline: o, shadow: false });
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = Math.max(1, r * 0.03);
    ctx.beginPath();
    ctx.moveTo(r * wx, r * 0.15); ctx.lineTo(r * wx, r * 0.47);
    ctx.moveTo(r * wx - r * 0.16, r * 0.31); ctx.lineTo(r * wx + r * 0.16, r * 0.31);
    ctx.stroke();
  }
}

function drawWatertower(ctx: CanvasRenderingContext2D, r: number, t: number) {
  const o = ow(r);
  const tank = '#D8DCE6';
  // legs
  ctx.strokeStyle = '#9098A8';
  ctx.lineWidth = Math.max(3, r * 0.06);
  ctx.lineCap = 'round';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(s * r * 0.5, -r * 0.1);
    ctx.lineTo(s * r * 0.72, r * 0.9);
    ctx.moveTo(s * r * 0.2, -r * 0.1);
    ctx.lineTo(s * r * 0.32, r * 0.9);
    ctx.stroke();
  }
  // cross braces
  ctx.lineWidth = Math.max(2, r * 0.03);
  ctx.beginPath();
  ctx.moveTo(-r * 0.6, r * 0.45); ctx.lineTo(r * 0.6, r * 0.45);
  ctx.moveTo(-r * 0.55, r * 0.15); ctx.lineTo(r * 0.55, r * 0.72);
  ctx.moveTo(r * 0.55, r * 0.15); ctx.lineTo(-r * 0.55, r * 0.72);
  ctx.stroke();
  // tank
  sticker(ctx, (c) => roundRectPath(c, -r * 0.62, -r * 0.55, r * 1.24, r * 0.6, r * 0.18), tank, { outline: o });
  // conical top
  sticker(ctx, (c) => {
    c.moveTo(-r * 0.62, -r * 0.5);
    c.lineTo(0, -r * 0.95);
    c.lineTo(r * 0.62, -r * 0.5);
    c.closePath();
  }, '#B8BECD', { outline: o, shadow: false });
  // little flag
  ctx.strokeStyle = '#7A4A2B';
  ctx.lineWidth = Math.max(1.6, r * 0.02);
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.95); ctx.lineTo(0, -r * 1.2);
  ctx.stroke();
  const wave = Math.sin(t / 400);
  sticker(ctx, (c) => {
    c.moveTo(0, -r * 1.2);
    c.lineTo(r * 0.28 + wave * r * 0.04, -r * 1.13);
    c.lineTo(0, -r * 1.03);
    c.closePath();
  }, '#E23B4E', { outline: o, shadow: false });
  // label
  ctx.fillStyle = '#5E6472';
  ctx.font = `bold ${Math.max(6, r * 0.16)}px Fredoka, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('MAPLE', 0, -r * 0.25);
}

// ── v7 §3: new objects with personality ─────────────────────────────────────
function drawCat(ctx: CanvasRenderingContext2D, r: number, t: number, fleeing = false) {
  const o = ow(r);
  const fur = '#9AA0AD';
  const flick = Math.sin(t / 200) * (fleeing ? 0.6 : 0.25);
  ctx.save(); ctx.translate(-r * 0.5, r * 0.2); ctx.rotate(flick);
  sticker(ctx, (c) => roundRectPath(c, -r * 0.12, -r * 0.9, r * 0.24, r * 0.9, r * 0.12), fur, { outline: o });
  ctx.restore();
  stickerEllipse(ctx, 0, r * 0.3, r * 0.55, r * 0.45, fur, 0, { outline: o });
  stickerCircle(ctx, r * 0.1, -r * 0.28, r * 0.42, fur, { outline: o });
  const arch = fleeing ? -r * 0.12 : 0;
  sticker(ctx, (c) => { c.moveTo(-r * 0.2, -r * 0.5 + arch); c.lineTo(-r * 0.34, -r * 0.95 + arch); c.lineTo(r * 0.04, -r * 0.66 + arch); c.closePath(); }, fur, { outline: o, shadow: false });
  sticker(ctx, (c) => { c.moveTo(r * 0.4, -r * 0.5 + arch); c.lineTo(r * 0.54, -r * 0.95 + arch); c.lineTo(r * 0.16, -r * 0.66 + arch); c.closePath(); }, fur, { outline: o, shadow: false });
  const er = fleeing ? r * 0.12 : r * 0.08;
  dot(ctx, r * -0.04, -r * 0.28, er, '#1A0B33');
  dot(ctx, r * 0.24, -r * 0.28, er, '#1A0B33');
  dot(ctx, r * 0.1, -r * 0.14, r * 0.05, '#FF8AA8');
}

function drawSquirrel(ctx: CanvasRenderingContext2D, r: number, t: number) {
  const o = ow(r);
  const fur = '#B5713C', light = '#E8C7A0';
  const twitch = Math.sin(t / 150) * 0.15;
  ctx.save(); ctx.translate(-r * 0.4, r * 0.1); ctx.rotate(twitch);
  sticker(ctx, (c) => c.ellipse(-r * 0.3, -r * 0.4, r * 0.42, r * 0.72, -0.5, 0, Math.PI * 2), fur, { outline: o });
  ctx.restore();
  stickerEllipse(ctx, r * 0.1, r * 0.2, r * 0.4, r * 0.5, fur, -0.2, { outline: o });
  stickerEllipse(ctx, r * 0.2, r * 0.3, r * 0.2, r * 0.3, light, -0.2, { outline: 0, shadow: false });
  stickerCircle(ctx, r * 0.3, -r * 0.35, r * 0.32, fur, { outline: o });
  dot(ctx, r * 0.2, -r * 0.6, r * 0.12, fur);
  dot(ctx, r * 0.4, -r * 0.4, r * 0.09, '#1A0B33');
}

function drawBird(ctx: CanvasRenderingContext2D, r: number, t: number, fleeing = false) {
  const o = ow(r);
  const body = '#5AA9E6';
  const flap = Math.sin(t / (fleeing ? 60 : 120)) * r * 0.14;
  stickerEllipse(ctx, 0, 0, r * 0.6, r * 0.5, body, 0, { outline: o });
  sticker(ctx, (c) => c.ellipse(-r * 0.1, -r * 0.1 + flap, r * 0.3, r * 0.18, -0.3, 0, Math.PI * 2), '#3E8AC7', { outline: o, shadow: false });
  stickerCircle(ctx, r * 0.45, -r * 0.2, r * 0.3, body, { outline: o });
  sticker(ctx, (c) => { c.moveTo(r * 0.7, -r * 0.2); c.lineTo(r * 1.0, -r * 0.12); c.lineTo(r * 0.7, -r * 0.04); c.closePath(); }, '#FF9F1C', { outline: o, shadow: false });
  dot(ctx, r * 0.5, -r * 0.24, r * 0.07, '#1A0B33');
}

function drawTrampoline(ctx: CanvasRenderingContext2D, r: number, t: number) {
  const o = ow(r);
  ctx.strokeStyle = '#5E6472'; ctx.lineWidth = Math.max(2, r * 0.06); ctx.lineCap = 'round';
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * r * 0.6, r * 0.1); ctx.lineTo(s * r * 0.75, r * 0.8); ctx.stroke(); }
  stickerEllipse(ctx, 0, 0, r * 0.95, r * 0.5, '#3A5BC7', 0, { outline: o });
  const bounce = Math.sin(t / 300) * r * 0.04;
  stickerEllipse(ctx, 0, bounce, r * 0.72, r * 0.34, '#2A2A38', 0, { outline: o, shadow: false });
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = Math.max(1, r * 0.03);
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 0.72, Math.sin(a) * r * 0.34); ctx.lineTo(Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.45); ctx.stroke(); }
}

function drawDrone(ctx: CanvasRenderingContext2D, r: number, t: number) {
  const o = ow(r);
  const spin = t / 30;
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as [number, number][]) {
    const cx = sx * r * 0.6, cy = sy * r * 0.4;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(spin * sx * sy);
    stickerEllipse(ctx, 0, 0, r * 0.4, r * 0.08, '#C9CCD6', 0, { outline: Math.max(1, o * 0.6), shadow: false });
    ctx.restore();
    dot(ctx, cx, cy, r * 0.08, '#5E6472');
  }
  sticker(ctx, (c) => roundRectPath(c, -r * 0.4, -r * 0.25, r * 0.8, r * 0.5, r * 0.12), '#FF3D68', { outline: o });
  sticker(ctx, (c) => roundRectPath(c, -r * 0.22, r * 0.3, r * 0.44, r * 0.4, r * 0.05), '#C79A5A', { outline: o, shadow: false });
  ctx.strokeStyle = '#8A5A2E'; ctx.lineWidth = Math.max(1, r * 0.03);
  ctx.beginPath(); ctx.moveTo(0, r * 0.3); ctx.lineTo(0, r * 0.7); ctx.stroke();
  dot(ctx, r * 0.2, -r * 0.05, r * 0.07, '#BFEAFF');
}

function drawSchoolbus(ctx: CanvasRenderingContext2D, r: number, t: number) {
  const o = ow(r);
  const roll = t / 400;
  const yellow = '#FFC61A';
  for (const wx of [-0.6, 0.55]) { stickerCircle(ctx, r * wx, r * 0.5, r * 0.2, '#22222C', { outline: o }); ctx.save(); ctx.translate(r * wx, r * 0.5); ctx.rotate(roll); dot(ctx, 0, 0, r * 0.08, '#C9CCD6'); ctx.restore(); }
  sticker(ctx, (c) => roundRectPath(c, -r * 0.95, -r * 0.5, r * 1.9, r * 1.0, r * 0.12), yellow, { outline: o });
  for (let i = 0; i < 4; i++) sticker(ctx, (c) => roundRectPath(c, -r * 0.8 + i * r * 0.42, -r * 0.35, r * 0.32, r * 0.3, r * 0.05), '#BFEAFF', { outline: o, shadow: false });
  dot(ctx, r * 0.86, r * 0.15, r * 0.07, '#FFF3B0');
  ctx.strokeStyle = '#22222C'; ctx.lineWidth = Math.max(1.5, r * 0.05);
  ctx.beginPath(); ctx.moveTo(-r * 0.95, r * 0.15); ctx.lineTo(r * 0.9, r * 0.15); ctx.stroke();
}

function drawBBQ(ctx: CanvasRenderingContext2D, r: number, t: number) {
  const o = ow(r);
  ctx.save(); ctx.globalAlpha = 0.4;
  for (let i = 0; i < 3; i++) { const p = (t / 600 + i * 0.4) % 1; dot(ctx, r * 0.1 + Math.sin(p * 6 + i) * r * 0.15, -r * 0.6 - p * r * 0.6, r * 0.12 * (1 - p * 0.5), '#D8D8E0'); }
  ctx.restore();
  ctx.strokeStyle = '#2A2A38'; ctx.lineWidth = Math.max(2, r * 0.06); ctx.lineCap = 'round';
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * r * 0.3, 0); ctx.lineTo(s * r * 0.5, r * 0.8); ctx.stroke(); }
  sticker(ctx, (c) => { c.moveTo(-r * 0.6, -r * 0.1); c.arc(0, -r * 0.1, r * 0.6, 0, Math.PI); c.closePath(); }, '#3A3A46', { outline: o });
  sticker(ctx, (c) => c.arc(0, -r * 0.1, r * 0.6, Math.PI, 0), '#E23B4E', { outline: o, shadow: false });
  dot(ctx, 0, -r * 0.72, r * 0.1, '#2A2A38');
  dot(ctx, -r * 0.2, -r * 0.12, r * 0.08, '#FF7A1C'); dot(ctx, r * 0.15, -r * 0.12, r * 0.08, '#FFB020');
}

function drawMower(ctx: CanvasRenderingContext2D, r: number, _t: number) {
  const o = ow(r);
  stickerCircle(ctx, -r * 0.4, r * 0.5, r * 0.22, '#2A2A38', { outline: o });
  stickerCircle(ctx, r * 0.5, r * 0.55, r * 0.16, '#2A2A38', { outline: o });
  sticker(ctx, (c) => roundRectPath(c, -r * 0.7, r * 0.1, r * 1.2, r * 0.4, r * 0.1), '#33C46B', { outline: o });
  sticker(ctx, (c) => roundRectPath(c, -r * 0.4, -r * 0.2, r * 0.5, r * 0.4, r * 0.06), '#5E6472', { outline: o, shadow: false });
  ctx.strokeStyle = '#3B4A63'; ctx.lineWidth = Math.max(2, r * 0.06); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(r * 0.4, r * 0.2); ctx.lineTo(r * 0.9, -r * 0.6); ctx.moveTo(r * 0.75, -r * 0.4); ctx.lineTo(r * 1.0, -r * 0.55); ctx.stroke();
}

function drawHoop(ctx: CanvasRenderingContext2D, r: number, _t: number) {
  const o = ow(r);
  sticker(ctx, (c) => roundRectPath(c, -r * 0.1, -r * 0.2, r * 0.2, r * 1.0, r * 0.05), '#5E6472', { outline: o });
  sticker(ctx, (c) => roundRectPath(c, -r * 0.6, -r * 0.9, r * 1.2, r * 0.7, r * 0.05), '#F2F2F5', { outline: o });
  sticker(ctx, (c) => roundRectPath(c, -r * 0.2, -r * 0.6, r * 0.4, r * 0.3, r * 0.03), '#E23B4E', { outline: o, shadow: false });
  ctx.strokeStyle = '#FF7A1C'; ctx.lineWidth = Math.max(2, r * 0.08);
  ctx.beginPath(); ctx.ellipse(0, -r * 0.25, r * 0.28, r * 0.1, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = Math.max(1, r * 0.03);
  for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * r * 0.11, -r * 0.22); ctx.lineTo(i * r * 0.06, r * 0.1); ctx.stroke(); }
}

function drawIcecream(ctx: CanvasRenderingContext2D, r: number, _t: number) {
  const o = ow(r);
  for (const wx of [-0.5, 0.5]) { stickerCircle(ctx, r * wx, r * 0.6, r * 0.18, '#22222C', { outline: o }); dot(ctx, r * wx, r * 0.6, r * 0.07, '#C9CCD6'); }
  sticker(ctx, (c) => roundRectPath(c, -r * 0.7, -r * 0.05, r * 1.4, r * 0.6, r * 0.1), '#8ECBFF', { outline: o });
  sticker(ctx, (c) => roundRectPath(c, -r * 0.7, r * 0.25, r * 1.4, r * 0.14, r * 0.05), '#FF6FB0', { outline: o, shadow: false });
  sticker(ctx, (c) => { c.moveTo(0, r * 0.1); c.lineTo(-r * 0.18, -r * 0.4); c.lineTo(r * 0.18, -r * 0.4); c.closePath(); }, '#E8C7A0', { outline: o });
  stickerCircle(ctx, -r * 0.08, -r * 0.45, r * 0.16, '#FF6FB0', { outline: o, shadow: false });
  stickerCircle(ctx, r * 0.1, -r * 0.5, r * 0.16, '#FFFFFF', { outline: o, shadow: false });
  dot(ctx, 0, -r * 0.62, r * 0.08, '#E23B4E');
}

function drawScooter(ctx: CanvasRenderingContext2D, r: number, _t: number) {
  const o = ow(r);
  for (const wx of [-0.6, 0.55]) { ctx.save(); ctx.strokeStyle = '#22222C'; ctx.lineWidth = Math.max(2, r * 0.1); ctx.beginPath(); ctx.arc(r * wx, r * 0.5, r * 0.22, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); dot(ctx, r * wx, r * 0.5, r * 0.06, '#C9CCD6'); }
  sticker(ctx, (c) => roundRectPath(c, -r * 0.65, r * 0.3, r * 1.2, r * 0.14, r * 0.06), '#E23B4E', { outline: o });
  ctx.strokeStyle = '#5E6472'; ctx.lineWidth = Math.max(2, r * 0.08); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(r * 0.5, r * 0.35); ctx.lineTo(r * 0.6, -r * 0.5); ctx.moveTo(r * 0.4, -r * 0.5); ctx.lineTo(r * 0.8, -r * 0.5); ctx.stroke();
}

function drawSandbox(ctx: CanvasRenderingContext2D, r: number) {
  const o = ow(r);
  sticker(ctx, (c) => roundRectPath(c, -r * 0.8, -r * 0.5, r * 1.6, r * 1.0, r * 0.08), '#C77B3C', { outline: o });
  sticker(ctx, (c) => roundRectPath(c, -r * 0.62, -r * 0.32, r * 1.24, r * 0.7, r * 0.05), '#F2D9A0', { outline: 0, shadow: false });
  sticker(ctx, (c) => { c.moveTo(-r * 0.35, -r * 0.1); c.lineTo(-r * 0.15, -r * 0.1); c.lineTo(-r * 0.2, r * 0.25); c.lineTo(-r * 0.3, r * 0.25); c.closePath(); }, '#E23B4E', { outline: o, shadow: false });
  dot(ctx, r * 0.3, r * 0.05, r * 0.14, '#2D9CDB');
}

function drawSwingset(ctx: CanvasRenderingContext2D, r: number) {
  const o = ow(r);
  ctx.strokeStyle = '#5E6472'; ctx.lineWidth = Math.max(2.5, r * 0.07); ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-r * 0.7, r * 0.8); ctx.lineTo(-r * 0.4, -r * 0.7); ctx.lineTo(r * 0.4, -r * 0.7); ctx.lineTo(r * 0.7, r * 0.8);
  ctx.moveTo(-r * 0.55, r * 0.8); ctx.lineTo(-r * 0.28, -r * 0.7); ctx.moveTo(r * 0.55, r * 0.8); ctx.lineTo(r * 0.28, -r * 0.7);
  ctx.moveTo(-r * 0.4, -r * 0.7); ctx.lineTo(r * 0.4, -r * 0.7);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(60,60,80,0.8)'; ctx.lineWidth = Math.max(1.5, r * 0.04);
  for (const sx of [-0.18, 0.18]) {
    ctx.beginPath(); ctx.moveTo(r * sx - r * 0.08, -r * 0.7); ctx.lineTo(r * sx - r * 0.08, r * 0.2); ctx.moveTo(r * sx + r * 0.08, -r * 0.7); ctx.lineTo(r * sx + r * 0.08, r * 0.2); ctx.stroke();
    sticker(ctx, (c) => roundRectPath(c, r * sx - r * 0.14, r * 0.2, r * 0.28, r * 0.1, r * 0.03), '#FFD23F', { outline: o, shadow: false });
  }
}

function drawSlide(ctx: CanvasRenderingContext2D, r: number) {
  const o = ow(r);
  ctx.strokeStyle = '#5E6472'; ctx.lineWidth = Math.max(2, r * 0.06); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(r * 0.45, -r * 0.6); ctx.lineTo(r * 0.6, r * 0.7); ctx.moveTo(r * 0.65, -r * 0.6); ctx.lineTo(r * 0.8, r * 0.7); ctx.stroke();
  for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(r * 0.48, -r * 0.5 + i * r * 0.35); ctx.lineTo(r * 0.78, -r * 0.5 + i * r * 0.35); ctx.stroke(); }
  sticker(ctx, (c) => { c.moveTo(r * 0.45, -r * 0.62); c.lineTo(r * 0.65, -r * 0.62); c.quadraticCurveTo(-r * 0.3, r * 0.2, -r * 0.8, r * 0.7); c.lineTo(-r * 0.55, r * 0.7); c.quadraticCurveTo(-r * 0.1, r * 0.25, r * 0.55, -r * 0.4); c.closePath(); }, '#2D9CDB', { outline: o });
  sticker(ctx, (c) => roundRectPath(c, r * 0.4, -r * 0.72, r * 0.35, r * 0.14, r * 0.04), '#FF9F1C', { outline: o, shadow: false });
}

function drawSeesaw(ctx: CanvasRenderingContext2D, r: number, t: number) {
  const o = ow(r);
  const tilt = Math.sin(t / 500) * 0.2;
  sticker(ctx, (c) => { c.moveTo(-r * 0.3, r * 0.5); c.lineTo(0, -r * 0.05); c.lineTo(r * 0.3, r * 0.5); c.closePath(); }, '#5E6472', { outline: o });
  ctx.save(); ctx.translate(0, -r * 0.1); ctx.rotate(tilt);
  sticker(ctx, (c) => roundRectPath(c, -r * 0.95, -r * 0.1, r * 1.9, r * 0.2, r * 0.08), '#E23B4E', { outline: o });
  for (const sx of [-0.8, 0.8]) { ctx.strokeStyle = '#FFD23F'; ctx.lineWidth = Math.max(2, r * 0.07); ctx.beginPath(); ctx.moveTo(r * sx, -r * 0.1); ctx.lineTo(r * sx * 0.9, -r * 0.5); ctx.stroke(); }
  ctx.restore();
}

function drawSchool(ctx: CanvasRenderingContext2D, r: number, t: number) {
  const o = ow(r);
  const wall = '#F2C6A0', roof = '#8A6BB0';
  sticker(ctx, (c) => roundRectPath(c, -r * 0.85, -r * 0.25, r * 1.7, r * 1.05, r * 0.05), wall, { outline: o });
  sticker(ctx, (c) => roundRectPath(c, -r * 0.9, -r * 0.4, r * 1.8, r * 0.2, r * 0.04), roof, { outline: o, shadow: false });
  sticker(ctx, (c) => roundRectPath(c, -r * 0.22, -r * 0.75, r * 0.44, r * 0.5, r * 0.04), wall, { outline: o });
  sticker(ctx, (c) => { c.moveTo(-r * 0.28, -r * 0.72); c.lineTo(0, -r * 1.05); c.lineTo(r * 0.28, -r * 0.72); c.closePath(); }, roof, { outline: o });
  stickerCircle(ctx, 0, -r * 0.5, r * 0.14, '#FFFFFF', { outline: o, shadow: false });
  dot(ctx, 0, -r * 0.5, r * 0.03, '#1A0B33');
  ctx.strokeStyle = '#7A4A2B'; ctx.lineWidth = Math.max(1.5, r * 0.02);
  ctx.beginPath(); ctx.moveTo(0, -r * 1.05); ctx.lineTo(0, -r * 1.35); ctx.stroke();
  const wave = Math.sin(t / 400);
  sticker(ctx, (c) => { c.moveTo(0, -r * 1.35); c.lineTo(r * 0.3 + wave * r * 0.04, -r * 1.28); c.lineTo(0, -r * 1.18); c.closePath(); }, '#E23B4E', { outline: o, shadow: false });
  sticker(ctx, (c) => roundRectPath(c, -r * 0.16, r * 0.35, r * 0.32, r * 0.45, r * 0.04), '#8A5A2E', { outline: o, shadow: false });
  for (const wx of [-0.55, 0.55]) sticker(ctx, (c) => roundRectPath(c, r * wx - r * 0.15, r * 0.0, r * 0.3, r * 0.3, r * 0.03), '#BFEAFF', { outline: o, shadow: false });
  ctx.fillStyle = '#5E6472'; ctx.font = `bold ${Math.max(6, r * 0.14)}px Fredoka, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('SCHOOL', 0, -r * 0.12);
}

// ── v12 §1: Downtown objects ──────────────────────────────────────────────────

function drawShop(ctx: CanvasRenderingContext2D, r: number, t: number, variant = 0) {
  const o = ow(r);
  const awningColors = ['#E85B2C', '#2C89E8', '#E8C72C', '#8C2CE8', '#2CE87D'];
  const col = pick(awningColors, variant);
  // building body
  sticker(ctx, (c) => roundRectPath(c, -r * 0.82, -r * 1.15, r * 1.64, r * 1.42, r * 0.08), '#F5E6C8', { outline: o });
  // striped awning (clipped to awning rect so stripes don't overflow)
  ctx.save();
  ctx.beginPath(); ctx.rect(-r * 0.82, -r * 0.36, r * 1.64, r * 0.28); ctx.clip();
  for (let i = -5; i <= 5; i++) {
    ctx.fillStyle = i % 2 === 0 ? col : '#FFFFFF';
    ctx.fillRect(-r * 0.82 + i * r * 0.18, -r * 0.36, r * 0.18, r * 0.28);
  }
  ctx.restore();
  ctx.strokeStyle = col; ctx.lineWidth = o;
  ctx.beginPath(); ctx.rect(-r * 0.82, -r * 0.36, r * 1.64, r * 0.28); ctx.stroke();
  // door
  sticker(ctx, (c) => roundRectPath(c, -r * 0.15, -r * 0.05, r * 0.3, r * 0.32, r * 0.04), '#A06040', { outline: o * 0.7 });
  // windows (two flanking)
  for (const wx of [-0.55, 0.55]) {
    sticker(ctx, (c) => roundRectPath(c, r * wx - r * 0.2, -r * 0.88, r * 0.4, r * 0.4, r * 0.04), '#BFEAFF', { outline: o * 0.7, shadow: false });
  }
  ctx.fillStyle = col; ctx.font = `bold ${Math.max(5, r * 0.11)}px Fredoka, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('SHOP', 0, -r * 1.05);
}

function drawLibrary(ctx: CanvasRenderingContext2D, r: number, _t: number) {
  const o = ow(r);
  // main building
  sticker(ctx, (c) => roundRectPath(c, -r * 0.9, -r * 1.38, r * 1.8, r * 1.65, r * 0.05), '#EDE0C8', { outline: o });
  // triangular pediment
  sticker(ctx, (c) => { c.moveTo(-r * 0.9, -r * 1.38); c.lineTo(0, -r * 1.88); c.lineTo(r * 0.9, -r * 1.38); c.closePath(); }, '#C9A96E', { outline: o });
  // 4 columns
  for (const cx of [-0.56, -0.18, 0.18, 0.56]) {
    sticker(ctx, (c) => roundRectPath(c, r * cx - r * 0.07, -r * 1.38, r * 0.14, r * 1.14, r * 0.04), '#F7F0E0', { outline: o * 0.6 });
  }
  // steps (2 tiers)
  for (let i = 0; i < 2; i++) {
    const sw = r * (1.2 - i * 0.14);
    ctx.fillStyle = '#D4C4A8'; ctx.strokeStyle = '#B5A888'; ctx.lineWidth = o * 0.6;
    ctx.fillRect(-sw / 2, -r * 0.26 + i * r * 0.13, sw, r * 0.13);
    ctx.strokeRect(-sw / 2, -r * 0.26 + i * r * 0.13, sw, r * 0.13);
  }
  // door
  sticker(ctx, (c) => roundRectPath(c, -r * 0.17, -r * 0.26, r * 0.34, r * 0.48, r * 0.05), '#7A5C3B', { outline: o * 0.8 });
  ctx.fillStyle = '#7A5C3B'; ctx.font = `bold ${Math.max(4, r * 0.09)}px Fredoka, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('LIBRARY', 0, -r * 0.72);
}

function drawOffice(ctx: CanvasRenderingContext2D, r: number, _t: number, variant = 0) {
  const o = ow(r);
  const cols = ['#4A7A9B', '#6B4A9B', '#4A9B6B', '#9B7A4A'];
  const col = pick(cols, variant);
  // glass tower body
  sticker(ctx, (c) => roundRectPath(c, -r * 0.7, -r * 1.82, r * 1.4, r * 2.08, r * 0.06), col, { outline: o });
  // window grid: 3 cols × 5 rows
  ctx.fillStyle = 'rgba(200,240,255,0.5)';
  for (let row = 0; row < 5; row++) for (let c2 = 0; c2 < 3; c2++) {
    ctx.fillRect(-r * 0.52 + c2 * r * 0.49, -r * 1.7 + row * r * 0.35, r * 0.36, r * 0.26);
  }
  // base trim
  sticker(ctx, (c) => roundRectPath(c, -r * 0.7, -r * 0.26, r * 1.4, r * 0.26, r * 0.04), '#2A5A6A', { outline: o * 0.6 });
  ctx.fillStyle = '#1A3040'; ctx.fillRect(-r * 0.15, -r * 0.26, r * 0.3, r * 0.26);
}

function drawSkyscraper(ctx: CanvasRenderingContext2D, r: number, t: number, variant = 0) {
  const o = ow(r);
  const cols = ['#5A8AB0', '#7055A8', '#4E968A'];
  const col = pick(cols, variant);
  // main tower body
  sticker(ctx, (c) => roundRectPath(c, -r * 0.58, -r * 2.75, r * 1.16, r * 3.0, r * 0.06), col, { outline: o });
  // window grid: 2 cols × 7 rows
  ctx.fillStyle = 'rgba(210,250,255,0.48)';
  for (let row = 0; row < 7; row++) for (let c2 = 0; c2 < 2; c2++) {
    ctx.fillRect(-r * 0.4 + c2 * r * 0.5, -r * 2.62 + row * r * 0.35, r * 0.34, r * 0.25);
  }
  // stepped setbacks (art-deco crown)
  sticker(ctx, (c) => roundRectPath(c, -r * 0.42, -r * 2.9, r * 0.84, r * 0.22, r * 0.04), '#3A7090', { outline: o * 0.7 });
  sticker(ctx, (c) => roundRectPath(c, -r * 0.28, -r * 3.06, r * 0.56, r * 0.2, r * 0.04), '#2A6080', { outline: o * 0.7 });
  // antenna + slow blink light
  ctx.save();
  ctx.strokeStyle = '#FFD23F'; ctx.lineWidth = Math.max(1.5, r * 0.05); ctx.lineCap = 'round';
  const sw = Math.sin(t / 1600) * r * 0.018;
  ctx.beginPath(); ctx.moveTo(sw, -r * 3.06); ctx.lineTo(sw, -r * 3.5); ctx.stroke();
  ctx.globalAlpha = Math.sin(t / 500) > 0 ? 0.95 : 0.25;
  ctx.fillStyle = '#FF3D68'; ctx.beginPath(); ctx.arc(sw, -r * 3.5, r * 0.07, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // lobby base
  sticker(ctx, (c) => roundRectPath(c, -r * 0.58, -r * 0.24, r * 1.16, r * 0.24, r * 0.04), '#2A5070', { outline: o * 0.6 });
  ctx.fillStyle = '#1A3040'; ctx.fillRect(-r * 0.16, -r * 0.24, r * 0.32, r * 0.24);
}

// ── Dispatcher ─────────────────────────────────────────────────────────────
export interface DrawOpts {
  t?: number;
  fleeing?: boolean;
  variant?: number;
}

// ── v13 §2: Sandy Shores beach objects ───────────────────────────────────────

function drawSeashell(ctx: CanvasRenderingContext2D, r: number, _t: number) {
  const o = ow(r);
  sticker(ctx, (c) => { c.arc(0, r * 0.1, r * 0.75, 0, Math.PI * 2); }, '#F4C98E', { outline: o });
  ctx.save();
  ctx.strokeStyle = '#D4954E';
  ctx.lineWidth = Math.max(1, r * 0.08);
  ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const sr = r * (0.62 - i * 0.18);
    ctx.beginPath(); ctx.arc(0, r * 0.1, sr, Math.PI * 0.9, Math.PI * 2.1); ctx.stroke();
  }
  ctx.restore();
  highlight(ctx, -r * 0.28, -r * 0.32, r * 0.55, 0.35);
}

function drawCrabObj(ctx: CanvasRenderingContext2D, r: number, t: number, fleeing = false) {
  const o = ow(r);
  const scuttle = fleeing ? Math.sin(t / 80) * 0.22 : Math.sin(t / 330) * 0.06;
  ctx.save();
  ctx.rotate(scuttle);
  sticker(ctx, (c) => { c.ellipse(0, 0, r * 0.68, r * 0.48, 0, 0, Math.PI * 2); }, '#E84C25', { outline: o });
  for (const side of [-1, 1]) {
    sticker(ctx, (c) => { c.ellipse(side * r * 0.9, -r * 0.1, r * 0.32, r * 0.2, side * 0.5, 0, Math.PI * 2); }, '#E84C25', { outline: o });
  }
  dot(ctx, -r * 0.22, -r * 0.2, r * 0.12, '#1A0B20');
  dot(ctx, r * 0.22, -r * 0.2, r * 0.12, '#1A0B20');
  highlight(ctx, -r * 0.22, -r * 0.16, r * 0.5, 0.3);
  ctx.restore();
}

function drawTowel(ctx: CanvasRenderingContext2D, r: number, _t: number, variant = 0) {
  const o = ow(r);
  const cols: [string, string][] = [['#FF5A5A','#FFD23F'],['#4DC9FF','#FFFFFF'],['#9B5DE5','#FFD23F'],['#FF9F1C','#2D9CDB']];
  const [c1, c2] = cols[variant % cols.length];
  sticker(ctx, (c) => roundRectPath(c, -r * 0.88, -r * 0.62, r * 1.76, r * 1.24, r * 0.12), c1, { outline: o });
  ctx.save();
  ctx.beginPath(); roundRectPath(ctx, -r * 0.88, -r * 0.62, r * 1.76, r * 1.24, r * 0.12); ctx.clip();
  ctx.fillStyle = c2; ctx.globalAlpha = 0.45;
  for (let i = -3; i <= 3; i += 2) {
    ctx.fillRect(-r * 0.88 + i * r * 0.3 + r * 0.1, -r * 0.62, r * 0.26, r * 1.24);
  }
  ctx.restore();
}

function drawSandcastle(ctx: CanvasRenderingContext2D, r: number, _t: number) {
  const o = ow(r);
  const sand = '#E8C87A', dark = '#C4A055';
  sticker(ctx, (c) => roundRectPath(c, -r * 0.75, -r * 0.2, r * 1.5, r * 0.88, r * 0.1), sand, { outline: o });
  for (const tx of [-r * 0.52, 0, r * 0.52]) {
    sticker(ctx, (c) => roundRectPath(c, tx - r * 0.24, -r * 0.68, r * 0.48, r * 0.52, r * 0.08), sand, { outline: o });
    for (const dx of [-1, 0, 1]) ctx.fillStyle = dark, ctx.fillRect(tx + dx * r * 0.14 - r * 0.07, -r * 0.74, r * 0.12, r * 0.09);
  }
  dot(ctx, -r * 0.52, -r * 0.42, r * 0.09, dark);
  dot(ctx, r * 0.52, -r * 0.42, r * 0.09, dark);
  dot(ctx, 0, -r * 0.42, r * 0.09, dark);
  highlight(ctx, -r * 0.5, -r * 0.5, r * 0.68, 0.2);
}

function drawUmbrellaObj(ctx: CanvasRenderingContext2D, r: number, t: number) {
  const o = ow(r);
  const sway = wind(t) * 0.04;
  ctx.save();
  ctx.rotate(sway);
  ctx.strokeStyle = '#D4A85A'; ctx.lineWidth = Math.max(1.5, r * 0.1); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, r * 0.9); ctx.lineTo(0, -r * 0.1); ctx.stroke();
  const colors = ['#FF5A5A','#FFD23F','#FF5A5A','#FFD23F','#FF5A5A','#FFD23F'];
  for (let i = 0; i < 6; i++) {
    const a0 = (i / 6) * Math.PI * 2 - Math.PI / 2;
    const a1 = ((i + 1) / 6) * Math.PI * 2 - Math.PI / 2;
    sticker(ctx, (c) => { c.moveTo(0, -r * 0.1); c.arc(0, -r * 0.1, r * 0.92, a0, a1); c.closePath(); }, colors[i], { outline: ow(r) * 0.6 });
  }
  dot(ctx, 0, -r * 0.1, r * 0.11, '#FFFFEE');
  ctx.restore();
}

function drawSurfboard(ctx: CanvasRenderingContext2D, r: number, _t: number, variant = 0) {
  const o = ow(r);
  const boards = ['#FF5A5A','#2BBFFF','#7CFF6B','#FFD23F'];
  const body = boards[variant % boards.length];
  ctx.save();
  ctx.rotate(-Math.PI / 12);
  sticker(ctx, (c) => {
    c.moveTo(0, -r * 1.2);
    c.quadraticCurveTo(r * 0.58, -r * 0.6, r * 0.5, r * 0.4);
    c.quadraticCurveTo(r * 0.2, r * 1.22, 0, r * 1.28);
    c.quadraticCurveTo(-r * 0.2, r * 1.22, -r * 0.5, r * 0.4);
    c.quadraticCurveTo(-r * 0.58, -r * 0.6, 0, -r * 1.2);
  }, body, { outline: o });
  ctx.fillStyle = 'rgba(255,255,255,0.32)';
  ctx.fillRect(-r * 0.11, -r * 0.88, r * 0.22, r * 1.75);
  ctx.restore();
}

function drawPalmTree(ctx: CanvasRenderingContext2D, r: number, t: number) {
  const o = ow(r);
  const sway = wind(t) * 0.08;
  ctx.save();
  ctx.strokeStyle = '#C4894A'; ctx.lineWidth = Math.max(3, r * 0.28); ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, r * 0.85);
  ctx.quadraticCurveTo(r * 0.3, r * 0.1, r * 0.1 + sway * r * 2, -r * 0.9);
  ctx.stroke();
  ctx.restore();
  const cx = r * 0.1 + sway * r * 2, cy = -r * 0.9;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + sway;
    const fx = cx + Math.cos(a) * r * 0.85, fy = cy + Math.sin(a) * r * 0.48;
    sticker(ctx, (c) => {
      c.moveTo(cx, cy);
      c.quadraticCurveTo(cx + Math.cos(a) * r * 0.52, cy + Math.sin(a) * r * 0.28, fx, fy);
      c.quadraticCurveTo(cx + Math.cos(a) * r * 0.56, cy + Math.sin(a) * r * 0.35, cx, cy);
    }, '#4BB85E', { outline: o * 0.65 });
  }
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    dot(ctx, cx + Math.cos(a) * r * 0.2, cy + Math.sin(a) * r * 0.13, r * 0.09, '#8B6914');
  }
}

function drawLifeguardTower(ctx: CanvasRenderingContext2D, r: number, _t: number) {
  const o = ow(r);
  ctx.save();
  ctx.strokeStyle = '#D4A85A'; ctx.lineWidth = Math.max(2, r * 0.12); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-r * 0.38, r); ctx.lineTo(-r * 0.1, -r * 0.4); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(r * 0.38, r); ctx.lineTo(r * 0.1, -r * 0.4); ctx.stroke();
  sticker(ctx, (c) => roundRectPath(c, -r * 0.58, -r * 0.5, r * 1.16, r * 0.2, r * 0.09), '#E0C878', { outline: o });
  sticker(ctx, (c) => roundRectPath(c, -r * 0.4, -r * 0.68, r * 0.8, r * 0.2, r * 0.07), '#FF5A3C', { outline: o });
  ctx.strokeStyle = '#D4A85A'; ctx.lineWidth = Math.max(1.5, r * 0.07);
  ctx.beginPath(); ctx.moveTo(r * 0.36, -r * 0.68); ctx.lineTo(r * 0.36, -r * 1.12); ctx.stroke();
  sticker(ctx, (c) => { c.moveTo(r * 0.36, -r * 1.12); c.lineTo(r * 0.78, -r * 0.98); c.lineTo(r * 0.36, -r * 0.8); c.closePath(); }, '#FF3D68', { outline: o * 0.5 });
  ctx.restore();
  dot(ctx, 0, -r * 1.08, r * 0.13, '#FFD23F');
}

function drawKayakObj(ctx: CanvasRenderingContext2D, r: number, _t: number, variant = 0) {
  const o = ow(r);
  const hullColors = ['#FF5A5A','#2BBFFF','#FFD23F','#7CFF6B'];
  const hull = hullColors[variant % hullColors.length];
  ctx.save();
  ctx.rotate(-Math.PI / 8);
  sticker(ctx, (c) => {
    c.moveTo(0, -r * 1.28); c.quadraticCurveTo(r * 0.62, -r * 0.48, r * 0.58, r * 0.1);
    c.quadraticCurveTo(r * 0.28, r * 1.32, 0, r * 1.38);
    c.quadraticCurveTo(-r * 0.28, r * 1.32, -r * 0.58, r * 0.1);
    c.quadraticCurveTo(-r * 0.62, -r * 0.48, 0, -r * 1.28);
  }, hull, { outline: o });
  sticker(ctx, (c) => { c.ellipse(0, r * 0.08, r * 0.3, r * 0.46, 0, 0, Math.PI * 2); }, 'rgba(20,8,43,0.55)', { outline: o * 0.7 });
  ctx.strokeStyle = '#D4A85A'; ctx.lineWidth = Math.max(2, r * 0.1);
  ctx.beginPath(); ctx.moveTo(-r * 1.02, -r * 0.68); ctx.lineTo(r * 1.02, r * 0.58); ctx.stroke();
  sticker(ctx, (c) => { c.ellipse(-r * 0.98, -r * 0.63, r * 0.22, r * 0.11, -0.4, 0, Math.PI * 2); }, '#4BA0FF', { outline: o * 0.6 });
  sticker(ctx, (c) => { c.ellipse(r * 0.98, r * 0.53, r * 0.22, r * 0.11, -0.4, 0, Math.PI * 2); }, '#4BA0FF', { outline: o * 0.6 });
  ctx.restore();
}

export function drawParkObject(
  ctx: CanvasRenderingContext2D,
  kind: ObjectKind,
  r: number,
  opts: DrawOpts = {}
) {
  const t = opts.t ?? 0;
  const v = opts.variant ?? 0;
  const f = opts.fleeing ?? false;
  switch (kind) {
    case 'apple': return drawApple(ctx, r, t);
    case 'flower': return drawFlower(ctx, r, t, v);
    case 'mushroom': return drawMushroom(ctx, r, t);
    case 'duck': return drawDuck(ctx, r, t, f);
    case 'dog': return drawDog(ctx, r, t, f);
    case 'person': return drawPerson(ctx, r, t, v, f);
    case 'bench': return drawBench(ctx, r, t);
    case 'bush': return drawBush(ctx, r, t);
    case 'car': return drawCar(ctx, r, t, v);
    case 'tree': return drawTree(ctx, r, t);
    case 'fountain': return drawFountain(ctx, r, t);
    case 'foodcart': return drawFoodcart(ctx, r, t);
    case 'gazebo': return drawGazebo(ctx, r, t);
    case 'flowerpot': return drawFlowerpot(ctx, r, t, v);
    case 'gnome': return drawGnome(ctx, r, t);
    case 'mailbox': return drawMailbox(ctx, r, t);
    case 'hydrant': return drawHydrant(ctx, r, t);
    case 'trashcan': return drawTrashcan(ctx, r, t);
    case 'bike': return drawBike(ctx, r, t, v);
    case 'birdbath': return drawBirdbath(ctx, r, t);
    case 'cafetable': return drawCafetable(ctx, r, t, v);
    case 'shed': return drawShed(ctx, r, t, v);
    case 'house': return drawHouse(ctx, r, t, v);
    case 'watertower': return drawWatertower(ctx, r, t);
    // v7 §3 new objects
    case 'cat': return drawCat(ctx, r, t, f);
    case 'squirrel': return drawSquirrel(ctx, r, t);
    case 'bird': return drawBird(ctx, r, t, f);
    case 'trampoline': return drawTrampoline(ctx, r, t);
    case 'drone': return drawDrone(ctx, r, t);
    case 'schoolbus': return drawSchoolbus(ctx, r, t);
    case 'bbq': return drawBBQ(ctx, r, t);
    case 'mower': return drawMower(ctx, r, t);
    case 'hoop': return drawHoop(ctx, r, t);
    case 'icecream': return drawIcecream(ctx, r, t);
    case 'scooter': return drawScooter(ctx, r, t);
    case 'sandbox': return drawSandbox(ctx, r);
    case 'swingset': return drawSwingset(ctx, r);
    case 'slide': return drawSlide(ctx, r);
    case 'seesaw': return drawSeesaw(ctx, r, t);
    case 'school': return drawSchool(ctx, r, t);
    // v12 §1: downtown objects
    case 'shop': return drawShop(ctx, r, t, v);
    case 'library': return drawLibrary(ctx, r, t);
    case 'office': return drawOffice(ctx, r, t, v);
    case 'skyscraper': return drawSkyscraper(ctx, r, t, v);
    // v13 §2: Sandy Shores beach objects
    case 'seashell':    return drawSeashell(ctx, r, t);
    case 'crab':        return drawCrabObj(ctx, r, t, f);
    case 'towel':       return drawTowel(ctx, r, t, v);
    case 'sandcastle':  return drawSandcastle(ctx, r, t);
    case 'umbrella':    return drawUmbrellaObj(ctx, r, t);
    case 'surfboard':   return drawSurfboard(ctx, r, t, v);
    case 'palm':        return drawPalmTree(ctx, r, t);
    case 'lifeguard':   return drawLifeguardTower(ctx, r, t);
    case 'kayak':       return drawKayakObj(ctx, r, t, v);
    case 'car_parked_a': return drawCar(ctx, r, t, 0);
    case 'car_parked_b': return drawCar(ctx, r, t, 2);
    // v16 §1: new civic + downtown sprites (procedural fallbacks)
    case 'cafe':     return drawCafe(ctx, r, t);
    case 'hospital': return drawHospital(ctx, r, t);
    case 'house_c':  return drawHouse(ctx, r, t, 2);
    case 'house_d':  return drawHouse(ctx, r, t, 3);
    // v16 §6: The Guard
    case 'jeep':     return drawJeep(ctx, r, t);
    case 'soldier':  return drawSoldier(ctx, r, t, f);
    // v16.1 C: town hall landmark
    case 'townhall': return drawTownHall(ctx, r, t);
    // v16.1 D: zoo structures
    case 'zoo_gate': return drawZooGate(ctx, r, t);
    case 'zoo_wall': return drawZooWall(ctx, r, t);
    // v16.1 D: zoo animals
    case 'elephant': return drawElephant(ctx, r, t);
    case 'giraffe':  return drawGiraffe(ctx, r, t);
    case 'lion':     return drawLion(ctx, r, t);
    case 'monkey':   return drawMonkey(ctx, r, t, f);
    case 'flamingo': return drawFlamingo(ctx, r, t);
    case 'penguin':  return drawPenguin(ctx, r, t);
    case 'zookeeper': return drawZookeeper(ctx, r, t, f);
    // Feel Patch: debris bit
    case 'bit': return drawBit(ctx, r, t, v);
  }
}

// ── v16 §1: Café — warm storefront with awning and coffee-cup sign ───────────
function drawCafe(ctx: CanvasRenderingContext2D, r: number, t: number) {
  const o = ow(r);
  // base building
  sticker(ctx, (c) => roundRectPath(c, -r * 0.9, -r * 0.7, r * 1.8, r * 1.4, r * 0.08), '#F5E6C8', { outline: o });
  // awning stripes
  sticker(ctx, (c) => {
    c.moveTo(-r * 0.9, -r * 0.55); c.lineTo(r * 0.9, -r * 0.55);
    c.lineTo(r * 0.9, -r * 0.3); c.lineTo(-r * 0.9, -r * 0.3); c.closePath();
  }, '#E23B4E', { outline: o, shadow: false });
  for (let i = 0; i < 3; i++) {
    const x = -r * 0.6 + i * r * 0.6;
    ctx.fillStyle = '#F5E6C8';
    ctx.fillRect(x, -r * 0.55, r * 0.28, r * 0.25);
  }
  // windows
  for (const sx of [-0.5, 0.5]) {
    sticker(ctx, (c) => roundRectPath(c, r * sx - r * 0.24, -r * 0.12, r * 0.46, r * 0.38, r * 0.05), '#BFEAFF', { outline: o, shadow: false });
  }
  // coffee cup sign
  stickerCircle(ctx, 0, -r * 0.82, r * 0.2, '#6E4226', { outline: o });
  dot(ctx, 0, -r * 0.94, r * 0.08, '#FFFFFF');
  // steam waft
  const bob = Math.sin(t / 400) * r * 0.03;
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = Math.max(1, r * 0.04); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(r * -0.08, -r * 0.94 + bob); ctx.quadraticCurveTo(r * 0.04, -r * 1.05 + bob, 0, -r * 1.15 + bob); ctx.stroke();
}

// ── v16 §1: Hospital — white civic building with red cross ────────────────────
function drawHospital(ctx: CanvasRenderingContext2D, r: number, _t: number) {
  const o = ow(r);
  sticker(ctx, (c) => roundRectPath(c, -r * 0.9, -r * 0.9, r * 1.8, r * 1.7, r * 0.06), '#F0F6FF', { outline: o });
  // windows (2 rows)
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 3; col++) {
      const wx = -r * 0.6 + col * r * 0.44;
      const wy = -r * 0.55 + row * r * 0.46;
      sticker(ctx, (c) => roundRectPath(c, wx, wy, r * 0.34, r * 0.3, r * 0.04), '#BFEAFF', { outline: Math.max(1, o * 0.6), shadow: false });
    }
  }
  // entrance
  sticker(ctx, (c) => roundRectPath(c, -r * 0.24, r * 0.38, r * 0.48, r * 0.42, r * 0.04), '#8ECBFF', { outline: o, shadow: false });
  // red cross sign
  const cr = r * 0.26;
  ctx.fillStyle = '#E23B4E';
  ctx.fillRect(-cr * 0.22, -r * 1.0, cr * 0.44, cr);
  ctx.fillRect(-cr * 0.5, -r * 1.0 + cr * 0.28, cr, cr * 0.44);
  ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 1;
  ctx.strokeRect(-cr * 0.22, -r * 1.0, cr * 0.44, cr);
}

// ── v16 §6: Guard — army jeep ─────────────────────────────────────────────────
function drawJeep(ctx: CanvasRenderingContext2D, r: number, t: number) {
  const o = ow(r);
  const roll = t / 500;
  // wheels
  for (const wx of [-0.6, 0.55]) {
    stickerCircle(ctx, r * wx, r * 0.52, r * 0.22, '#2A2A38', { outline: o });
    ctx.save(); ctx.translate(r * wx, r * 0.52); ctx.rotate(roll);
    dot(ctx, 0, 0, r * 0.09, '#6E7080'); ctx.restore();
  }
  // body
  sticker(ctx, (c) => roundRectPath(c, -r * 0.88, -r * 0.2, r * 1.76, r * 0.72, r * 0.08), '#5A7A3A', { outline: o });
  // cab/windshield
  sticker(ctx, (c) => roundRectPath(c, -r * 0.52, -r * 0.62, r * 0.84, r * 0.44, r * 0.08), '#4A6A2A', { outline: o, shadow: false });
  sticker(ctx, (c) => roundRectPath(c, -r * 0.38, -r * 0.54, r * 0.66, r * 0.3, r * 0.05), '#BFEAFF', { outline: Math.max(1, o * 0.7), shadow: false });
  // headlight
  dot(ctx, r * 0.78, -r * 0.05, r * 0.08, '#FFF3B0');
}

// ── v16 §6: Guard — shield soldier ───────────────────────────────────────────
function drawSoldier(ctx: CanvasRenderingContext2D, r: number, t: number, fleeing = false) {
  const o = ow(r);
  // body (green uniform)
  const bob = Math.sin(t / 280) * r * (fleeing ? 0.08 : 0.03);
  sticker(ctx, (c) => c.ellipse(0, r * 0.1 + bob, r * 0.42, r * 0.52, 0, 0, Math.PI * 2), '#5A7A3A', { outline: o });
  // head with helmet
  stickerCircle(ctx, 0, -r * 0.52 + bob, r * 0.34, '#F4C79B', { outline: o });
  sticker(ctx, (c) => { c.arc(0, -r * 0.52 + bob, r * 0.36, Math.PI, 0); c.closePath(); }, '#3A5A2A', { outline: o, shadow: false });
  // round shield (comical braced arms)
  if (!fleeing) {
    ctx.save(); ctx.translate(r * 0.42, r * 0.08 + bob);
    sticker(ctx, (c) => c.arc(0, 0, r * 0.32, 0, Math.PI * 2), '#E8D44D', { outline: o });
    // cross on shield
    ctx.fillStyle = '#E23B4E';
    ctx.fillRect(-r * 0.04, -r * 0.18, r * 0.08, r * 0.36);
    ctx.fillRect(-r * 0.16, -r * 0.04, r * 0.32, r * 0.08);
    ctx.restore();
  }
  // eyes
  dot(ctx, -r * 0.12, -r * 0.54 + bob, r * 0.07, '#1A0B33');
  dot(ctx, r * 0.12, -r * 0.54 + bob, r * 0.07, '#1A0B33');
}
// Temporary file to hold new draw functions for v16.1 — will be appended to objects.ts
// Town hall, zoo structures, zoo animals

// ── v16.1 C: Town Hall — civic landmark, classical columns + pediment ────────
function drawTownHall(ctx: CanvasRenderingContext2D, r: number, _t: number) {
  const o = ow(r);
  // Main building body — cream stone
  sticker(ctx, (c) => roundRectPath(c, -r, -r * 0.8, r * 2, r * 1.6, r * 0.04), '#F2ECD6', { outline: o });
  // Pediment (triangular roof)
  ctx.fillStyle = '#E8DFC8';
  ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = Math.max(1, o);
  ctx.beginPath();
  ctx.moveTo(-r, -r * 0.8); ctx.lineTo(0, -r * 1.4); ctx.lineTo(r, -r * 0.8); ctx.closePath();
  ctx.fill(); ctx.stroke();
  // Columns (4 vertical pillars)
  for (let i = 0; i < 4; i++) {
    const cx2 = -r * 0.72 + i * r * 0.48;
    sticker(ctx, (c) => c.rect(cx2 - r * 0.05, -r * 0.78, r * 0.1, r * 1.3), '#EDE4C8', { outline: Math.max(1, o * 0.6), shadow: false });
  }
  // Windows (2 arched)
  for (const sx of [-0.4, 0.4]) {
    sticker(ctx, (c) => roundRectPath(c, r * sx - r * 0.18, -r * 0.4, r * 0.36, r * 0.52, r * 0.18), '#BFEAFF', { outline: Math.max(1, o * 0.7), shadow: false });
  }
  // Entrance door
  sticker(ctx, (c) => roundRectPath(c, -r * 0.18, r * 0.24, r * 0.36, r * 0.54, r * 0.18), '#8ECBFF', { outline: o, shadow: false });
  // Flag on pediment
  ctx.strokeStyle = '#8A7A5A'; ctx.lineWidth = Math.max(1, r * 0.04); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, -r * 1.4); ctx.lineTo(0, -r * 1.9); ctx.stroke();
  sticker(ctx, (c) => { c.moveTo(0, -r * 1.9); c.lineTo(r * 0.3, -r * 1.72); c.lineTo(0, -r * 1.56); c.closePath(); }, '#E23B4E', { outline: 0.5, shadow: false });
}

// ── v16.1 D: Zoo Gate — arched iron gate, "ZOO" engraved ─────────────────────
function drawZooGate(ctx: CanvasRenderingContext2D, r: number, _t: number) {
  const o = ow(r);
  // Two stone pillars
  for (const sx of [-0.75, 0.75]) {
    sticker(ctx, (c) => roundRectPath(c, r * sx - r * 0.2, -r * 0.9, r * 0.4, r * 1.7, r * 0.06), '#B0A898', { outline: o });
    // Pillar cap
    sticker(ctx, (c) => c.rect(r * sx - r * 0.24, -r * 0.92, r * 0.48, r * 0.14), '#C8BFB0', { outline: o * 0.6, shadow: false });
    // Pillar ball cap
    stickerCircle(ctx, r * sx, -r * 1.1, r * 0.18, '#D0C8B8', { outline: o });
  }
  // Iron arch bar
  ctx.strokeStyle = '#3A3030'; ctx.lineWidth = r * 0.12;
  ctx.beginPath(); ctx.arc(0, -r * 0.2, r * 0.6, Math.PI, 0); ctx.stroke();
  // Gate bars (6 vertical iron bars)
  ctx.lineWidth = r * 0.07; ctx.lineCap = 'round';
  for (let i = -2; i <= 2; i++) {
    ctx.strokeStyle = i % 2 === 0 ? '#2A2020' : '#3A3030';
    ctx.beginPath(); ctx.moveTo(r * i * 0.26, -r * 0.82); ctx.lineTo(r * i * 0.26, r * 0.78); ctx.stroke();
    // spear tips
    ctx.strokeStyle = '#FFD23F'; ctx.lineWidth = r * 0.05;
    ctx.beginPath(); ctx.moveTo(r * i * 0.26, -r * 0.82); ctx.lineTo(r * i * 0.26, -r * 0.96); ctx.stroke();
  }
  // "ZOO" as three colored blocks (stylised sign)
  const letters = [[-0.16, '#8FE36B'], [0, '#FFD23F'], [0.16, '#FF9F1C']];
  for (const [lx, lc] of letters as [number, string][]) {
    sticker(ctx, (c) => c.rect(r * lx - r * 0.06, -r * 0.05, r * 0.12, r * 0.18), lc, { outline: 0.5, shadow: false });
  }
}

// ── v16.1 D: Zoo Wall — concrete wall segment with brick pattern ──────────────
function drawZooWall(ctx: CanvasRenderingContext2D, r: number, _t: number) {
  const o = ow(r);
  // Main wall body — wide, squat
  sticker(ctx, (c) => c.rect(-r, -r * 0.5, r * 2, r * 0.9), '#A8A09A', { outline: o });
  // Brick joints (horizontal)
  ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 1.2;
  for (const ly of [-0.22, 0.08]) {
    ctx.beginPath(); ctx.moveTo(-r, r * ly); ctx.lineTo(r, r * ly); ctx.stroke();
  }
  // Brick joints (vertical, alternating)
  for (let row = 0; row < 3; row++) {
    const offset = row % 2 === 0 ? 0 : r * 0.5;
    for (let bx = -r + offset; bx < r; bx += r * 1.0) {
      ctx.beginPath(); ctx.moveTo(bx, -r * 0.5 + row * r * 0.3); ctx.lineTo(bx, -r * 0.5 + (row + 1) * r * 0.3); ctx.stroke();
    }
  }
}

// ── v16.1 D: Elephant ────────────────────────────────────────────────────────
function drawElephant(ctx: CanvasRenderingContext2D, r: number, _t: number) {
  const o = ow(r);
  // Ears (big ovals behind body)
  sticker(ctx, (c) => c.ellipse(-r * 0.68, -r * 0.1, r * 0.48, r * 0.62, -0.3, 0, Math.PI * 2), '#D0C8C0', { outline: o });
  // Body
  stickerCircle(ctx, 0, r * 0.1, r * 0.82, '#C0B8B0', { outline: o });
  // Ear inner (pink)
  sticker(ctx, (c) => c.ellipse(-r * 0.7, -r * 0.08, r * 0.28, r * 0.4, -0.3, 0, Math.PI * 2), '#E0B8B0', { outline: Math.max(0.5, o * 0.5), shadow: false });
  // Head
  stickerCircle(ctx, r * 0.22, -r * 0.56, r * 0.52, '#C0B8B0', { outline: o });
  // Trunk (curves down)
  ctx.strokeStyle = '#B0A8A0'; ctx.lineWidth = r * 0.22; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(r * 0.52, -r * 0.38); ctx.quadraticCurveTo(r * 0.9, r * 0.1, r * 0.7, r * 0.48); ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = r * 0.06;
  ctx.beginPath(); ctx.moveTo(r * 0.52, -r * 0.38); ctx.quadraticCurveTo(r * 0.9, r * 0.1, r * 0.7, r * 0.48); ctx.stroke();
  // Eyes
  dot(ctx, r * 0.36, -r * 0.7, r * 0.08, '#1A0B33');
  dot(ctx, r * 0.36, -r * 0.7, r * 0.04, '#FFFFFF');
  // Legs (4 stubby)
  for (const [lx, ly] of [[-0.42, 0.82], [-0.14, 0.86], [0.14, 0.86], [0.42, 0.82]] as [number, number][]) {
    sticker(ctx, (c) => roundRectPath(c, r * lx - r * 0.12, r * ly - r * 0.2, r * 0.24, r * 0.3, r * 0.1), '#B8B0A8', { outline: o, shadow: false });
  }
}

// ── v16.1 D: Giraffe ─────────────────────────────────────────────────────────
function drawGiraffe(ctx: CanvasRenderingContext2D, r: number, _t: number) {
  const o = ow(r);
  // Legs (4 long)
  for (const lx of [-0.36, -0.12, 0.12, 0.36]) {
    sticker(ctx, (c) => c.rect(r * lx - r * 0.08, r * 0.38, r * 0.16, r * 0.62), '#D4AA6A', { outline: o * 0.7, shadow: false });
  }
  // Body
  sticker(ctx, (c) => c.ellipse(0, r * 0.22, r * 0.56, r * 0.36, 0, 0, Math.PI * 2), '#E4BA7A', { outline: o });
  // Neck
  sticker(ctx, (c) => {
    c.moveTo(-r * 0.12, -r * 0.1); c.lineTo(r * 0.12, -r * 0.1);
    c.lineTo(r * 0.16, -r * 0.88); c.lineTo(-r * 0.08, -r * 0.88); c.closePath();
  }, '#E4BA7A', { outline: o, shadow: false });
  // Head
  stickerCircle(ctx, 0.05 * r, -r, r * 0.28, '#E4BA7A', { outline: o });
  // Ossicones (horn nubs)
  for (const hx of [-0.1, 0.2]) {
    ctx.fillStyle = '#8A6A3A'; ctx.beginPath(); ctx.ellipse(r * hx, -r * 1.22, r * 0.04, r * 0.1, 0, 0, Math.PI * 2); ctx.fill();
  }
  // Eye
  dot(ctx, r * 0.12, -r * 1.04, r * 0.07, '#1A0B33');
  dot(ctx, r * 0.12, -r * 1.04, r * 0.03, '#FFFFFF');
  // Spots
  ctx.fillStyle = '#C08040'; ctx.globalAlpha = 0.5;
  for (const [sx, sy, sr] of [[0, 0.2, 0.14], [-0.3, 0.1, 0.1], [0.3, 0.28, 0.12], [0.06, -0.5, 0.08]] as [number, number, number][]) {
    ctx.beginPath(); ctx.arc(r * sx, r * sy, r * sr, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ── v16.1 D: Lion ────────────────────────────────────────────────────────────
function drawLion(ctx: CanvasRenderingContext2D, r: number, _t: number) {
  const o = ow(r);
  // Mane (big circle, dark gold)
  stickerCircle(ctx, 0, 0, r * 0.88, '#C47830', { outline: o });
  // Face (lighter circle on top)
  stickerCircle(ctx, 0, 0, r * 0.64, '#E8A850', { outline: o });
  // Ears
  for (const ex of [-0.62, 0.62]) {
    stickerCircle(ctx, r * ex, -r * 0.62, r * 0.24, '#C47830', { outline: o });
    stickerCircle(ctx, r * ex, -r * 0.62, r * 0.14, '#E0907A', { outline: 0, shadow: false });
  }
  // Eyes
  for (const ex of [-0.24, 0.24]) {
    stickerCircle(ctx, r * ex, -r * 0.1, r * 0.12, '#D4AA4A', { outline: o * 0.6 });
    dot(ctx, r * ex, -r * 0.1, r * 0.06, '#1A0B33');
  }
  // Nose
  sticker(ctx, (c) => c.ellipse(0, r * 0.18, r * 0.1, r * 0.07, 0, 0, Math.PI * 2), '#E87060', { outline: o * 0.6 });
  // Whiskers
  ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = r * 0.03; ctx.lineCap = 'round';
  for (const wy of [0.12, 0.22]) {
    ctx.beginPath(); ctx.moveTo(-r * 0.18, r * wy); ctx.lineTo(-r * 0.54, r * wy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(r * 0.18, r * wy); ctx.lineTo(r * 0.54, r * wy); ctx.stroke();
  }
  // Tail tuft
  stickerCircle(ctx, r * 0.92, r * 0.7, r * 0.2, '#C47830', { outline: o });
}

// ── v16.1 D: Monkey ───────────────────────────────────────────────────────────
function drawMonkey(ctx: CanvasRenderingContext2D, r: number, t: number, fleeing = false) {
  const o = ow(r);
  const bob = Math.sin(t / 340) * r * (fleeing ? 0.1 : 0.04);
  // Body
  stickerCircle(ctx, 0, r * 0.22 + bob, r * 0.5, '#8A6040', { outline: o });
  // Ears
  for (const ex of [-0.6, 0.6]) {
    stickerCircle(ctx, r * ex, -r * 0.32 + bob, r * 0.2, '#8A6040', { outline: o });
    stickerCircle(ctx, r * ex, -r * 0.32 + bob, r * 0.12, '#C89070', { outline: 0, shadow: false });
  }
  // Head
  stickerCircle(ctx, 0, -r * 0.42 + bob, r * 0.42, '#8A6040', { outline: o });
  // Face patch
  stickerCircle(ctx, 0, -r * 0.34 + bob, r * 0.28, '#C89070', { outline: 0, shadow: false });
  // Eyes
  dot(ctx, -r * 0.14, -r * 0.52 + bob, r * 0.08, '#1A0B33');
  dot(ctx, r * 0.14, -r * 0.52 + bob, r * 0.08, '#1A0B33');
  dot(ctx, -r * 0.12, -r * 0.54 + bob, r * 0.03, '#FFFFFF');
  dot(ctx, r * 0.12, -r * 0.54 + bob, r * 0.03, '#FFFFFF');
  // Tail (curved)
  ctx.strokeStyle = '#8A6040'; ctx.lineWidth = r * 0.12; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(r * 0.42, r * 0.6 + bob); ctx.quadraticCurveTo(r * 0.9, r * 0.5 + bob, r * 0.8, r * 0.0 + bob); ctx.stroke();
  // Arms (long)
  for (const [ax, ay] of [[-0.7, 0.42], [0.7, 0.42]] as [number, number][]) {
    ctx.beginPath(); ctx.moveTo(r * (ax > 0 ? 0.42 : -0.42), r * 0.14 + bob); ctx.lineTo(r * ax, r * ay + bob); ctx.stroke();
  }
}

// ── v16.1 D: Flamingo ────────────────────────────────────────────────────────
function drawFlamingo(ctx: CanvasRenderingContext2D, r: number, t: number) {
  const o = ow(r);
  const sway = Math.sin(t / 800) * r * 0.04;
  // Leg (one leg stance)
  ctx.strokeStyle = '#FF8A78'; ctx.lineWidth = r * 0.08; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(sway, r * 0.68); ctx.lineTo(sway, r * 0.98); ctx.stroke();
  // Foot
  ctx.strokeStyle = '#FF7060'; ctx.lineWidth = r * 0.05;
  for (const a of [-0.4, 0, 0.4]) {
    ctx.beginPath(); ctx.moveTo(sway, r * 0.98); ctx.lineTo(sway + r * 0.22 * Math.cos(a + 0.5), r * 0.98 + r * 0.14 * Math.sin(a + 0.5)); ctx.stroke();
  }
  // Body (oval, tilted)
  sticker(ctx, (c) => c.ellipse(sway, r * 0.28, r * 0.44, r * 0.28, 0.3, 0, Math.PI * 2), '#FF88C8', { outline: o });
  // Neck (S-curve, pink)
  ctx.strokeStyle = '#FF88C8'; ctx.lineWidth = r * 0.2; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(sway + r * 0.22, r * 0.08); ctx.quadraticCurveTo(sway + r * 0.5, -r * 0.3, sway + r * 0.18, -r * 0.68); ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,0.1)'; ctx.lineWidth = r * 0.06;
  ctx.beginPath(); ctx.moveTo(sway + r * 0.22, r * 0.08); ctx.quadraticCurveTo(sway + r * 0.5, -r * 0.3, sway + r * 0.18, -r * 0.68); ctx.stroke();
  // Head
  stickerCircle(ctx, sway + r * 0.18, -r * 0.76, r * 0.22, '#FF88C8', { outline: o });
  // Beak (bent downward, yellow-tipped)
  ctx.strokeStyle = '#F0B830'; ctx.lineWidth = r * 0.1;
  ctx.beginPath(); ctx.moveTo(sway + r * 0.32, -r * 0.72); ctx.quadraticCurveTo(sway + r * 0.58, -r * 0.8, sway + r * 0.52, -r * 0.9); ctx.stroke();
  ctx.strokeStyle = '#1A1A2A'; ctx.lineWidth = r * 0.05;
  ctx.beginPath(); ctx.moveTo(sway + r * 0.32, -r * 0.72); ctx.lineTo(sway + r * 0.52, -r * 0.9); ctx.stroke();
  // Eye
  dot(ctx, sway + r * 0.26, -r * 0.8, r * 0.07, '#1A0B33');
}

// ── Feel Patch: Bit — tiny sparkly debris crumb, always edible ───────────────
function drawBit(ctx: CanvasRenderingContext2D, r: number, _t: number, variant = 0) {
  const colors = ['#FF6FB0', '#FFD23F', '#8ECBFF', '#7EE8A2', '#C9A6FF', '#FF9F1C'];
  const col = colors[Math.abs(variant) % colors.length];
  const o = Math.max(0.8, r * 0.18);
  stickerCircle(ctx, 0, 0, r * 0.82, col, { outline: o });
  dot(ctx, -r * 0.2, -r * 0.25, r * 0.3, 'rgba(255,255,255,0.52)');
}

// ── v16.1 D: Penguin ─────────────────────────────────────────────────────────
function drawPenguin(ctx: CanvasRenderingContext2D, r: number, t: number) {
  const o = ow(r);
  const waddle = Math.sin(t / 380) * r * 0.04;
  // Body (black back, oval)
  sticker(ctx, (c) => c.ellipse(waddle, r * 0.08, r * 0.52, r * 0.72, 0, 0, Math.PI * 2), '#1A1A2E', { outline: o });
  // White belly patch
  sticker(ctx, (c) => c.ellipse(waddle, r * 0.16, r * 0.3, r * 0.5, 0, 0, Math.PI * 2), '#F5F2F0', { outline: 0, shadow: false });
  // Head
  stickerCircle(ctx, waddle, -r * 0.6, r * 0.38, '#1A1A2E', { outline: o });
  // White face patch
  sticker(ctx, (c) => c.ellipse(waddle, -r * 0.58, r * 0.22, r * 0.28, 0, 0, Math.PI * 2), '#F5F2F0', { outline: 0, shadow: false });
  // Eyes
  for (const ex of [-0.14, 0.14]) {
    dot(ctx, waddle + r * ex, -r * 0.68, r * 0.08, '#1A0B33');
    dot(ctx, waddle + r * ex, -r * 0.7, r * 0.03, '#FFFFFF');
  }
  // Orange beak
  sticker(ctx, (c) => c.ellipse(waddle, -r * 0.44, r * 0.1, r * 0.07, 0, 0, Math.PI * 2), '#FF9F1C', { outline: o * 0.6 });
  // Flippers
  for (const [fx, fy] of [[-0.58, -0.08], [0.58 + waddle * 2, -0.08]] as [number, number][]) {
    sticker(ctx, (c) => c.ellipse(r * fx, r * fy, r * 0.14, r * 0.36, fx < 0 ? 0.5 : -0.5, 0, Math.PI * 2), '#1A1A2E', { outline: o * 0.7, shadow: false });
  }
  // Feet
  for (const fx2 of [-0.2, 0.2]) {
    sticker(ctx, (c) => c.ellipse(waddle + r * fx2, r * 0.8, r * 0.18, r * 0.1, 0, 0, Math.PI * 2), '#FF9F1C', { outline: o * 0.5, shadow: false });
  }
}

// ── v16.1 D: Zookeeper — person variant in khaki uniform + bucket hat ────────
function drawZookeeper(ctx: CanvasRenderingContext2D, r: number, t: number, fleeing = false) {
  const o = ow(r);
  const bob = Math.sin(t / 300) * r * (fleeing ? 0.1 : 0.04);
  // Body (khaki uniform)
  sticker(ctx, (c) => c.ellipse(0, r * 0.22 + bob, r * 0.38, r * 0.46, 0, 0, Math.PI * 2), '#B8A870', { outline: o });
  // Head
  stickerCircle(ctx, 0, -r * 0.46 + bob, r * 0.36, '#F4C79B', { outline: o });
  // Bucket hat (khaki, wider brim)
  sticker(ctx, (c) => roundRectPath(c, -r * 0.44, -r * 0.76 + bob, r * 0.88, r * 0.22, r * 0.04), '#B8A870', { outline: o, shadow: false });
  sticker(ctx, (c) => roundRectPath(c, -r * 0.34, -r * 1.0 + bob, r * 0.68, r * 0.26, r * 0.08), '#B8A870', { outline: o, shadow: false });
  // Hat band (dark stripe)
  ctx.fillStyle = '#7A6A3A';
  ctx.fillRect(-r * 0.34, -r * 0.76 + bob, r * 0.68, r * 0.06);
  // Eyes
  dot(ctx, -r * 0.12, -r * 0.54 + bob, r * 0.07, '#1A0B33');
  dot(ctx, r * 0.12, -r * 0.54 + bob, r * 0.07, '#1A0B33');
}
