/**
 * props3d2.ts — procedural flat-shaded sprites, wave 2.
 *
 * Replaces the remaining photographic "clay" cutouts — military/defense
 * vehicles and beach/park furniture — with crisp vector sprites in the same
 * hole.io-inspired language as props3d.ts / animals3d.ts: chunky silhouettes,
 * flat 2-tone shading (base + light top highlight / dark bottom shade), no
 * gradients, no faces. Sprites are injected into the shared maps at init so
 * everything downstream (rotation, capture tumble, shadows, aspect-correct
 * draws) works unchanged.
 *
 * Vehicles are top-view bodies FACING UP (nose at top) — the rotation path
 * expects that. All generation is synchronous canvas drawing — no fetches.
 */

import { objectSprites, spriteBounds, spriteAspect } from './sprites';

const TAU = Math.PI * 2;

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

const cv = (w: number, h: number) => {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return { c, g: c.getContext('2d')! };
};

const tri = (g: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, col: string) => {
  g.fillStyle = col;
  g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.lineTo(x3, y3); g.closePath(); g.fill();
};

const dot = (g: CanvasRenderingContext2D, x: number, y: number, r: number, col: string) => {
  g.fillStyle = col;
  g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
};

const seg = (g: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, w: number, col: string) => {
  g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round';
  g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
};

const star5 = (g: CanvasRenderingContext2D, cx: number, cy: number, r: number, col: string) => {
  g.fillStyle = col;
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? r : r * 0.42;
    const x = cx + Math.cos(a) * rad, y = cy + Math.sin(a) * rad;
    i === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
  }
  g.closePath(); g.fill();
};

// wheel stubs on a top-view vehicle (props3d language)
const wheels = (g: CanvasRenderingContext2D, W: number, L: number, n = 2) => {
  g.fillStyle = '#23262C';
  const ys = n === 2 ? [L * 0.20, L * 0.68] : [L * 0.16, L * 0.46, L * 0.74];
  for (const y of ys) {
    rr(g, -1, y, 6, L * 0.14, 3); g.fill();
    rr(g, W - 5, y, 6, L * 0.14, 3); g.fill();
  }
};

// ── MILITARY / DEFENSE ───────────────────────────────────────────────────────
// Olive/slate palette, crisp not muddy. Top view, nose UP.

const OLIVE = '#6B7A4A', OLIVE_LT = '#7F8F5C', OLIVE_DK = '#535F3A';
const SLATE = '#5C6876', SLATE_LT = '#71808F';
const GLASS = '#BFE2F2';

function makeTank(): HTMLCanvasElement {
  const L = 128, W = 64;
  const { c, g } = cv(W, L);
  // treads with light track links
  g.fillStyle = '#2A2D33';
  rr(g, 0, 4, 15, L - 8, 7); g.fill();
  rr(g, W - 15, 4, 15, L - 8, 7); g.fill();
  g.fillStyle = '#4C525C';
  for (let y = 10; y < L - 14; y += 10) { g.fillRect(2, y, 11, 4); g.fillRect(W - 13, y, 11, 4); }
  // hull: olive with light nose plate + dark rear shade
  g.fillStyle = OLIVE;
  rr(g, 13, 8, W - 26, L - 16, 8); g.fill();
  g.fillStyle = OLIVE_LT;
  rr(g, 13, 8, W - 26, 24, 8); g.fill();
  g.fillStyle = 'rgba(0,0,0,0.14)';
  rr(g, 13, L - 32, W - 26, 24, 8); g.fill();
  // barrel pointing UP past the nose
  g.fillStyle = OLIVE_DK;
  rr(g, W / 2 - 4, 0, 8, 68, 3); g.fill();
  g.fillStyle = '#3E472C';
  rr(g, W / 2 - 6, 0, 12, 10, 3); g.fill();               // muzzle brake
  // round turret + hatch detail
  dot(g, W / 2, 74, 18, '#75855A');
  dot(g, W / 2 - 3, 71, 12, '#88985F');                    // turret top light
  dot(g, W / 2 + 5, 79, 6.5, OLIVE_DK);                    // hatch ring
  dot(g, W / 2 + 5, 79, 3.5, '#75855A');                   // hatch lid
  return c;
}

function makeHeli(): HTMLCanvasElement {
  const L = 140, W = 64;
  const { c, g } = cv(W, L);
  const cx = W / 2;
  // tail boom + small tail rotor
  g.fillStyle = SLATE;
  rr(g, cx - 5, 62, 10, L - 72, 4); g.fill();
  g.fillStyle = SLATE_LT;
  rr(g, cx - 5, 62, 4, L - 72, 2); g.fill();
  g.fillStyle = '#2E333A';
  rr(g, cx - 17, L - 12, 34, 4, 2); g.fill();              // tail rotor blades
  dot(g, cx, L - 10, 3, '#2E333A');
  tri(g, cx - 9, L - 18, cx + 9, L - 18, cx, L - 6, OLIVE_DK); // tail fin
  // stub wings
  g.fillStyle = OLIVE_DK;
  rr(g, cx - 27, 46, 54, 9, 4); g.fill();
  g.fillStyle = '#3E472C';                                  // weapon pods
  rr(g, cx - 27, 44, 7, 14, 3); g.fill();
  rr(g, cx + 20, 44, 7, 14, 3); g.fill();
  // slim fuselage, nose up
  g.fillStyle = OLIVE;
  rr(g, cx - 11, 6, 22, 66, 11); g.fill();
  g.fillStyle = OLIVE_LT;
  rr(g, cx - 11, 6, 10, 66, 5); g.fill();
  // cockpit glass near nose
  g.fillStyle = GLASS;
  rr(g, cx - 7, 12, 14, 20, 6); g.fill();
  g.fillStyle = 'rgba(0,0,0,0.14)';
  rr(g, cx - 7, 24, 14, 8, 3); g.fill();                   // canopy frame split
  // MAIN rotor: 4 thin blades + hub
  const hy = 52;
  g.fillStyle = '#2E333A';
  for (let i = 0; i < 4; i++) {
    g.save();
    g.translate(cx, hy);
    g.rotate((i * Math.PI) / 2 + 0.42);
    rr(g, -1.8, -30, 3.6, 30, 1.8); g.fill();
    g.restore();
  }
  dot(g, cx, hy, 5, '#23262C');
  dot(g, cx, hy, 2.2, '#4C525C');
  // translucent rotor disc over everything
  g.fillStyle = 'rgba(215,228,235,0.16)';
  g.beginPath(); g.arc(cx, hy, 30, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.28)'; g.lineWidth = 1.5;
  g.beginPath(); g.arc(cx, hy, 30, 0, TAU); g.stroke();
  return c;
}

function makeMissileTruck(): HTMLCanvasElement {
  const L = 136, W = 60;
  const { c, g } = cv(W, L);
  wheels(g, W, L, 3);                                       // 6 wheels
  // flatbed
  g.fillStyle = '#49523A';
  rr(g, 3, 40, W - 6, L - 44, 7); g.fill();
  g.fillStyle = 'rgba(0,0,0,0.12)';
  rr(g, 3, L - 22, W - 6, 18, 7); g.fill();
  // cab at nose
  g.fillStyle = OLIVE;
  rr(g, 4, 2, W - 8, 40, 9); g.fill();
  g.fillStyle = OLIVE_LT;
  rr(g, 4, 2, W - 8, 14, 9); g.fill();
  g.fillStyle = GLASS;
  rr(g, 10, 16, W - 20, 9, 4); g.fill();                   // windshield
  // angled missile rack: slate frame + 2 white missiles, red tips
  g.save();
  g.translate(W / 2, 92);
  g.rotate(-0.09);
  g.fillStyle = SLATE;
  rr(g, -21, -40, 42, 80, 5); g.fill();
  g.fillStyle = 'rgba(0,0,0,0.14)';
  rr(g, -21, 24, 42, 16, 5); g.fill();
  for (const mx of [-11, 4]) {
    g.fillStyle = '#F2EFE8';
    rr(g, mx, -34, 8, 68, 4); g.fill();
    g.fillStyle = 'rgba(0,0,0,0.10)';
    rr(g, mx + 4.5, -34, 3.5, 68, 2); g.fill();            // missile shade side
    tri(g, mx - 0.5, -33, mx + 8.5, -33, mx + 4, -44, '#E0483E'); // red tip
  }
  g.restore();
  return c;
}

function makeHumvee(): HTMLCanvasElement {
  const L = 104, W = 60;
  const { c, g } = cv(W, L);
  wheels(g, W, L);
  // chunky armored shell
  g.fillStyle = OLIVE;
  rr(g, 3, 2, W - 6, L - 4, 12); g.fill();
  g.fillStyle = OLIVE_LT;
  rr(g, 3, 2, W - 6, 26, 12); g.fill();                    // hood
  // slit windows
  g.fillStyle = GLASS;
  rr(g, 10, 30, W - 20, 6, 3); g.fill();                   // windshield slit
  rr(g, 5, 40, 4, 16, 2); g.fill();                        // side slits
  rr(g, W - 9, 40, 4, 16, 2); g.fill();
  // armored roof panel + hatch
  g.fillStyle = OLIVE_DK;
  rr(g, 11, 40, W - 22, 38, 7); g.fill();
  dot(g, W / 2, 54, 8, '#75855A');
  dot(g, W / 2, 54, 4.5, OLIVE_DK);
  g.fillStyle = 'rgba(0,0,0,0.12)';
  rr(g, 3, L - 22, W - 6, 18, 10); g.fill();
  // spare wheel on the back
  dot(g, W / 2, L - 12, 10.5, '#23262C');
  dot(g, W / 2, L - 12, 4.5, '#4C525C');
  return c;
}

function makeJeep(): HTMLCanvasElement {
  const L = 96, W = 52;
  const { c, g } = cv(W, L);
  wheels(g, W, L);
  // open-top tub
  g.fillStyle = OLIVE;
  rr(g, 3, 2, W - 6, L - 4, 9); g.fill();
  // hood with star roundel
  g.fillStyle = OLIVE_LT;
  rr(g, 3, 2, W - 6, 28, 9); g.fill();
  g.strokeStyle = '#F2EFE8'; g.lineWidth = 2;
  g.beginPath(); g.arc(W / 2, 17, 9, 0, TAU); g.stroke();
  star5(g, W / 2, 17, 7, '#F2EFE8');
  // windshield bar
  g.fillStyle = GLASS;
  rr(g, 8, 31, W - 16, 7, 3); g.fill();
  // open interior + two seat rows
  g.fillStyle = '#3C432F';
  rr(g, 8, 41, W - 16, 40, 6); g.fill();
  g.fillStyle = OLIVE_DK;
  rr(g, 11, 45, W - 22, 10, 4); g.fill();
  rr(g, 11, 60, W - 22, 10, 4); g.fill();
  // rollbar across the tub
  g.fillStyle = '#2E333A';
  rr(g, 6, 73, W - 12, 5, 2.5); g.fill();
  // rear deck
  g.fillStyle = 'rgba(0,0,0,0.12)';
  rr(g, 3, L - 14, W - 6, 10, 6); g.fill();
  return c;
}

function makeRadarVan(): HTMLCanvasElement {
  const L = 112, W = 58;
  const { c, g } = cv(W, L);
  wheels(g, W, L);
  // boxy van body
  g.fillStyle = SLATE;
  rr(g, 3, 2, W - 6, L - 4, 8); g.fill();
  g.fillStyle = SLATE_LT;
  rr(g, 3, 2, W - 6, 20, 8); g.fill();
  g.fillStyle = GLASS;
  rr(g, 9, 14, W - 18, 8, 3); g.fill();
  g.fillStyle = OLIVE_DK;                                   // equipment box roof
  rr(g, 8, 30, W - 16, L - 44, 6); g.fill();
  g.fillStyle = 'rgba(0,0,0,0.12)';
  rr(g, 3, L - 16, W - 6, 12, 6); g.fill();
  // rotating radar dish, drawn angled
  const dx = W / 2, dy = 66;
  g.fillStyle = '#2E333A';
  rr(g, dx - 5, dy - 5, 10, 10, 3); g.fill();              // pedestal
  g.save();
  g.translate(dx, dy);
  g.rotate(-0.55);
  g.fillStyle = '#DCE1E6';
  g.beginPath(); g.ellipse(0, 0, 21, 12, 0, 0, TAU); g.fill();
  g.fillStyle = 'rgba(0,0,0,0.16)';
  g.beginPath(); g.ellipse(4, 2, 14, 7.5, 0, 0, TAU); g.fill(); // dish bowl shade
  seg(g, 0, 0, 17, -9, 2.5, '#8A929C');                    // feed arm
  dot(g, 17, -9, 3, '#8A929C');
  g.restore();
  return c;
}

// ── BEACH ────────────────────────────────────────────────────────────────────
// Bright holiday palette.

const SAND = '#E8C98E', SAND_LT = '#F2DCA8', SAND_DK = '#D2AF74';
const TEAL = '#3FB0A5', TEAL_LT = '#5CC4B9';
const RED = '#E8564E';
const CREAM = '#F7F4EC';
const TAUPE = '#A8927C', TAUPE_LT = '#C2AC94';

function makeUmbrella(): HTMLCanvasElement {
  const W = 104, H = 100;
  const { c, g } = cv(W, H);
  const cx = 52;
  // pole + base nub
  seg(g, cx, 44, cx, 92, 6, TAUPE);
  g.fillStyle = SAND_DK;
  g.beginPath(); g.ellipse(cx, 94, 14, 5, 0, 0, TAU); g.fill();
  // scalloped canopy: wedges from apex + bump circles along the rim
  const apexX = cx, apexY = 6, edgeY = 52, x0 = 6, x1 = 98, n = 6;
  const wedgeW = (x1 - x0) / n;
  for (let i = 0; i < n; i++) {
    const col = i % 2 === 0 ? RED : CREAM;
    tri(g, apexX, apexY, x0 + i * wedgeW, edgeY, x0 + (i + 1) * wedgeW, edgeY, col);
    dot(g, x0 + (i + 0.5) * wedgeW, edgeY, wedgeW / 2, col); // scallop bump
  }
  // light sweep on the left face
  g.fillStyle = 'rgba(255,255,255,0.18)';
  g.beginPath(); g.moveTo(apexX, apexY); g.lineTo(x0, edgeY); g.lineTo(x0 + wedgeW * 1.6, edgeY); g.closePath(); g.fill();
  dot(g, apexX, apexY, 4, RED);                             // tip ball
  return c;
}

function makeTowel(): HTMLCanvasElement {
  const W = 100, H = 40;                                    // wider than tall
  const { c, g } = cv(W, H);
  g.fillStyle = CREAM;
  rr(g, 2, 6, 96, 32, 6); g.fill();
  g.save();
  rr(g, 2, 6, 96, 32, 6); g.clip();
  g.fillStyle = TEAL;                                       // vertical stripes
  for (let x = 14; x < 86; x += 18) g.fillRect(x, 6, 8, 32);
  g.fillStyle = RED;                                        // end bands
  g.fillRect(2, 6, 6, 32); g.fillRect(92, 6, 6, 32);
  g.fillStyle = 'rgba(0,0,0,0.08)';                         // perspective squash shade
  g.fillRect(2, 30, 96, 8);
  g.restore();
  return c;
}

function makeLifeguard(): HTMLCanvasElement {
  const W = 76, H = 110;
  const { c, g } = cv(W, H);
  // tall legs + cross brace + ladder rungs
  g.fillStyle = '#E8E2D4';
  rr(g, 12, 52, 8, 56, 3); g.fill();
  rr(g, 56, 52, 8, 56, 3); g.fill();
  seg(g, 15, 100, 61, 60, 4, '#DCD4C2');
  g.fillStyle = '#DCD4C2';
  for (let y = 64; y < 100; y += 12) g.fillRect(14, y, 10, 4);
  // seat platform
  g.fillStyle = CREAM;
  rr(g, 8, 46, 60, 12, 4); g.fill();
  g.fillStyle = 'rgba(0,0,0,0.10)';
  rr(g, 8, 53, 60, 5, 2.5); g.fill();
  // back panel with red cross
  g.fillStyle = CREAM;
  rr(g, 16, 6, 44, 44, 6); g.fill();
  g.fillStyle = 'rgba(0,0,0,0.06)';
  rr(g, 44, 6, 16, 44, 6); g.fill();
  g.fillStyle = RED;
  g.fillRect(34, 16, 8, 26);
  g.fillRect(25, 25, 26, 8);
  // armrests
  g.fillStyle = '#E8E2D4';
  rr(g, 8, 30, 6, 20, 3); g.fill();
  rr(g, 62, 30, 6, 20, 3); g.fill();
  return c;
}

function makeDeckchair(): HTMLCanvasElement {
  const W = 80, H = 78;
  const { c, g } = cv(W, H);
  // folding wooden frame
  seg(g, 14, 74, 26, 20, 5, TAUPE);                         // back legs
  seg(g, 66, 74, 54, 20, 5, TAUPE);
  seg(g, 22, 40, 12, 74, 5, TAUPE_LT);                      // front legs
  seg(g, 58, 40, 68, 74, 5, TAUPE_LT);
  // striped fabric: reclined back panel + seat
  g.save();
  g.beginPath();
  g.moveTo(24, 14); g.lineTo(56, 14); g.lineTo(62, 44); g.lineTo(18, 44); g.closePath();
  g.clip();
  for (let i = 0; i < 6; i++) {
    g.fillStyle = i % 2 === 0 ? TEAL : CREAM;
    g.fillRect(12 + i * 10, 10, 10, 40);
  }
  g.restore();
  g.fillStyle = TEAL;
  rr(g, 18, 44, 44, 10, 4); g.fill();                       // seat sling
  g.fillStyle = 'rgba(0,0,0,0.10)';
  rr(g, 18, 49, 44, 5, 2.5); g.fill();
  seg(g, 22, 14, 58, 14, 5, TAUPE);                         // top rail
  return c;
}

function makeSandcastle(): HTMLCanvasElement {
  const W = 96, H = 92;
  const { c, g } = cv(W, H);
  const cren = (x: number, y: number, w: number, n: number, col: string) => {
    g.fillStyle = col;
    const step = w / (n * 2 - 1);
    for (let i = 0; i < n; i++) g.fillRect(x + i * step * 2, y, step, 7);
  };
  // corner turrets with cone caps
  for (const tx of [4, 76]) {
    g.fillStyle = SAND;
    rr(g, tx, 44, 16, 44, 3); g.fill();
    g.fillStyle = SAND_LT;
    rr(g, tx, 44, 7, 44, 3); g.fill();
    tri(g, tx - 2, 44, tx + 18, 44, tx + 8, 30, SAND_DK);
  }
  // bottom tier + crenellations
  g.fillStyle = SAND;
  rr(g, 12, 56, 72, 32, 4); g.fill();
  g.fillStyle = SAND_LT;
  rr(g, 12, 56, 72, 10, 4); g.fill();
  cren(12, 50, 72, 6, SAND);
  // door arch
  g.fillStyle = '#9C7E52';
  g.beginPath(); g.arc(48, 88, 9, Math.PI, 0); g.lineTo(57, 88); g.lineTo(39, 88); g.closePath(); g.fill();
  // top tier + crenellations
  g.fillStyle = SAND;
  rr(g, 30, 30, 36, 26, 3); g.fill();
  g.fillStyle = SAND_LT;
  rr(g, 30, 30, 36, 8, 3); g.fill();
  cren(30, 24, 36, 4, SAND);
  // tiny flag
  seg(g, 48, 24, 48, 8, 2.5, '#8C7B6C');
  tri(g, 48, 8, 62, 12, 48, 17, RED);
  return c;
}

function makeSurfboard(): HTMLCanvasElement {
  const W = 48, H = 104;
  const { c, g } = cv(W, H);
  // sand mound it's planted in
  g.fillStyle = SAND;
  g.beginPath(); g.ellipse(24, 96, 20, 8, 0, 0, TAU); g.fill();
  // upright board: pointed at top
  g.fillStyle = TEAL;
  g.beginPath();
  g.moveTo(24, 2);
  g.quadraticCurveTo(40, 30, 38, 62);
  g.quadraticCurveTo(37, 88, 24, 96);
  g.quadraticCurveTo(11, 88, 10, 62);
  g.quadraticCurveTo(8, 30, 24, 2);
  g.closePath(); g.fill();
  g.fillStyle = TEAL_LT;                                    // left light face
  g.beginPath();
  g.moveTo(24, 2);
  g.quadraticCurveTo(8, 30, 10, 62);
  g.quadraticCurveTo(11, 88, 24, 96);
  g.quadraticCurveTo(17, 70, 17, 46);
  g.quadraticCurveTo(17, 22, 24, 2);
  g.closePath(); g.fill();
  // white center stripe
  g.fillStyle = CREAM;
  rr(g, 21, 10, 6, 78, 3); g.fill();
  return c;
}

function makeRowboat(): HTMLCanvasElement {
  const L = 108, W = 84;                                    // top view, bow up
  const { c, g } = cv(W, L);
  const cx = W / 2;
  // oars out both sides
  seg(g, cx - 22, 48, cx - 38, 72, 4, TAUPE);
  seg(g, cx + 22, 48, cx + 38, 72, 4, TAUPE);
  g.fillStyle = TAUPE_LT;
  g.beginPath(); g.ellipse(cx - 39, 76, 5, 9, -0.5, 0, TAU); g.fill();
  g.beginPath(); g.ellipse(cx + 39, 76, 5, 9, 0.5, 0, TAU); g.fill();
  // hull: pointed bow, rounded stern — warm taupe, teal trim
  const hull = () => {
    g.beginPath();
    g.moveTo(cx, 2);
    g.quadraticCurveTo(cx + 26, 26, cx + 24, 66);
    g.quadraticCurveTo(cx + 23, 100, cx, 102);
    g.quadraticCurveTo(cx - 23, 100, cx - 24, 66);
    g.quadraticCurveTo(cx - 26, 26, cx, 2);
    g.closePath();
  };
  g.fillStyle = TAUPE; hull(); g.fill();
  g.strokeStyle = TEAL; g.lineWidth = 4; hull(); g.stroke(); // gunwale trim
  // cream inner deck
  g.fillStyle = '#E8DCC8';
  g.beginPath();
  g.moveTo(cx, 12);
  g.quadraticCurveTo(cx + 18, 30, cx + 17, 64);
  g.quadraticCurveTo(cx + 16, 92, cx, 94);
  g.quadraticCurveTo(cx - 16, 92, cx - 17, 64);
  g.quadraticCurveTo(cx - 18, 30, cx, 12);
  g.closePath(); g.fill();
  // 2 bench seats
  g.fillStyle = TAUPE;
  rr(g, cx - 16, 40, 32, 9, 4); g.fill();
  rr(g, cx - 15, 66, 30, 9, 4); g.fill();
  g.fillStyle = TAUPE_LT;
  rr(g, cx - 16, 40, 32, 4, 2); g.fill();
  rr(g, cx - 15, 66, 30, 4, 2); g.fill();
  return c;
}

// ── PARK ─────────────────────────────────────────────────────────────────────
// Matches the game's mint/cream/rose building palette.

const MINT = '#8FD3B8', MINT_LT = '#ACE2CC';
const STONE = '#D9D2C2', STONE_LT = '#E8E2D4';
const ROSE = '#E08A86';
const IRON = '#3E4A52';
const WATER = '#6FB8D9', WATER_LT = '#93CDE8';

function makeBench(): HTMLCanvasElement {
  const W = 92, H = 56;
  const { c, g } = cv(W, H);
  // iron legs + armrests
  g.fillStyle = IRON;
  rr(g, 8, 30, 6, 26, 3); g.fill();
  rr(g, 78, 30, 6, 26, 3); g.fill();
  rr(g, 6, 22, 10, 5, 2.5); g.fill();
  rr(g, 76, 22, 10, 5, 2.5); g.fill();
  // back slats + seat slats, warm wood 2-tone
  for (const [y, col] of [[4, TAUPE_LT], [13, TAUPE], [28, TAUPE_LT], [36, TAUPE]] as [number, string][]) {
    g.fillStyle = col;
    rr(g, 10, y, 72, 7, 3.5); g.fill();
  }
  g.fillStyle = 'rgba(0,0,0,0.10)';
  rr(g, 10, 39, 72, 4, 2); g.fill();
  return c;
}

function makeFountain(): HTMLCanvasElement {
  const W = 96, H = 84;
  const { c, g } = cv(W, H);
  const cx = 48;
  // lower basin
  g.fillStyle = STONE;
  rr(g, 6, 56, 84, 26, 10); g.fill();
  g.fillStyle = 'rgba(0,0,0,0.10)';
  rr(g, 6, 72, 84, 10, 8); g.fill();
  g.fillStyle = STONE_LT;
  rr(g, 4, 52, 88, 10, 5); g.fill();                        // rim
  g.fillStyle = WATER;
  g.beginPath(); g.ellipse(cx, 56, 38, 7, 0, 0, TAU); g.fill();
  // pedestal + upper basin
  g.fillStyle = '#C9C2B0';
  rr(g, cx - 7, 32, 14, 24, 4); g.fill();
  g.fillStyle = STONE;
  rr(g, cx - 24, 24, 48, 12, 6); g.fill();
  g.fillStyle = STONE_LT;
  rr(g, cx - 26, 21, 52, 7, 3.5); g.fill();
  g.fillStyle = WATER_LT;
  g.beginPath(); g.ellipse(cx, 24, 19, 4.5, 0, 0, TAU); g.fill();
  // jet + sparkle
  seg(g, cx, 22, cx, 8, 3.5, WATER_LT);
  dot(g, cx, 6, 3, '#FFFFFF');
  seg(g, cx - 12, 12, cx - 12, 18, 2, 'rgba(255,255,255,0.85)');
  seg(g, cx - 15, 15, cx - 9, 15, 2, 'rgba(255,255,255,0.85)');
  seg(g, cx + 14, 44, cx + 14, 49, 2, 'rgba(255,255,255,0.7)');
  seg(g, cx + 11.5, 46.5, cx + 16.5, 46.5, 2, 'rgba(255,255,255,0.7)');
  return c;
}

function makeGazebo(): HTMLCanvasElement {
  const W = 100, H = 104;
  const { c, g } = cv(W, H);
  // interior shade
  g.fillStyle = 'rgba(0,0,0,0.08)';
  rr(g, 10, 44, 80, 46, 4); g.fill();
  // white posts (3 visible faces of the hexagon)
  g.fillStyle = CREAM;
  for (const x of [10, 47, 84]) { rr(g, x, 44, 6, 46, 3); g.fill(); }
  // railing
  g.fillStyle = '#EDE7D8';
  rr(g, 10, 62, 80, 6, 3); g.fill();
  // base platform
  g.fillStyle = STONE;
  rr(g, 2, 88, 96, 12, 5); g.fill();
  g.fillStyle = STONE_LT;
  rr(g, 2, 88, 96, 5, 2.5); g.fill();
  // hexagonal mint roof: center facet + light left facet + dark right facet
  tri(g, 50, 4, 24, 40, 76, 40, MINT);
  tri(g, 50, 4, 4, 40, 24, 40, MINT_LT);
  tri(g, 50, 4, 76, 40, 96, 40, '#76BBA0');
  // fascia + finial
  g.fillStyle = CREAM;
  rr(g, 2, 38, 96, 7, 3.5); g.fill();
  dot(g, 50, 4, 4, MINT_LT);
  return c;
}

function makePicnic(): HTMLCanvasElement {
  const W = 96, H = 60;
  const { c, g } = cv(W, H);
  // A-frame legs
  seg(g, 30, 18, 12, 56, 6, TAUPE);
  seg(g, 66, 18, 84, 56, 6, TAUPE);
  seg(g, 34, 18, 20, 44, 6, TAUPE_LT);
  seg(g, 62, 18, 76, 44, 6, TAUPE_LT);
  // side benches
  g.fillStyle = '#2E9A8F';
  rr(g, 2, 34, 26, 8, 4); g.fill();
  rr(g, 68, 34, 26, 8, 4); g.fill();
  g.fillStyle = TEAL_LT;
  rr(g, 2, 34, 26, 3.5, 1.75); g.fill();
  rr(g, 68, 34, 26, 3.5, 1.75); g.fill();
  // teal tabletop
  g.fillStyle = TEAL;
  rr(g, 14, 8, 68, 12, 4); g.fill();
  g.fillStyle = TEAL_LT;
  rr(g, 14, 8, 68, 5, 2.5); g.fill();
  g.fillStyle = 'rgba(0,0,0,0.10)';
  rr(g, 14, 17, 68, 3, 1.5); g.fill();
  return c;
}

function makeSwing(): HTMLCanvasElement {
  const W = 110, H = 88;
  const { c, g } = cv(W, H);
  // two A-frames + top bar
  seg(g, 10, 84, 26, 10, 6, IRON);
  seg(g, 42, 84, 26, 10, 6, IRON);
  seg(g, 68, 84, 84, 10, 6, IRON);
  seg(g, 100, 84, 84, 10, 6, IRON);
  seg(g, 24, 10, 86, 10, 6, '#54626C');
  // 2 swings (one a touch higher for life)
  seg(g, 40, 12, 40, 56, 2.5, '#5C6870');
  seg(g, 56, 12, 56, 56, 2.5, '#5C6870');
  g.fillStyle = ROSE;
  rr(g, 36, 55, 24, 6, 3); g.fill();
  seg(g, 66, 12, 68, 50, 2.5, '#5C6870');
  seg(g, 82, 12, 84, 50, 2.5, '#5C6870');
  g.fillStyle = TEAL;
  rr(g, 64, 49, 24, 6, 3); g.fill();
  return c;
}

function makeSlide(): HTMLCanvasElement {
  const W = 96, H = 90;
  const { c, g } = cv(W, H);
  // ladder
  seg(g, 16, 86, 16, 22, 5, IRON);
  seg(g, 30, 86, 30, 22, 5, IRON);
  g.fillStyle = '#54626C';
  for (let y = 30; y < 82; y += 12) g.fillRect(16, y, 14, 4);
  // platform
  g.fillStyle = STONE_LT;
  rr(g, 10, 16, 34, 9, 4); g.fill();
  // curved teal slide sweeping right and down
  g.fillStyle = TEAL;
  g.beginPath();
  g.moveTo(38, 18);
  g.quadraticCurveTo(66, 24, 78, 52);
  g.quadraticCurveTo(86, 70, 92, 82);
  g.lineTo(74, 88);
  g.quadraticCurveTo(66, 68, 58, 54);
  g.quadraticCurveTo(48, 36, 34, 32);
  g.closePath(); g.fill();
  g.strokeStyle = TEAL_LT; g.lineWidth = 4; g.lineCap = 'round';
  g.beginPath();
  g.moveTo(38, 20);
  g.quadraticCurveTo(64, 26, 76, 53);
  g.quadraticCurveTo(84, 70, 89, 81);
  g.stroke();                                               // light rail edge
  // support post under the slide
  seg(g, 66, 56, 66, 86, 5, IRON);
  return c;
}

function makeSeesaw(): HTMLCanvasElement {
  const W = 104, H = 52;
  const { c, g } = cv(W, H);
  // fulcrum
  tri(g, 38, 48, 66, 48, 52, 22, ROSE);
  tri(g, 38, 48, 52, 48, 52, 22, '#EBA5A1');
  // tilted plank + seats + handles
  g.save();
  g.translate(52, 25);
  g.rotate(-0.14);
  g.fillStyle = TEAL;
  rr(g, -47, -4, 94, 8, 4); g.fill();
  g.fillStyle = TEAL_LT;
  rr(g, -47, -4, 94, 3.5, 1.75); g.fill();
  g.fillStyle = ROSE;                                       // seats
  rr(g, -47, -6, 16, 12, 5); g.fill();
  rr(g, 31, -6, 16, 12, 5); g.fill();
  seg(g, -34, -4, -34, -14, 3, IRON);                       // handles
  seg(g, -38, -14, -30, -14, 3, IRON);
  seg(g, 34, -4, 34, -14, 3, IRON);
  seg(g, 30, -14, 38, -14, 3, IRON);
  g.restore();
  return c;
}

function makeStreetlamp(): HTMLCanvasElement {
  const W = 48, H = 112;
  const { c, g } = cv(W, H);
  const cx = 24;
  // warm glow halo behind the head
  g.fillStyle = 'rgba(255,214,130,0.30)';
  g.beginPath(); g.arc(cx, 20, 17, 0, TAU); g.fill();
  // post + stepped base
  g.fillStyle = '#33393F';
  rr(g, cx - 3, 26, 6, 76, 3); g.fill();
  g.fillStyle = IRON;
  rr(g, cx - 8, 96, 16, 8, 3); g.fill();
  rr(g, cx - 11, 103, 22, 7, 3); g.fill();
  // glowing lamp head
  dot(g, cx, 20, 9, '#FFD98C');
  dot(g, cx - 2.5, 17.5, 4.5, '#FFE9B8');
  g.fillStyle = '#33393F';                                  // cap + finial
  rr(g, cx - 8, 8, 16, 5, 2.5); g.fill();
  tri(g, cx - 5, 8, cx + 5, 8, cx, 1, '#33393F');
  rr(g, cx - 6.5, 27, 13, 4, 2); g.fill();                  // collar under globe
  return c;
}

// ── INIT ─────────────────────────────────────────────────────────────────────

const MAKERS: [string, () => HTMLCanvasElement][] = [
  // military / defense
  ['tank', makeTank], ['heli', makeHeli], ['missile_truck', makeMissileTruck],
  ['humvee', makeHumvee], ['jeep', makeJeep], ['radar_van', makeRadarVan],
  // beach
  ['umbrella', makeUmbrella], ['towel', makeTowel], ['lifeguard', makeLifeguard],
  ['deckchair', makeDeckchair], ['sandcastle', makeSandcastle],
  ['surfboard', makeSurfboard], ['rowboat', makeRowboat],
  // park
  ['bench', makeBench], ['fountain', makeFountain], ['gazebo', makeGazebo],
  ['picnic', makePicnic], ['swing', makeSwing], ['slide', makeSlide],
  ['seesaw', makeSeesaw], ['streetlamp', makeStreetlamp],
];

let _done = false;
export function initProps3d2(): void {
  if (_done) return;
  _done = true;
  for (const [kind, make] of MAKERS) {
    const cvs = make();
    put(`p3d2_${kind}`, cvs, cvs.width, cvs.height);
  }
  console.log(`[props3d2] procedural props wave 2 ready — ${MAKERS.length} sprites (military=6 beach=7 park=8, p3d2_*)`);
}
