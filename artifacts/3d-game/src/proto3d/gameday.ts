// ══ GAME DAY — the plateau's real geometry ════════════════════════════════
// Maple Isle is a blob on a road grid; Pirate Bay is a hooked headland round a
// lagoon. GAME DAY is neither: a broad flat PLATEAU with nothing around it but
// woodland. There is no sea here, so there is no water polygon — the edge of
// the tarmac and grass IS the edge of the world, and off it is out of bounds
// exactly the way the sea is in bay.ts.
//
// The silhouette has to be readable from directly overhead in the first second
// of a match, because the whole level is one sightline: the player spawns in
// THE TAILGATE and looks north at THE STADIUM. So the shape is deliberately
// lopsided — a bowl-shaped lobe bulging north, a shoulder stepping out east
// for OLD CAMPUS, and a wide apron spreading south for the lot. A circle would
// have read as Maple Isle with the colours changed.
//
// All coordinates are WORLD units (0..12000, centre 6000) — the same space
// Maple Isle and Pirate Bay use, so the shared world->3D scale still applies
// (world = 3D × 20; a prop with a 3D eat radius of 10 is 200 world units wide).
//
// See docs/GAMEDAY.md for the district table this file implements. The names
// and densities below are copied from it verbatim; do not retune them here.

// None of these eight are about Pirate Bay. Four are plain geometry — even-odd
// point-in-polygon, the midpoint-quadratic smoother the renderer draws with,
// point-to-polyline distance, arc-length sampling — and four are the coarse
// spatial hash that stops two scatter passes burying props in each other. They
// live in bay.ts only because that world was written first.
// Do NOT fork them. A second copy of smoothPoly is how the ground and the
// coastline came to disagree at every bend on Maple Isle, and the hash has to
// be one shared table or a prop claimed by the lot would not block a prop
// scattered by the woods. Only one world is loaded at a time, so resetPlacement
// clearing the same map for both is correct rather than a leak.
import {
  pointInPoly, smoothPoly, distToPath, pathPointAt,
  spotFree, spotOpen, claimSpot, resetPlacement,
} from './bay';
export { pointInPoly, smoothPoly, distToPath, pathPointAt, spotFree, spotOpen, claimSpot, resetPlacement };

export type Pt = [number, number];

// ── the plateau ───────────────────────────────────────────────────────────
// Walked clockwise from the north-west flank of the stadium lobe. North is -y,
// which is the convention bay.ts set and life.ts already assumes.
//
// Four things are load-bearing in this outline and should survive any edit:
//   • the north lobe (rows 1-6) is 4.0k wide at y=1600, because the bowl, its
//     concourse ring AND the tree line behind the north stand all live up
//     there. The first pass was 300 narrower and the stadium's own district
//     came out 7% inside the woods;
//   • the step out east at 9020..10620 is what makes OLD CAMPUS a shoulder
//     rather than a bite out of the side;
//   • the kink at [1990,3430] throws the west flank 120 out and stops it
//     reading as one straight run from the practice field down to RV Row;
//   • the south apron is wide and slightly ragged — 5.6k across at y=10200
//     and still 5.0k at y=10500, which is what lets THE TAILGATE be the
//     biggest district on the plateau.
export const GD_LAND: Pt[] = [
  [3450, 2430], [3810, 1600], [4750, 1050], [5850, 780], [6950, 950],
  [7830, 1430], [8380, 2280], [8520, 3060],
  [9020, 3380], [9750, 3750], [10400, 4350], [10620, 5300], [10450, 6250],
  [9900, 7050], [9420, 7750], [9560, 8550], [9380, 9330], [8620, 9980],
  [8950, 10420], [8100, 10850], [6900, 10980], [5500, 10920], [4200, 10720],
  [3180, 10260], [2470, 9650], [1960, 8850], [1660, 7850], [1520, 6800],
  [1500, 5800], [1790, 4950], [2110, 4290], [1990, 3430], [2600, 2850],
  [2960, 2620],
];

// The control points above are corners; the renderer draws the smoothed curve,
// so every containment test has to use the smoothed ring or props sited near a
// bend hang in mid-air. Measured: the smoother cuts up to 141 units off the
// sharpest corner here (the south-east nub at [8950,10420]), so nothing derived
// from the plateau's shape may be derived from the raw control points.
export const GD_LAND_SMOOTH = smoothPoly(GD_LAND, 6);
export const GD_LAND_RING: Pt[] = [...GD_LAND_SMOOTH, GD_LAND_SMOOTH[0]];

/** Distance to the tree line. Used to thin the woods out towards the rim. */
export const distToEdge = (x: number, y: number): number => distToPath(x, y, GD_LAND_RING);

// ── the bowl ──────────────────────────────────────────────────────────────
// Several callers need this: the stadium mesh itself, the concourse, the crowd
// heading (everyone faces it), and the camera framing on spawn. cy sits at
// 3200 rather than in the middle of the lobe so that the north stand's outer
// edge lands at 2020, leaving 1190 of concourse and woodland between it and the
// plateau's north tip at 833 — the stand needs trees behind it, not a cliff.
export const STADIUM = { cx: 5930, cy: 3200, rx: 1520, ry: 1180 };

// THE CONCOURSE — the ring road/walkway that circles the bowl. Closed: the
// last point repeats the first, because distToPath() walks a polyline and
// without the repeat there is a 609-unit hole in the ring due east of the bowl
// where the two ends fail to meet.
// Radii are 1900 × 1520. Measured, the tightest node sits at 1.25× the stand
// ellipse — about 300 of clear ground, one concourse width plus a merch stand.
// The southern nodes are pushed ~80 further out: that arc is where GATE PLAZA
// meets it and it is the only part of the ring the player crosses at speed.
export const CONCOURSE: Pt[] = [
  [7830, 3200], [7690, 3790], [7280, 4275], [6660, 4640], [5930, 4800],
  [5200, 4640], [4580, 4275], [4170, 3790], [4030, 3200], [4190, 2620],
  [4600, 2140], [5190, 1810], [5930, 1690], [6670, 1810], [7270, 2140],
  [7680, 2610], [7830, 3200],
];
// 170 gives a 17-unit-wide walkway in 3D — the same call bay.ts made for its
// boardwalk after 300 produced something wider than a WORLD ENDER.
export const CONCOURSE_HALF = 170;

// ── districts ─────────────────────────────────────────────────────────────
export type GdBiome = 'bowl' | 'plaza' | 'lot' | 'rvpark' | 'greek' | 'campus' | 'practice' | 'woods';

export interface GdRegion { id: GdBiome; name: string; poly: Pt[]; density: number; }

/** Move every vertex of a closed polygon `w` units toward the interior, along
 *  the angle bisector, mitre clamped at ~2.4×w so a sharp corner cannot throw a
 *  spike across the shape. Which way is "interior" is read off the signed area,
 *  so the caller does not have to know which way round the outline runs. */
export function insetPoly(poly: Pt[], w: number): Pt[] {
  const n = poly.length;
  let area2 = 0;
  for (let i = 0, j = n - 1; i < n; j = i++) area2 += poly[j][0] * poly[i][1] - poly[i][0] * poly[j][1];
  const s = area2 > 0 ? 1 : -1;                    // picks the normal that points into the shape
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const p = poly[i], a = poly[(i - 1 + n) % n], b = poly[(i + 1) % n];
    const e0x = p[0] - a[0], e0y = p[1] - a[1], l0 = Math.hypot(e0x, e0y) || 1;
    const e1x = b[0] - p[0], e1y = b[1] - p[1], l1 = Math.hypot(e1x, e1y) || 1;
    const n0x = -s * e0y / l0, n0y = s * e0x / l0;
    const n1x = -s * e1y / l1, n1y = s * e1x / l1;
    let bx = n0x + n1x, by = n0y + n1y;
    const bl = Math.hypot(bx, by) || 1; bx /= bl; by /= bl;
    const m = w / Math.max(0.42, bx * n0x + by * n0y);
    out.push([p[0] + bx * m, p[1] + by * m]);
  }
  return out;
}

// THE TREE LINE is the plateau's own edge walked inward, not a hand-authored
// polygon. Hand-authoring the rim would invite the exact bug bay.ts records
// twice in its comments — a district sited 72% off the land and another 97% —
// because the rim is where that mistake is cheapest to make. Deriving it means
// the band cannot leave the plateau however the outline is later reshaped.
//
// A TRUE inward offset, not a scaled copy of the outline. Scaling was tried
// first and is wrong for a lobed shape: a 0.83 copy sat 640 units in behind the
// north stand but cut 300 units DEEPER across the stadium lobe's shoulders,
// where the radial ray leaves the plateau a long way off. Districts came out
// 7-22% inside the trees and no band width fixed all four at once.
//
// 25 keeps the outer ring a hair off the boundary so a point exactly on the
// coast is not a coin toss. 360 is the band: 18 units deep in 3D, three or four
// ranks of trunks at density 0.5. It is deliberately not deeper — the districts
// need the ground. The woodland still READS deeper than 360 because the fill
// pass bands trees inward with scatterLand(..., [0, 900]); this polygon is only
// the part that answers 'woods' to a district query.
const WOODS_OUT = insetPoly(GD_LAND_SMOOTH, 25);
const WOODS_IN = insetPoly(GD_LAND_SMOOTH, 385);
// A C, not a true annulus: the ring is cut open between the last smoothed point
// and the first, which drops one 151-unit step of rim on the north-west flank.
// That wedge still answers 'woods' because gdRegionAt falls through to it, so
// the seam is invisible; a zero-width slit would have been invisible too but
// would sit one float away from breaking the even-odd test.
const WOODS_POLY: Pt[] = [...WOODS_OUT, ...WOODS_IN.slice().reverse()];

// Districts TILE. Every internal boundary below is shared vertex-for-vertex
// with its neighbour — the bowl's south arc is literally the plaza's north
// edge, the lot's east edge is literally Frat Row's west edge — so there is no
// overlap to resolve and no seam of un-districted ground between them.
//
// Measured on a 25-unit grid over the whole plateau (69.0 M square world
// units): every district is 100.00% inside the smoothed land, no two districts
// overlap by as much as 0.05%, and 88.8% of the plateau is inside some district
// polygon. The remaining 11.2% is the slack ring between the built districts
// and the tree line — the rough grass where the mown ground gives out — and
// gdRegionAt answers 'woods' there, which is what it looks like.
export const GD_REGIONS: GdRegion[] = [
  // THE BIGGEST MEAL IN THE GAME. The polygon is a dodecagon around the bowl
  // that also swallows the concourse ring, because a player eating the stadium
  // should be eating the ring road under it at the same time — leaving the
  // concourse in a neighbouring district put a rind of surviving tarmac around
  // the crater in the first pass.
  { id: 'bowl', name: 'THE STADIUM', density: 0.7,
    poly: [[5930, 1420], [6990, 1610], [7830, 2170], [8020, 3220], [7830, 4230], [6990, 4790],
           [5930, 4980], [4870, 4790], [4030, 4230], [3790, 3200], [4030, 2170], [4870, 1610]] },
  // GATE PLAZA takes the bowl's whole south arc as its north edge, so the
  // queues genuinely lead somewhere. Densest thing in the level after the lot.
  { id: 'plaza', name: 'GATE PLAZA', density: 1.3,
    poly: [[4030, 4230], [4870, 4790], [5930, 4980], [6990, 4790], [7830, 4230],
           [8050, 5000], [7850, 6050], [6000, 6350], [4200, 6100], [3900, 5100]] },
  // THE TAILGATE. The hero district and the spawn, so it gets the most ground
  // of anything on the plateau: 13.8M square world units against the bowl's
  // 12.0M. Its north edge dips to 6350 in the middle, which is what puts the
  // gate plaza on the horizon dead ahead when the player looks up the sightline.
  { id: 'lot', name: 'THE TAILGATE', density: 1.4,
    poly: [[4200, 6100], [6000, 6350], [7850, 6050], [8000, 7000], [7800, 8200], [7300, 9400],
           [7050, 10120], [6000, 10430], [4950, 10250], [4450, 10100],
           [4700, 9500], [4100, 8300], [3950, 7100]] },
  // RV ROW is west of the lot and shares its whole west edge. Motorhomes are
  // long, so the district is deeper north-to-south than it is wide.
  { id: 'rvpark', name: 'RV ROW', density: 1.1,
    poly: [[4200, 6100], [3950, 7100], [4100, 8300], [4700, 9500], [4450, 10100], [3450, 9880],
           [2950, 9400], [2450, 8750], [2350, 7000], [2700, 6000], [3400, 5700]] },
  // FRAT ROW sits between the lot and the south-east nub, sharing the lot's
  // east edge — the houses face west across the parked cars, not out at the
  // trees, which is the only orientation that reads.
  { id: 'greek', name: 'FRAT ROW', density: 1.0,
    poly: [[8000, 7000], [7800, 8200], [7300, 9400], [7050, 10120], [7750, 10200], [8200, 9700],
           [8560, 9500], [9000, 8800], [8900, 7900], [8700, 7100]] },
  // OLD CAMPUS is the east shoulder. It touches the bowl, the plaza and Frat
  // Row, so a player can walk brick halls to gates to houses without crossing
  // undressed ground.
  { id: 'campus', name: 'OLD CAMPUS', density: 0.9,
    poly: [[8020, 3220], [8700, 3720], [9440, 4180], [9800, 4900], [9650, 5900], [9200, 6700],
           [8700, 7100], [8000, 7000], [7850, 6050], [8050, 5000], [7830, 4230]] },
  // PRACTICE FIELD fills the west flank between the bowl and RV Row. Lowest
  // density of the built districts by design: goalposts and sleds on grass are
  // the visual rest between the concourse and the motorhomes.
  { id: 'practice', name: 'PRACTICE FIELD', density: 0.8,
    poly: [[4030, 2170], [3790, 3200], [4030, 4230], [3900, 5100], [3400, 5700], [2700, 6000],
           [2450, 5200], [2560, 4320], [2750, 3400], [3420, 2900], [3830, 2620]] },
  // THE TREE LINE, derived above. Listed last so gdRegionAt's linear scan hits
  // the built districts first and only falls back to the rim.
  { id: 'woods', name: 'THE TREE LINE', density: 0.5, poly: WOODS_POLY },
];

// ── the tailgate lot ──────────────────────────────────────────────────────
// A row is a centreline segment `a`→`b` with a heading. Vehicles go nose-to-
// tail ALONG it at `pitch` spacing, which is how a field-parked lot actually
// looks from above — not nose-in like a supermarket car park, which would have
// made the whole apron read as stripes.
//
// The numbers, in world units (÷20 for 3D):
//   LOT_PITCH 165     a pickup is ~120 long, so 45 units of bumper gap. Every
//                     row carries its own pitch as well, 158..175, so the lot
//                     does not come out metronomic; this is only the default.
//   LOT_ROW_HALF 60   the parked strip itself, one vehicle wide.
//   LOT_AISLE 340     centreline to centreline. 120 of that is metal and the
//                     remaining 220 is THE PARTY: canopies, grills, cornhole,
//                     folding chairs. The aisle is not spare room, it is the
//                     district — sizing it off the vehicles alone gave a lot
//                     that was nose-to-tail and completely lifeless between.
// Ends are measured against the lot polygon and inset ~130 so nothing pokes out
// of the tarmac. Rows shorten towards the south because the apron narrows.
export interface GdLotRow { a: Pt; b: Pt; ang: number; pitch: number; }

export const LOT_ROW_HALF = 60;
export const LOT_AISLE = 340;
export const LOT_PITCH = 165;

// Headings alternate 0 / π down the lot. Real rows park back-to-back, and a
// lot where every truck pointed the same way looked like a car transporter.
// Eleven rows at these lengths yield 204 vehicles, all of them measured inside
// the district polygon — the rows are what makes the apron dense, so if the lot
// ever reads empty the answer is more rows, not bigger props.
export const LOT_ROWS: GdLotRow[] = [
  { a: [4210, 6600], b: [7810, 6600], ang: 0, pitch: 165 },
  { a: [4120, 6940], b: [7860, 6940], ang: Math.PI, pitch: 172 },
  { a: [4100, 7280], b: [7820, 7280], ang: 0, pitch: 160 },
  { a: [4140, 7620], b: [7770, 7620], ang: Math.PI, pitch: 168 },
  { a: [4180, 7960], b: [7730, 7960], ang: 0, pitch: 165 },
  { a: [4230, 8300], b: [7690, 8300], ang: Math.PI, pitch: 158 },
  { a: [4400, 8640], b: [7490, 8640], ang: 0, pitch: 170 },
  { a: [4570, 8980], b: [7390, 8980], ang: Math.PI, pitch: 165 },
  { a: [4740, 9320], b: [7200, 9320], ang: 0, pitch: 162 },
  { a: [4740, 9660], b: [7080, 9660], ang: Math.PI, pitch: 168 },
  // the last row against the south fence, where the overflow ends up
  { a: [4620, 10000], b: [6940, 10000], ang: 0, pitch: 175 },
];

/** Every parking slot in the lot, west to east along each row.
 *  `jitter` (world units) nudges each vehicle off the exact centreline —
 *  a perfectly straight row of identical spacing reads as a fence, not a lot. */
export function lotSlots(rnd: () => number, jitter = 26): { x: number; y: number; ang: number }[] {
  const out: { x: number; y: number; ang: number }[] = [];
  for (const row of LOT_ROWS) {
    const dx = row.b[0] - row.a[0], dy = row.b[1] - row.a[1];
    const len = Math.hypot(dx, dy);
    const n = Math.floor(len / row.pitch);
    if (n < 1) continue;
    // centre the run in the row so both ends get the same margin
    const start = (len - (n - 1) * row.pitch) / 2;
    const ux = dx / len, uy = dy / len;
    for (let i = 0; i < n; i++) {
      const d = start + i * row.pitch;
      out.push({
        x: row.a[0] + ux * d + (rnd() - 0.5) * jitter,
        y: row.a[1] + uy * d + (rnd() - 0.5) * jitter * 2,   // more slop across the row than along it
        ang: row.ang + (rnd() - 0.5) * 0.09,
      });
    }
  }
  return out;
}

// SPAWN. 170 clear of the nearest row centreline, i.e. the middle of the aisle
// between the 8640 and 8980 rows, so the player opens inside the party rather
// than under a truck. x=5950 is within 20 units of the bowl's centre line, so
// "face north" and "face the stadium" are the same instruction: walking due
// north from here crosses THE TAILGATE, then GATE PLAZA, then THE STADIUM, with
// nothing else in the way.
export const GD_SPAWN: Pt = [5950, 8810];

/** Bearing from (wx,wy) to the bowl. The one thing that makes this level look
 *  different from every other: the crowd has a DIRECTION. Everything that can
 *  face something — people, camp chairs, canopies, flags — faces this. */
export const gdFacingStadium = (wx: number, wy: number): number =>
  Math.atan2(STADIUM.cy - wy, STADIUM.cx - wx);

// ── the world queries island.ts asks ──────────────────────────────────────
export const onGameDayLand = (wx: number, wy: number): boolean => pointInPoly(wx, wy, GD_LAND_SMOOTH);

export function gdRegionAt(wx: number, wy: number): GdBiome | null {
  if (!onGameDayLand(wx, wy)) return null;
  for (const r of GD_REGIONS) if (pointInPoly(wx, wy, r.poly)) return r.id;
  return 'woods';   // the rim, and the seams between districts
}

/** Inside the bowl — the stands and the pitch. The stadium is one authored
 *  prop, so this is the "is it in the water" test of this world: nothing that
 *  scatters may land here. */
export const inStadium = (wx: number, wy: number): boolean => {
  const dx = (wx - STADIUM.cx) / STADIUM.rx, dy = (wy - STADIUM.cy) / STADIUM.ry;
  return dx * dx + dy * dy <= 1;
};

/** Somewhere a prop may legally stand: on the plateau, out of the bowl, off the
 *  concourse. There is no second path network here — the lot's aisles are
 *  dressed from LOT_ROWS rather than carved out of the ground — so it is three
 *  tests, and the bowl is one of them because THE STADIUM's district polygon
 *  covers the whole ring and a region scatter would otherwise pitch tents on
 *  the halfway line. */
export function gdPlaceable(wx: number, wy: number, clear = 40): boolean {
  if (!onGameDayLand(wx, wy)) return false;
  if (inStadium(wx, wy)) return false;
  if (distToPath(wx, wy, CONCOURSE) < CONCOURSE_HALF + clear) return false;
  return true;
}

// ── scatter ───────────────────────────────────────────────────────────────
// Same contract as bay.ts's: rejection sampling with the shared placement hash
// doing overlap rejection, because the alternative is 125 pairs of half-buried
// props again. `sep` is the prop's 3D eat radius; the hash works in world units.
export interface GdScatterOpts {
  /** the prop's 3D edible radius — enables overlap rejection when set */
  sep?: number;
  /** districts this prop may NOT land in (goalposts do not belong in the lot) */
  avoid?: GdBiome[];
}
const passes = (x: number, y: number, o?: GdScatterOpts): boolean => {
  if (o?.avoid?.length) { const d = gdRegionAt(x, y); if (d && o.avoid.includes(d)) return false; }
  if (o?.sep !== undefined && !spotFree(x, y, o.sep * 20)) return false;
  return true;
};
const take = (x: number, y: number, o?: GdScatterOpts): void => {
  if (o?.sep !== undefined) claimSpot(x, y, o.sep * 20);
};

const bbox = (poly: Pt[]): [number, number, number, number] => {
  let a = Infinity, b = -Infinity, c = Infinity, d = -Infinity;
  for (const [x, y] of poly) { a = Math.min(a, x); b = Math.max(b, x); c = Math.min(c, y); d = Math.max(d, y); }
  return [a, b, c, d];
};
const LAND_BOX = bbox(GD_LAND_SMOOTH);

/** N legal points inside a district. */
export function scatterInRegion(r: GdRegion, n: number, rnd: () => number, clear = 40, o?: GdScatterOpts): Pt[] {
  const [minX, maxX, minY, maxY] = bbox(r.poly);
  const out: Pt[] = [];
  for (let tries = 0; tries < n * 60 && out.length < n; tries++) {
    const x = minX + rnd() * (maxX - minX), y = minY + rnd() * (maxY - minY);
    if (!pointInPoly(x, y, r.poly)) continue;
    if (!gdPlaceable(x, y, clear)) continue;
    if (!passes(x, y, o)) continue;
    take(x, y, o);
    out.push([x, y]);
  }
  return out;
}

/** N legal points anywhere on the plateau. `band` filters on distance to the
 *  tree line, so "in among the trees" or "well inside" needs no polygon. */
export function scatterLand(n: number, rnd: () => number, clear = 40, band?: [number, number], o?: GdScatterOpts): Pt[] {
  const [minX, maxX, minY, maxY] = LAND_BOX;
  const out: Pt[] = [];
  for (let tries = 0; tries < n * 90 && out.length < n; tries++) {
    const x = minX + rnd() * (maxX - minX), y = minY + rnd() * (maxY - minY);
    if (!gdPlaceable(x, y, clear)) continue;
    if (band) { const d = distToEdge(x, y); if (d < band[0] || d > band[1]) continue; }
    if (!passes(x, y, o)) continue;
    take(x, y, o);
    out.push([x, y]);
  }
  return out;
}

/** A clump around a point — a knot of tents, a stand of maples. */
export function clusterAt(cx: number, cy: number, n: number, radius: number, rnd: () => number,
                          clear = 30, o?: GdScatterOpts): Pt[] {
  const out: Pt[] = [];
  for (let tries = 0; tries < n * 40 && out.length < n; tries++) {
    const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * radius;
    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
    if (!gdPlaceable(x, y, clear)) continue;
    if (!passes(x, y, o)) continue;
    take(x, y, o);
    out.push([x, y]);
  }
  return out;
}
