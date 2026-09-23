// IS HE ALIVE AT SPAWN? — the hero's motion law against the speed he can steer at.
//
//   node qa/motionlaw.mjs
//
// Studio round 4, Job 8 (HERO). Everything the rig does to say "I am moving" —
// the roll-bob, the travel squash, the directional stretch in the body shader —
// hangs off one number, `moveAmt`, and moveAmt chased a target with a constant
// divisor in it (40). World speed in this game is not constant: steerCap()
// rides the camera distance, so full stick is 14.37 u/s at spawn size and
// 72.94 at r 8 — five times apart — and a constant can only be right at one of
// them. It was right at the big end: before Job 8 this probe read 0.359 at
// r 0.9, 0.304 at the tail of the descent, and 1.00 only from r 4 up.
//
// ── WHY THIS IS A MATHS PROBE AS WELL AS A BROWSER ONE ──────────────────────
// The target is a pure function of two numbers: the speed the void is moving
// at, and the speed full stick would move him at. Both are written in the
// source as expressions — steerCap(), the camera's settled distance, the
// descent's dive, the input block's `cd` — so this reads every one of them out
// of src/ and evaluates them, the way qa/evolvepop.mjs evaluates the evolution
// envelope. It carries no copy of any of them: every expression below is
// lifted from the live file, and a missing one is a FAIL, never a skip (a probe
// that silently skips what it cannot find is the same bug wearing a hat).
//
// What it MODELS rather than reads, stated so nobody mistakes it for more:
//   · full stick is a unit input (the keyboard branch normalises to exactly 1;
//     the joystick reaches jm = 1 at 58% extension), so tv = steerCap(cd);
//   · the steering blend has converged, so |v| = |tv| — the blend's own time
//     constant (91-133 ms) and the shore are the browser probe's business;
//   · SETTLED means what _dbg.__settleCam() produces: camDist = camAim =
//     targetDist, no look-up, no outro push-in;
//   · the DESCENT is sampled at 60 Hz with the frame loop's own ordering: the
//     input block and the rig both read the distance the camera block wrote on
//     the PREVIOUS frame, and during the dive targetDist IS camDist.
// qa/heromotion.mjs is the live half: it holds a key down in a real match and
// reads faceState().move off the rig.
//
// THE BAR is the spec's: at full stick, motion must reach 0.85 — at spawn size
// (r 0.9), at r 8, and here at every radius a match can reach, including the
// first 1.2 s of every match, the descent, which is the "at spawn" the job is
// named for. 0.85 because the new law divides by 0.85·vRef: a void doing 85% of
// his own top speed reads as fully moving, which is the headroom the camera's
// ease and the steering blend need.
import { readFileSync } from 'node:fs';

const MIN_MOVE = 0.85;
const SPOTS = [0.9, 8];          // the spec's two named sizes

const VOID = readFileSync('src/proto3d/void3d.ts', 'utf8');
const GAME = readFileSync('src/prototype3d.ts', 'utf8');

const need = (src, re, what) => {
  const m = src.match(re);
  if (!m) {
    console.log(`FAIL — could not find ${what}. The call site moved; re-point this probe `
      + 'rather than letting it pass on nothing');
    process.exit(1);
  }
  return m;
};
// A sloppy-mode Function so `with` can supply the scope: the expressions are
// evaluated exactly as written, against named values, with nothing renamed.
const expr = (src, what) => {
  try { return new Function('S', `with (S) { return (${src}); }`); }
  catch (e) { console.log(`FAIL — ${what} did not parse: ${e.message}\n  ${src}`); process.exit(1); }
};
const run = (f, scope, what) => {
  const v = f(scope);
  if (!Number.isFinite(v)) { console.log(`FAIL — ${what} is not finite (${v})`); process.exit(1); }
  return v;
};

// ── the rig (void3d.ts) ────────────────────────────────────────────────────
const target = expr(need(VOID, /moveAmt \+= \((.+?) - moveAmt\) \* Math\.min\(1, dt \* \d+\);/,
  'the moveAmt target in void3d.ts update()')[1], 'the motion target');
const rigDefault = VOID.match(/const vRef = s\.vRef \?\? ([\d.]+);/);
const flipLine = need(VOID, /if \(speed > (.+?) && pm > .+? < -0\.25\) flipT = /, 'the direction-flip trigger')[1];
const flipAt = expr(flipLine, 'the flip threshold');
const lean = expr(need(VOID, /bob\.rotation\.z = THREE\.MathUtils\.clamp\((.+?), -0\.11, 0\.11\);/,
  'the travel lean on bob.rotation.z')[1], 'the lean');

// ── the game (prototype3d.ts) ──────────────────────────────────────────────
const SPAWN_SPEED = Number(need(GAME, /const SPAWN_SPEED = ([\d.]+);/, 'SPAWN_SPEED')[1]);
const PLAY_DIST = Number(need(GAME, /const PLAY_DIST = .*\|\| ([\d.]+);/, 'PLAY_DIST')[1]);
const steerBody = expr(need(GAME, /function steerCap\(camDist: number\): number \{ return (.+?); \}/, 'steerCap()')[1], 'steerCap');
const steerCap = (camDist) => run(steerBody, { Math, SPAWN_SPEED, PLAY_DIST, camDist }, 'steerCap');
const settledF = expr(need(GAME, /let targetDist = (Math\.min\(340.+?);\n/, "the camera's settled distance (targetDist)")[1], 'targetDist');
const settled = (R) => run(settledF, { Math, PLAY_DIST, R }, 'targetDist');
const DESCENT_LEN = Number(need(GAME, /const DESCENT_LEN = ([\d.]+);/, 'DESCENT_LEN')[1]);
const DESCENT_SCALE = Number(need(GAME, /const DESCENT_SCALE = ([\d.]+);/, 'DESCENT_SCALE')[1]);
need(GAME, /const DESCENT_END = PLAY_DIST;/, 'DESCENT_END = PLAY_DIST');
const DESCENT_END = PLAY_DIST, DESCENT_START = DESCENT_END * DESCENT_SCALE;
const dive = need(GAME, /const p = (Math\.max\(0, Math\.min\(1, 1 - introT \/ DESCENT_LEN\)\));\s*const eased = (.+?);\s*camDist = (DESCENT_START \+ .+?);/,
  "the descent's dive (p, eased, camDist)");
const diveP = expr(dive[1], 'descent p'), diveE = expr(dive[2], 'descent eased'), diveD = expr(dive[3], 'descent camDist');
const diveAt = (introT) => {
  const p = run(diveP, { Math, introT, DESCENT_LEN }, 'descent p');
  const eased = run(diveE, { Math, p }, 'descent eased');
  return run(diveD, { DESCENT_START, DESCENT_END, eased }, 'descent camDist');
};
const easeRate = Number(need(GAME, /camDist \+= \(targetDist - camDist\) \* \(1 - Math\.exp\(-([\d.]+) \* dt\)\);/,
  "the camera's ease toward targetDist")[1]);
// The input block's `cd` — the distance the steering reads — and whatever it
// leans on. steerLawD exists only once Job 8 hoisted the size law out of it.
const cdF = expr(need(GAME, /const cd = ([\s\S]+?);\n\s*const speed = steerCap\(cd\) \* jm;/, "the input block's cd")[1]
  .replace(/\s+/g, ' '), 'cd');
const lawLine = GAME.match(/const steerLawD = (.+?);\n/);
const lawF = lawLine ? expr(lawLine[1], 'steerLawD') : null;
// …and the reference the frame loop hands the rig, if it hands one at all.
const call = need(GAME, /voidling\.update\(dtw, \{([\s\S]+?)\}\);/, 'the frame loop\'s voidling.update() call')[1];
const passKey = call.match(/vRef: (\w+)/);
let aimF = null, refF = null;
if (passKey) {
  const def = (name) => expr(need(GAME, new RegExp(`const ${name} = (.+?);\\n`), `the definition of ${name}`)[1], name);
  refF = def(passKey[1]);
  const uses = GAME.match(new RegExp(`const ${passKey[1]} = (.+?);\\n`))[1];
  const inner = uses.match(/\b(hero\w+)\b/);
  if (inner) aimF = [inner[1], def(inner[1])];
}

/** One frame's view of the world: what the steering reads, what the rig is
 *  handed, and what the rig makes of full stick. */
function frame({ R, introT, camDist, camAim }) {
  const S = { Math, R, introT, camDist, camAim, PLAY_DIST, steerCap, voidling: { radius: R } };
  if (lawF) S.steerLawD = run(lawF, S, 'steerLawD');
  const speed = steerCap(run(cdF, S, 'cd'));
  let vRef;
  if (refF) {
    if (aimF) S[aimF[0]] = run(aimF[1], S, aimF[0]);
    vRef = run(refF, S, 'the frame loop\'s vRef');
  } else if (rigDefault) vRef = Number(rigDefault[1]);
  const T = { Math, speed, vRef, s: { vx: speed, vz: 0, vRef } };
  return {
    speed, vRef,
    move: run(target, T, 'the motion target'),
    flip: run(flipAt, T, 'the flip threshold'),
    // the clamp's bounds are part of the regex above, so they are the file's
    lean: Math.min(0.11, Math.abs(run(lean, T, 'the lean'))),
  };
}

// ── 1. SETTLED, at every radius a match can reach ──────────────────────────
const R_CAP = Number(need(GAME, /const R_CAP = ([\d.]+);/, 'R_CAP')[1]);
const rows = [];
for (let R = 0.9; R <= R_CAP + 1e-9; R = Math.round((R + 0.1) * 10) / 10) {
  const d = settled(R);
  rows.push({ R, d, ...frame({ R, introT: 0, camDist: d, camAim: d }) });
}
for (const R of SPOTS) if (!rows.some((r) => Math.abs(r.R - R) < 1e-9)) {
  const d = settled(R); rows.push({ R, d, ...frame({ R, introT: 0, camDist: d, camAim: d }) });
}

// ── 2. THE DESCENT, at spawn size, then the camera's settle after it ───────
// Frame k reads what the camera block wrote on frame k-1. During the dive the
// block writes camDist = dive(introT) and targetDist = camDist, so both read
// the dive; once introT runs out, camAim takes the settled law at once and
// camDist eases to it at the block's own rate.
const R0 = 0.9, DT = 1 / 60;
const descent = [];
for (let introT = DESCENT_LEN - DT; introT > 1e-9; introT -= DT) {
  const d = diveAt(introT);
  descent.push({ t: DESCENT_LEN - introT, d, ...frame({ R: R0, introT, camDist: d, camAim: d }) });
}
{
  let cam = DESCENT_END; const aim = settled(R0);
  for (let t = 0; t < 2; t += DT) {
    descent.push({ t: DESCENT_LEN + t, d: cam, ...frame({ R: R0, introT: 0, camDist: cam, camAim: aim }) });
    cam += (aim - cam) * (1 - Math.exp(-easeRate * DT));
  }
}

// ── the report ──────────────────────────────────────────────────────────────
const f2 = (v) => (v === undefined ? '  —  ' : v.toFixed(2).padStart(6));
console.log('');
console.log(`  rig: target ${need(VOID, /moveAmt \+= \((.+?) - moveAmt\)/, '')[1]}`
  + `   vRef ${passKey ? `passed by the frame loop (${passKey[1]})` : rigDefault ? `rig default ${rigDefault[1]}` : 'not in the law'}`);
console.log('');
console.log('  SETTLED, full stick          r     cd    speed   vRef   move   lean°  flip/top');
const show = (r) => console.log(`  ${' '.repeat(26)}${r.R.toFixed(1).padStart(5)} ${r.d.toFixed(1).padStart(6)} ${f2(r.speed)} ${f2(r.vRef)} ${f2(r.move)} `
  + `${(r.lean * 180 / Math.PI).toFixed(1).padStart(6)}  ${(r.flip / r.speed).toFixed(2).padStart(6)}`);
for (const R of [0.9, 1.5, 2, 3, 4, 6, 8, 10, 12, R_CAP]) { const r = rows.find((x) => Math.abs(x.R - R) < 1e-9); if (r) show(r); }
const worstSettled = rows.reduce((a, b) => (b.move < a.move ? b : a));
console.log(`  worst settled radius: r ${worstSettled.R.toFixed(1)} reads ${worstSettled.move.toFixed(3)}`);
console.log('');
const worstDescent = descent.reduce((a, b) => (b.move < a.move ? b : a));
const firstDescent = descent[0];
console.log(`  DESCENT at r ${R0} (1.2 s dive, then 2 s of camera settle), full stick:`);
console.log(`    first frame  cd ${firstDescent.d.toFixed(1)}  speed ${firstDescent.speed.toFixed(2)}  vRef ${f2(firstDescent.vRef).trim()}  move ${firstDescent.move.toFixed(3)}`);
console.log(`    worst frame  t ${worstDescent.t.toFixed(2)}s  cd ${worstDescent.d.toFixed(1)}  speed ${worstDescent.speed.toFixed(2)}  vRef ${f2(worstDescent.vRef).trim()}  move ${worstDescent.move.toFixed(3)}`);
console.log('');

const fails = [];
for (const R of SPOTS) {
  const r = rows.find((x) => Math.abs(x.R - R) < 1e-9);
  if (r.move < MIN_MOVE) fails.push(`r ${R}: full stick reads motion ${r.move.toFixed(3)} (bar ${MIN_MOVE}) — `
    + `${r.speed.toFixed(2)} u/s is his top speed at this size, and the rig treats it as ${Math.round(r.move * 100)}% of moving`);
}
if (worstSettled.move < MIN_MOVE && !SPOTS.includes(worstSettled.R)) fails.push(`r ${worstSettled.R.toFixed(1)}: `
  + `full stick reads ${worstSettled.move.toFixed(3)} (bar ${MIN_MOVE})`);
if (worstDescent.move < MIN_MOVE) fails.push(`the descent: full stick reads ${worstDescent.move.toFixed(3)} at `
  + `t ${worstDescent.t.toFixed(2)}s (bar ${MIN_MOVE}) — the first drag of every match is made here`);
if (fails.length) {
  for (const x of fails) console.log(`  · ${x}`);
  console.log(`\nFAIL — full stick does not read as moving (${fails.length} finding(s))`);
  process.exit(1);
}
console.log(`PASS — full stick reads motion >= ${MIN_MOVE} at every settled radius 0.9-${R_CAP} `
  + `(worst ${worstSettled.move.toFixed(3)} at r ${worstSettled.R.toFixed(1)}) and through the descent (worst ${worstDescent.move.toFixed(3)})`);
