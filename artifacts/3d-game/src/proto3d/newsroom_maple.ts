// ══════════════════════════════════════════════════════════════════════════════
//  NEWSROOM — MAPLE FALLS, the small town that a hole is eating
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
//                    local news item. Nothing about the hole.
//  BEAT 2  DENIAL    tier 0. Ordinary small-town news running alongside a mayor
//                    who insists the hole is a puddle.
//  BEAT 3  ALARM     tier 1. Dawning horror, delivered cheerfully. The
//                    evacuation is a FUN WALK. The paper goes to four pages.
//                    Nobody admits anything.
//  BEAT 4  PANIC     tier 2. The town is going and the argument about the
//                    parking meter has not stopped. Then the weather, from a
//                    field.
//
//  THE RULE ABOUT THE HOLE. The news covers ONE thing: a hole is eating Maple
//  Falls. Nobody in this town has any way of knowing that some *other* hole
//  somewhere has a name, a family or a scoreboard, so the paper never mentions
//  one. If a line needs a second hole it says "another one", "a second hole",
//  "they are multiplying" — never a name. Enforced in code: `bind()` reads no
//  rival field, `fill()` knows no rival token, and `usable()` refuses point
//  blank to air any template containing a token outside {D}{M}{F}{P}{R}{S}.
//
//  RATED 4+. NO real politics of any kind — no election, no voting, no polls,
//  no candidates, no recounts. Mayor Dinkle is funny because he will not admit
//  an obvious hole, not because of any office he holds. No alcohol, no money
//  trouble, nothing frightening, nothing mean about how anybody looks, nothing
//  a child would repeat at school and get in trouble for.
//
//  Recurring cast (reuse IS the joke — do not add one-off names):
//    Mayor Dinkle   the hole is not real. Later: it is real, but RUDE.
//    Gus            owns the diner. Has an opinion. You did not ask. Here it is.
//    Carla Webb     the Maple Falls Bugle. Circulation 40. Career-defining week.
//    Pearl          grows vegetables the size of furniture. Utterly calm.
//    Tater (9)      thinks the hole is great. Names it Steve. Right throughout.
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
  form: string;                 // e.g. 'VOIDLING' | 'GOBBLER' | 'DEVOURER'
  secondsLeft: number;
  // ── ACCEPTED AND DELIBERATELY IGNORED ──────────────────────────────────────
  // The call site still hands us the rival scoreboard. The paper has no use for
  // it: nobody in Maple Falls could possibly know that some other hole is
  // called anything, so it never goes to print. These two stay declared purely
  // so the existing call site type-checks. `bind()` does not read them. Do not
  // start reading them.
  rivalName?: string;
  rivalLead?: number;
}

/** Per-tier ticker brand. The Bugle escalates. The Bugle has WAITED for this. */
export const MAPLE_BRAND: [string, string, string] = [
  '📰 THE BUGLE',
  '⚠️ BUGLE ALERT',
  '🚨 BUGLE EXTRA',
];

// ── BEAT 1 · SIGN-ON ──────────────────────────────────────────────────────────
// ALWAYS begins "Good morning, Maple Falls!" and then a real, silly, local news
// item — as far as this town is concerned the hole has not happened yet. This
// fires FIRST, guaranteed, before any other headline (see `signedOn`).
// No {templates} — the sign-on must never depend on match state.
// Punctuation: exactly one "!", on the greeting. That is the whole allowance.
const SIGN_ON: string[] = [
  'Good morning, Maple Falls! A goat is loose on Main Street again.',
  'Good morning, Maple Falls! Pearl has grown a zucchini the size of a dog.',
  'Good morning, Maple Falls! The ball of twine is still second biggest.',
  'Good morning, Maple Falls! Go Otters. Nought and nine, but go Otters.',
  'Good morning, Maple Falls! A raccoon is living in the vending machine.',
  'Good morning, Maple Falls! The library computer has finished starting up.',
  'Good morning, Maple Falls! Somebody\'s trampoline is up a tree again.',
  'Good morning, Maple Falls! The marching band knows one song. Enjoy it.',
  'Good morning, Maple Falls! There is a sinkhole in the diner car park.',
  'Good morning, Maple Falls! Biscuit the dog can open doors now. All doors.',
  'Good morning, Maple Falls! Gus has lost his lunch. Somebody else has it.',
  'Good morning, Maple Falls! The town clock is nine minutes fast. It stays.',
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
  'Gus at the diner has an opinion. You did not ask. Here it comes.',
  'The parking meter protest has reached year nine. Four people. Proud.',
  'The barber gives one haircut. He has given it since 1988.',
  'The town hall clock is nine minutes fast. Nobody is fixing it.',
  'Gus made a sandwich, put it down, and now the sandwich has gone.',
  'Marge has chained herself to the meter, gently, for the photograph.',
  'Dale mowed the grass outside town hall. Nobody asked him to.',
  'Gus banned a man for life. The man ordered lunch. Gus served him.',
  'The town hall agenda has one item on it, and the item is the meter.',
  'There is a new bench downtown. The plaque thanks the mayor. Dale built it.',
  'The goat got into the barber shop. The goat now has a haircut.',
  'Biscuit the dog opened the diner door and served himself bacon.',
  'Somebody parked outside the diner all day and the street is talking.',
], [
  'The mayor says Main Street is fine. Main Street is a concept.',
  'Gus closed the diner, then reopened it. Gus is not leaving.',
  'Marge will not move. The meter is still the real issue here.',
  'Carla Webb has a front page at last, after nineteen quiet years.',
  'The barber shop is down to one chair and a forty minute wait.',
  'The town clock is eleven minutes fast now. It is trying its best.',
  'Dale edged around the hole. A crisp line. Honestly, a crisp line.',
  'The window booth has gone. That was the booth Marge sits in.',
  'The goat is on the roof of the diner. The goat had the right idea!',
  'Biscuit has opened every door on Main Street. Every single one.',
], [
  'The mayor says he never called it fake. He called it RUDE.',
  'Gus is serving coffee off a card table and taking no questions.',
  'The meter survived!! Marge is furious and is still protesting.',
  'Carla Webb filed the story. Circulation is now 41. A huge night.',
  'Town hall has gone. The clock is floating, still eleven fast.',
  'The barber gave one last haircut, and it was the same haircut.',
  'Dale mowed where town hall used to be. Somebody has to, folks.',
  'The goat is fine. The goat was always going to be fine.',
  'Biscuit opened one last door. There was no house behind it.',
]];

// ── THE FAIRGROUNDS ───────────────────────────────────────────────────────────
// a stuck ferris wheel car, a prize hog, an unwinnable ring toss, giant veg
const FAIR: Pools = [[
  'Pearl has entered a zucchini so large it arrived on a trailer.',
  'The prize hog is named after the mayor. He calls it an honour.',
  'The tractor pull was won by a tractor. The other tractors object.',
  'The ferris wheel has eleven cars. One is stuck at the top. Always.',
  'The goat got out of the goat tent again. The goat is undefeated.',
  'Carla Webb covered the vegetable weigh-in like it was the moon landing.',
  'A blue ribbon went to the largest cabbage. It is faintly unsettling.',
  'Tater, aged nine, won the science fair with a drawing of a hole.',
  'The ring toss has been unwinnable since 1994. One boy won once.',
  'Dale entered the lawn category. There is no lawn category. Yet.',
  'The demolition derby is off. Everybody brought the same truck.',
  'A raccoon has been found inside the funnel cake stand. Again.',
  'The corn dog queue is now longer than the actual county fair.',
], [
  'Pearl has evacuated the zucchini. It took four adults and a trailer.',
  'The ferris wheel is down to nine cars. The stuck one is still stuck.',
  'The prize hog has fled. The mayor calls this entirely unrelated.',
  'Town hall says the fairgrounds are being resized on purpose.',
  'The goat has taken charge of the fairground. We are following it.',
  'Tater is feeding it funnel cake and says it prefers cinnamon.',
  'The tractor pull is cancelled. The tractors pulled away. Quickly.',
  'Carla Webb asked if the zucchini is safe. The zucchini is safe.',
  'The stuck ferris wheel car has the best view in the whole county.',
  'The raccoon has left the funnel cake stand. It took the funnel.',
], [
  'The fairgrounds have GONE!! The zucchini is safe on a trailer.',
  'The ferris wheel is down to one car, still stuck at the very top.',
  'The ring toss has gone. Nobody ever won it, except that one boy.',
  'The mayor says we will rebuild the fair, smaller and much cuter.',
  'Tater gave it a blue ribbon. It fits it really rather well.',
  'The prize hog reached Pike Hollow. Good luck anyway, hog.',
  'The zucchini survived. Of course it survived. Look at the thing.',
  'The goat got out and two children went with it. What a goat.',
  'The raccoon left on the last truck, holding a corn dog. A legend.',
]];

// ── THE HIGH SCHOOL ───────────────────────────────────────────────────────────
// the Otters (nought and nine), one trophy from 1978, a band with one song
const SCHOOL: Pools = [[
  'The Otters are nought and nine. The town is fully behind them.',
  'The homecoming float is somehow larger than the school library.',
  'The coach benched his own nephew. Family dinner was very tense.',
  'The marching band knows one song. The town knows it far too well.',
  'The school board argued for three hours about a snack machine.',
  'The trophy case holds one trophy. It is from 1978. It is polished.',
  'Tater is nine and not in high school. Tater attends anyway.',
  'The pep rally was replaced by a pep rally about the pep rally.',
  'The field is named after a man nobody can identify any more.',
  'The chemistry teacher drives the bus, coaches track, and is tired.',
  'A raccoon is living in the vending machine and will not be moved.',
  'The cheer squad spells out MAPLE. There are four of them. Brave.',
  'The senior prank was mowing a shape into the field. Dale was upset.',
  'Somebody\'s lunch has gone missing from the fridge in room nine.',
], [
  'The Otters are nought and nine and down one end zone. Still ours.',
  'The coach says we play through it. Half the field has gone, coach.',
  'The marching band played the one song, louder, and very bravely.',
  'The school board says school is fine. It is a state of mind.',
  'The 1978 trophy has been evacuated by four adults in a truck.',
  'Pike Hollow has offered to host our game. Suspiciously kind.',
  'Tater brought it in for show and tell. It was an enormous hit!',
  'The school board is still arguing about the snack machine. Still.',
  'The homecoming float is finished. There is nowhere to parade it.',
  'The raccoon has left the vending machine, carrying most of row C.',
], [
  'The Otters finish nought and nine. No field. Still nought and nine.',
  'The coach is drawing plays on the ground. There is no ground.',
  'The 1978 trophy is safe. The school is not. Priorities, though.',
  'The marching band played the one song from a car park. An encore!!',
  'The mayor says he never went to that school. He went to that school.',
  'Pike Hollow forfeits out of pity. We do not accept pity, Pike Hollow.',
  'The snack machine was approved at last. There is no snack machine.',
  'Tater has named it Steve. The yearbook lists Steve under teachers.',
  'The goat is on the homecoming float. Best day of that goat\'s life.',
]];

// ── THE FARMS ─────────────────────────────────────────────────────────────────
// Pearl's enormous vegetables, a corn maze, one committed rooster, loose gates
const FARM: Pools = [[
  'Pearl grows the pumpkins, judges the pumpkins, and wins every year.',
  'The corn maze has a middle. Nobody has confirmed this since 2011.',
  'A man has been in the corn maze since October. He is fine. Waving.',
  'The silo is the tallest thing in the county. We mention it a lot.',
  'The rooster crows at twenty to five. The town has given up on it.',
  'One barn was painted last year. The other barn is a conversation.',
  'Tater has named every chicken. One chicken is called Mayor Dinkle.',
  'A tractor blocked the road for twenty minutes. Nobody honked once.',
  'The scarecrow has a jacket now. The scarecrow is doing very well.',
  'A cow got out. Four trucks helped. It took an hour. A lovely hour.',
  'The corn maze map is upside down and has always been upside down.',
  'The goat has learned to open the gate. Every gate. All of them.',
  'Pearl\'s zucchini has been described by the county as normal sized.',
], [
  'The corn maze got easier. That is not good news. That is the hole.',
  'The man in the corn maze walked out by accident after nine months.',
  'Pearl moved every pumpkin herself in one night. She is Pearl.',
  'The county says the silo is fine. The silo is at a slight angle.',
  'The cows were moved calmly. The cows have been calm throughout.',
  'Tater walked the chickens to safety and named them all again.',
  'The scarecrow is facing the hole now. Brave. Useless. Still brave.',
  'The rooster crowed at twenty to five anyway. It has a job to do.',
  'The good side of the pumpkin patch went first. Of course it did.',
  'The goat opened every gate in the county. Best goat we ever had!',
], [
  'The silo has GONE!! It was the tallest thing. We will find another.',
  'The corn maze is solved by removal. We are counting that as solved.',
  'Pearl\'s pumpkins are safe. Her barn is not. Pearl is unbothered.',
  'The scarecrow held the line. The scarecrow did not hold the line.',
  'Every chicken is accounted for. Tater counted twice. He is thorough.',
  'The mayor says he has always supported barns. He actually has.',
  'The cow that got out last spring was RIGHT. The cow knew, folks.',
  'Pike Hollow now has the tallest silo in the county. Unbearable.',
  'The rooster is on a fence post crowing at nothing. Total respect.',
]];

// ── THE LAKESIDE ──────────────────────────────────────────────────────────────
// a record catfish from 1996, a boat ramp grudge, four boats and one canoe
const LAKE: Pools = [[
  'A record catfish was caught in 1996. The photo hangs in the diner.',
  'The boat ramp etiquette dispute has entered its fourteenth summer.',
  'A man has fished this pier daily for thirty years. Total catch: eleven.',
  'The swim dock drifted. Two families claim it. This may go to court.',
  'Gus says the catfish was smaller than the photo. Gus was not there.',
  'Tater caught a boot. Tater is telling absolutely everybody. A boot.',
  'It is a no wake zone. Everybody wakes. The sign is decorative now.',
  'The lake is twelve feet deep. Locals insist that it is bottomless.',
  'Dale mows down to the waterline and not one inch further.',
  'The annual boat parade had four boats and a canoe. A huge turnout.',
  'A duck has taken over the swim dock and will not share it.',
  'The goat swam the lake. Nobody knows why. The goat knows why.',
  'Somebody left a picnic on the pier. The picnic has gone. Gulls.',
], [
  'The lake is smaller. The lake association blames the town council.',
  'The lake association says the lake is concentrating. Good for fish.',
  'The catfish photo was evacuated first, before the people. Correct.',
  'The boat ramp is finally free. Nobody wants it now. Figures.',
  'The man on the pier has noticed, and is still fishing regardless.',
  'Tater threw the boot back in as an offering. Results are unclear.',
  'The disputed swim dock has gone. The dispute continues anyway.',
  'The no wake zone is lifted. There is no wake. There is no water.',
  'The canoe is out. The canoe is always out. A good, steady canoe.',
  'The goat is in the canoe. Nobody is going to argue with the goat!',
], [
  'The lake has gone somewhere. The lake association wants answers.',
  'The pier has gone. The man is still fishing. Do not disturb him.',
  'The catfish photo is SAFE!! It is in a truck. The photo is fine.',
  'The mayor says a lake is really more of a mood. Concede, sir.',
  'The boat ramp dispute was settled by the hole. Nobody is happy.',
  'Tater says the boot is in there somewhere and he wants it back.',
  'Pike Hollow still has a lake and will not stop mentioning it.',
  'The canoe made it out. The canoe always makes it. Classic canoe.',
  'Thirty years of fishing, eleven fish, and one very good last cast.',
]];

// ── PINE WOODS ────────────────────────────────────────────────────────────────
// the campground, forty laminated rules, and the pine woods something (1981)
const WOODS: Pools = [[
  'The pine woods something was sighted in 1981. We still discuss it.',
  'The campground host has laminated the rules. All forty of them.',
  'Quiet hours begin at nine, enforced by one man with a flashlight.',
  'Scout troop twelve earned a badge for arguing. Not a real badge.',
  'One family has held site four every July since 1977. Do not ask.',
  'The trail map has been wrong since 1990. We find it charming now.',
  'Gus says the something is a raccoon. A large and confident raccoon.',
  'Somebody left a chair at site nine. It has been there four years.',
  'Carla Webb has covered the something eleven times. No new facts.',
  'Dale brought a mower to a campground and mowed an entire campsite.',
  'The campfire ban was lifted and then reinstated. It has been a day.',
  'The goat has joined scout troop twelve and earned two badges.',
  'A raccoon opened a cooler, took one sandwich, and left the rest.',
], [
  'The something has been sighted. It is purple. It is very round.',
  'The host has laminated a forty first rule. It is about the hole.',
  'Quiet hours have been suspended for the first time ever. One night.',
  'The site four family will not leave. It is July. They have held it.',
  'The scouts are building something. Nobody knows what. Scouts stay calm.',
  'The campground host says the woods are more open plan now.',
  'Tater has befriended the something and calls the something Steve.',
  'The trail map is now accidentally correct. Nobody can explain it.',
  'The chair at site nine has not moved. The chair will not move.',
  'A raccoon walked out of the woods carrying a bag of marshmallows.',
], [
  'The pine woods something is identified at last. It is Steve. Hello.',
  'The host read all forty one rules aloud to absolutely nobody.',
  'The site four family finally left site four. By force of nature.',
  'The chair at site nine survived. Of course it did. It is that chair.',
  'The mayor says he has camped these woods. One night. For a photo.',
  'The scouts built a raft!! The scouts were right. Very good scouts.',
  'Carla Webb has her something story at last. Twelve tries. Worth it.',
  'Quiet hours are permanently observed now. Very quiet. Too quiet.',
  'The trail map is wrong again. Good. Honestly, that feels correct.',
]];

// ── THE STRIP ─────────────────────────────────────────────────────────────────
// petrol station, motel, drive-in, and the world's (second) largest twine ball
const STRIP: Pools = [[
  'The world\'s largest ball of twine. Second largest. Do not say that.',
  'The twine ball gift shop sells small twine balls, made of twine.',
  'The motel sign reads VACANC. It has read VACANC since 1996.',
  'The drive-in has shown one film for two years. It is a good film.',
  'Pike Hollow claims a bigger twine ball. Pike Hollow is fibbing.',
  'The twine ball has a live camera. Two people watch it every day.',
  'Motel room six has the good television. Everybody asks for room six.',
  'Carla Webb measured the twine ball and will not release the number.',
  'The drive-in snack stand has a teen who never once looks up.',
  'Tater visits the twine ball weekly. Tater loves the twine ball.',
  'The coffee at the gas station has been in that pot since Tuesday.',
  'Gus refuses to acknowledge the twine ball. Gus has his reasons.',
  'A dog has learned to open the motel doors. All eleven of them.',
], [
  'The twine ball has been MOVED. Eleven men. One flatbed. Legendary.',
  'The mayor is guarding the twine ball himself. A stance, at last.',
  'The motel sign now reads VACAN. We are losing letters and land.',
  'The drive-in is playing the film anyway, on half a screen.',
  'Pike Hollow offered to hold our twine ball for safekeeping. No.',
  'Tater waved goodbye to the twine ball. Then it came back. Hero twine!',
  'The twine ball camera has nine hundred viewers. Finally, after ten years.',
  'Room six has been evacuated. The good television went with it.',
  'The gas station has run out of coffee for the first time ever.',
  'A raccoon has been sighted on the twine ball, on the flatbed.',
], [
  'The twine ball is safe. The town is not. The town accepts this.',
  'The motel sign reads VAC and is still lit. A very proud sign.',
  'The drive-in showed the film to the end. Nobody left. Nobody could.',
  'The mayor saved the twine ball. It is on his truck. He did that.',
  'Pike Hollow has the only twine ball now!! No. Ours is on a truck.',
  'Carla Webb released the twine measurement. It was second. We knew.',
  'Tater is riding in the truck with the twine ball. A perfect ending.',
  'The good television from room six is in somebody\'s back seat.',
  'The goat is on the twine ball, on the truck, going down the road.',
]];

// ── THE SUBURBS ───────────────────────────────────────────────────────────────
// Dale's lawn, two inches of fence, a leaning mailbox, a trampoline up a tree
const BURB: Pools = [[
  'Dale put up a fence two inches over the line and it went to court.',
  'The property line case has entered year four. Two inches. Four years.',
  'Dale edges his lawn with an actual ruler, every single day.',
  'The sprinklers come on at six. Dale\'s come on at 5:58. A message.',
  'The mailbox at 114 leans. It has leaned six years. It is beloved.',
  'A trampoline appeared overnight and the street has thoughts.',
  'Dale reported a neighbour for leaf placement. Leaf PLACEMENT.',
  'Carla Webb filed four thousand words on two inches of fence.',
  'Tater is selling lemonade. Another kid has set up right beside him.',
  'The cul-de-sac basketball hoop has been contested since 2019.',
  'Gus lives out here. Gus has never mowed. Dale has noticed.',
  'Somebody put their bins out on the wrong day. The street is talking.',
  'Biscuit the dog let himself into four houses and had four dinners.',
  'A trampoline is up a tree. Nobody will say how it got up there.',
], [
  'Dale mowed right to the edge of the hole. A crisp, immaculate line.',
  'The property line case is moot. Dale wishes to continue regardless.',
  'The sprinklers still run at six, on a hole, on principle, on time.',
  'The leaning mailbox at 114 is still leaning. Inspiring, honestly.',
  'The trampoline in the tree has gone. The tree has gone as well.',
  'Dale has offered to mow the hole. Dale is serious. Dale always is.',
  'The bins went out on the correct day and nobody noticed. Typical!',
  'Biscuit is opening doors for everybody. Biscuit is a hero now.',
  'Somebody knocked on a door with no house behind it for an hour.',
  'The basketball hoop is leaning. The dispute leans with it.',
], [
  'The lawn Dale tended has gone, and the two inches with it.',
  'The leaning mailbox at 114 is the last thing standing. Still leaning.',
  'Dale is mowing a patch the size of a towel. It looks fantastic.',
  'The property line ruling came in!! Dale won it by two inches.',
  'The basketball hoop dispute is unresolved and always will be.',
  'The mayor knocked on the last door. Nobody home. He talked anyway.',
  'Gus never mowed. Gus was RIGHT. Dale will never accept this.',
  'Somebody\'s bins are still at the curb, on the correct day, alone.',
  'Biscuit opened the last door and let everybody out. Good dog!!',
]];

// ── THE COURTHOUSE ────────────────────────────────────────────────────────────
// the library, one overdue book from 1974, one very slow computer, a sinkhole
const CIVIC: Pools = [[
  'The library has one overdue book, out since 1974. We know who has it.',
  'Every announcement in this town happens on the courthouse steps.',
  'The library book club has read one book and discussed it six years.',
  'The county clerk knows everything and says nothing. A total pro.',
  'The courthouse statue is of a man nobody can name. Beloved anyway.',
  'The library computer takes twelve minutes to start. We have adapted.',
  'The summer reading champion, eleven years running, is Tater, aged nine.',
  'Town records go back to 1841. Somebody has argued since 1843.',
  'Marge brought the meter protest to the courthouse. Wrong building.',
  'The courthouse bell rings at noon, eleven minutes early. It is fine.',
  'The goat got into the courthouse and was excused from jury duty.',
  'There is a sinkhole in the courthouse car park. Unrelated, surely.',
  'The library has a new chair. The old chair has been moved. Drama.',
], [
  'The 1974 overdue book has been returned. Under these circumstances?',
  'The library evacuated its books. All of them. The town carried them.',
  'The courthouse steps are now one courthouse step. Announcements go on.',
  'The county clerk is still filing paperwork, calm as a summer lake.',
  'Marge relocated the meter protest. The meter came with her. Wow.',
  'Carla Webb is writing from her chair. Her chair is on a lawn now.',
  'The statue of the man nobody can name has been loaded on a truck.',
  'The library computer is still starting up. Eleven minutes to go.',
  'The goat is in the library. The goat has a library card, somehow.',
  'The car park sinkhole and the hole have met. They get along fine.',
], [
  'The courthouse has GONE!! The two inch case will be heard somehow.',
  'The 1974 book is safe. The library is not. The book, though: safe.',
  'The county clerk filed one last form, stamped it, and went home.',
  'The statue of the man nobody can name was rescued first, of course.',
  'Marge and the meter, alone in a field, still protesting. An icon.',
  'Town records are saved back to 1841. The 1843 argument goes on.',
  'Summer reading: Tater wins again. Twelve years. Still undefeated.',
  'The courthouse bell rang at noon, eleven minutes early, to the end.',
  'The library computer finished starting up. Nobody was there to see.',
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
  // ── an entirely normal week in a very small town ──
  'The Bugle has a circulation of forty. It is the paper of record.',
  'The town motto is: we have a ball of twine. Adopted in 1974.',
  'The meter protest has reached year nine. Four people. Rain or shine.',
  'Gus at the diner has settled the debate. Gus settles all debates.',
  'Pike Hollow got a roundabout. We will never hear the end of it.',
  'Carla Webb says she will ask the hard question. She always does.',
  'The town hall meeting ran four hours and decided nothing at all.',
  'Dale has been mowing since six. It is a Wednesday. It is always six.',
  'Tater, aged nine, drew a purple circle at school. His teacher kept it.',
  'Weather: nice. The small purple dot: also nice, apparently, so far.',
  'The Otters lost again. The town remains fully committed to them.',
  'The goat is loose again. It is the same goat. It is always the goat.',
  'A casserole was delivered to the wrong house. It stayed. Correct.',
  'Population 1,412. The sign says 1,408. That is a four year argument.',
  'The Bugle has gone to two pages this week. A huge news week. Huge.',
  'Lost and found at town hall: nine hats, a trombone, and one mitten.',
  'The water tower says MAPLE FALLS. Repainted in 1991. It holds.',
  'A small purple dot was reported near the water tower. Probably a bug.',
  'The fair opens Friday. The stuck ferris wheel car is still stuck.',
  'A raccoon has moved into the vending machine at the high school.',
  'Pearl has grown a zucchini that four adults describe as normal.',
  'Biscuit the dog can open doors. Nobody taught him. He simply can.',
  'The marching band played its one song by the water tower. Lovely.',
  'Somebody\'s lunch has gone missing at town hall. An inquiry is open.',
  'A trampoline is up a tree on Elm Street. It has been there a week.',
  'The library computer started up at last. Everybody came to look.',
  'There is a sinkhole in the diner car park. It is not the hole.',
  'The barber has raised his price by a dollar, his first rise since 1988.',
  // ── BEAT 2 · DENIAL. There is a hole. The mayor says there is not. ──
  'The mayor says there is no hole. He would know about a hole, folks.',
  'The mayor has never seen the hole. He is standing right beside it.',
  'The hole is not on the town map. The map is from 1974. Checkmate.',
  'Town hall discussed whether the hole is real and decided nothing.',
  'The mayor says it is a puddle. A deep, dry, purple puddle.',
  'Gus says it is a hole. The mayor says it is a drainage feature.',
  'Carla Webb asked about the hole. The mayor talked about the fair.',
  'Tater told the grown ups. The grown ups held a meeting about it.',
  'A hole ate a bin. The council has formed a committee about bins.',
  'The mayor says there is no hole and would like the next question.',
  'The band concert is still on. The hole was not invited. Rude of it.',
  'The goat has stared at the hole all morning. The goat knows.',
  'The car park sinkhole is unrelated, says the council. Twice.',
  'Biscuit will not go outside today. Biscuit has thoughts about it.',
], [
  // ── BEAT 3 · ALARM. Dawning horror, delivered cheerfully. One "!" max. ──
  'The mayor says the hole is a drainage project that is going well.',
  'A sign says do not feed the hole. Tater has already fed the hole.',
  'The town hall meeting spent four hours on the hole. No decision.',
  'Carla Webb asked the mayor a follow-up. The mayor went very quiet.',
  'A committee was formed. The committee formed a subcommittee.',
  'The Bugle has gone to four pages. Carla Webb is having a week.',
  'Marge has another point to make about the meter. Marge, please.',
  'Pike Hollow offered to help. We would rather be eaten, officially.',
  'Gus closed the diner at noon and reopened it at 12:04. Gus is fine.',
  'Pearl is evacuating the zucchini. Calm. On schedule. She is Pearl.',
  'The mayor unveiled a plan. The plan is a tarp. A very large tarp.',
  'Dale has mowed the same lawn three times today. A coping mechanism.',
  'The emergency siren was tested. It plays the school fight song.',
  'The mayor says we are not shrinking. We are getting cosier, folks.',
  'Tater named it. The whole town is using the name now. It is Steve.',
  'The twine ball has been loaded onto a flatbed truck. Priorities.',
  'The band concert was moved, then moved again. The band plays on.',
  'The town consulted an expert. The expert runs the gas station.',
  'The population sign reads 1,408 and is, for the first time, too high.',
  'A four hour meeting was held about holding a meeting. It carried.',
  'This is not an evacuation. This is a fun walk, says the mayor.',
  'There is no hole. Also, please stay well away from the hole.',
  'Oh dear. It ate the bandstand with the band still standing on it.',
  'The town siren went off. It played the fight song. We all sang!',
  'The fun walk is now a fun jog. The fun jog is now a fun SPRINT.',
  'The mayor says he was always against the hole. Write that down.',
  'It burped and the whole street smelled of GRAVY. Every street.',
  'Pearl is carrying the zucchini at a run. Not one single wobble.',
  'Small hole. Medium hole. All right, folks. Run. Everybody run.',
  'The band concert moved indoors. There is no indoors. It moved anyway.',
  'Gus said oh dear. Gus has never said oh dear. Gus said it.',
  'There is a second hole now, out by the water tower. That makes two.',
  'The goat has left town. The goat left first. The goat always knows.',
  'A raccoon ran past carrying an entire vending machine tray.',
  'Biscuit has opened every door on the street. Everybody is out.',
], [
  // ── BEAT 4 · PANIC. The town is gone and the meter argument goes on. ──
  'Fine, it is real, says the mayor. He still calls it a drainage issue.',
  'The Bugle printed a special edition. Six pages. Carla Webb has peaked.',
  'Gus is still serving coffee. Gus will always be serving coffee.',
  'The zucchini Pearl grew is safe. She planned for this in 1998.',
  'Marge is still protesting the meter. The meter is the last thing left.',
  'Tater says Steve is only hungry. Tater has been right all along.',
  'Pike Hollow sent a casserole and is being smug about the casserole.',
  'Dale is mowing a lawn the size of a doormat. It is immaculate.',
  'The town hall meeting was held in a field. Four hours. No decision.',
  'The twine ball is on a truck out of town. We saved what mattered.',
  'The mayor blames the last mayor. He was the last mayor. It was him.',
  'The population sign has been eaten. Final count: everyone, in a field.',
  'The emergency siren played the fight song!! We all sang. All of us.',
  'The mayor cut a ribbon on nothing at all. The man is unbreakable.',
  'Carla Webb has one more question, mayor. She gets the last question.',
  'The town has gone. The argument about the meter continues. It does.',
  'The Bugle now has 41 subscribers. The new one is purple and hungry.',
  'The water tower is the last word standing. It says MAPLE FALLS.',
  'The mayor says he never said puddle. He said pond. He said puddle.',
  'It ate town hall, the clock, and the ladder. The man got down first.',
  'Something burped and it smelled of the entire diner. All of it.',
  'The mayor asked who ate his truck. It did, sir. It ate the truck.',
  'Another hole has opened by the water tower. They are MULTIPLYING.',
  'There are three of them now. Three. We have stopped counting.',
  'The goat came back for its two best friends. What a goat!!',
  'Biscuit opened every door in town and every dog got out. Good dog.',
  'The raccoon left with the vending machine. It earned that machine.',
  'The marching band is playing the one song from the back of a truck.',
  'Somebody found Gus\'s lunch. It was in the fridge the whole time.',
]];

// ── BEAT 4 · SIGN-OFF ─────────────────────────────────────────────────────────
// The town is gone and Carla Webb is still reading out the weather. These are
// the *last words* of the arc, so they only go to print once the match is
// genuinely over the hill — see `endgame` in pickMapleNews, which reads
// devouredPct and secondsLeft directly. A forecast at 18% devoured is a lie.
// Punctuation drops back to at most one "!": this is a goodnight, not a panic.
const SIGN_OFF: string[] = [
  'Carla Webb reads the weather. The town has gone. Weather: mild.',
  'The forecast tomorrow: sunny, breezy, no town at all. Still sunny.',
  'The town has gone. The vegetable results are still being disputed.',
  'The Bugle says goodnight, Maple Falls. Sorry about the everything.',
  'Tater waves. Steve waves. The grown ups are still arguing. Classic.',
  'And now the weather, from a field, with Carla Webb. It is nice out.',
  'Goodnight, Maple Falls. The band concert is still on for Tuesday.',
  'The Bugle signs off. Circulation 41. One of them is purple.',
  'Goodnight from a car park. Go Otters. And good luck, everybody.',
  'The goat is in the last car out of town, riding up front. Goodnight.',
];

// ── WHAT IT JUST ATE ──────────────────────────────────────────────────────────
// ctx.lastMeal is free text from the call site. It never says "a boat" or "a
// person" — the game only tags HOUSE and CAR, and sizes everything else — so
// these four buckets are everything the API can actually tell us apart.
// A bite the player just took should be in the paper within seconds of it.
export type MealKind = 'house' | 'car' | 'big' | 'small';

const MEAL_HOUSE: Pools = [[
  'A house has gone. The mailbox stayed. The mailbox is doing fine.',
  'A whole HOUSE. The council will discuss this for four hours.',
  'A house went down in one bite. The doorbell rang once. Sad, that.',
  'The mayor says that house was condemned. It was not condemned.',
], [
  'Another house. Somebody asked how many. The answer is nine.',
  'A house went in whole. The dog got out. Good dog. Very good dog!',
  'Dale mowed the lawn of a house that is not there. A crisp line.',
  'Town hall says houses come and houses go. They do not, sir.',
], [
  'Every house on the street is eaten. Dale is still edging. Still.',
  'The last house went in sideways and burped. The burp was worse.',
  'The houses have GONE!! The leaning mailbox at 114 is still up.',
  'The council always supported houses. There are no houses now.',
]];

const MEAL_CAR: Pools = [[
  'A parked car has gone. It was parked wrong anyway, says Dale.',
  'A car went in honking. The honking got quiet very fast indeed.',
  'Somebody\'s car has gone. The street already knows whose it was.',
  'A car. One gulp. One small burp. The town says nothing yet.',
], [
  'Another car eaten. Town hall is calling it a parking solution.',
  'A car went down with the radio on. We could hear it, faintly.',
  'Marge says fine, it ate a car, now about that meter. Year nine.',
  'Cars are being eaten. Dale says they were parked wrong anyway.',
], [
  'The last car is eaten. Its alarm is still going, underground.',
  'The truck the mayor drives has gone, with his face on the bumper.',
  'No cars are left. The parking meter remains. Marge is FURIOUS.',
  'A car went in and the horn honked for nine whole seconds!! Nine.',
]];

const MEAL_BIG: Pools = [[
  'A whole building has gone. The ground went whump. We all felt it.',
  'Something enormous is missing downtown. Nobody can say which one.',
  'A landmark has gone. It was on the postcard. The one postcard.',
  'That one was big. The cups in the diner all did a little wobble.',
], [
  'A building went down whole. It sounded like a bath draining.',
  'That building was ugly, says the council. It cut the ribbon twice.',
  'A whole building has gone. The entire thing. Every brick of it.',
  'Oh dear. That was the big one on the corner with the clock on it.',
], [
  'The last big thing went in slowly. Very slowly. We all watched.',
  'Town hall will rebuild it smaller, cuter and much sooner.',
  'The water tower went in last!! It said MAPLE FALLS on the way down.',
  'That bite was so big the rooster stopped. The rooster never stops.',
]];

const MEAL_SMALL: Pools = [[
  'It ate a mailbox. One mailbox. One tiny burp. Rather adorable.',
  'A bin is missing. The street has already blamed three people.',
  'It ate a garden gnome. That gnome had been there since 1988.',
  'A small snack was taken on Elm Street. The council does not know.',
], [
  'Still snacking. Bins, mailboxes, and somebody\'s good left shoe.',
  'It ate a bin, burped, then took the OTHER bin. Greedy. So greedy.',
  'Town hall says it only ate a small thing and we have loads. Nine.',
  'It ate the swing set. The swings squeaked all the way down. Eek!',
], [
  'Nothing big is left. It is eating crumbs now. Very loud crumbs.',
  'It ate the last bin. It did not even WANT the last bin. Rude.',
  'Down to gnomes and letterboxes. It is HOOVERING the county.',
  'The last snack was a casserole from Pike Hollow. Serves them.',
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
  'The mayor says there is no {F} in {D}. There is.',
  'A {F} was sighted in {D}. Residents waved back at it.',
  'It ate {M}. Town hall calls this a scheduling matter.',
  'Carla Webb asked about the {F} in {D}. He walked away.',
  'Tater fed the {F}. Tater says it prefers {M}.',
  'Residents were asked if the purple thing is bigger. {P}% said yes.',
  'Gus on the {F}: it needs a haircut, and that is his opinion.',
  'A second hole has opened. That is two holes now. Two of them.',
  'The mayor cut a ribbon in {D}. The ribbon has gone now.',
  'Pearl asked if the {F} could enter the vegetable contest. Denied.',
  'A {F} in {D}. Town hall has scheduled a long meeting.',
  'Bugle front page: {M}, gone? Note the question mark.',
  'Dale offered to mow around the {F}. Dale is not joking, ever.',
  'Marge says fine, a {F}, but can we discuss the meter.',
  'The mayor says he has never seen a {F}. He is looking at one.',
  'It ate {M}. Nobody saw a thing. Everybody saw it happen.',
  'Biscuit opened a door and a {F} came in. Biscuit is sorry.',
], [
  'Town hall says it is a small {F}. It is {P}% of the town.',
  'We are evacuating {D}. Politely. With casseroles. In one line.',
  'It ate {M}. Somebody owned that. There will be a meeting.',
  '{P}% of Maple Falls has gone. Town hall calls it a rounding error.',
  'Do not go to {D}. That is exactly where the {F} is.',
  'Tater named the {F}. Everybody uses the name now. It is Steve.',
  'Carla Webb is in {D} asking how people feel. They feel terrible.',
  'It ate {M}. Gus says he knew this would happen. He did not.',
  'Town hall has renamed the {F} the Maple Falls basin. Nice try.',
  'Pearl has moved the zucchini out of {D}. That is leadership.',
  '{P}% devoured. The other {R}% is at a meeting about it.',
  'Pike Hollow asked how {D} is going. They know how it is going.',
  'Dale mowed the edge of the {F}. The line is CRISP.',
  'The mayor says {P}% is a very Dinkle-friendly number. It is not.',
  'Marge has moved the protest to {D}. The meter came with her.',
  'A second {F} has been reported. That makes two of them now.',
  'A raccoon met the {F} and was entirely unbothered by it.',
], [
  'It has eaten {D}!! A four hour meeting has been scheduled.',
  '{P}% has been DEVOURED. The other {R}% has formed a committee.',
  'The {F} ate {M}. The mayor blames the last one.',
  'There are {S} seconds left!! Everyone to the car park. Bring food.',
  'A {F} now holds {P}% of Maple Falls. It filed no paperwork at all.',
  'There are {S} seconds left and Marge is still protesting the meter.',
  'The {F} ate {M}. Tater said it was hungry.',
  'Carla Webb asked the {F} for a quote. It said nothing at all.',
  'The mayor has conceded {D}. He is keeping the ribbon scissors.',
  'There are {S} seconds left. Gus is open. Gus is always open.',
  'Pearl saved the zucchini. The {F} got {M}.',
  '{P}% gone. That is {R}% of a town still arguing about a meter.',
  'The {F} ate {M}. Pike Hollow sent a casserole.',
  'Dale mowed the last lawn in {D}. Crisp to the very end.',
  'Only {S} seconds left!! The twine ball is on the truck. Go now.',
  'The {F} ate {M}. Judging goes ahead anyway.',
  'There are two of them at {D} now. Two. We are leaving.',
  'Biscuit has opened every door in {D}. Everybody is out. Good dog.',
]];

// ══ WHO IS TALKING ═══════════════════════════════════════════════════════════
// Speech bubbles over people's heads — a different medium from the ticker, and
// deliberately left in their own voice. A line should sound like the PERSON,
// not the newspaper. Same house style: proper sentences, capital at the start,
// full stop at the end. Kept SHORT: a phone bubble truncates fast, so aim under
// ~34 characters, hard cap 46. The keys are consumed by life.ts — do not rename
// them. 'politician' is Mayor Dinkle, and he is a man who will not admit to a
// hole, NOT a candidate: no elections, no voting, no campaigning.
export const MAPLE_VOICE_AMBIENT: Record<string, string[]> = {
  // the mayor, mayoring, at anyone who holds still for three seconds
  politician: [
    'I am the mayor. Have we met?', 'There is no hole. I would know.', 'I cut that ribbon myself.',
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
  // note on MapleCtx. Nobody in this town could know another hole's name, so
  // the paper has no way to print one.
  return {
    pct,
    rest: 100 - pct,
    form: clip(ctx.form || 'VOIDLING', 14),
    meal: clip(ctx.lastMeal || 'a mailbox', 22),
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
    rawHistory.includes(r) || history.includes(o) || o.length > TICKER_MAX;

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
  return SIGN_ON.length + SIGN_OFF.length
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
