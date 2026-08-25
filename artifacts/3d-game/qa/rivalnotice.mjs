// DO THE OTHER VOIDS EXIST? — the presence probe.
//
//   node qa/rivalnotice.mjs [port] [worlds...]
//
// The owner: "It seems only 1 void is ever hostile. I don't want to create this
// shit show of every void attacking you. But there should be some sense of like
// I need to be on my toes somewhat. Again a kids game right. The other voids
// are just there."
//
// He is describing the code exactly. rivals.ts gates the whole charge state
// machine on `if (isHunter && hunting)`, so one void — the BULLY — telegraphs
// and lunges, and the other four graze props and ignore you. Every one of them
// can already BITE you (the gate is `rv.r > pr * 1.2`, not "is this the
// bully"), so they have teeth nobody believes in.
//
// The answer is a LOOK, not a second hunter: a rival bigger than you that finds
// you close by stops what it is doing, holds for a beat, says one line in its
// own voice and gets one ring in its own colour. No pursuit, no charge.
//
// ── WHY THIS NEEDS A BAR AT BOTH ENDS ────────────────────────────────────
// This is the one change in the game that can fail in TWO directions, and the
// owner named both in the same breath. Too few and nothing changed — the other
// voids are still furniture. Too many and it is the shit show he explicitly
// does not want, in a game for six-year-olds.
//
// So the bar is a band, per minute of MATCH time, not wall time (the match
// clock runs ~14x slower under the software renderer — qa/_clockrate.mjs).
import { chromium } from 'playwright';

const PORT = process.argv[2] || '4177';
const WORLDS = process.argv.slice(3).length ? process.argv.slice(3) : ['maple', 'pirate'];

const MIN_PER_MIN = 0.8;   // below this the family is still furniture
const MAX_PER_MIN = 7;     // above this a child is being stared at, not warned
const SAMPLE_MATCH_SECONDS = 45;

const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });

const rows = [];
for (const wid of WORLDS) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString());
    localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder');
  } catch {} });
  await p.goto(`http://127.0.0.1:${PORT}/?w=${wid}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.waitForSelector('#btnPlay', { state: 'visible', timeout: 400000 });
  await p.evaluate(() => document.getElementById('btnPlay').click());
  await p.waitForSelector(`#worldRow .wCard[data-world="${wid}"]`, { state: 'visible', timeout: 400000 });
  await p.evaluate((w) => document.querySelector(`#worldRow .wCard[data-world="${w}"]`).click(), wid);
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 6, null, { timeout: 400000 });

  // Play like a player: chase the nearest thing you can swallow. A parked void
  // never gets close to anybody and would measure zero for the wrong reason.
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

  // ── SAMPLE THE GATE, NOT JUST THE OUTCOME ────────────────────────────────
  // The first version of this probe reported "NaN looks" and left me guessing
  // at four different causes for twenty minutes. A count on its own cannot tell
  // "the look is throttled correctly" from "the look can never fire" — and
  // those want opposite fixes. So it samples the CONDITIONS too, off the real
  // rival list, every half second of match time:
  //
  //   OPPORTUNITY — the share of samples where at least one non-hunter rival
  //   satisfies the whole gate (bigger by 1.2x, inside 62 units, outside its
  //   own radius). If that is near zero the gate is unreachable and no amount
  //   of cooldown tuning matters. If it is high and the rate is still zero,
  //   the throttle is the problem instead.
  const t0 = await p.evaluate(() => window.__matchState().t);
  const n0 = await p.evaluate(() => window.__matchState().ev.notices);
  if (!Number.isFinite(n0)) {
    console.log(`FAIL — __matchState().ev.notices is ${JSON.stringify(n0)}, not a number. `
      + `The counter this probe reads has moved or was never initialised; every rate below `
      + `would be fiction.`);
    process.exit(2);
  }
  // …and it DECOMPOSES the conjunction, because the first run of this reported
  // "gate open 0% of the time" and left me with two incompatible readings and
  // no way to choose: nobody is ever big enough, or nobody is ever close
  // enough. Those want opposite repairs — one softens the size ratio, the other
  // widens the radius — so a conjunction that only reports its AND is a
  // measurement that stops exactly where the question starts. Each term is
  // counted on its own, plus the best value seen for each, so a near miss is
  // visible as a near miss rather than as a zero.
  await p.evaluate(() => {
    window.__opp = { n: 0, all: 0, joined: 0, big: 0, near: 0, bigAndNear: 0,
      maxRatio: 0, minDist: 1e9 };
    window.__oppTick = setInterval(() => {
      const v = window.__voidState(); const st = window.__matchState();
      const o = window.__opp; o.n++;
      const fam = st.rivals.filter((r) => !r.hunt);
      if (fam.some((r) => r.joined)) o.joined++;
      const live = fam.filter((r) => r.joined);
      for (const r of live) {
        const d = Math.hypot(r.x - v.x, r.z - v.z);
        o.maxRatio = Math.max(o.maxRatio, r.r / v.r);
        o.minDist = Math.min(o.minDist, d);
      }
      if (live.some((r) => r.r > v.r * 1.2)) o.big++;
      if (live.some((r) => Math.hypot(r.x - v.x, r.z - v.z) < 62)) o.near++;
      if (live.some((r) => r.r > v.r * 1.2 && Math.hypot(r.x - v.x, r.z - v.z) < 62)) o.bigAndNear++;
      if (live.some((r) => r.r > v.r * 1.2 && Math.hypot(r.x - v.x, r.z - v.z) < 62
        && Math.hypot(r.x - v.x, r.z - v.z) > r.r * 0.9)) o.all++;
    }, 500);
  });
  await p.waitForFunction((t) => (window.__matchState?.().t ?? 0) >= t, t0 + SAMPLE_MATCH_SECONDS,
    { timeout: 1500000, polling: 400 });
  const t1 = await p.evaluate(() => window.__matchState().t);
  const r = await p.evaluate(() => window.__matchState().ev);
  const o = await p.evaluate(() => { clearInterval(window.__oppTick); return window.__opp; });
  const pc = (k) => o.n ? 100 * o[k] / o.n : 0;
  const opp = { n: o.n, hit: o.all };

  const mins = (t1 - t0) / 60;
  const perMin = (r.notices - n0) / Math.max(1e-6, mins);
  rows.push({ wid, perMin, span: t1 - t0, charges: r.charges, bites: r.bites,
    opp: opp.n ? 100 * opp.hit / opp.n : 0 });
  console.log(`  ${wid.padEnd(9)} ${(r.notices - n0)} looks over ${(t1 - t0).toFixed(0)}s of match `
    + `= ${perMin.toFixed(1)}/min   (bully charges ${r.charges}, bites ${r.bites})`);
  console.log(`            family joined ${pc('joined').toFixed(0)}%  |  `
    + `someone 1.2x bigger ${pc('big').toFixed(0)}%  |  someone inside 62u ${pc('near').toFixed(0)}%  |  `
    + `both ${pc('bigAndNear').toFixed(0)}%  |  whole gate ${pc('all').toFixed(0)}%`);
  console.log(`            best seen: biggest family member was ${o.maxRatio.toFixed(2)}x your radius, `
    + `nearest came within ${o.minDist > 1e8 ? 'never' : o.minDist.toFixed(0) + 'u'}`);
  await p.close();
}
await b.close();

console.log('');
const fails = [];
for (const r of rows) {
  if (r.perMin < MIN_PER_MIN) {
    fails.push(`${r.wid}: only ${r.perMin.toFixed(1)} looks a minute (floor ${MIN_PER_MIN}). `
      + `The family is still furniture — nothing about the other voids changed for the player. `
      + (r.opp < 5
        ? `The gate was open only ${r.opp.toFixed(0)}% of the time, so this is REACH, not throttle: `
          + `a rival that big is never that close. Widen the distance or soften the size gap.`
        : `The gate was open ${r.opp.toFixed(0)}% of the time, so the opportunity is there and the `
          + `THROTTLE is eating it — the cooldown or the never-two-at-once rule is too strict.`));
  }
  if (r.perMin > MAX_PER_MIN) {
    fails.push(`${r.wid}: ${r.perMin.toFixed(1)} looks a minute (ceiling ${MAX_PER_MIN}). `
      + `That is being stared at rather than warned, and it is the shit show the owner ` +
      `explicitly ruled out`);
  }
}
if (fails.length) {
  for (const f of fails) console.log(`  · ${f}`);
  console.log(`\nFAIL — the family's presence is wrong in ${fails.length} case(s)`);
  process.exit(1);
}
console.log(`PASS — across ${rows.length} world(s) a bigger void looks at you `
  + `${Math.min(...rows.map((r) => r.perMin)).toFixed(1)}-${Math.max(...rows.map((r) => r.perMin)).toFixed(1)} `
  + `times a minute, inside the band ${MIN_PER_MIN}-${MAX_PER_MIN}`);
