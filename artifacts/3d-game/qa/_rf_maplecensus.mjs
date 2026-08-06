// REFUTATION PROBE: is Maple's small-prop shortfall what the finding says?
//   node qa/_rf_maplecensus.mjs [worlds] [port]
// Reads the world at BOOT (no match needed — populate() runs at build time),
// counts every edible, its radius, whether it is a mover, and whether it
// carries a contact disc (userData.cshadow child, pre-bake) or has been
// harvested (userData.shIdx). Also reports legal ground area by Monte Carlo so
// props-per-area is comparable across worlds of different size.
import { chromium } from 'playwright';
const WORLDS = (process.argv[2] || 'maple,gameday,pirate,lantern').split(',');
const PORT = process.argv[3] || '4177';
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
  await p.waitForTimeout(6000);   // let async glb() land
  const r = await p.evaluate(() => {
    let props = 0, movers = 0, disc = 0, discMover = 0, cast = 0;
    const bySize = [0, 0, 0, 0, 0, 0];   // <0.8 .8-1.5 1.5-2.5 2.5-4 4-8 8+
    const bucket = (R) => R < 0.8 ? 0 : R < 1.5 ? 1 : R < 2.5 ? 2 : R < 4 ? 3 : R < 8 ? 4 : 5;
    let discArea = 0, allArea = 0;
    for (const e of window.__edibles) {
      const m = e.mesh; if (!m) continue;
      const mv = !!m.userData.mover;
      if (mv) movers++; else props++;
      bySize[bucket(e.radius || 0)]++;
      allArea += Math.PI * e.radius * e.radius;
      const d = m.children.find(c => c.userData && c.userData.cshadow);
      const has = !!d || m.userData.shIdx !== undefined;
      if (has) { disc++; discArea += Math.PI * e.radius * e.radius; if (mv) discMover++; }
      else cast++;
    }
    // legal ground, Monte Carlo over a generous square
    let hits = 0; const N = 80000; const S = 900;
    for (let i = 0; i < N; i++) {
      const x = (Math.random() - 0.5) * S, z = (Math.random() - 0.5) * S;
      if (window.__biomeAt(x, z)) hits++;
    }
    const area = hits * (S * S) / N;
    return { props, movers, disc, discMover, cast, bySize, area: Math.round(area),
      total: window.__edibles.length, discArea: Math.round(discArea), allArea: Math.round(allArea) };
  });
  const per = (n) => (n / r.area * 10000).toFixed(1);
  console.log(`\n══ ${wid.toUpperCase()} ══ ${r.total} edibles  (static ${r.props}, movers ${r.movers})  legal ground ${r.area} u²`);
  console.log(`  radius buckets  <0.8:${r.bySize[0]}  0.8-1.5:${r.bySize[1]}  1.5-2.5:${r.bySize[2]}  2.5-4:${r.bySize[3]}  4-8:${r.bySize[4]}  8+:${r.bySize[5]}`);
  console.log(`  CONTACT DISC (no cast shadow): ${r.disc}   of which movers ${r.discMover}   cast-shadow props ${r.cast}`);
  console.log(`  per 10,000 u² of legal ground:  all edibles ${per(r.total)}   disc props ${per(r.disc)}`);
  console.log(`  total prop disc area ${r.allArea} u² = ${(r.allArea / r.area * 100).toFixed(1)}% of legal ground`);
  await p.close();
}
await b.close();
