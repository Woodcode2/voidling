// ══════════════════════════════════════════════════════════════════════════
//  NEWSROOM — BELLCLOUD HEIGHTS, the Town Crier and his Festival Programme
//
//  (World 6. The internal id is still 'skylark' — the file name, the exports,
//  SKYLARK_BRAND and the district ids are save keys and probe arguments, so
//  only what a child reads was renamed. docs/BELLCLOUD.md §9.4.)
//
//  THE CONCEIT, AND WHY IT IS NOT THE OTHER FIVE
//  ---------------------------------------------
//  Maple Falls has a mayor who denies there is a void. Pirate Bay has a resort
//  tannoy that covers. Game Day has two commentators calling it as a game.
//  Lantern Night has a recording that cannot perceive damage, only hospitality.
//  Powder Pass has a closures desk that will not be hurried.
//
//  BELLCLOUD HEIGHTS has MASTER TOLLY, the Town Crier, with a hand bell and a
//  scroll — the Festival Programme — and his denial is CEREMONIAL. He can only
//  do two things with the world: read something OFF the programme, or proclaim
//  something ONTO it. So the void is proclaimed a festival visitor, then a
//  float, then part of the Ringing, and everything it eats is proclaimed
//  "gone up early". Nothing is ever lost on Bellcloud. It is only crossed off.
//
//  AND THE JOKE IS WIRED TO THE PLAYER'S OWN PROGRESS, as the old desk's was.
//  As the child eats, the kingdom empties and the programme gets SHORTER. So
//  at tier 2 he proclaims the festival running ahead of schedule — the
//  quickest in the kingdom's history — and by his own scroll he is right.
//
//  HE NEVER BREAKS FORMAT. Every line opens or closes like a proclamation, and
//  "Oyez" is allowed. The sign-off writes the everybody-is-fine rule for free:
//  every visitor is counted into a balloon.
//
//  THE LAST STOP. This is the last island of the trip and its festival is the
//  Ringing of the Great Bell, so "the last stop", "the summit" and "every
//  island on the trip" are in. Nobody the game has not introduced yet is named
//  here: a ticker that names a character the child has never met is a leak,
//  the same class as a line naming a rival.
//
//  THE RULE ABOUT THE VOID. This desk covers ONE thing: a visitor at the
//  festival. Nobody here can know that some OTHER void has a name, so no line
//  refers to a rival by name; if a line needs a second one it says "a second
//  visitor". The same rule the other five newsrooms carry, for the same reason
//  — the ticker is diegetic and the leaderboard is not.
//
//  TEMPLATES. {M} is the last thing eaten, {D} the district, {P} the percent
//  devoured, {R} the percent still standing, {F} the player's form, {S} the
//  seconds left. Every one is real live state, so the Crier is reading the
//  child's own festival back to them off the programme.
// ══════════════════════════════════════════════════════════════════════════
import { mealKind, type MealKind } from './newsroom';

export type NewsTier = 0 | 1 | 2;

/** Three tiers of one pool — the shape every newsroom in the game uses. */
type Pools = [string[], string[], string[]];

/** District ids exactly as skRegionAt returns them. All nine are new words in
 *  the shared Biome union, so like Powder Pass there is no boundary rename —
 *  what the land module says is what this file keys on. */
export type SkDist =
  | 'circle' | 'runway' | 'perimeter' | 'launchfield' | 'arrivals'
  | 'tower' | 'hangars' | 'breakfast' | 'meadow';

export interface SkylarkCtx {
  tier: NewsTier;
  district: SkDist | null;
  lastMeal: string;
  devouredPct: number;
  form: string;
  secondsLeft: number;
  /** accepted and ignored, exactly as the Crier ignores them: the programme
   *  has no line for another void's name. Declared so the shared call site
   *  type-checks; never read. */
  rivalName?: string;
  rivalLead?: number;
  /** PHASE 0. Festival morning: bunting going up, and nothing has arrived. */
  morning?: boolean;
}

/** Per-tier badge. The desk does not change — its ceremony does not either. */
export const SKYLARK_BRAND: [string, string, string] = [
  '🔔 THE BELLCLOUD CRIER',
  '📜 BY ROYAL PROCLAMATION',
  '🔔 OYEZ!! OYEZ!!',
];

// ── the sign-on ────────────────────────────────────────────────────────────
// The first thing anybody hears. It has to establish the whole premise in one
// line: a festival on the clouds, a very big bell, and a man with a scroll.
const SIGN_ON: string[] = [
  'Oyez, oyez! The Festival of the Great Bell is open. Mind the edges.',
  'Good morning, Bellcloud Heights! Bunting up, balloons in, bell polished.',
  'Oyez! This is the last stop of the trip, and the best festival of the year.',
  'Good morning, everybody. The Crier has the programme, and it is long.',
  'Hear ye, hear ye, the Ringing of the Great Bell is today, at the very end.',
  'Oyez, oyez, and welcome to the very top of the sky.',
  'Good morning! Every island on the trip has sent a balloon.',
  'By order of the programme, the festival begins now, and in order.',
];

// ── PHASE 0: the ordinary festival morning, before anything arrives ───────
const MORNING: string[] = [
  'Balloons are docking all along the edge. Every island sent somebody.',
  'The cloud sheep have been asked to leave the Grand Avenue.',
  'Master Tolly has polished the Great Bell, and is now polishing it again.',
  'Cake carts open. The queue already reaches the Rainbow Ring.',
  'Has anybody seen the bell rope? It was here a minute ago.',
  'Bunting is going up on every tower in the Castle Yard.',
  'The Rainbow Ring has been chalked fresh, in all five colours.',
  'Item one on the programme is to arrive, and everybody has managed it.',
  'Bell Wardens are counting the little bells, of which there are a great many.',
  'A balloon from very far away has docked, and everybody waved.',
  'Cloud buns are out of the oven and the bakers are guarding them.',
  'Flags up on the Castle Keep, and they are mostly gold.',
  'Fountains in the Bell Plaza have been switched to sparkly.',
  'Somebody has hung a small bell on a cloud tree, and it is lovely.',
  'Item two on the programme: admire the Great Bell. Please queue for admiring.',
  'A sky kid has asked when the bell rings. At the end, as it always does.',
  'Banner parade rehearsing in the Castle Yard, very slowly.',
  'Tea is three pennies at the Cloud Market, as it has always been.',
  'All the cloud sheep have been counted, and all of them were there.',
  'Visitors are asked to stay on the clouds and off the edges, please.',
  'Master Tolly has read the programme aloud once and will read it again.',
  'Is it windy up here? It is never windy up here.',
  'Bell posts polished, lanterns lit, bunting straight, and nearly ready.',
];

// ── TIER 0 · DOUBT ─────────────────────────────────────────────────────────
// A round violet something is at the festival and it is not on the programme.
// He does not deny it; he looks it up, fails to find it, and welcomes it
// anyway, because every visitor is welcome. No "!".
const T0_GENERAL = [
  'A small violet visitor has arrived. It is not on the programme.',
  'Is the {F} a festival float? The Crier is checking the scroll.',
  'It ate {M}. The Crier has crossed that off the programme.',
  'The {F} at {D} is now on the programme, in pencil.',
  'A visitor of an unusual colour has been welcomed to the festival.',
  'The violet visitor has no ticket, and tickets are free anyway.',
  'By proclamation, all visitors are welcome, including very round ones.',
  'Every visitor on the scroll has a name, and this one has none.',
  'Something round and violet is admiring the cloud trees up close.',
  'One violet visitor has been added to the programme, in small letters.',
  'It took {M} and the Crier has written that down, neatly.',
  'The visitor is about {P} percent of the kingdom wide. Welcome, visitor.',
  'Everything is ready for the Ringing, with one extra guest.',
  'Nothing on the programme mentions a visitor that eats the programme.',
  'Is it part of the festival? The scroll does not say that it is not.',
  'A Bell Warden reports the visitor is nearer than it was. Noted.',
  'Festivities continue at {D}, with the visitor in attendance.',
  'Oyez. A visitor is tasting a little of everything, which is allowed.',
  'The cake carts report a very round customer with no pennies.',
  'Master Tolly rang his bell at it, politely. It ate {M}.',
  'One visitor, violet and hungry, not yet proclaimed anything at all.',
  'The programme is exactly as long as it was this morning. Mostly.',
];

// ── TIER 1 · ALARM ─────────────────────────────────────────────────────────
// He proclaims it part of the festival, and from then on everything it eats is
// simply "gone up early". The festival is running ahead of schedule. One "!".
const T1_GENERAL = [
  'By royal proclamation, the {F} is now part of the festival!',
  'The festival is running ahead of schedule! Well ahead.',
  'It took {M} from {D}. Gone up early!',
  'Oyez! {P} percent of the kingdom has been proclaimed finished.',
  'The {F} is now a festival float, and it floats beautifully.',
  'Items four to nine on the programme have all gone up early.',
  'Master Tolly is crossing things off faster than he can read them.',
  'How big is the {F} now? Bigger than the last proclamation said.',
  'It ate {M}, which was on the programme for this afternoon.',
  'Everything it eats is now listed as gone up early, which is tidy.',
  'Visitors are asked to make room for the float, and then more room.',
  'The scroll is getting shorter, which the Crier calls efficient!',
  'Master Tolly has proclaimed the float very welcome, and a bit big.',
  'Balloons are filling at the dock, in good time and in good order.',
  'Bell Wardens are walking everybody to the balloons, one ring each.',
  'It took {M}. The programme is amended, in gold ink.',
  'Far end of {D} is now proclaimed complete.',
  'Banner parade moved up the programme, and then off the end of it.',
  'Nobody has ever seen a festival go this quickly, and the scroll agrees.',
  'At {P} percent of the kingdom, the float is still very welcome.',
  'Please keep the float on your left and a balloon on your right!',
  'All little bells are to be rung early, by order, just in case.',
];

// ── TIER 2 · PANIC, WHICH IS NOT PANIC ─────────────────────────────────────
// From the Keep balcony, the last tower on the island, he proclaims the
// quickest festival in the kingdom's history — and by his own scroll he is
// right. Everybody is in a balloon. "!!" or nothing, never a lone "!".
const T2_GENERAL = [
  'The festival has never finished this quickly!! A record for the scroll.',
  '{R} percent of the kingdom remains, and all of it is very tidy.',
  'It ate {M}!! One item left on the programme: the Bell.',
  '{S} seconds!! Everybody into a balloon. Bring nothing but a smile.',
  'Only the Great Bell is left on the scroll, and Master Tolly is near it.',
  'The whole programme has gone up early!! Everybody is in a balloon.',
  'The Crier proclaims the kingdom finished, and a little bit eaten.',
  'Oyez, oyez!! The festival is ahead of schedule by a whole afternoon.',
  'All balloons are up, and everybody in them is waving.',
  '{S} seconds of festival remain!! The Crier is reading very fast.',
  'The scroll is one line long now, and the Crier is proud of it.',
  'Every cottage on the island has gone up early, every single one.',
  'By proclamation, the float is now the festival. Congratulations, float.',
  '{P} percent of Bellcloud Heights is finished!! The quickest year ever.',
  'Bell Wardens have counted everybody into the balloons, twice.',
  'Nothing left to cross off but the ink!! The Crier is delighted.',
  '{S} seconds!! Please do not go back for your hat, even the cloud one.',
  'The programme allowed all day for this, and it has not needed all day.',
  'Everyone is safe in a balloon and most of them are cheering.',
  'The last of {D} has gone up early, well ahead of schedule.',
];

// ── the districts ──────────────────────────────────────────────────────────
const T0_BY_DIST: Record<SkDist, string[]> = {
  launchfield: [
    'The Cloud Gardens are in full bloom, and one bloom is violet and moving.',
    'Gardeners report a round visitor sniffing the cloud trees.',
    'Cottages in the Cloud Gardens have their best curtains up today.',
  ],
  arrivals: [
    'The Balloon Dock is full. One visitor arrived without a balloon.',
    'Basket carts at the dock are being unloaded in the usual order.',
    'Dock guides are welcoming every visitor, including the violet one.',
  ],
  runway: [
    'The Grand Avenue is clear, except for the cloud sheep and a visitor.',
    'Lanterns on the Grand Avenue are lit all the way to the Bell.',
    'Is anybody moving the cloud sheep off the avenue? Nobody is.',
  ],
  circle: [
    'The Great Bell hangs in its arch, polished twice and gleaming.',
    'The Bell Plaza is reserved for the Ringing, and for admiring.',
    'Bell Wardens are walking the plaza, checking the rope is still a rope.',
  ],
  perimeter: [
    'The Rainbow Ring has five colours today, and one visitor of a sixth.',
    'Pennants on the Rainbow Ring are all flying the right way up.',
    'Somebody has redrawn the Rainbow Ring. Nobody saw who.',
  ],
  tower: [
    'The Castle Keep has the visitor in sight and has waved.',
    'Master Tolly is on the Keep balcony with the scroll, reading.',
    'The Keep is ready to ring in the next proclamation.',
  ],
  hangars: [
    'The craft market in the Castle Yard reports brisk trade.',
    'Both gatehouses in the Castle Yard are open, as every festival.',
    'A visitor has admired the banners in the Castle Yard very closely.',
  ],
  breakfast: [
    'The Cloud Market is serving. The queue has not got shorter.',
    'A cake cart reports a very round customer. Cake is free today.',
    'Everybody at the Cloud Market is eating cake, and one visitor more.',
  ],
  meadow: [
    'The Cloud Meadows are quiet. Skylarks up, bunnies out, all well.',
    'Nothing to proclaim from the far meadows. Nothing at all.',
    'The old columns in the meadows are still, as ever, broken.',
  ],
};

const T1_BY_DIST: Record<SkDist, string[]> = {
  launchfield: [
    'The Cloud Gardens have lost a lane of cottages. They went up early.',
    'Gardeners are asked to leave the watering cans and walk to the dock.',
    'Half the cloud trees in the gardens are now down as gone up early.',
  ],
  arrivals: [
    'The Balloon Dock is filling up fast, and nobody is pushing!',
    'Balloons are filling at the dock. Everybody gets a basket.',
    'Nobody else is docking today. The dock is only for leaving now.',
  ],
  runway: [
    'The Grand Avenue is now very grand and has nothing on it.',
    'The cloud sheep have finally moved off the avenue. Oyez!',
    'Lanterns on the Grand Avenue have gone up early, in a neat row.',
  ],
  circle: [
    'Nobody is to touch the Great Bell before the Ringing. Nobody!',
    'Bell Wardens are standing very close to the Great Bell today.',
    'Both plaza fountains have gone up early. The Bell remains.',
  ],
  perimeter: [
    'The Rainbow Ring is the quickest way to the dock. Use all five colours.',
    'Pennants on the ring are going up early, one colour at a time.',
    'Walkers on the Rainbow Ring are asked to keep moving, cheerfully!',
  ],
  tower: [
    'The Castle Keep is still proclaiming and intends to keep doing so.',
    'A turret beside the Keep has been proclaimed gone up early.',
    'Master Tolly is on the balcony and will not be coming down yet.',
  ],
  hangars: [
    'The craft market in the Castle Yard has packed up for the dock.',
    'A gatehouse has gone up early. Nobody was in it, which was sensible.',
    'The banners in the Castle Yard are safe! Somebody carried them out.',
  ],
  breakfast: [
    'The Cloud Market is serving from the far end only.',
    'A cake cart has been towed to the dock, still serving.',
    'The last cake cart has gone, but everybody was fed first.',
  ],
  meadow: [
    'Everybody in the Cloud Meadows is walking to the balloons. Keep walking.',
    'The cloud bunnies went the same way an hour ago, and had the right idea.',
    'Skylarks are up and singing, the most ordinary thing on the island.',
  ],
};

const T2_BY_DIST: Record<SkDist, string[]> = {
  launchfield: [
    'The Cloud Gardens are finished!! Every cottage has gone up early.',
    'Everything that was in the gardens is now far above the gardens.',
    'Ninety garden plots, ninety gardeners, and all of them in balloons.',
  ],
  arrivals: [
    'The Balloon Dock is empty because every balloon is up!! Well done.',
    'A dock is standing on a cloud with nothing left to dock.',
    'The ticket wagon has gone up early. It never did charge anybody.',
  ],
  runway: [
    'The Grand Avenue is clear all the way to the Bell!! Nothing else is.',
    'The cloud sheep are in a balloon of their own, all counted.',
    'The avenue is proclaimed finished, lanterns and all.',
  ],
  circle: [
    'The Great Bell is the last thing on the scroll!! Hold your ears.',
    'Only the Bell stands in the Bell Plaza now, shining.',
    'Bell Wardens have left the plaza with {S} seconds to spare.',
  ],
  perimeter: [
    'The Rainbow Ring has gone up early, all five colours of it!!',
    'All pennants accounted for!! Every flag, every Warden, every one.',
    'The ring went last, which is fitting, since it drew the outline.',
  ],
  tower: [
    'The Keep is the last tower on the scroll!! The Crier is still in it.',
    'This is the Keep. Everybody is up, or on their way up.',
    'Master Tolly has read the whole programme, including the thank-yous.',
  ],
  hangars: [
    'The Castle Yard has gone up early!! The banners are in a balloon.',
    'Both gatehouses are finished, and both were empty when they went.',
    'Somebody saved every banner in the Castle Yard, and the Crier is moved.',
  ],
  breakfast: [
    'The Cloud Market has gone up early, and everybody had eaten. Everybody.',
    'The last cloud bun on Bellcloud Heights went up in a balloon!!',
    'The tea urn is in a balloon with the bakers, still warm.',
  ],
  meadow: [
    'The meadows have gone, and everybody who was in them is in a balloon.',
    'The skylarks went up first!! They always do know best.',
    'The cloud bunnies are fine. Somebody checked. Somebody actually checked.',
  ],
};

// ── WHAT IT JUST ATE ──────────────────────────────────────────────────────
// ctx.lastMeal is free text from the call site: the game tags HOUSE and CAR and
// sizes the rest, so four buckets is the whole vocabulary. The classifier is
// the Bugle's, imported rather than copied. The Crier's angle on all four: it
// was on the programme, it has gone up early, and that is ahead of schedule.
const MEAL_HOUSE: Pools = [[
  'A cloud cottage has been proclaimed a holiday home, elsewhere.',
  'One cottage has gone up early, and the programme is amended.',
  '{M} has gone, and the view of the Bell is better for it.',
  'Is a cottage allowed to leave during the festival? Apparently so.',
], [
  'Another cottage has gone up early. The scroll is getting simpler!',
  'Cottage count amended, downward.',
  'It ate {M}. Proclaimed finished, with thanks.',
  'That was a market stall, and the Crier has crossed it off in gold ink.',
], [
  'Every cottage on the island has gone up early!! Every single one.',
  'Cottage count is zero, which the Crier finds remarkable.',
  'It ate {M}!! Nothing with a roof remains but the Keep.',
]];

const MEAL_CAR: Pools = [[
  'A cart has left the Balloon Dock. Noted, with thanks.',
  'One basket cart fewer at the dock, and it was empty.',
  '{M} has gone from the dock, and the dock is roomier.',
  'One cart removed, and everybody is fine.',
], [
  'Another cart has gone up early. The dock is very roomy now.',
  'It took {M}. The Crier has stopped counting carts.',
  'The cake carts are fine, because the cake carts are in a balloon.',
  'The ticket wagon has nothing left to carry!',
], [
  'All carts are proclaimed finished!! The Crier confirms it.',
  'It ate {M}!! Nobody was in it. Nobody has been in anything.',
  'The dock is a cloud again, and then it is not even that.',
]];

const MEAL_BIG: Pools = [[
  'A large item has gone up early, and the view is much improved.',
  '{M} has gone and the Crier can now see the far edge.',
  'The biggest item on the programme has been crossed off.',
  'One large item removed, which the Crier considers progress.',
], [
  'It ate {M}. That was one of the biggest things up here!',
  'A whole turret has gone up early, and the flag went with it.',
  'Something very large has gone. The Crier did not drop his bell.',
  'The programme is down to small items, which is an improvement.',
], [
  'The largest items are all finished!! The view is now total.',
  'It ate {M}!! The Crier has never had a tidier kingdom.',
  'Nothing large remains, and nothing medium remains either.',
]];

const MEAL_SMALL: Pools = [[
  'A small item has left the programme. The Crier has noted it.',
  'It took {M}. The Crier is proclaiming these one at a time.',
  'Something small has gone from {D}, and the festival carries on.',
  'A little thing went up early, and nobody minded.',
], [
  'Another small item. The Crier has started a second scroll!',
  'It ate {M}, and the list gets shorter, not longer.',
  'Small items are going faster than the Crier can proclaim them.',
  'The Bell Wardens have stopped reporting them. The Crier understands.',
], [
  'The small items are all gone!! There is nothing left to list.',
  'It ate {M}!! The Crier has rolled up the second scroll.',
  'Every item on the programme has been crossed through.',
]];

const BY_MEAL: Record<MealKind, Pools> = {
  house: MEAL_HOUSE, car: MEAL_CAR, big: MEAL_BIG, small: MEAL_SMALL,
};

// ── LIVE / TEMPLATED ──────────────────────────────────────────────────────
//  {F} form  {M} last meal  {P} pct  {R} 100-pct  {S} seconds  {D} district.
//  Those SIX and no others. Never open a line with {D} or {M}: both arrive
//  lower case and a sentence starts with a capital.
const LIVE: Pools = [[
  'The {F} at {D} is proclaimed a festival visitor.',
  'A {F} is at the festival and was not on the guest list.',
  'Calling it a {F}, and the Crier likes the word.',
  'At {D}: bunting, cake, and one {F}.',
  'A {F} is moving at walking pace and is not on the programme.',
  'About {P} percent of the kingdom has now met the {F}.',
  'A {F} has been offered a programme and ate the programme.',
  'The {F} and the Great Bell have both drawn a crowd today.',
  'Visitors at {D} are asked to let the {F} through.',
  'No ticket has been issued to the {F}, and none was needed.',
  'Is the {F} enjoying the festival? It seems to be.',
], [
  'The {F} at {D} is bigger than last proclaimed.',
  'It ate {M}. The programme has been amended accordingly.',
  'The {F} is now {P} percent of Bellcloud Heights.',
  'Please keep the {F} on your left and the Bell on your right!',
  'Master Tolly measured the {F} this morning and the ribbon ran out.',
  'All of {D} is, by the Crier\'s scroll, ahead of schedule.',
  '{R} percent of the kingdom is still on the programme.',
  'A {F} has not asked to join the parade and has joined it anyway.',
  'It took {M} from {D} and did not slow down.',
  'Proclaiming the {F} every four minutes now.',
  'Master Tolly has moved the Ringing up the programme, just in case.',
], [
  'The {F} is {P} percent of the kingdom!! A festival record.',
  '{S} seconds of festival remain!! Everybody to the balloons.',
  'It ate {M}!! The programme is nearly a blank scroll.',
  'The {F} has finished {D} entirely.',
  '{R} percent remains and the Crier is standing on most of it.',
  'A {F} the size of the festival is, by proclamation, the festival.',
  '{S} seconds!! Walk to a balloon. Do not carry anything. Walk.',
  'The Crier proclaims the {F} scenery and rolls up the scroll.',
  'It has taken {D}!! Everything there has gone up early.',
]];

// ── the sign-off ───────────────────────────────────────────────────────────
// ONCE, AND LAST. He reads the programme to the end, including the thank-yous,
// because he always does — and the everybody-is-fine rule writes itself. No
// line here claims the Great Bell has gone: this airs whether or not she ate it.
const SIGN_OFF: string[] = [
  'That was the last stop. Everybody back in the balloons, please.',
  'Oyez, oyez. The festival is over, and it was the best one yet.',
  'The Crier proclaims the festival finished. It finished itself first.',
  'All visitors accounted for. Every balloon up. A record.',
  'That is the programme, and thank you all for coming!',
  'Every visitor is up, away, or waving, and nobody is missing.',
  'The festival is closed, and the Crier wishes to note the attendance.',
  'Next year: the same festival, and possibly a new bell. Goodnight.',
  'Thanks to the Bell Wardens, who counted everybody. Twice.',
  'Master Tolly has read the programme to the very end, as he always does.',
];

// ── the pools, per tier ────────────────────────────────────────────────────
const GENERAL: [string[], string[], string[]] = [T0_GENERAL, T1_GENERAL, T2_GENERAL];
const BY_DIST: [Record<SkDist, string[]>, Record<SkDist, string[]>, Record<SkDist, string[]>] =
  [T0_BY_DIST, T1_BY_DIST, T2_BY_DIST];

let signedOn = false;
let signedOff = false;   // the Crier has finished the programme; it does not restart
/** How many headlines back the ticker remembers. Fourteen, as the other five
 *  newsrooms settled on after qa/newsfeed.mjs caught a world repeating itself
 *  inside one 26-card match. */
const RECENT_MAX = 14;
let recent: string[] = [];
/** THE DRONE — the owner's complaint about "the style" stated as a property of
 *  the SEQUENCE. `recent` holds raw TEMPLATES and a template can begin with a
 *  token, so the opening word is taken off the finished line as it goes out. */
const openers: string[] = [];
const opener = (s: string): string => (s.split(/\s+/)[0] || '').replace(/[^A-Za-z']/g, '').toLowerCase();
const droning = (filled: string): boolean => {
  const w = opener(filled);
  return !!w && openers.length >= 2
    && openers[openers.length - 1] === w && openers[openers.length - 2] === w;
};

export function resetSkylarkNews(): void {
  signedOn = false;
  signedOff = false;
  recent = [];
  openers.length = 0;
}

/** THE DISTRICT SET, DERIVED — never hand-typed. The other four worlds each
 *  keep a literal list of district ids over in prototype3d.ts, and keeping one
 *  of those in sync by hand is exactly what shipped a stale world list in
 *  qa/newsstyle.mjs. This reads the pools themselves, so a district added to
 *  T0_BY_DIST is a district the runtime will route to, with no second edit. */
export const SK_DISTS: readonly string[] = Object.keys(T0_BY_DIST);
export const isSkDist = (s: string): s is SkDist => SK_DISTS.includes(s);

/** How many distinct lines this world can say. Counted rather than asserted. */
export function skylarkNewsCount(): number {
  let n = SIGN_ON.length + MORNING.length + SIGN_OFF.length;
  for (const g of GENERAL) n += g.length;
  for (const d of BY_DIST) for (const k of Object.keys(d)) n += d[k as SkDist].length;
  for (const p of [MEAL_HOUSE, MEAL_CAR, MEAL_BIG, MEAL_SMALL, LIVE]) for (const t of p) n += t.length;
  return n;
}

/** the ticker is one line on a phone. nothing here gets to be a paragraph. */
const TICKER_MAX = 78;
/** {M} lands MID-CLAUSE in most templates, so what arrives has to be a bare
 *  noun phrase: no terminal stop, no comma, nothing after one. */
const fragment = (s: string): string => (s.split(/[,.;:]/)[0] || s).trim();
const clip = (s: string, n: number): string => {
  if (s.length <= n) return s;
  const cut = s.slice(0, n);
  const sp = cut.lastIndexOf(' ');
  return (sp > n * 0.5 ? cut.slice(0, sp) : cut).trim();
};

/** Every headline leaves through here, so the drone memory cannot miss one. */
function air(line: string): string {
  const out = clip(line, TICKER_MAX);
  openers.push(opener(out));
  if (openers.length > 4) openers.shift();
  return out;
}

/** What a child reads for each skRegionAt id. The ids are the airfield's and
 *  stay (they key the crowd's dress codes and the sticker biomes); the names
 *  are the kingdom's. The longest, "the Cloud Meadows" and "the Cloud
 *  Gardens" at 17, is what qa/newsstyle.mjs fills {D} with at worst case. */
const DIST_NAME: Record<SkDist, string> = {
  circle: 'the Bell Plaza', runway: 'the Grand Avenue', perimeter: 'the Rainbow Ring',
  launchfield: 'the Cloud Gardens', arrivals: 'the Balloon Dock',
  tower: 'the Castle Keep', hangars: 'the Castle Yard', breakfast: 'the Cloud Market',
  meadow: 'the Cloud Meadows',
};

function fill(t: string, c: SkylarkCtx): string {
  const pct = Math.max(1, Math.min(99, Math.round(c.devouredPct)));
  return t
    .replace(/\{M\}/g, clip(fragment(c.lastMeal || 'something'), 22))
    .replace(/\{D\}/g, DIST_NAME[c.district ?? 'launchfield'])
    .replace(/\{P\}/g, String(pct))
    .replace(/\{R\}/g, String(100 - pct))
    .replace(/\{F\}/g, clip(c.form || 'feature', 14))
    .replace(/\{S\}/g, String(Math.max(1, Math.ceil(c.secondsLeft))));
}

/** A countdown line with two and a half minutes left is a weather report, not
 *  an evacuation — the same gate all six newsrooms hold on {S}. Applied to all
 *  four pools at the call site, not just the general one. */
const usable = (t: string, c: SkylarkCtx): boolean =>
  !(t.includes('{S}') && c.secondsLeft > 70);

/** One headline. The sign-on is guaranteed first; after that it is a weighted
 *  pick across four pools — the district's own lines, what the void just ate,
 *  the live templated lines, and the general programme — biased toward the
 *  part of the kingdom the child is standing in, which is the whole reason
 *  this file is per-district. */
export function pickSkylarkNews(ctx: SkylarkCtx, rnd: () => number = Math.random): string {
  if (!signedOn) {
    signedOn = true;
    return air(SIGN_ON[Math.floor(rnd() * SIGN_ON.length)]);
  }
  // PHASE 0. Festival morning, bunting going up, no visitor, no live state, no tokens.
  if (ctx.morning) {
    const fresh = MORNING.filter((l) => !recent.includes(l));
    let src = fresh.length ? fresh : MORNING;
    const varied = src.filter((l) => !droning(l));
    if (varied.length) src = varied;
    const line = src[Math.floor(rnd() * src.length) % src.length] ?? MORNING[0];
    recent.push(line);
    if (recent.length > RECENT_MAX) recent.shift();
    return air(line);
  }
  const tier = Math.max(0, Math.min(2, ctx.tier)) as NewsTier;
  // ONCE, AND LAST. Tier 2 can arrive with most of the match still to run, far
  // too early to finish the programme, so the sign-off waits for the endgame
  // and taking it closes the Crier's scroll for the match.
  if (tier === 2 && !signedOff && ctx.secondsLeft <= 26 && rnd() < 0.45) {
    signedOff = true;
    return air(SIGN_OFF[Math.floor(rnd() * SIGN_OFF.length)]);
  }
  const dist = ctx.district && BY_DIST[tier][ctx.district] ? ctx.district : null;
  const local = dist ? BY_DIST[tier][dist].filter((h) => usable(h, ctx)) : [];
  const meal = BY_MEAL[mealKind(ctx.lastMeal)][tier].filter((h) => usable(h, ctx));
  const live = LIVE[tier].filter((h) => usable(h, ctx));
  const wide = GENERAL[tier].filter((h) => usable(h, ctx));
  // ~34% district / ~22% what it just ate / ~28% live / ~16% general when we
  // know where the child is — the same split every other newsroom runs on.
  const r = rnd();
  const order: string[][] = local.length
    ? (r < 0.34 ? [local, live, wide]
      : r < 0.56 ? [meal, live, wide]
        : r < 0.84 ? [live, wide, local]
          : [wide, local, live])
    : (r < 0.30 ? [meal, live, wide]
      : r < 0.68 ? [live, wide] : [wide, live]);
  // take the FIRST pool in that order with something unsaid in it
  let src: string[] = [];
  for (const cand of order) { const f = cand.filter((h) => !recent.includes(h)); if (f.length) { src = f; break; } }
  if (!src.length) for (const cand of order) if (cand.length) { src = cand; break; }
  if (!src.length) src = GENERAL[tier];
  // ── THE DRONE GUARD NEEDS SOMEWHERE TO GO ────────────────────────────────
  // This filtered only the pool already chosen. When that pool is entirely
  // "The …" the filter returns nothing, the guard gives up, and the drone airs
  // anyway — so `droning`, which is written to stop a THIRD consecutive
  // repeat, permitted a FOURTH. qa/newsfeed.mjs caught exactly that on this
  // world: cards 17-20 of the aired sequence all opened "The".
  //
  // The fallback widens across every pool at this tier before it accepts a
  // repeat: first something unsaid and non-droning anywhere, then anything
  // non-droning at all. Only a tier with no other opening word in it can now
  // drone, and it can never do so twice, because the widened search runs again
  // on the next card. It can only ever REDUCE repetition — every candidate it
  // considers was already eligible to air.
  let varied = src.filter((h) => !droning(fill(h, ctx)));
  if (!varied.length) {
    const anywhere = [local, meal, live, wide].flat();
    varied = anywhere.filter((h) => !recent.includes(h) && !droning(fill(h, ctx)));
    if (!varied.length) varied = anywhere.filter((h) => !droning(fill(h, ctx)));
  }
  if (varied.length) src = varied;
  const line = src[Math.floor(rnd() * src.length)];
  recent.push(line);
  if (recent.length > RECENT_MAX) recent.shift();
  return air(fill(line, ctx));
}

// ── THE CROWD'S OWN VOICES ─────────────────────────────────────────────────
//  Keyed by the voice ids the cast carries (life.ts VOICE_OF): crew, pilot,
//  marshal, cleaner, tea, van, guide, tourist, ticket, shepherd, spectator,
//  pym, kid. A driver talks like crew and a photographer like a tourist, so
//  neither has a key of its own. Same shape as MAPLE_VOICE_* and GAMEDAY_
//  VOICE_*, selected per world in createLife and never merged into the module
//  tables — before these existed the whole world fell through to Maple's pools
//  and a balloon crew at first light said "bin day tomorrow!".
//
//  The keys are the airfield's roles and they stay (qa/jobs.mjs and
//  qa/purpose.mjs are green on them); who wears each one is the kingdom's
//  (docs/BELLCLOUD.md §7.2): 'marshal' is a Bell Warden, 'pym' is Master
//  Tolly the Town Crier, 'tea' a baker, 'van' a cart keeper, 'spectator' the
//  Heights folk with their wings and cloud hats.
//
//  AMBIENT is the ordinary festival: a queue, a bun, a bell that has not rung
//  yet. PANIC is the void arriving, "!!" like every other world's screams.
//  Nothing here that a 4+ rating would flag: no drink, nobody hurt, everybody
//  gets to a balloon. A bubble is one line on a phone, so nothing gets to be a
//  sentence and a half.
export const SKYLARK_VOICE_AMBIENT: Record<string, string[]> = {
  // the balloon crews who flew the visitors in, four to a basket
  crew: [
    'hold the basket. hold it. good.', 'four to a basket, always four',
    'mind the mooring line, please', 'she docked like a feather',
    'tie her off to the gold post', 'we flew in from the far islands',
    'burner check. everybody back.', 'last island of the trip. the best one.',
    'clouds are softer than grass, landing', 'north row is nearly docked',
    'we came all this way for the BONG', 'dry cloud, dry envelope, good',
  ],
  // the pilots: thirty years of islands and still nervous before every lift
  pilot: [
    'wind calm. sky high. we are here.', 'never landed on a cloud this soft',
    'passengers, mind the edge', 'thirty years and still amazed',
    'we lift when the bell has rung', 'do not step on the mooring line',
    'the sheep are on the avenue again', 'my envelope is older than you',
    'best view on the whole trip', 'last stop. everybody out for cake.',
  ],
  // the Bell Wardens: royal blue, a gold sash, and a rope nobody may pull
  marshal: [
    'mind the bell rope, please', 'one ring each. ONE.',
    'behind the gold line, thank you', 'no touching the Great Bell. not yet.',
    'twelve bell posts, all polished', 'Warden four to the Keep. all quiet.',
    'the rope is not a swing, young man', 'wings in, please, it is busy',
    'it rings at the end. everybody knows.', 'this way to the plaza. this way.',
  ],
  // cloud sweepers: white overalls, a bucket, a bubble wand. The kids follow
  // the bubbles and stay off the bell, which is the entire reason for the wand
  cleaner: [
    'you cannot sweep a cloud. I try.', 'a hundred baskets, one bucket',
    'bubbles keep the kids off the bell', 'crumbs on the Rainbow Ring again',
    'somebody dropped a pennant', 'this broom is older than the Keep',
    'sweep it soft, sweep it twice', 'the kids follow the bubbles, see',
    'nobody wipes their feet. on a CLOUD.', 'that is not litter, that is a wing',
  ],
  // the bakers: a white apron, a toque, a tray, and the oven is always on
  tea: [
    'cloud buns, still warm', 'tea is three pennies. still.',
    'the oven is on. the oven is always on.', 'pink icing or white? both.',
    'two buns for the Wardens', 'my tray is older than the castle',
    'sit down, you look puffed out', 'the crews eat buns by the basket',
    'somebody has taken my tray again', 'buns, then the Ringing. that order.',
  ],
  // the cart keepers at the Cloud Market, hatch open before the skylarks
  van: [
    'cake or bun, love? both?', 'queue is to the Rainbow Ring. lovely.',
    'the Keep has a standing order', 'thirty cakes in the first hour',
    'sprinkles are at the end. THE END.', 'we open before the skylarks',
    'that pilot has had four', 'fresh cakes in twenty minutes',
    'mind the step. everybody says it.', 'the crews eat like the sheep',
  ],
  // the dock guides: royal blue, a flag on a stick, a group that wanders off
  guide: [
    'this way, please. THIS way.', 'that is the Great Bell. the big one.',
    'visitors from every island this year', 'follow the flag. I have the flag.',
    'that is a turret. a tower, but round.', 'the balcony is the Keep. yes.',
    'keep together. clouds are big.', 'and that is the Crier. very loud.',
    'the bell rings once. at the end.', 'the meadows are the sheep\'s. by law.',
    'photos at the plaza, then cake',
  ],
  // visitors from the other islands on the trip, dressed for the postcard
  tourist: [
    'is that the bell? is THAT the bell?', 'we came from the snowy island for this',
    'you can see every island from here', 'no, THAT one. with the gold roof.',
    'my feet are in a CLOUD and I love it', 'which one is the Great Bell? oh.',
    'they said it rings. when does it ring?', 'that is a good photo. that one.',
    'I want a hat made of cloud', 'four hundred photos and no BONG yet',
    'is the castle real? it is REAL.', 'the sheep are so soft',
  ],
  // the ticket wagon at the dock: programmes, wristbands, and it is all free
  ticket: [
    'programme? it has a map in it.', 'wristband on. no, the OTHER wrist.',
    'docking is the edge. all of it.', 'every island sent somebody. see?',
    'gates opened at dawn. DAWN.', 'children free. sheep free.',
    'the bell rings last. it says so.', 'have you got a wristband? lovely.',
    'cake is that way, bell is THAT way', 'no refunds. it is a cloud.',
  ],
  // cloud shepherds: a white smock, a crook, and forty sheep made of cloud
  shepherd: [
    'the sheep have not moved. no.', 'they move when they move. clouds.',
    'asked them nicely. twice.', 'they have been on the avenue all year',
    'the dog is not interested either', 'they never look up. they ARE up.',
    'forty sheep, all fluffy, all here', 'one of them likes the bell',
    'the Crier can ask them himself', 'you cannot shear a cloud. I tried.',
  ],
  // the Heights folk: pastel robes, new wings, a cloud hat, the same spot
  spectator: [
    'best festival of the year, this', 'I have come for the BONG',
    'my wings are new. do you like them?', 'we come every year. every year.',
    'this is the good bit. the waiting.', 'hat, wings, bun. sorted.',
    'we stand here. we always stand here.', 'you hear the bell before you see it',
    'my dad brought me. I bring them.', 'the whole sky comes to this one',
    'programme says bell at the end. always.',
  ],
  // Master Tolly, the Town Crier, off the balcony, in the voice of the scroll
  pym: [
    'oyez! oyez! bell at the end!', 'that is not on the programme',
    'visitors to the plaza, please', 'the scroll is excellent',
    'the Ringing is at the end, as ever', 'the festival is, frankly, ideal',
    'the sheep are being asked to move', 'every island is here. all present.',
    'proclamation in four minutes. balcony.', 'have a lovely festival. all of you.',
    'oyez. it means listen.',
  ],
  // sky kids: little wings, a cloud hat, a balloon on a string, and the bell
  kid: [
    'the BELL!', 'can I ring it? can I?', 'the sheep are made of CLOUD',
    'is it ringing NOW?', 'that balloon is MINE. I picked it.',
    'my balloon! my balloon is red!', 'bubbles! BUBBLES!',
    'I have wings! look! WINGS!', 'the castle is bigger than our HOUSE',
    'I am not tired. I am NOT.', 'BONG BONG BONG BONG!',
  ],
};

export const SKYLARK_VOICE_PANIC: Record<string, string[]> = {
  crew: [
    'CAST OFF!! LEAVE IT!!', 'get in the basket!! GET IN!!',
    'leave the envelope!! GO!!', 'it has the cart!! GO!!',
    'untie her!! UNTIE HER!!', 'up!! we go up NOW!!',
    'to the balloons!! GO!!',
  ],
  pilot: [
    'CAST OFF!! WE GO NOW!!', 'everybody in!! NOW!!',
    'it is not on the programme!!', 'burn!! BURN!! full burn!!',
    'leave the cart!! LEAVE IT!!', 'up is the only way!!',
  ],
  marshal: [
    'BEHIND THE GOLD LINE!! ALL OF YOU!!', 'to the balloons!! TO THE BALLOONS!!',
    'Warden four to the Keep!! it is HERE!!', 'walk!! do not run!! oh, RUN!!',
    'leave the rope!! LEAVE IT!!', 'this way!! THIS way!!',
    'I am counting you!! keep together!!',
  ],
  cleaner: [
    'MY BUCKET!! it ate my BUCKET!!', 'never mind the broom!! GO!!',
    'it is eating the CRUMBS!!', 'up the Keep!! UP!!',
    'leave it!! it is only a pennant!!', 'I just swept that cloud!! I JUST!!',
  ],
  tea: [
    'THE BUNS!! save the BUNS!!', 'to the balloons!! bring the tray!!',
    'it ate the OVEN!!', 'leave the icing!! LEAVE IT!!',
    'it has the cake cart!! oh no!!', 'everybody OUT of the queue!!',
  ],
  van: [
    'CLOSE THE HATCH!! CLOSE IT!!', 'it ate the CAKE cart!!',
    'out the back!! OUT THE BACK!!', 'leave the cakes!! GO!!',
    'to the balloons!! bring the tongs!!', 'thirty years of cake!! GONE!!',
  ],
  guide: [
    'THIS WAY!! everybody THIS way!!', 'follow the FLAG!! FOLLOW IT!!',
    'it is not on the tour!! RUN!!', 'keep together!! keep TOGETHER!!',
    'to the balloons!! never mind cake!!', 'hold on to your hat!! the CLOUD one!!',
  ],
  tourist: [
    'it ate the BALLOON!!', 'that is NOT on the programme!!',
    'RUN!! no, the other way!!', 'take the photo!! no!! RUN!!',
    'back to our island!! HOME!!', 'it is going for the BELL!!',
    'into a balloon!! leave the bag!!',
  ],
  ticket: [
    'no wristband needed!! just RUN!!', 'it ate the WAGON!!',
    'gates are open!! GO THROUGH THEM!!', 'leave the programmes!! LEAVE THEM!!',
    'the programme does not mention this!!', 'everybody OUT!! free of charge!!',
  ],
  shepherd: [
    'the SHEEP!! it is at the SHEEP!!', 'come by!! COME BY!! oh, balloon!!',
    'NOW they move!! now!!', 'into the basket!! all forty!! GO!!',
    'leave the crook!! LEAVE IT!!', 'get on, get on, GET ON!!',
  ],
  spectator: [
    'MY HAT!! it has my CLOUD HAT!!', 'to the balloons!! BRING THE BUNS!!',
    'every year!! never THIS!!', 'grab the kids!! GRAB THEM!!',
    'it is not a float!! RUN!!', 'flap!! FLAP!! oh, they are pretend!!',
    'this way!! keep TOGETHER!!',
  ],
  // he does not break format even now; the register does
  pym: [
    'OYEZ!! everybody to the balloons!!', 'not on the programme!! it is HERE!!',
    'the Ringing is MOVED!! to NOW!!', 'the scroll!! MY scroll!!',
    'the festival has changed!! GO!!', 'everybody UP!! by proclamation!!',
  ],
  kid: [
    'it ate the BELL!!', 'MUM!! it is coming!!',
    'my balloon!! MY BALLOON!!', 'run!! it is BIG!!',
    'I want to go in the basket NOW!!', 'is it a float?? it is NOT!!',
    'into the balloon!! carry me!!',
  ],
};
