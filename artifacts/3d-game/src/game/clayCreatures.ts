/**
 * clayCreatures.ts — Clay critter sprites replacing procedural green blobs.
 *
 * Sheet layout: critters_clay_sheet.png — 4 cols × 3 rows = 12 cells (row-major)
 *   Row 0: puppy (0), cat (1), blue_bird (2), squirrel (3)
 *   Row 1: duck (4), rabbit (5), magpie (6), hedgehog (7)
 *   Row 2: duck_alt (8), chicken (9), magpie_alt (10), hedgehog_alt (11)
 *
 * Existing wander / flee AI and KIND_INFO sizes are unchanged — only the draw
 * sprite is replaced. `id % N` selects among variants so instances look varied.
 * Sprites injected as spriteBounds-only visuals (no contactFrac override).
 */

import { extractComponents } from './spriteExtract';
import { objectSprites, spriteBounds, spriteAspect } from './sprites';

// One entry per cell after loadClayCreatures(); null until loaded.
export const clayCritterKeys: (string | null)[] = new Array(12).fill(null);

/**
 * Map an existing critter kind to its clay draw key.
 * Returns null if the sheet hasn't loaded yet (fallback to procedural blob).
 */
export function clayCritterKey(kind: string, id: number): string | null {
  switch (kind) {
    case 'dog':
      // puppy — single variant
      return clayCritterKeys[0];
    case 'cat':
      // tabby cat — single variant
      return clayCritterKeys[1];
    case 'bird':
      // blue bird (even ids) / magpie (odd ids) + alts for further variety
      if (id % 4 === 0) return clayCritterKeys[2];   // blue bird
      if (id % 4 === 1) return clayCritterKeys[6];   // magpie
      if (id % 4 === 2) return clayCritterKeys[10];  // magpie alt
      return clayCritterKeys[2];                      // blue bird fallback
    case 'squirrel':
      // squirrel — single variant
      return clayCritterKeys[3];
    case 'duck':
      // duck / duck-alt alternating
      return id % 2 === 0 ? clayCritterKeys[4] : clayCritterKeys[8];
    default:
      return null;
  }
}

// ── Internal helpers ─────────────────────────────────────────────────────────

function loadImg(src: string): Promise<HTMLImageElement | null> {
  return new Promise((res) => {
    const img = new Image();
    img.onload  = () => res(img);
    img.onerror = () => res(null);
    img.src = src;
  });
}

function toSquareFoot(src: HTMLCanvasElement): HTMLCanvasElement {
  const S = Math.max(src.width, src.height);
  const c = document.createElement('canvas');
  c.width = S; c.height = S;
  c.getContext('2d')!.drawImage(src, Math.round((S - src.width) / 2), S - src.height);
  return c;
}

function injectVisual(key: string, cvs: HTMLCanvasElement): void {
  const aspect = cvs.width / cvs.height;
  const sq = toSquareFoot(cvs);
  (objectSprites as Map<string, HTMLImageElement | HTMLCanvasElement>).set(key, sq);
  spriteBounds.set(key, { x: 0, y: 0, w: 1, h: 1 });
  spriteAspect.set(key, aspect);
}

let _loaded = false;

export async function loadClayCreatures(base: string): Promise<void> {
  if (_loaded) return;
  _loaded = true;
  const b = base.endsWith('/') ? base : base + '/';

  const img = await loadImg(`${b}assets/critters_clay_sheet.png`);
  let n = 0;

  if (img) {
    const cells = extractComponents(img, 4, 3, 'critters_clay_sheet');
    cells.forEach((cvs, i) => {
      if (cvs.width <= 1) return;
      const key = `clay_critter_${i}`;
      injectVisual(key, cvs);
      clayCritterKeys[i] = key;
      n++;
    });
  }

  console.log(
    `[clayCreatures] cutouts=${n} sheet=${img ? 'ok' : 'MISSING'}`,
  );
}
