// ══ HATS ═══════════════════════════════════════════════════════════════════
//
// THE SPLIT, AND WHY IT IS THIS WAY ROUND.
//
// A VOID is who you are. It is a colour identity, it is earned with coins, and
// every child gets all of them eventually. Nothing about the character a child
// picks is behind a paywall, ever — that is the collection loop and locking it
// would poison the thing the game is actually about.
//
// A HAT is what you are WEARING. It is bought with money, it is independent of
// the void underneath, and it is pure expression. Any hat goes on any void, so
// fourteen voids and thirteen hats is a hundred and eighty-two combinations
// out of twenty-seven things — which is the whole reason to split the slot in
// two rather than sell more skins.
//
// ONE HAT IS FREE, and that is not generosity. A cosmetic slot nobody knows
// exists converts at zero. The party hat teaches a child that the void's head
// is a place where things go; everything after that is the shop's job.
//
// ── WHY THESE ARE BUILT FROM PRIMITIVES AND NOT DOWNLOADED ────────────────
// The GLB pack was deleted this month: 100 MB for meshes that were, at the
// play camera, a few hundred pixels each. A hat is ~10 boxes and cones and
// costs single-digit kilobytes of source. It also means a hat cannot fail to
// load, cannot be blocked by a CDN, and cannot arrive after the child has
// already looked away.
//
// ── THE SEAT, AND THE BUG IT EXISTS TO PREVENT ────────────────────────────
// void3d gives the costume group a caricature LOD — `1 + small * 0.42` — so a
// crown 0.38 units tall is not three device pixels at match start. Scaling a
// GROUP scales its children's POSITIONS as well as their size, so a hat seated
// at y=0.95 lands at y=1.35 at full LOD: a third of a body radius of daylight
// under it.
//
// Measured, and it is the reason this field exists: qa/acclift.mjs found the
// five shipped accessories are safe only by accident — every one of them is
// seated below y=0.6 or wraps the body from underneath, so scaling outward
// from the centre keeps them attached. A HAT does not have that luxury. It
// sits on top, which is exactly the case the LOD breaks.
//
// So each hat declares where it meets the head, and void3d scales it about
// THAT point instead of about the body's centre. See applyHatLod.
import * as THREE from 'three';

export type HatTier = 'free' | 'plus' | 'legendary';

export interface Hat {
  id: string;
  name: string;
  /** one line on the shop card — say what it IS, not how great it is */
  blurb: string;
  tier: HatTier;
  /** DISPLAY FALLBACK ONLY. The charge is whatever App Store Connect says for
   *  IAP_PRODUCTS[id]; this is what the card shows before StoreKit's localized
   *  price lands, and the two must be kept in step by a human. */
  usd?: number;
  /** y at which the hat meets the head — the point its LOD scales about */
  seat: number;
  /** a mesh named 'spin' inside it turns; propellers, mostly */
  spin?: number;
  /** Vertical trim, applied at mount. Authored hats clear the head by
   *  construction but several sat visibly ABOVE it — a hat that hovers reads
   *  as a halo, and the difference between hovering and worn is a few
   *  hundredths of a body radius that is far easier to judge from a render
   *  than to derive. Negative lowers it. */
  drop?: number;
  /** LEGENDARY ONLY: the hat has opinions. See hatLine(). */
  lines?: string[];
  /** shop card accent, and the tint of the legendary ribbon */
  accent: number;
}

// ── THE RANGE ──────────────────────────────────────────────────────────────
// Priced in three bands, and the bands mean something a child can feel:
//   free      — one hat, so the slot is discovered
//   plus      — a clear silhouette and a joke. The impulse buy.
//   legendary — a character. Bigger, glowing, and it TALKS.
export const HATS: Hat[] = [
  { id: 'party', name: 'Party Hat', blurb: 'every void deserves a party', tier: 'free',
    seat: 1.02, drop: -0.12, accent: 0xff6fae },

  { id: 'chef', name: 'Chef Toque', blurb: 'the town is the menu', tier: 'plus', usd: 1.99,
    seat: 1.00, drop: -0.02, accent: 0xfdf6e8 },
  { id: 'cowboy', name: 'Ten-Gallon', blurb: 'this town ain’t big enough', tier: 'plus', usd: 1.99,
    seat: 0.90, accent: 0xc79350 },
  { id: 'bobble', name: 'Bobble Beanie', blurb: 'cosy little world-ender', tier: 'plus', usd: 1.99,
    seat: 0.98, accent: 0xd8453f },
  { id: 'flower', name: 'Flower Crown', blurb: 'eats gently, smells lovely', tier: 'plus', usd: 1.99,
    seat: 1.04, accent: 0xff8ac0 },

  { id: 'wizard', name: 'Star Wizard', blurb: 'the hat knows things', tier: 'plus', usd: 2.99,
    seat: 0.92, accent: 0x6f5cff },
  { id: 'tricorn', name: 'Pirate Tricorn', blurb: 'yo ho, and also nom', tier: 'plus', usd: 2.99,
    seat: 1.04, accent: 0x2a2430 },
  { id: 'viking', name: 'Viking Helm', blurb: 'horns first, questions later', tier: 'plus', usd: 2.99,
    seat: 0.96, drop: -0.09, accent: 0xc8ccd2 },
  { id: 'space', name: 'Space Helmet', blurb: 'for eating other planets', tier: 'plus', usd: 2.99,
    seat: 0.60, drop: -0.09, accent: 0x8ad4ff },
  { id: 'propeller', name: 'Propeller Cap', blurb: 'it really spins', tier: 'plus', usd: 2.99,
    seat: 0.98, spin: 3.4, accent: 0x35d6f0 },

  // ── LEGENDARY ────────────────────────────────────────────────────────────
  // Three, and no more. A legendary tier stops being legendary the moment it
  // has eight members. Each one is a CHARACTER: it changes the silhouette from
  // across the map, and it has a voice.
  { id: 'crown', name: 'Crown of the Void King', blurb: 'heavy is the head that eats the town',
    tier: 'legendary', usd: 4.99, seat: 1.00, drop: -0.01, accent: 0xffd23f,
    lines: [
      'ALL OF THIS IS MINE.',
      'the royal appetite is UNMATCHED',
      'bring me... the whole street',
      'a king does not snack. a king FEASTS.',
      'kneel. then get eaten.',
      'my kingdom is a hole. it is a good hole.',
    ] },

  // ── THE COPY HAD TO BE REWRITTEN, AND THE RULE WAS ALREADY WRITTEN DOWN ──
  // hatgeo.ts says of this hat, in its own comment: "A generic bombastic-tycoon
  // archetype — no likeness, no name, no slogans." The GEOMETRY honoured that.
  // The eight lines that used to sit here did not: they were borrowed
  // catchphrases of one specific living public figure, on the most expensive
  // item in the shop, in a catalogue aimed at six-year-olds — and hatLine()
  // speaks them aloud during play on a loop, so the likeness was being
  // delivered by voice, repeatedly, whatever the mesh did.
  //
  // App Store Guideline 5.2.1 aside, it is simply not the joke. The joke is
  // SCALE: far too much hair, far too much appetite. So the lines are about
  // money and eating, which is what a tycoon in a game about swallowing a town
  // would actually say, and not one of them is traceable to anybody.
  //
  // The id, the name, the price and the StoreKit product id are all unchanged,
  // so nobody who already owns this is stranded.
  { id: 'tycoon', name: 'The Tycoon', blurb: 'big hair, bigger appetite',
    tier: 'legendary', usd: 6.99, seat: 0.92, accent: 0xf5c542,
    lines: [
      'add it to my collection',
      'i am buying this entire street',
      'another one for the portfolio',
      'i did not get rich by sharing',
      'send the bill to my accountant',
      'darling, i EAT real estate',
      'that one was worth a fortune. delicious.',
      'everything you can see? mine. everything you cannot? also mine.',
    ] },

  { id: 'horn', name: 'Rainbow Horn', blurb: 'sparkles now, apologies never',
    tier: 'legendary', usd: 4.99, seat: 0.88, accent: 0xff5d7e,
    lines: [
      'sparkle sparkle NOM',
      'friendship is delicious',
      'i am a majestic creature. i ate a bin.',
      'believe in the magic of eating a bus',
      'rainbows taste like more',
    ] },
];

export const HAT_BY_ID: Record<string, Hat> = Object.fromEntries(HATS.map((h) => [h.id, h]));

// ── THE HAT TALKS ──────────────────────────────────────────────────────────
// Sparingly, and never twice in a row. A legendary hat that comments on every
// bite is a hat a child mutes; one that says something every half-minute or so
// is a hat that has a personality. The cooldown is deliberately long and the
// recency guard is a simple last-index rather than a full shuffle bag, because
// the pools are small and "not the one I just heard" is the whole ask.
let lastLine = -1;
export function hatLine(id: string | null): string | null {
  const h = id ? HAT_BY_ID[id] : undefined;
  if (!h?.lines?.length) return null;
  if (h.lines.length === 1) return h.lines[0];
  let i = lastLine;
  while (i === lastLine) i = (Math.random() * h.lines.length) | 0;
  lastLine = i;
  return h.lines[i];
}

/** The widest a hat may ever render, in BODY RADII. The void is 2.0 across, so
 *  1.6 leaves a hat at 80% of the body's width — big and readable, and still
 *  clearly a hat ON something rather than a lid over it. Used by void3d to cap
 *  the caricature LOD per hat; it limits growth only and never shrinks a hat
 *  below the size it was authored at. */
export const HAT_MAX_W = 1.6;

// ── LOD ABOUT THE SEAT, NOT ABOUT THE BODY ────────────────────────────────
/** Apply the costume LOD to a hat so it grows in place instead of lifting off.
 *  `k` is the same scalar void3d would have put on the whole dress group. */
export function applyHatLod(g: THREE.Object3D, seat: number, k: number, drop = 0): void {
  g.scale.setScalar(k);
  // scale about (0, seat, 0): the point that stays put is the one where the
  // hat meets the skull, so the brim keeps touching whatever it was touching
  g.position.y = seat * (1 - k) + drop * k;
}
