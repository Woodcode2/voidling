// SCRATCH — was ANYTHING painted before the synchronous island build started?
// If first-contentful-paint lands after the block, the child stares at a blank
// window, not at the branded loading cover the markup was written to show.
import { chromium } from 'playwright';
const PORT = process.argv[2] || 4188;
for (const W of (process.argv[3] || 'maple,pirate,gameday,lantern').split(',')) {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--use-gl=angle','--use-angle=swiftshader','--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await ctx.addInitScript(() => { try { localStorage.setItem('voidPlayed','1'); localStorage.setItem('voidTut','1'); } catch {} });
  const p = await ctx.newPage();
  await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
  await p.goto(`http://127.0.0.1:${PORT}/?w=${W}`, { waitUntil: 'commit' });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.waitForTimeout(15000);
  const r = await p.evaluate(() => {
    const paints = performance.getEntriesByType('paint').map(e => [e.name, Math.round(e.startTime)]);
    const lcp = performance.getEntriesByType('largest-contentful-paint').map(e => Math.round(e.startTime));
    const n = performance.getEntriesByType('navigation')[0];
    return { paints, lcp, domInteractive: Math.round(n.domInteractive), domComplete: Math.round(n.domComplete),
      loadEnd: Math.round(n.loadEventEnd), now: Math.round(performance.now()) };
  });
  console.log(`${W.padEnd(8)} paints=${JSON.stringify(r.paints)}  domInteractive=${r.domInteractive}  domComplete=${r.domComplete}  loadEventEnd=${r.loadEnd}  (hooks live at ~${r.now}ms)`);
  await b.close();
}
