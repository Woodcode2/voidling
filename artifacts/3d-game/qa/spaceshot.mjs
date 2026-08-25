// LOOK AT THE SPACE. Not a metric — a way to actually SEE what a child sees
// when the island's edge is on screen, which is the only time space is.
//
//   node qa/spaceshot.mjs [port] [worlds...]
//
// Writes qa/out/space/<world>.png. Uses Playwright's screenshot, not
// canvas.toDataURL(), because the renderer carries preserveDrawingBuffer:false
// and a canvas read returns the last composited frame (measured: 0/765
// response to a background change that way, 484/765 through the compositor).
//
// It warps to the coast with a big void on purpose. At spawn size the frame
// reaches about 14 units past the hero and the sky is 0.0% of it — there is
// nothing to photograph. This is the frame the art has to win.
import { chromium } from 'playwright';
import fs from 'node:fs';

const PORT = process.argv[2] || '4177';
const WORLDS = process.argv.slice(3).length ? process.argv.slice(3)
  : ['maple', 'pirate', 'gameday', 'lantern', 'powder'];
fs.mkdirSync('qa/out/space', { recursive: true });

const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
for (const wid of WORLDS) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
  await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString());
    localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder');
  } catch {} });
  // ?r=10 sets DEBUG_HARNESS, which starts the match without the menu
  await p.goto(`http://127.0.0.1:${PORT}/?w=${wid}&r=10`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 10, null, { timeout: 400000 });
  await p.waitForFunction(() => (window.__scene?.background?.image?.width ?? 0) > 2048, null, { timeout: 400000 })
    .catch(() => console.log(`  (${wid}: painted sky never arrived)`));
  const edge = await p.evaluate(() => {
    const v = window.__voidState();
    for (let x = 0; x < 600; x += 4) if (!window.__solidAt(x, 0, v.r)) return x;
    throw new Error('never left the land in 600 units — __solidAt has moved');
  });
  await p.evaluate((e) => window.__warpVoid(e - 26, 0), edge);
  // hide the HUD so the frame is the render, not the interface
  await p.addStyleTag({ content: '#hud,#count,#growth,#news,#rank,#leader,.bub,#coins{opacity:0 !important}' });
  await new Promise((r) => setTimeout(r, 3000));
  await p.screenshot({ path: `qa/out/space/${wid}.png` });
  console.log(`  ${wid.padEnd(9)} coast at x=${edge} → qa/out/space/${wid}.png`);
  await p.close();
}
await b.close();
