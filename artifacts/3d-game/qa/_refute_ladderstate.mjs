// Replicates qa/_gpuframe.mjs's size ladder EXACTLY, but also reports the
// renderer's own quality state at each rung — shadowMap.enabled, shadow map
// size, pixel ratio. The claim under test: the 914-call MAPLE baseline the
// finding compares against was taken after the adaptive quality ladder had
// already switched shadows off, while the 3,586/4,719 GAME DAY / LANTERN
// peaks were taken with shadows on.
import { chromium } from 'playwright';
const PORT = process.env.PORT || 4177;
const WORLDS = (process.argv[2] || 'maple').split(',');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
for (const wid of WORLDS) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try { localStorage.setItem('voidPlayed','1');
    localStorage.setItem('voidTut','1'); localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
  await p.goto(`http://127.0.0.1:${PORT}/?w=${wid}`, { waitUntil:'domcontentloaded', timeout:300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout:400000 });
  await p.evaluate(() => document.querySelectorAll('.show').forEach(e => { if (['daily','gift'].includes(e.id)) e.classList.remove('show'); }));
  await p.click('#btnPlay'); await p.waitForTimeout(1400);
  await p.click(`#worldRow .wCard[data-world="${wid}"]`);
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 5, null, { timeout:600000 });
  console.log(`\n===== ${wid.toUpperCase()} — _gpuframe ladder, with renderer state =====`);
  console.log('radius   camY   calls    tris   shadowsOn  shMap   pr   box   fps');
  for (const rr of [0.9, 1.6, 2.5, 3.5, 5.0, 8.0, 12.0]) {
    const row = await p.evaluate(async (r) => {
      window.__setVoidR(r);
      const R = window.__renderer;
      for (let i=0;i<90;i++) await new Promise(x=>requestAnimationFrame(x));
      const t0 = performance.now();
      const s=[]; for (let i=0;i<6;i++){ await new Promise(x=>requestAnimationFrame(x));
        s.push([R.info.render.calls, R.info.render.triangles]); }
      const fps = 6000/(performance.now()-t0);
      const avg = j => Math.round(s.reduce((a,x)=>a+x[j],0)/s.length);
      let sun=null; window.__scene.traverse(o=>{ if(o.isDirectionalLight) sun=o; });
      return { r, calls: avg(0), tris: avg(1), camY: Math.round(window.__cam.position.y),
        sh: R.shadowMap.enabled, shSize: sun?sun.shadow.mapSize.x:-1, pr: R.getPixelRatio(),
        box: sun?Math.round(sun.shadow.camera.right):-1, fps: +fps.toFixed(1) };
    }, rr);
    console.log(`${String(row.r).padStart(5)}  ${String(row.camY).padStart(5)}  ${String(row.calls).padStart(5)}  ${String(row.tris).padStart(7)}  ${String(row.sh).padStart(9)}  ${String(row.shSize).padStart(5)}  ${String(row.pr).padStart(3)}  ${String(row.box).padStart(4)}  ${String(row.fps).padStart(5)}`);
  }
  await p.close();
}
await b.close();
