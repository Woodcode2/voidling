// What would the "give every casting prop a contact disc" fix actually cost,
// and would the disc be VISIBLE? Counts the instanced-disc budget (SH_CAP 4096),
// the loose discs already spilling past it, and — for every prop that casts
// without a disc — whether the disc would poke out past the prop's own
// top-down silhouette at all.
//
//   node qa/_disccap.mjs [world] [port]
import { chromium } from 'playwright';
const WORLD = process.argv[2] || 'maple';
const PORT = process.argv[3] || '4237';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
p.setDefaultTimeout(600000);
await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 400000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 600000 });
await p.evaluate(() => document.querySelectorAll('.show').forEach(e => {
  if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
await p.click('#btnPlay'); await p.waitForTimeout(1600);
await p.click(`#worldRow .wCard[data-world="${WORLD}"]`);
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout: 600000 });
await p.evaluate(() => { window.__RR = window.__renderer.render.bind(window.__renderer); window.__renderer.render = () => {}; });
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 14, null, { timeout: 900000 });
await p.evaluate(() => { window.__renderer.render = window.__RR; });
await p.waitForTimeout(1500);

const out = await p.evaluate(() => {
  const T = window.__THREE, S = window.__scene;
  const bb = new T.Box3();
  let instCount = 0, instCap = 0;
  S.traverse(o => { if (o.isInstancedMesh) { instCount++; instCap = Math.max(instCap, o.count); } });
  let harvested = 0, loose = 0, movers = 0;
  const cast = { total: 0, noDisc: 0, buckets: {}, hidden: 0, peek: [] };
  for (const e of window.__edibles) {
    const ud = e.mesh.userData || {};
    if (ud.mover) movers++;
    if (ud.shIdx !== undefined) harvested++;
    else { let l = false; e.mesh.traverse(o => { if (o.userData && o.userData.cshadow) l = true; }); if (l) loose++; }
    let casts = false; e.mesh.traverse(o => { if (o.isMesh && o.castShadow) casts = true; });
    let hasDisc = ud.shIdx !== undefined;
    if (!hasDisc) e.mesh.traverse(o => { if (o.userData && o.userData.cshadow) hasDisc = true; });
    if (!casts) continue;
    cast.total++;
    if (hasDisc) continue;
    cast.noDisc++;
    const r = e.radius;
    const k = r < 1 ? '<1' : r < 2 ? '1-2' : r < 4 ? '2-4' : r < 8 ? '4-8' : r < 16 ? '8-16' : '16+';
    cast.buckets[k] = (cast.buckets[k] || 0) + 1;
    // would the disc be visible from above? disc radius vs the prop's own footprint
    let half = 0;
    try { bb.setFromObject(e.mesh);
      half = Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z) / 2; } catch {}
    const discR = Math.max(0.55, r * 1.1) * 1.35;
    if (half >= discR) cast.hidden++;               // silhouette swallows the disc entirely
    if (cast.peek.length < 8) cast.peek.push({ r: +r.toFixed(1), half: +half.toFixed(1), discR: +discR.toFixed(1) });
  }
  return { t: +window.__matchState().t.toFixed(1), instancedMeshes: instCount, instCap,
    harvestedDiscs: harvested, looseDiscs: loose, movers, props: window.__edibles.length, cast };
});
console.log(WORLD, JSON.stringify(out, null, 1));
await b.close();
