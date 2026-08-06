// Same frame, shadows off vs on. Freezes the SIM with the game's own pause
// (rendering keeps running, the camera holds still), hides the pause sheet, and
// shoots the identical composition twice.
//
//   node qa/_groundfreeze.mjs [world] [port] [markT]
import { chromium } from 'playwright';
import fs from 'node:fs';
const WORLD = process.argv[2] || 'maple';
const PORT = process.argv[3] || '4237';
const MARK = +(process.argv[4] || 30);
const OUT = '/tmp/claude-0/-home-user-voidling/1f93d8f7-3ff2-5559-8b0b-a74b62b39437/scratchpad';
fs.mkdirSync(OUT, { recursive: true });

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
p.setDefaultTimeout(600000);
await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 400000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 600000 });
await p.evaluate(() => document.querySelectorAll('.show').forEach(e => {
  if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
await p.click('#btnPlay'); await p.waitForTimeout(1600);
await p.click(`#worldRow .wCard[data-world="${WORLD}"]`);
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout: 600000 });

await p.evaluate(() => {
  window.__RR = window.__renderer.render.bind(window.__renderer);
  const cv = document.querySelector('canvas');
  const cx = innerWidth / 2, cy = innerHeight / 2;
  cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: cx, clientY: cy, bubbles: true }));
  const tick = () => {
    const vs = window.__voidState(); let best = null, bd = 1e9;
    for (const e of window.__edibles) {
      if (e.eaten || !e.mesh?.visible || e.radius > vs.r * 0.92) continue;
      const dx = e.mesh.position.x - vs.x, dz = e.mesh.position.z - vs.z;
      const d = dx * dx + dz * dz; if (d < bd) { bd = d; best = { dx, dz }; }
    }
    if (best) { const m = Math.hypot(best.dx, best.dz) || 1;
      dispatchEvent(new PointerEvent('pointermove', { pointerId: 1,
        clientX: cx + best.dx / m * 110, clientY: cy + best.dz / m * 110, bubbles: true })); }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});

await p.evaluate(() => { window.__renderer.render = () => {}; });
await p.waitForFunction(t => (window.__matchState?.().t ?? 0) > t, MARK, { timeout: 1500000 });
await p.evaluate(() => { window.__renderer.render = window.__RR; });
await p.waitForTimeout(2000);

// FREEZE: the game's own pause holds the sim + camera; render loop keeps going
const frozen = await p.evaluate(() => {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
  document.dispatchEvent(new Event('visibilitychange'));
  return { pauseShown: !!document.querySelector('#pause.show'), body: document.body.className };
});
console.log('freeze:', JSON.stringify(frozen));
await p.waitForTimeout(1200);
// hide every overlay chrome so only the world is in frame
await p.evaluate(() => {
  document.querySelectorAll('.show').forEach(e => e.classList.remove('show'));
  document.body.className = '';
  for (const id of ['hud', 'lb', 'joy', 'news', 'growth', 'hunger', 'pw', 'top', 'timer'])
    { const e = document.getElementById(id); if (e) e.style.display = 'none'; }
});
await p.waitForTimeout(2500);

const state = () => {
  const R = window.__renderer, S = window.__scene; let sun = null;
  S.children.forEach(o => { if (o.isDirectionalLight) sun = o; });
  return { t: +window.__matchState().t.toFixed(1), r: +window.__voidState().r.toFixed(2),
    on: R.shadowMap.enabled, sunCast: sun.castShadow, map: sun.shadow.mapSize.x,
    camx: +window.__cam.position.x.toFixed(2), camz: +window.__cam.position.z.toFixed(2) };
};
console.log('A (as shipped):', JSON.stringify(await p.evaluate(state)));
await p.screenshot({ path: `${OUT}/fz-${WORLD}-off.png` });

await p.evaluate(() => {
  const R = window.__renderer, S = window.__scene; let sun = null;
  S.children.forEach(o => { if (o.isDirectionalLight) sun = o; });
  R.shadowMap.enabled = true; sun.castShadow = true;
  S.traverse(o => { const m = o.material; if (m) (Array.isArray(m) ? m : [m]).forEach(mm => { mm.needsUpdate = true; }); });
});
await p.waitForTimeout(4000);
console.log('B (shadows forced on):', JSON.stringify(await p.evaluate(state)));
await p.screenshot({ path: `${OUT}/fz-${WORLD}-on.png` });

// C: shadows on AND every casting prop given a disc, to preview the proposed fix
await p.evaluate(() => {
  const T = window.__THREE, S = window.__scene;
  const R = window.__renderer; let sun = null;
  S.children.forEach(o => { if (o.isDirectionalLight) sun = o; });
  R.shadowMap.enabled = false; sun.castShadow = false;
  S.traverse(o => { const m = o.material; if (m) (Array.isArray(m) ? m : [m]).forEach(mm => { mm.needsUpdate = true; }); });
  // find the shared disc material off an existing instanced mesh
  let inst = null; S.traverse(o => { if (o.isInstancedMesh && !inst) inst = o; });
  if (!inst) return 'no instanced disc mesh';
  const geo = inst.geometry, mat = inst.material;
  window.__added = [];
  for (const e of window.__edibles) {
    if (e.eaten) continue;
    const ud = e.mesh.userData || {};
    let casts = false; e.mesh.traverse(o => { if (o.isMesh && o.castShadow) casts = true; });
    let disc = ud.shIdx !== undefined;
    if (!disc) e.mesh.traverse(o => { if (o.userData && o.userData.cshadow) disc = true; });
    if (casts && !disc) {
      const m = new T.Mesh(geo, mat);
      m.rotation.x = -Math.PI / 2; m.position.y = 0.045 - (e.mesh.position.y || 0);
      m.scale.setScalar(Math.max(0.55, e.radius * 1.1) * 1.35);
      m.renderOrder = -1;
      e.mesh.add(m); window.__added.push(m);
    }
  }
  return window.__added.length;
}).then(n => console.log('discs added for the fix preview:', n));
await p.waitForTimeout(4000);
await p.screenshot({ path: `${OUT}/fz-${WORLD}-fix.png` });
await b.close();
console.log('done');
