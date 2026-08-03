// ══════════════════════════════════════════════════════════════════════════════
//  NEWSROOM — the PIRATE BAY RESORT public address system
// ══════════════════════════════════════════════════════════════════════════════
//
//  ┌──────────────────────────────────────────────────────────────────────────┐
//  │  HOUSE STYLE — REWRITTEN. READ THIS BEFORE YOU TOUCH A LINE.             │
//  │  The old rule said "the body is LOWER CASE, always, including the first  │
//  │  word". That rule is DEAD. It made the ticker read like a broken robot   │
//  │  and it is the reason the newsfeed was rejected twice.                   │
//  ├──────────────────────────────────────────────────────────────────────────┤
//  │  1. WRITE PROPER ENGLISH SENTENCES. Capital letter at the start. Full    │
//  │     stop at the end. Proper nouns capitalised normally — Capt. Roger,    │
//  │     Nigel, Pirate Bay, Sunset Beach. NOT in caps. Title case.            │
//  │  2. CAPS IS THE JOKE OR THE PANIC, and nothing else. At most TWO         │
//  │     capitalised words in a line, and most lines have none. {TOKENS} do   │
//  │     not count — the game supplies those in caps.                         │
//  │  3. ONE JOKE PER LINE. Concrete nouns. An animal doing something daft,   │
//  │     a grown-up refusing to admit the obvious, something enormous         │
//  │     described as normal, somebody's lunch going missing. It must land    │
//  │     for a SIX-YEAR-OLD, not for a copywriter.                            │
//  │  4. PUNCTUATION ESCALATES WITH THE BEAT. This is how the arc is felt.    │
//  │        BEAT 1 sign-on  — exactly ONE "!", and it lands on the greeting.  │
//  │        BEAT 2 denial   — ZERO "!". The resort is completely calm.        │
//  │        BEAT 3 alarm    — at most ONE "!". Cheerfulness under strain.     │
//  │        BEAT 4 panic    — at most ONE "!!" and never a lone "!".          │
//  │        BEAT 4 sign-off — back to at most ONE "!". A calm goodbye.        │
//  │     One "?" per line, max. No "?!", no ellipsis, no em dashes.           │
//  │  5. NO RUNNING GAG OWNS THE FEED. No character and no bit may appear in  │
//  │     more than ~8% of lines. Capt. Roger is the host, not the newsfeed.   │
//  │     If a line only needs an official, use the tannoy, the front desk,    │
//  │     management or staff instead.                                        │
//  └──────────────────────────────────────────────────────────────────────────┘
//
//  THE ARC, in four beats:
//
//  BEAT 1  SIGN-ON   fires FIRST, every match, guaranteed, and ALWAYS opens
//                    with "Good morning". Then a real piece of resort news
//                    with a pirate gag in it. Nothing about the void.
//  BEAT 2  DENIAL    tier 0. Ordinary resort news, running alongside somebody
//                    flatly insisting the void is not there. It is a water
//                    feature. Do have an ice cream.
//  BEAT 3  ALARM     tier 1. Dawning horror, delivered cheerfully. The
//                    evacuation is a FUN WALK. Officials contradict themselves
//                    mid-sentence and keep smiling.
//  BEAT 4  PANIC     tier 2. The resort is going and the broadcast is still
//                    doing the weather and the spa bookings.
//
//  THE PREMISE. A luxury holiday resort with a pirate theme, full of very rich
//  guests. BOTH halves must be in the copy: pirate silliness (a parrot that
//  repeats guest complaints, a treasure map that is wrong, a cannon that fires
//  beach balls, staff who will not stop saying arrr, a first mate who is just a
//  man named Nigel) AND resort comedy (a guest who wants to speak to the manager
//  about the sea, an enormous hat, the towel situation, the conga line, the
//  world's slowest water slide queue, a guest who has booked the same lounger
//  for eleven years).
//
//  THE RULE ABOUT THE VOID. The news covers ONE thing: a void is eating the
//  resort. Guests have no way of knowing that some *other* void somewhere has a
//  name, a family or a scoreboard, so the newsroom never mentions one. If a
//  line needs a second void it says "another one", "a second void", "there are
//  two of them" — never a name. Enforced in code: `bind()` reads no rival
//  field, `fill()` knows no rival token, and `usable()` refuses point blank to
//  air any template containing a token outside {D}{M}{F}{P}{R}{S}.
//
//  RATED 4+. Nothing about alcohol, bars, cocktails, rum, champagne, gambling,
//  money trouble or real politics. The resort has ice cream, smoothies and
//  lemonade. Nothing frightening, nothing mean about how anybody looks, nothing
//  a child would repeat at school and get in trouble for.
//
//  Recurring cast (reuse is the joke — do not add one-off names):
//    Capt. Roger        the host. Hospitality in freefall. Always upselling.
//    Nigel              the first mate. Also just a man named Nigel.
//    Barnaby            the parrot. Repeats guest complaints. Always correct.
//    DJ Coconut         Dance Cove. One more hour. Always one more hour.
//    Mrs Fenwick-Hyde   guest. Paid for a sea view. Wants a word about the sea.
//    Maisie (7)         kid. Delighted. Wants to feed it. Names it. Adopts it.
//    Cressida Vane      critic. Awards stars to leaves, mangoes and toast.
//    the Gilded Lagoon  the smug rival resort across the bay.
//
//  Lines render in a one-line phone ticker — aim under ~64 chars, hard cap 78
//  AT WORST-CASE TOKEN FILL (a 14-char form plus a 22-char meal).
// ══════════════════════════════════════════════════════════════════════════════

export type NewsTier = 0 | 1 | 2;
export type Dist = 'port' | 'market' | 'resort' | 'party' | 'jungle' | 'cove' | 'beach';

export interface NewsCtx {
  tier: NewsTier;
  district: Dist | null;   // where the player currently is (null if unknown)
  lastMeal: string;        // e.g. "a parked car", "a whole HOUSE"
  devouredPct: number;     // 0..100
  form: string;            // e.g. 'VOIDLING' | 'GOBBLER' | 'DEVOURER' | 'WORLD ENDER'
  secondsLeft: number;
  // ── ACCEPTED AND DELIBERATELY IGNORED ──────────────────────────────────────
  // The call site still hands us the rival scoreboard. The newsroom no longer
  // has any use for it: a guest at a resort cannot know that some other void is
  // called anything, so it never goes on air. These two stay declared purely so
  // the existing call site type-checks. `bind()` does not read them. Do not
  // start reading them.
  rivalName?: string;
  rivalLead?: number;
}

/** Per-tier ticker brand. The station gets progressively less relaxed. */
export const BRAND: [string, string, string] = [
  '🏴‍☠️ BAY RADIO',
  '⚠️ RESORT UPDATE',
  '🚨 ALL HANDS',
];

// ── BEAT 1 · SIGN-ON ──────────────────────────────────────────────────────────
// ALWAYS begins "Good morning". Then a real piece of resort news with a pirate
// gag in it — the void has not happened yet as far as anyone here knows. This
// fires FIRST, guaranteed, before any other headline (see `signedOn`).
// No {templates} — the sign-on must never depend on match state.
// Punctuation: exactly one "!", on the greeting. That is the whole allowance.
const SIGN_ON: string[] = [
  'Good morning, Pirate Bay! The treasure map is wrong again today.',
  'Good morning, Pirate Bay! "Arrr," say the staff, for the fortieth time.',
  'Good morning, Pirate Bay! The cannon fires beach balls at eleven.',
  'Good morning, Pirate Bay! Nigel the first mate is a man called Nigel.',
  'Good morning, Pirate Bay! Lost property: one violin, one enormous hat.',
  'Good morning, Pirate Bay! Who left a flip-flop on the diving board?',
  'Good morning, Pirate Bay! Barnaby the parrot is awake and complaining.',
  'Good morning, Pirate Bay! The pudding buffet now has its own buffet.',
  'Good morning, Pirate Bay! Sandcastle judging is at three. Bring a bucket.',
  'Good morning, Pirate Bay! Lounger nine is taken for the eleventh year.',
  'Good morning, Pirate Bay! Correction: the shanty is at eleven, not ten.',
  'Good morning, Pirate Bay! Two pools, one parrot, one new water slide.',
  'Good morning, Pirate Bay! Cressida Vane gave the toast five stars.',
  'Good morning, Pirate Bay! Last night\'s conga line stopped at six.',
];

/** Ticker-friendly district names, used to fill {D}. Longest is 14 chars. */
const DIST_NAME: Record<Dist, string> = {
  port: 'the docks',
  market: 'the bazaar',
  resort: 'the resort',
  party: 'Dance Cove',
  jungle: 'the jungle',
  cove: 'Smugglers Cove',
  beach: 'Sunset Beach',
};

type Pools = [string[], string[], string[]];

// ── THE DOCKS ─────────────────────────────────────────────────────────────────
// yachts, dock hands, cargo, one seagull with ambitions, a cannon full of balls
const PORT: Pools = [[
  'Welcome to the docks, everybody. Please do mind the wet bit.',
  'A guest asked which yacht is hers. All of them, madam.',
  'The dock hands are paid to say arrr. They say it constantly.',
  'Cargo today: 400 crates. Of those, 399 hold inflatable swans.',
  'A crate marked fragile was opened. Inside were smaller crates.',
  'A seagull has taken the harbour master\'s chair and will not move.',
  'The yacht called Second Boat has docked beside First Boat.',
  'Children may steer the galleon today. The galleon does not move.',
  'Capt. Roger salutes every boat that leaves. Every single one.',
  'A guest has complained to the front desk that the sea is too wide.',
  'Maisie has given every rope on the dock a name. All of them.',
  'Barnaby the parrot bit a rope this morning. The rope started it.',
  'The cannon fired forty beach balls into the bay. Lovely, that.',
], [
  'The dock is shorter today, and the tannoy says that is cosier.',
  'A guest asked whether the void takes bookings. Nigel said yes.',
  'Nigel reports that your boat has moved. Inward. A little bit.',
  'The dock hands are saying arrr without being asked now. Worrying.',
  'Mrs Fenwick-Hyde demands a yacht with considerably more hull.',
  'Maisie waved at the purple thing and it wobbled back at her.',
  'All 399 inflatable swans have been deployed as an actual plan.',
  'The harbour has one rope left, and that rope is fraying badly.',
  'A second void has opened by the slipway. That makes two of them.',
  'The pier is a jetty now. Capt. Roger is calling that an upgrade!',
  'Please stay clear of the edge, wherever the edge happens to be.',
], [
  'The docks have GONE!! Boat hire is open as usual.',
  'The galleon has left. It did not say goodbye to anybody.',
  'Nigel is rowing away, still ticking things off his clipboard.',
  'The last crate was opened. Swans. It was always going to be swans.',
  'Maisie has named the void. She says the void is called Gary.',
  'The harbour is now one seagull standing in water, thinking.',
  'Mrs Fenwick-Hyde would like to know where she is meant to moor.',
  'Barnaby is perched on the last post, king of absolutely nothing.',
  'Capt. Roger waved off the final boat from a floating crate.',
  'The cannon fired one last beach ball. It came straight back.',
]];

// ── THE BAZAAR ────────────────────────────────────────────────────────────────
// stalls, traders, mangoes, enormous hats, and a treasure map that is wrong
const MARKET: Pools = [[
  'Barnaby the parrot rated a guest\'s enormous hat. The rating was no.',
  'Stall four sells hats. Stall five sells slightly larger hats.',
  'A genuine antique compass is for sale. It was made on Tuesday.',
  'A guest bought a mysterious pirate map. It is a lunch menu.',
  'Barnaby has learned a new phrase: speak to the manager, please.',
  'Mrs Fenwick-Hyde bought the whole spice aisle, then bought it again.',
  'Maisie traded one shell for a coconut. An excellent trade, frankly.',
  'A trader says his coconuts are vintage. They are simply damp.',
  'The bazaar closes whenever it feels like closing. No timetable.',
  'A man haggled for ten minutes, saved nothing, and beamed anyway.',
  'Cressida Vane reviewed a mango this morning and gave it six stars.',
  'The sign says everything must go. Nothing has ever gone.',
  'The treasure map on stall two leads to the treasure map on stall two.',
], [
  'The bazaar is now a bazaa, says Capt. Roger, and still charming.',
  'Barnaby is shouting directions. They are the correct directions.',
  'The stalls are on wheels now. So are the traders. So is the sign.',
  'Mrs Fenwick-Hyde asked the void whether it takes bookings.',
  'Maisie offered the void a mango. The void said yes to the mango.',
  'The everything must go sign has quietly become a documentary.',
  'Nigel reports the bazaar has relocated inward. Do mind the edge.',
  'The vintage coconuts have been marked down to the word please.',
  'Fewer stalls means easier browsing, says a beaming front desk!',
  'The wrong treasure map is now the only map. Everyone is using it.',
], [
  'The bazaar has GONE!! The gift shop is somehow thriving.',
  'Barnaby was right about everything. Barnaby is unbearable.',
  'The last trader sold the last stall to himself. A fair price.',
  'Mrs Fenwick-Hyde tried to haggle with the void and lost badly.',
  'The mangoes were the real treasure. The mangoes have gone.',
  'Maisie says he liked the mango. He did seem to like the mango.',
  'Cressida Vane writes: bazaar gone, mango unforgettable, six stars.',
  'Somebody is still following the wrong map. Good luck to them.',
  'One coconut rolled past. Nobody chased it. It was that sort of day.',
  'The hat stall has gone. The hats are enormous and easy to find.',
]];

// ── THE RESORT ────────────────────────────────────────────────────────────────
// the hotel, the big pool, the towel situation, the slowest queue on earth
const RESORT: Pools = [[
  'The spa is open. Capt. Roger has been twice and says he is radiant.',
  'A guest sent back her lemonade. She says these are the wrong bubbles.',
  'Nigel has confirmed four hundred bookings and blinked only twice.',
  'The big pool now has a smaller pool inside it. Nobody ordered that.',
  'Mrs Fenwick-Hyde has requested a quieter breeze for the terrace.',
  'A guest asked the fancy chef for toast. He made toast. He is sad.',
  'The spa has a new treatment where somebody just says nice things.',
  'Cabana twelve has been upgraded to cabana twelve plus. Same cabana.',
  'Maisie has swum forty one lengths. Staff are concerned and impressed.',
  'The water slide queue has not moved since Tuesday. Spirits are high.',
  'A guest has complained that the towels are far too neatly folded.',
  'The Gilded Lagoon insists that their pool is significantly wetter.',
  'A guest has booked the same lounger for eleven years. Lounger nine.',
  'Cressida Vane reviewed the toast at breakfast and gave it five stars.',
], [
  'Capt. Roger says the sinkhole is a feature. A water feature.',
  'Nigel reports that your suite has moved. Downward. Only slightly.',
  'The big pool has joined the small pool. The staff applauded warmly.',
  'Mrs Fenwick-Hyde paid for a sea view and has received a void view.',
  'A guest asked the front desk to cancel the void. It is noted.',
  'Maisie wanted a photo with the void. The photo is genuinely lovely.',
  'The Gilded Lagoon has offered us a sympathy rate. How dare they.',
  'Lounger nine has gone. That lounger was booked until 2039.',
  'Fewer rooms means shorter corridors, says a very calm tannoy.',
  'The lobby is open plan now. It is extremely open indeed.',
  'The water slide queue has finally moved. Everybody cheered!',
], [
  'The resort has GONE!! The spa is still taking bookings.',
  'Nigel confirmed your booking from a slowly drifting lounger.',
  'Mrs Fenwick-Hyde says this is now a three star experience.',
  'Cressida Vane writes: hotel gone, service flawless, five stars.',
  'The big pool has joined the sea. The sea seems unimpressed.',
  'The Gilded Lagoon sent flowers, and a brochure. Mostly brochure.',
  'A guest requested a late checkout and got a very early one.',
  'Maisie left the void a five star review that says he is nice.',
  'No hotel means no queues, and the tannoy calls that an upgrade.',
  'Capt. Roger is handing out spa vouchers from a lilo. A true pro.',
]];

// ── DANCE COVE ────────────────────────────────────────────────────────────────
// DJ Coconut, the conga line, the limbo, and one blazer that will not quit
const PARTY: Pools = [[
  'DJ Coconut dropped a beat. A guest dropped a smoothie. All square.',
  'Capt. Roger attempted the limbo in a full blazer. Total respect.',
  'The conga line can be seen from the hill and possibly from space.',
  'Mrs Fenwick-Hyde has requested something considerably less loud.',
  'The dance floor has reached its legal maximum amount of boogie.',
  'DJ Coconut says one more hour. It has now been nine hours.',
  'The main stage now has a second, smaller, angrier stage on it.',
  'Maisie has invented a dance. She has named it the Wobble.',
  'Nigel danced last night. Nigel did not smile. Nigel was superb.',
  'The glow sticks have been recalled for being much too glowy.',
  'A guest asked for the good song. The good song was played.',
  'The limbo pole snapped in half, so the limbo carries on lower.',
  'Barnaby was on the decks for ten seconds and is banned for life.',
], [
  'The dance floor is smaller today, which the tannoy calls intimate.',
  'DJ Coconut has switched to the nervous playlist. We all know it.',
  'The conga line has rerouted around the situation and carries on.',
  'Mrs Fenwick-Hyde asked whether that was the bass or a large void.',
  'Maisie taught the void the Wobble. The void is a natural.',
  'The speakers have been turned to face the void. Tactical, that.',
  'The party ends at eleven, or possibly a good deal sooner.',
  'The glow stick supply is now being described as emotional.',
  'A smaller floor means bigger dancing. Capt. Roger insists it is maths!',
  'The conga line is heading determinedly in the wrong direction.',
], [
  'The dance floor has been eaten!! The vibe remains untouched.',
  'DJ Coconut played one final banger and then bowed. A legend.',
  'The conga line congaed straight past the void. Extremely rude.',
  'Mrs Fenwick-Hyde danced at last, at the worst possible moment.',
  'Maisie and the void are doing the Wobble together right now.',
  'DJ Coconut is playing from a raft. The crowd is three crabs.',
  'One glow stick remains, glowing bravely on into the night.',
  'The main stage has gone. The smaller angrier stage has gone too.',
  'Capt. Roger is still conga-ing. Alone. Absolutely magnificently.',
  'Tonight is a silent disco!! Very silent. There is no floor.',
]];

// ── THE JUNGLE ────────────────────────────────────────────────────────────────
// a lost temple that is found daily, guided tours, and 31 bugs called Kevin
const JUNGLE: Pools = [[
  'The lost temple is lost. We know exactly where the lost temple is.',
  'The guided tour found the lost temple again. That is twice today.',
  'Mrs Fenwick-Hyde has asked whether the jungle has air conditioning.',
  'A monkey stole a hat. The monkey wears the hat much better.',
  'The guide led a tour in full uniform and did not sweat once.',
  'Maisie has named thirty one bugs. All thirty one are called Kevin.',
  'The zipline queue is now longer than the actual zipline itself.',
  'The guide said do not touch anything. Everybody touched everything.',
  'The temple gift shop sells small replicas of the temple gift shop.',
  'A guest has requested a jungle experience that is far less jungly.',
  'The waterfall was given four stars. The one complaint was too damp.',
  'Cressida Vane reviewed a leaf this morning and gave it six stars.',
  'The rope bridge wobbled. Everybody screamed and then did it again.',
], [
  'The canopy is now a canop, says Capt. Roger, and still very leafy.',
  'The lost temple is lost again, and this time properly lost.',
  'Mrs Fenwick-Hyde has demanded that the jungle be moved further off.',
  'The monkeys are packing. The monkeys have small suitcases.',
  'The tour is now a brisk tour. Nigel is walking very fast indeed.',
  'Maisie told the void about the temple. Helpful, in a way.',
  'The zipline now ends nowhere at all. The queue is unchanged.',
  'All thirty one Kevins are accounted for. Kevin twelve is on a leaf.',
  'Fewer trees means better views, says the front desk, standing firm!',
  'The guide led the whole tour backwards, briskly, still smiling.',
], [
  'The jungle has GONE!! Guided tours will resume at four.',
  'The lost temple has been found by a very large purple thing.',
  'The monkeys waved from a boat. A classy exit, monkeys.',
  'Mrs Fenwick-Hyde reports that there is now no shade whatsoever.',
  'Nigel is guiding a tour of the sky. It is going rather well.',
  'All thirty one Kevins are fine. Maisie counted them all twice.',
  'The waterfall is simply a fall now. It has five stars. Bold.',
  'Cressida Vane writes: jungle gone, that leaf still six stars.',
  'The temple has gone. The gift shop replicas are selling well.',
  'Capt. Roger, blazer intact, is standing on the very last branch.',
]];

// ── SMUGGLERS COVE ────────────────────────────────────────────────────────────
// a treasure hunt with a wrong map, the wreck, rock pools, a crab in management
const COVE: Pools = [[
  'Capt. Roger buries the treasure each morning and finds it by lunch.',
  'The treasure map leads to the gift shop, as it does every day.',
  'Mrs Fenwick-Hyde found a doubloon and has asked for a receipt.',
  'The wreck has been wrecked for three hundred years. Beautifully.',
  'Maisie found a crab. The crab has a job now. The crab is management.',
  'The rock pool crab is employee of the month again. Well done, crab.',
  'The treasure is somewhere in the general area. Probably.',
  'A guest asked whether the shipwreck comes with wifi. It does not.',
  'The metal detector found four hundred bottle caps and one spoon.',
  'There is nothing to smuggle in Smugglers Cove. It is lovely, though.',
  'Cressida Vane called the rock pools damp but honest. Four stars.',
  'Barnaby found the treasure first. Barnaby has said nothing.',
  'X marks the spot. The spot is a bench. It is a very good bench.',
], [
  'A smaller cove is a more exclusive cove, says the front desk.',
  'The treasure hunt is over. Something else found the treasure first.',
  'Mrs Fenwick-Hyde wants her doubloon confirmed in writing.',
  'The crabs are leaving in one very orderly line, without any fuss.',
  'Maisie showed the void the rock pools. The void approved of them.',
  'The wreck has been wrecked again, in record time, honestly.',
  'Nigel reports that the treasure has relocated inward. Do keep up.',
  'The bench that marked the spot has gone, and so has the spot.',
  'The treasure has been buried again. That is pure optimism!',
  'The map is still wrong. It is now wrong about the sea as well.',
], [
  'The cove has GONE!! The treasure hunt is still on at four.',
  'X marked the spot. The spot has now gone as well. Awkward.',
  'The crabs took the last boat. The crabs had a plan all along.',
  'The crab Maisie found has been promoted. It is a captain now.',
  'The wreck has been unwrecked by removal. That counts, apparently.',
  'Cressida Vane on the void: bold, purple, and deeply hungry.',
  'Barnaby knows where the treasure is. Barnaby still says nothing.',
  'Capt. Roger has drawn a fresh X on the water. Real commitment.',
  'Mrs Fenwick-Hyde has lost her doubloon and would like a form.',
  'The treasure is out there somewhere. Somewhere inward, sadly.',
]];

// ── SUNSET BEACH ──────────────────────────────────────────────────────────────
// umbrellas, sandcastles, a lifeguard with nothing to do, eleven flip-flops
const BEACH: Pools = [[
  'The lifeguard has rescued nobody all week and is absolutely thrilled.',
  'Mrs Fenwick-Hyde has requested less sand, and ideally none at all.',
  'The sandcastle contest was won by a nine year old for the third time.',
  'Umbrella twelve flipped inside out. The beach applauded warmly.',
  'The sandcastle Maisie built has a moat, a spa and a gift shop.',
  'Nigel rakes the sand into perfect lines. Nobody asked him to.',
  'A guest has asked whether the sunset could happen a bit earlier.',
  'The tide has taken eleven flip-flops. There are no matching pairs.',
  'Every towel was claimed by seven in the morning. Every single one.',
  'Cressida Vane rated last night\'s sunset and gave it four stars.',
  'The ice cream van plays one song. Only one. For ever and ever.',
  'A guest complained that the sand gets everywhere. It is sand.',
  'Barnaby stole a chip. Barnaby has always stolen the chip.',
], [
  'The beach is shorter today. The tannoy is calling it a beachlet.',
  'The lifeguards are now guarding the land and the ice cream hut.',
  'Mrs Fenwick-Hyde says the sand is leaving and somebody must act.',
  'Maisie built a sandcastle for the void and it fits perfectly.',
  'The umbrellas have been repositioned defensively by Nigel.',
  'Nigel rakes on. The sand is going. Nigel rakes on regardless.',
  'The sunset has been moved earlier by popular demand, sort of.',
  'The ice cream van has moved. The song is unchanged. It is eternal.',
  'Less beach means less sand in your sandwich. A win, says Capt. Roger.',
  'Somebody has moved their towel twice and is being talked about.',
], [
  'The beach has GONE!! The sunset is on time. You are welcome.',
  'The lifeguard finally has something to do. He politely declines.',
  'Mrs Fenwick-Hyde would like to know where she should put her towel.',
  'The sandcastle Maisie built survived it all. Of course it did.',
  'All eleven flip-flops are accounted for and still unmatched.',
  'Nigel is raking the sea. It is going surprisingly well for him.',
  'The ice cream van is playing that same one song from a raft.',
  'Cressida Vane writes: sunset four stars, beach entirely absent.',
  'Sunbathing continues as normal. Please bring your own beach.',
  'Capt. Roger, on a lilo, in a blazer, is still taking bookings.',
]];

const BY_DIST: Record<Dist, Pools> = {
  port: PORT, market: MARKET, resort: RESORT,
  party: PARTY, jungle: JUNGLE, cove: COVE, beach: BEACH,
};

// ── GENERAL RESORT ANNOUNCEMENTS ──────────────────────────────────────────────
// The arc in miniature. Tier 0 opens on ordinary resort news — nobody has
// connected a single dot — and only then slides into flat denial. Tier 1 is
// dawning horror said with a smile. Tier 2 is everything gone and still an
// upsell.
const GENERAL: Pools = [[
  // ── BEAT 2 · DENIAL. It is a water feature and the resort adores its guest. ──
  'The pudding buffet has a queue of forty people and one parrot.',
  'Mrs Fenwick-Hyde would like a word with the manager about the sea.',
  'A guest has bought a genuine antique compass made last Tuesday.',
  'Nigel has raked the beach into perfect stripes. Nobody asked him to.',
  'The purple thing by the pool is a water feature, says the front desk.',
  'Has anyone seen the ice bucket from lounger nine?',
  '"It is a puddle," says Capt. Roger. "A deep and purple puddle."',
  'Correction: the beach ball cannon fires at eleven, not at ten.',
  'Missing: one deckchair, one towel and one paperback.',
  'Barnaby the parrot has learned a new phrase: speak to the manager.',
  'A monkey has taken a guest\'s enormous hat and it suits him.',
  'Maisie says there is a hole by the pool. Staff gave her a smoothie.',
  'The treasure was buried at nine and found by Capt. Roger at ten.',
  'The purple thing has been given a wristband and a locker key.',
  'The lifeguard has rescued nobody all week and could not be happier.',
  'The crab in charge of the rock pools is employee of the month.',
  'Staff say arrr at breakfast, at lunch and at the fire drill.',
  'Shadow. That is all it is, says the tannoy, for the ninth time today.',
  'A guest sent back her lemonade for having the wrong bubbles.',
  'The wrong treasure map now leads to the towel hut. Nobody minds.',
  'Cressida Vane has reviewed a mango and given it six stars.',
  'The Gilded Lagoon says their sand is softer. Their sand is not.',
  'A guest asked to cancel the purple thing. The request has been noted.',
  'DJ Coconut says one more hour. He has said that since Tuesday.',
  'The water slide queue has not moved once all morning.',
  'Management does not do purple, says a small sign at the front desk.',
  'A seagull has taken the harbour master\'s chair and will not budge.',
  'Maisie has named thirty one beetles and every one is called Kevin.',
  'Have an ice cream. There is nothing by the pool worth looking at.',
  'Every towel on the island was claimed before seven this morning.',
], [
  // ── BEAT 3 · ALARM. The evacuation is a fun walk. Everything is fine, loudly. ──
  'The evacuation is a fun walk. Please walk it quite briskly.',
  'Your suite has moved inward by two metres, says Nigel, calmly.',
  'Half the bazaar has gone. The other half is having a lovely time.',
  '"Nothing is wrong," says Capt. Roger, walking rather fast.',
  'Was that the bass, or was that the purple thing again?',
  'Correction: the water feature is now eating the tennis court.',
  'Missing: the pier, the parasols and the ice cream hut\'s front door.',
  'Maisie gave the purple thing a biscuit and it wobbled with joy.',
  'The conga line has rerouted around the hole and carries on.',
  'Barnaby has learned the word evacuate and will not stop saying it.',
  'Mrs Fenwick-Hyde paid for a sea view and now has a purple view.',
  'DJ Coconut has one more hour and considerably less dance floor.',
  'This is not an evacuation. It is a lovely group stroll!',
  'The cannon fired a beach ball at the hole. The hole ate the ball.',
  'Lounger nine has gone, halfway through its eleventh year.',
  'Two hundred guests are speed-walking to the boats, very elegantly.',
  'The Gilded Lagoon is advertising hole-free weekends. How smug.',
  'The water slide queue moved at last. So did the water slide.',
  'Kids club at three is waving at the hole from a very safe distance.',
  '"Everything is fine," says the tannoy, at a much higher volume.',
  'The towel man is now carrying every towel on the island at once.',
  'Half of Smugglers Cove is missing and the treasure hunt is still on.',
  'The monkeys have packed small suitcases and are queuing for a boat.',
  'Capt. Roger is smiling so hard that his hat has come loose.',
  'The ice cream van is playing its one song a little faster now.',
  'A guest asked if the hole takes bookings. Nigel said yes, for August.',
  'Please do not feed the purple thing. It has eaten. It has eaten LOADS.',
  'The breakfast tent has gone with the breakfast still inside it.',
  'There are two purple holes now. We are not discussing the second one.',
  'Cressida Vane gave the hole two stars for taking her starter.',
], [
  // ── BEAT 4 · PANIC. The island is going and the spa is still taking bookings. ──
  'The whole bazaar has gone!! The gift shop is doing record trade.',
  'Nigel is at the front desk. The front desk is now a floating deckchair.',
  'Barnaby has been saying hole since breakfast. Barnaby is unbearable.',
  'Mrs Fenwick-Hyde would like a word with the manager of the ocean.',
  'The buffet has gone!! Even the melon. ESPECIALLY the melon.',
  'Maisie has adopted the purple thing and named him Gary.',
  '"Do book for next year," says Capt. Roger, waist deep in the sea.',
  'Has anyone seen the island, the pier, or the second water slide?',
  'Lost property: one island, eleven flip-flops, no matching pairs.',
  'DJ Coconut is playing to three crabs from a raft and loving it.',
  'The conga line is congaing along the jetty, which is quite short now.',
  'One beach ball came back out of the hole. Nobody has claimed it.',
  'Correction: there are three purple holes now, not two.',
  'The Gilded Lagoon has gone very quiet across the bay.',
  'Cressida Vane writes: island eaten, service perfect, four stars.',
  'The spa has gone. The spa is STILL taking bookings.',
  'Nigel is raking the sea and says it is going rather well.',
  'The resort cat is fine. Somebody has checked on the cat twice.',
  'Every child in kids club has drawn a picture of the hole.',
  'The last crate on the dock was opened and it was inflatable swans.',
  'The lost temple was found at noon and eaten by half past.',
  'Weather tomorrow: sunny, warm, breezy, and no island at all.',
  'Sport: the sandcastle final is off. There is no sand left to build on.',
  'Maisie says Gary is only hungry, and Maisie is probably right.',
  'Capt. Roger is upselling the sunset cruise from a yellow lilo.',
  'The towel man has rowed off with every towel and his enormous hat.',
  'Mrs Fenwick-Hyde says this is now a three star holiday.',
  'The ice cream van is playing its one song from a pedalo.',
  'Only the flagpole is left!! The flag is doing its very best.',
  'The last coconut rolled past and nobody chased it.',
]];

// ── BEAT 4 · SIGN-OFF ─────────────────────────────────────────────────────────
// The island is gone and the broadcast is still doing the weather. These are the
// *last words* of the arc, so they only go on air once the match is genuinely
// over the hill — see `endgame` in pickNews, which reads devouredPct and
// secondsLeft directly. A seven day forecast at 18% devoured is a lie.
// Punctuation drops back to at most one "!": this is a goodbye, not a panic.
const SIGN_OFF: string[] = [
  'Goodbye from Pirate Bay, wherever Pirate Bay has got to.',
  'Tomorrow: sunny, warm, and still no island. Sleep well, everybody.',
  'Capt. Roger is reading the forecast from a floating door. It is sunny.',
  'Nigel has taken one final booking and is rowing home now.',
  'Maisie waves, Gary waves, and the crabs wave from the boat.',
  'Thank you for staying with us and do leave a lovely review.',
  'Over to the sea now, which is where the resort used to be.',
  'The conga line reached the boats and is still going strong.',
  'Same time next year, friends! Do bring a slightly bigger boat.',
  'The tannoy is signing off from a pool float. Goodnight, all.',
];

// ── WHAT IT JUST ATE ──────────────────────────────────────────────────────────
// ctx.lastMeal is free text from the call site. It never says "a boat" or "a
// person" — the game only tags HOUSE and CAR, and sizes everything else — so
// these four buckets are everything the API can actually tell us apart.
// A bite the player just took should be in the news within seconds of it.
export type MealKind = 'house' | 'car' | 'big' | 'small';

const MEAL_HOUSE: Pools = [[
  // ── BEAT 2 · DENIAL ──
  'It ate {M}, so Nigel has marked the room as cleaned.',
  'Villa four has gone. Villa five is pretending not to notice.',
  'Was that a whole house? Staff call it a very late checkout.',
  'No chewing, no manners, and {M} went straight down.',
], [
  // ── BEAT 3 · ALARM ──
  'It ate {M}. Three now. Nigel is quietly counting.',
  'Villa five has stopped pretending.',
  'In went {M}, doorbell ringing the whole way down.',
  'Mrs Fenwick-Hyde says {M} was hers. She napped in there.',
], [
  // ── BEAT 4 · PANIC ──
  'It ate {M}, so the front desk is offering you a tent.',
  'That was {M}, and its doorbell is still ringing.',
  'Villa five has GONE!! It was right about everything.',
  'Lost property: one gate, one doormat and {M}.',
]];

const MEAL_CAR: Pools = [[
  // ── BEAT 2 · DENIAL ──
  'It ate {M} and the valet insists he left it right there.',
  'Wheels first, alarm going, gone. That was {M}.',
  'One bite, one burp, and the bay applauded politely.',
  'Has anybody lost a car? Nigel has filed it under valet parking.',
], [
  // ── BEAT 3 · ALARM ──
  'It ate {M}, so the car park is simply a park now.',
  'That was {M}, and it honked all of the way down.',
  'Mrs Fenwick-Hyde says {M} was her second favourite.',
  'Cars are loud anyway, says Capt. Roger. Good riddance to them.',
], [
  // ── BEAT 4 · PANIC ──
  'The valet has found the keys!! He has not found the car.',
  'It ate {M} and its radio is still playing down there.',
  'That was {M}. No cars means no traffic. A holiday, really.',
  'Car park inventory: one cone, one puddle, one lost glove.',
]];

const MEAL_BIG: Pools = [[
  // ── BEAT 2 · DENIAL ──
  'It ate {M} and the ground said whump. A very good whump.',
  'That was {M}, and it was in every single brochure.',
  'Everybody felt {M} go, right in the knees.',
  'Was that the water slide? It was the water slide.',
], [
  // ── BEAT 3 · ALARM ──
  'It ate {M} and the whole bay wobbled. We all wobbled.',
  'Mrs Fenwick-Hyde has learned that {M} was the spa.',
  'Down went {M}, sounding exactly like a bath draining.',
  'The brochures are being reprinted. Again. Much thinner now.',
], [
  // ── BEAT 4 · PANIC ──
  'The new brochure has one photo!! It is a photo of the sea.',
  'The water slide has gone, and the queue has not moved.',
  'It ate {M} very slowly, and then had a little sit down.',
  'Biggest bite yet: {M}. Everything else looks small now.',
]];

const MEAL_SMALL: Pools = [[
  // ── BEAT 2 · DENIAL ──
  'It ate one flip-flop and left the other on the beach.',
  'It ate {M}. One tiny burp. Honestly rather cute.',
  'Missing from lounger nine: one towel, one book and {M}.',
  'Nobody minds about {M}. Staff are entirely unbothered.',
], [
  // ── BEAT 3 · ALARM ──
  'Still snacking on bins, cones and {M}.',
  'It ate {M}, burped, then took another one.',
  'Only {M}? The tannoy says we have loads of those.',
  'It ate the ice bucket with all of the ice still in it.',
], [
  // ── BEAT 4 · PANIC ──
  'The other flip-flop has gone. A matching pair at last.',
  'It ate {M}, which by now counts as a crumb.',
  'It ate the last umbrella. It did not want it. It ate it anyway.',
  'Down to the last crumbs!! It has just eaten {M}.',
]];

const BY_MEAL: Record<MealKind, Pools> = {
  house: MEAL_HOUSE, car: MEAL_CAR, big: MEAL_BIG, small: MEAL_SMALL,
};

/** classify ctx.lastMeal into one of the four buckets the API can distinguish. */
export function mealKind(meal: string): MealKind {
  const s = (meal || '').toLowerCase();
  if (s.includes('house') || s.includes('villa') || s.includes('hut')) return 'house';
  if (s.includes('car') || s.includes('truck') || s.includes('van')) return 'car';
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
  'The {F} at {D} now has an all you can eat wristband.',
  'Lost property: one towel, one sandal and {M}.',
  'Is the purple thing at {D} new? Management says it is a pool.',
  'Nigel logged the {F} as a guest, a feature, then a water feature.',
  'Mrs Fenwick-Hyde was using {M}. She would like a word.',
  'Cressida Vane on {M}: gone in one go, six stars.',
  'Maisie fed the {F} one chip. She says it wanted only the one.',
  'A {F} checked in at {D} with no bags and no booking.',
  'Delightful. A {F} is swimming at {D} for free.',
  'Staff have listed the {F} at {D} under water features.',
  'Correction: the {F} at {D} is a feature, not a guest.',
  'Barnaby watched the {F} eat {M}. Loudly.',
  'Today at {D}: sun, snacks, a shanty and one {F}.',
  'It ate {M}. Nigel logged it. Nigel logs everything.',
  'Review of {D}: five stars, one {F}, still five stars.',
  'The pool at {D} has a hole. Capt. Roger calls that two pools.',
  'Kids club at {D}: draw the {F} from a safe distance.',
], [
  // ── BEAT 3 · ALARM ──
  'We are evacuating {D}. Slowly. With ice creams.',
  'How big is the {F} now? Smallish, says the tannoy.',
  '{P}% of the resort has gone and the pudding buffet is unaffected.',
  'Mrs Fenwick-Hyde says {P}% rounds down to nothing at all.',
  'Correction: {D} has not closed. It has moved inward.',
  'It ate {M}. Somebody owned that. Somebody is upset.',
  'Maisie has named the {F} and it comes when she calls.',
  'The wristband said all you can eat. Nobody expected {M}.',
  'Do not book {D}, which is where the {F} lives now.',
  'The {F} at {D} has asked for a second wristband.',
  'Missing at {D}: one queue, one slide and one lost bucket.',
  'The Gilded Lagoon has asked how {D} is coping. Rude.',
  '{P}% has gone and the other {R}% is queuing for ice cream.',
  'A second {F} has been reported at {D}. That makes two.',
  'Nigel says {D} has moved inward, only slightly, and is fine.',
  'This is not an evacuation at {D}. This is a fun walk!',
  'The {F} ate {M} and would like the menu.',
], [
  // ── BEAT 4 · PANIC ──
  'The {F} ate {D}!! Every towel there was reserved.',
  '{P}% devoured. The other {R}% is queuing for a boat.',
  'The {F} ate {M} and asked about pudding.',
  'There are {S} seconds left, so do finish your ice creams.',
  'Is the spa still open? The spa is still taking bookings.',
  'Mrs Fenwick-Hyde says she was using {M}.',
  'A {F} now owns {P}% of this five star resort outright.',
  'The wristband did say all you can eat. Our mistake, madam.',
  'Maisie says it only wanted one chip. That was {P}% ago.',
  'Nigel has confirmed the {F} for a very late checkout.',
  'Gone. The {F} took {D} and most of the car park.',
  'There are {S} seconds left and the buffet is still on.',
  'Still on the island: one flag, one lilo and one {F}.',
  'Cressida Vane, final review of {D}: eaten, four stars.',
  'The tannoy says {P}% gone leaves {R}% of paradise intact.',
  'There are two of them at {D} now. Two. We are all leaving.',
  'DJ Coconut says one more hour. There are {S} seconds left.',
]];

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
 * false until BAY RADIO has said good morning. The FIRST pickNews() call of a
 * match always returns the sign-on and nothing else can jump ahead of it —
 * resetNews() puts the station back off air, and resetMatch() calls that.
 */
let signedOn = false;
let signedOff = false;   // the station has said goodnight; it does not come back

/** clears the anti-repeat memory — call between matches if you like. */
export function resetNews(): void {
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

function bind(ctx: NewsCtx): Filled {
  // ONE rounded percentage drives both {P} and {R}. Rounding them separately is
  // how a newsroom ends up saying "1% gone, the other 100% is nervous".
  const pct = Math.min(99, Math.max(1, Math.round(ctx.devouredPct || 0)));
  // NOTE: ctx.rivalName / ctx.rivalLead are NOT read here, on purpose. See the
  // note on NewsCtx. A guest cannot know another void's name, so the newsroom
  // has no way to say one.
  return {
    pct,
    rest: 100 - pct,
    form: clip(ctx.form || 'VOIDLING', 14),
    meal: clip(ctx.lastMeal || 'the buffet', 22),
    dist: ctx.district ? DIST_NAME[ctx.district] : 'Pirate Bay',
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
 * printing "{L} is ahead by {G}" at a seven year old.
 */
function tokensAreKnown(t: string): boolean {
  TOKEN.lastIndex = 0;
  for (let m = TOKEN.exec(t); m; m = TOKEN.exec(t)) {
    if (!KNOWN_TOKEN.test(m[1])) return false;
  }
  return true;
}

/** a countdown line at 2:40 remaining is a weather report, not a panic. */
function usable(t: string, ctx: NewsCtx): boolean {
  if (!tokensAreKnown(t)) return false;
  if (t.includes('{S}') && ctx.secondsLeft > 70) return false;
  return true;
}

const clampTier = (t: number): NewsTier => (t <= 0 ? 0 : t >= 2 ? 2 : 1);

/**
 * One fully-formed headline, ready to drop straight into the ticker.
 *
 * THE ARC. Four beats, and the picker has the signal for all four:
 *   1 SIGN-ON   the first call of every match. Good morning + real resort news.
 *   2 DENIAL    tier 0 — ordinary news beside a flat denial. Have an ice cream.
 *   3 ALARM     tier 1 — dawning horror, cheerfully. The evacuation is a walk.
 *   4 PANIC     tier 2 — everything gone, still upselling, then the forecast.
 * `tier` is derived at the call site from devouredPct AND the player's form, so
 * a WORLD ENDER never gets a beat-2 line. Beat 1 is ours to guarantee.
 *
 * Weighted ~34% district / ~22% what-it-just-ate / ~28% live / ~16% general
 * when we know where the player is; meal-and-live-heavy when we don't.
 */
export function pickNews(ctx: NewsCtx, rnd: () => number = Math.random): string {
  const tier = clampTier(ctx.tier);
  const b = bind(ctx);

  // BEAT 1. Nothing gets on air before good morning.
  if (!signedOn) {
    signedOn = true;
    const raw0 = SIGN_ON[Math.floor(rnd() * SIGN_ON.length) % SIGN_ON.length] ?? SIGN_ON[0];
    const out0 = clip(raw0, TICKER_MAX);
    remember(raw0, out0);
    return out0;
  }

  const districtPool = ctx.district ? BY_DIST[ctx.district][tier].filter((t) => usable(t, ctx)) : [];
  const mealPool = BY_MEAL[mealKind(ctx.lastMeal)][tier].filter((t) => usable(t, ctx));
  const livePool = LIVE[tier].filter((t) => usable(t, ctx));
  const generalPool = GENERAL[tier].filter((t) => usable(t, ctx));
  // BEAT 4 gate. tier 2 starts as low as 18% devoured, which is far too early
  // for "goodbye, and here is the seven day forecast" — so the sign-off waits
  // for the match to be genuinely over the hill.
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
export function newsLineCount(): number {
  const all: Pools[] = [PORT, MARKET, RESORT, PARTY, JUNGLE, COVE, BEACH, GENERAL, LIVE,
    MEAL_HOUSE, MEAL_CAR, MEAL_BIG, MEAL_SMALL];
  return SIGN_ON.length + SIGN_OFF.length
    + all.reduce((n, p) => n + p[0].length + p[1].length + p[2].length, 0);
}

/**
 * QA hook. Every raw template in the paper, tagged with the beat it belongs to,
 * so a harness can assert the house style without reaching into module privates.
 * beat 1 = sign-on, 2 = denial (tier 0), 3 = alarm (tier 1), 4 = panic (tier 2),
 * 5 = sign-off.
 */
export function newsAudit(): { beat: 1 | 2 | 3 | 4 | 5; pool: string; line: string }[] {
  const out: { beat: 1 | 2 | 3 | 4 | 5; pool: string; line: string }[] = [];
  for (const line of SIGN_ON) out.push({ beat: 1, pool: 'SIGN_ON', line });
  const pools: [string, Pools][] = [
    ['PORT', PORT], ['MARKET', MARKET], ['RESORT', RESORT], ['PARTY', PARTY],
    ['JUNGLE', JUNGLE], ['COVE', COVE], ['BEACH', BEACH], ['GENERAL', GENERAL],
    ['LIVE', LIVE], ['MEAL_HOUSE', MEAL_HOUSE], ['MEAL_CAR', MEAL_CAR],
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
