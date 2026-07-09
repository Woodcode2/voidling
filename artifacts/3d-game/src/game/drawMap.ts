// drawMap.ts — Phase 4: vector ground renderer.
// Draws the island and all zones as crisp canvas paths at any zoom.
// Replaces the painted island_map.png in the gameplay path entirely.

import {
  ISLAND_CTRL, WATERFALL_IDX,
  ZONE_DOWNTOWN_R, ZONE_PARK_R, ZONE_FOREST_R, ZONE_BEACH_R,
  ZONE_ZOO_R, ZONE_AIRPORT_R, ZONE_MILITARY_R,
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
  road:     '#9B9285',   // Prompt 8: warm clay-asphalt (was stark cool grey #939CAB)
  rimWhite: '#FFFFFF',
  cliff:    '#6B5B73',
  waterS:   '#7FD4E8',
  waterD:   '#5BB8D4',
  riverMid: '#8FC6D4',   // Prompt 8: soft clay-blue river band
  riverDeep:'#69A9C2',   // Prompt 8: deeper river core
  roadDash: 'rgba(243,236,218,0.5)', // Prompt 8: muted warm off-white lane paint
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
/** Returns the baked ground-buffer canvas, or null if not yet rendered.
 *  Used by the photo-mode capture path (Stage 13 §1). */
export function exportGroundBuffer(): HTMLCanvasElement | null { return _groundBuf; }

// ─── Texture tiles (async — each 2048² PNG downscaled to a small repeat tile) ─
// Tile sizes in world units; pre-scaling to BUF_SCALE pixels gives a
// reasonable repeat frequency without PatternTransform (iOS compat).
// Larger tiles = less busy grain at full opacity (Stage 13 §2).
const _TEX_TILE_W: Record<string, number> = {
  grass: 420, sand: 520, forest: 360, water: 480, street: 260, sidewalk: 180,
};
const _texTiles = new Map<string, HTMLCanvasElement>();
let _texLoadStarted = false; // idempotency guard — tiles are app-lifetime singletons

export function loadGroundTextures(base: string): void {
  if (_texLoadStarted) return; // already loading or loaded — don't re-decode
  _texLoadStarted = true;
  const b = base.endsWith('/') ? base : base + '/';
  const keys = Object.keys(_TEX_TILE_W);
  let pending = keys.length;
  for (const key of keys) {
    const img = new Image();
    img.onload = () => {
      const px = Math.max(8, Math.round(_TEX_TILE_W[key] * BUF_SCALE));
      const c  = document.createElement('canvas');
      c.width  = c.height = px;
      c.getContext('2d')!.drawImage(img, 0, 0, px, px);
      _texTiles.set(key, c);
      if (--pending <= 0) { _groundBuf = null; }
    };
    img.onerror = () => { if (--pending <= 0) { _groundBuf = null; } };
    img.src = `${b}assets/tex_${key}.png`;
  }
}

// ─── Per-match lot data (yards baked into the ground cache once per match) ────
interface GroundLot { x: number; y: number; fpR: number; }
let _groundLots: GroundLot[] = [];

/** Store suburb house-lot geometry so the next cache build can paint yards.
 *  Call right after generateLots() finishes. */
export function setMatchLots(lots: ReadonlyArray<{ x: number; y: number; fpR: number }>): void {
  _groundLots = lots.map((l) => ({ x: l.x, y: l.y, fpR: l.fpR }));
  _groundBuf  = null;
}

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
  // ─ 1. Island base — tex_grass at FULL opacity; atmosphere gradient on top ────
  //      Stage 13 §2: texture IS the surface, not an overlay.
  {
    cc.save(); tracIslandPath(cc); cc.clip();
    const gt = _texTiles.get('grass');
    if (gt) {
      const gp = cc.createPattern(gt, 'repeat');
      if (gp) { cc.fillStyle = gp; cc.fillRect(0, 0, S, S); }
    } else {
      // Fallback until texture loads
      const bgrd = cc.createLinearGradient(0, 0, S, S);
      bgrd.addColorStop(0,    _lighten(COL.meadow, 0.11));
      bgrd.addColorStop(0.55, COL.meadow);
      bgrd.addColorStop(1,    _darken(COL.meadow, 0.07));
      cc.fillStyle = bgrd; cc.fillRect(0, 0, S, S);
    }
    // Lighting atmosphere on top (always)
    const atmo = cc.createLinearGradient(0, 0, S, S);
    atmo.addColorStop(0, 'rgba(255,255,255,0.07)');
    atmo.addColorStop(1, 'rgba(0,0,0,0.06)');
    cc.fillStyle = atmo; cc.fillRect(0, 0, S, S);
    cc.restore();
  }

  // ─ 2. Zone fills — texture at FULL opacity; light atmosphere tint on top ─────
  //      Each distinct surface now reads as its own material.
  _texZone(cc, 'forest',   ZONE_FOREST_R,   COL.forest);
  _texZone(cc, 'sand',     ZONE_BEACH_R,    COL.sand,     true);
  _texZone(cc, 'sidewalk', ZONE_DOWNTOWN_R, COL.pavement, true);
  // Park uses the grass base — add colour-identity tint on top.
  _fillZoneRich(cc, ZONE_PARK_R, COL.park);

  // ─ 2b. Procedural speckle — only baked when tex_grass hasn't loaded yet ──────
  if (!_texTiles.has('grass')) _bakeGrassTexture(cc);

  // ─ 2c. Mowing-stripe tint — faint alternating bands on the grass surface ─────
  _paintMowingStripes(cc);

  // ─ 3. River (Prompt 8: soft-edged 2.5D band in clay blues) ─────────────────
  cc.save();
  tracIslandPath(cc);
  cc.clip();

  // Pond (source)
  const pgrd = cc.createRadialGradient(POND_CX, POND_CY, POND_R * 0.3, POND_CX, POND_CY, POND_R);
  pgrd.addColorStop(0, COL.riverDeep);
  pgrd.addColorStop(1, COL.riverMid);
  cc.fillStyle = pgrd;
  cc.beginPath();
  cc.ellipse(POND_CX, POND_CY, POND_R, POND_R * 0.85, 0, 0, Math.PI * 2);
  cc.fill();

  // Stage 13 §3: River channel — bank edges first (darker halo), then
  // tex_water at FULL opacity, then a depth overlay.
  cc.lineCap = 'round'; cc.lineJoin = 'round';
  cc.save();
  cc.filter = 'blur(10px)';
  _riverStroke(cc, RIVER_HALF_W * 3.0, 'rgba(30,70,100,0.55)');
  cc.filter = 'none';
  cc.restore();

  {
    const wt = _texTiles.get('water');
    if (wt) {
      // Full-opacity water texture as the primary river surface.
      const wp = cc.createPattern(wt, 'repeat');
      if (wp) {
        cc.strokeStyle = wp; cc.globalAlpha = 1.0;
        cc.lineWidth = RIVER_HALF_W * 2.2;
        cc.lineCap = 'round'; cc.lineJoin = 'round';
        cc.beginPath();
        for (let i = 0; i < RIVER_PATH.length; i++) {
          const [rx, ry] = RIVER_PATH[i];
          i === 0 ? cc.moveTo(rx, ry) : cc.lineTo(rx, ry);
        }
        cc.stroke();
        cc.globalAlpha = 1;
      }
    } else {
      // Fallback: clay-blue fills until texture loads.
      _riverStroke(cc, RIVER_HALF_W * 2,    COL.riverMid);
      _riverStroke(cc, RIVER_HALF_W * 1.05, COL.riverDeep);
    }
  }
  // Depth overlay — darker core tint on top of whatever surface is showing.
  _riverStroke(cc, RIVER_HALF_W * 0.8, 'rgba(25,85,130,0.28)');

  cc.restore();

  // ─ 4. Lagoon — tex_water at FULL opacity; depth overlay + bank edge ───────
  cc.save();
  tracIslandPath(cc); cc.clip();
  {
    const wt = _texTiles.get('water');
    if (wt) {
      const wp = cc.createPattern(wt, 'repeat');
      if (wp) {
        cc.fillStyle = wp; cc.globalAlpha = 1.0;
        cc.beginPath();
        cc.ellipse(LAGOON_CX, LAGOON_CY, LAGOON_RX, LAGOON_RY, 0, 0, Math.PI * 2);
        cc.fill();
        cc.globalAlpha = 1;
      }
    } else {
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
    }
    // Depth overlay: darker core atop the texture.
    cc.fillStyle = 'rgba(25,85,130,0.25)';
    cc.beginPath();
    cc.ellipse(LAGOON_CX, LAGOON_CY, LAGOON_RX * 0.55, LAGOON_RY * 0.55, 0, 0, Math.PI * 2);
    cc.fill();
    // Bank-edge shadow ring.
    cc.save();
    cc.filter = 'blur(12px)';
    cc.strokeStyle = 'rgba(30,70,100,0.45)'; cc.lineWidth = 30;
    cc.beginPath();
    cc.ellipse(LAGOON_CX, LAGOON_CY, LAGOON_RX, LAGOON_RY, 0, 0, Math.PI * 2);
    cc.stroke();
    cc.filter = 'none';
    cc.restore();
    // Shore highlight ring.
    cc.strokeStyle = 'rgba(255,255,255,0.22)'; cc.lineWidth = 14;
    cc.beginPath();
    cc.ellipse(LAGOON_CX, LAGOON_CY, LAGOON_RX, LAGOON_RY, 0, 0, Math.PI * 2);
    cc.stroke();
  }
  cc.restore();

  // ─ 5. Roads (Prompt 8: baked into the clay terrain — warm asphalt, a soft
  //      shoulder that recesses the edge into the grass/sand, gentle lane paint) ─
  cc.save();
  tracIslandPath(cc);
  cc.clip();

  const ROAD_W = CONFIG.ROAD_WIDTH;
  const MARGIN = (S - (CONFIG.GRID * CONFIG.BLOCK_SIZE + (CONFIG.GRID - 1) * ROAD_W)) / 2;
  const hw = ROAD_W / 2;

  // Every road rect once (horizontal + vertical bands).
  const roadRects: [number, number, number, number][] = [];
  for (const rc of ROAD_CENTERS) {
    roadRects.push([MARGIN, rc - hw, S - MARGIN * 2, ROAD_W]);
    roadRects.push([rc - hw, MARGIN, ROAD_W, S - MARGIN * 2]);
  }

  // (a) Soft shoulder / recess shadow: a blurred warm-dark halo slightly wider
  //     than the road, so the edge reads as gently sunk into the terrain rather
  //     than a hard sticker line where grey meets grass.
  cc.save();
  cc.filter = 'blur(13px)';
  cc.fillStyle = 'rgba(96,84,72,0.42)';
  for (const [x, y, w, h] of roadRects) cc.fillRect(x - 5, y - 5, w + 10, h + 10);
  cc.filter = 'none';
  cc.restore();

  // (b) Road surface — tex_street at FULL opacity; solid-asphalt fallback.
  //     Stage 13 §2: the texture IS the road material, not an overlay tint.
  {
    const st = _texTiles.get('street');
    if (st) {
      const sp = cc.createPattern(st, 'repeat');
      if (sp) {
        cc.save();
        cc.beginPath();
        for (const [x, y, w, h] of roadRects) cc.rect(x, y, w, h);
        cc.clip();
        cc.fillStyle = sp;
        cc.fillRect(MARGIN, MARGIN, S - MARGIN * 2, S - MARGIN * 2);
        cc.restore();
      }
    } else {
      // Fallback: blurred solid asphalt until texture loads.
      cc.save();
      cc.filter = 'blur(2.5px)';
      cc.fillStyle = COL.road;
      for (const [x, y, w, h] of roadRects) cc.fillRect(x, y, w, h);
      cc.filter = 'none';
      cc.restore();
    }
  }

  // (c) Mottling — quieter when the texture already provides grain.
  cc.save();
  cc.beginPath();
  for (const [x, y, w, h] of roadRects) cc.rect(x, y, w, h);
  cc.clip();
  let rseed = 90721;
  const rrnd = () => { rseed = (rseed * 1103515245 + 12345) & 0x7fffffff; return rseed / 0x7fffffff; };
  const mottleA = _texTiles.has('street') ? 0.35 : 1.0;
  for (let i = 0; i < 1500; i++) {
    const mx = rrnd() * S, my = rrnd() * S, mr = 6 + rrnd() * 16;
    cc.fillStyle = rrnd() > 0.5
      ? `rgba(255,255,255,${(0.025 * mottleA).toFixed(4)})`
      : `rgba(42,32,26,${(0.055 * mottleA).toFixed(4)})`;
    cc.beginPath();
    cc.ellipse(mx, my, mr, mr * 0.7, 0, 0, Math.PI * 2);
    cc.fill();
  }
  cc.restore();

  // (c.6) Sidewalk strips — tex_sidewalk at FULL opacity both sides of every road.
  {
    const SW  = 60; // Prompt 14: wider sidewalks — visible at gameplay zoom (was 28)
    const swt = _texTiles.get('sidewalk');
    const swPat = swt ? cc.createPattern(swt, 'repeat') : null;
    cc.save();
    tracIslandPath(cc); cc.clip();
    if (swPat) { cc.fillStyle = swPat; cc.globalAlpha = 1.0; }
    else        { cc.fillStyle = COL.pavement; cc.globalAlpha = 0.88; }
    for (const rc of ROAD_CENTERS) {
      const x0 = MARGIN, x1 = S - MARGIN, y0 = MARGIN, y1 = S - MARGIN;
      // Both sides of horizontal road
      cc.fillRect(x0, rc - hw - SW, x1 - x0, SW);
      cc.fillRect(x0, rc + hw,      x1 - x0, SW);
      // Both sides of vertical road
      cc.fillRect(rc - hw - SW, y0, SW, y1 - y0);
      cc.fillRect(rc + hw,      y0, SW, y1 - y0);
    }
    cc.globalAlpha = 1;
    cc.restore();
  }

  // (d) Soft, rounded lane dashes — muted warm paint; round caps read as pills,
  //     not the old hard white rectangles.
  cc.strokeStyle = COL.roadDash;
  cc.lineWidth   = 9;
  cc.setLineDash([46, 78]);
  cc.lineCap = 'round';
  for (const rc of ROAD_CENTERS) {
    cc.beginPath(); cc.moveTo(MARGIN + 40, rc); cc.lineTo(S - MARGIN - 40, rc); cc.stroke();
    cc.beginPath(); cc.moveTo(rc, MARGIN + 40); cc.lineTo(rc, S - MARGIN - 40); cc.stroke();
  }
  cc.setLineDash([]);
  cc.lineCap = 'butt';

  // (e) Faint warm curb highlight — a soft lip along the edge, not a hard white line.
  cc.strokeStyle = 'rgba(247,240,224,0.10)';
  cc.lineWidth   = 5;
  for (const rc of ROAD_CENTERS) {
    cc.beginPath(); cc.moveTo(MARGIN, rc - hw); cc.lineTo(S - MARGIN, rc - hw); cc.stroke();
    cc.beginPath(); cc.moveTo(MARGIN, rc + hw); cc.lineTo(S - MARGIN, rc + hw); cc.stroke();
    cc.beginPath(); cc.moveTo(rc - hw, MARGIN); cc.lineTo(rc - hw, S - MARGIN); cc.stroke();
    cc.beginPath(); cc.moveTo(rc + hw, MARGIN); cc.lineTo(rc + hw, S - MARGIN); cc.stroke();
  }

  // (f) Soft crosswalk stripes at each junction — muted warm paint, rounded.
  cc.fillStyle = 'rgba(243,236,218,0.24)';
  for (const rx of ROAD_CENTERS) {
    for (const ry of ROAD_CENTERS) {
      const stripeW = 14, stripeGap = 24, rad = 6;
      for (let i = 0; i < 4; i++) {
        const sx = rx - hw + 8 + i * stripeGap;
        _roundRect(cc, sx, ry - hw - 30, stripeW, 26, rad);
        _roundRect(cc, sx, ry + hw + 4,  stripeW, 26, rad);
      }
      for (let i = 0; i < 4; i++) {
        const sy = ry - hw + 8 + i * stripeGap;
        _roundRect(cc, rx - hw - 30, sy, 26, stripeW, rad);
        _roundRect(cc, rx + hw + 4,  sy, 26, stripeW, rad);
      }
    }
  }

  cc.restore();

  // ─ 5.5. House yards, driveways, and flowerbeds (baked from match lot data) ──
  _paintYards(cc);

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

  // ─ 8. Reserved zones — baked ground art for airport, military pad, zoo ─────
  cc.save();
  tracIslandPath(cc);
  cc.clip();
  _paintAirportRunway(cc);
  _paintMilitaryPad(cc);
  _paintZooLayout(cc);
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

/** Fill a rounded rectangle (used for softened crosswalk stripes). */
function _roundRect(cc: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.min(r, w / 2, h / 2);
  cc.beginPath();
  cc.moveTo(x + rr, y);
  cc.arcTo(x + w, y,     x + w, y + h, rr);
  cc.arcTo(x + w, y + h, x,     y + h, rr);
  cc.arcTo(x,     y + h, x,     y,     rr);
  cc.arcTo(x,     y,     x + w, y,     rr);
  cc.closePath();
  cc.fill();
}

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

// Prompt 8: precomputed cumulative arc-length of the (static) river polyline so
// the live highlight bands scroll at an even speed from the pond to the waterfall.
const _riverLen: number[] = (() => {
  const acc = [0];
  for (let i = 1; i < RIVER_PATH.length; i++) {
    const [ax, ay] = RIVER_PATH[i - 1];
    const [bx, by] = RIVER_PATH[i];
    acc.push(acc[i - 1] + Math.hypot(bx - ax, by - ay));
  }
  return acc;
})();
const _riverTotal = _riverLen[_riverLen.length - 1] || 1;

/** Point + flow direction at arc-length fraction t∈[0,1] along the river. */
function _riverPointAt(t: number): { x: number; y: number; a: number } {
  const target = t * _riverTotal;
  let i = 1;
  while (i < _riverLen.length && _riverLen[i] < target) i++;
  if (i >= _riverLen.length) i = _riverLen.length - 1;
  const seg = _riverLen[i] - _riverLen[i - 1] || 1;
  const f = (target - _riverLen[i - 1]) / seg;
  const [ax, ay] = RIVER_PATH[i - 1];
  const [bx, by] = RIVER_PATH[i];
  return { x: ax + (bx - ax) * f, y: ay + (by - ay) * f, a: Math.atan2(by - ay, bx - ax) };
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

  // River (Prompt 8): two soft highlight bands scroll downstream toward the
  // waterfall — the same cheap scrolling-band trick as the waterfall, but each
  // band follows the river's path and lies across its width to read as flow.
  ctx.globalCompositeOperation = 'lighter';
  for (let b = 0; b < 2; b++) {
    const t = ((clock / 5200) + b * 0.5) % 1;
    const p = _riverPointAt(t);
    // Fade in at the source and out as the band meets the waterfall.
    const edgeFade = Math.min(1, Math.min(t, 1 - t) / 0.12);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.a);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, RIVER_HALF_W * 1.05);
    g.addColorStop(0,   `rgba(232,249,255,${(0.22 * edgeFade).toFixed(3)})`);
    g.addColorStop(0.6, `rgba(190,232,244,${(0.09 * edgeFade).toFixed(3)})`);
    g.addColorStop(1,   'rgba(190,232,244,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    // x-radius = thin along flow, y-radius = spans the width → a crossing band
    ctx.ellipse(0, 0, RIVER_HALF_W * 0.5, RIVER_HALF_W * 1.0, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.globalCompositeOperation = 'source-over';

  ctx.restore();
}

// ─── Debug terrain overlay ───────────────────────────────────────────────────
import { GRID_W, GRID_H, getRawTerrainGrid } from './mapData';

/** Debug overlay: tints each terrain cell with a semi-transparent color.
 *  Activate with ?debug=terrain in the URL. */
export function drawDebugTerrainVec(ctx: CanvasRenderingContext2D): void {
  const grid = getRawTerrainGrid();
  if (!grid) return;
  const cw = S / GRID_W; const ch = S / GRID_H;
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

// ─── Texture + yard helpers (baked once into the static ground cache) ─────────

/** Fill a rect with a repeating texture tile at the given alpha, clipped to [x0,y0,x1,y1]. */
function _texFill(
  cc: CanvasRenderingContext2D, key: string, alpha: number,
  x0: number, y0: number, x1: number, y1: number,
): void {
  const tile = _texTiles.get(key);
  if (!tile) return;
  const pat = cc.createPattern(tile, 'repeat');
  if (!pat) return;
  cc.save();
  cc.beginPath(); cc.rect(x0, y0, x1 - x0, y1 - y0); cc.clip();
  cc.fillStyle = pat; cc.globalAlpha = alpha;
  cc.fillRect(x0, y0, x1 - x0, y1 - y0);
  cc.globalAlpha = 1;
  cc.restore();
}

/** Fill a zone rect with a texture tile at FULL opacity, then apply a light
 *  atmosphere gradient on top so the material still has directional lighting.
 *  Falls back to _fillZoneRich (gradient only) when the texture hasn't loaded. */
function _texZone(
  cc: CanvasRenderingContext2D,
  key: string,
  rect: readonly [number, number, number, number],
  fallback: string,
  understated = false,
): void {
  const [x0, y0, x1, y1] = rect;
  const tile = _texTiles.get(key);
  if (tile) {
    const pat = cc.createPattern(tile, 'repeat');
    if (pat) {
      // Base: texture at full opacity, clipped to the zone rect.
      cc.save();
      tracIslandPath(cc); cc.clip();
      cc.beginPath(); cc.rect(x0, y0, x1 - x0, y1 - y0); cc.clip();
      cc.fillStyle = pat;
      cc.fillRect(x0, y0, x1 - x0, y1 - y0);
      cc.restore();
    }
    // Atmosphere overlay: light blurred gradient so the material has depth.
    cc.save();
    tracIslandPath(cc); cc.clip();
    cc.filter = understated ? 'blur(28px)' : 'blur(46px)';
    const grd = cc.createLinearGradient(x0, y0, x1, y1);
    grd.addColorStop(0, _lighten(fallback, understated ? 0.05 : 0.10));
    grd.addColorStop(1, _darken(fallback,  understated ? 0.03 : 0.06));
    cc.fillStyle = grd;
    cc.globalAlpha = 0.20;
    cc.fillRect(x0 - 24, y0 - 24, (x1 - x0) + 48, (y1 - y0) + 48);
    cc.filter = 'none'; cc.globalAlpha = 1;
    cc.restore();
  } else {
    // Fallback: original feathered gradient fill (until texture loads).
    _fillZoneRich(cc, rect, fallback, understated);
  }
}

/** Faint alternating E–W mowing-stripe bands over the island grass. */
function _paintMowingStripes(cc: CanvasRenderingContext2D): void {
  cc.save();
  tracIslandPath(cc); cc.clip();
  const STRIPE = 160;
  for (let y = 0; y < S; y += STRIPE) {
    cc.fillStyle = (Math.floor(y / STRIPE) % 2 === 0)
      ? 'rgba(38,62,22,0.044)' : 'rgba(255,255,255,0.030)';
    cc.fillRect(0, y, S, STRIPE);
  }
  cc.restore();
}

/** Yard fills, picket fences, driveways, and flowerbed accents for every suburb lot. */
function _paintYards(cc: CanvasRenderingContext2D): void {
  if (_groundLots.length === 0) return;
  cc.save();
  tracIslandPath(cc); cc.clip();

  const grassPat = _texTiles.has('grass')
    ? cc.createPattern(_texTiles.get('grass')!, 'repeat') : null;
  const swPat    = _texTiles.has('sidewalk')
    ? cc.createPattern(_texTiles.get('sidewalk')!, 'repeat') : null;

  let yseed = 7411;
  const yrnd = () => { yseed = (yseed * 1103515245 + 12345) & 0x7fffffff; return yseed / 0x7fffffff; };

  for (const lot of _groundLots) {
    const hs = lot.fpR * 1.55;
    const x0 = lot.x - hs, y0 = lot.y - hs, w = hs * 2, h = hs * 2;
    const v1 = yrnd(), v2 = yrnd(), v3 = yrnd();

    // ── Lawn: grass texture + per-yard tint ────────────────────────────────────
    if (grassPat) {
      cc.save();
      cc.beginPath(); cc.rect(x0, y0, w, h); cc.clip();
      cc.fillStyle = grassPat; cc.globalAlpha = 0.30;
      cc.fillRect(x0, y0, w, h);
      cc.restore();
    }
    cc.fillStyle  = v1 > 0.5 ? '#B8D98A' : '#9DCC78';
    cc.globalAlpha = 0.12 + v2 * 0.06;
    cc.fillRect(x0, y0, w, h);

    // ── Picket fence ───────────────────────────────────────────────────────────
    cc.globalAlpha = 1;
    cc.strokeStyle = 'rgba(160,120,80,0.44)';
    cc.lineWidth   = 3;
    cc.strokeRect(x0 + 1.5, y0 + 1.5, w - 3, h - 3);

    // ── Driveway (south-facing paved strip) ────────────────────────────────────
    const dwW = Math.max(10, lot.fpR * 0.28);
    const dwH = hs * 0.60;
    const dwX = lot.x - dwW, dwY = lot.y + lot.fpR * 0.8;
    if (swPat) {
      cc.save();
      cc.beginPath(); cc.rect(dwX, dwY, dwW * 2, dwH); cc.clip();
      cc.fillStyle = swPat; cc.globalAlpha = 0.55;
      cc.fillRect(dwX, dwY, dwW * 2, dwH);
      cc.restore();
    } else {
      cc.fillStyle = COL.pavement; cc.globalAlpha = 0.45;
      cc.fillRect(dwX, dwY, dwW * 2, dwH);
    }

    // ── Flowerbed accent (front corner) ────────────────────────────────────────
    const fbX = x0 + w * 0.18 + v3 * w * 0.10;
    const fbY = lot.y + lot.fpR * 0.55 + v1 * lot.fpR * 0.22;
    cc.globalAlpha = 1;
    cc.fillStyle   = 'rgba(230,115,150,0.45)';
    cc.beginPath();
    cc.ellipse(fbX, fbY, lot.fpR * 0.32, lot.fpR * 0.20, 0.3, 0, Math.PI * 2);
    cc.fill();
    cc.fillStyle   = 'rgba(75,155,75,0.38)';
    cc.beginPath();
    cc.ellipse(fbX + lot.fpR * 0.14, fbY - lot.fpR * 0.08, lot.fpR * 0.24, lot.fpR * 0.15, -0.3, 0, Math.PI * 2);
    cc.fill();
  }

  cc.restore();
}

// ─── Reserved-zone ground art (baked once into the static ground cache) ────────

/** Airport runway — N/S tarmac strip with threshold markings, taxiway, apron. */
function _paintAirportRunway(cc: CanvasRenderingContext2D): void {
  const [zx0, zy0, zx1, zy1] = ZONE_AIRPORT_R;
  const bx = (zx0 + zx1) / 2;
  const by = (zy0 + zy1) / 2;

  cc.save();

  // ── Tarmac base (N–S) ──────────────────────────────────────────────────────
  const rw = 210, rl = 1120;
  const rx = bx - rw / 2, ry = by - rl / 2;
  cc.fillStyle = '#6B6059';
  cc.fillRect(rx, ry, rw, rl);

  // ── Center-line dashes ────────────────────────────────────────────────────
  cc.strokeStyle = 'rgba(243,236,218,0.55)';
  cc.lineWidth = 8;
  cc.setLineDash([50, 42]);
  cc.lineCap = 'round';
  cc.beginPath();
  cc.moveTo(bx, ry + 20);
  cc.lineTo(bx, ry + rl - 20);
  cc.stroke();
  cc.setLineDash([]);
  cc.lineCap = 'butt';

  // ── Threshold stripes (top + bottom) ─────────────────────────────────────
  cc.fillStyle = 'rgba(243,236,218,0.50)';
  for (let i = -2; i <= 2; i++) {
    const tx = bx + i * 28;
    cc.fillRect(tx - 8, ry + 28,       14, 68);  // top threshold
    cc.fillRect(tx - 8, ry + rl - 96,  14, 68);  // bottom threshold
  }

  // ── Runway number hints (faint rects suggesting numerals) ─────────────────
  // "27" suggestion (top end) — two simple blocks
  cc.fillStyle = 'rgba(243,236,218,0.22)';
  cc.fillRect(bx - 28, ry + 108, 18, 38);
  cc.fillRect(bx + 8,  ry + 108, 18, 38);

  // ── Taxiway apron (west side) ─────────────────────────────────────────────
  cc.fillStyle = '#7A716A';
  cc.fillRect(rx - 200, by - 130, 205, 220);

  // ── Taxiway guide dashes ──────────────────────────────────────────────────
  cc.strokeStyle = 'rgba(243,236,218,0.28)';
  cc.lineWidth = 5;
  cc.setLineDash([18, 18]);
  cc.beginPath();
  cc.moveTo(rx - 200, by - 20);
  cc.lineTo(rx - 2, by - 20);
  cc.stroke();
  cc.setLineDash([]);

  // ── Perimeter fence hint ──────────────────────────────────────────────────
  cc.strokeStyle = 'rgba(110,95,80,0.28)';
  cc.lineWidth = 7;
  const fw = zx1 - zx0 - 60, fh = zy1 - zy0 - 60;
  cc.strokeRect(bx - fw / 2, by - fh / 2, fw, fh);

  cc.restore();
}

/** Military helipad — concrete square + H marking + perimeter fence hint. */
function _paintMilitaryPad(cc: CanvasRenderingContext2D): void {
  const [zx0, zy0, zx1, zy1] = ZONE_MILITARY_R;
  const bx = (zx0 + zx1) / 2;
  const by = (zy0 + zy1) / 2;

  cc.save();

  // ── Concrete pad ──────────────────────────────────────────────────────────
  const padS = 420;
  cc.fillStyle = '#B4ADA6';
  cc.fillRect(bx - padS / 2, by - padS / 2, padS, padS);

  // ── Mottling ──────────────────────────────────────────────────────────────
  let pseed = 9901;
  const prnd = () => { pseed = (pseed * 1103515245 + 12345) & 0x7fffffff; return pseed / 0x7fffffff; };
  cc.save();
  cc.beginPath();
  cc.rect(bx - padS / 2, by - padS / 2, padS, padS);
  cc.clip();
  for (let i = 0; i < 220; i++) {
    const mx = bx - padS / 2 + prnd() * padS;
    const my = by - padS / 2 + prnd() * padS;
    cc.fillStyle = prnd() > 0.5 ? 'rgba(255,255,255,0.03)' : 'rgba(40,32,26,0.05)';
    cc.beginPath();
    cc.ellipse(mx, my, 8 + prnd() * 14, 6 + prnd() * 10, 0, 0, Math.PI * 2);
    cc.fill();
  }
  cc.restore();

  // ── Helipad circle ────────────────────────────────────────────────────────
  cc.strokeStyle = 'rgba(55,48,42,0.48)';
  cc.lineWidth = 14;
  cc.beginPath();
  cc.arc(bx, by, 145, 0, Math.PI * 2);
  cc.stroke();

  // ── H marking ─────────────────────────────────────────────────────────────
  cc.strokeStyle = 'rgba(55,48,42,0.55)';
  cc.lineWidth = 22;
  cc.lineCap = 'round';
  cc.beginPath();
  cc.moveTo(bx - 58, by - 72); cc.lineTo(bx - 58, by + 72);
  cc.moveTo(bx + 58, by - 72); cc.lineTo(bx + 58, by + 72);
  cc.moveTo(bx - 58, by);      cc.lineTo(bx + 58, by);
  cc.stroke();
  cc.lineCap = 'butt';

  // ── Perimeter fence hint ──────────────────────────────────────────────────
  cc.strokeStyle = 'rgba(110,95,80,0.25)';
  cc.lineWidth = 8;
  const fw = zx1 - zx0 - 70, fh = zy1 - zy0 - 70;
  cc.strokeRect(bx - fw / 2, by - fh / 2, fw, fh);

  cc.restore();
}

/** Zoo clearing — sandy paths, enclosure outlines, flamingo pond. */
function _paintZooLayout(cc: CanvasRenderingContext2D): void {
  const [zx0, zy0, zx1, zy1] = ZONE_ZOO_R;
  const bx = (zx0 + zx1) / 2;
  const by = (zy0 + zy1) / 2;
  const bw = zx1 - zx0;
  const bh = zy1 - zy0;
  const ins = 100;

  const PATH_COL = '#CFC0A0';

  cc.save();

  // ── Main entrance path (south-center) ─────────────────────────────────────
  cc.fillStyle = PATH_COL;
  cc.fillRect(bx - 55, zy1 - ins - 300, 110, 300);

  // ── Central E–W spine path ────────────────────────────────────────────────
  cc.fillRect(zx0 + ins, by - 45, bw - ins * 2, 90);

  // ── Three enclosure pens (top half) ───────────────────────────────────────
  const penW = Math.floor((bw - ins * 2 - 80) / 3);
  for (let col = 0; col < 3; col++) {
    const px = zx0 + ins + col * (penW + 40);
    const py = zy0 + ins;
    const ph = bh / 2 - ins - 20;
    // Pen floor fill (light sandy)
    cc.fillStyle = 'rgba(212,198,168,0.38)';
    cc.fillRect(px, py, penW, ph);
    // Pen border
    cc.strokeStyle = 'rgba(120,95,68,0.50)';
    cc.lineWidth = 9;
    cc.strokeRect(px, py, penW, ph);
    // Internal path strip between pens
    if (col < 2) {
      cc.fillStyle = PATH_COL;
      cc.fillRect(px + penW, py, 40, ph);
    }
  }

  // ── Flamingo pond (bottom-left) ────────────────────────────────────────────
  const pondX = zx0 + ins + 220, pondY = by + 140;
  cc.fillStyle = COL.waterS;
  cc.save();
  cc.globalAlpha = 0.75;
  cc.beginPath();
  cc.ellipse(pondX, pondY, 130, 88, 0, 0, Math.PI * 2);
  cc.fill();
  cc.strokeStyle = 'rgba(255,255,255,0.30)';
  cc.lineWidth = 12;
  cc.beginPath();
  cc.ellipse(pondX, pondY, 130, 88, 0, 0, Math.PI * 2);
  cc.stroke();
  cc.restore();

  // ── Info sign marker dots ──────────────────────────────────────────────────
  cc.fillStyle = 'rgba(120,95,68,0.38)';
  for (let i = 0; i < 3; i++) {
    cc.beginPath();
    cc.arc(zx0 + ins + i * Math.floor((bw - ins * 2) / 3) + 90, by - 20, 20, 0, Math.PI * 2);
    cc.fill();
  }

  cc.restore();
}
