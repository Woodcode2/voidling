/**
 * clayMilitary.ts — Rebuild Prompt 16: clay-render toy army art swap.
 *
 * Runs the new military_clay_sheet.png through the SAME connected-component cutter
 * (spriteExtract.ts) and injects each cutout under its own pool key
 * (clay_military_N). world.ts's structureSpriteKey() remaps the existing defense
 * kinds onto these cutouts, so wave timing, counts, and behavior are untouched;
 * only the sprites change.
 *
 * Gameplay safety: injection sets ONLY spriteBounds (visual crop), never
 * spriteContactFrac. Eat-contact radius stays keyed off the unchanged KIND.
 *
 * Aspect safety: vehicles (tank, helicopter, jeep, rocket truck, radar van) are
 * centre-padded for heading rotation. Soldiers are foot-anchored.
 */

import { extractComponents } from './spriteExtract';
import { objectSprites, spriteBounds } from './sprites';
import type { ObjectKind } from './config';

// Row-major layout (3 cols × 2 rows = 6 cells) matching the sheet art.
// Prompt 16 lists: tank, helicopter, jeep, rocket truck, radar van, soldier.
export const MILITARY_KINDS: ObjectKind[] = [
  'tank', 'attack_heli', 'army_jeep',
  'missile_truck', 'radar_van', 'soldier',
];

// Indices of the vehicle-style cutouts (centre-padded for rotation).
// Soldiers are foot-anchored.
const VEHICLE_INDICES = new Set([0, 1, 2, 3, 4]); // tank, heli, jeep, rocket truck, radar van

// Draw-key pools (empty → world.ts falls back to the legacy kind sprite until
// the async sheet load finishes).
export const clayMilitaryKeys: string[] = [];

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

/** Pad a tight cutout into a square canvas, content centred (for rotation). */
function toSquareCenter(src: HTMLCanvasElement): HTMLCanvasElement {
  const S = Math.max(src.width, src.height);
  const c = document.createElement('canvas');
  c.width = S; c.height = S;
  c.getContext('2d')!.drawImage(
    src, Math.round((S - src.width) / 2), Math.round((S - src.height) / 2),
  );
  return c;
}

/** Inject a clay cutout under a draw key — visual bounds only, no contact frac. */
function injectVisual(key: string, sq: HTMLCanvasElement): void {
  (objectSprites as Map<string, HTMLImageElement | HTMLCanvasElement>).set(key, sq);
  spriteBounds.set(key, { x: 0, y: 0, w: 1, h: 1 });
}

let _loaded = false;

export async function loadClayMilitary(base: string): Promise<void> {
  if (_loaded) return;
  _loaded = true;
  const b = base.endsWith('/') ? base : base + '/';

  const militaryImg = await loadImg(`${b}assets/military_clay_sheet.png`);
  if (!militaryImg) {
    console.warn('[clayMilitary] military_clay_sheet.png MISSING — military keeps legacy art');
    return;
  }

  // 3 cols × 2 rows, row-major — 6 military cutouts.
  const cells = extractComponents(militaryImg, 3, 2, 'military_clay_sheet');
  let n = 0;
  cells.forEach((cvs, i) => {
    if (cvs.width <= 1) return;
    const key = `clay_military_${i}`;
    injectVisual(key, VEHICLE_INDICES.has(i) ? toSquareCenter(cvs) : toSquareFoot(cvs));
    clayMilitaryKeys[i] = key;
    n++;
  });

  console.log(
    `[clayMilitary] clay military swap — cutouts=${n}/6 ` +
    `clay_military_sheet=ok`,
  );
}
