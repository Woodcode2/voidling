// ══════════════════════════════════════════════════════════════════════════════
//  NEWSROOM — MAPLE FALLS, the small town that a void is eating
// ══════════════════════════════════════════════════════════════════════════════
//
//  ┌──────────────────────────────────────────────────────────────────────────┐
//  │  HOUSE STYLE — REWRITTEN. READ THIS BEFORE YOU TOUCH A LINE.             │
//  │  The old rule said "the body is LOWER CASE, always, including the first  │
//  │  word". That rule is DEAD. It made the paper read like a broken robot    │
//  │  and it is the reason the newsfeed was rejected twice. Identical to the  │
//  │  PIRATE BAY newsroom — same game, one voice.                             │
//  ├──────────────────────────────────────────────────────────────────────────┤
//  │  1. WRITE PROPER ENGLISH SENTENCES. Capital letter at the start. Full    │
//  │     stop at the end. Proper nouns capitalised normally — Mayor Dinkle,   │
//  │     Gus, Pearl, Tater, Maple Falls, Pike Hollow. NOT in caps.            │
//  │  2. CAPS IS THE JOKE OR THE PANIC, and nothing else. At most TWO         │
//  │     capitalised words in a line, and most lines have none. {TOKENS} do   │
//  │     not count — the game supplies those in caps.                         │
//  │  3. ONE JOKE PER LINE, and it must land for a SIX-YEAR-OLD: an animal    │
//  │     doing something absurd, a grown-up refusing to admit something       │
//  │     obvious, something enormous described as normal, somebody's lunch    │
//  │     going missing. Not clever. Silly.                                    │
//  │  4. PUNCTUATION ESCALATES WITH THE BEAT. This is how the arc is felt.    │
//  │        BEAT 1 sign-on  — exactly ONE "!", and it lands on the greeting.  │
//  │        BEAT 2 denial   — ZERO "!". The town is completely calm.          │
//  │        BEAT 3 alarm    — at most ONE "!". Cheerfulness under strain.     │
//  │        BEAT 4 panic    — at most ONE "!!" and never a lone "!".          │
//  │        BEAT 4 sign-off — back to at most ONE "!". A calm goodnight.      │
//  │     One "?" per line, max. No "?!", no ellipsis, no em dashes.           │
//  │  5. NO RUNNING GAG OWNS THE FEED. No character and no bit may appear in  │
//  │     more than ~8% of lines. THE PIE JOKES ARE RETIRED — no pies, no pie  │
//  │     contest, no bake sale, ever again. The variety IS the brief: a very   │
//  │     large zucchini, the library's one computer, a sinkhole in the car    │
//  │     park, the second-biggest ball of twine, a dog that opens doors, the  │
//  │     marching band, a raccoon in the vending machine, a trampoline up a   │
//  │     tree, somebody's lunch going missing.                                │
//  └──────────────────────────────────────────────────────────────────────────┘
//
//  THE ARC, in four beats:
//
//  BEAT 1  SIGN-ON   fires FIRST, every match, guaranteed, and ALWAYS opens
//                    "Good morning, Maple Falls!" followed by a real, silly
//                    local news item. Nothing about the void.
//  BEAT 2  DENIAL    tier 0. Ordinary small-town news running alongside a mayor
//                    who insists the void is a puddle.
//  BEAT 3  ALARM     tier 1. Dawning horror, delivered cheerfully. The
//                    evacuation is a FUN WALK. The paper goes to four pages.
//                    Nobody admits anything.
//  BEAT 4  PANIC     tier 2. The town is going and the argument about the
//                    parking meter has not stopped. Then the weather, from a
//                    field.
//
//  THE RULE ABOUT THE VOID. The news covers ONE thing: a void is eating Maple
//  Falls. Nobody in this town has any way of knowing that some *other* void
//  somewhere has a name, a family or a scoreboard, so the paper never mentions
//  one. If a line needs a second void it says "another one", "a second void",
//  "they are multiplying" — never a name. Enforced in code: `bind()` reads no
//  rival field, `fill()` knows no rival token, and `usable()` refuses point
//  blank to air any template containing a token outside {D}{M}{F}{P}{R}{S}.
//
//  RATED 4+. NO real politics of any kind — no election, no voting, no polls,
//  no candidates, no recounts. Mayor Dinkle is funny because he will not admit
//  an obvious void, not because of any office he holds. No alcohol, no money
//  trouble, nothing frightening, nothing mean about how anybody looks, nothing
//  a child would repeat at school and get in trouble for.
//
//  Recurring cast (reuse IS the joke — do not add one-off names):
//    Mayor Dinkle   the void is not real. Later: it is real, but RUDE.
//    Gus            owns the diner. Has an opinion. You did not ask. Here it is.
//    Carla Webb     the Maple Falls Bugle. Circulation 40. Career-defining week.
//    Pearl          grows vegetables the size of furniture. Utterly calm.
//    Tater (9)      thinks the void is great. Names it Steve. Right throughout.
//    Dale           his whole personality is his lawn. The two-inch court case.
//    Marge          nine years protesting one parking meter. Will not be moved.
//    the goat       loose. Always loose. Knows more than anybody else in town.
//    Biscuit        a dog who has learned to open doors. All of the doors.
//    Pike Hollow    the smug rival town over the county line. They got a roundabout.
//
//  Lines render in a one-line phone ticker — aim under ~64 chars, hard cap 78
//  AT WORST-CASE TOKEN FILL (a 14-char form plus a 22-char meal).
// ══════════════════════════════════════════════════════════════════════════════

export type NewsTier = 0 | 1 | 2;
export type MapleDist =
  | 'mainst' | 'fair' | 'school' | 'farm' | 'lake' | 'woods' | 'strip' | 'burb' | 'civic';

export interface MapleCtx {
  tier: NewsTier;
  district: MapleDist | null;   // where the player currently is (null if unknown)
  lastMeal: string;             // e.g. "a mailbox", "a whole HOUSE"
  devouredPct: number;          // 0..100
  form: string;                 // e.g. 'VOIDLING' | 'GOBBLIN' | 'CHOMPOSAURUS'
  secondsLeft: number;
  // ── ACCEPTED AND DELIBERATELY IGNORED ──────────────────────────────────────
  // The call site still hands us the rival scoreboard. The paper has no use for
  // it: nobody in Maple Falls could possibly know that some other void is
  // called anything, so it never goes to print. These two stay declared purely
  // so the existing call site type-checks. `bind()` does not read them. Do not
  // start reading them.
  rivalName?: string;
  rivalLead?: number;
  /** PHASE 0. The town is having an ordinary day and has not noticed anything.
   *  Set by the arc driver (newsroom_arc.ts) for the first couple of cards of
   *  every match; when it is true, `tier` and every live token are ignored and
   *  the paper prints the MORNING pool. See the note on MORNING below. */
  morning?: boolean;
}

/** Per-tier ticker brand. The Bugle escalates. The Bugle has WAITED for this. */
export const MAPLE_BRAND: [string, string, string] = [
  '📰 THE BUGLE',
  '⚠️ BUGLE ALERT',
  '🚨 BUGLE EXTRA',
];

// ── BEAT 1 · SIGN-ON ──────────────────────────────────────────────────────────
// ALWAYS begins "Good morning, Maple Falls!" and then a real, silly, local news
// item — as far as this town is concerned the void has not happened yet. This
// fires FIRST, guaranteed, before any other headline (see `signedOn`).
// No {templates} — the sign-on must never depend on match state.
// Punctuation: exactly one "!", on the greeting. That is the whole allowance.
const SIGN_ON: string[] = [
  'Good morning, Maple Falls! The goat is out and heading for the barber.',
  'Good morning, Maple Falls! Pearl has grown a carrot the size of a chair.',
  'Good morning, Maple Falls! Lost today: one trombone, one mitten, one hat.',
  'Good morning, Maple Falls! Whose trampoline is up the elm on Pine Road?',
  'Good morning, Maple Falls! Gus is out of syrup and will not discuss it.',
  'Good morning, Maple Falls! The town clock is nine minutes fast on purpose.',
  'Good morning, Maple Falls! Is that raccoon still in the snack machine?',
  'Good morning, Maple Falls! Biscuit opened the diner door and took bacon.',
  'Good morning, Maple Falls! Go Otters. They play Friday. They lose Friday.',
  'Good morning, Maple Falls! Dale has been mowing since six. It is Sunday.',
  'Good morning, Maple Falls! The ferris wheel has one car stuck at the top.',
  'Good morning, Maple Falls! Wendell says the shop opens when it opens.',
  'Good morning, Maple Falls! The ball of twine is still the second biggest.',
  'Good morning, Maple Falls! Deb Hollis has news about a mailbox.',
];

// ── BEAT 1b · MORNING ─────────────────────────────────────────────────────────
// THE ORDINARY DAY, and it is the most important pool in the file.
//
// The sign-on says good morning ONCE. Everything after it used to be BEAT 2, in
// which a mayor is already denying a void — so the town went from hello to
// cover-up in a single card and a child never learned what normal looks like.
// Denial is only funny if you have seen the thing being denied AND the ordinary
// day it is interrupting. MORNING is that day: two or three cards of small-town
// nonsense in which the void does not exist, is not hinted at, and is not
// obliquely referenced. That is what every later beat lands against.
//
// RULES, in addition to the house style above:
//   · The void is not mentioned. Not as a hole, a puddle, a drain or a rumour.
//   · No {tokens}. Like the sign-on, morning must not depend on match state —
//     a "3% devoured" number in a bake-sale line breaks the whole conceit.
//   · No greeting. The sign-on already said it; a second good morning reads as
//     the paper starting over.
//   · Mostly ONE sentence. Two is allowed and metered (see qa/newsstyle).
//
// AND NO BAKE SALES. The brief's example line for this pool is "a bake sale",
// which this file bans outright and permanently — rule 5, the retired pie gag.
// The house rule wins: it exists because one bit had eaten the feed once
// already. The list of approved ordinary-day subjects is in that same rule and
// every line below comes off it.
const MORNING: string[] = [
  'The goat is on the school roof. Nobody has established how.',
  'Pearl has grown a marrow that will not fit through her own door.',
  'Dale has measured his lawn and found it two inches too long.',
  'Biscuit opened the library door and let himself in again.',
  'The town clock is nine minutes fast and the council likes it that way.',
  'Pike Hollow got a roundabout. We will not be discussing it further.',
  'Day 3,281 of Marge and the parking meter. Twenty five cents an hour.',
  'The library has one computer and there is a list to use it.',
  'Gus has changed the special. The special is the same as before.',
  'One ferris wheel car has been stuck at the top since Tuesday.',
  'A raccoon has moved into the snack machine at the high school.',
  'The second-biggest ball of twine has been dusted for the season.',
  'Somebody has parked a trampoline up an elm on Pine Road.',
  'Tater, aged nine, has drawn a map of the town. It is better than ours.',
  'The Otters play Friday. The Otters lose Friday. It is a tradition.',
  'Wendell says the hardware shop opens when the hardware shop opens.',
  'Carla Webb has now edited this paper for nineteen years running.',
  'The marching band knows one song and will play it again on Saturday.',
  'Mayor Dinkle has opened a bench. There was a ribbon and everything.',
  'A library book from 1974 has been returned with no note attached.',
  'The corn maze is open. Norm went in during October and stayed.',
  'A trailer of hay tipped on the county road. The horses are delighted.',
  'Deb Hollis reports that her mailbox has moved four feet to the east.',
  'The diner has a new stool and Gus will not say which one it is.',
  'The fair opens at ten. The gate says nine. Trust the fair, not the gate.',
  'Somebody left a casserole dish on the bandstand with no name on it.',
  'The lake is flat, the boats are out, and nobody has caught anything.',
  'Every dog on Elm Street barked at nine and then stopped at once.',
];

/** Ticker-friendly district names, used to fill {D}. Longest is 15 chars. */
const DIST_NAME: Record<MapleDist, string> = {
  mainst: 'Main Street',
  fair: 'the fairgrounds',
  school: 'the high school',
  farm: 'the farms',
  lake: 'the lakeside',
  woods: 'Pine Woods',
  strip: 'the strip',
  burb: 'the suburbs',
  civic: 'the courthouse',
};

type Pools = [string[], string[], string[]];

// ── MAIN STREET ───────────────────────────────────────────────────────────────
// the diner, the barber, town hall, a clock nobody will fix, a dog with a plan
const MAINST: Pools = [[
  // ── BEAT 2 · DENIAL ──
  'Main Street has one stoplight. Nobody has ever complained.',
  'Wendell the barber gives one haircut. He has given it since 1988.',
  'Gus has an opinion about the stoplight. You did not ask for it.',
  'Who has been parking outside the diner all day?',
  'The new bench has a plaque thanking the mayor. Dale built it.',
  'Correction: the diner has eleven stools, not twelve.',
  'Biscuit opened the diner door, took bacon, and left politely.',
  'Quiet on Main Street. One truck went past. Everybody waved.',
  'Lost on Main Street today: one glove, one hubcap, one cone.',
  'The town hall meeting ran four hours. The agenda had one item.',
  'Gus banned a man for life and then served him lunch.',
  'The stoplight stayed yellow for nine seconds on Tuesday. A record.',
  'The goat went into the barber shop and came out looking smart.',
], [
  // ── BEAT 3 · ALARM ──
  'The stoplight still works. There is not much left to stop.',
  'Gus is carrying the diner stools out, one at a time.',
  'Wendell is cutting hair on the pavement. Same haircut, better light.',
  'Half of Main Street has gone and the plaque still thanks the mayor.',
  'Mayor Tuggle is debating an empty chair. The chair was a rival. It got eaten.',
  'The mayor has moved the polling station twice. It keeps not being there.',
  'Tuggle has doubled down: "Under my leadership, some of the town remains."',
  'Everybody out of the diner, please, and bring a stool with you.',
  'Biscuit has opened every door on Main Street and is not finished!',
  'The stoplight is still ours. For now it is still ours.',
  'The bench has gone. The plaque has gone. The mayor is still thanked.',
  'It ate {M} outside the diner. Gus calls that parking.',
  'Town hall says Main Street is a concept. A very sturdy concept.',
], [
  // ── BEAT 4 · PANIC ──
  'The stoplight is the last thing standing. It is green. Go.',
  'Mayor Tuggle is campaigning from the roof of the roofless town hall.',
  'Tuggle concedes nothing. Tuggle has, however, started running.',
  'Polls close at eight. So does everything else, permanently.',
  'Gus took the coffee pot and every one of his opinions with him.',
  'Wendell gave one last haircut. It was the same haircut.',
  'The plaque survived!! It still thanks entirely the wrong man.',
  'Biscuit opened the last door. Nothing behind it. Still a good dog.',
  'Where did Main Street go? Nobody will say. Everybody knows.',
  '{S} seconds left and the stoplight is changing right on time.',
  'Missing from Main Street: the diner, the barber, one good bench.',
  'The goat is standing on the roof of absolutely nothing.',
]];

// ── THE FAIRGROUNDS ───────────────────────────────────────────────────────────
// a stuck ferris wheel car, a prize hog, an unwinnable ring toss, giant veg
const FAIR: Pools = [[
  // ── BEAT 2 · DENIAL ──
  'Car nine is stuck at the top again. Empty, as always.',
  'Who won the ring toss in 1994? Nobody can remember his name.',
  'The prize hog has its own tent and a rosette the size of a plate.',
  'Pearl entered a zucchini that arrived on its own trailer.',
  'The tractor pull was won by a tractor. The other tractors disagree.',
  'Blue ribbons today: one cabbage, one marrow, one very calm goat.',
  'A raccoon is living in the funnel cake stand. Third year running.',
  'Tater, aged nine, has drawn every animal at the fair twice.',
  'The corn dog queue is longer than the fair is wide.',
  'Dale asked for a lawn category. There is no lawn category. Yet.',
  'Correction: the prize hog weighs more than we printed. Much more.',
  'The goat got out of the goat tent and judged the cabbages.',
  'The ring toss booth says everybody wins. Nobody wins.',
], [
  // ── BEAT 3 · ALARM ──
  'Nine cars left on the ferris wheel, and car nine is not moving.',
  'Four adults are carrying the zucchini to a trailer. Slowly.',
  'The prize hog has left the fairgrounds at speed.',
  'Town hall says the fairgrounds are simply more compact now.',
  'The ring toss booth is at an angle. Still unwinnable.',
  'Tater says it likes cinnamon and nobody has proved him wrong.',
  'Gone since noon: {M}, the cabbage tent and the cabbages.',
  'The raccoon has left the funnel cake stand, carrying the funnel!',
  'Carla Webb asked if the fair will go ahead. The fair will go ahead.',
  'Everybody to the car park, calmly, and mind the tent pegs.',
], [
  // ── BEAT 4 · PANIC ──
  'The fairgrounds have gone. Car nine went last. Stuck to the end.',
  'Nobody ever won the ring toss, except that one boy in 1994.',
  'The prize hog reached Pike Hollow. Good luck over there, hog.',
  'The zucchini is safe on the trailer!! The trailer is moving.',
  'Who gets the blue ribbon now? Tater says Steve. Fair is fair.',
  'The corn dog queue is gone. The corn dogs are on the last truck.',
  'The raccoon left on the last truck. It has a corn dog. A legend.',
  'Ferris wheel: one car left, and of course it is car nine.',
  'Pearl is on the trailer with the zucchini, waving, entirely calm.',
]];

// ── THE HIGH SCHOOL ───────────────────────────────────────────────────────────
// the Otters (nought and nine), one trophy from 1978, a band with one song
const SCHOOL: Pools = [[
  // ── BEAT 2 · DENIAL ──
  'The vending machine has a raccoon in it. The raccoon has row C.',
  'The school board has argued about that vending machine for six years.',
  'The Otters are nought and nine and the town could not be prouder.',
  'The marching band knows one song. It is a good song. It is the only one.',
  'The trophy case holds one trophy, from 1978, polished weekly.',
  'Whose lunch is that in the fridge in room nine?',
  'The homecoming float is wider than the school doors. Again.',
  'Coach benched his own nephew. Dinner that night was quiet.',
  'The chemistry teacher also drives the bus and coaches track.',
  'The cheer squad spells MAPLE. There are four of them. Brave work.',
  'Tater is nine and turns up to high school anyway. Nobody minds.',
  'Correction: the field is named after a man. That is all we have.',
  'The senior prank was mowing a shape into the field. Dale was appalled.',
  'Pep rally Friday, then a pep rally about the pep rally.',
], [
  // ── BEAT 3 · ALARM ──
  'The vending machine is empty and the raccoon has moved on.',
  'The school board has approved a new vending machine. Six years!',
  'The Otters are down one end zone. Coach says we play the half we have.',
  'The 1978 trophy left the building in a truck, wrapped in a coat.',
  'The band played the one song louder than it has ever been played.',
  'Pike Hollow has offered to host the game. We are thinking about it.',
  'Room nine is cleared and somebody finally took their lunch home.',
  'The float is finished. It is being driven to the car park instead.',
  'Everybody to the buses, please, and the chemistry teacher is driving.',
  'Tater did show and tell about it and answered every question!',
], [
  // ── BEAT 4 · PANIC ──
  'The Otters finish nought and nine. No field. Still ours.',
  'The vending machine was replaced today!! There is no school.',
  'Where is the 1978 trophy? Safe. Somebody is holding it right now.',
  'The raccoon rode out on the bus. It sat down. It behaved.',
  'Coach has moved practice to the car park. Practice is at four.',
  'The band knows one song and is playing it all the way home.',
  'Missing from the high school: the high school.',
  'Tater has added Steve to the yearbook, under staff.',
  '{S} seconds left. The cheer squad is still spelling MAPLE.',
]];

// ── THE FARMS ─────────────────────────────────────────────────────────────────
// Pearl's enormous vegetables, a corn maze, one committed rooster, loose gates
const FARM: Pools = [[
  // ── BEAT 2 · DENIAL ──
  'The corn maze has a middle. Nobody has checked it since 2011.',
  'Norm is still in the corn maze and sends word that he is fine.',
  'The rooster crows at twenty to five and will not be reasoned with.',
  'The silo is the tallest thing in the county. We mention it daily.',
  'Who left the gate open? The goat. It is always the goat.',
  'Pearl grows the pumpkins, judges the pumpkins, and wins.',
  'Tater has named every chicken on the farm. All forty of them.',
  'The scarecrow has a jacket now. It is doing very well for itself.',
  'A tractor held up the road for twenty minutes and nobody honked.',
  'One barn got painted last year. The other barn is a whole topic.',
  'A cow got out. Four trucks helped. It took a lovely hour.',
  'The corn maze map has been upside down since it was printed.',
  'Pearl says the zucchini is normal sized. Pearl is being modest.',
], [
  // ── BEAT 3 · ALARM ──
  'The corn maze got easier overnight. That is not good news.',
  'Norm walked out of the maze by accident and blinked a lot.',
  'The rooster is keeping to twenty to five and nobody is stopping him.',
  'The county says the silo is fine. The silo is leaning politely.',
  'The cows went into the trucks calmly, the way cows do.',
  'Tater walked the chickens out and named them all over again.',
  'Pearl moved every pumpkin herself before breakfast.',
  'The scarecrow is facing it now. Useless, but very brave.',
  'The goat opened every gate in the county and left them open!',
  'Everybody up the farm road, please, and follow the tractor.',
], [
  // ── BEAT 4 · PANIC ──
  'The silo has gone!! It was the tallest thing we had.',
  'The corn maze is solved. Not by anybody. By removal.',
  'Norm is standing in a field that used to be a maze, quite content.',
  'Every chicken is accounted for. Tater counted twice.',
  'Is Pearl worried? Pearl is never worried. The pumpkins are loaded.',
  'Pike Hollow has the tallest silo in the county now. Unbearable.',
  'The rooster made twenty to five one last time.',
  'The last gate is open. The goat did that on the way past.',
  'Gone: the barns, the maze, and the road that went between them.',
]];

// ── THE LAKESIDE ──────────────────────────────────────────────────────────────
// a record catfish from 1996, a boat ramp grudge, four boats and one canoe
const LAKE: Pools = [[
  // ── BEAT 2 · DENIAL ──
  'A record catfish was landed in 1996 and we have the photo.',
  'A man has fished this pier for thirty years. Total catch: eleven.',
  'The swim dock drifted again. Two families are claiming it.',
  'It is a no wake zone. Everybody wakes. The sign is decorative.',
  'How deep is the lake? Twelve feet. Locals insist it is bottomless.',
  'Tater caught a boot and is telling absolutely everybody.',
  'A duck has taken the swim dock and is not sharing it.',
  'The boat parade had four boats and a canoe. A huge turnout.',
  'Gus says the catfish was smaller than the photo. Gus was not there.',
  'Life jackets are checked at the ramp by a man who enjoys it.',
  'Dale mows down to the waterline and not one inch past it.',
  'Correction: the pier is ninety feet long, not eighty.',
  'Somebody left a picnic on the pier. The gulls have dealt with it.',
], [
  // ── BEAT 3 · ALARM ──
  'The lake is smaller today. The lake association blames the council.',
  'The catfish photo was carried out first, before anybody packed.',
  'The boat ramp is free at last and nobody wants it.',
  'The man on the pier has noticed and is fishing anyway.',
  'Everybody is off the water and up on the grass, which is correct.',
  'The duck has left the swim dock. The duck knows things.',
  'The boot Tater caught is riding out in a bucket, in a truck.',
  'The no wake zone is lifted, because there is no wake left.',
  'The canoe is on the trailer and the trailer is hitched up!',
  'The lake association says the lake is simply concentrating.',
], [
  // ── BEAT 4 · PANIC ──
  'The lake has gone. The lake association would like a word.',
  'Thirty years, eleven fish, and one very good last cast.',
  'The catfish photo is safe!! It is riding in the front seat.',
  'Where did the duck go? Ahead of everybody. Ducks always know.',
  'The swim dock argument is settled. Neither family is happy.',
  'Tater wants his boot back and says he knows where it is.',
  'Pike Hollow still has a lake and will not stop saying so.',
  'Four boats, one canoe, and every one of them out on the road.',
  'The pier man packed up slowly. He waved. He took his time.',
]];

// ── PINE WOODS ────────────────────────────────────────────────────────────────
// the campground, forty laminated rules, and the pine woods something (1981)
const WOODS: Pools = [[
  // ── BEAT 2 · DENIAL ──
  'The pine woods something was seen in 1981. We still talk about it.',
  'The campground host has laminated forty rules. All forty.',
  'Quiet hours start at nine and are enforced with one flashlight.',
  'Somebody left a chair at site nine four years ago.',
  'What is the pine woods something? Gus says a very large raccoon.',
  'The trail map has been wrong since 1990 and we find it charming.',
  'Scout troop twelve earned a badge for arguing. Not a real badge.',
  'One family has held site four every July since 1977.',
  'Dale brought a mower to a campground and mowed a whole campsite.',
  'The campfire ban was lifted, then put back, then lifted.',
  'Carla Webb has covered the something eleven times. No new facts.',
  'A raccoon opened a cooler, took one sandwich, and left the rest.',
  'Rule twenty two is about marshmallows. So is rule twenty three.',
], [
  // ── BEAT 3 · ALARM ──
  'The something has been identified as a {F}. It is round.',
  'Rule forty one went up today. It is about the purple thing.',
  'Quiet hours are suspended for the first time in living memory.',
  'The chair at site nine has not moved and is not going to.',
  'The scouts are building something out of rope. Scouts stay calm.',
  'The trail map is accidentally correct now. Nobody can explain it.',
  'The site four family is holding site four. It is July, after all.',
  'Tater is calling the something Steve and the name has stuck!',
  'A raccoon walked out of the woods with a bag of marshmallows.',
  'Everybody down the fire road, please, and mind the chair.',
], [
  // ── BEAT 4 · PANIC ──
  'The something from 1981 is real. It is round. Tater was right.',
  'The host read all forty one rules aloud to nobody at all.',
  'The chair at site nine survived. Of course it did. That chair.',
  'The site four family left site four. It took an entire void.',
  'Did the scouts finish the rope thing? They did!! It holds.',
  'Quiet hours are permanent now. Very quiet. Almost too quiet.',
  'The trail map is wrong again. Somehow that is a comfort.',
  'Gone: the campground, the fire road, and both marshmallow rules.',
  'Carla Webb got her something story after twelve tries.',
]];

// ── THE STRIP ─────────────────────────────────────────────────────────────────
// petrol station, motel, drive-in, and the world's (second) largest twine ball
const STRIP: Pools = [[
  // ── BEAT 2 · DENIAL ──
  'The motel sign has read VACANC since 1996. Nobody minds.',
  'The ball of twine is the second largest in the world. We say largest.',
  'The drive-in has shown one film for two years. It is a good film.',
  'The gift shop sells small balls of twine, made of twine.',
  'Which room has the good television? Room six. Always room six.',
  'Pike Hollow says theirs is bigger. Nobody has ever seen theirs.',
  'The twine ball camera has two viewers and they are loyal.',
  'The gas station pot has not been emptied since Tuesday.',
  'Tater visits the ball of twine every single week.',
  'Correction: the ball of twine is twine all the way through.',
  'The drive-in snack stand has a teen who never looks up.',
  'Gus refuses to discuss the ball of twine and always has.',
  'A dog has learned to open all eleven motel doors.',
], [
  // ── BEAT 3 · ALARM ──
  'The motel sign now reads VACAN. We are losing letters.',
  'Eleven men have lifted the ball of twine onto a moving truck!',
  'The drive-in is showing the film on half a screen anyway.',
  'Room six has been cleared out. The good television went first.',
  'The gas station pot is empty. That has never happened before.',
  'Pike Hollow offered to look after our twine ball. The answer was no.',
  'The twine ball camera has nine hundred viewers watching a truck.',
  'Tater waved goodbye to the twine ball and then it came back.',
  'Every motel door is open, thanks to that dog.',
  'It ate {M} out of the motel car park. Room six is fine.',
], [
  // ── BEAT 4 · PANIC ──
  'The motel sign reads VAC and is still lit. A proud sign.',
  'The twine ball is safe. The strip is not. The town accepts this.',
  'The film reached the end. Nobody left before it did.',
  'How big is our ball of twine? Second biggest. It always was.',
  'Room six is gone and the good television is in a back seat.',
  'The gas station sign is the last thing lit out here.',
  'Tater is riding up front with the ball of twine!! A perfect day.',
  'Pike Hollow has the only twine ball now. No. Ours is on a truck.',
  'Gone: the motel, the drive-in, and one very slow coffee pot.',
]];

// ── THE SUBURBS ───────────────────────────────────────────────────────────────
// Dale's lawn, two inches of fence, a leaning mailbox, a trampoline up a tree
const BURB: Pools = [[
  // ── BEAT 2 · DENIAL ──
  'Dale put a fence two inches over the line and it went to court.',
  'Year four of the fence case. Two inches. Four whole years.',
  'Dale edges the lawn with a ruler every single day.',
  'How did the trampoline get up the tree? Nobody on the street knows.',
  'The mailbox at 114 leans. It has leaned six years. It is loved.',
  'Sprinklers go on at six. The Dale sprinklers go on at 5:58.',
  'The bins went out a day early and the street noticed.',
  'Tater has a lemonade stand. Another kid set up right beside it.',
  'The cul-de-sac hoop has been argued about since 2019.',
  'Dale reported a neighbour over the placement of leaves.',
  'Carla Webb has written four thousand words on two inches.',
  'Gus lives out here and has never once mowed. Dale has noticed.',
  'Correction: the trampoline is blue, not green. It is still up there.',
  'A dog let himself into four houses and had four dinners.',
], [
  // ── BEAT 3 · ALARM ──
  'Dale is mowing beside it and has not missed a stripe.',
  'The fence case is moot. Dale would like to continue regardless.',
  'The sprinklers came on at six, on time, on principle.',
  'The mailbox at 114 is still leaning, which is oddly reassuring.',
  'The trampoline came down from the tree. So did the tree.',
  'The bins went out on the correct day and nobody noticed!',
  'Half the cul-de-sac has gone and the hoop dispute has not.',
  'A dog is opening doors ahead of the walk, house by house.',
  'Dale withdrew the leaf complaint. Then he filed it again. Twice.',
  'Tater has moved the lemonade stand to the car park. Good spot.',
], [
  // ── BEAT 4 · PANIC ──
  'The fence ruling came in!! Dale won by two inches.',
  'The mailbox at 114 is the last thing standing, and still leaning.',
  'Dale has the last lawn in Maple Falls. It is immaculate.',
  'Whose bins are those at the curb? Nobody knows. Correct day, though.',
  'The hoop dispute is unresolved. It will stay unresolved.',
  'Gus never mowed and Gus was right. Dale will not accept that.',
  'The trampoline landed in the next county, blue side up.',
  'Tater sold the last cup of lemonade and packed up the stand.',
  'Gone: the cul-de-sac, the hedges, and four years of paperwork.',
]];

// ── THE COURTHOUSE ────────────────────────────────────────────────────────────
// the library, one overdue book from 1974, one very slow computer, a sinkhole
const CIVIC: Pools = [[
  // ── BEAT 2 · DENIAL ──
  'Marge has protested the parking meter for nine years. Four people.',
  'The library has one overdue book. It went out in 1974.',
  'The library computer needs twelve minutes to wake up. We wait.',
  'How much is that meter? Twenty five cents. Far too much, says Marge.',
  'The statue outside the courthouse is of a man nobody can name.',
  'There is a sinkhole in the courthouse car park. Unrelated, surely.',
  'The courthouse bell rings at noon, eleven minutes early.',
  'Announcements in this town happen on the courthouse steps.',
  'The county clerk knows everything and says nothing.',
  'Summer reading champion, eleven years running: Tater, aged nine.',
  'Town records go back to 1841. An argument goes back to 1843.',
  'The book club has read one book and discussed it for six years.',
  'The library has a new chair. The old chair has been moved.',
], [
  // ── BEAT 3 · ALARM ──
  'The 1974 book has been returned. After all this time.',
  'The library carried out every book and the whole town helped!',
  'Marge is protesting from a folding chair on the courthouse lawn.',
  'The courthouse steps are down to one step. Announcements continue.',
  'The statue of the man nobody can name is on a truck, sitting down.',
  'The county clerk is still stamping forms, calm as anything.',
  'The sinkhole in the car park and the void have met.',
  'The library computer is starting up. Eleven minutes to go.',
  'Everybody to the courthouse lawn, please, and take a book.',
  'The meter is still taking coins. Marge is still objecting.',
], [
  // ── BEAT 4 · PANIC ──
  'The courthouse has gone!! The fence case will be heard anyway.',
  'Marge and the meter are alone in a field, still protesting.',
  'The book from 1974 is safe. The library is not. Priorities.',
  'Is the meter still standing? It is. Of course it is.',
  'It ate {M}. The clerk filed a form. Then she went home.',
  'The statue went out first. Nobody knows who he was. Nobody minded.',
  'Town records are saved back to 1841. The 1843 argument continues.',
  'Twelve minutes to start up, and it never got the chance.',
  'The bell rang at noon, eleven minutes early, right to the end.',
]];

const BY_DIST: Record<MapleDist, Pools> = {
  mainst: MAINST, fair: FAIR, school: SCHOOL, farm: FARM, lake: LAKE,
  woods: WOODS, strip: STRIP, burb: BURB, civic: CIVIC,
};

// ── GENERAL / TOWN-WIDE ───────────────────────────────────────────────────────
// The arc in miniature. Tier 0 opens on ordinary local news — the paper has not
// connected a single dot — and only then slides into flat denial. Tier 1 is
// dawning horror said with a smile. Tier 2 is the town gone and the argument
// about the parking meter still going.
const GENERAL: Pools = [[
  // ── BEAT 2 · DENIAL. Ordinary town news beside a mayor calling it a puddle. ──
  'Mayor Dinkle says the purple thing in the square is a puddle.',
  'Pearl has entered a pumpkin so big it arrived on a trailer.',
  'Correction: the bench outside the barber shop was never there.',
  'The library computer finished starting up. Nobody was watching.',
  'Gus has lost his sandwich again. He blames the dog. It was the dog.',
  'Missing from the fairgrounds: one bin, one cone, one blue ribbon.',
  'Is that a void on Elm Street, or is it a drainage feature?',
  'The council says the sinkhole in the diner car park is unrelated.',
  'Tater, aged nine, drew a purple circle. His teacher has kept it.',
  'Dale mowed around a void in his lawn and did not mention it.',
  'Marge has been protesting one parking meter for nine years now.',
  'The Otters lost by forty. The marching band played the one song.',
  'A raccoon got into the vending machine and took the whole of row C.',
  'Carla Webb asked the mayor about the purple thing. He talked about corn.',
  'Deb Hollis heard about the void first and has told eleven people.',
  'Biscuit the dog will not go outside today. Biscuit has his reasons.',
  'The water tower still says Maple Falls in paint from 1991.',
  'The goat has stared at the same spot on Main Street all morning.',
  'Quiet. One tractor went past and everybody waved at it.',
  'Pike Hollow got a roundabout and has sent us a photograph of it.',
  'That is a puddle, says Mayor Dinkle, standing right at the edge of it.',
  'Wendell the barber gave the same haircut eleven times on Tuesday.',
  'The 1974 library book is still overdue. We all know who has it.',
  'A bin went missing behind the diner. The council has formed a committee.',
  'Norm went into the corn maze in October and liked it so much he stayed.',
  'Town hall met for four hours about a void and decided to meet again.',
  'The prize hog is named after the mayor. He says it is an honour.',
  'Somebody\'s mailbox has gone from Elm Street. The post still arrives.',
  'Have an ice cream, says the mayor, and stop asking about the void.',
  'Car nine on the ferris wheel is stuck again. It is always car nine.',
], [
  // ── BEAT 3 · ALARM. Dawning horror, delivered cheerfully. One "!" max. ──
  'This is not an evacuation. The mayor is calling it a fun walk.',
  'Pearl is carrying the pumpkin to the truck at a steady jog.',
  'The bandstand has gone and the band is still playing on the grass.',
  'The council put up a sign saying do not feed it. The sign has gone.',
  'Gus closed the diner at noon and opened it again four minutes later.',
  'Missing since lunch: the bandstand, two benches and a whole hedge.',
  'The mayor says there is no hole and please stay away from the void.',
  'Carla Webb asked a second question. The mayor got into his truck.',
  'Everything is fine, says the mayor, now through a megaphone.',
  'The fun walk is now a fun jog. The fun jog has picked up speed.',
  'The twine ball is on a flatbed truck and eleven men are very proud.',
  'Dale mowed right up to the edge of it. The line is beautifully crisp.',
  'Marge has moved the meter protest, and the meter came along too.',
  'Wendell locked the barber shop and took the good chair with him.',
  'It burped and the whole of Main Street smelled of GRAVY.',
  'Deb Hollis has told forty people. The Bugle has a circulation of forty.',
  'The goat left town at dawn. The goat has always known things.',
  'Biscuit opened every door on Elm Street and let everybody out. Good dog!',
  'Correction: that was never a puddle and we should all move now.',
  'The library has evacuated the books. All of them. Even the 1974 one.',
  'Tater says it is called Steve and the whole town is using the name.',
  'Pike Hollow has offered to take us in. Gus said he will think about it.',
  'Is that a second void by the water tower? Yes. Yes it is.',
  'The siren was tested and it played the school fight song. We all sang!',
  'The stuck ferris wheel car has the best view in the county now.',
  'Coach Bunting says we play on. Half the field has gone, Coach.',
  'Norm came out of the maze for lunch and the maze was not there.',
  'The mayor unveiled his plan. The plan is a tarp. A very large tarp.',
  'Everybody to the car park, please, and do bring a casserole.',
  'The rooster crowed at twenty to five with nothing left to crow at.',
], [
  // ── BEAT 4 · PANIC. The town is gone and the meter argument is not. ──
  'The courthouse has gone and the two inch fence case will still be heard.',
  'Fine, it is real, says Mayor Dinkle. He is calling it a drainage issue.',
  'Gus is pouring coffee from a card table in the middle of a field.',
  'Pearl\'s pumpkin is on the truck!! Pearl planned for this in 1998.',
  'Marge is in a field with the parking meter and she is still protesting.',
  'Missing: Main Street, the barber shop, and Wendell\'s good chair.',
  'Tater says Steve is only hungry. Tater has been right the whole time.',
  'The Bugle printed six pages tonight. Carla Webb waited nineteen years.',
  'Dale is mowing a patch of grass the size of a doormat and it looks superb.',
  'The water tower is the last thing standing and it still says Maple Falls.',
  'Who ate the mayor\'s truck? It did. It ate the mayor\'s truck.',
  'The library has gone. The 1974 book is still overdue, by the way.',
  'Every dog in town is out because Biscuit went round and did the doors.',
  'The goat came back for its two best friends and led them out!!',
  'And now the weather: sunny, mild, and over a very large purple void.',
  'The marching band is playing the one song from the back of a truck.',
  'Deb Hollis is telling everybody while running. A true professional.',
  'Half of Elm Street has gone. The leaning mailbox at 114 still leans.',
  'Pike Hollow sent a casserole and a note about their roundabout.',
  'The homecoming float is finished. There is nowhere left to parade it.',
  'Coach Bunting is drawing plays on the ground. There is no ground.',
  'The ferris wheel is down to one car and car nine is still stuck.',
  'The mayor says he never said puddle. He said puddle ELEVEN times.',
  'The rooster is on a fence post crowing at absolutely nothing.',
  'There are THREE of them out by the farms now. We stopped counting.',
  'Sport. The Otters lost. Everything else has gone as well.',
  'The twine ball got out on a truck!! Pike Hollow must never know.',
  'The town clock floated past, still nine minutes fast to the very end.',
  'Gus\'s sandwich was in the fridge the entire time.',
  'Norm is back in a corn maze that is not there. Norm is unbothered.',
]];

// ── BEAT 4 · SIGN-OFF ─────────────────────────────────────────────────────────
// The town is gone and Carla Webb is still reading out the weather. These are
// the *last words* of the arc, so they only go to print once the match is
// genuinely over the hill — see `endgame` in pickMapleNews, which reads
// devouredPct and secondsLeft directly. A forecast at 18% devoured is a lie.
// Punctuation drops back to at most one "!": this is a goodnight, not a panic.
const SIGN_OFF: string[] = [
  'Goodnight, Maple Falls, and sorry about the whole of everything.',
  'And now the weather, from a field, with Carla Webb. It is mild.',
  'The Bugle signs off with a circulation of forty one. One is purple.',
  'Tater waves. Steve waves. The grown ups are still arguing.',
  'Goodnight from the car park. Go Otters! Safe drive home, everybody.',
  'We saved the ball of twine. It is still only the second biggest.',
  'Gus has the coffee pot and Gus says nobody is leaving hungry.',
  'Forecast for tomorrow: sunny, breezy, and no town whatsoever.',
  'The goat is riding up front in the last car out. Goodnight, everybody.',
  'Marge and the parking meter are both in the last truck out.',
];

// ── WHAT IT JUST ATE ──────────────────────────────────────────────────────────
// ctx.lastMeal is free text from the call site. It never says "a boat" or "a
// person" — the game only tags HOUSE and CAR, and sizes everything else — so
// these four buckets are everything the API can actually tell us apart.
// A bite the player just took should be in the paper within seconds of it.
export type MealKind = 'house' | 'car' | 'big' | 'small';

const MEAL_HOUSE: Pools = [[
  // ── BEAT 2 · DENIAL ──
  'It ate {M}. The mailbox at 114 stayed, still leaning.',
  'Gone: {M}, one porch swing and a doorbell.',
  'The mayor says {M} was coming down anyway. It was not.',
  'The doorbell rang once when {M} went down.',
  'Everybody on the street already knows whose house that was.',
], [
  // ── BEAT 3 · ALARM ──
  'How many houses is that now? Somebody counted. Nine.',
  'It ate {M}. The dog got out first. Very good dog!',
  'Dale is still mowing the lawn where {M} used to be.',
  'The house at 114 has gone and its mailbox is still leaning.',
  'Town hall says houses come and go, which is not true.',
], [
  // ── BEAT 4 · PANIC ──
  'It ate {M} and the street it stood on.',
  'The houses have GONE!! The mailbox at 114 has not moved.',
  'No houses left, and Dale is still edging where one was.',
  'Nine before lunch. Then eleven. Then nobody kept count.',
  'There goes {M}. Gus is doing breakfast on a card table.',
]];

const MEAL_CAR: Pools = [[
  // ── BEAT 2 · DENIAL ──
  'It ate {M}. Dale says it was parked wrong anyway.',
  'Whose car was that, and who is going to tell them?',
  'One honk from {M}, and then nothing at all.',
  'Gone from outside the diner: {M} and one bumper sticker.',
  'Nobody parks outside the diner. Four people do it every day.',
], [
  // ── BEAT 3 · ALARM ──
  'Another car gone. Town hall calls that a parking solution.',
  'The radio was still playing when {M} went in.',
  'Marge says fine, it ate a car, now about that meter.',
  'Cars are leaving town in a neat line at a walking pace.',
  'That was {M} and the trailer hitched to the back of it.',
], [
  // ── BEAT 4 · PANIC ──
  'It ate {M}. The alarm is still going somewhere below.',
  'No cars left. The meter is still standing. So is Marge.',
  'That was {M}, and the mayor says it needed a wash anyway.',
  'One gulp, one burp, and {M} was gone!!',
  'The last car out had the twine ball strapped to the roof.',
]];

const MEAL_BIG: Pools = [[
  // ── BEAT 2 · DENIAL ──
  'What was on that corner? Give us a minute. It will come.',
  'It ate {M}. Every cup in the diner wobbled once.',
  'Nobody downtown can say what {M} used to be.',
  'Gone: {M}, which was on the only postcard we had.',
  'Pearl\'s pumpkin arrived on a trailer, as it does every year.',
], [
  // ── BEAT 3 · ALARM ──
  'It ate {M}. It sounded like a bath draining.',
  'Pearl is carrying the prize pumpkin at a jog.',
  'The council says {M} was ugly. It cut the ribbon twice.',
  'Down went {M} and the car park it stood in.',
  'Gone before lunch: the ticket booth, the queue and the sign.',
], [
  // ── BEAT 4 · PANIC ──
  'The water tower has gone!! It said Maple Falls on the side.',
  'It ate {M}. Town hall will rebuild it smaller and cuter.',
  'It took {M} slowly and the rooster stopped crowing.',
  'The last big thing has gone. Pearl\'s pumpkin is on the truck.',
  'The ground went whump and {M} was gone.',
]];

const MEAL_SMALL: Pools = [[
  // ── BEAT 2 · DENIAL ──
  'It ate {M}. One tiny burp. That was the whole event.',
  'A bin is missing and the street has blamed three people.',
  'That was {M}, which had been there since 1988.',
  'Gus put his sandwich down for one minute. It is gone now.',
  'Nobody has noticed that {M} is missing yet.',
], [
  // ── BEAT 3 · ALARM ──
  'Still snacking: bins, mailboxes and somebody\'s left shoe.',
  'It ate {M}, burped, then took the other one as well.',
  'Town hall says {M} is a small thing and we have loads.',
  'It ate the swing set. The swings squeaked all the way down!',
  'A bench, four adults watching, and {M} went anyway.',
], [
  // ── BEAT 4 · PANIC ──
  'It ate the last bin. Whose turn was it to put the bins out?',
  'Down to {M} now, and it is still hoovering.',
  'It did not even want {M}. It took it anyway. Rude.',
  'Somebody found Gus\'s sandwich in the school fridge.',
  'That was {M} from Pike Hollow. Serves them right.',
]];

const BY_MEAL: Record<MealKind, Pools> = {
  house: MEAL_HOUSE, car: MEAL_CAR, big: MEAL_BIG, small: MEAL_SMALL,
};

/** classify ctx.lastMeal into one of the four buckets the API can distinguish. */
export function mapleMealKind(meal: string): MealKind {
  const s = (meal || '').toLowerCase();
  if (s.includes('house') || s.includes('barn') || s.includes('home')) return 'house';
  if (s.includes('car') || s.includes('truck') || s.includes('tractor')) return 'car';
  if (s.includes('building') || s.includes('landmark') || s.includes('big')) return 'big';
  return 'small';
}

// ── LIVE / TEMPLATED ──────────────────────────────────────────────────────────
//  {F} form   {M} last meal   {P} pct   {R} 100-pct   {S} seconds   {D} district
//  Those SIX are the entire vocabulary. There is no rival token and there never
//  will be — `usable()` blocks any template carrying anything else.
//  Never start a line with {D} or {M}: they arrive lower case and a sentence
//  must begin with a capital.
const LIVE: Pools = [[
  // ── BEAT 2 · DENIAL ──
  'The mayor says there is no {F} in {D}.',
  'Mayor Tuggle reminds you the election is Tuesday. Tuggle for Maple Falls.',
  'Mayor Tuggle cut a ribbon in {D}. The ribbon has gone too.',
  'The mayor has not lost {D}. He has MISPLACED it. Vote Tuggle.',
  'Mayor Tuggle asks what {F}. Paid for by Friends of Tuggle.',
  'Tuggle yard signs are free at the diner. Please take two, one may be eaten.',
  'A {F} was seen in {D} and residents waved at it.',
  'It ate {M}. Town hall has scheduled a meeting.',
  'Carla Webb asked about the {F} and was handed a leaflet.',
  'Tater drew the {F} for the science fair and won.',
  'Has anybody seen Gus\'s sandwich? It was on the counter.',
  'Missing since Tuesday: a bandstand, two benches, one hedge.',
  'Pearl\'s prize pumpkin arrived on a trailer, as it does.',
  'Dale mowed right up to the {F} and stopped. A crisp line.',
  'Marge on the {F}: fine, but the meter is still the real issue.',
  '{P}% of the town is gone. The mayor calls that a puddle.',
  'A second void has opened. That is two. Town hall says two is normal.',
  'Biscuit opened the diner door and the {F} came in.',
  'The Bugle put {M} on the front page, under the goat.',
  'The {F} is in {D}. The mayor sees a puddle.',
  'First {M}, and then the hedge next to it.',
  'Tater, aged nine, has named the {F}. It is Steve.',
], [
  // ── BEAT 3 · ALARM ──
  'We are evacuating {D}. It is a fun walk. Bring a casserole.',
  '{P}% gone, {R}% left, and one very long meeting about it.',
  'Where is everybody going? The car park. Bring a chair.',
  'It ate {M}. Somebody owned that. There will be a form.',
  'Pearl has the pumpkin in her arms and is not slowing down.',
  'Town hall calls it the Maple Falls basin. Nice try.',
  'Do not go to {D} today. That is where the {F} is.',
  'Dale mowed beside the {F} and did not miss a stripe.',
  'Marge moved the protest to {D} and took the meter with her.',
  'A raccoon walked past the {F} without changing speed.',
  '{P}% devoured, which the mayor is calling a rounding error.',
  'Gus says he knew {M} would go. He did not.',
  'The Bugle has gone to four pages. Carla Webb is thrilled!',
  'A second void has opened. That makes two of them so far.',
  'Evacuation route: past the diner, left at the goat, keep going.',
  'Carla Webb is in {D}, asking people how they feel.',
  'Biscuit is opening doors ahead of the walk. Good dog.',
], [
  // ── BEAT 4 · PANIC ──
  'Gone. All of {D}, and the meeting starts at four.',
  '{P}% devoured. The other {R}% has formed a committee.',
  'It ate {M}. The mayor blames the other void.',
  '{S} seconds left!! Everyone to the car park. Bring the dog.',
  'The mayor has conceded {D} and kept the ribbon scissors.',
  'Pearl\'s pumpkin is on the truck and the truck is moving.',
  'A {F} now holds {P}% of Maple Falls and has filed no forms.',
  'There are {S} seconds left and Marge is still at the meter.',
  'Carla Webb asked the {F} for a quote. Nothing. Front page.',
  'Is everybody out of {D}? Yes. Biscuit checked every door.',
  'Two of them at {D} now. Two. We are going, thank you.',
  'On the last truck: the twine ball, the goat and Tater.',
  'Down went {M}, and it looked around for more.',
  '{R}% of Maple Falls is left and all of it is arguing.',
  'Only {S} seconds left. Gus is open. Gus is always open.',
  'What is left? A meter, a mailbox and one very calm goat.',
  'Tater waved goodbye to the {F}. It waved something back.',
  'The town clock is floating and it is still nine minutes fast.',
]];

// ══ WHO IS TALKING ═══════════════════════════════════════════════════════════
// Speech bubbles over people's heads — a different medium from the ticker, and
// deliberately left in their own voice. A line should sound like the PERSON,
// not the newspaper. Same house style: proper sentences, capital at the start,
// full stop at the end. Kept SHORT: a phone bubble truncates fast, so aim under
// ~34 characters, hard cap 46. The keys are consumed by life.ts — do not rename
// them. 'politician' is Mayor Dinkle, and he is a man who will not admit to a
// void, NOT a candidate: no elections, no voting, no campaigning.
export const MAPLE_VOICE_AMBIENT: Record<string, string[]> = {
  // the mayor, mayoring, at anyone who holds still for three seconds
  politician: [
    'I am the mayor. Have we met?', 'There is no void. I would know.', 'I cut that ribbon myself.',
    'Lovely dog. Is it licensed?', 'I have a plan for the bandstand.', 'That is a puddle. A dry puddle.',
    'I grew up two streets over.', 'Great question. The answer is no.', 'I fixed that pothole. Me.',
    'Shake my hand. Firm. Good.', 'I will be at the diner at eight.', 'The twine ball put us on the map.',
    'I have never been eaten.', 'Let me finish. LET ME FINISH.', 'I love this town. On the record.',
    'I named that prize hog myself.', 'The clock is fast on purpose.', 'My office is the whole town.',
    'I have looked into it. It is fine.', 'Nobody has told me anything.',
  ],
  // nine years. one parking meter. four people. total commitment.
  protester: [
    'The meter is the real issue.', 'Nine years. Nine. Still here.', 'Honk if you dislike that meter.',
    'Twenty five cents for one hour.', 'We have a petition. Please sign.', 'Nobody asked for that meter.',
    'My sign is laminated. It lasts.', 'We protest in rain or in shine.', 'There are four of us. Four.',
    'The meter is a symbol, you see.', 'I brought the folding chairs.', 'It is day 3,281 of the protest.',
    'Ask me about the meter.', 'We are not going anywhere.', 'The council knows my name.',
    'Coffee break, then back to it.', 'I have a bullhorn. Legally.', 'This is about principle.',
    'The meter started all of this.', 'My husband agrees. Mostly.',
  ],
  // does not gossip. is currently gossiping.
  gossip: [
    'Well. I heard something today.', 'Her cousin heard it first.', 'They are not speaking. Still.',
    'That casserole was store bought.', 'They moved here in 2019. New!', 'I do not gossip. I simply know.',
    'That is not his real lawn.', 'There was a whole incident.', 'Nine people know. Now ten.',
    'The mayor knows. Of course.', 'I have said too much. More?', 'It started at the fair in 1996.',
    'Her sister told my sister.', 'Everybody knows. Even the goat.', 'Ask me again in ten minutes.',
    'I will happily repeat all of it.', 'Somebody took Gus\'s lunch.', 'That zucchini is not natural.',
    'I saw whose truck that was.', 'The raccoon has a whole family.',
  ],
  farmer: [
    'Rain would be nice. Or not.', 'That corn is coming in fine.', 'The rooster starts at twenty to five.',
    'A cow got out again. Tuesday.', 'That silo is county famous.', 'Four generations on this dirt.',
    'The tractor is slow. Road is long.', 'The pumpkins look good this year.', 'The maze has a middle. Maybe.',
    'Town folks do not understand.', 'Up at four, done at nine.', 'The scarecrow has a jacket now.',
    'The fair is the only holiday.', 'That fence has an opinion.', 'Never trust a flat horizon.',
    'My chickens are all named.', 'If it rains, then it rains.', 'That barn needs paint. Next year.',
    'Good dirt. The very best dirt.', 'The goat opened my gate again.',
  ],
  teen: [
    'This town has one stoplight.', 'Nothing happens here. Ever.', 'I am moving to the city soon.',
    'The drive-in has one movie.', 'We lost again. Big shock.', 'My mom knows your mom. Sorry.',
    'Everybody knows everything.', 'The twine ball is not a thing.', 'I work at the gas station. Yay.',
    'Homecoming is a whole ordeal.', 'There is no signal out here.', 'The diner or the parking lot.',
    'My dad coaches. It is a lot.', 'Pike Hollow is worse. Barely.', 'I am in the band. One song.',
    'Six days until I can drive.', 'Yes, my last name is Dinkle.', 'This is the best day all year.',
    'I have a job at the fair. Ugh.', 'A raccoon stole my lunch again.',
  ],
  // the only person in town who has this correctly figured out
  kid: [
    'His name is Steve. I named him.', 'Can we keep him? Please?', 'It ate the mailbox! So cool!',
    'Steve likes funnel cake.', 'Grown ups are being so weird.', 'I drew him. Want to see it?',
    'He is so round. So very round.', 'Nobody believed me. Nobody.', 'I fed him a funnel cake.',
    'He waved. Sort of. He waved.', 'This is the best day ever.', 'I won summer reading again.',
    'My lemonade stand is open.', 'Steve is not scary. He is shy.', 'I named all the chickens too.',
    'Can Steve come to the fair?', 'Steve blinked. I saw it.', 'I am not scared. You are.',
    'Biscuit opened my door again.', 'The raccoon and I are friends.',
  ],
  // Gus energy: refills are free, so are the opinions
  diner: [
    'Coffee is ninety cents. Always.', 'You want my opinion? Here it is.', 'That booth is Marge\'s booth.',
    'No, we do not do sprinkles.', 'Sit anywhere. Not there.', 'Banned him. Still feed him.',
    'I have been here thirty one years.', 'The special is the special.', 'Refills free. Opinions free.',
    'That photo? Catfish. 1996.', 'The mayor sits in the corner.', 'We close when I say we close.',
    'Eggs however you like them.', 'You two. Shake hands. Now.', 'More coffee. Sit back down.',
    'Nobody leaves here hungry.', 'Somebody took my sandwich.', 'That dog let himself in again.',
    'My car park has a sinkhole.', 'Best pancakes in the county.',
  ],
  // relentlessly, unshakeably proud of a town with one stoplight
  booster: [
    'Best little town in the county.', 'Have you seen our twine ball?', 'Go Otters! Nought and nine!',
    'We have a fair. A whole fair.', 'Pike Hollow wishes. They wish.', 'Population 1,412, and growing.',
    'Our gas is two cents cheaper.', 'Sign the guest book, friend.', 'We were in a magazine once.',
    'That silo is the county tallest.', 'Stay for the boat parade.', 'Four boats and a canoe. Huge.',
    'The drive-in is a landmark.', 'Buy a shirt. Support the band.', 'We peaked in 1978. We return.',
    'You should see us in October.', 'Nowhere better. I mean it.', 'That water tower? Painted in 91.',
    'One stoplight. It is a good one.', 'Pearl grew a giant zucchini.',
  ],
};

export const MAPLE_VOICE_PANIC: Record<string, string[]> = {
  politician: [
    'This is NOT my fault!!', 'I never said it was fake!!', 'To the truck!! My truck!!',
    'Save the ribbon scissors!!', 'I was against it all along!!', 'Somebody grab the plaque!!',
    'I will fix this on Monday!!', 'Run, folks!! Everybody run!!', 'I looked into it!! RUN!!',
    'The clock!! Save the clock!!', 'This is a drainage issue!!',
  ],
  protester: [
    'The meter!! Save the meter!!', 'This changes nothing!!', 'Still twenty five cents!!',
    'We protest on the run!!', 'Grab the laminated signs!!', 'Day 3,281 continues!!',
    'Nobody drop that petition!!', 'The meter is still wrong!!', 'Four of us!! Still four!!',
    'I am taking the chairs!!',
  ],
  gossip: [
    'I knew it!! I told everyone!!', 'Wait until they hear this!!', 'I am calling everybody now!!',
    'This is the biggest news ever!!', 'I heard it was the mayor!!', 'Somebody knew!! Somebody knew!!',
    'I am telling EVERYONE!!', 'Run, and talk while you run!!', 'This beats the 1996 fair!!',
    'Ask me later!! I will know!!',
  ],
  farmer: [
    'Get the cows out!! All of them!!', 'Not the silo!! Anything else!!', 'The chickens!! Get a bucket!!',
    'Four generations!! FOUR!!', 'Take the tractor!! It is slow!!', 'The pumpkins!! The good ones!!',
    'I said rain. This is not rain!!', 'That maze had a middle!!', 'Somebody get the rooster!!',
    'Forget the paint!! Go!! GO!!',
  ],
  teen: [
    'Okay, this is actually amazing!!', 'I am filming all of this!!', 'Finally something happened!!',
    'Nobody will believe me!!', 'I told you this town was odd!!', 'Coach!! COACH!! The field!!',
    'I am moving to the city today!!', 'This beats homecoming!!', 'Run!! Check my hair later!!',
    'My mom is going to hear this!!',
  ],
  kid: [
    'Run!! It is a game!! Run!!', 'Go, Steve!! Go!!', 'This is better than the fair!!',
    'Wait for me!! WAIT!!', 'I told you he was real!!', 'Steve is only hungry!! Stop it!!',
    'Again!! Do it again!!', 'Mom, you are so slow!!', 'Can I please bring him home!!',
    'Best field trip ever!!',
  ],
  diner: [
    'We are still open!! Sit down!!', 'Grab the coffee pot!! Go!!', 'Save the catfish photo!!',
    'I said this would happen!!', 'Nobody leaves hungry!! Run!!', 'Take some pancakes!! Go!!',
    'The booth!! Save Marge\'s booth!!', 'Thirty one years!! THIRTY ONE!!', 'Still ninety cents!! Legally!!',
    'Out the back, folks!! Move!!',
  ],
  booster: [
    'The twine ball!! Save it!!', 'We will rebuild!! Bigger!!', 'Pike Hollow cannot know!!',
    'Go Otters!! Even now!! Go!!', 'Get the 1978 trophy!!', 'This is still a great town!!',
    'Take the guest book!! Go!!', 'We were in a magazine!!', 'Best little town!! Still!!',
    'Do not tell the county!!',
  ],
};

// ── selection ─────────────────────────────────────────────────────────────────

/** last ~8 headlines shown, so the ticker never stutters. */
const history: string[] = [];
/** last ~8 raw templates, so one template can't fire twice with new numbers. */
const rawHistory: string[] = [];
const HISTORY = 8;

function remember(raw: string, filled: string): void {
  rawHistory.push(raw); if (rawHistory.length > HISTORY) rawHistory.shift();
  history.push(filled); if (history.length > HISTORY) history.shift();
}

/** THE DRONE — which is the owner's actual complaint about "the style", stated
 *  as a property of the SEQUENCE rather than of any line. Four cards in a row
 *  opening on the same word read as a metronome however good each one is, and
 *  no picker in this game has ever looked at the previous card's first word.
 *  qa/newsfeed.mjs caught it on a seeded run of a world nobody had touched:
 *  "The rulebook…", "The dog…", "The band…", "The smoker…", back to back.
 *  This is a PREFERENCE, not a rule — the re-roll below gives up after its
 *  budget and takes the line anyway — so a thin pool can still repeat an
 *  opener. It just cannot drone while anything else is available. */
const opener = (s: string): string => (s.split(/\s+/)[0] || '').replace(/[^A-Za-z']/g, '').toLowerCase();
function droning(filled: string): boolean {
  const w = opener(filled);
  if (!w || history.length < 2) return false;
  return opener(history[history.length - 1]) === w && opener(history[history.length - 2]) === w;
}

/**
 * false until the Bugle has said good morning. The FIRST pickMapleNews() call
 * of a match always returns the sign-on and nothing else can jump ahead of it —
 * resetMapleNews() puts the paper back to bed, and resetMatch() calls that.
 */
let signedOn = false;
let signedOff = false;   // the station has said goodnight; it does not come back

/** clears the anti-repeat memory — call between matches if you like. */
export function resetMapleNews(): void {
  history.length = 0; rawHistory.length = 0; signedOn = false; signedOff = false;
}

interface Filled { pct: number; rest: number; form: string; meal: string; dist: string; secs: number }

/** the ticker is one line on a phone. nothing gets to be a paragraph. */
const TICKER_MAX = 78;
/** {M} lands MID-CLAUSE in most templates, so what arrives has to be a bare
 *  noun phrase: no terminal stop, no comma, nothing after one. Both have
 *  shipped from the call site and both were only visible on a rendered card —
 *  "It ate a guest. mid-sentence.." and "and a truck, in motion was gone".
 *  The pools cannot defend against this, so the substitution point does. */
const fragment = (s: string): string => (s.split(/[,.;:]/)[0] || s).trim();
const clip = (s: string, n: number): string => {
  if (s.length <= n) return s;
  const cut = s.slice(0, n);
  const sp = cut.lastIndexOf(' ');
  return (sp > n * 0.5 ? cut.slice(0, sp) : cut).trim();
};

function bind(ctx: MapleCtx): Filled {
  // ONE rounded percentage drives both {P} and {R}. Rounding them separately is
  // how a newsroom ends up saying "1% gone, the other 100% is nervous".
  const pct = Math.min(99, Math.max(1, Math.round(ctx.devouredPct || 0)));
  // NOTE: ctx.rivalName / ctx.rivalLead are NOT read here, on purpose. See the
  // note on MapleCtx. Nobody in this town could know another void's name, so
  // the paper has no way to print one.
  return {
    pct,
    rest: 100 - pct,
    form: clip(ctx.form || 'VOIDLING', 14),
    meal: clip(fragment(ctx.lastMeal || 'a mailbox'), 22),
    dist: ctx.district ? DIST_NAME[ctx.district] : 'Maple Falls',
    secs: Math.max(1, Math.ceil(ctx.secondsLeft || 0)),
  };
}

function fill(t: string, b: Filled): string {
  return t
    .replace(/\{D\}/g, b.dist)
    .replace(/\{M\}/g, b.meal)
    .replace(/\{F\}/g, b.form)
    .replace(/\{P\}/g, String(b.pct))
    .replace(/\{R\}/g, String(b.rest))
    .replace(/\{S\}/g, String(b.secs));
}

/** the complete token vocabulary. Anything else is a bug, not a headline. */
const TOKEN = /\{([^}]*)\}/g;
const KNOWN_TOKEN = /^[DMFPRS]$/;
/**
 * THE MECHANISM THAT KEEPS RIVALS OUT OF PRINT. `fill()` can only substitute
 * six tokens, so a stray {L} or {G} would reach the ticker as literal braces.
 * This refuses to print any template carrying a token we cannot fill — so if a
 * rival token is ever pasted back into a pool it silently never fires, rather
 * than printing "{L} leads by {G}" at a seven year old.
 */
function tokensAreKnown(t: string): boolean {
  TOKEN.lastIndex = 0;
  for (let m = TOKEN.exec(t); m; m = TOKEN.exec(t)) {
    if (!KNOWN_TOKEN.test(m[1])) return false;
  }
  return true;
}

/** a countdown line at 2:40 remaining is a weather report, not a panic. */
function usable(t: string, ctx: MapleCtx): boolean {
  if (!tokensAreKnown(t)) return false;
  if (t.includes('{S}') && ctx.secondsLeft > 70) return false;
  return true;
}

const clampTier = (t: number): NewsTier => (t <= 0 ? 0 : t >= 2 ? 2 : 1);

/** Draw from a pool that carries no {tokens} — the sign-on and MORNING. Same
 *  anti-repeat memory as everything else, so "the goat is on the school roof"
 *  cannot open two cards running, and the same hard ticker clip. */
function drawPlain(pool: string[], rnd: () => number): string {
  const fresh = pool.filter((l) => !rawHistory.includes(l));
  let src = fresh.length ? fresh : pool;
  // phase 0 is the pool a child meets FIRST in every match, so it is the last
  // place a metronome belongs — same preference the tiered pick applies.
  //
  // …and when NOTHING unsaid opens on a different word, take a line that has
  // already been said over a third card opening the same way. There is only
  // one pool here, so the tiered pick's widen-across-pools has nowhere to go;
  // what it can trade instead is freshness for variety. A repeated line reads
  // as the station having a short script. Three cards in a row opening on the
  // same word reads as the station being broken, which is the failure
  // qa/newsfeed.mjs measures.
  let varied = src.filter((l) => !droning(l));
  if (!varied.length) varied = pool.filter((l) => !droning(l));
  if (varied.length) src = varied;
  const raw = src[Math.floor(rnd() * src.length) % src.length] ?? pool[0];
  const out = clip(raw, TICKER_MAX);
  remember(raw, out);
  return out;
}

/**
 * One fully-formed headline, ready to drop straight into the ticker.
 *
 * THE ARC. Four beats, and the picker has the signal for all four:
 *   1 SIGN-ON   the first call of every match. Good morning + real local news.
 *   2 DENIAL    tier 0 — ordinary news beside a mayor calling it a puddle.
 *   3 ALARM     tier 1 — dawning horror, cheerfully. The evacuation is a walk.
 *   4 PANIC     tier 2 — the town is gone, the meter argument is not.
 * `tier` is derived at the call site from devouredPct AND the player's form, so
 * a WORLD ENDER never gets a beat-2 line. Beat 1 is ours to guarantee.
 *
 * Weighted ~34% district / ~22% what-it-just-ate / ~28% live / ~16% general
 * when we know where the player is; meal-and-live-heavy when we don't.
 */
export function pickMapleNews(ctx: MapleCtx, rnd: () => number = Math.random): string {
  const tier = clampTier(ctx.tier);
  const b = bind(ctx);

  // BEAT 1. Nothing goes to print before good morning.
  if (!signedOn) {
    signedOn = true;
    const raw0 = SIGN_ON[Math.floor(rnd() * SIGN_ON.length) % SIGN_ON.length] ?? SIGN_ON[0];
    const out0 = clip(raw0, TICKER_MAX);
    remember(raw0, out0);
    return out0;
  }

  // BEAT 1b. Still morning: the ordinary day, no void, no live state.
  if (ctx.morning) return drawPlain(MORNING, rnd);

  const districtPool = ctx.district ? BY_DIST[ctx.district][tier].filter((t) => usable(t, ctx)) : [];
  const mealPool = BY_MEAL[mapleMealKind(ctx.lastMeal)][tier].filter((t) => usable(t, ctx));
  const livePool = LIVE[tier].filter((t) => usable(t, ctx));
  const generalPool = GENERAL[tier].filter((t) => usable(t, ctx));
  // BEAT 4 gate. tier 2 starts as low as 18% devoured, which is far too early
  // for "goodnight, Maple Falls" — so the sign-off waits for the match to be
  // genuinely over the hill.
  const endgame = tier === 2 && (ctx.devouredPct >= 45 || ctx.secondsLeft <= 45);
  // ONCE, AND LAST. The station said "Goodnight" and then kept broadcasting:
  // measured in 60% of matches, with a mean of 2.2 further headlines after the
  // sign-off. The gate opens at 45 seconds left with three headline slots still
  // to run, and a 25% draw could hit it more than once. `signedOn` had a latch
  // and its mirror never existed. Now the sign-off is only reachable in the
  // final stretch, and taking it closes the station for the match.
  const signOffPool = endgame && !signedOff && ctx.secondsLeft <= 26 ? SIGN_OFF : [];

  const chooseRaw = (): string => {
    if (signOffPool.length && rnd() < 0.45) {
      signedOff = true;
      return signOffPool[Math.floor(rnd() * signOffPool.length) % signOffPool.length];
    }
    const r = rnd();
    // graceful fallbacks so an empty bucket never returns undefined to the ticker
    let order: string[][];
    if (districtPool.length) {
      order = r < 0.34 ? [districtPool, livePool, generalPool]
        : r < 0.56 ? [mealPool, livePool, generalPool]
          : r < 0.84 ? [livePool, generalPool, districtPool]
            : [generalPool, districtPool, livePool];
    } else {
      order = r < 0.30 ? [mealPool, livePool, generalPool]
        : r < 0.68 ? [livePool, generalPool] : [generalPool, livePool];
    }
    for (const pool of order) {
      if (pool.length) return pool[Math.floor(rnd() * pool.length) % pool.length];
    }
    return GENERAL[tier][0];
  };

  // re-roll past anything we've said recently — both the template and the
  // finished string, so numbers alone can't disguise a repeat. An overlong
  // fill (a very wordy lastMeal) is treated as a miss and re-rolled too.
  const stale = (r: string, o: string): boolean =>
    rawHistory.includes(r) || history.includes(o) || o.length > TICKER_MAX || droning(o);

  let raw = chooseRaw();
  let out = fill(raw, b);
  for (let i = 0; i < 24 && stale(raw, out); i++) {
    raw = chooseRaw();
    out = fill(raw, b);
  }
  // absolute last resort: never hand the ticker something it can't render
  if (out.length > TICKER_MAX) out = clip(out, TICKER_MAX);

  remember(raw, out);
  return out;
}

/** total distinct lines across every pool — handy for a content sanity check. */
export function mapleLineCount(): number {
  const all: Pools[] = [MAINST, FAIR, SCHOOL, FARM, LAKE, WOODS, STRIP, BURB, CIVIC, GENERAL, LIVE,
    MEAL_HOUSE, MEAL_CAR, MEAL_BIG, MEAL_SMALL];
  return SIGN_ON.length + MORNING.length + SIGN_OFF.length
    + all.reduce((n, p) => n + p[0].length + p[1].length + p[2].length, 0);
}

/** total distinct spoken lines across every voice pool. */
export function mapleVoiceLineCount(): number {
  const sum = (r: Record<string, string[]>): number =>
    Object.values(r).reduce((n, v) => n + v.length, 0);
  return sum(MAPLE_VOICE_AMBIENT) + sum(MAPLE_VOICE_PANIC);
}

/**
 * QA hook. Every raw template in the paper, tagged with the beat it belongs to,
 * so a harness can assert the house style without reaching into module privates.
 * beat 1 = sign-on, 2 = denial (tier 0), 3 = alarm (tier 1), 4 = panic (tier 2),
 * 5 = sign-off.
 */
export function mapleAudit(): { beat: 1 | 2 | 3 | 4 | 5; pool: string; line: string }[] {
  const out: { beat: 1 | 2 | 3 | 4 | 5; pool: string; line: string }[] = [];
  for (const line of SIGN_ON) out.push({ beat: 1, pool: 'SIGN_ON', line });
  for (const line of MORNING) out.push({ beat: 1, pool: 'MORNING', line });
  const pools: [string, Pools][] = [
    ['MAINST', MAINST], ['FAIR', FAIR], ['SCHOOL', SCHOOL], ['FARM', FARM], ['LAKE', LAKE],
    ['WOODS', WOODS], ['STRIP', STRIP], ['BURB', BURB], ['CIVIC', CIVIC],
    ['GENERAL', GENERAL], ['LIVE', LIVE], ['MEAL_HOUSE', MEAL_HOUSE], ['MEAL_CAR', MEAL_CAR],
    ['MEAL_BIG', MEAL_BIG], ['MEAL_SMALL', MEAL_SMALL],
  ];
  for (const [name, p] of pools) {
    for (let t = 0; t < 3; t++) {
      for (const line of p[t]) out.push({ beat: (t + 2) as 2 | 3 | 4, pool: `${name}[${t}]`, line });
    }
  }
  for (const line of SIGN_OFF) out.push({ beat: 5, pool: 'SIGN_OFF', line });
  return out;
}
