// REFUTE-SWITCH-3 — THE CONTROL the finding never ran.
// _switch measured boot(MAPLE) against switch(MAPLE→GAME DAY) and attributed the
// whole difference to the reload. But those are two different islands. This boots
// each world DIRECTLY (no reload, ?w= only) and reports module-eval, so the cost
// of BUILDING GAME DAY can be separated from the cost of the reload mechanism.
// Also reports whether the main bundle was re-DOWNLOADED on a repeat navigation.
import { chromium } from 'playwright';
const PORT = process.argv[2] || 4191;
const WORLDS = (process.argv[3] || 'maple,gameday').split(',');
for (const w of WORLDS) {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--use-gl=angle','--use-angle=swiftshader','--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await ctx.addInitScript(() => { try { localStorage.setItem('voidPlayed','1'); localStorage.setItem('voidTut','1');
    localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
  const p = await ctx.newPage();
  await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
  // prime caches, then measure the SECOND (warm) navigation — same cache state a
  // reload-driven world switch enjoys
  await p.goto(`http://127.0.0.1:${PORT}/?w=${w}`, { waitUntil: 'commit' });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 900000 });
  const t0 = Date.now();
  await p.goto(`http://127.0.0.1:${PORT}/?w=${w}`, { waitUntil: 'commit' });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 900000 });
  const r = await p.evaluate(() => {
    const n = performance.getEntriesByType('navigation')[0];
    const js = performance.getEntriesByType('resource').filter(x => /main-.*\.js$/.test(x.name))[0];
    return { eval: Math.round(n.domContentLoadedEventEnd),
      jsTransfer: js ? js.transferSize : -1, jsDecoded: js ? js.decodedBodySize : -1,
      jsDur: js ? Math.round(js.duration) : -1,
      htmlTransfer: Math.round(n.transferSize), htmlDecoded: Math.round(n.decodedBodySize) };
  });
  console.log(`${w.padEnd(8)} warm nav→__voidState ${String(Date.now()-t0).padStart(6)}ms   moduleEval ${String(r.eval).padStart(6)}ms   bundle transfer ${r.jsTransfer}B / decoded ${r.jsDecoded}B in ${r.jsDur}ms   html ${r.htmlTransfer}B/${r.htmlDecoded}B`);
  await b.close();
}
