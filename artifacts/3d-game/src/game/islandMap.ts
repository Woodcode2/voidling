// islandMap.ts — Phase 4: geometry-based island. Space parallax, drift, evolution sprites kept.
// Image processing (processIsland, floodFill, pixel classifier) fully removed.
// All terrain queries delegate to mapData.ts geometry + baked grid.

import { CONFIG } from './config';
import { extractComponents } from './spriteExtract';
import {
  bakeTerrainGrid,
  isWalkableGrid,
  getTerrainGrid,
  TERRAIN,
  type TerrainClass,
} from './mapData';
import { drawVectorGround } from './drawMap';

export { TERRAIN, type TerrainClass };

// ── ISLAND_SRC_W kept for backward-compat; zoom clamp removed in engine.ts ───
export const ISLAND_SRC_W = 2048;

// ── Drift objects (decorative, float in space outside the island) ─────────────

interface DriftObject {
  x: number; y: number;
  vx: number; vy: number;
  rot: number; rotSpeed: number;
  spriteIdx: number;
  size: number;
}

// ── Evolution sheet processing ────────────────────────────────────────────────

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload  = () => res(img);
    img.onerror = () => rej(new Error(`Failed to load ${src}`));
    img.src = src;
  });
}

/** Process evolution_sheet.png: component extraction (4 cells left→right). */
function processEvolutionSheet(img: HTMLImageElement): HTMLCanvasElement[] {
  return extractComponents(img, 4, 1, 'evolution_sheet');
}

/** Process drift_sheet.png: component extraction (3×2 grid). */
function processDriftSheet(img: HTMLImageElement): HTMLCanvasElement[] {
  return extractComponents(img, 3, 2, 'drift_sheet');
}

// ── Island state ──────────────────────────────────────────────────────────────
// No more walkableMask/terrainGrid/islandCanvas — those are geometry now.

export const islandState: {
  ready: boolean;
  spaceBgImg: HTMLImageElement | null;
  driftSprites: HTMLCanvasElement[];
  driftObjects: DriftObject[];
  nextDriftMs: number;
  formSprites: HTMLCanvasElement[];
} = {
  ready: false,
  spaceBgImg: null,
  driftSprites: [],
  driftObjects: [],
  nextDriftMs: 25000 + Math.random() * 15000,
  formSprites: [],
};

// ── Asset loading ─────────────────────────────────────────────────────────────

export async function loadIslandAssets(base: string): Promise<void> {
  try {
    // Phase 4: island_map.png no longer loaded for gameplay — vector ground only.
    const [spaceImg, driftImg, evoImg] = await Promise.all([
      loadImg(`${base}assets/space_bg.png`),
      loadImg(`${base}assets/drift_sheet.png`),
      loadImg(`${base}assets/evolution_sheet.png`).catch(() => null as unknown as HTMLImageElement),
    ]);

    islandState.spaceBgImg   = spaceImg;
    islandState.driftSprites = processDriftSheet(driftImg);
    if (evoImg) {
      islandState.formSprites = processEvolutionSheet(evoImg);
      console.log('[island] evolution sprites:', islandState.formSprites.length);
    }

    // Bake the 192×192 geometry terrain grid (O(192²) point-in-polygon calls at startup)
    bakeTerrainGrid();

    islandState.ready = true;
    console.log('[island] Phase 4 vector island ready ✓');
  } catch (e) {
    console.warn('[island] asset load failed — fallback active', e);
    // Still bake the terrain grid so gameplay doesn't hang
    bakeTerrainGrid();
    islandState.ready = true;
  }
}

// ── Terrain API (delegates to geometry grid) ──────────────────────────────────

/**
 * Returns true when worldX/Y is on walkable island ground.
 * Falls back to true while assets are loading so nothing breaks at boot.
 */
export function isWalkable(worldX: number, worldY: number): boolean {
  return isWalkableGrid(worldX, worldY);
}

/**
 * Returns the terrain class for a world-space position.
 * Falls back to PAVEMENT while grid is loading.
 */
export function getTerrainAt(worldX: number, worldY: number): TerrainClass {
  return getTerrainGrid(worldX, worldY);
}

// ── Drawing API ───────────────────────────────────────────────────────────────

/** Space background — tiled, parallaxed at 0.25× camera movement */
export function drawSpaceBg(
  ctx: CanvasRenderingContext2D,
  view: { x: number; y: number; w: number; h: number },
  camX: number,
  camY: number,
): void {
  if (!islandState.spaceBgImg) {
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

/**
 * Phase 4: draws the vector island ground (replaces painted island_map.png).
 * Called by world.ts drawGround(). Accepts clock + camZoom for waterfall animation
 * and cache invalidation.
 */
// Prompt 20 Stage 1: thread the world-space view rect so drawVectorGround can
// switch to a live viewport-clipped path at street zoom (crisp ground tiles).
export function drawIsland(
  ctx: CanvasRenderingContext2D,
  clock = 0,
  camZoom = 0.15,
  view?: { x: number; y: number; w: number; h: number },
): void {
  drawVectorGround(ctx, clock, camZoom, false, view);
}

/** No-op: grain overlay removed in Phase 4 (vector ground has flat fills). */
export function drawGrainOverlay(
  _ctx: CanvasRenderingContext2D,
  _view: { x: number; y: number; w: number; h: number },
): void {
  // intentionally empty — retained for backward-compat import
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

// ── Debug overlays ────────────────────────────────────────────────────────────

import { drawDebugTerrainVec } from './drawMap';
import { GRID_W, GRID_H, isInsideIsland } from './mapData';

/**
 * Debug overlay: tints terrain cells with semi-transparent colour per type.
 * Activate with ?debug=terrain in the URL.
 */
export function drawDebugTerrain(ctx: CanvasRenderingContext2D): void {
  drawDebugTerrainVec(ctx);
}

/**
 * Debug overlay: tints all non-walkable cells red at 40% opacity.
 * Activate with ?debug=mask in the URL.
 */
export function drawDebugMask(ctx: CanvasRenderingContext2D): void {
  const S = CONFIG.MAP_SIZE;
  const cw = S / GRID_W, ch = S / GRID_H;
  ctx.save();
  ctx.fillStyle = 'rgba(255, 0, 0, 0.4)';
  for (let gy = 0; gy < GRID_H; gy++) {
    for (let gx = 0; gx < GRID_W; gx++) {
      const wx = (gx + 0.5) * cw, wy = (gy + 0.5) * ch;
      if (!isInsideIsland(wx, wy)) {
        ctx.fillRect(gx * cw, gy * ch, cw, ch);
      }
    }
  }
  ctx.restore();
}
