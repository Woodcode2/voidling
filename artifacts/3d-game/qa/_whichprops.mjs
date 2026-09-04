// one-off: which props ARE the repeated ones, by name
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed','1'); localStorage.setItem('voidTut','1');
  localStorage.setItem('voidDailyLast', new Date().toDateString());
  localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder,skylark');
} catch {} });
await p.goto(`http://127.0.0.1:4177/?w=${process.argv[2]||'maple'}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.waitForFunction(() => { const n = window.__edibles.length;
  if (window.__lastN !== n) { window.__lastN = n; window.__stableSince = performance.now(); return false; }
  return performance.now() - (window.__stableSince||0) > 2000; }, null, { timeout: 300000, polling: 250 });
console.log(await p.evaluate(() => {
  const byName = new Map();
  for (const e of window.__edibles) {
    const m = e.mesh; if (!m) continue;
    let verts = 0, meshes = 0;
    m.traverse(o => { if (o.isMesh && o.geometry) { meshes++; verts += o.geometry.attributes.position?.count||0; } });
    const key = `${m.name||'(unnamed)'} | ${meshes}mesh ${verts}v r=${(e.radius||0).toFixed(2)}`;
    const rec = byName.get(key) || { n: 0, zero: 0 };
    rec.n++; if (Math.abs(m.rotation.y) < 1e-6) rec.zero++;
    byName.set(key, rec);
  }
  return [...byName.entries()].sort((a,c)=>c[1].n-a[1].n).slice(0,22)
    .map(([k,v]) => `${String(v.n).padStart(5)}x  ${String(Math.round(v.zero/v.n*100)).padStart(3)}% unturned   ${k}`).join('\n');
}));
await b.close();
