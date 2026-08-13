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
import { registerGloss } from './gloss';

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

// ── WHAT CATCHES THE MOON ─────────────────────────────────────────────────
// See installPropShader in island.ts. The palette note above is right that an
// object's local colour barely survives at night — which is exactly why this
// world had the most to lose from a flat 0.85 roughness. When the diffuse is
// nearly gone, the SPECULAR is the shape: a glazed roof tile, a wet stone
// step and a canal are all read from one cold streak of moonlight and nothing
// else. This is the only rig in the game with no sun in it (moon at 0.42),
// so nothing here goes chrome; it goes damp.
//
// WATER runs highest because the canal is the only true mirror on the level.
//
// VERM IS HERE BECAUSE THE MEASUREMENT SAID SO. The first pass registered
// TILE and called it "the big one — a hundred-odd roofs". It is not: TILE is
// the shrine, the kura and the bathhouse, and the surface that actually fills
// this frame is the VERMILION STALL CANOPY, repeated down every row of the
// market. With TILE alone the channel reached 1.32% of the level's pixels.
// A vermilion canopy is lacquered cloth over a frame, so it takes a low
// value, not a metal one — but at 45% of the world's triangles a low value on
// the right surface beats a high one on the wrong surface every time.
registerGloss([
  [VERM, 0.22], [VERM_D, 0.18],
  [TILE, 0.46], [TILE_D, 0.40], [WATER, 0.82], [CHAR, 0.50],
  [STONE, 0.24], [STONE_D, 0.20],
  [TIMBER, 0.16], [CEDAR, 0.16],   // oiled boards, wet with the night air
  // measured with qa/glossgap.mjs: the two hedge/bamboo greens are 22% of the
  // whole market and were dead matte — under lanterns a leaf sheen is what
  // catches the light. Shadowed timber joins the oiled boards it belongs to.
  // PAPER stays matte on purpose (paper is the one material that really is),
  // and the lit lantern hexes are skipped: they ride PROP_GLOW_MAT, which is
  // unlit and never reads aGloss.
  [GREEN_L, 0.12], [GREEN, 0.12], [TIMBER_D, 0.16],
], 'nightmarket');

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
  // The bathhouse's own tile, two stops up from the level's TILE (0x2e3440).
  // That colour is right for a stall roof glimpsed past a lantern and wrong
  // for the one building the whole map is aimed at: under a moon at 0.42 it
  // renders at a luminance of about 0.05, which is to say black.
  const ROOF = 0x4a5468;
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
    solid.push(part(new THREE.BoxGeometry(ew, 0.5, ed), ROOF, 0, y + h + 0.25, 0));
    solid.push(part(new THREE.BoxGeometry(ew * 0.99, 0.2, ed * 0.99), TILE_D, 0, y + h - 0.02, 0));
    // upswept corners
    for (const sx of [-1, 1]) for (const sz of [-1, 1])
      solid.push(part(new THREE.BoxGeometry(2.6, 0.34, 1.2), ROOF,
        sx * ew * 0.44, y + h + 0.5, sz * ed * 0.44, 0, sx * sz * 0.7, sx * -0.22));

    // ── THE EAVE LINES ────────────────────────────────────────────────────
    // A photograph of the finished level found the problem this fixes: the
    // bathhouse is a black rectangle. Everything that lit it was on the four
    // VERTICAL faces — the windows, the corner lanterns tucked under the
    // overhang — and this game's camera looks DOWN. From up there the building
    // is six stacked roof plates in a near-black tile, and nothing else.
    //
    // So the roofs get lit from the edge in: a warm line along the outer lip
    // of every eave, on all four sides. It is the shape of the building drawn
    // in light, which is what a six-storey wooden bathhouse full of lamps
    // would actually look like from above, and it makes the finale legible
    // from anywhere in the valley instead of only from its own doorstep.
    for (const sz of [-1, 1])
      glow.push(part(new THREE.BoxGeometry(ew * 0.98, 0.12, 0.34), G_WARM, 0, y + h + 0.5, sz * ed * 0.48));
    for (const sx of [-1, 1])
      glow.push(part(new THREE.BoxGeometry(0.34, 0.12, ed * 0.98), G_WARM, sx * ew * 0.48, y + h + 0.5, 0));

    // a lantern on each corner of every storey — the thing that makes it
    // twinkle from a distance. Hung OUTSIDE the eave rather than under it:
    // beneath the overhang they were invisible from the play camera, which is
    // the one place they had to work from.
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      glow.push(part(new THREE.CylinderGeometry(0.42, 0.52, 0.6, 8), G_RED,
        sx * ew * 0.53, y + h + 0.16, sz * ed * 0.53));
      glow.push(part(new THREE.CylinderGeometry(0.52, 0.42, 0.6, 8), G_RED,
        sx * ew * 0.53, y + h - 0.44, sz * ed * 0.53));
      solid.push(part(new THREE.BoxGeometry(0.08, 0.7, 0.08), CHAR,
        sx * ew * 0.53, y + h + 0.72, sz * ed * 0.53));
    }
    y += h + 0.5;
    w *= 0.86; d *= 0.86;
  }
  // the roof lantern and finial
  solid.push(part(new THREE.ConeGeometry(w * 0.9, 3.4, 4), ROOF, 0, y + 1.7, 0, 0, Math.PI / 4));
  glow.push(part(new THREE.SphereGeometry(1.4, 8, 6), G_WARM, 0, y + 4.1, 0));
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

// ── THE HOT SPRING ─────────────────────────────────────────────────────────
// An onsen terrace on the shoulder behind the bathhouse: rock-rimmed pools
// cut into the hillside, steam standing off them, and the warmest light in
// the level. It exists for two reasons beyond being asked for.
//
// The first is contrast. Everything south of the bridge is COMMERCE — a street
// shouting at you, a hundred stalls competing for the same eye. The valley
// needed somewhere that is the opposite of that: quiet, warm, nobody selling
// anything, the one place a child would want to just sit. A level that is
// loud everywhere has no loud parts.
//
// The second is that it makes the climb pay off twice. The bathhouse is the
// finale you can see from the spawn; the spring is the thing you did not know
// was up there, and finding it is the reward for going all the way north.

/** One pool: a rock rim, a lit surface, and steam. The water is a GLOW rather
 *  than a lit surface, because a hot spring at night is a light source — the
 *  steam above it is the giveaway, and steam is only visible if something
 *  underneath is bright enough to throw light into it. */
export function makeHotPool(rr = 4.2): THREE.Group {
  const solid: G[] = [], glow: G[] = [];
  // the rim: irregular boulders around the edge, which is what stops a pool
  // reading as a swimming pool. A perfect circle of rock is a jacuzzi.
  const N = 11 + ((Math.random() * 4) | 0);
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2 + rnd(-0.14, 0.14);
    const d = rr * rnd(0.94, 1.12);
    const s = rnd(0.5, 1.0);
    solid.push(part(new THREE.DodecahedronGeometry(s, 0), i % 3 ? STONE : STONE_D,
      Math.cos(a) * d, s * rnd(0.3, 0.55), Math.sin(a) * d, rnd(0, 3), rnd(0, 3), rnd(0, 3)));
  }
  // the basin below the waterline, so the pool has depth rather than being a disc
  solid.push(part(new THREE.CylinderGeometry(rr * 0.94, rr * 0.7, 0.9, 18), 0x2a2430, 0, -0.45, 0));
  // THE WATER. Unlit, so it holds its colour at night and reads as the source.
  glow.push(part(new THREE.CylinderGeometry(rr * 0.92, rr * 0.92, 0.12, 18), 0x8fe8ff, 0, 0.14, 0));
  // a hotter core, because a spring is fed from one place
  glow.push(part(new THREE.CylinderGeometry(rr * 0.42, rr * 0.42, 0.14, 14), 0xd8f8ff, 0, 0.17, 0));
  // STEAM. Solid, not glow: a glowing cloud reads as fire, and the whole point
  // is that this is the one soft thing in a level made of hard lanterns.
  for (let i = 0; i < 7; i++) {
    const a = Math.random() * Math.PI * 2, d = Math.random() * rr * 0.7;
    const s = rnd(0.7, 1.5);
    solid.push(part(new THREE.SphereGeometry(s, 7, 5), PAPER,
      Math.cos(a) * d, 0.8 + i * 0.42 + rnd(0, 0.4), Math.sin(a) * d,
      0, 0, 0, 1, 0.62, 1));
  }
  return lit(solid, glow);
}

/** A bamboo spout feeding a pool — the sound of a hot spring, made visible.
 *  Small, cheap, and the thing that says "this water is arriving from
 *  somewhere" rather than "this water was always here". */
export function makeSpoutRock(): THREE.Group {
  const solid: G[] = [], glow: G[] = [];
  solid.push(part(new THREE.DodecahedronGeometry(1.5, 0), STONE_D, 0, 0.7, 0, 0.3, 0.8, 0.2));
  solid.push(part(new THREE.CylinderGeometry(0.16, 0.16, 2.2, 8), GREEN, 0.2, 1.7, 0, 0, 0, 1.15));
  solid.push(part(new THREE.CylinderGeometry(0.19, 0.19, 0.1, 8), GREEN_L, 0.2, 1.7, 0));
  // the falling water, as a thin lit ribbon
  glow.push(part(new THREE.BoxGeometry(0.14, 1.5, 0.14), 0xaef0ff, 1.15, 1.0, 0));
  return lit(solid, glow);
}

/** A slatted changing bench with folded towels — the human (spirit) detail
 *  that makes a pool read as a place people USE. */
export function makeOnsenBench(): THREE.Object3D {
  const p: G[] = [];
  p.push(part(new THREE.BoxGeometry(3.2, 0.16, 1.0), CEDAR, 0, 0.62, 0));
  for (const sx of [-1, 1]) p.push(part(new THREE.BoxGeometry(0.18, 0.62, 0.9), CEDAR_D, sx * 1.35, 0.31, 0));
  for (let i = 0; i < 3; i++)
    p.push(part(new THREE.BoxGeometry(0.5, 0.22, 0.7), PAPER, -0.8 + i * 0.8, 0.81, 0));
  return mergedProp(p);
}

// ══════════════════════════════════════════════════════════════════════════
//  THE DENSITY PASS
//  Measured across all four worlds: GAME DAY carries 3.80 edibles per 100u²
//  and reads full; LANTERN NIGHT shipped at 1.79 and reads like a market that
//  has been cleared for the night. The gap is not spread evenly — the census
//  put the bathhouse precinct at 0.40 across 14,908u² (the FINALE district,
//  13% of the map, holding eleven objects) and the valley wall at 0.73 across
//  27,757u². Those two are a third of the level between them.
//
//  So: props for the places that had none. Everything below is small, cheap
//  and specific to where it goes, and more than half of it is under radius 1 —
//  the census also found only 411 sub-1 edibles against GAME DAY's 1,839, and
//  that bucket IS the opening minute, when the void is too small to eat
//  anything else.
// ══════════════════════════════════════════════════════════════════════════

/** A small stone figure in a red cloth bib and hood. These stand along
 *  mountain paths and at shrine edges in their hundreds, usually mossy and
 *  usually leaning. Cheapest possible way to make an empty rim feel tended:
 *  a dark field with one small red note in it reads as inhabited. */
export function makeJizo(): THREE.Object3D {
  const p: G[] = [];
  const k = rnd(0.8, 1.15), lean = rnd(-0.13, 0.13);
  p.push(part(new THREE.BoxGeometry(0.5 * k, 0.16 * k, 0.5 * k), STONE_D, 0, 0.08 * k, 0));
  p.push(part(new THREE.CylinderGeometry(0.17 * k, 0.21 * k, 0.72 * k, 7), STONE, 0, 0.52 * k, 0, lean, 0, lean));
  p.push(part(new THREE.SphereGeometry(0.19 * k, 7, 6), STONE, lean * 0.5, 0.98 * k, 0));
  // the bib — the one saturated thing, and it is SOLID not glow, because it is
  // cloth catching lantern light rather than a light of its own.
  // FLARED, and the cap is on nearly all of them. First pass put a narrow bib
  // at chest height under a head sphere of the same radius, which is correct
  // for a figure seen from eye level and useless in this game: the play camera
  // looks down, so all it ever saw was the top of a grey head. The red has to
  // be on the parts of the silhouette that face UP.
  p.push(part(new THREE.CylinderGeometry(0.2 * k, 0.34 * k, 0.24 * k, 8), VERM, 0, 0.72 * k, 0));
  if (Math.random() < 0.85)  // a knitted cap, as people leave for them
    p.push(part(new THREE.SphereGeometry(0.23 * k, 8, 6), VERM, lean * 0.5, 1.02 * k, 0, 0, 0, 0, 1, 0.75, 1));
  return mergedProp(p);
}

/** The bathhouse laundry: a tall timber frame hung with long cloths, steaming.
 *  A working bathhouse washes an enormous quantity of linen and hangs it where
 *  the heat is, so the terrace is full of these. Tall and soft-edged, which is
 *  exactly what the terrace was missing — it had a six-storey building and
 *  nothing at head height. */
export function makeTowelRack(): THREE.Object3D {
  const p: G[] = [];
  const L = rnd(3.4, 5.2);
  for (const sx of [-1, 1]) {
    p.push(part(new THREE.CylinderGeometry(0.11, 0.13, 3.1, 7), TIMBER_D, sx * L * 0.5, 1.55, 0));
    p.push(part(new THREE.BoxGeometry(0.9, 0.12, 0.9), TIMBER_D, sx * L * 0.5, 0.06, 0));
  }
  p.push(part(new THREE.CylinderGeometry(0.08, 0.08, L, 6), TIMBER, 0, 3.0, 0, 0, 0, Math.PI / 2));
  // the hanging cloths, each a slightly different drop so the row is not a comb
  const n = 3 + ((Math.random() * 4) | 0);
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n, drop = rnd(1.3, 2.3);
    p.push(part(new THREE.BoxGeometry(0.52, drop, 0.06),
      pick([PAPER, PAPER, ROPE, VERM_D]), (t - 0.5) * L * 0.9, 3.0 - drop / 2, rnd(-0.06, 0.06),
      0, rnd(-0.12, 0.12), 0));
  }
  return mergedProp(p);
}

/** Guest luggage, stacked where it was set down: a wicker trunk, a bundle, a
 *  hat. A bathhouse's forecourt is where arrivals put things down. */
export function makeLuggage(): THREE.Object3D {
  const p: G[] = [];
  const k = rnd(0.75, 1.1);
  p.push(part(new THREE.BoxGeometry(1.2 * k, 0.62 * k, 0.8 * k), ROPE, 0, 0.31 * k, 0, 0, rnd(-0.3, 0.3), 0));
  p.push(part(new THREE.BoxGeometry(1.26 * k, 0.08 * k, 0.86 * k), TIMBER_D, 0, 0.64 * k, 0));
  if (Math.random() < 0.6)
    p.push(part(new THREE.BoxGeometry(0.8 * k, 0.4 * k, 0.62 * k), TIMBER, rnd(-0.15, 0.15) * k,
      0.88 * k, 0, 0, rnd(-0.5, 0.5), 0));
  else
    p.push(part(new THREE.ConeGeometry(0.55 * k, 0.3 * k, 9), ROPE, 0, 0.8 * k, 0, 0.2, 0, 0.1));
  return mergedProp(p);
}

/** A wooden tub of banked coals. Small, waist-low, and it is one of the few
 *  lights in the level that sits BELOW the eye — everything else hangs. */
export function makeCoalTub(): THREE.Group {
  const solid: G[] = [], glow: G[] = [];
  const k = rnd(0.8, 1.1);
  solid.push(part(new THREE.CylinderGeometry(0.46 * k, 0.4 * k, 0.6 * k, 9), TIMBER, 0, 0.3 * k, 0));
  solid.push(part(new THREE.TorusGeometry(0.46 * k, 0.05 * k, 4, 9), CHAR, 0, 0.5 * k, 0, Math.PI / 2, 0, 0));
  glow.push(part(new THREE.CylinderGeometry(0.38 * k, 0.34 * k, 0.1 * k, 9), G_GRIDDLE, 0, 0.6 * k, 0));
  for (let i = 0; i < 3; i++)
    glow.push(part(new THREE.SphereGeometry(0.07 * k, 5, 4), G_WARM,
      rnd(-0.25, 0.25) * k, 0.66 * k, rnd(-0.25, 0.25) * k));
  return lit(solid, glow);
}

/** A rack of small wooden prayer plaques, hung five deep and swinging. The
 *  shrine and the bridge both get these; on the bridge they are what people
 *  are stopping FOR. */
export function makeWishRack(): THREE.Object3D {
  const p: G[] = [];
  const L = rnd(2.2, 3.4);
  for (const sx of [-1, 1]) p.push(part(new THREE.BoxGeometry(0.14, 2.1, 0.14), TIMBER_D, sx * L * 0.5, 1.05, 0));
  p.push(part(new THREE.BoxGeometry(L + 0.3, 0.16, 0.24), TIMBER, 0, 2.16, 0));
  p.push(part(new THREE.BoxGeometry(L + 0.5, 0.1, 0.34), TILE_D, 0, 2.3, 0));
  for (let i = 0; i < 14; i++) {
    const x = rnd(-0.45, 0.45) * L, y = rnd(1.1, 1.9), z = rnd(-0.12, 0.12);
    p.push(part(new THREE.BoxGeometry(0.3, 0.24, 0.03), PAPER, x, y, z, 0, rnd(-0.4, 0.4), rnd(-0.25, 0.25)));
  }
  return mergedProp(p);
}

/** Votive sake barrels, stacked in a wall two high. Straw-wrapped, painted,
 *  and stacked at every shrine there has ever been. */
export function makeSakeBarrels(): THREE.Object3D {
  const p: G[] = [];
  const n = 2 + ((Math.random() * 3) | 0);
  for (let row = 0; row < 2; row++) {
    const m = row === 0 ? n : Math.max(1, n - 1);
    for (let i = 0; i < m; i++) {
      const x = (i - (m - 1) / 2) * 0.92;
      p.push(part(new THREE.CylinderGeometry(0.44, 0.44, 0.86, 10), ROPE, x, 0.43 + row * 0.9, 0, Math.PI / 2, 0, 0));
      p.push(part(new THREE.CylinderGeometry(0.45, 0.45, 0.1, 10), row % 2 ? VERM : PAPER,
        x, 0.43 + row * 0.9, 0.43, Math.PI / 2, 0, 0));
      p.push(part(new THREE.TorusGeometry(0.44, 0.045, 4, 10), TIMBER_D, x, 0.43 + row * 0.9, 0.2, 0, 0, 0));
    }
  }
  return mergedProp(p);
}

/** An open paper umbrella, leaned against nothing in particular. Two of these
 *  in a frame do more for "this is a spirit market" than twenty crates. */
export function makeUmbrella(): THREE.Object3D {
  const p: G[] = [];
  const k = rnd(0.85, 1.15), tip = rnd(-0.5, 0.5);
  const col = pick([VERM, VERM_D, PAPER, TILE]);
  p.push(part(new THREE.ConeGeometry(1.05 * k, 0.62 * k, 12, 1, true), col, 0, 1.72 * k, 0, tip, 0, tip * 0.7));
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    p.push(part(new THREE.BoxGeometry(1.02 * k, 0.03, 0.05), TIMBER_D,
      Math.cos(a) * 0.5 * k, 1.62 * k, Math.sin(a) * 0.5 * k, tip, -a, tip * 0.7 - 0.28));
  }
  p.push(part(new THREE.CylinderGeometry(0.05, 0.05, 2.1 * k, 6), TIMBER,
    tip * 1.0 * k, 0.95 * k, tip * 0.7 * k, tip, 0, tip * 0.7));
  return mergedProp(p);
}

/** A low tray table with skewers and cups on it — the thing you actually sit
 *  down in front of. Tiny, and there should be a great many. */
export function makeSkewerTray(): THREE.Object3D {
  const p: G[] = [];
  const k = rnd(0.8, 1.1);
  p.push(part(new THREE.BoxGeometry(1.05 * k, 0.09 * k, 0.75 * k), CEDAR, 0, 0.28 * k, 0));
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as [number, number][])
    p.push(part(new THREE.BoxGeometry(0.08 * k, 0.28 * k, 0.08 * k), CEDAR_D, sx * 0.42 * k, 0.14 * k, sz * 0.28 * k));
  for (let i = 0; i < 3; i++)
    p.push(part(new THREE.CylinderGeometry(0.12 * k, 0.12 * k, 0.11 * k, 8), PAPER,
      rnd(-0.35, 0.35) * k, 0.38 * k, rnd(-0.22, 0.22) * k));
  for (let i = 0; i < 3; i++)
    p.push(part(new THREE.BoxGeometry(0.5 * k, 0.04, 0.04), TIMBER_D,
      rnd(-0.2, 0.2) * k, 0.35 * k, rnd(-0.25, 0.25) * k, 0, rnd(0, 3.1), 0));
  return mergedProp(p);
}

/** A mossy boulder. The valley wall is a quarter of the map and it had bamboo
 *  and nothing else; a rim of pure verticals reads as a fence. */
export function makeMossRock(): THREE.Object3D {
  const p: G[] = [];
  const k = rnd(0.7, 1.7);
  p.push(part(new THREE.DodecahedronGeometry(k, 0), STONE_D, 0, k * 0.52, 0,
    rnd(0, 3), rnd(0, 3), rnd(0, 3)));
  // moss on the up-facing side only, which is where moss is
  p.push(part(new THREE.SphereGeometry(k * 0.78, 7, 5, 0, 6.28, 0, 1.0), GREEN,
    rnd(-0.1, 0.1) * k, k * 0.72, rnd(-0.1, 0.1) * k, 0, rnd(0, 3), 0, 1, 0.5, 1));
  if (Math.random() < 0.35)
    p.push(part(new THREE.DodecahedronGeometry(k * 0.45, 0), STONE,
      k * rnd(0.7, 1.1), k * 0.24, k * rnd(-0.6, 0.6), rnd(0, 3), rnd(0, 3), rnd(0, 3)));
  return mergedProp(p);
}

/** A clump of ferns. Ground cover for the rim — low, wide and dark, which is
 *  what breaks a flat floor without adding another silhouette at eye level. */
export function makeFernClump(): THREE.Object3D {
  const p: G[] = [];
  const n = 5 + ((Math.random() * 5) | 0);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rnd(-0.3, 0.3), L = rnd(0.9, 1.7);
    p.push(part(new THREE.BoxGeometry(L, 0.05, 0.3), i % 2 ? GREEN : GREEN_L,
      Math.cos(a) * L * 0.42, rnd(0.25, 0.5), Math.sin(a) * L * 0.42,
      0, -a, rnd(-0.5, -0.2)));
  }
  return mergedProp(p, PROP_SMOOTH_MAT);
}

/** A weathered path marker: a squared post with a carved face, half sunk.
 *  Reads at distance as "somebody made this path". */
export function makePathPost(): THREE.Object3D {
  const p: G[] = [];
  const h = rnd(1.0, 1.9), lean = rnd(-0.18, 0.18);
  p.push(part(new THREE.BoxGeometry(0.24, h, 0.24), STONE, 0, h / 2, 0, lean, rnd(0, 1.5), lean * 0.5));
  p.push(part(new THREE.BoxGeometry(0.3, 0.1, 0.3), STONE_D, lean * h * 0.5, h, 0));
  return mergedProp(p);
}

/** A two-wheeled food cart with a hot griddle. Bigger than a stall's clutter
 *  and smaller than a stall — the mid-size meal the market was short of. */
export function makeFoodCart(): THREE.Group {
  const solid: G[] = [], glow: G[] = [];
  solid.push(part(new THREE.BoxGeometry(2.8, 0.8, 1.5), TIMBER, 0, 0.95, 0));
  solid.push(part(new THREE.BoxGeometry(2.9, 0.12, 1.6), TIMBER_D, 0, 1.4, 0));
  for (const sz of [-1, 1])
    solid.push(part(new THREE.CylinderGeometry(0.55, 0.55, 0.14, 12), CHAR, -0.5, 0.55, sz * 0.82, 0, 0, Math.PI / 2));
  solid.push(part(new THREE.CylinderGeometry(0.07, 0.07, 1.6, 6), TIMBER_D, 1.6, 0.9, 0, 0, 0, 0.5));
  // the griddle, and the awning over it
  glow.push(part(new THREE.BoxGeometry(1.2, 0.08, 1.1), G_GRIDDLE, -0.6, 1.48, 0));
  solid.push(part(new THREE.BoxGeometry(3.0, 0.1, 1.8), VERM, 0, 2.7, 0));
  for (const sx of [-1, 1]) solid.push(part(new THREE.BoxGeometry(0.09, 1.3, 0.09), TIMBER_D, sx * 1.3, 2.05, 0.7));
  glow.push(part(new THREE.CylinderGeometry(0.2, 0.24, 0.3, 8), G_AMBER, 1.2, 2.45, 0));
  // steam off the griddle
  for (let i = 0; i < 3; i++)
    solid.push(part(new THREE.SphereGeometry(rnd(0.2, 0.36), 6, 5), PAPER,
      -0.6 + rnd(-0.3, 0.3), 1.8 + i * 0.3, rnd(-0.3, 0.3), 0, 0, 0, 1, 0.6, 1));
  return lit(solid, glow);
}

/** A carp streamer on a tall pole. Pure vertical accent — the level is a
 *  valley seen from above and it needed something that reads from the air. */
export function makeKoiFlag(): THREE.Object3D {
  const p: G[] = [];
  const H = rnd(5.5, 8.0), bend = rnd(-0.2, 0.2);
  p.push(part(new THREE.CylinderGeometry(0.07, 0.11, H, 6), TIMBER_D, 0, H / 2, 0, bend * 0.3, 0, bend * 0.3));
  const n = 2 + ((Math.random() * 2) | 0);
  for (let i = 0; i < n; i++) {
    const y = H - 0.6 - i * rnd(1.3, 1.8), L = rnd(1.6, 2.4);
    const col = [VERM, TILE, PAPER][i % 3];
    p.push(part(new THREE.ConeGeometry(0.34, L, 7, 1, true), col,
      L * 0.5 + 0.2, y, 0, 0, 0, -Math.PI / 2 + rnd(-0.15, 0.15)));
    p.push(part(new THREE.SphereGeometry(0.11, 6, 5), CHAR, 0.3, y, 0));
  }
  return mergedProp(p);
}

/** A potted plant on the terrace: a glazed pot with something clipped in it.
 *  Small, everywhere, and the fastest way to make decking look kept. */
export function makePotPlant(): THREE.Object3D {
  const p: G[] = [];
  const k = rnd(0.75, 1.2);
  p.push(part(new THREE.CylinderGeometry(0.34 * k, 0.26 * k, 0.46 * k, 9), pick([TILE, VERM_D, STONE_D]), 0, 0.23 * k, 0));
  p.push(part(new THREE.TorusGeometry(0.34 * k, 0.04 * k, 4, 9), TILE_D, 0, 0.45 * k, 0, Math.PI / 2, 0, 0));
  if (Math.random() < 0.55) {
    p.push(part(new THREE.SphereGeometry(0.42 * k, 7, 5), GREEN, 0, 0.82 * k, 0, 0, 0, 0, 1, 0.8, 1));
  } else {
    p.push(part(new THREE.CylinderGeometry(0.05, 0.06, 0.9 * k, 5), TIMBER_D, 0, 0.85 * k, 0));
    for (let i = 0; i < 4; i++)
      p.push(part(new THREE.BoxGeometry(0.5 * k, 0.04, 0.16 * k), GREEN_L,
        rnd(-0.2, 0.2), 0.9 * k + i * 0.15 * k, rnd(-0.2, 0.2), 0, rnd(0, 6.28), rnd(-0.4, 0.4)));
  }
  return mergedProp(p);
}

/** A low square stair lantern, the kind set into the edge of a step run.
 *  Radius 0.5 and it burns — this is the small-food workhorse of the pass. */
export function makeStepLantern(): THREE.Group {
  const solid: G[] = [], glow: G[] = [];
  solid.push(part(new THREE.BoxGeometry(0.44, 0.1, 0.44), STONE_D, 0, 0.05, 0));
  solid.push(part(new THREE.BoxGeometry(0.16, 0.36, 0.16), CHAR, 0, 0.26, 0));
  glow.push(part(new THREE.BoxGeometry(0.36, 0.34, 0.36), G_PAPER, 0, 0.6, 0));
  solid.push(part(new THREE.BoxGeometry(0.46, 0.07, 0.46), TILE_D, 0, 0.8, 0));
  return lit(solid, glow);
}

// ══════════════════════════════════════════════════════════════════════════
//  THE LADDER
//  A census of what a LATE void can eat, across all four worlds, found this
//  one starved: 22 props at radius 4 or above out of 5,293, which is 0.4% of
//  the level against GAME DAY's 2.1%. Worse than the count is the shape — the
//  distribution has a CLIFF in it:
//
//     0-1: 2509   1-2: 1423   2-3: 1337   3-4: 2   4-5: 19   ...   11: 1
//
//  Two props in the whole 3-to-4 band, nothing at all between 6 and the
//  bathhouse at 11. So the last minute of a match, when the hero is a WORLD
//  ENDER sixteen metres across, is spent hoovering crumbs — and the one thing
//  worth eating is the building the match ends on. GAME DAY, which measured a
//  monotonically accelerating match, has 895 props in that same 3-4 band and a
//  smooth run of sizes all the way to its stadium.
//
//  These are the missing rungs. And the first of them is not an invention:
//  THE DRUM TOWER is already in this world's fiction — it names an entire
//  newsroom tier, it is the third match beat ("The drum has started"), and its
//  headline reads "The drum tower has begun." A child hears that, looks up,
//  and there is nothing there.
// ══════════════════════════════════════════════════════════════════════════

/** THE DRUM TOWER (yagura). A timber scaffold with a great drum on top, the
 *  thing that starts and ends a festival. It is struck for two reasons — to
 *  call people in, and to warn them — and the level's third beat is the moment
 *  a child learns which one this is. Tall, open-framed and lit from inside, so
 *  it reads from anywhere in the valley. */
export function makeDrumTower(): THREE.Group {
  const solid: G[] = [], glow: G[] = [];
  const H = 13, W = 5.4;
  // four legs, battered inward — a straight-sided tower reads as a box
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const lean = 0.055 * sx, leanZ = 0.055 * sz;
    solid.push(part(new THREE.BoxGeometry(0.5, H, 0.5), TIMBER,
      sx * W * 0.5, H / 2, sz * W * 0.5, -leanZ, 0, lean));
  }
  // cross-bracing on three levels — this is the silhouette
  for (let lv = 1; lv <= 3; lv++) {
    const y = (H / 4) * lv, w2 = W * (1 - 0.03 * lv);
    for (const sz of [-1, 1]) {
      solid.push(part(new THREE.BoxGeometry(w2 * 1.06, 0.28, 0.28), TIMBER_D, 0, y, sz * w2 * 0.5));
      solid.push(part(new THREE.BoxGeometry(w2 * 1.4, 0.2, 0.2), TIMBER_D, 0, y - H / 9, sz * w2 * 0.5, 0, 0, 0.62));
    }
    for (const sx of [-1, 1]) {
      solid.push(part(new THREE.BoxGeometry(0.28, 0.28, w2 * 1.06), TIMBER_D, sx * w2 * 0.5, y, 0));
      solid.push(part(new THREE.BoxGeometry(0.2, 0.2, w2 * 1.4), TIMBER_D, sx * w2 * 0.5, y - H / 9, 0, 0.62, 0, 0));
    }
  }
  // the platform
  solid.push(part(new THREE.BoxGeometry(W * 1.5, 0.4, W * 1.5), CEDAR, 0, H, 0));
  solid.push(part(new THREE.BoxGeometry(W * 1.56, 0.16, W * 1.56), CEDAR_D, 0, H - 0.24, 0));
  // a rail, and the red-and-white festival cloth hung from it
  for (const sz of [-1, 1]) {
    solid.push(part(new THREE.BoxGeometry(W * 1.5, 0.14, 0.14), TIMBER, 0, H + 1.1, sz * W * 0.74));
    for (let i = 0; i < 7; i++)
      solid.push(part(new THREE.BoxGeometry(W * 0.21, 0.9, 0.05), i % 2 ? VERM : PAPER,
        (i - 3) * W * 0.22, H + 0.62, sz * W * 0.75));
  }
  for (const sx of [-1, 1]) {
    solid.push(part(new THREE.BoxGeometry(0.14, 0.14, W * 1.5), TIMBER, sx * W * 0.74, H + 1.1, 0));
    for (let i = 0; i < 7; i++)
      solid.push(part(new THREE.BoxGeometry(0.05, 0.9, W * 0.21), i % 2 ? VERM : PAPER,
        sx * W * 0.75, H + 0.62, (i - 3) * W * 0.22));
  }
  // THE DRUM. Barrel on its side on a stand, skins facing out, struck from
  // both ends — this is the object the whole prop exists for, so it is big.
  solid.push(part(new THREE.CylinderGeometry(1.5, 1.5, 2.2, 14), VERM_D, 0, H + 1.9, 0, 0, 0, Math.PI / 2));
  for (const sx of [-1, 1])
    solid.push(part(new THREE.CylinderGeometry(1.56, 1.56, 0.16, 14), ROPE, sx * 1.12, H + 1.9, 0, 0, 0, Math.PI / 2));
  solid.push(part(new THREE.TorusGeometry(1.52, 0.09, 4, 14), CHAR, 0, H + 1.9, 0, 0, Math.PI / 2, 0));
  for (const sx of [-1, 1])
    solid.push(part(new THREE.BoxGeometry(0.24, 2.0, 0.24), TIMBER_D, sx * 1.9, H + 1.0, 0, 0, 0, sx * 0.28));
  // the little roof over it, and the light under that roof
  solid.push(part(new THREE.ConeGeometry(W * 1.15, 1.9, 4), TILE, 0, H + 4.6, 0, 0, Math.PI / 4));
  solid.push(part(new THREE.BoxGeometry(W * 1.5, 0.18, W * 1.5), TILE_D, 0, H + 3.66, 0));
  for (const sx of [-1, 1]) for (const sz of [-1, 1])
    solid.push(part(new THREE.BoxGeometry(0.18, 1.9, 0.18), TIMBER, sx * W * 0.66, H + 2.7, sz * W * 0.66));
  glow.push(part(new THREE.BoxGeometry(W * 1.2, 0.12, W * 1.2), G_WARM, 0, H + 3.5, 0));
  // paper lanterns down each corner post, which is what makes it a beacon
  for (const sx of [-1, 1]) for (const sz of [-1, 1])
    for (let k = 0; k < 4; k++) {
      const y = 2.2 + k * 3.0;
      glow.push(part(new THREE.CylinderGeometry(0.34, 0.4, 0.5, 8), k % 2 ? G_RED : G_AMBER,
        sx * W * 0.62, y, sz * W * 0.62));
      glow.push(part(new THREE.CylinderGeometry(0.4, 0.34, 0.5, 8), k % 2 ? G_RED : G_AMBER,
        sx * W * 0.62, y - 0.5, sz * W * 0.62));
    }
  const g = lit(solid, glow);
  // named so the drum BEAT can find it: "The drum has started" now points at
  // a tower that visibly thumps — see the beat cue in prototype3d.ts
  g.name = 'drumTower';
  return g;
}

/** THE SHRINE HALL (honden). What the stone stair has been climbing toward the
 *  whole match, and until now the stair went nowhere. Deep eaves, a heavy
 *  ridge, vermilion posts and a dark interior with one lamp in it. */
export function makeShrineHall(): THREE.Group {
  const solid: G[] = [], glow: G[] = [];
  const W = 11, D = 8, H = 5.2;
  solid.push(part(new THREE.BoxGeometry(W * 1.3, 1.0, D * 1.4), STONE_D, 0, 0.5, 0));
  solid.push(part(new THREE.BoxGeometry(W * 1.18, 0.5, D * 1.28), STONE, 0, 1.2, 0));
  solid.push(part(new THREE.BoxGeometry(W, H, D), CEDAR_D, 0, 1.45 + H / 2, 0));
  // the pillars, which is what says shrine rather than shed
  for (const sx of [-1, 1]) for (let i = 0; i < 4; i++)
    solid.push(part(new THREE.CylinderGeometry(0.34, 0.38, H, 8), VERM,
      sx * W * 0.5, 1.45 + H / 2, -D * 0.36 + i * D * 0.24));
  for (const sz of [-1, 1]) for (let i = 0; i < 5; i++)
    solid.push(part(new THREE.CylinderGeometry(0.34, 0.38, H, 8), VERM,
      -W * 0.4 + i * W * 0.2, 1.45 + H / 2, sz * D * 0.5));
  // the dark interior, with a single lamp
  glow.push(part(new THREE.BoxGeometry(W * 0.5, 1.6, 0.12), G_WARM, 0, 3.4, D * 0.5 + 0.08));
  glow.push(part(new THREE.SphereGeometry(0.5, 8, 6), G_AMBER, 0, 4.2, 0));
  // ROOF: two deep pitched planes with a heavy ridge and upswept ends
  const RY = 1.45 + H;
  solid.push(part(new THREE.BoxGeometry(W * 1.42, 0.5, D * 1.5), TILE, 0, RY + 0.3, 0));
  for (const sz of [-1, 1])
    solid.push(part(new THREE.BoxGeometry(W * 1.42, 0.44, D * 0.86), TILE,
      0, RY + 1.3, sz * D * 0.42, sz * -0.42, 0, 0));
  solid.push(part(new THREE.BoxGeometry(W * 1.5, 0.7, 0.9), TILE_D, 0, RY + 2.2, 0));
  for (const sx of [-1, 1]) for (const sz of [-1, 1])
    solid.push(part(new THREE.BoxGeometry(2.4, 0.4, 1.1), TILE,
      sx * W * 0.66, RY + 0.7, sz * D * 0.72, 0, sx * sz * 0.6, sx * -0.3));
  // the crossed finials along the ridge
  for (const sx of [-1, 1]) for (const k of [-1, 1])
    solid.push(part(new THREE.BoxGeometry(0.2, 2.4, 0.2), CHAR,
      sx * W * 0.42, RY + 3.0, 0, 0, 0, k * 0.38));
  // a lantern each side of the door
  for (const sx of [-1, 1]) {
    glow.push(part(new THREE.CylinderGeometry(0.4, 0.48, 0.6, 8), G_RED, sx * 2.6, 3.6, D * 0.56));
    glow.push(part(new THREE.CylinderGeometry(0.48, 0.4, 0.6, 8), G_RED, sx * 2.6, 3.0, D * 0.56));
  }
  return lit(solid, glow);
}

/** A KURA — the white-plastered, black-roofed storehouse every market street
 *  has one or two of. Fireproof, windowless and deliberately dull, which is
 *  exactly what a run of them does for a skyline full of lanterns. */
export function makeKura(): THREE.Group {
  const solid: G[] = [], glow: G[] = [];
  const W = rnd(5.0, 6.4), D = rnd(4.2, 5.2), H = rnd(4.6, 5.8);
  solid.push(part(new THREE.BoxGeometry(W * 1.08, 0.6, D * 1.08), STONE_D, 0, 0.3, 0));
  solid.push(part(new THREE.BoxGeometry(W, H, D), PAPER, 0, 0.6 + H / 2, 0));
  // the black plinth band and the corner quoins, which is the look
  solid.push(part(new THREE.BoxGeometry(W * 1.02, H * 0.22, D * 1.02), CHAR, 0, 0.6 + H * 0.11, 0));
  for (const sx of [-1, 1]) for (const sz of [-1, 1])
    solid.push(part(new THREE.BoxGeometry(0.35, H, 0.35), TILE_D, sx * W * 0.5, 0.6 + H / 2, sz * D * 0.5));
  // one heavy door, banded
  solid.push(part(new THREE.BoxGeometry(W * 0.3, H * 0.5, 0.2), TILE_D, 0, 0.6 + H * 0.27, D * 0.5));
  glow.push(part(new THREE.BoxGeometry(W * 0.22, 0.16, 0.1), G_AMBER, 0, 0.6 + H * 0.42, D * 0.54));
  // the roof: a simple heavy hip with a big overhang
  const RY = 0.6 + H;
  solid.push(part(new THREE.BoxGeometry(W * 1.3, 0.44, D * 1.32), TILE, 0, RY + 0.22, 0));
  solid.push(part(new THREE.BoxGeometry(W * 1.05, 0.9, D * 1.06), TILE_D, 0, RY + 0.9, 0));
  solid.push(part(new THREE.BoxGeometry(W * 1.12, 0.4, 0.7), TILE, 0, RY + 1.42, 0));
  return lit(solid, glow);
}

/** A MARKET SHED — a covered row, three or four pitches under one roof. This
 *  is the 3-to-4 rung specifically: bigger than a stall, smaller than a
 *  building, and it is what a market street is actually made of once you stop
 *  drawing every stall separately. */
export function makeMarketShed(): THREE.Group {
  const solid: G[] = [], glow: G[] = [];
  const bays = 3 + ((Math.random() * 2) | 0);
  const BW = 3.0, D = 3.4, H = 2.9;
  const W = bays * BW;
  for (let i = 0; i <= bays; i++) {
    const x = -W / 2 + i * BW;
    for (const sz of [-1, 1])
      solid.push(part(new THREE.BoxGeometry(0.22, H, 0.22), TIMBER, x, H / 2, sz * D * 0.5));
  }
  solid.push(part(new THREE.BoxGeometry(W + 0.6, 0.2, D + 0.5), TIMBER_D, 0, H, 0));
  // one long pitched canopy — vermilion, because at night the moon is
  // deliberately too weak to light anything and PAPER photographs as grey
  for (const sz of [-1, 1])
    solid.push(part(new THREE.BoxGeometry(W + 0.9, 0.18, D * 0.66), VERM,
      0, H + 0.62, sz * D * 0.26, sz * -0.5, 0, 0));
  solid.push(part(new THREE.BoxGeometry(W + 1.0, 0.24, 0.34), VERM_D, 0, H + 1.16, 0));
  // counters and the lit interior of each bay
  for (let i = 0; i < bays; i++) {
    const x = -W / 2 + BW * (i + 0.5);
    solid.push(part(new THREE.BoxGeometry(BW * 0.86, 0.9, 0.7), TIMBER, x, 0.45, D * 0.4));
    solid.push(part(new THREE.BoxGeometry(BW * 0.9, 0.14, 0.85), CEDAR, x, 0.95, D * 0.4));
    glow.push(part(new THREE.BoxGeometry(BW * 0.7, 0.9, 0.1), i % 2 ? G_PAPER : G_AMBER, x, 1.8, -D * 0.2));
    if (Math.random() < 0.5)
      glow.push(part(new THREE.BoxGeometry(BW * 0.4, 0.1, 0.6), G_GRIDDLE, x, 1.04, D * 0.4));
    glow.push(part(new THREE.CylinderGeometry(0.26, 0.32, 0.42, 8), G_RED, x, H - 0.3, D * 0.42));
    glow.push(part(new THREE.CylinderGeometry(0.32, 0.26, 0.42, 8), G_RED, x, H - 0.72, D * 0.42));
  }
  return lit(solid, glow);
}
