// DOES A WALKING PERSON HAVE A FACE? — the node face raycast (studio round 4, Job 4 / I-7)
//
//   node qa/faceray.mjs [--hat=cap,beanie] [--hair=short] [--rows] [--only=E|H]
//
// --hat/--hair narrow bar (E) to a slice (a sweep over one hat's numbers runs
// in a second); --rows adds the mouth under each cell; --only runs one bar.
// FACERAY_SRC=<path> reads a copy of life.ts instead, which is how a candidate
// number is tried without touching the source.
//
// The studio found every walking person with hair wearing it like a diving
// helmet: the shared crown's rim came down past the eyes, so from the play
// camera the two eyes were INSIDE the hair shell and the camera saw hair where
// a face should be (B3). And every cap buried them a second time (B4). The
// probe that should have caught it, qa/_headcover.mjs, printed "0.0%" for
// both and exited 0, because it measured and did not judge.
//
// ── WHAT THIS DOES, AND WHY IT RUNS life.ts RATHER THAN READING NUMBERS ─────
// It does not carry one coordinate of its own. It parses src/proto3d/life.ts
// with the TypeScript compiler, lifts the top-level declarations the head
// needs (B, pc, hairParts, hatParts, the colours, whatever they in turn read)
// and the HEAD block of makePerson itself — from the statement that opens the
// head parts list to the one that makes the head group — strips the types, and
// runs them in node against the real three.js. So each head here is built by
// the same statements, in the same order, from the same primitives the game
// builds it from, and a change to any of them is measured the next time this
// runs. qa/_headcover.mjs went on reporting 28.8% bare scalp after the hair
// was raised because it carried its own copy; this cannot.
//
// A name the head block reads that is neither a top-level declaration of
// life.ts nor one of the makePerson locals supplied below is a THROW, not a
// skip: the block changed shape and this probe has to be taught what it is.
//
// ── THE MEASURE ─────────────────────────────────────────────────────────────
// The camera is far enough away (26-340 units, against a 0.53 head) that its
// rays across one head are parallel, so each view is an orthographic bundle
// along the camera's direction, with the person FACING the camera — someone
// walking toward the void, which is who the child is looking at. Pitch 46 is
// the spawn camera (camOffset 0.62, 0.92, 0.62); 55 and 65 are where it
// climbs to as the void grows (the governor's three angles).
//
// For each eye, a grid of parallel rays is laid over the eye's projected
// footprint. A ray is an EYE SAMPLE when, on this head's own face parts alone
// (skull, eyes, mouth — no hair, no hat), its first front-facing hit is that
// eye: that is the eye as a bald head draws it, with the part of the dot that
// sinks into the skull already excluded. The sample LANDS ON INK when the
// first front-facing hit with the hair and the hat added is still that eye.
// The score is landed / samples, per eye, and the worse eye is the one
// reported. Bald scores 100 by construction; the number is how much of a drawn
// eye the hair and the hat leave.
//
// FRONT-FACING only, because PEOPLE_MAT is single-sided (three's default
// FrontSide): the inside of an open hair shell is culled by the renderer, so
// it cannot hide anything, and counting it would.
//
// "Ink" means the eye part itself, not the colour: a tricorn crown, a captain's
// peak and a shako peak are INK too, and a ray that hits one of those in front
// of an eye has hit a hat.
//
// ── THE BARS ────────────────────────────────────────────────────────────────
// (E) Every Hair x Hat, at 46, 55 and 65 degrees: at least 50% of each eye's
//     samples land on ink. Half a drawn eye still reads as an eye at thirty
//     pixels; less than half reads as a smudge under a hat. The governor's
//     bar, set before the fix.
//     BRIMS ARE A CONVENTION, NOT A DEFECT. A sun hat, a straw hat and a
//     captain's cap shade the eyes from above in every drawing of one, and
//     the brim is what makes the hat read at all from the top of the camera's
//     travel. Those are measured and printed, and exempt by name below, with
//     the reason next to each. So is ONE mask, the snorkel, and that one is
//     this probe's call rather than the governor's: a dive mask over the eyes
//     is the eyes, the same decision makePerson already makes for sunglasses
//     (under glasses no eye is drawn at all). The tricorn and the bucket hat
//     are brims too and are NOT exempt — a small tilt clears both, and the
//     tricorn is on most of the costumed pirates.
// (H) The hat colour the dress code picks is more than CIE76 dE 15 from the
//     person's shirt AND their skin. A cream cap over a pale face is the same
//     value as the skull under it, and from above it reads as a bald head (the
//     governor's crop of Game Day, gdcap.png). Checked over every skin in
//     SKIN against every shirt in OUTFIT, on the path that picks the colour
//     (a hat with no hatCol of its own), by making the dress code's pick()
//     return each of its candidates in turn. dE is CIE76 on the sRGB hex, the
//     same arithmetic as qa/formsep.mjs.
//
// The mouth is measured and printed; it has no bar here (nothing in the kit is
// meant to cover it, but a bob does, and that is a hair decision).
//
// ── MEASURED, 2026-09-23 (Job 4) ────────────────────────────────────────────
//   before  FAIL (E) 120 of 126: short/bob/long/bun/pony/braids 0/0/0 bare-
//           headed, buzz 43/42/41, curly 55/53/52, every hat 0/0/0
//           FAIL (H) 254 of the outcomes: 132 against the skin (worst the
//           cream cap on the palest skin, dE 7.1), 128 against the shirt
//   after   PASS (E) 162 built, lowest outside the conventions 69 (beanie, 65)
//           PASS (H) closest 17.2
// The studio record quotes a skeptic's raycast (eyes 72/68/61 for the tipped
// crown, 73/67/53 for the cap). That instrument is not in the repo, so what it
// divided by cannot be checked; its numbers and these are not comparable, and
// neither is evidence for the other.
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import ts from 'typescript';

const FILE = process.env.FACERAY_SRC || 'src/proto3d/life.ts';
const SRC = readFileSync(FILE, 'utf8');
const argv = (k) => { const a = process.argv.find((s) => s.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3).split(',') : null; };
const ONLY_HAT = argv('hat'), ONLY_HAIR = argv('hair'), ROWS = process.argv.includes('--rows');
const ONLY = argv('only') ? argv('only')[0].split('') : ['E', 'H'];

const PITCHES = [46, 55, 65];
const EYE_BAR = 0.50;
const DE_BAR = 15;
// by name, with the reason. Anything not listed here is under bar (E).
const CONVENTION = {
  sun: 'a wide brim shades the eyes from above by design; the brim is the read',
  straw: 'the farmer\'s brim, the widest in the game on purpose (life.ts says so)',
  captain: 'a peaked cap with a dark peak worn low is the captain; the peak is the read',
  snorkel: 'a dive mask over the eyes IS the eyes, the call makePerson already makes for glasses (no eyes drawn at all)',
};

// ── the source, as the compiler sees it ────────────────────────────────────
const AST = ts.createSourceFile(FILE, SRC, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS);
const DECL = new Map();      // top-level name -> statement
const IMPORTED = new Set();
for (const st of AST.statements) {
  if (ts.isImportDeclaration(st)) {
    const c = st.importClause; if (!c) continue;
    if (c.name) IMPORTED.add(c.name.text);
    const nb = c.namedBindings;
    if (nb && ts.isNamespaceImport(nb)) IMPORTED.add(nb.name.text);
    if (nb && ts.isNamedImports(nb)) for (const e of nb.elements) IMPORTED.add(e.name.text);
  } else if (ts.isFunctionDeclaration(st) && st.name) DECL.set(st.name.text, st);
  else if (ts.isVariableStatement(st)) {
    for (const d of st.declarationList.declarations) if (ts.isIdentifier(d.name)) DECL.set(d.name.text, st);
  }
}
const toJs = (text) => ts.transpileModule(text, { compilerOptions: {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, removeComments: true } }).outputText;
const stmtJs = new Map();
const jsOf = (st) => {
  if (!stmtJs.has(st)) stmtJs.set(st, toJs(st.getText(AST).replace(/^export\s+(default\s+)?/, '')));
  return stmtJs.get(st);
};

// ── the head block of makePerson ────────────────────────────────────────────
const mp = DECL.get('makePerson');
if (!mp || !ts.isFunctionDeclaration(mp) || !mp.body)
  throw new Error('faceray: makePerson is not a top-level function in life.ts any more — the head moved');
const body = mp.body.statements;
const declares = (st, name) => ts.isVariableStatement(st)
  && st.declarationList.declarations.some((d) => ts.isIdentifier(d.name) && d.name.text === name);
// the head starts at whichever comes first of the parts list `hp` and the hat
// choice `hk` (the hat has to be known before the hair once curly defers to it)
const iHp = body.findIndex((s) => declares(s, 'hp'));
const iHk = body.findIndex((s) => declares(s, 'hk'));
const iHd = body.findIndex((s) => declares(s, 'hd'));
if (iHp < 0 || iHd < 0 || iHd < iHp)
  throw new Error(`faceray: makePerson's head block moved (hp at ${iHp}, hd at ${iHd}) — a probe that `
    + 'cannot find the head must not report on one');
const i0 = iHk >= 0 && iHk < iHp ? iHk : iHp;
const HEAD_JS = toJs(body.slice(i0, iHd).map((s) => s.getText(AST)).join('\n'));

// ── run a piece of life.ts with its dependencies resolved on demand ────────
// A ReferenceError names what is missing; if life.ts declares it at the top
// level, its statement goes in front and the run is repeated. The order found
// is kept, so every later run compiles first time.
const ORDER = [];
const STUBS = { THREE, skyK: () => 1 };   // skyK is island.ts's normal-keyed tint: colour only
function run(js, locals, hooks) {
  for (let guard = 0; guard < 300; guard++) {
    const seen = new Set(), pre = [];
    for (const n of ORDER) { const st = DECL.get(n); if (!seen.has(st)) { seen.add(st); pre.push(jsOf(st)); } }
    const names = [...Object.keys(STUBS), '__hooks', ...Object.keys(locals)];
    const vals = [...Object.values(STUBS), hooks, ...Object.values(locals)];
    const f = new Function(...names, `${pre.join('\n')}\n${js}`);
    try { return f(...vals); } catch (e) {
      if (!(e instanceof ReferenceError)) throw e;
      const m = /^(\w+) is not defined$/.exec(e.message) || /^Cannot access '(\w+)' before initialization$/.exec(e.message);
      if (!m) throw e;
      const n = m[1];
      if (IMPORTED.has(n)) throw new Error(`faceray: the head now reads \`${n}\`, which life.ts IMPORTS — give this probe a stub for it`);
      if (!DECL.has(n)) throw new Error(`faceray: the head reads \`${n}\`, which is neither a top-level declaration of life.ts `
        + 'nor a makePerson local this probe supplies — the head block changed shape; teach the probe what it is');
      const at = ORDER.indexOf(n); if (at >= 0) ORDER.splice(at, 1);
      ORDER.unshift(n);
    }
  }
  throw new Error('faceray: could not resolve the head block\'s dependencies in 300 passes');
}

// every part pc() makes is recorded with who made it: the head block itself
// (skull, eyes, mouth), hairParts or hatParts
const WRAP = `
{ const __pc = pc; pc = function () { const a = Array.from(arguments); const g = __pc.apply(this, a);
    __hooks.rec(g, a, Object.keys(B).find((k) => B[k] === a[0])); return g; }; }
{ const __f = hairParts; hairParts = function () { __hooks.tag = 'hair'; try { return __f.apply(this, arguments); } finally { __hooks.tag = 'face'; } }; }
{ const __f = hatParts; hatParts = function () { __hooks.tag = 'hat'; try { return __f.apply(this, arguments); } finally { __hooks.tag = 'face'; } }; }
`;
const INK = run('return INK;', {}, {});
const SKIN = run('return SKIN;', {}, {});
const OUTFIT = run('return OUTFIT;', {}, {});
const typeUnion = (name) => {
  const st = AST.statements.find((s) => ts.isTypeAliasDeclaration(s) && s.name.text === name);
  if (!st || !ts.isUnionTypeNode(st.type)) throw new Error(`faceray: type ${name} is not a union of literals any more`);
  return st.type.types.map((t) => t.literal.text);
};
const HAIRS = typeUnion('Hair'), HATS = typeUnion('Hat');

/** Build one head: every part, tagged, with its triangles flattened and boxed. */
function head({ hair, hat, hatCol, shirt = 0x4d9de8, skin = SKIN[0], pick = (a) => a[0] }) {
  const parts = [];
  const hooks = { tag: 'face', rec(g, a, base) {
    const pos = g.getAttribute('position').array;
    const bb = new THREE.Box3().setFromBufferAttribute(g.getAttribute('position'));
    parts.push({ tag: this.tag, base, col: a[1], args: a.slice(2), tri: Float32Array.from(pos), bb });
    g.dispose();
  } };
  const o = { hair, hat, hatCol, hairCol: 0x8a5a30 };
  run(`${WRAP}\n${HEAD_JS}\nreturn hp;`, {
    o, fit: {}, kid: false, hair, hairCol: o.hairCol, shirt, skin, pick,
    pants: 0x3a4a6a, accent: 0xffffff, wear: 'tee',
  }, hooks);
  return parts;
}

// ── Moller-Trumbore, front faces only ───────────────────────────────────────
// det > 0 is a triangle wound counter-clockwise as the ray sees it, which is
// three's FrontSide.
function firstHit(parts, ox, oy, oz, dx, dy, dz) {
  let best = Infinity, who = null;
  for (const p of parts) {
    const b = p.bb;
    // slab test against the part's box before any triangle
    let t0 = 0, t1 = best;
    for (const [o, d, lo, hi] of [[ox, dx, b.min.x, b.max.x], [oy, dy, b.min.y, b.max.y], [oz, dz, b.min.z, b.max.z]]) {
      if (Math.abs(d) < 1e-12) { if (o < lo || o > hi) { t0 = 1; t1 = 0; } continue; }
      let a = (lo - o) / d, c = (hi - o) / d; if (a > c) [a, c] = [c, a];
      if (a > t0) t0 = a; if (c < t1) t1 = c;
    }
    if (t0 > t1) continue;
    const T = p.tri;
    for (let i = 0; i < T.length; i += 9) {
      const e1x = T[i + 3] - T[i], e1y = T[i + 4] - T[i + 1], e1z = T[i + 5] - T[i + 2];
      const e2x = T[i + 6] - T[i], e2y = T[i + 7] - T[i + 1], e2z = T[i + 8] - T[i + 2];
      const px = dy * e2z - dz * e2y, py = dz * e2x - dx * e2z, pz = dx * e2y - dy * e2x;
      const det = e1x * px + e1y * py + e1z * pz;
      if (det < 1e-12) continue;
      const sx = ox - T[i], sy = oy - T[i + 1], sz = oz - T[i + 2];
      const u = (sx * px + sy * py + sz * pz) / det; if (u < 0 || u > 1) continue;
      const qx = sy * e1z - sz * e1y, qy = sz * e1x - sx * e1z, qz = sx * e1y - sy * e1x;
      const v = (dx * qx + dy * qy + dz * qz) / det; if (v < 0 || u + v > 1) continue;
      const t = (e2x * qx + e2y * qy + e2z * qz) / det;
      if (t > 1e-9 && t < best) { best = t; who = p; }
    }
  }
  return { t: best, who };
}

const G = 30;   // rays across an eye's footprint: ~500 samples on a drawn eye
/** landed / samples for `target`, seen along pitch `deg` by a camera the face looks at. */
function visible(target, face, occ, deg) {
  const r = deg * Math.PI / 180;
  const d = [0, -Math.sin(r), -Math.cos(r)];          // camera -> head, face is +z
  const u = [1, 0, 0], v = [0, Math.cos(r), -Math.sin(r)];
  let umin = Infinity, umax = -Infinity, vmin = Infinity, vmax = -Infinity;
  const T = target.tri;
  for (let i = 0; i < T.length; i += 3) {
    const pu = T[i] * u[0] + T[i + 1] * u[1] + T[i + 2] * u[2], pv = T[i] * v[0] + T[i + 1] * v[1] + T[i + 2] * v[2];
    if (pu < umin) umin = pu; if (pu > umax) umax = pu; if (pv < vmin) vmin = pv; if (pv > vmax) vmax = pv;
  }
  let n = 0, ok = 0;
  for (let i = 0; i < G; i++) for (let j = 0; j < G; j++) {
    const a = umin + (umax - umin) * (i + 0.5) / G, c = vmin + (vmax - vmin) * (j + 0.5) / G;
    const ox = u[0] * a + v[0] * c - d[0] * 5, oy = u[1] * a + v[1] * c - d[1] * 5, oz = u[2] * a + v[2] * c - d[2] * 5;
    const f = firstHit(face, ox, oy, oz, d[0], d[1], d[2]);
    if (f.who !== target) continue;
    n++;
    const h = firstHit(occ, ox, oy, oz, d[0], d[1], d[2]);
    if (!(h.t < f.t)) ok++;
  }
  return n ? ok / n : NaN;
}

function faceOf(parts) {
  const face = parts.filter((p) => p.tag === 'face');
  const occ = parts.filter((p) => p.tag !== 'face');
  const ink = face.filter((p) => p.col === INK);
  // the eyes are the one INK pair that mirror each other across the face
  const pairs = [];
  for (let i = 0; i < ink.length; i++) for (let j = i + 1; j < ink.length; j++) {
    const a = ink[i].args, b = ink[j].args;
    if (a[0] !== 0 && Math.abs(a[0] + b[0]) < 1e-9 && a.slice(1).every((x, k) => Math.abs(x - b[k + 1]) < 1e-9)) pairs.push([ink[i], ink[j]]);
  }
  if (pairs.length !== 1) throw new Error(`faceray: expected ONE mirrored INK pair on the face (the eyes), found ${pairs.length} — `
    + 'the face changed; teach this probe what an eye is before it reports on one');
  const eyes = pairs[0];
  const mouth = ink.filter((p) => p.args[0] === 0 && p.args[1] < eyes[0].args[1]);
  return { face, occ, eyes, mouth: mouth.length === 1 ? mouth[0] : null };
}

// ── (E) the sweep ───────────────────────────────────────────────────────────
const hats = [null, ...HATS].filter((h) => !ONLY_HAT || ONLY_HAT.includes(String(h)));
const hairs = HAIRS.filter((h) => !ONLY_HAIR || ONLY_HAIR.includes(h));
const nConv = hats.filter((h) => CONVENTION[h]).length * hairs.length;
const pc3 = (a) => a.map((x) => (Number.isNaN(x) ? '  -' : String(Math.round(100 * x)).padStart(3))).join('/');
const fails = [];
let nCombos = 0;
if (ONLY.includes('E')) {
  const eyeAt0 = faceOf(head({ hair: 'bald', hat: null, hatCol: 0x4da3ff })).eyes[0].args;
  console.log(`\nTHE FACE (parsed from ${FILE}): eyes at x ±${Math.abs(eyeAt0[0])}, y ${eyeAt0[1]}, z ${eyeAt0[2]}; `
    + `${HAIRS.length} hairs x ${HATS.length + 1} hats (incl. none) at ${PITCHES.join('/')} deg\n`);
  const rows = [];
  for (const hat of hats) {
    const cells = [];
    for (const hair of hairs) {
      const f = faceOf(head({ hair, hat, hatCol: 0x4da3ff }));
      const eye = PITCHES.map((p) => Math.min(visible(f.eyes[0], f.face, f.occ, p), visible(f.eyes[1], f.face, f.occ, p)));
      const mouth = f.mouth ? PITCHES.map((p) => visible(f.mouth, f.face, f.occ, p)) : null;
      nCombos++;
      if (eye.some((e) => !(e >= EYE_BAR)) && !(hat && CONVENTION[hat])) fails.push({ hair, hat: hat || 'none', eye });
      cells.push({ hair, eye, mouth });
    }
    rows.push({ hat: hat || 'none', cells });
  }
  console.log(`  eye % landing on ink, worse eye, ${PITCHES.join('/')} deg${ROWS ? '   (mouth % in brackets)' : ''}`);
  console.log(`  ${'hat'.padEnd(9)}${hairs.map((h) => h.padStart(13)).join('')}`);
  for (const r of rows) {
    const tag = CONVENTION[r.hat] ? ' (convention)' : '';
    console.log(`  ${r.hat.padEnd(9)}${r.cells.map((c) => pc3(c.eye).padStart(13)).join('')}${tag}`);
    if (ROWS) console.log(`  ${''.padEnd(9)}${r.cells.map((c) => (c.mouth ? `[${pc3(c.mouth)}]` : '[-]').padStart(13)).join('')}`);
  }
  const noHat = rows.find((r) => r.hat === 'none');
  const m = noHat ? noHat.cells.filter((c) => c.mouth) : [];
  if (m.length) console.log(`\n  mouth, bare head, ${PITCHES.join('/')} deg: `
    + m.map((c) => `${c.hair} ${pc3(c.mouth).replace(/ /g, '')}`).join(' · '));
  for (const [h, why] of Object.entries(CONVENTION)) if (hats.includes(h)) console.log(`  convention: ${h} — ${why}`);
}

// ── (H) the hat colour ──────────────────────────────────────────────────────
const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
const fl = (t) => (t > 0.008856 ? Math.cbrt(t) : (7.787 * t) + 16 / 116);
function lab(hex) {
  const R = lin((hex >> 16) & 255), Gc = lin((hex >> 8) & 255), Bc = lin(hex & 255);
  const X = (R * 0.4124 + Gc * 0.3576 + Bc * 0.1805) / 0.95047;
  const Y = R * 0.2126 + Gc * 0.7152 + Bc * 0.0722;
  const Z = (R * 0.0193 + Gc * 0.1192 + Bc * 0.9505) / 1.08883;
  return [116 * fl(Y) - 16, 500 * (fl(X) - fl(Y)), 200 * (fl(Y) - fl(Z))];
}
const dE = (a, b) => { const p = lab(a), q = lab(b); return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]); };
const hex = (c) => `#${c.toString(16).padStart(6, '0')}`;
let pairs = 0, worst = null;
const hatFails = [];
if (ONLY.includes('H')) {
  const shirts = [...new Set(Object.values(OUTFIT).flatMap((f) => f.shirt || []))];
  for (const skin of SKIN) for (const shirt of shirts) {
    pairs++;
    // enumerate every colour the default path can land on for this person:
    // pick() returns each candidate of its first call in turn
    const outcomes = new Set();
    let len = 1;
    for (let k = 0; k < len; k++) {
      let calls = 0;
      const pick = (a) => { calls++; if (calls === 1) { len = a.length; return a[k]; } return a[0]; };
      const parts = head({ hair: 'bald', hat: 'cap', hatCol: undefined, shirt, skin, pick });
      const h = parts.find((p) => p.tag === 'hat');
      if (!h) throw new Error('faceray: a cap produced no hat part');
      outcomes.add(h.col);
      if (calls === 0) break;
    }
    for (const c of outcomes) {
      const m = Math.min(dE(c, shirt), dE(c, skin));
      if (!worst || m < worst.m) worst = { m, c, shirt, skin };
      if (m <= DE_BAR) hatFails.push({ c, shirt, skin, ds: dE(c, shirt), dk: dE(c, skin) });
    }
  }
}

// ── verdicts ────────────────────────────────────────────────────────────────
console.log('');
let exit = 0;
if (ONLY.includes('E')) {
  if (fails.length) {
    exit = 1;
    console.log(`FAIL — (E) ${fails.length} of ${nCombos - nConv} Hair x Hat combinations `
      + `leave less than ${EYE_BAR * 100}% of an eye on ink: `
      + fails.slice(0, 16).map((f) => `${f.hair}/${f.hat} ${pc3(f.eye).replace(/ /g, '')}`).join(', ')
      + (fails.length > 16 ? `, and ${fails.length - 16} more` : ''));
  } else {
    console.log(`PASS — (E) every Hair x Hat shows at least ${EYE_BAR * 100}% of each eye at ${PITCHES.join('/')} deg `
      + `(${nCombos} built, ${nConv} under a brim convention)`);
  }
  if (ONLY_HAT || ONLY_HAIR) console.log('  (a filtered run: (E) covered only the hats and hairs asked for)');
}
if (ONLY.includes('H')) {
  if (hatFails.length) {
    exit = 1;
    // the skin and the shirt collisions are different defects (a skull read,
    // and a head that melts into its own body), so they are counted apart
    const bySkin = hatFails.filter((f) => f.dk <= DE_BAR).sort((a, b) => a.dk - b.dk);
    const byShirt = hatFails.filter((f) => f.ds <= DE_BAR).sort((a, b) => a.ds - b.ds);
    const say = (f) => `${hex(f.c)} on skin ${hex(f.skin)} / shirt ${hex(f.shirt)} (dE ${f.dk.toFixed(1)} skin, ${f.ds.toFixed(1)} shirt)`;
    console.log(`FAIL — (H) ${hatFails.length} skin x shirt x hat-colour outcomes are within dE ${DE_BAR} of the shirt or the skin `
      + `(${pairs} skin x shirt pairs): ${bySkin.length} against the SKIN${bySkin.length ? `, worst ${say(bySkin[0])}` : ''}; `
      + `${byShirt.length} against the SHIRT${byShirt.length ? `, worst ${say(byShirt[0])}` : ''}`);
  } else {
    console.log(`PASS — (H) every hat colour the dress code can pick clears dE ${DE_BAR} from both shirt and skin `
      + `(${pairs} skin x shirt pairs; closest ${worst.m.toFixed(1)}: ${hex(worst.c)} on skin ${hex(worst.skin)} / shirt ${hex(worst.shirt)})`);
  }
}
process.exit(exit);
