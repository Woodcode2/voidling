// AUDIT — THE CROWD'S RECENCY GUARD, settled on the function instead of on a
// match. The end-to-end version of this question was measured twice and said
// nothing: 9 and 16 repeats against a 21/11/14 baseline is noise, because one
// match draws ~100 lines across ~112 pools and no single pool is sampled enough
// times to have a distribution. So drive the guard directly, a hundred thousand
// times, against the pool sizes that actually ship.
//
// The shipped pool sizes, counted out of life.ts: 112 dialogue pools, min 2,
// median 6, max 22 (the 81 is a non-dialogue array). The bulk sit at 3-8, which
// is exactly the band where uniform sampling sounds broken — draw twenty-five
// times from six lines and you will hear one of them twice in a row.
//
// THIS DRIVES THE SHIPPED FUNCTION, not a copy of it. window.__pickFresh is the
// same binding life.ts calls; a reimplementation here would prove nothing, which
// is the trap the previous attempt fell into.
//
// FOUR NUMBERS, and the last one is the one that could have gone wrong:
//   immediate  — draws identical to the one before. The worst thing a crowd can
//                do; a child hears it every time.
//   inWindow   — draws that repeat anything inside the guard's own ring. This is
//                what the guard exists to drive to zero.
//   minGap     — closest recurrence of any line, in draws.
//   bias       — max deviation from uniform frequency. A recency guard BUYS its
//                freshness by distorting the distribution, and if it distorts it
//                far enough the pool develops favourites, which is a different
//                and worse bug than the one being fixed. Reported for both arms
//                so the guard's skew can be read against sampling noise.
import { chromium } from 'playwright';

const DRAWS = Number(process.argv[3] || 100000);
const SIZES = (process.argv[2] || '2,3,4,5,6,7,8,10,12,14,22')
  .split(',').map(Number);

const b = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'],
});
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
await p.goto('http://127.0.0.1:4177/?w=maple', { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__pickFresh, null, { timeout: 400000 });

const rows = await p.evaluate(({ SIZES, DRAWS }) => {
  // one run of `draws` picks from a pool of `n`, using either the shipped guard
  // or plain uniform sampling. The pool array identity is held stable across the
  // whole run because that is how life.ts holds it — the guard's ring is kept in
  // a WeakMap keyed on the array object, so a fresh array every call would
  // silently disable it. (That failure mode is the reason this probe exists.)
  function run(n, draws, guarded) {
    const pool = Array.from({ length: n }, (_, i) => i);
    const cap = Math.max(1, Math.floor(n * 0.6));   // the guard's own ring length
    const seen = [];
    const freq = new Array(n).fill(0);
    const lastAt = new Array(n).fill(-1);
    let immediate = 0, inWindow = 0, minGap = Infinity, gapSum = 0, gapN = 0;
    for (let i = 0; i < draws; i++) {
      const v = guarded
        ? window.__pickFresh(pool)
        : pool[Math.floor(Math.random() * pool.length)];
      freq[v]++;
      if (i > 0 && v === seen[seen.length - 1]) immediate++;
      // did this repeat anything inside the guard's own memory window?
      for (let k = Math.max(0, seen.length - cap); k < seen.length; k++)
        if (seen[k] === v) { inWindow++; break; }
      if (lastAt[v] >= 0) { const g = i - lastAt[v]; if (g < minGap) minGap = g; gapSum += g; gapN++; }
      lastAt[v] = i;
      seen.push(v);
      if (seen.length > cap + 2) seen.shift();   // only the window is ever read
    }
    // `seen` is trimmed, so rebuild the immediate/window counts' denominators
    const ideal = draws / n;
    const bias = Math.max(...freq.map(f => Math.abs(f - ideal))) / ideal;
    return {
      immediate: immediate / (draws - 1),
      inWindow: inWindow / draws,
      minGap: minGap === Infinity ? null : minGap,
      meanGap: gapN ? gapSum / gapN : null,
      bias,
      cap,
    };
  }
  return SIZES.map(n => ({ n, guard: run(n, DRAWS, true), uni: run(n, DRAWS, false) }));
}, { SIZES, DRAWS });

const pct = v => (v * 100).toFixed(2).padStart(6) + '%';
console.log(`\n  THE CROWD'S RECENCY GUARD — ${DRAWS.toLocaleString()} draws per pool size`);
console.log('  (shipped window.__pickFresh vs plain uniform sampling)\n');
console.log('   pool  ring |      immediate repeat |        repeat in window |   min gap  |      bias');
console.log('    n    cap  |   guard      uniform  |    guard       uniform  | guard uni  |  guard   uni');
console.log('  ' + '-'.repeat(84));
for (const r of rows) {
  console.log(
    `  ${String(r.n).padStart(4)} ${String(r.guard.cap).padStart(4)}  |` +
    ` ${pct(r.guard.immediate)} ${pct(r.uni.immediate)}  |` +
    `  ${pct(r.guard.inWindow)} ${pct(r.uni.inWindow)}  |` +
    ` ${String(r.guard.minGap).padStart(4)} ${String(r.uni.minGap).padStart(4)}  |` +
    ` ${(r.guard.bias * 100).toFixed(1).padStart(5)}% ${(r.uni.bias * 100).toFixed(1).padStart(5)}%`);
}

// ── the verdicts, stated as pass/fail so this cannot be read hopefully ────────
const med = rows.find(r => r.n === 6) || rows[0];
console.log('\n  AT THE MEDIAN SHIPPED POOL (n=6):');
console.log(`    immediate repeats  ${pct(med.guard.immediate)} guarded vs ${pct(med.uni.immediate)} uniform` +
  `  — ${(med.uni.immediate / Math.max(med.guard.immediate, 1e-9)).toFixed(0)}x fewer`);
console.log(`    repeats in window  ${pct(med.guard.inWindow)} guarded vs ${pct(med.uni.inWindow)} uniform`);

const worstBias = rows.reduce((a, r) => Math.max(a, r.guard.bias), 0);
const uniBias = rows.reduce((a, r) => Math.max(a, r.uni.bias), 0);
const fails = [];
for (const r of rows) {
  if (r.guard.immediate >= r.uni.immediate) fails.push(`n=${r.n}: guard does not beat uniform on immediate repeats`);
  if (r.guard.inWindow >= r.uni.inWindow) fails.push(`n=${r.n}: guard does not beat uniform inside its own window`);
}
// a guard that is fresher but lopsided has traded one defect for another. The
// uniform arm's own deviation at this sample count is the only fair yardstick.
if (worstBias > Math.max(0.05, uniBias * 3)) fails.push(
  `distribution skew ${(worstBias * 100).toFixed(1)}% vs ${(uniBias * 100).toFixed(1)}% sampling noise — the guard has favourites`);

console.log('\n  ' + (fails.length ? 'FAIL\n    ' + fails.join('\n    ') : 'PASS — guard beats uniform at every shipped pool size, and stays flat'));
console.log();
await b.close();
