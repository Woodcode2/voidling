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
  // THE DEFINITION PASS. These four used to be 0x321253 / 0x6128ad / 0x8f4ce6 /
  // 0xb678ff — four neighbouring purples with nothing between them. There was
  // no dark heart and the "lit rim" was barely a shade off the body, so at
  // COLOSSUS size the hero rendered as one flat bright mass: no silhouette
  // against grass, no interior, and a face that sat on top of it like a
  // sticker. Every premium skin in this file already knew better; King Void's
  // own comment says "body stays dark, the RIM is the gold". Measured on a
  // sweep of eight candidate palettes at gameplay size (qa/voidgrid.mjs), an
  // ink core with a bright violet rim was the only family where the eyes read,
  // the galaxy inside him read, and the edge held against every ground tone in
  // four worlds.
  abyss: 0x050308,      // gradient centre — actual deep space, not a dark purple
  bodyInner: 0x241055,  // inner — deep, so the interior galaxy has somewhere to live
  bodyMid: 0x5f2ab4,    // mid-body — rich purple, no longer the brightest thing
  bodyRim: 0xcb99ff,    // lit violet rim — this is the highlight now, by a mile
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
  // ── HOUSE WALLS, WITH A DARK END AT LAST ────────────────────────────────
  // These were eight pastels running luminance 0.525 to 0.798 with NOTHING
  // below 0.5. Every building in the game was structurally a pale box with a
  // dark cap, so a street had no value structure at all — and value structure
  // is most of what "flat" means once the light rig is fixed. Contrast in the
  // lighting is wasted if the albedo has none: the sun can only reveal
  // differences the paint already has.
  // Five deeper members go in and the eight pastels stay, so a row still reads
  // as a friendly toy town and now has somewhere for the eye to rest. The
  // range is 0.10 to 0.80 rather than 0.53 to 0.80.
  house: [0xbfe0cf, 0xc9b8e8, 0xf2c9a0, 0xa9c4e8, 0xeab8cc, 0xf0e6d2, 0xb8d8c8, 0xd8c8ec,
    0x8c4a3f,   // brick red — the one every small town actually has
    0x2f5d52,   // deep teal, a painted clapboard
    0x4a3f6b,   // plum, for the odd house that went its own way
    0x6b5330,   // stained timber
    0x33506e],  // navy weatherboard
  // warm-but-clean roofs (terracotta / slate / teal — no mud)
  roof: [0xc97f5a, 0x6a6480, 0xb5654a, 0x6fa8a0, 0xcf8a63, 0x746e8c],
  // downtown towers — cooler pastels + glass, plus three that are actually
  // dark. Same argument as `house`: a skyline of eight bright faces is a
  // sticker sheet, and one dark tower between two bright ones is what makes
  // the bright ones read as lit.
  tower: [0xff8a7a, 0x5ec8d8, 0xf7c85a, 0x8fa9d8, 0xf6efe2, 0xb98cff, 0x7ed57a, 0xff9fbf,
    0x2d4055,   // slate
    0x4a2f52,   // aubergine
    0x1f4a46],  // deep sea green
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
  // `art` is GONE. It was a 0.5-1.3 MB AI painting per legendary skin, shown
  // on the shop card and in the preview modal, and both of those now render
  // the actual character instead — so it was 4.2 MB of download whose only job
  // was to depict something the game can draw. NOT to be confused with `tex`
  // below, which is a live sampler2D read every frame by the body shader for
  // the hero AND every rival: deleting one of those silently turns a skin into
  // a flat gradient with no build error.
  acc?: 'unicorn' | 'dino' | 'wizard' | 'king' | 'dragon' | 'mecha' | 'ninja';   // legendary: 3D accessory
  char?: SkinChar;                                 // legendary: full character rig
  cash?: number;                                   // legendary: USD price
  streak?: number;                                 // unlock by daily play streak
}
export const SKINS: Skin[] = [
  { id: 'classic', name: 'Classic', abyss: 0x050308, inner: 0x241055, mid: 0x5f2ab4, rim: 0xcb99ff, glow: 0xb98cff },
  // Toxic pushed off Rexling's deep dinosaur green toward acid lime, so the
  // 150-coin skin no longer arrives first and undercuts the paid one.
  { id: 'toxic', name: 'Toxic', abyss: 0x14300c, inner: 0x357a12, mid: 0x7ec832, rim: 0xc4ff6a, glow: 0xd8ff8a, tex: '/assets/hf/hf_20260717_005246_314c786a-72c9-4a63-889f-c09dd0c04199.png' },
  // ── TWO SKINS WERE NAMED AFTER ART THEY DO NOT HAVE ──────────────────────
  // Opened the actual files. 'Sunset' is textured with cracked black basalt
  // and running magma; 'Ocean' is a neon cyan-and-magenta printed circuit
  // board, chips and traces, nothing in it is water. A child saves coins for
  // these and the shop card shows the raw texture cropped to a circle, so what
  // is in the file is literally what they are buying.
  //
  // The ART is good — it is the NAMES that are wrong, so the names move rather
  // than the assets. `id` is never rendered anywhere (it is a storage key, a
  // lookup and a CSS class; `name` is the only string a player reads), so the
  // ids stay put and nobody's purchase is stranded and no save migration is
  // needed. The palettes come with them: MAGMA goes charred-black with an
  // ember rim instead of the old rose-and-peach, CIRCUIT keeps its blue but
  // picks up the board's violet in the midtone.
  { id: 'sunset', name: 'Magma', abyss: 0x140d10, inner: 0x33201a, mid: 0x6e2d18, rim: 0xff6a1e, glow: 0xffa53a, tex: '/assets/hf/hf_20260717_005242_6530bd58-bacd-4fc7-81f2-42796a5e163f.png' },
  { id: 'ocean', name: 'Circuit', abyss: 0x090a24, inner: 0x281c66, mid: 0x2f6ad0, rim: 0x4fe6ff, glow: 0x9df6ff, tex: '/assets/hf/hf_20260717_131506_a3cc2f51-d953-4831-8531-1c3be1fedf97.png' },
  { id: 'candy', name: 'Candy', abyss: 0x40182a, inner: 0x8a3a5e, mid: 0xd86a9a, rim: 0xffb8d8, glow: 0xffc9e2, tex: '/assets/hf/hf_20260717_005243_b9bfd850-ba19-4200-8b94-c91e7f8554a2.png' },
  // Honey's rim was byte-identical to King Void's (#ffd25a) — the gold that is
  // meant to make the crown feel royal was already on a coin skin.
  { id: 'honey', name: 'Honey', abyss: 0x2a1606, inner: 0x6a4210, mid: 0xb87f1a, rim: 0xffb84a, glow: 0xffd486, tex: '/assets/hf/hf_20260717_131501_87fecffb-5637-49ad-87f5-106990a4f100.png' },
  // ── FIVE MORE TO EARN, AND THE REASON IS A MEASUREMENT ───────────────────
  // The coin tier was five buyable skins totalling 2,700✦. qa/_econ.mjs — once
  // it stopped dispatching its input at a shop thumbnail — puts a Maple match
  // at 500-700✦. So the entire earnable collection was four to five matches,
  // after which coins bought nothing at all for the rest of the child's life.
  //
  // The old note above PRICES cut the catalogue from 9,450✦ to 2,700✦ because
  // 9,450 looked like 68 matches. That arithmetic used ~139✦/match, which was
  // never measured; at the real rate 9,450 would have been seventeen. The cut
  // was an over-correction against a wrong number.
  //
  // These five fill the gaps in the palette rather than crowding it: seafoam,
  // magenta, a pale lemon, an ACHROMATIC silver (nothing in the game was grey),
  // and a true red. Every one clears the smile-contrast rule with margin —
  // Chilli is the tightest at 3.17:1 — which qa/voidsheet.mjs re-checks on
  // every run, because VOID.mouth is one fixed plum shared by every entry here.
  { id: 'lagoon', name: 'Lagoon', abyss: 0x04231e, inner: 0x0d6656, mid: 0x1fb894, rim: 0x62ffd8, glow: 0x9cffe8 },
  { id: 'neon', name: 'Neon', abyss: 0x2c0524, inner: 0x781060, mid: 0xd426b0, rim: 0xff7ae0, glow: 0xffb0ee },
  { id: 'lemon', name: 'Lemon', abyss: 0x2e2703, inner: 0x8a7410, mid: 0xf0dc46, rim: 0xfffaa8, glow: 0xfffdd0 },
  { id: 'silver', name: 'Silver', abyss: 0x101218, inner: 0x3a414d, mid: 0x8e98a6, rim: 0xe6eef8, glow: 0xf6fbff },
  { id: 'chilli', name: 'Chilli', abyss: 0x2c060e, inner: 0x820f22, mid: 0xe0243f, rim: 0xff7089, glow: 0xffa0b0 },
  // 🔥 STREAK — come back daily to unlock (resets if you miss a day)
  // EMBER IS FIRE, NOT TOFFEE. Measured on the rendered cards, ember/honey were
  // the closest pair in the entire catalogue at 2.4 mean per-pixel — closer
  // than any two things a child is ever asked to tell apart — because their
  // rims were 0xffb054 and 0xffb84a, which is the same colour twice. So a
  // player grinds to 1,100 coins for Honey and receives a skin that looks like
  // the free two-day reward already in their collection. Ember is now a hot
  // red-orange over a charred core; Honey keeps the amber.
  //
  // The rim is 0xffb36e and not the 0xff7a2a this first tried, because the
  // smile guard caught that at 2.96:1 — a mid-bright orange rim makes a
  // highlight too close to the body to separate the mouth from it. Sweeping
  // the rim's lightness, 0xffb36e is where the two-route contrast clears
  // (3.49:1) while the skin still reads as fire rather than as toffee.
  { id: 'ember', name: 'Ember', abyss: 0x1c0603, inner: 0x6e1c08, mid: 0xe03c10, rim: 0xffb36e, glow: 0xffd9a8, streak: 2 },
  // ── PRISM EARNS ITS SEVEN DAYS ────────────────────────────────────────────
  // This is the reward for coming back a week running, and it was rim 0xe8b8ff
  // on mid 0x8a5ac8 against Classic's 0xcb99ff on 0x5f2ab4 — two purple
  // gradient balls, side by side in the shop, and a child cannot tell which one
  // they just earned.
  //
  // `char` is a plain optional field with nothing gating it on `cash`, and
  // everything it drives is pre-built geometry toggled by a uniform in setSkin:
  // the glow eye-rings and the twelve aura sprites already exist on every rig
  // at opacity 0. So this costs zero bytes and zero build time.
  //
  // It does NOT devalue the paid tier, whose exclusivity is `acc` — the horn,
  // the crown, the wings — which Prism still does not get. The line stays
  // legible to a six-year-old: come back and your void turns SHINY, pay and
  // your void gets a new SHAPE.
  { id: 'prism', name: 'Prism', abyss: 0x1a1030, inner: 0x4a2a8a, mid: 0x8a5ac8, rim: 0xe8b8ff, glow: 0xfff0a8, streak: 7,
    char: { eyes: 'glow', aura: 0xe8b8ff, auraKind: 'stars', gloss: 1.5, pattern: 'starfield', patCol: 0xfff0a8 } },
  // ✨ LEGENDARY — character skins with 3D accessories, cash tier.
  // ONE price, $2.99, across all five. A tiered ladder ($4.99 / $9.99) asked a
  // six-year-old to rank five things by a number they cannot judge, and asked a
  // parent to approve $9.99 for a skin in a children's game. At one low price
  // the only question left is which character you like best, which is the only
  // question a child is equipped to answer.
  // Colour stops are tuned to MATCH each skin's shop card art (App Store
  // advertising accuracy): the in-game orb must read as the same character.
  { id: 'univoid', name: 'Uni-Void', abyss: 0x342647, inner: 0xa890c8, mid: 0xe4d6f4, rim: 0xfff4ff, glow: 0xffc9e8, acc: 'unicorn', char: { eyes: 'star', aura: 0xffd2f0, auraKind: 'stars', gloss: 1.4, pattern: 'fur', patCol: 0xffe4ff, body: 'mane' }, cash: 2.99 },
  { id: 'rexling', name: 'Rexling', abyss: 0x123018, inner: 0x2f8038, mid: 0x55b850, rim: 0x8ef07a, glow: 0xb8ff8a, acc: 'dino', char: { eyes: 'fierce', aura: 0xb8ff8a, auraKind: 'bubbles', gloss: 0.5, pattern: 'scales', patCol: 0x2a6a30, body: 'snout' }, cash: 2.99 },
  // King Void card art: BLACK glossy orb with a purple-nebula heart, wrapped
  // in a swirling gold-stardust ring — body stays dark, the RIM is the gold
  { id: 'kingvoid', name: 'King Void', abyss: 0x0d0618, inner: 0x2e1552, mid: 0x4a2378, rim: 0xffd25a, glow: 0xffe8a0, acc: 'king', char: { eyes: 'glow', aura: 0xffd25a, auraKind: 'stars', gloss: 1.2, pattern: 'starfield', patCol: 0xffd25a }, cash: 2.99 },
  // Drako card art: teal-blue dragon orb, warm golden glow around the edges
  { id: 'drako', name: 'Drako', abyss: 0x0a2030, inner: 0x14536a, mid: 0x2394a8, rim: 0x5ee8d8, glow: 0xffb054, acc: 'dragon', char: { eyes: 'fierce', aura: 0xffb054, auraKind: 'embers', gloss: 0.9, pattern: 'scales', patCol: 0x1e6a7a, body: 'muzzle' }, cash: 2.99 },
  { id: 'shadowninja', name: 'Shadow Ninja', abyss: 0x0a0612, inner: 0x241640, mid: 0x3a2a5e, rim: 0xff4d5e, glow: 0xff7a8a, acc: 'ninja', char: { eyes: 'fierce', aura: 0xff4d5e, auraKind: 'bolts', gloss: 0.4, pattern: 'stitch', patCol: 0x4a2a5e }, cash: 2.99 },
];

// pre-built THREE.Color instances for the void shader (avoids per-frame alloc)
export const VOID_COL = {
  abyss: c(VOID.abyss),
  bodyMid: c(VOID.bodyMid),
  bodyRim: c(VOID.bodyRim),
  glow: c(VOID.glow),
};
