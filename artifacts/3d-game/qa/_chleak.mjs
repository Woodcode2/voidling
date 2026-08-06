// CODE-HEALTH: does anything grow across matches? Three matches back to back
// via PLAY AGAIN, sampling heap / GPU resources / scene nodes / edibles /
// listener counts at the SAME point of each match (t just past the intro).
// Also reports whether a service worker ever registers.
import { chromium } from 'playwright';
const PORT = process.env.PORT || 4177;
const W = process.argv[2] || 'maple';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-precise-memory-info'] });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await ctx.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
const p = await ctx.newPage();
await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
const errs = [];
p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text().slice(0, 200)); });
const cdp = await ctx.newCDPSession(p);
await cdp.send('HeapProfiler.enable');

await p.goto(`http://127.0.0.1:${PORT}/?w=${W}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show').forEach(e => {
  if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));

const sw = await p.evaluate(async () => {
  if (!('serviceWorker' in navigator)) return 'no-api';
  const regs = await navigator.serviceWorker.getRegistrations();
  return `registrations=${regs.length}`;
});
console.log('service worker after full boot:', sw);

async function sample(tag) {
  await cdp.send('HeapProfiler.collectGarbage');
  await p.waitForTimeout(500);
  const s = await p.evaluate(() => {
    const r = window.__renderer, m = performance.memory || {};
    let nodes = 0, meshes = 0, vis = 0;
    window.__scene.traverse(o => { nodes++; if (o.isMesh) meshes++; if (o.visible) vis++; });
    const es = window.__edibles;
    let eaten = 0, invisible = 0, orphan = 0, scaled = 0;
    for (const e of es) { if (e.eaten) eaten++; if (!e.mesh.visible) invisible++;
      if (!e.mesh.parent) orphan++;
      if (Math.abs(e.mesh.scale.x - e.homeScale.x) > 1e-3) scaled++; }
    return { heap: +(m.usedJSHeapSize / 1048576).toFixed(1),
      geo: r.info.memory.geometries, tex: r.info.memory.textures,
      prog: r.info.programs.length, nodes, meshes, vis,
      edibles: es.length, eaten, invisible, orphan, scaled,
      calls: r.info.render.calls, tris: r.info.render.triangles };
  });
  console.log(tag.padEnd(12), JSON.stringify(s));
  return s;
}

async function playTo(sec) {
  await p.waitForFunction(t => (window.__matchState?.().t ?? 0) >= t, sec, { timeout: 900000 });
}

// match 1 via the picker
await p.click('#btnPlay'); await p.waitForTimeout(1500);
await p.click(`#worldRow .wCard[data-world="${W}"]`);
await playTo(10);
const a = await sample('match1@10s');

for (let n = 2; n <= 4; n++) {
  // run to the whistle — rush the clock so this finishes in this century
  await p.evaluate(() => window.__rushClock(1.5));
  await p.waitForFunction(() => document.getElementById('end')?.classList.contains('show'),
    null, { timeout: 3600000 });
  await p.waitForTimeout(1200);
  await sample(`end${n - 1}`);
  // #btnAgain carries an infinite CSS pulse, so Playwright's stability check
  // never settles — dispatch the click directly.
  await p.evaluate(() => document.getElementById('btnAgain').click());
  await playTo(10);
  await sample(`match${n}@10s`);
}
console.log('errors:', errs.length ? errs.slice(0, 10) : 'none');
await b.close();
