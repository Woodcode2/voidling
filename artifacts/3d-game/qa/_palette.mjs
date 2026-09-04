// ARE THE DARK PROP COLOURS ACTUALLY ON SCREEN?
//
//   node qa/_palette.mjs [worlds] [port]
//
// PROPS.house gained five deep members and PROPS.tower three (palette.ts). A
// palette entry is not a pixel: `pick()` has to be reached, the district has to
// build that prop, and the prop has to be in the world. This traverses the live
// scene, buckets every visible mesh by its material colour, and weights by
// world-space footprint so a hundred tiny meshes cannot outvote a house.
//
// Also reports the whole scene's ALBEDO value structure — the histogram of
// material luminance, area-weighted — which is the thing lighting can only
// reveal, never create.
import { chromium } from 'playwright';
const WORLDS = (process.argv[2] || 'maple,pirate,gameday,lantern,powder,skylark').split(',');
const PORT = process.argv[3] || '4177';

const DARK_HOUSE = ['8c4a3f', '2f5d52', '4a3f6b', '6b5330', '33506e'];
const PALE_HOUSE = ['bfe0cf', 'c9b8e8', 'f2c9a0', 'a9c4e8', 'eab8cc', 'f0e6d2', 'b8d8c8', 'd8c8ec'];
const DARK_TOWER = ['2d4055', '4a2f52', '1f4a46'];
const PALE_TOWER = ['ff8a7a', '5ec8d8', 'f7c85a', '8fa9d8', 'f6efe2', 'b98cff', '7ed57a', 'ff9fbf'];

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
  // let the async glb() fallbacks settle so the census is of a stable world
  await p.evaluate(() => { window.__renderer.render = () => {}; });
  await p.waitForTimeout(6000);

  const out = await p.evaluate(({ DH, PH, DT, PT }) => {
    const T = window.__THREE;
    const byHex = new Map();
    let totalArea = 0;
    const bins = new Array(10).fill(0);   // albedo luminance deciles, area-weighted
    const bb = new T.Box3();
    // ── A TOWER'S COLOUR IS NOT IN material.color ────────────────────────
    // makeTower (island.ts:2943-2946) and makeRowBuilding (:2899) bake the
    // wall colour into a 128x256 CANVAS and leave the material white, so a
    // census of material.color reports every downtown building as #ffffff and
    // finds exactly zero of PROPS.tower's three dark members — while being
    // unable to find the eight pale ones either. Sample the texture's own
    // top-left pixel, which facadeTex fills with the wall colour first
    // (island.ts:2819) before it draws anything else on top.
    const texCol = new Map();
    const readTex = (map) => {
      if (!map || !map.image) return null;
      if (texCol.has(map)) return texCol.get(map);
      let hex = null;
      try {
        const im = map.image;
        const cv = document.createElement('canvas'); cv.width = cv.height = 4;
        const g2 = cv.getContext('2d', { willReadFrequently: true });
        // SOURCE rect, not a scale-to-fit: drawing the whole 128x256 into 4x4
        // averages the wall in with every lit window and returns a colour that
        // is in no palette. facadeTex fills the wall colour first and draws
        // nothing above y=8 or left of x=10, so (0,0)-(4,4) is pure wall.
        g2.drawImage(im, 0, 0, 4, 4, 0, 0, 4, 4);
        const d2 = g2.getImageData(0, 0, 1, 1).data;
        hex = ((d2[0] << 16) | (d2[1] << 8) | d2[2]).toString(16).padStart(6, '0');
      } catch { hex = null; }
      texCol.set(map, hex); return hex;
    };
    window.__scene.traverse(o => {
      if (!o.isMesh || !o.visible || !o.geometry) return;
      let vis = true; let q = o; while (q) { if (!q.visible) { vis = false; break; } q = q.parent; }
      if (!vis) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      const m = mats[0]; if (!m || !m.color) return;
      // footprint: the ground area this mesh covers, in world units
      try { bb.setFromObject(o); } catch { return; }
      const sx = bb.max.x - bb.min.x, sz = bb.max.z - bb.min.z, sy = bb.max.y - bb.min.y;
      if (!isFinite(sx) || !isFinite(sz)) return;
      const area = Math.max(0, sx) * Math.max(0, sz);
      if (area > 40000) return;    // the ground plane / water / sky shell
      const cnt = (o.isInstancedMesh ? o.count : 1);
      // WEIGHT BY WALL AREA, NOT FOOTPRINT. A house's eaves trim is 1.08x the
      // wall box, so a 0.28-thick white slab out-footprints the whole building
      // and a footprint census reported #ffffff as 70% of Maple.
      const w = Math.max(sx * sy, sz * sy, sx * sz * 0.5) * cnt;
      totalArea += w;
      const mapHex = readTex(m.map);
      const hex = (mapHex && m.color.getHexString() === 'ffffff') ? mapHex : m.color.getHexString();
      const rec = byHex.get(hex) || { n: 0, area: 0, h: 0, faced: 0 };
      rec.n += cnt; rec.area += w; rec.h = Math.max(rec.h, sy);
      if (mapHex) rec.faced += cnt;      // a baked facade, i.e. a tower wall
      byHex.set(hex, rec);
      const cc = new T.Color('#' + hex);
      const L = 0.2126 * cc.r + 0.7152 * cc.g + 0.0722 * cc.b;
      bins[Math.min(9, Math.floor(L * 10))] += w;
    });
    // FACADE-ONLY for the towers. PROPS.car and PROPS.person share four hexes
    // with PROPS.tower (7ed57a, b98cff, 5ec8d8, ff9fbf), so a plain hex count
    // scores a lime hatchback as a pale tower. Only meshes carrying a baked
    // facade texture are towers.
    const sum = (list, facadeOnly = false) => list.reduce((a, h) => {
      const r = byHex.get(h);
      const n = facadeOnly ? (r?.faced || 0) : (r?.n || 0);
      return { n: a.n + n, area: a.area + (n ? (r?.area || 0) : 0) }; }, { n: 0, area: 0 });
    const top = [...byHex.entries()].sort((a, c) => c[1].area - a[1].area).slice(0, 12)
      .map(([h, r]) => ({ hex: h, n: r.n, pct: +(r.area / totalArea * 100).toFixed(1) }));
    const facades = [...byHex.entries()].filter(([, r]) => r.faced > 0)
      .sort((a, c) => c[1].faced - a[1].faced)
      .map(([h, r]) => `#${h}x${r.faced}`);
    return { totalArea: Math.round(totalArea), distinct: byHex.size,
      darkHouse: sum(DH), paleHouse: sum(PH), darkTower: sum(DT, true), paleTower: sum(PT, true),
      bins: bins.map(v => +(v / totalArea * 100).toFixed(1)), top, facades };
  }, { DH: DARK_HOUSE, PH: PALE_HOUSE, DT: DARK_TOWER, PT: PALE_TOWER });

  console.log(`\n══ ${wid.toUpperCase()} ══  ${out.distinct} distinct material colours over ${out.totalArea} u² of prop footprint`);
  console.log(`  HOUSE walls   dark ${String(out.darkHouse.n).padStart(4)} meshes / ${out.darkHouse.area.toFixed(0).padStart(6)} u²    pale ${String(out.paleHouse.n).padStart(4)} / ${out.paleHouse.area.toFixed(0).padStart(6)} u²   dark share ${(100 * out.darkHouse.area / Math.max(1e-6, out.darkHouse.area + out.paleHouse.area)).toFixed(1)}%`);
  console.log(`  TOWER walls   dark ${String(out.darkTower.n).padStart(4)} meshes / ${out.darkTower.area.toFixed(0).padStart(6)} u²    pale ${String(out.paleTower.n).padStart(4)} / ${out.paleTower.area.toFixed(0).padStart(6)} u²   dark share ${(100 * out.darkTower.area / Math.max(1e-6, out.darkTower.area + out.paleTower.area)).toFixed(1)}%`);
  console.log(`  albedo deciles (area %):  ${out.bins.map((v, i) => `${i / 10}-${(i + 1) / 10}:${v}`).join('  ')}`);
  console.log(`  biggest surfaces: ${out.top.map(t => `#${t.hex}(${t.pct}%)`).join(' ')}`);
  console.log(`  baked facades by wall colour: ${out.facades.length ? out.facades.join(' ') : 'none'}`);
  await p.close();
}
await b.close();
