/**
 * wardSprites.ts — War Pack §1 + Life Pack sprite loader
 *
 * Slices all runtime sprite sheets and injects the results into the
 * objectSprites / spriteBounds / spriteContactFrac / spriteOrb maps so
 * the existing draw pipeline picks them up automatically.
 *
 * Sheet layouts (all cells equal size, row-major order):
 *   people_sheet.png      3 cols × 3 rows  (9 person kinds — War Pack)
 *   vehicles_sheet.png    3 cols × 2 rows  (6 vehicle kinds — War Pack)
 *   beachpark_sheet.png   3 cols × 3 rows  (5 beach/park props — War Pack)
 *   military_sheet.png    2 cols × 2 rows  (4 military units — Life Pack)
 *   people2_sheet.png     3 cols × 3 rows  (9 detailed pedestrians — Life Pack)
 *   vignettes_sheet.png   3 cols × 3 rows  (9 vignette anchors — Life Pack)
 *   playground_sheet.png  3 cols × 3 rows  (9 playground props — Life Pack)
 *   fields_sheet.png      3 cols × 1 row   (3 sports-field decals — Life Pack)
 */

import { objectSprites, spriteBounds, spriteContactFrac, spriteOrb } from './sprites';
import type { ObjectKind } from './config';

// ── Kind assignments per sheet cell (row-major order) ──────────────────────
export const PEOPLE_KINDS: ObjectKind[] = [
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

export const MILITARY_KINDS: ObjectKind[] = [
  'tank', 'attack_heli',
  'armored_humvee', 'missile_truck',
];

export const PEOPLE2_KINDS: ObjectKind[] = [
  'person_mom', 'person_dad', 'skateboarder',
  'cyclist', 'waiter', 'icecream_vendor',
  'person_jog2', 'person_elderly', 'tourist',
];

export const VIGNETTE_KINDS: ObjectKind[] = [
  'vig_proposal', 'vig_soccer', 'vig_wedding',
  'vig_couple', 'vig_painter', 'vig_busker',
  'vig_selfie', 'vig_kite', 'vig_gardener',
];

export const PLAYGROUND_KINDS: ObjectKind[] = [
  'pg_swing', 'pg_slide', 'pg_seesaw',
  'pg_sandbox', 'pg_soccergoal', 'pg_soccerball',
  'pg_hoop', 'pg_trampoline', 'pg_merrygoround',
];

export const FIELD_KINDS: ObjectKind[] = [
  'field_soccer', 'field_basketball', 'field_tennis',
];

// ── Helpers ────────────────────────────────────────────────────────────────

function loadImg(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null); // graceful fail — game renders procedurally
    img.crossOrigin = 'anonymous';
    img.src = src;
  });
}

/**
 * Adaptive background removal: samples the top-left corner pixel as the
 * reference "background" colour, then flood-fills from all four corners
 * removing pixels within a colour-distance threshold.
 * Works for white BG (old sheets) and dark-violet BG (new Life-Pack sheets).
 */
function stripBackground(g: CanvasRenderingContext2D, w: number, h: number) {
  const data = g.getImageData(0, 0, w, h);
  const px = data.data;
  const visited = new Uint8Array(w * h);

  // Reference colour: the top-left corner pixel
  const refR = px[0], refG = px[1], refB = px[2], refA = px[3];
  if (refA < 8) return; // already transparent — nothing to strip

  // Threshold: Euclidean distance in RGB space (squared)
  const THRESH_SQ = 2500; // ~50 units — wide enough for anti-aliased bg fringe

  const isBackground = (i: number) => {
    const a = px[i + 3];
    if (a < 8) return true;
    const dr = px[i] - refR, dg = px[i + 1] - refG, db = px[i + 2] - refB;
    return dr * dr + dg * dg + db * db < THRESH_SQ;
  };

  const queue: number[] = [];
  const seed = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const idx = y * w + x;
    if (!visited[idx] && isBackground(idx * 4)) {
      visited[idx] = 1; queue.push(x, y);
    }
  };
  seed(0, 0); seed(w - 1, 0); seed(0, h - 1); seed(w - 1, h - 1);

  while (queue.length) {
    const y = queue.pop()!;
    const x = queue.pop()!;
    px[(y * w + x) * 4 + 3] = 0;
    seed(x - 1, y); seed(x + 1, y); seed(x, y - 1); seed(x, y + 1);
  }
  g.putImageData(data, 0, 0);
}

/**
 * Slice a sheet image into `cols × rows` canvases, stripping the background
 * (auto-detects white or dark-violet via corner-sampling).
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
      const cvs = document.createElement('canvas');
      cvs.width = cellW; cvs.height = cellH;
      const g = cvs.getContext('2d')!;
      g.drawImage(sheet, col * cellW, row * cellH, cellW, cellH, 0, 0, cellW, cellH);
      stripBackground(g, cellW, cellH);
      result.push(cvs);
    }
  }
  return result;
}

/**
 * Scan a canvas sprite to fill spriteBounds, spriteContactFrac, spriteOrb.
 * Mirrors the pipeline in sprites.ts scanAlphaBounds.
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
  if (bMaxX >= 0) spriteContactFrac.set(key, (bMaxX - bMinX + 1) / W);

  // Orb-band: rows 35%–95% of trimmed height → widest opaque run + centroid
  const trimH = maxY - minY + 1;
  const orbY0 = minY + Math.floor(trimH * 0.35);
  const orbY1 = minY + Math.floor(trimH * 0.95);
  let orbMinX = W, orbMaxX = -1, orbCySum = 0, orbCyCount = 0;
  for (let y = orbY0; y <= orbY1 && y < H; y++) {
    let rowMin = W, rowMax = -1;
    for (let x = 0; x < W; x++) {
      if (data[(y * W + x) * 4 + 3] > 8) {
        if (x < rowMin) rowMin = x;
        if (x > rowMax) rowMax = x;
      }
    }
    if (rowMax >= 0) {
      if (rowMin < orbMinX) orbMinX = rowMin;
      if (rowMax > orbMaxX) orbMaxX = rowMax;
      orbCySum += y; orbCyCount++;
    }
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

  const b = base.endsWith('/') ? base : base + '/';

  const [
    peopleImg, vehiclesImg, beachparkImg,
    militaryImg, people2Img, vignetteImg, playgroundImg, fieldsImg,
  ] = await Promise.all([
    loadImg(`${b}assets/people_sheet.png`),
    loadImg(`${b}assets/vehicles_sheet.png`),
    loadImg(`${b}assets/beachpark_sheet.png`),
    loadImg(`${b}assets/military_sheet.png`),
    loadImg(`${b}assets/people2_sheet.png`),
    loadImg(`${b}assets/vignettes_sheet.png`),
    loadImg(`${b}assets/playground_sheet.png`),
    loadImg(`${b}assets/fields_sheet.png`),
  ]);

  const inject = (kinds: (ObjectKind | null)[], canvases: HTMLCanvasElement[]) => {
    kinds.forEach((kind, idx) => {
      if (!kind || idx >= canvases.length) return;
      const cvs = canvases[idx];
      (objectSprites as Map<string, HTMLImageElement | HTMLCanvasElement>).set(kind, cvs);
      scanCanvasBounds(cvs, kind);
    });
  };

  // War Pack sheets
  if (peopleImg)    inject(PEOPLE_KINDS,    sliceSheet(peopleImg, 3, 3));
  if (vehiclesImg)  inject(VEHICLE_KINDS,   sliceSheet(vehiclesImg, 3, 2));
  if (beachparkImg) inject(BEACHPARK_KINDS, sliceSheet(beachparkImg, 3, 3));

  // Life Pack sheets
  if (militaryImg)    inject(MILITARY_KINDS,   sliceSheet(militaryImg, 2, 2));
  if (people2Img)     inject(PEOPLE2_KINDS,    sliceSheet(people2Img, 3, 3));
  if (vignetteImg)    inject(VIGNETTE_KINDS,   sliceSheet(vignetteImg, 3, 3));
  if (playgroundImg)  inject(PLAYGROUND_KINDS, sliceSheet(playgroundImg, 3, 3));
  if (fieldsImg)      inject(FIELD_KINDS,      sliceSheet(fieldsImg, 3, 1));

  console.log('[wardSprites] Life Pack sprites loaded:', [
    peopleImg    ? '9 people'         : 'people MISSING',
    vehiclesImg  ? '6 vehicles'       : 'vehicles MISSING',
    beachparkImg ? 'beach/park'       : 'beachpark MISSING',
    militaryImg  ? '4 military'       : 'military MISSING',
    people2Img   ? '9 people2'        : 'people2 MISSING',
    vignetteImg  ? '9 vignettes'      : 'vignettes MISSING',
    playgroundImg? '9 playground'     : 'playground MISSING',
    fieldsImg    ? '3 fields'         : 'fields MISSING',
  ].join(', '));
}
