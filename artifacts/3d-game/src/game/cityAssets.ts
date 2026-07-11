/**
 * cityAssets.ts — Structural Rebuild: the NEW city art (Higgsfield clay set).
 *
 * Four sheets replace the needle-skyscraper era:
 *   city_buildings_sheet (4×3, 12) → city_bldg_N   wide varied downtown buildings
 *   city_landmarks_sheet (4×2, 8)  → city_land_N   marquee trophy buildings
 *   zoo_props_sheet      (4×3, 12) → zoo_prop_N    enclosure/visitor props
 *   street_props_sheet   (4×3, 12) → street_prop_N sidewalk life props
 *
 * Same pipeline as every other clay module: connected-component cutter →
 * square foot-anchored canvas → objectSprites under a pool key. Visual bounds
 * only — never contact fractions — so gameplay sizes stay authoritative.
 */

import { extractComponents } from './spriteExtract';
import { objectSprites, spriteBounds, spriteAspect } from './sprites';

// Draw-key pools (empty until the sheets load; callers fall back to legacy art)
export const cityBuildingKeys: string[] = [];
export const cityLandmarkKeys: string[] = [];
export const zooPropKeys: string[] = [];
export const streetPropKeys: string[] = [];

let _loaded = false;

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

/** Inject a cutout under a draw key — visual bounds only, no contact frac. */
function injectVisual(key: string, cvs: HTMLCanvasElement): void {
  const aspect = cvs.width / cvs.height;
  const sq = toSquareFoot(cvs);
  (objectSprites as Map<string, HTMLImageElement | HTMLCanvasElement>).set(key, sq);
  spriteBounds.set(key, { x: 0, y: 0, w: 1, h: 1 });
  spriteAspect.set(key, aspect);
}

export async function loadCityAssets(base: string): Promise<void> {
  if (_loaded) return;
  _loaded = true;
  const b = base.endsWith('/') ? base : base + '/';

  const [bldg, land, zoo, street] = await Promise.all([
    loadImg(`${b}assets/city_buildings_sheet.png`),
    loadImg(`${b}assets/city_landmarks_sheet.png`),
    loadImg(`${b}assets/zoo_props_sheet.png`),
    loadImg(`${b}assets/street_props_sheet.png`),
  ]);

  if (bldg) {
    extractComponents(bldg, 4, 3, 'city_buildings_sheet').forEach((cvs, i) => {
      if (cvs.width <= 1) return;
      const key = `city_bldg_${i}`;
      injectVisual(key, cvs);
      cityBuildingKeys.push(key);
    });
  }
  if (land) {
    extractComponents(land, 4, 2, 'city_landmarks_sheet').forEach((cvs, i) => {
      if (cvs.width <= 1) return;
      const key = `city_land_${i}`;
      injectVisual(key, cvs);
      cityLandmarkKeys.push(key);
    });
  }
  if (zoo) {
    extractComponents(zoo, 4, 3, 'zoo_props_sheet').forEach((cvs, i) => {
      if (cvs.width <= 1) return;
      const key = `zoo_prop_${i}`;
      injectVisual(key, cvs);
      zooPropKeys.push(key);
    });
  }
  if (street) {
    extractComponents(street, 4, 3, 'street_props_sheet').forEach((cvs, i) => {
      if (cvs.width <= 1) return;
      const key = `street_prop_${i}`;
      injectVisual(key, cvs);
      streetPropKeys.push(key);
    });
  }

  console.log(`[cityAssets] NEW CITY art — buildings=${cityBuildingKeys.length} landmarks=${cityLandmarkKeys.length} zoo=${zooPropKeys.length} street=${streetPropKeys.length}`);
}
