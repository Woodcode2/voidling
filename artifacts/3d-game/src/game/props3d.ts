/**
 * props3d.ts — procedural hole.io-style life layer: people, vehicles, trees.
 *
 * "Push away from old clay art": the three things visible in every frame —
 * pedestrians, traffic, vegetation — are now drawn programmatically in the
 * same crisp flat-shaded language as the extruded buildings, then INJECTED
 * into the shared sprite maps at init. Everything downstream (rotation,
 * pedestrian bob, capture tumble, swallow ghosts, aspect-correct draws,
 * shadows) works unchanged because these are just sprites to the pipeline.
 *
 * All generation is synchronous canvas drawing — no fetches, no pop-in.
 */

import { objectSprites, spriteBounds, spriteAspect } from './sprites';

const put = (key: string, cvs: HTMLCanvasElement, contentW: number, contentH: number) => {
  // square foot-anchored pad, same contract as the clay cutout pipeline
  const S = Math.max(cvs.width, cvs.height);
  const sq = document.createElement('canvas');
  sq.width = S; sq.height = S;
  sq.getContext('2d')!.drawImage(cvs, Math.round((S - cvs.width) / 2), S - cvs.height);
  (objectSprites as Map<string, HTMLImageElement | HTMLCanvasElement>).set(key, sq);
  spriteBounds.set(key, { x: 0, y: 0, w: 1, h: 1 });
  spriteAspect.set(key, contentW / contentH);
};

const rr = (g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
};

// ── PEOPLE ────────────────────────────────────────────────────────────────────
// Minifigs seen from the game's high tilt: head over shoulders, capsule body,
// small legs. 12 variants: everyday palettes + worker/vendor/guard specials.

interface PersonDef { shirt: string; pants: string; skin: string; hair: string; hat?: string; apron?: boolean; vis?: boolean }
const SKINS = ['#F2C7A8', '#E3AC84', '#C98D62', '#9C6B48'];
const PEOPLE: PersonDef[] = [
  { shirt: '#E85D6A', pants: '#3E4A5C', skin: SKINS[0], hair: '#3B3230' },
  { shirt: '#4FA3D9', pants: '#5C6470', skin: SKINS[1], hair: '#20180F' },
  { shirt: '#69C48E', pants: '#3E4A5C', skin: SKINS[2], hair: '#4A2F20' },
  { shirt: '#F2B34C', pants: '#4E5A6E', skin: SKINS[3], hair: '#171310' },
  { shirt: '#B07FD9', pants: '#3E4A5C', skin: SKINS[0], hair: '#8A5A2E' },
  { shirt: '#F28BB4', pants: '#EDE7DA', skin: SKINS[1], hair: '#C9A24C' },
  { shirt: '#5CC9C0', pants: '#4E5A6E', skin: SKINS[2], hair: '#2E2723' },
  { shirt: '#EDE7DA', pants: '#7A8494', skin: SKINS[3], hair: '#3B3230' },
  // specials (index stable — structureSpriteKey maps kinds here)
  { shirt: '#F7F7F7', pants: '#26292E', skin: SKINS[1], hair: '#2E2723', apron: true },        // 8 waiter
  { shirt: '#FFFFFF', pants: '#C46A4F', skin: SKINS[0], hair: '#3B3230', hat: '#F2E6D0' },     // 9 vendor
  { shirt: '#39465C', pants: '#2C3646', skin: SKINS[2], hair: '#171310', hat: '#39465C' },     // 10 guard/soldier
  { shirt: '#F79B2E', pants: '#4E5A6E', skin: SKINS[3], hair: '#20180F', hat: '#F2D22E', vis: true }, // 11 construction
];

function makePerson(def: PersonDef): HTMLCanvasElement {
  const W = 56, H = 112;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  const cx = W / 2;
  const dk = (hex: string) => {
    const h = hex.replace('#', '');
    const f = (i: number) => Math.round(parseInt(h.slice(i, i + 2), 16) * 0.78);
    return `rgb(${f(0)},${f(2)},${f(4)})`;
  };
  // legs
  g.fillStyle = def.pants;
  rr(g, cx - 13, 74, 11, 34, 5); g.fill();
  rr(g, cx + 2, 74, 11, 34, 5); g.fill();
  // shoes
  g.fillStyle = '#2A2E36';
  rr(g, cx - 14, 102, 13, 8, 4); g.fill();
  rr(g, cx + 1, 102, 13, 8, 4); g.fill();
  // arms (slightly darker shirt)
  g.fillStyle = dk(def.shirt);
  rr(g, cx - 24, 40, 10, 32, 5); g.fill();
  rr(g, cx + 14, 40, 10, 32, 5); g.fill();
  // hands
  g.fillStyle = def.skin;
  g.beginPath(); g.arc(cx - 19, 74, 4.5, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.arc(cx + 19, 74, 4.5, 0, Math.PI * 2); g.fill();
  // torso
  g.fillStyle = def.shirt;
  rr(g, cx - 16, 34, 32, 46, 12); g.fill();
  if (def.vis) { // hi-vis stripes
    g.fillStyle = '#FFF3B8';
    g.fillRect(cx - 16, 48, 32, 5);
    g.fillRect(cx - 16, 60, 32, 5);
  }
  if (def.apron) {
    g.fillStyle = '#FFFFFF';
    rr(g, cx - 10, 48, 20, 30, 4); g.fill();
  }
  // torso bottom shade
  g.fillStyle = 'rgba(0,0,0,0.10)';
  rr(g, cx - 16, 68, 32, 12, 8); g.fill();
  // head
  g.fillStyle = def.skin;
  g.beginPath(); g.arc(cx, 20, 15, 0, Math.PI * 2); g.fill();
  // hair cap (or hat)
  if (def.hat) {
    g.fillStyle = def.hat;
    g.beginPath(); g.arc(cx, 17, 15.5, Math.PI, 0); g.fill();
    g.fillRect(cx - 15.5, 15, 31, 4);
  } else {
    g.fillStyle = def.hair;
    g.beginPath(); g.arc(cx, 17, 15, Math.PI * 0.95, Math.PI * 0.05); g.fill();
  }
  return c;
}

// ── VEHICLES ─────────────────────────────────────────────────────────────────
// Top-view bodies facing UP (nose at top) — the rotation path expects that.
// Crisp rounded shells, glass canopy, wheel stubs; long service vehicles.

function vehBase(L: number, W: number) {
  const c = document.createElement('canvas');
  c.width = W; c.height = L;
  return { c, g: c.getContext('2d')! };
}

function wheels(g: CanvasRenderingContext2D, W: number, L: number, n = 2) {
  g.fillStyle = '#23262C';
  const ys = n === 2 ? [L * 0.20, L * 0.68] : [L * 0.16, L * 0.46, L * 0.74];
  for (const y of ys) {
    rr(g, -1, y, 6, L * 0.14, 3); g.fill();
    rr(g, W - 5, y, 6, L * 0.14, 3); g.fill();
  }
}

function makeCar(body: string, roof: string): HTMLCanvasElement {
  const L = 96, W = 52;
  const { c, g } = vehBase(L, W);
  wheels(g, W, L);
  g.fillStyle = body;
  rr(g, 3, 2, W - 6, L - 4, 14); g.fill();
  // windshield + rear glass + roof
  g.fillStyle = '#BFE2F2';
  rr(g, 8, L * 0.24, W - 16, L * 0.14, 5); g.fill();
  rr(g, 8, L * 0.66, W - 16, L * 0.10, 5); g.fill();
  g.fillStyle = roof;
  rr(g, 8, L * 0.38, W - 16, L * 0.28, 7); g.fill();
  // hood/trunk shade + headlights
  g.fillStyle = 'rgba(0,0,0,0.08)';
  rr(g, 3, L * 0.80, W - 6, L * 0.16, 8); g.fill();
  g.fillStyle = '#FFF3B8';
  rr(g, 8, 3, 9, 5, 2); g.fill();
  rr(g, W - 17, 3, 9, 5, 2); g.fill();
  return c;
}

function makeTaxi(): HTMLCanvasElement {
  const c = makeCar('#F2C230', '#E0B02A');
  const g = c.getContext('2d')!;
  // checker band + rooftop sign
  g.fillStyle = '#26292E';
  for (let i = 0; i < 5; i++) g.fillRect(10 + i * 8, c.height * 0.44, 4, 4);
  g.fillStyle = '#FFFFFF';
  g.fillRect(c.width / 2 - 7, c.height * 0.49, 14, 6);
  return c;
}

function makePolice(): HTMLCanvasElement {
  const c = makeCar('#F4F6F8', '#DDE3E8');
  const g = c.getContext('2d')!;
  g.fillStyle = '#3B5F8F';                       // side band
  g.fillRect(3, c.height * 0.52, c.width - 6, 8);
  g.fillStyle = '#E8453C'; g.fillRect(c.width / 2 - 8, c.height * 0.42, 7, 6);
  g.fillStyle = '#3F7BD9'; g.fillRect(c.width / 2 + 1, c.height * 0.42, 7, 6);
  return c;
}

function makeAmbulance(): HTMLCanvasElement {
  const L = 116, W = 58;
  const { c, g } = vehBase(L, W);
  wheels(g, W, L);
  g.fillStyle = '#F7F9FA';
  rr(g, 3, 2, W - 6, L - 4, 10); g.fill();
  g.fillStyle = '#BFE2F2';
  rr(g, 9, L * 0.14, W - 18, L * 0.10, 4); g.fill(); // windshield
  g.fillStyle = '#E8453C';
  g.fillRect(3, L * 0.30, W - 6, 7);                 // red band
  // roof cross
  g.fillStyle = '#E8453C';
  g.fillRect(W / 2 - 4, L * 0.52, 8, 26);
  g.fillRect(W / 2 - 13, L * 0.60, 26, 8);
  g.fillStyle = '#3F7BD9';
  g.fillRect(W / 2 - 8, L * 0.06, 16, 5);            // lightbar
  return c;
}

function makeFiretruck(): HTMLCanvasElement {
  const L = 132, W = 60;
  const { c, g } = vehBase(L, W);
  wheels(g, W, L, 3);
  g.fillStyle = '#E03A30';
  rr(g, 3, 2, W - 6, L - 4, 9); g.fill();
  g.fillStyle = '#BFE2F2';
  rr(g, 9, L * 0.12, W - 18, L * 0.10, 4); g.fill();
  // roof ladder
  g.fillStyle = '#D9DEE4';
  g.fillRect(W / 2 - 8, L * 0.34, 16, L * 0.55);
  g.fillStyle = '#9AA2AC';
  for (let i = 0; i < 6; i++) g.fillRect(W / 2 - 8, L * 0.38 + i * L * 0.085, 16, 3);
  g.fillStyle = '#F2D22E';
  g.fillRect(3, L - 10, W - 6, 6);                   // rear chevron
  g.fillStyle = '#3F7BD9';
  g.fillRect(W / 2 - 8, L * 0.05, 16, 5);
  return c;
}

function makeSchoolbus(): HTMLCanvasElement {
  const L = 128, W = 56;
  const { c, g } = vehBase(L, W);
  wheels(g, W, L, 3);
  g.fillStyle = '#F2B02E';
  rr(g, 3, 2, W - 6, L - 4, 9); g.fill();
  g.fillStyle = '#BFE2F2';
  rr(g, 9, L * 0.10, W - 18, L * 0.09, 4); g.fill();
  g.fillStyle = 'rgba(0,0,0,0.16)';                  // roof hatches
  g.fillRect(W / 2 - 7, L * 0.34, 14, 10);
  g.fillRect(W / 2 - 7, L * 0.60, 14, 10);
  g.fillStyle = '#26292E';
  g.fillRect(3, L * 0.26, W - 6, 4);                 // black rub rails
  g.fillRect(3, L * 0.82, W - 6, 4);
  return c;
}

// ── VEGETATION ───────────────────────────────────────────────────────────────

function makeTree(base: string, light: string, seed: number): HTMLCanvasElement {
  const Wd = 104, H = 118;
  const c = document.createElement('canvas');
  c.width = Wd; c.height = H;
  const g = c.getContext('2d')!;
  // trunk
  g.fillStyle = '#8C7B6C';
  rr(g, Wd / 2 - 6, H - 30, 12, 30, 4); g.fill();
  g.fillStyle = 'rgba(0,0,0,0.14)';
  rr(g, Wd / 2 + 1, H - 30, 5, 30, 3); g.fill();
  // canopy: clustered blobs, dark base + light top-left highlight per blob
  const blobs: [number, number, number][] = [
    [Wd / 2, 44, 36],
    [Wd / 2 - 26 - (seed % 6), 58, 26],
    [Wd / 2 + 25 + (seed % 5), 56, 27],
    [Wd / 2 - 4, 70, 28],
  ];
  g.fillStyle = base;
  for (const [x, y, r] of blobs) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = light;
  for (const [x, y, r] of blobs) { g.beginPath(); g.arc(x - r * 0.26, y - r * 0.30, r * 0.62, 0, Math.PI * 2); g.fill(); }
  return c;
}

function makePine(dark: string, mid: string): HTMLCanvasElement {
  const Wd = 84, H = 128;
  const c = document.createElement('canvas');
  c.width = Wd; c.height = H;
  const g = c.getContext('2d')!;
  g.fillStyle = '#8C7B6C';
  rr(g, Wd / 2 - 5, H - 22, 10, 22, 3); g.fill();
  // three stacked rounded tiers
  const tier = (y: number, w: number, h: number, col: string) => {
    g.fillStyle = col;
    g.beginPath();
    g.moveTo(Wd / 2, y);
    g.quadraticCurveTo(Wd / 2 + w * 0.9, y + h, Wd / 2 + w, y + h);
    g.lineTo(Wd / 2 - w, y + h);
    g.quadraticCurveTo(Wd / 2 - w * 0.9, y + h, Wd / 2, y);
    g.closePath(); g.fill();
  };
  tier(52, 38, 56, dark);
  tier(28, 30, 48, mid);
  tier(8, 22, 38, dark);
  // snow-light rim on the top tier
  g.fillStyle = 'rgba(255,255,255,0.18)';
  tier(8, 22, 14, 'rgba(255,255,255,0.16)');
  return c;
}

function makeBush(base: string, light: string): HTMLCanvasElement {
  const Wd = 84, H = 54;
  const c = document.createElement('canvas');
  c.width = Wd; c.height = H;
  const g = c.getContext('2d')!;
  const blobs: [number, number, number][] = [
    [24, 34, 19], [46, 28, 22], [64, 36, 16],
  ];
  g.fillStyle = base;
  for (const [x, y, r] of blobs) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = light;
  for (const [x, y, r] of blobs) { g.beginPath(); g.arc(x - r * 0.25, y - r * 0.3, r * 0.6, 0, Math.PI * 2); g.fill(); }
  return c;
}

function makePalm(): HTMLCanvasElement {
  const Wd = 120, H = 132;
  const c = document.createElement('canvas');
  c.width = Wd; c.height = H;
  const g = c.getContext('2d')!;
  // curved trunk
  g.strokeStyle = '#A8927C';
  g.lineWidth = 11;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(Wd / 2 - 14, H - 4);
  g.quadraticCurveTo(Wd / 2 + 2, H - 60, Wd / 2 + 14, 38);
  g.stroke();
  // fronds
  const fx = Wd / 2 + 14, fy = 34;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.35;
    const ex = fx + Math.cos(a) * 40, ey = fy + Math.sin(a) * 24 - 6;
    g.strokeStyle = i % 2 ? '#57A46B' : '#6BBF80';
    g.lineWidth = 9;
    g.beginPath();
    g.moveTo(fx, fy);
    g.quadraticCurveTo((fx + ex) / 2, Math.min(fy, ey) - 12, ex, ey);
    g.stroke();
  }
  // coconuts
  g.fillStyle = '#8C7B6C';
  g.beginPath(); g.arc(fx - 5, fy + 4, 5, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.arc(fx + 6, fy + 6, 5, 0, Math.PI * 2); g.fill();
  return c;
}

function makeWatertower(): HTMLCanvasElement {
  const Wd = 100, H = 150;
  const c = document.createElement('canvas');
  c.width = Wd; c.height = H;
  const g = c.getContext('2d')!;
  const cx = Wd / 2;
  // legs (trestle)
  g.strokeStyle = '#7C8694';
  g.lineWidth = 7;
  g.lineCap = 'round';
  g.beginPath(); g.moveTo(cx - 30, H - 4); g.lineTo(cx - 14, 62); g.stroke();
  g.beginPath(); g.moveTo(cx + 30, H - 4); g.lineTo(cx + 14, 62); g.stroke();
  g.lineWidth = 4;
  g.beginPath(); g.moveTo(cx - 24, H - 34); g.lineTo(cx + 24, H - 34); g.stroke();
  g.beginPath(); g.moveTo(cx - 26, H - 34); g.lineTo(cx + 20, 70); g.stroke();
  // tank
  g.fillStyle = '#C8B48E';
  rr(g, cx - 34, 18, 68, 52, 12); g.fill();
  g.fillStyle = 'rgba(0,0,0,0.10)';
  rr(g, cx + 6, 18, 28, 52, 12); g.fill();
  // bands
  g.strokeStyle = 'rgba(90,70,40,0.5)';
  g.lineWidth = 2.5;
  g.beginPath(); g.moveTo(cx - 34, 34); g.lineTo(cx + 34, 34); g.stroke();
  g.beginPath(); g.moveTo(cx - 34, 54); g.lineTo(cx + 34, 54); g.stroke();
  // conical cap
  g.fillStyle = '#8FA3B7';
  g.beginPath();
  g.moveTo(cx - 38, 20);
  g.lineTo(cx, 0);
  g.lineTo(cx + 38, 20);
  g.closePath(); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.25)';
  g.beginPath(); g.moveTo(cx - 38, 20); g.lineTo(cx, 0); g.lineTo(cx - 6, 20); g.closePath(); g.fill();
  return c;
}

// ── INIT ─────────────────────────────────────────────────────────────────────

let _done = false;
export function initProps3d(): void {
  if (_done) return;
  _done = true;

  PEOPLE.forEach((def, i) => {
    const cvs = makePerson(def);
    put(`p3d_person_${i}`, cvs, cvs.width, cvs.height);
  });

  const sedans = [
    makeCar('#D9534F', '#B94743'), makeCar('#4F8FD9', '#3F76B5'),
    makeCar('#58BB9A', '#46997E'), makeCar('#E8875C', '#C26F4A'),
    makeCar('#8E7DD9', '#7566B5'),
  ];
  sedans.forEach((cvs, i) => put(`p3d_veh_${i}`, cvs, cvs.width, cvs.height));
  put('p3d_taxi', makeTaxi(), 52, 96);
  put('p3d_police', makePolice(), 52, 96);
  put('p3d_ambulance', makeAmbulance(), 58, 116);
  put('p3d_firetruck', makeFiretruck(), 60, 132);
  put('p3d_schoolbus', makeSchoolbus(), 56, 128);

  const trees = [
    makeTree('#5FA05F', '#7CBE72', 1), makeTree('#549456', '#72B368', 4),
    makeTree('#68AC60', '#86C878', 7), makeTree('#4E8C54', '#6AAA64', 9),
  ];
  trees.forEach((cvs, i) => put(`p3d_tree_${i}`, cvs, cvs.width, cvs.height));
  put('p3d_pine_0', makePine('#3E7A4C', '#4E9059'), 84, 128);
  put('p3d_pine_1', makePine('#356E44', '#468552'), 84, 128);
  put('p3d_bush_0', makeBush('#5FA05F', '#7CBE72'), 84, 54);
  put('p3d_bush_1', makeBush('#549456', '#72B368'), 84, 54);
  put('p3d_palm', makePalm(), 120, 132);
  put('p3d_watertower', makeWatertower(), 100, 150);

  console.log('[props3d] procedural life layer ready — people=12 vehicles=10 trees=4 pines=2 bushes=2 palm=1');
}
