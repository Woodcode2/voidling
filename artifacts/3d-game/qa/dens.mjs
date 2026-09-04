// DENSITY, ACROSS ALL FOUR WORLDS. Edibles alone is the wrong number — a big
// island with 2,000 props is emptier than a small one with 1,500. Count the
// legal ground too and report per-unit-area, plus the by-district split so I
// know WHERE lantern is thin.
import { chromium } from 'playwright';
import { ALL_WORLDS } from './worlds.mjs';
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium',
  args:['--use-gl=angle','--use-angle=swiftshader','--no-sandbox'] });
const worlds = process.argv[2] ? process.argv[2].split(',') : ALL_WORLDS;
for (const wid of worlds) {
  const p = await b.newPage({ viewport:{width:430,height:932}, deviceScaleFactor:1 });
  await p.route('**/functions/v1/ingest-events', r=>r.fulfill({status:200,body:'{}'}));
  await p.addInitScript(()=>{try{localStorage.setItem('voidPlayed','1');localStorage.setItem('voidTut','1');
    localStorage.setItem('voidDailyLast',new Date().toDateString());}catch{}});
  await p.goto(`http://127.0.0.1:4177/?w=${wid}`,{waitUntil:'domcontentloaded',timeout:300000});
  await p.waitForFunction(()=>!!window.__voidState,null,{timeout:400000});
  const r = await p.evaluate(() => {
    let props = 0, peds = 0; const byD = {}; const bySize = [0,0,0,0,0];
    for (const e of window.__edibles) {
      const m = e.mesh; if (!m) continue;
      const d = window.__biomeAt(m.position.x, m.position.z) || '(off)';
      byD[d] = byD[d] || { p:0, m:0 };
      if (m.userData.mover) { peds++; byD[d].m++; } else { props++; byD[d].p++; }
      const R = e.radius || 0;
      bySize[R < 1 ? 0 : R < 2 ? 1 : R < 4 ? 2 : R < 8 ? 3 : 4]++;
    }
    // legal ground area, by Monte Carlo over the world square
    let hits = 0, N = 60000;
    const areaD = {};
    for (let i = 0; i < N; i++) {
      const x = (Math.random() - 0.5) * 520, z = (Math.random() - 0.5) * 520;
      const d = window.__biomeAt(x, z);
      if (!d) continue;
      hits++; areaD[d] = (areaD[d] || 0) + 1;
    }
    const cell = (520 * 520) / N;
    const area = hits * cell;
    const aD = {}; for (const k in areaD) aD[k] = areaD[k] * cell;
    return { props, peds, byD, bySize, area, aD };
  });
  const tot = r.props + r.peds;
  console.log(`\n══ ${wid.toUpperCase()} ══  ${tot} edibles  (${r.props} props + ${r.peds} movers)`);
  console.log(`   legal ground ${r.area.toFixed(0)} u²   →  ${(tot / r.area * 100).toFixed(2)} edibles / 100u²`);
  console.log(`   by radius:  <1: ${r.bySize[0]}   1-2: ${r.bySize[1]}   2-4: ${r.bySize[2]}   4-8: ${r.bySize[3]}   8+: ${r.bySize[4]}`);
  const rows = Object.keys(r.byD).map(k => ({ k, ...r.byD[k], a: r.aD[k] || 0 }))
    .sort((x,y) => (y.p+y.m) - (x.p+x.m));
  console.log('   district           props  movers   area u²   per 100u²');
  for (const q of rows) {
    const n = q.p + q.m;
    console.log(`     ${q.k.padEnd(16)} ${String(q.p).padStart(5)} ${String(q.m).padStart(7)} ${q.a.toFixed(0).padStart(9)} ${q.a > 0 ? (n/q.a*100).toFixed(2).padStart(10) : '        -'}`);
  }
  await p.close();
}
await b.close();
