// HOW MUCH OF EACH WORLD IS FLAT-SHADED, AND HOW MUCH OF THAT IS ROUND?
//
// flatShading is right for architecture and wrong for anything that grew or was
// turned on a lathe. The codebase says so in four separate places — island.ts
// on foliage, life.ts on the crowd, tailgate.ts on inflatables, mainstreet.ts on
// the maple canopy — and each time the fix stopped at that file's boundary.
//
// Under FLAT_SHADED three discards vertex normals entirely (normal_vertex.glsl
// writes vNormal only #ifndef FLAT_SHADED), so a cylinder renders as N hard tone
// bands however many segments it has. No tessellation change can fix it, and the
// normals are in the buffer being paid for either way.
//
//   flat %    triangles on the faceted material
//   smooth %  triangles on the smooth one
//
//   node qa/shading.mjs [port] [worlds]
import { chromium } from 'playwright';

const PORT = process.argv[2] || '4173';
const WORLDS = (process.argv[3] || 'maple,pirate,gameday,lantern').split(',');

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
console.log('  world        prop tris        flat %     smooth %');
for (const w of WORLDS) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => {
    try { localStorage.clear(); localStorage.setItem('voidPlayed','1'); localStorage.setItem('voidTut','1');
      localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {}
  });
  await p.goto(`http://127.0.0.1:${PORT}/?w=${w}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => {
    if (['daily','gift'].includes(e.id)) e.classList.remove('show'); }));
  await p.evaluate(() => document.getElementById('btnPlay')?.click());
  await p.waitForTimeout(1400);
  await p.evaluate((w) => document.querySelector(`#worldRow .wCard[data-world="${w}"]`)?.click(), w);
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout: 400000 });
  await p.waitForTimeout(2500);
  const m = await p.evaluate(() => {
    let flat = 0, smooth = 0;
    window.__scene.traverse((o) => {
      const g = o.geometry, mt = o.material;
      if (!g || !mt || !g.getAttribute) return;
      // only the merged prop kit — it is the only thing carrying aGloss
      if (!g.getAttribute('aGloss')) return;
      const tris = g.getAttribute('position').count / 3;
      if (mt.flatShading) flat += tris; else smooth += tris;
    });
    return { flat, smooth };
  });
  await p.close();
  const tot = m.flat + m.smooth;
  console.log(`  ${w.padEnd(9)} ${String(Math.round(tot)).padStart(10)}      `
    + `${(m.flat / Math.max(1,tot) * 100).toFixed(1).padStart(5)}%     `
    + `${(m.smooth / Math.max(1,tot) * 100).toFixed(1).padStart(5)}%`);
}
await b.close();
console.log('\n  A round prop on the flat material is 6-16 hard tone bands wrapped');
console.log('  around a cylinder. Architecture on the flat material is correct.');
