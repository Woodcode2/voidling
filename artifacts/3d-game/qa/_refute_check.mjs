// Sanity check on the arm-C measurement: skipping scene.updateMatrixWorld()
// must not change WHAT gets drawn, only how long the CPU spends getting there.
// If draw calls / triangles differ between arms, the 4-5 ms saving is an
// artifact of a broken render list, not a real saving.
import { chromium } from 'playwright';
const PORT = process.env.PORT || 4177;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
for (const wid of (process.argv[2] || 'maple').split(',')) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
  await p.goto(`http://127.0.0.1:${PORT}/?w=${wid}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.evaluate(() => document.querySelectorAll('.show').forEach(e => {
    if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
  await p.click('#btnPlay'); await p.waitForTimeout(1400);
  await p.click(`#worldRow .wCard[data-world="${wid}"]`);
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 6, null, { timeout: 600000 });
  const r = await p.evaluate(async () => {
    const S = window.__scene, R = window.__renderer, C = window.__cam;
    const nf = () => new Promise(x => requestAnimationFrame(x));
    await nf(); await nf();
    S.updateMatrixWorld(true);
    R.render(S, C);
    const on = { calls: R.info.render.calls, tris: R.info.render.triangles };
    S.matrixWorldAutoUpdate = false;
    R.render(S, C);
    const off = { calls: R.info.render.calls, tris: R.info.render.triangles };
    S.matrixWorldAutoUpdate = true;
    return { on, off, nodes: (() => { let n = 0; S.traverse(() => n++); return n; })() };
  });
  console.log(`${wid.toUpperCase()}  ${r.nodes} nodes`);
  console.log(`  walk ON : ${r.on.calls} draw calls, ${r.on.tris} triangles`);
  console.log(`  walk OFF: ${r.off.calls} draw calls, ${r.off.tris} triangles   ${r.on.calls === r.off.calls && r.on.tris === r.off.tris ? 'IDENTICAL — the saving is real' : 'DIFFERENT — arm C is an artifact'}`);
  await p.close();
}
await b.close();
