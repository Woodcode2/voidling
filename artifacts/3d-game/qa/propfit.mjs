// DO THE PARTS OF A PROP FIT EACH OTHER? — Lantern Night's umbrella and moss
// rock, built in node from the real source (studio round 4, Job 9)
//
//   node qa/propfit.mjs [--n=200]
//
// Two of the market's props were assembled from parts that were each turned on
// their own, so they did not meet:
//
//   THE UMBRELLA. makeUmbrella tilted the paper about its own centre, laid
//   each rib with its own Euler angles and stood the pole somewhere else again,
//   so a leaning umbrella had its pole off to one side of the canopy and half
//   its ribs through the paper. The ribs' tilt was a rotation about world Z
//   applied after the radial turn, so it bent only the ribs lying along X —
//   the ones along -X sloped UP through the paper. And the pole, tilted about
//   its own middle, swung its foot up off the ground (found by U3 below).
//   THE MOSS ROCK. The moss is a cap at 0.72 k; the rock under it is a
//   dodecahedron of radius k at 0.52 k, whose top reaches 1.32-1.52 k whatever
//   way it is turned. The cap's own top is 1.11 k, so the moss was inside the
//   rock: a grey boulder with no moss on it. Squashing the rock out from under
//   the cap (the first fix) left the cap's rim standing over the rock by up to
//   0.298 of the rock's height (M4): a lid.
//
// ── IT RUNS THE SOURCE, IT DOES NOT COPY IT ─────────────────────────────────
// Governor rule 4. makeUmbrella and makeMossRock are lifted out of
// nightmarket.ts with the TypeScript compiler, their top-level dependencies
// resolved on demand (qa/faceray.mjs's method), and RUN against the real three
// and island.ts's own part() and mergedProp() — so what is measured is the
// merged mesh the game builds. Every build runs on a seeded Math.random, which
// is the only stream these props draw from.
//
// ── SPLIT BY VERTEX INDEX RANGE, NOT BY HUE ─────────────────────────────────
// The merged mesh is split back into its parts by the index range each part
// occupies — mergedProp concatenates them in the order they were pushed — and
// each range is named by the geometry that made it: the umbrella's cone is the
// paper, its boxes are the ribs, its cylinder the pole; the rock's first
// dodecahedron is the rock, its sphere the moss, a second dodecahedron the
// chunk. Colour cannot do it: the paper draws from VERM, VERM_D, PAPER and
// TILE, and TIMBER_D ribs under a VERM_D canopy are two dark reds.
//
// ── THE BARS ────────────────────────────────────────────────────────────────
//  U1. EVERY RIB IS UNDER THE PAPER. Each rib vertex must lie inside the
//      paper's own faceted cone — on the inner side of every one of its facet
//      planes, and above its rim — over every build. The facets, not a fitted
//      circle: the ribs follow the cone's ridges, and between ridges the paper
//      is a flat facet 3.4% inside the circle through them.
//  U2. THE POLE RUNS UP THE CANOPY'S AXIS. The pole's long axis (the largest
//      principal direction of its vertices) within 1 degree of the cone's axis,
//      and its line within a fifth of the pole's own radius (read off its
//      vertices) of the apex. Built in one frame and tilted once, both are
//      zero to float precision, so a pole visibly off the axis fails.
//  U3. IT STANDS ON THE GROUND. The umbrella's lowest vertex at or under
//      y = 0 in every build: a lean about anything but the foot lifts it (a
//      slide along the ground after the lean does not).
//  U4. THE POLE'S TOP STAYS UNDER THE PAPER. Every pole vertex above the
//      rim's plane inside the paper's facets, as U1 asks of the ribs. With the
//      pole's top at 2.0 k its 0.05 rim came through the paper for k under
//      about 0.98: 2820 of 7200 top vertices over 200 builds, by up to 0.0034.
//  U5. THE CANOPY STANDS OVER ITS PLACEMENT ORIGIN. No vertex further across
//      from the origin (x = z = 0, where plant() drops the prop and centres
//      its eat radius and ground claim) than the canopy rim's own radius —
//      what an upright umbrella of the same size reaches. A lean about the
//      foot left the foot on the origin and carried the canopy off it: 1.58x
//      the rim radius, 1.85 units, the rim's centre 0.85 off.
//  M1. THE MOSS SHOWS. At least 25% of the moss's area (the studio's bar) must
//      lie outside the rock and the chunk, in every build — area inside a
//      rock's hull is area the camera can never see. The rock is a convex
//      polyhedron after any turn and squash, so inside means inside every one
//      of its face planes.
//  M2. NOTHING FLOATS. The rock's and the chunk's lowest vertices at or under
//      the ground (y = 0) in every build, because the squash the fix applies
//      lifts a rock's bottom toward it.
//  M3. THE MOSS CROWNS THE ROCK — the studio's own wording, "at least 25% of
//      the moss above the rock's top", read literally: 25% of the moss's area
//      above the rock's highest vertex, in every build. M1 is the looser
//      reading (outside the rock anywhere); both are barred. The squash alone
//      met M1 (93.3% lowest) and failed this (19.7% lowest, 42.0% median).
//  M4. THE MOSS SITS ON THE ROCK. The moss's rim — its outermost ring,
//      found across from the cap's middle, since a rim laid on a rock is not
//      level — must be over the rock (none past its outline) and stand no more
//      than 2% of the rock's height above the rock's upper surface straight
//      below it, in every build. Before round 4 the rim stood at most 0.004
//      of the rock's height over it in the median build and 0.110 in the
//      worst, with the moss inside the rock; the squash alone left 0.163 and
//      0.298.
import { readFileSync } from 'node:fs';

const abort = (why) => { console.log(`FAIL — ABORTED — ${why}`); process.exit(2); };
process.on('uncaughtException', (e) => abort(`the probe threw: ${e?.stack || e}`));
process.on('unhandledRejection', (e) => abort(`the probe threw: ${e?.stack || e}`));

let THREE, ts, BGU;
try { THREE = await import('three'); } catch (e) { abort(`three did not load: ${e.message}`); }
try { BGU = await import('three/examples/jsm/utils/BufferGeometryUtils.js'); } catch (e) { abort(`three's BufferGeometryUtils did not load: ${e.message}`); }
try { ts = (await import('typescript')).default; } catch (e) { abort(`typescript did not load: ${e.message}`); }

const nArg = process.argv.find((a) => a.startsWith('--n='));
const N = nArg ? Math.max(1, parseInt(nArg.slice(4), 10)) : 200;
const SEED = 0x51ed270b;
const RIB_OUT_MAX = 0;        // U1: rib vertices outside the paper
const AXIS_DEG_MAX = 1;       // U2
const APEX_OFF_MAX = 0.2;     // U2, in pole radii
const MOSS_SHOWN_MIN = 0.25;  // M1, the studio's number
const MOSS_ABOVE_MIN = 0.25;  // M3, the same number on the studio's own wording
const RIM_GAP_MAX = 0.02;     // M4, of the rock's height
const EPS = 1e-6;

const NM_PATH = 'src/proto3d/nightmarket.ts';
const IS_PATH = 'src/proto3d/island.ts';

// ── THE SOURCE, AS THE COMPILER SEES IT (qa/emitters.mjs has the same) ───────
const readSource = (path) => {
  try { return readFileSync(path, 'utf8'); }
  catch (e) { abort(`${path} is not readable from ${process.cwd()} (${e.code || e.message}). Run this from artifacts/3d-game.`); }
};
function load(path) {
  const src = readSource(path);
  const ast = ts.createSourceFile(path, src, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS);
  const decl = new Map(), imported = new Map();
  for (const st of ast.statements) {
    if (ts.isImportDeclaration(st)) {
      const c = st.importClause; if (!c) continue;
      const from = st.moduleSpecifier.text;
      if (c.name) imported.set(c.name.text, from);
      const nb = c.namedBindings;
      if (nb && ts.isNamespaceImport(nb)) imported.set(nb.name.text, from);
      if (nb && ts.isNamedImports(nb)) for (const e of nb.elements) imported.set(e.name.text, from);
    } else if (ts.isFunctionDeclaration(st) && st.name) decl.set(st.name.text, st);
    else if (ts.isVariableStatement(st)) {
      for (const d of st.declarationList.declarations) if (ts.isIdentifier(d.name)) decl.set(d.name.text, st);
    }
  }
  return { path, ast, decl, imported, jsCache: new Map(), order: [] };
}
const toJs = (text) => ts.transpileModule(text, { compilerOptions: {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, removeComments: true } }).outputText;
const jsOf = (F, st) => {
  if (!F.jsCache.has(st)) F.jsCache.set(st, toJs(st.getText(F.ast).replace(/^export\s+(default\s+)?/, '')));
  return F.jsCache.get(st);
};
const namesOf = (st) => (ts.isFunctionDeclaration(st) ? [st.name.text]
  : st.declarationList.declarations.filter((d) => ts.isIdentifier(d.name)).map((d) => d.name.text));
function run(F, js, stubs, onAttempt) {
  for (let guard = 0; guard < 400; guard++) {
    if (onAttempt) onAttempt();   // a retried run starts clean: nothing a failed attempt built is kept
    const seen = new Set(), pre = [];
    for (const n of F.order) {
      const st = F.decl.get(n);
      if (seen.has(st) || namesOf(st).some((x) => x in stubs)) continue;
      seen.add(st); pre.push(jsOf(F, st));
    }
    let fn;
    try { fn = new Function(...Object.keys(stubs), `${pre.join('\n')}\n${js}`); }
    catch (e) { abort(`${F.path}: the lifted source did not compile (${e.message})`); }
    try { return fn(...Object.values(stubs)); } catch (e) {
      if (!(e instanceof ReferenceError)) throw e;
      const m = /^(\w+) is not defined$/.exec(e.message) || /^Cannot access '(\w+)' before initialization$/.exec(e.message);
      if (!m) throw e;
      const n = m[1];
      if (n in stubs) throw e;
      if (F.imported.has(n)) abort(`${F.path}: the code run here reads \`${n}\`, which the file imports from ${F.imported.get(n)} — give this probe a stub for it`);
      if (!F.decl.has(n)) abort(`${F.path}: the code run here reads \`${n}\`, which is not a top-level declaration of the file — the source changed shape`);
      const at = F.order.indexOf(n); if (at >= 0) F.order.splice(at, 1);
      F.order.unshift(n);
    }
  }
  abort(`${F.path}: could not resolve the dependencies in 400 passes`);
}
function mulberry32(a) {
  return () => { a |= 0; a = a + 0x6d2b79f5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

const IS = load(IS_PATH), NM = load(NM_PATH);
for (const f of ['makeUmbrella', 'makeMossRock']) if (!NM.decl.has(f)) abort(`${NM_PATH} no longer declares ${f}`);

// island.ts's part() and mergedProp(), whole. Each is CALLED once inside its
// run so everything it reads is resolved there. mergedProp's imports: the
// real mergeGeometries; PROP_GLOW_MAT only as an identity to compare against.
// Every part is logged in push order with its geometry type and vertex count —
// the index ranges the merged buffer is split by.
const ISSTUBS = { THREE, glossOf: () => 0, mergeGeometries: BGU.mergeGeometries, PROP_GLOW_MAT: new THREE.MeshBasicMaterial() };
const { part: realPart, mergedProp: realMerged } = run(IS, `
  part(new THREE.BoxGeometry(), 0xffffff); part(new THREE.SphereGeometry(1, 6, 4), 0x202020);
  mergedProp([part(new THREE.BoxGeometry(), 0xffffff), part(new THREE.BoxGeometry(), 0x202020)]);
  mergedProp([part(new THREE.SphereGeometry(1, 6, 4), 0xffffff), part(new THREE.SphereGeometry(1, 6, 4), 0x202020)]);
  return { part, mergedProp };`, ISSTUBS);
let log = null;
const part = (geo, col, ...rest) => {
  const kind = geo.type;
  const g = realPart(geo, col, ...rest);
  if (log) log.pending.push({ kind, n: g.getAttribute('position').count, col });
  return g;
};
const mergedProp = (parts, mat) => {
  const m = realMerged(parts, mat);
  if (log) { log.merged.push({ mesh: m, parts: log.pending.splice(0, parts.length) }); }
  return m;
};
const STUBS = { THREE, part, mergedProp, PROP_GLOW_MAT: ISSTUBS.PROP_GLOW_MAT,
  PROP_SMOOTH_MAT: new THREE.MeshStandardMaterial(), registerGloss: () => {} };

function build(name, seed) {
  log = { pending: [], merged: [] };
  const real = Math.random;
  try {
    run(NM, `return ${name}();`, STUBS, () => { log.pending = []; log.merged = []; Math.random = mulberry32(seed); });
  } finally { Math.random = real; }
  const out = log; log = null;
  if (out.merged.length !== 1) abort(`${name} merged ${out.merged.length} meshes; this probe reads one`);
  const { mesh, parts } = out.merged[0];
  const pos = mesh.geometry.getAttribute('position');
  let at = 0;
  const ranges = parts.map((p) => { const r = { ...p, start: at, end: at + p.n }; at += p.n; return r; });
  if (at !== pos.count) abort(`${name}: the parts' vertex counts sum to ${at}, the merged mesh has ${pos.count} — the index ranges do not line up`);
  const pts = (r) => { const a = []; for (let i = r.start; i < r.end; i++) a.push(new THREE.Vector3().fromBufferAttribute(pos, i)); return a; };
  return ranges.map((r) => ({ ...r, pts: pts(r) }));
}

// ── GEOMETRY HELPERS ─────────────────────────────────────────────────────────
const key = (v) => `${v.x.toFixed(5)},${v.y.toFixed(5)},${v.z.toFixed(5)}`;
// the outward planes of a convex polyhedron given as a triangle soup
function hullPlanes(pts) {
  const c = pts.reduce((s, p) => s.add(p), new THREE.Vector3()).multiplyScalar(1 / pts.length);
  const planes = [];
  for (let i = 0; i + 2 < pts.length; i += 3) {
    const n = new THREE.Vector3().subVectors(pts[i + 1], pts[i]).cross(new THREE.Vector3().subVectors(pts[i + 2], pts[i]));
    if (n.lengthSq() < 1e-18) continue;
    n.normalize();
    if (n.dot(new THREE.Vector3().subVectors(pts[i], c)) < 0) n.negate();
    planes.push({ n, d: n.dot(pts[i]) });
  }
  return planes;
}
const outside = (planes, p) => Math.max(...planes.map((q) => q.n.dot(p) - q.d));   // > 0 = outside
function principalAxis(pts) {
  const c = pts.reduce((s, p) => s.add(p), new THREE.Vector3()).multiplyScalar(1 / pts.length);
  const m = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (const p of pts) {
    const d = [p.x - c.x, p.y - c.y, p.z - c.z];
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) m[i][j] += d[i] * d[j];
  }
  let v = [0.3, 1, 0.2];
  for (let it = 0; it < 200; it++) {
    const w = [0, 1, 2].map((i) => m[i][0] * v[0] + m[i][1] * v[1] + m[i][2] * v[2]);
    const L = Math.hypot(...w); v = w.map((x) => x / L);
  }
  return { c, u: new THREE.Vector3(...v) };
}

let failed = 0;
const verdict = (ok, pass, fail) => { console.log(ok ? `PASS — ${pass}` : `FAIL — ${fail}`); if (!ok) failed++; };
console.log(`\n  DO THE PARTS FIT — nightmarket.ts's umbrella and moss rock, ${N} builds each, built in node\n`);

// ══ THE UMBRELLA ═════════════════════════════════════════════════════════════
{
  let ribOut = 0, ribAll = 0, worstPoke = -Infinity, worstPokeK = 0, worstDepth = 0, leastDepth = Infinity;
  let worstAng = 0, worstOff = 0, builds = 0, footMax = -Infinity;
  let poleOut = 0, poleAll = 0, polePoke = -Infinity, reachOver = -Infinity, reachMax = 0, centreOff = 0, rMin = Infinity, rMax = 0, footOff = 0;
  for (let b = 0; b < N; b++) {
    const parts = build('makeUmbrella', SEED + b);
    const paper = parts.filter((p) => /^Cone/.test(p.kind));
    const ribs = parts.filter((p) => /^Box/.test(p.kind));
    const pole = parts.filter((p) => /^Cylinder/.test(p.kind));
    if (paper.length !== 1 || pole.length !== 1 || ribs.length < 3 || paper.length + ribs.length + pole.length !== parts.length)
      abort(`makeUmbrella's parts are ${parts.map((p) => p.kind).join(', ')} — this probe reads one cone (the paper), boxes (the ribs) and one cylinder (the pole)`);
    // the paper: its apex is the point its triangles share most (every segment
    // of an open cone meets it), its rim the rest
    const P = paper[0].pts;
    const count = new Map();
    for (const p of P) count.set(key(p), (count.get(key(p)) ?? 0) + 1);
    const apexKey = [...count.entries()].sort((a, c) => c[1] - a[1])[0][0];
    const apex = P.find((p) => key(p) === apexKey).clone();
    const rim = [...new Map(P.filter((p) => key(p) !== apexKey).map((p) => [key(p), p])).values()];
    const rimC = rim.reduce((s, p) => s.add(p), new THREE.Vector3()).multiplyScalar(1 / rim.length);
    const axis = new THREE.Vector3().subVectors(apex, rimC);
    const H = axis.length(); axis.normalize();
    const R = rim.reduce((s, p) => s + new THREE.Vector3().subVectors(p, rimC).projectOnPlane(axis).length(), 0) / rim.length;
    // k, the unit the builder scales by, recovered from the rim (1.05 k in
    // makeUmbrella) — for the printed numbers only; no bar is in k
    const k = R / 1.05;
    const planes = hullPlanes(P).filter((q) => Math.abs(q.n.dot(axis)) < 0.999);   // the facets, not a rim plane
    for (const r of ribs) for (const p of r.pts) {
      ribAll++;
      const h = new THREE.Vector3().subVectors(p, rimC).dot(axis);
      const poke = Math.max(outside(planes, p), -h);   // past a facet, or below the rim
      if (poke > EPS) ribOut++;
      if (poke > worstPoke) { worstPoke = poke; worstPokeK = k; }
      if (poke <= EPS) { worstDepth = Math.max(worstDepth, -poke / k); leastDepth = Math.min(leastDepth, -poke / k); }
    }
    // the pole's top end, where it meets the paper: every pole vertex above
    // the rim's plane inside the paper's facets, as the ribs are
    for (const p of pole[0].pts) {
      const h = new THREE.Vector3().subVectors(p, rimC).dot(axis);
      if (h <= 0) continue;
      poleAll++;
      const poke = outside(planes, p);
      if (poke > EPS) poleOut++;
      polePoke = Math.max(polePoke, poke);
    }
    // where the canopy stands against the placement origin (x = z = 0, the
    // point plant() drops the prop on and claims ground around): the rim's
    // centre off it, and how far any part reaches from it against the rim's
    // own radius — what an upright umbrella of the same size reaches
    centreOff = Math.max(centreOff, Math.hypot(rimC.x, rimC.z));
    const reach = Math.max(...parts.flatMap((q) => q.pts.map((v) => Math.hypot(v.x, v.z))));
    reachOver = Math.max(reachOver, reach / R); reachMax = Math.max(reachMax, reach);
    rMin = Math.min(rMin, R); rMax = Math.max(rMax, R);
    // the pole
    const { c, u } = principalAxis(pole[0].pts);
    const ang = Math.acos(Math.min(1, Math.abs(u.dot(axis)))) * 180 / Math.PI;
    const toApex = new THREE.Vector3().subVectors(apex, c);
    // the pole's own radius, off its own vertices: the bar is a fifth of it
    const poleR = Math.max(...pole[0].pts.map((q) => { const d = new THREE.Vector3().subVectors(q, c); return d.sub(u.clone().multiplyScalar(d.dot(u))).length(); }));
    const off = toApex.sub(u.clone().multiplyScalar(toApex.dot(u))).length() / poleR;
    worstAng = Math.max(worstAng, ang); worstOff = Math.max(worstOff, off);
    // where the pole's line meets the ground, against the origin
    if (Math.abs(u.y) > 1e-6) { const t = -c.y / u.y; footOff = Math.max(footOff, Math.hypot(c.x + u.x * t, c.z + u.z * t) / k); }
    footMax = Math.max(footMax, Math.min(...parts.flatMap((q) => q.pts.map((v) => v.y))));
    builds++;
    void H;
  }
  console.log(`  ·  umbrella: ${builds} builds; rib vertices outside the paper ${ribOut} of ${ribAll} (${(100 * ribOut / ribAll).toFixed(1)}%), furthest ${worstPoke > 0 ? `${worstPoke.toFixed(3)} (${(worstPoke / worstPokeK).toFixed(3)} k) past it` : 'none past it'}; rib vertices under it by ${Number.isFinite(leastDepth) ? leastDepth.toFixed(3) : '-'} to ${worstDepth.toFixed(3)} k`);
  console.log(`  ·  umbrella: pole axis off the canopy's by up to ${worstAng.toFixed(2)} deg; its line passes up to ${worstOff.toFixed(2)} pole radii from the apex; lowest point of the umbrella at most ${footMax.toFixed(3)} (0 is the ground)`);
  console.log(`  ·  umbrella: pole vertices above the rim outside the paper ${poleOut} of ${poleAll}${polePoke > EPS ? `, furthest ${polePoke.toFixed(4)} past it` : ''}`);
  console.log(`  ·  umbrella: canopy rim radius ${rMin.toFixed(2)}-${rMax.toFixed(2)}; the rim's centre up to ${centreOff.toFixed(3)} off the placement origin; the umbrella reaches up to ${reachMax.toFixed(2)} from it, ${reachOver.toFixed(3)}x its own rim radius (plant() drops it at r 1.0, sep 1.0); the pole meets the ground up to ${footOff.toFixed(3)} k from it`);
  verdict(ribOut <= RIB_OUT_MAX,
    `U1 every rib is under the paper, in all ${builds} builds (split from the paper by index range)`,
    `U1 ${ribOut} of ${ribAll} rib vertices are outside the paper (furthest ${worstPoke.toFixed(3)} past it): ribs show through the canopy`);
  verdict(worstAng <= AXIS_DEG_MAX && worstOff <= APEX_OFF_MAX,
    `U2 the pole runs up the canopy's own axis (within ${worstAng.toFixed(2)} deg, and ${worstOff.toFixed(3)} of its radius from the apex, all ${builds} builds)`,
    `U2 the pole leaves the canopy's axis by up to ${worstAng.toFixed(1)} deg and passes ${worstOff.toFixed(1)} of its own radius from the apex (bars ${AXIS_DEG_MAX} deg, ${APEX_OFF_MAX} radius): the pole and the paper were turned separately`);
  verdict(footMax <= EPS,
    `U3 every umbrella stands on the ground (its lowest point at most ${footMax.toFixed(3)})`,
    `U3 an umbrella floats: its lowest point is ${footMax.toFixed(3)} above the ground — tilted about the pole's middle, the foot swings up`);
  verdict(poleOut === 0,
    `U4 the pole's top stays under the paper (${poleAll} vertices above the rim, all ${builds} builds)`,
    `U4 ${poleOut} of ${poleAll} pole vertices above the rim are outside the paper (furthest ${polePoke.toFixed(4)} past it): the pole's end pokes through the canopy`);
  verdict(reachOver <= 1 + EPS,
    `U5 the canopy stands over its placement origin: nothing reaches further from it than the rim's own radius (${reachOver.toFixed(3)}x at most, all ${builds} builds)`,
    `U5 the umbrella reaches ${reachOver.toFixed(2)}x its canopy's radius from its placement origin (${reachMax.toFixed(2)} units; the rim's centre up to ${centreOff.toFixed(2)} off it): the lean carried the canopy off the ground plant() reserved for it`);
}

// ══ THE MOSS ROCK ════════════════════════════════════════════════════════════
{
  const shown = [], above = [], rimGap = [], rimSunk = [], rimHang = [];
  let floatMax = -Infinity, chunks = 0, rimOver = 0, rimAll = 0;
  for (let b = 0; b < N; b++) {
    const parts = build('makeMossRock', SEED + 0x10000 + b);
    const rocks = parts.filter((p) => /^Dodecahedron/.test(p.kind));
    const moss = parts.filter((p) => /^Sphere/.test(p.kind));
    if (rocks.length < 1 || rocks.length > 2 || moss.length !== 1 || rocks.length + moss.length !== parts.length || !/^Dodecahedron/.test(parts[0].kind))
      abort(`makeMossRock's parts are ${parts.map((p) => p.kind).join(', ')} — this probe reads a dodecahedron (the rock), a sphere (the moss) and at most one more dodecahedron (the chunk)`);
    if (rocks.length === 2) chunks++;
    const hulls = rocks.map((r) => hullPlanes(r.pts));
    const rockTop = Math.max(...rocks[0].pts.map((p) => p.y));
    for (const r of rocks) floatMax = Math.max(floatMax, Math.min(...r.pts.map((p) => p.y)));
    const M = moss[0].pts;
    let area = 0, out = 0, up = 0;
    for (let i = 0; i + 2 < M.length; i += 3) {
      const a = new THREE.Vector3().subVectors(M[i + 1], M[i]).cross(new THREE.Vector3().subVectors(M[i + 2], M[i])).length() / 2;
      if (a < 1e-12) continue;
      const cen = new THREE.Vector3().add(M[i]).add(M[i + 1]).add(M[i + 2]).multiplyScalar(1 / 3);
      area += a;
      if (hulls.every((h) => outside(h, cen) > EPS)) out += a;
      if (cen.y > rockTop) up += a;
    }
    shown.push(out / area); above.push(up / area);
    // M4: how the moss's rim meets the rock. The rim is the cap's outer ring:
    // the vertices furthest across from the cap's middle (the mean of its
    // vertices, which its seven even segments put on its axis) — found across,
    // not by height, because a rim laid on the rock is not level. For each rim
    // vertex, the rock's upper surface straight below it — the lowest of the
    // rock's upward-facing planes over that point — or none, when the vertex
    // hangs past the rock's outline. As a share of the rock's height.
    const rp = hulls[0], upP = rp.filter((q) => q.n.y > 1e-6), dnP = rp.filter((q) => q.n.y < -1e-6);
    const ys = rocks[0].pts.map((p) => p.y), rockH = Math.max(...ys) - Math.min(...ys);
    const mcx = M.reduce((a, v) => a + v.x, 0) / M.length, mcz = M.reduce((a, v) => a + v.z, 0) / M.length;
    const across = M.map((v) => Math.hypot(v.x - mcx, v.z - mcz)), far = Math.max(...across);
    let gap = -Infinity, sunk = Infinity, hang = 0;
    M.forEach((v, i) => {
      if (across[i] < 0.93 * far) return;   // the next ring in is 0.85 of the rim's radius
      rimAll++;
      const yTop = Math.min(...upP.map((q) => (q.d - q.n.x * v.x - q.n.z * v.z) / q.n.y));
      const yBot = Math.max(...dnP.map((q) => (q.d - q.n.x * v.x - q.n.z * v.z) / q.n.y));
      if (yTop < yBot) { rimOver++; hang++; return; }
      gap = Math.max(gap, (v.y - yTop) / rockH); sunk = Math.min(sunk, (v.y - yTop) / rockH);
    });
    if (Number.isFinite(gap)) { rimGap.push(gap); rimSunk.push(sunk); }
    rimHang.push(hang);
  }
  const sorted = (a) => [...a].sort((x, y) => x - y);
  const q = (a, f) => sorted(a)[Math.min(a.length - 1, Math.floor(f * a.length))];
  console.log(`  ·  moss rock: ${N} builds (${chunks} with the second chunk); moss area outside the rock: lowest ${(100 * q(shown, 0)).toFixed(1)}%, median ${(100 * q(shown, 0.5)).toFixed(1)}%, highest ${(100 * q(shown, 0.999)).toFixed(1)}%`);
  console.log(`  ·  moss rock: moss area above the rock's highest point (the studio's wording): lowest ${(100 * q(above, 0)).toFixed(1)}%, median ${(100 * q(above, 0.5)).toFixed(1)}%`);
  console.log(`  ·  moss rock: highest bottom of a rock or chunk ${floatMax.toFixed(3)} (0 is the ground)`);
  const gapWorst = rimGap.length ? q(rimGap, 0.999) : Infinity;
  if (rimGap.length) console.log(`  ·  moss rock: the moss's rim over the rock's upper surface below it: ${rimOver} of ${rimAll} rim vertices hang past the rock's outline; the rest stand at most ${q(rimGap, 0.5).toFixed(3)} (median build) and ${gapWorst.toFixed(3)} (worst) of the rock's height above it, the deepest ${q(rimSunk, 0.5).toFixed(3)} (median) and ${q(rimSunk, 0).toFixed(3)} (worst) — negative is inside the rock`);
  verdict(q(shown, 0) >= MOSS_SHOWN_MIN,
    `M1 the moss shows: at least ${(100 * q(shown, 0)).toFixed(1)}% of it outside the rock in every build (bar ${100 * MOSS_SHOWN_MIN}%)`,
    `M1 the moss is buried: as little as ${(100 * q(shown, 0)).toFixed(1)}% of it outside the rock (median ${(100 * q(shown, 0.5)).toFixed(1)}%, bar ${100 * MOSS_SHOWN_MIN}% in every build)`);
  verdict(floatMax <= EPS,
    `M2 nothing floats: every rock and chunk reaches the ground (highest bottom ${floatMax.toFixed(3)})`,
    `M2 a rock or chunk floats: its lowest vertex is ${floatMax.toFixed(3)} above the ground`);
  verdict(q(above, 0) >= MOSS_ABOVE_MIN,
    `M3 the moss crowns the rock: at least ${(100 * q(above, 0)).toFixed(1)}% of it above the rock's highest point in every build (bar ${100 * MOSS_ABOVE_MIN}%, the studio's wording)`,
    `M3 the moss does not crown the rock: as little as ${(100 * q(above, 0)).toFixed(1)}% of it above the rock's highest point (median ${(100 * q(above, 0.5)).toFixed(1)}%, bar ${100 * MOSS_ABOVE_MIN}% in every build)`);
  verdict(rimOver === 0 && rimGap.length === N && gapWorst <= RIM_GAP_MAX,
    `M4 the moss sits on the rock: every rim vertex over the rock, none more than ${gapWorst.toFixed(3)} of the rock's height above its surface (bar ${RIM_GAP_MAX}, every build)`,
    `M4 the moss floats: its rim stands up to ${gapWorst.toFixed(3)} of the rock's height over the rock (median build ${rimGap.length ? q(rimGap, 0.5).toFixed(3) : '-'}, bar ${RIM_GAP_MAX}), ${rimOver} rim vertices past the rock's outline — a lid, not a cushion`);
}
process.exit(failed ? 1 : 0);
