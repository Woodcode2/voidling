// DOES THE SKY SURVIVE A REMATCH? island.ts sets backgroundIntensity to 0.55
// when the painted nebula loads; applyLightRig() writes 1.0 and resetMatch()
// calls it. The nebula texture is cached by match 2, so its callback never
// runs again to put 0.55 back.
import { chromium } from 'playwright';
const WORLD = process.argv[2] || 'maple';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch { } });
await p.goto(`http://127.0.0.1:4177/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => {
  if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
await p.click('#btnPlay'); await p.waitForTimeout(1400);
await p.click(`#worldRow .wCard[data-world="${WORLD}"]`);
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout: 400000 });
// let the nebula land — it is an async texture load
await p.waitForTimeout(6000);
const read = () => p.evaluate(() => ({
  bg: window.__scene.backgroundIntensity,
  sky: window.__scene.background?.isTexture ? 'texture' : String(window.__scene.background),
  sun: +window.__scene.children.filter((c) => c.isDirectionalLight)[0]?.intensity.toFixed(3),
  exp: window.__renderer.toneMappingExposure,
}));
// THE NEBULA IS NOT IN THIS SANDBOX. It is a CDN-vendored asset and the
// preview server answers 403, so island.ts's `backgroundIntensity = 0.55`
// callback never runs here and the sky sits at three's default of 1 in every
// match — which makes the regression invisible rather than absent. Doing by
// hand exactly what that callback does tests the mechanism itself: whether a
// sky intensity set by the SKY survives a call to applyLightRig().
await p.evaluate(() => { window.__scene.backgroundIntensity = 0.55; });
const m1 = await read();
console.log(`match 1  bg=${m1.bg}  sky=${m1.sky}  sun=${m1.sun}  exposure=${m1.exp}`);
// force the rematch path exactly as PLAY AGAIN does
await p.evaluate(() => { window.__renderer.render = () => { }; });
await p.evaluate(() => { const ms = window.__matchState?.(); if (ms) window.__rushClock?.(179); });
await p.waitForFunction(() => document.getElementById('end')?.classList.contains('show'), null, { timeout: 900000 });
await p.click('#btnAgain');
await p.waitForTimeout(4000);
const m2 = await read();
console.log(`match 2  bg=${m2.bg}  sky=${m2.sky}  sun=${m2.sun}  exposure=${m2.exp}`);
const bad = m1.bg !== m2.bg;
console.log(bad ? `\nFAIL: the sky changed on rematch, ${m1.bg} -> ${m2.bg} (${((m2.bg / m1.bg - 1) * 100).toFixed(0)}% brighter)`
  : `\nok: the sky is the same in match 2 as match 1 (${m2.bg})`);
await b.close();
process.exit(bad ? 1 : 0);
