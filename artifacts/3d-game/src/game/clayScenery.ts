/**
 * clayScenery.ts — Rebuild Prompt 5: clay scenery scatter (nature / park / beach).
 *
 * Same approach as clayCity.ts / clayLife.ts: the three scenery sheets are run
 * through the SAME connected-component cutter (spriteExtract.ts) and each cutout
 * is injected under its own POOL key (clay_nature_N / clay_park_N / clay_beach_N).
 *
 * Gameplay safety: injection sets ONLY spriteBounds (visual crop), never
 * spriteContactFrac — exactly like the earlier clay swaps. Scenery objects are
 * placed by world.ts as EATABLE bonus food (kind 'apple' + scenery flag) with an
 * explicit size-correct baseSize/contactRadius, and are excluded from BOTH the
 * percent-devoured win math (numerator + denominator) and the respawn population
 * so they never shift balance.
 *
 * Aspect safety: the draw maps a sprite's bounds into a fixed 2r square, so each
 * tight cutout is padded into a SQUARE canvas (foot-anchored, bottom-centre) to
 * reuse the existing foot-Y depth pass without distortion.
 */

import { extractComponents } from './spriteExtract';
import { objectSprites, spriteBounds, spriteAspect } from './sprites';

/** One placeable scenery cutout: its draw key + world-size range + eat tier. */
export interface SceneryDef {
  key: string;
  rMin: number;
  rMax: number;
  tier: number;
}

// ── Placement pools (populated by loadClayScenery; empty until the sheets load) ──
export const SCENERY_FOREST: SceneryDef[] = []; // dense forest fill (trees/shrubs/rocks/ground)
export const SCENERY_GREEN: SceneryDef[] = [];  // light greenery sprinkled map-wide
export const SCENERY_PARK: SceneryDef[] = [];   // park furniture props
export const SCENERY_BEACH: SceneryDef[] = [];  // beach props (sand only)

// ── Draw-only remap pools for the EXISTING vegetation kinds (replace, not stack).
// world.ts's structureSpriteKey() maps tree/bush/flower onto these so the old
// vegetation renders as clay too — empty → fall back to the legacy sprite.
export const clayTreeKeys: string[] = [];
export const clayBushKeys: string[] = [];
export const clayFlowerKeys: string[] = [];

// ── Per-cell metadata (row-major, matches the sheet layouts verified offline) ──
// group: 'tree'|'bush'|'flower'|'rock'|'ground' drives forest/greenery/remap membership.
interface CellMeta { rMin: number; rMax: number; tier: number; group: 'tree' | 'bush' | 'flower' | 'rock' | 'ground' | 'park' | 'beach'; }

// Nature sheet — 4 cols × 4 rows = 16.
const NATURE_META: CellMeta[] = [
  { rMin: 44, rMax: 58, tier: 4, group: 'tree' },   // 0 round tree
  { rMin: 44, rMax: 60, tier: 4, group: 'tree' },   // 1 pine
  { rMin: 24, rMax: 32, tier: 2, group: 'tree' },   // 2 sapling
  { rMin: 26, rMax: 34, tier: 2, group: 'bush' },   // 3 round bush
  { rMin: 26, rMax: 34, tier: 2, group: 'bush' },   // 4 bush
  { rMin: 26, rMax: 34, tier: 2, group: 'bush' },   // 5 flowering bush
  { rMin: 14, rMax: 20, tier: 1, group: 'flower' }, // 6 wildflowers
  { rMin: 28, rMax: 40, tier: 3, group: 'rock' },   // 7 boulder
  { rMin: 30, rMax: 42, tier: 3, group: 'rock' },   // 8 grey rock
  { rMin: 26, rMax: 36, tier: 3, group: 'rock' },   // 9 mossy rock
  { rMin: 24, rMax: 34, tier: 3, group: 'rock' },   // 10 mossy rock 2
  { rMin: 16, rMax: 24, tier: 1, group: 'ground' }, // 11 fern
  { rMin: 24, rMax: 34, tier: 2, group: 'ground' }, // 12 log
  { rMin: 26, rMax: 36, tier: 2, group: 'bush' },   // 13 hedge
  { rMin: 14, rMax: 20, tier: 1, group: 'ground' }, // 14 grass tuft
  { rMin: 18, rMax: 26, tier: 2, group: 'ground' }, // 15 stump
];

// Park sheet — 4 cols × 4 rows = 16 (all distinct furniture).
const PARK_META: CellMeta[] = [
  { rMin: 30, rMax: 40, tier: 2, group: 'park' },   // 0 slide
  { rMin: 32, rMax: 44, tier: 3, group: 'park' },   // 1 swing set
  { rMin: 44, rMax: 58, tier: 4, group: 'park' },   // 2 gazebo
  { rMin: 24, rMax: 32, tier: 2, group: 'park' },   // 3 bench
  { rMin: 28, rMax: 38, tier: 2, group: 'park' },   // 4 picnic table
  { rMin: 40, rMax: 54, tier: 3, group: 'park' },   // 5 soccer goal
  { rMin: 34, rMax: 46, tier: 3, group: 'park' },   // 6 pond
  { rMin: 30, rMax: 42, tier: 2, group: 'park' },   // 7 lamp
  { rMin: 28, rMax: 38, tier: 2, group: 'park' },   // 8 picnic table 2
  { rMin: 34, rMax: 46, tier: 3, group: 'park' },   // 9 soccer goal 2
  { rMin: 32, rMax: 44, tier: 3, group: 'park' },   // 10 pond 2
  { rMin: 32, rMax: 44, tier: 2, group: 'park' },   // 11 lamp 2
  { rMin: 26, rMax: 34, tier: 2, group: 'park' },   // 12 planter
  { rMin: 28, rMax: 38, tier: 2, group: 'park' },   // 13 see-saw
  { rMin: 30, rMax: 40, tier: 2, group: 'park' },   // 14 ice-cream cart
  { rMin: 40, rMax: 54, tier: 3, group: 'park' },   // 15 fountain
];

// Beach sheet — 3 cols × 4 rows = 12 (strays erased offline).
const BEACH_META: CellMeta[] = [
  { rMin: 32, rMax: 44, tier: 3, group: 'beach' },  // 0 umbrella
  { rMin: 24, rMax: 32, tier: 1, group: 'beach' },  // 1 towel
  { rMin: 46, rMax: 60, tier: 4, group: 'beach' },  // 2 lifeguard tower
  { rMin: 44, rMax: 60, tier: 4, group: 'beach' },  // 3 palms
  { rMin: 34, rMax: 46, tier: 3, group: 'beach' },  // 4 rowboat
  { rMin: 20, rMax: 28, tier: 1, group: 'beach' },  // 5 beach ball
  { rMin: 24, rMax: 32, tier: 2, group: 'beach' },  // 6 sandcastle small
  { rMin: 34, rMax: 46, tier: 3, group: 'beach' },  // 7 sandcastle large
  { rMin: 28, rMax: 38, tier: 2, group: 'beach' },  // 8 surfboard
  { rMin: 30, rMax: 42, tier: 3, group: 'beach' },  // 9 kiddie pool
  { rMin: 36, rMax: 48, tier: 3, group: 'beach' },  // 10 pier
  { rMin: 30, rMax: 40, tier: 2, group: 'beach' },  // 11 deck chairs
];

// Build the placement + remap pools from the static metadata at MODULE LOAD.
// The clay draw keys (clay_nature_N / clay_park_N / clay_beach_N) are
// deterministic, so scatterScenery() has non-empty pools regardless of when the
// async sheet load finishes — the bitmaps just populate objectSprites later and
// the draw falls back to the procedural sprite until they arrive.
(function buildPools() {
  NATURE_META.forEach((m, i) => {
    const key = `clay_nature_${i}`;
    const def: SceneryDef = { key, rMin: m.rMin, rMax: m.rMax, tier: m.tier };
    SCENERY_FOREST.push(def);
    if (m.group === 'bush' || m.group === 'flower' || m.group === 'ground'
      || (m.group === 'tree' && m.rMax <= 34)) SCENERY_GREEN.push(def);
    if (m.group === 'tree' && m.rMax > 34) clayTreeKeys.push(key); // round + pine (not sapling)
    if (m.group === 'bush') clayBushKeys.push(key);
    if (m.group === 'flower') clayFlowerKeys.push(key);
  });
  PARK_META.forEach((m, i) => SCENERY_PARK.push({ key: `clay_park_${i}`, rMin: m.rMin, rMax: m.rMax, tier: m.tier }));
  BEACH_META.forEach((m, i) => SCENERY_BEACH.push({ key: `clay_beach_${i}`, rMin: m.rMin, rMax: m.rMax, tier: m.tier }));
})();

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
function injectVisual(key: string, cvs: HTMLCanvasElement): void {
  const aspect = cvs.width / cvs.height;
  const sq = toSquareFoot(cvs);
  (objectSprites as Map<string, HTMLImageElement | HTMLCanvasElement>).set(key, sq);
  spriteBounds.set(key, { x: 0, y: 0, w: 1, h: 1 });
  spriteAspect.set(key, aspect);
}

let _loaded = false;

export async function loadClayScenery(base: string): Promise<void> {
  if (_loaded) return;
  _loaded = true;
  const b = base.endsWith('/') ? base : base + '/';

  const [natureImg, parkImg, beachImg] = await Promise.all([
    loadImg(`${b}assets/nature_clay_sheet.png`),
    loadImg(`${b}assets/park_clay_sheet.png`),
    loadImg(`${b}assets/beach_clay_sheet.png`),
  ]);

  let natureN = 0, parkN = 0, beachN = 0;

  if (natureImg) {
    const cells = extractComponents(natureImg, 4, 4, 'nature_clay_sheet');
    cells.forEach((cvs, i) => {
      if (cvs.width <= 1 || !NATURE_META[i]) return;
      injectVisual(`clay_nature_${i}`, cvs);
      natureN++;
    });
  }

  if (parkImg) {
    const cells = extractComponents(parkImg, 4, 4, 'park_clay_sheet');
    cells.forEach((cvs, i) => {
      if (cvs.width <= 1 || !PARK_META[i]) return;
      injectVisual(`clay_park_${i}`, cvs);
      parkN++;
    });
  }

  if (beachImg) {
    const cells = extractComponents(beachImg, 3, 4, 'beach_clay_sheet');
    cells.forEach((cvs, i) => {
      if (cvs.width <= 1 || !BEACH_META[i]) return;
      injectVisual(`clay_beach_${i}`, cvs);
      beachN++;
    });
  }

  console.log(
    `[clayScenery] scenery cutouts — nature=${natureN} park=${parkN} beach=${beachN} ` +
    `(forest=${SCENERY_FOREST.length} green=${SCENERY_GREEN.length} park=${SCENERY_PARK.length} beach=${SCENERY_BEACH.length}) ` +
    `nature_sheet=${natureImg ? 'ok' : 'MISSING'} park_sheet=${parkImg ? 'ok' : 'MISSING'} beach_sheet=${beachImg ? 'ok' : 'MISSING'}`,
  );
}
