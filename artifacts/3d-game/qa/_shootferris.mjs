// LOOK AT THE FERRIS WHEEL. island.ts had a 20x scale error that put Maple's
// 16-unit GLB landmark 0.40 units off the west shore, in the highway cell, 286
// units from the county fair it belongs to. The arithmetic is checked outside the
// browser (see the note at the FERRIS line) and qa/_ferris.mjs finds it in the
// scene graph — this is the third instrument, the one that cannot be fooled by a
// coordinate being right while the model is somewhere else.
//
//   node qa/_shootferris.mjs [port] [out.png]
import { chromium } from 'playwright';
const PORT = process.argv[2] || '4177';
const OUT = process.argv[3] || 'docs/crews/round-8/ferris-fixed.png';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 900, height: 600 }, deviceScaleFactor: 1 });
p.on('pageerror', (e) => console.log('[pageerror] ' + e.message.split('\n')[0]));
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try { localStorage.clear();
  localStorage.setItem('voidPlayed','1'); localStorage.setItem('voidTut','1'); localStorage.setItem('voidMute','1');
  localStorage.setItem('voidUnlocked','maple,pirate,gameday,lantern,powder,skylark'); } catch {} });
await p.goto(`http://127.0.0.1:${PORT}/?w=maple&manual=1`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__menuState && window.__menuState().menuMode, null, { timeout: 420000 });
await p.waitForTimeout(18000);   // the GLB loads async under software GL
// Hold the camera inside the game's own rAF: a camera set once is overwritten on
// the next frame by the menu's stage branch. (Five runs of qa/_diovoid.mjs shot
// the wrong thing before this was understood.)
await p.evaluate(() => {
  const cam = window.__cam, T = window.__THREE;
  const look = new T.Vector3(-134.25, 6, -115.25);
  window.__HOLD = () => {
    cam.position.set(-134.25 + 34, 26, -115.25 + 46);
    cam.lookAt(look); cam.far = 4000; cam.updateProjectionMatrix();
    window.__renderer.render(window.__scene, cam);
    requestAnimationFrame(window.__HOLD);
  };
  requestAnimationFrame(window.__HOLD);
});
await p.waitForTimeout(6000);
await p.screenshot({ path: OUT });
console.log('shot -> ' + OUT);
await b.close();
