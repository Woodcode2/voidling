// REFUTE probe 3 — WHO owns the 433MB? Group every unique geometry by
// (material name/uuid, vertex-count bucket) and by the edible's own radius, so
// we can name the prop families that actually cost the memory. Tests fix (a)'s
// premise that it is "hydrants, cones, mailboxes, benches, pines, crowd bodies".
import { chromium } from 'playwright';
const W = process.argv[2] || 'gameday';
const PORT = process.argv[3] || 4188;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-gl=angle','--use-angle=swiftshader','--no-sandbox','--enable-precise-memory-info'] });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await ctx.addInitScript(() => { try { localStorage.setItem('voidPlayed','1'); localStorage.setItem('voidTut','1'); } catch {} });
const p = await ctx.newPage();
await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
await p.goto(`http://127.0.0.1:${PORT}/?w=${W}`, { waitUntil: 'commit' });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.waitForTimeout(6000);
const r = await p.evaluate(() => {
  const bytesOf = (g) => { let n = 0; for (const k in g.attributes) n += g.attributes[k].array.byteLength; if (g.index) n += g.index.array.byteLength; return n; };
  const seen = new Set();
  const byMat = {}, byRad = {}, byVert = {};
  let dancers = 0, movers = 0, limbs = 0;
  for (const e of window.__edibles) {
    const ud = e.mesh.userData || {};
    if (ud.dancer) dancers++; if (ud.mover) movers++; if (ud.limbs) limbs++;
    let bytes = 0, verts = 0, sub = 0;
    e.mesh.traverse((o) => {
      const g = o.geometry; if (!g || seen.has(g.uuid)) return; seen.add(g.uuid);
      const bb = bytesOf(g), v = g.attributes.position?.count || 0;
      bytes += bb; verts += v; sub++;
      const mn = Array.isArray(o.material) ? 'multi' : (o.material?.name || o.material?.type || '?') + ':' + (o.material?.uuid || '').slice(0, 6);
      byMat[mn] = byMat[mn] || { n: 0, bytes: 0 }; byMat[mn].n++; byMat[mn].bytes += bb;
      const vb = v < 100 ? '<100' : v < 300 ? '100-300' : v < 1000 ? '300-1k' : v < 2000 ? '1k-2k' : v < 3000 ? '2k-3k' : v < 4000 ? '3k-4k' : v < 5000 ? '4k-5k' : '5k+';
      byVert[vb] = byVert[vb] || { n: 0, bytes: 0 }; byVert[vb].n++; byVert[vb].bytes += bb;
    });
    const rb = e.radius < 0.8 ? 'r<0.8' : e.radius < 1.5 ? 'r0.8-1.5' : e.radius < 3 ? 'r1.5-3' : e.radius < 6 ? 'r3-6' : 'r6+';
    byRad[rb] = byRad[rb] || { n: 0, bytes: 0, subs: 0 }; byRad[rb].n++; byRad[rb].bytes += bytes; byRad[rb].subs += sub;
  }
  const srt = (o) => Object.entries(o).sort((a, b) => b[1].bytes - a[1].bytes)
    .map(([k, v]) => `${k}: ${v.n} geos ${(v.bytes / 1048576).toFixed(1)}MB`);
  return { byMat: srt(byMat), byRad: srt(byRad), byVert: srt(byVert),
    dancers, movers, limbs, edibles: window.__edibles.length };
});
console.log('=== ' + W.toUpperCase() + ' ===');
console.log('edibles', r.edibles, 'dancers', r.dancers, 'movers', r.movers, 'limbs', r.limbs);
console.log('BY MATERIAL:'); r.byMat.slice(0, 14).forEach(s => console.log('  ' + s));
console.log('BY EDIBLE RADIUS:'); r.byRad.forEach(s => console.log('  ' + s));
console.log('BY VERTEX BAND:'); r.byVert.forEach(s => console.log('  ' + s));
await b.close();
