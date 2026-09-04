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
import { ALL_WORLDS } from './worlds.mjs';

const PORT = process.argv[2] || '4177';
const WORLDS = process.argv.slice(3).length ? process.argv.slice(3)
  : ALL_WORLDS;
fs.mkdirSync('qa/out/space', { recursive: true });

const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
for (const wid of WORLDS) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  p.on('crash', () => console.log(`  ${wid}: PAGE CRASHED`));
  p.on('pageerror', (e) => console.log(`  ${wid}: page error ${String(e).slice(0, 120)}`));
  await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString());
    localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder,skylark');
  } catch {} });
  // ?r=10 sets DEBUG_HARNESS, which starts the match without the menu
  console.log(`  ${wid}: page open, loading…`);
  await p.goto(`http://127.0.0.1:${PORT}/?w=${wid}&r=10`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  console.log(`  ${wid}: loaded, waiting for the match…`);
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 10, null, { timeout: 400000 });
  console.log(`  ${wid}: match live`);
  await p.waitForFunction(() => (window.__scene?.background?.image?.width ?? 0) > 2048, null, { timeout: 400000 })
    .catch(() => console.log(`  (${wid}: painted sky never arrived)`));
  console.log(`  ${wid}: sky settled, finding the coast…`);
  // Scan INWARD from 600 units and take the first cell that IS land — the outer
  // coast by construction. The outward version photographed Pirate Bay from the
  // middle of its own bay, because that island has water INSIDE it and the
  // first not-land cell going out from the centre is the lagoon.
  const edge = await p.evaluate(() => {
    const v = window.__voidState();
    let best = 0, baz = 0;
    for (let a = 0; a < 8; a++) {
      const az = a * Math.PI / 4, cs = Math.cos(az), sn = Math.sin(az);
      for (let d = 600; d > 20; d -= 4) {
        if (window.__solidAt(cs * d, sn * d, v.r)) { if (!best || d < best) { best = d; baz = az; } break; }
      }
    }
    if (!best) throw new Error('no land on any of 8 rays out to 600 units');
    window.__warpVoid(Math.cos(baz) * (best - 20), Math.sin(baz) * (best - 20));
    return Math.round(best);
  });
  // hide the HUD so the frame is the render, not the interface
  await p.addStyleTag({ content: 'body > *:not(canvas){opacity:0 !important;pointer-events:none}' });
  await new Promise((r) => setTimeout(r, 3000));
  console.log(`  ${wid}: shooting…`);
  await p.screenshot({ path: `qa/out/space/${wid}.png` });
  console.log(`  ${wid.padEnd(9)} outer coast ${edge}u from centre → qa/out/space/${wid}.png`);
  await p.close();
}
await b.close();
