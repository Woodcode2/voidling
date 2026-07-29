// ══════════════════════════════════════════════════════════════════════════════
//  NEWSROOM — MAPLE FALLS, the small town that a hole is eating
// ══════════════════════════════════════════════════════════════════════════════
//
//  ┌──────────────────────────────────────────────────────────────────────────┐
//  │  HOUSE STYLE. ONE RULE. EVERY LINE OBEYS IT. NO EXCEPTIONS.              │
//  │  Identical to the PIRATE BAY newsroom — same game, one voice.            │
//  ├──────────────────────────────────────────────────────────────────────────┤
//  │  1. THE BODY IS LOWER CASE. Always — including the first word of the     │
//  │     line. The ticker is a voice, not a headline.                         │
//  │  2. ALL CAPS IS THE JOKE OR THE PANIC. Never more than TWO capitalised   │
//  │     words in a line, and most lines have none. Caps is the punchline     │
//  │     landing, so if everything is capitalised nothing is.                 │
//  │  3. A NAME IS CAPS. The recurring cast are always capitalised —          │
//  │     MAYOR DINKLE, GUS, PEARL, TATER — as is MAPLE FALLS itself and the   │
//  │     BUGLE and the OTTERS. Cast names do NOT count against the two-word   │
//  │     caps budget. Everything else — streets, districts, the fairgrounds,  │
//  │     the twine ball — is lower case. The hole's pet name is written like  │
//  │     an ordinary name (Steve), because it is affectionate, not a          │
//  │     masthead.                                                            │
//  │  4. PUNCTUATION ESCALATES WITH THE BEAT. This is how the arc is *felt*   │
//  │     rather than merely described:                                        │
//  │        BEAT 1 sign-on  — exactly ONE "!", and it lands on the greeting.  │
//  │        BEAT 2 denial   — ZERO "!". the town is completely calm.          │
//  │        BEAT 3 alarm    — at most ONE "!". cheerfulness under strain.     │
//  │        BEAT 4 panic    — at most ONE "!!" and never a lone "!".          │
//  │        BEAT 4 sign-off — back to at most ONE "!". calm goodbye.          │
//  │     One "?" per line, max. No "?!", no "…", no em dashes, no ALL-CAPS    │
//  │     SENTENCES. Full stops do the work.                                   │
//  └──────────────────────────────────────────────────────────────────────────┘
//
//  THE ARC, in four beats:
//
//  BEAT 1  SIGN-ON   fires FIRST, every match, guaranteed. A good morning and a
//                    REAL local news item — the diner has pie, the goat is out
//                    again, the bake sale is saturday. Nothing about the hole.
//  BEAT 2  DENIAL    tier 0. Nobody connects the dots. Ordinary small-town news
//                    running alongside a mayor who says the hole is a puddle.
//  BEAT 3  ALARM     tier 1. Dawning horror, delivered cheerfully. The
//                    evacuation is a FUN WALK. The paper goes to four pages.
//                    Nobody admits anything.
//  BEAT 4  PANIC     tier 2. The town is gone and the argument about the
//                    parking meter has not stopped. Then CARLA WEBB reads the
//                    weather from a field.
//
//  THE RULE ABOUT THE HOLE. The news covers ONE thing: a hole is eating Maple
//  Falls. Nobody in this town has any way of knowing that some *other* hole
//  somewhere has a name, a family or a scoreboard, so the paper never mentions
//  one. If a line needs a second hole it says "another one", "a second hole",
//  "they are multiplying" — never a name. Enforced in code: `bind()` reads no
//  rival field, `fill()` knows no rival token, and `usable()` refuses point
//  blank to air any template containing a token outside {D}{M}{F}{P}{R}{S}.
//
//  THE ELECTION IS ONE RUNNING GAG, NOT THE SPINE. It sits alongside the pie
//  contest, the ball of twine, the OTTERS, the fair, the parking meter and the
//  loose goat, and it never leads more than one sign-on in eight. There are
//  exactly TWO candidates and there will only ever be two.
//
//  Recurring cast (reuse IS the joke — do not add one-off names):
//    MAYOR DINKLE   incumbent. the hole is not real. later: it is real, but RUDE.
//    DEB HOLLIS     the challenger. one policy: she is not MAYOR DINKLE.
//    GUS            owns the diner. has an opinion. you did not ask. here it is.
//    CARLA WEBB     the MAPLE FALLS BUGLE. circulation 40. career-defining week.
//    PEARL          runs the pie contest. judges the pie contest. wins it. 11 yrs.
//    TATER (9)      thinks the hole is great. names it Steve. is right throughout.
//    DALE           his whole personality is his lawn. the two-inch court case.
//    MARGE          nine years protesting one parking meter. will not be deterred.
//    THE GOAT       loose. always loose. knows more than anybody else in town.
//    PIKE HOLLOW    the smug rival town over the county line. they got a roundabout.
//
//  Register: warm, silly, small-town self-importance. Ages 6-11. Concrete nouns,
//  short sentences, silly over clever. NO real politics, no parties, no policy,
//  no menace, nobody gets hurt. The joke is that a town this small can have this
//  many feuds — never politics itself.
//  Lines render in a one-line phone ticker — aim under ~62 chars, hard cap 78.
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
// Good morning, and here is a REAL piece of local news. Not a joke about the
// hole — as far as this town is concerned the hole has not happened yet. This
// fires FIRST, guaranteed, before any other headline (see `signedOn`).
// No {templates} — the sign-on must never depend on match state.
// ONE of the eight leads on the election. Exactly one. The other seven lead on
// pie, the twine ball, the OTTERS, the fair, the library and a loose goat,
// which is what this town is actually about.
// Punctuation: exactly one "!", on the greeting. That is the whole allowance.
const SIGN_ON: string[] = [
  'GOOD MORNING, MAPLE FALLS! the diner has pie today. that is the news.',
  'GOOD MORNING! population 1,412, and all of them are already awake.',
  'GOOD MORNING, MAPLE FALLS! the ball of twine is still second biggest.',
  'GOOD MORNING! go OTTERS. nought and nine so far, but still. go OTTERS.',
  'GOOD MORNING! bake sale saturday at the church hall. bring a plate.',
  'GOOD MORNING, MAPLE FALLS! the fair is open and a goat is loose again.',
  'GOOD MORNING! the library has a new chair. it is a very good chair.',
  'GOOD MORNING, MAPLE FALLS! the election is tuesday. do not forget.',
];

/** Ticker-friendly district names, used to fill {D}. Lower case — see rule 3. */
const DIST_NAME: Record<MapleDist, string> = {
  mainst: 'main street',
  fair: 'the fairgrounds',
  school: 'the high school',
  farm: 'the farms',
  lake: 'the lakeside',
  woods: 'pine woods',
  strip: 'the strip',
  burb: 'the suburbs',
  civic: 'the courthouse',
};

type Pools = [string[], string[], string[]];

// ── MAIN STREET ───────────────────────────────────────────────────────────────
// town hall, the diner GUS runs, the barber, and MARGE's nine-year meter vigil
const MAINST: Pools = [[
  'GUS at the diner: "you want my opinion? here it comes anyway."',
  'the parking meter protest has entered year nine. four people. proud.',
  'the barber gives one haircut. he has given it since 1988.',
  'the town hall clock is nine minutes fast. it was voted on. it stays.',
  'the BUGLE has a circulation of 40. all forty of them read it.',
  'diner coffee is still 90 cents. the sign says so. LEGALLY.',
  'MARGE has chained herself to the meter. gently. for the photo.',
  'DALE mowed the grass outside town hall. nobody asked him to.',
  'GUS banned a man for life. the man ordered lunch. GUS served him.',
  'town hall agenda, item 1 of 1: the meter. it is always the meter.',
  'the barber has opinions about the meter. STRONG barber opinions.',
  'a new bench downtown. the plaque credits MAYOR DINKLE. DALE built it.',
  'CARLA WEBB has covered eleven town hall meetings. not one vote.',
  'the goat got into the barber shop. the goat now has a haircut.',
  'MAYOR DINKLE cut a ribbon on the ribbon shop. the third time.',
  'somebody parked in front of the diner all day. the street is talking.',
], [
  'MAYOR DINKLE: "main street is FINE. main street is a CONCEPT."',
  'GUS closed the diner. GUS reopened the diner. GUS is not leaving.',
  'MARGE will not move. the meter is still the real issue. STILL.',
  'CARLA WEBB has a front page at last. she has waited nineteen years.',
  'the barber shop is down to one chair. still a forty minute wait.',
  'the town hall clock is now eleven minutes fast. nobody has fixed it.',
  'DALE edged around the hole. a crisp line. honestly, a crisp line.',
  'the press conference was held in a shrinking car park. undeterred.',
  'the booth by the window has gone. that was the booth MARGE sits in.',
  'the goat is on the roof of the diner. the goat has the right idea!',
  'DEB HOLLIS: "the hole downtown is DINKLE-shaped." bold. effective.',
], [
  'MAYOR DINKLE: "I never said it was fake. I said it was RUDE."',
  'GUS is serving coffee off a card table. 90 cents. still LEGALLY.',
  'the meter survived!! MARGE is furious. MARGE keeps protesting.',
  'CARLA WEBB filed the story. circulation is now 41. a huge night.',
  'town hall has gone. the clock is still floating. still eleven fast.',
  'the barber gave one last haircut. it was the same haircut.',
  'DALE mowed where town hall used to be. somebody has to, folks.',
  'four people are still protesting a meter in an empty lot. legends.',
  'the goat is fine. the goat was ALWAYS going to be fine.',
  'DEB HOLLIS won. DEB HOLLIS is now the mayor of a hole. well done.',
]];

// ── THE FAIRGROUNDS ───────────────────────────────────────────────────────────
// PEARL's eleven-year pie dynasty, the prize hog, and a permanently stuck wheel
const FAIR: Pools = [[
  'PEARL won the pie contest. PEARL also judges the pie contest.',
  'the pie contest has been disputed eleven years running. eleven.',
  'the prize hog is named after MAYOR DINKLE. he calls it an honour.',
  'the tractor pull was won by a tractor. the other tractors object.',
  'funnel cake stand against funnel cake stand. a delicious feud.',
  'the ferris wheel has eleven cars. one is stuck at the top. always.',
  'the goat got out of the goat tent again. the goat is undefeated.',
  'DEB HOLLIS handed out flyers in the corn dog queue. a captive crowd.',
  'CARLA WEBB covered the pie contest like it was the moon landing.',
  'a blue ribbon for the largest courgette. it is unsettling. it is.',
  'GUS entered a pie. GUS lost to PEARL. GUS entered again. respect.',
  'TATER, 9, won the science fair with a drawing of a purple hole.',
  'the recipe PEARL uses is a family secret. even her family suspects.',
  'the ring toss has been unwinnable since 1994. one boy won. once.',
  'DALE entered the lawn category. there is no lawn category. yet.',
  'the demolition derby is postponed. everyone brought the same truck.',
], [
  'PEARL evacuated the pies first. then more pies. then the people.',
  'the pie contest continues. the hole is not eligible. PEARL checked.',
  'the ferris wheel is down to nine cars. the stuck one is still stuck.',
  'the prize hog has fled. MAYOR DINKLE calls this entirely unrelated.',
  'MAYOR DINKLE: "the fairgrounds are being RESIZED. it is by design."',
  'the goat has taken charge of the fairground. the goat leads. we go!',
  'TATER is feeding it funnel cake. TATER says it prefers cinnamon.',
  'the tractor pull is cancelled. the tractors pulled. away. quickly.',
  'CARLA WEBB asked PEARL if the pies are safe. the pies are safe.',
  'the stuck ferris wheel car has the best view in the county. sorry.',
], [
  'PEARL won year twelve. one entrant. and somehow still disputed.',
  'the fairgrounds have GONE!! the pies are fine. PEARL saw to that.',
  'the ferris wheel is down to one car. still stuck. still at the top.',
  'the ring toss has gone. nobody ever won it. except that one boy.',
  'MAYOR DINKLE: "we will rebuild the fair. smaller. and cuter."',
  'TATER gave it a blue ribbon. it fits. it fits it really well.',
  'the prize hog reached PIKE HOLLOW. good luck anyway, hog.',
  'GUS finally beat PEARL. by default. GUS is not celebrating. much.',
  'the courgette survived. of course it survived. look at the thing.',
  'the goat got out and took two children with it. what a goat.',
]];

// ── THE HIGH SCHOOL ───────────────────────────────────────────────────────────
// the OTTERS (two and eight), one trophy from 1978, a band with one song
const SCHOOL: Pools = [[
  'the OTTERS are two and eight. the town is fully behind them.',
  'the homecoming float budget is twice the school library budget.',
  'the coach benched his own nephew. family dinner was very tense.',
  'the marching band knows one song. the town knows it TOO well.',
  'the school board argued three hours about a snack machine. no vote.',
  'the trophy case holds one trophy. it is from 1978. it is polished.',
  'TATER, 9, is not in high school. TATER attends anyway. nobody minds.',
  'the pep rally was replaced with a pep rally about the pep rally.',
  'the field is named after a man nobody can identify. plaque worn off.',
  'the chemistry teacher drives the bus, coaches track, and is tired.',
  'CARLA WEBB filed 900 words on a junior scrimmage. nine hundred.',
  'the cheer squad spells out MAPLE. there are four of them. brave.',
  'PIKE HOLLOW leads the series 41 to 3. we do not discuss the series.',
  'the senior prank was mowing a shape into the field. DALE was upset.',
  'a goat got into the gym. the goat has been made team mascot.',
  'DEB HOLLIS was prom queen in 1994. she mentions this daily. daily.',
], [
  'the OTTERS are two and eight and now down one end zone. still ours.',
  'the coach says we play through it. the field is HALF GONE, coach.',
  'the marching band played the one song. louder. defiantly. bravely.',
  'MAYOR DINKLE: "school is FINE. school is a state of mind, kids."',
  'the 1978 trophy has been evacuated. by four adults. in a truck.',
  'PIKE HOLLOW has offered to host our game. suspiciously kind of them.',
  'TATER brought it to show and tell. it was a hit. an enormous hit!',
  'the school board is still arguing about the snack machine. no vote.',
  'the homecoming float is finished. nowhere to parade it. parading on.',
  'the goat is in the gym again. this time nobody is arguing about it.',
], [
  'the OTTERS finish two and eight. no field. still two and eight.',
  'the coach is still drawing plays on the ground. there is no ground.',
  'the 1978 trophy is safe. the school is not. priorities, though.',
  'the marching band played the one song from a car park. an encore!!',
  'MAYOR DINKLE: "I never went to that school." he went to that school.',
  'PIKE HOLLOW forfeits out of pity. we do NOT accept pity, PIKE HOLLOW.',
  'the snack machine vote passed 6 to 0. there is no snack machine.',
  'TATER named it Steve. the yearbook lists Steve under teachers.',
  'the homecoming float made it out. the float is the whole town now.',
  'the goat is on the float. best day of that goat\'s entire life.',
]];

// ── THE FARMS ─────────────────────────────────────────────────────────────────
// PEARL's pumpkins, a corn maze with a disputed middle, one committed rooster
const FARM: Pools = [[
  'PEARL grows the pumpkins. PEARL judges the pumpkins. PEARL wins.',
  'the corn maze has a middle. nobody has confirmed this since 2011.',
  'a man has been in the corn maze since october. he is fine. waving.',
  'the silo is the tallest thing in the county. we mention it a lot.',
  'pumpkin patch dispute: the good pumpkins are all on ONE side.',
  'MAYOR DINKLE was photographed with a cow. the cow looks unconvinced.',
  'the rooster crows at 4:40. the town voted. the rooster abstained.',
  'one barn was painted last year. the other barn is a conversation.',
  'TATER has named every chicken. one chicken is called MAYOR DINKLE.',
  'a tractor blocked the road for 20 minutes. nobody honked. we waited.',
  'the scarecrow has a jacket now. the scarecrow is doing very well.',
  'CARLA WEBB has opened an investigation into the pumpkin weigh-in.',
  'GUS buys his pies from PEARL. GUS also enters against PEARL. bold.',
  'a cow got out. four trucks helped. it took an hour. a lovely hour.',
  'the corn maze map is upside down. it has always been upside down.',
  'the goat has learned to open the gate. every gate. all of them.',
], [
  'the corn maze got easier. that is not good news. that is the hole.',
  'the man in the corn maze walked out. by accident. after nine months.',
  'PEARL moved every pumpkin. herself. in one night. she is PEARL.',
  'MAYOR DINKLE: "the silo is FINE." the silo is at a slight angle.',
  'the cows were moved calmly. the cows have been calm the whole time.',
  'TATER walked the chickens to safety. he named them all again en route.',
  'the scarecrow is facing the hole now. brave. useless. still brave.',
  'the rooster crowed at 4:40 anyway. the rooster has a JOB to do.',
  'the good side of the pumpkin patch went first. of course it did.',
  'the goat opened every gate in the county. best goat we ever had!',
], [
  'the silo has GONE!! it was the tallest thing. we will find another.',
  'the corn maze is solved. by removal. we are counting it as solved.',
  'the pumpkins PEARL grew: safe. her barn: gone. PEARL: unbothered.',
  'the scarecrow held the line. the scarecrow did not hold the line.',
  'every chicken is accounted for. TATER counted twice. he is thorough.',
  'MAYOR DINKLE: "I have always supported barns." he has, actually.',
  'the cow that got out last spring was RIGHT. the cow knew, folks.',
  'PIKE HOLLOW now has the tallest silo in the county. unbearable.',
  'the rooster is on a fence post crowing at nothing. total respect.',
  'the other barn never did get painted. that one stings, honestly.',
]];

// ── THE LAKESIDE ──────────────────────────────────────────────────────────────
// a record catfish from 1996, a boat ramp grudge, four boats and one canoe
const LAKE: Pools = [[
  'the lake association and the town council are not speaking. again.',
  'a record catfish was caught in 1996. the photo hangs in the diner.',
  'the boat ramp etiquette dispute has entered its fourteenth summer.',
  'a man has fished this pier daily for 30 years. total catch: eleven.',
  'MAYOR DINKLE fishes for one photograph, then leaves. every year.',
  'the swim dock drifted. two families claim it. this may go to court.',
  'GUS says the catfish was smaller than the photo. GUS was not there.',
  'TATER caught a boot. TATER is telling absolutely everyone. a boot.',
  'it is a no wake zone. everyone wakes. the sign is decorative now.',
  'CARLA WEBB writes about the lake weekly. the lake is unchanged.',
  'somebody parked a truck at the ramp in 2016. still a live grudge.',
  'the lake is twelve feet deep. locals insist it is bottomless.',
  'DALE mows down to the waterline. exactly to it. not one inch more.',
  'the annual boat parade: four boats and a canoe. a huge turnout.',
  'fishing licence renewals are up. one man renewed twice. by accident.',
  'the goat swam the lake. nobody knows why. the goat knows why.',
], [
  'the lake is smaller. the lake association blames the town council.',
  'MAYOR DINKLE: "the lake is CONCENTRATING. that is good for fish."',
  'the catfish photo was evacuated first. before the people. correct.',
  'the boat ramp is finally free. nobody wants it now. figures.',
  'the man on the pier is still fishing. he has noticed. still fishing.',
  'TATER threw the boot back in as an offering. results unclear.',
  'the disputed swim dock has gone. the dispute continues regardless.',
  'the no wake zone is repealed. there is no wake. there is no water.',
  'the canoe is out. the canoe is always out. a good, steady canoe.',
  'the goat is in the canoe. nobody is going to argue with the goat!',
], [
  'the lake has gone somewhere. the lake association wants answers.',
  'the pier has gone. the man is still fishing. do not disturb him.',
  'the catfish photo is SAFE!! it is in a truck. the photo is fine.',
  'MAYOR DINKLE: "a lake is really more of a mood." concede, sir.',
  'the boat ramp dispute was resolved by the hole. nobody is happy.',
  'TATER says the boot is in there somewhere. TATER wants it back.',
  'PIKE HOLLOW still has a lake. PIKE HOLLOW will not stop saying so.',
  'the canoe made it. the canoe always makes it. classic canoe, that.',
  'thirty years of fishing. eleven fish. and one very good last cast.',
  'the goat is still in the canoe. the goat is steering. it is fine.',
]];

// ── PINE WOODS ────────────────────────────────────────────────────────────────
// the campground, 40 laminated rules, and the pine woods something (1981)
const WOODS: Pools = [[
  'the pine woods something was sighted in 1981. we still discuss it.',
  'the campground host has laminated the rules. all forty. laminated.',
  'quiet hours begin at 9pm, enforced by one man with a torch.',
  'scout troop 12 earned a badge for arguing. not an official badge.',
  'one family has held site 4 every july since 1977. do not ask why.',
  'MAYOR DINKLE camps one night a year, for the photograph. one night.',
  'firewood is five dollars. the next lot is four dollars. this is WAR.',
  'TATER is convinced the something is friendly. TATER is usually right.',
  'the trail map has been wrong since 1990. we find it charming now.',
  'GUS: "the something? a raccoon. a large and confident raccoon."',
  'somebody left a chair at site 9. it has been there four years.',
  'CARLA WEBB has covered the something eleven times. no new facts.',
  'the outhouse was rated surprisingly fine by the county. it is framed.',
  'DALE brought a mower to a campground. DALE mowed a campsite.',
  'the campfire ban was lifted, then reinstated. it has been one day.',
  'the goat has joined scout troop 12. the goat earned two badges.',
], [
  'the something has been sighted. it is purple. it is very round.',
  'the host has laminated a 41st rule. rule 41 is about the hole.',
  'quiet hours have been suspended for the first time ever. one night.',
  'the site 4 family will not leave. it is july. they have HELD it.',
  'the scouts are building something. nobody knows what. scouts stay calm.',
  'MAYOR DINKLE: "the woods are simply more open plan now, folks."',
  'the firewood price war has ended in a truce. mid-crisis. a truce!',
  'TATER has befriended the something. TATER calls the something Steve.',
  'the trail map is now accidentally correct. nobody can explain this.',
  'the chair at site 9 has not moved. the chair is not going to move.',
], [
  'the pine woods something is identified at last. it is Steve. hello.',
  'the host read all 41 rules aloud to nobody at all. all forty-one.',
  'the site 4 family finally left site 4. only by force of nature.',
  'the chair at site 9 survived. of course it did. it is THAT chair.',
  'MAYOR DINKLE: "I have camped these woods." one night. for a photo.',
  'the scouts built a raft!! the scouts were right. very good scouts.',
  'CARLA WEBB finally has her something story. twelve tries. worth it.',
  'quiet hours are permanently observed now. very quiet. too quiet.',
  'the trail map is wrong again. good. honestly, that feels correct.',
  'somebody put the campfire ban sign on a raft. rules are rules.',
]];

// ── THE STRIP ─────────────────────────────────────────────────────────────────
// petrol station, motel, drive-in, and the world's (second) largest twine ball
const STRIP: Pools = [[
  'the world\'s largest ball of twine. second largest. do not say that.',
  'the twine ball gift shop sells small twine balls. made of twine.',
  'the motel sign reads VACANC. it has read VACANC since 1996.',
  'the drive-in has shown one film for two years. it is a good film.',
  'petrol is two cents cheaper here than PIKE HOLLOW. we mention it.',
  'PIKE HOLLOW claims a bigger twine ball. PIKE HOLLOW lies. probably.',
  'the twine ball has a live camera. two people watch it. every day.',
  'motel room 6 has the good telly. everyone asks for room 6. everyone.',
  'CARLA WEBB measured the twine ball. she will not release the number.',
  'the drive-in snack bar is staffed by a teen who never looks up.',
  'TATER visits the twine ball weekly. TATER LOVES the twine ball.',
  'the coffee at the petrol station has been in that pot since tuesday.',
  'GUS refuses to acknowledge the twine ball. GUS has his reasons.',
  'the motel has eleven rooms and one story about room 6. one story.',
  'MAYOR DINKLE ran on twine ball tourism. eleven visitors last year.',
  'the goat has climbed the twine ball. the live camera got it all.',
], [
  'the twine ball has been MOVED. eleven men. one flatbed. legendary.',
  'MAYOR DINKLE is guarding the twine ball himself. a stance, at last.',
  'the motel sign now reads VACAN. we are losing letters and land.',
  'the drive-in is playing the film anyway. half a screen. still good.',
  'PIKE HOLLOW offered to hold our twine ball for safekeeping. no.',
  'DEB HOLLIS: "he saved the TWINE and not the SCHOOL." fair, honestly.',
  'petrol is now four cents cheaper than PIKE HOLLOW. a silver lining.',
  'TATER waved goodbye to the twine ball. then it came back. hero twine!',
  'the twine ball live camera has 900 viewers. finally. after ten years.',
  'room 6 has been evacuated. the good telly went with it. of course.',
], [
  'the twine ball is safe. the town is not. the town accepts this.',
  'the motel sign reads VAC. still lit. still very lit. a proud sign.',
  'the drive-in showed the film to the end. nobody left. nobody could.',
  'MAYOR DINKLE saved the twine ball. it is on his truck. he DID that.',
  'PIKE HOLLOW has the only twine ball now!! no. ours is on a truck.',
  'the petrol sign still shows a price. loyal to the very last.',
  'CARLA WEBB released the twine measurement. it was second. we knew.',
  'TATER is riding in the truck with the twine ball. a perfect ending.',
  'the good telly from room 6 is in somebody\'s back seat. it is fine.',
  'the goat is on the twine ball, on the truck, going down the road.',
]];

// ── THE SUBURBS ───────────────────────────────────────────────────────────────
// DALE's lawn, seventeen yard signs, and a court case about two inches
const BURB: Pools = [[
  'the lawn sign DALE put up is two inches over the line. it went to court.',
  'the property line case has entered year four. two inches. four years.',
  'DALE edges his lawn with an actual ruler. an actual ruler. daily.',
  'the sprinklers go on at 6am. the ones DALE owns go at 5:58. a message.',
  'the mailbox at 114 leans. it has leaned six years. it is beloved.',
  'a trampoline appeared overnight. the street has THOUGHTS about it.',
  'DALE reported a neighbour for leaf placement. leaf PLACEMENT.',
  'CARLA WEBB filed 4,000 words on the property line case. two inches.',
  'TATER sells lemonade at 50 cents. another kid undercut him at 45.',
  'the cul-de-sac basketball hoop has been contested since 2019.',
  'GUS lives out here. GUS has never once mowed. DALE has NOTICED.',
  'somebody put their bins out on the wrong day. the street is talking.',
  'a HOLLIS sign went up. the neighbours brought a casserole anyway.',
  'the goat ate four yard signs. the goat did not check whose. fair.',
  'seventeen yard signs on one street. one of them is upside down.',
  'MAYOR DINKLE door-knocks. he stays 40 minutes at each door. each one.',
], [
  'DALE mowed to the very edge of the hole. a crisp, immaculate line.',
  'the property line case is moot. DALE wishes to continue regardless.',
  'the yard signs are down to eleven. one blew into the hole. suspicious.',
  'the sprinklers still run at 6am. on a hole. on principle. on time.',
  'the leaning mailbox at 114 is still leaning. inspiring, honestly.',
  'MAYOR DINKLE knocked on a door with no house behind it. 40 minutes.',
  'the trampoline has gone. the street has quietly moved on. quietly.',
  'DALE has offered to mow the hole. DALE is serious. DALE always is.',
  'the bins went out on the right day for once. nobody noticed. typical!',
  'the goat is on the trampoline. it is the best thing all week.',
], [
  'the lawn DALE tended has gone. the two inches too. case closed.',
  'the leaning mailbox at 114 is the last thing standing. still leaning.',
  'DALE is mowing a patch the size of a towel. it looks fantastic.',
  'the property line ruling came in!! DALE won. he won by two inches.',
  'the basketball hoop dispute is unresolved. it never will be resolved.',
  'MAYOR DINKLE knocked on the last door. nobody home. he talked anyway.',
  'TATER made 40 dollars. the other kid made 45. good hustle, kid.',
  'GUS never mowed. GUS was RIGHT. DALE will never accept this. never.',
  'somebody\'s bins are still at the kerb. correct day. no street left.',
  'every yard sign has gone. one is in a tree. it is upside down.',
]];

// ── THE COURTHOUSE ────────────────────────────────────────────────────────────
// courthouse steps, the library, one overdue book from 1974, the county clerk
const CIVIC: Pools = [[
  'the library has one overdue book. out since 1974. we know who has it.',
  'the courthouse steps: where every announcement in this town happens.',
  'the library book club has read one book. they discussed it six years.',
  'the county clerk knows everything and says nothing. an absolute pro.',
  'the courthouse statue is of a man nobody can name. beloved anyway.',
  'the two-inch case is in courtroom 2 on thursday. again. still.',
  'the library summer reading champion, eleven years running: TATER, 9.',
  'jury summonses went out. eight people asked to be excused. eight.',
  'CARLA WEBB has a chair in the courthouse. it is HER chair. hers.',
  'the library computer takes twelve minutes to start. we have adapted.',
  'town records go back to 1841. somebody has argued since 1843.',
  'MARGE brought the meter protest to the courthouse. wrong building.',
  'GUS was on a jury once. GUS talks about it constantly. constantly.',
  'the courthouse bell rings at noon. it is eleven minutes early. fine.',
  'the goat got into the courthouse. the goat was excused from jury duty.',
  'MAYOR DINKLE announced his re-election on the steps. the third time.',
], [
  'the 1974 overdue book has been returned. under THESE circumstances?',
  'the library evacuated its books. all of them. the town carried them.',
  'the courthouse steps are now the courthouse step. announcements go on.',
  'the two-inch case has moved to courtroom 1. it is a big case now!',
  'the county clerk is still filing paperwork. calm as a summer lake.',
  'MARGE relocated the meter protest. the meter came WITH her. wow.',
  'CARLA WEBB is writing from her chair. her chair is on a lawn now.',
  'the statue of the man nobody can name has been moved to a truck.',
  'MAYOR DINKLE declared an emergency. the emergency is his poll number.',
  'the goat is in the library. the goat has a library card. somehow.',
], [
  'the courthouse has GONE!! the two-inch case will be heard. somehow.',
  'the 1974 book is safe. the library is not. the book, though: safe.',
  'the county clerk filed the last form, stamped it, and went home.',
  'MAYOR DINKLE conceded on the steps. there are no steps. he conceded.',
  'DEB HOLLIS was sworn in on a folding chair. the clerk says it counts.',
  'the statue of the man nobody can name was rescued first. of course.',
  'MARGE and the meter, alone in a field, still protesting. an icon.',
  'town records saved back to 1841. the 1843 argument goes on. and on.',
  'library summer reading: TATER wins again. twelve years. undefeated.',
  'the courthouse bell rang at noon. eleven minutes early. to the end.',
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
  // ordinary local news. an entirely normal week in a very small town.
  'the BUGLE has a circulation of 40. it is the paper of record.',
  'the bake sale on saturday is at the church hall. bring a plate.',
  'the town motto is "we have a ball of twine". adopted in 1974.',
  'the meter protest has entered year nine. four people. rain or shine.',
  'GUS at the diner has settled the debate. GUS settles all debates.',
  'PEARL has won the pie contest eleven years. PEARL also judges it.',
  'PIKE HOLLOW got a roundabout. we will never hear the end of this.',
  'CARLA WEBB: "I will ask the hard question." she always, always does.',
  'the town hall meeting ran four hours. one item passed: the minutes.',
  'DALE has been mowing since 6am. it is a wednesday. it is always 6am.',
  'TATER, 9, drew a purple circle at school. the teacher kept it.',
  'weather: nice. the small purple dot: also nice, apparently. so far.',
  'the OTTERS lost again. the town remains fully committed to them.',
  'the goat is loose again. it is the same goat. it is always the goat.',
  'a casserole was delivered to the wrong house. it stayed. correct.',
  'MARGE: "the meter is the REAL issue." nine years of saying that.',
  'population 1,412. the sign says 1,408. a four-year argument, that.',
  'the BUGLE went to two pages this week. a huge news week. huge.',
  'lost and found at town hall: nine hats, a trombone, a casserole dish.',
  'the water tower says MAPLE FALLS. repainted in 1991. it holds.',
  'a small purple dot was reported near the water tower. probably a bug.',
  'the fair opens friday. the stuck ferris wheel car is still stuck.',
  'the library has a new chair. the old chair has been moved. drama.',
  'the barber raised his price a dollar. the first time since 1988.',
  'MAYOR DINKLE has announced a third run. his slogan is "still DINKLE".',
  'DEB HOLLIS has launched her campaign. election tuesday. turnout: 411.',
  'the debate is at the diner. GUS moderates. GUS will not be fair.',
  // — BEAT 2 · DENIAL — there is a hole. the mayor says there is not. —
  'MAYOR DINKLE: "there is no hole. I would KNOW about a hole, folks."',
  'MAYOR DINKLE has never seen the hole. he is standing next to it.',
  'the hole is not on the town map. the map is from 1974. checkmate.',
  'town hall voted on whether the hole is real. 4 to 4. no decision.',
  'MAYOR DINKLE: "that is a puddle. a deep, dry, purple puddle."',
  'GUS: "it is a hole." MAYOR DINKLE: "it is a DRAINAGE FEATURE."',
  'CARLA WEBB asked about the hole. the mayor talked about pie. 20 mins.',
  'TATER told the grown ups. the grown ups had a MEETING about it.',
  'a hole ate a bin. the council has formed a bin committee. bins.',
  'MAYOR DINKLE: "no hole. next question. NEXT QUESTION, CARLA."',
  'the bake sale is still on. the hole was not invited. rude of it.',
  'the goat has stared at the hole all morning. the goat knows.',
], [
  // — BEAT 3 · ALARM — dawning horror, delivered cheerfully. one "!" max. —
  'MAYOR DINKLE: "the hole is a DRAINAGE PROJECT. it is going great."',
  'a sign says do not feed the hole. TATER has already fed the hole.',
  'the town hall meeting: four hours on the hole. no vote. classic.',
  'CARLA WEBB asked the mayor a follow-up. the mayor went very quiet.',
  'MAYOR DINKLE formed a committee. the committee formed a subcommittee.',
  'the BUGLE has gone to four pages. CARLA WEBB is having a week.',
  'MARGE: "and another thing about that meter." MARGE. please. MARGE.',
  'PIKE HOLLOW offered help. we would rather be eaten. that is official.',
  'GUS closed the diner at noon. GUS reopened at 12:04. GUS is fine.',
  'PEARL is evacuating pies. calm. on schedule. she is simply PEARL.',
  'MAYOR DINKLE unveiled a plan. the plan is a tarp. a very large tarp.',
  'DALE has mowed the same lawn three times today. a coping mechanism.',
  'the emergency siren was tested. it plays the school fight song.',
  'MAYOR DINKLE: "we are not shrinking. we are getting COZIER, folks."',
  'TATER named it. the whole town is using the name now. it is Steve.',
  'the twine ball has been loaded onto a flatbed truck. priorities set.',
  'the debate was cancelled, rescheduled, cancelled. GUS is furious.',
  'MAYOR DINKLE consulted an expert. the expert runs the petrol station.',
  'the population sign reads 1,408 and is, for the first time, too high.',
  'a four hour meeting on whether to hold a meeting. motion carried.',
  'MAYOR DINKLE: "this is NOT an evacuation. this is a fun walk."',
  'MAYOR DINKLE: "there is no hole. also stay away from the hole."',
  'oh gosh. it ate the bandstand. with the band still on it. sorry.',
  'the town siren went off. it played the fight song. we all sang!',
  'the fun walk is now a fun jog. the fun jog is now a fun SPRINT.',
  'MAYOR DINKLE: "I was always against the hole. write that down."',
  'it burped and the whole street smelled of GRAVY. every street.',
  'PEARL is carrying nine pies at a run. nine. not one wobble.',
  'MAYOR DINKLE: "small hole. medium hole. okay. okay. RUN, folks."',
  'the bake sale moved indoors. there is no indoors. moved anyway.',
  'MAYOR DINKLE said oh gosh. he has never said oh gosh. he said it.',
  'there is a second hole now, out by the water tower. that makes two.',
  'the goat has left town. the goat left first. the goat always knows.',
  'DEB HOLLIS: "the hole is real AND it is his fault." both. somehow.',
], [
  // — BEAT 4 · PANIC — the town is gone and the meter argument goes on. —
  'MAYOR DINKLE: "fine. it is real. I still say it is a DRAINAGE issue."',
  'MAYOR DINKLE conceded. then asked about a recount. immediately after.',
  'the BUGLE printed a special edition. six pages. CARLA WEBB has peaked.',
  'GUS is still serving coffee. GUS will always be serving coffee.',
  'the pies PEARL made are all safe. she planned for this in 1998.',
  'MARGE is still protesting the meter. the meter is the last thing left.',
  'TATER says Steve is just hungry. TATER has been right the whole time.',
  'PIKE HOLLOW sent a casserole. PIKE HOLLOW is smug about the casserole.',
  'DALE is mowing a lawn the size of a doormat. it is immaculate. DALE.',
  'the town hall meeting was held in a field. four hours. still no vote.',
  'the twine ball is on a truck out of town. we saved what mattered.',
  'MAYOR DINKLE: "I blame the last mayor." it was him. it was him.',
  'the population sign is eaten. final count: everyone, in one car park.',
  'the emergency siren played the fight song!! we all sang. all of us.',
  'MAYOR DINKLE cut a ribbon on nothing at all. the man is UNBREAKABLE.',
  'CARLA WEBB: "one more question, mayor." she gets the last question.',
  'the town has gone. the argument about the meter continues. it does.',
  'the BUGLE: circulation 41. there is a new subscriber. purple. hungry.',
  'the water tower is the last word standing. it says MAPLE FALLS. good.',
  'MAYOR DINKLE: "I never said fake news. I said fake HOLE." he did not.',
  'it ate town hall, the clock, and the ladder. the man got down first.',
  'something burped and it smelled of the whole diner. all of it.',
  'MAYOR DINKLE conceded. then asked who ate his TRUCK. it did, sir.',
  'another hole has opened by the water tower. they are MULTIPLYING.',
  'there are three of them now. THREE. we have stopped counting.',
  'the goat came back for two more children. what a goat!!',
  'DEB HOLLIS won in a landslide. she is the mayor of a purple circle.',
  'the first act of the new mayor was blaming MAYOR DINKLE. correct.',
]];

// ── BEAT 4 · SIGN-OFF ─────────────────────────────────────────────────────────
// The town is gone and CARLA WEBB is still reading out the weather. These are
// the *last words* of the arc, so they only go to print once the match is
// genuinely over the hill — see `endgame` in pickMapleNews, which reads
// devouredPct and secondsLeft directly. A forecast at 18% devoured is a lie.
// Punctuation drops back to at most one "!": the panic is over, this is a
// goodnight.
const SIGN_OFF: string[] = [
  'CARLA WEBB reads the weather. the town has gone. weather: mild.',
  'weather tomorrow: sunny, breezy, no town at all. still sunny.',
  'the town has gone. the bake sale results are still disputed.',
  'DEB HOLLIS is the mayor of grass. she is doing a very good job.',
  'the BUGLE: goodnight, MAPLE FALLS. sorry about the everything.',
  'TATER waves. Steve waves. the grown ups are still arguing. classic.',
  'and now the weather, from a field, with CARLA WEBB. it is nice out.',
  'goodnight, MAPLE FALLS. the election is still on tuesday. somehow.',
  'the BUGLE signs off. circulation 41. one of them is purple.',
  'goodnight from a car park. go OTTERS. and good luck, everybody.',
];

// ── WHAT IT JUST ATE ──────────────────────────────────────────────────────────
// ctx.lastMeal is free text from the call site. It never says "a boat" or "a
// person" — the game only tags HOUSE and CAR, and sizes everything else — so
// these four buckets are everything the API can actually tell us apart.
// A bite the player just took should be in the paper within seconds of it.
export type MealKind = 'house' | 'car' | 'big' | 'small';

const MEAL_HOUSE: Pools = [[
  'a house has gone. the mailbox stayed. the mailbox is doing fine.',
  'a whole HOUSE. the council will discuss this for four hours.',
  'a house went down in one bite. the doorbell rang once. sad, that.',
  'MAYOR DINKLE: "that house was CONDEMNED." it was not condemned.',
], [
  'another house. DEB HOLLIS asks how many. the answer is nine.',
  'a house went in whole. the dog got out. good dog. very good dog!',
  'DALE mowed the lawn of a house that is not there. a crisp line.',
  'MAYOR DINKLE: "houses come and houses go, folks." they do not.',
], [
  'every house on the street is eaten. DALE is still edging. still.',
  'the last house went in sideways and burped. the burp was worse.',
  'the houses are GONE!! the leaning mailbox at 114 is still up.',
  'MAYOR DINKLE: "I have always supported houses." nobody is left.',
]];

const MEAL_CAR: Pools = [[
  'a parked car has gone. it was parked WRONG anyway, says DALE.',
  'a car went in honking. the honk got quiet very fast. very fast.',
  'somebody\'s car has gone. the street already knows whose. of course.',
  'a car. one gulp. one small burp. the town says nothing. yet.',
], [
  'another car eaten. MAYOR DINKLE is calling it a parking solution.',
  'a car went down with the radio on. we could hear it. faintly.',
  'MARGE: "fine, it ate a car. now about that METER." year nine.',
  'DEB HOLLIS: "cars are being EATEN." the mayor is on his phone.',
], [
  'the last car is eaten. its alarm is still going. under the ground.',
  'the truck MAYOR DINKLE drove has gone. the face on the bumper too.',
  'no cars left. the parking meter remains. MARGE is FURIOUS. still.',
  'a car went in and the horn honked for nine whole seconds!! nine.',
]];

const MEAL_BIG: Pools = [[
  'a whole building has gone. the ground went whump. everyone felt it.',
  'something enormous is missing downtown. nobody can say which one.',
  'a landmark has gone. it was on the postcard. the ONE postcard.',
  'that one was big. the cups in the diner all did a little wobble.',
], [
  'a building went down whole. it sounded like a bath draining. ugh.',
  'MAYOR DINKLE: "that building was UGLY." he cut its ribbon. twice.',
  'DEB HOLLIS: "he lost a WHOLE BUILDING." he did. the entire thing.',
  'oh gosh. that was the big one on the corner. with the clock on it.',
], [
  'the last big thing went in slowly. very slowly. we all watched.',
  'MAYOR DINKLE: "we will rebuild it. smaller. cuter. much cheaper."',
  'the water tower went in last!! it said MAPLE FALLS on the way down.',
  'that bite was so big the rooster stopped. the rooster NEVER stops.',
]];

const MEAL_SMALL: Pools = [[
  'it ate a mailbox. one mailbox. one tiny burp. rather adorable.',
  'a bin is missing. the street has already blamed three people.',
  'it ate a garden gnome. that gnome had been there since 1988.',
  'a small snack was taken on elm street. the council does not know.',
], [
  'still snacking. bins, mailboxes, one shoe. somebody\'s good shoe.',
  'it ate a bin, burped, then took the OTHER bin. greedy. so greedy.',
  'MAYOR DINKLE: "it only ate a SMALL thing. we have loads." nine.',
  'it ate the swing set. the swings squeaked all the way down. eek!',
], [
  'nothing big is left. it is eating crumbs now. very loud crumbs.',
  'it ate the last bin. it did not even WANT the last bin. rude.',
  'down to gnomes and letterboxes. it is HOOVERING the county.',
  'the last snack was a casserole. PIKE HOLLOW sent it. serves them.',
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
const LIVE: Pools = [[
  'MAYOR DINKLE: "there is no {F} in {D}." there is, though.',
  'a {F} was sighted in {D}. residents waved. they always do.',
  'it ate {M}. MAYOR DINKLE calls this "a scheduling matter".',
  'DEB HOLLIS: "{M}? gone." her polls are up nine points.',
  'CARLA WEBB: "mayor, about the {F} in {D}?" he walks away.',
  'TATER fed the {F}. TATER says it prefers {M}.',
  'poll: is the purple thing getting bigger? {P}% say yes.',
  'GUS on the {F}: "you want my opinion? it needs a haircut."',
  'a second hole has opened. that is two holes now. two of them.',
  'MAYOR DINKLE cut a ribbon in {D}. the ribbon has gone now.',
  'PEARL asked if the {F} is eligible for the pie contest. denied.',
  'a {F} in {D}. town hall schedules four hours of meeting.',
  'BUGLE front page: "{M}, GONE?" note the question mark.',
  'DALE offered to mow around the {F}. DALE is not joking. never is.',
  'MARGE: "a {F}? fine. now can we discuss the METER." year nine.',
  'MAYOR DINKLE: "I have never seen a {F}." he is looking at one.',
  'it ate {M}. nobody saw a thing. everybody saw it.',
], [
  'MAYOR DINKLE: "a SMALL {F}." it is {P}% of the town. small-ish.',
  'we are evacuating {D}. politely. with casseroles. in one line.',
  'it ate {M}. somebody owned that. there will be a MEETING.',
  '{P}% of MAPLE FALLS has gone. the mayor calls it a rounding error.',
  'DEB HOLLIS: "{P}% gone." she is up nine points. NINE points.',
  'do not go to {D}. that is exactly where the {F} is.',
  'TATER named the {F}. everyone is using the name now. it is Steve.',
  'CARLA WEBB in {D}: "how do you feel?" they feel terrible, CARLA.',
  'it ate {M}. GUS: "I said this would happen." he did not.',
  'MAYOR DINKLE has renamed the {F} the maple falls basin. nice try.',
  'PEARL has moved the pies out of {D}. THAT is leadership.',
  '{P}% devoured. the other {R}% is at a town hall meeting about it.',
  'PIKE HOLLOW asked how {D} is going. they KNOW how it is going.',
  'DALE mowed the edge of the {F} in {D}. the line is CRISP.',
  'MAYOR DINKLE: "{P}% is a very DINKLE-friendly number." it is not.',
  'MARGE has moved the protest to {D}. the meter came too.',
  'a second {F} has been reported. that makes two of them now.',
], [
  '{D}: GONE!! a four hour meeting has been scheduled about it.',
  '{P}% DEVOURED. the other {R}% has already formed a committee.',
  'the {F} ate {M}. the mayor blames the last mayor.',
  '{S} SECONDS LEFT!! everyone to the car park. bring casseroles.',
  'a {F} now holds {P}% of MAPLE FALLS. it filed no paperwork at all.',
  '{S} SECONDS LEFT and MARGE is still protesting that meter.',
  'the {F} ate {M}. TATER said it was hungry.',
  'CARLA WEBB got a quote from the {F}. it said nothing. she printed it.',
  'MAYOR DINKLE concedes {D}. he is keeping the ribbon scissors.',
  '{S} SECONDS LEFT. GUS is still open. GUS is always still open.',
  'PEARL saved the pies. the {F} got {M}.',
  '{P}% gone. that is {R}% of a town still arguing about a meter.',
  'the {F} ate {M}. PIKE HOLLOW sent a casserole.',
  'DALE mowed the last lawn in {D}. crisp to the very end, that man.',
  '{S} SECONDS LEFT!! the twine ball is on the truck. go. go. go.',
  'the {F} ate {M}. the recount goes ahead anyway.',
  'there are two of them at {D} now. TWO. we are leaving.',
]];

// ══ WHO IS TALKING ═══════════════════════════════════════════════════════════
// Speech bubbles over people's heads — a different medium from the ticker, and
// deliberately left in their own voice. A line should sound like the PERSON,
// not the newspaper. Kept SHORT: a phone bubble truncates fast, so aim under
// ~34 characters, hard cap 46.
export const MAPLE_VOICE_AMBIENT: Record<string, string[]> = {
  // campaigning at anyone who holds still for three seconds
  politician: [
    'DINKLE. you know the name.', 'can I count on your vote?', 'I have a plan for the pier.',
    'lovely dog. is it registered?', 'my opponent has NO plan.', 'I grew up two streets over.',
    'four more years! or eight!', 'we are polling very well.', 'great question. the answer is no.',
    'yard sign? free yard sign!', 'I fixed that pothole. me.', 'my opponent hates the fair.',
    'shake my hand. firm. good.', 'I will be at the diner at 8.', 'the twine ball put us on maps.',
    'I have never been eaten.', 'a vote for me is a vote for me', 'let me finish. LET ME FINISH.',
    'I love this town. on record.', 'kiss the baby? I kissed it.', 'name one thing she has done.',
  ],
  // nine years. one parking meter. four people. total commitment.
  protester: [
    'the METER. it is the meter.', 'nine years. NINE. still here.', 'honk if you hate that meter!',
    'twenty five cents. an HOUR.', 'we have a petition. sign it.', 'nobody asked for that meter.',
    'my sign is laminated. it lasts', 'we protest rain or shine.', 'there are four of us. FOUR.',
    'the meter is a SYMBOL.', 'I brought folding chairs.', 'day 3,281 of the protest.',
    'ask me about the meter.', 'we are not going anywhere.', 'the council knows my name.',
    'coffee break. then back to it.', 'I have a bullhorn. legally.', 'this is about PRINCIPLE.',
    'the meter started all of this.', 'my husband agrees. mostly.',
  ],
  // does not gossip. is currently gossiping.
  gossip: [
    'well. I heard something.', 'do not tell a soul. tell one.', 'her cousin at the DMV said—',
    'apparently it is about money.', 'they are not speaking. still.', 'I saw whose truck that was.',
    'the pie contest was RIGGED.', 'that casserole was store bought', 'they moved here in 2019. new.',
    'I do not gossip. but listen.', 'that is not his real lawn.', 'there was a WHOLE incident.',
    'nine people know. now ten.', 'the mayor knows. of course.', 'I have said too much. more?',
    'it started at the fair, in 96.', 'her sister told my sister.', 'this stays between us. and Deb.',
    'ask me again in ten minutes.', 'I would never repeat it. so:',
  ],
  farmer: [
    'rain would be nice. or not.', 'that corn is coming in fine.', 'the rooster starts at 4:40.',
    'a cow got out again. tuesday.', 'that silo is county famous.', 'four generations on this dirt.',
    'tractor is slow. road is long.', 'pumpkins look good this year.', 'the maze has a middle. maybe.',
    'town folks do not understand.', 'up at four, done at nine.', 'the scarecrow has a jacket now.',
    'the fair is the only holiday.', 'that fence has an opinion.', 'never trust a flat horizon.',
    'my chickens are all named.', 'if it rains, it rains.', 'that barn needs paint. next year.',
    'good dirt. the best dirt.', 'I have not been to the city.',
  ],
  teen: [
    'this town has one stoplight.', 'nothing happens here. ever.', 'I am moving to the city. soon.',
    'the drive-in has ONE movie.', 'we lost again. shocker.', 'my mom knows your mom. sorry.',
    'everybody knows everything.', 'the twine ball is not a thing.', 'I work at the gas station. yay.',
    'homecoming is a whole ordeal.', 'literally no signal out here.', 'the diner or the parking lot.',
    'my dad coaches. it is a lot.', 'PIKE HOLLOW is worse. barely.', 'I am in the band. one song.',
    'six days till I get my license', 'yes my last name is Dinkle.', 'this is the most exciting day.',
    'I have a job at the fair. ugh.', 'do NOT tell my aunt about this.',
  ],
  // the only person in town who has this correctly figured out
  kid: [
    'his name is Steve. I named him', 'can we keep it?? please??', 'it ate the mailbox! COOL!',
    'Steve likes pie. I checked.', 'grown ups are being so weird.', 'I drew him. want to see?',
    'he is SO round. so so round.', 'nobody believed me. NOBODY.', 'I fed him a funnel cake.',
    'he waved! sort of! he waved!', 'this is the best day EVER.', 'I won summer reading again.',
    'my lemonade is 50 cents.', 'Steve is not scary. he is shy.', 'I named all the chickens too.',
    'can Steve come to the fair?', 'the mayor is boring. Steve rules', 'I told the newspaper lady!',
    'Steve blinked. I SAW it.', 'I am not scared. YOU are.',
  ],
  // GUS energy: refills are free, so are the opinions
  diner: [
    'coffee is 90 cents. always.', 'you want my opinion? here it is.', 'pie? we got PEARL\'s pie.',
    'that booth is Marge\'s booth.', 'no, we do not do oat milk.', 'sit anywhere. not there.',
    'the debate is at 8. be early.', 'banned him. still feed him.', 'I have been here 31 years.',
    'the special is the special.', 'refills free. opinions free.', 'that photo? catfish. 1996.',
    'the mayor sits in the corner.', 'we close when I say we close.', 'eggs how you like em, hon.',
    'I moderate. I do not referee.', 'you two. outside. talk it out.', 'I lost to Pearl again. again.',
    'more coffee. sit back down.', 'nobody leaves here hungry.',
  ],
  // relentlessly, unshakeably proud of a town with one stoplight
  booster: [
    'best little town in the county', 'have you seen our twine ball?', 'GO OTTERS! two and eight!',
    'we got a fair. a WHOLE fair.', 'PIKE HOLLOW wishes. they WISH.', 'population 1,412. and growing.',
    'our gas is two cents cheaper.', 'the pie here is world class.', 'sign the guest book, friend!',
    'we were in a magazine. once.', 'that silo? tallest in county.', 'stay for the boat parade!',
    'four boats and a canoe. HUGE.', 'the drive-in is a landmark.', 'buy a shirt! support the band!',
    'we peaked in 1978. we return.', 'you should see us in October.', 'nowhere better. I mean it.',
    'that water tower? repainted 91', 'one stoplight. it is a GOOD one',
  ],
};

export const MAPLE_VOICE_PANIC: Record<string, string[]> = {
  politician: [
    'this is my opponent\'s fault!!', 'I NEVER said it was fake!!', 'to the truck!! MY truck!!',
    'vote for me from wherever!!', 'save the yard signs!!', 'I demand a RECOUNT!!',
    'I was AGAINST it all along!!', 'the polls are still OPEN!!', 'somebody grab the ribbon!!',
    'four more— okay, RUN!! RUN!!', 'I will fix this in term THREE!',
  ],
  protester: [
    'the METER!! SAVE THE METER!!', 'this changes NOTHING!!', 'still twenty five cents!!',
    'we protest ON THE RUN!!', 'grab the laminated signs!!', 'day 3,281 continues!!',
    'nobody drop that petition!!', 'the meter is still WRONG!!', 'four of us! STILL four!!',
    'I am taking the chairs!!',
  ],
  gossip: [
    'I KNEW it! I TOLD everyone!!', 'wait till Deb hears THIS!!', 'who do I call FIRST?!',
    'this is the biggest news EVER', 'I heard it was the mayor!!', 'somebody knew! SOMEBODY KNEW!',
    'I am telling EVERYONE!!', 'run! and TALK while you run!!', 'this beats the 96 fair thing!!',
    'ask me later!! I will KNOW!!',
  ],
  farmer: [
    'get the COWS out! ALL of em!!', 'not the SILO!! anything else!!', 'the chickens!! get a bucket!!',
    'four generations!! FOUR!!', 'take the tractor! it is slow!!', 'the pumpkins! the GOOD ones!!',
    'I said rain. this ain\'t rain!!', 'that maze HAD a middle!!', 'somebody get the rooster!!',
    'forget the paint! GO! GO!!',
  ],
  teen: [
    'okay this is actually sick', 'I am FILMING this!!', 'finally something HAPPENED!!',
    'nobody is going to believe me!', 'told you this town was cursed', 'coach! COACH! the FIELD!!',
    'moving to the city TODAY!!', 'this beats homecoming!!', 'RUN! also is my hair okay?!',
    'my mom is SO going to hear this',
  ],
  kid: [
    'RUN!! it is a GAME!! run!!', 'GO STEVE!! GO!!', 'this is better than the fair!!',
    'wait for me!! WAIT!!', 'I TOLD you he was real!!', 'Steve is just hungry! stop it!',
    'again!! do it AGAIN!!', 'mum you are SO slow!!', 'can I bring him home?!',
    'best. field trip. EVER!!',
  ],
  diner: [
    'we are STILL OPEN!! sit down!', 'grab the coffee pot!! GO!!', 'save the catfish photo!!',
    'I said this would happen!!', 'nobody leaves hungry!! RUN!!', 'take a pie with you!! GO!!',
    'the booth! save Marge\'s booth!', 'thirty one years!! THIRTY ONE!', 'still 90 cents!! LEGALLY!!',
    'out the back, hon!! MOVE!!',
  ],
  booster: [
    'the TWINE BALL!! save it!!', 'we will REBUILD! BIGGER!!', 'PIKE HOLLOW cannot know!!',
    'GO OTTERS!! even NOW!! GO!!', 'get the 1978 trophy!!', 'this is STILL a great town!!',
    'take the guest book!! GO!!', 'we were in a MAGAZINE!!', 'best little town! STILL!!',
    'do NOT tell the county!!',
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

/** clears the anti-repeat memory — call between matches if you like. */
export function resetMapleNews(): void {
  history.length = 0; rawHistory.length = 0; signedOn = false;
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
    dist: ctx.district ? DIST_NAME[ctx.district] : 'MAPLE FALLS',
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
 *   1 SIGN-ON   the first call of every match. good morning + real local news.
 *   2 DENIAL    tier 0 — nobody connects the dots. that is a puddle.
 *   3 ALARM     tier 1 — dawning horror, cheerfully. the evacuation is a walk.
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
  const signOffPool = endgame ? SIGN_OFF : [];

  const chooseRaw = (): string => {
    if (signOffPool.length && rnd() < 0.25) {
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
