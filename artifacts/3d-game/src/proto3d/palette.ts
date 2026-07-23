// Canonical VOIDLING palette — extracted from the 2D game so the 3D level
// matches it exactly. Hex sources noted; see src/game/voidling.ts, config.ts,
// drawMap.ts.
import * as THREE from 'three';

const c = (hex: number) => new THREE.Color(hex);

// ── the void (stage 0 / "classic" default) ──────────────────────────────────
// The 2D orb is a pit into space: darkest dead-centre, lit violet at the rim.
// Tuned toward a rich VIOLET purple (the 2D look) rather than blue-indigo.
export const VOID = {
  // warmed toward true PURPLE (more red, less indigo) — matches the key art
  abyss: 0x1c0930,      // gradient centre — deep space core
  bodyInner: 0x431677,  // inner
  bodyMid: 0x7030c0,    // mid-body — vivid warm purple
  bodyRim: 0xa562f2,    // lit warm-violet rim (crisp, high contrast vs core)
  rimLight: 0xa562f2,   // luminous event-horizon rim
  glow: 0xb875ff,       // warm amethyst aura
  swirl: 0xd4b2ff,      // faint interior swirl arcs
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

// ── skins: void identity colour sets (ported from the 2D shop) ───────────────
// rarity tiers: colour skins (common, coins) → `tex` AI-texture skins (epic,
// coins) → `cash` LEGENDARY character skins (AI card art + 3D accessory `acc`,
// real-money tier — IAP lands with the App Store build)
export interface Skin {
  id: string; name: string;
  abyss: number; inner: number; mid: number; rim: number; glow: number;
  tex?: string;                                    // epic: AI texture wrap
  art?: string;                                    // legendary: AI card icon
  acc?: 'unicorn' | 'dino' | 'wizard' | 'king' | 'dragon' | 'mecha' | 'ninja';   // legendary: 3D accessory
  cash?: number;                                   // legendary: USD price
  streak?: number;                                 // unlock by daily play streak
}
export const SKINS: Skin[] = [
  { id: 'classic', name: 'Classic', abyss: 0x1c0930, inner: 0x431677, mid: 0x7030c0, rim: 0xa562f2, glow: 0xb875ff },
  { id: 'galaxy', name: 'Galaxy', abyss: 0x0d0821, inner: 0x241250, mid: 0x45248a, rim: 0x7a54d8, glow: 0xb98cff },
  { id: 'wizard', name: 'Violet', abyss: 0x1c1038, inner: 0x45308a, mid: 0x6a4ab8, rim: 0xa888e8, glow: 0xc9a6ff },
  { id: 'sunset', name: 'Sunset', abyss: 0x2e0f1e, inner: 0x7a2a4a, mid: 0xb8506a, rim: 0xff9a5a, glow: 0xffb86a },
  { id: 'toxic', name: 'Toxic', abyss: 0x0e2412, inner: 0x1e5a2a, mid: 0x3a9a4a, rim: 0x7ed57a, glow: 0xa8ff8a },
  { id: 'ocean', name: 'Ocean', abyss: 0x0a1830, inner: 0x1a4070, mid: 0x2a6ab8, rim: 0x5ec8d8, glow: 0x8ae8ff },
  { id: 'nebula', name: 'Nebula', abyss: 0x0d0821, inner: 0x241250, mid: 0x45248a, rim: 0x8a5cf0, glow: 0xb98cff, tex: '/assets/hf/hf_20260717_005240_697d3ae9-f61f-4f42-8ece-3b2413779221.png' },
  { id: 'magma', name: 'Magma', abyss: 0x1a0b06, inner: 0x51200a, mid: 0x8a3510, rim: 0xff7a2a, glow: 0xff9a4d, tex: '/assets/hf/hf_20260717_005242_6530bd58-bacd-4fc7-81f2-42796a5e163f.png' },
  { id: 'candy', name: 'Candy', abyss: 0x40182a, inner: 0x8a3a5e, mid: 0xd86a9a, rim: 0xffb8d8, glow: 0xffc9e2, tex: '/assets/hf/hf_20260717_005243_b9bfd850-ba19-4200-8b94-c91e7f8554a2.png' },
  { id: 'aurora', name: 'Aurora', abyss: 0x061a20, inner: 0x0e3a4a, mid: 0x1a6a78, rim: 0x5ee8d8, glow: 0x8affe8, tex: '/assets/hf/hf_20260717_005246_314c786a-72c9-4a63-889f-c09dd0c04199.png' },
  { id: 'honey', name: 'Honey', abyss: 0x2a1606, inner: 0x6a4210, mid: 0xb87f1a, rim: 0xffd25a, glow: 0xffe08a, tex: '/assets/hf/hf_20260717_131501_87fecffb-5637-49ad-87f5-106990a4f100.png' },
  { id: 'glacier', name: 'Glacier', abyss: 0x0a1c28, inner: 0x1a4a5e, mid: 0x3a8aa8, rim: 0x9fe8ff, glow: 0xc9f2ff, tex: '/assets/hf/hf_20260717_131503_47baaeac-a806-4062-9114-5b37f8279aeb.png' },
  { id: 'sherbet', name: 'Sherbet', abyss: 0x3a2030, inner: 0x8a4a62, mid: 0xd88aa0, rim: 0xffd2b8, glow: 0xffe2d2, tex: '/assets/hf/hf_20260717_131504_d3840e82-4c2b-4b68-8857-811dfcf85084.png' },
  { id: 'cyber', name: 'Cyber', abyss: 0x060d20, inner: 0x102a50, mid: 0x1a4a8a, rim: 0x4de8ff, glow: 0x7bffe8, tex: '/assets/hf/hf_20260717_131506_a3cc2f51-d953-4831-8531-1c3be1fedf97.png' },
  { id: 'blossom', name: 'Blossom', abyss: 0x38182a, inner: 0x7a3a55, mid: 0xc0688a, rim: 0xffb8cc, glow: 0xffd2e2, tex: '/assets/hf/hf_20260717_131508_1f6ff369-a72a-4d3a-9a37-2261344cde24.png' },
  { id: 'royal', name: 'Royal', abyss: 0x200a38, inner: 0x48207a, mid: 0x7a3ab8, rim: 0xd8a848, glow: 0xffd25a, tex: '/assets/hf/hf_20260717_131509_a28d269a-2130-4f39-9b72-b46f5c3ebbeb.png' },
  // 🔥 STREAK — come back daily to unlock (resets if you miss a day)
  { id: 'ember', name: 'Ember', abyss: 0x260a06, inner: 0x6a2410, mid: 0xc4571a, rim: 0xffb054, glow: 0xffcf7a, streak: 2 },
  { id: 'prism', name: 'Prism', abyss: 0x1a1030, inner: 0x4a2a8a, mid: 0x8a5ac8, rim: 0xe8b8ff, glow: 0xfff0a8, streak: 7 },
  // ✨ LEGENDARY — character skins with 3D accessories, cash tier
  { id: 'univoid', name: 'Uni-Void', abyss: 0x2a2038, inner: 0x8a7a9a, mid: 0xd8cce8, rim: 0xfff0fa, glow: 0xffc9e8, acc: 'unicorn', cash: 4.99,
    art: '/assets/hf/hf_20260717_221342_1fed1f77-b19c-416e-9e0d-e84a02a57845.png' },
  { id: 'rexling', name: 'Rexling', abyss: 0x0e2412, inner: 0x2a6a30, mid: 0x4a9a4a, rim: 0x8ae87a, glow: 0xb8ff8a, acc: 'dino', cash: 4.99,
    art: '/assets/hf/hf_20260723_181705_6e91b3cd-72f3-4867-817f-58dbd714d5a9.jpeg' },
  { id: 'archmage', name: 'Archmage', abyss: 0x0c0a2e, inner: 0x241a6a, mid: 0x3a2ab8, rim: 0x7a6af8, glow: 0xa89aff, acc: 'wizard', cash: 6.99,
    art: '/assets/hf/hf_20260717_221344_d766bd2d-ba32-4cf3-8ed0-fef26f6116b8.png' },
  { id: 'kingvoid', name: 'King Void', abyss: 0x2a1c06, inner: 0x6a4a10, mid: 0xb8861a, rim: 0xffd25a, glow: 0xffe8a0, acc: 'king', cash: 9.99,
    art: '/assets/hf/hf_20260717_221346_49c57d8f-d589-4a59-9c11-b5d96dbd9bc7.png' },
  { id: 'drako', name: 'Drako', abyss: 0x0e1c2a, inner: 0x1e4a5e, mid: 0x2a7a8a, rim: 0x5ee8d8, glow: 0xffb054, acc: 'dragon', cash: 7.99,
    art: '/assets/hf/hf_20260723_181409_a7a76db9-9711-48e8-9e0e-4f43188251d0.jpeg' },
  { id: 'mecha', name: 'Mecha-Void', abyss: 0x10141c, inner: 0x2a3a4a, mid: 0x4a6070, rim: 0x4de8ff, glow: 0x7bffe8, acc: 'mecha', cash: 5.99,
    art: '/assets/hf/hf_20260723_181412_8c2d9932-42ce-43ce-8027-299428ce21fc.jpeg' },
  { id: 'shadowninja', name: 'Shadow Ninja', abyss: 0x0a0612, inner: 0x1c1230, mid: 0x2e2048, rim: 0xff4d5e, glow: 0xff7a8a, acc: 'ninja', cash: 4.99,
    art: '/assets/hf/hf_20260723_181414_a23e8298-d3ea-47e4-bba9-d7a468fc88e1.jpeg' },
];

// pre-built THREE.Color instances for the void shader (avoids per-frame alloc)
export const VOID_COL = {
  abyss: c(VOID.abyss),
  bodyMid: c(VOID.bodyMid),
  bodyRim: c(VOID.bodyRim),
  glow: c(VOID.glow),
};
