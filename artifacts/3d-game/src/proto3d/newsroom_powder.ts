// ══════════════════════════════════════════════════════════════════════════
//  NEWSROOM — POWDER PASS, the closures desk that will not be hurried
//
//  THE CONCEIT, AND WHY IT IS NOT THE OTHER FOUR
//  ---------------------------------------------
//  Maple Falls has a mayor in denial. Pirate Bay has a manager in denial.
//  Game Day has two commentators who cannot stop calling the game. Lantern
//  Night has a recording that cannot notice anything at all. POWDER PASS is
//  THE VALLEY BULLETIN: local radio, the school-closures desk, read by
//  somebody who has been reading closure lists since five in the morning and
//  will not be hurried by anything, including the end of the valley.
//
//  The others deny the void, or fail to perceive it. This one FILES it. The
//  void enters the world as an item of administration — first not on the
//  piste map, then on the closure list, then the entire closure list — and
//  the comedy is bureaucratic understatement against total catastrophe. The
//  format never breaks. The list just gets shorter.
//
//    tier 0  DOUBT. The desk has heard about the hole and declines to
//            dignify it. Officially it is weather; the resort wishes to
//            stress that it is not on the piste map. Zero exclamation marks
//            in this tier, by rule: doubt is delivered flat.
//    tier 1  ALARM. The desk believes it now, so theory stops and advice
//            starts, in exactly the same measured voice. "All lifts are
//            suspended. All lifts are also missing."
//    tier 2  PANIC. Broadcasting from a drift on the High Shoulder, still
//            reading the closure list, which now has one item on it.
//
//  THE CAST is small and half of it was hired elsewhere: Norm the ice
//  fisherman and Chairman Frost the reigning snowman champion are already
//  established in newsroom_react.ts and POWDER_BEATS, so they are reused
//  here, not reinvented. New to this file: Vern the gritter driver (thirty
//  one winters, keeps gritting), Grete the lift operator at the top station,
//  Mrs. Tannen the school secretary (phones in; school is shut), and Franz
//  the ski instructor, inconsolable strictly about equipment. Nobody is ever
//  hurt — people pop out of drifts looking cross. The jokes are about
//  dignity, lost mittens and cancelled events, never danger.
//
//  THE RULE ABOUT THE VOID. The desk covers ONE thing: a hole is eating the
//  valley. Nobody here can know that some OTHER hole has a name, so no line
//  refers to a rival by name; if a line needs a second void it says "another
//  one" or "a second hole". Same rule the other four newsrooms carry, for
//  the same reason — the ticker is diegetic and the leaderboard is not.
//
//  TEMPLATES. {M} is the last thing eaten, {D} the district the player is
//  standing in, {P} the percent devoured, {R} the percent still standing,
//  {F} the player's form, {S} seconds left. Every one is real live state, so
//  the desk is reading the child's own run back to them off the closure
//  list. This world has no LIVE pool and no per-meal pools — same shape as
//  Lantern Night — so the token lines at the foot of each T*_GENERAL are the
//  ONLY route live state has to the ticker here. Keep them.
// ══════════════════════════════════════════════════════════════════════════

export type NewsTier = 0 | 1 | 2;

/** District ids exactly as biomeAt returns them for this world — powder.ts's
 *  ids are all new words in the shared Biome union, so unlike lantern there
 *  is no boundary translation to agree with. What pwRegionAt says, we key. */
export type PwDist = 'village' | 'lake' | 'pinewood' | 'piste' | 'lodge' | 'rim';

export interface PowderCtx {
  tier: NewsTier;
  district: PwDist | null;
  lastMeal: string;
  devouredPct: number;
  form: string;
  secondsLeft: number;
  // accepted and ignored, exactly as the desk ignores them: a closures desk
  // reads what is on the list, and no rival's name is on the list. Declared
  // so the shared call site type-checks; never read.
  rivalName?: string;
  rivalLead?: number;
  /** PHASE 0. An ordinary snow day, before anything has arrived. Set by the
   *  arc driver (newsroom_arc.ts) for the first couple of cards of every
   *  match; when it is true, `tier` and every live token are ignored and the
   *  desk reads the MORNING pool. */
  morning?: boolean;
}

/** Per-tier badge. The station does not change — its composure does. */
export const POWDER_BRAND: [string, string, string] = [
  '📻 THE VALLEY BULLETIN',
  '📋 CLOSURES SPECIAL',
  '🏔️ THE LAST BULLETIN',
];

// ── the sign-on ────────────────────────────────────────────────────────────
// The first thing anybody hears, guaranteed. It has to establish the whole
// premise in one line: it snowed, school is shut, and the desk has been at
// this since well before you woke up.
const SIGN_ON: string[] = [
  'Good morning, the valley! The school is shut and the snow is not.',
  'Good morning, the valley! Closures so far: the school. Stay tuned.',
  'Good morning, the valley! Vern has been gritting since four.',
  'Good morning, the valley! One mitten found at the lift base. Blue.',
  'Good morning, the valley! Sixty centimetres overnight, all on Vern\'s road.',
  'Good morning, the valley! The lake has frozen right across again.',
  'Good morning, the valley! The lift queue is nine children and a dog.',
  'Good morning, the valley! Chairman Frost stood all night. Unmelted.',
  'Good morning, the valley! Closures at six, seven and eight, as always.',
  'Good morning, the valley! Mrs. Tannen has phoned in. School is shut.',
  'Good morning, the valley! Franz has waxed forty skis before breakfast.',
  'Good morning, the valley! Norm is out on the ice already. Of course.',
  'Good morning, the valley! Grit stocks are described as ample.',
];

// ── the morning ────────────────────────────────────────────────────────────
// PHASE 0: the snow day itself, before anything purple has arrived. This is
// the baseline the whole arc lands against — a child has to hear the valley
// simply being a valley, closure lists and grit-lorry updates and a lost
// mitten, so that the desk reading a hole in the same voice later is funny
// instead of just first.
//
// No {tokens}: morning must not depend on match state. No greeting: the
// sign-on already said it. Mostly one sentence, because the desk reads list
// items and a list item is one sentence long.
const MORNING: string[] = [
  'The school is shut, which the school wishes to confirm a third time.',
  'Vern has gritted the shore road twice and calls it a light morning.',
  'The lift opens at nine and the queue formed at seven.',
  'A blue mitten was found at the lift base and awaits its owner.',
  'Norm has drilled his fishing hole in the usual spot on the lake.',
  'The lake ice measures forty centimetres, says Norm, who stamped on it.',
  'Grete reports the top station is above the clouds and smug about it.',
  'Mrs. Tannen phoned to say school is shut tomorrow as well, probably.',
  'The Home Run was groomed at dawn and is described as a ribbon.',
  'Entries for the snowman contest close at noon and stand at eleven.',
  'Chairman Frost has worn the same carrot for three winters running.',
  'Franz is teaching the beginners to stop, his least favourite lesson.',
  'Every chalet chimney is going and the valley smells of toast.',
  'The sled hill rope is frozen stiff and being used as a handrail.',
  'The pinewood took the snow standing up, as the pinewood does.',
  'Cocoa at the lodge is two coins, or one if you carried firewood up.',
  'The grit lorry will do the High Shoulder after lunch, weather willing.',
  'Lost so far today: one mitten, one bobble hat and somebody\'s left ski.',
  'The plough has been round the village twice and waved both times.',
  'Icicles on the school gutter have reached the record, and school is shut.',
  'The chairlift ran empty for an hour this morning, just to warm up.',
  'Snow is forecast on top of the snow, with further snow behind it.',
  'Has anyone seen the school caretaker, or is that snowman wearing his hat?',
  'A toboggan train of eleven children took the Home Run in one piece.',
  'The lodge has lit the big fireplace and the smoke goes straight up.',
  'Nothing is closed except the school, and the school is very closed.',
];

// ── TIER 0 · DOUBT ─────────────────────────────────────────────────────────
// The desk has heard about the hole and is not going to dignify it. It is
// weather, or a drift with opinions, or a shadow. Not one exclamation mark:
// doubt is delivered flat, and the flatness IS the joke.
const T0_GENERAL = [
  'The resort wishes to stress that the hole is not on the piste map.',
  'A large round patch has appeared on the snow. Vern is sending grit.',
  'The council has classified the hole as weather.',
  'Norm reports his fishing hole has been joined by a much bigger one.',
  'A purple something crossed the Home Run at nine. The groomer will fix it.',
  'The hole is thought to be a drift that has gone the other way.',
  'Grete rang down to ask if the valley looks different. It looks fine.',
  'Three sleds are missing. Sleds are always missing. This is not news.',
  'Franz says something ate a slalom gate. Franz has had a long week.',
  'The bulletin will not use the word hole. The patch, then, is spreading.',
  'An expert has explained the hole as a shadow cast by nothing much.',
  'A snowman has left the contest early. Snowmen do not do that.',
  'Mrs. Tannen asks if school is shut because of the hole. No. It is snow.',
  'The chairlift swung over something purple. Maintenance found smooth snow.',
  'Vern gritted around the patch this morning. The grit has not come back.',
  'The lost blue mitten has been found, briefly, at the edge of the hole.',
  'A chalet reports its garden gnome missing, along with the garden.',
  'The tourist office asks visitors to enjoy the valley in the usual order.',
  'Skaters describe a new hole in the lake ice. Norm denies drilling it.',
  'The piste map has been reprinted without comment and without one piste.',
  'Whatever is out on the snow, it is tidying the snow as it goes.',
  'The council will discuss the hole in spring, under any other business.',
  'A witness says the hole slid uphill. The desk notes that holes do not.',
  'Sled hire reports one toboggan returned on time and nine returned nowhere.',
  'The bulletin has received four calls about a purple thing. And a fifth.',
  'The snowplough went to move the patch along. The patch moved the plough.',
  'Officials measured the hole at eleven. It measured differently at noon.',
  'Whose toboggan is parked at the edge of the hole, and why is it leaning in?',
  'Grit stocks remain ample, and this remains the official position.',
  'A pine has gone from the pinewood, roots and all. Pines do not go that way.',
  'The resort reminds guests that the mountain is entirely safe, broadly.',
  // ── live state, read off the closure list. See the note above TOKENS. ──
  'The hole was last seen near {M}. Vern has been told.',
  'Callers in {D} report a purple visitor. The desk reports calm.',
  'An early tally suggests {P} percent of the valley is mislaid.',
  'Witnesses call it a {F}. The desk calls it a drift with opinions.',
  'Sled hire lists {M} as overdue rather than missing.',
  '{D} reports nothing wrong, twice, without being asked.',
  'The desk can confirm {R} percent of the valley is present and correct.',
  'Item: {M} is off the piste map as a precaution.',
];
const T0_BY_DIST: Record<PwDist, string[]> = {
  village: ['The chalets report nothing missing except one gnome and one fence.',
    'A purple guest is doing the rounds of the village. Uninvited but tidy.',
    'The grit road through the village is gritted. Vern says so twice.',
    'One chalet\'s doorstep is missing. The door is taking it well.',
    'Village news: all quiet, apart from the patch, which nobody mentions.'],
  lake: ['The ice is forty centimetres thick and holding, mostly everywhere.',
    'Norm asks whoever widened his fishing hole to stop.',
    'Skating continues at the north end. The south end is under review.',
    'The lake is fine. The lake has always been fine.'],
  pinewood: ['The pinewood is quiet, which is normal, and quieter, which is not.',
    'A log pile has left the pinewood without a permit.',
    'Deep snow off the path. The path is also, in places, off the path.',
    'The pines are counted yearly. The count may be moved up.'],
  piste: ['The Home Run is groomed, open and slightly shorter than advertised.',
    'A slalom gate has gone missing mid-slalom.',
    'Sledders report a new dip on the Home Run. The dip reports nothing.',
    'The piste is open. Parts of the piste are more open than others.'],
  lodge: ['The lodge reports a full fireplace and an odd draught from downhill.',
    'Cocoa is still two coins. The lodge sees no reason for alarm pricing.',
    'The lodge sundeck has lost a railing. Guests are using the other one.',
    'The ski racks outside the lodge hold fewer skis than were racked.'],
  rim: ['The High Shoulder is above all this, and intends to stay so.',
    'Nothing up here but snow, pylons and an excellent view of the patch.',
    'The shoulder path is open and, the desk notes, uphill all the way.'],
};

// ── TIER 1 · ALARM ─────────────────────────────────────────────────────────
// The desk believes it now, so theory stops and advice starts — in the same
// measured voice, which is the whole engine. Reports get short. The closure
// list grows. One exclamation mark maximum, and rarely spent.
const T1_GENERAL = [
  'All lifts are suspended. All lifts are also missing.',
  'The closure list has been extended. The list of open things is quicker.',
  'Vern is gritting uphill now. Vern has never gritted uphill.',
  'Grete is fine. The top station is fine. The middle of the lift is a gap.',
  'The school would be shut anyway, notes Mrs. Tannen, from a tall drift.',
  'Please move uphill at your convenience. Your convenience is now.',
  'The snowman contest is postponed. The entrants are asked to run.',
  'Franz has counted his beginners twice. All present. All uphill.',
  'The hole has been upgraded from weather to a closure.',
  'The lake ice is fine, reports Norm, from the half of the lake still iced.',
  'The word hole is now in use at this station.',
  'Chalets are advised to lock their doors and stop being near the hole.',
  'The piste map is being reprinted hourly and thinner each time.',
  'Advice from the council: uphill. Further advice: keep going.',
  'The grit budget has been doubled. The road it was for has halved.',
  'Item: the sled hill. Item: the sled hut. Item: the sleds.',
  'The plough is going up the Home Run with half the village aboard.',
  'Chairman Frost has been moved to higher ground by four strong judges.',
  'The bulletin regrets to close the lake. The lake is closing itself.',
  'A second bulletin reader has been woken. She is reading this now.',
  'Missing since ten: the lift base, the lift queue and the QUEUE sign.',
  'The tourist office has moved into a drift and reopened, out of habit.',
  'Do not go back for toboggans. The toboggans are not there.',
  'The pinewood is down to half its pines and none of its log piles.',
  'Grete has been asked to stay put. Grete has been given the cocoa.',
  'The Home Run is now a home walk. Walk it uphill.',
  'Can a hole climb? The council says no. The council is climbing anyway.',
  'The village is asked to gather at the lodge and to bring the cat.',
  'A lift chair has landed in a pine. Both passengers climbed down cross.',
  'Grit does not work on it, Vern reports. Vern gritted it anyway.',
  'The bulletin is now a rolling closure list, rolling uphill.',
  // ── live state, read off the closure list ──
  'Added to the closure list: {M}.',
  'Update from {D}: no further updates from {D}.',
  '{P} percent of the valley is now a matter for spring.',
  'The hole is registered as a {F}. The registry has moved uphill.',
  'Roughly {R} percent of the valley remains open. Uphill parts, mostly.',
  'The hole is in {D}. Do not be in {D}.',
  'Witnesses saw {M} go. The desk saw the paperwork go.',
  'Vern reports {M} gone and his gritting route with it.',
];
const T1_BY_DIST: Record<PwDist, string[]> = {
  village: ['Three chalets are now two chalets. The desk will recount at noon.',
    'The village is walking uphill in good order, cocoa first.',
    'Chalet bookings are being honoured at a different altitude.'],
  lake: ['The lake has developed a shore where the middle used to be.',
    'Skating is suspended. Sections of rink are unaccounted for.',
    'Norm has moved his chair twice and his opinion once.'],
  pinewood: ['The pinewood is being crossed briskly and in single file.',
    'Squirrels are leaving the pinewood upwards. The correct direction.',
    'Log piles are down to logs. Logs are down to bark.'],
  piste: ['The Home Run is closed from the middle outwards.',
    'Slalom gates are down to three. The course is now a decision.',
    'Do not sled the Home Run. The run ends early.'],
  lodge: ['The lodge has moved the cocoa to the top floor as a precaution.',
    'The sundeck is shut. The sun is fine. The deck is the issue.',
    'The lodge doors are open uphill and closed downhill, firmly.'],
  rim: ['The High Shoulder is filling up with sensible people.',
    'The top of the valley is the place to be, says everybody arriving.',
    'Pylon nine is now the meeting point. Pylon eight is now a rumour.'],
};

// ── TIER 2 · PANIC ─────────────────────────────────────────────────────────
// Broadcasting from a drift on the High Shoulder, still reading the closure
// list, which now has exactly one item on it. Panic here is "!!" or nothing,
// never a lone "!": the desk either holds its composure completely or loses
// it completely, and the alternation is the rhythm of this tier.
const T2_GENERAL = [
  'The closure list now reads: the valley.',
  'This station is broadcasting from a drift on the High Shoulder.',
  'Everything is shut!! The bulletin has never felt so prepared.',
  'Item one: everything. There is no item two.',
  'The valley is closed, and the valley is, increasingly, the reason.',
  'Vern drove the gritter to the summit and is gritting the summit. For grip.',
  'The lodge fire is out!! The lodge is out. Everybody else is out and safe.',
  'School is shut forever!! The children have taken the news bravely.',
  'The lake has gone!! Norm kept his fish. Norm kept his chair.',
  'Uphill, everybody, and keep your mittens on.',
  'The village is a semicircle now. Head for the open side.',
  'Franz is carrying two beginners and four sets of skis. Uphill.',
  'Grete is hauling people up the lift cable, hand over hand, laughing.',
  'Mrs. Tannen is at the top taking a register. Everyone answers.',
  'The Home Run has run home!! Use the pinewood side. What is left of it.',
  'Chairman Frost is on the plough roof, riding uphill, still champion.',
  'The hole ate the transmitter mast. This is going out by shouting.',
  'Snow is still falling!! There is less and less for it to land on.',
  'The grit is gone. The road under the grit is gone. Vern is fine.',
  'Take the High Shoulder path and count the children as you go.',
  'The cocoa has been carried out of the lodge. Priorities were agreed early.',
  'People are popping out of drifts all along the shore, cross but complete.',
  'There is no more piste map. There is barely any more piste.',
  'A toboggan full of grannies just overtook the plough. Uphill.',
  'The bulletin is down to one page. The page is down to one line.',
  'The lake went in one sheet!! Ice, fishing holes and all.',
  'Do not stop to build anything. The snowmen understand.',
  'Weather next: snow, onto nothing in particular.',
  'The valley is now mostly view.',
  'Whoever is uphill of the hole, stay uphill of the hole.',
  'The last chalet is going!! Its window boxes are already up here with us.',
  // ── live state, read off what is left of the list ──
  '{P} percent of the valley is gone. Read the list, then climb.',
  'It has taken {M}!! Keep climbing.',
  '{D} is off the map. The map is off the map.',
  'It is a {F} now. The closure list has no column wide enough.',
  '{S} seconds of valley left. Mittens on, everybody up.',
  'It took {M} without slowing. The High Shoulder, everyone.',
  '{R} percent of the valley remains. The bulletin remains with it.',
  '{S} seconds!! Uphill, and bring the sled for the little ones.',
];
const T2_BY_DIST: Record<PwDist, string[]> = {
  village: ['The village is going!! Out the uphill doors, everyone.',
    'Leave the chalets. Take the children, the cat and the cocoa.',
    'The last gnome has been rescued from the last fence. Go up.'],
  lake: ['Off the ice!! All of it. Norm, that includes you.',
    'The lake is going in one sheet. Do not stand on the sheet.',
    'The fishing holes are joining up. Shore, everybody, then uphill.'],
  pinewood: ['Through the pines and keep climbing!! Do not stop for cones.',
    'The pinewood is thinning behind you. Do not look. Climb.',
    'Follow the log sledge track up. It knows the way out.'],
  piste: ['Clear the Home Run!! It comes up faster than anyone goes down.',
    'Off the run. Sideways into the soft snow. Now.',
    'The slalom is one gate. Do not stop to take the gate.'],
  lodge: ['The lodge is next!! Everybody out the uphill door with a bun.',
    'It is at the lodge steps. The steps are optional now. Out.',
    'A hundred winters the lodge stood. It will not see lunch.'],
  rim: ['Keep to the High Shoulder and keep climbing.',
    'You are high enough when you can see the whole hole. Higher, then.',
    'Nearly at the top. The valley is nearly not a valley. Keep on.'],
};

// ── THE LAST WORDS ─────────────────────────────────────────────────────────
// The one beat every world gets: somebody, safe, up the shoulder, saying
// goodnight. The desk closes the way it opened — with the list — because a
// closures desk that broke format at the very end would be admitting the
// format ever mattered less than the valley, and it would never.
const SIGN_OFF: string[] = [
  'That concludes the closures. That concludes, in fact, the valley.',
  'Everyone is up the High Shoulder, counted twice by Mrs. Tannen.',
  'Vern parked the gritter at the summit. It faces uphill, out of habit.',
  'School is shut tomorrow. This has never been more certain.',
  'Norm came off the ice with his fish, and Grete brought down the cocoa.',
  'Chairman Frost rode the plough up and is champion of the summit now.',
  'The snow is still falling, softly, on everything that is left.',
  'This has been the Valley Bulletin. The valley sends apologies.',
  'One blue mitten found its owner at the top. A full day, then.',
  'Goodnight from the closures desk, which is a drift, with a view.',
];

// ── the pools, per tier ────────────────────────────────────────────────────
const GENERAL: [string[], string[], string[]] = [T0_GENERAL, T1_GENERAL, T2_GENERAL];
const BY_DIST: [Record<PwDist, string[]>, Record<PwDist, string[]>, Record<PwDist, string[]>] =
  [T0_BY_DIST, T1_BY_DIST, T2_BY_DIST];

let signedOn = false;
let signedOff = false;   // the desk has said goodnight; it does not come back
let recent: string[] = [];

export function resetPowderNews(): void {
  signedOn = false;
  signedOff = false;
  recent = [];
}

/** How many distinct lines this world can say, for the census the other
 *  newsrooms report. Counted rather than asserted. */
export function powderNewsCount(): number {
  let n = SIGN_ON.length + MORNING.length + SIGN_OFF.length;
  for (const g of GENERAL) n += g.length;
  for (const d of BY_DIST) for (const k of Object.keys(d)) n += d[k as PwDist].length;
  return n;
}

/** the ticker is one line on a phone. nothing here gets to be a paragraph. */
const TICKER_MAX = 78;
/** {M} lands MID-CLAUSE in most templates, so what arrives has to be a bare
 *  noun phrase: no terminal stop, no comma, nothing after one. Both defects
 *  have shipped from the call site and both were only visible on a rendered
 *  card, so the substitution point defends rather than the pools. */
const fragment = (s: string): string => (s.split(/[,.;:]/)[0] || s).trim();
const clip = (s: string, n: number): string => {
  if (s.length <= n) return s;
  const cut = s.slice(0, n);
  const sp = cut.lastIndexOf(' ');
  return (sp > n * 0.5 ? cut.slice(0, sp) : cut).trim();
};

function fill(t: string, c: PowderCtx): string {
  const pct = Math.max(1, Math.min(99, Math.round(c.devouredPct)));
  return t
    .replace(/\{M\}/g, clip(fragment(c.lastMeal || 'something'), 22))
    .replace(/\{D\}/g, DIST_NAME[c.district ?? 'village'])
    .replace(/\{P\}/g, String(pct))
    .replace(/\{R\}/g, String(100 - pct))
    .replace(/\{F\}/g, clip(c.form || 'hole', 14))
    .replace(/\{S\}/g, String(Math.max(1, Math.ceil(c.secondsLeft))));
}

/** A countdown line with two and a half minutes left is a weather report,
 *  not an evacuation — same gate all five newsrooms hold on {S}. */
const usable = (t: string, c: PowderCtx): boolean =>
  !(t.includes('{S}') && c.secondsLeft > 70);

/** Every name carries its own article, because {D} lands mid-sentence and a
 *  template that adds one prints "the the village". The meter bans articles
 *  before {D} for exactly this reason. */
const DIST_NAME: Record<PwDist, string> = {
  village: 'the village', lake: 'the frozen lake', pinewood: 'the pinewood',
  piste: 'the Home Run', lodge: 'the Lodge', rim: 'the High Shoulder',
};

/** One headline. The sign-on is guaranteed first; after that it is a weighted
 *  pick between the district's own lines and the general pool, biased toward
 *  the district because a bulletin naming the slope you are standing on is
 *  the whole reason this file is per-district. */
export function pickPowderNews(ctx: PowderCtx, rnd: () => number = Math.random): string {
  if (!signedOn) {
    signedOn = true;
    return clip(SIGN_ON[Math.floor(rnd() * SIGN_ON.length)], TICKER_MAX);
  }
  // PHASE 0. Still the ordinary snow day: no hole, no live state, no tokens.
  if (ctx.morning) {
    const fresh = MORNING.filter((l) => !recent.includes(l));
    const src = fresh.length ? fresh : MORNING;
    const line = src[Math.floor(rnd() * src.length) % src.length] ?? MORNING[0];
    recent.push(line);
    if (recent.length > 6) recent.shift();
    return clip(line, TICKER_MAX);
  }
  const tier = Math.max(0, Math.min(2, ctx.tier)) as NewsTier;
  // ONCE, AND LAST. Tier 2 can arrive with most of the match still to play,
  // far too soon for "goodnight" — so the goodnight waits until the match is
  // genuinely over the hill, and taking it closes the desk for the night.
  // Same gate the other newsrooms use: a sign-off that fires twice is not an
  // ending.
  if (tier === 2 && !signedOff && ctx.secondsLeft <= 26 && rnd() < 0.45) {
    signedOff = true;
    return clip(SIGN_OFF[Math.floor(rnd() * SIGN_OFF.length)], TICKER_MAX);
  }
  const dist = ctx.district && BY_DIST[tier][ctx.district] ? ctx.district : null;
  const local = dist ? BY_DIST[tier][dist] : [];
  // 55% local when there is a local pool — enough that the slope underfoot is
  // usually the subject, not so much that the desk never reads the wide list
  const wide = GENERAL[tier].filter((h) => usable(h, ctx));
  const pool = local.length && rnd() < 0.55 ? local : wide;
  const fresh = pool.filter((h) => !recent.includes(h));
  const src = fresh.length ? fresh : (pool.length ? pool : wide);
  const line = src[Math.floor(rnd() * src.length)];
  recent.push(line);
  if (recent.length > 6) recent.shift();
  return clip(fill(line, ctx), TICKER_MAX);
}
