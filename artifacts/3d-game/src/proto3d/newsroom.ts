// ══════════════════════════════════════════════════════════════════════════════
//  NEWSROOM — the PIRATE BAY RESORT public address system
// ══════════════════════════════════════════════════════════════════════════════
//
//  ┌──────────────────────────────────────────────────────────────────────────┐
//  │  HOUSE STYLE. ONE RULE. EVERY LINE OBEYS IT. NO EXCEPTIONS.              │
//  ├──────────────────────────────────────────────────────────────────────────┤
//  │  1. THE BODY IS LOWER CASE. Always — including the first word of the     │
//  │     line. The ticker is a voice, not a headline.                         │
//  │  2. ALL CAPS IS THE JOKE OR THE PANIC. Never more than TWO capitalised   │
//  │     words in a line, and most lines have none. Caps is the punchline     │
//  │     landing, so if everything is capitalised nothing is.                 │
//  │  3. A NAME IS CAPS. The recurring cast are always capitalised —          │
//  │     CAPT. ROGER, NIGEL, BARNABY — as is PIRATE BAY, the resort itself.   │
//  │     Cast names do NOT count against the two-word caps budget.            │
//  │     Everything else — districts, places, things — is lower case.         │
//  │  4. PUNCTUATION ESCALATES WITH THE BEAT. This is how the arc is *felt*   │
//  │     rather than merely described:                                        │
//  │        BEAT 1 sign-on  — exactly ONE "!", and it lands on the greeting.  │
//  │        BEAT 2 denial   — ZERO "!". the resort is completely calm.        │
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
//                    REAL piece of resort news — the boat parade, the sandcastle
//                    contest, a new towel man. Nothing to do with the hole.
//  BEAT 2  DENIAL    tier 0. Nobody connects the dots. A chirpy holiday radio
//                    show telling rich people to enjoy themselves. There is no
//                    hole. That is a water feature. Have a cold drink.
//  BEAT 3  ALARM     tier 1. Dawning horror, delivered cheerfully. The
//                    evacuation is a FUN WALK. Officials contradict themselves
//                    mid-sentence and keep smiling.
//  BEAT 4  PANIC     tier 2. Everything is gone and CAPT. ROGER is still
//                    upselling. Then the sign-off: the seven day forecast.
//
//  THE RULE ABOUT THE HOLE. The news covers ONE thing: a hole is eating the
//  resort. Guests have no way of knowing that some *other* hole somewhere has a
//  name, a family or a scoreboard, so the newsroom never mentions one. If a
//  line needs a second hole it says "another one", "a second hole", "there are
//  two of them" — never a name. Enforced in code: `bind()` reads no rival
//  field, `fill()` knows no rival token, and `usable()` refuses point blank to
//  air any template containing a token outside {D}{M}{F}{P}{R}{S}.
//
//  Recurring cast (reuse is the joke — do not add one-off names):
//    CAPT. ROGER        host. hospitality in freefall. never stops upselling.
//    NIGEL              concierge. unblinking. confirms bookings into the void.
//    BARNABY            the parrot. rude. correct about everything.
//    DJ COCONUT         Dance Cove. one more hour. always one more hour.
//    MRS FENWICK-HYDE   guest. paid for a SEA view. out of touch, load-bearing.
//    MAISIE (7)         kid. delighted. wants to feed it. names it. adopts it.
//    CRESSIDA VANE      food critic. reviews everything. gives out stars.
//    the GILDED LAGOON  the smug rival resort across the bay.
//
//  Register: silly, warm, British understatement. Ages 6-11. Concrete nouns,
//  short sentences, silly over clever. No menace, no violence, no army, no
//  police, nobody gets hurt. The hole is a guest who is simply very hungry.
//  Lines render in a one-line phone ticker — aim under ~62 chars, hard cap 78.
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
  // has any use for it: a guest at a resort cannot know that some other hole is
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
// Good morning, and here is a REAL piece of resort news. Not a joke about the
// hole — the hole has not happened yet as far as anyone here is concerned. This
// fires FIRST, guaranteed, before any other headline (see `signedOn`).
// No {templates} — the sign-on must never depend on match state.
// Punctuation: exactly one "!", on the greeting. That is the whole allowance.
const SIGN_ON: string[] = [
  'GOOD MORNING from PIRATE BAY! the boat parade sets off at noon, as ever.',
  'GOOD MORNING! the smoothie hut is open, the sea is warm, the ice is cold.',
  'CAPT. ROGER: "GOOD MORNING! breakfast is a buffet. it is always a buffet."',
  'GOOD MORNING from PIRATE BAY! sandcastle contest at three. bring a bucket.',
  'GOOD MORNING! two pools, one parrot, and a new slide on the big pool.',
  'GOOD MORNING, PIRATE BAY! today: sun, snacks, and a shanty at eleven.',
  'GOOD MORNING! the spa has a new towel man. his name is also Roger.',
  'GOOD MORNING from PIRATE BAY! lost property: one violin, still unclaimed.',
];

/** Ticker-friendly district names, used to fill {D}. Lower case — see rule 3. */
const DIST_NAME: Record<Dist, string> = {
  port: 'the docks',
  market: 'the bazaar',
  resort: 'the resort',
  party: 'dance cove',
  jungle: 'the jungle',
  cove: 'smugglers cove',
  beach: 'sunset beach',
};

type Pools = [string[], string[], string[]];

// ── THE DOCKS ─────────────────────────────────────────────────────────────────
// yachts, galleons, dock hands, cargo, one seagull with ambitions
const PORT: Pools = [[
  'CAPT. ROGER: "welcome to the docks. mind the wet bit."',
  'a guest asked which yacht is hers. all of them, madam.',
  'the dock hands are paid extra to say arrr when asked.',
  'cargo manifest: 400 crates. 399 hold inflatable swans.',
  'MRS FENWICK-HYDE says her yacht is touching another yacht.',
  'NIGEL confirms the galleon is, in fact, a restaurant.',
  'a seagull was elected harbourmaster. the seagull declined.',
  'the yacht "second boat" has docked beside "first boat".',
  'kids may steer the galleon today. the galleon does not move.',
  'a crate marked fragile was opened. it held eleven smaller crates.',
  'CAPT. ROGER: "enjoy a nice cold drink by the water."',
  'a guest has complained that the sea is frankly too wide.',
  'MAISIE, 7, has named every rope on the dock. all of them.',
  'BARNABY bit a rope this morning. the rope had it coming.',
  'jet ski hire is two doubloons. bringing it back is optional.',
  'CAPT. ROGER salutes every departing boat. every single one.',
], [
  'CAPT. ROGER: "the dock is shorter today. cosier, really."',
  'a yacht owner asked whether the hole takes reservations.',
  'NIGEL: "your boat has moved, sir. inward. a bit."',
  'the dock hands are saying arrr now without being asked.',
  'MRS FENWICK-HYDE demands a yacht with considerably more hull.',
  'MAISIE waved at the purple thing. it wobbled back at her.',
  'the 399 inflatable swans have been deployed as an actual plan.',
  'harbour rope inventory: one rope, and it is fraying.',
  'a second hole has opened by the slipway. that makes two.',
  'CAPT. ROGER: "the pier is a jetty now. an upgrade, arguably!"',
  'CAPT. ROGER: "do stay clear of the edge. wherever the edge is."',
], [
  'CAPT. ROGER: "the docks are GONE!! boat hire is still open."',
  'the galleon has left. it did not say goodbye to anybody.',
  'NIGEL is rowing away, still holding the clipboard, still ticking.',
  'the last crate was opened. it was swans. it was always swans.',
  'MAISIE has named the hole. she says the hole is called Gary.',
  'the harbour is one seagull, standing in water, thinking.',
  'MRS FENWICK-HYDE: "and WHERE am I to moor now?"',
  'BARNABY is perched on the last post. king of nothing.',
  'CAPT. ROGER: "dockside dining is still on!! bring a raft."',
  'CAPT. ROGER waved off the last boat from a floating crate.',
  'CAPT. ROGER: "no docks, no docking fees. savings, friends."',
]];

// ── THE BAZAAR ────────────────────────────────────────────────────────────────
// stalls, traders, mangoes, and BARNABY the rude parrot
const MARKET: Pools = [[
  'BARNABY the parrot rated a guest\'s hat. the rating was "no".',
  'one mango at the bazaar now costs slightly more than a car.',
  'CAPT. ROGER: "haggle gently, friends. and do hydrate."',
  'a genuine antique compass, on stall 2. genuinely made on tuesday.',
  'a guest bought a mysterious pirate map. it is a lunch menu.',
  'BARNABY has learned a new word. the word is refund.',
  'stall 4 sells hats. stall 5 sells slightly bigger hats.',
  'MRS FENWICK-HYDE bought the entire spice aisle. then again.',
  'MAISIE traded one shell for a doubloon. an excellent trade.',
  'a trader insists his coconuts are vintage. they are damp.',
  'NIGEL confirms the bazaar closes whenever it likes.',
  'a man haggled for ten minutes, saved nothing, and beamed anyway.',
  'CRESSIDA VANE reviewed a mango. she gave the mango six stars.',
  'the sign says everything must go. nothing has ever gone.',
  'CAPT. ROGER: "everything here is GENUINE. define genuine."',
  'CAPT. ROGER bought a hat from his own gift shop. he does this daily.',
], [
  'CAPT. ROGER: "the bazaar is now a bazaa. still charming."',
  'BARNABY is screaming directions again. correct ones, sadly.',
  'the stalls are on wheels now. the traders are also on wheels.',
  'mango prices up. mango supply down. mango situation: tense.',
  'MRS FENWICK-HYDE asked the hole whether it takes card.',
  'MAISIE offered the hole a mango. the hole said yes.',
  'the everything must go sign is now a documentary.',
  'NIGEL: "the bazaar has relocated. inward. do mind the edge."',
  'the trader has marked his vintage coconuts down to "please".',
  'CAPT. ROGER: "fewer stalls, easier browsing. you are WELCOME!"',
  'CAPT. ROGER haggled with BARNABY. CAPT. ROGER lost badly.',
], [
  'CAPT. ROGER: "the bazaar has GONE!! the gift shop is thriving."',
  'BARNABY was right about everything. BARNABY is unbearable.',
  'the last trader sold the last stall. to himself. a good price.',
  'MRS FENWICK-HYDE haggled with the hole and lost badly.',
  'the mangoes were the real treasure. also gone. sorry, everyone.',
  'MAISIE: "he LIKED the mango." he did like the mango.',
  'one doubloon rolled past. nobody chased it. it was a tuesday.',
  'CRESSIDA VANE: "the bazaar: gone. the mango: unforgettable."',
  'CAPT. ROGER sold the last mango. to himself. arrr.',
  'CAPT. ROGER: "no stalls means no queues. think about it."',
]];

// ── THE RESORT ────────────────────────────────────────────────────────────────
// grand hotel, big pool, cabanas, spa, and the wrong bubbles
const RESORT: Pools = [[
  'CAPT. ROGER: "the spa is open. I have been. I am RADIANT."',
  'a guest sent back her fizzy drink. "these are the WRONG bubbles."',
  'NIGEL has confirmed 400 bookings and blinked twice. a legend.',
  'the big pool now has a smaller pool in it. nobody ordered this.',
  'MRS FENWICK-HYDE has requested a quieter breeze for the terrace.',
  'a guest asked the fancy chef for toast. he made the toast. sadly.',
  'the spa has a new treatment where they simply say nice things.',
  'cabana 12 has been upgraded to cabana 12 plus. same cabana.',
  'MAISIE has done 41 lengths. staff are concerned and impressed.',
  'the pool snack bar now has its own smaller pool snack bar.',
  'CRESSIDA VANE reviewed breakfast. she gave the toast five stars.',
  'a guest has complained that the towels are aggressively folded.',
  'the GILDED LAGOON insists their pool is significantly wetter.',
  'turndown service left a chocolate. the guest has requested two.',
  'CAPT. ROGER: "all-inclusive means ALL, friends. go wild."',
  'CAPT. ROGER: "book the spa. I have booked the spa. twice."',
  'CAPT. ROGER watered a plastic palm today. with real care.',
], [
  'CAPT. ROGER: "the sinkhole is a FEATURE. a water feature."',
  'NIGEL: "your suite has moved, madam. downward. slightly."',
  'the big pool has joined the small pool. the staff applauded.',
  'MRS FENWICK-HYDE: "I paid for a SEA view, not a HOLE view."',
  'a guest asked the concierge to cancel the hole. NIGEL: "noted."',
  'MAISIE wanted a photo with the hole. she got one. it is lovely.',
  'the GILDED LAGOON has offered us a sympathy rate. how dare they.',
  'cabana 12 plus has been downgraded to a memory of cabana 12.',
  'CAPT. ROGER: "fewer rooms means shorter corridors. progress!"',
  'CAPT. ROGER: "the lobby is OPEN PLAN now. very open indeed."',
  'CAPT. ROGER: "your suite has a pool now. it is all pool."',
], [
  'CAPT. ROGER: "the resort has GONE!! the spa is still bookable."',
  'NIGEL confirmed your booking from a slowly drifting lounger.',
  'MRS FENWICK-HYDE: "so this is a THREE star experience now."',
  'CRESSIDA VANE: "the hotel: gone. the service: flawless."',
  'the big pool has joined the sea. the sea is unimpressed.',
  'the GILDED LAGOON sent flowers. and a brochure. mostly brochure.',
  'a guest requested a late checkout. she got a very early one.',
  'MAISIE left the hole a five star review. "he is nice."',
  'CAPT. ROGER: "no hotel, no queues. I call that an UPGRADE."',
  'CAPT. ROGER: "check-in is closed. check-in was ALWAYS closed."',
  'CAPT. ROGER is handing out spa vouchers from a lilo. a pro.',
]];

// ── DANCE COVE ────────────────────────────────────────────────────────────────
// DJ COCONUT, the main stage, the dance floor, one blazer doing the limbo
const PARTY: Pools = [[
  'DJ COCONUT dropped a beat. a guest dropped a smoothie. even.',
  'CAPT. ROGER attempted the limbo in a full blazer. respect.',
  'the conga line can be seen from the hill. maybe from space.',
  'MRS FENWICK-HYDE has requested something considerably less loud.',
  'the dance floor has reached its legal maximum boogie.',
  'DJ COCONUT: "one more hour." it has been nine hours.',
  'the main stage now has a second, smaller, angrier stage.',
  'MAISIE has invented a dance. she calls it the wobble.',
  'NIGEL danced. NIGEL did not smile. NIGEL was superb.',
  'glow sticks have been recalled for being far too glowy.',
  'a guest asked the DJ for the good one. he played the good one.',
  'the limbo pole was lowered. then it snapped. limbo goes on.',
  'BARNABY was on the decks for ten seconds. banned for life.',
  'CAPT. ROGER requests the conga at seven. and eight. and nine.',
  'CAPT. ROGER: "dance like nobody is watching. I am watching."',
], [
  'CAPT. ROGER: "the dance floor is smaller. more INTIMATE."',
  'DJ COCONUT has switched to the nervous playlist. we know it.',
  'the conga line rerouted around the situation. still conga-ing.',
  'MRS FENWICK-HYDE: "is that the bass, or is that a HOLE?"',
  'MAISIE taught the hole the wobble. it is a natural.',
  'the speakers have been repositioned to face the hole. tactical.',
  'NIGEL confirms the party ends at eleven. or sooner.',
  'the glow stick supply is now described as emotional.',
  'CAPT. ROGER: "smaller floor, BIGGER dancing. it is maths!"',
  'CAPT. ROGER is conga-ing determinedly in the wrong direction.',
], [
  'CAPT. ROGER: "dance floor: eaten. the VIBE: untouched."',
  'DJ COCONUT played one final banger. an absolute legend.',
  'the conga line congaed straight past the hole. very rude.',
  'MRS FENWICK-HYDE danced at last. the worst possible moment.',
  'MAISIE and the hole are doing the wobble together.',
  'DJ COCONUT is now DJing from a raft. the crowd is three crabs.',
  'one glow stick remains, glowing bravely into the night.',
  'the main stage has gone. the smaller angrier stage: also gone.',
  'CAPT. ROGER is still conga-ing. alone. magnificently.',
  'CAPT. ROGER: "silent disco tonight!! very silent. no floor."',
]];

// ── THE JUNGLE ────────────────────────────────────────────────────────────────
// canopy, a lost temple that is found daily, guided tours, 31 bugs called Kevin
const JUNGLE: Pools = [[
  'CAPT. ROGER: "the temple is LOST. we know exactly where it is."',
  'the guided tour found the lost temple again. twice daily.',
  'MRS FENWICK-HYDE asked whether the jungle has air conditioning.',
  'a monkey stole a hat. the monkey wears the hat much better.',
  'NIGEL led a tour in full uniform. he does not sweat. ever.',
  'MAISIE has named 31 bugs. all 31 bugs are called Kevin.',
  'the zipline queue is now longer than the actual zipline.',
  'the guide said do not touch anything. everyone touched everything.',
  'the temple gift shop sells small replicas of the gift shop.',
  'a guest requested a jungle experience, but less jungly.',
  'the waterfall was rated four stars. one complaint: too damp.',
  'CRESSIDA VANE reviewed a leaf. she awarded the leaf six stars.',
  'CAPT. ROGER: "bug spray at reception. hydrate, friends."',
  'the rope bridge wobbled. everyone screamed. everyone did it again.',
  'CAPT. ROGER: "I discovered that temple. in 2019. with a map."',
  'CAPT. ROGER wears the blazer into the jungle. he always does.',
], [
  'CAPT. ROGER: "the canopy is now a canop. still very leafy."',
  'the lost temple is lost again. properly lost, this time.',
  'MRS FENWICK-HYDE has demanded the jungle be moved further off.',
  'the monkeys are packing. the monkeys have small suitcases.',
  'the tour is now a brisk tour. NIGEL walks very fast indeed.',
  'MAISIE told the hole about the temple. helpful. sort of.',
  'the zipline now ends nowhere at all. the queue is unchanged.',
  'all 31 Kevins are accounted for. Kevin 12 is on a leaf.',
  'CAPT. ROGER: "fewer trees, better VIEWS. I said what I said!"',
  'CAPT. ROGER led the tour backwards, briskly, still smiling.',
], [
  'CAPT. ROGER: "the jungle has GONE!! tours resume at four."',
  'the lost temple has been found. by a large purple thing.',
  'the monkeys waved from a boat. a classy exit, monkeys.',
  'MRS FENWICK-HYDE: "well now there is no SHADE whatsoever."',
  'NIGEL is guiding a tour of the sky. it is going rather well.',
  'the 31 Kevins are all fine. MAISIE checked. all 31 of them.',
  'the waterfall is now simply a fall. rated five stars. bold.',
  'CRESSIDA VANE: "jungle: gone. that leaf: still six stars."',
  'CAPT. ROGER: "temple gone. gift shop replicas: HALF PRICE."',
  'CAPT. ROGER, blazer intact, is on the very last branch.',
]];

// ── SMUGGLERS COVE ────────────────────────────────────────────────────────────
// treasure hunting, the wreck, rock pools, employee-of-the-month crab
const COVE: Pools = [[
  'CAPT. ROGER buries the treasure daily and finds it daily.',
  'the treasure map leads to the gift shop. as it always does.',
  'MRS FENWICK-HYDE found a doubloon and asked for a receipt.',
  'the wreck has been wrecked for 300 years. beautifully.',
  'MAISIE found a crab. the crab has a job now. it is management.',
  'the rock pool crab is employee of the month. again.',
  'NIGEL confirms the treasure is in the general area.',
  'a guest asked whether the shipwreck comes with wifi.',
  'the metal detector found 400 bottlecaps and one spoon.',
  'CAPT. ROGER: "arrr. also hydrate. very important. arrr."',
  'smugglers cove has nothing to smuggle. lovely, though.',
  'CRESSIDA VANE called the rock pools damp but honest.',
  'BARNABY found the treasure first. BARNABY said nothing.',
  'X marks the spot. the spot is a bench. it is a lovely bench.',
  'CAPT. ROGER: "I have NEVER smuggled anything. probably."',
  'CAPT. ROGER loses the map daily. he finds it in his pocket.',
], [
  'CAPT. ROGER: "the cove is smaller, and hence more EXCLUSIVE."',
  'the treasure hunt is over. something else found it first.',
  'MRS FENWICK-HYDE wants her doubloon confirmed in writing.',
  'the crabs are leaving in a single, very orderly file. no fuss.',
  'MAISIE showed the hole the rock pools. the hole approved.',
  'the wreck has been wrecked again. in record time, honestly.',
  'NIGEL: "the treasure has relocated. inward. do keep up."',
  'the bench that marked the spot has gone. so has the spot.',
  'CAPT. ROGER: "a smaller cove is a WARMER cove, friends!"',
  'CAPT. ROGER buried the treasure again. optimism, honestly.',
], [
  'CAPT. ROGER: "the cove has GONE!! treasure hunt still at four."',
  'X marked the spot. the spot has also gone now. awkward.',
  'the doubloon MRS FENWICK-HYDE found: eaten. her receipt: pending.',
  'the crabs took the last boat. the crabs had a plan all along.',
  'the crab MAISIE found got promoted. it is a captain now.',
  'the wreck has been unwrecked by removal. that counts, apparently.',
  'CRESSIDA VANE on the hole: "bold. purple. deeply hungry."',
  'BARNABY knew where the treasure was. BARNABY still says nothing.',
  'CAPT. ROGER: "the treasure is out there. somewhere. inward."',
  'CAPT. ROGER drew a fresh X on the water. commitment, that.',
]];

// ── SUNSET BEACH ──────────────────────────────────────────────────────────────
// umbrellas, sandcastles, lifeguards, eleven unmatched flip-flops
const BEACH: Pools = [[
  'CAPT. ROGER: "enjoy a nice cold drink by the beach, friends."',
  'the lifeguard has saved nobody all week and is thrilled.',
  'MRS FENWICK-HYDE has requested less sand. ideally all of it.',
  'the sandcastle contest was won by a nine year old. again.',
  'umbrella 12 flipped inside out. the beach applauded warmly.',
  'the sandcastle MAISIE built has a moat, a spa and a gift shop.',
  'NIGEL rakes the sand into perfect lines. nobody asked him to.',
  'a guest asked whether the sunset could be moved to earlier.',
  'the tide has taken eleven flip-flops. no matching pairs.',
  'CAPT. ROGER: "the sea is FREE. the loungers are not."',
  'CRESSIDA VANE rated the sunset last night. she gave it four stars.',
  'the ice cream van plays one song. only one. for ever and ever.',
  'a guest complained that the sand gets everywhere. it is sand.',
  'BARNABY stole a chip. BARNABY has always stolen the chip.',
  'CAPT. ROGER: "sunscreen, friends. I am a captain, not a doctor."',
  'CAPT. ROGER judged the sandcastle contest. he lost to a child.',
], [
  'CAPT. ROGER: "the beach is shorter. we are calling it a beachlet."',
  'the lifeguards are now guarding the land. and the ice cream hut.',
  'MRS FENWICK-HYDE: "the SAND is leaving. do something, NIGEL."',
  'MAISIE built a sandcastle for the hole. it fits perfectly.',
  'the umbrellas have been repositioned. defensively. by NIGEL.',
  'NIGEL rakes on. the sand is going. NIGEL rakes on regardless.',
  'the sunset has been moved earlier by popular demand. sort of.',
  'the ice cream van has moved. the song is unchanged. eternal.',
  'CAPT. ROGER: "less beach, less sand in your sandwich. a WIN!"',
  'CAPT. ROGER moved his lounger. then moved it again. calmly.',
], [
  'CAPT. ROGER: "beach: GONE!! sunset: on time. you are welcome."',
  'the lifeguard finally has something to do. he politely declines.',
  'MRS FENWICK-HYDE: "and now where am I to put my TOWEL."',
  'the sandcastle MAISIE built survived. of course it did.',
  'all eleven flip-flops are accounted for. still unmatched.',
  'NIGEL is raking the sea now. it is going surprisingly well.',
  'the ice cream van is still playing that song. from a raft.',
  'CRESSIDA VANE: "sunset: four stars. beach: absent."',
  'CAPT. ROGER: "sunbathing continues. bring your own beach."',
  'CAPT. ROGER, on a lilo, in a blazer, is still taking bookings.',
]];

const BY_DIST: Record<Dist, Pools> = {
  port: PORT, market: MARKET, resort: RESORT,
  party: PARTY, jungle: JUNGLE, cove: COVE, beach: BEACH,
};

// ── GENERAL RESORT ANNOUNCEMENTS ──────────────────────────────────────────────
// The arc in miniature. Tier 0 opens on ordinary resort news — nobody has
// connected a single dot — and only then slides into flat denial. Tier 1 is
// dawning horror said with a smile. Tier 2 is everything gone and still an
// upsell. CAPT. ROGER never once breaks character.
const GENERAL: Pools = [[
  // ordinary resort news. nothing is wrong. nothing has ever been wrong.
  'CAPT. ROGER: "welcome to PIRATE BAY. I am barely a captain."',
  'BAY RADIO: the buffet now has a second buffet, for puddings only.',
  'NIGEL the concierge has not blinked since tuesday. a legend.',
  'guest survey: 98 happy out of 100. the rest say the sea is salty.',
  'the GILDED LAGOON says their sunsets are sharper. they are not.',
  'activities today: nothing at all, beautifully scheduled.',
  'CAPT. ROGER: "hydrate, friends. it is basically a rule here."',
  'a small purple dot was seen by the pool. staff assume it is a guest.',
  'MAISIE, 7, has asked if she may keep the purple thing. pending.',
  'lost property: two hats, one violin, and somebody\'s uncle.',
  'BARNABY was fired this morning. BARNABY was rehired by lunch.',
  'MRS FENWICK-HYDE asked for the manager. she got CAPT. ROGER.',
  'weather: perfect. tomorrow: perfect. that is simply the deal here.',
  'the wristbands now come with a smaller wristband. nobody knows why.',
  'a guest rated the island ten out of ten. "would island again."',
  'staff briefing: smile, point at the sea, repeat until sunset.',
  'the resort cat has a suite. the resort cat pays nothing.',
  'DJ COCONUT has been declared a national treasure. by DJ COCONUT.',
  'kids club today: making friends with absolutely anything.',
  'CAPT. ROGER: "a cold drink, a warm sea. that is the whole idea."',
  'CAPT. ROGER: "I am not a real captain. I am a real host."',
  'CAPT. ROGER: "the parrot is not mine. the parrot chose me."',
  'CAPT. ROGER did the eleven o\'clock shanty. attendance: everyone.',
  'CRESSIDA VANE reviewed the eggs at breakfast. six stars.',
  'the big pool has a small pool inside it. staff are delighted.',
  'a guest asked for a quieter breeze. the terrace is looking into it.',
  // — BEAT 2 · DENIAL — there is a hole. there is absolutely not a hole. —
  'CAPT. ROGER: "do not mind the hole. enjoy a cold drink, friends."',
  'CAPT. ROGER: "that is not a hole. that is a NEW POOL. no charge."',
  'NIGEL: "there is no hole, madam. that is a shadow. a big one."',
  'the hole is not on the resort map. therefore there is no hole.',
  'management: "purple? we do not DO purple here." case closed.',
  'a guest saw a hole. that guest also saw a mermaid. same guest.',
  'BARNABY squawked "it is a HOLE". BARNABY was sent to his perch.',
  'CAPT. ROGER: "nobody is being eaten. that is a RUMOUR. relax."',
  'the hole ate a deckchair. we are calling that a laundry matter.',
  'MRS FENWICK-HYDE stepped in it. she blames her SANDALS.',
  'MAISIE said "there is a hole". staff said "there is a SMOOTHIE BAR".',
  'CAPT. ROGER: "a nice cold smoothie at the smoothie hut solves this."',
], [
  // — BEAT 3 · ALARM — dawning horror, delivered cheerfully. one "!" max. —
  'please do not feed the hole. it has eaten. it has DEFINITELY eaten.',
  'NIGEL: "the island is smaller, madam. your room is the same size."',
  'BAY RADIO: everything is fine, at a slightly higher volume.',
  'MRS FENWICK-HYDE would like to speak to whoever runs the hole.',
  'guests are reminded that the hole is not part of the water park.',
  'the GILDED LAGOON is advertising hole-free weekends. smug.',
  'MAISIE fed the hole a biscuit. we said do not. she DID.',
  'CAPT. ROGER: "a small hiccup, friends. do enjoy the buffet!"',
  'BARNABY has learned the word evacuate. BARNABY loves it.',
  'the staff meeting was held entirely at a brisk, dignified walk.',
  'CRESSIDA VANE gave the hole two stars. it took her starter.',
  'kids club is full. the three o\'clock activity is feeding the friend.',
  'DJ COCONUT has switched to the tense playlist. we all know it.',
  'CAPT. ROGER: "we are not evacuating. we are MINGLING outward."',
  'NIGEL has confirmed nothing is wrong. in writing. twice. calmly.',
  'CAPT. ROGER: "do not feed it. it is on a SCHEDULE."',
  'CAPT. ROGER: "we are not worried. this is simply my worried hat."',
  'CAPT. ROGER: "the hole is part of the entertainment programme."',
  'CAPT. ROGER: "this is NOT an evacuation. this is a fun walk!"',
  'CAPT. ROGER: "there is no hole. also do not go near the hole."',
  'oh gosh. it ate the breakfast tent, with the breakfast still in it.',
  'NIGEL: "we have always had a hole. it is very old. it is fine."',
  'guests are jogging to the boats. we are calling it a morning jog.',
  'CAPT. ROGER: "stay calm. I am calm. LOOK how calm I am."',
  'the fun walk is now a fun run. same fun. considerably more legs.',
  'it burped and the whole bay heard it. it smelled of melon. sorry.',
  'CAPT. ROGER: "nobody panic. panicking is not included."',
  'staff briefing: smile, point at the boats, keep smiling, go.',
  'CAPT. ROGER: "oh gosh. I mean ARRR. I meant ARRR, friends."',
  'there is a second hole now. we are not going to talk about that.',
  'a guest counted the holes. she got to three. she has stopped now.',
], [
  // — BEAT 4 · PANIC — everything is gone and the upselling continues. —
  'CAPT. ROGER: "everything is GONE!! book now, prices slashed."',
  'NIGEL is still at the front desk. the front desk is on the water.',
  'BARNABY was right. BARNABY was always right. BARNABY knows it.',
  'MRS FENWICK-HYDE would like to speak to the manager of the ocean.',
  'the GILDED LAGOON has stopped gloating. that is the scary part.',
  'MAISIE has adopted the hole. paperwork pending. its name is Gary.',
  'CRESSIDA VANE, final review: "ate the island. lovely staff."',
  'BAY RADIO is broadcasting from a pool float. signal: excellent.',
  'DJ COCONUT is seeing us out from a raft. an absolute professional.',
  'a guest asked about the wifi. there is no wifi. there is no lobby.',
  'the resort was rated one star. "was eaten, otherwise quite lovely."',
  'kids club update: everybody drew the hole. every single one.',
  'CAPT. ROGER: still in the blazer, still smiling, still upselling.',
  'the buffet is GONE!! all of it. even the melon. especially that.',
  'lost property: one island. please enquire at the front desk.',
  'CAPT. ROGER: "goodbye from PIRATE BAY. do leave us a review."',
  'CAPT. ROGER: "same time next year!! bring a bigger boat."',
  'CAPT. ROGER: "all gone. have you considered our spa package?"',
  'CAPT. ROGER, waist deep, is reading out tomorrow\'s activities.',
  'CAPT. ROGER: "I remain, technically and legally, a captain."',
  'it ate the buffet, the bar, and the bar man\'s hat. the HAT.',
  'somebody burped. it was not a person. we are all leaving now.',
  'CAPT. ROGER: "still no hole!! just a lot of MISSING island."',
  'another hole has opened beside the first one. they are MULTIPLYING.',
  'there are three of them now. THREE. we have stopped counting.',
  'the resort cat got out. the resort cat is FINE. we checked twice.',
]];

// ── BEAT 4 · SIGN-OFF ─────────────────────────────────────────────────────────
// The island is gone and CAPT. ROGER is still reading out the weather. These
// are the *last words* of the arc, so they only go on air once the match is
// genuinely over the hill — see `endgame` in pickNews, which reads devouredPct
// and secondsLeft directly. A seven day forecast at 18% devoured is a lie.
// Punctuation drops back to at most one "!": the panic is over, this is a
// goodbye.
const SIGN_OFF: string[] = [
  'CAPT. ROGER, floating on a door, reads out the weather. sunny.',
  'weather tomorrow: sunny, warm, and no island. lovely regardless.',
  'CAPT. ROGER: "goodbye. tonight in dance cove: nothing. be there."',
  'the island has gone. CAPT. ROGER is doing the seven day forecast.',
  'CAPT. ROGER: "we are a boat resort now. we always were. arrr."',
  'NIGEL, standing on water, took a booking for august. calm man.',
  'MAISIE waves. Gary waves. everybody waves. a lovely end, really.',
  'and now the sea. the sea is where the resort was. back to you, NIGEL.',
  'BAY RADIO is signing off. the dance floor was open. it WAS open.',
  'CAPT. ROGER: "goodbye from PIRATE BAY. wherever PIRATE BAY went."',
];

// ── WHAT IT JUST ATE ──────────────────────────────────────────────────────────
// ctx.lastMeal is free text from the call site. It never says "a boat" or "a
// person" — the game only tags HOUSE and CAR, and sizes everything else — so
// these four buckets are everything the API can actually tell us apart.
// A bite the player just took should be in the news within seconds of it.
export type MealKind = 'house' | 'car' | 'big' | 'small';

const MEAL_HOUSE: Pools = [[
  'a house has gone. NIGEL has marked the room as cleaned.',
  'a whole HOUSE. staff are calling it a very late checkout.',
  'a house went down in one gulp. no chewing. no manners at all.',
  'staff villa 4 is missing. staff villa 5 has gone very quiet.',
], [
  'another house. that is three houses. who is counting? nobody!',
  'a house went in whole. the doorbell rang on the way down. eek.',
  'CAPT. ROGER: "houses are OPTIONAL at a resort, friends."',
  'MRS FENWICK-HYDE: "that was a HOUSE. I had a NAP in there."',
], [
  'every house has gone. CAPT. ROGER is offering a tent. not free.',
  'the last house went in sideways. it did not fit. it went anyway.',
  'the houses are GONE!! NIGEL is still turning down the beds.',
  'CAPT. ROGER: "no houses, no housework. think POSITIVE, friends."',
]];

const MEAL_CAR: Pools = [[
  'a parked car has gone. the valet insists he put it somewhere.',
  'a car went in wheels first. the alarm went off inside it. rude.',
  'a guest car is missing. NIGEL has logged it under valet, extreme.',
  'a car. one bite. one burp. the bay applauded politely.',
], [
  'another car gone. the car park is now a park. a very nice park.',
  'a car went down honking. it honked all the way. all of the way.',
  'MRS FENWICK-HYDE: "my CAR. that car cost more than the hotel!"',
  'CAPT. ROGER: "cars are so LOUD anyway. good riddance."',
], [
  'the last car has been eaten. its alarm is still going. somewhere.',
  'the car park has gone. so has booth 2. Trev got out. Trev is fine.',
  'CAPT. ROGER: "no cars, no traffic!! I call that a holiday."',
  'a car went in and the radio kept playing. it is STILL playing.',
]];

const MEAL_BIG: Pools = [[
  'a whole building has gone. NIGEL blinked. NIGEL actually blinked.',
  'something enormous went in. the ground said whump. a good whump.',
  'a landmark is missing. it was in all the brochures. all of them.',
  'that was a big one. everybody felt it in their KNEES. everybody.',
], [
  'a building went down whole. the bay wobbled. we all wobbled.',
  'CAPT. ROGER: "the big one was UGLY anyway. I said it. it was me."',
  'MRS FENWICK-HYDE: "was that the spa. tell me it was not the SPA."',
  'it ate something enormous. it sounded like a bath draining. ugh.',
], [
  'the last big thing has gone. it went in slowly. very slowly.',
  'CAPT. ROGER: "everything big has GONE!! only small things left."',
  'the galleon went in last. it was not a real galleon. still sad.',
  'the biggest bite yet. it had a little sit down after. we all did.',
]];

const MEAL_SMALL: Pools = [[
  'it ate a bin. one bin. one tiny burp. honestly rather cute.',
  'a lounger is missing. so is the towel. so is the book. good book.',
  'a small snack was taken by the pool. staff are not bothered.',
  'it ate one flip-flop. the other is still on the beach. so sad.',
], [
  'still snacking. bins, cones, and somebody\'s entire HAT. the HAT.',
  'it ate a deckchair, burped, then took another deckchair. RUDE.',
  'CAPT. ROGER: "it only ate a SMALL thing. we have hundreds!"',
  'it ate the ice bucket. with the ice in it. the crunching was awful.',
], [
  'nothing big is left. it is eating crumbs now. loud, angry crumbs.',
  'it ate the last umbrella. it did not even WANT the umbrella.',
  'down to bits and bobs. it is HOOVERING the beach. genuinely.',
  'last snack: one melon. it was ALWAYS going to be the melon.',
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
const LIVE: Pools = [[
  'CAPT. ROGER: "the {F} is a guest. do give it space, friends."',
  'a {F} was seen at {D}. staff waved. it sort of waved back.',
  'it ate {M}. NIGEL has logged this under turndown service.',
  'MAISIE fed the {F}. the {F} said thank you. probably.',
  'guest review of {D}: five stars, one hole. still five stars.',
  'lost property: {M}. found property: nothing at all.',
  'CAPT. ROGER: "the {F} is THEMED. everything here is themed."',
  'MRS FENWICK-HYDE: "something ate {M}. was that included?"',
  'poll: is the purple thing getting bigger? {P}% say yes.',
  'a {F} has checked in. no booking, no luggage, no problem.',
  'CRESSIDA VANE reviewed {M}. "eaten. no notes. bravo."',
  'NIGEL confirmed your booking at {D}. and the {F}\'s booking.',
  'BARNABY saw a {F} at {D}. BARNABY told everyone. loudly.',
  'staff are calling it a {F} now. staff named it themselves.',
  'CAPT. ROGER offered the {F} a lounger at {D}. it declined.',
  'CAPT. ROGER: "a {F}. how DELIGHTFUL. do not approach it."',
], [
  'CAPT. ROGER: "a {F} at {D}? that is a FEATURE, friends."',
  'we are evacuating {D}. politely. with drinks. in a neat line.',
  'it ate {M}. somebody owned that. somebody is upset.',
  '{P}% of the resort has gone. there are still no refunds.',
  'MRS FENWICK-HYDE: "{P}% is basically none percent, surely?"',
  'do not book {D}. that is precisely where the {F} is.',
  'MAISIE has named the {F}. it answers to the name now.',
  'NIGEL: "we have moved {D}, madam. inward. only slightly."',
  'a {F} ate {M}. it would now like to see the menu.',
  'CAPT. ROGER: "the {F} is small. ish. smallish. roughly."',
  '{P}% devoured. the other {R}% is queuing at the ice cream hut.',
  'the GILDED LAGOON has asked how {D} is going. rude of them.',
  'CAPT. ROGER: "{P}% is a rounding error. round it DOWN."',
  'CAPT. ROGER: "{D}: closed for refurbishment. by a {F}."',
  'CAPT. ROGER: "it only ate {M}. we have LOADS of those!"',
  'a second {F} has been reported at {D}. that makes two.',
], [
  '{D}: GONE!! the towels there were reserved.',
  '{P}% DEVOURED. the other {R}% is queuing for a boat.',
  'the {F} ate {M}. it is now asking about pudding.',
  '{S} SECONDS LEFT!! everybody conga to the boats.',
  'CAPT. ROGER: "{D}: all gone. tours resume at four regardless."',
  'MRS FENWICK-HYDE: "{M}? I was USING that."',
  'a {F} now owns {P}% of a luxury resort. good for it, honestly.',
  'NIGEL has confirmed the {F}\'s late checkout. a very late one.',
  '{S} SECONDS LEFT. finish your ice creams calmly. and quickly.',
  'MAISIE says the {F} is just hungry. MAISIE gets it.',
  'CAPT. ROGER: "{P}% gone. that is {R}% still AMAZING."',
  'the {F} ate {M}. it looked so pleased.',
  '{S} SECONDS LEFT and the spa is somehow still bookable.',
  'CAPT. ROGER: "the {F} ate {M}. good choice."',
  'CAPT. ROGER: "{S} seconds left!! last orders at the ice cream hut."',
  'CAPT. ROGER: "{D}: all gone. the memories are FREE."',
  'there are two of them at {D} now. TWO. we are leaving.',
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

/** clears the anti-repeat memory — call between matches if you like. */
export function resetNews(): void {
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

function bind(ctx: NewsCtx): Filled {
  // ONE rounded percentage drives both {P} and {R}. Rounding them separately is
  // how a newsroom ends up saying "1% gone, the other 100% is nervous".
  const pct = Math.min(99, Math.max(1, Math.round(ctx.devouredPct || 0)));
  // NOTE: ctx.rivalName / ctx.rivalLead are NOT read here, on purpose. See the
  // note on NewsCtx. A guest cannot know another hole's name, so the newsroom
  // has no way to say one.
  return {
    pct,
    rest: 100 - pct,
    form: clip(ctx.form || 'VOIDLING', 14),
    meal: clip(ctx.lastMeal || 'the buffet', 22),
    dist: ctx.district ? DIST_NAME[ctx.district] : 'PIRATE BAY',
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
 *   1 SIGN-ON   the first call of every match. good morning + real resort news.
 *   2 DENIAL    tier 0 — nobody connects the dots. have a cold drink.
 *   3 ALARM     tier 1 — dawning horror, cheerfully. the evacuation is a walk.
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
