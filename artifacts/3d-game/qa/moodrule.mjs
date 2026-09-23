// NO FACE SQUINTS OPEN — the mood table's eye rule.
//
//   node qa/moodrule.mjs                 the table, read out of void3d.ts (node only)
//   node qa/moodrule.mjs [port] [world]  …and the same rule on the live rig, off
//                                        faceState().lid / .shut, in a real match
//
// Studio round 4, Job 8 (HERO). The eye in void3d.ts has two knobs that look
// alike and are not: `lid` squashes the whole eye vertically, and `shut`
// fades the white and the pupil out, leaving only the dark backing disc. A low
// lid with the eye still OPEN draws a thin white slit with a dark dash in it,
// and this game has already shipped that face twice and taken it back twice.
// Both retractions are written into the MOODS table itself:
//
//   · sleepy at lid 0.26, open: "read as dazed — half-lidded and staring —
//     with Zzz floating over it". Fixed by `shut: 1`.
//   · smug at lid 0.55, open: "At 47px on a phone it is DROWSY". The owner:
//     "When the void eats family he has this half asleep reaction." Fixed by
//     opening the eye to 0.96.
//
// Hurt was lid 0.3, open. That is the same slit, on the face a child sees every
// time something bites her — and what she reads is not "ow", it is the dazed
// face the sleepy note already names. A hurt cartoon screws its eyes SHUT.
//
// ── THE RULE ────────────────────────────────────────────────────────────────
// For every mood, with the mood's own targets merged over the rig's base face
// exactly as the mood engine merges them (`{ ...BASE, ...MOODS[mood] }`):
//   1. an OPEN eye (shut < 0.5) holds its lid at LID_OPEN_MIN or above. 0.6
//      sits just over the recorded failure — smug's old 0.55, read as drowsy —
//      and every open eye the table draws after this change is at 0.96 or
//      above, so the bar touches nothing that ships except the face it is for.
//   2. a SHUT eye (shut >= 0.5) is a line, so its lid stays at or under
//      LID_SHUT_MAX. A shut eye at a tall lid is a dark disc — a black eye, not
//      a closed one. 0.25 — a quarter of the eye's height — is SET, not
//      measured, and says so: the two closed faces this game draws sit at 0.13
//      (sleepy) and 0.20 (hurt), and nobody has yet photographed where between
//      0.25 and 1 a squashed dark disc stops reading as a line. If this bar is
//      ever argued with, the argument is settled by a moodsheet frame, not here.
// The thresholds are on the TARGETS, not on the lerp: the crossfade between two
// legal faces passes through illegal ones for a few frames by construction,
// and the rig fades `shut` and `lid` at the same rate, so that is a blink, not
// a face.
//
// The live half exists because a table is not a frame: it pins each mood with
// __setMood, waits on the GAME clock for the lerp to land (k = dt·9, so 0.6
// game-seconds is 99.5% of the way — never wall time, which runs ~14x faster
// than the match clock under swiftshader), and reads the rig's own lid and shut
// back. A build whose faceState() does not report them FAILS — it predates the
// hook, and a probe that cannot read the thing has not measured it.
import { readFileSync } from 'node:fs';

const LID_OPEN_MIN = 0.6;
const LID_SHUT_MAX = 0.25;
const SHUT_AT = 0.5;
const LIVE_TOL = 0.05;         // the lerp has landed when live is this close to the table

const PORT = process.argv[2] || null;
const WORLD = process.argv[3] || 'maple';

const SRC = readFileSync('src/proto3d/void3d.ts', 'utf8');
const fail = (msg) => { console.log(`FAIL — ${msg}`); process.exit(1); };

// ── the table ──────────────────────────────────────────────────────────────
const mpM = SRC.match(/const mp = (\{[^\n]*\});/);
if (!mpM) fail('could not find the rig\'s base face (`const mp = {...}`) in void3d.ts. The call site moved');
const moodsM = SRC.match(/const MOODS: Record<Mood, Partial<typeof mp>> = (\{[\s\S]*?\n {2}\});/);
if (!moodsM) fail('could not find the MOODS table in void3d.ts. The call site moved');
const strip = (s) => s.split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n');
let BASE, MOODS;
try {
  BASE = new Function(`return (${mpM[1]});`)();
  MOODS = new Function(`return (${strip(moodsM[1])});`)();
} catch (e) { fail(`the MOODS table did not evaluate: ${e.message}`); }
if (!('lid' in BASE) || !('shut' in BASE)) fail('the base face has no lid or no shut — the eye rig changed shape');

const verdict = (m, lid, shut) => {
  if (shut < SHUT_AT && lid < LID_OPEN_MIN) return `an OPEN eye at lid ${lid.toFixed(2)} (bar ${LID_OPEN_MIN}) — a white slit, which reads as dazed`;
  if (shut >= SHUT_AT && lid > LID_SHUT_MAX) return `a SHUT eye at lid ${lid.toFixed(2)} (bar ${LID_SHUT_MAX}) — a dark disc, which reads as a black eye`;
  return null;
};

console.log('');
console.log('  mood       lid   shut   eye      verdict');
const fails = [];
const want = {};
for (const m of Object.keys(MOODS)) {
  const t = { ...BASE, ...MOODS[m] };
  want[m] = t;
  const v = verdict(m, t.lid, t.shut);
  if (v) fails.push(`${m}: ${v}`);
  console.log(`  ${m.padEnd(9)} ${t.lid.toFixed(2).padStart(5)} ${t.shut.toFixed(2).padStart(6)}   ${t.shut >= SHUT_AT ? 'shut ' : 'open '}    ${v ? 'FAIL' : 'ok'}`);
}
console.log('');

// ── the live rig ───────────────────────────────────────────────────────────
if (PORT && !fails.length) {
  const { chromium } = await import('playwright');
  const { enterMatch } = await import('./_enter.mjs');
  const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium',
    args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
  const p = await b.newPage({ viewport: { width: 430, height: 932 } });
  p.on('pageerror', (e) => console.log('PAGEERR ' + String(e).slice(0, 140)));
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidMute', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString());
    localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder,skylark');
  } catch { /* private mode */ } });
  await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await enterMatch(p, WORLD);
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.5, null, { timeout: 900000 });
  const first = await p.evaluate(() => window.__faceState());
  if (typeof first.lid !== 'number' || typeof first.shut !== 'number') {
    await b.close();
    fail('faceState() does not report lid and shut, so the rendered eye cannot be read back. '
      + 'This build predates Job 8');
  }
  console.log('  LIVE      lid   shut   (table)');
  for (const m of Object.keys(MOODS)) {
    // the gape is eating's, not the mood's — hold it shut so the face is the mood's alone
    await p.evaluate((mm) => { window.__pinGape(0); window.__setMood(mm); }, m);
    const t0 = await p.evaluate(() => window.__matchState().tClock);
    await p.waitForFunction((t) => window.__matchState().tClock > t + 0.6, t0, { timeout: 900000 });
    const s = await p.evaluate(() => window.__faceState());
    const v = verdict(m, s.lid, s.shut);
    const landed = Math.abs(s.lid - want[m].lid) < LIVE_TOL && Math.abs(s.shut - want[m].shut) < LIVE_TOL;
    if (s.mood !== m) fails.push(`live ${m}: the rig reports mood ${s.mood} — the pin did not hold`);
    else if (!landed) fails.push(`live ${m}: lid ${s.lid.toFixed(2)} / shut ${s.shut.toFixed(2)} after 0.6 game-s, `
      + `table says ${want[m].lid.toFixed(2)} / ${want[m].shut.toFixed(2)} — the lerp never lands`);
    else if (v) fails.push(`live ${m}: ${v}`);
    console.log(`  ${m.padEnd(9)} ${s.lid.toFixed(2).padStart(5)} ${s.shut.toFixed(2).padStart(6)}   `
      + `(${want[m].lid.toFixed(2)} / ${want[m].shut.toFixed(2)})`);
  }
  await p.evaluate(() => { window.__setMood(null); });
  await b.close();
  console.log('');
}

if (fails.length) {
  for (const x of fails) console.log(`  · ${x}`);
  console.log(`\nFAIL — ${fails.length} face(s) break the eye rule`);
  process.exit(1);
}
console.log(`PASS — every mood's eye is either open at lid >= ${LID_OPEN_MIN} or shut to a line at lid <= ${LID_SHUT_MAX}`
  + (PORT ? `, on the table and on the live rig (${WORLD})` : ' (table only; pass a port for the live rig)'));
