// Canonical VOIDLING palette — extracted from the 2D game so the 3D level
// matches it exactly. Hex sources noted; see src/game/voidling.ts, config.ts,
// drawMap.ts.
import * as THREE from 'three';

const c = (hex: number) => new THREE.Color(hex);

// ── the void (stage 0 / "classic" default) ──────────────────────────────────
// The 2D orb is a pit into space: darkest dead-centre, lit violet at the rim.
// Tuned toward a rich VIOLET purple (the 2D look) rather than blue-indigo.
export const VOID = {
  abyss: 0x180b30,      // gradient centre — deep, but not pure black
  bodyInner: 0x3a1c68,  // inner
  bodyMid: 0x6a3a9e,    // mid-body — grape purple (more red = less "blue")
  bodyRim: 0x9d5fd0,    // lit amethyst rim
  rimLight: 0x9d5fd0,   // luminous event-horizon rim
  glow: 0xac6cff,       // soft amethyst aura
  swirl: 0xc9a6ff,      // faint interior swirl arcs
  star: 0xffffff,       // interior star specks
  pupil: 0x160a30,
  sclera: 0xffffff,
  blush: 0xff7da8,
  mouth: 0x1a0b33,
  spark: 0xfff0c8,      // warm-white companion spark
};

// ── world terrain (drawMap COL) ─────────────────────────────────────────────
export const WORLD = {
  space: 0x0d0821,       // cosmic backdrop the island floats in
  haloFar: 0x7b4fe0,     // wide violet energy halo off the island edge
  haloNear: 0xa87bff,    // brighter inner violet halo
  rimWhite: 0xffffff,    // island white "sticker" rim + surf foam
  cliff: 0x6b5b73,       // island cliff band
  // deepened toward the 2D COMPOSITE (flat colour + soft-light grass wash) so
  // the world reads rich, not pastel-washed
  meadow: 0x82c565,      // base grass
  park: 0x94d878,        // park grass (brighter)
  forest: 0x67b25c,      // forest ground
  sand: 0xf6e3a4,        // beach sand
  pavement: 0xefeff4,    // plaza / sidewalk
  road: 0x767e9a,        // asphalt (cool lavender-gray)
  roadLine: 0xdce3ee,    // lane paint
  waterShallow: 0x7fd4e8,
  waterDeep: 0x5bb8d4,
  riverMid: 0x8fc6d4,
  riverDeep: 0x69a9c2,
  foam: 0xe9f6ff,
  zooGround: 0xd8cc96,
  dirtPath: 0xcfc0a0,
  mountainBack: 0x66708a,
  mountainFront: 0x4e576b,
  snow: 0xf2f6ff,
};

// ── props (buildings/trees/etc — matched to the 2D toy-city screenshot) ──────
export const PROPS = {
  // pastel house walls
  house: [0xbfe0cf, 0xc9b8e8, 0xf2c9a0, 0xa9c4e8, 0xeab8cc, 0xf0e6d2, 0xb8d8c8, 0xd8c8ec],
  // warm-but-clean roofs (terracotta / slate / teal — no mud)
  roof: [0xc97f5a, 0x6a6480, 0xb5654a, 0x6fa8a0, 0xcf8a63, 0x746e8c],
  // downtown towers — cooler pastels + glass
  tower: [0xff8a7a, 0x5ec8d8, 0xf7c85a, 0x8fa9d8, 0xf6efe2, 0xb98cff, 0x7ed57a, 0xff9fbf],
  towerGlass: 0x2c3a52,
  car: [0xff5a4d, 0x2f9bd8, 0xffd23f, 0x7ed57a, 0xf06fb0, 0x9fe8f0, 0xf2f4f8, 0xb98cff],
  carGlass: 0xbfeaff,
  foliage: [0x5dbe63, 0x4faa5a, 0x6cc86e],
  pine: 0x3e9a54,
  trunk: 0x8a6a4a,
  person: [0xff7a5a, 0x5ec8d8, 0xffd23f, 0x8fa9d8, 0xf06fb0, 0x9b7bd8, 0xffffff, 0x7ed57a],
  skin: [0xf4c9a0, 0xe0a878, 0xc98a5a, 0xffd9b0],
};

// pre-built THREE.Color instances for the void shader (avoids per-frame alloc)
export const VOID_COL = {
  abyss: c(VOID.abyss),
  bodyMid: c(VOID.bodyMid),
  bodyRim: c(VOID.bodyRim),
  glow: c(VOID.glow),
};
