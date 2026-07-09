/**
 * clayCity.ts — Map Rebuild: clay-render building + house art swap.
 *
 * Loads two new clay sprite sheets and injects cutouts into objectSprites so
 * the existing draw pipeline picks them up automatically.
 *
 * Sheet layouts:
 *   houses_clay2_sheet.png    4 cols × 4 rows  (16 house cutouts)
 *     rows 0–1 (cells  0– 7): fancier townhouses / villas   → clayHouseFancyKeys
 *     rows 2–3 (cells  8–15): cozy cottages / bungalows     → clayHouseCottageKeys
 *   downtown_clay2_sheet.png  4 cols × 3 rows  (12 building cutouts)
 *     row 0 (cells 0–3): tall towers                        → claySkyscraperKeys
 *     row 1 (cells 4–7): glass office, brown office, hospital, school
 *     row 2 (cells 8–11): clocktower/townhall, cafe, apartment, small civic
 *
 * Gameplay safety: injection sets ONLY spriteBounds (visual crop). It never
 * touches spriteContactFrac, so eat-contact radius is unchanged.
 *
 * Aspect safety: every tight cutout is padded into a square canvas,
 * object anchored bottom-centre, and bounds set to full {0,0,1,1}.
 */

import { extractComponents } from './spriteExtract';
import { objectSprites, spriteBounds, spriteAspect } from './sprites';

// Exported pools read by world.ts draw resolution (empty → legacy fallback).
export const claySkyscraperKeys: string[] = [];

/** Rows 0–1 of houses_clay2_sheet: fancier homes, bigger silhouettes. */
export const clayHouseFancyKeys: string[] = [];

/** Rows 2–3 of houses_clay2_sheet: cozy cottages / bungalows. */
export const clayHouseCottageKeys: string[] = [];

/** All 16 house cutouts merged — backward-compat fallback. */
export const clayHouseKeys: string[] = [];

function loadImg(src: string): Promise<HTMLImageElement | null> {
  return new Promise((res) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => res(null);
    img.src = src;
  });
}

/** Pad a tight cutout into a square canvas, object anchored bottom-centre. */
function toSquareFootAnchored(src: HTMLCanvasElement): HTMLCanvasElement {
  const S = Math.max(src.width, src.height);
  const c = document.createElement('canvas');
  c.width = S; c.height = S;
  c.getContext('2d')!.drawImage(src, Math.round((S - src.width) / 2), S - src.height);
  return c;
}

/** Inject a clay cutout under a draw key — visual bounds only, no contact frac. */
function injectVisual(key: string, cutout: HTMLCanvasElement): void {
  const aspect = cutout.width / cutout.height;
  const sq = toSquareFootAnchored(cutout);
  (objectSprites as Map<string, HTMLImageElement | HTMLCanvasElement>).set(key, sq);
  spriteBounds.set(key, { x: 0, y: 0, w: 1, h: 1 });
  spriteAspect.set(key, aspect);
}

let _loaded = false;

export async function loadClayCity(base: string): Promise<void> {
  if (_loaded) return;
  _loaded = true;
  const b = base.endsWith('/') ? base : base + '/';

  const [housesImg, downtownImg] = await Promise.all([
    loadImg(`${b}assets/houses_clay2_sheet.png`),
    loadImg(`${b}assets/downtown_clay2_sheet.png`),
  ]);

  if (housesImg) {
    // 4 cols × 4 rows → 16 cutouts
    const cells = extractComponents(housesImg, 4, 4, 'houses_clay2_sheet');
    cells.forEach((cvs, i) => {
      if (cvs.width <= 1) return;
      const key = `clay_house2_${i}`;
      injectVisual(key, cvs);
      if (i < 8)  clayHouseFancyKeys.push(key);   // rows 0–1: fancy/townhouse
      else        clayHouseCottageKeys.push(key);  // rows 2–3: cozy/cottage
      clayHouseKeys.push(key);
    });
  }

  if (downtownImg) {
    // 4 cols × 3 rows → 12 cutouts
    const cells = extractComponents(downtownImg, 4, 3, 'downtown_clay2_sheet');
    const ok = (i: number) => cells[i] && cells[i].width > 1;

    // Row 0 (cells 0–3): tall towers → skyscraper pool
    for (const i of [0, 1, 2, 3]) {
      if (!ok(i)) continue;
      const key = i === 0 ? 'skyscraper' : `skyscraper_v${i}`;
      injectVisual(key, cells[i]);
      claySkyscraperKeys.push(key);
    }

    // Row 1 (cells 4–7): mid-rise commercial / civic
    const row1Map: [number, string][] = [
      [4, 'office'], [5, 'shop'], [6, 'hospital'], [7, 'school'],
    ];
    for (const [i, key] of row1Map) if (ok(i)) injectVisual(key, cells[i]);

    // Row 2 (cells 8–11): civic / small commercial
    const row2Map: [number, string][] = [
      [8, 'townhall'], [9, 'cafe'], [10, 'library'], [11, 'fountain'],
    ];
    for (const [i, key] of row2Map) if (ok(i)) injectVisual(key, cells[i]);
  }

  console.log(
    `[clayCity] NEW EARTH art — skyscrapers=${claySkyscraperKeys.length} ` +
    `fancy=${clayHouseFancyKeys.length} cottage=${clayHouseCottageKeys.length} ` +
    `houses_sheet=${housesImg ? 'ok' : 'MISSING'} ` +
    `downtown_sheet=${downtownImg ? 'ok' : 'MISSING'}`,
  );
}
