// WHAT DOES A WORLD ACTUALLY COST IN MEMORY, AND WHERE DOES IT GO?
//
// A number was on file — "Game Day peaks at ~487 MB" — with no method
// attached, and the obvious reading of it (too many triangles on screen) is
// wrong: renderer.info says Game Day DRAWS 220,792 triangles in 549 calls,
// which is a comfortable frame for a phone. The GPU is not the problem.
//
// The heap is. A merged prop is non-indexed and carries four attributes —
// position (3xf32), normal (3xf32), color (3xf32), aGloss (1xu8) = 37 bytes a
// vertex, so 111 bytes a triangle — and three keeps the CPU-side copy alive
// for the life of the page unless something releases it. Nothing does: there
// is no onUpload anywhere in src/.
//
// So this reports both halves: the JS heap the browser admits to, and the
// geometry actually resident in the scene graph, counted from the buffers.
// If those two track each other, the geometry IS the heap and the fix is
// about bytes per vertex, not about what is on screen.
//
// Chrome only. performance.memory is gated behind --enable-precise-memory-info
// for a trustworthy figure; without it the value is quantised to 100KB and
// bucketed, which is still fine at this scale.
import { chromium } from 'playwright';
const worlds = (process.argv[2] || 'maple,pirate,gameday,lantern').split(',');
const PORT = process.argv[3] || '4177';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader',
    '--enable-precise-memory-info', '--js-flags=--expose-gc'] });
console.log('world      JS heap    geometry resident   attrs      verts     tris   bytes/vert');
for (const wid of worlds) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch { } });
  await p.goto(`http://${'127.0.0.1'}:${PORT}/?w=${wid}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => {
    if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
  await p.click('#btnPlay'); await p.waitForTimeout(1000);
  await p.click(`#worldRow .wCard[data-world="${wid}"]`);
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 6, null, { timeout: 600000 });

  const r = await p.evaluate(async () => {
    window.__renderer.render = () => {};
    for (let i = 0; i < 30; i++) await new Promise((res) => requestAnimationFrame(res));
    if (window.gc) { window.gc(); await new Promise((res) => setTimeout(res, 400)); window.gc(); }
    // Count each GEOMETRY once — a geometry shared by 300 instanced walkers is
    // one buffer, and counting it per mesh would invent memory that does not
    // exist. This is the thing the earlier triangle census got right and the
    // "3.76M triangles" headline got wrong: that number was per-INSTANCE.
    const seen = new Set();
    let bytes = 0, verts = 0, tris = 0, attrs = 0;
    window.__scene.traverse((o) => {
      const g = o.geometry;
      if (!g || seen.has(g.uuid)) return;
      seen.add(g.uuid);
      const pos = g.getAttribute && g.getAttribute('position');
      if (!pos) return;
      verts += pos.count;
      tris += (g.index ? g.index.count : pos.count) / 3;
      for (const name in g.attributes) {
        const a = g.attributes[name];
        if (a.array) { bytes += a.array.byteLength; attrs++; }
      }
      if (g.index && g.index.array) bytes += g.index.array.byteLength;
    });
    const mem = performance.memory ? performance.memory.usedJSHeapSize : null;
    return { mem, bytes, verts, tris, geos: seen.size, attrs };
  });
  const mb = (x) => (x / 1048576).toFixed(1).padStart(7) + ' MB';
  console.log(`${wid.padEnd(9)} ${r.mem === null ? '   n/a  ' : mb(r.mem)}  ${mb(r.bytes)}`
    + `   ${String(r.attrs).padStart(6)}  ${String(Math.round(r.verts)).padStart(9)}`
    + ` ${String(Math.round(r.tris)).padStart(8)}   ${(r.bytes / Math.max(1, r.verts)).toFixed(1)}`);
  await p.close();
}
await b.close();
