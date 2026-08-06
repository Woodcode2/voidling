// The shadow pass runs at HALF RATE (prototype3d.ts:104 autoUpdate=false,
// :4703 refreshes on every other frame). So "draw calls at r=12" is not one
// number — it alternates. Both _gpupeak.mjs and _gpuframe.mjs average 4-6
// consecutive frames, which blends the two. Print the raw per-frame series.
import { chromium } from 'playwright';
const PORT = process.env.PORT || 4177;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
for (const wid of (process.argv[2] || 'lantern').split(',')) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try { localStorage.setItem('voidPlayed','1');
    localStorage.setItem('voidTut','1'); localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
  await p.goto(`http://127.0.0.1:${PORT}/?w=${wid}`, { waitUntil:'domcontentloaded', timeout:300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout:400000 });
  await p.evaluate(() => document.querySelectorAll('.show').forEach(e => { if (['daily','gift'].includes(e.id)) e.classList.remove('show'); }));
  await p.click('#btnPlay'); await p.waitForTimeout(1400);
  await p.click(`#worldRow .wCard[data-world="${wid}"]`);
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 4, null, { timeout:600000 });
  const r = await p.evaluate(async () => {
    const R = window.__renderer;
    window.__setVoidR(12);
    for (let i=0;i<45;i++) await new Promise(x=>requestAnimationFrame(x));
    const s=[]; for (let i=0;i<14;i++){ await new Promise(x=>requestAnimationFrame(x));
      s.push([R.info.render.calls, R.info.render.triangles]); }
    let sun=null; window.__scene.traverse(o=>{ if(o.isDirectionalLight) sun=o; });
    return { s, sh: R.shadowMap.enabled, auto: R.shadowMap.autoUpdate,
      shSize: sun?sun.shadow.mapSize.x:-1, camY: Math.round(window.__cam.position.y) };
  });
  console.log(`\n${wid.toUpperCase()} r=12 camY ${r.camY} shadows ${r.sh} autoUpdate ${r.auto} map ${r.shSize}`);
  console.log('per-frame calls: ' + r.s.map(x=>x[0]).join(' '));
  console.log('per-frame tris : ' + r.s.map(x=>x[1]).join(' '));
  const c = r.s.map(x=>x[0]);
  console.log(`min ${Math.min(...c)}  max ${Math.max(...c)}  mean ${Math.round(c.reduce((a,x)=>a+x,0)/c.length)}`);
  await p.close();
}
await b.close();
