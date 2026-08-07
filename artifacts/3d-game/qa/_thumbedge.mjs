// _thumbedge.mjs — WHERE THE CHILD PUTS THEIR THUMB DECIDES HOW FAST THEY GO.
// The joystick is RELATIVE: prototype3d.ts:1143 plants the base wherever the
// finger lands, and full deflection is JOY_R = 64 px from that base
// (prototype3d.ts:1089). The glass has edges. A thumb planted 30 px from the
// right edge has 30 px of rightward travel, not 64 — and the re-anchor at
// FOLLOW = 108.8 px (prototype3d.ts:1100) cannot rescue it, because the finger
// can never get 108.8 px away in that direction to drag the base clear.
//
// This measures the consequence in the only unit that matters: the void's
// actual top speed, as a percentage of what the same push gets in open glass,
// for five real grips and eight bearings.
//
// usage: node qa/_thumbedge.mjs <world> <port>
import { chromium } from 'playwright';
const WORLD = process.argv[2] || 'maple';
const PORT  = process.argv[3] || '4231';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
p.setDefaultTimeout(600000);
await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 600000 });
await p.evaluate(() => document.querySelectorAll('.show').forEach(e => {
  if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
await p.click('#btnPlay'); await p.waitForTimeout(1200);
await p.click(`#worldRow .wCard[data-world="${WORLD}"]`);
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 1.0, null, { timeout: 600000 });
await p.evaluate(() => { window.__pinQuality(0); window.__renderer.render = () => {}; });

const out = await p.evaluate(async () => {
  const cv = document.querySelector('canvas');
  const W = innerWidth, H = innerHeight;
  const T = () => window.__matchState().t;
  const raf = () => new Promise(r => requestAnimationFrame(r));
  const dn = (x, y) => cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: x, clientY: y, bubbles: true }));
  const mv = (x, y) => dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: x, clientY: y, bubbles: true }));
  const up = () => dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientX: 0, clientY: 0, bubbles: true }));

  let SP = null;
  for (let i = 0; i < 6000 && !SP; i++) {
    const x = (Math.random() * 2 - 1) * 80, z = (Math.random() * 2 - 1) * 80;
    let ok = true;
    for (let a = 0; a < 12; a++) { const th = a * Math.PI / 6;
      if (!window.__biomeAt(x + Math.cos(th) * 55, z + Math.sin(th) * 55)) { ok = false; break; } }
    if (ok) SP = { x, z };
  }
  if (!SP) SP = { x: 0, z: 0 };

  // one trial: plant at (px,py), push toward bearing `a` as far as the glass
  // allows (a real thumb cannot leave the display), hold, report void speed
  const trial = async (px, py, a) => {
    window.__setVoidR(6); window.__warpVoid(SP.x, SP.z);
    up(); await raf(); await raf();
    { const t0 = T(); while (T() - t0 < 0.4) await raf(); }
    dn(px, py);
    const tx = Math.max(6, Math.min(W - 6, px + Math.cos(a) * 200));
    const ty = Math.max(6, Math.min(H - 6, py + Math.sin(a) * 200));
    { const t0 = T(); while (T() - t0 < 1.3) { mv(tx, ty); await raf(); } }
    const s0 = window.__voidState(), q0 = T();
    { const t0 = T(); while (T() - t0 < 0.5) { mv(tx, ty); await raf(); } }
    const s1 = window.__voidState(), q1 = T();
    up();
    return { spd: Math.hypot(s1.x - s0.x, s1.z - s0.z) / Math.max(1e-3, q1 - q0),
      reachPx: Math.hypot(tx - px, ty - py) };
  };

  // reference: dead centre of the glass, 200 px of room in every direction
  let ref = 0;
  for (const a of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const r = await trial(W / 2, H / 2, a); ref = Math.max(ref, r.spd);
  }

  const GRIPS = [
    ['centre (what qa/pace.mjs uses)', 0.50, 0.50],
    ['right thumb, natural rest',      0.70, 0.80],
    ['right thumb, low grip',          0.82, 0.88],
    ['right thumb, corner grip',       0.90, 0.94],
    ['left thumb, natural rest',       0.28, 0.82],
  ];
  const rows = [];
  for (const [name, fx, fy] of GRIPS) {
    const px = W * fx, py = H * fy, per = [];
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      const r = await trial(px, py, a);
      per.push({ deg: i * 45, reachPx: Math.round(r.reachPx), spd: +r.spd.toFixed(1),
        pct: +(100 * r.spd / ref).toFixed(0) });
    }
    rows.push({ name, px: Math.round(px), py: Math.round(py), per });
  }
  return { W, H, ref: +ref.toFixed(1), rows };
});

console.log(`WORLD=${WORLD}  viewport ${out.W}x${out.H}  open-glass reference top speed ${out.ref} u/s`);
console.log('  (a bearing needs 64 px of glass to reach full deflection; 10 px is the deadzone)\n');
for (const r of out.rows) {
  console.log(`  ${r.name}  thumb at (${r.px},${r.py})`);
  console.log('    bearing   0    45    90   135   180   225   270   315');
  console.log('    room px ' + r.per.map(x => String(x.reachPx).padStart(5)).join(' '));
  console.log('    speed % ' + r.per.map(x => String(x.pct).padStart(5)).join(' ')
    + `   worst ${Math.min(...r.per.map(x => x.pct))}%`);
}
console.log('\nraw:', JSON.stringify(out));
await b.close();
