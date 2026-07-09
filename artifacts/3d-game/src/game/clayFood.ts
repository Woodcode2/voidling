/**
 * clayFood.ts — Rebuild Prompt 9: clay-render food + street-furniture art swap.
 *
 * Ends the last flat-2D holdout among the bonus-food kinds. food_clay_sheet.png
 * is run through the SAME connected-component cutter (spriteExtract.ts) as every
 * other clay swap, and each cutout is injected under its own pool key
 * (clay_food_N). world.ts's structureSpriteKey() remaps the existing scattered
 * food kinds onto these cutouts — spawn logic and kind keys are untouched.
 *
 * Sheet layout (4 cols × 3 rows, row-major, verified against the sheet art):
 *   0 apple      1 cherries   2 potted-flower  3 snail
 *   4 gnome      5 gold-coins 6 gem-crystal    7 cupcake
 *   8 mushroom   9 hydrant   10 mailbox       11 trash-bin
 *
 * Gameplay safety: injection sets ONLY spriteBounds (visual crop), never
 * spriteContactFrac. Eat-contact radius stays keyed off the unchanged KIND, and
 * these food objects remain bonus food excluded from the percent-devoured win
 * math + respawn population — this file changes rendering only.
 *
 * Aspect safety: each tight cutout is padded into a SQUARE canvas, content
 * anchored bottom-centre, so it reuses the existing foot-Y draw pass undistorted.
 */

import { extractComponents } from './spriteExtract';
import { objectSprites, spriteBounds, spriteAspect } from './sprites';
import type { ObjectKind } from './config';

// Each existing scattered food / street-furniture kind → its clay cutout cell.
// (flower is already remapped onto the clay nature pool in clayScenery.)
export const CLAY_FOOD_CELL: Partial<Record<ObjectKind, number>> = {
  flowerpot: 2,
  mushroom: 8,
  gnome: 4,
  mailbox: 10,
  hydrant: 9,
  trashcan: 11,
};

// The generic scattered 'apple' bonus food rotates through the edible-collectible
// cutouts (apple / cherries / gold-coin / gem / cupcake / snail) so a field of
// apples reads as varied clay treats instead of one repeated sprite.
const APPLE_VARIETY_CELLS = [0, 1, 5, 6, 7, 3];

// Draw-key gates (empty → world.ts falls back to the legacy kind sprite until
// the async sheet load finishes; avoids a missing-sprite window).
export const clayFoodKeys: string[] = [];
export const clayAppleVarietyKeys: string[] = [];

function loadImg(src: string): Promise<HTMLImageElement | null> {
  return new Promise((res) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => res(null);
    img.src = src;
  });
}

/** Pad a tight cutout into a square canvas, content anchored bottom-centre. */
function toSquareFoot(src: HTMLCanvasElement): HTMLCanvasElement {
  const S = Math.max(src.width, src.height);
  const c = document.createElement('canvas');
  c.width = S; c.height = S;
  c.getContext('2d')!.drawImage(src, Math.round((S - src.width) / 2), S - src.height);
  return c;
}

/** Inject a clay cutout under a draw key — visual bounds only, no contact frac. */
function injectVisual(key: string, sq: HTMLCanvasElement, aspect: number): void {
  (objectSprites as Map<string, HTMLImageElement | HTMLCanvasElement>).set(key, sq);
  spriteBounds.set(key, { x: 0, y: 0, w: 1, h: 1 });
  spriteAspect.set(key, aspect);
}

let _loaded = false;

export async function loadClayFood(base: string): Promise<void> {
  if (_loaded) return;
  _loaded = true;
  const b = base.endsWith('/') ? base : base + '/';

  const foodImg = await loadImg(`${b}assets/food_clay_sheet.png`);
  if (!foodImg) {
    console.warn('[clayFood] food_clay_sheet.png MISSING — food keeps legacy art');
    return;
  }

  // 4 cols × 3 rows, row-major — 12 cutouts (all cells filled).
  const cells = extractComponents(foodImg, 4, 3, 'food_clay_sheet');
  let n = 0;
  cells.forEach((cvs, i) => {
    if (cvs.width <= 1) return;
    const aspect = cvs.width / cvs.height;
    const key = `clay_food_${i}`;
    injectVisual(key, toSquareFoot(cvs), aspect);
    clayFoodKeys[i] = key;
    n++;
  });

  // Build the apple variety pool from whatever cutouts survived the cut.
  for (const cell of APPLE_VARIETY_CELLS) {
    if (clayFoodKeys[cell]) clayAppleVarietyKeys.push(clayFoodKeys[cell]);
  }

  console.log(
    `[clayFood] clay food swap — cutouts=${n}/12 ` +
    `appleVariety=${clayAppleVarietyKeys.length} food_sheet=ok`,
  );
}
