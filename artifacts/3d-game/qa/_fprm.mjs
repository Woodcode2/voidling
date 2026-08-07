// THE INSTANT-REMATCH PATH. resetMatch() (prototype3d.ts:3128) walks every
// edible in the world in ONE frame — un-eats it, re-parents it into the scene,
// rewrites its shadow instance, copies position/scale/rotation. On Maple that
// array is ~5,800 long. This times the frame PLAY AGAIN lands on, over N
// rematches, and watches the heap for anything the last match kept.
//   node qa/_fprm.mjs [worlds] [rematches] [port]
import { chromium } from 'playwright';
const WORLDS = (process.argv[2] || 'maple').split(',');
const REPS = +(process.argv[3] || 4);
const PORT = process.argv[4] || '4231';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader',
         '--enable-precise-memory-info', '--js-flags=--expose-gc'] });
for (const wid of WORLDS) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  p.setDefaultTimeout(900000);
  await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
  await p.goto(`http://127.0.0.1:${PORT}/?w=${wid}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 600000 });
  await p.evaluate(() => document.querySelectorAll('.show').forEach(e => {
    if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
  await p.click('#btnPlay'); await p.waitForTimeout(1400);
  await p.click(`#worldRow .wCard[data-world="${wid}"]`);
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.3, null, { timeout: 900000 });
  await p.evaluate(() => {
    window.__pinQuality(0); window.__renderer.render = () => {};
    const rawRAF = window.requestAnimationFrame.bind(window);
    window.__R = [];                       // per-frame ms, always the last 400
    window.requestAnimationFrame = (cb) => rawRAF((ts) => {
      const a = performance.now(); cb(ts); const d = performance.now() - a;
      window.__R.push({ d, t: window.__matchState?.().t ?? -1, w: performance.now() });
      if (window.__R.length > 4000) window.__R.splice(0, 2000);
    });
  });
  console.log(`\n═══ ${wid.toUpperCase()}  edibles=${await p.evaluate(() => window.__edibles.length)}  scene children=${await p.evaluate(() => window.__scene.children.length)}`);
  console.log('  rep |  end→results |  PLAY AGAIN handler | worst of next 60 frames | heap after (MB) | geometries | textures | scene kids');
  for (let rep = 0; rep <= REPS; rep++) {
    // run the clock down to the finale rather than sitting through 3 minutes
    await p.evaluate(() => window.__rushClock(4));
    await p.waitForFunction(() => document.getElementById('end')?.classList.contains('show'),
      null, { timeout: 600000 });
    const endWorst = await p.evaluate(() => { const R = window.__R.slice(-140);
      return Math.max(...R.map(x => x.d)); });
    if (rep === REPS) { console.log(`  final: worst frame in the end sequence ${endWorst.toFixed(1)} ms`); break; }
    const before = await p.evaluate(() => { window.__R.length = 0;
      return performance.memory.usedJSHeapSize; });
    // resetMatch() runs SYNCHRONOUSLY inside the click handler, not in a rAF
    // callback — timing frames around the click never sees it at all. click()
    // dispatches inline, so this stopwatch brackets the real work.
    const clickMs = await p.evaluate(() => { const a = performance.now();
      document.getElementById('btnAgain').click(); return performance.now() - a; });
    await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 2.5, null, { timeout: 600000 });
    const o = await p.evaluate((bf) => { const R = window.__R;
      const after = R.slice(0, 60).map(x => x.d);
      const inf = window.__renderer.info;
      return { next: Math.max(...after), heap: performance.memory.usedJSHeapSize,
        d: (performance.memory.usedJSHeapSize - bf) / 1048576,
        geo: inf.memory.geometries, tex: inf.memory.textures,
        kids: window.__scene.children.length, ed: window.__edibles.length };
    }, before);
    console.log(`  ${String(rep).padStart(3)} | ${endWorst.toFixed(1).padStart(9)} ms | ${clickMs.toFixed(1).padStart(14)} ms | ${o.next.toFixed(1).padStart(20)} ms | ${(o.heap / 1048576).toFixed(0).padStart(11)} (${o.d >= 0 ? '+' : ''}${o.d.toFixed(0)}) | ${String(o.geo).padStart(10)} | ${String(o.tex).padStart(8)} | ${String(o.kids).padStart(10)}  edibles=${o.ed}`);
  }
  await p.close();
}
await b.close();
