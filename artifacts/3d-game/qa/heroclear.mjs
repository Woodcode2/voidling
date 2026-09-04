// CAN THE CHILD SEE THE THING THEY ARE STEERING, ALL THE WAY THROUGH A MATCH?
//
//   node qa/heroclear.mjs [port] [samples-per-world]
//
// qa/hero.mjs answers this for the OPENING FRAME at the authored spawn. This
// answers it for the whole match: same 9x9 circle-masked disc over the void's
// silhouette, same short-stopped rays so the void's own parts cannot count as
// occluders — but sampled at the LIVE camera and the LIVE void, repeatedly,
// while it drives.
//
// Measured before the occluder fade existed: 3-13% of frames per world hid a
// quarter or more of the void, and Maple and Lantern each produced a frame
// inside the first forty seconds where it was 100% invisible.
//
// Rays are cast against the props' real geometry, so a DITHERED prop still
// blocks one — which is the point. The number this reports is what the
// renderer would show with no fade at all; the fade is judged on the
// screenshots it writes, and this is here so a future change cannot quietly
// make the occlusion itself worse.
import { chromium } from 'playwright';
import { ALL_WORLDS } from './worlds.mjs';
const PORT = process.argv[2] || '4177';
const N = +(process.argv[3] || 26);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
console.log('world     samples   frames >25% blocked   worst   median');
for (const wid of ALL_WORLDS) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch { } });
  await p.goto(`http://127.0.0.1:${PORT}/?w=${wid}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => {
    if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
  await p.click('#btnPlay'); await p.waitForTimeout(1200);
  await p.click(`#worldRow .wCard[data-world="${wid}"]`);
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 5, null, { timeout: 600000 });

  const rows = await p.evaluate(async (n) => {
    const T = window.__THREE;
    const cv = document.querySelector('canvas');
    const cx = innerWidth / 2, cy = innerHeight / 2;
    cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: cx, clientY: cy, bubbles: true }));
    const out = [];
    for (let i = 0; i < n; i++) {
      // sweep the heading so the void is driven past different scenery
      const a = (i / n) * Math.PI * 2 * 2.6;
      dispatchEvent(new PointerEvent('pointermove', { pointerId: 1,
        clientX: cx + Math.cos(a) * 110, clientY: cy + Math.sin(a) * 110, bubbles: true }));
      const until = window.__matchState().t + 4.2;
      while (window.__matchState().t < until) await new Promise((r) => requestAnimationFrame(r));

      const vs = window.__voidState();
      const cam = window.__cam;
      const centre = new T.Vector3(vs.x, vs.r * 0.55, vs.z);
      const list = [];
      window.__scene.traverse((o) => { if (o.isMesh && o.visible && o.geometry) list.push(o); });
      const fwd = centre.clone().sub(cam.position).normalize();
      const right = new T.Vector3().crossVectors(fwd, new T.Vector3(0, 1, 0)).normalize();
      const upv = new T.Vector3().crossVectors(right, fwd).normalize();
      const rc = new T.Raycaster();
      let total = 0, blocked = 0;
      const K = 9;
      for (let iy = 0; iy < K; iy++) for (let ix = 0; ix < K; ix++) {
        const u = (ix / (K - 1)) * 2 - 1, v = (iy / (K - 1)) * 2 - 1;
        if (u * u + v * v > 1) continue;
        total++;
        const pt = centre.clone()
          .add(right.clone().multiplyScalar(u * vs.r))
          .add(upv.clone().multiplyScalar(v * vs.r));
        const dir = pt.clone().sub(cam.position);
        const len = dir.length(); dir.multiplyScalar(1 / len);
        rc.set(cam.position, dir);
        rc.near = 0.1; rc.far = len - vs.r * 0.9;   // stop short of the void itself
        if (rc.intersectObjects(list, true).length) blocked++;
      }
      out.push({ t: +window.__matchState().t.toFixed(1), blocked: blocked / total });
    }
    return out;
  }, N);

  const b25 = rows.filter((r) => r.blocked > 0.25).length;
  const worst = Math.max(...rows.map((r) => r.blocked));
  const sorted = rows.map((r) => r.blocked).sort((a, x) => a - x);
  const med = sorted[Math.floor(sorted.length / 2)];
  console.log(`${wid.padEnd(9)} ${String(rows.length).padStart(7)}   ${String(b25).padStart(18)}   ${(worst * 100).toFixed(0).padStart(4)}%   ${(med * 100).toFixed(0).padStart(5)}%`);
  await p.close();
}
await b.close();
