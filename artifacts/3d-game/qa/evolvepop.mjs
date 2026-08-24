// DOES THE EVOLUTION POP MAKE THE HERO BIGGER? — the celebration probe.
//
//   node qa/evolvepop.mjs
//
// TEAM MOTION, round 3, filed as a blocker and verified here before acting: the
// EVOLVED gesture was a SHRINK. void3d.ts drove it with
//
//   sin(evolveT / 0.7 * 2PI) * 0.16 * (evolveT / 0.7)
//
// and evolveT counts DOWN from 0.7, so that sine starts on its downstroke.
// Evaluated frame by frame it reached −12.3% at 0.15 s and only +4.6% at
// 0.47 s: the shrink was 2.6x the pop and arrived first, half a second before
// the growth, by which time the sound had finished.
//
// A six-year-old's whole read of "I evolved" is I GOT BIGGER. Meanwhile
// #evolve.show's own @keyframes scales the HUD card UP to 1.05 — the card grew
// while the hero shrank.
//
// ── WHY THIS IS A MATHS PROBE AND NOT A SCREENSHOT ───────────────────────
// The envelope is a pure function of elapsed time. Rendering it would sample it
// once or twice a second under swiftshader and tell you almost nothing; reading
// the expression out of the source and evaluating it at 240 Hz tells you
// exactly what the hero does. Same reasoning as qa/formsep.mjs.
//
// It parses the LIVE expression out of void3d.ts rather than carrying a copy,
// because a probe holding its own copy of the thing it measures is describing
// the build it was written against — which is what qa/_headcover.mjs and
// qa/_zgrade.mjs both had to be fixed for.
import { readFileSync } from 'node:fs';

// THE CONTRACT. An evolution is a reward, so the gesture has to read as growth.
const MIN_PEAK = 0.10;        // the hero must visibly get bigger: at least +10%
const MIN_RATIO = 1.5;        // and the growth must dominate any anticipation
const MAX_ANTICIPATION = 0.12; // …which may exist, but is a wind-up, not the gesture
const MAX_END = 0.005;        // and it must land on zero: evolveT stops here
const PEAK_BY = 0.35;         // seconds — the pop belongs with the sound, not after it

const SRC = readFileSync('src/proto3d/void3d.ts', 'utf8');
// The whole block, not just the `uniformK +=` expression: the envelope declares
// its own locals, and lifting one line out of it evaluates to a ReferenceError.
const m = SRC.match(/if \(evolveT > 0\) \{([\s\S]*?)\n      \}/);
if (!m) {
  console.log('FAIL — could not find the evolveT envelope in void3d.ts. The call site moved, '
    + 'and a probe that silently skips what it cannot find is worse than none');
  process.exit(1);
}
// Strip the frame-loop bookkeeping and the comments; keep the maths.
const body = m[1]
  .split('\n')
  .filter((l) => !/^\s*\/\//.test(l) && !/evolveT\s*-=/.test(l))
  .join('\n')
  .replace(/\bevolveT\b/g, 'E')
  .replace(/\bconst\b/g, 'const');
let f;
try {
  f = new Function('E', 'Math', `let uniformK = 0;\n${body}\nreturn uniformK;`);
  f(0.7, Math);
} catch (e) { console.log(`FAIL — the envelope did not parse or run: ${e.message}`); process.exit(1); }

let min = [9, 0], max = [-9, 0];
for (let t = 0; t <= 0.7; t += 1 / 240) {
  const v = f(0.7 - t, Math);
  if (!Number.isFinite(v)) { console.log(`FAIL — the envelope is not finite at t=${t.toFixed(3)}`); process.exit(1); }
  if (v < min[0]) min = [v, t];
  if (v > max[0]) max = [v, t];
}
const end = Math.abs(f(0, Math));
const ratio = min[0] < 0 ? max[0] / -min[0] : Infinity;

console.log('');
console.log(`  anticipation  ${(min[0] * 100).toFixed(1)}% at ${min[1].toFixed(2)}s`);
console.log(`  pop           ${(max[0] * 100).toFixed(1)}% at ${max[1].toFixed(2)}s`);
console.log(`  growth : shrink   ${ratio === Infinity ? 'no shrink' : ratio.toFixed(2)}`);
console.log(`  residual at 0.7s  ${(end * 100).toFixed(2)}%`);
console.log('');

const fails = [];
if (max[0] < MIN_PEAK) fails.push(`the hero only grows ${(max[0] * 100).toFixed(1)}% (bar ${MIN_PEAK * 100}%) — `
  + `an evolution has to read as GETTING BIGGER, and this is the moment a child plays for`);
if (ratio < MIN_RATIO) fails.push(`the shrink is ${(1 / ratio).toFixed(2)}x the growth (bar: growth at least `
  + `${MIN_RATIO}x the shrink) — the gesture reads as the hero deflating, not evolving`);
if (min[0] < -MAX_ANTICIPATION) fails.push(`the anticipation reaches ${(min[0] * 100).toFixed(1)}% `
  + `(bar ${-MAX_ANTICIPATION * 100}%) — a wind-up is fine, a collapse is not`);
if (max[1] > PEAK_BY) fails.push(`the pop lands at ${max[1].toFixed(2)}s (bar ${PEAK_BY}s), after the `
  + `card and the sound have already played — the three channels have to agree`);
if (end > MAX_END) fails.push(`the envelope is at ${(end * 100).toFixed(2)}% when evolveT expires `
  + `(bar ${MAX_END * 100}%) — it stops being applied there, so a residual is a visible snap`);

if (fails.length) {
  for (const x of fails) console.log(`  · ${x}`);
  console.log(`\nFAIL — the evolution gesture does not read as growth (${fails.length} finding(s))`);
  process.exit(1);
}
console.log(`PASS — the hero anticipates ${(min[0] * 100).toFixed(1)}% then pops +${(max[0] * 100).toFixed(1)}% `
  + `at ${max[1].toFixed(2)}s, growth ${ratio.toFixed(2)}x the shrink, landing on zero`);
