/**
 * clayZoo.ts — Rebuild Prompt 16: clay-render zoo animal art swap.
 *
 * Runs the new zoo_clay_sheet.png through the SAME connected-component cutter
 * (spriteExtract.ts) and injects each cutout under its own pool key
 * (clay_zoo_N). world.ts's structureSpriteKey() remaps the existing zoo animal
 * kinds onto these cutouts for variety, so spawn logic and kind keys are untouched.
 *
 * Gameplay safety: injection sets ONLY spriteBounds (visual crop), never
 * spriteContactFrac. Eat-contact radius stays keyed off the unchanged KIND.
 *
 * Aspect safety: the draw maps a sprite's bounds into a fixed 2r square. Each
 * tight cutout is padded into a SQUARE canvas (foot-anchored, bottom-centre) so
 * animals reuse the existing foot-Y depth pass without distortion.
 */

import { extractComponents } from './spriteExtract';
import { objectSprites, spriteBounds, spriteAspect } from './sprites';
import type { ObjectKind } from './config';

// Row-major layout (4 cols × 3 rows = 12 cells) matching the sheet art.
export const ZOO_KINDS: ObjectKind[] = [
  'lion', 'elephant', 'giraffe', 'monkey',
  'penguin', 'bear', 'zebra', 'flamingo',
  'tortoise', 'hippo', 'panda', 'seal',
];

// Draw-key pools (empty → world.ts falls back to the legacy kind sprite until
// the async sheet load finishes).
export const clayZooKeys: string[] = [];

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

export async function loadClayZoo(base: string): Promise<void> {
  if (_loaded) return;
  _loaded = true;
  const b = base.endsWith('/') ? base : base + '/';

  const zooImg = await loadImg(`${b}assets/zoo_clay_sheet.png`);
  if (!zooImg) {
    console.warn('[clayZoo] zoo_clay_sheet.png MISSING — zoo animals keep legacy art');
    return;
  }

  // 4 cols × 3 rows, row-major — 12 animal cutouts (all cells filled).
  const cells = extractComponents(zooImg, 4, 3, 'zoo_clay_sheet');
  let n = 0;
  cells.forEach((cvs, i) => {
    if (cvs.width <= 1) return;
    const aspect = cvs.width / cvs.height;
    const key = `clay_zoo_${i}`;
    injectVisual(key, toSquareFoot(cvs), aspect);
    clayZooKeys[i] = key;
    n++;
  });

  console.log(
    `[clayZoo] clay zoo swap — cutouts=${n}/12 ` +
    `zoo_sheet=ok`,
  );
}
