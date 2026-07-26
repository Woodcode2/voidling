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
  railPointAt, insideIsland3, inLagoon3, worldId, type Biome, type AddEdible,
} from './island';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { glb, vehicleGlb, contactShadow } from './assets3d';
import * as BAY from './bay';

// Pirate Bay's geometry is authored in WORLD units (0..12000, centre 6000);
// life places things in 3D. Same conversion island.ts uses for everything else.
const w3 = (p: BAY.Pt): [number, number] => [(p[0] - 6000) * 0.05, (p[1] - 6000) * 0.05];

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
const setShadow = (m: THREE.Object3D) => m.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });

export type Say = (pos: THREE.Vector3, text: string, kind: 'ambient' | 'panic' | 'event') => void;

// ── biome dialogue (from the 2D AMBIENT_BY_BIOME / PANIC_BY_BIOME pools) ─────────
// These are the FALLBACK pools — "what someone standing HERE would say". Who a
// speaker actually IS overrides them (see VOICE_AMBIENT below): a rich guest
// complains the same way on the beach as at the spa.
const AMBIENT: Record<string, string[]> = {
  // ── PIRATE BAY: a five-star resort cosplaying a pirate hideout
  port: ['mind the gangplank, sir', 'the tender leaves at six', 'that crate is DEFINITELY rum', 'a seagull took my croissant', 'tide\'s coming in, matey', 'who moored a superyacht THERE', 'says fragile. it is not.', 'salt in me boots. always.', 'thirty bags. for one guest.', 'the harbourmaster is napping', 'polish the brass. again.', 'that ship is a photo prop', 'lobster delivery, coming through', 'this jetty needs a new plank'],
  resort: ['two more weeks of THIS', 'the swim-up bar is unreal', 'my cabana has a doorbell', 'MY lounger. the towel says so.', 'is the smoothie included?', 'they fold towels into swans', 'I could live here, honestly', 'spa at four, snacks at five', 'the infinity pool goes FOREVER', 'gold flakes. on the ice cream.', 'they have a pillow menu', 'someone is playing harp. outside.', 'my sunburn has a sunburn', 'this robe is coming home with me'],
  party: ['THIS SONG!! THIS ONE!!', 'DJ COCONUT!! COCONUT!!', 'my hips have opinions', 'conga line in 5!!', 'is the floor supposed to glow', 'someone hydrate me', 'best. holiday. EVER.', 'I am dancing. do not stop me.', 'the bass is in my SMOOTHIE', 'FREE GLOW STICKS!!', 'my flip-flop flew off. worth it.', 'limbo record: still me', 'they hired a whole steel band', 'one more song. one more. ONE.'],
  market: ['fresh mango! FRESH MANGO!', 'that parrot insulted me', 'half price! for you: full price', 'genuine treasure! probably!', 'I bought a hat. no regrets.', 'three coconuts for a doubloon', 'my stall, my rules', 'the fruit here is UNREAL', 'hand-carved. by a machine.', 'a real pirate map. laminated.', 'haggle? I LOVE to haggle.', 'that is a very expensive shell', 'spices! smell them! SMELL THEM', 'authentic. mostly. sort of.'],
  jungle: ['I heard a monkey. I think.', 'the guided walk is at ten', 'bug spray was a good call', 'is that a waterfall??', 'left at the big rock, right?', 'nature! so much of it!', 'something just moved', 'no bars out here. bliss.', 'the zipline goes over THAT?', 'they built a spa in a tree', 'my sandals were a mistake', 'a butterfly landed on me!!'],
  cove: ['there\'s treasure here. FACT.', 'that wreck is CENTURIES old', 'a crab took my sandal', 'X marks... somewhere', 'rock pools! so many crabs!', 'I found a doubloon! (a bottlecap)', 'the tide sounds so nice', 'shipwreck selfie time', 'smugglers! right here! probably!', 'my detector beeped. it lied.', 'that cave goes back FOREVER', 'kayaks at eleven, treasure at noon'],
  cozy: ['my hedge. my rules.', 'did you see the HOA email?', 'new mailbox day!', 'fresh cookies, anyone?', 'bin day tomorrow!', 'sprinklers at 6 sharp', 'my gnome is judging you', "lawn's looking CRISP", 'block party friday?', 'that fence is 2cm too tall'],
  fancy: ['this fountain? imported.', 'my topiary won an award', 'darling, how gauche', 'we summer elsewhere, obviously', 'the gala is SATURDAY', 'chandelier #3 arrives today', 'is that valet parking?', 'one simply does not jog', 'my dog has a butler', 'this hedge is by an artist'],
  downtown: ['need. more. coffee.', 'this commute is BRUTAL', 'meeting ran LONG', "elevator's down AGAIN", 'lunch is a spreadsheet today', 'hustle never sleeps', "circle back? I'll circle back", 'my inbox says 4,000', 'sell! no wait— buy!', 'is it friday yet'],
  park: ['lovely day for it', 'the ducks are rowdy', "picnic o'clock!", 'kite weather!!', 'ice cream truck?! where!', 'the gazebo band plays at noon', '10k steps, easy', 'frisbee!', 'that squirrel took my chips', 'best bench. tell no one'],
  forest: ['so peaceful out here', 'found the COOLEST rock', "s'mores tonight!", 'trail mix is 90% chocolate', 'shhh… deer!', 'fresh piney air', 'my boots are soaked', 'that birdsong? me. thanks.', 'one with nature right now', 'is moss edible? asking.'],
  beach: ['sunscreen me. NOW.', 'wave check! 🌊', 'sandcastle masterpiece incoming', 'the tide stole my flip-flop', "don't feed the seagulls!!", 'SPF one MILLION', 'crab looked at me funny', 'ice cream, swim, ice cream', 'nap. then more nap.', 'dude, the ocean is SO wet', 'they RAKE this beach at dawn', 'a man brings you cold flannels', 'sunset is at 6:42. sharp.', 'this sand is imported. really.'],
  plaza: ['meet me by the fountain', 'taco truck line is LONG', 'market day is the best day', "the mayor's speaking today!", 'live music by the fountain!', 'street food time', 'fountain coin = one wish', 'free samples!! FREE SAMPLES', 'pigeons own this plaza', 'is there a rally?'],
  zoo: ['the elephant waved at me!!', 'do NOT tap the glass', 'look, flamingos!', 'gift shop. NOW.', 'feeding time!!', 'popcorn! 🍿', 'the lions look hungry', 'penguins: tiny tuxedo guys', 'that monkey has my hat', 'sloth update: still asleep'],
};
const PANIC: Record<string, string[]> = {
  port: ['ABANDON DOCK!!', 'save the RUM!!', 'not my CARGO!!', 'to the boats!! ALL of them!!', 'it ate the pier!!', 'the superyacht!! START IT!!', 'lower the fancy lifeboat!!'],
  resort: ['MY LOUNGER!!', 'not the swim-up bar!!', 'my HOLIDAY!!', 'I paid for ALL-INCLUSIVE!!', 'grab the sunscreen and RUN!!', 'it ate the infinity pool!!', 'not the TOWEL SWANS!!'],
  party: ['THE MUSIC STOPPED!!', 'not the DANCE FLOOR!!', 'conga line — THIS WAY!!', 'DJ RUN!! DJ RUUUN!!', 'it ate the speakers!!', 'save the glow sticks!!', 'last dance!! literally!!'],
  market: ['MY MANGOES!!', 'the parrot saw everything!!', 'closing early!! VERY early!!', 'not my STALL!!', 'take the coconuts!!', 'everything must go!! WE must go!!'],
  jungle: ['INTO THE TREES!!', 'that is NOT a monkey!!', 'follow the trail!! ANY trail!!', 'it ate the waterfall!!', 'the tree spa is GONE!!', 'zipline!! EVERYONE!!'],
  cove: ['it took the TREASURE!!', 'crabs, scatter!!', 'not the shipwreck!!', 'to the rock pools!!', 'X marked THIS. my mistake.', 'grab the shovel and GO!!'],
  cozy: ['NOT my garden gnome!!', 'MY LAWN!!', 'save the HOA!!', 'grab the cookies!!', 'the sprinklers did NOTHING', 'it skipped the HOA form!!'],
  fancy: ['my ANTIQUES!!', 'the CHANDELIER!!', 'call my lawyer!!', 'flee ELEGANTLY!!', 'NOT the topiary!!', 'the butler quit!!'],
  downtown: ['MY STARTUP!!', "the WIFI'S DOWN!!", 'not my oat-milk latte!!', 'OUT OF OFFICE. FOREVER.', 'meeting cancelled, RUN!!', 'this is NOT on my calendar'],
  park: ['not the PICNIC!!', 'the DUCKS!! SAVE THE DUCKS', 'grab the frisbee, RUN!!', 'abandon the sandwiches!!', 'the gazebo!! NOO!!', 'jog!! FOR REAL this time!!'],
  forest: ['BEAR?! no— WORSE!!', 'ABANDON TRAIL!!', "save the s'mores!!", 'the trees are LEAVING!!', 'hug a tree GOODBYE!!', 'nature says RUN!!'],
  beach: ['SAVE THE COOLER!!', 'my SANDCASTLE!!', 'not the towels!!', 'gnarly!! BAD gnarly!!', 'paddle, dude, PADDLE!!', 'even the crabs left!!', 'it ate the raked bit!!'],
  plaza: ['EVERYONE RUN!!', "it's REAL!!", 'save the taco truck!!', 'the fountain!! NOOO!!', 'my churros!!', "this wasn't on the flyer!!"],
  zoo: ['WHO OPENED THE PENS?!', 'the lions are LOOSE!!', 'the flamingos flew AWAY!!', 'even the sloth is running!!', 'save the gift shop!!', "WE'RE the feeding time!!"],
  generic: ['AAAAH!!', 'RUN FOR IT!!', "it's HUNGRY!!", 'tell my cat I love her!!', 'nope nope NOPE!!', 'why is it SMILING?!'],
};
const biomeKey = (b: Biome): string => (b === 'military' || b === 'airport') ? 'downtown' : b;

// ══ WHO IS TALKING ═══════════════════════════════════════════════════════════
// A line should sound like the PERSON, not the postcode. Every Pirate Bay NPC
// carries a voice key; these pools beat the per-biome fallback above. Register:
// silly, warm, no menace. Kept short — a phone speech bubble truncates fast.
const VOICE_AMBIENT: Record<string, string[]> = {
  // out-of-touch guests: everything is a service failure, nothing is their fault
  rich: [
    'this is NOT the good champagne', 'my yacht is double-parked', 'I asked for a SEA view.',
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
    'MUM! MUM! a purple hole!!', 'can we keep it?? can we??', 'I named it Gary',
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
    'pool games in ten! stretch!', 'lost child at the smoothie bar', 'my clipboard, my kingdom',
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
    'nobody said VOID at check-in!!', 'save the champagne!! ALL of it!', 'my robe!! my lovely robe!!',
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
    'not my problem. LEAVING.', 'that is above my pay grade!!', 'I quit! effective IMMEDIATELY',
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

interface Mover { mesh: THREE.Object3D; update(dt: number, t: number, vx: number, vz: number, vR: number): void; }
export interface Life { update(dt: number, t: number, vx: number, vz: number, vR: number): void; }

// ── mesh factories ─────────────────────────────────────────────────────────────
function makeCar(): THREE.Group {
  const g = new THREE.Group();
  const col = pick(PROPS.car);
  const bodyMat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.32, metalness: 0.22 });
  // lower body with a distinct hood + trunk step (reads "car", not "brick")
  const body = new THREE.Mesh(new THREE.BoxGeometry(5.6, 1.4, 2.9), bodyMat);
  body.position.y = 1.25; g.add(body);
  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.0, 2.7), bodyMat);
  hood.position.set(2.6, 1.1, 0); g.add(hood);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.9, 1.35, 2.55),
    new THREE.MeshStandardMaterial({ color: PROPS.carGlass, roughness: 0.12, metalness: 0.4 }));
  cabin.position.set(-0.5, 2.55, 0); g.add(cabin);
  const roofM = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.18, 2.5), bodyMat);
  roofM.position.set(-0.5, 3.3, 0); g.add(roofM);
  // headlights + taillights
  const hl = new THREE.MeshStandardMaterial({ color: 0xfff2c8, emissive: 0xffe9a8, emissiveIntensity: 0.7, roughness: 0.3 });
  const tl = new THREE.MeshStandardMaterial({ color: 0xff4d4d, emissive: 0xd82a2a, emissiveIntensity: 0.55, roughness: 0.3 });
  for (const sz of [-0.95, 0.95]) {
    const a = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.34, 0.5), hl); a.position.set(3.36, 1.2, sz); g.add(a);
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.3, 0.45), tl); b.position.set(-2.82, 1.35, sz); g.add(b);
  }
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x20242c, roughness: 0.9 });
  const hubMat = new THREE.MeshStandardMaterial({ color: 0xc9cdd6, roughness: 0.4, metalness: 0.5 });
  for (const sx of [-1.8, 1.9]) for (const sz of [-1.45, 1.45]) {
    const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.5, 12), wheelMat);
    wh.rotation.x = Math.PI / 2; wh.position.set(sx, 0.8, sz); g.add(wh);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.54, 8), hubMat);
    hub.rotation.x = Math.PI / 2; hub.position.set(sx, 0.8, sz); g.add(hub);
  }
  // most of the fleet upgrades itself to the AI cars once the GLBs stream in
  if (Math.random() < 0.65) vehicleGlb(g, Math.random() < 0.72 ? 'car_sedan' : 'car_taxi', 6.2);
  return g;
}
interface Limbs {
  la: THREE.Object3D; ra: THREE.Object3D; ll: THREE.Object3D; rl: THREE.Object3D;
  torso: THREE.Object3D; head: THREE.Object3D;
  phase: number; bob: number;   // bob = per-person stride height, so a crowd is not a metronome
}

// shared material + geometry pools — hundreds of townsfolk, one GPU footprint
const _matCache = new Map<string, THREE.MeshStandardMaterial>();
function mat(color: number, roughness = 0.85): THREE.MeshStandardMaterial {
  const k = `${color}:${roughness}`;
  let m = _matCache.get(k);
  if (!m) { m = new THREE.MeshStandardMaterial({ color, roughness }); _matCache.set(k, m); }
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
// eyepatch and a cocktail. Only the six pieces that have to animate are separate.
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
const B = {
  sph: nb(new THREE.SphereGeometry(0.5, 8, 6)),           // head
  sphS: nb(new THREE.SphereGeometry(0.5, 7, 5)),          // shoulders, buns, balls
  dot: nb(new THREE.SphereGeometry(0.5, 5, 3)),           // hands, freckles of pattern
  // 8 segments AROUND (the top-down circle has to stay round), only 3 down the
  // profile — nobody ever sees a hair dome edge-on
  hemi: nb(new THREE.SphereGeometry(0.5, 8, 3, 0, Math.PI * 2, 0, Math.PI * 0.56)),
  tube: nb(new THREE.CylinderGeometry(0.5, 0.5, 1, 5, 1, true)),    // open limb segment
  taper: nb(new THREE.CylinderGeometry(0.4, 0.5, 1, 5, 1, true)),   // open, wider at the BOTTOM
  drum: nb(new THREE.CylinderGeometry(0.5, 0.5, 1, 8, 1, true)),    // open torso barrel
  cyl: nb(new THREE.CylinderGeometry(0.5, 0.5, 1, 8)),              // capped: hat bands, trays
  flare: nb(new THREE.CylinderGeometry(0.34, 0.5, 1, 10, 1, true)), // skirts, bobs, robes
  box: nb(new THREE.BoxGeometry(1, 1, 1)),
  tri: nb(new THREE.CylinderGeometry(0.5, 0.5, 1, 3)),              // tricorn brim: a TRIANGLE from above
  disc: nb(new THREE.CylinderGeometry(0.5, 0.5, 1, 9)),
  ring: nb(new THREE.TorusGeometry(0.42, 0.13, 4, 9)),              // armbands, rubber rings, necklaces
  cone: nb(new THREE.ConeGeometry(0.5, 1, 6)),
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
  | 'toque' | 'bellhop' | 'flower' | 'bucket' | 'cap' | 'beanie';
export type Prop = 'cocktail' | 'clipboard' | 'tray' | 'ball' | 'detector' | 'selfie';
// HAIR is the single most important surface at a top-down camera — it is the
// only thing you see of most people. Nine silhouettes, fourteen colours.
export type Hair = 'short' | 'buzz' | 'bob' | 'long' | 'bun' | 'pony' | 'curly' | 'braids' | 'bald';
// GARMENTS change the SHAPE, not just the colour: a sundress flares wider than
// the shoulders, a robe drops to the shins, a tank top shows bare arms.
export type Wear = 'tee' | 'tank' | 'open' | 'dress' | 'sarong' | 'blazer'
  | 'robe' | 'wet' | 'apron' | 'swim' | 'uniform';
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
  prop?: Prop; kid?: boolean;
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
  } else {   // beanie: dome + rolled brim
    out.push(pc(B.hemi, col, 0, 0.10, 0, 1.16, 1.18, 1.16));
    out.push(pc(B.cyl, col, 0, 0.02, 0, 1.21, 0.16, 1.21));
  }
}

function hairParts(out: Geo[], style: Hair, col: number): void {
  if (style === 'bald') return;
  if (style === 'buzz') { out.push(pc(B.hemi, col, 0, 0.03, -0.02, 1.09, 0.66, 1.09)); return; }
  if (style === 'curly') {   // lumpy crown — the most distinctive top-down read
    out.push(pc(B.hemi, col, 0, 0.04, -0.02, 1.08, 0.90, 1.08));
    for (let i = 0; i < 5; i++) {
      const a = i * 1.2566;
      out.push(pc(B.dot, col, Math.sin(a) * 0.35, 0.28 + (i % 2) * 0.11, Math.cos(a) * 0.35 - 0.03, 0.38));
    }
    return;
  }
  out.push(pc(B.hemi, col, 0, 0.05, -0.02, 1.14, 0.98, 1.14));   // shared crown
  if (style === 'bob') out.push(pc(B.flare, col, 0, -0.16, -0.03, 1.24, 0.48, 1.24));
  else if (style === 'long') out.push(pc(B.box, col, 0, -0.38, -0.30, 0.70, 0.86, 0.34));
  else if (style === 'bun') out.push(pc(B.sphS, col, 0, 0.34, -0.30, 0.44));
  else if (style === 'pony') out.push(pc(B.taper, col, 0, -0.24, -0.52, 0.24, 0.66, 0.24, -0.5));
  else if (style === 'braids') for (const sx of [-0.36, 0.36])
    out.push(pc(B.taper, col, sx, -0.30, -0.12, 0.20, 0.68, 0.20));
}

// ARM PIVOT space: origin at the shoulder, hand around y -1.01*s. Everything is
// expressed in units of the arm length `s`, so a child's cocktail ends up in a
// child's hand at a child's scale.
function propParts(out: Geo[], kind: Prop, s: number): void {
  if (kind === 'cocktail') {
    out.push(pc(B.cone, 0xdff6ff, 0, -1.23 * s, 0.18 * s, 0.34 * s, 0.30 * s, 0.34 * s, Math.PI));
    out.push(pc(B.dot, 0xff8a3a, 0, -1.09 * s, 0.18 * s, 0.18 * s));
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
  } else {   // selfie stick
    out.push(pc(B.tube, 0xc8cdd8, 0, -1.34 * s, 0.52 * s, 0.07 * s, 1.50 * s, 0.07 * s, 0.85));
    out.push(pc(B.box, INK, 0, -0.86 * s, 1.09 * s, 0.16 * s, 0.22 * s, 0.05 * s, 1.2));
  }
}

// BODY PIVOT space: origin at the hip line; `sy` is the local shoulder height.
function parrotParts(out: Geo[], side: number, sy: number): void {
  const x = side * 0.50;
  out.push(pc(B.sphS, 0xe8342a, x, sy + 0.32, -0.02, 0.34, 0.42, 0.30));
  out.push(pc(B.dot, 0xffd23f, x, sy + 0.53, 0.05, 0.21));
  out.push(pc(B.dot, 0x2e2a2a, x, sy + 0.50, 0.16, 0.11, 0.11, 0.18));
  out.push(pc(B.cone, 0x2fd8a0, x, sy + 0.16, -0.24, 0.15, 0.34, 0.15, -0.55));
}


// what people WEAR is where they ARE — biome dress codes. `wear` is the pool of
// GARMENTS (which change the silhouette), `shoe` the footwear, so two people in
// the same district still look like two people from directly overhead.
interface Fit {
  shirt: number[]; pants: number[];
  hat?: 'sun' | 'cap' | 'beanie'; hatOdds?: number; pack?: boolean;
  wear?: Wear[]; shoe?: Shoe[]; fun?: boolean;   // fun = dyed hair shows up here
}
const OUTFIT: Record<string, Fit> = {
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
};

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
  const sleeved = wear === 'tee' || wear === 'blazer' || wear === 'uniform' || wear === 'apron' || wear === 'open';
  const fullArm = wear === 'wet' || wear === 'robe';
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
    if (shoe === 'bare') p.push(pc(B.box, skin, 0, fy, 0.07, 0.24 * gr, fh, 0.38));
    else if (shoe === 'flip') {
      // the STRAP goes on top of the foot, not the sole underneath it — from a
      // top-down camera the sole is buried in the sand and the strap is the
      // only part anyone will ever see
      p.push(pc(B.box, skin, 0, fy, 0.07, 0.23 * gr, fh, 0.38));
      p.push(pc(B.box, pick(FLIP_COL), 0, fy + fh * 0.45, 0.10, 0.25 * gr, fh * 0.4, 0.30));
    } else if (shoe === 'boot') {
      p.push(pc(B.tube, INK, 0, -0.78 * L, 0.01, 0.32 * gr, 0.32 * L, 0.32 * gr));
      p.push(pc(B.box, INK, 0, fy, 0.08, 0.28 * gr, fh * 1.25, 0.45));
    } else p.push(pc(B.box, INK, 0, fy, 0.07, 0.26 * gr, fh, 0.42));
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
    if (o?.prop && sx > 0) propParts(p, o.prop, A);
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
  | 'spa' | 'dock' | 'grounds' | 'chef' | 'manager' | 'pirate' | 'dj' | 'diver' | 'digger';

const KID_SHIRT = [0xff4f9a, 0x35d6f0, 0xffd23f, 0x7ef05a, 0xff8a3a, 0xb875ff];
const KID_PANTS = [0x2f6fe0, 0xff5470, 0x2ab8d8, 0x66de93, 0xffb347];

function makeCast(role: Role, dress: string): THREE.Group {
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
        prop: Math.random() < 0.55 ? pick(['cocktail', 'selfie'] as Prop[]) : undefined,
      });
    case 'robe':   // straight out of the spa, and not changing for anybody
      return makePerson(dress, undefined, {
        shirt: WHITE, pants: WHITE, accent: pick([0xd8cfc0, 0x9ac0d8]),
        wear: 'robe', shoe: 'flip', hat: Math.random() < 0.4 ? 'flower' : null,
        glasses: Math.random() < 0.6, necklace: Math.random() < 0.4,
        prop: Math.random() < 0.5 ? 'cocktail' : undefined,
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
        shirt: 0xe8342a, pants: 0xe8342a, accent: WHITE, wear: 'tank', shoe: 'bare',
        pattern: 'plain', hat: 'visor', hatCol: 0xe8342a,
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
        accent: pick([WHITE, GOLD, 0xd83a3a]),
        wear: pick(['open', 'open', 'tee'] as Wear[]), shoe: 'boot',
        pattern: pick(['stripe', 'sash', 'sash'] as Pattern[]),
        hair: pick(['long', 'long', 'braids', 'pony'] as Hair[]),
        hat: Math.random() < 0.62 ? 'tricorn' : 'bandana', hatCol: pick([0xd83a3a, 0x2a2a34, 0x8a2a3a]),
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
    default:         // generic holidaymaker in whatever the district wears
      return makePerson(dress, undefined, {
        glasses: Math.random() < 0.35,
        prop: Math.random() < 0.22 ? pick(['cocktail', 'selfie', 'ball'] as Prop[]) : undefined,
      });
  }
}
// which pool a role SPEAKS from (undefined = fall back to the biome pool)
const VOICE_OF: Partial<Record<Role, string>> = {
  rich: 'rich', robe: 'rich', kid: 'kid', manager: 'manager', pirate: 'pirate',
  waiter: 'staff', bellhop: 'staff', lifeguard: 'staff', spa: 'staff',
  dock: 'staff', grounds: 'staff', chef: 'staff', dj: 'staff',
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
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.44, 12, 10), mat(0xe8342a, 0.75));
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
function makeAnimal(): THREE.Group {
  // three readable species so the "lions are LOOSE" bark is true: elephant,
  // lion, sheep — cycled so every pen mixes
  const g = new THREE.Group();
  const kind = animalN++ % 3;
  const col = kind === 0 ? 0x9aa3b2 : kind === 1 ? 0xf2d06b : 0xf0eee6;
  const mat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.85, flatShading: true });
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
      const ear = new THREE.Mesh(new THREE.CircleGeometry(0.75, 12), new THREE.MeshStandardMaterial({ color: 0x8a92a4, roughness: 0.9, side: THREE.DoubleSide }));
      ear.position.set(1.8, 2.6, sz); ear.rotation.y = sz > 0 ? 0.5 : -0.5; g.add(ear);
    }
  } else if (kind === 1) {   // lion: mane + tail tuft
    const mane = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.4, 8, 14), new THREE.MeshStandardMaterial({ color: 0xc9812a, roughness: 0.95, flatShading: true }));
    mane.position.set(1.7, 2.2, 0); mane.rotation.y = Math.PI / 2; g.add(mane);
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.6, 6), mat);
    tail.position.set(-2.4, 2, 0); tail.rotation.z = 0.7; g.add(tail);
    const tuft = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), new THREE.MeshStandardMaterial({ color: 0xc9812a, roughness: 0.95 }));
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
  const mat = new THREE.MeshStandardMaterial({ color: pick([0xffffff, 0xf0f0f0, 0xe8eef6]), roughness: 0.7, flatShading: true, side: THREE.DoubleSide });
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
  movers.push({ mesh: new THREE.Object3D(), update(dt) { pingClock += dt; } });   // shared clock for panic contagion
  const peds: { mesh: THREE.Object3D; biome: string; panic: number; voice?: string }[] = [];

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
  for (const rc of worldId() === 'pirate' ? [] : ROAD_CENTERS_3D) {
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
  for (let i = 0; i < (worldId() === 'pirate' ? 0 : 30); i++) {
    const mesh = makeCar();
    let horiz = Math.random() < 0.5;
    let centre = pick(ROAD_CENTERS_3D);
    const dir = Math.random() < 0.5 ? 1 : -1;
    // spawn INSIDE a known on-island span — zero retries, zero sea spawns
    let sp0 = spanFor(horiz ? 'h' : 'v', centre, 0);
    for (let k = 0; k < 8 && !sp0; k++) { horiz = Math.random() < 0.5; centre = pick(ROAD_CENTERS_3D); sp0 = spanFor(horiz ? 'h' : 'v', centre, 0); }
    if (!sp0) continue;
    const along0 = rand(sp0[0] + EDGE_M, sp0[1] - EDGE_M);
    const st: CarState = {
      axis: horiz ? 'h' : 'v', dir, centre, along: along0,
      laneOff: dir * LANE * (horiz ? 1 : -1), speed: rand(14, 22), turnCd: rand(0, 2), pauseT: 0,
      arc: null as Arc | null, nAxis: 'h' as 'h' | 'v', nCentre: 0, nAlong: 0, nLaneOff: 0,
    };
    if (st.axis === 'h') mesh.position.set(st.along, 0, centre + st.laneOff); else mesh.position.set(centre + st.laneOff, 0, st.along);
    mesh.rotation.y = st.axis === 'h' ? headingOf(dir, 0) : headingOf(0, dir);
    mesh.userData.ptsMult = 1.5; mesh.userData.qk = 'car'; mesh.userData.mover = true;
    mesh.add(contactShadow(2));
    setShadow(mesh); scene.add(mesh); addEdible(mesh, 2.8);
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
  }

  // ── wanderer (pedestrians, animals, event NPCs) ──────────────────────────
  // panic CONTAGION: a fleeing ped scares nearby strollers, so the void's
  // approach reads as a crowd wave, not one screamer beside a sunbather
  const panicPings: { x: number; z: number; t: number }[] = [];
  let pingClock = 0;
  const tmp = new THREE.Vector3();
  function addWanderer(mesh: THREE.Object3D, hx: number, hz: number, tether: number, base: number, fear: number, radius: number, biome: string, panicLines?: string[], voice?: string) {
    if (!biomeAt(hx, hz)) return;   // don't spawn anyone off the coastline
    let ang = rand(0, Math.PI * 2), hop = 0, fled = false, slideT = 0;
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
        if (dist < vR + fear) {
          // COMMIT to the flee heading: while a coast-slide is active the raw
          // away-vector must not overwrite it, or the ped ping-pongs at the
          // cliff (slide inland → re-flee outward → slide → …) = the edge shake
          if (slideT <= 0) ang = Math.atan2(dz, dx);
          spd = base * 3.4;
          if (!fled) {
            hop = 0.5;   // hop starts on the flee TRANSITION, not every frame
            panicPings.push({ x: mesh.position.x, z: mesh.position.z, t: pingClock });
            if (panicPings.length > 24) panicPings.shift();
            if (Math.random() < 0.5) {
              // a pirate entertainer panics like a pirate wherever they stand
              const pool = panicLines || (voice ? VOICE_PANIC[voice] : null) || PANIC[biome] || PANIC.generic;
              tmp.set(mesh.position.x, 5, mesh.position.z);
              say(tmp, pick(pool), 'panic');
            }
          }
          fled = true;
        } else {
          if (dist > vR + fear + 40) fled = false;
          if (slideT <= 0) {
            ang += rand(-1, 1) * dt * 3;
            const hd = Math.hypot(mesh.position.x - hx, mesh.position.z - hz);
            if (hd > tether) ang = Math.atan2(hz - mesh.position.z, hx - mesh.position.x);
            // contagion: a fresh scream nearby sends this ped scurrying too
            for (const pg of panicPings) {
              if (pingClock - pg.t > 1.5) continue;
              const pdx = mesh.position.x - pg.x, pdz = mesh.position.z - pg.z;
              if (pdx * pdx + pdz * pdz < 625) { ang = Math.atan2(pdz, pdx); spd = base * 2.4; hop = Math.max(hop, 0.3); break; }
            }
          }
        }
        // margin test: the step must keep the WHOLE body on land, not just the
        // center — a ped standing with its center on the cliff lip reads broken
        const stand = (px: number, pz: number) => !!biomeAt(px, pz) && !!biomeAt(px + Math.cos(ang) * 2, pz + Math.sin(ang) * 2);
        let nx = mesh.position.x + Math.cos(ang) * spd * dt, nz = mesh.position.z + Math.sin(ang) * spd * dt;
        if (!stand(nx, nz)) {
          // blocked (coast/water): slide sideways and COMMIT to it for half a
          // second, only reverse as a last resort
          for (const alt of [ang + Math.PI / 2, ang - Math.PI / 2, ang + Math.PI]) {
            const ax2 = mesh.position.x + Math.cos(alt) * spd * dt, az2 = mesh.position.z + Math.sin(alt) * spd * dt;
            if (biomeAt(ax2, az2) && biomeAt(ax2 + Math.cos(alt) * 2, az2 + Math.sin(alt) * 2)) { ang = alt; nx = ax2; nz = az2; slideT = 0.5; break; }
          }
        }
        if (biomeAt(nx, nz)) { mesh.position.x = nx; mesh.position.z = nz; }
        else if (hop > 0) hop = 0;   // pinned: stop the panic bounce so nothing vibrates in place
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
        const dnc = mesh.userData.dancer as { t: number; spin: number; mode?: number } | undefined;
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
        } else if (dnc && hop <= 0) {
          // ── DANCING: everyone on the floor is on the SAME beat (a shared
          // clock), arms up, hips swinging, bobbing on the downbeat. Offset
          // per dancer so it reads as a crowd, not a chorus line of clones.
          dnc.t += dt;
          const beat = dnc.t * 4.4;
          mesh.position.y = Math.abs(Math.sin(beat)) * 0.34;
          mesh.rotation.y += dt * dnc.spin * 1.1;
          if (limbs) {
            const up = 2.3 + Math.sin(beat * 2) * 0.5;      // hands in the air
            limbs.la.rotation.x = -up; limbs.ra.rotation.x = -up + Math.sin(beat) * 0.5;
            limbs.la.rotation.z = 0.35; limbs.ra.rotation.z = -0.35;
            const st = Math.sin(beat) * 0.4;
            limbs.ll.rotation.x = st; limbs.rl.rotation.x = -st;
          }
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

  // scatter pedestrians across walkable biomes
  const pedZones: Biome[] = ['cozy', 'fancy', 'park', 'beach', 'plaza', 'downtown', 'forest', 'zoo',
    // PIRATE BAY is a RESORT — it should feel busier than a suburb
    'port', 'resort', 'party', 'market', 'jungle', 'cove'];
  for (let gy = 0; gy < 6; gy++) for (let gx = 0; gx < 6; gx++) {
    if (worldId() === 'pirate') break;   // no grid here — see the PIRATE BAY block below
    const b = PLAN_GRID[gy][gx];
    if (!pedZones.includes(b)) continue;
    const [cx, cz] = blockCenter3D(gx, gy);
    const n = b === 'party' ? 10 : b === 'market' || b === 'resort' ? 8
      : b === 'beach' || b === 'plaza' ? 6 : b === 'forest' || b === 'jungle' ? 2 : b === 'zoo' ? 5 : 5;
    for (let i = 0; i < n; i++) {
      // half the crowd lives mid-block, half strolls near the sidewalk edges
      const edge = i % 2 === 1;
      const t = HALF_BLOCK_3D * (edge ? rand(0.88, 0.98) : rand(-0.7, 0.7));
      const hx = edge && Math.random() < 0.5 ? cx + (Math.random() < 0.5 ? t : -t) : cx + rand(-HALF_BLOCK_3D * 0.7, HALF_BLOCK_3D * 0.7);
      const hz = edge ? cz + (Math.random() < 0.5 ? t : -t) : cz + rand(-HALF_BLOCK_3D * 0.7, HALF_BLOCK_3D * 0.7);
      addWanderer(makePerson(biomeKey(b)), hx, hz, edge ? 28 : 20, rand(4, 7), 18, 2.4, biomeKey(b));
    }
  }

  // zoo animals: clamped near the pen
  if (worldId() !== 'pirate') {
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
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 8), new THREE.MeshStandardMaterial({ color: 0xff9ec2, roughness: 0.85 }));
      body.scale.set(1.15, 0.9, 1); body.position.y = 1.5; fl.add(body);
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.5, 5), new THREE.MeshStandardMaterial({ color: 0xe86a9a, roughness: 0.9 }));
      leg.position.y = 0.75; fl.add(leg);
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 1.1, 6), new THREE.MeshStandardMaterial({ color: 0xff9ec2, roughness: 0.85 }));
      neck.position.set(0.4, 2.4, 0); neck.rotation.z = -0.35; fl.add(neck);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), new THREE.MeshStandardMaterial({ color: 0xff9ec2, roughness: 0.85 }));
      head.position.set(0.62, 2.95, 0); fl.add(head);
      const beak = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.32, 6), new THREE.MeshStandardMaterial({ color: 0x2c3038, roughness: 0.7 }));
      beak.rotation.z = -Math.PI / 2; beak.position.set(0.85, 2.9, 0); fl.add(beak);
      addWanderer(fl, PENS[2][0] + rand(-6, 6), PENS[2][1] + rand(-6, 6), 8, rand(1.2, 2), 26, 2.2, 'zoo');
    }
  }

  // beach sunbathers: flat out on their towels, working on the tan
  const towelGeo = new THREE.PlaneGeometry(3.6, 5.4);
  for (let gy = 0; gy < 6; gy++) for (let gx = 0; gx < 6; gx++) {
    if (worldId() === 'pirate') break;
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
        18, role === 'kid' ? 1.9 : 2.4, biome, undefined, VOICE_OF[role]);
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
    for (const [x, z] of spread('party', 24, 20)) {
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
  }

  // pond ducks — "the ducks are rowdy" is finally TRUE, and they PARADE:
  // ducks 1-3 tail duck 0 in the classic line
  const duckLine: THREE.Object3D[] = [];
  for (let i = 0; i < (worldId() === 'pirate' ? 0 : 4); i++) {
    const duck = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), new THREE.MeshStandardMaterial({ color: i % 2 ? 0xf6f2da : 0xffd54f, roughness: 0.9 }));
    body.scale.set(1.25, 0.85, 1); body.position.y = 0.36; duck.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), new THREE.MeshStandardMaterial({ color: i % 2 ? 0x7ed57a : 0xf6f2da, roughness: 0.9 }));
    head.position.set(0.42, 0.78, 0); duck.add(head);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.26, 6), new THREE.MeshStandardMaterial({ color: 0xff9a3a, roughness: 0.8 }));
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
    setShadow(grp); addEdible(grp, 5.4); trainGrp = grp; trainCars = cars; trainT = rand(0, 1);
  }
  if (worldId() !== 'pirate') buildTrain();   // no commuter rail at a beach resort
  movers.push({
    get mesh() { return trainGrp!; },
    update(dt) {
      if (!trainGrp) return;
      if (eaten(trainGrp)) { respawn += dt; if (respawn > 6) { respawn = 0; trainGrp = null; buildTrain(); } return; }
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
  const decor = (mesh: THREE.Object3D, x: number, z: number, r = 3) => { if (!insideIsland3(x, z)) return; mesh.position.set(x, 0, z); setShadow(mesh); scene.add(mesh); addEdible(mesh, r); };

  function addEvent(gx: number, gy: number, ambient: string[], panic: string[], build: (x: number, z: number) => void, pedN: number, pedCol?: number) {
    // Maple Isle's staged vignettes (the mayor's rally, the farmers market,
    // the ball game) are that island's fiction. Running them at a pirate
    // resort put "MY STARTUP!!" and "no new voids" on the dance floor.
    if (worldId() === 'pirate') return;
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
      ['ABANDON THE DOCK!!', 'save the RUM!! I mean— cargo!!', 'cut the ropes!! CUT THEM!!',
        'the tender!! LAUNCH THE TENDER!!'],
      7, 0x4dd0e1, ['pirate', 'dock', 'rich']);
    // THE GRAND POOL — the flagship vignette: rich guests being waited on hand
    // and foot, and one event manager insisting it is Coconut Hour
    addPB(9200, 5400, 'resort', false,
      ['is this the ADULTS pool?', 'my lounger has a sea view. barely.',
        'the towel swan lost a wing', 'four straws. FOUR.', 'they know my order. obviously.',
        'the water is 28 degrees exactly', 'someone brought a BALL in here'],
      ['MY LOUNGER!! MY TOWEL!!', 'the pool has GONE!!', 'refund the whole WEEK!!',
        'grab the champagne, leave the bags'],
      4, undefined, ['rich', 'robe', 'waiter', 'kid', 'bellhop']);
  }

  // Mayor's rally at town hall: mayor up on the stage, crowd gathered in front
  addEvent(3, 2,
    ['re-elect me, and the void LEAVES!', 'my fellow citizens…', 'VOIDLING is UNDER CONTROL', 'read my lips: no new voids', 'four more years! four more years!', 'boooo! …sorry, continue', 'and ANOTHER thing about potholes—'],
    ["MAYORS FIRST!! IT'S THE LAW!!", 'IT HAS MY VOTE— I MEAN—', 'SECURITY! SECUR—', 'the rally is CANCELLED!!'],
    (x, z) => {
      // The rally happens on TOWN HALL's steps (north end of the square), the
      // stage facing the fountain — nobody is standing in the water anymore.
      const SZ = z - 12;   // stage line, south of the town hall facade
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
      // the mayor: on the stage, one arm working the crowd
      const mayor = makePerson('downtown', 0x2a2a44);
      mayor.position.set(x, 1.6, SZ); mayor.rotation.y = Math.PI;   // faces the fountain
      setShadow(mayor); scene.add(mayor); addEdible(mayor, 2.4);
      movers.push({
        mesh: mayor,
        update(dt, t) {
          if (eaten(mayor)) return;
          mayor.rotation.y = Math.PI;   // keep facing the crowd
          const L = mayor.userData.limbs as Limbs;
          L.ra.rotation.z = -Math.PI * 0.8 + Math.sin(t * 2.6) * 0.3;   // raised, waving
          L.la.rotation.x = Math.sin(t * 1.4) * 0.25;
        },
      });
      // the crowd: a loose arc between the stage and the fountain
      for (let i = 0; i < 7; i++) {
        const a = Math.PI * (0.15 + 0.7 * (i / 6));
        const cx2 = x + Math.cos(a) * rand(8, 14), cz2 = SZ + 5 + Math.sin(a) * rand(4, 9);
        addWanderer(makePerson('plaza'), cx2, cz2, 3.5, rand(0.6, 1.2), 20, 2.4, 'plaza',
          ['the SPEECH!! RUN!!', 'democracy is DOOMED!!', 'save the ballot box!!']);
      }
    }, 0);

  // Campsite in the forest (s'mores)
  addEvent(4, 0,
    ['s\'mores?! 🔥', 'nature is HEALING', 'one more ghost story…', 'who packed the bug spray?'],
    ['BEAR?! no— WORSE!!', 'ABANDON CAMP!!', 'the tent has NO defense stat!!'],
    (x, z) => {
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
      const flame = new THREE.Mesh(new THREE.ConeGeometry(1.3, 3, 7), new THREE.MeshStandardMaterial({ color: 0xff8a3a, emissive: 0xff5a1a, emissiveIntensity: 1.2, roughness: 0.6 }));
      flame.position.set(x, 2, z); scene.add(flame);
    }, 3);

  // Golf on the park
  addEvent(4, 2,
    ['FORE!! ⛳', 'keep your head down', 'nice putt, coach', 'that\'s a birdie'],
    ['it ate the GREEN!!', 'MY HANDICAP!!', 'not the 18th hole!!'],
    (x, z) => {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 8, 6), new THREE.MeshStandardMaterial({ color: 0xf2f4f8 }));
      pole.position.y = 4; const flag = new THREE.Mesh(new THREE.PlaneGeometry(3, 1.6), new THREE.MeshStandardMaterial({ color: 0xe8453c, side: THREE.DoubleSide }));
      flag.position.set(1.5, 7, 0); const grp = new THREE.Group(); grp.add(pole); grp.add(flag);
      grp.rotation.y = 0.8;   // angled to the play camera — never edge-on invisible
      decor(grp, x - 15, z - 21, 3);   // on the putting green, west of the river
    }, 3, 0xf0f0f0);

  // Beach volleyball
  addEvent(2, 5,
    ['SPIKE IT!! 🏐', 'set! set! SET!', 'point, beach team!', 'ace!'],
    ['sand in my EVERYTHING!!', 'GAME. OVER.', 'serve THAT, void!!'],
    (x, z) => {
      for (const ox of [-6, 6]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 6, 6), new THREE.MeshStandardMaterial({ color: 0x9a7a5a, roughness: 0.8 }));
        post.position.y = 3; decor(post, x + ox, z + 9, 2);   // baked court sits +9 south of block center
      }
      const netTex = (() => {   // a real grid so the net reads over sand
        const cv2 = document.createElement('canvas'); cv2.width = 96; cv2.height = 24;
        const x2 = cv2.getContext('2d')!;
        x2.strokeStyle = 'rgba(255,255,255,0.95)'; x2.lineWidth = 1.4;
        for (let gx2 = 0; gx2 <= 96; gx2 += 8) { x2.beginPath(); x2.moveTo(gx2, 0); x2.lineTo(gx2, 24); x2.stroke(); }
        for (let gy2 = 0; gy2 <= 24; gy2 += 8) { x2.beginPath(); x2.moveTo(0, gy2); x2.lineTo(96, gy2); x2.stroke(); }
        return new THREE.CanvasTexture(cv2);
      })();
      const net = new THREE.Mesh(new THREE.PlaneGeometry(12, 2.4),
        new THREE.MeshBasicMaterial({ map: netTex, transparent: true, opacity: 0.85, side: THREE.DoubleSide }));
      net.position.set(x, 4.4, z + 9); scene.add(net);
      const ball = new THREE.Group();
      const bwhite = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 10), new THREE.MeshStandardMaterial({ color: 0xf6f6f2, roughness: 0.45 }));
      ball.add(bwhite);
      const band = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.14, 8, 20),
        new THREE.MeshStandardMaterial({ color: 0xffd23f, roughness: 0.5 }));
      band.rotation.x = 0.6; ball.add(band);
      const band2 = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.14, 8, 20),
        new THREE.MeshStandardMaterial({ color: 0x4da3ff, roughness: 0.5 }));
      band2.rotation.y = 0.9; ball.add(band2);
      ball.position.y = 1; decor(ball, x + 3, z + 14, 1.5);
    }, 4, 0xff9f4d);

  // Soccer match in the park (second park block)
  addEvent(4, 3,
    ['GOOOAL! ⚽', 'DEFENSE!! DEFENSE!!', 'ref, that was SO offside', 'nutmeg!!'],
    ['REF!! TIME OUT!!', 'it ate the REF?!', 'match ABANDONED!!'],
    (x, z) => {
      // pitch stripes
      const pitch = new THREE.Mesh(new THREE.PlaneGeometry(30, 20),
        new THREE.MeshStandardMaterial({ color: 0x6fbe5e, roughness: 0.95 }));
      pitch.rotation.x = -Math.PI / 2; pitch.position.set(x, 0.06, z); scene.add(pitch);
      const line = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 20), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      line.rotation.x = -Math.PI / 2; line.position.set(x, 0.08, z); scene.add(line);
      // goals
      for (const gx2 of [-14, 14]) {
        const goal = new THREE.Group();
        const white = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
        for (const oz of [-3, 3]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 3, 6), white); p.position.set(0, 1.5, oz); goal.add(p); }
        const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 6, 6), white);
        bar.rotation.x = Math.PI / 2; bar.position.y = 3; goal.add(bar);
        decor(goal, x + gx2, z, 2.6);
      }
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.7, 12, 10), new THREE.MeshStandardMaterial({ color: 0xf4f4f4, roughness: 0.4 }));
      ball.position.y = 0.7; decor(ball, x + rand(-4, 4), z + rand(-3, 3), 1);
    }, 6, 0xffffff);

  // School at recess (fancy district)
  addEvent(2, 4,
    ['recess!! 🎒', 'tag, you\'re it!', 'pop quiz?! nooo', 'the bell! THE BELL!'],
    ['SNOW DAY!! I mean— VOID DAY!!', 'homework CANCELLED!!', 'RUN, class, RUN!!'],
    (x, z) => {
      // AI schoolhouse (bell tower + clock);      // a procedural brick school if offline
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
      glb(scene, addEdible, 'school', x, z - 6, 6.0, { h: 11, fallback: buildFallback });   // r=9 was mathematically uneatable in a 3:00 match
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 7, 6), new THREE.MeshStandardMaterial({ color: 0xc8cdd8, metalness: 0.5 }));
      pole.position.set(x + 9.5, 3.5, z - 3); setShadow(pole); scene.add(pole);
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.3), new THREE.MeshStandardMaterial({ color: 0x9350e8, side: THREE.DoubleSide }));
      flag.position.set(x + 10.6, 6.4, z - 3); scene.add(flag);
    }, 5);

  // ── ambient chatter throttle ────────────────────────────────────────────────
  let chatCd = 2;
  const cpos = new THREE.Vector3();

  return {
    update(dt, t, vx, vz, vR) {
      for (const m of movers) m.update(dt, t, vx, vz, vR);

      // one ambient line at a time, from a pedestrian near the void (on-screen)
      chatCd -= dt;
      if (chatCd <= 0) {
        chatCd = rand(1.8, 3.0);
        const near = peds.filter((p) => !eaten(p.mesh) && Math.hypot(p.mesh.position.x - vx, p.mesh.position.z - vz) < 68);
        if (near.length) {
          const p = pick(near);
          const pool = (p.voice ? VOICE_AMBIENT[p.voice] : null) || AMBIENT[p.biome] || AMBIENT.cozy;
          cpos.set(p.mesh.position.x, 5, p.mesh.position.z);
          say(cpos, pick(pool), 'ambient');
        }
      }

      // events: panic when the void closes in, ambient banter otherwise
      for (const ev of events) {
        const d = Math.hypot(ev.x - vx, ev.z - vz);
        ev.panicked = Math.max(0, ev.panicked - dt);
        ev.cd -= dt;
        if (d < vR + 55 && ev.panicked <= 0) { cpos.set(ev.x, 6, ev.z); say(cpos, pick(ev.panic), 'panic'); ev.panicked = 3.5; }
        else if (ev.cd <= 0 && d < 130) { ev.cd = rand(4, 7); cpos.set(ev.x, 6, ev.z); say(cpos, pick(ev.ambient), 'event'); }
      }
    },
  };
}
