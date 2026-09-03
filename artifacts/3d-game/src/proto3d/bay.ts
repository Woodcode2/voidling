// ══ PIRATE BAY — the island's real geometry ═══════════════════════════════
// Maple Isle is a fat blob on a 6x6 block grid with a 5x5 road grid. Pirate
// Bay is none of that: a HOOKED headland that throws a sandy arm south and
// east and curls back north, cradling a sheltered bay with a mouth to the
// sea. Districts are polygon REGIONS sited by geography, and the only paths
// are one curving promenade along the inner shore plus a jungle trail.
//
// All coordinates are WORLD units (0..12000, centre 6000) — the same space
// Maple Isle's silhouette uses, so the shared world->3D scale still applies.

export type Pt = [number, number];

// the coastline, north headland clockwise round the hook and up the wild west
export const BAY_LAND: Pt[] = [
  [4300, 700], [5900, 620], [7100, 900], [7900, 1500], [8250, 2350],
  [8600, 3200], [9100, 3900], [9500, 4800],
  [9700, 5900], [9500, 6900], [8900, 7800], [8000, 8600],
  [7100, 9200], [7600, 9800], [8700, 9900], [9600, 9500], [10200, 8700],
  [10450, 9300], [9900, 10250], [8600, 10800], [7100, 10850], [5800, 10450],
  [4700, 9900], [3700, 9200], [2900, 8300], [2300, 7200], [1900, 6000],
  [1750, 4800], [1900, 3600], [2350, 2500], [3200, 1500],
];

// THE BAY — sheltered water cut into the land. The first version pushed a
// lobe out through the gap in the hook to read as "open to the sea", but that
// lobe is not on the island: anything drawn there floats over the void. The
// bay now closes along the inner shore, and the gap in the hook does the job
// of implying the mouth on its own.
export const BAY_WATER: Pt[] = [
  [7400, 3400], [8100, 4100], [8500, 5000], [8600, 6000], [8300, 7000],
  [7700, 7900], [6750, 8450], [6250, 8800], [6700, 9150], [7050, 9350],
  [6800, 9550], [6150, 9500], [5450, 9200], [5100, 8700], [5100, 7600],
  [5500, 6400], [6000, 5200], [6600, 4200],
];

export type BayBiome = 'port' | 'resort' | 'party' | 'market' | 'jungle' | 'cove' | 'beach' | 'oldtown';

export interface BayRegion { id: BayBiome; name: string; poly: Pt[]; density: number; }

// Districts sit where geography says they should: ships moor in the shelter
// of the bay head, the resort takes the long calm sun-facing inner shore,
// the dance floor is banished to the hook tip, and the jungle is the bit
// nobody ever developed.
export const BAY_REGIONS: BayRegion[] = [
  { id: 'port', name: 'THE DOCKS', density: 1.0,
    poly: [[6900, 2400], [8000, 2600], [8300, 3500], [7300, 3900], [6600, 3200]] },
  { id: 'oldtown', name: 'OLD TOWN', density: 1.1,
    poly: [[5100, 1500], [6900, 1400], [7300, 2600], [6400, 3300], [5000, 2900], [4600, 2100]] },
  { id: 'resort', name: 'THE RESORT', density: 1.2,
    poly: [[8300, 3500], [9400, 4300], [9600, 5900], [9300, 7200], [8500, 7100], [8500, 5600], [8200, 4400]] },
  // measured: the first siting put the dance floor 97% in the water. It now
  // sits on the broad southern shore inside the hook, where there IS land.
  // …and it needs DEPTH, not a ribbon: the game spawns the player here, and a
  // district one prop deep meant half the opening screen was open space. The
  // bay's south lobe was pulled back to make room.
  { id: 'party', name: 'DANCE COVE', density: 1.3,
    poly: [[6250, 10000], [7500, 10100], [8600, 10380], [8450, 10760], [7100, 10820], [6050, 10470]] },
  // likewise pulled inside the west coast (was 72% out at sea)
  { id: 'beach', name: 'SUNSET BEACH', density: 0.9,
    poly: [[2850, 7650], [3550, 8500], [4450, 9200], [5400, 9700], [5150, 10050], [4150, 9600], [3200, 8700], [2680, 7900]] },
  { id: 'cove', name: 'SMUGGLERS COVE', density: 0.8,
    poly: [[1900, 5300], [2900, 5600], [3000, 6900], [2300, 7500], [1800, 6500]] },
  { id: 'jungle', name: 'THE JUNGLE', density: 1.0,
    poly: [[3000, 3000], [4700, 3400], [5200, 5200], [4600, 7000], [3200, 7000], [2700, 5300], [2600, 3900]] },
  { id: 'market', name: 'THE BAZAAR', density: 1.1,
    poly: [[5100, 3600], [6400, 3900], [6300, 5300], [5200, 5600], [4900, 4600]] },
];

// THE PROMENADE — one curving boardwalk hugging the bay's inner shore, and
// THE TRAIL — a dirt spur into the wild west side. These replace the grid.
// It has to REACH things. The first run started 60 units short of the fort and
// stopped 38 short of Dance Cove's nearest corner — which is where the match
// begins — so the island's only path missed the spawn district at one end and
// the old town at the other, and the shuttle buggies ping-ponged between two
// patches of bare sand.
// Both ends were re-measured against the landmarks they pass: pushing the
// north end out to 5600 put the fort inside the boardwalk's clearance, and
// running the south end through Dance Cove did the same to the main stage.
// It now stops on the district's north edge, which reaches it without
// bulldozing it. (6300,9600 is off the land entirely — the coast moved when
// the bay's south lobe was reshaped — so that node went too.)
// ROADS END AT SOMETHING. qa/placement.mjs measured all four open ends of this
// island's two paths ending in open sand (2026-09-02: the boardwalk's north
// end 55 units from the nearest coast, the trail's start 45 units from
// anything). The north end now runs out to the north beach — (5985,900) is
// 10.5 units inside the smoothed coast, so the deck's rounded cap stops on the
// sand and the last plank is at the water. The south end is NOT extended: the
// spawn is hand-authored at (6950,10560) and the deck stopping 16 units short
// of it is the decision recorded below.
export const PROMENADE: Pt[] = [
  [5985, 900], [6100, 1800], [6600, 1900], [7300, 2900], [7900, 3900], [8600, 4900], [8800, 6100],
  [8500, 7300], [7900, 8300], [7100, 9000], [6100, 10050], [6800, 10280],
];
// The trail now STARTS at the boardwalk — (7050,2550) sits on the promenade's
// centreline, so the dirt runs out from under the deck's edge like a spur off
// a main road (the bake paints the trail first, so the planks cover its cap)
// — clears the warehouse by 677 (its 260 clearance + 130 half-width need 390),
// and ENDS at the tideline: the old last point sat 8.7 units from the
// smoothed coast on a heading parallel to it, so a 7.5-unit hook turns the
// last few metres to the water instead of stopping in the parasol row.
export const TRAIL: Pt[] = [
  [7050, 2550], [6200, 3500], [5000, 4200], [4000, 5200], [3200, 6200], [2700, 7400], [3400, 8600], [3300, 8690],
];
// 300 made a 30-unit-wide boardwalk: fifteen times wider than the player at
// the start of a match, and still wider than a WORLD ENDER. It dominated every
// screen in the resort while carrying almost nothing.
export const PROM_HALF = 175;    // boardwalk half-width, world units
export const TRAIL_HALF = 130;

// piers running off the promenade into the bay
export const PIERS: [number, number, number, number][] = [
  [7500, 3300, 8000, 3900], [8500, 5100, 8000, 5400], [8500, 6600, 7900, 6800],
  [7500, 8500, 7100, 8000], [6300, 9400, 6100, 8900],
];

// offshore: Skull Isle guards the bay mouth, the wreck sits on the reef
export const SKULL_ISLE: [number, number, number, number] = [10600, 6600, 700, 560];
export const WRECK_REEF: [number, number, number, number] = [11100, 9700, 430, 330];

// ── geometry helpers ───────────────────────────────────────────────────────
// INDEXED READS, NOT DESTRUCTURING, and the difference is not stylistic. This
// is the hottest function in the game: on Lantern Night the coastline and
// district tests are 57.5% of all CPU samples, 98.5% of that charged to the
// crowd, because every walking character's step asks it two or three times.
// `const [xi, yi] = poly[i]` invokes the iterator protocol on a plain array of
// two numbers; `a[0]`/`a[1]` does not. Benchmarked on identical data with
// identical answers: 12,046 ns against 1,209 ns, a 10x penalty paid per frame
// for a syntax choice.
export function pointInPoly(x: number, y: number, poly: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    const xi = a[0], yi = a[1], xj = b[0], yj = b[1];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
// smoothed coastline: the raw control points are corners, so sample the same
// midpoint-quadratic curve the renderer draws (otherwise land and paint
// disagree at every bend — the bug that plagued Maple Isle's ground)
export function smoothPoly(pts: Pt[], steps = 6): Pt[] {
  const out: Pt[] = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    const m0: Pt = [(pts[(i - 1 + n) % n][0] + a[0]) / 2, (pts[(i - 1 + n) % n][1] + a[1]) / 2];
    const m1: Pt = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    for (let s = 0; s < steps; s++) {
      const t = s / steps, it = 1 - t;
      out.push([
        it * it * m0[0] + 2 * it * t * a[0] + t * t * m1[0],
        it * it * m0[1] + 2 * it * t * a[1] + t * t * m1[1],
      ]);
    }
  }
  return out;
}
export const LAND_SMOOTH = smoothPoly(BAY_LAND, 6);
export const WATER_SMOOTH = smoothPoly(BAY_WATER, 6);

// distance from a point to a polyline (used to keep props off the boardwalk)
export function distToPath(x: number, y: number, path: Pt[]): number {
  let best = Infinity;
  for (let i = 0; i < path.length - 1; i++) {
    const [ax, ay] = path[i], [bx, by] = path[i + 1];
    const dx = bx - ax, dy = by - ay;
    const len2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / len2));
    const px = ax + dx * t, py = ay + dy * t;
    best = Math.min(best, Math.hypot(x - px, y - py));
  }
  return best;
}
// a point on the arc-length of a polyline, plus its heading (movers follow it)
export function pathPointAt(path: Pt[], t: number): { x: number; y: number; ang: number } {
  const segs: number[] = [];
  let total = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const d = Math.hypot(path[i + 1][0] - path[i][0], path[i + 1][1] - path[i][1]);
    segs.push(d); total += d;
  }
  let want = ((t % 1) + 1) % 1 * total;
  for (let i = 0; i < segs.length; i++) {
    if (want <= segs[i]) {
      const k = want / (segs[i] || 1);
      const [ax, ay] = path[i], [bx, by] = path[i + 1];
      return { x: ax + (bx - ax) * k, y: ay + (by - ay) * k, ang: Math.atan2(by - ay, bx - ax) };
    }
    want -= segs[i];
  }
  const L = path[path.length - 1];
  return { x: L[0], y: L[1], ang: 0 };
}

// ── the world queries island.ts asks ──────────────────────────────────────
export const onBayLand = (wx: number, wy: number): boolean =>
  pointInPoly(wx, wy, LAND_SMOOTH) && !pointInPoly(wx, wy, WATER_SMOOTH);

export function bayDistrictAt(wx: number, wy: number): BayBiome | null {
  if (!onBayLand(wx, wy)) return null;
  for (const r of BAY_REGIONS) if (pointInPoly(wx, wy, r.poly)) return r.id;
  return 'beach';   // undeveloped sand between the districts
}

// somewhere a prop may legally stand: on land, off the water, off the paths
export function bayPlaceable(wx: number, wy: number, clear = 40): boolean {
  if (!onBayLand(wx, wy)) return false;
  if (distToPath(wx, wy, PROMENADE) < PROM_HALF + clear) return false;
  if (distToPath(wx, wy, TRAIL) < TRAIL_HALF + clear) return false;
  return true;
}

// the whole landmass as a closed ring, so "how far from the sea am I" is one
// polyline distance — used to band-place driftwood, dune grass and palms
export const LAND_RING: Pt[] = [...LAND_SMOOTH, LAND_SMOOTH[0]];
export const distToCoast = (x: number, y: number): number => distToPath(x, y, LAND_RING);

const LAND_BOX = (() => {
  let a = Infinity, b = -Infinity, c = Infinity, d = -Infinity;
  for (const [x, y] of LAND_SMOOTH) { a = Math.min(a, x); b = Math.max(b, x); c = Math.min(c, y); d = Math.max(d, y); }
  return [a, b, c, d] as const;
})();

// rejection-sample anywhere on the island — this is what fills the wide open
// sand BETWEEN the districts, which a per-region scatter can never reach.
// band: optional [minDistToCoast, maxDistToCoast] so a caller can ask for
// "the shoreline" or "well inland" without hand-authoring a polygon.
export function scatterLand(n: number, rnd: () => number, clear = 40, band?: [number, number], o?: ScatterOpts): Pt[] {
  const [minX, maxX, minY, maxY] = LAND_BOX;
  const out: Pt[] = [];
  for (let tries = 0; tries < n * 90 && out.length < n; tries++) {
    const x = minX + rnd() * (maxX - minX), y = minY + rnd() * (maxY - minY);
    if (!bayPlaceable(x, y, clear)) continue;
    if (band) { const d = distToCoast(x, y); if (d < band[0] || d > band[1]) continue; }
    if (!passes(x, y, o)) continue;
    take(x, y, o);
    out.push([x, y]);
  }
  return out;
}

// a clump around a point — groves and rock piles read far better than an even
// dusting when you are looking straight down at them
export function clusterAt(cx: number, cy: number, n: number, radius: number, rnd: () => number, clear = 30, o?: ScatterOpts): Pt[] {
  const out: Pt[] = [];
  for (let tries = 0; tries < n * 40 && out.length < n; tries++) {
    const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * radius;
    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
    if (!bayPlaceable(x, y, clear)) continue;
    if (!passes(x, y, o)) continue;
    take(x, y, o);
    out.push([x, y]);
  }
  return out;
}

// ── prop separation ────────────────────────────────────────────────────────
// Nothing used to stop two scatter passes landing a cabana inside a palm, or
// four thatch huts inside each other: bayPlaceable only knew about the
// coastline and the paths. A measured audit found 125 pairs of large props
// overlapping by more than 45% of their eat radii. Every scatter now claims
// the ground it uses in a coarse spatial hash and refuses to sample on top of
// something already there.
const CELL = 400;                       // world units; a 3D radius of 10 is 200 world
interface Claim { x: number; y: number; r: number; }
const claims = new Map<string, Claim[]>();
const cellKey = (x: number, y: number) => `${Math.floor(x / CELL)},${Math.floor(y / CELL)}`;

export function resetPlacement(): void { claims.clear(); }

/** rWorld is the prop's footprint in WORLD units (3D radius × 20). */
export function spotFree(x: number, y: number, rWorld: number): boolean {
  const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL);
  const reach = Math.ceil((rWorld + 260) / CELL);
  for (let i = -reach; i <= reach; i++) for (let j = -reach; j <= reach; j++) {
    const bucket = claims.get(`${cx + i},${cy + j}`);
    if (!bucket) continue;
    for (const c of bucket) {
      const need = (c.r + rWorld) * 0.82;   // allow a little interlock; forbid burial
      const dx = c.x - x, dy = c.y - y;
      if (dx * dx + dy * dy < need * need) return false;
    }
  }
  return true;
}
/** The BURIAL test, for hand-authored drops. `spotFree` refuses any contact at
 *  all, which is right for a random scatter and catastrophic for authored
 *  dressing — gating drop() on it deleted two thirds of Pirate Bay, because a
 *  villa's claim circle is 120 units wide and the loungers belong against it.
 *  This refuses only what would be swallowed: a torch inside the galleon's
 *  hull, a fountain inside a tiki bar. Touching is fine. Vanishing is not. */
export function spotOpen(x: number, y: number, rWorld: number): boolean {
  const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL);
  const reach = Math.ceil((rWorld + 260) / CELL);
  for (let i = -reach; i <= reach; i++) for (let j = -reach; j <= reach; j++) {
    const bucket = claims.get(`${cx + i},${cy + j}`);
    if (!bucket) continue;
    for (const c of bucket) {
      const dx = c.x - x, dy = c.y - y;
      // An exact-position claim is your own WHATEVER its radius: the scatter
      // passes claim their points at `sep` (the ground a prop reserves) while
      // drop() asks at the eat radius, and the two are not the same number for
      // a shed or a chalet. Matching on radius made every sep != r drop refuse
      // to exist, which is why round 5's crew forced its drops past this test —
      // and lost the burial check with it (Powder: 12 more props inside chalets).
      if (dx === 0 && dy === 0) continue;
      const need = Math.max((c.r + rWorld) * 0.45, Math.max(c.r, rWorld) * 0.62);
      if (dx * dx + dy * dy < need * need) return false;
    }
  }
  return true;
}
export function claimSpot(x: number, y: number, rWorld: number): void {
  const k = cellKey(x, y);
  const bucket = claims.get(k);
  if (bucket) bucket.push({ x, y, r: rWorld }); else claims.set(k, [{ x, y, r: rWorld }]);
}

export interface ScatterOpts {
  /** the prop's 3D edible radius — enables overlap rejection when set */
  sep?: number;
  /** districts this prop may NOT land in (beach clutter belongs on the beach) */
  avoid?: BayBiome[];
}
const passes = (x: number, y: number, o?: ScatterOpts): boolean => {
  if (o?.avoid?.length) { const d = bayDistrictAt(x, y); if (d && o.avoid.includes(d)) return false; }
  if (o?.sep !== undefined && !spotFree(x, y, o.sep * 20)) return false;
  return true;
};
const take = (x: number, y: number, o?: ScatterOpts): void => {
  if (o?.sep !== undefined) claimSpot(x, y, o.sep * 20);
};

// rejection-sample N legal points inside a region — organic scatter, no grid
export function scatterInRegion(r: BayRegion, n: number, rnd: () => number, clear = 40, o?: ScatterOpts): Pt[] {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const [x, y] of r.poly) {
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  const out: Pt[] = [];
  for (let tries = 0; tries < n * 60 && out.length < n; tries++) {
    const x = minX + rnd() * (maxX - minX), y = minY + rnd() * (maxY - minY);
    if (!pointInPoly(x, y, r.poly)) continue;
    if (!bayPlaceable(x, y, clear)) continue;
    if (!passes(x, y, o)) continue;
    take(x, y, o);
    out.push([x, y]);
  }
  return out;
}
