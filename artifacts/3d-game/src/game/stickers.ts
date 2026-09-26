// ══════════════════════════════════════════════════════════════════════════
//  THE SCRAPBOOK — hidden things, and a book to keep them in
// ══════════════════════════════════════════════════════════════════════════
//
//  THE IDEA, AND WHY IT IS NOT "EVERYTHING YOU ATE".
//  A book that fills in by itself is a receipt. Nobody hunts for a receipt.
//  These are HIDDEN OBJECTS — one per district, tucked somewhere in it, and
//  the only way to get one is to go and look. That turns a world you have
//  already beaten into a world you have not finished, which is the whole
//  reason to open the app on Tuesday.
//
//  WHERE THE NAMES COME FROM, AND WHY THAT MATTERS MORE THAN IT SOUNDS.
//  Every single one of these is a thing the newsroom ALREADY talks about. The
//  Bugle has been saying "the ball of twine is still second biggest" and
//  "Pearl has grown a zucchini the size of a dog" for a thousand headlines
//  into a world where neither object existed. Now they do, and the ticker
//  becomes the hint system for free: a child hears about Pearl's zucchini in
//  the first ten seconds of a match and finds the thing itself on the farm.
//  Lore that pays off in the world is the cheapest delight in the build, and
//  it is already written.
//
//  RARITY IS DISTANCE, NOT DICE. There are no odds in here. `tier` says how
//  hard a thing is to reach — how far out, how big you have to be first, how
//  well hidden — so a rare sticker is a thing you EARNED rather than a thing
//  you rolled. That matters at 4+: no loot box has ever gone near this file
//  and none ever will.
//
//  NOTHING FOUND EVER EXPIRES. A sticker you have found stays found — through
//  resets, reinstalls and every future change to the save format. The one
//  refinement since that promise was first written: SEASONAL stickers exist
//  now (events.ts), and they are hidden in the world only while their season
//  runs. The promise holds where it matters — a found seasonal sticker is
//  yours forever and shows in the book year-round — and the seasons recur
//  yearly, so an unfound one is never lost, only waiting for its month.

import { isEventLive } from './seasons';

export type StickerTier = 'common' | 'rare' | 'legendary';

export interface Sticker {
  /** stable id — this is the save key and the art filename. Never rename. */
  id: string;
  world: 'maple' | 'pirate' | 'gameday' | 'lantern' | 'powder' | 'skylark';
  /** what the child is told they found */
  name: string;
  /** which district it hides in — shown in the book as the hunting ground */
  where: string;
  /** the district id `biomeAt` returns, so the placer knows where to put it */
  biome: string;
  /** the clue, in the newsroom's own voice. This is the Where's-Waldo half. */
  hint: string;
  tier: StickerTier;
  /** SEASONAL GATE. Set to a SeasonEvent id and this sticker is only placed —
   *  and only shown as a gap in the book — while that season runs. Absent on
   *  the permanent forty-eight. Once found it behaves like any other sticker. */
  event?: string;
  /** WHAT THE CARD SHOWS. The name is a joke; a generator needs an object.
   *  "Gus's Missing Sandwich" has to become "a triangular deli sandwich on a
   *  small white plate" or the set comes back as forty-eight interpretations
   *  of a pun. Written per sticker, deliberately plain, no style words — the
   *  style is fixed once in ART_STYLE and every prompt inherits it. */
  art: string;
}

// ── MAPLE FALLS ───────────────────────────────────────────────────────────
const MAPLE: Sticker[] = [
  { id: 'twine-ball', world: 'maple', name: 'The Second-Biggest Ball of Twine', where: 'The Strip', biome: 'strip',
    hint: 'Out on the highway, past the motel. It has never once been the biggest.', tier: 'rare',
    art: 'a colossal ball of brown twine on a low wooden pallet' },
  { id: 'pearl-zucchini', world: 'maple', name: 'Pearl\'s Enormous Zucchini', where: 'The Farm', biome: 'farm',
    hint: 'Four adults have described it as normal. It is not normal.', tier: 'common',
    art: 'one enormous green courgette, longer than a person, on a wooden trestle' },
  { id: 'car-nine', world: 'maple', name: 'Ferris Wheel Car Nine', where: 'The Fairgrounds', biome: 'fair',
    hint: 'Stuck at the top since Tuesday. Empty, as always. Best view in the county.', tier: 'rare',
    art: 'a single red ferris wheel gondola with a curved safety bar' },
  { id: 'gus-sandwich', world: 'maple', name: 'Gus\'s Missing Sandwich', where: 'Main Street', biome: 'mainst',
    hint: 'He put it down for one minute. It was in the fridge the whole time.', tier: 'legendary',
    art: 'a triangular deli sandwich on a small white diner plate' },
  { id: 'marge-meter', world: 'maple', name: 'Marge\'s Parking Meter', where: 'The Square', biome: 'civic',
    hint: 'Day 3,281 of the protest. Twenty five cents for one hour.', tier: 'common',
    art: 'a single vintage coin parking meter on a short post' },
  { id: 'library-book', world: 'maple', name: 'The 1974 Library Book', where: 'Maple Falls High', biome: 'school',
    hint: 'Still overdue. We all know who has it.', tier: 'rare',
    art: 'one thick hardback library book, closed, with a date card tucked in it' },
  { id: 'tree-trampoline', world: 'maple', name: 'The Trampoline Up A Tree', where: 'Maple Heights', biome: 'burb',
    hint: 'Elm Street, about a week now. Nobody has asked how.', tier: 'common',
    art: 'a round backyard trampoline wedged sideways in the branches of a tree' },
  { id: 'vending-raccoon', world: 'maple', name: 'The Raccoon\'s Vending Machine', where: 'Maple Falls High', biome: 'school',
    hint: 'He owns the whole of row C and he is not sharing.', tier: 'rare',
    art: 'a tall snack vending machine with the glass front lit up' },
  { id: 'catfish-photo', world: 'maple', name: 'The 1996 Catfish Photo', where: 'Lakeside', biome: 'lake',
    hint: 'It is on the diner wall. It is bigger than the man holding it.', tier: 'legendary',
    art: 'a framed photograph of an enormous catfish, in a plain wooden frame' },
  // 'park' is not a district ID — MAPLE_DIST maps the park biome to 'fair',
  // so a sticker asking for 'park' can never be placed. Silent, and the kind
  // of thing only a placement census finds.
  { id: 'water-tower', world: 'maple', name: 'The Water Tower', where: 'The Fairgrounds', biome: 'fair',
    hint: 'Repainted in 1991. It says MAPLE FALLS and it holds.', tier: 'common',
    art: 'a tall water tower, a round silver tank on four tall steel legs with a ladder' },
  { id: 'maze-middle', world: 'maple', name: 'The Middle Of The Corn Maze', where: 'The Farm', biome: 'farm',
    hint: 'Norm went in during October. Norm liked it so much he stayed.', tier: 'legendary',
    art: 'a square green hedge maze seen from directly above, with winding paths' },
  { id: 'twine-trophy', world: 'maple', name: 'The 1978 Trophy', where: 'Pine Woods', biome: 'woods',
    hint: 'The year we peaked. Somebody took it camping and never brought it back.', tier: 'rare',
    art: 'a small gold sports trophy with two handles on a wooden base' },
];

// ── PIRATE BAY ────────────────────────────────────────────────────────────
const PIRATE: Sticker[] = [
  { id: 'lounger-nine', world: 'pirate', name: 'Lounger Nine', where: 'The Beach', biome: 'beach',
    hint: 'Booked for the eleventh year running. Do not sit on it.', tier: 'common',
    art: 'a striped blue and white beach lounger with a folded towel on it' },
  { id: 'antique-compass', world: 'pirate', name: 'The Genuine Antique Compass', where: 'The Bazaar', biome: 'market',
    hint: 'Made last Tuesday. Points at the towel hut.', tier: 'rare',
    art: 'a shiny brass pocket compass, open, lid hinged back' },
  { id: 'beach-ball-cannon', world: 'pirate', name: 'The Beach Ball Cannon', where: 'The Port', biome: 'port',
    hint: 'Fires at eleven. Not at ten, whatever the sign says.', tier: 'common',
    art: 'a stubby brass cannon on wooden wheels loaded with a beach ball' },
  { id: 'lost-temple', world: 'pirate', name: 'The Lost Temple', where: 'The Jungle', biome: 'jungle',
    hint: 'Found again every single morning. Ask anyone.', tier: 'legendary',
    art: 'a small stepped stone temple with vines on it' },
  { id: 'crab-manager', world: 'pirate', name: 'The Crab In Management', where: 'Smugglers Cove', biome: 'cove',
    hint: 'Employee of the month. Runs the rock pools. Do not argue.', tier: 'rare',
    art: 'a round orange crab wearing a tiny name badge' },
  // DANCE COVE, NOT THE BEACH, AND IT IS LOAD-BEARING. Dance Cove is where
  // Pirate Bay drops you, and it used to hold exactly one curio: DJ Coconut,
  // a LEGENDARY at radius 2.8 against a void that starts at 0.9. So the child
  // stood in a district whose only collectible was three times too big to eat,
  // with the nearest eatable one 181 units away — against 30u in Game Day, 47u
  // in Lantern Night and 59u in Maple Falls. Measured, that made Pirate Bay
  // the only world where a wandering child's first find came at 119 seconds.
  // A single lost flip-flop is the most natural object at a beach dance there
  // is, and it gives the spawn district something a starting void can swallow.
  { id: 'flip-flop', world: 'pirate', name: 'The Other Flip-Flop', where: 'Dance Cove', biome: 'party',
    hint: 'Eleven in lost property and not one matching pair.', tier: 'common',
    art: 'one single blue rubber flip-flop sandal' },
  { id: 'inflatable-swans', world: 'pirate', name: 'Crate 400', where: 'The Port', biome: 'port',
    hint: 'Three hundred and ninety nine crates of swans. Then this one.', tier: 'rare',
    art: 'a wooden shipping crate with inflatable white swan floats spilling out of it' },
  { id: 'coconut-decks', world: 'pirate', name: 'DJ Coconut\'s One More Hour', where: 'Dance Cove', biome: 'party',
    hint: 'He has said one more hour since Tuesday.', tier: 'legendary',
    art: 'a pair of DJ turntables built into two halves of a coconut' },
  { id: 'enormous-hat', world: 'pirate', name: 'The Enormous Hat', where: 'The Bazaar', biome: 'market',
    hint: 'A monkey has it. It suits him better than it suited you.', tier: 'common',
    art: 'an absurdly wide floppy straw sun hat' },
  { id: 'kevin-beetle', world: 'pirate', name: 'Kevin', where: 'The Jungle', biome: 'jungle',
    hint: 'Maisie has named thirty one beetles. Every one of them is Kevin.', tier: 'rare',
    art: 'a chunky green beetle with one curved horn on its head, seen from above' },
  { id: 'royal-mariner', world: 'pirate', name: 'The Royal Mariner', where: 'The Resort', biome: 'resort',
    hint: 'You will need to be considerably larger. Do book for next year.', tier: 'legendary',
    art: 'a grand white cruise ship with a red funnel' },
  { id: 'harbour-seagull', world: 'pirate', name: 'The Harbour Master\'s Chair', where: 'The Port', biome: 'port',
    hint: 'A seagull has it now and will not be moved.', tier: 'common',
    art: 'a white seagull standing on the back of a weathered wooden chair' },
];

// ── GAME DAY ──────────────────────────────────────────────────────────────
const GAMEDAY: Sticker[] = [
  { id: 'good-mustard', world: 'gameday', name: 'The Good Mustard', where: 'The Plaza', biome: 'plaza',
    hint: 'Ran out at eleven. Somebody has a jar and is not saying who.', tier: 'legendary',
    art: 'a squat glass jar of bright yellow mustard with a paper label' },
  { id: 'gerald-sled', world: 'gameday', name: 'Gerald The Blocking Sled', where: 'The Practice Field', biome: 'practice',
    hint: 'Freshly repainted. Somebody loves that sled.', tier: 'rare',
    art: 'a padded American football blocking sled, freshly painted' },
  { id: 'doreen-casserole', world: 'gameday', name: 'Doreen\'s Casserole', where: 'The North Lot', biome: 'lot',
    hint: 'Set off in row A. Currently somewhere around row H. Still warm.', tier: 'common',
    art: 'a covered ceramic casserole dish with oven gloves under it' },
  { id: 'blue-sedan', world: 'gameday', name: 'The Blue Sedan In Row B', where: 'The North Lot', biome: 'lot',
    hint: 'The PA has asked twice. The PA will ask again.', tier: 'common',
    art: 'a small blue four-door saloon car' },
  { id: 'grill-nine', world: 'gameday', name: 'Ernie\'s Grill Nine', where: 'RV Row', biome: 'rvpark',
    hint: 'Lit on Thursday. He has not discussed sleep since.', tier: 'rare',
    art: 'a black barrel barbecue grill on wheels, lid open, coals glowing' },
  { id: 'dwight-ladder', world: 'gameday', name: 'Dwight\'s Ladder', where: 'The Campus', biome: 'campus',
    hint: 'The only ladder in Marston. It is our entire aerial coverage.', tier: 'rare',
    art: 'a tall aluminium extension ladder, extended' },
  { id: 'parked-sofa', world: 'gameday', name: 'The Sofa In Row D', where: 'Frat Row', biome: 'greek',
    hint: 'Four students to each sofa. This one got out.', tier: 'common',
    art: 'a worn brown three-seat sofa sitting outdoors on its own' },
  { id: 'clock-tower', world: 'gameday', name: 'The Clock Tower', where: 'The Campus', biome: 'campus',
    hint: 'Four minutes fast since 1962 and nobody is going to fix it.', tier: 'legendary',
    art: 'a square brick clock tower with a white clock face' },
  { id: 'foam-finger', world: 'gameday', name: 'The Enormous Foam Finger', where: 'The Plaza', biome: 'plaza',
    hint: 'At gate C, currently larger than the child holding it.', tier: 'common',
    art: 'a giant foam hand with one finger raised' },
  { id: 'motorhome-cat', world: 'gameday', name: 'The Cat On The Motorhome', where: 'RV Row', biome: 'rvpark',
    hint: 'Has not stirred all day. Left before anybody else left anything.', tier: 'rare',
    art: 'a fat ginger cat curled up asleep on a motorhome roof' },
  { id: 'lemonade-stand', world: 'gameday', name: 'The Fifty Cent Lemonade Stand', where: 'The Woods', biome: 'woods',
    hint: 'On its third corner. The price has never once gone up.', tier: 'legendary',
    art: 'a small wooden lemonade stand with a jug and two paper cups on the counter' },
  { id: 'chain-crew', world: 'gameday', name: 'The Chain Crew\'s Chains', where: 'The Bowl', biome: 'bowl',
    hint: 'They measured the same yard twice. They brought them out anyway.', tier: 'common',
    art: 'an American football chain crew\'s two orange down markers linked by a chain' },
];

// ── LANTERN NIGHT ─────────────────────────────────────────────────────────
const LANTERN: Sticker[] = [
  { id: 'upside-lantern', world: 'lantern', name: 'The One Upside-Down Lantern', where: 'Lantern Row', biome: 'stalls',
    hint: 'Nine hundred lanterns. One of them is wrong.', tier: 'rare',
    art: 'one paper lantern hanging upside down, glowing warm' },
  { id: 'eleven-bowls', world: 'lantern', name: 'The Last Of Eleven Bowls', where: 'Lantern Row', biome: 'stalls',
    hint: 'It was eleven. Then nine. Then six. He will not discuss it.', tier: 'legendary',
    art: 'a single ceramic noodle bowl with a blue rim' },
  { id: 'kasa-umbrella', world: 'lantern', name: 'Kasa The Umbrella', where: 'The Moon Bridge', biome: 'moonbridge',
    hint: 'Up, and it is not raining. Kasa knew first. Nobody listens to Kasa.', tier: 'rare',
    art: 'an old paper umbrella standing open on its own' },
  { id: 'fox-mask', world: 'lantern', name: 'Yuki\'s Last Fox Mask', where: 'The Great Gate', biome: 'torii',
    hint: 'Sold out before opening. She kept one back.', tier: 'common',
    art: 'a white and red painted fox festival mask' },
  { id: 'offering-box', world: 'lantern', name: 'The Offering Box', where: 'The Shrine Steps', biome: 'shrine',
    hint: 'It has gone. It weighed a very great deal. It will turn up.', tier: 'rare',
    art: 'a heavy slatted wooden shrine offering box' },
  { id: 'ponta-dumpling', world: 'lantern', name: 'Ponta\'s Ninth Dumpling', where: 'Lantern Row', biome: 'stalls',
    hint: 'He ate nine of his own. Nine. This is the ninth.', tier: 'common',
    art: 'one plump steamed dumpling on a small bamboo tray' },
  { id: 'sleeping-koi', world: 'lantern', name: 'The Sleeping Koi', where: 'The Night Garden', biome: 'nightgarden',
    hint: 'They have had a long year. Please do not wake them.', tier: 'legendary',
    art: 'one orange and white koi carp resting still in dark water' },
  { id: 'good-cup', world: 'lantern', name: 'The Teahouse\'s Favourite Cup', where: 'The Teahouse Terrace', biome: 'teahouse',
    hint: 'Forty cups up there and one of them is the good one.', tier: 'rare',
    art: 'a small handleless ceramic tea cup, glazed pale green' },
  { id: 'twelfth-gate', world: 'lantern', name: 'The Twelfth Gate', where: 'The Great Gate', biome: 'torii',
    hint: 'Count them on the way in. Count them on the way out. Different number.', tier: 'legendary',
    art: 'a single vermilion torii gate' },
  { id: 'yuzu-stair', world: 'lantern', name: 'Madam Yuzu\'s Scrubbing Brush', where: 'The Bathhouse', biome: 'bathhouse',
    hint: 'She did the whole stair twice before opening.', tier: 'common',
    art: 'a wooden scrubbing brush and a wooden pail of water' },
  { id: 'far-pool', world: 'lantern', name: 'The Far Pool', where: 'The Hot Spring', biome: 'onsen',
    hint: 'Most guests work out which one is the hot one eventually.', tier: 'rare',
    art: 'a small round steaming hot spring pool ringed with grey stones' },
  { id: 'lost-sandal', world: 'lantern', name: 'The Lost Sandal', where: 'The Bamboo Path', biome: 'bamboo',
    hint: 'One sandal, one hat. The hat has been claimed.', tier: 'common',
    art: 'one woven straw sandal with a fabric thong' },
];

// ── POWDER PASS ───────────────────────────────────────────────────────────
// Same rules as the other four: NAMED things the valley would actually talk
// about, hidden in real districts, tier by how far off the beaten run they
// sit. The voice is the school-closures desk: dignity, lost equipment, and
// administrative composure.
const POWDER: Sticker[] = [
  { id: 'closure-board', world: 'powder', name: 'The Closure Board', where: 'The Village', biome: 'village',
    hint: 'Every school in the valley, listed. The list has never been longer.', tier: 'common',
    art: 'a wooden notice board crammed with paper closure notices, snow on top' },
  { id: 'champion-snowman', world: 'powder', name: 'Chairman Frost', where: 'The Village', biome: 'village',
    hint: 'Three winters running. The carrot is ceremonial.', tier: 'rare',
    art: 'a grand three-ball snowman with a top hat, medal ribbon and carrot' },
  { id: 'lost-mitten', world: 'powder', name: 'The Lost Mitten', where: 'The Frozen Lake', biome: 'lake',
    hint: 'Red, left hand, mentioned on the radio every morning since November.', tier: 'common',
    art: 'one small red knitted mitten lying on cracked blue ice' },
  { id: 'grit-lorry', world: 'powder', name: 'Old Bess', where: 'The Home Run', biome: 'piste',
    hint: 'The gritter. She has a name, a route, and opinions about both.', tier: 'rare',
    art: 'a chunky orange grit lorry with a snow plough and a name painted on the door' },
  { id: 'frozen-fountain', world: 'powder', name: 'The Paused Fountain', where: 'The Village', biome: 'village',
    hint: 'Froze mid-splash in November. The council minutes say "revisit in spring".', tier: 'rare',
    art: 'a small stone fountain frozen solid mid-spray, icicles like glass' },
  { id: 'ski-instructor-hat', world: 'powder', name: "Instructor Bo's Bobble", where: 'The High Shoulder', biome: 'rim',
    hint: 'The bobble hat that has taught more children to snowplough than Bo has.', tier: 'common',
    art: 'a huge striped bobble hat planted upright in deep snow' },
  { id: 'lift-chair-nine', world: 'powder', name: 'Chair Nine', where: 'The Home Run', biome: 'piste',
    hint: 'Squeaks. Has always squeaked. The lift operator says it adds character.', tier: 'common',
    art: 'a two-seat chairlift chair hanging from its cable, one seat dusted with snow' },
  { id: 'hot-choc-summit', world: 'powder', name: 'The Last Hot Chocolate', where: 'The Lodge', biome: 'lodge',
    hint: 'Made at 7am. Still on the counter. Still, somehow, warm.', tier: 'legendary',
    art: 'a steaming mug of hot chocolate with marshmallows on a timber counter' },
  { id: 'pinecone-king', world: 'powder', name: 'The Pinecone King', where: 'The Pinewood', biome: 'pinewood',
    hint: 'The biggest cone in the wood. The squirrels have formed a committee.', tier: 'rare',
    art: 'an enormous pinecone on a snowy stump, small paw prints circling it' },
  { id: 'sled-record', world: 'powder', name: 'The Record Sled', where: 'The Home Run', biome: 'piste',
    hint: 'Fastest run down the Home Run, 1987. Nobody has dared since.', tier: 'legendary',
    art: 'a vintage red wooden sled mounted on a little plinth with a brass plaque' },
  { id: 'ice-fish-hut', world: 'powder', name: "Norm's Office", where: 'The Frozen Lake', biome: 'lake',
    hint: 'An ice-fishing hut. Norm has caught one fish. He keeps the hours anyway.', tier: 'common',
    art: 'a tiny wooden ice-fishing hut with a stove pipe, warm light in the window' },
  { id: 'aurora-jar', world: 'powder', name: 'The Aurora In A Jar', where: 'The High Shoulder', biome: 'rim',
    hint: 'A jam jar on a fence post that catches the lights. Nobody moves it.', tier: 'legendary',
    art: 'a glass jam jar on a snowy fence post glowing green and violet inside' },
];

// ── THE SEASONAL SETS — four per season, live only while it runs ──────────
// Same rules as the permanent sets: named things the town would talk about,
// hidden in real districts, tier = distance not dice. One legendary each.
const HARVEST: Sticker[] = [
  { id: 'prize-pumpkin', world: 'maple', event: 'harvest', name: 'The Prize Pumpkin', where: 'The Farm', biome: 'farm',
    hint: 'Pearl calls it a personal best. The scale calls it a structural matter.', tier: 'rare',
    art: 'one enormous orange pumpkin with a prize rosette ribbon pinned to it' },
  { id: 'scarecrow-dave', world: 'maple', event: 'harvest', name: 'Scarecrow Dave', where: 'The Fairgrounds', biome: 'fair',
    hint: 'Third at the scarecrow contest. There were three.', tier: 'common',
    art: 'a friendly scarecrow with a straw hat, mounted on a wooden pole' },
  { id: 'cider-barrel', world: 'maple', event: 'harvest', name: 'The Cider Barrel', where: 'Main Street', biome: 'mainst',
    hint: 'Tapped at noon. Empty by five past. Refilled without comment.', tier: 'common',
    art: 'a wooden cider barrel with a small brass tap and a tin cup on top' },
  { id: 'leaf-pile', world: 'maple', event: 'harvest', name: 'The Forbidden Leaf Pile', where: 'Maple Heights', biome: 'burb',
    hint: 'Raked for three days. Do not jump in it. Everybody has jumped in it.', tier: 'legendary',
    art: 'a huge neat pile of orange and red autumn leaves' },
];
const REGATTA: Sticker[] = [
  { id: 'tiny-yacht', world: 'pirate', event: 'regatta', name: 'The Smallest Yacht', where: 'The Port', biome: 'port',
    hint: 'Registered as a yacht. It is a bathtub with a sail.', tier: 'rare',
    art: 'a tiny bathtub boat with one proud white sail' },
  { id: 'race-buoy', world: 'pirate', event: 'regatta', name: 'Buoy Number One', where: 'The Beach', biome: 'beach',
    hint: 'The whole race turns here. It has drifted onto the sand.', tier: 'common',
    art: 'a striped red and white race buoy with a small flag on top' },
  { id: 'regatta-cup', world: 'pirate', event: 'regatta', name: 'The Regatta Cup', where: 'The Resort', biome: 'resort',
    hint: 'Engraved with every winner since records began, which was recently.', tier: 'legendary',
    art: 'a large silver two-handled trophy cup with a sailboat engraved on it' },
  { id: 'signal-flags', world: 'pirate', event: 'regatta', name: 'The Signal Flags', where: 'The Bazaar', biome: 'market',
    hint: 'Spell something rude in nautical. The harbour master is dealing with it.', tier: 'common',
    art: 'a string of colourful triangular nautical signal flags between two poles' },
];
const HOMECOMING: Sticker[] = [
  { id: 'welcome-banner', world: 'gameday', event: 'homecoming', name: 'The WELCOME BACK Banner', where: 'The Campus', biome: 'campus',
    hint: 'Painted by the freshmen. BACK is backwards.', tier: 'common',
    art: 'a painted fabric banner reading WELCOME BACK strung between two poles' },
  { id: 'float-tiger', world: 'gameday', event: 'homecoming', name: 'The Papier-Mâché Tiger', where: 'Frat Row', biome: 'greek',
    hint: 'The parade float\'s crown jewel. It has already lost an ear.', tier: 'rare',
    art: 'a large papier-mache tiger head on a decorated parade float base' },
  { id: 'crown-cooler', world: 'gameday', event: 'homecoming', name: 'The Homecoming Crown', where: 'The North Lot', biome: 'lot',
    hint: 'Last seen on the cooler in row C. The cooler wears it well.', tier: 'legendary',
    art: 'a sparkling homecoming crown sitting on top of a portable drinks cooler' },
  { id: 'spare-tuba', world: 'gameday', event: 'homecoming', name: 'The Spare Tuba', where: 'The Practice Field', biome: 'practice',
    hint: 'In case of tuba emergency. There has never not been one.', tier: 'common',
    art: 'a big brass sousaphone standing upright on the grass' },
];
const MOONFEST: Sticker[] = [
  { id: 'moon-rabbit', world: 'lantern', event: 'moonfest', name: 'The Moon Rabbit', where: 'The Night Garden', biome: 'nightgarden',
    hint: 'Arrived for the festival. Refuses to confirm anything.', tier: 'legendary',
    art: 'a small white rabbit sitting upright beneath a round paper moon' },
  { id: 'mooncake-tower', world: 'lantern', event: 'moonfest', name: 'The Mooncake Tower', where: 'Lantern Row', biome: 'stalls',
    hint: 'Stacked thirteen high. Ponta has been asked to stand elsewhere.', tier: 'common',
    art: 'a tall stack of golden mooncakes on a red lacquer plate' },
  { id: 'wish-lantern', world: 'lantern', event: 'moonfest', name: 'The First Wish Lantern', where: 'The Moon Bridge', biome: 'moonbridge',
    hint: 'Released at moonrise. Came straight back. It likes it here.', tier: 'rare',
    art: 'a glowing paper sky lantern resting on a wooden bridge railing' },
  { id: 'moon-mirror', world: 'lantern', event: 'moonfest', name: 'The Moon In The Water', where: 'The Hot Spring', biome: 'onsen',
    hint: 'The far pool holds it steady. Please do not splash the moon.', tier: 'common',
    art: 'a full moon reflected in a small round dark pool ringed with stones' },
];

const SKYLARK: Sticker[] = [
  // WORLD 6, BELLCLOUD HEIGHTS. Twelve, the same count POWDER PASS carries,
  // spread across all nine districts so no part of the kingdom is a place with
  // nothing in it. The ids are the airfield's and NEVER change (save keys and
  // art filenames; nothing found ever expires) — only what the card says
  // changed. The hints are in the Town Crier's voice: ceremonial, and fond of
  // the people it is about. docs/BELLCLOUD.md §9.8.
  { id: 'whale-rosette', world: 'skylark', name: 'The First Bell Rope', where: 'The Bell Plaza', biome: 'circle',
    hint: 'Plaited from a hundred cloud threads. Pulled once a year, gently.', tier: 'legendary',
    art: 'a thick braided golden bell rope with a tasselled end, coiled on white stone' },
  { id: 'pyms-anemometer', world: 'skylark', name: "Master Tolly's Hand Bell", where: 'The Castle Keep', biome: 'tower',
    hint: 'He rings it before every proclamation, and after, and sometimes during.', tier: 'legendary',
    art: 'a small polished brass hand bell with a wooden handle on a stone windowsill' },
  { id: 'first-skylark', world: 'skylark', name: 'The First Skylark', where: 'The Cloud Meadows', biome: 'meadow',
    hint: 'Sings above the clouds before the bell is rung. Nobody taught it the tune.', tier: 'legendary',
    art: 'a small brown skylark hovering above soft white clouds, wings blurred' },
  { id: 'gretes-binoculars', world: 'skylark', name: 'The Rainbow Chalk', where: 'The Rainbow Ring', biome: 'perimeter',
    hint: 'Somebody redraws the ring every morning. Nobody has seen who.', tier: 'rare',
    art: 'a box of pastel chalk sticks in rainbow colours on pale stone' },
  { id: 'sheep-of-zero-nine', world: 'skylark', name: 'The Sheep On The Avenue', where: 'The Grand Avenue', biome: 'runway',
    hint: 'Asked to move for the parade since the first festival. Position unchanged.', tier: 'rare',
    art: 'a fluffy white sheep standing calmly on pale stone paving' },
  { id: 'rosette-board', world: 'skylark', name: 'The Banner Of The First Festival', where: 'The Castle Yard', biome: 'hangars',
    hint: 'Blue and gold, and older than the castle. The castle is very old.', tier: 'rare',
    art: 'a faded blue and gold banner with a bell emblem hanging on a stone wall' },
  { id: 'hares-form', world: 'skylark', name: "The Cloud Bunny's Burrow", where: 'The Cloud Meadows', biome: 'meadow',
    hint: 'A bunny-shaped dent in the softest cloud on the island, still warm.', tier: 'rare',
    art: 'a small rabbit-shaped hollow pressed into a soft white cloud' },
  { id: 'franz-gloves', world: 'skylark', name: "The Gardener's Watering Can", where: 'The Cloud Gardens', biome: 'launchfield',
    hint: 'For watering cloud trees. Nobody knows if it helps. It seems to help.', tier: 'common',
    art: 'a small gold watering can on a white garden path' },
  { id: 'last-bacon-roll', world: 'skylark', name: 'The Last Cloud Bun', where: 'The Cloud Market', biome: 'breakfast',
    hint: 'Baked at dawn. Still warm. Nobody will admit to wanting it.', tier: 'common',
    art: 'a round fluffy white bun with a swirl of pink icing on a paper napkin' },
  { id: 'thirty-pence-teapot', world: 'skylark', name: 'The Castle Teapot', where: 'The Castle Yard', biome: 'hangars',
    hint: 'Tea has been three pennies since the castle was built. The teapot remembers.', tier: 'common',
    art: 'a round blue and white china teapot on a stone table' },
  { id: 'old-windsock', world: 'skylark', name: 'The Paper Crown', where: 'The Grand Avenue', biome: 'runway',
    hint: "Fell off in last year's parade. Still the best crown on the island.", tier: 'common',
    art: 'a gold paper party crown lying on pale stone paving' },
  { id: 'retrieve-map', world: 'skylark', name: "The Balloon Pilot's Map", where: 'The Balloon Dock', biome: 'arrivals',
    hint: 'Every island on the trip, and a big X on this one.', tier: 'common',
    art: 'a folded paper map of little floating islands with a red X, on a wicker basket rim' },
];

const SNOWDAY: Sticker[] = [
  // POWDER PASS declared SNOW DAY and hid nothing in it. Every other season
  // carries four; for eighteen days a year world 5's season was a ribbon, a
  // palette swap and a book that opened on the same twelve cells as any other
  // day. qa/stickerreg.mjs fails on a season nobody can hunt.
  { id: 'snow-day-bell', world: 'powder', event: 'snowday', name: 'The Snow Day Bell', where: 'The Village', biome: 'village',
    hint: 'Rung once, at six in the morning, by somebody who has waited all year.', tier: 'legendary',
    art: 'a brass handbell standing upright in deep snow outside a school door' },
  { id: 'thermos-of-record', world: 'powder', event: 'snowday', name: 'The Bottomless Thermos', where: 'The Lodge', biome: 'lodge',
    hint: 'Poured eleven cups. Has not been refilled. The lodge does not discuss it.', tier: 'rare',
    art: 'a battered tartan thermos flask with its cup beside it on a timber bench' },
  { id: 'abandoned-homework', world: 'powder', event: 'snowday', name: 'The Abandoned Homework', where: 'The Village', biome: 'village',
    hint: 'Due Monday. Monday has been cancelled.', tier: 'common',
    art: 'an open school exercise book half buried in snow, pages lifting' },
  { id: 'sledding-queue-sign', world: 'powder', event: 'snowday', name: 'The Forty Minute Sign', where: 'The Home Run', biome: 'piste',
    hint: 'Forty minutes from this point. Nobody has ever left the queue.', tier: 'common',
    art: 'a hand-painted wooden sign on a post standing in trampled snow' },
];

const NIGHTGLOW: Sticker[] = [
  // BELLCLOUD HEIGHTS' season, THE EVENING CHIMES (the season id stays
  // 'nightglow', and so do these four sticker ids): the one evening the big
  // bell rests and every little bell on the island rings instead, one after
  // another. Four, as every other season carries four.
  { id: 'glow-baton', world: 'skylark', event: 'nightglow', name: "The Chime Master's Baton", where: 'The Bell Plaza', biome: 'circle',
    hint: 'Every little bell on the island, on the count of three.', tier: 'legendary',
    art: "a slim white conductor's baton resting on white stone beside a small gold bell" },
  { id: 'tethered-whale', world: 'skylark', event: 'nightglow', name: 'The Balloon, Lit', where: 'The Cloud Gardens', biome: 'launchfield',
    hint: 'She does not fly tonight. She glows, which the Crier prefers.', tier: 'rare',
    art: 'a striped hot air balloon standing tethered and glowing from within at dusk' },
  { id: 'glow-programme', world: 'skylark', event: 'nightglow', name: 'The Evening Chimes Programme', where: 'The Cloud Market', biome: 'breakfast',
    hint: 'Lists every bell on the island in the order it will ring.', tier: 'common',
    art: 'a folded paper programme with a small gold bell printed on the cover' },
  { id: 'last-burner', world: 'skylark', event: 'nightglow', name: 'The Last Chime', where: 'The Castle Keep', biome: 'tower',
    hint: 'Rings one beat after the rest, every year, by somebody who cannot count.', tier: 'common',
    art: 'a single small brass bell swinging on a post against a dusk sky' },
];

export const STICKERS: Sticker[] = [
  ...MAPLE, ...PIRATE, ...GAMEDAY, ...LANTERN, ...POWDER, ...SKYLARK,
  ...HARVEST, ...REGATTA, ...HOMECOMING, ...MOONFEST, ...SNOWDAY, ...NIGHTGLOW,
];
// VISIBILITY IS THE ONE RULE, APPLIED IN ONE PLACE. A seasonal sticker exists
// — to the placer, the book grid, every count and every hint — while its
// season runs, or forever once found. Every caller goes through here, so the
// book can never show a gap that points at a thing that is not in the world.
const visible = (s: Sticker): boolean =>
  !s.event || load().has(s.id) || isEventLive(s.event);
export const STICKERS_BY_WORLD = (w: string): Sticker[] =>
  STICKERS.filter((s) => s.world === w && visible(s));
export const STICKER_BY_ID = new Map(STICKERS.map((s) => [s.id, s]));

/** How many points a find is worth, and how loud the moment is. */
export const TIER_POINTS: Record<StickerTier, number> = { common: 150, rare: 400, legendary: 1000 };

// ── the book, on this device ──────────────────────────────────────────────
// One localStorage key holding the ids found, ever. Deliberately NOT part of
// the match save: a sticker survives a reset, a reinstall of the save format,
// and every future change to how a match is scored. It is the one thing in
// here a child is allowed to consider permanently theirs.
const KEY = 'voidStickers';

let found: Set<string> | null = null;
function load(): Set<string> {
  if (found) return found;
  let raw = '';
  try { raw = localStorage.getItem(KEY) ?? ''; } catch { /* private mode */ }
  // unknown ids are kept rather than dropped: a build that renames a sticker
  // by accident must not silently throw away a child's collection
  found = new Set(raw ? raw.split(',').filter(Boolean) : []);
  return found;
}
function save(): void {
  try { localStorage.setItem(KEY, [...load()].join(',')); } catch { /* private mode */ }
}

export const hasSticker = (id: string): boolean => load().has(id);
// counts use the same visibility rule as the grid, or the book's "12 of 52"
// footer would demand seasonal stickers in the middle of March
export const foundCount = (world?: string): number =>
  (world ? STICKERS_BY_WORLD(world) : STICKERS.filter(visible)).filter((s) => load().has(s.id)).length;
export const totalCount = (world?: string): number =>
  (world ? STICKERS_BY_WORLD(world) : STICKERS.filter(visible)).length;

/** Record a find. Returns the Sticker if it was NEW, null if already had. */
export function collect(id: string): Sticker | null {
  const s = STICKER_BY_ID.get(id);
  if (!s) return null;
  const set = load();
  if (set.has(id)) return null;
  set.add(id); save();
  return s;
}

/** Everything found in the current match, for the results screen. */
let thisRun: Sticker[] = [];
export const runFinds = (): Sticker[] => thisRun;
export const clearRun = (): void => { thisRun = []; };
export function collectInRun(id: string): Sticker | null {
  const s = collect(id);
  if (s) thisRun.push(s);
  return s;
}
