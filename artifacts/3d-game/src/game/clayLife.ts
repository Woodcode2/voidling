/**
 * clayLife.ts — Rebuild Prompt 4: clay-render people + vehicle art swap.
 *
 * Same approach as clayCity.ts: run the two clay sheets through the SAME
 * connected-component cutter (spriteExtract.ts) and inject the cutouts into
 * separate POOL keys (clay_person_N / clay_vehicle_N). world.ts's
 * structureSpriteKey() remaps the ambient pedestrian + traffic kinds onto these
 * pools for variety, so spawn logic and kind keys are untouched.
 *
 * Gameplay safety: injection sets ONLY spriteBounds (visual crop), never
 * spriteContactFrac. Eat-contact radius is derived in makeObj from the KIND key
 * (via SPRITE_KEY_MAP), which still carries its original contactFrac from
 * wardSprites — so contact radius for people and cars is unchanged.
 *
 * Aspect safety: the draw maps a sprite's bounds into a fixed 2r square. Each
 * tight cutout is padded into a SQUARE canvas so square→square renders
 * undistorted. People are foot-anchored (bottom-centre) to reuse the existing
 * foot-Y draw. Vehicles are CENTRE-anchored so the new heading rotation
 * (world.ts) spins them about their middle instead of orbiting their feet.
 */

import { extractComponents } from './spriteExtract';
import { objectSprites, spriteBounds, spriteAspect } from './sprites';
import type { ObjectKind } from './config';

// Prompt 19 Stage 2: hand-tagged sitter indices in the 4×3 people sheet.
// Indices 8 and 11 (row 2 of 4) correspond to cross-legged / seated figures.
// SITTERS never enter the walk/wander pool — they spawn only as static seated life.
export const SITTER_CLAY_INDICES = new Set<number>([8, 11]);

// Keys that resolve to sitter poses (populated after sheet loads).
export const sitterClayKeys: string[] = [];

// Ambient pedestrian kinds remapped onto the clay-person pool (variety by id).
// Vignette anchors (multi-figure scene art) and special NPCs are intentionally
// excluded — they keep their own sprites.
export const CLAY_PERSON_KINDS: ObjectKind[] = [
  'person',
  'person_biz', 'person_jog', 'person_kid', 'person_granny', 'person_fish',
  'person_sun', 'person_guard', 'person_dog', 'person_const',
  'person_mom', 'person_dad', 'skateboarder', 'cyclist', 'waiter',
  'icecream_vendor', 'person_jog2', 'person_elderly', 'tourist',
];

// Moving traffic vehicles remapped onto the clay-vehicle pool. Parked-car
// dressing kinds (car_parked_a/b) and defense/military units are left as-is.
export const CLAY_VEHICLE_KINDS: ObjectKind[] = [
  'car', 'schoolbus', 'taxi', 'convertible', 'fire_truck', 'school_bus',
];

// Draw-key pools (empty → world.ts falls back to the legacy kind sprite).
export const clayPeopleKeys: string[] = [];
export const clayVehicleKeys: string[] = [];

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

/** Inject a clay cutout under a draw key — visual bounds only, no contact frac.
 *  aspect = tight pixel width / tight pixel height (before square-padding). */
function injectVisual(key: string, sq: HTMLCanvasElement, aspect: number): void {
  (objectSprites as Map<string, HTMLImageElement | HTMLCanvasElement>).set(key, sq);
  spriteBounds.set(key, { x: 0, y: 0, w: 1, h: 1 });
  spriteAspect.set(key, aspect);
}

let _loaded = false;

export async function loadClayLife(base: string): Promise<void> {
  if (_loaded) return;
  _loaded = true;
  const b = base.endsWith('/') ? base : base + '/';

  const [peopleImg, vehiclesImg] = await Promise.all([
    loadImg(`${b}assets/people_clay_sheet.png`),
    loadImg(`${b}assets/vehicles_clay_sheet.png`),
  ]);

  if (peopleImg) {
    // 4 cols × 3 rows, row-major — 12 figures (all cells filled).
    const cells = extractComponents(peopleImg, 4, 3, 'people_clay_sheet');
    cells.forEach((cvs, i) => {
      if (cvs.width <= 1) return;
      const aspect = cvs.width / cvs.height;
      const key = `clay_person_${i}`;
      injectVisual(key, toSquareFoot(cvs), aspect);
      clayPeopleKeys.push(key);
      if (SITTER_CLAY_INDICES.has(i)) sitterClayKeys.push(key);
    });
  }

  if (vehiclesImg) {
    // 5 cols × 3 rows, row-major — 15 vehicles (all cells filled).
    const cells = extractComponents(vehiclesImg, 5, 3, 'vehicles_clay_sheet');
    cells.forEach((cvs, i) => {
      if (cvs.width <= 1) return;
      const aspect = cvs.width / cvs.height;
      const key = `clay_vehicle_${i}`;
      injectVisual(key, toSquareCenter(cvs), aspect);
      clayVehicleKeys.push(key);
    });
  }

  console.log(
    `[clayLife] clay life swap — people=${clayPeopleKeys.length} ` +
    `vehicles=${clayVehicleKeys.length} people_sheet=${peopleImg ? 'ok' : 'MISSING'} ` +
    `vehicles_sheet=${vehiclesImg ? 'ok' : 'MISSING'}`,
  );
}
