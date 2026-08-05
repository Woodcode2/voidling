// SCRATCH — split the vertex-array budget between the EDIBLE PROPS and
// everything else, and show the vertex-count distribution.
import { chromium } from 'playwright';
const WORLDS = (process.argv[2] || 'gameday').split(',');
const PORT = process.argv[3] || 4188;
for (const w of WORLDS) {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--use-gl=angle','--use-angle=swiftshader','--no-sandbox','--enable-precise-memory-info'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await ctx.addInitScript(() => { try { localStorage.setItem('voidPlayed','1'); localStorage.setItem('voidTut','1'); } catch {} });
  const p = await ctx.newPage();
  await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
  await p.goto(`http://127.0.0.1:${PORT}/?w=${w}`, { waitUntil: 'commit' });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  const r = await p.evaluate(() => {
    const bytesOf = (g) => { let n = 0; for (const k in g.attributes) n += g.attributes[k].array.byteLength; if (g.index) n += g.index.array.byteLength; return n; };
    const walk = (root, seen, acc) => root.traverse((o) => {
      if (!o.geometry || seen.has(o.geometry.uuid)) return;
      seen.add(o.geometry.uuid);
      const bytes = bytesOf(o.geometry), v = o.geometry.attributes.position?.count || 0;
      acc.bytes += bytes; acc.geos++; acc.verts += v;
      acc.top.push({ bytes, v, attrs: Object.keys(o.geometry.attributes).join('+') });
    });
    const seenE = new Set();
    const ed = { bytes: 0, geos: 0, verts: 0, top: [] };
    for (const e of window.__edibles) walk(e.mesh, seenE, ed);
    const all = { bytes: 0, geos: 0, verts: 0, top: [] };
    walk(window.__scene, new Set(), all);
    const rest = { bytes: all.bytes - ed.bytes, geos: all.geos - ed.geos, verts: all.verts - ed.verts };
    // biggest single geometries in the whole scene
    all.top.sort((a, b) => b.bytes - a.bytes);
    // vertex histogram
    const hist = {};
    for (const t of all.top) { const k = t.v < 100 ? '<100' : t.v < 300 ? '100-300' : t.v < 1000 ? '300-1k' : t.v < 5000 ? '1k-5k' : t.v < 20000 ? '5k-20k' : '20k+'; hist[k] = hist[k] || { n: 0, bytes: 0 }; hist[k].n++; hist[k].bytes += t.bytes; }
    const attrs = {};
    for (const t of all.top) attrs[t.attrs] = (attrs[t.attrs] || 0) + 1;
    return { ed, rest, all: { bytes: all.bytes, geos: all.geos, verts: all.verts },
      top10: all.top.slice(0, 10), hist, attrs, edCount: window.__edibles.length };
  });
  const mb = (x) => (x / 1048576).toFixed(1) + 'MB';
  console.log(`\n=== ${w.toUpperCase()} ===`);
  console.log(`total       ${mb(r.all.bytes)}  ${r.all.geos} geometries  ${(r.all.verts/1e6).toFixed(2)}M verts`);
  console.log(`edibles     ${mb(r.ed.bytes)}  ${r.ed.geos} geometries  ${(r.ed.verts/1e6).toFixed(2)}M verts   (${r.edCount} edible props)`);
  console.log(`everything else ${mb(r.rest.bytes)}  ${r.rest.geos} geometries  ${(r.rest.verts/1e6).toFixed(2)}M verts`);
  console.log('vertex histogram:', JSON.stringify(r.hist));
  console.log('attribute sets:', JSON.stringify(r.attrs));
  console.log('biggest single geometries:', r.top10.map(t => `${(t.bytes/1048576).toFixed(1)}MB/${t.v}v`).join(', '));
  await b.close();
}
