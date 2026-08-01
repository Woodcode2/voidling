// ══════════════════════════════════════════════════════════════════════════════
//  NEWSROOM — GAME DAY, live from the booth above Marston
// ══════════════════════════════════════════════════════════════════════════════
//
//  ┌──────────────────────────────────────────────────────────────────────────┐
//  │  HOUSE STYLE — READ THIS BEFORE YOU TOUCH A LINE.                        │
//  │  The old rule said "the body is LOWER CASE, always, including the first  │
//  │  word". That rule is DEAD. It made the ticker read like a broken robot   │
//  │  and it is the reason the newsfeed was rejected twice. Identical to the  │
//  │  PIRATE BAY and MAPLE FALLS newsrooms — three worlds, one voice.         │
//  ├──────────────────────────────────────────────────────────────────────────┤
//  │  1. WRITE PROPER ENGLISH SENTENCES. Capital letter at the start. Full    │
//  │     stop at the end. Proper nouns capitalised normally — Hank Prewitt,   │
//  │     Bill Ordway, Buckley, Marston, Frat Row. NOT in caps.                │
//  │  2. CAPS IS THE JOKE OR THE PANIC, and nothing else. At most TWO         │
//  │     shouted words in a line, and most lines have none. {TOKENS} do not   │
//  │     count — the game supplies those in caps.                             │
//  │  3. ONE JOKE PER LINE, and it must land for a SIX-YEAR-OLD. Specific     │
//  │     beats generic every time: "Bill has stopped taking notes." is worth  │
//  │     ten of "things are getting crazy". Concrete nouns, ordinary people   │
//  │     doing their job impeccably at the wrong moment.                      │
//  │  4. PUNCTUATION ESCALATES WITH THE BEAT. This is how the arc is felt.    │
//  │        BEAT 1 sign-on  — exactly ONE "!", and it lands on the greeting.  │
//  │        BEAT 2 pre-game — ZERO "!". The booth is completely relaxed.      │
//  │        BEAT 3 wrong    — at most ONE "!". Professionalism under strain.  │
//  │        BEAT 4 collapse — at most ONE "!!" and never a lone "!".          │
//  │        BEAT 4 sign-off — back to at most ONE "!". A calm goodbye.        │
//  │     One "?" per line, max. No "?!", no ellipsis, no em dashes.           │
//  │  5. NO RUNNING GAG OWNS THE FEED. No member of the cast and no bit may   │
//  │     appear in more than ~8% of lines. Hank and Bill are the frame, not   │
//  │     the content. If a line only needs an official, use the stadium, the  │
//  │     PA, a steward or the chain crew instead.                             │
//  └──────────────────────────────────────────────────────────────────────────┘
//
//  THE CONCEIT. This world's newsroom is LIVE COMMENTARY. Two announcers in a
//  booth are calling a football game while the ground underneath it is eaten.
//  They are professionals. They never stop calling it. That is the joke, and it
//  has to get funnier as it gets worse and never once meaner.
//
//  THE ARC, in four beats:
//
//  BEAT 1  SIGN-ON   fires FIRST, every match, guaranteed, and ALWAYS opens
//                    "Good afternoon from Marston!" then a real pre-game item.
//                    Nothing about the void. Nobody has seen it yet.
//  BEAT 2  PRE-GAME  tier 0. Cheerful and discursive — the weather, the
//                    attendance, somebody's casserole — sliding at the end into
//                    a thing in the north lot that is not on the depth chart.
//  BEAT 3  WRONG     tier 1. They start describing the void AS IF IT WERE A
//                    PLAY. Big gain on first down. Flag on the play. Bill goes
//                    to the rulebook. The rulebook does not cover it.
//  BEAT 4  COLLAPSE  tier 2. Total. And they keep calling it, from a press box
//                    with nothing under it, until Deb counts them out.
//
//  THE TWO TEAMS ARE DECORATION. Crimson and gold at home, teal visiting, and
//  it must NEVER read as a contest with sides — see the county-fair note in
//  mainstreet.ts and section 3 of docs/GAMEDAY.md. So: no score, ever. No
//  winning, no losing, no beating anybody. When both teams appear in a line
//  they are doing the same thing together — stacking chairs, carrying the water
//  carts out, sitting on the same hillside. The crowd is one town.
//
//  THE RULE ABOUT THE VOID. The broadcast covers ONE thing: a void is eating
//  Marston. Nobody in this booth has any way of knowing that some *other* void
//  somewhere has a name, a family or a scoreboard, so it never goes on air. If
//  a line needs a second void it says "another one", "a second one", "that
//  makes two of them" — never a name. Enforced in code: `bind()` reads no rival
//  field, `fill()` knows no rival token, and `usable()` refuses point blank to
//  air any template containing a token outside {D}{M}{F}{P}{R}{S}.
//
//  RATED 4+. Nobody is hurt and nobody is frightened unkindly — the crowd is
//  relocated to the void and ends up on a hillside together with a casserole.
//  No politics, no alcohol (this tailgate runs on sausages, waffles and
//  lemonade), nothing mean about how anybody looks, nothing a child would
//  repeat at school and get in trouble for.
//
//  Recurring cast (reuse IS the joke — do not add one-off names):
//    Hank Prewitt      play-by-play. Thirty one seasons in this booth. Calls it.
//    Bill Ordway       colour. The rulebook, and a notebook. Later: no notes.
//    Deb               in the truck. We are staying with it. There is no break.
//    Marla Beam        sideline. Forever about to get a word with somebody.
//    Coach Duffy       chewing the same piece of gum since the coin toss.
//    Buckley           the mascot. A very large squirrel. Never breaks character.
//    Doreen's casserole passed hand to hand all afternoon. Survives everything.
//    Ernie at grill nine has not left the grill since Thursday.
//    Dwight            our aerial coverage. Dwight is a man on a ladder.
//    the chain crew    measure everything, to the inch, whatever is happening.
//    the blue sedan    the PA has been asking about it in row B all day.
//    the band          one drum cadence, played straight through anything.
//
//  Lines render in a one-line phone ticker — aim under ~64 chars, hard cap 78
//  AT WORST-CASE TOKEN FILL (a 14-char form plus a 22-char meal).
// ══════════════════════════════════════════════════════════════════════════════

export type NewsTier = 0 | 1 | 2;
/** District ids are gameday.ts's GdBiome, verbatim. Do not diverge from them. */
export type GdDist =
  | 'bowl' | 'plaza' | 'lot' | 'rvpark' | 'greek' | 'campus' | 'practice' | 'woods';

export interface GamedayCtx {
  tier: NewsTier;
  district: GdDist | null;   // where the player currently is (null if unknown)
  lastMeal: string;          // e.g. "a pickup truck", "a whole HOUSE"
  devouredPct: number;       // 0..100
  form: string;              // e.g. 'VOIDLING' | 'GOBBLER' | 'DEVOURER'
  secondsLeft: number;
  // ── ACCEPTED AND DELIBERATELY IGNORED ──────────────────────────────────────
  // The call site still hands us the rival scoreboard. The booth has no use for
  // it: two announcers calling a football game cannot know that some other void
  // is called anything, so it never goes on air. These two stay declared purely
  // so the existing call site type-checks. `bind()` does not read them. Do not
  // start reading them.
  rivalName?: string;
  rivalLead?: number;
}

/** Per-tier ticker brand. The booth does not leave, it just changes badge. */
export const GAMEDAY_BRAND: [string, string, string] = [
  '🏈 GAME DAY LIVE',
  '⚠️ BOOTH ALERT',
  '🚨 STILL ON AIR',
];

// ── BEAT 1 · SIGN-ON ──────────────────────────────────────────────────────────
// ALWAYS begins "Good afternoon from Marston!" and then a real pre-game item —
// as far as this booth is concerned the void has not happened yet. This fires
// FIRST, guaranteed, before any other headline (see `signedOn`).
// No {templates} — the sign-on must never depend on match state.
// Punctuation: exactly one "!", on the greeting. That is the whole allowance.
const SIGN_ON: string[] = [
  'Good afternoon from Marston! Sixty two degrees and not one cloud.',
  'Good afternoon from Marston! Hank Prewitt here, alongside Bill Ordway.',
  'Good afternoon from Marston! The tarp is off and the field is perfect.',
  'Good afternoon from Marston! Doreen has sent a casserole to the booth.',
  'Good afternoon from Marston! The lot has been full since half past five.',
  'Good afternoon from Marston! Bill has a new notebook and he is thrilled.',
  'Good afternoon from Marston! The band is under the stand. Feel that.',
  'Good afternoon from Marston! Buckley has shaken nine hundred hands.',
  'Good afternoon from Marston! Deb is in the truck and we are on time.',
  'Good afternoon from Marston! Dwight is on the ladder. We have no blimp.',
  'Good afternoon from Marston! The grounds crew have outdone themselves.',
  'Good afternoon from Marston! Ernie has been at grill nine since Thursday.',
];

/** Ticker-friendly district names, used to fill {D}. Longest is 18 chars. */
const DIST_NAME: Record<GdDist, string> = {
  bowl: 'the stadium',
  plaza: 'the gate plaza',
  lot: 'the tailgate',
  rvpark: 'RV Row',
  greek: 'Frat Row',
  campus: 'Old Campus',
  practice: 'the practice field',
  woods: 'the tree line',
};

type Pools = [string[], string[], string[]];

// ── THE STADIUM ───────────────────────────────────────────────────────────────
// the bowl, the press box, the clock nobody stops, the chain crew, Dwight's ladder
const BOWL: Pools = [[
  'The bowl seats forty thousand. Today it is holding rather more.',
  'The tarp came off the field, folded by eleven men, in one minute flat.',
  'Hank Prewitt has called thirty one seasons from this booth. Same chair.',
  'Bill Ordway has the rulebook open at the front, as he always does.',
  'The chain crew have measured the same yard twice. To the inch. Twice.',
  'Dwight is our aerial coverage. Dwight is a man standing on a ladder.',
  'The band is somewhere under the north stand and can be heard everywhere.',
  'A groundsman is painting the numbers. He has painted them since 1994.',
  'The press box coffee is the worst in the state and Hank drinks four.',
  'The goalposts were repainted on Thursday and they look tremendous.',
  'Buckley has done a full lap of the bowl and shaken every hand in it.',
  'The stadium clock has been running since ten o\'clock this morning.',
], [
  'Hank has the call. The ball is snapped. The ground is not where it was.',
  'Bill is checking the rulebook. Bill is checking it very thoroughly.',
  'Bill has now read the rulebook twice. There is nothing in it, folks.',
  'The chain crew measured it. It is short of the marker by a full yard.',
  'The tarp has gone back on the field, over the part that is missing.',
  'Dwight has the best view in the county and would like to come down.',
  'The stadium clock is still running. Nobody has asked it to stop.',
  'The fifty yard line is now the forty eight. Bill has done the maths.',
  'Deb has cancelled the break. There is no break. We stay with it!',
  'The end zone has gone. That paint was still tacky. What a shame.',
], [
  'The bowl has GONE!! Hank is calling it from the press box regardless.',
  'The press box is the last standing thing in Marston. Naturally it is.',
  'Bill has closed the rulebook and put it in his bag. That is that, then.',
  'The chain crew measured one final time. Short. Short to the inch.',
  'The goalposts went in last, upright and painted and looking tremendous.',
  'Dwight is off the ladder. Dwight took the ladder with him. Good lad.',
  'The stadium clock stopped. Everyone in this booth looked at each other.',
  'Buckley is on the last yard of turf, waving. Never broke character.',
  'Deb says we stay with it. We are staying with it to the very end.',
]];

// ── GATE PLAZA ────────────────────────────────────────────────────────────────
// ticket gates, will-call, the merch trolley, an inflatable helmet tunnel
const PLAZA: Pools = [[
  'Gate C has the short queue. Gate C always has the short queue.',
  'The inflatable helmet tunnel is up. It took nine adults and a pump.',
  'The merch stand has sold out of the gold scarf and nothing else at all.',
  'Will-call has one envelope left and it belongs to somebody called Ray.',
  'A steward is explaining the bag rules for the four hundredth time.',
  'The programme costs three dollars and the man will not break a twenty.',
  'A family is having a photograph taken under the inflatable helmet.',
  'The ticket scanner beeps twice for gold seats. Nobody knows why.',
  'Marla Beam is at the gates asking people how they feel about today.',
  'A child has been given a foam finger the size of the actual child.',
  'The programme has Buckley on the cover, mid wave, and out of focus.',
], [
  'The helmet tunnel deflated and is being reinflated by nine adults.',
  'Gate C has the short queue for a reason. The reason is now visible.',
  'The stewards are moving everybody the other way, calmly, in one line.',
  'Will-call is closed. Ray never came. We hope Ray is having a nice day.',
  'The merch stand is selling off a trolley and doing record business.',
  'A steward is explaining that the bag rules still apply. Good man!',
  'Marla Beam had the gates. Marla Beam no longer has the gates.',
  'The ticket scanner beeped twice at the void. Gold seats, apparently.',
  'The foam finger is pointing somewhere else now. Sensible finger.',
  'The turnstiles are counting people out and calling it the attendance.',
], [
  'The gate plaza has GONE!! Bag rules still apply, says a steward.',
  'The helmet tunnel is airborne and heading for the overflow lot. Bye.',
  'The merch trolley made it out, and every gold scarf went with it.',
  'A steward is directing traffic in a field. Beautifully. Two hands.',
  'The turnstile counted one last person. It counted Buckley twice.',
  'Will-call has gone. Ray, if you are listening, you had the good seats.',
  'Marla Beam is interviewing a man who is carrying a folding chair.',
  'The programmes blew everywhere. Buckley is on every lawn in Marston.',
  'Somebody is still queuing at gate C. The queue is a habit by now.',
]];

// ── THE TAILGATE ──────────────────────────────────────────────────────────────
// THE HERO DISTRICT. Nose to tail pickups, canopies, grills, cornhole, a sofa
const LOT: Pools = [[
  'Ernie has been at grill nine since Thursday. He has not left it once.',
  'Row F is nose to tail and every single tailgate on it is down.',
  'A television is on the back of a pickup, running off a generator.',
  'Doreen has brought a casserole and it is going round the entire lot.',
  'The cornhole board in row D has had a queue on it since ten this morning.',
  'A man has a smoker the size of a small horse and will explain all of it.',
  'Somebody has parked a sofa. Not in a truck. Just a sofa, parked, alone.',
  'The lot opened at six. There were forty cars waiting at half past five.',
  'A blue sedan is blocking row B and the plates have been read out twice.',
  'Grill nine is doing sausages. Grill ten is doing sausages competitively.',
  'Every canopy in row H is crimson. Every single one. It looks superb.',
  'A dog in a gold bandana is working this car park like a politician.',
  'The horseshoe pit was marked out with two cones and a great deal of faith.',
], [
  'Row B has gone and the blue sedan is still blocking what is left of it.',
  'Ernie has moved grill nine twice and has not stopped cooking once.',
  'The casserole is on the move. Doreen is directing it by hand signal.',
  'The cornhole boards have been folded up and carried out. Both of them.',
  'The television on the pickup is showing us. We can see ourselves. Odd.',
  'A man is loading his smoker with four friends, a plank and no panic.',
  'The parked sofa has been claimed by three different families. Ongoing.',
  'Rows F through H are being asked to move up. They are all moving up.',
  'The dog in the gold bandana has left for the tree line. Wise dog.',
  'Ernie says the sausages are nearly done. Ernie is not moving until then!',
], [
  'The tailgate has GONE!! Ernie is cooking off the tailgate of a truck.',
  'The casserole survived. Doreen never doubted it for a single second.',
  'The blue sedan is no longer a parking problem. It is not a car either.',
  'One canopy is still standing in row H. Crimson, guyed down, defiant.',
  'The smoker got out on a trailer, still smoking, still being explained.',
  'The sofa is in a field with four people on it, watching the sky. Lovely.',
  'The generator is running and the television is showing a lot of static.',
  'The two cones from the horseshoe pit are the last things in this lot.',
  'Ernie handed out the last sausage and then packed up. A total pro.',
]];

// ── RV ROW ────────────────────────────────────────────────────────────────────
// motorhomes, awnings, satellite dishes, deck chairs, one hot tub, one cat
const RVPARK: Pools = [[
  'RV Row has been here since Wednesday. They do this eight times a year.',
  'There is a hot tub on RV Row. It has been there since Thursday morning.',
  'A satellite dish the size of a table is pointed at a very distant sky.',
  'Site fourteen has an outdoor rug, two lamps and a low coffee table.',
  'The awning at site nine has fairy lights and a small picket fence.',
  'A man is polishing an already clean motorhome, slowly, with real love.',
  'Site two flies crimson, gold and a windsock in the shape of a fish.',
  'Deck chairs on RV Row face the stadium. Every chair. Every single one.',
  'Somebody is running a waffle iron off a generator and sharing freely.',
  'The people at site twenty two have fitted a doorbell to a motorhome.',
  'A cat is asleep on a motorhome roof and will not be moved by anybody.',
], [
  'RV Row is packing up in perfect order, in the order that they arrived.',
  'The hot tub has been drained onto the grass. It took eleven minutes.',
  'The satellite dish is down and in the boot. The man is not happy.',
  'Site fourteen has rolled up the outdoor rug and taken both lamps.',
  'The fairy lights at site nine are still on. Still lovely, honestly.',
  'The man polishing the motorhome finished polishing it, then he left.',
  'The windsock shaped like a fish is pointing straight at the void.',
  'Every deck chair on RV Row is folded and stowed. Not one left behind.',
  'The waffle iron is still going, on a generator, on the move. Superb!',
  'The cat is off the roof. The cat left before anybody else did.',
], [
  'RV Row has GONE!! Every motorhome got out. Every last one of them.',
  'The hot tub is in a field with two people sat in it and no water.',
  'The doorbell from site twenty two rang once on the way past. Lovely.',
  'The fairy lights are strung between two trucks in the overflow now.',
  'Site two got the flagpole out. Crimson, gold and the fish. All of it.',
  'The last motorhome pulled away at walking pace, indicating properly.',
  'The waffle iron made it. The generator made it. The waffles made it.',
  'The cat is watching all of this from a fence post, entirely unbothered.',
  'One deck chair is left facing the stadium, and the stadium has gone.',
]];

// ── FRAT ROW ──────────────────────────────────────────────────────────────────
// porches, sofas on lawns, banners between columns, a trumpet, a lemonade stand
const GREEK: Pools = [[
  'There is a sofa on every lawn on Frat Row and it is a proud tradition.',
  'A banner between two columns reads: welcome back. Freshly painted, too.',
  'Somebody is playing the fight song on a trumpet from an upstairs window.',
  'The porch at number twelve has forty people on it and it is holding.',
  'A lemonade stand on the corner is run by two students and a small child.',
  'The house at number six has repainted its columns crimson. All six.',
  'A group photograph on the steps is taking a very long time to arrange.',
  'Somebody built a ramp out of plywood and is being asked not to use it.',
  'The porch swing at number nine has held four people since breakfast.',
  'A speaker on a windowsill has played the same nine songs all morning.',
  'Every porch on this street faces the stadium. Every single porch.',
], [
  'The sofas are being carried off Frat Row by four students apiece.',
  'The banner between the columns has been rescued. The columns have not.',
  'The trumpet is still going from the upstairs window. Good trumpet!',
  'Number twelve has cleared its porch. Forty people. Ninety seconds.',
  'The lemonade stand has relocated twice and is still open for business.',
  'The group photograph was taken at last, at a run, and it is a good one.',
  'The plywood ramp is being used as a bridge. Nobody is asking about it.',
  'The porch swing came off its chains and left on somebody\'s shoulder.',
  'The speaker on the windowsill is on song four of nine, undeterred.',
  'Number six repainted those six columns on Thursday. On Thursday.',
], [
  'Frat Row has GONE!! Six crimson columns are lying in the overflow lot.',
  'Every sofa got out. Every single sofa. The students carried all of them.',
  'The trumpet is playing from the back of a truck. Same song. Louder.',
  'The lemonade stand is the last business trading in Marston. Fifty cents.',
  'The banner is up between two lamp posts. It still says welcome back.',
  'The porch swing is hanging from a tree at the tree line and it is in use.',
  'The speaker got to song seven and then somebody unplugged it. Rude.',
  'The group photograph is being taken again, with everybody, in a field.',
  'That plywood ramp is a bridge now, and a very good bridge at that.',
]];

// ── OLD CAMPUS ────────────────────────────────────────────────────────────────
// brick halls, a clock tower four minutes fast, a statue, bold squirrels
const CAMPUS: Pools = [[
  'The clock tower has been four minutes fast since 1962. It stays that way.',
  'The quad has been mown into stripes for the alumni and it looks superb.',
  'The statue on the quad is of a man nobody under sixty can name.',
  'The library is open. There are two people in it. Both are asleep.',
  'A campus tour is going round backwards, as campus tours always do.',
  'The squirrels on this quad are famously bold and famously well fed.',
  'Somebody has put a gold scarf on the statue. This happens every year.',
  'The bell in the tower is rung by hand by a man named on a brass plate.',
  'Two men on a scaffold are pointing the brickwork on the old hall.',
  'A wedding party is having photographs taken by the arch. Congratulations.',
  'The grounds crew edged the quad path with a spade and a string line.',
], [
  'The clock tower is four minutes fast and still chiming. Bless the thing.',
  'The statue has been taken down and put in a van. Gold scarf and all.',
  'The library has evacuated two sleeping people and eleven thousand books.',
  'The campus tour is going round backwards at considerable speed now.',
  'The squirrels left first. The squirrels on this quad always leave first.',
  'Half the quad has gone and the stripes on the other half are perfect.',
  'The two men on the scaffold came down, and took the scaffold with them.',
  'The wedding party got their photographs. Every single one of them!',
  'The bell is being rung by hand, without pause, by the man on the plate.',
  'The arch is standing. There is nothing on either side of the arch.',
], [
  'Old Campus has GONE!! The clock tower chimed on the way, four minutes fast.',
  'The statue is safe in a van. Nobody can name him. Everybody saved him.',
  'Eleven thousand books are in the overflow lot under one large tarpaulin.',
  'The arch is the last thing on the quad. Just the arch, standing alone.',
  'The squirrels are in the tree line watching, with their cheeks full.',
  'The man on the brass plate rang that bell until there was no more bell.',
  'The campus tour finished. The guide thanked everybody for coming along.',
  'The grounds crew edged one last path to nowhere and it was immaculate.',
  'The wedding photographs came out lovely. We have seen them. Lovely.',
]];

// ── THE PRACTICE FIELD ────────────────────────────────────────────────────────
// goalposts, a blocking sled called Gerald, water carts, a stack of bleachers
const PRACTICE: Pools = [[
  'The practice field has two goalposts, one sled and a lot of fresh chalk.',
  'Coach Duffy is out here chewing the same gum he had an hour ago.',
  'The blocking sled has a name painted on the side. The name is Gerald.',
  'The water carts are full and nobody has touched them since ten o\'clock.',
  'The bleacher stack seats ninety and is currently holding about two hundred.',
  'Somebody is throwing a ball to nobody at all, over and over, happily.',
  'The sprinklers came on at eleven, as they do, on absolutely everybody.',
  'A children\'s game has broken out at the far end with forty a side.',
  'The chalk lines went down this morning and they are beautifully straight.',
  'Two dogs have found the practice field and are having the day of their lives.',
  'The spare goalposts are stored behind the sled and nobody knows why.',
], [
  'Gerald the sled has been towed to safety by a man in a golf cart.',
  'Coach Duffy was asked for a comment. Coach Duffy is still chewing.',
  'The water carts have been emptied and rolled off. Both of them. Quickly.',
  'The bleacher stack has been folded down and taken away on a flatbed.',
  'The children\'s game has moved twice and neither side will admit to a score.',
  'The sprinklers came on again, on schedule, onto the void. No comment.',
  'The chalk lines are still perfectly straight and now go nowhere at all.',
  'The man throwing to nobody has moved back and is still throwing. Bravo!',
  'The spare goalposts are on the truck. Somebody finally knew why.',
  'Both benches carried the same kit out together. Everybody helped.',
], [
  'The practice field has GONE!! Gerald the sled is safe on a flatbed.',
  'Coach Duffy commented at last. He said: well. That was the comment.',
  'The chalk machine got out. Somebody is drawing a line in the overflow lot.',
  'The two dogs are fine. The two dogs are considerably more than fine.',
  'Both benches are stacking chairs together in a field. All of the chairs.',
  'The man is still throwing to nobody, and nobody is still catching it.',
  'The sprinklers came on one final time, at four, onto nothing whatsoever.',
  'The children\'s game is going on in the overflow lot. Still no score.',
  'The spare goalposts are the last goalposts in Marston. Upright. Proud.',
]];

// ── THE TREE LINE ─────────────────────────────────────────────────────────────
// autumn woodland at the rim, overflow parking on the grass, a deer, a bucket
const WOODS: Pools = [[
  'The tree line is amber and crimson and it did not have to try very hard.',
  'Overflow parking is on the grass at the tree line and it is filling up.',
  'A man is directing cars with two paddles and enormous authority.',
  'The leaves came down last week. Nobody has swept, and nobody minds.',
  'A deer at the edge of the woods is watching about nine thousand people.',
  'The nature trail has a laminated map at the trailhead. It is upside down.',
  'Somebody has hung a crimson banner between two maples. It looks lovely.',
  'The woods are the quietest place in Marston and nobody at all is in them.',
  'A family has walked out here with a flask to get away from the noise.',
  'You can hear the band from the tree line. You can hear it from anywhere.',
  'A man with a bucket is collecting for the band at the overflow gate.',
], [
  'The overflow lot is filling from the far end now, which is unusual.',
  'The man with the paddles is directing traffic out. The same authority.',
  'The deer has gone. The deer went early and the deer was entirely right.',
  'The laminated trail map is still upside down and still at the trailhead.',
  'The crimson banner between the maples has one maple left holding it.',
  'The family with the flask have finished the flask and are walking back.',
  'The leaves are all going one way now. Every leaf. Straight past us.',
  'The band can still be heard from the tree line. Louder, if anything!',
  'The man with the bucket is still collecting for the band. Good man.',
  'The tree line is thinning, and the trees are going in order, front first.',
], [
  'The tree line has GONE!! Every car in the overflow lot got out first.',
  'The man with the paddles directed the last car out, and then he walked.',
  'The crimson banner is in somebody\'s back seat, folded neatly. Saved.',
  'The deer is on a hill a mile off, watching, with the whole herd now.',
  'The bucket for the band came out full. Forty dollars and one button.',
  'The laminated map went last. Upside down. It never did get turned.',
  'The family with the flask are in the car with the heater on. Sensible.',
  'The last leaf came off the last maple and everybody watched it go.',
  'You can still hear the band. From here. From anywhere. Still playing.',
]];

const BY_DIST: Record<GdDist, Pools> = {
  bowl: BOWL, plaza: PLAZA, lot: LOT, rvpark: RVPARK,
  greek: GREEK, campus: CAMPUS, practice: PRACTICE, woods: WOODS,
};

// ── GENERAL / THE BOOTH ───────────────────────────────────────────────────────
// The arc in miniature. Tier 0 is pre-game chatter — the weather, the coin, the
// casserole — and only at the end does something appear in the north lot that
// nobody will name. Tier 1 is the booth calling the void as a football play.
// Tier 2 is everything gone and two men still describing it accurately.
const GENERAL: Pools = [[
  // ── pre-game. Cheerful, discursive, and completely unaware. ──
  'Good conditions in Marston today. Sixty two degrees and no wind at all.',
  'Hank Prewitt, thirty one seasons in this booth, alongside Bill Ordway.',
  'Bill has the notebook out. Bill takes notes on everything. Everything.',
  'Deb is in the truck counting us in. Deb has never once been late.',
  'The forecast said rain at four. The forecast was wrong and we forgive it.',
  'Attendance is a record, says the man whose job it is to say that.',
  'The band is under the north stand and you can feel it through the floor.',
  'Doreen has sent a casserole up to the booth. Bill has had two helpings.',
  'Bill would like the listeners to know that the casserole has a crust.',
  'The coin was tossed. It landed. Both captains shook hands. Very civil.',
  'Buckley has been out since ten this morning and has not sat down once.',
  'Marla Beam is on the sideline and hopes to get a word with somebody.',
  'The crimson is out in force today, and there is a good bit of teal too.',
  'The grounds crew have this field looking like a snooker table, folks.',
  'Coach Duffy is chewing gum. That is our full report from Coach Duffy.',
  'A man in row nine has a radio pressed to his ear. Hello to that man.',
  'The chain crew are the calmest people in this stadium. They always are.',
  'Bill says the smell off the tailgate reached this booth at half past ten.',
  'The PA is asking the owner of a blue sedan to move it out of row B.',
  'Somebody in the crowd has a sign that says: hello mum. Hello, mum.',
  'Dwight is on the ladder. We do not have a blimp. We have got Dwight.',
  'Hank has done this game since 1994 and still arrives here at seven.',
  'The middle school choir sang before the coin toss and they were superb.',
  'The tuba section came up the ramp and the whole plaza went with them.',
  'It is a beautiful fall afternoon in Marston and everybody is here.',
  'Bill notes that his notebook is a new notebook. It is a good notebook.',
  'The concession stand has run out of the good mustard already. A shame.',
  'There is a purple dot on the far side of the lot. Probably a canopy.',
  // ── the thing in the north lot, which nobody is going to name. ──
  'There is something in the north lot. Bill says it is not on the chart.',
  'The booth has been told it is a drainage project. We shall say no more.',
  'Hank saw it move. Hank has been in this booth a long time. It moved.',
  'The stadium says the situation in the car park is entirely under control.',
  'Bill has written one word in his notebook and will not say the word.',
  'That is not a void, says the man from the stadium. Very well then, sir.',
  'The PA is still asking about that blue sedan. It has bigger worries now.',
  'Marla Beam asked a steward what it is. The steward said: parking.',
], [
  // ── BEAT 3 · WRONG. They call it as a play. At most one "!". ──
  'It has taken the north lot. That is a big gain on first down, folks.',
  'Bill is back in the rulebook. Bill is going through it very carefully.',
  'Nothing in the rulebook covers this. Bill has stopped checking.',
  'The officials have gathered, and they are pointing in four directions.',
  'That is a flag. That is a flag on the play. Nobody can find the flag.',
  'Hank has the call: it goes left, it goes right, it goes down. Oh dear.',
  'The referee announced a delay. He did not say a delay of what, exactly.',
  'It came off the edge untouched and there was nobody home. Textbook.',
  'Deb says we are staying with it. We are staying with it, everybody!',
  'Bill says you cannot teach that. Bill is entirely correct about that.',
  'The graphics machine has put up a stat. The stat is: sixteen percent.',
  'That is the biggest gain from a standing start Hank has ever called.',
  'Marla Beam is trying to get a word with somebody. Anybody at all.',
  'Coach Duffy was asked for a comment. He is chewing the very same gum.',
  'The band has come out. The band was told to come out and out they came.',
  'Buckley has done a lap of the whole thing and got a huge cheer for it.',
  'The chain crew have measured it and are bringing the chains anyway.',
  'The PA has stopped asking about the blue sedan. That is how we know.',
  'The stadium is asking everybody to move up a level. Calmly. One line.',
  'This is not an evacuation. The PA is calling it a walk to the concourse.',
  'Hank says he has seen a lot of football. He has not seen this. Nobody has.',
  'Somebody has put a tarp over part of it. That is not going to do it.',
  'The officials have gone to the monitor. There is no monitor for this.',
  'It took the twenty yard line and the chain crew have logged it properly.',
  'Bill has turned to the back of the rulebook, where the index lives.',
  'The tuba section played straight through it. The tuba section is enormous.',
  'That is a first down. That is a lot of first downs, one after another.',
  'Both benches have moved to the same side of the field. All together.',
  'Marla Beam got her word at last. The word was: run. She is running!',
  'Dwight is up the ladder describing the shape of it. It is round, Dwight.',
  'The middle school choir have been walked out to the buses. First out.',
  'Hank asked Bill for the rule. Bill said there is no rule. Hank called on.',
  'The clock is still running. Nobody in this stadium has stopped the clock.',
  'A steward is counting people out and has got to eleven thousand.',
  'The concession stand has moved up a level and taken the mustard with it.',
], [
  // ── BEAT 4 · COLLAPSE. Total, and they keep calling it. ──
  'The stadium has GONE!! Hank Prewitt is still calling it, play by play.',
  'Bill has closed the notebook. Bill has stopped taking notes, everybody.',
  'Deb says stay with it. We are staying with it. We will stay with it.',
  'The referee blew the whistle and then put the whistle in his pocket.',
  'Both benches carried the water carts out together. That is your story.',
  'The graphics machine has one last stat. The stat is one hundred percent.',
  'Marla Beam is reporting from a hillside with about nine thousand people.',
  'Coach Duffy has stopped chewing. That is the most alarming thing today.',
  'The band is playing from the top of the hill and it carries beautifully.',
  'Buckley is up on the hill with the band, waving, and still not speaking.',
  'The casserole is on the hill being handed along the row. Still warm.',
  'The chain crew brought the chains out. Of course they brought the chains.',
  'Hank says he has called thirty one seasons and this is the one, folks.',
  'The blue sedan has gone. Row B has gone. Nobody is asking about it now.',
  'Dwight came down the ladder, folded it, and put it in his truck. A pro.',
  'The scoreboard went last, and it went dark on the way. Goodnight to it.',
  'Bill says there is no rule for this. Bill would know. Bill has the book.',
  'The officials are stood in a field in stripes. All seven of them.',
  'Somebody put the tarp over the last of it. It did not do it. Good try.',
  'The tuba section has not stopped. We can hear them from here. Superb.',
  'The middle school buses went out first, at the front, exactly correctly.',
  'Everybody is on the hill. Crimson, gold and teal, all sat together.',
  'A steward is still counting. He has got to nine thousand and one.',
  'The press box is the last thing standing and we are broadcasting from it.',
  'Hank asked Bill for a word. Bill said: goodness me. That is Bill.',
  'The clock stopped at last. Somebody finally stopped the clock, folks.',
  'There is another one out by the practice field. That makes two of them.',
  'There are three of them now. Three. We have stopped counting them.',
  'The concession stand is open on the hill and it has the good mustard.',
]];

// ── BEAT 4 · SIGN-OFF ─────────────────────────────────────────────────────────
// The town has gone and the booth is still doing the forecast and the thank
// yous. These are the *last words* of the arc, so they only go on air once the
// match is genuinely over the hill — see `endgame` in pickGamedayNews, which
// reads devouredPct and secondsLeft directly. A goodbye at 18% devoured is a lie.
// Punctuation drops back to at most one "!": this is a sign-off, not a panic.
const SIGN_OFF: string[] = [
  'Hank Prewitt and Bill Ordway, from a hill above Marston. Thank you.',
  'And that is the ball game. There is no ball, and there is no game.',
  'The forecast tomorrow is fair and mild over a very large empty space.',
  'Bill has one last note. The note says: the casserole was excellent.',
  'Deb is counting us out. Deb has never once been late. Goodnight, Deb.',
  'For everybody up on this hill: thank you for listening, and drive safe.',
  'Next week we are on the road, wherever the road happens to be now.',
  'Buckley waved us off the air. Buckley never did break character.',
  'Hank Prewitt, signing off after thirty one seasons and one odd day.',
  'Goodnight from Marston. The band is still playing. Listen to that.',
];

// ── WHAT IT JUST ATE ──────────────────────────────────────────────────────────
// ctx.lastMeal is free text from the call site. It never says "a person" — the
// game only tags HOUSE and CAR, and sizes everything else — so these four
// buckets are everything the API can actually tell us apart. A bite the player
// just took should be on air within seconds of it.
export type MealKind = 'house' | 'car' | 'big' | 'small';

const MEAL_HOUSE: Pools = [[
  'A house has gone off Frat Row. The sofa on the lawn is still there.',
  'A whole HOUSE. Bill says he has never seen a house do that before.',
  'A house went in whole with the porch light still on. Goodness me.',
  'That was a house. Hank called it, Bill wrote it down. That is the job.',
], [
  'Another house off Frat Row. That is four. Bill is keeping the count.',
  'A house went in and the porch swing came off and got away. Good swing.',
  'A motorhome has gone. It was the one with the doorbell. Site twenty two.',
  'Bill says a house is a big gain on any down. Bill is not wrong there.',
], [
  'Every house on the row has gone. Six crimson columns are on a truck.',
  'The last house went in sideways. It did not fit. It went in anyway.',
  'The houses have GONE!! The sofas all got out. Every single sofa.',
  'A motorhome went in with the awning still out. It was a lovely awning.',
]];

const MEAL_CAR: Pools = [[
  'A parked car has gone from row B. It was the blue sedan. At last.',
  'A pickup has gone, tailgate down, grill still warm. Ernie is upset.',
  'A car went in with the alarm going, and the alarm carried on down there.',
  'One car. One gulp. The lot barely noticed. Bill noticed. Bill notes it.',
], [
  'Another car out of row B. The PA has stopped reading out the plates.',
  'A truck went down with the tailgate radio on. Song four of nine.',
  'The golf cart has gone. That was the cart that towed Gerald to safety.',
  'The cars are going now. The man with the paddles is waving them all out!',
], [
  'The last car in the overflow lot has gone. Everybody else got out.',
  'A truck went in with the lights on, and the lights went a long way down.',
  'No cars left in Marston!! The man with the paddles has nothing to direct.',
  'The team buses are safe. Both of them. Somebody went and checked twice.',
]];

const MEAL_BIG: Pools = [[
  'Something enormous has gone and this booth felt it through the floor.',
  'A building is missing from Old Campus. Bill cannot say which one it was.',
  'That was a big one. The coffee in the press box did a little wobble.',
  'A landmark has gone. It was on the front of the programme. Page one.',
], [
  'A whole building went down and it sounded like a bath draining out.',
  'Bill says that was the biggest gain of the afternoon. He has it timed.',
  'The bleacher stack has gone. Two hundred people were on it at eleven.',
  'That one was enormous. Dwight nearly came off the ladder. Steady, lad!',
], [
  'The last big thing went in slowly. Very slowly. We all watched it go.',
  'Everything big has GONE!! Only the small things are left out there now.',
  'The clock tower went in chiming, four minutes fast, right to the end.',
  'The biggest bite of the afternoon. It sat still afterwards for a moment.',
]];

const MEAL_SMALL: Pools = [[
  'It ate a cone. One traffic cone. The man with the paddles has spares.',
  'A cooler has gone. That cooler belonged to row F, and row F is asking.',
  'It ate a bin behind the concession stand and nobody has noticed yet.',
  'A folding chair has gone. It was a good chair. It had a cup holder.',
], [
  'Still snacking. Cones, coolers and somebody\'s entire folding table.',
  'It ate a cornhole board, burped, and then took the other one. Rude.',
  'It took the water cart. It did not want the water cart. It took it.',
  'It ate a foam finger. The child is fine. The child wants another one!',
], [
  'Nothing big is left. It is eating cones now. Loud, plastic crunching.',
  'It ate the last folding chair. It did not even WANT that chair.',
  'Down to cones and cups. It is HOOVERING the overflow lot, folks.',
  'The last snack was a tub of mustard. The good mustard, very sadly.',
]];

const BY_MEAL: Record<MealKind, Pools> = {
  house: MEAL_HOUSE, car: MEAL_CAR, big: MEAL_BIG, small: MEAL_SMALL,
};

/** classify ctx.lastMeal into one of the four buckets the API can distinguish. */
export function gamedayMealKind(meal: string): MealKind {
  const s = (meal || '').toLowerCase();
  // 'rv' and 'motorhome' land in the house bucket on purpose: on RV Row a
  // motorhome IS somebody's house, and the house lines read correctly for it.
  if (s.includes('house') || s.includes('home') || s.includes('rv')) return 'house';
  if (s.includes('car') || s.includes('truck') || s.includes('van') || s.includes('bus')) return 'car';
  if (s.includes('building') || s.includes('landmark') || s.includes('big')
    || s.includes('stand') || s.includes('tower')) return 'big';
  return 'small';
}

// ── LIVE / TEMPLATED ──────────────────────────────────────────────────────────
//  {F} form   {M} last meal   {P} pct   {R} 100-pct   {S} seconds   {D} district
//  Those SIX are the entire vocabulary. There is no rival token and there never
//  will be — `usable()` blocks any template carrying anything else.
//  Never start a line with {D} or {M}: they arrive lower case and a sentence
//  must begin with a capital.
//  {P} and {R} are always written "{P} percent" here rather than "{P}%": a
//  commentator says the word out loud, and the ticker is quoting a commentator.
const LIVE: Pools = [[
  'A {F} has been sighted at {D}. Bill has it noted.',
  'Hank has the call. There is a {F} down at {D}.',
  'It ate {M}. The stadium is calling that a parking matter.',
  'A {F} at {D}. That is not on the depth chart.',
  'Bill says a {F} is a first for him, and Bill has seen a great deal.',
  'Marla Beam is at {D} and wants a word with the {F}.',
  'The graphics machine has a stat: the {F} is at {P} percent.',
  'It ate {M}. Bill wrote it down. Bill writes it all down.',
  'Buckley waved at the {F}. It did not wave back. Not yet.',
  'The PA has an announcement about {D}. It is: please move.',
  'Coach Duffy was asked about the {F}. He is chewing the same gum.',
  'Dwight can see the {F} from the ladder. It is round.',
  'A {F} at {D}. Hank has never called one of those.',
  'Deb asked us to describe the {F}. Bill said: purple.',
  'The chain crew measured the {F}. It is longer than the chains are.',
  'A steward has asked the {F} for its ticket. Fair enough.',
  'It ate {M}. That was on nobody\'s list of worries today.',
], [
  'It has taken {D}. Bill calls that a big gain on first down.',
  'We are moving everybody off {D}. Calmly. In one line.',
  'It ate {M}. Somebody owned that and is having a word.',
  'Marston is {P} percent gone and this booth is staying with it.',
  'Do not go to {D}. That is exactly where the {F} is.',
  'A {F} at {D}. The officials are pointing four ways.',
  'Bill has the rulebook open at {D}. There is nothing in it.',
  'The {F} ate {M}. You cannot teach that.',
  'Marla Beam is at {D} asking how people feel. Strongly.',
  'The graphics machine says {P} percent. The other {R} percent is walking.',
  'Hank has the {F} at {D} and has called every yard.',
  'The band was moved off {D} and is playing on the move!',
  'The chain crew measured the {F} at {D}. Still short.',
  'Coach Duffy was asked about {D}. Still chewing, no comment.',
  'A second {F} at {D}. That makes two of them now.',
  'The stadium says {D} is a drainage project. Bill has stopped.',
  'Buckley has led a section off {D}, dancing the whole way.',
], [
  'It has eaten {D}!! Hank is calling it from the press box.',
  'That is {P} percent DEVOURED. The other {R} percent is on the hill.',
  'The {F} ate {M}. Bill has stopped taking notes.',
  'There are {S} seconds left!! Everybody up the hill. Bring the casserole.',
  'Hank has conceded {D}. Hank has not conceded the broadcast.',
  'A {F} now holds {P} percent of Marston and filed no paperwork.',
  'There are {S} seconds left and the band has not stopped playing once.',
  'It ate {M}. Marla Beam got a word. The word was: goodness.',
  'Deb says stay with it. There is no {D} to stay with. We stay.',
  'There are {S} seconds left. The casserole is going along the front row.',
  'The chain crew measured {D} one final time. Short to the inch.',
  'At {P} percent gone, {R} percent of this town is on one hill.',
  'It ate {M} and the whole hill went ooh. Every one of them.',
  'Only {S} seconds left!! Both benches are stacking chairs together.',
  'Buckley waved the {F} off and never broke character. A legend.',
  'There are two of them at {D} now. Two. Up the hill we go.',
  'It ate {M}. Coach Duffy said: well. That is the comment.',
]];

// ══ WHO IS TALKING ═══════════════════════════════════════════════════════════
// Speech bubbles over people's heads — a different medium from the ticker, and
// deliberately left in their own voice. A line should sound like the PERSON,
// not the broadcast. Same house style: proper sentences, capital at the start,
// terminal punctuation. Kept SHORT: a phone bubble truncates fast, so aim under
// ~34 characters, hard cap 46. Keyed exactly like MAPLE_VOICE_* so life.ts can
// resolve them with no adapter — do not rename the keys.
//
// The one deliberate oddity is `mascot`. Buckley does not speak, because a
// mascot in character never speaks, so his bubbles are what he DOES. It reads
// as mime in a speech bubble, which is the joke, and it survives the whole arc.
export const GAMEDAY_VOICE_AMBIENT: Record<string, string[]> = {
  // ordinary crowd. Same seat, same jacket, same parking spot, every year.
  fan: [
    'Best day of the year, this one.', 'We park in the same spot always.',
    'My father brought me here first.', 'Sixty degrees? I have seen worse.',
    'I have had this seat since 1998.', 'Crimson from head to toe today.',
    'Did you see that? I saw that.', 'I have the radio in my ear.',
    'We drove three hours for this.', 'Same jacket, every home game.',
    'That is a good crowd out there.', 'I brought the good binoculars.',
    'My knees say sit. I stand up.', 'The band is worth the ticket.',
    'Hello to Hank up in the booth.', 'I know every steward by name.',
  ],
  // painted chest, spells out a letter, has not worn a coat since 2011
  superfan: [
    'The paint takes two whole hours.', 'Yes it is cold. I am quite fine.',
    'I am the letter M. He is the A.', 'We spell it out every single week.',
    'No coat since 2011. None at all.', 'My mother made me this hat.',
    'Row one, dead centre, always.', 'I have a drum. It is allowed.',
    'Louder! Come on, this side!', 'I brought a spare letter today.',
    'That is my face on that flag.', 'The paint comes off eventually.',
    'I have done ninety in a row now.', 'Buckley knows me by name.',
    'We got on the television once.', 'On your feet! Up you get!',
  ],
  cheer: [
    'Ready. Okay. From the top.', 'We have nine of these to do.',
    'Smile even when it is cold.', 'Hands in. On three. One, two.',
    'The pyramid goes up at half.', 'My megaphone has a dent in it.',
    'Watch the sideline. Stay back.', 'We practise at six in the morning.',
    'Crimson bows. Every single week.', 'The little ones copy everything.',
    'One more, then we move down.', 'Face the crowd. Always the crowd.',
    'I have done this for four years.', 'The band is behind us. So loud.',
    'Big finish. Big smile. And go.', 'Somebody has my pompom again.',
  ],
  band: [
    'Third tuba. Second row. Hello.', 'We know one cadence. It is good.',
    'This uniform weighs an awful lot.', 'We march at five past the hour.',
    'My hat has a plume. A big one.', 'Do not touch the sousaphone.',
    'We have rehearsed since August.', 'The drums start it off. Always.',
    'You can hear us from the lot.', 'My reed is soaked through already.',
    'Eyes up. Follow the drum major.', 'We played through rain last year.',
    'Sixteen steps to every five yards.', 'The piccolos get the good tune.',
    'Somebody is out of step. Not me.', 'We play until they stop us.',
  ],
  ref: [
    'That is not in the rulebook.', 'I have a whistle and I have a job.',
    'Both sides, over here, please.', 'We measure it. We do not guess.',
    'Play on. Play on. Play on.', 'Nineteen years of doing this.',
    'Nobody likes me. That is fine.', 'These stripes are not a fashion.',
    'I always bring a spare whistle.', 'Hold the ball there. Let me see.',
    'That is my call and it stands.', 'Ask me after, and not during.',
    'Everybody take a step back now.', 'The rulebook is in my bag.',
    'The chains do not lie. Ever.', 'Twelve out there. Count again.',
  ],
  coach: [
    'Same gum since the coin toss.', 'We play the game in front of us.',
    'No comment. Ask me after that.', 'Feet. It is all about the feet.',
    'Water. Everybody get some water.', 'That is my nephew. He sits.',
    'I have a laminated card. Look.', 'One play at a time. That is it.',
    'Nobody outworks this group.', 'I do not shout. Not much.',
    'Get the sled out. Gerald. Yes.', 'Line up. Do it again. And again.',
    'The clipboard stays with me.', 'Twenty two years on this field.',
    'Good hustle. Now do it right.', 'Well. That is what I will say.',
  ],
  // Buckley. Never speaks, never breaks character, is having a lovely day.
  mascot: [
    'Buckley waves. Both arms, high.', 'Buckley points at your hat.',
    'Buckley gives a big thumbs up.', 'Buckley has never once spoken.',
    'Buckley does a small dance.', 'Buckley shakes your whole hand.',
    'Buckley pretends to be shy.', 'Buckley high fives a small child.',
    'Buckley cannot see very well.', 'Buckley mimes an enormous cheer.',
    'Buckley bows towards the band.', 'Buckley taps his own big head.',
    'Buckley poses for a photograph.', 'Buckley applauds the whole crowd.',
    'Buckley needs a sit down soon.', 'Buckley points at the stadium.',
  ],
  // Ernie energy: grill nine, since Thursday, nobody leaves hungry
  cook: [
    'Low and slow. That is the secret.', 'I have been here since Thursday.',
    'Nobody leaves this lot hungry.', 'Do not touch that lid. Not ever.',
    'Grill nine. Same spot, ten years.', 'Another twenty minutes. Sit down.',
    'I brought four coolers. Four.', 'Yes, there is enough. Always is.',
    'The rub is a family secret.', 'Plates are on the tailgate there.',
    'That smoker cost more than my car.', 'Row ten always brings the dessert.',
    'I have never seen a first half.', 'Two more trays and I am done.',
    'Take some home. Go on. Take it.', 'My tongs, my rules. Sit down.',
  ],
  student: [
    'I have a paper due on Monday.', 'We got here at six this morning.',
    'The sofa was on the lawn first.', 'My roommate is in the band.',
    'I am painting a banner later on.', 'That is my professor. Hide now.',
    'The library is open. Somewhere.', 'We have done nine of these.',
    'I know all the words. Mostly.', 'My parents are here. Be normal.',
    'Free food at the tent. Go now.', 'I have a spare shirt. Crimson.',
    'The bus back leaves at seven.', 'Somebody has my folding chair.',
    'Best day of the whole term.', 'I have not been to the library.',
  ],
  parent: [
    'That is my son. Number nine.', 'I have a folding chair for two.',
    'We drove up early this morning.', 'Do you want a sandwich? Take one.',
    'She has a paper due. She is fine.', 'I have the good camera today.',
    'Sunscreen. Even in October. Yes.', 'Hold my hand in this crowd.',
    'We stay until the very end.', 'His room is exactly the same.',
    'I brought a blanket. Two, in fact.', 'She never answers her phone.',
    'That is the dorm. The brick one.', 'One photograph. Just one. Smile.',
    'We are proud. Do not tell him.', 'I have snacks. I always do.',
  ],
  vendor: [
    'Programmes. Three dollars. Cash.', 'Peanuts. Right here. Peanuts.',
    'I cannot break a fifty. Sorry.', 'Hot drinks up in section C.',
    'Gold scarves. Last four left.', 'I walk eleven miles a game.',
    'The good mustard has all gone.', 'Buy two. It is cold out here.',
    'I have done this since 1989.', 'Foam fingers. One size only.',
    'Nobody buys the small ones.', 'This tray is heavier than it looks.',
    'Row nine always tips. Good row.', 'Popcorn. Two minutes old. Fresh.',
    'Cash only. The machine is down.', 'Last call before the band comes.',
  ],
  steward: [
    'No bags bigger than this one.', 'Section C is that way. Straight on.',
    'I have worked this gate for years.', 'Ticket out, please. Thank you.',
    'Mind the step. Everybody minds it.', 'Keep the aisle clear, please.',
    'I know every seat in this stand.', 'Lost child here. Come with me.',
    'Hi vis, whistle, radio. Ready.', 'You cannot bring that in. Sorry.',
    'I have counted eleven thousand.', 'Gate C has the short queue.',
    'The rules are on the back, sir.', 'Lost property is under the stand.',
    'Enjoy the game. Mind the step.', 'Never missed a home game. Never.',
  ],
};

export const GAMEDAY_VOICE_PANIC: Record<string, string[]> = {
  fan: [
    'Everybody up the hill!!', 'Grab the chairs!! Go!!', 'This way!! Follow the band!!',
    'I am not leaving my cooler!!', 'Same spot next week!! Run!!', 'Hold on to your hats!!',
    'Take my hand!! Come on now!!', 'Up!! Up the hill!! Go on!!', 'I have the radio!! Still on!!',
    'Forty years!! Never this!!', 'Somebody grab that flag!!', 'Mind the step!! Go, go!!',
    'Got my binoculars!! Move!!', 'Keep together!! This way!!', 'That is my seat!! Was!!',
  ],
  superfan: [
    'Save the letters!! All of them!!', 'M is running!! Follow the M!!', 'Still no coat!! Still fine!!',
    'Grab the drum!! The drum!!', 'On your feet!! Now go!!', 'My flag!! Somebody has it!!',
    'Ninety in a row!! Ninety!!', 'This side!! Come on!! Move!!', 'Two hours of paint!! Run!!',
    'We spell it on the hill!!', 'I am still the letter M!!', 'Take my spare letter!! Go!!',
    'Buckley, this way!! Come on!!', 'Louder!! Everybody keep going!!', 'Mum made this hat!! Got it!!',
  ],
  cheer: [
    'Hands in!! Everybody up!!', 'Pyramid down!! Gently now!!', 'Follow us!! This way!!',
    'Count them!! All nine of us!!', 'Keep smiling!! Keep moving!!', 'Somebody grab the megaphone!!',
    'Little ones first!! Go!!', 'Stay together!! Hold hands!!', 'Up the hill!! On three!!',
    'I have the bows!! Come on!!', 'Face the crowd!! Walk back!!', 'Big finish!! Then we run!!',
    'Somebody has my pompom!!', 'Four years!! Never this!!', 'Left side!! Move up!! Go!!',
  ],
  band: [
    'Keep playing!! Do not stop!!', 'Tubas, up the hill!! Go!!', 'Eyes on the drum major!!',
    'Play it again!! From the top!!', 'Mind the sousaphone!! Careful!!', 'We played through rain!! March!!',
    'Sixteen steps!! Keep marching!!', 'Piccolos, with me!! Come on!!', 'Grab your hats!! Move!!',
    'Drums!! Keep that cadence!!', 'Nobody stops playing!! Nobody!!', 'Second row, close up!!',
    'Still in step!! Keep going!!', 'Louder!! They can hear us!!', 'To the hill!! In formation!!',
  ],
  ref: [
    'Everybody off the field!! Now!!', 'This is not a penalty!! Move!!', 'Both sides!! Same way!! Go!!',
    'Nothing covers this!! Run!!', 'I have the whistle!! Follow it!!', 'Take a step back!! Further!!',
    'Nineteen years!! Never this!!', 'Clear the sideline!! Please!!', 'The chains!! Bring the chains!!',
    'Play is over!! Everybody out!!', 'Hold hands and go!! Quickly!!', 'My call!! Up the hill!! Go!!',
    'Count them!! Count everybody!!', 'No, that stands!! Now run!!', 'Help the chain crew!! Go!!',
  ],
  coach: [
    'Everybody off!! Now!! Go!!', 'Get the water carts out!!', 'Count the squad!! All of them!!',
    'One play at a time!! Move!!', 'Both benches!! The same way!!', 'Take the sled!! Take Gerald!!',
    'Nobody runs alone!! In pairs!!', 'Up the hill!! Good hustle!!', 'Where is my nephew!! Anybody!!',
    'Leave the clipboard!! Go!!', 'Twenty two years!! Never this!!', 'Buses!! Get to the buses!!',
    'Help the little ones!! Move!!', 'Do not stop!! Keep going!!', 'Well. Right. Everybody run!!',
  ],
  mascot: [
    'Buckley points up the hill!!', 'Buckley waves both arms!!', 'Buckley is running!! Follow!!',
    'Buckley holds the gate open!!', 'Buckley still has not spoken!!', 'Buckley mimes: this way!!',
    'Buckley counts the whole band!!', 'Buckley claps everybody on!!', 'Buckley leads the front row!!',
    'Buckley is dancing. Uphill!!', 'Buckley waves the buses out!!', 'Buckley gives a thumbs up!!',
    'Buckley bows to the hillside!!', 'Buckley is missing one glove!!', 'Buckley is last off. Of course!!',
  ],
  cook: [
    'Take a plate!! Then run!!', 'The tongs!! I have the tongs!!', 'Grill nine comes with me!!',
    'Nobody leaves hungry!! Go!!', 'Somebody grab the coolers!!', 'Twenty minutes!! I need twenty!!',
    'Lid stays on!! Now move!!', 'Ten years in this spot!! Ten!!', 'Load the truck!! Everything!!',
    'Save the good mustard!!', 'Take it with you!! All of it!!', 'I have fed this lot for years!!',
    'Trays in the back!! Go, go!!', 'Got the rub recipe!! Run!!', 'Up the hill!! I will cook there!!',
  ],
  student: [
    'Get the sofa!! Four of us!!', 'Leave the paper!! Just run!!', 'Grab the banner!! Roll it up!!',
    'My roommate is in the band!!', 'Everybody count off!! Now!!', 'To the quad!! No, past it!!',
    'Take the cooler!! And go!!', 'Nobody is going to believe this!!', 'Bus at seven!! Or now!! Now!!',
    'Somebody has my chair!! Go!!', 'Hold the door!! Everybody out!!', 'Best day of the term!! Run!!',
    'I am telling my parents!!', 'Nine of these!! Never this!!', 'Follow the band!! They know!!',
  ],
  parent: [
    'Hold my hand!! Right now!!', 'Find your sister!! Quickly!!', 'Everybody to the car!! Go!!',
    'I have the blanket!! Come on!!', 'Stay where I can see you!!', 'Take a sandwich and run!!',
    'The camera!! I got the camera!!', 'Coats on!! No, just run!!', 'Nobody let go!! Hold on!!',
    'Count the children!! All four!!', 'Everybody stay close!! Move!!', 'I am calling your father!!',
    'We stay to the end!! Move!!', 'Sunscreen later!! Go now!!', 'That is my son!! Get him out!!',
  ],
  vendor: [
    'Take it!! No charge!! Go!!', 'Everything is free!! Run!!', 'Grab the tray!! Leave the rest!!',
    'Scarves for everybody!! Here!!', 'The float!! Somebody take it!!', 'Eleven miles!! Not today!!',
    'Since 1989!! Never this!!', 'Foam fingers!! Take them all!!', 'Popcorn!! Hot drinks!! Run!!',
    'Cash box is under the tray!!', 'Help me carry this!! Please!!', 'Section C, out the back!!',
    'No charge!! Just go!! Go!!', 'Row nine!! Come with me!!', 'Last call!! Genuinely last call!!',
  ],
  steward: [
    'This way, please!! Keep moving!!', 'Aisles clear!! One line!!', 'Everybody up and out!! Calmly!!',
    'Follow my arm!! This way!!', 'Mind the step!! Still mind it!!', 'Bag rules apply!! Now move!!',
    'Children to the front!! Please!!', 'I counted eleven thousand!!', 'Section C, out the back!! Go!!',
    'Nobody run!! Walk quickly!!', 'Radio the gate!! We are clear!!', 'Lost property later!! Go now!!',
    'Hold the rail!! Keep going!!', 'Gate C!! Still the short queue!!', 'Never missed one!! Move!!',
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
 * false until the booth has said good afternoon. The FIRST pickGamedayNews()
 * call of a match always returns the sign-on and nothing else can jump ahead of
 * it — resetGamedayNews() takes the booth back off air, and resetMatch() calls
 * that.
 */
let signedOn = false;
let signedOff = false;   // the booth has said goodnight; it does not come back

/** clears the anti-repeat memory — call between matches if you like. */
export function resetGamedayNews(): void {
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

function bind(ctx: GamedayCtx): Filled {
  // ONE rounded percentage drives both {P} and {R}. Rounding them separately is
  // how a booth ends up saying "1 percent gone, the other 100 percent is fine".
  const pct = Math.min(99, Math.max(1, Math.round(ctx.devouredPct || 0)));
  // NOTE: ctx.rivalName / ctx.rivalLead are NOT read here, on purpose. See the
  // note on GamedayCtx. Two men calling a football game cannot know another
  // void's name, so the broadcast has no way to say one.
  return {
    pct,
    rest: 100 - pct,
    form: clip(ctx.form || 'VOIDLING', 14),
    meal: clip(ctx.lastMeal || 'a folding chair', 22),
    dist: ctx.district ? DIST_NAME[ctx.district] : 'Marston',
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
 * THE MECHANISM THAT KEEPS RIVALS OFF AIR. `fill()` can only substitute six
 * tokens, so a stray {L} or {G} would reach the ticker as literal braces. This
 * refuses to air any template carrying a token we cannot fill — so if a rival
 * token is ever pasted back into a pool it silently never fires, rather than
 * reading "{L} leads by {G}" to a seven year old.
 */
function tokensAreKnown(t: string): boolean {
  TOKEN.lastIndex = 0;
  for (let m = TOKEN.exec(t); m; m = TOKEN.exec(t)) {
    if (!KNOWN_TOKEN.test(m[1])) return false;
  }
  return true;
}

/** a countdown line at 2:40 remaining is a weather report, not a two minute drill. */
function usable(t: string, ctx: GamedayCtx): boolean {
  if (!tokensAreKnown(t)) return false;
  if (t.includes('{S}') && ctx.secondsLeft > 70) return false;
  return true;
}

const clampTier = (t: number): NewsTier => (t <= 0 ? 0 : t >= 2 ? 2 : 1);

/**
 * One fully-formed headline, ready to drop straight into the ticker.
 *
 * THE ARC. Four beats, and the picker has the signal for all four:
 *   1 SIGN-ON   the first call of every match. Good afternoon + a pre-game item.
 *   2 PRE-GAME  tier 0 — the weather, the coin, the casserole, then a purple dot.
 *   3 WRONG     tier 1 — the void called as a play. Bill goes to the rulebook.
 *   4 COLLAPSE  tier 2 — everything gone, still being called, then the sign-off.
 * `tier` is derived at the call site from devouredPct AND the player's form, so
 * a WORLD ENDER never gets a beat-2 line. Beat 1 is ours to guarantee.
 *
 * Weighted ~34% district / ~22% what-it-just-ate / ~28% live / ~16% general
 * when we know where the player is; meal-and-live-heavy when we don't.
 */
export function pickGamedayNews(ctx: GamedayCtx, rnd: () => number = Math.random): string {
  const tier = clampTier(ctx.tier);
  const b = bind(ctx);

  // BEAT 1. Nothing goes on air before good afternoon.
  if (!signedOn) {
    signedOn = true;
    const raw0 = SIGN_ON[Math.floor(rnd() * SIGN_ON.length) % SIGN_ON.length] ?? SIGN_ON[0];
    const out0 = clip(raw0, TICKER_MAX);
    remember(raw0, out0);
    return out0;
  }

  const districtPool = ctx.district ? BY_DIST[ctx.district][tier].filter((t) => usable(t, ctx)) : [];
  const mealPool = BY_MEAL[gamedayMealKind(ctx.lastMeal)][tier].filter((t) => usable(t, ctx));
  const livePool = LIVE[tier].filter((t) => usable(t, ctx));
  const generalPool = GENERAL[tier].filter((t) => usable(t, ctx));
  // BEAT 4 gate. tier 2 starts as low as 18% devoured, which is far too early
  // for "and that is the ball game" — so the sign-off waits for the match to be
  // genuinely over the hill.
  const endgame = tier === 2 && (ctx.devouredPct >= 45 || ctx.secondsLeft <= 45);
  // ONCE, AND LAST. Both older newsrooms shipped a bug where the station said
  // goodnight and then carried on broadcasting — the gate opened with three
  // headline slots still to run and the draw could hit it more than once.
  // `signedOn` had a latch and its mirror never existed. Same fix here, from the
  // start: the sign-off is only reachable in the final stretch, and taking it
  // closes the booth for the match.
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
export function gamedayLineCount(): number {
  const all: Pools[] = [BOWL, PLAZA, LOT, RVPARK, GREEK, CAMPUS, PRACTICE, WOODS, GENERAL, LIVE,
    MEAL_HOUSE, MEAL_CAR, MEAL_BIG, MEAL_SMALL];
  return SIGN_ON.length + SIGN_OFF.length
    + all.reduce((n, p) => n + p[0].length + p[1].length + p[2].length, 0);
}

/** total distinct spoken lines across every voice pool. */
export function gamedayVoiceLineCount(): number {
  const sum = (r: Record<string, string[]>): number =>
    Object.values(r).reduce((n, v) => n + v.length, 0);
  return sum(GAMEDAY_VOICE_AMBIENT) + sum(GAMEDAY_VOICE_PANIC);
}

/**
 * QA hook. Every raw template in the broadcast, tagged with the beat it belongs
 * to, so a harness can assert the house style without reaching into module
 * privates. beat 1 = sign-on, 2 = pre-game (tier 0), 3 = wrong (tier 1),
 * 4 = collapse (tier 2), 5 = sign-off.
 */
export function gamedayAudit(): { beat: 1 | 2 | 3 | 4 | 5; pool: string; line: string }[] {
  const out: { beat: 1 | 2 | 3 | 4 | 5; pool: string; line: string }[] = [];
  for (const line of SIGN_ON) out.push({ beat: 1, pool: 'SIGN_ON', line });
  const pools: [string, Pools][] = [
    ['BOWL', BOWL], ['PLAZA', PLAZA], ['LOT', LOT], ['RVPARK', RVPARK], ['GREEK', GREEK],
    ['CAMPUS', CAMPUS], ['PRACTICE', PRACTICE], ['WOODS', WOODS],
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

// ── SWAP-IN ALIASES ───────────────────────────────────────────────────────────
// newsroom.ts and newsroom_maple.ts disagree about naming: the Pirate Bay module
// owns the bare names (pickNews, NewsCtx) and Maple prefixes everything so both
// can be imported into life.ts at once. This module carries the prefixed set as
// its real surface AND re-exports it under the bare names, so a caller that has
// only ever spoken to newsroom.ts can swap module and change nothing else. The
// signatures are identical; only the district union differs, and that is the
// world's own list from gameday.ts.
export { pickGamedayNews as pickNews, resetGamedayNews as resetNews };
export { gamedayMealKind as mealKind, gamedayLineCount as newsLineCount };
export { gamedayAudit as newsAudit, GAMEDAY_BRAND as BRAND };
export type NewsCtx = GamedayCtx;
export type Dist = GdDist;
