// HOW MANY RINGS DOES A CHILD ACTUALLY SEE? — the ring census.
//
//   node qa/ringcount.mjs [port] [world] [matchSeconds]
//
// The owner: "When you eat or get combos or something you keep seeing rings
// pop up behind you. That's annoying."
//
// There are twenty-eight fx.ring call sites. Reading them tells you nothing
// about which ones a child MEETS — the countdown ring fires ten times a match
// and the fever-eat ring fires once per swallow inside a beat window, and no
// amount of staring at the source separates those. So this counts.
//
// ── WHAT IT MEASURES, AND WHY THAT AND NOT SOMETHING EASIER ──────────────
// Two numbers, because the complaint has two halves.
//
//   RATE, per minute of MATCH time. Not wall time: under the software renderer
//   the match clock runs about 14x slower (qa/_clockrate.mjs), so a wall-clock
//   rate here would read about a fourteenth of the truth and every ring in the
//   game would look fine.
//
//   AWAY, the share of rings that land somewhere other than on the void. That
//   is the literal complaint — "behind you". A ring that beats out of the void
//   is the void doing something; a ring left at the corpse of a prop you have
//   already swum past is litter on the floor behind a child.
//
// It buckets by CALL SITE, read off the stack, and then names each bucket by
// slicing the shipped bundle at that column. It does not carry its own copy of
// the call list — if a site moves, the slice moves with it.
import { chromium } from 'playwright';
import { readFileSync } from 'fs';

const PORT = process.argv[2] || '4177';
const WORLD = process.argv[3] || 'maple';
const SPAN = Number(process.argv[4] || 100);   // match-seconds to sample
// ── AND WHERE THE SAMPLE STARTS IS NOT A DETAIL ──────────────────────────
// The beat windows are authored at roughly 30 / 66 / 110 / 148 seconds and run
// 14-32 seconds each, and the fever-eat ring — the site this probe was written
// to weigh — fires ONLY inside them. A sample that starts at t=6 and runs 25
// seconds sees no fever at all and reports the game as calm. Start late enough
// to land inside a window, or the census is of a different game.
const START = Number(process.argv[5] || 24);

const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
// ── A SMALL VIEWPORT, AND WHY THAT IS NOT CHEATING ───────────────────────
// The match clock advances by `dt` per FRAME and `dt` is capped at 0.05
// (prototype3d.ts), so match time runs at framerate * 0.05 — which is the whole
// of the measured ~14x slowdown under the software renderer. Fewer pixels means
// more frames means a faster clock, with every piece of game logic advancing by
// exactly the same dt it always did. Nothing about the rates below changes.
//
// `?fast` would NOT be safe here and is deliberately not used: clockSpeed only
// scales matchClock, while the player still moves at wall-frame speed, so at
// clockSpeed 6 he covers a sixth of the ground per match-second and eats a
// sixth as much. That would report the per-eat rings as six times rarer than
// they are — a confident number about a game nobody plays.
const p = await b.newPage({ viewport: { width: 320, height: 640 }, deviceScaleFactor: 1 });
await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString());
  localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder,skylark');
} catch {} });
await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.waitForSelector('#btnPlay', { state: 'visible', timeout: 400000 });
await p.evaluate(() => document.getElementById('btnPlay').click());
await p.waitForSelector(`#worldRow .wCard[data-world="${WORLD}"]`, { state: 'visible', timeout: 400000 });
await p.evaluate((w) => document.querySelector(`#worldRow .wCard[data-world="${w}"]`).click(), WORLD);
await p.waitForFunction((t) => (window.__matchState?.().t ?? 0) > t, START, { timeout: 400000 });

// WRAP THE REAL RING. __fx is the live juice kit, not a copy, so every site
// that a child can actually reach lands here.
//
// CORRECTION to this comment's first version, which said "including defense.ts,
// which is handed the same object". It is not: `defense.ts` is imported by
// nothing (`grep -rn "from './defense'" src/` is empty), and prototype3d.ts
// records the removal — "NO DEFENCE LAYER … Removed outright rather than
// re-themed." Its ring cannot fire. Nor can the three in `fireGulp` and
// `fireCollapse`, which early-return on `POWERS_ON === false`.
//
// So: 28 lines carrying 30 call expressions, of which 4 are unreachable and 26
// can be met. That is the number this probe is measuring against, and it is
// stated here rather than trusted, because the count in the first draft was
// wrong in the direction that flatters the game.
//
// Throw rather than measure nothing if the hook is gone.
await p.evaluate(() => {
  if (!window.__fx || typeof window.__fx.ring !== 'function') throw new Error('__fx.ring is gone — this probe measures nothing');
  const orig = window.__fx.ring.bind(window.__fx);
  window.__ringLog = [];
  window.__fx.ring = (x, z, color, maxR, dur) => {
    const st = (new Error().stack || '').split('\n');
    // frame 0 is "Error", frame 1 is this wrapper, frame 2 is the caller
    const site = (st[2] || st[1] || '?').match(/(\d+:\d+)\)?\s*$/)?.[1] ?? '?';
    const v = window.__voidState();
    window.__ringLog.push({ site, away: Math.hypot(x - v.x, z - v.z) > v.r, r: maxR, c: color });
    orig(x, z, color, maxR, dur);
  };
});

// Play like a player: chase the nearest swallowable thing. A parked void eats
// nothing and would measure a beautiful zero for entirely the wrong reason.
await p.evaluate(() => {
  const cv = document.querySelector('canvas');
  const cx = innerWidth / 2, cy = innerHeight / 2;
  cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: cx, clientY: cy, bubbles: true }));
  const tick = () => {
    const vs = window.__voidState();
    let best = null, bd = 1e9;
    for (const e of window.__edibles) {
      if (e.eaten || !e.mesh?.visible || e.radius > vs.r * 0.92) continue;
      const dx = e.mesh.position.x - vs.x, dz = e.mesh.position.z - vs.z;
      const d = dx * dx + dz * dz;
      if (d < bd) { bd = d; best = { dx, dz }; }
    }
    if (best) {
      const m = Math.hypot(best.dx, best.dz) || 1;
      dispatchEvent(new PointerEvent('pointermove', { pointerId: 1,
        clientX: cx + best.dx / m * 110, clientY: cy + best.dz / m * 110, bubbles: true }));
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});

const t0 = await p.evaluate(() => { window.__ringLog.length = 0; return window.__matchState().t; });
await p.waitForFunction((t) => (window.__matchState?.().t ?? 0) >= t, t0 + SPAN,
  { timeout: 2400000, polling: 500 });
const t1 = await p.evaluate(() => window.__matchState().t);
const log = await p.evaluate(() => window.__ringLog);
const eaten = await p.evaluate(() => window.__matchState().score);
const bundle = await p.evaluate(() =>
  [...document.querySelectorAll('script[src]')].map((s) => s.src).find((s) => /assets\/.*\.js$/.test(s)) ?? '');
await b.close();

if (!log.length) { console.log('FAIL — zero rings in the whole sample. The wrap did not take.'); process.exit(1); }

// NAME EACH SITE by slicing the shipped bundle at the column the stack gave.
// This is why there is no hard-coded call list: the names come from the build
// under test, so a moved site cannot be reported under its old description.
let src = '';
try { src = readFileSync(new URL(bundle).pathname.replace(/^\//, 'dist/'), 'utf8'); } catch { /* named by colour instead */ }
const srcLines = src.split('\n');

const mins = (t1 - t0) / 60;
const by = new Map();
for (const r of log) {
  const k = r.site;
  const e = by.get(k) ?? { n: 0, away: 0, rs: [], cs: new Set() };
  e.n++; if (r.away) e.away++; e.rs.push(r.r); e.cs.add(r.c);
  by.set(k, e);
}
const rows = [...by.entries()].map(([site, e]) => {
  // NAME THE SITE by slicing the shipped bundle at the line and column the
  // stack gave. The first version sliced the WHOLE FILE at the column, which on
  // a minified bundle — one enormous line — landed in the middle of three's
  // shader source and named every ring after a fragment of the iridescence
  // chunk. Line first, then column within it.
  let name = '';
  if (src) {
    const [ln, col] = site.split(':').map(Number);
    const line = srcLines[ln - 1];
    if (line && col > 0) name = line.slice(Math.max(0, col - 96), col).replace(/\s+/g, ' ').slice(-88);
  }
  return { site, perMin: e.n / mins, n: e.n, awayPct: 100 * e.away / e.n,
    rMed: e.rs.sort((a, x) => a - x)[e.rs.length >> 1], name };
}).sort((a, x) => x.perMin - a.perMin);

const total = log.length / mins;
const away = log.filter((r) => r.away).length / mins;
console.log(`\n${WORLD} — ${log.length} rings over ${(t1 - t0).toFixed(0)}s of match `
  + `(t=${t0.toFixed(0)} to ${t1.toFixed(0)}), score ${eaten}\n`);
console.log(`  ${'rings/min'.padStart(9)}  ${'away'.padStart(5)}  ${'r'.padStart(5)}  site`);
for (const r of rows) {
  console.log(`  ${r.perMin.toFixed(1).padStart(9)}  ${r.awayPct.toFixed(0).padStart(4)}%  ${String(r.rMed ?? '').padStart(5)}  ${r.site}`);
  if (r.name) console.log(`             ${r.name}`);
}
console.log(`\n  TOTAL ${total.toFixed(1)}/min, of which ${away.toFixed(1)}/min land away from the void.`);
