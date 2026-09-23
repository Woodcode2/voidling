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
// of a spree for each VISIBLE '+N' (opacity > 0.5) and how many consecutive
// frames it stays up.
//
// THE BAR IS PER NUMBER. The first version counted frames with any number on
// them, bar 10, and PASSED the broken build at 18 of 119 frames: nine flights
// that each flashed for a frame add up. What the review found was a number
// that exists for ONE frame, so that is what is graded now: the median run a
// '+N' stays visible must be at least 3 sampled frames (a one-frame flash is
// not a number a child can read). Before and after are both recorded in the
// commit that set it.
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
  window.__cn = { frames: 0, seen: 0, texts: new Set(), runs: [], live: new Map() };
  const tick = () => {
    const C = window.__cn;
    C.frames++;
    let any = false;
    const now = new Map();
    for (const e of document.querySelectorAll('.vf')) {
      const t = (e.textContent || '').trim();
      if (!/^\+[\d,]+$/.test(t)) continue;
      if (parseFloat(getComputedStyle(e).opacity) > 0.5) {
        any = true; C.texts.add(t);
        const key = e;   // one pooled node showing one text is one run
        const prev = C.live.get(key);
        now.set(key, prev && prev.t === t ? { t, n: prev.n + 1 } : { t, n: 1 });
        if (prev && prev.t !== t) C.runs.push(prev.n);
      }
    }
    for (const [k, v] of C.live) if (!now.has(k)) C.runs.push(v.n);
    C.live = now;
    if (any) C.seen++;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});
await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}&len=90`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 4, null, { timeout: 600000 });
const rm = await p.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
if (!rm) die('the page does not see prefers-reduced-motion — nothing was measured');
await p.evaluate(() => { const C = window.__cn; C.frames = 0; C.seen = 0; C.texts = new Set(); C.runs = []; C.live = new Map(); });
const t0 = await p.evaluate(() => window.__matchState().t);
for (let i = 0; i < 20; i++) {
  await p.waitForFunction((x) => window.__matchState().t >= x, t0 + i * 0.2, { timeout: 600000, polling: 100 });
  await p.evaluate(() => window.__eatNearest(0.1));
}
await p.waitForFunction((x) => window.__matchState().t >= x, t0 + 20 * 0.2 + 1.5, { timeout: 600000, polling: 200 });
const r = await p.evaluate(() => { const C = window.__cn; for (const v of C.live.values()) C.runs.push(v.n);
  return { frames: C.frames, seen: C.seen, texts: [...C.texts].slice(0, 8), runs: C.runs.slice() }; });
await b.close();
console.log(`\n  CALM NUMBER — ${WORLD} under prefers-reduced-motion, on :${PORT}\n`);
const runs = r.runs.slice().sort((a, b2) => a - b2);
const med = runs.length ? runs[Math.floor(runs.length / 2)] : 0;
console.log(`  ·    a visible '+N' on ${r.seen} of ${r.frames} frames across a 20-bite spree${r.texts.length ? ` (${r.texts.join(' ')})` : ''}`);
console.log(`  ·    ${runs.length} number(s) shown; frames each stayed up: ${runs.join(' ') || 'none'} — median ${med}`);
if (!runs.length || med < 3) { console.log(`\nFAIL — a reduced-motion child's points number stays up a median ${med} frame(s) (bar 3): a flash, not a number she can read`); process.exit(1); }
console.log(`\nPASS — each points number stays up under reduced motion (median ${med} frames)`);
