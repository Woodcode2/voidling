// TEAM MOVERS — how much of a crowd person's SKULL is bare skin, and is the eye
// covered? Pure geometry against the numbers in life.ts. pc(base,col,x,y,z,sx,sy,sz,rx,ry,rz)
// scales the base primitive, rotates it (Euler order read from pc() itself) and
// translates it by x,y,z in head-pivot units.
// B.sph / B.dot / B.hemi are all radius-0.5 spheres; B.hemi is truncated at
// phiLength = PI*0.56 (100.8 degrees from the north pole).
// ── READ THE NUMBERS FROM life.ts, DO NOT TRANSCRIBE THEM ────────────────
// This file first carried the geometry as literals copied out of life.ts. That
// makes it a snapshot, not a measurement: the hair was raised to cover the
// skull and this probe went on reporting 28.8% bare, because it was still
// describing the build it was written against. Exactly what qa/_zgrade.mjs did
// when it kept modelling a tone curve that had already been replaced.
//
// It parses the real call sites now, so it cannot say anything about a build
// that no longer exists.
//
// ── RETRACTED, 2026-09-23: IT PARSED THE SHELLS AND STILL DESCRIBED A GHOST ──
// Studio round 4 (B3) found it had not finished the job the note above says it
// did, three ways, and printed the defect it exists to catch as a number and
// exited 0 on it:
//   1. THE EYE WAS STILL A LITERAL. `{ c: [0.185, 0.075, 0.40] }`, copied from
//      a life.ts line that had since moved the eye to z 0.43 to stop it sinking
//      into the skull. So its "THE EYE vs THE SKULL" section went on reporting
//      the eye BURIED by 0.0091 — describing a head nobody had been building
//      since the mouth landed (db37367).
//   2. IT READ SIX ARGUMENTS OF NINE. shell() took x,y,z,sx,sy,sz and dropped
//      the rotation, so a shell tipped back off the face would have been
//      measured sitting level — and tipping the shells back IS the fix.
//   3. IT JUDGED NOTHING. "hair crown 0.0% of the eye is outside it (0% =
//      completely buried)" is the whole of B3, stated plainly, beside exit 0.
//      A probe that prints the failure and passes is a comment.
// Now: the eye is parsed from its own statement (the loop and the pc() call
// inside it), every shell carries its rotation, the curly lumps are evaluated
// from the loop that makes them rather than copied from it, and the run exits 1
// on any eye that is entirely inside a shell or the skull, and on any hair
// style that leaves the up-facing scalp bare.
import { readFileSync } from 'node:fs';
// An aborted run (a call site that no longer parses, a missing module) ends in
// one FAIL line, not a stack trace and silence: this is a push-gate step.
const abort = (e) => { console.log(`FAIL — _headcover aborted before a verdict: ${e && e.message ? e.message : e}`); process.exit(1); };
process.on('uncaughtException', abort);
process.on('unhandledRejection', abort);
const THREE = await import('three');
const SRC = readFileSync('src/proto3d/life.ts', 'utf8');
const need = (m, label) => {
  if (!m) throw new Error(`_headcover: could not find ${label} in life.ts — the call site moved, `
    + `and a probe that silently skips what it cannot find is worse than none`);
  return m;
};
// pc() composes its rotation with an Euler order; read it rather than assume it
const ORDER = need(SRC.match(/_pe\.set\(rx,\s*ry,\s*rz,\s*'([XYZ]{3})'\)/), "pc()'s Euler order")[1];
/** A part as an ellipsoid (optionally a polar sector) under pc()'s own transform. */
function part(n, label, phi) {
  if (n.length < 4 || n.some(Number.isNaN)) throw new Error(`_headcover: ${label} did not parse: ${n.join(', ')}`);
  const [x, y, z, sx, sy = sx, sz = sx, rx = 0, ry = 0, rz = 0] = n;
  const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, ORDER)),
    new THREE.Vector3(sx * 0.5, sy * 0.5, sz * 0.5));
  return { c: [x, y, z], a: [sx * 0.5, sy * 0.5, sz * 0.5], r: [rx, ry, rz], phi, inv: m.clone().invert(), m };
}
const nums = (s) => s.split(',').map((x) => parseFloat(x.trim()));
/** Pull `pc(BASE, colour, x, y, z, sx, sy, sz[, rx, ry, rz])` out of the line matching `re`. */
function shell(re, label, phi = Math.PI * 0.56) {
  return part(nums(need(SRC.match(re), label)[1]), label, phi);
}
const skull = shell(/pc\(B\.sph,\s*skin,\s*([^)]*)\)/, 'skull', Math.PI);
// the scalp sweep and the surface arithmetic below walk the skull and the eye
// as axis-aligned ellipsoids; a rotated one would be measured wrong, so refuse
const level = (sh, label) => { if (sh.r.some((v) => v !== 0)) throw new Error(`_headcover: the ${label} is rotated now — teach the scalp sweep`); };
level(skull, 'skull');
const crown = shell(/pc\(B\.hemi,\s*col,\s*([^)]*)\)\);\s*\/\/ shared crown/, 'shared crown');
const S = {
  cap:     shell(/kind === 'cap'[\s\S]{0,400}?pc\(B\.hemi,\s*col,\s*([^)]*)\)/, 'cap'),
  postal:  shell(/kind === 'postal'[\s\S]{0,400}?pc\(B\.hemi,\s*0x[0-9a-f]+,\s*([^)]*)\)/, 'postal'),
  buzz:    shell(/style === 'buzz'[\s\S]{0,200}?pc\(B\.hemi,\s*col,\s*([^)]*)\)/, 'buzz'),
  curly:   shell(/style === 'curly'[\s\S]{0,400}?pc\(B\.hemi,\s*col,\s*([^)]*)\)/, 'curly'),
  beanie:  shell(/beanie: dome[\s\S]{0,400}?pc\(B\.hemi,\s*col,\s*([^)]*)\)/, 'beanie'),
  hood:    shell(/kind === 'hood'[\s\S]{0,400}?pc\(B\.hemi,\s*col,\s*([^)]*)\)/, 'hood'),
  bandana: shell(/kind === 'bandana'[\s\S]{0,200}?pc\(B\.hemi,\s*col,\s*([^)]*)\)/, 'bandana'),
};
// curly adds lumps on the crown — they are real coverage, so evaluate the loop
// that makes them: its count, its angle step, and each pc() argument as the
// expression it is in the source
const curlyDots = [];
{
  const m = need(SRC.match(/style === 'curly'[\s\S]{0,600}?for \(let i = 0; i < (\d+); i\+\+\) \{\s*const a = i \* ([\d.]+);\s*out\.push\(pc\(B\.dot,\s*col,\s*([^;]*)\)\);/),
    'the curly lump loop');
  const args = []; let depth = 0, cur = '';
  for (const ch of m[3].replace(/\)$/, '')) {
    if (ch === '(') depth++; if (ch === ')') depth--;
    if (ch === ',' && depth === 0) { args.push(cur); cur = ''; } else cur += ch;
  }
  args.push(cur);
  const fns = args.map((e) => new Function('i', 'a', `return (${e});`));
  for (let i = 0; i < +m[1]; i++) {
    const a = i * parseFloat(m[2]);
    curlyDots.push(part(fns.map((f) => f(i, a)), `curly lump ${i}`, Math.PI));
  }
}
// THE EYE: `for (const ex of [-X, X]) { hp.push(pc(B.dot, INK, ex, y, z, sx, sy, sz)); }`
const eyeM = need(SRC.match(/for \(const (\w+) of \[\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\]\)\s*\{?\s*hp\.push\(pc\(B\.dot,\s*INK,\s*\1,\s*([^)]*)\)\)/),
  'the eye statement');
const EX = Math.max(parseFloat(eyeM[2]), parseFloat(eyeM[3]));
const eye = part([EX, ...nums(eyeM[4])], 'eye', Math.PI);
level(eye, 'eye');
const eyeLine = SRC.slice(0, SRC.indexOf(eyeM[0])).split('\n').length;
function inside(sh, p) {
  const q = new THREE.Vector3(p[0], p[1], p[2]).applyMatrix4(sh.inv);   // unit-sphere space
  const r2 = q.lengthSq();
  if (r2 > 1) return false;
  const m = Math.sqrt(r2); if (m === 0) return true;
  return Math.acos(Math.max(-1, Math.min(1, q.y / m))) <= sh.phi;
}
/** a point on a part's surface, by its own polar angles, in head space */
function surf(sh, t, ph) {
  return new THREE.Vector3(Math.sin(t) * Math.cos(ph), Math.cos(t), Math.sin(t) * Math.sin(ph)).applyMatrix4(sh.m).toArray();
}
const failures = [];
function bare(name, shells, bar = true) {
  // fraction of the skull's UP-FACING surface (normal >30 deg above horizontal —
  // what a camera 46 deg above the ground actually sees of a head) that is skin
  let up = 0, upBare = 0; const N = 500;
  for (let i = 0; i < N; i++) for (let j = 0; j < 2*N; j++) {
    const t = Math.PI*(i+0.5)/N, ph = 2*Math.PI*(j+0.5)/(2*N), w = Math.sin(t);
    const p = [skull.c[0]+skull.a[0]*Math.sin(t)*Math.cos(ph), skull.c[1]+skull.a[1]*Math.cos(t),
               skull.c[2]+skull.a[2]*Math.sin(t)*Math.sin(ph)];
    const nr = [(p[0]-skull.c[0])/skull.a[0]**2, (p[1]-skull.c[1])/skull.a[1]**2, (p[2]-skull.c[2])/skull.a[2]**2];
    if (nr[1]/Math.hypot(...nr) <= 0.5) continue;
    up += w; if (!shells.some(s => inside(s, p))) upBare += w;
  }
  const pct = 100*upBare/up;
  console.log(`  ${name.padEnd(26)} ${pct.toFixed(1).padStart(5)}% of the up-facing skull is BARE SKIN`);
  // 0.05% is what prints as "0.1": a hair shell tipped off the face must still
  // cover the top of the head it is on, and the bar is what the build measured
  // before the tip (0.0% for every style)
  if (bar && pct >= 0.05) failures.push(`${name} leaves ${pct.toFixed(1)}% of the up-facing scalp bare`);
  return upBare/up;
}
console.log('\nBARE SKIN ON THE CROWN, by headwear (life.ts):');
bare('short/bob/long/bun/pony/braids', [crown]);
bare('curly', [S.curly, ...curlyDots]);
bare('buzz', [S.buzz]);
bare('any of the above + cap', [crown, S.cap]);
bare('any of the above + beanie', [crown, S.beanie]);
bare('bald (1 of 14 HAIRS draws)', [], false);
console.log(`\nTHE EYE (life.ts:${eyeLine}, x ±${EX} y ${eye.c[1]} z ${eye.c[2]}), against each shell that could hide it:`);
const eyeOut = (sh) => {
  let out = 0, tot = 0; const N = 200;
  for (let i = 0; i < N; i++) for (let j = 0; j < 2*N; j++) {
    const t = Math.PI*(i+0.5)/N, ph = 2*Math.PI*(j+0.5)/(2*N), w = Math.sin(t); tot += w;
    if (!inside(sh, surf(eye, t, ph))) out += w;
  }
  return 100*out/tot;
};
for (const [nm, sh] of [['hair crown', crown], ['curly crown', S.curly], ['buzz', S.buzz], ['cap', S.cap],
  ['postal', S.postal], ['beanie', S.beanie], ['hood', S.hood], ['bandana', S.bandana]]) {
  const o = eyeOut(sh);
  console.log(`  ${nm.padEnd(12)} ${o.toFixed(1).padStart(5)}% of the eye is outside it (0% = completely buried)`);
  // it prints to one decimal, so under 0.05 is what a reader sees as "0.0%"
  if (o < 0.05) failures.push(`the eye is entirely inside the ${nm} (${o.toFixed(1)}% outside)`);
}
function plan(name, shells) {
  console.log(`\n  plan view from directly overhead — '#' = bare skin — ${name}`);
  for (let zi = -12; zi <= 12; zi++) { let line = '';
    for (let xi = -12; xi <= 12; xi++) {
      const x = xi/12*skull.a[0], z = zi/12*skull.a[2];
      const q = (x/skull.a[0])**2 + (z/skull.a[2])**2;
      if (q > 1) { line += ' '; continue; }
      const p = [x, skull.c[1]+skull.a[1]*Math.sqrt(1-q), skull.c[2]+z];
      line += shells.some(s => inside(s, p)) ? '.' : '#';
    }
    console.log('  ' + line); }
}
plan('hair only', [crown]);
plan('hair + cap', [crown, S.cap]);

// ── AND THE ONE THAT MATTERS: is the eye outside the SKULL itself? ──────────
// life.ts once argued "at x 0.185 the surface sits at z 0.459, and a 0.08 dot
// centred at z 0.40 ends at 0.48 — two hundredths proud". Two errors: the dot's
// z half-extent is 0.12*0.5 = 0.06, not 0.08, and the skull is centred at
// z = +0.01, so its surface is at 0.469, not 0.459. The eye was moved to z 0.43
// for exactly that; this section now reads wherever it is.
{
  const bun = shell(/style === 'bun'[\s\S]{0,80}?pc\(B\.sphS,\s*col,\s*([^)]*)\)/, 'bun', Math.PI);
  let out = 0, tot = 0; const N = 260;
  for (let i = 0; i < N; i++) for (let j = 0; j < 2*N; j++) {
    const t = Math.PI*(i+0.5)/N, ph = 2*Math.PI*(j+0.5)/(2*N), w = Math.sin(t); tot += w;
    if (!inside(skull, surf(eye, t, ph))) out += w;
  }
  const x = eye.c[0], y = eye.c[1];
  const zs = skull.c[2] + skull.a[2]*Math.sqrt(1 - (x/skull.a[0])**2 - (y/skull.a[1])**2);
  const front = eye.c[2] + eye.a[2];
  console.log(`\nTHE EYE vs THE SKULL (no hair at all, hair:'bald'):`);
  console.log(`  skull surface at (x ${x}, y ${y}) is z = ${zs.toFixed(4)}`);
  console.log(`  the eye dot's front face is  z = ${front.toFixed(4)}   -> ${(front - zs > 0 ? 'PROUD by ' : 'BURIED by ')}${Math.abs(front - zs).toFixed(4)}`);
  console.log(`  ${(100*out/tot).toFixed(1)}% of the eye's surface is outside the skull`);
  if (100*out/tot < 0.05) failures.push(`the eye is entirely inside the skull (front face ${front.toFixed(4)} against ${zs.toFixed(4)})`);
  // and the bun through a cap
  let bo = 0, bt = 0;
  for (let i = 0; i < N; i++) for (let j = 0; j < 2*N; j++) {
    const t = Math.PI*(i+0.5)/N, ph = 2*Math.PI*(j+0.5)/(2*N), w = Math.sin(t); bt += w;
    if (!inside(S.cap, surf(bun, t, ph))) bo += w;
  }
  console.log(`\nTHE 'bun' vs a CAP worn over it: ${(100*bo/bt).toFixed(1)}% of the bun is outside the cap`);
}
console.log('');
if (failures.length) {
  console.log(`FAIL — ${failures.length} head(s) hide a face or show a scalp: ${failures.join('; ')}`);
  process.exit(1);
}
console.log('PASS — every eye stands at least partly outside every shell that could hide it, and outside the skull; '
  + 'no hair style leaves the up-facing scalp bare');
