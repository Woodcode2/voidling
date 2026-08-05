// PERF-FRAME pass 3b — the PEAK only, for the two worlds whose full ladder ran
// out of machine. WORLD ENDER framing is where the camera is highest and the
// frustum widest, which is the most expensive frame of the match.
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
for (const wid of (process.argv[2] || 'gameday,lantern').split(',')) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try { localStorage.setItem('voidPlayed','1');
    localStorage.setItem('voidTut','1'); localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
  await p.goto(`http://127.0.0.1:4177/?w=${wid}`, { waitUntil:'domcontentloaded', timeout:300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout:400000 });
  await p.evaluate(() => document.querySelectorAll('.show').forEach(e => { if (['daily','gift'].includes(e.id)) e.classList.remove('show'); }));
  await p.click('#btnPlay'); await p.waitForTimeout(1400);
  await p.click(`#worldRow .wCard[data-world="${wid}"]`);
  const intro = await p.evaluate(async () => { const R = window.__renderer, s = [];
    for (let i = 0; i < 22; i++) { await new Promise(r => requestAnimationFrame(r)); s.push([R.info.render.calls, R.info.render.triangles]); } return s; });
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 4, null, { timeout:600000 });
  const r = await p.evaluate(async () => {
    const R = window.__renderer;
    window.__setVoidR(12);
    for (let i = 0; i < 40; i++) await new Promise(x => requestAnimationFrame(x));
    const s = []; for (let i = 0; i < 4; i++) { await new Promise(x => requestAnimationFrame(x)); s.push([R.info.render.calls, R.info.render.triangles]); }
    const avg = j => Math.round(s.reduce((a,x)=>a+x[j],0)/s.length);
    let nodes = 0; window.__scene.traverse(() => nodes++);
    return { calls: avg(0), tris: avg(1), camY: Math.round(window.__cam.position.y), nodes,
      mem: { ...R.info.memory }, prog: R.info.programs?.length ?? 0, edibles: window.__edibles.length };
  });
  const ic = intro.map(x=>x[0]), it = intro.map(x=>x[1]);
  console.log(`${wid.padEnd(8)} INTRO draw calls ${Math.min(...ic)}-${Math.max(...ic)}, triangles ${(Math.min(...it)/1000).toFixed(0)}k-${(Math.max(...it)/1000).toFixed(0)}k   |   WORLD ENDER (r=12, camY ${r.camY}): draw calls ${r.calls}, triangles ${r.tris}, geometries ${r.mem.geometries}, textures ${r.mem.textures}, programs ${r.prog}, scene nodes ${r.nodes}, edibles ${r.edibles}`);
  await p.close();
}
await b.close();
