// ASCENSION — the probe before the mechanic. (brief §3B; world6.design.md:106, :204)
//
// SKYLARK FIELD's tagline is "get them before they go up", and on the day this
// was written nothing on it had ever gone up. The design doc said, before a
// line of the world existed: "Settle the ascension in code — the third prop
// state — before the mechanic is built, and write the probe first." This is
// that probe. It FAILS on the shipped world in four separate ways, and each
// failure names the thing the mechanic has to add.
//
//   node qa/ascension.mjs [port] [world=skylark] [--quick]
//
// THE FOUR BARS
//
//   A. THE THIRD STATE.  An edible today is eaten or not, and devouredPct is
//      consumed / initialMass with initialMass only ever ratcheting UP
//      (prototype3d.ts:4674-4675). A departed balloon must be a THIRD state
//      that leaves the numerator AND the denominator, or the end card credits
//      the child with the sky. Measured: call window.__depart(3), and
//      devouredPct must not move while initialMass drops by exactly 3.
//      Needs from the mechanic: `__depart(n)`, and `devouredPct` +
//      `initialMass` on `__matchState()`.
//
//   B. THE SKY FILLS.  Field envelopes airborne at fixed match times (SEED=7):
//      1:00 >= 4, 1:30 >= 8, 2:28 >= 16, 2:40 >= 18, 3:00 >= 35. An envelope
//      is airborne when its mesh sits above y = 2; only stages 1-4 count (a
//      bag never flies; the distant sprites, stage 5, are scenery and never
//      count). Needs from the mechanic: every envelope mesh carries
//      `userData.balloon = { id, stage }` so the probe can find them without
//      guessing from radius.
//      CORRECTED: the first draft asked 30/70/90, copied from the brief's
//      table, which its own rule (bar D, one departure every >= 6 s) makes
//      impossible — 11 by 1:30 is the ceiling. The rule is the game; the
//      numbers were wrong. brief §3B carries the correction.
//
//   C. THE LAST HANDFUL NEVER LEAVE.  At 3:00 at least 8 envelopes of stage
//      1-4 (a bag does not count — it could never have left) are still on the
//      ground (y < 1), visible and uneaten. There is always something to eat;
//      the game never moves the child's dinner.
//
//   D. THE TELEGRAPH PAYS.  Every departure was edible for >= 8 s between its
//      first burner pulse and leaving the ground, and no two departures were
//      closer than 6 s before the whale beat. Needs from the mechanic:
//      `userData.balloon.telegraphAt` and `.departAt` (match seconds), set as
//      they happen.
//
// --quick stops after bar A and one airborne sample at 0:34, for iterating
// on the mechanic; the full run is a real 3:00 match, which under swiftshader
// in this container is about 27 minutes of wall clock. (Since the retraction
// below, --quick runs A and the Great Bell's cascade instead.)
//
// ── RETRACTION (GOVERNOR rule 3b), 2026-09-25: B AND D, WITH THE WHALE ───
// The airfield became BELLCLOUD HEIGHTS (docs/BELLCLOUD.md §10.1) and the
// whale is gone. B's 2:28-3:00 figures (16 / 18 / 35 airborne) measured the
// whale's cascade, which her beat started; D's "before the whale beat" named
// her card as the end of the one-at-a-time rule. On the kingdom they would
// move for the wrong reason — the balloons are visitors docked along the edge
// now, and the cascade starts when the child EATS THE GREAT BELL (life.ts's
// 'bell' cue, sent from prototype3d.ts's biteSinks on the drop). So:
//
//   B' 1:00 >= 3 and 1:30 >= 6 airborne (the one-at-a-time rule, one
//      departure every >= 6 s after the first at 0:30); and 25 match seconds
//      after the bell's cascade starts, at least 50% of the flyable balloons
//      (stage 1-3, not one of the tethered eight) that were still on the
//      ground when it started have lifted. The bell is eaten through the
//      game's own capture() (window.__eatLandmark), so the cue is the game's.
//   D' every departure telegraphed >= 8 s (unchanged), and none closer than
//      6 s to the one before it BEFORE THE BELL.
//   A and C are unchanged. --quick runs A and the bell's cascade only.
import { chromium } from 'playwright';
import { ALL_WORLDS } from './worlds.mjs';

const A = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const F = process.argv.slice(2).filter((a) => a.startsWith('--'));
const PORT = A[0] || '4177';
const WORLD = A[1] || 'skylark';
const QUICK = F.includes('--quick');
const SEED = 7;

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
p.on('pageerror', (e) => console.log(`  [pageerror] ${e.message.split('\n')[0]}`));
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(({ seed, unlock }) => {
  try { localStorage.clear(); localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1'); localStorage.setItem('voidUnlocked', unlock); } catch { }
  let s = seed >>> 0; Math.random = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}, { seed: SEED, unlock: ALL_WORLDS.join(',') });
await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 600000 });
await p.evaluate(() => document.getElementById('btnPlay')?.click());
await p.waitForTimeout(1500);
await p.evaluate((w) => document.querySelector(`#worldRow .wCard[data-world="${w}"]`)?.click(), WORLD);
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 2, null, { timeout: 600000 });

const fails = [];
const fail = (bar, why) => { fails.push(`${bar}: ${why}`); console.log(`  ✗ ${bar} — ${why}`); };
const ok = (bar, what) => console.log(`  ok ${bar} — ${what}`);

/** the census the whole probe reads: every tagged envelope, where it is, and
 *  the mechanic's own timestamps on it. */
const census = () => p.evaluate(() => {
  const st = window.__matchState();
  const out = { t: st.t, devouredPct: st.devouredPct, initialMass: st.initialMass, hasDepart: typeof window.__depart === 'function', env: [] };
  window.__scene.traverse((o) => {
    const bl = o.userData?.balloon; if (!bl) return;
    out.env.push({ id: bl.id, stage: bl.stage, y: o.position.y, vis: o.visible, telegraphAt: bl.telegraphAt ?? null, departAt: bl.departAt ?? null, eaten: !!o.userData.eaten });
  });
  return out;
});
const untilT = (t) => p.waitForFunction((tt) => (window.__matchState?.().t ?? 0) >= tt, t, { timeout: 2400000, polling: 500 });

// ── A. THE THIRD STATE ──────────────────────────────────────────────────────
{
  const c0 = await census();
  if (!c0.env.length) fail('A', 'no envelope carries userData.balloon — the kit does not tag its balloons, so nothing here can be counted');
  if (c0.devouredPct === undefined || c0.initialMass === undefined) {
    fail('A', '__matchState() does not expose devouredPct / initialMass — the accounting cannot be observed');
  } else if (!c0.hasDepart) {
    fail('A', 'window.__depart(n) does not exist — there is no third state to test');
  } else {
    const marked = await p.evaluate(() => window.__depart(3));
    // the meter is refreshed by refreshHud() every 0.2 s of MATCH time, which
    // under swiftshader is ~2 s of wall clock: wait for it to move, not 300 ms
    await p.waitForFunction((m0) => window.__matchState().initialMass !== m0, c0.initialMass, { timeout: 15000 }).catch(() => { });
    const c1 = await census();
    if (marked !== 3) fail('A', `__depart(3) marked ${marked} balloons — not enough tagged, visible, uneaten envelopes to test on`);
    const dPct = c1.devouredPct - c0.devouredPct, dMass = c0.initialMass - c1.initialMass;
    if (dPct !== 0) fail('A', `devouredPct moved by ${dPct} on a departure — the sky is being credited to the child`);
    else if (dMass !== 3) fail('A', `initialMass fell by ${dMass}, not 3 — departed balloons are not leaving the denominator`);
    else ok('A', `3 departures: devouredPct unchanged, initialMass ${c0.initialMass} -> ${c1.initialMass}`);
  }
}

// ── B', C, D' over the match clock ──────────────────────────────────────────
const field = (e) => e.stage >= 1 && e.stage <= 4;
const airborne = (c) => c.env.filter((e) => field(e) && e.vis && !e.eaten && e.y > 2).length;
const grounded = (c) => c.env.filter((e) => field(e) && e.vis && !e.eaten && e.y < 1).length;
const BARS = QUICK ? [] : [[60, 3], [90, 6]];
let last = null;
for (const [t, want] of BARS) {
  await untilT(t);
  const c = await census();
  last = c;
  const n = airborne(c);
  const mm = `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
  if (n >= want) ok('B\'', `${mm}: ${n} airborne (bar ${want})`);
  else fail('B\'', `${mm}: ${n} airborne against a bar of ${want}`);
}
// THE BELL IS RUNG. Eaten through capture(); the cue fires on the drop, and
// the controller's own `cascade` flag says when it started.
let bellAt = null;
{
  const lm = await p.evaluate(() => window.__eatLandmark?.() ?? null);
  if (!lm || lm.name !== 'great bell') fail('B\'', `__eatLandmark() ate ${lm ? `'${lm.name}'` : 'nothing'}, not the Great Bell`);
  else {
    const started = await p.waitForFunction(() => window.__asc?.state().cascade === true, null, { timeout: 900000, polling: 500 }).then(() => true).catch(() => false);
    if (!started) fail('B\'', 'the Great Bell was eaten and the balloons\' cascade never started (life.ts \'bell\' cue)');
    else {
      const s0 = await p.evaluate(() => ({ t: window.__matchState().t, ph: window.__asc.phases() }));
      bellAt = s0.t;
      const waiting = s0.ph.filter((e) => e.stage >= 1 && e.stage <= 3 && !e.keep && !e.eaten && !e.departed && e.phase === 0 && e.alt === 0).map((e) => e.id);
      await untilT(s0.t + 25);
      const ph = await p.evaluate(() => window.__asc.phases());
      const lifted = ph.filter((e) => waiting.includes(e.id) && (e.departed || e.alt > 2)).length;
      const share = waiting.length ? lifted / waiting.length : 0;
      const line = `25 s after the bell (match ${s0.t.toFixed(1)} s): ${lifted} of ${waiting.length} grounded flyable balloons lifted (${(share * 100).toFixed(0)}%, bar 50%)`;
      if (share >= 0.5) ok('B\'', line); else fail('B\'', line);
    }
  }
}
if (!QUICK) { await untilT(180); last = await census(); }
if (!QUICK && last) {
  const g = grounded(last);
  if (g >= 8) ok('C', `3:00: ${g} envelopes still on the ground and edible`);
  else fail('C', `3:00: only ${g} envelopes left on the ground — the last handful must never leave`);

  const deps = last.env.filter((e) => e.departAt !== null).sort((a, b) => a.departAt - b.departAt);
  if (!deps.length) fail('D', 'no envelope carries departAt — departures are not being recorded');
  else {
    const short = deps.filter((e) => e.telegraphAt === null || e.departAt - e.telegraphAt < 8);
    let crowded = 0;
    const cut = bellAt ?? Infinity;
    for (let i = 1; i < deps.length; i++) if (deps[i].departAt < cut && deps[i].departAt - deps[i - 1].departAt < 6) crowded++;
    if (short.length) fail('D\'', `${short.length} of ${deps.length} departures were edible for under 8 s after their first burner pulse`);
    else if (crowded) fail('D\'', `${crowded} departure(s) came within 6 s of the previous one before the bell — a wave, not one at a time`);
    else ok('D\'', `${deps.length} departures, every one telegraphed >= 8 s, none closer than 6 s before the bell`);
  }
}

await b.close();
console.log('');
console.log(fails.length
  ? `FAIL — ascension: ${fails.length} bar(s) short on ${WORLD}`
  : QUICK
    ? `PASS — ascension --quick: the third state holds and the balloons lift together when the Great Bell is rung (B' 1:00/1:30, C and D' need the full run)`
    : `PASS — ascension: the third state holds, the balloons lift one at a time and all together when the Great Bell is rung, the last handful stay, and every departure pays`);
process.exit(fails.length ? 1 : 0);
