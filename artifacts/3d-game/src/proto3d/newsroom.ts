// ══════════════════════════════════════════════════════════════════════════════
//  NEWSROOM — the PIRATE BAY RESORT public address system
// ══════════════════════════════════════════════════════════════════════════════
//  Not a news ticker. A *resort announcement arc*, in four beats:
//
//  BEAT 1  SIGN-ON   fires FIRST, every match, guaranteed. "GOOD MORNING FROM
//                    PIRATE BAY RESORT — the dance floor is OPEN."
//  BEAT 2  DENIAL    tier 0. A chirpy holiday radio show telling rich people to
//                    enjoy themselves. There is no hole. Have a cold drink.
//  BEAT 3  ALARM     tier 1. Oh gosh. The evacuation is a FUN WALK. Officials
//                    contradict themselves mid-sentence. Still on brand.
//  BEAT 4  FAREWELL  tier 2. The island is gone and CAPT. ROGER is still
//                    reading out the seven day forecast. Still upselling.
//
//  The running joke is CAPT. ROGER — the resort's entertainment director, a
//  man who is not a captain, wearing a blazer, who will not break character
//  while the island is eaten out from under his deck shoes.
//
//  Recurring cast (reuse is the joke — do not add one-off names):
//    CAPT. ROGER        host. hospitality in freefall. never stops upselling.
//    NIGEL              concierge. unblinking. confirms bookings into the void.
//    BARNABY            the parrot. rude. correct about everything.
//    DJ COCONUT         Dance Cove. one more hour. always one more hour.
//    MRS FENWICK-HYDE   guest. paid for a SEA view. out of touch, load-bearing.
//    MAISIE (7)         kid. delighted. wants to feed it. names it. adopts it.
//    CRESSIDA VANE      food critic. reviews everything. including the void.
//    THE GILDED LAGOON  the smug rival resort across the bay.
//
//  Register: silly, warm, British understatement. Ages 6-11. No menace, no
//  violence, no army, no police. The void is a guest who is simply very hungry.
//  Lines render in a one-line phone ticker — aim under ~62 chars, cap ~78.
// ══════════════════════════════════════════════════════════════════════════════

export type NewsTier = 0 | 1 | 2;
export type Dist = 'port' | 'market' | 'resort' | 'party' | 'jungle' | 'cove' | 'beach';

export interface NewsCtx {
  tier: NewsTier;
  district: Dist | null;   // where the player currently is (null if unknown)
  lastMeal: string;        // e.g. "a parked yacht", "a whole HOUSE"
  devouredPct: number;     // 0..100
  form: string;            // e.g. 'VOIDLING' | 'GOBBLER' | 'DEVOURER' | 'WORLD ENDER'
  secondsLeft: number;
  rivalName: string;       // a rival void's name, e.g. 'CHOMPZILLA'
  rivalLead: number;       // signed score difference vs the player
}

/** Per-tier ticker brand. The station gets progressively less relaxed. */
export const BRAND: [string, string, string] = [
  '🏴‍☠️ BAY RADIO',
  '⚠️ RESORT UPDATE',
  '🚨 ALL HANDS',
];

// ── BEAT 1 · SIGN-ON ──────────────────────────────────────────────────────────
// BAY RADIO opens every single match the same way it has opened every morning
// for thirty years: good morning, the dance floor is open, nothing is wrong.
// This fires FIRST, guaranteed, before any other headline (see `signedOn`).
// No {templates} here — the sign-on must never depend on match state.
const SIGN_ON: string[] = [
  'GOOD MORNING FROM PIRATE BAY RESORT! the dance floor is OPEN!',
  'GOOD MORNING! the tiki bar is open. the sea is warm. ARRR.',
  'CAPT. ROGER: "GOOD MORNING, PIRATE BAY! breakfast is a BUFFET!"',
  'GOOD MORNING from PIRATE BAY! today: sun, snacks and a shanty.',
  'BAY RADIO, GOOD MORNING! two pools, one parrot, zero problems.',
  'CAPT. ROGER: "GOOD MORNING! nothing bad has EVER happened here."',
  'GOOD MORNING PIRATE BAY! DJ COCONUT starts in nine minutes!',
  'GOOD MORNING! the dance floor is OPEN and the ice is COLD. in you come.',
];

/** Ticker-friendly district names, used to fill {D}. */
const DIST_NAME: Record<Dist, string> = {
  port: 'THE DOCKS',
  market: 'THE BAZAAR',
  resort: 'THE RESORT',
  party: 'DANCE COVE',
  jungle: 'THE JUNGLE',
  cove: 'SMUGGLERS COVE',
  beach: 'SUNSET BEACH',
};

type Pools = [string[], string[], string[]];

// ── THE DOCKS ─────────────────────────────────────────────────────────────────
// yachts, galleons, dock hands, cargo, one seagull with ambitions
const PORT: Pools = [[
  'CAPT. ROGER: "welcome to the docks! mind the wet bit!"',
  'a guest asks which yacht is hers. all of them, madam.',
  'dock hands paid extra to say "arrr" on request.',
  'cargo manifest: 400 crates. 399 are inflatable swans.',
  'MRS FENWICK-HYDE: "my yacht is TOUCHING another yacht."',
  'NIGEL confirms the galleon is, in fact, a restaurant.',
  'seagull elected harbourmaster. seagull declines the role.',
  'superyacht "SECOND BOAT" docks beside "FIRST BOAT".',
  'kids allowed to steer the galleon. it is not moving.',
  'crate marked FRAGILE contains eleven smaller crates.',
  'CAPT. ROGER: "enjoy a nice cold drink by the water!"',
  'guest complains the sea is "frankly too wide".',
  'MAISIE, 7, has named every rope on the dock. all of them.',
  'BARNABY bites a rope. the rope had it coming.',
  'jet ski hire: two doubloons. jet ski return: optional.',
  'CAPT. ROGER: "that is not a real galleon. tell nobody. ARRR."',
  'CAPT. ROGER salutes every departing boat. every single one.',
], [
  'CAPT. ROGER: "the dock is shorter today. cosier, really!"',
  'yacht owner asks whether the void takes reservations.',
  'NIGEL: "your boat has moved, sir. inward. a bit."',
  'dock hands now saying "arrr" without being asked.',
  'MRS FENWICK-HYDE demands a yacht with considerably MORE hull.',
  'MAISIE waves at the purple thing. it wobbles back. aww.',
  'the 399 inflatable swans deployed as an actual plan.',
  'harbour rope inventory down to "one, and it is fraying".',
  'CAPT. ROGER: "the pier is a JETTY now! upgrade, arguably!"',
  'CAPT. ROGER: "we have CONSOLIDATED the docks! efficiency!"',
  'CAPT. ROGER: "arrr! and also! do stay clear of the edge!"',
], [
  'CAPT. ROGER: "the docks are gone. boat hire: STILL OPEN."',
  'the galleon has left. it did not say goodbye.',
  'NIGEL rows away, still holding the clipboard. still ticking.',
  'last crate opened. it was swans. it was always swans.',
  'MAISIE has named the void. it is called Gary.',
  'harbour now one seagull, standing in water, thinking.',
  'MRS FENWICK-HYDE: "and WHERE am I to moor now?"',
  'BARNABY perched on the last post. king of nothing.',
  'CAPT. ROGER: "dockside dining still available! bring a raft!"',
  'CAPT. ROGER waves off the last boat from a floating crate.',
  'CAPT. ROGER: "no docks, no docking fees! savings, friends!"',
]];

// ── THE BAZAAR ────────────────────────────────────────────────────────────────
// stalls, traders, mangoes, and BARNABY the rude parrot
const MARKET: Pools = [[
  'BARNABY the parrot rates a guest\'s hat. rating: "no."',
  'one mango, at the bazaar, now costs slightly more than a car.',
  'CAPT. ROGER: "haggle gently, friends! and hydrate!"',
  'genuine antique compass. genuinely made on tuesday.',
  'guest buys a mysterious pirate map. it is a lunch menu.',
  'BARNABY has learned a new word. the word is "refund".',
  'stall 4 sells hats. stall 5 sells slightly bigger hats.',
  'MRS FENWICK-HYDE buys the entire spice aisle. then again.',
  'MAISIE trades one shell for a doubloon. excellent trade.',
  'trader insists the coconuts are "vintage". they are damp.',
  'NIGEL confirms the bazaar closes whenever it likes.',
  'a man haggles ten minutes, saves nothing, beams anyway.',
  'CRESSIDA VANE reviews a mango: "smug, but correct."',
  'sign reads EVERYTHING MUST GO. nothing has ever gone.',
  'CAPT. ROGER: "everything here is GENUINE! define genuine!"',
  'CAPT. ROGER buys a hat from his own gift shop. daily.',
], [
  'CAPT. ROGER: "the bazaar is now a bazaa. still charming!"',
  'BARNABY screaming coordinates again. accurate ones, sadly.',
  'stalls now on wheels. traders now also on wheels.',
  'mango prices UP. mango supply DOWN. mango situation: tense.',
  'MRS FENWICK-HYDE asks the void whether it takes card.',
  'MAISIE offers the void a mango. the void says yes.',
  'EVERYTHING MUST GO sign now technically a documentary.',
  'NIGEL: "the bazaar has relocated. inward. do mind."',
  'trader marks the vintage coconuts down to "please".',
  'CAPT. ROGER: "fewer stalls! easier browsing! you are WELCOME!"',
  'CAPT. ROGER haggles with BARNABY. CAPT. ROGER loses badly.',
], [
  'CAPT. ROGER: "the bazaar is gone. gift shop: THRIVING."',
  'BARNABY was right about everything. BARNABY is unbearable.',
  'last trader sells the last stall. to himself. good price.',
  'MRS FENWICK-HYDE haggles with the void and loses badly.',
  'the mangoes were the real treasure. also gone. sorry.',
  'MAISIE: "he LIKED the mango!" he did like the mango.',
  'one doubloon rolls past. nobody chases it. it was tuesday.',
  'CRESSIDA VANE: "the bazaar: gone. the mango: unforgettable."',
  'CAPT. ROGER sells the last mango. to himself. arrr.',
  'CAPT. ROGER: "no stalls means no queues! think about it!"',
]];

// ── THE RESORT ────────────────────────────────────────────────────────────────
// grand hotel, infinity pools, cabanas, spa, swim-up bar, wrong champagne
const RESORT: Pools = [[
  'CAPT. ROGER: "the spa is open! I have been! I am RADIANT!"',
  'guest returns the champagne: "these are the WRONG bubbles."',
  'NIGEL has confirmed 400 bookings and blinked twice. legend.',
  'the infinity pool has become slightly more infinite.',
  'MRS FENWICK-HYDE requests a quieter breeze for the terrace.',
  'private chef asked to make toast. he weeps. he obliges.',
  'spa adds a treatment where they simply say nice things.',
  'cabana 12 upgraded to cabana 12 PLUS. same cabana.',
  'MAISIE has done 41 lengths. staff concerned. also impressed.',
  'the swim-up bar now has its own swim-up bar.',
  'CRESSIDA VANE on the buffet: "adequate. therefore tragic."',
  'guest complains the towels are "aggressively folded".',
  'THE GILDED LAGOON insists their pool is significantly wetter.',
  'turndown service leaves a chocolate. guest requests two.',
  'CAPT. ROGER: "all-inclusive means ALL, friends. go wild."',
  'CAPT. ROGER: "book the spa! I have booked the spa! twice!"',
  'CAPT. ROGER waters a plastic palm. daily. with real care.',
], [
  'CAPT. ROGER: "the sinkhole is a FEATURE. a water feature."',
  'NIGEL: "your suite has moved, madam. downward. slightly."',
  'the infinity pool achieves actual infinity. staff applaud.',
  'MRS FENWICK-HYDE: "I paid for a SEA view not a VOID view."',
  'guest asks the concierge to cancel the void. NIGEL: "noted."',
  'MAISIE wants a photo with the void. gets one. it is lovely.',
  'THE GILDED LAGOON offers us a "sympathy rate". how DARE they.',
  'cabana 12 PLUS downgraded to a memory of cabana 12.',
  'CAPT. ROGER: "fewer rooms means shorter corridors! progress!"',
  'CAPT. ROGER: "the lobby is OPEN PLAN now! very open! ARRR!"',
  'CAPT. ROGER: "your suite has a pool now. it is all pool."',
], [
  'CAPT. ROGER: "the resort is gone. the SPA is still bookable."',
  'NIGEL confirms your booking from a slowly drifting lounger.',
  'MRS FENWICK-HYDE: "so this is a THREE star experience now."',
  'CRESSIDA VANE: "the hotel: gone. the service: flawless."',
  'the infinity pool has joined the sea. sea unimpressed.',
  'THE GILDED LAGOON sends flowers. and a brochure. mostly brochure.',
  'guest requests a late checkout. receives a very early one.',
  'MAISIE leaves the void a five star review. "he is nice."',
  'CAPT. ROGER: "no hotel! no queues! I call that an UPGRADE!"',
  'CAPT. ROGER: "check-in is closed. check-in was ALWAYS closed."',
  'CAPT. ROGER hands out spa vouchers from a lilo. a pro.',
]];

// ── DANCE COVE ────────────────────────────────────────────────────────────────
// DJ Coconut, main stage, dance floor, one blazer doing the limbo
const PARTY: Pools = [[
  'DJ COCONUT drops a beat. a guest drops a smoothie. even.',
  'CAPT. ROGER attempts the limbo in a full blazer. respect.',
  'the conga line is now visible from the hill. possibly space.',
  'MRS FENWICK-HYDE requests something "considerably less rhythmic".',
  'dance floor officially reaches legal maximum boogie.',
  'DJ COCONUT: "one more hour!" it has been nine hours.',
  'main stage adds a second, smaller, angrier stage.',
  'MAISIE has invented a dance. she calls it "the wobble".',
  'NIGEL dances. NIGEL does not smile. NIGEL is superb.',
  'glow sticks recalled for being far too glowy.',
  'guest asks the DJ for "the good one". he plays the good one.',
  'limbo pole lowered. limbo pole snapped. limbo continues.',
  'BARNABY on the decks for ten seconds. banned for life.',
  'CRESSIDA VANE reviews the bass: "structurally aggressive."',
  'CAPT. ROGER requests the conga at seven. and eight. and nine.',
  'CAPT. ROGER: "dance like nobody is watching! I am watching!"',
], [
  'CAPT. ROGER: "the dance floor is smaller! more INTIMATE!"',
  'DJ COCONUT switches to the nervous playlist. we know it.',
  'conga line reroutes around the situation. keeps conga-ing.',
  'MRS FENWICK-HYDE: "is that the bass or is that a HOLE?"',
  'MAISIE teaches the void the wobble. it is a natural.',
  'speakers repositioned to face the void. tactically.',
  'NIGEL confirms the party ends at eleven. or sooner.',
  'glow stick supply now described as "emotional".',
  'CAPT. ROGER: "smaller floor! BIGGER dancing! it is maths!"',
  'CAPT. ROGER conga-ing determinedly in the wrong direction.',
], [
  'CAPT. ROGER: "dance floor: eaten. the VIBE: untouched."',
  'DJ COCONUT plays one final banger. absolute legend.',
  'the conga line congas straight past the void. very rude.',
  'MRS FENWICK-HYDE dances at last. worst possible moment.',
  'MAISIE and the void are doing the wobble. together. aww.',
  'DJ COCONUT now DJing from a raft. crowd: three crabs.',
  'one glow stick remains, glowing bravely into the night.',
  'main stage gone. second, smaller, angrier stage: also gone.',
  'CAPT. ROGER still conga-ing. alone. magnificently.',
  'CAPT. ROGER: "silent disco tonight! very silent! no floor!"',
]];

// ── THE JUNGLE ────────────────────────────────────────────────────────────────
// canopy, a lost temple that is found daily, guided tours, 31 bugs called Kevin
const JUNGLE: Pools = [[
  'CAPT. ROGER: "the temple is LOST! we know exactly where!"',
  'guided tour finds the lost temple. again. twice daily.',
  'MRS FENWICK-HYDE asks whether the jungle has air conditioning.',
  'monkey steals a hat. monkey wears hat considerably better.',
  'NIGEL leads a tour in full uniform. does not sweat. ever.',
  'MAISIE has named 31 bugs. all 31 bugs are called Kevin.',
  'zipline queue now longer than the actual zipline.',
  'guide: "do not touch anything." everyone touches everything.',
  'temple gift shop sells small replicas of the gift shop.',
  'guest requests a jungle experience "but less jungly".',
  'waterfall rated four stars. one complaint: "too damp".',
  'CRESSIDA VANE reviews a leaf. awards it six stars.',
  'CAPT. ROGER: "bug spray at reception! hydrate! ARRR!"',
  'canopy walkway wobbles. everyone screams. everyone repeats it.',
  'CAPT. ROGER: "I discovered that temple! in 2019! with a map!"',
  'CAPT. ROGER wears the blazer into the jungle. always.',
], [
  'CAPT. ROGER: "the canopy is now a canop. still very leafy!"',
  'the lost temple is lost again. properly lost, this time.',
  'MRS FENWICK-HYDE demands the jungle be moved further off.',
  'monkeys are packing. the monkeys have small suitcases.',
  "NIGEL's tour is now a brisk tour. a very brisk tour.",
  'MAISIE told the void about the temple. helpful! sort of!',
  'zipline now ends nowhere at all. queue unchanged.',
  'all 31 Kevins accounted for. Kevin 12 is on a leaf.',
  'CAPT. ROGER: "fewer trees! better VIEWS! I said what I said!"',
  'CAPT. ROGER leads the tour backwards, briskly, still smiling.',
], [
  'CAPT. ROGER: "the jungle is gone. tours resume at four."',
  'the lost temple has been found. by a large purple thing.',
  'monkeys wave from a boat. classy exit, monkeys.',
  'MRS FENWICK-HYDE: "well now there is no SHADE whatsoever."',
  'NIGEL is guiding a tour of the sky. going rather well.',
  "MAISIE's 31 Kevins are all fine. she checked. all 31.",
  'waterfall is now simply fall. rated five stars. bold.',
  'CRESSIDA VANE: "jungle: gone. that leaf: still six stars."',
  'CAPT. ROGER: "temple gone! gift shop replicas: HALF PRICE!"',
  'CAPT. ROGER, blazer intact, standing on the very last branch.',
]];

// ── SMUGGLERS COVE ────────────────────────────────────────────────────────────
// treasure hunting, the wreck, rock pools, employee-of-the-month crab
const COVE: Pools = [[
  'CAPT. ROGER buries the treasure daily and finds it daily.',
  'treasure hunt map leads to the gift shop. as it always does.',
  'MRS FENWICK-HYDE finds a doubloon and asks for a receipt.',
  'the wreck has been wrecked for 300 years. beautifully.',
  'MAISIE found a crab. the crab has a job now. it is management.',
  'rock pool crab crowned employee of the month. again.',
  'NIGEL confirms the treasure is "in the general area".',
  'guest asks whether the shipwreck comes with wifi.',
  'metal detector finds 400 bottlecaps and one spoon.',
  'CAPT. ROGER: "arrr! also hydrate! very important! arrr!"',
  'smugglers cove has nothing to smuggle. lovely though.',
  'CRESSIDA VANE calls the rock pools "damp, but honest".',
  'BARNABY finds the treasure first. BARNABY says nothing.',
  'X marks the spot. the spot is a bench. lovely bench.',
  'CAPT. ROGER: "I have NEVER smuggled anything! ARRR! probably!"',
  'CAPT. ROGER loses the map daily. finds it in his pocket.',
], [
  'CAPT. ROGER: "the cove is smaller. hence more EXCLUSIVE!"',
  'treasure hunt over. something else found it first.',
  'MRS FENWICK-HYDE wants her doubloon confirmed in writing.',
  'crabs leaving in a single, very orderly file. no fuss.',
  'MAISIE showed the void the rock pools. the void approved.',
  'the wreck has been wrecked AGAIN. record time, honestly.',
  'NIGEL: "the treasure has relocated. inward. do keep up."',
  'the bench that marked the spot has gone. so has the spot.',
  'CAPT. ROGER: "a smaller cove is a WARMER cove, friends!"',
  'CAPT. ROGER buries the treasure again. optimism, honestly.',
], [
  'CAPT. ROGER: "the cove is gone. treasure hunt still at four."',
  'X marked the spot. the spot has also now gone. awkward.',
  "MRS FENWICK-HYDE's doubloon: eaten. her receipt: pending.",
  'the crabs took the last boat. the crabs had a plan all along.',
  "MAISIE's crab got promoted. it is a captain now. a real one.",
  'the wreck is unwrecked. by removal. that counts, apparently.',
  'CRESSIDA VANE on the void: "bold. purple. deeply hungry."',
  'BARNABY knew where the treasure was. BARNABY still says nothing.',
  'CAPT. ROGER: "the treasure is out there! somewhere! inward!"',
  'CAPT. ROGER draws a fresh X on the water. commitment, that.',
]];

// ── SUNSET BEACH ──────────────────────────────────────────────────────────────
// umbrellas, sandcastles, lifeguards, eleven unmatched flip-flops
const BEACH: Pools = [[
  'CAPT. ROGER: "enjoy a nice cold drink by the beach, friends!"',
  'the lifeguard has saved nobody all week and is thrilled.',
  'MRS FENWICK-HYDE requests less sand. ideally all of it.',
  'sandcastle contest won by a nine year old. again. AGAIN.',
  'umbrella 12 flips inside out. the beach applauds warmly.',
  'MAISIE\'s sandcastle has a moat, a spa and a gift shop.',
  'NIGEL rakes the sand into perfect lines. nobody asked him to.',
  'guest asks whether the sunset can be moved to earlier.',
  'the tide has taken eleven flip-flops. no matching pairs.',
  'CAPT. ROGER: "the sea is FREE! the loungers are NOT!"',
  'CRESSIDA VANE rates tonight\'s sunset: "derivative."',
  'ice cream van plays one song forever. beloved. cursed.',
  'guest complains the sand is "getting everywhere". it is sand.',
  'BARNABY steals a chip. BARNABY has always stolen the chip.',
  'CAPT. ROGER: "sunscreen, friends! I am a captain, not a doctor!"',
  'CAPT. ROGER judges the sandcastle contest. loses to a child.',
], [
  'CAPT. ROGER: "the beach is shorter. we call it a beachlet!"',
  'lifeguards now guarding the LAND. and the bar. mainly the bar.',
  'MRS FENWICK-HYDE: "the SAND is leaving. do something, Nigel."',
  'MAISIE built a sandcastle for the void. it fits perfectly.',
  'umbrellas repositioned. defensively. by NIGEL. with a rake.',
  'NIGEL rakes on. the sand is going. NIGEL rakes on regardless.',
  'sunset moved earlier by popular demand. sort of.',
  'ice cream van relocated. song unchanged. song eternal.',
  'CAPT. ROGER: "less beach! less sand in your sandwich! WIN!"',
  'CAPT. ROGER moves his lounger. then moves it again. calmly.',
], [
  'CAPT. ROGER: "beach: gone. sunset: ON TIME. you are welcome."',
  'the lifeguard finally has something to do. politely declines.',
  'MRS FENWICK-HYDE: "and now where am I to put my TOWEL."',
  "MAISIE's sandcastle survived. obviously. of course it did.",
  'all eleven flip-flops accounted for. all eleven. still unmatched.',
  'NIGEL is raking the sea now. going surprisingly well.',
  'ice cream van still playing that song. from a raft. bless it.',
  'CRESSIDA VANE: "sunset: still derivative. beach: absent."',
  'CAPT. ROGER: "sunbathing continues! bring your own beach!"',
  'CAPT. ROGER, on a lilo, in a blazer, still taking bookings.',
]];

const BY_DIST: Record<Dist, Pools> = {
  port: PORT, market: MARKET, resort: RESORT,
  party: PARTY, jungle: JUNGLE, cove: COVE, beach: BEACH,
};

// ── GENERAL RESORT ANNOUNCEMENTS ──────────────────────────────────────────────
// the arc in miniature: welcome aboard → please do not feed it → lost property:
// an island. CAPT. ROGER never once breaks character.
const GENERAL: Pools = [[
  'CAPT. ROGER: "welcome to PIRATE BAY! I am barely a captain!"',
  'BAY RADIO: all-inclusive now includes considerably MORE.',
  'NIGEL the concierge has not blinked since tuesday. a legend.',
  'guest survey: 98% happy. 2% say the sea is "too salty".',
  'THE GILDED LAGOON claims THEIR sunsets are sharper. liars.',
  "today's activities: nothing at all, but beautifully scheduled.",
  'CAPT. ROGER: "hydrate, friends! it is basically a rule here!"',
  'a small purple dot sighted. staff assume it is a guest.',
  'MAISIE, 7, asks if she may keep the purple thing. pending.',
  'CRESSIDA VANE rates the resort: "expensive. therefore correct."',
  'lost property: two hats, one violin, and somebody\'s uncle.',
  'BARNABY fired again this morning. BARNABY rehired by lunch.',
  'MRS FENWICK-HYDE asks for the manager. receives CAPT. ROGER.',
  'weather: perfect. tomorrow: perfect. that is simply the deal.',
  'all-inclusive wristbands now come with a smaller wristband.',
  'CAPT. ROGER: "nothing to worry about! nothing AT ALL, friends!"',
  'guest rates the island ten out of ten: "would island again".',
  'staff briefing: smile, point at the sea, repeat until sunset.',
  'the resort cat has a suite. the resort cat pays nothing.',
  'DJ COCONUT declared a national treasure. by DJ COCONUT.',
  "kids club today: making friends with absolutely anything.",
  'CAPT. ROGER: "a nice cold drink, a nice warm sea. that is it."',
  'CAPT. ROGER: "I am not a real captain. I am a real HOST."',
  'CAPT. ROGER: "the parrot is not mine. the parrot chose me."',
  'CAPT. ROGER does the 11am shanty. attendance: joyfully forced.',
  'CAPT. ROGER: "there is nothing to do here! do it SLOWLY!"',
  // — BEAT 2 · DENIAL — there is a hole. there is absolutely not a hole. —
  'CAPT. ROGER: "do not mind the hole! enjoy a cold drink, friends!"',
  'CAPT. ROGER: "that is not a hole. that is a NEW POOL. no charge."',
  'NIGEL: "there is no void, madam. that is a shadow. a big one."',
  'the hole is not on the resort map. therefore it is not there.',
  'management: "purple? we do not DO purple here." case closed.',
  'a guest saw a hole. that guest also saw a mermaid. same guest.',
  'CAPT. ROGER: "hole? HOLE? I see a WATER FEATURE, friends. ARRR."',
  'BARNABY squawks "IT IS A HOLE". BARNABY is sent to his perch.',
  'CAPT. ROGER: "nobody is being eaten. that is a RUMOUR. relax."',
  'the hole ate a deckchair. we are calling that a laundry matter.',
  'MRS FENWICK-HYDE stepped in it. she blames her SANDALS.',
  'MAISIE: "there is a hole." staff: "there is a SMOOTHIE BAR."',
  'CAPT. ROGER: "a nice cold drink at the tiki bar solves this."',
], [
  'PLEASE DO NOT FEED THE VOID. it has eaten. it has DEFINITELY eaten.',
  'NIGEL: "the island is smaller. your room is the same size."',
  'BAY RADIO: everything is fine, at a slightly higher volume.',
  'MRS FENWICK-HYDE: "I should like to speak to whoever runs the void."',
  'guests reminded the void is not part of the water park.',
  'THE GILDED LAGOON now advertising "void-free weekends". smug.',
  'MAISIE has fed the void a biscuit. we said DO NOT. she DID.',
  'CAPT. ROGER: "a small hiccup, friends! enjoy the buffet!"',
  'BARNABY has learned the word "evacuate". BARNABY loves it.',
  'staff meeting held entirely at a brisk and dignified walk.',
  'CRESSIDA VANE: "the void: two stars. it took my starter."',
  'happy hour extended. nervously. and then again. indefinitely.',
  'all-inclusive now includes being marginally nearer the void.',
  'kids club fully booked. activity at three: "feeding the friend".',
  'DJ COCONUT switches to the tense playlist. we all know it.',
  'CAPT. ROGER: "we are not evacuating! we are MINGLING outward!"',
  'NIGEL confirms nothing is wrong, in writing, twice, calmly.',
  'CAPT. ROGER: "please do not feed it! it is on a SCHEDULE!"',
  'CAPT. ROGER: "we are not worried. this is my worried hat."',
  'CAPT. ROGER: "the void is part of the entertainment programme."',
  'CAPT. ROGER: "it is a water feature. it is FEATURING heavily."',
  // — BEAT 3 · ALARM — oh gosh. still smiling. smiling harder, actually. —
  'CAPT. ROGER: "this is NOT an evacuation! this is a FUN WALK!"',
  'CAPT. ROGER: "there is no hole! also do not go NEAR the hole!"',
  'oh gosh. it ate the breakfast tent. with the breakfast in it.',
  'NIGEL: "we have always had a hole. it is very old. it is fine."',
  'guests jogging to the boats. we are calling it a MORNING JOG.',
  'CAPT. ROGER: "stay calm! I am calm! LOOK how calm I am! LOOK!"',
  'the fun walk is now a fun run. same fun. considerably more legs.',
  'CAPT. ROGER: "small hole. tiny hole. medium hole. RUN, friends."',
  'it burped. the whole bay heard it. it smelled of MELON. sorry.',
  'CAPT. ROGER: "nobody panic! panicking is NOT all-inclusive!"',
  'staff briefing: smile, point at the boats, keep smiling, GO.',
  'CAPT. ROGER: "oh gosh. I mean: ARRR. I meant ARRR, friends."',
], [
  'CAPT. ROGER: "everything is gone! book NOW! prices SLASHED!"',
  'NIGEL still at the front desk. the front desk is on the water.',
  'BARNABY was right. BARNABY was always right. BARNABY knows it.',
  'MRS FENWICK-HYDE requests to speak to the manager of the ocean.',
  'THE GILDED LAGOON has stopped gloating. deeply suspicious.',
  'MAISIE has adopted the void. paperwork pending. name: Gary.',
  'CRESSIDA VANE, final review: "ate the island. lovely staff."',
  'BAY RADIO now broadcasting from a pool float. signal: excellent.',
  'DJ COCONUT sees us out from a raft. an absolute professional.',
  'guest asks about the wifi. there is no wifi. or guest.',
  'resort rated one star: "was eaten, otherwise quite lovely".',
  'kids club update: everyone drew the void. every single one.',
  'CAPT. ROGER: still in the blazer. still smiling. still upselling.',
  'the buffet is gone. ALL of it. even the melon. ESPECIALLY the melon.',
  'lost property: one island. please enquire at the front desk.',
  'CAPT. ROGER: "goodbye from PIRATE BAY! do leave us a review!"',
  'CAPT. ROGER: "same time next year! bring a bigger boat!"',
  'CAPT. ROGER: "all gone! have you considered our SPA package?"',
  "CAPT. ROGER, waist deep, reading out tomorrow's activities.",
  'CAPT. ROGER: "I remain, technically and legally, a captain."',
  'it ate the buffet, the bar, and the man who ran the bar. rude.',
  'somebody burped. it was not a person. we are all leaving now.',
  'CAPT. ROGER: "still no hole! just a lot of MISSING ISLAND!"',
]];

// ── BEAT 4 · SIGN-OFF ─────────────────────────────────────────────────────────
// The island is gone and CAPT. ROGER is still reading out the weather. These
// are the *last words* of the arc, so they only go on air once the match is
// genuinely over the hill — see `endgame` in pickNews, which reads devouredPct
// and secondsLeft directly. A seven day forecast at 18% devoured is a lie.
const SIGN_OFF: string[] = [
  'CAPT. ROGER, floating on a door, reads out the weather. sunny.',
  'weather tomorrow: sunny, warm, and no island. lovely regardless.',
  'CAPT. ROGER: "goodbye! tonight in DANCE COVE: nothing! be there!"',
  'the island is gone. CAPT. ROGER is doing the SEVEN DAY FORECAST.',
  'CAPT. ROGER: "we are a BOAT resort now! always were! ARRR!"',
  'NIGEL, standing on water, takes a booking for august. calm man.',
  'MAISIE waves. Gary waves. everybody waves. lovely end, really.',
  'and now the sea. the sea is where the resort was. back to you, Nigel.',
  'BAY RADIO signing off. the dance floor was open. it WAS open.',
  'CAPT. ROGER: "goodbye from PIRATE BAY! wherever Pirate Bay went!"',
];

// ── WHAT IT JUST ATE ──────────────────────────────────────────────────────────
// ctx.lastMeal is free text from the call site. It never says "a boat" or "a
// person" — the game only tags HOUSE and CAR, and sizes everything else — so
// these four buckets are everything the API can actually tell us apart.
// A bite the player just took should be in the news within seconds of it.
export type MealKind = 'house' | 'car' | 'big' | 'small';

const MEAL_HOUSE: Pools = [[
  'a house has gone. NIGEL has marked the room as "cleaned".',
  'a whole HOUSE. staff are calling it a "very late checkout".',
  'a house went down in one gulp. no chewing. no manners. none.',
  'staff villa 4 is missing. staff villa 5 has gone very quiet.',
], [
  'ANOTHER house?! that is three houses! who is COUNTING? nobody!',
  'a house went in whole. the doorbell rang on the way down. eek.',
  'CAPT. ROGER: "houses are OPTIONAL at a resort, friends! ARRR!"',
  'MRS FENWICK-HYDE: "that was a HOUSE. I had a NAP in there."',
], [
  'every house: eaten. CAPT. ROGER offers a TENT. it is not free.',
  'the last house went in sideways. it did not fit. it went anyway.',
  'houses gone. NIGEL still turning down beds that do not exist.',
  'CAPT. ROGER: "no houses! no housework! think POSITIVE, friends!"',
]];

const MEAL_CAR: Pools = [[
  'a parked car is gone. the valet insists he "put it somewhere".',
  'a car went in wheels first. the alarm went off inside it. rude.',
  'a guest car is missing. NIGEL logs it under "valet, extreme".',
  'a car. one bite. one BURP. the bay applauds politely. lovely.',
], [
  'another car gone. the car park is now a park. a very nice park.',
  'a car went down honking. it honked all the way. all of the way.',
  'MRS FENWICK-HYDE: "my CAR. that car cost more than you, Nigel."',
  'CAPT. ROGER: "cars are so LOUD anyway! good riddance! ARRR!"',
], [
  'the last car eaten. its alarm is still going. somewhere. deep.',
  'car park gone. cars gone. also the man in booth 2. sorry, Trev.',
  'CAPT. ROGER: "no cars, no traffic! I call that a HOLIDAY, friends!"',
  'a car went in and the radio kept playing. it is STILL playing.',
]];

const MEAL_BIG: Pools = [[
  'a whole BUILDING. gone. NIGEL blinked. NIGEL actually blinked.',
  'something enormous went in. the ground said WHUMP. good WHUMP.',
  'a landmark is missing. it was in all the brochures. all of them.',
  'that was a big one. everybody felt it in their KNEES. everybody.',
], [
  'a BUILDING went down whole. the bay wobbled. we all wobbled.',
  'CAPT. ROGER: "the big one was UGLY anyway. I said it. it was me."',
  'MRS FENWICK-HYDE: "was that the SPA. tell me that was not the SPA."',
  'it ate something enormous. it sounded like a bath draining. ugh.',
], [
  'the last big thing has gone. it went in slowly. very slowly.',
  'CAPT. ROGER: "everything BIG is gone! only SMALL things left! us!"',
  'the galleon went in last. it was not a real galleon. still sad.',
  'biggest bite yet. it needed a little sit down after. we all did.',
]];

const MEAL_SMALL: Pools = [[
  'it ate a bin. one bin. one tiny burp. honestly rather cute.',
  'a lounger is missing. so is the towel. so is the book. good book.',
  'a small snack taken by the pool. staff not remotely bothered.',
  'it ate one flip-flop. the other is still on the beach. so sad.',
], [
  'still snacking. bins, cones, and somebody\'s entire HAT. the HAT.',
  'it ate a deckchair, burped, then took another deckchair. RUDE.',
  'CAPT. ROGER: "it only ate a SMALL thing! we have BILLIONS!"',
  'it ate the ice bucket. WITH the ice. the crunching was horrid.',
], [
  'nothing big left. it is eating crumbs now. loud, angry crumbs.',
  'it ate the last umbrella. it did not even WANT the umbrella.',
  'down to bits and bobs. it is hoovering the beach. genuinely.',
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
//  {F} form   {M} last meal   {P} pct   {R} 100-pct   {S} seconds
//  {D} district name   {L} rival name   {G} rival lead (only when rival ahead)
const LIVE: Pools = [[
  'CAPT. ROGER: "the {F} is a guest! give it space, friends!"',
  'a {F} seen in {D}. staff waved. it waved back. sort of.',
  'it ate {M}. NIGEL has logged it as "turndown service".',
  'MAISIE fed a {F}. the {F} said thank you. probably.',
  'guest review of {D}: five stars, one void. still five stars.',
  'lost property: {M}. found property: nothing at all.',
  'CAPT. ROGER: "the {F} is THEMED! everything here is themed!"',
  'MRS FENWICK-HYDE: "something ate {M}. was that included?"',
  'poll: is the purple thing getting bigger? {P}% say yes.',
  '{L} spotted eating too. staff bring out a second plate.',
  'a {F} has checked in. no booking, no luggage, no problem.',
  'CRESSIDA VANE reviews {M}: "eaten. no notes. bravo."',
  'NIGEL confirms your booking in {D}. and the {F}\'s booking.',
  'BARNABY saw a {F} in {D}. BARNABY told everyone. loudly.',
  'CAPT. ROGER: "the {F} ate {M}! all-inclusive, friends!"',
  'CAPT. ROGER offers the {F} a lounger in {D}. it declines.',
  'CAPT. ROGER: "a {F}! how DELIGHTFUL! do not approach it!"',
], [
  'CAPT. ROGER: "a {F} in {D}? that is a FEATURE, friends!"',
  '{D} evacuating. politely. with drinks. in an orderly fashion.',
  "it ate {M}. that was somebody's {M}!",
  '{P}% of the resort gone. still absolutely no refunds.',
  'MRS FENWICK-HYDE: "{P}% is basically NONE percent, surely."',
  'do NOT book {D}. that is precisely where the {F} is.',
  'MAISIE has named the {F}. it answers to it now. that is new.',
  'NIGEL: "{D} has moved, madam. inward. only slightly."',
  '{L} is ahead by {G}. staff applaud. staff applaud nervously.',
  'a {F} ate {M}. it would like to see the menu now.',
  'CAPT. ROGER: "the {F} is small! ish! smallish! roughly!"',
  '{P}% devoured. the other {R}% is queuing at the bar.',
  'THE GILDED LAGOON asks how {D} is going. RUDE.',
  'CAPT. ROGER: "{P}% is a rounding error! round it DOWN!"',
  'CAPT. ROGER: "{D} is closed for refurbishment. by a {F}."',
  'CAPT. ROGER: "it only ate {M}! we have LOADS of those!"',
], [
  '{D} IS GONE. the towels there were RESERVED.',
  '{P}% DEVOURED. the other {R}% is queuing for a boat.',
  'the {F} ate {M}. it is now asking about dessert.',
  '{S} SECONDS LEFT. conga to the boats!! CONGA!!',
  'CAPT. ROGER: "{D} is gone! tours resume at four regardless!"',
  'MRS FENWICK-HYDE: "{M}?! I was USING that!"',
  'a {F} now owns {P}% of a luxury resort. good for it, honestly.',
  "NIGEL confirms the {F}'s late checkout. a very late checkout.",
  '{S} SECONDS LEFT. finish your drinks calmly. and FAST.',
  'MAISIE says the {F} is "just hungry". MAISIE gets it.',
  '{L} leads by {G}. we are rooting for nobody now. nobody.',
  'CAPT. ROGER: "{P}% gone! that is {R}% still AMAZING!"',
  'the {F} ate {M}. it looked so pleased. we understand.',
  '{S} SECONDS LEFT and the spa is somehow STILL bookable.',
  'CAPT. ROGER: "the {F} ate {M}! an excellent choice!"',
  'CAPT. ROGER: "{S} seconds left! LAST ORDERS at the bar!"',
  'CAPT. ROGER: "{D} has gone! the memories: ALL-INCLUSIVE!"',
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

interface Filled { pct: number; rest: number; form: string; meal: string; dist: string; rival: string; lead: number; secs: number }

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
  return {
    pct,
    rest: 100 - pct,
    form: clip(ctx.form || 'VOIDLING', 14),
    meal: clip(ctx.lastMeal || 'the buffet', 22),
    dist: ctx.district ? DIST_NAME[ctx.district] : 'PIRATE BAY',
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
function usable(t: string, ctx: NewsCtx): boolean {
  if (t.includes('{S}') && ctx.secondsLeft > 70) return false;
  // "{L} leads by {G}" must not fire while the player is comfortably ahead
  if (t.includes('{G}') && ctx.rivalLead <= 0) return false;
  return true;
}

const clampTier = (t: number): NewsTier => (t <= 0 ? 0 : t >= 2 ? 2 : 1);

/**
 * One fully-formed headline, ready to drop straight into the ticker.
 *
 * THE ARC. Four beats, and the picker has the signal for all four:
 *   1 SIGN-ON   the first call of every match. good morning, dance floor open.
 *   2 DENIAL    tier 0 — there is no hole, have a cold drink at the tiki bar.
 *   3 ALARM     tier 1 — oh gosh. the evacuation is a FUN WALK. still smiling.
 *   4 FAREWELL  tier 2 — the island is gone and CAPT. ROGER does the weather.
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
