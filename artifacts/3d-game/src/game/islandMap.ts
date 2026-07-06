// islandMap.ts — Phase 2: floating island world. Phase 3a: sharpness + evolution sprites.
// Handles image processing, 128×128 walkable mask, space parallax, drift objects.

import { CONFIG } from './config';
import { clamp } from './utils';
import { extractComponents } from './spriteExtract';

const MASK_W = 128;
const MASK_H = 128;

/**
 * Effective source-image detail resolution (island_map.png is 2048×2048).
 * Used for the zoom cap: max zoom = 2.5 × (ISLAND_SRC_W / MAP_SIZE) = 0.427.
 * The display canvas is still rendered at 4096 for smooth sub-pixel sampling.
 */
export const ISLAND_SRC_W = 2048;

// Background violet of the raw island_map.png — #1E1338
const BG_R = 0x1E, BG_G = 0x13, BG_B = 0x38;
const BG_THRESHOLD = 65; // generous colour-distance to catch anti-aliased fringe

// ── Terrain classification ────────────────────────────────────────────────────

export const TERRAIN = {
  SPACE:     0, // outside island entirely
  WATER:     1, // river / lagoon / ocean (blue-teal pixels)
  SAND:      2, // beach (warm golden)
  ROAD:      3, // road surface (low-saturation gray)
  GRASS:     4, // park / forest floor (green)
  PAVEMENT:  5, // default — paths, plazas, building lots
} as const;
export type TerrainClass = (typeof TERRAIN)[keyof typeof TERRAIN];

/** Classify a pixel's terrain from its RGB values. */
function classifyTerrain(r: number, g: number, b: number, a: number): TerrainClass {
  if (a < 20) return TERRAIN.SPACE;
  const chroma = Math.max(r, g, b) - Math.min(r, g, b);
  const bright  = (r + g + b) / 3;

  // WATER: blue or teal strongly dominant
  if (b > r + 35 && (b >= g - 25 || g > r + 20)) return TERRAIN.WATER;
  if (g > r + 30 && b > r + 30)                   return TERRAIN.WATER; // teal variant

  if (chroma < 28) {
    // Achromatic: ROAD (dark) or PAVEMENT (light)
    return bright > 155 ? TERRAIN.PAVEMENT : TERRAIN.ROAD;
  }

  // GRASS: green dominant
  if (g > r + 20 && g > b + 20) return TERRAIN.GRASS;

  // SAND: warm golden (R+G high, B lower, bright)
  if (r >= g && g > b + 20 && r - b > 35 && bright > 130) return TERRAIN.SAND;

  if (bright < 80) return TERRAIN.ROAD; // very dark areas are road-ish

  return TERRAIN.PAVEMENT; // default
}

function colorDist(r: number, g: number, b: number): number {
  const dr = r - BG_R, dg = g - BG_G, db = b - BG_B;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

/** BFS flood-fill from every edge pixel that matches the background → mark transparent */
function floodFillEdges(data: Uint8ClampedArray, w: number, h: number): void {
  const visited = new Uint8Array(w * h);
  const queue: number[] = [];
  let qHead = 0;

  const tryAdd = (px: number) => {
    if (visited[px]) return;
    const i = px * 4;
    if (data[i + 3] === 0 || colorDist(data[i], data[i + 1], data[i + 2]) < BG_THRESHOLD) {
      visited[px] = 1;
      queue.push(px);
    }
  };

  for (let x = 0; x < w; x++) { tryAdd(x); tryAdd((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { tryAdd(y * w); tryAdd(y * w + w - 1); }

  while (qHead < queue.length) {
    const px = queue[qHead++];
    const x = px % w, y = (px / w) | 0;
    data[px * 4 + 3] = 0;
    if (x > 0)     tryAdd(px - 1);
    if (x < w - 1) tryAdd(px + 1);
    if (y > 0)     tryAdd(px - w);
    if (y < h - 1) tryAdd(px + w);
  }
}

/** Keep only the largest connected blob of opaque pixels; clear all others */
function keepLargest(data: Uint8ClampedArray, w: number, h: number): void {
  const total = w * h;
  const label = new Int32Array(total).fill(-1);
  const sizes: number[] = [];
  let labelIdx = 0;

  for (let i = 0; i < total; i++) {
    if (label[i] >= 0 || data[i * 4 + 3] === 0) continue;
    const regionLabel = labelIdx++;
    let size = 0;
    const q: number[] = [i];
    label[i] = regionLabel;
    let qh = 0;
    while (qh < q.length) {
      const px = q[qh++];
      size++;
      const x = px % w, y = (px / w) | 0;
      const nb = [x > 0 ? px-1 : -1, x < w-1 ? px+1 : -1, y > 0 ? px-w : -1, y < h-1 ? px+w : -1];
      for (const n of nb) {
        if (n < 0 || label[n] >= 0 || data[n * 4 + 3] === 0) continue;
        label[n] = regionLabel; q.push(n);
      }
    }
    sizes[regionLabel] = size;
  }

  let best = -1, bestSize = 0;
  for (let l = 0; l < sizes.length; l++) {
    if (sizes[l] > bestSize) { bestSize = sizes[l]; best = l; }
  }

  for (let i = 0; i < total; i++) {
    if (label[i] >= 0 && label[i] !== best) data[i * 4 + 3] = 0;
  }
}

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload  = () => res(img);
    img.onerror = () => rej(new Error(`Failed to load ${src}`));
    img.src = src;
  });
}

// ── Drift objects (decorative, float in space outside the island) ─────────────

interface DriftObject {
  x: number; y: number;
  vx: number; vy: number;
  rot: number; rotSpeed: number;
  spriteIdx: number;
  size: number;
}

// ── Procedural grain texture ──────────────────────────────────────────────────

function generateGrainCanvas(): HTMLCanvasElement {
  const SIZE = 128;
  const c = document.createElement('canvas');
  c.width = SIZE; c.height = SIZE;
  const ctx = c.getContext('2d')!;
  const id = ctx.createImageData(SIZE, SIZE);
  const d = id.data;
  for (let i = 0; i < SIZE * SIZE; i++) {
    const v = Math.random() < 0.35 ? Math.floor(Math.random() * 70 + 170) : 110;
    const r = i * 4;
    d[r] = Math.round(v * 0.82); d[r+1] = Math.round(v * 0.70); d[r+2] = v; d[r+3] = 255;
  }
  ctx.putImageData(id, 0, 0);
  return c;
}

// ── Evolution sheet processing ────────────────────────────────────────────────

/** Trim a canvas to its opaque pixel bounding box */
function trimCanvas(src: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = src.getContext('2d')!;
  const w = src.width, h = src.height;
  const data = ctx.getImageData(0, 0, w, h).data;
  let minX = w, minY = h, maxX = 0, maxY = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 8) {
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < minX) return src;
  const out = document.createElement('canvas');
  out.width = maxX - minX + 2; out.height = maxY - minY + 2;
  out.getContext('2d')!.drawImage(src, minX, minY, out.width, out.height, 0, 0, out.width, out.height);
  return out;
}

/**
 * Process evolution_sheet.png: component extraction (4 cells left→right).
 * Cells: MUNCHER, GOBBLER, DEVOURER, WORLD ENDER
 */
function processEvolutionSheet(img: HTMLImageElement): HTMLCanvasElement[] {
  return extractComponents(img, 4, 1, 'evolution_sheet');
}

/** Process drift_sheet.png: component extraction (3×2 grid). */
function processDriftSheet(img: HTMLImageElement): HTMLCanvasElement[] {
  return extractComponents(img, 3, 2, 'drift_sheet');
}

export const islandState: {
  ready: boolean;
  walkableMask: Uint8Array;   // non-generic: accepts ArrayBuffer and ArrayBufferLike alike
  terrainGrid: Uint8Array;    // 128×128 — TerrainClass per cell (SPACE/WATER/SAND/ROAD/GRASS/PAVEMENT)
  islandCanvas: HTMLCanvasElement | null;
  spaceBgImg: HTMLImageElement | null;
  driftSprites: HTMLCanvasElement[];
  driftObjects: DriftObject[];
  nextDriftMs: number;
  srcW: number;               // effective source detail res — used for zoom-cap math
  grainCanvas: HTMLCanvasElement | null;  // 128×128 procedural speckle tile
  formSprites: HTMLCanvasElement[];       // [MUNCHER, GOBBLER, DEVOURER, WORLD ENDER]
} = {
  ready: false,
  walkableMask: new Uint8Array(MASK_W * MASK_H),
  terrainGrid:  new Uint8Array(MASK_W * MASK_H),
  islandCanvas: null,
  spaceBgImg: null,
  driftSprites: [],
  driftObjects: [],
  nextDriftMs: 25000 + Math.random() * 15000,
  srcW: ISLAND_SRC_W,
  grainCanvas: null,
  formSprites: [],
};

// ── Image processing ──────────────────────────────────────────────────────────

function processIsland(
  img: HTMLImageElement,
): { canvas: HTMLCanvasElement; mask: Uint8Array; terrain: Uint8Array } {
  // Process at 2048 — fast pixel ops, matches source image resolution
  const PROC = 2048;
  const tmp = document.createElement('canvas');
  tmp.width = PROC; tmp.height = PROC;
  const tc = tmp.getContext('2d')!;
  tc.drawImage(img, 0, 0, PROC, PROC);
  const id = tc.getImageData(0, 0, PROC, PROC);
  floodFillEdges(id.data, PROC, PROC);
  keepLargest(id.data, PROC, PROC);
  tc.putImageData(id, 0, 0);

  // Display canvas: 4096×4096 — 2× bilinear upscale for smooth sub-pixel sampling.
  // Zoom cap uses ISLAND_SRC_W=2048 (source resolution), not 4096, for correct magnification.
  const DRAW = 4096;
  const display = document.createElement('canvas');
  display.width = DRAW; display.height = DRAW;
  display.getContext('2d')!.drawImage(tmp, 0, 0, DRAW, DRAW);

  // 128×128 walkable mask from processed result (alpha > 64 → walkable)
  const mc = document.createElement('canvas');
  mc.width = MASK_W; mc.height = MASK_H;
  const mcCtx = mc.getContext('2d')!;
  mcCtx.drawImage(tmp, 0, 0, MASK_W, MASK_H);
  const mid = mcCtx.getImageData(0, 0, MASK_W, MASK_H);
  const maskBuf = new ArrayBuffer(MASK_W * MASK_H);
  const mask = new Uint8Array(maskBuf) as Uint8Array<ArrayBuffer>;
  const terrain = new Uint8Array(MASK_W * MASK_H);
  for (let i = 0; i < MASK_W * MASK_H; i++) {
    const r = mid.data[i*4], g = mid.data[i*4+1], b = mid.data[i*4+2], a = mid.data[i*4+3];
    mask[i] = a > 64 ? 1 : 0;
    terrain[i] = classifyTerrain(r, g, b, a);
  }

  // Debug: log terrain breakdown for spot-checking
  const counts = [0, 0, 0, 0, 0, 0];
  for (let i = 0; i < terrain.length; i++) counts[terrain[i]]++;
  console.log(
    '[island] terrain cells — SPACE:', counts[0], 'WATER:', counts[1],
    'SAND:', counts[2], 'ROAD:', counts[3], 'GRASS:', counts[4], 'PAVEMENT:', counts[5],
  );

  return { canvas: display, mask, terrain };
}

export async function loadIslandAssets(base: string): Promise<void> {
  try {
    const [islandImg, spaceImg, driftImg, evoImg] = await Promise.all([
      loadImg(`${base}assets/island_map.png`),
      loadImg(`${base}assets/space_bg.png`),
      loadImg(`${base}assets/drift_sheet.png`),
      loadImg(`${base}assets/evolution_sheet.png`).catch(() => null as unknown as HTMLImageElement),
    ]);
    const { canvas, mask, terrain } = processIsland(islandImg);
    islandState.islandCanvas = canvas;
    islandState.walkableMask = mask;
    islandState.terrainGrid  = terrain;
    islandState.spaceBgImg = spaceImg;
    islandState.driftSprites = processDriftSheet(driftImg);
    islandState.grainCanvas = generateGrainCanvas();
    if (evoImg) {
      islandState.formSprites = processEvolutionSheet(evoImg);
      console.log('[island] evolution sprites:', islandState.formSprites.length);
    }
    islandState.ready = true;
    console.log('[island] assets ready ✓  mask walkable:', mask.reduce((a, b) => a + b, 0), 'of', mask.length, 'cells');
  } catch (e) {
    console.warn('[island] asset load failed — fallback terrain active', e);
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns true when worldX/Y is on the island (walkable).
 * Falls back to true while assets are loading so nothing breaks at boot.
 */
export function isWalkable(worldX: number, worldY: number): boolean {
  if (!islandState.ready) return true;
  const mx = clamp((worldX / CONFIG.MAP_SIZE) * MASK_W | 0, 0, MASK_W - 1);
  const my = clamp((worldY / CONFIG.MAP_SIZE) * MASK_H | 0, 0, MASK_H - 1);
  return islandState.walkableMask[my * MASK_W + mx] > 0;
}

/**
 * Returns the terrain class for a world-space position.
 * Falls back to PAVEMENT while assets are loading.
 */
export function getTerrainAt(worldX: number, worldY: number): TerrainClass {
  if (!islandState.ready) return TERRAIN.PAVEMENT;
  const mx = clamp((worldX / CONFIG.MAP_SIZE) * MASK_W | 0, 0, MASK_W - 1);
  const my = clamp((worldY / CONFIG.MAP_SIZE) * MASK_H | 0, 0, MASK_H - 1);
  return islandState.terrainGrid[my * MASK_W + mx] as TerrainClass;
}

/**
 * Debug overlay: tints terrain cells with semi-transparent colour per type.
 * Activate by loading the game with ?debug=terrain in the URL.
 * SPACE=skip, WATER=blue, SAND=yellow, ROAD=dark-gray, GRASS=green, PAVEMENT=tan.
 */
export function drawDebugTerrain(ctx: CanvasRenderingContext2D): void {
  if (!islandState.ready) return;
  const S = CONFIG.MAP_SIZE;
  const cw = S / MASK_W, ch = S / MASK_H;
  const COLORS = [
    '',                          // 0 SPACE — skip
    'rgba(30,80,255,0.45)',      // 1 WATER
    'rgba(255,210,20,0.40)',     // 2 SAND
    'rgba(50,50,50,0.45)',       // 3 ROAD
    'rgba(30,180,40,0.40)',      // 4 GRASS
    'rgba(200,165,110,0.35)',    // 5 PAVEMENT
  ];
  ctx.save();
  for (let my = 0; my < MASK_H; my++) {
    for (let mx = 0; mx < MASK_W; mx++) {
      const t = islandState.terrainGrid[my * MASK_W + mx];
      if (!COLORS[t]) continue;
      ctx.fillStyle = COLORS[t];
      ctx.fillRect(mx * cw, my * ch, cw, ch);
    }
  }
  ctx.restore();
}

// ── Drift object lifecycle ────────────────────────────────────────────────────

function spawnDrift(): void {
  if (islandState.driftSprites.length === 0) return;
  const S = CONFIG.MAP_SIZE;
  const side = (Math.random() * 4) | 0;
  const spd = 20 + Math.random() * 30;
  const margin = Math.max(1000, S * 0.1);
  let x = 0, y = 0, vx = 0, vy = 0;
  if (side === 0) { x = -600; y = margin + Math.random() * (S - margin * 2); vx = spd; vy = (Math.random() - 0.5) * spd * 0.2; }
  else if (side === 1) { x = S + 600; y = margin + Math.random() * (S - margin * 2); vx = -spd; vy = (Math.random() - 0.5) * spd * 0.2; }
  else if (side === 2) { y = -600; x = margin + Math.random() * (S - margin * 2); vy = spd; vx = (Math.random() - 0.5) * spd * 0.2; }
  else { y = S + 600; x = margin + Math.random() * (S - margin * 2); vy = -spd; vx = (Math.random() - 0.5) * spd * 0.2; }

  islandState.driftObjects.push({
    x, y, vx, vy,
    rot: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 0.3,
    spriteIdx: (Math.random() * islandState.driftSprites.length) | 0,
    size: 100 + Math.random() * 80,
  });
}

export function updateDrift(dt: number): void {
  if (!islandState.ready) return;
  const S = CONFIG.MAP_SIZE;
  const dtSec = dt / 1000;
  islandState.driftObjects = islandState.driftObjects.filter((d) => {
    d.x += d.vx * dtSec;
    d.y += d.vy * dtSec;
    d.rot += d.rotSpeed * dtSec;
    return d.x > -2500 && d.x < S + 2500 && d.y > -2500 && d.y < S + 2500;
  });
  islandState.nextDriftMs -= dt;
  if (islandState.nextDriftMs <= 0) {
    islandState.nextDriftMs = 20000 + Math.random() * 20000;
    spawnDrift();
  }
}

// ── Drawing helpers ───────────────────────────────────────────────────────────

/** Space background — tiled, parallaxed at 0.25× camera movement */
export function drawSpaceBg(
  ctx: CanvasRenderingContext2D,
  view: { x: number; y: number; w: number; h: number },
  camX: number,
  camY: number,
): void {
  if (!islandState.spaceBgImg || !islandState.ready) {
    ctx.fillStyle = CONFIG.COLORS.uiBg;
    ctx.fillRect(view.x, view.y, view.w, view.h);
    return;
  }
  const img = islandState.spaceBgImg;
  const tw = img.width, th = img.height;
  const ox = ((camX * 0.25) % tw + tw) % tw;
  const oy = ((camY * 0.25) % th + th) % th;
  const x0 = view.x - ((view.x + ox) % tw + tw) % tw;
  const y0 = view.y - ((view.y + oy) % th + th) % th;
  ctx.save();
  for (let ty = y0; ty < view.y + view.h + th; ty += th) {
    for (let tx = x0; tx < view.x + view.w + tw; tx += tw) {
      ctx.drawImage(img, tx, ty);
    }
  }
  ctx.restore();
}

/** Island image (transparent bg already removed) drawn to fill the world rect */
export function drawIsland(ctx: CanvasRenderingContext2D): void {
  if (!islandState.islandCanvas) return;
  ctx.drawImage(islandState.islandCanvas, 0, 0, CONFIG.MAP_SIZE, CONFIG.MAP_SIZE);
}

/**
 * Procedural 128px speckle/grain tile at 10% opacity — view-bounded.
 * Clipped to the camera rectangle so we only emit ~100 drawImage calls, not 8k+.
 */
export function drawGrainOverlay(
  ctx: CanvasRenderingContext2D,
  view: { x: number; y: number; w: number; h: number },
): void {
  if (!islandState.grainCanvas || !islandState.ready) return;
  const g = islandState.grainCanvas;
  const tw = g.width, th = g.height;
  const S = CONFIG.MAP_SIZE;
  // clamp to visible world area
  const left  = Math.max(0, view.x);
  const top   = Math.max(0, view.y);
  const right  = Math.min(S, view.x + view.w);
  const bottom = Math.min(S, view.y + view.h);
  if (right <= left || bottom <= top) return;
  ctx.save();
  ctx.globalAlpha = 0.10;
  const x0 = Math.floor(left / tw) * tw;
  const y0 = Math.floor(top  / th) * th;
  for (let ty = y0; ty < bottom; ty += th) {
    for (let tx = x0; tx < right; tx += tw) {
      ctx.drawImage(g, tx, ty);
    }
  }
  ctx.restore();
}

/** Drifting space objects — above space bg, below island */
export function drawDriftObjects(ctx: CanvasRenderingContext2D): void {
  for (const d of islandState.driftObjects) {
    const sprite = islandState.driftSprites[d.spriteIdx];
    if (!sprite) continue;
    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.rotate(d.rot);
    ctx.drawImage(sprite, -d.size / 2, -d.size / 2, d.size, d.size);
    ctx.restore();
  }
}

/**
 * Debug overlay: tints all non-walkable cells red at 40% opacity.
 * Activate by loading the game with ?debug=mask in the URL.
 */
export function drawDebugMask(ctx: CanvasRenderingContext2D): void {
  if (!islandState.ready) return;
  const S = CONFIG.MAP_SIZE;
  const cw = S / MASK_W, ch = S / MASK_H;
  ctx.save();
  ctx.fillStyle = 'rgba(255, 0, 0, 0.4)';
  for (let my = 0; my < MASK_H; my++) {
    for (let mx = 0; mx < MASK_W; mx++) {
      if (!islandState.walkableMask[my * MASK_W + mx]) {
        ctx.fillRect(mx * cw, my * ch, cw, ch);
      }
    }
  }
  ctx.restore();
}
