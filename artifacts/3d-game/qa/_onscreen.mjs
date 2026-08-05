// HOW MANY THINGS ARE ACTUALLY ON SCREEN?
//
//   node qa/_onscreen.mjs [worlds] [port]
//
// "objects per 100u² of district" (qa/dens.mjs) is the map-maker's number.
// This is the player's: how many edible props fall inside the real camera
// frustum in the opening frame, and how much of the visible ground they cover.
// A world can be dense on the map and empty on the phone if the camera is
// looking at its biggest field.
import { chromium } from 'playwright';
const WORLDS = (process.argv[2] || 'maple,gameday,pirate,lantern').split(',');
const PORT = process.argv[3] || '4191';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
for (const wid of WORLDS) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  p.setDefaultTimeout(400000);
  await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
  await p.goto(`http://127.0.0.1:${PORT}/?w=${wid}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.evaluate(() => document.querySelectorAll('.show').forEach(e => {
    if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
  await p.click('#btnPlay'); await p.waitForTimeout(1400);
  await p.click(`#worldRow .wCard[data-world="${wid}"]`);
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 5.5, null, { timeout: 900000 });
  await p.evaluate(() => { window.__renderer.render = () => {}; });
  await p.waitForTimeout(4000);
  const out = await p.evaluate(() => {
    const T = window.__THREE, cam = window.__cam;
    cam.updateMatrixWorld(); cam.updateProjectionMatrix();
    const v = new T.Vector3();
    // count edibles whose CENTRE projects inside the viewport
    let onScreen = 0, total = 0, area = 0, big = 0;
    for (const e of window.__edibles) {
      if (e.eaten || !e.mesh?.visible) continue;
      total++;
      v.copy(e.mesh.position).project(cam);
      if (v.z < 1 && Math.abs(v.x) <= 1 && Math.abs(v.y) <= 1) {
        onScreen++; area += Math.PI * e.radius * e.radius;
        if (e.radius >= 3) big++;
      }
    }
    // ground area the camera covers, from the two ground-plane corner rays
    const corner = (nx, ny) => {
      const q = new T.Vector3(nx, ny, 0.5).unproject(cam).sub(cam.position).normalize();
      const t = -cam.position.y / q.y;
      return new T.Vector3().copy(cam.position).addScaledVector(q, t);
    };
    const a = corner(-1, -1), c = corner(1, -1), d = corner(-1, 1), f = corner(1, 1);
    const tri = (P, Q, R) => Math.abs((Q.x - P.x) * (R.z - P.z) - (R.x - P.x) * (Q.z - P.z)) / 2;
    const ground = tri(a, c, f) + tri(a, f, d);
    return { total, onScreen, big, propArea: +area.toFixed(0), ground: +ground.toFixed(0),
      cover: +(area / ground * 100).toFixed(2), camY: +cam.position.y.toFixed(1) };
  });
  console.log(`\n══ ${wid.toUpperCase()} ══ opening frame, 430x932`);
  console.log(`  edibles alive ${out.total}   ON SCREEN ${out.onScreen}   of which r>=3: ${out.big}`);
  console.log(`  visible ground ${out.ground} u²   prop disc area ${out.propArea} u²   GROUND COVERED BY PROPS ${out.cover}%`);
  await p.close();
}
await b.close();
