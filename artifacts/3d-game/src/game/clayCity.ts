/**
 * clayCity.ts — Rebuild Prompt 3: clay-render building + house art swap.
 *
 * Runs the two clay sheets through the SAME connected-component extraction
 * pipeline (spriteExtract.ts) used by every other sheet, then injects the
 * cutouts into objectSprites under the existing building/house draw keys.
 *
 * Gameplay safety: injection sets ONLY spriteBounds (visual crop). It never
 * touches spriteContactFrac, so eat-contact radius (derived in makeObj) is
 * unchanged. Placement, lots, scoring, audits are all untouched — images only.
 *
 * Aspect safety: the world draw path maps a sprite's bounds into a fixed
 * 2r×2r square. Tall clay towers would squish, so each tight cutout is padded
 * into a SQUARE canvas, object anchored bottom-centre, and bounds set to full.
 * Square→square renders undistorted and foot-anchored with no new draw path.
 */

import { extractComponents } from './spriteExtract';
import { objectSprites, spriteBounds } from './sprites';

// Exported pools read by world.ts draw resolution (empty → legacy fallback).
export const claySkyscraperKeys: string[] = [];
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
  const sq = toSquareFootAnchored(cutout);
  (objectSprites as Map<string, HTMLImageElement | HTMLCanvasElement>).set(key, sq);
  spriteBounds.set(key, { x: 0, y: 0, w: 1, h: 1 });
}

let _loaded = false;

export async function loadClayCity(base: string): Promise<void> {
  if (_loaded) return;
  _loaded = true;
  const b = base.endsWith('/') ? base : base + '/';

  const [buildingsImg, housesImg] = await Promise.all([
    loadImg(`${b}assets/buildings_clay_sheet.png`),
    loadImg(`${b}assets/houses_clay_sheet.png`),
  ]);

  if (buildingsImg) {
    // 4 cols × 3 rows, row-major. Cell → kind (see Stage 0 layout analysis):
    //  0 glass sky   1 purple sky   2 art-deco tower   3 green mid-rise
    //  4 school      5 (empty)      6 town hall        7 hospital
    //  8 pink civic  9 cafe        10 apartment       11 fountain
    const cells = extractComponents(buildingsImg, 4, 3, 'buildings_clay_sheet');
    const ok = (i: number) => cells[i] && cells[i].width > 1;

    // Tallest towers → skyscraper lots (plaza-nearest). 3-way variant pool.
    for (const i of [0, 1, 2]) {
      if (!ok(i)) continue;
      const key = i === 0 ? 'skyscraper' : `skyscraper_v${i}`;
      injectVisual(key, cells[i]);
      claySkyscraperKeys.push(key);
    }
    const map: [number, string][] = [
      [3, 'office'], [4, 'school'], [6, 'townhall'], [7, 'hospital'],
      [8, 'library'], [9, 'cafe'], [10, 'shop'], [11, 'fountain'],
    ];
    for (const [i, key] of map) if (ok(i)) injectVisual(key, cells[i]);
  }

  if (housesImg) {
    // 4 cols × 4 rows. Collect every non-empty cutout as a random-assignment pool.
    const cells = extractComponents(housesImg, 4, 4, 'houses_clay_sheet');
    cells.forEach((cvs, i) => {
      if (cvs.width <= 1) return;
      const key = `clay_house_${i}`;
      injectVisual(key, cvs);
      clayHouseKeys.push(key);
    });
  }

  console.log(
    `[clayCity] clay art swap — skyscrapers=${claySkyscraperKeys.length} ` +
    `houses=${clayHouseKeys.length} buildings=${buildingsImg ? 'ok' : 'MISSING'} ` +
    `houses_sheet=${housesImg ? 'ok' : 'MISSING'}`,
  );
}
