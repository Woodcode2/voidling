// DOES THE BAR STEP WHEN YOU EAT, OR JUST CRAWL?
//
//   node qa/barjump.mjs [port] [world]
//
// The owner, on hole.io: "when you eat like points are going into the bar."
//
// Ours crawled. The fill was written from formProgress(radius) every frame, and
// the growth law rate-limits the radius, so the bar advanced in slivers — about
// twenty width writes per second of sim, each a fraction of a pixel, none of
// them connected to anything the child had just done. A bar that moves
// constantly by an invisible amount reads as a bar that does not move.
//
// THE STATISTIC: how much of the bar's total travel arrives in STEPS.
// Every width write is captured with its own timestamp, and each is classified:
// a write that moves the fill by at least STEP_PX is a step, anything smaller
// is creep. A bar that pays on a bite puts nearly all of its travel into a
// handful of steps; a bar driven by the clock puts nearly all of it into
// hundreds of slivers.
//
// WHY AN OWN-PROPERTY SETTER AND NOT A MutationObserver. The fill is written
// with `gFillEl.style.width = …`, and an observer coalesces writes made in the
// same frame and delivers them in one microtask batch — so every record would
// read the same clock and two writes in a frame would look like one. A setter
// on the style object fires inline, once per write, with the real time.
//
// WHY IT DOES NOT USE __setVoidR. qa/_bartick.mjs does, and __setVoidR sets
// frozenR, which disables all three growth-law clamps — with the law off the
// bar already steps per bite, so nothing about this defect can be validated
// through that path. This probe eats for real.
import { chromium } from 'playwright';
import { enterMatch } from './_enter.mjs';

const PORT = process.argv[2] || '4177';
const WORLD = process.argv[3] || 'maple';
/** a width write that moves the fill this far is a STEP, not creep */
const STEP_PX = 1.5;
/** at least this share of total travel must arrive in steps */
const SHARE = 0.60;

const fail = (m) => { console.log(`FAIL — ${m}`); process.exit(1); };
process.on('uncaughtException', (e) => fail(`threw: ${(e && e.message) || e}`));
process.on('unhandledRejection', (e) => fail(`rejected: ${(e && e.message) || e}`));

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 } });
await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidFirstNom', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString());
} catch {} });
await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show').forEach(e => {
  if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
await enterMatch(p, WORLD);
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 4, null, { timeout: 600000 });

// hook every width write on the fill, inline
await p.evaluate(() => {
  const fill = document.querySelector('#growth .gFill');
  const track = document.querySelector('#growth .gTrack');
  window.__bw = { w: track.getBoundingClientRect().width, hits: [] };
  const st = fill.style;
  const proto = Object.getPrototypeOf(st);
  const d = Object.getOwnPropertyDescriptor(proto, 'width');
  Object.defineProperty(st, 'width', {
    configurable: true,
    get() { return d.get.call(this); },
    set(v) {
      window.__bw.hits.push({ t: (window.__matchState?.().t ?? 0), v: parseFloat(v) || 0 });
      d.set.call(this, v);
    },
  });
});

// ── DRIVE ON SIM TIME, NOT ON WALL TIME ──────────────────────────────────
// The payout window is EAT_FLOAT_WINDOW of SIM time and the flight is another
// 0.28s of it, and both are counted down with the CLAMPED frame dt — so under
// the software renderer at 1-2fps one payout takes the better part of ten
// WALL seconds. A first version of this probe drove 70 bites in ten seconds,
// waited 1.5 more and captured a single width write, which looks exactly like
// a bar that never moves and was in fact a bar that had not been given time to
// move once. Everything below is keyed on __matchState().t.
// AND IT HAS TO WALK. A parked void clears everything inside its reach in about
// a dozen bites and then eats nothing ever again — the first version of this
// drive did exactly that, and a bar with nothing to pay out looks identical to
// a bar that cannot pay out. Warp to fresh ground whenever the score stops
// moving, so the thing under test is the BAR and not the food supply.
// SIX sim-seconds, not eighteen. The frame loop here manages roughly one frame
// per two wall-seconds, so eighteen would be an hour of wall clock for a
// measurement that is complete in minutes — and a probe nobody can afford to
// run is a probe that does not get run.
const OBSERVE = 6;      // sim-seconds
const t0 = await p.evaluate(() => window.__matchState().t);
let guard = 0, lastScore = -1, stale = 0;
while (guard++ < 5000) {
  const st = await p.evaluate(() => ({ t: window.__matchState().t, s: window.__matchState().score }));
  if (st.t - t0 >= OBSERVE) break;
  if (st.s === lastScore) stale++; else { stale = 0; lastScore = st.s; }
  if (stale >= 6) {
    stale = 0;
    await p.evaluate(() => { const v = window.__voidState();
      const a = Math.random() * Math.PI * 2;
      window.__warpVoid(v.x + Math.cos(a) * 70, v.z + Math.sin(a) * 70); });
    await p.waitForTimeout(250);
  }
  await p.evaluate(() => window.__eatNearest(0.05));
  await p.waitForTimeout(150);
}
await p.waitForTimeout(3000);

const out = await p.evaluate(() => window.__bw);
// …and the game's own ledger, so a low write count can be told apart from a
// hook that stopped seeing writes. pays >> hits means the hook is broken;
// pays == hits means the bar genuinely stepped that few times.
const led = await p.evaluate(() => (window.__barDbg ? window.__barDbg() : null));
console.log(`ledger: ${led ? JSON.stringify(led) : '(no __barDbg on this build)'}`);
await b.close();

// ── WHAT THIS CAN AND CANNOT GRADE ────────────────────────────────────────
// The question is whether the bar's travel arrives in STEPS a child can see or
// in sub-pixel creep. It is NOT whether there is a lot of travel — that is the
// growth law's business. Measured over one drive: score 145 -> 3,528 moved the
// bar 0% -> 16.83%, and two payouts was all there was TO pay. A probe demanding
// a minimum number of WRITES therefore fails the bar for the LAW's behaviour,
// which is how this one read FAIL through two real bug fixes that had nothing
// to do with it.
//
// AND DO NOT READ THAT DRIVE AS "EATING BARELY MOVES THE BAR", which is what it
// was first taken to mean and which manufactured a phase of work that the
// evidence does not support. It was sampled in the first FIVE SECONDS of a
// match, where the law's allowance is 1.14 units BY DESIGN — a bar reading ~16%
// there is correct, because the void genuinely is that small. Simulated across
// a full 180s match against the law as shipped, and validated against the one
// figure prototype3d.ts records for itself (par run at 60s, lawCap 3.06 and raw
// floor 4.18; the simulation gives 3.06 and 4.17):
//
//     0.5 bites/s, small meals  ->  radius 1.84, score    981
//     2   bites/s, small meals  ->  radius 2.88, score  3,402
//     6   bites/s, small meals  ->  radius 4.93, score 10,359
//     6   bites/s, big meals    ->  radius 6.76, score 19,926
//
// A 3.7x spread in final size. Eating differentiates strongly over a match. The
// reason THIS probe's sample is tiny is the HARDWARE — 180 match-seconds is
// over an hour of wall clock at one frame per two seconds — not the design.
//
// So: the ledger rules out a dead hook, and the verdict is the SHARE.
const pays = (led && led.pays) || 0;
if (!out) fail('no width writes were captured at all — the hook did not attach');
if (pays === 0) fail('the bar never paid out once; nothing was eaten, or the payout path is broken');
if (out.hits.length + 1 < pays) fail(`the ledger paid ${pays} time(s) but the hook saw only ${out.hits.length} width write(s) — the probe's hook is broken, not the bar`);
const trackW = out.w;
let steps = 0, creeps = 0, stepPx = 0, creepPx = 0, biggest = 0;
for (let i = 1; i < out.hits.length; i++) {
  const d = Math.abs(out.hits[i].v - out.hits[i - 1].v) / 100 * trackW;
  if (d < 0.01) continue;
  if (d >= 1.5) { steps++; stepPx += d; if (d > biggest) biggest = d; }
  else { creeps++; creepPx += d; }
}
const total = stepPx + creepPx;
const share = total > 0 ? stepPx / total : 0;
console.log(`${WORLD}: track ${trackW.toFixed(1)}px, ${out.hits.length} width writes over ${(out.hits[out.hits.length - 1].t - out.hits[0].t).toFixed(1)} match-seconds`);
console.log(`  steps  (>= 1.5px)   ${String(steps).padStart(4)}   ${stepPx.toFixed(1).padStart(7)}px travelled, biggest ${biggest.toFixed(1)}px`);
console.log(`  creep  (<  1.5px)   ${String(creeps).padStart(4)}   ${creepPx.toFixed(1).padStart(7)}px travelled`);
console.log(`  share of travel arriving in steps: ${(share * 100).toFixed(1)}%  (bar ${(SHARE * 100).toFixed(0)}%)`);
console.log(`  ledger: ${pays} payout(s) for ${total.toFixed(1)}px of total travel`);
if (total < 2) fail(`the bar moved ${total.toFixed(1)}px in the whole window — too little to grade either way`);
if (share < SHARE) {
  console.log('');
  fail(`only ${(share * 100).toFixed(1)}% of the bar's travel arrived in steps a child can see — the rest is `
    + `${creeps} sub-pixel slivers. The bar is being driven by the clock, not by eating.`);
}
console.log(`\nPASS — ${(share * 100).toFixed(1)}% of the bar's travel arrives in visible steps, biggest ${biggest.toFixed(1)}px.`);
console.log(`       (How MUCH travel there is is the growth law's business, not this probe's: ${pays} payout(s)`);
console.log(`       moved it ${total.toFixed(1)}px here, because the law discards most of what a child eats.)`);
