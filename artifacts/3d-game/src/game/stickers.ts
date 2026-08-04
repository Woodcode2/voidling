// ══════════════════════════════════════════════════════════════════════════
//  THE SCRAPBOOK — hidden things, and a book to keep them in
// ══════════════════════════════════════════════════════════════════════════
//
//  THE IDEA, AND WHY IT IS NOT "EVERYTHING YOU ATE".
//  A book that fills in by itself is a receipt. Nobody hunts for a receipt.
//  These are HIDDEN OBJECTS — one per district, tucked somewhere in it, and
//  the only way to get one is to go and look. That turns a world you have
//  already beaten into a world you have not finished, which is the whole
//  reason to open the app on Tuesday.
//
//  WHERE THE NAMES COME FROM, AND WHY THAT MATTERS MORE THAN IT SOUNDS.
//  Every single one of these is a thing the newsroom ALREADY talks about. The
//  Bugle has been saying "the ball of twine is still second biggest" and
//  "Pearl has grown a zucchini the size of a dog" for a thousand headlines
//  into a world where neither object existed. Now they do, and the ticker
//  becomes the hint system for free: a child hears about Pearl's zucchini in
//  the first ten seconds of a match and finds the thing itself on the farm.
//  Lore that pays off in the world is the cheapest delight in the build, and
//  it is already written.
//
//  RARITY IS DISTANCE, NOT DICE. There are no odds in here. `tier` says how
//  hard a thing is to reach — how far out, how big you have to be first, how
//  well hidden — so a rare sticker is a thing you EARNED rather than a thing
//  you rolled. That matters at 4+: no loot box has ever gone near this file
//  and none ever will.
//
//  NOTHING HERE EXPIRES. No timers, no seasons, nothing is ever removed, and
//  a sticker you have found stays found. The honest version of a collection.

export type StickerTier = 'common' | 'rare' | 'legendary';

export interface Sticker {
  /** stable id — this is the save key and the art filename. Never rename. */
  id: string;
  world: 'maple' | 'pirate' | 'gameday' | 'lantern';
  /** what the child is told they found */
  name: string;
  /** which district it hides in — shown in the book as the hunting ground */
  where: string;
  /** the district id `biomeAt` returns, so the placer knows where to put it */
  biome: string;
  /** the clue, in the newsroom's own voice. This is the Where's-Waldo half. */
  hint: string;
  tier: StickerTier;
}

// ── MAPLE FALLS ───────────────────────────────────────────────────────────
const MAPLE: Sticker[] = [
  { id: 'twine-ball', world: 'maple', name: 'The Second-Biggest Ball of Twine', where: 'The Strip', biome: 'strip',
    hint: 'Out on the highway, past the motel. It has never once been the biggest.', tier: 'rare' },
  { id: 'pearl-zucchini', world: 'maple', name: 'Pearl\'s Enormous Zucchini', where: 'The Farm', biome: 'farm',
    hint: 'Four adults have described it as normal. It is not normal.', tier: 'common' },
  { id: 'car-nine', world: 'maple', name: 'Ferris Wheel Car Nine', where: 'The Fairgrounds', biome: 'fair',
    hint: 'Stuck at the top since Tuesday. Empty, as always. Best view in the county.', tier: 'rare' },
  { id: 'gus-sandwich', world: 'maple', name: 'Gus\'s Missing Sandwich', where: 'Main Street', biome: 'mainst',
    hint: 'He put it down for one minute. It was in the fridge the whole time.', tier: 'legendary' },
  { id: 'marge-meter', world: 'maple', name: 'Marge\'s Parking Meter', where: 'The Square', biome: 'civic',
    hint: 'Day 3,281 of the protest. Twenty five cents for one hour.', tier: 'common' },
  { id: 'library-book', world: 'maple', name: 'The 1974 Library Book', where: 'Maple Falls High', biome: 'school',
    hint: 'Still overdue. We all know who has it.', tier: 'rare' },
  { id: 'tree-trampoline', world: 'maple', name: 'The Trampoline Up A Tree', where: 'Maple Heights', biome: 'burb',
    hint: 'Elm Street, about a week now. Nobody has asked how.', tier: 'common' },
  { id: 'vending-raccoon', world: 'maple', name: 'The Raccoon\'s Vending Machine', where: 'Maple Falls High', biome: 'school',
    hint: 'He owns the whole of row C and he is not sharing.', tier: 'rare' },
  { id: 'catfish-photo', world: 'maple', name: 'The 1996 Catfish Photo', where: 'Lakeside', biome: 'lake',
    hint: 'It is on the diner wall. It is bigger than the man holding it.', tier: 'legendary' },
  // 'park' is not a district ID — MAPLE_DIST maps the park biome to 'fair',
  // so a sticker asking for 'park' can never be placed. Silent, and the kind
  // of thing only a placement census finds.
  { id: 'water-tower', world: 'maple', name: 'The Water Tower', where: 'The Fairgrounds', biome: 'fair',
    hint: 'Repainted in 1991. It says MAPLE FALLS and it holds.', tier: 'common' },
  { id: 'maze-middle', world: 'maple', name: 'The Middle Of The Corn Maze', where: 'The Farm', biome: 'farm',
    hint: 'Norm went in during October. Norm liked it so much he stayed.', tier: 'legendary' },
  { id: 'twine-trophy', world: 'maple', name: 'The 1978 Trophy', where: 'Pine Woods', biome: 'woods',
    hint: 'The year we peaked. Somebody took it camping and never brought it back.', tier: 'rare' },
];

// ── PIRATE BAY ────────────────────────────────────────────────────────────
const PIRATE: Sticker[] = [
  { id: 'lounger-nine', world: 'pirate', name: 'Lounger Nine', where: 'The Beach', biome: 'beach',
    hint: 'Booked for the eleventh year running. Do not sit on it.', tier: 'common' },
  { id: 'antique-compass', world: 'pirate', name: 'The Genuine Antique Compass', where: 'The Bazaar', biome: 'market',
    hint: 'Made last Tuesday. Points at the towel hut.', tier: 'rare' },
  { id: 'beach-ball-cannon', world: 'pirate', name: 'The Beach Ball Cannon', where: 'The Port', biome: 'port',
    hint: 'Fires at eleven. Not at ten, whatever the sign says.', tier: 'common' },
  { id: 'lost-temple', world: 'pirate', name: 'The Lost Temple', where: 'The Jungle', biome: 'jungle',
    hint: 'Found again every single morning. Ask anyone.', tier: 'legendary' },
  { id: 'crab-manager', world: 'pirate', name: 'The Crab In Management', where: 'Smugglers Cove', biome: 'cove',
    hint: 'Employee of the month. Runs the rock pools. Do not argue.', tier: 'rare' },
  { id: 'flip-flop', world: 'pirate', name: 'The Other Flip-Flop', where: 'The Beach', biome: 'beach',
    hint: 'Eleven in lost property and not one matching pair.', tier: 'common' },
  { id: 'inflatable-swans', world: 'pirate', name: 'Crate 400', where: 'The Port', biome: 'port',
    hint: 'Three hundred and ninety nine crates of swans. Then this one.', tier: 'rare' },
  { id: 'coconut-decks', world: 'pirate', name: 'DJ Coconut\'s One More Hour', where: 'Dance Cove', biome: 'party',
    hint: 'He has said one more hour since Tuesday.', tier: 'legendary' },
  { id: 'enormous-hat', world: 'pirate', name: 'The Enormous Hat', where: 'The Bazaar', biome: 'market',
    hint: 'A monkey has it. It suits him better than it suited you.', tier: 'common' },
  { id: 'kevin-beetle', world: 'pirate', name: 'Kevin', where: 'The Jungle', biome: 'jungle',
    hint: 'Maisie has named thirty one beetles. Every one of them is Kevin.', tier: 'rare' },
  { id: 'royal-mariner', world: 'pirate', name: 'The Royal Mariner', where: 'The Resort', biome: 'resort',
    hint: 'You will need to be considerably larger. Do book for next year.', tier: 'legendary' },
  { id: 'harbour-seagull', world: 'pirate', name: 'The Harbour Master\'s Chair', where: 'The Port', biome: 'port',
    hint: 'A seagull has it now and will not be moved.', tier: 'common' },
];

// ── GAME DAY ──────────────────────────────────────────────────────────────
const GAMEDAY: Sticker[] = [
  { id: 'good-mustard', world: 'gameday', name: 'The Good Mustard', where: 'The Plaza', biome: 'plaza',
    hint: 'Ran out at eleven. Somebody has a jar and is not saying who.', tier: 'legendary' },
  { id: 'gerald-sled', world: 'gameday', name: 'Gerald The Blocking Sled', where: 'The Practice Field', biome: 'practice',
    hint: 'Freshly repainted. Somebody loves that sled.', tier: 'rare' },
  { id: 'doreen-casserole', world: 'gameday', name: 'Doreen\'s Casserole', where: 'The North Lot', biome: 'lot',
    hint: 'Set off in row A. Currently somewhere around row H. Still warm.', tier: 'common' },
  { id: 'blue-sedan', world: 'gameday', name: 'The Blue Sedan In Row B', where: 'The North Lot', biome: 'lot',
    hint: 'The PA has asked twice. The PA will ask again.', tier: 'common' },
  { id: 'grill-nine', world: 'gameday', name: 'Ernie\'s Grill Nine', where: 'RV Row', biome: 'rvpark',
    hint: 'Lit on Thursday. He has not discussed sleep since.', tier: 'rare' },
  { id: 'dwight-ladder', world: 'gameday', name: 'Dwight\'s Ladder', where: 'The Campus', biome: 'campus',
    hint: 'The only ladder in Marston. It is our entire aerial coverage.', tier: 'rare' },
  { id: 'parked-sofa', world: 'gameday', name: 'The Sofa In Row D', where: 'Frat Row', biome: 'greek',
    hint: 'Four students to each sofa. This one got out.', tier: 'common' },
  { id: 'clock-tower', world: 'gameday', name: 'The Clock Tower', where: 'The Campus', biome: 'campus',
    hint: 'Four minutes fast since 1962 and nobody is going to fix it.', tier: 'legendary' },
  { id: 'foam-finger', world: 'gameday', name: 'The Enormous Foam Finger', where: 'The Plaza', biome: 'plaza',
    hint: 'At gate C, currently larger than the child holding it.', tier: 'common' },
  { id: 'motorhome-cat', world: 'gameday', name: 'The Cat On The Motorhome', where: 'RV Row', biome: 'rvpark',
    hint: 'Has not stirred all day. Left before anybody else left anything.', tier: 'rare' },
  { id: 'lemonade-stand', world: 'gameday', name: 'The Fifty Cent Lemonade Stand', where: 'The Woods', biome: 'woods',
    hint: 'On its third corner. The price has never once gone up.', tier: 'legendary' },
  { id: 'chain-crew', world: 'gameday', name: 'The Chain Crew\'s Chains', where: 'The Bowl', biome: 'bowl',
    hint: 'They measured the same yard twice. They brought them out anyway.', tier: 'common' },
];

// ── LANTERN NIGHT ─────────────────────────────────────────────────────────
const LANTERN: Sticker[] = [
  { id: 'upside-lantern', world: 'lantern', name: 'The One Upside-Down Lantern', where: 'Lantern Row', biome: 'stalls',
    hint: 'Nine hundred lanterns. One of them is wrong.', tier: 'rare' },
  { id: 'eleven-bowls', world: 'lantern', name: 'The Last Of Eleven Bowls', where: 'Lantern Row', biome: 'stalls',
    hint: 'It was eleven. Then nine. Then six. He will not discuss it.', tier: 'legendary' },
  { id: 'kasa-umbrella', world: 'lantern', name: 'Kasa The Umbrella', where: 'The Moon Bridge', biome: 'moonbridge',
    hint: 'Up, and it is not raining. Kasa knew first. Nobody listens to Kasa.', tier: 'rare' },
  { id: 'fox-mask', world: 'lantern', name: 'Yuki\'s Last Fox Mask', where: 'The Great Gate', biome: 'torii',
    hint: 'Sold out before opening. She kept one back.', tier: 'common' },
  { id: 'offering-box', world: 'lantern', name: 'The Offering Box', where: 'The Shrine Steps', biome: 'shrine',
    hint: 'It has gone. It weighed a very great deal. It will turn up.', tier: 'rare' },
  { id: 'ponta-dumpling', world: 'lantern', name: 'Ponta\'s Ninth Dumpling', where: 'Lantern Row', biome: 'stalls',
    hint: 'He ate nine of his own. Nine. This is the ninth.', tier: 'common' },
  { id: 'sleeping-koi', world: 'lantern', name: 'The Sleeping Koi', where: 'The Night Garden', biome: 'nightgarden',
    hint: 'They have had a long year. Please do not wake them.', tier: 'legendary' },
  { id: 'good-cup', world: 'lantern', name: 'The Teahouse\'s Favourite Cup', where: 'The Teahouse Terrace', biome: 'teahouse',
    hint: 'Forty cups up there and one of them is the good one.', tier: 'rare' },
  { id: 'twelfth-gate', world: 'lantern', name: 'The Twelfth Gate', where: 'The Great Gate', biome: 'torii',
    hint: 'Count them on the way in. Count them on the way out. Different number.', tier: 'legendary' },
  { id: 'yuzu-stair', world: 'lantern', name: 'Madam Yuzu\'s Scrubbing Brush', where: 'The Bathhouse', biome: 'bathhouse',
    hint: 'She did the whole stair twice before opening.', tier: 'common' },
  { id: 'far-pool', world: 'lantern', name: 'The Far Pool', where: 'The Hot Spring', biome: 'onsen',
    hint: 'Most guests work out which one is the hot one eventually.', tier: 'rare' },
  { id: 'lost-sandal', world: 'lantern', name: 'The Lost Sandal', where: 'The Bamboo Path', biome: 'bamboo',
    hint: 'One sandal, one hat. The hat has been claimed.', tier: 'common' },
];

export const STICKERS: Sticker[] = [...MAPLE, ...PIRATE, ...GAMEDAY, ...LANTERN];
export const STICKERS_BY_WORLD = (w: string): Sticker[] => STICKERS.filter((s) => s.world === w);
export const STICKER_BY_ID = new Map(STICKERS.map((s) => [s.id, s]));

/** How many points a find is worth, and how loud the moment is. */
export const TIER_POINTS: Record<StickerTier, number> = { common: 150, rare: 400, legendary: 1000 };

// ── the book, on this device ──────────────────────────────────────────────
// One localStorage key holding the ids found, ever. Deliberately NOT part of
// the match save: a sticker survives a reset, a reinstall of the save format,
// and every future change to how a match is scored. It is the one thing in
// here a child is allowed to consider permanently theirs.
const KEY = 'voidStickers';

let found: Set<string> | null = null;
function load(): Set<string> {
  if (found) return found;
  let raw = '';
  try { raw = localStorage.getItem(KEY) ?? ''; } catch { /* private mode */ }
  // unknown ids are kept rather than dropped: a build that renames a sticker
  // by accident must not silently throw away a child's collection
  found = new Set(raw ? raw.split(',').filter(Boolean) : []);
  return found;
}
function save(): void {
  try { localStorage.setItem(KEY, [...load()].join(',')); } catch { /* private mode */ }
}

export const hasSticker = (id: string): boolean => load().has(id);
export const foundCount = (world?: string): number =>
  (world ? STICKERS_BY_WORLD(world) : STICKERS).filter((s) => load().has(s.id)).length;
export const totalCount = (world?: string): number =>
  (world ? STICKERS_BY_WORLD(world) : STICKERS).length;

/** Record a find. Returns the Sticker if it was NEW, null if already had. */
export function collect(id: string): Sticker | null {
  const s = STICKER_BY_ID.get(id);
  if (!s) return null;
  const set = load();
  if (set.has(id)) return null;
  set.add(id); save();
  return s;
}

/** Everything found in the current match, for the results screen. */
let thisRun: Sticker[] = [];
export const runFinds = (): Sticker[] => thisRun;
export const clearRun = (): void => { thisRun = []; };
export function collectInRun(id: string): Sticker | null {
  const s = collect(id);
  if (s) thisRun.push(s);
  return s;
}
