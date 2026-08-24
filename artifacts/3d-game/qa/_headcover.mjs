// TEAM MOVERS — how much of a crowd person's SKULL is bare skin, and is the eye
// covered? Pure geometry against the numbers in life.ts. pc(base,col,x,y,z,sx,sy,sz)
// translates by x,y,z (UNSCALED head-pivot units) and scales the base primitive.
// B.sph / B.dot / B.hemi are all radius-0.5 spheres; B.hemi is truncated at
// phiLength = PI*0.56 (100.8 degrees from the north pole).
const skull = { c: [0, 0, 0.01],  a: [1.06*0.5, 1.12*0.5, 0.99*0.5] };          // life.ts:1109
const crown = { c: [0, 0.05, -0.02], a: [1.14*0.5, 0.98*0.5, 1.14*0.5], phi: Math.PI*0.56 }; // life.ts:711
const S = {
  cap:    { c: [0, 0.14, -0.02], a: [1.17*0.5, 0.94*0.5, 1.17*0.5], phi: Math.PI*0.56 },  // life.ts:668
  buzz:   { c: [0, 0.03, -0.02], a: [1.09*0.5, 0.66*0.5, 1.09*0.5], phi: Math.PI*0.56 },  // life.ts:703
  curly:  { c: [0, 0.04, -0.02], a: [1.08*0.5, 0.90*0.5, 1.08*0.5], phi: Math.PI*0.56 },  // life.ts:705
  beanie: { c: [0, 0.10, 0],     a: [1.16*0.5, 1.18*0.5, 1.16*0.5], phi: Math.PI*0.56 },  // life.ts:698
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
