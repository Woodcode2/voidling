// THE THREE FRAMES AROUND AN EVOLUTION.
//
//   node qa/_evoframe.mjs [world]
//
// Claim under test: onEat writes the RAW grown radius (prototype3d.ts:2307);
// the evolution check reads it later in the SAME frame (:4619) and latches
// curStage; and the growth-law rate limiter (:4023) — which runs at the top of
// animate(), i.e. on the NEXT frame — takes the overshoot straight back off.
// If that is right, the frame after an evolve card should show the radius
// dropping back to roughly its pre-bite value, not holding.
//
// So: record the radius every frame, catch the card with a MutationObserver,
// and print the eight frames on either side.
import { chromium } from 'playwright';
const WORLD = process.argv[2] || 'maple';
const PORT = 4237;
const FORM_MIN = [0, 1.6, 2.5, 3.6, 5.5, 8.0];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try { localStorage.clear(); } catch { } });
await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.01, null, { timeout: 600000 });
await p.evaluate(() => {
  window.__F = []; window.__HIT = [];
  window.__renderer.render = () => {
    const ms = window.__matchState(); if (!ms) return;
    window.__F.push([+ms.t.toFixed(3), +ms.r.toFixed(4)]);
  };
  new MutationObserver(() => {
    const e = document.getElementById('evolve');
    if (!e.classList.contains('show')) return;
    window.__HIT.push({ i: window.__F.length, t: window.__matchState().t,
      card: (e.querySelector('.big') || {}).textContent,
      bar: (document.querySelector('#growth .gNow') || {}).textContent });
  }).observe(document.getElementById('evolve'), { attributes: true, attributeFilter: ['class'] });
  // driver
  const cv = document.querySelector('canvas');
  let down = false, dx = 0, dy = -1, dirT = 0;
  const pe = (t2, x, y) => (t2 === 'pointerdown' ? cv : window).dispatchEvent(
    new PointerEvent(t2, { pointerId: 5, pointerType: 'touch', isPrimary: true, bubbles: true, clientX: x, clientY: y }));
  setInterval(() => {
    const ms = window.__matchState(); if (!ms || ms.t < 1) return;
    if (ms.t > dirT) {
      dirT = ms.t + 1.2; const vs = window.__voidState(); let bd = 1e9, bx = 0, bz = 0;
      for (const e of window.__edibles) {
        if (!e.mesh.visible || e.eaten || e.radius > ms.r * 0.92) continue;
        const d = Math.hypot(e.mesh.position.x - vs.x, e.mesh.position.z - vs.z);
        if (d < bd) { bd = d; bx = e.mesh.position.x - vs.x; bz = e.mesh.position.z - vs.z; }
      }
      const l = Math.hypot(bx, bz) || 1; dx = bx / l; dy = bz / l;
    }
    if (!down) { down = true; pe('pointerdown', 195, 500); }
    pe('pointermove', 195 + dx * 90, 500 + dy * 90);
  }, 55);
});
const t0 = Date.now();
while (true) {
  const s = await p.evaluate(() => ({ t: window.__matchState().t, n: window.__HIT.length }));
  if (s.n >= 2 || s.t > 120) break;
  if (Date.now() - t0 > 500000) break;
  await p.waitForTimeout(3000);
}
const r = await p.evaluate(() => ({ F: window.__F, HIT: window.__HIT }));
console.log(`\n═══ ${WORLD.toUpperCase()} — frames around each "you EVOLVED!" card ═══`);
for (const h of r.HIT) {
  const need = FORM_MIN[['VOIDLING', 'MUNCHER', 'GOBBLER', 'DEVOURER', 'COLOSSUS', 'WORLD ENDER'].indexOf(h.card)];
  console.log(`\n  card "${h.card}" at match t=${h.t.toFixed(3)} (threshold ${need}); growth bar reads "${h.bar}"`);
  for (let i = Math.max(0, h.i - 6); i < Math.min(r.F.length, h.i + 10); i++) {
    const [t, rad] = r.F[i];
    console.log(`     ${i === h.i || i === h.i - 1 ? '>>' : '  '} frame ${i}  t=${t.toFixed(3)}  r=${rad.toFixed(4)}  ${rad >= need ? 'ABOVE' : 'below'}`);
  }
}
await b.close();
