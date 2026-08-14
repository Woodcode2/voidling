// THE STORE CAPTURE RIG (LADDER action #3). POP is the axis the teardown says
// we measurably lose, and the missing store screenshot set is the biggest
// piece of it. This shoots a repeatable, HUD-clean hero frame per world at
// the App Store 6.7" portrait size (1290x2796 = 430x932 @3x), void at a
// mid-match size so the world reads as inhabited prey, quality pinned high.
// Frames land in qa/out/store/ for the owner's listing; re-run any time the
// look changes. `node qa/store.mjs [port]`.
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const PORT = process.argv[2] || '4177';
const OUT = new URL('./out/store/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });

for (const w of ['maple', 'pirate', 'gameday', 'lantern']) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 3 });
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try { localStorage.clear(); localStorage.setItem('voidPlayed', '1');
    localStorage.setItem('voidTut', '1'); localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
  await p.goto(`http://127.0.0.1:${PORT}/?w=${w}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => { if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
  await p.evaluate(() => document.getElementById('btnPlay')?.click());
  await p.waitForTimeout(1200);
  await p.evaluate((ww) => document.querySelector(`#worldRow .wCard[data-world="${ww}"]`)?.click(), w);
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 2.5, null, { timeout: 400000 });
  // a mid-match void in best quality, sitting where the intro's establishing
  // shot leaves the player — the frame every store browser judges first
  await p.evaluate(() => { window.__pinQuality(0); window.__setVoidR(2.6); });
  await p.waitForTimeout(4200);
  // gameplay frame WITH HUD (honest store shot: Apple wants real UI)
  await p.screenshot({ path: `${OUT}${w}_hud.png` });
  // and the clean hero frame for composited listing art
  await p.evaluate(() => { const cv = document.querySelector('canvas');
    for (const el of Array.from(document.body.children)) if (el !== cv && !el.contains(cv)) el.style.display = 'none'; });
  await p.waitForTimeout(400);
  await p.screenshot({ path: `${OUT}${w}_clean.png` });
  console.log(`${w}: hud + clean captured`);
  await p.close();
}
await b.close();
console.log(`done -> ${OUT} (1290x2796, App Store 6.7")`);
