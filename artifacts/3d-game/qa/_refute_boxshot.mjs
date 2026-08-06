// Does the finding's proposed fix — "cap the shadow box at ~120" — reintroduce
// the bug fitShadow()'s own comment says the 220 cap was opened up to fix?
// Shoot the r=12 frame at box 220 (shipping), box 120 (proposed), and shadows
// off (the other proposed lever).
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
const PORT = process.env.PORT || 4177;
const wid = process.argv[2] || 'maple';
mkdirSync('qa-out/refute', { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
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
const st = await p.evaluate(async () => {
  window.__setVoidR(12);
  for (let i=0;i<45;i++) await new Promise(x=>requestAnimationFrame(x));
  let sun=null; window.__scene.traverse(o=>{ if(o.isDirectionalLight) sun=o; });
  return { box: Math.round(sun.shadow.camera.right), sh: window.__renderer.shadowMap.enabled,
    map: sun.shadow.mapSize.x, camY: Math.round(window.__cam.position.y) };
});
console.log('settled:', JSON.stringify(st));
await p.screenshot({ path: `qa-out/refute/${wid}-r12-box${st.box}.png` });
await p.evaluate(async () => {
  let sun=null; window.__scene.traverse(o=>{ if(o.isDirectionalLight) sun=o; });
  const c=sun.shadow.camera; c.left=-120;c.right=120;c.top=120;c.bottom=-120; c.updateProjectionMatrix();
  for (let i=0;i<10;i++) await new Promise(x=>requestAnimationFrame(x));
});
await p.screenshot({ path: `qa-out/refute/${wid}-r12-box120.png` });
await p.evaluate(async () => {
  const R=window.__renderer; let sun=null; window.__scene.traverse(o=>{ if(o.isDirectionalLight) sun=o; });
  const c=sun.shadow.camera; c.left=-220;c.right=220;c.top=220;c.bottom=-220; c.updateProjectionMatrix();
  R.shadowMap.enabled=false; sun.castShadow=false;
  window.__scene.traverse(o=>{ const m=o.material; if(m)(Array.isArray(m)?m:[m]).forEach(mm=>{mm.needsUpdate=true;}); });
  for (let i=0;i<10;i++) await new Promise(x=>requestAnimationFrame(x));
});
await p.screenshot({ path: `qa-out/refute/${wid}-r12-noshadow.png` });
console.log('wrote qa-out/refute/' + wid + '-r12-{box' + st.box + ',box120,noshadow}.png');
await p.close(); await b.close();
