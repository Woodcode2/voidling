/**
 * clayAirport.ts — Rebuild Prompt 16: clay-render airport set art swap.
 *
 * Runs the new airport_clay_sheet.png through the SAME connected-component cutter
 * (spriteExtract.ts) and injects each cutout under its own pool key
 * (clay_airport_N). world.ts's structureSpriteKey() remaps airport kinds onto
 * these cutouts, so spawn logic and kind keys are untouched.
 *
 * Gameplay safety: injection sets ONLY spriteBounds (visual crop), never
 * spriteContactFrac. Eat-contact radius stays keyed off the unchanged KIND.
 *
 * Aspect safety: structures (terminal, control tower, hangar, windsock) are
 * foot-anchored. Vehicles (planes, baggage cart, fuel truck) are centre-padded
 * so they can rotate with heading, matching the clay_vehicle convention.
 */

import { extractComponents } from './spriteExtract';
import { objectSprites, spriteBounds, spriteAspect } from './sprites';
import type { ObjectKind } from './config';

// Row-major layout (4 cols × 2 rows = 8 cells) matching the sheet art.
export const AIRPORT_KINDS: ObjectKind[] = [
  'terminal', 'control_tower', 'hangar', 'plane_blue',
  'plane_peach', 'baggage_cart', 'windsock', 'fuel_truck',
];

// Indices of the vehicle-style cutouts (centre-padded for rotation).
const VEHICLE_INDICES = new Set([3, 4, 5, 7]); // plane_blue, plane_peach, baggage_cart, fuel_truck

// Draw-key pools (empty → world.ts falls back to the legacy kind sprite until
// the async sheet load finishes).
export const clayAirportKeys: string[] = [];

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
function injectVisual(key: string, sq: HTMLCanvasElement, aspect: number): void {
  (objectSprites as Map<string, HTMLImageElement | HTMLCanvasElement>).set(key, sq);
  spriteBounds.set(key, { x: 0, y: 0, w: 1, h: 1 });
  spriteAspect.set(key, aspect);
}

let _loaded = false;

export async function loadClayAirport(base: string): Promise<void> {
  if (_loaded) return;
  _loaded = true;
  const b = base.endsWith('/') ? base : base + '/';

  const airportImg = await loadImg(`${b}assets/airport_clay_sheet.png`);
  if (!airportImg) {
    console.warn('[clayAirport] airport_clay_sheet.png MISSING — airport keeps legacy art');
    return;
  }

  // 4 cols × 2 rows, row-major — 8 airport cutouts (all cells filled).
  const cells = extractComponents(airportImg, 4, 2, 'airport_clay_sheet');
  let n = 0;
  cells.forEach((cvs, i) => {
    if (cvs.width <= 1) return;
    const aspect = cvs.width / cvs.height;
    const key = `clay_airport_${i}`;
    injectVisual(key, VEHICLE_INDICES.has(i) ? toSquareCenter(cvs) : toSquareFoot(cvs), aspect);
    clayAirportKeys[i] = key;
    n++;
  });

  console.log(
    `[clayAirport] clay airport swap — cutouts=${n}/8 ` +
    `airport_sheet=ok`,
  );
}
