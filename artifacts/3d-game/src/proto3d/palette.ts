// Canonical VOIDLING palette — extracted from the 2D game so the 3D level
// matches it exactly. Hex sources noted; see src/game/voidling.ts, config.ts,
// drawMap.ts.
import * as THREE from 'three';

const c = (hex: number) => new THREE.Color(hex);

// ── the void (stage 0 / "classic" default) ──────────────────────────────────
// The 2D orb is a pit into space: darkest dead-centre, lit violet at the rim.
// Tuned toward a rich VIOLET purple (the 2D look) rather than blue-indigo.
export const VOID = {
  // warmed toward true PURPLE (more red, less indigo) — matches the key art.
  // Brightened: the face-on disc must read MEDIUM purple (cute plush toy),
  // never near-black — the abyss survives only as a small dark heart.
  abyss: 0x321253,      // gradient centre — deep space heart (small, not the whole face)
  bodyInner: 0x6128ad,  // inner — clearly purple even in shade
  bodyMid: 0x8f4ce6,    // mid-body — vivid warm purple
  bodyRim: 0xb678ff,    // lit warm-violet rim (crisp, high contrast vs core)
  rimLight: 0xb678ff,   // luminous event-horizon rim
  glow: 0xb875ff,       // warm amethyst aura
  swirl: 0xd4b2ff,      // faint interior swirl arcs
  star: 0xffffff,       // interior star specks
  pupil: 0x160a30,
  sclera: 0xffffff,
  blush: 0xff7da8,
  mouth: 0x4a1a68,      // warm dark plum smile — reads friendly, never a black slit
  spark: 0xfff0c8,      // warm-white companion spark
};

// ── world terrain (drawMap COL) ─────────────────────────────────────────────
export const WORLD = {
  space: 0x0d0821,       // cosmic backdrop the island floats in
  haloFar: 0x7b4fe0,     // wide violet energy halo off the island edge
  haloNear: 0xa87bff,    // brighter inner violet halo
  rimWhite: 0xffffff,    // island white "sticker" rim + surf foam
  cliff: 0x574a63,       // island cliff band
  // deepened toward the 2D COMPOSITE (flat colour + soft-light grass wash) so
  // the world reads rich, not pastel-washed
  // THE GROUND RAMP IS THE READ. A render audit sampled the framebuffer and
  // found adjacent large surfaces sitting on top of each other in luminance:
  // sand against pavement at 1.01:1, meadow against forest at 1.19, and Maple's
  // park reading 67% one flat colour. A district you cannot see the edge of is
  // not a district. Re-spaced so neighbours that actually meet on the map are
  // at least ~1.35:1 apart, keeping the hue families intact.
  meadow: 0x74c352,      // base grass
  park: 0x9ae878,        // park grass — was 0x86d766, 1.23 against meadow
  forest: 0x479046,      // forest ground — was 0x67b25c, 1.19 against meadow
  sand: 0xf6e3a4,        // beach sand
  pavement: 0xbcc4d4,    // plaza / sidewalk — was 0xe4e4ec, 1.01 against sand
  road: 0x6b7292,        // asphalt (cool lavender-gray)
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
// A LEGENDARY is a CHARACTER, not a colour swatch. `char` is what makes the
// in-game void actually look like the art on the card a player paid for:
// its eyes change shape, it wears a real silhouette, and it carries its own
// signature aura. (Five colours + one prop was never going to get there.)
export interface SkinChar {
  eyes?: 'star' | 'glow' | 'sleepy' | 'fierce';   // pupil treatment
  aura?: number;                                   // orbiting sparkle colour
  auraKind?: 'stars' | 'embers' | 'bubbles' | 'bolts';
  gloss?: number;                                  // extra specular punch (pearl/chrome)
  // SKIN OF THE BODY ITSELF — the thing that stops a legendary reading as
  // "a void wearing a hat". Drawn procedurally in the body shader.
  pattern?: 'scales' | 'chrome' | 'fur' | 'starfield' | 'stitch';
  patCol?: number;                                 // pattern tint
  body?: 'snout' | 'muzzle' | 'mane' | 'visor';    // extra body geometry (not a prop)
}
export interface Skin {
  id: string; name: string;
  abyss: number; inner: number; mid: number; rim: number; glow: number;
  tex?: string;                                    // epic: AI texture wrap
  art?: string;                                    // legendary: AI card icon
  acc?: 'unicorn' | 'dino' | 'wizard' | 'king' | 'dragon' | 'mecha' | 'ninja';   // legendary: 3D accessory
  char?: SkinChar;                                 // legendary: full character rig
  cash?: number;                                   // legendary: USD price
  streak?: number;                                 // unlock by daily play streak
}
export const SKINS: Skin[] = [
  { id: 'classic', name: 'Classic', abyss: 0x321253, inner: 0x6128ad, mid: 0x8f4ce6, rim: 0xb678ff, glow: 0xb875ff },
  // Toxic pushed off Rexling's deep dinosaur green toward acid lime, so the
  // 150-coin skin no longer arrives first and undercuts the $4.99 one.
  { id: 'toxic', name: 'Toxic', abyss: 0x14300c, inner: 0x357a12, mid: 0x7ec832, rim: 0xc4ff6a, glow: 0xd8ff8a, tex: '/assets/hf/hf_20260717_005246_314c786a-72c9-4a63-889f-c09dd0c04199.png' },
  { id: 'sunset', name: 'Sunset', abyss: 0x2e0f1e, inner: 0x7a2a4a, mid: 0xb8506a, rim: 0xff9a5a, glow: 0xffb86a, tex: '/assets/hf/hf_20260717_005242_6530bd58-bacd-4fc7-81f2-42796a5e163f.png' },
  { id: 'ocean', name: 'Ocean', abyss: 0x0a1830, inner: 0x1a4070, mid: 0x2a6ab8, rim: 0x5ec8d8, glow: 0x8ae8ff, tex: '/assets/hf/hf_20260717_131506_a3cc2f51-d953-4831-8531-1c3be1fedf97.png' },
  { id: 'candy', name: 'Candy', abyss: 0x40182a, inner: 0x8a3a5e, mid: 0xd86a9a, rim: 0xffb8d8, glow: 0xffc9e2, tex: '/assets/hf/hf_20260717_005243_b9bfd850-ba19-4200-8b94-c91e7f8554a2.png' },
  // Honey's rim was byte-identical to King Void's (#ffd25a) — the gold that is
  // meant to make the $9.99 crown feel royal was already on a coin skin.
  { id: 'honey', name: 'Honey', abyss: 0x2a1606, inner: 0x6a4210, mid: 0xb87f1a, rim: 0xffb84a, glow: 0xffd486, tex: '/assets/hf/hf_20260717_131501_87fecffb-5637-49ad-87f5-106990a4f100.png' },
  // 🔥 STREAK — come back daily to unlock (resets if you miss a day)
  { id: 'ember', name: 'Ember', abyss: 0x260a06, inner: 0x6a2410, mid: 0xc4571a, rim: 0xffb054, glow: 0xffcf7a, streak: 2 },
  { id: 'prism', name: 'Prism', abyss: 0x1a1030, inner: 0x4a2a8a, mid: 0x8a5ac8, rim: 0xe8b8ff, glow: 0xfff0a8, streak: 7 },
  // ✨ LEGENDARY — character skins with 3D accessories, cash tier.
  // Colour stops are tuned to MATCH each skin's shop card art (App Store
  // advertising accuracy): the in-game orb must read as the same character.
  { id: 'univoid', name: 'Uni-Void', abyss: 0x342647, inner: 0xa890c8, mid: 0xe4d6f4, rim: 0xfff4ff, glow: 0xffc9e8, acc: 'unicorn', char: { eyes: 'star', aura: 0xffd2f0, auraKind: 'stars', gloss: 1.4, pattern: 'fur', patCol: 0xffe4ff, body: 'mane' }, cash: 4.99,
    art: '/assets/hf/hf_20260717_221342_1fed1f77-b19c-416e-9e0d-e84a02a57845.png' },
  { id: 'rexling', name: 'Rexling', abyss: 0x123018, inner: 0x2f8038, mid: 0x55b850, rim: 0x8ef07a, glow: 0xb8ff8a, acc: 'dino', char: { eyes: 'fierce', aura: 0xb8ff8a, auraKind: 'bubbles', gloss: 0.5, pattern: 'scales', patCol: 0x2a6a30, body: 'snout' }, cash: 4.99,
    art: '/assets/hf/hf_20260723_181705_6e91b3cd-72f3-4867-817f-58dbd714d5a9.jpeg' },
  { id: 'archmage', name: 'Archmage', abyss: 0x0e0c38, inner: 0x2c2088, mid: 0x4635d8, rim: 0x8878ff, glow: 0xb0a4ff, acc: 'wizard', char: { eyes: 'glow', aura: 0xa89aff, auraKind: 'stars', gloss: 0.7, pattern: 'starfield', patCol: 0xd8c8ff, body: 'mane' }, cash: 6.99,
    art: '/assets/hf/hf_20260717_221344_d766bd2d-ba32-4cf3-8ed0-fef26f6116b8.png' },
  // King Void card art: BLACK glossy orb with a purple-nebula heart, wrapped
  // in a swirling gold-stardust ring — body stays dark, the RIM is the gold
  { id: 'kingvoid', name: 'King Void', abyss: 0x0d0618, inner: 0x2e1552, mid: 0x4a2378, rim: 0xffd25a, glow: 0xffe8a0, acc: 'king', char: { eyes: 'glow', aura: 0xffd25a, auraKind: 'stars', gloss: 1.2, pattern: 'starfield', patCol: 0xffd25a }, cash: 9.99,
    art: '/assets/hf/hf_20260717_221346_49c57d8f-d589-4a59-9c11-b5d96dbd9bc7.png' },
  // Drako card art: teal-blue dragon orb, warm golden glow around the edges
  { id: 'drako', name: 'Drako', abyss: 0x0a2030, inner: 0x14536a, mid: 0x2394a8, rim: 0x5ee8d8, glow: 0xffb054, acc: 'dragon', char: { eyes: 'fierce', aura: 0xffb054, auraKind: 'embers', gloss: 0.9, pattern: 'scales', patCol: 0x1e6a7a, body: 'muzzle' }, cash: 7.99,
    art: '/assets/hf/hf_20260723_181409_a7a76db9-9711-48e8-9e0e-4f43188251d0.jpeg' },
  { id: 'mecha', name: 'Mecha-Void', abyss: 0x131a24, inner: 0x30485e, mid: 0x5e80a0, rim: 0x4de8ff, glow: 0x7bffe8, acc: 'mecha', char: { eyes: 'glow', aura: 0x4de8ff, auraKind: 'bolts', gloss: 1.6, pattern: 'chrome', patCol: 0x8fb0c8, body: 'visor' }, cash: 5.99,
    art: '/assets/hf/hf_20260723_181412_8c2d9932-42ce-43ce-8027-299428ce21fc.jpeg' },
  { id: 'shadowninja', name: 'Shadow Ninja', abyss: 0x0a0612, inner: 0x241640, mid: 0x3a2a5e, rim: 0xff4d5e, glow: 0xff7a8a, acc: 'ninja', char: { eyes: 'fierce', aura: 0xff4d5e, auraKind: 'bolts', gloss: 0.4, pattern: 'stitch', patCol: 0x4a2a5e }, cash: 4.99,
    art: '/assets/hf/hf_20260723_181414_a23e8298-d3ea-47e4-bba9-d7a468fc88e1.jpeg' },
];

// pre-built THREE.Color instances for the void shader (avoids per-frame alloc)
export const VOID_COL = {
  abyss: c(VOID.abyss),
  bodyMid: c(VOID.bodyMid),
  bodyRim: c(VOID.bodyRim),
  glow: c(VOID.glow),
};
