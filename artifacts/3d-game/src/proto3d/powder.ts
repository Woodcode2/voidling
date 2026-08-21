// ── POWDER PASS ────────────────────────────────────────────────────────────
// A mountain village on a snow day. Same contract as lantern.ts: a land
// polygon, districts, a spawn, and the placement queries island.ts asks.
// World units throughout — island.ts scales by 0.05, so 20 world units is one
// 3D unit and the 5.9k bowl is about 295 across in play.
//
// WHAT IS DIFFERENT ABOUT THIS PLACE, AND WHY THE SHAPE IS WHAT IT IS
// -------------------------------------------------------------------
// The easy version of a snow world is Maple Isle with a hat on: same blob,
// same scattered houses, white paint. So this one is a BOWL — a wide oval
// valley pressed between mountain walls, and the composition is concentric
// rather than linear. The frozen lake sits off-centre as the arena, the
// village hugs its south-east shore, the pinewood climbs the west slope, and
// the lift line runs north up open snow to THE LODGE. You do not walk a
// street here; you orbit a lake and everything on the slopes looks down at
// you doing it.
//
// The lodge is the second landmark in the game approached from BELOW (the
// bathhouse was the first), so the approach is deliberately the opposite
// kind: no corridor, no converging walls, no stair. THE HOME RUN is an open
// piste two thousand units wide, and the lodge just gets bigger the whole
// way up. A corridor says "come here"; a wide white slope with one building
// at the top says "you could go anywhere, but you won't".
//
// THE LAKE IS WALKABLE, AND THAT IS NOT NEGOTIABLE.
// lantern.ts learned this with its canal and Pirate Bay learned it the
// expensive way: the containment probes flood-fill the reach of walkable
// ground and demand ≥97%, and any water boundary through the play space cuts
// the legal set with an invisible wall no child can read. The lake here is
// ice — walkable ground painted as ice. onIce() below tells the physics
// where to slide; it never tells the containment where to stop. Same
// discipline everywhere else: one continuous landmass, no pockets, and
// nowhere a void must travel is narrower than about 3,900 units — five times
// the ~700 a WORLD ENDER needs to pass without scraping.
// The geometry primitives and the shared placement hash live in bay.ts, only
// because that world was written first. Do NOT fork them: one shared table is
// what stops a prop claimed by the village from being buried by one scattered
// into the pinewood, and a second copy of smoothPoly is how Maple Isle's
// ground and coastline came to disagree at every bend.
import {
  pointInPoly, smoothPoly, distToPath, pathPointAt,
  spotFree, spotOpen, claimSpot, resetPlacement,
} from './bay';

export { pointInPoly, smoothPoly, distToPath, pathPointAt, spotFree, spotOpen, claimSpot, resetPlacement };

export type Pt = [number, number];

// ── the valley bowl ────────────────────────────────────────────────────────
// Walked clockwise from the north-west shoulder. North is -y. Three things
// are load-bearing:
//   • it is an OVAL, not lantern's waisted valley — the whole point of this
//     world is that there is no street, so the outline never pinches; the
//     narrowest span a void crosses (the lodge line, ~4,000) still fits the
//     lodge precinct with ~300 units of snow at the tightest shoulder;
//   • the north lobe swells to hold the lodge high against the wall, the way
//     lantern's holds the bathhouse — that is the one deliberate rhyme;
//   • the east flank bellies out to 8,950 so the village, its road and the
//     lift base all fit on the shore without the road hugging the rim.
export const PW_LAND: Pt[] = [
  [4150, 2450], [4650, 1650], [5450, 1220], [6300, 1120], [7150, 1300],
  [7850, 1800], [8300, 2500],
  [8620, 3300], [8820, 4200], [8920, 5200], [8950, 6200], [8880, 7200],
  [8680, 8100], [8350, 8950],
  [7850, 9700], [7100, 10300], [6200, 10620], [5250, 10600], [4400, 10250],
  [3750, 9650],
  [3350, 8850], [3120, 8000], [3050, 7100], [3080, 6200], [3180, 5300],
  [3320, 4400], [3560, 3550], [3800, 2950],
];

export const PW_LAND_SMOOTH = smoothPoly(PW_LAND, 6);
export const PW_LAND_RING: Pt[] = [...PW_LAND_SMOOTH, PW_LAND_SMOOTH[0]];

/** Distance to the valley wall. Thins the pines out toward the rim. */
export const distToEdge = (x: number, y: number): number => distToPath(x, y, PW_LAND_RING);

// ── the lodge ──────────────────────────────────────────────────────────────
// The finale. It sits high in the north with its back to the wall, and unlike
// the bathhouse it is approached across open piste — the player sees it from
// the lake shore in frame one and there is nothing but snow between them.
export const LODGE = { cx: 6100, cy: 2350, rx: 1150, ry: 850 };

/** The lodge MESH's footprint as a fraction of the precinct ellipse above.
 *  Two numbers for two jobs, as GAME DAY established: the precinct is the
 *  ground the building, its sundeck and the ski racks own; the mesh factor is
 *  the building. Conflating them painted GAME DAY's pitch 2.6x the stadium;
 *  here it would push the sundeck out over the drop behind the north wall. */
export const LODGE_MESH_K = 0.44;

export const inLodge = (wx: number, wy: number): boolean => {
  const k = LODGE_MESH_K * 1.10;
  const dx = (wx - LODGE.cx) / (LODGE.rx * k), dy = (wy - LODGE.cy) / (LODGE.ry * k);
  return dx * dx + dy * dy <= 1;
};

// ── the frozen lake ────────────────────────────────────────────────────────
// The central arena, pushed off-centre to the south-west so the map never
// reads as a target with a bullseye. Everything about it is ground; the only
// thing "lake" about it is the paint and the physics.
export const LAKE = { cx: 5450, cy: 6600, rx: 1450, ry: 1100 };

// ── the grit road ──────────────────────────────────────────────────────────
// The village road, ploughed by somebody very proud of the plough. Ploughing
// scraped it down to polished ice, so the ONE surface maintained for safety
// is the other place the physics slides — which is the level's best joke and
// the reason it is a path here rather than a texture. It runs from the lake
// shore through the chalets and out to the lift base, bending so it never
// photographs as a stripe.
export const GRIT: Pt[] = [
  [6350, 7550], [6900, 7900], [7600, 8100], [8100, 7700], [8150, 7000],
  [7800, 6400], [7350, 6050], [6950, 5800],
];
/** Half-width. 170 gives an 8.5-unit road in 3D — two chalets' doorsteps
 *  apart, wide enough to toboggan a void down, narrow enough that leaving it
 *  is always one steering input away. */
export const GRIT_HALF = 170;

/** Where the physics slides: on the lake, or on the road the plough polished.
 *  This is a SURFACE query, never a boundary — see the head of the file. */
export const onIce = (wx: number, wy: number): boolean => {
  const dx = (wx - LAKE.cx) / LAKE.rx, dy = (wy - LAKE.cy) / LAKE.ry;
  if (dx * dx + dy * dy <= 1) return true;
  return distToPath(wx, wy, GRIT) <= GRIT_HALF;
};

// ── the piste ──────────────────────────────────────────────────────────────
// From the lift base at the road's end up to the lodge door. t = 0 at the
// village, t = 1 at the lodge, so the chairs ride 0→1 and the avalanche —
// when it comes — plays this line 1→0. It bends twice because a dead-straight
// fall line would put the lodge, the chairs and the player on one rail and
// the avalanche beat needs the player to be beside the line, watching it.
export const PISTE: Pt[] = [
  [6950, 5800], [6700, 5050], [6450, 4300], [6250, 3600], [6120, 2950],
  [6100, 2400],
];
/** Kept clear of scatter (see pwPlaceable): the run is dressed with authored
 *  slalom gates and pylons, and it is the lane the avalanche owns. 260 gives
 *  a 26-unit open ribbon in 3D inside a piste district ~2,500 wide — a clear
 *  line, not a corridor. */
export const PISTE_HALF = 260;

/** Points along the run, for chairs, slalom gates and the avalanche front. */
export function pistePoint(t: number): { x: number; y: number; ang: number } {
  return pathPointAt(PISTE, Math.max(0, Math.min(1, t)));
}

/** The chairlift is authored, not scattered: pylons at fixed pitch up the
 *  piste, each carrying the bearing of the cable through it. 520 spaces
 *  seven pylons up the run — enough to read as infrastructure, few enough
 *  that eating one at a time stays an event. The half-pitch lead-in keeps
 *  pylon zero out of the lift queue. */
export function liftPylons(pitch = 520): { x: number; y: number; ang: number; t: number }[] {
  let total = 0;
  for (let i = 0; i < PISTE.length - 1; i++)
    total += Math.hypot(PISTE[i + 1][0] - PISTE[i][0], PISTE[i + 1][1] - PISTE[i][1]);
  const out: { x: number; y: number; ang: number; t: number }[] = [];
  for (let d = pitch / 2; d < total; d += pitch) {
    const t = d / total;
    out.push({ ...pathPointAt(PISTE, t), t });
  }
  return out;
}

// ── districts ──────────────────────────────────────────────────────────────
export type PwBiome = 'village' | 'lake' | 'pinewood' | 'piste' | 'lodge' | 'rim';

export interface PwRegion { id: PwBiome; name: string; poly: Pt[]; density: number; }

// Order is priority order, exactly as lantern.ts orders the canal first: the
// lake owns its ice outright, the lodge outranks the piste where the run
// meets the door, and neighbouring polygons deliberately overlap so the seams
// have no gaps — anything left over falls to the rim.
export const PW_REGIONS: PwRegion[] = [
  // THE FROZEN LAKE — FIRST, so it owns the arena. Walkable ground painted as
  // ice; the head of the file explains why it must never be a barrier. Kept
  // sparse: it is the fight arena, and furniture in an arena is furniture in
  // the way. A twelve-gon on the ellipse, so region and physics agree on
  // where the shore is to within a footstep.
  { id: 'lake', name: 'THE FROZEN LAKE', density: 0.3,
    poly: [[6900, 6600], [6706, 7150], [6175, 7553], [5450, 7700], [4725, 7553],
           [4194, 7150], [4000, 6600], [4194, 6050], [4725, 5647], [5450, 5500],
           [6175, 5647], [6706, 6050]] },

  // THE LODGE. The biggest meal in the level; like the bathhouse its polygon
  // swallows the sundeck, the ski racks and the lift top station — a player
  // eating the building should take the deck out from under it, not leave a
  // rind of surviving veranda around the crater.
  { id: 'lodge', name: 'THE LODGE', density: 0.8,
    poly: [[5000, 1650], [6100, 1500], [7150, 1650], [7700, 2350], [7500, 3050],
           [6800, 3450], [6100, 3550], [5350, 3450], [4650, 3050], [4500, 2350]] },

  // THE VILLAGE. The hero district: chalets shoulder to shoulder on the
  // south-east shore, all facing the lake, the grit road winding through
  // them. Its west edge deliberately laps onto the ice so no seam of "rim"
  // can appear between a chalet's doorstep and the shore.
  { id: 'village', name: 'THE VILLAGE', density: 1.5,
    poly: [[6350, 7000], [7300, 6300], [8250, 6800], [8420, 7900], [8250, 8700],
           [7700, 9400], [6900, 9900], [6000, 10050], [5200, 9700], [5000, 8800],
           [5500, 8100], [6000, 7500]] },

  // THE PINEWOOD. The west slope, and the level's larder: trees, log piles,
  // and the deep-snow props. It faces the village across the lake so both
  // shores are always in each other's establishing shot.
  { id: 'pinewood', name: 'THE PINEWOOD', density: 1.2,
    poly: [[3500, 4200], [4250, 3950], [4900, 4350], [5000, 5000], [4650, 5650],
           [4350, 6350], [4300, 7100], [5300, 7700], [5500, 8600], [4900, 9700],
           [3800, 9000], [3400, 8300], [3300, 7400], [3300, 6300], [3400, 5200]] },

  // THE HOME RUN. The open piste from the lift base to the lodge — wide on
  // purpose (see the head of the file on approaching the lodge without a
  // corridor). Sparse by design: its dressing is the authored pylons and
  // gates, not scatter.
  { id: 'piste', name: 'THE HOME RUN', density: 0.5,
    poly: [[5350, 5950], [6300, 5750], [7100, 5900], [7550, 5100], [7450, 4300],
           [7100, 3600], [6600, 3050], [5700, 3050], [4700, 3800], [4600, 4700],
           [4800, 5400]] },

  // THE HIGH SHOULDER — LAST, and its polygon is the whole bowl, which makes
  // it the catch-all: everything on land that no district above claimed is
  // rim, exactly the role 'bamboo' plays for lantern as a bare fallback. It
  // gets a real entry here because the newsroom needs a poly and a name for
  // it. Do NOT scatterInRegion into this polygon — it spans the map; dress
  // the shoulder with scatterLand and a distToEdge band instead, the way
  // lantern plants its bamboo.
  { id: 'rim', name: 'THE HIGH SHOULDER', density: 0.4,
    poly: PW_LAND_SMOOTH },
];

// ── spawn ──────────────────────────────────────────────────────────────────
// On the village meadow just off the lake's south-east shore. The first
// frame is the whole world in one turn of the head: the ice runs away flat
// and white to the north-west, the chalets stack up warm to the east, and
// the lodge sits small and lit at the far north, dead on the bearing
// pwFacingLodge gives from here.
// …and it is OFF the grit road, deliberately. The obvious spawn — the road's
// first bend at [6473, 7628] — measures inside GRIT_HALF, and onIce there is
// true: the child's first input would be a skid. lantern.ts moved its spawn
// out of the canal for the same class of reason. This point is 322 from the
// road's centre line and outside the lake ellipse, so the first three
// seconds are for steering; the comedy is opt-in, one void-width away.
export const PW_SPAWN: Pt = [6300, 7900];

/** Bearing from (wx,wy) to the lodge. Everything that can face something —
 *  the chalets' gable ends, the lift chairs, the piste's slalom gates —
 *  faces this, which is what makes the slope read as pointing somewhere. */
export const pwFacingLodge = (wx: number, wy: number): number =>
  Math.atan2(LODGE.cy - wy, LODGE.cx - wx);

// ── the world queries island.ts asks ───────────────────────────────────────
export const onPowderLand = (wx: number, wy: number): boolean => pointInPoly(wx, wy, PW_LAND_SMOOTH);

export function pwRegionAt(wx: number, wy: number): PwBiome | null {
  if (!onPowderLand(wx, wy)) return null;
  for (const r of PW_REGIONS) if (pointInPoly(wx, wy, r.poly)) return r.id;
  return 'rim';   // unreachable while the last region is the whole bowl; kept as the stated fallback
}

/** Somewhere a prop may legally stand: in the bowl, out of the lodge's own
 *  footprint, off the grit road, and off the piste's centre line — the road
 *  and the run are the level's two authored lines, and scatter dropped into
 *  either one turns a sightline into a jumble sale. */
export function pwPlaceable(wx: number, wy: number, clear = 40): boolean {
  if (!onPowderLand(wx, wy)) return false;
  if (inLodge(wx, wy)) return false;
  if (distToPath(wx, wy, GRIT) < GRIT_HALF + clear) return false;
  if (distToPath(wx, wy, PISTE) < PISTE_HALF + clear) return false;
  return true;
}

// ── scatter ────────────────────────────────────────────────────────────────
// Same contract as lantern.ts's: rejection sampling with the shared placement
// hash doing overlap rejection.
export interface PwScatterOpts {
  /** the prop's 3D edible radius — enables overlap rejection when set */
  sep?: number;
  /** districts this prop may NOT land in (a snowman melts no faster on the
   *  ice, but he does not belong there) */
  avoid?: PwBiome[];
}
const passes = (x: number, y: number, o?: PwScatterOpts): boolean => {
  if (o?.avoid?.length) { const d = pwRegionAt(x, y); if (d && o.avoid.includes(d)) return false; }
  if (o?.sep !== undefined && !spotFree(x, y, o.sep * 20)) return false;
  return true;
};
const take = (x: number, y: number, o?: PwScatterOpts): void => {
  if (o?.sep !== undefined) claimSpot(x, y, o.sep * 20);
};

const bbox = (poly: Pt[]): [number, number, number, number] => {
  let a = Infinity, b = -Infinity, c = Infinity, d = -Infinity;
  for (const [x, y] of poly) { a = Math.min(a, x); b = Math.max(b, x); c = Math.min(c, y); d = Math.max(d, y); }
  return [a, b, c, d];
};
const LAND_BOX = bbox(PW_LAND_SMOOTH);

/** N legal points inside a district. Remember the rim's polygon is the whole
 *  bowl — use scatterLand with a band for the shoulder. */
export function scatterInRegion(r: PwRegion, n: number, rnd: () => number, clear = 40, o?: PwScatterOpts): Pt[] {
  const [minX, maxX, minY, maxY] = bbox(r.poly);
  const out: Pt[] = [];
  for (let tries = 0; tries < n * 60 && out.length < n; tries++) {
    const x = minX + rnd() * (maxX - minX), y = minY + rnd() * (maxY - minY);
    if (!pointInPoly(x, y, r.poly)) continue;
    if (!pwPlaceable(x, y, clear)) continue;
    if (!passes(x, y, o)) continue;
    take(x, y, o);
    out.push([x, y]);
  }
  return out;
}

/** N legal points anywhere in the bowl. `band` filters on distance to the
 *  valley wall, so "up on the shoulder" needs no polygon. */
export function scatterLand(n: number, rnd: () => number, clear = 40, band?: [number, number], o?: PwScatterOpts): Pt[] {
  const [minX, maxX, minY, maxY] = LAND_BOX;
  const out: Pt[] = [];
  for (let tries = 0; tries < n * 90 && out.length < n; tries++) {
    const x = minX + rnd() * (maxX - minX), y = minY + rnd() * (maxY - minY);
    if (!pwPlaceable(x, y, clear)) continue;
    if (band) { const d = distToEdge(x, y); if (d < band[0] || d > band[1]) continue; }
    if (!passes(x, y, o)) continue;
    take(x, y, o);
    out.push([x, y]);
  }
  return out;
}

/** A clump around a point — a log pile, a stand of pines, a snowball fight. */
export function clusterAt(cx: number, cy: number, n: number, radius: number, rnd: () => number,
                          clear = 30, o?: PwScatterOpts): Pt[] {
  const out: Pt[] = [];
  for (let tries = 0; tries < n * 40 && out.length < n; tries++) {
    const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * radius;
    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
    if (!pwPlaceable(x, y, clear)) continue;
    if (!passes(x, y, o)) continue;
    take(x, y, o);
    out.push([x, y]);
  }
  return out;
}
