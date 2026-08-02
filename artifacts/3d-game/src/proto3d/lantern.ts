// ── LANTERN NIGHT ──────────────────────────────────────────────────────────
// A spirit night market, the one night a year it opens. Same contract as
// gameday.ts: a land polygon, districts, a spawn, and the placement queries
// island.ts asks. World units throughout — island.ts scales by 0.05, so 20
// world units is one 3D unit and a 6,000-unit district is 300 across in play.
//
// WHAT IS DIFFERENT ABOUT THIS PLACE, AND WHY THE SHAPE IS WHAT IT IS
// -------------------------------------------------------------------
// The other three worlds are BLOBS: you spawn somewhere in the middle and the
// landmark is over there. This one is a VALLEY with a direction. You open at
// the great gate in the south, the market street runs away from you due north
// with the canal beside it, and the bathhouse stands lit at the top of a stair
// at the far end. That sightline is the whole level — the first frame of the
// match is a corridor of hanging lanterns receding to a glowing building, and
// every subsequent minute is spent walking up it.
//
// It is also the only landmark in the game the player approaches from BELOW.
//
// THE CANAL IS WALKABLE, AND THAT IS DELIBERATE.
// The obvious build makes the canal water and the bridges the only crossings.
// Do not. The player's containment test needs biomeAt() truthy AND eight
// probes of insideIsland3() at up to seven units of margin; a water channel
// through the middle of the map would cut the legal set in two along its whole
// length, and a WORLD ENDER would be walled out of half the level with nothing
// drawn to explain it. The canal here is a shallow festival channel, ankle-deep
// on a spirit — walkable ground that is painted as water. It reads beautifully
// (a hole rolling down a canal, draining it) and it cannot produce an invisible
// wall, because there is no boundary in it to produce one.
// The geometry primitives and the shared placement hash live in bay.ts, only
// because that world was written first. Do NOT fork them: one shared table is
// what stops a prop claimed by the market from being buried by one scattered
// into the garden, and a second copy of smoothPoly is how Maple Isle's ground
// and coastline came to disagree at every bend.
import {
  pointInPoly, smoothPoly, distToPath, pathPointAt,
  spotFree, spotOpen, claimSpot, resetPlacement,
} from './bay';

export { pointInPoly, smoothPoly, distToPath, pathPointAt, spotFree, spotOpen, claimSpot, resetPlacement };

export type Pt = [number, number];

// ── the valley floor ───────────────────────────────────────────────────────
// Walked clockwise from the south-west shoulder of the gate plaza. North is -y.
// Three things are load-bearing:
//   • the south end (y ≈ 10400) is wide and squared off — that is the gate
//     apron, and the establishing shot needs floor either side of the torii or
//     the arch reads as sitting on a cliff;
//   • the waist at y ≈ 6000 pinches to 4.2k. The market is a STREET, and a
//     street needs walls; the ground narrowing is what makes the lantern rows
//     converge on the bathhouse instead of fanning out into a field;
//   • the north lobe swells again to 5.0k so the bathhouse terrace, its stair
//     and the garden behind it all fit above the waist without the building
//     overhanging the drop.
export const LN_LAND: Pt[] = [
  [3980, 2360], [4520, 1520], [5450, 1080], [6480, 940], [7500, 1180],
  [8280, 1780], [8720, 2620], [8840, 3450],
  [8600, 4200], [8180, 4820], [8060, 5500], [8120, 6100],
  [8480, 6800], [8900, 7500], [9080, 8300], [8940, 9150],
  [8600, 9900], [7900, 10450], [6900, 10760], [5800, 10820], [4750, 10600],
  [3900, 10120], [3380, 9420], [3180, 8600], [3300, 7800],
  [3720, 7050], [4060, 6350], [4020, 5700], [3760, 5050],
  [3480, 4300], [3520, 3400], [3720, 2780],
];

export const LN_LAND_SMOOTH = smoothPoly(LN_LAND, 6);
export const LN_LAND_RING: Pt[] = [...LN_LAND_SMOOTH, LN_LAND_SMOOTH[0]];

/** Distance to the valley wall. Thins the bamboo out toward the rim. */
export const distToEdge = (x: number, y: number): number => distToPath(x, y, LN_LAND_RING);

// ── the bathhouse ──────────────────────────────────────────────────────────
// The finale, and the thing everything faces. It sits high in the north lobe
// with its back to the valley wall, so the stair below it is the only approach
// and the player spends the match climbing toward a lit window.
export const BATHHOUSE = { cx: 6280, cy: 2500, rx: 1180, ry: 900 };

/** The bathhouse MESH's footprint as a fraction of the precinct ellipse above.
 *  Two different numbers for two different jobs, exactly as GAME DAY learned
 *  the hard way: the precinct is the ground the building and its terrace own,
 *  the mesh factor is the building. Conflating them there painted a pitch 2.6x
 *  the stadium; here it would put the terrace decking out over open air. */
export const BATHHOUSE_MESH_K = 0.42;

export const inBathhouse = (wx: number, wy: number): boolean => {
  const k = BATHHOUSE_MESH_K * 1.10;
  const dx = (wx - BATHHOUSE.cx) / (BATHHOUSE.rx * k), dy = (wy - BATHHOUSE.cy) / (BATHHOUSE.ry * k);
  return dx * dx + dy * dy <= 1;
};

// ── the canal ──────────────────────────────────────────────────────────────
// A polyline from the gate pool in the south to the bathhouse spillway in the
// north, bending twice so the market street never runs dead straight — a
// straight canal photographs as a road with a blue stripe on it.
export const CANAL: Pt[] = [
  [6320, 10280], [6180, 9500], [6260, 8700], [6520, 7950], [6480, 7200],
  [6180, 6550], [6120, 5900], [6320, 5250], [6480, 4600], [6380, 3950],
  [6300, 3350], [6280, 2900],
];
/** Half-width. 150 gives a 15-unit channel in 3D — wide enough to drive a
 *  WORLD ENDER down, narrow enough that the stalls on both banks stay in the
 *  same frame. */
export const CANAL_HALF = 150;
export const distToCanal = (x: number, y: number): number => distToPath(x, y, CANAL);

// ── the market street ──────────────────────────────────────────────────────
// Runs parallel to the canal on the EAST bank. The stalls face west across the
// water, so the lantern strings span the channel and the player drives under
// them. This is the sightline the whole level is built around.
export const MARKET: Pt[] = [
  [6820, 10200], [6690, 9450], [6770, 8680], [7030, 7940], [6990, 7190],
  [6690, 6540], [6630, 5890], [6830, 5240], [6990, 4590], [6890, 3940],
  [6810, 3340],
];
export const MARKET_HALF = 190;

// ── districts ──────────────────────────────────────────────────────────────
export type LnBiome = 'gate' | 'stalls' | 'canal' | 'teahouse' | 'shrine'
  | 'bridge' | 'garden' | 'bathhouse' | 'bamboo';

export interface LnRegion { id: LnBiome; name: string; poly: Pt[]; density: number; }

export const LN_REGIONS: LnRegion[] = [
  // THE CANAL — FIRST, so it owns its own channel. See the note above the
  // polygon. Walkable ground painted as water; the head of this file explains
  // why it must not be a real barrier.
  { id: 'canal', name: 'THE CANAL', density: 0.5,
    poly: [[6320, 10280], [6470, 9500], [6560, 8700], [6820, 7950], [6780, 7200],
           [6480, 6550], [6420, 5900], [6620, 5250], [6780, 4600], [6680, 3950],
           [6600, 3350], [6580, 2900],
           [5980, 2900], [6000, 3350], [6080, 3950], [6180, 4600],
           [6020, 5250], [5820, 5900], [5880, 6550], [6180, 7200],
           [6220, 7950], [5960, 8700], [5880, 9500], [6020, 10280]] },

  // THE BATHHOUSE. The biggest meal in the level, and like GAME DAY's bowl its
  // polygon swallows the terrace and the stair head as well — a player eating
  // the building should be taking the deck out from under it, not leaving a
  // rind of surviving veranda around the crater.
  { id: 'bathhouse', name: 'THE BATHHOUSE', density: 0.8,
    poly: [[6280, 1400], [7180, 1620], [7760, 2180], [7880, 2960], [7560, 3620],
           [6900, 3960], [6280, 4030], [5660, 3960], [5000, 3620], [4700, 2960],
           [4820, 2180], [5390, 1620]] },

  // THE MOON BRIDGE. A narrow band across the waist, and the only district that
  // spans the canal — it is the level's midpoint and its one pinch, so the
  // fourth match beat lands here.
  { id: 'bridge', name: 'THE MOON BRIDGE', density: 1.0,
    poly: [[4700, 5450], [5600, 5300], [6300, 5250], [7000, 5320], [7700, 5480],
           [7780, 6180], [7050, 6330], [6300, 6380], [5560, 6300], [4820, 6150]] },

  // LANTERN ROW. The hero district and the densest thing in the game: the
  // market street plus both banks, from the gate up to the bridge. Everything
  // that makes this level look like itself is in here.
  { id: 'stalls', name: 'LANTERN ROW', density: 1.5,
    poly: [[5200, 6300], [6300, 6380], [7050, 6330], [7780, 6180], [7920, 7100],
           [7620, 8000], [7480, 8900], [7560, 9700], [7100, 10200],
           [6300, 10380], [5500, 10250], [5150, 9600], [5300, 8700],
           [5080, 7800], [5060, 7000]] },

  // THE GREAT GATE. The spawn apron. Wide, stone-flagged and almost empty by
  // design — a child's first three seconds should be legible, and the level's
  // whole sightline is set up from standing here looking north.
  // The south edge is pulled ~140 INSIDE the land control points. Those three
  // vertices were lifted straight off LN_LAND, and the smoother cuts inside the
  // raw outline at every bend — so a district vertex that sits exactly on a
  // control point lands in mid-air. gameday.ts documents the same trap and
  // measured it at up to 141 units; this apron is the widest, flattest run in
  // the level, which is precisely where the cut is largest.
  { id: 'gate', name: 'THE GREAT GATE', density: 0.7,
    poly: [[5150, 9600], [5500, 10250], [6300, 10380], [7100, 10200], [7560, 9700],
           [8000, 9960], [7700, 10380], [6880, 10600], [5820, 10650],
           [4930, 10440], [4460, 9980]] },

  // THE TEAHOUSE TERRACE. East of the market, up three steps: low tables,
  // cushions, hanging lanterns, a view over the stalls. Quieter and richer.
  { id: 'teahouse', name: 'THE TEAHOUSE', density: 1.1,
    poly: [[7780, 6180], [7920, 7100], [7620, 8000], [7480, 8900], [7560, 9700],
           [8100, 10000], [8560, 9500], [8880, 8800], [8960, 8100],
           [8760, 7350], [8380, 6700]] },

  // THE SHRINE STEPS. West bank, opposite the teahouse: a stone stair, a row of
  // small torii, offering boxes and a hundred stone lanterns.
  { id: 'shrine', name: 'THE SHRINE STEPS', density: 1.0,
    poly: [[4820, 6150], [5060, 7000], [5080, 7800], [5300, 8700], [5150, 9600],
           [4460, 9980], [3900, 9500], [3560, 8790], [3470, 8010],
           [3760, 7230], [4060, 6520]] },

  // THE NIGHT GARDEN. Between the bridge and the bathhouse: koi ponds, clipped
  // hedges, a moon-viewing platform. The calm before the top of the level.
  { id: 'garden', name: 'THE NIGHT GARDEN', density: 0.9,
    poly: [[4700, 5450], [5600, 5300], [6300, 5250], [7000, 5320], [7700, 5480],
           [7900, 4800], [7600, 4150], [6900, 3960], [6280, 4030], [5660, 3960],
           [4960, 4150], [4620, 4800]] },
];

// ── spawn ──────────────────────────────────────────────────────────────────
// On the gate apron, dead on the canal's centre line, 400 south of the torii.
// From here "face north" and "face the bathhouse" are the same instruction:
// walking due north crosses THE GREAT GATE, then LANTERN ROW the whole way up,
// then THE MOON BRIDGE, THE NIGHT GARDEN and finally THE BATHHOUSE, with
// nothing else in the way. That is the establishing shot and the match plan in
// one straight line.
export const LN_SPAWN: Pt = [6260, 10120];

/** Bearing from (wx,wy) to the bathhouse. Everything that can face something —
 *  spirits, stall canopies, the lantern strings, the shrine torii — faces this,
 *  which is what gives the street its perspective. */
export const lnFacingBathhouse = (wx: number, wy: number): number =>
  Math.atan2(BATHHOUSE.cy - wy, BATHHOUSE.cx - wx);

// ── the world queries island.ts asks ───────────────────────────────────────
export const onLanternLand = (wx: number, wy: number): boolean => pointInPoly(wx, wy, LN_LAND_SMOOTH);

export function lnRegionAt(wx: number, wy: number): LnBiome | null {
  if (!onLanternLand(wx, wy)) return null;
  for (const r of LN_REGIONS) if (pointInPoly(wx, wy, r.poly)) return r.id;
  return 'bamboo';   // the rim, and the seams between districts
}

/** Somewhere a prop may legally stand: on the valley floor, out of the
 *  bathhouse's own footprint, and off the market street's centre — the street
 *  is dressed from MARKET_STALLS rather than scattered into, or the level's one
 *  clear sightline fills up with furniture. */
export function lnPlaceable(wx: number, wy: number, clear = 40): boolean {
  if (!onLanternLand(wx, wy)) return false;
  if (inBathhouse(wx, wy)) return false;
  if (distToPath(wx, wy, MARKET) < MARKET_HALF + clear) return false;
  return true;
}

// ── the stall rows ─────────────────────────────────────────────────────────
// The market is authored, not scattered: stalls sit shoulder to shoulder down
// the east bank facing the water, because a market is a LINE and rejection
// sampling produces a car boot sale. Each slot carries the bearing it should
// face so the canopies all present to the canal.
export interface LnStallSlot { x: number; y: number; ang: number; side: -1 | 1 }
/** `pitch` is the gap between stall centres in world units — 210 gives a
 *  10.5-unit gap in 3D, about one stall's width, so the row reads as a row
 *  rather than a wall. */
export function stallSlots(rnd: () => number, pitch = 210, jitter = 26): LnStallSlot[] {
  const out: LnStallSlot[] = [];
  // walk the canal, not the market line: the stalls belong to the WATER, and
  // both banks get a row so the player drives down a corridor of them
  let acc = 0;
  for (let i = 0; i < CANAL.length - 1; i++) {
    const [ax, ay] = CANAL[i], [bx, by] = CANAL[i + 1];
    const seg = Math.hypot(bx - ax, by - ay);
    const nx = (bx - ax) / seg, ny = (by - ay) / seg;
    for (let d = acc; d < seg; d += pitch) {
      const t = d / seg;
      const cx = ax + (bx - ax) * t, cy = ay + (by - ay) * t;
      // perpendicular to the channel, one stall on each bank
      for (const side of [-1, 1] as const) {
        const off = (CANAL_HALF + 120) * side;
        const x = cx + -ny * off + (rnd() - 0.5) * jitter;
        const y = cy + nx * off + (rnd() - 0.5) * jitter;
        if (!onLanternLand(x, y)) continue;
        if (inBathhouse(x, y)) continue;
        // face ACROSS the water, which is where the customers are
        out.push({ x, y, ang: Math.atan2(cy - y, cx - x), side });
      }
      acc = d + pitch - seg;
    }
  }
  return out;
}

/** Points down the canal itself, for boats and floating lanterns. `t` runs 0
 *  at the gate pool to 1 at the spillway. */
export function canalPoint(t: number): { x: number; y: number; ang: number } {
  const p = pathPointAt(CANAL, Math.max(0, Math.min(1, t)));
  return p;
}

// ── scatter ────────────────────────────────────────────────────────────────
// Same contract as gameday.ts's: rejection sampling with the shared placement
// hash doing overlap rejection.
export interface LnScatterOpts {
  /** the prop's 3D edible radius — enables overlap rejection when set */
  sep?: number;
  /** districts this prop may NOT land in (a koi pond does not belong in the market) */
  avoid?: LnBiome[];
}
const passes = (x: number, y: number, o?: LnScatterOpts): boolean => {
  if (o?.avoid?.length) { const d = lnRegionAt(x, y); if (d && o.avoid.includes(d)) return false; }
  if (o?.sep !== undefined && !spotFree(x, y, o.sep * 20)) return false;
  return true;
};
const take = (x: number, y: number, o?: LnScatterOpts): void => {
  if (o?.sep !== undefined) claimSpot(x, y, o.sep * 20);
};

const bbox = (poly: Pt[]): [number, number, number, number] => {
  let a = Infinity, b = -Infinity, c = Infinity, d = -Infinity;
  for (const [x, y] of poly) { a = Math.min(a, x); b = Math.max(b, x); c = Math.min(c, y); d = Math.max(d, y); }
  return [a, b, c, d];
};
const LAND_BOX = bbox(LN_LAND_SMOOTH);

/** N legal points inside a district. */
export function scatterInRegion(r: LnRegion, n: number, rnd: () => number, clear = 40, o?: LnScatterOpts): Pt[] {
  const [minX, maxX, minY, maxY] = bbox(r.poly);
  const out: Pt[] = [];
  for (let tries = 0; tries < n * 60 && out.length < n; tries++) {
    const x = minX + rnd() * (maxX - minX), y = minY + rnd() * (maxY - minY);
    if (!pointInPoly(x, y, r.poly)) continue;
    if (!lnPlaceable(x, y, clear)) continue;
    if (!passes(x, y, o)) continue;
    take(x, y, o);
    out.push([x, y]);
  }
  return out;
}

/** N legal points anywhere in the valley. `band` filters on distance to the
 *  valley wall, so "in among the bamboo" needs no polygon. */
export function scatterLand(n: number, rnd: () => number, clear = 40, band?: [number, number], o?: LnScatterOpts): Pt[] {
  const [minX, maxX, minY, maxY] = LAND_BOX;
  const out: Pt[] = [];
  for (let tries = 0; tries < n * 90 && out.length < n; tries++) {
    const x = minX + rnd() * (maxX - minX), y = minY + rnd() * (maxY - minY);
    if (!lnPlaceable(x, y, clear)) continue;
    if (band) { const d = distToEdge(x, y); if (d < band[0] || d > band[1]) continue; }
    if (!passes(x, y, o)) continue;
    take(x, y, o);
    out.push([x, y]);
  }
  return out;
}

/** A clump around a point — a knot of crates, a stand of bamboo. */
export function clusterAt(cx: number, cy: number, n: number, radius: number, rnd: () => number,
                          clear = 30, o?: LnScatterOpts): Pt[] {
  const out: Pt[] = [];
  for (let tries = 0; tries < n * 40 && out.length < n; tries++) {
    const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * radius;
    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
    if (!lnPlaceable(x, y, clear)) continue;
    if (!passes(x, y, o)) continue;
    take(x, y, o);
    out.push([x, y]);
  }
  return out;
}
