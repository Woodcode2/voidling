// PHOTOGRAPH EACH JUICE MOMENT.
//
// The sim runs with the renderer stubbed (so a match takes three minutes and
// not half an hour), and the real render function is swapped back in for a
// handful of frames the instant a moment fires, so every shot is the shipping
// frame at the shipping quality rung. Writes qa-out/juice-*.png.
import { chromium } from 'playwright';
import fs from 'fs';
const PORT = process.argv[3] || '4231';
const WORLD = process.argv[2] || 'maple';
fs.mkdirSync('qa-out', { recursive: true });

const b = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader',
    '--autoplay-policy=no-user-gesture-required'],
});
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
p.on('pageerror', e => console.log('PAGE ERROR:', e.message));
await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => {
  try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidMute', '0'); localStorage.setItem('voidHaptics', '1');
    localStorage.setItem('voidMotion', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString());
  } catch { /* private */ }
});
await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show').forEach(e => {
  if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
await p.click('#btnPlay'); await p.waitForTimeout(1400);
await p.click(`#worldRow .wCard[data-world="${WORLD}"]`);
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout: 400000 });

await p.evaluate(() => {
  const W = window;
  W.__pinQuality(0);
  W.__realRender = W.__renderer.render.bind(W.__renderer);
  W.__renderer.render = () => {};
  W.__renderOn = false;
  W.__setRender = (on) => {
    W.__renderOn = on;
    W.__renderer.render = on ? W.__realRender : () => {};
  };
  // the moment queue: each trigger fires once
  W.__want = [];
  W.__hits = [];
  W.__armed = {};
  const seen = new Set();
  const fire = (name, note) => { if (seen.has(name)) return; seen.add(name); W.__want.push({ name, note, t: W.__matchState().t }); };
  W.__watch = () => {
    const ev = document.getElementById('evolve');
    if (ev?.classList.contains('show')) fire('evolve-' + (ev.innerText || '').split(' ')[0], ev.innerText);
    const bn = document.getElementById('banner');
    if (bn?.classList.contains('show')) {
      const tx = (bn.innerText || '').replace(/\s+/g, ' ').trim();
      if (/STICKER FOUND/i.test(tx)) fire('sticker', tx);
      if (/beat the chaser|DEVOURED|You ate/i.test(tx)) fire('rival-eaten', tx);
      if (/SECONDS/i.test(tx)) fire('last35', tx);
      if (/Band practice|Dog off|parade|goat/i.test(tx)) fire('beat', tx);
      if (/WORLD ENDER/i.test(tx)) fire('ender-banner', tx);
    }
    for (const f of document.querySelectorAll('.vf')) {
      const tx = (f.textContent || '').trim();
      if (!tx || !f.classList.contains('go')) continue;
      if (/BONK|OOF/.test(tx)) fire('bitten', tx);
      if (/CHOMP/.test(tx)) fire('bigeat', tx);
      if (/^\+\d+$/.test(tx)) fire('smalleat', tx);
      if (/NEAR MISS/.test(tx)) fire('nearmiss', tx);
    }
    if (document.getElementById('end')?.classList.contains('show')) fire('results', 'end');
  };
  setInterval(W.__watch, 40);
  // drive at the nearest edible
  const cv = document.querySelector('canvas');
  const cx = innerWidth / 2, cy = innerHeight / 2;
  cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: cx, clientY: cy, bubbles: true }));
  const tick = () => {
    const vs = W.__voidState(); let best = null, bd = 1e9;
    for (const e of W.__edibles) {
      if (e.eaten || !e.mesh?.visible || e.radius > vs.r * 0.92) continue;
      const dx = e.mesh.position.x - vs.x, dz = e.mesh.position.z - vs.z;
      const d = dx * dx + dz * dz; if (d < bd) { bd = d; best = { dx, dz }; }
    }
    if (best) { const m = Math.hypot(best.dx, best.dz) || 1;
      cv.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1,
        clientX: cx + (best.dx / m) * 70, clientY: cy + (best.dz / m) * 70, bubbles: true })); }
    setTimeout(tick, 100);
  };
  tick();
});

const shot = async (name, note, t) => {
  await p.evaluate(() => window.__setRender(true));
  await p.waitForTimeout(500);
  await p.screenshot({ path: `qa-out/juice-${name}.png` });
  await p.evaluate(() => window.__setRender(false));
  console.log(`shot juice-${name}.png  t=${t.toFixed(1)}  ${String(note).replace(/\s+/g, ' ').slice(0, 70)}`);
};

const deadline = Date.now() + 15 * 60 * 1000;
while (Date.now() < deadline) {
  const q = await p.evaluate(() => { const w = window.__want; window.__want = []; return w; });
  for (const m of q) await shot(m.name, m.note, m.t);
  const done = await p.evaluate(() => document.getElementById('end')?.classList.contains('show')
    || (window.__matchState?.().t ?? 0) > 184);
  if (done) break;
  await p.waitForTimeout(150);
}
// mop up anything queued at the whistle
const q2 = await p.evaluate(() => { const w = window.__want; window.__want = []; return w; });
for (const m of q2) await shot(m.name, m.note, m.t);
await p.evaluate(() => window.__setRender(true));
await p.waitForTimeout(2500);
await p.screenshot({ path: 'qa-out/juice-results.png' });
console.log('shot juice-results.png');
await b.close();
