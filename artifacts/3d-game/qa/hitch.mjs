// ══════════════════════════════════════════════════════════════════════════
//  HITCH — the fluidity instrument
// ══════════════════════════════════════════════════════════════════════════
//
//  WHAT THIS MEASURES, AND WHY IT IS NOT AN FPS COUNTER. The sandbox renders
//  through swiftshader, so absolute frame times here are 10-30x a phone's and
//  mean nothing on their own. What DOES transfer is the SHAPE of the
//  distribution: a frame that costs 2.5x the median is a hitch on any
//  renderer, because the cost that made it long (a GC pause, a forced layout,
//  a shader compile, a spawn burst) is renderer-independent work on the main
//  thread. So this reports ratios and a timeline, never a headline fps.
//
//  HOW TO READ IT.
//    median / p90 / p99   the spread. p99 near the median = an even loop.
//    hitchPct             % of frames above 2.5x median. This is the number.
//    worst                the twelve longest frames, by frame INDEX.
//    marks                frame index -> game clock, every 60 frames, so a
//                         cluster of bad indices can be located in the match
//                         ("frames 186-235" -> "t=10-12s" -> the first
//                         evolution, not the first beat).
//
//  RUN IT ON A QUIET MACHINE. Background agents or a parallel build will
//  starve the browser, the game clock will crawl, and the run either times out
//  or reports contention as if it were the game's own cost. A before/after
//  pair measured under different load is not a comparison.
//
//    node qa/hitch.mjs            # against an already-running preview :4177
//
import { chromium } from 'playwright';

const URL = process.env.HITCH_URL || 'http://localhost:4177/';
const UNTIL = Number(process.env.HITCH_UNTIL || 42);   // game seconds to cover

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 430, height: 932 } });
const page = await ctx.newPage();
// a fresh profile lands in the zero-tap autoplay match — no menu to drive
await page.goto(URL);
await page.waitForFunction(() => window.__matchState && window.__matchState().t > 1, undefined, { timeout: 180000 });

await page.evaluate(() => {
  const rec = { deltas: [], marks: [] };
  window.__hitchRec = rec;
  let last = performance.now();
  const tick = () => {
    const now = performance.now();
    rec.deltas.push(now - last);
    last = now;
    if (rec.deltas.length % 60 === 0 && window.__matchState) {
      rec.marks.push({ i: rec.deltas.length, t: window.__matchState().t, fever: window.__matchState().fever });
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});

// REAL PLAY, NOT AN IDLE CAMERA. A parked void eats nothing, spawns no
// floaters, never turns and never triggers a bubble — which is exactly the
// frame budget this instrument exists to measure. Drive a circle.
await page.evaluate(() => {
  const cv = document.querySelector('canvas');
  const r = cv.getBoundingClientRect();
  const cx = r.width / 2, cy = r.height / 2;
  cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 9, clientX: cx, clientY: cy, bubbles: true }));
  let a = 0;
  window.__driveTimer = setInterval(() => {
    a += 0.11;
    cv.dispatchEvent(new PointerEvent('pointermove', {
      pointerId: 9, clientX: cx + Math.cos(a) * 130, clientY: cy + Math.sin(a) * 130, bubbles: true,
    }));
  }, 40);
});

await page.waitForFunction((u) => window.__matchState && window.__matchState().t > u, UNTIL, { timeout: 900000 });

const out = await page.evaluate(() => {
  const d = window.__hitchRec.deltas.slice(30);   // drop warmup
  const sorted = [...d].sort((a, b) => a - b);
  const q = (p) => sorted[Math.floor(sorted.length * p)];
  const med = q(0.5);
  const hitches = [];
  for (let i = 0; i < d.length; i++) if (d[i] > med * 2.5) hitches.push({ i, ms: Math.round(d[i]) });
  return {
    frames: d.length, median: Math.round(med * 10) / 10,
    p90: Math.round(q(0.9)), p99: Math.round(q(0.99)), max: Math.round(sorted[sorted.length - 1]),
    hitchCount: hitches.length,
    hitchPct: Math.round(hitches.length / d.length * 1000) / 10,
    worst: hitches.sort((a, b) => b.ms - a.ms).slice(0, 12),
    marks: window.__hitchRec.marks,
  };
});
const { marks, worst, ...summary } = out;
console.log('SUMMARY ' + JSON.stringify(summary));
console.log('WORST   ' + JSON.stringify(worst));
console.log('MARKS   ' + marks.map((m) => `${m.i}@t${Math.round(m.t)}f${m.fever}`).join(' '));
await browser.close();
