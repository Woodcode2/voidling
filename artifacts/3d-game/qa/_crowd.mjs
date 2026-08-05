// PERF-FRAME pass 8 — HOW MANY THINGS WALK, and how many of them are anywhere
// near the camera. life.ts's mover.update() runs for every mover every frame
// with no distance gate, and each pedestrian step costs 3 to 10 point-in-polygon
// tests. This counts the population and how much of it is off screen.
import { chromium } from 'playwright';
const PORT = process.env.PORT || 4177;
const WORLDS = (process.argv[2] || 'maple,pirate,gameday,lantern').split(',');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
for (const wid of WORLDS) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
  await p.goto(`http://127.0.0.1:${PORT}/?w=${wid}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.evaluate(() => document.querySelectorAll('.show').forEach(e => {
    if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
  await p.click('#btnPlay'); await p.waitForTimeout(1400);
  await p.click(`#worldRow #worldRow`).catch(() => {});
  await p.click(`#worldRow .wCard[data-world="${wid}"]`);
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 8, null, { timeout: 600000 });
  const r = await p.evaluate(() => {
    const vs = window.__voidState();
    // movers are the animated population: they carry userData.mover
    let movers = 0, near = 0, far = 0, offscreen = 0;
    const fr = new window.__THREE.Frustum();
    const cam = window.__cam;
    fr.setFromProjectionMatrix(new window.__THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    const box = new window.__THREE.Box3();
    window.__scene.traverse(o => {
      if (!o.userData || !o.userData.mover) return;
      movers++;
      const d = Math.hypot(o.position.x - vs.x, o.position.z - vs.z);
      if (d < 90) near++; else far++;
      box.setFromCenterAndSize(o.position, new window.__THREE.Vector3(4, 4, 4));
      if (!fr.intersectsBox(box)) offscreen++;
    });
    return { movers, near, far, offscreen, edibles: window.__edibles.length, r: vs.r };
  });
  console.log(`${wid.padEnd(9)} movers ${String(r.movers).padStart(4)}   within 90u of the void ${String(r.near).padStart(4)}   beyond ${String(r.far).padStart(4)}   OUTSIDE THE CAMERA FRUSTUM ${String(r.offscreen).padStart(4)} (${(100 * r.offscreen / Math.max(1, r.movers)).toFixed(0)}%)   edibles ${r.edibles}`);
  await p.close();
}
await b.close();
