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
//   B. THE SKY FILLS.  Airborne envelopes at fixed match times (SEED=7):
//      1:30 >= 30, 2:40 >= 70, 3:00 >= 90. An envelope is airborne when its
//      mesh sits above y = 2. Needs from the mechanic: every envelope mesh
//      carries `userData.balloon = { id, stage }` so the probe can find them
//      without guessing from radius.
//
//   C. THE LAST HANDFUL NEVER LEAVE.  At 3:00 at least 8 envelopes are still
//      on the ground (y < 1), visible and uneaten. There is always something
//      to eat; the game never moves the child's dinner.
//
//   D. THE TELEGRAPH PAYS.  Every departure was edible for >= 8 s between its
//      first burner pulse and leaving the ground, and no two departures were
//      closer than 6 s before the whale beat. Needs from the mechanic:
//      `userData.balloon.telegraphAt` and `.departAt` (match seconds), set as
//      they happen.
//
// --quick stops after bar A and one 20-second airborne sample, for iterating
// on the mechanic; the full run is a real 3:00 match, which under swiftshader
// in this container is about 27 minutes of wall clock.
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
    await p.evaluate(() => window.__depart(3));
    await p.waitForTimeout(300);
    const c1 = await census();
    const dPct = c1.devouredPct - c0.devouredPct, dMass = c0.initialMass - c1.initialMass;
    if (dPct !== 0) fail('A', `devouredPct moved by ${dPct} on a departure — the sky is being credited to the child`);
    else if (dMass !== 3) fail('A', `initialMass fell by ${dMass}, not 3 — departed balloons are not leaving the denominator`);
    else ok('A', `3 departures: devouredPct unchanged, initialMass ${c0.initialMass} -> ${c1.initialMass}`);
  }
}

// ── B, C, D over the match clock ────────────────────────────────────────────
const airborne = (c) => c.env.filter((e) => e.vis && !e.eaten && e.y > 2).length;
const grounded = (c) => c.env.filter((e) => e.vis && !e.eaten && e.y < 1).length;
const BARS = QUICK ? [[20, 1]] : [[90, 30], [160, 70], [180, 90]];
let last = null;
for (const [t, want] of BARS) {
  await untilT(t);
  const c = await census();
  last = c;
  const n = airborne(c);
  const mm = `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
  if (n >= want) ok('B', `${mm}: ${n} airborne (bar ${want})`);
  else fail('B', `${mm}: ${n} airborne against a bar of ${want}`);
}
if (!QUICK && last) {
  const g = grounded(last);
  if (g >= 8) ok('C', `3:00: ${g} envelopes still on the ground and edible`);
  else fail('C', `3:00: only ${g} envelopes left on the ground — the last handful must never leave`);

  const deps = last.env.filter((e) => e.departAt !== null).sort((a, b) => a.departAt - b.departAt);
  if (!deps.length) fail('D', 'no envelope carries departAt — departures are not being recorded');
  else {
    const short = deps.filter((e) => e.telegraphAt === null || e.departAt - e.telegraphAt < 8);
    let crowded = 0;
    for (let i = 1; i < deps.length; i++) if (deps[i].departAt < 148 && deps[i].departAt - deps[i - 1].departAt < 6) crowded++;
    if (short.length) fail('D', `${short.length} of ${deps.length} departures were edible for under 8 s after their first burner pulse`);
    else if (crowded) fail('D', `${crowded} departure(s) came within 6 s of the previous one before the whale beat — a wave, not one at a time`);
    else ok('D', `${deps.length} departures, every one telegraphed >= 8 s, none closer than 6 s before the whale`);
  }
}

await b.close();
console.log('');
console.log(fails.length
  ? `FAIL — ascension: ${fails.length} bar(s) short on ${WORLD}; the tagline says "get them before they go up"`
  : `PASS — ascension: the third state holds, the sky fills, the last handful stay, and every departure pays`);
process.exit(fails.length ? 1 : 0);
