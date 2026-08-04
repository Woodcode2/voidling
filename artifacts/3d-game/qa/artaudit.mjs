// ART AUDIT — one pass per world answering the questions an opinion cannot:
//  • the MATERIAL inventory: how many distinct materials actually reach the GPU,
//    how many carry a map, what the roughness/metalness spread is
//  • the SILHOUETTE inventory: height histogram of every edible, because
//    "sparse" and "flat" are different complaints and only one is about count
//  • the FRAME: luminance mean/spread/percentiles and hue spread, sampled from
//    a real screenshot (preserveDrawingBuffer is off, so the canvas cannot be
//    read directly — decode the PNG in-page instead)
//  • draw calls / triangles, so any density proposal has a budget to argue with
import { chromium } from 'playwright';
import fs from 'node:fs';
fs.mkdirSync('qa-out', { recursive: true });
const PORT = process.argv[3] || '4177';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
for (const wid of (process.argv[2] || 'maple,pirate,gameday,lantern').split(',')) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
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
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 6, null, { timeout: 900000 });

  const shot = `qa-out/audit-${wid}.png`;
  await p.screenshot({ path: shot });

  const r = await p.evaluate(async (b64) => {
    const R = window.__renderer, S = window.__scene;
    await new Promise(r => setTimeout(r, 1500));
    const s = [];
    for (let i = 0; i < 8; i++) { await new Promise(r => requestAnimationFrame(r)); s.push([R.info.render.calls, R.info.render.triangles]); }
    const avg = i => Math.round(s.reduce((a, x) => a + x[i], 0) / s.length);

    // ── materials actually in the scene graph
    const mats = new Map();
    let meshes = 0, instanced = 0;
    S.traverse(o => {
      if (o.isInstancedMesh) instanced++;
      if (!o.isMesh && !o.isPoints && !o.isSprite) return;
      meshes++;
      for (const m of (Array.isArray(o.material) ? o.material : [o.material])) {
        if (!m) continue;
        const e = mats.get(m.uuid) || { type: m.type, n: 0, map: !!m.map, flat: !!m.flatShading,
          rough: m.roughness, metal: m.metalness, vc: !!m.vertexColors,
          emissive: m.emissive ? m.emissive.getHex() : null };
        e.n++; mats.set(m.uuid, e);
      }
    });
    const M = [...mats.values()];
    const withMap = M.filter(m => m.map).length;
    const emissive = M.filter(m => m.emissive && m.emissive !== 0).length;
    const byType = {}; for (const m of M) byType[m.type] = (byType[m.type] || 0) + 1;
    // which materials carry the WORLD (most meshes)
    const top = M.sort((a, x) => x.n - a.n).slice(0, 6)
      .map(m => `${m.type}${m.map ? '+map' : ''}${m.flat ? ' flat' : ''} r=${m.rough ?? '-'} m=${m.metal ?? '-'} x${m.n}`);

    // ── silhouette: height of every edible
    const H = [], byH = [0,0,0,0,0,0];
    const box = new (window.__scene.constructor.prototype.constructor === Object ? Object : Object)();
    const THREEBox = window.__edibles[0] && window.__edibles[0].mesh;
    for (const e of window.__edibles) {
      const m = e.mesh; if (!m || !m.visible) continue;
      let h = m.userData._h;
      if (h === undefined) {
        // cheap: geometry bounding box in local space x world scale
        let mx = 0;
        m.traverse(o => { if (o.isMesh && o.geometry) { if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
          const bb = o.geometry.boundingBox; if (bb && isFinite(bb.max.y)) mx = Math.max(mx, bb.max.y * (o.scale?.y ?? 1)); } });
        h = mx * (m.scale?.y ?? 1); m.userData._h = h;
      }
      if (!isFinite(h) || h <= 0) continue;
      H.push(h);
      byH[h < 1 ? 0 : h < 2 ? 1 : h < 4 ? 2 : h < 8 ? 3 : h < 16 ? 4 : 5]++;
    }
    H.sort((a, x) => a - x);
    const q = k => H.length ? +H[Math.floor(H.length * k)].toFixed(2) : 0;

    // ── the frame itself, decoded from the PNG the harness just took
    const img = new Image();
    await new Promise(res => { img.onload = res; img.src = 'data:image/png;base64,' + b64; });
    const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
    const g = cv.getContext('2d'); g.drawImage(img, 0, 0);
    // crop out the HUD bands top and bottom (12% each)
    const y0 = (img.height * 0.14) | 0, y1 = (img.height * 0.86) | 0;
    const d = g.getImageData(0, y0, img.width, y1 - y0).data;
    let sum = 0, n = 0; const lum = []; const hues = new Array(12).fill(0); let satSum = 0;
    for (let i = 0; i < d.length; i += 16) {   // stride, 4px
      const R2 = d[i] / 255, G2 = d[i+1] / 255, B2 = d[i+2] / 255;
      const L = 0.2126 * R2 + 0.7152 * G2 + 0.0722 * B2;
      sum += L; n++; lum.push(L);
      const mx = Math.max(R2, G2, B2), mn = Math.min(R2, G2, B2);
      const sat = mx === 0 ? 0 : (mx - mn) / mx; satSum += sat;
      if (mx - mn > 0.06) {
        let h; if (mx === R2) h = ((G2 - B2) / (mx - mn) + 6) % 6; else if (mx === G2) h = (B2 - R2) / (mx - mn) + 2; else h = (R2 - G2) / (mx - mn) + 4;
        hues[(h % 6) / 6 * 12 | 0]++;
      }
    }
    lum.sort((a, x) => a - x);
    const pk = k => +lum[Math.floor(lum.length * k)].toFixed(3);
    const mean = sum / n;
    let sq = 0; for (const L of lum) sq += (L - mean) ** 2;
    const hueOccupied = hues.filter(x => x > n * 0.01).length;

    return {
      calls: avg(0), tris: avg(1), meshes, instanced,
      geometries: R.info.memory.geometries, textures: R.info.memory.textures,
      programs: R.info.programs?.length ?? 0,
      matCount: M.length, withMap, emissive, byType, top,
      heights: { n: H.length, byH, p10: q(0.10), p50: q(0.50), p90: q(0.90), p99: q(0.99), max: +(H[H.length-1]||0).toFixed(2) },
      frame: { mean: +mean.toFixed(3), sd: +Math.sqrt(sq / n).toFixed(3),
        p01: pk(0.01), p05: pk(0.05), p50: pk(0.50), p95: pk(0.95), p99: pk(0.99),
        contrast: +(pk(0.95) / Math.max(0.001, pk(0.05))).toFixed(2),
        meanSat: +(satSum / n).toFixed(3), hueBins: hueOccupied },
    };
  }, fs.readFileSync(shot).toString('base64'));

  console.log(`\n══ ${wid.toUpperCase()} ══`);
  console.log(`  draw calls ${r.calls}   triangles ${r.tris}   meshes ${r.meshes} (instanced ${r.instanced})   geometries ${r.geometries}  textures ${r.textures}  shader programs ${r.programs}`);
  console.log(`  MATERIALS ${r.matCount} distinct in scene   with a texture map: ${r.withMap}   emissive: ${r.emissive}`);
  console.log(`     by type: ${JSON.stringify(r.byType)}`);
  for (const t of r.top) console.log(`     · ${t}`);
  console.log(`  PROP HEIGHTS (3D units, n=${r.heights.n})  <1:${r.heights.byH[0]}  1-2:${r.heights.byH[1]}  2-4:${r.heights.byH[2]}  4-8:${r.heights.byH[3]}  8-16:${r.heights.byH[4]}  16+:${r.heights.byH[5]}`);
  console.log(`     p10 ${r.heights.p10}  median ${r.heights.p50}  p90 ${r.heights.p90}  p99 ${r.heights.p99}  max ${r.heights.max}`);
  console.log(`  FRAME  mean L ${r.frame.mean}  sd ${r.frame.sd}   p05 ${r.frame.p05}  p50 ${r.frame.p50}  p95 ${r.frame.p95}   p95:p05 contrast ${r.frame.contrast}x`);
  console.log(`     mean saturation ${r.frame.meanSat}   hue bins occupied ${r.frame.hueBins}/12`);
  await p.close();
}
await b.close();
