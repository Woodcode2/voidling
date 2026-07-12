/**
 * city3d.ts — hole.io-style pseudo-3D extruded buildings (Canvas 2D).
 *
 * Every building is a box: a rectangular footprint extruded upward. The roof
 * is the footprint translated by a camera-relative parallax offset — mostly
 * straight up (fixed tilt, like hole.io's camera) plus a small radial lean
 * away from the screen centre so buildings at the edges reveal their sides.
 * Faces drawn per frame: projected shadow → side face → front facade → roof.
 *
 * QUALITY comes from the hole.io playbook: white-framed windows with floor
 * lines, striped awnings over storefronts, fire escapes on brick, and roofs
 * FULL of furniture (water towers, AC clusters, skylights, vents). All of it
 * is baked into per-style-bucket textures once — per frame each building is
 * ~4 draw calls, mobile-safe.
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
  storefront: boolean;         // ground-floor awning + door band (shops/cafes)
  roof: 'flat' | 'pitched';    // downtown slab vs suburb house
  deco?: 'helipad' | 'cross';  // civic roof marking (hospital / clinic)
}

// ── Palette: crisp hole.io-inspired facades (no browns) ─────────────────────
interface Style {
  wall: string;       // facade base
  wallSide: string;   // side face (darker shade of wall)
  win: string;        // window glass
  winLit: string;     // warm lit window
  frame: string;      // window frame
  roof: string;       // roof slab / shingles
  roofEdge: string;   // parapet edge / ridge
  trim: string;       // storefront band / awning / door
}

// Indices 0-6: downtown flat-roof styles. 7-10: suburb pitched houses.
// Roofs are dark, desaturated shades of the wall (hole.io) — colourful walls
// + deep tinted roofs make each box read as a building, not a sticker.
const STYLES: Style[] = [
  // 0 glass blue tower
  { wall: '#8FB4DE', wallSide: '#7096BE', win: '#D9EBFA', winLit: '#FFE9A8', frame: '#F4F8FC', roof: '#5E7896', roofEdge: '#4A6078', trim: '#5E7FA6' },
  // 1 steel gray
  { wall: '#AEB6C2', wallSide: '#909AA8', win: '#DDE6EE', winLit: '#FFE9A8', frame: '#F2F4F7', roof: '#6E7887', roofEdge: '#57616F', trim: '#7C8694' },
  // 2 brick red (crisp, not brown) — gets fire escapes
  { wall: '#CE6459', wallSide: '#AF4F46', win: '#D7E8F2', winLit: '#FFE9A8', frame: '#F6EFEA', roof: '#9B5147', roofEdge: '#7C4038', trim: '#8E4B44' },
  // 3 cream / white
  { wall: '#EEE7D8', wallSide: '#CFC7B4', win: '#BFD8E8', winLit: '#FFE9A8', frame: '#FFFFFF', roof: '#9A958B', roofEdge: '#7C7870', trim: '#C8B98E' },
  // 4 slate navy glass
  { wall: '#6C88A8', wallSide: '#57708C', win: '#C9E2F2', winLit: '#FFE9A8', frame: '#E8EFF5', roof: '#4E6478', roofEdge: '#3E505F', trim: '#4E6580' },
  // 5 mint
  { wall: '#A9D3BC', wallSide: '#8AB69E', win: '#E1F1F7', winLit: '#FFE9A8', frame: '#F4FAF6', roof: '#6E8F7E', roofEdge: '#587365', trim: '#6F9C85' },
  // 6 dusty rose
  { wall: '#DDA1A6', wallSide: '#BE8388', win: '#E9F1F7', winLit: '#FFE9A8', frame: '#FAF2F3', roof: '#9A6E73', roofEdge: '#7C585C', trim: '#A96F74' },
  // 7 house: cream siding / terracotta roof
  { wall: '#F2EAD8', wallSide: '#D5CBB4', win: '#CBE2EF', winLit: '#FFE9A8', frame: '#FFFFFF', roof: '#D96A4F', roofEdge: '#B4523C', trim: '#B8551F' },
  // 8 house: sage siding / slate roof
  { wall: '#CBDABF', wallSide: '#ACBC9F', win: '#D6EAF4', winLit: '#FFE9A8', frame: '#FBFDFA', roof: '#6B87A8', roofEdge: '#54708F', trim: '#5E7FA6' },
  // 9 house: sky siding / charcoal roof
  { wall: '#C2D8E6', wallSide: '#A2BACA', win: '#E4F2F9', winLit: '#FFE9A8', frame: '#FBFDFE', roof: '#66707E', roofEdge: '#4F5966', trim: '#4E6580' },
  // 10 house: butter siding / forest roof
  { wall: '#F2E2B4', wallSide: '#D4C393', win: '#D3E8F2', winLit: '#FFE9A8', frame: '#FFFEF8', roof: '#5F8F63', roofEdge: '#4A754E', trim: '#8E4B44' },
];

// Camera-parallax constants. LIFT is the dominant fixed tilt (world units of
// top offset per unit height); LEAN is the radial component per unit height
// per unit distance from camera centre. LIFT ≈ 1 gives hole.io's strong
// camera tilt: facades read at full height, roofs stay foreshortened slabs
// (parcel depth in the top-down map IS the apparent, foreshortened depth).
export const LIFT = 1.0;   // exported: world.ts cull uses it for the up-extent
const LEAN = 0.0003;

// Consistent sun: every building casts a crisp SE shadow scaled by height.
const SHADOW_DX = 0.34;
const SHADOW_DY = 0.46;
const SHADOW_MAX = 130;

// Facade texture bake scale (px per world unit). Textures are small; 0.6 is
// crisp at gameplay zoom and keeps memory trivial.
const TEX_SCALE = 0.6;

// ── deterministic per-spec rng ───────────────────────────────────────────────
function rng(seed: number) {
  let s = (seed | 0) || 1;
  return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
}

/** Lighten (amt>0) or darken (amt<0) a #rrggbb colour. */
function _shade(hex: string, amt: number): string {
  const h = hex.replace('#', '');
  const c = (i: number) => {
    const v = parseInt(h.slice(i, i + 2), 16);
    const s = amt >= 0 ? v + (255 - v) * amt : v * (1 + amt);
    return Math.round(Math.max(0, Math.min(255, s)));
  };
  return `rgb(${c(0)},${c(2)},${c(4)})`;
}

// ── Facade texture cache ─────────────────────────────────────────────────────
// Key: style|cols|floors|storefront|roofkind|seed-bucket → offscreen canvas.
const _faceCache = new Map<string, HTMLCanvasElement>();
const _sideCache = new Map<string, HTMLCanvasElement>();
const _roofCache = new Map<string, HTMLCanvasElement>();

function faceKey(spec: BuildingSpec, side: boolean): string {
  const floors = Math.max(1, Math.round(spec.h / 46));
  const wWU = side ? spec.d * 2 : spec.w * 2;
  const cols = Math.max(1, Math.round(wWU / 52));
  return `${spec.style}|${cols}|${floors}|${spec.storefront && !side ? 1 : 0}|${spec.roof === 'pitched' ? 'p' : 'f'}|${spec.deco ?? '-'}|${spec.seed % 4}`;
}

/** Framed window: white frame rect + glass inset. */
function paintWindow(g: CanvasRenderingContext2D, st: Style, x: number, y: number, w: number, h: number, lit: boolean) {
  g.fillStyle = st.frame;
  g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  const inset = Math.max(1, Math.round(Math.min(w, h) * 0.14));
  g.fillStyle = lit ? st.winLit : st.win;
  g.fillRect(Math.round(x) + inset, Math.round(y) + inset, Math.round(w) - inset * 2, Math.round(h) - inset * 2);
}

/** Striped awning canopy (storefronts) — trim + white stripes + scallop base. */
function paintAwning(g: CanvasRenderingContext2D, st: Style, x: number, y: number, w: number, h: number) {
  g.fillStyle = st.trim;
  g.fillRect(x, y, w, h);
  g.fillStyle = 'rgba(255,255,255,0.85)';
  const stripe = Math.max(4, w / 9);
  for (let sx = x + stripe * 0.5; sx < x + w; sx += stripe * 2) {
    g.fillRect(Math.round(sx), y, Math.round(stripe), h);
  }
  // scalloped bottom edge shadow
  g.fillStyle = 'rgba(20,26,40,0.18)';
  g.fillRect(x, y + h - 2, w, 2);
}

function paintFrontFacade(g: CanvasRenderingContext2D, st: Style, spec: BuildingSpec, W: number, H: number, cols: number, floors: number) {
  const r = rng(spec.seed % 4 + spec.style * 31 + 7);
  g.fillStyle = st.wall;
  g.fillRect(0, 0, W, H);

  if (spec.roof === 'pitched') {
    // ── house front: door + framed windows + siding lines ──
    g.strokeStyle = 'rgba(255,255,255,0.20)';
    g.lineWidth = 1;
    for (let y = 6; y < H; y += 7) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    const doorW = W * 0.16, doorH = H * 0.52;
    const doorX = W * 0.5 - doorW / 2;
    g.fillStyle = st.trim;
    g.fillRect(Math.round(doorX), Math.round(H - doorH), Math.round(doorW), Math.round(doorH));
    g.fillStyle = 'rgba(255,255,255,0.65)';
    g.fillRect(Math.round(doorX + doorW * 0.62), Math.round(H - doorH * 0.55), 2, 2); // knob
    const winW = W * 0.17, winH = H * 0.30;
    paintWindow(g, st, W * 0.14, H * 0.34, winW, winH, r() < 0.3);
    paintWindow(g, st, W * 0.68, H * 0.34, winW, winH, r() < 0.3);
    // doorstep
    g.fillStyle = 'rgba(255,255,255,0.5)';
    g.fillRect(Math.round(doorX - 2), H - 3, Math.round(doorW + 4), 3);
    return;
  }

  // ── downtown facade: floor lines + framed window grid ──
  const gy = spec.storefront ? H * 0.22 : H * 0.05; // ground band reserved
  const topPad = H * 0.06;
  const availH = H - gy - topPad;
  const mx = W * 0.09;
  const cw = (W - mx * 2) / cols;
  const ch = availH / floors;
  // floor separation lines
  g.strokeStyle = 'rgba(20,26,40,0.10)';
  g.lineWidth = Math.max(1, ch * 0.06);
  for (let fl = 1; fl < floors; fl++) {
    const y = topPad + fl * ch;
    g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke();
  }
  for (let fl = 0; fl < floors; fl++) {
    for (let c = 0; c < cols; c++) {
      const x = mx + c * cw + cw * 0.16;
      const y = topPad + fl * ch + ch * 0.17;
      paintWindow(g, st, x, y, cw * 0.68, ch * 0.60, r() < 0.16);
    }
  }
  // cornice under the roofline
  g.fillStyle = 'rgba(255,255,255,0.30)';
  g.fillRect(0, 0, W, Math.max(2, topPad * 0.5));

  if (spec.storefront) {
    // ground floor: striped awning + shop glass + door
    const bandY = H - gy;
    g.fillStyle = st.trim;
    g.fillRect(0, bandY, W, gy);
    paintAwning(g, st, 0, bandY - gy * 0.28, W, gy * 0.34);
    g.fillStyle = st.win;
    g.fillRect(Math.round(W * 0.10), Math.round(bandY + gy * 0.22), Math.round(W * 0.46), Math.round(gy * 0.58));
    g.fillStyle = 'rgba(255,255,255,0.9)';
    g.fillRect(Math.round(W * 0.66), Math.round(bandY + gy * 0.14), Math.round(W * 0.16), Math.round(gy * 0.86));
  } else if (spec.style === 2 && floors >= 3 && W > 60) {
    // brick mid-rise: FIRE ESCAPE zigzag down one window column (hole.io DNA)
    const colIdx = Math.floor(r() * cols);
    const fx0 = mx + colIdx * cw + cw * 0.08;
    const fx1 = fx0 + cw * 0.84;
    g.strokeStyle = 'rgba(35,40,55,0.72)';
    g.lineWidth = 1.4;
    for (let fl = 0; fl < floors; fl++) {
      const py = topPad + (fl + 0.86) * ch;
      // platform
      g.beginPath(); g.moveTo(fx0, py); g.lineTo(fx1, py); g.stroke();
      // diagonal stair to the next platform
      if (fl < floors - 1) {
        g.beginPath(); g.moveTo(fl % 2 ? fx1 : fx0, py); g.lineTo(fl % 2 ? fx0 : fx1, py + ch); g.stroke();
      }
      // railing posts
      g.beginPath(); g.moveTo(fx0, py); g.lineTo(fx0, py - ch * 0.22); g.stroke();
      g.beginPath(); g.moveTo(fx1, py); g.lineTo(fx1, py - ch * 0.22); g.stroke();
    }
  }
}

function faceTexture(spec: BuildingSpec, side: boolean): HTMLCanvasElement {
  const st = STYLES[spec.style % STYLES.length];
  const key = faceKey(spec, side);
  const cache = side ? _sideCache : _faceCache;
  const hit = cache.get(key);
  if (hit) return hit;

  const wWU = side ? spec.d * 2 : spec.w * 2;
  const floors = Math.max(1, Math.round(spec.h / 46));
  const cols = Math.max(1, Math.round(wWU / 52));
  const W = Math.max(8, Math.round(wWU * TEX_SCALE));
  const H = Math.max(8, Math.round(spec.h * TEX_SCALE));
  const cvs = document.createElement('canvas');
  cvs.width = W; cvs.height = H;
  const g = cvs.getContext('2d')!;

  if (side) {
    // side face: darker wall + simple framed windows, no storefront
    g.fillStyle = st.wallSide;
    g.fillRect(0, 0, W, H);
    const r = rng(spec.seed % 4 + 91);
    const topPad = H * 0.06;
    const ch = (H - topPad * 2) / floors;
    const cw = (W - W * 0.16) / cols;
    for (let fl = 0; fl < floors; fl++) {
      for (let c = 0; c < cols; c++) {
        paintWindow(g, st, W * 0.08 + c * cw + cw * 0.2, topPad + fl * ch + ch * 0.2, cw * 0.6, ch * 0.55, r() < 0.10);
      }
    }
  } else {
    paintFrontFacade(g, st, spec, W, H, cols, floors);
  }
  cache.set(key, cvs);
  return cvs;
}

// ── Roof texture: parapet + FURNITURE (water tower, AC, skylights, vents) ────
function roofTexture(spec: BuildingSpec): HTMLCanvasElement {
  const st = STYLES[spec.style % STYLES.length];
  const key = `${faceKey(spec, false)}|roof|${Math.round(spec.d / 18)}`;
  const hit = _roofCache.get(key);
  if (hit) return hit;

  const W = Math.max(10, Math.round(spec.w * 2 * TEX_SCALE));
  const H = Math.max(8, Math.round(spec.d * 2 * TEX_SCALE));
  const cvs = document.createElement('canvas');
  cvs.width = W; cvs.height = H;
  const g = cvs.getContext('2d')!;
  const r = rng(spec.seed % 4 * 13 + spec.style * 7 + 3);

  if (spec.roof === 'pitched') {
    // two-slope roof with STRONG tone separation (the hole.io house read):
    // sun-lit south slope, clearly darker north slope, crisp white ridge cap.
    const ridge = H * 0.44;
    const dk = _shade(st.roof, -0.28);
    const lt = _shade(st.roof, 0.10);
    g.fillStyle = dk;                       // north slope (away from sun)
    g.fillRect(0, 0, W, Math.ceil(ridge));
    g.fillStyle = lt;                       // south slope (lit)
    g.fillRect(0, Math.floor(ridge), W, H - Math.floor(ridge));
    // sparse, faint shingle course lines (dense ones read as corrugated metal)
    g.strokeStyle = 'rgba(0,0,0,0.07)';
    g.lineWidth = 1;
    for (let y = ridge + 6; y < H - 2; y += 7) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    // ridge cap
    g.fillStyle = 'rgba(255,255,255,0.7)';
    g.fillRect(0, Math.round(ridge) - 1, W, 3);
    // gable edge trim
    g.fillStyle = 'rgba(255,255,255,0.45)';
    g.fillRect(0, 0, 2, H); g.fillRect(W - 2, 0, 2, H);
    // eave drip edge along the south rim
    g.fillStyle = 'rgba(0,0,0,0.14)';
    g.fillRect(0, H - 2, W, 2);
    // chimney
    if (r() < 0.75) {
      const chx = W * (0.16 + r() * 0.6);
      g.fillStyle = '#C9C2B6';
      g.fillRect(Math.round(chx), Math.round(ridge - H * 0.20), Math.max(4, W * 0.08), Math.max(5, H * 0.26));
      g.fillStyle = '#989185';
      g.fillRect(Math.round(chx) - 1, Math.round(ridge - H * 0.20) - 2, Math.max(4, W * 0.08) + 2, 2);
    }
    _roofCache.set(key, cvs);
    return cvs;
  }

  // ── flat downtown roof ──
  g.fillStyle = st.roof;
  g.fillRect(0, 0, W, H);
  // parapet: light lip + inner shadow inset
  g.strokeStyle = 'rgba(255,255,255,0.30)';
  g.lineWidth = 2.5;
  g.strokeRect(1.5, 1.5, W - 3, H - 3);
  g.strokeStyle = st.roofEdge;
  g.lineWidth = 2;
  g.strokeRect(4.5, 4.5, W - 9, H - 9);

  const edge = st.roofEdge;
  const deep = 'rgba(0,0,0,0.22)';
  // furniture kit, seeded — the hole.io roofscape
  // 1. WATER TOWER (brick/steel/cream mid-rise mostly)
  if ((spec.style === 2 || spec.style === 1 || spec.style === 3) && r() < 0.55 && W > 46 && H > 34) {
    const tx = W * (0.18 + r() * 0.45), ty = H * (0.22 + r() * 0.3);
    const tr = Math.min(W, H) * 0.16;
    // legs shadow
    g.fillStyle = deep;
    g.beginPath(); g.ellipse(tx + tr * 0.5, ty + tr * 0.6, tr * 1.15, tr * 0.5, 0, 0, Math.PI * 2); g.fill();
    // tank
    g.fillStyle = '#C8B48E';
    g.beginPath(); g.arc(tx, ty, tr, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(90,70,40,0.45)';
    g.lineWidth = 1.2;
    g.beginPath(); g.arc(tx, ty, tr, 0, Math.PI * 2); g.stroke();
    // conical cap highlight
    g.fillStyle = '#E2D2AE';
    g.beginPath(); g.arc(tx - tr * 0.28, ty - tr * 0.28, tr * 0.45, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#8E8474';
    g.beginPath(); g.arc(tx, ty, tr * 0.14, 0, Math.PI * 2); g.fill();
  }
  // 2. AC cluster: 2-4 boxes with fan circles
  const acN = 2 + Math.floor(r() * 3);
  for (let i = 0; i < acN; i++) {
    const ax = W * (0.12 + r() * 0.7), ay = H * (0.15 + r() * 0.62);
    const aw = Math.max(5, W * (0.09 + r() * 0.05)), ah = Math.max(4, H * 0.14);
    g.fillStyle = deep;
    g.fillRect(Math.round(ax) + 2, Math.round(ay) + 2, Math.round(aw), Math.round(ah));
    g.fillStyle = '#D5D9DE';
    g.fillRect(Math.round(ax), Math.round(ay), Math.round(aw), Math.round(ah));
    g.strokeStyle = 'rgba(60,70,85,0.5)';
    g.lineWidth = 1;
    g.strokeRect(Math.round(ax) + 0.5, Math.round(ay) + 0.5, Math.round(aw) - 1, Math.round(ah) - 1);
    // fan circle
    g.beginPath(); g.arc(ax + aw * 0.3, ay + ah * 0.5, Math.min(aw, ah) * 0.28, 0, Math.PI * 2); g.stroke();
  }
  // 3. skylight row (glassy buildings)
  if ((spec.style === 0 || spec.style === 4) && r() < 0.7 && W > 40) {
    const n = 3 + Math.floor(r() * 3);
    const sy = H * (0.3 + r() * 0.35);
    for (let i = 0; i < n; i++) {
      const sx = W * 0.14 + (i * W * 0.72) / n;
      g.fillStyle = st.win;
      g.fillRect(Math.round(sx), Math.round(sy), Math.max(4, W * 0.08), Math.max(3, H * 0.10));
      g.strokeStyle = 'rgba(255,255,255,0.6)';
      g.strokeRect(Math.round(sx) + 0.5, Math.round(sy) + 0.5, Math.max(4, W * 0.08) - 1, Math.max(3, H * 0.10) - 1);
    }
  }
  // 4. vent pipes
  const vn = 1 + Math.floor(r() * 3);
  for (let i = 0; i < vn; i++) {
    const vx = W * (0.1 + r() * 0.78), vy = H * (0.14 + r() * 0.66);
    g.fillStyle = deep;
    g.beginPath(); g.arc(vx + 1, vy + 1, 2.4, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#B9BfC7';
    g.beginPath(); g.arc(vx, vy, 2.2, 0, Math.PI * 2); g.fill();
  }
  // 5. roof-access bulkhead
  if (r() < 0.5 && W > 34) {
    const bx = W * (0.55 + r() * 0.2), by = H * (0.5 + r() * 0.2);
    g.fillStyle = edge;
    g.fillRect(Math.round(bx), Math.round(by), Math.max(6, W * 0.12), Math.max(5, H * 0.16));
    g.fillStyle = 'rgba(255,255,255,0.35)';
    g.fillRect(Math.round(bx), Math.round(by), Math.max(6, W * 0.12), 2);
  }
  // 6. civic roof marking — hole.io reference DNA: the helipad tower
  if (spec.deco === 'helipad') {
    const hx = W * 0.5, hy = H * 0.5, hr = Math.min(W, H) * 0.34;
    g.fillStyle = 'rgba(255,255,255,0.9)';
    g.beginPath(); g.arc(hx, hy, hr, 0, Math.PI * 2); g.fill();
    g.fillStyle = st.roof;
    g.beginPath(); g.arc(hx, hy, hr - 3, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.9)';
    const hw2 = hr * 0.4, hh2 = hr * 0.55, bar = Math.max(2, hr * 0.16);
    g.fillRect(hx - hw2, hy - hh2, bar, hh2 * 2);
    g.fillRect(hx + hw2 - bar, hy - hh2, bar, hh2 * 2);
    g.fillRect(hx - hw2, hy - bar / 2, hw2 * 2, bar);
  } else if (spec.deco === 'cross') {
    const hx = W * 0.5, hy = H * 0.5, cr = Math.min(W, H) * 0.30;
    g.fillStyle = '#FFFFFF';
    g.beginPath(); g.arc(hx, hy, cr + 4, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#E8453C';
    const bar = cr * 0.6;
    g.fillRect(hx - bar / 2, hy - cr, bar, cr * 2);
    g.fillRect(hx - cr, hy - bar / 2, cr * 2, bar);
  }
  _roofCache.set(key, cvs);
  return cvs;
}

/** Civic buildings: distinctive extruded boxes (school/library/hospital/townhall). */
export function makeCivicSpec(kind: ObjectKind, size: number, seed: number): BuildingSpec {
  const base = { seed, storefront: false, roof: 'flat' as const };
  switch (kind) {
    case 'hospital':
      return { ...base, w: size * 1.15, d: size * 0.62, h: 210, style: 3, deco: 'cross' };
    case 'school':
      return { ...base, w: size * 1.3, d: size * 0.6, h: 115, style: 2 };
    case 'library':
      return { ...base, w: size * 1.05, d: size * 0.58, h: 100, style: 3 };
    case 'townhall':
      return { ...base, w: size * 1.2, d: size * 0.62, h: 170, style: 3, deco: 'helipad' };
    default:
      return { ...base, w: size, d: size * 0.6, h: 120, style: 1 };
  }
}

/**
 * Per-frame extruded draw. ctx must be in WORLD space (no translate applied
 * for this object). (bx, by) is the building centre, (cx, cy) the camera.
 */
/** Roof color for a building's style — used by the far-LOD dot draw. */
export function buildingRoofColor(spec: BuildingSpec): string {
  return STYLES[spec.style % STYLES.length].roof;
}

export function drawBuilding3D(
  ctx: CanvasRenderingContext2D,
  spec: BuildingSpec,
  bx: number, by: number,
  cx: number, cy: number,
) {
  const { w, d, h } = spec;
  // roof offset: fixed north tilt + radial lean away from camera centre
  const ox = (bx - cx) * LEAN * h;
  const oy = -h * LIFT + (by - cy) * Math.max(0, LEAN * 0.4) * h;

  const x0 = bx - w, x1 = bx + w;
  const y0 = by - d, y1 = by + d;

  // ── projected SE shadow (consistent sun; hole.io depth in one fill) ──
  {
    const sl = Math.min(h, SHADOW_MAX / Math.max(SHADOW_DX, SHADOW_DY));
    const dxs = sl * SHADOW_DX, dys = sl * SHADOW_DY;
    ctx.fillStyle = 'rgba(24,30,46,0.15)';
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y0);
    ctx.lineTo(x1 + dxs, y0 + dys);
    ctx.lineTo(x1 + dxs, y1 + dys);
    ctx.lineTo(x0 + dxs, y1 + dys);
    ctx.lineTo(x0, y1);
    ctx.closePath();
    ctx.fill();
  }

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

  // ── roof (baked texture: parapet + water tower + AC + skylights + vents) ──
  if (spec.roof === 'pitched') {
    // eaves: house roofs overhang their walls slightly on every side
    const ew = w * 0.09, ed = d * 0.08;
    ctx.drawImage(roofTexture(spec), x0 + ox - ew, y0 + oy - ed, (w + ew) * 2, (d + ed) * 2);
    ctx.fillStyle = 'rgba(20,26,40,0.30)';
    ctx.fillRect(x0 + ox - ew, y1 + oy + ed - 3, (w + ew) * 2, 3);
  } else {
    ctx.drawImage(roofTexture(spec), x0 + ox, y0 + oy, w * 2, d * 2);
    // AO seam where the facade meets the roof — separates the two planes
    ctx.fillStyle = 'rgba(20,26,40,0.30)';
    ctx.fillRect(x0 + ox, y1 + oy - 3, w * 2, 3);
  }

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
  const key = faceKey(spec, false);
  const hit = _spriteCache.get(key);
  if (hit) return hit;
  const face = faceTexture(spec, false);
  const roof = roofTexture(spec);
  const roofH = Math.max(6, Math.round(spec.d * 2 * TEX_SCALE * 0.5));
  const cvs = document.createElement('canvas');
  cvs.width = face.width;
  cvs.height = face.height + roofH;
  const g = cvs.getContext('2d')!;
  g.drawImage(roof, 0, 0, cvs.width, roofH);
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
  const key = `bldg3d_${faceKey(spec, false)}`;
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

/** Deterministic spec for a downtown parcel. rank01: 0 = plaza-adjacent, 1 = edge. */
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
  return { w: halfW, d: halfD, h, style, seed, storefront, roof: 'flat' };
}

/** Suburb house: pitched roof, siding facade, one of four house palettes. */
export function makeHouseSpec(size: number, seed: number): BuildingSpec {
  const jitter = ((seed * 2654435761) >>> 16 & 255) / 255;
  return {
    w: size * 1.02,
    d: size * 0.64,
    h: 56 + jitter * 26,
    style: 7 + (seed % 4),
    seed,
    storefront: false,
    roof: 'pitched',
  };
}
