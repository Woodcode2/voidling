// PERF-FRAME pass 3 — WHAT THE GPU IS ASKED FOR, at every size the match
// passes through, plus the three moments the frame budget is supposed to spike:
// the establishing shot, an evolution, and the results screen.
//
// Draw calls and triangles are the two numbers a phone actually pays for and
// they are renderer-independent, so SwiftShader reports them honestly. Texture
// and geometry counts are read as a LEAK CHECK too: sampled at the start of the
// match and again at the whistle, they must not have grown.
import { chromium } from 'playwright';
import { writeFileSync } from 'fs';
const PORT = process.env.PORT || 4177;
const WORLDS = (process.argv[2] || 'maple,pirate,gameday,lantern').split(',');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const out = {};
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

  // ── the establishing shot: sample every frame of the intro dive ──────────
  const intro = await p.evaluate(async () => {
    const R = window.__renderer, rows = [];
    for (let i = 0; i < 26; i++) {
      await new Promise(r => requestAnimationFrame(r));
      rows.push([R.info.render.calls, R.info.render.triangles]);
    }
    return rows;
  });
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 5, null, { timeout: 600000 });

  const base = await p.evaluate(() => {
    const R = window.__renderer;
    let meshes = 0, vis = 0, mats = new Set(), geos = new Set(), skinned = 0;
    window.__scene.traverse(o => { if (o.isMesh || o.isPoints || o.isLine) { meshes++; if (o.visible) vis++;
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => mats.add(m.uuid));
      if (o.geometry) geos.add(o.geometry.uuid); } });
    return { meshes, vis, mats: mats.size, geos: geos.size,
      mem0: { ...R.info.memory }, prog0: R.info.programs?.length ?? 0,
      edibles: window.__edibles.length, pr: R.getPixelRatio(),
      shadow: R.shadowMap.enabled, shSize: window.__scene.children.length };
  });

  // ── the whole size ladder, at the camera the player would actually have ──
  const ladder = [];
  for (const r of [0.9, 1.6, 2.5, 3.5, 5.0, 8.0, 12.0]) {
    const row = await p.evaluate(async (rr) => {
      window.__setVoidR(rr);
      const R = window.__renderer;
      // let the camera settle at the distance this radius commands
      for (let i = 0; i < 90; i++) await new Promise(x => requestAnimationFrame(x));
      const s = [];
      for (let i = 0; i < 6; i++) { await new Promise(x => requestAnimationFrame(x));
        s.push([R.info.render.calls, R.info.render.triangles]); }
      const avg = j => Math.round(s.reduce((a, x) => a + x[j], 0) / s.length);
      return { r: rr, calls: avg(0), tris: avg(1), camY: Math.round(window.__cam.position.y),
        prog: R.info.programs?.length ?? 0, geo: R.info.memory.geometries, tex: R.info.memory.textures };
    }, r);
    ladder.push(row);
  }

  // ── the results screen ──────────────────────────────────────────────────
  await p.evaluate(() => window.__rushClock(0.4));
  await p.waitForFunction(() => document.getElementById('end')?.classList.contains('show'), null, { timeout: 600000 });
  const endr = await p.evaluate(async () => {
    const R = window.__renderer; const s = [];
    for (let i = 0; i < 10; i++) { await new Promise(x => requestAnimationFrame(x));
      s.push([R.info.render.calls, R.info.render.triangles]); }
    const avg = j => Math.round(s.reduce((a, x) => a + x[j], 0) / s.length);
    return { calls: avg(0), tris: avg(1), mem: { ...R.info.memory }, prog: R.info.programs?.length ?? 0 };
  });

  out[wid] = { base, intro, ladder, end: endr };
  console.log(`\n===== ${wid.toUpperCase()} =====`);
  console.log(`scene: ${base.meshes} drawable nodes (${base.vis} visible), ${base.geos} distinct geometries, ${base.mats} distinct materials, ${base.edibles} edibles`);
  console.log(`start memory: geometries ${base.mem0.geometries}  textures ${base.mem0.textures}  programs ${base.prog0}  pixelRatio ${base.pr}  shadows ${base.shadow}`);
  const ic = intro.map(x => x[0]), it = intro.map(x => x[1]);
  console.log(`INTRO DIVE (26 frames): draw calls ${Math.min(...ic)}-${Math.max(...ic)}   triangles ${(Math.min(...it) / 1000).toFixed(0)}k-${(Math.max(...it) / 1000).toFixed(0)}k`);
  console.log('radius   camY   draw calls   triangles   programs  geo  tex');
  for (const l of ladder) console.log(`${String(l.r).padStart(5)}  ${String(l.camY).padStart(5)}  ${String(l.calls).padStart(11)}  ${String(l.tris).padStart(10)}  ${String(l.prog).padStart(9)}  ${String(l.geo).padStart(4)} ${String(l.tex).padStart(4)}`);
  console.log(`RESULTS SCREEN: draw calls ${endr.calls}  triangles ${endr.tris}  (still rendering the whole world behind the card)`);
  console.log(`LEAK CHECK: geometries ${base.mem0.geometries} -> ${endr.mem.geometries}   textures ${base.mem0.textures} -> ${endr.mem.textures}   programs ${base.prog0} -> ${endr.prog}`);
  await p.close();
}
writeFileSync('qa-out/_gpuframe.json', JSON.stringify(out, null, 1));
await b.close();
