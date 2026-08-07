// _thumbflip.mjs — THE CHANGE OF MIND, isolated.
// A child chasing a hot dog swerves. This drill removes target churn entirely:
// plant the thumb at the natural right-thumb rest, push a bearing, hold it to
// steady state, then flip 180 degrees at a real thumb's slew rate and measure
//   - how many GAME seconds until the void actually travels the new bearing
//   - how many CSS px of thumb travel that cost
//   - how far the void kept going the OLD way while the flip landed
// swept over how hard the child is pushing (reach) and how big the void is,
// because both the re-anchor (FOLLOW = 1.7 * JOY_R = 108.8 px, prototype3d.ts:1100)
// and the velocity filter (k = 11 - 3.5*weight, prototype3d.ts:4114) are
// sensitive to exactly those two things.
//
// usage: node qa/_thumbflip.mjs <world> <port>
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

const rows = await p.evaluate(async () => {
  const cv = document.querySelector('canvas');
  const joyEl = document.getElementById('joy');
  const W = innerWidth, H = innerHeight;
  const HOME = { x: W * 0.70, y: H * 0.80 };          // right thumb at rest
  const T = () => window.__matchState().t;
  const raf = () => new Promise(r => requestAnimationFrame(r));
  const dn = (x, y) => cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: x, clientY: y, bubbles: true }));
  const mv = (x, y) => dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: x, clientY: y, bubbles: true }));
  const up = (x, y) => dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientX: x, clientY: y, bubbles: true }));

  // world<->screen basis, recovered from the live camera (verified by _thumbaxis)
  const basis = () => { const vs = window.__voidState(), c = window.__cam.position;
    let ox = c.x - vs.x, oz = c.z - vs.z; const l = Math.hypot(ox, oz) || 1;
    const fx = -ox / l, fz = -oz / l; return { fx, fz, rx: -fz, rz: fx }; };
  const velScreen = (vx, vz) => { const B = basis();
    return { x: vx * B.rx + vz * B.rz, y: -(vx * B.fx + vz * B.fz) }; };

  // an open patch of legal ground so the coast wall never bends a result
  let SP = null;
  for (let i = 0; i < 4000 && !SP; i++) {
    const x = (Math.random() * 2 - 1) * 90, z = (Math.random() * 2 - 1) * 90;
    let ok = true;
    for (let a = 0; a < 8; a++) { const th = a * Math.PI / 4;
      if (!window.__biomeAt(x + Math.cos(th) * 40, z + Math.sin(th) * 40)) { ok = false; break; } }
    if (ok) SP = { x, z };
  }
  if (!SP) SP = { x: 0, z: 0 };

  const out = [];
  // a thumb slews at a finite rate; 1400 px/s is a brisk child's flick
  const slew = async (fx, fy, tx, ty, pxPerSec) => {
    const d = Math.hypot(tx - fx, ty - fy), dur = d / pxPerSec;
    const t0 = T(); let path = 0, px = fx, py = fy;
    for (;;) { const u = Math.min(1, (T() - t0) / dur);
      const nx = fx + (tx - fx) * u, ny = fy + (ty - fy) * u;
      path += Math.hypot(nx - px, ny - py); px = nx; py = ny;
      mv(Math.max(6, Math.min(W - 6, nx)), Math.max(6, Math.min(H - 6, ny)));
      if (u >= 1) break; await raf(); }
    return path;
  };

  for (const R of [1.6, 6, 12]) {
    for (const reach of [60, 105, 160, 220]) {
      for (const deg of [0, 90, 180, 270]) {
        const a = deg * Math.PI / 180, dx = Math.cos(a), dy = Math.sin(a);
        window.__setVoidR(R); window.__warpVoid(SP.x, SP.z);
        up(HOME.x, HOME.y); await raf(); await raf();
        // hold bearing A to steady state
        dn(HOME.x, HOME.y);
        let ax = HOME.x + dx * reach, ay = HOME.y + dy * reach;
        ax = Math.max(6, Math.min(W - 6, ax)); ay = Math.max(6, Math.min(H - 6, ay));
        await slew(HOME.x, HOME.y, ax, ay, 1400);
        { const t0 = T(); while (T() - t0 < 1.6) { mv(ax, ay); await raf(); } }
        const anchorA = { x: parseFloat(joyEl.style.left), y: parseFloat(joyEl.style.top) };
        const s0 = window.__voidState();
        { const t0 = T(); while (T() - t0 < 0.4) { mv(ax, ay); await raf(); } }
        const s1 = window.__voidState();
        const spdA = Math.hypot(s1.x - s0.x, s1.z - s0.z) / 0.4;

        // FLIP: the child decides to go the other way
        let bx = HOME.x - dx * reach, by = HOME.y - dy * reach;
        bx = Math.max(6, Math.min(W - 6, bx)); by = Math.max(6, Math.min(H - 6, by));
        const want = { x: -dx, y: -dy };
        const tFlip = T(); let path = 0, prev = window.__voidState(), prevT = T();
        let latency = null, pathAt = null, wrong = 0, cx = ax, cy = ay;
        const d = Math.hypot(bx - ax, by - ay), dur = d / 1400;
        for (;;) {
          const u = Math.min(1, (T() - tFlip) / dur);
          const nx = ax + (bx - ax) * u, ny = ay + (by - ay) * u;
          path += Math.hypot(nx - cx, ny - cy); cx = nx; cy = ny;
          mv(nx, ny);
          await raf();
          const now = window.__voidState(), tn = T(), ddt = tn - prevT;
          if (ddt > 0.002) {
            const vx = (now.x - prev.x) / ddt, vz = (now.z - prev.z) / ddt;
            const sv = velScreen(vx, vz); const m = Math.hypot(sv.x, sv.y);
            if (m > 0.5) {
              const ang = Math.acos(Math.max(-1, Math.min(1, (sv.x * want.x + sv.y * want.y) / m))) * 180 / Math.PI;
              if (ang > 90) wrong += m * ddt;
              if (latency == null && ang < 45 && m > spdA * 0.5) { latency = tn - tFlip; pathAt = path; }
            }
            prev = now; prevT = tn;
          }
          if (u >= 1 && (latency != null || T() - tFlip > 4)) break;
          if (u >= 1) { /* keep holding B */ }
        }
        const anchorB = { x: parseFloat(joyEl.style.left), y: parseFloat(joyEl.style.top) };
        out.push({ R, reach, deg,
          spdA: +spdA.toFixed(1),
          latency: latency == null ? null : +latency.toFixed(3),
          thumbPx: pathAt == null ? +path.toFixed(0) : +pathAt.toFixed(0),
          wrongUnits: +wrong.toFixed(1),
          anchorMoved: +Math.hypot(anchorB.x - anchorA.x, anchorB.y - anchorA.y).toFixed(0),
          anchorOffHome: +Math.hypot(anchorB.x - HOME.x, anchorB.y - HOME.y).toFixed(0),
        });
      }
    }
  }
  up(HOME.x, HOME.y);
  return out;
});

const g = {}; for (const r of rows) { const k = `R=${r.R} reach=${r.reach}`; (g[k] ||= []).push(r); }
console.log(`WORLD=${WORLD}  180-degree flip: game-seconds and thumb-px to land the new bearing`);
console.log('  void  push   latency(s)      thumb px   void kept going wrong   anchor dragged');
for (const k of Object.keys(g)) {
  const a = g[k], ok = a.filter(r => r.latency != null).map(r => r.latency);
  const med = x => x.length ? [...x].sort((m, n) => m - n)[x.length >> 1] : null;
  console.log(`  ${k.padEnd(18)} `
    + `${ok.length ? med(ok).toFixed(2) : 'NEVER'}`.padStart(9)
    + `${med(a.map(r => r.thumbPx)).toFixed(0)}`.padStart(14)
    + `${med(a.map(r => r.wrongUnits)).toFixed(1)}u`.padStart(20)
    + `${med(a.map(r => r.anchorMoved)).toFixed(0)}px`.padStart(16)
    + (ok.length < a.length ? `   (${a.length - ok.length}/${a.length} never landed)` : ''));
}
console.log('\nraw:', JSON.stringify(rows));
await b.close();
