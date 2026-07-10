/**
 * clayFences.ts — Clay fence and hedge sprites for house lot perimeters.
 *
 * Sheet layout: fences_clay_sheet.png — 3 cols × 4 rows = 12 cells (row-major)
 *   Row 0: picket_run (0), picket_corner (1), picket_gate (2)
 *   Row 1: wooden_run_a (3), wooden_run_b (4), wooden_corner (5)
 *   Row 2: hedge_run (6), hedge_ball (7), stone_run_a (8)
 *   Row 3: stone_run_b (9), stone_corner (10), planter (11)
 *
 * Cozy blocks → picket or wooden style.
 * Fancy blocks → hedge or stone style, plus optional planter accent.
 *
 * Sprites are injected as spriteBounds-only visuals (same pattern as
 * clayScenery.ts) — no spriteContactFrac set.
 */

import { extractComponents } from './spriteExtract';
import { objectSprites, spriteBounds, spriteAspect } from './sprites';

// One populated entry per cell after loadClayFences(); null until loaded.
export const clayFenceKeys: (string | null)[] = new Array(12).fill(null);

// ── Named key constants ──────────────────────────────────────────────────────
export const FENCE_PICKET_RUN    = 'clay_fence_0';
export const FENCE_PICKET_CORNER = 'clay_fence_1';
export const FENCE_PICKET_GATE   = 'clay_fence_2';
export const FENCE_WOODEN_RUN_A  = 'clay_fence_3';
export const FENCE_WOODEN_RUN_B  = 'clay_fence_4';
export const FENCE_WOODEN_CORNER = 'clay_fence_5';
export const FENCE_HEDGE_RUN     = 'clay_fence_6';
export const FENCE_HEDGE_BALL    = 'clay_fence_7';
export const FENCE_STONE_RUN_A   = 'clay_fence_8';
export const FENCE_STONE_RUN_B   = 'clay_fence_9';
export const FENCE_STONE_CORNER  = 'clay_fence_10';
export const FENCE_PLANTER       = 'clay_fence_11';

// ── Style tables for world.ts lot placement ──────────────────────────────────
// run[]: cycle through available run variants for variety
// corner: single corner type per style
// gate: placed at driveway opening (null = leave a plain gap)
export interface FenceStyle {
  run: readonly string[];
  corner: string;
  gate: string | null;
}

export const FENCE_COZY_STYLES: readonly FenceStyle[] = [
  { run: [FENCE_PICKET_RUN],                 corner: FENCE_PICKET_CORNER, gate: FENCE_PICKET_GATE },
  { run: [FENCE_WOODEN_RUN_A, FENCE_WOODEN_RUN_B], corner: FENCE_WOODEN_CORNER, gate: null },
];

export const FENCE_FANCY_STYLES: readonly FenceStyle[] = [
  { run: [FENCE_HEDGE_RUN],                  corner: FENCE_HEDGE_BALL,   gate: null },
  { run: [FENCE_STONE_RUN_A, FENCE_STONE_RUN_B],   corner: FENCE_STONE_CORNER, gate: null },
];

export const FENCE_PLANTER_KEY = FENCE_PLANTER;

// ── Internal helpers ─────────────────────────────────────────────────────────

function loadImg(src: string): Promise<HTMLImageElement | null> {
  return new Promise((res) => {
    const img = new Image();
    img.onload  = () => res(img);
    img.onerror = () => res(null);
    img.src = src;
  });
}

/** Pad a tight cutout to a square canvas, content anchored bottom-centre. */
function toSquareFoot(src: HTMLCanvasElement): HTMLCanvasElement {
  const S = Math.max(src.width, src.height);
  const c = document.createElement('canvas');
  c.width = S; c.height = S;
  c.getContext('2d')!.drawImage(src, Math.round((S - src.width) / 2), S - src.height);
  return c;
}

/** Inject a clay cutout as a visual-only sprite (spriteBounds + aspect, no contactFrac). */
function injectVisual(key: string, cvs: HTMLCanvasElement): void {
  const aspect = cvs.width / cvs.height;
  const sq = toSquareFoot(cvs);
  (objectSprites as Map<string, HTMLImageElement | HTMLCanvasElement>).set(key, sq);
  spriteBounds.set(key, { x: 0, y: 0, w: 1, h: 1 });
  spriteAspect.set(key, aspect);
}

let _loaded = false;

export async function loadClayFences(base: string): Promise<void> {
  if (_loaded) return;
  _loaded = true;
  const b = base.endsWith('/') ? base : base + '/';

  const img = await loadImg(`${b}assets/fences_clay_sheet.png`);
  let n = 0;

  if (img) {
    const cells = extractComponents(img, 3, 4, 'fences_clay_sheet');
    cells.forEach((cvs, i) => {
      if (cvs.width <= 1) return;
      const key = `clay_fence_${i}`;
      injectVisual(key, cvs);
      clayFenceKeys[i] = key;
      n++;
    });
  }

  console.log(
    `[clayFences] cutouts=${n} sheet=${img ? 'ok' : 'MISSING'}`,
  );
}
