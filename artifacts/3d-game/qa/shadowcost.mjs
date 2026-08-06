// WHAT DO SHADOWS COST, AND WHERE DO THEY STOP BEING WORTH IT?
//
//   node qa/shadowcost.mjs [world]
//
// The finale of a good run puts the camera ~318 units up with the whole world
// in frustum, and draw calls count the shadow pass. prototype3d.ts:4466
// already turns shadows off for the establishing shot on exactly this
// reasoning — but the intro camera tops out near 300 and the FINALE camera
// goes higher, with shadows fully on, because that fix was written as "during
// the intro" rather than "when the camera is this far away".
//
// This walks the void through its radii, samples __renderer.info with shadows
// on and off at each, and prints the saving next to the shadow map's texel
// density at that distance. Picking the threshold off that table is the point:
// fitShadow() already opens its box to 220 units past camDist 150, which
// spreads a 2048 map to 4.65 texels/unit — below the 6.2 that the comment in
// that very function calls "a detached grey streak". Where the shadows are
// already broken is where they stop being worth their draw calls.
import { chromium } from 'playwright';
const WORLD = process.argv[2] || 'lantern';
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
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 4, null, { timeout: 400000 });
// PIN THE LADDER. Without this the adapter demotes inside seconds on a
// software renderer and the sweep reports rows where shadows cost nothing —
// which is not shadows being free, it is the ladder having already turned
// them off underneath the measurement.
await p.evaluate(() => window.__pinQuality(0));
console.log('quality pinned:', JSON.stringify(await p.evaluate(() => window.__quality())));

console.log(`${WORLD}\n   r   camDist   shadow-on   shadow-off   saved   texels/unit`);
for (const R of [1.5, 3, 5, 7, 9, 12]) {
  const row = await p.evaluate(async (r) => {
    window.__setVoidR(r);
    // let the camera ease to its target and the shadow box refit
    await new Promise((res) => { let n = 0; const f = () => (++n > 90 ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); });
    const cam = window.__cam, ren = window.__renderer;
    // to the VOID, not to the origin — the hero is not at 0,0 and the origin
    // distance was reporting 247 units for a camera 57 units from its subject
    const vs = window.__voidState();
    const camDist = Math.hypot(cam.position.x - vs.x, cam.position.y, cam.position.z - vs.z);
    const sun = window.__scene.children.find((c) => c.isDirectionalLight);
    const box = sun ? (sun.shadow.camera.right - sun.shadow.camera.left) : 0;
    const texels = box ? sun.shadow.mapSize.x / box : 0;
    const sample = async (on) => {
      ren.shadowMap.enabled = on; if (sun) sun.castShadow = on;
      // three bakes shadow support into the compiled program, so flipping the
      // flag alone changes nothing that is already on screen. applyQuality()
      // does this same traverse for the same reason.
      window.__scene.traverse((o) => {
        const m = o.material; if (!m) return;
        (Array.isArray(m) ? m : [m]).forEach((mm) => { mm.needsUpdate = true; });
      });
      let calls = 0;
      for (let k = 0; k < 4; k++) {
        await new Promise((res) => requestAnimationFrame(res));
        calls = ren.info.render.calls;
      }
      return calls;
    };
    const was = ren.shadowMap.enabled;
    const on = await sample(true), off = await sample(false);
    await sample(was);
    return { camDist: Math.round(camDist), on, off, texels: +texels.toFixed(2) };
  }, R);
  const saved = row.on ? Math.round((1 - row.off / row.on) * 100) : 0;
  console.log(`  ${String(R).padStart(4)}  ${String(row.camDist).padStart(6)}  ${String(row.on).padStart(10)}  ${String(row.off).padStart(11)}  ${String(saved).padStart(4)}%  ${String(row.texels).padStart(10)}`);
}
await b.close();
