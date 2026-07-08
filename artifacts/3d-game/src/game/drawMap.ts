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

// ─── Ground renderer with an offscreen cache (Prompt 6 §1) ───────────────────
// The static ground (zones, roads, river, lagoon, rim + §2 enrichment) is
// rasterised ONCE into a world-space offscreen buffer and blitted each frame,
// instead of re-running ~1,600 path/fill/stroke ops per frame. The buffer is
// capped to BUF_MAX per side so its area stays under the iOS canvas limit
// (~16.7M px); a full 12000² buffer would be 576MB, but a scaled one is ~52MB.
// Only the animated waterfall + water shimmer are drawn live on top.

const BUF_MAX = 3600;                 // capped buffer side (world 12000 → 0.30 scale)
const BUF_SCALE = BUF_MAX / S;
let _groundBuf: HTMLCanvasElement | null = null;

// Debug: ?nocache=1 bypasses the buffer and repaints the static ground every
// frame — used to measure the before/after value the cache buys (Prompt 6 §5).
const _noCache = typeof window !== 'undefined'
  && new URLSearchParams(window.location.search).get('nocache') === '1';

/** Force the ground buffer to rebuild on the next draw (new match / resize).
 *  Map geometry is static, so this is rarely needed, but honours the §1 contract. */
export function resetGroundCache(): void { _groundBuf = null; }

function _ensureGroundBuffer(): HTMLCanvasElement {
  if (_groundBuf) return _groundBuf;
  const buf = document.createElement('canvas');
  buf.width  = Math.round(S * BUF_SCALE);
  buf.height = Math.round(S * BUF_SCALE);
  const bc = buf.getContext('2d')!;
  bc.save();
  bc.scale(BUF_SCALE, BUF_SCALE);     // draw in world coords, downscaled into the buffer
  _paintStaticGround(bc);
  bc.restore();
  _groundBuf = buf;
  return buf;
}

/** Draw the full ground layer into ctx (world-space camera transform must be applied). */
export function drawVectorGround(
  ctx: CanvasRenderingContext2D,
  clock: number,
  camZoom: number,   // eslint-disable-line @typescript-eslint/no-unused-vars
  forceRebuild = false,
): void {
  if (_noCache) {
    // Debug A/B: repaint the full static ground every frame (uncached cost).
    ctx.save();
    _paintStaticGround(ctx);
    ctx.restore();
  } else {
    if (forceRebuild) _groundBuf = null;
    const buf = _ensureGroundBuffer();
    // Blit the cached static ground: one drawImage vs. ~1,600 ops/frame.
    const prevSmooth = ctx.imageSmoothingEnabled;
    const prevQual   = ctx.imageSmoothingQuality;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(buf, 0, 0, buf.width, buf.height, 0, 0, S, S);
    ctx.imageSmoothingEnabled = prevSmooth;
    ctx.imageSmoothingQuality = prevQual;
  }

  // Animated waterfall (live — needs clock)
  const wpx = ISLAND_CTRL[WATERFALL_IDX][0];
  const wpy = ISLAND_CTRL[WATERFALL_IDX][1];
  _drawWaterfall(ctx, wpx, wpy, clock);

  // Alive Pack §10: slowly drifting shimmer bands on water bodies
  _drawWaterShimmer(ctx, clock);
}

function _paintStaticGround(cc: CanvasRenderingContext2D): void {
  // ─ 1. Island base fill — meadow with a soft top-left light gradient ─────────
  tracIslandPath(cc);
  cc.save();
  cc.clip();
  const baseGrd = cc.createLinearGradient(0, 0, S, S);
  baseGrd.addColorStop(0,    _lighten(COL.meadow, 0.11));
  baseGrd.addColorStop(0.55, COL.meadow);
  baseGrd.addColorStop(1,    _darken(COL.meadow, 0.07));
  cc.fillStyle = baseGrd;
  cc.fillRect(0, 0, S, S);
  cc.restore();

  // ─ 2. Zone fills — gradient + feathered edges (Prompt 6 §2) ────────────────
  _fillZoneRich(cc, ZONE_PARK_R,     COL.park);
  _fillZoneRich(cc, ZONE_FOREST_R,   COL.forest);
  _fillZoneRich(cc, ZONE_BEACH_R,    COL.sand,     true);
  _fillZoneRich(cc, ZONE_DOWNTOWN_R, COL.pavement, true);

  // ─ 2b. Soft baked grass texture over the green surface (low-contrast) ──────
  _bakeGrassTexture(cc);
  // Keep sand + downtown understated: restore their clean fills over any specks.
  _fillZoneRich(cc, ZONE_BEACH_R,    COL.sand,     true);
  _fillZoneRich(cc, ZONE_DOWNTOWN_R, COL.pavement, true);

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

// ─── Prompt 6 §2 enrichment helpers (all baked once into the ground buffer) ──

/** Shade a #RRGGBB toward white (amt>0) or black (amt<0). */
function _shade(hex: string, amt: number): string {
  const h = hex.replace('#', '');
  let r = parseInt(h.slice(0, 2), 16);
  let g = parseInt(h.slice(2, 4), 16);
  let b = parseInt(h.slice(4, 6), 16);
  const t = amt < 0 ? 0 : 255;
  const p = Math.abs(amt);
  r = Math.round(r + (t - r) * p);
  g = Math.round(g + (t - g) * p);
  b = Math.round(b + (t - b) * p);
  return `rgb(${r},${g},${b})`;
}
const _lighten = (hex: string, a: number) => _shade(hex, a);
const _darken  = (hex: string, a: number) => _shade(hex, -a);

/** Fill a zone with a top-left→bottom-right gradient and feathered (blurred) edges. */
function _fillZoneRich(
  cc: CanvasRenderingContext2D,
  r: readonly [number, number, number, number],
  color: string,
  understated = false,
): void {
  cc.save();
  tracIslandPath(cc);
  cc.clip();
  const grd = cc.createLinearGradient(r[0], r[1], r[2], r[3]);
  grd.addColorStop(0, _lighten(color, understated ? 0.05 : 0.10));
  grd.addColorStop(1, _darken(color,  understated ? 0.03 : 0.06));
  cc.fillStyle = grd;
  // Blur softens the rectangle edges → feathered transitions into the meadow.
  cc.filter = understated ? 'blur(28px)' : 'blur(46px)';
  cc.fillRect(r[0] - 24, r[1] - 24, (r[2] - r[0]) + 48, (r[3] - r[1]) + 48);
  cc.filter = 'none';
  cc.restore();
}

/** Bake a soft, low-contrast grass speckle over the whole island (seeded). */
function _bakeGrassTexture(cc: CanvasRenderingContext2D): void {
  cc.save();
  tracIslandPath(cc);
  cc.clip();
  let seed = 1337;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  const N = 5200;
  for (let i = 0; i < N; i++) {
    const x = rnd() * S;
    const y = rnd() * S;
    const rr = 9 + rnd() * 26;
    cc.fillStyle = rnd() > 0.5 ? 'rgba(255,255,255,0.040)' : 'rgba(38,66,34,0.048)';
    cc.beginPath();
    cc.ellipse(x, y, rr, rr * 0.68, 0, 0, Math.PI * 2);
    cc.fill();
  }
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

// ─── Prompt 6 §3: animated waterfall (scrolling flow + glow + pooled mist) ───
interface Mist { x: number; y: number; vy: number; life: number; max: number; r: number; }
const _mist: Mist[] = [];
let _wfLast = 0;

/** Clear transient waterfall state (mist pool + clock ref) between rounds. */
export function resetWaterfallState(): void { _mist.length = 0; _wfLast = 0; }

function _drawWaterfall(ctx: CanvasRenderingContext2D, wx: number, wy: number, clock: number): void {
  const dt = Math.min(100, Math.max(0, clock - _wfLast));
  _wfLast = clock;

  ctx.save();
  ctx.translate(wx, wy);

  // 1. soft blue-white glow behind the falls
  const glow = ctx.createRadialGradient(0, 90, 18, 0, 90, 250);
  glow.addColorStop(0,   'rgba(190,235,255,0.55)');
  glow.addColorStop(0.5, 'rgba(127,212,232,0.26)');
  glow.addColorStop(1,   'rgba(127,212,232,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.ellipse(0, 100, 135, 300, 0, 0, Math.PI * 2);
  ctx.fill();

  // 2. flowing water column: clip a tapering falls region, scroll bright bands down
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-96, -50); ctx.lineTo(96, -50);
  ctx.lineTo(70, 360);  ctx.lineTo(-70, 360);
  ctx.closePath();
  ctx.clip();
  const colGrd = ctx.createLinearGradient(0, -50, 0, 360);
  colGrd.addColorStop(0, '#93E2F3');
  colGrd.addColorStop(1, '#4FA6CB');
  ctx.fillStyle = colGrd;
  ctx.fillRect(-96, -50, 192, 410);

  const bandH = 72;
  const off = (clock / 260) % bandH;         // scroll offset → downward flow
  ctx.globalCompositeOperation = 'lighter';
  for (let y = -50 - bandH + off; y < 360; y += bandH) {
    const g = ctx.createLinearGradient(0, y, 0, y + bandH);
    g.addColorStop(0,   'rgba(255,255,255,0)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.34)');
    g.addColorStop(1,   'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-96, y, 192, bandH);
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.restore();

  // 3. mist / foam at the base — small reusable pool (capped at 26)
  for (let i = _mist.length - 1; i >= 0; i--) {
    const m = _mist[i];
    m.life += dt;
    if (m.life >= m.max) { _mist.splice(i, 1); continue; }
    m.y += (m.vy * dt) / 1000;
    const p = m.life / m.max;
    ctx.globalAlpha = 0.42 * (1 - p);
    ctx.fillStyle = '#E9F6FF';
    ctx.beginPath();
    ctx.arc(m.x + Math.sin((m.life + i * 90) / 260) * 10, m.y, m.r + p * 10, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  if (_mist.length < 26) {
    _mist.push({
      x: (Math.random() - 0.5) * 130,
      y: 320 + Math.random() * 26,
      vy: -14 - Math.random() * 22,       // foam puffs drift up and fade
      life: 0,
      max: 650 + Math.random() * 500,
      r: 8 + Math.random() * 14,
    });
  }

  ctx.restore();
}

// ─── Alive Pack §10: animated water shimmer ─────────────────────────────────

function _drawWaterShimmer(ctx: CanvasRenderingContext2D, clock: number): void {
  ctx.save();
  tracIslandPath(ctx);
  ctx.clip();

  // Lagoon: a single soft highlight drifts in a slow ellipse
  const lagPhase = clock / 3400;
  const shimX = LAGOON_CX + Math.cos(lagPhase) * LAGOON_RX * 0.32;
  const shimY = LAGOON_CY + Math.sin(lagPhase * 0.73) * LAGOON_RY * 0.38;
  const lagGrd = ctx.createRadialGradient(shimX, shimY, 0, shimX, shimY, LAGOON_RX * 0.58);
  lagGrd.addColorStop(0, 'rgba(255,255,255,0.17)');
  lagGrd.addColorStop(0.6, 'rgba(255,255,255,0.06)');
  lagGrd.addColorStop(1,   'rgba(255,255,255,0)');
  ctx.fillStyle = lagGrd;
  ctx.beginPath();
  ctx.ellipse(LAGOON_CX, LAGOON_CY, LAGOON_RX, LAGOON_RY, 0, 0, Math.PI * 2);
  ctx.fill();

  // River: a shimmer band travels downstream (looping 0→1 along path)
  const rPhase = (clock / 2200) % 1;
  const nSeg = RIVER_PATH.length - 1;
  for (let i = 0; i < nSeg; i++) {
    const segT = i / nSeg;
    // Band travels: render only a 0.25-wide window that moves with rPhase
    const delta = ((segT - rPhase + 1) % 1);
    if (delta > 0.28) continue;
    const alpha = 0.11 * (1 - delta / 0.28);
    const [rx, ry] = RIVER_PATH[i];
    ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(3)})`;
    ctx.beginPath();
    ctx.ellipse(rx, ry, RIVER_HALF_W * 0.75, RIVER_HALF_W * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
  }

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
