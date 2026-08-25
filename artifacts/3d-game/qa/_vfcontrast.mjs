// WHAT THE PER-BITE SCORE FLOATER (.vf) ACTUALLY MEASURES, AND AGAINST WHAT.
//
// Reads nothing it does not render. No colour, size or geometry is transcribed
// here: the fill comes from getComputedStyle on the live element, the rect from
// getBoundingClientRect, and the background from a SECOND shot of the SAME
// frozen frame with the floaters hidden. If no .vf is on screen it THROWS.
//
// Freeze protocol (so the two shots differ only by the floater):
//   1. window.requestAnimationFrame is stubbed -> the three.js loop stops.
//   2. every .vf gets animation-play-state: paused -> the CSS rise stops.
//   3. two background shots are taken and compared; a non-identical pair is a
//      hard FAIL, because then the A/B is measuring scene motion.
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import fs from 'node:fs';

const WORLD = process.argv[2] || 'maple';
const OUT = 'qa/out/vf';
fs.mkdirSync(OUT, { recursive: true });

const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
const L = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const CR = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[s.length >> 1] : NaN; };

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 3 });
await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidFirstNom', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString());
} catch {} });
await p.goto(`http://127.0.0.1:4177/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show').forEach(e => {
  if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
await p.click('#btnPlay'); await p.waitForTimeout(1400);
await p.click(`#worldRow .wCard[data-world="${WORLD}"]`);
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 6, null, { timeout: 600000 });

// find the PLAZA (Maple's square) by asking the island, and stand on it
const spot = await p.evaluate(() => {
  const hits = [];
  for (let x = -700; x <= 700; x += 20) for (let z = -700; z <= 700; z += 20) {
    if (window.__biomeAt(x, z) === 'plaza') hits.push([x, z]);
  }
  if (!hits.length) return null;
  const cx = hits.reduce((s, h) => s + h[0], 0) / hits.length;
  const cz = hits.reduce((s, h) => s + h[1], 0) / hits.length;
  hits.sort((a, c) => Math.hypot(a[0] - cx, a[1] - cz) - Math.hypot(c[0] - cx, c[1] - cz));
  return { x: hits[0][0], z: hits[0][1], n: hits.length };
});
console.log('plaza spot', JSON.stringify(spot));
if (spot) { await p.evaluate(([x, z]) => window.__warpVoid(x, z), [spot.x, spot.z]); await p.waitForTimeout(900); }
console.log('biome under void =', await p.evaluate(() => {
  const v = window.__voidState(); return window.__biomeAt(v.x, v.z); }));

// force real bites until a small (non-big) floater is on screen
let info = null;
for (let i = 0; i < 40 && !info; i++) {
  await p.evaluate(() => window.__eatNearest(0.15));
  await p.waitForTimeout(190);
  info = await p.evaluate(() => {
    const els = [...document.querySelectorAll('.vf')].filter(e => {
      const cs = getComputedStyle(e);
      return e.textContent && +cs.opacity > 0.85 && !e.classList.contains('big');
    });
    if (!els.length) return null;
    // FREEZE: stop the render loop and every floater's rise, in that order
    window.__rafOff = window.requestAnimationFrame;
    window.requestAnimationFrame = () => 0;
    document.querySelectorAll('.vf').forEach(e => { e.style.animationPlayState = 'paused'; });
    const e = els[0], cs = getComputedStyle(e), r = e.getBoundingClientRect();
    return { text: e.textContent, color: cs.color, stroke: cs.webkitTextStrokeColor + ' / ' + cs.webkitTextStrokeWidth,
      paintOrder: cs.paintOrder, shadow: cs.textShadow, size: cs.fontSize, weight: cs.fontWeight,
      family: cs.fontFamily, opacity: cs.opacity,
      x: r.x, y: r.y, w: r.width, h: r.height, dpr: devicePixelRatio, iw: innerWidth,
      n: document.querySelectorAll('.vf').length };
  });
}
if (!info) { await b.close(); throw new Error('NO .vf FLOATER ON SCREEN — probe measured nothing'); }
console.log('floater', JSON.stringify(info));

await p.waitForTimeout(250);
const A = PNG.sync.read(await p.screenshot());
await p.evaluate(() => document.querySelectorAll('.vf').forEach(e => { e.style.visibility = 'hidden'; }));
await p.waitForTimeout(220);
const B1 = await p.screenshot();
await p.waitForTimeout(400);
const B2 = await p.screenshot();
if (!B1.equals(B2)) { await b.close(); throw new Error('FREEZE FAILED — background moved between shots; A/B invalid'); }
const B = PNG.sync.read(B1);
fs.writeFileSync(`${OUT}/${WORLD}-A.png`, PNG.sync.write(A));
fs.writeFileSync(`${OUT}/${WORLD}-B.png`, PNG.sync.write(B));

// ── measure ────────────────────────────────────────────────────────────────
const K = A.width / info.iw;
const px = (im, x, y) => { const i = (y * im.width + x) * 4; return [im.data[i], im.data[i+1], im.data[i+2]]; };
const X0 = Math.max(0, Math.floor(info.x * K) - 10), Y0 = Math.max(0, Math.floor(info.y * K) - 10);
const X1 = Math.min(A.width - 1, Math.ceil((info.x + info.w) * K) + 10);
const Y1 = Math.min(A.height - 1, Math.ceil((info.y + info.h) * K) + 10);
const fill = info.color.match(/\d+/g).slice(0, 3).map(Number);

const isInk = new Uint8Array((X1 - X0 + 1) * (Y1 - Y0 + 1));
const wq = X1 - X0 + 1;
const changed = [], inkL = [], underL = [], inkPx = [];
for (let y = Y0; y <= Y1; y++) for (let x = X0; x <= X1; x++) {
  const a = px(A, x, y), c = px(B, x, y);
  const d = Math.max(Math.abs(a[0]-c[0]), Math.abs(a[1]-c[1]), Math.abs(a[2]-c[2]));
  if (d >= 6) changed.push([x, y]);
  const df = Math.hypot(a[0]-fill[0], a[1]-fill[1], a[2]-fill[2]);
  if (df < 34 && d >= 6) {                       // glyph body: the fill, essentially opaque
    isInk[(y - Y0) * wq + (x - X0)] = 1;
    inkL.push(L(...a)); underL.push(L(...c)); inkPx.push([x, y]);
  }
}
// halo = A-pixels within 2px of ink that are NOT ink (the stroke + shadow, as composited)
const haloL = [];
for (let y = Y0; y <= Y1; y++) for (let x = X0; x <= X1; x++) {
  if (isInk[(y - Y0) * wq + (x - X0)]) continue;
  let near = false;
  for (let dy = -2; dy <= 2 && !near; dy++) for (let dx = -2; dx <= 2; dx++) {
    const yy = y + dy, xx = x + dx;
    if (yy < Y0 || yy > Y1 || xx < X0 || xx > X1) continue;
    if (isInk[(yy - Y0) * wq + (xx - X0)]) { near = true; break; }
  }
  if (near) haloL.push(L(...px(A, x, y)));
}
// the untouched scene just outside the floater's whole footprint
const sceneL = [];
const chg = new Set(changed.map(([x, y]) => y * A.width + x));
for (let y = Y0; y <= Y1; y++) for (let x = X0; x <= X1; x++) {
  if (chg.has(y * A.width + x)) continue;
  sceneL.push(L(...px(A, x, y)));
}
const mi = med(inkL), mu = med(underL), mh = med(haloL), ms = med(sceneL);
const fl = L(...fill);
console.log(`
fill css            ${info.color}  -> L ${fl.toFixed(4)}
paint-order         ${info.paintOrder}
stroke              ${info.stroke}
ink px (fill body)  ${inkL.length}   footprint px ${changed.length}
ink L (median)      ${mi.toFixed(4)}
UNDER the ink  L    ${mu.toFixed(4)}   ->  ink : scene-under-it  = ${CR(mi, mu).toFixed(2)}:1
halo (<=2px) L      ${mh.toFixed(4)}   ->  ink : its own halo    = ${CR(mi, mh).toFixed(2)}:1
scene beside it L   ${ms.toFixed(4)}   ->  ink : scene beside    = ${CR(mi, ms).toFixed(2)}:1
`);
fs.writeFileSync(`${OUT}/${WORLD}-rect.json`, JSON.stringify({ info, X0, Y0, X1, Y1,
  inkL: mi, underL: mu, haloL: mh, sceneL: ms,
  crInkUnder: +CR(mi, mu).toFixed(3), crInkHalo: +CR(mi, mh).toFixed(3), crInkScene: +CR(mi, ms).toFixed(3) }, null, 2));
await b.close();
