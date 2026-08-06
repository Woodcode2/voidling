// Who actually writes #banner.innerHTML? Capture a stack on every paint so a
// same-frame double-paint can be attributed to a function, not guessed at.
import { chromium } from 'playwright';
const BASE = process.env.RF_BASE || 'http://127.0.0.1:4177';
const WID = process.argv[2] || 'gameday';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
await p.goto(`${BASE}/?w=${WID}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show').forEach(e => {
  if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
await p.click('#btnPlay'); await p.waitForTimeout(1400);
await p.click(`#worldRow .wCard[data-world="${WID}"]`);
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout: 400000 });
await p.evaluate(() => { window.__renderer.render = () => {}; });
await p.evaluate(() => {
  const be = document.getElementById('banner');
  const D = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
  window.__bp = [];
  Object.defineProperty(be, 'innerHTML', { configurable: true,
    get() { return D.get.call(this); },
    set(v) {
      window.__bp.push({ t: +(window.__matchState?.().t ?? -1).toFixed(3),
        w: +(performance.now() / 1000).toFixed(4),
        txt: String(v).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 50),
        st: (new Error().stack || '').split('\n').slice(1, 5).map(s => s.trim().replace(/https?:\/\/\S+\//, '')).join(' | ') });
      D.set.call(this, v);
    } });
  const cv = document.querySelector('canvas');
  const cx = innerWidth / 2, cy = innerHeight / 2;
  cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: cx, clientY: cy, bubbles: true }));
  const tick = () => {
    const vs = window.__voidState(); let best = null, bd = 1e9;
    for (const e of window.__edibles) {
      if (e.eaten || !e.mesh?.visible || e.radius > vs.r * 0.92) continue;
      const dx = e.mesh.position.x - vs.x, dz = e.mesh.position.z - vs.z;
      const d = dx * dx + dz * dz; if (d < bd) { bd = d; best = { dx, dz }; }
    }
    if (best) { const m = Math.hypot(best.dx, best.dz) || 1;
      dispatchEvent(new PointerEvent('pointermove', { pointerId: 1,
        clientX: cx + best.dx / m * 110, clientY: cy + best.dz / m * 110, bubbles: true })); }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});
// stop as soon as we have a same-frame pair, or at the whistle
await p.waitForFunction(() => {
  const b = window.__bp || [];
  for (let i = 1; i < b.length; i++) if (b[i].w - b[i - 1].w < 0.02) return true;
  return document.getElementById('end')?.classList.contains('show');
}, null, { timeout: 900000 });
const bp = await p.evaluate(() => window.__bp);
for (let i = 0; i < bp.length; i++) {
  const d = i + 1 < bp.length ? (bp[i + 1].w - bp[i].w).toFixed(3) : '-';
  console.log(`${String(bp[i].t).padStart(8)}  dW=${String(d).padStart(7)}  ${bp[i].txt}`);
  console.log(`          ${bp[i].st}`);
}
await b.close();
