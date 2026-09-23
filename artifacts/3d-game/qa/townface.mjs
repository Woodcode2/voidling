// THE FIRST TWO PEOPLE SHE SEES — a static townsperson's face and collar,
// built in node from the real source (studio round 4, Job 6)
//
//   node qa/townface.mjs
//
// The two protesters beside the spawn are mainstreet.ts personParts, and so is
// every judge, farmhand and drive-in customer in Maple Falls. Art direction
// found them the one group in the first frame whose look the rest of the game
// has retired: a scalloped ruff at the collar, and eyes that stand out of the
// head's own outline. This probe builds that head with three, in node, and
// measures both, so neither can come back without a FAIL line.
//
// ── IT RUNS THE SOURCE, IT DOES NOT COPY IT ─────────────────────────────────
// Governor rule 4: a probe that carries its own copy of the geometry describes
// the build it was written against, forever. qa/_crownstatic.mjs is exactly
// that — the skull and hair written out as literals in its first line. So this
// file lifts personParts and makeTownsfolk out of mainstreet.ts as TEXT, with
// the colour tables, the sph/cyl helpers and the mr/mpick/mchance wrappers
// they call, lifts the transform half of part() out of island.ts the same way,
// strips the types and RUNS them. Whatever those functions build is what gets
// measured. Anything it cannot find ABORTS (exit 2) — silently skipping a call
// site that moved is the same bug wearing a hat.
//
// ── SIX CHECKS ──────────────────────────────────────────────────────────────
// Every length is in T, the per-person height unit personParts itself scales
// by (read off the running function, not recomputed), so the jitter between
// a short and a tall townsperson cannot move a verdict.
//
//  1. DRAWS. makeTownsfolk and personParts take their shirt, facing, hat, skin
//     and trousers from Maple's ONE seeded stream. Every authored placement
//     after them depends on that order and that count, so it is frozen here:
//     shirt, facing, [hat], skin, trousers, one draw each. qa/rng.mjs and
//     qa/opening.mjs need a browser; this is the same contract, provable in
//     node, for the one function Job 6 edits.
//  2. FACING. makeTownsfolk bakes its random facing into the merged geometry,
//     so the mesh's own rotation says nothing about which way the face looks.
//     qa/personsheet.mjs turned every subject by rotation.y alone and shot the
//     back of the bowler's head. The facing has to ride on the mesh as
//     userData.faceRy, equal to the draw that turned it.
//  3. INK INSIDE THE OUTLINE. No face mark may reach further from the head's
//     centre than the head's own drawn silhouette: the widest ring of the
//     tessellated 16x11 skull, 0.36 T x sin(5 pi/11) = 0.356 T. A dark mark
//     that stands past that line reads as a lump on the outline — the
//     owner's "eyes that pop out". Measured in 3D from the head centre, not
//     along the facing: the studio's 0.365 T is the eye's reach seen exactly
//     side-on, and it is not the worst view. From the view where the eye's own
//     direction is square to the camera — at the play camera's 46-65 degrees,
//     a person turned 55-65 degrees away, which it sees all the time — the
//     ball eye stands out further, and 3D reach is the number that covers
//     every view at once.
//  4. INK PROUD OF THE DRAWN SKULL. Along its own outward direction, each
//     mark's highest drawn point has to clear the drawn skull under its centre
//     by 0.005 T. The drawn skull is not the nominal 0.36 T sphere: between
//     rings it sags, by `sag` below, and a mark that clears the nominal sphere
//     but not the facet under it is a mark the skull eats — the "one clean
//     oval and one ragged smudge" mainstreet.ts records.
//  5. INK DRAWS. From the play camera at 46, 55 and 65 degrees, looking at the
//     face, at least half of the rays that meet a mark must meet the mark
//     before the skull. This is Job 4's bar for the walking crowd ("at least
//     50% of eye samples must land on INK"), applied to the static crowd so
//     the two populations are graded alike. It is here because checks 3 and 4
//     are read at ONE point on a mark: a mark can pass both at its centre and
//     still be cut in half by a skull ridge a hair to one side.
//
//     WHAT 3-5 CAUGHT BEFORE ANYTHING SHIPPED. The studio's written fix was
//     to flatten the ball eye where it stood (0.75 across, flat along the
//     skull's normal). Built and run through this file with the skull still
//     fixed to the world: check 3 PASSES at 0.3552 T — and check 4 fails at
//     -0.0027 T and check 5 at 0.0%. On the worst facing the flattened eye is
//     entirely under the skull; some townsfolk would have had no eyes. The
//     outline bar alone would have shipped that, which is why 4 and 5 exist.
//  6. NO SAME-COLOUR RUFF. Where an upright cylinder's cap sits inside the
//     height of a sphere of the SAME colour, the cap's rim and the sphere's
//     own cross-section must be at least 0.03 T apart. Closer than that, two
//     tessellations of one colour interleave along one line and draw a
//     scalloped collar — the chest's top cap against the shoulder yoke,
//     0.40 T against the yoke's 0.394 T at that height. 0.03 T is more than
//     the two tessellations' own sag put together at that joint (14-sided
//     cap, 14x10 yoke), so a pair that clears it cannot scallop. Nominal
//     surfaces, not drawn ones: the ruff is two NOMINAL surfaces agreeing to
//     within the facets' error, which is exactly what a drawn gap cannot see.
//
// Checks 3-5 sweep the facing through one full period of the skull's 16
// columns (22.5 degrees) in 24 steps, because the eyes turn with the person
// and — before this job — the skull did not, so where the eyes landed on the
// skull's facets was different for every townsperson.
//
// ── THE MOUTH IS MEASURED AND NOT GATED ─────────────────────────────────────
// Checks 3-5 read every INK part on the head and print all of them, but only
// the EYES carry a verdict. The mouth is 0.30 T wide; the skull's columns are
// about 0.135 T apart at that height, so the mouth spans two column ridges,
// and a mark cannot clear a ridge (which reaches the full 0.36 T at its
// vertices) without also passing the 0.356 T outline. Keeping the mouth
// inside the outline means cutting it to one facet, under 0.135 T — a change
// to the look of every face in the town that nobody has asked for. That is an
// art call, and it is printed below as one, with its numbers, rather than
// waved through.
import * as THREE from 'three';
import { readFileSync } from 'node:fs';

const MS_PATH = 'src/proto3d/mainstreet.ts';
const IS_PATH = 'src/proto3d/island.ts';
const MS = readFileSync(MS_PATH, 'utf8');
const IS = readFileSync(IS_PATH, 'utf8');
const abort = (why) => { console.log(`ABORTED — ${why}`); process.exit(2); };

const PROUD_MIN = 0.005;        // T — check 4, the studio's number
const DRAW_MIN = 0.5;           // share — check 5, Job 4's number
const PAIR_MIN = 0.03;          // T — check 6, the studio's number
const ELEVATIONS = [46, 55, 65];
const LANDINGS = 24;
const GRID = 32;

// ── SOURCE SURGERY ──────────────────────────────────────────────────────────
// A scanner that knows where comments and strings are, because these functions
// are full of prose with brackets in it, and a brace counter that trips on a
// "{" inside a comment returns half a function without complaint.
function scanFrom(src, i, open, close) {
  let depth = 0;
  for (; i < src.length; i++) {
    const c = src[i], n = src[i + 1];
    if (c === '/' && n === '/') { i = src.indexOf('\n', i); if (i < 0) return -1; continue; }
    if (c === '/' && n === '*') { i = src.indexOf('*/', i + 2) + 1; if (i <= 0) return -1; continue; }
    if (c === "'" || c === '"' || c === '`') {
      for (i++; i < src.length && src[i] !== c; i++) if (src[i] === '\\') i++;
      continue;
    }
    if (c === open) depth++;
    else if (c === close && --depth === 0) return i;
  }
  return -1;
}
/** `function name(...)...{...}` as text, from `function` to its closing brace. */
function fnText(src, name, file) {
  const m = src.match(new RegExp(`(?:export\\s+)?function\\s+${name}\\s*\\(`));
  if (!m) abort(`function ${name} is not in ${file}. The call site moved.`);
  const start = m.index + m[0].indexOf('function');
  const pClose = scanFrom(src, m.index + m[0].length - 1, '(', ')');
  const bOpen = src.indexOf('{', pClose);
  const bClose = scanFrom(src, bOpen, '{', '}');
  if (pClose < 0 || bOpen < 0 || bClose < 0) abort(`function ${name} in ${file} did not brace-match.`);
  return { text: src.slice(start, bClose + 1), params: src.slice(m.index + m[0].length, pClose), body: src.slice(bOpen + 1, bClose) };
}
/** The right-hand side of `const name = ...;` at top level. */
function constRhs(src, name, file) {
  const m = src.match(new RegExp(`(?:^|\\n)(?:export\\s+)?const\\s+${name}\\s*=\\s*`));
  if (!m) abort(`const ${name} is not in ${file}. It moved or was renamed.`);
  let i = m.index + m[0].length, depth = 0;
  for (; i < src.length; i++) {
    const c = src[i];
    if ('([{'.includes(c)) depth++;
    else if (')]}'.includes(c)) depth--;
    else if (c === ';' && depth === 0) break;
  }
  return src.slice(m.index + m[0].length, i).trim();
}
// Node 22 ships a type stripper; the repo's TypeScript is the fallback.
let strip = null;
{
  const mod = await import('node:module');
  if (typeof mod.stripTypeScriptTypes === 'function') {
    strip = (s) => { const w = process.emitWarning; process.emitWarning = () => {}; try { return mod.stripTypeScriptTypes(s); } finally { process.emitWarning = w; } };
  } else {
    try { const ts = (await import('typescript')).default; strip = (s) => ts.transpileModule(s, { compilerOptions: { target: 99 } }).outputText; } catch {}
  }
}
if (!strip) abort('no TypeScript stripper: node:module has no stripTypeScriptTypes and typescript is not installed.');

// part(): the transform half, lifted verbatim — scale, rotate X then Y then
// Z, translate. The colour bake after it does not move a vertex.
const PART = fnText(IS, 'part', IS_PATH);
const cut0 = PART.body.indexOf('const g = geo.index');
const cut1 = PART.body.indexOf('g.translate(x, y, z);');
if (cut0 < 0 || cut1 < cut0) abort(`part() in ${IS_PATH} no longer reads "const g = geo.index ... g.translate(x, y, z);".`);
const partCore = PART.body.slice(cut0, cut1 + 'g.translate(x, y, z);'.length);

const PP = fnText(MS, 'personParts', MS_PATH);
const TF = fnText(MS, 'makeTownsfolk', MS_PATH);
const tHook = PP.text.match(/\n(\s*)const T = [^;]+;/g);
if (!tHook || tHook.length !== 1) abort(`personParts no longer declares exactly one "const T = ...;" — the unit every number here is in.`);
const ppText = PP.text.replace(/\n(\s*)const T = [^;]+;/, (s) => `${s} __probe.T = T;`);

const NAMES = ['INK', 'SKIN', 'DENIM', 'HAIRC', 'SHOES', 'SHIRTS', 'RED', 'BLUE'];
const moduleText = [
  ...NAMES.map((n) => `const ${n} = ${constRhs(MS, n, MS_PATH)};`),
  `const sph = ${constRhs(MS, 'sph', MS_PATH)};`,
  `const cyl = ${constRhs(MS, 'cyl', MS_PATH)};`,
  // the stream wrappers exactly as mainstreet.ts writes them, fed by a
  // counting mrnd, and each wrapped once more so the probe knows WHICH call
  // took each draw
  `const mrnd = () => { __probe.raw++; return __probe.next(); };`,
  `const mr0 = ${constRhs(MS, 'mr', MS_PATH)};`,
  `const mpick0 = ${constRhs(MS, 'mpick', MS_PATH)};`,
  `const mchance0 = ${constRhs(MS, 'mchance', MS_PATH)};`,
  `const mr = (a, b) => { const v = mr0(a, b); __probe.log.push(['mr', v]); return v; };`,
  `const mpick = (arr) => { const v = mpick0(arr); __probe.log.push([__probe.nameOf(arr), v]); return v; };`,
  `const mchance = (p) => { const v = mchance0(p); __probe.log.push(['mchance', v]); return v; };`,
  `function part(${PART.params}) {`,
  `  const __kind = geo.type, __params = { ...geo.parameters };`,
  partCore,
  `  __probe.parts.push({ kind: __kind, params: __params, col, x, y, z, rx, ry, rz, sx, sy: sy ?? sx, sz: sz ?? sx, geo: g });`,
  `  return g;`,
  `}`,
  ppText,
  TF.text,
].join('\n');

let js;
try { js = strip(moduleText); } catch (e) { abort(`the lifted source did not strip: ${e.message}`); }
// the return goes on after stripping: a module-level return is not TypeScript
js += `\nreturn { personParts, makeTownsfolk, tables: { ${NAMES.join(', ')} } };`;
// a small generator of the probe's own, so every run sees the same facings
let seed = 0x7f4a7c15;
const __probe = {
  T: NaN, raw: 0, log: [], parts: [],
  next: () => { seed |= 0; seed = seed + 0x6d2b79f5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; },
  nameOf: (arr) => (Object.entries(lifted.tables).find(([, v]) => v === arr)?.[0]) ?? `literal[${arr.length}]`,
};
const mergedProp = (ps, mat) => new THREE.Mesh(new THREE.BufferGeometry(), mat);
let lifted;
try {
  lifted = new Function('THREE', 'mergedProp', 'PROP_SMOOTH_MAT', '__probe', js)(THREE, mergedProp, new THREE.MeshBasicMaterial(), __probe);
} catch (e) { abort(`the lifted source did not run: ${e.message}`); }
const { personParts, makeTownsfolk, tables } = lifted;
const hex = (c) => `#${c.toString(16).padStart(6, '0')}`;
let failed = 0;
const verdict = (ok, pass, fail) => { console.log(ok ? `PASS — ${pass}` : `FAIL — ${fail}`); if (!ok) failed++; };

// ══ 1 + 2. DRAWS AND FACING ══════════════════════════════════════════════════
console.log('\n  THE FIRST TWO PEOPLE SHE SEES — mainstreet.ts personParts, built in node\n');
console.log('  1-2. makeTownsfolk: seeded draws, in order, and the facing it leaves on the mesh');
for (const hat of [true, false]) {
  __probe.log = []; __probe.raw = 0; __probe.parts = [];
  const mesh = makeTownsfolk(hat);
  const got = __probe.log.map(([k]) => k);
  const want = hat ? ['SHIRTS', 'mr', 'literal[4]', 'SKIN', 'DENIM'] : ['SHIRTS', 'mr', 'SKIN', 'DENIM'];
  console.log(`    hat=${String(hat).padEnd(5)}  draws: ${got.join(' -> ')}  (${__probe.raw} from the stream)`);
  verdict(got.join() === want.join() && __probe.raw === want.length,
    `hat=${hat}: ${want.length} seeded draws, in the order every later Maple placement depends on`,
    `hat=${hat}: the seeded draws are ${got.join(' -> ')} (${__probe.raw} raw), the stream contract is ${want.join(' -> ')} (${want.length}). Every authored placement in Maple Falls after this person has moved.`);
  const ry = __probe.log.find(([k]) => k === 'mr')?.[1];
  const face = mesh.userData.faceRy;
  console.log(`    facing drawn ${ry?.toFixed(4)}   userData.faceRy ${face === undefined ? 'undefined' : face.toFixed(4)}`);
  verdict(typeof face === 'number' && Math.abs(face - ry) < 1e-12,
    `hat=${hat}: the mesh carries the facing its geometry was turned by`,
    `hat=${hat}: userData.faceRy is ${face}, the geometry was turned by ${ry?.toFixed(4)}. A probe that turns this mesh to face the camera cannot know which way the face points.`);
}

// ══ 3-5. THE FACE AGAINST THE DRAWN SKULL ═══════════════════════════════════
// Möller–Trumbore against a non-indexed position buffer: the nearest t > 0.
function firstHit(pos, o, d) {
  let best = Infinity;
  const a = pos.array;
  for (let i = 0; i < a.length; i += 9) {
    const e1x = a[i + 3] - a[i], e1y = a[i + 4] - a[i + 1], e1z = a[i + 5] - a[i + 2];
    const e2x = a[i + 6] - a[i], e2y = a[i + 7] - a[i + 1], e2z = a[i + 8] - a[i + 2];
    const px = d.y * e2z - d.z * e2y, py = d.z * e2x - d.x * e2z, pz = d.x * e2y - d.y * e2x;
    const det = e1x * px + e1y * py + e1z * pz;
    if (Math.abs(det) < 1e-14) continue;
    const inv = 1 / det;
    const tx = o.x - a[i], ty = o.y - a[i + 1], tz = o.z - a[i + 2];
    const u = (tx * px + ty * py + tz * pz) * inv; if (u < 0 || u > 1) continue;
    const qx = ty * e1z - tz * e1y, qy = tz * e1x - tx * e1z, qz = tx * e1y - ty * e1x;
    const v = (d.x * qx + d.y * qy + d.z * qz) * inv; if (v < 0 || u + v > 1) continue;
    const t = (e2x * qx + e2y * qy + e2z * qz) * inv;
    if (t > 1e-9 && t < best) best = t;
  }
  return best;
}
const V = (x, y, z) => new THREE.Vector3(x, y, z);
function build(ry, hat) {
  __probe.log = []; __probe.raw = 0; __probe.parts = []; __probe.T = NaN;
  const out = [];
  personParts(out, 0, 0, tables.SHIRTS[0], ry, hat);
  const T = __probe.T;
  if (!(T > 0)) abort('personParts ran without setting T.');
  const skin = __probe.log.find(([k]) => k === 'SKIN')?.[1];
  if (skin === undefined) abort('personParts drew no skin tone from SKIN.');
  return { T, skin, parts: __probe.parts.slice() };
}
const stats = new Map();        // part class -> worst-case numbers over every landing
const bump = (k, f) => { if (!stats.has(k)) stats.set(k, { reach: -Infinity, sil: Infinity, proud: Infinity, sag: -Infinity, draw: Infinity, n: 0 }); f(stats.get(k)); };
const STEP = (Math.PI * 2 / 16) / LANDINGS;
for (let k = 0; k < LANDINGS; k++) {
  const ry = 0.1 + k * STEP;
  const { T, skin, parts } = build(ry, tables.RED);
  const skulls = parts.filter((q) => q.kind === 'SphereGeometry' && q.col === skin)
    .sort((a, b) => b.params.radius * b.sx - a.params.radius * a.sx);
  const skull = skulls[0];
  if (!skull || skull.sx !== skull.sy || skull.sx !== skull.sz) abort('the skull (largest skin-coloured sphere) is missing or not round.');
  const c = V(skull.x, skull.y, skull.z), R = skull.params.radius * skull.sx;
  const sp = skull.geo.getAttribute('position');
  let SIL = 0;
  for (let i = 0; i < sp.count; i++) SIL = Math.max(SIL, Math.hypot(sp.getX(i) - c.x, sp.getZ(i) - c.z));
  const fwd = V(Math.sin(ry), 0, Math.cos(ry)), rgt = V(Math.cos(ry), 0, -Math.sin(ry));
  const ink = parts.filter((q) => q.col === tables.INK && V(q.x, q.y, q.z).distanceTo(c) < 1.5 * R);
  if (ink.length < 2) abort(`only ${ink.length} INK part(s) on the head — the face moved or lost its colour.`);
  for (const q of ink) {
    const p = V(q.x, q.y, q.z), off = p.clone().sub(c);
    const cls = Math.abs(off.dot(rgt)) > 0.15 * R ? 'eye' : 'mouth';
    const d = off.clone().normalize();
    const pos = q.geo.getAttribute('position');
    let reach = 0, apex = -Infinity, ext = 0;
    const v = V(0, 0, 0);
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      ext = Math.max(ext, v.distanceTo(p));
      v.sub(c); reach = Math.max(reach, v.length()); apex = Math.max(apex, v.dot(d));
    }
    const s = firstHit(sp, c, d);                       // the drawn skull under the mark's centre
    if (!Number.isFinite(s)) abort('a ray from the head centre found no skull — the skull is not closed.');
    let worstDraw = Infinity;
    for (const el of ELEVATIONS) {
      const e = el * Math.PI / 180;
      const toCam = fwd.clone().multiplyScalar(Math.cos(e)).add(V(0, Math.sin(e), 0)).normalize();
      const dir = toCam.clone().negate();
      const u = new THREE.Vector3().crossVectors(dir, V(0, 1, 0)).normalize();
      const w = new THREE.Vector3().crossVectors(u, dir).normalize();
      let met = 0, first = 0;
      for (let a = 0; a < GRID; a++) for (let b = 0; b < GRID; b++) {
        const o = p.clone().addScaledVector(u, ((a + 0.5) / GRID - 0.5) * 2.2 * ext)
          .addScaledVector(w, ((b + 0.5) / GRID - 0.5) * 2.2 * ext).addScaledVector(toCam, 4 * R);
        const hi = firstHit(pos, o, dir);
        if (!Number.isFinite(hi)) continue;
        met++;
        if (hi <= firstHit(sp, o, dir)) first++;
      }
      if (!met) abort('no ray from the play camera met a face mark at all — the grid is wrong.');
      worstDraw = Math.min(worstDraw, first / met);
    }
    bump(cls, (st) => {
      st.n++;
      st.reach = Math.max(st.reach, reach / T); st.sil = Math.min(st.sil, SIL / T);
      st.proud = Math.min(st.proud, (apex - s) / T); st.sag = Math.max(st.sag, (R - s) / T);
      st.draw = Math.min(st.draw, worstDraw);
    });
  }
}
console.log(`\n  3-5. the face against the drawn skull — ${LANDINGS} facings across one 22.5-degree skull period, camera at ${ELEVATIONS.join('/')} degrees`);
console.log('    mark    reach   outline   proud    sag    draws');
for (const [cls, st] of stats) console.log(`    ${cls.padEnd(6)} ${st.reach.toFixed(4)}T  ${st.sil.toFixed(4)}T  ${st.proud.toFixed(4)}T  ${st.sag.toFixed(4)}T  ${(100 * st.draw).toFixed(1).padStart(5)}%   (worst of ${st.n})`);
const eye = stats.get('eye');
if (!eye) abort('no INK part classified as an eye.');
verdict(eye.reach <= eye.sil,
  `no eye reaches past the skull's drawn outline (${eye.reach.toFixed(4)} T against ${eye.sil.toFixed(4)} T)`,
  `an eye reaches ${eye.reach.toFixed(4)} T from the head centre, past the skull's drawn outline at ${eye.sil.toFixed(4)} T — it stands out of the silhouette by ${(eye.reach - eye.sil).toFixed(4)} T.`);
verdict(eye.proud >= PROUD_MIN,
  `every eye clears the drawn skull under it by ${eye.proud.toFixed(4)} T (bar ${PROUD_MIN} T; the skull sags up to ${eye.sag.toFixed(4)} T there)`,
  `an eye clears the drawn skull under its centre by only ${eye.proud.toFixed(4)} T against a ${PROUD_MIN} T bar — the facet it lands on eats it.`);
verdict(eye.draw >= DRAW_MIN,
  `from every camera elevation at least ${(100 * eye.draw).toFixed(1)}% of each eye draws in front of the skull (bar ${100 * DRAW_MIN}%)`,
  `on the worst facing only ${(100 * eye.draw).toFixed(1)}% of an eye draws in front of the skull (bar ${100 * DRAW_MIN}%) — the rest of it is under the skull.`);
const mouth = stats.get('mouth');
if (mouth) {
  const over = mouth.reach - mouth.sil;
  console.log(over > 0
    ? `  NOT GATED — the mouth reaches ${mouth.reach.toFixed(4)} T, ${over.toFixed(4)} T past the outline. An art call (see this file's header), not Job 6's.`
    : `  NOT GATED — the mouth sits inside the outline (${mouth.reach.toFixed(4)} T).`);
}

// ══ 6. SAME-COLOUR SPHERE / CAP PAIRS ═══════════════════════════════════════
console.log('\n  6. same-colour sphere / cylinder-cap pairs, nominal surfaces');
const pairRows = [];
for (const ry of [0.1, 1.3, 2.9]) {
  const { T, parts } = build(ry, tables.RED);
  const upright = (q) => !q.rx && !q.rz;
  for (const C of parts.filter((q) => q.kind === 'CylinderGeometry' && upright(q))) {
    const h = C.params.height * C.sy;
    const caps = [['top', C.y + h / 2, C.params.radiusTop * C.sx], ['bottom', C.y - h / 2, C.params.radiusBottom * C.sx]];
    for (const S of parts.filter((q) => q.kind === 'SphereGeometry' && q.col === C.col)) {
      const Rv = S.params.radius * S.sy, Rh = S.params.radius * S.sx;
      for (const [which, yc, rc] of caps) {
        if (Math.abs(yc - S.y) >= Rv) continue;
        // a same-colour sphere that is tipped or oval in plan would need a
        // model this probe does not have — say so rather than skip it
        if (!upright(S) || Math.abs(S.sx - S.sz) > 1e-12) abort(`a ${hex(S.col)} sphere that is not upright-round meets a same-colour cylinder cap; the pair check cannot model it.`);
        const rho = Rh * Math.sqrt(1 - ((yc - S.y) / Rv) ** 2);
        const e = Math.hypot(C.x - S.x, C.z - S.z);
        const gap = e + Math.min(rho, rc) <= Math.max(rho, rc) ? Math.max(rho, rc) - Math.min(rho, rc) - e
          : e < rho + rc ? 0 : e - rho - rc;
        const tag = `${hex(C.col)}  r${(rc / T).toFixed(3)} ${which} cap at ${(yc / T).toFixed(3)}T  vs  sphere r${(S.params.radius * S.sx / T).toFixed(3)} at ${(S.y / T).toFixed(3)}T`;
        const prev = pairRows.find((r) => r.tag === tag);
        if (!prev) pairRows.push({ tag, gap: gap / T, cap: rc / T, sec: rho / T });
        else prev.gap = Math.min(prev.gap, gap / T);
      }
    }
  }
}
if (!pairRows.length) abort('no same-colour sphere/cap pair found at all — the chest and yoke are not where this probe looks.');
pairRows.sort((a, b) => a.gap - b.gap);
for (const r of pairRows) console.log(`    ${r.tag}   cap ${r.cap.toFixed(4)}T  section ${r.sec.toFixed(4)}T  gap ${r.gap.toFixed(4)}T${r.gap < PAIR_MIN ? '   <-- RUFF' : ''}`);
const worst = pairRows[0];
verdict(worst.gap >= PAIR_MIN,
  `every same-colour sphere/cap pair is at least ${PAIR_MIN} T apart (closest ${worst.gap.toFixed(4)} T)`,
  `a same-colour cap rim runs ${worst.gap.toFixed(4)} T from its sphere's surface (bar ${PAIR_MIN} T): ${worst.tag}. Two tessellations of one colour on one line draw a scalloped ruff.`);

console.log('');
if (failed) { console.log(`FAIL — ${failed} check(s) failed.`); process.exit(1); }
console.log('PASS — the static townsperson\'s face and collar are clean.');
