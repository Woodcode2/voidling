// ══════════════════════════════════════════════════════════════════════════
//  BELLCLOUD HEIGHTS — the cloud kingdom's prop kit (world 6, internal id
//  'skylark'; the file keeps its name, see docs/BELLCLOUD.md §1)
//  A kingdom on the clouds, the last island of the Voidling kids' road trip.
//  Once a year it rings its Great Bell, and visitors from every island dock
//  their balloons along its edge for the festival. A match is that festival.
//
//  (Until 2026-09-25 this file was SKYLARK FIELD, a dawn balloon meet on a
//  disused airfield. The owner: "it's lame. There's no theme to it." The
//  balloons stayed — visitors arrive by balloon — and everything else became
//  the kingdom: the Great Bell, castles, cloud trees, cloud cottages.)
//
//  House rules, same as island.ts, alpine.ts and nightmarket.ts:
//    • every prop is ONE merged mesh sharing PROP_SHARED_MAT (one draw call)
//    • no per-prop materials, no textures, flat shading, chunky silhouettes
//    • y = 0 is the ground plane, the prop's nose/front faces +X
//    • keep each prop under ~140 parts, and at most about three colours plus
//      one dark accent
//    • NO NEW SphereGeometry literals: every round part goes through sph()
//      below, one definition for the whole kit (qa/roundlod.mjs ratchets on
//      the count of those calls across src/proto3d)
//
//  ── THE CROWN RULE, and it is this world's eave line ────────────────────
//  alpine.ts has the snow cap because a building seen from above is mostly its
//  roof. nightmarket.ts learned the same thing the hard way when its bathhouse
//  photographed as a black rectangle. On a WHITE ground it bites twice: a white
//  tower on white cloud is invisible from 46 degrees up unless its roof says
//  otherwise. So every roof in this kit — the Keep, the turrets, the cottages,
//  the gate, the shrines — is a coloured cone or pyramid with a DARK EAVE RING
//  (EAVE) where it meets the wall. Seen from above, a building is its roof.
//
//  AND THE BALLOONS KEEP THEIR OWN FOUR RULES. From directly above a standing
//  balloon is a disc, and a disc of one colour is a dot:
//    1. GORES REACH THE CROWN, so the disc reads as a PINWHEEL.
//    2. THE CROWN RING IS A DARK HOLE — the disc's pupil.
//    3. THE SKIRT IS A CONTRASTING DARK RING, lifted clear of the basket.
//    4. AT MOST THREE COLOURS PER ENVELOPE.
//
//  ── AND ONE RULE THAT CAME OUT OF A MEASUREMENT ─────────────────────────
//  A PROP IS ONE MESH WITH ONE EDIBLE RADIUS. fadeOccluders() (prototype3d.ts)
//  ghosts anything crossing the camera-to-hero sight line down to 62%, and
//  armFade() is called inside mergedProp() so a merged prop is armed
//  automatically. If the Great Bell's arch were several meshes, only the piece
//  crossing the axis would ghost and the child would see a bell with a hole in
//  it. One mesh. One radius. Every factory here returns a single mergedProp.
//
//  ── COLOUR: THE INVERSION, KEPT ─────────────────────────────────────────
//  The ground is pearl cloud, near-white (island.ts's cloud bake), so the props
//  carry the colour: blue roofs, gold, pastel cloud trees, striped balloons.
//  Cloud trees are NEVER white — white is the ground's. The rendered white of a
//  white wall has to stay above the ground's luma, and the roofs and the eave
//  ring are the read.
// ══════════════════════════════════════════════════════════════════════════
import * as THREE from 'three';
import { part, mergedProp, PROP_GLOW_MAT } from './island';
import { voiced } from './eatvoice';
import { registerGloss } from './gloss';

// ── the palette ────────────────────────────────────────────────────────────
// The kingdom's own colours (docs/BELLCLOUD.md §6.1). qa/formsep.mjs grades
// every named constant here for a lit and a shaded face under this world's key.
export const STONE = 0xf1ece2;       // white castle stone
const STONE_D = 0xd9d0c4;            // its shaded courses, plinths and copings
export const ROOF_BLUE = 0x3d6fd6;   // the castles' pointed roofs
const EAVE = 0x27468f;               // THE EAVE RING, and every dark opening
export const GOLD = 0xf2c14e;        // the Great Bell, finials, doors, rails
const GOLD_D = 0xc8902a;             // the bell's lip and yoke, gold in shadow
export const ROSE = 0xef8fae;        // a cottage roof, a stall's stripes
export const MINT = 0x8fd8b4;        // a cottage roof
const PUFF_W = 0xf7f4fb;             // the cloud puffs at a bridge's feet
const PUFF_L = 0xe3dcf2;             // a lilac cloud tree's sunlit top
const PUFF_M = 0xd6f0e2;             // a mint cloud tree's sunlit top
const PUFF_P = 0xffe3d4;             // a peach cloud tree's sunlit top
const WATER = 0x9fd8f0;              // a fountain's pool
const BELL_MOUTH = 0x5a3a12;         // the Great Bell's mouth — its one dark accent
const TRUNK = 0xe6cf98;              // a cloud tree's gold-cream trunk
// the cloud trees' own bodies. Deeper than PUFF_*, because a tree in PUFF_M
// alone measured against a pearl ground is a tree nobody can see; the pale
// puff is the sunlit crown on top of it
const TREE_MINT = 0xa6e3c3;
const TREE_PEACH = 0xffc7a3;
const TREE_LILAC = 0xc7b6ee;
/** a cloud tree or puff bush's two tones — [body, sunlit crown] — picked by
 *  index from island.ts so no factory draws a random number */
export const CLOUD_TINTS: [number, number][] = [[TREE_MINT, PUFF_M], [TREE_PEACH, PUFF_P], [TREE_LILAC, PUFF_L]];
// the cake carts at the Cloud Market, and the basket carts' cream
export const CAKE_ROSE = 0xf6b8c8;
export const CAKE_MINT = 0xa8e0c0;
export const CAKE_LEMON = 0xf6e39a;
export const CAKE_SKY = 0xa9cff2;
const CREAM = 0xf2ede4;
const WAGON_ROSE = 0xf3c9d4;         // the ticket wagon's canvas
const RING_GOLD = 0xe6c173;          // the plaza's ring tiles
// the cloud sheep and the cloud bunny
const FLEECE = 0xf8f6f2;
const FLEECE_D = 0xe8e2ea;
const PLUM = 0x5a4a64;               // soft plum-grey: a sheep's face and legs
const BUNNY = 0xf4f1ec;
const BUNNY_EAR = 0xf3b5c4;
// what the balloons and their kit are made of — unchanged from the airfield
const WICKER = 0xc9a267;       // basket cane, and the basket carts' wood
const WICKER_D = 0x8f6f42;     // its shadowed weave and the leather corners
const STEEL = 0xb4b8c4;        // burner frames, fan cages, poles
const STEEL_D = 0x6e7482;      // and their shadow side — cool, not grey
const RUST = 0x8a5a3c;
const CANVAS_W = 0xdcdbd4;     // the tea urn's paper cups
const SKIRT_D = 0x2c3350;      // THE SKIRT AND CROWN RING — periwinkle-black.
                               // Deliberately not 0x000000: a true black hole
                               // reads as a rendering fault.

// THE GREAT BELL IS METAL. Gold shines and must not glow: the gloss term is
// sheen, not emission, and qa/halocensus.mjs holds it under the bloom cut.
// Neither hex is registered anywhere else (the collision warning in gloss.ts
// and Game Day's GOLD, 0xf0b429, were checked).
registerGloss([[GOLD, 0.55], [GOLD_D, 0.4]], 'skyfield');

/** THE ENVELOPE COLOURS — the balloons are still the most saturated things in
 *  the world. Three per balloon, no more, because at phone resolution a
 *  twelve-colour envelope averages to grey. Each triple is [gore A, gore B,
 *  gore C] and they alternate round the crown. */
export const ENVELOPE: [number, number, number][] = [
  [0xe4513a, 0xf5b731, 0xf2ede4],   // red / gold / white — the classic
  [0x2f6fd0, 0x63c6f0, 0xf2ede4],   // two blues and white
  [0x2e9e5b, 0xf5b731, 0xf2ede4],   // green / gold / white
  [0xd8425f, 0xf2ede4, 0x7a3fb0],   // rose / white / violet
  [0xf06a25, 0xf5c542, 0x2c3350],   // orange / yellow / dark
  [0x7a3fb0, 0xf2ede4, 0x63c6f0],   // violet / white / sky
  [0xf5b731, 0x2e9e5b, 0xe4513a],   // gold / green / red
  [0x1d4f9e, 0xf2ede4, 0xf5b731],   // deep blue / white / gold
];

// primitives, in alpine.ts's own idiom
const sph = () => new THREE.SphereGeometry(0.5, 10, 8);
const cyl = (rt = 0.5, rb = 0.5, seg = 10) => new THREE.CylinderGeometry(rt, rb, 1, seg);
const box = () => new THREE.BoxGeometry(1, 1, 1);
const cone = (seg = 8) => new THREE.ConeGeometry(0.5, 1, seg);
const torus = (tube = 0.12, seg = 12) => new THREE.TorusGeometry(0.5, tube, 6, seg);

/** A gore-striped dome, built as N vertical wedges radiating from the crown.
 *  The wedges ARE the pinwheel, and they must reach y = h (the crown) or the
 *  disc is a flat coin from the play camera. */
function goreDome(cols: [number, number, number], r: number, h: number, gores = 12): THREE.BufferGeometry[] {
  const out: THREE.BufferGeometry[] = [];
  const step = (Math.PI * 2) / gores;
  for (let i = 0; i < gores; i++) {
    const a = i * step;
    const col = cols[i % 3];
    // each gore is a tall thin wedge box, leaned outward and tapered to the
    // crown by its own scale — cheap, and it silhouettes as a dome
    for (let ring = 0; ring < 3; ring++) {
      const t0 = ring / 3, t1 = (ring + 1) / 3;
      const rr = r * Math.cos(t0 * Math.PI * 0.5), rr1 = r * Math.cos(t1 * Math.PI * 0.5);
      const y0 = h * Math.sin(t0 * Math.PI * 0.5), y1 = h * Math.sin(t1 * Math.PI * 0.5);
      const rm = (rr + rr1) * 0.5, ym = (y0 + y1) * 0.5;
      out.push(part(box(), col,
        Math.cos(a) * rm, ym, Math.sin(a) * rm,
        0, -a, 0,
        Math.max(0.12, (rr - rr1) + 0.30), Math.max(0.2, y1 - y0), rm * step * 1.25));
    }
  }
  return out;
}

/** A round tower's roof: the dark eave ring where it meets the wall (the crown
 *  rule), a pointed cone in the roof colour, and a gold finial. Returns the
 *  parts and the finial's top, so a caller can put something on it. */
function towerRoof(p: THREE.BufferGeometry[], r: number, h: number, y0: number, roof: number, seg = 16): number {
  p.push(part(cyl(r - 0.05, r - 0.15, seg), EAVE, 0, y0 + 0.15, 0, 0, 0, 0, 1, 0.3, 1));
  p.push(part(cone(seg), roof, 0, y0 + 0.3 + h / 2, 0, 0, 0, 0, r * 2, h, r * 2));
  const top = y0 + 0.3 + h;
  p.push(part(sph(), GOLD, 0, top + 0.12, 0, 0, 0, 0, 0.5 + r * 0.08));
  return top + 0.35;
}

// ══ THE GREAT BELL ═════════════════════════════════════════════════════════
/** THE GREAT BELL — the kingdom's heart, the hero meal and dot 3's landmark.
 *  A festival bell in a white stone arch on a two-step plinth: the arch spans
 *  local x, so its open face is ±z, and island.ts turns that face toward the
 *  spawn so the first frame looks through the arch at the bell. A little blue
 *  cone roof sits on the crown under a gold ball. From the 46-degree camera
 *  the read is: white arch, blue point, gold bell inside.
 *
 *  Sizes (docs/BELLCLOUD.md §5.1): plinth 12.4 x 5.4; piers 2.2 x 2.2 at
 *  x = ±4.4; the arch a half torus (4.4, tube 1.1) on the piers with its crown
 *  at y 16.7; the bell from y 8.3 to 13.3. The spec's 11-unit piers would put
 *  the crown at 17.5; they are 10.2 so the crown lands where the spec's own
 *  16.6 asks. qa/kitfit.mjs measures it 20.05 tall, 12.4 x 6.0 on the ground
 *  (the bell's lip is 6.0 across) — under the 23.4-unit Pirate building that
 *  fadeOccluders already handles. */
export function skGreatBell(): THREE.Object3D {
  const p: THREE.BufferGeometry[] = [];
  // the plinth, two steps
  p.push(part(box(), STONE_D, 0, 0.25, 0, 0, 0, 0, 12.4, 0.5, 5.4));
  p.push(part(box(), STONE, 0, 0.75, 0, 0, 0, 0, 11.2, 0.5, 4.4));
  // the piers, with a gold band at the foot and at the springing of the arch
  const PIER_TOP = 11.2;
  for (const sx of [-4.4, 4.4]) {
    p.push(part(box(), STONE, sx, 1.0 + (PIER_TOP - 1.0) / 2, 0, 0, 0, 0, 2.2, PIER_TOP - 1.0, 2.2));
    p.push(part(box(), GOLD, sx, 1.25, 0, 0, 0, 0, 2.5, 0.3, 2.5));
    p.push(part(box(), GOLD, sx, PIER_TOP - 0.3, 0, 0, 0, 0, 2.45, 0.35, 2.45));
  }
  // the arch: a half torus standing on the piers, open face ±z
  p.push(part(new THREE.TorusGeometry(4.4, 1.1, 6, 12, Math.PI), STONE, 0, PIER_TOP, 0));
  // on the crown: the eave band, the little blue cone roof, the gold ball
  const CROWN = PIER_TOP + 4.4 + 1.1;
  p.push(part(cyl(1.0, 1.0, 12), EAVE, 0, CROWN - 0.05, 0, 0, 0, 0, 2.0, 0.3, 2.0));
  p.push(part(cone(12), ROOF_BLUE, 0, CROWN + 0.1 + 1.3, 0, 0, 0, 0, 3.6, 2.6, 3.6));
  p.push(part(sph(), GOLD, 0, CROWN + 2.95, 0, 0, 0, 0, 0.8));
  // the yoke, from the arch's inner apex down to the bell's crown
  const APEX_IN = PIER_TOP + 4.4 - 1.1;
  p.push(part(box(), GOLD_D, 0, (APEX_IN + 13.3) / 2, 0, 0, 0, 0, 1.4, APEX_IN - 13.3 + 0.2, 1.0));
  // THE BELL, y 8.3 -> 13.3: crown, shoulder, waist, flared lip
  const bell = (rt: number, rb: number, y0: number, y1: number, col: number) =>
    p.push(part(new THREE.CylinderGeometry(rt, rb, 1, 16), col, 0, (y0 + y1) / 2, 0, 0, 0, 0, 1, y1 - y0, 1));
  bell(1.1, 1.1, 12.8, 13.3, GOLD);
  bell(1.6, 2.2, 11.3, 12.8, GOLD);
  bell(2.2, 2.6, 8.8, 11.3, GOLD);
  bell(2.7, 3.0, 8.3, 8.8, GOLD_D);
  // the mouth (the one dark accent) and the clapper just below it
  p.push(part(cyl(0.5, 0.5, 16), BELL_MOUTH, 0, 8.32, 0, 0, 0, 0, 5.2, 0.06, 5.2));
  p.push(part(sph(), GOLD, 0, 7.9, 0, 0, 0, 0, 1.1));
  return mergedProp(p);
}

// ══ THE CASTLES ════════════════════════════════════════════════════════════
/** THE CASTLE KEEP — a fat round tower with the Bell-Keeper's balcony, a dark
 *  eave and a tall blue cone roof: about 17.6 tall. The Town Crier stands at
 *  its foot (life.ts, off(tower, 5.5)). */
export function skCastleKeep(): THREE.Object3D {
  const p: THREE.BufferGeometry[] = [];
  const R = 3.2, H = 10;
  p.push(part(cyl(R + 0.45, R + 0.55, 18), STONE_D, 0, 0.3, 0, 0, 0, 0, 1, 0.6, 1));
  p.push(part(cyl(R, R + 0.12, 18), STONE, 0, H / 2, 0, 0, 0, 0, 1, H, 1));
  // the balcony at 7.5: a stone floor, a gold rail and eight merlons
  p.push(part(cyl(R + 0.8, R + 0.55, 18), STONE_D, 0, 7.35, 0, 0, 0, 0, 1, 0.3, 1));
  p.push(part(new THREE.TorusGeometry(R + 0.72, 0.12, 6, 24), GOLD, 0, 7.55, 0, Math.PI / 2, 0, 0));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    p.push(part(box(), STONE, Math.cos(a) * (R + 0.55), 7.9, Math.sin(a) * (R + 0.55), 0, -a, 0, 0.45, 0.8, 0.95));
  }
  // the door (gold, facing +x) and four dark window slits
  p.push(part(box(), GOLD_D, R + 0.03, 1.2, 0, 0, 0, 0, 0.14, 2.4, 1.5));
  for (const a of [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4]) {
    p.push(part(box(), EAVE, Math.cos(a) * (R + 0.02), 4.6, Math.sin(a) * (R + 0.02), 0, -a, 0, 0.12, 1.3, 0.42));
  }
  const top = towerRoof(p, R + 0.55, 6, H, ROOF_BLUE, 18);
  p.push(part(cone(8), GOLD, 0, top + 0.45, 0, 0, 0, 0, 0.24, 0.9, 0.24));
  return mergedProp(p);
}

/** A SKY TURRET — a slim round tower with a pointed roof in blue (or a
 *  cottage colour), about 11.8 tall. The gardens' punctuation. */
export function skSkyTurret(roof = ROOF_BLUE): THREE.Object3D {
  const p: THREE.BufferGeometry[] = [];
  const R = 2.3, H = 7;
  p.push(part(cyl(R + 0.3, R + 0.4, 16), STONE_D, 0, 0.2, 0, 0, 0, 0, 1, 0.4, 1));
  p.push(part(cyl(R, R + 0.1, 16), STONE, 0, H / 2, 0, 0, 0, 0, 1, H, 1));
  p.push(part(cyl(R + 0.06, R + 0.06, 16), GOLD, 0, 5.4, 0, 0, 0, 0, 1, 0.25, 1));
  p.push(part(box(), GOLD_D, R + 0.03, 1.0, 0, 0, 0, 0, 0.12, 2.0, 1.1));
  for (const a of [(2 * Math.PI) / 3, (4 * Math.PI) / 3]) {
    p.push(part(box(), EAVE, Math.cos(a) * (R + 0.02), 3.8, Math.sin(a) * (R + 0.02), 0, -a, 0, 0.12, 1.1, 0.36));
  }
  towerRoof(p, R + 0.4, 4, H, roof, 16);
  return mergedProp(p);
}

/** A CASTLE GATEHOUSE — two short turrets with cone roofs and a white arch wall
 *  between them with a dark opening through it. The passage runs along x. */
export function skCastleGate(): THREE.Object3D {
  const p: THREE.BufferGeometry[] = [];
  for (const sz of [-2.9, 2.9]) {
    const g: THREE.BufferGeometry[] = [];
    g.push(part(cyl(1.6, 1.7, 14), STONE, 0, 3, 0, 0, 0, 0, 1, 6, 1));
    towerRoof(g, 1.9, 2.8, 6, ROOF_BLUE, 14);
    for (const q of g) p.push(q.translate(0, 0, sz));
  }
  p.push(part(box(), STONE, 0, 2.3, 0, 0, 0, 0, 1.6, 4.6, 2.8));
  p.push(part(box(), STONE_D, 0, 4.7, 0, 0, 0, 0, 1.8, 0.2, 2.9));
  for (const z of [-0.9, 0, 0.9]) p.push(part(box(), STONE, 0, 5.1, z, 0, 0, 0, 1.6, 0.6, 0.5));
  // the passage, dark, open on both faces; a gold keystone over it
  p.push(part(box(), EAVE, 0, 1.4, 0, 0, 0, 0, 1.7, 2.8, 1.5));
  p.push(part(box(), GOLD, 0.82, 3.05, 0, 0, 0, 0, 0.12, 0.45, 0.5));
  return mergedProp(p);
}

/** A CASTLE WALL — a crenellated run of white stone, 6 long (along z), with a
 *  hanging blue banner and its gold stripe on the +x face. */
export function skCastleWall(): THREE.Object3D {
  const p: THREE.BufferGeometry[] = [
    part(box(), STONE, 0, 1.2, 0, 0, 0, 0, 1.2, 2.4, 6),
    part(box(), STONE_D, 0, 2.5, 0, 0, 0, 0, 1.35, 0.2, 6.1),
  ];
  for (let i = 0; i < 5; i++) p.push(part(box(), STONE, 0, 2.9, -2.5 + i * 1.25, 0, 0, 0, 1.2, 0.6, 0.7));
  p.push(part(box(), GOLD, 0.66, 2.2, 0, 0, 0, 0, 0.08, 0.1, 1.1));
  p.push(part(box(), ROOF_BLUE, 0.64, 1.45, 0, 0, 0, 0, 0.06, 1.4, 0.95));
  p.push(part(box(), GOLD, 0.66, 1.05, 0, 0, 0, 0, 0.07, 0.2, 0.95));
  return voiced(mergedProp(p), 'crumble');
}

// ══ THE CLOUD GARDENS AND THE TOWN ═════════════════════════════════════════
/** A CLOUD COTTAGE — round, white, a dark eave and a pointed roof in blue, rose
 *  or mint, a gold door facing +x. About 5.2 tall. Somebody's house. */
export function skCloudCottage(roof = ROOF_BLUE): THREE.Object3D {
  const p: THREE.BufferGeometry[] = [];
  const R = 1.8, H = 2.2;
  p.push(part(cyl(R + 0.2, R + 0.25, 14), STONE_D, 0, 0.1, 0, 0, 0, 0, 1, 0.2, 1));
  p.push(part(cyl(R, R + 0.05, 14), STONE, 0, H / 2, 0, 0, 0, 0, 1, H, 1));
  p.push(part(box(), GOLD, R + 0.02, 0.65, 0, 0, 0, 0, 0.12, 1.3, 0.75));
  p.push(part(cyl(0.28, 0.28, 10), EAVE, 0, 1.45, R - 0.02, Math.PI / 2, 0, 0, 1, 0.1, 1));
  p.push(part(cyl(0.28, 0.28, 10), EAVE, 0, 1.45, -(R - 0.02), Math.PI / 2, 0, 0, 1, 0.1, 1));
  towerRoof(p, R + 0.35, 2.6, H, roof, 14);
  return mergedProp(p);
}

/** A CLOUD TREE — a gold-cream trunk under overlapping puffs in one pastel
 *  (mint, peach or lilac: CLOUD_TINTS), with a paler sunlit crown. Never
 *  white; white is the ground's. About 5.7 tall. */
export function skCloudTree(tint = 0): THREE.Object3D {
  const [body, top] = CLOUD_TINTS[((tint % 3) + 3) % 3];
  return voiced(mergedProp([
    part(cyl(0.22, 0.32, 8), TRUNK, 0, 1.3, 0, 0, 0, 0, 1, 2.6, 1),
    part(sph(), body, 0, 3.5, 0, 0, 0, 0, 2.8, 2.3, 2.8),
    part(sph(), body, 0.95, 3.1, 0.45, 0, 0, 0, 2.0, 1.7, 2.0),
    part(sph(), body, -0.85, 3.15, -0.5, 0, 0, 0, 2.1, 1.8, 2.1),
    part(sph(), body, -0.3, 3.0, 0.95, 0, 0, 0, 1.8, 1.5, 1.8),
    part(sph(), top, 0.15, 4.55, -0.15, 0, 0, 0, 2.0, 1.6, 2.0),
  ]), 'poof');
}

/** A PUFF BUSH — three low pastel puffs, two tones. */
export function skPuffBush(tint = 0): THREE.Object3D {
  const [body, top] = CLOUD_TINTS[((tint % 3) + 3) % 3];
  return voiced(mergedProp([
    part(sph(), body, 0, 0.3, 0, 0, 0, 0, 0.8, 0.6, 0.8),
    part(sph(), body, 0.38, 0.24, 0.2, 0, 0, 0, 0.6, 0.48, 0.6),
    part(sph(), top, -0.2, 0.36, -0.25, 0, 0, 0, 0.6, 0.5, 0.6),
  ]), 'poof');
}

/** A BELL POST — a slim white post with a blue cap and a gold hand bell on a
 *  bracket. The festival's small bells; the cloud sweepers walk between them. */
export function skBellPost(): THREE.Object3D {
  return voiced(mergedProp([
    part(box(), STONE_D, 0, 0.08, 0, 0, 0, 0, 0.5, 0.16, 0.5),
    part(cyl(0.09, 0.11, 8), STONE, 0, 1.06, 0, 0, 0, 0, 1, 1.8, 1),
    part(cone(8), ROOF_BLUE, 0, 2.12, 0, 0, 0, 0, 0.38, 0.32, 0.38),
    part(box(), GOLD, 0.26, 1.78, 0, 0, 0, 0, 0.52, 0.07, 0.07),
    part(cyl(0.07, 0.17, 10), GOLD, 0.47, 1.58, 0, 0, 0, 0, 1, 0.28, 1),
    part(cyl(0.19, 0.19, 10), GOLD_D, 0.47, 1.43, 0, 0, 0, 0, 1, 0.05, 1),
  ]), 'ding');
}

/** A BELL SHRINE — an open pavilion: four white posts, a dark eave, a blue
 *  pyramid roof, and a small gold bell hanging inside. */
export function skBellShrine(): THREE.Object3D {
  const p: THREE.BufferGeometry[] = [part(box(), STONE_D, 0, 0.1, 0, 0, 0, 0, 2.6, 0.2, 2.6)];
  for (const [dx, dz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    p.push(part(box(), STONE, dx, 1.35, dz, 0, 0, 0, 0.26, 2.3, 0.26));
  }
  p.push(part(box(), EAVE, 0, 2.55, 0, 0, 0, 0, 2.7, 0.2, 2.7));
  p.push(part(cone(4), ROOF_BLUE, 0, 3.5, 0, 0, Math.PI / 4, 0, 3.9, 1.7, 3.9));
  p.push(part(sph(), GOLD, 0, 4.45, 0, 0, 0, 0, 0.4));
  p.push(part(box(), GOLD_D, 0, 2.2, 0, 0, 0, 0, 0.15, 0.5, 0.15));
  p.push(part(cyl(0.22, 0.45, 12), GOLD, 0, 1.7, 0, 0, 0, 0, 1, 0.6, 1));
  p.push(part(cyl(0.5, 0.5, 12), GOLD_D, 0, 1.36, 0, 0, 0, 0, 1, 0.1, 1));
  return voiced(mergedProp(p), 'ding');
}

/** A BROKEN COLUMN — the "old style" ruins: a fluted white stump on its base, a
 *  fallen drum beside it and a gold capital fragment in the cloud. */
export function skBrokenColumn(big = false): THREE.Object3D {
  const s = big ? 1.35 : 1;
  const p: THREE.BufferGeometry[] = [
    part(box(), STONE_D, 0, 0.125 * s, 0, 0, 0, 0, 1.2 * s, 0.25 * s, 1.2 * s),
    part(cyl(0.42 * s, 0.46 * s, 12), STONE, 0, 0.95 * s, 0, 0, 0, 0, 1, 1.4 * s, 1),
    part(cyl(0.3 * s, 0.42 * s, 7), STONE_D, 0.05 * s, 1.72 * s, 0, 0, 0, 0.3, 1, 0.25 * s, 1),
  ];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    p.push(part(box(), STONE_D, Math.cos(a) * 0.44 * s, 0.95 * s, Math.sin(a) * 0.44 * s, 0, -a, 0, 0.07 * s, 1.3 * s, 0.1 * s));
  }
  p.push(part(cyl(0.4 * s, 0.4 * s, 12), STONE, 1.0 * s, 0.4 * s, 0.3 * s, 0, 0.4, Math.PI / 2, 1, 0.55 * s, 1));
  p.push(part(box(), GOLD, -0.75 * s, 0.11 * s, -0.35 * s, 0, 0.5, 0, 0.7 * s, 0.22 * s, 0.55 * s));
  // stone crumbles. It goes down as qk 'small', which says nothing, so the
  // factory says it (the same for the wall, the fountain and the bridge)
  return voiced(mergedProp(p), 'crumble');
}

/** A MARKET STALL — a striped awning (rose or blue on white) on white posts
 *  over a gold counter; the front faces +x. Somebody's shop. */
export function skMarketStall(stripe = ROSE): THREE.Object3D {
  const p: THREE.BufferGeometry[] = [
    part(box(), GOLD, 0.35, 0.45, 0, 0, 0, 0, 0.9, 0.9, 2.2),
    part(box(), STONE, 0.35, 0.93, 0, 0, 0, 0, 1.0, 0.07, 2.3),
  ];
  for (const [dx, dz] of [[0.8, 1.15], [-0.75, 1.15], [0.8, -1.15], [-0.75, -1.15]]) {
    p.push(part(cyl(0.06, 0.06, 6), STONE, dx, 1.15, dz, 0, 0, 0, 1, 2.3, 1));
  }
  for (let i = 0; i < 6; i++) {
    p.push(part(box(), i % 2 ? STONE : stripe, 0.1, 2.38, -1.0 + i * 0.4, 0, 0, -0.25, 1.95, 0.08, 0.4));
  }
  // the awning's front edge: a dark valance line, the crown rule on a stall
  p.push(part(box(), EAVE, 1.05, 2.12, 0, 0, 0, 0, 0.08, 0.14, 2.45));
  for (const z of [-0.6, 0, 0.6]) p.push(part(cyl(0.16, 0.18, 8), GOLD_D, 0.35, 1.05, z, 0, 0, 0, 1, 0.18, 1));
  return mergedProp(p);
}

/** A CLOUD FOUNTAIN — a round white basin, a pale pool, a slim pillar with a
 *  small bowl and a gold ball on top. */
export function skCloudFountain(): THREE.Object3D {
  return voiced(mergedProp([
    part(cyl(1.45, 1.55, 18), STONE, 0, 0.275, 0, 0, 0, 0, 1, 0.55, 1),
    part(cyl(1.25, 1.25, 18), WATER, 0, 0.53, 0, 0, 0, 0, 1, 0.06, 1),
    part(cyl(0.18, 0.26, 10), STONE, 0, 1.2, 0, 0, 0, 0, 1, 1.3, 1),
    part(cyl(0.55, 0.3, 12), STONE, 0, 1.5, 0, 0, 0, 0, 1, 0.2, 1),
    part(cyl(0.45, 0.45, 12), WATER, 0, 1.61, 0, 0, 0, 0, 1, 0.03, 1),
    part(sph(), GOLD, 0, 1.9, 0, 0, 0, 0, 0.56),
  ]), 'crumble');
}

/** A BANNER POLE — a tall white pole flying a long blue pennant with a gold
 *  stripe. The pennant is rolled toward the sky so from 46 degrees up it is a
 *  stroke of colour, not an edge. */
export function skBannerPole(): THREE.Object3D {
  const ROLL = -1.0;   // tips the pennant's broad face up toward the camera
  return mergedProp([
    part(box(), STONE_D, 0, 0.1, 0, 0, 0, 0, 0.5, 0.2, 0.5),
    part(cyl(0.06, 0.08, 8), STONE, 0, 2.3, 0, 0, 0, 0, 1, 4.2, 1),
    part(sph(), GOLD, 0, 4.48, 0, 0, 0, 0, 0.3),
    part(box(), ROOF_BLUE, 0.75, 3.85, 0, ROLL, 0, 0, 1.4, 0.6, 0.05),
    part(box(), ROOF_BLUE, 1.85, 3.85, 0, ROLL, 0, 0, 0.8, 0.34, 0.05),
    part(box(), GOLD, 1.05, 3.87, 0.02, ROLL, 0, 0, 2.0, 0.12, 0.06),
  ]);
}

/** A CLOUD BRIDGE — the poster's curving footbridge: an arched white deck with
 *  gold rails, on stone feet in a cloud of puffs. Its long axis is x. */
export function skCloudBridge(): THREE.Object3D {
  const p: THREE.BufferGeometry[] = [];
  const N = 7, L = 7.2, RISE = 1.5;
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    // 0.52 lifts the steepest (end) segment's low corner clear of the ground:
    // a 1.3 x 0.35 plank tilted 33 degrees reaches 0.50 below its centre
    const x = -L / 2 + t * L, y = 0.52 + RISE * Math.sin(Math.PI * t);
    const tilt = Math.atan((RISE * Math.PI * Math.cos(Math.PI * t)) / L);
    p.push(part(box(), STONE, x, y, 0, 0, 0, tilt, 1.3, 0.35, 1.6));
    for (const z of [-0.75, 0.75]) {
      p.push(part(box(), GOLD, x, y + 0.6, z, 0, 0, tilt, 1.3, 0.1, 0.1));
      p.push(part(box(), GOLD, x, y + 0.32, z, 0, 0, 0, 0.1, 0.5, 0.1));
    }
  }
  for (const sx of [-1, 1]) {
    p.push(part(box(), STONE_D, sx * 3.95, 0.25, 0, 0, 0, 0, 1.0, 0.5, 2.0));
    for (const z of [-0.95, 0.95]) p.push(part(sph(), PUFF_W, sx * 4.3, 0.35, z, 0, 0, 0, 1.2, 0.7, 1.0));
  }
  return voiced(mergedProp(p), 'crumble');
}

// ══ THE BALLOONS — visitors from every island, docking for the festival ════

// ── BAGGED — a fridge-sized roll of fabric, strapped. The lowest stage.
//
//    IT SQUEAKS WHEN EATEN, AND THE FACTORY SAYS SO. Every other envelope
//    reaches the classifier (prototype3d.ts eatVoiceOf) with island.ts's
//    `balloon` papers on it. The bags in the dock scatter do not: they go down
//    as plain qk 'big', and 'big' is the building rule, so they crumbled while
//    the same mesh dropped through tagBalloon squeaked (qa/eatvoice.mjs (r)).
export function skBalloonBagged(cols: [number, number, number] = ENVELOPE[0]): THREE.Object3D {
  return voiced(mergedProp([
    part(cyl(0.5, 0.5, 10), cols[0], 0, 0.55, 0, 0, 0, Math.PI / 2, 1.1, 2.4, 1.1),
    part(cyl(0.5, 0.5, 10), cols[1], 0.75, 0.55, 0, 0, 0, Math.PI / 2, 1.05, 0.5, 1.05),
    part(box(), SKIRT_D, 0.35, 0.55, 0, 0, 0, 0, 0.14, 1.18, 1.18),
    part(box(), SKIRT_D, -0.45, 0.55, 0, 0, 0, 0, 0.14, 1.18, 1.18),
    part(box(), WICKER_D, 0, 0.06, 0, 0, 0, 0, 2.5, 0.12, 1.2),
  ]), 'squeak');
}

// ── SPILLED — a long flat gore-striped crescent laid out on the cloud, two to
//    three times longer than wide: from directly overhead it is spilled paint.
export function skBalloonSpilled(cols: [number, number, number] = ENVELOPE[1]): THREE.Object3D {
  const p: THREE.BufferGeometry[] = [];
  const L = 9.5;
  for (let i = 0; i < 14; i++) {
    const t = i / 13;
    const col = cols[i % 3];
    // a lazy curve, so it lies like cloth rather than like a plank
    const x = -L * 0.5 + t * L;
    const z = Math.sin(t * Math.PI) * 1.15;
    const wide = 1.5 + Math.sin(t * Math.PI) * 1.9;
    p.push(part(box(), col, x, 0.16, z, 0, Math.sin(t * Math.PI) * 0.22, 0, L / 14 + 0.12, 0.30, wide));
  }
  // the gathered mouth: a cylinder on its side, so its RADIUS is its vertical
  // half-height. At y=0.22 with a 0.75 radius the mouth sat 0.53 UNDER the
  // ground — invisible in a screenshot and 2,477 'sunk' rows in the audit.
  p.push(part(cyl(0.5, 0.5, 10), SKIRT_D, -L * 0.5 - 0.2, 0.78, 0, Math.PI / 2, 0, 0, 1.5, 0.34, 1.5));
  p.push(part(torus(0.10, 12), SKIRT_D, L * 0.5 + 0.1, 0.20, 1.0, Math.PI / 2, 0, 0, 1.5, 1.5, 1.5));
  return mergedProp(p);
}

// ── COLD — a fat lying sausage, half-inflated, a fan at its mouth.
export function skBalloonCold(cols: [number, number, number] = ENVELOPE[2]): THREE.Object3D {
  const p: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 9; i++) {
    const t = i / 8;
    const col = cols[i % 3];
    const rr = 0.9 + Math.sin(t * Math.PI) * 2.5;
    p.push(part(cyl(0.5, 0.5, 10), col, -4.2 + t * 8.4, rr * 0.55, 0, 0, 0, Math.PI / 2, rr, 1.0, rr));
  }
  p.push(part(torus(0.12, 12), SKIRT_D, -4.6, 1.20, 0, 0, 0, Math.PI / 2, 1.9, 1.9, 1.9));
  p.push(part(cyl(0.5, 0.5, 8), STEEL_D, 4.7, 0.55, 0, 0, 0, Math.PI / 2, 0.9, 0.5, 0.9));
  return mergedProp(p);
}

// ── STANDING — the full envelope, upright: the poster's docked balloons. ONE
//    MESH, ONE RADIUS. All four crown rules. 9.48 units tall and 9.6 x 9.6 on
//    the ground (qa/kitfit.mjs, recorded in docs/BELLCLOUD.md §14; this note
//    said "~14" until then), under the Great Bell and the Keep.
export function skBalloonStanding(cols: [number, number, number] = ENVELOPE[3]): THREE.Object3D {
  const R = 4.6, H = 9.4;
  const p = goreDome(cols, R, H, 12);
  // 2. THE CROWN RING — the disc's pupil, seen from directly above
  p.push(part(cyl(0.5, 0.5, 12), SKIRT_D, 0, H - 0.15, 0, 0, 0, 0, 1.5, 0.45, 1.5));
  // 3. THE SKIRT — a contrasting dark ring at the mouth, lifted clear of the
  //    basket on the burner frame, so the overhead read is disc / ring / basket
  p.push(part(cyl(2.05, 1.35, 12), SKIRT_D, 0, 2.55, 0, 0, 0, 0, 1, 1.5, 1));
  // the burner frame and its pilot flame, under the mouth
  for (const dz of [-0.55, 0.55]) {
    p.push(part(cyl(0.06, 0.06, 6), STEEL, 0.55, 1.75, dz, 0, 0, 0, 1, 1.5, 1));
    p.push(part(cyl(0.06, 0.06, 6), STEEL, -0.55, 1.75, dz, 0, 0, 0, 1, 1.5, 1));
  }
  p.push(part(box(), STEEL_D, 0, 2.45, 0, 0, 0, 0, 1.5, 0.14, 1.5));
  p.push(part(box(), WICKER, 0, 0.62, 0, 0, 0, 0, 1.55, 1.25, 1.35));
  p.push(part(box(), WICKER_D, 0, 1.22, 0, 0, 0, 0, 1.62, 0.14, 1.42));
  p.push(part(box(), WICKER_D, 0, 0.10, 0, 0, 0, 0, 1.62, 0.16, 1.42));
  return mergedProp(p);
}

// ── THE BALLOON CREWS' KIT ─────────────────────────────────────────────────
// Everything a balloon crew touches, and every one of these is an errand
// DESTINATION for the crowd (life.ts).

/** A wicker basket with padded leather corners and two cylinders inside. */
export function skBasket(): THREE.Object3D {
  const p = [
    part(box(), WICKER, 0, 0.62, 0, 0, 0, 0, 1.55, 1.25, 1.35),
    part(box(), WICKER_D, 0, 1.24, 0, 0, 0, 0, 1.64, 0.16, 1.44),
    part(box(), WICKER_D, 0, 0.08, 0, 0, 0, 0, 1.64, 0.18, 1.44),
    part(cyl(0.5, 0.5, 8), 0xd8443a, 0.32, 0.55, 0.30, 0, 0, 0, 0.34, 0.95, 0.34),
    part(cyl(0.5, 0.5, 8), 0xd8443a, 0.32, 0.55, -0.30, 0, 0, 0, 0.34, 0.95, 0.34),
  ];
  for (const [dx, dz] of [[0.72, 0.62], [-0.72, 0.62], [0.72, -0.62], [-0.72, -0.62]]) {
    p.push(part(box(), 0x6b4a33, dx, 0.66, dz, 0, 0, 0, 0.16, 1.30, 0.16));
  }
  return mergedProp(p);
}

/** The stainless frame that sits over a basket, with the burner coil. */
export function skBurnerFrame(): THREE.Object3D {
  const p: THREE.BufferGeometry[] = [];
  for (const [dx, dz] of [[0.55, 0.55], [-0.55, 0.55], [0.55, -0.55], [-0.55, -0.55]]) {
    p.push(part(cyl(0.06, 0.06, 6), STEEL, dx, 0.85, dz, 0, 0, 0, 1, 1.7, 1));
  }
  p.push(part(box(), STEEL_D, 0, 1.72, 0, 0, 0, 0, 1.4, 0.12, 1.4));
  p.push(part(cyl(0.34, 0.34, 10), STEEL, 0, 1.42, 0, 0, 0, 0, 1, 0.5, 1));
  p.push(part(torus(0.07, 10), STEEL_D, 0, 1.20, 0, Math.PI / 2, 0, 0, 0.7, 0.7, 0.7));
  return mergedProp(p);
}

/** The burner's pilot flame, on PROP_GLOW_MAT: a flame is a light. */
export function skPilotFlame(): THREE.Object3D {
  return mergedProp([
    part(cone(6), 0xffb347, 0, 0.22, 0, Math.PI, 0, 0, 0.30, 0.55, 0.30),
    part(cone(6), 0xfff0b0, 0, 0.14, 0, Math.PI, 0, 0, 0.16, 0.30, 0.16),
  ], PROP_GLOW_MAT);
}

/** An inflator fan in a round cage — the destination of the shortest errand. */
export function skInflatorFan(): THREE.Object3D {
  const p = [
    part(box(), STEEL_D, 0, 0.18, 0, 0, 0, 0, 1.1, 0.30, 0.9),
    part(cyl(0.5, 0.5, 12), STEEL, 0, 0.85, 0, 0, 0, Math.PI / 2, 1.35, 0.55, 1.35),
    part(cyl(0.5, 0.5, 12), SKIRT_D, 0.30, 0.85, 0, 0, 0, Math.PI / 2, 1.05, 0.14, 1.05),
    part(cyl(0.16, 0.16, 6), RUST, -0.42, 0.85, 0, 0, 0, Math.PI / 2, 1, 0.5, 1),
  ];
  for (let i = 0; i < 4; i++) {
    p.push(part(box(), STEEL_D, 0.10, 0.85, 0, i * 0.78, 0, 0, 0.10, 1.15, 0.24));
  }
  return mergedProp(p);
}

/** Two burner-fuel cylinders standing together, strapped. */
export function skCylinderPair(): THREE.Object3D {
  return mergedProp([
    part(cyl(0.5, 0.5, 10), 0xd8443a, 0.22, 0.52, 0, 0, 0, 0, 0.44, 1.05, 0.44),
    part(cyl(0.5, 0.5, 10), 0xd8443a, -0.22, 0.52, 0, 0, 0, 0, 0.44, 1.05, 0.44),
    part(cyl(0.5, 0.5, 8), STEEL, 0.22, 1.10, 0, 0, 0, 0, 0.18, 0.18, 0.18),
    part(cyl(0.5, 0.5, 8), STEEL, -0.22, 1.10, 0, 0, 0, 0, 0.18, 0.18, 0.18),
    part(box(), SKIRT_D, 0, 0.72, 0, 0, 0, 0, 0.96, 0.14, 0.50),
  ]);
}

/** A coil of crown line and its stake. */
export function skCrownLine(): THREE.Object3D {
  return mergedProp([
    part(torus(0.09, 12), 0xe8e2d0, 0, 0.12, 0, Math.PI / 2, 0, 0, 0.85, 0.85, 0.85),
    part(torus(0.08, 12), 0xd6cfb8, 0.05, 0.24, 0.05, Math.PI / 2, 0, 0, 0.70, 0.70, 0.70),
    part(cyl(0.06, 0.06, 6), STEEL_D, 0.55, 0.30, 0, 0, 0, 0.2, 1, 0.6, 1),
  ]);
}

/** A BASKET CART — the open trailer a visiting crew brought its balloon in on,
 *  wooden now with cream sides, tailgate down, an envelope bag half out. It
 *  has wheels, so it meeps (kind 'trailer' in island.ts). */
export function skTrailer(): THREE.Object3D {
  return mergedProp([
    part(box(), WICKER, 0, 0.62, 0, 0, 0, 0, 3.4, 0.34, 1.8),
    part(box(), CREAM, 0, 0.86, 0.85, 0, 0, 0, 3.3, 0.55, 0.14),
    part(box(), CREAM, 0, 0.86, -0.85, 0, 0, 0, 3.3, 0.55, 0.14),
    part(box(), CREAM, -1.65, 0.86, 0, 0, 0, 0, 0.14, 0.55, 1.7),
    part(box(), WICKER_D, 1.85, 0.24, 0, 0, 0, -0.35, 1.0, 0.14, 1.7),
    part(cyl(0.5, 0.5, 10), SKIRT_D, 0.6, 0.34, 0.92, 0, 0, Math.PI / 2, 0.68, 0.22, 0.68),
    part(cyl(0.5, 0.5, 10), SKIRT_D, 0.6, 0.34, -0.92, 0, 0, Math.PI / 2, 0.68, 0.22, 0.68),
    part(cyl(0.5, 0.5, 10), 0xe4513a, 1.0, 0.92, 0, 0, 0, Math.PI / 2, 0.85, 1.5, 0.85),
    part(cyl(0.06, 0.06, 6), STEEL_D, -2.0, 0.5, 0, 0, 0, 1.35, 1, 1.1, 1),
  ]);
}

/** A MOORING POST — a gold stake with a ring, where a balloon ties up. */
export function skTetherPin(): THREE.Object3D {
  return mergedProp([
    part(cyl(0.5, 0.5, 8), GOLD, 0, 0.18, 0, 0, 0, 0, 0.16, 0.38, 0.16),
    part(torus(0.06, 10), STEEL, 0, 0.40, 0, 0, 0, 0, 0.30, 0.30, 0.30),
    part(box(), 0xf5b731, 0, 0.05, 0, 0, 0, 0, 0.55, 0.08, 0.55),
  ]);
}

/** THE TICKET WAGON — the first thing at the Balloon Dock: a rose canvas wagon
 *  with a gold roof and one bulb on. */
export function skTicketCaravan(): THREE.Object3D {
  return mergedProp([
    part(box(), WAGON_ROSE, 0, 0.95, 0, 0, 0, 0, 2.4, 1.25, 1.5),
    part(box(), GOLD, 0, 1.62, 0, 0, 0, 0, 2.3, 0.26, 1.45),
    part(box(), SKIRT_D, 0, 1.78, 0, 0, 0, 0, 2.5, 0.12, 1.65),
    part(box(), 0xffd9a0, 0.55, 1.05, 0.78, 0, 0, 0, 0.85, 0.60, 0.06),
    part(box(), 0x2b3550, -0.70, 1.00, 0.78, 0, 0, 0, 0.55, 0.70, 0.06),
    part(cyl(0.5, 0.5, 10), SKIRT_D, 0.5, 0.30, 0.78, 0, 0, Math.PI / 2, 0.58, 0.22, 0.58),
    part(cyl(0.5, 0.5, 10), SKIRT_D, 0.5, 0.30, -0.78, 0, 0, Math.PI / 2, 0.58, 0.22, 0.58),
  ]);
}

// ── THE AVENUE AND THE PLAZA — paint and lights, not food ─────────────────

/** AN AVENUE LANTERN — a low gold lamp along the Grand Avenue's edges. On the
 *  glow material: the pale core is the part that crosses the bloom cut, and
 *  qa/halocensus.mjs checks that nothing but a light does. */
export function skRunwayEdgeLight(): THREE.Object3D {
  return mergedProp([
    part(cyl(0.5, 0.5, 8), 0xffd98a, 0, 0.16, 0, 0, 0, 0, 0.24, 0.30, 0.24),
    part(sph(), 0xfff3d0, 0, 0.30, 0, 0, 0, 0, 0.26, 0.20, 0.26),
  ], PROP_GLOW_MAT);
}

/** A PLAZA RING TILE — one gold segment of the Bell Plaza's painted ring. */
export function skLaunchCircleMarker(): THREE.Object3D {
  return mergedProp([part(box(), RING_GOLD, 0, 0.03, 0, 0, 0, 0, 2.4, 0.06, 0.55)]);
}

// ── THE CLOUD MARKET — cake carts ───────────────────────────────────────────
// Four pastel carts in the measured row (island.ts), every errand's end. Their
// hatches and insides are the warmest things in the frame.

/** A CAKE CART with its hatch up, a lit inside and a striped awning. Takes a
 *  body and a stripe colour so the row is not a row of one cart. */
export function skBaconVan(body = CAKE_ROSE, trim = GOLD): THREE.Object3D {
  const p = [
    part(box(), body, 0, 1.20, 0, 0, 0, 0, 3.6, 1.70, 1.9),
    part(box(), trim, 0, 0.55, 0, 0, 0, 0, 3.64, 0.40, 1.94),
    part(box(), body, 1.95, 0.95, 0, 0, 0, 0, 0.60, 1.10, 1.75),
    part(box(), 0x2b3550, 2.22, 1.25, 0, 0, 0, 0, 0.12, 0.55, 1.55),
    // the serving hatch, open, with the warm inside behind it
    part(box(), 0xffd9a0, -0.20, 1.30, 0.96, 0, 0, 0, 2.2, 1.00, 0.08),
    part(box(), 0x2b2f38, -0.20, 1.30, 1.02, 0, 0, 0, 2.0, 0.85, 0.05),
    part(cyl(0.5, 0.5, 10), SKIRT_D, 1.20, 0.36, 0.90, 0, 0, Math.PI / 2, 0.72, 0.26, 0.72),
    part(cyl(0.5, 0.5, 10), SKIRT_D, 1.20, 0.36, -0.90, 0, 0, Math.PI / 2, 0.72, 0.26, 0.72),
    part(cyl(0.5, 0.5, 10), SKIRT_D, -1.30, 0.36, 0.90, 0, 0, Math.PI / 2, 0.72, 0.26, 0.72),
    part(cyl(0.5, 0.5, 10), SKIRT_D, -1.30, 0.36, -0.90, 0, 0, Math.PI / 2, 0.72, 0.26, 0.72),
  ];
  // the striped awning over the hatch
  for (let i = 0; i < 6; i++) {
    p.push(part(box(), i % 2 ? CREAM : trim, -1.2 + i * 0.4, 2.12, 1.35, -0.45, 0, 0, 0.4, 0.08, 1.05));
  }
  return mergedProp(p);
}

/** A mint cake cart with a cream roof and a striped awning. */
export function skCoffeeHorsebox(): THREE.Object3D {
  const p = [
    part(box(), CAKE_MINT, 0, 1.25, 0, 0, 0, 0, 2.9, 1.60, 1.7),
    part(box(), CREAM, 0, 2.15, 0, 0, 0, -0.10, 2.6, 0.16, 1.75),
    part(box(), SKIRT_D, 0, 2.28, 0, 0, 0, 0, 3.0, 0.12, 1.85),
    part(box(), 0xffd9a0, -0.10, 1.35, 0.87, 0, 0, 0, 1.7, 0.85, 0.06),
    part(box(), CREAM, -0.10, 0.80, 1.02, 0, 0, 0, 1.8, 0.12, 0.40),
    part(cyl(0.5, 0.5, 10), SKIRT_D, 0.85, 0.34, 0.82, 0, 0, Math.PI / 2, 0.66, 0.24, 0.66),
    part(cyl(0.5, 0.5, 10), SKIRT_D, 0.85, 0.34, -0.82, 0, 0, Math.PI / 2, 0.66, 0.24, 0.66),
    part(cyl(0.5, 0.5, 10), SKIRT_D, -0.95, 0.34, 0.82, 0, 0, Math.PI / 2, 0.66, 0.24, 0.66),
    part(cyl(0.5, 0.5, 10), SKIRT_D, -0.95, 0.34, -0.82, 0, 0, Math.PI / 2, 0.66, 0.24, 0.66),
  ];
  for (let i = 0; i < 5; i++) {
    p.push(part(box(), i % 2 ? CREAM : ROSE, -0.9 + i * 0.4, 2.0, 1.2, -0.5, 0, 0, 0.4, 0.07, 0.8));
  }
  return mergedProp(p);
}

/** A lemon cake cart with a rose roof and the spiral sign (a cake is a cake). */
export function skDoughnutTrailer(): THREE.Object3D {
  return mergedProp([
    part(box(), CAKE_LEMON, 0, 1.05, 0, 0, 0, 0, 2.3, 1.30, 1.5),
    part(box(), ROSE, 0, 1.78, 0, 0, 0, 0, 2.4, 0.22, 1.6),
    part(box(), 0xffd9a0, 0, 1.15, 0.78, 0, 0, 0, 1.5, 0.75, 0.06),
    part(torus(0.16, 12), 0xf5b731, 0, 2.35, 0, 0, 0, 0, 1.15, 1.15, 0.35),
    part(cyl(0.06, 0.06, 6), STEEL_D, 0, 2.05, 0, 0, 0, 0, 1, 0.60, 1),
    part(cyl(0.5, 0.5, 10), SKIRT_D, 0.3, 0.32, 0.72, 0, 0, Math.PI / 2, 0.62, 0.22, 0.62),
    part(cyl(0.5, 0.5, 10), SKIRT_D, 0.3, 0.32, -0.72, 0, 0, Math.PI / 2, 0.62, 0.22, 0.62),
    part(cyl(0.05, 0.05, 6), STEEL_D, -1.45, 0.40, 0, 0, 0, 1.35, 1, 0.9, 1),
  ]);
}

// ── THE CASTLE YARD'S CRAFT MARKET, AND THE BENCHES ───────────────────────

/** A craft-market trestle with things on it. */
export function skTrestleTable(): THREE.Object3D {
  const p = [
    part(box(), 0xc8b98a, 0, 0.72, 0, 0, 0, 0, 2.2, 0.10, 0.85),
    part(box(), 0x8f6f42, 0.95, 0.36, 0, 0, 0, 0, 0.10, 0.72, 0.75),
    part(box(), 0x8f6f42, -0.95, 0.36, 0, 0, 0, 0, 0.10, 0.72, 0.75),
  ];
  const jum = [0xd8443a, 0x2f6fd0, 0xf5b731, 0x2e9e5b];
  for (let i = 0; i < 5; i++) {
    p.push(part(box(), jum[i % 4], -0.8 + i * 0.42, 0.86, (i % 2) * 0.22 - 0.11, 0, i * 0.7, 0, 0.32, 0.20, 0.28));
  }
  return mergedProp(p);
}

/** The tea urn and its paper cups. */
export function skTeaUrn(): THREE.Object3D {
  return mergedProp([
    part(box(), 0xc8b98a, 0, 0.70, 0, 0, 0, 0, 1.1, 0.10, 0.7),
    part(box(), 0x8f6f42, 0.45, 0.35, 0, 0, 0, 0, 0.10, 0.70, 0.60),
    part(box(), 0x8f6f42, -0.45, 0.35, 0, 0, 0, 0, 0.10, 0.70, 0.60),
    part(cyl(0.5, 0.5, 10), STEEL, 0, 1.05, 0, 0, 0, 0, 0.44, 0.60, 0.44),
    part(cyl(0.5, 0.5, 10), STEEL_D, 0, 1.38, 0, 0, 0, 0, 0.36, 0.10, 0.36),
    part(box(), 0x2b2f38, 0.24, 0.90, 0, 0, 0, 0, 0.10, 0.14, 0.08),
    part(cyl(0.5, 0.5, 8), CANVAS_W, -0.35, 0.80, 0.16, 0, 0, 0, 0.16, 0.18, 0.16),
    part(cyl(0.5, 0.5, 8), CANVAS_W, -0.35, 0.80, -0.12, 0, 0, 0, 0.16, 0.18, 0.16),
  ]);
}

export function skPicnicBench(): THREE.Object3D {
  return mergedProp([
    part(box(), 0xc8b98a, 0, 0.72, 0, 0, 0, 0, 2.2, 0.10, 0.85),
    part(box(), 0xb0a179, 0, 0.42, 0.72, 0, 0, 0, 2.2, 0.10, 0.35),
    part(box(), 0xb0a179, 0, 0.42, -0.72, 0, 0, 0, 2.2, 0.10, 0.35),
    part(box(), 0x8f6f42, 0.85, 0.36, 0, 0, 0, 0.28, 0.10, 0.80, 1.7),
    part(box(), 0x8f6f42, -0.85, 0.36, 0, 0, 0, -0.28, 0.10, 0.80, 1.7),
  ]);
}

// ── THE CLOUD MEADOWS ──────────────────────────────────────────────────────

/** The cloud flowers — a small clump in white, gold and rose. */
export function skWildflowerClump(): THREE.Object3D {
  const p: THREE.BufferGeometry[] = [];
  const petals = [0xf2ede4, 0xf5c542, 0xd8779e];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2, r = 0.16;
    p.push(part(cyl(0.02, 0.03, 4), 0x6f7d5e, Math.cos(a) * r, 0.22, Math.sin(a) * r, 0, 0, 0, 1, 0.45, 1));
    p.push(part(sph(), petals[i % 3], Math.cos(a) * r, 0.46, Math.sin(a) * r, 0, 0, 0, 0.16, 0.10, 0.16));
  }
  return voiced(mergedProp(p), 'rustle');
}

/** THE SKYLARK — larks sing above the clouds. It must be findable and it must
 *  be small: head up, tail down, on the ground where they nest. */
export function skSkylark(): THREE.Object3D {
  return mergedProp([
    part(sph(), 0x9c8a6a, 0, 0.13, 0, 0, 0, 0, 0.26, 0.20, 0.18),
    part(sph(), 0x8a7a5c, -0.14, 0.20, 0, 0, 0, 0, 0.13, 0.13, 0.12),
    part(cone(5), 0xd9c079, -0.22, 0.20, 0, 0, 0, -Math.PI / 2, 0.05, 0.10, 0.05),
    part(box(), 0x7a6c50, 0.17, 0.12, 0, 0, 0, 0.35, 0.20, 0.05, 0.08),
    part(sph(), 0x2b2f38, -0.15, 0.23, 0.05, 0, 0, 0, 0.04, 0.04, 0.03),
  ]);
}

/** A CLOUD BUNNY, sitting up with its pink ears back. Three per match. */
export function skHare(): THREE.Object3D {
  return mergedProp([
    part(sph(), BUNNY, 0, 0.26, 0, 0, 0, 0, 0.34, 0.44, 0.30),
    part(sph(), BUNNY, 0.06, 0.52, 0, 0, 0, 0, 0.22, 0.22, 0.20),
    part(cone(5), BUNNY_EAR, 0.02, 0.70, 0.06, -0.25, 0, -0.15, 0.07, 0.32, 0.07),
    part(cone(5), BUNNY_EAR, 0.02, 0.70, -0.06, 0.25, 0, -0.15, 0.07, 0.32, 0.07),
    part(sph(), 0xffffff, -0.14, 0.16, 0, 0, 0, 0, 0.14, 0.14, 0.12),
    part(sph(), 0x2b2f38, 0.16, 0.56, 0.06, 0, 0, 0, 0.04, 0.04, 0.03),
  ]);
}

/** A CLOUD SHEEP, grazing. FROM DIRECTLY OVERHEAD A SHEEP IS AN OVAL, so the
 *  plum-grey head and four legs are the entire read — without them this is a
 *  cloud on a cloud. One more puff each side than the airfield's sheep. */
export function skSheep(): THREE.Object3D {
  const p = [
    part(sph(), FLEECE, 0, 0.52, 0, 0, 0, 0, 0.92, 0.62, 0.62),
    part(sph(), FLEECE_D, 0.28, 0.60, 0.16, 0, 0, 0, 0.42, 0.40, 0.36),
    part(sph(), FLEECE_D, -0.30, 0.58, -0.14, 0, 0, 0, 0.40, 0.38, 0.34),
    part(sph(), FLEECE, 0.05, 0.62, -0.2, 0, 0, 0, 0.44, 0.40, 0.34),
    part(sph(), FLEECE, -0.12, 0.62, 0.2, 0, 0, 0, 0.44, 0.40, 0.34),
    part(sph(), PLUM, 0.50, 0.34, 0, 0, 0, 0, 0.26, 0.28, 0.22),
    part(sph(), PLUM, 0.62, 0.24, 0, 0, 0, 0, 0.16, 0.14, 0.14),
  ];
  for (const [dx, dz] of [[0.28, 0.20], [-0.28, 0.20], [0.28, -0.20], [-0.28, -0.20]]) {
    p.push(part(cyl(0.5, 0.5, 5), PLUM, dx, 0.13, dz, 0, 0, 0, 0.09, 0.28, 0.09));
  }
  return mergedProp(p);   // it baas by its kind, 'sheep' (island.ts), as it always has
}
