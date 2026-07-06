/**
 * wardSprites.ts — War Pack §1 sprite loader
 *
 * Slices three sprite sheets at runtime and injects the results into the
 * objectSprites / spriteBounds / spriteContactFrac / spriteOrb maps so
 * the existing draw pipeline picks them up automatically.
 *
 * Sheet layouts (all cells equal size):
 *   people_sheet.png    3 cols × 3 rows  (9 person kinds)
 *   vehicles_sheet.png  3 cols × 2 rows  (6 vehicle kinds)
 *   beachpark_sheet.png 3 cols × 3 rows  (5 beach/park props + 4 spare)
 */

import { objectSprites, spriteBounds, spriteContactFrac, spriteOrb } from './sprites';
import type { ObjectKind } from './config';

// ── Kind assignments per sheet cell (row-major order) ──────────────────────
const PEOPLE_KINDS: ObjectKind[] = [
  'person_biz', 'person_jog', 'person_kid',
  'person_granny', 'person_fish', 'person_sun',
  'person_guard', 'person_dog', 'person_const',
];

const VEHICLE_KINDS: ObjectKind[] = [
  'taxi', 'police_car', 'school_bus',
  'fire_truck', 'convertible', 'army_jeep',
];

const BEACHPARK_KINDS: (ObjectKind | null)[] = [
  'cooler', 'rowboat', 'picnic_table',
  'kite_prop', 'icecream_cart', null,
  null, null, null,
];

export { PEOPLE_KINDS };

// ── Helpers ────────────────────────────────────────────────────────────────

function loadImg(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);   // graceful fail — game renders procedurally
    img.crossOrigin = 'anonymous';
    img.src = src;
  });
}

/**
 * Slice a sheet image into `cols × rows` canvases, stripping near-white
 * backgrounds (BG-removal via flood-fill from the four corners).
 */
function sliceSheet(
  sheet: HTMLImageElement,
  cols: number,
  rows: number,
): HTMLCanvasElement[] {
  const cellW = Math.floor(sheet.naturalWidth / cols);
  const cellH = Math.floor(sheet.naturalHeight / rows);
  const result: HTMLCanvasElement[] = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const src = document.createElement('canvas');
      src.width = cellW; src.height = cellH;
      const g = src.getContext('2d')!;
      g.drawImage(sheet, col * cellW, row * cellH, cellW, cellH, 0, 0, cellW, cellH);

      // Flood-fill BG removal from four corners if near-white
      stripBackground(g, cellW, cellH);

      result.push(src);
    }
  }
  return result;
}

/** Flood-fill from the four corners; pixels with RGB all > 220 are made transparent. */
function stripBackground(g: CanvasRenderingContext2D, w: number, h: number) {
  const data = g.getImageData(0, 0, w, h);
  const px = data.data;
  const visited = new Uint8Array(w * h);

  const isNearWhite = (i: number) =>
    px[i] > 220 && px[i + 1] > 220 && px[i + 2] > 220;

  const queue: number[] = [];
  const seed = (x: number, y: number) => {
    const i = (y * w + x) * 4;
    if (!visited[y * w + x] && isNearWhite(i)) {
      visited[y * w + x] = 1;
      queue.push(x, y);
    }
  };
  seed(0, 0); seed(w - 1, 0); seed(0, h - 1); seed(w - 1, h - 1);

  while (queue.length) {
    const y = queue.pop()!;
    const x = queue.pop()!;
    const i = (y * w + x) * 4;
    px[i + 3] = 0;
    for (const [dx, dy] of [[-1,0],[1,0],[0,-1],[0,1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
      const ni = (ny * w + nx) * 4;
      if (!visited[ny * w + nx] && isNearWhite(ni)) {
        visited[ny * w + nx] = 1;
        queue.push(nx, ny);
      }
    }
  }
  g.putImageData(data, 0, 0);
}

/**
 * Scan a canvas sprite to fill spriteBounds, spriteContactFrac, spriteOrb.
 * Mirrors the logic in sprites.ts scanAlphaBounds / orb-band scan.
 */
function scanCanvasBounds(cvs: HTMLCanvasElement, key: string) {
  const g = cvs.getContext('2d');
  if (!g) return;
  const W = cvs.width, H = cvs.height;
  const data = g.getImageData(0, 0, W, H).data;

  let minX = W, minY = H, maxX = -1, maxY = -1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (data[(y * W + x) * 4 + 3] > 8) {
        if (x < minX) minX = x; if (y < minY) minY = y;
        if (x > maxX) maxX = x; if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return; // fully transparent

  spriteBounds.set(key, {
    x: minX / W, y: minY / H,
    w: (maxX - minX + 1) / W,
    h: (maxY - minY + 1) / H,
  });

  // Contact-radius fraction from bottom-third scan
  const bY0 = Math.floor(H * 2 / 3);
  let bMinX = W, bMaxX = -1;
  for (let y = bY0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (data[(y * W + x) * 4 + 3] > 8) {
        if (x < bMinX) bMinX = x;
        if (x > bMaxX) bMaxX = x;
      }
    }
  }
  if (bMaxX >= 0) {
    spriteContactFrac.set(key, (bMaxX - bMinX + 1) / W);
  }

  // Orb-band: rows 35%–95% of trimmed height → widest opaque run
  const trimH = maxY - minY + 1;
  const orbY0 = minY + Math.floor(trimH * 0.35);
  const orbY1 = minY + Math.floor(trimH * 0.95);
  let orbMinX = W, orbMaxX = -1, orbCySum = 0, orbCyCount = 0;
  for (let y = orbY0; y <= orbY1 && y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (data[(y * W + x) * 4 + 3] > 8) {
        if (x < orbMinX) orbMinX = x;
        if (x > orbMaxX) orbMaxX = x;
      }
    }
    if (orbMaxX >= 0) { orbCySum += y; orbCyCount++; }
  }
  if (orbMaxX >= 0 && orbCyCount > 0) {
    spriteOrb.set(key, { w: (orbMaxX - orbMinX + 1) / W, cy: (orbCySum / orbCyCount) / H });
  }
}

// ── Main export ─────────────────────────────────────────────────────────────

let _loaded = false;

export async function loadWardAssets(base: string): Promise<void> {
  if (_loaded) return;
  _loaded = true;

  // Normalise base (ensure trailing slash)
  const b = base.endsWith('/') ? base : base + '/';

  const [peopleImg, vehiclesImg, beachparkImg] = await Promise.all([
    loadImg(`${b}assets/people_sheet.png`),
    loadImg(`${b}assets/vehicles_sheet.png`),
    loadImg(`${b}assets/beachpark_sheet.png`),
  ]);

  const inject = (kinds: (ObjectKind | null)[], canvases: HTMLCanvasElement[]) => {
    kinds.forEach((kind, idx) => {
      if (!kind || idx >= canvases.length) return;
      const cvs = canvases[idx];
      // Cast needed because objectSprites was widened in sprites.ts
      (objectSprites as Map<string, HTMLImageElement | HTMLCanvasElement>).set(kind, cvs);
      scanCanvasBounds(cvs, kind);
    });
  };

  if (peopleImg)    inject(PEOPLE_KINDS,   sliceSheet(peopleImg, 3, 3));
  if (vehiclesImg)  inject(VEHICLE_KINDS,  sliceSheet(vehiclesImg, 3, 2));
  if (beachparkImg) inject(BEACHPARK_KINDS, sliceSheet(beachparkImg, 3, 3));

  console.log('[wardSprites] War Pack sprites loaded:', [
    peopleImg ? '9 people' : 'people MISSING',
    vehiclesImg ? '6 vehicles' : 'vehicles MISSING',
    beachparkImg ? 'beach/park props' : 'beachpark MISSING',
  ].join(', '));
}
