// The world-switch reload path: how long is the loading curtain up AFTER the
// match clock has already started? Sampled against __matchState().t, which is
// match time, so the software renderer cannot inflate it.
import { chromium } from 'playwright';
const PORT = process.env.PORT || 4271;
const TARGET = process.argv[2] || 'pirate';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const pg = await b.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
pg.on('pageerror', e => console.log('PAGEERROR', e.message));
await pg.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
await pg.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });

await pg.goto(`http://127.0.0.1:${PORT}/?w=maple`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await pg.waitForFunction(() => window.__matchState, null, { timeout: 300000 });
await pg.waitForTimeout(1200);
await pg.evaluate(() => document.getElementById('btnPlay').click());
await pg.waitForTimeout(500);
await pg.evaluate((w) => document.querySelector(`#worldRow .wCard[data-world="${w}"]`).click(), TARGET);

// the page reloads; re-arm and sample from the new document
await pg.waitForFunction(() => window.__matchState, null, { timeout: 300000 });
// install an in-page sampler so we do not pay a round trip per sample
await pg.evaluate(() => {
  window.__renderer.render = () => {};   // sim runs at its proper rate; the curtain is DOM
  window.__curtain = [];
  const tick = () => {
    try {
      const m = window.__matchState();
      const l = document.getElementById('loadScr');
      const cs = getComputedStyle(l);
      window.__curtain.push([+m.t.toFixed(2), +m.clock.toFixed(2), cs.display, +cs.opacity,
        document.getElementById('lPct') ? document.getElementById('lPct').textContent : '']);
    } catch {}
    if (window.__curtain.length < 20000) requestAnimationFrame(tick);
  };
  tick();
});
await pg.waitForFunction(() => { try { return window.__matchState().t > 30; } catch { return false; } }, null, { timeout: 400000 });
const rows = await pg.evaluate(() => window.__curtain);
const up = rows.filter(r => r[2] !== 'none' && r[3] > 0.02);
const started = rows.filter(r => r[0] > 0);
console.log(`samples: ${rows.length}  |  clock started at first sample t=${rows[0] ? rows[0][0] : 'n/a'}`);
if (up.length) {
  const lastUp = up[up.length - 1];
  console.log(`curtain last visible at MATCH t=${lastUp[0]}s (clock ${lastUp[1]}), opacity ${lastUp[3]}, pct "${lastUp[4]}"`);
  const overlap = up.filter(r => r[0] > 0);
  console.log(`curtain up for ${overlap.length} samples while the match clock was already running`);
  if (overlap.length) console.log(`  overlap spans match t=${overlap[0][0]}s .. t=${overlap[overlap.length-1][0]}s  => ${(overlap[overlap.length-1][0] - overlap[0][0]).toFixed(2)}s of match time behind the curtain`);
} else console.log('curtain never observed up after reload');
console.log('first 6 samples:', JSON.stringify(rows.slice(0, 6)));
await b.close();
