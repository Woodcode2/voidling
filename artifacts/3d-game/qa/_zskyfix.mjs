// A/B/C/D of the graphics-worlds sky finding's PROPOSED FIX, live on the scene.
//   A  as shipped (hemi 0.22, exposure 1.0, bgI 1.0)
//   B  RIG reads WORLD_LIGHT: lantern hemi 1.05, exposure 1.34   <- the fix's 2nd half
//   C  per-world bgI 0.25                                        <- the fix's 1st half
//   D  both
// Each shot is masked against a magenta background so SKY and WORLD are
// measured separately rather than guessed from colour.
import { chromium } from 'playwright';
import fs from 'node:fs';
const WORLD = process.argv[2] || 'lantern';
const MARK = Number(process.argv[3] || 88);
const PORT = process.argv[4] || '4177';
const OUT = '/tmp/claude-0/-home-user-voidling/1f93d8f7-3ff2-5559-8b0b-a74b62b39437/scratchpad/sky';
fs.mkdirSync(OUT, { recursive: true });

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
p.setDefaultTimeout(400000);
await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show').forEach(e => {
  if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
await p.click('#btnPlay'); await p.waitForTimeout(1400);
await p.click(`#worldRow .wCard[data-world="${WORLD}"]`);
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout: 400000 });
await p.evaluate(() => {
  window.__RR = window.__renderer.render.bind(window.__renderer);
  window.__stub = () => { window.__renderer.render = () => {}; };
  window.__unstub = () => { window.__renderer.render = window.__RR; };
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
await p.evaluate(() => window.__stub());
await p.waitForFunction(t => (window.__matchState?.().t ?? 0) > t, MARK, { timeout: 900000 });
await p.evaluate(() => window.__unstub());
await p.waitForTimeout(1200);
// freeze the sim so all four variants are the SAME frame
await p.evaluate(() => {
  const s = window.__scene;
  window.__hemi = s.children.filter(c => c.isHemisphereLight)[0];
  window.__base = { hemi: window.__hemi.intensity, exp: window.__renderer.toneMappingExposure, bgI: s.backgroundIntensity };
  window.__setv = (hemi, exp, bgI) => {
    window.__hemi.intensity = hemi; window.__renderer.toneMappingExposure = exp;
    window.__scene.backgroundIntensity = bgI;
  };
});
const base = await p.evaluate(() => window.__base);
console.log('as shipped:', JSON.stringify(base));
const VAR = [
  ['A-shipped', base.hemi, base.exp, base.bgI],
  ['B-rigreads', 1.05, 1.34, base.bgI],
  ['C-bgi025', base.hemi, base.exp, 0.25],
  ['D-both', 1.05, 1.34, 0.25],
];
for (const [tag, hemi, exp, bgI] of VAR) {
  await p.evaluate(([h, e, g]) => window.__setv(h, e, g), [hemi, exp, bgI]);
  await p.waitForTimeout(900);
  await p.screenshot({ path: `${OUT}/fix-${WORLD}-${MARK}-${tag}.png` });
  // magenta mask for this same variant
  await p.evaluate(() => { const s = window.__scene;
    window.__keep = s.background; s.background = new (s.fog.color.constructor)(1, 0, 1); s.backgroundIntensity = 1; });
  await p.waitForTimeout(700);
  await p.screenshot({ path: `${OUT}/fix-${WORLD}-${MARK}-${tag}-M.png` });
  await p.evaluate(([g]) => { window.__scene.background = window.__keep; window.__scene.backgroundIntensity = g; }, [bgI]);
  console.log('shot', tag);
}
await b.close();
