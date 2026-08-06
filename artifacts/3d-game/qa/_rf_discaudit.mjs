// REFUTATION PROBE: what does a LOOSE #14100f mesh count actually mean?
//   node qa/_rf_discaudit.mjs [worlds] [port]
//
// bakeContactShadows() (prototype3d.ts:978) harvests every STATIC prop's
// contact disc into ONE InstancedMesh capped at SH_CAP = 4096, and skips
// movers. So a scene traverse that counts meshes whose material colour is
// #14100f counts only what did NOT get harvested: the movers, plus whatever
// overflowed the 4096 cap. That is a census of CAP OVERFLOW, not of dressing.
// This probe reports both numbers side by side.
import { chromium } from 'playwright';
const WORLDS = (process.argv[2] || 'maple,gameday,pirate,lantern').split(',');
const PORT = process.argv[3] || '4177';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
for (const wid of WORLDS) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  p.setDefaultTimeout(400000);
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
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 5.5, null, { timeout: 900000 });
  await p.evaluate(() => { window.__renderer.render = () => {}; });
  await p.waitForTimeout(5000);
  const r = await p.evaluate(() => {
    let loose = 0, looseSkippedByArea = 0, instanced = 0, instMeshes = 0, harvested = 0;
    const T = window.__THREE; const bb = new T.Box3();
    window.__scene.traverse(o => {
      if (!o.isMesh || !o.material || !o.material.color) return;
      if (o.material.color.getHexString() !== '14100f') return;
      if (o.isInstancedMesh) { instMeshes++; instanced += o.count; return; }
      // _palette.mjs drops any mesh whose world bbox footprint exceeds 40000 u²
      try { bb.setFromObject(o); } catch { return; }
      const a = (bb.max.x - bb.min.x) * (bb.max.z - bb.min.z);
      if (a > 40000) { looseSkippedByArea++; return; }
      loose++;
    });
    for (const e of window.__edibles) if (e.mesh && e.mesh.userData.shIdx !== undefined) harvested++;
    return { loose, looseSkippedByArea, instanced, instMeshes, harvested,
      edibles: window.__edibles.length };
  });
  console.log(`\n══ ${wid.toUpperCase()} ══`);
  console.log(`  LOOSE #14100f meshes a naive traverse sees: ${r.loose}   (+${r.looseSkippedByArea} rejected by the >40000 u² filter)`);
  console.log(`  harvested into the InstancedMesh:           ${r.harvested}   (${r.instMeshes} instanced mesh, count ${r.instanced})`);
  console.log(`  TRUE discs = loose + harvested:             ${r.loose + r.harvested}   of ${r.edibles} edibles`);
  await p.close();
}
await b.close();
