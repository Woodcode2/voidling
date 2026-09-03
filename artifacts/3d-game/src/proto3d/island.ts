// VOIDLING island — "MAPLE ISLE", ported from the 2D map into 3D.
// The ground is a top-down texture baked from the real 2D coordinate map (grass,
// biomes, roads, river, coast) so it reads exactly like the 2D game; it sits on
// a floating slab with cliff walls in cosmic space. Real 3D props (houses,
// towers, trees, palms, landmarks) are placed on top per the FIXED_PLAN biome
// grid. Moving life is added separately (./life).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { glossOf, registerGloss } from './gloss';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { WORLD, PROPS } from './palette';
import { glb, spawnBalloon, setBalloonHook, contactShadow, shouldCast } from './assets3d';
import * as BAY from './bay';
import * as GD from './gameday';
import * as LN from './lantern';
import * as PW from './powder';
import * as AL from './alpine';
import * as NM from './nightmarket';
import * as TG from './tailgate';
import * as LUXE from './luxe';
import * as MS from './mainstreet';   // MAPLE FALLS prop kit + its seeded RNG

export type Biome = 'cozy' | 'fancy' | 'downtown' | 'plaza' | 'park' | 'forest' | 'beach' | 'zoo' | 'airport' | 'military'
  | 'village' | 'lake' | 'pinewood' | 'piste' | 'lodge' | 'rim'   // POWDER PASS — all new words, no boundary renames
  // ── MAPLE FALLS (world 1): a small town mid-county-fair. `downtown`
  // is MAIN STREET, `plaza` is THE SQUARE, `cozy` is the (now small) suburb,
  // `beach` is LAKESIDE and `forest` is PINE WOODS — the names are kept
  // because ./life and ./prototype3d key crowd behaviour and district captions
  // off them. These four are new.
  | 'fair' | 'farm' | 'campus' | 'strip'
  // ── PIRATE BAY (world 2): a world-class tropical resort with a buccaneer
  // theme. Same 6x6 block grid and the same road network, but the "roads" are
  // BOARDWALKS and every district is a holiday.
  | 'port' | 'resort' | 'party' | 'market' | 'jungle' | 'cove'
  // ── GAME DAY (world 3): a fall Saturday in a college town, the whole place
  // out for the football game. The player spawns in the parking lot facing the
  // bowl and finishes by swallowing it.
  //
  // Deliberately NOT reusing 'plaza' or 'campus' even though the gate plaza and
  // the old campus would fit those words. ./life keys crowd behaviour, prop
  // sets and district captions off these literals, so sharing a name with
  // Maple's town square would drag a county fair into a football stadium.
  | 'bowl' | 'gate' | 'lot' | 'rvpark' | 'greek' | 'quad' | 'practice' | 'treeline'
  // ── LANTERN NIGHT (world 4): a spirit night market, the one night a year it
  // opens. A valley with a canal down it, stalls on both banks, and a bathhouse
  // lit at the top of a stair.
  //
  // Same rule as GAME DAY: no literal is shared with another world even where
  // the word would fit. 'gate' already belongs to the football ground and
  // 'garden' would have been fine, but ./life keys the crowd's voice, walking
  // speed and panic pool off these strings, and a shared name drags one world's
  // cast into another's street. Every one of these is new.
  | 'torii' | 'stalls' | 'canal' | 'teahouse' | 'shrine' | 'moonbridge'
  | 'nightgarden' | 'bathhouse' | 'onsen' | 'bamboo';
// RETIRED on Maple: 'military' (the army base served a defence layer that was
// deleted from the game), 'airport', 'zoo' and 'fancy'. The literals stay in
// the union only because ./life still compares against them; nothing in
// MAPLE_PLAN uses them and the bake + populate branches are gone.
export type WorldId = 'maple' | 'pirate' | 'gameday' | 'lantern' | 'powder';

export interface AddEdible { (mesh: THREE.Object3D, radius: number): void; }
export interface Island {
  spawn: { x: number; z: number };
  biomeAt(x: number, z: number): Biome | null;
  update(dt: number, t: number, cam?: THREE.Camera): void;
  setDusk(k: number): void;   // 0 = midday, 1 = full golden hour
  W: number;  // 3D world helper (world units -> 3D)
  /** This world's own painted sky, equirectangular. Handed back so the
   *  renderer can use it as the image-based light instead of a grey studio
   *  box — see the note where scene.environment is set. */
  skyTex: THREE.Texture;
}

// ── coordinate system ────────────────────────────────────────────────────────
const SCALE = 0.05;               // 1 3D unit = 20 world units
const CX = 6000, CZ = 6000;       // world centre
const w = (v: number) => (v - CX) * SCALE;   // world -> 3D (both axes share centre)
const wLen = (v: number) => v * SCALE;

// island silhouette control points (world)
const ISLAND_CTRL: [number, number][] = [
  [980, 3200], [580, 5900], [1000, 8900], [2100, 10950], [4500, 11550],
  [6600, 11650], [8300, 11350], [9800, 10150], [11400, 8700], [11550, 6200],
  [11050, 3750], [9350, 400], [6000, 150], [2600, 500],
];

// ══ MAPLE FALLS ═══════════════════════════════════════════════════════════
// 6x6 biome plan (rows = gy north->south, cols = gx west->east).
//
// The old plan was 14 of 36 cells of suburb (39% of the island, 61% of its
// props) with everything else a one-cell garnish. This one is a TOWN: nine
// districts, none over 17% of the grid, each big enough to be somewhere.
//
//   PINE WOODS  the north ridge and the campsite, thinning to the coast
//   THE FARM    bottomland along the river: barns, silos, the grain elevator
//   FAIRGROUNDS the Maple County Fair, out on the north-west flats
//   THE STRIP   the highway into town: gas, motel, drive-in, the twine ball
//   MAPLE HEIGHTS the suburb — now three blocks and a school, not the island
//   MAIN STREET two facing rows of storefronts down the road at x=6000
//   THE SQUARE  town hall, bandstand, war memorial, and the protest
//   THE PARK    the town green, the pond and nine holes of municipal golf
//   MAPLE FALLS HIGH  the school, the field, the bleachers, the band
//   LAKESIDE    the whole south shore
//
// Three cells are PINNED by staged vignettes in ./life, which this file does
// not own: (3,2) is the mayor's fair-opening speech so it must be the square,
// (4,0) is the campsite so it must be woods, (4,2) is the golf flag so it must
// be the park, (4,3) is the ball game so it must be the school field, (2,4) is
// the schoolhouse at recess so it must be the suburb, (2,5) is beach
// volleyball so it must be the shore — and ./life tethers wandering livestock
// to block (5,1) unconditionally, which is why the farm reaches it.
const MAPLE_PLAN: Biome[][] = [
  ['forest', 'forest', 'forest', 'farm', 'forest', 'forest'],
  ['fair', 'fair', 'fair', 'farm', 'farm', 'farm'],
  ['strip', 'cozy', 'downtown', 'plaza', 'park', 'park'],
  ['strip', 'cozy', 'downtown', 'downtown', 'campus', 'campus'],
  ['strip', 'cozy', 'cozy', 'cozy', 'campus', 'campus'],
  ['beach', 'beach', 'beach', 'beach', 'beach', 'beach'],
];
// PIRATE BAY — the resort reads north-to-south as ARRIVE -> PLAY -> PARTY:
// the working port and jungle up top, the resort and market in the middle,
// the dance floor and the beaches along the warm southern shore.
const PIRATE_PLAN: Biome[][] = [
  ['cove', 'jungle', 'port', 'port', 'jungle', 'cove'],
  ['jungle', 'resort', 'port', 'market', 'resort', 'jungle'],
  ['beach', 'resort', 'market', 'market', 'resort', 'jungle'],
  ['beach', 'resort', 'party', 'party', 'resort', 'beach'],
  ['beach', 'party', 'party', 'party', 'market', 'beach'],
  ['beach', 'beach', 'beach', 'beach', 'beach', 'cove'],
];
// GAME DAY's districts are polygon regions (see gameday.ts), not grid cells —
// this table exists only so callers that index PLAN[gy][gx] without asking
// which world they are in get a sane answer instead of undefined. It is a
// coarse map of the real layout: bowl north, plaza under it, the lot across the
// middle, RV row and frat row south, campus east, the tree line at the rim.
const GAMEDAY_PLAN: Biome[][] = [
  ['treeline', 'treeline', 'bowl', 'bowl', 'treeline', 'treeline'],
  ['treeline', 'bowl', 'bowl', 'bowl', 'bowl', 'quad'],
  ['practice', 'gate', 'gate', 'gate', 'quad', 'quad'],
  ['practice', 'lot', 'lot', 'lot', 'lot', 'quad'],
  ['rvpark', 'lot', 'lot', 'lot', 'lot', 'greek'],
  ['treeline', 'rvpark', 'rvpark', 'greek', 'greek', 'treeline'],
];
let WORLD_ID: WorldId = 'pirate';
let PLAN: Biome[][] = PIRATE_PLAN;
// pick the world BEFORE createIsland — the bake and populate both read it
export function setWorld(id: WorldId): void {
  WORLD_ID = id;
  // GAME DAY does not use the 6x6 block PLAN at all — its districts are
  // polygon regions sited by geography, the way Pirate Bay's are, so the grid
  // it carries is only there to satisfy callers that index PLAN blindly.
  // EXHAUSTIVE, so the compiler demands a row from world six — the ternary
  // chain this replaces is the silent-maple-fallback pattern that once had
  // GAME DAY announcing that MAPLE FALLS had been eaten (AAA-BRIEF §5.5).
  const PLANS: Record<WorldId, Biome[][]> = {
    maple: MAPLE_PLAN, pirate: PIRATE_PLAN, gameday: GAMEDAY_PLAN,
    lantern: MAPLE_PLAN,   // region-based; the grid only satisfies blind indexers
    powder: GAMEDAY_PLAN,  // same: powder is region-based (see pwRegionAt)
  };
  PLAN = PLANS[id];
}
export const worldId = (): WorldId => WORLD_ID;
setWorld('maple');   // default until the menu says otherwise
const BLOCK_ORIGIN = 925, STRIDE = 1710, BLOCK_SIZE = 1600;
const blockCenter = (g: number) => BLOCK_ORIGIN + STRIDE * g + BLOCK_SIZE / 2;

// deterministic edge-facing house lots — shared by the ground bake (driveways)
// and populate() (the houses themselves), so every house faces its road and
// every driveway actually reaches a house. World coordinates.
export interface HouseLot { x: number; y: number; rot: number; fx: number; fy: number; }  // f = front dir
export function houseLots(gx: number, gy: number): HouseLot[] {
  const cx = blockCenter(gx), cy = blockCenter(gy);
  // lot line inset from the block edge. 235 (was 190): the asphalt starts 190
  // world-units past the lot centre, and wide GLB houses at 190 read as
  // "sitting in the street" — every lot now sits a full car-length back
  const E = BLOCK_SIZE / 2 - 235;
  const lots: HouseLot[] = [];
  // dense hole.io-style subdivision: four lots per long row, three per side
  for (const k of [-1.5, -0.5, 0.5, 1.5]) {
    lots.push({ x: cx + k * 400, y: cy - E, rot: Math.PI, fx: 0, fy: -1 });   // north row → north road
    lots.push({ x: cx + k * 400, y: cy + E, rot: 0, fx: 0, fy: 1 });          // south row → south road
  }
  for (const k of [-1, 0, 1]) {
    lots.push({ x: cx - E, y: cy + k * 330, rot: -Math.PI / 2, fx: -1, fy: 0 });  // west edge
    lots.push({ x: cx + E, y: cy + k * 330, rot: Math.PI / 2, fx: 1, fy: 0 });    // east edge
  }
  return lots;
}
// deterministic backyard pool assignment (shared by bake + populate): fancy
// blocks give every third street-row lot a pool behind the house
export function lotPool(biome: Biome, li: number, lot: HouseLot): { x: number; y: number } | null {
  if (biome !== 'fancy' || lot.fy === 0 || li % 3 !== 1) return null;
  // pool sits DIRECTLY behind the house — the old +120 sideways shift pushed
  // the outermost lots' pools past the block edge into the cross street
  // (the "small lake in the road" bug)
  return { x: lot.x, y: lot.y - lot.fy * 300 };
}
const ROAD_CENTERS = [2580, 4290, 6000, 7710, 9420];

// ── MAPLE FALLS: the hand-surveyed heart of town (world units) ──────────────
// The Square is block (3,2) and it is the one place on the island whose
// geometry is fixed by hand rather than derived from the block grid, because
// three separate systems have to agree on it: the ground bake, the props in
// populate(), and ./life's mayoral rally — which stages itself at the block
// centre minus 12 units of z, i.e. world y = 4905, and which this file cannot
// move. So the town hall sits north of that line, its forecourt is the stage,
// and the green begins south of it.
const SQ_CX = 6855;                                   // Main Street's square, centre line
const SQ_HALL_Y = 4640;                               // town hall centre (facing south)
const SQ_RALLY_Y = 4905;                              // ./life's rally stage — do not build on it
const SQ_GREEN: [number, number, number, number] = [6240, 4980, 7470, 5880];   // x0,y0,x1,y1
const MAIN_ST_X = 6000;                               // Main Street's asphalt centreline
// THE OPENING. Hand-authored, fixed, identical every load: standing on the
// square's west walk on bright green grass (the player is 0x9a5cff — the one
// thing the ground here must not be is pale violet), with the town hall in
// shot to the north-east, the bandstand across the green, Main Street's
// shopfronts behind, and the parking-meter protest ten units away.
// Nudged +49, -10 map units (about 2.5 3D units, two void diameters) off the
// original point. MEASURED: with the void driven away and the vacated spot
// scanned, clearance at the old spawn was 0.08 units — the void's own body was
// touching the nearest solid prop, which is what "he starts on top of a person"
// looks like from the camera. The new point measures 2.1 units of clear ground
// and keeps the same view: town hall to the north-east, bandstand across the
// green, Main Street's shopfronts behind.
export const MAPLE_SPAWN: [number, number] = [6469, 5240];

/** The match's opening position in 3D, resolved for whichever world is loaded.
 *  Exported so the crowd can be kept out of it — see SPAWN_KEEP_OUT. */
export function spawn3(): { x: number; z: number } {
  if (WORLD_ID === 'gameday') return { x: w(GD.GD_SPAWN[0]), z: w(GD.GD_SPAWN[1]) };
  if (WORLD_ID === 'lantern') return { x: w(LN.LN_SPAWN[0]), z: w(LN.LN_SPAWN[1]) };
  if (WORLD_ID === 'powder') return { x: w(PW.PW_SPAWN[0]), z: w(PW.PW_SPAWN[1]) };
  return WORLD_ID === 'pirate'
    ? { x: w(6950), z: w(10560) }
    : { x: w(MAPLE_SPAWN[0]), z: w(MAPLE_SPAWN[1]) };
}
/** Nobody stands here. The opening frame is hand-authored and the void must
 *  arrive on clear ground, not inside somebody's shopping. */
export const SPAWN_KEEP_OUT = 4.2;
let _spawnCacheWorld = '';
let _spawnCache = { x: 0, z: 0 };
export function nearSpawn(x: number, z: number, pad = SPAWN_KEEP_OUT): boolean {
  // called once per placed person during the world build, so it caches rather
  // than allocating a vector each time
  if (_spawnCacheWorld !== WORLD_ID) { _spawnCacheWorld = WORLD_ID; _spawnCache = spawn3(); }
  const dx = x - _spawnCache.x, dz = z - _spawnCache.z;
  return dx * dx + dz * dz < pad * pad;
}

const RIVER: [number, number][] = [
  [8405, 1149], [8277, 3035], [8565, 5337], [8213, 6887], [8469, 8661], [9431, 9305], [9700, 9830], [9800, 10150],
];
const POND: [number, number, number] = [8565, 5337, 304];
// river x at a given world y (linear along the polyline) — bridges + banks
function riverXAtWorld(wy: number): number | null {
  for (let i = 0; i < RIVER.length - 1; i++) {
    const [x0, y0] = RIVER[i], [x1, y1] = RIVER[i + 1];
    if ((wy >= y0 && wy <= y1) || (wy >= y1 && wy <= y0)) {
      const t = (wy - y0) / ((y1 - y0) || 1);
      return x0 + t * (x1 - x0);
    }
  }
  return null;
}
const LAGOON = { x: 3675, y: 10307, rx: 832, ry: 608 };
const WATERFALL: [number, number] = [9800, 10150];

const rand = (a: number, b: number) => a + Math.random() * (b - a);
// A DETERMINISTIC ANGLE FROM A POSITION. Two constraints meet here and both are
// recorded elsewhere in this project: the town must look identical every load
// (the owner's call — "consistency is key here"), and mainstreet.ts:252 warns
// that adding a draw to the seeded stream "would shift every subsequent
// authored placement in Maple Falls". A hash of the coordinates satisfies both:
// it takes nothing from the stream, and the same prop in the same spot gets the
// same angle forever.
const spinFor = (x: number, z: number): number => {
  const s = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
  return (s - Math.floor(s)) * Math.PI * 2;
};
// Tag for a prop with NO FRONT — a bush, a boulder, a flower bed. Everything
// with a door, a face, a screen or a direction stays untagged and keeps the
// facing its call site authored.
const noFront = <T extends THREE.Object3D>(m: T): T => { m.userData.spin = 1; return m; };
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
// MAPLE FALLS is HAND-BUILT and the owner asked for the same crisp town every
// single load: its bake and its populate run off the seeded stream in
// ./mainstreet, never Math.random. (Pirate Bay keeps rand/pick above.)
const mr = MS.mr, mpick = MS.mpick, mrnd = MS.mrnd, mchance = MS.mchance;

// ── shared geometry helpers for ./life ─────────────────────────────────────────
export const worldTo3D = (v: number) => w(v);
export const worldLen = (v: number) => wLen(v);
export const ROAD_CENTERS_3D = ROAD_CENTERS.map((c) => w(c));
export const blockCenter3D = (gx: number, gy: number): [number, number] => [w(blockCenter(gx)), w(blockCenter(gy))];
export const PLAN_GRID = PLAN;
export const HALF_BLOCK_3D = wLen(BLOCK_SIZE / 2);

// train rail loop around downtown (corner-cut rectangle, world coords)
const RAIL_PTS: [number, number][] = [
  [4240, 2420], [7760, 2420], [7870, 2530], [7870, 7760],
  [7760, 7870], [4240, 7870], [4130, 7760], [4130, 2530],
];
const railCurve = new THREE.CatmullRomCurve3(
  RAIL_PTS.map(([x, y]) => new THREE.Vector3(w(x), 0, w(y))), true, 'catmullrom', 0.02,
);
export function railPointAt(t: number): { x: number; z: number; angle: number } {
  const u = ((t % 1) + 1) % 1;
  const p = railCurve.getPointAt(u);
  const tan = railCurve.getTangentAt(u);
  return { x: p.x, z: p.z, angle: Math.atan2(tan.x, tan.z) };
}

// smooth closed curve through control points (midpoint-quadratic, matches 2D)
function silhouetteWorld(steps = 10): [number, number][] {
  const P = ISLAND_CTRL, n = P.length, out: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const p0 = P[i], p1 = P[(i + 1) % n], p2 = P[(i + 2) % n];
    const m0 = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2];
    const m1 = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];
    for (let s = 0; s < steps; s++) {
      const t = s / steps, it = 1 - t;
      out.push([
        it * it * m0[0] + 2 * it * t * p1[0] + t * t * m1[0],
        it * it * m0[1] + 2 * it * t * p1[1] + t * t * m1[1],
      ]);
    }
  }
  return out;
}

// module-level silhouette polygon (world coords) + point-in-polygon test, so
// prop placement and movement respect the actual coastline, not just the grid
const MAPLE_SIL = silhouetteWorld(12);
// Pirate Bay has its OWN coastline — a hooked headland, not Maple's blob
// A CHAIN, not a ternary pair. Every one of these that stayed two-way handed
// the new world Maple's answer silently — which is exactly how GAME DAY once
// shipped announcing that MAPLE FALLS had gone.
const silPoly = (): [number, number][] =>
  (WORLD_ID === 'pirate' ? BAY.LAND_SMOOTH
    : WORLD_ID === 'gameday' ? GD.GD_LAND_SMOOTH
      : WORLD_ID === 'lantern' ? LN.LN_LAND_SMOOTH
        : WORLD_ID === 'powder' ? PW.PW_LAND_SMOOTH
          : MAPLE_SIL);
const SIL_POLY = MAPLE_SIL;   // legacy alias for the maple-only helpers below
/** THE ISLAND'S OUTLINE, in 3D coordinates, for whichever world is loaded.
 *  The minimap needs the real coastline — a circle would lie about Pirate Bay,
 *  which is a hook with the water on the inside. */
/** The island silhouette as world-space points. No live caller since the
 *  minimap was cut; kept because it is the only public description of the
 *  coastline and the next map feature will want it. */
export function islandOutline3(): [number, number][] {
  return silPoly().map(([wx, wy]) => [w(wx), w(wy)] as [number, number]);
}
function insideIslandWorld(wx: number, wy: number): boolean {
  // Pirate Bay: its own hooked coastline, and the BAY water is not land
  if (WORLD_ID === 'pirate') return BAY.onBayLand(wx, wy);
  if (WORLD_ID === 'gameday') return GD.onGameDayLand(wx, wy);
  if (WORLD_ID === 'lantern') return LN.onLanternLand(wx, wy);
  if (WORLD_ID === 'powder') return PW.onPowderLand(wx, wy);
  let inside = false;
  // indexed, not destructured — see the note on pointInPoly in bay.ts. Same
  // answers, 10x cheaper, and this runs thousands of times a frame.
  for (let i = 0, j = SIL_POLY.length - 1; i < SIL_POLY.length; j = i++) {
    const a = SIL_POLY[i], b = SIL_POLY[j];
    const xi = a[0], yi = a[1], xj = b[0], yj = b[1];
    if ((yi > wy) !== (yj > wy) && wx < ((xj - xi) * (wy - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
export const insideIsland3 = (x3: number, z3: number) => insideIslandWorld(x3 / SCALE + CX, z3 / SCALE + CZ);
/** POWDER PASS: is this 3D point on ICE (the frozen lake or the gritted
 *  road)? The physics reads it every frame to drop the steering convergence
 *  — ice is momentum, the first world where the CONTROL FEEL itself changes.
 *  False everywhere else, so the other four worlds cannot pay for it. */
export const onIce3 = (x3: number, z3: number): boolean =>
  WORLD_ID === 'powder' && PW.onIce(x3 / SCALE + CX, z3 / SCALE + CZ);
// lagoon membership (with a margin): roads, props and cars must never wade in
export function inLagoon3(x3: number, z3: number, margin = 120): boolean {
  const wx = x3 / SCALE + CX, wy = z3 / SCALE + CZ;
  const nx = (wx - LAGOON.x) / (LAGOON.rx + margin), ny = (wy - LAGOON.y) / (LAGOON.ry + margin);
  return nx * nx + ny * ny < 1;
}
/** IS THIS WATER? Maple Falls has a pond, a river and a lagoon, all of them
 *  INSIDE the coastline. `inMapleWater` — the authority every static prop is
 *  kept out of — lived as a local closure inside createIsland's populate pass,
 *  so nothing that MOVES ever consulted it. The only exported predicate was
 *  inLagoon3, which covers the lagoon and nothing else.
 *  Measured: 99.3-99.8% of the painted pond, river and lagoon surface passed
 *  the player's own walkability test at every radius, and a live run drove
 *  from the Maple spawn to 0.95 units off the exact centre of the pond in 8
 *  seconds without a single blocked frame. The rivals waded in too, and 62
 *  townsfolk spent a 90-second match standing in the river.
 *  One predicate, in 3D coordinates, for everything that moves. */
export function inWater3(x3: number, z3: number, margin = 0): boolean {
  if (WORLD_ID === 'pirate') return false;      // the bay is handled by the coastline itself
  // LANTERN NIGHT has no standing water at all. Its canal is ankle-deep and
  // walkable by design; falling through to Maple's pond and river here would
  // drop an invisible pond into the middle of the market.
  if (WORLD_ID === 'lantern') return false;
  // …AND GAME DAY, which has none either, and which nobody checked.
  //
  // gameday.ts says so in its own opening paragraph — "a broad flat PLATEAU
  // with nothing around it but woodland. There is no sea here, so there is no
  // water polygon" — and this function went on handing it MAPLE FALLS' pond
  // and lagoon anyway. Two invisible bodies of water, on painted grass, in the
  // middle of a stadium campus: a 39x39-unit no-go square in THE QUAD and an
  // 87x66 one out where Maple's lagoon is. That is the invisible wall reported
  // near a house on the third level.
  //
  // What makes this worth writing down is that the guard directly above was
  // added for LANTERN NIGHT with the comment "falling through to Maple's pond
  // and river here would drop an invisible pond into the middle of the
  // market" — the exact bug, correctly reasoned about, one world too late.
  // A new-world guard should have been a sweep of the existing ones.
  if (WORLD_ID === 'gameday') return false;
  // POWDER PASS: the lake is ICE — walkable ground painted as water, exactly
  // the lantern-canal design. Falling through to Maple's pond here is the
  // gameday bug again, and this time the sweep happened when the world landed.
  if (WORLD_ID === 'powder') return false;
  const wx = x3 / SCALE + CX, wy = z3 / SCALE + CZ;
  const mw = margin / SCALE;
  if (Math.hypot(wx - POND[0], wy - POND[1]) < POND[2] + mw) return true;
  const rx = riverXAtWorld(wy);
  if (rx != null && Math.abs(wx - rx) < 118 + mw) return true;
  return inLagoon3(x3, z3, 40);
}
/** …and the version for things that MOVE and are big enough to span a stream.
 *  Maple's river is 118 world units of water — under 6 units in 3D, narrower
 *  than the roads that bridge it, and the void is 32 units across at WORLD
 *  ENDER. Blocking it turned a decorative brook into an invisible wall down
 *  the middle of the map, and standing on the far bank unable to cross a
 *  stream you dwarf is the single most obviously wrong thing a hole can do.
 *  The pond and the lagoon are real bodies of water and still stop you; the
 *  river does not. Static props and the walking crowd keep using inWater3 —
 *  a townsperson standing mid-current is a different problem. */
export function inDeepWater3(x3: number, z3: number, margin = 0): boolean {
  if (WORLD_ID === 'pirate') return false;
  if (WORLD_ID === 'lantern') return false;     // the canal is shallow — see inWater3
  if (WORLD_ID === 'gameday') return false;     // no water on the plateau — see inWater3
  if (WORLD_ID === 'powder') return false;      // the lake is ice — see inWater3
  const wx = x3 / SCALE + CX, wy = z3 / SCALE + CZ;
  const mw = margin / SCALE;
  if (Math.hypot(wx - POND[0], wy - POND[1]) < POND[2] + mw) return true;
  return inLagoon3(x3, z3, 40);
}
// coast clearance: is this point at least `d` units from the void edge?
export function coastClear(x3: number, z3: number, d = 12): boolean {
  const len = Math.hypot(x3, z3) || 1;
  return insideIsland3(x3 + (x3 / len) * d, z3 + (z3 / len) * d);
}

// async ON PURPOSE: the world build is the boot's one remaining monolith, and
// the caller owns the loading cover. `onStage` is awaited at the build's seams
// so the cover can paint a stage label between chunks — see bootStage in
// prototype3d.ts, and the note there on why this buys responsiveness, not speed.
export async function createIsland(scene: THREE.Scene, addEdible: AddEdible,
                                   onStage?: (label: string) => Promise<void>): Promise<Island> {
  const breathe = async (l: string) => { if (onStage) await onStage(l); };
  // MAPLE FALLS is deterministic: reset the town's seeded stream before the
  // bake so the ground, and then the props, come out identical every load.
  if (WORLD_ID === 'maple') MS.resetMapleRng();
  const silW = silPoly();
  const sil3 = silW.map(([x, y]) => new THREE.Vector2(w(x), w(y)));   // active coastline, world-aware
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const p of sil3) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minZ = Math.min(minZ, p.y); maxZ = Math.max(maxZ, p.y); }
  const W3 = maxX - minX, H3 = maxZ - minZ;

  // the star shader's clock — ticked from update() so the field scintillates
  let starMatRef: THREE.ShaderMaterial | null = null;
  // ── THE SKY TRAVELS WITH THE CAMERA ──────────────────────────────────────
  // Stars and planets are CELESTIAL: they should not parallax as a void slides
  // across an island a few hundred units wide, and they must not fall out of
  // the frustum when it does. The camera's far plane is 1000 (prototype3d.ts's
  // PerspectiveCamera), the camera itself sits up to ~500 units from the origin
  // at VOID TITAN pull-back, and these bodies are 340-900 out — so a
  // world-fixed sky is clipped from half the island. Re-centring them on the
  // camera each frame fixes both at once: fixed direction, fixed distance, no
  // parallax, never clipped. It is what a skybox does, with depth still on so
  // the island occludes what is behind it.
  const skyBodies: { o: THREE.Object3D; dir: THREE.Vector3; d: number }[] = [];
  let starField: THREE.Points | null = null;
    // ── space backdrop ─────────────────────────────────────────────────────────
  // WHAT WAS HERE: scene.background = one flat colour, and a painted nebula
  // that swaps in from a CDN when it loads. Which means the sky is a SINGLE
  // FLAT FILL for the whole of the first load, on any connection where that
  // image is slow, and permanently anywhere it fails. The island floats in
  // front of a solid rectangle.
  //
  // So the fallback is no longer a colour, it is a painted sky of its own:
  // a vertical gradient from a deep horizon into a darker zenith, two soft
  // nebula clouds in the world's own hues, and a faint galactic band raked
  // across it. It costs one 1024px canvas at boot and it means this game never
  // shows a flat background, on any device, at any point in the load.
  const skyCanvas = (() => {
    // 2048 across, because this one texture is stretched over the ENTIRE sky —
    // it is the single most magnified image in the game.
    const c = document.createElement('canvas'); c.width = 2048; c.height = 1024;
    const g2 = c.getContext('2d')!;
    const base = new THREE.Color(WORLD.space);
    const hi = base.clone().offsetHSL(0.02, 0.10, 0.10);
    const lo = base.clone().offsetHSL(-0.02, 0.0, -0.035);
    const grad = g2.createLinearGradient(0, 0, 0, 1024);
    grad.addColorStop(0, `#${lo.getHexString()}`);
    grad.addColorStop(0.62, `#${base.getHexString()}`);
    grad.addColorStop(1, `#${hi.getHexString()}`);
    g2.fillStyle = grad; g2.fillRect(0, 0, 2048, 1024);
    // NEBULA. Wide, soft, low-alpha blobs in violet and teal, built additively
    // so they glow rather than smear. Two colours, not one: a single-hue cloud
    // reads as a stain on the gradient.
    g2.globalCompositeOperation = 'lighter';
    const cloud = (cx: number, cy: number, r: number, col: string, a: number) => {
      const rg = g2.createRadialGradient(cx, cy, 0, cx, cy, r);
      rg.addColorStop(0, col.replace('ALPHA', String(a)));
      rg.addColorStop(0.5, col.replace('ALPHA', String(a * 0.42)));
      rg.addColorStop(1, col.replace('ALPHA', '0'));
      g2.fillStyle = rg;
      g2.beginPath(); g2.ellipse(cx, cy, r, r * rand(0.5, 0.8), rand(0, 3.14), 0, Math.PI * 2); g2.fill();
    };
    for (let i = 0; i < 16; i++)
      cloud(rand(0, 2048), rand(120, 940), rand(240, 680), 'rgba(126,74,214,ALPHA)', rand(0.05, 0.12));
    for (let i = 0; i < 11; i++)
      cloud(rand(0, 2048), rand(160, 920), rand(180, 520), 'rgba(58,132,190,ALPHA)', rand(0.04, 0.09));
    for (let i = 0; i < 6; i++)
      cloud(rand(0, 2048), rand(240, 880), rand(140, 380), 'rgba(224,110,180,ALPHA)', rand(0.03, 0.07));
    // THE GALACTIC BAND: a raked run of dust that gives the sky a direction.
    // Without it a field of clouds has no composition, just texture.
    g2.save();
    g2.translate(1024, 576); g2.rotate(-0.26);
    for (let i = 0; i < 130; i++) {
      const x = rand(-1280, 1280);
      const y = rand(-1, 1) * 92 * (1 - Math.abs(x) / 1560);
      cloud(x, y, rand(68, 240), 'rgba(186,166,255,ALPHA)', rand(0.020, 0.050));
    }
    // dust motes ON the band — what makes it read as stars too far away to
    // resolve rather than as fog
    for (let i = 0; i < 9000; i++) {
      const x = rand(-1280, 1280);
      const spreadY = 88 * (1 - Math.abs(x) / 1560);
      const y = (Math.random() + Math.random() + Math.random() - 1.5) * spreadY;
      g2.fillStyle = `rgba(214,200,255,${rand(0.05, 0.24).toFixed(2)})`;
      g2.fillRect(x, y, 1, 1);
    }
    g2.restore();
    g2.globalCompositeOperation = 'source-over';
    // ── AND THE GRAIN, which is not decoration ────────────────────────────
    // A photograph of the generated texture showed a fine ORDERED LATTICE
    // across the whole sky. It is not a bug in the art — it is Chromium's
    // dither on the canvas gradient, which is invisible at 1:1 and becomes a
    // grid the moment the image is stretched across an entire sky sphere.
    //
    // The fix is the thing the art wanted anyway: random grain at about the
    // dither's own amplitude. Ordered patterns are visible BECAUSE they are
    // ordered; noise of the same magnitude destroys the regularity and reads
    // as film grain, which is what every real photograph of a nebula has.
    // Drawn as one 256px tile through createPattern rather than two million
    // fillRects, so it costs nothing at boot.
    {
      const nt = document.createElement('canvas'); nt.width = nt.height = 256;
      const ng = nt.getContext('2d')!;
      const img = ng.createImageData(256, 256);
      for (let i = 0; i < img.data.length; i += 4) {
        const v = 118 + Math.random() * 20;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = 255;
      }
      ng.putImageData(img, 0, 0);
      const pat = g2.createPattern(nt, 'repeat')!;
      g2.globalCompositeOperation = 'overlay';
      g2.globalAlpha = 0.5;
      g2.fillStyle = pat; g2.fillRect(0, 0, 2048, 1024);
      g2.globalAlpha = 1;
      g2.globalCompositeOperation = 'source-over';
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.mapping = THREE.EquirectangularReflectionMapping;
    return t;
  })();
  scene.background = skyCanvas;
  scene.backgroundIntensity = 1.0;
  // ── EVERY WORLD OWNS ITS OWN SKY AND ITS OWN AIR ─────────────────────────
  // One nebula PNG and one fog colour used to serve all four worlds — the
  // purest form of the uniformity that reads as cheap (AAA-BRIEF §2.5): four
  // different lighting rigs under literally the same heavens. Exhaustive
  // record on purpose: the compiler demands a row from every future world.
  //   hue/sat   a canvas-filter tint applied to the shared painting at load —
  //             four authored skies from one asset, no new downloads
  //   fog       the world's own air, replacing the one shared `space` colour;
  //             near/far kept wide so big-void pull-back views stay clear
  //   bgI       how loud the sky is against this world's exposure
  // ── AND THE HUE ROTATION DID NOT DO WHAT ITS COMMENTS SAID ───────────────
  // The old rows read `hue: 145 // swung to sea-teal` and `hue: 95 // aurora
  // greens`. Photographed, Pirate's sky was dark BROWN and Powder's was dark
  // MAGENTA — verified by eye at qa/out/space/ before this change, and both are
  // plainly wrong against their own posters.
  //
  // The cause is that CSS `hue-rotate` is not an HSL rotation. It is the SVG
  // luminance-preserving linear matrix, and on a base as saturated as this
  // painting's violet it drives a channel negative, which the 8-bit canvas
  // clamps to zero: 83% of Pirate's pixels and 78% of Game Day's came out of
  // the matrix with a channel simply deleted. That is why they landed on hues
  // nobody chose, and no choice of angle avoids it.
  //
  // So the tint is a canvas 'color' composite instead: it takes hue and
  // saturation from the fill and LUMINOSITY from the painting underneath, which
  // is exactly the operation "four authored skies from one asset" was always
  // reaching for. The nebula keeps its structure and takes the world's colour.
  // Alpha under 1 leaves some of the original hue variation alive, which is how
  // Powder keeps a hint of aurora rather than becoming one flat blue.
  const SKY_MOOD: Record<WorldId, { tint: string; tintA: number; fog: number; bgI: number }> = {
    maple:   { tint: '#7a4ad6', tintA: 0.00, fog: 0x1b1038, bgI: 0.55 },   // the reference violet — untouched
    pirate:  { tint: '#2f9fb5', tintA: 0.80, fog: 0x0e2237, bgI: 0.60 },   // sea-teal, daylit
    // GAME DAY WAS THE ONE WORLD NOBODY PHOTOGRAPHED, and it was the worst of
    // the five: flat bright magenta at the coast with not one star in it.
    // Measured against Maple at the same camera — true black 1% against 25%,
    // and with the halo hidden 11% against 44%. The starfield is ADDITIVE, so a
    // sky that never reaches black cannot show a star: the points were there
    // and drowned. 0.34, and a tint pulled down in lightness so the same
    // painting lands where the other four do.
    gameday: { tint: '#7a2b52', tintA: 0.70, fog: 0x241120, bgI: 0.34 },   // magenta dusk over the lot
    lantern: { tint: '#3f45a8', tintA: 0.70, fog: 0x171d40, bgI: 0.46 },   // deep indigo night
    // the poster set this look, not the other way round: blue winter dusk,
    // aurora greens in the sky, warm windows against the snow. 0.62 so the
    // painting's own greens survive the tint as aurora rather than being
    // flattened into one blue.
    powder:  { tint: '#4a7fd0', tintA: 0.62, fog: 0x1a2742, bgI: 0.46 },
  };
  const MOOD = SKY_MOOD[WORLD_ID];
  scene.fog = new THREE.Fog(MOOD.fog, 420, 1500);
  // Higgsfield-painted nebula sky — swaps in when it loads (the painted sky
  // above stays if it does not).
  new THREE.TextureLoader().load('/assets/hf/hf_20260717_021720_8d012b94-ca33-49d6-9db7-237b607fe3da.png', (skyTex) => {
    // THE SKY IS A DOME, NOT A STICKER. Without `.mapping` three renders a
    // background texture as a screen-locked viewport quad — the camera swung
    // and pulled from ~50 to 340 units across a match and the sky never
    // moved a pixel, the loudest "free web game" signal in the frame. The
    // canvas fallback above always had the correct mapping, so the sky was a
    // dome for the first few hundred milliseconds and became a wallpaper the
    // moment the real painting arrived. Equirect mapping restores parallax;
    // the per-world hue swing is baked here once at load, off the hot path.
    // …and cropped to exactly 2:1 on the way (the painting is 3168×1344,
    // 2.36:1, and an off-ratio equirect stretches the projection). Cropping
    // here instead of re-encoding the asset keeps the repo bytes untouched.
    const src = skyTex.image as HTMLImageElement;
    const outW = Math.min(src.width, src.height * 2);
    const c2 = document.createElement('canvas');
    c2.width = outW; c2.height = src.height;
    const g3 = c2.getContext('2d')!;
    g3.drawImage(src, (src.width - outW) / 2, 0, outW, src.height, 0, 0, outW, src.height);
    // hue and saturation from the fill, luminosity from the painting — see the
    // note on SKY_MOOD above for why this is not a hue-rotate any more
    if (MOOD.tintA > 0) {
      g3.globalCompositeOperation = 'color';
      g3.globalAlpha = MOOD.tintA;
      g3.fillStyle = MOOD.tint;
      g3.fillRect(0, 0, outW, src.height);
      g3.globalAlpha = 1;
      g3.globalCompositeOperation = 'source-over';
    }
    const t = new THREE.CanvasTexture(c2);
    t.colorSpace = THREE.SRGBColorSpace;
    t.mapping = THREE.EquirectangularReflectionMapping;
    scene.background = t;
    scene.backgroundIntensity = MOOD.bgI;
  });

    // ── THE STARFIELD ──────────────────────────────────────────────────────────
  // WHAT WAS HERE: 900 points, one size, one colour, one opacity, no motion.
  // Every star in the sky identical — which is the one thing a real sky never
  // is. A night sky reads because of MAGNITUDE (a few bright, very many faint)
  // and because of COLOUR TEMPERATURE (blue-white through white to amber), and
  // it is alive because stars scintillate.
  //
  // All three, in one draw call, from one small shader: per-star size, per-star
  // colour, per-star twinkle phase and rate. PointsMaterial cannot vary size
  // per point, which is why it looked like this.
  {
    // 5000, not 1500. The visible band is about 15 degrees wide by 32 tall —
    // roughly 1.2% of the sphere — so 1500 stars put about seventeen on screen,
    // which photographs as a handful of specks rather than as a sky. One draw
    // call either way.
    const N = 5000;
    const pos = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);
    const siz = new Float32Array(N);
    const pha = new Float32Array(N);
    const c3 = new THREE.Color();
    for (let i = 0; i < N; i++) {
      // ── AND THE WHOLE FIELD WAS OUTSIDE THE FRUSTUM ──────────────────────
      // Everything below this line — the magnitude curve, the colour
      // temperatures, the two-sine twinkle — was authored carefully and had
      // never been seen. `ph` ran to `Math.PI * 0.6`, which stops 18 degrees
      // ABOVE level, and the `* 0.7` squash with the `- 40` offset flattened
      // what was left into a disc hanging over the island.
      //
      // THE STEADY-STATE camera in this game only ever looks DOWN: pitched 46
      // degrees at spawn and 65 by VOID TITAN, on a 32-degree lens, so the
      // highest thing on screen is about 30 degrees BELOW the horizontal and
      // the lowest is about 81 below. ("About 27" stood here and in the
      // PLANETS note below and was wrong by three degrees: measured on the
      // settled frames in qa/out/opening/, the frame top is -29.88 to -29.90
      // in all five worlds at spawn radius.)
      //
      // THIS SENTENCE USED TO END "The horizon is never in frame in any world
      // at any size." That is true of steady-state play and FALSE of the shot
      // the match opens on, and it stood here, in the PLANETS note below and
      // in the owner's answer sheet until somebody stepped the establishing
      // shot frame by frame. Intro frame 1 sits at pitch 11.9 in Lantern, 13.1
      // in Pirate, 15.2 in Game Day, 15.3 in Powder and 46.2 in Maple, which
      // has no landmark to pan from — so in FOUR worlds of five the top of the
      // frame is 0.7 to 4.1 degrees ABOVE the horizon, and in those four the
      // horizon is on screen for the first ~0.06-0.08 seconds of the match. The
      // band the INTRO shows is +4 to -28 degrees; the steady-state band
      // described above is -30 to -81. A claim about what can be seen in this
      // game has to say which of the two cameras it means, and over what radius
      // range. Frames and numbers:
      // docs/crews/round-3/opening-beat.proposal.md, qa/out/opening/.
      // Projected against the real frustum at real game states, the old
      // distribution put ZERO of 1500 stars on screen at every size a match
      // actually passes through.
      //
      // So the shell is a shell again — no squash, no offset — and `ph` runs
      // past level to 171 degrees, which lays stars through the entire band the
      // camera can see. They sit below and beside the island, which is also the
      // truthful arrangement: this is a rock floating in space, and you should
      // be able to look over its edge and see stars underneath it.
      const r = rand(340, 620), th = rand(0, Math.PI * 2), ph = rand(0.15, Math.PI * 0.95);
      pos[i * 3] = Math.cos(th) * Math.sin(ph) * r;
      pos[i * 3 + 1] = Math.cos(ph) * r;
      pos[i * 3 + 2] = Math.sin(th) * Math.sin(ph) * r;
      // MAGNITUDE: a power curve, so most stars are faint and a handful blaze.
      // Uniform sizes are what made the old field read as noise.
      const m = Math.pow(Math.random(), 3.2);
      siz[i] = 1.0 + m * 6.0;
      // COLOUR TEMPERATURE, weighted the way a real field is: mostly white,
      // a cool blue majority among the rest, a few warm ones for contrast.
      const t = Math.random();
      if (t < 0.55) c3.setHSL(0.62, rand(0.10, 0.30), rand(0.82, 0.98));       // blue-white
      else if (t < 0.82) c3.setHSL(0.72, rand(0.12, 0.34), rand(0.78, 0.95));  // violet-white
      else if (t < 0.94) c3.setHSL(0.10, rand(0.30, 0.55), rand(0.76, 0.92));  // amber
      else c3.setHSL(0.50, rand(0.20, 0.40), rand(0.80, 0.95));                // a few teal
      col[i * 3] = c3.r; col[i * 3 + 1] = c3.g; col[i * 3 + 2] = c3.b;
      pha[i] = rand(0, Math.PI * 2);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(siz, 1));
    g.setAttribute('aPhase', new THREE.BufferAttribute(pha, 1));
    starMatRef = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uPix: { value: Math.min(2, window.devicePixelRatio || 1) } },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `
        attribute vec3 aColor; attribute float aSize; attribute float aPhase;
        uniform float uTime; uniform float uPix;
        varying vec3 vCol; varying float vTw;
        void main() {
          vCol = aColor;
          // TWINKLE: two sines an irrational ratio apart, so the field never
          // pulses in unison — one rate and every star breathes together, which
          // reads as a flicker bug rather than as a sky.
          float tw = 0.72 + 0.28 * (0.6 * sin(uTime * 1.7 + aPhase)
                                  + 0.4 * sin(uTime * 2.61803 + aPhase * 1.7));
          vTw = tw;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = aSize * uPix * tw;
        }`,
      fragmentShader: `
        varying vec3 vCol; varying float vTw;
        void main() {
          // a soft round core with a wide faint halo — a hard disc reads as a
          // sprite, this reads as a point of light
          vec2 d = gl_PointCoord - vec2(0.5);
          float r = length(d) * 2.0;
          float core = smoothstep(1.0, 0.0, r);
          float halo = smoothstep(1.0, 0.25, r) * 0.5;
          float a = clamp(core * core + halo, 0.0, 1.0) * vTw;
          if (a < 0.01) discard;
          gl_FragColor = vec4(vCol, a);
        }`,
    });
    starField = new THREE.Points(g, starMatRef);
    starField.frustumCulled = false;   // its bounding sphere is centred where it no longer is
    scene.add(starField);
  }

  // ── PLANETS ────────────────────────────────────────────────────────────────
  // The owner: "Would be cool to see some planets or something. Something
  // different for each level maybe."
  //
  // WHERE THEY CAN GO IS NOT A TASTE QUESTION, AND THE ANSWER HAS TWO CAMERAS.
  // In STEADY-STATE play the camera is pitched 46 degrees down at spawn and 65
  // by VOID TITAN, on a 32-degree lens, so the visible elevation band runs from
  // about -30 degrees at the top of the frame (measured -29.9; the "-27" this
  // line used to carry is a third error nobody caught) to about -81 at the
  // bottom, and the horizon is not on screen at any radius a match passes
  // through. A planet placed level with the island, or above it, is geometry
  // nobody will ever see IN PLAY — so these sit BELOW and BESIDE, between -56
  // and -77 degrees. THAT RANGE IS WRITTEN DOWN THREE TIMES IN THIS FILE AND NO
  // TWO AGREED: this line said "-34 and -62", which describes nothing in the
  // file; the note at :827 says "-57 and -75", which is a degree or two out;
  // the SKIES table is the authority and it runs -56 to -77.
  //
  // THE INTRO IS A DIFFERENT CAMERA AND NONE OF THIS IS ON SCREEN IN IT. The
  // establishing shot opens at pitch 11.9-15.3 along azimuth 178-192, not 225,
  // so its frame covers +4 to -28 degrees of elevation inside a 15-degree
  // azimuth slot that misses the planet slot entirely. Projected through the
  // real camera at intro frame 1: ZERO of the eight planets in the four worlds
  // that have an establishing pan are on screen — NDC x -3.2 to -6.5, NDC y
  // -3.8 to -11.6, three to six frame-widths to the side and four to twelve
  // frame-heights below — while 28 to 41 of the 5000 stars are inside the
  // frustum. Maple's giant IS in the frustum and is behind the island, whose
  // opening frame contains no sky at all. Measured in
  // docs/crews/round-3/opening-beat.proposal.md.
  //
  // SPRITES, NOT SPHERES. At 600-900 units a lit sphere and a painted disc are
  // indistinguishable, and a sphere would need its own light: the scene's sun
  // is aimed at the island, so a real sphere out here would be lit from the
  // wrong side or not at all. Painting the terminator into the texture puts the
  // light exactly where the art wants it, costs one draw call, and lets a ring
  // be painted in the same pass instead of modelled.
  //
  // `fog: false` for the same reason the background carries it: fog is the
  // island's air, and these are not in it. Without it Powder's planet turns
  // the fog's slate blue at exactly the distance it sits.
  //
  // Authored, not seeded — `rand()` here is Math.random, so a seeded planet
  // would move every load. Every number below is a decision.
  {
    type Body = { d: number; el: number; az: number; size: number; hue: string;
      dark: string; ring?: string; bands?: number; glow: string };
    // ── WHERE THE CAMERA ACTUALLY LOOKS ────────────────────────────────────
    // The first placement scattered these around the compass and photographed
    // an empty sky. The camera's view azimuth is not free: camOffset keeps its
    // x and z equal at every void size (0.62/0.62 at spawn, 0.45/0.45 at VOID
    // TITAN), so the rig sits on the 45-degree diagonal and always looks back
    // along 225 degrees. And in portrait the horizontal field is about 15
    // degrees. So the window a planet can occupy is 225 +/- 7 degrees — a slot,
    // not a sky. Everything below is placed in it.
    //
    // AND THE SIZES ARE SET AGAINST THE PORTRAIT FRAME, NOT THE LENS. The
    // first set was authored for the 32-degree VERTICAL field and made discs of
    // 18-20 degrees, which sounded bold. A phone held upright has a HORIZONTAL
    // field of about 15 degrees — 2*atan(tan(16deg) * 430/932) — so an
    // 18-degree planet does not sit in the sky, it IS the sky: measured at
    // 58.3% of the frame, wall to wall. These are 7-8 degrees for the giants
    // and 2-3 for the moons, which reads as a body in the distance rather than
    // as a backdrop. Photographed at qa/out/space/ before and after.
    //
    // AND THE PAIR IS SPREAD TO OPPOSITE CORNERS OF THE WINDOW. Whether a
    // given patch of sky is on screen depends on where the coast is relative to
    // the rig, which changes as a child moves around the island — so a body
    // parked in the middle of the window is behind the island as often as not.
    // One high and to one side, one low and to the other, so the sky has
    // something in it from more of the shoreline. This is a placement that
    // wants measuring across several positions, not one screenshot; the planet
    // A/B in qa/skypop.mjs is what does that.
    //
    // Elevation is the free axis, and it is where the variety goes. At the
    // sizes where space is actually on screen the camera is at its steepest and
    // the visible band runs about -50 to -81 degrees, so these sit between -57
    // and -75: below the island's edge, which is the only place you can see
    // past it from up here.
    const AZ = 3.927;   // 225 degrees, the direction the rig always faces
    const SKIES: Record<WorldId, Body[]> = {
      // a warm amber giant low over the maples, and one small cold moon
      maple: [
        { d: 760, el: -56, az: AZ - 0.11, size: 116, hue: '#f0a85a', dark: '#2a1330', bands: 5, glow: '#ffcf8a' },
        { d: 620, el: -76, az: AZ + 0.11, size: 34, hue: '#cfd6ff', dark: '#1a1b3a', glow: '#aab4ff' },
      ],
      // a banded teal world with a ring, out over the open water
      pirate: [
        { d: 820, el: -57, az: AZ + 0.11, size: 143, hue: '#5fd8c8', dark: '#0b2a3a', ring: '#bff3ea', bands: 4, glow: '#8ff0e2' },
        { d: 660, el: -76, az: AZ - 0.11, size: 32, hue: '#ffe6a8', dark: '#3a2a10', glow: '#fff0c8' },
      ],
      // a hot magenta dusk giant over the parking lot, and a pale companion
      gameday: [
        { d: 700, el: -56, az: AZ + 0.11, size: 115, hue: '#ff7ac0', dark: '#3a0f38', bands: 6, glow: '#ffb0dc' },
        { d: 900, el: -77, az: AZ - 0.11, size: 49, hue: '#ffd9a0', dark: '#332012', glow: '#ffe9c8' },
      ],
      // a red lantern of a moon, and a distant violet companion
      lantern: [
        // #ff8a6a photographed as a salmon balloon. At that lightness the
        // painted terminator has nowhere to fall to, so the disc reads flat and
        // lit from nowhere. A deeper body in the same hue keeps the lantern red
        // and gives the shading somewhere to go.
        { d: 640, el: -56, az: AZ - 0.11, size: 98, hue: '#c9563f', dark: '#1e0713', glow: '#e8836a' },
        { d: 880, el: -76, az: AZ + 0.11, size: 58, hue: '#c9a6ff', dark: '#1d1440', glow: '#e0c9ff' },
      ],
      // an ice world with a bright ring, to match the aurora the poster set
      powder: [
        { d: 780, el: -57, az: AZ + 0.11, size: 136, hue: '#bfe6ff', dark: '#122844', ring: '#eaf7ff', bands: 3, glow: '#dff2ff' },
        { d: 660, el: -76, az: AZ - 0.11, size: 32, hue: '#9fe8d0', dark: '#0f2e2a', glow: '#c8f4e6' },
      ],
    };
    // THE RING WAS CUT BY THE CANVAS. The disc is painted at R = 0.40 S, and the
    // ring's three arcs run out to 1.64 R plus half a line — 274, 305 and 336 px
    // on a 512 canvas whose half-width is 256. So on every ringed world (Pirate,
    // Powder) the ring's far reaches were sliced flat by the sprite's own square,
    // which is exactly what the owner saw: "like an image was half cut and put on
    // there" (2026-09-03, qa/skycut.mjs). The disc now sits at R = 0.29 S so the
    // widest ring arc ends at 0.49 S, inside the square with a margin, and the
    // sprite is scaled by DISC_FIT so the body keeps the on-screen size the
    // SKIES table was tuned for. S goes to 640 so the disc keeps its pixels.
    const DISC_R = 0.29, DISC_FIT = 0.40 / DISC_R;
    const paint = (bd: Body) => {
      const S = 640, c = document.createElement('canvas'); c.width = c.height = S;
      const g = c.getContext('2d')!;
      const R = S * DISC_R, cx = S / 2, cy = S / 2;
      // the ring goes down FIRST for its back half, then again after the disc
      const ringPass = (front: boolean) => {
        if (!bd.ring) return;
        g.save(); g.translate(cx, cy); g.rotate(-0.34); g.scale(1, 0.26);
        for (let k = 0; k < 3; k++) {
          g.beginPath();
          g.arc(0, 0, R * (1.34 + k * 0.15), front ? 0 : Math.PI, front ? Math.PI : Math.PI * 2);
          g.lineWidth = R * (0.10 - k * 0.022);
          g.strokeStyle = bd.ring + (front ? 'cc' : '77');
          g.stroke();
        }
        g.restore();
      };
      ringPass(false);
      // the body: lit from upper-left, falling to a dark limb — a terminator
      // painted rather than lit, so the light is where the art put it
      const lit = g.createRadialGradient(cx - R * 0.42, cy - R * 0.40, R * 0.06, cx, cy, R);
      lit.addColorStop(0, bd.hue);
      lit.addColorStop(0.58, bd.hue);
      lit.addColorStop(1, bd.dark);
      g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.closePath();
      g.save(); g.clip();
      g.fillStyle = lit; g.fillRect(0, 0, S, S);
      // BANDS. Clipped to the disc and squashed, so they curve with the body
      // instead of reading as stripes on a sticker.
      if (bd.bands) {
        g.globalAlpha = 0.16; g.globalCompositeOperation = 'overlay';
        for (let k = 0; k < bd.bands; k++) {
          const t = (k + 0.5) / bd.bands;
          g.fillStyle = k % 2 ? bd.dark : '#ffffff';
          g.beginPath();
          g.ellipse(cx, cy - R + t * R * 2, R * 1.05, R * (0.10 + 0.05 * Math.sin(t * 3.1)), 0, 0, Math.PI * 2);
          g.fill();
        }
        g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      }
      g.restore();
      ringPass(true);
      // ATMOSPHERE. A thin outer glow, additive, which is what separates a
      // planet from a coloured circle at this size.
      const at = g.createRadialGradient(cx, cy, R * 0.92, cx, cy, R * 1.16);
      at.addColorStop(0, bd.glow + '00');
      at.addColorStop(0.35, bd.glow + '55');
      at.addColorStop(1, bd.glow + '00');
      g.globalCompositeOperation = 'lighter';
      g.fillStyle = at; g.beginPath(); g.arc(cx, cy, R * 1.16, 0, Math.PI * 2); g.fill();
      g.globalCompositeOperation = 'source-over';
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;   // sRGB bytes in a canvas; say so
      return t;
    };
    for (const bd of SKIES[WORLD_ID] ?? []) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({
        map: paint(bd), transparent: true, depthWrite: false, fog: false,
      }));
      const e = bd.el * Math.PI / 180;
      sp.position.set(Math.cos(e) * Math.cos(bd.az) * bd.d, Math.sin(e) * bd.d,
        Math.cos(e) * Math.sin(bd.az) * bd.d);
      sp.scale.set(bd.size * DISC_FIT, bd.size * DISC_FIT, 1);   // see DISC_FIT: the disc, not the canvas, is bd.size
      sp.renderOrder = -1;   // behind the island's own transparent work
      // TAGGED, so a probe never has to guess which sprites these are. The
      // heuristic it replaces — a 512px map, parented to the Scene, scaled past
      // 20 — found 2 in Maple and 25 in Game Day, whose stadium carries sprites
      // matching all three. Art identified by its shape eventually collides
      // with other art the same shape; a tag cannot.
      sp.userData.planet = true;
      skyBodies.push({ o: sp, dir: sp.position.clone().normalize(), d: bd.d });
      scene.add(sp);
    }
  }

  // ── THE VIOLET HALO, WHICH WAS EATING SPACE ────────────────────────────────
  // The owner: "the background of the space/galaxy is like this weird faded
  // color. It should pop. It doesn't give me the illusion this is in space."
  // This plane was most of it, and the measurement is unambiguous. At the coast
  // with a big void, sky is 44% of the frame; qa/skypop.mjs read it three ways
  // in the same session, by hiding and restoring the plane in the live scene:
  //
  //     as shipped     sat 0.485   luminance range 0.294   1% true black
  //     halo hidden    sat 0.862   luminance range 0.063   95% true black
  //
  // A wash that turns a 95%-black sky into a 1%-black one is not a rim light,
  // it is a lid. Two things were wrong with it.
  //
  // THE COLOUR SPACE. `new THREE.CanvasTexture(cv)` sets none, and three's
  // Texture constructor defaults to NoColorSpace, so `rgba(168,123,255)` was
  // handed to the shader as LINEAR (0.659, 0.482, 1.000) with no sRGB decode —
  // 1.7x too much red and 2.4x too much green, added on top of a sky whose own
  // value is around 0.01. This repo already has this exact bug written up at
  // the shade()/tint() helpers below: "the round trip through the transfer
  // curve eats most of the change". Same trap, different direction.
  //
  // THE REACH. The plane was 2.1x the island — about 1207 units — with full
  // alpha out to ~283 units, and the coast is at ~272. So it covered the whole
  // of the only region where space is ever on screen. It is now 1.35x with the
  // inner stop pulled out, so full alpha ends AT the coast and the falloff is
  // done a little past it: an edge glow on the island rather than a fog over
  // the sky behind it.
  //
  // It is tightened rather than deleted deliberately. palette.ts calls it "wide
  // violet energy halo off the island edge" and it is the 3D descendant of the
  // 2D game's sticker rim — it is what stops the island reading as a flat
  // cutout pasted on a flat sky. The job was never to remove it.
  {
    const cv = document.createElement('canvas'); cv.width = cv.height = 512;
    const g = cv.getContext('2d')!;
    const grd = g.createRadialGradient(256, 256, 211, 256, 256, 256);
    grd.addColorStop(0, 'rgba(168,123,255,0.16)');
    grd.addColorStop(0.55, 'rgba(123,79,224,0.06)');
    grd.addColorStop(1, 'rgba(123,79,224,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 512, 512);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;   // see above — this was the 1.7-2.4x
    const halo = new THREE.Mesh(
      new THREE.PlaneGeometry(Math.max(W3, H3) * 1.15, Math.max(W3, H3) * 1.15),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    halo.rotation.x = -Math.PI / 2; halo.position.y = -3;
    halo.position.x = (minX + maxX) / 2; halo.position.z = (minZ + maxZ) / 2;
    scene.add(halo);
  }

    // ── baked ground texture ───────────────────────────────────────────────────
  const TEX = 3072;   // high-res bake so roads/crosswalks stay crisp up close
  const cv = document.createElement('canvas'); cv.width = cv.height = TEX;
  const g = cv.getContext('2d')!;
  const px = (x3: number) => ((x3 - minX) / W3) * TEX;
  const py = (z3: number) => ((z3 - minZ) / H3) * TEX;
  const pxW = (worldX: number) => px(w(worldX));
  const pyW = (worldY: number) => py(w(worldY));
  const hex = (n: number) => '#' + n.toString(16).padStart(6, '0');

  // clip to the island silhouette so everything is masked to the coast
  g.save();
  g.beginPath();
  g.moveTo(px(sil3[0].x), py(sil3[0].y));
  for (const p of sil3) g.lineTo(px(p.x), py(p.y));
  g.closePath();
  g.clip();

  // base grass
  g.fillStyle = hex(WORLD.meadow); g.fillRect(0, 0, TEX, TEX);
  // subtle grass mottling
  for (let i = 0; i < 4000; i++) {
    g.fillStyle = Math.random() < 0.5 ? 'rgba(120,201,78,0.16)' : 'rgba(255,255,255,0.035)';
    const x = Math.random() * TEX, y = Math.random() * TEX, r = rand(2, 6);
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }

  // ══ POWDER PASS BAKE ═══════════════════════════════════════════════════
  // Snow is the easiest ground in the game to get wrong: flat white reads as
  // a blank canvas, not a place. Three things carry it — BLUE shadow (snow
  // in dusk light is never white), the lake's cracked teal (the poster's
  // centrepiece), and the worn tracks of a village that was mid-snow-day
  // when the void arrived: a gritted road, a trampled piste, sled lines.
  if (WORLD_ID === 'powder') {
    const ppath = (pts: PW.Pt[], close = false) => {
      g.beginPath();
      g.moveTo(pxW(pts[0][0]), pyW(pts[0][1]));
      for (const [x, y] of pts) g.lineTo(pxW(x), pyW(y));
      if (close) g.closePath();
    };
    const PU = (pxW(1000) - pxW(0)) / 1000;   // canvas px per world unit

    // 1. BASE — dusk snow: pale blue-white, never pure white
    g.fillStyle = '#dfe7f6'; g.fillRect(0, 0, TEX, TEX);
    for (let i = 0; i < 3600; i++) {
      const x = Math.random() * TEX, y = Math.random() * TEX;
      g.fillStyle = Math.random() < 0.6 ? 'rgba(150,175,220,0.10)' : 'rgba(255,255,255,0.16)';
      g.beginPath(); g.arc(x, y, rand(3, 10), 0, Math.PI * 2); g.fill();
    }
    // 1b. WIND. Snow's texture is not speckle, it is DIRECTION: the wind that
    // dropped it leaves long shallow ridges — sastrugi — all lying on one
    // bearing, each with a blue lee shadow and a bright windward crest. That
    // pairing is what makes a snowfield read as a SURFACE rather than as
    // paper, and it is the one thing a radial blob cannot do.
    //
    // Step 1 above was the only grain in this whole bake — 3,600 soft arcs at
    // alpha 0.10-0.16, about 5% coverage — and everything after it is a REGION
    // fill: the rim stroke, the pinewood floor, the village floor, the lodge
    // apron. Those separate districts; none of them can put information inside
    // one. Pirate Bay's step 4b lays 13,000 hard chips and 9,000 directional
    // strokes over its island for exactly this reason and says so in its own
    // title. Powder had no equivalent pass at all.
    //
    // THE SIZES ARE DERIVED, AND THEY ARE IN DEVICE PIXELS, which is the space
    // mip selection and a phone's own pixel grid live in. (Quoting this in css
    // px — as this patch was first filed — halves every texel-per-pixel figure
    // and doubles every apparent size. renderer.setPixelRatio caps at PR_TOP =
    // 2, prototype3d.ts:140.) PW_LAND is 5,900 x 9,500 world units at
    // SCALE 0.05, so this 3072px bake covers a 295 x 475-unit bowl and one
    // canvas px is 0.096 scene units in x; on the 32-degree lens at pixelRatio
    // 2 the camera shows 125 device px per scene unit at camDist 26 and 9.6 at
    // the 340 clamp. So, measured off those two numbers:
    //   ridge width  3-7 canvas px = 0.29-0.67 units = 2.8-6.4 device px at
    //                the 340 clamp and 36-84 at 26 — it resolves across the
    //                WHOLE follow range, where the x140 speckle layer is
    //                already at 6.35 texels per device px by 340.
    //   ridge length 40-190 canvas px = 3.8-18.2 units = 97-460 device px at
    //                the R=4 camera (camDist 129).
    //   chip         1-3.4 canvas px = 0.9-3.1 device px at the clamp, 12-41
    //                at the tightest. Hard edges for the near camera, where a
    //                soft blob is a smudge and the eye has nothing to catch on.
    //
    // Zero triangles, zero draw calls, zero seeded draws: `rand` at :268 is
    // Math.random, this block is inside `WORLD_ID === 'powder'`, and there is
    // not one mrnd/mr/mpick/mchance in the Powder bake — so Maple Falls'
    // mulberry32 stream cannot move. It does spend 91,800 more Math.random
    // calls, counted off the code below: 9 per ridge x 5,200 and 5 per chip
    // x 9,000. That stream is unseeded, so Powder's layout already differs on
    // every load and qa/determ.mjs reads "DIFFERS — reseeds" either side.
    // 19,400 canvas ops against Pirate Bay's 22,000, on a canvas that is
    // already being painted.
    //
    // NO CLIP PATH, for the reason step 4b gives: clipping tens of thousands
    // of tiny ops against the coastline took that bake from milliseconds to
    // minutes in a software rasteriser, and texels outside the coastline are
    // never sampled because the ground mesh IS the silhouette.
    const WIND = -0.55;                      // one bearing for the whole valley
    // SAVE/RESTORE, because lineCap LEAKS: step 2's rim stroke and step 4's
    // piste both run off whatever this pass leaves set, and step 4b of the
    // Pirate bake is a live example of a grain pass changing it for everything
    // painted after it.
    g.save();
    g.lineCap = 'round';
    for (let i = 0; i < 5200; i++) {
      const x = Math.random() * TEX, y = Math.random() * TEX;
      const L = rand(40, 190), a = WIND + rand(-0.22, 0.22);
      const dx = Math.cos(a), dy = Math.sin(a);
      g.strokeStyle = `rgba(126,152,198,${(0.05 + Math.random() * 0.09).toFixed(3)})`;
      g.lineWidth = rand(3, 7);
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + dx * L, y + dy * L); g.stroke();
      const o = rand(3, 7), ox = -dy * o, oy = dx * o;     // the crest, across the ridge
      g.strokeStyle = `rgba(255,255,255,${(0.06 + Math.random() * 0.10).toFixed(3)})`;
      g.lineWidth = rand(2, 4);
      g.beginPath(); g.moveTo(x + ox, y + oy); g.lineTo(x + dx * L + ox, y + dy * L + oy); g.stroke();
    }
    // 1c. CRUST CHIPS — the only high-frequency thing on this ground.
    for (let i = 0; i < 9000; i++) {
      const x = Math.random() * TEX, y = Math.random() * TEX;
      g.fillStyle = Math.random() < 0.5 ? 'rgba(122,148,196,0.13)' : 'rgba(255,255,255,0.15)';
      g.fillRect(x, y, 1 + Math.random() * 2.4, 1 + Math.random() * 2.4);
    }
    g.restore();
    // 2. RIM SHADE — the mountain walls throw the bowl's edge into blue
    {
      const ring = PW.PW_LAND_SMOOTH;
      ppath(ring as PW.Pt[], true);
      g.save();
      g.clip();
      g.strokeStyle = 'rgba(92,116,176,0.34)';
      g.lineWidth = 900 * PU;
      ppath(ring as PW.Pt[], true); g.stroke();
      g.strokeStyle = 'rgba(92,116,176,0.22)';
      g.lineWidth = 1700 * PU;
      ppath(ring as PW.Pt[], true); g.stroke();
      g.restore();
    }
    // 3. THE PINEWOOD floor — needled snow, a touch green-grey
    {
      const wood = PW.PW_REGIONS.find((r) => r.id === 'pinewood');
      if (wood) { ppath(wood.poly, true); g.fillStyle = 'rgba(118,142,132,0.30)'; g.fill(); }
    }
    // 4. THE HOME RUN — trampled piste, faintly darker, with sled lines
    ppath(PW.PISTE);
    g.strokeStyle = 'rgba(178,194,226,0.55)'; g.lineWidth = PW.PISTE_HALF * 2 * PU;
    g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke();
    for (let i = -2; i <= 2; i++) {
      g.strokeStyle = 'rgba(130,150,196,0.30)'; g.lineWidth = 3;
      g.save(); g.translate(i * 60 * PU, 0); ppath(PW.PISTE); g.stroke(); g.restore();
    }
    // 5. THE GRIT ROAD — Old Bess's route, brown-grey over the white
    ppath(PW.GRIT);
    g.strokeStyle = '#9a938c'; g.lineWidth = PW.GRIT_HALF * 2 * PU; g.stroke();
    ppath(PW.GRIT);
    g.strokeStyle = 'rgba(122,110,96,0.5)'; g.lineWidth = PW.GRIT_HALF * 1.2 * PU; g.stroke();
    // 6. THE LAKE — the poster's cracked teal ice
    {
      const L = PW.LAKE;
      g.save();
      g.translate(pxW(L.cx), pyW(L.cy));
      g.scale(L.rx * PU, L.ry * PU);
      const grd = g.createRadialGradient(0, 0, 0.15, 0, 0, 1);
      grd.addColorStop(0, '#8fd0e8');
      grd.addColorStop(0.72, '#5fa8cf');
      grd.addColorStop(1, '#cfdff0');
      g.beginPath(); g.arc(0, 0, 1, 0, Math.PI * 2);
      g.fillStyle = grd; g.fill();
      g.restore();
      // cracks: pale jagged polylines radiating off-centre, like the poster
      g.strokeStyle = 'rgba(226,244,252,0.75)'; g.lineWidth = 3.5; g.lineCap = 'round';
      for (let c2 = 0; c2 < 9; c2++) {
        const a0 = (c2 / 9) * Math.PI * 2 + rand(-0.3, 0.3);
        let cx2 = pxW(L.cx) + Math.cos(a0) * L.rx * PU * rand(0.05, 0.25);
        let cy2 = pyW(L.cy) + Math.sin(a0) * L.ry * PU * rand(0.05, 0.25);
        g.beginPath(); g.moveTo(cx2, cy2);
        let ang = a0;
        for (let seg = 0; seg < 5; seg++) {
          ang += rand(-0.55, 0.55);
          cx2 += Math.cos(ang) * L.rx * PU * rand(0.1, 0.22);
          cy2 += Math.sin(ang) * L.ry * PU * rand(0.1, 0.22);
          g.lineTo(cx2, cy2);
        }
        g.stroke();
      }
    }
    // 7. THE VILLAGE floor — packed snow, warmed by the windows above it
    {
      const vil = PW.PW_REGIONS.find((r) => r.id === 'village');
      if (vil) { ppath(vil.poly, true); g.fillStyle = 'rgba(226,214,206,0.28)'; g.fill(); }
    }
    // 8. THE LODGE apron — swept stone
    {
      const L = PW.LODGE;
      g.save();
      g.translate(pxW(L.cx), pyW(L.cy));
      g.scale(L.rx * PU * 0.8, L.ry * PU * 0.8);
      g.beginPath(); g.arc(0, 0, 1, 0, Math.PI * 2);
      g.fillStyle = 'rgba(150,150,164,0.42)'; g.fill();
      g.restore();
    }
  }

  // ══ PIRATE BAY BAKE ═══════════════════════════════════════════════════
  // A whole different island: no block fills, no road grid, no driveways.
  // Sand everywhere, the bay cut out of it, organic district floors, one
  // curving promenade and a jungle trail.
  const BAY_R = (id: string) => BAY.BAY_REGIONS.find((r) => r.id === id)!;
  if (WORLD_ID === 'pirate') {
    const wpath = (pts: [number, number][], close = true) => {
      g.beginPath();
      g.moveTo(pxW(pts[0][0]), pyW(pts[0][1]));
      for (const [x, y] of pts) g.lineTo(pxW(x), pyW(y));
      if (close) g.closePath();
    };
    const opath = (pts: [number, number][]) => {
      g.beginPath();
      g.moveTo(pxW(pts[0][0]), pyW(pts[0][1]));
      for (let i = 1; i < pts.length - 1; i++) {
        const a2 = pts[i], b2 = pts[i + 1];
        g.quadraticCurveTo(pxW(a2[0]), pyW(a2[1]), pxW((a2[0] + b2[0]) / 2), pyW((a2[1] + b2[1]) / 2));
      }
      const L = pts[pts.length - 1]; g.lineTo(pxW(L[0]), pyW(L[1]));
    };
    // 1. base sand across the whole landmass, with a sun-bleached gradient
    g.fillStyle = '#f2e2b8'; g.fillRect(0, 0, TEX, TEX);
    for (let k = 0; k < 900; k++) {   // grain
      const x = Math.random() * TEX, y = Math.random() * TEX;
      g.fillStyle = `rgba(${208 + ((Math.random() * 30) | 0)},${190 + ((Math.random() * 26) | 0)},140,0.16)`;
      g.beginPath(); g.arc(x, y, rand(2, 7), 0, Math.PI * 2); g.fill();
    }
    // 1b. THE ISLAND IS NOT A SAND DISC. A real tropical island reads as a
    // green interior with a bright sand rim wherever it meets water — the
    // coast AND the bay. Canvas can't inset a polygon, so the bands are built
    // by stroking the two rings inward under a land clip: lush core first,
    // then dry scrub, then the beach on top.
    {
      // no clip: the bay is carved out of this AFTER the tint pass, and texels
      // beyond the coastline are never sampled (the ground mesh is the
      // silhouette). Clipping ~1200 ops against the 186-vertex coast cost more
      // than every other step of the bake put together.
      g.save();
      g.lineJoin = 'round'; g.lineCap = 'round';
      g.fillStyle = '#7fb85c'; g.fillRect(0, 0, TEX, TEX);           // lush core
      // dappled canopy over the core so it isn't a flat green field
      g.fillStyle = 'rgba(46,110,62,0.20)';
      for (let k = 0; k < 260; k++) {
        g.beginPath();
        g.ellipse(pxW(rand(1700, 10400)), pyW(rand(600, 10900)),
          pxW(rand(160, 520)) - pxW(0), pxW(rand(120, 400)) - pxW(0), rand(0, 3), 0, Math.PI * 2);
        g.fill();
      }
      // sun-bleached scrub band between the green and the sand
      for (const [ring, wdt] of [[BAY.LAND_SMOOTH, 3000], [BAY.WATER_SMOOTH, 2700]] as [[number, number][], number][]) {
        wpath(ring); g.strokeStyle = '#bfcb7e'; g.lineWidth = pxW(wdt) - pxW(0); g.stroke();
      }
      g.fillStyle = 'rgba(168,182,106,0.28)';
      for (let k = 0; k < 160; k++) {
        g.beginPath();
        g.ellipse(pxW(rand(1700, 10400)), pyW(rand(600, 10900)),
          pxW(rand(120, 380)) - pxW(0), pxW(rand(90, 280)) - pxW(0), rand(0, 3), 0, Math.PI * 2);
        g.fill();
      }
      // the beach itself — bright sand wherever the land touches water
      for (const [ring, wdt] of [[BAY.LAND_SMOOTH, 1500], [BAY.WATER_SMOOTH, 1350]] as [[number, number][], number][]) {
        wpath(ring); g.strokeStyle = '#f2e2b8'; g.lineWidth = pxW(wdt) - pxW(0); g.stroke();
      }
      // damp sand right at the tideline
      for (const [ring, wdt] of [[BAY.LAND_SMOOTH, 420], [BAY.WATER_SMOOTH, 360]] as [[number, number][], number][]) {
        wpath(ring); g.strokeStyle = 'rgba(216,196,150,0.55)'; g.lineWidth = pxW(wdt) - pxW(0); g.stroke();
      }
      // wind-blown grain over everything
      for (let k = 0; k < 700; k++) {
        g.fillStyle = `rgba(${196 + ((Math.random() * 40) | 0)},${186 + ((Math.random() * 40) | 0)},${130 + ((Math.random() * 40) | 0)},0.13)`;
        g.beginPath(); g.arc(Math.random() * TEX, Math.random() * TEX, rand(2, 7), 0, Math.PI * 2); g.fill();
      }
      // the north headland is HIGH and ROCKY — a slate cap so the island has
      // a top end that isn't just more beach
      g.fillStyle = 'rgba(122,128,140,0.40)';
      for (const [hx, hy, rx, ry] of [[5600, 1250, 1500, 620], [7050, 1500, 900, 480], [3550, 1650, 800, 430]] as [number, number, number, number][]) {
        g.beginPath(); g.ellipse(pxW(hx), pyW(hy), pxW(rx) - pxW(0), pxW(ry) - pxW(0), 0.1, 0, Math.PI * 2); g.fill();
      }
      g.restore();
    }
    const DCOL: Record<string, string> = {
      port: '#b58a52', oldtown: '#e6d9c4', resort: '#ffcf8a', party: '#5e2f72',
      beach: '#ffe6a8', cove: '#c39a4e', jungle: '#2f7a4a', market: '#e5a942',
    };
    // 3. THE BAY — sheltered water carved out, with a shallow shelf + foam
    g.save(); wpath(BAY.WATER_SMOOTH); g.clip();
    g.fillStyle = '#43cfdd'; g.fillRect(0, 0, TEX, TEX);
    g.fillStyle = 'rgba(31,136,168,0.6)';
    g.beginPath(); g.ellipse(pxW(7100), pyW(7000), pxW(1450) - pxW(0), pxW(2050) - pxW(0), 0.3, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.16)';
    for (let k = 0; k < 40; k++) {
      g.beginPath(); g.ellipse(pxW(rand(5300, 9500)), pyW(rand(3800, 9900)), pxW(rand(60, 190)) - pxW(0), pxW(rand(18, 46)) - pxW(0), rand(0, 3), 0, Math.PI * 2); g.fill();
    }
    g.restore();
    wpath(BAY.WATER_SMOOTH); g.strokeStyle = 'rgba(255,246,214,0.85)'; g.lineWidth = pxW(90) - pxW(0); g.stroke();
    // 2b. DISTRICT FLOORS — painted AFTER the bay is cut and clipped to LAND,
    // so a shoreline district (the dance cove on the hook) is never drowned
    for (const r of BAY.BAY_REGIONS) {
      g.save();
      wpath(BAY.LAND_SMOOTH); g.clip();          // land only
      wpath(BAY.smoothPoly(r.poly, 5)); g.clip();  // ...inside this region
      // erase the bay from the region before filling it
      g.fillStyle = DCOL[r.id] ?? '#f2e2b8';
      g.fillRect(0, 0, TEX, TEX);
      g.restore();
      // re-cut the water over the region edge so the shore stays crisp
      g.save(); wpath(BAY.WATER_SMOOTH); g.clip();
      g.fillStyle = 'rgba(67,207,221,0.96)'; g.fillRect(0, 0, TEX, TEX);
      g.restore();
    }
    wpath(BAY.WATER_SMOOTH); g.strokeStyle = 'rgba(255,246,214,0.85)'; g.lineWidth = pxW(90) - pxW(0); g.stroke();
    // 3b. per-district detail — canopy dapple, the lit dance floor, the
    // resort's pools and raked sand. This MUST come after the district
    // floors above: those are an opaque fill and were erasing all of it.
    {
      const jr = BAY.BAY_REGIONS.find((r) => r.id === 'jungle')!;
      g.save(); wpath(BAY.smoothPoly(jr.poly, 5)); g.clip();
      // A FLAT FILL ENDS IN A HARD ALPHA STEP. One of these ellipses spans 13
      // to 30 world units, and at the closest gameplay camera that is 500 to
      // 1160 pixels on a phone — so the player can be entirely inside one
      // canopy patch and read nothing but its edge crossing the frame. A
      // radial falloff removes the edge without touching the tonal range, and
      // the dapple has to stay: with it gone the jungle floor goes flat.
      for (let k = 0; k < 60; k++) {
        const ex = pxW(rand(2600, 5300)), ey = pyW(rand(3000, 7100));
        const rx = pxW(rand(130, 300)) - pxW(0), ry = pxW(rand(100, 240)) - pxW(0);
        const grd = g.createRadialGradient(ex, ey, 0, ex, ey, Math.max(rx, ry));
        grd.addColorStop(0, 'rgba(18,62,38,0.40)');
        grd.addColorStop(0.55, 'rgba(18,62,38,0.30)');
        grd.addColorStop(1, 'rgba(18,62,38,0)');
        g.fillStyle = grd;
        g.beginPath();
        g.ellipse(ex, ey, rx, ry, rand(0, 3), 0, Math.PI * 2);
        g.fill();
      }
      g.restore();
      const pr = BAY.BAY_REGIONS.find((r) => r.id === 'party')!;
      g.save(); wpath(BAY.smoothPoly(pr.poly, 5)); g.clip();
      const cell = 175;
      for (let iy = 0; iy < 16; iy++) for (let ix = 0; ix < 18; ix++) {
        const x = 5950 + ix * cell, y = 9900 + iy * cell;
        g.fillStyle = (ix + iy) % 2 === 0 ? 'rgba(255,120,200,0.62)' : 'rgba(90,200,255,0.5)';
        g.fillRect(pxW(x), pyW(y), pxW(cell) - pxW(0), pxW(cell) - pxW(0));
      }
      // the dance floor needs an EDGE, not a crop line: the checkerboard used
      // to terminate against the void wherever the region met the coast
      wpath(BAY.smoothPoly(pr.poly, 5));
      g.strokeStyle = '#f0e2c4'; g.lineWidth = pxW(120) - pxW(0); g.stroke();
      g.strokeStyle = 'rgba(255,120,220,0.85)'; g.lineWidth = pxW(38) - pxW(0); g.stroke();
      g.restore();
      // the resort's pools + raked sand
      g.save(); wpath(BAY.smoothPoly(BAY_R('resort').poly, 5)); g.clip();
      // pale stone pool DECKS only — the water is real geometry now, and a
      // painted puddle underneath it just peeked out at the edges
      for (const [ox, oy, rr] of [[8900, 4900, 470], [9050, 6300, 430]] as [number, number, number][]) {
        g.fillStyle = '#f8efd8';
        g.beginPath(); g.ellipse(pxW(ox), pyW(oy), pxW(rr) - pxW(0), pxW(rr * 0.72) - pxW(0), 0.62, 0, Math.PI * 2); g.fill();
        g.fillStyle = 'rgba(214,190,140,0.35)';
        g.beginPath(); g.ellipse(pxW(ox), pyW(oy), pxW(rr) - pxW(0), pxW(rr * 0.72) - pxW(0), 0.62, 0, Math.PI * 2);
        g.lineWidth = pxW(22) - pxW(0); g.strokeStyle = 'rgba(214,190,140,0.45)'; g.stroke();
      }
      g.strokeStyle = 'rgba(214,190,140,0.4)'; g.lineWidth = Math.max(1, pxW(9) - pxW(0));
      for (let k = 3300; k < 7400; k += 105) {
        g.beginPath(); g.moveTo(pxW(8150), pyW(k)); g.lineTo(pxW(9700), pyW(k + 60)); g.stroke();
      }
      g.restore();
    }
    // 4. surf ring on the OUTER coast
    wpath(BAY.LAND_SMOOTH); g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = pxW(120) - pxW(0); g.stroke();
    // 4b. FINE GRAIN. The bake covers 12000 world units, so a flat district
    // fill reads as painted card at street zoom — where the player actually
    // is. This is a high-frequency speck + tuft pass laid down after the
    // district floors, so it textures every one of them regardless of colour,
    // and before the boardwalk so the planks stay crisp.
    //
    // NO CLIP PATH. Clipping 25k tiny ops against the 186-vertex coastline
    // took the bake from milliseconds to minutes in software rasterisers.
    // Texels outside the coastline are never sampled (the ground mesh IS the
    // silhouette), so the only thing that must be rejected is the bay — and a
    // point-in-polygon test in JS costs nothing next to a canvas clip.
    {
      const inBay = (wx: number, wy: number) => BAY.pointInPoly(wx, wy, BAY.WATER_SMOOTH);
      for (let k = 0; k < 13000; k++) {
        const wx = rand(1500, 10600), wy = rand(400, 11000);
        if (inBay(wx, wy)) continue;
        g.fillStyle = Math.random() < 0.5 ? 'rgba(28,24,16,0.11)' : 'rgba(255,250,232,0.13)';
        g.fillRect(pxW(wx), pyW(wy), 1 + Math.random() * 2.2, 1 + Math.random() * 2.2);
      }
      g.lineCap = 'round';
      g.lineWidth = Math.max(1, pxW(11) - pxW(0));
      // grass tufts inland; the beach band gets wind ripples in the sand instead
      for (let k = 0; k < 9000; k++) {
        const wx = rand(1500, 10600), wy = rand(400, 11000);
        if (inBay(wx, wy)) continue;
        const d2 = BAY.distToCoast(wx, wy);
        const grass = d2 > 700;
        if (!grass && d2 > 900) continue;
        const a2 = rand(0, Math.PI * 2), L = grass ? rand(26, 62) : rand(40, 120);
        g.strokeStyle = grass
          ? (Math.random() < 0.5 ? 'rgba(28,82,44,0.42)' : 'rgba(176,222,132,0.40)')
          : 'rgba(202,176,124,0.34)';
        g.beginPath();
        g.moveTo(pxW(wx), pyW(wy));
        g.lineTo(pxW(wx + Math.cos(a2) * L), pyW(wy + Math.sin(a2) * L));
        g.stroke();
      }
    }
    // 5. THE PROMENADE — BLEACHED teak with pale seams and a painted edge board.
    // It used to be #c79350 with dark seams: a saturated mud-tan, the single
    // largest surface in the level and the muddiest colour in it. A luxury
    // boardwalk is pale, edged and repetitive.
    g.lineCap = 'round'; g.lineJoin = 'round';
    // the jungle trail goes down FIRST: it starts on the promenade's centreline
    // (bay.ts TRAIL[0]) and the deck must cover its round cap, not the reverse
    opath(BAY.TRAIL); g.strokeStyle = 'rgba(206,178,124,0.8)'; g.lineWidth = pxW(BAY.TRAIL_HALF * 2) - pxW(0); g.stroke();
    opath(BAY.PROMENADE); g.strokeStyle = '#fdf3de'; g.lineWidth = pxW(BAY.PROM_HALF * 2 + 150) - pxW(0); g.stroke();
    opath(BAY.PROMENADE); g.strokeStyle = '#efe0c2'; g.lineWidth = pxW(BAY.PROM_HALF * 2) - pxW(0); g.stroke();
    g.strokeStyle = 'rgba(198,176,138,0.55)'; g.lineWidth = Math.max(1, pxW(9) - pxW(0));
    for (let t = 0; t < 1; t += 0.005) {
      const a2 = BAY.pathPointAt(BAY.PROMENADE, t);
      const nx = Math.cos(a2.ang + Math.PI / 2), ny = Math.sin(a2.ang + Math.PI / 2);
      g.beginPath();
      g.moveTo(pxW(a2.x - nx * BAY.PROM_HALF), pyW(a2.y - ny * BAY.PROM_HALF));
      g.lineTo(pxW(a2.x + nx * BAY.PROM_HALF), pyW(a2.y + ny * BAY.PROM_HALF));
      g.stroke();
    }
    // the two painted edge boards that give it a definite edge
    for (const side of [-1, 1]) {
      g.beginPath();
      for (let t = 0; t <= 1.0001; t += 0.004) {
        const a2 = BAY.pathPointAt(BAY.PROMENADE, Math.min(0.9999, t));
        const nx = Math.cos(a2.ang + Math.PI / 2) * side, ny = Math.sin(a2.ang + Math.PI / 2) * side;
        const px2 = pxW(a2.x + nx * (BAY.PROM_HALF - 18)), py2 = pyW(a2.y + ny * (BAY.PROM_HALF - 18));
        if (t === 0) g.moveTo(px2, py2); else g.lineTo(px2, py2);
      }
      g.strokeStyle = '#ffffff'; g.lineWidth = pxW(34) - pxW(0); g.stroke();
    }
    // 6. piers into the water — pale decking to match
    g.strokeStyle = '#efe0c2'; g.lineWidth = pxW(150) - pxW(0);
    for (const [x0, y0, x1, y1] of BAY.PIERS) {
      g.beginPath(); g.moveTo(pxW(x0), pyW(y0)); g.lineTo(pxW(x1), pyW(y1)); g.stroke();
    }
    g.strokeStyle = 'rgba(198,176,138,0.5)'; g.lineWidth = Math.max(1, pxW(8) - pxW(0));
    for (const [x0, y0, x1, y1] of BAY.PIERS) {
      const L = Math.hypot(x1 - x0, y1 - y0), ux = (x1 - x0) / L, uy = (y1 - y0) / L;
      for (let d = 0; d < L; d += 55) {
        g.beginPath();
        g.moveTo(pxW(x0 + ux * d - uy * 75), pyW(y0 + uy * d + ux * 75));
        g.lineTo(pxW(x0 + ux * d + uy * 75), pyW(y0 + uy * d - ux * 75));
        g.stroke();
      }
    }
    // 7. (the jungle trail is painted above, under the boardwalk)
  }

  // ══ LANTERN NIGHT BAKE ════════════════════════════════════════════════
  // THE LIGHT IS IN THE GROUND. Every other world bakes ALBEDO — what the
  // surface would look like under a lamp — and lets the rig do the lighting.
  // This one cannot: the level is lit by roughly two hundred paper lanterns,
  // and two hundred real point lights is not a thing that ships on a phone.
  //
  // So the lanterns' contribution to the FLOOR is painted in. Each pool is an
  // additive radial gradient dropped at the lantern's own position, which is
  // exactly what a light two metres up does to the ground under it, and it
  // costs nothing at runtime because it is a texture. The props then carry
  // emissive materials for the lantern itself, so the source and its pool agree.
  //
  // The order matters and is the reverse of a daylight bake: darks first,
  // every district painted DOWN toward blue-black, and then light added back
  // only where something is actually burning. Paint the districts at daylight
  // values first and no amount of glow on top will read as night — it comes
  // out as an evening filter, which is the single most common way a night
  // level fails.
  const LN_R = (id: LN.LnBiome) => LN.LN_REGIONS.find((r) => r.id === id)!;
  if (WORLD_ID === 'lantern') {
    const PU = (pxW(1000) - pxW(0)) / 1000;         // canvas px per world unit
    const lpath = (pts: LN.Pt[], close = true) => {
      g.beginPath();
      g.moveTo(pxW(pts[0][0]), pyW(pts[0][1]));
      for (const [x, y] of pts) g.lineTo(pxW(x), pyW(y));
      if (close) g.closePath();
    };
    const fillPoly = (pts: LN.Pt[], col: number | string) => {
      lpath(pts); g.fillStyle = typeof col === 'number' ? hex(col) : col; g.fill();
    };
    /** A lantern's footprint on the floor: warm core, fast falloff, additive.
     *  `r` is in WORLD units — a paper lantern hung at stall height throws a
     *  pool about 260 across, a big gate lantern about 700. */
    const pool = (wx: number, wy: number, r: number, core: string, mid: string) => {
      const px = pxW(wx), py = pyW(wy), pr = Math.max(2, r * PU);
      const gr = g.createRadialGradient(px, py, 0, px, py, pr);
      gr.addColorStop(0, core);
      gr.addColorStop(0.34, mid);
      gr.addColorStop(1, 'rgba(255,180,80,0)');
      g.fillStyle = gr;
      g.beginPath(); g.arc(px, py, pr, 0, Math.PI * 2); g.fill();
    };

    // 1. BASE — the valley at night with nothing lit. Blue-black, and the one
    //    surface that is never fully dark because the moon reaches it.
    g.fillStyle = '#3a4560'; g.fillRect(0, 0, TEX, TEX);
    for (let i = 0; i < 2600; i++) {
      const x = Math.random() * TEX, y = Math.random() * TEX;
      g.fillStyle = Math.random() < 0.5 ? 'rgba(74,90,120,0.22)' : 'rgba(28,36,52,0.28)';
      g.beginPath(); g.arc(x, y, rand(4, 12), 0, Math.PI * 2); g.fill();
    }

    // 2. DISTRICT FLOORS. Bamboo first so everything built overlaps it.
    const LN_FLOOR: Record<LN.LnBiome, number> = {
      bamboo: 0x44526a, shrine: 0x5c5c6b, garden: 0x33573e, teahouse: 0x715a49,
      stalls: 0x7d6552, gate: 0x585269, bridge: 0x7d6753, bathhouse: 0x82443f,
      canal: 0x24455f, onsen: 0x8a7a6e,
    };
    // `bamboo` is lnRegionAt's FALLBACK, not a polygon — it is the rim and the
    // seams between districts. So it is painted as the whole valley floor and
    // everything built gets laid on top of it.
    fillPoly(LN.LN_LAND_SMOOTH as LN.Pt[], LN_FLOOR.bamboo);
    for (const id of ['garden', 'shrine', 'teahouse', 'gate', 'onsen', 'bathhouse', 'stalls', 'bridge'] as LN.LnBiome[]) {
      const r = LN.LN_REGIONS.find((q) => q.id === id);
      if (r) fillPoly(r.poly, LN_FLOOR[id]);
    }

    // 3. THE CANAL. Painted last of the floors so it cuts through the banks,
    //    and given a lengthwise gradient rather than a flat fill — still water
    //    is darkest in the middle and picks up the bank light at its edges,
    //    which is the read that stops it looking like blue tarmac.
    fillPoly(LN_R('canal').poly, LN_FLOOR.canal);
    g.save(); lpath(LN_R('canal').poly); g.clip();
    // FINE, not banded. At 26 world units and 0.16 these strokes were four
    // hard stripes down the channel — a world unit is 0.05 of a 3D unit, so a
    // 26-unit line is over a metre wide in play and reads as paint, not water.
    g.strokeStyle = 'rgba(90,150,190,0.07)';
    g.lineWidth = Math.max(1, 12 * PU); g.lineCap = 'round';
    for (let i = 0; i < LN.CANAL.length - 1; i++) {
      const [ax, ay] = LN.CANAL[i], [bx, by] = LN.CANAL[i + 1];
      for (const off of [-96, -34, 34, 96]) {
        const L = Math.hypot(bx - ax, by - ay), nx = -(by - ay) / L, ny = (bx - ax) / L;
        g.beginPath();
        g.moveTo(pxW(ax + nx * off), pyW(ay + ny * off));
        g.lineTo(pxW(bx + nx * off), pyW(by + ny * off));
        g.stroke();
      }
    }
    g.restore();

    // 3b. SURFACES. Each district gets the marking it would actually have.
    {
      // THE GREAT GATE: big granite flags, laid square to the gate.
      g.save(); lpath(LN_R('gate').poly); g.clip();
      // a dark joint with a lit chamfer beside it — one stroke each way
      for (const [col, wid, off] of [['rgba(24,26,38,0.34)', 8, 0], ['rgba(168,172,196,0.20)', 5, 7]] as const) {
        g.strokeStyle = col; g.lineWidth = Math.max(1, wid * PU);
        for (let x = 4300; x < 8200; x += 260) {
          g.beginPath(); g.moveTo(pxW(x + off), pyW(9400)); g.lineTo(pxW(x + off), pyW(10800)); g.stroke();
        }
        for (let y = 9400; y < 10800; y += 260) {
          g.beginPath(); g.moveTo(pxW(4300), pyW(y + off)); g.lineTo(pxW(8200), pyW(y + off)); g.stroke();
        }
      }
      g.restore();

      // THE SHRINE STEPS: raked gravel. Concentric arcs around the stair head,
      // which is what a raked garden actually looks like and reads instantly.
      g.save(); lpath(LN_R('shrine').poly); g.clip();
      g.strokeStyle = 'rgba(150,152,170,0.20)'; g.lineWidth = Math.max(1, 11 * PU);
      for (let r = 160; r < 2600; r += 130) {
        g.beginPath(); g.arc(pxW(4200), pyW(8200), r * PU, 0, Math.PI * 2); g.stroke();
      }
      g.restore();

      // THE TEAHOUSE TERRACE: boardwalk planks running with the valley.
      g.save(); lpath(LN_R('teahouse').poly); g.clip();
      for (const [col, wid, off] of [['rgba(40,30,22,0.30)', 6, 0], ['rgba(196,164,124,0.18)', 4, 5]] as const) {
        g.strokeStyle = col; g.lineWidth = Math.max(1, wid * PU);
        for (let x = 7600; x < 9200; x += 110) {
          g.beginPath(); g.moveTo(pxW(x + off), pyW(6000)); g.lineTo(pxW(x + off), pyW(10200)); g.stroke();
        }
      }
      // and the cross-joints, so it is planks rather than stripes
      g.strokeStyle = 'rgba(40,30,22,0.26)';
      for (let y = 6000; y < 10200; y += 620) {
        g.beginPath(); g.moveTo(pxW(7600), pyW(y)); g.lineTo(pxW(9200), pyW(y)); g.stroke();
      }
      g.restore();

      // THE NIGHT GARDEN: clipped hedge blocks and moss patches.
      g.save(); lpath(LN_R('garden').poly); g.clip();
      for (let i = 0; i < 90; i++) {
        const x = 4600 + Math.random() * 3300, y = 3900 + Math.random() * 1700;
        g.fillStyle = Math.random() < 0.5 ? 'rgba(34,84,52,0.30)' : 'rgba(112,156,104,0.26)';
        g.beginPath(); g.ellipse(pxW(x), pyW(y), rand(60, 190) * PU, rand(40, 120) * PU,
          Math.random() * 3, 0, Math.PI * 2); g.fill();
      }
      g.restore();

      // LANTERN ROW: trodden earth, darker where the crowd walks and scuffed.
      g.save(); lpath(LN_R('stalls').poly); g.clip();
      for (let i = 0; i < 700; i++) {
        const x = 5000 + Math.random() * 3000, y = 6200 + Math.random() * 4300;
        g.fillStyle = Math.random() < 0.5 ? 'rgba(48,36,28,0.16)' : 'rgba(190,158,116,0.22)';
        g.beginPath(); g.ellipse(pxW(x), pyW(y), rand(30, 110) * PU, rand(20, 70) * PU,
          Math.random() * 3, 0, Math.PI * 2); g.fill();
      }
      g.restore();

      // THE BATHHOUSE TERRACE: big lacquer boards, radial to the building.
      g.save(); lpath(LN_R('bathhouse').poly); g.clip();
      g.strokeStyle = 'rgba(255,196,140,0.16)'; g.lineWidth = Math.max(1, 9 * PU);
      for (let a = 0; a < 28; a++) {
        const th = (a / 28) * Math.PI * 2;
        g.beginPath();
        g.moveTo(pxW(6280 + Math.cos(th) * 380), pyW(2500 + Math.sin(th) * 300));
        g.lineTo(pxW(6280 + Math.cos(th) * 1700), pyW(2500 + Math.sin(th) * 1400));
        g.stroke();
      }
      g.restore();

      // THE VALLEY WALL: bamboo litter, so the rim is not one flat field.
      for (let i = 0; i < 1400; i++) {
        const x = 3000 + Math.random() * 6200, y = 800 + Math.random() * 10200;
        if (!LN.onLanternLand(x, y)) continue;
        if (LN.lnRegionAt(x, y) !== 'bamboo') continue;
        g.fillStyle = Math.random() < 0.5 ? 'rgba(96,128,104,0.26)' : 'rgba(30,40,56,0.22)';
        g.beginPath(); g.ellipse(pxW(x), pyW(y), rand(40, 130) * PU, rand(24, 80) * PU,
          Math.random() * 3, 0, Math.PI * 2); g.fill();
      }
    }

    // 4. THE MARKET STREET — packed earth down the east bank, worn pale in the
    //    middle where everybody walks.
    {
      const opath2 = (pts: LN.Pt[]) => { lpath(pts, false); };
      opath2(LN.MARKET);
      g.strokeStyle = '#5a4a3c'; g.lineCap = 'round';
      g.lineWidth = Math.max(2, LN.MARKET_HALF * 2 * PU); g.stroke();
      opath2(LN.MARKET);
      g.strokeStyle = 'rgba(120,100,80,0.35)';
      g.lineWidth = Math.max(1, LN.MARKET_HALF * 0.9 * PU); g.stroke();
    }

    // 5. THE SHRINE STAIR and THE BATHHOUSE STAIR — the two flights of stone
    //    steps, drawn as rungs so the climb reads from the play camera.
    const stair = (x0: number, y0: number, x1: number, y1: number, n: number, wHalf: number) => {
      const L = Math.hypot(x1 - x0, y1 - y0), ux = (x1 - x0) / L, uy = (y1 - y0) / L;
      const nx = -uy, ny = ux;
      g.strokeStyle = 'rgba(150,150,164,0.55)'; g.lineWidth = Math.max(1, 22 * PU);
      for (let k = 0; k <= n; k++) {
        const d = (k / n) * L, cx = x0 + ux * d, cy = y0 + uy * d;
        g.beginPath();
        g.moveTo(pxW(cx + nx * wHalf), pyW(cy + ny * wHalf));
        g.lineTo(pxW(cx - nx * wHalf), pyW(cy - ny * wHalf));
        g.stroke();
      }
    };
    // up to the bathhouse, dead on the level's sightline
    g.save(); lpath(LN_R('bathhouse').poly); g.clip();
    g.fillStyle = 'rgba(140,140,156,0.30)';
    g.beginPath();
    g.moveTo(pxW(5800), pyW(4020)); g.lineTo(pxW(6760), pyW(4020));
    g.lineTo(pxW(6560), pyW(3120)); g.lineTo(pxW(6000), pyW(3120)); g.closePath(); g.fill();
    stair(6280, 4020, 6280, 3120, 14, 420);
    g.restore();
    // and up the west bank into the shrine
    g.save(); lpath(LN_R('shrine').poly); g.clip();
    stair(4820, 8600, 4060, 7600, 11, 300);
    g.restore();

    // 6. THE GARDEN's koi ponds — three dark ovals with a lit rim.
    for (const [cx, cy, rr] of [[5180, 4720, 260], [7180, 4680, 210], [6060, 4520, 170]] as const) {
      g.fillStyle = '#0e2430';
      g.beginPath(); g.ellipse(pxW(cx), pyW(cy), rr * PU, rr * 0.72 * PU, 0, 0, Math.PI * 2); g.fill();
      g.strokeStyle = 'rgba(120,170,190,0.30)'; g.lineWidth = Math.max(1, 16 * PU); g.stroke();
    }

    // ── 7. THE LIGHT ──────────────────────────────────────────────────────
    // Everything above is unlit ground. From here on it is additive, and this
    // is the entire look of the level.
    g.save();
    g.globalCompositeOperation = 'lighter';

    // 7a. THE LANTERN STRINGS over the canal. Two hundred pools down the
    //     channel, alternating warm amber and a cooler paper white so the row
    //     has rhythm rather than reading as one continuous smear of orange.
    {
      const rnd = (() => { let sd = 20260802; return () => ((sd = (sd * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff); })();
      for (let i = 0; i < LN.CANAL.length - 1; i++) {
        const [ax, ay] = LN.CANAL[i], [bx, by] = LN.CANAL[i + 1];
        const L = Math.hypot(bx - ax, by - ay);
        // 260 spacing against a ~200 radius is 0.77 pools deep along the run,
        // and two lanes rather than four — about 4 overlaps at the centre line.
        for (let d = 0; d < L; d += 260) {
          const t = d / L;
          const cx = ax + (bx - ax) * t, cy = ay + (by - ay) * t;
          const warm = rnd() < 0.68;
          // strung ACROSS the channel, so the pools land on the water and on
          // both banks — the reflection is what sells a canal at night
          for (const off of [-115, 115]) {
            const nx = -(by - ay) / L, ny = (bx - ax) / L;
            pool(cx + nx * off, cy + ny * off, 180 + rnd() * 60,
              warm ? 'rgba(255,176,88,0.13)' : 'rgba(255,232,196,0.11)',
              warm ? 'rgba(240,132,54,0.055)' : 'rgba(226,206,178,0.05)');
          }
        }
      }
    }

    // 7b. THE STALLS' OWN LIGHT. Each stall is a lit box with a griddle in it,
    //     so it throws a stronger, warmer, tighter pool than the strings do —
    //     and this is what draws the eye down the street.
    {
      const rnd = (() => { let sd = 771; return () => ((sd = (sd * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff); })();
      for (const sl of LN.stallSlots(rnd)) {
        pool(sl.x, sl.y, 300, 'rgba(255,196,110,0.17)', 'rgba(246,140,50,0.07)');
        // the hot spot on the griddle: tight enough that it barely overlaps its
        // neighbours, so it can stay strong — this is the brightest ground in
        // the level and the thing that draws the eye down the street
        pool(sl.x, sl.y, 96, 'rgba(255,238,206,0.34)', 'rgba(255,190,120,0.15)');
      }
    }

    // 7c. THE GREAT GATE. One enormous lantern each side of the torii — the
    //     first thing the match paints and the frame the opening shot sits in.
    pool(5900, 10120, 700, 'rgba(255,150,80,0.26)', 'rgba(226,96,44,0.11)');
    pool(6620, 10120, 700, 'rgba(255,150,80,0.26)', 'rgba(226,96,44,0.11)');

    // 7d. THE SHRINE. A hundred small stone lanterns up the steps: dimmer,
    //     colder, and evenly spaced, so the west bank reads as devotional
    //     rather than commercial. Same trick, opposite mood.
    {
      const rnd = (() => { let sd = 5150; return () => ((sd = (sd * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff); })();
      for (const [x, y] of LN.scatterInRegion(LN_R('shrine'), 90, rnd, 30)) {
        pool(x, y, 150, 'rgba(226,214,255,0.075)', 'rgba(150,150,220,0.032)');
      }
    }

    // 7e. THE TEAHOUSE terrace: fewer, larger, softer — hanging lanterns under
    //     a deep eave, so the light is diffuse instead of pooled.
    {
      const rnd = (() => { let sd = 7780; return () => ((sd = (sd * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff); })();
      for (const [x, y] of LN.scatterInRegion(LN_R('teahouse'), 22, rnd, 60)) {
        pool(x, y, 260, 'rgba(255,206,140,0.10)', 'rgba(224,156,80,0.045)');
      }
    }

    // 7f. THE BATHHOUSE. The brightest thing in the level by a distance, and
    //     the only light the player can see from the spawn 7,600 units away.
    //     It is the whole reason to walk north.
    pool(LN.BATHHOUSE.cx, LN.BATHHOUSE.cy, 2400, 'rgba(255,196,120,0.20)', 'rgba(236,140,70,0.09)');
    pool(LN.BATHHOUSE.cx, LN.BATHHOUSE.cy, 1050, 'rgba(255,232,180,0.24)', 'rgba(255,180,110,0.11)');
    // spill down the stair, so the climb is lit from the top
    for (let k = 0; k <= 8; k++) {
      const t = k / 8;
      pool(6280, 3120 + t * 900, 300 + t * 160,
        `rgba(255,190,110,${(0.11 * (1 - t * 0.7)).toFixed(3)})`,
        `rgba(230,140,70,${(0.05 * (1 - t * 0.7)).toFixed(3)})`);
    }

    // 7f-b. THE HOT SPRING. The only light in the level that comes from the
    //     GROUND rather than from something hanging over it — a lit pool
    //     throws up, so the pool is bright and everything around it catches a
    //     rim rather than a wash. Cooler than the market, because water is.
    for (const [px, py, rr] of [[8080, 2180, 5.4], [7860, 2620, 4.6], [8180, 2900, 3.9],
      [7820, 3180, 3.4], [8060, 3420, 2.8]] as const) {
      pool(px, py, rr * 46, 'rgba(150,230,255,0.26)', 'rgba(90,170,220,0.11)');
      pool(px, py, rr * 20, 'rgba(216,248,255,0.34)', 'rgba(150,220,255,0.15)');
    }

    // 7g. THE MOON. The one COLD light in the level, and the only one that is
    //     not a fire: a broad, weak, blue wash over the bridge and the garden,
    //     which is what stops the whole frame going amber. Painted after the
    //     warm sources so it sits on top of them at the waist.
    pool(6200, 5800, 3200, 'rgba(120,160,240,0.045)', 'rgba(90,120,200,0.022)');

    g.restore();

    // 8. FIREFLIES in the garden — a handful of tiny hard specks, no falloff.
    //    Cheap, and the eye reads them as depth.
    //
    //    …at the RIGHT SIZE, which took a photograph to find. These were 9
    //    texture units across on a 3,072px bake. That is about two pixels of
    //    canvas — which sounds like a speck, and is one, right up until the
    //    play camera magnifies the ground roughly six times and every "speck"
    //    lands on screen as a pale oval the size of a spirit's head. A hundred
    //    and twenty of those across the night garden did not read as fireflies;
    //    they read as somebody had flicked a brush at the lawn.
    //
    //    The number that matters is not the canvas radius, it is the SCREEN
    //    radius: bake px x (screen px per bake px). Three units lands at about
    //    five screen pixels, which is a firefly.
    {
      const rnd = (() => { let sd = 4700; return () => ((sd = (sd * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff); })();
      g.save(); g.globalCompositeOperation = 'lighter';
      for (const [x, y] of LN.scatterInRegion(LN_R('garden'), 150, rnd, 10)) {
        g.fillStyle = 'rgba(200,255,170,0.7)';
        g.beginPath(); g.arc(pxW(x), pyW(y), Math.max(0.6, 3 * PU), 0, Math.PI * 2); g.fill();
      }
      g.restore();
    }
  }

  // ══ GAME DAY BAKE ═════════════════════════════════════════════════════
  // Maple's ground is a 6x6 grid of blocks with a road lattice through it, and
  // for two builds Game Day inherited the whole thing — the spiral maze, the
  // farm strips, the lake — because the bake branched on `!== 'pirate'` and
  // gameday is not pirate. From the overview camera the stadium sat in the
  // middle of Maple Falls. There is no grid here at all: the districts are
  // polygons, the only road is the concourse ring, and the dominant marking in
  // the level is eleven rows of painted parking stalls.
  const GD_R = (id: GD.GdBiome) => GD.GD_REGIONS.find((r) => r.id === id)!;
  if (WORLD_ID === 'gameday') {
    const PU = (pxW(1000) - pxW(0)) / 1000;         // canvas px per world unit
    const gpath = (pts: GD.Pt[], close = true) => {
      g.beginPath();
      g.moveTo(pxW(pts[0][0]), pyW(pts[0][1]));
      for (const [x, y] of pts) g.lineTo(pxW(x), pyW(y));
      if (close) g.closePath();
    };
    const fillPoly = (pts: GD.Pt[], col: number | string) => {
      gpath(pts); g.fillStyle = typeof col === 'number' ? hex(col) : col; g.fill();
    };

    // 1. BASE — a warm autumn Saturday, not Maple's midday green. Everything
    //    below is painted on top of this, and the slack ring between the built
    //    districts and the tree line keeps it: rough unmown grass.
    g.fillStyle = '#7fa84a'; g.fillRect(0, 0, TEX, TEX);
    for (let i = 0; i < 3200; i++) {
      const x = Math.random() * TEX, y = Math.random() * TEX;
      g.fillStyle = Math.random() < 0.5 ? 'rgba(150,180,90,0.20)' : 'rgba(196,150,64,0.13)';
      g.beginPath(); g.arc(x, y, rand(3, 9), 0, Math.PI * 2); g.fill();
    }

    // 2. DISTRICT FLOORS, tree line first so the built ground overlaps it.
    const GD_FLOOR: Record<GD.GdBiome, number> = {
      woods: 0x9a6a3a, practice: 0x5fa356, campus: 0x76b85a, greek: 0x8fc76a,
      rvpark: 0x8a8578, lot: 0x6e6b74, plaza: 0xb9b3a8, bowl: 0xb9b3a8,
    };
    fillPoly(GD_R('woods').poly, GD_FLOOR.woods);
    // leaf litter: the rim is the only place in the level with fallen colour
    g.save(); gpath(GD_R('woods').poly); g.clip();
    for (let i = 0; i < 2600; i++) {
      const x = Math.random() * TEX, y = Math.random() * TEX;
      const c2 = ['rgba(196,74,44,0.30)', 'rgba(224,150,44,0.28)', 'rgba(150,96,40,0.30)', 'rgba(108,138,58,0.22)'];
      g.fillStyle = c2[(Math.random() * c2.length) | 0];
      g.beginPath(); g.arc(x, y, rand(2, 7), 0, Math.PI * 2); g.fill();
    }
    g.restore();
    for (const id of ['practice', 'campus', 'greek', 'rvpark', 'lot', 'plaza', 'bowl'] as GD.GdBiome[]) {
      fillPoly(GD_R(id).poly, GD_FLOOR[id]);
    }

    // 3. MOWN STRIPES on the three grass districts. Ride-on mowers leave
    //    alternating light/dark bands and it is the single cheapest thing that
    //    says "somebody looks after this" — the frat lawns and the quad were
    //    otherwise two flat green fields.
    const stripe = (id: GD.GdBiome, pitch: number, vert: boolean) => {
      g.save(); gpath(GD_R(id).poly); g.clip();
      g.fillStyle = 'rgba(255,255,255,0.075)';
      const [x0, y0, x1, y1] = [0, 0, TEX, TEX];
      const step = pitch * PU;
      for (let v = x0; v < (vert ? x1 : y1); v += step * 2) {
        if (vert) g.fillRect(v, y0, step, y1 - y0); else g.fillRect(x0, v, x1 - x0, step);
      }
      g.restore();
    };
    stripe('greek', 210, true);
    stripe('campus', 240, false);
    stripe('practice', 260, false);

    // 4. THE CONCOURSE — the ring road around the bowl, and the only road in
    //    the level. Kerb band under, swept concrete over.
    const ring = (col: string, half: number) => {
      gpath(GD.CONCOURSE, false);
      g.strokeStyle = col; g.lineWidth = half * 2 * PU; g.lineJoin = 'round'; g.lineCap = 'round'; g.stroke();
    };
    ring('rgba(120,116,108,0.55)', GD.CONCOURSE_HALF + 26);
    ring('#cfc9bd', GD.CONCOURSE_HALF);
    ring('rgba(255,255,255,0.10)', GD.CONCOURSE_HALF - 55);

    // 5. THE BOWL. Everything inside the stadium ellipse: the stand footprint
    //    ring, then the playing surface with real markings. The mesh sits on
    //    top of this, but the field shows through the open bowl from the play
    //    camera and it is the one surface in the game a child will recognise
    //    on sight, so it is painted properly — hash marks included.
    const S = GD.STADIUM;
    // THE BAKE WAS PAINTING A FIELD 2.6 TIMES THE STADIUM. gameday.ts's
    // STADIUM.rx/ry describe the PRECINCT — the ground the bowl and its
    // concourse own — while makeStadium() produces a mesh 57.4 x 43 on plan.
    // Painting the pitch at precinct scale put a green striped ellipse 152
    // units wide around a 57-unit stadium, with the yard lines running out from
    // under the stands and across the car park. Caught in the establishing
    // shot, which is the first thing this level now shows anybody.
    // 0.37 is the mesh's own footprint as a fraction of the precinct.
    const MESH_K = GD.STADIUM_MESH_K;
    const ell = (rx: number, ry: number) => {
      g.beginPath(); g.ellipse(pxW(S.cx), pyW(S.cy), rx * PU, ry * PU, 0, 0, Math.PI * 2);
    };
    // the forecourt: swept concrete from the stands out to the concourse ring,
    // which is what the precinct actually is once the pitch is the right size
    ell(S.rx, S.ry); g.fillStyle = '#bdb7ab'; g.fill();
    for (let i = 0; i < 900; i++) {   // a little grain so it is not a flat disc
      const a = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random());
      g.fillStyle = 'rgba(255,255,255,0.05)';
      g.beginPath();
      g.arc(pxW(S.cx + Math.cos(a) * rr * S.rx), pyW(S.cy + Math.sin(a) * rr * S.ry), rand(3, 9), 0, Math.PI * 2);
      g.fill();
    }
    ell(S.rx * MESH_K, S.ry * MESH_K); g.fillStyle = '#8d8578'; g.fill();               // stand footprint
    ell(S.rx * MESH_K * 0.86, S.ry * MESH_K * 0.82); g.fillStyle = '#6f6f7c'; g.fill(); // the tunnel apron
    // THE PLAYING SURFACE, inside the bowl and nowhere else.
    const FX = S.rx * MESH_K * 0.78, FY = S.ry * MESH_K * 0.74;   // the pitch's half-extents
    const EZ = FX * 0.15;                                          // end zone depth
    g.save();
    ell(S.rx * MESH_K * 0.78, S.ry * MESH_K * 0.74); g.clip();
    g.fillStyle = '#3f8f4e'; g.fillRect(0, 0, TEX, TEX);
    // mowing bands the length of the pitch
    g.fillStyle = 'rgba(255,255,255,0.085)';
    for (let x = -FX; x < FX; x += FX * 0.29) g.fillRect(pxW(S.cx + x), 0, FX * 0.145 * PU, TEX);
    // end zones — home crimson at the near end, visitor teal at the far
    g.fillStyle = 'rgba(196,52,47,0.55)'; g.fillRect(pxW(S.cx - FX), 0, EZ * PU, TEX);
    g.fillStyle = 'rgba(42,169,160,0.50)'; g.fillRect(pxW(S.cx + FX - EZ), 0, EZ * PU, TEX);
    // ten yard lines, then hash marks between them
    g.strokeStyle = 'rgba(255,255,255,0.92)'; g.lineWidth = Math.max(1.6, 11 * PU); g.lineCap = 'butt';
    const STEP = (FX - EZ) * 2 / 10;
    for (let x = -FX + EZ; x <= FX - EZ + 1; x += STEP) {
      g.beginPath(); g.moveTo(pxW(S.cx + x), pyW(S.cy - FY)); g.lineTo(pxW(S.cx + x), pyW(S.cy + FY)); g.stroke();
    }
    g.lineWidth = Math.max(1.0, 7 * PU);
    for (let x = -FX + EZ; x <= FX - EZ + 1; x += STEP / 5) {
      for (const hy of [-0.30, 0.30]) {
        g.beginPath();
        g.moveTo(pxW(S.cx + x), pyW(S.cy + hy * FY - FY * 0.06));
        g.lineTo(pxW(S.cx + x), pyW(S.cy + hy * FY + FY * 0.06));
        g.stroke();
      }
    }
    // the midfield mark
    g.beginPath(); g.arc(pxW(S.cx), pyW(S.cy), FX * 0.26 * PU, 0, Math.PI * 2);
    g.fillStyle = 'rgba(240,180,41,0.42)'; g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = Math.max(1.6, 14 * PU); g.stroke();
    g.restore();

    // 6. THE TAILGATE APRON. Eleven painted rows: asphalt band, a stall line
    //    per bay, and a worn tyre track down the aisle between each pair.
    for (const row of GD.LOT_ROWS) {
      const dx = row.b[0] - row.a[0], dy = row.b[1] - row.a[1];
      const len = Math.hypot(dx, dy) || 1;
      const ux = dx / len, uy = dy / len;
      const nx = -uy, ny = ux;
      // the band itself, slightly darker than the surrounding lot
      g.beginPath();
      g.moveTo(pxW(row.a[0]), pyW(row.a[1])); g.lineTo(pxW(row.b[0]), pyW(row.b[1]));
      g.strokeStyle = 'rgba(60,58,68,0.30)'; g.lineWidth = GD.LOT_ROW_HALF * 2 * PU; g.lineCap = 'butt'; g.stroke();
      // stall lines
      g.strokeStyle = 'rgba(240,224,140,0.60)'; g.lineWidth = Math.max(1.4, 9 * PU);
      const n = Math.floor(len / row.pitch);
      const start = (len - (n - 1) * row.pitch) / 2;
      for (let i = 0; i <= n; i++) {
        const d = start + (i - 0.5) * row.pitch;
        if (d < 0 || d > len) continue;
        const cx2 = row.a[0] + ux * d, cy2 = row.a[1] + uy * d;
        g.beginPath();
        g.moveTo(pxW(cx2 + nx * GD.LOT_ROW_HALF), pyW(cy2 + ny * GD.LOT_ROW_HALF));
        g.lineTo(pxW(cx2 - nx * GD.LOT_ROW_HALF), pyW(cy2 - ny * GD.LOT_ROW_HALF));
        g.stroke();
      }
      // tyre tracks in the aisle just north of the row
      g.strokeStyle = 'rgba(30,28,34,0.13)'; g.lineWidth = Math.max(1, 22 * PU);
      for (const off of [GD.LOT_AISLE * 0.5 - 30, GD.LOT_AISLE * 0.5 + 30]) {
        g.beginPath();
        g.moveTo(pxW(row.a[0] + nx * off), pyW(row.a[1] + ny * off));
        g.lineTo(pxW(row.b[0] + nx * off), pyW(row.b[1] + ny * off));
        g.stroke();
      }
    }

    // 7. RV ROW hardstanding: gravel grain plus long pull-through bays.
    g.save(); gpath(GD_R('rvpark').poly); g.clip();
    for (let i = 0; i < 1400; i++) {
      const x = Math.random() * TEX, y = Math.random() * TEX;
      g.fillStyle = `rgba(${150 + ((Math.random() * 40) | 0)},${144 + ((Math.random() * 36) | 0)},124,0.22)`;
      g.beginPath(); g.arc(x, y, rand(2, 6), 0, Math.PI * 2); g.fill();
    }
    g.strokeStyle = 'rgba(255,255,255,0.16)'; g.lineWidth = Math.max(1.2, 12 * PU);
    for (let y = 6300; y < 9900; y += 420) {
      g.beginPath(); g.moveTo(pxW(2500), pyW(y)); g.lineTo(pxW(4600), pyW(y)); g.stroke();
    }
    g.restore();

    // 8. THE PRACTICE FIELD gets its own markings — this is where the team
    //    actually works, so it is a marked pitch and not just mown grass.
    g.save(); gpath(GD_R('practice').poly); g.clip();
    g.strokeStyle = 'rgba(255,255,255,0.42)'; g.lineWidth = Math.max(1.2, 9 * PU);
    for (let y = 3100; y < 5500; y += 150) {
      g.beginPath(); g.moveTo(pxW(2900), pyW(y)); g.lineTo(pxW(3800), pyW(y)); g.stroke();
    }
    g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = Math.max(1.6, 14 * PU);
    g.strokeRect(pxW(2900), pyW(3100), (3800 - 2900) * PU, (5500 - 3100) * PU);
    g.restore();

    // 9. GATE PLAZA: swept radial sweep lines fanning out from the bowl, and
    //    the queue snake painted on the concrete in front of the gates.
    g.save(); gpath(GD_R('plaza').poly); g.clip();
    g.strokeStyle = 'rgba(255,255,255,0.09)'; g.lineWidth = Math.max(1.4, 26 * PU);
    for (let a = Math.PI * 0.10; a < Math.PI * 0.90; a += Math.PI / 26) {
      g.beginPath();
      g.moveTo(pxW(S.cx + Math.cos(a) * 1700), pyW(S.cy + Math.sin(a) * 1700));
      g.lineTo(pxW(S.cx + Math.cos(a) * 3400), pyW(S.cy + Math.sin(a) * 3400));
      g.stroke();
    }
    g.strokeStyle = 'rgba(240,180,41,0.45)'; g.lineWidth = Math.max(1.2, 10 * PU);
    for (let k = 0; k < 5; k++) {
      const y = 5450 + k * 130;
      g.beginPath(); g.moveTo(pxW(4600), pyW(y)); g.lineTo(pxW(7300), pyW(y)); g.stroke();
    }
    g.restore();

    // 10. OLD CAMPUS paths: two brick walks crossing the quad.
    g.save(); gpath(GD_R('campus').poly); g.clip();
    g.strokeStyle = '#b98a63'; g.lineWidth = Math.max(2, 62 * PU); g.lineCap = 'round';
    g.beginPath(); g.moveTo(pxW(8100), pyW(3900)); g.lineTo(pxW(9500), pyW(6300)); g.stroke();
    g.beginPath(); g.moveTo(pxW(9700), pyW(4600)); g.lineTo(pxW(8100), pyW(6600)); g.stroke();
    g.restore();
  }

  // biome block fills
  const biomeColor: Record<Biome, number | null> = {
    // ── MAPLE FALLS ground. THE SQUARE stays null (a green, not a slab): the
    // player is 0x9a5cff and the match opens there, so the one thing the
    // ground under the spawn must not be is pale violet pavement.
    cozy: null, fancy: null, downtown: WORLD.pavement, plaza: null,
    park: WORLD.park, forest: WORLD.forest, beach: WORLD.sand, zoo: WORLD.zooGround,
    airport: 0xd9dbe6, military: 0x8f9576,
    // ── POWDER PASS ground: null — the powder bake paints its regions
    // directly (rim shade, piste, grit road, lake); block fills are maple's
    village: null, lake: null, pinewood: null, piste: null, lodge: null, rim: null,
    fair: 0xc8b98a,      // trampled fairground earth
    farm: 0xc7ab5c,      // ripe crop; pasture + tilled strips painted over it
    campus: 0x8fd06a,    // athletic turf
    strip: 0xa8a294,     // highway gravel and dust (was 1.04 against the fairground above it)
    // ── PIRATE BAY ground: sun-bleached sand, teak decking, jungle green
    port: 0xa8814f,      // wet dock timber
    resort: 0xf7ecd0,    // raked resort sand — the bay's three sands measured
                         // 1.05 and 1.12 apart, so the resort, the cove and the
    party: 0x6a4a7a,     // the dance floor slab (lit up in the bake)
    market: 0xcfa462,    // packed market ground — market were one beige field
    jungle: 0x2f7a4a,    // deep tropical canopy floor
    cove: 0xe0c78e,      // pale cove sand
    // ── GAME DAY ground. An autumn Saturday: warm asphalt, worn turf and
    // fallen leaves, kept a clear step apart from each other in value so the
    // districts read as separate surfaces from the play camera rather than one
    // beige field — which is the mistake the three pirate sands made above.
    bowl: 0x3f8f4e,      // the playing surface, deeper than any campus turf
    gate: 0xc4beb2,      // swept concourse concrete
    // SUN-BLEACHED, NOT FRESH. A framebuffer sample put Game Day's mean scene
    // luminance at 0.357 against Maple's 0.626 — 43% darker than the flagship
    // world, in a game for six-year-olds — and it was NOT the light: the level
    // measured 0.357 under Maple's own midday rig too. It is the albedo. The
    // lot is over half the frame and it was fresh-laid tarmac; a car park that
    // has been baking since August is a pale grey, which is both truer and
    // most of a stop brighter.
    lot: 0x918e97,       // parking asphalt, cool against everything around it
    rvpark: 0x9d978a,    // compacted gravel hardstanding
    greek: 0x8fc76a,     // frat lawn, worn but green
    quad: 0x76b85a,      // the old campus quad, greener and better kept
    practice: 0x5fa356,  // practice turf, between the bowl and the quad
    treeline: 0x9a6a3a,  // leaf litter at the rim
    // ── LANTERN NIGHT ground. Everything above is an albedo read under a sun.
    // These are read under lantern light, so they are chosen for what they do
    // to a WARM POOL falling on them from two metres up, not for what they look
    // like at noon: dark, low-saturation bases that take an amber wash and give
    // back a colour. A pale ground would blow out under the lantern pools and
    // flatten the one effect this world is built on.
    //
    // They also sit in a much tighter value band than any daylight world —
    // 0.10 to 0.26 — because at night the districts must separate by HUE and
    // by what is lit, not by albedo. GAME DAY's three sands taught the opposite
    // lesson under a sun; the same trick at night just produces grey.
    torii: 0x585269,     // swept granite flags, cool — lifted from 0x3a3547
    stalls: 0x7d6552,    // packed earth of the market street, warm under the lanterns
    canal: 0x24455f,     // the channel: deep and blue, and the one surface that
                         // takes a specular from every lantern above it
    teahouse: 0x715a49,  // cedar decking, a step warmer and lighter than the street
    shrine: 0x5c5c6b,    // mossy stone steps, cooler than the market
    moonbridge: 0x7d6753, // the bridge's timber, the lightest ground in the level
                          // because it is the one thing the moon actually hits
    nightgarden: 0x33573e, // clipped hedge and dark lawn
    bathhouse: 0x82443f,  // the terrace's red lacquer boards
    // THE HOT SPRING is the warmest and PALEST ground in the level, and that is
    // the read: wet rock under standing steam, lit from the water rather than
    // from a lantern. It is the only district whose light comes from below.
    onsen: 0x8a7a6e,
    // THE RIM WAS THE PROBLEM. At 0x18202c this is 27.6% of the map at a
    // luminance of 0.12 — a quarter of every frame, functionally black, with
    // three hundred bamboo stems in it that nobody could see. Lifted to a
    // readable blue-grey; it is still the darkest ground in the level and it
    // still says "the light stops here", but there is something there now.
    bamboo: 0x44526a,     // the valley wall: blue-grey, where the light stops
  };
  if (WORLD_ID === 'maple') for (let gy = 0; gy < 6; gy++) for (let gx = 0; gx < 6; gx++) {
    const col = biomeColor[PLAN[gy][gx]];
    if (col == null) continue;
    const cx = blockCenter(gx), cy = blockCenter(gy);
    const x0 = pxW(cx - BLOCK_SIZE / 2), y0 = pyW(cy - BLOCK_SIZE / 2);
    const x1 = pxW(cx + BLOCK_SIZE / 2), y1 = pyW(cy + BLOCK_SIZE / 2);
    g.fillStyle = hex(col);
    g.fillRect(x0, y0, x1 - x0, y1 - y0);
  }
  // forest gets a darker dappling; downtown a plaza tint already via pavement

  // ══ THE LAWN WAS ONE FLAT GREEN ═════════════════════════════════════════
  // The owner photographed Maple Falls and said the world looked bare. The
  // props were half of it (see place() and makeBush). This is the other half,
  // and it is the larger one: grass is most of the frame.
  //
  // TWO THINGS WERE WRONG.
  //
  // First, a bug. The base grass at the top of this bake lays down 4,000 soft
  // blobs of mottling — and then the biome block fills above OVERPAINT it with
  // an opaque fillRect. `park` and `forest` carry a colour, so every park block
  // in the town had its variation erased by the very next pass. The match opens
  // on a green. That green was the flattest surface in the level.
  //
  // Second, a scale error that made the existing mottle invisible anyway. This
  // bake is 3072px across the whole island, roughly 9 canvas texels per 3D
  // unit, while the play camera shows about 103 screen pixels per 3D unit —
  // the ground texture is magnified about ELEVEN TIMES on screen. The base
  // mottle's 2-6px blobs land as 20-60px smudges at 3% coverage and 0.16 alpha,
  // which is nothing. Anything meant to be SEEN here has to be authored at the
  // patch scale, not the grain scale. Grain is what the shader detail layer is
  // for, and qa/ground.mjs already confirms that layer is present and working —
  // which is exactly why the flatness never got caught. Grain was measured;
  // composition never was.
  //
  // So: large tonal patches, and leaf litter in DRIFTS. Maple Falls is an
  // autumn town and there was not one fallen leaf on its lawns. Drifts rather
  // than an even scatter, because at 11x magnification an even scatter is just
  // noise while a drift keeps its shape — and because that is what leaves
  // actually do.
  //
  // THE MEAN IS HELD DELIBERATELY. island.ts has made the opposite mistake
  // twice already — the additive night pools, then the mottle tile that blew
  // the level out to white — so the warm-up and cool-down passes are matched in
  // count and alpha, and qa/ground.mjs's reported mean is the check.
  //
  // DETERMINISM: its own mulberry32 on a fixed seed. Not Math.random (the town
  // would differ every load) and NOT the shared seeded stream, because
  // mainstreet.ts:252 warns that a draw taken from that "would shift every
  // subsequent authored placement in Maple Falls".
  if (WORLD_ID === 'maple') {
    let _ls = 0x9a5cff;
    const lr = () => {
      _ls |= 0; _ls = (_ls + 0x6D2B79F5) | 0;
      let t = Math.imul(_ls ^ (_ls >>> 15), 1 | _ls);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const lrange = (a: number, b: number) => a + lr() * (b - a);
    const GRASSY: Biome[] = ['cozy', 'fancy', 'plaza', 'park', 'forest'];
    for (let gy = 0; gy < 6; gy++) for (let gx = 0; gx < 6; gx++) {
      if (!GRASSY.includes(PLAN[gy][gx])) continue;
      const cxB = blockCenter(gx), cyB = blockCenter(gy);
      const x0 = pxW(cxB - BLOCK_SIZE / 2), y0 = pyW(cyB - BLOCK_SIZE / 2);
      const bw = pxW(cxB + BLOCK_SIZE / 2) - x0, bh = pyW(cyB + BLOCK_SIZE / 2) - y0;
      g.save(); g.beginPath(); g.rect(x0, y0, bw, bh); g.clip();
      // 1. TONE — mown and worn. Matched pairs so the block's mean does not move.
      for (let i = 0; i < 26; i++) {
        for (const up of [true, false]) {
          g.fillStyle = up ? 'rgba(178,214,112,0.15)' : 'rgba(78,124,60,0.15)';
          g.beginPath();
          g.arc(x0 + lr() * bw, y0 + lr() * bh, lrange(bw * 0.07, bw * 0.22), 0, Math.PI * 2);
          g.fill();
        }
      }
      g.restore();
    }
  }

  if (WORLD_ID === 'maple') {
  // roads — sidewalk band first, asphalt over it, crisp edge lines, dashes
  const roadPx = pxW(ROAD_CENTERS[1]) - pxW(ROAD_CENTERS[1] - 110);
  const roadLine = (c: number, vert: boolean) => {
    g.beginPath();
    if (vert) { g.moveTo(pxW(c), 0); g.lineTo(pxW(c), TEX); }
    else { g.moveTo(0, pyW(c)); g.lineTo(TEX, pyW(c)); }
    g.stroke();
  };
  g.lineCap = 'butt';
  const SIDE_COL = WORLD.pavement;
  const ROAD_COL = WORLD.road;
  g.strokeStyle = hex(SIDE_COL); g.lineWidth = roadPx * 1.6;                // sidewalks
  for (const c of ROAD_CENTERS) { roadLine(c, true); roadLine(c, false); }
  g.strokeStyle = 'rgba(120,126,150,0.5)'; g.lineWidth = roadPx * 1.62;
  for (const c of ROAD_CENTERS) { roadLine(c, true); roadLine(c, false); }
  g.strokeStyle = hex(SIDE_COL); g.lineWidth = roadPx * 1.56;
  for (const c of ROAD_CENTERS) { roadLine(c, true); roadLine(c, false); }
  g.strokeStyle = hex(ROAD_COL); g.lineWidth = roadPx;                       // asphalt / teak deck
  for (const c of ROAD_CENTERS) { roadLine(c, true); roadLine(c, false); }
  // (lane dashes are crisp GEOMETRY now — see the InstancedMesh below)
  // crosswalks: zebra ladders on all four arms of every junction.
  // These are drawn FAINT now — the crisp ones are instanced geometry (search
  // ZEBRA CROSSINGS below). What stays here is a soft under-shadow so the
  // geometry has something to sit on and the junction still reads from the
  // map-height camera, where the geometry bars are sub-pixel.
  g.fillStyle = 'rgba(240,244,252,0.30)';
  for (const cx of ROAD_CENTERS) for (const cyR of ROAD_CENTERS) {
    const jx = pxW(cx), jy = pyW(cyR), half = roadPx / 2;
    const crossW = roadPx * 0.34;          // ladder depth (walking direction)
    const off = half + roadPx * 0.1;       // just outside the junction box
    const bars = 5, barLen = roadPx * 0.86, step = barLen / bars;
    for (const s of [-1, 1]) {
      for (let k = 0; k < bars; k++) {
        const along = -barLen / 2 + k * step + step * 0.18;
        // arms of the HORIZONTAL road (walk north-south): bars elongated in x
        g.fillRect(jx + s * off + (s > 0 ? 0 : -crossW), jy + along, crossW, step * 0.62);
        // arms of the VERTICAL road (walk east-west): bars elongated in y
        g.fillRect(jx + along, jy + s * off + (s > 0 ? 0 : -crossW), step * 0.62, crossW);
      }
    }
  }

  // ══ MAIN STREET ══════════════════════════════════════════════════════════
  // Not a downtown grid — a STREET. Every `downtown` block is paved with
  // flagstones, keeps a green service alley behind the shopfronts and a rear
  // gravel lot, and puts ANGLED PARKING BAYS along the block face that meets
  // the road at world x=6000. Two facing rows of storefronts on one street
  // reads as a place; four street-walls around a courtyard reads as a city.
  for (let gy = 0; gy < 6; gy++) for (let gx = 0; gx < 6; gx++) {
    const b = PLAN[gy][gx];
    if (b !== 'downtown') continue;
    const cxB = blockCenter(gx), cyB = blockCenter(gy);
    const x0 = pxW(cxB - BLOCK_SIZE / 2), y0 = pyW(cyB - BLOCK_SIZE / 2);
    const x1 = pxW(cxB + BLOCK_SIZE / 2), y1 = pyW(cyB + BLOCK_SIZE / 2);
    g.save(); g.beginPath(); g.rect(x0, y0, x1 - x0, y1 - y0); g.clip();
    // flagstone sidewalk grid — small-town pavers, not city expansion joints
    g.strokeStyle = 'rgba(120,116,134,0.13)'; g.lineWidth = Math.max(1.2, pxW(10) - pxW(0));
    for (let s = 0; s <= 20; s++) {
      const t = cxB - BLOCK_SIZE / 2 + (s / 20) * BLOCK_SIZE;
      g.beginPath(); g.moveTo(pxW(t), y0); g.lineTo(pxW(t), y1); g.stroke();
      const ty = cyB - BLOCK_SIZE / 2 + (s / 20) * BLOCK_SIZE;
      g.beginPath(); g.moveTo(x0, pyW(ty)); g.lineTo(x1, pyW(ty)); g.stroke();
    }
    // the back of the block: a green service yard with a gravel lot in it
    g.fillStyle = '#8fc96a';
    g.fillRect(pxW(cxB - 470), pyW(cyB - 470), pxW(940) - pxW(0), pyW(940) - pyW(0));
    g.fillStyle = '#c3bcaa';
    g.fillRect(pxW(cxB - 330), pyW(cyB - 250), pxW(660) - pxW(0), pyW(500) - pyW(0));
    g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = Math.max(1.2, pxW(11) - pxW(0));
    for (let s = 0; s <= 5; s++) {   // parking bay stripes in the rear lot
      const t = cxB - 330 + (s / 5) * 660;
      g.beginPath(); g.moveTo(pxW(t), pyW(cyB - 250)); g.lineTo(pxW(t), pyW(cyB - 20)); g.stroke();
      g.beginPath(); g.moveTo(pxW(t), pyW(cyB + 20)); g.lineTo(pxW(t), pyW(cyB + 250)); g.stroke();
    }
    // ANGLED PARKING on the Main Street kerb — the single most legible
    // "American small town" mark you can paint, and it costs 8 strokes
    const face = cxB < MAIN_ST_X ? 1 : -1;                 // which way Main Street lies
    const kerb = cxB + face * (BLOCK_SIZE / 2 - 40);
    g.strokeStyle = 'rgba(250,250,255,0.72)'; g.lineWidth = Math.max(1.5, pxW(14) - pxW(0));
    for (let s = 0; s < 11; s++) {
      const ky = cyB - 700 + s * 140;
      g.beginPath();
      g.moveTo(pxW(kerb), pyW(ky));
      g.lineTo(pxW(kerb - face * 230), pyW(ky + 110));
      g.stroke();
    }
    g.restore();
  }

  // road furniture: manhole covers along every road + white guidance arrows
  // approaching each junction — the asphalt reads MAINTAINED, not painted-on
  {
    const mR = pxW(26) - pxW(0);
    for (const c of ROAD_CENTERS) {
      for (let a = 1500; a < 10800; a += 2900) {   // occasional — a real street has a manhole here and there, not a polka-dot pattern
        const off = ((a / 640) % 2 ? 1 : -1) * 30;
        for (const [mx, my] of [[a, c + off], [c + off, a]] as const) {
          if (!insideIslandWorld(mx, my)) continue;
          g.fillStyle = 'rgba(50,55,72,0.7)';
          g.beginPath(); g.arc(pxW(mx), pyW(my), mR, 0, Math.PI * 2); g.fill();
          g.strokeStyle = 'rgba(190,196,214,0.55)'; g.lineWidth = Math.max(1, mR * 0.22);
          g.beginPath(); g.arc(pxW(mx), pyW(my), mR * 0.66, 0, Math.PI * 2); g.stroke();
        }
      }
    }
    // lane arrows: one straight-ahead arrow per approach lane, 260wu before
    // the junction, pointing at it (right-hand traffic)
    const arrow = (wx: number, wy: number, dirX: number, dirY: number) => {
      if (!insideIslandWorld(wx, wy)) return;
      const axp = pxW(wx), ayp = pyW(wy), u = pxW(10) - pxW(0);
      const ang = Math.atan2(dirY, dirX);
      g.save(); g.translate(axp, ayp); g.rotate(ang);
      g.fillStyle = 'rgba(240,244,252,0.6)';
      g.fillRect(-u * 2.4, -u * 0.5, u * 2.8, u);
      g.beginPath(); g.moveTo(u * 0.4, -u * 1.4); g.lineTo(u * 2.4, 0); g.lineTo(u * 0.4, u * 1.4); g.closePath(); g.fill();
      g.restore();
    };
    for (const jx of ROAD_CENTERS) for (const jy of ROAD_CENTERS) {
      arrow(jx - 260, jy + 28, 1, 0);   // eastbound approach
      arrow(jx + 260, jy - 28, -1, 0);  // westbound
      arrow(jx + 28, jy - 260, 0, 1);   // southbound
      arrow(jx - 28, jy + 260, 0, -1);  // northbound
    }
  }

  // suburbs read DESIGNED: mow-stripes on every lawn block, then a concrete
  // driveway from each house lot across the sidewalk to its road
  for (let gy = 0; gy < 6; gy++) for (let gx = 0; gx < 6; gx++) {
    const b = PLAN[gy][gx];
    if (b !== 'cozy' && b !== 'fancy') continue;
    const cxB = blockCenter(gx), cyB = blockCenter(gy);
    // lawn mow-stripes (very subtle alternating bands)
    g.save();
    g.beginPath();
    g.rect(pxW(cxB - BLOCK_SIZE / 2), pyW(cyB - BLOCK_SIZE / 2), pxW(cxB + BLOCK_SIZE / 2) - pxW(cxB - BLOCK_SIZE / 2), pyW(cyB + BLOCK_SIZE / 2) - pyW(cyB - BLOCK_SIZE / 2));
    g.clip();
    g.fillStyle = 'rgba(255,255,255,0.07)';
    for (let s = 0; s < 8; s += 2) {
      const y0 = pyW(cyB - BLOCK_SIZE / 2 + (s / 8) * BLOCK_SIZE);
      const y1 = pyW(cyB - BLOCK_SIZE / 2 + ((s + 1) / 8) * BLOCK_SIZE);
      g.fillRect(pxW(cxB - BLOCK_SIZE / 2), y0, pxW(cxB + BLOCK_SIZE / 2) - pxW(cxB - BLOCK_SIZE / 2), y1 - y0);
    }
    g.restore();
    // per-lot yard engineering: driveway to the road, lawn panel, front walk,
    // fenced-in backyard patch (+ pool on fancy lots) — the block reads like a
    // surveyor drew it, not like houses fell on grass
    const dw = pxW(110) - pxW(0);            // driveway width
    houseLots(gx, gy).forEach((lot, li) => {
      const frontClear = 130;                // house footprint half-depth
      const sxd = -lot.fy, syd = lot.fx;     // along-street direction
      // lawn panel: a slightly brighter, clearly-bounded yard rectangle
      const yw = 360, yd = 560;              // yard width (along street) / depth
      const yx = lot.x - (lot.fx !== 0 ? lot.fx * (yd / 2 - frontClear) : 0);
      const yy = lot.y - (lot.fy !== 0 ? lot.fy * (yd / 2 - frontClear) : 0);
      const rw = lot.fy !== 0 ? yw : yd, rh = lot.fy !== 0 ? yd : yw;
      g.fillStyle = 'rgba(210,245,170,0.10)';
      g.fillRect(pxW(yx - rw / 2), pyW(yy - rh / 2), pxW(yx + rw / 2) - pxW(yx - rw / 2), pyW(yy + rh / 2) - pyW(yy - rh / 2));
      g.strokeStyle = 'rgba(70,110,60,0.10)'; g.lineWidth = Math.max(1.5, pxW(14) - pxW(0));
      g.strokeRect(pxW(yx - rw / 2), pyW(yy - rh / 2), pxW(yx + rw / 2) - pxW(yx - rw / 2), pyW(yy + rh / 2) - pyW(yy - rh / 2));
      // driveway: from the house's front edge, over the sidewalk, to the asphalt
      g.fillStyle = '#d9d5df';
      if (lot.fy !== 0) {
        const y0 = lot.fy < 0 ? cyB - BLOCK_SIZE / 2 : lot.y + frontClear;
        const y1 = lot.fy < 0 ? lot.y - frontClear : cyB + BLOCK_SIZE / 2;
        g.fillRect(pxW(lot.x + 110) - dw / 2, pyW(y0), dw, pyW(y1) - pyW(y0));
      } else {
        const x0 = lot.fx < 0 ? cxB - BLOCK_SIZE / 2 : lot.x + frontClear;
        const x1 = lot.fx < 0 ? lot.x - frontClear : cxB + BLOCK_SIZE / 2;
        g.fillRect(pxW(x0), pyW(lot.y + 110) - dw / 2, pxW(x1) - pxW(x0), dw);
      }
      // front walk: stepping-stone dashes from the door to the sidewalk
      g.fillStyle = 'rgba(233,235,242,0.45)';
      const steps = 4;
      for (let s = 0; s < steps; s++) {
        const t = frontClear + 40 + s * 90;
        const wxs = lot.x + lot.fx * t - sxd * 30, wys = lot.y + lot.fy * t - syd * 30;
        g.fillRect(pxW(wxs) - (pxW(28) - pxW(0)), pyW(wys) - (pxW(20) - pxW(0)), pxW(56) - pxW(0), pxW(40) - pxW(0));
      }
      // backyard: garden bed + patio square behind the house
      const bx = lot.x - lot.fx * (frontClear + 240), by = lot.y - lot.fy * (frontClear + 240);
      g.fillStyle = 'rgba(126,213,122,0.35)';
      g.fillRect(pxW(bx - 130), pyW(by - 130), pxW(260) - pxW(0), pxW(260) - pxW(0));
      g.fillStyle = 'rgba(226,216,206,0.12)';   // soft warm patio slab
      g.fillRect(pxW(bx + 40 * (li % 2 ? 1 : -1) - 55), pyW(by - 55), pxW(110) - pxW(0), pxW(110) - pxW(0));
      // pool (fancy lots, deterministic — matches populate's clutter exclusion)
      const pool = lotPool(b, li, lot);
      if (pool) {
        g.fillStyle = '#f2f3f7';
        g.beginPath(); g.ellipse(pxW(pool.x), pyW(pool.y), pxW(135) - pxW(0), pxW(95) - pxW(0), 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = hex(WORLD.waterShallow);
        g.beginPath(); g.ellipse(pxW(pool.x), pyW(pool.y), pxW(108) - pxW(0), pxW(72) - pxW(0), 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.45)';
        g.beginPath(); g.ellipse(pxW(pool.x - 30), pyW(pool.y - 20), pxW(34) - pxW(0), pxW(18) - pxW(0), 0.5, 0, Math.PI * 2); g.fill();
      }
    });
  }

  // GOLF COURSE — park block (4,2): fairway sweep, putting green, bunkers, tee
  {
    const gcx = blockCenter(4), gcy = blockCenter(2);
    g.save();
    g.beginPath();
    g.rect(pxW(gcx - BLOCK_SIZE / 2), pyW(gcy - BLOCK_SIZE / 2), pxW(gcx + BLOCK_SIZE / 2) - pxW(gcx - BLOCK_SIZE / 2), pyW(gcy + BLOCK_SIZE / 2) - pyW(gcy - BLOCK_SIZE / 2));
    g.clip();
    // the river bisects this block near its centre — the course lives entirely
    // WEST of the water, the pond walk keeps the east (no drowned fairways)
    g.strokeStyle = '#a8de7e'; g.lineWidth = pxW(340) - pxW(0); g.lineCap = 'round';
    g.beginPath();
    g.moveTo(pxW(gcx - 600), pyW(gcy + 500));
    g.quadraticCurveTo(pxW(gcx - 560), pyW(gcy - 40), pxW(gcx - 300), pyW(gcy - 420));
    g.stroke();
    // putting green + hole ring (matches the flag prop in ./life)
    g.fillStyle = '#b8ec8a'; g.beginPath(); g.arc(pxW(gcx - 300), pyW(gcy - 420), pxW(180) - pxW(0), 0, Math.PI * 2); g.fill();
    g.fillStyle = '#8cc961'; g.beginPath(); g.arc(pxW(gcx - 300), pyW(gcy - 420), pxW(24) - pxW(0), 0, Math.PI * 2); g.fill();
    // tee box
    g.fillStyle = '#b8ec8a'; g.fillRect(pxW(gcx - 680), pyW(gcy + 460), pxW(160) - pxW(0), pyW(120) - pyW(0));
    // bunkers
    g.fillStyle = hex(WORLD.sand);
    g.beginPath(); g.ellipse(pxW(gcx - 480), pyW(gcy + 60), pxW(110) - pxW(0), pyW(75) - pyW(0), 0.5, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(pxW(gcx - 190), pyW(gcy - 300), pxW(85) - pxW(0), pyW(60) - pyW(0), -0.4, 0, Math.PI * 2); g.fill();
    g.restore();
  }

  // ══ THE SQUARE ═══════════════════════════════════════════════════════════
  // Maple Falls' town green, block (3,2). A COURTHOUSE-SQUARE plan: a lawn
  // with a paved circle at the centre (bandstand), four diagonal walks out to
  // the corners, a formal forecourt at the north end where the town hall
  // stands, and Main Street running down the west kerb.
  //
  // The ground here is deliberately GRASS. The player is 0x9a5cff and the
  // match opens on this square; a pale-violet pavement slab under a violet
  // void is how you make the void invisible in its own first frame.
  {
    const gy0 = SQ_GREEN[1], gy1 = SQ_GREEN[3], gx0 = SQ_GREEN[0], gx1 = SQ_GREEN[2];
    const gcx = (gx0 + gx1) / 2, gcy = (gy0 + gy1) / 2;
    // the green itself, a shade brighter than the meadow so it reads mown
    g.fillStyle = '#8ddc63';
    g.fillRect(pxW(gx0), pyW(gy0), pxW(gx1 - gx0) - pxW(0), pyW(gy1 - gy0) - pyW(0));
    g.strokeStyle = 'rgba(120,170,96,0.6)'; g.lineWidth = Math.max(1.5, pxW(22) - pxW(0));
    g.strokeRect(pxW(gx0), pyW(gy0), pxW(gx1 - gx0) - pxW(0), pyW(gy1 - gy0) - pyW(0));
    // mow stripes, so the green reads MAINTAINED from the top-down camera
    g.fillStyle = 'rgba(255,255,255,0.075)';
    for (let s = 0; s < 10; s += 2) {
      g.fillRect(pxW(gx0), pyW(gy0 + (s / 10) * (gy1 - gy0)), pxW(gx1 - gx0) - pxW(0), pyW((gy1 - gy0) / 10) - pyW(0));
    }
    // perimeter walk + the four diagonals to the corners
    const WALK = '#e7e2d2';
    g.strokeStyle = WALK; g.lineCap = 'round'; g.lineJoin = 'round';
    g.lineWidth = pxW(120) - pxW(0);
    g.strokeRect(pxW(gx0 + 80), pyW(gy0 + 80), pxW(gx1 - gx0 - 160) - pxW(0), pyW(gy1 - gy0 - 160) - pyW(0));
    for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
      g.beginPath();
      g.moveTo(pxW(gcx + dx * 130), pyW(gcy + dy * 110));
      g.lineTo(pxW(gcx + dx * ((gx1 - gx0) / 2 - 100)), pyW(gcy + dy * ((gy1 - gy0) / 2 - 100)));
      g.stroke();
    }
    // the bandstand circle at the crossing
    g.fillStyle = WALK;
    g.beginPath(); g.arc(pxW(gcx), pyW(gcy), pxW(230) - pxW(0), 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(180,168,140,0.55)'; g.lineWidth = Math.max(1.5, pxW(18) - pxW(0));
    g.beginPath(); g.arc(pxW(gcx), pyW(gcy), pxW(226) - pxW(0), 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.arc(pxW(gcx), pyW(gcy), pxW(140) - pxW(0), 0, Math.PI * 2); g.stroke();
    // the town hall's forecourt at the north end, with its step lines. ./life
    // stages the mayor's rally at world y=4905 — this is the stone it stands on
    g.fillStyle = '#efeadb';
    g.fillRect(pxW(SQ_CX - 420), pyW(4790), pxW(840) - pxW(0), pyW(170) - pyW(0));
    g.strokeStyle = 'rgba(176,164,138,0.65)'; g.lineWidth = Math.max(1.5, pxW(16) - pxW(0));
    for (let s = 0; s < 3; s++) {
      g.beginPath();
      g.moveTo(pxW(SQ_CX - 330 + s * 30), pyW(4820 + s * 26));
      g.lineTo(pxW(SQ_CX + 330 - s * 30), pyW(4820 + s * 26));
      g.stroke();
    }
    // the paved apron between Main Street and the green, where the town
    // gathers, and the bare patch the parking-meter protest has worn into it
    g.fillStyle = '#e2ddcd';
    g.fillRect(pxW(6120), pyW(gy0 - 60), pxW(190) - pxW(0), pyW(gy1 - gy0 + 120) - pyW(0));
    g.fillStyle = 'rgba(186,166,116,0.45)';
    g.beginPath(); g.ellipse(pxW(6300), pyW(5090), pxW(190) - pxW(0), pyW(140) - pyW(0), 0.2, 0, Math.PI * 2); g.fill();
  }

  // LAKESIDE's sand runs to the WATERLINE, not to the block grid. The 6x6 grid
  // stops at world y=11075 and the south coast runs on to 11610, so the old
  // fill left a band of meadow green between the beach and the sea.
  {
    g.fillStyle = hex(WORLD.sand);
    g.fillRect(pxW(600), pyW(11060), pxW(9200) - pxW(0), pyW(1300) - pyW(0));
  }

  // BEACH BOARDWALK — a continuous plank promenade along the top of the whole
  // beach strip, with scattered bright towels on the sand below it
  {
    const bwY0 = 9475, bwY1 = 9660;
    const bx0 = 925, bx1 = 9365;
    g.fillStyle = '#e2b378';
    g.fillRect(pxW(bx0), pyW(bwY0), pxW(bx1) - pxW(bx0), pyW(bwY1) - pyW(bwY0));
    g.strokeStyle = 'rgba(160,110,60,0.35)'; g.lineWidth = Math.max(1, pxW(8) - pxW(0));
    for (let bx = bx0; bx < bx1; bx += 55) {   // plank joints
      g.beginPath(); g.moveTo(pxW(bx), pyW(bwY0)); g.lineTo(pxW(bx), pyW(bwY1)); g.stroke();
    }
    g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = Math.max(1.5, pxW(14) - pxW(0));
    g.beginPath(); g.moveTo(pxW(bx0), pyW(bwY0)); g.lineTo(pxW(bx1), pyW(bwY0)); g.stroke();
    g.beginPath(); g.moveTo(pxW(bx0), pyW(bwY1)); g.lineTo(pxW(bx1), pyW(bwY1)); g.stroke();
    // the promenade YIELDS to the roads that cross it (deck-over-road trick)
    g.strokeStyle = hex(WORLD.road); g.lineWidth = roadPx; g.lineCap = 'butt';
    for (const rc2 of [2580, 4290, 6000, 7710]) {
      g.beginPath(); g.moveTo(pxW(rc2), pyW(bwY0 - 20)); g.lineTo(pxW(rc2), pyW(bwY1 + 20)); g.stroke();
    }
    // sun-baked sand: warm mottling so the strip doesn't read as one flat slab
    for (let i = 0; i < 1400; i++) {
      const mx = 1100 + Math.random() * 7900, my = 9700 + Math.random() * 1050;
      if (!insideIslandWorld(mx, my)) continue;
      g.fillStyle = i % 3 ? 'rgba(230,200,140,0.22)' : 'rgba(255,255,255,0.07)';
      const mr = (pxW(10) - pxW(0)) * (0.5 + Math.random());
      g.beginPath(); g.arc(pxW(mx), pyW(my), mr, 0, Math.PI * 2); g.fill();
    }
    // towels: bright rounded rects angled on the sand, each with a sun shadow
    const towelCols = ['#ff6a5e', '#4db07a', '#4d7de8', '#f0c050', '#f06fb0', '#5ec8d8'];
    for (let i = 0; i < 34; i++) {
      const twx = 1100 + Math.random() * 7900, twy = 9760 + Math.random() * 900;
      if (!insideIslandWorld(twx, twy)) continue;
      if ([2580, 4290, 6000, 7710].some((rc2) => Math.abs(twx - rc2) < 180)) continue;   // not on the beach roads
      if (Math.hypot(twx - LAGOON.x, (twy - LAGOON.y) * 1.35) < LAGOON.rx + 160) continue;
      g.save(); g.translate(pxW(twx), pyW(twy)); g.rotate(Math.random() * 0.8 - 0.4);
      // offset shadow first (sun from NW — matches the 3D sun)
      g.fillStyle = 'rgba(90,70,40,0.18)';
      g.fillRect(-(pxW(55) - pxW(0)) + (pxW(14) - pxW(0)), -(pxW(90) - pxW(0)) + (pxW(16) - pxW(0)), pxW(110) - pxW(0), pxW(180) - pxW(0));
      g.fillStyle = towelCols[i % towelCols.length];
      g.fillRect(-(pxW(55) - pxW(0)), -(pxW(90) - pxW(0)), pxW(110) - pxW(0), pxW(180) - pxW(0));
      g.fillStyle = 'rgba(255,255,255,0.55)';
      g.fillRect(-(pxW(55) - pxW(0)), -(pxW(90) - pxW(0)), pxW(110) - pxW(0), pxW(26) - pxW(0));
      g.restore();
    }
  }

  // ══ MAPLE FALLS HIGH ═════════════════════════════════════════════════════
  // The 2x2 campus, blocks (4..5, 3..4). MEASURED CONSTRAINT: the river runs
  // down world x≈8220..8460 through the whole of column gx=4, so the stadium —
  // the widest flat thing in the level — cannot live on the block ./life plays
  // its ball game on. It sits on (5,3) instead, east of the creek, and (4,3)
  // keeps a plain lined PRACTICE field drawn to exactly match the pitch plane
  // ./life lays down at that block centre.
  {
    const sx1 = blockCenter(5), sy1 = blockCenter(3);
    g.save();
    g.beginPath();
    g.rect(pxW(sx1 - BLOCK_SIZE / 2), pyW(sy1 - BLOCK_SIZE / 2), pxW(BLOCK_SIZE) - pxW(0), pyW(BLOCK_SIZE) - pyW(0));
    g.clip();
    // the running track: a rounded rectangle of clay around the field
    g.strokeStyle = '#c4643f'; g.lineWidth = pxW(190) - pxW(0); g.lineJoin = 'round'; g.lineCap = 'round';
    g.beginPath();
    g.moveTo(pxW(sx1 - 480), pyW(sy1 - 300)); g.lineTo(pxW(sx1 + 480), pyW(sy1 - 300));
    g.lineTo(pxW(sx1 + 480), pyW(sy1 + 300)); g.lineTo(pxW(sx1 - 480), pyW(sy1 + 300));
    g.closePath(); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = Math.max(1.2, pxW(12) - pxW(0));
    for (const inset of [-58, 0, 58]) {
      g.beginPath();
      g.moveTo(pxW(sx1 - 480), pyW(sy1 - 300 + inset)); g.lineTo(pxW(sx1 + 480), pyW(sy1 - 300 + inset)); g.stroke();
      g.beginPath();
      g.moveTo(pxW(sx1 - 480), pyW(sy1 + 300 - inset)); g.lineTo(pxW(sx1 + 480), pyW(sy1 + 300 - inset)); g.stroke();
    }
    // the field
    g.fillStyle = '#63b84e';
    g.fillRect(pxW(sx1 - 480), pyW(sy1 - 250), pxW(960) - pxW(0), pyW(500) - pyW(0));
    for (let s2 = 0; s2 < 8; s2 += 2) {   // mow bands down the field
      g.fillStyle = 'rgba(255,255,255,0.075)';
      g.fillRect(pxW(sx1 - 480 + (s2 / 8) * 960), pyW(sy1 - 250), pxW(960 / 8) - pxW(0), pyW(500) - pyW(0));
    }
    // end zones in the school colours
    g.fillStyle = '#2f4a7a';
    g.fillRect(pxW(sx1 - 480), pyW(sy1 - 250), pxW(130) - pxW(0), pyW(500) - pyW(0));
    g.fillRect(pxW(sx1 + 350), pyW(sy1 - 250), pxW(130) - pxW(0), pyW(500) - pyW(0));
    // yard lines + hash marks
    g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = Math.max(1.5, pxW(14) - pxW(0));
    g.strokeRect(pxW(sx1 - 480), pyW(sy1 - 250), pxW(960) - pxW(0), pyW(500) - pyW(0));
    for (let s2 = 0; s2 <= 10; s2++) {
      const yx = sx1 - 350 + (s2 / 10) * 700;
      g.beginPath(); g.moveTo(pxW(yx), pyW(sy1 - 250)); g.lineTo(pxW(yx), pyW(sy1 + 250)); g.stroke();
    }
    g.lineWidth = Math.max(1, pxW(9) - pxW(0));
    for (let s2 = 0; s2 < 50; s2++) {
      const yx = sx1 - 350 + (s2 / 50) * 700;
      for (const hy of [-80, 80]) {
        g.beginPath(); g.moveTo(pxW(yx), pyW(sy1 + hy - 16)); g.lineTo(pxW(yx), pyW(sy1 + hy + 16)); g.stroke();
      }
    }
    // the 50-yard-line maple leaf, in navy
    g.fillStyle = 'rgba(47,74,122,0.75)';
    g.beginPath(); g.arc(pxW(sx1), pyW(sy1), pxW(96) - pxW(0), 0, Math.PI * 2); g.fill();
    g.restore();
  }
  {
    // the PRACTICE field on (4,3), drawn to the same rectangle ./life's pitch
    // plane covers, so the two agree instead of z-fighting
    const px2 = blockCenter(4), py2 = blockCenter(3);
    g.fillStyle = '#6fc255';
    g.fillRect(pxW(px2 - 320), pyW(py2 - 220), pxW(640) - pxW(0), pyW(440) - pyW(0));
    g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = Math.max(1.5, pxW(13) - pxW(0));
    g.strokeRect(pxW(px2 - 300), pyW(py2 - 200), pxW(600) - pxW(0), pyW(400) - pyW(0));
    g.beginPath(); g.moveTo(pxW(px2), pyW(py2 - 200)); g.lineTo(pxW(px2), pyW(py2 + 200)); g.stroke();
    g.beginPath(); g.arc(pxW(px2), pyW(py2), pxW(70) - pxW(0), 0, Math.PI * 2); g.stroke();
    // the SCHOOL's drive and bus loop on (5,4)
    const scx2 = blockCenter(5), scy2 = blockCenter(4);
    g.fillStyle = '#9aa0ac';
    g.fillRect(pxW(scx2 - 620), pyW(scy2 + 120), pxW(1240) - pxW(0), pyW(420) - pyW(0));
    g.strokeStyle = 'rgba(255,210,60,0.7)'; g.lineWidth = Math.max(1.5, pxW(18) - pxW(0));
    g.beginPath(); g.moveTo(pxW(scx2 - 600), pyW(scy2 + 330)); g.lineTo(pxW(scx2 + 600), pyW(scy2 + 330)); g.stroke();
    // the STUDENT LOT on (4,4), east of the creek
    const lx = 8880, ly = blockCenter(4) - 190;
    g.fillStyle = '#9aa0ac';
    g.fillRect(pxW(lx - 380), pyW(ly - 380), pxW(760) - pxW(0), pyW(760) - pyW(0));
    g.strokeStyle = 'rgba(255,255,255,0.62)'; g.lineWidth = Math.max(1.2, pxW(12) - pxW(0));
    for (let s2 = 0; s2 <= 8; s2++) {
      const sy2 = ly - 380 + (s2 / 8) * 760;
      g.beginPath(); g.moveTo(pxW(lx - 360), pyW(sy2)); g.lineTo(pxW(lx - 40), pyW(sy2)); g.stroke();
      g.beginPath(); g.moveTo(pxW(lx + 40), pyW(sy2)); g.lineTo(pxW(lx + 360), pyW(sy2)); g.stroke();
    }
  }

  // ══ THE FAIRGROUNDS ══════════════════════════════════════════════════════
  // Maple County Fair, blocks (0..2, 1). A trampled-earth MIDWAY runs the
  // whole width with tent pads either side of it, a show ring at the east end
  // and a parking meadow behind. A straight axis is what makes a fair read as
  // a fair from above instead of a scatter of cones.
  {
    const my = blockCenter(1);
    const mx0 = blockCenter(0) - 700, mx1 = blockCenter(2) + 700;
    g.fillStyle = '#b8a473';
    g.fillRect(pxW(mx0), pyW(my - 260), pxW(mx1 - mx0) - pxW(0), pyW(520) - pyW(0));
    g.strokeStyle = 'rgba(250,244,220,0.55)'; g.lineWidth = Math.max(1.5, pxW(22) - pxW(0));
    g.strokeRect(pxW(mx0), pyW(my - 260), pxW(mx1 - mx0) - pxW(0), pyW(520) - pyW(0));
    // tent pads, a straight row either side of the midway
    for (let s = 0; s < 12; s++) {
      const tx = mx0 + 260 + s * 500;
      if (tx > mx1 - 200) break;
      for (const side of [-1, 1]) {
        g.fillStyle = 'rgba(214,198,158,0.9)';
        g.beginPath(); g.arc(pxW(tx), pyW(my + side * 420), pxW(190) - pxW(0), 0, Math.PI * 2); g.fill();
      }
    }
    // the show ring at the east end
    g.fillStyle = '#cbb98c';
    g.beginPath(); g.ellipse(pxW(blockCenter(2) + 420), pyW(my + 560), pxW(430) - pxW(0), pyW(320) - pyW(0), 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = Math.max(1.5, pxW(22) - pxW(0));
    g.beginPath(); g.ellipse(pxW(blockCenter(2) + 420), pyW(my + 560), pxW(430) - pxW(0), pyW(320) - pyW(0), 0, 0, Math.PI * 2); g.stroke();
    // the parking meadow: rows of tyre-flattened grass north of the midway
    g.strokeStyle = 'rgba(150,140,100,0.35)'; g.lineWidth = Math.max(1.5, pxW(60) - pxW(0));
    for (let s = 0; s < 7; s++) {
      const ry = my - 640 - s * 105;
      g.beginPath(); g.moveTo(pxW(blockCenter(0) - 400), pyW(ry)); g.lineTo(pxW(blockCenter(2) + 300), pyW(ry)); g.stroke();
    }
  }

  // ══ THE FARM ═════════════════════════════════════════════════════════════
  // Blocks (3,0) and (3..5, 1) — the bottomland east of town, along the rail
  // spur and the river. Big FIELD STRIPS in four crop colours, a corn maze cut
  // as a spiral, and the pumpkin patch. Strips read as agriculture instantly;
  // a green square with a barn on it never will.
  for (const [fgx, fgy] of [[3, 0], [3, 1], [4, 1], [5, 1]] as [number, number][]) {
    const cx2 = blockCenter(fgx), cy2 = blockCenter(fgy);
    g.save();
    g.beginPath();
    g.rect(pxW(cx2 - BLOCK_SIZE / 2), pyW(cy2 - BLOCK_SIZE / 2), pxW(BLOCK_SIZE) - pxW(0), pyW(BLOCK_SIZE) - pyW(0));
    g.clip();
    const CROP = ['#8fbf4e', '#cfa94a', '#a8c96a', '#b78f52', '#dcc76a'];
    for (let s = 0; s < 7; s++) {
      const y0f = cy2 - 800 + s * 230;
      g.fillStyle = CROP[(fgx * 3 + fgy * 2 + s) % CROP.length];
      g.fillRect(pxW(cx2 - 800), pyW(y0f), pxW(1600) - pxW(0), pyW(230) - pyW(0));
      // plough lines down each strip
      g.strokeStyle = 'rgba(90,70,40,0.13)'; g.lineWidth = Math.max(1, pxW(9) - pxW(0));
      for (let k = 0; k < 9; k++) {
        const ly2 = y0f + 12 + k * 25;
        g.beginPath(); g.moveTo(pxW(cx2 - 800), pyW(ly2)); g.lineTo(pxW(cx2 + 800), pyW(ly2)); g.stroke();
      }
    }
    // field boundaries
    g.strokeStyle = 'rgba(96,120,60,0.4)'; g.lineWidth = Math.max(1.5, pxW(26) - pxW(0));
    for (let s = 0; s <= 7; s++) {
      const yb = cy2 - 800 + s * 230;
      g.beginPath(); g.moveTo(pxW(cx2 - 800), pyW(yb)); g.lineTo(pxW(cx2 + 800), pyW(yb)); g.stroke();
    }
    g.restore();
  }
  {
    // THE CORN MAZE — a cut spiral on (3,1). Kids find this on the map.
    const mzx = blockCenter(3), mzy = blockCenter(1);
    g.fillStyle = '#5f9a34';
    g.beginPath(); g.arc(pxW(mzx), pyW(mzy), pxW(560) - pxW(0), 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#d8c98a'; g.lineWidth = pxW(90) - pxW(0); g.lineCap = 'round';
    g.beginPath();
    for (let t = 0; t < 1; t += 0.004) {
      const a2 = t * Math.PI * 7, r2 = 60 + t * 480;
      const mxp = pxW(mzx + Math.cos(a2) * r2), myp = pyW(mzy + Math.sin(a2) * r2);
      if (t === 0) g.moveTo(mxp, myp); else g.lineTo(mxp, myp);
    }
    g.stroke();
    // THE PUMPKIN PATCH on (4,1): dark tilled soil in short rows
    const ppx = blockCenter(4), ppy = blockCenter(1) + 460;
    g.fillStyle = '#7d5c36';
    g.fillRect(pxW(ppx - 620), pyW(ppy - 230), pxW(1240) - pxW(0), pyW(460) - pyW(0));
    g.strokeStyle = 'rgba(50,36,20,0.3)'; g.lineWidth = Math.max(1.5, pxW(26) - pxW(0));
    for (let s = 0; s < 8; s++) {
      const ry = ppy - 200 + s * 58;
      g.beginPath(); g.moveTo(pxW(ppx - 600), pyW(ry)); g.lineTo(pxW(ppx + 600), pyW(ry)); g.stroke();
    }
  }

  // ══ THE STRIP ════════════════════════════════════════════════════════════
  // Blocks (0, 2..4): the highway into Maple Falls. Gravel forecourts and
  // asphalt aprons stacked down the road at x=2580, plus the drive-in's fan of
  // parking ramps — which is the shape that makes a drive-in a drive-in.
  {
    const sx0 = blockCenter(0);
    for (const sgy of [2, 3, 4]) {
      const sy = blockCenter(sgy);
      g.fillStyle = '#adb2b8';   // the apron along the road frontage
      g.fillRect(pxW(sx0 + 240), pyW(sy - 620), pxW(560) - pxW(0), pyW(1240) - pyW(0));
      g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = Math.max(1.2, pxW(12) - pxW(0));
      for (let s = 0; s < 9; s++) {
        const py3 = sy - 560 + s * 140;
        g.beginPath(); g.moveTo(pxW(sx0 + 420), pyW(py3)); g.lineTo(pxW(sx0 + 780), pyW(py3)); g.stroke();
      }
      // dust and gravel behind it
      g.fillStyle = 'rgba(190,178,146,0.55)';
      g.fillRect(pxW(sx0 - 700), pyW(sy - 620), pxW(920) - pxW(0), pyW(1240) - pyW(0));
    }
    // THE DRIVE-IN, on (0,3): the fan of viewing ramps facing the screen
    const dx = sx0 - 180, dy = blockCenter(3);
    g.fillStyle = '#8f8a7e';
    g.beginPath(); g.ellipse(pxW(dx), pyW(dy), pxW(620) - pxW(0), pyW(520) - pyW(0), 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(60,54,44,0.35)'; g.lineWidth = Math.max(1.5, pxW(46) - pxW(0));
    for (let s = 1; s < 7; s++) {
      g.beginPath();
      g.ellipse(pxW(dx), pyW(dy), pxW(90 + s * 82) - pxW(0), pyW(80 + s * 68) - pyW(0), 0, -1.15, 1.15);
      g.stroke();
    }
    g.fillStyle = 'rgba(240,236,226,0.75)';   // the screen's concrete pad
    g.fillRect(pxW(dx + 560), pyW(dy - 300), pxW(90) - pxW(0), pyW(600) - pyW(0));
  }

  // train tracks (ballast + twin rails + ties) around downtown
  const railPath = () => {
    // paint the ballast along the SAME catmull curve the train drives —
    // straight-segment paint let the train cut corners across the grass
    g.beginPath();
    for (let t = 0; t <= 96; t++) {
      const pt = railPointAt(t / 96);
      const wx = pt.x / SCALE + CX, wy = pt.z / SCALE + CZ;
      if (t === 0) g.moveTo(pxW(wx), pyW(wy)); else g.lineTo(pxW(wx), pyW(wy));
    }
    g.closePath();
  };
  g.lineJoin = 'round'; g.lineCap = 'round';
  g.strokeStyle = '#8a8f9c'; g.lineWidth = pxW(104) - pxW(0); railPath(); g.stroke();   // slim gravel ballast (cool gray, not dirt)
  g.strokeStyle = 'rgba(58,58,66,0.85)'; g.lineWidth = Math.max(2, (pxW(104) - pxW(0)) * 0.14);
  g.setLineDash([(pxW(60) - pxW(0)), (pxW(40) - pxW(0))]); railPath(); g.stroke();       // ties
  g.setLineDash([]);
  g.strokeStyle = '#c7ccd6'; g.lineWidth = Math.max(1.5, (pxW(104) - pxW(0)) * 0.1); railPath(); g.stroke(); // rail sheen

    // ── RIVER, drawn as a real waterway ────────────────────────────────────
  // It used to be straight lineTo segments with round caps, so short spans
  // rendered as hard-edged PILLS and every bend was a visible kink. Now the
  // channel follows a smoothed midpoint-quadratic curve (the same technique
  // as the coastline), and the banks are layered wide-to-narrow with soft
  // alpha so the water fades into the land instead of stamping onto it.
  const riverPath = () => {
    g.beginPath();
    const P = RIVER;
    g.moveTo(pxW(P[0][0]), pyW(P[0][1]));
    for (let i = 1; i < P.length - 1; i++) {
      const mx = (P[i][0] + P[i + 1][0]) / 2, my = (P[i][1] + P[i + 1][1]) / 2;
      g.quadraticCurveTo(pxW(P[i][0]), pyW(P[i][1]), pxW(mx), pyW(my));
    }
    const L = P[P.length - 1];
    g.lineTo(pxW(L[0]), pyW(L[1]));
  };
  const riverStroke = (col: string, w: number) => {
    g.strokeStyle = col; g.lineWidth = pxW(w) - pxW(0);
    riverPath(); g.stroke();
  };
  g.lineJoin = 'round'; g.lineCap = 'round';

  // spring source: three offset lobes, so the head of the river reads as a
  // pool seeping out of the forest rather than a stamped ellipse
  {
    const [sx2, sy2] = RIVER[0];
    for (const [ox, oy, rr, col] of [
      [0, 0, 215, 'rgba(77,138,160,0.55)'], [-70, 40, 165, 'rgba(77,138,160,0.75)'],
      [60, -30, 150, 'rgba(77,138,160,0.75)'],
    ] as [number, number, number, string][]) {
      g.fillStyle = col;
      g.beginPath(); g.ellipse(pxW(sx2 + ox), pyW(sy2 + oy), pxW(rr) - pxW(0), pyW(rr * 0.8) - pyW(0), 0, 0, Math.PI * 2); g.fill();
    }
    g.fillStyle = hex(WORLD.riverMid);
    g.beginPath(); g.ellipse(pxW(sx2), pyW(sy2), pxW(150) - pxW(0), pyW(120) - pyW(0), 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = hex(WORLD.riverDeep);
    g.beginPath(); g.ellipse(pxW(sx2 - 10), pyW(sy2 + 8), pxW(82) - pxW(0), pyW(64) - pyW(0), 0, 0, Math.PI * 2); g.fill();
  }

  // pond sand bank — UNDER the river so the channel flows over it
  g.fillStyle = 'rgba(230,212,148,0.9)';
  g.beginPath(); g.ellipse(pxW(POND[0]), pyW(POND[1]), pxW(POND[2] + 46) - pxW(0), pyW(POND[2] + 46) - pyW(0), 0, 0, Math.PI * 2); g.fill();

  // banks: wide + translucent first so the edge dissolves, then the channel
  riverStroke('rgba(120,170,150,0.30)', 196);    // damp grass fringe
  riverStroke('rgba(214,206,166,0.45)', 168);    // wet sand shoulder
  riverStroke('rgba(77,138,160,0.85)', 140);     // shallow bank
  riverStroke(hex(WORLD.riverMid), 118);         // water
  riverStroke(hex(WORLD.riverDeep), 58);         // deep channel
  // foam sparkle: narrow and broken, riding the middle (was 128 wide — nearly
  // the whole river, which washed the colour straight out of it)
  g.strokeStyle = 'rgba(233,246,255,0.30)'; g.lineWidth = pxW(30) - pxW(0);
  g.setLineDash([pxW(70) - pxW(0), pxW(210) - pxW(0)]);
  riverPath(); g.stroke(); g.setLineDash([]);

  // pond water + deep centre — over the river so the junction reads as ONE body
  g.fillStyle = 'rgba(77,138,160,0.8)';
  g.beginPath(); g.ellipse(pxW(POND[0]), pyW(POND[1]), pxW(POND[2] + 22) - pxW(0), pyW(POND[2] + 22) - pyW(0), 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = hex(WORLD.riverMid);
  g.beginPath(); g.ellipse(pxW(POND[0]), pyW(POND[1]), pxW(POND[2]) - pxW(0), pyW(POND[2]) - pyW(0), 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = hex(WORLD.riverDeep);
  g.beginPath(); g.ellipse(pxW(POND[0]), pyW(POND[1]), pxW(POND[2] * 0.55) - pxW(0), pyW(POND[2] * 0.55) - pyW(0), 0, 0, Math.PI * 2); g.fill();
  // lagoon
  g.fillStyle = hex(WORLD.waterShallow);
  g.beginPath(); g.ellipse(pxW(LAGOON.x), pyW(LAGOON.y), pxW(LAGOON.rx) - pxW(0), pyW(LAGOON.ry) - pyW(0), 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = hex(WORLD.waterDeep);
  g.beginPath(); g.ellipse(pxW(LAGOON.x), pyW(LAGOON.y), (pxW(LAGOON.rx) - pxW(0)) * 0.6, (pyW(LAGOON.ry) - pyW(0)) * 0.6, 0, 0, Math.PI * 2); g.fill();

  // bridge decks — repaint the road over the river at each crossing, with pale
  // deck edging, so roads read as BRIDGES instead of drowning under the water
  {
    // approximate river x at each horizontal road, from the RIVER polyline
    const riverXAt = (wy: number) => {
      for (let i = 0; i < RIVER.length - 1; i++) {
        const [x0, y0] = RIVER[i], [x1, y1] = RIVER[i + 1];
        if ((wy >= y0 && wy <= y1) || (wy >= y1 && wy <= y0)) {
          const t = (wy - y0) / ((y1 - y0) || 1);
          return x0 + t * (x1 - x0);
        }
      }
      return null;
    };
    const deckHalf = pxW(230) - pxW(0);
    g.lineCap = 'butt';
    for (const c of ROAD_CENTERS) {
      const rx = riverXAt(c);
      if (rx == null) continue;
      const bx = pxW(rx), by = pyW(c);
      g.strokeStyle = '#cfd4de'; g.lineWidth = roadPx * 1.24;   // deck edging
      g.beginPath(); g.moveTo(bx - deckHalf, by); g.lineTo(bx + deckHalf, by); g.stroke();
      g.strokeStyle = hex(WORLD.road); g.lineWidth = roadPx;    // deck asphalt
      g.beginPath(); g.moveTo(bx - deckHalf, by); g.lineTo(bx + deckHalf, by); g.stroke();
    }
  }

  // the square's fountain — the SE quadrant of the green, mirroring the war
  // memorial in the SW. Symmetry is what makes a civic space read as designed.
  {
    const fx2 = pxW(7230), fy2 = pyW(5680);
    const rOuter = pxW(190) - pxW(0);
    g.fillStyle = hex(WORLD.pavement); g.beginPath(); g.arc(fx2, fy2, rOuter * 1.35, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#c9cdd9'; g.lineWidth = rOuter * 0.12; g.beginPath(); g.arc(fx2, fy2, rOuter, 0, Math.PI * 2); g.stroke();
    g.fillStyle = hex(WORLD.waterShallow); g.beginPath(); g.arc(fx2, fy2, rOuter * 0.88, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(233,246,255,0.55)'; g.beginPath(); g.arc(fx2, fy2, rOuter * 0.12, 0, Math.PI * 2); g.fill();
  }


  // THE 4-H PADDOCKS — block (5,1), the farm's east end. ./life tethers its
  // wandering livestock to this exact block centre and this file cannot move
  // them, so the pens are drawn to meet the animals: two grazing paddocks, a
  // duck pond, and a lane between them.
  {
    const zcx = blockCenter(5), zcy = blockCenter(1);
    g.save(); g.beginPath();
    g.rect(pxW(zcx - BLOCK_SIZE / 2), pyW(zcy - BLOCK_SIZE / 2), pxW(BLOCK_SIZE) - pxW(0), pyW(BLOCK_SIZE) - pyW(0));
    g.clip();
    g.strokeStyle = hex(WORLD.dirtPath); g.lineWidth = pxW(150) - pxW(0); g.lineJoin = 'round'; g.lineCap = 'round';
    g.beginPath();
    g.moveTo(pxW(zcx - 800), pyW(zcy)); g.lineTo(pxW(zcx + 700), pyW(zcy));   // the farm lane
    g.stroke();
    const pen = (px0: number, py0: number, wns: number, hns: number, col: string) => {
      g.fillStyle = col;
      g.fillRect(pxW(px0), pyW(py0), pxW(wns) - pxW(0), pyW(hns) - pyW(0));
      g.strokeStyle = 'rgba(120,100,60,0.45)'; g.lineWidth = Math.max(1.5, pxW(18) - pxW(0));
      g.strokeRect(pxW(px0), pyW(py0), pxW(wns) - pxW(0), pyW(hns) - pyW(0));
    };
    pen(zcx - 560, zcy - 620, 520, 380, '#a8cf72');            // grazing paddock, north
    pen(zcx - 560, zcy + 240, 520, 380, '#9ac468');            // grazing paddock, south
    pen(zcx - 20, zcy - 200, 440, 400, '#b8c28a');             // the mud yard
    g.fillStyle = hex(WORLD.waterShallow);                      // the duck pond in it
    g.beginPath(); g.ellipse(pxW(zcx + 200), pyW(zcy), pxW(150) - pxW(0), pyW(115) - pyW(0), 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.35)';
    g.beginPath(); g.ellipse(pxW(zcx + 165), pyW(zcy - 25), pxW(45) - pxW(0), pyW(22) - pyW(0), 0.4, 0, Math.PI * 2); g.fill();
    g.restore();
  }

  // FOREST CAMPSITE — dirt clearing + trail so the camp sits in a real glade
  {
    const ccx = blockCenter(4), ccy = blockCenter(0);
    g.fillStyle = hex(WORLD.dirtPath);
    g.beginPath(); g.ellipse(pxW(ccx - 100), pyW(ccy + 60), pxW(330) - pxW(0), pyW(260) - pyW(0), 0.3, 0, Math.PI * 2); g.fill();
    g.strokeStyle = hex(WORLD.dirtPath); g.lineWidth = pxW(70) - pxW(0); g.lineCap = 'round';
    g.beginPath(); g.moveTo(pxW(ccx - 100), pyW(ccy + 300)); g.quadraticCurveTo(pxW(ccx - 300), pyW(ccy + 600), pxW(ccx - 200), pyW(blockCenter(0) + BLOCK_SIZE / 2)); g.stroke();
  }

  // BEACH VOLLEYBALL COURT — lined sand court under the net event at (2,5)
  {
    const vcx = blockCenter(2), vcy = blockCenter(5) + 180;
    g.fillStyle = '#fbeab2';
    g.fillRect(pxW(vcx - 200), pyW(vcy - 130), pxW(400) - pxW(0), pyW(260) - pyW(0));
    g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = Math.max(1.5, pxW(12) - pxW(0));
    g.strokeRect(pxW(vcx - 180), pyW(vcy - 110), pxW(360) - pxW(0), pyW(220) - pyW(0));
    g.beginPath(); g.moveTo(pxW(vcx), pyW(vcy - 110)); g.lineTo(pxW(vcx), pyW(vcy + 110)); g.stroke();
  }

  // LAKESIDE — the boat ramp and its little parking apron on the south shore
  {
    const bx = 7100, by = 11150;
    g.fillStyle = '#d3d0c6';
    g.fillRect(pxW(bx - 110), pyW(by), pxW(220) - pxW(0), pyW(700) - pyW(0));   // the ramp into the water
    g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = Math.max(1.5, pxW(16) - pxW(0));
    g.beginPath(); g.moveTo(pxW(bx), pyW(by)); g.lineTo(pxW(bx), pyW(by + 700)); g.stroke();
    g.fillStyle = '#bdb9ad';
    g.fillRect(pxW(bx - 480), pyW(by - 380), pxW(960) - pxW(0), pyW(340) - pyW(0));
    g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = Math.max(1.2, pxW(12) - pxW(0));
    for (let s = 0; s <= 6; s++) {   // trailer bays: long, because they hold trailers
      const tx = bx - 460 + (s / 6) * 920;
      g.beginPath(); g.moveTo(pxW(tx), pyW(by - 370)); g.lineTo(pxW(tx), pyW(by - 60)); g.stroke();
    }
  }

  g.restore(); // end island clip

  // coast: sand band + white foam rim, stroked along the silhouette
  g.lineJoin = 'round';
  g.strokeStyle = 'rgba(246,227,164,0.9)'; g.lineWidth = TEX * 0.02;
  g.beginPath(); g.moveTo(px(sil3[0].x), py(sil3[0].y));
  for (const p of sil3) g.lineTo(px(p.x), py(p.y));
  g.closePath(); g.stroke();
  g.strokeStyle = '#ffffff'; g.lineWidth = TEX * 0.011;
  g.beginPath(); g.moveTo(px(sil3[0].x), py(sil3[0].y));
  for (const p of sil3) g.lineTo(px(p.x), py(p.y));
  g.closePath(); g.stroke();

  }   // ← end of the Maple-only ground detail (roads, blocks, districts)

  await breathe('Painting the streets…');
  // ══ LEAF LITTER — MAPLE FALLS ═══════════════════════════════════════════
  // An autumn town with not one fallen leaf on it. This is the last thing
  // painted into the bake, and it has to be, because the first attempt went in
  // beside the lawn tone at the top of the maple block and THE SQUARE repainted
  // straight over it 280 lines later — so the one district the match actually
  // opens in was the one district that got no leaves. Photographed to be sure
  // (qa/_dumpbake.mjs writes the bake out; the drifts were there in the
  // residential blocks and absent from the square).
  //
  // AND THE FIRST VERSION PAINTED THE WRONG OBJECT. It drew individual leaves
  // at 0.16-0.34 units, which is roughly the size of a real maple leaf at this
  // game's scale. This bake carries 3072px across ~650 3D units — 4.7 texels
  // per unit — so a real leaf is ONE TEXEL, sub-pixel after filtering, and
  // invisible at any camera distance. That is not a tuning problem, it is a
  // representable-object problem: the bake cannot hold a leaf.
  //
  // It can hold a DRIFT. So that is what this paints: piles 3-7 units across,
  // built from overlapping lobes so the edge frays instead of ending on a disc,
  // gathered where leaves gather. At the play camera a drift is a couple of
  // hundred screen pixels, which is the scale the eye reads as leaf litter
  // anyway — nobody sees individual leaves from forty feet up either.
  //
  // Mean held on purpose: qa/ground.mjs reported 0.623 before any of this and
  // the warm paint is kept sparse enough to leave it there. island.ts has blown
  // this level's exposure out twice before by stacking alpha.
  if (WORLD_ID === 'maple') {
    let _ds = 0x1eaf5;
    const dr = () => {
      _ds |= 0; _ds = (_ds + 0x6D2B79F5) | 0;
      let t = Math.imul(_ds ^ (_ds >>> 15), 1 | _ds);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const drange = (a: number, b: number) => a + dr() * (b - a);
    const U = TEX / W3;                       // canvas px per 3D unit
    const LEAF = ['#c4622c', '#d98a34', '#b03f2a', '#e0a63c', '#a86b30'];
    const GRASSY: Biome[] = ['cozy', 'fancy', 'plaza', 'park', 'forest'];
    g.save();
    g.beginPath();
    g.moveTo(px(sil3[0].x), py(sil3[0].y));
    for (const pt of sil3) g.lineTo(px(pt.x), py(pt.y));
    g.closePath(); g.clip();
    for (let gy = 0; gy < 6; gy++) for (let gx = 0; gx < 6; gx++) {
      // ── LEAVES GO ON GRASS. ONLY ON GRASS. ────────────────────────────────
      // The first version put a thinner scatter on the paved blocks too, on
      // the reasoning that leaves blow onto paths and nobody sweeps a whole
      // town. That reasoning is fine and the RESULT was not: warm translucent
      // blobs on a pale cream plaza do not read as leaves, they read as
      // STAINS — spilled coffee, or something a dog did. Photographed at 2x
      // over the fountain plaza and it is the first thing the eye finds.
      //
      // The difference is contrast. On grass a warm patch is a colour the eye
      // already expects from a tree above it. On pale stone the same patch is
      // the only dirty thing in the frame, and dirt is what it becomes.
      // So: grass only, and fewer of them there too — the first pass put 26-40
      // piles in every block, which on the open lawns beside the square was a
      // rash rather than a drift.
      const grassy = GRASSY.includes(PLAN[gy][gx]);
      if (!grassy) continue;
      const piles = 9 + Math.floor(dr() * 7);
      const cxB = blockCenter(gx), cyB = blockCenter(gy);
      const x0 = pxW(cxB - BLOCK_SIZE / 2), y0 = pyW(cyB - BLOCK_SIZE / 2);
      const bw = pxW(cxB + BLOCK_SIZE / 2) - x0, bh = pyW(cyB + BLOCK_SIZE / 2) - y0;
      for (let d = 0; d < piles; d++) {
        const dx = x0 + dr() * bw, dy = y0 + dr() * bh;
        const R = drange(1.6, 3.6) * U;        // the drift's own radius, in 3D units
        const lobes = 6 + Math.floor(dr() * 9);
        const col = LEAF[Math.floor(dr() * LEAF.length)];
        for (let i = 0; i < lobes; i++) {
          // two uniforms averaged: dense in the middle, frayed at the rim
          const ox = (dr() + dr() - 1) * R, oy = (dr() + dr() - 1) * R;
          g.fillStyle = i % 3 === 0 ? LEAF[Math.floor(dr() * LEAF.length)] : col;
          g.globalAlpha = drange(0.10, 0.22);   // was 0.16-0.34: a tint, not a spill
          const lw = drange(0.5, 1.15) * U;
          g.beginPath();
          g.ellipse(dx + ox, dy + oy, lw, lw * drange(0.55, 0.9), dr() * Math.PI, 0, Math.PI * 2);
          g.fill();
        }
      }
    }
    g.globalAlpha = 1;
    g.restore();
  }

  const groundTex = new THREE.CanvasTexture(cv);
  // 16 on phones too. At 4, ground receding from the camera turned to mush —
  // the boardwalk planks and lane lines at the top of the screen were the
  // "it's blurry when you start" report. Anisotropic filtering is cheap on any
  // GPU shipped this decade and this is the single largest-area surface in the
  // game, so it is the last place to economise.
  groundTex.anisotropy = 16;
  groundTex.colorSpace = THREE.SRGBColorSpace;

  // ground plane (flat, cutout by texture alpha? no alpha here — we use the slab
  // shape for the silhouette instead). Use a ShapeGeometry so the coast is real.
  // the -PI/2 rotation maps shape.y -> world -z, so the outline must be built
  // MIRRORED (negated y, reversed winding) to match the placement polygon —
  // otherwise the coast renders flipped about z and props float over the void
  const shape = new THREE.Shape();
  const silRev = [...sil3].reverse();
  shape.moveTo(silRev[0].x, -silRev[0].y);
  for (const p of silRev) shape.lineTo(p.x, -p.y);
  shape.closePath();
  const topGeo = new THREE.ShapeGeometry(shape);
  // custom UVs from bbox so the baked texture aligns.
  // ⚠️ THE 8-UNIT STREET SHIFT LIVED HERE. shape.y = -z3 (the shape is built
  // mirrored for the -π/2 rotation), and the canvas texture is flipY. The old
  // v = (posY - minZ)/H3 only aligns when maxZ === -minZ — but the island
  // silhouette is asymmetric (minZ -288.85, maxZ +280.63), so EVERY baked
  // feature rendered 8.23 units off in z: painted asphalt sat a road-width
  // south of where cars actually drive ("street lines on the grass", "houses
  // in the street" — the paint was wrong, never the objects). Correct v maps
  // z3=maxZ → 0 (canvas bottom, flipY) and z3=minZ → 1: v = (maxZ + posY)/H3.
  {
    const pos = topGeo.attributes.position;
    const uv = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) {
      uv[i * 2] = (pos.getX(i) - minX) / W3;
      uv[i * 2 + 1] = (maxZ + pos.getY(i)) / H3;
    }
    topGeo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  }
    // ── GROUND GRAIN ────────────────────────────────────────────────────────
  // detail-grain overlay: small tiling noise multiplied into the ground so it
  // reads as TEXTURE up close rather than as blurry paint.
  //
  // …and a lesson about frequency, measured on LANTERN NIGHT. The original
  // overlay was one 128px speckle sampled at 140x and 34x repeat. Do the
  // arithmetic on the 140x layer: 128 x 140 = 17,920 texels across 600 world
  // units is 30 texels per unit, and one world unit is about eight screen
  // pixels at the play camera. Four texels per pixel — so the mip chain
  // averages the entire layer to flat grey before it ever reaches the screen,
  // and the layer that DOES resolve (34x, ~1 texel per pixel) was mixed at
  // 0.08. That is the whole reason a close-up floor looked like a gradient:
  // the detail was real, and every bit of it was either too fine to survive
  // filtering or too faint to see.
  //
  // So there are three layers now, an octave apart, and the weights are per
  // world. MAPLE, PIRATE BAY and GAME DAY keep exactly the mix they shipped
  // with — they were tuned by eye against their own bakes and this is not the
  // place to relitigate them.
  const speckle = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d')!;
    x.fillStyle = '#808080'; x.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 2600; i++) {
      const v = 96 + Math.floor(Math.random() * 64);
      x.fillStyle = `rgb(${v},${v},${v})`;
      x.fillRect(Math.random() * 128, Math.random() * 128, Math.random() < 0.3 ? 2 : 1, Math.random() < 0.5 ? 2 : 1);
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  })();
  // The MOTTLE. Structure rather than speckle: overlapping soft blotches at a
  // size that survives to the screen, plus a scatter of hard chips for edges
  // the eye can actually catch on. This is the layer that makes packed earth
  // read as packed earth, and it carries a little COLOUR — warm and cool
  // patches, not just light and dark — because a floor whose only variation is
  // brightness still reads as one paint under a lamp.
  const mottle = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const x = c.getContext('2d')!;
    x.fillStyle = '#808080'; x.fillRect(0, 0, 256, 256);
    // wrap-safe: every blob is drawn nine times, once per neighbouring tile
    const blob = (cx: number, cy: number, r: number, style: string) => {
      x.fillStyle = style;
      for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) {
        x.beginPath(); x.arc(cx + ox * 256, cy + oy * 256, r, 0, Math.PI * 2); x.fill();
      }
    };
    for (let i = 0; i < 130; i++) {
      const warm = Math.random() < 0.5;
      const up = Math.random() < 0.5;
      const a = 0.10 + Math.random() * 0.13;
      blob(Math.random() * 256, Math.random() * 256, 8 + Math.random() * 34,
        up ? `rgba(${warm ? 170 : 148},${warm ? 158 : 158},${warm ? 138 : 172},${a})`
           : `rgba(${warm ? 92 : 74},${warm ? 82 : 80},${warm ? 68 : 94},${a})`);
    }
    for (let i = 0; i < 900; i++) {
      const v = 68 + Math.floor(Math.random() * 108);
      x.fillStyle = `rgba(${v},${v},${v},0.5)`;
      const w = 1 + Math.random() * 3;
      x.fillRect(Math.random() * 256, Math.random() * 256, w, w * (0.4 + Math.random()));
    }
    // ── NORMALISE, and this is not optional ────────────────────────────────
    // 130 blobs of mean radius 25 on a 256px tile is 255,000px of paint over
    // 65,536px of canvas: every pixel is painted about four times, the paint
    // stacks, and the tile came out with a mean well above the 128 the shader
    // treats as "no change". The result on screen was the ground blowing out
    // to white wherever a light pool already sat — which is the SAME mistake
    // as the additive-pool arithmetic that had to be unpicked from the night
    // bake, made again in a different medium a hundred lines away.
    //
    // So the tile is measured rather than guessed at. Rescale so the mean is
    // exactly neutral and the spread is a known number, and the layer can only
    // ever add variation, never brightness. Changing the blob count or their
    // alphas from here on cannot break the level's exposure.
    {
      const img = x.getImageData(0, 0, 256, 256);
      const d = img.data;
      let sum = 0;
      for (let i = 0; i < d.length; i += 4) sum += d[i];
      const mean = sum / (d.length / 4);
      let sq = 0;
      for (let i = 0; i < d.length; i += 4) sq += (d[i] - mean) ** 2;
      const sd = Math.sqrt(sq / (d.length / 4)) || 1;
      const SD = 26;                       // the spread the shader is tuned for
      const k = SD / sd;
      for (let i = 0; i < d.length; i += 4) {
        for (let ch = 0; ch < 3; ch++) {
          const v = 128 + (d[i + ch] - mean) * k;
          d[i + ch] = v < 0 ? 0 : v > 255 ? 255 : v;
        }
      }
      x.putImageData(img, 0, 0);
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  })();
  // fine, mid, coarse — and the repeat of the coarse layer.
  // THE COARSE LAYER WAS BEING SAMPLED AND MULTIPLIED BY ZERO on three of the
  // four worlds — `mix(vec3(1.0), g3 * 2.0, 0.0)` is exactly vec3(1.0), so the
  // texture fetch happened every fragment of the largest surface in the frame
  // and changed nothing. Measured with qa/ground.mjs, Lantern (which does use
  // it, at 0.34) carries 6x Maple's fine detail energy, 3.9x the mid and 2.7x
  // the coarse, on triple the spread.
  // AND TURNING IT ON WAS THE WRONG FIX — measured, with qa/_grainab.mjs,
  // which pins the camera and moves ONLY this weight (qa/ground.mjs drives the
  // void and samples wherever it lands, and that variance is bigger than the
  // effect). On Maple:
  //     z 0     mid-detail 0.01650   mean 0.706
  //     z 0.18  mid-detail 0.01656   mean 0.696
  //     z 0.34  mid-detail 0.01512   mean 0.677
  //     z 0.5   mid-detail 0.01579   mean 0.671
  // Detail energy is flat-to-DOWN across the whole range, inside a +/-6% noise
  // floor, while the mean falls monotonically. The layer is a repeat-9
  // texture — large-scale patchiness, not grain — so at the radius a phone
  // resolves it contributes nothing here and only darkens. It earns its place
  // on Lantern because that floor is flagstone and gravel under lanterns and
  // genuinely wants area variation; a sunlit town does not.
  // So these stay at zero, and the fetch is now actually skipped rather than
  // taken and multiplied by it.
  const GRAIN: Record<WorldId, [number, number, number, number]> = {
    maple:   [0.45, 0.08, 0.00, 9],
    pirate:  [0.45, 0.08, 0.00, 9],
    gameday: [0.45, 0.08, 0.00, 9],
    // LANTERN NIGHT leans on the mid and coarse layers hard. Its floor is
    // earth, flagstone, boardwalk and gravel seen under lanterns rather than a
    // sun, so it has almost no baked lighting variation of its own to hide
    // behind — every bit of surface interest has to come from here.
    lantern: [0.30, 0.30, 0.34, 7],
    // SNOW IS NOT SMOOTH, IT IS SMOOTH-LOOKING, and the difference is the
    // whole world. The claim this comment used to make — "the bake's own blue
    // shadowing carries the variation" — was checked against the bake and does
    // not hold: every blue thing in the Powder bake is REGION-scale (a
    // 900-unit rim stroke, a district fill), so it separates districts and
    // carries nothing at grain frequency.
    //
    // MEASURED, and this is what qa/groundgrain.mjs measures: median 16x16
    // luminance tile sd over the whole frame, one build, five worlds at their
    // own named fixed spots, camera settled at the R=4 lens
    // (qa/out/lookpair, src digest 8bdf1a860df35055):
    //     powder 0.0036 · pirate 0.0113 · maple 0.0172 · lantern 0.0203 ·
    //     gameday 0.0360
    // Powder's typical square of picture carries 3.1x less local tonal
    // variation than the next flattest world in the game, and its flat-tile
    // share is 51.3% against maple's 13.3%. It reproduces on four frames from
    // four builds, including a PRE-RUNG one: this is the world, not the shot
    // and not the rig. (The span was written as "five days" and is three —
    // Aug 26 21:08, Aug 27 22:09, Aug 28 13:21 and a live run. Corrected by
    // the verifier rather than left, because rule 3 has no size threshold and
    // that is the whole point of retraction 10.)
    //
    // THE LAYER THAT MATTERS IS THE COARSE ONE, and it was the one at zero.
    // The bake is 3072px over a 295x475-unit bowl and the camera runs 26-340
    // units out, which at pixelRatio 2 (PR_TOP, prototype3d.ts:140) on the
    // 32-degree lens is 125 down to 9.6 DEVICE px per scene unit — device,
    // because that is the space mip selection happens in, and quoting it in
    // css px halves every figure. Texels per device pixel, camDist 26 -> 340:
    //     fine (x140) 0.49 -> 6.35 · mid (x34) 0.12 -> 1.54 · coarse (x7)
    //     0.05 -> 0.64
    // Past camDist ~250 the fine layer is gone and the mid one is at the mip
    // boundary; the coarse layer is the only one still sharp at the 340 clamp,
    // which is most of every match — and Powder was spending its weight on the
    // fine layer alone.
    //
    // WHAT IT SPENDS: nothing measurable, and this number is from the CANVAS.
    // A probe that renders into its own WebGLRenderTarget cannot answer a
    // question about clipping — three 0.185.1 forces NoToneMapping and linear
    // output for one of those (three.module.js:7549-7559, :7585), which
    // prototype3d.ts:1099-1112 already records — and the first filing of this
    // patch quoted "1.0778% -> 1.0777%" out of exactly that buffer. On the
    // canvas, one settled Powder frame with only uGrain moving between
    // renders, any-channel >= 250 goes 0.0089% -> 0.0087% and NOT ONE PIXEL
    // crosses into clipping; the largest single-channel rise anywhere in the
    // frame is 9 codes, and at [1,1,1,7] — four times these weights — still
    // zero (docs/crews/round-3/powder-form.verdict.md §1.2).
    powder:  [0.45, 0.16, 0.22, 7],
  };
  const [gFine, gMid, gCoarse, gRep] = GRAIN[WORLD_ID];
  const groundMat = new THREE.MeshStandardMaterial({ map: groundTex, roughness: 0.97 });
  groundMat.onBeforeCompile = (shader) => {
    shader.uniforms.uDetail = { value: speckle };
    shader.uniforms.uMottle = { value: mottle };
    shader.uniforms.uGrain = { value: new THREE.Vector4(gFine, gMid, gCoarse, gRep) };
    // ── A NEGATIVE RESULT, KEPT ON PURPOSE ───────────────────────────────────
    // ROUGHNESS ON THIS GROUND DOES NOTHING, and the machinery below ships
    // NEUTRAL because of it. Measured with qa/groundsurf.mjs, camera provably
    // still (0.000 drift across the sweep): dropping the road from the shipped
    // 0.97 to 0.45 changes ZERO pixels by more than 3/255. Even at 0.05 — a
    // near mirror — only 5.3% of the frame moves at all and the peak difference
    // is 9/255, which no phone shows outdoors.
    //
    // The reason is geometric and rules out every other value anyone tries: the
    // ground is one FLAT HORIZONTAL PLANE. Its normal is +Y everywhere, so the
    // sun has exactly one mirror direction, and at this camera's elevation that
    // direction does not point at the lens. Sharpening a lobe that is off
    // screen changes nothing on screen. The only other specular source is the
    // RoomEnvironment IBL, deliberately pinned at 0.15 because anything higher
    // desaturates the whole island.
    //
    // SO A WET ROAD IS NOT REACHABLE THROUGH ROUGHNESS. It needs normal
    // VARIATION — something for a highlight to catch — which means perturbing
    // the normal from the detail texture already fetched above. That is a real
    // change to the largest surface in the game and it was not made on the
    // strength of a guess.
    //
    // What is kept is the MASK, because the mask is the hard part and it now
    // works. It cost three attempts: two heuristics that selected literally
    // nothing, both because they were tuned against mainstreet's ASPHALT prop
    // colour instead of the ground bake's own WORLD.road. Anyone doing the
    // normal-variation version needs this first, and 0.97/0.97 is bit-identical
    // to the single value it replaced.
    //
    // uSurf = (roadRoughness, grassRoughness, debug, unused).
    // uSurf.z = 1 paints the mask instead of the world: red where the shader
    // thinks "road", green where it thinks "grass". Look at that picture before
    // trusting anything applied through it.
    shader.uniforms.uSurf = { value: new THREE.Vector4(0.97, 0.97, 0, 0) };
    // the world's OWN road colour, as chromaticity, so the mask is exact per
    // world instead of a threshold that happens to suit Maple
    const rc = new THREE.Color(WORLD.road);          // setHex converts sRGB -> linear
    const rY = Math.max(1e-4, 0.2126 * rc.r + 0.7152 * rc.g + 0.0722 * rc.b);
    shader.uniforms.uRoadCh = { value: new THREE.Vector3(rc.r / rY, rc.g / rY, rc.b / rY) };
    groundMat.userData.surfU = shader.uniforms.uSurf;
    // the same vector as a plain array, so a probe can re-run the mask over the
    // ground TEXTURE rather than over a screenshot — see qa/groundsurf.mjs on
    // why screen space was the wrong space to count this in
    groundMat.userData.roadCh = [rc.r / rY, rc.g / rY, rc.b / rY];
    // QA can reach the live weights — see qa/_grainab.mjs. Judging a ground
    // texture by rebuilding between values is slow enough that it does not get
    // done, and the probe that drives the void to sample it has a noise floor
    // bigger than the effect.
    groundMat.userData.grainU = shader.uniforms.uGrain;
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <map_pars_fragment>',
        '#include <map_pars_fragment>\nuniform sampler2D uDetail;\nuniform sampler2D uMottle;\nuniform vec4 uGrain;\nuniform vec4 uSurf;\nuniform vec3 uRoadCh;')
      // three runs map_fragment before roughnessmap_fragment, so the albedo is
      // in scope here and the mask costs no extra fetch.
      .replace('#include <roughnessmap_fragment>',
        '#include <roughnessmap_fragment>\n{'
        + ' float mx = max(diffuseColor.r, max(diffuseColor.g, diffuseColor.b));'
        + ' float mn = min(diffuseColor.r, min(diffuseColor.g, diffuseColor.b));'
        + ' float sat = (mx - mn) / max(mx, 1e-4);'
        + ' float grn = diffuseColor.g - max(diffuseColor.r, diffuseColor.b);'
        // ── ROAD IS MATCHED, NOT GUESSED ────────────────────────────────────
        // Two heuristics were tried and both selected NOTHING — the mask came
        // back with the tarmac pure black twice. Both were tuned against
        // mainstreet's ASPHALT (0x5a6070), which is a PROP colour; the ground
        // bake paints WORLD.road, which on Maple is 0x6b7292 and is neither as
        // dark nor as desaturated. Guessing at a colour when the exact one is
        // three lines away in palette.ts is the whole mistake.
        //
        // So it matches the world's own road colour directly, in CHROMATICITY
        // (rgb over luminance). That matters: the grain layers above multiply
        // diffuseColor by up to 2x, so any test on absolute value drifts with
        // the noise, while a ratio does not. Measured margin on Maple's real
        // palette — road 0.000, nearest neighbour 0.286 (the prop asphalt, which
        // is not even in this texture), sidewalk 0.495, lot 0.573, everything
        // else past 0.6. The gate closes at 0.22, so nothing else is within
        // 30% of being selected, and it is per-world by construction.
        + ' vec3 ch = diffuseColor.rgb / max(1e-4, dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722)));'
        + ' float road = 1.0 - smoothstep(0.06, 0.22, distance(ch, uRoadCh));'
        // grass stays a green-dominance test: the lawn is painted in several
        // shades plus a lush core and patch overlays, so matching one hex would
        // miss most of it. Measured 1.00 on meadow and 0.00 on all eight other
        // ground colours, which is separation enough.
        + ' float grass = smoothstep(0.10, 0.24, sat) * smoothstep(0.004, 0.045, grn);'
        + ' roughnessFactor = mix(roughnessFactor, uSurf.x, road);'
        + ' roughnessFactor = mix(roughnessFactor, uSurf.y, grass);'
        + ' if (uSurf.z > 0.5) diffuseColor.rgb = vec3(road, grass, 0.0);'
        + ' }')
      .replace('#include <map_fragment>',
        '#include <map_fragment>\n{'
        + ' vec3 g = texture2D(uDetail, vMapUv * 140.0).rgb;'
        + ' vec3 g2 = texture2D(uDetail, vMapUv * 34.0).rgb;'
        // …and SKIP the fetch when a world genuinely wants none of a layer,
        // rather than sampling it and multiplying by zero. Now that all four
        // worlds use all three this branch never fires, which is the point:
        // turning a layer off should give the cost back, not just the effect.
        + ' diffuseColor.rgb *= mix(vec3(1.0), g * 2.0, uGrain.x)'
        + '                  * mix(vec3(1.0), g2 * 2.0, uGrain.y);'
        + ' if (uGrain.z > 0.0) {'
        + '   vec3 g3 = texture2D(uMottle, vMapUv * uGrain.w).rgb;'
        + '   diffuseColor.rgb *= mix(vec3(1.0), g3 * 2.0, uGrain.z);'
        + ' }'
        + ' }');
  };
  const top = new THREE.Mesh(topGeo, groundMat);
  top.rotation.x = -Math.PI / 2;   // shape XY -> world XZ (shape.y -> world -z)
  top.position.y = 0; top.receiveShadow = true;
  scene.add(top);

  await breathe('Carving the coast…');
  // cliff wall skirt (thickness): vertical wall from y=0 down to y=-DEPTH
  {
    const DEPTH = 9;
    const n = sil3.length;
    const verts: number[] = [];
    for (let i = 0; i < n; i++) {
      const a = sil3[i], b = sil3[(i + 1) % n];
      // shape.y -> world -z (matches top rotation)
      const ax = a.x, az = a.y, bx = b.x, bz = b.y;   // wall follows the (now-mirrored) top
      verts.push(ax, 0, az, bx, 0, bz, ax, -DEPTH, az);
      verts.push(bx, 0, bz, bx, -DEPTH, bz, ax, -DEPTH, az);
    }
    const wallGeo = new THREE.BufferGeometry();
    wallGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts), 3));
    wallGeo.computeVertexNormals();
    const wall = new THREE.Mesh(wallGeo, new THREE.MeshStandardMaterial({ color: WORLD.cliff, roughness: 1, flatShading: true, side: THREE.DoubleSide, emissive: 0x3a2a4e, emissiveIntensity: 0.3 }));
    scene.add(wall);
    // underside cap
    const cap = new THREE.Mesh(topGeo.clone(), new THREE.MeshStandardMaterial({ color: 0x1c1636, roughness: 1, side: THREE.DoubleSide }));
    cap.rotation.x = -Math.PI / 2; cap.position.y = -DEPTH; scene.add(cap);
  }

  // crisp geometry lane dashes — razor sharp at any zoom (the baked ones blur).
  // Pirate Bay has no traffic lanes: its boardwalk is one curve, not a grid.
  if (WORLD_ID === 'maple') {
    const dashGeo = new THREE.BoxGeometry(2.6, 0.03, 0.34);
    const dashMat = new THREE.MeshBasicMaterial({ color: 0xf2f5fa });
    const spots: { x: number; z: number; rot: number }[] = [];
    for (const c of ROAD_CENTERS.map((v) => w(v))) {
      for (let a = -292; a < 292; a += 5.6) {
        if (insideIsland3(a, c) && !inLagoon3(a, c) && coastClear(a, c, 6)) spots.push({ x: a, z: c, rot: 0 });
        if (insideIsland3(c, a) && !inLagoon3(c, a) && coastClear(c, a, 6)) spots.push({ x: c, z: a, rot: Math.PI / 2 });
      }
    }
    const inst = new THREE.InstancedMesh(dashGeo, dashMat, spots.length);
    const dm = new THREE.Object3D();
    spots.forEach((s, i) => { dm.position.set(s.x, 0.06, s.z); dm.rotation.y = s.rot; dm.updateMatrix(); inst.setMatrixAt(i, dm.matrix); });
    inst.instanceMatrix.needsUpdate = true;
    scene.add(inst);

    // ── ZEBRA CROSSINGS, ALSO GEOMETRY ────────────────────────────────────
    // The lane dashes were moved out of the bake for exactly this reason and
    // the crossings were left behind. The ground texture resolves ~5.4 texels
    // per world unit against ~38.7 screen pixels per unit at the play camera —
    // a 7.2x magnification, so every baked edge is a seven-pixel gradient. It
    // does not matter much on grass; it matters on the highest-contrast, most
    // recognisable marking in the game, sitting in the middle of the junction
    // the player drives through.
    //
    // Raising the bake is the wrong lever (3072 squared is already a ~37MB
    // canvas, and 4096 would be 67MB before mipmaps, on a phone). Geometry is
    // free by comparison: one instanced box mesh, razor-sharp at any zoom.
    const BAR = new THREE.BoxGeometry(3.05, 0.03, 0.62);
    const barMat = new THREE.MeshBasicMaterial({ color: 0xf0f4fc });
    const bars: { x: number; z: number; rot: number }[] = [];
    const CENTRES = ROAD_CENTERS.map((v) => w(v));
    for (const jx of CENTRES) for (const jz of CENTRES) {
      for (const side of [-1, 1]) {
        for (let k = -2; k <= 2; k++) {
          // crossing the horizontal road: bars run east-west, laid north/south
          const ax = jx + k * 1.5, az = jz + side * 6.2;
          if (insideIsland3(ax, az) && !inLagoon3(ax, az) && coastClear(ax, az, 5)) bars.push({ x: ax, z: az, rot: Math.PI / 2 });
          // crossing the vertical road: the same ladder, turned
          const bx = jx + side * 6.2, bz = jz + k * 1.5;
          if (insideIsland3(bx, bz) && !inLagoon3(bx, bz) && coastClear(bx, bz, 5)) bars.push({ x: bx, z: bz, rot: 0 });
        }
      }
    }
    if (bars.length) {
      const zi = new THREE.InstancedMesh(BAR, barMat, bars.length);
      const zm = new THREE.Object3D();
      bars.forEach((s, i) => { zm.position.set(s.x, 0.055, s.z); zm.rotation.y = s.rot; zm.updateMatrix(); zi.setMatrixAt(i, zm.matrix); });
      zi.instanceMatrix.needsUpdate = true;
      scene.add(zi);
    }
  }

    // ── waterfall at the SE edge (animated) ────────────────────────────────────
  const wfX = w(WATERFALL[0]), wfZ = w(WATERFALL[1]);
  const wfTex = (() => {
    const c = document.createElement('canvas'); c.width = 64; c.height = 128;
    const x = c.getContext('2d')!;
    const gr = x.createLinearGradient(0, 0, 0, 128);
    gr.addColorStop(0, '#93e2f3'); gr.addColorStop(1, '#4fa6cb');
    x.fillStyle = gr; x.fillRect(0, 0, 64, 128);
    for (let i = 0; i < 22; i++) { x.fillStyle = 'rgba(233,246,255,0.7)'; const yy = Math.random() * 128; x.fillRect(0, yy, 64, rand(1, 3)); }
    return new THREE.CanvasTexture(c);
  })();
  wfTex.wrapT = THREE.RepeatWrapping; wfTex.wrapS = THREE.RepeatWrapping; wfTex.repeat.set(1, 2);
  const waterfall = new THREE.Mesh(
    new THREE.PlaneGeometry(wLen(700), 26),
    new THREE.MeshBasicMaterial({ map: wfTex, transparent: true, opacity: 0.92, side: THREE.DoubleSide }),
  );
  // face outward from island centre at the waterfall point
  const outAng = Math.atan2(wfZ, wfX);
  waterfall.position.set(wfX, -8.5, wfZ);   // lip breaks the cliff rim — visible from above
  waterfall.rotation.y = -outAng + Math.PI / 2;
  scene.add(waterfall);
  // spray glow at base
  const spray = new THREE.Mesh(new THREE.CircleGeometry(wLen(240), 24),
    new THREE.MeshBasicMaterial({ color: WORLD.foam, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
  spray.scale.setScalar(0.32); (spray.material as THREE.MeshBasicMaterial).opacity = 0.2;
  spray.rotation.x = -Math.PI / 2; spray.position.set(wfX, -22, wfZ); scene.add(spray);   // AT the waterfall foot — not a UFO over the abyss

    // ── PROPS: populate each block per biome ───────────────────────────────────
  await populate(scene, addEdible, breathe);

  // Higgsfield image→3D hero landmark: the ferris wheel — moved out of the city
  // core to a beach BOARDWALK FAIR where a ferris wheel actually belongs.
  // …and on Pirate Bay it belongs to DANCE COVE — Maple's fairground block
  // is open water on the hooked island, which is exactly where the wheel used
  // to render.
  // The ferris wheel is Pirate Bay's boardwalk-fair prop. On MAPLE FALLS it
  // landed four blocks from the county fairground it belongs to, in hot pink.
  // The fair has its own rides.
  const FERRIS: [number, number] = WORLD_ID === 'pirate'
    ? [w(6650), w(10600)] : [w(blockCenter(1)) - 120, w(blockCenter(1)) + 260];   // MAPLE: the county fairground
  new GLTFLoader().load('/assets/hf3d/7d051b5a-7bfe-49fe-a484-24e7b3a9458a/f1918f07-d6ac-4589-abe2-eeaf7ca703b2.glb', (gltf) => {
    const model = gltf.scene;
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const s = 16 / Math.max(size.y, 0.001);            // ~16u tall landmark
    model.scale.setScalar(s);
    box.setFromObject(model);
    model.position.y -= box.min.y;                      // feet on the ground
    const grp = new THREE.Group();
    grp.add(model);
    grp.position.set(FERRIS[0], 0, FERRIS[1]);   // beach fairground / dance cove
    grp.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    scene.add(grp);
    addEdible(grp, 5.6);   // ferris wheel: dessert, not decoration
  }, undefined, () => {
    // asset unreachable: the FAIR still exists — procedural wheel stand-in
    const fb = makeFerrisFB();
    fb.position.set(FERRIS[0], 0, FERRIS[1]);
    fb.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    scene.add(fb); addEdible(fb, 5.6);
  });

  // ══ THE BAY'S WATER SURFACE ═══════════════════════════════════════════════
  // The bay is the centrepiece of Pirate Bay and it was a flat cyan shape
  // painted into the ground bake. This lays a single transparent sheet over
  // it — one draw call — carrying crossed swell, sun glitter and a foam band
  // that breathes against the shore. Nothing else on the island moves at this
  // scale, so it does a lot of work for very little.
  let bayWater: THREE.Mesh | null = null;
  if (WORLD_ID === 'pirate') {
    // built MIRRORED with reversed winding, exactly like the ground slab above
    // — the -PI/2 rotation maps shape.y to world -z, so anything that must sit
    // on top of the bake has to be authored the same way or it lands flipped
    const shape = new THREE.Shape();
    const wpts = [...BAY.WATER_SMOOTH].reverse();
    shape.moveTo(w(wpts[0][0]), -w(wpts[0][1]));
    for (const [wx, wy] of wpts) shape.lineTo(w(wx), -w(wy));
    shape.closePath();
    const geo = new THREE.ShapeGeometry(shape);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
      uniforms: { uTime: { value: 0 } },
      vertexShader: `
        varying vec2 vP;
        void main() {
          vP = position.xz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        precision mediump float;
        uniform float uTime;
        varying vec2 vP;
        void main() {
          // DOMAIN WARP first. Plain crossed sines produce a regular lattice,
          // which at map zoom reads as a grid of dots stamped on the bay —
          // the first version of this looked like polka dots. Warping the
          // sample point by a slower wave breaks the periodicity completely.
          vec2 q = vP + vec2(
            sin(vP.y * 0.075 + uTime * 0.41),
            sin(vP.x * 0.062 - uTime * 0.33)) * 7.0;
          float swell = sin(q.x * 0.096 + q.y * 0.071 + uTime * 0.62) * 0.5
                      + sin(q.x * 0.043 - q.y * 0.082 - uTime * 0.44) * 0.5;
          // thin bright crests rather than specular points
          float crest = pow(max(0.0, sin(q.x * 0.44 - q.y * 0.37 + uTime * 0.85)), 16.0);
          vec3 deep = vec3(0.13, 0.60, 0.72);
          vec3 shallow = vec3(0.40, 0.86, 0.92);
          // shallow mix stays in a narrow band: at full range the swell reads
          // as painted stripes on a pool, not as moving water
          vec3 col = mix(deep, shallow, 0.46 + swell * 0.16);
          col += crest * 0.07;
          // 0.78 buried the moored fleet under the sheet; the hulls need to read
          gl_FragColor = vec4(col, 0.60 + swell * 0.03 + crest * 0.05);
        }`,
    });
    bayWater = new THREE.Mesh(geo, mat);
    bayWater.position.y = 0.07;   // just clear of the baked ground
    bayWater.renderOrder = 1;
    scene.add(bayWater);
  }

  // ONE hot-air balloon drifts over the island (the redesigned Higgsfield GLB
  // is wired via the asset pack in ./assets3d — placed by populate()).
  let balloon: THREE.Group | null = null;
  setBalloonHook((grp) => { balloon = grp; });

    // ── biome lookup ───────────────────────────────────────────────────────────
  function biomeAt(x3: number, z3: number): Biome | null {
    if (WORLD_ID === 'pirate') {
      const d = BAY.bayDistrictAt(x3 / SCALE + CX, z3 / SCALE + CZ);
      return d === 'oldtown' ? 'market' : (d as Biome | null);
    }
    if (WORLD_ID === 'lantern') {
      const d = LN.lnRegionAt(x3 / SCALE + CX, z3 / SCALE + CZ);
      // lantern.ts names its districts for what they are; three of those words
      // are already spoken for in the shared union ('gate' is the football
      // ground's, 'bridge' and 'garden' are too generic to key crowd behaviour
      // off), so they are translated here at the boundary exactly as GAME DAY's
      // 'plaza' and 'campus' are below.
      return d === 'gate' ? 'torii' : d === 'bridge' ? 'moonbridge'
        : d === 'garden' ? 'nightgarden' : (d as Biome | null);
    }
    if (WORLD_ID === 'powder') {
      // powder.ts's district ids are all new words in the shared union — no
      // translation needed at the boundary, first world to manage it
      return PW.pwRegionAt(x3 / SCALE + CX, z3 / SCALE + CZ) as Biome | null;
    }
    if (WORLD_ID === 'gameday') {
      const d = GD.gdRegionAt(x3 / SCALE + CX, z3 / SCALE + CZ);
      // gameday.ts names two of its districts 'plaza' and 'campus' because that
      // is what they are. The shared Biome union cannot use those words for a
      // football ground — ./life keys crowd behaviour and props off them and
      // Maple already owns both — so they are translated at the boundary. See
      // the note on the Biome union above.
      return d === 'plaza' ? 'gate' : d === 'campus' ? 'quad' : d === 'woods' ? 'treeline'
        : (d as Biome | null);
    }
    const wx = x3 / SCALE + CX, wy = z3 / SCALE + CZ;
    if (!insideIslandWorld(wx, wy)) return null;   // off the coast = off the island
    // inside the coast, clamp to the nearest block so the whole island is
    // walkable right up to the waterline (the grid doesn't cover the fringe)
    const gx = Math.min(5, Math.max(0, Math.round((wx - BLOCK_ORIGIN - BLOCK_SIZE / 2) / STRIDE)));
    const gy = Math.min(5, Math.max(0, Math.round((wy - BLOCK_ORIGIN - BLOCK_SIZE / 2) / STRIDE)));
    return PLAN[gy][gx];
  }

  // ── THE OPENING ─────────────────────────────────────────────────────────
  // Maple's old spawn was a road junction in the middle of the suburbs — the
  // dullest cell on the map, on asphalt, with nothing within eight units. It
  // is now hand-authored and FIXED: the west walk of the town square, on
  // bright green grass, town hall to the north-east, bandstand across the
  // green, Main Street's shopfronts behind, and the parking-meter protest ten
  // units away. Same crisp first frame every single load.
  const spawn = spawn3();   // DANCE COVE on the bay, THE SQUARE in Maple Falls

  return {
    spawn,
    biomeAt,
    W: SCALE,
    setDusk(k) {
      // golden hour: every streetlamp, house window and TOWER FACADE lights up.
      // The peaks sit deliberately ABOVE 1.0 — the post chain thresholds bloom
      // in LINEAR at 1.05 (see ensureComposer), so a lamp at full dusk (2.4)
      // genuinely glows while a daylight lamp (0.9) is just a bright sphere.
      // Before this the ramp topped out at 1.8/1.0/0.5 and only the lamp heads
      // ever crossed the line, by a whisker, on the world built around light.
      lampHeadMat.emissiveIntensity = 0.9 + k * 1.5;
      winGlassMatShared.emissiveIntensity = 0.25 + k * 1.2;
      sideMatCache.forEach((m) => { m.emissiveIntensity = k * 0.9; });
    },
    skyTex: skyCanvas,
    update(dt, t, cam) {
      if (starMatRef) starMatRef.uniforms.uTime.value = t;
      // re-centre the celestial layer on the camera — see skyBodies above
      if (cam) {
        if (starField) starField.position.copy(cam.position);
        for (const sb of skyBodies) sb.o.position.copy(cam.position).addScaledVector(sb.dir, sb.d);
      }
      if (bayWater) (bayWater.material as THREE.ShaderMaterial).uniforms.uTime.value = t;
      wfTex.offset.y = (wfTex.offset.y - dt * 1.6) % 1;
      (spray.material as THREE.MeshBasicMaterial).opacity = 0.42 + Math.sin(t * 3) * 0.08;
      if (balloon) {
        const a = t * 0.022;   // one lazy lap of the island every ~5 minutes
        balloon.position.set(Math.cos(a) * 125, 42 + Math.sin(t * 0.4) * 2.2, Math.sin(a) * 125);
        balloon.rotation.y = -a;
      }
    },
  };
}

// ── prop factories ─────────────────────────────────────────────────────────────
function makeHouse(): THREE.Group {
  const grp = new THREE.Group();
  const wWall = rand(5.4, 7), d = rand(5.4, 7), h = rand(3.2, 4.2);
  const wallCol = pick(PROPS.house);
  const walls = new THREE.Mesh(new THREE.BoxGeometry(wWall, h, d), stdMat(wallCol, 0.9));
  walls.position.y = h / 2; grp.add(walls);
  // gabled roof: explicit prism geometry, ridge along the depth axis, with
  // eaves overhang (reads "house", not "tent")
  const roofCol = pick(PROPS.roof);
  const roofH = rand(1.9, 2.5);
  const rw = wWall * 0.62, rd = d * 0.58;
  const roofGeo = (() => {
    const v: number[] = [];
    const quad = (a: number[], b: number[], c: number[], e: number[]) => { v.push(...a, ...b, ...c, ...a, ...c, ...e); };
    quad([-rw, 0, -rd], [-rw, 0, rd], [0, roofH, rd], [0, roofH, -rd]);        // left slope
    quad([rw, 0, rd], [rw, 0, -rd], [0, roofH, -rd], [0, roofH, rd]);          // right slope
    v.push(-rw, 0, rd, rw, 0, rd, 0, roofH, rd);                              // front gable
    v.push(rw, 0, -rd, -rw, 0, -rd, 0, roofH, -rd);                           // back gable
    const gGeo = new THREE.BufferGeometry();
    gGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(v), 3));
    gGeo.computeVertexNormals();
    return gGeo;
  })();
  const roof = new THREE.Mesh(roofGeo, stdMat(roofCol, 0.85, true));
  roof.position.y = h - 0.02;
  grp.add(roof);
  // eaves trim under the roofline
  const trim = new THREE.Mesh(new THREE.BoxGeometry(wWall * 1.08, 0.28, d * 1.08), stdMat(0xffffff, 0.8));
  trim.position.y = h + 0.05; grp.add(trim);
  // chimney
  if (Math.random() < 0.65) {
    const ch = new THREE.Mesh(new THREE.BoxGeometry(0.7, rand(1.6, 2.2), 0.7), stdMat(0xb8776a, 0.9));
    ch.position.set(wWall * rand(-0.22, 0.22), h + roofH * 0.75, d * 0.18); grp.add(ch);
  }
  // door with frame + step
  const doorG = new THREE.Group();
  const frame = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.1, 0.12), stdMat(0xffffff, 0.85));
  frame.position.y = 1.05;
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.05, 1.8, 0.16), stdMat(pick([0x7a4a5e, 0x4a5e7a, 0x5e7a4a, 0x8a5a3a]), 0.7));
  door.position.set(0, 0.9, 0.03);
  const step = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.22, 0.7), stdMat(0xd9dbe2, 0.9));
  step.position.set(0, 0.11, 0.4);
  doorG.add(frame); doorG.add(door); doorG.add(step);
  doorG.scale.set(1.2, 1.3, 1);   // people are ~3.4u tall — doors must beat them
  doorG.position.set(wWall * rand(-0.14, 0.14), 0, d / 2 + 0.02); grp.add(doorG);
  // two front windows with white frames + warm glass (shared: dusk lights them)
  const winFrameMat = winFrameMatShared;
  const winGlassMat = winGlassMatShared;
  for (const sx of [-0.28, 0.28]) {
    const wf = new THREE.Mesh(new THREE.BoxGeometry(1.15, 1.15, 0.1), winFrameMat);
    wf.position.set(wWall * sx, h * 0.58, d / 2 + 0.02);
    const wg = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.85, 0.12), winGlassMat);
    wg.position.set(wWall * sx, h * 0.58, d / 2 + 0.03);
    grp.add(wf); grp.add(wg);
  }
  // side window
  const sw = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.05, 1.05), winFrameMat);
  sw.position.set(wWall / 2 + 0.02, h * 0.58, 0); grp.add(sw);
  const swg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.78, 0.78), winGlassMat);
  swg.position.set(wWall / 2 + 0.03, h * 0.58, 0); grp.add(swg);
  return grp;
}
// baked facade texture: crisp lit/unlit window grid on the wall colour — far
// sharper than box-windows, and one draw call per tower instead of a dozen
const facadeCache = new Map<string, THREE.CanvasTexture>();
function facadeTex(wall: number, glassWarm: boolean): THREE.CanvasTexture {
  const key = `${wall}-${glassWarm}`;
  const hit = facadeCache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas'); c.width = 128; c.height = 256;
  const x = c.getContext('2d')!;
  x.fillStyle = '#' + wall.toString(16).padStart(6, '0'); x.fillRect(0, 0, 128, 256);
  // subtle floor bands
  x.fillStyle = 'rgba(0,0,0,0.06)';
  for (let fy = 0; fy < 256; fy += 32) x.fillRect(0, fy + 29, 128, 3);
  for (let fy = 8; fy < 250; fy += 32) {
    for (let fx = 10; fx < 118; fx += 30) {
      const lit = Math.random() < 0.42;
      x.fillStyle = lit ? (glassWarm ? '#ffe9b0' : '#dff3ff') : '#26314a';
      x.fillRect(fx, fy, 20, 16);
      x.fillStyle = 'rgba(255,255,255,0.28)';
      x.fillRect(fx, fy, 20, 3);   // sky reflection strip
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  facadeCache.set(key, t);
  return t;
}
// four outward side walls as ONE geometry (UVs tile in world units so window
// size is constant across building sizes) — a street of these is one draw
// call per building instead of six
function facadeBoxGeo(wB: number, h: number, d: number): THREE.BufferGeometry {
  const pos: number[] = [], norm: number[] = [], uv: number[] = [], idx: number[] = [];
  const face = (ax: number, az: number, bx: number, bz: number, nx: number, nz: number) => {
    const base = pos.length / 3, len = Math.hypot(bx - ax, bz - az);
    pos.push(ax, 0, az, bx, 0, bz, bx, h, bz, ax, h, az);
    for (let i = 0; i < 4; i++) norm.push(nx, 0, nz);
    uv.push(0, 0, len / 11, 0, len / 11, h / 26, 0, h / 26);
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  };
  const hw = wB / 2, hd = d / 2;
  face(-hw, hd, hw, hd, 0, 1);      // front (+z, street side)
  face(hw, -hd, -hw, -hd, 0, -1);   // back
  face(hw, hd, hw, -hd, 1, 0);      // right
  face(-hw, -hd, -hw, hd, -1, 0);   // left
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(norm), 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uv), 2));
  geo.setIndex(idx);
  return geo;
}
// shared downtown materials/geometry (hundreds of buildings — zero per-instance alloc)
const sideMatCache = new Map<string, THREE.MeshStandardMaterial>();
function facadeMat(wall: number, warm: boolean): THREE.MeshStandardMaterial {
  const key = `${wall}-${warm}`;
  let m = sideMatCache.get(key);
  if (!m) {
    // emissiveMap = the same facade texture: at dusk the window grid lights up
    // (intensity driven by setDusk — a thousand lit windows for 8 materials)
    const tex = facadeTex(wall, warm);
    m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.65, emissiveMap: tex, emissive: new THREE.Color(0xffdf9a), emissiveIntensity: 0 });
    sideMatCache.set(key, m);
  }
  return m;
}
// roof caps come in a small family of tints — one shared slate cap made the
// big-void aerial view read as a parking-garage roofscape
/** One MeshStandardMaterial per (colour, roughness, shading) instead of one per
 *  MESH. makeHouse allocated six of its own every time it was called, and a
 *  Maple match measured 2,513 distinct materials in the scene — 2,513 shader
 *  binds the renderer cannot batch away. The colours are drawn from small fixed
 *  palettes, so the real count is dozens. */
const _stdMats = new Map<string, THREE.MeshStandardMaterial>();
function stdMat(color: number, roughness = 0.85, flatShading = false): THREE.MeshStandardMaterial {
  const k = `${color}:${roughness}:${flatShading ? 1 : 0}`;
  let m = _stdMats.get(k);
  if (!m) { m = new THREE.MeshStandardMaterial({ color, roughness, flatShading }); _stdMats.set(k, m); }
  return m;
}
const capMats = [0x565e74, 0x606a85, 0x6e6280, 0x4f5a6e, 0x746a70].map((c2) => new THREE.MeshStandardMaterial({ color: c2, roughness: 0.8 }));
const capMatShared = capMats[0];
const acMatShared = new THREE.MeshStandardMaterial({ color: 0x9aa3b2, roughness: 0.8 });
const tankMatShared = new THREE.MeshStandardMaterial({ color: 0xc8cdd8, metalness: 0.4, roughness: 0.5 });
const awningMats = [0xe8604d, 0x4db07a, 0x4d7de8, 0xf0c050, 0xf06fb0].map((c2) => new THREE.MeshStandardMaterial({ color: c2, roughness: 0.7 }));
// a flush-sided city block building: hole.io's street-wall unit. Front is +Z.
function makeRowBuilding(wB: number, d: number, h: number): THREE.Group {
  const grp = new THREE.Group();
  const sides = new THREE.Mesh(facadeBoxGeo(wB, h, d), facadeMat(pick(PROPS.tower), Math.random() < 0.5));
  grp.add(sides);
  // roof slab doubles as a parapet lip
  const cap = new THREE.Mesh(new THREE.BoxGeometry(wB + 0.36, 0.8, d + 0.36), pick(capMats));
  cap.position.y = h - 0.15; grp.add(cap);
  // roof clutter: AC unit, or a water tower on taller stock
  if (h > 13 && Math.random() < 0.6) {
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.3, 2.2, 8), tankMatShared);
    tank.position.set(rand(-wB * 0.2, wB * 0.2), h + 1.7, rand(-d * 0.2, d * 0.2)); grp.add(tank);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(1.35, 0.8, 8), capMatShared);
    cone.position.set(tank.position.x, h + 3.2, tank.position.z); grp.add(cone);
  } else if (Math.random() < 0.9) {
    const ac = new THREE.Mesh(new THREE.BoxGeometry(rand(1.2, 2), 0.9, rand(1.2, 2)), acMatShared);
    ac.position.set(rand(-wB * 0.25, wB * 0.25), h + 0.7, rand(-d * 0.25, d * 0.25)); grp.add(ac);
  }
  // street-level awning — retail charm on the sidewalk face
  if (Math.random() < 0.55) {
    const aw = new THREE.Mesh(new THREE.BoxGeometry(wB * 0.72, 0.2, 1.2), pick(awningMats));
    aw.position.set(0, 3.1, d / 2 + 0.55); grp.add(aw);
  }
  return grp;
}
// small garden shed for suburban backyards
function makeParkedCar(): THREE.Group {
  const parts = [
    part(new THREE.BoxGeometry(3.4, 1.0, 1.7), pick(PROPS.car), 0, 0.75, 0),
    part(new THREE.BoxGeometry(1.8, 0.8, 1.5), 0xbfeaff, -0.2, 1.55, 0),
  ];
  for (const wx2 of [-1.1, 1.1]) for (const wz2 of [-0.85, 0.85])
    parts.push(part(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 10), 0x20242c, wx2, 0.42, wz2, Math.PI / 2));
  const g = new THREE.Group(); g.add(mergedProp(parts));
  return g;
}
function makeShed(): THREE.Group {
  const grp = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2, 2), stdMat(pick([0xbfe0cf, 0xd8c8ec, 0xf2c9a0]), 0.9));
  body.position.y = 1; grp.add(body);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(2.2, 1.1, 4), stdMat(pick(PROPS.roof), 0.85, true));
  roof.rotation.y = Math.PI / 4; roof.position.y = 2.5; grp.add(roof);
  return grp;
}
function makeTower(tall = false): THREE.Group {
  const grp = new THREE.Group();
  const wB = rand(9, 14), d = rand(9, 14), h = tall ? rand(28, 48) : rand(12, 26);
  const wall = pick(PROPS.tower);
  const tex = facadeTex(wall, Math.random() < 0.6);
  const side = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 });
  const capMat = pick(capMats);
  // podium base + tower shaft with facade texture on all four sides
  const podH = Math.min(4.5, h * 0.22);
  const pod = new THREE.Mesh(new THREE.BoxGeometry(wB * 1.18, podH, d * 1.18),
    stdMat(new THREE.Color(wall).multiplyScalar(0.82).getHex(), 0.7));
  pod.position.y = podH / 2; grp.add(pod);
  const body = new THREE.Mesh(new THREE.BoxGeometry(wB, h, d), [side, side, capMat, capMat, side, side]);
  body.position.y = podH + h / 2; grp.add(body);
  // roof parapet + AC units + some spires on tall towers
  const parapet = new THREE.Mesh(new THREE.BoxGeometry(wB * 1.04, 0.9, d * 1.04), capMat);
  parapet.position.y = podH + h + 0.35; grp.add(parapet);
  const ac = new THREE.Mesh(new THREE.BoxGeometry(rand(1.6, 2.6), 1.1, rand(1.6, 2.6)), acMatShared);
  ac.position.set(rand(-wB * 0.24, wB * 0.24), podH + h + 1.2, rand(-d * 0.24, d * 0.24)); grp.add(ac);
  if (tall && Math.random() < 0.5) {
    const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.3, rand(4, 7), 6), tankMatShared);
    spire.position.y = podH + h + 3.4; grp.add(spire);
  }
  // street-level awning strip for shop-front charm
  if (Math.random() < 0.6) {
    const aw = new THREE.Mesh(new THREE.BoxGeometry(wB * 0.9, 0.24, 1.5), pick(awningMats));
    aw.position.set(0, podH * 0.72, d * 0.62); grp.add(aw);
  }
  return grp;
}
// ── MERGED-PROP KIT: draw-call diet. Every small prop used to be 2-9 meshes
// with its own materials (a hydrant alone was 8 draw calls; downtown measured
// ~2250 calls/frame). Each factory now bakes its parts into ONE geometry with
// per-vertex colors, and every prop on the island shares ONE material.
export const PROP_SHARED_MAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, flatShading: true });
// ── …AND ONE FOR THINGS THAT GREW ───────────────────────────────────────────
// flatShading is right for architecture: a chunky, crisply-facetted building is
// the house style and it reads as deliberate. It is wrong for a tree. Measured
// at the play camera, a canopy facet spans ~40 screen pixels and a pine tier
// chord 107 — so the foliage photographed as a faceted lump standing next to a
// SMOOTH-shaded pedestrian (life.ts builds people with flatShading off), and
// the mismatch is most of what reads as "not HD" once the cars are fixed.
//
// part() calls toNonIndexed(), which duplicates vertices but KEEPS their
// normals — so a SphereGeometry stays smooth through the merge and an
// IcosahedronGeometry, whose normals are per-face to begin with, cannot. The
// fix is therefore two things together: this material, and sphere-based
// canopies below. Cost is one extra shader program; draw calls are unchanged,
// because every merged prop was already its own mesh.
export const PROP_SMOOTH_MAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, flatShading: false });

// ══ FADING WHATEVER IS STANDING IN FRONT OF THE HERO ═══════════════════════
//
// Measured: 3-13% of sampled frames per world hid a quarter or more of the
// void behind scenery, and Maple and Lantern each produced a frame inside the
// first FORTY SECONDS where the void was 100% invisible. The void is the
// character, the thing the child is steering and the only thing on screen that
// is them. Losing it behind a warehouse is the worst thing the renderer does.
//
// TWO CONSTRAINTS SHAPE THIS.
//   Every prop shares ONE of two materials — that is what keeps the draw
//   calls down — so per-prop material.opacity would fade the entire island.
//   And alpha blending would drag ~5,700 props into the transparent queue and
//   sort them every frame, which is a real cost for a cosmetic effect.
// So: an ORDERED DITHER DISCARD driven by a per-mesh uniform. Uniforms upload
// per draw call even on a shared program, so onBeforeRender can give each mesh
// its own fade without cloning a material or touching the render order. It
// stays fully opaque, fully sorted, and costs one uniform write per occluder.
//
// A 4x4 Bayer matrix rather than noise: at 1-2 device pixels per cell it reads
// as a soft screen-door rather than as sparkle, and unlike hash noise it does
// not crawl when the camera moves.
const FADE_PARS = `
uniform float uFade;
float voidBayer(vec2 p) {
  int x = int(mod(p.x, 4.0)), y = int(mod(p.y, 4.0));
  int i = x + y * 4;
  if (i == 0) return 0.0000; if (i == 1) return 0.5000; if (i == 2) return 0.1250; if (i == 3) return 0.6250;
  if (i == 4) return 0.7500; if (i == 5) return 0.2500; if (i == 6) return 0.8750; if (i == 7) return 0.3750;
  if (i == 8) return 0.1875; if (i == 9) return 0.6875; if (i == 10) return 0.0625; if (i == 11) return 0.5625;
  if (i == 12) return 0.9375; if (i == 13) return 0.4375; if (i == 14) return 0.8125;
  return 0.3125;
}
`;
const FADE_BODY = `
  if (uFade < 0.995 && uFade <= voidBayer(gl_FragCoord.xy)) discard;
`;
// ══ SPECULAR, PER VERTEX, INSIDE ONE MATERIAL ══════════════════════════════
//
// Measured on the shipping build with qa/_matte.mjs, triangle-weighted:
//
//              rough<0.6   metal>0.05
//   maple          2.9%         2.0%     (its 30 road cars, and nothing else)
//   pirate         3.7%         1.8%
//   GAME DAY       0.2%         0.1%
//   LANTERN        0.3%         0.2%
//
// Game Day is a STADIUM CAR PARK — two hundred trucks, aluminium bleachers,
// chrome bumpers, a barrel smoker per pitch — rendered entirely at roughness
// 0.85, metalness 0. Lantern Night is a night market whose glazed roof tiles
// and canal cannot catch the moon. Both are cardboard, and they are the two
// newest worlds precisely because the merged-prop kit made it easy to build
// them fast out of one matte material.
//
// THE OBVIOUS FIX IS THE WRONG ONE. mergedProp bakes ONE material per prop, so
// "give the bumper a metal material" means splitting every prop that has a
// bumper into two meshes — and the whole reason this kit exists is that
// downtown was measuring ~2250 draw calls a frame before it.
//
// So the surface property travels the way the COLOUR already does: per vertex.
// part() writes one byte per vertex, mergeGeometries carries it through, and
// the shader turns it into roughness and metalness. A truck can have a matte
// painted door and a chrome bumper in ONE mesh, ONE material, ONE draw call.
//
// IT COSTS LESS THAN IT REPLACES. Every prop geometry has been carrying a `uv`
// attribute since the kit was written — 8 bytes a vertex — and no prop
// material samples a map, so not one of those bytes has ever been read.
// Deleting uv and adding a normalized Uint8 is a net 7 bytes per vertex SAVED.
//
// METALNESS IS DELIBERATELY CAPPED AT 0.55, not 1. A metal has no diffuse
// term: it is nothing but its reflections, and this scene's only reflection
// source is a RoomEnvironment at intensity 0.15 (see prototype3d, where that
// number is argued). Real chrome here would render as a black hole. At 0.55
// the surface keeps 45% of its albedo — so it still reads as the colour a
// child expects — and gains a tight tinted highlight off the key light, which
// is the part that actually says "metal" at a 30-unit camera.
// The table itself is in gloss.ts — a leaf module, for the import-cycle reason
// written up there. This file owns the shader; that one owns the palette.
//
// These four are the SHARED palette, used by the prop kit in this file in
// every world at once: the glazing on a downtown tower, a parked car's
// windscreen, and the galvanised grey that every water tank, mast and pole in
// the game is painted. They are registered here rather than in palette.ts so
// that the whole specular story stays next to the shader that reads it.
registerGloss([
  [PROPS.towerGlass, 0.78], [PROPS.carGlass, 0.70],
  [0xc8cdd8, 0.68], [0x3c4454, 0.45],
  // ── PIRATE BAY, measured with qa/glossgap.mjs: 72% of the island was dead
  // matte, and the mass was not the ship brass — it was wood, fronds and the
  // resort's painted plaster. Values follow the Maple canopy argument: the
  // radiance term is 1 + 5g while metalness goes with g squared, so a low
  // sheen picks up sky and gives back almost none of the colour.
  //   frond greens 0.14 (16 shades on the palms and hedges, same as Maple's
  //   canopy), palm bark 0.06, crate/coconut wood 0.10 (also a brown work-pant
  //   in Maple's DENIM list — a 0.10 wax on trousers is invisible), the barrel
  //   iron rings 0.45, and the resort hotel's cream 0.18 like Maple's paint.
  // NOT here: AO-darkened vertex shades. bakeContactAO darkens colours after
  // aGloss is stamped, so a dark variant inherits its source part's gloss and
  // an entry for the darkened hex would key on a colour part() never sees.
  [0x8a6a4a, 0.10], [0xb08a5a, 0.06], [0xfdf3de, 0.18],
  [0x2e2a34, 0.45],
  [0x4faa5a, 0.14], [0x54b060, 0.14], [0x3f8f4c, 0.14], [0x459a52, 0.14],
  [0x5fbc68, 0.14], [0x58b463, 0.14], [0x67b25c, 0.14], [0x7ec96e, 0.14],
  [0x5dbe63, 0.14], [0x6cc86e, 0.14],
], 'island');
/** Override the palette lookup for one part — for a colour that is metal HERE
 *  and cushion fabric two props over. `p.push(glossy(part(...), 0.7))`. */
export function glossy(g: THREE.BufferGeometry, s: number): THREE.BufferGeometry {
  const a = g.getAttribute('aGloss') as THREE.BufferAttribute | undefined;
  if (a) { (a.array as Uint8Array).fill(Math.round(Math.max(0, Math.min(1, s)) * 255)); a.needsUpdate = true; }
  return g;
}
const GLOSS_PARS_V = 'attribute float aGloss;\nvarying float vGloss;\n';
const GLOSS_PARS_F = 'varying float vGloss;\n';
// three's meshphysical_frag runs roughnessmap_fragment then metalnessmap_fragment,
// so appending after the second one has both factors in scope.
//
// METALNESS IS 0.38, DOWN FROM THE 0.55 THIS SHIPPED WITH, and the reason is
// the measurement below. A metal has no diffuse term, so every point of
// metalness is albedo removed; the deal is only worth taking if the specular
// pays it back. At 0.38 a fully-glossy vertex keeps 62% of the colour a child
// expects the object to be, which for a toy-bright game matters more than
// physical accuracy about chrome.
const GLOSS_BODY = `
  roughnessFactor = mix(roughnessFactor, 0.20, vGloss);
  metalnessFactor = max(metalnessFactor, 0.38 * vGloss * vGloss);
`;
// ── …AND SOMETHING FOR IT TO REFLECT ───────────────────────────────────────
//
// THE FIRST VERSION OF THIS FEATURE DID NOT WORK, and the A/B said so before
// anyone looked at it: switching the channel off changed the frame mostly by
// making it BRIGHTER — 73% of changed pixels on Game Day were darker with
// gloss ON. That is the whole feature running backwards.
//
// The cause is not the roughness. It is that lowering roughness only sharpens
// a reflection of whatever is there to reflect, and in this scene that is a
// RoomEnvironment at intensity 0.15 — deliberately dim, because it is a sheen
// on the whole island and anything higher desaturates every colour in the
// game (see prototype3d, where the 0.15 is argued and a per-world sky was
// tried and reverted). So a "polished" surface got a sharper picture of
// almost nothing, and paid for it in lost albedo. Cardboard, but darker.
//
// The fix has to be per-vertex too, or it is the same washed-out island the
// 0.15 exists to prevent: scale the IBL SPECULAR term, and only that term, by
// the gloss channel. Diffuse irradiance is untouched, so the 70% of the world
// that is matte renders bit-identically and every palette argument in this
// repo still holds. A chrome bumper effectively sees an environment at 0.9
// and looks like chrome; a painted truck door at 0.42 sees 0.44 and looks
// waxed; a canopy at 0 sees 0.15, exactly as before.
//
// `radiance` is three's name for the specular IBL contribution and it is in
// scope right after lights_fragment_maps — the same chunk that adds it.
const GLOSS_ENV = 5.0;
const GLOSS_RADIANCE = `
  radiance *= 1.0 + ${GLOSS_ENV.toFixed(1)} * vGloss;
`;
/** Patch a shared prop material: per-mesh fade + per-vertex specular.
 *  Safe to call once per material. */
export function installPropShader(m: THREE.Material): void {
  if ((m as { _hasFade?: boolean })._hasFade) return;
  (m as { _hasFade?: boolean })._hasFade = true;
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uFade = { value: 1 };
    shader.vertexShader = GLOSS_PARS_V + shader.vertexShader.replace(
      'void main() {', 'void main() {\n  vGloss = aGloss;');
    // Each replace is checked. A three upgrade that renames a chunk would
    // otherwise turn this into a silent no-op — the shader still compiles,
    // the game still runs, and the feature is simply gone with nothing to
    // notice it. That is the failure mode worth a couple of lines.
    let f = FADE_PARS + GLOSS_PARS_F + shader.fragmentShader;
    for (const [needle, add] of [
      ['void main() {', FADE_BODY],
      ['#include <metalnessmap_fragment>', GLOSS_BODY],
      ['#include <lights_fragment_maps>', GLOSS_RADIANCE],
    ] as [string, string][]) {
      if (!f.includes(needle)) { console.warn(`VOIDLING: prop shader hook "${needle}" not found`); continue; }
      f = f.replace(needle, needle + add);
    }
    shader.fragmentShader = f;
    (m as { userData: Record<string, unknown> }).userData.shader = shader;
  };
  // a material whose program changed needs recompiling
  m.needsUpdate = true;
}
installPropShader(PROP_SHARED_MAT);
installPropShader(PROP_SMOOTH_MAT);
// EVERY prop carries this hook, not just the ones currently fading. A uniform
// on a shared program keeps whatever the last draw wrote, so a mesh with no
// hook would inherit the previous occluder's 0.3 and disappear — the bug this
// whole feature exists to prevent, applied to the entire island. One shared
// function object, no per-frame allocation, and userData.fade defaults to 1.
const _fadeHook = function (this: THREE.Object3D) {
  const m = (this as THREE.Mesh).material as { userData?: { shader?: { uniforms: Record<string, { value: number }> } } } | undefined;
  const sh = m?.userData?.shader;
  if (sh) sh.uniforms.uFade.value = (this.userData.fade as number | undefined) ?? 1;
};
/** Attach the fade hook. Called once per prop, at build time. */
export function armFade(o: THREE.Object3D): void {
  o.userData.fade = 1;
  o.onBeforeRender = _fadeHook;
}
/** Per-frame: hand a prop its fade. 1 = solid, 0 = gone. */
export function setMeshFade(o: THREE.Object3D, fade: number): void {
  o.userData.fade = fade;
  if (o.onBeforeRender !== _fadeHook) o.onBeforeRender = _fadeHook;
}
const _pc = new THREE.Color();
// ── IS THIS PART ROUND? ────────────────────────────────────────────────────
// Asked here because here is the only place that still knows. part() calls
// toNonIndexed(), which returns a plain BufferGeometry and throws the class
// name away, and mergeGeometries then fuses forty parts into one buffer with
// no record of what any of them were. Two lines later the answer is gone for
// good — which is exactly why the flat/smooth decision has been made by hand,
// per factory, in six files, and got it wrong for most of the game.
const ROUND_GEO = /^(Cylinder|Cone|Sphere|Torus|Lathe|Capsule|Tube)/;
// ── TONE, IN THE SPACE THE EYE ACTUALLY SEES ────────────────────────────────
// `new THREE.Color(hex).multiplyScalar(0.74).getHex()` does NOT darken by 26%.
// three r185 ships ColorManagement.enabled = true, so setHex() converts sRGB to
// LINEAR, multiplyScalar scales the linear value, and getHex() converts back —
// and the round trip through the transfer curve eats most of the change.
// Measured with qa/_colortest.mjs against the real three build:
//
//     multiplyScalar(0.74)  ->  displayed 0.87    (intended 0.74)
//     multiplyScalar(0.80)  ->  displayed 0.90
//     multiplyScalar(0.70)  ->  displayed 0.85
//     multiplyScalar(1.16)  ->  displayed 1.07, and it CLIPS on bright channels
//
// So every two-tone prop in this game has been roughly half as separated as its
// code claims, which is why a canopy built as "a dark mass with light accents"
// photographs as one flat orange mass with twelve equal highlights. Found by
// TEAM STATIC on the studio's first round and verified here before use.
//
// shade() scales the DISPLAYED channels, so shade(c, 0.74) really is 26% darker.
// tint() lifts toward white instead of scaling up, because scaling a bright
// channel past 255 clips to white and turns a highlight into a hole.
export const shade = (hex: number, k: number): number => {
  const ch = (sh: number) => {
    const v = Math.round(((hex >> sh) & 255) * k);
    return v < 0 ? 0 : v > 255 ? 255 : v;
  };
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
};
export const tint = (hex: number, t: number): number => {
  const ch = (sh: number) => {
    const v = (hex >> sh) & 255;
    return Math.round(v + (255 - v) * t);
  };
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
};

export function part(geo: THREE.BufferGeometry, col: number, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy?: number, sz?: number): THREE.BufferGeometry {
  const wasRound = ROUND_GEO.test(geo.type);
  const g = geo.index ? geo.toNonIndexed() : geo;
  if (g !== geo) geo.dispose();
  g.scale(sx, sy ?? sx, sz ?? sx);
  if (rx) g.rotateX(rx);
  if (ry) g.rotateY(ry);
  if (rz) g.rotateZ(rz);
  g.translate(x, y, z);
  _pc.setHex(col);
  const n = g.getAttribute('position').count;
  // ── COLOUR AS UINT16, NOT FLOAT32 ─────────────────────────────────────────
  // Measured with qa/heap.mjs: the geometry IS the heap. Game Day carries 376
  // MB of vertex buffers inside a 446 MB JS heap — 84% — at 36.9 bytes per
  // vertex against a predicted 37.0 (position 12 + normal 12 + colour 12 +
  // aGloss 1). Nothing releases the CPU copy, so every byte here is resident
  // for the life of the page on top of the GPU's own copy.
  //
  // A flat per-vertex colour is one hex value flooded across a part, so 32-bit
  // floats are storing a number that came from 8 bits. Uint16 normalised is 6
  // bytes instead of 12 — a sixth of the whole vertex — and 65,536 levels per
  // channel is far past anything a screen or an eye resolves.
  //
  // NOT Uint8, which is the tempting version and is wrong here: _pc.setHex()
  // returns LINEAR values (three's ColorManagement converts from sRGB on the
  // way in), and 8-bit linear bands visibly in the darks — which is most of a
  // night market and all of the contact shading baked in below.
  const cols = new Uint16Array(n * 3);
  const cr = Math.round(_pc.r * 65535), cg = Math.round(_pc.g * 65535), cb = Math.round(_pc.b * 65535);
  for (let i = 0; i < n; i++) { cols[i * 3] = cr; cols[i * 3 + 1] = cg; cols[i * 3 + 2] = cb; }
  g.setAttribute('color', new THREE.BufferAttribute(cols, 3, true));
  // no prop material samples a map — see installPropShader. Dropping uv pays
  // for aGloss twice over, and both have to happen HERE so every geometry
  // reaching mergeGeometries carries the identical attribute set.
  g.deleteAttribute('uv');
  const gl = glossOf(col);
  const spec = new Uint8Array(n);
  if (gl) spec.fill(Math.round(gl * 255));
  g.setAttribute('aGloss', new THREE.BufferAttribute(spec, 1, true));
  // carried on userData rather than in a buffer: mergedProp reads it off the
  // parts BEFORE they are fused, so it costs nothing per vertex and nothing at
  // runtime. Two numbers per part, discarded at the end of the build.
  g.userData.roundV = wasRound ? n : 0;
  g.userData.totV = n;
  return g;
}
// unlit accent material: anything merged with this ignores the lighting, which
// is the only way a neon strip reads as neon on the dark dance floor
// ── THE GAME'S LIGHT SOURCES LIVE IN HDR NOW ───────────────────────────────
// Every glow surface in all four worlds rides this one material — the paper
// lanterns, the stall interiors, the dance rig — and MeshBasicMaterial is
// unlit: its output is the vertex colour, which cannot exceed 1.0. Measured
// (qa/_hdrprobe.mjs): the lantern-market frame peaked at 1.381 linear with 64
// pixels over the bloom threshold, because the art was authored SDR — a
// "light source" and a white wall were the same number, and no threshold can
// separate them. `color` multiplies vertexColors, so raising it past white
// lifts every glow prop into HDR: the paper clears the linear bloom cut
// (1.05) and halos, while diffuse surfaces — which cannot exceed their
// illumination — stay under it. The tone map compresses the core back into
// range on every rung, composer or not, so the unbloomed look shifts only
// slightly brighter; the HALO carries the hue, which is what "lit from
// within" reads as. 1.75 is measured, not chosen: high enough that amber
// paper (luminance ~0.7) clears the cut, low enough that the ACES'd core
// keeps its colour instead of blowing to white.
export const PROP_GLOW_MAT = new THREE.MeshBasicMaterial({ vertexColors: true, color: new THREE.Color(1.75, 1.75, 1.75) });
// ── CONTACT SHADING, BAKED INTO THE COLOUR THAT IS ALREADY THERE ───────────
// Measured: aoMap covers 0% of the scene on all four worlds, while 80-94% of
// every world's triangles ride one of two vertex-coloured materials. So the
// hook for ambient occlusion is already in every vertex buffer and nothing was
// using it — props sat ON the ground rather than IN it, which is most of what
// separates a clay render from a toy photographed on a table.
//
// This is not screen-space AO and does not pretend to be. It is the oldest
// trick there is: darken the vertices near a prop's base, where a real
// occluder would eat the bounce light. Costs nothing at runtime — no pass, no
// buffer, no shader change — because it is folded into the colours at build
// time, and it is exactly right for chunky flat-shaded geometry.
//
// Height is prop-LOCAL and part() has already applied its translate, so y is
// distance above the prop's own origin, which for almost everything on the
// island is where it meets the ground. That makes the rule self-correcting:
// a crate at y 0-1 darkens at its base, a lantern hanging at y=5 does not,
// and the balloon envelope at y=9.6 is untouched.
// THE BAND SCALES WITH THE PROP, and getting that wrong is why the first
// version of this was invisible. A fixed 0.95-world-unit band is a fifth of a
// wheelie bin and a twentieth of a tower — and on a tower, viewed from the
// 50-300 units the play camera actually sits at, it is a sub-pixel line.
// Measured then: 54% of changed pixels darker against 46% lighter, a mean
// shift of 0.47/255. Indistinguishable from the crowd moving.
// Proportional instead: everything shades over its own bottom third, so a bin
// and a tower both read as sitting IN the world rather than on it.
const AO_FRAC = 0.34;     // share of a prop's own height that shades
const AO_MAX = 0.40;      // how dark it gets right at the base
const _aoBox = new THREE.Box3();
function bakeContactAO(geo: THREE.BufferGeometry): void {
  const pos = geo.getAttribute('position');
  const col = geo.getAttribute('color') as THREE.BufferAttribute | undefined;
  if (!pos || !col) return;
  geo.computeBoundingBox();
  const bb = geo.boundingBox;
  if (!bb) return;
  const base = bb.min.y;
  const h = bb.max.y - base;
  if (h < 0.05) return;                 // a decal has no base to shade
  // ── THE BAND IS A CONTACT SHADOW, SO IT IS CAPPED IN WORLD UNITS ────────
  // It was `h * AO_FRAC` off the BOUNDING BOX, and a bounding box is not a
  // body. A contact shadow has a physical size — it is where the object meets
  // the ground — and that size does not grow because the object grew a flower
  // or a banner. Uncapped, a prop whose box reaches 4 units gets a 1.36-unit
  // gradient climbing its side, which is not shading, it is a paint job.
  //
  // WHAT THIS DOES NOT FIX, stated because I nearly claimed it did. TEAM STATIC
  // filed makePlanter as a blocker — the barrel photographs at lum 4-17 against
  // an authored albedo near 101 — and proposed this cap at 0.55 as the class
  // fix. For that prop it is a NO-OP: its box reaches 1.7, so the band was
  // 0.578 and the cap takes it to 0.550, from 52.5% of the barrel to 50.0%.
  // Worse, the AO multiplier at the barrel's own midpoint is 0.91 — a nine per
  // cent darkening — which cannot turn 101 into 4. The dominant cause is the
  // other half of their finding: a vertical cylinder wall facing away from the
  // key light and receiving ambient only. The barrel's hoops in mainstreet.ts
  // are what answers that. This cap is worth keeping on its own merits and is
  // not the reason the planter reads.
  const band = Math.min(h * AO_FRAC, 0.55);
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) - base;
    if (y >= band) continue;
    // squared falloff: a linear ramp reads as a painted band, this reads as shade
    const t = 1 - y / band;
    const k = 1 - AO_MAX * t * t;
    col.setXYZ(i, col.getX(i) * k, col.getY(i) * k, col.getZ(i) * k);
  }
  col.needsUpdate = true;
}
/** How much of a prop has to be round before it is shaded as round. Half is
 *  deliberately permissive: a barrel with a square lid, a hydrant on a plinth
 *  and a mushroom on a stalk are all round objects wearing one flat detail, and
 *  the flat detail is the part that survives being smoothed. Going the other way
 *  — a building with one cylindrical vent — loses the crisp facets that make
 *  architecture read as architecture, which is what PROP_SHARED_MAT is for. */
const ROUND_SHARE = 0.5;
export function mergedProp(parts: THREE.BufferGeometry[], mat?: THREE.Material): THREE.Mesh {
  // ── FLAT OR SMOOTH IS DECIDED HERE, NOT BY A HUNDRED CALL SITES ─────────
  // flatShading is right for architecture and wrong for anything that grew or
  // was turned on a lathe — island.ts:3091 says so, life.ts and tailgate.ts say
  // so again in their own words, and mainstreet.ts says it a fourth time about
  // the maple canopy. Each time the fix stopped at the file boundary. Counted:
  // PROP_SMOOTH_MAT is referenced 4 times in island.ts against 33 mergedProp
  // calls, ZERO times in life.ts against 25, and zero in luxe.ts. Every barrel,
  // hydrant, bin, drum, cooler, dome, mast and fountain in the game was a
  // cylinder wearing 6-16 hard tone bands.
  //
  // Under FLAT_SHADED three discards vertex normals entirely — normal_vertex
  // writes vNormal only #ifndef FLAT_SHADED, and the fragment substitutes
  // normalize(cross(dFdx, dFdy)) — so no segment raise anywhere can fix it, and
  // the normals are being paid for regardless. This starts reading them.
  //
  // An explicit material still wins: PROP_GLOW_MAT and the deliberate choices
  // already in the tree pass through untouched.
  if (!mat) {
    // COUNTED BY PART, NOT BY VERTEX, and the difference is the whole thing.
    // A BoxGeometry is 36 vertices; a SphereGeometry(r, 12, 9) is about 600 and
    // a CylinderGeometry(r, r, h, 8) about 96. Weighting by vertex therefore
    // says a shopfront of twenty boxes with one domed vent is 45% round. That
    // version measured 91-99.5% of every world onto the smooth material — it
    // had quietly smoothed the architecture, which is the opposite mistake and
    // the one PROP_SHARED_MAT exists to prevent.
    let round = 0;
    for (const pg of parts) if (((pg.userData.roundV as number) ?? 0) > 0) round++;
    mat = parts.length > 0 && round / parts.length >= ROUND_SHARE
      ? PROP_SMOOTH_MAT : PROP_SHARED_MAT;
  }
  // mergeGeometries returns null the moment two inputs disagree about which
  // attributes exist, and a prop that vanishes is a much worse bug than a
  // prop that is matte. Almost everything here comes from part(); this makes
  // the handful of hand-built geometries agree with it rather than trusting.
  for (const pg of parts) {
    if (pg.getAttribute('uv')) pg.deleteAttribute('uv');
    if (!pg.getAttribute('aGloss')) {
      const n = pg.getAttribute('position').count;
      pg.setAttribute('aGloss', new THREE.BufferAttribute(new Uint8Array(n), 1, true));
    }
  }
  const merged = mergeGeometries(parts, false)!;
  parts.forEach((pg) => pg.dispose());
  // …but NOT on the unlit accent material. A neon strip is neon because it
  // ignores the lighting; shading its base would just make it a dimmer strip.
  if (mat !== PROP_GLOW_MAT) bakeContactAO(merged);
  const m = new THREE.Mesh(merged, mat);
  armFade(m);   // see installFade — every prop must write the uniform, not just fading ones
  return m;
}

// AUTUMN, and it is not decoration. docs/GAMEDAY.md opens on "low warm sun,
// long shadows, amber and crimson trees at the edges" and the first top-down
// render of the finished plateau had the stadium, the lot, the concourse and
// the whole thing ringed in high-summer green — one pool of colours away from
// the season the level is about. Warm enough to sit against the crimson team
// colour without arguing with it: a run of ambers and one true red per tree.
const FALL_FOLIAGE = [0xd9702b, 0xc4442f, 0xe8a02c, 0xb8552f, 0xd98f2b, 0x9a7a34, 0xcf6a3a];
const foliagePool = (): number[] => (WORLD_ID === 'gameday' ? FALL_FOLIAGE : PROPS.foliage);

function makeTree(): THREE.Group {
  // clustered two-tone canopy like the 2D tree sprites — reads lush, not
  // "gumdrop". ONE merged mesh, ONE draw call (was 5).
  const base = pick(foliagePool());
  const dark = shade(base, 0.70);          // really 30% down now — see shade()
  const light = tint(base, 0.26);
  const R0 = rand(2.2, 2.9);
  const grp = new THREE.Group();
  // spheres, not icosahedra: same silhouette and cost, smooth normals through
  // the merge. 14x10 is the point where the profile stops reading as a polygon
  // at the closest the camera ever gets.
  grp.add(mergedProp([
    part(new THREE.CylinderGeometry(0.5, 0.72, 3.2, 10), PROPS.trunk, 0, 1.6, 0),
    part(new THREE.SphereGeometry(R0, 14, 10), dark, 0, 4.6, 0),
    part(new THREE.SphereGeometry(R0 * 0.72, 12, 9), base, R0 * 0.55, 5.4, R0 * 0.3),
    part(new THREE.SphereGeometry(R0 * 0.62, 12, 9), light, -R0 * 0.5, 5.6, -R0 * 0.25),
    part(new THREE.SphereGeometry(R0 * 0.5, 11, 8), base, 0.2, 6.4, 0.2),
  ], PROP_SMOOTH_MAT));
  return noFront(grp);
}
function makePine(): THREE.Group {
  // 7 segments put a 107-pixel straight edge across the widest tier. 14 halves
  // the chord and the cone's own side normals do the rest once the material
  // stops flattening them.
  const parts = [part(new THREE.CylinderGeometry(0.5, 0.7, 2.4, 9), PROPS.trunk, 0, 1.2, 0)];
  for (let i = 0; i < 3; i++) parts.push(part(new THREE.ConeGeometry(3.2 - i * 0.7, 3, 14), PROPS.pine, 0, 3 + i * 2.1, 0));
  const grp = new THREE.Group(); grp.add(mergedProp(parts, PROP_SMOOTH_MAT));
  return noFront(grp);
}
// ══ PIRATE BAY prop kit ═══════════════════════════════════════════════════
// A tiki bar, a dance speaker stack, a market stall, a treasure chest, a
// barrel, a cannon and a palm-thatch cabana. All merged single-draw props.
// ══ PIRATE BAY LANDMARKS ═════════════════════════════════════════════════
// Every district needed a silhouette you can see from across the island and
// a genuinely big meal at the end of it. Small props alone made the map read
// flat from the top-down camera; these are the things you aim yourself at.
function makeArrivalArch(): THREE.Group {
  // THE thing the resort lacked: an arrival. A cream-and-teal arch straddling
  // the boardwalk, gold finials, PIRATE BAY RESORT lettering implied by a
  // carved sign board. Repeating this palette down the axis is what makes the
  // district read as one designed place instead of a scatter.
  const CREAM = 0xfdf3de, TEAL = 0x2fb8a8, GOLD = 0xf0c050;
  const parts: THREE.BufferGeometry[] = [];
  for (const sx of [-1, 1]) {
    parts.push(part(new THREE.BoxGeometry(3.4, 2, 3.4), 0xe8dcc0, sx * 9, 1, 0));      // plinth
    parts.push(part(new THREE.CylinderGeometry(1.15, 1.35, 11, 12), CREAM, sx * 9, 7.5, 0));
    parts.push(part(new THREE.CylinderGeometry(1.5, 1.5, 0.8, 12), GOLD, sx * 9, 13.3, 0));
    parts.push(part(new THREE.SphereGeometry(1.0, 12, 10), GOLD, sx * 9, 14.2, 0));     // finial
    for (let k = 0; k < 5; k++) parts.push(part(new THREE.TorusGeometry(1.22, 0.07, 5, 14), TEAL, sx * 9, 3.4 + k * 2, 0, Math.PI / 2));
  }
  // the span: a shallow arc of blocks, not a lintel
  for (let i = 0; i < 11; i++) {
    const t = (i / 10) * 2 - 1;
    parts.push(part(new THREE.BoxGeometry(1.75, 1.5, 3.0), i % 2 ? CREAM : 0xf4ead2, t * 9, 14.4 - t * t * 1.9, 0, 0, 0, -t * 0.2));
  }
  parts.push(part(new THREE.BoxGeometry(11, 2.4, 0.5), TEAL, 0, 16.6, 1.1));            // sign board
  parts.push(part(new THREE.BoxGeometry(11.6, 0.45, 0.7), GOLD, 0, 17.9, 1.15));
  parts.push(part(new THREE.BoxGeometry(11.6, 0.45, 0.7), GOLD, 0, 15.35, 1.15));
  for (let i = 0; i < 7; i++) parts.push(part(new THREE.BoxGeometry(0.85, 1.0, 0.16), CREAM, -4.2 + i * 1.4, 16.6, 1.42));
  // pennants along the span
  for (let i = 0; i < 6; i++) {
    parts.push(part(new THREE.ConeGeometry(0.42, 1.5, 3), [0xff6a5e, 0x4dd0e1, GOLD][i % 3], -6 + i * 2.4, 13.2, -1.5, Math.PI));
  }
  const g = new THREE.Group(); g.add(mergedProp(parts)); return g;
}
function makeGrandHotel(): THREE.Group {
  // THE ROYAL MARINER — a colonial resort hotel, three storeys of cream with
  // a teal roof, a portico, and balconies that catch the sun
  const parts = [
    part(new THREE.BoxGeometry(26, 2, 14), 0xe8dcc0, 0, 1, 0),               // terrace plinth
    part(new THREE.BoxGeometry(22, 12, 11), 0xfdf3de, 0, 8, 0),              // main block
    part(new THREE.BoxGeometry(9, 15, 12), 0xfdf3de, 0, 9.5, 0),             // central tower
  ];
  for (const sx of [-1, 1]) parts.push(part(new THREE.BoxGeometry(7, 9, 12.6), 0xfaeed4, sx * 14, 6.5, 0));  // wings
  // roofs
  parts.push(part(new THREE.ConeGeometry(15, 4.4, 4), 0x2fb8a8, 0, 16.2, 0, 0, Math.PI / 4));
  parts.push(part(new THREE.ConeGeometry(7.6, 5.6, 4), 0x2fb8a8, 0, 19.8, 0, 0, Math.PI / 4));
  for (const sx of [-1, 1]) parts.push(part(new THREE.ConeGeometry(6, 3, 4), 0x2fb8a8, sx * 14, 12.4, 0, 0, Math.PI / 4));
  // balconies + windows
  for (let f = 0; f < 3; f++) {
    parts.push(part(new THREE.BoxGeometry(22.6, 0.5, 12.4), 0xe8dcc0, 0, 3.6 + f * 4, 0));
    for (let i = 0; i < 9; i++) parts.push(part(new THREE.BoxGeometry(1.5, 2.2, 0.3), 0x4dc8e0, -8 + i * 2, 5 + f * 4, 5.7));
  }
  // portico columns + a flag on the tower
  for (let i = 0; i < 5; i++) parts.push(part(new THREE.CylinderGeometry(0.5, 0.55, 5.2, 8), 0xfdf3de, -6 + i * 3, 4.6, 7.2));
  parts.push(part(new THREE.CylinderGeometry(0.16, 0.16, 5, 5), 0xf4f0e2, 0, 25, 0));
  parts.push(part(new THREE.BoxGeometry(3.4, 2, 0.16), 0xff6a5e, 1.7, 26.4, 0));
  const g = new THREE.Group(); g.add(mergedProp(parts)); return g;
}
function makeFort(): THREE.Group {
  // OLD TOWN's stone fort: a battlemented drum with cannons and a flag
  const parts = [
    // a CARIBBEAN fort — bone-white coral stone, deep coral roofs, gold trim.
    // The first pass was a grey Welsh castle on muddy terracotta.
    part(new THREE.CylinderGeometry(11, 12.5, 3, 10), 0xe0d6c0, 0, 1.5, 0),      // rampart base
    part(new THREE.CylinderGeometry(10, 10.6, 7, 10), 0xf0e8d8, 0, 6.5, 0),      // wall
    part(new THREE.CylinderGeometry(11.2, 11.2, 1.2, 10), 0xd8ccb4, 0, 10.6, 0), // walk
    part(new THREE.CylinderGeometry(5, 5.4, 9, 8), 0xfdf3de, 0, 14, 0),          // keep
    part(new THREE.ConeGeometry(6, 4, 8), 0xe8604d, 0, 20.5, 0),                 // keep roof
  ];
  for (let i = 0; i < 12; i++) {                                                 // merlons
    const a = (i / 12) * Math.PI * 2;
    parts.push(part(new THREE.BoxGeometry(2.4, 2.2, 1.6), 0xfdf3de,
      Math.cos(a) * 10.6, 12.2, Math.sin(a) * 10.6, 0, -a));
  }
  for (let i = 0; i < 4; i++) {                                                  // cannons on the walk
    const a = (i / 4) * Math.PI * 2 + 0.4;
    parts.push(part(new THREE.CylinderGeometry(0.5, 0.66, 3.4, 8), 0x3a3f46,
      Math.cos(a) * 9.2, 12.6, Math.sin(a) * 9.2, 0, -a, Math.PI / 2));
  }
  parts.push(part(new THREE.CylinderGeometry(0.16, 0.16, 5, 5), 0xf4f0e2, 0, 25, 0));
  parts.push(part(new THREE.BoxGeometry(3.4, 2, 0.16), 0x2c2c34, 1.7, 26.2, 0));  // jolly roger
  parts.push(part(new THREE.SphereGeometry(0.55, 8, 6), 0xf4f0e2, 1.4, 26.4, 0.1));
  const g = new THREE.Group(); g.add(mergedProp(parts)); return g;
}
function makeWarehouse(): THREE.Group {
  // THE DOCKS: a long cargo shed with a crane arm and stacked containers
  const parts = [
    part(new THREE.BoxGeometry(22, 9, 12), 0xc98f52, 0, 4.5, 0),
    part(new THREE.BoxGeometry(23, 1, 13), 0x8a5f32, 0, 9.4, 0),
  ];
  for (let i = 0; i < 6; i++) parts.push(part(new THREE.CylinderGeometry(1.15, 1.15, 23, 8, 1, false, 0, Math.PI),
    0xd8a866, 0, 9.6, -5.5 + i * 2.2, 0, 0, Math.PI / 2));                        // corrugated barrel roof
  for (let i = 0; i < 4; i++) parts.push(part(new THREE.BoxGeometry(3.4, 5.6, 0.3), 0x6e4a28, -8 + i * 5.3, 2.8, 6.1));
  // crane
  parts.push(part(new THREE.BoxGeometry(3, 3, 3), 0xffb03a, 14, 1.5, 0));
  parts.push(part(new THREE.CylinderGeometry(0.55, 0.7, 16, 7), 0xffb03a, 14, 9, 0));
  parts.push(part(new THREE.BoxGeometry(14, 0.9, 0.9), 0xffb03a, 9, 17, 0));
  parts.push(part(new THREE.CylinderGeometry(0.09, 0.09, 6, 4), 0x4a4a52, 3.4, 14, 0));
  parts.push(part(new THREE.BoxGeometry(2.2, 1.6, 2.2), 0xd85a5a, 3.4, 10.2, 0));
  // container stack
  for (let i = 0; i < 5; i++) parts.push(part(new THREE.BoxGeometry(5.4, 2.6, 2.8),
    [0xe8604d, 0x4db07a, 0x4d7de8, 0xf0c050, 0x9a5cf0][i], -13 + (i % 2) * 1.2, 1.4 + Math.floor(i / 2) * 2.7, -8));
  const g = new THREE.Group(); g.add(mergedProp(parts)); return g;
}
function makeJungleTemple(): THREE.Group {
  // THE LOST TEMPLE — a stepped stone pyramid swallowed by vines, with a
  // glowing idol at the top. The one thing on the island that looks ancient.
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 5; i++) {
    const w2 = 20 - i * 3.2;
    parts.push(part(new THREE.BoxGeometry(w2, 2.6, w2), i % 2 ? 0xe8ddc4 : 0xd6c9ac, 0, 1.3 + i * 2.6, 0));
  }
  parts.push(part(new THREE.BoxGeometry(6, 5, 6), 0xd8ccb0, 0, 15.5, 0));            // shrine
  parts.push(part(new THREE.ConeGeometry(4.6, 3.4, 4), 0xc0b294, 0, 19.7, 0, 0, Math.PI / 4));
  // the stair up the south face
  for (let i = 0; i < 11; i++) parts.push(part(new THREE.BoxGeometry(5, 1.2, 1.3), 0xf2e8d2, 0, 0.6 + i * 1.18, 9.6 - i * 0.78));
  // vines and moss
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2, r2 = 7 + Math.random() * 3;
    parts.push(part(new THREE.SphereGeometry(1.5, 7, 5), 0x3f8f52, Math.cos(a) * r2, 2 + (i % 4) * 2.6, Math.sin(a) * r2, 0, 0, 0, 1, 0.6, 1));
  }
  // two guardian torch bowls + the idol
  for (const sx of [-1, 1]) {
    parts.push(part(new THREE.CylinderGeometry(0.8, 1.1, 3, 7), 0xd8ccb0, sx * 6, 14.5, 6));
    parts.push(part(new THREE.SphereGeometry(1, 8, 6), 0xff8a3a, sx * 6, 16.6, 6));
  }
  parts.push(part(new THREE.OctahedronGeometry(3.6, 0), 0x4ef0c0, 0, 19.8, 0));   // an idol you cannot see is not an idol
  const g = new THREE.Group(); g.add(mergedProp(parts)); return g;
}
function makeMainStage(): THREE.Group {
  // DANCE COVE's main stage: truss, a big screen, speaker walls, spotlights
  const parts = [
    part(new THREE.BoxGeometry(20, 2.4, 10), 0x2e2340, 0, 1.2, 0),
    part(new THREE.BoxGeometry(20.6, 0.5, 10.6), 0x8e5cb8, 0, 2.6, 0),
    part(new THREE.BoxGeometry(13, 7.5, 0.7), 0x1a1428, 0, 8.5, -4.2),           // screen
  ];
  for (const sx of [-1, 1]) {
    parts.push(part(new THREE.BoxGeometry(1, 15, 1), 0x3a3448, sx * 10.5, 7.5, -4));
    parts.push(part(new THREE.BoxGeometry(1, 15, 1), 0x3a3448, sx * 10.5, 7.5, 4));
    for (let k = 0; k < 4; k++) parts.push(part(new THREE.BoxGeometry(3.6, 2.6, 2.6), 0x1f1a2c, sx * 12.5, 1.4 + k * 2.7, 2));
    for (let k = 0; k < 4; k++) parts.push(part(new THREE.CircleGeometry(0.9, 10), 0x6ee8ff, sx * 12.5, 1.4 + k * 2.7, 3.35));
  }
  parts.push(part(new THREE.BoxGeometry(22, 1, 1), 0x3a3448, 0, 15.2, -4));
  parts.push(part(new THREE.BoxGeometry(22, 1, 1), 0x3a3448, 0, 15.2, 4));
  for (let i = 0; i < 7; i++) {
    const c = [0xff2fa0, 0x4ef0ff, 0xffd23f, 0x9a5cf0][i % 4];
    parts.push(part(new THREE.ConeGeometry(1, 1.8, 8), c, -9 + i * 3, 14, -4, Math.PI));
    parts.push(part(new THREE.ConeGeometry(1, 1.8, 8), c, -9 + i * 3, 14, 4, Math.PI));
  }
  // the DJ booth
  parts.push(part(new THREE.BoxGeometry(6, 2, 2.4), 0xff2fa0, 0, 3.6, 0));
  parts.push(part(new THREE.CylinderGeometry(0.9, 0.9, 0.3, 12), 0xf4f0e2, -1.5, 4.7, 0));
  parts.push(part(new THREE.CylinderGeometry(0.9, 0.9, 0.3, 12), 0xf4f0e2, 1.5, 4.7, 0));
  // the whole rig was 0x3a3448 truss on a 0x2e2340 deck on a 0x5e2f72 floor —
  // three darks that never separated. Unlit strips up every leg and along the
  // deck edge give it a silhouette.
  const glow: THREE.BufferGeometry[] = [part(new THREE.BoxGeometry(12, 6.6, 0.3), 0x4ef0ff, 0, 8.5, -3.8)];
  for (const sx of [-1, 1]) for (const sz of [-4, 4]) {
    glow.push(part(new THREE.BoxGeometry(0.16, 15, 0.16), sz < 0 ? 0xff2fa0 : 0x4ef0ff, sx * 10.5, 7.5, sz + (sz < 0 ? -0.58 : 0.58)));
  }
  glow.push(part(new THREE.BoxGeometry(20.8, 0.22, 0.22), 0xff2fa0, 0, 2.5, 5.4));
  glow.push(part(new THREE.BoxGeometry(20.8, 0.22, 0.22), 0xff2fa0, 0, 2.5, -5.4));
  const g = new THREE.Group();
  g.add(mergedProp(parts));
  g.add(mergedProp(glow, PROP_GLOW_MAT));
  return g;
}
function makeBazaarTower(): THREE.Group {
  // THE BAZAAR's spice tower — a striped clock-and-lantern tower over the stalls
  const parts = [
    part(new THREE.BoxGeometry(12, 1.6, 12), 0xd8a04a, 0, 0.8, 0),
    part(new THREE.CylinderGeometry(3.6, 4.4, 14, 8), 0xf0d090, 0, 8.6, 0),
  ];
  // the stripes were radius 3.75 inside a shaft tapering 4.4 to 3.6, so they
  // only emerged above y=12.9 and the landmark read as a blank cream column for
  // its whole visible height. They follow the taper now.
  for (let i = 0; i < 5; i++) {
    const y = 3.2 + i * 2.6;
    const shaft = 4.4 + (3.6 - 4.4) * ((y - 1.6) / 14);     // shaft radius at this height
    parts.push(part(new THREE.CylinderGeometry(shaft + 0.16, shaft + 0.16, 1.2, 8),
      i % 2 ? 0xe8604d : 0xf5e4b4, 0, y, 0));
  }
  parts.push(part(new THREE.CylinderGeometry(5, 5, 1, 8), 0xc98f52, 0, 15.8, 0));
  parts.push(part(new THREE.CylinderGeometry(2.6, 3.2, 4, 8), 0xf0d090, 0, 18.2, 0));
  parts.push(part(new THREE.ConeGeometry(3.6, 4.6, 8), 0x2fb8a8, 0, 22.4, 0));
  parts.push(part(new THREE.SphereGeometry(0.9, 8, 6), 0xffd23f, 0, 25.3, 0));
  for (let i = 0; i < 4; i++) {                                                  // hanging lanterns
    const a = (i / 4) * Math.PI * 2 + 0.4;
    parts.push(part(new THREE.SphereGeometry(0.85, 8, 6), [0xff8a3a, 0x4ef0ff, 0xff6fb0, 0xffd23f][i],
      Math.cos(a) * 4.6, 15, Math.sin(a) * 4.6));
  }
  for (const sz of [-1, 1]) parts.push(part(new THREE.CircleGeometry(2, 14), 0xf4f0e2, 0, 18.2, sz * 3.05, sz > 0 ? 0 : Math.PI));
  const g = new THREE.Group(); g.add(mergedProp(parts)); return g;
}
function makeTikiBar(): THREE.Group {
  const parts = [
    part(new THREE.BoxGeometry(7, 1.5, 3), 0xc79350, 0, 0.75, 0),          // counter
    part(new THREE.BoxGeometry(7.4, 0.35, 3.4), 0xe8c07a, 0, 1.62, 0),     // bar top
  ];
  for (const sx of [-3.2, 3.2]) parts.push(part(new THREE.CylinderGeometry(0.24, 0.28, 4.4, 7), 0x8a6132, sx, 2.2, -1.2));
  parts.push(part(new THREE.ConeGeometry(5.4, 2.2, 4), 0xd8b56a, 0, 5.4, -0.6));   // thatch roof
  parts.push(part(new THREE.TorusGeometry(0.6, 0.14, 6, 12), 0xff8a3a, -2.4, 2.3, 1.2, Math.PI / 2));
  for (let i = 0; i < 3; i++) parts.push(part(new THREE.CylinderGeometry(0.34, 0.3, 1.1, 8), [0x7ee8d8, 0xffd23f, 0xff6fb0][i], -2 + i * 2, 2.35, 1.1));
  const g = new THREE.Group(); g.add(mergedProp(parts)); return g;
}
function makeSpeakerStack(): THREE.Group {
  // From above, the old version was a black rectangle: the cones faced +Z and
  // the top-down camera never saw them. It now has a flight-case silhouette —
  // pale corner bracing, a gold grille, a lit VU strip and a stage light on
  // top — so it reads as PA gear from the one angle the player actually uses.
  const CASE = 0x2a2038, TRIM = 0xe8e2f2, GOLD = 0xf0c050;
  const parts = [
    part(new THREE.BoxGeometry(3.0, 0.4, 2.6), 0x1a1424, 0, 0.2, 0),            // riser
    part(new THREE.BoxGeometry(2.7, 3.4, 2.3), CASE, 0, 2.1, 0),                 // sub
    part(new THREE.BoxGeometry(2.5, 2.6, 2.1), CASE, 0, 5.1, 0),                 // mid
    part(new THREE.BoxGeometry(2.2, 1.5, 1.9), CASE, 0, 7.15, 0),                // horn box
  ];
  // corner bracing on every vertical edge — the thing that says "flight case"
  for (const sx of [-1.3, 1.3]) for (const sz of [-1.1, 1.1]) {
    parts.push(part(new THREE.BoxGeometry(0.22, 6.3, 0.22), TRIM, sx, 3.6, sz));
  }
  for (const y of [0.45, 3.82, 6.4, 7.9]) parts.push(part(new THREE.BoxGeometry(2.85, 0.2, 2.45), TRIM, 0, y, 0));
  // grilles read from above as gold discs on the box TOP faces, not the front
  parts.push(part(new THREE.CylinderGeometry(0.8, 0.8, 0.16, 16), GOLD, 0, 3.88, 0));
  parts.push(part(new THREE.CylinderGeometry(0.62, 0.62, 0.16, 14), GOLD, 0, 6.46, 0));
  // and again on the front face for the low camera
  parts.push(part(new THREE.CylinderGeometry(0.85, 0.85, 0.22, 16), GOLD, 0, 2.1, 1.2, Math.PI / 2));
  parts.push(part(new THREE.CylinderGeometry(0.6, 0.6, 0.22, 14), GOLD, 0, 5.1, 1.1, Math.PI / 2));
  // VU strip: four lit blocks up the side
  for (let i = 0; i < 4; i++) {
    parts.push(part(new THREE.BoxGeometry(0.16, 0.34, 0.5), [0x4ef0a0, 0x9af04e, 0xffd23f, 0xff2fa0][i], 1.4, 4.6 + i * 0.5, 0.7));
  }
  // a par-can on top, angled at the floor
  parts.push(part(new THREE.CylinderGeometry(0.34, 0.46, 0.9, 10), 0x1a1424, 0, 8.3, 0.35, -0.7));
  // UNLIT accents. Everything on the dance floor is dark on dark under a
  // purple night sky; a "glowing" strip painted into the lit material just
  // goes dark with the rest of it and the whole stack reads as a hole.
  const glow: THREE.BufferGeometry[] = [
    part(new THREE.CircleGeometry(0.44, 12), 0x9af0ff, 0, 8.05, 0.9, -0.7),
  ];
  for (const sx of [-1.36, 1.36]) for (const y of [2.1, 5.1]) {
    glow.push(part(new THREE.BoxGeometry(0.12, 2.2, 0.12), sx < 0 ? 0xff2fa0 : 0x4ef0ff, sx, y, 1.14));
  }
  glow.push(part(new THREE.BoxGeometry(2.5, 0.14, 0.14), 0xff2fa0, 0, 0.44, 1.2));
  glow.push(part(new THREE.BoxGeometry(2.2, 0.14, 0.14), 0x4ef0ff, 0, 7.9, 1.0));
  const g = new THREE.Group();
  g.add(mergedProp(parts));
  g.add(mergedProp(glow, PROP_GLOW_MAT));
  return g;
}
function makeMarketStall(): THREE.Group {
  // A flat awning slab reads as a coloured rectangle from above. A SCALLOPED
  // striped canopy with a valance reads as a market stall — and the stripes
  // are the only part of it the top-down camera can see, so they carry it.
  const A = pick([0xff5d7e, 0x4de8ff, 0xffd23f, 0x7ef2a0, 0xff8ac0, 0xa07ef0]);
  const parts = [
    part(new THREE.BoxGeometry(5, 1.2, 2.6), 0xc79350, 0, 1.5, 0),           // counter
    part(new THREE.BoxGeometry(5.3, 0.22, 2.9), 0xe8c07a, 0, 2.2, 0),        // counter top
  ];
  for (const sx of [-2.2, 2.2]) for (const sz of [-1.1, 1.1]) {
    parts.push(part(new THREE.CylinderGeometry(0.13, 0.13, 4.0, 6), 0x8a6132, sx, 2.0, sz));
  }
  // striped canopy: alternating slats, tilted forward
  for (let i = 0; i < 7; i++) {
    parts.push(part(new THREE.BoxGeometry(0.8, 0.18, 3.5), i % 2 ? A : 0xfdf3de, -2.4 + i * 0.8, 3.9, 0.2, -0.22));
  }
  // scalloped valance along the front lip
  for (let i = 0; i < 7; i++) {
    parts.push(part(new THREE.SphereGeometry(0.34, 8, 6, 0, Math.PI), i % 2 ? A : 0xfdf3de,
      -2.4 + i * 0.8, 3.5, 1.85, Math.PI / 2));
  }
  // goods: fruit crates and hanging lanterns, not four loose spheres
  for (let i = 0; i < 3; i++) {
    parts.push(part(new THREE.BoxGeometry(1.15, 0.5, 0.95), 0xb5804a, -1.5 + i * 1.5, 2.5, 0.35));
    for (let k = 0; k < 3; k++) {
      parts.push(part(new THREE.SphereGeometry(0.24, 8, 6), [0xff8a3a, 0xffd23f, 0xff5d7e, 0x7ef2a0, 0xff6fb0][(i + k) % 5],
        -1.85 + i * 1.5 + k * 0.35, 2.86, 0.35));
    }
  }
  for (const sx of [-1.8, 1.8]) parts.push(part(new THREE.SphereGeometry(0.3, 8, 6), 0xffd23f, sx, 3.3, -1.25));
  // a chalkboard price sign leaning on the end
  parts.push(part(new THREE.BoxGeometry(0.1, 1.3, 0.95), 0x2e2a38, 2.65, 0.65, 0.4, 0, 0, 0.16));
  const g = new THREE.Group(); g.add(mergedProp(parts)); return g;
}
// black lacquer with heavy gold banding. The gold is the only part a
// top-down camera reads; brown-on-brown read as nothing.
function makeChest(): THREE.Group {
  const parts = [
    part(new THREE.BoxGeometry(2.4, 1.3, 1.6), 0x2e2634, 0, 0.65, 0),
    part(new THREE.CylinderGeometry(0.8, 0.8, 2.4, 10, 1, false, 0, Math.PI), 0xf0c050, 0, 1.3, 0, 0, 0, Math.PI / 2),
    part(new THREE.BoxGeometry(2.5, 0.22, 0.3), 0xffd23f, 0, 0.9, 0),
    part(new THREE.SphereGeometry(0.5, 10, 8), 0xffd23f, 0, 1.55, 0.5),
  ];
  const g = new THREE.Group(); g.add(mergedProp(parts)); return g;
}
// a resort's DECORATIVE painted barrel — bright staves, dark hoops — not a
// dockyard cask, and nothing to do with what might once have been in it. Around 90 of these were the largest single source of brown.
const STAVE_COLS = [0xff6a5e, 0x2fb8a8, 0xf0c050, 0xff8ac0, 0x4dd0e1, 0xfdf3de];
const PAINTED_STAVE = (): number => STAVE_COLS[(Math.random() * STAVE_COLS.length) | 0];
function makeBarrel(): THREE.Group {
  const parts = [
    part(new THREE.CylinderGeometry(0.9, 0.75, 2.2, 12), PAINTED_STAVE(), 0, 1.1, 0),
    part(new THREE.TorusGeometry(0.88, 0.09, 6, 14), 0x2e2a34, 0, 0.55, 0, Math.PI / 2),
    part(new THREE.TorusGeometry(0.88, 0.09, 6, 14), 0x2e2a34, 0, 1.65, 0, Math.PI / 2),
  ];
  const g = new THREE.Group(); g.add(mergedProp(parts)); return noFront(g);
}
function makeCannon(): THREE.Group {
  const parts = [
    part(new THREE.BoxGeometry(2.6, 0.9, 1.6), 0x6a4526, 0, 0.7, 0),
    part(new THREE.CylinderGeometry(0.36, 0.46, 3.2, 12), 0x30343c, 0.3, 1.5, 0, 0, 0, Math.PI / 2 - 0.22),
  ];
  for (const sx of [-0.8, 0.8]) parts.push(part(new THREE.CylinderGeometry(0.55, 0.55, 0.24, 12), 0x4a3a2a, sx, 0.55, 0.85, 0, 0, Math.PI / 2));
  const g = new THREE.Group(); g.add(mergedProp(parts)); return g;
}
function makeGalleon(): THREE.Group {
  // THE landmark of Pirate Bay: a three-mast galleon moored at the pier head,
  // black sails, gold trim, a skull flag and a lantern at the stern.
  const g = new THREE.Group();
  const hull = [
    part(new THREE.CylinderGeometry(3.2, 2.2, 15, 12, 1, false, 0, Math.PI), 0x6a4526, 0, 2.2, 0, Math.PI / 2, 0, Math.PI / 2),
    part(new THREE.BoxGeometry(15, 0.5, 5.6), 0xa8814f, 0, 3.4, 0),           // deck
    part(new THREE.BoxGeometry(4.6, 2.6, 5.2), 0x8a5a2a, -5.2, 4.7, 0),       // stern castle
    part(new THREE.BoxGeometry(3.2, 1.8, 4.6), 0x8a5a2a, 5.6, 4.3, 0),        // forecastle
    part(new THREE.BoxGeometry(15.4, 0.42, 0.42), 0xffd23f, 0, 3.9, 2.8),     // gold rail
    part(new THREE.BoxGeometry(15.4, 0.42, 0.42), 0xffd23f, 0, 3.9, -2.8),
    part(new THREE.ConeGeometry(1.1, 4.2, 8), 0x6a4526, 8.6, 3.2, 0, 0, 0, -Math.PI / 2 + 0.35),   // bowsprit
  ];
  // three masts with black sails
  for (const [mx, h, sw] of [[-4.2, 11, 5], [0.4, 14, 6.4], [4.8, 10, 4.4]] as [number, number, number][]) {
    hull.push(part(new THREE.CylinderGeometry(0.32, 0.4, h, 8), 0x8a6132, mx, 3.4 + h / 2, 0));
    hull.push(part(new THREE.BoxGeometry(0.28, 0.28, sw + 1.6), 0x6a4526, mx, 3.4 + h * 0.78, 0));
    hull.push(part(new THREE.BoxGeometry(0.3, h * 0.42, sw), 0x2a2430, mx, 3.4 + h * 0.56, 0));   // sail
    hull.push(part(new THREE.BoxGeometry(0.3, h * 0.3, sw * 0.78), 0x342e3c, mx, 3.4 + h * 0.24, 0));
  }
  // skull flag + stern lantern
  hull.push(part(new THREE.BoxGeometry(0.16, 1.1, 1.8), 0x1a1620, 0.4, 16.4, 0.9));
  hull.push(part(new THREE.SphereGeometry(0.34, 8, 6), 0xf2ecd8, 0.4, 16.5, 0.9));
  hull.push(part(new THREE.SphereGeometry(0.42, 8, 6), 0xffd23f, -7.2, 6.4, 0));
  g.add(mergedProp(hull));
  return g;
}
function makeThatchHut(): THREE.Group {
  // Twenty-eight of these across Old Town and the docks with ROTATION as the
  // only variation — a quarter of the district's frame was one cream and the
  // rest was identical tan cone-hats, and nothing in it said "old town".
  // Three builds: a round hut, a taller squared one, and a lean-to shack.
  const wall = pick([0xf0e0c0, 0xe8d4a8, 0xf6ecd2, 0xdcc9a4]);
  const thatch = pick([0xc9a25e, 0xb8904c, 0xd4b070]);
  const kind = Math.random();
  const parts: THREE.BufferGeometry[] = [];
  if (kind < 0.42) {                                   // round hut
    const h = rand(2.8, 3.6);
    parts.push(part(new THREE.CylinderGeometry(2.6, 2.85, h, 10), wall, 0, h / 2, 0));
    parts.push(part(new THREE.ConeGeometry(3.9, rand(2.4, 3.2), 10), thatch, 0, h + 1.3, 0));
    parts.push(part(new THREE.BoxGeometry(1.2, 2, 0.2), 0x8a6132, 0, 1, 2.7));
  } else if (kind < 0.78) {                            // squared two-storey
    const h = rand(3.8, 4.8);
    parts.push(part(new THREE.BoxGeometry(4.6, h, 4.4), wall, 0, h / 2, 0));
    parts.push(part(new THREE.ConeGeometry(3.9, rand(2.2, 2.8), 4), thatch, 0, h + 1.1, 0, 0, Math.PI / 4, 0));
    parts.push(part(new THREE.BoxGeometry(1.2, 2.1, 0.2), 0x8a6132, -0.8, 1.05, 2.25));
    parts.push(part(new THREE.BoxGeometry(1.0, 0.9, 0.2), 0x5a7a8a, 1.2, 2.6, 2.25));   // shutter
    parts.push(part(new THREE.BoxGeometry(5.0, 0.24, 0.9), 0x8a6132, 0, h * 0.62, 2.5)); // sill run
  } else {                                             // lean-to, with cargo
    parts.push(part(new THREE.BoxGeometry(4.2, 2.6, 3.4), wall, 0, 1.3, 0));
    parts.push(part(new THREE.BoxGeometry(5.0, 0.26, 4.2), thatch, 0, 2.9, 0.3, -0.26));
    parts.push(part(new THREE.CylinderGeometry(0.14, 0.14, 2.9, 5), 0x8a6132, 2.2, 1.45, 1.9));
    parts.push(part(new THREE.CylinderGeometry(0.14, 0.14, 2.9, 5), 0x8a6132, -2.2, 1.45, 1.9));
    parts.push(part(new THREE.CylinderGeometry(0.62, 0.62, 1.3, 8), 0x7a5a3a, 1.5, 0.65, 2.4));   // barrel
    parts.push(part(new THREE.BoxGeometry(1.1, 0.9, 1.0), 0x9a7448, -1.3, 0.45, 2.5));            // crate
  }
  const g = new THREE.Group(); g.add(mergedProp(parts)); return g;
}
function makePalm(): THREE.Group {
  // leaning trunk + 6 drooping fronds. It used to be NINE meshes and three
  // materials, times 207 palms on Pirate Bay — 1,863 draw calls for the trees
  // alone. Same silhouette, one mesh, on the shared prop material.
  const parts: THREE.BufferGeometry[] = [
    part(new THREE.CylinderGeometry(0.28, 0.42, 6.2, 7), 0xb08a5a, 0.3, 3.1, 0, 0, 0, -0.12),
  ];
  // Six identical fronds, all at one height, all drooping the same amount, all
  // coplanar: from the fixed 46 degree camera that is a green starfish, and it
  // was the dominant object on the island. Every blade now has its own length,
  // droop, height and tint, and two ride high while two hang low, so the crown
  // has volume and shadows itself.
  const FR = [
    [1.00, -0.30, 0.55, 0x54b060], [0.86, -0.62, -0.30, 0x459a52],
    [1.10, -0.18, 0.85, 0x5fbc68], [0.78, -0.70, -0.45, 0x3f8f4c],
    [0.94, -0.42, 0.10, 0x4faa5a], [1.04, -0.26, 0.40, 0x58b463],
  ];
  for (let i = 0; i < FR.length; i++) {
    const [len, droop, lift, col] = FR[i];
    const f = part(new THREE.SphereGeometry(1, 8, 6), col as number,
      1.7 * (len as number), 0, 0, 0, 0, droop as number,
      2.3 * (len as number), 0.24, 0.72 + i * 0.03);
    f.rotateY((i / FR.length) * Math.PI * 2 + 0.22);
    f.translate(0.6, 6.1 + (lift as number), 0);
    parts.push(f);
  }
  // a nut cluster gives the crown a solid mass instead of a bare hub
  for (const [nx, ny, nz] of [[0.55, 5.72, 0.34], [0.9, 5.62, -0.2], [0.3, 5.55, -0.35]])
    parts.push(part(new THREE.SphereGeometry(0.34, 7, 6), 0x8a6a4a, nx, ny, nz));
  for (const a2 of [0.5, 2.6])
    parts.push(part(new THREE.SphereGeometry(0.26, 8, 6), 0x8a6a4a,
      0.6 + Math.cos(a2) * 0.5, 5.8, Math.sin(a2) * 0.5));
  const grp = new THREE.Group(); grp.add(mergedProp(parts)); return noFront(grp);
}

function makeBush(): THREE.Mesh {
  // ONE SPHERE IS JELLY, and the answer was already twenty lines up.
  //
  // makeTree() builds its canopy from four clustered spheres and reads as
  // foliage. This was ONE sphere, half sunk into the ground so it domed — and
  // in the owner's phone photo of Maple Falls the two sit in the same frame,
  // which is exactly where the difference shows: the tree is a plant and the
  // bush beside it is a blob of green jelly. Counted with qa/variety.mjs: 564
  // of them in Maple Falls alone, the second-most-repeated prop in the game.
  //
  // Three lobes now, two-tone off one base the way makeTree does it, merged to
  // the SAME single draw call the one-sphere version cost. ~192 triangles ->
  // ~430; at 564 bushes that is ~134k in a town that already carries millions.
  //
  // The lobes stay INSIDE the old silhouette — main lobe at 0.80R, everything
  // half-buried exactly as before — so no eat range, spacing or collision
  // radius moves. This is a change of shape, not of size.
  const base = pick(WORLD_ID === 'gameday'
    // scrub under a fall tree line: still mostly green, going over at the
    // tips. All-amber bushes made the rim read as one flat orange band.
    ? [0x6a9a4a, 0x8a9a3a, 0xb8823a, 0x7a8f3a, 0xa8622f]
    : [0x6cc86e, 0x5db06a, 0x7ed57a]);
  const dark = shade(base, 0.76);
  const light = tint(base, 0.20);
  const R = rand(1.4, 2.1);
  return noFront(mergedProp([
    part(new THREE.SphereGeometry(R * 0.80, 12, 8), base, 0, R * 0.05, 0, 0, 0, 0, 1, 0.78, 1),
    part(new THREE.SphereGeometry(R * 0.58, 10, 7), dark, -R * 0.44, R * 0.02, R * 0.26, 0, 0, 0, 1, 0.72, 1),
    part(new THREE.SphereGeometry(R * 0.52, 10, 7), light, R * 0.42, R * 0.16, -R * 0.22, 0, 0, 0, 1, 0.74, 1),
  ], PROP_SMOOTH_MAT));
}
function makeMailbox(): THREE.Group {
  const g = new THREE.Group();
  g.add(mergedProp([
    part(new THREE.CylinderGeometry(0.15, 0.15, 1.6, 5), 0x8a6a4a, 0, 0.8, 0),
    part(new THREE.BoxGeometry(0.6, 0.7, 1.1), pick([0xd85a5a, 0x4d7de8, 0x4db07a]), 0, 1.7, 0),
  ]));
  return g;
}
function makeBench(): THREE.Group {
  // it had a seat and a back and NOTHING holding either up — 42 of them hovering
  // a metre off the ground across both islands.
  const g = new THREE.Group();
  const wood = 0x9a7a5a, iron = 0x4a4a52;
  const parts = [
    part(new THREE.BoxGeometry(3, 0.22, 1), wood, 0, 1, 0),          // seat slats
    part(new THREE.BoxGeometry(3, 0.9, 0.24), wood, 0, 1.55, -0.36), // back
    part(new THREE.BoxGeometry(3, 0.16, 0.9), wood, 0, 1.14, 0.02),  // second slat
  ];
  for (const sx of [-1.28, 1.28]) {                                   // cast-iron end frames
    parts.push(part(new THREE.BoxGeometry(0.16, 0.9, 0.16), iron, sx, 0.45, -0.36));
    parts.push(part(new THREE.BoxGeometry(0.16, 0.9, 0.16), iron, sx, 0.45, 0.34));
    parts.push(part(new THREE.BoxGeometry(0.18, 0.14, 0.95), iron, sx, 0.9, 0));
    parts.push(part(new THREE.BoxGeometry(0.14, 1.05, 0.14), iron, sx, 1.5, -0.4));
  }
  g.add(mergedProp(parts));
  return g;
}

// ── tiny "starter food" — what a speck-sized void eats first ──────────────────
function makeTorch(): THREE.Group {
  // a lit bamboo tiki torch — the resort's answer to a traffic cone
  const parts = [
    part(new THREE.CylinderGeometry(0.13, 0.16, 2.6, 7), 0x8a6132, 0, 1.3, 0),
    part(new THREE.CylinderGeometry(0.32, 0.24, 0.5, 8), 0x4a3a2a, 0, 2.7, 0),
    part(new THREE.ConeGeometry(0.26, 0.72, 7), 0xffb054, 0, 3.3, 0),
    part(new THREE.ConeGeometry(0.14, 0.4, 6), 0xffe066, 0, 3.5, 0),
  ];
  const g = new THREE.Group(); g.add(mergedProp(parts)); return g;
}
function makeCone(): THREE.Group {
  const g = new THREE.Group();
  g.add(mergedProp([
    part(new THREE.ConeGeometry(0.6, 1.5, 10), 0xff7a2a, 0, 0.75, 0),
    part(new THREE.CylinderGeometry(0.42, 0.5, 0.3, 10), 0xffffff, 0, 0.7, 0),
  ]));
  return noFront(g);
}
function makeHydrant(): THREE.Group {
  // was EIGHT draw calls per hydrant — now one
  const R = 0xe23b2e, L = 0xf0f2f6;
  const parts = [
    part(new THREE.CylinderGeometry(0.52, 0.56, 0.18, 8), R, 0, 0.09, 0),
    part(new THREE.CylinderGeometry(0.4, 0.45, 1.1, 8), R, 0, 0.68, 0),
    part(new THREE.SphereGeometry(0.42, 8, 6), R, 0, 1.22, 0),
    part(new THREE.CylinderGeometry(0.12, 0.14, 0.16, 6), L, 0, 1.6, 0),
  ];
  for (const sd of [-1, 1]) {
    parts.push(part(new THREE.CylinderGeometry(0.14, 0.14, 0.5, 6), R, sd * 0.4, 0.78, 0, 0, 0, Math.PI / 2));
    parts.push(part(new THREE.CylinderGeometry(0.18, 0.18, 0.1, 6), L, sd * 0.66, 0.78, 0, 0, 0, Math.PI / 2));
  }
  const g = new THREE.Group(); g.add(mergedProp(parts));
  return noFront(g);
}
function makeTrash(): THREE.Group {
  const g = new THREE.Group();
  g.add(mergedProp([
    part(new THREE.CylinderGeometry(0.5, 0.42, 1.3, 10), pick([0x4d9a5e, 0x4d74a8, 0x6b7280]), 0, 0.65, 0),
    part(new THREE.CylinderGeometry(0.56, 0.56, 0.2, 10), 0x555c68, 0, 1.35, 0),
  ]));
  return noFront(g);
}
function makeFlowers(): THREE.Group {
  // ── A GREEN D20 WITH GUMBALLS ON IT ───────────────────────────────────────
  // The mound was IcosahedronGeometry(0.7, 0): twenty flat triangles, each
  // catching its own tone. This is the most-placed small prop in Maple Falls —
  // nine of eleven biome pools, double-weighted in cozy and park, plus six
  // direct scatter loops — and it is the exact pathology this file has already
  // condemned twice in writing ("ONE SPHERE IS JELLY", "a pile of orange
  // rocks"), left standing in the prop that appears most.
  //
  // AND THE MATERIAL VOTE HID IT. mergedProp picks flat or smooth by counting
  // how many parts are round, and ROUND_GEO does not list Icosahedron — so the
  // mound counted as flat while the five blossoms counted as round, 5/6 cleared
  // ROUND_SHARE, and the whole prop was assigned PROP_SMOOTH_MAT. Polyhedron
  // geometry carries per-face normals that toNonIndexed() preserves, so it
  // rendered faceted ON the smooth material. Any probe that reads the material
  // rather than the normals reports this prop as smooth. It is not.
  //
  // A squashed sphere matches ROUND_GEO, keeps the classifier honest, and
  // shades. The blossoms get stems and are seated ON the dome instead of at a
  // fixed y = 0.8, which is what left the outer ones hanging in the air with
  // daylight under them.
  const R = 0.7, H = 0.7;
  const parts = [part(new THREE.SphereGeometry(R, 9, 6), 0x5db06a, 0, 0.5, 0, 0, 0, 0, 1, H, 1)];
  for (let i = 0; i < 5; i++) {
    const bx = rand(-0.46, 0.46), bz = rand(-0.46, 0.46);
    const d = Math.min(0.99, Math.hypot(bx, bz) / R);
    const top = 0.5 + H * R * Math.sqrt(1 - d * d);      // the dome's own surface here
    const col = pick([0xff6fb0, 0xffd23f, 0xff5a4d, 0xa87bff, 0xffffff]);
    parts.push(part(new THREE.CylinderGeometry(0.022, 0.032, 0.26, 4), 0x4a8f52, bx, top + 0.10, bz));
    parts.push(part(new THREE.SphereGeometry(0.15, 6, 5), col, bx, top + 0.25, bz));
  }
  const g = new THREE.Group(); g.add(mergedProp(parts));
  return noFront(g);
}
function makeCoins(): THREE.Group {
  const g = new THREE.Group();
  const gold = new THREE.MeshStandardMaterial({ color: 0xf2c94c, roughness: 0.3, metalness: 0.55, emissive: 0xa87614, emissiveIntensity: 0.25 });
  const n = 2 + Math.floor(Math.random() * 2);
  for (let i = 0; i < n; i++) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.18, 14), gold);
    c.position.set(rand(-0.15, 0.15), 0.1 + i * 0.2, rand(-0.15, 0.15));
    c.rotation.y = rand(0, Math.PI); g.add(c);
  }
  g.userData.coin = 5;   // flat wallet value — every pile visibly pays
  return noFront(g);
}
// shared lamp-head material: ONE emissive uniform lights every streetlamp on
// the island at dusk (see setDusk)
const winFrameMatShared = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 });
const winGlassMatShared = new THREE.MeshStandardMaterial({ color: 0xffe9b8, roughness: 0.4, emissive: 0xffd98a, emissiveIntensity: 0.25 });
const lampPoleMat = new THREE.MeshStandardMaterial({ color: 0x3c4454, roughness: 0.6, metalness: 0.3 });
const lampHeadMat = new THREE.MeshStandardMaterial({ color: 0xfff2c0, emissive: 0xffdf8a, emissiveIntensity: 0.8, roughness: 0.4 });
function makeLamp(): THREE.Group {
  // 4.04 units tall — a street lamp you could change the bulb on without a
  // ladder, standing beside 3.5-unit pedestrians. A real one is two and a half
  // people. It also gets a base and a lantern instead of a ball on a stick.
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.42, 0.5, 8), lampPoleMat);
  base.position.y = 0.25; g.add(base);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.19, 7.4, 6), lampPoleMat);
  pole.position.y = 3.9; g.add(pole);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.95), lampPoleMat);
  arm.position.set(0, 7.55, 0.42); g.add(arm);
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.62, 8), lampPoleMat);
  head.position.set(0, 7.5, 0.86); g.add(head);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), lampHeadMat);
  bulb.position.set(0, 7.1, 0.86); g.add(bulb);
  return g;
}
const makeTinyProp = () => pick([makeCone, makeHydrant, makeTrash, makeFlowers])();
function makeShell(): THREE.Group {
  const g = new THREE.Group();
  const sh = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2),
    stdMat(pick([0xffd9e8, 0xfff0d8, 0xe8f0ff]), 0.55, true));
  sh.scale.set(1, 0.55, 0.85); g.add(sh);
  return noFront(g);
}
function makeMushroom(): THREE.Group {
  const g = new THREE.Group();
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.5, 7),
    stdMat(0xf2ead8, 0.8));
  stem.position.y = 0.25; g.add(stem);
  const capM = new THREE.Mesh(new THREE.SphereGeometry(0.42, 9, 7, 0, Math.PI * 2, 0, Math.PI / 2),
    stdMat(pick([0xe0483a, 0xd88a3a]), 0.7, true));
  capM.position.y = 0.48; capM.scale.y = 0.7; g.add(capM);
  const dot = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 5), stdMat(0xffffff, 1));
  dot.position.set(0.16, 0.72, 0.14); g.add(dot);
  return noFront(g);
}
function makeGolfball(): THREE.Group {
  const g = new THREE.Group();
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), stdMat(0xffffff, 0.35));
  b.position.y = 0.3; g.add(b);
  return noFront(g);
}
// ── MAPLE FALLS' snack vocabulary ─────────────────────────────────────────
// Same idea, this island's nouns: pumpkins in the fields, shells on the lake
// shore, and — everywhere, in every district — one more sign for the fair.
const tinyForMaple = (biome: Biome): THREE.Object3D => {
  const sign = () => MS.makeLawnSign(mrnd() < 0.5 ? 0 : 1);
  const pool: (() => THREE.Object3D)[] =
    biome === 'cozy' ? [makeFlowers, makeFlowers, makeBush, makeMushroom, sign]
    : biome === 'beach' ? [makeShell, makeShell, makeFlowers, MS.makeLifeRing]
    : biome === 'forest' ? [makeMushroom, makeMushroom, makeFlowers, makeReeds]
    : biome === 'park' ? [makeGolfball, makeFlowers, makeFlowers, MS.makeParkGrill]
    : biome === 'farm' ? [MS.makePumpkin, MS.makePumpkin, makeFlowers, sign]
    // these three were cones and bins, which is what a district looks like when
    // nobody has decided what it sells
    : biome === 'fair' ? [MS.makePumpkin, makeFlowers, MS.makeNewsBox, sign]
    // a campus is not a driving range and not a swimming pool. It was seeding
    // 37 golf balls and 38 life-ring posts across the football field.
    : biome === 'campus' ? [makeFlowers, MS.makeNewsBox, MS.makePlanter, sign]
    : biome === 'strip' ? [makeTrash, MS.makeNewsBox, MS.makePlanter, sign]
    : biome === 'plaza' ? [makeFlowers, MS.makeNewsBox, MS.makePlanter, sign]
    : biome === 'downtown' ? [makeHydrant, makeTrash, MS.makeNewsBox, sign]
    : [makeHydrant, makeTrash, makeFlowers, sign];
  return mpick(pool)();
};
function makeLuggage(): THREE.Group {
  const g = new THREE.Group();
  const b = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.6, 0.4), stdMat(pick([0xff5a4d, 0x5ec8d8, 0xffd23f, 0xb98cff]), 0.7));
  b.position.y = 0.3; g.add(b);
  const h = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.1, 0.08), stdMat(0x3a3f4d, 1));
  h.position.y = 0.68; g.add(h);
  return g;
}
function makeReeds(): THREE.Group {
  // seven meshes and seven materials per clump, hundreds of clumps per island.
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 5; i++) {
    const h = rand(0.9, 1.6), rx = rand(-0.5, 0.5), rz = rand(-0.5, 0.5);
    parts.push(part(new THREE.CylinderGeometry(0.03, 0.05, h, 4),
      pick([0x4faa5a, 0x67b25c, 0x7ec96e]), rx, h / 2, rz, 0, 0, rand(-0.15, 0.15)));
    if (i < 2) parts.push(part(new THREE.CapsuleGeometry(0.07, 0.24, 3, 6), 0x9a7a5a, rx, h + 0.1, rz));
  }
  const g = new THREE.Group(); g.add(mergedProp(parts)); return noFront(g);
}

// ── civic/retail stand-ins (offline dev + far LOD) — downtown must NEVER show
// a gabled suburban house on pavement, and the plaza always has a fountain ────
function makeShopBox(): THREE.Group {
  // four meshes and four materials each, and from the only angle the camera
  // ever uses it was a pale rectangle. One mesh now, and a roof you can name:
  // dark membrane for contrast, plant, a stack and a skylight.
  const g = new THREE.Group();
  const wall = pick([0xf6efe2, 0xbfe0cf, 0xeab8cc]);
  const parts = [
    part(new THREE.BoxGeometry(8, 4.5, 6), wall, 0, 2.25, 0),
    part(new THREE.BoxGeometry(8.4, 0.5, 6.4), 0xd8d4de, 0, 4.6, 0),
    part(new THREE.BoxGeometry(7.3, 0.2, 5.3), 0x4e5560, 0, 4.72, 0),          // membrane
    part(new THREE.BoxGeometry(8.2, 0.28, 1.7), pick([0xe8604d, 0x58a8c4, 0x58c470]), 0, 3.05, 3.4, 0.35),
    part(new THREE.BoxGeometry(5.6, 2, 0.2), 0x2c3a52, 0, 1.9, 3.02),
    part(new THREE.BoxGeometry(1.9, 0.9, 1.5), 0xaeb6c2, rand(-2, 2), 5.25, rand(-1.4, 1.4)),
    part(new THREE.CylinderGeometry(0.2, 0.24, 1.2, 6), 0x8b93a0, rand(-2.6, 2.6), 5.4, rand(-1.6, 1.6)),
    part(new THREE.BoxGeometry(1.8, 0.16, 1.3), 0x9fd0e8, rand(-1.6, 1.6), 4.9, rand(-1.2, 1.2)),
  ];
  g.add(mergedProp(parts));
  return g;
}
function makeCivicHall(): THREE.Group {
  const g = new THREE.Group();
  const cream = stdMat(0xf2efe6, 0.8);
  const body = new THREE.Mesh(new THREE.BoxGeometry(16, 8, 9), cream);
  body.position.y = 4; g.add(body);
  for (const sx of [-5.4, -1.8, 1.8, 5.4]) {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.55, 7, 10), cream);
    col.position.set(sx, 3.5, 5); g.add(col);
  }
  const ped = new THREE.Mesh(new THREE.BoxGeometry(17, 1.4, 10.5), cream);
  ped.position.y = 8.4; g.add(ped);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(3.4, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2),
    stdMat(0x6fa8a0, 0.5));
  dome.position.y = 9; g.add(dome);
  return g;
}
function makeFountainFB(): THREE.Group {
  const g = new THREE.Group();
  const stone = stdMat(0xd8d4de, 0.7);
  const basin = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 5, 1.2, 18), stone);
  basin.position.y = 0.6; g.add(basin);
  const water = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.2, 0.3, 18),
    new THREE.MeshStandardMaterial({ color: WORLD.waterShallow, roughness: 0.15 }));
  water.position.y = 1.25; g.add(water);
  const tier = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.5, 1, 14), stone);
  tier.position.y = 2; g.add(tier);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.1, 1.4, 12), stone);
  top.position.y = 3.2; g.add(top);
  return g;
}


// silhouette sample points (3D) for the coast-dressing pass in populate()
const ROAD_CENTERS_3D_LOCAL = ROAD_CENTERS.map((c) => (c - CX) * SCALE);
const SIL3_FRINGE: [number, number][] = SIL_POLY.filter((_, i) => i % 3 === 0)
  .map(([wx2, wy2]) => [(wx2 - CX) * SCALE, (wy2 - CZ) * SCALE] as [number, number]);

// ── P0 fallback kit: every GLB prop has a real procedural stand-in, so no
// district is ever sparse while meshes stream (or offline). Cheap primitives,
// toy-bright colors, correct silhouettes.
const std = (c: number, r = 0.8) => stdMat(c, r);   // was a fresh material per mesh, per prop, per island
function makeUmbrellaFB(): THREE.Group {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3, 6), std(0xf4f6fa));
  pole.position.y = 1.5; g.add(pole);
  const top = new THREE.Mesh(new THREE.ConeGeometry(2, 0.9, 10), std(pick([0xff6a5e, 0x5ec8d8, 0xffd23f, 0xf06fb0])));
  top.position.y = 3; g.add(top);
  g.rotation.z = rand(-0.12, 0.12);
  return g;
}
function makeSandcastleFB(): THREE.Group {
  const g = new THREE.Group(); const m = std(0xeed9a0, 0.95);
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.9, 1.6), m); base.position.y = 0.45; g.add(base);
  for (const [sx, sz] of [[-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7], [0.7, 0.7]] as const) {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 1.4, 8), m); t.position.set(sx, 0.7, sz); g.add(t);
    const c = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.5, 8), std(0xffd23f)); c.position.set(sx, 1.62, sz); g.add(c);
  }
  return g;
}
function makeCabanaFB(): THREE.Group {
  const g = new THREE.Group(); const col = pick([0xff6a5e, 0x5ec8d8]);
  for (const [sx, sz] of [[-1.5, -1.2], [1.5, -1.2], [-1.5, 1.2], [1.5, 1.2]] as const) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 3, 6), std(0xf4f0e2)); post.position.set(sx, 1.5, sz); g.add(post);
  }
  const roof = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.24, 3), std(col)); roof.position.y = 3.1; g.add(roof);
  const back = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.4, 0.14), std(0xfaf6ea)); back.position.set(0, 1.4, -1.2); g.add(back);
  return g;
}
function makeLifeguardFB(): THREE.Group {
  const g = new THREE.Group(); const red = std(0xff5a4d), white = std(0xf4f6fa);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 3.6, 6), white); leg.position.set(sx, 1.8, sz); g.add(leg);
  }
  const hut = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.8, 2.6), red); hut.position.y = 4.4; g.add(hut);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(2.3, 1, 4), white); roof.rotation.y = Math.PI / 4; roof.position.y = 5.9; g.add(roof);
  const ramp = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.12, 3.4), std(0xeecf9a)); ramp.position.set(0, 1.9, 2.4); ramp.rotation.x = 0.85; g.add(ramp);
  return g;
}
function makeLighthouseFB(): THREE.Group {
  const g = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const band = new THREE.Mesh(new THREE.CylinderGeometry(1.7 - i * 0.16, 1.85 - i * 0.16, 2.6, 12), std(i % 2 ? 0xff5a4d : 0xf6f8fc, 0.7));
    band.position.y = 1.3 + i * 2.6; g.add(band);
  }
  const cab = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 1.6, 10), std(0x2c3a52, 0.4));
  cab.position.y = 14; g.add(cab);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.7, 10, 8), new THREE.MeshStandardMaterial({ color: 0xffe08a, emissive: 0xffd25a, emissiveIntensity: 1.7 }));
  lamp.position.y = 14; g.add(lamp);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(1.4, 1.2, 10), std(0xff5a4d)); cap.position.y = 15.4; g.add(cap);
  return g;
}
function makeGazeboFB(): THREE.Group {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.6, 0.5, 8), std(0xe8e2d2)); base.position.y = 0.25; g.add(base);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 3.4, 6), std(0xf6f2e6));
    post.position.set(Math.cos(a) * 2.8, 2.2, Math.sin(a) * 2.8); g.add(post);
  }
  const roof = new THREE.Mesh(new THREE.ConeGeometry(3.8, 2.2, 8), std(0x6fa8a0)); roof.position.y = 5; g.add(roof);
  return g;
}
function makeGolfcartFB(): THREE.Group {
  const g = new THREE.Group(); const white = std(0xf4f6fa, 0.5);
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.9, 1.4), white); body.position.y = 0.75; g.add(body);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(1, 0.5, 1.2), std(0x5ec8d8)); seat.position.set(-0.3, 1.35, 0); g.add(seat);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.14, 1.4), white); roof.position.y = 2.5; g.add(roof);
  for (const sx of [-0.9, 0.9]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.6, 5), white); post.position.set(sx, 1.7, 0); g.add(post);
  }
  for (const [sx, sz] of [[-0.9, -0.75], [0.9, -0.75], [-0.9, 0.75], [0.9, 0.75]] as const) {
    const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.26, 10), std(0x20242c, 0.9));
    wh.rotation.x = Math.PI / 2; wh.position.set(sx, 0.34, sz); g.add(wh);
  }
  return g;
}
// warm basalt, not the old 0x9aa3b2 blue-grey. Cold grey on warm cream sand
// separates by value but reads as grime, and this is the dominant object in
// Smugglers Cove.
function makeRocksFB(): THREE.Group {
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const r = new THREE.Mesh(new THREE.DodecahedronGeometry(rand(0.6, 1.2), 0), std(pick([0x6b5f6e, 0x7a6c78]), 1));
    r.position.set(rand(-1, 1), rand(0.3, 0.5), rand(-1, 1)); r.rotation.set(rand(0, 3), rand(0, 3), 0); g.add(r);
  }
  return noFront(g);
}
function makeTentFB(): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0, 2.2, 2.6, 4), std(pick([0xff8a70, 0x6db8e8])));
  body.rotation.y = Math.PI / 4; body.position.y = 1.3; body.scale.z = 1.3; g.add(body);
  const door = new THREE.Mesh(new THREE.CircleGeometry(0.7, 12, Math.PI, Math.PI), std(0x3a2f4a));
  door.position.set(0, 0.7, 1.45); g.add(door);
  return g;
}
function makeCampfireFB(): THREE.Group {
  const g = new THREE.Group();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const st = new THREE.Mesh(new THREE.DodecahedronGeometry(0.28, 0), std(0x9aa3b2, 1));
    st.position.set(Math.cos(a) * 0.9, 0.2, Math.sin(a) * 0.9); g.add(st);
  }
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.2, 7), new THREE.MeshStandardMaterial({ color: 0xff9a3a, emissive: 0xff7a2a, emissiveIntensity: 1.6 }));
  flame.position.y = 0.8; g.add(flame);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.6, 6), new THREE.MeshStandardMaterial({ color: 0xffe08a, emissive: 0xffd25a, emissiveIntensity: 1.7 }));
  tip.position.y = 1.35; g.add(tip);
  return g;
}
function makeIcecreamFB(): THREE.Group {
  const g = new THREE.Group();
  const cart = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.3, 1.1), std(0xfaf6ea, 0.6)); cart.position.y = 1; g.add(cart);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.84, 0.34, 1.14), std(0xf06fb0)); stripe.position.y = 1.45; g.add(stripe);
  const um = new THREE.Mesh(new THREE.ConeGeometry(1.4, 0.6, 10), std(0x5ec8d8)); um.position.y = 3; g.add(um);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.6, 5), std(0xf4f6fa)); pole.position.y = 2.2; g.add(pole);
  for (const sz of [-0.6, 0.6]) {
    const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.16, 10), std(0x20242c, 0.9));
    wh.rotation.x = Math.PI / 2; wh.position.set(-0.5, 0.32, sz); g.add(wh);
  }
  return g;
}
function makeFoodtruckFB(): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(4.6, 2.4, 2), std(0xffd23f, 0.6)); body.position.y = 1.7; g.add(body);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.6, 2), std(0xf4f6fa, 0.5)); cab.position.set(2.6, 1.3, 0); g.add(cab);
  const win = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1, 0.12), std(0x2c3a52, 0.3)); win.position.set(-0.4, 2, 1.02); g.add(win);
  const aw = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.14, 1), std(0xff5a4d)); aw.position.set(-0.4, 2.8, 1.4); aw.rotation.x = 0.3; g.add(aw);
  for (const [sx, sz] of [[-1.6, -1], [1.8, -1], [-1.6, 1], [1.8, 1]] as const) {
    const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.3, 10), std(0x20242c, 0.9));
    wh.rotation.x = Math.PI / 2; wh.position.set(sx, 0.5, sz); g.add(wh);
  }
  return g;
}
function makeFerrisFB(): THREE.Group {
  const g = new THREE.Group(); const steel = std(0xff8fb8, 0.5);
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(6.5, 0.28, 8, 28), steel); wheel.position.y = 8; g.add(wheel);
  for (let i = 0; i < 6; i++) {
    const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 13, 6), steel);
    spoke.position.y = 8; spoke.rotation.z = (i / 6) * Math.PI; g.add(spoke);
  }
  const GOND = [0x5ec8d8, 0xffd23f, 0x7ed57a, 0xf06fb0, 0xb98cff, 0xff9a3a];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const gd = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.1, 1.1), std(GOND[i]));
    gd.position.set(Math.cos(a) * 6.5, 8 + Math.sin(a) * 6.5 - 0.8, 0); g.add(gd);
  }
  for (const sx of [-2.6, 2.6]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.42, 8.6, 8), std(0xf4f6fa));
    leg.position.set(sx, 4.1, 0); leg.rotation.z = sx > 0 ? -0.3 : 0.3; g.add(leg);
  }
  return g;
}
function makeBeachChairFB(): THREE.Group {
  const g = new THREE.Group(); const col = pick([0x5ec8d8, 0xffd23f, 0xf06fb0]);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(1, 0.14, 1.6), std(col)); seat.position.y = 0.5; g.add(seat);
  const back = new THREE.Mesh(new THREE.BoxGeometry(1, 1.2, 0.12), std(col)); back.position.set(0, 1, -0.8); back.rotation.x = -0.4; g.add(back);
  for (const [sx, sz] of [[-0.42, -0.7], [0.42, -0.7], [-0.42, 0.7], [0.42, 0.7]] as const) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.5, 5), std(0xf4f6fa)); leg.position.set(sx, 0.25, sz); g.add(leg);
  }
  return g;
}
function makeDuckFB(): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), std(0xf6f2da, 0.9)); body.scale.set(1.25, 0.85, 1); body.position.y = 0.36; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), std(0xf6f2da, 0.9)); head.position.set(0.42, 0.78, 0); g.add(head);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.26, 6), std(0xff9a3a)); beak.rotation.z = -Math.PI / 2; beak.position.set(0.68, 0.75, 0); g.add(beak);
  return g;
}
function makeFenceRun(len: number, col = 0xf4f0e2): THREE.Group {
  // low post-and-rail fence along +X, centered — one merged mesh (was 4-9)
  const parts = [
    part(new THREE.BoxGeometry(len, 0.12, 0.1), col, 0, 0.85, 0),
    part(new THREE.BoxGeometry(len, 0.12, 0.1), col, 0, 0.45, 0),
  ];
  const n = Math.max(2, Math.round(len / 2.4));
  for (let i = 0; i <= n; i++) parts.push(part(new THREE.BoxGeometry(0.16, 1.1, 0.16), col, -len / 2 + (i / n) * len, 0.55, 0));
  const g = new THREE.Group(); g.add(mergedProp(parts));
  return g;
}

async function populate(scene: THREE.Scene, addEdible: AddEdible,
                        breathe: (l: string) => Promise<void>) {
  const setShadow = (m: THREE.Object3D) => m.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  const place = (mesh: THREE.Object3D, x3: number, z3: number, r: number) => {
    if (!insideIsland3(x3, z3)) return;   // never place props off the coastline
    if (inLagoon3(x3, z3, 40)) return;    // …or IN the lagoon
    mesh.position.set(x3, 0, z3);
    // A PROP WITH NO FRONT HAS NO REASON TO FACE NORTH. Measured on the pre-fix
    // build with qa/variety.mjs: 5,043 of Maple Falls' 5,782 props sat at
    // exactly 0 radians — 87% of the town stamped at one angle. That is what
    // the owner's phone photo shows as "bare minimum": two flower beds
    // identical down to their orientation, and 603 maple trees behind them all
    // turned the same way. Builders with no front tag themselves via noFront();
    // an explicit rotY from a call site still wins, because it is checked first.
    if (mesh.userData.spin && Math.abs(mesh.rotation.y) < 1e-6) mesh.rotation.y = spinFor(x3, z3);
    // shadow diet: tiny street props don't cast (hundreds of them; their shadows
    // are sub-pixel anyway) — a big chunk of the shadow pass for free
    // …and the bar is 4, not 2.5. Anything thinner than that resolves to one or
    // two shadow-map texels and PCF turns it into a grey streak lying on the
    // sand with nothing above it — the "sticks everywhere" on Pirate Bay were
    // palm trunks and dune grass casting shadows the map could not draw. They
    // keep their contact blob, which is what actually grounds a small prop.
    if (shouldCast(r, mesh)) setShadow(mesh);   // one predicate, shared with glb()
    else {
      mesh.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.receiveShadow = true; });
      // tiny props still get the cheap blob — grounded on EVERY quality tier,
      // even when the real shadow map is off on weak phones
      mesh.add(contactShadow(Math.max(0.55, r * 1.1)));
    }
    scene.add(mesh); addEdible(mesh, r);
  };

  // ══ POWDER PASS: a snow day, and everyone is out in it ═══════════════════
  // Same model as LANTERN NIGHT below — polygon regions, the shared spatial
  // hash, authored landmarks reserved BEFORE the scatter runs. The difference
  // is that this world is a BOWL around a lake, so the composition is
  // concentric: the lodge looks down the piste, the village looks at the
  // lake, and everything else is scattered snow-day debris — sleds, snowmen,
  // drifts — the way a real village looks by 10am on a closure day.
  if (WORLD_ID === 'powder') {
    const P3 = (p2: PW.Pt): [number, number] => [w(p2[0]), w(p2[1])];
    PW.resetPlacement();
    // NO TREE GROWS OUT OF A FROZEN LAKE. The 'pinewood' polygon overlaps the
    // LAKE ellipse, and qa/placement.mjs (2026-09-02, SEED=7) counted 20
    // tagged pines rooted in the ice. Skaters' clutter on the ice is the
    // 'lake' district by design and goes through the same drop() untouched;
    // only a pine is refused, by its own radius inside the ellipse.
    const onIce = (p2: PW.Pt, r: number) => {
      const m = r * 20, dx = (p2[0] - PW.LAKE.cx) / (PW.LAKE.rx + m), dy = (p2[1] - PW.LAKE.cy) / (PW.LAKE.ry + m);
      return dx * dx + dy * dy < 1;
    };
    const drop = (mesh: THREE.Object3D, p2: PW.Pt, r: number, rotY?: number, force = false, qk?: string) => {
      if (qk === 'pine' && onIce(p2, r)) return;
      if (!force && !PW.spotOpen(p2[0], p2[1], r * 20)) return;
      const [x3, z3] = P3(p2);
      if (rotY !== undefined) mesh.rotation.y = rotY;
      if (qk) mesh.userData.qk = qk;
      place(mesh, x3, z3, r);
      PW.claimSpot(p2[0], p2[1], r * 20);
    };
    const REG = (id: PW.PwBiome) => PW.PW_REGIONS.find((r2) => r2.id === id)!;
    const rnd2 = Math.random;
    // ── SNOWMAN YAW — owner decision 3, 2026-08-26: "sure" ────────────────
    // The face is built on local +X (alpine.ts:461-464). rotation.y = t sends
    // local +X to world (cos t, 0, -sin t), and the camera rides the hero at
    // camOffset (0.62, 0.92, 0.62) (prototype3d.ts:600) whose x equals z at
    // every zoom (:9231) — fixed azimuth, so "toward the lens" is the constant
    // world direction (+1, 0, +1)/sqrt2 from every prop, all match long.
    // cos t = -sin t = sqrt(1/2) gives t = -PI/4 dead-on (verified against
    // this repo's three: applyQuaternion measures dot 1.000000; the signpost
    // at :5209 and the dress yaw at void3d.ts:2041 agree). +/-60deg of jitter
    // keeps every face inside the arc the eyes actually reach the camera from
    // (alpine.ts:482-489: 54%/68% of a 36-yaw sweep = arcs of ~+/-97/122deg)
    // while no two snowmen share a yaw. ONE rnd2() draw, exactly like the
    // uniform spin this replaces at each site, so the Math.random sequence
    // downstream of every call site is unchanged. qa/snowyaw.mjs reads the
    // tagged census live and FAILED on the uniform-spin build.
    const snowmanYaw = () => -Math.PI / 4 + (rnd2() - 0.5) * (Math.PI * 2 / 3);

    await breathe('Shovelling the drive…');
    // 1. THE LODGE — the hero meal, force-placed, facing down the Home Run
    {
      const lodge = AL.makeLodge();
      drop(lodge, [PW.LODGE.cx, PW.LODGE.cy], 10.5, PW.pwFacingLodge(PW.LODGE.cx, PW.LODGE.cy + 2000) + Math.PI, true, 'lodge');
      PW.claimSpot(PW.LODGE.cx, PW.LODGE.cy, PW.LODGE.rx * 0.8);
    }
    // 2. THE VILLAGE — chalets ring the shore and every one FACES THE LAKE,
    //    which is what makes a bowl read as a place rather than a scatter
    // Separated by the chalet's real half-diagonal (8.6 x 6.4 -> 5.4), not its
    // 3.6 eat radius: with no `sep` at all the scatter let chalets fall 3.2
    // units apart (drop()'s burial test is the only gate) and qa/placement.mjs
    // measured 6+ chalet-through-chalet footprints in the village on the
    // unpatched build, the worst 5.4 units deep. (spotOpen's own-claim rule is
    // position-based since round 5, so the drop is NOT forced: it keeps the
    // burial test.)
    for (const p2 of PW.scatterInRegion(REG('village'), 24, rnd2, 150, { sep: 5.4 })) {
      const face = Math.atan2(PW.LAKE.cx - p2[0], PW.LAKE.cy - p2[1]);
      drop(AL.makeChalet(), p2, 3.6, face, false, 'chalet');
    }
    // …and the village's small stuff — the between-chalets clutter that makes
    // a district read dense from the picker's first frame
    for (const p2 of PW.scatterInRegion(REG('village'), 40, rnd2, 90)) {
      const kind = rnd2();
      const mesh = kind < 0.3 ? AL.makeSnowman() : kind < 0.55 ? AL.makeSled()
        : kind < 0.72 ? AL.makeLogPile() : kind < 0.88 ? AL.makeSkiRack() : AL.makeSnowballStack();
      drop(mesh, p2, kind < 0.3 ? 1.0 : 0.6, kind < 0.3 ? snowmanYaw() : rnd2() * Math.PI * 2, false, kind < 0.3 ? 'snowman' : undefined);
    }
    // …the square: bell tower + rink + the contest's snowman cluster
    {
      const vil = REG('village');
      const cx = vil.poly.reduce((a, q) => a + q[0], 0) / vil.poly.length;
      const cy = vil.poly.reduce((a, q) => a + q[1], 0) / vil.poly.length;
      drop(AL.makeBellTower(), [cx, cy], 4.4, 0, true);
      drop(AL.makeRink(), [cx + 260, cy + 160], 2.2, 0, true);
      for (const p2 of PW.clusterAt(cx - 300, cy - 220, 5, 220, rnd2))
        drop(AL.makeSnowman(), p2, 1.0, snowmanYaw(), false, 'snowman');
    }
    await breathe('Waxing the sleds…');
    // 3. THE PINEWOOD — the forest carries the west slope; drifts between
    for (const p2 of PW.scatterInRegion(REG('pinewood'), 200, rnd2, 80))
      drop(AL.makePine(), p2, 1.7 + rnd2() * 0.8, rnd2() * Math.PI * 2, false, 'pine');
    for (const p2 of PW.scatterInRegion(REG('pinewood'), 26, rnd2, 120))
      drop(AL.makeDrift(), p2, 0.95, rnd2() * Math.PI * 2, false, 'drift');
    // 4. THE HOME RUN — the lift line up to the lodge, signs, and the deep
    //    drifts that pack the SNOW SHELL (see prototype3d's eatRatioNow)
    for (const py of PW.liftPylons()) drop(AL.makeLiftPylon(), [py.x, py.y], 2.2, py.ang, true, 'lift');
    for (let i = 0; i < 8; i++) {
      const pp = PW.pistePoint(0.08 + i * 0.11);
      const side = i % 2 ? 1 : -1;
      const off = PW.PISTE_HALF + 120;
      drop(AL.makeSignpost(), [pp.x + Math.cos(pp.ang + Math.PI / 2) * off * side, pp.y + Math.sin(pp.ang + Math.PI / 2) * off * side], 0.55, -pp.ang, false, 'sign');
    }
    for (const p2 of PW.scatterInRegion(REG('piste'), 18, rnd2, 120))
      drop(AL.makeDrift(), p2, 0.95, rnd2() * Math.PI * 2, false, 'drift');
    for (const p2 of PW.scatterInRegion(REG('piste'), 8, rnd2, 150))
      drop(AL.makeSnowballStack(), p2, 0.6, rnd2() * Math.PI * 2, false, 'snowballs');
    await breathe('Gritting the road…');
    // 5. THE LAKE SHORE — Norm's hut out on the ice, sleds and racks at the
    //    village edge, snowmen where the kids got to first
    drop(AL.makeChalet(3.4, 2.8), [PW.LAKE.cx - PW.LAKE.rx * 0.45, PW.LAKE.cy - PW.LAKE.ry * 0.3], 2.0, 0.6, true, 'hut');
    for (const p2 of PW.clusterAt(PW.LAKE.cx + PW.LAKE.rx * 0.7, PW.LAKE.cy + PW.LAKE.ry * 0.6, 6, 320, rnd2)) {
      const kind = rnd2();
      drop(kind < 0.4 ? AL.makeSled() : kind < 0.7 ? AL.makeSkiRack() : AL.makeSnowman(), p2, kind < 0.4 ? 0.55 : 1.0,
        kind < 0.7 ? rnd2() * Math.PI * 2 : snowmanYaw(), false, kind < 0.7 ? undefined : 'snowman');
    }
    // 6. SNOW-DAY DEBRIS everywhere the regions left open: sleds, log piles,
    //    fences, lone pines, and the drifts that fuel the shell
    // …a snack ring near spawn: the first three seconds must have food in
    //    them (the FTUE lesson — a first meal within one thumb-drag)
    for (const p2 of PW.clusterAt(PW.PW_SPAWN[0] + 300, PW.PW_SPAWN[1] - 200, 8, 380, rnd2)) {
      const kind = rnd2();
      drop(kind < 0.5 ? AL.makeSled() : kind < 0.8 ? AL.makeSnowballStack() : AL.makeSnowman(), p2,
        kind < 0.5 ? 0.55 : kind < 0.8 ? 0.6 : 1.0, kind < 0.8 ? rnd2() * Math.PI * 2 : snowmanYaw(),
        false, kind < 0.8 ? undefined : 'snowman');
    }
    for (const p2 of PW.scatterLand(110, rnd2, 110)) {
      const kind = rnd2();
      const mesh = kind < 0.28 ? AL.makeSled() : kind < 0.5 ? AL.makeLogPile()
        : kind < 0.68 ? AL.makeFence(4 + rnd2() * 5) : kind < 0.86 ? AL.makePine() : AL.makeDrift();
      drop(mesh, p2, kind < 0.28 ? 0.55 : kind < 0.5 ? 0.9 : kind < 0.68 ? 0.8 : kind < 0.86 ? 1.8 : 0.95,
        rnd2() * Math.PI * 2, false, kind >= 0.86 ? 'drift' : kind >= 0.68 ? 'pine' : undefined);
    }
    await breathe('Rolling the small snowballs…');
    // 7. THE HOOVER ECONOMY. The census that forced this (qa/_edcount.mjs):
    //    the first cut shipped 843 edibles against Maple's 5,790 and only 208
    //    small ones against ~2,600 — the child driver starved (mean scores in
    //    the low thousands against six figures) because a hole.io match IS
    //    thousands of small meals. Snow lumps are the world's coins: a scaled
    //    drift (four merged spheres, one draw call), everywhere, cheap.
    //    Placed straight through place() — lumps may crowd; that is what
    //    snow does.
    {
      const lump = () => { const m = AL.makeDrift(); m.scale.setScalar(0.32 + rnd2() * 0.22); return m; };
      // clear 26 (1.3 units, a lump's own half-width) keeps the snow off the
      // grit: at clear 0 qa/placement.mjs measured 12 lumps up to 1.5 units
      // onto the plowed road (2026-09-02, SEED=7). The count is unchanged —
      // rejection sampling fills the 2400 from the rest of the plateau.
      for (const p2 of PW.scatterLand(2400, rnd2, 26)) {
        const [x3, z3] = P3(p2);
        const m = lump(); m.rotation.y = rnd2() * Math.PI * 2;
        place(m, x3, z3, 0.34 + rnd2() * 0.14);
      }
      for (const p2 of PW.scatterInRegion(REG('village'), 160, rnd2, 26)) {
        const [x3, z3] = P3(p2);
        const kind = rnd2();
        const m = kind < 0.5 ? lump() : kind < 0.8 ? AL.makeSnowballStack() : AL.makeSled();
        m.rotation.y = rnd2() * Math.PI * 2;
        place(m, x3, z3, kind < 0.5 ? 0.4 : kind < 0.8 ? 0.6 : 0.55);
      }
      for (const p2 of PW.scatterInRegion(REG('piste'), 220, rnd2, 0)) {
        const [x3, z3] = P3(p2);
        const kind = rnd2();
        const m = kind < 0.6 ? lump() : kind < 0.85 ? AL.makeSnowballStack() : AL.makeSled();
        m.rotation.y = rnd2() * Math.PI * 2;
        place(m, x3, z3, kind < 0.6 ? 0.4 : 0.6);
      }
      for (const p2 of PW.scatterInRegion(REG('lake'), 200, rnd2, 0)) {
        const [x3, z3] = P3(p2);
        const m = rnd2() < 0.75 ? lump() : AL.makeSled();
        m.rotation.y = rnd2() * Math.PI * 2;
        place(m, x3, z3, 0.42);
      }
      for (const p2 of PW.scatterInRegion(REG('pinewood'), 320, rnd2, 0)) {
        const [x3, z3] = P3(p2);
        const kind = rnd2();
        if (kind >= 0.55 && kind < 0.9 && onIce(p2, 1.1)) continue;   // a pine, on the ice — see onIce()
        const m = kind < 0.55 ? lump() : kind < 0.9 ? AL.makePine(2.6 + rnd2() * 2) : AL.makeLogPile();
        m.rotation.y = rnd2() * Math.PI * 2;
        place(m, x3, z3, kind < 0.55 ? 0.38 : kind < 0.9 ? 1.1 : 0.9);
      }
      for (const p2 of PW.scatterInRegion(REG('lodge'), 90, rnd2, 0)) {
        const [x3, z3] = P3(p2);
        const m = rnd2() < 0.7 ? lump() : AL.makeSkiRack();
        m.rotation.y = rnd2() * Math.PI * 2;
        place(m, x3, z3, rnd2() < 0.7 ? 0.4 : 0.85);
      }
    }
    // 8. MID-SIZE FILL: the tier between a lump and a chalet was 610 thin
    for (const p2 of PW.scatterLand(320, rnd2, 60)) {
      const kind = rnd2();
      const mesh = kind < 0.5 ? AL.makePine(3 + rnd2() * 3) : kind < 0.72 ? AL.makeSnowman()
        : kind < 0.88 ? AL.makeDrift() : AL.makeLogPile();
      drop(mesh, p2, kind < 0.5 ? 1.3 : kind < 0.72 ? 1.0 : kind < 0.88 ? 0.95 : 0.9,
        kind >= 0.5 && kind < 0.72 ? snowmanYaw() : rnd2() * Math.PI * 2, false,
        kind >= 0.72 && kind < 0.88 ? 'drift' : kind >= 0.5 && kind < 0.72 ? 'snowman' : kind < 0.5 ? 'pine' : undefined);
    }
    await breathe('Lighting the windows…');
    return;   // POWDER PASS is fully populated — the Maple grid pass must not run
  }

  // ══ LANTERN NIGHT: a spirit market, and it is open ════════════════════
  // Same model as GAME DAY below — polygon regions, the shared spatial hash,
  // authored landmarks reserved BEFORE the scatter runs.
  //
  // The difference is that this level is a STREET, so most of it is not
  // scattered at all. The stalls, the lantern strings and the shrine's torii
  // are laid along authored paths, because rejection sampling produces a car
  // boot sale and a market is a line. GAME DAY learned the same lesson with
  // its parking rows and PIRATE BAY with its bazaar lane; this world is almost
  // entirely that shape.
  if (WORLD_ID === 'lantern') {
    const P3 = (p2: LN.Pt): [number, number] => [w(p2[0]), w(p2[1])];
    LN.resetPlacement();
    const drop = (mesh: THREE.Object3D, p2: LN.Pt, r: number, rotY?: number, force = false, qk?: string) => {
      if (!force && !LN.spotOpen(p2[0], p2[1], r * 20)) return;
      const [x3, z3] = P3(p2);
      if (rotY !== undefined) mesh.rotation.y = rotY;
      if (qk) mesh.userData.qk = qk;
      place(mesh, x3, z3, r);
      LN.claimSpot(p2[0], p2[1], r * 20);
    };
    const REG = (id: LN.LnBiome) => LN.LN_REGIONS.find((r) => r.id === id)!;
    /** ONE radius for the scatter's overlap rejection AND the drop's burial
     *  test. Two numbers here is the bug GAME DAY measured at 2,364 props
     *  requested and 861 placed: scatterInRegion claims the point at `sep`,
     *  drop() then asks spotOpen() about it at `r`, and spotOpen only exempts
     *  an EXACT-match claim — so a prop read its own claim as an obstacle and
     *  refused to exist. */
    // `sep` is the ground a prop RESERVES, in 3D units; it defaults to the eat
    // radius, which is right for a lantern and wrong for a shed: a market shed
    // is 12.2 x 3.6 on the ground (half-diagonal 6.4) and reserved 3.4, so
    // qa/placement.mjs measured 7+5+5 shed-through-shed footprints on the
    // unpatched build. When sep differs from r the drop is forced, because the
    // scatter has already claimed the site and drop()'s own-claim skip only
    // matches an equal radius.
    const plant = (id: LN.LnBiome, n: number, clear: number, r: number,
                   make: () => THREE.Object3D, face = false, qk?: string, sep = r) => {
      for (const p2 of LN.scatterInRegion(REG(id), n, Math.random, clear, { sep }))
        drop(make(), p2, r, face ? LN.lnFacingBathhouse(p2[0], p2[1]) : undefined, false, qk);
    };
    const plantLand = (n: number, clear: number, r: number, make: () => THREE.Object3D,
                       band?: [number, number]) => {
      for (const p2 of LN.scatterLand(n, Math.random, clear, band, { sep: r })) drop(make(), p2, r);
    };

    // ── THE RESERVE ───────────────────────────────────────────────────────
    // The bathhouse is ~34 units across before its terrace. Claim its ground
    // before anything scatters, or the market lands on top of the finale —
    // the bug bay.ts records as the galleon coming down on eleven palms.
    const BH: LN.Pt = [LN.BATHHOUSE.cx, LN.BATHHOUSE.cy];
    LN.claimSpot(BH[0], BH[1], 900);
    const GATE: LN.Pt = [6260, 10120];
    LN.claimSpot(GATE[0], GATE[1], 320);
    const BRIDGE: LN.Pt = [6180, 5860];
    LN.claimSpot(BRIDGE[0], BRIDGE[1], 300);

    // ── THE LANDMARKS ─────────────────────────────────────────────────────
    // The bathhouse is EATABLE, at 11.0 — the same call GAME DAY's stadium
    // needed after shipping at 24, which is above the player's own R_CAP of 12
    // and so could never be swallowed at all. A finale you cannot eat is not a
    // finale.
    drop(NM.makeBathhouse(), BH, 11.0, 0, true, 'big');
    drop(NM.makeTorii(1.15), GATE, 5.0, 0, true, 'big');
    drop(NM.makeMoonBridge(24), BRIDGE, 4.2, Math.PI / 2, true, 'big');

    // ── THE DRUM TOWER ────────────────────────────────────────────────────
    // It already existed in everything except the world. It names a whole
    // newsroom tier, it is the third match beat ("The drum has started"), and
    // that beat's headline reads "The drum tower has begun" — so a child hears
    // the level tell them about a landmark, looks up, and finds nothing there.
    //
    // Set on the east bank between the gate and the market, which puts it in
    // the opening sightline: standing at spawn looking north you now see the
    // torii, the tower beside it, the lit street beyond, and the bathhouse at
    // the top. That is the whole match in one frame, which is what an opening
    // shot is for.
    const DRUM: LN.Pt = [7040, 9500];
    LN.claimSpot(DRUM[0], DRUM[1], 260);
    drop(NM.makeDrumTower(), DRUM, 6.0, -0.5, true, 'big');

    // ── THE SHRINE HALL ───────────────────────────────────────────────────
    // The stone stair and its twenty-two torii climbed toward nothing. Now
    // they arrive somewhere, and it is the second-biggest meal in the level.
    const HALL: LN.Pt = [3980, 7480];
    LN.claimSpot(HALL[0], HALL[1], 300);
    drop(NM.makeShrineHall(), HALL, 7.0, 0.9, true, 'big');

    // ── LANTERN ROW ───────────────────────────────────────────────────────
    // The stalls, laid along the canal on both banks and turned to face the
    // water. This is the level.
    {
      const slots = LN.stallSlots(Math.random, 230, 30);
      for (const sl of slots) {
        drop(NM.makeStall(), [sl.x, sl.y], 2.4, sl.ang, false, 'house');
      }
    }
    // …and the strings of lanterns ACROSS the channel, which is what the
    // player drives under for three minutes.
    {
      for (let i = 0; i < LN.CANAL.length - 1; i++) {
        const [ax, ay] = LN.CANAL[i], [bx, by] = LN.CANAL[i + 1];
        const L = Math.hypot(bx - ax, by - ay);
        for (let d = 60; d < L; d += 300) {
          const t = d / L;
          const cx = ax + (bx - ax) * t, cy = ay + (by - ay) * t;
          const ang = Math.atan2(by - ay, bx - ax);
          // strung perpendicular to the channel, hung high enough to clear a
          // WORLD ENDER's head — these are scenery, not meals
          const g = NM.makeLanternString(17, 5);
          const [x3, z3] = P3([cx, cy]);
          g.rotation.y = -ang + Math.PI / 2;
          g.position.set(x3, 0, z3);
          scene.add(g);
        }
      }
    }
    // the small change of the street. LANTERN ROW measured at 2.15 edibles per
    // 100u² against GAME DAY's tailgate lot at 5.34, and this is the district
    // the whole level is named after — it has to be the fullest thing in the
    // game, not the fourth fullest.
    plant('stalls', 180, 24, 0.9, NM.makeMarketCrate);
    plant('stalls', 54, 30, 1.4, NM.makeGoldfishTank);
    plant('stalls', 76, 28, 1.2, NM.makeBanner);
    plant('stalls', 104, 24, 0.9, () => NM.makeLantern(0xffb256, 1.3));
    // …and what people are actually here for: trays to sit at, carts to queue
    // at, coals to stand near, umbrellas leaned where they were put down.
    plant('stalls', 180, 20, 0.6, NM.makeSkewerTray);
    plant('stalls', 110, 22, 0.5, NM.makeStepLantern);
    plant('stalls', 56, 26, 0.7, NM.makeCoalTub);
    plant('stalls', 52, 28, 1.0, NM.makeUmbrella);
    plant('stalls', 24, 44, 2.0, NM.makeFoodCart, false, 'house');
    // THE MISSING RUNG. The size census found TWO props in the whole 3-to-4
    // band against GAME DAY's 895, which is why a late match here fell flat:
    // past a certain size there was simply nothing the right shape to eat.
    // A covered row is what a market street is actually built from anyway.
    plant('stalls', 76, 46, 3.4, NM.makeMarketShed, false, 'house', 7.5);
    plant('teahouse', 30, 50, 3.4, NM.makeMarketShed, false, 'house', 7.5);
    plant('stalls', 26, 60, 1.4, NM.makeKoiFlag);

    // ── THE CANAL ─────────────────────────────────────────────────────────
    // Boats along the channel and a drift of floating candle lanterns. The
    // float lanterns are the smallest meal in the level, which is why the
    // opening minute is spent driving down the water.
    {
      for (let k = 0; k < 16; k++) {
        const t = 0.05 + (k / 16) * 0.9;
        const p = LN.canalPoint(t);
        const boat = NM.makeCanalBoat(); boat.userData.afloat = true;   // ON the water by design (qa/placement.mjs reads the tag)
        drop(boat, [p.x, p.y], 2.2, p.ang);
      }
      for (let k = 0; k < 150; k++) {
        const t = Math.random();
        const p = LN.canalPoint(t);
        const off = (Math.random() - 0.5) * 220;
        const fl = NM.makeFloatLantern(); fl.userData.afloat = true;
        drop(fl, [p.x + Math.cos(p.ang + 1.57) * off, p.y + Math.sin(p.ang + 1.57) * off], 0.5);
      }
    }

    // ── THE BATHHOUSE TERRACE ─────────────────────────────────────────────
    // The census that started this pass put the bathhouse precinct at 0.40
    // edibles per 100u² across 14,908u² — thirteen per cent of the map, the
    // place the whole level is aimed at, holding ELEVEN objects. A player
    // spends the last minute of the match here and there was nothing to eat
    // on the way in but the building itself.
    //
    // What lives on a working bathhouse's forecourt: its laundry, hung where
    // the heat is; guests' luggage set down; coal tubs; pots on the boards;
    // lanterns up the stair. Nothing here is invented — it is the ordinary
    // clutter of a place that washes several hundred people a night.
    plant('bathhouse', 80, 36, 1.8, NM.makeTowelRack);
    plant('bathhouse', 76, 26, 0.8, NM.makeLuggage);
    plant('bathhouse', 110, 20, 0.5, NM.makeStepLantern);
    plant('bathhouse', 70, 24, 0.6, NM.makePotPlant);
    plant('bathhouse', 46, 26, 0.7, NM.makeCoalTub);
    plant('bathhouse', 80, 26, 0.9, () => NM.makeLantern(0xffd489, 1.25));
    plant('bathhouse', 40, 28, 1.0, NM.makeUmbrella);
    plant('bathhouse', 44, 26, 0.9, NM.makeMarketCrate);
    plant('bathhouse', 34, 40, 1.4, NM.makeKoiFlag);
    plant('bathhouse', 22, 44, 1.6, NM.makeSakeBarrels);
    // storehouses: the 4-to-6 rung, and a run of dull white boxes is what
    // stops a skyline of lanterns reading as one texture
    plant('bathhouse', 22, 74, 4.6, NM.makeKura, false, 'house', 6.5);
    plant('bathhouse', 26, 54, 3.4, NM.makeMarketShed, false, 'house', 7.5);

    // ── THE MOON BRIDGE ───────────────────────────────────────────────────
    // Six props over 5,210u². The bridge is the level's pinch and its fourth
    // beat lands here — everybody stops on a bridge, so give them the reason.
    plant('bridge', 30, 28, 1.2, NM.makeWishRack);
    plant('bridge', 56, 20, 0.5, NM.makeStepLantern);
    plant('bridge', 44, 22, 0.6, NM.makeSkewerTray);
    plant('bridge', 36, 26, 0.9, () => NM.makeLantern(0xff8a3c, 1.2));
    plant('bridge', 26, 24, 0.6, NM.makePotPlant);
    plant('bridge', 20, 28, 1.0, NM.makeUmbrella);
    plant('bridge', 12, 46, 2.0, NM.makeFoodCart, false, 'house');
    plant('bridge', 10, 56, 3.4, NM.makeMarketShed, false, 'house', 7.5);

    // ── THE SHRINE STEPS ──────────────────────────────────────────────────
    // Cool, dim and evenly spaced against the market's warm clutter: one bank
    // devotional, one commercial, told in light temperature.
    plant('shrine', 160, 24, 1.0, () => NM.makeStoneLantern(Math.random() < 0.25 ? 0x9effb4 : 0x8ad4ff));
    plant('shrine', 32, 36, 1.5, NM.makeOfferingBox);
    // jizo, in their hundreds, which is how they actually stand. A dark stone
    // field with one small red note in each figure is the cheapest way there
    // is to make ground read as tended rather than as unfinished.
    plant('shrine', 110, 20, 0.55, NM.makeJizo);
    plant('shrine', 30, 30, 1.6, NM.makeSakeBarrels);
    plant('shrine', 24, 30, 1.2, NM.makeWishRack);
    plant('shrine', 60, 20, 0.5, NM.makeStepLantern);
    plant('shrine', 14, 82, 4.6, NM.makeKura, false, 'house', 6.5);
    plant('shrine', 20, 56, 3.4, NM.makeMarketShed, false, 'house', 7.5);
    // the torii run: nose to tail up the west stair, which is the one place in
    // the level with a repeating tunnel
    {
      const A: LN.Pt = [4820, 8600], B: LN.Pt = [4060, 7600];
      const dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy);
      const ang = Math.atan2(dy, dx);
      for (let i = 0; i < 22; i++) {
        const t = (i + 0.5) / 22;
        drop(NM.makeSmallTorii(), [A[0] + dx * t, A[1] + dy * t], 1.3, -ang + Math.PI / 2);
      }
    }

    // ── THE TEAHOUSE TERRACE ──────────────────────────────────────────────
    plant('teahouse', 16, 130, 4.2, NM.makeTeahouse, true, 'house', 6.5);
    plant('teahouse', 54, 30, 1.0, () => NM.makeLantern(0xfff0d2, 1.1));
    plant('teahouse', 44, 28, 0.9, NM.makeMarketCrate);
    plant('teahouse', 80, 20, 0.6, NM.makeSkewerTray);
    plant('teahouse', 48, 22, 0.6, NM.makePotPlant);
    plant('teahouse', 50, 20, 0.5, NM.makeStepLantern);
    plant('teahouse', 26, 28, 1.0, NM.makeUmbrella);
    plant('teahouse', 18, 30, 0.7, NM.makeCoalTub);

    // ── THE NIGHT GARDEN ──────────────────────────────────────────────────
    plant('garden', 80, 34, 1.1, () => NM.makeStoneLantern(0x8ad4ff));
    plant('garden', 90, 36, 2.6, NM.makeBamboo);
    plant('garden', 54, 26, 1.1, NM.makeMossRock);
    plant('garden', 70, 22, 0.9, NM.makeFernClump);
    plant('garden', 36, 24, 0.6, NM.makePotPlant);
    plant('garden', 34, 22, 0.55, NM.makeJizo);
    plant('garden', 30, 20, 0.5, NM.makeStepLantern);
    plant('garden', 18, 62, 3.4, NM.makeMarketShed, false, 'house', 7.5);

    // ── THE GREAT GATE ────────────────────────────────────────────────────
    // The apron stays the emptiest floor in the level — a child's first three
    // seconds have to be legible — but "empty" should mean uncluttered, not
    // unlit. Everything added here is under a metre tall and hugs the edges.
    plant('gate', 30, 40, 1.0, () => NM.makeLantern(0xff8a3c, 1.5));
    plant('gate', 22, 36, 0.9, NM.makeMarketCrate);
    plant('gate', 22, 30, 0.5, NM.makeStepLantern);
    plant('gate', 18, 32, 0.55, NM.makeJizo);
    plant('gate', 14, 34, 0.8, NM.makeLuggage);
    plant('gate', 8, 96, 4.6, NM.makeKura, false, 'house', 6.5);

    // ── THE HOT SPRING ────────────────────────────────────────────────────
    // Authored, not scattered. Five pools stepping DOWN the shoulder, because
    // a spring runs downhill and a ring of identical circles reads as a car
    // park with puddles. The biggest is at the top against the valley wall
    // where the water comes out; each one below is smaller, which is also the
    // order a child will eat them in on the way up.
    {
      const POOLS: [number, number, number][] = [
        [8080, 2180, 5.4],   // the source pool, hard against the wall
        [7860, 2620, 4.6],
        [8180, 2900, 3.9],
        [7820, 3180, 3.4],
        [8060, 3420, 2.8],
      ];
      for (const [px, py, rr] of POOLS) {
        drop(NM.makeHotPool(rr), [px, py], rr * 0.9, rand(0, Math.PI * 2), true);
        LN.claimSpot(px, py, rr * 22);
      }
      // the spouts that feed them, each one just above a pool
      for (const [px, py] of [[8080, 1960], [7860, 2400], [8180, 2680]] as [number, number][])
        drop(NM.makeSpoutRock(), [px, py], 1.5, rand(0, Math.PI * 2), true);
      plant('onsen', 20, 36, 1.6, NM.makeOnsenBench);
      // and the spring's own lanterns: fewer, warmer, low to the water
      plant('onsen', 34, 26, 0.9, () => NM.makeLantern(0xffd489, 1.0));
      plant('onsen', 30, 34, 2.6, NM.makeBamboo);
      plant('onsen', 30, 26, 1.1, NM.makeMossRock);
      plant('onsen', 24, 24, 0.9, NM.makeFernClump);
      plant('onsen', 14, 30, 1.8, NM.makeTowelRack);
      plant('onsen', 26, 22, 0.5, NM.makeStepLantern);
    }

    // ── THE VALLEY WALL ───────────────────────────────────────────────────
    // Bamboo, thinning inward — it is what the light falls away into.
    // 27,757u² — a QUARTER of the map — carrying 202 props and not one spirit,
    // at 0.73 per 100u². That is thinner than Maple's forest and a third of
    // GAME DAY's treeline. It is meant to be the sparse edge of the level, but
    // sparse and bare are different things, and a rim of nothing but verticals
    // reads as a fence rather than as somewhere the market trails off into.
    plantLand(300, 38, 2.6, NM.makeBamboo, [0, 700]);
    plantLand(110, 32, 1.0, () => NM.makeStoneLantern(0x8ad4ff), [0, 500]);
    plantLand(150, 26, 1.1, NM.makeMossRock, [0, 620]);
    plantLand(170, 22, 0.9, NM.makeFernClump, [0, 700]);
    // the path in, marked the way a mountain path is marked
    plantLand(120, 22, 0.55, NM.makeJizo, [40, 560]);
    plantLand(90, 22, 0.5, NM.makePathPost, [0, 640]);
    plantLand(50, 28, 0.5, NM.makeStepLantern, [60, 420]);
    return;   // LANTERN NIGHT is fully populated — the Maple grid pass must not run
  }

  await breathe('Filling the stadium…');
  // ══ GAME DAY: a fall Saturday, and the whole town is here ══════════════
  // Same model as Pirate Bay below — polygon regions, a spatial hash, authored
  // landmarks reserved BEFORE the scatter runs. The difference is density: a
  // parking lot on game day is nose to tail, and "it feels empty" is the one
  // failure mode this world invites.
  if (WORLD_ID === 'gameday') {
    const P3 = (p2: GD.Pt): [number, number] => [w(p2[0]), w(p2[1])];
    GD.resetPlacement();
    // `qk` is the QUEST/MEAL TAG, and it is not decoration: it drives the daily
    // quest counters, the newsroom's {M} meal name, the FIRST CAR / FIRST
    // BUILDING moments, and the SHOWOFF rival's "that one is big" test. Nothing
    // on this world carried one, so all four were silently dead here — a child
    // could be handed "eat 6 cars" on a world whose live prop census showed
    // zero tagged cars and zero tagged houses.
    const drop = (mesh: THREE.Object3D, p2: GD.Pt, r: number, rotY?: number, force = false, qk?: string) => {
      if (!force && !GD.spotOpen(p2[0], p2[1], r * 20)) return;
      const [x3, z3] = P3(p2);
      if (rotY !== undefined) mesh.rotation.y = rotY;
      if (qk) mesh.userData.qk = qk;
      place(mesh, x3, z3, r);
      GD.claimSpot(p2[0], p2[1], r * 20);
    };
    const REG = (id: GD.GdBiome) => GD.GD_REGIONS.find((r) => r.id === id)!;
    const spread = (id: GD.GdBiome, n: number, clear = 60, sep?: number) =>
      GD.scatterInRegion(REG(id), n, Math.random, clear, { sep });

    /** Scatter n of a prop through a district and place EVERY one of them.
     *
     *  ONE radius, used for both the scatter's overlap rejection and the
     *  drop's burial test. It used to be two numbers on every line — a `sep`
     *  passed to spread() and an `r` passed to drop() — and they disagreed
     *  everywhere. scatterInRegion claims each sampled point at `sep`; drop()
     *  then asks spotOpen() about that same point at `r`, and spotOpen only
     *  exempts an EXACT-match claim (same centre AND same radius). With
     *  sep 2.2 and r 1.4 the prop read its own claim as an obstacle and
     *  refused to exist.
     *
     *  Measured on the shipped build: 2,364 props requested by this pass,
     *  861 present. Every scatter that carried a separation was discarded in
     *  full; what survived was the parked vehicles (no sep) and the one tree
     *  pass whose two numbers happened to match at 3.0. Which is exactly what
     *  the top-down render showed — a busy lot ringed by empty districts.
     */
    // `sep` reserves ground in 3D units and defaults to the eat radius; a frat
    // house is 17.6 x 9.6 on the ground (half-diagonal 10) and reserved 7, so
    // qa/placement.mjs measured frat houses 4.45 units through each other on
    // the unpatched build. sep != r forces the drop (the scatter already holds
    // the claim; drop()'s own-claim skip only matches an equal radius).
    const plant = (id: GD.GdBiome, n: number, clear: number, r: number,
                   make: () => THREE.Object3D, face = false, qk?: string, sep = r) => {
      for (const p2 of GD.scatterInRegion(REG(id), n, Math.random, clear, { sep }))
        drop(make(), p2, r, face ? GD.gdFacingStadium(p2[0], p2[1]) : undefined, false, qk);
    };
    /** …and the same for the ground between the districts. */
    const plantLand = (n: number, clear: number, r: number, make: () => THREE.Object3D,
                       band?: [number, number]) => {
      for (const p2 of GD.scatterLand(n, Math.random, clear, band, { sep: r })) drop(make(), p2, r);
    };

    // ── THE RESERVE ───────────────────────────────────────────────────────
    // The stadium is 57 units across. Scatter first and it comes down on top
    // of whatever the lot pass left there — the bug bay.ts records as the
    // galleon landing on eleven palms. Claim the authored sites first.
    const STAD: GD.Pt = [GD.STADIUM.cx, GD.STADIUM.cy];
    // …and the RESERVE was sized off the old 24 collider, so it kept a 72-unit
    // circle of ground clear around a mesh 28 units across — a bare ring the
    // player crosses on the way to the finale. 780 clears the stands and their
    // shadow and lets the apron dress itself.
    GD.claimSpot(STAD[0], STAD[1], 780);
    const TOWER: GD.Pt = [8380, 4550];
    GD.claimSpot(TOWER[0], TOWER[1], 260);

    // ── THE HERO ──────────────────────────────────────────────────────────
    // Eaten last, and worth the wait: 123 parts, 18 units tall.
    //
    // IT WAS NOT EATABLE AT ALL. The radius was 24; the player's growth law
    // caps at R_CAP 12 and the eat gate is target.radius <= R * 1.11, so
    // nothing above 13.32 can ever be swallowed. A live census across the three
    // worlds: Maple 0 unreachable props, Pirate Bay 0, GAME DAY exactly 1 — the
    // stadium, the thing the entire level is built around and the finale its
    // design contract promises. The comment above even reasoned about the
    // radius being under the visual half-width, which is right, and then set it
    // to twice what the player can reach.
    //
    // 11.0 puts it inside the gate at R >= 9.91. Measured growth curves cross
    // that at about 167 seconds of a 180-second match, so the bowl comes into
    // range in the last quarter, with the fourth-quarter multiplier live and
    // just enough clock to drive north and take it. That is the finale.
    //
    // The mesh is 57.4 across, so the half-width to radius ratio is 2.6 —
    // Pirate Bay's landmarks run 1.6 to 2.4, so this is in family: a big meal
    // reads bigger than the hole that takes it, which is the hole.io fantasy.
    drop(TG.makeStadium(), STAD, 11.0, 0, true, 'big');
    drop(TG.makeClockTower(), TOWER, 4.5, 0, true, 'big');

    // ── THE TAILGATE ──────────────────────────────────────────────────────
    // The hero district, and the spawn. lotSlots() lays vehicles along the
    // parking rows with alternating headings — real lots park back to back,
    // and one shared heading reads as a car transporter. Every third slot is
    // a canopy or an RV instead of a truck so the rows have silhouette.
    // NOSE-IN, NOT END-TO-END. `face = s.ang` yawed every vehicle ALONG its
    // row: the truck body is 5.9+ units long on local x (tailgate.ts:319) and
    // the RV 12.2, on a 7.9-8.75-unit pitch — so trucks sat bumper to bumper
    // and every RV drove through both neighbours. Measured 2026-09-02 by
    // qa/placement.mjs on the unpatched build: 28 truck-truck, 10 truck-RV and
    // 9 RV-RV footprint interpenetrations, photographed as one solid mass of
    // RV roofs. A quarter turn parks them nose-in like every stadium lot, the
    // 3.2-wide flank along the row and the tailgate on the aisle where the
    // party is. Same draw count, same slots. The extra claim is the vehicle's
    // real half-length, so the aisle scatter that follows keeps its grills
    // off the bonnets (a truck claimed 3 units and reaches 4; an RV claimed
    // 4.2 and reaches 6.1).
    for (const [i, s] of GD.lotSlots(Math.random).entries()) {
      const p2: GD.Pt = [s.x, s.y];
      const face = s.ang;
      if (i % 7 === 3) drop(TG.makeCanopy(), p2, 2.4, face);
      else if (i % 11 === 5) { drop(TG.makeRV(), p2, 4.2, face + Math.PI / 2, false, 'rv'); GD.claimSpot(s.x, s.y, 130); }
      else { drop(TG.makeTailgateTruck(), p2, 3.0, face + Math.PI / 2, false, 'car'); GD.claimSpot(s.x, s.y, 90); }
    }
    // …and the party BETWEEN the rows, which is the whole point of an aisle.
    //
    // TWO passes went wrong here before this one. The first requested 2,364
    // props and placed 861, because the scatter's separation and the drop's
    // radius were different numbers and every prop rejected its own claim.
    // The second fixed that and asked for the same shape at higher counts,
    // which put 260 identical grey kettle grills in the lot — 6,237 props and
    // the ground invisible under them. Density was never the problem; the
    // repeat was. So the counts below are lower AND the kit is twice the size:
    // two ways to cook, two yard games, a television, a food truck, a bounce
    // house, a souvenir rail. A player should be able to look at any twenty
    // square metres of this lot and find something they have not seen yet.
    plant('lot', 110, 40, 1.4, TG.makeGrill);
    plant('lot', 60, 48, 1.8, TG.makeSmoker);
    plant('lot', 150, 38, 1.6, TG.makeTailgateTable);
    plant('lot', 130, 34, 1.4, TG.makeCoolerStack);
    plant('lot', 70, 46, 2.8, TG.makeCornhole);
    plant('lot', 50, 44, 2.4, TG.makeLadderToss);
    plant('lot', 220, 26, 0.7, TG.makeFoldingChair);
    plant('lot', 80, 38, 1.0, TG.makeFlagPole);
    plant('lot', 70, 30, 0.8, TG.makeTrashBarrel);
    plant('lot', 70, 28, 0.5, TG.makeFootball);
    plant('lot', 55, 40, 2.4, TG.makeCanopy);
    plant('lot', 40, 42, 2.0, TG.makeConcessionCart);
    plant('lot', 55, 44, 1.6, TG.makeTailgateTv);
    plant('lot', 26, 60, 1.5, TG.makeSouvenirRack);
    plant('lot', 12, 90, 4.0, TG.makeFoodTruck, true, 'car');
    plant('lot', 8, 110, 3.0, TG.makeBounceHouse);
    plant('lot', 20, 60, 1.5, TG.makePorchSofa);
    plant('lot', 24, 50, 1.2, TG.makeFacePaintStand);
    plant('lot', 40, 34, 0.6, TG.makeHelmetProp);

    // ── GATE PLAZA ────────────────────────────────────────────────────────
    // The gates FACE the bowl, because a ticket gate you approach from behind
    // is a wall. Everything else here is the queue and the SHOPPING: this is
    // where a family spends money on the way in.
    plant('plaza', 20, 90, 3.4, TG.makeTicketGate, true);
    plant('plaza', 40, 60, 2.4, TG.makeMerchStand);
    plant('plaza', 46, 52, 2.0, TG.makeConcessionCart);
    plant('plaza', 34, 56, 1.5, TG.makeSouvenirRack);
    plant('plaza', 20, 60, 1.2, TG.makeFacePaintStand);
    plant('plaza', 10, 100, 4.0, TG.makeFoodTruck, true, 'car');
    plant('plaza', 6, 120, 3.0, TG.makeBounceHouse);
    plant('plaza', 40, 42, 1.2, TG.makeBanner);
    plant('plaza', 70, 30, 0.9, TG.makeConeStack);
    plant('plaza', 30, 40, 1.6, TG.makePortaloo);
    plant('plaza', 50, 28, 0.7, TG.makeFoldingChair);
    plant('plaza', 36, 30, 0.8, TG.makeTrashBarrel);
    plant('plaza', 24, 34, 0.45, TG.makeMegaphone);
    // the inflatable the team runs out through — at the gate, facing in
    plant('plaza', 2, 150, 6.5, TG.makeHelmetTunnel, true);

    // ── RV ROW ────────────────────────────────────────────────────────────
    // People who arrived on Wednesday: motorhomes, awnings, satellite dishes,
    // deck chairs and — per docs/GAMEDAY.md — a hot tub. Four of them, since
    // the joke is better when you can find a second one.
    plant('rvpark', 52, 100, 4.2, TG.makeRV, true, 'rv');
    plant('rvpark', 34, 70, 2.2, TG.makeSatelliteRig);
    plant('rvpark', 4, 130, 1.9, TG.makeHotTub);
    plant('rvpark', 120, 28, 0.7, TG.makeFoldingChair);
    plant('rvpark', 55, 36, 1.4, TG.makeGrill);
    plant('rvpark', 26, 46, 1.8, TG.makeSmoker);
    plant('rvpark', 60, 34, 1.4, TG.makeCoolerStack);
    plant('rvpark', 60, 38, 1.6, TG.makeTailgateTable);
    plant('rvpark', 34, 44, 1.6, TG.makeTailgateTv);
    plant('rvpark', 36, 34, 1.0, TG.makeFlagPole);
    plant('rvpark', 34, 30, 0.8, TG.makeTrashBarrel);

    // ── FRAT ROW ──────────────────────────────────────────────────────────
    plant('greek', 24, 140, 7.0, TG.makeFratHouse, true, 'house', 11);
    plant('greek', 44, 46, 1.5, TG.makePorchSofa);
    plant('greek', 70, 36, 1.2, TG.makeBanner);
    plant('greek', 110, 26, 0.7, TG.makeFoldingChair);
    plant('greek', 55, 34, 1.4, TG.makeCoolerStack);
    plant('greek', 50, 46, 2.0, TG.makePennantString);
    plant('greek', 44, 36, 1.6, TG.makeTailgateTable);
    plant('greek', 34, 34, 1.4, TG.makeGrill);
    plant('greek', 30, 44, 2.4, TG.makeLadderToss);
    plant('greek', 26, 46, 1.4, TG.makeHayStack);
    plant('greek', 20, 50, 1.8, TG.makeBandRig);

    // ── OLD CAMPUS ────────────────────────────────────────────────────────
    plant('campus', 22, 160, 8.0, TG.makeBrickHall, false, 'house', 11);
    plant('campus', 8, 90, 1.6, TG.makeStatue);
    plant('campus', 55, 40, 1.2, TG.makeBanner);
    plant('campus', 70, 32, 0.8, TG.makeTrashBarrel);
    plant('campus', 60, 30, 0.7, TG.makeFoldingChair);
    plant('campus', 30, 44, 2.0, TG.makeConcessionCart);
    plant('campus', 20, 60, 1.5, TG.makeSouvenirRack);
    plant('campus', 26, 44, 1.4, TG.makeHayStack);
    plant('campus', 18, 50, 1.8, TG.makeBandRig);
    plant('campus', 6, 100, 4.0, TG.makeFoodTruck, true, 'car');
    plant('campus', 70, 60, 3.0, makeTree);

    // ── PRACTICE FIELD ────────────────────────────────────────────────────
    plant('practice', 6, 130, 2.6, TG.makeGoalpost);
    plant('practice', 16, 100, 3.6, TG.makeBleacherStack);
    plant('practice', 34, 50, 1.8, TG.makeBlockingSled);
    plant('practice', 26, 50, 1.8, TG.makeBandRig);
    plant('practice', 60, 30, 0.6, TG.makeHelmetProp);
    plant('practice', 34, 28, 0.45, TG.makeMegaphone);
    plant('practice', 50, 28, 0.5, TG.makeFootball);
    plant('practice', 44, 28, 0.7, TG.makeFoldingChair);
    plant('practice', 26, 34, 1.4, TG.makeCoolerStack);
    plant('practice', 20, 44, 2.4, TG.makeLadderToss);
    plant('practice', 20, 44, 1.4, TG.makeHayStack);

    // ── THE STADIUM FORECOURT ─────────────────────────────────────────────
    // Everything between the stands and the concourse ring. Shrinking the
    // painted pitch to the mesh's real footprint (see the bake) exposed how
    // much ground this actually is — a bare pale disc forty units across, and
    // the establishing shot looks straight down at it. It is the last stretch
    // the player crosses before the finale, so it gets a proper precinct:
    // stands and carts working the crowd, ticket gates facing OUT the way a
    // gate faces, barriers, bins, and the litter of a place that has had
    // ninety thousand people walk through it since noon.
    plant('bowl', 90, 44, 2.0, TG.makeConcessionCart);
    plant('bowl', 70, 46, 2.4, TG.makeMerchStand);
    plant('bowl', 60, 44, 1.5, TG.makeSouvenirRack);
    plant('bowl', 150, 26, 0.9, TG.makeConeStack);
    plant('bowl', 110, 30, 0.8, TG.makeTrashBarrel);
    plant('bowl', 90, 36, 1.2, TG.makeBanner);
    plant('bowl', 50, 40, 1.6, TG.makePortaloo);
    plant('bowl', 44, 34, 0.45, TG.makeMegaphone);
    plant('bowl', 34, 40, 0.6, TG.makeHelmetProp);
    plant('bowl', 40, 44, 1.2, TG.makeFacePaintStand);
    plant('bowl', 26, 70, 3.4, TG.makeTicketGate, true);
    plant('bowl', 60, 30, 0.7, TG.makeFoldingChair);
    plant('bowl', 30, 60, 2.0, TG.makePennantString);

    // ── THE TREE LINE ─────────────────────────────────────────────────────
    // Autumn. makeTree draws from FALL_FOLIAGE on this world, so the rim is
    // amber and crimson rather than the high-summer green the other two use.
    plant('woods', 300, 60, 3.0, makeTree);
    plant('woods', 120, 55, 2.8, makePine);
    plant('woods', 200, 30, 1.0, makeBush);
    plant('woods', 40, 50, 1.4, TG.makeHayStack);

    // ── THE GROUND BETWEEN ────────────────────────────────────────────────
    // Districts are places; most of a site this size is the ground between
    // them. Without this pass the world reads as eight busy islands floating
    // in an empty disc — the exact note bay.ts records against itself.
    plantLand(90, 50, 0.8, TG.makeTrashBarrel);
    plantLand(90, 50, 0.9, TG.makeConeStack);
    plantLand(110, 40, 0.7, TG.makeFoldingChair);
    plantLand(70, 50, 1.2, TG.makeBanner);
    plantLand(60, 44, 1.4, TG.makeCoolerStack);
    plantLand(60, 50, 1.4, TG.makeHayStack);
    plantLand(180, 80, 3.0, makeTree);
    // …and a band of scrub pressed right up against the rim, which is what
    // stops the tree line reading as a drawn-on brown ring.
    plantLand(200, 26, 1.0, makeBush, [0, 620]);
    plantLand(140, 60, 3.0, makeTree, [0, 760]);

    return;   // GAME DAY is fully populated — the Maple grid pass must not run
  }

  await breathe('Docking the ships…');
  // ══ PIRATE BAY: props scattered inside REGIONS, never on a grid ═════════
  if (WORLD_ID === 'pirate') {
    const P3 = (p2: [number, number]): [number, number] => [w(p2[0]), w(p2[1])];
    // Everything placed claims its ground, hand-authored positions included —
    // otherwise a scatter pass happily drops a palm inside the galleon.
    // it claimed ground but never CHECKED it — the source of all 58 of the
    // bay's prop intersections. A drop onto occupied ground is now refused.
    const drop = (mesh: THREE.Object3D, p2: [number, number], r: number, rotY?: number, force = false) => {
      if (!force && !BAY.spotOpen(p2[0], p2[1], r * 20)) return;
      const [x3, z3] = P3(p2);
      if (rotY !== undefined) mesh.rotation.y = rotY;
      place(mesh, x3, z3, r);
      BAY.claimSpot(p2[0], p2[1], r * 20);
    };
    const dropGlb = (name: string, p2: [number, number], r: number, h: number, fb?: () => THREE.Object3D, rotY?: number) => {
      const [x3, z3] = P3(p2);
      if (!insideIsland3(x3, z3)) return;
      if (!BAY.spotOpen(p2[0], p2[1], r * 20)) return;
      glb(scene, addEdible, name, x3, z3, r, { h, rotY, smallShadow: r < 2.5, fallback: fb });
      BAY.claimSpot(p2[0], p2[1], r * 20);
    };
    // ── DENSITY, AS ONE NUMBER ────────────────────────────────────────────
    // A full instrumented match on every world found PIRATE BAY the worst-paced
    // level in the game: eats per second peak at 15.0 around two minutes and
    // then collapse — 10.4, 5.4, 3.9 — so the last third of a match is a slow
    // decline to a quarter of peak, and it finishes on 110,841 against GAME
    // DAY's 326,319. The cause is not the layout, which is good; it is that
    // there are 2,137 things on this island against GAME DAY's 6,537. A big
    // void eats the resort out and then has nowhere to go: mean distance to
    // the nearest meal climbs 8 -> 11 -> 13 -> 16 across those same windows.
    //
    // Sixty-odd scatter calls were hand-balanced against each other, and
    // rewriting all of them would keep the density and lose the balance. So
    // the multiplier lives HERE, in the one helper they all go through: every
    // prop type grows by the same factor and their proportions are untouched.
    const BAY_DENSITY = 2.0;
    const spread = (id: string, n: number, clear = 60, sep?: number) =>
      BAY.scatterInRegion(BAY.BAY_REGIONS.find((r) => r.id === id)!,
        Math.round(n * BAY_DENSITY), Math.random, clear, { sep });
    BAY.resetPlacement();   // a fresh island starts with empty ground

    // A landmark is big enough that "on land" isn't sufficient — it must also
    // clear the boardwalk and the trail by its own footprint. This asserts it
    // at load rather than leaving it to a screenshot to notice.
    // A landmark is AUTHORED. It goes down where it was designed to go, on top
    // of whatever the scatter left there — its site is reserved below, before
    // the wild pass runs, so in practice there is nothing there to sit on.
    const landmark = (mesh: THREE.Object3D, p2: [number, number], r: number, rotY: number, clear: number) => {
      if (!BAY.bayPlaceable(p2[0], p2[1], clear)) console.warn('[pirate] landmark site is illegal', p2, clear);
      drop(mesh, p2, r, rotY, true);
    };
    // THE RESERVE. Every authored landmark site, claimed before a single palm
    // is scattered. Run the other way round and the galleon lands on eleven of
    // them — which is exactly what shipped.
    const RESERVE: [number, number, number][] = [
      [6850, 3450, 7.5], [5400, 2050, 9], [8540, 3700, 10], [9250, 5150, 7],
      [9150, 6550, 7.5], [8880, 6980, 5], [7400, 10380, 8], [5700, 4550, 7],
      [4300, 4200, 9], [2350, 6100, 3], [2750, 6450, 4], [2520, 6620, 7],
      [4050, 8950, 7.5], [3470, 8220, 4], [4400, 2450, 4], [2450, 4200, 3],
      [5330, 6890, 4], [5120, 8600, 2.4],
    ];
    // sep = the prop's own 3D radius, so the spatial hash can refuse to bury it
    // in something else. avoid = districts this prop has no business in: the
    // island-wide shoreline scatter was dropping grey rocks and beach loungers
    // onto the nightclub and the port boardwalk.
    // the built-up districts. Beach clutter and wild scrub both belong out of
    // them — the grove and bush passes carried no exclusion at all, so boulders
    // and palm trees were growing on the lit dance floor.
    const NO_TOWN: BAY.BayBiome[] = ['party', 'port', 'resort', 'market', 'oldtown'];
    const sland = (n: number, clear = 45, band?: [number, number], sep?: number, avoid?: BAY.BayBiome[]) =>
      BAY.scatterLand(Math.round(n * BAY_DENSITY), Math.random, clear, band, { sep, avoid });
    const grove = (cx2: number, cy2: number, n: number, rad: number, clear = 30) =>
      BAY.clusterAt(cx2, cy2, n, rad, Math.random, clear, { sep: 2.6 });

    // ══ THE WILD ISLAND ═══════════════════════════════════════════════════
    // Everything below is a district; MOST of Pirate Bay is the open sand and
    // scrub between them. A per-region scatter can never reach it, so this
    // pass samples the whole landmass — it is what stops the island reading
    // like eight busy islands floating in an empty cream disc.
    //
    // It is DEFINED here and CALLED last. Run first, it seeded 800-odd palms
    // and shells across ground the authored districts were about to claim, and
    // the galleon came down on top of eleven of them.
    const wildIsland = () => {
    // palm GROVES (clumps, not an even dusting — from above a clump reads as
    // a place, a dusting reads as noise)
    for (const [gx2, gy2] of sland(17, 240, undefined, undefined, NO_TOWN)) {
      for (const p2 of grove(gx2, gy2, 4 + Math.floor(Math.random() * 5), 420, 55))
        dropGlb('palm', p2, 2.6, rand(6.5, 10.5), makePalm, rand(0, Math.PI * 2));
    }
    // ── THE BIG ONES ──────────────────────────────────────────────────────
    // Doubling the island's density fixed most of PIRATE BAY's pace collapse
    // — eats per second in the last third went from 5.4 and 3.9 to 22.6 — but
    // the final twenty seconds still fall off a cliff, and the instrumentation
    // says why: 6% dead time and a mean distance of TWENTY units to the next
    // meal, at a moment when the hero is sixteen metres across. There are 29
    // objects on this island at radius 4 or above. MAPLE FALLS, after the same
    // treatment, has 240.
    //
    // Density feeds the early game; SIZE feeds the last minute. These are the
    // late-game meals: ancient palms grown from the ordinary ones, sea stacks,
    // and the beached wrecks a pirate bay ought to have had from the start.
    for (const p2 of sland(58, 150, undefined, 4.4, NO_TOWN)) {
      const g = new THREE.Group();
      const inner = makePalm();
      inner.scale.setScalar(1.75);          // a palm that has been here a while
      g.add(inner);
      drop(g, p2, 4.4, rand(0, Math.PI * 2));
    }
    for (const p2 of sland(40, 140, undefined, 4.8, NO_TOWN)) {
      const g = new THREE.Group();
      const inner = makeRocksFB();
      inner.scale.set(2.1, rand(2.4, 3.6), 2.1);   // a stack, not a boulder
      g.add(inner);
      drop(g, p2, 4.8, rand(0, Math.PI * 2));
    }
    for (const p2 of sland(16, 200, [0, 620], 5.6, NO_TOWN)) {
      const g = new THREE.Group();
      const inner = makeThatchHut();
      inner.scale.set(1.9, 1.7, 1.9);      // a longhouse rather than a hut
      g.add(inner);
      drop(g, p2, 5.6, rand(0, Math.PI * 2));
    }
    // dune grass and scrub, thickest just inland of the surf
    for (const p2 of sland(190, 26, undefined, 0.9, NO_TOWN)) drop(makeReeds(), p2, 0.9, rand(0, Math.PI * 2));
    for (const p2 of sland(110, 34, undefined, 1.6, NO_TOWN)) drop(makeBush(), p2, 1.6);
    for (const p2 of sland(95, 30, undefined, 0.7, ['party', 'port'])) drop(makeFlowers(), p2, 0.7);
    // the SHORELINE band: shells, driftwood rocks, and things the tide left
    for (const p2 of sland(130, 20, [40, 420], 0.5, NO_TOWN)) drop(makeShell(), p2, 0.5, rand(0, Math.PI * 2));
    for (const p2 of sland(58, 34, [60, 520], 2.4, NO_TOWN)) drop(makeRocksFB(), p2, 2.4, rand(0, Math.PI * 2));
    for (const p2 of sland(34, 40, [90, 620], 1.2, NO_TOWN)) drop(makeSandcastleFB(), p2, 1.2);
    for (const p2 of sland(44, 40, [90, 700], 1.8, NO_TOWN)) dropGlb('umbrella', p2, 1.8, 3.2, makeUmbrellaFB, rand(0, Math.PI * 2));
    for (const p2 of sland(40, 34, [90, 700], 1.4, NO_TOWN)) drop(makeBeachChairFB(), p2, 1.4, rand(0, Math.PI * 2));
    for (const p2 of sland(9, 120, [120, 700], 2.6, NO_TOWN)) drop(makeLifeguardFB(), p2, 2.6, rand(0, Math.PI * 2));
    // doubloons in the sand — treasure is the island's whole fiction
    for (const p2 of sland(65, 26, undefined, 0.6, ['resort'])) drop(makeCoins(), p2, 0.6);
    for (const p2 of sland(18, 60, undefined, 1.3, NO_TOWN)) drop(makeBarrel(), p2, 1.3);
    };
    for (const [rx2, ry2, rr2] of RESERVE) BAY.claimSpot(rx2, ry2, rr2 * 20);
    wildIsland();

    // ── THE PIERS ───────────────────────────────────────────────────────────
    // They were strokes on the ground texture that stopped in flat water with
    // nothing on them. Each one now gets a real deck: planks, pilings, bollards
    // and a lamp, built to length and laid along the painted line.
    for (const [x0, y0, x1, y1] of BAY.PIERS) {
      const L = Math.hypot(x1 - x0, y1 - y0), a2 = Math.atan2(y1 - y0, x1 - x0);
      const parts: THREE.BufferGeometry[] = [];
      const len3 = L * 0.05, half3 = 3.6;
      parts.push(part(new THREE.BoxGeometry(len3, 0.34, half3 * 2), 0xefe0c2, len3 / 2, 0.5, 0));
      for (let k = 0; k * 1.4 < len3; k++) {
        parts.push(part(new THREE.BoxGeometry(0.1, 0.36, half3 * 2), 0xd8c8a4, k * 1.4, 0.69, 0));
      }
      for (let k = 0; k * 3.2 < len3; k++) for (const sz of [-half3 + 0.5, half3 - 0.5]) {
        parts.push(part(new THREE.CylinderGeometry(0.28, 0.3, 2.6, 7), 0xc79350, 0.8 + k * 3.2, -0.6, sz));
        if (k % 2 === 0) parts.push(part(new THREE.CylinderGeometry(0.3, 0.34, 1.0, 8), 0x2e2634, 0.8 + k * 3.2, 1.1, sz));
      }
      parts.push(part(new THREE.CylinderGeometry(0.12, 0.12, 4.4, 6), 0xfdf3de, len3 - 1.2, 2.5, 0));
      parts.push(part(new THREE.SphereGeometry(0.42, 10, 8), 0xffe6a8, len3 - 1.2, 4.9, 0));
      const pier = new THREE.Group();
      pier.add(mergedProp(parts));
      pier.rotation.y = -a2;
      pier.position.set(w(x0), 0, w(y0));
      pier.userData.afloat = true;   // a pier legitimately overhangs the water
      setShadow(pier); scene.add(pier); addEdible(pier, 4.5);
    }

    // ── ON THE WATER ────────────────────────────────────────────────────────
    // The bay is 23% of the island and used to contain FIVE props. It is also
    // where the port crowd shouts "the superyacht!! START IT!!" about a
    // superyacht that did not exist. place() rejects anything off the land, so
    // floating things need their own placer: inside the bay polygon, hull
    // sunk far enough to cut the surface.
    const afloat = (mesh: THREE.Object3D, p2: [number, number], r: number, rotY = 0, sink = 0.55) => {
      if (!BAY.pointInPoly(p2[0], p2[1], BAY.WATER_SMOOTH)) { console.warn('[pirate] afloat: not in the bay', p2); return; }
      const [x3, z3] = P3(p2);
      mesh.rotation.y = rotY;
      mesh.position.set(x3, -sink, z3);
      mesh.userData.afloat = true;   // exempt from the off-island cull in validateWorld
      mesh.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      scene.add(mesh); addEdible(mesh, r);
      BAY.claimSpot(p2[0], p2[1], r * 20);
    };
    // THE YACHT — the thing the whole resort axis points at, and the biggest
    // meal on the island
    afloat(LUXE.makeSuperYacht(), [8080, 5520], 9, -1.15);
    // the galleons moor in the bay off the docks, not beached on the boardwalk
    afloat(LUXE.makeGalleon(), [7880, 4180], 8, -0.9);
    afloat(LUXE.makeGalleon(), [7620, 5080], 8, 2.2);
    // tenders, jet skis and speedboats scattered along the sheltered side
    for (const [wx, wy, a2] of [[7500, 6100, 0.6], [8380, 5980, -0.4], [7960, 6700, 1.1],
      [7400, 7300, 2.3], [7700, 4600, -1.0]] as [number, number, number][]) {
      afloat(LUXE.makeSpeedboat(), [wx, wy], 2.6, a2, 0.32);
    }
    for (const [wx, wy, a2] of [[8250, 5140, 1.2], [8180, 5280, 1.2], [8140, 6320, -0.7],
      [8060, 6460, -0.7]] as [number, number, number][]) {
      afloat(LUXE.makeJetSki(), [wx, wy], 1.5, a2, 0.22);
    }

    // ── THE RESORT AXIS ─────────────────────────────────────────────────────
    // Arrival: off the boardwalk, under the arch, inland past the fountain to
    // the pool, mirrored either side, with the hotel's cream-and-teal repeated
    // down its whole length. Symmetry and repetition is what reads as expensive
    // from a top-down camera.
    //
    // The first version ran on a hand-guessed heading 56 degrees off the one it
    // claimed, and a measured audit found 27 of its 55 props sitting off the
    // coastline — where place() drops them on the floor without a word, so half
    // the avenue silently did not exist. It is now built from MEASURED
    // geometry: the resort is a strip about 890 world units deep between the
    // boardwalk's clearance and the outer coast, so the axis is SHORT and
    // perpendicular to the shore rather than long and diagonal. Every site is
    // asserted before anything is placed, and rejections are counted out loud.
    const AP = BAY.pathPointAt(BAY.PROMENADE, 0.45);
    const AN: [number, number] = [0.99, -0.16];    // inland normal, measured
    const AT: [number, number] = [-AN[1], AN[0]];  // across the axis
    const site = (d: number, off = 0): [number, number] =>
      [AP.x + AN[0] * d + AT[0] * off, AP.y + AN[1] * d + AT[1] * off];
    const axAng = Math.atan2(AN[1], AN[0]);
    // Facing helpers. A prop's forward axis is part of its geometry, and the two
    // seat families here disagree: makeBeachChairFB looks down +Z, the luxe
    // loungers down +X. Mirroring a row by adding PI to the heading — what the
    // first version did — turns half an avenue round to face backwards. Mirror
    // the POSITION, never the heading.
    const faceZ = (fx: number, fz: number) => Math.atan2(fx, fz);
    const faceX = (fx: number, fz: number) => Math.atan2(-fz, fx);
    let axFail = 0;
    const axDrop = (mesh: THREE.Object3D, d: number, off: number, r: number, rotY: number) => {
      const p2 = site(d, off);
      if (!BAY.bayPlaceable(p2[0], p2[1], Math.max(25, r * 10))) { axFail++; return; }
      drop(mesh, p2, r, rotY);
    };
    axDrop(makeArrivalArch(), 285, 0, 5, axAng);
    axDrop(LUXE.makeValetStand(), 300, -300, 2.2, axAng);
    axDrop(LUXE.makeGullwingSupercar(), 300, 300, 2.4, axAng + 0.3);
    axDrop(LUXE.makeStatueFountain(), 470, 0, 3, 0);
    axDrop(LUXE.makeInfinityPool(), 690, 0, 5.5, axAng);
    axDrop(LUXE.makeChampagneTower(), 690, -300, 1.8, 0);
    axDrop(LUXE.makeCaviarBar(), 690, 300, 2.4, axAng + Math.PI);
    // both sides face IN toward the axis, so the avenue reads as one room
    // rather than two rows of chairs with their backs to each other
    for (let i = 0; i < 6; i++) {
      const d = 400 + i * 105;
      for (const sgn of [-1, 1]) {
        axDrop(LUXE.makeSunLounger(), d, sgn * 215, 1.4, faceX(-sgn * AT[0], -sgn * AT[1]));
        if (i % 2 === 0) axDrop(LUXE.makeParasolLux(), d + 40, sgn * 310, 1.8, 0);
        if (i % 3 === 1) axDrop(LUXE.makePotPlant(), d, sgn * 130, 0.9, 0);
      }
    }
    for (let i = 0; i < 6; i++) {   // the palm avenue: one motif, repeated
      const d = 330 + i * 110;
      for (const sgn of [-1, 1]) axDrop(LUXE.makePalmLux(), d, sgn * 400, 2.6, 0);
    }
    if (axFail) console.warn('[pirate] resort axis: ' + axFail + ' sites rejected');

    // ── THE DOCKS: the galleon at the pier head    // ── THE DOCKS: the galleon at the pier head, cargo, cannons, lighthouse
    for (const p2 of spread('port', 34, 40)) drop(Math.random() < 0.6 ? makeBarrel() : makeChest(), p2, 1.4);
    dropGlb('lighthouse', [8150, 2500], 6.5, 19, makeLighthouseFB);
    landmark(makeWarehouse(), [6850, 3450], 7.5, 0.5, 260);        // the cargo shed + crane
    for (const p2 of spread('port', 6, 60, 2)) drop(makeCannon(), p2, 2, rand(0, Math.PI * 2));
    for (const p2 of spread('port', 4, 90, 5)) drop(makeThatchHut(), p2, 3, rand(0, Math.PI * 2));   // sep 5 = a 6x6 hut's half-diagonal + margin; forced past drop()'s own-claim test
    // makeShopBox was a bare grey cube — 24 of them across two districts were the
    // first thing your eye landed on. Real dockside furniture instead.
    for (const p2 of spread('port', 10, 40, 1.4)) drop(LUXE.makeRopeBollard(), p2, 1.4, rand(0, Math.PI * 2));
    for (const p2 of spread('port', 8, 45, 1.5)) drop(LUXE.makeDeckChest(), p2, 1.5, rand(0, Math.PI * 2));
    for (const p2 of spread('port', 3, 90, 2.6)) drop(LUXE.makeAnchorMonument(), p2, 2.6, rand(0, Math.PI * 2));

    // ── OLD TOWN: a huddle of thatch houses and market clutter on the bluff
    for (const p2 of spread('oldtown', 24, 55, 5)) drop(makeThatchHut(), p2, 3, rand(0, Math.PI * 2));   // qa/placement.mjs: 21 hut-through-hut footprints at sep 3
    for (const p2 of spread('oldtown', 18, 40, 1.3)) drop(makeBarrel(), p2, 1.3);
    landmark(makeFort(), [5400, 2050], 9, 0.3, 280);               // the fort on the bluff
    for (const p2 of spread('oldtown', 12, 55, 2.6)) dropGlb('palm', p2, 2.6, rand(6.5, 9), makePalm, rand(0, Math.PI * 2));
    for (const p2 of spread('oldtown', 12, 35, 0.7)) drop(makeFlowers(), p2, 0.7);
    for (const p2 of spread('oldtown', 8, 45, 0.8)) drop(makeMailbox(), p2, 0.8, rand(0, Math.PI * 2));
    for (const p2 of spread('oldtown', 6, 60, 1.2)) drop(makeLamp(), p2, 1.2);

    // ── THE RESORT: cabanas along the shore, loungers ringing the two pools
    // the fallback here was makeThatchHut — the SAME prop as Old Town's fishing
    // shacks, so the resort's 22 signature beachfront structures were identical
    // to the poor village's huts
    for (const p2 of spread('resort', 22, 62, 3)) dropGlb('cabana', p2, 3, 4.6, LUXE.makeCabanaLux, rand(-0.3, 0.3));
    // The pools were two ellipses PAINTED on the ground texture, ringed by
    // eleven loungers at random rotation — and a circle of chairs reads as a
    // car boot sale from above, not a resort. Real pool geometry, and the
    // loungers in two straight mirrored rows along the pool's long axis.
    for (const [ox, oy, ang] of [[8900, 4900, 0.62], [9050, 6300, 0.62]] as [number, number, number][]) {
      drop(LUXE.makeInfinityPool(), [ox, oy], 5.5, ang);
      const ux = Math.cos(ang), uy = Math.sin(ang);
      for (let k = 0; k < 5; k++) {
        const t = (k - 2) * 175;
        for (const sgn of [-1, 1]) {
          const off = sgn * 290;
          // face the POOL, not the mirror of the other side's heading
          drop(LUXE.makeSunLounger(), [ox + ux * t - uy * off, oy + uy * t + ux * off], 1.4, faceX(sgn * uy, -sgn * ux));
        }
      }
      for (const sgn of [-1, 1]) {
        drop(LUXE.makeParasolLux(), [ox + ux * 300 - uy * sgn * 300, oy + uy * 300 + ux * sgn * 300], 1.8, 0);
      }
      drop(LUXE.makeDeckBar(), [ox - ux * 420, oy - uy * 420], 2.8, ang + Math.PI);
    }
    for (const p2 of spread('resort', 20, 50, 2.6)) dropGlb('palm', p2, 2.6, rand(7, 9.5), makePalm, rand(0, Math.PI * 2));
    // the resort is a narrow beachfront strip — a numeric sweep found exactly
    // one site with the hotel's own footprint of clearance, at its north head
    landmark(makeGrandHotel(), [8540, 3700], 10, -0.9, 300);       // THE ROYAL MARINER
    // …and three more verticals down the strip so one is always in frame. The
    // flagship district had exactly one object over 8 units tall across 246 props.
    landmark(LUXE.makeSpaPavilion(), [9250, 5150], 7, 0.4, 130);
    landmark(LUXE.makeYachtClub(), [9150, 6550], 7.5, -0.5, 130);
    landmark(LUXE.makeWickerLounge(), [8880, 6980], 5, 0.9, 110);
    for (const p2 of spread('resort', 6, 70, 2.4)) drop(LUXE.makeGolfBuggyLux(), p2, 2.4, rand(0, Math.PI * 2));
    for (const p2 of spread('resort', 8, 50, 1.6)) drop(LUXE.makeLuggageCart(), p2, 1.6, rand(0, Math.PI * 2));
    for (const p2 of spread('resort', 10, 40, 1.1)) drop(LUXE.makeRolledTowels(), p2, 1.1);
    for (const p2 of spread('resort', 8, 40, 0.9)) drop(LUXE.makeChampagneBucket(), p2, 0.9);
    for (const p2 of spread('resort', 6, 55, 2.2)) drop(LUXE.makeFireTable(), p2, 2.2);
    drop(makeTikiBar(), [9250, 5600], 3.4, -0.4);
    drop(makeTikiBar(), [8800, 4200], 3.4, 0.6);
    for (const p2 of spread('resort', 16, 34, 0.7)) drop(makeFlowers(), p2, 0.7);
    for (const p2 of spread('resort', 10, 40, 1.0)) drop(makeLuggage(), p2, 1.0, rand(0, Math.PI * 2));
    for (const p2 of spread('resort', 8, 55, 2.8)) drop(makeGazeboFB(), p2, 2.8);
    for (const p2 of spread('resort', 8, 45, 1.6)) drop(makeIcecreamFB(), p2, 1.6, rand(0, Math.PI * 2));

    // ── DANCE COVE: the stage, speaker walls, torch ring, bars
    landmark(makeMainStage(), [7400, 10380], 8, 0, 200);           // the main stage
    for (const p2 of [[6950, 10330], [7900, 10350], [7100, 10680], [8000, 10700],
      [6600, 10500], [8300, 10620]] as [number, number][]) drop(makeSpeakerStack(), p2, 2.6);
    for (let k = 0; k < 20; k++) {
      const a2 = (k / 20) * Math.PI * 2;
      drop(makeTorch(), [7400 + Math.cos(a2) * 1050, 10480 + Math.sin(a2) * 300], 1.0);
    }
    drop(makeTikiBar(), [6500, 10450], 3.4, 0.4);
    drop(makeTikiBar(), [8350, 10520], 3.4, -0.4);
    for (const p2 of spread('party', 16, 34, 1.3)) drop(makeBarrel(), p2, 1.3);
    for (const p2 of spread('party', 14, 26, 0.6)) drop(makeCoins(), p2, 0.6);

    // ── THE BAZAAR: stalls, treasure, palms
    landmark(makeBazaarTower(), [5700, 4550], 7, 0.2, 250);        // the spice tower
    // THE BAZAAR IS A STREET. 22 stalls at random rotation on a flat orange
    // disc read as a car park with parasols. Two facing rows either side of a
    // lane running from the boardwalk up to the spice tower, every stall
    // turned to face the lane.
    {
      const A: [number, number] = [6420, 3980], B: [number, number] = [5700, 4550];   // lane, boardwalk -> tower
      const dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy);
      const ux = dx / L, uy = dy / L, ang = Math.atan2(uy, ux);
      for (let i = 0; i < 8; i++) {
        const t = (i + 0.5) / 8;
        for (const sgn of [-1, 1]) {
          const off = sgn * 230;
          drop(makeMarketStall(), [A[0] + ux * L * t - uy * off, A[1] + uy * L * t + ux * off],
            2.6, -ang + (sgn > 0 ? Math.PI : 0));
        }
      }
      // the lane keeps going past the tower as a second, looser row
      for (let i = 0; i < 6; i++) {
        const t = 1 + (i + 0.5) / 6;
        for (const sgn of [-1, 1]) {
          drop(makeMarketStall(), [A[0] + ux * L * t - uy * sgn * 250, A[1] + uy * L * t + ux * sgn * 250],
            2.6, -ang + (sgn > 0 ? Math.PI : 0) + rand(-0.12, 0.12));
        }
      }
    }
    for (const p2 of spread('market', 16, 36)) drop(Math.random() < 0.5 ? makeChest() : makeBarrel(), p2, 1.4);
    for (const p2 of spread('market', 10, 50, 2.6)) dropGlb('palm', p2, 2.6, rand(6, 8.5), makePalm, rand(0, Math.PI * 2));
    for (const p2 of spread('market', 8, 34, 1.6)) drop(LUXE.makeGiftKiosk(), p2, 1.6, rand(0, Math.PI * 2));
    for (const p2 of spread('market', 4, 60, 2.2)) drop(LUXE.makeParrotPerch(), p2, 2.2);
    for (const p2 of spread('market', 3, 70, 2.4)) drop(LUXE.makePunchFountain(), p2, 2.4);
    for (const p2 of spread('market', 10, 30, 0.7)) drop(makeFlowers(), p2, 0.7);
    for (const p2 of spread('market', 5, 55, 2.6)) drop(makeFoodtruckFB(), p2, 2.6, rand(0, Math.PI * 2));

    // ── THE JUNGLE: dense canopy, boulders, a hidden chest
    for (const p2 of spread('jungle', 62, 34)) {
      if (Math.random() < 0.72) dropGlb('palm', p2, 2.6, rand(7, 10.5), makePalm, rand(0, Math.PI * 2));
      else drop(makePine(), p2, 3);
    }
    landmark(makeJungleTemple(), [4300, 4200], 9, 0.6, 280);       // THE LOST TEMPLE
    for (const p2 of spread('jungle', 18, 36, 2.4)) drop(makeRocksFB(), p2, 2.4, rand(0, Math.PI * 2));
    for (const p2 of spread('jungle', 28, 28, 1.6)) drop(makeBush(), p2, 1.6);
    for (const p2 of spread('jungle', 26, 22, 0.6)) drop(makeMushroom(), p2, 0.6);
    for (const p2 of spread('jungle', 5, 60, 1.5)) drop(makeChest(), p2, 1.5);
    for (const p2 of spread('jungle', 4, 90, 2.2)) drop(makeTentFB(), p2, 2.2, rand(0, Math.PI * 2));
    for (const p2 of spread('jungle', 2, 120, 1.4)) drop(makeCampfireFB(), p2, 1.4);

    // ── SMUGGLERS COVE: treasure, wreck rocks, a cannon
    for (const p2 of spread('cove', 12, 34, 1.5)) drop(makeChest(), p2, 1.5);
    for (const p2 of spread('cove', 18, 32, 2.4)) drop(makeRocksFB(), p2, 2.4, rand(0, Math.PI * 2));
    for (const p2 of spread('cove', 12, 34, 1.3)) drop(makeBarrel(), p2, 1.3);
    for (const p2 of spread('cove', 14, 24, 0.6)) drop(makeCoins(), p2, 0.6);
    for (const p2 of spread('cove', 10, 26, 0.9)) drop(makeReeds(), p2, 0.9);
    drop(makeCannon(), [2400, 6300], 2, 0.9);
    drop(makeCannon(), [2650, 5800], 2, -0.4);
    landmark(LUXE.makeTreasureDisplay(), [2350, 6100], 3, 0.5, 80);
    landmark(LUXE.makeMapPavilion(), [2750, 6450], 4, -0.3, 90);
    for (const p2 of spread('cove', 5, 40, 1.4)) drop(LUXE.makeDeckChest(), p2, 1.4, rand(0, Math.PI * 2));
    // the wreck used to sit 17 units offshore, where place() dropped it on the
    // floor without a word. landmark() warns if that ever happens again.
    {
      // a 0.42 heel drove the low rail 7.1 units UNDER the sand — the wreck read
      // as half a ship. Gentler list, then settle it on its own measured hull so
      // the keel kisses the beach whatever the geometry does later.
      const hull = LUXE.makeGalleon(); hull.rotation.z = 0.17;
      const wreck = new THREE.Group(); wreck.add(hull);
      const bb = new THREE.Box3().setFromObject(hull);
      hull.position.y = -bb.min.y - 0.8;          // 0.8 of keel buried in sand
      landmark(wreck, [2520, 6620], 7, 1.9, 120);
    }

    // ── SUNSET BEACH: the long outer sweep — umbrellas, castles, palms
    for (const p2 of spread('beach', 30, 36, 1.8)) dropGlb('umbrella', p2, 1.8, 3.2, makeUmbrellaFB, rand(0, Math.PI * 2));
    for (const p2 of spread('beach', 22, 34, 1.4)) drop(makeBeachChairFB(), p2, 1.4, rand(0, Math.PI * 2));
    for (const p2 of spread('beach', 14, 36, 1.2)) drop(makeSandcastleFB(), p2, 1.2);
    for (const p2 of spread('beach', 18, 50, 2.6)) dropGlb('palm', p2, 2.6, rand(6.5, 9), makePalm, rand(0, Math.PI * 2));
    for (const p2 of spread('beach', 20, 22, 0.5)) drop(makeShell(), p2, 0.5, rand(0, Math.PI * 2));
    for (const p2 of spread('beach', 3, 90, 2.6)) drop(makeLifeguardFB(), p2, 2.6, rand(0, Math.PI * 2));
    // the beach had NOTHING over 3 units tall — a dusting of confetti on cream
    // ground. A centre, an edge, and a straight row of MATCHED parasols
    // parallel to the tideline instead of 30 umbrellas at random rotation.
    landmark(LUXE.makeYachtClub(), [4050, 8950], 7.5, 0.9, 130);
    landmark(LUXE.makeCrowsNestTower(), [3470, 8220], 4, 0, 110);
    drop(LUXE.makeDeckBar(), [4700, 9450], 2.8, -0.6);
    for (let i = 0; i < 12; i++) {
      const t = i / 11, bx = 3050 + t * 2100, by = 8100 + t * 1500;
      drop(LUXE.makeParasolLux(), [bx, by], 1.8, 0);
      // 0.62 is the TIDELINE's own bearing, so every lounger looked along the
      // beach instead of out at the water
      if (i % 2 === 0) drop(LUXE.makeSunLounger(), [bx + 130, by - 110], 1.4, faceX(0.58, 0.81));
    }

    // ── WAYPOINTS IN THE WILD ────────────────────────────────────────────
    // 61% of the island is undistricted and held exactly ONE prop taller than
    // 3 units, so the walk between districts had nothing in it.
    landmark(LUXE.makeCrowsNestTower(), [4400, 2450], 4, 0.4, 120);   // north headland lookout
    landmark(LUXE.makeAnchorMonument(), [2450, 4200], 3, -0.6, 100);  // west coast marker
    landmark(LUXE.makeMapPavilion(), [5330, 6890], 4, 1.1, 120);      // between bazaar and beach
    landmark(LUXE.makeFireTable(), [5120, 8600], 2.4, 0, 90);
    // a signpost at a RANDOM bearing is not wayfinding. Point them at the resort.
    for (const p2 of sland(9, 90, undefined, 1.6)) drop(LUXE.makeSignpost(), p2, 1.6, faceZ(8700 - p2[0], 5800 - p2[1]));

    // ── THE PROMENADE: torches and benches down its whole length
    // stepping t by 0.02 makes (t*100) land on ...5, ...7, ...9 — never a
    // multiple of 4, 6 or 8. The whole promenade shipped with zero benches,
    // zero planters and zero signposts. An integer counter cannot lie like that.
    let pi = 0;
    for (let t = 0.015; t < 0.99; t += 0.02, pi++) {
      const a2 = BAY.pathPointAt(BAY.PROMENADE, t);
      const nx = Math.cos(a2.ang + Math.PI / 2), ny = Math.sin(a2.ang + Math.PI / 2);
      const side = pi % 2 === 0 ? 1 : -1;
      drop(makeTorch(), [a2.x + nx * side * (BAY.PROM_HALF - 55), a2.y + ny * side * (BAY.PROM_HALF - 55)], 1.0);
      if (pi % 2 === 0) {
        const bn = makeBench(); bn.rotation.y = -a2.ang;
        drop(bn, [a2.x - nx * side * (BAY.PROM_HALF - 60), a2.y - ny * side * (BAY.PROM_HALF - 60)], 2.4);
      }
      // council wheelie bins on a five-star waterfront. Planters instead.
      if (pi % 3 === 1) drop(LUXE.makePotPlant(), [a2.x - nx * side * (BAY.PROM_HALF - 25), a2.y - ny * side * (BAY.PROM_HALF - 25)], 0.9);
      if (pi % 8 === 4) drop(LUXE.makeSignpost(), [a2.x + nx * side * (BAY.PROM_HALF - 30), a2.y + ny * side * (BAY.PROM_HALF - 30)], 1.6, -a2.ang);
    }
    return;   // Pirate Bay is fully populated — the Maple grid pass never runs
  }

  // ══════════════════════════════════════════════════════════════════════════
  await breathe('Building the town…');
  // ══ MAPLE FALLS ═══════════════════════════════════════════════════════════
  // Nine authored districts on the 6x6 grid. Every one of them is built from
  // straight rows, mirrored pairs and repeated motifs — that is what reads as
  // DESIGNED from a top-down 3/4 camera. Rejection sampling never does; it is
  // used only for the filler between the authored things.
  //
  // Everything here runs off the seeded stream in ./mainstreet, so the town is
  // byte-identical on every load.
  MS.resetMapleRng();
  MS.resetSpots();

  // ── the placement contract ────────────────────────────────────────────────
  // prototype3d runs a post-build sweep that shoves any prop straddling a
  // traffic lane sideways, and RETIRES anything sitting off the coastline.
  // Both are silent. So this file asserts its own sites first: a prop that
  // fails maplePlaceable is a prop that sweep would have had to fix.
  // Sized to beat prototype3d's sweep, which tests ASPHALT_HALF (2.75 units)
  // plus 70% of the prop's real half-extent. 68 + 24r world units clears it for
  // everything in the kit, including the long ones (a corn row is nine units
  // of hedge carrying an eat radius of 2.6).
  const roadClear = (r3: number) => 68 + r3 * 24;      // world units off a road centreline
  /** the river, the pond and the lagoon are WATER — nothing stands in them.
   *  The old grid pass had no river test at all, which is why reeds and park
   *  benches used to end up mid-channel on the east side of the island. */
  const inMapleWater = (wx: number, wy: number, r3 = 1): boolean => {
    if (Math.hypot(wx - POND[0], wy - POND[1]) < POND[2] + 40 + r3 * 12) return true;
    const rx = riverXAtWorld(wy);
    if (rx != null && Math.abs(wx - rx) < 120 + r3 * 12) return true;
    return inLagoon3(w(wx), w(wy), 70);
  };
  const maplePlaceable = (wx: number, wy: number, r3 = 1): boolean => {
    const x3 = w(wx), z3 = w(wy);
    if (!insideIsland3(x3, z3)) return false;
    if (!coastClear(x3, z3, Math.min(16, 5 + r3))) return false;
    if (inMapleWater(wx, wy, r3)) return false;
    const band = roadClear(r3);
    for (const c of ROAD_CENTERS) if (Math.abs(wx - c) < band || Math.abs(wy - c) < band) return false;
    return true;
  };
  let dropSkip = 0;
  const legalSite = (wx: number, wy: number, r: number): boolean => {
    if (!insideIsland3(w(wx), w(wy))) return false;
    if (inMapleWater(wx, wy, r)) return false;
    const band = roadClear(r);
    for (const c of ROAD_CENTERS) if (Math.abs(wx - c) < band || Math.abs(wy - c) < band) return false;
    // drop() claimed ground but never CHECKED it — only landmark() did. That
    // asymmetry is where all 93 of Maple's prop intersections came from.
    if (!MS.spotOpen(wx, wy, r * 20)) return false;
    return true;
  };
  /** place at WORLD coordinates and claim the ground for the separation pass.
   *  Refuses the water and the road bands outright — a prop that survives this
   *  is a prop prototype3d's sweep will leave exactly where it was put. */
  const drop = (mesh: THREE.Object3D, wx: number, wy: number, r: number, rotY?: number): boolean => {
    if (!legalSite(wx, wy, r)) { dropSkip++; return false; }
    if (rotY !== undefined) mesh.rotation.y = rotY;
    place(mesh, w(wx), w(wy), r);
    MS.claimSpot(wx, wy, r * 20);
    return true;
  };
  const dropGlb = (name: string, wx: number, wy: number, r: number, h: number,
                   fb?: () => THREE.Object3D, rotY?: number): boolean => {
    if (!legalSite(wx, wy, r)) { dropSkip++; return false; }
    glb(scene, addEdible, name, w(wx), w(wy), r, { h, rotY, smallShadow: r < 2.5, fallback: fb });
    MS.claimSpot(wx, wy, r * 20);
    return true;
  };
  /** glb() places BLIND — it has no island guard of its own, and calling it
   *  raw is what parked coastal driveways over open space in the first place.
   *  Every Maple GLB goes through here, in 3D coordinates. */
  const placeGlb3 = (name: string, x3: number, z3: number, r: number, h: number,
                     fb?: () => THREE.Object3D, rotY?: number): boolean => {
    if (!insideIsland3(x3, z3) || !coastClear(x3, z3, 6) || inLagoon3(x3, z3, 40)) return false;
    glb(scene, addEdible, name, x3, z3, r, { h, rotY, smallShadow: r < 2.5, fallback: fb });
    return true;
  };
  /** A LANDMARK gets its site ASSERTED. The Pirate branch shipped an avenue
   *  with 27 of its 55 props standing over open space because place() drops
   *  illegal props on the floor without a word. Never again, and never
   *  silently: rejections are counted and named on the console. */
  let lmFail = 0;
  const lmRejects: string[] = [];
  const landmark = (mesh: THREE.Object3D, wx: number, wy: number, r: number, rotY = 0, tag = '?'): boolean => {
    if (!maplePlaceable(wx, wy, r) || !MS.spotFree(wx, wy, r * 20)) {
      lmFail++; lmRejects.push(`${tag}@${wx | 0},${wy | 0}`);
      return false;
    }
    return drop(mesh, wx, wy, r, rotY);
  };
  const landmarkGlb = (name: string, wx: number, wy: number, r: number, h: number,
                       fb: () => THREE.Object3D, rotY = 0, tag = '?'): boolean => {
    if (!maplePlaceable(wx, wy, r) || !MS.spotFree(wx, wy, r * 20)) {
      lmFail++; lmRejects.push(`${tag}@${wx | 0},${wy | 0}`);
      return false;
    }
    return dropGlb(name, wx, wy, r, h, fb, rotY);
  };
  /** rejection-sampled points inside a world-space rectangle, separated. */
  const scatter = (x0: number, y0: number, x1: number, y1: number,
                   n: number, r3: number): [number, number][] => {
    const out: [number, number][] = [];
    for (let t = 0; t < n * 26 && out.length < n; t++) {
      const wx = mr(x0, x1), wy = mr(y0, y1);
      if (!maplePlaceable(wx, wy, r3)) continue;
      if (!MS.spotFree(wx, wy, r3 * 20)) continue;
      MS.claimSpot(wx, wy, r3 * 20);
      out.push([wx, wy]);
    }
    return out;
  };
  /** a straight ROW of sites — the thing that actually reads as authored. */
  const row = (x0: number, y0: number, x1: number, y1: number, n: number): [number, number][] => {
    const out: [number, number][] = [];
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0.5 : i / (n - 1);
      out.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t]);
    }
    return out;
  };
  const SIDE = () => Math.floor(mrnd() * 3);          // which ribbon this yard flies
  const bcW = (g2: number) => blockCenter(g2);

  // ══ THE SQUARE ════════════════════════════════════════════════════════════
  // Block (3,2). Town hall at the north end facing the green, the bandstand on
  // the centre circle, the fountain and the war memorial mirrored in the two
  // south quadrants, elms down both long walks, and — permanently, in all
  // weathers — four people protesting about one parking meter.
  {
    const [gx0, gy0, gx1, gy1] = SQ_GREEN;
    const gcx = (gx0 + gx1) / 2, gcy = (gy0 + gy1) / 2;
    landmark(MS.makeTownHall(), SQ_CX, SQ_HALL_Y, 6.5, 0, 'town hall');
    landmark(MS.makeBandstand(), gcx, gcy, 3.2, 0, 'bandstand');
    landmarkGlb('fountain', 7230, 5680, 4, 6.5, makeFountainFB, 0, 'fountain');
    landmark(MS.makeWarMemorial(), 6480, 5680, 2.2, 0, 'war memorial');
    // the four flagpoles on the forecourt, flanking the rally stage
    for (const s of [-1, 1]) {
      const fp = new THREE.Group();
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 9, 6), new THREE.MeshStandardMaterial({ color: 0xc8cdd8, metalness: 0.5, roughness: 0.4 }));
      pole.position.y = 4.5; fp.add(pole);
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.4), new THREE.MeshStandardMaterial({ color: s < 0 ? 0x2f4a7a : 0xd8392f, side: THREE.DoubleSide, roughness: 0.8 }));
      flag.position.set(s * 1.25, 8, 0); fp.add(flag);
      drop(fp, SQ_CX + s * 400, 4830, 1.2);
    }
    // THE PROTEST. Four of them, a semicircle round one meter, since March.
    drop(MS.makeParkingMeter(), 6300, 5090, 0.7);
    for (let i = 0; i < 4; i++) {
      const a = -0.9 + i * 0.6;
      drop(MS.makeProtester(i % 2), 6300 + Math.cos(a) * 130, 5090 + Math.sin(a) * 130 + 40, 1.3, a + Math.PI);
    }
    drop(MS.makeNoticeBoard(), 6300, 5390, 1.6, Math.PI / 2);
    // elms down both long walks, benches facing the bandstand
    for (const sx of [-1, 1]) {
      for (const [tx, ty] of row(gcx + sx * 540, gy0 + 120, gcx + sx * 540, gy1 - 120, 5)) {
        dropGlb('parktree', tx, ty, 3.2, 7, makeTree);
      }
      for (const [bx2, by2] of row(gcx + sx * 300, gcy - 260, gcx + sx * 300, gcy + 260, 3)) {
        const bn = makeBench(); drop(bn, bx2, by2, 2.4, sx < 0 ? Math.PI / 2 : -Math.PI / 2);
      }
    }
    // the square's own bunting: signs cycling all the way round
    let sq = 0;
    for (const [sx2, sy2] of [
      ...row(gx0 + 60, gy0 + 40, gx1 - 60, gy0 + 40, 7),
      ...row(gx0 + 60, gy1 - 40, gx1 - 60, gy1 - 40, 7),
      ...row(gx0 + 40, gy0 + 160, gx0 + 40, gy1 - 160, 4),
      ...row(gx1 - 40, gy0 + 160, gx1 - 40, gy1 - 160, 4),
    ]) { drop(MS.makeLawnSign(sq++ % 2), sx2, sy2, 0.55, mr(-0.3, 0.3)); }
    // the civic hangers-on
    for (const [px2, py2] of row(6320, 4700, 6320, 4980, 2)) drop(MS.makeNewsBox(), px2, py2, 0.6, Math.PI / 2);
    dropGlb('icecream', 7400, 5030, 2.2, 3.6, makeIcecreamFB, -Math.PI / 6);
    dropGlb('foodtruck', 6420, 5820, 4, 5, makeFoodtruckFB, Math.PI / 6);
    for (const [px2, py2] of row(6700, 5830, 7300, 5830, 4)) drop(MS.makePlanter(), px2, py2, 0.9);
    for (let i = 0; i < 8; i++) {
      const [sx3, sy3] = [mr(gx0 + 120, gx1 - 120), mr(gy0 + 120, gy1 - 120)];
      if (Math.hypot(sx3 - gcx, sy3 - gcy) < 320) continue;
      drop(MS.makeTownsfolk(mchance(0.4)), sx3, sy3, 1.2);
    }
  }

  // ══ MAIN STREET ═══════════════════════════════════════════════════════════
  // Two facing rows of storefronts down the road at world x=6000. The blocks
  // are (2,2) west of it, and (2,3)/(3,3) either side of it further south —
  // so the street is one-sided beside the square and two-sided below it,
  // which is exactly how a courthouse-square town is laid out.
  {
    const SHOP_D = 250;   // how far the shop fronts stand back from the kerb
    for (let gy = 0; gy < 6; gy++) for (let gx = 0; gx < 6; gx++) {
      if (PLAN[gy][gx] !== 'downtown') continue;
      const cxB = bcW(gx), cyB = bcW(gy);
      const face = cxB < MAIN_ST_X ? 1 : -1;                // +1 = shop faces east
      const line = MAIN_ST_X - face * SHOP_D;               // the shop-front line
      // THE ROW. Flush, deterministic seams, no gaps — a real street wall.
      let o = -680;
      let n = 0;
      while (o < 660) {
        const bw = 8 + ((n * 3) % 4);                       // 8..11 units wide
        const h = 7 + ((n * 5) % 4);                        // two or three storeys
        const sf = MS.makeStorefront(bw, h, n % 3 === 0 ? -1 : SIDE());
        drop(sf, line, cyB + o + bw * 10, Math.max(3.2, bw * 0.4), face > 0 ? Math.PI / 2 : -Math.PI / 2);
        o += bw * 20 + 40;
        n++;
      }
      // the kerb furniture: lamps are handled by the road sweep, so this is
      // the small-town layer — planters, hydrants, papers, meters and signs
      let k = 0;
      for (const [fx3, fy3] of row(MAIN_ST_X - face * 130, cyB - 700, MAIN_ST_X - face * 130, cyB + 700, 11)) {
        if (!maplePlaceable(fx3, fy3, 0.8)) { k++; continue; }
        if (k % 4 === 0) drop(MS.makePlanter(), fx3, fy3, 0.9);
        else if (k % 4 === 1) drop(MS.makeParkingMeter(), fx3, fy3, 0.7);
        else if (k % 4 === 2) drop(makeHydrant(), fx3, fy3, 0.8);
        else drop(MS.makeNewsBox(), fx3, fy3, 0.6, face > 0 ? -Math.PI / 2 : Math.PI / 2);
        k++;
      }
      // the rear lot: pickups nose-in against the alley
      for (const [px3, py3] of row(cxB - 300, cyB - 170, cxB + 300, cyB - 170, 4)) {
        drop(MS.makePickup(), px3, py3, 2.4, Math.PI / 2);
      }
      for (const [px3, py3] of row(cxB - 300, cyB + 170, cxB + 300, cyB + 170, 4)) {
        if (mchance(0.55)) drop(MS.makePickup(), px3, py3, 2.4, -Math.PI / 2);
      }
      // the far side of the block, away from Main Street: the town's other
      // institutions, so a block is never one row and a car park
      const backX = cxB - face * 520;
      if (gy === 2) landmark(MS.makeDiner(), backX, cyB - 430, 4.2, face > 0 ? -Math.PI / 2 : Math.PI / 2, 'diner');
      if (gy === 2) drop(MS.makeBarberPole(), MAIN_ST_X - face * 155, cyB + 60, 0.8);
      if (gy === 3 && face > 0) landmark(MS.makeFireStation(), backX, cyB - 380, 5.4, -Math.PI / 2, 'fire station');
      if (gy === 3 && face > 0) landmark(MS.makePostOffice(), backX, cyB + 400, 4.4, -Math.PI / 2, 'post office');
      if (gy === 3 && face < 0) landmark(MS.makeChurch(), backX, cyB - 340, 5, Math.PI / 2, 'church');
      if (gy === 3 && face < 0) landmark(MS.makeWaterTower(), backX + 120, cyB + 480, 4, 0, 'water tower');
      // shade trees + benches along the back alley. Kept inside ±480 of the
      // block centre: at ±620 the east end of the row walked straight into the
      // shopfront line at x=5750/6250 and buried a bench in a hardware store.
      for (const [tx, ty] of row(cxB - 480, cyB + 700, cxB + 480, cyB + 700, 5)) {
        if (mchance(0.65)) dropGlb('parktree', tx, ty, 3.2, 7, makeTree);
        else drop(makeBench(), tx, ty, 2.4);
      }
      for (const [sx4, sy4] of scatter(cxB - 700, cyB - 700, cxB + 700, cyB + 700, 6, 1.2)) {
        drop(MS.makeTownsfolk(mchance(0.3)), sx4, sy4, 1.2);
      }
    }
    // the diner's rival: a hand-painted sandwich board on each corner
    for (const [sx5, sy5] of [[6180, 6420], [5820, 6420], [6180, 7350], [5820, 7350]] as [number, number][]) {
      drop(MS.makeLawnSign(SIDE()), sx5, sy5, 0.55);
    }
  }

  // ══ MAPLE HEIGHTS ═════════════════════════════════════════════════════════
  // The suburb — five blocks now, not fourteen. Same edge-facing lots (the
  // driveways are baked into the ground and must still reach a house), but
  // every yard has taken a side, and the neighbours disagree.
  for (let gy = 0; gy < 6; gy++) for (let gx = 0; gx < 6; gx++) {
    if (PLAN[gy][gx] !== 'cozy') continue;
    const cxB = bcW(gx), cyB = bcW(gy);
    const cx = w(cxB), cz = w(cyB);
    const half = wLen(BLOCK_SIZE / 2) - 6;
    const HOUSES = ['house_pink', 'house_craftsman', 'house_blue'];
    houseLots(gx, gy).forEach((lot, li) => {
      const hx = w(lot.x), hz = w(lot.y);
      const fx3 = lot.fx, fz3 = lot.fy;                 // toward the street
      const sx3 = -fz3, sz3 = fx3;                      // along the street
      placeGlb3(HOUSES[li % 3], hx, hz, 3.2, 5.2 * mr(0.92, 1.08), makeHouse, lot.rot);
      MS.claimSpot(lot.x, lot.y, 64);
      const dvx = lot.fy !== 0 ? 5.5 : 0, dvz = lot.fx !== 0 ? 5.5 : 0;
      // THE LAWN SIGN. Every yard. Neighbours alternate, because of course
      // they do — this is the single loudest thing in the whole level.
      const side = (li + gx + gy) % 2;
      place(MS.makeLawnSign(side), hx + fx3 * 6.6 - sx3 * 2.2, hz + fz3 * 6.6 - sz3 * 2.2, 0.55);
      if (li % 3 === 0) place(MS.makeLawnSign(1 - side), hx + fx3 * 6.2 + sx3 * 3, hz + fz3 * 6.2 + sz3 * 3, 0.55);
      if (mchance(0.7)) place(makeFlowers(), hx + fx3 * 4.4 + sx3 * 2, hz + fz3 * 4.4 + sz3 * 2, 0.7);
      if (mchance(0.75)) place(makeMailbox(), hx + fx3 * 7.6 + dvx + sx3, hz + fz3 * 7.6 + dvz + sz3, 1.2);
      if (li % 2 === 0) {
        const pcx2 = hx + fx3 * 4.9 + dvx, pcz2 = hz + fz3 * 4.9 + dvz;
        if (insideIsland3(pcx2, pcz2) && coastClear(pcx2, pcz2, 6) && !inLagoon3(pcx2, pcz2, 40)) {
          if (mchance(0.45)) {
            const pk = MS.makePickup(); pk.userData.qk = 'car'; pk.userData.ptsMult = 1.5;
            place(pk, pcx2, pcz2, 2.4); pk.rotation.y = lot.rot + Math.PI / 2;
          } else {
            glb(scene, addEdible, mchance(0.85) ? 'car_sedan' : 'car_taxi', pcx2, pcz2, 2.8,
              { h: 2.6, rotY: lot.rot + Math.PI / 2,
                fallback: () => { const c2 = makeParkedCar(); c2.userData.qk = 'car'; c2.userData.ptsMult = 1.5; return c2; },
                onReady: (g2) => { g2.userData.qk = 'car'; g2.userData.ptsMult = 1.5; } });
          }
        }
      }
      if (li % 3 === 2) { const sh = makeShed(); sh.rotation.y = lot.rot + mr(-0.3, 0.3); place(sh, hx - fx3 * 12, hz - fz3 * 12, 1.8); }
      else if (mchance(0.6)) place(makeBush(), hx - fx3 * 10 + sx3 * mr(-3, 3), hz - fz3 * 10 + sz3 * mr(-3, 3), 1.6);
      if (li % 4 === 1) place(MS.makeMapleTree(), hx - fx3 * 3 + sx3 * 7, hz - fz3 * 3 + sz3 * 7, 2.6);
    });
    // the interior commons: a stand of maples and the block's basketball hoop
    for (let t = 0; t < 4; t++) {
      const ix = cx + mr(-half * 0.22, half * 0.22), iz = cz + mr(-half * 0.22, half * 0.22);
      if (mchance(0.5)) placeGlb3('parktree', ix, iz, 3.2, mr(6, 8), makeTree);
      else place(MS.makeMapleTree(), ix, iz, 3);
    }
    for (let t = 0; t < 3; t++) place(makeBush(), cx + mr(-half * 0.24, half * 0.24), cz + mr(-half * 0.24, half * 0.24), 1.6);
    for (let t = 0; t < 2; t++) place(makeFlowers(), cx + mr(-half * 0.22, half * 0.22), cz + mr(-half * 0.22, half * 0.22), 0.7);
    drop(MS.makeMailboxRow(), cxB + mr(-300, 300), cyB + 620, 1.2);
    drop(MS.makeBusShelter(), cxB - 560, cyB - 600, 1.6, Math.PI / 2);
  }

  // ══ THE FAIRGROUNDS ═══════════════════════════════════════════════════════
  // The Maple County Fair, blocks (0..2, 1). One straight MIDWAY with tents in
  // matching rows either side of it, the arch at the west end, the show ring
  // and the livestock at the east. Symmetry is the whole trick.
  {
    const my = bcW(1);
    const mx0 = bcW(0) - 260, mx1 = bcW(2) + 620;
    landmark(MS.makeFairArch(), mx0 - 200, my, 5, 0, 'fair arch');
    landmark(MS.makeTicketBooth(), mx0 + 120, my + 300, 1.6, 0, 'ticket booth');
    landmark(MS.makePieTable(), bcW(1), my - 440, 1.9, 0, 'pie table');
    // the pie judges, mid-verdict, and the crowd waiting on it
    for (const [jx, jy] of row(bcW(1) - 120, my - 560, bcW(1) + 120, my - 560, 3)) {
      drop(MS.makeTownsfolk(true), jx, jy, 1.2, Math.PI);
    }
    // THE MIDWAY: tents in two matching rows, colours alternating
    // gold tents on the fair's khaki ground had almost no separation; and the
    // the second ribbon is BLUE, not teal
    const TENTC = [MS.RED, MS.BLUE, 0xff5d9e, 0x3f7a4e];
    let ti = 0;
    for (const side of [-1, 1]) {
      for (const [tx, ty] of row(1820, my + side * 430, 5300, my + side * 430, 7)) {
        if (landmark(MS.makeFairTent(TENTC[ti % TENTC.length]), tx, ty, 3, 0, 'fair tent')) ti++;
        else ti++;
      }
    }
    // the sideshows and the food row, down the middle of the midway
    const MIDWAY = row(mx0 + 560, my, mx1 - 560, my, 5);
    landmark(MS.makeStrikerBell(), MIDWAY[1][0], my, 1.8, 0, 'striker bell');
    landmark(MS.makePrizeWheel(), MIDWAY[3][0], my, 1.6, 0, 'prize wheel');
    for (const i of [0, 2, 4]) drop(MS.makeFairStand(), MIDWAY[i][0], my, 2.4, i % 4 ? 0 : Math.PI);
    // hay-bale seating and the fairgoers
    for (const [hx2, hy2] of row(1980, my + 700, 5240, my + 700, 5)) drop(MS.makeHayBales(), hx2, hy2, 1.8, mr(0, 1.5));
    for (const [px4, py4] of scatter(mx0, my - 720, mx1, my + 760, 20, 1.2)) drop(MS.makeTownsfolk(mchance(0.45)), px4, py4, 1.2);
    // and the fair stewards, working the crowd
    let fsi = 0;
    for (const [sx6, sy6] of [...row(mx0 + 200, my - 250, mx1 - 200, my - 250, 8), ...row(mx0 + 200, my + 250, mx1 - 200, my + 250, 8)]) {
      drop(MS.makeLawnSign(fsi++ % 2), sx6, sy6, 0.55, mr(-0.4, 0.4));
    }
    // the parking meadow north of the midway, and the pickups in it
    for (const [cx3, cy3] of scatter(bcW(0) - 500, my - 1150, bcW(2) + 400, my - 760, 12, 2.4)) {
      drop(MS.makePickup(), cx3, cy3, 2.4, Math.PI / 2 + mr(-0.06, 0.06));
    }
    for (const [bx3, by3] of scatter(bcW(0) - 700, my - 1300, bcW(2) + 700, my + 1300, 14, 2.6)) {
      drop(mchance(0.5) ? makeBush() : MS.makeMapleTree(), bx3, by3, 2.6);
    }
  }

  await breathe('Planting the farm…');
  // ══ THE FARM ══════════════════════════════════════════════════════════════
  // The bottomland east of town: blocks (3,0) and (3..5, 1). The barnyard, the
  // grain elevator on the rail, the corn maze, the pumpkin patch, and the 4-H
  // paddocks ./life stocks with livestock.
  {
    // THE BARNYARD, on (3,0) — a proper farmstead: house, barn, silos, coop
    landmark(MS.makeBarn(), 6650, 1560, 5, 0, 'barn');
    landmark(MS.makeSilo(), 7180, 1420, 2.8, 0, 'silo A');
    landmark(MS.makeSilo(), 7180, 1760, 2.8, 0, 'silo B');
    landmark(MS.makeFarmhouse(), 6180, 2060, 4.2, Math.PI, 'farmhouse');
    landmark(MS.makeChickenCoop(), 6640, 2120, 1.8, 0.4, 'chicken coop');
    landmark(MS.makeTractor(), 7000, 1980, 1.8, -0.5, 'tractor A');
    landmark(MS.makeTrough(), 6320, 1560, 1.4, Math.PI / 2, 'trough');
    for (const [px5, py5] of row(6120, 1300, 7300, 1300, 5)) drop(MS.makeHayBales(), px5, py5, 1.8, mr(0, 1.5));
    // THE GRAIN ELEVATOR, hard against the freight ring at world x≈7870
    landmark(MS.makeGrainElevator(), 7280, 3120, 5.5, Math.PI / 2, 'grain elevator');
    landmark(MS.makeTractor(), 6900, 3420, 1.8, 0.8, 'tractor B');
    // THE CORN MAZE, on (3,1). Rows laid on the painted spiral, so the maze
    // you see from the map is the maze you walk through.
    {
      const mzx = bcW(3), mzy = bcW(1);
      for (let t = 0.06; t < 1; t += 0.055) {
        const a2 = t * Math.PI * 7, r2 = 60 + t * 480;
        const cxp = mzx + Math.cos(a2) * (r2 + 110), cyp = mzy + Math.sin(a2) * (r2 + 110);
        if (!maplePlaceable(cxp, cyp, 2.2)) continue;
        drop(MS.makeCornRow(7), cxp, cyp, 2.2, -a2 + Math.PI / 2);
      }
      // straight field rows outside the maze — a farm is mostly crop
      for (const band of [-700, -610, 610, 700]) {
        for (const [rx, ry] of row(mzx - 640, mzy + band, mzx + 640, mzy + band, 6)) drop(MS.makeCornRow(9), rx, ry, 2.6, 0);
      }
      for (const [rx, ry] of row(7960, 2820, 7960, 4020, 5)) drop(MS.makeCornRow(9), rx, ry, 2.6, Math.PI / 2);
      landmark(MS.makeScarecrow(), mzx, mzy - 640, 1.2, 0, 'scarecrow A');
    }
    // THE PUMPKIN PATCH, on (4,1) — matching the tilled rows in the bake
    {
      const ppx = bcW(4), ppy = bcW(1) + 460;
      for (let r2 = 0; r2 < 7; r2++) {
        for (const [px6, py6] of row(ppx - 560, ppy - 200 + r2 * 58, ppx + 560, ppy - 200 + r2 * 58, 7)) {
          if (mchance(0.86)) drop(MS.makePumpkin(), px6 + mr(-30, 30), py6 + mr(-14, 14), 0.6);
        }
      }
      landmark(MS.makeScarecrow(), ppx - 640, ppy, 1.2, 0.4, 'scarecrow B');
      landmark(MS.makeFarmStand(), ppx + 700, ppy - 340, 1.8, -Math.PI / 2, 'farm stand');
      landmark(MS.makeTractor(), ppx - 560, ppy + 230, 1.8, 0.2, 'tractor C');
    }
    // THE 4-H PADDOCKS, on (5,1) — the pens ./life's livestock are tethered to
    {
      const zx = bcW(5), zy = bcW(1);
      for (const [pcx2, pcy2, pw2, pd2] of [
        [zx - 300, zy - 430, 520, 380], [zx - 300, zy + 430, 520, 380], [zx + 200, zy, 440, 400],
      ] as [number, number, number, number][]) {
        const fw = wLen(pw2), fd = wLen(pd2);
        for (const s of [-1, 1]) {
          const fn = makeFenceRun(fw, 0xd8cfae); drop(fn, pcx2, pcy2 + s * pd2 / 2, 1.4);
          const fe = makeFenceRun(fd, 0xd8cfae); drop(fe, pcx2 + s * pw2 / 2, pcy2, 1.4, Math.PI / 2);
        }
      }
      landmark(MS.makeBarn(), zx - 620, zy - 30, 5, Math.PI / 2, 'livestock barn');
      landmark(MS.makeTrough(), zx + 20, zy - 250, 1.4, 0, 'paddock trough');
      landmark(MS.makeHayBales(), zx - 300, zy - 60, 1.8, 0.4, 'paddock hay');
    }
    // fence lines, farm signs and the trees along the field boundaries
    for (const fgy of [0, 1]) for (const fgx of [3, 4, 5]) {
      if (PLAN[fgy][fgx] !== 'farm') continue;
      const fx5 = bcW(fgx), fy5 = bcW(fgy);
      for (const [tx, ty] of row(fx5 - 700, fy5 - 780, fx5 + 700, fy5 - 780, 5)) {
        if (mchance(0.55)) drop(MS.makeMapleTree(), tx, ty, 2.6);
      }
      for (const [sx7, sy7] of row(fx5 - 600, fy5 + 760, fx5 + 600, fy5 + 760, 4)) {
        drop(mchance(0.5) ? MS.makeBigSign(SIDE()) : MS.makeLawnSign(SIDE()), sx7, sy7, mchance(0.5) ? 2.4 : 0.55);
      }
      for (const [hx3, hy3] of scatter(fx5 - 720, fy5 - 720, fx5 + 720, fy5 + 720, 5, 1.8)) {
        drop(mchance(0.5) ? MS.makeHayBales() : MS.makeScarecrow(), hx3, hy3, mchance(0.5) ? 1.8 : 1.2, mr(0, 6.28));
      }
      for (const [px7, py7] of scatter(fx5 - 700, fy5 - 700, fx5 + 700, fy5 + 700, 4, 1.2)) {
        drop(MS.makeTownsfolk(true), px7, py7, 1.2);
      }
    }
  }

  // ══ MAPLE FALLS HIGH ══════════════════════════════════════════════════════
  // Blocks (4..5, 3..4). MEASURED: the river runs down world x≈8220..8460
  // through the whole of column gx=4, so the STADIUM lives on (5,3), east of
  // the creek — bleachers down both touchlines, goalposts at both ends, the
  // scoreboard behind the west end zone and the band trailer at the tunnel.
  // Block (4,3) keeps the practice field, because ./life stages the Friday
  // night ball game on that block centre and this file cannot move it.
  {
    const fx0 = bcW(5), fy0 = bcW(3);                    // the stadium
    landmarkGlb('school', bcW(5), bcW(4) - 300, 6, 12, MS.makeHighSchool, 0, 'high school');
    landmark(MS.makeScoreboard(), fx0 - 700, fy0, 3, Math.PI / 2, 'scoreboard');
    landmark(MS.makeGoalpost(), fx0 - 540, fy0, 2.2, Math.PI / 2, 'goalpost W');
    landmark(MS.makeGoalpost(), fx0 + 540, fy0, 2.2, -Math.PI / 2, 'goalpost E');
    // bleachers: a straight run either side, facing in. Mirror the POSITION,
    // never the heading — a mirrored heading turns half a stand round.
    for (const [bx4, by4] of row(fx0 - 340, fy0 - 640, fx0 + 340, fy0 - 640, 3)) {
      landmark(MS.makeBleachers(), bx4, by4, 4, 0, 'bleacher N');
    }
    for (const [bx4, by4] of row(fx0 - 340, fy0 + 640, fx0 + 340, fy0 + 640, 3)) {
      landmark(MS.makeBleachers(), bx4, by4, 4, Math.PI, 'bleacher S');
    }
    landmark(MS.makeBandTrailer(), fx0 + 660, fy0 + 520, 4, Math.PI / 2, 'band trailer');
    landmark(MS.makeConcession(), fx0 - 660, fy0 + 540, 2.8, 0, 'concession');
    // the marching band, formed up beside its trailer, in two straight files
    for (const side of [-1, 1]) {
      for (const [px8, py8] of row(fx0 + 520 + side * 60, fy0 + 720, fx0 + 520 + side * 60, fy0 + 900, 3)) {
        drop(MS.makeTownsfolk(true), px8, py8, 1.2, 0);
      }
    }
    // the crowd in the stands, two straight files of them
    for (const s2 of [-1, 1]) {
      for (const [px9, py9] of row(fx0 - 300, fy0 + s2 * 760, fx0 + 300, fy0 + s2 * 760, 6)) {
        drop(MS.makeTownsfolk(mchance(0.4)), px9, py9, 1.2, s2 > 0 ? Math.PI : 0);
      }
    }
    // the bus row on the student lot east of the creek, all facing out
    for (const [bx5, by5] of row(8880, bcW(4) - 480, 8880, bcW(4) + 100, 4)) {
      landmark(MS.makeSchoolBus(), bx5, by5, 4, 0, 'school bus');
    }
    for (const [cx4, cy4] of row(9140, bcW(4) - 480, 9140, bcW(4) + 100, 5)) {
      drop(MS.makePickup(), cx4, cy4, 2.4, 0);
    }
    // the school's own drive: buses and the flag on (5,4)
    for (const [cx5, cy5] of row(bcW(5) - 520, bcW(4) + 330, bcW(5) + 520, bcW(4) + 330, 5)) {
      drop(MS.makePickup(), cx5, cy5, 2.4, Math.PI / 2);
    }
    // the practice field on (4,3): a bleacher pair and the team's kit, east of
    // the creek so nothing stands in the water
    for (const [bx6, by6] of row(8600, bcW(3) + 430, 9000, bcW(3) + 430, 2)) {
      drop(MS.makeBleachers(), bx6, by6, 4, Math.PI);
    }
    drop(MS.makeConcession(), 8880, bcW(3) - 480, 2.8, Math.PI);
    // campus dressing across all four blocks
    for (const cgy of [3, 4]) for (const cgx of [4, 5]) {
      const gcx2 = bcW(cgx), gcy2 = bcW(cgy);
      for (const [tx, ty] of row(gcx2 - 700, gcy2 - 760, gcx2 + 700, gcy2 - 760, 5)) {
        if (mchance(0.6)) dropGlb('parktree', tx, ty, 3.2, 7, makeTree);
      }
      for (const [sx8, sy8] of row(gcx2 - 500, gcy2 + 740, gcx2 + 500, gcy2 + 740, 4)) {
        drop(MS.makeLawnSign(SIDE()), sx8, sy8, 0.55, mr(-0.3, 0.3));
      }
      for (const [px9, py9] of scatter(gcx2 - 720, gcy2 - 720, gcx2 + 720, gcy2 + 720, 7, 1.2)) {
        drop(MS.makeTownsfolk(mchance(0.25)), px9, py9, 1.2);
      }
      for (const [bx7, by7] of scatter(gcx2 - 700, gcy2 - 700, gcx2 + 700, gcy2 + 700, 5, 1.6)) {
        drop(mchance(0.5) ? makeBush() : makeBench(), bx7, by7, 1.6);
      }
      for (const [px10, py10] of scatter(gcx2 - 700, gcy2 - 700, gcx2 + 700, gcy2 + 700, 4, 2.6)) {
        drop(MS.makeMapleTree(), px10, py10, 2.6);
      }
    }
  }

  // ══ THE STRIP ═════════════════════════════════════════════════════════════
  // Blocks (0, 2..4): the highway into town. Everything here faces the road at
  // world x=2580 and everything here is trying to sell you something.
  {
    const sx0 = bcW(0);
    landmark(MS.makeGasStation(), sx0 + 200, bcW(2) - 260, 4.5, Math.PI / 2, 'gas station');
    landmark(MS.makeMotel(), sx0 - 60, bcW(2) + 560, 5.5, 0, 'motel');
    landmark(MS.makeDriveIn(), sx0 + 620, bcW(3) - 40, 5.5, -Math.PI / 2, 'drive-in screen');
    landmark(MS.makeTicketBooth(), sx0 + 380, bcW(3) - 520, 1.6, Math.PI / 2, 'drive-in booth');
    landmark(MS.makeBallOfTwine(), sx0 - 40, bcW(4) - 120, 4.5, -Math.PI / 2, "world's largest ball of twine");
    landmark(MS.makePylonSign(), sx0 + 340, bcW(4) - 560, 2.4, 0, 'twine pylon');
    landmark(MS.makeBaitShack(), sx0 - 300, bcW(4) + 560, 2.6, 0, 'strip bait shack');
    // BILLBOARDS down the whole frontage, cycling ribbons — the strip is
    // where the fair is loudest, because it is where the traffic is
    let bi = 0;
    for (const by8 of [4560, 5320, 6260, 7060, 7980, 8720, 9180]) {
      landmark(MS.makeBillboard(bi % 3 === 2 ? -1 : bi % 2), sx0 + 700, by8, 3.4, -Math.PI / 2, 'billboard');
      bi++;
    }
    // the cars at the drive-in, in the fan of ramps, all facing the screen
    for (let r2 = 1; r2 < 6; r2++) {
      const n = 3 + r2;
      for (let i = 0; i < n; i++) {
        const a2 = -0.95 + (i / (n - 1)) * 1.9;
        const cxp = sx0 - 180 + Math.cos(a2) * (110 + r2 * 88), cyp = bcW(3) + Math.sin(a2) * (100 + r2 * 74);
        if (!maplePlaceable(cxp, cyp, 2.4) || !MS.spotFree(cxp, cyp, 44)) continue;
        drop(MS.makePickup(), cxp, cyp, 2.4, -a2);
      }
    }
    // the motel's guests, the gas station's regulars, and the roadside scrub
    for (const sgy of [2, 3, 4]) {
      const sy = bcW(sgy);
      for (const [px10, py10] of scatter(sx0 - 700, sy - 700, sx0 + 700, sy + 700, 6, 1.2)) {
        drop(MS.makeTownsfolk(mchance(0.5)), px10, py10, 1.2);
      }
      for (const [px11, py11] of scatter(sx0 - 760, sy - 760, sx0 + 300, sy + 760, 8, 1.6)) {
        drop(mchance(0.5) ? makeBush() : MS.makeMapleTree(), px11, py11, mchance(0.5) ? 1.6 : 2.6);
      }
      for (const [px12, py12] of row(sx0 + 480, sy - 620, sx0 + 480, sy + 620, 5)) {
        drop(MS.makeLawnSign(SIDE()), px12, py12, 0.55);
      }
      drop(MS.makePylonSign(), sx0 + 640, sy + 700, 2.4);
    }
  }

  await breathe('Raking the park…');
  // ══ THE PARK ══════════════════════════════════════════════════════════════
  // Blocks (4..5, 2). The town green's bigger cousin: the pond, the nine-hole
  // municipal course the mayor's brother-in-law runs, picnic tables and grills.
  {
    landmarkGlb('gazebo', bcW(4) + 470, bcW(2) + 560, 5, 8.5, makeGazeboFB, 0, 'park gazebo');
    landmarkGlb('golfcart', bcW(4) - 470, bcW(2) + 320, 2.6, 3.2, makeGolfcartFB, 0.6, 'golf cart');
    landmark(MS.makeLawnSign(0), bcW(4) - 690, bcW(2) - 690, 0.55, 0, 'course sign');
    for (const pgx of [4, 5]) {
      const cxB = bcW(pgx), cyB = bcW(2);
      // THE PARK HAD THE FLATTEST SILHOUETTE IN MAPLE FALLS: 16 objects over 3
      // units a block, against 30 on campus, 45 downtown and 54 on the plaza.
      // Eleven tree sites, and every other thing in the park kit — tables,
      // grills, benches, bushes — is under 3 units, so nothing broke the
      // horizon. Measured at the spawn camera, the golf block rendered 96.5%
      // one green. 22 trees, and a stand of pines to give the skyline a top.
      for (const [tx, ty] of scatter(cxB - 700, cyB - 700, cxB + 700, cyB + 700, 22, 3.2)) {
        if (mchance(0.5)) dropGlb('parktree', tx, ty, 3.4, mr(6.5, 8.5), makeTree);
        else drop(MS.makeMapleTree(), tx, ty, 2.8);
      }
      for (const [px16, py16] of scatter(cxB - 660, cyB - 660, cxB + 660, cyB + 660, 7, 2.6))
        drop(makePine(), px16, py16, 2.6);
      // and something to stand under, which a park needs and this one lacked
      landmark(MS.makeBandstand(), cxB + mr(-260, 260), cyB + mr(-260, 260), 4.2, mr(0, 3.1), 'park bandstand');
      for (const [bx9, by9] of scatter(cxB - 640, cyB - 640, cxB + 640, cyB + 640, 5, 1.6)) drop(makeBush(), bx9, by9, 1.6);
      for (const [px13, py13] of scatter(cxB - 620, cyB - 620, cxB + 620, cyB + 620, 4, 1.6)) drop(MS.makePicnicTable(), px13, py13, 1.8, mr(0, 3.1));
      for (const [px14, py14] of scatter(cxB - 600, cyB - 600, cxB + 600, cyB + 600, 3, 1.0)) drop(MS.makeParkGrill(), px14, py14, 0.9);
      for (const [px15, py15] of scatter(cxB - 640, cyB - 640, cxB + 640, cyB + 640, 5, 1.2)) drop(MS.makeTownsfolk(mchance(0.4)), px15, py15, 1.2);
      for (const [bx10, by10] of row(cxB - 500, cyB + 700, cxB + 500, cyB + 700, 4)) drop(makeBench(), bx10, by10, 2.4);
    }
  }

  // ══ PINE WOODS ════════════════════════════════════════════════════════════
  // The north ridge, blocks (0..2, 0), (4,0), (5,0). ./life keeps its campsite
  // vignette on (4,0), so the clearing there stays clear.
  const TOWERS: [number, number][] = [[bcW(4) + 520, bcW(0) - 420], [3980, 1600]];
  for (let gy = 0; gy < 6; gy++) for (let gx = 0; gx < 6; gx++) {
    if (PLAN[gy][gx] !== 'forest') continue;
    const cxB = bcW(gx), cyB = bcW(gy);
    const cx = w(cxB), cz = w(cyB);
    const half = wLen(BLOCK_SIZE / 2) - 6;
    const isCamp = gx === 4 && gy === 0;
    const inClearing = (x: number, z: number) => isCamp && Math.hypot(x - (cx - 5), z - (cz + 3)) < 15;
    // the two lookout towers stand in a CLEARING — the tree pass has no
    // separation hash of its own, so it is told about them explicitly
    const inTowerYard = (x: number, z: number) =>
      TOWERS.some(([tx, tz]) => Math.hypot(x - w(tx), z - w(tz)) < 9);
    for (let t = 0; t < 34; t++) {
      const x = cx + mr(-(half - 4), half - 4), z = cz + mr(-(half - 4), half - 4);
      if (inClearing(x, z) || inTowerYard(x, z)) continue;
      if (Math.hypot(x - w(8405), z - w(1149)) < 13) continue;   // the river spring — no trees in the water
      if (mchance(0.4)) placeGlb3('pine', x, z, 3, mr(7, 9.5), makePine);
      else place(mchance(0.72) ? makePine() : MS.makeMapleTree(), x, z, 3);
    }
    if (isCamp) {
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 + 0.5;
        const log = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 2.2, 8), stdMat(0x9a7a5a, 1));
        log.rotation.z = Math.PI / 2; log.rotation.y = a; log.position.y = 0.35;
        const lg = new THREE.Group(); lg.add(log);
        place(lg, cx + Math.cos(a) * 3.4, cz + Math.sin(a) * 3.4, 1.4);
      }
      placeGlb3('tent', cx - 10, cz + 4, 2.6, 4.2, makeTentFB, mr(-0.4, 0.4));
      placeGlb3('campfire', cx, cz, 1.4, 1.7, makeCampfireFB);
      landmark(MS.makeRangerTower(), TOWERS[0][0], TOWERS[0][1], 2.8, 0.3, 'ranger tower');
    }
    placeGlb3('rocks', cx + mr(-half * 0.5, half * 0.5), cz + mr(-half * 0.5, half * 0.5), 2.4, 2.6, makeRocksFB, mr(0, 6.28));
    for (let t = 0; t < 6; t++) place(makeBush(), cx + mr(-half, half), cz + mr(-half, half), 1.6);
  }
  landmark(MS.makeRangerTower(), TOWERS[1][0], TOWERS[1][1], 2.8, -0.4, 'west ranger tower');

  // ══ LAKESIDE ══════════════════════════════════════════════════════════════
  // The whole south shore. The pier, the boat ramp, the bait shack, canoes on
  // a rack, and everybody in Maple Falls on a Saturday.
  {
    // these sit ON the waterline, so they use drop() rather than landmark():
    // a pier is SUPPOSED to overhang the coast, and the coast-clearance test a
    // landmark runs would (correctly) refuse every one of them
    drop(MS.makeFishingPier(20), 4700, 11430, 4.2, Math.PI / 2);
    drop(MS.makeBoatRamp(), 7100, 11250, 3.4, 0);
    landmark(MS.makeBaitShack(), 7460, 10940, 2.6, -Math.PI / 2, 'bait shack');
    landmark(MS.makeCanoeRack(), 6620, 11080, 2.8, 0, 'canoe rack');
    landmark(MS.makeRangerTower(), 8480, 10520, 2.8, 0, 'lake ranger tower');
    for (const [rx2, ry2] of row(6280, 11250, 5240, 11340, 4)) drop(MS.makeRowboat(), rx2, ry2, 1.8, mr(0, 3.1));
    for (const [lx2, ly2] of row(3200, 10900, 8740, 10900, 8)) drop(MS.makeLifeRing(), lx2, ly2, 0.8);
    for (const [px18, py18] of row(4200, 11150, 8200, 11150, 7)) drop(MS.makeTownsfolk(mchance(0.4)), px18, py18, 1.2, Math.PI);
    for (const [px19, py19] of row(3600, 11000, 8600, 11000, 6)) drop(MS.makePicnicTable(), px19, py19, 1.8, mr(0, 3.1));
    for (let gx = 0; gx < 6; gx++) {
      const cxB = bcW(gx), cyB = bcW(5);
      const cx = w(cxB), cz = w(cyB);
      const half = wLen(BLOCK_SIZE / 2) - 6;
      // the boardwalk colonnade at the top of the sand (the bake paints the
      // planks at world y 9475..9660 — these stand just behind it)
      for (const ux of [-0.62, -0.21, 0.21, 0.62]) {
        // palms in maple country read as leftover content from the other world
        place(mchance(0.5) ? MS.makeMapleTree() : makePine(), cx + ux * half, cz - half * 0.82, 2.6);
      }
      for (const ux of [-0.4, 0.4]) place(makeBench(), cx + ux * half, cz - half * 1.02, 2.4);
      for (const [ux, vz] of [[-0.55, -0.1], [-0.18, 0.14], [0.18, -0.1], [0.55, 0.14], [-0.36, 0.44], [0.36, 0.44]] as const) {
        placeGlb3('umbrella', cx + ux * half, cz + vz * half, 1.8, 3.2, makeUmbrellaFB, mr(0, 6.28));
      }
      for (const [px16, py16] of scatter(cxB - 700, cyB - 700, cxB + 700, cyB + 700, 5, 1.7)) drop(MS.makePicnicTable(), px16, py16, 1.8, mr(0, 3.1));
      for (const [px17, py17] of scatter(cxB - 700, cyB - 700, cxB + 700, cyB + 700, 6, 1.2)) drop(MS.makeTownsfolk(mchance(0.35)), px17, py17, 1.2);
      placeGlb3('sandcastle', cx + mr(-half * 0.5, half * 0.5), cz + half * 0.68, 1.2, 1.9, makeSandcastleFB, mr(0, 6.28));
      for (let t = 0; t < 2; t++) { const ch = makeBeachChairFB(); ch.rotation.y = mr(0, 6.28); place(ch, cx + mr(-half * 0.5, half * 0.5), cz + mr(-half * 0.1, half * 0.5), 1.3); }
      if (gx === 1 || gx === 4) placeGlb3('lifeguard', cx, cz + half * 0.55, 3.4, 7.5, makeLifeguardFB, Math.PI);
      if (gx === 0) placeGlb3('lighthouse', cx - half * 0.55, cz + half * 0.4, 6.5, 19, makeLighthouseFB);
      for (let t = 0; t < 2; t++) place(makeBush(), cx + mr(-half, half), cz + mr(-half, half), 1.4);
    }
  }

  // ── the snack carpet ──────────────────────────────────────────────────────
  // A speck-sized void must always have something to nibble, in every block,
  // in the biome's own vocabulary.
  for (let gy = 0; gy < 6; gy++) for (let gx = 0; gx < 6; gx++) {
    const biome = PLAN[gy][gx];
    const cxB = bcW(gx), cyB = bcW(gy);
    const cx = w(cxB), cz = w(cyB);
    const half = wLen(BLOCK_SIZE / 2) - 6;
    const tinyN = biome === 'forest' ? 17 : 36;
    for (let t = 0; t < tinyN; t++) {
      const x = cx + mr(-half, half), z = cz + mr(-half, half);
      // never in the fountain ring, the pond, the maze heart or the gridiron
      if (biome === 'plaza' && Math.hypot(x - w(7230), z - w(5680)) < 8) continue;
      if (biome === 'park' && gx === 4 && Math.hypot(x - cx, z - (cz + 6)) < 20) continue;
      if (biome === 'campus' && gx === 4 && gy === 3 && Math.abs(x - cx) < 22 && Math.abs(z - cz) < 13) continue;
      place(tinyForMaple(biome), x, z, mr(0.6, 0.85));
    }
    for (let t = 0; t < 3; t++) place(makeCoins(), cx + mr(-half, half), cz + mr(-half, half), 0.55);
  }

  // ── the roads ─────────────────────────────────────────────────────────────
  // Cones and streetlamps on the shoulder, and — because the fair is on — a
  // sign on every verge, alternating sides of the road and cycling the three
  // ribbon colours the entire length of every road in town.
  // CRITICAL: each sweep runs the full length of a road and CROSSES the other
  // four, so reject any spot whose along-coordinate is inside a crossing road.
  const roads3 = ROAD_CENTERS.map((c) => w(c));
  const nearCrossRoad = (v: number, m: number) => roads3.some((rc2) => Math.abs(v - rc2) < m);
  // ROADWORKS, not a cone every 32 units down every road on the island. The old
  // sweep planted roughly 340 permanent traffic cones, which — because the road
  // grid crosses everything — put them on the town green, the football pitch,
  // the beach and the middle of the fairground. It was the single largest
  // source of "cheap" in the level and the reason the map read as confetti.
  // Four actual sites now, each a cluster you'd believe: cones and a barrier.
  for (const [wx, wy] of [[4290, 3400], [7710, 6800], [6000, 9200], [2580, 5600]] as [number, number][]) {
    const cx4 = w(wx), cz4 = w(wy);
    if (!insideIsland3(cx4, cz4) || inMapleWater(wx, wy, 1)) continue;
    // tagged: these stand on the asphalt ON PURPOSE, and qa/placement.mjs
    // exempts 'roadworks' from its trees-on-roads count for that reason
    for (let k = 0; k < 4; k++) { const cone = makeCone(); cone.userData.qk = 'roadworks'; place(cone, cx4 + (k - 1.5) * 2.4, cz4 + 4.6, 0.7); }
    const barrier = MS.makeNoticeBoard(); barrier.userData.qk = 'roadworks';
    place(barrier, cx4, cz4 + 6.6, 1.0);
  }
  for (const rc of roads3) {
    let li = 0;
    for (let a = -280; a < 280; a += 24, li++) {
      const side = li % 2 ? 6.8 : -6.8;
      if (nearCrossRoad(a, 5.2)) continue;
      if (insideIsland3(a, rc) && !inLagoon3(a, rc) && coastClear(a, rc)) place(makeLamp(), a, rc + side, 0.7);
      if (insideIsland3(rc, a) && !inLagoon3(rc, a) && coastClear(rc, a)) place(makeLamp(), rc - side, a, 0.7);
    }
    // A STREET HAS A SIDE. This used to alternate red/blue every 17 units along
    // every verge in town — about 320 signs at perfect 50/50 — which erased the
    // per-block allegiance the crowd code carefully assigns and left no street
    // with a readable camp. One modulo defeated the whole premise. Signs now
    // follow the BLOCK they stand in, with about one defector in six (which is
    // the joke: the neighbours disagree), and there are a third as many, so the
    // survivors are legible instead of being a picket fence.
    const blockSide = (x3: number, z3: number) => {
      const gx = Math.min(5, Math.max(0, Math.floor((x3 / SCALE + CX) / BLOCK_SIZE)));
      const gy = Math.min(5, Math.max(0, Math.floor((z3 / SCALE + CZ) / BLOCK_SIZE)));
      return ((gx * 3 + gy * 5) % 7) < 4 ? 0 : 1;
    };
    let si = 0;
    for (let a = -276; a < 276; a += 45, si++) {
      const side = si % 2 ? 8.6 : -8.6;   // stagger which verge, not which camp
      if (nearCrossRoad(a, 7)) continue;
      // …and the ONLY placement pass in this file with no water test, which is
      // why signs and cones stood in the river and the pond
      if (insideIsland3(a, rc) && !inLagoon3(a, rc) && coastClear(a, rc, 8) && !inMapleWater(a / SCALE + CX, (rc + side) / SCALE + CZ, 0.7)) {
        const sd = mchance(0.16) ? 1 - blockSide(a, rc) : blockSide(a, rc);
        const sg = MS.makeLawnSign(sd); sg.rotation.y = mr(-0.25, 0.25);
        place(sg, a, rc + side, 0.55);
      }
      if (insideIsland3(rc, a) && !inLagoon3(rc, a) && coastClear(rc, a, 8) && !inMapleWater((rc - side) / SCALE + CX, a / SCALE + CZ, 0.7)) {
        const sd = mchance(0.16) ? 1 - blockSide(rc, a) : blockSide(rc, a);
        const sg = MS.makeLawnSign(sd); sg.rotation.y = Math.PI / 2 + mr(-0.25, 0.25);
        place(sg, rc - side, a, 0.55);
      }
    }
  }

  // ── the river banks + the bridge railings ─────────────────────────────────
  {
    const RIVER_W: [number, number][] = [
      [8405, 1149], [8277, 3035], [8565, 5337], [8213, 6887], [8469, 8661], [9431, 9305],
    ];
    for (let i = 0; i < RIVER_W.length - 1; i++) {
      const [x0, y0] = RIVER_W[i], [x1, y1] = RIVER_W[i + 1];
      const segLen = Math.hypot(x1 - x0, y1 - y0), steps = Math.floor(segLen / 380);
      const nx = -(y1 - y0) / segLen, ny = (x1 - x0) / segLen;
      for (let k2 = 1; k2 < steps; k2++) {
        const t = k2 / steps, side = k2 % 2 ? 1 : -1;
        const bx = w(x0 + (x1 - x0) * t + nx * side * 105), bz = w(y0 + (y1 - y0) * t + ny * side * 105);
        const bwy = y0 + (y1 - y0) * t;
        if (Math.abs(bwy - POND[1]) < 420) continue;
        // …and never on a road: the river crosses all five of them
        if (ROAD_CENTERS.some((c) => Math.abs(bwy - c) < 140 || Math.abs(x0 + (x1 - x0) * t + nx * side * 105 - c) < 140)) continue;
        place(mchance(0.5) ? makeReeds() : makeRocksFB(), bx, bz, mchance(0.5) ? 0.9 : 1.8);
      }
    }
    for (const rcW of ROAD_CENTERS) {
      const rx = riverXAtWorld(rcW);
      if (rx == null) continue;
      // a 13-unit railing laid ACROSS a road that happens to run beside the
      // crossing is a railing in a traffic lane — the SE junction at
      // (9420, 9420) is exactly that case
      if (ROAD_CENTERS.some((c) => Math.abs(rx - c) < 200)) continue;
      for (const side of [-1, 1]) {
        const rail = makeFenceRun(13, 0xf4f6fa);
        rail.userData.qk = 'bridge';   // a railing on the road EDGE is the bridge — exempt in qa/placement.mjs
        place(rail, w(rx), w(rcW) + side * 4.6, 1.6);
      }
    }
  }

  await breathe('Scattering the leaves…');
  // ══ THE COUNTRY BETWEEN THE BLOCKS ════════════════════════════════════════
  // MAPLE FALLS is the world a child plays FIRST — the cold-boot launch drops
  // them straight into it — and a full instrumented match measured it as the
  // weakest-paced level in the game. Eats per second go flat and then DOWN:
  //
  //     9.5  9.4  7.9  8.5  12.2  7.8  6.9        (per 20s, to the whistle)
  //
  // against GAME DAY's 12.6, 17.9, 20.3, 20.9, 30.5, 32.1. The climax of a
  // Maple match is slower than its middle, and it finishes on 82,902 points
  // where GAME DAY finishes on 326,319. A child's first impression of this
  // game is its worst-paced world.
  //
  // The cause is density. 3,138 objects over 242,887u² is 1.29 per 100u², the
  // lowest in the game by some way — GAME DAY runs 3.80 and LANTERN NIGHT
  // 4.85. The TOWN is fine; it is hand-authored block by block and it reads.
  // What is empty is everything BETWEEN the blocks: verges, hedgerows, scrub,
  // the long runs of nothing a big void has to cross to find its next meal.
  // Measured, that is exactly where the match falls apart — mean distance to
  // the nearest thing worth eating climbs from 7 units to 19 as the clock runs
  // down, and travel per eat is 4.1 units against GAME DAY's 1.9.
  //
  // So: a fill pass over the land the authored town does not use. Nothing here
  // touches a block, a row or a landmark — maplePlaceable already refuses
  // roads, water and the coast, and spotFree refuses anything already claimed,
  // so this can only land in gaps.
  {
    let filled = 0, bigTrees = 0, outbuildings = 0;
    const LO = 6000 - 5700, HI = 6000 + 5700;
    const pickTiny = () => {
      const r = mrnd();
      if (r < 0.30) return { m: MS.makeMapleTree(), r3: 2.6 };
      if (r < 0.44) return { m: makePine(), r3: 2.8 };
      if (r < 0.62) return { m: makeBush(), r3: 1.4 };
      if (r < 0.76) return { m: makeFlowers(), r3: 0.8 };
      if (r < 0.86) return { m: makeRocksFB(), r3: 2.0 };
      if (r < 0.93) return { m: MS.makePlanter(), r3: 0.9 };
      return { m: makeReeds(), r3: 0.9 };
    };
    // 1. THE VERGES. Small and many — this is the layer that stops a drive
    //    across town being a drive across nothing.
    for (let t = 0; t < 26000 && filled < 2300; t++) {
      const wx = mr(LO, HI), wy = mr(LO, HI);
      const { m, r3 } = pickTiny();
      if (!maplePlaceable(wx, wy, r3)) continue;
      if (!MS.spotFree(wx, wy, r3 * 20)) continue;
      MS.claimSpot(wx, wy, r3 * 20);
      place(m, w(wx), w(wy), r3);
      filled++;
    }
    // 2. THE BIG TREES. The town is called MAPLE FALLS and its largest edible
    //    was a 6.5-unit town hall — 46 objects in the whole world at radius 4
    //    or above, and NOTHING above 7, so a WORLD ENDER sixteen metres across
    //    had nothing left worth swallowing. A mature maple is the most
    //    obviously right big object this world could possibly have.
    for (let t = 0; t < 4000 && bigTrees < 150; t++) {
      const wx = mr(LO, HI), wy = mr(LO, HI);
      const r3 = mr(4.2, 5.4);
      if (!maplePlaceable(wx, wy, r3)) continue;
      if (!MS.spotFree(wx, wy, r3 * 20)) continue;
      MS.claimSpot(wx, wy, r3 * 20);
      const g = new THREE.Group();
      const inner = mchance(0.72) ? MS.makeMapleTree() : makePine();
      const k = r3 / 2.6;                       // grown from the ordinary one
      inner.scale.setScalar(k);
      g.add(inner);
      place(g, w(wx), w(wy), r3);
      bigTrees++;
    }
    // 3. THE OUTBUILDINGS. Barns, silos and a grain elevator on the outskirts,
    //    which the prop kit already had and the world was not using. These are
    //    the 5-to-7 rung: the thing a COLOSSUS drives across town FOR.
    for (let t = 0; t < 2600 && outbuildings < 46; t++) {
      const wx = mr(LO, HI), wy = mr(LO, HI);
      // outskirts only — a silo on the town green is a different game
      const d = Math.hypot(wx - 6000, wy - 6000);
      if (d < 2600) continue;
      const roll = mrnd();
      const [m, r3] = roll < 0.44 ? [MS.makeBarn(), 5.2]
        : roll < 0.72 ? [MS.makeSilo(), 4.4]
        : roll < 0.88 ? [MS.makeWaterTower(), 5.0]
        : [MS.makeGrainElevator(), 6.4] as [THREE.Object3D, number];
      if (!maplePlaceable(wx, wy, r3)) continue;
      if (!MS.spotFree(wx, wy, r3 * 20)) continue;
      MS.claimSpot(wx, wy, r3 * 20);
      place(m, w(wx), w(wy), r3);
      outbuildings++;
    }
    console.info(`[maple] country fill: ${filled} verge props, ${bigTrees} mature trees, ${outbuildings} outbuildings`);
  }

  await breathe('Growing the wildflowers…');
  // ── the coast fringe ──────────────────────────────────────────────────────
  // The band between the block grid and the cliff. North and west it is scrub
  // and boulders, east it is pine, south it is the lake shore.
  for (let i = 0; i < SIL3_FRINGE.length; i += 3) {
    const [fx2, fz2] = SIL3_FRINGE[i];
    const x = fx2 * 0.9, z = fz2 * 0.9;
    if (!insideIsland3(x, z) || inLagoon3(x, z, 60)) continue;
    if (ROAD_CENTERS_3D_LOCAL.some((rc2) => Math.abs(x - rc2) < 9 || Math.abs(z - rc2) < 9)) continue;
    if (z > 150) { if (mchance(0.55)) place(MS.makeMapleTree(), x, z, 2.6); else place(makeBush(), x, z, 1.4); }
    else if (x > 150) place(mchance(0.6) ? makePine() : makeRocksFB(), x, z, mchance(0.7) ? 3 : 2.2);
    else if (mchance(0.45)) place(makeRocksFB(), x, z, 2.2);
    else if (mchance(0.5)) place(MS.makeMapleTree(), x, z, 2.6);
    else place(makeFlowers(), x, z, 0.8);
  }

  // ── THE OPENING ───────────────────────────────────────────────────────────
  // The match begins on the square's west walk, looking across the green at
  // the town hall with Main Street's shopfronts behind. Hand-place the first
  // twenty seconds of food: a ring of easy snacks on the grass either side of
  // the walk, close enough that a brand-new speck eats five things before it
  // has finished working out which way is up.
  {
    const [sx0, sz0] = [w(MAPLE_SPAWN[0]), w(MAPLE_SPAWN[1])];
    let si = 0;
    for (let ring = 0; ring < 3; ring++) {
      const rr = 3.2 + ring * 3.4, n = 5 + ring * 3;
      for (let k = 0; k < n; k++, si++) {
        const a = (k / n) * Math.PI * 2 + ring * 0.35;
        const x = sx0 + Math.cos(a) * rr, z = sz0 + Math.sin(a) * rr;
        if (!insideIsland3(x, z)) continue;
        if (ROAD_CENTERS_3D_LOCAL.some((rc2) => Math.abs(x - rc2) < 4 || Math.abs(z - rc2) < 4)) continue;
        // the opening frame is hand-authored, so it does not get the generic
        // tiny-prop pool — that is where the traffic cones in the town square
        // were coming from. And the signs here follow the square's own side.
        const tiny = si % 5 === 0 ? makeCoins()
          : si % 3 === 0 ? MS.makeLawnSign(mchance(0.45) ? 1 : 0)
          : mpick([makeFlowers, makeFlowers, MS.makePlanter, MS.makeNewsBox, makeBush])();
        place(tiny, x, z, si % 5 === 0 ? 0.55 : mr(0.6, 0.8));
      }
    }
  }

  if (lmFail) console.warn(`[maple] ${lmFail} landmark site(s) rejected: ${lmRejects.join(', ')}`);
  if (dropSkip) console.info(`[maple] ${dropSkip} scatter/row site(s) declined (water, coast or road band)`);

  // exactly ONE hot-air balloon in the sky — animated from createIsland's update
  spawnBalloon(scene);
}

// cheap island-membership check (bounding blob) for road-edge scatter
function inIslandApprox(x3: number, z3: number): boolean {
  return Math.hypot(x3 / 285, z3 / 300) < 0.96;
}
