// ══════════════════════════════════════════════════════════════════════════════
//  NEWSROOM — MAPLE FALLS, the town that is having an ELECTION about this
// ══════════════════════════════════════════════════════════════════════════════
//  Not a news ticker. A *small town local paper* covering the end of the world
//  the way it covers everything else: as a local controversy with two sides.
//
//  Tier 0: an ordinary week. Election season. Everyone is furious about a meter.
//  Tier 1: the void is now a wedge issue. The paper goes to four pages.
//  Tier 2: the town is gone. The argument is NOT gone. The argument never goes.
//
//  The running joke is MAYOR DINKLE — a man seeking a third term on a platform
//  of denying that the void exists, who will cut a ribbon on absolutely nothing
//  rather than concede a single point to his challenger.
//
//  Recurring cast (reuse IS the joke — do not add one-off names):
//    MAYOR DINKLE   incumbent. the void is not real. later: it is real, but RUDE.
//    DEB HOLLIS     challenger. one policy. the policy is "this is Dinkle's fault".
//    GUS            owns the diner. has an opinion. you did not ask. here it is.
//    CARLA WEBB     the Maple Falls Bugle. circulation 40. career-defining week.
//    PEARL          runs the pie contest. judges the pie contest. wins it. 11 yrs.
//    TATER (9)      thinks the void is great. names it Steve. is correct throughout.
//    DALE           his whole personality is his lawn. the two-inch court case.
//    MARGE          nine years protesting one parking meter. will not be deterred.
//    PIKE HOLLOW    the smug rival town over the county line. they got a roundabout.
//    THE TWINE BALL the World's (second) Largest. load-bearing civic pride.
//
//  Register: warm, silly, small-town self-importance. Ages 6-11, with a layer
//  the grown-up reading over their shoulder gets too. NO real politics, no
//  parties, no policy, no menace, nobody gets hurt. The joke is that a town
//  this small can have this many feuds — never politics itself.
//  Lines render in a one-line phone ticker — aim under ~62 chars, cap ~78.
// ══════════════════════════════════════════════════════════════════════════════

export type NewsTier = 0 | 1 | 2;
export type MapleDist =
  | 'mainst' | 'fair' | 'school' | 'farm' | 'lake' | 'woods' | 'strip' | 'burb' | 'civic';

export interface MapleCtx {
  tier: NewsTier;
  district: MapleDist | null;   // where the player currently is (null if unknown)
  lastMeal: string;             // e.g. "a mailbox", "the whole DINER"
  devouredPct: number;          // 0..100
  form: string;                 // e.g. 'VOIDLING' | 'GOBBLER' | 'DEVOURER'
  secondsLeft: number;
  rivalName: string;            // a rival void's name, e.g. 'CHOMPZILLA'
  rivalLead: number;            // signed score difference vs the player
}

/** Per-tier ticker brand. The Bugle escalates. The Bugle has WAITED for this. */
export const MAPLE_BRAND: [string, string, string] = [
  '📰 THE BUGLE',
  '⚠️ BUGLE ALERT',
  '🚨 BUGLE EXTRA',
];

/** Ticker-friendly district names, used to fill {D}. All read after "in". */
const DIST_NAME: Record<MapleDist, string> = {
  mainst: 'DOWNTOWN MAPLE',
  fair: 'THE FAIRGROUNDS',
  school: 'THE HIGH SCHOOL',
  farm: 'THE FARMS',
  lake: 'THE LAKESIDE',
  woods: 'PINE WOODS',
  strip: 'THE STRIP',
  burb: 'THE SUBURBS',
  civic: 'THE COURTHOUSE',
};

type Pools = [string[], string[], string[]];

// ── MAIN STREET ───────────────────────────────────────────────────────────────
// town hall, GUS's diner, the barber, and MARGE's nine-year parking meter vigil
const MAINST: Pools = [[
  'MAYOR DINKLE cuts a ribbon on the ribbon store. third time.',
  'GUS at the diner: "you want my opinion? here it comes anyway."',
  'the parking meter protest enters year nine. four people. proud.',
  'the barber gives one haircut. he has given it since 1988.',
  'DEB HOLLIS: "Main Street is lovely. no thanks to DINKLE."',
  'town hall clock nine minutes fast. voted on. kept that way.',
  'MAPLE FALLS BUGLE: circulation 40. all forty of them read it.',
  'diner coffee still 90 cents. the sign says so. LEGALLY.',
  'MARGE has chained herself to the meter. gently. for the photo.',
  'DALE mows the grass outside town hall. nobody asked him to.',
  'GUS bans a man for life. the man orders lunch. GUS serves him.',
  'town hall agenda, item 1 of 1: the meter. it is always the meter.',
  'MAYOR DINKLE waves at everyone. it is a whole thing. it works.',
  'the barber has opinions about the meter. STRONG barber opinions.',
  'new bench downtown. plaque credits DINKLE. bench built by DALE.',
  'CARLA WEBB has covered eleven town hall meetings. eleven. no vote.',
], [
  'MAYOR DINKLE: "Main Street is FINE. Main Street is a CONCEPT."',
  'DEB HOLLIS: "the hole downtown is DINKLE-shaped." bold. effective.',
  'GUS closes the diner. GUS reopens the diner. GUS is not leaving.',
  'MARGE will not move. the meter is still the real issue. STILL.',
  'CARLA WEBB has a FRONT PAGE. she has waited nineteen years.',
  'barbershop down to one chair. still a forty minute wait.',
  'town hall clock now eleven minutes fast. nobody has fixed it.',
  'DALE edges around the void. crisp line. honestly a crisp line.',
  'press conference held in a shrinking parking lot. undeterred.',
  'the diner booth by the window is gone. that was MARGE\'s booth.',
], [
  'MAYOR DINKLE: "I never said it was fake. I said it was RUDE."',
  'DEB HOLLIS wins. DEB HOLLIS is now mayor of a hole. congrats, DEB.',
  'GUS serves coffee off a card table. 90 cents. LEGALLY 90 cents.',
  'the meter survived. MARGE is FURIOUS. MARGE keeps protesting.',
  'CARLA WEBB files the story. circulation now 41. huge night, Carla.',
  'town hall gone. the clock: still floating. still eleven fast.',
  'the barber gave one last haircut. it was the same haircut.',
  'DALE mowed where town hall used to be. somebody has to, folks.',
  'MAYOR DINKLE concedes Main Street. keeps the ribbon scissors.',
  'four people still protesting a meter in an empty lot. legends.',
]];

// ── THE FAIRGROUNDS ───────────────────────────────────────────────────────────
// PEARL's eleven-year pie dynasty, the prize hog, and a permanently stuck wheel
const FAIR: Pools = [[
  'PEARL wins the pie contest. PEARL also judges the pie contest.',
  'the pie contest has been disputed eleven years running. eleven.',
  'prize hog named DINKLE. the mayor calls this "a great honor".',
  'tractor pull won by a tractor. the other tractors have objected.',
  'funnel cake stand vs. funnel cake stand. blood feud. delicious.',
  'the ferris wheel has eleven cars. one is stuck at the top. always.',
  'MAYOR DINKLE judges the goats. MAYOR DINKLE knows nothing of goats.',
  'DEB HOLLIS hands out flyers at the corn dog line. captive crowd.',
  'CARLA WEBB covers the pie contest like it is the moon landing.',
  'blue ribbon for largest zucchini. the zucchini is unsettling.',
  'GUS entered a pie. GUS lost to PEARL. GUS entered again. respect.',
  'TATER, 9, won the science fair with a drawing of a purple hole.',
  'PEARL\'s recipe is a family secret. the family is also suspicious.',
  'ring toss unwinnable since 1994. one boy won once. he is a legend.',
  'DALE entered the lawn category. there is no lawn category. yet.',
  'demolition derby postponed. everyone brought the same truck. again.',
], [
  'PEARL evacuated the pies first. then more pies. then the people.',
  'the pie contest continues. the void is not eligible. PEARL checked.',
  'ferris wheel down to nine cars. the stuck one: still stuck. proud.',
  'prize hog DINKLE has fled. the mayor calls this "entirely unrelated".',
  'MAYOR DINKLE: "the fairgrounds are being RESIZED. that is by design."',
  'DEB HOLLIS flyers the funnel cake line. the line is very short now.',
  'TATER is feeding it funnel cake. TATER says it prefers cinnamon.',
  'tractor pull cancelled. the tractors pulled. away. very quickly.',
  'CARLA WEBB: "PEARL. on the record. are the pies safe?" they are safe.',
  'the stuck ferris wheel car has the best view in the county. sorry.',
], [
  'PEARL wins year twelve. one entrant. somehow still disputed.',
  'fairgrounds gone. the pies are FINE. PEARL made certain of that.',
  'ferris wheel down to one car. still stuck. still right at the top.',
  'the ring toss is gone. nobody ever won it. except that one boy.',
  'MAYOR DINKLE: "we will rebuild the fair. slightly smaller. cuter."',
  'TATER gave it a blue ribbon. it fits. it fits it really well.',
  'prize hog DINKLE reached Pike Hollow. traitor. good luck though, hog.',
  'DEB HOLLIS: "eleven years of DINKLE and now no FAIR." fair point.',
  'GUS finally beat PEARL. by default. GUS is not celebrating. much.',
  'the zucchini survived. of course the zucchini survived. look at it.',
]];

// ── THE HIGH SCHOOL ───────────────────────────────────────────────────────────
// the Maple Falls Otters (2 and 8), one trophy from 1978, a band with one song
const SCHOOL: Pools = [[
  'the MAPLE FALLS OTTERS: 2 and 8. town remains fully behind them.',
  'homecoming float budget is twice the school library budget. twice.',
  'coach benched his own nephew. family dinner: tense. extremely tense.',
  'the marching band knows one song. the town knows it TOO well.',
  'MAYOR DINKLE speaks at assembly for 40 minutes. topic: himself.',
  'school board argues three hours about a vending machine. no vote.',
  'DEB HOLLIS was prom queen in 1994. she mentions this daily. daily.',
  'the trophy case holds one trophy. it is from 1978. it is polished.',
  'TATER, 9, is not in high school. TATER attends anyway. nobody minds.',
  'pep rally cancelled, replaced with a pep rally about the pep rally.',
  'the field is named for a man nobody can identify. plaque worn off.',
  'the chemistry teacher drives the bus, coaches track, and is tired.',
  'CARLA WEBB files 900 words on a junior varsity scrimmage. 900.',
  'the cheer squad spells out MAPLE. there are four of them. brave work.',
  'Pike Hollow leads the series 41 to 3. we do not discuss the series.',
  'senior prank was mowing a shape into the field. DALE was FURIOUS.',
], [
  'the OTTERS are 2 and 8 and now down one end zone. still 2 and 8.',
  'coach: "we play through it." the field is HALF GONE, coach. HALF.',
  'the marching band plays the one song. louder. defiantly. beautifully.',
  'MAYOR DINKLE: "school is FINE. school is a state of mind, kids."',
  'the 1978 trophy has been evacuated. by four adults. in a truck.',
  'Pike Hollow offers to host our game. suspiciously kind of them.',
  'DEB HOLLIS at the school gate: "DINKLE did this to your FIELD."',
  'TATER brought it to show and tell. it is a hit. an enormous hit.',
  'school board still arguing about the vending machine. still no vote.',
  'homecoming float finished. nowhere to parade it. parading anyway.',
], [
  'the OTTERS finish 2 and 8. no field. still 2 and 8. still OURS.',
  'coach is still drawing plays. on the ground. there is no ground.',
  'the 1978 trophy is safe. the school is not. priorities, though.',
  'the marching band plays the one song from a parking lot. ENCORE.',
  'MAYOR DINKLE: "I never attended that school." he attended that school.',
  'Pike Hollow forfeits out of pity. we do NOT accept pity, Pike Hollow.',
  'vending machine vote passes 6 to 0. there is no vending machine.',
  'TATER named it Steve. the yearbook lists Steve under FACULTY.',
  'DEB HOLLIS: "I was prom queen HERE." she was. everyone knows.',
  'the homecoming float made it out. the float is the whole town now.',
]];

// ── THE FARMS ─────────────────────────────────────────────────────────────────
// PEARL's pumpkins, a corn maze with a disputed middle, one very committed rooster
const FARM: Pools = [[
  'PEARL grows the pumpkins. PEARL judges the pumpkins. PEARL wins.',
  'the corn maze has a middle. nobody has confirmed this since 2011.',
  'a man has been in the corn maze since october. he is fine. waving.',
  'the silo is the tallest thing in the county. we mention it a lot.',
  'pumpkin patch dispute: the good pumpkins are all on ONE side.',
  'MAYOR DINKLE photographed with a cow. the cow looks unconvinced.',
  'DEB HOLLIS was raised on a farm. she mentions this hourly. hourly.',
  'the rooster crows at 4:40. the town voted on this. rooster abstained.',
  'one barn painted last year. the OTHER barn is a whole conversation.',
  'TATER named every chicken. one chicken is named MAYOR DINKLE.',
  'a tractor blocks the road for 20 minutes. nobody honks. we wait.',
  'the scarecrow has a jacket now. the scarecrow is doing very well.',
  'CARLA WEBB opens a full investigation into the pumpkin weigh-in.',
  'GUS buys his pies from PEARL. GUS also enters against PEARL. bold.',
  'a cow got out. four trucks helped. it took an hour. best hour of it.',
  'the corn maze map is upside down. it has always been upside down.',
], [
  'the corn maze got easier. that is not good news. that is the void.',
  'the man in the corn maze walked out. finally. by accident. a hero.',
  'PEARL moved every pumpkin. herself. in one night. she is PEARL.',
  'MAYOR DINKLE: "the silo is FINE." the silo is at a slight angle.',
  'cows relocated calmly. the cows have been calm this entire time.',
  'TATER walked the chickens to safety. named them all again en route.',
  'the scarecrow is facing the void now. brave. useless. still brave.',
  'DEB HOLLIS: "a real farm town would have SEEN this coming." blame: DINKLE.',
  'the rooster crowed at 4:40 anyway. the rooster has a JOB to do.',
  'the good side of the pumpkin patch went first. of course it did.',
], [
  'the silo is gone. it was the tallest thing. we will find another.',
  'the corn maze is solved. by removal. we are counting it as solved.',
  'PEARL\'s pumpkins: safe. PEARL\'s barn: gone. PEARL: unbothered.',
  'the scarecrow held the line. the scarecrow did not hold the line.',
  'every chicken accounted for. TATER counted twice. TATER is thorough.',
  'MAYOR DINKLE: "I have always supported barns." he has, actually.',
  'that cow that got out last spring was RIGHT. the cow KNEW, folks.',
  'Pike Hollow now has the tallest silo in the county. unbearable.',
  'the rooster is on a fence post crowing at nothing. total respect.',
  'the other barn never did get painted. that one stings, honestly.',
]];

// ── THE LAKESIDE ──────────────────────────────────────────────────────────────
// a record catfish from 1996, a boat ramp grudge, four boats and one canoe
const LAKE: Pools = [[
  'the lake association and the town council are not speaking. again.',
  'record catfish caught in 1996. the photo hangs in the diner. big.',
  'the boat ramp etiquette dispute enters its fourteenth summer.',
  'a man has fished this pier daily for 30 years. total catch: eleven.',
  'MAYOR DINKLE fishes for one photograph, then leaves. every year.',
  'DEB HOLLIS: "DINKLE has never caught a fish in his LIFE." true.',
  'the swim dock drifted. two families claim it. lawyers are involved.',
  'GUS says the catfish was smaller than the photo. GUS was not there.',
  'TATER caught a boot. TATER is telling absolutely everyone. a boot.',
  'no wake zone. everyone wakes. the sign is purely decorative now.',
  'CARLA WEBB writes about the lake weekly. the lake is unchanged.',
  'somebody parked a truck at the ramp in 2016. still a live grudge.',
  'the lake is twelve feet deep. locals insist it is bottomless.',
  'DALE mows down to the waterline. exactly to it. not one inch more.',
  'annual boat parade: four boats and a canoe. tremendous turnout.',
  'fishing licence renewals up. one man renewed twice. by accident.',
], [
  'the lake is smaller. the lake association blames the town council.',
  'MAYOR DINKLE: "the lake is CONCENTRATING. that is good for fish."',
  'the record catfish photo was evacuated first. before people. correct.',
  'the boat ramp is finally free. nobody wants it now. figures. figures.',
  'the man on the pier is still fishing. he has noticed. still fishing.',
  'DEB HOLLIS: "eleven years of DINKLE and now the LAKE is leaving."',
  'TATER threw the boot back in as an offering. results unclear. maybe.',
  'the disputed swim dock is gone. the dispute continues regardless.',
  'no wake zone repealed. there is no wake. there is also no water.',
  'the canoe is out. the canoe is always out. good canoe. steady canoe.',
], [
  'the lake has gone somewhere. the lake association wants answers.',
  'the pier is gone. the man is still fishing. do not disturb him.',
  'the record catfish photo is SAFE. it is in a truck. it is fine.',
  'MAYOR DINKLE: "a lake is really more of a mood." concede, sir.',
  'boat ramp dispute resolved by the void. everyone is dissatisfied.',
  'TATER says the boot is in there somewhere. TATER wants it back.',
  'Pike Hollow still has a lake. Pike Hollow will not shut up about it.',
  'the canoe made it. the canoe always makes it. classic canoe, that.',
  'DEB HOLLIS elected. first act: a strongly worded lake statement.',
  'thirty years of fishing. eleven fish. and one very good last cast.',
]];

// ── PINE WOODS ────────────────────────────────────────────────────────────────
// the campground, 40 laminated rules, and the Pine Woods Something (1981)
const WOODS: Pools = [[
  'the Pine Woods Something was sighted in 1981. we still discuss it.',
  'the campground host has laminated the rules. all forty. laminated.',
  'quiet hours begin at 9pm. enforced by one man with a flashlight.',
  'scout troop 12 earned a badge for arguing. not an official badge.',
  'one family has held site 4 every july since 1977. do not ask why.',
  'MAYOR DINKLE camps one night a year, for the photograph. one night.',
  'firewood: five dollars. next lot: four dollars. this is a WAR.',
  'DEB HOLLIS held a rally at the campground. attendance: nine and a dog.',
  'TATER is convinced the Something is friendly. TATER is usually right.',
  'the trail map has been wrong since 1990. we find it charming now.',
  'GUS: "the Something? a raccoon. a large and confident raccoon."',
  'somebody left a chair at site 9. it has been there four years.',
  'CARLA WEBB has covered the Something eleven times. no new facts.',
  'the outhouse was rated "surprisingly fine" by the county. framed.',
  'DALE brought a mower to a campground. DALE mowed a campsite.',
  'campfire ban lifted. campfire ban reinstated. it has been one day.',
], [
  'the Something has been sighted. it is purple. it is very round.',
  'the host laminates a 41st rule. rule 41 is entirely about the void.',
  'quiet hours suspended for the first time ever. reluctantly. one night.',
  'the site 4 family will not leave. it is JULY. they have HELD it.',
  'the scouts are building something. nobody knows what. scouts stay calm.',
  'MAYOR DINKLE: "the woods are simply more open plan now, folks."',
  'the firewood price war ends in a truce. mid-crisis. still a truce.',
  'TATER has befriended the Something. TATER calls the Something Steve.',
  'the trail map is now accidentally correct. nobody can explain this.',
  'the chair at site 9 has not moved. the chair is not going to move.',
], [
  'the Pine Woods Something is identified at last. it is Steve. hello.',
  'the host reads all 41 rules aloud to nobody at all. all forty-one.',
  'the site 4 family finally left site 4. only by force of nature.',
  'the chair at site 9 survived. of course it did. it is THAT chair.',
  'MAYOR DINKLE: "I have camped these woods." one night. for a photo.',
  'the scouts built a raft. the scouts were RIGHT. very good scouts.',
  'CARLA WEBB finally has her Something story. twelve tries. worth it.',
  'quiet hours permanently observed now. very quiet. too quiet, really.',
  'the trail map is wrong again. good. honestly that feels correct.',
  'somebody put the campfire ban sign on a raft. rules are rules.',
]];

// ── THE STRIP ─────────────────────────────────────────────────────────────────
// gas station, motel, drive-in, and the World's (second) Largest Ball of Twine
const STRIP: Pools = [[
  'the World\'s Largest Ball of Twine. second largest. do not say that.',
  'the twine ball gift shop sells small twine balls. made of twine.',
  'the motel sign reads VACANC. it has read VACANC since 1996.',
  'the drive-in has shown one movie for two years. it is a good movie.',
  'gas is two cents cheaper here than Pike Hollow. we mention it often.',
  'MAYOR DINKLE ran on twine ball tourism. eleven visitors last year.',
  'DEB HOLLIS: "the twine ball is a DINKLE vanity project." it is.',
  'Pike Hollow claims a bigger twine ball. Pike Hollow lies. probably.',
  'the twine ball has a live camera. two people watch it. every day.',
  'motel room 6 has the good TV. everyone asks for room 6. everyone.',
  'CARLA WEBB measured the twine ball. she will not release the number.',
  'the drive-in snack bar is staffed by a teen who never looks up.',
  'TATER visits the twine ball weekly. TATER LOVES the twine ball.',
  'gas station coffee has been in that pot since tuesday. it is loyal.',
  'GUS refuses to acknowledge the twine ball. GUS has his reasons.',
  'the motel has eleven rooms and one story about room 6. one story.',
], [
  'the twine ball has been MOVED. eleven men. one flatbed. legendary.',
  'MAYOR DINKLE guards the twine ball personally. a stance, at last.',
  'the motel sign now reads VACAN. we are losing letters AND land.',
  'the drive-in plays the movie anyway. half a screen. still good.',
  'Pike Hollow offers to hold our twine ball "for safekeeping". NO.',
  'DEB HOLLIS: "he saved the TWINE and not the SCHOOL." fair, honestly.',
  'gas now four cents cheaper than Pike Hollow. a genuine silver lining.',
  'TATER waved goodbye to the twine ball. then it came back. hero twine.',
  'the twine ball live camera has 900 viewers. finally. FINALLY.',
  'room 6 has been evacuated. the good TV went with it. of course.',
], [
  'the twine ball is safe. the town is not. the town accepts this.',
  'the motel sign reads VAC. still lit. still very lit. proud sign.',
  'the drive-in showed the movie to the end. nobody left. nobody could.',
  'MAYOR DINKLE saved the twine ball. it is on his truck. he DID that.',
  'Pike Hollow has the only twine ball now. NO. ours is on a TRUCK.',
  'the gas station sign still shows a price. loyal to the very last.',
  'CARLA WEBB releases the twine measurement. it was second. we knew.',
  'TATER is riding in the truck with the twine ball. perfect ending.',
  'DEB HOLLIS concedes the twine ball was worth saving. big of her.',
  'the good TV from room 6 is in somebody\'s back seat. it is fine.',
]];

// ── THE SUBURBS ───────────────────────────────────────────────────────────────
// DALE's lawn, seventeen yard signs, and a court case about two inches
const BURB: Pools = [[
  'DALE\'s lawn sign is two inches over the line. this went to COURT.',
  'the property line case enters year four. two inches. four years.',
  'DALE edges his lawn with an actual ruler. an actual ruler. daily.',
  'seventeen DINKLE signs on one street. one HOLLIS sign. very brave.',
  'a HOLLIS sign goes up. neighbours bring a casserole anyway. good town.',
  'sprinklers at 6am. DALE\'s go at 5:58. that is a message, folks.',
  'the mailbox at 114 leans. it has leaned six years. it is beloved.',
  'MAYOR DINKLE door-knocks. stays 40 minutes at each door. each one.',
  'a trampoline appeared overnight. the street has THOUGHTS about it.',
  'DEB HOLLIS door-knocks. leaves in two minutes. respects your time.',
  'DALE reported a neighbour for leaf placement. leaf PLACEMENT.',
  'CARLA WEBB filed 4,000 words on the property line case. two inches.',
  'TATER sells lemonade at 50 cents. undercut by another kid at 45.',
  'the cul-de-sac basketball hoop has been contested since 2019.',
  'GUS lives out here. GUS has never once mowed. DALE has NOTICED.',
  'somebody\'s bins went out on the wrong day. the street is talking.',
], [
  'DALE mows to the very edge of the void. crisp line. immaculate work.',
  'the property line case is moot. DALE wishes to continue regardless.',
  'DINKLE signs down to eleven. one blew into the void. suspicious.',
  'sprinklers still running at 6am. on a hole. on principle. on time.',
  'the leaning mailbox at 114 is still leaning. inspiring, honestly.',
  'MAYOR DINKLE knocks on a door with no house behind it. 40 minutes.',
  'the trampoline is gone. the street has quietly moved on. quietly.',
  'DALE has offered to mow the void. DALE is serious. DALE always is.',
  'DEB HOLLIS: "eleven years of DINKLE and now no CUL-DE-SAC."',
  'the bins went out on the right day for once. nobody noticed. typical.',
], [
  'DALE\'s lawn is gone. the two inches also gone. case closed. sort of.',
  'the leaning mailbox at 114 is the last thing standing. still leaning.',
  'every DINKLE sign is gone. one HOLLIS sign remains. she is WINNING.',
  'DALE is mowing a patch the size of a towel. it looks fantastic.',
  'the property line ruling came in. DALE won. DALE won by two inches.',
  'the basketball hoop dispute: unresolved. it will never be resolved.',
  'MAYOR DINKLE knocks on the last door. nobody home. he talks anyway.',
  'TATER made 40 dollars. the other kid made 45. good hustle, kid.',
  'GUS never mowed. GUS was RIGHT. DALE will never accept this. never.',
  'somebody\'s bins are still at the curb. correct day. no street left.',
]];

// ── THE COURTHOUSE ────────────────────────────────────────────────────────────
// courthouse steps, the library, one overdue book from 1974, the county clerk
const CIVIC: Pools = [[
  'the library has one overdue book. out since 1974. we know who.',
  'the courthouse steps: where every announcement in this town happens.',
  'MAYOR DINKLE announces re-election on the steps. eleventh time.',
  'DEB HOLLIS announces on the SAME steps one hour later. petty. great.',
  'the library book club has read one book. discussed it six years.',
  'the county clerk knows everything and says nothing. an absolute pro.',
  'the courthouse statue is of a man nobody can name. beloved anyway.',
  'DALE\'s two-inch case, courtroom 2, thursday. again. still. forever.',
  'library summer reading champion eleven years running: TATER, age 9.',
  'jury summons went out. eight people asked to be excused. eight.',
  'CARLA WEBB has a chair in the courthouse. it is HER chair. hers.',
  'the library computer takes twelve minutes to start. we have adapted.',
  'town records go back to 1841. someone has been arguing since 1843.',
  'MARGE brought the meter protest to the courthouse. wrong building.',
  'GUS was on a jury once. GUS talks about it constantly. constantly.',
  'the courthouse bell rings at noon. it is eleven minutes early. fine.',
], [
  'the 1974 overdue book has been returned. under THESE circumstances?!',
  'MAYOR DINKLE declares an emergency. the emergency is his poll number.',
  'the library evacuates its books. all of them. the town carried them.',
  'the courthouse steps are now the courthouse step. announcements go on.',
  'DALE\'s case moved to courtroom 1. it is a BIG case now. finally.',
  'the county clerk is still filing paperwork. calm as a summer lake.',
  'DEB HOLLIS: "DINKLE lost the LIBRARY." he did not technically lose it.',
  'MARGE relocated the meter protest. the meter came WITH her. WOW.',
  'CARLA WEBB is writing from her chair. her chair is on a lawn now.',
  'the statue of the man nobody can name has been moved to a truck.',
], [
  'the courthouse is gone. DALE\'s case will be heard. somewhere. somehow.',
  'the 1974 book is safe. the library is not. the BOOK, though: safe.',
  'the county clerk filed the last form, stamped it, and went home.',
  'MAYOR DINKLE concedes on the steps. there are no steps. he concedes.',
  'DEB HOLLIS sworn in on a folding chair. it counts. the clerk says so.',
  'the statue of the man nobody can name: rescued first. of course.',
  'MARGE and the meter, alone in a field, still protesting. an ICON.',
  'town records saved back to 1841. the 1843 argument goes on. and on.',
  'library summer reading: TATER wins again. twelve years. undefeated.',
  'the courthouse bell rang at noon. eleven minutes early. right to the end.',
]];

const BY_DIST: Record<MapleDist, Pools> = {
  mainst: MAINST, fair: FAIR, school: SCHOOL, farm: FARM, lake: LAKE,
  woods: WOODS, strip: STRIP, burb: BURB, civic: CIVIC,
};

// ── GENERAL / TOWN-WIDE ───────────────────────────────────────────────────────
// the arc in miniature: an ordinary election week → the void becomes a wedge
// issue → the town is gone and the argument about the meter is still going.
const GENERAL: Pools = [[
  'MAPLE FALLS BUGLE: circulation 40. the paper of record. THE record.',
  'MAYOR DINKLE announces a third run. slogan: "DINKLE. STILL DINKLE."',
  'DEB HOLLIS launches her campaign. platform: one item. it is DINKLE.',
  'election tuesday. turnout expected: 411. the same 411 as always.',
  'a small purple dot reported near the water tower. probably a bug.',
  'MAYOR DINKLE: "there is no hole. I would KNOW about a hole, folks."',
  'town motto: "MAPLE FALLS — WE HAVE A TWINE BALL." adopted 1974.',
  'the meter protest enters year nine. four people. rain or shine.',
  'GUS at the diner has settled the debate. GUS settles all debates.',
  'PEARL has won the pie contest eleven years. PEARL judges it. eleven.',
  'Pike Hollow got a roundabout. we will never hear the end of this.',
  'CARLA WEBB: "I will ask the hard question." she always, always does.',
  'town hall meeting ran four hours. one item passed: the minutes.',
  'DALE has been mowing since 6am. it is a wednesday. it is always 6am.',
  'TATER, 9, drew a purple circle at school. the teacher kept it. cute.',
  'weather: nice. small purple dot: also nice, apparently. so far.',
  'MAYOR DINKLE cut a ribbon on a new ribbon. he loves this. we allow it.',
  'the Maple Falls Otters lost again. the town remains fully committed.',
  'MAYOR DINKLE has kissed eleven babies today. the same three babies.',
  'DEB HOLLIS: "under DINKLE the sunsets have gotten WORSE." bold claim.',
  'debate scheduled at the diner. GUS moderates. GUS will not be fair.',
  'a casserole was delivered to the wrong house. it stayed. correct call.',
  'MARGE: "the meter is the REAL issue." nine years of saying exactly that.',
  'population 1,412. the sign says 1,408. a four-year argument, that sign.',
  'MAYOR DINKLE\'s truck has a bumper sticker of his own face. naturally.',
  'the Bugle went to two pages this week. huge news week. HUGE week.',
  'lost and found at town hall: nine hats, a trombone, a casserole dish.',
  'the water tower says MAPLE FALLS. it was repainted in 1991. it holds.',
], [
  'MAYOR DINKLE: "the hole is a DRAINAGE PROJECT. it is going great."',
  'DEB HOLLIS: "the hole is DINKLE\'s fault." polls: she is gaining.',
  'DO NOT FEED THE HOLE, says a sign. TATER has already fed the hole.',
  'town hall meeting: four hours on the hole. no vote taken. classic.',
  'CARLA WEBB asks the mayor a follow-up. the mayor goes very quiet.',
  'MAYOR DINKLE forms a committee. the committee forms a subcommittee.',
  'the Bugle goes to FOUR pages. Carla is having the week of her life.',
  'MARGE: "and ANOTHER thing about that meter." MARGE. please. MARGE.',
  'Pike Hollow offers help. we would rather be eaten. that is official.',
  'GUS closes the diner at noon. GUS reopens at 12:04. GUS is fine.',
  'PEARL is evacuating pies. calm. on schedule. she is simply PEARL.',
  'MAYOR DINKLE unveils a plan. the plan is a tarp. a very large tarp.',
  'DEB HOLLIS unveils her plan: "not be DINKLE." polls: she is gaining.',
  'DALE has mowed the same lawn three times today. a coping mechanism.',
  'emergency siren tested. it plays the school fight song. of course.',
  'MAYOR DINKLE: "we are not shrinking. we are getting COZIER, folks."',
  'TATER named it. the whole town is using the name now. it is Steve.',
  'the twine ball has been loaded onto a flatbed truck. priorities set.',
  'debate cancelled. rescheduled. cancelled. GUS is furious about this.',
  'MAYOR DINKLE: "I have consulted an expert." the expert is his cousin.',
  'the population sign reads 1,408 and is, for the first time, too high.',
  'four hour meeting on whether to hold a meeting. motion carried. barely.',
], [
  'MAYOR DINKLE: "fine. it is real. I still say it is a DRAINAGE issue."',
  'DEB HOLLIS wins in a landslide. she is now mayor of a purple circle.',
  'MAYOR DINKLE concedes. then asks about a recount. immediately after.',
  'recount demanded by DINKLE. of eleven votes. all eleven. every one.',
  'the Bugle prints a special edition. six pages. CARLA WEBB has PEAKED.',
  'GUS is still serving coffee. GUS will always be serving coffee.',
  'PEARL\'s pies are all safe. every one. she planned for this in 1998.',
  'MARGE is still protesting the meter. the meter is the last thing left.',
  'TATER says Steve is just hungry. TATER has been right this whole time.',
  'Pike Hollow sends a casserole. Pike Hollow is SMUG about the casserole.',
  'DALE is mowing a lawn the size of a doormat. it is immaculate. DALE.',
  'town hall meeting held in a field. quorum reached. four hours. no vote.',
  'the twine ball is on a truck out of town. we saved what mattered most.',
  'MAYOR DINKLE: "I blame the previous administration." it was him. him.',
  'population sign eaten. final count: everyone, in one parking lot.',
  'the emergency siren played the fight song. we all sang. WE ALL SANG.',
  'MAYOR DINKLE cuts a ribbon on nothing at all. the man is UNBREAKABLE.',
  'CARLA WEBB: "one more question, mayor." she gets the last question.',
  'DEB HOLLIS\'s first act as mayor: blaming DINKLE. beautiful. correct.',
  'the town is gone. the argument about the meter continues. it continues.',
  'MAPLE FALLS BUGLE: circulation 41. new subscriber. purple. hungry.',
  'the water tower is the last word standing. it says MAPLE FALLS. good.',
]];

// ── LIVE / TEMPLATED ──────────────────────────────────────────────────────────
//  {F} form   {M} last meal   {P} pct   {R} 100-pct   {S} seconds
//  {D} district name   {L} rival name   {G} rival lead (only when rival ahead)
const LIVE: Pools = [[
  'MAYOR DINKLE: "there is no {F} in {D}." there is a {F} in {D}.',
  'a {F} sighted in {D}. residents wave. residents always wave.',
  'it ate {M}. MAYOR DINKLE is calling this "a scheduling matter".',
  'DEB HOLLIS: "{M}? gone. under DINKLE." polls: she is gaining.',
  'CARLA WEBB: "mayor, about the {F} in {D}?" he is walking away.',
  'TATER fed the {F}. TATER reports it prefers {M}. good data, TATER.',
  'poll: is the purple thing getting bigger? {P}% say yes. {R}% say no.',
  'GUS on the {F}: "you want my opinion? it needs a haircut."',
  '{L} spotted eating too. the town assumes they are cousins.',
  'MAYOR DINKLE cuts a ribbon in {D}. a {F} cuts {D}. no ribbon.',
  'PEARL asks if the {F} is eligible for the pie contest. denied.',
  'a {F} in {D}. town hall schedules four hours of meeting about it.',
  'Bugle front page: "{M} — GONE?" the question mark works hard.',
  'DALE offers to mow around the {F}. DALE is not joking. never is.',
  'MARGE: "a {F}? fine. now can we discuss the METER." year nine.',
  'MAYOR DINKLE: "I have never seen a {F}." he is looking at one.',
  'it ate {M}. nobody saw a thing. everybody saw it. EVERYBODY.',
  'a {F} in {D} and Pike Hollow has heard already. of course they have.',
], [
  'MAYOR DINKLE: "a SMALL {F}." it is {P}% of the town. small-ish.',
  '{D} is evacuating. politely. with casseroles. in one orderly line.',
  'it ate {M}. that was somebody\'s {M}! there will be a MEETING.',
  '{P}% of Maple Falls gone. MAYOR DINKLE: "that is a rounding error."',
  'DEB HOLLIS: "{P}% gone under DINKLE." she is up nine points. NINE.',
  'do NOT go to {D}. that is exactly where the {F} is. exactly there.',
  'TATER named the {F}. everyone is using the name now. it is Steve.',
  '{L} is ahead by {G}. the town rallies behind a purple hole. ours.',
  'CARLA WEBB in {D}: "how do you feel?" they feel terrible, Carla.',
  'a {F} ate {M}. GUS: "I said this would happen." GUS said no such thing.',
  'MAYOR DINKLE renames the {F} "the Maple Falls Basin". nice try, sir.',
  'PEARL has moved the pies out of {D}. THAT is what leadership is.',
  '{P}% devoured. the other {R}% is at a town hall meeting about it.',
  'Pike Hollow asks how {D} is going. Pike Hollow KNOWS how {D} is going.',
  'DALE mowed the edge of the {F} in {D}. the line is CRISP.',
  'MAYOR DINKLE: "{P}% is a very DINKLE-friendly number." it is not.',
  'MARGE has moved the protest to {D}. the meter came too. incredible.',
], [
  '{D} IS GONE. a four hour meeting is scheduled about it. of course.',
  '{P}% DEVOURED. the other {R}% has already formed a committee.',
  'the {F} ate {M}. MAYOR DINKLE blames the previous mayor. it was him.',
  '{S} SECONDS LEFT. everyone to the parking lot! bring the casseroles!',
  'DEB HOLLIS: "{P}% gone!" she wins. mayor of {P}% of nothing at all.',
  'a {F} now holds {P}% of Maple Falls. it did not file any paperwork.',
  '{S} SECONDS LEFT and MARGE is STILL protesting that parking meter.',
  'the {F} ate {M}. TATER said it was hungry. TATER was right all along.',
  '{L} leads by {G}. we are rooting for nobody now. absolutely nobody.',
  'CARLA WEBB got a quote from a {F}. it said nothing. she printed it.',
  'MAYOR DINKLE concedes {D}. keeps the ribbon scissors. keeps them.',
  '{S} SECONDS LEFT. GUS is still open. GUS is ALWAYS still open.',
  'PEARL saved the pies. the {F} got {M}. we call that a fair trade.',
  '{P}% gone. that is {R}% of a town still arguing about a meter.',
  'the {F} ate {M}. Pike Hollow sent a casserole. INSULTING. we ate it.',
  'DALE mowed the last lawn in {D}. crisp to the very end, that man.',
  '{S} SECONDS LEFT! the twine ball is ON THE TRUCK! GO! GO! GO!',
  'the {F} ate {M} and {D}. the recount will proceed regardless.',
]];

// ══ WHO IS TALKING ═══════════════════════════════════════════════════════════
// Speech bubbles over people's heads. A line should sound like the PERSON, not
// the zip code. Warm, silly, small-town. Kept SHORT — a phone bubble truncates
// fast: aim under ~34 characters, hard cap 46.
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
    'my dad coaches. it is a lot.', 'Pike Hollow is worse. barely.', 'I am in the band. one song.',
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
    'we got a fair. a WHOLE fair.', 'Pike Hollow wishes. they WISH.', 'population 1,412. and growing.',
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
    'the TWINE BALL!! save it!!', 'we will REBUILD! BIGGER!!', 'Pike Hollow cannot know!!',
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

/** clears the anti-repeat memory — call between matches if you like. */
export function resetMapleNews(): void {
  history.length = 0; rawHistory.length = 0;
}

interface Filled { pct: number; rest: number; form: string; meal: string; dist: string; rival: string; lead: number; secs: number }

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
  return {
    pct,
    rest: 100 - pct,
    form: clip(ctx.form || 'VOIDLING', 14),
    meal: clip(ctx.lastMeal || 'a mailbox', 22),
    dist: ctx.district ? DIST_NAME[ctx.district] : 'MAPLE FALLS',
    rival: ctx.rivalName || 'the other one',
    lead: Math.max(1, Math.round(Math.abs(ctx.rivalLead || 0))),
    secs: Math.max(1, Math.ceil(ctx.secondsLeft || 0)),
  };
}

function fill(t: string, b: Filled): string {
  return t
    .replace(/\{D\}/g, b.dist)
    .replace(/\{M\}/g, b.meal)
    .replace(/\{F\}/g, b.form)
    .replace(/\{L\}/g, b.rival)
    .replace(/\{P\}/g, String(b.pct))
    .replace(/\{R\}/g, String(b.rest))
    .replace(/\{G\}/g, String(b.lead))
    .replace(/\{S\}/g, String(b.secs));
}

/** a countdown line at 2:40 remaining is a weather report, not a panic. */
function usable(t: string, ctx: MapleCtx): boolean {
  if (t.includes('{S}') && ctx.secondsLeft > 70) return false;
  // "{L} leads by {G}" must not fire while the player is comfortably ahead
  if (t.includes('{G}') && ctx.rivalLead <= 0) return false;
  return true;
}

const clampTier = (t: number): NewsTier => (t <= 0 ? 0 : t >= 2 ? 2 : 1);

/**
 * One fully-formed headline, ready to drop straight into the ticker.
 * Weighted ~45% district / ~35% live-templated / ~20% general when we know
 * where the player is; live-heavy when we don't.
 */
export function pickMapleNews(ctx: MapleCtx, rnd: () => number = Math.random): string {
  const tier = clampTier(ctx.tier);
  const b = bind(ctx);

  const districtPool = ctx.district ? BY_DIST[ctx.district][tier].filter((t) => usable(t, ctx)) : [];
  const livePool = LIVE[tier].filter((t) => usable(t, ctx));
  const generalPool = GENERAL[tier].filter((t) => usable(t, ctx));

  const chooseRaw = (): string => {
    const r = rnd();
    // district 45% / live 35% / general 20% — with graceful fallbacks so an
    // empty bucket never returns undefined into the ticker
    let order: string[][];
    if (districtPool.length) {
      order = r < 0.45 ? [districtPool, livePool, generalPool]
        : r < 0.80 ? [livePool, generalPool, districtPool]
          : [generalPool, districtPool, livePool];
    } else {
      order = r < 0.62 ? [livePool, generalPool] : [generalPool, livePool];
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
  const all: Pools[] = [MAINST, FAIR, SCHOOL, FARM, LAKE, WOODS, STRIP, BURB, CIVIC, GENERAL, LIVE];
  return all.reduce((n, p) => n + p[0].length + p[1].length + p[2].length, 0);
}

/** total distinct spoken lines across every voice pool. */
export function mapleVoiceLineCount(): number {
  const sum = (r: Record<string, string[]>): number =>
    Object.values(r).reduce((n, v) => n + v.length, 0);
  return sum(MAPLE_VOICE_AMBIENT) + sum(MAPLE_VOICE_PANIC);
}
