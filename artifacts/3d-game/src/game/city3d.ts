/**
 * city3d.ts — hole.io-style pseudo-3D extruded buildings (Canvas 2D).
 *
 * Every building is a box: a rectangular footprint extruded upward. The roof
 * is the footprint translated by a camera-relative parallax offset — mostly
 * straight up (fixed tilt, like hole.io's camera) plus a small radial lean
 * away from the screen centre so buildings at the edges reveal their sides.
 * Faces drawn per frame: ground shadow → side face → front (south) facade →
 * roof. Facade textures (walls + window grids + storefronts) are rendered
 * once per style bucket into offscreen canvases and drawn with a transform,
 * so the per-frame cost is ~3 drawImage/fills per building — mobile-safe.
 *
 * Compatible with the y-sorted painter's algorithm: tops shift NORTH, so a
 * building only ever overlaps things behind it (smaller y), which the sort
 * already draws first.
 */

import type { ObjectKind } from './config';
import { objectSprites, spriteBounds, spriteAspect } from './sprites';

export interface BuildingSpec {
  w: number;      // half-width of footprint (world units)
  d: number;      // half-depth of footprint (world units)
  h: number;      // extruded height (world units)
  style: number;  // palette index into STYLES
  seed: number;   // deterministic window/detail variation
  storefront: boolean; // ground-floor awning + door band (shops/cafes)
}

// ── Palette: crisp hole.io-inspired facades (no browns) ─────────────────────
interface Style {
  wall: string;       // facade base
  wallSide: string;   // side face (darker shade of wall)
  win: string;        // window glass
  winLit: string;     // warm lit window
  roof: string;       // roof slab
  roofEdge: string;   // parapet edge
  trim: string;       // storefront band / ground floor
}

// Roofs are DARK, DESATURATED shades of each wall colour (like hole.io):
// colourful walls + deep tinted roofs make each box read as a building and
// give the skyline variety from above without turning candy-pastel.
const STYLES: Style[] = [
  // glass blue tower
  { wall: '#8FB4DE', wallSide: '#7096BE', win: '#D9EBFA', winLit: '#FFE9A8', roof: '#5E7896', roofEdge: '#4A6078', trim: '#5E7FA6' },
  // steel gray
  { wall: '#AEB6C2', wallSide: '#909AA8', win: '#DDE6EE', winLit: '#FFE9A8', roof: '#6E7887', roofEdge: '#57616F', trim: '#7C8694' },
  // brick red (crisp, not brown)
  { wall: '#CE6459', wallSide: '#AF4F46', win: '#D7E8F2', winLit: '#FFE9A8', roof: '#9B5147', roofEdge: '#7C4038', trim: '#8E4B44' },
  // cream / white
  { wall: '#EEE7D8', wallSide: '#CFC7B4', win: '#BFD8E8', winLit: '#FFE9A8', roof: '#9A958B', roofEdge: '#7C7870', trim: '#C8B98E' },
  // slate navy glass
  { wall: '#6C88A8', wallSide: '#57708C', win: '#C9E2F2', winLit: '#FFE9A8', roof: '#4E6478', roofEdge: '#3E505F', trim: '#4E6580' },
  // mint
  { wall: '#A9D3BC', wallSide: '#8AB69E', win: '#E1F1F7', winLit: '#FFE9A8', roof: '#6E8F7E', roofEdge: '#587365', trim: '#6F9C85' },
  // dusty rose
  { wall: '#DDA1A6', wallSide: '#BE8388', win: '#E9F1F7', winLit: '#FFE9A8', roof: '#9A6E73', roofEdge: '#7C585C', trim: '#A96F74' },
];

// Camera-parallax constants. LIFT is the dominant fixed tilt (world units of
// top offset per unit height); LEAN is the radial component per unit height
// per unit distance from camera centre. LIFT ≈ 1 gives hole.io's strong
// camera tilt: facades read at full height, roofs stay foreshortened slabs
// (parcel depth in the top-down map IS the apparent, foreshortened depth).
const LIFT = 1.0;
const LEAN = 0.0003;

// Facade texture bake scale (px per world unit). Textures are small; 0.5 is
// crisp enough at gameplay zoom and keeps memory trivial.
const TEX_SCALE = 0.5;

// ── Facade texture cache ─────────────────────────────────────────────────────
// Key: style|wFloors|hFloors|storefront|seed-bucket → offscreen canvas.
const _faceCache = new Map<string, HTMLCanvasElement>();
const _sideCache = new Map<string, HTMLCanvasElement>();

function paintWindows(
  g: CanvasRenderingContext2D, st: Style, seed: number,
  W: number, H: number, cols: number, rows: number, storefront: boolean,
) {
  const mx = W * 0.10;                       // side margin
  const gy = storefront ? H * 0.16 : H * 0.06; // bottom band reserved
  const availH = H - gy - H * 0.07;
  const cw = (W - mx * 2) / cols;
  const ch = availH / rows;
  let s = seed | 0;
  const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = mx + c * cw + cw * 0.18;
      const y = H * 0.07 + r * ch + ch * 0.18;
      g.fillStyle = rnd() < 0.18 ? st.winLit : st.win;
      g.fillRect(Math.round(x), Math.round(y), Math.max(2, Math.round(cw * 0.64)), Math.max(2, Math.round(ch * 0.6)));
    }
  }
  if (storefront) {
    // ground-floor band: trim strip + door + wide shop window
    g.fillStyle = st.trim;
    g.fillRect(0, H - gy, W, gy);
    g.fillStyle = st.win;
    g.fillRect(W * 0.12, H - gy * 0.82, W * 0.42, gy * 0.62);
    g.fillStyle = '#F5F7F9';
    g.fillRect(W * 0.64, H - gy * 0.88, W * 0.16, gy * 0.88);
  }
}

function faceTexture(spec: BuildingSpec, side: boolean): HTMLCanvasElement {
  const st = STYLES[spec.style % STYLES.length];
  const wWU = side ? spec.d * 2 : spec.w * 2;
  const floors = Math.max(1, Math.round(spec.h / 46));
  const cols = Math.max(1, Math.round(wWU / 52));
  const key = `${spec.style}|${cols}|${floors}|${spec.storefront && !side ? 1 : 0}|${spec.seed % 4}`;
  const cache = side ? _sideCache : _faceCache;
  const hit = cache.get(key);
  if (hit) return hit;

  const W = Math.max(8, Math.round(wWU * TEX_SCALE));
  const H = Math.max(8, Math.round(spec.h * TEX_SCALE));
  const cvs = document.createElement('canvas');
  cvs.width = W; cvs.height = H;
  const g = cvs.getContext('2d')!;
  g.fillStyle = side ? st.wallSide : st.wall;
  g.fillRect(0, 0, W, H);
  paintWindows(g, st, spec.seed % 4 + (side ? 7 : 0), W, H, cols, floors, spec.storefront && !side);
  cache.set(key, cvs);
  return cvs;
}

/**
 * Per-frame extruded draw. ctx must be in WORLD space (no translate applied
 * for this object). (bx, by) is the building centre, (cx, cy) the camera.
 */
export function drawBuilding3D(
  ctx: CanvasRenderingContext2D,
  spec: BuildingSpec,
  bx: number, by: number,
  cx: number, cy: number,
) {
  const st = STYLES[spec.style % STYLES.length];
  const { w, d, h } = spec;
  // roof offset: fixed north tilt + radial lean away from camera centre
  const ox = (bx - cx) * LEAN * h;
  const oy = -h * LIFT + (by - cy) * Math.max(0, LEAN * 0.4) * h;

  const x0 = bx - w, x1 = bx + w;
  const y0 = by - d, y1 = by + d;

  // ground shadow — soft slab south-east of the base
  ctx.fillStyle = 'rgba(30,36,52,0.16)';
  ctx.beginPath();
  ctx.ellipse(bx + w * 0.18, y1 + 6, w * 1.12, d * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();

  // ── side face (east or west), only when the lean exposes it ──
  if (Math.abs(ox) > 0.5) {
    const tex = faceTexture(spec, true);
    const ex = ox < 0 ? x1 : x0; // exposed vertical edge of the base
    ctx.save();
    // quad: base edge (ex,y0)-(ex,y1) → top edge (ex+ox,y0+oy)-(ex+ox,y1+oy)
    ctx.beginPath();
    ctx.moveTo(ex, y0); ctx.lineTo(ex, y1);
    ctx.lineTo(ex + ox, y1 + oy); ctx.lineTo(ex + ox, y0 + oy);
    ctx.closePath();
    ctx.clip();
    // texture basis: u runs along the top edge (north→south on screen),
    // v runs from the top edge down the extrusion to the base edge.
    ctx.translate(ex + ox, y0 + oy);
    ctx.transform(0, (y1 - y0) / tex.width, -ox / tex.height, -oy / tex.height, 0, 0);
    ctx.drawImage(tex, 0, 0);
    ctx.restore();
  }

  // ── front (south) facade: quad (x0,y1)-(x1,y1) → top (x0+ox,y1+oy)-(x1+ox,y1+oy) ──
  {
    const tex = faceTexture(spec, false);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x0, y1); ctx.lineTo(x1, y1);
    ctx.lineTo(x1 + ox, y1 + oy); ctx.lineTo(x0 + ox, y1 + oy);
    ctx.closePath();
    ctx.clip();
    ctx.translate(x0 + ox, y1 + oy);
    // basis: u along top edge (pure x), v down to base edge (shear -ox, -oy)
    ctx.transform((x1 - x0) / tex.width, 0, -ox / tex.height, -oy / tex.height, 0, 0);
    ctx.drawImage(tex, 0, 0);
    ctx.restore();
  }

  // ── roof slab (footprint translated by (ox, oy)) ──
  ctx.fillStyle = st.roof;
  ctx.fillRect(x0 + ox, y0 + oy, w * 2, d * 2);
  // parapet: light top lip + inset shadow line — reads as a raised rim
  ctx.strokeStyle = 'rgba(255,255,255,0.28)';
  ctx.lineWidth = 4;
  ctx.strokeRect(x0 + ox + 2, y0 + oy + 2, w * 2 - 4, d * 2 - 4);
  ctx.strokeStyle = st.roofEdge;
  ctx.lineWidth = 3;
  ctx.strokeRect(x0 + ox + 6, y0 + oy + 6, w * 2 - 12, d * 2 - 12);
  // roof furniture: AC box + vent, seeded
  const s = spec.seed;
  ctx.fillStyle = st.roofEdge;
  ctx.fillRect(x0 + ox + w * 0.5 + (s % 3) * 6, y0 + oy + d * 0.55, Math.max(8, w * 0.34), Math.max(6, d * 0.3));
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillRect(x0 + ox + w * 1.35, y0 + oy + d * 1.25, Math.max(5, w * 0.18), Math.max(5, d * 0.18));
  // AO seam where the facade meets the roof — separates the two planes
  ctx.fillStyle = 'rgba(20,26,40,0.30)';
  ctx.fillRect(x0 + ox, y1 + oy - 3, w * 2, 3);

  // crisp silhouette line on the south base edge grounds the building
  ctx.strokeStyle = 'rgba(30,36,52,0.35)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(x0, y1); ctx.lineTo(x1, y1);
  ctx.stroke();
}

/**
 * Flat composite "sprite" of a building (south facade with roof strip on
 * top) for the capture/tumble/swallow-ghost path, which needs a single
 * image. Cached per style bucket.
 */
const _spriteCache = new Map<string, HTMLCanvasElement>();
export function buildingSprite(spec: BuildingSpec): HTMLCanvasElement {
  const floors = Math.max(1, Math.round(spec.h / 46));
  const cols = Math.max(1, Math.round((spec.w * 2) / 52));
  const key = `${spec.style}|${cols}|${floors}|${spec.storefront ? 1 : 0}`;
  const hit = _spriteCache.get(key);
  if (hit) return hit;
  const st = STYLES[spec.style % STYLES.length];
  const face = faceTexture(spec, false);
  const roofH = Math.max(6, Math.round(spec.d * 2 * TEX_SCALE * 0.5));
  const cvs = document.createElement('canvas');
  cvs.width = face.width;
  cvs.height = face.height + roofH;
  const g = cvs.getContext('2d')!;
  g.fillStyle = st.roof;
  g.fillRect(0, 0, cvs.width, roofH);
  g.strokeStyle = st.roofEdge;
  g.lineWidth = 2;
  g.strokeRect(1, 1, cvs.width - 2, roofH - 2);
  g.drawImage(face, 0, roofH);
  _spriteCache.set(key, cvs);
  return cvs;
}

/**
 * Register the flat composite under a bucketed draw key in the shared sprite
 * maps so the existing capture/tumble/swallow-ghost pipeline can use it
 * (objects reference it via sceneryKey). Returns the key.
 */
export function ensureBuildingSprite(spec: BuildingSpec): string {
  const floors = Math.max(1, Math.round(spec.h / 46));
  const cols = Math.max(1, Math.round((spec.w * 2) / 52));
  const key = `bldg3d_${spec.style}|${cols}|${floors}|${spec.storefront ? 1 : 0}`;
  if (!objectSprites.has(key)) {
    const img = buildingSprite(spec);
    (objectSprites as Map<string, HTMLImageElement | HTMLCanvasElement>).set(key, img);
    spriteBounds.set(key, { x: 0, y: 0, w: 1, h: 1 });
    spriteAspect.set(key, img.width / img.height);
  }
  return key;
}

// Kinds rendered as extruded boxes (everything downtown except landmarks,
// which keep their marquee clay sprites).
export const EXTRUDED_KINDS: ObjectKind[] = ['skyscraper', 'office', 'shop', 'cafe'];

/** Deterministic spec for a parcel. rank01: 0 = plaza-adjacent, 1 = edge. */
export function makeBuildingSpec(
  kind: ObjectKind, halfW: number, halfD: number, rank01: number, seed: number,
): BuildingSpec {
  let h: number;
  let storefront = false;
  const jitter = ((seed * 2654435761) >>> 16 & 255) / 255; // 0..1 deterministic
  if (kind === 'skyscraper')      h = 300 + (1 - rank01) * 160 + jitter * 60;
  else if (kind === 'office')     h = 170 + (1 - rank01) * 70 + jitter * 50;
  else { h = 80 + jitter * 40; storefront = true; }        // shop / cafe
  // taller buildings pick glassy styles; short ones pick brick/cream/mint
  const tallStyles = [0, 1, 4];
  const lowStyles  = [2, 3, 5, 6];
  const pool = h > 220 ? tallStyles : lowStyles;
  const style = pool[seed % pool.length];
  return { w: halfW, d: halfD, h, style, seed, storefront };
}
