// REFUTATION PROBE 5 — THE PICTURE THAT SETTLES "the forms all look the same".
// Rivals hidden, hero warped to open ground, shot at each form's radius at the
// REAL gameplay camera, and cropped on the hero's own projected screen centre
// so the six crops are comparable. Also emits each crop upscaled to a common
// size, which is the honest way to ask "is this the same picture twice".
import { chromium } from 'playwright';
import fs from 'node:fs';
const WORLD = process.argv[2] || 'maple';
fs.mkdirSync('qa-out/rfevo2', { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString());
} catch { /* private */ } });
await p.goto(`http://127.0.0.1:4177/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show')
  .forEach((e) => { if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
const tap = async (sel) => { await p.waitForSelector(sel, { timeout: 300000 });
  await p.evaluate((s) => document.querySelector(s).click(), sel); };
await tap('#btnPlay'); await p.waitForTimeout(2500);
await tap(`#worldRow .wCard[data-world="${WORLD}"]`);
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 6, null, { timeout: 1800000 });
// hide every rival: their 40-segment body shares the hero's shader
await p.evaluate(() => {
  window.__hideRivals = () => window.__scene.traverse((o) => {
    // rivals.ts:264 adds the 40-segment body straight to the rival's own group,
    // and rivals.ts:398 adds THAT to the scene — so exactly one parent up is the
    // rival and two would be the scene itself.
    if (o.isMesh && o.material?.uniforms?.uAbyss && (o.geometry.parameters?.widthSegments ?? 0) < 90) {
      if (o.parent && o.parent !== window.__scene) o.parent.visible = false;
    }
  });
});
const frames = (n) => p.evaluate((k) => new Promise((res) => {
  let i = 0; const go = () => (++i >= k ? res() : requestAnimationFrame(go)); requestAnimationFrame(go);
}), n);
const FORMS = [['VOIDLING', 0.9], ['MUNCHER', 2.0], ['GOBBLER', 3.0], ['DEVOURER', 4.4], ['COLOSSUS', 6.5], ['WORLD_ENDER', 10.0]];
const meta = [];
for (const [name, r] of FORMS) {
  for (let k = 0; k < 14; k++) {
    await p.evaluate((rr) => { window.__setVoidR(rr); window.__hideRivals(); window.__setMood('happy'); }, r);
    await frames(4);
  }
  const m = await p.evaluate(() => {
    const THREE = window.__THREE, cam = window.__cam; let body = null;
    window.__scene.traverse((o) => { if (o.isMesh && o.material?.uniforms?.uAbyss && (o.geometry.parameters?.widthSegments ?? 0) >= 90) body = o; });
    const wp = new THREE.Vector3(); body.getWorldPosition(wp);
    const sc = new THREE.Vector3(); body.getWorldScale(sc);
    const camD = cam.position.distanceTo(wp);
    const pr = wp.clone().project(cam);
    return { sx: (pr.x * 0.5 + 0.5) * window.innerWidth, sy: (-pr.y * 0.5 + 0.5) * window.innerHeight,
      pxR: (window.innerHeight / (camD * 2 * Math.tan(cam.fov * Math.PI / 360))) * sc.x,
      uSmall: body.material.uniforms.uSmall.value, uStage: body.material.uniforms.uStage.value };
  });
  await p.screenshot({ path: `qa-out/rfevo2/${name}.png` });
  meta.push({ name, ...m });
  console.log(`  ${name.padEnd(12)} sx=${m.sx.toFixed(0)} sy=${m.sy.toFixed(0)} pxR=${m.pxR.toFixed(1)} uSmall=${m.uSmall.toFixed(3)} uStage=${m.uStage}`);
}
fs.writeFileSync('qa-out/rfevo2/meta.json', JSON.stringify(meta, null, 1));
await b.close();
