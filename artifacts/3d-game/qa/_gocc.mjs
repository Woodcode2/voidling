// HOW OFTEN IS THE HERO BEHIND SOMETHING, over a whole real match.
//   node qa/_gocc.mjs [worlds] [port]
//
// hero.mjs answers this for the authored opening frame only. This one plays a
// match with the AI drive on, samples the LIVE camera every ~2s of MATCH time
// (never wall clock — the software renderer is a fraction of real time), and
// reports the distribution of "how much of the void's silhouette is behind
// scenery", plus what does the blocking. The void's own rig is excluded the
// same way hero.mjs excludes it.
import { chromium } from 'playwright';
const WORLDS = (process.argv[2] || 'maple,pirate,gameday,lantern').split(',');
const PORT = process.argv[3] || '4231';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
for (const wid of WORLDS) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  p.setDefaultTimeout(600000);
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
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 3, null, { timeout: 600000 });
  // drive it: a steady drag so the void actually tours the island rather than
  // sitting on its spawn. Re-aimed every sample so it does not park on a wall.
  await p.evaluate(() => { window.__renderer.render = () => {}; });

  const samples = await p.evaluate(async () => {
    const T = window.__THREE;
    const cv = document.querySelector('canvas');
    const send = (type, x, y) => cv.dispatchEvent(new PointerEvent(type,
      { pointerId: 1, clientX: x, clientY: y, bubbles: true, isPrimary: true }));
    const cx = innerWidth / 2, cy = innerHeight * 0.72;
    send('pointerdown', cx, cy);
    const rc = new T.Raycaster();
    const out = [];
    let lastT = window.__matchState().t, aim = 0;
    const t0 = Date.now();
    while (out.length < 60 && Date.now() - t0 < 240000) {
      await new Promise(r => setTimeout(r, 40));
      const ms = window.__matchState();
      if (ms.t - lastT < 2) continue;
      lastT = ms.t;
      aim += 0.7;
      send('pointermove', cx + Math.cos(aim) * 110, cy + Math.sin(aim) * 110);
      const vs = window.__voidState();
      const cam = window.__cam;
      const centre = new T.Vector3(vs.x, vs.r * 0.55, vs.z);
      // only what can plausibly sit between the camera and the hero — a full
      // 10k-mesh raycast per sample is minutes of CPU for the same answer
      const list = []; const _w = new T.Vector3();
      const reach = cam.position.distanceTo(centre) + 30;
      window.__scene.traverse(o => {
        if (!o.isMesh || !o.visible || !o.geometry) return;
        o.getWorldPosition(_w);
        if (_w.distanceTo(centre) > reach) return;
        list.push(o);
      });
      const fwd = centre.clone().sub(cam.position).normalize();
      const right = new T.Vector3().crossVectors(fwd, new T.Vector3(0, 1, 0)).normalize();
      const upv = new T.Vector3().crossVectors(right, fwd).normalize();
      let total = 0, blocked = 0; const who = new Map();
      const N = 9;
      for (let iy = 0; iy < N; iy++) for (let ix = 0; ix < N; ix++) {
        const u = (ix / (N - 1)) * 2 - 1, v = (iy / (N - 1)) * 2 - 1;
        if (u * u + v * v > 1) continue;
        total++;
        const pt = centre.clone().add(right.clone().multiplyScalar(u * vs.r))
          .add(upv.clone().multiplyScalar(v * vs.r));
        const dir = pt.clone().sub(cam.position).normalize();
        const d = cam.position.distanceTo(pt);
        rc.set(cam.position, dir); rc.near = 0.5; rc.far = d - vs.r * 0.35;
        const hits = rc.intersectObjects(list, false);
        let hit = null;
        for (const h of hits) {
          let t = h.object; while (t.parent && t.parent !== window.__scene) t = t.parent;
          const w = new T.Vector3(); t.getWorldPosition(w);
          if (Math.hypot(w.x - centre.x, w.z - centre.z) < vs.r * 2) continue;
          hit = t; break;
        }
        if (!hit) continue;
        blocked++;
        const k = String(hit.userData?.eRadius ?? 'n/a');
        who.set(k, (who.get(k) || 0) + 1);
      }
      out.push({ t: +ms.t.toFixed(1), r: +vs.r.toFixed(2), pct: +(blocked / total * 100).toFixed(1),
        who: [...who.entries()].sort((a, c) => c[1] - a[1]).slice(0, 2) });
    }
    send('pointerup', cx, cy);
    return out;
  });
  const pcts = samples.map(s => s.pct).sort((a, b) => a - b);
  const q = f => pcts[Math.min(pcts.length - 1, Math.floor(pcts.length * f))] ?? 0;
  const over = f => (100 * pcts.filter(v => v >= f).length / Math.max(1, pcts.length)).toFixed(0);
  console.log(`\n══ ${wid.toUpperCase()} ══ ${samples.length} samples over ${samples.at(-1)?.t ?? 0}s of MATCH time`);
  console.log(`  hero occlusion  median ${q(0.5)}%  p75 ${q(0.75)}%  p90 ${q(0.9)}%  max ${q(1)}%`);
  console.log(`  frames >=25% hidden: ${over(25)}%   >=50% hidden: ${over(50)}%`);
  const worst = [...samples].sort((a, b) => b.pct - a.pct).slice(0, 5);
  for (const w of worst) console.log(`     t=${w.t}s r=${w.r}  ${w.pct}% hidden, by eRadius ${w.who.map(x => x[0] + 'x' + x[1]).join(' ')}`);
  await p.close();
}
await b.close();
