// TRUE MESH FOOTPRINT vs EAT RADIUS, and whether the big buildings interpenetrate.
// Every overlap test in the placers works in eat-radius units; nothing checks
// the mesh. Measure the real world-space bounding box of each prop and ask how
// many pairs of BUILDINGS have overlapping boxes.
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
for (const wid of (process.argv[2] || 'gameday,lantern,pirate,maple').split(',')) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 } });
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch { } });
  await p.goto(`http://127.0.0.1:4177/?w=${wid}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => {
    if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
  await p.click('#btnPlay'); await p.waitForTimeout(1400);
  await p.click(`#worldRow .wCard[data-world="${wid}"]`);
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 4, null, { timeout: 600000 });
  await p.waitForTimeout(9000);
  const r = await p.evaluate(() => {
    const THREE = window.__THREE;
    const boxes = [];
    for (const e of window.__edibles) {
      const m = e.mesh; if (!m || !m.visible || e.radius < 2.5 || m.userData.mover) continue;
      m.updateMatrixWorld(true);
      let minx = 1e9, maxx = -1e9, minz = 1e9, maxz = -1e9, n = 0;
      m.traverse((o) => {
        const g = o.geometry; if (!g) return;
        if (!g.boundingBox) g.computeBoundingBox();
        const bb = g.boundingBox; if (!bb) return;
        for (const sx of [bb.min.x, bb.max.x]) for (const sy of [bb.min.y, bb.max.y]) for (const sz of [bb.min.z, bb.max.z]) {
          const v = { x: sx, y: sy, z: sz };
          // apply o.matrixWorld manually
          const el = o.matrixWorld.elements;
          const X = el[0] * v.x + el[4] * v.y + el[8] * v.z + el[12];
          const Z = el[2] * v.x + el[6] * v.y + el[10] * v.z + el[14];
          if (X < minx) minx = X; if (X > maxx) maxx = X;
          if (Z < minz) minz = Z; if (Z > maxz) maxz = Z; n++;
        }
      });
      if (!n) continue;
      boxes.push({ r: +e.radius.toFixed(2), x: +m.position.x.toFixed(1), z: +m.position.z.toFixed(1),
        hw: +(Math.max(maxx - minx, maxz - minz) / 2).toFixed(2), minx, maxx, minz, maxz,
        d: String(window.__biomeAt(m.position.x, m.position.z)) });
    }
    // ratio by radius class
    const byR = {};
    for (const q of boxes) { (byR[q.r] = byR[q.r] || []).push(q.hw / q.r); }
    // overlap count among the big ones
    const big = boxes.filter((q) => q.r >= 4);
    let ov = 0, pairs = 0, worst = 0;
    for (let i = 0; i < big.length; i++) for (let j = i + 1; j < big.length; j++) {
      const a = big[i], c = big[j];
      if (Math.hypot(a.x - c.x, a.z - c.z) > 90) continue;
      pairs++;
      const ox = Math.min(a.maxx, c.maxx) - Math.max(a.minx, c.minx);
      const oz = Math.min(a.maxz, c.maxz) - Math.max(a.minz, c.minz);
      if (ox > 0.5 && oz > 0.5) { ov++; const f = Math.min(ox, oz); if (f > worst) worst = f; }
    }
    return { byR, nbig: big.length, ov, pairs, worst: +worst.toFixed(1),
      boxes: boxes.sort((a, c) => c.r - a.r).slice(0, 6) };
  });
  console.log(`\n══ ${wid.toUpperCase()} ══`);
  const ks = Object.keys(r.byR).map(Number).sort((a, c) => c - a).slice(0, 10);
  console.log('  mesh half-width / eat radius, by prop class:');
  for (const k of ks) { const v = r.byR[k]; const mean = v.reduce((a, c) => a + c, 0) / v.length;
    console.log(`    r=${String(k).padEnd(5)} x${String(v.length).padStart(4)}   half-width is ${mean.toFixed(2)}x the eat radius`); }
  console.log(`  buildings r>=4: ${r.nbig}.  Pairs within 90u: ${r.pairs}.  AABB-OVERLAPPING PAIRS: ${r.ov}  (deepest interpenetration ${r.worst}u)`);
  await p.close();
}
await b.close();
