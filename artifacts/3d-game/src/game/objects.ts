// Real toy-park objects, drawn in the "Electric Pop" sticker style.
// Every function draws centered at the origin (0,0), sized to fit within radius r.
// The same functions are reused at tiny scale as orbit icons.
import type { ObjectKind } from './config';
import { sticker, stickerCircle, stickerEllipse, highlight, dot, roundRectPath } from './draw';

// outline width scales down for tiny icons so small objects don't turn into blobs
function ow(r: number) {
  return Math.max(1.3, Math.min(3, r * 0.16));
}

// deterministic palette pick
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
  const sway = Math.sin(t / 700 + variant) * 0.12;
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
  // legs
  for (const lx of [-0.4, 0.35]) {
    sticker(ctx, (c) => roundRectPath(c, r * lx, r * 0.35, r * 0.22, r * 0.5, r * 0.08), dark, { outline: o, shadow: false });
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
  const swing = Math.sin(t / (fleeing ? 120 : 320)) * r * 0.12;
  // legs
  sticker(ctx, (c) => roundRectPath(c, -r * 0.28, r * 0.25, r * 0.22, r * 0.6 + swing, r * 0.08), '#3B4A63', { outline: o });
  sticker(ctx, (c) => roundRectPath(c, r * 0.06, r * 0.25, r * 0.22, r * 0.6 - swing, r * 0.08), '#3B4A63', { outline: o, shadow: false });
  // body
  sticker(ctx, (c) => roundRectPath(c, -r * 0.4, -r * 0.35, r * 0.8, r * 0.72, r * 0.2), shirt, { outline: o });
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
  const o = ow(r);
  const sway = Math.sin(t / 900) * r * 0.03;
  const g = '#2FA55A';
  sticker(ctx, (c) => {
    c.arc(-r * 0.5 + sway, r * 0.1, r * 0.52, 0, Math.PI * 2);
    c.arc(r * 0.5 + sway, r * 0.1, r * 0.52, 0, Math.PI * 2);
    c.arc(0 + sway, -r * 0.3, r * 0.6, 0, Math.PI * 2);
  }, g, { outline: o });
  highlight(ctx, -r * 0.25, -r * 0.35, r * 0.5, 0.25);
  dot(ctx, r * 0.1, r * 0.0, r * 0.1, '#FF6FB0');
  dot(ctx, -r * 0.35, r * 0.18, r * 0.09, '#FFD23F');
}

// ── T4 ───────────────────────────────────────────────────────────────────────
function drawCar(ctx: CanvasRenderingContext2D, r: number, t: number, variant = 0) {
  const o = ow(r);
  const body = pick(['#FF3D68', '#2D9CDB', '#FFD23F', '#9B5DE5', '#33C46B'], variant);
  const roll = t / 400;
  // wheels
  for (const wx of [-0.52, 0.52]) {
    stickerCircle(ctx, r * wx, r * 0.42, r * 0.24, '#22222C', { outline: o });
    ctx.save();
    ctx.translate(r * wx, r * 0.42);
    ctx.rotate(roll);
    dot(ctx, 0, 0, r * 0.1, '#C9CCD6');
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
  const o = ow(r);
  const sway = Math.sin(t / 1100) * r * 0.04;
  // trunk
  sticker(ctx, (c) => roundRectPath(c, -r * 0.16, r * 0.05, r * 0.32, r * 0.8, r * 0.08), '#8A5A2E', { outline: o });
  // canopy
  ctx.save();
  ctx.translate(sway, 0);
  sticker(ctx, (c) => {
    c.arc(-r * 0.42, -r * 0.15, r * 0.5, 0, Math.PI * 2);
    c.arc(r * 0.42, -r * 0.15, r * 0.5, 0, Math.PI * 2);
    c.arc(0, -r * 0.55, r * 0.56, 0, Math.PI * 2);
    c.arc(0, -r * 0.1, r * 0.5, 0, Math.PI * 2);
  }, '#33B463', { outline: o });
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

// ── Dispatcher ─────────────────────────────────────────────────────────────
export interface DrawOpts {
  t?: number;
  fleeing?: boolean;
  variant?: number;
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
  }
}
