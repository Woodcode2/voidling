// TEAM MOVERS — how much of a crowd person's SKULL is bare skin, and is the eye
// covered? Pure geometry against the numbers in life.ts. pc(base,col,x,y,z,sx,sy,sz)
// translates by x,y,z (UNSCALED head-pivot units) and scales the base primitive.
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
import { readFileSync } from 'node:fs';
const SRC = readFileSync('src/proto3d/life.ts', 'utf8');
/** Pull `pc(BASE, colour, x, y, z, sx, sy, sz)` out of the line matching `re`. */
function shell(re, label, phi = Math.PI * 0.56) {
  const m = SRC.match(re);
  if (!m) throw new Error(`_headcover: could not find ${label} in life.ts — the call site moved, `
    + `and a probe that silently skips what it cannot find is worse than none`);
  const n = m[1].split(',').map((x) => parseFloat(x.trim()));
  if (n.length < 6 || n.some(Number.isNaN)) throw new Error(`_headcover: ${label} did not parse: ${m[1]}`);
  const [x, y, z, sx, sy, sz] = n;
  return { c: [x, y, z], a: [sx * 0.5, sy * 0.5, sz * 0.5], phi };
}
const skull = shell(/pc\(B\.sph,\s*skin,\s*([^)]*)\)/, 'skull', Math.PI);
const crown = shell(/pc\(B\.hemi,\s*col,\s*([^)]*)\)\);\s*\/\/ shared crown/, 'shared crown');
const S = {
  cap:    shell(/kind === 'cap'[\s\S]{0,400}?pc\(B\.hemi,\s*col,\s*([^)]*)\)/, 'cap'),
  buzz:   shell(/style === 'buzz'[\s\S]{0,200}?pc\(B\.hemi,\s*col,\s*([^)]*)\)/, 'buzz'),
  curly:  shell(/style === 'curly'[\s\S]{0,400}?pc\(B\.hemi,\s*col,\s*([^)]*)\)/, 'curly'),
  beanie: shell(/beanie: dome[\s\S]{0,200}?pc\(B\.hemi,\s*col,\s*([^)]*)\)/, 'beanie'),
};
// curly adds five lumps on the crown — model them, they are real coverage
const curlyDots = [];
for (let i = 0; i < 5; i++) { const a = i*1.2566;
  curlyDots.push({ c: [Math.sin(a)*0.35, 0.28 + (i%2)*0.11, Math.cos(a)*0.35 - 0.03], a: [0.19,0.19,0.19], phi: Math.PI }); }
const eye = { c: [0.185, 0.075, 0.40], a: [0.16*0.5, 0.18*0.5, 0.12*0.5] };     // life.ts:1148
function inside(sh, p) {
  const d = [p[0]-sh.c[0], p[1]-sh.c[1], p[2]-sh.c[2]];
  const n = [d[0]/sh.a[0], d[1]/sh.a[1], d[2]/sh.a[2]];
  const q = n[0]*n[0]+n[1]*n[1]+n[2]*n[2];
  if (q > 1) return false;
  const m = Math.sqrt(q); if (m === 0) return true;
  return Math.acos(Math.max(-1, Math.min(1, n[1]/m))) <= sh.phi;
}
function bare(name, shells) {
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
  console.log(`  ${name.padEnd(26)} ${(100*upBare/up).toFixed(1).padStart(5)}% of the up-facing skull is BARE SKIN`);
  return upBare/up;
}
console.log('\nBARE SKIN ON THE CROWN, by headwear (life.ts):');
bare('short/bob/long/bun/pony/braids', [crown]);
bare('curly', [S.curly, ...curlyDots]);
bare('buzz', [S.buzz]);
bare('any of the above + cap', [crown, S.cap]);
bare('any of the above + beanie', [crown, S.beanie]);
bare('bald (1 of 14 HAIRS draws)', []);
console.log('\nTHE EYE (life.ts:1148), against each shell that could hide it:');
for (const [nm, sh] of [['hair crown', crown], ['curly crown', S.curly], ['buzz', S.buzz], ['cap', S.cap], ['beanie', S.beanie]]) {
  let out = 0, tot = 0; const N = 200;
  for (let i = 0; i < N; i++) for (let j = 0; j < 2*N; j++) {
    const t = Math.PI*(i+0.5)/N, ph = 2*Math.PI*(j+0.5)/(2*N), w = Math.sin(t); tot += w;
    const p = [eye.c[0]+eye.a[0]*Math.sin(t)*Math.cos(ph), eye.c[1]+eye.a[1]*Math.cos(t), eye.c[2]+eye.a[2]*Math.sin(t)*Math.sin(ph)];
    if (!inside(sh, p)) out += w;
  }
  console.log(`  ${nm.padEnd(12)} ${(100*out/tot).toFixed(1).padStart(5)}% of the eye is outside it (0% = completely buried)`);
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
// life.ts:1143-1146 argues "at x 0.185 the surface sits at z 0.459, and a 0.08
// dot centred at z 0.40 ends at 0.48 — two hundredths proud". Two errors: the
// dot's z half-extent is 0.12*0.5 = 0.06, not 0.08, and the skull is centred at
// z = +0.01, so its surface is at 0.469, not 0.459.
{
  const bun = { c: [0, 0.34, -0.30], a: [0.22, 0.22, 0.22], phi: Math.PI };
  let out = 0, tot = 0; const N = 260;
  for (let i = 0; i < N; i++) for (let j = 0; j < 2*N; j++) {
    const t = Math.PI*(i+0.5)/N, ph = 2*Math.PI*(j+0.5)/(2*N), w = Math.sin(t); tot += w;
    const p = [eye.c[0]+eye.a[0]*Math.sin(t)*Math.cos(ph), eye.c[1]+eye.a[1]*Math.cos(t), eye.c[2]+eye.a[2]*Math.sin(t)*Math.sin(ph)];
    if (!inside({ ...skull, phi: Math.PI }, p)) out += w;
  }
  const x = 0.185, y = 0.075;
  const zs = skull.c[2] + skull.a[2]*Math.sqrt(1 - (x/skull.a[0])**2 - (y/skull.a[1])**2);
  console.log(`\nTHE EYE vs THE SKULL (no hair at all, hair:'bald'):`);
  console.log(`  skull surface at (x ${x}, y ${y}) is z = ${zs.toFixed(4)}`);
  console.log(`  the eye dot's front face is  z = ${(eye.c[2]+eye.a[2]).toFixed(4)}   -> ${(eye.c[2]+eye.a[2]-zs > 0 ? 'PROUD by ' : 'BURIED by ')}${Math.abs(eye.c[2]+eye.a[2]-zs).toFixed(4)}`);
  console.log(`  ${(100*out/tot).toFixed(1)}% of the eye's surface is outside the skull`);
  // and the bun through a cap
  let bo = 0, bt = 0;
  for (let i = 0; i < N; i++) for (let j = 0; j < 2*N; j++) {
    const t = Math.PI*(i+0.5)/N, ph = 2*Math.PI*(j+0.5)/(2*N), w = Math.sin(t); bt += w;
    const p = [bun.c[0]+bun.a[0]*Math.sin(t)*Math.cos(ph), bun.c[1]+bun.a[1]*Math.cos(t), bun.c[2]+bun.a[2]*Math.sin(t)*Math.sin(ph)];
    if (!inside(S.cap, p)) bo += w;
  }
  console.log(`\nTHE 'bun' (life.ts:714) vs a CAP worn over it: ${(100*bo/bt).toFixed(1)}% of the bun is outside the cap`);
}
