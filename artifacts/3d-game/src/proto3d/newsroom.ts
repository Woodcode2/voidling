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
  'Good morning! The boat parade sets off at noon, as it always does.',
  'Good morning! Staff have said arrr eleven times before breakfast.',
  'Good morning! Breakfast is a buffet. It has always been a buffet.',
  'Good morning! Sandcastle contest at three. Please bring a bucket.',
  'Good morning! Two pools, one parrot, and a brand new water slide.',
  'Good morning! Today we have sun, snacks and a shanty at eleven.',
  'Good morning! The spa has a new towel man. His name is also Roger.',
  'Good morning! Lost property has one violin and one enormous hat.',
  'Good morning! The treasure hunt starts at ten. The map is wrong.',
  'Good morning! Nigel is the first mate. Nigel is a man named Nigel.',
  'Good morning! The ice cream hut opens at nine, which is very soon.',
  'Good morning! Last night\'s conga line has only just stopped.',
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
  // ── ordinary resort news. Nothing is wrong. Nothing has ever been wrong. ──
  'Welcome to Pirate Bay. Capt. Roger is barely a captain at all.',
  'The buffet now has a second buffet, and that one is only puddings.',
  'Nigel the first mate has not blinked since Tuesday. What a man.',
  'Ninety eight guests are happy. The other two say the sea is salty.',
  'The Gilded Lagoon claims their sunsets are sharper. They are not.',
  'Today\'s activities: absolutely nothing, beautifully scheduled.',
  'A small purple dot was seen by the pool. Staff assume it is a guest.',
  'Maisie has asked if she may keep the purple thing. It is pending.',
  'Lost property today: two hats, one violin and somebody\'s uncle.',
  'Barnaby was fired this morning and rehired again before lunch.',
  'Mrs Fenwick-Hyde asked for the manager and was given Capt. Roger.',
  'Weather today: perfect. Weather tomorrow: also perfect. Standard.',
  'The wristbands now come with a smaller wristband. Nobody knows why.',
  'A guest rated the island ten out of ten and would island again.',
  'Staff briefing: smile, point at the sea, repeat until sunset.',
  'The resort cat has a suite of its own and pays for nothing.',
  'DJ Coconut has been declared a national treasure by DJ Coconut.',
  'Kids club today: making friends with absolutely anything at all.',
  'The eleven o\'clock shanty went ahead. Attendance was everybody.',
  'Cressida Vane reviewed the breakfast eggs and gave them six stars.',
  'A guest asked for a quieter breeze. The terrace is looking into it.',
  'Nigel is the first mate. Nigel is also just a man called Nigel.',
  'A guest has arrived with a hat so enormous it needs its own chair.',
  'The pirate cannon has been repurposed to launch beach balls.',
  'The parrot repeated a guest complaint back at the guest. Awkward.',
  'Every member of staff has said arrr today. Nigel said it sadly.',
  'The towel situation is the real story today, says the front desk.',
  'A guest would like to speak to the manager about the sea.',
  // ── BEAT 2 · DENIAL. There is a void. There is absolutely not a void. ──
  'Please do not mind the void. Do enjoy an ice cream instead.',
  'That is not a void. That is a new pool, and there is no charge.',
  'Nigel says there is no void, madam. It is a shadow. A big one.',
  'The void is not on the resort map, so there is no void. Simple.',
  'Management says we do not do purple here. The case is closed.',
  'A guest saw a void. That same guest also saw a mermaid on Monday.',
  'Barnaby squawked that it is a void and was sent to his perch.',
  'Nobody is being eaten. The front desk says that is only a rumour.',
  'The void ate a deckchair. We are calling that a laundry matter.',
  'Mrs Fenwick-Hyde stepped in it and is blaming her sandals.',
  'Maisie said there is a void. Staff said there is a smoothie hut.',
  'A cold smoothie solves most things, and Capt. Roger insists on it.',
], [
  // ── BEAT 3 · ALARM. Dawning horror, delivered cheerfully. One "!" max. ──
  'Please do not feed the void. It has eaten. It has definitely eaten.',
  'Nigel says the island is smaller but your room is the same size.',
  'Everything is fine, and is now being said at a higher volume.',
  'Mrs Fenwick-Hyde would like to speak to whoever runs the void.',
  'Guests are reminded that the void is not part of the water park.',
  'The Gilded Lagoon is advertising void-free weekends. So smug.',
  'Maisie fed the void a biscuit. We said do not. She did anyway.',
  'A small hiccup, friends. Do please enjoy the enormous buffet!',
  'Barnaby has learned the word evacuate and absolutely loves it.',
  'The staff meeting was held entirely at a brisk, dignified walk.',
  'Cressida Vane gave the void two stars. It took her starter.',
  'Kids club is full. The three o\'clock activity is feeding the friend.',
  'DJ Coconut has moved to the tense playlist. Everybody noticed.',
  'We are not evacuating. We are mingling outward, says Capt. Roger.',
  'Nigel has confirmed in writing, twice, that nothing is wrong.',
  'Do not feed it. The front desk says the void is on a schedule.',
  'Nobody here is worried. This is simply my worried hat, says Roger.',
  'The void is now part of the entertainment programme. Officially.',
  'This is not an evacuation. This is a fun walk, says the tannoy!',
  'There is no void. Also, please do not go anywhere near the void.',
  'Oh dear. It ate the breakfast tent with the breakfast still in it.',
  'Nigel says we have always had a void. It is very old. It is fine.',
  'Guests are jogging to the boats. We are calling it a morning jog.',
  'Stay calm. Management is calm. Look how calm management is.',
  'The fun walk is now a fun run. Same fun, considerably more legs.',
  'It burped and the whole bay heard it. It smelled of melon. Sorry.',
  'Nobody panic. Panicking is not included in your package.',
  'Capt. Roger said oh dear, and then remembered to say arrr.',
  'There is a second void now. We are not going to talk about that.',
  'A guest counted the voids and got to three. She has stopped now.',
  'The towel situation has resolved itself. There are no towels.',
  'The water slide queue has gone. So has the water slide. Sorry.',
], [
  // ── BEAT 4 · PANIC. Everything is gone and the upselling continues. ──
  'Everything has GONE!! Do book now, while there is still a now.',
  'Nigel is at the front desk. The front desk is now on the water.',
  'Barnaby was right. Barnaby was always right. Barnaby knows it.',
  'Mrs Fenwick-Hyde would like to speak to the manager of the ocean.',
  'The Gilded Lagoon has gone very quiet. That is quite something.',
  'Maisie has adopted the void. Its name is Gary. Paperwork pending.',
  'Cressida Vane, final review: ate the island, lovely staff, four stars.',
  'Bay Radio is broadcasting from a pool float. The signal is excellent.',
  'DJ Coconut is seeing us all out from a raft. A total professional.',
  'A guest asked about the wifi. There is no wifi. There is no lobby.',
  'The resort has one star: was eaten, but otherwise really lovely.',
  'Kids club update: every single child drew a picture of the void.',
  'Capt. Roger remains in the blazer, smiling, and still upselling.',
  'The buffet has GONE!! All of it. Even the melon. Especially that.',
  'Lost property: one island. Please enquire at the front desk.',
  'Goodbye from Pirate Bay. Do please leave us a lovely review.',
  'Same time next year, friends!! Do bring a slightly bigger boat.',
  'It has all gone. Have you considered our spa package, madam?',
  'Capt. Roger, waist deep, is reading out tomorrow\'s activities.',
  'The first mate remains, technically and legally, a first mate.',
  'It ate the buffet, the ice cream hut, and the towel man\'s hat.',
  'Somebody burped and it was not a person. We are all leaving now.',
  'Still no void!! Just a very large amount of missing island.',
  'Another void has opened beside the first. They are MULTIPLYING.',
  'There are three of them now. Three. We have stopped counting.',
  'The resort cat got out. The resort cat is fine. We checked twice.',
  'Nigel has taken a booking for August from a floating deckchair.',
  'The conga line is still going. It is congaing out to sea now.',
]];

// ── BEAT 4 · SIGN-OFF ─────────────────────────────────────────────────────────
// The island is gone and the broadcast is still doing the weather. These are the
// *last words* of the arc, so they only go on air once the match is genuinely
// over the hill — see `endgame` in pickNews, which reads devouredPct and
// secondsLeft directly. A seven day forecast at 18% devoured is a lie.
// Punctuation drops back to at most one "!": this is a goodbye, not a panic.
const SIGN_OFF: string[] = [
  'Capt. Roger, floating on a door, reads out the weather. Sunny.',
  'The forecast tomorrow: sunny, warm, and no island. Lovely anyway.',
  'Goodbye. Tonight in Dance Cove there is nothing at all. Be there.',
  'The island has gone and the seven day forecast is going ahead.',
  'We are a boat resort now. We always were a boat resort. Arrr.',
  'Nigel, standing on water, has taken a booking for August. Calm man.',
  'Maisie waves. Gary waves. Everybody waves. A lovely end, really.',
  'And now the sea, which is where the resort used to be. Back to you.',
  'Bay Radio is signing off. The dance floor was open. It WAS open.',
  'Goodbye from Pirate Bay, wherever Pirate Bay has gone.',
];

// ── WHAT IT JUST ATE ──────────────────────────────────────────────────────────
// ctx.lastMeal is free text from the call site. It never says "a boat" or "a
// person" — the game only tags HOUSE and CAR, and sizes everything else — so
// these four buckets are everything the API can actually tell us apart.
// A bite the player just took should be in the news within seconds of it.
export type MealKind = 'house' | 'car' | 'big' | 'small';

const MEAL_HOUSE: Pools = [[
  'A house has gone. Nigel has marked the room as cleaned.',
  'A whole HOUSE. Staff are calling it a very late checkout.',
  'A house went down in one gulp, with no chewing and no manners.',
  'Staff villa four is missing. Villa five has gone very quiet.',
], [
  'Another house. That is three houses. Nobody at all is counting.',
  'A house went in whole. The doorbell rang on the way down. Eek.',
  'Houses are optional at a resort, says a very relaxed tannoy.',
  'Mrs Fenwick-Hyde says that was a HOUSE. She had a nap in there.',
], [
  'Every house has gone. Capt. Roger is offering a tent instead.',
  'The last house went in sideways. It did not fit. It went anyway.',
  'The houses have GONE!! Nigel is still turning down the beds.',
  'No houses means no housework. Do think positive, friends.',
]];

const MEAL_CAR: Pools = [[
  'A parked car has gone. The valet insists he put it somewhere.',
  'A car went in wheels first. Its alarm went off inside it. Rude.',
  'A guest car is missing. Nigel has logged it as valet, extreme.',
  'A car. One bite. One burp. The bay applauded politely.',
], [
  'Another car gone. The car park is now a park. A very nice park.',
  'A car went down honking. It honked all of the way down.',
  'Mrs Fenwick-Hyde says that was her second favourite car.',
  'Cars are terribly loud anyway, says the front desk. Good riddance.',
], [
  'The last car has been eaten. Its alarm is still going somewhere.',
  'The car park has gone, and so has booth two. Trev is fine.',
  'No cars means no traffic!! The tannoy calls that a holiday.',
  'A car went in and its radio kept playing. It is STILL playing.',
]];

const MEAL_BIG: Pools = [[
  'A whole building has gone. Nigel blinked. Nigel actually blinked.',
  'Something enormous went in and the ground said whump. Good whump.',
  'A landmark is missing. It was in every one of the brochures.',
  'That was a big one. Everybody felt it in their knees. Everybody.',
], [
  'A building went down whole. The bay wobbled. We all wobbled.',
  'Capt. Roger says the big one was ugly anyway, and that was him.',
  'Mrs Fenwick-Hyde asks whether that was the spa. It was the spa.',
  'It ate something enormous. It sounded like a bath draining.',
], [
  'The last big thing has gone. It went in slowly. Very slowly.',
  'Everything big has GONE!! Only the small things are left now.',
  'The galleon went in last. It was not a real galleon. Still sad.',
  'The biggest bite yet. It had a little sit down afterwards.',
]];

const MEAL_SMALL: Pools = [[
  'It ate a bin. One bin. One tiny burp. Honestly rather cute.',
  'A lounger is missing, and so is the towel, and so is the book.',
  'A small snack was taken by the pool. Staff are not bothered.',
  'It ate one flip-flop. The other is still on the beach. So sad.',
], [
  'Still snacking. Bins, cones, and somebody\'s entire enormous hat.',
  'It ate a deckchair, burped, then took another deckchair. Rude.',
  'It only ate a small thing, says the tannoy. We have hundreds.',
  'It ate the ice bucket with the ice still in it. Awful crunching.',
], [
  'Nothing big is left. It is eating crumbs now. Loud, angry crumbs.',
  'It ate the last umbrella. It did not even WANT the umbrella.',
  'Down to bits and bobs. It is HOOVERING the beach. Genuinely.',
  'The last snack was one melon. It was always going to be melon.',
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
  'Capt. Roger says the {F} is a guest and should be given space.',
  'A {F} was seen at {D}. Staff waved and it waved back.',
  'It ate {M}. Nigel has logged this under turndown service.',
  'Maisie fed the {F}. The {F} said thank you, probably.',
  'Guest review of {D}: five stars, one void, still five stars.',
  'Lost property: {M}. Found property: nothing at all today.',
  'The {F} is themed. Everything at this resort is themed.',
  'Mrs Fenwick-Hyde asks if {M} was included in her package.',
  'Guests were asked if the purple thing is bigger. {P}% said yes.',
  'A {F} has checked in with no booking and no luggage at all.',
  'Cressida Vane reviewed {M}. Her note says: eaten, bravo.',
  'Nigel confirmed your booking at {D}. And the {F}\'s.',
  'Barnaby saw a {F} at {D} and told everybody. Loudly.',
  'Staff are calling it a {F} now. Staff named it themselves.',
  'A {F} was offered a lounger. The {F} politely declined.',
  'A {F} at {D}. How delightful. Please do not approach it.',
  'The {F} at {D} has been given a wristband. It fits.',
], [
  'A {F} at {D}? The front desk calls that a feature.',
  'We are evacuating {D}. Politely. With ice creams. In one line.',
  'It ate {M}. Somebody owned that. Somebody is very upset.',
  '{P}% of the resort has gone. The buffet is still on, though.',
  'Mrs Fenwick-Hyde says {P}% is basically none percent, surely.',
  'Do not book {D}. That is exactly where the {F} is.',
  'Maisie has named the {F} and it answers to the name now.',
  'Nigel reports that {D} has moved inward. Only slightly.',
  'A {F} ate {M}. It would like the menu.',
  'The {F} is small. Smallish. Roughly smallish, says the tannoy.',
  '{P}% has been devoured. The other {R}% is queuing for ice cream.',
  'The Gilded Lagoon asked how {D} is going. Rude of them, frankly.',
  'Capt. Roger says {P}% is a rounding error. Do round it down.',
  'A {F} has closed {D} for refurbishment.',
  'It only ate {M}. Management says we have loads of those.',
  'A second {F} has been reported at {D}. That makes two.',
  'The {F} was offered a towel. The {F} took the towel.',
], [
  'It has eaten {D}!! The towels there were all reserved.',
  '{P}% has been DEVOURED. The other {R}% is queuing for a boat.',
  'The {F} ate {M}. It is asking about pudding.',
  'There are {S} seconds left!! Everybody conga to the boats.',
  'Capt. Roger says {D} has gone. Tours resume at four regardless.',
  'Mrs Fenwick-Hyde says she was using {M}.',
  'A {F} now owns {P}% of a luxury resort. Good for it, honestly.',
  'Nigel has confirmed the {F}\'s late checkout. A very late one.',
  'There are {S} seconds left. Finish your ice creams quickly.',
  'Maisie says the {F} is only hungry. Maisie understands it.',
  'The tannoy says {P}% gone leaves {R}% still absolutely amazing.',
  'The {F} ate {M} and looked extremely pleased.',
  'There are {S} seconds left and the spa is still bookable.',
  'The {F} ate {M}. A very good choice.',
  'Only {S} seconds left!! The ice cream hut is still serving.',
  'Capt. Roger says {D} has gone, but the memories are free.',
  'There are two of them at {D} now. Two. We are leaving.',
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
