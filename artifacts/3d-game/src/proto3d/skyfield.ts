// ══════════════════════════════════════════════════════════════════════════
//  SKYLARK FIELD — the dawn balloon-meet prop kit
//  A disused grass-and-concrete airfield floating in space, and once a year,
//  for one morning, a hundred hot air balloons come to it. A match is that
//  morning: trailers arriving in the dark, then the mass ascension at sunrise.
//
//  House rules, same as island.ts, alpine.ts and nightmarket.ts:
//    • every prop is ONE merged mesh sharing PROP_SHARED_MAT (one draw call)
//    • no per-prop materials, no textures, flat shading, chunky silhouettes
//    • y = 0 is the ground plane, the prop's nose/front faces +X
//    • keep each prop under ~140 parts
//
//  ── THE CROWN RULE, and it is this world's eave line ────────────────────
//  alpine.ts has the snow cap because a building seen from above is mostly its
//  roof. nightmarket.ts learned the same thing the hard way when its bathhouse
//  photographed as a black rectangle. Here the fact bites differently: FROM
//  DIRECTLY ABOVE A STANDING BALLOON IS A DISC, and a disc of one colour is a
//  dot. Ninety dots is confetti, and confetti photographs as a texture rather
//  than as objects. So every envelope in this file obeys four rules, and a
//  factory that skips one is not finished:
//
//    1. GORES REACH THE CROWN. The envelope is vertical coloured panels
//       radiating from the top and the seams run ALL THE WAY UP, so from
//       straight above the disc reads as a PINWHEEL. Spokes are what give a
//       circle size, rotation and form when you cannot see its side.
//    2. THE CROWN RING IS A DARK HOLE — the disc's pupil. It is the one thing
//       that says "hollow bag standing up" rather than "painted coin".
//    3. THE SKIRT IS A CONTRASTING DARK RING. A standing envelope hides its
//       own basket, so the mouth is lifted clear on the burner frame and the
//       skirt is dark: the overhead read is disc, dark ring, basket, people.
//       Without that ring a balloon has no people and this world has no crowd.
//    4. AT MOST THREE COLOURS PER ENVELOPE. At phone resolution a
//       twelve-colour balloon is grey.
//
//  ── AND ONE RULE THAT CAME OUT OF A MEASUREMENT ─────────────────────────
//  A STANDING BALLOON IS ONE MESH WITH ONE EDIBLE RADIUS. fadeOccluders()
//  (prototype3d.ts:1021) ghosts anything crossing the camera-to-hero sight line
//  down to 62%, and armFade() is called inside mergedProp() so a merged prop is
//  armed automatically. If an envelope were several meshes, only the piece
//  actually crossing the axis would ghost and the child would see a balloon
//  with a hole in it. One mesh. One radius. This is why every factory here
//  returns a single mergedProp and never a Group of them.
//
//  ── THE FOUR STAGES, WHICH ARE THE WHOLE COMPOSITION ────────────────────
//  A field of upright envelopes would be a wall of opaque objects at a camera
//  that looks down at 46.4°. So a balloon is authored in one of four stages —
//  BAGGED, SPILLED, COLD, STANDING — held at roughly 5:4:3:2, and the ratio
//  walks forward across the match. Stages one to three are LOW: they read as
//  enormous coloured shapes lying ON the ground, which is what an overhead
//  camera actually wants, and the standing ones are punctuation. The world
//  stands up as the child grows, which no other world in this game does.
//
//  ── COLOUR: THE INVERSION ───────────────────────────────────────────────
//  Every other world carries its identity in the ground. This one drains its
//  ground on purpose — wet green-grey grass, grey-lilac concrete — so the ONLY
//  saturated colour in the frame is the ninety objects the child is here to
//  eat. And nothing here uses a neutral grey in shadow: dawn shadows are
//  SKY-coloured, which is alpine.ts's blue-shadow rule discovered at the other
//  end of the day.
// ══════════════════════════════════════════════════════════════════════════
import * as THREE from 'three';
import { part, mergedProp, PROP_GLOW_MAT } from './island';

// ── the palette ────────────────────────────────────────────────────────────
// The field's own colours are cold and drained. Nothing in this block is
// saturated; everything saturated lives in ENVELOPE below.
const GRASS_D = 0x5d6b55;      // wet grass in shadow — green-grey, never grey
const CONCRETE = 0xa9a6b4;     // grey-lilac, dew still on it
const CONCRETE_D = 0x8e8b98;   // the shaded face of anything on concrete
const TARMAC = 0x6f6c68;       // the old perimeter track, darker and cracked
const CHALK = 0xe8e6e0;        // painted markings
const WICKER = 0xc9a267;       // basket cane
const WICKER_D = 0x8f6f42;     // its shadowed weave and the leather corners
const STEEL = 0xb4b8c4;        // burner frames, fan cages, poles
const STEEL_D = 0x6e7482;      // and their shadow side — cool, not grey
const RUST = 0x8a5a3c;
const CANVAS_W = 0xdcdbd4;     // the met hut, the caravan, the sock
const SKIRT_D = 0x2c3350;      // THE SKIRT AND CROWN RING — periwinkle-black.
                               // Deliberately not 0x000000: a true black hole
                               // in a dawn frame reads as a rendering fault,
                               // and this world's darks are all sky-coloured.

/** THE ENVELOPE COLOURS — and these are the only saturated things in the
 *  world. Three per balloon, no more, because at phone resolution a
 *  twelve-colour envelope averages to grey. Each triple is [gore A, gore B,
 *  gore C] and they alternate round the crown. */
export const ENVELOPE: [number, number, number][] = [
  [0xe4443a, 0xf5b731, 0xf2ede4],   // red / gold / white — the classic
  [0x2f6fd0, 0x63c6f0, 0xf2ede4],   // two blues and white
  [0x2e9e5b, 0xf5b731, 0xf2ede4],   // green / gold / white
  [0xd8425f, 0xf2ede4, 0x7a3fb0],   // rose / white / violet
  [0xf06a25, 0xf5c542, 0x2c3350],   // orange / yellow / dark
  [0x7a3fb0, 0xf2ede4, 0x63c6f0],   // violet / white / sky
  [0xf5b731, 0x2e9e5b, 0xe4443a],   // gold / green / red
  [0x1d4f9e, 0xf2ede4, 0xf5b731],   // deep blue / white / gold
];

// primitives, in alpine.ts's own idiom
const sph = () => new THREE.SphereGeometry(0.5, 10, 8);
const cyl = (rt = 0.5, rb = 0.5, seg = 10) => new THREE.CylinderGeometry(rt, rb, 1, seg);
const box = () => new THREE.BoxGeometry(1, 1, 1);
const cone = (seg = 8) => new THREE.ConeGeometry(0.5, 1, seg);
const torus = (tube = 0.12, seg = 12) => new THREE.TorusGeometry(0.5, tube, 6, seg);

/** A gore-striped dome, built as N vertical wedges radiating from the crown.
 *  This is the one function the whole world's overhead read rests on: the
 *  wedges ARE the pinwheel, and they must reach y = h (the crown) or the disc
 *  is a flat coin from the play camera. */
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

// ── BAGGED — a fridge-sized roll of fabric on the grass, strapped. The lowest
//    stage, and the one that says "this has not started yet". From above: a
//    small bright oblong with two dark straps across it.
export function skBalloonBagged(cols: [number, number, number] = ENVELOPE[0]): THREE.Object3D {
  return mergedProp([
    part(cyl(0.5, 0.5, 10), cols[0], 0, 0.55, 0, 0, 0, Math.PI / 2, 1.1, 2.4, 1.1),
    part(cyl(0.5, 0.5, 10), cols[1], 0.75, 0.55, 0, 0, 0, Math.PI / 2, 1.05, 0.5, 1.05),
    part(box(), SKIRT_D, 0.35, 0.55, 0, 0, 0, 0, 0.14, 1.18, 1.18),
    part(box(), SKIRT_D, -0.45, 0.55, 0, 0, 0, 0, 0.14, 1.18, 1.18),
    part(box(), WICKER_D, 0, 0.06, 0, 0, 0, 0, 2.5, 0.12, 1.2),
  ]);
}

// ── SPILLED — a long flat gore-striped crescent laid out on the grass, two to
//    three times longer than wide. THIS IS THE ONE THE POSTER SELLS: from
//    directly overhead it is spilled paint, and it is the stage that makes a
//    field of balloons read as a composition instead of a car park.
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
  // the mouth end, gathered, and the crown end with its dark ring lying flat
  // the gathered mouth: a cylinder on its side, so its RADIUS is its vertical
  // half-height. At y=0.22 with a 0.75 radius the mouth sat 0.53 UNDER the
  // grass — invisible in a screenshot and 2,477 'sunk' rows in the audit.
  p.push(part(cyl(0.5, 0.5, 10), SKIRT_D, -L * 0.5 - 0.2, 0.78, 0, Math.PI / 2, 0, 0, 1.5, 0.34, 1.5));
  p.push(part(torus(0.10, 12), SKIRT_D, L * 0.5 + 0.1, 0.20, 1.0, Math.PI / 2, 0, 0, 1.5, 1.5, 1.5));
  return mergedProp(p);
}

// ── COLD — a fat lying sausage, half-inflated, propped off the ground along
//    its length with a fan at its mouth. Mid height. The stage where the shape
//    has arrived but the balloon has not stood up.
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

// ── STANDING — the full envelope, upright, and the only tall thing on the
//    field. ONE MESH, ONE RADIUS. All four crown rules: gores to the crown, a
//    dark crown ring, a dark skirt lifted clear of the basket, three colours.
//    ~14 units tall, which is under every building the game already ships
//    (maple #0 is 19.4, pirate #2737 is 23.4) and well inside what
//    fadeOccluders already handles.
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
  // the basket, and the four tiny people are the crowd's job, not the prop's
  p.push(part(box(), WICKER, 0, 0.62, 0, 0, 0, 0, 1.55, 1.25, 1.35));
  p.push(part(box(), WICKER_D, 0, 1.22, 0, 0, 0, 0, 1.62, 0.14, 1.42));
  p.push(part(box(), WICKER_D, 0, 0.10, 0, 0, 0, 0, 1.62, 0.16, 1.42));
  return mergedProp(p);
}

// ── THE WHALE, G-WAIL ──────────────────────────────────────────────────────
// The hero prop and the biggest single object in the game. Cobalt, white
// belly, and one small absurd entirely convincing eye — the eye is the whole
// character and it gets the parts it needs.

/** LYING — a colossal crescent of fabric spilled across the launch circle,
 *  70 3D units nose to tail, flukes flat on the concrete. For the first half
 *  of the match the child can walk her whole length before they are big enough
 *  to eat any of her. From directly overhead at dawn on grey concrete this is
 *  the most striking image this game has produced. */
export function skWhaleLying(): THREE.Object3D {
  const p: THREE.BufferGeometry[] = [];
  const BLUE = 0x2c62b8, BELLY = 0xe9eef5, BLUE_D = 0x1d4384;
  const L = 70;
  for (let i = 0; i < 26; i++) {
    const t = i / 25;
    const x = -L * 0.5 + t * L;
    const z = Math.sin(t * Math.PI * 0.9) * 4.2;
    // fat at the head, tapering to the tail stock
    const wide = 2.0 + Math.sin(Math.min(1, t * 1.35) * Math.PI) * 7.4;
    const col = t > 0.30 && t < 0.86 && i % 3 === 0 ? BELLY : BLUE;
    p.push(part(cyl(0.5, 0.5, 10), col, x, 0.30 + wide * 0.5, z, 0, 0, Math.PI / 2, wide, L / 26 + 0.3, wide * 0.55));
  }
  // the tail flukes, flat on the ground
  p.push(part(box(), BLUE_D, L * 0.5 + 1.6, 0.22, 5.6, 0, 0.5, 0, 7.5, 0.35, 3.2));
  p.push(part(box(), BLUE_D, L * 0.5 + 1.6, 0.22, 1.4, 0, -0.5, 0, 7.5, 0.35, 3.2));
  // one pectoral fin, spread
  p.push(part(box(), BLUE_D, -L * 0.24, 0.24, 7.4, 0, 0.35, 0, 6.0, 0.32, 2.6));
  // THE EYE — and it is the reason a child says "there was a WHALE"
  p.push(part(sph(), 0xf7f7f2, -L * 0.42, 3.6, 4.1, 0, 0, 0, 2.1, 2.1, 1.0));
  p.push(part(sph(), 0x121826, -L * 0.42 - 0.35, 3.7, 4.5, 0, 0, 0, 1.15, 1.15, 0.7));
  p.push(part(sph(), 0xffffff, -L * 0.42 - 0.6, 4.05, 4.7, 0, 0, 0, 0.4, 0.4, 0.3));
  // the mouth line, a long dark seam
  p.push(part(box(), BLUE_D, -L * 0.36, 1.10, 0, 0, 0.06, 0, 13.0, 0.22, 8.4));
  return mergedProp(p);
}

/** STANDING — she cold-inflates and stands at beat 3. A blue dome with a white
 *  belly and the eye, and she is the last thing eaten: the child who gets her
 *  gets her in the two seconds after her basket leaves the ground. */
export function skWhaleStanding(): THREE.Object3D {
  const BLUE = 0x2c62b8, BELLY = 0xe9eef5, BLUE_D = 0x1d4384;
  const R = 9.5, H = 17.5;
  const p = goreDome([BLUE, BLUE, BELLY], R, H, 14);
  p.push(part(cyl(0.5, 0.5, 12), SKIRT_D, 0, H - 0.2, 0, 0, 0, 0, 2.4, 0.6, 2.4));
  p.push(part(cyl(3.9, 2.6, 14), SKIRT_D, 0, 4.4, 0, 0, 0, 0, 1, 2.2, 1));
  // the flukes, now hanging behind her
  p.push(part(box(), BLUE_D, -8.6, 7.0, 3.0, 0, 0.5, 0, 8.0, 0.4, 3.4));
  p.push(part(box(), BLUE_D, -8.6, 7.0, -3.0, 0, -0.5, 0, 8.0, 0.4, 3.4));
  // THE EYE, and it must survive the shrink to a card thumbnail
  p.push(part(sph(), 0xf7f7f2, 7.4, 10.6, 3.6, 0, 0, 0, 3.4, 3.4, 2.0));
  p.push(part(sph(), 0x121826, 8.1, 10.7, 4.2, 0, 0, 0, 1.9, 1.9, 1.3));
  p.push(part(sph(), 0xffffff, 8.3, 11.3, 4.5, 0, 0, 0, 0.7, 0.7, 0.5));
  // basket and frame
  p.push(part(box(), WICKER, 0, 1.0, 0, 0, 0, 0, 2.6, 2.0, 2.3));
  p.push(part(box(), WICKER_D, 0, 2.0, 0, 0, 0, 0, 2.7, 0.2, 2.4));
  p.push(part(box(), STEEL_D, 0, 4.2, 0, 0, 0, 0, 2.4, 0.16, 2.2));
  return mergedProp(p);
}

// ── THE CREW KIT ───────────────────────────────────────────────────────────
// Everything a balloon crew touches, and every one of these is an errand
// DESTINATION for the crowd: a crew's whole morning is carrying something from
// a named A to a named B and then standing still with their hands busy, which
// is exactly the shape life.ts's errand opt-in rewards.

/** A wicker basket — the classic rounded rectangle with padded leather corners
 *  and two cylinders inside. Four adults can just carry it, which is the
 *  longest and most legible walk in the game. */
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

/** The stainless frame that sits over a basket, with the burner coil and pilot.
 *  The pilot is on the glow material — it is the only warm point light on the
 *  field at dawn apart from the vans, and a neon thing is neon because it
 *  ignores the lighting. */
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

/** The burner's pilot flame. Separate and on PROP_GLOW_MAT, because the flame
 *  must not be shaded by a sun that has not risen. */
export function skPilotFlame(): THREE.Object3D {
  return mergedProp([
    part(cone(6), 0xffb347, 0, 0.22, 0, Math.PI, 0, 0, 0.30, 0.55, 0.30),
    part(cone(6), 0xfff0b0, 0, 0.14, 0, Math.PI, 0, 0, 0.16, 0.30, 0.16),
  ], PROP_GLOW_MAT);
}

/** A petrol inflator fan in a round cage — the loudest thing on the field, and
 *  the destination of the shortest errand in the world. */
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

/** Two propane cylinders standing together, strapped. */
export function skCylinderPair(): THREE.Object3D {
  return mergedProp([
    part(cyl(0.5, 0.5, 10), 0xd8443a, 0.22, 0.52, 0, 0, 0, 0, 0.44, 1.05, 0.44),
    part(cyl(0.5, 0.5, 10), 0xd8443a, -0.22, 0.52, 0, 0, 0, 0, 0.44, 1.05, 0.44),
    part(cyl(0.5, 0.5, 8), STEEL, 0.22, 1.10, 0, 0, 0, 0, 0.18, 0.18, 0.18),
    part(cyl(0.5, 0.5, 8), STEEL, -0.22, 1.10, 0, 0, 0, 0, 0.18, 0.18, 0.18),
    part(box(), SKIRT_D, 0, 0.72, 0, 0, 0, 0, 0.96, 0.14, 0.50),
  ]);
}

/** A coil of crown line and its stake — the far end of a thirty-metre walk
 *  that ends with somebody standing still, facing back. A perfect journey. */
export function skCrownLine(): THREE.Object3D {
  return mergedProp([
    part(torus(0.09, 12), 0xe8e2d0, 0, 0.12, 0, Math.PI / 2, 0, 0, 0.85, 0.85, 0.85),
    part(torus(0.08, 12), 0xd6cfb8, 0.05, 0.24, 0.05, Math.PI / 2, 0, 0, 0.70, 0.70, 0.70),
    part(cyl(0.06, 0.06, 6), STEEL_D, 0.55, 0.30, 0, 0, 0, 0.2, 1, 0.6, 1),
  ]);
}

/** An open trailer with a roof rack, tailgate down, an envelope bag half out.
 *  The arrivals field is a row of these, nose-in. */
export function skTrailer(): THREE.Object3D {
  return mergedProp([
    part(box(), 0x9aa0ad, 0, 0.62, 0, 0, 0, 0, 3.4, 0.34, 1.8),
    part(box(), 0x6e7482, 0, 0.86, 0.85, 0, 0, 0, 3.3, 0.55, 0.14),
    part(box(), 0x6e7482, 0, 0.86, -0.85, 0, 0, 0, 3.3, 0.55, 0.14),
    part(box(), 0x6e7482, -1.65, 0.86, 0, 0, 0, 0, 0.14, 0.55, 1.7),
    part(box(), 0x8f6f42, 1.85, 0.24, 0, 0, 0, -0.35, 1.0, 0.14, 1.7),
    part(cyl(0.5, 0.5, 10), SKIRT_D, 0.6, 0.34, 0.92, 0, 0, Math.PI / 2, 0.68, 0.22, 0.68),
    part(cyl(0.5, 0.5, 10), SKIRT_D, 0.6, 0.34, -0.92, 0, 0, Math.PI / 2, 0.68, 0.22, 0.68),
    part(cyl(0.5, 0.5, 10), 0xe4443a, 1.0, 0.92, 0, 0, 0, Math.PI / 2, 0.85, 1.5, 0.85),
    part(cyl(0.06, 0.06, 6), STEEL_D, -2.0, 0.5, 0, 0, 0, 1.35, 1, 1.1, 1),
  ]);
}

/** A screw tether pin with a loop of line — the launch circle is ringed with
 *  them, and pulling them is what starts the finale. */
export function skTetherPin(): THREE.Object3D {
  return mergedProp([
    part(cyl(0.5, 0.5, 8), STEEL_D, 0, 0.18, 0, 0, 0, 0, 0.16, 0.38, 0.16),
    part(torus(0.06, 10), STEEL, 0, 0.40, 0, 0, 0, 0, 0.30, 0.30, 0.30),
    part(box(), 0xf5b731, 0, 0.05, 0, 0, 0, 0, 0.55, 0.08, 0.55),
  ]);
}

// ── THE TOWER DISTRICT ─────────────────────────────────────────────────────

/** The preserved control tower, CHECKERBOARD-painted by volunteers every
 *  spring. The checkerboard is the point: it is the one high-frequency pattern
 *  allowed in this world, and from directly overhead it is the only object on
 *  the field that reads instantly as man-made and cared for. Mr Pym broadcasts
 *  from the balcony and does not come down. */
export function skControlTower(): THREE.Object3D {
  const p: THREE.BufferGeometry[] = [];
  const W = 2.6, H = 6.2;
  p.push(part(box(), CANVAS_W, 0, H * 0.5, 0, 0, 0, 0, W, H, W));
  // the checkerboard, four courses of alternating squares round the shaft
  for (let ring = 0; ring < 4; ring++) {
    const y = 0.8 + ring * 1.15;
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const col = (ring + i) % 2 ? 0xd83a34 : CANVAS_W;
      p.push(part(box(), col, Math.cos(a) * (W * 0.5 + 0.02), y, Math.sin(a) * (W * 0.5 + 0.02),
        0, -a, 0, 0.10, 1.0, W * 0.52));
    }
  }
  // the cab: glazed, oversailing, with a dark eave line under it so it does not
  // merge with the shaft from above — the same trick alpine.ts uses on a roof
  p.push(part(box(), 0x2b3550, 0, H + 0.75, 0, 0, 0, 0, W + 1.3, 1.5, W + 1.3));
  p.push(part(box(), 0x9fc4e8, 0, H + 0.95, 0, 0, 0, 0, W + 1.16, 0.95, W + 1.16));
  p.push(part(box(), SKIRT_D, 0, H + 1.58, 0, 0, 0, 0, W + 1.7, 0.22, W + 1.7));
  p.push(part(box(), 0x8e8b98, 0, H + 1.78, 0, 0, 0, 0, W + 1.5, 0.20, W + 1.5));
  // the balcony rail and the external stair
  p.push(part(box(), STEEL, 0, H + 0.15, 0, 0, 0, 0, W + 2.0, 0.12, W + 2.0));
  for (let i = 0; i < 7; i++) {
    p.push(part(box(), STEEL_D, W * 0.5 + 0.55, 0.5 + i * 0.85, 0, 0, 0, 0, 0.9, 0.10, 0.7));
  }
  return mergedProp(p);
}

/** A louvred instrument hut on legs, white — the met station whose excellent
 *  instruments answer the wrong question with total confidence. */
export function skMetHut(): THREE.Object3D {
  const p = [
    part(box(), CANVAS_W, 0, 1.05, 0, 0, 0, 0, 0.95, 0.85, 0.85),
    part(box(), SKIRT_D, 0, 1.52, 0, 0, 0, 0, 1.10, 0.14, 1.00),
  ];
  for (let i = 0; i < 4; i++) {
    p.push(part(box(), 0xc8c6bd, 0.49, 0.78 + i * 0.20, 0, 0, 0, 0.18, 0.05, 0.14, 0.82));
  }
  for (const [dx, dz] of [[0.34, 0.30], [-0.34, 0.30], [0.34, -0.30], [-0.34, -0.30]]) {
    p.push(part(cyl(0.5, 0.5, 6), 0x8f8b80, dx, 0.32, dz, 0, 0, 0, 0.10, 0.64, 0.10));
  }
  return mergedProp(p);
}

/** An old touring caravan with its awning out and a whiteboard — the briefing
 *  room, and the only place on the field with a kettle. */
export function skBriefingCaravan(): THREE.Object3D {
  return mergedProp([
    part(box(), CANVAS_W, 0, 1.05, 0, 0, 0, 0, 3.2, 1.35, 1.7),
    part(box(), 0x9fb6c8, 0, 1.78, 0, 0, 0, 0, 3.0, 0.30, 1.6),
    part(box(), SKIRT_D, 0, 1.95, 0, 0, 0, 0, 3.3, 0.14, 1.85),
    part(box(), 0x2b3550, 0.9, 1.15, 0.86, 0, 0, 0, 0.85, 0.55, 0.06),
    part(box(), 0x2b3550, -0.7, 1.15, 0.86, 0, 0, 0, 0.55, 0.55, 0.06),
    part(box(), 0xf5b731, 0, 2.10, 1.15, 0, 0, -0.22, 2.4, 0.06, 1.5),
    part(cyl(0.06, 0.06, 6), STEEL, 1.15, 1.05, 1.85, 0, 0, 0, 1, 2.1, 1),
    part(cyl(0.06, 0.06, 6), STEEL, -1.15, 1.05, 1.85, 0, 0, 0, 1, 2.1, 1),
    part(box(), CHALK, -1.75, 1.20, 0, 0, 0, 0, 0.08, 0.90, 1.20),
    part(cyl(0.5, 0.5, 10), SKIRT_D, 0.85, 0.34, 0.88, 0, 0, Math.PI / 2, 0.66, 0.22, 0.66),
    part(cyl(0.5, 0.5, 10), SKIRT_D, 0.85, 0.34, -0.88, 0, 0, Math.PI / 2, 0.66, 0.22, 0.66),
  ]);
}

/** A flagpole with a limp flag, and a windsock hanging straight down. BOTH ARE
 *  CHARACTERS, not dressing: the air is dead calm, which is the entire reason a
 *  balloon meet happens at dawn, and these two are how the field says so
 *  without a word. */
export function skFlagpole(): THREE.Object3D {
  return mergedProp([
    part(cyl(0.05, 0.06, 6), CANVAS_W, 0, 2.2, 0, 0, 0, 0, 1, 4.4, 1),
    part(box(), 0x8f8b80, 0, 0.10, 0, 0, 0, 0, 0.55, 0.20, 0.55),
    part(box(), 0xd8443a, 0.10, 3.55, 0, 0, 0, 0.06, 0.16, 1.05, 0.55),
  ]);
}

export function skWindsock(): THREE.Object3D {
  return mergedProp([
    part(cyl(0.05, 0.06, 6), STEEL_D, 0, 2.0, 0, 0, 0, 0, 1, 4.0, 1),
    part(box(), 0x8f8b80, 0, 0.10, 0, 0, 0, 0, 0.5, 0.20, 0.5),
    part(torus(0.05, 10), STEEL, 0.32, 3.85, 0, 0, 0, Math.PI / 2, 0.55, 0.55, 0.55),
    part(cyl(0.30, 0.14, 8), 0xf06a25, 0.32, 3.25, 0, 0, 0, 0, 1, 1.25, 1),
    part(cyl(0.16, 0.10, 8), CANVAS_W, 0.32, 2.55, 0, 0, 0, 0, 1, 0.55, 1),
  ]);
}

/** A small vintage fire tender that has never been used, immaculate. */
export function skFireTender(): THREE.Object3D {
  return mergedProp([
    part(box(), 0xb42a24, 0, 0.78, 0, 0, 0, 0, 3.0, 0.85, 1.5),
    part(box(), 0x8e1f1b, 0.75, 1.45, 0, 0, 0, 0, 1.3, 0.75, 1.4),
    part(box(), 0x9fc4e8, 1.25, 1.50, 0, 0, 0, 0, 0.35, 0.50, 1.25),
    part(cyl(0.5, 0.5, 10), 0xe8e2d0, -0.9, 1.35, 0, 0, 0, Math.PI / 2, 0.55, 1.1, 0.55),
    part(box(), STEEL, -0.2, 1.30, 0, 0, 0, 0, 1.4, 0.14, 1.3),
    part(cyl(0.5, 0.5, 10), SKIRT_D, 0.95, 0.36, 0.80, 0, 0, Math.PI / 2, 0.70, 0.24, 0.70),
    part(cyl(0.5, 0.5, 10), SKIRT_D, 0.95, 0.36, -0.80, 0, 0, Math.PI / 2, 0.70, 0.24, 0.70),
    part(cyl(0.5, 0.5, 10), SKIRT_D, -0.95, 0.36, 0.80, 0, 0, Math.PI / 2, 0.70, 0.24, 0.70),
    part(cyl(0.5, 0.5, 10), SKIRT_D, -0.95, 0.36, -0.80, 0, 0, Math.PI / 2, 0.70, 0.24, 0.70),
  ]);
}

// ── THE AIRFIELD ITSELF ────────────────────────────────────────────────────
// The things that make concrete read as an airfield from directly overhead.
// Every one of these is LOW and FLAT on purpose: the runways are the level's
// one sightline and furniture in them is furniture in the way.

/** The big painted designator at a runway end. THESE ARE THE BIGGEST NUMERALS
 *  IN THE WORLD and they are read from directly above, so they are the single
 *  clearest statement of what this place is. Seven-segment digits in chalk on
 *  concrete, lying flat. */
const SEG: Record<string, number[]> = {
  //      top, tl, tr, mid, bl, br, bot
  '0': [1, 1, 1, 0, 1, 1, 1], '1': [0, 0, 1, 0, 0, 1, 0], '2': [1, 0, 1, 1, 1, 0, 1],
  '3': [1, 0, 1, 1, 0, 1, 1], '4': [0, 1, 1, 1, 0, 1, 0], '5': [1, 1, 0, 1, 0, 1, 1],
  '6': [1, 1, 0, 1, 1, 1, 1], '7': [1, 0, 1, 0, 0, 1, 0], '8': [1, 1, 1, 1, 1, 1, 1],
  '9': [1, 1, 1, 1, 0, 1, 1],
};
function digit(d: string, ox: number, s: number): THREE.BufferGeometry[] {
  const on = SEG[d] ?? SEG['0'];
  const t = 0.22 * s, L = 1.5 * s;
  const g: THREE.BufferGeometry[] = [];
  const bar = (x: number, z: number, w: number, h: number) =>
    g.push(part(box(), CHALK, ox + x, 0.03, z, 0, 0, 0, w, 0.06, h));
  if (on[0]) bar(0, -L, L, t);
  if (on[1]) bar(-L * 0.5, -L * 0.5, t, L);
  if (on[2]) bar(L * 0.5, -L * 0.5, t, L);
  if (on[3]) bar(0, 0, L, t);
  if (on[4]) bar(-L * 0.5, L * 0.5, t, L);
  if (on[5]) bar(L * 0.5, L * 0.5, t, L);
  if (on[6]) bar(0, L, L, t);
  return g;
}
export function skThresholdNumerals(text = '03', s = 2.2): THREE.Object3D {
  const g: THREE.BufferGeometry[] = [];
  const chars = text.split('');
  chars.forEach((c, i) => g.push(...digit(c, (i - (chars.length - 1) * 0.5) * 2.1 * s, s)));
  return mergedProp(g);
}

/** One painted dash of the runway centreline. */
export function skCentrelineDash(): THREE.Object3D {
  return mergedProp([part(box(), CHALK, 0, 0.03, 0, 0, 0, 0, 3.0, 0.06, 0.45)]);
}

/** A low blue runway edge light, still on from the night. On the glow material:
 *  it is unlit by design, and at dawn these are the only cool points in a frame
 *  whose one warm accent is a burner. */
export function skRunwayEdgeLight(): THREE.Object3D {
  return mergedProp([
    part(cyl(0.5, 0.5, 8), 0x3aa0ff, 0, 0.16, 0, 0, 0, 0, 0.24, 0.30, 0.24),
    part(sph(), 0x9fd8ff, 0, 0.30, 0, 0, 0, 0, 0.26, 0.20, 0.26),
  ], PROP_GLOW_MAT);
}

/** A segment of the painted white launch ring. */
export function skLaunchCircleMarker(): THREE.Object3D {
  return mergedProp([part(box(), CHALK, 0, 0.03, 0, 0, 0, 0, 2.4, 0.06, 0.55)]);
}

/** A small yellow-on-black airfield sign on short legs. */
export function skTaxiwaySign(): THREE.Object3D {
  return mergedProp([
    part(box(), 0xf5b731, 0, 0.55, 0, 0, 0, 0, 1.30, 0.50, 0.10),
    part(box(), 0x1b1b1b, 0, 0.55, -0.06, 0, 0, 0, 1.10, 0.34, 0.06),
    part(cyl(0.05, 0.05, 6), STEEL_D, 0.42, 0.24, 0, 0, 0, 0, 1, 0.48, 1),
    part(cyl(0.05, 0.05, 6), STEEL_D, -0.42, 0.24, 0, 0, 0, 0, 1, 0.48, 1),
  ]);
}

/** A marshal's cone and a numbered post on the perimeter track. */
export function skPerimeterCone(): THREE.Object3D {
  return mergedProp([
    part(cone(8), 0xf06a25, 0, 0.38, 0, 0, 0, 0, 0.52, 0.76, 0.52),
    part(box(), CHALK, 0, 0.44, 0, 0, 0, 0, 0.34, 0.12, 0.34),
    part(box(), 0xd85a1c, 0, 0.05, 0, 0, 0, 0, 0.70, 0.10, 0.70),
  ]);
}
export function skMarshalPost(): THREE.Object3D {
  return mergedProp([
    part(cyl(0.06, 0.06, 6), CANVAS_W, 0, 0.75, 0, 0, 0, 0, 1, 1.5, 1),
    part(box(), 0xf5b731, 0, 1.42, 0, 0, 0, 0, 0.34, 0.30, 0.08),
    part(box(), 0x8f8b80, 0, 0.06, 0, 0, 0, 0, 0.38, 0.12, 0.38),
  ]);
}

// ── THE HANGARS AND THE SUNDAY FLEA MARKET ────────────────────────────────

/** A curved-roof shed with its door half-slid open. THE ROOF IS WHAT THE
 *  CAMERA SEES, so the curve gets real ribs and a dark eave line where it meets
 *  the wall — alpine.ts's lesson applied to a curve instead of a snow cap. A
 *  hangar that reads as a plain grey lozenge from above is not finished. */
export function skHangar(): THREE.Object3D {
  const p: THREE.BufferGeometry[] = [];
  const W = 7.0, D = 9.0, H = 2.4;
  p.push(part(box(), 0x9c988e, 0, H * 0.5, 0, 0, 0, 0, W, H, D));
  // the barrel roof as eight ribbed courses, so from above it is a set of arcs
  for (let i = 0; i < 8; i++) {
    const t = (i + 0.5) / 8;
    const a = t * Math.PI;
    const x = Math.cos(a) * W * 0.5, y = H + Math.sin(a) * 2.5;
    p.push(part(box(), i % 2 ? 0xb0aca1 : 0xa19d93, x, y, 0, 0, 0, -a + Math.PI / 2, 1.05, 0.34, D + 0.4));
  }
  // THE EAVE LINE — dark, both sides, where roof meets wall
  p.push(part(box(), SKIRT_D, W * 0.5, H + 0.06, 0, 0, 0, 0, 0.30, 0.22, D + 0.5));
  p.push(part(box(), SKIRT_D, -W * 0.5, H + 0.06, 0, 0, 0, 0, 0.30, 0.22, D + 0.5));
  // the half-open door, and the dark inside it
  p.push(part(box(), 0x2b2f38, 0, H * 0.55, D * 0.5 + 0.02, 0, 0, 0, W * 0.55, H * 0.95, 0.10));
  p.push(part(box(), 0x7e7a72, W * 0.30, H * 0.5, D * 0.5 + 0.08, 0, 0, 0, W * 0.42, H, 0.12));
  return mergedProp(p);
}

/** A flea-market trestle with jumble on it. */
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

/** A board of rosettes from thirty previous meets. */
export function skRosetteWall(): THREE.Object3D {
  const p = [
    part(box(), 0x8f6f42, 0, 0.95, 0, 0, 0, 0, 1.8, 1.3, 0.10),
    part(cyl(0.05, 0.06, 6), 0x7a5c36, 0.75, 0.15, 0, 0, 0, 0, 1, 0.32, 1),
    part(cyl(0.05, 0.06, 6), 0x7a5c36, -0.75, 0.15, 0, 0, 0, 0, 1, 0.32, 1),
  ];
  const cols = [0xd8443a, 0x2f6fd0, 0xf5b731, 0x2e9e5b, 0x7a3fb0];
  for (let i = 0; i < 9; i++) {
    p.push(part(cyl(0.5, 0.5, 8), cols[i % 5], -0.65 + (i % 3) * 0.65, 1.35 - Math.floor(i / 3) * 0.42, 0.08, Math.PI / 2, 0, 0, 0.26, 0.06, 0.26));
  }
  return mergedProp(p);
}

/** The model aircraft club's table, three little models on stands. */
export function skModelPlaneStand(): THREE.Object3D {
  const p = [
    part(box(), 0xc8b98a, 0, 0.72, 0, 0, 0, 0, 1.9, 0.10, 0.7),
    part(box(), 0x8f6f42, 0.80, 0.36, 0, 0, 0, 0, 0.10, 0.72, 0.60),
    part(box(), 0x8f6f42, -0.80, 0.36, 0, 0, 0, 0, 0.10, 0.72, 0.60),
  ];
  const cols = [0xe4443a, 0xf2ede4, 0x2f6fd0];
  for (let i = 0; i < 3; i++) {
    const x = -0.6 + i * 0.6;
    p.push(part(cyl(0.04, 0.04, 6), STEEL_D, x, 0.86, 0, 0, 0, 0, 1, 0.28, 1));
    p.push(part(box(), cols[i], x, 1.04, 0, 0, i * 0.5, 0, 0.62, 0.09, 0.10));
    p.push(part(box(), cols[i], x, 1.04, 0, 0, i * 0.5, 0, 0.12, 0.08, 0.52));
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

/** One of the vintage tractor line-up. */
export function skVintageTractor(): THREE.Object3D {
  return mergedProp([
    part(box(), 0x2e9e5b, 0, 0.85, 0, 0, 0, 0, 1.9, 0.65, 1.0),
    part(box(), 0x257f49, -0.55, 1.35, 0, 0, 0, 0, 0.75, 0.55, 0.85),
    part(cyl(0.5, 0.5, 6), 0x1b1b1b, -0.30, 1.85, 0, 0, 0, 0, 0.14, 0.55, 0.14),
    part(cyl(0.5, 0.5, 12), SKIRT_D, -0.75, 0.72, 0.72, 0, 0, Math.PI / 2, 1.42, 0.30, 1.42),
    part(cyl(0.5, 0.5, 12), SKIRT_D, -0.75, 0.72, -0.72, 0, 0, Math.PI / 2, 1.42, 0.30, 1.42),
    part(cyl(0.5, 0.5, 10), SKIRT_D, 0.85, 0.42, 0.60, 0, 0, Math.PI / 2, 0.82, 0.26, 0.82),
    part(cyl(0.5, 0.5, 10), SKIRT_D, 0.85, 0.42, -0.60, 0, 0, Math.PI / 2, 0.82, 0.26, 0.82),
    part(box(), 0x8f6f42, -0.55, 1.10, 0, 0, 0, 0, 0.42, 0.14, 0.55),
  ]);
}

// ── BREAKFAST ROW ──────────────────────────────────────────────────────────
// The food vans along the old taxiway spur, and the single most-visited place
// in the world because every errand ends here. THESE ARE THE WARMEST-LIT
// OBJECTS ON THE FIELD: their hatches and interiors are the only warm light in
// the frame apart from the burners, which at dawn is what a queue is drawn to.

/** A snub-nosed catering van with its hatch up, a lit interior and a menu
 *  board. Takes a colourway so the row is not a row of one van. */
export function skBaconVan(body = 0xe8e2d0, trim = 0xd8443a): THREE.Object3D {
  return mergedProp([
    part(box(), body, 0, 1.20, 0, 0, 0, 0, 3.6, 1.70, 1.9),
    part(box(), trim, 0, 0.55, 0, 0, 0, 0, 3.64, 0.40, 1.94),
    part(box(), body, 1.95, 0.95, 0, 0, 0, 0, 0.60, 1.10, 1.75),
    part(box(), 0x2b3550, 2.22, 1.25, 0, 0, 0, 0, 0.12, 0.55, 1.55),
    // the serving hatch, open, with the warm inside behind it
    part(box(), 0xffd9a0, -0.20, 1.30, 0.96, 0, 0, 0, 2.2, 1.00, 0.08),
    part(box(), body, -0.20, 2.12, 1.35, 0, 0, -0.45, 2.3, 0.10, 1.05),
    part(box(), 0x2b2f38, -0.20, 1.30, 1.02, 0, 0, 0, 2.0, 0.85, 0.05),
    // menu board and counter clutter
    part(box(), 0x2b2f38, -1.70, 1.05, 1.15, 0, 0.3, 0, 0.08, 0.85, 0.65),
    part(cyl(0.5, 0.5, 10), SKIRT_D, 1.20, 0.36, 0.90, 0, 0, Math.PI / 2, 0.72, 0.26, 0.72),
    part(cyl(0.5, 0.5, 10), SKIRT_D, 1.20, 0.36, -0.90, 0, 0, Math.PI / 2, 0.72, 0.26, 0.72),
    part(cyl(0.5, 0.5, 10), SKIRT_D, -1.30, 0.36, 0.90, 0, 0, Math.PI / 2, 0.72, 0.26, 0.72),
    part(cyl(0.5, 0.5, 10), SKIRT_D, -1.30, 0.36, -0.90, 0, 0, Math.PI / 2, 0.72, 0.26, 0.72),
  ]);
}

/** A small towed trailer with a spiral sign. */
export function skDoughnutTrailer(): THREE.Object3D {
  return mergedProp([
    part(box(), 0xf2ede4, 0, 1.05, 0, 0, 0, 0, 2.3, 1.30, 1.5),
    part(box(), 0xd8425f, 0, 1.78, 0, 0, 0, 0, 2.4, 0.22, 1.6),
    part(box(), 0xffd9a0, 0, 1.15, 0.78, 0, 0, 0, 1.5, 0.75, 0.06),
    part(torus(0.16, 12), 0xf5b731, 0, 2.35, 0, 0, 0, 0, 1.15, 1.15, 0.35),
    part(cyl(0.06, 0.06, 6), STEEL_D, 0, 2.05, 0, 0, 0, 0, 1, 0.60, 1),
    part(cyl(0.5, 0.5, 10), SKIRT_D, 0.3, 0.32, 0.72, 0, 0, Math.PI / 2, 0.62, 0.22, 0.62),
    part(cyl(0.5, 0.5, 10), SKIRT_D, 0.3, 0.32, -0.72, 0, 0, Math.PI / 2, 0.62, 0.22, 0.62),
    part(cyl(0.05, 0.05, 6), STEEL_D, -1.45, 0.40, 0, 0, 0, 1.35, 1, 0.9, 1),
  ]);
}

/** A converted horsebox — the fashionable one, with a chalkboard. */
export function skCoffeeHorsebox(): THREE.Object3D {
  return mergedProp([
    part(box(), 0x3f6b58, 0, 1.25, 0, 0, 0, 0, 2.9, 1.60, 1.7),
    part(box(), 0xc8b98a, 0, 2.15, 0, 0, 0, -0.10, 2.6, 0.16, 1.75),
    part(box(), SKIRT_D, 0, 2.28, 0, 0, 0, 0, 3.0, 0.12, 1.85),
    part(box(), 0xffd9a0, -0.10, 1.35, 0.87, 0, 0, 0, 1.7, 0.85, 0.06),
    part(box(), 0xc8b98a, -0.10, 0.80, 1.02, 0, 0, 0, 1.8, 0.12, 0.40),
    part(box(), 0x2b2f38, 1.35, 0.95, 1.00, 0, 0.35, 0, 0.08, 0.90, 0.60),
    part(cyl(0.5, 0.5, 10), SKIRT_D, 0.85, 0.34, 0.82, 0, 0, Math.PI / 2, 0.66, 0.24, 0.66),
    part(cyl(0.5, 0.5, 10), SKIRT_D, 0.85, 0.34, -0.82, 0, 0, Math.PI / 2, 0.66, 0.24, 0.66),
    part(cyl(0.5, 0.5, 10), SKIRT_D, -0.95, 0.34, 0.82, 0, 0, Math.PI / 2, 0.66, 0.24, 0.66),
    part(cyl(0.5, 0.5, 10), SKIRT_D, -0.95, 0.34, -0.82, 0, 0, Math.PI / 2, 0.66, 0.24, 0.66),
  ]);
}

export function skStrawBale(): THREE.Object3D {
  return mergedProp([
    part(box(), 0xd9c079, 0, 0.32, 0, 0, 0, 0, 1.2, 0.64, 0.75),
    part(box(), 0xc0a75f, 0, 0.32, 0.38, 0, 0, 0, 1.15, 0.55, 0.06),
    part(box(), 0x8f8b80, 0.30, 0.33, 0, 0, 0, 0, 0.06, 0.68, 0.78),
    part(box(), 0x8f8b80, -0.30, 0.33, 0, 0, 0, 0, 0.06, 0.68, 0.78),
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

/** A wheelie bin that lost an argument with a gull at five o'clock. Comic
 *  litter — one paper bag and one chip carton, nothing more: a 4+ game does
 *  not do squalor. */
export function skWheelieBin(): THREE.Object3D {
  return mergedProp([
    part(box(), 0x3f6b58, 0, 0.62, 0, 0, 0, 0, 0.85, 1.20, 0.75),
    part(box(), 0x2f5342, 0, 1.28, -0.12, 0, 0, -0.55, 0.88, 0.12, 0.80),
    part(cyl(0.5, 0.5, 8), SKIRT_D, 0.32, 0.10, 0.34, 0, 0, Math.PI / 2, 0.22, 0.14, 0.22),
    part(cyl(0.5, 0.5, 8), SKIRT_D, -0.32, 0.10, 0.34, 0, 0, Math.PI / 2, 0.22, 0.14, 0.22),
    part(box(), 0xe8e2d0, 0.75, 0.08, 0.45, 0, 0.6, 0, 0.28, 0.14, 0.20),
    part(box(), 0xd8443a, -0.70, 0.06, -0.50, 0, -0.4, 0, 0.24, 0.10, 0.18),
  ]);
}

// ── THE ROUGH ──────────────────────────────────────────────────────────────
// The uncut grass in the three bites of the coast, and the things that dress a
// disused airfield. Three silhouettes for the grass, not one, and all of them
// LOW — the rough is the quiet the runways are read against.

export function skTussock(): THREE.Object3D {
  const p: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    p.push(part(cone(5), i % 2 ? 0x6f7d5e : GRASS_D, Math.cos(a) * 0.18, 0.28, Math.sin(a) * 0.18,
      Math.cos(a) * 0.25, 0, Math.sin(a) * 0.25, 0.20, 0.62, 0.20));
  }
  return mergedProp(p);
}

export function skWildflowerClump(): THREE.Object3D {
  const p: THREE.BufferGeometry[] = [];
  const petals = [0xf2ede4, 0xf5c542, 0xd8779e];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2, r = 0.16;
    p.push(part(cyl(0.02, 0.03, 4), 0x6f7d5e, Math.cos(a) * r, 0.22, Math.sin(a) * r, 0, 0, 0, 1, 0.45, 1));
    p.push(part(sph(), petals[i % 3], Math.cos(a) * r, 0.46, Math.sin(a) * r, 0, 0, 0, 0.16, 0.10, 0.16));
  }
  return mergedProp(p);
}

export function skThistle(): THREE.Object3D {
  return mergedProp([
    part(cyl(0.03, 0.05, 5), 0x6f7d5e, 0, 0.34, 0, 0, 0, 0, 1, 0.68, 1),
    part(sph(), 0x8f7fb8, 0, 0.72, 0, 0, 0, 0, 0.22, 0.26, 0.22),
    part(cone(6), 0x6f7d5e, 0, 0.60, 0, 0, 0, 0, 0.22, 0.20, 0.22),
    part(box(), 0x6f7d5e, 0.14, 0.30, 0, 0, 0, 0.7, 0.26, 0.05, 0.10),
  ]);
}

/** THE SKYLARK. The world is named after it, so it must be findable and it
 *  must be small — a child who spots one has found the thing the field is
 *  called. Head up, tail down, on the ground where they actually nest. */
export function skSkylark(): THREE.Object3D {
  return mergedProp([
    part(sph(), 0x9c8a6a, 0, 0.13, 0, 0, 0, 0, 0.26, 0.20, 0.18),
    part(sph(), 0x8a7a5c, -0.14, 0.20, 0, 0, 0, 0, 0.13, 0.13, 0.12),
    part(cone(5), 0xd9c079, -0.22, 0.20, 0, 0, 0, -Math.PI / 2, 0.05, 0.10, 0.05),
    part(box(), 0x7a6c50, 0.17, 0.12, 0, 0, 0, 0.35, 0.20, 0.05, 0.08),
    part(sph(), 0x2b2f38, -0.15, 0.23, 0.05, 0, 0, 0, 0.04, 0.04, 0.03),
  ]);
}

/** A hare, sitting up with its ears back. One per match, out in the rough. */
export function skHare(): THREE.Object3D {
  return mergedProp([
    part(sph(), 0xa08a68, 0, 0.26, 0, 0, 0, 0, 0.34, 0.44, 0.30),
    part(sph(), 0x9c8560, 0.06, 0.52, 0, 0, 0, 0, 0.22, 0.22, 0.20),
    part(cone(5), 0x8a7452, 0.02, 0.70, 0.06, -0.25, 0, -0.15, 0.07, 0.32, 0.07),
    part(cone(5), 0x8a7452, 0.02, 0.70, -0.06, 0.25, 0, -0.15, 0.07, 0.32, 0.07),
    part(sph(), 0xe8e2d0, -0.14, 0.16, 0, 0, 0, 0, 0.14, 0.14, 0.12),
  ]);
}

/** The fence nobody has mended: a post, and a run that leans. */
export function skFencePost(): THREE.Object3D {
  return mergedProp([
    part(cyl(0.06, 0.07, 6), 0x8f6f42, 0, 0.55, 0, 0, 0, 0.06, 1, 1.10, 1),
    part(box(), 0x7a5c36, 0, 0.95, 0, 0, 0, 0, 0.14, 0.10, 0.14),
  ]);
}
export function skFenceRun(): THREE.Object3D {
  const p: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 3; i++) {
    p.push(part(cyl(0.06, 0.07, 6), 0x8f6f42, -1.6 + i * 1.6, 0.55, 0, 0, 0, (i - 1) * 0.10, 1, 1.10, 1));
  }
  p.push(part(box(), 0x9a9a92, 0, 0.86, 0, 0, 0, 0.02, 3.4, 0.04, 0.04));
  p.push(part(box(), 0x9a9a92, 0, 0.56, 0, 0, 0, 0.03, 3.4, 0.04, 0.04));
  return mergedProp(p);
}

/** The old windsock mast, rusted and lying in the grass. */
export function skCollapsedWindsockPole(): THREE.Object3D {
  return mergedProp([
    part(cyl(0.06, 0.08, 6), RUST, 0, 0.12, 0, 0, 0, Math.PI / 2, 1, 4.2, 1),
    part(torus(0.05, 8), RUST, 2.0, 0.30, 0, 0, 0.4, Math.PI / 2, 0.5, 0.5, 0.5),
    part(box(), 0x8f8b80, -2.2, 0.08, 0, 0, 0, 0, 0.5, 0.16, 0.5),
  ]);
}

/** A sheep, grazing. An airfield's real grass cutters, and they are on the
 *  runway every year. FROM DIRECTLY OVERHEAD A SHEEP IS AN OVAL, so the head
 *  and the four dark legs are the entire read — without them this is a stone. */
export function skSheep(): THREE.Object3D {
  const p = [
    part(sph(), 0xe4e0d6, 0, 0.52, 0, 0, 0, 0, 0.92, 0.62, 0.62),
    part(sph(), 0xdad5c8, 0.28, 0.60, 0.16, 0, 0, 0, 0.42, 0.40, 0.36),
    part(sph(), 0xdad5c8, -0.30, 0.58, -0.14, 0, 0, 0, 0.40, 0.38, 0.34),
    part(sph(), 0x3a3a34, 0.50, 0.34, 0, 0, 0, 0, 0.26, 0.28, 0.22),
    part(sph(), 0x2b2b26, 0.62, 0.24, 0, 0, 0, 0, 0.16, 0.14, 0.14),
  ];
  for (const [dx, dz] of [[0.28, 0.20], [-0.28, 0.20], [0.28, -0.20], [-0.28, -0.20]]) {
    p.push(part(cyl(0.5, 0.5, 5), 0x3a3a34, dx, 0.13, dz, 0, 0, 0, 0.09, 0.28, 0.09));
  }
  return mergedProp(p);
}

/** A spectator car parked on the grass verge, seen from above: roof, screen,
 *  bonnet. Takes a colour so the thin band of them along the perimeter reads as
 *  cars rather than as a stripe. */
export function skSpectatorCar(body = 0x8ea3c4): THREE.Object3D {
  return mergedProp([
    part(box(), body, 0, 0.52, 0, 0, 0, 0, 3.1, 0.62, 1.45),
    part(box(), body, -0.15, 1.00, 0, 0, 0, 0, 1.55, 0.42, 1.32),
    part(box(), 0x2b3550, 0.62, 0.98, 0, 0, 0, 0.35, 0.14, 0.40, 1.24),
    part(box(), 0x2b3550, -0.95, 0.98, 0, 0, 0, -0.40, 0.14, 0.40, 1.24),
    part(box(), 0x9fb6d0, -0.15, 1.20, 0, 0, 0, 0, 1.40, 0.06, 1.20),
    part(cyl(0.5, 0.5, 10), SKIRT_D, 1.00, 0.30, 0.72, 0, 0, Math.PI / 2, 0.58, 0.22, 0.58),
    part(cyl(0.5, 0.5, 10), SKIRT_D, 1.00, 0.30, -0.72, 0, 0, Math.PI / 2, 0.58, 0.22, 0.58),
    part(cyl(0.5, 0.5, 10), SKIRT_D, -1.05, 0.30, 0.72, 0, 0, Math.PI / 2, 0.58, 0.22, 0.58),
    part(cyl(0.5, 0.5, 10), SKIRT_D, -1.05, 0.30, -0.72, 0, 0, Math.PI / 2, 0.58, 0.22, 0.58),
  ]);
}

/** A ticket caravan with one bulb on — the first thing in the arrivals field,
 *  and at 5:40 in the morning the only thing awake in it. */
export function skTicketCaravan(): THREE.Object3D {
  return mergedProp([
    part(box(), CANVAS_W, 0, 0.95, 0, 0, 0, 0, 2.4, 1.25, 1.5),
    part(box(), 0x9fb6c8, 0, 1.62, 0, 0, 0, 0, 2.3, 0.26, 1.45),
    part(box(), SKIRT_D, 0, 1.78, 0, 0, 0, 0, 2.5, 0.12, 1.65),
    part(box(), 0xffd9a0, 0.55, 1.05, 0.78, 0, 0, 0, 0.85, 0.60, 0.06),
    part(box(), 0x2b3550, -0.70, 1.00, 0.78, 0, 0, 0, 0.55, 0.70, 0.06),
    part(cyl(0.5, 0.5, 10), SKIRT_D, 0.5, 0.30, 0.78, 0, 0, Math.PI / 2, 0.58, 0.22, 0.58),
    part(cyl(0.5, 0.5, 10), SKIRT_D, 0.5, 0.30, -0.78, 0, 0, Math.PI / 2, 0.58, 0.22, 0.58),
  ]);
}
