// SCRATCH — where the geometry bytes are. Buckets every UNIQUE BufferGeometry
// in the scene by the nearest named ancestor, and reports how many meshes share
// each geometry (sharing = 1.0 means every prop carries its own copy).
import { chromium } from 'playwright';
const WORLDS = (process.argv[2] || 'maple,gameday').split(',');
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
    const seen = new Map();     // geo.uuid -> {bytes, uses, label}
    const label = (o) => {
      let n = o, hops = 0;
      while (n && hops++ < 6) { if (n.name) return n.name; if (n.userData && n.userData.kind) return 'ud:' + n.userData.kind; n = n.parent; }
      return o.type + (o.isInstancedMesh ? '(instanced)' : '');
    };
    let meshes = 0, instanced = 0, instCount = 0;
    window.__scene.traverse((o) => {
      if (!o.geometry) return;
      meshes++;
      if (o.isInstancedMesh) { instanced++; instCount += o.count; }
      const g = o.geometry;
      let e = seen.get(g.uuid);
      if (!e) {
        let bytes = 0, verts = 0;
        for (const k in g.attributes) { bytes += g.attributes[k].array.byteLength; }
        if (g.attributes.position) verts = g.attributes.position.count;
        if (g.index) bytes += g.index.array.byteLength;
        e = { bytes, uses: 0, verts, label: label(o) };
        seen.set(g.uuid, e);
      }
      e.uses++;
    });
    const byLabel = {};
    let tot = 0, totVerts = 0;
    for (const e of seen.values()) {
      tot += e.bytes; totVerts += e.verts;
      const b = byLabel[e.label] = byLabel[e.label] || { bytes: 0, geos: 0, uses: 0, verts: 0 };
      b.bytes += e.bytes; b.geos++; b.uses += e.uses; b.verts += e.verts;
    }
    return { tot, totVerts, uniq: seen.size, meshes, instanced, instCount,
      rows: Object.entries(byLabel).sort((a, b) => b[1].bytes - a[1].bytes).slice(0, 22) };
  });
  console.log(`\n=== ${w.toUpperCase()} — ${(r.tot/1048576).toFixed(1)} MB of vertex/index arrays in ${r.uniq} unique geometries across ${r.meshes} meshes (${r.instanced} InstancedMesh holding ${r.instCount} instances), ${(r.totVerts/1000).toFixed(0)}k unique verts`);
  console.log('   MB     geos    meshes  share  avgVerts  owner');
  for (const [k, v] of r.rows) {
    console.log(`${(v.bytes/1048576).toFixed(1).padStart(6)}  ${String(v.geos).padStart(6)}  ${String(v.uses).padStart(7)}  ${(v.uses/v.geos).toFixed(2).padStart(5)}  ${String(Math.round(v.verts/v.geos)).padStart(8)}  ${k}`);
  }
  await b.close();
}
