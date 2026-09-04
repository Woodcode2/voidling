// PLACEMENT AUDITOR — "every object earns the spot it is standing on".
//
// The owner, verbatim (docs/FABLE-LAUNCH-BRIEF.md §1): "Sometimes in certain
// levels the items may be misplaced — you have trees on roads, the road may
// not be finished, item placement isn't dialled in."
//
// WHAT THIS READS. The live page's own placement data: `window.__edibles`
// (every prop the void can eat — mesh position, yaw, radius, userData) after
// the boot-time validateWorld() sweep, i.e. the placement the player gets.
// A prop's FOOTPRINT is what touches the floor: the oriented box, in the prop's
// own yaw frame, of every vertex of its real built geometry under GROUND_H —
// a maple's trunk and not its canopy, a house's walls and not its eaves. The
// eat radius is a gameplay number and is not used for geometry. Contact-shadow
// discs are skipped. Roads are parsed out of the real source files
// (src/proto3d/{bay,gameday,lantern,powder}.ts polylines and half-widths;
// island.ts ROAD_CENTERS and the 110-unit asphalt width the bake paints) and
// the probe THROWS if a constant it needs has moved (GOVERNOR.md rule 4).
// Coast and water are the page's own predicates (__insideIsland3,
// __inDeepWater3).
//
// WHAT validateWorld() DOES NOT CATCH (prototype3d.ts:6209): it tests the
// Maple road grid only, prop by prop, on the whole bounding box, and culls
// off-island props. It knows nothing of the four polyline roads of the other
// worlds, prop-in-prop containment, pairwise overlap, floating bases, road
// endpoints, doors or bench facing. Those are the categories below.
//
// CATEGORIES (a world FAILS if any category marked FAIL is above zero; the
// ones marked info are reported and defended in the proposal, not failed):
//   road      footprint on the asphalt by more than ROAD_LIP (Maple: the
//             footprint's world AABB against the axis-aligned band — exact
//             for a box; others: the closest of 9 footprint samples to the
//             polyline is more than ROAD_LIP inside the half-width). Props
//             tagged userData.qk 'roadworks' | 'bridge' | 'car' | 'rv' are
//             exempt — they are on the road on purpose.
//   water     footprint centre in a painted water body (Maple pond/lagoon,
//             Lantern canal, Powder lake) and not `afloat`
//   offisland footprint centre where __insideIsland3 is false, not `afloat`
//   float     lowest vertex more than FLOAT_TOL above the ground plane (y=0)
//   sunk      highest vertex under SUNK_TOL — the prop is buried (info: a
//             bush is a half-buried sphere by design; only a prop nobody can
//             see is a defect on a flat plane)
//   inside    a prop whose footprint centre is inside a building-class prop's
//             footprint AND inside its solid geometry — a ray at knee height
//             (0.6) or chest height (1.4), both faces on, crosses that prop's
//             surface an odd number of times
//   under     same, but the rays say open air: under an overhang or a canopy
//             (info)
//   overlap   two footprints interpenetrating by more than OVERLAP_TOL along
//             every separating axis (SAT on the two oriented rects)
//   roadend   open polyline endpoint that joins nothing: not the coast, not
//             another path, not a pier, not a landmark ellipse, not a
//             building-class footprint within 4 units
//   door      house (userData.qk==='house', island.ts makeHouse) whose
//             doorstep DOOR_CLEAR in front of the door is inside another
//             footprint, off-island, on water, or (Maple) whose front is not
//             toward its own road
//   bench     park bench (island.ts makeBench, fingerprinted by its merged
//             3.0x2.0x1.0 geometry) with a footprint or the sea within 2.8
//             units straight in front of the seat
//   benchaway (info) bench with its back to the path it sits beside
//   overhang  (info) footprint corner over the coastline
//   piste     (Powder, info) props on the ski run — gates and pylons stand
//             there by design
//
// USAGE  node qa/placement.mjs [world|all] [port] [--shots=DIR] [--n=3]
//        [--cats=road,door] [--tag=before] [--json=FILE]
//        SEED=<n> seeds Math.random exactly as qa/lookpair.mjs does, so two
//        builds of a non-Maple world compare like for like. SRC=<dir>
//        overrides the source root (default ../src from this file).
//        --shots enters the match and photographs the worst offenders per
//        category from the play camera (canvas, real frame, cropped) — the
//        void is warped 6 units toward the lens so the offender sits up-frame.
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';
import { ALL_WORLDS } from './worlds.mjs';

const argv = process.argv.slice(2);
const flags = Object.fromEntries(argv.filter((a) => a.startsWith('--')).map((a) => { const [k, v] = a.slice(2).split('='); return [k, v ?? '1']; }));
const pos = argv.filter((a) => !a.startsWith('--'));
const WORLD = pos[0] || 'all';
const PORT = pos[1] || '4177';
// THE WORLD LIST IS READ FROM THE SOURCE OF TRUTH, NOT TYPED HERE. island.ts's
// WorldId union is the only place that knows how many worlds this game has, and
// a probe with its own hand-typed copy silently stops covering the newest one —
// the world 6 contract found fifteen probes in exactly that state, each printing
// a clean verdict about a game that had moved on.
// (the derivation itself now lives in qa/worlds.mjs, where every probe and the
// gate's own fan-out read it — this file had the only copy for one round.)
const WORLDS = WORLD === 'all' ? ALL_WORLDS : [WORLD];
/** The worlds worldData() below can actually describe. It lives up here rather
 *  than beside the chain because the startup assertion needs it, and a list that
 *  is checked is worth more than a list that is adjacent. */
const KNOWN = ['maple', 'pirate', 'gameday', 'lantern', 'powder', 'skylark'];
const SHOTS = flags.shots || null;
const SHOTS_PER_CAT = Number(flags.n || 3);
const JSON_OUT = flags.json || null;
// ── THE CEILING ─────────────────────────────────────────────────────────────
// Stream A1 measured this game's placement, fixed the bulk of it (Maple's
// overlap 451 -> 119, Pirate's road 109 -> 16) and RECORDED the residue. What
// nobody did was wire the probe into the gate, so for a week the residue has
// been unguarded: nothing anywhere would have noticed it growing back.
//
// Clearing 415 offenders across five shipped worlds is a stream of its own and
// not this one. So the residue is FROZEN instead — the same move roundlod makes
// with its 154 round things ("the debt is frozen and visible every run"). Every
// world gets a per-category ceiling it may not exceed, and a world with no entry
// in the baseline has a ceiling of ZERO on every category.
//
// That second half is the point. A new world is born perfect or it does not
// board: SKYLARK FIELD cannot inherit a single one of these.
const CEILING = flags.ceiling ? JSON.parse(fs.readFileSync(flags.ceiling, 'utf8')) : null;
const SRC = process.env.SRC ? new URL('file://' + path.resolve(process.env.SRC) + '/') : new URL('../src/', import.meta.url);

// AND THE TWO LISTS MUST AGREE. KNOWN is what worldData() can describe; the
// WorldId union is what the game ships. A world in the union and not in KNOWN is
// the exact hole this file had: auditable in name, unauditable in fact.
{
  const missing = ALL_WORLDS.filter((w) => !KNOWN.includes(w));
  if (missing.length) {
    console.log(`FAIL — placement: ${missing.join(', ')} ship in WorldId but worldData() cannot describe ` +
      `${missing.length > 1 ? 'them' : 'it'}. Add the case before auditing, or the audit says "road 0 ok" and passes.`);
    process.exit(1);
  }
}

// ── bars (3D units; 1 unit = 20 world units; the void starts ~0.8 radius) ─
const ROAD_LIP = 0.25;     // a footprint this far onto the asphalt is ON the road
const FLOAT_TOL = 0.30;    // a base this high off the plane reads as hovering
const SUNK_TOL = 0.60;     // a prop whose TOP is under this cannot be seen
const OVERLAP_TOL = 0.35;  // footprints interpenetrating this much are one object
const DOOR_CLEAR = 1.6;    // a person needs this much doorstep
const BENCH_NEAR = 10;     // a bench within this of a path sits beside it
const GROUND_H = 1.0;      // geometry under this height is what stands on the ground
const DECK_BAND = 3.5;     // a pedestrian deck's furniture band, measured from its edge (bench at 5.75 of 8.75)

// ── read the real source ────────────────────────────────────────────────────
const read = (rel) => fs.readFileSync(new URL(rel, SRC), 'utf8');
const must = (re, text, what) => { const m = re.exec(text); if (!m) throw new Error(`placement.mjs: cannot find ${what} — the call site moved; fix the probe, do not skip`); return m; };
const num = (re, text, what) => Number(must(re, text, what)[1]);
const pts = (name, text) => {
  const body = must(new RegExp(`export const ${name}: Pt\\[\\] = \\[([\\s\\S]*?)\\];`), text, `${name} polyline`)[1]
    .replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, '').replace(/,\]/g, ']').replace(/,$/, '');
  const arr = JSON.parse(`[${body}]`);
  if (!arr.length || !arr.every((p) => Array.isArray(p) && p.length === 2)) throw new Error(`placement.mjs: ${name} parsed empty`);
  return arr;
};
const ellipse = (name, text) => {
  const m = must(new RegExp(`export const ${name} = \\{ cx: (\\d+), cy: (\\d+), rx: (\\d+), ry: (\\d+) \\};`), text, `${name} ellipse`);
  return { name, cx: +m[1], cy: +m[2], rx: +m[3], ry: +m[4] };
};
const islandSrc = read('proto3d/island.ts'), protoSrc = read('prototype3d.ts');
const SCALE = num(/const SCALE = ([\d.]+);/, islandSrc, 'SCALE');
const CX = num(/const CX = (\d+), CZ = \d+;/, islandSrc, 'CX');
const CZ = num(/const CX = \d+, CZ = (\d+);/, islandSrc, 'CZ');
if (CX !== CZ) throw new Error('placement.mjs: CX != CZ — w3() assumes one origin');
const w3 = (v) => (v - CX) * SCALE;   // world → 3D
const w3len = (v) => v * SCALE;
const ROAD_CENTERS = JSON.parse(must(/const ROAD_CENTERS = (\[[\d, ]+\]);/, islandSrc, 'ROAD_CENTERS')[1]);
const ROAD_W_WORLD = num(/pxW\(ROAD_CENTERS\[1\]\) - pxW\(ROAD_CENTERS\[1\] - (\d+)\)/, islandSrc, 'Maple asphalt width (roadPx)');
const ASPHALT_HALF = num(/const ASPHALT_HALF = ([\d.]+);/, protoSrc, 'ASPHALT_HALF');
if (Math.abs(w3len(ROAD_W_WORLD / 2) - ASPHALT_HALF) > 1e-6) throw new Error(`placement.mjs: bake paints ${ROAD_W_WORLD}-unit roads but ASPHALT_HALF is ${ASPHALT_HALF}`);

function worldData(wid) {
  const d = { world: wid, roads: [], piers: [], ellipses: [], mapleCenters: [], asphaltHalf: ASPHALT_HALF };
  const P = (arr) => arr.map(([x, y]) => [w3(x), w3(y)]);
  if (wid === 'maple') { d.mapleCenters = ROAD_CENTERS.map(w3); return d; }
  if (wid === 'pirate') {
    const s = read('proto3d/bay.ts');
    // a DECK carries furniture on its edge band by design (island.ts:6465-6480
    // drops torches, benches, planters and signposts 5.75-7.5 units off the
    // boardwalk centreline); its core is the walk, and the bar is the core
    d.roads.push({ name: 'PROMENADE', pts: P(pts('PROMENADE', s)), half: w3len(num(/export const PROM_HALF = (\d+);/, s, 'PROM_HALF')), kind: 'road', deck: true });
    d.roads.push({ name: 'TRAIL', pts: P(pts('TRAIL', s)), half: w3len(num(/export const TRAIL_HALF = (\d+);/, s, 'TRAIL_HALF')), kind: 'road' });
    const piers = must(/export const PIERS: \[number, number, number, number\]\[\] = \[([\s\S]*?)\];/, s, 'PIERS')[1].replace(/\s+/g, '').replace(/,$/, '');
    d.piers = JSON.parse(`[${piers}]`).map(([a, b, c, e]) => [w3(a), w3(b), w3(c), w3(e)]);
  }
  if (wid === 'gameday') {
    const s = read('proto3d/gameday.ts');
    d.roads.push({ name: 'CONCOURSE', pts: P(pts('CONCOURSE', s)), half: w3len(num(/export const CONCOURSE_HALF = (\d+);/, s, 'CONCOURSE_HALF')), kind: 'road', deck: true });
    const e = ellipse('STADIUM', s); d.ellipses.push({ name: e.name, cx: w3(e.cx), cz: w3(e.cy), rx: w3len(e.rx), rz: w3len(e.ry) });
  }
  if (wid === 'lantern') {
    const s = read('proto3d/lantern.ts');
    d.roads.push({ name: 'MARKET', pts: P(pts('MARKET', s)), half: w3len(num(/export const MARKET_HALF = (\d+);/, s, 'MARKET_HALF')), kind: 'road', deck: true });
    d.roads.push({ name: 'CANAL', pts: P(pts('CANAL', s)), half: w3len(num(/export const CANAL_HALF = (\d+);/, s, 'CANAL_HALF')), kind: 'water' });
    const e = ellipse('BATHHOUSE', s); d.ellipses.push({ name: e.name, cx: w3(e.cx), cz: w3(e.cy), rx: w3len(e.rx), rz: w3len(e.ry) });
  }
  // EVERY WORLD MUST BE KNOWN HERE. Until 2026-09-04 this chain was five ifs
  // with no default and no throw, so a world it had never heard of got an empty
  // road set, an empty pier set and no ellipses — and the audit then printed
  // "road 0 ok / roadend 0 ok" and PASSED. A sixth world would have been born
  // clean against the one instrument built for the owner's sharpest complaint.
  // The guard is at the END of the chain rather than the top so it lists what
  // it does know.
  if (wid === 'powder') {
    const s = read('proto3d/powder.ts');
    d.roads.push({ name: 'GRIT', pts: P(pts('GRIT', s)), half: w3len(num(/export const GRIT_HALF = (\d+);/, s, 'GRIT_HALF')), kind: 'road' });
    d.roads.push({ name: 'PISTE', pts: P(pts('PISTE', s)), half: w3len(num(/export const PISTE_HALF = (\d+);/, s, 'PISTE_HALF')), kind: 'piste' });
    // the LAKE is ICE (powder.ts onIce): the 'lake' district scatters sleds,
    // snowmen and drifts onto it by design, so a prop on it is info — a TREE
    // rooted in it (qk 'pine') is water
    for (const n of ['LODGE', 'LAKE']) { const e = ellipse(n, s); d.ellipses.push({ name: e.name, cx: w3(e.cx), cz: w3(e.cy), rx: w3len(e.rx), rz: w3len(e.ry), ice: n === 'LAKE' }); }
  }
  if (wid === 'skylark') {
    const s = read('proto3d/skylark.ts');
    // THREE STRIPS, AND THEY ARE NOT DECKS. A runway carries nothing by design —
    // it is the level's one sightline, and skPlaceable() keeps scatter off all
    // three — so unlike bay.ts's boardwalk or gameday.ts's concourse the bar
    // here is the FULL half-width, not a core. Anything standing on the
    // concrete is a defect, with two authored exceptions the world places by
    // hand and tags: the threshold numerals and the edge lights.
    // …ONE strip, since the rebuild. 09/27 and 15/33 are disused slab now —
    // half 260, cracked, and PLACEABLE by design (skylark.ts, RUNWAYS[].live)
    // — so a prop standing on them is a prop on the ground, not on a road.
    // Only the live runway is a sightline the audit keeps clear.
    for (const n of ['RWY03']) {
      d.roads.push({ name: n, pts: P(pts(n, s)),
        half: w3len(num(new RegExp(`export const ${n}_HALF = (\\d+);`), s, `${n}_HALF`)), kind: 'road' });
    }
    // the perimeter track is a CLOSED ring; its last point repeats its first, so
    // distToPath closes the loop and there is no gap to hide a prop in
    d.roads.push({ name: 'PERIMETER', pts: P(pts('PERIMETER', s)),
      half: w3len(num(/export const PERIMETER_HALF = (\d+);/, s, 'PERIMETER_HALF')), kind: 'road' });
    // THE LAUNCH CIRCLE is the whale's precinct and is authored, not scattered:
    // her ground crew, fan trailer, tether pins and the commentary trestle are
    // meant to be inside it, exactly as Powder's lake carries authored clutter
    const m = /export const LAUNCH = \{ cx: (\d+), cy: (\d+), rx: (\d+), ry: (\d+) \}/.exec(s);
    if (!m) throw new Error('placement: no LAUNCH in skylark.ts');
    // PRECINCT, not just an ellipse. The launch circle is painted ON the
    // runway crossing and it carries the whale, her ground crew, her fan
    // trailer and her tether pins BY DESIGN — the same relationship bay.ts's
    // boardwalk has with its furniture, which this file already exempts with
    // `deck`. Without this the hero prop of the world is a road offence.
    d.ellipses.push({ name: 'LAUNCH', cx: w3(+m[1]), cz: w3(+m[2]), rx: w3len(+m[3]), rz: w3len(+m[4]), precinct: true });
  }
  if (!KNOWN.includes(wid)) {
    throw new Error(`placement: no roads, piers or precincts are defined for world "${wid}". ` +
      `Add its case to worldData() before auditing it — an unknown world reports ` +
      `"road 0 ok" and passes, which is worse than no audit at all. Known: ${KNOWN.join(', ')}.`);
  }
  return d;
}

// ── the in-page audit ───────────────────────────────────────────────────────
// Runs inside the page against __edibles and the island predicates. Pure
// geometry on the live meshes; nothing is transcribed from the source except
// the bars above and the road data parsed from it.
const auditFn = (D) => {
  const { ROAD_LIP, FLOAT_TOL, SUNK_TOL, OVERLAP_TOL, DOOR_CLEAR, BENCH_NEAR, GROUND_H, DECK_BAND } = D;
  const THREE = window.__THREE;
  const segDist = (px, pz, ax, az, bx, bz) => {
    const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1;
    let t = ((px - ax) * dx + (pz - az) * dz) / l2; t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (ax + t * dx), pz - (az + t * dz));
  };
  const pathDist = (px, pz, P) => { let m = Infinity; for (let i = 0; i < P.length - 1; i++) m = Math.min(m, segDist(px, pz, P[i][0], P[i][1], P[i + 1][0], P[i + 1][1])); return m; };
  const nearestOnPath = (px, pz, P) => {
    let best = { d: Infinity }; for (let i = 0; i < P.length - 1; i++) {
      const [ax, az] = P[i], [bx, bz] = P[i + 1]; const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1;
      let t = ((px - ax) * dx + (pz - az) * dz) / l2; t = Math.max(0, Math.min(1, t));
      const x = ax + t * dx, z = az + t * dz, d = Math.hypot(px - x, pz - z);
      if (d < best.d) best = { d, x, z };
    } return best; };
  const inEllipse = (e, x, z, m = 0) => { const a = (x - e.cx) / (e.rx + m), b = (z - e.cz) / (e.rz + m); return a * a + b * b < 1; };
  const inPier = (x, z, m) => D.piers.some(([x0, z0, x1, z1]) => segDist(x, z, x0, z0, x1, z1) < 1.2 + m);
  const isShadowDisc = (c) => c.isMesh && Math.abs(c.rotation.x + Math.PI / 2) < 1e-4 && Math.abs(c.position.y - 0.045) < 1e-3;

  // ── the population, with GROUND footprints ───────────────────────────────
  const props = [], dbgBench = [];
  const v = new THREE.Vector3(), inv = new THREE.Matrix4(), rootM = new THREE.Matrix4();
  for (const e of window.__edibles) {
    const m = e.mesh; if (!m) continue;
    const ud = m.userData;
    if (ud.mover) continue;
    m.updateMatrixWorld(true);
    rootM.makeRotationY(m.rotation.y).setPosition(m.position.x, 0, m.position.z); inv.copy(rootM).invert();
    let lx0 = Infinity, lx1 = -Infinity, lz0 = Infinity, lz1 = -Infinity, minY = Infinity, maxY = -Infinity, nv = 0;
    const kidBoxes = [];
    m.traverse((c) => {
      if (!c.isMesh || !c.geometry || c.isSprite || isShadowDisc(c)) return;
      const pa = c.geometry.attributes.position; if (!pa) return;
      const g = c.geometry; if (!g.boundingBox) g.computeBoundingBox();
      const b = g.boundingBox; kidBoxes.push([+(b.max.x - b.min.x).toFixed(2), +(b.max.y - b.min.y).toFixed(2), +(b.max.z - b.min.z).toFixed(2)]);
      const mw = c.matrixWorld;
      for (let i = 0; i < pa.count; i++) {
        v.fromBufferAttribute(pa, i).applyMatrix4(mw);
        if (v.y < minY) minY = v.y; if (v.y > maxY) maxY = v.y;
        nv++;
        if (v.y > GROUND_H) continue;
        v.applyMatrix4(inv);
        if (v.x < lx0) lx0 = v.x; if (v.x > lx1) lx1 = v.x; if (v.z < lz0) lz0 = v.z; if (v.z > lz1) lz1 = v.z;
      }
    });
    if (!nv) continue;
    const grounded = lx0 !== Infinity;
    const lgx = grounded ? (lx0 + lx1) / 2 : 0, lgz = grounded ? (lz0 + lz1) / 2 : 0, ghx = grounded ? (lx1 - lx0) / 2 : 0, ghz = grounded ? (lz1 - lz0) / 2 : 0;
    const cy = Math.cos(m.rotation.y), sy = Math.sin(m.rotation.y);
    const toWorld = (x, z) => [m.position.x + x * cy + z * sy, m.position.z - x * sy + z * cy];
    const [cx, cz] = toWorld(lgx, lgz);
    const corners = grounded ? [toWorld(lx0, lz0), toWorld(lx1, lz0), toWorld(lx1, lz1), toWorld(lx0, lz1)] : [];
    let bench = false, door = null;
    if (e.radius === 2.4 || e.radius === 1.6) bench = kidBoxes.some(([bx, by, bz]) => Math.abs(bx - 3.0) < 0.06 && Math.abs(by - 2.02) < 0.12 && Math.abs(bz - 1.0) < 0.12);
    if ((e.radius === 2.4 || e.radius === 1.6) && dbgBench.length < 6) dbgBench.push({ r: e.radius, kidBoxes });
    if (ud.qk === 'house') for (const c of m.children) if (c.isGroup && Math.abs(c.scale.x - 1.2) < 1e-6 && Math.abs(c.scale.y - 1.3) < 1e-6) {
      const wp = new THREE.Vector3(); c.getWorldPosition(wp);
      door = { x: wp.x, z: wp.z, fx: sy, fz: cy };   // makeHouse: the door is on local +z
    }
    props.push({ i: props.length, mesh: m, x: m.position.x, z: m.position.z, cx, cz, lgx, lgz, ghx, ghz, corners, grounded,
      h: maxY - Math.min(0, minY), minY, maxY, rIn: Math.min(ghx, ghz), rOut: Math.hypot(ghx, ghz), r: e.radius,
      ry: m.rotation.y, cy, sy, qk: ud.qk || '', building: !!ud.building, afloat: !!ud.afloat, bench, door, nv, spin: !!ud.spin,
      // a SOLID is a building-class thing with walls: eat radius >= 2, a front
      // (trees/bushes/rocks tag userData.spin and have none), 2+ tall, 2.4+ wide
      solid: e.radius >= 2 && !ud.spin && (maxY - Math.min(0, minY)) >= 2 && Math.min(2 * ghx, 2 * ghz) >= 2.4 });
  }
  const out = { world: D.world, n: props.length, cats: {}, benches: props.filter((p) => p.bench).length, houses: props.filter((p) => p.door).length, dbgBench };
  const cat = (k) => (out.cats[k] = out.cats[k] || []);
  const desc = (p) => `#${p.i} ${p.qk || (p.bench ? 'bench' : p.building ? 'bldg' : 'prop')} r=${+p.r.toFixed(2)} foot=${(2 * p.ghx).toFixed(1)}x${(2 * p.ghz).toFixed(1)} h=${p.h.toFixed(1)} at (${p.cx.toFixed(1)},${p.cz.toFixed(1)})`;
  // world point → inside q's oriented ground rect (margin m)?
  const inRect = (q, x, z, m = 0) => { const dx = x - q.x, dz = z - q.z; const lx = dx * q.cy - dz * q.sy, lz = dx * q.sy + dz * q.cy;
    return Math.abs(lx - q.lgx) < q.ghx + m && Math.abs(lz - q.lgz) < q.ghz + m; };
  // SAT penetration of two oriented rects (0 = separated)
  const satDepth = (a, b) => {
    let best = Infinity;
    for (const r of [a, b]) for (const [ux, uz] of [[r.cy, -r.sy], [r.sy, r.cy]]) {
      let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity;
      for (const [x, z] of a.corners) { const t = x * ux + z * uz; if (t < a0) a0 = t; if (t > a1) a1 = t; }
      for (const [x, z] of b.corners) { const t = x * ux + z * uz; if (t < b0) b0 = t; if (t > b1) b1 = t; }
      const o = Math.min(a1, b1) - Math.max(a0, b0); if (o <= 0) return 0; if (o < best) best = o;
    }
    return best;
  };
  const EXEMPT_ROAD = new Set(['roadworks', 'bridge', 'car', 'rv']);

  // ── road / water / piste / offisland / float / sunk ──────────────────────
  for (const p of props) {
    if (p.afloat) continue;
    if (!p.grounded) { if (p.minY > FLOAT_TOL) cat('float').push({ p, d: desc(p) + ` base ${p.minY.toFixed(2)} (nothing under ${GROUND_H})`, x: p.x, z: p.z, depth: +p.minY.toFixed(2) }); continue; }
    if (p.minY > FLOAT_TOL) cat('float').push({ p, d: desc(p) + ` base ${p.minY.toFixed(2)}`, x: p.cx, z: p.cz, depth: +p.minY.toFixed(2) });
    if (p.maxY < SUNK_TOL) cat('sunk').push({ p, d: desc(p) + ` top ${p.maxY.toFixed(2)} min ${p.minY.toFixed(2)}`, x: p.cx, z: p.cz, depth: +(-p.minY).toFixed(2) });
    const samples = [[p.cx, p.cz], ...p.corners, ...p.corners.map((c, i) => [(c[0] + p.corners[(i + 1) % 4][0]) / 2, (c[1] + p.corners[(i + 1) % 4][1]) / 2])];
    if (!EXEMPT_ROAD.has(p.qk)) {
      if (D.world === 'maple') {
        const xs = p.corners.map((c) => c[0]), zs = p.corners.map((c) => c[1]);
        const fx0 = Math.min(...xs), fx1 = Math.max(...xs), fz0 = Math.min(...zs), fz1 = Math.max(...zs);
        for (const c of D.mapleCenters) {
          const dx = Math.min(fx1, c + D.asphaltHalf) - Math.max(fx0, c - D.asphaltHalf);
          const dz = Math.min(fz1, c + D.asphaltHalf) - Math.max(fz0, c - D.asphaltHalf);
          if (dx > ROAD_LIP) cat('road').push({ p, d: desc(p), depth: +dx.toFixed(2), road: `x=${c.toFixed(1)}`, x: p.cx, z: p.cz });
          if (dz > ROAD_LIP) cat('road').push({ p, d: desc(p), depth: +dz.toFixed(2), road: `z=${c.toFixed(1)}`, x: p.cx, z: p.cz });
        }
      }
      for (const rd of D.roads) {
        let dist = Infinity; for (const [x, z] of samples) dist = Math.min(dist, pathDist(x, z, rd.pts));
        // an authored precinct painted on the road carries its own furniture,
        // exactly as a pedestrian deck does — see the LAUNCH note in worldData
        if (D.ellipses.some((el) => el.precinct && inEllipse(el, p.cx, p.cz, 0))) continue;
        const depth = (rd.deck ? rd.half - DECK_BAND : rd.half) - dist;
        if (depth > ROAD_LIP) cat(rd.kind === 'road' ? 'road' : rd.kind).push({ p, d: desc(p), depth: +depth.toFixed(2), road: rd.name + (rd.deck ? ' core' : ''), x: p.cx, z: p.cz });
      }
    }
    for (const el of D.ellipses) if (el.ice && inEllipse(el, p.cx, p.cz, -p.rIn)) cat(p.qk === 'pine' ? 'water' : 'ice').push({ p, d: desc(p), road: el.name, x: p.cx, z: p.cz, depth: 0 });
    if (window.__inDeepWater3(p.cx, p.cz, 0)) cat('water').push({ p, d: desc(p), road: 'pond/lagoon', x: p.cx, z: p.cz, depth: 0 });
    if (!window.__insideIsland3(p.cx, p.cz)) cat('offisland').push({ p, d: desc(p), x: p.cx, z: p.cz, depth: 0 });
    else { const off = p.corners.filter(([x, z]) => !window.__insideIsland3(x, z)).length; if (off) cat('overhang').push({ p, d: desc(p), x: p.cx, z: p.cz, depth: off }); }
  }
  // ── inside a building / overlap (spatial hash on ground rects) ──────────
  const CELL = 8, hash = new Map();
  const key = (ix, iz) => ix * 100003 + iz;
  const cellsOf = (x, z, r) => { const x0 = Math.floor((x - r) / CELL), x1 = Math.floor((x + r) / CELL), z0 = Math.floor((z - r) / CELL), z1 = Math.floor((z + r) / CELL); const o = []; for (let ix = x0; ix <= x1; ix++) for (let iz = z0; iz <= z1; iz++) o.push(key(ix, iz)); return o; };
  for (const p of props) { if (p.afloat || !p.grounded) continue; for (const k of cellsOf(p.cx, p.cz, p.rOut)) { if (!hash.has(k)) hash.set(k, []); hash.get(k).push(p); } }
  const near = (x, z, r) => { const s = new Set(); for (const k of cellsOf(x, z, r)) for (const q of hash.get(k) || []) s.add(q); return s; };
  // ray parity at knee and chest height, both faces on, so "inside the walls"
  // is a fact about the geometry and not about which way its normals point
  const ray = new THREE.Raycaster(); const dirX = new THREE.Vector3(1, 0, 0);
  const insideSolid = (big, x, z, y) => {
    const mats = new Map(); big.mesh.traverse((c) => { if (c.isMesh && c.material) { const ms = Array.isArray(c.material) ? c.material : [c.material]; for (const mm of ms) if (!mats.has(mm)) { mats.set(mm, mm.side); mm.side = THREE.DoubleSide; } } });
    ray.set(new THREE.Vector3(x, y, z), dirX); ray.far = big.rOut * 2 + 4; ray.near = 0;
    const hits = ray.intersectObject(big.mesh, true).filter((h) => !isShadowDisc(h.object));
    for (const [mm, side] of mats) mm.side = side;
    return hits.length % 2 === 1;
  };
  const seen = new Set();
  for (const p of props) { if (p.afloat || !p.grounded) continue;
    for (const q of near(p.cx, p.cz, p.rOut)) {
      if (q.i <= p.i) continue; const pk = p.i * 100000 + q.i; if (seen.has(pk)) continue; seen.add(pk);
      if (Math.hypot(p.cx - q.cx, p.cz - q.cz) > p.rOut + q.rOut) continue;
      const [big, small] = (p.ghx * p.ghz >= q.ghx * q.ghz) ? [p, q] : [q, p];
      if (big.building && big.h >= 2.5 && big.ghx * big.ghz > 3 * small.ghx * small.ghz && inRect(big, small.cx, small.cz, -0.15)) {
        const solid = insideSolid(big, small.cx, small.cz, 0.6) || insideSolid(big, small.cx, small.cz, 1.4);
        cat(solid ? 'inside' : 'under').push({ p: small, q: big, d: `${desc(small)} ${solid ? 'INSIDE' : 'under'} ${desc(big)}`, x: small.cx, z: small.cz, depth: +(big.rIn - Math.hypot(small.cx - big.cx, small.cz - big.cz)).toFixed(2) });
        continue;
      }
      const depth = satDepth(p, q);
      // a solid through anything is `overlap` (FAIL); two bits of clutter
      // (snowballs, drifts, bins) touching is `clutter` (info)
      if (depth > OVERLAP_TOL) cat(p.solid || q.solid ? 'overlap' : 'clutter').push({ p, q, d: `${desc(p)} x ${desc(q)}`, x: (p.cx + q.cx) / 2, z: (p.cz + q.cz) / 2, depth: +depth.toFixed(2) });
    }
  }
  // ── road ends ────────────────────────────────────────────────────────────
  const bldgs = props.filter((p) => p.building && !p.afloat && p.grounded);
  for (const rd of D.roads) {
    if (rd.kind !== 'road') continue;
    const P = rd.pts; const closed = P[0][0] === P[P.length - 1][0] && P[0][1] === P[P.length - 1][1];
    if (closed) continue;
    for (const end of [0, 1]) {
      const [ex, ez] = end ? P[P.length - 1] : P[0]; const [px, pz] = end ? P[P.length - 2] : P[1];
      const tl = Math.hypot(ex - px, ez - pz) || 1, tx = (ex - px) / tl, tz = (ez - pz) / tl;
      let joins = null;
      const probe = [1, 2, 3].map((k) => [ex + tx * rd.half * k, ez + tz * rd.half * k]);
      if (probe.some(([x, z]) => !window.__insideIsland3(x, z))) joins = 'coast';
      if (!joins) for (const o of D.roads) if (o !== rd && pathDist(ex, ez, o.pts) < o.half + rd.half) joins = o.name;
      if (!joins && inPier(ex, ez, rd.half)) joins = 'pier';
      if (!joins) for (const el of D.ellipses) if (inEllipse(el, ex, ez, rd.half * 1.5)) joins = el.name;
      if (!joins) for (const b of bldgs) if (inRect(b, ex, ez, 4)) { joins = `building ${desc(b)}`; break; }
      cat('roadend').push({ d: `${rd.name} end ${end} at (${ex.toFixed(1)},${ez.toFixed(1)}) joins ${joins || 'NOTHING'}`, x: ex, z: ez, depth: joins ? 0 : 1, ok: !!joins, road: rd.name });
    }
  }
  // ── doors ────────────────────────────────────────────────────────────────
  for (const p of props) {
    if (!p.door) continue; const d = p.door;
    const fx = d.x + d.fx * DOOR_CLEAR, fz = d.z + d.fz * DOOR_CLEAR;
    const reasons = [];
    if (!window.__insideIsland3(fx, fz)) reasons.push('opens off-island');
    else if (window.__inDeepWater3(fx, fz, 0)) reasons.push('opens onto water');
    for (const q of near(fx, fz, 1)) if (q !== p && !q.afloat && inRect(q, fx, fz, 0)) { reasons.push(`doorstep blocked by ${desc(q)}`); break; }
    if (D.world === 'maple') {
      let best = null;
      for (const c of D.mapleCenters) {
        const dxs = c - p.cx, dzs = c - p.cz;
        if (best === null || Math.abs(dxs) < best.d) best = { d: Math.abs(dxs), vx: Math.sign(dxs), vz: 0 };
        if (Math.abs(dzs) < best.d) best = { d: Math.abs(dzs), vx: 0, vz: Math.sign(dzs) };
      }
      if (best && best.d < 12 && d.fx * best.vx + d.fz * best.vz < 0.5) reasons.push(`faces away from its road (dot ${(d.fx * best.vx + d.fz * best.vz).toFixed(2)})`);
    }
    if (reasons.length) cat('door').push({ p, d: `${desc(p)}: ${reasons.join('; ')}`, x: d.x, z: d.z, depth: reasons.length });
  }
  // ── benches ──────────────────────────────────────────────────────────────
  for (const p of props) {
    if (!p.bench) continue;
    const fx = p.sy, fz = p.cy;   // makeBench: the seat looks down local +z (the back slat is at z=-0.36)
    for (const dd of [1.2, 2.0, 2.8]) {
      const px = p.cx + fx * dd, pz = p.cz + fz * dd; let hit = null;
      for (const q of near(px, pz, 1)) if (q !== p && !q.afloat && inRect(q, px, pz, 0.1)) { hit = q; break; }
      if (hit) { cat('bench').push({ p, d: `${desc(p)} faces ${desc(hit)} ${dd}u in front`, x: p.cx, z: p.cz, depth: +(3 - dd).toFixed(1) }); break; }
      if (!window.__insideIsland3(px, pz)) { cat('bench').push({ p, d: `${desc(p)} faces off the island ${dd}u in front`, x: p.cx, z: p.cz, depth: +(3 - dd).toFixed(1) }); break; }
    }
    let target = null;
    if (D.world === 'maple') for (const c of D.mapleCenters) {
      const dxs = c - p.cx, dzs = c - p.cz;
      if (Math.abs(dxs) < BENCH_NEAR && (!target || Math.abs(dxs) < target.d)) target = { d: Math.abs(dxs), vx: Math.sign(dxs), vz: 0, name: `road x=${c.toFixed(0)}` };
      if (Math.abs(dzs) < BENCH_NEAR && (!target || Math.abs(dzs) < target.d)) target = { d: Math.abs(dzs), vx: 0, vz: Math.sign(dzs), name: `road z=${c.toFixed(0)}` };
    }
    for (const rd of D.roads) { const n = nearestOnPath(p.cx, p.cz, rd.pts);
      if (n.d < BENCH_NEAR + rd.half && (!target || n.d < target.d)) { const l = Math.hypot(n.x - p.cx, n.z - p.cz) || 1; target = { d: n.d, vx: (n.x - p.cx) / l, vz: (n.z - p.cz) / l, name: rd.name }; } }
    if (target) { const dot = fx * target.vx + fz * target.vz; if (dot < -0.3) cat('benchaway').push({ p, d: `${desc(p)} back to ${target.name} (dot ${dot.toFixed(2)}, ${target.d.toFixed(1)}u off)`, x: p.cx, z: p.cz, depth: +(-dot).toFixed(2) }); }
  }
  for (const k of Object.keys(out.cats)) out.cats[k].sort((a, b) => b.depth - a.depth);
  for (const k of Object.keys(out.cats)) out.cats[k] = out.cats[k].map((o) => ({ d: o.d, x: o.x, z: o.z, depth: o.depth, ok: o.ok, road: o.road, i: o.p?.i, j: o.q?.i, qk: o.p?.qk, h: o.p?.h, r: o.p?.r, px: o.p?.x, pz: o.p?.z, ry: o.p?.ry, nv: o.p?.nv }));
  return out;
};

// ── the browser ─────────────────────────────────────────────────────────────
const SEED = process.env.SEED ? Number(process.env.SEED) : null;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const results = {};
let anyFail = false;
const FAIL_CATS = ['road', 'water', 'offisland', 'float', 'inside', 'overlap', 'roadend', 'door', 'bench'];
const ALL_CATS = ['road', 'water', 'offisland', 'overhang', 'float', 'sunk', 'inside', 'under', 'overlap', 'clutter', 'roadend', 'door', 'bench', 'benchaway', 'piste', 'ice'];
for (const wid of WORLDS) {
  const D = worldData(wid);
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  if (SEED !== null) {
    await p.addInitScript((seed) => {
      let a = (seed >>> 0) + 0x6D2B79F5;
      Math.random = () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    }, SEED);
  }
  await p.addInitScript(() => { try { localStorage.clear(); localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString()); localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder,skylark'); } catch { } });
  const t0 = Date.now();
  await p.goto(`http://127.0.0.1:${PORT}/?w=${wid}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  // the world a child plays is the world AFTER validateWorld() — the boot sweep that nudges props off roads,
  // culls off-island strays and (since round 5) retires footprints inside/through solids. Audit THAT world,
  // not the raw scatter: the first crew's after-table missed 278 retirements on Maple by counting before it.
  await p.evaluate(() => window.__validateWorld?.());
  const res = await p.evaluate(auditFn, Object.assign({}, D, { ROAD_LIP, FLOAT_TOL, SUNK_TOL, OVERLAP_TOL, DOOR_CLEAR, BENCH_NEAR, GROUND_H, DECK_BAND }));
  if (wid === 'maple' && res.benches === 0) { console.log(JSON.stringify(res.dbgBench)); throw new Error('placement.mjs: bench fingerprint found no benches on Maple — makeBench changed; fix the fingerprint'); }
  results[wid] = res;
  const rows = [];
  let worldFail = false;
  for (const k of ALL_CATS) {
    const list = res.cats[k] || [];
    const n = k === 'roadend' ? list.filter((o) => !o.ok).length : list.length;
    // Without a baseline the bar is zero, which is the honest bar and the one a
    // new world is held to. With one, the bar is what was already there.
    const cap = CEILING ? Number((CEILING[wid] || {})[k] || 0) : 0;
    const fail = FAIL_CATS.includes(k) && n > cap;
    if (fail) worldFail = true;
    const mark = fail ? 'FAIL' : !FAIL_CATS.includes(k) ? 'info'
      : n > 0 ? `held` : 'ok  ';
    rows.push(`   ${k.padEnd(10)} ${String(n).padStart(5)}${CEILING && FAIL_CATS.includes(k) ? '/' + String(cap).padStart(3) : '    '}  ${mark}  ${list.slice(0, k === 'roadend' ? 8 : 3).map((o) => o.d + (o.depth && k !== 'roadend' ? ` [${o.depth}]` : '')).join(' | ')}`);
  }
  console.log(`\n══ ${wid.toUpperCase()} ══  ${res.n} static props (${res.benches} benches, ${res.houses} houses w/ doors), audited in ${((Date.now() - t0) / 1000).toFixed(0)}s  ${worldFail ? 'FAIL' : 'PASS'}`);
  console.log(CEILING ? '   category      n/cap  verdict  worst' : '   category      n  verdict  worst');
  for (const r of rows) console.log(r);
  if (worldFail) anyFail = true;

  // ── photographs ─────────────────────────────────────────────────────────
  if (SHOTS) {
    fs.mkdirSync(SHOTS, { recursive: true });
    await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => { if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
    await p.evaluate(() => document.getElementById('btnPlay')?.click());
    await p.waitForTimeout(1400);
    await p.evaluate((w) => document.querySelector(`#worldRow .wCard[data-world="${w}"]`)?.click(), wid);
    await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout: 400000 });
    await p.evaluate(() => { const cv = document.querySelector('canvas'); cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: innerWidth / 2, clientY: innerHeight / 2, bubbles: true })); });
    await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 4.2, null, { timeout: 600000 });
    await p.evaluate(() => { const cv = document.querySelector('canvas'); for (const el of Array.from(document.body.children)) if (el !== cv && !el.contains(cv)) el.style.display = 'none'; });
    await p.evaluate(() => { window.__pinQuality?.(0); window.__setVoidR?.(2.2); window.__setMood?.('cruise'); window.__pinMouth?.(true); });
    // --pick=road:2,inside:1 chooses categories and per-category counts
    const pick = flags.pick ? Object.fromEntries(flags.pick.split(',').map((s) => { const [k, n] = s.split(':'); return [k, Number(n || SHOTS_PER_CAT)]; })) : null;
    const wanted = pick ? Object.keys(pick) : flags.cats ? flags.cats.split(',') : FAIL_CATS;
    // --spots=<json from an earlier run> photographs THAT run's offenders at
    // their coordinates on this build — the AFTER shot of a BEFORE spot
    const spots = flags.spots ? JSON.parse(fs.readFileSync(flags.spots, 'utf8'))[wid]?.cats || {} : null;
    for (const k of wanted) {
      const list = ((spots ? spots[k] : res.cats[k]) || []).filter((o) => k !== 'roadend' || !o.ok).slice(0, pick ? pick[k] : SHOTS_PER_CAT);
      for (let i = 0; i < list.length; i++) {
        const o = list[i];
        // stand the void 6 units toward the lens; the offender lands up-frame
        const sx = o.x + 6 * Math.SQRT1_2, sz = o.z + 6 * Math.SQRT1_2;
        const t1 = await p.evaluate(({ sx, sz }) => { window.__warpVoid(sx, sz); return window.__matchState().t; }, { sx, sz });
        await p.waitForFunction((t) => window.__matchState().t > t + 0.6, t1, { timeout: 120000 });
        await p.evaluate(({ sx, sz }) => { window.__warpVoid(sx, sz); }, { sx, sz });
        const t2 = await p.evaluate(() => window.__matchState().t);
        await p.waitForFunction((t) => window.__matchState().t > t + 0.25, t2, { timeout: 120000 });
        const scr = await p.evaluate(({ x, z, h }) => { const T = window.__THREE, c = window.__cam; const v = new T.Vector3(x, Math.min(2, (h || 1) / 2), z).project(c);
          return { px: (v.x + 1) / 2 * innerWidth, py: (1 - v.y) / 2 * innerHeight }; }, { x: o.x, z: o.z, h: o.h });
        const W = Number(flags.crop || 300), H = W;
        const clip = { x: Math.max(0, Math.min(430 - W, scr.px - W / 2)), y: Math.max(0, Math.min(932 - H, scr.py - H / 2)), width: W, height: H };
        const file = path.join(SHOTS, `${flags.tag ? flags.tag + '-' : ''}${wid}-${k}-${i}.png`);
        await p.screenshot({ path: file, clip });
        console.log(`   shot ${file}  <- ${o.d}  (screen ${scr.px.toFixed(0)},${scr.py.toFixed(0)})`);
      }
    }
  }
  await p.close();
}
await b.close();
if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify(results, null, 1));
// A BARE "PASS — " / "FAIL — " LINE, because that is what qa/gate.mjs's verdict
// matcher reads. It used to print "PLACEMENT PASS — ", which matches nothing,
// and a step whose verdict cannot be parsed cannot be registered.
console.log(`\nplacement bars: road lip ${ROAD_LIP}, float ${FLOAT_TOL}, buried top ${SUNK_TOL}, overlap ${OVERLAP_TOL}, door ${DOOR_CLEAR}, ground ${GROUND_H}`);
// A WORLD MISSING FROM THE BASELINE IS NOT A PASS BY DEFAULT — it is a world
// nobody has decided about. Ceilings are a deliberate act, so a new world must
// be added to the file by hand, at zero, by somebody who looked.
if (CEILING) {
  const unlisted = WORLDS.filter((w) => !(w in CEILING));
  if (unlisted.length) console.log(`\n   note: ${unlisted.join(', ')} ${unlisted.length > 1 ? 'are' : 'is'} not in the baseline, so the ceiling is zero everywhere — which is the bar for a new world.`);
  const frozen = WORLDS.reduce((a, w) => a + Object.values(CEILING[w] || {}).reduce((b, n) => b + Number(n), 0), 0);
  if (frozen) console.log(`   ${frozen} offender(s) held under a frozen ceiling from qa/placement.baseline.json — held, not fixed.`);
}
console.log(anyFail
  ? `FAIL — placement: ${WORLDS.join(',')} — props standing somewhere they did not earn`
  : `PASS — placement: ${WORLDS.join(',')} — every prop earns the spot it stands on`);
process.exit(anyFail ? 1 : 0);
