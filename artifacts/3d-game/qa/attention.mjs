// ATTENTION — how much transient text the game puts in front of a child, and
// how much of it is the SAME text twice.
//
//   node qa/attention.mjs [port] [world] [observeSeconds]
//
// WHY THE HOOKS ARE OWN-PROPERTY SETTERS AND NOT A MutationObserver.
// bubbles.float() does `f.el.textContent = text` (proto3d/bubbles.ts:354) and
// showNews()/paintBanner() do `el.innerHTML = …` (prototype3d.ts:6556, :5442).
// A MutationObserver coalesces two writes made in the same synchronous frame —
// which is EXACTLY the shape of both defects here — and delivers its records in
// one microtask batch, so every record in the batch would read the same
// __matchState().t. An own-property setter fires inline, once per write, with
// the real clock. qa/_rf_banner.mjs established the trick; this extends it to
// #news and to the fourteen .vf floater nodes.
//
// WHY DWELL IS A CONSTANT AND NOT getComputedStyle.
// Under the OS reduced-motion catch-all (index.html:2593) every
// animation-duration is 0.01ms, so a card that measured its own animation would
// read as already finished. The three durations are read off the stylesheet by
// hand: bnr 2.4s (index.html:448), ev 1.8s (:943), news 5.6s (:396), and the
// LEGIBLE part of each is its last opacity:1 keyframe — bnr 80% = 1.92s,
// news 84% = 4.70s. This probe does NOT emulate reduced motion.
//
// WHY THE ASSERTS ARE CUMULATIVE AND NOT PER-SAMPLE.
// "Cluttered" is a property of a whole match, not of a frame. Counter 2 is an
// occupancy integral over the observation window and counter 5 is a sum; a
// per-sample assert on a 1-2fps software renderer reads whatever the last style
// recalc happened to leave and passes green on a broken build.
import { chromium } from 'playwright';
import { enterMatch } from './_enter.mjs';

const PORT = process.argv[2] || '4177';
const WORLD = process.argv[3] || 'maple';
const OBS = Number(process.argv[4] || 140);   // match-seconds observed

// ── the bars ────────────────────────────────────────────────────────────────
const MAX_DUP = 0;        // identical floater text twice inside DUP_WIN: never
const DUP_WIN = 0.20;     // s — EAT_FLOAT_WINDOW is 0.14 (prototype3d.ts:7929)
const MAX_NEWS_DUTY = 0.20;   // fraction of the window with #news legible
const NEWS_FULL = 5.6, NEWS_READ = 4.70;
const BNR_FULL = 2.4, BNR_READ = 1.92;

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidFirstNom', '1'); localStorage.setItem('voidMute', '1');
  localStorage.setItem('voidBookSeen', '1');   // the once-per-LIFETIME scrapbook card is not ordinary play
  localStorage.setItem('voidDailyLast', new Date().toDateString());
  localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder,skylark');
} catch {} });
await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => {
  if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
await enterMatch(p, WORLD);
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout: 400000 });
// DOM only from here, so matchClock runs at wall speed (qa/_rf_banner.mjs:36)
await p.evaluate(() => { window.__renderer.render = () => {}; });

await p.evaluate(() => {
  const T = () => window.__matchState?.().t ?? -1;
  const strip = (v) => String(v).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

  // ── floaters: one record per bubbles.float() call, inline ────────────────
  window.__fl = [];
  const TD = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent');
  for (const el of document.querySelectorAll('.vf')) {
    Object.defineProperty(el, 'textContent', {
      configurable: true,
      get() { return TD.get.call(this); },
      set(v) { window.__fl.push({ t: +T().toFixed(3), txt: String(v) }); TD.set.call(this, v); },
    });
  }

  // ── #news and #banner: one record per paint, inline ──────────────────────
  const HD = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
  const tap = (el, sink) => Object.defineProperty(el, 'innerHTML', {
    configurable: true,
    get() { return HD.get.call(this); },
    set(v) { sink.push({ t: +T().toFixed(3), txt: strip(v).slice(0, 80) }); HD.set.call(this, v); },
  });
  window.__np = []; tap(document.getElementById('news'), window.__np);
  window.__bp = []; tap(document.getElementById('banner'), window.__bp);

  // ── #evolve paints via .big's textContent, then the class restart ────────
  window.__ep = [];
  const ev = document.getElementById('evolve');
  new MutationObserver(() => { if (ev.classList.contains('show')) {
    const t = +T().toFixed(3);
    if (!window.__ep.length || t - window.__ep[window.__ep.length - 1].t > 0.05)
      window.__ep.push({ t, txt: (ev.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40) });
  } }).observe(ev, { attributes: true, attributeFilter: ['class'] });

  // ── drive: greedy nearest edible (the qa/_rf_banner.mjs baseline bot) ─────
  const cv = document.querySelector('canvas');
  const cx = innerWidth / 2, cy = innerHeight / 2;
  cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: cx, clientY: cy, bubbles: true }));
  const tick = () => {
    const vs = window.__voidState(); let best = null, bd = 1e9;
    for (const e of window.__edibles) {
      if (e.eaten || !e.mesh?.visible || e.radius > vs.r * 0.92) continue;
      const dx = e.mesh.position.x - vs.x, dz = e.mesh.position.z - vs.z;
      const d = dx * dx + dz * dz; if (d < bd) { bd = d; best = { dx, dz }; }
    }
    if (best) { const m = Math.hypot(best.dx, best.dz) || 1;
      dispatchEvent(new PointerEvent('pointermove', { pointerId: 1,
        clientX: cx + best.dx / m * 110, clientY: cy + best.dz / m * 110, bubbles: true })); }
    requestAnimationFrame(tick);
  };
  tick();
  window.__t0 = T();
});

// WHY THIS IS A POLL LOOP AND NOT waitForFunction.
// dt is clamped to 0.05 (prototype3d.ts:12152) and matchClock steps by dt per
// FRAME (:12214, clockSpeed 1 at :5592), so with the software renderer running
// the loop at 1-3fps GAME TIME ADVANCES 6-12x SLOWER THAN WALL TIME. A fixed
// waitForFunction on a match-second target throws before it is reached. Do NOT
// reach for ?fast: that sets clockSpeed to 6 (:5592) and scales matchClock
// ALONE, so a 5.6s CSS card would occupy 33.6 match-seconds and every duty
// figure here would be six times wrong.
const BUDGET = Number(process.env.ATT_BUDGET || 1500) * 1000;   // wall ms
const MIN_WIN = 55;       // match-seconds below which the run is inconclusive
const wall0 = Date.now();
let got = 0;
while (Date.now() - wall0 < BUDGET) {
  got = await p.evaluate(() => (window.__matchState?.().t ?? 0) - window.__t0);
  if (got >= OBS) break;
  await p.waitForTimeout(5000);
}
console.log(`observed ${got.toFixed(1)} of ${OBS} match-s in ${((Date.now() - wall0) / 1000).toFixed(0)} wall-s`
  + `  (game time ran at ${(got / ((Date.now() - wall0) / 1000)).toFixed(2)}x wall)`);

const R = await p.evaluate(() => ({ fl: window.__fl, np: window.__np, bp: window.__bp,
  ep: window.__ep, t0: window.__t0, t1: window.__matchState().t }));
await b.close();

// ── counters ────────────────────────────────────────────────────────────────
const win = R.t1 - R.t0;

// 1. THE SAME SCORE NUMBER PAINTED TWICE.
//    Keyed on IDENTICAL TEXT, not on /^\+\d/, and PLAIN numbers only.
//    · not /^\+\d/, because a coin bite legitimately paints `+3✦` (the wallet)
//      and `+27` (the score) 0.14s apart — two different facts, and a regex
//      counter would fail the FIXED build on them.
//    · plain only (/^\+[\d,]+$/, no ✦), because two coin props of equal value
//      eaten in the same beat paint `+5✦` twice and that is not the defect
//      either — MEASURED: `+5✦` was in the first five duplicates of the very
//      first baseline run. Coin duplicates are reported below, not gated.
//    After the fix the only plain number left is the coalesced emit at
//    prototype3d.ts:13735, which cannot fire twice inside EAT_FLOAT_WINDOW.
const PLAIN = /^\+[\d,]+$/;
const dupIn = (pred) => {
  const L = R.fl.filter((r) => pred(r.txt)), out = [];
  for (let i = 0; i < L.length; i++)
    for (let j = i + 1; j < L.length && L[j].t - L[i].t <= DUP_WIN; j++)
      if (L[j].txt === L[i].txt) { out.push({ t: L[i].t, txt: L[i].txt }); break; }
  return out;
};
const dup = dupIn((s) => PLAIN.test(s));
const dupCoin = dupIn((s) => /^\+[\d,]+✦$/.test(s));

// 2. #news occupancy — CUMULATIVE. A paint owns [t, t+NEWS_READ] but is
//    truncated by the next paint on the same element (showNews restarts the
//    animation unconditionally at prototype3d.ts:6558).
const occupancy = (log, read, end) => log.reduce((s, r, i) => {
  const next = i + 1 < log.length ? log[i + 1].t : Infinity;
  return s + Math.max(0, Math.min(r.t + read, next, end) - r.t);
}, 0);
const newsSec = occupancy(R.np, NEWS_READ, R.t1);
const newsDuty = newsSec / win;

// 3. a #banner card painted while a #news card was still legible (reported,
//    not gated: the fix makes NEWS wait for BANNER, not the reverse)
let onNews = 0;
for (const bp of R.bp)
  if (R.np.some((n, i) => bp.t >= n.t && bp.t < Math.min(n.t + NEWS_READ,
    i + 1 < R.np.length ? R.np[i + 1].t : Infinity))) onNews++;

// 4. the dropped quest card — read off the #banner paint log, no new hook.
//    CONDITIONAL: the daily board has to clear for the triple to fire at all.
const sawDone = R.bp.some((r) => /QUEST DONE/i.test(r.txt));
const sawClear = R.bp.some((r) => /ALL QUESTS CLEAR/i.test(r.txt));
const questVerdict = !sawDone ? 'not-exercised' : sawClear ? 'ok' : 'DROPPED';

// 5. text-seconds — the number that maps to the word "cluttered"
const chars = (s) => s.replace(/\s+/g, ' ').trim().length;
const textSec = (log, read, end) => log.reduce((s, r, i) => {
  const next = i + 1 < log.length ? log[i + 1].t : Infinity;
  return s + chars(r.txt) * Math.max(0, Math.min(r.t + read, next, end) - r.t);
}, 0);
const TS = textSec(R.np, NEWS_READ, R.t1) + textSec(R.bp, BNR_READ, R.t1)
  + R.fl.reduce((s, r) => s + chars(r.txt) * 0.9, 0);

const fails = [];
if (win < MIN_WIN) fails.push(`INCONCLUSIVE — only ${win.toFixed(1)} match-s observed, need ${MIN_WIN}`);
if (dup.length > MAX_DUP) fails.push(`${dup.length} duplicate floater(s) inside ${DUP_WIN}s (bar ${MAX_DUP})`);
if (newsDuty > MAX_NEWS_DUTY) fails.push(`#news legible ${(newsDuty * 100).toFixed(1)}% of the window (bar ${(MAX_NEWS_DUTY * 100).toFixed(0)}%)`);
if (questVerdict === 'DROPPED') fails.push('"ALL QUESTS CLEAR" never reached the screen after "QUEST DONE"');

if (process.env.ATT_DUMP) { const fs = await import('node:fs');
  fs.writeFileSync(process.env.ATT_DUMP, JSON.stringify(R)); }
console.log(`window ${win.toFixed(1)} match-s  ${WORLD}`);
console.log(`  floaters            ${R.fl.length}  (${dup.length} duplicate score number(s), e.g. ${dup.slice(0, 6).map((d) => d.txt).join(' ')})`);
console.log(`  coin doubles        ${dupCoin.length}  (diagnostic only — two coin props of equal value, not the defect)`);
console.log(`  #news paints        ${R.np.length}  legible ${newsSec.toFixed(1)}s = ${(newsDuty * 100).toFixed(1)}% duty`);
console.log(`  #banner paints      ${R.bp.length}  (${onNews} landed on a legible news card)`);
console.log(`  #evolve paints      ${R.ep.length}`);
console.log(`  quest triple        ${questVerdict}`);
console.log(`  TEXT-SECONDS        ${TS.toFixed(0)} char-s`);
if (fails.length) { process.exitCode = 1; console.log(`FAIL — attention: ${fails.join('; ')}`); }
else console.log('PASS — attention: no duplicate floaters, the news card is an event, the quest card reaches the screen');
