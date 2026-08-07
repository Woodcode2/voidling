// GRAPHICS CEILING CENSUS — what the renderer actually pays for, per world,
// on a PINNED quality rung so the adaptive ladder cannot move under the count.
//
//   node qa/_gceil.mjs [worlds] [port]
//
// Reports: draw calls / triangles / programs, and the instancing headroom —
// how many draw calls are spent on (geometry,material) pairs that already
// repeat, which is the exact number an InstancedMesh pass would give back.
// Also censuses material *variety*: how many distinct roughness/metalness/
// emissive combinations actually exist, whether any material carries a
// normal/ao/roughness map, and what fraction of the scene is unlit Basic.
import { chromium } from 'playwright';
const WORLDS = (process.argv[2] || 'maple,pirate,gameday,lantern').split(',');
const PORT = process.argv[3] || '4231';

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
  await p.click(`#worldRow .wCard[data-world="${wid}"]`);
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 4, null, { timeout: 600000 });
  await p.evaluate(() => window.__pinQuality(0));
  await p.waitForTimeout(4000);

  const out = await p.evaluate(async () => {
    const R = window.__renderer;
    const s = [];
    for (let i = 0; i < 6; i++) { await new Promise(r => requestAnimationFrame(r)); s.push({ c: R.info.render.calls, t: R.info.render.triangles }); }
    const avg = k => Math.round(s.reduce((a, x) => a + x[k], 0) / s.length);

    // full-scene census (not just what is in frustum)
    const pairs = new Map();       // geoUUID|matUUID -> count of separate meshes
    const mats = new Map();        // matUUID -> material
    let meshes = 0, instanced = 0, instCount = 0, tris = 0;
    const bucket = { Standard: 0, Basic: 0, Phong: 0, Lambert: 0, Sprite: 0, Points: 0, other: 0 };
    let flat = 0, hasNormalMap = 0, hasAoMap = 0, hasRoughMap = 0, hasMap = 0, vcol = 0;
    const rmSet = new Set();       // distinct roughness/metalness pairs on lit materials
    window.__scene.traverse(o => {
      if (o.isPoints) bucket.Points++;
      if (o.isSprite) bucket.Sprite++;
      if (!o.isMesh || !o.geometry) return;
      let vis = true, q = o; while (q) { if (!q.visible) { vis = false; break; } q = q.parent; }
      if (!vis) return;
      meshes++;
      if (o.isInstancedMesh) { instanced++; instCount += o.count; }
      const g = o.geometry;
      const idx = g.index ? g.index.count : (g.attributes.position?.count ?? 0);
      tris += (idx / 3) * (o.isInstancedMesh ? o.count : 1);
      const ms = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of ms) {
        if (!m) continue;
        mats.set(m.uuid, m);
        const t = m.type.replace('Mesh', '').replace('Material', '');
        if (bucket[t] !== undefined) bucket[t]++; else bucket.other++;
        if (m.flatShading) flat++;
        if (m.normalMap) hasNormalMap++;
        if (m.aoMap) hasAoMap++;
        if (m.roughnessMap) hasRoughMap++;
        if (m.map) hasMap++;
        if (m.vertexColors) vcol++;
        if (m.roughness !== undefined) rmSet.add(`${(+m.roughness).toFixed(2)}/${(+(m.metalness ?? 0)).toFixed(2)}`);
      }
      if (!o.isInstancedMesh) {
        const k = g.uuid + '|' + (Array.isArray(o.material) ? o.material.map(x => x.uuid).join(',') : o.material?.uuid);
        pairs.set(k, (pairs.get(k) || 0) + 1);
      }
    });
    // instancing headroom: for every (geo,mat) pair with n>1 meshes, n-1 draw
    // calls are redundant IF they were merged into one InstancedMesh
    let redundant = 0, groups = 0, biggest = [];
    for (const [k, n] of pairs) if (n > 1) { redundant += n - 1; groups++; biggest.push(n); }
    biggest.sort((a, b) => b - a);
    // and the same for a whole-scene view: how many distinct pairs are there?
    return { calls: avg('c'), fTris: avg('t'), meshes, instanced, instCount,
      sceneTris: Math.round(tris), distinctMats: mats.size, distinctPairs: pairs.size,
      redundant, groups, biggest: biggest.slice(0, 8),
      bucket, flat, hasNormalMap, hasAoMap, hasRoughMap, hasMap, vcol,
      rm: [...rmSet].sort(), progs: R.info.programs?.length ?? 0,
      geos: R.info.memory.geometries, texs: R.info.memory.textures,
      q: window.__quality() };
  });
  console.log(`\n══ ${wid.toUpperCase()} ══ pinned ${JSON.stringify(out.q)}`);
  console.log(`  IN-FRAME  draw calls ${out.calls}   triangles ${out.fTris}   shader programs ${out.progs}`);
  console.log(`  SCENE     visible meshes ${out.meshes} (${out.instanced} instanced holding ${out.instCount})  total tris ${out.sceneTris}  geometries ${out.geos}  textures ${out.texs}`);
  console.log(`  MATERIALS ${out.distinctMats} distinct instances; by type ${JSON.stringify(out.bucket)}`);
  console.log(`            flatShading ${out.flat}  map ${out.hasMap}  normalMap ${out.hasNormalMap}  aoMap ${out.hasAoMap}  roughnessMap ${out.hasRoughMap}  vertexColors ${out.vcol}`);
  console.log(`            distinct roughness/metalness pairs (${out.rm.length}): ${out.rm.join(' ')}`);
  console.log(`  INSTANCING HEADROOM  ${out.distinctPairs} distinct (geo,mat) pairs across ${out.meshes - out.instanced} non-instanced meshes`);
  console.log(`            ${out.redundant} meshes sit on a pair that already repeats (${out.groups} repeat groups; biggest ${out.biggest.join(',')})`);
  await p.close();
}
await b.close();
