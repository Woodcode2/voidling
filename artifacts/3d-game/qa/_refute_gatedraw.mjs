// REFUTE pass, part 3 — "a cloned material also breaks material sharing, so it
// costs draw-call sorting on top of the allocation."
// Draw calls in three.js are per-mesh, not per-material; sharing a material has
// never merged two meshes into one call. The thing that COULD hurt is a shader
// program compile on first use of each new material — that is a real stall a
// child can feel. So: watch renderer.info.programs across the match, and watch
// the render pass keep rendering (do NOT stub renderer.render for this one).
import { chromium } from 'playwright';
const PORT = process.env.PORT || 4177;
const WID = process.argv[2] || 'maple';
const UNTIL = +(process.argv[3] || 60);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
await p.goto(`http://127.0.0.1:${PORT}/?w=${WID}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show').forEach(e => {
  if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
await p.click('#btnPlay'); await p.waitForTimeout(1400);
await p.click(`#worldRow .wCard[data-world="${WID}"]`);
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 6, null, { timeout: 600000 });
// drive toward food, but LEAVE THE RENDERER ALONE
await p.evaluate(() => {
  const cv = document.querySelector('canvas'); const cx = innerWidth / 2, cy = innerHeight / 2;
  cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: cx, clientY: cy, bubbles: true }));
  window.__samples = [];
  const tick = () => { const vs = window.__voidState(); let best = null, bd = 1e9;
    for (const e of window.__edibles) { if (e.eaten || !e.mesh?.visible || e.mesh.userData.eaten || e.radius > vs.r * 0.92) continue;
      const dx = e.mesh.position.x - vs.x, dz = e.mesh.position.z - vs.z; const d = dx * dx + dz * dz;
      if (d < bd) { bd = d; best = { dx, dz }; } }
    if (best) { const m = Math.hypot(best.dx, best.dz) || 1;
      dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: cx + best.dx / m * 110, clientY: cy + best.dz / m * 110, bubbles: true })); }
    requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
});
const snap = () => p.evaluate(() => { const i = window.__renderer.info;
  let clones = 0; window.__scene.traverse(o => { if (o.userData && o.userData.gateMat) clones++; });
  return { t: +window.__matchState().t.toFixed(1), calls: i.render.calls, tris: i.render.triangles,
    programs: i.programs ? i.programs.length : -1, mats: i.memory ? i.memory.textures : -1, clones }; });
const rows = [await snap()];
for (const mark of [15, 30, 45, UNTIL]) {
  await p.waitForFunction((T) => window.__matchState().t > T, mark, { timeout: 1800000 });
  rows.push(await snap());
}
console.log(`\n${WID.toUpperCase()} — renderer state across a match (render pass LIVE)`);
for (const r of rows)
  console.log(`  t=${String(r.t).padStart(6)}s  drawCalls ${String(r.calls).padStart(5)}  programs ${String(r.programs).padStart(4)}  gateClones ${String(r.clones).padStart(5)}  tris ${r.tris}`);
await b.close();
