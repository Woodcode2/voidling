// WHAT THE SURFACES ARE MADE OF — area-weighted, per world.
//   node qa/_gmat.mjs [worlds] [port]
//
// Three questions the census of material COUNTS could not answer:
//  1. how much of the visible surface has any specular character at all
//     (roughness < 0.6 or metalness > 0) versus flat matte;
//  2. how much of it rides the three shared vertex-colour materials, because
//     `part()` (island.ts:2994) writes one flat colour per vertex — that
//     attribute is the free hook for baked AO, and this counts how much of the
//     game it would reach;
//  3. whether any merged prop currently has ANY vertical value gradient in its
//     own albedo — i.e. is a wall's foot darker than its head before the light
//     rig touches it. Correlation of vertex-colour luminance against local Y.
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
  await p.waitForTimeout(6000);

  const out = await p.evaluate(() => {
    const T = window.__THREE;
    const bb = new T.Box3();
    let area = 0, spec = 0, metal = 0, emis = 0, shared = 0, unlit = 0, textured = 0;
    let sharedVerts = 0, sharedMeshes = 0;
    const matArea = new Map();
    window.__scene.traverse(o => {
      if (!o.isMesh || !o.geometry) return;
      let vis = true, q = o; while (q) { if (!q.visible) { vis = false; break; } q = q.parent; }
      if (!vis) return;
      try { bb.setFromObject(o); } catch { return; }
      const sx = bb.max.x - bb.min.x, sy = bb.max.y - bb.min.y, sz = bb.max.z - bb.min.z;
      if (!isFinite(sx) || !isFinite(sy) || !isFinite(sz)) return;
      let a = 2 * (sx * sy + sz * sy) + sx * sz;      // rough surface area of the box
      if (a > 200000) return;                          // ground / water / sky shell
      a *= (o.isInstancedMesh ? o.count : 1);
      const ms = Array.isArray(o.material) ? o.material : [o.material];
      const m = ms[0]; if (!m) return;
      area += a;
      matArea.set(m.name || m.uuid, (matArea.get(m.name || m.uuid) || 0) + a);
      if (m.vertexColors) { shared += a; sharedMeshes++;
        sharedVerts += (o.geometry.getAttribute('position')?.count ?? 0) * (o.isInstancedMesh ? o.count : 1); }
      if (m.isMeshBasicMaterial) unlit += a;
      if (m.map) textured += a;
      if (m.roughness !== undefined && m.roughness < 0.6) spec += a;
      if (m.metalness > 0.05) metal += a;
      if (m.emissive && m.emissive.getHex() !== 0 && (m.emissiveIntensity ?? 1) > 0) emis += a;
    });

    // ── vertical albedo gradient inside merged props ────────────────────────
    // For every mesh whose material carries vertexColors, correlate each
    // vertex's colour luminance with its LOCAL y. A prop with baked AO has a
    // strongly negative slope (dark at the foot); a prop with none has ~0.
    let sampled = 0, slopeSum = 0, zeroSlope = 0;
    const slopes = [];
    window.__scene.traverse(o => {
      if (sampled >= 400) return;
      if (!o.isMesh || !o.geometry) return;
      const m = Array.isArray(o.material) ? o.material[0] : o.material;
      if (!m?.vertexColors) return;
      const col = o.geometry.getAttribute('color'), pos = o.geometry.getAttribute('position');
      if (!col || !pos || pos.count < 24) return;
      let n = 0, sy = 0, sl = 0, syy = 0, sly = 0, minY = Infinity, maxY = -Infinity;
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i);
        const L = 0.2126 * col.getX(i) + 0.7152 * col.getY(i) + 0.0722 * col.getZ(i);
        n++; sy += y; sl += L; syy += y * y; sly += L * y;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
      const den = n * syy - sy * sy;
      if (den <= 1e-9 || maxY - minY < 0.5) return;
      // slope in luminance per unit of the prop's own height — normalised so a
      // "-0.30" means the foot is 0.30 luminance darker than the head
      const slope = ((n * sly - sy * sl) / den) * (maxY - minY);
      sampled++; slopeSum += slope; slopes.push(slope);
      if (Math.abs(slope) < 0.02) zeroSlope++;
    });
    slopes.sort((a, b) => a - b);
    const topMats = [...matArea.entries()].sort((a, c) => c[1] - a[1]).slice(0, 5)
      .map(([k, v]) => `${k.slice(0, 8)}:${(100 * v / area).toFixed(1)}%`);
    return { area: Math.round(area),
      specPct: +(100 * spec / area).toFixed(1), metalPct: +(100 * metal / area).toFixed(1),
      emisPct: +(100 * emis / area).toFixed(1), sharedPct: +(100 * shared / area).toFixed(1),
      unlitPct: +(100 * unlit / area).toFixed(1), texPct: +(100 * textured / area).toFixed(1),
      sharedVerts, sharedMeshes, sampled, zeroSlope, meanSlope: +(slopeSum / Math.max(1, sampled)).toFixed(4),
      p05: +(slopes[Math.floor(slopes.length * 0.05)] ?? 0).toFixed(3),
      p95: +(slopes[Math.floor(slopes.length * 0.95)] ?? 0).toFixed(3), topMats };
  });
  console.log(`\n══ ${wid.toUpperCase()} ══  ${out.area} u² of prop surface`);
  console.log(`  specular character (roughness<0.6) ${out.specPct}%   metalness>0.05 ${out.metalPct}%   emissive ${out.emisPct}%`);
  console.log(`  on a vertex-colour shared material ${out.sharedPct}%   unlit Basic ${out.unlitPct}%   carries a map ${out.texPct}%`);
  console.log(`  vertex-colour meshes ${out.sharedMeshes} holding ${out.sharedVerts} vertices — one extra float each is ${(out.sharedVerts * 4 / 1048576).toFixed(2)} MB of VRAM`);
  console.log(`  BAKED-AO SLOPE  ${out.sampled} merged props sampled; mean luminance change foot->head ${out.meanSlope}  p05 ${out.p05}  p95 ${out.p95}  |slope|<0.02 on ${out.zeroSlope}/${out.sampled}`);
  await p.close();
}
await b.close();
