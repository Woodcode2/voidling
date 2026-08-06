import { chromium } from 'playwright';
const W = process.argv[2] || 'gameday';
const PORT = process.argv[3] || 4188;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-gl=angle','--use-angle=swiftshader','--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
await ctx.addInitScript(() => { try { localStorage.setItem('voidPlayed','1'); localStorage.setItem('voidTut','1'); } catch {} });
const p = await ctx.newPage();
await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
await p.goto(`http://127.0.0.1:${PORT}/?w=${W}`, { waitUntil: 'commit' });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.waitForTimeout(6000);
const r = await p.evaluate(() => {
  const bytesOf = (g) => { let n = 0; for (const k in g.attributes) n += g.attributes[k].array.byteLength; if (g.index) n += g.index.array.byteLength; return n; };
  const seen = new Set(); const acc = {};
  window.__scene.traverse((o) => {
    const g = o.geometry; if (!g || seen.has(g.uuid)) return; seen.add(g.uuid);
    const m = Array.isArray(o.material) ? o.material[0] : o.material; if (!m) return;
    const k = m.uuid.slice(0, 6);
    acc[k] = acc[k] || { n: 0, bytes: 0, verts: 0, type: m.type, flat: !!m.flatShading, vc: !!m.vertexColors,
      rough: m.roughness, col: m.color ? '#' + m.color.getHexString() : '-', samples: [] };
    acc[k].n++; acc[k].bytes += bytesOf(g); acc[k].verts += g.attributes.position?.count || 0;
    if (acc[k].samples.length < 6) {
      // walk up to find a named ancestor for identity
      let path = [], node = o, d = 0;
      while (node && d++ < 5) { path.push(node.name || node.type + (node.userData && Object.keys(node.userData).length ? '{' + Object.keys(node.userData).join(',') + '}' : '')); node = node.parent; }
      acc[k].samples.push((g.attributes.position?.count || 0) + 'v ' + path.join('<'));
    }
  });
  return Object.entries(acc).sort((a, b) => b[1].bytes - a[1].bytes).slice(0, 6)
    .map(([k, v]) => ({ k, n: v.n, MB: +(v.bytes / 1048576).toFixed(1), avgV: Math.round(v.verts / v.n),
      type: v.type, flat: v.flat, vc: v.vc, rough: v.rough, col: v.col, samples: v.samples }));
});
for (const m of r) console.log(JSON.stringify(m, null, 1));
await b.close();
