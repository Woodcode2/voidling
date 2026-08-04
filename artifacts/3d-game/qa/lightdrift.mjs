// Does the LIGHT RIG change between match 1 and match 2?
//
// The rig is built at module scope with `sunI * 1.31` and a hemisphere at a
// hard-coded 0.22 — the numbers the lighting comment says were chosen after
// measuring that ambient fill supplied 68% of Maple's luminance. resetMatch()
// then writes `sun.intensity = LIGHT.sunI` and `hemi.intensity = LIGHT.hemiI`,
// which are the pre-fix values. If resetMatch is what runs on every match after
// the first, the game gets flatter the moment a child taps PLAY AGAIN.
//
// This reads the live lights off the scene, plays a match, taps again, and
// reads them a second time. Rendering is stubbed out so the sim runs at its
// proper rate under the software renderer.
import { chromium } from 'playwright';
const PORT = process.argv[3] || '4177';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
for (const wid of (process.argv[2] || 'maple').split(',')) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
  await p.goto(`http://127.0.0.1:${PORT}/?w=${wid}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.evaluate(() => document.querySelectorAll('.show').forEach(e => {
    if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
  await p.click('#btnPlay'); await p.waitForTimeout(1200);
  await p.click(`#worldRow .wCard[data-world="${wid}"]`);
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 3, null, { timeout: 600000 });

  const read = () => window.__scene.children.reduce((a, o) => {
    if (o.isDirectionalLight) a.sun = { i: +o.intensity.toFixed(4), c: '#' + o.color.getHexString() };
    if (o.isHemisphereLight) a.hemi = { i: +o.intensity.toFixed(4), sky: '#' + o.color.getHexString(), gnd: '#' + o.groundColor.getHexString() };
    return a;
  }, { exposure: +window.__renderer.toneMappingExposure.toFixed(3) });

  const first = await p.evaluate(read);
  // stub the renderer so the match clock runs at real speed, then run it out
  await p.evaluate(() => { window.__renderer.render = () => {}; });
  await p.waitForFunction(() => document.getElementById('end')?.classList.contains('show'), null, { timeout: 900000 });
  await p.click('#btnAgain');
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 2, null, { timeout: 600000 });
  const second = await p.evaluate(read);

  const kf = (r) => +(r.sun.i / Math.max(1e-6, r.hemi.i)).toFixed(2);
  console.log(`\n══ ${wid.toUpperCase()} ══`);
  console.log(`  match 1  sun ${first.sun.i} ${first.sun.c}   hemi ${first.hemi.i} sky ${first.hemi.sky} gnd ${first.hemi.gnd}   exposure ${first.exposure}   key:fill ${kf(first)}`);
  console.log(`  match 2  sun ${second.sun.i} ${second.sun.c}   hemi ${second.hemi.i} sky ${second.hemi.sky} gnd ${second.hemi.gnd}   exposure ${second.exposure}   key:fill ${kf(second)}`);
  const drift = first.sun.i !== second.sun.i || first.hemi.i !== second.hemi.i;
  console.log(drift
    ? `  >>> RIG CHANGED: sun ${first.sun.i} -> ${second.sun.i} (${((second.sun.i/first.sun.i-1)*100).toFixed(0)}%), hemi ${first.hemi.i} -> ${second.hemi.i} (${((second.hemi.i/first.hemi.i-1)*100).toFixed(0)}%), key:fill ${kf(first)} -> ${kf(second)}`
    : `  rig identical across matches`);
  await p.close();
}
await b.close();
