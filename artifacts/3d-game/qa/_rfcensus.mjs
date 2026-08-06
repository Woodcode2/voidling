// REFUTATION PROBE: GLB placement census at boot AND across a real match.
import { chromium } from 'playwright';
const PORT = process.argv[2] || 4177;
const WORLDS = (process.argv[3] || 'maple,pirate,gameday,lantern').split(',');
const TARGET_T = Number(process.argv[4] || 0);   // match-clock seconds to run to

for (const w of WORLDS) {
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--no-sandbox'],
  });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await ctx.addInitScript(() => { try {
    localStorage.setItem('voidPlayed','1'); localStorage.setItem('voidTut','1');
  } catch {} });
  const page = await ctx.newPage();
  await page.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  const glbReqs = [];
  page.on('request', (r) => { if (r.url().includes('/assets/hf3d/')) glbReqs.push(r.url()); });
  await page.goto(`http://127.0.0.1:${PORT}/?w=${w}`, { waitUntil: 'commit' });
  await page.waitForFunction(() => window.__matchState != null, null, { timeout: 300000 });
  const boot = await page.evaluate(() => JSON.parse(JSON.stringify(window.__glbCount || {})));
  // start the match through the real UI
  await page.evaluate(() => { document.getElementById('btnPlay')?.click(); });
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    const cards = [...document.querySelectorAll('#worldRow .wCard[data-world].sel')];
    (cards[0] || document.querySelector('#worldRow .wCard[data-world]')).click();
  });
  let t = 0;
  if (TARGET_T > 0) {
    const t0 = Date.now();
    while (t < TARGET_T && Date.now() - t0 < 900000) {
      await page.waitForTimeout(3000);
      t = await page.evaluate(() => (window.__matchState?.() || {}).t || 0);
    }
  } else {
    await page.waitForTimeout(3000);
    t = await page.evaluate(() => (window.__matchState?.() || {}).t || 0);
  }
  const after = await page.evaluate(() => JSON.parse(JSON.stringify(window.__glbCount || {})));
  const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);
  console.log(JSON.stringify({ world: w, matchT: Math.round(t),
    bootTotal: sum(boot), bootNames: Object.keys(boot).length, boot,
    afterTotal: sum(after), afterNames: Object.keys(after).length,
    newDuringMatch: Object.fromEntries(Object.entries(after).filter(([k,v]) => v !== (boot[k]||0))),
    glbRequests: glbReqs.length, uniqueGlbRequests: new Set(glbReqs).size }, null, 1));
  await browser.close();
}
