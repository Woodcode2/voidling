// What makes the island ALIVE — the 2D "feel recipe" ported to 3D: everything is
// on a leash (people/animals wander a tether), on a track (cars on road lanes,
// the train on a rail loop), or hunting you — and everything flees + SHOUTS when
// the void looms. Plus staged vignette events (mayor, campsite, golf, beach
// volleyball) with biome-flavoured speech bubbles. Each mover is also an edible;
// the host's eat loop takes over once a mover is captured (mesh.userData.eaten).
import * as THREE from 'three';
import { PROPS } from './palette';
import {
  ROAD_CENTERS_3D, blockCenter3D, PLAN_GRID, HALF_BLOCK_3D,
  railPointAt, insideIsland3, inLagoon3, inWater3, worldId, part, mergedProp, nearSpawn,
  type Biome, type AddEdible,
} from './island';
import * as LUXE from './luxe';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { glb, vehicleGlb, contactShadow } from './assets3d';
import * as BAY from './bay';
import * as GD from './gameday';
import * as LN from './lantern';
import * as PW from './powder';
import * as AL from './alpine';
// MAPLE FALLS speaks for itself: newsroom_maple exports its townsfolk voices in
// exactly the shape of the VOICE_AMBIENT / VOICE_PANIC pools below, keyed by
// the same voice ids the cast carries (politician, protester, gossip, farmer,
// teen, kid, diner, booster). They are selected per WORLD at speak time rather
// than merged into the module tables — 'kid' exists in both worlds and a
// Pirate Bay child must never start talking about the pie contest.
import { MAPLE_VOICE_AMBIENT, MAPLE_VOICE_PANIC } from './newsroom_maple';
// …and GAME DAY's, which are keyed the same way again: fan, superfan, cheer,
// band, ref, coach, mascot, cook, student, parent, vendor, steward.
import { GAMEDAY_VOICE_AMBIENT, GAMEDAY_VOICE_PANIC } from './newsroom_gameday';

// Pirate Bay's geometry is authored in WORLD units (0..12000, centre 6000);
// life places things in 3D. Same conversion island.ts uses for everything else.
const w3 = (p: BAY.Pt): [number, number] => [(p[0] - 6000) * 0.05, (p[1] - 6000) * 0.05];
// Game Day is authored in the same world units and shares the same centre,
// so it is literally the same conversion — aliased rather than re-derived so
// there is one place to change if the plateau ever moves.
const g3 = (p: GD.Pt): [number, number] => w3(p as BAY.Pt);

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

// ── AND THE SAME DRAW, WITH A MEMORY ───────────────────────────────────────
// A replay audit ran three full matches and diffed everything a returning
// child could notice. Almost all of it came back strong — the newsroom showed
// 15-17 headlines a match with ZERO repeats inside a run, and the authored
// beats never doubled. One number did not: the crowd said 96-103 lines a match
// and repeated 11 to 21 of them.
//
// That is what uniform sampling does and no amount of extra writing fixes it:
// draw a hundred times from a district pool of seven and the birthday problem
// guarantees you hear some of them three times. The fix is a memory.
//
// THE FIRST VERSION OF THIS DID NOT WORK, and the re-measurement said so —
// 15 repeats against a 15.3 average before, i.e. nothing. It kept ONE global
// list of recently-said lines and checked the tail of it, so for a seven-line
// pool it compared against the last four things said ANYWHERE on the island,
// which are almost always from other districts. The guard never fired.
//
// Recency has to be per POOL. Each pool carries its own ring, held weakly so
// nothing leaks, and the ring is capped at 60% of that pool's length — a
// four-line district must still be able to speak, and a guard longer than its
// own pool would deadlock it.
//
// Exported ONLY so a harness can drive the shipped function rather than a copy
// of it — the last attempt at this was argued from the source instead of
// measured, and the argument was wrong. Nothing but qa/fresh.mjs imports it.
const _poolRecent = new WeakMap<object, unknown[]>();
export function pickFresh<T>(arr: T[]): T {
  if (arr.length < 2) return arr[0];
  let ring = _poolRecent.get(arr as unknown as object);
  if (!ring) { ring = []; _poolRecent.set(arr as unknown as object, ring); }
  const cap = Math.max(1, Math.floor(arr.length * 0.6));
  let out = arr[Math.floor(Math.random() * arr.length)];
  for (let i = 0; i < 8 && ring.includes(out); i++)
    out = arr[Math.floor(Math.random() * arr.length)];
  ring.push(out);
  while (ring.length > cap) ring.shift();
  return out;
}
const setShadow = (m: THREE.Object3D) => m.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });

export type Say = (pos: THREE.Vector3, text: string, kind: 'ambient' | 'panic' | 'event') => void;

// ── biome dialogue (from the 2D AMBIENT_BY_BIOME / PANIC_BY_BIOME pools) ─────────
// These are the FALLBACK pools — "what someone standing HERE would say". Who a
// speaker actually IS overrides them (see VOICE_AMBIENT below): a rich guest
// complains the same way on the beach as at the spa.
const AMBIENT: Record<string, string[]> = {
  // ── PIRATE BAY: a five-star resort cosplaying a pirate hideout
  port: ['mind the gangplank, sir', 'the tender leaves at six', 'that crate is DEFINITELY snacks', 'a seagull took my croissant', 'tide\'s coming in, matey', 'who moored a superyacht THERE', 'says fragile. it is not.', 'salt in me boots. always.', 'thirty bags. for one guest.', 'the harbourmaster is napping', 'polish the brass. again.', 'that ship is a photo prop', 'lobster delivery, coming through', 'this jetty needs a new plank'],
  resort: ['two more weeks of THIS', 'the swim-up snack bar is unreal', 'my cabana has a doorbell', 'MY lounger. the towel says so.', 'is the smoothie included?', 'they fold towels into swans', 'I could live here, honestly', 'spa at four, snacks at five', 'the infinity pool goes FOREVER', 'gold flakes. on the ice cream.', 'they have a pillow menu', 'someone is playing harp. outside.', 'my sunburn has a sunburn', 'this robe is coming home with me'],
  party: ['THIS SONG!! THIS ONE!!', 'DJ COCONUT!! COCONUT!!', 'my hips have opinions', 'conga line in 5!!', 'is the floor supposed to glow', 'someone hydrate me', 'best. holiday. EVER.', 'I am dancing. do not stop me.', 'the bass is in my SMOOTHIE', 'FREE GLOW STICKS!!', 'my flip-flop flew off. worth it.', 'limbo record: still me', 'they hired a whole steel band', 'one more song. one more. ONE.'],
  market: ['fresh mango! FRESH MANGO!', 'that parrot insulted me', 'half price! for you: full price', 'genuine treasure! probably!', 'I bought a hat. no regrets.', 'three coconuts for a doubloon', 'my stall, my rules', 'the fruit here is UNREAL', 'hand-carved. by a machine.', 'a real pirate map. laminated.', 'haggle? I LOVE to haggle.', 'that is a very expensive shell', 'spices! smell them! SMELL THEM', 'authentic. mostly. sort of.'],
  jungle: ['I heard a monkey. I think.', 'the guided walk is at ten', 'bug spray was a good call', 'is that a waterfall??', 'left at the big rock, right?', 'nature! so much of it!', 'something just moved', 'no bars out here. bliss.', 'the zipline goes over THAT?', 'they built a spa in a tree', 'my sandals were a mistake', 'a butterfly landed on me!!'],
  cove: ['there\'s treasure here. FACT.', 'that wreck is CENTURIES old', 'a crab took my sandal', 'X marks... somewhere', 'rock pools! so many crabs!', 'I found a doubloon! (a bottlecap)', 'the tide sounds so nice', 'shipwreck selfie time', 'smugglers! right here! probably!', 'my detector beeped. it lied.', 'that cave goes back FOREVER', 'kayaks at eleven, treasure at noon'],
  // ── OLD TOWN: the village that was here before the resort was. Nobody here
  // is on holiday — these are the people whose grandparents mended these nets.
  oldtown: ['this net has seen things', 'the well is cold. always cold.', 'the resort bought my cousin\'s field',
    'catch was thin. it happens.', 'kids! not through the washing!', 'that thatch needs redoing',
    'my grandfather laid this wall', 'the tourists never come UP here', 'boat\'s in at four. or five.',
    'we had a fort before they had a POOL', 'salt gets in everything', 'mind the bucket!',
    'she mends faster than me. always has.', 'nine generations on this hill', 'the goat is out AGAIN',
    'rope don\'t mend itself', 'bread\'s on. give it ten.', 'that gull knows my name'],
  cozy: ['my hedge. my rules.', 'did you see the fence rules?', 'new mailbox day!', 'fresh cookies, anyone?', 'bin day tomorrow!', 'sprinklers at 6 sharp', 'my gnome is judging you', "lawn's looking CRISP", 'block party friday?', 'that fence is 2cm too tall',
    'a Tuggle sign appeared overnight', 'he canvassed during my nap',
    'the mayor complimented my hedge', 'I am undecided and LOUD about it'],
  fancy: ['this fountain? imported.', 'my topiary won an award', 'darling, how ORDINARY', 'we summer elsewhere, obviously', 'the gala is SATURDAY', 'chandelier #3 arrives today', 'is that valet parking?', 'one simply does not jog', 'my dog has a butler', 'this hedge is by an artist',
    'we do not discuss the mayor', 'Tuggle attended. uninvited.',
    'one does not put signs on a lawn'],
  // ── MAPLE FALLS: `downtown` is MAIN STREET, four shops and a stoplight
  downtown: ['morning! morning. morning.', 'the hardware store knows me', 'that meter is a DISGRACE',
    'parade route goes past here', 'coffee at Gus\'s? always.', 'one stoplight. it works fine.',
    'the bank shut at noon. again.', 'they repainted the crosswalk', 'sign in the window! look!',
    'nine years of that protest', 'window display is new. bold.', 'everybody waves here. everybody.',
    'Tuggle sign in my yard. not by choice.', 'the mayor shook my hand twice',
    'vote Tuggle. or don\'t. I won\'t.', 'he promised a second stoplight',
    'Tuggle waved at a mailbox', 'the debate is at the diner. again.'],
  fair: ['funnel cake! FUNNEL CAKE!', 'the pie judging is at four', 'that goat won a ribbon',
    'the tilt-a-whirl is fine. mostly.', 'nine tickets for ONE ride', 'best week of the whole year',
    'the twine ball is round back', 'I entered the jam. again.', 'the band plays at six',
    'ring toss is RIGGED. I love it.', 'somebody find the pig', 'blue ribbon or nothing'],
  farm: ['that tractor is older than me', 'corn maze opens saturday', 'the rooster starts at 4:40',
    'good dirt out here. the best.', 'a cow got out. tuesday. again.', 'pumpkins are early this year',
    'that silo is county famous', 'four generations on this hill', 'rain would help. or not.',
    'the scarecrow has a jacket now', 'mind the fence. it has moods.', 'town folks drive too fast'],
  campus: ['GO OTTERS! two and eight!', 'band practice. every day. LOUD.', 'the bell is broken. still.',
    'homecoming is a whole ordeal', 'coach says run it AGAIN', 'the field flooded in 2019',
    'we lost. shocker. we lost.', 'bake sale in the gym! cash!', 'my mom knows your mom. sorry.',
    'the trophy case has one trophy', 'pep rally! mandatory pep!', 'six days till my license'],
  strip: ['gas is two cents cheaper here', 'coffee 90 cents. refills free.', 'the special is the special',
    'that booth is Marge\'s booth', 'the laundromat has one dryer', 'we close when Gus says so',
    'the debate is at 8. be early.', 'they banned him. still feed him.', 'nobody leaves here hungry',
    'the neon E has been out for years', 'kids loiter here. always have.', 'pie? we got PEARL\'s pie.'],
  park: ['lovely day for it', 'the ducks are rowdy', "picnic o'clock!", 'kite weather!!', 'ice cream truck?! where!', 'the gazebo band plays at noon', '10k steps, easy', 'frisbee!', 'that squirrel took my chips', 'best bench. tell no one'],
  forest: ['so peaceful out here', 'found the COOLEST rock', "s'mores tonight!", 'trail mix is 90% chocolate', 'shhh… deer!', 'fresh piney air', 'my boots are soaked', 'that birdsong? me. thanks.', 'one with nature right now', 'is moss edible? asking.'],
  beach: ['sunscreen me. NOW.', 'wave check! 🌊', 'sandcastle masterpiece incoming', 'the tide stole my flip-flop', "don't feed the seagulls!!", 'SPF one MILLION', 'crab looked at me funny', 'ice cream, swim, ice cream', 'nap. then more nap.', 'dude, the ocean is SO wet', 'they RAKE this beach at dawn', 'a man brings you cold flannels', 'sunset is at 6:42. sharp.', 'this sand is imported. really.'],
  plaza: ['meet me by the fountain', 'taco truck line is LONG', 'market day is the best day', "the mayor's speaking today!", 'live music by the fountain!', 'street food time', 'fountain coin = one wish', 'free samples!! FREE SAMPLES', 'pigeons own this plaza', 'is there a rally?'],
  zoo: ['the elephant waved at me!!', 'do NOT tap the glass', 'look, flamingos!', 'gift shop. NOW.', 'feeding time!!', 'popcorn! 🍿', 'the lions look hungry', 'penguins: tiny tuxedo guys', 'that monkey has my hat', 'sloth update: still asleep'],
  // ── GAME DAY: a fall Saturday in Marston, and the whole town is here. The
  // keys are island.ts's Biome ids, which rename three of gameday.ts's
  // districts on the way out (plaza→gate, campus→quad, woods→treeline).
  // House style is newsroom_gameday's: proper sentences, terminal punctuation,
  // no politics, nothing anybody could read as a contest with sides.
  lot: ['We park in this spot every year.', 'The grill is on. Give it ten.',
    'Cornhole. Right now. Grab a bag.', 'Whose truck is that? Lovely truck.',
    'I have chairs for everybody.', 'Kickoff is at three. We have time.',
    'Somebody brought a whole smoker.', 'That is a lot of casserole.',
    'The radio is on. Turn it up.', 'Row nine, same as always.',
    'Second helping? Yes. Obviously.', 'Buckley came by. Buckley waved.',
    'Bring the cooler. And the other one.', 'Tailgate first, football second.'],
  gate: ['Gate C is quicker. It always is.', 'Tickets are on my phone. Somewhere.',
    'Bag check is on the left there.', 'Two hot dogs and a lemonade.',
    'They are letting us in early!', 'The queue moves. It always moves.',
    'The helmet tunnel is that way.', 'Programme? One programme, please.',
    'I lost my group. I will find them.', 'Have your bags open, please.',
    'The band comes through here first.', 'Souvenir cup. Free refills.'],
  bowl: ['Look at that. Just look at it.', 'Ninety thousand of us in here.',
    'The turf looks perfect today.', 'Section 114, row three.',
    'When it gets loud, it gets LOUD.', 'Stand up! Everybody up!',
    'The tunnel is right down there.', 'I have had this seat for years.',
    'Here comes the band. Here we go.', 'That roar goes through your chest.'],
  rvpark: ['We arrived on Wednesday night.', 'The awning took an hour to raise.',
    'Satellite dish is up. We are set.', 'Coffee is on. Help yourself.',
    'Forty feet of home, right here.', 'The generator hums. You get used to it.',
    'We have done this for twenty years.', 'There is a hot tub. Genuinely.',
    'Deck chairs are round the back.', 'Every neighbour brings a dish.'],
  greek: ['The sofa lives on the porch now.', 'That banner took us all night.',
    'Music down a bit! A BIT!', 'The whole street is out here.',
    'We painted the porch again.', 'Somebody is on the roof. Again.',
    'Meet at the steps before we walk.', 'The pancakes start at nine.'],
  quad: ['Class was cancelled. Obviously.', 'The clock tower is four minutes fast.',
    'This brick walk is a hundred years old.', 'Meet me by the statue after.',
    'I study here when it is quiet.', 'It is never quiet on a Saturday.',
    'The chime goes off at the hour.', 'They ring the bell when we win.'],
  practice: ['They ran that drill nine times.', 'The sleds are heavier than they look.',
    'Water cart! Over here!', 'Coach has the whistle. Coach always does.',
    'Kick it again. And again.', 'That is a long way to throw a ball.',
    'The bleachers hold about forty.', 'Line up. From the top.'],
  treeline: ['The colour out here is unreal.', 'You can hear the crowd from here.',
    'Best parking spot on the whole hill.', 'Leaves right up to my ankles.',
    'It is quieter under the trees.', 'We walk in from here every year.',
    'Somebody left a chair. Ages ago.', 'You can see the whole bowl from here.'],
};
const PANIC: Record<string, string[]> = {
  port: ['ABANDON DOCK!!', 'save the CARGO!!', 'not my CARGO!!', 'to the boats!! ALL of them!!', 'it ate the pier!!', 'the superyacht!! START IT!!', 'lower the fancy lifeboat!!'],
  resort: ['MY LOUNGER!!', 'not the swim-up snack bar!!', 'my HOLIDAY!!', 'I paid for ALL-INCLUSIVE!!', 'grab the sunscreen and RUN!!', 'it ate the infinity pool!!', 'not the TOWEL SWANS!!'],
  party: ['THE MUSIC STOPPED!!', 'not the DANCE FLOOR!!', 'conga line — THIS WAY!!', 'DJ RUN!! DJ RUUUN!!', 'it ate the speakers!!', 'save the glow sticks!!', 'last dance!! literally!!'],
  market: ['MY MANGOES!!', 'the parrot saw everything!!', 'closing early!! VERY early!!', 'not my STALL!!', 'take the coconuts!!', 'everything must go!! WE must go!!'],
  jungle: ['INTO THE TREES!!', 'that is NOT a monkey!!', 'follow the trail!! ANY trail!!', 'it ate the waterfall!!', 'the tree spa is GONE!!', 'zipline!! EVERYONE!!'],
  cove: ['it took the TREASURE!!', 'crabs, scatter!!', 'not the shipwreck!!', 'to the rock pools!!', 'X marked THIS. my mistake.', 'grab the shovel and GO!!'],
  oldtown: ['THE NETS!! GRAB THE NETS!!', 'nine generations!! GONE!!', 'get the KIDS off the wall!!',
    'it took the WELL!!', 'to the fort!! it held before!!', 'my grandfather built that!!',
    'leave the catch!! LEAVE IT!!'],
  cozy: ['NOT my garden gnome!!', 'MY LAWN!!', 'save the flower beds!!', 'grab the cookies!!', 'the sprinklers did NOTHING', 'it skipped the FENCE FORM!!'],
  fancy: ['my ANTIQUES!!', 'the CHANDELIER!!', 'call the BUTLER!!', 'flee ELEGANTLY!!', 'NOT the topiary!!', 'the butler quit!!'],
  downtown: ['NOT MAIN STREET!!', 'it ate the hardware store!!', 'the parade route is GONE!!',
    'somebody move the stoplight!!', 'it left the METER. of course.', 'call the Bugle!! CALL HER!!'],
  fair: ['SAVE THE PIES!! ALL OF THEM!!', 'the twine ball!! THE TWINE BALL!!', 'it ate the ferris wheel!!',
    'my blue ribbon!! MY RIBBON!!', 'get the goat!! GET THE GOAT!!', 'judging is POSTPONED!!'],
  farm: ['open the GATES!! let em run!!', 'the tractor!! start the tractor!!', 'it ate the corn maze!!',
    'four generations!! GONE!!', 'somebody grab the chickens!!', 'not the SILO!! that\'s county famous!!'],
  campus: ['PRACTICE IS CANCELLED!!', 'coach says RUN. actually run!!', 'it ate the FIELD!!',
    'save the trophy!! the ONE trophy!!', 'band, keep playing!! KEEP PLAYING!!', 'homecoming is OFF!!'],
  strip: ['it ate the DINER!!', 'grab the pie!! LEAVE the eggs!!', 'the coffee!! save the coffee!!',
    'we are CLOSED. permanently. RUN.', 'not Marge\'s booth!!', 'refills are OVER!!'],
  park: ['not the PICNIC!!', 'the DUCKS!! SAVE THE DUCKS', 'grab the frisbee, RUN!!', 'abandon the sandwiches!!', 'the gazebo!! NOO!!', 'jog!! FOR REAL this time!!'],
  forest: ['BEAR! no. BIGGER!!', 'ABANDON TRAIL!!', "save the s'mores!!", 'the trees are LEAVING!!', 'hug a tree GOODBYE!!', 'nature says RUN!!'],
  beach: ['SAVE THE COOLER!!', 'my SANDCASTLE!!', 'not the towels!!', 'gnarly!! BAD gnarly!!', 'paddle, dude, PADDLE!!', 'even the crabs left!!', 'it ate the raked bit!!'],
  plaza: ['EVERYONE RUN!!', "it's REAL!!", 'save the taco truck!!', 'the fountain!! NOOO!!', 'my churros!!', "this wasn't on the flyer!!"],
  zoo: ['WHO OPENED THE PENS?!', 'the lions are LOOSE!!', 'the flamingos flew AWAY!!', 'even the sloth is running!!', 'save the gift shop!!', "WE'RE the feeding time!!"],
  generic: ['AAAAH!!', 'RUN FOR IT!!', "it's HUNGRY!!", 'tell my cat I love her!!', 'nope nope NOPE!!', 'why is it SMILING?!'],
  // ── GAME DAY. Everyone here is having the best day of the year and it is
  // being taken away one row of trucks at a time.
  lot: ['It took the TRUCK! The whole truck!', 'Get the cooler! LEAVE the chairs!',
    'Grill is off! Grill is OFF! Move!', 'Row nine is GONE!', 'Everybody up the hill! Now!',
    'It ate the casserole. All of it.', 'My chairs! Somebody grab my chairs!'],
  gate: ['Gate C! Everybody to Gate C!', 'Leave the bags! Just go!',
    'It took the ticket booth!', 'The tunnel is gone! It is gone!',
    'Walk, do not run! Please walk!', 'Follow the steward! Follow her!'],
  bowl: ['Clear the field! Clear it!', 'Everybody out through the tunnel!',
    'It is on the fifty! The FIFTY!', 'That is the north stand! Gone!',
    'Down the steps! Keep moving!', 'They are still calling the game!'],
  rvpark: ['Start the engine! START IT!', 'It took the awning!',
    'Forty feet of home! Gone!', 'Unhook the water! No, leave it!',
    'Get the dog! Where is the dog?', 'Everybody in! Doors shut! Go!'],
  greek: ['Off the roof! GET OFF THE ROOF!', 'It ate the porch! The whole porch!',
    'Save the banner! Somebody!', 'Down the steps! All of you!',
    'That was our sofa!', 'Out the back! Out the back!'],
  quad: ['It took the clock tower!', 'Off the grass! Off the grass!',
    'The bell is ringing on its own!', 'Everybody to the brick walk!',
    'Not the statue! Not the statue!'],
  practice: ['Off the field! Everybody off!', 'It ate the goalposts!',
    'Coach! COACH! We are going!', 'Leave the sleds! Just leave them!',
    'Down the tunnel! Single file!'],
  treeline: ['Into the trees! Go! Go!', 'Up the hill! Keep going up!',
    'It came through the woods!', 'Leave the chairs! Leave everything!',
    'You can still hear the crowd.'],
};
const biomeKey = (b: Biome): string => (b === 'military' || b === 'airport') ? 'downtown' : b;

// ══ WHO IS TALKING ═══════════════════════════════════════════════════════════
// A line should sound like the PERSON, not the postcode. Every Pirate Bay NPC
// carries a voice key; these pools beat the per-biome fallback above. Register:
// silly, warm, no menace. Kept short — a phone speech bubble truncates fast.
const VOICE_AMBIENT: Record<string, string[]> = {
  // out-of-touch guests: everything is a service failure, nothing is their fault
  rich: [
    'this is NOT the good lemonade', 'my yacht is double-parked', 'I asked for a SEA view.',
    'the concierge knows my name', 'my chef flew in this morning', 'is this... TAP water?',
    'the other guests are so LOUD', 'we know the owner, obviously', 'my sunbed has a butler',
    'I never queue. ever.', 'this robe is not silk. feel it.', 'darling, fetch the smaller boat',
    'we summered here in the 90s', 'my daughter has a jet ski guy', 'this sand is very... public',
    'send it to the room. any room.', 'I tipped someone. once.', 'the sunset is running late',
    'nobody warned me about weather', 'that pool has PEOPLE in it', 'my suitcase has its own suite',
    'I only eat food I can pronounce',
  ],
  // kids: the only guests actually enjoying themselves
  kid: [
    'MUM! MUM! a purple void!!', 'can we keep it?? can we??', 'I named it Gary',
    'it ate a whole PALM TREE', 'is it a pet? it looks like a pet', 'I want to feed it my chips',
    'PHOTO! quick, do a pose!', 'it is SO round. so so round.', 'best holiday ever ever EVER',
    'dad said no. so I asked mum.', 'it blinked! I SAW it blink!', 'can I ride it? just once?',
    'my ice cream fell in. worth it.', 'grown ups are so boring', 'nobody believed me. NOBODY.',
    'it likes me. I can tell.', 'shhh. it is sleeping. maybe.', 'I drew it. want to see?',
    'do voids like mango?', 'I am not scared. YOU are.', 'it followed me home. probably.',
  ],
  // event managers: an apocalypse is simply an unscheduled activity
  manager: [
    'Coconut Hour starts at four!', 'please form an orderly conga', 'towel folding: pier two!',
    'has anyone seen the pinata?', 'smile! you are on HOLIDAY!', 'limbo at five, sunset at six',
    'yes, it IS mandatory fun', 'who booked the parrot? me.', 'kids club needs one more kid',
    'GREAT energy, row three!', 'the bouncy castle is inflating', 'raffle tickets! last call!',
    'we are BACK ON SCHEDULE', 'quiz night: no phones please', 'clap if you can hear me!!',
    'pool games in ten! stretch!', 'lost flip-flop at the smoothie bar', 'my clipboard, my kingdom',
    'anyone for water aerobics?', 'the schedule is a SUGGESTION', 'let us hear it for the SUN!',
  ],
  // staff: dry, off-the-clock energy, in-jokes about the guests
  staff: [
    'four hours left. four.', 'table nine wants a new sun', 'someone tipped me in buttons',
    'I fold 400 towels a day', 'the swans are made of towels', 'guest asked to see the chef',
    'we are out of the good ice', 'yes sir, the sea is closed', 'break in ten. maybe twenty.',
    'room 12 ordered nine lobsters', 'that man tried to buy a wave', 'I have seen the buffet. things.',
    'clock off, then chips', 'the parrot works harder than me', 'somebody lost a shoe. again.',
    'I only work here in theory', 'pool boy? POOL PROFESSIONAL.', 'they complained about the moon',
    'do not ask about the ice swan', 'new guy is hiding in the laundry', 'nine days till my day off',
  ],
  // pirate entertainers: committing HARD to a bit nobody asked for
  pirate: [
    'ARR. and also, ARR.', 'yo ho ho, and a tip jar', 'me parrot has an agent now',
    'shiver me... lovely weather', 'avast! that be a buffet!', 'I be contractually a pirate',
    'walk the plank! it is 30cm.', 'arrr you having a nice day', 'me hearties! and me hearty!',
    'this be me pirate voice. hi.', 'treasure map: also a menu', 'polly wants a sun lounger',
    'sixteen men on a paddleboat', 'me eyepatch be fashion, savvy', 'yarrr. is that the time?',
    'the sea? never been. seasick.', 'photos with the captain: free!', 'me hook is a spoon, honestly',
    'a pirate life, but with wifi', 'arr, mind the wet floor sign', 'me treasure be dental work',
  ],
};
const VOICE_PANIC: Record<string, string[]> = {
  rich: [
    'I am NOT insured for this!!', 'GET ME THE MANAGER!!', 'my LUGGAGE!! all nine bags!!',
    'this is a ONE STAR holiday!!', 'to the yacht!! the BIG yacht!!', 'refund AND an apology!!',
    'nobody said VOID at check-in!!', 'save the lemonade!! ALL of it!', 'my robe!! my lovely robe!!',
    'call my people!! ALL my people!', 'I want to speak to the ISLAND!!',
  ],
  kid: [
    'RUN!! this is the BEST BIT!!', 'it wants to play TAG!!', 'WHEEEEE!!',
    'wait for me!! WAIT!!', 'again!! do it AGAIN!!', 'mum you are SO slow!!',
    'better than the pool!!', 'I TOLD you it was real!!', 'catch me if you can, Gary!!',
    'five more minutes!! PLEASE!!',
  ],
  manager: [
    'ORDERLY conga line! THIS WAY!', 'this is a SCHEDULED event!!', 'unscheduled! but still FUN!!',
    'follow my flag!! MY FLAG!!', 'evacuating is a GROUP ACTIVITY', 'points for best running!!',
    'we will refund the limbo!!', 'nobody panic! panic GENTLY!!', 'plan B! we HAVE a plan B!',
    'to the buffet!! I mean— OUT!!', 'everybody say WEEEE!!',
  ],
  staff: [
    'not my problem. LEAVING.', 'that is not my job!!', 'I quit! effective IMMEDIATELY',
    'staff exit! staff exit!!', 'grab the tips jar!!', 'kitchen is SHUT. tell them.',
    'I am NOT cleaning that up!!', 'shift over. FOREVER.', 'the buffet is closed!! RUN!!',
    'last one out gets the mop!!',
  ],
  pirate: [
    'ABANDON BIT!! I mean SHIP!!', 'arrr!! ARRR!! actual arrr!!', 'me parrot went freelance!!',
    'that be no seagull!!', 'to the plank!! the 30cm one!!', 'yo ho HOOOO!!',
    'break character!! BREAK IT!!', 'save the foam treasure chest!!', 'even the parrot is running!!',
    'arr, this be above me pay!!',
  ],
};

// mesh is nullable in practice: the train mover is pushed on every world but
// only BUILT on Maple, so it reports null on the other three. See the gate.
// ── ERRANDS ────────────────────────────────────────────────────────────────
// "Every chat bubble, every person moving, there's got to be a purpose behind
// that." (the owner). A townsperson's idle behaviour was ang += rand(-1,1)*dt*3
// on a leash: measured over 30 match-seconds at SEED=7, the median person walked
// 11.5 units for every 1 unit of progress and 8-21% of them ever completed a
// journey (qa/purpose.mjs, docs/crews/round-5/purpose-data/). This gives them
// somewhere to be: walk a leg, stand there with your hands busy, pick the next.
//
// `leg` is OPT-IN, per call site. Omit it and the person keeps today's random
// walk byte for byte — which is why the zoo animals stay in their baked pens,
// the parade column stays a column, the conga line stays a line, and a sixth
// world costs nobody an afternoon.
//
// INVARIANT: paceMul < 2.4 on every world. The contagion ping runs at base*2.4
// and a flee at base*3.4, so the void outranks the errand by speed as well as
// by branch order.
const ERR = {
  D0: 2.5, D1: 6.0,      // dwell seconds at the destination
  TURN: 0.9,             // radians of heading persistence between legs (E[cos] = 0.87)
  LEASH: 3.0,            // a person's district is leg * LEASH from home…
  SPREAD: 0.15,          // …and a leg is leg * (1 +/- SPREAD)
  REAIM: 12,             // frames between heading refreshes (a Smi: allocates nothing)
};

interface Mover {
  mesh: THREE.Object3D | null;
  /** fast movers are EXEMPT from the stagger bands: chop visibility scales
   *  with speed × update interval, so a skater at half rate jumps twice a
   *  walker's stutter — the owner's "powder items are jumpy". The fast fleet
   *  is ~22 bodies; full-rating them costs nothing measurable. */
  fast?: boolean;
  update(dt: number, t: number, vx: number, vz: number, vR: number): void;
}
export interface Life {
  /** `gate` = world-units past which a mover updates on a stagger instead of
   *  every frame. Omit for the old behaviour (everything, every frame). */
  update(dt: number, t: number, vx: number, vz: number, vR: number, gate?: number): void;
  /** Hold the crowd calm for `sec` seconds — see the note on `calmT`. */
  calm(sec: number): void;
  /** QA only: how many movers fall inside a given gate. The ones inside run
   *  every frame with or without it, so this is the honest answer to "does
   *  gating change what the player sees". */
  moverStats(gate: number): { near: number; total: number };
  /** How bad has it got, 0..1. Drives what the crowd says and how often.
   *  Fed from the match loop off the same devoured/form signal the newsroom
   *  uses for its tier, so the street and the broadcast escalate together. */
  tension(v: number): void;
  /** The match spine's line into the world: an authored BEAT fires and the
   *  world is told, so the banner and the street agree. 'match' resets every
   *  set piece for a fresh run (called from beginMatch/resetMatch, AFTER the
   *  edible-restore loop, which un-hides everything). x/z carry the void's
   *  position for pieces that must spawn where the child is looking. */
  cue(name: string, x?: number, z?: number): void;
}

// ── mesh factories ─────────────────────────────────────────────────────────────
// one set of trim materials for the whole fleet. Every car used to allocate six
// of its own, which is 300-odd materials on a full Maple street grid.
// ── ROUNDED BOX ─────────────────────────────────────────────────────────────
// The townsfolk got a documented fidelity pass and the traffic never did.
// Measured side by side at gameplay framing: a pedestrian is 1,052 triangles
// filling 121 screen px (8.7 tris/px); the car parked beside them is a stack of
// hard-edged BoxGeometry at 0.97 tris/px. Nothing about a car is hard-edged in
// real life, and a bare box reads as unfinished next to a smooth-shaded person
// — which is exactly the "blocky, not HD" the owner reported, pointing at cars.
//
// A box, then every vertex pushed out onto the surface of its own corner
// radius. Cheap (a 3-segment box is ~200 triangles), exact, and it keeps the
// silhouette a child recognises as a car. Geometries are cached by shape, so a
// thirty-car fleet costs one buffer per distinct body part.
const _rbox = new Map<string, THREE.BufferGeometry>();
export function roundedBox(w: number, h: number, d: number, r: number, seg = 3): THREE.BufferGeometry {
  const key = `${w}|${h}|${d}|${r}|${seg}`;
  const hit = _rbox.get(key);
  if (hit) return hit;
  // ── WELD BEFORE ROUNDING, OR THE FILLET SHIPS WITH CREASES ──────────────
  // BoxGeometry stores every corner vertex THREE TIMES — once per face, split
  // so each copy can carry that face's normal and uv. computeVertexNormals
  // averages per stored vertex, so the copies along each of the twelve edges
  // kept three different normals and the "rounded" box rendered with a hard
  // crease line exactly where the fillet is. That is why every vehicle in the
  // game photographed as a slab with a curved outline: rounded geometry,
  // box shading. Deleting uv+normal and welding by position gives
  // computeVertexNormals one shared vertex per corner, and the fillet finally
  // shades as a curve. Nothing here needs uvs — the car materials are flat
  // colours and part() deletes uv anyway.
  const g0 = new THREE.BoxGeometry(w, h, d, seg, seg, seg);
  g0.deleteAttribute('uv'); g0.deleteAttribute('normal');
  const g = mergeVertices(g0);
  g0.dispose();
  const pos = g.attributes.position as THREE.BufferAttribute;
  // never let the radius exceed half of the smallest side, or the shape inverts
  const rr = Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4);
  const ix = w / 2 - rr, iy = h / 2 - rr, iz = d / 2 - rr;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    // the nearest point on the inner box…
    const cx = Math.max(-ix, Math.min(ix, v.x));
    const cy = Math.max(-iy, Math.min(iy, v.y));
    const cz = Math.max(-iz, Math.min(iz, v.z));
    // …then step out along the corner radius from there
    const dx = v.x - cx, dy = v.y - cy, dz = v.z - cz;
    const len = Math.hypot(dx, dy, dz);
    if (len > 1e-6) {
      const k = rr / len;
      pos.setXYZ(i, cx + dx * k, cy + dy * k, cz + dz * k);
    }
  }
  pos.needsUpdate = true;
  g.computeVertexNormals();   // smooth shading across the fillet
  _rbox.set(key, g);
  return g;
}

const _carBody = new Map<number, THREE.MeshStandardMaterial>();
const carBodyMat = (c: number) => {
  let m = _carBody.get(c);
  if (!m) { m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.32, metalness: 0.22 }); _carBody.set(c, m); }
  return m;
};
const CAR_GLASS = new THREE.MeshStandardMaterial({ color: 0x2c3a4e, roughness: 0.12, metalness: 0.4 });
const CAR_HL = new THREE.MeshStandardMaterial({ color: 0xfff2c8, emissive: 0xffe9a8, emissiveIntensity: 0.7, roughness: 0.3 });
const CAR_TL = new THREE.MeshStandardMaterial({ color: 0xff4d4d, emissive: 0xd82a2a, emissiveIntensity: 0.55, roughness: 0.3 });
// ── A TYRE IS DARK. A TYRE IS NOT A HOLE. ────────────────────────────────
// 0x20242c renders at displayed luminance 5.3 on a LIT face in Maple and at
// exactly rgb(0,0,0) on a shaded one, so the food truck's wheels came out as
// flat black ellipses with no rim, no hub and no gradient, cut into a pale
// road. TEAM MOVERS found them in store/03-devouring.png; qa/blackprops.mjs
// had passed that frame because they measure 1785 and 1698 device px against
// a 2000px bar I had guessed rather than derived.
//
// 0x2a2e38 is not a new colour: it is alpine.ts's CHAR, already described in
// that file as "coal, ironwork, tyres". Every other world's near-black sits at
// 0x2a-0x2c and only this one was down at 0x20. It reads L16.8 lit and keeps a
// gradient in shadow, which is the whole difference between a dark object and
// a missing one.
const CAR_TYRE = new THREE.MeshStandardMaterial({ color: 0x2a2e38, roughness: 0.9 });
const CAR_HUB = new THREE.MeshStandardMaterial({ color: 0xc9cdd6, roughness: 0.4, metalness: 0.5 });
function makeCar(): THREE.Group {
  const g = new THREE.Group();
  const col = pick(PROPS.car);
  CAR_GLASS.color.setHex(PROPS.carGlass);
  const bodyMat = carBodyMat(col);
  // 7.1 long and 3.4 tall next to a 3.5-unit pedestrian: a car the height of a
  // person and barely twice their length. Stretched to 9.1 and dropped to 3.1,
  // which is where a real saloon sits against a real adult.
  const body = new THREE.Mesh(roundedBox(7.2, 1.4, 2.9, 0.34), bodyMat);
  body.position.y = 1.18; g.add(body);
  const hood = new THREE.Mesh(roundedBox(1.9, 1.0, 2.7, 0.26), bodyMat);
  hood.position.set(3.35, 1.05, 0); g.add(hood);
  const cabin = new THREE.Mesh(roundedBox(3.7, 1.25, 2.55, 0.28), CAR_GLASS);
  cabin.position.set(-0.65, 2.35, 0); g.add(cabin);
  const roofM = new THREE.Mesh(roundedBox(3.45, 0.18, 2.5, 0.08), bodyMat);
  roofM.position.set(-0.65, 3.02, 0); g.add(roofM);
  // headlights + taillights
  for (const sz of [-0.95, 0.95]) {
    const a = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.34, 0.5), CAR_HL); a.position.set(4.3, 1.15, sz); g.add(a);
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.3, 0.45), CAR_TL); b.position.set(-3.62, 1.3, sz); g.add(b);
  }
  for (const sx of [-2.3, 2.45]) for (const sz of [-1.45, 1.45]) {
    const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.5, 22), CAR_TYRE);
    wh.rotation.x = Math.PI / 2; wh.position.set(sx, 0.8, sz); g.add(wh);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.54, 16), CAR_HUB);
    hub.rotation.x = Math.PI / 2; hub.position.set(sx, 0.8, sz); g.add(hub);
  }
  // most of the fleet upgrades itself to the AI cars once the GLBs stream in
  if (Math.random() < 0.65) vehicleGlb(g, Math.random() < 0.72 ? 'car_sedan' : 'car_taxi', 8.0);
  return g;
}
interface Limbs {
  la: THREE.Object3D; ra: THREE.Object3D; ll: THREE.Object3D; rl: THREE.Object3D;
  torso: THREE.Object3D; head: THREE.Object3D;
  phase: number; bob: number;   // bob = per-person stride height, so a crowd is not a metronome
}

// shared material + geometry pools — hundreds of townsfolk, one GPU footprint
const _matCache = new Map<string, THREE.MeshStandardMaterial>();
// alias: several factories declare a local `mat`, which shadows the helper
const sharedMat = (c: number, r = 0.85, f = false, d = false) => mat(c, r, f, d);
function mat(color: number, roughness = 0.85, flat = false, dbl = false): THREE.MeshStandardMaterial {
  const k = `${color}:${roughness}:${flat ? 1 : 0}:${dbl ? 1 : 0}`;
  let m = _matCache.get(k);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness, flatShading: flat, side: dbl ? THREE.DoubleSide : THREE.FrontSide });
    _matCache.set(k, m);
  }
  return m;
}
// ══ THE BODY KIT ═════════════════════════════════════════════════════════════
// A townsperson used to be a STACK OF BOXES: box legs, a box torso, box arms, a
// sphere head, and one more mesh per accessory — 9 meshes bare, 17 in a tricorn
// with a parrot. At the play camera (15-40u, looking down) that reads as a brick
// sliding across the sand, and 200 of them cost ~2400 draw calls.
//
// A person is now SIX MERGED MESHES: body, head, two arms, two legs. Each is
// baked once at build time from the base primitives below with per-vertex
// colours, so the ENTIRE population shares ONE material and a person costs six
// draw calls whether they are a naked swimmer or a captain with a parrot, an
// eyepatch and a drink. Only the six pieces that have to animate are separate.
//
// Everything the camera cannot see is deleted rather than drawn: limb segments
// are open-ended tubes (their caps are inside the joint above), the torso barrel
// has no lid or floor, and nothing below the ankle gets detail the contact
// shadow does not already imply.
const PEOPLE_MAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82 });

// base primitives — tessellated ONCE, stripped of indices and UVs, then cloned
// per part. Cloning two typed arrays is far cheaper than re-tessellating, which
// matters when 200 people x ~26 parts get baked during level build.
const nb = (g: THREE.BufferGeometry): THREE.BufferGeometry => {
  const n = g.toNonIndexed(); g.dispose(); n.deleteAttribute('uv'); return n;
};
// ── TESSELLATION: THE PEOPLE WERE FACETED ────────────────────────────────────
// The owner: "Some people or items aren't HD or crisp, they're rather blocky
// like the image shows a person." He is looking at real geometry, not a shading
// bug — PEOPLE_MAT is smooth-shaded with no flatShading anywhere. The counts
// were simply too low for a camera that gets to fifteen units:
//
//   head            SphereGeometry(r, 8, 6)   — an octagon in silhouette
//   arms and legs   CylinderGeometry(..., 5)  — PENTAGONAL PRISMS
//   torso           8 segments
//
// A five-sided arm has a visible flat facing the camera at any distance a child
// plays at. These are the primitives, tessellated once and cloned, so raising
// them costs build time and triangles but not draw calls: a person is still six
// merged meshes and the whole population still shares one material.
//
// Chosen by what the play camera actually sees, not uniformly. The head and
// torso are the large smooth curves the eye reads, so they get the most; hands
// and hat bands are a few pixels and stay cheap. Measured triangle cost is
// recorded in the commit.
const B = {
  sph: nb(new THREE.SphereGeometry(0.5, 16, 11)),         // head — the silhouette that matters most
  sphS: nb(new THREE.SphereGeometry(0.5, 12, 8)),         // shoulders, buns, balls
  // hands were 6x4 — a six-sided lump is a NUT, not a fist, and hands sit at
  // the end of every swinging arm where the eye tracks motion
  dot: nb(new THREE.SphereGeometry(0.5, 9, 6)),
  // THE CROWN IS THE CLOSE-UP. This was 12x4 with a note that "the profile
  // matters less" — and the profile is exactly what the player reads at spawn,
  // where a person stands 100+ px tall beside a small void. Four height rings,
  // squashed by every hairstyle to 0.66-0.98, photographed as hair cut from
  // stone: the single loudest blocky tell on a close-range person (measured by
  // screenshot, people_close). Sixteen around and eight rings kills the bands;
  // the crown is one or two parts per person, so the cost is small against the
  // 3,392 verts a person already carries.
  hemi: nb(new THREE.SphereGeometry(0.5, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.56)),
  tube: nb(new THREE.CylinderGeometry(0.5, 0.5, 1, 9, 1, true)),    // open limb segment
  taper: nb(new THREE.CylinderGeometry(0.4, 0.5, 1, 9, 1, true)),   // open, wider at the BOTTOM
  drum: nb(new THREE.CylinderGeometry(0.5, 0.5, 1, 12, 1, true)),   // open torso barrel
  cyl: nb(new THREE.CylinderGeometry(0.5, 0.5, 1, 12)),             // capped: hat bands, trays
  flare: nb(new THREE.CylinderGeometry(0.34, 0.5, 1, 14, 1, true)), // skirts, bobs, robes
  box: nb(new THREE.BoxGeometry(1, 1, 1)),
  tri: nb(new THREE.CylinderGeometry(0.5, 0.5, 1, 3)),              // tricorn brim: a TRIANGLE from above, deliberately
  disc: nb(new THREE.CylinderGeometry(0.5, 0.5, 1, 14)),
  ring: nb(new THREE.TorusGeometry(0.42, 0.13, 5, 12)),             // armbands, rubber rings, necklaces
  cone: nb(new THREE.ConeGeometry(0.5, 1, 10)),
};
type Geo = THREE.BufferGeometry;
const _pcol = new THREE.Color();
const _m4 = new THREE.Matrix4(), _pq = new THREE.Quaternion(), _pe = new THREE.Euler();
const _pv = new THREE.Vector3(), _ps = new THREE.Vector3();
// clone -> ONE composed scale/rotate/translate -> flood with a vertex colour.
// Composing the matrix instead of calling scale()/rotateX()/translate() in
// sequence is three passes over the vertex buffer saved, and this runs ~5,500
// times while the level builds.
function pc(base: Geo, col: number, x = 0, y = 0, z = 0, sx = 1, sy = sx, sz = sx,
            rx = 0, ry = 0, rz = 0): Geo {
  const g = base.clone();
  _pe.set(rx, ry, rz, 'ZYX');            // matches rotateX -> rotateY -> rotateZ
  _pq.setFromEuler(_pe);
  _pv.set(x, y, z); _ps.set(sx, sy, sz);
  g.applyMatrix4(_m4.compose(_pv, _pq, _ps));
  _pcol.setHex(col);
  const n = g.getAttribute('position').count;
  const c = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { c[i * 3] = _pcol.r; c[i * 3 + 1] = _pcol.g; c[i * 3 + 2] = _pcol.b; }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return g;
}
const weld = (parts: Geo[]): THREE.Mesh => {
  const m = mergeGeometries(parts, false)!;
  for (const p of parts) p.dispose();
  return new THREE.Mesh(m, PEOPLE_MAT);
};

const INK = 0x241f2c, WHITE = 0xf7f4ec, GOLD = 0xe6c35c;
// a real range, not one tone
const SKIN = [0xffdcb8, 0xf6c9a0, 0xecb289, 0xd99a6c, 0xc2854f, 0xa4693c, 0x86502e, 0x6a3d22];
const HAIRC = [0x241d1f, 0x2f2320, 0x4a3226, 0x6a4a2a, 0x8a5a30, 0xb0793a, 0xd8b46a, 0xefdca8,
  0x8a3a2a, 0xc0562a, 0x55555f, 0x9a9aa4, 0xe8e2d8, 0xf2f0ea];
const HAIRC_FUN = [0xff4fa0, 0x35d6f0, 0x9a5cf0, 0x4ef0a0, 0xffd23f];

export type Hat = 'tricorn' | 'bandana' | 'captain' | 'sun' | 'visor' | 'snorkel'
  | 'toque' | 'bellhop' | 'flower' | 'bucket' | 'cap' | 'beanie'
  // ── MAPLE FALLS. From the play camera a hat is 60% of a person's footprint,
  // so a town of jobs needs a town of hats: the straw brim IS the farmer, the
  // shako plume IS the marching band, the hood IS the teenager.
  | 'straw' | 'hood' | 'helmet' | 'shako' | 'postal';
export type Prop = 'juice' | 'clipboard' | 'tray' | 'ball' | 'detector' | 'selfie'
  // MAPLE FALLS props. `placard` is the loudest object in the town — it is the
  // only thing an adult holds that is visible from directly overhead, which is
  // why the protest and the fair are both told with them.
  | 'leaflets' | 'placard' | 'coffeepot' | 'rod' | 'pompom' | 'horn' | 'bat'
  | 'pie' | 'tape' | 'board' | 'leash';
// HAIR is the single most important surface at a top-down camera — it is the
// only thing you see of most people. Nine silhouettes, fourteen colours.
export type Hair = 'short' | 'buzz' | 'bob' | 'long' | 'bun' | 'pony' | 'curly' | 'braids' | 'bald';
// GARMENTS change the SHAPE, not just the colour: a sundress flares wider than
// the shoulders, a robe drops to the shins, a tank top shows bare arms.
export type Wear = 'tee' | 'tank' | 'open' | 'dress' | 'sarong' | 'blazer'
  | 'robe' | 'wet' | 'apron' | 'swim' | 'uniform'
  // MAPLE FALLS garments — each changes the SILHOUETTE, not just the colour
  | 'dungarees' | 'hoodie' | 'jersey' | 'waders';
export type Pattern = 'plain' | 'stripe' | 'floral' | 'twotone' | 'sash';
export type Shoe = 'bare' | 'flip' | 'shoe' | 'boot';
interface PersonOpts {
  shirt?: number; pants?: number; accent?: number;
  hat?: Hat | null;          // null = explicitly bare-headed (overrides the dress code)
  hatCol?: number;
  hair?: Hair; hairCol?: number;
  wear?: Wear; pattern?: Pattern; shoe?: Shoe;
  glasses?: boolean; eyepatch?: boolean; headphones?: boolean;
  parrot?: boolean; lanyard?: boolean; necklace?: boolean; robe?: boolean;
  armbands?: boolean; floatRing?: boolean; rucksack?: boolean;
  prop?: Prop; propL?: Prop; kid?: boolean;
  // MAPLE FALLS: a fair prize rosette (crimson / blue / gold) on the chest,
  // and a mail satchel slung across the body.
  rosette?: number; satchel?: number;
}

// ── part builders. Each pushes GEOMETRY into `out`; the caller welds the list
// into one mesh. Coordinates are local to the pivot that owns them.

// HEAD PIVOT space: origin at the head centre, head radius ≈ 0.53.
function hatParts(out: Geo[], kind: Hat, col: number): void {
  if (kind === 'tricorn') {
    out.push(pc(B.tri, INK, 0, 0.24, 0, 2.0, 0.09, 2.0));            // TRIANGLE brim, not a cone
    out.push(pc(B.hemi, INK, 0, 0.18, 0, 1.06, 1.15, 1.06));
    out.push(pc(B.dot, GOLD, 0, 0.35, 0.40, 0.34, 0.30, 0.20));      // cockade on the front point
  } else if (kind === 'bandana') {
    out.push(pc(B.hemi, col, 0, 0.08, 0, 1.13, 0.74, 1.13));
    out.push(pc(B.dot, col, 0, 0.0, -0.54, 0.32, 0.26, 0.50));       // knot at the back
  } else if (kind === 'captain') {
    out.push(pc(B.hemi, WHITE, 0, 0.11, 0, 1.16, 0.92, 1.16));
    out.push(pc(B.cyl, GOLD, 0, 0.10, 0, 1.18, 0.12, 1.18));
    out.push(pc(B.box, INK, 0, 0.10, 0.58, 0.58, 0.07, 0.42));
  } else if (kind === 'sun') {
    out.push(pc(B.disc, col, 0, 0.26, 0, 2.26, 0.07, 2.26, 0.07));   // wide, faintly floppy
    out.push(pc(B.hemi, col, 0, 0.19, 0, 1.15, 0.82, 1.15));
  } else if (kind === 'visor') {
    out.push(pc(B.cyl, col, 0, 0.16, 0, 1.18, 0.13, 1.18));
    out.push(pc(B.box, col, 0, 0.17, 0.62, 0.62, 0.07, 0.50));
  } else if (kind === 'snorkel') {
    out.push(pc(B.box, 0x63d6f0, 0, 0.06, 0.44, 0.62, 0.26, 0.20));
    out.push(pc(B.tube, 0xffd23f, 0.44, 0.30, 0.14, 0.09, 0.70, 0.09, 0, 0, -0.2));
  } else if (kind === 'toque') {
    out.push(pc(B.cyl, WHITE, 0, 0.36, 0, 0.90, 0.54, 0.90));
    out.push(pc(B.sphS, WHITE, 0, 0.64, 0, 0.72));
  } else if (kind === 'bellhop') {
    out.push(pc(B.cyl, col, 0, 0.30, 0, 0.92, 0.34, 0.92));
    out.push(pc(B.cyl, GOLD, 0, 0.15, 0, 0.96, 0.10, 0.96));
  } else if (kind === 'flower') {
    out.push(pc(B.ring, 0x4fae62, 0, 0.14, 0, 1.30, 1.30, 1.30, Math.PI / 2));
    for (const a of [0.4, 2.5, 4.6])
      out.push(pc(B.dot, pick([0xff7fb0, 0xffd54f, 0xffffff]), Math.sin(a) * 0.55, 0.17, Math.cos(a) * 0.55, 0.24));
  } else if (kind === 'bucket') {   // kids' floppy bucket hat
    out.push(pc(B.disc, col, 0, 0.22, 0, 1.66, 0.09, 1.66));
    out.push(pc(B.cyl, col, 0, 0.34, 0, 1.16, 0.40, 1.16));
  } else if (kind === 'cap') {
    out.push(pc(B.hemi, col, 0, 0.14, -0.02, 1.17, 0.94, 1.17));
    out.push(pc(B.box, col, 0, 0.16, 0.56, 0.54, 0.08, 0.42));
  } else if (kind === 'straw') {
    // the widest brim in the game — a farmer is legible from the top of the
    // camera's travel purely because of this disc
    out.push(pc(B.disc, 0xd9b76a, 0, 0.20, 0, 2.60, 0.07, 2.60));
    out.push(pc(B.hemi, 0xe0c078, 0, 0.14, 0, 1.14, 0.88, 1.14));
    out.push(pc(B.cyl, col, 0, 0.20, 0, 1.19, 0.10, 1.19));            // hat band, ribbon-coloured
  } else if (kind === 'hood') {
    // hood UP: a dome a size too big, sitting back off the face, with the
    // drawstring collar showing under it
    out.push(pc(B.hemi, col, 0, 0.02, -0.10, 1.40, 1.24, 1.44));
    out.push(pc(B.cyl, col, 0, -0.34, -0.06, 1.30, 0.30, 1.34));
  } else if (kind === 'helmet') {
    out.push(pc(B.hemi, col, 0, 0.02, 0, 1.24, 1.06, 1.24));
    out.push(pc(B.cyl, col, 0, -0.06, 0, 1.26, 0.20, 1.26));
    out.push(pc(B.box, col, 0, 0.10, 0.60, 0.60, 0.08, 0.44));         // peak
    out.push(pc(B.box, WHITE, 0, -0.20, 0.50, 0.52, 0.06, 0.30));      // face bar
  } else if (kind === 'shako') {   // marching band: tall drum, peak, and a PLUME
    out.push(pc(B.cyl, col, 0, 0.52, 0, 0.96, 0.86, 0.96));
    out.push(pc(B.cyl, GOLD, 0, 0.20, 0, 1.00, 0.10, 1.00));
    out.push(pc(B.box, INK, 0, 0.16, 0.56, 0.56, 0.08, 0.40));
    out.push(pc(B.cone, 0xf3f0e6, 0, 1.14, 0, 0.26, 0.62, 0.26));      // the plume
  } else if (kind === 'postal') {
    out.push(pc(B.hemi, 0x2f4f8a, 0, 0.14, -0.02, 1.17, 0.94, 1.17));
    out.push(pc(B.box, 0x2f4f8a, 0, 0.16, 0.56, 0.54, 0.08, 0.42));
    out.push(pc(B.box, 0xd8d4cc, 0, 0.30, 0.02, 0.72, 0.07, 0.30));    // service flash
  } else {   // beanie: dome + rolled brim
    out.push(pc(B.hemi, col, 0, 0.10, 0, 1.16, 1.18, 1.16));
    out.push(pc(B.cyl, col, 0, 0.02, 0, 1.21, 0.16, 1.21));
  }
}

// ── THE CROWN IS THE FACE THE CAMERA ACTUALLY SEES ───────────────────────
// The play camera sits at camOffset (0.62, 0.92, 0.62) — 46 degrees above the
// ground — so the top of a walking person's head is the single biggest surface
// of them on screen. Every hair shell here topped out BELOW the skull it was
// meant to cover:
//
//   skull   pc(B.sph, skin, 0, 0, 0.01, 1.06, 1.12, 0.99)  -> top 0.56
//   crown   y 0.05, yscale 0.98                            -> top 0.54
//   curly   y 0.04, yscale 0.90                            -> top 0.49
//   buzz    y 0.03, yscale 0.66                            -> top 0.36
//
// B.hemi is a sphere sector to 0.56*PI, so its top is at +0.5 of its own
// radius. Both shells are 16 segments and nearly coincident, so the skull did
// not read as a neat bald patch — it read as a jagged pale star punched through
// the hair. TEAM MOVERS measured the up-facing scalp bare at 28.8% for the six
// shared styles, 50.1% for curly and 100% for buzz (qa/_headcover.mjs).
//
// This is the exact failure that created the studio: hair authored and checked
// in a front elevation, in the one view the game never uses. The STATIC
// townsperson's crown was fixed in 69784f9 because qa/personsheet.mjs could
// photograph it; the walking crowd was never looked at.
//
// Each shell now clears the skull by about 0.04, which is enough that two
// 16-segment spheres do not interpenetrate into a rim of triangles.
function hairParts(out: Geo[], style: Hair, col: number): void {
  if (style === 'bald') return;
  // 1.10, not 0.66: a buzz cut is hair over the WHOLE scalp, just very short,
  // so it stays tight to the skull in x/z and simply has to reach the top of it.
  if (style === 'buzz') { out.push(pc(B.hemi, col, 0, 0.03, -0.02, 1.09, 1.10, 1.09)); return; }
  if (style === 'curly') {   // lumpy crown — the most distinctive top-down read
    out.push(pc(B.hemi, col, 0, 0.04, -0.02, 1.08, 1.12, 1.08));
    for (let i = 0; i < 5; i++) {
      const a = i * 1.2566;
      out.push(pc(B.dot, col, Math.sin(a) * 0.35, 0.28 + (i % 2) * 0.11, Math.cos(a) * 0.35 - 0.03, 0.38));
    }
    return;
  }
  out.push(pc(B.hemi, col, 0, 0.05, -0.02, 1.14, 1.10, 1.14));   // shared crown
  if (style === 'bob') out.push(pc(B.flare, col, 0, -0.16, -0.03, 1.24, 0.48, 1.24));
  else if (style === 'long') out.push(pc(B.box, col, 0, -0.38, -0.30, 0.70, 0.86, 0.34));
  else if (style === 'bun') out.push(pc(B.sphS, col, 0, 0.34, -0.30, 0.44));
  else if (style === 'pony') out.push(pc(B.taper, col, 0, -0.24, -0.52, 0.24, 0.66, 0.24, -0.5));
  else if (style === 'braids') for (const sx of [-0.36, 0.36])
    out.push(pc(B.taper, col, sx, -0.30, -0.12, 0.20, 0.68, 0.20));
}

// ARM PIVOT space: origin at the shoulder, hand around y -1.01*s. Everything is
// expressed in units of the arm length `s`, so a child's drink ends up in a
// child's hand at a child's scale.
// The tint the CURRENT prop is painted in (placards, leaflets, pompoms,
// skateboards). Set immediately before the call and read inside it — a
// parameter would have meant changing every existing call site for the sake of
// four props, and this bakes into the geometry at build time either way.
let _propCol = 0xd8443c;
function propParts(out: Geo[], kind: Prop, s: number): void {
  if (kind === 'juice') {
    // A TALL GLASS WITH A STRAW, NOT A COUPE. This was an inverted cone with a
    // garnish dot, which is the martini silhouette and nothing else — carried
    // by up to 55% of the resort crowd in a game rated 4+, while
    // newsroom.ts:65 already forbids the same thing in words. The App Store
    // questionnaire asks about alcohol references and does not care whether
    // the glass was ever named in the source.
    out.push(pc(B.tube, 0xffb03a, 0, -1.20 * s, 0.18 * s, 0.20 * s, 0.36 * s, 0.20 * s));
    out.push(pc(B.tube, 0xff5d7e, 0.07 * s, -1.00 * s, 0.18 * s, 0.035 * s, 0.34 * s, 0.035 * s, 0, 0, 0.38));
  } else if (kind === 'clipboard') {
    out.push(pc(B.box, 0xb9793f, 0.02, -1.12 * s, 0.32 * s, 0.44 * s, 0.05 * s, 0.40 * s, -0.7));
    out.push(pc(B.box, WHITE, 0.02, -1.07 * s, 0.35 * s, 0.36 * s, 0.03 * s, 0.32 * s, -0.7));
  } else if (kind === 'tray') {
    out.push(pc(B.disc, 0xd8d2c2, 0.06 * s, -1.00 * s, 0.36 * s, 0.52 * s, 0.06 * s, 0.52 * s));
    out.push(pc(B.cone, 0xffd54f, 0.06 * s, -0.88 * s, 0.36 * s, 0.20 * s, 0.22 * s, 0.20 * s, Math.PI));
  } else if (kind === 'ball') {
    out.push(pc(B.sphS, pick([0xff5d7e, 0x2fd8e8, 0xffd23f]), 0.10 * s, -1.16 * s, 0.36 * s, 0.62 * s));
  } else if (kind === 'detector') {
    out.push(pc(B.tube, 0x8a8f9c, 0, -1.42 * s, 0.36 * s, 0.08 * s, 1.35 * s, 0.08 * s, 0.5));
    out.push(pc(B.disc, 0x3a3f4d, 0, -1.95 * s, 0.66 * s, 0.40 * s, 0.05 * s, 0.40 * s));
  // ══ MAPLE FALLS ══════════════════════════════════════════════════════════
  // A placard is a FLAT PANEL HELD ABOVE THE HEAD. That is the whole trick: it
  // is the only hand prop in the kit with a footprint from directly overhead,
  // so a protest, a rally and a heckler all read at any camera height. The
  // colour is passed in through `propCol` — that is where the ribbon lives.
  } else if (kind === 'placard') {
    out.push(pc(B.tube, 0xb9793f, 0, -0.30 * s, 0.30 * s, 0.075 * s, 2.30 * s, 0.075 * s));
    out.push(pc(B.box, _propCol, 0, 0.90 * s, 0.30 * s, 1.35 * s, 1.00 * s, 0.07 * s));
    out.push(pc(B.box, WHITE, 0, 0.90 * s, 0.36 * s, 1.05 * s, 0.62 * s, 0.05 * s));   // the lettering slab
  } else if (kind === 'leaflets') {
    // a whole ream, held out flat — the campaigner's entire personality
    for (let i = 0; i < 3; i++)
      out.push(pc(B.box, i === 1 ? _propCol : WHITE, 0.02, (-1.00 + i * 0.055) * s, 0.44 * s,
        0.40 * s, 0.025 * s, 0.52 * s, -1.25));
  } else if (kind === 'coffeepot') {
    out.push(pc(B.cyl, 0x2b3038, 0.02, -1.16 * s, 0.30 * s, 0.28 * s, 0.42 * s, 0.28 * s, 0.5));
    out.push(pc(B.cone, 0x2b3038, 0.02, -1.20 * s, 0.52 * s, 0.11 * s, 0.26 * s, 0.11 * s, 1.9));
    out.push(pc(B.box, 0xd8443c, 0.02, -1.34 * s, 0.30 * s, 0.30 * s, 0.09 * s, 0.09 * s));
  } else if (kind === 'rod') {
    // a long diagonal — the fisher is a person with a LINE coming off them
    out.push(pc(B.tube, 0x8a5a30, 0.05 * s, -1.20 * s, 0.95 * s, 0.05 * s, 2.60 * s, 0.05 * s, 1.05));
    out.push(pc(B.dot, 0xc8cdd8, 0.05 * s, -0.62 * s, 0.42 * s, 0.16 * s));
  } else if (kind === 'pompom') {
    out.push(pc(B.sphS, _propCol, 0, -1.16 * s, 0.20 * s, 0.62 * s));
    out.push(pc(B.sphS, WHITE, 0.10 * s, -1.06 * s, 0.30 * s, 0.42 * s));
  } else if (kind === 'horn') {
    out.push(pc(B.tube, GOLD, 0, -1.02 * s, 0.52 * s, 0.09 * s, 0.80 * s, 0.09 * s, Math.PI / 2));
    out.push(pc(B.cone, GOLD, 0, -1.02 * s, 1.00 * s, 0.34 * s, 0.46 * s, 0.34 * s, -Math.PI / 2));
  } else if (kind === 'bat') {
    out.push(pc(B.taper, 0xc79a5a, 0.10 * s, -0.72 * s, -0.44 * s, 0.13 * s, 1.55 * s, 0.13 * s, -0.75));
  } else if (kind === 'pie') {
    out.push(pc(B.disc, 0xd8d2c2, 0.06 * s, -1.02 * s, 0.44 * s, 0.60 * s, 0.06 * s, 0.60 * s));
    out.push(pc(B.disc, 0xe0a24a, 0.06 * s, -0.94 * s, 0.44 * s, 0.50 * s, 0.14 * s, 0.50 * s));
    out.push(pc(B.dot, 0xb03a4a, 0.06 * s, -0.86 * s, 0.44 * s, 0.30 * s, 0.14 * s, 0.30 * s));
  } else if (kind === 'tape') {
    out.push(pc(B.box, 0xf0c050, 0.02, -1.10 * s, 0.34 * s, 0.24 * s, 0.22 * s, 0.16 * s));
    out.push(pc(B.box, 0xe8e4d8, 0.02, -1.06 * s, 0.72 * s, 0.10 * s, 0.02 * s, 0.62 * s));   // the extended blade
  } else if (kind === 'board') {   // skateboard tucked under the arm, deck outward
    out.push(pc(B.box, _propCol, 0.16 * s, -0.86 * s, 0.02 * s, 0.10 * s, 0.90 * s, 0.34 * s, 0, 0, 0.14));
    for (const dy of [-0.44, 0.44])
      out.push(pc(B.dot, 0xf0c050, 0.24 * s, (-0.86 + dy * 0.7) * s, 0.02 * s, 0.11 * s));
  } else if (kind === 'leash') {
    out.push(pc(B.box, 0xd8443c, 0.02, -1.30 * s, 0.62 * s, 0.05 * s, 0.05 * s, 0.95 * s, -0.55));
  } else {   // selfie stick
    out.push(pc(B.tube, 0xc8cdd8, 0, -1.34 * s, 0.52 * s, 0.07 * s, 1.50 * s, 0.07 * s, 0.85));
    out.push(pc(B.box, INK, 0, -0.86 * s, 1.09 * s, 0.16 * s, 0.22 * s, 0.05 * s, 1.2));
  }
}

// BODY PIVOT space: origin at the hip line; `sy` is the local shoulder height.
function parrotParts(out: Geo[], side: number, sy: number): void {
  const x = side * 0.50;
  out.push(pc(B.sphS, 0xe85042, x, sy + 0.32, -0.02, 0.34, 0.42, 0.30));
  out.push(pc(B.dot, 0xffd23f, x, sy + 0.53, 0.05, 0.21));
  out.push(pc(B.dot, 0x2e2a2a, x, sy + 0.50, 0.16, 0.11, 0.11, 0.18));
  out.push(pc(B.cone, 0x2fd8a0, x, sy + 0.16, -0.24, 0.15, 0.34, 0.15, -0.55));
}


// what people WEAR is where they ARE — biome dress codes. `wear` is the pool of
// GARMENTS (which change the silhouette), `shoe` the footwear, so two people in
// the same district still look like two people from directly overhead.
// GAME DAY's, straight out of docs/GAMEDAY.md. Home crimson and gold, visitors
// in teal, and crimson dominates roughly 4:1 wherever these are drawn from.
const GD_HOME_A = 0xc4453f;   // crimson
const GD_GOLD = 0xf0b429;     // gold
const GD_AWAY = 0x2aa9a0;     // visitor teal
interface Fit {
  shirt: number[]; pants: number[];
  hat?: 'sun' | 'cap' | 'beanie'; hatOdds?: number; pack?: boolean;
  wear?: Wear[]; shoe?: Shoe[]; fun?: boolean;   // fun = dyed hair shows up here
}
const LN_INK = 0x241c2e;      // the near-black every spirit is trimmed with
const LN_VERM = 0xc14136;     // shrine and stall vermilion
const LN_INDIGO = 0x2a3a6a;   // the market's working blue
const LN_MOSS = 0x3f6a48;
const LN_PLUM = 0x5a2f52;
const LN_GOLD = 0xd9a24a;
const LN_PAPER = 0xd8cdb6;
const OUTFIT: Record<string, Fit> = {
  // ── LANTERN NIGHT. Deep, saturated, low-value colours: at night a pale
  // costume blows out under a lantern pool and everything mid-grey vanishes
  // between them, so the crowd is dressed in inks, indigos and vermilions that
  // hold their hue at both ends of the exposure.
  onsen: { shirt: [LN_PAPER, LN_PAPER, LN_GOLD], pants: [LN_PAPER, 0xb8a074],
    wear: ['tee'], shoe: ['shoe'] },
  stalls: { shirt: [LN_VERM, LN_INDIGO, LN_GOLD, LN_PLUM, LN_INK], pants: [LN_INK, 0x33283f, 0x2a3348],
    wear: ['uniform', 'tee', 'open', 'uniform'], shoe: ['shoe', 'boot'] },
  canal: { shirt: [LN_INDIGO, LN_INK, LN_MOSS], pants: [LN_INK, 0x2a3348],
    wear: ['uniform', 'open'], shoe: ['boot'] },
  torii: { shirt: [LN_VERM, LN_PAPER, LN_INK], pants: [LN_INK, 0x33283f],
    wear: ['uniform', 'uniform', 'tee'], shoe: ['shoe'] },
  shrine: { shirt: [LN_PAPER, LN_VERM, LN_PAPER], pants: [LN_VERM, 0x8e2e27],
    wear: ['uniform'], shoe: ['shoe'] },
  teahouse: { shirt: [LN_PLUM, LN_GOLD, LN_PAPER, LN_INDIGO], pants: [LN_INK, 0x33283f],
    wear: ['uniform', 'open'], shoe: ['shoe'] },
  moonbridge: { shirt: [LN_INDIGO, LN_PLUM, LN_INK], pants: [LN_INK], wear: ['tee', 'open'], shoe: ['shoe'] },
  nightgarden: { shirt: [LN_MOSS, LN_INK, LN_INDIGO], pants: [LN_INK, 0x2a3348], wear: ['uniform'], shoe: ['shoe'] },
  bathhouse: { shirt: [LN_VERM, LN_GOLD, LN_PAPER], pants: [LN_INK, LN_VERM],
    wear: ['uniform'], shoe: ['shoe'] },
  bamboo: { shirt: [LN_INK, LN_MOSS], pants: [LN_INK], wear: ['tee'], shoe: ['boot'] },
  // PIRATE BAY: everyone is on holiday, so everyone is in colour
  port: { shirt: [0xe8604d, 0x4d9de8, 0xf0e6d2, 0x2e5a7a], pants: [0x3a4a6a, 0x5a4a3a, 0x2a2a34], hat: 'cap', hatOdds: 0.6,
    wear: ['tee', 'tee', 'tank', 'open', 'uniform'], shoe: ['boot', 'boot', 'shoe'] },
  resort: { shirt: [0xff8a5c, 0x4dd0e1, 0xffd54f, 0xff6f91, 0x7be8b0, 0xffffff], pants: [0xff5470, 0x2ab8d8, 0xffb347, 0x66de93], hat: 'sun', hatOdds: 0.7,
    wear: ['tee', 'dress', 'dress', 'tank', 'open', 'sarong', 'robe', 'swim'], shoe: ['flip', 'flip', 'bare', 'shoe'] },
  party: { shirt: [0xff2fa0, 0x7bffe8, 0xffe066, 0xb875ff, 0xff5d7e], pants: [0x2a1240, 0x4a2a8a, 0x1a3a5a], hat: 'sun', hatOdds: 0.25,
    wear: ['tee', 'tank', 'tank', 'dress', 'open'], shoe: ['flip', 'shoe', 'bare'], fun: true },
  market: { shirt: [0xff8a3a, 0xffd23f, 0x7ef2a0, 0xff5d7e, 0xf0e6d2], pants: [0x5a4a3a, 0x3a4a6a, 0x6a3a4a], hat: 'sun', hatOdds: 0.45,
    wear: ['tee', 'open', 'dress', 'apron', 'tank'], shoe: ['flip', 'shoe', 'bare'] },
  jungle: { shirt: [0x5a7a4a, 0x8a9a5a, 0xc4a03a, 0x7a8a5a], pants: [0x4a4a3a, 0x5a5a3a], hat: 'cap', hatOdds: 0.65, pack: true,
    wear: ['tee', 'tee', 'uniform'], shoe: ['boot', 'shoe'] },
  cove: { shirt: [0x4dd0e1, 0xffd54f, 0xff8a5c, 0xffffff], pants: [0x2ab8d8, 0xffb347, 0x3a4a6a], hat: 'sun', hatOdds: 0.5,
    wear: ['tee', 'tank', 'swim', 'wet', 'sarong'], shoe: ['bare', 'flip', 'shoe'] },
  beach: { shirt: [0xff8a5c, 0x4dd0e1, 0xffd54f, 0xff6f91, 0x7be8b0, 0xffffff], pants: [0xff5470, 0x2ab8d8, 0xffb347, 0x66de93], hat: 'sun', hatOdds: 0.5,
    wear: ['swim', 'swim', 'tank', 'sarong', 'dress', 'tee', 'wet'], shoe: ['bare', 'bare', 'flip'] },
  downtown: { shirt: [0x2e3a55, 0x3d4756, 0x545c6e, 0xffffff, 0xb9c6dd, 0x6e5c7a], pants: [0x232a3a, 0x2f2f38, 0x3a3f4d], wear: ['blazer', 'blazer', 'tee', 'uniform'] },
  fancy: { shirt: [0x8a5cb8, 0xd8a848, 0xc65a78, 0x4a7a9a, 0xf0ead8], pants: [0x2a2a34, 0x4a3a5a, 0x5a4a3a], wear: ['blazer', 'dress', 'dress', 'tee'] },
  park: { shirt: [0xffffff, 0xe8604d, 0x58c470, 0x4da3ff, 0xffd54f], pants: [0x3a4a6a, 0x2a2a34, 0x58c470], hat: 'cap', hatOdds: 0.45 },
  forest: { shirt: [0x5a7a4a, 0x8a6a4a, 0xc4693a, 0x7a8a5a], pants: [0x4a4a3a, 0x5a4a3a, 0x3a4a3a], hat: 'beanie', hatOdds: 0.6, pack: true },
  cozy: { shirt: [0xe8604d, 0x4d9de8, 0x58c470, 0xf0c050, 0xc65a9a, 0x7a6ae8], pants: [0x3a4a6a, 0x5a4a3a, 0x2a2a34, 0x6a3a4a, 0x3a5a4a] },
  zoo: { shirt: [0xf0c050, 0xe8604d, 0x4da3ff, 0xc8b088], pants: [0x3a4a6a, 0x8a7a5a], hat: 'cap', hatOdds: 0.3 },
  plaza: { shirt: [0xe8604d, 0x4d9de8, 0x58c470, 0xf0c050, 0xffffff, 0x9a6ae8], pants: [0x3a4a6a, 0x2a2a34, 0x5a4a3a] },
  // ── MAPLE FALLS's four new districts. The fair runs through the palette:
  // every one of these shirt pools carries the ribbon colours, so a crowd
  // always looks like it turned out for something.
  fair: { shirt: [0xd8443c, 0x2f6fd0, 0xf0c050, 0xffffff, 0x58c470, 0xe8604d], pants: [0x3a4a6a, 0x5a4a3a, 0x2a2a34],
    hat: 'cap', hatOdds: 0.5, wear: ['tee', 'tee', 'dress', 'dungarees', 'tank'], shoe: ['shoe', 'shoe', 'boot'] },
  farm: { shirt: [0xd8443c, 0x4d9de8, 0xc4693a, 0xf0e6d2, 0x58c470], pants: [0x3a5a8a, 0x4a4a3a, 0x5a4a3a],
    hat: 'cap', hatOdds: 0.75, wear: ['dungarees', 'dungarees', 'tee', 'open'], shoe: ['boot', 'boot', 'shoe'] },
  campus: { shirt: [0xd8443c, 0x2f6fd0, 0xf0c050, 0xffffff, 0x9a6ae8], pants: [0x2a2a34, 0x3a4a6a, 0x5a5a64],
    hat: 'cap', hatOdds: 0.4, wear: ['tee', 'hoodie', 'hoodie', 'jersey', 'tank'], shoe: ['shoe'] },
  strip: { shirt: [0xd8443c, 0x2f6fd0, 0xe8604d, 0xf0c050, 0xf0e6d2, 0x5a5a64], pants: [0x3a4a6a, 0x2a2a34, 0x5a4a3a],
    hat: 'cap', hatOdds: 0.4, wear: ['tee', 'hoodie', 'apron', 'open', 'dress'], shoe: ['shoe'] },
  // ── GAME DAY. Crimson four to one over the visitors' teal, so the plateau
  // reads as ONE town turned out for the day rather than two factions — the
  // same call the county-fair re-theme made in mainstreet.ts, for the same
  // reason. Gold is the trim colour and shows up on about one shirt in six.
  // Keyed by island.ts's Biome ids; without these eight, every person on the
  // level fell through to OUTFIT.cozy and the crowd came out in suburban
  // pastels at a football game.
  lot: { shirt: [GD_HOME_A, GD_HOME_A, GD_HOME_A, GD_HOME_A, GD_GOLD, GD_AWAY, 0xf0e6d2], pants: [0x2a2a34, 0x3a4a6a, 0x4a4034, 0x5a5a64],
    hat: 'cap', hatOdds: 0.7, wear: ['jersey', 'hoodie', 'tee', 'open'], shoe: ['shoe', 'boot'] },
  gate: { shirt: [GD_HOME_A, GD_HOME_A, GD_HOME_A, GD_GOLD, GD_AWAY, 0xffffff], pants: [0x2a2a34, 0x3a4a6a, 0x5a5a64],
    hat: 'cap', hatOdds: 0.6, wear: ['jersey', 'hoodie', 'tee', 'dress'], shoe: ['shoe'] },
  bowl: { shirt: [GD_HOME_A, GD_HOME_A, GD_HOME_A, GD_GOLD, GD_AWAY, 0xffffff], pants: [0x2a2a34, 0x3a4a6a],
    hat: 'cap', hatOdds: 0.55, wear: ['jersey', 'jersey', 'hoodie', 'tee'], shoe: ['shoe'] },
  rvpark: { shirt: [GD_HOME_A, GD_HOME_A, GD_GOLD, 0xf0e6d2, 0x4a7a58, GD_AWAY], pants: [0x3a4a6a, 0x4a4034, 0x2a2a34],
    hat: 'cap', hatOdds: 0.65, wear: ['open', 'tee', 'hoodie', 'dungarees'], shoe: ['shoe', 'boot'] },
  greek: { shirt: [GD_HOME_A, GD_HOME_A, GD_HOME_A, GD_GOLD, 0xffffff, GD_AWAY], pants: [0x2a2a34, 0x5a5a64, 0x3a4a6a],
    hat: 'cap', hatOdds: 0.45, wear: ['jersey', 'tee', 'tank', 'hoodie'], shoe: ['shoe'], fun: true },
  quad: { shirt: [GD_HOME_A, GD_HOME_A, GD_GOLD, 0xffffff, 0x3a4a6a, GD_AWAY], pants: [0x2a2a34, 0x3a4a6a, 0x5a5a64],
    hat: 'cap', hatOdds: 0.35, wear: ['hoodie', 'hoodie', 'jersey', 'tee'], shoe: ['shoe'], pack: true },
  practice: { shirt: [GD_HOME_A, GD_HOME_A, GD_GOLD, 0xffffff, 0x5a5a64], pants: [0x2a2a34, 0x3a4a6a],
    hat: 'cap', hatOdds: 0.8, wear: ['jersey', 'jersey', 'tee'], shoe: ['shoe'] },
  treeline: { shirt: [GD_HOME_A, GD_HOME_A, GD_GOLD, 0x4a7a58, 0xf0e6d2, GD_AWAY], pants: [0x4a4034, 0x3a4a6a, 0x2a2a34],
    hat: 'beanie', hatOdds: 0.5, wear: ['hoodie', 'open', 'tee'], shoe: ['boot', 'shoe'] },
};

// ══ THE ELECTION ═════════════════════════════════════════════════════════════
// Maple Falls is choosing between MAYOR DINKLE (who denies the void exists) and
// DEB HOLLIS (whose entire platform is that the void is Dinkle's fault). Two
// colours carry that through the whole town — rosettes, caps, tees, placards
// and the yard signs on every verge — so from the play camera you can see which
// STREET backs whom without reading a single word.
// The fair's three ribbon colours. These were DINKLE red and HOLLIS blue, the
// two "candidates" — see the note in mainstreet.ts. Three breaks the two-party
// read everywhere they are used at once: signs, billboards, block striping and
// the badges on people's chests.
const DINKLE = 0xd8443c;      // fair crimson
const HOLLIS = 0x2f6fd0;      // ribbon blue
const FAIR_GOLD = 0xf0b429;   // first prize
const FAIR_COLS = [DINKLE, HOLLIS, FAIR_GOLD] as const;

// SKELETON: hip line, shoulder line, head centre. A child is not a shrunken
// adult — the legs and arms are proportionally shorter, the barrel is rounder
// and the head is nearly adult-sized on a two-thirds-height body.
interface Build { hipY: number; shY: number; headY: number; girth: number; armL: number; headS: number; scale: number; }
const ADULT: Build = { hipY: 1.24, shY: 2.18, headY: 2.90, girth: 1.00, armL: 1.06, headS: 1.00, scale: 1 };
const CHILD: Build = { hipY: 0.86, shY: 1.62, headY: 2.20, girth: 1.17, armL: 0.82, headS: 1.16, scale: 0.80 };

const HAIRS: Hair[] = ['short', 'short', 'buzz', 'bob', 'bob', 'long', 'long', 'bun', 'pony', 'pony', 'curly', 'curly', 'braids', 'bald'];
const PATTERNS: Pattern[] = ['plain', 'plain', 'plain', 'stripe', 'floral', 'twotone', 'sash'];
const FLIP_COL = [0xff5d7e, 0x2fd8e8, 0xffd23f, 0x7ef05a, 0xffffff];

function makePerson(biome?: string, colOverride?: number, o?: PersonOpts): THREE.Group {
  const g = new THREE.Group();
  const fit = OUTFIT[biome ?? 'cozy'] ?? OUTFIT.cozy;
  const kid = !!(o && o.kid);
  const bd = kid ? CHILD : ADULT;
  const th = bd.shY - bd.hipY;                 // torso height, hip line -> shoulders
  const gr = bd.girth;
  const shirt = o?.shirt ?? colOverride ?? pick(fit.shirt);
  const pants = o?.pants ?? pick(fit.pants);
  const skin = pick(SKIN);
  const hairCol = o?.hairCol ?? (fit.fun && Math.random() < 0.3 ? pick(HAIRC_FUN) : pick(HAIRC));
  const hair: Hair = o?.hair ?? pick(HAIRS);
  const wear: Wear = o?.wear ?? (fit.wear ? pick(fit.wear) : 'tee');
  const pat: Pattern = o?.pattern ?? pick(PATTERNS);
  const shoe: Shoe = o?.shoe ?? (fit.shoe ? pick(fit.shoe) : 'shoe');
  const accent = o?.accent ?? pick([WHITE, INK, 0xffd23f, 0xff5d7e, 0x2fd8e8, 0x1f2a4a]);
  // garment consequences: what covers the arms, what covers the legs, and
  // whether there is a skirt in the way of the thighs
  const sleeved = wear === 'tee' || wear === 'blazer' || wear === 'uniform' || wear === 'apron' || wear === 'open'
    || wear === 'jersey' || wear === 'dungarees';
  const fullArm = wear === 'wet' || wear === 'robe' || wear === 'hoodie';
  const bareLegs = wear === 'swim' || wear === 'sarong' || wear === 'dress' || wear === 'robe';
  const legCol = wear === 'wet' ? shirt : wear === 'swim' ? shirt : pants;
  const shortLeg = wear === 'swim' || wear === 'tank' || (!kid && wear === 'tee' && Math.random() < 0.45);

  // ── LEGS ── two merged meshes. Interior segments are open-ended tubes: the
  // caps live inside the joint above them and are never rendered.
  const legs: THREE.Group[] = [];
  const L = bd.hipY;                            // leg length: hip pivot down to the floor
  for (const sx of [-0.235 * gr, 0.235 * gr]) {
    const p: Geo[] = [];
    const thighCol = bareLegs ? skin : legCol;
    const shinCol = (bareLegs || shortLeg) ? skin : legCol;
    // thigh top pokes INTO the hips and the shin top INTO the thigh, so no
    // joint can ever show a seam however the limb swings
    p.push(pc(B.taper, thighCol, 0, -0.23 * L, 0, 0.36 * gr, 0.50 * L, 0.36 * gr, Math.PI));
    p.push(pc(B.taper, shinCol, 0, -0.70 * L, 0.01, 0.29 * gr, 0.52 * L, 0.29 * gr, Math.PI));
    const fy = -0.95 * L, fh = 0.13 * L;
    // FEET ARE LOAVES, NOT BRICKS. Every shoe in the game was a hard black box,
    // and at spawn distance two black rectangles under each person were the
    // second-loudest Lego tell after the hair (people_close, same screenshot).
    // A squashed sphere reads as a rounded toe box; the sole sinks a little
    // below the floor, which is where a sole belongs under a top-down camera.
    // The flip-flop STRAP stays a box — a strap genuinely is flat.
    if (shoe === 'bare') p.push(pc(B.dot, skin, 0, fy, 0.09, 0.27 * gr, fh * 1.6, 0.50));
    else if (shoe === 'flip') {
      p.push(pc(B.dot, skin, 0, fy, 0.09, 0.26 * gr, fh * 1.5, 0.48));
      p.push(pc(B.box, pick(FLIP_COL), 0, fy + fh * 0.45, 0.10, 0.25 * gr, fh * 0.4, 0.30));
    } else if (shoe === 'boot') {
      p.push(pc(B.tube, INK, 0, -0.78 * L, 0.01, 0.32 * gr, 0.32 * L, 0.32 * gr));
      p.push(pc(B.dot, INK, 0, fy, 0.10, 0.31 * gr, fh * 1.9, 0.56));
    } else p.push(pc(B.dot, INK, 0, fy, 0.09, 0.29 * gr, fh * 1.6, 0.52));
    const hip = new THREE.Group(); hip.position.set(sx, L, 0);
    hip.add(weld(p)); g.add(hip); legs.push(hip);
  }

  // ── BODY ── ONE merged mesh: hips, tapered chest, rounded shoulder yoke,
  // neck, every garment layer, the lanyard, the parrot, the rubber ring.
  const bp: Geo[] = [];
  const bare = wear === 'swim' || (wear === 'sarong' && Math.random() < 0.6);
  const torsoCol = bare ? skin : shirt;
  bp.push(pc(B.drum, wear === 'dress' || wear === 'robe' ? shirt : bareLegs ? shirt : pants,
    0, 0.14 * th, 0, 0.84 * gr, 0.40 * th, 0.62 * gr));                        // hips
  if (pat === 'twotone' && !bare) {
    bp.push(pc(B.taper, shirt, 0, 0.42 * th, 0, 0.80 * gr, 0.36 * th, 0.58 * gr, Math.PI));
    bp.push(pc(B.taper, accent, 0, 0.80 * th, 0, 0.90 * gr, 0.40 * th, 0.65 * gr, Math.PI));
  } else {
    bp.push(pc(B.taper, torsoCol, 0, 0.61 * th, 0, 0.90 * gr, 0.74 * th, 0.65 * gr, Math.PI));
  }
  bp.push(pc(B.sphS, bare ? skin : shirt, 0, th, 0, 1.12 * gr, 0.60, 0.80 * gr));   // shoulder yoke
  bp.push(pc(B.tube, skin, 0, 1.14 * th, 0, 0.30, 0.24, 0.28));                     // neck
  // patterns are free: extra parts, same mesh, same material
  if (pat === 'stripe' && !bare) for (let i = 0; i < 3; i++)
    bp.push(pc(B.drum, accent, 0, (0.38 + i * 0.22) * th, 0, (0.83 + i * 0.035) * gr, 0.10 * th, (0.60 + i * 0.025) * gr));
  else if (pat === 'floral' && !bare) for (let i = 0; i < 5; i++) {
    const a = i * 1.9;
    bp.push(pc(B.dot, accent, Math.sin(a) * 0.36 * gr, (0.42 + (i % 3) * 0.2) * th, Math.cos(a) * 0.28 * gr, 0.15));
  } else if (pat === 'sash' && !bare)
    bp.push(pc(B.box, accent, 0, 0.66 * th, 0.30 * gr, 0.98 * gr, 0.20, 0.10, 0, 0, 0.7));
  // silhouette-changing layers
  if (wear === 'dress')                                                            // flares WIDER than the shoulders
    bp.push(pc(B.flare, shirt, 0, -0.10 * th, 0, 1.42 * gr, 0.66 * th, 1.20 * gr));
  else if (wear === 'sarong')
    bp.push(pc(B.flare, o?.pants ?? pick(fit.pants), 0, -0.02 * th, 0, 1.20 * gr, 0.48 * th, 1.02 * gr));
  else if (wear === 'robe') {
    bp.push(pc(B.flare, shirt, 0, 0.30 * th, 0, 1.16 * gr, 1.30 * th, 0.92 * gr));
    bp.push(pc(B.box, accent, 0, 0.34 * th, 0.30 * gr, 0.90 * gr, 0.13, 0.10));     // belt
  } else if (wear === 'open') {                                                    // shirt open over a vest
    bp.push(pc(B.box, accent, -0.26 * gr, 0.66 * th, 0.28 * gr, 0.26, 0.72 * th, 0.10));
    bp.push(pc(B.box, accent, 0.26 * gr, 0.66 * th, 0.28 * gr, 0.26, 0.72 * th, 0.10));
  } else if (wear === 'blazer') {
    bp.push(pc(B.box, accent, -0.24 * gr, 0.68 * th, 0.29 * gr, 0.30, 0.70 * th, 0.10));
    bp.push(pc(B.box, accent, 0.24 * gr, 0.68 * th, 0.29 * gr, 0.30, 0.70 * th, 0.10));
    bp.push(pc(B.box, accent, 0, 1.02 * th, 0.14 * gr, 0.62, 0.12, 0.44));          // collar
  } else if (wear === 'apron') {
    bp.push(pc(B.box, accent, 0, 0.52 * th, 0.30 * gr, 0.62 * gr, 0.86 * th, 0.08));
  } else if (wear === 'uniform') {
    bp.push(pc(B.box, accent, 0, 1.02 * th, 0.10 * gr, 0.66, 0.12, 0.48));          // collar band
  // ══ MAPLE FALLS GARMENTS ═════════════════════════════════════════════════
  } else if (wear === 'dungarees') {
    // denim bib over a tee, and two straps that clear the shoulder yoke — the
    // straps are the bit that reads from above, so they are deliberately wide
    bp.push(pc(B.box, pants, 0, 0.56 * th, 0.31 * gr, 0.70 * gr, 0.80 * th, 0.10));
    for (const sx of [-0.34, 0.34])
      bp.push(pc(B.box, pants, sx * gr, 0.94 * th, 0.12 * gr, 0.17, 0.30 * th, 0.62));
    bp.push(pc(B.dot, GOLD, 0, 0.90 * th, 0.36 * gr, 0.16));                        // brass button
  } else if (wear === 'hoodie') {
    bp.push(pc(B.box, accent, 0, 0.40 * th, 0.31 * gr, 0.66 * gr, 0.26 * th, 0.08));   // kangaroo pocket
    bp.push(pc(B.sphS, shirt, 0, 1.06 * th, -0.34 * gr, 0.78, 0.62, 0.50));            // the hood, down
  } else if (wear === 'jersey') {
    bp.push(pc(B.box, accent, 0, 0.72 * th, 0.31 * gr, 0.52 * gr, 0.44 * th, 0.07));   // the number
    for (const sx of [-0.62, 0.62])
      bp.push(pc(B.box, accent, sx * gr, 0.98 * th, 0, 0.30, 0.16, 0.62));             // shoulder flashes
  } else if (wear === 'waders') {
    // chest-high rubber. The whole torso below the collarbone is ONE colour,
    // which is exactly why a fisher never reads as "a person standing in water"
    bp.push(pc(B.taper, pants, 0, 0.44 * th, 0, 0.94 * gr, 0.94 * th, 0.70 * gr, Math.PI));
    for (const sx of [-0.36, 0.36])
      bp.push(pc(B.box, pants, sx * gr, 0.98 * th, 0.06 * gr, 0.15, 0.26 * th, 0.66));
  }
  // ── the PRIZE ROSETTE, worn on the chest. Maple Falls is mid-fair and the
  // cheapest way to see which street is backing which ribbon is to put the
  // colour on people. (This geometry was always a rosette; only the story
  // around it changed, and a rosette at a county fair is exactly right.)
  if (o?.rosette !== undefined) {
    bp.push(pc(B.disc, o.rosette, 0.30 * gr, 0.96 * th, 0.30 * gr, 0.42, 0.06, 0.42, Math.PI / 2));
    bp.push(pc(B.disc, WHITE, 0.30 * gr, 0.96 * th, 0.34 * gr, 0.22, 0.05, 0.22, Math.PI / 2));
    for (const rz of [-0.35, 0.35])
      bp.push(pc(B.box, o.rosette, 0.30 * gr + rz * 0.28, 0.76 * th, 0.30 * gr, 0.12, 0.34, 0.05, 0, 0, rz));
  }
  if (o?.satchel !== undefined) {
    bp.push(pc(B.box, o.satchel, 0.42 * gr, 0.36 * th, -0.10 * gr, 0.40, 0.44 * th, 0.62));   // the bag
    bp.push(pc(B.box, o.satchel, 0, 0.92 * th, 0.02, 1.05 * gr, 0.13, 0.34, 0, 0, 0.55));     // the strap
  }
  if (o?.necklace) bp.push(pc(B.ring, GOLD, 0, 1.07 * th, 0.03, 0.60, 0.60, 0.60, Math.PI / 2));
  if (o?.lanyard) {
    bp.push(pc(B.box, 0x2fb8a8, 0, 0.86 * th, 0.30 * gr, 0.07, 0.40 * th, 0.09));
    bp.push(pc(B.box, WHITE, 0, 0.60 * th, 0.32 * gr, 0.26, 0.30, 0.05));
  }
  if (o?.floatRing)                                                                // instantly reads as CHILD from above
    bp.push(pc(B.ring, pick([0xff8a3a, 0xff5d7e, 0x35d6f0]), 0, 0.34 * th, 0, 2.3, 2.3, 2.3, Math.PI / 2));
  if (o?.rucksack || (fit.pack && Math.random() < 0.7))
    bp.push(pc(B.box, pick([0xc4693a, 0x4a7a9a, 0x8a5cb8]), 0, 0.62 * th, -0.40 * gr, 0.62, 0.62 * th, 0.28));
  if (o?.parrot) parrotParts(bp, Math.random() < 0.5 ? -1 : 1, th);
  const body = new THREE.Group(); body.position.y = bd.hipY;
  body.add(weld(bp)); g.add(body);

  // ── ARMS ── one merged mesh each: tapered upper, a forearm bent forward at
  // the elbow, and a hand. Hands are what make a walk cycle read.
  const armX = 0.52 * gr, A = bd.armL;
  const arms: THREE.Group[] = [];
  const upCol = fullArm || sleeved ? shirt : skin;
  const loCol = fullArm ? shirt : skin;
  for (const sx of [-armX, armX]) {
    const p: Geo[] = [];
    p.push(pc(B.taper, upCol, 0, -0.255 * A, 0, 0.24 * gr, 0.55 * A, 0.24 * gr, Math.PI));
    // the forearm is tipped forward at the elbow — a dead-straight prism from
    // shoulder to fingertip is the other half of the "moving block" tell
    p.push(pc(B.taper, loCol, 0, -0.755 * A, 0.055 * A, 0.20 * gr, 0.52 * A, 0.20 * gr, Math.PI + 0.2));
    p.push(pc(B.dot, skin, 0, -1.01 * A, 0.115 * A, 0.26 * gr));
    if (o?.armbands) p.push(pc(B.ring, 0xff8a3a, 0, -0.34 * A, 0, 0.60, 0.60, 0.60, Math.PI / 2));
    // the held prop welds INTO the right arm: a waiter's tray is not an extra
    // draw call, it is extra triangles on a mesh that already exists
    _propCol = accent;                                  // placards/pompoms take the accent
    if (o?.prop && sx > 0) propParts(p, o.prop, A);
    // …and `propL` in the LEFT, for the two-handed jobs — pompoms, and a
    // placard carried in one hand with leaflets in the other
    if (o?.propL && sx < 0) propParts(p, o.propL, A);
    const sh = new THREE.Group(); sh.position.set(sx, bd.shY, 0);
    sh.add(weld(p)); g.add(sh); arms.push(sh);
  }

  // ── HEAD ── one merged mesh: skull, hair, hat, face. This is the surface the
  // play camera spends all its time looking at, so it gets the vertex budget.
  const hp: Geo[] = [];
  hp.push(pc(B.sph, skin, 0, 0, 0.01, 1.06, 1.12, 0.99));
  hairParts(hp, hair, hairCol);
  const hk: Hat | null = (o && o.hat !== undefined) ? o.hat
    : (fit.hat && Math.random() < (fit.hatOdds ?? 0.4) ? fit.hat : null);
  if (hk) hatParts(hp, hk, o?.hatCol ?? pick([0xf6e3b8, 0xff6f91, 0xffffff, 0xe8604d, 0x4da3ff]));
  // ── THE FACE ── the comment at the head of this block has promised "skull,
  // hair, hat, face" since the crowd was written, and there has never been a
  // single eye in this game's entire population. Every townsperson is a bare
  // ball with a hair cap.
  //
  // That is half of what the owner meant by "the quality of people and items
  // look bare minimum". The HERO is a face — a big one, with eyebrows, blush
  // and a mouth — and it spends three minutes eating a town of blanks. The play
  // camera sits at 46 degrees above the ground (camOffset 0.62, 0.92, 0.62), so
  // anyone walking TOWARD the void shows the whole front of their head, and
  // there was nothing on it.
  //
  // Two eyes, welded into the head mesh that already exists: no extra draw
  // call, ~120 triangles on a mesh built to carry them ("this is the surface
  // the play camera spends all its time looking at, so it gets the vertex
  // budget" — the same comment). Deliberately large and close-set, because the
  // void's are, and a crowd drawn to a different chart than its hero is the
  // uniformity tell (absence #5) in the one place it is most visible.
  //
  // Skipped under sunglasses, which already sit at z 0.46 and would hide them.
  // NO WHITE — see the long note in mainstreet.ts personParts. The first
  // version built these the way the HERO's face is built, with a white sclera
  // and a pupil, and at the size a crowd person actually occupies on screen
  // that is two pale bulges on the sides of a skull. The hero can carry a
  // sclera because it is a metre wide in frame and its eyes are the whole
  // design; a townsperson thirty pixels tall can carry a MARK.
  //
  // Head here is an ellipsoid, 0.53 x 0.56 x 0.495, so the placement is
  // checked against that rather than against a sphere: at x 0.185 the surface
  // sits at z 0.459, and a 0.08 dot centred at z 0.40 ends at 0.48 — two
  // hundredths proud, which is a drawn eye. Lateral extent 0.265 against a
  // 0.53 silhouette, so it cannot be seen from the side at all.
  if (!o?.glasses) for (const ex of [-0.185, 0.185]) {
    hp.push(pc(B.dot, INK, ex, 0.075, 0.40, 0.16, 0.18, 0.12));
  }
  if (o?.glasses) hp.push(pc(B.box, INK, 0, 0.08, 0.46, 0.58, 0.10, 0.13));
  if (o?.eyepatch) hp.push(pc(B.box, 0x1a1620, -0.18, 0.11, 0.46, 0.23, 0.19, 0.09));
  if (o?.headphones) {
    hp.push(pc(B.ring, INK, 0, 0.06, 0, 1.40, 1.05, 1.40));   // squashed: a band, not a halo
    for (const sx of [-0.55, 0.55])
      hp.push(pc(B.dot, pick([0xff2fa0, 0x2fd8e8, 0xffd23f]), sx, 0.02, 0, 0.28, 0.40, 0.36));
  }
  const hd = new THREE.Group();
  hd.position.y = bd.headY; hd.scale.setScalar(bd.headS);
  hd.add(weld(hp)); g.add(hd);

  if (bd.scale !== 1) g.scale.setScalar(bd.scale);
  g.userData.limbs = {
    la: arms[0], ra: arms[1], ll: legs[0], rl: legs[1], torso: body, head: hd,
    phase: Math.random() * 6, bob: 0.028 + Math.random() * 0.016,
  } as Limbs;
  return g;
}

// ══ THE CAST ═════════════════════════════════════════════════════════════════
// Distinct silhouettes with matching uniform colours per role, so you can read
// "waiter", "kid", "event manager" from the top-down camera without a label.
export type Role = 'guest' | 'rich' | 'robe' | 'kid' | 'waiter' | 'bellhop' | 'lifeguard'
  | 'spa' | 'dock' | 'grounds' | 'chef' | 'manager' | 'pirate' | 'dj' | 'diver' | 'digger'
  // ── MAPLE FALLS. The sixteen above are a RESORT's cast list; these are a
  // TOWN's. Same six-mesh budget, same shared material, same makePerson kit —
  // a role is nothing but a bundle of options, so a town costs no more to
  // populate than a resort does.
  | 'campaigner' | 'protester' | 'farmer' | 'teen' | 'server' | 'cheer' | 'bandkid'
  | 'fisher' | 'camper' | 'dogwalker' | 'mail' | 'ballplayer' | 'coach' | 'baker'
  | 'gossip' | 'booster';

const KID_SHIRT = [0xff4f9a, 0x35d6f0, 0xffd23f, 0x7ef05a, 0xff8a3a, 0xb875ff];
const KID_PANTS = [0x2f6fe0, 0xff5470, 0x2ab8d8, 0x66de93, 0xffb347];

// `side` is the CAMPAIGN COLOUR this person is wearing — DINKLE or HOLLIS.
// Callers pass their block's allegiance so a whole street reads as one camp;
// omitted, the person picks a side at random like anybody else.
function makeCast(role: Role, dress: string, side?: number): THREE.Group {
  // LAZY on purpose: the sixteen Pirate Bay roles below must not draw a single
  // number from Math.random that they did not draw before this parameter
  // existed, or every spawn position on that island shifts.
  let _camp = side;
  const camp = (): number => (_camp ??= FAIR_COLS[Math.floor(Math.random() * FAIR_COLS.length)]);
  switch (role) {
    case 'kid': {
      // a child is not a shrunk adult: short limbs, round barrel, big head, and
      // an armband or a rubber ring you can read from directly overhead
      const swim = Math.random() < 0.5;
      return makePerson(dress, undefined, {
        kid: true, shirt: pick(KID_SHIRT), pants: pick(KID_PANTS), accent: pick(KID_SHIRT),
        wear: swim ? 'swim' : pick(['tee', 'tank', 'dress'] as Wear[]),
        pattern: pick(['stripe', 'floral', 'twotone', 'plain'] as Pattern[]),
        shoe: pick(['bare', 'flip', 'shoe'] as Shoe[]),
        hair: pick(['curly', 'bob', 'pony', 'short', 'braids', 'buzz'] as Hair[]),
        hat: Math.random() < 0.5 ? pick(['bucket', 'cap', 'sun', 'snorkel'] as Hat[]) : null,
        hatCol: pick([0xff4f9a, 0x35d6f0, 0xffd23f, 0xffffff]),
        armbands: swim && Math.random() < 0.6,
        floatRing: swim && Math.random() < 0.3,
        rucksack: !swim && Math.random() < 0.25,
        prop: Math.random() < 0.3 ? pick(['ball', 'selfie'] as Prop[]) : undefined,
      });
    }
    case 'rich':
      return makePerson(dress, undefined, {
        shirt: pick([WHITE, 0xf6e9c8, 0xffd0e0, 0xcfe6ff, 0xf0e6d2]),
        pants: pick([WHITE, 0xe8ddc4, 0x2a3a5a, 0xf6e3b8]), accent: GOLD,
        wear: pick(['dress', 'dress', 'open', 'blazer', 'sarong', 'tee'] as Wear[]),
        pattern: pick(['plain', 'plain', 'stripe', 'sash'] as Pattern[]),
        shoe: pick(['flip', 'shoe'] as Shoe[]),
        hair: pick(['bob', 'long', 'bun', 'short', 'pony'] as Hair[]),
        hat: Math.random() < 0.62 ? 'sun' : null, hatCol: pick([0xf6e3b8, WHITE, 0xffe0ec]),
        glasses: Math.random() < 0.85, necklace: Math.random() < 0.55,
        prop: Math.random() < 0.55 ? pick(['juice', 'selfie'] as Prop[]) : undefined,
      });
    case 'robe':   // straight out of the spa, and not changing for anybody
      return makePerson(dress, undefined, {
        shirt: WHITE, pants: WHITE, accent: pick([0xd8cfc0, 0x9ac0d8]),
        wear: 'robe', shoe: 'flip', hat: Math.random() < 0.4 ? 'flower' : null,
        glasses: Math.random() < 0.6, necklace: Math.random() < 0.4,
        prop: Math.random() < 0.5 ? 'juice' : undefined,
      });
    case 'waiter':
      return makePerson(dress, undefined, {
        shirt: WHITE, pants: 0x2a2a34, accent: 0x24242e, wear: 'apron', shoe: 'shoe',
        pattern: 'plain', hat: null, prop: 'tray', lanyard: Math.random() < 0.4,
      });
    case 'bellhop':
      return makePerson(dress, undefined, {
        shirt: 0xb03a4a, pants: 0x2a2a34, accent: GOLD, wear: 'uniform', shoe: 'shoe',
        pattern: 'plain', hat: 'bellhop', hatCol: 0xb03a4a,
      });
    case 'lifeguard':
      return makePerson(dress, undefined, {
        shirt: 0xe85042, pants: 0xe85042, accent: WHITE, wear: 'tank', shoe: 'bare',
        pattern: 'plain', hat: 'visor', hatCol: 0xe85042,
        glasses: true, prop: Math.random() < 0.4 ? 'ball' : undefined,
      });
    case 'spa':
      return makePerson(dress, undefined, {
        shirt: WHITE, pants: 0xe8f2ee, accent: 0xcfe4dc, wear: 'uniform', shoe: 'shoe',
        pattern: 'plain', hair: pick(['bun', 'bun', 'bob'] as Hair[]),
        hat: Math.random() < 0.5 ? 'flower' : null,
      });
    case 'dock':
      return makePerson(dress, undefined, {
        shirt: pick([0x2e5a7a, 0x4d9de8, 0xf0e6d2]), pants: 0x5a4a3a, accent: pick([WHITE, INK]),
        wear: pick(['tank', 'open', 'tee'] as Wear[]), shoe: 'boot',
        pattern: pick(['stripe', 'stripe', 'plain'] as Pattern[]),
        hat: pick(['bandana', 'cap', 'captain'] as Hat[]), hatCol: pick([0xe8604d, 0x2e5a7a, WHITE]),
        parrot: Math.random() < 0.12,
      });
    case 'grounds':
      return makePerson(dress, undefined, {
        shirt: 0x4a7a4a, pants: 0x5a5a3a, accent: 0x3a5a3a, wear: 'uniform', shoe: 'boot',
        pattern: 'plain', hat: 'sun', hatCol: 0xc8b088,
        prop: Math.random() < 0.4 ? 'clipboard' : undefined,
      });
    case 'chef':
      return makePerson(dress, undefined, {
        shirt: WHITE, pants: 0xd8d4cc, accent: 0xe4e0d6, wear: 'apron', shoe: 'shoe',
        pattern: 'plain', hat: 'toque', prop: 'tray',
      });
    case 'manager':   // blazer, lanyard, headset, clipboard — the user asked by name
      return makePerson(dress, undefined, {
        shirt: pick([0x2a3a6a, 0x1f2a4a, 0x3a4a7a]), pants: 0x24242e, accent: 0xf0c050,
        wear: 'blazer', shoe: 'shoe', pattern: 'plain',
        hat: null, headphones: true, lanyard: true, prop: 'clipboard',
      });
    case 'pirate':   // costumed staff committing hard to the bit
      return makePerson(dress, undefined, {
        shirt: pick([0x8a2a3a, 0x2a4a6a, 0x6a3a7a, 0x2e2a3a]), pants: pick([0x3a2a24, 0x24202c]),
        accent: pick([WHITE, GOLD, 0xd84a4a]),
        wear: pick(['open', 'open', 'tee'] as Wear[]), shoe: 'boot',
        pattern: pick(['stripe', 'sash', 'sash'] as Pattern[]),
        hair: pick(['long', 'long', 'braids', 'pony'] as Hair[]),
        hat: Math.random() < 0.62 ? 'tricorn' : 'bandana', hatCol: pick([0xd84a4a, 0x2a2a34, 0x8a2a3a]),
        eyepatch: Math.random() < 0.55, parrot: Math.random() < 0.45,
      });
    case 'dj':
      return makePerson(dress, undefined, {
        shirt: pick([0xff2fa0, 0x7bffe8, 0xb875ff]), accent: INK,
        wear: pick(['tank', 'tee'] as Wear[]), pattern: pick(['twotone', 'stripe'] as Pattern[]),
        hairCol: pick(HAIRC_FUN), hat: null, headphones: true, glasses: true,
      });
    case 'diver':
      return makePerson(dress, undefined, {
        hat: 'snorkel', shirt: pick([0x2fd8e8, 0xffd23f]), wear: 'wet', shoe: 'bare',
        pattern: 'twotone', accent: INK,
      });
    case 'digger':   // treasure hunter, sweeping the cove for bottlecaps
      return makePerson(dress, undefined, {
        hat: pick(['sun', 'bandana', 'cap'] as Hat[]), prop: 'detector', shoe: pick(['boot', 'shoe'] as Shoe[]),
      });

    // ══ MAPLE FALLS ═══════════════════════════════════════════════════════
    case 'campaigner':
      // rosette, clipboard-stiff posture, a cap in the campaign colour and an
      // arm full of leaflets they will hand to anyone who stands still
      return makePerson(dress, camp(), {
        shirt: camp(), pants: 0x2a2a34, accent: camp(),
        wear: Math.random() < 0.5 ? 'blazer' : 'tee', shoe: 'shoe', pattern: 'plain',
        hat: Math.random() < 0.7 ? 'cap' : null, hatCol: camp(),
        rosette: camp(), prop: 'leaflets', propL: Math.random() < 0.25 ? 'clipboard' : undefined,
        glasses: Math.random() < 0.3,
      });
    case 'protester':
      // nine years. one parking meter. the placard is laminated and it shows.
      return makePerson(dress, undefined, {
        shirt: pick([0xf0e6d2, 0x58c470, 0xe8604d, 0x9a6ae8]), pants: pick([0x3a4a6a, 0x5a4a3a]),
        // the placard takes the accent. Given a side, it is a CAMPAIGN sign;
        // given none, it is a home-made one about a parking meter.
        accent: side ?? pick([0xf0c050, 0xe8604d, 0x2f6fd0]),
        wear: pick(['tee', 'open', 'dress'] as Wear[]), shoe: 'shoe',
        hat: pick(['bucket', 'sun', 'cap', 'beanie'] as Hat[]),
        hatCol: pick([0xf0e6d2, 0x58c470]),
        prop: 'placard', glasses: Math.random() < 0.55,
        hair: pick(['bun', 'curly', 'short', 'bob'] as Hair[]),
      });
    case 'farmer':
      return makePerson('farm', undefined, {
        shirt: pick([0xd8443c, 0x4d9de8, 0xc4693a, 0xf0e6d2]), pants: 0x3a5a8a, accent: camp(),
        wear: 'dungarees', shoe: 'boot', pattern: 'plain',
        hat: Math.random() < 0.72 ? 'straw' : 'cap', hatCol: camp(),
        prop: Math.random() < 0.25 ? 'clipboard' : undefined,
      });
    case 'teen':
      // hood up, headphones on, board under the arm, three feet from a parent
      return makePerson('campus', undefined, {
        shirt: pick([0x2a2a34, 0x5a5a64, 0x2f4a6a, 0x6a3a5a, 0x3a5a3a]), pants: pick([0x2a2a34, 0x3a4a6a]),
        accent: pick([DINKLE, HOLLIS, 0xf0c050, WHITE]),
        wear: 'hoodie', shoe: 'shoe', pattern: 'plain',
        hat: Math.random() < 0.55 ? 'hood' : null,
        hatCol: pick([0x2a2a34, 0x5a5a64, 0x2f4a6a]),
        headphones: Math.random() < 0.7,
        prop: Math.random() < 0.55 ? 'board' : undefined,
        hair: pick(['long', 'curly', 'short', 'pony', 'buzz'] as Hair[]),
      });
    case 'server':   // the diner. coffee is 90 cents and the refills are free.
      return makePerson('strip', undefined, {
        shirt: pick([0xdfe8ee, 0xf0e6d2]), pants: 0x2a3038, accent: pick([0xd8443c, 0x2f8a6a]),
        wear: 'apron', shoe: 'shoe', pattern: 'plain', hat: null,
        prop: 'coffeepot', hair: pick(['bun', 'pony', 'bob', 'short'] as Hair[]),
      });
    case 'cheer':
      return makePerson('campus', undefined, {
        shirt: camp(), pants: WHITE, accent: camp(), wear: 'dress', shoe: 'shoe',
        pattern: 'twotone', hat: null, prop: 'pompom', propL: 'pompom',
        hair: pick(['pony', 'pony', 'braids', 'bun'] as Hair[]),
      });
    case 'bandkid':
      // the shako plume is two units of bright white directly above the head —
      // the single most legible thing in a marching column from overhead
      return makePerson('campus', undefined, {
        kid: Math.random() < 0.6,
        shirt: camp(), pants: 0x2a2a34, accent: GOLD, wear: 'uniform', shoe: 'shoe',
        pattern: 'sash', hat: 'shako', hatCol: camp(), prop: 'horn',
      });
    case 'fisher':
      return makePerson('beach', undefined, {
        shirt: pick([0x58704a, 0xc4693a, 0x4d7d9e, 0xf0e6d2]), pants: 0x4a5a52, accent: 0x3a4a42,
        wear: 'waders', shoe: 'boot', pattern: 'plain',
        hat: Math.random() < 0.6 ? 'bucket' : 'straw', hatCol: 0x6a7a5a,
        prop: 'rod', glasses: Math.random() < 0.3,
      });
    case 'camper':
      return makePerson('forest', undefined, {
        shirt: pick([0xc4693a, 0x5a7a4a, 0xd8443c, 0x4d7d9e]), pants: pick([0x4a4a3a, 0x3a4a3a]),
        accent: 0xf0c050, wear: pick(['tee', 'open'] as Wear[]), shoe: 'boot',
        hat: Math.random() < 0.6 ? 'beanie' : 'bucket', hatCol: pick([0xd8443c, 0xf0c050, 0x4d7d9e]),
        rucksack: true, prop: Math.random() < 0.3 ? 'selfie' : undefined,
      });
    case 'dogwalker':
      return makePerson(dress, undefined, {
        shirt: pick([0x58c470, 0x9a6ae8, 0xf0c050, 0xe8604d, HOLLIS]), pants: pick([0x3a4a6a, 0x2a2a34]),
        accent: 0xd8443c, wear: pick(['tee', 'hoodie'] as Wear[]), shoe: 'shoe',
        hat: Math.random() < 0.35 ? 'cap' : null, hatCol: camp(),
        prop: 'leash', rosette: Math.random() < 0.4 ? camp() : undefined,
      });
    case 'mail':
      return makePerson(dress, undefined, {
        shirt: 0x4a6ea8, pants: 0x2f4f8a, accent: 0xd8d4cc, wear: 'uniform', shoe: 'shoe',
        pattern: 'plain', hat: 'postal', satchel: 0x2f4f8a, prop: 'leaflets',
      });
    case 'ballplayer':   // little league: helmet, jersey, bat over the shoulder
      return makePerson('campus', undefined, {
        kid: Math.random() < 0.75,
        shirt: camp(), pants: pick([WHITE, 0xe4e0d6]), accent: camp(),
        wear: 'jersey', shoe: 'shoe', pattern: 'plain',
        hat: Math.random() < 0.5 ? 'helmet' : 'cap', hatCol: camp(),
        prop: Math.random() < 0.5 ? 'bat' : 'ball',
      });
    case 'coach':
      return makePerson('campus', undefined, {
        shirt: pick([0x2a2a34, 0x3a4a5a]), pants: 0x5a5a64, accent: camp(),
        wear: 'tee', shoe: 'shoe', pattern: 'plain', hat: 'cap', hatCol: camp(),
        prop: 'clipboard', glasses: Math.random() < 0.4,
        hair: pick(['bald', 'buzz', 'short'] as Hair[]),
      });
    case 'baker':   // PEARL. runs the pie contest. judges it. wins it. eleven years.
      return makePerson('fair', undefined, {
        shirt: pick([0xf0e6d2, 0xffd9e0, 0xdfe8ee]), pants: pick([0x6a3a4a, 0x3a4a6a]),
        accent: pick([0xd8443c, 0x8a2a3a]), wear: 'apron', shoe: 'shoe',
        pattern: 'floral', hat: null, prop: 'pie',
        hair: pick(['bun', 'bun', 'curly'] as Hair[]), glasses: Math.random() < 0.7,
      });
    case 'gossip':
      return makePerson(dress, undefined, {
        shirt: pick([0x9a6ae8, 0xc65a9a, 0x58c470, 0xf0c050, 0x4d9de8]), pants: pick([0x3a4a6a, 0x5a4a3a]),
        accent: camp(), wear: pick(['dress', 'tee', 'blazer'] as Wear[]), shoe: 'shoe',
        pattern: pick(['floral', 'plain', 'stripe'] as Pattern[]),
        hat: Math.random() < 0.3 ? 'sun' : null, hatCol: pick([0xf6e3b8, 0xffe0ec]),
        glasses: Math.random() < 0.6, necklace: Math.random() < 0.5,
        rosette: Math.random() < 0.35 ? camp() : undefined,
        hair: pick(['bob', 'bun', 'curly', 'short'] as Hair[]),
      });
    case 'booster':   // relentlessly proud of a town with one stoplight
      return makePerson(dress, camp(), {
        shirt: camp(), pants: pick([0x3a4a6a, 0x2a2a34, 0xf0e6d2]), accent: WHITE,
        wear: 'tee', shoe: 'shoe', pattern: pick(['stripe', 'sash', 'plain'] as Pattern[]),
        hat: 'cap', hatCol: camp(), rosette: camp(),
        prop: Math.random() < 0.3 ? 'leaflets' : undefined,
      });
    default:         // generic holidaymaker in whatever the district wears
      return makePerson(dress, undefined, {
        glasses: Math.random() < 0.35,
        prop: Math.random() < 0.22 ? pick(['juice', 'selfie', 'ball'] as Prop[]) : undefined,
      });
  }
}
// which pool a role SPEAKS from (undefined = fall back to the biome pool)
const VOICE_OF: Partial<Record<Role, string>> = {
  rich: 'rich', robe: 'rich', kid: 'kid', manager: 'manager', pirate: 'pirate',
  waiter: 'staff', bellhop: 'staff', lifeguard: 'staff', spa: 'staff',
  dock: 'staff', grounds: 'staff', chef: 'staff', dj: 'staff',
  // MAPLE FALLS — these keys resolve against newsroom_maple's MAPLE_VOICE_*
  // pools (see ambPool/panPool inside createLife), which are only consulted on
  // Maple. 'kid' is deliberately shared: same key, different town, different
  // child. On Pirate Bay it is a boy who named the void Gary; here it is Tater,
  // who named it Steve and is correct about it throughout.
  campaigner: 'politician', protester: 'protester', farmer: 'farmer',
  teen: 'teen', cheer: 'teen', bandkid: 'teen',
  server: 'diner', baker: 'gossip', gossip: 'gossip', dogwalker: 'gossip',
  booster: 'booster', coach: 'booster', mail: 'booster', camper: 'booster',
  fisher: 'farmer', ballplayer: 'kid',
};
let animalN = 0;
function makeBuggy(): THREE.Group {
  // the only traffic at a beach resort: a cream shuttle buggy with a striped
  // canopy, rolling the boardwalk end to end. Nose points +X like makeCar.
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.7, 1.9), mat(0xfdf6e6, 0.6));
  body.position.y = 0.72; g.add(body);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 1.6), mat(0x2fb8a8, 0.75));
  seat.position.set(-0.5, 1.22, 0); g.add(seat);
  const dash = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.55, 1.7), mat(0xfdf6e6, 0.6));
  dash.position.set(1.25, 1.2, 0); g.add(dash);
  const canopyCol = pick([0xff6a5e, 0x2fd8e8, 0xffd23f, 0xff8ac0]);
  for (const sx of [-1.3, 1.3]) for (const sz of [-0.78, 0.78]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.5, 5), mat(0xf4f0e2, 0.6));
    post.position.set(sx, 1.85, sz); g.add(post);
  }
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.16, 2.2), mat(canopyCol, 0.7));
  canopy.position.y = 2.65; g.add(canopy);
  // scalloped valance so it reads as fabric, not a lid
  for (let i = 0; i < 7; i++) {
    const sc = new THREE.Mesh(new THREE.SphereGeometry(0.26, 8, 6, 0, Math.PI), mat(canopyCol, 0.7));
    sc.rotation.x = Math.PI / 2;
    sc.position.set(-1.6 + i * 0.53, 2.56, 1.1); g.add(sc);
    const sc2 = sc.clone(); sc2.position.z = -1.1; g.add(sc2);
  }
  for (const sx of [-1.15, 1.15]) for (const sz of [-0.95, 0.95]) {
    const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.24, 12), mat(0x35303c, 0.85));
    wh.rotation.x = Math.PI / 2; wh.position.set(sx, 0.42, sz); g.add(wh);
  }
  return g;
}
function makeParrot(): THREE.Group {
  // a fat tropical parrot: scarlet body, gold head, teal wings, big beak
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.44, 12, 10), mat(0xe85042, 0.75));
  body.scale.set(1, 1.2, 0.9); body.position.y = 0.7; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), mat(0xffd23f, 0.7));
  head.position.set(0, 1.24, 0.06); g.add(head);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.3, 6), mat(0x2e2a2a, 0.5));
  beak.rotation.x = Math.PI / 2 + 0.5; beak.position.set(0, 1.18, 0.32); g.add(beak);
  for (const sx of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), mat(0x2fb8d8, 0.8));
    wing.scale.set(0.5, 1.1, 0.8); wing.position.set(sx * 0.42, 0.74, 0); g.add(wing);
  }
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.72, 5), mat(0x2fd8a0, 0.8));
  tail.rotation.x = -0.5; tail.position.set(0, 0.42, -0.5); g.add(tail);
  return g;
}
function makeCrab(): THREE.Group {
  // a wide orange crab with raised claws and stalk eyes
  const g = new THREE.Group();
  const shell = new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 8), mat(0xff6a3a, 0.7));
  shell.scale.set(1.35, 0.6, 1); shell.position.y = 0.34; g.add(shell);
  for (const sx of [-1, 1]) {
    const claw = new THREE.Mesh(new THREE.SphereGeometry(0.19, 8, 6), mat(0xff8a4a, 0.7));
    claw.scale.set(1.2, 0.8, 0.7); claw.position.set(sx * 0.66, 0.42, 0.3); g.add(claw);
    for (let k = 0; k < 3; k++) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.34, 5), mat(0xe8542a, 0.8));
      leg.rotation.z = sx * 0.9; leg.position.set(sx * 0.46, 0.16, -0.16 - k * 0.16); g.add(leg);
    }
    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.22, 5), mat(0xff8a4a, 0.7));
    stalk.position.set(sx * 0.14, 0.66, 0.16); g.add(stalk);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), mat(0x1a1420, 0.4));
    eye.position.set(sx * 0.14, 0.78, 0.16); g.add(eye);
  }
  return g;
}
// ══ PIRATE BAY PROP KIT ══════════════════════════════════════════════════════
// Everything below follows island.ts's house rules: ONE merged mesh per prop on
// the shared vertex-coloured prop material, nose facing +X, y = 0 is the ground.
// A monkey costs the same one draw call as a barrel.

/** Canopy monkey, ~1.4 across. Faces +X, arms up ready to swing. */
function makeMonkey(): THREE.Group {
  const fur = pick([0x8a6a4a, 0x775330, 0x9c7a52, 0x6b4a2e]);
  const face = 0xe8c39a;
  const p: THREE.BufferGeometry[] = [
    part(new THREE.SphereGeometry(0.38, 8, 6), fur, 0, 0.42, 0, 0, 0, 0, 1, 1.15, 0.9),
    part(new THREE.SphereGeometry(0.28, 8, 6), fur, 0.16, 0.92, 0),
    part(new THREE.SphereGeometry(0.17, 7, 5), face, 0.34, 0.86, 0, 0, 0, 0, 1, 0.9, 0.85),
    part(new THREE.SphereGeometry(0.07, 6, 4), 0x241f2c, 0.44, 0.94, 0.09),
    part(new THREE.SphereGeometry(0.07, 6, 4), 0x241f2c, 0.44, 0.94, -0.09),
  ];
  for (const sz of [-0.26, 0.26]) {                    // ears — the top-down tell
    p.push(part(new THREE.CylinderGeometry(0.14, 0.14, 0.07, 7), fur, 0.12, 0.98, sz, Math.PI / 2));
    p.push(part(new THREE.CylinderGeometry(0.08, 0.08, 0.09, 6), face, 0.12, 0.98, sz, Math.PI / 2));
  }
  for (const sz of [-0.3, 0.3]) {                      // arms up (hanging), legs tucked
    p.push(part(new THREE.CylinderGeometry(0.09, 0.11, 0.62, 5), fur, -0.02, 0.86, sz, 0, 0, -0.35));
    p.push(part(new THREE.CylinderGeometry(0.1, 0.12, 0.4, 5), fur, -0.1, 0.2, sz, 0, 0, 0.5));
  }
  // the tail is the silhouette: three segments curling up and back
  for (let i = 0; i < 3; i++)
    p.push(part(new THREE.CylinderGeometry(0.07 - i * 0.015, 0.08 - i * 0.015, 0.42, 5), fur,
      -0.42 - i * 0.12, 0.42 + i * 0.3, 0, 0, 0, 0.5 - i * 0.5));
  const g = new THREE.Group();
  g.add(mergedProp(p));
  return g;
}

/** Jungle zipline: two towers and the cable, spanning local x 0..len, y drop. */
// ══ TRACK KIT ════════════════════════════════════════════════════════════════
// A polyline walked at a fixed rate. The cheapest motion there is — no
// steering, no collision queries, no per-frame allocation — and it reads from
// any camera height. Pirate Bay's tender, tow boat, jet ski, guided walk,
// conga line and kid circuit run on it; so do Maple Falls's parade, school
// bus, tractor, joggers, bikes, dog walkers and mail round.
//
// w3() allocates a tuple, which is fine at build time and forbidden in an
// update; W3 is the per-frame scalar version.
const W3 = (v: number) => (v - 6000) * 0.05;
interface Route { p: BAY.Pt[]; cum: number[]; len: number }
const route = (pts: BAY.Pt[], closed: boolean): Route => {
  const p = closed ? [...pts, pts[0]] : pts;
  const cum = [0];
  for (let i = 1; i < p.length; i++)
    cum.push(cum[i - 1] + Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]));
  return { p, cum, len: cum[cum.length - 1] || 1 };
};
const ovalRoute = (cx: number, cy: number, rx: number, ry: number, n = 16): Route => {
  const pts: BAY.Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  return route(pts, true);
};
// ONE shared scratch result — read immediately by the caller, never stored
const _rp = { x: 0, y: 0, ang: 0 };
const routeAt = (r: Route, t: number): void => {
  const want = ((t % 1) + 1) % 1 * r.len;
  let i = 0;
  while (i < r.cum.length - 2 && r.cum[i + 1] <= want) i++;
  const seg = r.cum[i + 1] - r.cum[i] || 1;
  const k = (want - r.cum[i]) / seg;
  const a = r.p[i], b = r.p[i + 1];
  _rp.x = a[0] + (b[0] - a[0]) * k;
  _rp.y = a[1] + (b[1] - a[1]) * k;
  _rp.ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
};
// ping-pong: 0..1..0 for open routes (a trail, or a street, has two ends)
const bounce = (t: number) => { const u = ((t % 2) + 2) % 2; return u > 1 ? 2 - u : u; };

// people face +Z, every vehicle in the kit faces +X
const FACE_X = Math.PI / 2;
const posed = (p: THREE.Group, la: number, ra: number, ll = 0, rl = 0): THREE.Group => {
  const L = p.userData.limbs as Limbs;
  L.la.rotation.x = la; L.ra.rotation.x = ra; L.ll.rotation.x = ll; L.rl.rotation.x = rl;
  return p;
};

// ══ MAPLE FALLS SET DRESSING ═════════════════════════════════════════════════
// Every one of these is a SINGLE merged, vertex-coloured mesh on the shared
// prop material (island.ts's `part` + `mergedProp`) — one draw call each,
// however many bits it is made of. Base primitives are tessellated once here
// and cloned by `part`, exactly like the body kit above.
const MG = {
  box: new THREE.BoxGeometry(1, 1, 1),
  cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 8),
  cyl6: new THREE.CylinderGeometry(0.5, 0.5, 1, 6),
  sph: new THREE.SphereGeometry(0.5, 8, 6),
  sphS: new THREE.SphereGeometry(0.5, 6, 5),
  cone: new THREE.ConeGeometry(0.5, 1, 6),
  wheel: new THREE.TorusGeometry(0.40, 0.11, 5, 10),
  disc: new THREE.CylinderGeometry(0.5, 0.5, 1, 10),
};
const grp1 = (m: THREE.Mesh): THREE.Group => { const g = new THREE.Group(); g.add(m); return g; };

// A YARD SIGN. The single most important object in this town: two verges of
// them in DINKLE red and one in HOLLIS blue is how a street declares itself,
// and it reads from the highest the camera ever goes.
function makeYardSign(col: number): THREE.Group {
  return grp1(mergedProp([
    part(MG.box, 0xb9b4a8, -0.32, 0.55, 0, 0, 0, 0, 0.07, 1.1, 0.07),
    part(MG.box, 0xb9b4a8, 0.32, 0.55, 0, 0, 0, 0, 0.07, 1.1, 0.07),
    part(MG.box, col, 0, 1.36, 0, 0, 0, 0, 1.75, 1.05, 0.10),
    part(MG.box, WHITE, 0, 1.36, 0.07, 0, 0, 0, 1.30, 0.26, 0.06),
    part(MG.box, WHITE, 0, 1.36, -0.07, 0, 0, 0, 1.30, 0.26, 0.06),
  ]));
}
// THE PARKING METER. Nine years. Four people. This thing.
function makeParkingMeter(): THREE.Group {
  return grp1(mergedProp([
    part(MG.disc, 0x8a8f9c, 0, 0.10, 0, 0, 0, 0, 0.9, 0.2, 0.9),
    part(MG.cyl6, 0x6a707c, 0, 1.5, 0, 0, 0, 0, 0.26, 3.0, 0.26),
    part(MG.box, 0x3d434e, 0, 3.25, 0, 0, 0, 0, 0.85, 1.30, 0.62),
    part(MG.box, 0xe8e2d0, 0, 3.45, 0.33, 0, 0, 0, 0.55, 0.55, 0.06),
    part(MG.box, 0xd8443c, 0, 3.02, 0.33, 0, 0, 0, 0.30, 0.09, 0.06),
    part(MG.cyl6, 0x9aa0ac, 0, 4.05, 0, 0, 0, 0, 0.16, 0.6, 0.16),
  ]));
}
// THE JUDGING TABLE — trestle, gingham cloth, and eleven pies nobody is
// allowed to touch until four o'clock.
function makePieTable(): THREE.Group {
  const p: THREE.BufferGeometry[] = [
    part(MG.box, 0xf3ece0, 0, 2.05, 0, 0, 0, 0, 9.0, 0.25, 2.6),
    part(MG.box, 0xd8443c, 0, 1.35, 1.28, 0, 0, 0, 9.0, 1.35, 0.10),
    part(MG.box, 0xd8443c, 0, 1.35, -1.28, 0, 0, 0, 9.0, 1.35, 0.10),
  ];
  for (const sx of [-3.9, 3.9]) {
    p.push(part(MG.box, 0x8a6a4a, sx, 1.0, 1.1, 0, 0, 0, 0.22, 2.0, 0.22));
    p.push(part(MG.box, 0x8a6a4a, sx, 1.0, -1.1, 0, 0, 0, 0.22, 2.0, 0.22));
  }
  for (let i = 0; i < 5; i++) {
    const x = -3.2 + i * 1.6;
    p.push(part(MG.disc, 0xe6e0d2, x, 2.28, 0, 0, 0, 0, 1.05, 0.20, 1.05));
    p.push(part(MG.disc, [0xe0a24a, 0xc4693a, 0xd8b46a][i % 3], x, 2.44, 0, 0, 0, 0, 0.86, 0.22, 0.86));
    p.push(part(MG.sphS, 0xb03a4a, x, 2.56, 0, 0, 0, 0, 0.5, 0.28, 0.5));
  }
  return grp1(mergedProp(p));
}
// FOOTBALL PRACTICE — one set of uprights. Yellow, because it is the only
// thing at a school field that is allowed to be.
function makeGoalPosts(): THREE.Group {
  return grp1(mergedProp([
    part(MG.cyl6, 0xf0c050, 0, 2.6, 0, 0, 0, 0, 0.28, 5.2, 0.28),
    part(MG.box, 0xf0c050, 0, 5.2, 0, 0, 0, 0, 0.24, 0.24, 6.0),
    part(MG.cyl6, 0xf0c050, 0, 7.4, 2.9, 0, 0, 0, 0.24, 4.4, 0.24),
    part(MG.cyl6, 0xf0c050, 0, 7.4, -2.9, 0, 0, 0, 0.24, 4.4, 0.24),
    part(MG.box, 0xe8e2d0, 0, 0.12, 0, 0, 0, 0, 1.4, 0.24, 1.4),
  ]));
}
// TOWN HALL STEPS — the meeting is inside. The meeting is also very much
// outside, which is the entire joke.
function makeHallSteps(): THREE.Group {
  const p: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 4; i++)
    p.push(part(MG.box, i % 2 ? 0xe6dfd0 : 0xf0ebdd, 0, 0.28 + i * 0.55, -i * 1.15, 0, 0, 0, 13 - i * 0.8, 0.55, 3.4));
  for (const sx of [-6.2, 6.2]) {
    p.push(part(MG.cyl, 0xf3efe2, sx, 3.6, 1.6, 0, 0, 0, 0.7, 7.2, 0.7));
    p.push(part(MG.box, 0xe6dfd0, sx, 7.4, 1.6, 0, 0, 0, 1.1, 0.5, 1.1));
  }
  p.push(part(MG.box, 0xe6dfd0, 0, 7.7, 1.6, 0, 0, 0, 13.6, 0.7, 2.4));
  return grp1(mergedProp(p));
}
// A DOG. Not a prop — it walks itself, on a loop, at the end of a lead.
function makeDog(): THREE.Group {
  const c = pick([0xc4934a, 0x6a5040, 0x2e2a2a, 0xe8e2d0, 0xa46a3a]);
  const g = grp1(mergedProp([
    part(MG.sphS, c, 0, 0.62, 0, 0, 0, 0, 1.30, 0.72, 0.66),
    part(MG.sphS, c, 0.62, 0.86, 0, 0, 0, 0, 0.62, 0.60, 0.56),
    part(MG.box, 0x2e2a2a, 0.92, 0.76, 0, 0, 0, 0, 0.34, 0.24, 0.26),
    part(MG.box, c, 0.52, 1.14, 0.20, 0, 0, 0.4, 0.16, 0.30, 0.14),
    part(MG.box, c, 0.52, 1.14, -0.20, 0, 0, 0.4, 0.16, 0.30, 0.14),
    part(MG.cone, c, -0.68, 0.90, 0, 0, 0, -0.9, 0.20, 0.70, 0.20),
    part(MG.cyl6, c, 0.34, 0.24, 0.24, 0, 0, 0, 0.16, 0.50, 0.16),
    part(MG.cyl6, c, 0.34, 0.24, -0.24, 0, 0, 0, 0.16, 0.50, 0.16),
    part(MG.cyl6, c, -0.36, 0.24, 0.24, 0, 0, 0, 0.16, 0.50, 0.16),
    part(MG.cyl6, c, -0.36, 0.24, -0.24, 0, 0, 0, 0.16, 0.50, 0.16),
  ]));
  return g;   // nose +X, like every vehicle in the kit
}
// THE FAIR GOAT. Until now it existed as text: a beat titled "The goat is
// loose!", a fair pool bragging "that goat won a ribbon", a panic line
// shouting GET THE GOAT — and nothing in the world to look at. Cream coat,
// dark socks, swept-back horns, and the blue ribbon it won, still pinned on.
function makeGoat(): THREE.Group {
  const c = 0xe8e2d0, dk = 0x8a7a62;
  const g = grp1(mergedProp([
    part(MG.sphS, c, 0, 0.74, 0, 0, 0, 0, 1.30, 0.82, 0.68),                 // body
    part(MG.sphS, c, 0.62, 1.08, 0, 0, 0, 0, 0.54, 0.60, 0.46),              // head
    part(MG.box, dk, 0.92, 0.94, 0, 0, 0, 0, 0.30, 0.30, 0.24),              // muzzle
    part(MG.box, dk, 0.96, 0.68, 0, 0, 0, 0, 0.10, 0.24, 0.10),              // the beard
    part(MG.cone, dk, 0.46, 1.44, 0.13, 0, 0, -0.6, 0.11, 0.40, 0.11),       // horns, swept back
    part(MG.cone, dk, 0.46, 1.44, -0.13, 0, 0, -0.6, 0.11, 0.40, 0.11),
    part(MG.box, c, 0.54, 1.22, 0.22, 0, 0, 0.5, 0.12, 0.26, 0.09),          // ears out sideways
    part(MG.box, c, 0.54, 1.22, -0.22, 0, 0, 0.5, 0.12, 0.26, 0.09),
    part(MG.box, dk, -0.70, 1.00, 0, 0, 0, 0.6, 0.10, 0.24, 0.10),           // tail UP — always
    part(MG.cyl6, dk, 0.36, 0.26, 0.24, 0, 0, 0, 0.15, 0.54, 0.15),          // dark socks
    part(MG.cyl6, dk, 0.36, 0.26, -0.24, 0, 0, 0, 0.15, 0.54, 0.15),
    part(MG.cyl6, dk, -0.38, 0.26, 0.24, 0, 0, 0, 0.15, 0.54, 0.15),
    part(MG.cyl6, dk, -0.38, 0.26, -0.24, 0, 0, 0, 0.15, 0.54, 0.15),
    part(MG.box, 0x3f7ac4, 0.30, 1.06, 0.30, 0, 0, 0, 0.16, 0.24, 0.05),     // the ribbon
  ]));
  // BIG. The beat fires in the finale, when the child is a WORLD ENDER and
  // the camera is a hundred units up — a dog-sized goat is a speck at that
  // zoom. A prize goat the size of a pony is legible from the finale camera
  // and, frankly, funnier.
  g.scale.setScalar(2.1);
  return g;   // nose +X, like the dog
}
// A BIKE with a kid already on it — the kid is a real cast member parented to
// the frame, so it animates and eats exactly like anybody else.
function makeBike(col: number): THREE.Group {
  // it was 1.29 tall against a 3.5-unit rider — a child's trike, and the wheels
  // sat 0.12 under the tarmac. Wheels grounded, then 1.7x for a real bicycle.
  const g = grp1(mergedProp([
    part(MG.wheel, 0x2a2a30, 0.72, 0.54, 0, Math.PI / 2, 0, 0, 1.05),
    part(MG.wheel, 0x2a2a30, -0.72, 0.54, 0, Math.PI / 2, 0, 0, 1.05),
    part(MG.box, col, 0, 0.84, 0, 0, 0, 0, 1.55, 0.13, 0.11),
    part(MG.box, col, -0.12, 1.07, 0, 0, 0, -0.55, 0.11, 0.85, 0.11),
    part(MG.box, col, 0.42, 0.98, 0, 0, 0, 0.6, 0.11, 0.80, 0.11),
    part(MG.box, 0x2a2a30, 0.62, 1.36, 0, 0, 0, 0, 0.10, 0.10, 0.92),
    part(MG.box, 0x3a3a44, -0.30, 1.24, 0, 0, 0, 0, 0.42, 0.13, 0.28),
  ]));
  g.scale.setScalar(1.7);
  return g;
}
// THE SCHOOL BUS. Nose +X, exactly like makeCar, so it drops straight into the
// road-lane driver with no special casing.
function makeBus(): THREE.Group {
  const p: THREE.BufferGeometry[] = [
    part(MG.box, 0xf0b429, 0, 2.35, 0, 0, 0, 0, 10.6, 3.1, 3.2),
    part(MG.box, 0xf0b429, 0, 4.05, 0, 0, 0, 0, 9.8, 0.4, 3.0),
    part(MG.box, 0x2e2a2a, 0, 3.05, 1.62, 0, 0, 0, 9.2, 1.2, 0.10),
    part(MG.box, 0x2e2a2a, 0, 3.05, -1.62, 0, 0, 0, 9.2, 1.2, 0.10),
    part(MG.box, 0x2e2a2a, 5.34, 2.9, 0, 0, 0, 0, 0.10, 1.5, 2.9),
    part(MG.box, 0x2a2a30, 0, 1.05, 0, 0, 0, 0, 10.2, 0.5, 3.0),
    part(MG.box, 0xd8443c, -5.36, 2.6, 0, 0, 0, 0, 0.12, 0.9, 1.2),
    part(MG.box, 0xd8443c, 4.0, 2.2, 1.70, 0, 0, 0, 1.5, 1.0, 0.12),   // the STOP arm
  ];
  for (const sx of [-3.4, 3.6]) for (const sz of [-1.5, 1.5]) {
    p.push(part(MG.cyl, 0x20242c, sx, 0.85, sz, Math.PI / 2, 0, 0, 1.7, 0.55, 1.7));
    p.push(part(MG.cyl, 0xc9cdd6, sx, 0.85, sz, Math.PI / 2, 0, 0, 0.7, 0.60, 0.7));
  }
  return grp1(mergedProp(p));
}
// THE BOAT PARADE. "four boats and a canoe. HUGE." — the town's own words, so
// the town gets four boats and a canoe. Nose +X.
function makeRowboat(canoe: boolean): THREE.Group {
  const c = canoe ? pick([0xc4693a, 0x3a8a6a]) : pick([0xf0e6d2, 0x4d9de8, 0xd8443c, 0x58c470]);
  // it was a rectangular trough with two traffic cones stuck on the ends. A
  // squashed sphere gives a real sheer line and a rounded bow for one mesh.
  const L = canoe ? 7.0 : 6.0, B = canoe ? 1.5 : 2.1;
  const p: THREE.BufferGeometry[] = [
    part(MG.sph, c, 0, 0.62, 0, 0, 0, 0, L, 1.35, B),                       // hull
    part(MG.sph, 0xe8dcc4, 0, 0.76, 0, 0, 0, 0, L * 0.9, 1.1, B * 0.86),    // inner shell
    part(MG.box, 0x8a6a4a, 0, 0.92, 0, 0, 0, 0, L * 0.86, 0.12, B * 0.82),  // sole
    part(MG.box, c, 0, 1.02, 0, 0, 0, 0, L * 0.94, 0.14, B * 0.99),         // gunwale cap
  ];
  for (const sx of canoe ? [-1.5, 1.5] : [-1.4, 0, 1.4])
    p.push(part(MG.box, 0x8a6a4a, sx, 1.0, 0, 0, 0, 0, 0.5, 0.14, B * 0.9)); // thwarts
  if (!canoe) {
    for (const sz of [-1.25, 1.25])
      p.push(part(MG.box, 0x8a6a4a, -0.6, 0.9, sz, 0, 0, 0.4, 0.14, 0.14, 2.6));   // the oars
    p.push(part(MG.box, 0xd8443c, -2.2, 1.3, 0, 0, 0, 0, 0.5, 0.9, 0.12));         // a flag, obviously
  }
  return grp1(mergedProp(p));
}
// THE TRACTOR. Older than the man driving it, and he says so. Nose +X.
function makeTractor(): THREE.Group {
  const c = pick([0x3a8a4a, 0xd8443c, 0x2f6fd0]);
  const p: THREE.BufferGeometry[] = [
    part(MG.box, c, 0.5, 1.55, 0, 0, 0, 0, 4.6, 1.3, 2.0),
    part(MG.box, c, 2.1, 2.35, 0, 0, 0, 0, 1.5, 0.9, 1.7),
    part(MG.box, 0x2a2a30, -1.0, 2.5, 0, 0, 0, 0, 1.4, 1.0, 1.5),
    part(MG.box, 0x3a3a44, -1.0, 3.2, 0, 0, 0, 0, 0.22, 0.5, 1.6),
    part(MG.cyl6, 0x6a707c, 1.9, 3.3, 0, 0, 0, 0, 0.24, 1.9, 0.24),
    part(MG.box, 0x2a2a30, -2.6, 1.9, 0, 0, 0, 0, 0.9, 0.2, 2.2),
  ];
  for (const sz of [-1.25, 1.25]) {
    p.push(part(MG.cyl, 0x24282e, -1.4, 1.55, sz, Math.PI / 2, 0, 0, 3.1, 0.7, 3.1));
    p.push(part(MG.cyl, 0xc9cdd6, -1.4, 1.55, sz, Math.PI / 2, 0, 0, 1.1, 0.75, 1.1));
    p.push(part(MG.cyl, 0x24282e, 2.2, 0.95, sz * 0.86, Math.PI / 2, 0, 0, 1.9, 0.55, 1.9));
  }
  return grp1(mergedProp(p));
}

function makeZipline(len: number, drop: number): THREE.Group {
  const p: THREE.BufferGeometry[] = [];
  const post = (x: number, h: number) => {
    for (const sz of [-0.5, 0.5]) for (const sx of [-0.5, 0.5])
      p.push(part(new THREE.CylinderGeometry(0.16, 0.22, h, 5), 0x8a6a44, x + sx, h / 2, sz));
    p.push(part(new THREE.BoxGeometry(2.2, 0.3, 2.2), 0xb0834e, x, h, 0));
    for (let k = 0; k < 3; k++)                          // ladder rungs
      p.push(part(new THREE.BoxGeometry(0.16, 0.16, 1.3), 0x8a6a44, x - 0.5, 1 + k * (h - 1.6) / 3, 0));
  };
  post(0, 9 + drop); post(len, 9);
  // the cable: one long thin cylinder laid from tower to tower. part() rotates
  // Z last, and a +Y cylinder turned by rz points along (-sin rz, cos rz) — so
  // the angle that lands it on (len, dy) is atan2(dy, len) − π/2.
  const dy = -drop, L = Math.hypot(len, dy);
  p.push(part(new THREE.CylinderGeometry(0.07, 0.07, L, 4), 0x3a3f4d,
    len / 2, 9 + drop + dy / 2, 0, 0, 0, Math.atan2(dy, len) - Math.PI / 2));
  p.push(part(new THREE.BoxGeometry(2.6, 0.2, 2.6), 0xff6a5e, 0, 9 + drop + 0.3, 0));   // launch deck
  const g = new THREE.Group();
  g.add(mergedProp(p));
  return g;
}

/** The jungle waterfall: a mossy lip, a plunge pool, and the falling sheets
 *  (returned separately — they are the only thing that animates). */
const FALL_MAT = new THREE.MeshStandardMaterial({ color: 0xd8f2fb, roughness: 0.2, transparent: true, opacity: 0.8 });
const FALL_SHEET = new THREE.BoxGeometry(3.2, 3.0, 0.5);
function makeWaterfall(): { grp: THREE.Group; sheets: THREE.Mesh[] } {
  const p: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 5; i++) {                          // the rock face, stepped back
    const y = i * 1.9;
    p.push(part(new THREE.BoxGeometry(6.4 - i * 0.5, 2.0, 3.0 - i * 0.35), i % 2 ? 0x7a7466 : 0x8c8474,
      -i * 0.35, y + 1, 0, 0, i * 0.12, 0));
  }
  p.push(part(new THREE.CylinderGeometry(4.6, 4.0, 0.5, 12), 0x3fc9d8, 3.4, 0.26, 0));   // plunge pool
  p.push(part(new THREE.TorusGeometry(4.6, 0.42, 5, 14), 0x8c8474, 3.4, 0.3, 0, Math.PI / 2));
  for (let i = 0; i < 7; i++) {                          // ferns on the lip
    const a = i * 1.4;
    p.push(part(new THREE.ConeGeometry(0.5, 1.5, 5), i % 2 ? 0x3f8f52 : 0x56a862,
      -1.4 + Math.sin(a) * 1.4, 9.6, Math.cos(a) * 1.6, 0, 0, Math.sin(a) * 0.5));
  }
  const grp = new THREE.Group();
  grp.add(mergedProp(p));
  const sheets: THREE.Mesh[] = [];      // the falling water, over the pool
  for (let i = 0; i < 3; i++) {
    const s = new THREE.Mesh(FALL_SHEET, FALL_MAT);
    s.position.set(3.2, 7 - i * 3, 0);
    grp.add(s); sheets.push(s);
  }
  return { grp, sheets };
}

/** A fishing net spread on the ground for mending, ~4 across. */
function makeNet(): THREE.Group {
  const p: THREE.BufferGeometry[] = [];
  const cord = 0xdccfae;
  for (let i = -3; i <= 3; i++) {
    p.push(part(new THREE.BoxGeometry(4.2, 0.08, 0.09), cord, 0, 0.1, i * 0.5));
    p.push(part(new THREE.BoxGeometry(0.09, 0.08, 3.2), cord, i * 0.66, 0.1, 0));
  }
  for (const [fx, fz] of [[-2, -1.4], [1.6, 1.5], [0.2, -1.6], [2.0, -0.4]] as [number, number][])
    p.push(part(new THREE.SphereGeometry(0.26, 7, 5), pick([0xe8604d, 0xf0c050, 0x4d9de8]), fx, 0.24, fz));
  p.push(part(new THREE.CylinderGeometry(0.5, 0.55, 0.7, 8), 0x9a7a4a, -2.3, 0.35, 1.5));   // the basket
  const g = new THREE.Group();
  g.add(mergedProp(p));
  return g;
}

/** The village well — stone drum, timber frame, bucket on a rope. */
function makeWell(): THREE.Group {
  const p: THREE.BufferGeometry[] = [
    part(new THREE.CylinderGeometry(1.5, 1.6, 1.5, 12), 0x9aa2ab, 0, 0.75, 0),
    part(new THREE.TorusGeometry(1.5, 0.18, 5, 14), 0xb8bec6, 0, 1.5, 0, Math.PI / 2),
    part(new THREE.CylinderGeometry(1.2, 1.2, 0.2, 12), 0x2a3440, 0, 1.4, 0),          // the dark water
  ];
  for (const sz of [-1.3, 1.3]) p.push(part(new THREE.BoxGeometry(0.28, 3.2, 0.28), 0x8a6a44, 0, 1.6, sz));
  p.push(part(new THREE.CylinderGeometry(0.22, 0.22, 2.8, 7), 0xb0834e, 0, 3.2, 0, Math.PI / 2));  // winch
  p.push(part(new THREE.BoxGeometry(0.14, 0.14, 0.9), 0x8a6a44, 0.5, 3.2, 1.5, 0, 0, 0.6));       // handle
  for (const sx of [-1.6, 1.6]) p.push(part(new THREE.BoxGeometry(0.3, 0.24, 3.4), 0xc4693a, sx, 4.1, 0, 0, 0, sx > 0 ? -0.45 : 0.45));
  p.push(part(new THREE.BoxGeometry(3.6, 0.22, 3.6), 0xd8934a, 0, 4.6, 0));            // thatch cap
  p.push(part(new THREE.CylinderGeometry(0.06, 0.06, 1.5, 4), 0x6a5a48, 0, 2.5, 0));   // rope
  p.push(part(new THREE.CylinderGeometry(0.34, 0.28, 0.5, 8), 0x8a6a44, 0, 1.85, 0));  // bucket
  const g = new THREE.Group();
  g.add(mergedProp(p));
  return g;
}

/** Beach volleyball net, 12 wide — posts, cord lattice and a tape band. */
function makeVolleyNet(): THREE.Group {
  const p: THREE.BufferGeometry[] = [];
  for (const sz of [-6, 6]) p.push(part(new THREE.CylinderGeometry(0.16, 0.2, 6.4, 7), 0xf2ede0, 0, 3.2, sz));
  for (let i = 0; i <= 12; i++) p.push(part(new THREE.BoxGeometry(0.06, 2.2, 0.06), 0xf6f4ee, 0, 4.5, -6 + i));
  for (let k = 0; k <= 4; k++) p.push(part(new THREE.BoxGeometry(0.06, 0.06, 12), 0xf6f4ee, 0, 3.5 + k * 0.5, 0));
  p.push(part(new THREE.BoxGeometry(0.12, 0.34, 12), 0x2fd8e8, 0, 5.7, 0));
  const g = new THREE.Group();
  g.add(mergedProp(p));
  return g;
}

/** A paddleboard, ~3.4 long, nose +X. The rider is added by the caller. */
function makePaddleboard(): THREE.Group {
  const col = pick([0xff8a5c, 0x4dd0e1, 0xffd54f, 0x7be8b0]);
  const p: THREE.BufferGeometry[] = [
    part(new THREE.CylinderGeometry(0.55, 0.42, 3.4, 8), col, 0, 0.12, 0, 0, 0, -Math.PI / 2, 1, 1, 0.34),
    part(new THREE.CylinderGeometry(0.36, 0.5, 0.9, 8), col, 1.9, 0.12, 0, 0, 0, -Math.PI / 2, 1, 1, 0.34),
    part(new THREE.BoxGeometry(1.5, 0.06, 0.62), 0xf2ede0, -0.2, 0.26, 0),
  ];
  const g = new THREE.Group();
  g.add(mergedProp(p));
  return g;
}

/** A boat's wake: a foam V that trails the hull. Shares ONE material. */
const WAKE_MAT = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.42, depthWrite: false });
function makeWake(w: number, len: number): THREE.Mesh {
  const p: THREE.BufferGeometry[] = [];
  for (const sz of [-1, 1]) for (let i = 0; i < 5; i++) {
    const k = i / 4;
    p.push(part(new THREE.BoxGeometry(len * 0.26, 0.05, 0.5 + k * 0.7), 0xffffff,
      -len * (0.14 + k * 0.22), 0.02, sz * (w * 0.35 + k * w * 0.8)));
  }
  p.push(part(new THREE.BoxGeometry(len * 0.4, 0.05, w * 0.8), 0xf2fbff, -len * 0.22, 0.02, 0));
  return mergedProp(p, WAKE_MAT);
}

/** The parasail rig. Origin is the HARNESS, so the caller hangs it off the tow
 *  boat's stern and the canopy, lines and tow rope all follow for free. */
function makeParasailCanopy(): THREE.Group {
  const p: THREE.BufferGeometry[] = [];
  const cols = [0xff2fa0, 0xffd23f, 0x2fd8e8, 0xff8a3a, 0x7ef05a, 0xff2fa0, 0xffd23f];
  for (let i = 0; i < cols.length; i++) {                 // a domed gore canopy
    const a = (i + 0.5) / cols.length * Math.PI;
    p.push(part(new THREE.BoxGeometry(1.3, 0.18, 2.6), cols[i],
      -Math.cos(a) * 3.3, 5.8 + Math.sin(a) * 1.3, 0, 0, 0, Math.cos(a) * 0.85));
  }
  for (const sx of [-2.4, 0, 2.4]) {                      // rigging lines
    const L = Math.hypot(sx, 5.2);
    p.push(part(new THREE.CylinderGeometry(0.045, 0.045, L, 4), 0xf0ece0, sx / 2, 2.9, 0,
      0, 0, Math.atan2(-sx, 5.2)));
  }
  p.push(part(new THREE.BoxGeometry(0.8, 0.28, 1.1), 0x3d3648, 0, 0, 0));       // harness seat
  const rl = Math.hypot(3.5, 5.2);                        // tow rope down to the stern
  p.push(part(new THREE.CylinderGeometry(0.05, 0.05, rl, 4), 0xf6f2e4, 1.75, -2.6, 0,
    0, 0, Math.atan2(-3.5, -5.2)));
  const g = new THREE.Group();
  g.add(mergedProp(p));
  return g;
}

function makeAnimal(): THREE.Group {
  // three readable species so the "lions are LOOSE" bark is true: elephant,
  // lion, sheep — cycled so every pen mixes
  const g = new THREE.Group();
  const kind = animalN++ % 3;
  const col = kind === 0 ? 0x9aa3b2 : kind === 1 ? 0xf2d06b : 0xf0eee6;
  const mat = sharedMat(col, 0.85, true);
  const body = new THREE.Mesh(new THREE.SphereGeometry(1.6, 12, 10), mat);
  body.scale.set(1.5, 1, 1); body.position.y = 1.6; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), mat);
  head.position.set(2, 2.2, 0); g.add(head);
  for (const sx of [-1.2, 1.2]) for (const sz of [-0.8, 0.8]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 1.4, 6), mat);
    leg.position.set(sx, 0.7, sz); g.add(leg);
  }
  if (kind === 0) {   // elephant: trunk + big ear discs
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.32, 1.8, 8), mat);
    trunk.position.set(2.9, 1.5, 0); trunk.rotation.z = 0.5; g.add(trunk);
    for (const sz of [-0.95, 0.95]) {
      const ear = new THREE.Mesh(new THREE.CircleGeometry(0.75, 12), sharedMat(0x8a92a4, 0.9, false, true));
      ear.position.set(1.8, 2.6, sz); ear.rotation.y = sz > 0 ? 0.5 : -0.5; g.add(ear);
    }
  } else if (kind === 1) {   // lion: mane + tail tuft
    const mane = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.4, 8, 14), sharedMat(0xc9812a, 0.95, true));
    mane.position.set(1.7, 2.2, 0); mane.rotation.y = Math.PI / 2; g.add(mane);
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.6, 6), mat);
    tail.position.set(-2.4, 2, 0); tail.rotation.z = 0.7; g.add(tail);
    const tuft = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), sharedMat(0xc9812a, 0.95));
    tuft.position.set(-3, 2.6, 0); g.add(tuft);
  } else {   // sheep: ear cones + tail puff
    for (const sz of [-0.6, 0.6]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.55, 6), mat);
      ear.position.set(2.1, 3.1, sz); ear.rotation.z = 0.3; g.add(ear);
    }
    const tail = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), mat);
    tail.position.set(-2.5, 1.9, 0); g.add(tail);
  }
  return g;
}
function makeBird(): THREE.Group {
  const g = new THREE.Group();
  const mat = sharedMat(pick([0xffffff, 0xf0f0f0, 0xe8eef6]), 0.7, true, true);
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.6, 8, 6), mat); g.add(body);
  for (const s of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.ConeGeometry(0.5, 2.2, 4), mat);
    wing.rotation.z = s * Math.PI / 2; wing.position.x = s * 1.2; g.add(wing);
  }
  return g;
}
function makeLoco(isLoco: boolean): THREE.Group {
  // a TOY TRAIN, not colored boxes: boiler + cab + cowcatcher on the loco,
  // windowed coaches with roofs, skirts and coupling rods
  const g = new THREE.Group();
  const winGlass = new THREE.MeshStandardMaterial({ color: 0xffe9b8, roughness: 0.4, emissive: 0xffd98a, emissiveIntensity: 0.3 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2a2440, roughness: 0.7 });
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1a1a22, roughness: 0.9 });
  const hubMat = new THREE.MeshStandardMaterial({ color: 0xc8cdd8, metalness: 0.5, roughness: 0.4 });
  if (isLoco) {
    const purple = new THREE.MeshStandardMaterial({ color: 0x5a3aa0, roughness: 0.5, metalness: 0.15 });
    const boiler = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 4.6, 12), purple);
    boiler.rotation.z = Math.PI / 2; boiler.position.set(1.2, 2.6, 0); g.add(boiler);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(1.5, 12, 10), purple);
    nose.position.set(3.5, 2.6, 0); g.add(nose);
    const catcher = new THREE.Mesh(new THREE.ConeGeometry(1.6, 1.4, 4), dark);
    catcher.rotation.y = Math.PI / 4; catcher.rotation.z = -Math.PI / 2; catcher.position.set(4.1, 1.1, 0); g.add(catcher);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.8, 3, 3.2), purple);
    cab.position.set(-1.6, 3.4, 0); g.add(cab);
    for (const sz of [-1.62, 1.62]) {
      const win = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.1, 0.08), winGlass);
      win.position.set(-1.6, 3.9, sz); g.add(win);
    }
    const roof = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.3, 3.6), dark);
    roof.position.set(-1.6, 5, 0); g.add(roof);
    const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 1.5, 10), dark);
    chimney.position.set(2.2, 4.6, 0); g.add(chimney);
    const lip = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.35, 0.35, 10), dark);
    lip.position.set(2.2, 5.4, 0); g.add(lip);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 8), hubMat);
    dome.position.set(0.6, 4.2, 0); g.add(dome);
  } else {
    const col = pick([0xd85a5a, 0x5ab0d8, 0xf0c050]);
    const bodyMat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.55, metalness: 0.1 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(6.6, 2.6, 3.2), bodyMat);
    body.position.y = 2.5; g.add(body);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(7, 0.35, 3.5), dark);
    roof.position.y = 4; g.add(roof);
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.5, 3.4), dark);
    skirt.position.y = 1.1; g.add(skirt);
    for (const sz of [-1.62, 1.62]) for (const wx of [-2, 0, 2]) {
      const win = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1, 0.08), winGlass);
      win.position.set(wx, 2.9, sz); g.add(win);
    }
    for (const cx2 of [-3.5, 3.5]) {
      const coupler = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.6), dark);
      coupler.position.set(cx2, 1.4, 0); g.add(coupler);
    }
  }
  for (const sx of [-2, 0, 2]) for (const sz of [-1.7, 1.7]) {
    const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.5, 10), wheelMat);
    wh.rotation.x = Math.PI / 2; wh.position.set(sx, 0.8, sz); g.add(wh);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.54, 8), hubMat);
    hub.rotation.x = Math.PI / 2; hub.position.set(sx, 0.8, sz); g.add(hub);
  }
  for (const sz of [-1.72, 1.72]) {
    const rod = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.16, 0.12), new THREE.MeshStandardMaterial({ color: 0xd85a5a, roughness: 0.5 }));
    rod.position.set(0, 0.8, sz); g.add(rod);
  }
  return g;
}

const eaten = (m: THREE.Object3D) => m.userData.eaten || !m.visible;

export function createLife(
  scene: THREE.Scene,
  addEdible: AddEdible,
  biomeAt: (x: number, z: number) => Biome | null,
  say: Say,
): Life {
  const movers: Mover[] = [];
  // beat-cue listeners — set pieces register here so the match spine can
  // start them (see Life.cue). Every listener also handles 'match' (reset).
  const cues: ((name: string, x?: number, z?: number) => void)[] = [];
  // ── THE OPENING IS CALM ────────────────────────────────────────────────
  // A ped flees when the void is inside `vR + fear`, and fear is 18-20 units
  // against a 0.9-unit void — so on a crowded world the match opens with
  // everybody already inside the trigger. Captured live on GAME DAY: the first
  // two speech bubbles on screen, at t = 0.0s, were "Since 1989!! Never this!!"
  // and "Somebody grab that flag!!", both panic lines, before the player had
  // touched the screen.
  //
  // The cost is not the noise, it is the WRITING. Every world's best lines are
  // its tier-0 ambient pool — Ernie at grill nine since Thursday, the secret
  // being the rub — and a match that opens at tier 2 skips straight past them.
  // A short hold lets the place introduce itself first, which is also what the
  // opening frame is for.
  // Starts at Infinity, not 0: life.update() runs unconditionally — before the
  // match, on the title card, and behind the results panel — so without this
  // the crowd was already fleeing on the loading screen. beginMatch() sets it
  // to a few seconds and endMatch() puts it back.
  let calmT = Infinity;
  // THE SHARED CLOCK IS NOT A THING IN THE WORLD, so it is not a mover any
  // more. It used to be pushed as a bare Object3D parked at the origin, which
  // worked only because every mover ran every frame — the moment the dispatch
  // below started skipping distant ones, a void anywhere except the middle of
  // the map would have culled the clock and silently frozen `pingClock` and
  // `calmT`: no panic contagion, and a `calm()` hold that never expires. Run
  // it unconditionally at the top of update() instead, where it cannot be
  // skipped by anything.
  const tickClock = (dt: number) => { pingClock += dt; calmT = Math.max(0, calmT - dt); };
  const peds: { mesh: THREE.Object3D; biome: string; panic: number; voice?: string }[] = [];

  // ── WHICH TOWN IS TALKING ────────────────────────────────────────────────
  // newsroom_maple's voice pools are keyed identically to VOICE_AMBIENT /
  // VOICE_PANIC on purpose, so they resolve with no adapter — but they are
  // resolved PER WORLD instead of merged into the module tables. 'kid' exists
  // in both and the two children are not interchangeable.
  // THREE worlds now, and this is where the third one leaked. Maple was
  // selected by `!== 'pirate'`, so a Game Day tailgater standing beside a
  // pickup truck said "Do not tell the county!!" — a line about Maple Falls'
  // pie judging, live on screen in a screenshot. A world is not "not pirate".
  const WID = worldId();

  // ── LANTERN NIGHT: three registers, not two ─────────────────────────────
  // Every other world has AMBIENT (small talk) and PANIC (screaming). This one
  // needs a third in front of both: GREET, said by a spirit walking toward you
  // because it has decided you are a customer. It is the level's whole premise
  // and it only works if the words are hospitable rather than merely calm —
  // "lovely evening" is ambient; "sit, sit, you must be tired" is a greeting,
  // and a child hears the difference immediately.
  const OWN_GREET: Record<string, string[]> = {
    stalls: ['two skewers? three?', 'you look hungry, friend', 'still hot! still hot!',
      'first one is free', 'sit, sit — you must be tired', 'try it. TRY it.',
      'big appetite! good! good!', 'we have more in the back', 'no no, take TWO',
      'the round ones are best', 'careful, it is hot', 'you are new here!'],
    canal: ['mind the step, honoured guest', 'the water is shallow tonight',
      'a boat? a nice boat?', 'let me light your way', 'the lanterns are for you',
      'follow the lights, that way'],
    torii: ['welcome! welcome!', 'first time at the market?', 'come in, come in',
      'we do not get many purple ones', 'straight up, you cannot miss it',
      'the bathhouse is expecting you'],
    shrine: ['a blessing for the traveller?', 'ring the bell if you like',
      'one coin, any coin', 'the steps are steep, take your time',
      'you have a very round aura', 'the spirits approve of you'],
    teahouse: ['tea? we have the good one', 'a cushion for the guest!',
      'you may sit anywhere', 'the view is better up here',
      'one moment, one moment', 'no need to remove anything'],
    moonbridge: ['a fine night for the bridge', 'the moon is that way',
      'mind the rail, honoured guest', 'everybody stops here'],
    nightgarden: ['the koi are asleep', 'quiet here, isn\'t it',
      'the moss is three hundred years old', 'you may look at anything'],
    bathhouse: ['a room for the guest!', 'your bath is nearly ready',
      'we have never had one your shape', 'towels! bring towels!',
      'the big tub, I think', 'reservation? no matter, no matter'],
    bamboo: ['out here? nothing out here', 'the market is that way',
      'careful in the dark, friend'],
    onsen: ['plenty of room! plenty of room!', 'the far pool is the hot one',
      'you found it! nobody finds it', 'get in, get in, do not be shy',
      'towels on the bench, honoured guest', 'six hundred years and still warm',
      'no, no — stay as long as you like'],
  };
  // ── POWDER PASS chatter: THE VALLEY'S OWN VOICES ─────────────────────────
  // Same rule that saved the tanuki from shouting "MY LOUNGER!!": nothing
  // here shares a literal with another world, so a fall-through cannot pass
  // silently. Snow-day register — everyone is delighted to be out, and the
  // panic is about equipment and dignity, never danger.
  const PW_AMBIENT: Record<string, string[]> = {
    village: ['no school!! NO SCHOOL!!', 'the gritter has done our road twice. showing off.',
      'hot chocolate first. then everything else.', 'mind the icicles. classic icicles.',
      'chairman frost is looking well', 'somebody built a fifth snowman overnight'],
    lake: ['the ice is fine. the ice is FINE.', 'norm caught one fish in 1994',
      'skate LEFT. everyone skates left.', 'my mitten!! it slid!!', 'the cracks sing when it gets cold'],
    pinewood: ['the snow slides off the pines all at once. wait for it.',
      'a pinecone the size of a dog out there', 'quietest place in the valley', 'fresh tracks!!'],
    piste: ['the Home Run is FAST today', 'lean back!! LEAN BACK!!',
      'chair nine squeaks. adds character.', 'race you to the bottom', 'sled queue is an hour. worth it.'],
    lodge: ['the lodge cocoa is famous in three valleys', 'the fire has been lit since october',
      'boots OFF at the door', 'best view in the valley, if you climb for it'],
    rim: ['the aurora was out last night', 'you can see the whole bowl from up here',
      'the high shoulder wind bites', 'somebody left a jam jar on the fence again'],
  };
  const PW_PANIC: Record<string, string[]> = {
    village: ['THE CHALET!! we had a BOOKING!!', 'the closure list has a new entry!!',
      'grab the sled and GO', 'not the notice board!!'],
    lake: ['the lake is DRAINING UPHILL!!', 'norm!! out of the hut, norm!!',
      'skate FASTER!!', 'that crack was not the cold!!'],
    pinewood: ['the pines are LEAVING!!', 'the committee has abandoned the cone!!', 'fresh tracks. VERY fresh.'],
    piste: ['clear the run!! CLEAR THE RUN!!', 'chair nine has stopped squeaking. chair nine has stopped EXISTING.',
      'that is not a mogul!!', 'the lift queue has dispersed. vertically.'],
    lodge: ['save the cocoa!!', 'the fire is out and so is the FLOOR!!', 'boots on. BOOTS ON. GO.'],
    rim: ['down!! everyone DOWN the shoulder!!', 'the jar has seen everything!!'],
  };

  const LN_AMBIENT: Record<string, string[]> = {
    stalls: ['six hundred years I have run this stall', 'the fox stall undercuts me. always.',
      'somebody is eating a LOT tonight', 'my sauce. my own sauce.', 'busy! busy tonight!',
      'that one has had eleven', 'we open one night a year and look at it'],
    canal: ['the lanterns go out at dawn', 'somebody dropped a boat', 'the water is lower than it was',
      'float one for luck', 'that is a lot of missing water'],
    torii: ['count them on the way in, count them on the way out',
      'the gate has been here longer than the market', 'somebody is not counting'],
    shrine: ['the bell has been quiet all night', 'three hundred lanterns, I lit every one',
      'the offering box is lighter than it was', 'somebody took the box. the whole box.'],
    teahouse: ['the guest has had eleven pots', 'we are running low on cups',
      'the terrace was here before the market', 'do not look down'],
    moonbridge: ['the bridge is fine. the bridge is FINE.', 'it creaked. it has never creaked.'],
    nightgarden: ['the koi have left', 'the pond is a void now', 'three hundred years. a void.'],
    bathhouse: ['the guest in the purple has had eleven', 'management has been informed',
      'we are out of the big towels', 'nobody has seen the third floor'],
    bamboo: ['it is very dark out here now', 'the lights are going out one by one'],
    onsen: ['somebody has been in the far pool a very long time',
      'the water is going down', 'that is not the drain',
      'lovely and quiet up here. usually.'],
  };
  // ── THE MIDDLE ACT HAD NO VOICE ──────────────────────────────────────────
  // Instrumented over a whole match, the crowd's BEHAVIOUR does exactly what
  // it was built to do — net movement relative to the void runs +85% toward it
  // while the market thinks the void is a guest, +2% in the middle, and -74%
  // once the place is going. Three acts, measured, and the middle one is a
  // real 51 seconds of a 180-second match.
  //
  // But there were only ever three POOLS — greet, ambient, panic — so for that
  // whole middle act the spirits standing frozen at the edge of the void's
  // reach, watching it, were saying either "busy! busy tonight!" or "MY
  // STALL!! SIX HUNDRED YEARS!!". The one act the entire level is built around
  // was the one act with nothing of its own to say.
  //
  // These are the register between. Nobody here is screaming and nobody is
  // selling: they have stopped what they were doing and they are working out
  // whether to be frightened. No exclamation marks in the whole table — that
  // is the rule that keeps it from drifting into the panic pool, and it is why
  // these lines read quiet on a screen next to the ones that follow them.
  const LN_WARY: Record<string, string[]> = {
    stalls: ['it was smaller when it came in', 'has anyone actually been paid tonight',
      'do not give it another one', 'I am just going to stand here a moment',
      'the fox stall has shut. the fox stall never shuts.',
      'somebody go and get somebody'],
    canal: ['the water was up to here an hour ago', 'where is the boat',
      'stop floating them. just for a minute.', 'do not put your hand in',
      'that is the third lantern that has not come back'],
    torii: ['nobody counted it on the way in', 'shut the gate. quietly.',
      'we let it through', 'how many came in tonight. exactly.'],
    shrine: ['ring the bell. no — do not ring the bell.', 'the box is empty and nobody opened it',
      'stand behind the lanterns', 'I would like everyone to come up the steps now',
      'it has not looked away'],
    teahouse: ['clear the low tables. slowly.', 'nobody go down to the street',
      'we are not serving the purple one again', 'it is looking up here'],
    moonbridge: ['everyone off the middle', 'one at a time. one at a TIME.',
      'the bridge felt that'],
    nightgarden: ['the koi have gone to the bottom', 'do not walk on the moss',
      'stay where the lanterns are', 'it is very quiet down there'],
    bathhouse: ['management is aware. management is aware.',
      'no more guests tonight. none.', 'take the towels off the terrace',
      'stand away from the rail', 'somebody should go up and say something'],
    bamboo: ['the lights are going out down there', 'do not go back for anything',
      'we should start walking'],
    onsen: ['everyone out of the far pool. calmly.', 'the water has stopped coming',
      'get dressed. get dressed now.', 'do not look at it while you do it'],
  };
  const LN_PANIC: Record<string, string[]> = {
    stalls: ['MY STALL!! SIX HUNDRED YEARS!!', 'take the sauce!! TAKE THE SAUCE!!',
      'closing!! we are closing!!', 'not the skewers!!', 'RUN, you fools!! politely!! RUN!!',
      'it ate the whole ROW!!', 'I said the first one was free!! NOT ALL OF THEM!!'],
    canal: ['THE WATER IS GONE!!', 'the boats!! save the boats!!', 'swim!! there is nothing to swim in!!',
      'it is IN the canal!!', 'the lanterns!! all of them!!'],
    torii: ['SHUT THE GATE!! SHUT IT!!', 'nobody else in!! NOBODY!!', 'it came through the GATE!!',
      'we welcomed it!! WE WELCOMED IT!!'],
    shrine: ['RING THE BELL!! RING IT!!', 'the spirits do NOT approve!!', 'up the steps!! ALL of you!!',
      'take the offering box!! I said TAKE IT!!', 'three hundred lanterns!! GONE!!'],
    teahouse: ['LEAVE THE TEA!! LEAVE IT!!', 'off the terrace!! JUMP!!', 'the good cups!! the GOOD ones!!',
      'it is coming UP HERE!!'],
    moonbridge: ['OFF THE BRIDGE!!', 'the bridge is going!! THE BRIDGE!!', 'both ends!! run to BOTH ends!!'],
    nightgarden: ['INTO THE BAMBOO!!', 'the koi!! somebody get the koi!!', 'not the moss!! NOT THE MOSS!!'],
    bathhouse: ['EVERYBODY OUT!! EVERYBODY!!', 'the guest is eating the BATHHOUSE!!',
      'top floor!! go UP!!', 'I want it noted that I said something!!',
      'cancel the reservation!! CANCEL IT!!'],
    bamboo: ['keep running!! do not look!!', 'the market is GONE!!', 'up the valley!! GO!!'],
    onsen: ['OUT OF THE WATER!! ALL OF YOU!!', 'it drank the POOL!!',
      'never mind the towels!! GO!!', 'six hundred years!! DRY!!'],
  };
  const OWN_AMBIENT: Record<string, string[]> =
    WID === 'maple' ? MAPLE_VOICE_AMBIENT : WID === 'gameday' ? GAMEDAY_VOICE_AMBIENT : {};
  const OWN_PANIC: Record<string, string[]> =
    WID === 'maple' ? MAPLE_VOICE_PANIC : WID === 'gameday' ? GAMEDAY_VOICE_PANIC : {};
  // Pirate Bay's own pools ARE the module tables, so it falls through to them.
  // Game Day must NOT: 'kid' and 'staff' exist there and a child at a football
  // game has no business talking about a swim-up bar. On Game Day the module
  // tables are only reachable for a voice key Game Day never assigns.
  const ambPool = (v?: string): string[] | null =>
    (v ? (OWN_AMBIENT[v] || (WID === 'gameday' ? null : VOICE_AMBIENT[v]) || null) : null);
  const panPool = (v?: string): string[] | null =>
    (v ? (OWN_PANIC[v] || (WID === 'gameday' ? null : VOICE_PANIC[v]) || null) : null);

  // ── cars: grid-locked lanes with real arc turns ──────────────────────────
  // The car model's nose points +X, so heading comes from the velocity vector:
  // rotY = atan2(-vz, vx). (The old +Z-forward formula had every car rotated
  // 90° from its motion — the "driving on their side" bug.)
  // asphalt half-width is 2.75 — lane centres must sit INSIDE it. 2.6 put the
  // car centre on the asphalt edge, hanging half of every car over the curb
  // (the "parked on the sidewalk" screenshots). 1.45 = proper two-lane road.
  const LANE = 1.45;
  const headingOf = (mvx: number, mvz: number) => Math.atan2(-mvz, mvx);
  // a car position is legal only ON the painted road network AND on the island —
  // no more sand cruises to the waterline or corners cut across lawns
  const onRoad = (x: number, z: number): boolean => {
    if (!biomeAt(x, z) || inLagoon3(x, z)) return false;
    for (const rc of ROAD_CENTERS_3D) if (Math.abs(x - rc) < 5.4 || Math.abs(z - rc) < 5.4) return true;
    return false;
  };
  interface Arc { p0x: number; p0z: number; p1x: number; p1z: number; p2x: number; p2z: number; u: number; len: number; }
  interface CarState {
    axis: 'h' | 'v'; dir: number; centre: number; along: number; laneOff: number;
    speed: number; turnCd: number; pauseT: number; arc: Arc | null;
    nAxis: 'h' | 'v'; nCentre: number; nAlong: number; nLaneOff: number;
  }
  // CAR-SAFE island test. The old span/turn checks validated only the ROAD
  // CENTRE point, but a car renders at centre + laneOff (±1.45) with a ±2.8
  // body — where the coast runs oblique to a road, the centre line was on the
  // island while the car's actual footprint hung over open space (the
  // "traffic in orbit" screenshots). This tests a ring around the point so
  // the whole car body stays clear of the waterline, with margin to spare.
  const bodyOnIsland = (px: number, pz: number, m: number): boolean => {
    if (!insideIsland3(px, pz)) return false;
    const d = m * 0.7071;
    return insideIsland3(px + m, pz) && insideIsland3(px - m, pz)
      && insideIsland3(px, pz + m) && insideIsland3(px, pz - m)
      && insideIsland3(px + d, pz + d) && insideIsland3(px - d, pz + d)
      && insideIsland3(px + d, pz - d) && insideIsland3(px - d, pz - d);
  };
  const CAR_SAFE_M = 3.6;   // lane offset (1.45) + car half-extent (2.8 nose) rounded up
  const carSafe = (px: number, pz: number): boolean =>
    !inLagoon3(px, pz) && bodyOnIsland(px, pz, CAR_SAFE_M);
  // per-road ON-ISLAND intervals — the single authority for how far a car may
  // drive down each painted road before the coast clips it. Replaces all the
  // per-frame probe guesswork that made cars saw-tooth at clipped road stubs.
  type Span = [number, number];
  const roadSpans = new Map<string, Span[]>();
  // flat list of every legal interval on every road — the respawn pool.
  // Handles multi-interval roads (the island blob clips a road into several
  // on-island pieces) because each piece is its own entry.
  const spanList: { axis: 'h' | 'v'; centre: number; sp: Span }[] = [];
  // Pirate Bay has no road grid at all — one boardwalk and a dirt trail —
  // so there is nothing to span, and its traffic is built further down.
  for (const rc of worldId() === 'maple' ? ROAD_CENTERS_3D : []) {
    for (const axis of ['h', 'v'] as const) {
      const spans: Span[] = [];
      let s0: number | null = null;
      for (let a = -280; a <= 282; a += 2) {
        const px = axis === 'h' ? a : rc, pz = axis === 'h' ? rc : a;
        // carSafe (not the bare centre-line test): a span endpoint is only
        // valid if a whole car fits there without touching the waterline
        const ok = a <= 280 && carSafe(px, pz);
        if (ok && s0 === null) s0 = a;
        if (!ok && s0 !== null) { if (a - 2 - s0 > 34) spans.push([s0, a - 2]); s0 = null; }
      }
      roadSpans.set(axis + rc, spans);
      for (const sp of spans) spanList.push({ axis, centre: rc, sp });
    }
  }
  const EDGE_M = 10;   // cars U-turn this far before the cliff — never overhang
  const spanFor = (axis: 'h' | 'v', centre: number, along: number): Span | null => {
    const spans = roadSpans.get(axis + centre);
    if (!spans || !spans.length) return null;
    for (const sp of spans) if (along >= sp[0] && along <= sp[1]) return sp;
    let best = spans[0], bd = Infinity;
    for (const sp of spans) {
      const d = Math.min(Math.abs(along - sp[0]), Math.abs(along - sp[1]));
      if (d < bd) { bd = d; best = sp; }
    }
    return best;
  };
  // emergency respawn: drop the car onto a random legal span interior point,
  // as far from the player as we can find. Used by the per-frame invariant —
  // whatever upstream math produced an illegal position, the car never stays
  // there for even one rendered frame.
  const teleportCar = (st: CarState, mesh: THREE.Object3D, vx: number, vz: number): void => {
    let bd = -1, bx = 0, bz = 0, bAlong = 0, bSlot: { axis: 'h' | 'v'; centre: number; sp: Span } | null = null;
    for (let k = 0; k < 24; k++) {
      const slot = pick(spanList);
      if (!slot) break;
      const along = rand(slot.sp[0] + EDGE_M, slot.sp[1] - EDGE_M);
      const lane = st.dir * LANE * (slot.axis === 'h' ? 1 : -1);
      const px = slot.axis === 'h' ? along : slot.centre + lane;
      const pz = slot.axis === 'h' ? slot.centre + lane : along;
      if (!carSafe(px, pz)) continue;   // double-check the actual lane point
      const d = Math.hypot(px - vx, pz - vz);
      if (d > bd) { bd = d; bx = px; bz = pz; bAlong = along; bSlot = slot; }
      if (d > 120) break;   // far enough — no pop-in next to the player
    }
    if (!bSlot) return;   // no legal spot found this frame (never in practice); retry next frame
    st.axis = bSlot.axis; st.centre = bSlot.centre; st.along = bAlong;
    st.laneOff = st.dir * LANE * (bSlot.axis === 'h' ? 1 : -1);
    st.arc = null; st.pauseT = 0; st.turnCd = rand(1, 3);
    mesh.position.set(bx, 0, bz);
    mesh.rotation.y = bSlot.axis === 'h' ? headingOf(st.dir, 0) : headingOf(0, st.dir);
  };
  // ONE road-lane driver, used by every wheeled thing in Maple Falls: the 30
  // cars, the school bus and the tractor. Extracting it is what let the bus
  // exist at all — it inherits the span clamp, the coast invariant, the
  // junction arcs and the panic-flee for free, so there is exactly one place
  // where "a vehicle drives on this island" is implemented.
  const roadVehicle = (mesh: THREE.Object3D, eatR: number, speed: number): void => {
    let horiz = Math.random() < 0.5;
    let centre = pick(ROAD_CENTERS_3D);
    const dir = Math.random() < 0.5 ? 1 : -1;
    // spawn INSIDE a known on-island span — zero retries, zero sea spawns
    let sp0 = spanFor(horiz ? 'h' : 'v', centre, 0);
    for (let k = 0; k < 8 && !sp0; k++) { horiz = Math.random() < 0.5; centre = pick(ROAD_CENTERS_3D); sp0 = spanFor(horiz ? 'h' : 'v', centre, 0); }
    if (!sp0) return;
    const along0 = rand(sp0[0] + EDGE_M, sp0[1] - EDGE_M);
    const st: CarState = {
      axis: horiz ? 'h' : 'v', dir, centre, along: along0,
      laneOff: dir * LANE * (horiz ? 1 : -1), speed, turnCd: rand(0, 2), pauseT: 0,
      arc: null as Arc | null, nAxis: 'h' as 'h' | 'v', nCentre: 0, nAlong: 0, nLaneOff: 0,
    };
    if (st.axis === 'h') mesh.position.set(st.along, 0, centre + st.laneOff); else mesh.position.set(centre + st.laneOff, 0, st.along);
    mesh.rotation.y = st.axis === 'h' ? headingOf(dir, 0) : headingOf(0, dir);
    mesh.userData.ptsMult = 1.5; mesh.userData.qk = 'car'; mesh.userData.mover = true;
    mesh.add(contactShadow(2));
    setShadow(mesh); scene.add(mesh); addEdible(mesh, eatR);
    const drive = (dt: number, vx: number, vz: number, vR: number): void => {
        // mid-turn: follow the bezier so nose and path always agree
        if (st.arc) {
          const a = st.arc;
          a.u = Math.min(1, a.u + (st.speed * dt) / a.len);
          const w = 1 - a.u;
          const px = w * w * a.p0x + 2 * w * a.u * a.p1x + a.u * a.u * a.p2x;
          const pz = w * w * a.p0z + 2 * w * a.u * a.p1z + a.u * a.u * a.p2z;
          // a turn that would carry the car off the island / into the lagoon
          // (clipped road stub near the coast) is cancelled BEFORE the position
          // is applied — U-turn instead. carSafe = whole body clear, not just
          // the centre point.
          if (!carSafe(px, pz)) { st.arc = null; st.dir *= -1; st.turnCd = 2; return; }
          const dxu = 2 * w * (a.p1x - a.p0x) + 2 * a.u * (a.p2x - a.p1x);
          const dzu = 2 * w * (a.p1z - a.p0z) + 2 * a.u * (a.p2z - a.p1z);
          mesh.position.set(px, 0, pz);
          mesh.rotation.y = headingOf(dxu, dzu);
          if (a.u >= 1) {
            st.arc = null; st.axis = st.nAxis; st.centre = st.nCentre; st.along = st.nAlong; st.laneOff = st.nLaneOff;
            // landed on a clipped road stub? bounce back onto the network
            if (!onRoad(mesh.position.x, mesh.position.z)) st.dir *= -1;
          }
          return;
        }
        st.turnCd = Math.max(0, st.turnCd - dt);
        if (st.pauseT && st.pauseT > 0) { st.pauseT -= dt; return; }
        const sp = spanFor(st.axis, st.centre, st.along);
        if (!sp) return;
        const dx = mesh.position.x - vx, dz = mesh.position.z - vz;
        let spd = st.speed;
        if (Math.hypot(dx, dz) < vR + 26) {
          spd = Math.min(30, st.speed * 2.1);   // scared, not uncatchable
          const ac = st.axis === 'h' ? dx : dz;
          const wantDir = ac >= 0 ? 1 : -1;
          // only flee toward road that actually EXISTS — at least 25u of it
          // BEYOND the U-turn margin, so panic never pushes a car past the
          // pavement end — otherwise hold course (dead end = the stub shake)
          const runway = wantDir > 0 ? sp[1] - EDGE_M - st.along : st.along - (sp[0] + EDGE_M);
          if (runway > 25) st.dir = wantDir;
        }
        st.along += st.dir * spd * dt;
        // hard interval clamp: brake once at the end of the pavement, then
        // pull away in reverse — no probes, no oscillation
        if (st.along > sp[1] - EDGE_M) { st.along = sp[1] - EDGE_M; st.pauseT = 0.35; st.dir = -1; }
        else if (st.along < sp[0] + EDGE_M) { st.along = sp[0] + EDGE_M; st.pauseT = 0.35; st.dir = 1; }
        if (st.turnCd === 0) for (const rc of ROAD_CENTERS_3D) if (Math.abs(st.along - rc) < 5 && Math.random() < 0.5) {
          // set up a quarter-circle-ish bezier: current pos -> lane corner -> exit on the new lane
          const nAxis = st.axis === 'h' ? 'v' : 'h';
          const nLaneOff = st.dir * LANE * (nAxis === 'h' ? 1 : -1);
          const nAlong = st.centre + st.dir * 8;             // exit a little past the corner
          const p1x = st.axis === 'h' ? rc + nLaneOff : st.centre + st.laneOff;
          const p1z = st.axis === 'h' ? st.centre + st.laneOff : rc + nLaneOff;
          const p2x = nAxis === 'h' ? nAlong : rc + nLaneOff;
          const p2z = nAxis === 'h' ? rc + nLaneOff : nAlong;
          // a junction near the coast can sit in open ocean (clipped road) —
          // never begin a turn whose corner, midpoint or exit puts any part of
          // the car off the island, and the exit road must have real runway
          // past the corner. (carSafe, not biomeAt: the centre point being on
          // land is not enough for a 5.6u-long car.)
          const midx = 0.25 * mesh.position.x + 0.5 * p1x + 0.25 * p2x;
          const midz = 0.25 * mesh.position.z + 0.5 * p1z + 0.25 * p2z;
          if (!carSafe(p1x, p1z) || !carSafe(p2x, p2z) || !carSafe(midx, midz)) continue;
          const esp = spanFor(nAxis, rc, nAlong);
          if (!esp || nAlong < esp[0] + EDGE_M || nAlong > esp[1] - EDGE_M) continue;
          const len = Math.hypot(p1x - mesh.position.x, p1z - mesh.position.z) + Math.hypot(p2x - p1x, p2z - p1z);
          st.arc = { p0x: mesh.position.x, p0z: mesh.position.z, p1x, p1z, p2x, p2z, u: 0, len: Math.max(4, len) };
          st.nAxis = nAxis; st.nCentre = rc; st.nAlong = nAlong; st.nLaneOff = nLaneOff; st.turnCd = 3;
          return;
        }
        if (st.axis === 'h') mesh.position.set(st.along, 0, st.centre + st.laneOff);
        else mesh.position.set(st.centre + st.laneOff, 0, st.along);
        const targetRot = st.axis === 'h' ? headingOf(st.dir, 0) : headingOf(0, st.dir);
        let dr = targetRot - mesh.rotation.y;
        while (dr > Math.PI) dr -= Math.PI * 2;
        while (dr < -Math.PI) dr += Math.PI * 2;
        mesh.rotation.y += dr * Math.min(1, dt * 10);
    };
    movers.push({
      mesh,
      update(dt, _t, vx, vz, vR) {
        if (eaten(mesh)) return;
        drive(dt, vx, vz, vR);
        // HARD INVARIANT — belt and braces, checked on EVERY code path every
        // frame after the position is derived: if any part of the car is off
        // the island (or it waded into the lagoon), it is teleported to a
        // random legal span far from the player before it can render there.
        // The old version flipped dir and nudged 10u — which could STILL be
        // off-island on an oblique coast, leaving the car oscillating in
        // space forever (the floating-traffic screenshots).
        if (!carSafe(mesh.position.x, mesh.position.z)) teleportCar(st, mesh, vx, vz);
      },
    });
  };
  // Pirate Bay has no road grid, so it gets no traffic here — its shuttle
  // buggies run on the boardwalk path instead, further down.
  for (let i = 0; i < (worldId() === 'maple' ? 30 : 0); i++) roadVehicle(makeCar(), 2.8, rand(14, 22));

  // ── wanderer (pedestrians, animals, event NPCs) ──────────────────────────
  // panic CONTAGION: a fleeing ped scares nearby strollers, so the void's
  // approach reads as a crowd wave, not one screamer beside a sunbather
  const panicPings: { x: number; z: number; t: number }[] = [];
  let pingClock = 0;
  const tmp = new THREE.Vector3();
  // MAPLE FALLS has a lagoon on its south shore that biomeAt() calls dry land
  // (it is inside the coastline), so a beach crowd would wade into it and keep
  // going. Neither Pirate Bay nor Game Day has one, and this must not cost
  // either a single test — hence the world check first, which short-circuits
  // the whole thing there. (Game Day has no interior water at all: it is a
  // plateau, and inWater3's pond and river are Maple's coordinates.)
  // …and the pond and the river, which it did not: 62 townsfolk spent a
  // 90-second match standing in interior water, one of them 6 units from the
  // river centreline for 21 seconds straight.
  const wet = (x: number, z: number, m: number) => WID === 'maple' && inWater3(x, z, m);
  function addWanderer(mesh: THREE.Object3D, hx: number, hz: number, tether: number, base: number, fear: number, radius: number, biome: string, panicLines?: string[], voice?: string, leg?: number, paceMul = 1) {
    if (!biomeAt(hx, hz) || wet(hx, hz, 8)) return;   // don't spawn anyone off the coastline, or in the water
    // …and nobody lives on the void's opening square. The owner's report was
    // "he starts on top of a person": this is the single choke point every
    // walking person in both worlds goes through, so one test covers the lot.
    // They can still WANDER in later — by then the player has moved.
    if (nearSpawn(hx, hz)) return;
    let ang = rand(0, Math.PI * 2), hop = 0, fled = false, slideT = 0;
    // MARGIN TEST, HOISTED. The step must keep the WHOLE body on land, not just
    // the center — a ped standing with its center on the cliff lip reads broken.
    // This lived inside update(), so every walking person in the world built a
    // fresh closure every frame: Lantern Night carries ~966 of them, which made
    // this the highest-count per-frame allocation in the game. It only ever
    // captured `ang`, which lives out here, so hoisting is behaviour-identical
    // and turns a per-frame cost into a per-spawn one.
    const stand = (px: number, pz: number) => !!biomeAt(px, pz) && !wet(px, pz, 0)
      && !!biomeAt(px + Math.cos(ang) * 2, pz + Math.sin(ang) * 2);
    let greetCd = rand(0, 5);   // LANTERN NIGHT: when this spirit last offered you something
    // ── THE ERRAND. Nine slots; `reAim` and `blocked` are a small integer and a
    // boolean, so they cost no boxed number per write. In steady state a walking
    // person writes `legT` and a standing one writes `dwell` — the same two
    // writes today's random walk makes to `ang` and `slideT`, because a straight
    // leg stops writing `ang` at all.
    const errand = leg !== undefined && leg > 0;
    const pace = base * paceMul;
    const stopR2 = Math.max(1.1, pace * 0.55) ** 2;      // arrival ring, sized to speed
    // an authored tether still contains the person: a leg never takes anyone
    // further from home than the larger of its own district and that tether.
    const leash2 = Math.max((leg ?? 0) * ERR.LEASH, tether) ** 2;
    let gx = hx, gz = hz;              // the goal
    // the first stop is staggered so the crowd does not step off together —
    // reusing greetCd, already drawn above, spends NO new build-time draw and
    // so leaves every downstream seeded placement bit-identical.
    let dwell = errand ? greetCd * 1.2 : 0;
    let legT = 0;                      // give-up backstop
    let reAim = 0;                     // frames until the heading is refreshed
    let blocked = false;               // the slide fired: this leg is unwalkable
    // Hoisted for the reason recorded above: never build a closure in update().
    const retarget = () => {
      const px = mesh.position.x, pz = mesh.position.z;
      const hdx = hx - px, hdz = hz - pz;
      // HEADING PERSISTENCE is what makes consecutive legs chain rather than
      // cancel: a strict home-and-back ping-pong scores a drift of zero because
      // the net displacement of a completed round trip is nothing. Which is
      // also why a failed search must NOT fall back to "walk home" — on Pirate
      // Bay, where nearly every leg from the sand meets water, that produced
      // exactly that ping-pong: 72 degrees/s of turning and a drift of 0.17.
      let a0 = ang + rand(-ERR.TURN, ERR.TURN);
      if (blocked) a0 = ang + (rand(0, 1) < 0.5 ? 1.6 : -1.6);   // the slide already found a walkable side
      else if (hdx * hdx + hdz * hdz > leash2) a0 = Math.atan2(hdz, hdx) + rand(-0.6, 0.6);
      // Five candidates, fanning wider and SHORTENING as they go: a coastal
      // person should take a short walk along the sand, not give up and go home.
      for (let k = 0; k < 5; k++) {
        const a = a0 + (k ? (k & 1 ? 1 : -1) * (0.9 + k * 0.45) : 0);
        const L = leg! * rand(1 - ERR.SPREAD, 1 + ERR.SPREAD) * (k < 2 ? 1 : k < 4 ? 0.7 : 0.45);
        const cx = Math.cos(a), cz = Math.sin(a);
        const tx = px + cx * L, tz = pz + cz * L;
        // WALK THE LEG BEFORE COMMITTING TO IT, at a third, two thirds and the
        // end: an endpoint test alone accepts a leg from one headland to the
        // next and then walks it through the bay. Three point-in-polygon tests
        // once every ten seconds per person is cheaper than the slide-and-
        // retarget the bad leg would otherwise cost every frame it grinds.
        let ok = true;
        for (let m = 1; m <= 2; m++) {
          const fx = px + cx * L * (m / 3), fz = pz + cz * L * (m / 3);
          if (!biomeAt(fx, fz) || wet(fx, fz, 2)) { ok = false; break; }
        }
        if (!ok) continue;
        if (!biomeAt(tx, tz) || wet(tx, tz, 4) || nearSpawn(tx, tz)) continue;
        gx = tx; gz = tz; ang = a; legT = L / pace * 2 + 4; reAim = ERR.REAIM;
        return;
      }
      // Boxed in on every side: stand where you are and try again shortly. The
      // goal stays put, so the arrival test holds the person still rather than
      // marching them across the only thing they cannot walk on.
      gx = px; gz = pz; dwell = rand(1.5, 3.5); legT = 6; reAim = ERR.REAIM;
    };
    mesh.userData.ptsMult = 1.5;   // moving prey beats furniture of the same size
    mesh.userData.mover = true;    // steers itself — the magnet must never grab it
    const cs = contactShadow(radius * 0.55);   // grounded on every quality tier
    mesh.add(cs);
    mesh.position.set(hx, 0, hz); setShadow(mesh); scene.add(mesh); addEdible(mesh, radius);
    const rec = { mesh, biome, panic: 0, voice };
    peds.push(rec);
    movers.push({
      mesh,
      update(dt, _t, vx, vz, vR) {
        if (eaten(mesh)) return;
        const dx = mesh.position.x - vx, dz = mesh.position.z - vz;
        const dist = Math.hypot(dx, dz);
        let spd = base;
        slideT = Math.max(0, slideT - dt);
        // ── THE THREE ACTS OF LANTERN NIGHT ─────────────────────────────
        // Below a third of the way up the tension curve the spirits have not
        // worked out what you are and treat you as a paying guest: they come
        // OVER. Between a third and two thirds they have noticed something is
        // wrong but not what, so they hold their ground and stare — the pause
        // is the whole joke, and it is also the only moment in the game where
        // a crowd does neither thing. Past two thirds it is an ordinary rout.
        // Measured over a full match at the first thresholds (0.34 / 0.66):
        // act one ran +65% net TOWARD the void, but by the top of minute two
        // it was already -74% away — the welcome was over before the child had
        // finished reading the first greeting, and the wary middle, which is
        // the best beat of the three, lasted seconds. Widened so the market
        // stays hospitable through most of the first act and the stare has
        // somewhere to live.
        const guest = WID === 'lantern' && tense < 0.42;
        const wary = WID === 'lantern' && tense >= 0.42 && tense < 0.74;
        if (guest && dist < vR + fear * 2.4 && dist > vR * 0.9 && calmT <= 0) {
          // TOWARD, not away — the sign is the entire mechanic. Gently: this
          // is somebody crossing a market to offer you a skewer, not a charge.
          ang = Math.atan2(-dz, -dx);
          spd = base * 1.35;
          greetCd -= dt;
          if (greetCd <= 0) {
            greetCd = rand(4.5, 9);
            const pool = OWN_GREET[biome] || OWN_GREET.stalls;
            tmp.set(mesh.position.x, 5, mesh.position.z);
            say(tmp, pickFresh(pool), 'ambient');
          }
          fled = false;
        } else if (wary && dist < vR + fear * 1.6 && calmT <= 0) {
          // rooted. They have stopped to look at you, which reads as unease
          // precisely because nothing else in the game ever stops.
          spd = 0;
          fled = false;
        } else if (dist < vR + fear && calmT <= 0) {
          // COMMIT to the flee heading: while a coast-slide is active the raw
          // away-vector must not overwrite it, or the ped ping-pongs at the
          // cliff (slide inland → re-flee outward → slide → …) = the edge shake
          if (slideT <= 0) ang = Math.atan2(dz, dx);
          spd = base * 3.4;
          if (!fled) {
            hop = 0.5;   // hop starts on the flee TRANSITION, not every frame
            panicPings.push({ x: mesh.position.x, z: mesh.position.z, t: pingClock });
            if (panicPings.length > 24) panicPings.shift();
            // …and how LOUD a chase is depends on the act too. A flat coin
            // flip meant the opening minute already ran 38% screaming, which
            // flattens the arc from underneath — the town cannot escalate to
            // panic if it started there. One in four early, seven in ten once
            // the place is actually going.
            if (Math.random() < 0.25 + 0.45 * tense) {
              // a pirate entertainer panics like a pirate wherever they stand
              // NOT gated on the wary band, and it would be dead code if it
              // were: the branch above catches everything inside vR+fear*1.6,
              // which strictly contains this branch's vR+fear, so `wary` is
              // false by construction every time this line runs. Anything that
              // reaches here is genuinely fleeing.
              const pool = panicLines || panPool(voice)
                || (WID === 'lantern' ? (LN_PANIC[biome] || LN_PANIC.stalls) : null)
                || PANIC[biome] || PANIC.generic;
              tmp.set(mesh.position.x, 5, mesh.position.z);
              say(tmp, pickFresh(pool), 'panic');
            }
          }
          fled = true;
        } else {
          if (dist > vR + fear + 40) fled = false;
          if (slideT <= 0) {
            if (!errand) {
              ang += rand(-1, 1) * dt * 3;
              const hd = Math.hypot(mesh.position.x - hx, mesh.position.z - hz);
              if (hd > tether) ang = Math.atan2(hz - mesh.position.z, hx - mesh.position.x);
            } else if (dwell > 0) {
              dwell -= dt; spd = 0;              // standing at the destination
            } else if (calmT > 0) {
              spd = pace * 0.6;                  // the establishing shot is a stroll,
                                                 // and no new goal is drawn under it
            } else {
              spd = pace;
              // the slide fallback firing IS the signal that this leg is
              // unwalkable — without this a walker grinds along a coastline for
              // the whole give-up timer at three biomeAt tests a frame
              if (blocked) { dwell = rand(0.4, 1.2); retarget(); blocked = false; }
              else {
                const gdx = gx - mesh.position.x, gdz = gz - mesh.position.z;
                const d2 = gdx * gdx + gdz * gdz;
                // ARRIVE AND AIM in the same breath. Arriving without picking the
                // next goal parks the crowd forever: the spawn goal is the spawn
                // point, so the first frame arrives, dwells, and arrives again.
                if (d2 < stopR2) { dwell = rand(ERR.D0, ERR.D1); retarget(); }
                else if ((legT -= dt) <= 0) { dwell = rand(0.4, 1.2); retarget(); }
                // …and the heading self-heals from every writer above it —
                // guest, flee, the tether return, contagion, the slide — rather
                // than trusting five call sites to set a flag.
                else if (--reAim <= 0) { reAim = ERR.REAIM; ang = Math.atan2(gdz, gdx); }
              }
            }
            // contagion: a fresh scream nearby sends this ped scurrying too
            // (the calm window skips the loop outright — it used to build a
            // throwaway empty array per idle ped per frame to iterate nothing,
            // and calm(4) runs at every match start, while GLBs are still
            // streaming and the frame can least afford the churn)
            if (calmT <= 0) for (const pg of panicPings) {
              if (pingClock - pg.t > 1.5) continue;
              const pdx = mesh.position.x - pg.x, pdz = mesh.position.z - pg.z;
              if (pdx * pdx + pdz * pdz < 625) { ang = Math.atan2(pdz, pdx); spd = base * 2.4; hop = Math.max(hop, 0.3); break; }
            }
          }
        }
        if (spd > 0) {   // a person standing still bought three point-in-polygon
                         // tests a frame to displace itself by zero
        let nx = mesh.position.x + Math.cos(ang) * spd * dt, nz = mesh.position.z + Math.sin(ang) * spd * dt;
        if (!stand(nx, nz)) {
          // blocked (coast/water): slide sideways and COMMIT to it for half a
          // second, only reverse as a last resort
          for (const alt of [ang + Math.PI / 2, ang - Math.PI / 2, ang + Math.PI]) {
            const ax2 = mesh.position.x + Math.cos(alt) * spd * dt, az2 = mesh.position.z + Math.sin(alt) * spd * dt;
            if (biomeAt(ax2, az2) && !wet(ax2, az2, 0) && biomeAt(ax2 + Math.cos(alt) * 2, az2 + Math.sin(alt) * 2)) { ang = alt; nx = ax2; nz = az2; slideT = 0.5; blocked = true; break; }
          }
        }
        if (biomeAt(nx, nz) && !wet(nx, nz, 0)) { mesh.position.x = nx; mesh.position.z = nz; }
        else { blocked = true; if (hop > 0) hop = 0; }   // pinned: stop the panic bounce so nothing vibrates in place
        }
        // THE HEAD LEADS THE TURN. Snapping the whole body to the travel
        // heading every frame is what made everyone read as a sliding brick:
        // the body now eases toward the heading and the head takes up the
        // slack, so a change of direction has a beat to it.
        let dyaw = (-ang + Math.PI / 2) - mesh.rotation.y;
        while (dyaw > Math.PI) dyaw -= Math.PI * 2;
        while (dyaw < -Math.PI) dyaw += Math.PI * 2;
        mesh.rotation.y += dyaw * Math.min(1, dt * 9);
        if (hop > 0) { hop -= dt; mesh.position.y = Math.abs(Math.sin(hop * 12)) * 0.8; } else mesh.position.y = 0;
        // walk cycle: arms + legs swing with travel speed
        const limbs = mesh.userData.limbs as Limbs | undefined;
        const dnc = mesh.userData.dancer as
          { t: number; spin: number; mode?: number; px?: number; pz?: number } | undefined;
        if (dnc && dnc.mode === 1 && hop <= 0) {
          // ── EVENT MANAGER: rooted to the spot, one arm sweeping the crowd
          // toward whatever is scheduled next. Same userData slot as the
          // dancer, so this costs zero extra per-frame lookups.
          dnc.t += dt;
          if (limbs) {
            const s = Math.sin(dnc.t * 2.4);
            limbs.ra.rotation.z = -2.25 + s * 0.4; limbs.ra.rotation.x = 0.2;
            limbs.la.rotation.x = s * 0.2; limbs.ll.rotation.x = 0; limbs.rl.rotation.x = 0;
          }
        } else if (dnc && dnc.mode === 2 && hop <= 0) {
          // ── KIDS: they do not walk anywhere, they SKIP
          dnc.t += dt;
          const b = dnc.t * 9;
          mesh.position.y = Math.abs(Math.sin(b)) * 0.24;
          if (limbs) {
            const sw = Math.sin(b) * 0.85;
            limbs.ll.rotation.x = sw; limbs.rl.rotation.x = -sw;
            limbs.la.rotation.x = -sw; limbs.ra.rotation.x = sw;
          }
        } else if (dnc && dnc.mode === 3 && hop <= 0) {
          // ── WORKING: rooted, both hands busy in front — mending a net,
          // winding the well, gutting the catch. Old Town's whole read.
          dnc.t += dt;
          const s = Math.sin(dnc.t * 2.2), s2 = Math.sin(dnc.t * 2.2 + 1.1);
          if (limbs) {
            limbs.la.rotation.x = -1.1 + s * 0.42; limbs.ra.rotation.x = -1.1 + s2 * 0.42;
            limbs.la.rotation.z = 0.3; limbs.ra.rotation.z = -0.3;
            limbs.torso.rotation.x = 0.24 + s * 0.09;      // stooped over the work
            limbs.torso.rotation.y = s * 0.12;
            limbs.head.rotation.x = 0.3;
            limbs.ll.rotation.x = 0; limbs.rl.rotation.x = 0;
            mesh.position.y = s * 0.05;
          }
        } else if (dnc && dnc.mode === 5 && hop <= 0) {
          // ── CAMPAIGNING: rooted on the pavement, the leaflet arm held out
          // to anyone who stands still, the body slowly scanning the street
          // for the next one. Maple Falls in one animation.
          dnc.t += dt;
          if (limbs) {
            const s = Math.sin(dnc.t * 1.9), thrust = Math.max(0, Math.sin(dnc.t * 1.9 + 0.9));
            limbs.ra.rotation.x = -1.35 - thrust * 0.45;   // "take one. TAKE one."
            limbs.ra.rotation.z = -0.30;
            limbs.la.rotation.x = -0.55;                    // the rest of the ream
            limbs.la.rotation.z = 0.30;
            limbs.torso.rotation.y = s * 0.34;
            limbs.head.rotation.y = s * 0.5;
            limbs.ll.rotation.x = 0; limbs.rl.rotation.x = 0;
            mesh.rotation.y += dt * 0.35 * dnc.spin;        // works the whole pavement
          }
        } else if (dnc && dnc.mode === 6 && hop <= 0) {
          // ── PROTESTING: day 3,281. The placard is welded above the shoulder,
          // so all this has to do is give it a slow, immovable sway and shift
          // the weight from foot to foot. Nine years of exactly this.
          dnc.t += dt;
          const s = Math.sin(dnc.t * 1.15);
          mesh.position.y = Math.abs(s) * 0.06;
          if (limbs) {
            limbs.ra.rotation.x = -0.22 + s * 0.16;
            limbs.ra.rotation.z = -0.12 - s * 0.10;         // the sign leans, then leans back
            limbs.la.rotation.x = 0.10 - s * 0.12;
            limbs.torso.rotation.z = s * 0.05;
            limbs.head.rotation.y = Math.sin(dnc.t * 0.55) * 0.45;
            limbs.ll.rotation.x = s * 0.05; limbs.rl.rotation.x = -s * 0.05;
          }
        } else if (dnc && dnc.mode === 7 && hop <= 0) {
          // ── HECKLING: one arm punching the air on the off-beat, pitched
          // forward, absolutely certain. Never mean — just LOUD.
          dnc.t += dt;
          const b = dnc.t * 2.1, punch = Math.max(0, Math.sin(b));
          mesh.position.y = punch * 0.14;
          if (limbs) {
            limbs.ra.rotation.x = -0.4 - punch * 2.2;
            limbs.ra.rotation.z = -0.25;
            limbs.la.rotation.x = 0.3;
            limbs.torso.rotation.x = 0.18 + punch * 0.10;
            limbs.head.rotation.x = -0.12;
            limbs.ll.rotation.x = 0.1; limbs.rl.rotation.x = -0.1;
          }
        } else if (dnc && dnc.mode === 4 && hop <= 0) {
          // ── CONGA: hands on the shoulders in front, hips going, and every
          // second bar the whole line kicks out to the side. Position comes
          // from the follow chain — this is only the pose.
          dnc.t += dt;
          const b = dnc.t * 3.8;
          const kick = Math.sin(b * 0.5) > 0.72 ? Math.sin(b * 4) : 0;
          mesh.position.y = Math.abs(Math.sin(b)) * 0.3;
          if (limbs) {
            limbs.la.rotation.x = -1.5; limbs.ra.rotation.x = -1.5;   // arms straight forward
            limbs.la.rotation.z = 0.22; limbs.ra.rotation.z = -0.22;
            limbs.ll.rotation.x = Math.sin(b) * 0.42; limbs.rl.rotation.x = -Math.sin(b) * 0.42;
            limbs.ll.rotation.z = kick * 0.55; limbs.rl.rotation.z = kick * 0.55;
            limbs.torso.rotation.y = Math.sin(b) * 0.26;
            limbs.head.rotation.y = Math.sin(b * 0.5) * 0.4;
          }
        } else if (dnc && hop <= 0) {
          // ── DANCING: everyone on the floor is on the SAME beat (a shared
          // clock), arms up, hips swinging, bobbing on the downbeat. Offset
          // per dancer so it reads as a crowd, not a chorus line of clones.
          //
          // The bob used to be 0.34 units — under two screen pixels at the
          // mid-game camera, which is why a floor of 42 dancers measured as
          // almost perfectly still. It is now a real jump, plus a LATERAL
          // sway: side to side is what reads at a top-down camera, where
          // vertical motion is almost entirely foreshortened away. The sway is
          // applied as a delta against the previous frame's offset so it never
          // corrupts the wander integration underneath it.
          dnc.t += dt;
          const beat = dnc.t * 4.4;
          mesh.position.y = Math.abs(Math.sin(beat)) * 0.78;
          mesh.rotation.y += dt * dnc.spin * 1.1;
          const sway = Math.sin(beat * 0.5) * 0.62, surge = Math.sin(beat * 0.25) * 0.44;
          mesh.position.x += sway - (dnc.px ?? 0); dnc.px = sway;
          mesh.position.z += surge - (dnc.pz ?? 0); dnc.pz = surge;
          if (limbs) {
            const up = 2.3 + Math.sin(beat * 2) * 0.5;      // hands in the air
            limbs.la.rotation.x = -up; limbs.ra.rotation.x = -up + Math.sin(beat) * 0.5;
            limbs.la.rotation.z = 0.35 + Math.sin(beat * 0.5) * 0.3;
            limbs.ra.rotation.z = -0.35 + Math.sin(beat * 0.5) * 0.3;
            const st = Math.sin(beat) * 0.55;
            limbs.ll.rotation.x = st; limbs.rl.rotation.x = -st;
            limbs.torso.rotation.z = -Math.sin(beat * 0.5) * 0.2;    // hips lead the sway
            limbs.torso.rotation.y = Math.sin(beat) * 0.22;
          }
        } else if (limbs && dwell > 0 && spd === 0) {
          // ── STOPPED, WITH SOMETHING TO DO. The walk branch below advances a
          // standing person's limbs by 0.055 radians of amplitude: at the far
          // camera's 12.5 px per unit that is a third of a pixel, so a person
          // who has arrived somewhere reads as a statue. This is the WORKING
          // pose (mode 3's shape, 20x the amplitude) applied by state rather
          // than by a stored mode — a mode would fall through to the dance
          // catch-all when it is 0, and would still be set when the void
          // interrupts the dwell, freezing the legs of somebody sprinting.
          // Flee, contagion and the guest branch all set spd > 0, so this pose
          // ends on the frame the void starts to matter.
          limbs.phase += dt * 2.2;
          const s3 = Math.sin(limbs.phase), s4 = Math.sin(limbs.phase + 1.1);
          limbs.la.rotation.x = -1.1 + s3 * 0.42; limbs.ra.rotation.x = -1.1 + s4 * 0.42;
          limbs.la.rotation.z = 0.3; limbs.ra.rotation.z = -0.3;
          limbs.torso.rotation.x = 0.24 + s3 * 0.09; limbs.torso.rotation.y = s3 * 0.12;
          limbs.ll.rotation.x = 0; limbs.rl.rotation.x = 0;
        } else if (limbs) {
          // ── WALK / IDLE / FLEE, one branch. The phase always advances (so a
          // standing person breathes and shifts weight instead of being a
          // statue) but the AMPLITUDE tracks travel speed, so an idler sways
          // and a walker strides.
          limbs.phase += dt * (spd * 2.4 + 1.1);
          const ph = limbs.phase;
          const amp = Math.min(0.55, 0.055 + spd * 0.09);
          const sw = Math.sin(ph) * amp;
          limbs.ll.rotation.x = sw; limbs.rl.rotation.x = -sw;
          if (fled) {
            // panicking looks NOTHING like walking fast: arms straight up and
            // wobbling, body pitched forward, stride at full amplitude
            limbs.la.rotation.x = -2.4 + sw; limbs.ra.rotation.x = -2.4 - sw;
            limbs.la.rotation.z = 0.45; limbs.ra.rotation.z = -0.45;
            limbs.torso.rotation.x = 0.16;
          } else {
            limbs.la.rotation.x = -sw * 0.8; limbs.ra.rotation.x = sw * 0.8;
            limbs.la.rotation.z = 0; limbs.ra.rotation.z = 0;
            limbs.torso.rotation.x = Math.min(0.09, spd * 0.012);   // lean into the walk
          }
          // stride bob + torso counter-rotation + head lag: the three things
          // that stop a walk cycle reading as a mesh sliding on a plane
          if (hop <= 0) mesh.position.y = (1 - Math.cos(ph * 2)) * limbs.bob * (0.25 + amp);
          limbs.torso.rotation.y = -sw * 0.30;
          limbs.head.rotation.y = sw * 0.16 + Math.max(-0.6, Math.min(0.6, dyaw * 0.8));
        }
        // the blob stays ON the ground while its owner hops / skips / dances —
        // computed last so the bob branches above are already applied
        cs.position.y = 0.045 - mesh.position.y;
      },
    });
    return rec;
  }

  // a static prop, placed and made edible only if it is actually on land
  const decor = (mesh: THREE.Object3D, x: number, z: number, r = 3, rotY?: number) => {
    if (!insideIsland3(x, z) || (worldId() === 'maple' && inLagoon3(x, z, 20))) return;   // never off the coast, never in the lagoon
    mesh.position.set(x, 0, z);
    if (rotY !== undefined) mesh.rotation.y = rotY;
    setShadow(mesh); scene.add(mesh); addEdible(mesh, r);
  };

  // ══════════════════════════════════════════════════════════════════════════
  //  MAPLE FALLS — ZONES
  // ══════════════════════════════════════════════════════════════════════════
  // The 6x6 plan's biome ids are OWNED BY island.ts and get re-zoned without
  // warning (the districts were `cozy/fancy/downtown/plaza/park/forest/beach/
  // zoo/airport/military` this morning and are `forest/farm/fair/strip/cozy/
  // downtown/plaza/park/campus/beach` now). So nothing below keys off a biome
  // literal: every id is normalised through this table into one of ten TOWN
  // ZONES, and an id nobody has taught us about degrades to `burb` — a
  // residential street, which has a full cast and is never empty or wrong.
  // The ids are read as STRINGS deliberately, so a rename in island.ts is a
  // graceful demotion here rather than a compile error or a missing crowd.
  type MZone = 'main' | 'civic' | 'burb' | 'school' | 'farm' | 'fair' | 'lake' | 'woods' | 'strip' | 'park';
  const ZONE_OF: Record<string, MZone> = {
    // current island.ts ids
    downtown: 'main', plaza: 'civic', cozy: 'burb', campus: 'school', farm: 'farm',
    fair: 'fair', beach: 'lake', forest: 'woods', strip: 'strip', park: 'park',
    // ids island.ts has retired but kept in the union, and the ones the
    // re-zoning brief floated — all mapped so either naming works unchanged
    fancy: 'burb', burb: 'burb', suburb: 'burb', mainst: 'main', main: 'main',
    square: 'civic', civic: 'civic', townhall: 'civic', school: 'school',
    field: 'farm', fairground: 'fair', fairgrounds: 'fair', lake: 'lake',
    shore: 'lake', woods: 'woods', pines: 'woods', mall: 'strip', diner: 'strip',
    airport: 'strip', military: 'strip', zoo: 'park', green: 'park',
  };
  const GH = PLAN_GRID.length, GW = PLAN_GRID[0].length;
  const biomeIdAt = (gx: number, gy: number): string => String(PLAN_GRID[gy][gx]);
  const zoneAt = (gx: number, gy: number): MZone => ZONE_OF[biomeIdAt(gx, gy)] ?? 'burb';

  // Which RIBBON a block flies. Still striped, because "that whole street is
  // crimson and the next one is blue" is a lovely read from the play camera —
  // but three-wide now, so it is a fair and not a ballot.
  const sideOf = (gx: number, gy: number): number =>
    FAIR_COLS[(gx * 2 + gy + (gy >= GH - 2 ? 1 : 0)) % FAIR_COLS.length];

  // every block, grouped by zone, and only if its centre is actually on land
  const zoneBlocks = new Map<MZone, [number, number][]>();
  if (worldId() === 'maple') for (let gy = 0; gy < GH; gy++) for (let gx = 0; gx < GW; gx++) {
    const [cx, cz] = blockCenter3D(gx, gy);
    if (!biomeAt(cx, cz)) continue;
    const z = zoneAt(gx, gy);
    const l = zoneBlocks.get(z);
    if (l) l.push([gx, gy]); else zoneBlocks.set(z, [[gx, gy]]);
  }
  // resolve a zone to a block, preferring one no vignette has claimed yet, then
  // the listed fallback zones, then anything on the map. A vignette NEVER
  // silently fails to exist because a district was renamed.
  const usedBlocks = new Set<string>();
  const anchorOf = (z: MZone, ...fb: MZone[]): [number, number] | null => {
    // FIRST pass: an unclaimed block anywhere down the preference list. This is
    // what stops the stump speech and the town-hall meeting piling onto the one
    // civic block and reading as a single 40-person mosh pit.
    for (const want of [z, ...fb]) {
      const list = zoneBlocks.get(want);
      if (!list) continue;
      const free = list.filter((b) => !usedBlocks.has(b[0] + ',' + b[1]));
      if (!free.length) continue;
      const b = pick(free);
      usedBlocks.add(b[0] + ',' + b[1]);
      return b;
    }
    // SECOND pass: everything is claimed, so double up — in preference order
    for (const want of [z, ...fb]) {
      const list = zoneBlocks.get(want);
      if (!list || !list.length) continue;
      const b = pick(list);
      usedBlocks.add(b[0] + ',' + b[1]);
      return b;
    }
    for (const list of zoneBlocks.values()) if (list.length) {
      const b = pick(list); usedBlocks.add(b[0] + ',' + b[1]); return b;
    }
    return null;
  };

  // ── THE TOWNSFOLK ────────────────────────────────────────────────────────
  // Per-zone cast lists, not crowd counts: who LIVES here and what they are
  // doing. `n` people are drawn from `roles` in order and then wrapped, so the
  // head of each list is the district's signature and the tail is its texture.
  const ZONE_CAST: Record<MZone, { n: number; roles: Role[] }> = {
    main: { n: 7, roles: ['campaigner', 'gossip', 'server', 'booster', 'teen', 'mail', 'gossip', 'kid', 'dogwalker', 'protester'] },
    civic: { n: 8, roles: ['campaigner', 'protester', 'campaigner', 'gossip', 'booster', 'teen', 'kid', 'mail', 'gossip'] },
    burb: { n: 5, roles: ['dogwalker', 'kid', 'gossip', 'mail', 'kid', 'booster', 'teen', 'campaigner'] },
    school: { n: 4, roles: ['teen', 'ballplayer', 'cheer', 'bandkid', 'teen', 'kid', 'coach', 'teen'] },
    farm: { n: 4, roles: ['farmer', 'farmer', 'kid', 'farmer', 'teen', 'booster'] },
    fair: { n: 6, roles: ['booster', 'kid', 'baker', 'gossip', 'farmer', 'kid', 'teen', 'campaigner', 'server', 'cheer'] },
    lake: { n: 7, roles: ['fisher', 'kid', 'camper', 'gossip', 'kid', 'teen', 'booster'] },
    woods: { n: 3, roles: ['camper', 'fisher', 'camper', 'kid'] },
    strip: { n: 5, roles: ['server', 'teen', 'gossip', 'teen', 'booster', 'mail', 'kid'] },
    park: { n: 5, roles: ['dogwalker', 'kid', 'gossip', 'booster', 'teen', 'camper', 'kid'] },
  };
  const KID_ROLES: Role[] = ['kid', 'ballplayer'];
  // one place where "put a named townsperson here" is implemented
  const townie = (role: Role, x: number, z: number, dress: string, side?: number,
                  tether = 16, spd = rand(3.4, 5.6), fear = 18, pan?: string[], leg?: number) => {
    const p = makeCast(role, dress, side);
    if (KID_ROLES.includes(role)) p.userData.dancer = { t: rand(0, 6), spin: 1, mode: 2 };
    return addWanderer(p, x, z, tether, spd, fear,
      KID_ROLES.includes(role) ? 1.9 : 2.4, dress, pan, VOICE_OF[role], leg);
  };
  // rooted, doing a job: campaigning (5), protesting (6), heckling (7),
  // working with both hands (3) or running the show (1)
  const rooted = (role: Role, x: number, z: number, dress: string, mode: number,
                  side?: number, face?: number, fear = 16, pan?: string[]) => {
    const p = makeCast(role, dress, side);
    p.userData.dancer = { t: rand(0, 6), spin: Math.random() < 0.5 ? 1 : -1, mode };
    const rec = addWanderer(p, x, z, 1.6, rand(0.15, 0.45), fear, 2.4, dress, pan, VOICE_OF[role]);
    if (rec && face !== undefined) rec.mesh.rotation.y = face;
    return rec;
  };

  for (let gy = 0; gy < GH; gy++) for (let gx = 0; gx < GW; gx++) {
    if (worldId() !== 'maple') break;   // no grid here — see the per-world blocks below
    const dress = biomeIdAt(gx, gy);
    const zone = zoneAt(gx, gy);
    const cast = ZONE_CAST[zone];
    const [cx, cz] = blockCenter3D(gx, gy);
    const side = sideOf(gx, gy);
    for (let i = 0; i < cast.n; i++) {
      // half the crowd lives mid-block, half strolls near the sidewalk edges
      const edge = i % 2 === 1;
      const t = HALF_BLOCK_3D * (edge ? rand(0.88, 0.98) : rand(-0.7, 0.7));
      const hx = edge && Math.random() < 0.5 ? cx + (Math.random() < 0.5 ? t : -t) : cx + rand(-HALF_BLOCK_3D * 0.7, HALF_BLOCK_3D * 0.7);
      const hz = edge ? cz + (Math.random() < 0.5 ? t : -t) : cz + rand(-HALF_BLOCK_3D * 0.7, HALF_BLOCK_3D * 0.7);
      const role = cast.roles[i % cast.roles.length];
      // one in six is off-message: the house on a red street with a blue sign
      const wear = Math.random() < 0.17 ? (side === DINKLE ? HOLLIS : DINKLE) : side;
      if (role === 'campaigner') rooted(role, hx, hz, dress, 5, wear);
      else townie(role, hx, hz, dress, wear, edge ? 28 : 20, rand(4, 7), 18, undefined, 32);
    }
    // ── YARD SIGNS. The cheapest possible statement of allegiance and the one
    // that reads from the very top of the camera's travel: a verge of them in
    // one colour, the next street over in the other.
    if (zone === 'burb' || zone === 'main' || zone === 'civic' || zone === 'strip') {
      const E = HALF_BLOCK_3D * 0.9;
      for (let i = 0; i < 4; i++) {
        const along = rand(-E * 0.75, E * 0.75);
        const onX = i < 2;
        const sx = onX ? cx + along : cx + (i === 2 ? -E : E);
        const sz = onX ? cz + (i === 0 ? -E : E) : cz + along;
        // the one neighbour on the street who has other ideas
        decor(makeYardSign(Math.random() < 0.22 ? (side === DINKLE ? HOLLIS : DINKLE) : side), sx, sz, 1.2);
      }
    }
  }

  // livestock / zoo animals: clamped near the pen
  if (worldId() === 'maple') {
    const [zx, zz] = blockCenter3D(5, 1);
    // each animal is TETHERED to its pen (matching the baked pen floors):
    // savanna NW, paddock SW, flamingo lagoon E
    const PENS: [number, number][] = [[zx - 15, zz - 21.5], [zx - 15, zz + 21.5], [zx + 10, zz]];
    for (let i = 0; i < 6; i++) {
      const [pcx, pcz] = PENS[Math.floor(i / 3) % 2];   // species grouped per pen — no lion/sheep roommates
      addWanderer(makeAnimal(), pcx + rand(-7, 7), pcz + rand(-5, 5), 8, rand(2.5, 4), 22, 3, 'zoo');
    }
    for (let i = 0; i < 3; i++) {   // flamingos wade in their lagoon
      const fl = new THREE.Group();
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 8), sharedMat(0xff9ec2, 0.85));
      body.scale.set(1.15, 0.9, 1); body.position.y = 1.5; fl.add(body);
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.5, 5), sharedMat(0xe86a9a, 0.9));
      leg.position.y = 0.75; fl.add(leg);
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 1.1, 6), sharedMat(0xff9ec2, 0.85));
      neck.position.set(0.4, 2.4, 0); neck.rotation.z = -0.35; fl.add(neck);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), sharedMat(0xff9ec2, 0.85));
      head.position.set(0.62, 2.95, 0); fl.add(head);
      const beak = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.32, 6), sharedMat(0x2c3038, 0.7));
      beak.rotation.z = -Math.PI / 2; beak.position.set(0.85, 2.9, 0); fl.add(beak);
      addWanderer(fl, PENS[2][0] + rand(-6, 6), PENS[2][1] + rand(-6, 6), 8, rand(1.2, 2), 26, 2.2, 'zoo');
    }
  }

  // beach sunbathers: flat out on their towels, working on the tan
  const towelGeo = new THREE.PlaneGeometry(3.6, 5.4);
  for (let gy = 0; gy < 6; gy++) for (let gx = 0; gx < 6; gx++) {
    if (worldId() !== 'maple') break;
    if (PLAN_GRID[gy][gx] !== 'beach') continue;
    const [bx, bz] = blockCenter3D(gx, gy);
    for (let i = 0; i < 3; i++) {
      const tx = bx + rand(-HALF_BLOCK_3D * 0.55, HALF_BLOCK_3D * 0.55);
      const tz = bz + rand(-HALF_BLOCK_3D * 0.55, HALF_BLOCK_3D * 0.55);
      if (!biomeAt(tx, tz) || inLagoon3(tx, tz, 60)) continue;
      const towel = new THREE.Mesh(towelGeo, mat(pick([0xff6f91, 0x4dd0e1, 0xffd54f, 0x7be8b0]), 0.95));
      towel.rotation.x = -Math.PI / 2; towel.rotation.z = rand(0, Math.PI * 2);
      towel.position.set(tx, 0.08, tz); scene.add(towel);
      const bather = makePerson('beach');
      bather.rotation.x = -Math.PI / 2;                        // flat on the back
      bather.rotation.z = towel.rotation.z;
      bather.position.set(tx, 0.55, tz);
      // lying pose is part of "home": rematch restore must not stand them up
      bather.userData.homeRotX = bather.rotation.x; bather.userData.homeRotZ = bather.rotation.z;
      setShadow(bather); scene.add(bather); addEdible(bather, 2.4);
    }
  }

  // ══ PIRATE BAY life — scattered inside REGIONS, never on a grid ═════════
  // Maple Isle drops its crowd on 6x6 block centres. Pirate Bay has no blocks:
  // every holidaymaker, dancer, parrot, crab and sunbather is rejection-sampled
  // inside a district polygon (so nobody stands in the bay), and the boardwalk
  // gets its own stream of strollers and shuttle buggies.
  if (worldId() === 'pirate') {
    const region = (id: BAY.BayBiome) => BAY.BAY_REGIONS.find((r) => r.id === id)!;
    const spread = (id: BAY.BayBiome, n: number, clear = 45): [number, number][] =>
      BAY.scatterInRegion(region(id), n, Math.random, clear).map(w3);

    // ── who works and who holidays WHERE. Every district gets a cast list, not
    // a crowd count: rich guests and their staff at the resort, dock hands and
    // costumed pirates at the docks, kids anywhere there is sand or a pool.
    // Placement still goes through spread() -> BAY.scatterInRegion, so nobody
    // can land in the bay.
    const castOf = (role: Role, dress: string) => makeCast(role, dress);
    const place = (role: Role, dress: string, x: number, z: number, biome: string) => {
      const p = castOf(role, dress);
      if (role === 'kid') p.userData.dancer = { t: rand(0, 6), spin: 1, mode: 2 };
      else if (role === 'manager') p.userData.dancer = { t: rand(0, 6), spin: 1, mode: 1 };
      addWanderer(p,
        x, z,
        role === 'manager' ? 2 : role === 'kid' ? 26 : 22,
        role === 'manager' ? rand(0.2, 0.5) : role === 'kid' ? rand(6.5, 9) : rand(3.5, 6.5),
        18, role === 'kid' ? 1.9 : 2.4, biome, undefined, VOICE_OF[role],
        // the front is a promenade: amenity to amenity, one stretch at a time.
        // The manager is posted behind his desk and stays there.
        role === 'manager' ? 0 : 22);
    };
    const CAST: [BAY.BayBiome, string, [Role, number][]][] = [
      // THE RESORT — the machine: guests being waited on, staff doing the waiting
      ['resort', 'resort', [['rich', 6], ['robe', 3], ['guest', 2], ['kid', 4],
        ['waiter', 2], ['bellhop', 1], ['spa', 1], ['chef', 1], ['manager', 1]]],
      // THE BAZAAR — traders, hagglers and a pirate posing for photos
      ['market', 'market', [['guest', 5], ['pirate', 2], ['kid', 2], ['rich', 2], ['manager', 1]]],
      ['oldtown', 'market', [['guest', 4], ['pirate', 2], ['kid', 2], ['grounds', 1], ['manager', 1]]],
      // THE DOCKS — working crew, and the entertainment that greets the tenders
      ['port', 'port', [['dock', 5], ['pirate', 3], ['guest', 2], ['rich', 1], ['kid', 1]]],
      // SUNSET BEACH — kids, lifeguards, and people who paid for the raked sand
      ['beach', 'resort', [['kid', 4], ['guest', 2], ['lifeguard', 2], ['rich', 2],
        ['waiter', 1], ['diver', 1], ['manager', 1]]],
      // SMUGGLERS COVE — treasure hunters who have found four bottlecaps
      ['cove', 'cove', [['digger', 3], ['kid', 3], ['guest', 2], ['pirate', 1]]],
      // THE JUNGLE — where you go to get away from all of the above
      ['jungle', 'jungle', [['guest', 3], ['grounds', 2]]],
      // DANCE COVE fringe — crew, bar staff and kids orbiting the DJ set
      ['party', 'party', [['kid', 3], ['dj', 2], ['waiter', 1], ['manager', 1]]],
    ];
    for (const [id, dress, roles] of CAST) {
      let total = 0;
      for (const r of roles) total += r[1];
      const pts = spread(id, total);
      let i = 0;
      for (const [role, n] of roles) for (let k = 0; k < n && i < pts.length; k++, i++)
        place(role, dress, pts[i][0], pts[i][1], dress);
    }

    // THE DANCE FLOOR — a packed crowd on ONE shared beat, barely travelling.
    // Short tether + near-zero base speed is what turns a walk into a dance.
    // (24 before the conga line existed — ten of them are in it now)
    for (const [x, z] of spread('party', 18, 20)) {
      const dancer = makePerson('party', pick([0xff2fa0, 0x2fd8e8, 0xffd23f, 0x9a5cf0, 0x4ef0a0, 0xff8a3a]),
        { glasses: Math.random() < 0.3, hat: Math.random() < 0.18 ? 'flower' : undefined });
      dancer.userData.dancer = { t: rand(0, 6), spin: Math.random() < 0.5 ? 1 : -1 };
      addWanderer(dancer, x, z, 3, rand(0.3, 0.8), 24, 2.4, 'party');
    }

    // STROLLERS strung along the promenade so the boardwalk is never empty —
    // and the boardwalk is where the money walks, so it skews posh
    const PROM_ROLES: Role[] = ['rich', 'rich', 'guest', 'kid', 'robe', 'bellhop', 'waiter', 'pirate', 'manager'];
    for (let i = 0; i < 20; i++) {
      const pp = BAY.pathPointAt(BAY.PROMENADE, i / 20 + rand(-0.015, 0.015));
      const off = rand(-BAY.PROM_HALF * 0.72, BAY.PROM_HALF * 0.72);
      const dress = pick(['resort', 'market', 'port']);
      const [x, z] = w3([pp.x + Math.cos(pp.ang + Math.PI / 2) * off, pp.y + Math.sin(pp.ang + Math.PI / 2) * off]);
      place(pick(PROM_ROLES), dress, x, z, dress);
    }
    // and a few hikers + a groundskeeper on the jungle trail
    for (let i = 0; i < 6; i++) {
      const pp = BAY.pathPointAt(BAY.TRAIL, (i + 0.5) / 6);
      const [x, z] = w3([pp.x + rand(-90, 90), pp.y + rand(-90, 90)]);
      place(i === 2 ? 'grounds' : i === 4 ? 'kid' : 'guest', 'jungle', x, z, 'jungle');
    }

    // WILDLIFE: parrots squabbling over the bazaar and the canopy, crabs
    // scuttling the sand. Both are edible, both flee, both are tiny.
    for (const id of ['market', 'jungle'] as const)
      for (const [x, z] of spread(id, id === 'jungle' ? 5 : 3, 20))
        addWanderer(makeParrot(), x, z, 12, rand(1.6, 2.8), 22, 1.4, id);
    for (const id of ['beach', 'cove'] as const)
      for (const [x, z] of spread(id, 6, 20))
        addWanderer(makeCrab(), x, z, 9, rand(1.2, 2.2), 16, 1.2, id);

    // SUNBATHERS flat out on towels — the resort's answer to Maple's beach
    for (const id of ['beach', 'resort'] as const)
      for (const [tx, tz] of spread(id, 8, 60)) {
        const towel = new THREE.Mesh(towelGeo, mat(pick([0xff6f91, 0x4dd0e1, 0xffd54f, 0x7be8b0]), 0.95));
        towel.rotation.x = -Math.PI / 2; towel.rotation.z = rand(0, Math.PI * 2);
        towel.position.set(tx, 0.08, tz); scene.add(towel);
        // half the loungers are rich guests in shades — the other half are the
        // people who will complain about them later
        const bather = makeCast(pick(['rich', 'rich', 'robe', 'guest'] as Role[]), id === 'beach' ? 'cove' : 'resort');
        bather.rotation.x = -Math.PI / 2;
        bather.rotation.z = towel.rotation.z;
        bather.position.set(tx, 0.55, tz);
        bather.userData.homeRotX = bather.rotation.x; bather.userData.homeRotZ = bather.rotation.z;
        setShadow(bather); scene.add(bather); addEdible(bather, 2.4);
      }

    // SHUTTLE BUGGIES — the island's only traffic, ping-ponging the boardwalk
    for (let i = 0; i < 7; i++) {
      const mesh = makeBuggy();
      let t = (i + 0.5) / 7, d: 1 | -1 = i % 2 === 0 ? 1 : -1;
      const side = i % 2 === 0 ? 1 : -1;
      // the boardwalk narrows at the bends, so a fixed outer lane can hang off
      // the land — resolve the widest lane that is still ON the island, and
      // fall back to the centre line rather than stalling (the buggy that used
      // to bounce forever at the world origin)
      const at = (tt: number): [number, number] | null => {
        const pp = BAY.pathPointAt(BAY.PROMENADE, tt);
        for (const off of [side * 120, side * 60, 0]) {
          const [x, z] = w3([pp.x + Math.cos(pp.ang + Math.PI / 2) * off, pp.y + Math.sin(pp.ang + Math.PI / 2) * off]);
          if (biomeAt(x, z)) return [x, z];
        }
        return null;
      };
      const spd = rand(0.009, 0.015);              // path fraction per second
      const p0 = at(t);
      if (!p0) continue;               // no legal lane at this offset — skip the buggy entirely
      mesh.position.set(p0[0], 0, p0[1]);
      mesh.userData.ptsMult = 1.5; mesh.userData.qk = 'car'; mesh.userData.mover = true;
      mesh.add(contactShadow(2)); setShadow(mesh); scene.add(mesh); addEdible(mesh, 2.6);
      movers.push({
        mesh,
        update(dt, _tm, vx, vz, vR) {
          if (eaten(mesh)) return;
          // the promenade is an OPEN path — bounce at the ends, never wrap
          t += d * spd * dt;
          if (t >= 1) { t = 1; d = -1; } else if (t <= 0) { t = 0; d = 1; }
          const pos = at(t);
          if (!pos) { t = Math.min(1, Math.max(0, t + d * 0.01)); d = (d === 1 ? -1 : 1); return; }
          mesh.position.set(pos[0], 0, pos[1]);
          const hd = BAY.pathPointAt(BAY.PROMENADE, t).ang;
          mesh.rotation.y = Math.atan2(-Math.sin(hd) * d, Math.cos(hd) * d);
          // the void looming makes them floor it toward the far end
          if (Math.hypot(pos[0] - vx, pos[1] - vz) < vR + 26) t += d * spd * dt * 2.2;
        },
      });
    }

    // ══════════════════════════════════════════════════════════════════════
    //  THINGS ON TRACKS
    // ══════════════════════════════════════════════════════════════════════
    // A measured review parked a camera in each district for ten seconds. The
    // busiest frame on the island changed by 3 world-units a second; the bay —
    // 22% of the map, a superyacht, two galleons, five speedboats and four jet
    // skis — contained no moving object at all; the jungle (17%) had five
    // residents; Old Town had three. Nothing on the island was on a track
    // except seven golf buggies.
    //
    // Everything below is on a TRACK: a polyline walked at a fixed rate. A
    // track is the cheapest motion there is — no steering, no collision
    // queries, no per-frame allocation — and it reads from any camera height.

    // (the track kit itself now lives at module scope — see "TRACK KIT"
    // above — because MAPLE FALLS puts a parade, a school bus, a tractor, two
    // dog walkers and a bike gang on exactly the same rails.)

    // ══ 1. ON THE WATER ═══════════════════════════════════════════════════
    // Three circuits, measured offline against BAY.WATER_SMOOTH and the moored
    // fleet: worst shore clearance 153 world units, worst approach to a moored
    // hull 236, and no two circuits ever cross (the tender runs the east and
    // the tow boat's oval sits inside the west, with the jet ski concentric
    // inside that). Everything here sets userData.afloat — without it the
    // off-island sweep in prototype3d.ts deletes the whole fleet.
    const TENDER_RUN = route([[6350, 8800], [7050, 7950], [7200, 6600], [7350, 5400],
      [6950, 4800], [6800, 5900], [6900, 7100]], true);
    const TOW_RUN = ovalRoute(6350, 6650, 350, 1450, 20);
    const SKI_RUN = ovalRoute(6350, 6650, 180, 750, 14);

    const boat = (mesh: THREE.Object3D, r: number, rt: Route, spd: number, t0: number,
                  sink: number, roll = 0.05, onTick?: (dt: number, tm: number) => void) => {
      let t = t0;
      routeAt(rt, t);
      mesh.position.set(W3(_rp.x), -sink, W3(_rp.y));
      mesh.rotation.y = -_rp.ang;
      mesh.userData.afloat = true;      // exempt from the off-island cull
      mesh.userData.mover = true;       // steers itself: the magnet must not grab it
      mesh.userData.ptsMult = 1.5;
      setShadow(mesh); scene.add(mesh); addEdible(mesh, r);
      movers.push({
        mesh,
        update(dt, tm, vx, vz, vR) {
          if (eaten(mesh)) return;
          // a void on the water makes them open the throttle
          const close = Math.hypot(mesh.position.x - vx, mesh.position.z - vz) < vR + 34;
          t += spd * dt * (close ? 2.6 : 1);
          routeAt(rt, t);
          mesh.position.set(W3(_rp.x), -sink + Math.sin(tm * 1.9 + t * 40) * 0.07, W3(_rp.y));
          mesh.rotation.y = -_rp.ang;
          mesh.rotation.z = Math.sin(tm * 1.4 + t * 26) * roll;
          if (onTick) onTick(dt, tm);
        },
      });
      return mesh;
    };
    const crew = (host: THREE.Object3D, role: Role, x: number, y: number, z: number) => {
      const p = makeCast(role, 'resort');
      p.position.set(x, y, z); p.rotation.y = FACE_X;
      host.add(p);
      return p;
    };

    // THE TENDER — the six o'clock run the docks keep talking about. Calls at
    // the two southern pier heads, loops back up the middle of the bay.
    {
      const tender = LUXE.makeSpeedboat();
      tender.add(makeWake(1.6, 9));
      crew(tender, 'dock', -0.6, 2.05, 0);                 // the helmsman, at the wheel
      crew(tender, 'rich', -2.4, 1.5, 0.7);
      crew(tender, 'guest', -2.8, 1.5, -0.7);
      boat(tender, 2.8, TENDER_RUN, 0.021, 0.1, 0.3);
    }
    // THE TOW BOAT + PARASAIL — one guest, 400 feet of nylon and a very long
    // invoice. The canopy hangs off the stern as a child, so it tracks the
    // boat for free and costs nothing per frame but its own sway.
    {
      const tow = LUXE.makeSpeedboat();
      tow.add(makeWake(1.8, 11));
      crew(tow, 'dock', -0.6, 2.05, 0);
      const rig = makeParasailCanopy();
      rig.position.set(-7.6, 7.4, 0);
      const flyer = crew(rig, 'guest', 0, -1.3, 0);
      posed(flyer, -2.55, -2.55, 0.22, 0.28);
      (flyer.userData.limbs as Limbs).la.rotation.z = 0.42;
      (flyer.userData.limbs as Limbs).ra.rotation.z = -0.42;
      tow.add(rig);
      boat(tow, 2.8, TOW_RUN, 0.03, 0.42, 0.32, 0.07, (_dt, tm) => {
        rig.rotation.z = Math.sin(tm * 0.7) * 0.09;        // the canopy swings
        rig.position.y = 7.4 + Math.sin(tm * 0.55) * 0.55;
      });
    }
    // THE JET SKI — tight laps inside the tow boat's oval, banking into them.
    {
      const ski = LUXE.makeJetSki();
      ski.add(makeWake(1.0, 5.5));
      posed(crew(ski, 'guest', -0.3, 1.35, 0), -1.2, -1.2, 0.5, 0.5);
      boat(ski, 1.8, SKI_RUN, 0.055, 0.7, 0.22, 0.16);
    }

    // ══ 2. THE JUNGLE ═════════════════════════════════════════════════════
    // 17% of the island, five residents, and an ambient pool promising a
    // zipline and a waterfall that did not exist. Both exist now.

    // a static prop, placed in WORLD coords, refused if it isn't on land
    const prop = (mesh: THREE.Object3D, wx: number, wy: number, r: number, rotY = 0) => {
      if (!BAY.onBayLand(wx, wy)) return null;
      mesh.position.set(W3(wx), 0, W3(wy));
      mesh.rotation.y = rotY;
      setShadow(mesh); scene.add(mesh); addEdible(mesh, r);
      return mesh;
    };

    // THE GUIDED WALK — "the guided walk is at ten". A guide with a flag and
    // five guests strung out behind on BAY.TRAIL, ping-ponging the jungle
    // stretch of it. The leader is driven by the track; the rest follow the
    // person in front, exactly like the duck parade.
    {
      const TOUR: BAY.Pt[] = [];
      for (let i = 0; i <= 10; i++) {
        const q = BAY.pathPointAt(BAY.TRAIL, 0.24 + (0.7 - 0.24) * (i / 10));
        TOUR.push([q.x, q.y]);
      }
      const TOUR_RUN = route(TOUR, false);
      const line: THREE.Object3D[] = [];
      for (let i = 0; i < 6; i++) {
        routeAt(TOUR_RUN, i === 0 ? 0.02 : 0);
        const p = makeCast(i === 0 ? 'manager' : i === 4 ? 'kid' : 'guest', 'jungle');
        if (i === 4) p.userData.dancer = { t: rand(0, 6), spin: 1, mode: 2 };
        // tether 200: the tour walks a long way from where it started and the
        // leash must never argue with the track
        const rec = addWanderer(p, W3(_rp.x) + rand(-1, 1), W3(_rp.y) + rand(-1, 1),
          200, rand(2.4, 3.4), 18, i === 4 ? 1.9 : 2.4, 'jungle', undefined,
          i === 0 ? 'manager' : undefined);
        if (rec) line.push(rec.mesh);
      }
      if (line.length) {
        const guide = line[0];
        let tt = 0;
        movers.push({
          mesh: guide,
          update(dt, _tm, vx, vz, vR) {
            if (eaten(guide)) return;
            if (Math.hypot(guide.position.x - vx, guide.position.z - vz) < vR + 22) return;
            tt += dt * 0.028;
            routeAt(TOUR_RUN, bounce(tt) * 0.999);
            const nx = W3(_rp.x), nz = W3(_rp.y);
            const dx = nx - guide.position.x, dz = nz - guide.position.z;
            guide.position.x = nx; guide.position.z = nz;
            if (dx || dz) guide.rotation.y = -Math.atan2(dz, dx) + Math.PI / 2;
          },
        });
        for (let i = 1; i < line.length; i++) {
          const lead = line[i - 1], me = line[i];
          movers.push({
            mesh: me,
            update(dt, _tm, vx, vz, vR) {
              if (eaten(me) || eaten(lead)) return;
              if (Math.hypot(me.position.x - vx, me.position.z - vz) < vR + 22) return;  // scatter
              const dx = lead.position.x - me.position.x, dz = lead.position.z - me.position.z;
              const d = Math.hypot(dx, dz);
              if (d > 2.6) {
                const step = Math.min(d - 2.4, 7 * dt);
                me.position.x += (dx / d) * step; me.position.z += (dz / d) * step;
                me.rotation.y = -Math.atan2(dz, dx) + Math.PI / 2;
              }
            },
          });
        }
      }
    }

    // MONKEYS IN THE CANOPY — "that is NOT a monkey!!" needed a monkey. Ten of
    // them, swinging along a short arc six to nine units up. They come in
    // TROOPS clustered on the trail, plus a few loners deeper in, because a
    // troop reads as a place and an even dusting reads as noise.
    const MONKEYS: [number, number][] = [];
    for (const [gx, gy] of [[3960, 5250], [3560, 5820], [4380, 4560]] as [number, number][])
      for (const p2 of BAY.clusterAt(gx, gy, 2, 320, Math.random, 25)) MONKEYS.push(w3(p2));
    for (const p2 of spread('jungle', 4, 30)) MONKEYS.push(p2);
    for (const [x, z] of MONKEYS) {
      const m = makeMonkey();
      const y0 = rand(6.2, 9.0), sw = rand(1.6, 3.2), sp = rand(0.5, 0.95), ph = rand(0, 6.3);
      const face = rand(0, Math.PI * 2);
      m.position.set(x, y0, z);
      m.userData.mover = true; m.userData.ptsMult = 1.5;
      setShadow(m); scene.add(m); addEdible(m, 1.3);
      movers.push({
        mesh: m,
        update(dt, tm, vx, vz, vR) {
          if (eaten(m)) return;
          const s = Math.sin(tm * sp + ph);
          // a void underneath sends them straight up into the top branches
          const scared = Math.hypot(m.position.x - vx, m.position.z - vz) < vR + 20;
          m.position.x = x + Math.cos(face) * s * sw;
          m.position.z = z + Math.sin(face) * s * sw;
          m.position.y = (scared ? y0 + 2.4 : y0) + Math.abs(Math.cos(tm * sp + ph)) * 0.9;
          m.rotation.y = -face + Math.PI / 2 + s * 0.5;
          m.rotation.z = -s * 0.5;
          if (scared) m.rotation.y += dt * 6;
        },
      });
    }

    // THE ZIPLINE — promised by the ambient pool, now real: two towers over
    // the trail and a rider who launches, screams down the cable, and climbs
    // back up to do it again.
    {
      // both towers sit 180+ world units off BAY.TRAIL, so the cable crosses
      // the path overhead instead of standing in it
      const A: BAY.Pt = [4760, 4740], B: BAY.Pt = [3560, 5460];
      if (BAY.onBayLand(A[0], A[1]) && BAY.onBayLand(B[0], B[1])) {
        const ax = W3(A[0]), az = W3(A[1]), bx = W3(B[0]), bz = W3(B[1]);
        const len = Math.hypot(bx - ax, bz - az), ang = Math.atan2(bz - az, bx - ax);
        const zl = makeZipline(len, 3.2);
        zl.position.set(ax, 0, az); zl.rotation.y = -ang;
        setShadow(zl); scene.add(zl); addEdible(zl, 4);
        const flier = makeCast('guest', 'jungle');
        posed(flier, -2.7, -2.7, 0.3, 0.5);
        flier.rotation.y = -ang + Math.PI / 2;
        flier.userData.mover = true; flier.userData.ptsMult = 1.5;
        setShadow(flier); scene.add(flier); addEdible(flier, 2.2);
        const L = flier.userData.limbs as Limbs;
        let u = 0;
        movers.push({
          mesh: flier,
          update(dt) {
            if (eaten(flier)) return;
            u += dt * (u < 1 ? 0.22 : 0.1);               // fast down the wire, slow walk back
            if (u >= 2) u = 0;
            if (u < 1) {                                   // riding: hanging off the pulley
              flier.position.set(ax + (bx - ax) * u, 9.2 - 3.2 * u, az + (bz - az) * u);
              flier.rotation.y = -ang + Math.PI / 2;
              L.la.rotation.x = -2.7; L.ra.rotation.x = -2.7;
              L.ll.rotation.x = 0.35; L.rl.rotation.x = 0.55;
            } else {                                       // trudging back up the trail
              const k = 2 - u;
              flier.position.set(ax + (bx - ax) * k, 0, az + (bz - az) * k);
              flier.rotation.y = -ang - Math.PI / 2;
              const sw = Math.sin(u * 14) * 0.5;
              L.la.rotation.x = -sw; L.ra.rotation.x = sw;
              L.ll.rotation.x = sw; L.rl.rotation.x = -sw;
            }
          },
        });
      }
    }

    // THE WATERFALL — "is that a waterfall??" / "it ate the waterfall!!". Three
    // sheets falling on a loop, which is the only part of it that moves.
    {
      const wf = makeWaterfall();
      // 320 world units off the trail: you HEAR it from the path and walk to it
      if (prop(wf.grp, 3477, 6366, 5, 0.9)) {
        const sheets = wf.sheets;
        movers.push({
          mesh: wf.grp,
          update(dt, tm) {
            if (eaten(wf.grp)) return;
            for (let i = 0; i < sheets.length; i++) {
              const k = ((tm * 0.55 + i / sheets.length) % 1);
              sheets[i].position.set(3.2, 8.4 - k * 7.6, 0);
              sheets[i].scale.set(1 + k * 0.35, 1, 1 + k * 0.5);
            }
          },
        });
      }
    }
    // …and a few more people who live out here, so the jungle is not just a
    // tour walking through an empty one. Half of them are scattered across the
    // whole region, half kept in the middle where the district reads from.
    for (const [x, z] of spread('jungle', 5, 40))
      place(pick(['guest', 'guest', 'grounds', 'kid', 'digger'] as Role[]), 'jungle', x, z, 'jungle');
    for (const p2 of BAY.clusterAt(3760, 5060, 5, 430, Math.random, 40)) {
      const [x, z] = w3(p2);
      place(pick(['guest', 'grounds', 'kid', 'guest'] as Role[]), 'jungle', x, z, 'jungle');
    }
    // (a parrot is seven meshes, not one — three of them, in the one place the
    // district reads from, buys more than eight dusted across the region)
    for (const p2 of BAY.clusterAt(3820, 5180, 3, 400, Math.random, 25)) {
      const [x, z] = w3(p2);
      addWanderer(makeParrot(), x, z, 14, rand(1.8, 3.0), 22, 1.4, 'jungle');
    }

    // ══ 3. OLD TOWN ═══════════════════════════════════════════════════════
    // 51 props, three people, the deadest reading on the island. The resort is
    // somewhere people VISIT; this is somewhere people LIVE, and the
    // difference is that everybody here is doing a job.
    const worker = (role: Role, wx: number, wy: number, face: number, mode = 3) => {
      if (!BAY.onBayLand(wx, wy)) return null;
      const p = makeCast(role, 'market');
      p.userData.dancer = { t: rand(0, 6), spin: 1, mode };
      const rec = addWanderer(p, W3(wx), W3(wy), 1.2, rand(0.15, 0.4), 16, 2.4, 'oldtown',
        undefined, VOICE_OF[role]);
      if (rec) rec.mesh.rotation.y = face;
      return rec;
    };
    // THE NETS — two spread on the ground with three villagers over them
    for (const [nx, ny, rot] of [[6280, 2750, 0.5], [6120, 2880, -0.8]] as [number, number, number][]) {
      prop(makeNet(), nx, ny, 2.2, rot);
      worker('dock', nx + 70, ny + 30, -2.2);
      if (nx > 6200) worker('dock', nx - 40, ny + 80, -0.8);
    }
    // THE WELL — one drawing water, one waiting with a jar and an opinion
    prop(makeWell(), 5800, 2350, 2.4);
    worker('grounds', 5860, 2420, -2.4);
    worker('guest', 5720, 2420, 1.2, 3);
    // THE KIDS — a running loop through the village. Nothing says "people live
    // here" like children who are absolutely not supposed to be doing that.
    {
      const KID_RUN = ovalRoute(5950, 2360, 470, 380, 14);
      for (let i = 0; i < 5; i++) {
        const t0 = i / 5 + rand(-0.03, 0.03);
        routeAt(KID_RUN, t0);
        const k = makeCast('kid', 'market');
        k.userData.dancer = { t: rand(0, 6), spin: 1, mode: 2 };
        const rec = addWanderer(k, W3(_rp.x), W3(_rp.y), 200, rand(1, 2), 16, 1.9, 'oldtown', undefined, 'kid');
        if (!rec) continue;
        let t = t0;
        const spd = rand(0.05, 0.075);
        movers.push({
          mesh: rec.mesh,
          update(dt, _tm, vx, vz, vR) {
            const m = rec.mesh;
            if (eaten(m)) return;
            if (Math.hypot(m.position.x - vx, m.position.z - vz) < vR + 22) return;
            t += spd * dt;
            routeAt(KID_RUN, t);
            const nx = W3(_rp.x), nz = W3(_rp.y);
            const dx = nx - m.position.x, dz = nz - m.position.z;
            m.position.x = nx; m.position.z = nz;
            if (dx || dz) m.rotation.y = -Math.atan2(dz, dx) + Math.PI / 2;
          },
        });
      }
    }
    // …and the rest of the village, on a long leash so they actually walk
    // somewhere instead of shuffling around one hut
    for (const [x, z] of spread('oldtown', 8, 45)) {
      const role = pick(['guest', 'guest', 'dock', 'grounds', 'kid', 'pirate'] as Role[]);
      const p = makeCast(role, 'market');
      if (role === 'kid') p.userData.dancer = { t: rand(0, 6), spin: 1, mode: 2 };
      addWanderer(p, x, z, role === 'kid' ? 34 : 30, role === 'kid' ? rand(6, 8.5) : rand(4, 6.5),
        18, role === 'kid' ? 1.9 : 2.4, 'oldtown', undefined, VOICE_OF[role], 24);
    }

    // ══ 4. DANCE COVE ═════════════════════════════════════════════════════
    // 42 movers producing 3.1 u/s, because their whole animation was a
    // 0.34-unit bob (see the dance branch above — it is now a real jump with a
    // lateral sway). And six dialogue lines joked about a conga line.

    // THE CONGA LINE — a closed loop measured against the district: every one
    // of 601 sampled points is on land, it never touches the main stage deck,
    // and the tightest pass to a speaker stack is 3.4 units from its centre
    // (the stack is 1.5 wide). It laps the whole floor in about a minute.
    {
      const CONGA_RUN = ovalRoute(7300, 10660, 580, 95, 18);
      const line: THREE.Object3D[] = [];
      for (let i = 0; i < 10; i++) {
        routeAt(CONGA_RUN, -i * 0.014);
        const p = i === 0 ? makeCast('manager', 'party')
          : makePerson('party', pick([0xff2fa0, 0x2fd8e8, 0xffd23f, 0x9a5cf0, 0x4ef0a0, 0xff8a3a]),
            { glasses: Math.random() < 0.3 });
        p.userData.dancer = { t: rand(0, 6), spin: 1, mode: 4 };
        const rec = addWanderer(p, W3(_rp.x), W3(_rp.y), 200, rand(0.2, 0.5), 20, 2.4, 'party',
          undefined, i === 0 ? 'manager' : undefined);
        if (rec) line.push(rec.mesh);
      }
      if (line.length) {
        const head = line[0];
        let t = 0;
        movers.push({
          mesh: head,
          update(dt, _tm, vx, vz, vR) {
            if (eaten(head)) return;
            const close = Math.hypot(head.position.x - vx, head.position.z - vz) < vR + 26;
            t += dt * (close ? 0.05 : 0.019);       // "conga line — THIS WAY!!"
            routeAt(CONGA_RUN, t);
            const nx = W3(_rp.x), nz = W3(_rp.y);
            const dx = nx - head.position.x, dz = nz - head.position.z;
            head.position.x = nx; head.position.z = nz;
            if (dx || dz) head.rotation.y = -Math.atan2(dz, dx) + Math.PI / 2;
          },
        });
        for (let i = 1; i < line.length; i++) {
          const lead = line[i - 1], me = line[i];
          movers.push({
            mesh: me,
            update(dt) {
              if (eaten(me) || eaten(lead)) return;
              const dx = lead.position.x - me.position.x, dz = lead.position.z - me.position.z;
              const d = Math.hypot(dx, dz);
              if (d > 1.5) {
                const step = Math.min(d - 1.4, 9 * dt);
                me.position.x += (dx / d) * step; me.position.z += (dz / d) * step;
                me.rotation.y = -Math.atan2(dz, dx) + Math.PI / 2;
              }
            },
          });
        }
      }
    }
    // WAITERS working the front rows — a tight circuit between the stage apron
    // and the speaker stacks, trays up. (A wide lap of the district put them
    // through the deck and off the coast; this one is clear of both.)
    {
      const BAR_RUN = ovalRoute(7450, 10600, 300, 70, 12);
      for (let i = 0; i < 3; i++) {
        const t0 = i / 3;
        routeAt(BAR_RUN, t0);
        const wtr = makeCast('waiter', 'party');
        const rec = addWanderer(wtr, W3(_rp.x), W3(_rp.y), 200, rand(0.3, 0.6), 20, 2.4, 'party',
          undefined, 'staff');
        if (!rec) continue;
        (rec.mesh.userData.limbs as Limbs).ra.rotation.x = -1.5;   // tray held high
        (rec.mesh.userData.limbs as Limbs).ra.rotation.z = -0.5;
        let t = t0;
        const spd = rand(0.026, 0.034);
        movers.push({
          mesh: rec.mesh,
          update(dt, _tm, vx, vz, vR) {
            const m = rec.mesh;
            if (eaten(m)) return;
            if (Math.hypot(m.position.x - vx, m.position.z - vz) < vR + 22) return;
            t += spd * dt;
            routeAt(BAR_RUN, t);
            const nx = W3(_rp.x), nz = W3(_rp.y);
            const dx = nx - m.position.x, dz = nz - m.position.z;
            m.position.x = nx; m.position.z = nz;
            if (dx || dz) m.rotation.y = -Math.atan2(dz, dx) + Math.PI / 2;
          },
        });
      }
    }
    // DJ COCONUT, actually ON the decks. The stage is at world [7400,10380],
    // deck top y = 2.85, booth at local z = 0 — so the DJ stands just behind
    // it, facing the crowd (+Z), and never moves off the rig.
    {
      const dj = makeCast('dj', 'party');
      dj.position.set(W3(7400), 2.85, W3(10380) - 2.3);
      dj.userData.mover = true; dj.userData.ptsMult = 2;
      setShadow(dj); scene.add(dj); addEdible(dj, 2.2);
      peds.push({ mesh: dj, biome: 'party', panic: 0, voice: 'staff' });
      const L = dj.userData.limbs as Limbs;
      movers.push({
        mesh: dj,
        update(_dt, tm) {
          if (eaten(dj)) return;
          const beat = tm * 4.4;
          dj.position.y = 2.85 + Math.abs(Math.sin(beat)) * 0.3;
          L.la.rotation.x = -0.85 + Math.sin(beat * 2) * 0.6;      // one hand on the deck
          L.ra.rotation.x = -2.5 + Math.sin(beat) * 0.35;          // the other in the air
          L.ra.rotation.z = -0.55;
          L.ll.rotation.x = Math.sin(beat) * 0.2; L.rl.rotation.x = -Math.sin(beat) * 0.2;
          L.torso.rotation.y = Math.sin(beat) * 0.26;
          L.head.rotation.x = Math.sin(beat) * 0.2;
          dj.rotation.y = Math.sin(beat * 0.5) * 0.25;
        },
      });
    }

    // ══ 5. THE BAY'S SOUTH SHORE ══════════════════════════════════════════
    // Four props, no movers, 0.0 u/s — and it is the first thing a player sees,
    // because the match starts here. It gets a beach club's worth of activity.
    {
      const CX = 6880, CY = 9880;    // the strip between the bay and Dance Cove

      // BEACH VOLLEYBALL — a net, six players and a ball that actually crosses
      // it. The ball is the mover the eye follows.
      const NET_ROT = 0.35;
      prop(makeVolleyNet(), CX, CY, 3, NET_ROT);
      const court = w3([CX, CY]);
      // rotY turns the net's local +Z (its 12-unit span) to (sin,cos); ACROSS
      // the net — which is where the two teams and the ball live — is (cos,-sin)
      const acx = Math.cos(NET_ROT), acz = -Math.sin(NET_ROT);
      const alx = Math.sin(NET_ROT), alz = Math.cos(NET_ROT);
      for (let i = 0; i < 6; i++) {
        const side = i < 3 ? 1 : -1, lat = ((i % 3) - 1) * 4.5, back = side * rand(3.5, 8);
        const ox = acx * back + alx * lat, oz = acz * back + alz * lat;
        const p = makeCast(pick(['guest', 'kid', 'guest', 'rich'] as Role[]), 'beach');
        const rec = addWanderer(p, court[0] + ox, court[1] + oz, 4, rand(1.2, 2.2), 18, 2.2, 'beach');
        if (!rec) continue;
        const ph = rand(0, 6.3), L = rec.mesh.userData.limbs as Limbs;
        movers.push({
          mesh: rec.mesh,
          update(_dt, tm) {
            const m = rec.mesh;
            if (eaten(m)) return;
            const s = Math.sin(tm * 2.2 + ph);
            if (s > 0.86) {                       // the jump-and-swing
              m.position.y = (s - 0.86) * 5.5;
              L.ra.rotation.x = -2.7; L.la.rotation.x = -2.4;
            } else {
              L.ra.rotation.x = -0.5 + s * 0.5; L.la.rotation.x = -0.5 - s * 0.5;
              L.ra.rotation.z = -0.6; L.la.rotation.z = 0.6;
            }
          },
        });
      }
      {
        const ball = new THREE.Group();
        ball.add(mergedProp([
          part(new THREE.SphereGeometry(0.42, 10, 8), 0xf8f6f0),
          part(new THREE.TorusGeometry(0.42, 0.07, 5, 12), 0xffd23f, 0, 0, 0, 0.6),
          part(new THREE.TorusGeometry(0.42, 0.07, 5, 12), 0x4da3ff, 0, 0, 0, 0, 0.9),
        ]));
        ball.position.set(court[0], 3, court[1]);
        ball.userData.mover = true;
        setShadow(ball); scene.add(ball); addEdible(ball, 1);
        const rx = acx * 7, rz = acz * 7;          // the rally crosses the net
        movers.push({
          mesh: ball,
          update(_dt, tm) {
            if (eaten(ball)) return;
            const u = (tm * 0.42) % 2;             // one rally leg per second-ish
            const k = u > 1 ? 2 - u : u;           // over and back
            ball.position.set(court[0] + rx * (k * 2 - 1), 1.2 + Math.sin(k * Math.PI) * 5.2,
              court[1] + rz * (k * 2 - 1));
            ball.rotation.x += 0.11; ball.rotation.z += 0.07;
          },
        });
      }

      // THE PADDLEBOARD LESSON — four boards on the flat water off the shore,
      // an instructor on the sand telling them all to bend their knees.
      const LESSON = route([[6420, 9430], [6640, 9520], [6880, 9560], [6620, 9600], [6400, 9520]], true);
      for (let i = 0; i < 4; i++) {
        const bd = makePaddleboard();
        const std = makeCast(pick(['guest', 'kid', 'rich'] as Role[]), 'beach');
        std.position.set(-0.2, 0.3, 0); std.rotation.y = FACE_X;
        bd.add(std);
        const L = std.userData.limbs as Limbs;
        const ph = rand(0, 6.3);
        boat(bd, 1.6, LESSON, rand(0.02, 0.028), i / 4, -0.08, 0.05, (_dt2, tm) => {
          const s = Math.sin(tm * 1.5 + ph);            // the paddle stroke
          L.ra.rotation.x = -1.1 + s * 0.7; L.la.rotation.x = -1.4 - s * 0.4;
          L.ra.rotation.z = -0.35; L.la.rotation.z = 0.5;
          L.torso.rotation.y = s * 0.24;
        });
      }
      {
        const coach = makeCast('lifeguard', 'beach');
        const c = w3([6700, 9760]);
        const rec = addWanderer(coach, c[0], c[1], 3, rand(0.6, 1.1), 18, 2.4, 'beach', undefined, 'staff');
        if (rec) rec.mesh.userData.dancer = { t: rand(0, 6), spin: 1, mode: 1 };   // arm sweeping the class
      }

      // SWIMMERS at the water's edge — sunk to the chest, crawling up and down
      // the shallows. afloat, because they are legitimately in the bay.
      for (let i = 0; i < 5; i++) {
        const p: BAY.Pt = [6480 + i * 105, 9600 + (i % 2) * 70];
        if (!BAY.pointInPoly(p[0], p[1], BAY.WATER_SMOOTH)) continue;
        const sw = makeCast(pick(['guest', 'kid', 'rich'] as Role[]), 'beach');
        const x0 = W3(p[0]), z0 = W3(p[1]);
        sw.position.set(x0, -1.25, z0);
        sw.rotation.y = rand(0, Math.PI * 2);
        sw.userData.afloat = true; sw.userData.mover = true; sw.userData.ptsMult = 1.5;
        setShadow(sw); scene.add(sw); addEdible(sw, 2);
        const L = sw.userData.limbs as Limbs;
        const ph = rand(0, 6.3), sp = rand(0.35, 0.6);
        const head = rand(0, Math.PI * 2);
        // a swimmer's lane is only as long as the water it is in: shrink the
        // reach until BOTH ends of the lap are still inside the bay polygon
        let reach = rand(2.5, 4.5);
        while (reach > 0.4 && !(
          BAY.pointInPoly(p[0] + Math.cos(head) * reach * 20, p[1] + Math.sin(head) * reach * 20, BAY.WATER_SMOOTH)
          && BAY.pointInPoly(p[0] - Math.cos(head) * reach * 20, p[1] - Math.sin(head) * reach * 20, BAY.WATER_SMOOTH)
        )) reach -= 0.3;
        movers.push({
          mesh: sw,
          update(_dt, tm) {
            if (eaten(sw)) return;
            const s = Math.sin(tm * sp + ph);
            sw.position.set(x0 + Math.cos(head) * s * reach, -1.25 + Math.sin(tm * 2 + ph) * 0.1,
              z0 + Math.sin(head) * s * reach);
            sw.rotation.y = -head + Math.PI / 2 + (s > 0 ? 0 : Math.PI);
            const st = tm * 4 + ph;                       // front crawl
            L.la.rotation.x = -1.6 + Math.sin(st) * 1.5; L.ra.rotation.x = -1.6 - Math.sin(st) * 1.5;
            L.la.rotation.z = 0.5; L.ra.rotation.z = -0.5;
            L.ll.rotation.x = Math.sin(st * 2) * 0.3; L.rl.rotation.x = -Math.sin(st * 2) * 0.3;
          },
        });
      }
      // …and the people who came to watch: towels, kids and a drinks waiter
      for (const [bx, by] of BAY.clusterAt(CX - 120, CY + 60, 7, 380, Math.random, 40)) {
        const role = pick(['guest', 'kid', 'rich', 'kid', 'waiter'] as Role[]);
        const [x, z] = w3([bx, by]);
        place(role, 'beach', x, z, 'beach');
      }
    }
  }

  // ══ GAME DAY — THE MARSTON CROWD ═══════════════════════════════════════
  // The thing that makes this level look unlike the other two is that the
  // crowd has a DIRECTION. Nobody here is milling: every single person is
  // oriented on the bowl, because that is where they are all going. Maple's
  // people face wherever their block faced and Pirate Bay's face the sea from
  // wherever they happen to be, and both read as scatter. This reads as an
  // event.
  //
  // Twelve voices, all of them out of newsroom_gameday: fan, superfan, cheer,
  // band, ref, coach, mascot, cook, student, parent, vendor, steward. They are
  // assigned per district, not globally, so the person you walk past in RV Row
  // is a different person from the one at the gates.
  // ══ LANTERN NIGHT: the market's spirits ═════════════════════════════════
  // A market is its crowd. GAME DAY's lesson applies twice over here — "it
  // feels empty" is the failure mode a night market invites hardest, because
  // the lanterns imply somebody lit them.
  if (worldId() === 'lantern') {
    const lnRegion = (id: LN.LnBiome) => LN.LN_REGIONS.find((r) => r.id === id)!;
    // island.ts renames three of lantern.ts's districts on the way out, and
    // biomeAt returns the RENAMED id under a person's feet — which is what
    // OUTFIT, the greet/ambient/panic pools and the flee test all key on.
    const DRESS: Record<LN.LnBiome, string> = {
      gate: 'torii', stalls: 'stalls', canal: 'canal', teahouse: 'teahouse',
      shrine: 'shrine', bridge: 'moonbridge', garden: 'nightgarden',
      bathhouse: 'bathhouse', onsen: 'onsen', bamboo: 'bamboo',
    };
    const lnPlace = (wx: number, wy: number, id: LN.LnBiome,
                     o?: { kid?: boolean; tether?: number; speed?: number; leg?: number }) => {
      const dress = DRESS[id];
      const p = o?.kid ? makeCast('kid', dress) : makePerson(dress);
      const [x, z] = g3([wx, wy]);
      // SLOW, for the same reason GAME DAY's crowd is slow and then some. A
      // fleeing ped runs at base x 3.4; at market density that is a ring of
      // people holding station just off the void's rim, and the void chasing
      // whichever is nearest oscillates in a cleared box. It is worse here
      // because for the first act they are walking TOWARD the player — a fast
      // approach reads as a charge, and this is somebody crossing a market to
      // offer you a skewer.
      addWanderer(p, x, z, o?.tether ?? 7, o?.speed ?? rand(0.35, 0.95),
        16, o?.kid ? 1.9 : 2.4, dress, undefined, undefined,
        // the stall pitch is 230 world units = 11.5 in 3D, so a 20-unit leg is
        // two stalls down the row. 1.3x pace against a 3.4x flee and a 2.4x
        // contagion ping: the void still outranks a shopper 2.6 times over.
        o?.leg ?? 20, 1.3);
    };

    // Density per district, in people. LANTERN ROW carries the level.
    const LN_CAST: [LN.LnBiome, number, number][] = [
      ['stalls', 260, 20],       // the market street: the whole point
      ['canal', 60, 24],         // wading, poling boats, floating lanterns
      ['gate', 56, 26],          // arriving, counting the torii
      ['shrine', 100, 22],       // attendants and pilgrims on the steps
      ['teahouse', 90, 24],      // the terrace, seated and serving
      ['bridge', 60, 22],        // everybody stops on the bridge
      ['garden', 40, 30],        // a few, quietly
      ['bathhouse', 130, 24],    // staff on the terrace, guests arriving
      ['onsen', 34, 32],         // bathers, and nobody in a hurry
    ];
    for (const [id, n, clear] of LN_CAST) {
      const r = lnRegion(id);
      if (!r) continue;
      const pts = LN.scatterInRegion(r, n, Math.random, clear);
      for (const [wx, wy] of pts) {
        // a fifth of the market crowd is a child, because a festival is where
        // children are, and a small fast silhouette among slow tall ones is
        // what stops a crowd reading as wallpaper
        lnPlace(wx, wy, id, { kid: Math.random() < 0.2 });
      }
    }
    // THE VALLEY WALL had NOBODY on it, and not by decision — 'bamboo' is not
    // a polygon in LN_REGIONS, it is the fallback everything outside a district
    // falls back TO, so lnRegion('bamboo') returned undefined and the loop
    // above quietly skipped it. A quarter of the map, zero spirits, no error.
    // The census found it; the compiler could not have.
    //
    // They are placed by distance-to-edge instead, and they are the last few
    // arrivals still coming down the path — so they walk with a purpose and a
    // long tether rather than milling.
    {
      for (const [wx, wy] of LN.scatterLand(70, Math.random, 40, [0, 620])) {
        lnPlace(wx, wy, 'bamboo', { tether: 26, speed: rand(0.6, 1.2),
          kid: Math.random() < 0.22 });
      }
    }
    // …and the stallholders themselves, one behind each stall, rooted. These
    // are the spirits who do the greeting, so they stand where the player will
    // actually drive past them.
    {
      const slots = LN.stallSlots(Math.random, 230, 30);
      for (const sl of slots) {
        // just BEHIND the counter, on the far side from the water
        const bx = sl.x + Math.cos(sl.ang + Math.PI) * 46;
        const by = sl.y + Math.sin(sl.ang + Math.PI) * 46;
        lnPlace(bx, by, 'stalls', { tether: 2.2, speed: rand(0.1, 0.3) });
      }
    }
  }

  // ══ POWDER PASS: a valley on a snow day ═══════════════════════════════════
  // The crowd is DELIBERATELY modest — ~360 people against Lantern's ~970,
  // because the perf budget (AAA-BRIEF §7) caps a new world at Game Day's
  // frame bill and the movers here (skaters, sledders, the lift) are more
  // visible per head than a market crowd. Nearly half are children: it is a
  // snow day, that is who is out.
  if (worldId() === 'powder') {
    const pwRegion = (id: PW.PwBiome) => PW.PW_REGIONS.find((r) => r.id === id)!;
    const pwPlace = (wx: number, wy: number, id: PW.PwBiome,
                     o?: { kid?: boolean; tether?: number; speed?: number; leg?: number }) => {
      const p = o?.kid ? makeCast('kid', id) : makePerson(id);
      const [x, z] = g3([wx, wy]);
      addWanderer(p, x, z, o?.tether ?? 9, o?.speed ?? rand(0.8, 1.6),
        16, o?.kid ? 1.9 : 2.4, id, undefined, undefined, o?.leg ?? 24, 1.15);
    };
    const PW_CAST: [PW.PwBiome, number, number][] = [
      ['village', 90, 20],     // the square, the road, everyone's front step
      ['lake', 105, 22],       // the lake carries the level — skaters below too
      ['pinewood', 26, 30],    // a few walkers under the pines
      ['piste', 68, 24],       // the sled queue and the sledding
      ['lodge', 38, 24],       // arrivals, cocoa-holders
    ];
    for (const [id, n, clear] of PW_CAST) {
      const r = pwRegion(id);
      if (!r) continue;
      for (const [wx, wy] of PW.scatterInRegion(r, n, Math.random, clear))
        pwPlace(wx, wy, id, { kid: Math.random() < 0.45 });
    }
    // the HIGH SHOULDER is the rim band, not a polygon (powder.ts's own note:
    // never scatterInRegion into it) — stragglers coming down for the day
    for (const [wx, wy] of PW.scatterLand(30, Math.random, 40, [0, 600]))
      pwPlace(wx, wy, 'rim', { tether: 26, speed: rand(1.0, 1.8), kid: Math.random() < 0.3 });

    // ── SKATERS: the lake's signature. They LOOP — long oval orbits at real
    // speed, which against the stagger's usual amble is what makes the ice
    // read as ice from the first frame.
    for (let i = 0; i < 10; i++) {
      const p = i % 2 ? makeCast('kid', 'lake') : makePerson('lake');
      const a0 = rand(0, Math.PI * 2);
      const orx = PW.LAKE.rx * rand(0.3, 0.72), ory = PW.LAKE.ry * rand(0.3, 0.72);
      const spd2 = rand(0.5, 0.9);
      const [cx3, cz3] = g3([PW.LAKE.cx, PW.LAKE.cy]);
      let a = a0;
      p.userData.mover = true;
      const [sx, sz] = g3([PW.LAKE.cx + Math.cos(a0) * orx, PW.LAKE.cy + Math.sin(a0) * ory]);
      p.position.set(sx, 0, sz);
      scene.add(p); addEdible(p, 0.62);
      movers.push({ mesh: p, fast: true, update(dt2, _tm, vx, vz, vR) {
        if (eaten(p)) return;
        // skate away from the void when it looms; otherwise carve the oval
        const dx2 = p.position.x - vx, dz2 = p.position.z - vz;
        if (Math.hypot(dx2, dz2) < vR + 9) { a += dt2 * spd2 * 2.2; } else a += dt2 * spd2;
        const tx = cx3 + Math.cos(a) * orx * 0.05 * 20, tz = cz3 + Math.sin(a) * ory * 0.05 * 20;
        p.position.x += (tx - p.position.x) * Math.min(1, dt2 * 3.2);
        p.position.z += (tz - p.position.z) * Math.min(1, dt2 * 3.2);
        p.rotation.y = -a;
      } });
    }

    // ── OLD BESS, the gritter, on her route — named in the sticker book,
    // mentioned by the radio, and the biggest ordinary meal on the road
    {
      const bess = AL.makeGritter();
      bess.userData.mover = true; bess.userData.qk = 'gritter'; bess.userData.ptsMult = 1.5;
      let t = 0.3, d = 1;
      const at = (tt: number) => PW.pathPointAt(PW.GRIT, tt);
      const p0 = at(t); const [bx, bz] = g3([p0.x, p0.y]);
      bess.position.set(bx, 0, bz);
      scene.add(bess); addEdible(bess, 2.6);
      movers.push({ mesh: bess, update(dt2, _tm, vx, vz, vR) {
        if (eaten(bess)) return;
        // the road is OPEN — bounce at the ends, never wrap (the buggy lesson)
        t += d * 0.02 * dt2;
        if (t >= 1) { t = 1; d = -1; } else if (t <= 0) { t = 0; d = 1; }
        const pp = at(t);
        const [x3, z3] = g3([pp.x, pp.y]);
        bess.position.set(x3, 0, z3);
        bess.rotation.y = -pp.ang + (d < 0 ? Math.PI : 0);
        // the void looming makes her floor it for the far end
        if (Math.hypot(x3 - vx, z3 - vz) < vR + 22) t += d * 0.02 * dt2 * 2.0;
      } });
    }
    // ── THE LIFT: chairs riding the cable up the Home Run and back. The
    // pylons are placed by island.ts; the chairs are movers on the same
    // authored line, seated at cable height (alpine.ts hangs the chair from
    // its grip — sink 2.9 per its doc comment).
    for (let i = 0; i < 6; i++) {
      const chair = AL.makeLiftChair();
      const dir = i % 2 ? 1 : -1;          // alternate directions = both cables
      let t = (i / 6) % 1;
      chair.userData.mover = true; chair.userData.qk = 'lift';
      scene.add(chair); addEdible(chair, 1.1);
      movers.push({ mesh: chair, fast: true, update(dt2) {
        if (eaten(chair)) return;
        t += dir * dt2 * 0.016;
        if (t > 1) t -= 1; if (t < 0) t += 1;
        const pp = PW.pistePoint(t);
        const [x3, z3] = g3([pp.x, pp.y]);
        // offset each cable to its own side of the pylon crossarm
        const side = dir * 1.6;
        chair.position.set(x3 + Math.cos(pp.ang + Math.PI / 2) * side * 0.05 * 20, 5.8 - 2.9, z3 + Math.sin(pp.ang + Math.PI / 2) * side * 0.05 * 20);
        chair.rotation.y = -pp.ang + (dir < 0 ? Math.PI : 0);
      } });
    }
    // ── SLEDDERS: kids bombing the Home Run top to bottom, forever. The
    // downhill leg is fast and the walk back up is slow, which is the whole
    // rhythm of a sledding hill compressed into a loop.
    for (let i = 0; i < 6; i++) {
      const sled = AL.makeSled();
      const kid = makeCast('kid', 'piste');
      kid.position.y = 0.32; sled.add(kid);
      let t = rand(0.1, 0.9); let downhill = Math.random() < 0.7;
      const lane = rand(-140, 140);
      sled.userData.mover = true; sled.userData.qk = 'sledkid';
      scene.add(sled); addEdible(sled, 0.85);
      movers.push({ mesh: sled, fast: true, update(dt2) {
        if (eaten(sled)) return;
        t += (downhill ? 1 : -1) * dt2 * (downhill ? 0.045 : 0.012);
        if (t >= 0.98) { t = 0.98; downhill = false; }
        if (t <= 0.04) { t = 0.04; downhill = true; }
        const pp = PW.pistePoint(t);
        const [x3, z3] = g3([pp.x + Math.cos(pp.ang + Math.PI / 2) * lane, pp.y + Math.sin(pp.ang + Math.PI / 2) * lane]);
        sled.position.set(x3, 0, z3);
        sled.rotation.y = -pp.ang + (downhill ? 0 : Math.PI);
      } });
    }

    // ── THE AVALANCHE — the finale cue. The mountain lets go and the piste
    // delivers: a stream of giant snowballs rides down the Home Run for the
    // last act, each one edible, each one worth eating. The only finale in
    // the game where the food comes to the player.
    {
      const balls: { m: THREE.Object3D; t: number; lane: number; spd: number; on: boolean }[] = [];
      let armed = false;
      cues.push((n) => {
        if (n !== 'avalanche' || armed) return;
        armed = true;
        for (let i = 0; i < 22; i++) {
          const r = rand(0.8, 2.2);
          const m = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8),
            new THREE.MeshStandardMaterial({ color: 0xf4f7ff, roughness: 0.9 }));
          m.userData.mover = true; m.userData.qk = 'snowball'; m.userData.ptsMult = 1.4;
          const pp = PW.pistePoint(0.02);
          const [x3, z3] = g3([pp.x, pp.y]);
          m.position.set(x3, r, z3);
          scene.add(m); addEdible(m, r);
          balls.push({ m, t: 0.02 - i * 0.035, lane: rand(-220, 220), spd: rand(0.05, 0.075), on: true });
        }
      });
      movers.push({ mesh: null as unknown as THREE.Object3D, update(dt2) {
        if (!armed) return;
        for (const b of balls) {
          if (!b.on || eaten(b.m)) continue;
          b.t += dt2 * b.spd;
          if (b.t < 0.02) continue;          // staggered release off the top
          if (b.t >= 1) { b.on = false; b.m.visible = false; continue; }
          const pp = PW.pistePoint(b.t);
          const [x3, z3] = g3([pp.x + Math.cos(pp.ang + Math.PI / 2) * b.lane, pp.y + Math.sin(pp.ang + Math.PI / 2) * b.lane]);
          b.m.position.set(x3, b.m.position.y, z3);
          b.m.rotation.x += dt2 * 4;
        }
      } });
    }
  }

  if (worldId() === 'gameday') {
    const gdRegion = (id: GD.GdBiome) => GD.GD_REGIONS.find((r) => r.id === id)!;
    // island.ts renames three districts on the way out; `dress` and the AMBIENT
    // fallback are keyed on the RENAMED ids, because that is what biomeAt
    // returns under a person's feet.
    const DRESS: Record<GD.GdBiome, string> = {
      bowl: 'bowl', plaza: 'gate', lot: 'lot', rvpark: 'rvpark',
      greek: 'greek', campus: 'quad', practice: 'practice', woods: 'treeline',
    };
    /** Place one person, facing the stadium. `voice` is a newsroom_gameday key. */
    const gdPlace = (wx: number, wy: number, id: GD.GdBiome, voice: string,
                     o?: { kid?: boolean; tether?: number; speed?: number; col?: number; leg?: number }) => {
      const dress = DRESS[id];
      const p = o?.kid
        ? makeCast('kid', dress)
        : makePerson(dress, o?.col, { hat: Math.random() < 0.6 ? 'cap' : undefined });
      const [x, z] = g3([wx, wy]);
      // SPEED IS A TRAP HERE, AND I WALKED INTO IT. A fleeing ped runs at
      // base x 3.4, and this district holds four hundred of them. At base
      // 2.4-4.4 they flee at 8-15, which is close enough to the void's own
      // world speed that a RING forms: everyone within the fear radius runs
      // outward at once and holds station about eight units off the rim, and
      // the void chases whichever is nearest, turns as the next one becomes
      // nearest, and oscillates in a cleared twenty-unit box. Measured: 45
      // seconds of a 180-second match with the score frozen at 59,773 and the
      // void moving the whole time.
      //
      // Maple's grid crowd walks at 0.15-0.45 and has never done this. These
      // are people standing around a car park with a plate of food, so slow is
      // also the correct READ — the earlier numbers had a tailgate power-
      // walking in circles.
      const rec = addWanderer(p, x, z,
        o?.tether ?? (o?.kid ? 14 : 10),
        o?.speed ?? (o?.kid ? rand(1.6, 2.6) : rand(0.5, 1.4)),
        18, o?.kid ? 1.9 : 2.4, dress, undefined, voice,
        // LOT_AISLE is 340 world = 17 in 3D, so a leg is one aisle and a row.
        // A site that authors a tight tether can write `leg: 0` beside it and
        // keep its box — see the lot crowd at tether 5.
        o?.leg ?? 22, 1.25);
      // EVERYONE FACES THE BOWL. gdFacingStadium is a world-space bearing and
      // the mesh's forward is +X, so the sign flips going into 3D — the same
      // conversion the car headings use.
      if (rec) rec.mesh.rotation.y = -GD.gdFacingStadium(wx, wy) + Math.PI / 2;
      return rec;
    };
    // per-district cast lists. Counts are deliberately front-loaded onto the
    // lot and the gates: those are the two districts a player spends the first
    // sixty seconds in, and "it feels empty" is the complaint this level is
    // most exposed to (see docs/GAMEDAY.md §1).
    const GD_CAST: [GD.GdBiome, [string, number][], number][] = [
      // THE TAILGATE — the hero district. Cooks at the grills, families
      // between the rows, students who have been here since eight in the
      // morning, and a mascot doing the rounds.
      ['lot', [['fan', 26], ['cook', 8], ['parent', 7], ['student', 9],
               ['superfan', 4], ['vendor', 3], ['mascot', 1]], 34],
      // GATE PLAZA — queues, stewards on the barriers, vendors working the line
      ['plaza', [['fan', 18], ['steward', 6], ['vendor', 5], ['parent', 4],
                 ['student', 4], ['superfan', 3], ['cheer', 2]], 30],
      // RV ROW — people who arrived on Wednesday. Older, slower, settled in.
      ['rvpark', [['fan', 12], ['cook', 4], ['parent', 4], ['vendor', 2]], 38],
      // FRAT ROW — students, and the loudest people on the plateau
      ['greek', [['student', 14], ['superfan', 4], ['fan', 4], ['band', 2]], 30],
      // OLD CAMPUS — the quiet one. Students crossing, a few families.
      ['campus', [['student', 9], ['parent', 4], ['fan', 4], ['band', 3]], 34],
      // PRACTICE FIELD — the team's own ground: coaches, refs, the band
      ['practice', [['coach', 3], ['ref', 3], ['band', 6], ['cheer', 4], ['fan', 4]], 32],
      // THE STADIUM — the concourse ring and the gates into it
      ['bowl', [['fan', 12], ['steward', 4], ['cheer', 4], ['superfan', 3], ['vendor', 2]], 30],
      // THE TREE LINE — the walk-in crowd, thinning out
      ['woods', [['fan', 7], ['parent', 4], ['student', 3]], 44],
    ];
    for (const [id, roles, clear] of GD_CAST) {
      let total = 0; for (const r of roles) total += r[1];
      const pts = GD.scatterInRegion(gdRegion(id), total, Math.random, clear);
      let i = 0;
      for (const [voice, n] of roles) for (let k = 0; k < n && i < pts.length; k++, i++) {
        // a quarter of the 'parent' slots come with an actual child, which is
        // what makes a family read as a family rather than two adults
        const kid = voice === 'parent' && Math.random() < 0.45;
        gdPlace(pts[i][0], pts[i][1], id, kid ? 'fan' : voice, { kid });
      }
    }

    // THE PARTY IN THE AISLES. The lot's rows are 340 apart and 120 of that is
    // metal; the remaining 220 is where the tailgate actually happens. Sizing
    // the district off the vehicles alone gave a lot that was nose-to-tail and
    // completely lifeless between them, so this fills the aisles explicitly
    // rather than trusting a scatter to find the gaps.
    for (const row of GD.LOT_ROWS) {
      const dx = row.b[0] - row.a[0], dy = row.b[1] - row.a[1];
      const len = Math.hypot(dx, dy) || 1;
      const ux = dx / len, uy = dy / len, nx = -uy, ny = ux;
      const off = GD.LOT_AISLE * 0.5;
      for (let d = 220; d < len - 220; d += rand(150, 260)) {
        const wx = row.a[0] + ux * d + nx * (off + rand(-70, 70));
        const wy = row.a[1] + uy * d + ny * (off + rand(-70, 70));
        if (!GD.gdPlaceable(wx, wy, 22)) continue;
        const roll = Math.random();
        const voice = roll < 0.44 ? 'fan' : roll < 0.62 ? 'cook' : roll < 0.78 ? 'student'
          : roll < 0.90 ? 'parent' : 'superfan';
        // short tether, low speed: these people are STANDING AROUND A GRILL,
        // not commuting. It is the same trick the dance floor uses at the
        // resort, for the opposite feeling.
        gdPlace(wx, wy, 'lot', voice, { tether: 5, speed: rand(0.3, 0.8), leg: 0 });
      }
    }

    // THE WALK-UP. A steady file of people coming off the lot, through the
    // gates, into the bowl — the one thing on the plateau that is visibly
    // GOING somewhere. Strung along the spawn-to-stadium sightline, which is
    // dead straight by construction (see gameday.ts's GD_SPAWN note).
    for (let i = 0; i < 26; i++) {
      const t = i / 26;
      const wy = 9600 - t * 4300;                       // lot → plaza → concourse
      const wx = 5950 + Math.sin(i * 1.7) * (260 + t * 520);
      if (!GD.gdPlaceable(wx, wy, 20)) continue;
      const id: GD.GdBiome = wy > 6350 ? 'lot' : wy > 4900 ? 'plaza' : 'bowl';
      const roll = Math.random();
      // the walk-up and the concourse are the two groups that are visibly
      // GOING somewhere, so they keep a walk — but a walk, not a jog: base
      // 1.5 flees at 5.1, which the void outruns at every size.
      gdPlace(wx, wy, id, roll < 0.55 ? 'fan' : roll < 0.75 ? 'student' : roll < 0.9 ? 'parent' : 'superfan',
        { tether: 22, speed: rand(1.2, 1.9) });
    }

    // THE CONCOURSE RING. People circling the bowl, evenly spread, so the ring
    // road reads as used rather than as a painted stripe.
    for (let i = 0; i < 22; i++) {
      const pp = GD.pathPointAt(GD.CONCOURSE, i / 22 + rand(-0.012, 0.012));
      const off = rand(-GD.CONCOURSE_HALF * 0.7, GD.CONCOURSE_HALF * 0.7);
      const wx = pp.x + Math.cos(pp.ang + Math.PI / 2) * off;
      const wy = pp.y + Math.sin(pp.ang + Math.PI / 2) * off;
      const roll = Math.random();
      gdPlace(wx, wy, 'bowl', roll < 0.5 ? 'fan' : roll < 0.7 ? 'vendor' : roll < 0.85 ? 'steward' : 'superfan',
        { tether: 20, speed: rand(1.1, 1.8) });
    }

    // ══ THE BAND TAKES THE FIELD — when its BEAT says so ═══════════════════
    // Beat 2's banner is "The band is on the field!" and until now nothing
    // entered anything: the band existed as a parked kit prop and two campus
    // wanderers. This is Maple's one-mover column driver on the bowl's own
    // concourse ring: a drum major and eight shako plumes assembled at the
    // gate, motionless, until the 'bandfield' cue fires — then the column
    // marches the ring for the rest of the match, eatable like everybody
    // else. Positions are written every frame even while parked, or the
    // wanderers underneath would dissolve the formation.
    {
      const COLUMN2 = ['cheer', 'bandkid', 'bandkid', 'bandkid', 'bandkid',
        'bandkid', 'bandkid', 'bandkid', 'bandkid'] as const;
      const T0 = 0.5;              // the gate — the south mouth of the ring
      const TSP = 0.011;           // rank spacing along the ring
      const at3 = (t: number): [number, number] => {
        const pp = GD.pathPointAt(GD.CONCOURSE, ((t % 1) + 1) % 1);
        return g3([pp.x, pp.y]);
      };
      const bandM: THREE.Object3D[] = [];
      for (let i = 0; i < COLUMN2.length; i++) {
        const [x, z] = at3(T0 - i * TSP);
        const p = makeCast(COLUMN2[i], DRESS.bowl);
        p.name = `bandCol${i}`;   // QA handle: the beat probe asserts the column moves
        const rec = addWanderer(p, x, z, 400, rand(0.6, 1.1), 18, 2.4, DRESS.bowl,
          undefined, COLUMN2[i] === 'cheer' ? 'cheer' : 'band');
        if (rec) bandM.push(rec.mesh);
      }
      if (bandM.length) {
        let bt = T0, marching = false;
        cues.push((n) => {
          if (n === 'bandfield') marching = true;
          else if (n === 'match') { marching = false; bt = T0; }
        });
        movers.push({
          mesh: bandM[0],
          update(dt, _tm, vx, vz, vR) {
            // 0.006/s measured out at ~2.7 u/s on this ring — a march, not
            // the 5.5 u/s jog the first dial produced
            if (marching) bt += dt * 0.006;
            for (let i = 0; i < bandM.length; i++) {
              const m = bandM[i];
              if (eaten(m)) continue;
              // a marcher the void has reached drops out and runs — their
              // wanderer already has the panic, we simply stop steering them
              if (Math.hypot(m.position.x - vx, m.position.z - vz) < vR + 20) continue;
              const [x, z] = at3(bt - i * TSP);
              const [xa, za] = at3(bt - i * TSP + 0.004);
              const dx = xa - x, dz = za - z;
              m.position.x = x; m.position.z = z;
              if (dx || dz) m.rotation.y = -Math.atan2(dz, dx) + Math.PI / 2;
            }
          },
        });
      }
    }
  }

  // pond ducks — "the ducks are rowdy" is finally TRUE, and they PARADE:
  // ducks 1-3 tail duck 0 in the classic line
  const duckLine: THREE.Object3D[] = [];
  for (let i = 0; i < (worldId() === 'maple' ? 4 : 0); i++) {
    const duck = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), sharedMat(i % 2 ? 0xf6f2da : 0xffd54f, 0.9));
    body.scale.set(1.25, 0.85, 1); body.position.y = 0.36; duck.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), sharedMat(i % 2 ? 0x7ed57a : 0xf6f2da, 0.9));
    head.position.set(0.42, 0.78, 0); duck.add(head);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.26, 6), sharedMat(0xff9a3a, 0.8));
    beak.rotation.z = -Math.PI / 2; beak.position.set(0.68, 0.75, 0); duck.add(beak);
    const rec = addWanderer(duck, 128.25 + rand(-9, 9), -33.15 + rand(-9, 9), 11, rand(1.5, 2.5), 20, 1.2, 'park');
    if (rec) duckLine.push(rec.mesh);
    if (i > 0 && duckLine.length === i + 1) {
      const leader = duckLine[i - 1], me = duckLine[i];
      movers.push({ mesh: me, update(dt) {
        if (eaten(me) || eaten(leader)) return;
        const dx2 = leader.position.x - me.position.x, dz2 = leader.position.z - me.position.z;
        const d2 = Math.hypot(dx2, dz2);
        if (d2 > 2.5) { me.position.x += (dx2 / d2) * Math.min(d2 - 2.2, 3.2 * dt * 2); me.position.z += (dz2 / d2) * Math.min(d2 - 2.2, 3.2 * dt * 2); me.rotation.y = -Math.atan2(dz2, dx2) + Math.PI / 2; }
      } });
    }
  }

  // birds: a couple of small flocks, high up and out of the way
  for (let f = 0; f < 2; f++) {
    // flock centres must be over LAND — a gull circling the open sea is
    // unreachable food and reads as a bug from the top-down camera
    let cx = 0, cz = 0;
    for (let k = 0; k < 200; k++) { cx = rand(-180, 180); cz = rand(-180, 180); if (biomeAt(cx, cz)) break; }
    const fly = rand(26, 34);
    for (let i = 0; i < 3; i++) {
      const mesh = makeBird();
      let ang = rand(0, Math.PI * 2);
      mesh.userData.mover = true;
      mesh.position.set(cx + rand(-10, 10), fly, cz + rand(-10, 10)); setShadow(mesh); scene.add(mesh); addEdible(mesh, 2);
      movers.push({
        mesh,
        update(dt, t, vx, vz, vR) {
          if (eaten(mesh)) return;
          const dx = mesh.position.x - vx, dz = mesh.position.z - vz;
          if (Math.hypot(dx, dz) < vR + 40) { ang = Math.atan2(dz, dx); mesh.position.x += Math.cos(ang) * 26 * dt; mesh.position.z += Math.sin(ang) * 26 * dt; }
          else { ang += rand(-1, 1) * dt * 2; if (Math.hypot(mesh.position.x - cx, mesh.position.z - cz) > 40) ang = Math.atan2(cz - mesh.position.z, cx - mesh.position.x); mesh.position.x += Math.cos(ang) * 10 * dt; mesh.position.z += Math.sin(ang) * 10 * dt; }
          // …and they turn back the moment they drift out over open water
          if (!biomeAt(mesh.position.x, mesh.position.z)) { ang = Math.atan2(cz - mesh.position.z, cx - mesh.position.x); mesh.position.x += Math.cos(ang) * 18 * dt; mesh.position.z += Math.sin(ang) * 18 * dt; }
          mesh.position.y = fly + Math.sin(t * 3 + i) * 1.5;
          mesh.rotation.y = -ang + Math.PI / 2;
          const flap = 0.5 + Math.sin(t * 14 + i) * 0.5;
          mesh.children.forEach((c, ci) => { if (ci > 0) c.rotation.x = flap; });
        },
      });
    }
  }

  // ── the train ─────────────────────────────────────────────────────────────
  const CAR_GAP = 0.011;   // cars actually COUPLE (was 18u of daylight between them)
  let trainGrp: THREE.Group | null = null, trainCars: THREE.Group[] = [], trainT = 0, respawn = 0;
  function buildTrain() {
    const grp = new THREE.Group(); scene.add(grp);
    const cars: THREE.Group[] = [];
    for (let i = 0; i < 4; i++) { const c = makeLoco(i === 0); c.add(contactShadow(3)); grp.add(c); cars.push(c); }
    grp.userData.mover = true;
    // Put it ON THE RAIL before registering it. addEdible() snapshots `home`
    // from the current position, and this used to register at (0,0,0) — which
    // resetMatch() then treated as the train's surveyed home, i.e. the central
    // crossroads. Choose the loop position first so the snapshot is somewhere
    // the train can legitimately be.
    trainT = rand(0, 1);
    const lead0 = railPointAt(trainT);
    grp.position.set(lead0.x, 0, lead0.z);
    setShadow(grp); addEdible(grp, 5.4); trainGrp = grp; trainCars = cars;
  }
  if (worldId() === 'maple') buildTrain();   // no commuter rail at a resort or a stadium
  movers.push({
    get mesh() { return trainGrp!; },
    update(dt) {
      if (!trainGrp) return;
      // Retire the swallowed group before replacing it. It stays in the
      // edibles array — there is no removal path — so it has to be marked, or
      // resetMatch() restores it as a second, frozen train. See the guard there.
      if (eaten(trainGrp)) { respawn += dt; if (respawn > 6) {
        respawn = 0; trainGrp.userData.retired = true; trainGrp = null; buildTrain(); } return; }
      trainT = (trainT + dt * 0.02) % 1;
      const lead = railPointAt(trainT);
      trainGrp.position.set(lead.x, 0, lead.z);
      // -π/2: rail angle is +Z-forward, the loco model's nose is +X
      for (let i = 0; i < trainCars.length; i++) { const p = railPointAt(trainT - i * CAR_GAP); trainCars[i].position.set(p.x - lead.x, 0, p.z - lead.z); trainCars[i].rotation.y = p.angle - Math.PI / 2; }
    },
  } as Mover);

  // ── staged VIGNETTE EVENTS ──────────────────────────────────────────────────
  interface Ev { x: number; z: number; ambient: string[]; panic: string[]; cd: number; panicked: number; }
  const events: Ev[] = [];

  function addEvent(gx: number, gy: number, ambient: string[], panic: string[], build: (x: number, z: number) => void, pedN: number, pedCol?: number) {
    // Maple Isle's staged vignettes (the mayor's rally, the farmers market,
    // the ball game) are that island's fiction. Running them at a pirate
    // resort put "MY STARTUP!!" and "no new voids" on the dance floor.
    if (worldId() !== 'maple') return;
    const [x, z] = blockCenter3D(gx, gy);
    const evBiome = biomeKey(PLAN_GRID[gy][gx]);
    build(x, z);
    for (let i = 0; i < pedN; i++) addWanderer(makePerson(evBiome, pedCol), x + rand(-14, 14), z + rand(-14, 14), 16, rand(3, 5), 18, 2.4, 'generic', panic);
    events.push({ x, z, ambient, panic, cd: rand(1, 4), panicked: 0 });
  }


  // ══ PIRATE BAY vignettes ═══════════════════════════════════════════════
  // Three staged scenes anchored on real district geography (not block
  // centres — there is no grid here), each with its own crowd and voice, so
  // the resort has beats the way Maple Isle has its rally and its ball game.
  if (worldId() === 'pirate') {
    // every vignette is RUN by somebody: an event manager stands at the front
    // of it with a clipboard and a headset, gesturing, on their own voice pool.
    // The crowd is a mix of guests and kids so the bubbles are not one note.
    const addPB = (wx: number, wy: number, dress: string, dance: boolean,
                   amb: string[], pan: string[], n: number, col?: number, extra?: Role[]) => {
      const [x, z] = w3([wx, wy]);
      for (let i = 0; i < n; i++) {
        const p2 = makePerson(dress, col, { glasses: Math.random() < 0.3 });
        if (dance) p2.userData.dancer = { t: rand(0, 6), spin: Math.random() < 0.5 ? 1 : -1 };
        addWanderer(p2, x + rand(-14, 14), z + rand(-14, 14), dance ? 3 : 13,
          dance ? rand(0.3, 0.8) : rand(2.5, 4.5), 22, 2.4, 'generic', pan);
      }
      // the compere, plus whoever else this particular bit needs
      for (const role of ['manager', ...(extra ?? [])] as Role[]) {
        const p3 = makeCast(role, dress);
        if (role === 'kid') p3.userData.dancer = { t: rand(0, 6), spin: 1, mode: 2 };
        else if (role === 'manager') p3.userData.dancer = { t: rand(0, 6), spin: 1, mode: 1 };
        addWanderer(p3, x + rand(-10, 10), z + rand(-10, 10),
          role === 'manager' ? 2 : 14,
          role === 'manager' ? rand(0.2, 0.5) : role === 'kid' ? rand(6.5, 9) : rand(2.5, 4.5),
          22, role === 'kid' ? 1.9 : 2.4, dress, undefined, VOICE_OF[role]);
      }
      events.push({ x, z, ambient: amb, panic: pan, cd: rand(1, 4), panicked: 0 });
    };
    // THE DJ SET — dead centre of Dance Cove, the biggest crowd on the island
    addPB(7420, 10480, 'party', true,
      ['DJ COCONUT! DJ COCONUT!', 'DROP IT!! DROP THE THING!!', 'my legs have quit. still dancing.',
        'this is the BEST song', 'one more!! ONE MORE!!', 'I love everyone here',
        'the foam machine is ARMED', 'conga at half past! be there!'],
      ['THE DJ IS GONE!!', 'save the SPEAKERS!!', 'conga OUT!! conga OUT!!', 'the beat has DROPPED. us.',
        'that was NOT in the setlist!!'],
      11, 0xff2fa0, ['dj', 'kid', 'waiter']);
    // THE MARKET HAGGLE — the Bazaar, traders and a very rude parrot
    addPB(5580, 4600, 'market', false,
      ['final price! FINAL price!', 'the parrot called me a name', 'mango so good it is illegal',
        'genuine pirate gold, probably', 'two for one! one for two!',
        'hand-woven. by a very fast man.', 'that shell costs HOW much'],
      ['MY MANGOES!! MY LIFE!!', 'take the stall!! LEAVE the stall!!', 'the parrot KNEW',
        'everything half price!! GO!!'],
      7, 0xffd23f, ['pirate', 'kid']);
    // THE TREASURE DIG — Smugglers Cove, everyone sure X marks right here
    addPB(2380, 6360, 'cove', false,
      ['X marks... hang on', 'I felt something! it was a crab', 'DIG! we are SO close!',
        'my detector only loves bottlecaps', 'the map is upside down, isn\'t it',
        'the resort buried this. probably.'],
      ['LEAVE THE TREASURE!!', 'the crabs were a WARNING', 'RUN! bring the shovel!!',
        'X marked US. bad map.'],
      6, 0xffb054, ['digger', 'kid', 'kid']);
    // THE DOCKSIDE ARGUMENT — a galleon's crew, mid-loading, mid-row
    addPB(7420, 3080, 'port', false,
      ['that crate goes STARBOARD', 'we are NOT sailing tonight', 'the captain is asleep. again.',
        'count the barrels. COUNT THEM.', 'she is seaworthy. mostly.',
        'nine suitcases for ONE guest', 'the galleon is a photo booth'],
      ['ABANDON THE DOCK!!', 'save the CARGO!! ALL of it!!', 'cut the ropes!! CUT THEM!!',
        'the tender!! LAUNCH THE TENDER!!'],
      7, 0x4dd0e1, ['pirate', 'dock', 'rich']);
    // THE GRAND POOL — the flagship vignette: rich guests being waited on hand
    // and foot, and one event manager insisting it is Coconut Hour
    addPB(9200, 5400, 'resort', false,
      ['is this the QUIET pool?', 'my lounger has a sea view. barely.',
        'the towel swan lost a wing', 'four straws. FOUR.', 'they know my order. obviously.',
        'the water is 28 degrees exactly', 'someone brought a BALL in here'],
      ['MY LOUNGER!! MY TOWEL!!', 'the pool has GONE!!', 'refund the whole WEEK!!',
        'grab the smoothies, leave the bags'],
      4, undefined, ['rich', 'robe', 'waiter', 'kid', 'bellhop']);
  }

  // ══ GAME DAY vignettes ═════════════════════════════════════════════════
  // Six staged scenes on real district geography. Every one is a thing a child
  // would recognise from a Saturday: a grill, a game of cornhole, a band
  // warming up, a queue, a mascot with a crowd of kids around him, and the
  // team walking in. Same house style as the booth — proper sentences, no
  // politics, nothing that reads as two sides against each other.
  if (worldId() === 'gameday') {
    const addGD = (wx: number, wy: number, id: GD.GdBiome, voice: string,
                   amb: string[], pan: string[], n: number, spread = 15,
                   opts?: { kids?: number; still?: boolean }) => {
      const DRESS: Record<GD.GdBiome, string> = {
        bowl: 'bowl', plaza: 'gate', lot: 'lot', rvpark: 'rvpark',
        greek: 'greek', campus: 'quad', practice: 'practice', woods: 'treeline',
      };
      const dress = DRESS[id];
      const [x, z] = g3([wx, wy]);
      const put = (mesh: THREE.Object3D, ox: number, oz: number, kid: boolean) => {
        const rec = addWanderer(mesh, x + ox, z + oz,
          opts?.still ? 4 : 11, opts?.still ? rand(0.25, 0.7) : kid ? rand(1.6, 2.6) : rand(0.5, 1.3),
          20, kid ? 1.9 : 2.4, dress, pan, voice);
        // faces the bowl, like everybody else on the plateau
        if (rec) rec.mesh.rotation.y = -GD.gdFacingStadium(wx, wy) + Math.PI / 2;
      };
      for (let i = 0; i < n; i++)
        put(makePerson(dress, undefined, { hat: Math.random() < 0.6 ? 'cap' : undefined }),
          rand(-spread, spread), rand(-spread, spread), false);
      for (let i = 0; i < (opts?.kids ?? 0); i++)
        put(makeCast('kid', dress), rand(-spread, spread), rand(-spread, spread), true);
      events.push({ x, z, ambient: amb, panic: pan, cd: rand(1, 4), panicked: 0 });
    };

    // THE BIG GRILL — dead centre of the lot, three aisles up from the spawn.
    // The flagship vignette: this is the one the player opens next to.
    addGD(5950, 8300, 'lot', 'cook',
      ['Twenty minutes. Not a second less.', 'Who ordered the big one?',
        'Two racks on, four to go.', 'The secret is the rub. That is it.',
        'Do not lift the lid. I mean it.', 'There is enough for everybody.',
        'Somebody find me the long tongs.', 'This grill has been to nine states.'],
      ['Grill is off! Grill is OFF!', 'Take the food! Take all of it!',
        'Move the propane! MOVE IT!', 'Twenty minutes wasted!',
        'Everybody back! Back up the row!'],
      7, 14, { kids: 2 });

    // CORNHOLE — two boards, a small crowd, and one person who is very good
    addGD(5300, 8900, 'lot', 'student',
      ['Best of five. Come on then.', 'That was in. That was clearly in.',
        'Four bags each. Keep up.', 'She has not missed all morning.',
        'Winners stay on. House rules.', 'One more and we are square.'],
      ['Leave the boards! Just go!', 'Game over! GAME OVER!',
        'Grab the bags! No, leave them!', 'Up the row! Everybody!'],
      6, 12, { kids: 2 });

    // THE BAND WARMING UP — behind the practice field, out of sight of the
    // bowl, which is exactly where a marching band actually warms up.
    addGD(3300, 4200, 'practice', 'band',
      ['From the top. Bar sixteen.', 'Brass, you are ahead. Watch me.',
        'Sixteen minutes until we walk.', 'My valves froze. Genuinely froze.',
        'Drumline, hold the tempo there.', 'Hats on when we step off.',
        'One more run and we go.'],
      ['Keep playing! KEEP PLAYING!', 'Instruments up! Everybody move!',
        'Off the field! Now! Go!', 'Drumline, follow me! Follow me!'],
      9, 16);

    // THE QUEUE AT GATE C — stewards on the barrier, a line that moves
    addGD(6100, 5600, 'plaza', 'steward',
      ['Have your bags open, please.', 'Gate C is moving. Keep coming.',
        'Tickets ready. Screens bright.', 'No bottles through here, sorry.',
        'Straight down and to the left.', 'Plenty of time. Plenty of time.'],
      ['Everybody out! Away from the gate!', 'Leave the bags! Walk! Walk!',
        'This way! Follow me! This way!', 'Do not run! Please do not run!'],
      8, 18, { kids: 3 });

    // BUCKLEY. The mascot never speaks — in character, a mascot cannot — so
    // his pool is what he DOES, and the children around him do the talking.
    addGD(6600, 6050, 'plaza', 'mascot',
      ['Buckley is here! BUCKLEY!', 'He waved at me. At ME.',
        'He signed my programme somehow.', 'How does he see out of that?',
        'Buckley does the dance! Do it!', 'He is taller in person.'],
      ['Buckley, RUN! Buckley!', 'Somebody get the kids!',
        'Follow Buckley! He knows a way!', 'Hold hands! Everybody hold on!'],
      4, 12, { kids: 6 });

    // THE TEAM WALK — coaches and officials coming up the concourse. The one
    // vignette north of the gates, so there is something to find up there.
    addGD(5930, 4700, 'bowl', 'coach',
      ['Same walk, every home game.', 'Heads up. Look at that crowd.',
        'Warm-ups in eleven minutes.', 'Watch the step coming in.',
        'That is a good noise, that.', 'Straight down the tunnel, all of you.'],
      ['Down the tunnel! Everybody!', 'Clear the concourse! Clear it!',
        'Get them off the field!', 'Move! Keep them moving!'],
      6, 14);

    // THE PORCH — Frat Row, the loudest fifty feet on the plateau
    addGD(8250, 8600, 'greek', 'student',
      ['The whole street is out here.', 'That banner took us all night.',
        'Pancakes since nine this morning.', 'Somebody get him off the roof.',
        'We walk down together at two.', 'Turn it up. A bit. A BIT.'],
      ['Off the roof! GET DOWN!', 'Everybody off the porch!',
        'Down the street! Go! Go!', 'Leave it! Just leave it!'],
      8, 16);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  MAPLE FALLS — THINGS ON TRACKS, AND THE SCENES THEY RUN PAST
  // ══════════════════════════════════════════════════════════════════════════
  // The same measurement that drove the Pirate Bay work: a district with no
  // moving object in it reads as unfinished no matter how many props it has.
  // Maple starts ahead of Pirate — it has a road grid and thirty cars — but its
  // PEOPLE stood about. Everything below is either on a TRACK (a polyline
  // walked at a fixed rate: no steering, no collision queries, no per-frame
  // allocation) or is a staged scene with people doing a specific thing in it.
  if (worldId() === 'maple') {
    // a closed loop that FITS: shrink until every sampled point is on land, so
    // a re-zoned or coast-clipped block degrades to a smaller circuit instead
    // of walking a jogger into the sea
    const fitOval = (cx: number, cz: number, rx: number, rz: number): Route | null => {
      for (let k = 0; k < 9; k++) {
        const r = ovalRoute(cx, cz, rx, rz, 16);
        let ok = true;
        for (const p of r.p) if (!biomeAt(p[0], p[1]) || inLagoon3(p[0], p[1], 6)) { ok = false; break; }
        if (ok) return r;
        rx *= 0.82; rz *= 0.82;
      }
      return null;
    };
    // an OPEN route between two points is only usable if the whole line is dry —
    // two dry endpoints on a lakeside block can still have the lagoon between
    // them, which is how a child ends up jogging across open water
    const dryLine = (ax: number, az: number, bx: number, bz: number): Route | null => {
      const r = route([[ax, az], [bx, bz]], false);
      for (let k = 0; k <= 14; k++) {
        routeAt(r, (k / 14) * 0.999);
        if (!biomeAt(_rp.x, _rp.y) || inLagoon3(_rp.x, _rp.y, 8)) return null;
      }
      return r;
    };
    // put an object on a route. People hand control back to their wanderer when
    // the void closes in (so they scatter); vehicles floor it instead.
    const onTrack = (mesh: THREE.Object3D, rt: Route, spd: number, t0: number,
                     veh: boolean, scare = 22, boost = 1): void => {
      let t = t0;
      routeAt(rt, t);
      mesh.position.x = _rp.x; mesh.position.z = _rp.y;
      movers.push({
        mesh,
        update(dt, _tm, vx, vz, vR) {
          if (eaten(mesh)) return;
          const close = Math.hypot(mesh.position.x - vx, mesh.position.z - vz) < vR + scare;
          if (close && boost <= 1) return;
          t += spd * dt * (close ? boost : 1);
          routeAt(rt, t);
          const nx = _rp.x, nz = _rp.y;
          const dx = nx - mesh.position.x, dz = nz - mesh.position.z;
          mesh.position.x = nx; mesh.position.z = nz;
          if (dx || dz) mesh.rotation.y = veh ? Math.atan2(-dz, dx) : -Math.atan2(dz, dx) + Math.PI / 2;
        },
      });
    };
    // a vehicle that is not on the road grid — the tractor in its own field
    const trackVehicle = (mesh: THREE.Object3D, r: number, rt: Route, spd: number, t0: number) => {
      mesh.userData.ptsMult = 1.5; mesh.userData.qk = 'car'; mesh.userData.mover = true;
      mesh.add(contactShadow(r * 0.7));
      setShadow(mesh); scene.add(mesh); addEdible(mesh, r);
      onTrack(mesh, rt, spd, t0, true, 26, 2.2);
      return mesh;
    };
    // B follows A at `gap` units — the dog on the lead, the tail of a line
    const follow = (lead: THREE.Object3D, me: THREE.Object3D, gap: number, spd: number, veh: boolean) => {
      movers.push({
        mesh: me,
        update(dt) {
          if (eaten(me) || eaten(lead)) return;
          const dx = lead.position.x - me.position.x, dz = lead.position.z - me.position.z;
          const d = Math.hypot(dx, dz);
          if (d > gap) {
            const step = Math.min(d - gap * 0.92, spd * dt);
            me.position.x += (dx / d) * step; me.position.z += (dz / d) * step;
            me.rotation.y = veh ? Math.atan2(-dz, dx) : -Math.atan2(dz, dx) + Math.PI / 2;
          }
        },
      });
    };
    // nearest DRY point to (x,z) — on the island and out of the lagoon. The
    // lakeside block's centre is inside the lagoon ellipse, so anything staged
    // there has to walk itself onto the sand first.
    const dryNear = (x: number, z: number, span: number): [number, number] | null => {
      for (let k = 0; k < 28; k++) {
        const a = k === 0 ? 0 : rand(0, Math.PI * 2), d = (k / 28) * span;
        const px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d;
        if (biomeAt(px, pz) && !inLagoon3(px, pz, 22)) return [px, pz];
      }
      return null;
    };
    // a block centre for a zone, WITHOUT claiming it for a vignette
    const zoneCentre = (z: MZone, ...fb: MZone[]): { x: number; z: number; gx: number; gy: number; dress: string; side: number } | null => {
      for (const want of [z, ...fb]) {
        const list = zoneBlocks.get(want);
        if (!list || !list.length) continue;
        const [gx, gy] = pick(list);
        const [x, cz] = blockCenter3D(gx, gy);
        return { x, z: cz, gx, gy, dress: biomeIdAt(gx, gy), side: sideOf(gx, gy) };
      }
      return null;
    };

    // ══ 1. THE PARADE ══════════════════════════════════════════════════════
    // Maple Falls will hold a parade for anything, and both campaigns have
    // entered a float. It marches a REAL STREET: the road-span table the cars
    // drive on is the single authority for how far a road runs on-island, so
    // the parade route is guaranteed to be pavement from end to end.
    {
      let best: { axis: 'h' | 'v'; centre: number; sp: [number, number] } | null = null;
      let bestScore = -1;
      for (const s of spanList) {
        const mid = (s.sp[0] + s.sp[1]) / 2;
        const mx = s.axis === 'h' ? mid : s.centre, mz = s.axis === 'h' ? s.centre : mid;
        const b = biomeAt(mx, mz);
        const z = b ? (ZONE_OF[String(b)] ?? 'burb') : 'burb';
        // length, WEIGHTED by whether this is a street the town would actually
        // close. A multiplier not a bonus: a long road through the pine woods
        // can out-score a short Main Street on raw length, and a parade
        // marching through empty forest is the one place it must not be.
        const w = z === 'main' ? 3.0 : z === 'civic' ? 2.6 : z === 'strip' ? 1.9
          : z === 'burb' ? 1.3 : z === 'fair' ? 1.2 : 0.45;
        const score = (s.sp[1] - s.sp[0]) * w;
        if (score > bestScore) { bestScore = score; best = s; }
      }
      if (best) {
        const OFF = -LANE;                       // one lane; the other stays open for traffic
        const a0 = best.sp[0] + EDGE_M + 4, a1 = best.sp[1] - EDGE_M - 4;
        const pt0: BAY.Pt = best.axis === 'h' ? [a0, best.centre + OFF] : [best.centre + OFF, a0];
        const pt1: BAY.Pt = best.axis === 'h' ? [a1, best.centre + OFF] : [best.centre + OFF, a1];
        const PARADE = route([pt0, pt1], false);
        // lateral is constant on an axis-aligned street — no per-frame trig
        const latX = best.axis === 'h' ? 0 : 1, latZ = best.axis === 'h' ? 1 : 0;
        const dressP = String(biomeAt(pt0[0], pt0[1]) ?? 'downtown');
        const SPACING = 3.0 / PARADE.len;        // three units between ranks
        const marchers: THREE.Object3D[] = [];
        const rankOf: number[] = [], latOf: number[] = [];
        // rank 0: the drum major (a campaigner, waving, both camps furious
        // about who got the front). Then band, then cheer, then the kids.
        const COLUMN: Role[] = ['campaigner', 'bandkid', 'bandkid', 'bandkid', 'bandkid',
          'cheer', 'cheer', 'bandkid', 'bandkid', 'kid', 'kid', 'booster'];
        for (let i = 0; i < COLUMN.length; i++) {
          const rank = Math.floor((i + 1) / 2);
          const lat = i === 0 ? 0 : (i % 2 === 1 ? -1.05 : 1.05);
          routeAt(PARADE, bounce(-rank * SPACING) * 0.999);
          // alternate the two camps down the column so the parade is visibly
          // BIPARTISAN and visibly annoyed about it
          const p = makeCast(COLUMN[i], dressP, i % 2 === 0 ? DINKLE : HOLLIS);
          if (COLUMN[i] === 'kid') p.userData.dancer = { t: rand(0, 6), spin: 1, mode: 2 };
          const rec = addWanderer(p, _rp.x + latX * lat, _rp.y + latZ * lat,
            400, rand(0.6, 1.1), 18, COLUMN[i] === 'kid' ? 1.9 : 2.4, dressP,
            undefined, VOICE_OF[COLUMN[i]]);
          if (!rec) continue;
          marchers.push(rec.mesh); rankOf.push(rank); latOf.push(lat);
        }
        if (marchers.length) {
          let pt = 0;
          const PSPD = 0.022;
          // THE PARADE WAITS FOR ITS BEAT. It used to march from 0:00, so the
          // 110s "Town parade!" banner announced something that had been
          // happening the whole match — the beat was an echo, not an event.
          // Until the cue fires the column stands assembled at the end of the
          // street (positions still written every frame, or the wanderers
          // underneath would wander the formation apart), and when the banner
          // goes up the street visibly starts to march under it.
          let paradeGo = false;
          cues.push((n) => {
            if (n === 'parade') paradeGo = true;
            else if (n === 'match') { paradeGo = false; pt = 0; }
          });
          // ONE mover drives the whole column — twelve people for the price of
          // one update, and no follow chain to concertina at the turnaround
          movers.push({
            mesh: marchers[0],
            update(dt, _tm, vx, vz, vR) {
              if (paradeGo) pt += dt * PSPD;
              for (let i = 0; i < marchers.length; i++) {
                const m = marchers[i];
                if (eaten(m)) continue;
                // a marcher the void has reached drops out and runs: their
                // wanderer already has the panic, we simply stop steering them
                if (Math.hypot(m.position.x - vx, m.position.z - vz) < vR + 20) continue;
                routeAt(PARADE, bounce(pt - rankOf[i] * SPACING) * 0.999);
                const nx = _rp.x + latX * latOf[i], nz = _rp.y + latZ * latOf[i];
                const dx = nx - m.position.x, dz = nz - m.position.z;
                m.position.x = nx; m.position.z = nz;
                if (dx || dz) m.rotation.y = -Math.atan2(dz, dx) + Math.PI / 2;
              }
            },
          });
          // …and the crowd that came out to watch it, on both kerbs
          for (let i = 0; i < 8; i++) {
            routeAt(PARADE, 0.18 + 0.64 * (i / 7));
            const side2 = i % 2 === 0 ? 4.6 : -4.6;
            townie(pick(['gossip', 'kid', 'booster', 'teen'] as Role[]),
              _rp.x + latX * side2, _rp.y + latZ * side2, dressP,
              i % 2 === 0 ? DINKLE : HOLLIS, 4, rand(0.5, 1.2));
          }
          events.push({
            x: (pt0[0] + pt1[0]) / 2, z: (pt0[1] + pt1[1]) / 2,
            ambient: ['the parade! IT IS THE PARADE!', 'band, keep your ranks!',
              'that float is just a truck', 'both campaigns entered. of course.',
              'we do this for everything', 'the twine ball is on the truck',
              'candy! they throw CANDY!', 'Pike Hollow has no parade.'],
            panic: ['the parade route is COMPROMISED!!', 'keep marching!! KEEP MARCHING!!',
              'the band is still playing!!', 'save the float!! it is a TRUCK!!'],
            cd: rand(1, 4), panicked: 0,
          });
        }
      }
    }

    // ══ 2. THE SCHOOL BUS ══════════════════════════════════════════════════
    // Inherits the whole road-lane driver — spans, junction arcs, the coast
    // invariant — for one line, because that driver is now shared.
    roadVehicle(makeBus(), 3.6, rand(10, 13));

    // ══ 3. THE TRACTOR ═════════════════════════════════════════════════════
    // The farm was the emptiest district in town: no people at all and nothing
    // moving except cars passing through on the county road.
    {
      const f = zoneCentre('farm', 'woods', 'park');
      if (f) {
        const rt = fitOval(f.x, f.z, HALF_BLOCK_3D * 0.62, HALF_BLOCK_3D * 0.44);
        if (rt) trackVehicle(makeTractor(), 3.0, rt, 0.017, rand(0, 1));
        // …and the farmer walking the fence line behind it
        const rt2 = fitOval(f.x, f.z, HALF_BLOCK_3D * 0.80, HALF_BLOCK_3D * 0.62);
        if (rt2) for (let i = 0; i < 2; i++) {
          routeAt(rt2, i / 2);
          const rec = townie('farmer', _rp.x, _rp.y, f.dress, f.side, 400, rand(0.4, 0.8));
          if (rec) onTrack(rec.mesh, rt2, rand(0.020, 0.028), i / 2, false, 20);
        }
      }
    }

    // ══ 4. THE JOGGER CIRCUIT ══════════════════════════════════════════════
    {
      const p = zoneCentre('park', 'civic', 'burb');
      if (p) {
        const rt = fitOval(p.x, p.z, HALF_BLOCK_3D * 0.68, HALF_BLOCK_3D * 0.52);
        if (rt) for (let i = 0; i < 3; i++) {
          const t0 = i / 3;
          routeAt(rt, t0);
          const rec = townie(pick(['booster', 'teen', 'gossip'] as Role[]), _rp.x, _rp.y,
            p.dress, p.side, 400, rand(0.4, 0.9));
          if (rec) onTrack(rec.mesh, rt, rand(0.038, 0.052), t0, false, 20);
        }
      }
    }

    // ══ 5. THE BIKE GANG ═══════════════════════════════════════════════════
    // Kids doing laps of a residential block, standing on the pedals, going
    // nowhere in particular at speed. The rider is a real cast member parented
    // to the frame, so it eats, animates and pedals like anybody else.
    {
      const b = zoneCentre('burb', 'park', 'main');
      if (b) {
        const rt = fitOval(b.x, b.z, HALF_BLOCK_3D * 0.74, HALF_BLOCK_3D * 0.58);
        if (rt) for (let i = 0; i < 4; i++) {
          const bike = makeBike(pick([DINKLE, HOLLIS, 0xf0c050, 0x58c470]));
          const rider = makeCast('kid', b.dress, i % 2 ? DINKLE : HOLLIS);
          rider.position.set(-0.12, 0.46, 0); rider.rotation.y = FACE_X;
          posed(rider, -1.30, -1.30, 0.42, -0.42);
          const L = rider.userData.limbs as Limbs;
          L.torso.rotation.x = 0.38;
          bike.add(rider);
          bike.userData.ptsMult = 1.5; bike.userData.mover = true;
          bike.add(contactShadow(1.4));
          setShadow(bike); scene.add(bike); addEdible(bike, 1.9);
          const ph = rand(0, 6.3);
          onTrack(bike, rt, rand(0.055, 0.075), i / 4, true, 20, 2.4);
          movers.push({
            mesh: bike,
            update(_dt, tm) {
              if (eaten(bike)) return;
              const s = Math.sin(tm * 7 + ph) * 0.55;      // pedalling
              L.ll.rotation.x = 0.42 + s; L.rl.rotation.x = -0.42 - s;
              L.torso.rotation.y = s * 0.10;
            },
          });
        }
      }
    }

    // ══ 6. THE DOG WALKERS ═════════════════════════════════════════════════
    for (const zoneId of ['burb', 'park'] as MZone[]) {
      const d = zoneCentre(zoneId, 'main', 'burb');
      if (!d) continue;
      const rt = fitOval(d.x, d.z, HALF_BLOCK_3D * 0.66, HALF_BLOCK_3D * 0.5);
      if (!rt) continue;
      routeAt(rt, 0.3);
      const rec = townie('dogwalker', _rp.x, _rp.y, d.dress, d.side, 400, rand(0.4, 0.8));
      if (!rec) continue;
      onTrack(rec.mesh, rt, rand(0.026, 0.034), 0.3, false, 20);
      const dog = makeDog();
      dog.position.set(rec.mesh.position.x + 1.8, 0, rec.mesh.position.z);
      dog.userData.ptsMult = 1.5; dog.userData.mover = true;
      dog.add(contactShadow(0.9));
      setShadow(dog); scene.add(dog); addEdible(dog, 1.2);
      // the dog is AHEAD of the walker, because it always is
      follow(rec.mesh, dog, 2.0, 9, true);
    }

    // ══ 6a. THE FAIR GOAT ══════════════════════════════════════════════════
    // The finale beat is titled "The goat is loose!" and until now the goat
    // was text — a banner, a fair brag, a panic line, and nothing to look at.
    // It is built and registered here, hidden; the 'goat' cue (fired by the
    // finale beat) drops it ~24 units from the void, where it dashes and hops
    // between waypoints for the whole x3 window. It is a mover, it is
    // EDIBLE, and it is gilded — the golden goat is the finale's chase prize.
    {
      const goat = makeGoat();
      const gh = zoneCentre('fair', 'main', 'burb');
      // home on the fairground, NOT the origin: addEdible snapshots home from
      // this position, and an origin home is the parked-locomotive trap the
      // restore loop's own comment documents
      goat.position.set(gh?.x ?? 0, 0, gh?.z ?? 0);
      goat.visible = false;
      goat.userData.mover = true; goat.userData.ptsMult = 2;
      goat.userData.qk = 'goat';
      goat.userData.coin = 25; goat.userData.gild = true;
      goat.add(contactShadow(1.4));
      setShadow(goat); scene.add(goat); addEdible(goat, 1.6);
      let ax = 0, az = 0, tx = 0, tz = 0, dashT = 0, hopT = 0, loose = false;
      const land = (x: number, z: number) => biomeAt(x, z) !== null;
      cues.push((n, cx, cz) => {
        if (n === 'match') { loose = false; goat.visible = false; return; }
        if (n !== 'goat') return;
        const bx = cx ?? goat.position.x, bz = cz ?? goat.position.z;
        for (let i = 0; i < 12; i++) {
          const a = Math.random() * Math.PI * 2, d = 20 + Math.random() * 10;
          const x = bx + Math.cos(a) * d, z = bz + Math.sin(a) * d;
          if (!land(x, z)) continue;
          ax = x; az = z; tx = x; tz = z; dashT = 0;
          goat.position.set(x, 0, z); goat.visible = true; loose = true;
          return;
        }
      });
      movers.push({
        mesh: goat,
        update(dt) {
          if (!loose || eaten(goat)) return;
          dashT -= dt;
          if (dashT <= 0) {
            // a new dash every second or so, anchored to where it got loose —
            // the goat runs AROUND, it does not emigrate
            dashT = 0.9 + rand(0, 1.1);
            for (let i = 0; i < 8; i++) {
              const a = Math.random() * Math.PI * 2, d = 8 + Math.random() * 14;
              const x = ax + Math.cos(a) * d, z = az + Math.sin(a) * d;
              if (land(x, z)) { tx = x; tz = z; break; }
            }
          }
          const dx = tx - goat.position.x, dz = tz - goat.position.z;
          const d = Math.hypot(dx, dz);
          if (d > 0.4) {
            const k = Math.min(1, 8.5 * dt / d);
            goat.position.x += dx * k; goat.position.z += dz * k;
            goat.rotation.y = -Math.atan2(dz, dx);   // nose +X, like the dog
            hopT += dt * 11;
            goat.position.y = Math.abs(Math.sin(hopT)) * 0.55;   // goats bounce
          } else goat.position.y = Math.max(0, goat.position.y - dt * 3);
        },
      });
    }

    // ══ 6b. WORKING THE SQUARE ═════════════════════════════════════════════
    // The town square hosts the stump speech, and a rally is a hundred people
    // standing still — the one shape of crowd that measures as dead. So the
    // square also gets a circuit: two campaign workers walking the perimeter
    // handing out leaflets, and the people trying to get past them.
    {
      const c = zoneCentre('civic', 'main', 'strip');
      if (c) {
        const rt = fitOval(c.x, c.z, HALF_BLOCK_3D * 0.72, HALF_BLOCK_3D * 0.56);
        if (rt) for (let i = 0; i < 5; i++) {
          const t0 = i / 5;
          routeAt(rt, t0);
          const role: Role = i < 2 ? 'campaigner' : i === 2 ? 'mail' : pick(['gossip', 'booster', 'teen'] as Role[]);
          const rec = townie(role, _rp.x, _rp.y, c.dress,
            i % 2 ? DINKLE : HOLLIS, 400, rand(0.4, 0.9));
          if (rec) onTrack(rec.mesh, rt, i < 2 ? rand(0.022, 0.030) : rand(0.034, 0.046), t0, false, 20);
        }
      }
    }

    // ══ 7. THE BOAT PARADE ═════════════════════════════════════════════════
    // "four boats and a canoe. HUGE." — the lakeside district's own dialogue,
    // and it was the only thing in the town that people talked about and could
    // not point at. The lagoon is FOUND by probing inLagoon3 rather than
    // hard-coded, so island.ts can move or resize it without sinking the fleet.
    {
      let lx0 = Infinity, lx1 = -Infinity, lz0 = Infinity, lz1 = -Infinity;
      for (let x = -300; x <= 300; x += 4) for (let z = -300; z <= 300; z += 4)
        if (inLagoon3(x, z, 0)) {
          if (x < lx0) lx0 = x; if (x > lx1) lx1 = x;
          if (z < lz0) lz0 = z; if (z > lz1) lz1 = z;
        }
      if (lx1 > lx0) {
        const cx = (lx0 + lx1) / 2, cz = (lz0 + lz1) / 2;
        // shrink until every sampled point is genuinely open water
        let rx = (lx1 - lx0) * 0.34, rz = (lz1 - lz0) * 0.34, wake: Route | null = null;
        for (let k = 0; k < 8 && !wake; k++) {
          const r = ovalRoute(cx, cz, rx, rz, 14);
          if (r.p.every((p) => inLagoon3(p[0], p[1], -6))) wake = r; else { rx *= 0.84; rz *= 0.84; }
        }
        if (wake) for (let i = 0; i < 5; i++) {
          const canoe = i === 4;
          const b = makeRowboat(canoe);
          const crewman = makeCast(canoe ? 'kid' : pick(['fisher', 'booster', 'gossip', 'farmer'] as Role[]),
            'beach', i % 2 ? DINKLE : HOLLIS);
          crewman.position.set(canoe ? 0.4 : -0.5, 0.95, 0); crewman.rotation.y = FACE_X;
          posed(crewman, -1.15, -1.15, 0.55, 0.55);       // sitting, hands on the oars
          b.add(crewman);
          const CL = crewman.userData.limbs as Limbs;
          b.userData.ptsMult = 1.5; b.userData.mover = true;
          b.userData.afloat = true;                        // legitimately on the water
          setShadow(b); scene.add(b); addEdible(b, canoe ? 2.0 : 2.6);
          const t0 = i / 5, ph = rand(0, 6.3);
          onTrack(b, wake, canoe ? 0.048 : rand(0.030, 0.042), t0, true, 26, 2.0);
          movers.push({
            mesh: b,
            update(_dt, tm) {
              if (eaten(b)) return;
              b.position.y = -0.35 + Math.sin(tm * 1.7 + ph) * 0.09;
              b.rotation.z = Math.sin(tm * 1.3 + ph) * 0.06;
              const s = Math.sin(tm * 1.6 + ph);           // the stroke
              CL.la.rotation.x = -1.15 + s * 0.55; CL.ra.rotation.x = -1.15 + s * 0.55;
              CL.torso.rotation.x = 0.18 - s * 0.16;
            },
          });
        }
      }
    }

    // ══ 8. THE TRAIL WALK ══════════════════════════════════════════════════
    // The pine woods had ten residents and a campfire. Now it has a trail with
    // people on it, which is the whole difference between a wood and a map.
    {
      const w2 = zoneCentre('woods', 'park', 'farm');
      if (w2) {
        const rt = fitOval(w2.x, w2.z, HALF_BLOCK_3D * 0.70, HALF_BLOCK_3D * 0.56);
        if (rt) for (let i = 0; i < 5; i++) {
          const t0 = i / 5;
          routeAt(rt, t0);
          const rec = townie(i === 1 ? 'kid' : 'camper', _rp.x, _rp.y, w2.dress, w2.side, 400, rand(0.4, 0.9));
          if (rec) onTrack(rec.mesh, rt, rand(0.040, 0.055), t0, false, 20);
        }
      }
    }

    // ══ 9. THE MAIL ROUND ══════════════════════════════════════════════════
    {
      const m = zoneCentre('burb', 'main', 'strip');
      if (m) {
        const E = HALF_BLOCK_3D * 0.84;
        const box: BAY.Pt[] = [[m.x - E, m.z - E], [m.x + E, m.z - E], [m.x + E, m.z + E], [m.x - E, m.z + E]];
        if (box.every((p) => biomeAt(p[0], p[1]))) {
          const rt = route(box, true);
          routeAt(rt, 0);
          const rec = townie('mail', _rp.x, _rp.y, m.dress, m.side, 400, rand(0.3, 0.6));
          if (rec) onTrack(rec.mesh, rt, 0.024, 0, false, 20);
        }
      }
    }

    // ══════════════════════════════════════════════════════════════════════
    //  THE STAGED SCENES
    // ══════════════════════════════════════════════════════════════════════
    // Anchored by ZONE, never by grid coordinate: island.ts re-zones the plan
    // without warning, and a vignette that hard-codes block (3,2) ends up in a
    // cornfield. anchorOf() also prefers a block no other scene has claimed.
    const mEvent = (z: MZone, fb: MZone[], amb: string[], pan: string[],
                    build: (x: number, cz: number, side: number, dress: string) => void): void => {
      const a = anchorOf(z, ...fb);
      if (!a) return;
      const [gx, gy] = a;
      const dress = biomeIdAt(gx, gy), side = sideOf(gx, gy);
      addEvent(gx, gy, amb, pan, (x, cz) => build(x, cz, side, dress), 0);
    };

    // ── THE RIBBON CUTTING ────────────────────────────────────────────────
    // Mayor Dinkle, at a podium, on the subject of the bandstand. A crowd, and
    // one heckler who has been asked to leave.
    //
    // THIS WAS A TWO-PARTY ELECTION. "four more years! or eight!", "a vote for
    // me is a vote for me", "the polls are still OPEN!!", "I demand a
    // REMATCH!!" — live, on screen, in a game rated 4+. The team wrote the rule
    // down itself in newsroom_maple.ts: "RATED 4+. NO real politics of any kind
    // — no election, no voting, no polls, no candidates, no recounts." An
    // entire newsroom was rewritten around that rule and the vignette layer
    // never got the memo, so the surface a child watches most was still running
    // a campaign. Same joke — a small-town mayor who will not admit to a hole
    // in the ground — with the politics taken out and the house sentence case
    // put back in.
    mEvent('civic', ['main', 'strip', 'burb'],
      ['There is no void. Next question.', 'I have a plan for the bandstand.',
        'I cut that ribbon myself.', 'I fixed that pothole. Me.',
        'Boooo! …sorry, continue.', 'Let me finish. LET ME FINISH.',
        'And another thing about potholes.', 'Shake my hand. Firm. Good.',
        'I named that prize hog myself.', 'The twine ball put us on the map.'],
      ['I never said it was fake!!', 'That is a VERY large puddle!!',
        'The bandstand! Save the bandstand!!', 'I have looked into it. It is BAD!!',
        'Meeting adjourned!! RUN!! RUN!!'],
      (x, z, side, dress) => {
        const SZ = z - 12;   // the stage line, back from the square
        glb(scene, addEdible, 'stage', x, SZ, 5, {
          h: 3.2, rotY: Math.PI,
          fallback: () => {
            const grp = new THREE.Group();
            const stage = new THREE.Mesh(new THREE.BoxGeometry(10, 1.6, 6), new THREE.MeshStandardMaterial({ color: 0xf0e6d2, roughness: 0.8 }));
            stage.position.y = 0.8; grp.add(stage);
            const lectern = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.2, 1.2), new THREE.MeshStandardMaterial({ color: 0xe8ddc4, roughness: 0.75 }));
            lectern.position.set(0, 2.7, 1.6); grp.add(lectern);
            return grp;
          },
        });
        // bunting: the two campaigns' colours, alternating, over the stage
        for (let i = 0; i < 8; i++)
          decor(makeYardSign(i % 2 ? DINKLE : HOLLIS), x - 10.5 + i * 3, SZ - 4.5, 1.2);
        // THE MAYOR, up on the stage where the wanderer's ground-level walk
        // cannot reach him — his own tiny mover keeps him facing the crowd
        const mayor = makeCast('campaigner', dress, DINKLE);
        mayor.position.set(x, 1.6, SZ); mayor.rotation.y = Math.PI;
        mayor.userData.mover = true; mayor.userData.ptsMult = 2;
        setShadow(mayor); scene.add(mayor); addEdible(mayor, 2.4);
        peds.push({ mesh: mayor, biome: dress, panic: 0, voice: 'politician' });
        const ML = mayor.userData.limbs as Limbs;
        movers.push({
          mesh: mayor,
          update(_dt, t) {
            if (eaten(mayor)) return;
            mayor.rotation.y = Math.PI + Math.sin(t * 0.7) * 0.22;
            ML.ra.rotation.z = -Math.PI * 0.8 + Math.sin(t * 2.6) * 0.3;   // the wave
            ML.ra.rotation.x = -0.4;
            ML.la.rotation.x = Math.sin(t * 1.4) * 0.25;
            ML.torso.rotation.y = Math.sin(t * 0.7) * 0.12;
          },
        });
        // the faithful, in an arc, in both colours
        for (let i = 0; i < 9; i++) {
          const a = Math.PI * (0.12 + 0.76 * (i / 8));
          const cx2 = x + Math.cos(a) * rand(7, 13), cz2 = SZ + 6 + Math.sin(a) * rand(4, 9);
          const camp = i % 3 === 0 ? HOLLIS : DINKLE;
          townie(pick(['booster', 'gossip', 'kid', 'booster', 'teen'] as Role[]),
            cx2, cz2, dress, camp, 5, rand(1.5, 2.8), 20,
            ['the SPEECH!! RUN!!', 'the PIE TABLE!! SAVE IT!!', 'save the good chairs!!',
              'he said it was a PUDDLE!!']);
        }
        // …and one campaign worker on the edge of it, leafleting the queue
        rooted('campaigner', x + 12, SZ + 9, dress, 5, DINKLE);
        // THE HECKLER. Blue placard, one arm going, absolutely certain.
        rooted('protester', x - 13, SZ + 10, dress, 7, HOLLIS, 0.9, 20,
          ['I was heckling him about THAT!!', 'ASK HIM ABOUT THE VOID!!', 'told you!! TOLD you!!']);
      });

    // ── THE PARKING METER ─────────────────────────────────────────────────
    // Nine years. One meter. Four people. They have folding chairs and they
    // are not going anywhere, and that includes now.
    mEvent('main', ['civic', 'strip'],
      ['the METER. it is the meter.', 'day 3,281 of the protest.',
        'nine years. NINE. still here.', 'twenty five cents. an HOUR.',
        'honk if you hate that meter!', 'we have a petition. sign it.',
        'there are four of us. FOUR.', 'the meter is a SYMBOL.',
        'my sign is laminated. it lasts', 'I brought folding chairs.'],
      ['the METER!! SAVE THE METER!!', 'this changes NOTHING!!',
        'we protest ON THE RUN!!', 'still twenty five cents!!',
        'day 3,281 continues!!'],
      (x, z, _side, dress) => {
        decor(makeParkingMeter(), x, z, 1.6);
        // the folding chairs. Nine years of them.
        for (const [ox, oz] of [[-3.6, 2.4], [3.4, 2.8]] as [number, number][])
          decor(grp1(mergedProp([
            part(MG.box, 0x3a6a8a, 0, 0.9, 0, 0, 0, 0, 1.5, 0.16, 1.4),
            part(MG.box, 0x3a6a8a, -0.6, 1.55, 0, 0, 0, 0.12, 0.16, 1.4, 1.4),
            part(MG.box, 0x8a8f9c, 0, 0.45, 0, 0, 0, 0, 1.3, 0.9, 1.2),
          ])), x + ox, z + oz, 1.2);
        // FOUR PROTESTERS. Fear 5, not 18: they do not move for anything, and
        // the void is not going to be the exception.
        const ring: [number, number, number][] = [
          [-2.6, -2.2, 0.7], [2.7, -2.0, -0.7], [-2.9, 3.0, 2.4], [3.1, 3.2, -2.4],
        ];
        for (let i = 0; i < ring.length; i++)
          rooted('protester', x + ring[i][0], z + ring[i][1], dress, 6,
            i % 2 ? HOLLIS : DINKLE, ring[i][2], 5,
            ['the METER!! SAVE THE METER!!', 'this changes NOTHING!!', 'day 3,281 continues!!',
              'still twenty five cents!!']);
        // …and the two people who stopped to argue with them
        townie('gossip', x - 6.5, z + 5.5, dress, undefined, 3, rand(0.4, 0.9));
        townie('booster', x + 6.8, z + 5.2, dress, undefined, 3, rand(0.4, 0.9));
      });

    // ── THE PIE CONTEST ───────────────────────────────────────────────────
    // PEARL runs it, judges it and wins it. Eleven years. Nobody has worked
    // out how to raise this without it becoming a whole thing.
    mEvent('fair', ['park', 'civic', 'main'],
      ['judging is at four. FOUR.', 'Pearl has won eleven years.',
        'that crust is store bought.', 'blue ribbon or nothing.',
        'she judges her OWN pie?', 'I entered the jam instead.',
        'nobody move the pies.', 'the 96 judging was a SCANDAL.',
        'the recipe is a family secret', 'we do not question Pearl.'],
      ['SAVE THE PIES!! ALL OF THEM!!', 'not the BLUE RIBBON!!',
        'Pearl has the pies!! GO!!', 'judging is POSTPONED!!',
        'it ate the winning entry!!'],
      (x, z, side, dress) => {
        decor(makePieTable(), x, z - 2, 4.5);
        // PEARL, behind the table, presenting
        rooted('baker', x, z - 4.6, dress, 5, side, Math.PI, 18,
          ['MY PIES!! ALL ELEVEN!!', 'the ribbon!! grab the RIBBON!!', 'it has NO PALATE!!']);
        // the judges, leaning over the entries with both hands busy
        for (const ox of [-3.0, 3.0])
          rooted('gossip', x + ox, z - 4.4, dress, 3, side, Math.PI);
        // the crowd on the public side of the table
        for (let i = 0; i < 7; i++) {
          const a = -Math.PI * (0.1 + 0.8 * (i / 6));
          townie(pick(['booster', 'kid', 'gossip', 'farmer', 'kid', 'teen'] as Role[]),
            x + Math.cos(a) * rand(5, 12), z + 1 - Math.sin(a) * rand(3, 9),
            dress, i % 3 === 0 ? HOLLIS : DINKLE, 4, rand(0.6, 1.4));
        }
      });

    // ── FOOTBALL PRACTICE ─────────────────────────────────────────────────
    mEvent('school', ['park', 'farm', 'burb'],
      ['GO OTTERS! two and eight!', 'run it AGAIN. from the top.',
        'that is not what I drew!', 'water break. NINETY seconds.',
        'coach has ONE play. one.', 'homecoming is in two weeks',
        'the band is watching. focus.', 'we lost to Pike Hollow. again.'],
      ['PRACTICE IS CANCELLED!!', 'coach says RUN. actually RUN!!',
        'it ate the FIELD!!', 'save the trophy!! the ONE trophy!!'],
      (x, z, side, dress) => {
        for (const oz of [-17, 17]) decor(makeGoalPosts(), x, z + oz, 3.4, Math.PI / 2);
        // THE COACH — rooted, clipboard, one arm running the whole session
        rooted('coach', x - 11, z, dress, 1, side, -Math.PI / 2, 20,
          ['RUN IT AGAIN!! I mean— RUN!!', 'that is NOT the play!!', 'nobody stops!! NOBODY!!']);
        // THE DRILL — a shuttle run up and down the field, which is the most
        // motion per person of anything in the town
        const drill = route([[x - 2, z - 13], [x - 2, z + 13]], false);
        for (let i = 0; i < 6; i++) {
          const t0 = i / 6;
          routeAt(drill, bounce(t0));
          const rec = townie('ballplayer', _rp.x + (i % 3 - 1) * 3.4, _rp.y, dress,
            i % 2 ? side : (side === DINKLE ? HOLLIS : DINKLE), 400, rand(0.4, 0.9));
          if (!rec) continue;
          const lane = route([[x - 2 + (i % 3 - 1) * 3.4, z - 13], [x - 2 + (i % 3 - 1) * 3.4, z + 13]], false);
          let tt = t0;
          const sp = rand(0.16, 0.23);   // a shuttle run is a SPRINT
          movers.push({
            mesh: rec.mesh,
            update(dt, _tm, vx, vz, vR) {
              const m = rec.mesh;
              if (eaten(m)) return;
              if (Math.hypot(m.position.x - vx, m.position.z - vz) < vR + 20) return;
              tt += dt * sp;
              routeAt(lane, bounce(tt) * 0.999);
              const dx = _rp.x - m.position.x, dz = _rp.y - m.position.z;
              m.position.x = _rp.x; m.position.z = _rp.y;
              if (dx || dz) m.rotation.y = -Math.atan2(dz, dx) + Math.PI / 2;
            },
          });
        }
        // THE SIDELINE — cheerleaders on the near touchline and the band kids
        // who are only here because the coach said the band has to be here
        for (let i = 0; i < 3; i++)
          townie('cheer', x + 9, z - 6 + i * 6, dress, side, 2.5, rand(0.3, 0.7));
        for (let i = 0; i < 3; i++)
          townie('bandkid', x + 13, z - 4 + i * 5, dress, side, 2.5, rand(0.3, 0.7));
        for (let i = 0; i < 3; i++)
          townie(pick(['teen', 'gossip', 'booster', 'kid'] as Role[]),
            x + 16 + rand(-2, 2), z + rand(-11, 11), dress, undefined, 4, rand(0.5, 1.2));
      });

    // ── THE TOWN-HALL MEETING ─────────────────────────────────────────────
    // It is a standing-room-only meeting about a void, held by a man who says
    // there is no void, and it has spilled all the way down the steps.
    mEvent('civic', ['main', 'strip', 'burb'],
      ['the meeting is FULL. sit outside.', 'point of order! POINT of order!',
        'that is not on the agenda.', 'we have been here since six.',
        'somebody open a window.', 'she is going to bring up the meter.',
        'the minutes will reflect that.', 'nine people. NINE. and a feud.',
        'move to adjourn? DENIED.', 'the Bugle is recording this.'],
      ['ADJOURNED!! ADJOURNED!!', 'the MINUTES!! save the minutes!!',
        'point of order — RUN!!', 'this meeting is OVER!!'],
      (x, z, side, dress) => {
        const steps = makeHallSteps();
        steps.rotation.y = Math.PI;
        decor(steps, x, z - 8, 6);
        // the chair of the meeting, at the top, losing control of it
        rooted('campaigner', x, z - 11.5, dress, 1, side, 0);
        // the meeting, on the steps and spilling into the square
        for (let i = 0; i < 10; i++) {
          const row = Math.floor(i / 4);
          const cx2 = x + ((i % 4) - 1.5) * 3.4 + rand(-1, 1);
          const cz2 = z - 5 + row * 4.2 + rand(-1, 1);
          const camp = i % 2 ? DINKLE : HOLLIS;
          if (i === 3 || i === 8) rooted('protester', cx2, cz2, dress, 6, camp);
          else townie(pick(['gossip', 'booster', 'farmer', 'teen', 'server', 'gossip'] as Role[]),
            cx2, cz2, dress, camp, 3, rand(0.4, 1.0));
        }
        // and two people who could not get in, arguing on the pavement
        rooted('gossip', x - 9, z + 4, dress, 7, HOLLIS, 1.4);
        rooted('booster', x - 6.4, z + 4.6, dress, 7, DINKLE, -1.7);
      });

    // ── THE LAWN-SIGN DISPUTE ─────────────────────────────────────────────
    // Two neighbours, one boundary, one tape measure and a difference of two
    // inches that is going to a county court.
    mEvent('burb', ['main', 'park', 'strip'],
      ['it is two inches. TWO.', 'that sign is on MY verge.',
        'I have the original survey.', 'we were friends. in 2011.',
        'measure it again. AGAIN.', 'the hedge is the LINE.',
        'my ruler says two inches.', 'both signs. same lawn. a FEUD.',
        'the FENCE COMMITTEE gave up.', 'his lawn is not even level.'],
      ['MY LAWN!! MY LAWN!!', 'it crossed the BOUNDARY!!',
        'take the sign!! LEAVE the hedge!!', 'this is STILL two inches!!'],
      (x, z, side, dress) => {
        const other = side === DINKLE ? HOLLIS : DINKLE;
        // the boundary itself: a hedge, and a picket line of signs along it
        decor(grp1(mergedProp([
          part(MG.box, 0x4a7a4a, 0, 1.0, 0, 0, 0, 0, 1.7, 2.0, 15.0),
          part(MG.box, 0x5a8a52, 0, 2.05, 0, 0, 0, 0, 1.9, 0.5, 15.2),
        ])), x, z, 3.4);
        for (let i = 0; i < 6; i++)
          decor(makeYardSign(i < 3 ? side : other),
            x + (i < 3 ? -2.6 : 2.6), z - 6 + (i % 3) * 6, 1.2);
        // THE TAPE MEASURE. Mode 3 is "both hands busy in front", which is
        // exactly what a man proving a two-inch encroachment looks like.
        const surveyor = (camp: number) => makePerson(dress, undefined, {
          shirt: camp, pants: 0x3a4a6a, accent: camp, wear: 'tee', shoe: 'shoe',
          pattern: 'plain', hat: 'cap', hatCol: camp, rosette: camp, prop: 'tape',
          hair: pick(['bald', 'buzz', 'short'] as Hair[]), glasses: Math.random() < 0.4,
        });
        const dale = surveyor(side);
        dale.userData.dancer = { t: rand(0, 6), spin: 1, mode: 3 };
        const r1 = addWanderer(dale, x - 3.2, z, 1.2, rand(0.1, 0.3), 14, 2.4, dress,
          ['STILL two inches!!', 'measure it!! SOMEBODY MEASURE IT!!', 'MY LAWN!!'], 'booster');
        if (r1) r1.mesh.rotation.y = -Math.PI / 2;
        // …and the neighbour, arms going, who has heard all of this before
        rooted('gossip', x + 3.2, z + 0.6, dress, 7, other, Math.PI / 2, 14,
          ['he is STILL measuring!!', 'it is TWO INCHES!!', 'take the hedge!! TAKE IT!!']);
        // the rest of the street, out on their porches, loving it
        for (let i = 0; i < 5; i++)
          townie(pick(['gossip', 'kid', 'dogwalker', 'teen'] as Role[]),
            x + rand(-14, 14), z + rand(-13, 13), dress, i % 2 ? side : other, 5, rand(0.5, 1.3));
        // the tape measure is the prop that sells it, so there is a SECOND one:
        // the joke survives Dale being eaten first, which he will be
        const witness = surveyor(other);
        witness.userData.dancer = { t: rand(0, 6), spin: 1, mode: 3 };
        const r2 = addWanderer(witness, x + 5.4, z - 5.0, 1.2, rand(0.1, 0.3), 14, 2.4, dress,
          ['it is TWO INCHES!!', 'get the survey!! THE SURVEY!!'], 'gossip');
        if (r2) r2.mesh.rotation.y = 1.2;
      });

    // ── THE DINER ─────────────────────────────────────────────────────────
    // GUS. Refills are free. So are the opinions. The debate is at eight.
    mEvent('strip', ['main', 'civic', 'burb'],
      ['coffee is 90 cents. always.', 'refills free. opinions free.',
        'that booth is Marge\'s booth.', 'the special is the special.',
        'no, we do not do sprinkles.', 'the debate is at 8. be early.',
        'banned him. still feed him.', 'you two. shake hands. now.',
        'I lost to Pearl again. again.', 'nobody leaves here hungry.'],
      ['it ate the DINER!!', 'grab the pie!! LEAVE the eggs!!',
        'we are CLOSED. permanently. RUN!!', 'not Marge\'s booth!!'],
      (x, z, side, dress) => {
        // the counter, out front, because the whole town eats outside in July
        decor(grp1(mergedProp([
          part(MG.box, 0xe8e2d0, 0, 2.0, 0, 0, 0, 0, 11.0, 0.3, 2.4),
          part(MG.box, 0xd8443c, 0, 1.0, 0, 0, 0, 0, 10.6, 1.7, 2.0),
          part(MG.box, 0x8a8f9c, 0, 0.15, 0, 0, 0, 0, 11.0, 0.3, 2.6),
        ])), x, z - 3, 4.5);
        for (let i = 0; i < 5; i++)
          decor(grp1(mergedProp([
            part(MG.cyl6, 0x9aa0ac, 0, 0.9, 0, 0, 0, 0, 0.3, 1.8, 0.3),
            part(MG.disc, 0xd8443c, 0, 1.85, 0, 0, 0, 0, 1.1, 0.25, 1.1),
          ])), x - 4 + i * 2, z - 0.6, 1.0);
        // two servers working the counter, pots in hand
        rooted('server', x - 2.4, z - 5.0, dress, 5, side, 0);
        rooted('server', x + 3.0, z - 4.6, dress, 3, side, 0);
        // the regulars, at the stools
        for (let i = 0; i < 5; i++)
          townie(pick(['gossip', 'farmer', 'booster', 'teen', 'protester'] as Role[]),
            x - 4 + i * 2 + rand(-0.6, 0.6), z + 1.4 + rand(-0.6, 0.6), dress,
            i % 2 ? DINKLE : HOLLIS, 2, rand(0.2, 0.6));
        // and the teenagers in the parking lot, where the teenagers are
        for (let i = 0; i < 4; i++)
          townie('teen', x + rand(6, 15), z + rand(2, 12), dress, undefined, 4, rand(0.5, 1.4));
      });

    // ── THE CAMPSITE ──────────────────────────────────────────────────────
    mEvent('woods', ['park', 'lake', 'farm'],
      ['s\'mores?! 🔥', 'one more ghost story…', 'who packed the bug spray?',
        'the fair is four miles that way', 'a raccoon took the whole bag',
        'nature is so LOUD', 'we come out here every August'],
      ['BEAR! no. BIGGER!!', 'ABANDON CAMP!!', 'the tent has NO defense stat!!',
        'save the s\'mores!! ALL of them!!'],
      (x, z, side, dress) => {
        for (const [ox, oz, col] of [[-7, 0, 0xff8a70], [7, 3, 0x6db8e8]] as const) {
          const grp2 = new THREE.Group();
          const tent = new THREE.Mesh(new THREE.ConeGeometry(4, 5, 4), new THREE.MeshStandardMaterial({ color: col, roughness: 0.85, flatShading: true }));
          tent.rotation.y = Math.PI / 4; tent.position.y = 2.5; grp2.add(tent);
          const flap = new THREE.Mesh(new THREE.CircleGeometry(1.1, 3),
            new THREE.MeshStandardMaterial({ color: 0x2a2438, roughness: 0.95, side: THREE.DoubleSide }));
          flap.position.set(0, 1.05, 2.62); flap.rotation.x = -0.42; grp2.add(flap);
          decor(grp2, x + ox, z + oz, 3);
        }
        const logs = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 0.8, 8), new THREE.MeshStandardMaterial({ color: 0x6a4a2a, roughness: 1 }));
        logs.position.y = 0.4; decor(logs, x, z, 2);
        const flame = new THREE.Mesh(new THREE.ConeGeometry(1.3, 3, 7), new THREE.MeshStandardMaterial({ color: 0xff8a3a, emissive: 0xff5a1a, emissiveIntensity: 1.8, roughness: 0.6 }));
        flame.position.set(x, 2, z); scene.add(flame);
        for (let i = 0; i < 5; i++) {
          const a = Math.PI * 2 * (i / 5);
          townie(i === 4 ? 'kid' : 'camper', x + Math.cos(a) * rand(4, 6), z + Math.sin(a) * rand(4, 6),
            dress, side, 3, rand(0.4, 1.0));
        }
      });

    // ── THE LAKE ──────────────────────────────────────────────────────────
    mEvent('lake', ['park', 'woods'],
      ['the boat parade is saturday', 'four boats and a canoe. HUGE.',
        'nothing is biting today.', 'that photo? catfish. 1996.',
        'SPIKE IT!! 🏐', 'the water is FINE. get in.',
        'somebody lost a cooler out there'],
      ['SAVE THE COOLER!!', 'even the fish left!!', 'not the BOAT PARADE!!',
        'reel it in!! REEL IT IN!!'],
      (x, z, side, dress) => {
        // the court is baked +9 south of the block centre, which on this shore
        // is INSIDE the lagoon — find sand before building anything on it, and
        // if there is none (a re-zone put the lake somewhere else) skip the
        // court and keep the fishers, rather than floating a net on the water
        const court = dryNear(x, z + 9, 34);
        if (court) {
          const [x0, z0] = court;
          for (const ox of [-6, 6]) {
            const post = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 6, 6), new THREE.MeshStandardMaterial({ color: 0x9a7a5a, roughness: 0.8 }));
            post.position.y = 3; decor(post, x0 + ox, z0, 2);
          }
          const netTex = (() => {
            const cv2 = document.createElement('canvas'); cv2.width = 96; cv2.height = 24;
            const x2 = cv2.getContext('2d')!;
            x2.strokeStyle = 'rgba(255,255,255,0.95)'; x2.lineWidth = 1.4;
            for (let gx2 = 0; gx2 <= 96; gx2 += 8) { x2.beginPath(); x2.moveTo(gx2, 0); x2.lineTo(gx2, 24); x2.stroke(); }
            for (let gy2 = 0; gy2 <= 24; gy2 += 8) { x2.beginPath(); x2.moveTo(0, gy2); x2.lineTo(96, gy2); x2.stroke(); }
            return new THREE.CanvasTexture(cv2);
          })();
          const net = new THREE.Mesh(new THREE.PlaneGeometry(12, 2.4),
            new THREE.MeshBasicMaterial({ map: netTex, transparent: true, opacity: 0.85, side: THREE.DoubleSide }));
          net.position.set(x0, 4.4, z0); scene.add(net);
          const ball = new THREE.Group();
          ball.add(mergedProp([
            part(MG.sph, 0xf6f6f2, 0, 0, 0, 0, 0, 0, 2.0),
            part(MG.disc, 0xffd23f, 0, 0, 0, 0.6, 0, 0, 2.02, 0.14, 2.02),
            part(MG.disc, 0x4da3ff, 0, 0, 0, 0, 0, 0.9, 2.02, 0.14, 2.02),
          ]));
          ball.position.y = 1; decor(ball, x0 + 3, z0 + 5, 1.5);
        }
        // THE FISHERS. Waders, rods, and a total absence of fish. They stand on
        // the BANK — dryNear keeps them out of the water they are fishing.
        for (let i = 0; i < 3; i++) {
          const sp = dryNear(x - 12 + i * 4.5, z + 15 + rand(-2, 2), 26);
          if (sp) rooted('fisher', sp[0], sp[1], dress, 3, side, 0.2, 20,
            ['reel it in!! REEL IT IN!!', 'nothing was biting ANYWAY!!', 'the LAKE!! it took the LAKE!!']);
        }
        // KIDS RUNNING THE SHORE — the thing that actually happens at a lake.
        // A ping-pong track along the waterline, at full child speed.
        let shore: Route | null = null;
        for (const dz of [12, 4, -6, 20, -14]) {
          const s0 = dryNear(x - 26, z + dz, 16), s1 = dryNear(x + 26, z + dz, 16);
          if (s0 && s1) shore = dryLine(s0[0], s0[1], s1[0], s1[1]);
          if (shore) break;
        }
        if (shore) {
          for (let i = 0; i < 4; i++) {
            const t0 = i / 4;
            routeAt(shore, bounce(t0));
            const rec = townie('kid', _rp.x, _rp.y, dress, side, 400, rand(0.5, 1.0));
            if (!rec) continue;
            let tt = t0;
            const sp = rand(0.10, 0.15);
            movers.push({
              mesh: rec.mesh,
              update(dt, _tm, vx, vz, vR) {
                const m = rec.mesh;
                if (eaten(m)) return;
                if (Math.hypot(m.position.x - vx, m.position.z - vz) < vR + 20) return;
                tt += dt * sp;
                routeAt(shore, bounce(tt) * 0.999);
                const dx = _rp.x - m.position.x, dz = _rp.y - m.position.z;
                m.position.x = _rp.x; m.position.z = _rp.y;
                if (dx || dz) m.rotation.y = -Math.atan2(dz, dx) + Math.PI / 2;
              },
            });
          }
        }
        for (let i = 0; i < 3; i++)
          townie(pick(['kid', 'teen', 'gossip', 'camper', 'kid'] as Role[]),
            x + rand(-14, 14), z + rand(-2, 14), dress, side, 8, rand(2.5, 4.5));
      });

    // ── SCHOOL, AT RECESS ─────────────────────────────────────────────────
    mEvent('school', ['burb', 'civic', 'main'],
      ['recess!! 🎒', 'tag, you\'re it!', 'the bell is broken. still.',
        'band practice. every day. LOUD.', 'bake sale in the gym! cash!',
        'pop quiz! nooo', 'summer reading! I won it!'],
      ['SNOW DAY!! I mean— VOID DAY!!', 'homework CANCELLED!!', 'RUN, class, RUN!!',
        'band, KEEP PLAYING!!'],
      (x, z, side, dress) => {
        const buildFallback = () => {
          const school = new THREE.Group();
          const brick = new THREE.Mesh(new THREE.BoxGeometry(16, 6, 9),
            new THREE.MeshStandardMaterial({ color: 0xc25a4a, roughness: 0.85 }));
          brick.position.y = 3; school.add(brick);
          const trim = new THREE.Mesh(new THREE.BoxGeometry(16.4, 0.8, 9.4), new THREE.MeshStandardMaterial({ color: 0xf2efe6, roughness: 0.8 }));
          trim.position.y = 6.2; school.add(trim);
          const bell = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.6, 2.4, 4),
            new THREE.MeshStandardMaterial({ color: 0xf2efe6, roughness: 0.8, flatShading: true }));
          bell.position.y = 7.6; school.add(bell);
          const door = new THREE.Mesh(new THREE.BoxGeometry(2.4, 3.2, 0.3), new THREE.MeshStandardMaterial({ color: 0x3a5a7a, roughness: 0.7 }));
          door.position.set(0, 1.6, 4.6); school.add(door);
          return school;
        };
        glb(scene, addEdible, 'school', x, z - 6, 6.0, { h: 11, fallback: buildFallback });
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 7, 6), new THREE.MeshStandardMaterial({ color: 0xc8cdd8, metalness: 0.5 }));
        pole.position.set(x + 9.5, 3.5, z - 3); setShadow(pole); scene.add(pole);
        const flag = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.3), new THREE.MeshStandardMaterial({ color: side, side: THREE.DoubleSide }));
        flag.position.set(x + 10.6, 6.4, z - 3); scene.add(flag);
        // THE MARCHING BAND, practising a single bar of one song, forever, on
        // a tight loop across the front of the school
        const bandRun = fitOval(x, z + 8, 10, 5);
        for (let i = 0; i < 5; i++) {
          const t0 = i / 5;
          if (bandRun) routeAt(bandRun, t0);
          const bx = bandRun ? _rp.x : x - 8 + i * 4, bz = bandRun ? _rp.y : z + 8;
          const rec = townie('bandkid', bx, bz, dress, side, 400, rand(0.3, 0.8));
          if (rec && bandRun) onTrack(rec.mesh, bandRun, 0.055, t0, false, 18);
        }
        // and the rest of recess, at speed
        for (let i = 0; i < 5; i++)
          townie(pick(['kid', 'kid', 'teen', 'ballplayer'] as Role[]),
            x + rand(-15, 15), z + rand(2, 15), dress, undefined, 12, rand(5, 8));
      });
  }

  // ── crowd chatter: escalates with the match ────────────────────────────────
  let chatCd = 2;
  let farPhase = 0;   // spreads the staggered quarter across frames
  let lastVX = 0, lastVZ = 0;   // for moverStats
  let tense = 0;            // 0 = nobody has noticed, 1 = the street is going
  const cpos = new THREE.Vector3();

  return {
    update(dt, t, vx, vz, vR, gate = Infinity) {
      tickClock(dt);
      lastVX = vx; lastVZ = vz;
      // ── THE CROWD OUTSIDE THE FRAME ────────────────────────────────────
      // This was `for (const m of movers) m.update(...)` with no cull of any
      // kind — no frustum test, no distance test, no stride. Lantern Night
      // spawns ~966 walkers and every one of them ran a full update every
      // frame, including three biomeAt() point-in-polygon tests, whether or
      // not it was within a hundred units of the camera.
      //
      // IT IS A STAGGER, NOT A SKIP, and that is the whole design. Freezing
      // distant movers outright is what makes a naive version of this look
      // broken: timers stop, so a train swallowed off-screen never respawns,
      // and a walker that wandered out returns still mid-stride from a minute
      // ago. Far movers instead run one frame in four with four times the dt,
      // so they advance at the correct AVERAGE rate for a quarter of the cost
      // and nothing in the world is ever actually paused. The phase is offset
      // by index so the quarters are spread across frames rather than landing
      // together.
      //
      // `mesh` is read once and checked, because it is genuinely null on three
      // of four worlds: life.ts pushes the train mover unconditionally and only
      // calls buildTrain() on Maple, so `get mesh()` returns null everywhere
      // else. A gate written as `m.mesh.position.x` throws on the first frame
      // of every Pirate, Game Day and Lantern match. Anything without a mesh
      // has no position to be far from, so it always runs.
      const g2 = gate * gate;
      farPhase = (farPhase + 1) & 3;
      for (let i = 0; i < movers.length; i++) {
        const m = movers[i];
        const o = m.mesh;
        if (o && gate < Infinity && !m.fast) {
          const dx = o.position.x - vx, dz = o.position.z - vz;
          const d2 = dx * dx + dz * dz;
          if (d2 > g2) {
            // TWO BANDS, because the single quarter-rate band was visible:
            // a mover advanced by one frame in four takes a QUADRUPLE step
            // after three frozen frames — which on screen is precisely the
            // owner's "items move, pause, move, pause". Movers just past the
            // gate (the ones that can still be on screen) now run every OTHER
            // frame with dt*2 — half the leap, twice the smoothness — and only
            // the genuinely distant (2x the gate, reliably off screen) keep
            // the cheap quarter rate. The average advance rate is unchanged
            // in both bands, so timers and respawns still behave.
            if (d2 > g2 * 4) {
              if (((i + farPhase) & 3) !== 0) continue;
              m.update(dt * 4, t, vx, vz, vR);
            } else {
              if (((i + farPhase) & 1) !== 0) continue;
              m.update(dt * 2, t, vx, vz, vR);
            }
            continue;
          }
        }
        m.update(dt, t, vx, vz, vR);
      }

      // ONE VOICE AT A TIME, from a pedestrian near the void — but which
      // register, and how often, is now the match's business. At rest it is a
      // line every 2.4s and all of it small talk; at full tension it is a line
      // every 1.1s and five in six of them are somebody shouting.
      chatCd -= dt;
      if (chatCd <= 0) {
        // the gap closes as it gets worse: 1.8-3.0s -> 0.8-1.4s
        chatCd = rand(1.8 - 1.0 * tense, 3.0 - 1.6 * tense);
        const near = peds.filter((p) => !eaten(p.mesh) && Math.hypot(p.mesh.position.x - vx, p.mesh.position.z - vz) < 68);
        if (near.length) {
          const p = pick(near);
          // …and WHAT they say. calmT still wins outright: the opening seconds
          // of a match are not the moment to start screaming.
          const scream = calmT <= 0 && Math.random() < tense * 0.85;
          // LANTERN NIGHT keeps its own biome pools: the shared AMBIENT/PANIC
          // tables are keyed on Maple's and the bay's district names, and a
          // spirit market falling through to them would have a tanuki saying
          // "MY LOUNGER!!". Nothing here shares a literal with another world
          // precisely so that fall-through cannot happen silently.
          const AMB = WID === 'lantern' ? LN_AMBIENT : WID === 'powder' ? PW_AMBIENT : AMBIENT;
          const PAN = WID === 'lantern' ? LN_PANIC : WID === 'powder' ? PW_PANIC : PANIC;
          // …and on LANTERN NIGHT there is a third state between them. The
          // scream roll is the same; what it reaches for changes. In the wary
          // band a spirit who has decided to speak up says something uneasy
          // rather than something terrified, which is the whole difference
          // between a market that has noticed and a market that is running.
          const lnWary = WID === 'lantern' && tense >= 0.42 && tense < 0.74;
          const pool = scream
            ? (panPool(p.voice)
              || (lnWary ? (LN_WARY[p.biome] || LN_WARY.stalls) : null)
              || PAN[p.biome] || (WID === 'powder' ? PW_PANIC.village : PAN.stalls) || PANIC.generic)
            : (ambPool(p.voice) || AMB[p.biome] || (WID === 'powder' ? PW_AMBIENT.village : AMB.stalls) || AMBIENT.cozy);
          cpos.set(p.mesh.position.x, 5, p.mesh.position.z);
          // a wary line is not a scream and must not be styled as one — the
          // bubble's panic styling is red and shaking, which would undo the
          // entire point of writing them without exclamation marks
          say(cpos, pickFresh(pool), scream && !lnWary ? 'panic' : 'ambient');
        }
      }

      // events: panic when the void closes in, ambient banter otherwise
      for (const ev of events) {
        const d = Math.hypot(ev.x - vx, ev.z - vz);
        ev.panicked = Math.max(0, ev.panicked - dt);
        ev.cd -= dt;
        if (d < vR + 55 && ev.panicked <= 0 && calmT <= 0) {
          cpos.set(ev.x, 6, ev.z); say(cpos, pickFresh(ev.panic), 'panic');
          ev.panicked = 3.5 - 1.8 * tense;
        }
        else if (ev.cd <= 0 && d < 130) { ev.cd = rand(4, 7); cpos.set(ev.x, 6, ev.z); say(cpos, pick(ev.ambient), 'event'); }
      }
    },
    moverStats(gate: number) {
      let near = 0;
      for (const mv of movers) {
        const o = mv.mesh;
        if (!o) { near++; continue; }
        const dx = o.position.x - lastVX, dz = o.position.z - lastVZ;
        if (dx * dx + dz * dz <= gate * gate) near++;
      }
      return { near, total: movers.length };
    },
    // SET, not max — Infinity has to be clearable. The AMBIENT chatter waits
    // too: chatCd starts at 2 s, so the first crowd line landed at 2.0 match-s
    // on every world — inside the establishing shot on all five, from a camera
    // 50-100 units up where the speaker is a speck (the frames in
    // docs/crews/round-5/shots/firstframe/ show it under the title card).
    // Infinity is not written into chatCd: endMatch calls calm(Infinity) and a
    // permanent cooldown would silence the crowd for every later match.
    calm(sec) { calmT = sec; if (Number.isFinite(sec)) chatCd = Math.max(chatCd, sec); },
    cue(name, x, z) { for (const f of cues) f(name, x, z); },
    tension(v) { tense = Math.max(0, Math.min(1, v)); },
  };
}
