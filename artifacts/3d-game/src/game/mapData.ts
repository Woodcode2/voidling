// mapData.ts — Phase 4: vector island geometry in world coordinates.
// Single source of truth for island shape, zones, roads, river, and terrain.
// All coordinates are in the 12000×12000 world space (MAP_SIZE = 12000).

import { CONFIG } from './config';

const S = CONFIG.MAP_SIZE; // 12000

// ─── Grid constants (mirror world.ts so everything stays in sync) ─────────────
const BLOCK  = CONFIG.BLOCK_SIZE;   // 1600
const ROAD_W = CONFIG.ROAD_WIDTH;   // 200
const STRIDE = BLOCK + ROAD_W;      // 1800
const MARGIN = (S - (CONFIG.GRID * BLOCK + (CONFIG.GRID - 1) * ROAD_W)) / 2; // 700

// Road center positions (identical to world.ts ROAD_CENTERS)
export const ROAD_CENTERS: number[] = [];
for (let i = 0; i < CONFIG.GRID - 1; i++) {
  ROAD_CENTERS.push(MARGIN + BLOCK + ROAD_W / 2 + i * STRIDE);
}
// [2400, 4200, 6000, 7800, 9600]

// Block left/top edges
const bx0 = (gx: number) => MARGIN + gx * STRIDE;  // left edge of block gx
const by0 = (gy: number) => MARGIN + gy * STRIDE;  // top edge of block gy
const bx1 = (gx: number) => bx0(gx) + BLOCK;       // right edge
const by1 = (gy: number) => by0(gy) + BLOCK;       // bottom edge

// ─── Island polygon control points (world space) ──────────────────────────────
// Smooth closed curve through 14 points defines the island boundary.
// Rendered as quadratic bezier (midpoint method) for perfectly crisp edges.
export const ISLAND_CTRL: [number, number][] = [
  [ 980, 3200],  //  0: west, upper
  [ 580, 5900],  //  1: far west, center
  [1000, 8900],  //  2: west, lower
  [2100, 10950], //  3: southwest (beach corner)
  [4500, 11550], //  4: south, west-center
  [6600, 11650], //  5: south, center (deepest)
  [8300, 11350], //  6: south-east beach
  [9800, 10150], //  7: southeast — WATERFALL exit
  [11400, 8700], //  8: east, lower
  [11550, 6200], //  9: far east, center
  [11050, 3750], // 10: east, upper
  [ 9350,  400], // 11: northeast (forest corner)
  [ 6000,  150], // 12: north, center
  [ 2600,  500], // 13: northwest
];

export const WATERFALL_IDX = 7;   // index of WATERFALL exit in ISLAND_CTRL
export const WATERFALL_PT = ISLAND_CTRL[WATERFALL_IDX];

// ─── Zone rectangles ─────────────────────────────────────────────────────────
// Used for terrain classification (fill priority: WATER > ROAD > SAND > FOREST > PARK > DOWNTOWN > MEADOW)

// DOWNTOWN: blocks gx=1–4, gy=1–3 (center-east quadrant)
export const ZONE_DOWNTOWN_R = [bx0(1), by0(1), bx1(4), by1(3)] as const;

// PARK: block gx=0, gy=2 (center-west)
export const ZONE_PARK_R = [bx0(0), by0(2), bx1(0), by1(2)] as const;

// FOREST: blocks gx=4–5, gy=0 (northeast)
export const ZONE_FOREST_R = [bx0(4), by0(0), bx1(5), by1(0)] as const;

// BEACH: gy=5 row (south strip)
export const ZONE_BEACH_R = [bx0(0), by0(5), bx1(5), by1(5)] as const;

// LAGOON: ellipse within beach zone
export const LAGOON_CX = bx0(1) + BLOCK * 0.65;  // ~3025
export const LAGOON_CY = by0(5) + BLOCK * 0.52;  // ~11132
export const LAGOON_RX = BLOCK * 0.52;            // ~832
export const LAGOON_RY = BLOCK * 0.38;            // ~608

// ─── River path (world space polyline) ───────────────────────────────────────
export const RIVER_HALF_W = 90; // half-width of river channel

// Pond source in the park
export const POND_CX = bx0(0) + BLOCK * 0.68; // ~1788
export const POND_CY = by0(2) + BLOCK * 0.65; // ~5740
export const POND_R  = BLOCK * 0.19;           // ~304

export const RIVER_PATH: [number, number][] = [
  [POND_CX, POND_CY],                             // 0: park pond
  [bx0(1) + BLOCK * 0.15, by0(2) + BLOCK * 0.88],// 1: meander east
  [bx0(2) + BLOCK * 0.05, by0(3) + BLOCK * 0.25],// 2: turn southeast
  [bx0(3) - ROAD_W * 0.4, by0(3) + BLOCK * 0.65],// 3: south
  [bx0(3) + BLOCK * 0.5,  by0(4) + BLOCK * 0.35],// 4: southeast meander
  [bx0(4) + BLOCK * 0.45, by0(4) + BLOCK * 0.82],// 5: toward beach
  [WATERFALL_PT[0] - 200, WATERFALL_PT[1] - 400], // 6: approach waterfall
  [WATERFALL_PT[0], WATERFALL_PT[1]],              // 7: waterfall exit
];

// ─── Road network ────────────────────────────────────────────────────────────
// Used by terrain query + visual renderer + junction-turning AI

export interface RoadSeg { cx: number; cy: number; axis: 'h' | 'v'; len0: number; len1: number; }

export const ROAD_SEGS: RoadSeg[] = [];
for (const rc of ROAD_CENTERS) {
  // Horizontal road at y=rc spanning x = MARGIN to S-MARGIN
  ROAD_SEGS.push({ cx: S / 2, cy: rc, axis: 'h', len0: MARGIN, len1: S - MARGIN });
  // Vertical road at x=rc spanning y = MARGIN to S-MARGIN
  ROAD_SEGS.push({ cx: rc, cy: S / 2, axis: 'v', len0: MARGIN, len1: S - MARGIN });
}

// Junctions (every intersection of a horizontal + vertical road)
export interface Junction { x: number; y: number; }
export const JUNCTIONS: Junction[] = [];
for (const rx of ROAD_CENTERS) {
  for (const ry of ROAD_CENTERS) {
    JUNCTIONS.push({ x: rx, y: ry });
  }
}

// Dense City: house & building lots are generated at runtime per-block in
// world.ts (generateLots), which knows each day's block types. The old static
// road-frontage HOUSE_LOTS generator was removed as dead code.

// ─── Geometry helpers ────────────────────────────────────────────────────────

/** Evaluate the smooth island polygon as a series of midpoint-quadratic bezier segments.
 *  Returns an array of [x,y] points on the curve (for hit testing). */
export function buildIslandPolyApprox(steps = 120): [number, number][] {
  const pts = ISLAND_CTRL;
  const n = pts.length;
  const result: [number, number][] = [];

  // Midpoint-based quadratic bezier for each segment
  for (let i = 0; i < n; i++) {
    const cp = pts[i];
    const prev = pts[(i + n - 1) % n];
    const next = pts[(i + 1) % n];
    const mx0: [number, number] = [(prev[0] + cp[0]) / 2, (prev[1] + cp[1]) / 2];
    const mx1: [number, number] = [(cp[0] + next[0]) / 2, (cp[1] + next[1]) / 2];
    // Subdivide the quadratic bezier from mx0 → cp → mx1 into `steps/n` line segments
    const segs = Math.max(2, Math.round(steps / n));
    for (let k = 0; k < segs; k++) {
      const t = k / segs;
      const mt = 1 - t;
      const x = mt * mt * mx0[0] + 2 * mt * t * cp[0] + t * t * mx1[0];
      const y = mt * mt * mx0[1] + 2 * mt * t * cp[1] + t * t * mx1[1];
      result.push([x, y]);
    }
  }
  return result;
}

let _islandPoly: [number, number][] | null = null;
function getIslandPoly(): [number, number][] {
  if (!_islandPoly) _islandPoly = buildIslandPolyApprox(180);
  return _islandPoly;
}

/** Point-in-polygon test using ray casting (for the approximate polygon). */
function pointInPoly(poly: [number, number][], px: number, py: number): boolean {
  let inside = false;
  const n = poly.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = poly[i][0], yi = poly[i][1];
    const xj = poly[j][0], yj = poly[j][1];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/** True if the world point is inside the island. */
export function isInsideIsland(wx: number, wy: number): boolean {
  return pointInPoly(getIslandPoly(), wx, wy);
}

/** True if point is inside the lagoon ellipse. */
export function isInLagoon(wx: number, wy: number): boolean {
  const dx = (wx - LAGOON_CX) / LAGOON_RX;
  const dy = (wy - LAGOON_CY) / LAGOON_RY;
  return dx * dx + dy * dy < 1;
}

/** True if point is within the river channel (polyline + pond). */
export function isInRiver(wx: number, wy: number): boolean {
  if (Math.hypot(wx - POND_CX, wy - POND_CY) < POND_R) return true;
  const hw = RIVER_HALF_W;
  for (let i = 0; i < RIVER_PATH.length - 1; i++) {
    if (distToSeg(wx, wy, RIVER_PATH[i], RIVER_PATH[i + 1]) < hw) return true;
  }
  return false;
}

function distToSeg(px: number, py: number, a: [number, number], b: [number, number]): number {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - a[0], py - a[1]);
  let t = ((px - a[0]) * dx + (py - a[1]) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (a[0] + t * dx), py - (a[1] + t * dy));
}

/** True if point is on a road (within half road-width of any road center line). */
export function isOnRoad(wx: number, wy: number): boolean {
  const hw = ROAD_W / 2;
  for (const rc of ROAD_CENTERS) {
    // Horizontal road at y=rc
    if (Math.abs(wy - rc) < hw && wx >= MARGIN && wx <= S - MARGIN) return true;
    // Vertical road at x=rc
    if (Math.abs(wx - rc) < hw && wy >= MARGIN && wy <= S - MARGIN) return true;
  }
  return false;
}

/** Point in axis-aligned rectangle [x0, y0, x1, y1]. */
function inRect(wx: number, wy: number, r: readonly [number, number, number, number]): boolean {
  return wx >= r[0] && wx <= r[2] && wy >= r[1] && wy <= r[3];
}

// ─── Terrain constants (identical to existing TERRAIN in islandMap.ts) ────────
export const TERRAIN = {
  SPACE:    0,
  WATER:    1,
  SAND:     2,
  ROAD:     3,
  GRASS:    4,
  PAVEMENT: 5,
} as const;
export type TerrainClass = (typeof TERRAIN)[keyof typeof TERRAIN];

/**
 * Geometry-based terrain classification.
 * Priority: SPACE > WATER > ROAD > SAND > FOREST/PARK/GRASS > DOWNTOWN/PAVEMENT > MEADOW/GRASS
 */
export function terrainAtGeom(wx: number, wy: number): TerrainClass {
  if (!isInsideIsland(wx, wy)) return TERRAIN.SPACE;
  if (isInLagoon(wx, wy) || isInRiver(wx, wy)) return TERRAIN.WATER;
  if (isOnRoad(wx, wy)) return TERRAIN.ROAD;
  if (inRect(wx, wy, ZONE_BEACH_R)) return TERRAIN.SAND;
  if (inRect(wx, wy, ZONE_FOREST_R) || inRect(wx, wy, ZONE_PARK_R)) return TERRAIN.GRASS;
  if (inRect(wx, wy, ZONE_DOWNTOWN_R)) return TERRAIN.PAVEMENT;
  return TERRAIN.GRASS; // default: meadow
}

// ─── 192×192 baked terrain lookup grid ───────────────────────────────────────
// Baked at startup for cheap per-frame queries via getTerrainAt().

export const GRID_W = 192;
export const GRID_H = 192;
const CELL_W = S / GRID_W;
const CELL_H = S / GRID_H;

export let _terrainGrid: Uint8Array | null = null;
let _walkableGrid: Uint8Array | null = null;

/** Direct read-only access to the baked terrain grid (for debug overlays). */
export function getRawTerrainGrid(): Uint8Array | null { return _terrainGrid; }

export function bakeTerrainGrid(): void {
  _terrainGrid  = new Uint8Array(GRID_W * GRID_H);
  _walkableGrid = new Uint8Array(GRID_W * GRID_H);
  const counts = [0, 0, 0, 0, 0, 0];
  for (let gy = 0; gy < GRID_H; gy++) {
    for (let gx = 0; gx < GRID_W; gx++) {
      const wx = (gx + 0.5) * CELL_W;
      const wy = (gy + 0.5) * CELL_H;
      const t = terrainAtGeom(wx, wy);
      _terrainGrid[gy * GRID_W + gx] = t;
      _walkableGrid[gy * GRID_W + gx] = t !== TERRAIN.SPACE ? 1 : 0;
      counts[t]++;
    }
  }
  console.log(
    '[mapData] terrain grid baked — SPACE:', counts[0], 'WATER:', counts[1],
    'SAND:', counts[2], 'ROAD:', counts[3], 'GRASS:', counts[4], 'PAVEMENT:', counts[5],
  );
}

/** Cheap grid-based terrain lookup (O(1)). */
export function getTerrainGrid(wx: number, wy: number): TerrainClass {
  if (!_terrainGrid) return terrainAtGeom(wx, wy); // fallback during startup
  const gx = Math.max(0, Math.min(GRID_W - 1, (wx / S * GRID_W) | 0));
  const gy = Math.max(0, Math.min(GRID_H - 1, (wy / S * GRID_H) | 0));
  return _terrainGrid[gy * GRID_W + gx] as TerrainClass;
}

/** True when world point is on walkable island ground. */
export function isWalkableGrid(wx: number, wy: number): boolean {
  if (!_walkableGrid) return isInsideIsland(wx, wy);
  const gx = Math.max(0, Math.min(GRID_W - 1, (wx / S * GRID_W) | 0));
  const gy = Math.max(0, Math.min(GRID_H - 1, (wy / S * GRID_H) | 0));
  return _walkableGrid[gy * GRID_W + gx] > 0;
}

/**
 * Alive Pack §A: True if wx,wy is dry land inside the island with at least `inset`
 * world-unit clearance from the rim — prevents props from spawning on water or the cliff.
 * Excludes SPACE (off-island), WATER (lagoon/river), and ROAD (optional: callers pass
 * inset=0 for road-based spawns like spawnCar).  Uses ≤6 grid lookups (O(1)).
 * Falls back gracefully before the terrain grid is baked.
 */
export function isOnIsland(wx: number, wy: number, inset = 150): boolean {
  if (!isWalkableGrid(wx, wy)) return false;
  // Exclude water bodies (lagoon, river, pond) — isWalkableGrid treats these as walkable
  if (getTerrainGrid(wx, wy) === TERRAIN.WATER) return false;
  // Cardinal neighbor checks at `inset` distance approximate an inward rim clearance
  return isWalkableGrid(wx + inset, wy) &&
         isWalkableGrid(wx - inset, wy) &&
         isWalkableGrid(wx, wy + inset) &&
         isWalkableGrid(wx, wy - inset);
}
