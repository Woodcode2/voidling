import { chromium } from 'playwright';
const PORT = process.argv[2] || '4177';
const WORLD = process.argv[3] || 'maple';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed','1'); localStorage.setItem('voidTut','1');
  localStorage.setItem('voidDailyLast', new Date().toDateString());
  localStorage.setItem('voidUnlocked','maple,pirate,gameday,lantern,powder,skylark'); } catch {} });
await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show').forEach((e)=>{ if(['daily','gift'].includes(e.id)) e.classList.remove('show'); }));
await p.click('#btnPlay'); await p.waitForTimeout(1400);
await p.click(`#worldRow .wCard[data-world="${WORLD}"]`); await p.waitForTimeout(2500);
await p.mouse.click(215, 700).catch(()=>{});
await p.waitForFunction(() => { const m = window.__matchState && window.__matchState(); return m && m.t > 2.5; }, null, { timeout: 120000, polling: 200 });
await p.waitForTimeout(3000);
const r = await p.evaluate(() => {
  const out = { edibles: window.__edibles.length, mover: 0, byRadius: {}, sample: [] };
  for (const e of window.__edibles) { const m = e.mesh; if (!m) continue;
    if (m.userData.mover) out.mover++; }
  // scene walk for mover-tagged
  let sceneMover = 0; const kinds = {};
  window.__scene.traverse((o)=>{ if (o.userData && o.userData.mover) { sceneMover++; kinds[o.userData.qk||'-'] = (kinds[o.userData.qk||'-']||0)+1; } });
  out.sceneMover = sceneMover; out.kinds = kinds;
  // person-ish movers: verts
  const list = [];
  for (const e of window.__edibles) { const m = e.mesh; if (!m || !m.userData.mover) continue;
    let v = 0; m.traverse((o)=>{ if (o.isMesh && o.geometry) v += o.geometry.attributes.position?.count||0; });
    list.push({ r:+(e.radius||0).toFixed(2), v, qk: m.userData.qk||'-', type: m.type });
  }
  list.sort((a,c)=>c.v-a.v);
  out.sample = list.slice(0, 25);
  out.moverEdibles = list.length;
  return out;
});
console.log(JSON.stringify(r, null, 1));
await b.close();
