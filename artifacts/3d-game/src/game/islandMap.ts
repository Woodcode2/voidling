// islandMap.ts — Phase 2: floating island world
// Handles image processing, 128×128 walkable mask, space parallax, drift objects.

import { CONFIG } from './config';
import { clamp } from './utils';

const MASK_W = 128;
const MASK_H = 128;

// Background violet of the raw island_map.png — #1E1338
const BG_R = 0x1E, BG_G = 0x13, BG_B = 0x38;
const BG_THRESHOLD = 65; // generous colour-distance to catch anti-aliased fringe

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

  // Seed all four edges
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
  const label = new Int32Array(total).fill(-1); // region label per pixel
  const sizes: number[] = [];
  let labelIdx = 0;

  for (let i = 0; i < total; i++) {
    if (label[i] >= 0 || data[i * 4 + 3] === 0) continue;
    // BFS to label this region
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

  // Find largest
  let best = -1, bestSize = 0;
  for (let l = 0; l < sizes.length; l++) {
    if (sizes[l] > bestSize) { bestSize = sizes[l]; best = l; }
  }

  // Clear all non-largest regions
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

export const islandState: {
  ready: boolean;
  walkableMask: Uint8Array;   // non-generic: accepts ArrayBuffer and ArrayBufferLike alike
  islandCanvas: HTMLCanvasElement | null;
  spaceBgImg: HTMLImageElement | null;
  driftSprites: HTMLCanvasElement[];
  driftObjects: DriftObject[];
  nextDriftMs: number;
} = {
  ready: false,
  walkableMask: new Uint8Array(MASK_W * MASK_H), // 1 = walkable (on island)
  islandCanvas: null,
  spaceBgImg: null,
  driftSprites: [],
  driftObjects: [],
  nextDriftMs: 25000 + Math.random() * 15000, // first drift 25-40s in
};

// ── Image processing ──────────────────────────────────────────────────────────

function processIsland(img: HTMLImageElement): { canvas: HTMLCanvasElement; mask: Uint8Array } {
  // Work at 1024 for fast pixel ops
  const PROC = 1024;
  const tmp = document.createElement('canvas');
  tmp.width = PROC; tmp.height = PROC;
  const tc = tmp.getContext('2d')!;
  tc.drawImage(img, 0, 0, PROC, PROC);
  const id = tc.getImageData(0, 0, PROC, PROC);
  floodFillEdges(id.data, PROC, PROC);
  keepLargest(id.data, PROC, PROC);
  tc.putImageData(id, 0, 0);

  // Render display canvas at 1536 (mobile-friendly, still crisp)
  const DRAW = 1536;
  const display = document.createElement('canvas');
  display.width = DRAW; display.height = DRAW;
  display.getContext('2d')!.drawImage(tmp, 0, 0, DRAW, DRAW);

  // Build 128×128 walkable mask
  const mc = document.createElement('canvas');
  mc.width = MASK_W; mc.height = MASK_H;
  mc.getContext('2d')!.drawImage(tmp, 0, 0, MASK_W, MASK_H);
  const mid = mc.getContext('2d')!.getImageData(0, 0, MASK_W, MASK_H);
  const maskBuf = new ArrayBuffer(MASK_W * MASK_H);
  const mask = new Uint8Array(maskBuf) as Uint8Array<ArrayBuffer>;
  for (let i = 0; i < MASK_W * MASK_H; i++) {
    mask[i] = mid.data[i * 4 + 3] > 64 ? 1 : 0;
  }

  return { canvas: display, mask };
}

function processDriftSheet(img: HTMLImageElement): HTMLCanvasElement[] {
  const COLS = 3, ROWS = 2;
  const tmp = document.createElement('canvas');
  tmp.width = img.width; tmp.height = img.height;
  const tc = tmp.getContext('2d')!;
  tc.drawImage(img, 0, 0);
  const id = tc.getImageData(0, 0, img.width, img.height);
  floodFillEdges(id.data, img.width, img.height);
  tc.putImageData(id, 0, 0);

  const cw = (img.width / COLS) | 0, ch = (img.height / ROWS) | 0;
  const sprites: HTMLCanvasElement[] = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const c = document.createElement('canvas');
      c.width = cw; c.height = ch;
      c.getContext('2d')!.drawImage(tmp, col * cw, row * ch, cw, ch, 0, 0, cw, ch);
      sprites.push(c);
    }
  }
  return sprites;
}

export async function loadIslandAssets(base: string): Promise<void> {
  try {
    const [islandImg, spaceImg, driftImg] = await Promise.all([
      loadImg(`${base}assets/island_map.png`),
      loadImg(`${base}assets/space_bg.png`),
      loadImg(`${base}assets/drift_sheet.png`),
    ]);
    const { canvas, mask } = processIsland(islandImg);
    islandState.islandCanvas = canvas;
    islandState.walkableMask = mask;
    islandState.spaceBgImg = spaceImg;
    islandState.driftSprites = processDriftSheet(driftImg);
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
  if (!islandState.ready) return true; // safe during load
  const mx = clamp((worldX / CONFIG.MAP_SIZE) * MASK_W | 0, 0, MASK_W - 1);
  const my = clamp((worldY / CONFIG.MAP_SIZE) * MASK_H | 0, 0, MASK_H - 1);
  return islandState.walkableMask[my * MASK_W + mx] > 0;
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
    // Fallback: solid dark violet + procedural stars (existing drawStars handles it)
    ctx.fillStyle = CONFIG.COLORS.uiBg;
    ctx.fillRect(view.x, view.y, view.w, view.h);
    return;
  }
  const img = islandState.spaceBgImg;
  const tw = img.width, th = img.height;
  // Parallax offset: 0.25× camera means bg moves at quarter speed
  const ox = ((camX * 0.25) % tw + tw) % tw;
  const oy = ((camY * 0.25) % th + th) % th;
  // Compute first tile origin so we tile to cover the whole view
  const x0 = view.x - ((view.x + ox) % tw + tw) % tw;
  const y0 = view.y - ((view.y + oy) % th + th) % th;
  ctx.save();
  // No alpha: space bg is fully opaque
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
