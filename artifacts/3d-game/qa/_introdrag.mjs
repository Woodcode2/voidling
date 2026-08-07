// THE FIRST DRAG A CHILD EVER MAKES — does anything move?
//
//   node qa/_introdrag.mjs [world]
//
// prototype3d.ts:3960 damps the control velocity by 0.9^(dt*60) for the whole
// establishing shot (COPY.introLen: 2.2s on Maple and Pirate Bay, 3.4s on Game
// Day, 3.6s on Lantern Night). The DRAG pill is deliberately withheld until
// that ends — but nothing withholds the CHILD. A six-year-old handed a phone
// touches it immediately.
//
// Measures the displacement produced by a full-deflection drag held from the
// first frame of the match, against the same drag held for the same duration
// once the intro is over.
import { chromium } from 'playwright';
const WORLD = process.argv[2] || 'maple';
const PORT = 4237;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });

for (const when of ['during-intro', 'after-intro']) {
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try { localStorage.clear(); } catch { } });
  await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.005, null, { timeout: 600000 });
  await p.evaluate(() => { window.__renderer.render = () => { }; });
  await p.evaluate((when) => {
    const cv = document.querySelector('canvas');
    const pe = (type, x, y) => (type === 'pointerdown' ? cv : window).dispatchEvent(
      new PointerEvent(type, { pointerId: 3, pointerType: 'touch', isPrimary: true, bubbles: true, clientX: x, clientY: y }));
    const s0 = window.__voidState();
    window.__R = { t0: window.__matchState().t, x0: s0.x, z0: s0.z, samples: [] };
    let started = false;
    // hold a full-deflection drag straight "up" the screen for 2.0 match-seconds
    window.__iv = setInterval(() => {
      const ms = window.__matchState(); const v = window.__voidState();
      const guide = document.getElementById('guide');
      const on = when === 'during-intro' ? ms.t >= 0.05 : ms.t >= 4.2;
      const t0 = when === 'during-intro' ? 0.05 : 4.2;
      if (on && ms.t < t0 + 2.0) {
        if (!started) { started = true; pe('pointerdown', 195, 560); window.__R.sx = v.x; window.__R.sz = v.z; window.__R.st = ms.t; }
        pe('pointermove', 195, 440);   // 120 px = well past the 64 px ring: full speed
      } else if (started && ms.t >= t0 + 2.0 && !window.__R.done) {
        window.__R.done = true; window.__R.et = ms.t;
        window.__R.d = Math.hypot(v.x - window.__R.sx, v.z - window.__R.sz);
        window.__R.guideUp = guide.classList.contains('show') ? (guide.textContent || '').trim() : '';
        pe('pointerup', 195, 440);
        clearInterval(window.__iv);
      }
    }, 40);
  }, when);
  await p.waitForFunction(() => window.__R?.done, null, { timeout: 300000 });
  const r = await p.evaluate(() => window.__R);
  console.log(`  ${when.padEnd(13)}  drag held t=${r.st.toFixed(2)} -> ${r.et.toFixed(2)}  `
    + `void moved ${r.d.toFixed(2)} world units   (guide pill at the end: "${r.guideUp || 'none'}")`);
  await p.close();
}
console.log(`\n(${WORLD}: a full-deflection drag for the same two seconds, once inside the establishing`);
console.log(' shot and once after it. The ratio is how much of their first input a child gets back.)');
await b.close();
