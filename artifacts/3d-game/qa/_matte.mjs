// TRIANGLE-WEIGHTED MATERIAL CENSUS. "The world looks like cardboard" as a
// number: what share of the triangles a child actually sees can produce a
// specular highlight at all. Counts InstancedMesh by its instance count, which
// matters here because the crowd and the parked cars are instanced.
import { chromium } from 'playwright';
const worlds = (process.argv[2] || 'maple,pirate,gameday,lantern,powder,skylark').split(',');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
for (const wid of worlds) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch { } });
  await p.goto(`http://127.0.0.1:4177/?w=${wid}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  // stub the draw: this probe reads state, it does not need pixels, and the
  // software renderer is ~9x slower with the draw in.
  await p.evaluate(() => { window.__renderer.render = () => {}; });
  await p.waitForTimeout(3000);
  const r = await p.evaluate(() => {
    const buckets = new Map();
    let total = 0, gloss = 0, metal = 0, emis = 0, unlit = 0;
    let specTri = 0, specSum = 0, uvTri = 0;
    window.__scene.traverse((o) => {
      const g = o.geometry, m = o.material;
      if (!g || !m || o.visible === false) return;
      const pos = g.getAttribute && g.getAttribute('position');
      if (!pos) return;
      const tri = (g.index ? g.index.count : pos.count) / 3;
      const n = tri * (o.isInstancedMesh ? o.count : 1);
      if (!Number.isFinite(n) || n <= 0) return;
      const mats = Array.isArray(m) ? m : [m];
      const mm = mats[0];
      total += n;
      const rough = mm.roughness, met = mm.metalness;
      const em = mm.emissive && (mm.emissive.r + mm.emissive.g + mm.emissive.b) > 0.001
        ? (mm.emissiveIntensity ?? 1) > 0 : false;
      if (mm.isMeshBasicMaterial) unlit += n;
      // the per-vertex specular channel: triangle-weighted, so a hundred roof
      // tiles outweigh one shiny bin exactly as much as they do on screen
      const ag = g.getAttribute('aGloss');
      if (ag) {
        const arr = ag.array; let s = 0, hot = 0;
        for (let i = 0; i < arr.length; i++) { const v = arr[i] / 255; s += v; if (v > 0.15) hot++; }
        const mean = arr.length ? s / arr.length : 0;
        specSum += mean * n;
        specTri += (hot / (arr.length || 1)) * n;
      }
      if (g.getAttribute('uv')) uvTri += n;
      if (rough !== undefined && rough < 0.6) gloss += n;
      if (met !== undefined && met > 0.05) metal += n;
      if (em) emis += n;
      const key = `${mm.type} r=${rough === undefined ? '-' : rough.toFixed(2)}`
        + ` m=${met === undefined ? '-' : met.toFixed(2)}${em ? ' EM' : ''}`;
      buckets.set(key, (buckets.get(key) || 0) + n);
    });
    const top = [...buckets.entries()].sort((a, c) => c[1] - a[1]).slice(0, 8);
    return { total, gloss, metal, emis, unlit, top, specTri, specSum, uvTri };
  });
  const pc = (x) => `${((x / r.total) * 100).toFixed(1)}%`;
  console.log(`\n${wid.toUpperCase()}  ${Math.round(r.total).toLocaleString()} tris visible`);
  console.log(`  rough<0.6 ${pc(r.gloss).padStart(6)}   metal>0.05 ${pc(r.metal).padStart(6)}`
    + `   emissive ${pc(r.emis).padStart(6)}   unlit ${pc(r.unlit).padStart(6)}`);
  console.log(`  aGloss>0.15 ${pc(r.specTri).padStart(6)}   mean gloss ${(r.specSum / r.total).toFixed(3)}`
    + `   still carrying uv ${pc(r.uvTri).padStart(6)}`);
  for (const [k, v] of r.top) console.log(`    ${pc(v).padStart(6)}  ${k}`);
  await p.close();
}
await b.close();
