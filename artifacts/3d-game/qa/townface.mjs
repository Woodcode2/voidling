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
// measured. Anything it cannot find ABORTS: it prints a FAIL line and exits 2
// — silently skipping a call site that moved is the same bug wearing a hat.
//
// ── SEVEN CHECKS AND A RATCHET ──────────────────────────────────────────────
// Every length is in T, the per-person height unit personParts itself scales
// by (read off the running function, not recomputed), so the jitter between
// a short and a tall townsperson cannot move a verdict. A number quoted below
// for an older eye is this file's output run on that build's mainstreet.ts:
// a28ca61 for the ball eye, 8c61268 for the first lens.
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
//  3. INK INSIDE THE OUTLINE. No eye may reach further from the head's centre
//     than the widest ring of the tessellated 16x11 skull, 0.36 T x
//     sin(5 pi/11) = 0.356 T — the silhouette the spec names. A dark mark that
//     stands past that ring reads as a lump on the outline — the owner's "eyes
//     that pop out". Measured in 3D from the head centre, not along the
//     facing: the studio's 0.365 T is the eye's reach seen exactly side-on,
//     and the ball eye's 3D reach was 0.391 T.
//     THE RING DOES NOT BOUND EVERY VIEW. The widest ring is the outline only
//     where a ring is on the silhouette. Where the patch of skull under a mark
//     is on the silhouette, the drawn outline there is that patch — for an eye,
//     its facet's plane at 0.3495 T — and a mark that is proud of the skull
//     (check 4) stands past it. That is by design, and it is measured rather
//     than argued: every azimuth round the person, 1 degree apart, at each play
//     elevation, the mark's vertices against the hull of the skull's own. The
//     lens eye stands at most 0.0056 T past, with the person turned 67-68 and
//     112-113 degrees from the camera, and within a tenth of that only at
//     66-69 and 111-114: two narrow runs, not one band. Side-on (90 degrees)
//     it stands 0.0031 T past. The ball eye it replaced stood 0.039 T past,
//     and within a tenth of that across one run, 57 to 151 degrees. Printed
//     every run, as runs, with the side-on number; not gated beyond the ring.
//  4. INK PROUD OF THE DRAWN SKULL. Along its own outward direction, each
//     eye's highest drawn point has to clear the drawn skull under its centre
//     by 0.005 T. The drawn skull is not the nominal 0.36 T sphere: between
//     rings it sags, by `sag` below, and a mark that clears the nominal sphere
//     but not the facet under it is a mark the skull eats — the "one clean
//     oval and one ragged smudge" mainstreet.ts records.
//  5. INK DRAWS, AND THERE IS ENOUGH OF IT. From the play camera at 46, 55 and
//     65 degrees, looking the person in the face:
//     (a) at least half of the rays that meet an eye must meet it before the
//         skull. This is Job 4's bar for the walking crowd ("at least 50% of
//         eye samples must land on INK"), applied to the static crowd so the
//         two populations are graded alike. It is here because checks 3 and 4
//         are read at ONE point on a mark: a mark can pass both at its centre
//         and still be cut in half by a skull ridge a hair to one side.
//     (b) each eye must show at least 0.0031 T^2 of ink: one ray per 0.002 T
//         cell across the face, counting the cells whose first hit is the eye.
//         (a) is a SHARE, and a share cannot see an eye shrink. The lens that
//         first replaced the ball eye (8c61268) passed (a) at 81% and showed
//         0.00421 / 0.00349 / 0.00258 T^2 from 46 / 55 / 65 degrees, against
//         the ball's 0.00873 / 0.00782 / 0.00673 — 52-62% less ink, and no
//         check could see it. 0.0031 T^2 at the steepest camera is the floor
//         that commit's review proposed; the lens now shows
//         0.00522 / 0.00436 / 0.00323, which is still 40-52% less than the
//         ball. The ball cannot come back — it is what failed check 3.
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
//  7. THE EYES CLEAR THE MOUTH. Each eye sits right above a corner of the
//     mouth. At the nearest pair of cells, the eye's lower rim is the further
//     forward, 0.3264-0.3274 T against the corner's 0.3203-0.3214 T, and
//     0.026-0.027 T higher. From a camera `e` degrees up, a point further
//     forward draws LOWER in the image (image height = height x cos e -
//     forward x sin e), so from above the eye drops toward the corner while
//     the height between them foreshortens: 0.0266 cos 46 - 0.0062 sin 46 =
//     0.0140 T, 0.0270 cos 65 - 0.0060 sin 65 = 0.0060 T, the measured gaps
//     (the pair is one above the other in the image, 0.0000 T apart across).
//     On the same face grid as 5(b), the nearest eye cell to the
//     nearest mouth cell, centre to centre, must be at least 0.005 T (the
//     studio's clearance number, reused; 0.002 T is one cell and means they
//     touch). The ball eye measured 0.0020 T from 65 degrees — touching; the
//     first lens 0.0102 T; this one 0.0060 T. A lens tall enough to show
//     0.00335 T^2 (0.90 up, centred on the equator) measures 0.0020 T: that
//     is where 5(b) and 7 meet.
//
// Checks 3-5 and 7 sweep the facing through one full period of the skull's
// 16 columns (22.5 degrees) in 24 steps, because the eyes turn with the
// person and — before this job — the skull did not, so where the eyes landed
// on the skull's facets was different for every townsperson. The outline
// sweep in 3 and the face grid in 5(b) and 7 cost about a second a facing, so
// they run on every 6th: four facings, a quarter-period apart.
//
// WHAT NONE OF THIS SEES: THE HAT. The face is measured against the skull
// alone. Run once with the hat's crown and brim (and the hair cap) counted as
// occluders on the same face grid, each eye showed 0.00262 T^2 from 46
// degrees, 0.00002 from 55 and none from 65: the 0.47-0.49 T brim covers a
// hatted person's eyes from above. That is the bowler brim the studio deferred
// to the line-up (STUDIO-ROUND-4, "WHAT I AM NOT DOING", MOTION), not
// something this probe grades. Bareheaded, the hair cap took nothing from
// either eye.
//
// ── THE MOUTH: FROZEN, NOT FORGIVEN ─────────────────────────────────────────
// The mouth is an ink part too, and it reaches 0.38322 T against the 0.356 T
// ring: 0.0269 T past, measured 0.0328 T past the drawn outline in the worst
// play view. The mouth is 0.30 T wide; the skull's columns are about 0.135 T
// apart at that height, so the mouth spans two column ridges, and a mark
// cannot clear a ridge (which reaches the full 0.36 T at its vertices)
// without also passing the ring. Keeping it inside means cutting it to one
// facet, under 0.135 T — a change to the look of every face in the town that
// nobody has asked for, which is an art call, and it is open.
// Until it is made, the mouth may not get WORSE: its reach is held at the
// 0.38322 T measured at 8c61268 (bar 0.3833 T) and its drawn share at 32.8%
// (bar 32.8%), the way qa/roundlod.mjs holds its debt. The spec's gate — no
// ink part through the silhouette — is met by the eyes and frozen for the
// mouth. If the mouth ever improves, this file says which numbers to lower.
import { readFileSync } from 'node:fs';

// AN ABORT IS A FAIL, AND IT HAS TO SAY SO IN THE WORDS THE GATE READS. By the
// time the face is measured, checks 1-2 have already printed four PASS lines,
// and a pf reader takes PASS lines with no FAIL line as consent. The first
// version printed "ABORTED — ..." and exited 2: recolour one eye and the mouth
// and the run ended on four PASS lines and no FAIL line. So every way out that
// is not the end of the file prints a FAIL line first, including a throw this
// file did not foresee. That is why nothing is loaded above this line but
// node:fs: the next version read the two source files first, and run from the
// wrong directory it died on a raw ENOENT with no FAIL line. three and the
// sources are loaded below, each behind an abort.
const abort = (why) => { console.log(`FAIL — ABORTED — ${why}`); process.exit(2); };
process.on('uncaughtException', (e) => abort(`the probe threw: ${e?.stack || e}`));
process.on('unhandledRejection', (e) => abort(`the probe threw: ${e?.stack || e}`));

let THREE;
try { THREE = await import('three'); } catch (e) { abort(`three did not load: ${e.message}`); }
const MS_PATH = 'src/proto3d/mainstreet.ts';
const IS_PATH = 'src/proto3d/island.ts';
const readSource = (path) => {
  try { return readFileSync(path, 'utf8'); }
  catch (e) { abort(`${path} is not readable from ${process.cwd()} (${e.code || e.message}). Run this from artifacts/3d-game; if the file moved, this probe has to move with it.`); }
};
const MS = readSource(MS_PATH);
const IS = readSource(IS_PATH);

const PROUD_MIN = 0.005;        // T — check 4, the studio's number
const DRAW_MIN = 0.5;           // share — check 5(a), Job 4's number
const PAIR_MIN = 0.03;          // T — check 6, the studio's number
const ELEVATIONS = [46, 55, 65];
const LANDINGS = 24;
const GRID = 32;
const FINE_EVERY = 6;           // the outline sweep and the face grid run on every 6th facing
const CELL_T = 0.002;           // T — the face grid's cell
const EYE_AREA_MIN = 0.0031;    // T^2 — check 5(b), the review's floor (see the header)
const GAP_MIN = 0.005;          // T — check 7, in the image (see the header)
const MOUTH_REACH_MAX = 0.3833; // T — the mouth ratchet, measured 0.38322 at 8c61268
const MOUTH_DRAW_MIN = 0.328;   // share — the mouth ratchet, measured 32.8% at 8c61268

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
const UP = V(0, 1, 0);
// The play camera at elevation `el` degrees, `az` radians round from the way the
// person faces (0 = looking them in the face), and the image plane it sees.
function view(fwd, el, az) {
  const e = el * Math.PI / 180;
  const toCam = fwd.clone().applyAxisAngle(UP, az).multiplyScalar(Math.cos(e)).add(V(0, Math.sin(e), 0)).normalize();
  const dir = toCam.clone().negate();
  const u = new THREE.Vector3().crossVectors(dir, UP).normalize();
  const w = new THREE.Vector3().crossVectors(u, dir).normalize();
  return { toCam, dir, u, w };
}
// A bounding sphere per mesh, so a ray that cannot touch a mark skips its
// triangles. The face grid below casts tens of thousands of rays.
function ball(pos) {
  const m = new THREE.Box3().setFromBufferAttribute(pos).getCenter(V(0, 0, 0));
  let r = 0; const v = V(0, 0, 0);
  for (let i = 0; i < pos.count; i++) r = Math.max(r, v.fromBufferAttribute(pos, i).distanceTo(m));
  return { m, r2: r * r * 1.0001 };
}
const passesBy = (b, o, d) => {
  const ox = o.x - b.m.x, oy = o.y - b.m.y, oz = o.z - b.m.z, t = ox * d.x + oy * d.y + oz * d.z;
  return ox * ox + oy * oy + oz * oz - t * t > b.r2;
};
// Convex hull in the image plane (Andrew's monotone chain, counter-clockwise).
// The skull is a convex polyhedron, so the hull of its projected vertices IS
// its drawn outline from that camera.
function hull(pts) {
  pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], hi = [];
  for (const q of pts) { while (lo.length > 1 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (let i = pts.length - 1; i >= 0; i--) { const q = pts[i]; while (hi.length > 1 && cr(hi[hi.length - 2], hi[hi.length - 1], q) <= 0) hi.pop(); hi.push(q); }
  lo.pop(); hi.pop();
  return lo.concat(hi);
}
/** How far q lies outside the convex CCW polygon h; 0 when inside. */
function beyond(h, q) {
  let out = false;
  for (let i = 0; i < h.length && !out; i++) {
    const a = h[i], b = h[(i + 1) % h.length];
    if ((b[0] - a[0]) * (q[1] - a[1]) - (b[1] - a[1]) * (q[0] - a[0]) < 0) out = true;
  }
  if (!out) return 0;
  let best = Infinity;
  for (let i = 0; i < h.length; i++) {
    const a = h[i], b = h[(i + 1) % h.length], ex = b[0] - a[0], ey = b[1] - a[1];
    const t = Math.max(0, Math.min(1, ((q[0] - a[0]) * ex + (q[1] - a[1]) * ey) / (ex * ex + ey * ey)));
    best = Math.min(best, Math.hypot(q[0] - a[0] - t * ex, q[1] - a[1] - t * ey));
  }
  return best;
}
const stats = new Map();        // part class -> worst-case numbers over every landing
const bump = (k, f) => { if (!stats.has(k)) stats.set(k, { reach: -Infinity, sil: Infinity, proud: Infinity, sag: -Infinity, draw: Infinity, past: -Infinity, byAz: new Float64Array(181), n: 0 }); f(stats.get(k)); };
const faceRows = ELEVATIONS.map((el) => ({ el, area: Infinity, gap: Infinity }));
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
  const marks = ink.map((q) => {
    const p = V(q.x, q.y, q.z), off = p.clone().sub(c);
    return { q, p, off, cls: Math.abs(off.dot(rgt)) > 0.15 * R ? 'eye' : 'mouth', pos: q.geo.getAttribute('position'), b: ball(q.geo.getAttribute('position')) };
  });
  // ── PAST THE OUTLINE, IN EVERY PLAY VIEW ─────────────────────────────────
  // Reach (check 3) is read against the widest ring, the spec's number. It
  // does not bound every view: where a mark's own patch of skull is on the
  // silhouette, the drawn outline there is that patch, not the widest ring,
  // and a mark proud of the skull stands past it by about its proudness. This
  // measures it: every azimuth round the person, 1 degree apart, at each play
  // elevation, the mark's vertices against the hull of the skull's.
  if (k % FINE_EVERY === 0) for (const el of ELEVATIONS) for (let deg = 0; deg < 360; deg++) {
    const az = deg * Math.PI / 180, { u, w } = view(fwd, el, az);
    const sk = [];
    for (let i = 0; i < sp.count; i++) { const x = sp.getX(i) - c.x, y = sp.getY(i) - c.y, z = sp.getZ(i) - c.z; sk.push([x * u.x + y * u.y + z * u.z, x * w.x + y * w.y + z * w.z]); }
    const h = hull(sk);
    for (const mk of marks) {
      let past = 0;
      for (let i = 0; i < mk.pos.count; i++) {
        const x = mk.pos.getX(i) - c.x, y = mk.pos.getY(i) - c.y, z = mk.pos.getZ(i) - c.z;
        past = Math.max(past, beyond(h, [x * u.x + y * u.y + z * u.z, x * w.x + y * w.y + z * w.z]));
      }
      // folded to 0-180: how far the person is turned from the camera, either way
      bump(mk.cls, (st) => { const a = deg > 180 ? 360 - deg : deg; st.past = Math.max(st.past, past / T); st.byAz[a] = Math.max(st.byAz[a], past / T); });
    }
  }
  // ── THE FACE AS THE CAMERA SEES IT ───────────────────────────────────────
  // One ray per 0.002 T cell across the whole face, looking the person in the
  // face from each play elevation. A cell belongs to the mark it meets first,
  // if it meets that mark no later than the skull. Two numbers come out:
  //   INK AREA — each eye's cells, in T^2: how much eye a child can see.
  //   EYE-MOUTH GAP — the nearest pair of eye and mouth cells, in T in the
  //   image: how much skin separates the eyes from the mouth's corners.
  const CELL = CELL_T * T;
  if (k % FINE_EVERY === 0) for (const row of faceRows) {
    const { toCam, dir, u, w } = view(fwd, row.el, 0);
    let u0 = Infinity, u1 = -Infinity, w0 = Infinity, w1 = -Infinity;
    for (const mk of marks) for (let i = 0; i < mk.pos.count; i++) {
      const x = mk.pos.getX(i) - c.x, y = mk.pos.getY(i) - c.y, z = mk.pos.getZ(i) - c.z;
      const a = x * u.x + y * u.y + z * u.z, b = x * w.x + y * w.y + z * w.z;
      u0 = Math.min(u0, a); u1 = Math.max(u1, a); w0 = Math.min(w0, b); w1 = Math.max(w1, b);
    }
    const cells = marks.map(() => []);
    for (let a = u0 - CELL; a <= u1 + CELL; a += CELL) for (let b = w0 - CELL; b <= w1 + CELL; b += CELL) {
      const o = c.clone().addScaledVector(u, a).addScaledVector(w, b).addScaledVector(toCam, 4 * R);
      let best = Infinity, who = -1;
      for (let j = 0; j < marks.length; j++) {
        if (passesBy(marks[j].b, o, dir)) continue;
        const t = firstHit(marks[j].pos, o, dir);
        if (t < best) { best = t; who = j; }
      }
      if (who >= 0 && best <= firstHit(sp, o, dir)) cells[who].push([a, b]);
    }
    const eyeCells = [], mouthCells = [];
    marks.forEach((mk, j) => {
      if (mk.cls === 'eye') { row.area = Math.min(row.area, cells[j].length * CELL * CELL / (T * T)); eyeCells.push(...cells[j]); }
      else mouthCells.push(...cells[j]);
    });
    for (const [ea, eb] of eyeCells) for (const [ma, mb] of mouthCells) row.gap = Math.min(row.gap, Math.hypot(ea - ma, eb - mb) / T);
  }
  for (const mk of marks) {
    const { q, p, off, cls, pos } = mk;
    const d = off.clone().normalize();
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
      const { toCam, dir, u, w } = view(fwd, el, 0);
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
console.log(`\n  3-5, 7. the face against the drawn skull — ${LANDINGS} facings across one 22.5-degree skull period, camera at ${ELEVATIONS.join('/')} degrees`);
console.log('    mark    reach   outline   proud    sag    draws   past the drawn outline, worst play view');
// Whole degrees as their contiguous runs, "66-69, 111-114". The previous
// version printed the first and last degree, and the lens eye's two runs read
// as one band, 66-114, across a 90-degree side-on view that stands 55% as far
// past. So the side-on number is printed beside it.
const runs = (ds) => ds.reduce((rs, d) => { const r = rs[rs.length - 1]; if (r && d === r[1] + 1) r[1] = d; else rs.push([d, d]); return rs; }, [])
  .map(([a, b]) => (a === b ? `${a}` : `${a}-${b}`)).join(', ');
for (const [cls, st] of stats) {
  const near = [...st.byAz.keys()].filter((a) => st.byAz[a] >= 0.9 * st.past);
  console.log(`    ${cls.padEnd(6)} ${st.reach.toFixed(4)}T  ${st.sil.toFixed(4)}T  ${st.proud.toFixed(4)}T  ${st.sag.toFixed(4)}T  ${(100 * st.draw).toFixed(1).padStart(5)}%   ${st.past.toFixed(4)}T (within 10% of that with the person turned ${runs(near)} deg from the camera; ${st.byAz[90].toFixed(4)}T side-on)   (worst of ${st.n})`);
}
console.log('    looking her in the face:  elevation   ink area per eye   eye-mouth gap');
for (const r of faceRows) console.log(`                              ${String(r.el).padStart(4)} deg     ${r.area.toFixed(5)} T^2       ${r.gap.toFixed(4)} T`);
const eye = stats.get('eye');
if (!eye) abort('no INK part classified as an eye.');
verdict(eye.reach <= eye.sil,
  `no eye reaches past the skull's widest drawn ring (${eye.reach.toFixed(4)} T against ${eye.sil.toFixed(4)} T)`,
  `an eye reaches ${eye.reach.toFixed(4)} T from the head centre, past the skull's widest drawn ring at ${eye.sil.toFixed(4)} T — it stands out of the silhouette by ${(eye.reach - eye.sil).toFixed(4)} T.`);
verdict(eye.proud >= PROUD_MIN,
  `every eye clears the drawn skull under it by ${eye.proud.toFixed(4)} T (bar ${PROUD_MIN} T; the skull sags up to ${eye.sag.toFixed(4)} T there)`,
  `an eye clears the drawn skull under its centre by only ${eye.proud.toFixed(4)} T against a ${PROUD_MIN} T bar — the facet it lands on eats it.`);
verdict(eye.draw >= DRAW_MIN,
  `from every camera elevation at least ${(100 * eye.draw).toFixed(1)}% of each eye draws in front of the skull (bar ${100 * DRAW_MIN}%)`,
  `on the worst facing only ${(100 * eye.draw).toFixed(1)}% of an eye draws in front of the skull (bar ${100 * DRAW_MIN}%) — the rest of it is under the skull.`);
const area = Math.min(...faceRows.map((r) => r.area));
verdict(area >= EYE_AREA_MIN,
  `looking her in the face, each eye shows at least ${area.toFixed(5)} T^2 of ink from every play elevation (floor ${EYE_AREA_MIN} T^2)`,
  `looking her in the face, an eye shows only ${area.toFixed(5)} T^2 of ink (floor ${EYE_AREA_MIN} T^2, per elevation: ${faceRows.map((r) => `${r.el} deg ${r.area.toFixed(5)}`).join(', ')}) — the eye is too small to read.`);
const gap = Math.min(...faceRows.map((r) => r.gap));
verdict(gap >= GAP_MIN,
  `the eyes stand clear of the mouth's corners in the image by at least ${gap.toFixed(4)} T from every play elevation (floor ${GAP_MIN} T)`,
  `from ${faceRows.find((r) => r.gap === gap).el} degrees an eye comes within ${gap.toFixed(4)} T of the mouth in the image (floor ${GAP_MIN} T; ${CELL_T} T means they touch) — the eye and the mouth's corner run together.`);

// ── THE MOUTH: FROZEN, NOT FORGIVEN ─────────────────────────────────────────
// It stands past the outline and that is an open art call (header). Until it is
// made, the mouth may not get worse: no further out, no less of it drawn.
const mouth = stats.get('mouth');
if (!mouth) abort('no INK part classified as a mouth.');
console.log(`\n  the mouth, ratcheted: reach ${mouth.reach.toFixed(5)} T (${(mouth.reach - mouth.sil).toFixed(4)} T past the widest ring), draws ${(100 * mouth.draw).toFixed(1)}%`);
verdict(mouth.reach <= MOUTH_REACH_MAX,
  `the mouth reaches no further than the recorded ${MOUTH_REACH_MAX} T (${mouth.reach.toFixed(5)} T). Still past the widest ring — an open art call, frozen here.`,
  `the mouth reaches ${mouth.reach.toFixed(5)} T, past the recorded ${MOUTH_REACH_MAX} T: the lump on the outline grew.`);
verdict(mouth.draw >= MOUTH_DRAW_MIN,
  `at least ${(100 * mouth.draw).toFixed(1)}% of the mouth draws in front of the skull from every play elevation (recorded ${(100 * MOUTH_DRAW_MIN).toFixed(1)}%)`,
  `only ${(100 * mouth.draw).toFixed(1)}% of the mouth draws in front of the skull on the worst facing, below the recorded ${(100 * MOUTH_DRAW_MIN).toFixed(1)}% — the skull is eating it.`);
// The advice is for a mouth that got better and no worse. The previous version
// printed it when EITHER number improved and named both constants: moved to
// 0.310 T forward, the mouth failed on reach at 0.38808 T and was told to
// lower MOUTH_REACH_MAX to 0.3881 — a raise; moved to 0.300 T it failed on
// draws at 25.0% and was told to set MOUTH_DRAW_MIN to 0.25 — a cut. Following
// it turned the regression green. So: only on a pass of both, only the
// constant that improved, and never past the bar it replaces.
if (mouth.reach <= MOUTH_REACH_MAX && mouth.draw >= MOUTH_DRAW_MIN) {
  const tighten = [];
  if (mouth.reach < MOUTH_REACH_MAX - 0.0005) tighten.push(`lower MOUTH_REACH_MAX to ${Math.min(MOUTH_REACH_MAX, Math.ceil(mouth.reach * 1e4) / 1e4)}`);
  if (mouth.draw > MOUTH_DRAW_MIN + 0.02) tighten.push(`raise MOUTH_DRAW_MIN to ${Math.max(MOUTH_DRAW_MIN, Math.floor(mouth.draw * 1e3) / 1e3)}`);
  if (tighten.length) console.log(`  the mouth IMPROVED: ${tighten.join(' and ')} in this file, so the ground cannot be given back.`);
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
