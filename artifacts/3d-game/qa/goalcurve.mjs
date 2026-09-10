// WHICH OF THE THIRTY GOALS CAN ACTUALLY BE WON, AND WHEN?
//
// Day 2 of the menu stream (docs/MENU-BRIEF.md §6), and it carries more weight
// than it was written to carry. The owner decided §8.1 on 2026-09-10: a dot
// opens the next one by being WON, not by being finished — "more challenging
// like Angry Birds". Angry Birds can gate on winning because every level is
// winnable; the ramp lives in the levels, not in the gate. Ours are not
// winnable as first drafted, and the code says so in its own words:
//
//   LANDMARK  the in-range cue "never fires" for a weaker player
//             (prototype3d.ts:1529-1531), and on worlds 2-5 the landmark only
//             comes into reach in the finale surge (:1553-1555)
//   RIVALS    needs myRank === 1, and the rubber band floors the family at
//             "never below 3rd" (rivals.ts:256, :701, :788), not at first
//   CLEAR     100% devouredPct is measured in single digits on a real run
//             (:5462-5466)
//
// Win-gate those as drafted and a small player stops at Maple dot 3 for good.
// So §3.4 stops being a provisional table and becomes the load-bearing one,
// and this is the instrument that fills it: one match per world, and from that
// one match the crossing time of all five goals.
//
// WHAT IT SAMPLES, and where each number comes from — every one is the game's
// own, never a rule restated here (GOVERNOR.md rule 4, and qa/questable.mjs's
// header, where a probe that knew chalets were houses passed a world whose
// chip was dead):
//
//   EAT       __matchState().score
//   SET       __kindTally() — the eat handler's own classification, counted at
//             questEvent, the funnel every kind passes through (:5939-5953)
//   LANDMARK  __matchState().r against __landmarkProbe().needR, which is the
//             prop's radius over EAT_RATIO because that is the cue's own test
//   RIVALS    __matchState().rank — the board's rank among JOINED rivals, not
//             a rank re-derived from the score list, which is wrong on every
//             match before the last rival walks in
//   CLEAR     __matchState().devouredPct
//
// SUPPLY, for SET's 3N/6N rule, is counted with questable.mjs's block against
// __questPools(), 'big' de-duplicated per bite the way the eat handler
// double-fires it on tagged props >= r 6.
//
// THE DRIVER IS NOT A CHILD, AND THIS PROBE SAYS SO ON EVERY ROW. It drives at
// the nearest edible it can eat, which is a competent adult with perfect
// information and no hesitation. WORLD_PAR's "verified: mean 103,642" (:551)
// is this driver's mean, and §3.4 already records that it is not a
// six-year-old's. So the numbers below are an UPPER BOUND on what a child
// reaches, the goals must be set at a fraction of them, and that fraction is
// the one thing here that cannot be measured in a sandbox — it comes off the
// owner's daughter on day 15 (§8.9). Nothing in this output is a goal; it is
// the ceiling a goal has to sit under.
//
// Rendering is stubbed after the match starts: the sim then runs at its own
// rate instead of the sandbox's ~0.5 fps, and nothing measured here is visual.
//
//   node qa/goalcurve.mjs [world|all] [port] [--samples=200]
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { ALL_WORLDS, initScript } from './worlds.mjs';
import { DRIVE_NEAREST } from './_drive.mjs';

const flag = (n, d) => { const h = process.argv.find((a) => a.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : d; };
const pos = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const WORLD_ARG = pos[0] || 'all';
const PORT = pos[1] || '4177';
const SEED = Number(flag('seed', process.env.SEED || '7'));
const RUNS = Number(flag('runs', '5'));
const worlds = WORLD_ARG === 'all' ? ALL_WORLDS : [WORLD_ARG];
for (const w of worlds) if (!ALL_WORLDS.includes(w)) { console.log(`\nFAIL — unknown world "${w}"`); process.exit(1); }

const bad = [];
const note = (m) => { bad.push(m); console.log(`  BAD  ${m}`); };
const out = {};
const t0 = Date.now();
process.on('uncaughtException', (e) => { console.log(`\nFAIL — threw: ${e.message.split('\n')[0]}`); process.exit(1); });
process.on('unhandledRejection', (e) => { console.log(`\nFAIL — rejected: ${String(e && e.message || e).split('\n')[0]}`); process.exit(1); });

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });

console.log(`\n  GOALCURVE — what one competent run reaches, per world`);
console.log(`  worlds ${worlds.join(',')} · port ${PORT}`);
console.log(`  THE DRIVER IS NOT A CHILD: nearest-edible autopilot, perfect information, no hesitation.`);
console.log(`  Every number below is a CEILING. Goals go under it by a factor day 15 measures.\n`);


// ── ONE RUN ────────────────────────────────────────────────────────────────
// Seeded, so the WORLD is identical between runs — rival scores repeat to
// within 0.5%. What does not repeat is the player: the autopilot gets its
// input through rAF, and how many input frames it gets per match-second is the
// sandbox's business, not the game's. Two seeded runs of Maple came back
// 168,229 and 140,724. That 16% is the noise floor on every player-side number
// here, it is measured rather than assumed, and it is why goals are set from
// the WORST run and not the mean.
const runOnce = async (world) => {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  p.on('pageerror', (e) => console.log(`  [pageerror] ${e.message.split('\n')[0]}`));
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(initScript(SEED));
  await p.addInitScript(() => { try { localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch { } });
  await p.goto(`http://127.0.0.1:${PORT}/?w=${world}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 420000 });
  const missing = await p.evaluate(() => ['__matchState', '__kindTally', '__landmarkProbe', '__questPools', '__edibles', '__renderer']
    .filter((k) => !(k in window)));
  if (missing.length) { console.log(`\nFAIL — this build has no ${missing.join(', ')}; goalcurve measures nothing without them`); process.exit(1); }

  await p.waitForFunction(() => {
    const n = window.__edibles.length;
    if (window.__lastN !== n) { window.__lastN = n; window.__stableSince = performance.now(); return false; }
    return performance.now() - (window.__stableSince || 0) > 2000;
  }, null, { timeout: 300000, polling: 250 });

  await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => {
    if (['daily', 'gift'].includes(e.id)) e.classList.remove('show');
  }));
  await p.evaluate(() => document.getElementById('btnPlay')?.click());
  await p.waitForSelector(`#worldRow .wCard[data-world="${world}"]`, { state: 'visible', timeout: 400000 });
  await p.evaluate((w) => document.querySelector(`#worldRow .wCard[data-world="${w}"]`)?.click(), world);
  await p.waitForFunction(() => (window.__matchState?.().armed ?? false) === true, null, { timeout: 400000 });

  // SUPPLY, after the match is armed and never before: gildTreasure() runs
  // inside beginMatch (`:6255`), so a count taken on the menu reports one
  // gilded prop where the match has twenty. The first run of this probe did
  // exactly that and reported Maple eating 5 gilds out of a supply of 1.
  const supply = await p.evaluate(() => {
    const HL = new Set(window.__questPools().houseLike);   // the CLIENT's house list, never a copy
    const s = {};
    const bump = (k) => { s[k] = (s[k] || 0) + 1; };
    for (const e of window.__edibles) {
      const m = e.mesh; if (!m) continue;
      const qk = m.userData.qk, r = e.radius || 0;
      if (r < 1) bump('snack');
      if (r >= 6) bump('big');
      if (m.userData.gild) bump('gild');
      if (r >= 2.6 && r <= 3.4) bump('cabana');
      if (qk) bump(qk);
      if (qk && HL.has(qk) && qk !== 'house') bump('house');
    }
    return s;
  });
  const landmark = await p.evaluate(() => window.__landmarkProbe());

  await p.evaluate(DRIVE_NEAREST);
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout: 400000 });
  // rendering off only AFTER the clock is running — the pointerdown that starts
  // it goes through the canvas, and the intro's camera work is real frames.
  await p.evaluate(() => { window.__renderer.render = () => { }; });

  // ── ON THE VIRTUALISED CLOCK, OR NOT AT ALL ──────────────────────────────
  // The first version of this probe ran the match on real frames and the same
  // seeded world came back between 128,300 and 207,902 across invocations — a
  // 62% spread on numbers that are about to become thirty shipped goals. The
  // GAME is deterministic under the seed (rival scores repeat to 0.5%); what is
  // not is the PLAYER, because the autopilot steers through rAF and how many
  // input frames it gets per match-second is the sandbox's business. A busy box
  // is a clumsier child.
  //
  // So the match is hand-cranked at exactly 16.667 ms a frame, the technique
  // qa/ladder.mjs uses and the one §5.2 of the brief mandates for the level
  // probe: 60 input frames per second of match time, on any box, forever.
  //
  // rAF is virtualised as a QUEUE, not ladder.mjs's single pending slot —
  // there are two consumers here (animate and the autopilot's own tick loop)
  // and a single slot silently drops one of them, which would leave the void
  // being driven by nothing and eating nothing.
  await p.evaluate(() => {
    const raw = window.requestAnimationFrame.bind(window);
    const rawNow = performance.now.bind(performance);
    window.__virt = rawNow();
    performance.now = () => window.__virt;
    window.__q = [];
    window.requestAnimationFrame = (cb) => { window.__q.push(cb); return window.__q.length; };
    // The callbacks already in flight were registered with the REAL rAF and
    // know nothing about the queue, so one more real frame has to run for
    // animate() and the autopilot's tick to re-register through the stub.
    // Without this nudge the first crank finds an empty queue and reports the
    // chain broken — which is what the first version of this did.
    raw(() => { });
  });
  await p.waitForFunction(() => (window.__q || []).length >= 2, null, { timeout: 60000 })
    .catch(() => { });
  const armed = await p.evaluate(() => (window.__q || []).length);
  if (armed < 2) note(`${world}: only ${armed} rAF consumer(s) re-registered — the autopilot or the render loop is not on the virtual clock`);
  const gc = [];
  let ended = false;
  const FPS = 60, STEP = 1000 / FPS;
  for (let sec = 0; sec < 400 && !ended; sec++) {
    const r = await p.evaluate(([n, step]) => {
      for (let i = 0; i < n; i++) {
        const due = window.__q; window.__q = [];
        if (!due.length) return { broke: true };
        window.__virt += step;
        for (const cb of due) cb(window.__virt);
      }
      const ms = window.__matchState();
      return {
        ended: !!document.getElementById('end')?.classList.contains('show'),
        s: { t: +ms.t.toFixed(1), r: +ms.r.toFixed(3), score: Math.round(ms.score),
          pct: +(ms.devouredPct ?? 0).toFixed(2),
          // devouredPct counts the FAMILY's meals against the plateau too, so
          // it is not "how much of the world SHE ate". Both are recorded:
          // which one CLEAR's goal is made of is §8.3's decision and they are
          // very different numbers.
          you: +(ms.ate?.you ?? 0).toFixed(2), fam: +(ms.ate?.family ?? 0).toFixed(2),
          rank: ms.rank ?? 0, k: { ...window.__kindTally() },
          // THE NUMBER THAT RE-SPECIFIES LANDMARK. Not "did she reach the
          // landmark" but "what was the biggest thing she COULD eat, at this
          // moment" — the largest uneaten prop inside the eat rule
          // (radius <= R * EAT_RATIO). A landmark a child can win is one whose
          // radius sits under this curve well before the buzzer, and without
          // it dot 3 can only be re-specified by guessing.
          big: (() => { let m = 0; const lim = ms.r * 1.11;
            for (const e of window.__edibles) {
              if (e.eaten || !e.mesh?.visible || e.mesh.userData.tethered) continue;
              if (e.radius <= lim && e.radius > m) m = e.radius;
            } return +m.toFixed(2); })(),
          // ── THE BOSS ARC, WATCHED RATHER THAN ASSUMED ───────────────────
          // rivals.ts authors NIBBLES (arch BULLY) as two acts: a predator
          // looming at 1.5x the player for the first 55% of the match, then
          // STUFFED — growth stops and her ceiling sags 0.3%/s until the
          // player's finale surge overtakes her and she becomes, in the
          // file's own words, "the marquee meal — the whole payoff of the
          // arc". Nothing has ever measured whether that lands: qa/rivalnotice
          // is ON PROBATION in the gate, "last read 0.0/min in maple, gate
          // open 0%". So this records her radius against the player's swallow
          // line every second, and rivalEv counts what actually happened.
          boss: (() => {
            const n = ms.rivals.find((x) => (x.arch || '') === 'BULLY');
            if (!n) return null;
            return { r: +n.r.toFixed(2), joined: !!n.joined, hunt: !!n.hunt,
              // the eat rule, the game's own: edible when r <= R * EAT_RATIO
              edible: n.r <= ms.r * 1.11, ratio: +(n.r / Math.max(0.01, ms.r)).toFixed(2),
              d: Math.round(Math.hypot(n.x - window.__voidState().x, n.z - window.__voidState().z)) };
          })(),
          ev: { eaten: ms.ev?.eaten ?? 0, marquee: ms.ev?.marquee ?? 0,
            charges: ms.ev?.charges ?? 0, hunterBites: ms.ev?.hunterBites ?? 0,
            notices: ms.ev?.notices ?? 0 } },
      };
    }, [FPS, STEP]);
    if (r.broke) { note(`${world}: the rAF chain broke — animate() threw mid-crank`); break; }
    gc.push(r.s);
    ended = r.ended;
  }
  const final = await p.evaluate(() => {
    const ms = window.__matchState();
    return { t: ms.t, score: Math.round(ms.score), r: +ms.r.toFixed(2), pct: +(ms.devouredPct ?? 0).toFixed(2),
      you: +(ms.ate?.you ?? 0).toFixed(2), fam: +(ms.ate?.family ?? 0).toFixed(2), rank: ms.rank,
      ev: { ...ms.ev },
      k: { ...window.__kindTally() },
      rivals: ms.rivals.map((x) => ({ n: x.name, s: Math.round(x.score), j: x.joined })) };
  });
  await p.close();
  return { ended, gc, final, supply, landmark };
};

// ── A DISTRIBUTION, NOT A NUMBER, AND THAT IS NOT A LIMITATION ────────────
// Cranking at a fixed 16.667 ms removed the FRAME-RATE dependence — a busy box
// no longer makes a clumsier child — but it did not make the run repeatable,
// and it cannot. The seeded RNG stream's POSITION when the match starts depends
// on the handful of real frames between the pointerdown and the crank taking
// over, so every run begins from a different point in the same stream: same
// world, different match. Measured on Maple, three cranked runs: 108,533 /
// 176,364 / 182,378.
//
// That is the right answer anyway. §6 day 2 asks for "p50/p90 of strong runs",
// not for one number — a goal set from a single run is a goal tuned to one
// throw of the dice. So every figure below is a percentile over RUNS matches,
// and the one that matters for a WIN GATE is p10: the goal has to sit under
// what a competent driver reaches on its BAD days, before a child's derating
// is applied at all.
const pct = (a, q) => {
  const v = [...a].sort((x, y) => x - y);
  return v[Math.min(v.length - 1, Math.max(0, Math.round(q * (v.length - 1))))];
};
const med = (a) => pct(a, 0.5);
const span = (a, f = (x) => x) => {
  const v = a.map(f).filter((x) => x !== null && x !== undefined);
  if (!v.length) return 'never';
  if (v.length === 1) return String(v[0]);
  return `p10 ${pct(v, 0.1)} · p50 ${pct(v, 0.5)} · p90 ${pct(v, 0.9)}`;
};

for (const world of worlds) {
  const runs = [];
  for (let i = 0; i < RUNS; i++) {
    const r = await runOnce(world);
    if (!r.ended) note(`${world} run ${i + 1}: the match never reached the end card`);
    if (!r.gc.length) { note(`${world} run ${i + 1}: no samples`); continue; }
    runs.push(r);
  }
  if (!runs.length) continue;
  out[world] = runs;

  const lm = runs[0].landmark.nearHero || runs[0].landmark.biggest;
  const crossR = (r, n) => { const h = r.gc.find((s) => s.r >= n); return h ? Math.round(h.t) : null; };
  const atFrac = (r, f) => { const T = r.gc[r.gc.length - 1].t; return r.gc.reduce((a, s) => Math.abs(s.t - T * f) < Math.abs(a.t - T * f) ? s : a, r.gc[0]); };
  const END = Math.round(med(runs.map((r) => r.gc[r.gc.length - 1].t)));

  console.log(`  ══ ${world.toUpperCase()} ══  ${END} match-seconds · ${runs.length} seeded run(s) · SEED ${SEED}`);
  console.log(`     EAT       final score  ${span(runs, (r) => r.final.score)}`);
  console.log(`               reached  25% of the clock ${span(runs, (r) => atFrac(r, 0.25).score)} · 50% ${span(runs, (r) => atFrac(r, 0.5).score)} · 75% ${span(runs, (r) => atFrac(r, 0.75).score)}`);
  if (lm) {
    console.log(`     LANDMARK  ${lm.qk || 'untagged'} r ${lm.radius} needs R ${lm.needR} · reached at ${span(runs, (r) => crossR(r, lm.needR))}s of ${END}`);
    const big = runs[0].landmark.biggest;
    if (big && big.radius !== lm.radius)
      console.log(`               the island's LARGEST edible is a DIFFERENT prop (${big.qk || 'untagged'} r ${big.radius}, needs R ${big.needR}) — heroProp resolves to that, which is §3.4's trap`);
  } else console.log(`     LANDMARK  no landmark found`);
  console.log(`     RIVALS    rank at the buzzer ${span(runs, (r) => r.final.rank)} · joined ${runs[0].final.rivals.filter((x) => x.j).length}/${runs[0].final.rivals.length} · best rival ${span(runs, (r) => Math.max(...r.final.rivals.filter((x) => x.j).map((x) => x.s), 0))}`);
  const atF = (r, f) => { const T = r.gc[r.gc.length - 1].t; return r.gc.reduce((a, x) => Math.abs(x.t - T * f) < Math.abs(a.t - T * f) ? x : a, r.gc[0]); };
  console.log(`     SIZE      radius at 25% of the clock ${span(runs, (r) => atF(r, 0.25).r)} · 50% ${span(runs, (r) => atF(r, 0.5).r)} · 75% ${span(runs, (r) => atF(r, 0.75).r)} · buzzer ${span(runs, (r) => r.final.r)}`);
  console.log(`               biggest prop she could EAT then: 25% ${span(runs, (r) => atF(r, 0.25).big)} · 50% ${span(runs, (r) => atF(r, 0.5).big)} · 75% ${span(runs, (r) => atF(r, 0.75).big)}`);
  const bossOf = (r) => r.gc.filter((x) => x.boss);
  if (bossOf(runs[0]).length) {
    const firstEdible = (r) => { const h = bossOf(r).find((x) => x.boss.edible && x.boss.joined); return h ? Math.round(h.t) : null; };
    const peakRatio = (r) => Math.max(...bossOf(r).map((x) => x.boss.ratio));
    console.log(`     BOSS      NIBBLES peaks at ${span(runs, peakRatio)}x the player's radius · becomes edible at ${span(runs, firstEdible)}s of ${END}`);
    console.log(`               charges ${span(runs, (r) => r.final.ev?.charges ?? 0)} · bites taken off you ${span(runs, (r) => r.final.ev?.hunterBites ?? 0)} · rivals eaten ${span(runs, (r) => r.final.ev?.eaten ?? 0)} · MARQUEE meals ${span(runs, (r) => r.final.ev?.marquee ?? 0)}`);
  } else console.log(`     BOSS      no BULLY archetype in this world's cast`);
  console.log(`     CLEAR     world devoured ${span(runs, (r) => r.final.pct)}% · of which HERS ${span(runs, (r) => r.final.you)}% and the family's ${span(runs, (r) => r.final.fam)}%`);
  const kinds = Object.keys(runs[0].final.k).filter((k) => !['devourer', 'combo', 'rival', 'gulp', 'collapse', 'solo40'].includes(k)).sort();
  console.log(`     SET       ate  ${kinds.map((k) => `${k} ${span(runs, (r) => r.final.k[k] || 0)}`).join(' · ')}`);
  console.log(`               have ${kinds.map((k) => `${k} ${runs[0].supply[k] ?? 0}`).join(' · ')}`);
  console.log('');
}

// ── KEEP THE SERIES, so the next question does not cost another hour ──────
// Every run of this probe is about fifty minutes of wall time, and the first
// pass answered five questions and raised a sixth it had no data for. The raw
// samples are written out so any later question — what radius at what second,
// what was edible when — is a file read rather than a re-run.
try {
  mkdirSync('qa/out/goalcurve', { recursive: true });
  for (const [w, runs] of Object.entries(out)) {
    writeFileSync(`qa/out/goalcurve/${w}.json`, JSON.stringify({
      world: w, seed: SEED, runs: runs.length,
      supply: runs[0].supply, landmark: runs[0].landmark,
      series: runs.map((r) => ({ final: r.final, gc: r.gc })),
    }, null, 1));
  }
  console.log(`  series written to qa/out/goalcurve/`);
} catch (e) { console.log(`  [could not write the series: ${e.message}]`); }

await b.close();
const secs = ((Date.now() - t0) / 1000).toFixed(0);
if (bad.length) { console.log(`\nFAIL — ${bad.length} measurement fault(s); the numbers above are not trustworthy [${secs}s]`); process.exit(1); }
console.log(`PASS — REPORT only: ${Object.keys(out).length} world(s) x ${RUNS} seeded run(s) to the buzzer, every series read off the game's own hooks [${secs}s]`);
