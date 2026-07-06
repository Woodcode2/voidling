// drawMap.ts — Phase 4: vector ground renderer.
// Draws the island and all zones as crisp canvas paths at any zoom.
// Replaces the painted island_map.png in the gameplay path entirely.

import {
  ISLAND_CTRL, WATERFALL_IDX,
  ZONE_DOWNTOWN_R, ZONE_PARK_R, ZONE_FOREST_R, ZONE_BEACH_R,
  LAGOON_CX, LAGOON_CY, LAGOON_RX, LAGOON_RY,
  RIVER_PATH, RIVER_HALF_W, POND_CX, POND_CY, POND_R,
  ROAD_CENTERS,
} from './mapData';
import { CONFIG } from './config';

const S = CONFIG.MAP_SIZE;

// Ground color palette (from spec)
const COL = {
  meadow:   '#A8CD9F',
  park:     '#B7DBA8',
  forest:   '#8FBF88',
  sand:     '#F2DFA7',
  pavement: '#EAE4D6',
  road:     '#939CAB',
  rimWhite: '#FFFFFF',
  cliff:    '#6B5B73',
  waterS:   '#7FD4E8',
  waterD:   '#5BB8D4',
  roadDash: 'rgba(255,255,255,0.72)',
};

// ─── Smooth island path helper ────────────────────────────────────────────────

/** Trace the island boundary as a smooth closed path on ctx (no stroke/fill). */
export function tracIslandPath(ctx: CanvasRenderingContext2D): void {
  const pts = ISLAND_CTRL;
  const n   = pts.length;
  ctx.beginPath();
  const mx0 = [(pts[n - 1][0] + pts[0][0]) / 2, (pts[n - 1][1] + pts[0][1]) / 2];
  ctx.moveTo(mx0[0], mx0[1]);
  for (let i = 0; i < n; i++) {
    const cp   = pts[i];
    const next = pts[(i + 1) % n];
    const mx   = (cp[0] + next[0]) / 2;
    const my   = (cp[1] + next[1]) / 2;
    ctx.quadraticCurveTo(cp[0], cp[1], mx, my);
  }
  ctx.closePath();
}

// ─── Ground renderer (no offscreen cache — drawn directly into world-space ctx) ───
// Drawing only the visible viewport region via the camera transform clip means
// per-frame cost is low even without a cache. A 12000×12000 offscreen canvas
// would consume ~576 MB raw and could OOM on mobile, so we draw directly.

/** Draw the full ground layer into ctx (world-space camera transform must be applied).
 *  @param camZoom — accepted for API compatibility, not used for caching.
 */
export function drawVectorGround(
  ctx: CanvasRenderingContext2D,
  clock: number,
  camZoom: number,   // eslint-disable-line @typescript-eslint/no-unused-vars
  forceRebuild = false,  // eslint-disable-line @typescript-eslint/no-unused-vars
): void {
  _buildGroundCache(ctx);

  // Animated waterfall (not cached — needs clock)
  const wpx = ISLAND_CTRL[WATERFALL_IDX][0];
  const wpy = ISLAND_CTRL[WATERFALL_IDX][1];
  _drawWaterfall(ctx, wpx, wpy, clock);
}

function _buildGroundCache(cc: CanvasRenderingContext2D): void {
  // ─ 1. Island base fill ─────────────────────────────────────────────────────
  tracIslandPath(cc);
  cc.fillStyle = COL.meadow;
  cc.fill();

  // ─ 2. Zone fills (clipped to island) ──────────────────────────────────────
  _fillZone(cc, ZONE_PARK_R,     COL.park);
  _fillZone(cc, ZONE_FOREST_R,   COL.forest);
  _fillZone(cc, ZONE_BEACH_R,    COL.sand);
  _fillZone(cc, ZONE_DOWNTOWN_R, COL.pavement);

  // ─ 3. River ───────────────────────────────────────────────────────────────
  cc.save();
  tracIslandPath(cc);
  cc.clip();

  // Pond (source)
  const pgrd = cc.createRadialGradient(POND_CX, POND_CY, POND_R * 0.3, POND_CX, POND_CY, POND_R);
  pgrd.addColorStop(0, COL.waterD);
  pgrd.addColorStop(1, COL.waterS);
  cc.fillStyle = pgrd;
  cc.beginPath();
  cc.ellipse(POND_CX, POND_CY, POND_R, POND_R * 0.85, 0, 0, Math.PI * 2);
  cc.fill();

  // River channel (outer = shallow, inner = deep)
  cc.lineCap = 'round'; cc.lineJoin = 'round';
  _riverStroke(cc, RIVER_HALF_W * 2, COL.waterS);
  _riverStroke(cc, RIVER_HALF_W * 1.1, COL.waterD);

  cc.restore();

  // ─ 4. Lagoon ──────────────────────────────────────────────────────────────
  cc.save();
  tracIslandPath(cc);
  cc.clip();
  const lgrd = cc.createRadialGradient(
    LAGOON_CX, LAGOON_CY, LAGOON_RX * 0.2,
    LAGOON_CX, LAGOON_CY, LAGOON_RX,
  );
  lgrd.addColorStop(0, COL.waterD);
  lgrd.addColorStop(1, COL.waterS);
  cc.fillStyle = lgrd;
  cc.beginPath();
  cc.ellipse(LAGOON_CX, LAGOON_CY, LAGOON_RX, LAGOON_RY, 0, 0, Math.PI * 2);
  cc.fill();
  // Lagoon shore hint
  cc.strokeStyle = 'rgba(255,255,255,0.25)'; cc.lineWidth = 20;
  cc.beginPath();
  cc.ellipse(LAGOON_CX, LAGOON_CY, LAGOON_RX, LAGOON_RY, 0, 0, Math.PI * 2);
  cc.stroke();
  cc.restore();

  // ─ 5. Roads ───────────────────────────────────────────────────────────────
  cc.save();
  tracIslandPath(cc);
  cc.clip();

  const ROAD_W = CONFIG.ROAD_WIDTH;
  const MARGIN = (S - (CONFIG.GRID * CONFIG.BLOCK_SIZE + (CONFIG.GRID - 1) * ROAD_W)) / 2;

  // Road fills
  cc.fillStyle = COL.road;
  for (const rc of ROAD_CENTERS) {
    // Horizontal road
    cc.fillRect(MARGIN, rc - ROAD_W / 2, S - MARGIN * 2, ROAD_W);
    // Vertical road
    cc.fillRect(rc - ROAD_W / 2, MARGIN, ROAD_W, S - MARGIN * 2);
  }

  // White centerline dashes
  cc.strokeStyle = COL.roadDash;
  cc.lineWidth   = 10;
  cc.setLineDash([90, 90]);
  cc.lineCap = 'butt';
  for (const rc of ROAD_CENTERS) {
    // Horizontal
    cc.beginPath(); cc.moveTo(MARGIN, rc); cc.lineTo(S - MARGIN, rc); cc.stroke();
    // Vertical
    cc.beginPath(); cc.moveTo(rc, MARGIN); cc.lineTo(rc, S - MARGIN); cc.stroke();
  }
  cc.setLineDash([]);

  // Road curb edges (lighter inner edges)
  cc.strokeStyle = 'rgba(255,255,255,0.18)';
  cc.lineWidth   = 6;
  cc.lineCap = 'butt';
  for (const rc of ROAD_CENTERS) {
    const hw = ROAD_W / 2;
    cc.beginPath(); cc.moveTo(MARGIN, rc - hw); cc.lineTo(S - MARGIN, rc - hw); cc.stroke();
    cc.beginPath(); cc.moveTo(MARGIN, rc + hw); cc.lineTo(S - MARGIN, rc + hw); cc.stroke();
    cc.beginPath(); cc.moveTo(rc - hw, MARGIN); cc.lineTo(rc - hw, S - MARGIN); cc.stroke();
    cc.beginPath(); cc.moveTo(rc + hw, MARGIN); cc.lineTo(rc + hw, S - MARGIN); cc.stroke();
  }

  // Crosswalk stripes at each junction
  cc.fillStyle = 'rgba(255,255,255,0.32)';
  for (const rx of ROAD_CENTERS) {
    for (const ry of ROAD_CENTERS) {
      const hw = ROAD_W / 2;
      const stripeW = 14; const stripeGap = 24;
      // North & South approaches
      for (let i = 0; i < 4; i++) {
        const sx = rx - hw + 8 + i * stripeGap;
        cc.fillRect(sx, ry - hw - 30, stripeW, 26);
        cc.fillRect(sx, ry + hw + 4,  stripeW, 26);
      }
      // East & West approaches
      for (let i = 0; i < 4; i++) {
        const sy = ry - hw + 8 + i * stripeGap;
        cc.fillRect(rx - hw - 30, sy, 26, stripeW);
        cc.fillRect(rx + hw + 4,  sy, 26, stripeW);
      }
    }
  }

  cc.restore();

  // ─ 6. Island rim: white sticker + cliff band ──────────────────────────────
  cc.save();
  tracIslandPath(cc);
  // Outer cliff glow
  cc.strokeStyle = COL.cliff;
  cc.lineWidth   = 200;
  cc.globalAlpha = 0.55;
  cc.stroke();
  // Mid cliff band
  cc.strokeStyle = '#4A3A55';
  cc.lineWidth   = 120;
  cc.globalAlpha = 0.6;
  cc.stroke();
  // White sticker rim
  cc.strokeStyle = COL.rimWhite;
  cc.lineWidth   = 60;
  cc.globalAlpha = 0.92;
  cc.lineJoin = 'round';
  cc.stroke();
  cc.restore();

  // ─ 7. Waterfall platform hint (static part; animated part drawn each frame) ─
  const wpx = ISLAND_CTRL[WATERFALL_IDX][0];
  const wpy = ISLAND_CTRL[WATERFALL_IDX][1];
  cc.save();
  const wGrd = cc.createLinearGradient(wpx - 120, wpy - 80, wpx + 120, wpy + 280);
  wGrd.addColorStop(0, 'rgba(91,184,212,0.85)');
  wGrd.addColorStop(0.7, 'rgba(127,212,232,0.4)');
  wGrd.addColorStop(1, 'rgba(127,212,232,0)');
  cc.fillStyle = wGrd;
  cc.beginPath();
  cc.ellipse(wpx, wpy + 80, 110, 320, -0.3, 0, Math.PI * 2);
  cc.fill();
  cc.restore();
}

function _fillZone(
  cc: CanvasRenderingContext2D,
  r: readonly [number, number, number, number],
  color: string,
): void {
  cc.save();
  tracIslandPath(cc);
  cc.clip();
  cc.fillStyle = color;
  cc.fillRect(r[0], r[1], r[2] - r[0], r[3] - r[1]);
  cc.restore();
}

function _riverStroke(cc: CanvasRenderingContext2D, lw: number, color: string): void {
  cc.strokeStyle = color;
  cc.lineWidth   = lw;
  cc.beginPath();
  for (let i = 0; i < RIVER_PATH.length; i++) {
    const [rx, ry] = RIVER_PATH[i];
    i === 0 ? cc.moveTo(rx, ry) : cc.lineTo(rx, ry);
  }
  cc.stroke();
}

function _drawWaterfall(ctx: CanvasRenderingContext2D, wx: number, wy: number, clock: number): void {
  ctx.save();
  ctx.translate(wx, wy);
  // Animated foam dots falling outward from island rim
  for (let i = 0; i < 7; i++) {
    const phase = ((clock / 500 + i * 0.7) % 1);
    const fy    = -60 + phase * 380;
    const fx    = Math.sin(clock / 350 + i * 1.3) * 32;
    ctx.globalAlpha = 0.75 * (1 - phase * 0.8);
    ctx.fillStyle   = '#DCEEFF';
    ctx.beginPath();
    ctx.arc(fx, fy, 9 + (1 - phase) * 14, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

// ─── Debug terrain overlay ───────────────────────────────────────────────────
import { GRID_W, GRID_H, getRawTerrainGrid } from './mapData';

/** Debug overlay: tints each terrain cell with a semi-transparent color.
 *  Activate with ?debug=terrain in the URL. */
export function drawDebugTerrainVec(ctx: CanvasRenderingContext2D): void {
  const grid = getRawTerrainGrid();
  if (!grid) return;
  const cw = S / GRID_W;
  const ch = S / GRID_H;
  const COLORS = [
    '',                           // 0 SPACE — skip
    'rgba(30,80,255,0.5)',        // 1 WATER — blue
    'rgba(255,210,20,0.45)',      // 2 SAND — yellow
    'rgba(50,50,50,0.5)',         // 3 ROAD — dark
    'rgba(30,180,40,0.45)',       // 4 GRASS — green
    'rgba(200,165,110,0.4)',      // 5 PAVEMENT — tan
  ];
  ctx.save();
  for (let gy = 0; gy < GRID_H; gy++) {
    for (let gx = 0; gx < GRID_W; gx++) {
      const t = grid[gy * GRID_W + gx];
      if (!COLORS[t]) continue;
      ctx.fillStyle = COLORS[t];
      ctx.fillRect(gx * cw, gy * ch, cw, ch);
    }
  }
  ctx.restore();
}
