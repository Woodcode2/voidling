// ══════════════════════════════════════════════════════════════════════════
//  LANTERN NIGHT — the spirit night market prop kit
//  A festival valley on the one night a year it opens: stalls nose to nose
//  down both banks of a shallow canal, lanterns strung across the water, a
//  shrine stair up the west side and a bathhouse lit at the top of the north
//  stair waiting to be the last thing eaten.
//
//  House rules, same as island.ts, luxe.ts and tailgate.ts:
//    • every prop is ONE merged mesh sharing PROP_SHARED_MAT (one draw call)
//    • no per-prop materials, no textures, flat shading, chunky silhouettes
//    • y = 0 is the ground plane, the prop's nose/front faces +X
//    • keep each prop under ~140 parts
//
//  …AND ONE RULE THAT IS NEW HERE. Half this kit is the level's LIGHTING.
//  Anything that burns — a paper lantern, a stall's lit interior, a stone
//  lantern's slit, a window — is merged into a second mesh on PROP_GLOW_MAT,
//  which is unlit: it ignores the rig entirely and renders at its raw vertex
//  colour. That is what makes a lantern read as a lantern rather than as a
//  beige paper bag in a dark scene, and it is why this world can carry two
//  hundred light sources and zero actual lights. The ground bake in island.ts
//  paints the matching pool on the floor; the two have to agree in colour or
//  the lantern looks like it is hovering over somebody else's light.
//
//  A NOTE ON WHERE THIS COMES FROM. The market, its architecture and its
//  spirits are drawn from Japanese folklore and a real festival night market
//  — torii, stone lanterns, yatai stalls, an onsen bathhouse, and yōkai like
//  the one-eyed umbrella and the tanuki. Those are centuries-old folk material
//  and they are the same well every modern telling drinks from. Nothing here
//  copies a specific modern work's designs, and nothing should be added that
//  does.
// ══════════════════════════════════════════════════════════════════════════
import * as THREE from 'three';
import { part, mergedProp, PROP_GLOW_MAT, PROP_SMOOTH_MAT } from './island';

type G = THREE.BufferGeometry;

// ── palette ───────────────────────────────────────────────────────────────
// Two families and they do different jobs. The SOLIDS are all dark and
// desaturated, because at night an object's local colour barely survives —
// what you actually see is its silhouette against a lit ground. The GLOWS are
// the only saturated colours in the level, and they are the only thing the eye
// is ever asked to follow.
const VERM = 0xc1382e;       // vermilion: torii, lantern paper, shrine timber
const VERM_D = 0x8e2620;     // shadowed vermilion
const TIMBER = 0x6b4a33;     // stall frames, decking, boat hulls
const TIMBER_D = 0x4a3324;   // undersides and shadowed timber
const CEDAR = 0x7d5a3e;      // the teahouse and bathhouse boards, warmer
const CEDAR_D = 0x55402d;
const TILE = 0x2e3440;       // roof tiles, near-black slate blue
const TILE_D = 0x222834;
const STONE = 0x6a6a76;      // granite: lanterns, steps, bases
const STONE_D = 0x4c4c58;
const ROPE = 0xb8a074;       // straw rope, matting, tatami
const PAPER = 0xd8cdb6;      // unlit paper, screens, banners
const CHAR = 0x1e1e26;       // ironwork, wire, tyres of the world
const GREEN = 0x2f5a3a;      // bamboo, hedges, moss
const GREEN_L = 0x467a4c;
const WATER = 0x1a3a52;      // the canal, where a prop has to sit in it

// the glows — unlit, so these are the literal pixels on screen
const G_AMBER = 0xffb256;    // the workhorse: most paper lanterns
const G_WARM = 0xff8a3c;     // deeper orange, the big gate lanterns
const G_PAPER = 0xfff0d2;    // paper-white, the cooler lanterns in a string
const G_RED = 0xff5a4a;      // vermilion lantern paper, lit
const G_GREEN = 0x9effb4;    // the shrine's few green votives, and fireflies
const G_BLUE = 0x8ad4ff;     // the spirit-blue votives on the shrine stair
const G_GRIDDLE = 0xff6a2a;  // a stall's cooking surface — the hottest colour
const G_WINDOW = 0xffd489;   // the bathhouse's windows

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T>(a: T[]): T => a[(Math.random() * a.length) | 0];

/** Both halves of a prop that is partly its own light source. The pattern is
 *  already used by the dance rig in island.ts; it is the whole idiom here. */
function lit(solid: G[], glow: G[]): THREE.Group {
  const g = new THREE.Group();
  if (solid.length) g.add(mergedProp(solid));
  if (glow.length) g.add(mergedProp(glow, PROP_GLOW_MAT));
  return g;
}

// ── the signature prop ─────────────────────────────────────────────────────
/** A paper lantern on a short bracket. The single most repeated object in the
 *  level, so it is deliberately cheap: a six-sided barrel, two caps and a
 *  wire. The BARREL is the glow; the caps and wire are solid, which is what
 *  gives a bright shape a dark edge and stops a field of them reading as
 *  fuzzy dots. */
export function makeLantern(col = G_AMBER, h = 1.15): THREE.Group {
  const solid: G[] = [], glow: G[] = [];
  const r = h * 0.38;
  // the paper, slightly barrelled — two stacked cones read rounder than a
  // cylinder at this size and cost the same
  glow.push(part(new THREE.CylinderGeometry(r * 0.72, r, h * 0.46, 8), col, 0, h * 0.30, 0));
  glow.push(part(new THREE.CylinderGeometry(r, r * 0.72, h * 0.46, 8), col, 0, h * 0.72, 0));
  // ribs: a couple of dark bands so it reads as paper over a frame
  solid.push(part(new THREE.CylinderGeometry(r * 1.03, r * 1.03, h * 0.05, 8), VERM_D, 0, h * 0.52, 0));
  // caps
  solid.push(part(new THREE.CylinderGeometry(r * 0.5, r * 0.62, h * 0.1, 8), CHAR, 0, h * 0.98, 0));
  solid.push(part(new THREE.CylinderGeometry(r * 0.62, r * 0.5, h * 0.1, 8), CHAR, 0, h * 0.04, 0));
  // the tassel
  solid.push(part(new THREE.CylinderGeometry(0.03, 0.03, h * 0.22, 4), VERM, 0, -h * 0.09, 0));
  return lit(solid, glow);
}

/** A run of lanterns on a slack wire, for spanning the canal. `span` is the
 *  gap in 3D units; the wire sags, because a straight wire is the single most
 *  obvious tell that a festival was built by a computer. */
export function makeLanternString(span = 16, n = 5): THREE.Group {
  const solid: G[] = [], glow: G[] = [];
  const sag = span * 0.09;
  const yAt = (t: number) => 4.6 - sag * Math.sin(t * Math.PI);
  // the wire, as short segments following the catenary
  const SEG = 14;
  for (let i = 0; i < SEG; i++) {
    const t0 = i / SEG, t1 = (i + 1) / SEG;
    const x0 = -span / 2 + span * t0, x1 = -span / 2 + span * t1;
    const y0 = yAt(t0), y1 = yAt(t1);
    const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy);
    solid.push(part(new THREE.BoxGeometry(L, 0.05, 0.05), CHAR,
      (x0 + x1) / 2, (y0 + y1) / 2, 0, 0, 0, Math.atan2(dy, dx)));
  }
  // the lanterns hanging off it
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const x = -span / 2 + span * t, y = yAt(t);
    const col = i % 3 === 1 ? G_PAPER : (i % 5 === 0 ? G_RED : G_AMBER);
    const h = rnd(0.85, 1.15);
    const r = h * 0.36;
    glow.push(part(new THREE.CylinderGeometry(r * 0.74, r, h * 0.46, 8), col, x, y - 0.42, 0));
    glow.push(part(new THREE.CylinderGeometry(r, r * 0.74, h * 0.46, 8), col, x, y - 0.84, 0));
    solid.push(part(new THREE.CylinderGeometry(r * 0.48, r * 0.6, 0.09, 8), CHAR, x, y - 0.16, 0));
    solid.push(part(new THREE.CylinderGeometry(r * 0.6, r * 0.48, 0.09, 8), CHAR, x, y - 1.08, 0));
  }
  return lit(solid, glow);
}

/** A stone lantern: square hood, a burning slit on each face, moss at the
 *  base. The shrine's whole west bank is these, which is why they are cooler
 *  and dimmer than anything on the market side — one district devotional, one
 *  commercial, told entirely in light temperature. */
export function makeStoneLantern(col = G_BLUE): THREE.Group {
  const solid: G[] = [], glow: G[] = [];
  const h = rnd(1.6, 2.2);
  solid.push(part(new THREE.CylinderGeometry(0.42, 0.52, h * 0.16, 6), STONE_D, 0, h * 0.08, 0));
  solid.push(part(new THREE.CylinderGeometry(0.2, 0.24, h * 0.42, 6), STONE, 0, h * 0.37, 0));
  // the fire box, open on four sides: four corner posts and a lit core
  solid.push(part(new THREE.BoxGeometry(0.62, 0.06, 0.62), STONE, 0, h * 0.60, 0));
  for (const [sx, sz] of [[-1, -1], [-1, 1], [1, -1], [1, 1]] as const)
    solid.push(part(new THREE.BoxGeometry(0.09, h * 0.2, 0.09), STONE, sx * 0.26, h * 0.71, sz * 0.26));
  glow.push(part(new THREE.BoxGeometry(0.4, h * 0.16, 0.4), col, 0, h * 0.71, 0));
  // the hood — a squat pyramid with a finial
  solid.push(part(new THREE.ConeGeometry(0.62, h * 0.2, 4), STONE, 0, h * 0.90, 0, 0, Math.PI / 4));
  solid.push(part(new THREE.SphereGeometry(0.1, 6, 5), STONE, 0, h * 1.02, 0));
  solid.push(part(new THREE.SphereGeometry(0.3, 6, 5), GREEN, 0.22, h * 0.05, 0.18, 0, 0, 0, 1, 0.5, 1));
  return lit(solid, glow);
}

/** A yatai — a market food stall. The workhorse of LANTERN ROW: a timber
 *  counter under a striped canopy with a griddle in it and a lantern on the
 *  corner post. The lit interior is what makes the street a street; from the
 *  play camera you see a row of glowing boxes receding, which is the shot the
 *  whole level is built around. */
export function makeStall(): THREE.Group {
  const solid: G[] = [], glow: G[] = [];
  const wD = rnd(3.4, 4.4), dD = rnd(2.2, 2.8), h = rnd(2.5, 2.9);
  // counter
  solid.push(part(new THREE.BoxGeometry(wD, 0.9, dD), TIMBER, 0, 0.45, 0));
  solid.push(part(new THREE.BoxGeometry(wD * 1.05, 0.14, dD * 1.08), TIMBER_D, 0, 0.95, 0));
  // corner posts
  for (const sx of [-1, 1]) for (const sz of [-1, 1])
    solid.push(part(new THREE.BoxGeometry(0.14, h, 0.14), TIMBER_D, sx * (wD / 2 - 0.1), h / 2, sz * (dD / 2 - 0.1)));
  // the canopy: a shallow ridge with a striped valance
  solid.push(part(new THREE.BoxGeometry(wD * 1.15, 0.16, dD * 1.2), VERM, 0, h, 0));
  solid.push(part(new THREE.BoxGeometry(wD * 1.17, 0.09, dD * 1.22), VERM_D, 0, h - 0.1, 0));
  // the valance: six bold bands hanging off the front edge, tall enough to
  // read at the play camera instead of a 0.34 sliver nobody could see
  for (let i = 0; i < 6; i++) {
    const t = (i + 0.5) / 6;
    solid.push(part(new THREE.BoxGeometry(wD * 1.15 / 6 * 0.92, 0.62, 0.07),
      i % 2 ? PAPER : VERM_D, -wD * 0.575 + wD * 1.15 * t, h - 0.36, dD * 0.61));
  }
  // THE LIGHT: the inside of the stall, and the griddle on the counter.
  // the back wall of the stall, lit — a glowing panel BEHIND the counter is
  // what a lit yatai actually looks like from the street, and it silhouettes
  // the stallholder standing in front of it
  glow.push(part(new THREE.BoxGeometry(wD * 0.9, 1.25, 0.12), G_AMBER, 0, 1.62, -dD * 0.46));
  glow.push(part(new THREE.BoxGeometry(wD * 0.82, 0.1, dD * 0.5), G_AMBER, 0, 1.05, -dD * 0.16));
  glow.push(part(new THREE.BoxGeometry(wD * 0.4, 0.08, dD * 0.4), G_GRIDDLE, wD * 0.16, 1.03, 0));
  // steam is a solid, not a glow — a glowing cloud reads as fire
  solid.push(part(new THREE.SphereGeometry(0.34, 6, 5), PAPER, wD * 0.16, 1.6, 0, 0, 0, 0, 1, 0.7, 1));
  solid.push(part(new THREE.SphereGeometry(0.26, 6, 5), PAPER, wD * 0.16 + 0.2, 2.05, 0.1, 0, 0, 0, 1, 0.7, 1));
  // a lantern on the front post
  const lr = 0.34;
  glow.push(part(new THREE.CylinderGeometry(lr * 0.74, lr, 0.42, 8), G_RED, wD / 2 - 0.1, h - 0.5, dD / 2 - 0.1));
  glow.push(part(new THREE.CylinderGeometry(lr, lr * 0.74, 0.42, 8), G_RED, wD / 2 - 0.1, h - 0.92, dD / 2 - 0.1));
  // stock: crates and bowls on the counter
  for (let i = 0; i < 3; i++)
    solid.push(part(new THREE.BoxGeometry(0.4, 0.3, 0.4), pick([ROPE, TIMBER_D, VERM_D]),
      -wD * 0.3 + i * 0.5, 1.17, -dD * 0.2));
  return lit(solid, glow);
}

/** The great gate. Vermilion, two uprights, a curved lintel and a second beam
 *  under it — the silhouette every child recognises. It is the first thing in
 *  frame at spawn, so it carries the two biggest lanterns in the level. */
export function makeTorii(scale = 1): THREE.Group {
  const solid: G[] = [], glow: G[] = [];
  const H = 8.6 * scale, W = 7.4 * scale, r = 0.42 * scale;
  for (const sx of [-1, 1]) {
    solid.push(part(new THREE.CylinderGeometry(r * 0.86, r, H, 10), VERM, sx * W / 2, H / 2, 0));
    solid.push(part(new THREE.CylinderGeometry(r * 1.25, r * 1.35, 0.4 * scale, 10), STONE_D, sx * W / 2, 0.2 * scale, 0));
  }
  // the lintel: a slight upward curve made of three segments
  const LY = H - 0.5 * scale;
  solid.push(part(new THREE.BoxGeometry(W * 1.34, 0.5 * scale, 0.62 * scale), VERM, 0, LY + 0.5 * scale, 0));
  solid.push(part(new THREE.BoxGeometry(W * 1.44, 0.22 * scale, 0.5 * scale), VERM_D, 0, LY + 0.86 * scale, 0));
  for (const sx of [-1, 1])
    solid.push(part(new THREE.BoxGeometry(W * 0.2, 0.42 * scale, 0.56 * scale), VERM,
      sx * W * 0.74, LY + 0.66 * scale, 0, 0, 0, sx * -0.12));
  // the second beam
  solid.push(part(new THREE.BoxGeometry(W * 1.06, 0.36 * scale, 0.44 * scale), VERM, 0, LY - 1.5 * scale, 0));
  // the plaque
  solid.push(part(new THREE.BoxGeometry(1.1 * scale, 1.3 * scale, 0.16 * scale), PAPER, 0, LY - 0.5 * scale, 0.1 * scale));
  // THE TWO BIG LANTERNS, hung inside the uprights
  for (const sx of [-1, 1]) {
    const lr = 0.95 * scale;
    glow.push(part(new THREE.CylinderGeometry(lr * 0.76, lr, 1.15 * scale, 10), G_WARM, sx * W * 0.3, LY - 2.6 * scale, 0));
    glow.push(part(new THREE.CylinderGeometry(lr, lr * 0.76, 1.15 * scale, 10), G_WARM, sx * W * 0.3, LY - 3.75 * scale, 0));
    solid.push(part(new THREE.CylinderGeometry(lr * 0.5, lr * 0.6, 0.22 * scale, 10), CHAR, sx * W * 0.3, LY - 1.95 * scale, 0));
    solid.push(part(new THREE.BoxGeometry(0.06, 1.1 * scale, 0.06), CHAR, sx * W * 0.3, LY - 1.4 * scale, 0));
  }
  return lit(solid, glow);
}

/** The shrine's small torii, run nose to tail up the steps. No lanterns —
 *  the density is the effect. */
export function makeSmallTorii(): THREE.Object3D {
  const p: G[] = [];
  const H = 3.2, W = 2.6, r = 0.16;
  for (const sx of [-1, 1]) p.push(part(new THREE.CylinderGeometry(r * 0.86, r, H, 8), VERM, sx * W / 2, H / 2, 0));
  p.push(part(new THREE.BoxGeometry(W * 1.34, 0.24, 0.3), VERM, 0, H - 0.12, 0));
  p.push(part(new THREE.BoxGeometry(W * 1.06, 0.16, 0.22), VERM_D, 0, H - 0.72, 0));
  return mergedProp(p);
}

/** A market crate, a rice barrel, a stack of bowls — the small change of the
 *  street, and most of what a small void actually eats. */
export function makeMarketCrate(): THREE.Object3D {
  const p: G[] = [];
  const k = rnd(0.7, 1.1);
  const kind = Math.random();
  if (kind < 0.4) {
    p.push(part(new THREE.BoxGeometry(1.1 * k, 0.8 * k, 0.9 * k), TIMBER, 0, 0.4 * k, 0));
    p.push(part(new THREE.BoxGeometry(1.15 * k, 0.1 * k, 0.95 * k), TIMBER_D, 0, 0.8 * k, 0));
  } else if (kind < 0.72) {
    p.push(part(new THREE.CylinderGeometry(0.5 * k, 0.44 * k, 1.0 * k, 10), ROPE, 0, 0.5 * k, 0));
    p.push(part(new THREE.CylinderGeometry(0.52 * k, 0.52 * k, 0.08 * k, 10), TIMBER_D, 0, 0.78 * k, 0));
    p.push(part(new THREE.CylinderGeometry(0.52 * k, 0.52 * k, 0.08 * k, 10), TIMBER_D, 0, 0.22 * k, 0));
  } else {
    for (let i = 0; i < 4; i++)
      p.push(part(new THREE.CylinderGeometry(0.34 * k, 0.3 * k, 0.16 * k, 10), PAPER, 0, 0.09 * k + i * 0.17 * k, 0));
  }
  return mergedProp(p);
}

/** A goldfish scooping tank: a shallow lit pool on trestles. Glows upward,
 *  which is the only prop in the level that does. */
export function makeGoldfishTank(): THREE.Group {
  const solid: G[] = [], glow: G[] = [];
  solid.push(part(new THREE.BoxGeometry(2.6, 0.7, 1.8), TIMBER_D, 0, 0.35, 0));
  solid.push(part(new THREE.BoxGeometry(2.7, 0.16, 1.9), TIMBER, 0, 0.72, 0));
  glow.push(part(new THREE.BoxGeometry(2.3, 0.1, 1.5), G_PAPER, 0, 0.8, 0));
  for (let i = 0; i < 5; i++)
    glow.push(part(new THREE.SphereGeometry(0.11, 6, 5), i % 2 ? G_RED : G_AMBER,
      rnd(-0.9, 0.9), 0.86, rnd(-0.5, 0.5), 0, 0, 0, 1, 0.6, 1.6));
  return lit(solid, glow);
}

/** A flat-bottomed canal boat with a lantern on a pole. Sits IN the channel,
 *  which is walkable ground painted as water, so it is an ordinary prop. */
export function makeCanalBoat(): THREE.Group {
  const solid: G[] = [], glow: G[] = [];
  const L = rnd(5.5, 7.5), W = 1.7;
  solid.push(part(new THREE.BoxGeometry(L, 0.5, W), TIMBER, 0, 0.28, 0));
  solid.push(part(new THREE.BoxGeometry(L * 0.9, 0.34, W * 0.78), TIMBER_D, 0, 0.6, 0));
  for (const sx of [-1, 1])
    solid.push(part(new THREE.BoxGeometry(0.7, 0.42, W), TIMBER, sx * L * 0.48, 0.44, 0, 0, 0, sx * 0.34));
  // an awning over the middle third
  solid.push(part(new THREE.BoxGeometry(L * 0.34, 0.1, W * 1.05), ROPE, 0, 1.85, 0));
  for (const sx of [-1, 1]) solid.push(part(new THREE.BoxGeometry(0.09, 1.3, 0.09), TIMBER_D, sx * L * 0.16, 1.2, 0));
  // the pole lantern at the bow
  solid.push(part(new THREE.BoxGeometry(0.08, 2.1, 0.08), CHAR, L * 0.4, 1.3, 0));
  glow.push(part(new THREE.CylinderGeometry(0.24, 0.3, 0.34, 8), G_AMBER, L * 0.4, 2.1, 0));
  glow.push(part(new THREE.CylinderGeometry(0.3, 0.24, 0.34, 8), G_AMBER, L * 0.4, 1.76, 0));
  return lit(solid, glow);
}

/** A candle lantern floating on the water — a little paper box on a raft.
 *  Dozens of these drift down the channel and they are the smallest, easiest
 *  meal in the level, which is why a hatchling is sent down the canal first. */
export function makeFloatLantern(): THREE.Group {
  const solid: G[] = [], glow: G[] = [];
  const k = rnd(0.5, 0.8);
  solid.push(part(new THREE.BoxGeometry(0.9 * k, 0.1 * k, 0.9 * k), TIMBER_D, 0, 0.05 * k, 0));
  glow.push(part(new THREE.BoxGeometry(0.62 * k, 0.62 * k, 0.62 * k), pick([G_PAPER, G_AMBER, G_RED]), 0, 0.42 * k, 0));
  solid.push(part(new THREE.BoxGeometry(0.7 * k, 0.06 * k, 0.7 * k), CHAR, 0, 0.76 * k, 0));
  return lit(solid, glow);
}

/** A stand of bamboo. The valley wall, and the only thing at the rim — it is
 *  what the light falls away into, so it is dark, tall and thin. */
export function makeBamboo(): THREE.Object3D {
  const p: G[] = [];
  const n = 3 + ((Math.random() * 4) | 0);
  for (let i = 0; i < n; i++) {
    const h = rnd(6, 11), lean = rnd(-0.09, 0.09);
    const x = rnd(-1.1, 1.1), z = rnd(-1.1, 1.1);
    p.push(part(new THREE.CylinderGeometry(0.11, 0.15, h, 6), GREEN, x, h / 2, z, lean, 0, lean * 0.6));
    // nodes
    for (let k = 1; k < 4; k++)
      p.push(part(new THREE.CylinderGeometry(0.16, 0.16, 0.09, 6), GREEN_L, x + lean * (h * k / 4 - h / 2), h * k / 4, z));
    // a few leaf blades near the top
    for (let k = 0; k < 3; k++)
      p.push(part(new THREE.BoxGeometry(1.5, 0.05, 0.22), GREEN_L,
        x + rnd(-0.6, 0.6), h * rnd(0.72, 0.95), z + rnd(-0.6, 0.6), 0, rnd(0, 6.28), rnd(-0.4, 0.4)));
  }
  return mergedProp(p, PROP_SMOOTH_MAT);
}

/** The teahouse: a low cedar building with a deep eave, paper screens lit from
 *  inside, and a veranda. The east bank's anchor. */
export function makeTeahouse(): THREE.Group {
  const solid: G[] = [], glow: G[] = [];
  const W = rnd(7, 9), D = rnd(5, 6.5), H = 3.4;
  solid.push(part(new THREE.BoxGeometry(W, 0.5, D), STONE_D, 0, 0.25, 0));
  solid.push(part(new THREE.BoxGeometry(W, H, D), CEDAR_D, 0, 0.5 + H / 2, 0));
  // the paper screens — the lit face
  glow.push(part(new THREE.BoxGeometry(W * 0.86, H * 0.6, 0.12), G_WINDOW, 0, 0.5 + H * 0.52, D / 2 + 0.02));
  for (let i = 1; i < 4; i++)
    solid.push(part(new THREE.BoxGeometry(0.1, H * 0.62, 0.16), CEDAR,
      -W * 0.43 + (W * 0.86 * i) / 4, 0.5 + H * 0.52, D / 2 + 0.05));
  // the roof: a deep hipped eave, which is the whole silhouette
  solid.push(part(new THREE.BoxGeometry(W * 1.3, 0.22, D * 1.34), TILE, 0, 0.5 + H + 0.1, 0));
  solid.push(part(new THREE.BoxGeometry(W * 0.9, 0.9, D * 0.9), TILE_D, 0, 0.5 + H + 0.6, 0));
  solid.push(part(new THREE.BoxGeometry(W * 1.34, 0.14, 0.3), TILE_D, 0, 0.5 + H + 0.02, D * 0.67));
  // veranda
  solid.push(part(new THREE.BoxGeometry(W * 0.9, 0.16, 1.4), CEDAR, 0, 0.58, D / 2 + 0.7));
  // a lantern each end of the eave
  for (const sx of [-1, 1]) {
    glow.push(part(new THREE.CylinderGeometry(0.26, 0.32, 0.36, 8), G_AMBER, sx * W * 0.56, 0.5 + H - 0.3, D * 0.6));
    glow.push(part(new THREE.CylinderGeometry(0.32, 0.26, 0.36, 8), G_AMBER, sx * W * 0.56, 0.5 + H - 0.66, D * 0.6));
  }
  return lit(solid, glow);
}

/** An offering box and its bell rope — shrine furniture, and a good small meal. */
export function makeOfferingBox(): THREE.Object3D {
  const p: G[] = [];
  p.push(part(new THREE.BoxGeometry(2.2, 1.1, 1.2), TIMBER_D, 0, 0.55, 0));
  for (let i = 0; i < 7; i++)
    p.push(part(new THREE.BoxGeometry(0.1, 0.1, 1.24), CHAR, -0.9 + i * 0.3, 1.13, 0));
  p.push(part(new THREE.BoxGeometry(2.3, 0.12, 1.3), TIMBER, 0, 1.02, 0));
  p.push(part(new THREE.BoxGeometry(0.16, 2.6, 0.16), ROPE, 0, 2.3, -0.7));
  return mergedProp(p);
}

/** THE BATHHOUSE. The level's finale and the only thing the player can see
 *  from the spawn, seven thousand units away. Six storeys stepping inward with
 *  every window lit, on a red lacquer terrace at the top of the north stair.
 *  It is approached from BELOW, which no other landmark in the game is, so the
 *  underside of each eave is modelled — that is the face you actually see. */
export function makeBathhouse(): THREE.Group {
  const solid: G[] = [], glow: G[] = [];
  const FL = 6;                       // storeys
  let w = 26, d = 20, y = 0;
  // the terrace and its balustrade
  solid.push(part(new THREE.BoxGeometry(w * 1.35, 1.2, d * 1.4), STONE_D, 0, 0.6, 0));
  solid.push(part(new THREE.BoxGeometry(w * 1.3, 0.4, d * 1.35), CEDAR_D, 0, 1.35, 0));
  y = 1.55;
  for (let f = 0; f < FL; f++) {
    const h = f === 0 ? 5.2 : 4.2 - f * 0.28;
    // the storey
    solid.push(part(new THREE.BoxGeometry(w, h, d), f % 2 ? CEDAR : CEDAR_D, 0, y + h / 2, 0));
    // THE WINDOWS — a lit band on all four faces. This is the building.
    const cols = Math.max(3, Math.round(w / 3.4));
    for (let c = 0; c < cols; c++) {
      const x = -w / 2 + (w / cols) * (c + 0.5);
      for (const sz of [-1, 1])
        glow.push(part(new THREE.BoxGeometry(w / cols * 0.56, h * 0.42, 0.16), G_WINDOW,
          x, y + h * 0.56, sz * (d / 2 + 0.03)));
    }
    const rows = Math.max(2, Math.round(d / 3.4));
    for (let c = 0; c < rows; c++) {
      const z = -d / 2 + (d / rows) * (c + 0.5);
      for (const sx of [-1, 1])
        glow.push(part(new THREE.BoxGeometry(0.16, h * 0.42, d / rows * 0.56), G_WINDOW,
          sx * (w / 2 + 0.03), y + h * 0.56, z));
    }
    // the eave: wider than the storey, and its UNDERSIDE is what the player
    // sees on the climb, so it gets its own darker plate
    const ew = w * 1.22, ed = d * 1.24;
    solid.push(part(new THREE.BoxGeometry(ew, 0.5, ed), TILE, 0, y + h + 0.25, 0));
    solid.push(part(new THREE.BoxGeometry(ew * 0.99, 0.2, ed * 0.99), TILE_D, 0, y + h - 0.02, 0));
    // upswept corners
    for (const sx of [-1, 1]) for (const sz of [-1, 1])
      solid.push(part(new THREE.BoxGeometry(2.6, 0.34, 1.2), TILE,
        sx * ew * 0.44, y + h + 0.5, sz * ed * 0.44, 0, sx * sz * 0.7, sx * -0.22));
    // a lantern on each corner of every storey — the thing that makes it
    // twinkle from a distance
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      glow.push(part(new THREE.CylinderGeometry(0.3, 0.38, 0.44, 8), G_RED,
        sx * ew * 0.46, y + h - 0.6, sz * ed * 0.46));
      glow.push(part(new THREE.CylinderGeometry(0.38, 0.3, 0.44, 8), G_RED,
        sx * ew * 0.46, y + h - 1.04, sz * ed * 0.46));
    }
    y += h + 0.5;
    w *= 0.86; d *= 0.86;
  }
  // the roof lantern and finial
  solid.push(part(new THREE.ConeGeometry(w * 0.9, 3.4, 4), TILE, 0, y + 1.7, 0, 0, Math.PI / 4));
  glow.push(part(new THREE.SphereGeometry(1.0, 8, 6), G_WARM, 0, y + 3.9, 0));
  solid.push(part(new THREE.CylinderGeometry(0.16, 0.16, 1.6, 6), CHAR, 0, y + 4.9, 0));
  // the entrance curtain, split — the one place a spirit walks in
  solid.push(part(new THREE.BoxGeometry(9, 2.2, 0.2), VERM, 0, 4.2, d * 1.62));
  return lit(solid, glow);
}

/** The moon bridge: a high timber arch over the canal. The level's midpoint,
 *  and the one place the player is funnelled. */
export function makeMoonBridge(span = 22): THREE.Group {
  const solid: G[] = [], glow: G[] = [];
  const SEG = 12, rise = span * 0.24;
  for (let i = 0; i < SEG; i++) {
    const t0 = i / SEG, t1 = (i + 1) / SEG;
    const x0 = -span / 2 + span * t0, x1 = -span / 2 + span * t1;
    const y0 = rise * Math.sin(t0 * Math.PI), y1 = rise * Math.sin(t1 * Math.PI);
    const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy);
    solid.push(part(new THREE.BoxGeometry(L * 1.04, 0.4, 4.4), TIMBER,
      (x0 + x1) / 2, (y0 + y1) / 2 + 0.2, 0, 0, 0, Math.atan2(dy, dx)));
    // the rail posts, every other segment, with a small lantern on each
    if (i % 3 === 1) for (const sz of [-1, 1]) {
      solid.push(part(new THREE.BoxGeometry(0.16, 1.3, 0.16), VERM_D, (x0 + x1) / 2, (y0 + y1) / 2 + 1.0, sz * 2.1));
      glow.push(part(new THREE.SphereGeometry(0.2, 6, 5), G_AMBER, (x0 + x1) / 2, (y0 + y1) / 2 + 1.75, sz * 2.1));
    }
  }
  // the rails themselves
  for (const sz of [-1, 1]) for (let i = 0; i < SEG; i++) {
    const t0 = i / SEG, t1 = (i + 1) / SEG;
    const x0 = -span / 2 + span * t0, x1 = -span / 2 + span * t1;
    const y0 = rise * Math.sin(t0 * Math.PI), y1 = rise * Math.sin(t1 * Math.PI);
    const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy);
    solid.push(part(new THREE.BoxGeometry(L * 1.04, 0.16, 0.16), VERM,
      (x0 + x1) / 2, (y0 + y1) / 2 + 1.6, sz * 2.1, 0, 0, Math.atan2(dy, dx)));
  }
  return lit(solid, glow);
}

/** A banner pole with a vertical cloth — the market's signage, and the thing
 *  that gives LANTERN ROW its vertical rhythm from the play camera. */
export function makeBanner(): THREE.Object3D {
  const p: G[] = [];
  const h = rnd(3.6, 5);
  p.push(part(new THREE.CylinderGeometry(0.09, 0.11, h, 6), TIMBER_D, 0, h / 2, 0));
  p.push(part(new THREE.BoxGeometry(0.06, h * 0.62, 0.9), pick([VERM, PAPER, ROPE]), 0.12, h * 0.6, 0.42));
  p.push(part(new THREE.BoxGeometry(0.5, 0.1, 0.1), TIMBER, 0.2, h * 0.92, 0));
  return mergedProp(p);
}
