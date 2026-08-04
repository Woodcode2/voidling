// ══════════════════════════════════════════════════════════════════════════
//  THE CURIO — what a hidden sticker looks like standing in the world
// ══════════════════════════════════════════════════════════════════════════
//
//  A find has to do two contradictory things at once: be HARD TO SEE, so that
//  looking for it is a game, and be UNMISTAKABLE the instant you do see it, so
//  that finding it is a reward rather than a question. A plain glowing coin
//  fails the first; a giant marker fails the second.
//
//  So: a small dark plinth, which reads as world furniture from any distance
//  and disappears among the props, carrying a faceted gem that catches a
//  highlight and turns. At forty metres it is a bollard. At ten it is
//  obviously treasure. That gap IS the hunt.
//
//  RARITY IS REACH. The gem's size is its tier — a legendary curio is bigger
//  than a COLOSSUS can swallow on its first pass, so "rare" means "come back
//  when you are bigger" rather than "roll again". No odds, no boxes, at 4+.
import * as THREE from 'three';
import { part, mergedProp, PROP_SMOOTH_MAT } from './island';

export type CurioTier = 'common' | 'rare' | 'legendary';

/** Eat radius per tier — this is the whole of rarity. */
export const CURIO_R: Record<CurioTier, number> = { common: 0.95, rare: 1.75, legendary: 2.8 };

const GEM: Record<CurioTier, number> = {
  common: 0x7fe3ff,      // cool blue — plentiful, friendly
  rare: 0xc98cff,        // the void's own violet
  legendary: 0xffd25a,   // gold, and it is the only gold in the level
};
const PLINTH = 0x2a2336;
const PLINTH_TOP = 0x3c3350;

/** The object itself. Two draw calls: the merged plinth, and the gem. */
export function makeCurio(tier: CurioTier): THREE.Group {
  const g = new THREE.Group();
  const s = CURIO_R[tier];

  // ── the plinth: hexagonal, dark, deliberately dull. This is the half that
  //    lets it hide — it reads as a bin, a bollard, a post, until you are
  //    close enough for the gem to catch.
  const base = mergedProp([
    part(new THREE.CylinderGeometry(0.62 * s, 0.78 * s, 0.30 * s, 6), PLINTH, 0, 0.15 * s, 0),
    part(new THREE.CylinderGeometry(0.44 * s, 0.52 * s, 0.46 * s, 6), PLINTH, 0, 0.53 * s, 0),
    part(new THREE.CylinderGeometry(0.56 * s, 0.44 * s, 0.12 * s, 6), PLINTH_TOP, 0, 0.82 * s, 0),
  ]);
  g.add(base);

  // ── the gem. An octahedron, not a sphere: flat faces take a hard specular
  //    and throw one bright glint as it turns, which is what the eye catches
  //    from the corner of a screen. A sphere just sits there being round.
  const gemMat = new THREE.MeshStandardMaterial({
    color: GEM[tier], roughness: 0.12, metalness: 0.35,
    emissive: new THREE.Color(GEM[tier]), emissiveIntensity: 0.55,
  });
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.40 * s, 0), gemMat);
  gem.position.y = 1.28 * s;
  gem.name = 'gem';
  g.add(gem);

  // a legendary gets a second, larger ghost of itself — reads as "this one is
  // different" from far enough away to be worth walking toward
  if (tier === 'legendary') {
    const halo = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.68 * s, 0),
      new THREE.MeshBasicMaterial({ color: GEM[tier], transparent: true, opacity: 0.16,
        depthWrite: false, side: THREE.BackSide }),
    );
    halo.position.y = 1.28 * s;
    halo.name = 'halo';
    g.add(halo);
  }

  g.userData.curio = true;
  return g;
}

/** Spin and bob the gem. Called once per frame with every placed curio. */
export function animateCurio(g: THREE.Object3D, t: number, seed: number): void {
  const gem = g.getObjectByName('gem');
  if (!gem) return;
  gem.rotation.y = t * 0.9 + seed;
  gem.rotation.x = Math.sin(t * 0.7 + seed) * 0.22;
  const bob = Math.sin(t * 1.6 + seed * 2.1);
  gem.position.y = (gem.userData.y0 ??= gem.position.y) + bob * 0.06 * (gem.userData.s ??= 1);
  const halo = g.getObjectByName('halo');
  if (halo) {
    halo.rotation.y = -t * 0.5 + seed;
    halo.position.y = gem.position.y;
    ((halo as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.12 + 0.07 * (0.5 + 0.5 * Math.sin(t * 2.2));
  }
}

void PROP_SMOOTH_MAT;
