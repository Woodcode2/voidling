// The finding measures r=12. The game's own growth ceiling says a maxed run
// only reaches r=12 with ~2s left and r>=10 with ~12s left; at 45s left the
// ceiling is 5.67. So measure the radii a child is ACTUALLY at during "the last
// 45 seconds of a good run", one FRESH PAGE per radius so the adaptive quality
// ladder has had the same amount of time to degrade in every sample.
import { chromium } from 'playwright';
const PORT = process.env.PORT || 4177;
const wid = process.argv[2] || 'lantern';
const RADII = (process.argv[3] || '5.7,8,12').split(',').map(Number);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
console.log(`===== ${wid.toUpperCase()} — one fresh page per radius =====`);
console.log('radius   camY   calls     tris   shadowsOn shMap  box   standing');
for (const rr of RADII) {
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
  const row = await p.evaluate(async (r) => {
    const R = window.__renderer;
    window.__setVoidR(r);
    for (let i=0;i<45;i++) await new Promise(x=>requestAnimationFrame(x));
    const s=[]; for (let i=0;i<5;i++){ await new Promise(x=>requestAnimationFrame(x));
      s.push([R.info.render.calls, R.info.render.triangles]); }
    const avg = j => Math.round(s.reduce((a,x)=>a+x[j],0)/s.length);
    let sun=null; window.__scene.traverse(o=>{ if(o.isDirectionalLight) sun=o; });
    return { calls: avg(0), tris: avg(1), camY: Math.round(window.__cam.position.y),
      sh: R.shadowMap.enabled, shSize: sun?sun.shadow.mapSize.x:-1,
      box: sun?Math.round(sun.shadow.camera.right):-1,
      standing: window.__edibles.filter(e=>!e.eaten && e.mesh.parent).length };
  }, rr);
  console.log(`${String(rr).padStart(5)}  ${String(row.camY).padStart(5)}  ${String(row.calls).padStart(5)}  ${String(row.tris).padStart(8)}  ${String(row.sh).padStart(9)} ${String(row.shSize).padStart(5)}  ${String(row.box).padStart(4)}  ${String(row.standing).padStart(7)}`);
  await p.close();
}
await b.close();
