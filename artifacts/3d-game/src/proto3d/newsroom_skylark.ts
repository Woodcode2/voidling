// ══════════════════════════════════════════════════════════════════════════
//  NEWSROOM — SKYLARK FIELD, the desk whose instruments are working perfectly
//
//  THE CONCEIT, AND WHY IT IS NOT THE OTHER FIVE
//  ---------------------------------------------
//  Maple Falls has a mayor who denies there is a void. Pirate Bay has a resort
//  tannoy that covers. Game Day has two commentators calling it as a game.
//  Lantern Night has a recording that cannot perceive damage, only hospitality.
//  Powder Pass has a closures desk that will not be hurried.
//
//  SKYLARK FIELD has MR PYM, the Balloonmeister, on the tower balcony, and his
//  denial is TECHNICAL. He is not covering, not hoping, not refusing to look.
//  He has instruments, they are excellent, and they are answering the wrong
//  question with total confidence. He processes the void as CONDITIONS — a
//  meteorological feature and a surface obstruction — and files it under the
//  only headings the briefing form has.
//
//  AND THE JOKE IS WIRED TO THE PLAYER'S OWN PROGRESS, which no other newsroom
//  in this game manages. As the child eats, the field gets flatter, emptier and
//  clearer. So Pym's instruments keep reporting that conditions are IMPROVING,
//  and by his own criteria he is RIGHT. At tier 2 he declares the finest flying
//  conditions in the history of the meet, from the last standing structure on
//  the airfield, and every word of it is true.
//
//  HE NEVER BREAKS FORMAT. A briefing has a shape — wind, cloud base, notams,
//  have a good flight — and he reads it to the end every time. The sign-off
//  writes the everybody-is-fine rule for free: all crews accounted for.
//
//  THE RULE ABOUT THE VOID. This desk covers ONE thing: a feature on the field.
//  Nobody here can know that some OTHER void has a name, so no line refers to a
//  rival by name; if a line needs a second one it says "a second feature". The
//  same rule the other five newsrooms carry, for the same reason — the ticker
//  is diegetic and the leaderboard is not.
//
//  TEMPLATES. {M} is the last thing eaten, {D} the district, {P} the percent
//  devoured, {R} the percent still standing, {F} the player's form, {S} the
//  seconds left. Every one is real live state, so the briefing is reading the
//  child's own morning back to them as weather.
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
  /** accepted and ignored, exactly as the tower ignores them: Pym is reading a
   *  briefing form and the form has no box for another void's name. Declared so
   *  the shared call site type-checks; never read. */
  rivalName?: string;
  rivalLead?: number;
  /** PHASE 0. First light, the crews are rigging, and nothing has arrived. */
  morning?: boolean;
}

/** Per-tier badge. The desk does not change — its certainty does not either. */
export const SKYLARK_BRAND: [string, string, string] = [
  '🎈 THE MET BALLOON',
  '📋 FIELD BRIEFING',
  '📻 TOWER, TO ALL CREWS',
];

// ── the sign-on ────────────────────────────────────────────────────────────
// The first thing anybody hears. It has to establish the whole premise in one
// line: it is barely light, the air is dead calm, and a hundred balloons are
// about to go up.
const SIGN_ON: string[] = [
  'Good morning, Skylark Field. Wind calm, cloud base high, we fly.',
  'Good morning! Surface wind two knots. That is as still as it gets.',
  'Good morning, crews. The met balloon went straight up and stayed up.',
  'Good morning, Skylark Field. Ninety-one entries and all of them here.',
  'Good morning! Sunrise in nineteen minutes. Briefing is on the balcony.',
  'Good morning, crews. Dew on everything, no wind at all, perfect.',
  'Good morning, Skylark Field. The sheep are on 09 as usual.',
  'Good morning! Mr Pym has the tower and the tea urn is on.',
];

// ── PHASE 0: the ordinary morning, before anything arrives ────────────────
const MORNING: string[] = [
  'Crews are rigging on the launch field. Four people to a basket.',
  'The fans are running. That is the loudest this field ever gets.',
  'A trailer has arrived late and been waved to the far end.',
  'Envelopes are coming out of their bags all down the row.',
  'The bacon van is open. The queue is already visible from the tower.',
  'Grete has laid her crown line out to the full thirty metres.',
  'Somebody has tested a burner. Everybody looked up.',
  'The sheep have been asked to move. The sheep have not moved.',
  'Cloud base four thousand and lifting. Nothing in the notams.',
  'Franz cannot find his gloves. Franz has his gloves.',
  'The flea market is open in hangar two. Tea is thirty pence.',
  'The windsock is hanging straight down, which is the whole point.',
  'A dog has been round every basket on the field, once, politely.',
  'The model aircraft club is set up and has nothing to fly into.',
  'Passengers are being walked out to their numbers.',
  'The fire tender has been polished again. It has still never been used.',
  'The met balloon is up. It is going straight up, which is ideal.',
  'Chairman of the meet reminds crews that the far hedge is not ours.',
  'A gull has taken something from the doughnut trailer.',
  'First light on the tower glazing. Nineteen minutes to sunrise.',
  'Old Bess the tractor is out. Old Bess is always out.',
  'The rosette board has been hung. Thirty years of them.',
  'Crown lines out, mouths open, fans on. This is the good bit.',
];

// ── TIER 0 · DOUBT ─────────────────────────────────────────────────────────
// He notes a large violet feature moving across the field at four knots,
// observes that it was not forecast, and declares conditions good. No "!".
const T0_GENERAL = [
  'A large violet feature is crossing the field at about four knots.',
  'The feature was not forecast. Conditions otherwise remain good.',
  'The desk is logging a surface obstruction of unusual colour.',
  'Nothing in this morning\'s notams mentions a violet feature.',
  'Visibility unlimited. One obstruction, moving, low.',
  'The met balloon has been released again for a second opinion.',
  'A {F} has been observed on the launch field. Conditions are good.',
  'The instruments show nothing unusual. The instruments are excellent.',
  'Wind still calm. The feature is not affecting the wind.',
  'Crews are asked to note a moving obstruction and carry on rigging.',
  'The feature is round, violet and about {P} percent of the field wide.',
  'Cloud base unchanged. Surface wind unchanged. One new item.',
  'It ate {M}. That is a surface change, not a weather change.',
  'The desk has opened a new column on the form for this.',
  'Is the feature forecast? No. Is it a problem? The desk thinks not.',
  'Grete reports the feature is nearer than it was. Noted, thank you.',
  'Conditions at {D} remain suitable for launch.',
  'The tower can see it from here and is not concerned.',
  'A second met balloon has confirmed the first met balloon.',
  'It took {M} off the grass without slowing. Logged as removed.',
  'The obstruction has no registration. The desk has asked twice.',
  'Nothing has changed except the number of things on the field.',
];

// ── TIER 1 · ALARM ─────────────────────────────────────────────────────────
// He believes it now, and it changes nothing, because his criteria have not
// changed. The theory stops and the advice starts, in the same voice. One "!".
const T1_GENERAL = [
  'The feature is confirmed. The launch window is extended.',
  'Crews are asked to keep it on their left and continue.',
  'It has taken {M}. The desk has amended the plate.',
  'Revised: the obstruction is mobile, growing, and still not forecast.',
  'Conditions remain within limits. The limits do not mention this.',
  'The feature is now {P} percent of the field. Wind still calm.',
  'Launch is delayed for those affected. That is most of you.',
  'Mr Pym asks crews to rig away from it. Rig away from it, please.',
  'The desk has stopped taking new entries for this morning.',
  'How large is the {F} now? Larger than the last reading.',
  'It ate {M} and the desk has crossed it off the entry list.',
  'The far end of {D} is no longer available for launch.',
  'Everything is still legal. Everything is still calm. Please rig.',
  'The met balloon went up and did not come down anywhere.',
  'Crews on the north row: bring your kit in, not out.',
  'The obstruction is between the tower and the whale. Noted.',
  'The desk is now recording the feature every four minutes.',
  'Franz has moved his basket twice. Franz is asked to move it again.',
  'The plate has been amended for the third time this hour!',
  'Conditions are, on the desk\'s own criteria, improving.',
  'It took {M}. The field is flatter than it was, which helps.',
  'Passengers are asked to stay with their crews for now.',
];

// ── TIER 2 · PANIC, WHICH IS NOT PANIC ─────────────────────────────────────
// Broadcasting from the balcony, the last standing thing on the airfield, he
// declares the finest flying conditions in the history of the meet — and by his
// own criteria he is right. "!!" or nothing, never a lone "!".
const T2_GENERAL = [
  'Visibility unlimited in all directions!! Nothing is in the way.',
  'The desk reports the finest flying conditions in the meet\'s history.',
  'Every obstruction has been removed from the field. Every one.',
  '{R} percent of the field remains and all of it is clear.',
  'Conditions are perfect!! There is nothing left to fly around.',
  'The plate is now a blank sheet. That is technically ideal.',
  '{S} seconds of the window remain!! Crews to the high ground.',
  'It ate {M}!! The obstruction count is falling rapidly.',
  'All crews to the far hedge, please. Bring nothing. Bring people.',
  'The tower is the last item on the plate and the desk is in it.',
  'The met balloon has nowhere left to be released from.',
  'This is the tower. Everybody who is up is up. Everybody else, walk.',
  '{P} percent of Skylark Field has been cleared for takeoff!!',
  'The desk has run out of columns and is using the back of the form.',
  'Wind calm. Cloud base high. Field: gone. Have a good flight.',
  'Nothing is obstructing anything!! The desk wishes to note that.',
  '{S} seconds!! Do not go back for a basket. Go to the hedge.',
  'The whale is airborne and so is nearly everybody else.',
  'The last of {D} has gone. The desk logs conditions as excellent.',
  'Everyone is accounted for and most of them are above us.',
];

// ── the districts ──────────────────────────────────────────────────────────
const T0_BY_DIST: Record<SkDist, string[]> = {
  launchfield: [
    'Rigging continues on the launch field. Ninety envelopes, all out.',
    'The launch field reports one violet item among the balloons.',
    'Crews on the launch field are asked to keep their lines short.',
  ],
  arrivals: [
    'A trailer in the arrivals field has been asked to reposition.',
    'The arrivals field is full. The desk is turning nobody away.',
    'Envelopes are still coming out of bags down at arrivals.',
  ],
  runway: [
    'The runway is clear except for the sheep and one other item.',
    'Zero-nine is unobstructed apart from a moving violet feature.',
    'The centreline is visible for its whole length. Mostly.',
  ],
  circle: [
    'The whale is laid out on the launch circle and is enormous.',
    'The launch circle is reserved for the whale and remains so.',
    'Ground crew are walking the whale\'s seams as they do every year.',
  ],
  perimeter: [
    'Marshals on the perimeter report a violet item passing post four.',
    'The perimeter track is open to marshals and to nobody else.',
    'Post six has called in something round. Thank you, post six.',
  ],
  tower: [
    'The tower has the feature in sight and is entirely comfortable.',
    'The met hut confirms the instruments are working perfectly.',
    'Briefing continues on the balcony. All are welcome.',
  ],
  hangars: [
    'The flea market in hangar two reports brisk trade.',
    'Hangar one has closed its door, which it has not done in years.',
    'The model aircraft club is watching something and not flying.',
  ],
  breakfast: [
    'Breakfast Row is serving. The queue has not shortened.',
    'The bacon van reports a large violet customer. It did not order.',
    'Two hundred people are eating and one of them is not.',
  ],
  meadow: [
    'The rough is quiet. Skylarks up, hare out, fence still broken.',
    'Nothing to report from the far side of the field. Nothing at all.',
    'The old windsock mast is still lying where it fell.',
  ],
};

const T1_BY_DIST: Record<SkDist, string[]> = {
  launchfield: [
    'The launch field has lost its north row. The rest are rigging.',
    'Crews on the launch field: leave the kit and walk, please.',
    'Half the envelopes on the field are now on the wrong side of it.',
  ],
  arrivals: [
    'Arrivals is closed. Everything in it has been accounted for.',
    'The trailers at arrivals are empty and the desk is glad of it.',
    'Nobody else is coming in. The gate has been left open anyway.',
  ],
  runway: [
    'Zero-nine is obstructed. The sheep have finally moved.',
    'The runway is no longer available for anything.',
    'Both thresholds of one-five have gone. That is unusual.',
  ],
  circle: [
    'The whale is inflating. The desk advises crews to stand clear!',
    'Tether pins are being pulled on the launch circle.',
    'The whale is standing up and everybody has stopped to look.',
  ],
  perimeter: [
    'Marshals are walking the perimeter inward, which is new.',
    'Posts four through eight are no longer answering.',
    'The perimeter track is the shortest way to the hedge. Use it.',
  ],
  tower: [
    'The tower is still broadcasting and intends to keep doing so.',
    'The met hut has been logged as a former structure.',
    'Mr Pym is on the balcony and will not be coming down yet.',
  ],
  hangars: [
    'Hangar two has gone and the flea market with it. Nobody was in it.',
    'The tractors have been moved. The tractors moved themselves.',
    'The rosette board is safe. Somebody carried it out.',
  ],
  breakfast: [
    'Breakfast Row is serving from the far end only.',
    'The coffee horsebox has been towed to the hedge, still serving.',
    'The bacon van has gone. The bacon van fed everybody first.',
  ],
  meadow: [
    'The rough is where everybody is walking. Keep walking.',
    'The hare went that way an hour ago and had the right idea.',
    'Skylarks are up. That is the last normal thing on the field.',
  ],
};

const T2_BY_DIST: Record<SkDist, string[]> = {
  launchfield: [
    'The launch field is clear!! There is nothing left on it.',
    'Everything that was on the launch field is above the launch field.',
    'Ninety envelopes, ninety crews, and not one of them still here.',
  ],
  arrivals: [
    'Arrivals has gone. Nobody was in arrivals. That was the plan.',
    'The gate is standing in a field with no field behind it!!',
    'The ticket caravan has gone and it never did take any money.',
  ],
  runway: [
    'All three runways are unobstructed!! There are no runways.',
    'Zero-nine has gone. The sheep are up on the hedge, counted.',
    'The desk confirms the concrete is no longer a factor.',
  ],
  circle: [
    'The whale is going!! The whole field is going up with her.',
    'The launch circle is empty and the whale is over the hedge.',
    'She lifted at {S} seconds and took the last of the pins with her.',
  ],
  perimeter: [
    'The perimeter is gone and the marshals are at the hedge, counted.',
    'All posts accounted for!! Every wand, every marshal, every one.',
    'The track went last, which is fitting, since it drew the outline.',
  ],
  tower: [
    'The tower is the last item on the plate!! The desk is still in it.',
    'This is the tower. This is the tower. Everyone is up or out.',
    'Mr Pym has read the whole briefing including the forecast.',
  ],
  hangars: [
    'The hangars have gone!! The rosettes are on the hedge, all of them.',
    'Both sheds are clear and were clear before they went.',
    'Somebody saved thirty years of rosettes and the desk is moved.',
  ],
  breakfast: [
    'Breakfast Row has gone and everybody had eaten. Everybody.',
    'The last cup of tea on Skylark Field was poured on the hedge!!',
    'The urn is up the hill with the crowd, still warm.',
  ],
  meadow: [
    'The rough has gone and everybody who was in it is on the hedge.',
    'The skylarks went up first!! They always did know best.',
    'The hare is fine. Somebody checked. Somebody actually checked.',
  ],
};

// ── WHAT IT JUST ATE ──────────────────────────────────────────────────────
// ctx.lastMeal is free text from the call site and never names a balloon: the
// game tags HOUSE and CAR and sizes the rest, so four buckets is the whole
// vocabulary. The classifier is the Bugle's, imported rather than copied.
// The desk's angle on all four: it is an obstruction, it has been removed, and
// removal is an improvement.
const MEAL_HOUSE: Pools = [[
  'A structure has been removed from the field. Conditions improve.',
  'The desk has struck one building off the plate.',
  '{M} has gone. The desk notes the sightline is better for it.',
  'One less thing to fly around, which is the desk\'s whole job.',
], [
  'Another structure has gone. The plate is getting simpler!',
  'The desk has amended the building count. Downward.',
  'It ate {M}. Obstruction removed. Conditions improving.',
  'That was a shed. The desk logged it as a shed and now logs nothing.',
], [
  'Every structure on the field is now clear!! Every single one.',
  'The building count is zero and the desk finds that remarkable.',
  'It ate {M}!! Nothing tall remains except this tower.',
]];

const MEAL_CAR: Pools = [[
  'A vehicle has been removed from the grass. Noted, thank you.',
  'One trailer fewer at arrivals. The desk was not using it.',
  '{M} has gone from the verge. The verge is clearer.',
  'The desk logs one vehicle removed and no injuries.',
], [
  'Another vehicle has gone. The spectator band is thinning nicely.',
  'It took {M}. The desk has stopped counting the vehicles.',
  'Old Bess is fine. Old Bess is always fine.',
  'The retrieve crews have nothing to retrieve with!',
], [
  'All vehicles are clear of the field!! The desk confirms it.',
  'It ate {M}!! Nobody was in it. Nobody has been in anything.',
  'The car park is a field again, and then it is not a field.',
]];

const MEAL_BIG: Pools = [[
  'A large item has been removed. Sightlines materially improved.',
  '{M} has gone and the desk can now see the far hedge.',
  'The biggest obstruction on the plate has been struck off.',
  'One large item removed. The desk considers that progress.',
], [
  'It ate {M}. That was the largest thing on the field!',
  'The desk has lost its main reference point. Conditions good.',
  'Something very large has gone. The instruments did not flinch.',
  'The plate is down to small items. That is an improvement.',
], [
  'The largest items are all clear!! Visibility is now total.',
  'It ate {M}!! The desk has never had a cleaner field.',
  'Nothing large remains. Nothing medium remains either.',
]];

const MEAL_SMALL: Pools = [[
  'A small item has left the inventory. The desk has noted it.',
  'It took {M}. The desk is recording these individually.',
  'Something small has gone from {D}. Conditions unchanged.',
  'The desk logs a minor removal and no change to the wind.',
], [
  'Another small item. The desk has started a second column!',
  'It ate {M}. The list is getting shorter rather than longer.',
  'The small items are going faster than the desk can write.',
  'Grete has stopped reporting them. The desk understands.',
], [
  'The small items are all gone!! There is nothing to itemise.',
  'It ate {M}!! The desk has closed the inventory entirely.',
  'Every item on the form has been struck through.',
]];

const BY_MEAL: Record<MealKind, Pools> = {
  house: MEAL_HOUSE, car: MEAL_CAR, big: MEAL_BIG, small: MEAL_SMALL,
};

// ── LIVE / TEMPLATED ──────────────────────────────────────────────────────
//  {F} form  {M} last meal  {P} pct  {R} 100-pct  {S} seconds  {D} district.
//  Those SIX and no others. Never open a line with {D} or {M}: both arrive
//  lower case and a sentence starts with a capital.
const LIVE: Pools = [[
  'The {F} at {D} has been logged as a surface obstruction.',
  'A {F} is on the field and has not filed a flight plan.',
  'The desk is calling it a {F} and does not enjoy the word.',
  'Conditions at {D}: calm, clear, one {F}.',
  'The {F} is moving at walking pace and is not forecast.',
  '{P} percent of the field is now feature. Wind still calm.',
  'A {F} has been offered a briefing. It did not attend.',
  'The met balloon and the {F} are both violet. Unrelated.',
  'Passengers at {D} are asked not to approach the {F}.',
  'The desk has assigned the {F} no registration and no slot.',
  'Grete says the {F} is nearer. Grete has said that four times.',
], [
  'The {F} at {D} is larger than at the last reading.',
  'It ate {M}. The desk has amended the plate accordingly.',
  'The {F} is now {P} percent of Skylark Field.',
  'Crews are asked to keep the {F} on their left!',
  'The desk measured the {F} this morning and the tape ran out.',
  'Conditions at {D} are, by the desk\'s own criteria, improving.',
  '{R} percent of the field is still available for launch.',
  'The {F} has not requested clearance and has not needed it.',
  'It took {M} from {D} without slowing.',
  'The desk is logging the {F} every four minutes now.',
  'Mr Pym has revised the entry list down to those who are up.',
], [
  'The {F} is {P} percent of the field!! Visibility unlimited.',
  '{S} seconds of the window remain!! Everybody to the hedge.',
  'It ate {M}!! The plate is nearly a blank sheet.',
  'The {F} has cleared {D} entirely. Conditions there are perfect.',
  '{R} percent remains and the desk is standing on most of it.',
  'A {F} the size of the field is, technically, the field.',
  '{S} seconds!! Walk. Do not carry anything. Walk.',
  'The desk logs the {F} as terrain and closes the column.',
  'It has taken {D}!! Nothing there is obstructing anything now.',
]];

// ── the sign-off ───────────────────────────────────────────────────────────
// ONCE, AND LAST. He finishes the briefing, including the forecast, because he
// always does — and the everybody-is-fine rule writes itself.
const SIGN_OFF: string[] = [
  'All crews accounted for. Ninety-one balloons airborne. A record.',
  'That is the briefing. Wind calm, cloud base high, have a good flight.',
  'Every entry is up, over the hedge, or walking. Nobody is missing.',
  'The meet is closed. The committee wishes to note the attendance.',
  'Tomorrow: light winds, high cloud, and no field at all. Goodnight.',
  'The desk thanks the marshals, who counted everybody. Twice.',
  'Skylark Field flew ninety-one this morning, which has never happened.',
  'Mr Pym has read the forecast to the end. He always does.',
  'The sheep are on the hedge. The sheep are, as ever, unbothered.',
  'Good morning, and thank you. Conditions were perfect throughout.',
];

// ── the pools, per tier ────────────────────────────────────────────────────
const GENERAL: [string[], string[], string[]] = [T0_GENERAL, T1_GENERAL, T2_GENERAL];
const BY_DIST: [Record<SkDist, string[]>, Record<SkDist, string[]>, Record<SkDist, string[]>] =
  [T0_BY_DIST, T1_BY_DIST, T2_BY_DIST];

let signedOn = false;
let signedOff = false;   // the tower has finished the briefing; it does not restart
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

const DIST_NAME: Record<SkDist, string> = {
  circle: 'the launch circle', runway: 'the runway', perimeter: 'the perimeter',
  launchfield: 'the launch field', arrivals: 'the arrivals field',
  tower: 'the tower', hangars: 'the hangars', breakfast: 'Breakfast Row',
  meadow: 'the rough',
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
 *  the live templated lines, and the general briefing — biased toward the part
 *  of the field the child is standing on, which is the whole reason this file
 *  is per-district. */
export function pickSkylarkNews(ctx: SkylarkCtx, rnd: () => number = Math.random): string {
  if (!signedOn) {
    signedOn = true;
    return air(SIGN_ON[Math.floor(rnd() * SIGN_ON.length)]);
  }
  // PHASE 0. First light, crews rigging, no feature, no live state, no tokens.
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
  // too early to finish a briefing, so the sign-off waits for the endgame and
  // taking it closes the tower for the match.
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
  const varied = src.filter((h) => !droning(fill(h, ctx)));
  if (varied.length) src = varied;
  const line = src[Math.floor(rnd() * src.length)];
  recent.push(line);
  if (recent.length > RECENT_MAX) recent.shift();
  return air(fill(line, ctx));
}
