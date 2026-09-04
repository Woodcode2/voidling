// DOES THE MATCH SWING, AND DOES A FORM LOSS STICK? — owner decision 2.
//
//   node qa/rivalswing.mjs [world] [port]
//
// The owner, verbatim (docs/OWNER-2026-08-25.md, decision 2):
//
//   "yes, however there needs to be a way where if they're larger you go and
//    consume and come back right. It should be back and forth. We want people
//    to feel challenged but give them an edge to win. If a void eats you it
//    should be more punishing then 10 percent loss. Like a level loss"
//
// ── WHY THIS FILE IS NOT THE ONE THE PROPOSAL SHIPPED ──────────────────────
// docs/crews/round-2b/rival-loop.verdict.md KILLED the crew's probe AS WRITTEN.
// Three faults, all of which this file is built to avoid:
//
//   1. It measured demotions by polling `__stages().cur` every 0.5 MATCH
//      seconds. Before the demote hold, a form loss lived ONE FRAME — the
//      score floor (prototype3d.ts, the growth law) is a pure function of
//      playerScore and lawCap, and a bite moves neither, so the radius, and
//      with it curStage, was handed straight back. qa/evolveonce.mjs's own
//      header measures the interval: "about sixteen milliseconds". A
//      0.5-match-second sampler steps over 7-20 WALL seconds under
//      swiftshader. Both of that probe's kid-mercy bars would have reported
//      ZERO on a build where every rail was broken.
//   2. Its `share > 0.45` ceiling was derived from a two-surge timeline that
//      correction C-A deletes.
//   3. It could not tell the owner's clause from a stopwatch: its
//      "larger -> eatable" arc is satisfied by the surge's own sag whether the
//      player played or stood still.
//
// So: demotions are read from the HANDLER'S OWN monotonic counter (ev.dems,
// correction C-D) — a counter cannot miss an event however short it is, only
// the GAP loses resolution, and 0.5s of resolution is ample against a 3.5s
// bar. The "did the level loss stick" clause is measured on a FORCED bite
// through the real handler (the qa/evolveonce.mjs precedent) with a
// PER-FRAME trace, because that is the only sampling rate that can see the
// pre-patch behaviour it has to be able to fail against. And who closed the
// arc — the player or the clock — is reported (correction C-G).
//
// Everything is in MATCH seconds, off `__matchState().t`. The swiftshader
// wall clock runs 14-40x slower (qa/_clockrate.mjs) and is never consulted.
// No ?fast: rivals.update receives real dt while the clock scales, so ?fast
// distorts the family. No quality pin: no colour claim is made, and rendering
// is disabled for speed (the qa/laneshort.mjs precedent).
//
// ── THE BARS, AND WHERE EVERY NUMBER COMES FROM ────────────────────────────
// Nothing below is a taste judgement. Each bar is arithmetic off the shipped
// constants, and the derivation is written beside it so the next reader does
// not have to trust me. The constants are parsed out of the real source where
// the claim depends on them, and this file THROWS if a call site has moved
// rather than silently describing the build it was written against.
//
//  B1  surges >= 1
//      Under correction C-A the window is `_t > matchLen*0.55 && < matchLen*0.72
//      && !hunting`, and `hunting` is `_t < matchLen*0.55`, so the window is
//      exactly 55%-72% of the clock — 99.0-129.6s on a 180s match, 30.6s wide.
//      `surgeCd` only counts down while that window is open (the whole block is
//      gated on it), so the first surge fires rand(4,12)s in: 103-111s. Hold
//      rand(12,18)s then a 3.5%/s sag of ~13s, so it clears at ~128-142s and
//      the next gap is rand(26,40)s — which cannot fit before 129.6s. EXACTLY
//      ONE surge is the design's own prediction. The bar is set at that floor.
//  ── B2, B3 and B4 are all measured in THE SURGE STRETCH, t >= matchLen*0.55,
//     and not over the whole match. That boundary is not a fudge, it is the
//     mechanism's own: correction C-A gates surgeOpen on `_t > matchLen*0.55`,
//     so nothing the surge does can touch a sample before it. And the opening
//     of a match already contains a family size lead that has nothing to do
//     with this patch: softCap is `max(min(START_R + 0.02t, 1.6), pr*0.80)`, and
//     its absolute 1.6 term sits ABOVE the player until a par run outgrows 1.6
//     at ~45s. MEASURED on the pre-patch build, maple, child driver: the family
//     peaks at 1.12x the player around t=20-31s, the lead flips to the player at
//     t=45.1s, and the family holds the size lead for 28.1s of the match — all
//     of it before t=45. And on a third pre-patch run the opening produced TWO
//     whole-match lead changes on its own (t=22.8 to family, t=51.0 back to the
//     player) with 32.3s of family lead — which is to say the crew's
//     `changes >= 2` bar, scored over the whole match, PASSES on a build where
//     the surge does not exist. Scoping to the stretch is what makes it a bar.
//     The whole-match figures are printed beside the barred ones so nothing is
//     hidden.
//  B2  size-lead changes in the surge stretch >= 2, 3% hysteresis
//      "It should be back and forth" is two crossings, not one: the lead has to
//      go AND come back. One surge produces exactly those two. The 3% dead band
//      is there so cap easing either side of parity cannot be counted as a lead
//      change. Pre-patch the family sits at 0.80x for the whole stretch (the
//      softCap floor), so the reading is 0.
//  B3  larger -> eatable arcs in the surge stretch >= 1
//      The same named rival seen above pr*1.2 (ITS bite gate open on you — the
//      constant is parsed from rivals.ts) and later below pr/1.2 (YOUR swallow
//      gate open on it). That is "you go and consume and come back" as a state
//      transition. Bar at 1: one surge, one arc. Restricted to the stretch for
//      a second reason as well as C-A's: an idle player whose radius is held at
//      START_R by the score floor is passed by softCap's 1.6 term at ~t=35s,
//      which would open an arc the surge had no part in.
//  B4  family-larger in the surge stretch <= 45 MATCH SECONDS
//      The other end of the band — "challenged, but give them an edge to win",
//      and the owner's "I don't want to create this shit show". Derived in
//      absolute seconds because every term is absolute: ONE surge (B1), larger
//      for its hold (<=18s) plus the sag back to parity. At par growth the sag
//      is ln(1.26)/(0.035 + ~0.009) = 5.3s; in the worst case a demotion that
//      now STICKS (the demote hold) drops the player mid-hold, so the pin has
//      up to ~1.8x to sag through = ln(1.8)/0.035 = 16.8s. Ceiling therefore
//      ~18 + 17 = 35s. The bar is 45s: 1.3x the derived ceiling, which absorbs
//      0.5s sampling and pace variance and still fails loudly if a second
//      surge fires or a sag stalls. Expressed in seconds, not as a share, so
//      it does not silently change meaning on a ?len= match.
//  B5  nothing is still surging at the whistle
//      `surgeR *= 1 - dt*0.035` is monotonic and terminates at softCap, so a
//      surge still running at the end means the sag stalled. qa/titan.mjs's
//      feast depends on the family being eatable in the finale; the timeline
//      above clears the one surge by ~142s against a 180s whistle.
//  B6a the forced bite's RADIUS loss is held for >= 2.0 match seconds
//      This is the bar on the demote hold itself, and it is the deterministic
//      one. The hold is 6.0 seconds of tClock, and tClock and the match clock
//      both advance by the same `dt` at clockSpeed 1, so it is 6.0 MATCH
//      seconds. Inside it the player can only climb by EATING — growRadius and
//      the rate limiter are untouched — and the limiter caps that at 0.11
//      units/s outside the finale surge. A demotion from form 2 lands on
//      FORM_MIN[1]*1.02 = 1.632, a drop of at least 2.5 - 1.632 = 0.868 units,
//      so recovering HALF of it takes >= 0.434/0.11 = 3.9s. MEASURED pre-patch,
//      maple, child driver, three runs of this file: half of a 1.320-unit drop
//      was back in 0.03 match seconds — ONE FRAME — and on the other two runs
//      the floor put back 84% (1.632 -> 2.383) and 65% (1.632 -> 2.209) of the
//      drop inside half a match second. The bar is 2.0s: sixty times the
//      measured pre-patch reading and half the post-patch prediction.
//  B6b the forced FORM loss sticks for >= 2.0 match seconds
//      The owner's own clause — "like a level loss" — as the child sees it, on
//      the HUD. NOT a fails-before bar, and the verdict's kill needs one
//      correction here that I found by running it: whether the pre-patch score
//      floor hands the FORM back depends on where the radius sat relative to
//      the floor at the instant of the bite. Measured, same two runs, same
//      forced bite: at t=72.4s the form was back within a frame (radius
//      restored to 2.383 with curStage 2 at bite+0.5s — the floor was above the
//      2.5 boundary); at t=83.0s it never came back inside a 9s trace (the
//      floor was 2.209, below the boundary, because that run had eaten its way
//      ABOVE its own floor and the bite took real ground). So the refund is
//      conditional, not universal — which is why B6a, on the radius, is the
//      bar that can actually fail before. (On the third run it read 0.03s, so
//      it does fail before more often than not; it is simply not guaranteed to,
//      and a bar that is only usually red is not a fails-before claim.)
//  B7  organic demotions <= 8
//      The arithmetic ceiling, not a taste bar. HUNTER, hunting (0 to 55% of
//      the clock = 99s): she bites only out of a lunge (`canBite` requires
//      cst===2) and the charge cycle is prowl rand(21,34) + 0.85 + 2.6 + 1.7 =
//      26.2s at its fastest, so <=4 connects. HUNTER, stuffed (99-180s): she
//      bites on contact, biteCd 12, but only while still above pr*1.2 as she
//      sags 0.3%/s into the marquee meal — <=2. SURGE: one surge; its one
//      connecting bite zeroes surgeT and starts the sag, and biteCd 12 against
//      a gate that closes in ~13s leaves at most a second connect — <=2.
//      4 + 2 + 2 = 8. Above 8 a mercy rail broke, whatever else looks fine.
//      "Organic" excludes the one bite this probe fires itself.
//  B8  min gap between demotions >= 3.5 match seconds
//      `biteMercy = tClock + 4.0` on a form bite and the handler's first line
//      is `if (tClock < biteMercy) return`, so two demotions cannot be closer
//      than 4.0s by construction. 3.5 is 4.0 minus the 0.5s sample quantum.
//
// ── WHAT FAILS BEFORE THE PATCH, AND WHAT DOES NOT ─────────────────────────
// Governor rule 2 wants a probe that fails on the broken build. FOUR of the
// eight bars do, independently:
//   B1  `ev.surges` does not exist pre-patch, so it reads 0.
//   B2  softCap = max(min(START_R + 0.02t, 1.6), pr*0.80) holds every
//       non-hunter BELOW the player once pr > 2. qa/rivalnotice.mjs measured
//       the distribution: 94% of family samples at 0.75-0.85x, 0% above 0.85x.
//       Measured pre-patch, the ratio in the stretch never leaves 0.65-0.80, so
//       `changesLate` is 0. (Over the WHOLE match it is 1, from the opening
//       described above — which is exactly why the bar is on the stretch.)
//   B3  same fact: nothing but the hunter ever reaches 1.2x in the stretch, and
//       the hunter is filtered out of every size series here.
//   B6a the score floor restores the radius toward its own value on the next
//       frame — measured, 84% and 65% of the drop inside 0.5 match seconds.
// THE OTHER FIVE DO NOT, and this file will not pretend otherwise. B4, B5, B7
// and B8 are vacuously green pre-patch (nothing surges; demotions are
// hunter-only and already railed), and B6b is CONDITIONALLY green pre-patch
// for the reason recorded beside it. They are POST-PATCH GUARDS on the
// kid-mercy rails, not fails-before claims.
import { chromium } from 'playwright';
import { readFileSync } from 'fs';

const WORLD = process.argv[2] || 'maple';
const PORT = process.argv[3] || '4177';

// ── READ THE GATES OFF THE REAL SOURCE ────────────────────────────────────
// Governor rule 4 and qa/rivalnotice.mjs's precedent: a probe that carries its
// own copy of the number it tests is describing the build it was written
// against. The bite ratio IS the claim under test — if it moves, the owner's
// price moved and these bars must be re-derived, loudly, not quietly passed.
const RSRC = readFileSync('src/proto3d/rivals.ts', 'utf8');
const BITE = RSRC.match(/if \(rv\.r > pr \* ([\d.]+) && dp < rv\.r \* [\d.]+ && rv\.biteCd <= 0/);
if (!BITE) throw new Error('the bite gate in rivals.ts no longer matches the shape this probe parses — '
  + 'it cannot report on a condition it cannot find');
const BITE_K = Number(BITE[1]);
const PSRC = readFileSync('src/prototype3d.ts', 'utf8');
const HOLD = PSRC.match(/demoteHold = tClock \+ ([\d.]+)/);
const MERCY = PSRC.match(/biteMercy = tClock \+ \(hit\.form \? ([\d.]+)/);
const FORMS = PSRC.match(/const FORM_MIN = \[([^\]]+)\]/);
if (!FORMS) throw new Error('FORM_MIN has moved in prototype3d.ts — the stick derivation depends on it');
const FORM_MIN = FORMS[1].split(',').map(Number);
console.log(`  (parsed from source: bite gate ${BITE_K}x`
  + `, demote hold ${HOLD ? HOLD[1] + 's' : 'ABSENT — pre-patch build'}`
  + `, form mercy ${MERCY ? MERCY[1] + 's' : 'ABSENT — pre-patch build'}`
  + `, FORM_MIN[1] ${FORM_MIN[1]})`);

const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => {
  try {
    localStorage.clear();
    localStorage.setItem('voidPlayed', '1');
    localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString());
    // TRAP recorded in GOVERNOR.md: voidUnlocked is a COMMA-JOINED STRING
    // (unlocks.ts:39), not JSON. Maple works either way because read() force-
    // adds it, which is exactly how the bug stayed hidden for three runs.
    localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder,skylark');
  } catch { }
});
await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => {
  if (['daily', 'gift'].includes(e.id)) e.classList.remove('show');
}));
await p.waitForSelector('#btnPlay', { state: 'visible', timeout: 400000 });
await p.evaluate(() => document.getElementById('btnPlay')?.click());
await p.waitForSelector(`#worldRow .wCard[data-world="${WORLD}"]`, { state: 'visible', timeout: 400000 });
await p.evaluate((w) => document.querySelector(`#worldRow .wCard[data-world="${w}"]`)?.click(), WORLD);
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout: 400000 });

// THIS match's length, from the source the newsArc comment blesses — never
// assumed, never read from the query string (a world switch drops it).
const LEN = await p.evaluate(() => window.__newsArc?.().len ?? 180);
if (Math.abs(LEN - 180) > 1) {
  throw new Error(`this match is ${LEN}s. Every bar above is derived against the 180s clock this `
    + 'repo ships (the surge window is a fraction of matchLen but the hold, the sag and the mercy '
    + 'window are absolute seconds, so the ratios do not carry). Re-derive before trusting a reading.');
}
await p.evaluate(() => { window.__renderer.render = () => { }; });

await p.evaluate((LEN) => {
  window.__samples = [];
  window.__stick = null;
  const cv = document.querySelector('canvas');
  const cx = innerWidth / 2, cy = innerHeight / 2;
  cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: cx, clientY: cy, bubbles: true }));
  let heldT = -1, held = null, stall = 0, sampleT = -1;
  // ── THE FORCED BITE ───────────────────────────────────────────────────────
  // The one clause a passive observer cannot measure. A match may go by without
  // the hunter connecting at all, and "a form loss lasts sixteen milliseconds"
  // is invisible to any sampler slower than a frame. So take ONE bite through
  // the REAL handler — the qa/evolveonce.mjs precedent, the same _dbg.__bite —
  // early, at a controlled moment, and trace every frame after it.
  // WHY t >= 35 AND stage >= 2: the growth law puts a par run at r 2.31 at
  // thirty seconds, so GOBBLIN (FORM_MIN[2] = 2.5) arrives around 35-38s. From
  // stage 2 the demotion lands on FORM_MIN[1]*1.02 = 1.632 and the climb back
  // to 2.5 is 0.868 units against a 0.11 units/s rate limiter = 7.9s, longer
  // than the 6s hold — so the hold, not the climb, is what the trace measures.
  // It is also before the finale surge lifts that rate limiter, and long before
  // the surge window opens at 55%, so it cannot confound the swing bars.
  // …and it must land BEFORE the surge stretch opens at 55% of the clock, or
  // it would perturb the very bars it sits beside. A slow run may not reach
  // form 2 in time, so from 42% of the clock form 1 will do: the demotion then
  // lands on max(START_R, FORM_MIN[0]*1.02) = 0.918 and the drop is still ~0.7
  // units, which is more than the 2.0s bar needs. If neither arrives before
  // 50% of the clock the probe reports no conclusion rather than a guess.
  let bitten = false, tries = 0, nextTry = 30, denseUntil = -1;
  const tick = () => {
    const ms = window.__matchState?.();
    if (!ms) { requestAnimationFrame(tick); return; }
    const vs = window.__voidState();
    const stage = window.__stages().cur;

    const needStage = ms.t >= LEN * 0.42 ? 1 : 2;
    if (!bitten && ms.t >= nextTry && ms.t < LEN * 0.5 && stage >= needStage && tries < 8) {
      tries++; nextTry = ms.t + 1.5;
      const pre = { t: ms.t, r: vs.r, stage };
      window.__bite(true);
      const after = { r: window.__voidState().r, stage: window.__stages().cur };
      if (after.stage < pre.stage) {
        // it landed. Trace EVERY FRAME for 9 match seconds — one frame is the
        // resolution the pre-patch behaviour needs to be visible at.
        bitten = true; denseUntil = ms.t + 9;
        window.__stick = { pre, after, tries, trace: [] };
      }
      // …otherwise the global mercy window swallowed it (a real bite just
      // landed). Try again in 1.5 match seconds; mercy is at most 4.0s.
    }
    if (window.__stick && ms.t <= denseUntil) {
      // read LIVE, not the `stage`/`vs` captured at the top of the tick: the
      // bite is dispatched from inside this same tick, so the captured pair is
      // the state from BEFORE it and the first traced frame would report the
      // form as unbroken.
      window.__stick.trace.push({
        t: Math.round(ms.t * 1000) / 1000,
        r: Math.round(window.__voidState().r * 1000) / 1000,
        stage: window.__stages().cur,
        dems: ms.ev?.dems ?? -1,
      });
    }

    // ── the sample, every half MATCH second ──────────────────────────────
    if (ms.t - sampleT >= 0.5) {
      sampleT = ms.t;
      window.__samples.push({
        t: Math.round(ms.t * 10) / 10,
        pR: Math.round(vs.r * 1000) / 1000,
        pScore: Math.round(ms.score),
        stage,
        surges: ms.ev?.surges ?? 0,
        bites: ms.ev?.bites ?? 0,
        // the HANDLER'S counter, never a stage poll — see the header
        dems: ms.ev?.dems ?? 0,
        ateFam: ms.ate?.family ?? 0,
        // THE HUNTER IS EXCLUDED FROM EVERY SIZE SERIES. Her two acts cross the
        // player's line by design; leaving her in would let her arc wear the
        // family's hat and pass every swing bar on a build where the family
        // never moved at all.
        rivals: (ms.rivals || []).filter((r) => r.joined && r.arch !== 'BULLY')
          .map((r) => ({ n: r.name, r: Math.round(r.r * 1000) / 1000, surge: !!r.surge })),
      });
    }

    // the measured "child" driver, verbatim from qa/laneshort.mjs — this probe
    // rides the same play profile the lane measurements rode
    const gap = 2.4;
    if (ms.t - heldT > gap) {
      heldT = ms.t;
      const cand = [];
      let best = null, bd = 1e9;
      for (const e of window.__edibles) {
        if (e.eaten || !e.mesh?.visible) continue;
        const dx = e.mesh.position.x - vs.x, dz = e.mesh.position.z - vs.z;
        const d = dx * dx + dz * dz;
        if (e.radius <= vs.r * 0.92) { if (d < bd) { bd = d; best = { dx, dz }; } }
        if (d < 90000) cand.push({ dx, dz });
      }
      held = best;
      stall = Math.random() < 0.34 ? 1 : 0;
      if (cand.length && Math.random() < 0.30) held = cand[(Math.random() * cand.length) | 0];
    }
    if (held && !stall) {
      let a = Math.atan2(held.dz, held.dx);
      a += (Math.random() - 0.5) * 2.1;
      dispatchEvent(new PointerEvent('pointermove', {
        pointerId: 1, clientX: cx + Math.cos(a) * 110, clientY: cy + Math.sin(a) * 110, bubbles: true,
      }));
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}, LEN);

await p.waitForFunction(() => document.getElementById('end')?.classList.contains('show'),
  null, { timeout: 900000 });
const S = await p.evaluate(() => window.__samples);
const K = await p.evaluate(() => window.__stick);
await b.close();

// SILENCE IS A FAIL (gate rule): a step that prints no verdict did not reach a
// conclusion, and a probe that cannot conclude is not evidence of anything.
if (!S || S.length < 40) {
  console.log(`RIVALSWING: FAIL — only ${S?.length ?? 0} samples (no conclusion)`);
  process.exit(1);
}

const famR = (s) => s.rivals.reduce((a, r) => Math.max(a, r.r), 0);
const last = S[S.length - 1];
// THE SURGE STRETCH — the mechanism's own boundary (C-A gates surgeOpen on
// `_t > matchLen*0.55`), and the line that keeps the pre-existing opening cap
// out of the bars. See the header.
const T0 = LEN * 0.55;
const LATE = S.filter((s) => s.t >= T0);

// 1) surges fired
const surges = last.surges;

// 2) size-lead changes, 3% hysteresis — barred on the stretch, reported for both
const crossings = (arr) => {
  let side = null, n = 0; const at = [];
  for (const s of arr) {
    const f = famR(s); if (!f || !s.pR) continue;
    const ratio = f / s.pR;
    const next = ratio > 1.03 ? 'family' : ratio < 0.97 ? 'player' : null;
    if (next && side && next !== side) { n++; at.push({ t: s.t, to: next }); }
    if (next) side = next;
  }
  return { n, at };
};
const allX = crossings(S), lateX = crossings(LATE);
const changes = lateX.n, flips = lateX.at;

// 3) "larger -> eatable" arcs, per rival: seen above pr*BITE_K (its bite gate
//    open on you), later seen below pr/BITE_K (your swallow gate open on it)
const arc = {};
for (const s of LATE) for (const r of s.rivals) {
  const a = (arc[r.n] ??= { larger: false, done: false, tL: 0, tE: 0 });
  if (!a.larger && r.r > s.pR * BITE_K) { a.larger = true; a.tL = s.t; }
  else if (a.larger && !a.done && r.r < s.pR / BITE_K) { a.done = true; a.tE = s.t; }
}
const arcsDone = Object.entries(arc).filter(([, a]) => a.done);

// 3b) WHO CLOSED THE ARC — the player, or the clock? (correction C-G.)
//     The pin is BITE-margin-clearing at surge start and NEVER tracks, so a
//     player who "went and consumed" reaches 1.2 x 1.26 = 1.512x the radius
//     they had when it opened and eats the rival on its own terms; a player who
//     ate nothing gets the same arc handed to them by the 3.5%/s sag. Both look
//     identical in arcsDone. This reports which one happened, over the surge's
//     own span rather than the whole match, because that is what the label says.
//     NO BAR, deliberately: props do not move lawCap — only feastR does, at
//     0.69 units per sibling eaten through a 0.11 units/s limiter — so whether
//     1.51x is reachable inside a hold is exactly what a landing run is FOR.
//     Guessing a bar here is the qa/blackprops.mjs mistake.
let pR0 = 0, pRmax = 0, surgeStart = 0, surgeEnd = 0;
for (const s of S) if (s.rivals.some((r) => r.surge)) { if (!surgeStart) { surgeStart = s.t; pR0 = s.pR; } surgeEnd = s.t; }
for (const s of S) if (surgeStart && s.t >= surgeStart && s.t <= surgeEnd + 20 && s.pR > pRmax) pRmax = s.pR;
const earnedK = pR0 ? pRmax / pR0 : 0;

// 3c) THE PIN AGAINST THE PLAYER'S OWN GROWTH. The design's claim is that
//     surgeR = pr*1.26 "clears the bite gate's 1.2 with margin". That is only
//     true if the rival ARRIVES at the pin: it eases in at `min(1, dt*0.55)`,
//     a ~1.8s time constant, while the player keeps growing under a rate
//     limiter that allows 0.11 units/s. At small radii 0.11 units/s is a large
//     percentage, so this prints what the pin was worth by the time it was
//     reached, which is the number the bite gate actually sees.
//     famPeak and peakK follow the SURGED RIVAL BY NAME. famR() is a max over
//     the whole family, and late in a match the ordinary 0.80x softCap on a
//     radius-12 player is a bigger number than any surge — reading the max
//     would credit the surge with a sibling that never surged.
let peakK = 0, peakT = 0, famPeak = 0, sName = '';
for (const s of LATE) for (const r of s.rivals) {
  if (!r.surge || !s.pR) continue;
  if (!sName) sName = r.n;
  if (r.n !== sName) continue;
  if (r.r / s.pR > peakK) { peakK = r.r / s.pR; peakT = s.t; }
  if (r.r > famPeak) famPeak = r.r;
}

// 4) how long the family held the size lead, in MATCH SECONDS — the barred
//    figure is the stretch; the opening is reported separately because it is a
//    pre-existing, authored fact of softCap and not this patch's doing.
let largerLate = 0, largerEarly = 0;
for (let i = 1; i < S.length; i++) {
  if (famR(S[i]) <= S[i].pR) continue;
  const d = S[i].t - S[i - 1].t;
  if (S[i].t >= T0) largerLate += d; else largerEarly += d;
}

// 5) still surging at the whistle?
const surgingAtEnd = last.rivals.some((r) => r.surge);

// 6) demotions and mercy spacing — from the HANDLER'S OWN COUNTER (C-D), never
//    a stage poll. A monotonic counter cannot miss an event however short it
//    is; only the GAP loses resolution, and 0.5s is ample against a 3.5s bar.
let demos = 0, lastDemoT = -99, minGap = 99;
for (let i = 1; i < S.length; i++) if (S[i].dems > S[i - 1].dems) {
  demos += S[i].dems - S[i - 1].dems;
  if (lastDemoT > 0) minGap = Math.min(minGap, S[i].t - lastDemoT);
  lastDemoT = S[i].t;
}
// this probe fires exactly one bite of its own; B7 is about the ones the GAME
// fired. (B8 keeps all of them — the mercy window is global and applies to the
// forced bite too, so a real bite landing 2s after it is a real rail failure.)
const organic = Math.max(0, demos - (K ? 1 : 0));

// 7) DID THE LOSS STICK? — per-frame trace off the forced bite.
//    halfBackT is the bar on the hold itself: how long before the radius has
//    won back HALF the ground the bite took. Inside the hold the only way up is
//    eating, at <=0.11 units/s; outside it, the score floor jumps the whole way
//    in one frame and is not rate-limited (it runs AFTER `lastR = radius`).
let stickT = -1, halfBackT = -1, rAt05 = -1, stAt05 = -1, rAt3 = -1, stAt3 = -1;
if (K && K.trace.length) {
  const t0 = K.pre.t;
  const half = K.after.r + 0.5 * (K.pre.r - K.after.r);
  const up = K.trace.find((f) => f.r >= half);
  halfBackT = Math.max(0, up ? up.t - t0 : K.trace[K.trace.length - 1].t - t0);
  const back = K.trace.find((f) => f.stage >= K.pre.stage);
  stickT = Math.max(0, back ? back.t - t0 : K.trace[K.trace.length - 1].t - t0);
  const at = (dt) => K.trace.reduce((a, f) => (Math.abs(f.t - (t0 + dt)) < Math.abs(a.t - (t0 + dt)) ? f : a));
  const f05 = at(0.5), f3 = at(3.0);
  rAt05 = f05.r; stAt05 = f05.stage; rAt3 = f3.r; stAt3 = f3.stage;
}

// ── the record ──────────────────────────────────────────────────────────────
console.log(`\n${WORLD} — ${S.length} samples over ${last.t}s of a ${LEN}s match\n`);
console.log('     t     pR   famR(max non-hunter)          surge?  stage');
for (const s of S.filter((_, i) => i % 20 === 0 || i === S.length - 1)) {
  const f = famR(s);
  console.log(`${String(s.t).padStart(6)} ${String(s.pR).padStart(6)} ${String(f).padStart(10)}`
    + `  (${(f && s.pR ? f / s.pR : 0).toFixed(2)}x)`
    + ` ${s.rivals.some((r) => r.surge) ? '   SURGE' : '        '}  ${s.stage}`);
}

console.log(`\n══ DOES IT SWING?`);
console.log(`  surges fired               ${surges}`);
console.log(`  size-lead changes (3% hys) ${changes} in the stretch (t>=${T0.toFixed(0)}s)`
  + `, ${allX.n} over the whole match`
  + (allX.at.length ? ` — ${allX.at.map((f) => `t=${f.t}->${f.to}`).join(', ')}` : ''));
console.log(`  larger->eatable arcs       ${arcsDone.length}`
  + (arcsDone.length ? ` — ${arcsDone.map(([n, a]) => `${n} (>${BITE_K}x @${a.tL}s, eatable @${a.tE}s)`).join(', ')}` : ''));
console.log(`  who closed the arc         player r ${pR0.toFixed(2)} -> ${pRmax.toFixed(2)} across the surge`
  + ` = ${earnedK.toFixed(2)}x  (>=1.51x means the player ate past the pin; below, the sag handed it back)`);
console.log(`  the surged rival           ${sName || '(none)'}: peaked at ${peakK.toFixed(3)}x the player`
  + ` at t=${peakT}s, r ${famPeak.toFixed(2)} against a pin of ${pR0.toFixed(2)} x 1.26 =`
  + ` ${(pR0 * 1.26).toFixed(2)} — the bite gate needs ${BITE_K}x`);
console.log(`  family held the size lead  ${largerLate.toFixed(1)}s in the stretch`
  + `  (+${largerEarly.toFixed(1)}s in the opening, which is softCap's 1.6 term, not the surge)`);
console.log(`  still surging at the end   ${surgingAtEnd ? 'YES' : 'no'}`);

console.log(`\n══ DOES A FORM LOSS STICK? (one bite forced through the real handler)`);
if (!K) {
  console.log('  the forced bite never landed — no conclusion on this clause');
} else {
  console.log(`  bite at t=${K.pre.t.toFixed(2)}s, try ${K.tries}: r ${K.pre.r.toFixed(3)} -> ${K.after.r.toFixed(3)},`
    + ` form ${K.pre.stage} -> ${K.after.stage}`);
  console.log(`  bite +0.5s: r ${rAt05.toFixed(3)}  form ${stAt05}`);
  console.log(`  bite +3.0s: r ${rAt3.toFixed(3)}  form ${stAt3}`);
  console.log(`  half the ${(K.pre.r - K.after.r).toFixed(3)}-unit drop was back after`
    + ` ${halfBackT.toFixed(2)} match seconds   <- B6a, the hold itself`);
  console.log(`  the FORM stayed lost for ${stickT.toFixed(2)} match seconds`
    + `   <- B6b, what the child sees   (${K.trace.length} frames traced)`);
}

console.log(`\n══ THE KID-MERCY RAILS`);
console.log(`  demotions: ${demos} total, ${organic} the game fired`
  + (demos >= 2 ? `, closest pair ${minGap.toFixed(1)}s apart` : ''));
console.log(`  bites: ${last.bites}   family prop bites: ${last.ateFam}`);

// ── the bars, both ends ─────────────────────────────────────────────────────
const fails = [];
if (surges < 1) fails.push('B1 surges 0 < 1 — the mechanism never fired (this is what a pre-patch build reads)');
if (changes < 2) fails.push(`B2 lead changes in the stretch ${changes} < 2 — no back-and-forth: the lead must go AND come back`);
if (!arcsDone.length) fails.push(`B3 no rival went above ${BITE_K}x and back below in the stretch — "go and consume and come back" is unproven`);
if (largerLate > 45) fails.push(`B4 the family was larger for ${largerLate.toFixed(1)}s of the stretch > 45 — a wall, not a swing`);
if (surgingAtEnd) fails.push('B5 a rival was still surging at the whistle — the sag stalled, and the finale feast needs the family eatable');
if (!K) fails.push('B6 the forced bite never landed before 50% of the clock — the stick clause has no reading, and silence is a fail');
else {
  if (halfBackT < 2.0) fails.push(`B6a half the radius drop was back in ${halfBackT.toFixed(2)}s < 2.0 — the score floor handed it straight back`);
  if (stickT < 2.0) fails.push(`B6b the form loss lasted ${stickT.toFixed(2)}s < 2.0 — the demotion is not something a child can see`);
}
if (organic > 8) fails.push(`B7 ${organic} demotions > 8 — above the arithmetic ceiling, a mercy rail is broken`);
if (demos >= 2 && minGap < 3.5) fails.push(`B8 two demotions ${minGap.toFixed(1)}s apart < 3.5 — inside one global mercy window`);

if (fails.length) {
  console.log(`\nRIVALSWING: FAIL`);
  for (const f of fails) console.log(`  - ${f}`);
  process.exit(1);
}
console.log(`\nRIVALSWING: PASS — the match swings, the swing completes, the form loss sticks,`
  + ` and the mercy rails held`);
