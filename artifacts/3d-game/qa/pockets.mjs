// EVERY INVISIBLE WALL ON EVERY MAP, not the one in the photograph.
//
// An invisible wall is a cell the movement code refuses to enter that LOOKS
// walkable: ground is painted there, the player can see it, nothing is stood
// on it. The containment rule is
//    solid(x,z) = biomeAt(x,z) && !inDeepWater3(x,z,m) && 8x insideIsland3(...m)
// so an interior refusal comes from exactly one of two places — a hole in the
// biome map, or the eight-point margin test failing away from any coast.
//
// Sweep the whole map at the void's mid-game radius, find every illegal cell
// that is NOT adjacent to the map edge, and cluster them. A cluster in the
// middle of a district is a wall a child will walk into and not understand.
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium',
  args:['--use-gl=angle','--use-angle=swiftshader','--no-sandbox'] });
for (const wid of (process.argv[2]||'gameday,maple,pirate,lantern').split(',')) {
  const p = await b.newPage({ viewport:{width:430,height:932}, deviceScaleFactor:1 });
  await p.route('**/functions/v1/ingest-events', r=>r.fulfill({status:200,body:'{}'}));
  await p.addInitScript(()=>{try{localStorage.setItem('voidPlayed','1');localStorage.setItem('voidTut','1');
    localStorage.setItem('voidDailyLast',new Date().toDateString());}catch{}});
  await p.goto(`http://127.0.0.1:4177/?w=${wid}`,{waitUntil:'domcontentloaded',timeout:300000});
  await p.waitForFunction(()=>!!window.__voidState,null,{timeout:400000});
  const r = await p.evaluate(() => {
    const STEP = 3;                       // 3 world units — finer than a void
    const HALF = 300;
    const N = (HALF * 2 / STEP) | 0;
    const R0 = 5.0;                       // a mid-game void; the margin scales with it
    const m = Math.min(R0 * 0.75, 4 + R0 * 0.15) + 1.2;
    const d45 = m * 0.7071;
    const ins = window.__insideIsland3;
    const bio = window.__biomeAt;
    const deep = window.__inDeepWater3 || (() => false);
    const solid = (x, z) => !!bio(x, z) && !deep(x, z, m)
      && ins(x + m, z) && ins(x - m, z) && ins(x, z + m) && ins(x, z - m)
      && ins(x + d45, z + d45) && ins(x - d45, z - d45)
      && ins(x + d45, z - d45) && ins(x - d45, z + d45);
    // grid: 1 legal, 0 illegal-but-on-map, -1 off map
    const g = new Int8Array(N * N);
    const at = (i, j) => (i < 0 || j < 0 || i >= N || j >= N) ? -1 : g[i * N + j];
    const wx = (i) => -HALF + i * STEP, wz = (j) => -HALF + j * STEP;
    let onMap = 0, legal = 0;
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      const x = wx(i), z = wz(j);
      if (!ins(x, z)) { g[i * N + j] = -1; continue; }
      onMap++;
      if (solid(x, z)) { g[i * N + j] = 1; legal++; }
      else g[i * N + j] = 0;
    }
    // flood the illegal cells that touch the map edge — those are the COAST,
    // which is supposed to be illegal and is not a bug
    const q = [], seen = new Uint8Array(N * N);
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      if (g[i * N + j] !== 0) continue;
      // an illegal cell adjacent to off-map is the shoreline
      let edge = false;
      for (const [di, dj] of [[1,0],[-1,0],[0,1],[0,-1]])
        if (at(i+di, j+dj) === -1) edge = true;
      if (edge) { q.push(i * N + j); seen[i * N + j] = 1; }
    }
    while (q.length) {
      const k = q.pop(), i = (k / N) | 0, j = k % N;
      for (const [di, dj] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        const ni = i + di, nj = j + dj;
        if (ni < 0 || nj < 0 || ni >= N || nj >= N) continue;
        const nk = ni * N + nj;
        if (seen[nk] || g[nk] !== 0) continue;
        seen[nk] = 1; q.push(nk);
      }
    }
    // what is left illegal and unseen is an INTERIOR pocket
    const clusters = [];
    const used = new Uint8Array(N * N);
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      const k = i * N + j;
      if (g[k] !== 0 || seen[k] || used[k]) continue;
      const st = [k]; used[k] = 1;
      let n = 0, sx = 0, sz = 0, minI = i, maxI = i, minJ = j, maxJ = j;
      while (st.length) {
        const c = st.pop(), ci = (c / N) | 0, cj = c % N;
        n++; sx += wx(ci); sz += wz(cj);
        if (ci < minI) minI = ci; if (ci > maxI) maxI = ci;
        if (cj < minJ) minJ = cj; if (cj > maxJ) maxJ = cj;
        for (const [di, dj] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]]) {
          const ni = ci + di, nj = cj + dj;
          if (ni < 0 || nj < 0 || ni >= N || nj >= N) continue;
          const nk = ni * N + nj;
          if (used[nk] || g[nk] !== 0 || seen[nk]) continue;
          used[nk] = 1; st.push(nk);
        }
      }
      const cx = sx / n, cz = sz / n;
      clusters.push({ n, area: n * STEP * STEP, cx: +cx.toFixed(1), cz: +cz.toFixed(1),
        w: (maxI - minI + 1) * STEP, h: (maxJ - minJ + 1) * STEP,
        district: bio(cx, cz) || '(no biome)' });
    }
    clusters.sort((a, b2) => b2.area - a.area);
    return { onMap: onMap * STEP * STEP, legal: legal * STEP * STEP,
      clusters: clusters.slice(0, 12), total: clusters.length,
      totalArea: clusters.reduce((s, c) => s + c.area, 0) };
  });
  console.log(`\n══ ${wid.toUpperCase()} ══  on-map ${r.onMap.toFixed(0)}u²  legal ${r.legal.toFixed(0)}u² (${(r.legal/r.onMap*100).toFixed(1)}%)`);
  console.log(`   INTERIOR POCKETS: ${r.total}, ${r.totalArea.toFixed(0)}u² total (${(r.totalArea/r.onMap*100).toFixed(2)}% of the map)`);
  if (!r.total) { console.log('   none — every illegal cell connects to the coast.'); }
  else {
    console.log('     area u²   size      at (x, z)          district');
    for (const c of r.clusters)
      console.log(`     ${String(c.area).padStart(7)}   ${String(c.w)+'x'+String(c.h).padEnd(6)}  (${String(c.cx).padStart(7)}, ${String(c.cz).padStart(7)})   ${c.district}`);
  }
  await p.close();
}
await b.close();
