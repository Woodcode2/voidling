// WHAT THE SURFACES ARE MADE OF — weighted by TRIANGLES, per world.
//   node qa/_gmat2.mjs [worlds] [port]
//
// The first cut of this weighted by bounding-box area and was wrong: it
// filtered on the box BEFORE multiplying by instance count, so the 4,096-strong
// contact-shadow InstancedMesh — one union box the size of the island, times
// 4,096 — came through as 697 million u² and reported GAME DAY as "99.9% unlit
// Basic". Triangles cannot be gamed that way: an instanced mesh contributes
// geometry.triangles x count and nothing else, and it is also the thing the GPU
// actually pays for.
import { chromium } from 'playwright';
const WORLDS = (process.argv[2] || 'maple,pirate,gameday,lantern').split(',');
const PORT = process.argv[3] || '4231';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
for (const wid of WORLDS) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  p.setDefaultTimeout(300000);
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
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 4, null, { timeout: 600000 });
  await p.evaluate(() => { window.__renderer.render = () => {}; });
  await p.waitForTimeout(5000);
  const out = await p.evaluate(() => {
    let tris = 0, spec = 0, metal = 0, emis = 0, vcol = 0, unlit = 0, mapped = 0, ao = 0;
    const rough = new Map();
    window.__scene.traverse(o => {
      if (!o.isMesh || !o.geometry) return;
      let vis = true, q = o; while (q) { if (!q.visible) { vis = false; break; } q = q.parent; }
      if (!vis) return;
      const g = o.geometry;
      const t = ((g.index ? g.index.count : (g.attributes.position?.count ?? 0)) / 3)
        * (o.isInstancedMesh ? o.count : 1);
      const m = Array.isArray(o.material) ? o.material[0] : o.material;
      if (!m) return;
      tris += t;
      if (m.vertexColors) vcol += t;
      if (m.isMeshBasicMaterial) unlit += t;
      if (m.map) mapped += t;
      if (m.aoMap) ao += t;
      if (m.roughness !== undefined && m.roughness < 0.6) spec += t;
      if (m.metalness > 0.05) metal += t;
      if (m.emissive && m.emissive.getHex() !== 0 && (m.emissiveIntensity ?? 1) > 0) emis += t;
      if (m.roughness !== undefined) {
        const k = `${(+m.roughness).toFixed(2)}/${(+(m.metalness ?? 0)).toFixed(2)}`;
        rough.set(k, (rough.get(k) || 0) + t);
      }
    });
    const pc = v => +(100 * v / tris).toFixed(1);
    const top = [...rough.entries()].sort((a, c) => c[1] - a[1]).slice(0, 6)
      .map(([k, v]) => `${k}:${pc(v)}%`);
    return { tris: Math.round(tris), spec: pc(spec), metal: pc(metal), emis: pc(emis),
      vcol: pc(vcol), unlit: pc(unlit), mapped: pc(mapped), ao: pc(ao), top };
  });
  console.log(`\n══ ${wid.toUpperCase()} ══  ${out.tris.toLocaleString()} triangles in the visible scene`);
  console.log(`  roughness<0.6 ${out.spec}%   metalness>0.05 ${out.metal}%   emissive ${out.emis}%   aoMap ${out.ao}%`);
  console.log(`  on a vertex-colour shared material ${out.vcol}%   unlit Basic ${out.unlit}%   carries any map ${out.mapped}%`);
  console.log(`  biggest roughness/metalness buckets: ${out.top.join('  ')}`);
  await p.close();
}
await b.close();
