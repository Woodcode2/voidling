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
//  list. Two routes carry that now: the token lines at the foot of each
//  T*_GENERAL, and the MEAL_* and LIVE pools below, written in round 5. The
//  header used to call the absence of those pools "the same shape as Lantern
//  Night", which was true and was not a defence — the census measured 237
//  lines here against Maple Falls's 812, with neither pool present. Lantern
//  Night has both now. So does the closures desk.
// ══════════════════════════════════════════════════════════════════════════

import { mealKind, type MealKind } from './newsroom';

export type NewsTier = 0 | 1 | 2;

/** Three tiers of one pool — the shape every newsroom in the game already
 *  uses, named here because this file now has five more of them. */
type Pools = [string[], string[], string[]];

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
  'The resort wishes to stress that the void is not on the piste map.',
  'A large round patch has appeared on the snow. Vern is sending grit.',
  'The council has classified the void as weather.',
  'Norm reports his fishing hole has been joined by a much bigger one.',
  'A purple something crossed the Home Run at nine. The groomer will fix it.',
  'The void is thought to be a drift that has gone the other way.',
  'Grete rang down to ask if the valley looks different. It looks fine.',
  'Three sleds are missing. Sleds are always missing. This is not news.',
  'Franz says something ate a slalom gate. Franz has had a long week.',
  'The bulletin will not use the word void. The patch, then, is spreading.',
  'An expert has explained the void as a shadow cast by nothing much.',
  'A snowman has left the contest early. Snowmen do not do that.',
  'Mrs. Tannen asks if school is shut because of the void. No. It is snow.',
  'The chairlift swung over something purple. Maintenance found smooth snow.',
  'Vern gritted around the patch this morning. The grit has not come back.',
  'The lost blue mitten has been found, briefly, at the edge of the void.',
  'A chalet reports its garden gnome missing, along with the garden.',
  'The tourist office asks visitors to enjoy the valley in the usual order.',
  'Skaters describe a purple patch in the lake ice. Norm denies drilling it.',
  'The piste map has been reprinted without comment and without one piste.',
  'Whatever is out on the snow, it is tidying the snow as it goes.',
  'The council will discuss the void in spring, under any other business.',
  'A witness says the void slid uphill. The desk notes that voids do not.',
  'Sled hire reports one toboggan returned on time and nine returned nowhere.',
  'The bulletin has received four calls about a purple thing. And a fifth.',
  'The snowplough went to move the patch along. The patch moved the plough.',
  'Officials measured the void at eleven. It measured differently at noon.',
  'Whose toboggan is parked at the edge of the void, and why is it leaning in?',
  'Grit stocks remain ample, and this remains the official position.',
  'A pine has gone from the pinewood, roots and all. Pines do not go that way.',
  'The resort reminds guests that the mountain is entirely safe, broadly.',
  // ── live state, read off the closure list. See the note above TOKENS. ──
  'The void was last seen near {M}. Vern has been told.',
  'Callers in {D} report a purple visitor. The desk reports calm.',
  'An early tally suggests {P} percent of the valley is mislaid.',
  'Witnesses call it a {F}. The desk calls it a drift with opinions.',
  'Sled hire lists {M} as overdue rather than missing.',
  '{D} reports nothing wrong, twice, without being asked.',
  'The desk can confirm {R} percent of the valley is present and correct.',
  'Item: {M} is off the piste map as a precaution.',
  'The nine o\'clock list had four items. This is the ten o\'clock list.',
  'Mrs. Tannen has phoned to ask if the list is longer. It is not.',
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
  'The void has been upgraded from weather to a closure.',
  'The lake ice is fine, reports Norm, from the half of the lake still iced.',
  'The word void is now in use at this station.',
  'Chalets are advised to lock their doors and stop being near the void.',
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
  'Can a void climb? The council says no. The council is climbing anyway.',
  'The village is asked to gather at the lodge and to bring the cat.',
  'A lift chair has landed in a pine. Both passengers climbed down cross.',
  'Grit does not work on it, Vern reports. Vern gritted it anyway.',
  'The bulletin is now a rolling closure list, rolling uphill.',
  // ── live state, read off the closure list ──
  'Added to the closure list: {M}.',
  'Update from {D}: no further updates from {D}.',
  '{P} percent of the valley is now a matter for spring.',
  'The void is registered as a {F}. The registry has moved uphill.',
  'Roughly {R} percent of the valley remains open. Uphill parts, mostly.',
  'The void is in {D}. Do not be in {D}.',
  'Witnesses saw {M} go. The desk saw the paperwork go.',
  'Vern reports {M} gone and his gritting route with it.',
  'The eleven o\'clock list is shorter than the ten o\'clock list was.',
  'A caller asks which items came off the list. None of them did.',
  'Grete phoned the desk at eleven. The desk phoned Grete back at once.',
];
const T1_BY_DIST: Record<PwDist, string[]> = {
  village: ['Three chalets are now two chalets. The desk will count again at noon.',
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
  'The void ate the transmitter mast. This is going out by shouting.',
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
  'Whoever is uphill of the void, stay uphill of the void.',
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
  'The noon list has one item on it!! The desk has read it out twice.',
  'This list is shorter than the last list, and so is the valley.',
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
    'You are high enough when you can see all of the void. Higher, then.',
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

// ── WHAT IT JUST ATE ───────────────────────────────────────────────────────
//  ctx.lastMeal is free text from the call site and it never names a chalet or
//  a chairlift: the game tags HOUSE and CAR and sizes everything else, so four
//  buckets is the whole vocabulary. The classifier is the Bugle's, imported
//  rather than copied — one meal-name table upstream, one reader of it.
//  The desk's angle on all four: it is a closure, it is on the list, and the
//  list is accurate as of this morning.
const MEAL_HOUSE: Pools = [[
  // ── BEAT 2 · DENIAL ──
  'It has eaten {M}. The desk has filed that under snow.',
  'Why is that chimney still smoking with no chalet under it?',
  'The hire shack has gone and the skis are standing there in rows.',
  'The plough went past and waved at the gap where a chalet was.',
  'A chalet has gone and its cat is sitting where the sofa was.',
], [
  // ── BEAT 3 · ALARM ──
  'The sled hut, the tourist office and a chalet are now one closure.',
  'Two chalets have gone. Franz saved the skis and left the sofa.',
  'Is your chalet still where you left it this morning?',
  'Mrs. Tannen has lost her chalet and taken the register with her.',
  'That was {M}. Everybody got out in their slippers.',
], [
  // ── BEAT 4 · PANIC ──
  'That was {M}!! Out of the chalets and up the hill.',
  'A chalet has just gone!! Its fire was still going at the time.',
  'Another chalet has gone since the last item on this list.',
  'Take the little ones up the hill and leave the chalets to it.',
  'There are {S} seconds left and no chalets. Up the hill, everybody.',
  'Is there anybody still indoors, with not much indoors left?',
]];

const MEAL_CAR: Pools = [[
  // ── BEAT 2 · DENIAL ──
  'One car is missing and the closure list is already being retyped.',
  'A car has gone from under its snow. The snow is still car shaped.',
  'Where has the grit lorry got to? Vern says it is doing the top road.',
  'It ate {M} and the desk has moved on to the weather.',
  'The plough went out at eight and has not come back for its lunch.',
], [
  // ── BEAT 3 · ALARM ──
  'Half the cars will not start, so half the cars are being pushed.',
  'It took {M} with the wipers still going.',
  'Has anybody seen the grit lorry, or should the desk close the top road?',
  'One car alarm went off. Every other alarm in the village joined in.',
  'The last two cars are leaving together and one of them is towing a sled!',
], [
  // ── BEAT 4 · PANIC ──
  'Everything with wheels is going uphill!! Everything else is being carried.',
  'It took {M} and the hat of snow it was wearing.',
  'The road has gone!! The cars that were on it went up an hour ago.',
  '{S} seconds. The last car up has nine children and a dog in it.',
  'Every car has gone, so the desk has closed the car park to be certain.',
]];

const MEAL_BIG: Pools = [[
  // ── BEAT 2 · DENIAL ──
  'The lift pass still includes {M} at no extra charge.',
  'The sled hill is missing its top half and the sledders have not noticed.',
  'Grete says {M} is not where she left it.',
  'Was the lift always this short, or has somebody borrowed the rest?',
  'The snowman contest has lost its tent. The judges\' lunch was inside it.',
  'Grete says a pylon came out of the mountain like a birthday candle.',
], [
  // ── BEAT 3 · ALARM ──
  'The lodge roof went in one piece and the fireplace is still lit!',
  'Franz is not upset about the lodge. Franz is upset about the skis inside.',
  'Chairman Frost watched the whole thing go and did not move his carrot.',
  'Anyone holding a ticket for {M} may keep the ticket.',
  'Can it really eat something that big? Grete says it just did.',
  'Norm saw {M} go and went back to his fishing hole.',
], [
  // ── BEAT 4 · PANIC ──
  'The last pylon has gone!! The cable came down after it, all of it.',
  'That was {M}!! Nothing that big is left to read out.',
  'Is anything that big left? Only the school, and the school is shut.',
  'The plough is up here with us and it is the biggest thing left.',
  'The desk is pleased to report that the mountain is still here.',
]];

const MEAL_SMALL: Pools = [[
  // ── BEAT 2 · DENIAL ──
  'Franz has lost a ski pole and would like it noted that he had two.',
  'It took {M}, and a snowman has been asked what he saw.',
  'Has the school gate gone, and does that mean school is open?',
  'The dog is being blamed for {M}. The dog was asleep.',
  'Somebody\'s lunch box has gone from the lift queue. The queue has not moved.',
  'A squirrel has taken a bun from the lodge steps, in broad daylight.',
], [
  // ── BEAT 3 · ALARM ──
  'Anything you put down is going, so do not put anything down!',
  'The lost property box has gone, and {M} was in it.',
  'Hold on to your cocoa. It has taken three cups off the sundeck.',
  'Three fence posts have gone and the fence is still standing up.',
  'It took the sign for the sled hill and left the sled hill alone.',
  'It took {M} off a doorstep and did not wipe its feet.',
], [
  // ── BEAT 4 · PANIC ──
  'It has taken the last bucket!! Vern was using the last bucket.',
  '{S} seconds left, and it has stopped for {M}.',
  'Nobody is to go back for a lunch box. Not even that lunch box.',
  'It has taken the ski rack!! Franz is carrying the skis himself.',
  'Whose bobble hat is that, and is it too late to fetch it?',
  'Somebody threw it {M} to keep it busy. That did not work.',
]];

const BY_MEAL: Record<MealKind, Pools> = {
  house: MEAL_HOUSE, car: MEAL_CAR, big: MEAL_BIG, small: MEAL_SMALL,
};

// ── LIVE / TEMPLATED ───────────────────────────────────────────────────────
//  {F} form  {M} last meal  {P} pct  {R} 100-pct  {S} seconds  {D} district.
//  Those SIX and no others. Never open a line with {D} or {M}: both arrive
//  lower case and a sentence starts with a capital.
const LIVE: Pools = [[
  // ── BEAT 2 · DENIAL ──
  'The desk is calling it a {F} and does not enjoy the word.',
  'A squirrel has run up the {F} and come down the other side.',
  'A {F} has joined the lift queue. It has not pushed once.',
  'Is the patch at {D} on the piste map? The map says no.',
  'Vern gritted a ring around the {F} and it did not slip once.',
  'Franz asked the {F} to stop on the nursery slope. It stopped.',
  'School is shut for snow, and the {F} gets no credit for it.',
  'One item on the closure list, and it is the school, not {D}.',
  'Item four on the list is a blue mitten. Item five is {M}.',
  'Top story: the record icicles. Second story, briefly: a {F}.',
  'The skaters report the ice is fine, in a noticeably smaller circle.',
  'Asked about {M}, the desk would rather discuss the snow.',
], [
  // ── BEAT 3 · ALARM ──
  'The desk has crossed {M} off the map with a ruler.',
  'Everything is shut except the lodge, and the lodge has buns!',
  'Vern was still gritting towards {M} when it went.',
  'Closures at {D}: all of them, which is the whole entry.',
  'It took {M} and left the sign that named it standing.',
  'Cocoa at the lodge is free now, and nobody is stopping for it.',
  'A {F} is at the school gate. School is shut anyway, for snow.',
  'Has anybody got the cat? The desk will wait while you check.',
  'The desk measured a {F} this morning and the tape ran out.',
  'The sled hill is shut and is, the desk notes, no longer a hill.',
  'Added under the school on the closure list: {M}.',
  'The dog from the lift queue is up the hill already, ahead of everyone.',
], [
  // ── BEAT 4 · PANIC ──
  'There goes {M}!! The list is no longer alphabetical.',
  'The register at the top is complete and {R} percent of the valley is not.',
  'It has taken {D}!! Everybody from there is up here, counted.',
  '{S} seconds, and the cocoa is going round the drift.',
  'Is anybody still at {D}? Shout once, then climb.',
  '{P} percent gone!! The desk is still on item one.',
  '{S} seconds!! Franz has taught four beginners to stop, and to run.',
  'What is left is {R} percent, and it is all standing up here.',
  'The lift queue is at the very top now, and it is still a queue.',
  'Mind the drop where {D} used to be, and keep climbing.',
  'It ate {M} and the desk crossed it off before it landed.',
]];

// ── the pools, per tier ────────────────────────────────────────────────────
const GENERAL: [string[], string[], string[]] = [T0_GENERAL, T1_GENERAL, T2_GENERAL];
const BY_DIST: [Record<PwDist, string[]>, Record<PwDist, string[]>, Record<PwDist, string[]>] =
  [T0_BY_DIST, T1_BY_DIST, T2_BY_DIST];

let signedOn = false;
let signedOff = false;   // the desk has said goodnight; it does not come back
/** How many headlines back the ticker remembers. SIX was shallower than a
 *  match is long — qa/newsfeed.mjs caught this world repeating itself inside
 *  one 26-card run — and the pools were too small to hold a deeper memory.
 *  They are not now. */
const RECENT_MAX = 14;
let recent: string[] = [];
/** THE DRONE — the owner's complaint about "the style", stated as a property of
 *  the SEQUENCE rather than of any line: four cards in a row opening on the
 *  same word read as a metronome however good each one is. `recent` cannot see
 *  it, because it holds raw TEMPLATES and a template can begin with a token, so
 *  the opening word has to be taken off the finished line as it goes out. */
const openers: string[] = [];
const opener = (s: string): string => (s.split(/\s+/)[0] || '').replace(/[^A-Za-z']/g, '').toLowerCase();
const droning = (filled: string): boolean => {
  const w = opener(filled);
  return !!w && openers.length >= 2
    && openers[openers.length - 1] === w && openers[openers.length - 2] === w;
};

export function resetPowderNews(): void {
  signedOn = false;
  signedOff = false;
  recent = [];
  openers.length = 0;
}

/** How many distinct lines this world can say, for the census the other
 *  newsrooms report. Counted rather than asserted. */
export function powderNewsCount(): number {
  let n = SIGN_ON.length + MORNING.length + SIGN_OFF.length;
  for (const g of GENERAL) n += g.length;
  for (const d of BY_DIST) for (const k of Object.keys(d)) n += d[k as PwDist].length;
  for (const p of [MEAL_HOUSE, MEAL_CAR, MEAL_BIG, MEAL_SMALL, LIVE]) for (const t of p) n += t.length;
  return n;
}

/** the ticker is one line on a phone. nothing here gets to be a paragraph. */
const TICKER_MAX = 78;
/** {M} lands MID-CLAUSE in most templates, so what arrives has to be a bare
 *  noun phrase: no terminal stop, no comma, nothing after one. Both defects
 *  have shipped from the call site and both were only visible on a rendered
 *  card, so the substitution point defends rather than the pools. */
/** Every headline leaves through here. There were four separate exits before,
 *  each clipping and returning on its own, which is exactly how a memory of
 *  what has just been said ends up missing the sign-on and the morning pool. */
function air(line: string): string {
  const out = clip(line, TICKER_MAX);
  openers.push(opener(out));
  if (openers.length > 4) openers.shift();
  return out;
}

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
    .replace(/\{F\}/g, clip(c.form || 'void', 14))
    .replace(/\{S\}/g, String(Math.max(1, Math.ceil(c.secondsLeft))));
}

/** A countdown line with two and a half minutes left is a weather report,
 *  not an evacuation — same gate all five newsrooms hold on {S}. Applied to
 *  all four pools at the call site, not just the general one. */
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
 *  pick across four pools — the district's own lines, what the guest just ate,
 *  the live templated lines, and the general voice — biased toward the street
 *  the child is standing in, because a bulletin naming the slope you are on is
 *  the whole reason this file is per-district. */
export function pickPowderNews(ctx: PowderCtx, rnd: () => number = Math.random): string {
  if (!signedOn) {
    signedOn = true;
    return air(SIGN_ON[Math.floor(rnd() * SIGN_ON.length)]);
  }
  // PHASE 0. Still the ordinary snow day: no hole, no live state, no tokens.
  if (ctx.morning) {
    const fresh = MORNING.filter((l) => !recent.includes(l));
    let src = fresh.length ? fresh : MORNING;
    // phase 0 is the pool a child meets FIRST in every match, so it is the last
    // place a metronome belongs — same preference the tiered pick applies. The
    // morning lines carry no tokens, so the raw line IS the finished line.
    // …and when NOTHING unsaid opens on a different word, take a line that has
    // already been said over a third card opening the same way. There is only
    // one pool here, so the tiered pick's widen-across-pools has nowhere to go;
    // what it can trade instead is freshness for variety.
    let varied = src.filter((l) => !droning(l));
    if (!varied.length) varied = MORNING.filter((l) => !droning(l));
    if (varied.length) src = varied;
    const line = src[Math.floor(rnd() * src.length) % src.length] ?? MORNING[0];
    recent.push(line);
    if (recent.length > RECENT_MAX) recent.shift();
    return air(line);
  }
  const tier = Math.max(0, Math.min(2, ctx.tier)) as NewsTier;
  // ONCE, AND LAST. Tier 2 can arrive with most of the match still to play,
  // far too soon for "goodnight" — so the goodnight waits until the match is
  // genuinely over the hill, and taking it closes the desk for the night.
  // Same gate the other newsrooms use: a sign-off that fires twice is not an
  // ending.
  if (tier === 2 && !signedOff && ctx.secondsLeft <= 26 && rnd() < 0.45) {
    signedOff = true;
    return air(SIGN_OFF[Math.floor(rnd() * SIGN_OFF.length)]);
  }
  const dist = ctx.district && BY_DIST[tier][ctx.district] ? ctx.district : null;
  // EVERY pool is filtered through usable() now, not only the wide one. The
  // {S} gate used to sit on GENERAL alone, which was correct while GENERAL
  // held the only templated lines; the moment the meal and live pools landed,
  // a "{S} seconds" headline could have gone out with two and a half minutes
  // still on the clock.
  const local = dist ? BY_DIST[tier][dist].filter((h) => usable(h, ctx)) : [];
  const meal = BY_MEAL[mealKind(ctx.lastMeal)][tier].filter((h) => usable(h, ctx));
  const live = LIVE[tier].filter((h) => usable(h, ctx));
  const wide = GENERAL[tier].filter((h) => usable(h, ctx));
  // ~34% district / ~22% what it just ate / ~28% live / ~16% general when we
  // know where the guest is, and meal-and-live-heavy when we do not. The same
  // split the Bugle runs on (newsroom.ts), for the same reason: the paper
  // should mostly be about the thing that just happened to you. The desk's share of that is the closure list.
  const r = rnd();
  const order: string[][] = local.length
    ? (r < 0.34 ? [local, live, wide]
      : r < 0.56 ? [meal, live, wide]
        : r < 0.84 ? [live, wide, local]
          : [wide, local, live])
    : (r < 0.30 ? [meal, live, wide]
      : r < 0.68 ? [live, wide] : [wide, live]);
  // Take the FIRST pool in that order with something unsaid in it. The old
  // code picked a pool and then looked for a fresh line inside it, so a small
  // exhausted pool went straight back to a repeat while three other pools sat
  // there full. Only when every pool is exhausted does a line get said twice.
  let src: string[] = [];
  for (const cand of order) { const f = cand.filter((h) => !recent.includes(h)); if (f.length) { src = f; break; } }
  if (!src.length) for (const cand of order) if (cand.length) { src = cand; break; }
  if (!src.length) src = GENERAL[tier];
  // and among what is left, prefer a line that does not open on the word the
  // last two cards opened on.
  //
  // THIS USED TO SEARCH ONLY THE POOL ALREADY CHOSEN — "a preference, not a
  // rule: if every candidate drones, the pool wins and the card goes out
  // anyway". That is how a guard written to stop a THIRD consecutive repeat
  // let a FOURTH through on SKYLARK FIELD, where qa/newsfeed.mjs caught four
  // cards running that opened "The". The pool it had picked was entirely "The
  // ...", so the filter came back empty and the guard simply gave up while
  // three other pools sat there full of other words.
  //
  // So the fallback widens across every pool at this tier before it accepts a
  // repeat: first something unsaid and non-droning anywhere, then anything
  // non-droning at all. It can only ever REDUCE repetition — every candidate
  // it considers was already eligible to air on this card.
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
