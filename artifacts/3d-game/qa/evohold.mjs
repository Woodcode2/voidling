// DOES THE FORM WAIT FOR THE MEAL THAT EARNED IT, AND ONLY FOR IT? — the
// evolution hold, stepped in node.
//
//   node qa/evohold.mjs
//
// Studio round 4, Job 11: the bite pays off on the swallow, and the EVOLVED
// ceremony waits for the swallow of the meal that earned the form. The first
// version of the hold (fe262dc) was right only while the radius was frozen.
// It re-read the form off the radius on the swallow frame. In a real match the
// growth law's rate limiter sets the radius back to lastR + maxStep at the top
// of the frame after every capture. Where that leaves the radius under the
// threshold by the swallow (bar (1) below builds that case and checks it
// did), the hold let go with no ceremony, and the form waited for the law to
// cross the threshold on its own. Every probe that took a bite
// (bitetime, juice) held the radius with __setVoidR, which turns that pull-back
// off, so none of them could see it.
//
// ── WHY NODE ──────────────────────────────────────────────────────────────
// The rules live in src/proto3d/evohold.ts, which imports nothing. This bundles
// it with the esbuild vite already ships (as qa/mouthwind.mjs does) and steps
// it through a frame loop in the game's own order: the growth law at the top of
// the frame, then the drain (swallows and captures, in `edibles` order), then
// the ceremony block. The numbers that loop runs on are read out of
// prototype3d.ts, not copied: FORM_MIN and stageFor, growRadius (with START_R
// and R_CAP), the rate limiter's maxStep, and the drain's rate. Part 1 checks
// that prototype3d.ts calls the hold at the places this loop assumes and in
// that order, so the loop is a model of the build and not of this file.
//
// ── THE BARS ──────────────────────────────────────────────────────────────
//   (w) WIRED. capture() hands the hold stageFor() on the GROWN radius; the
//       swallow and the placement cull say the meal is down; resetMatch and a
//       form bite clear it; the ceremony block takes its form from due() and
//       fires the ceremony only above bestStage; and in animate() the growth
//       law runs before the drain, which runs before the ceremony block.
//   (1) EVERY FORM, IN A REAL MATCH. For each threshold MUNCHKIN..WORLD ENDER,
//       with the rate limiter on (a real match) and off (__setVoidR), at 60 Hz
//       and at the 0.05 s dt clamp: one bite that crosses the threshold, and
//       the form lands on the frame that meal is swallowed, with one ceremony,
//       and nothing moves before it. With the limiter on, the probe also
//       requires the radius to have been pulled back under the threshold by
//       the swallow, so the case the blocker was about is really under test.
//   (2) THE SAME FRAME. The held meal is swallowed and another bite crosses
//       the same threshold on that frame, after it and before it in the drain:
//       the form still lands on the first meal's swallow.
//   (3) A SPREE. A bite every frame, each crossing the threshold again from
//       the pulled-back radius, and the radius creeping over it by itself: the
//       form lands on the FIRST meal's swallow, once.
//   (4) TWO FORMS. Two bites earn two forms: in capture order, each lands on
//       its own meal's swallow; when the later, smaller meal is down first,
//       nothing shows until the first meal is down, and then both at once.
//   (5) THE WAYS OUT. The end beat shows a held form at once; a meal culled
//       mid-drain owes its form at once; a form bite on a held form cancels
//       it (no promotion over the setback) and the form comes back with its
//       ceremony when a later bite earns it again; __forceEvolve does not wait
//       and the held meal then adds nothing; a recovery below bestStage is not
//       held and has no ceremony; the law's own growth shows at once with
//       nothing held, and waits for the held meal when one is.
//   (6) ONCE. In every run above, no form has a second ceremony.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const fail = (m) => { console.log(`FAIL — ${m}`); process.exit(1); };
process.on('uncaughtException', (e) => fail(`threw: ${(e && e.message) || e}`));
process.on('unhandledRejection', (e) => fail(`rejected: ${(e && e.message) || e}`));

let SRC;
try { SRC = readFileSync('src/prototype3d.ts', 'utf8'); } catch (e) {
  fail(`could not read src/prototype3d.ts (${e.message}) — run this from artifacts/3d-game`);
}

// ── PART 1: THE WIRING ─────────────────────────────────────────────────────
const wires = [];
const wire = (ok, what) => wires.push({ ok: !!ok, what });
const body = (startRe, endRe) => {
  const m = SRC.match(startRe);
  if (!m) return '';
  const rest = SRC.slice(m.index);
  const e = rest.slice(m[0].length).search(endRe);
  return e < 0 ? rest : rest.slice(0, m[0].length + e);
};
const count = (s, needle) => s.split(needle).length - 1;

wire(/import \{ createEvoHold \} from '\.\/proto3d\/evohold';/.test(SRC), 'prototype3d.ts imports createEvoHold from proto3d/evohold');
wire(count(SRC, 'evoHold.bite(') === 1 && count(SRC, 'evoHold.due(') === 1,
  'exactly one evoHold.bite() and one evoHold.due() call');
{
  const cap = body(/\nfunction capture\(/, /\n\}\n/);
  const g = cap.indexOf('voidling.setRadius(growRadius(voidling.radius, e.radius));');
  const h = cap.indexOf('evoHold.bite(e, stageFor(voidling.radius), curStage, bestStage);');
  wire(g >= 0 && h > g && !cap.slice(g + 10, h).includes('setRadius('),
    'capture() calls evoHold.bite(e, stageFor(voidling.radius), curStage, bestStage) after the growth, with nothing resizing the void between');
}
{
  const reset = body(/\nfunction resetMatch\(/, /\n\}\n/);
  wire(reset.includes('evoHold.clear()'), 'resetMatch() clears the hold');
  const bitten = body(/rivals\.onPlayerBitten = /, /\n\};\n/);
  const form = bitten.slice(bitten.indexOf('if (hit.form) {'));
  wire(bitten.includes('if (hit.form) {') && form.slice(0, form.indexOf('} else {')).includes('evoHold.clear();'),
    'a form bite (onPlayerBitten, hit.form) clears the hold');
  const vw = body(/\nfunction validateWorld\(/, /\n\}\n/);
  const cut = vw.indexOf('edibles.splice(cull[k], 1);');
  wire(cut > 0 && vw.slice(Math.max(0, cut - 400), cut).includes('if (e.eaten) evoHold.down(e);'),
    'the placement cull says a meal it takes out mid-drain is down');
}
const ani = body(/\nfunction animate\(\) \{/, /\n\}\n/);
{
  const sw = ani.indexOf('if (e.t >= 1) {');
  const gone = ani.indexOf('scene.remove(e.mesh); e.eaten = false;', sw);
  wire(sw > 0 && gone > sw && ani.slice(sw, gone).includes('evoHold.down(e);'), 'the drain says the meal is down on its swallow');
  const law = ani.indexOf('voidling.setRadius(lastR + maxStep)');
  const lastR = ani.indexOf('lastR = voidling.radius;', law);
  const drain = ani.indexOf('for (const e of edibles) {');
  const capIn = ani.indexOf('capture(e);', drain);
  const due = ani.indexOf('const earned = evoHold.due(stageFor(voidling.radius), curStage, bestStage, endBeat());');
  wire(law > 0 && lastR > law && drain > lastR && capIn > drain && due > capIn,
    'animate() runs the growth law (and takes lastR) before the drain, the drain\'s captures before the ceremony block');
  const blk = ani.slice(due, due + 400);
  wire(due > 0 && blk.includes('const ns = forced ? Math.min(FORMS.length - 1, curStage + 1) : earned;')
    && /if \(ns > curStage\) \{[\s\S]{0,400}?if \(ns > bestStage\) \{/.test(ani.slice(due, due + 1200)),
    'the ceremony block moves to due() (or curStage + 1 when forced) and plays the ceremony only above bestStage');
}

// ── PART 2: THE SOURCE'S OWN NUMBERS ───────────────────────────────────────
const grab = (re, what) => {
  const m = SRC.match(re);
  if (!m) fail(`could not find ${what} in prototype3d.ts — the source moved, and a probe that skips what it cannot find is worse than none`);
  return m;
};
const noTs = (s) => s.replace(/:\s*number/g, '');
const lib = new Function(`${grab(/const FORM_MIN = \[[^\]]*\];/, 'FORM_MIN')[0]}
${grab(/const START_R = [\d.]+;/, 'START_R')[0]}
${grab(/const R_CAP = [\d.]+;/, 'R_CAP')[0]}
${noTs(grab(/const stageFor = \(r: number\) => \{[^\n]*\};/, 'stageFor')[0])}
${noTs(grab(/const growRadius = \(R: number, eR: number\) => \{[\s\S]*?\n\};/, 'growRadius')[0])}
return { FORM_MIN, START_R, stageFor, growRadius };`)();
const { FORM_MIN, START_R, stageFor, growRadius } = lib;
const maxStepX = grab(/const maxStep = ([^;]+);/, 'the rate limiter\'s maxStep')[1];
const maxStep = new Function('surgeT', 'dt', `return ${maxStepX};`);
const massX = grab(/const mass = ([^;]+);\n\s*e\.t \+= dtw \* \(([^;]+)\);/, 'the drain\'s rate');
const drainStep = new Function('e', 'R', 'dtw', `const mass = ${massX[1]}; return dtw * (${massX[2]});`);

// ── PART 3: THE REAL MODULE ────────────────────────────────────────────────
let esbuild;
try {
  const req = createRequire(import.meta.url);
  esbuild = createRequire(req.resolve('vite'))('esbuild');
} catch (e) { fail(`could not load the esbuild vite depends on (${String(e.message).split('\n')[0]})`); }
let createEvoHold;
try {
  const built = await esbuild.build({ entryPoints: ['src/proto3d/evohold.ts'], bundle: true, format: 'esm',
    platform: 'neutral', write: false, logLevel: 'silent' });
  ({ createEvoHold } = await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0].text).toString('base64')}`));
} catch (e) { fail(`src/proto3d/evohold.ts did not build or load: ${String(e.message).split('\n')[0]}`); }
if (typeof createEvoHold !== 'function') fail('src/proto3d/evohold.ts exports no createEvoHold');

// ── THE FRAME LOOP, IN animate()'s ORDER ───────────────────────────────────
// sc: { r0, cur, best, law, frames, meals: [{ eR, at }], beatAt, forceAt,
//       floor: { at, r }, on(f, w) } — `on` runs before the drain, for the
//       cull and the form bite. `at` may be a function of the run so far.
const TOP = FORM_MIN.length - 1;
function run(sc, dt) {
  const hold = createEvoHold();
  const w = { r: sc.r0, lastR: sc.r0, cur: sc.cur, best: sc.best, hold, log: [], cer: {} };
  const meals = sc.meals.map((m, i) => ({ ...m, i, eaten: false, t: 0, cap: -1, gulp: -1, earned: -1 }));
  w.edibles = meals.slice();
  w.meals = meals;
  for (let f = 0; f < sc.frames; f++) {
    // 1. the growth law: the rate limiter against lastR, lastR taken, then the floor
    if (sc.law && w.r > w.lastR + maxStep(0, dt)) w.r = w.lastR + maxStep(0, dt);
    w.lastR = w.r;
    if (sc.floor && f >= sc.floor.at && w.r < sc.floor.r) w.r = sc.floor.r;
    if (sc.on) sc.on(f, w);
    // 2. the drain, in edibles order: swallows and captures in one pass
    for (const m of w.edibles) {
      if (m.eaten) {
        m.t += drainStep({ radius: m.eR }, w.r, dt);
        if (m.t >= 1) { m.eaten = false; m.gulp = f; m.rAtGulp = w.r; hold.down(m); }
        continue;
      }
      const at = typeof m.at === 'function' ? m.at(w) : m.at;
      if (m.cap < 0 && at === f) {
        m.eaten = true; m.t = 0; m.cap = f;
        w.r = growRadius(w.r, m.eR);
        m.earned = stageFor(w.r);
        hold.bite(m, stageFor(w.r), w.cur, w.best);
      }
    }
    // 3. the ceremony block
    const forced = sc.forceAt === f;
    const earned = hold.due(stageFor(w.r), w.cur, w.best, sc.beatAt != null && f >= sc.beatAt);
    const ns = forced ? Math.min(TOP, w.cur + 1) : earned;
    if (ns > w.cur) {
      const ceremony = ns > w.best;
      w.log.push({ f, from: w.cur, to: ns, ceremony });
      w.cur = ns;
      if (ceremony) { w.best = ns; w.cer[ns] = (w.cer[ns] ?? 0) + 1; }
    }
  }
  return w;
}
// the smallest meal whose bite takes radius r to at least `to`, by growRadius itself
const sizeFor = (r, to) => {
  let lo = 0, hi = 40;
  if (growRadius(r, hi) < to) return NaN;
  for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (growRadius(r, m) >= to) hi = m; else lo = m; }
  return hi;
};

const RATES = [[60, 1 / 60], [20, 0.05]];
const FORMS_TESTED = [1, 2, 3, 4, 5];   // MUNCHKIN .. WORLD ENDER; VOID TITAN is past the law's reach
const rows = [];
const bars = {};
const bar = (id, ok, msg) => { (bars[id] ??= []).push({ ok: !!ok, msg }); };
const allRuns = [];
const note = (id, w) => { allRuns.push({ id, w }); return w; };
const fmt = (w) => w.log.map((x) => `f${x.f} ${x.from}->${x.to}${x.ceremony ? '*' : ''}`).join(', ') || 'no change';

// A form-k case: the void just under FORM_MIN[k], one bite that crosses it.
const edge = (k) => {
  const r0 = FORM_MIN[k] * 0.985;
  return { r0, eR: sizeFor(r0, FORM_MIN[k] * 1.02) };
};

for (const [hz, dt] of RATES) {
  // (1) every form, law on and off
  for (const k of FORMS_TESTED) {
    for (const law of [true, false]) {
      const { r0, eR } = edge(k);
      const w = note('1', run({ r0, cur: k - 1, best: k - 1, law, frames: 120, meals: [{ eR, at: 3 }] }, dt));
      const A = w.meals[0];
      const ok = A.earned === k && A.gulp > 0 && w.log.length === 1 && w.log[0].f === A.gulp
        && w.log[0].to === k && w.log[0].ceremony && (!law || stageFor(A.rAtGulp) < k);
      rows.push(`  ${ok ? 'ok ' : 'BAD'} (1) ${String(hz).padStart(2)} Hz ${law ? 'law on ' : 'law off'} form ${k}: bite r ${eR.toFixed(2)} on ${r0.toFixed(2)} `
        + `earned ${A.earned}, captured f${A.cap}, swallowed f${A.gulp} at radius ${A.rAtGulp?.toFixed(3)} (form ${stageFor(A.rAtGulp ?? 0)}); ${fmt(w)}`);
      bar('1', ok, `form ${k} at ${hz} Hz, law ${law ? 'on' : 'off'}`);
    }
  }
  const k = 2, { r0, eR } = edge(k);
  const base = run({ r0, cur: 1, best: 1, law: true, frames: 120, meals: [{ eR, at: 3 }] }, dt);
  const F = base.meals[0].gulp;
  // (2) the same frame, the second bite after and before the first in the drain
  for (const [label, meals, iA] of [
    ['after it', [{ eR, at: 3 }, { eR, at: F }], 0],
    ['before it', [{ eR, at: F }, { eR, at: 3 }], 1],
  ]) {
    const w = note('2', run({ r0, cur: 1, best: 1, law: true, frames: 120, meals }, dt));
    const A = w.meals[iA], C = w.meals[1 - iA];
    const ok = A.gulp === F && C.cap === F && C.earned === k && w.log.length === 1 && w.log[0].f === F && w.log[0].ceremony;
    rows.push(`  ${ok ? 'ok ' : 'BAD'} (2) ${String(hz).padStart(2)} Hz a second bite into form ${k} on the held meal's swallow frame, ${label} in the drain: `
      + `held meal swallowed f${A.gulp}, second captured f${C.cap} (earned ${C.earned}) and swallowed f${C.gulp}; ${fmt(w)}`);
    bar('2', ok, `${hz} Hz, ${label}`);
  }
  // (3) a spree: a bite every frame from the first one on
  {
    const meals = [{ eR, at: 3 }];
    for (let j = 1; j <= 60; j++) meals.push({ eR, at: 3 + j });
    const w = note('3', run({ r0, cur: 1, best: 1, law: true, frames: 160, meals }, dt));
    const A = w.meals[0];
    const crossed = w.meals.filter((m) => m.earned === k).length;
    const ok = w.log.length === 1 && w.log[0].f === A.gulp && w.log[0].to === k && w.log[0].ceremony && crossed > 3;
    rows.push(`  ${ok ? 'ok ' : 'BAD'} (3) ${String(hz).padStart(2)} Hz a bite every frame: ${crossed} of ${w.meals.length} crossed into form ${k}; `
      + `the first swallowed f${A.gulp}; ${fmt(w)}`);
    bar('3', ok, `${hz} Hz`);
  }
  // (4) two forms. In capture order: A into 2, B (bigger, slower) on to 3.
  {
    const rA = FORM_MIN[2] * 0.985, eA = sizeFor(rA, FORM_MIN[2] * 1.02);
    const eB = sizeFor(growRadius(rA, eA), FORM_MIN[3] * 1.01);
    const w = note('4', run({ r0: rA, cur: 1, best: 1, law: false, frames: 160, meals: [{ eR: eA, at: 3 }, { eR: eB, at: 4 }] }, dt));
    const [A, B] = w.meals;
    const ok = A.earned === 2 && B.earned === 3 && A.gulp < B.gulp && w.log.length === 2
      && w.log[0].f === A.gulp && w.log[0].to === 2 && w.log[1].f === B.gulp && w.log[1].to === 3 && w.log.every((x) => x.ceremony);
    rows.push(`  ${ok ? 'ok ' : 'BAD'} (4) ${String(hz).padStart(2)} Hz two forms, the first meal down first: A r ${eA.toFixed(2)} earned ${A.earned} `
      + `(down f${A.gulp}), B r ${eB.toFixed(2)} earned ${B.earned} (down f${B.gulp}); ${fmt(w)}`);
    bar('4', ok, `${hz} Hz, in order`);
  }
  {
    // A: a big meal that stops just short of form 3 (form 2 earned); B: a crumb
    // that tips it over, taken a frame later and swallowed first
    const rA = FORM_MIN[2] * 0.985, eA = sizeFor(rA, FORM_MIN[3] * 0.997);
    const eB = sizeFor(growRadius(rA, eA), FORM_MIN[3] * 1.001);
    const w = note('4', run({ r0: rA, cur: 1, best: 1, law: false, frames: 160, meals: [{ eR: eA, at: 3 }, { eR: eB, at: 4 }] }, dt));
    const [A, B] = w.meals;
    const ok = A.earned === 2 && B.earned === 3 && B.gulp < A.gulp && w.log.length === 1
      && w.log[0].f === A.gulp && w.log[0].to === 3 && w.log[0].ceremony;
    rows.push(`  ${ok ? 'ok ' : 'BAD'} (4) ${String(hz).padStart(2)} Hz two forms, the later crumb down first: A r ${eA.toFixed(2)} earned ${A.earned} `
      + `(down f${A.gulp}), B r ${eB.toFixed(2)} earned ${B.earned} (down f${B.gulp}); ${fmt(w)}`);
    bar('4', ok, `${hz} Hz, crumb first`);
  }
  // (5) the ways out
  {
    const w = note('5', run({ r0, cur: 1, best: 1, law: true, frames: 120, meals: [{ eR, at: 3 }], beatAt: 5 }, dt));
    const ok = w.log.length === 1 && w.log[0].f === 5 && w.log[0].to === k && w.meals[0].gulp > 5;
    rows.push(`  ${ok ? 'ok ' : 'BAD'} (5) ${String(hz).padStart(2)} Hz end beat from f5 with the meal in the air (down f${w.meals[0].gulp}): ${fmt(w)}`);
    bar('5', ok, `${hz} Hz end beat`);
  }
  {
    const w = note('5', run({ r0, cur: 1, best: 1, law: true, frames: 120, meals: [{ eR, at: 3 }],
      on: (f, s) => { if (f === 5) { const A = s.meals[0]; s.edibles = s.edibles.filter((m) => m !== A); if (A.eaten) s.hold.down(A); } } }, dt));
    const ok = w.log.length === 1 && w.log[0].f === 5 && w.log[0].to === k && w.log[0].ceremony;
    rows.push(`  ${ok ? 'ok ' : 'BAD'} (5) ${String(hz).padStart(2)} Hz the meal culled mid-drain at f5: ${fmt(w)}`);
    bar('5', ok, `${hz} Hz cull`);
  }
  {
    // a form bite at f5 while the meal is held, mirrored from onPlayerBitten:
    // clear, then down to the bottom of the form she is in; a second bite into
    // form k later, once the radius is back near it
    const w = note('5', run({ r0, cur: 1, best: 1, law: true, frames: 200,
      meals: [{ eR, at: 3 }, { eR, at: (s) => (s.meals[0].gulp > 0 && s.r >= r0 ? 60 : -1) }],
      floor: { at: 40, r: r0 },
      on: (f, s) => {
        if (f !== 5) return;
        s.hold.clear();
        const st = stageFor(s.r);
        s.r = Math.max(START_R, Math.min(s.r, (FORM_MIN[Math.max(0, st - 1)] || START_R) * 1.02));
        s.lastR = s.r;
        if (st > 0) s.cur = stageFor(s.r);
      } }, dt));
    const [A, B] = w.meals;
    const none = !w.log.some((x) => x.f <= A.gulp + 5 && x.to >= k);
    const back = w.log.filter((x) => x.to === k);
    const ok = none && B.cap > 0 && back.length === 1 && back[0].f === B.gulp && back[0].ceremony;
    rows.push(`  ${ok ? 'ok ' : 'BAD'} (5) ${String(hz).padStart(2)} Hz a form bite at f5 on a held form (meal down f${A.gulp}), `
      + `the form earned again by a bite at f${B.cap} (down f${B.gulp}): ${fmt(w)}`);
    bar('5', ok, `${hz} Hz form bite`);
  }
  {
    const w = note('5', run({ r0, cur: 1, best: 1, law: true, frames: 120, meals: [{ eR, at: 3 }], forceAt: 4 }, dt));
    const ok = w.log.length === 1 && w.log[0].f === 4 && w.log[0].to === k && w.log[0].ceremony && w.meals[0].gulp > 4;
    rows.push(`  ${ok ? 'ok ' : 'BAD'} (5) ${String(hz).padStart(2)} Hz __forceEvolve at f4 with the meal held (down f${w.meals[0].gulp}): ${fmt(w)}`);
    bar('5', ok, `${hz} Hz forced`);
  }
  {
    // a recovery: demoted to k-1 with bestStage k, a bite back into k
    const w = note('5', run({ r0, cur: k - 1, best: k, law: true, frames: 120, meals: [{ eR, at: 3 }] }, dt));
    const ok = w.log.length === 1 && w.log[0].f === 3 && w.log[0].to === k && !w.log[0].ceremony;
    rows.push(`  ${ok ? 'ok ' : 'BAD'} (5) ${String(hz).padStart(2)} Hz a recovery below bestStage (bite f3, down f${w.meals[0].gulp}): ${fmt(w)}`);
    bar('5', ok, `${hz} Hz recovery`);
  }
  {
    const w = note('5', run({ r0, cur: 1, best: 1, law: true, frames: 60, meals: [], floor: { at: 7, r: FORM_MIN[k] * 1.001 } }, dt));
    const ok = w.log.length === 1 && w.log[0].f === 7 && w.log[0].to === k && w.log[0].ceremony;
    rows.push(`  ${ok ? 'ok ' : 'BAD'} (5) ${String(hz).padStart(2)} Hz the floor lifts her into form ${k} at f7, nothing held: ${fmt(w)}`);
    bar('5', ok, `${hz} Hz floor, nothing held`);
  }
  {
    const w = note('5', run({ r0, cur: 1, best: 1, law: true, frames: 120, meals: [{ eR, at: 3 }], floor: { at: 4, r: FORM_MIN[k] * 1.001 } }, dt));
    const A = w.meals[0];
    const ok = w.log.length === 1 && w.log[0].f === A.gulp && w.log[0].to === k && w.log[0].ceremony;
    rows.push(`  ${ok ? 'ok ' : 'BAD'} (5) ${String(hz).padStart(2)} Hz the floor lifts her into form ${k} at f4 with the meal held (down f${A.gulp}): ${fmt(w)}`);
    bar('5', ok, `${hz} Hz floor, meal held`);
  }
}
// (6) once
{
  const twice = allRuns.filter(({ w }) => Object.values(w.cer).some((n) => n > 1));
  bar('6', !twice.length, twice.length ? `${twice.length} run(s) played one form's ceremony twice` : `${allRuns.length} runs, no form twice`);
}

console.log('\n  THE EVOLUTION HOLD — src/proto3d/evohold.ts stepped in animate()\'s order on prototype3d.ts\'s own numbers');
console.log(`  FORM_MIN ${JSON.stringify(FORM_MIN)}; maxStep ${maxStep(0, 1 / 60).toFixed(5)} a frame at 60 Hz, ${maxStep(0, 0.05).toFixed(5)} at the 0.05 clamp; `
  + 'f = frame, a->b the form change, * a ceremony\n');
for (const x of wires) console.log(`  ${x.ok ? 'ok ' : 'BAD'} (w) ${x.what}`);
for (const r of rows) console.log(r);
console.log('');
let bad = 0;
const NAMES = {
  w: 'wired: the hold is called where this loop assumes, in the frame order it assumes',
  1: 'every form lands on the swallow of the meal that earned it, law on and off, at 60 Hz and at the 0.05 clamp',
  2: 'a second bite on the held meal\'s swallow frame does not push the form back',
  3: 'a bite every frame: the form lands on the first meal\'s swallow, once',
  4: 'two forms: each on its own meal\'s swallow, and never above a meal still in the air',
  5: 'the end beat, the cull, a form bite, a forced form, a recovery and the law\'s own growth',
  6: 'no form has a second ceremony',
};
{
  const ok = wires.every((x) => x.ok);
  console.log(`  ${ok ? 'ok ' : 'BAD'} (w) ${NAMES.w}${ok ? '' : ` — ${wires.filter((x) => !x.ok).length} of ${wires.length} missing`}`);
  if (!ok) bad++;
}
for (const id of ['1', '2', '3', '4', '5', '6']) {
  const list = bars[id] ?? [];
  const miss = list.filter((x) => !x.ok);
  const ok = list.length > 0 && !miss.length;
  console.log(`  ${ok ? 'ok ' : 'BAD'} (${id}) ${NAMES[id]}${ok ? ` (${list.length})` : ` — failed: ${miss.map((x) => x.msg).join('; ') || 'nothing ran'}`}`);
  if (!ok) bad++;
}
console.log(bad ? `\nFAIL — ${bad} of 7 bar(s)` : '\nPASS — 7 bar(s): the form waits for the meal that earned it, and only for it');
process.exit(bad ? 1 : 0);
