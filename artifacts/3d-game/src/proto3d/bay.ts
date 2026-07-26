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

// THE BAY — sheltered water cut into the land, open to the east
export const BAY_WATER: Pt[] = [
  [7400, 3400], [8100, 4100], [8500, 5000], [8600, 6000], [8300, 7000],
  [7700, 7900], [6900, 8500], [6300, 9100], [6900, 9500], [7900, 9450],
  [8900, 9100], [9600, 8500], [9900, 9000], [9100, 9700], [7900, 10100],
  [6600, 10050], [5600, 9550], [5100, 8700], [5100, 7600], [5500, 6400],
  [6000, 5200], [6600, 4200],
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
  { id: 'party', name: 'DANCE COVE', density: 1.3,
    poly: [[6500, 10150], [7700, 10280], [8600, 10400], [8450, 10760], [7100, 10820], [6200, 10520]] },
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
export const PROMENADE: Pt[] = [
  [6600, 1900], [7300, 2900], [7900, 3900], [8600, 4900], [8800, 6100],
  [8500, 7300], [7900, 8300], [7100, 9000], [6300, 9600], [5500, 9900],
];
export const TRAIL: Pt[] = [
  [6200, 3500], [5000, 4200], [4000, 5200], [3200, 6200], [2700, 7400], [3400, 8600],
];
export const PROM_HALF = 300;    // boardwalk half-width, world units
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
export function pointInPoly(x: number, y: number, poly: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
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
export function scatterLand(n: number, rnd: () => number, clear = 40, band?: [number, number]): Pt[] {
  const [minX, maxX, minY, maxY] = LAND_BOX;
  const out: Pt[] = [];
  for (let tries = 0; tries < n * 90 && out.length < n; tries++) {
    const x = minX + rnd() * (maxX - minX), y = minY + rnd() * (maxY - minY);
    if (!bayPlaceable(x, y, clear)) continue;
    if (band) { const d = distToCoast(x, y); if (d < band[0] || d > band[1]) continue; }
    out.push([x, y]);
  }
  return out;
}

// a clump around a point — groves and rock piles read far better than an even
// dusting when you are looking straight down at them
export function clusterAt(cx: number, cy: number, n: number, radius: number, rnd: () => number, clear = 30): Pt[] {
  const out: Pt[] = [];
  for (let tries = 0; tries < n * 40 && out.length < n; tries++) {
    const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * radius;
    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
    if (!bayPlaceable(x, y, clear)) continue;
    out.push([x, y]);
  }
  return out;
}

// rejection-sample N legal points inside a region — organic scatter, no grid
export function scatterInRegion(r: BayRegion, n: number, rnd: () => number, clear = 40): Pt[] {
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
    out.push([x, y]);
  }
  return out;
}
