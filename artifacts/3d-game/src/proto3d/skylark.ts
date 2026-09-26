// ══════════════════════════════════════════════════════════════════════════
//  BELLCLOUD HEIGHTS (world 6, internal id 'skylark') — the island's geometry
//
//  2026-09-25: the airfield this file describes became BELLCLOUD HEIGHTS, a
//  kingdom on the clouds (docs/BELLCLOUD.md). THE GEOMETRY STAYED, ALL OF IT,
//  and so do the names below — the module, RWY03/09/15, PERIMETER, LAUNCH,
//  the SkBiome ids — because three probes, the crowd's dress codes, the
//  newsroom's district pools and the placement audit are keyed on them. What
//  a child sees is renamed: the live runway 03/21 is THE GRAND AVENUE, the two
//  disused slabs are THE OLD STONE WAYS, the perimeter track is THE RAINBOW
//  RING, and the launch circle is THE BELL PLAZA, where the Great Bell stands
//  on the avenues' crossing. The SK_REGIONS `name` strings carry the new
//  district names. The notes below are the airfield's and say why the shape
//  is what it is; read "runway" as avenue and "whale" as the Great Bell.
//
//  Maple Isle is a fat blob on a road grid. Pirate Bay is a hooked headland
//  round a lagoon. Game Day is a lopsided plateau. Lantern Night is a waisted
//  valley. Powder Pass is a wide oval bowl. Four of those five bulge OUTWARD
//  everywhere, and the fifth bulges outward everywhere except its one hook.
//
//  SKYLARK FIELD is bitten INWARD in three places. Space cuts into this island
//  three times, which no other silhouette in this game allows, and that is the
//  entire first-second read: not a lump — a shape with arms.
//
//  Three arms, three bites, and both sets are load-bearing:
//    • the arms at (6150,1500), (9400,9600) and (2700,9300) each carry a
//      runway threshold, and each stays wide enough out there for a grown
//      WORLD ENDER to turn round;
//    • the bites at (8100,4200), (6000,9800) and (3900,4400) are what make
//      the outline read as arms rather than as a fat triangle. They are the
//      only concave coast in the game and they are the reason a stranger
//      scrolling past knows this is a world they have not seen.
//
//  AND THE ISLAND'S OUTLINE IS DRAWN ON THE ISLAND. The perimeter track loops
//  the whole coast 700 units in, closed, so the three-armed shape still reads
//  as a thin grey ring even where the rim falls into dawn shadow. It is a
//  CLOSED polyline — its first point repeats as its last — because gameday.ts
//  records finding a 609-unit hole due east of its bowl from exactly that
//  omission, and a ring with a gap in it is not a ring.
//
//  All coordinates are WORLD units (0..12000, centre 6000) — the same space
//  every other world uses, so the shared world->3D scale still applies
//  (world = 3D x 20; island.ts scales by 0.05).
// ══════════════════════════════════════════════════════════════════════════
import {
  pointInPoly, smoothPoly, distToPath, pathPointAt,
  spotFree, spotOpen, claimSpot, resetPlacement,
} from './bay';

import { stream, tally, STALL, CAP } from './rng';
import { pointInRegion } from './bay';

export { pointInPoly, smoothPoly, distToPath, pathPointAt, spotFree, spotOpen, claimSpot, resetPlacement };

export type Pt = [number, number];

// ── the airfield ───────────────────────────────────────────────────────────
// Walked clockwise from the northern threshold. North is -y. Interpolated
// through the six anchors above rather than hand-typed, so every arm is a
// round arm and every bite is a round bite, with no corner anywhere on a coast
// that is meant to read as grass running out into space.
export const SK_LAND: Pt[] = [
  [6000,1503], [6467,1554], [6897,1778], [7253,2143], [7517,2593], [7694,3066], [7813,3504],
  [7919,3869], [8058,4147], [8250,4365], [8463,4578], [8700,4798], [8956,5039], [9224,5315],
  [9491,5633], [9740,6000], [9954,6416], [10114,6875], [10204,7366], [10210,7874],
  [10124,8381], [9942,8864], [9669,9303], [9312,9678], [8864,9941], [8351,10072], [7819,10086],
  [7305,10017], [6833,9917], [6403,9832], [6000,9800], [5599,9816], [5180,9857], [4733,9899],
  [4260,9909], [3775,9854], [3306,9709], [2884,9461], [2537,9118], [2272,8708], [2098,8253],
  [2018,7773], [2030,7290], [2123,6824], [2284,6391], [2495,6000], [2737,5657], [2990,5360],
  [3239,5103], [3471,4874], [3680,4660], [3863,4447], [4013,4211], [4119,3911], [4215,3542],
  [4336,3118], [4517,2669], [4778,2238], [5123,1872], [5539,1616],
];
export const SK_LAND_SMOOTH = smoothPoly(SK_LAND, 6);
export const SK_LAND_RING: Pt[] = [...SK_LAND_SMOOTH, SK_LAND_SMOOTH[0]];
/** Distance from a point to the coast. The rough is dressed off this rather
 *  than off a polygon, exactly as Powder dresses its rim. */
export const distToEdge = (x: number, y: number): number => distToPath(x, y, SK_LAND_RING);

// ── the three runways ──────────────────────────────────────────────────────
// A DESIGNATOR IS A CLAIM ABOUT A BEARING, AND ALL THREE ARE CHECKED. A runway
// numbered 09 points at 090 magnetic; the number painted on the threshold is
// the heading divided by ten. The design that arrived here had 03/21 drawn at
// 023 and 09/27 drawn at 103 — two of three lying about themselves, on the
// biggest painted numerals in the world — and three of the six thresholds
// standing off the island in open space. Both are fixed here and qa/skyfit.mjs
// re-checks them, because a number a child can read is a number that has to be
// true.
//
// HALF-WIDTH 500 IS DELIBERATE AND IS THE OPPOSITE CALL FROM EVERY OTHER ROAD
// IN THE GAME. bay.ts's boardwalk and gameday.ts's concourse were both cut to
// 170 precisely because they were wider than a grown void, which made them read
// as plazas instead of paths. A runway is SUPPOSED to dwarf you: at R_CAP the
// player is 360 world units of radius against a 1,000-wide strip, so a maxed
// WORLD ENDER still fits on it with room either side. It is the only surface in
// the game wider than the player, and that is what makes it read as a runway.
//
// …FOR ONE RUNWAY. The paragraph above was applied to all three and the sum
// did not survive measurement: three 1,000-wide strips plus the perimeter ring
// took 59.0% of this island out of play — 3.7x the next-worst world, usable
// ground half of Lantern's, in seventeen disconnected pieces (the round-6
// rebuild brief §1). The design doc had already said it: "half the island is
// pavement… keep ONE hero runway at full width and make the other two disused
// broken slab with grass through it." So 03/21 — the strip that points from
// arrivals at the whale — keeps 500. 09/27 and 15/33 are DISUSED: half 260,
// which is POWDER's piste figure, drawn as cracked slab, and PLACEABLE. A
// derelict runway with its numbers still painted on it is better dressing than
// a clean one, and it is ten million square units of ground. Measured on the
// real coast: placeable 41.0% -> 61.5%, seven pieces instead of seventeen.
export const RWY03: Pt[] = [[3560, 8760], [7022, 2765]];   // 03/21, true 030 — THE LIVE RUNWAY
export const RWY03_HALF = 500;
export const RWY09: Pt[] = [[3400, 5750], [8875, 5750]];   // 09/27, true 090 — disused slab
export const RWY09_HALF = 260;
export const RWY15: Pt[] = [[5100, 2600], [8900, 9200]];   // 15/33, true 150 — disused slab
export const RWY15_HALF = 260;
export const RUNWAYS: { name: string; pts: Pt[]; half: number; live: boolean }[] = [
  { name: '03/21', pts: RWY03, half: RWY03_HALF, live: true },
  { name: '09/27', pts: RWY09, half: RWY09_HALF, live: false },
  { name: '15/33', pts: RWY15, half: RWY15_HALF, live: false },
];
/** the one strip that is still a runway — the sightline, kept clear */
export const LIVE_RUNWAYS = RUNWAYS.filter((r) => r.live);
/** the two that are slab now — cracked concrete a crew can park on */
export const SLABS = RUNWAYS.filter((r) => !r.live);
/** on the LIVE runway — the sightline, the strip a child sees the whale down */
export const onRunway = (wx: number, wy: number): boolean =>
  LIVE_RUNWAYS.some((r) => distToPath(wx, wy, r.pts) <= r.half);
/** on either DISUSED strip — cracked slab, placeable, parked on */
export const onSlab = (wx: number, wy: number): boolean =>
  SLABS.some((r) => distToPath(wx, wy, r.pts) <= r.half);

// ── the perimeter track ────────────────────────────────────────────────────
// Cracked tarmac, once the fire road, now the marshals' beat. CLOSED: the last
// point is the first point.
export const PERIMETER: Pt[] = [
  [6000,2203], [6752,2463], [7232,3232], [7402,4070], [7538,4615], [7857,4928], [8290,5255],
  [8795,5706], [9258,6343], [9538,7150], [9518,8031], [9149,8835], [8452,9375], [7534,9447],
  [6687,9232], [6000,9100], [5326,9172], [4545,9269], [3717,9143], [3057,8650], [2704,7903],
  [2696,7074], [2980,6318], [3433,5730], [3905,5319], [4286,5010], [4533,4679], [4626,4108],
  [4802,3308], [5268,2557], [6000,2203],
];
export const PERIMETER_HALF = 170;   // was 200; 170 is what bay.ts and gameday.ts settled on after 300 read as a plaza
export const onPerimeter = (wx: number, wy: number): boolean =>
  distToPath(wx, wy, PERIMETER) <= PERIMETER_HALF;

// ── the launch circle ──────────────────────────────────────────────────────
// The painted white ring at the 03/21 x 15/33 crossing — computed from the two
// centrelines, not eyeballed — and THE WHALE's precinct. It owns her ground
// crew, her fan trailer, her tether pins and the commentary trestle, so a
// player who eats her takes the circle out from under her rather than leaving a
// rind of surviving rope round the crater. Same rule Powder's lodge polygon
// follows for its sundeck.
export const LAUNCH = { cx: 6107, cy: 4349, rx: 1100, ry: 1100 };
export const inLaunchCircle = (wx: number, wy: number): boolean =>
  ((wx - LAUNCH.cx) / LAUNCH.rx) ** 2 + ((wy - LAUNCH.cy) / LAUNCH.ry) ** 2 <= 1;

// ── the districts ──────────────────────────────────────────────────────────
export type SkBiome = 'circle' | 'runway' | 'slab' | 'perimeter' | 'launchfield'
  | 'arrivals' | 'tower' | 'hangars' | 'breakfast' | 'meadow';

export interface SkRegion { id: SkBiome; name: string; poly: Pt[]; density: number; }

// Order is priority order. The two LINE districts — the runways and the
// perimeter track — are tested before this list in skRegionAt, because a strip
// is not a polygon; the launch circle outranks both, because the whale sits on
// the crossing and the crossing is hers.
export const SK_REGIONS: SkRegion[] = [
  // THE LAUNCH CIRCLE, first, so it owns the crossing outright.
  { id: 'circle', name: 'THE BELL PLAZA', density: 0.6,
    poly: [[7207,4349], [7060,4899], [6657,5302], [6107,5449], [5557,5302], [5154,4899], [5007,4349], [5154,3799], [5557,3396], [6107,3249], [6657,3396], [7060,3799]] },

  // THE LAUNCH FIELD. The hero district and the densest lawn in the game: the
  // grass in the eastern wedge between 03/21 and 15/33, north of 09/27, where
  // forty balloons lie out in loose rows at four different stages of
  // inflation. Density 1.5 — the same figure Powder gives its village — and
  // the only place in the world where the ratio of stages is hand-authored
  // rather than scattered.
  { id: 'launchfield', name: 'THE CLOUD GARDENS', density: 1.5,
    poly: [[4350, 6550], [5300, 6350], [6400, 6330], [7450, 6450], [8050, 6950],
           [8200, 7750], [8000, 8550], [7350, 9050], [6400, 9250], [5400, 9150],
           [4700, 8750], [4300, 8000], [4250, 7200]] },

  // THE ARRIVALS FIELD. It was wet grass on the south-west arm, and it was on
  // the wrong side of the whale for a camera whose bearing never changes: the
  // land survey measured her 66.6 degrees off the optical centreline the
  // instant controls went live, out of frame at every phone aspect, and the
  // child's first playable frame as 71% grass and tarmac with the arrivals
  // field itself at 0.0% of the screen. So arrivals moved to the EAST END OF
  // THE DISUSED 09/27 SLAB — which is where a real meet parks its trailers,
  // on the hardstanding — and from here she is 5.4 degrees off-axis at 110
  // units, dead ahead down the old runway. Trailers nose-in along the slab,
  // tailgates down, envelopes half-dragged out of their bags, a ticket caravan
  // with one bulb on.
  { id: 'arrivals', name: 'THE BALLOON DOCK', density: 1.1,
    poly: [[7000, 5300], [8250, 5300], [8500, 5750], [8250, 6200], [7000, 6200], [6850, 5750]] },

  // THE TOWER. The preserved control tower on the south-east shoulder,
  // checkerboard-painted by volunteers every spring, with the met hut, the
  // briefing caravan, the flagpole, the fire tender that has never been used
  // and the windsock mast. The Balloonmeister broadcasts from the balcony and
  // does not come down.
  { id: 'tower', name: 'THE CASTLE KEEP', density: 0.9,
    poly: [[8000, 6350], [8700, 6350], [9150, 6700], [9250, 7250], [8900, 7500],
           [8250, 7450], [7950, 6950]] },

  // THE HANGARS. Two curved-roof sheds behind the tower with their doors
  // half-slid open, running a Sunday flea market inside.
  { id: 'hangars', name: 'THE CASTLE YARD', density: 1.2,
    poly: [[8360, 7320], [8950, 7300], [9330, 7620], [9350, 8080], [9080, 8380],
           [8600, 8420], [8340, 8150], [8280, 7700]] },

  // BREAKFAST ROW. The food vans along the old taxiway spur. Every errand in
  // this world eventually comes here, which is what makes it the crowd's one
  // cross-district destination.
  { id: 'breakfast', name: 'THE CLOUD MARKET', density: 1.3,
    poly: [[7250, 4560], [7850, 4500], [8280, 4620], [8500, 4880], [8480, 5180],
           [8100, 5330], [7600, 5320], [7250, 5140], [7150, 4840]] },

  // THE ROUGH — LAST, and its polygon is the whole island, so it is the
  // catch-all exactly as 'rim' is for Powder. The uncut grass in the three
  // bites: wildflowers, skylarks, a hare, a collapsed windsock pole and the
  // fence nobody has mended. Dress it off distToEdge with a band, never with
  // scatterInRegion.
  { id: 'meadow', name: 'THE CLOUD MEADOWS', density: 0.35, poly: SK_LAND_SMOOTH },
];

/** THE ARRIVALS FIELD, on the wet grass 800 units off the 21 threshold — the
 *  quietest, lowest, most ordinary corner of the field, looking straight up 03
 *  at the whale.
 *
 *  IT IS BESIDE THE RUNWAY AND NOT ON IT. The first draft of this constant put
 *  the child down at [3760,8650], which is 200 units along the 03/21 centreline
 *  and therefore inside a 1,000-wide strip of concrete — a void opening its
 *  first match standing in the middle of an active runway, which is both the
 *  wrong picture and the wrong joke. qa/airfield.mjs caught it on its first
 *  run. The second attempt was worse in a different way — a search that only
 *  maximised distance from the runways walked the child out to 182 units from
 *  the coast, teetering on the rim of a floating island. The spot below is
 *  chosen by a search over the arrivals polygon that weighs BOTH: 662 units
 *  clear of the nearest strip, 1,345 in from the coast, 902 from the 21
 *  threshold so the runway still runs away from the child toward the whale. */
// …and all three of those numbers were measured from a spawn that resolved to
// THE ROUGH — 408 units outside the arrivals polygon three comments said it was
// in, with the whale out of frame. The spawn is on the arrivals hardstanding
// now, and the check that should always have existed — skRegionAt(spawn) ===
// 'arrivals' — is qa/airfield.mjs section D.
export const SK_SPAWN: Pt = [7800, 5750];

/** Bearing from (wx,wy) to the launch circle. Everything that can face
 *  something — the passengers, the commentary trestle, the parked spectator
 *  cars — faces this, which is what makes the field read as pointing at one
 *  event rather than standing about. */
export const skFacingCircle = (wx: number, wy: number): number =>
  Math.atan2(LAUNCH.cy - wy, LAUNCH.cx - wx);

// ── the world queries island.ts asks ───────────────────────────────────────
export const onSkylarkLand = (wx: number, wy: number): boolean => pointInPoly(wx, wy, SK_LAND_SMOOTH);

export function skRegionAt(wx: number, wy: number): SkBiome | null {
  if (!onSkylarkLand(wx, wy)) return null;
  // the circle outranks the concrete it is painted on
  if (inLaunchCircle(wx, wy)) return 'circle';
  if (onRunway(wx, wy)) return 'runway';
  if (onPerimeter(wx, wy)) return 'perimeter';
  for (const r of SK_REGIONS) if (r.id !== 'circle' && pointInPoly(wx, wy, r.poly)) return r.id;
  // the disused strips come AFTER the districts, so the arrivals hardstanding
  // laid over the east end of 09/27 is arrivals, and what is left of the two
  // old runways outside any district is slab
  if (onSlab(wx, wy)) return 'slab';
  return 'meadow';
}

/** Somewhere a prop may legally stand. THE RUNWAYS ARE THE LEVEL'S SIGHTLINE
 *  and furniture in them is furniture in the way, so scatter is kept off all
 *  three strips and off the perimeter track; the launch circle is authored
 *  rather than scattered and is excluded too. Everything the runways DO carry —
 *  the threshold numerals, the edge lights, the sheep — is placed by hand. */
export function skPlaceable(wx: number, wy: number, clear = 40): boolean {
  if (!onSkylarkLand(wx, wy)) return false;
  if (inLaunchCircle(wx, wy)) return false;
  // only the LIVE runway is a sightline. The two disused slabs are ground.
  for (const r of LIVE_RUNWAYS) if (distToPath(wx, wy, r.pts) < r.half + clear) return false;
  if (distToPath(wx, wy, PERIMETER) < PERIMETER_HALF + clear) return false;
  return true;
}

// ── scatter ────────────────────────────────────────────────────────────────
// Same contract as powder.ts's and lantern.ts's: rejection sampling with the
// shared placement hash doing overlap rejection.
export interface SkScatterOpts {
  /** the prop's 3D edible radius — enables overlap rejection when set */
  sep?: number;
  /** districts this prop may NOT land in */
  avoid?: SkBiome[];
}
const passes = (x: number, y: number, o?: SkScatterOpts): boolean => {
  if (o?.avoid?.length) { const d = skRegionAt(x, y); if (d && o.avoid.includes(d)) return false; }
  if (o?.sep !== undefined && !spotFree(x, y, o.sep * 20)) return false;
  return true;
};
const take = (x: number, y: number, o?: SkScatterOpts): void => {
  if (o?.sep !== undefined) claimSpot(x, y, o.sep * 20);
};
const bbox = (poly: Pt[]): [number, number, number, number] => {
  let a = Infinity, b = -Infinity, c = Infinity, d = -Infinity;
  for (const [x, y] of poly) { a = Math.min(a, x); b = Math.max(b, x); c = Math.min(c, y); d = Math.max(d, y); }
  return [a, b, c, d];
};
const LAND_BOX = bbox(SK_LAND_SMOOTH);

/** N legal points inside a district. The rough's polygon is the whole island —
 *  use scatterLand with a band for the three bites. */

export function scatterInRegion(r: SkRegion, n: number, clear = 40, o?: SkScatterOpts): Pt[] {
  const rnd = stream('skylark', r.id, n, clear, o?.sep, o?.avoid?.join(','));
  const [minX, maxX, minY, maxY] = bbox(r.poly);
  const out: Pt[] = [];
  // WHY a scatter came up short, not just that it did — see ./rng's ledger.
  let outside = 0, blocked = 0, busy = 0, tries = 0, miss = 0;
  for (; tries < CAP(n, 60) && out.length < n && (tries < n * 60 || miss < STALL); tries++) {
    // straight into the district when it can be triangulated; the bounding box
    // is the fallback for a polygon ear clipping could not resolve
    const p = pointInRegion(r.poly, rnd);
    const x = p ? p[0] : minX + rnd() * (maxX - minX);
    const y = p ? p[1] : minY + rnd() * (maxY - minY);
    // A SAMPLE OUTSIDE THE POLYGON IS NOT EVIDENCE THE REGION IS FULL. It says
    // the bounding box is a poor fit for the shape, and nothing else — so it
    // must not count toward the stall, whose whole meaning is "this ground is
    // closed". Pirate's beach is a thin diagonal strip inside a fat box and
    // misses it 79% of the time; counting those as stall evidence let a run of
    // bad luck end a pass that had open sand left. `tries` still bounds the
    // work, so a hopeless region is still cheap.
    if (!pointInPoly(x, y, r.poly)) { outside++; continue; }
    if (!skPlaceable(x, y, clear)) { blocked++; miss++; continue; }
    if (!passes(x, y, o)) { busy++; miss++; continue; }
    take(x, y, o);
    out.push([x, y]);
    miss = 0;
  }
  tally(`skylark/${r.id}`, n, out.length, { tries, outside, blocked, busy });
  return out;
}

/** N legal points anywhere on the field. `band` filters on distance to the
 *  coast, so "out in the rough" needs no polygon. */
export function scatterLand(n: number, clear = 40, band?: [number, number], o?: SkScatterOpts): Pt[] {
  const rnd = stream('skylark', 'land', n, clear, band?.join(','), o?.sep, o?.avoid?.join(','));
  const [minX, maxX, minY, maxY] = LAND_BOX;
  const out: Pt[] = [];
  let outside = 0, blocked = 0, busy = 0, tries = 0, miss = 0;
  for (; tries < CAP(n, 90) && out.length < n && (tries < n * 90 || miss < STALL); tries++) {
    const x = minX + rnd() * (maxX - minX), y = minY + rnd() * (maxY - minY);
    if (!skPlaceable(x, y, clear)) { blocked++; miss++; continue; }
    if (band) { const d = distToEdge(x, y); if (d < band[0] || d > band[1]) { outside++; miss++; continue; } }
    if (!passes(x, y, o)) { busy++; miss++; continue; }
    take(x, y, o);
    out.push([x, y]);
    miss = 0;
  }
  tally('skylark/land', n, out.length, { tries, outside, blocked, busy });
  return out;
}

/** A clump around a point — a crew round a basket, a queue at a van, a stand
 *  of cylinders. */
export function clusterAt(cx: number, cy: number, n: number, radius: number,
                          clear = 30, o?: SkScatterOpts): Pt[] {
  const rnd = stream('skylark', 'cluster', cx, cy, n, radius, clear, o?.sep);
  const out: Pt[] = [];
  let blocked = 0, busy = 0, tries = 0, miss = 0;
  for (; tries < CAP(n, 40) && out.length < n && (tries < n * 40 || miss < STALL); tries++) {
    const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * radius;
    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
    if (!skPlaceable(x, y, clear)) { blocked++; miss++; continue; }
    if (!passes(x, y, o)) { busy++; miss++; continue; }
    take(x, y, o);
    out.push([x, y]);
    miss = 0;
  }
  tally('skylark/cluster', n, out.length, { tries, outside: 0, blocked, busy });
  return out;
}

// ── THE CREWS OUT ON THE ARMS ──────────────────────────────────────────────
// The owner, 2026-09-24: "Item placement is like all just in the middle." It
// was. Every envelope on the island stood in five districts in the south-east
// quarter — the launch field, arrivals, the tower, the hangars, breakfast row —
// and the three runway arms, the track's verge and the rough carried tussocks.
//
// A real meet does not squeeze its late crews into the organisers' rows. They
// rig wherever there is grass and a lane to drive the chase car out on, and on
// an airfield that is the shoulders of the strips and the verge of the track.
// So these are the spots a crew rigs on, in three passes, each one keeping
// CREW_GAP from every crew already out:
//   a. the grass shoulders of all THREE strips, both sides, two rows deep,
//      walking each strip's own heading — this is what puts something at the
//      end of every arm
//   b. the verge of the perimeter track, inside it and (where there is land
//      before the coast) outside it
//   c. whatever rough is still further than CREW_GAP from any crew
// Only on open ground — the rough and the two disused slabs, which are
// cracked concrete a crew is allowed to park on (see RUNWAYS) — and never on
// a district (they are authored and full), the live strip or the track
// (skPlaceable). On a slab a crew keeps SLAB_LINE off the centreline, so the
// painted dashes and numerals still draw the strip down its middle.
//
// Geometry only. island.ts decides what each crew is and asks spotOpen before
// it puts anything down, so a spot here is a proposal, not a claim.
/** a crew's reach from its envelope's centre: a standing envelope's half-
 *  diagonal is 6.8 scene units (136 world), and drop() keeps an envelope
 *  r x 34 from the live strip — 177 for a spilled one — so 180 clears both */
export const CREW_REACH = 180;
/** crews keep this far apart, centre to centre. Set against the play frame:
 *  qa/skylarkfield.mjs grades "an envelope in frame" at the equal-area radius
 *  of the settled r-4 frame (514-523 world units), and 560 — just over it —
 *  proposed 42 spots and still left the probe's north-arm frame with nothing
 *  in it. 420 proposes 58, and 49 of them land on SEED 7 (spotOpen takes the
 *  rest). */
export const CREW_GAP = 420;
const SLAB_LINE = 200;
export function skCrewSites(): Pt[] {
  const out: Pt[] = [];
  const rnd = stream('skylark', 'crews');
  const jit = (): number => (rnd() - 0.5) * 120;
  const add = (x: number, y: number): void => {
    const reg = skRegionAt(x, y);
    if (reg !== 'meadow' && reg !== 'slab') return;
    if (!skPlaceable(x, y, CREW_REACH)) return;
    if (distToEdge(x, y) < CREW_REACH) return;
    for (const r of SLABS) if (distToPath(x, y, r.pts) < SLAB_LINE) return;
    for (const [cx, cy] of out) if (Math.hypot(cx - x, cy - y) < CREW_GAP) return;
    out.push([x, y]);
  };
  // a. THE SHOULDERS — two rows each side of every strip, the second row
  //    staggered half a pitch so the pair reads as a pegged line, not a grid
  for (const r of RUNWAYS) {
    const a = r.pts[0], b = r.pts[r.pts.length - 1];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const tx = (b[0] - a[0]) / L, ty = (b[1] - a[1]) / L, nx = -ty, ny = tx;
    for (const [off, stag] of [[r.half + CREW_REACH + 170, 0], [r.half + CREW_REACH + 170 + CREW_GAP, 0.5]] as const) {
      for (let d = 260 + stag * CREW_GAP; d < L - 200; d += CREW_GAP) {
        for (const side of [-1, 1]) {
          const j = jit();
          add(a[0] + tx * (d + j) + nx * off * side, a[1] + ty * (d + j) + ny * off * side);
        }
      }
    }
  }
  // b. THE TRACK'S VERGE — inside the ring, and outside it where the coast
  //    leaves room (the track runs 700 in from the coast for most of its loop)
  for (let i = 0; i < PERIMETER.length - 1; i++) {
    const [x1, y1] = PERIMETER[i], [x2, y2] = PERIMETER[i + 1];
    const nx = -(y2 - y1), ny = x2 - x1, nl = Math.hypot(nx, ny) || 1;
    for (const t of [0.3, 0.8]) {
      const bx = x1 + (x2 - x1) * t, by = y1 + (y2 - y1) * t;
      const inward = ((6000 - bx) * nx + (6000 - by) * ny) > 0 ? 1 : -1;
      add(bx + (nx / nl) * 560 * inward, by + (ny / nl) * 560 * inward);
      add(bx - (nx / nl) * 420 * inward, by - (ny / nl) * 420 * inward);
    }
  }
  // c. THE ROUGH — a jittered sweep over the whole coast; add() drops every
  //    spot already within CREW_GAP of a crew, so this only fills the holes
  const [minX, maxX, minY, maxY] = LAND_BOX;
  for (let y = minY + 200; y < maxY; y += CREW_GAP * 0.5) {
    for (let x = minX + 200; x < maxX; x += CREW_GAP * 0.5) add(x + jit(), y + jit());
  }
  return out;
}
