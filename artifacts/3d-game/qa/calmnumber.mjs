// UNDER REDUCED MOTION, A BITE STILL SHOWS ITS NUMBER
//
//   node qa/calmnumber.mjs [port] [world]
//
// Pre-merge review (ux-1): G6 retired the per-bite '+N' and made the flight
// into the bar the one number stream. A flight under reduced motion had a
// duration of 0 and was reset to an invisible slot on the very next update, so
// a child with Reduce Motion on (or the game's BIG MOTION off) got no points
// number at all on an ordinary bite — the failure the '.vf.go' calm rules had
// been written to end. With the OS setting emulated, this samples every frame
// of a spree for a VISIBLE '+N' (opacity > 0.5).
// BAR: a points number is visible on at least 10 sampled frames.
import { chromium } from 'playwright';
const POS = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const PORT = POS[0] || '4177', WORLD = POS[1] || 'maple';
const die = (m) => { console.log(`FAIL — ${m}`); process.exit(1); };
process.on('unhandledRejection', (e) => die(`rejected: ${(e && e.message) || e}`));
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, reducedMotion: 'reduce' });
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try { localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1'); localStorage.setItem('voidFirstNom', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
await p.addInitScript(() => {
  window.__cn = { frames: 0, seen: 0, texts: new Set() };
  const tick = () => {
    window.__cn.frames++;
    let any = false;
    for (const e of document.querySelectorAll('.vf')) {
      const t = (e.textContent || '').trim();
      if (!/^\+[\d,]+$/.test(t)) continue;
      if (parseFloat(getComputedStyle(e).opacity) > 0.5) { any = true; window.__cn.texts.add(t); }
    }
    if (any) window.__cn.seen++;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});
await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}&len=90`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 4, null, { timeout: 600000 });
const rm = await p.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
if (!rm) die('the page does not see prefers-reduced-motion — nothing was measured');
await p.evaluate(() => { window.__cn.frames = 0; window.__cn.seen = 0; window.__cn.texts = new Set(); });
const t0 = await p.evaluate(() => window.__matchState().t);
for (let i = 0; i < 20; i++) {
  await p.waitForFunction((x) => window.__matchState().t >= x, t0 + i * 0.2, { timeout: 600000, polling: 100 });
  await p.evaluate(() => window.__eatNearest(0.1));
}
await p.waitForFunction((x) => window.__matchState().t >= x, t0 + 20 * 0.2 + 1.5, { timeout: 600000, polling: 200 });
const r = await p.evaluate(() => ({ frames: window.__cn.frames, seen: window.__cn.seen, texts: [...window.__cn.texts].slice(0, 8) }));
await b.close();
console.log(`\n  CALM NUMBER — ${WORLD} under prefers-reduced-motion, on :${PORT}\n`);
console.log(`  ·    a visible '+N' on ${r.seen} of ${r.frames} frames across a 20-bite spree${r.texts.length ? ` (${r.texts.join(' ')})` : ''}`);
if (r.seen < 10) { console.log(`\nFAIL — the points number is visible on ${r.seen} frames (bar 10): a reduced-motion child is not being shown what a bite was worth`); process.exit(1); }
console.log(`\nPASS — the points number stays up under reduced motion (${r.seen} frames)`);
