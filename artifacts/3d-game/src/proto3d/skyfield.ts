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
  p.push(part(cyl(0.5, 0.5, 10), SKIRT_D, -L * 0.5 - 0.2, 0.22, 0, Math.PI / 2, 0, 0, 1.5, 0.34, 1.5));
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
  p.push(part(torus(0.12, 12), SKIRT_D, -4.6, 0.85, 0, 0, 0, Math.PI / 2, 1.9, 1.9, 1.9));
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
    p.push(part(cyl(0.5, 0.5, 10), col, x, 0.9, z, 0, 0, Math.PI / 2, wide, L / 26 + 0.3, wide * 0.55));
  }
  // the tail flukes, flat on the ground
  p.push(part(box(), BLUE_D, L * 0.5 + 1.6, 0.22, 5.6, 0, 0.5, 0, 7.5, 0.35, 3.2));
  p.push(part(box(), BLUE_D, L * 0.5 + 1.6, 0.22, 1.4, 0, -0.5, 0, 7.5, 0.35, 3.2));
  // one pectoral fin, spread
  p.push(part(box(), BLUE_D, -L * 0.24, 0.24, 7.4, 0, 0.35, 0, 6.0, 0.32, 2.6));
  // THE EYE — and it is the reason a child says "there was a WHALE"
  p.push(part(sph(), 0xf7f7f2, -L * 0.42, 2.4, 4.1, 0, 0, 0, 2.1, 2.1, 1.0));
  p.push(part(sph(), 0x121826, -L * 0.42 - 0.35, 2.5, 4.5, 0, 0, 0, 1.15, 1.15, 0.7));
  p.push(part(sph(), 0xffffff, -L * 0.42 - 0.6, 2.85, 4.7, 0, 0, 0, 0.4, 0.4, 0.3));
  // the mouth line, a long dark seam
  p.push(part(box(), BLUE_D, -L * 0.36, 0.55, 0, 0, 0.06, 0, 13.0, 0.22, 8.4));
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
