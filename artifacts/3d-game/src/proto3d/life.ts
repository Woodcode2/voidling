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
import { glb, vehicleGlb, contactShadow } from './assets3d';

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
const setShadow = (m: THREE.Object3D) => m.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });

export type Say = (pos: THREE.Vector3, text: string, kind: 'ambient' | 'panic' | 'event') => void;

// ── biome dialogue (from the 2D AMBIENT_BY_BIOME / PANIC_BY_BIOME pools) ─────────
const AMBIENT: Record<string, string[]> = {
  // ── PIRATE BAY: holidaymakers, dock hands, dancers and market traders
  port: ['mind the gangplank!', 'she sails at sunset', 'that crate is DEFINITELY rum', 'seagull stole my lunch AGAIN', 'tide\'s coming in, matey', 'who parked a galleon here', 'cargo says "fragile". it is not', 'salt in my boots. always.'],
  resort: ['two more days of THIS', 'the swim-up bar is unreal', 'sunscreen? never heard of her', 'my lounger. MY lounger.', 'is that a free smoothie??', 'towel on the chair = MINE', 'I could live here honestly', 'spa at four, snacks at five'],
  party: ['THIS SONG!! THIS ONE!!', 'my hips have opinions', 'conga line in 5!!', 'DJ said one more hour!!', 'I am dancing. do not stop me.', 'is the floor supposed to glow', 'someone hydrate me', 'best. holiday. EVER.'],
  market: ['fresh mango! FRESH MANGO!', 'that parrot insulted me', 'half price! for you: full price', 'genuine treasure! probably!', 'I bought a hat. no regrets.', 'three coconuts for a doubloon', 'my stall, my rules', 'the fruit here is UNREAL'],
  jungle: ['I heard a monkey. I think.', 'this trail is very... trail', 'bug spray was a good call', 'is that a waterfall??', 'left at the big rock, right?', 'nature! so much of it!', 'something just moved', 'my phone has no bars. bliss.'],
  cove: ['there\'s treasure here. FACT.', 'that wreck is CENTURIES old', 'a crab took my sandal', 'X marks... somewhere', 'rock pools! so many crabs!', 'I found a doubloon! (a bottlecap)', 'the tide sounds so nice', 'shipwreck selfie time'],
  cozy: ['my hedge. my rules.', 'did you see the HOA email?', 'new mailbox day!', 'fresh cookies, anyone?', 'bin day tomorrow!', 'sprinklers at 6 sharp', 'my gnome is judging you', "lawn's looking CRISP", 'block party friday?', 'that fence is 2cm too tall'],
  fancy: ['this fountain? imported.', 'my topiary won an award', 'darling, how gauche', 'we summer elsewhere, obviously', 'the gala is SATURDAY', 'chandelier #3 arrives today', 'is that valet parking?', 'one simply does not jog', 'my dog has a butler', 'this hedge is by an artist'],
  downtown: ['need. more. coffee.', 'this commute is BRUTAL', 'meeting ran LONG', "elevator's down AGAIN", 'lunch is a spreadsheet today', 'hustle never sleeps', "circle back? I'll circle back", 'my inbox says 4,000', 'sell! no wait— buy!', 'is it friday yet'],
  park: ['lovely day for it', 'the ducks are rowdy', "picnic o'clock!", 'kite weather!!', 'ice cream truck?! where!', 'the gazebo band plays at noon', '10k steps, easy', 'frisbee!', 'that squirrel took my chips', 'best bench. tell no one'],
  forest: ['so peaceful out here', 'found the COOLEST rock', "s'mores tonight!", 'trail mix is 90% chocolate', 'shhh… deer!', 'fresh piney air', 'my boots are soaked', 'that birdsong? me. thanks.', 'one with nature right now', 'is moss edible? asking.'],
  beach: ['sunscreen me. NOW.', 'wave check! 🌊', 'sandcastle masterpiece incoming', 'the tide stole my flip-flop', "don't feed the seagulls!!", 'SPF one MILLION', 'crab looked at me funny', 'ice cream, swim, ice cream', 'nap. then more nap.', 'dude, the ocean is SO wet'],
  plaza: ['meet me by the fountain', 'taco truck line is LONG', 'market day is the best day', "the mayor's speaking today!", 'live music by the fountain!', 'street food time', 'fountain coin = one wish', 'free samples!! FREE SAMPLES', 'pigeons own this plaza', 'is there a rally?'],
  zoo: ['the elephant waved at me!!', 'do NOT tap the glass', 'look, flamingos!', 'gift shop. NOW.', 'feeding time!!', 'popcorn! 🍿', 'the lions look hungry', 'penguins: tiny tuxedo guys', 'that monkey has my hat', 'sloth update: still asleep'],
};
const PANIC: Record<string, string[]> = {
  port: ['ABANDON DOCK!!', 'save the RUM!!', 'not my CARGO!!', 'to the boats!! ALL of them!!', 'it ate the pier!!'],
  resort: ['MY LOUNGER!!', 'not the swim-up bar!!', 'my HOLIDAY!!', 'I paid for ALL-INCLUSIVE!!', 'grab the sunscreen and RUN!!'],
  party: ['THE MUSIC STOPPED!!', 'not the DANCE FLOOR!!', 'conga line — THIS WAY!!', 'DJ RUN!! DJ RUUUN!!', 'it ate the speakers!!'],
  market: ['MY MANGOES!!', 'the parrot saw everything!!', 'closing early!! VERY early!!', 'not my STALL!!', 'take the coconuts!!'],
  jungle: ['INTO THE TREES!!', 'that is NOT a monkey!!', 'follow the trail!! ANY trail!!', 'it ate the waterfall!!'],
  cove: ['it took the TREASURE!!', 'crabs, scatter!!', 'not the shipwreck!!', 'to the rock pools!!'],
  cozy: ['NOT my garden gnome!!', 'MY LAWN!!', 'save the HOA!!', 'grab the cookies!!', 'the sprinklers did NOTHING', 'it skipped the HOA form!!'],
  fancy: ['my ANTIQUES!!', 'the CHANDELIER!!', 'call my lawyer!!', 'flee ELEGANTLY!!', 'NOT the topiary!!', 'the butler quit!!'],
  downtown: ['MY STARTUP!!', "the WIFI'S DOWN!!", 'not my oat-milk latte!!', 'OUT OF OFFICE. FOREVER.', 'meeting cancelled, RUN!!', 'this is NOT on my calendar'],
  park: ['not the PICNIC!!', 'the DUCKS!! SAVE THE DUCKS', 'grab the frisbee, RUN!!', 'abandon the sandwiches!!', 'the gazebo!! NOO!!', 'jog!! FOR REAL this time!!'],
  forest: ['BEAR?! no— WORSE!!', 'ABANDON TRAIL!!', "save the s'mores!!", 'the trees are LEAVING!!', 'hug a tree GOODBYE!!', 'nature says RUN!!'],
  beach: ['SAVE THE COOLER!!', 'my SANDCASTLE!!', 'not the towels!!', 'gnarly!! BAD gnarly!!', 'paddle, dude, PADDLE!!', 'even the crabs left!!'],
  plaza: ['EVERYONE RUN!!', "it's REAL!!", 'save the taco truck!!', 'the fountain!! NOOO!!', 'my churros!!', "this wasn't on the flyer!!"],
  zoo: ['WHO OPENED THE PENS?!', 'the lions are LOOSE!!', 'the flamingos flew AWAY!!', 'even the sloth is running!!', 'save the gift shop!!', "WE'RE the feeding time!!"],
  generic: ['AAAAH!!', 'RUN FOR IT!!', "it's HUNGRY!!", 'tell my cat I love her!!', 'nope nope NOPE!!', 'why is it SMILING?!'],
};
const biomeKey = (b: Biome): string => (b === 'military' || b === 'airport') ? 'downtown' : b;

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
interface Limbs { la: THREE.Object3D; ra: THREE.Object3D; ll: THREE.Object3D; rl: THREE.Object3D; phase: number; }

// shared material + geometry pools — hundreds of townsfolk, one GPU footprint
const _matCache = new Map<string, THREE.MeshStandardMaterial>();
function mat(color: number, roughness = 0.85): THREE.MeshStandardMaterial {
  const k = `${color}:${roughness}`;
  let m = _matCache.get(k);
  if (!m) { m = new THREE.MeshStandardMaterial({ color, roughness }); _matCache.set(k, m); }
  return m;
}
const G = {
  leg: new THREE.BoxGeometry(0.34, 1.15, 0.4),
  torso: new THREE.BoxGeometry(0.95, 1.15, 0.55),
  arm: new THREE.BoxGeometry(0.26, 1.0, 0.3),
  hand: new THREE.BoxGeometry(0.24, 0.22, 0.26),
  head: new THREE.SphereGeometry(0.52, 14, 12),
  cap: new THREE.SphereGeometry(0.55, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.55),
  brim: new THREE.CylinderGeometry(0.85, 0.85, 0.08, 12),
  beanie: new THREE.SphereGeometry(0.56, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5),
  pack: new THREE.BoxGeometry(0.7, 0.85, 0.35),
};

// what people WEAR is where they ARE — biome dress codes
const OUTFIT: Record<string, { shirt: number[]; pants: number[]; hat?: 'sun' | 'cap' | 'beanie'; hatOdds?: number; pack?: boolean }> = {
  // PIRATE BAY: everyone is on holiday, so everyone is in colour
  port: { shirt: [0xe8604d, 0x4d9de8, 0xf0e6d2, 0x2e5a7a], pants: [0x3a4a6a, 0x5a4a3a, 0x2a2a34], hat: 'cap', hatOdds: 0.6 },
  resort: { shirt: [0xff8a5c, 0x4dd0e1, 0xffd54f, 0xff6f91, 0x7be8b0, 0xffffff], pants: [0xff5470, 0x2ab8d8, 0xffb347, 0x66de93], hat: 'sun', hatOdds: 0.7 },
  party: { shirt: [0xff2fa0, 0x7bffe8, 0xffe066, 0xb875ff, 0xff5d7e], pants: [0x2a1240, 0x4a2a8a, 0x1a3a5a], hat: 'sun', hatOdds: 0.25 },
  market: { shirt: [0xff8a3a, 0xffd23f, 0x7ef2a0, 0xff5d7e, 0xf0e6d2], pants: [0x5a4a3a, 0x3a4a6a, 0x6a3a4a], hat: 'sun', hatOdds: 0.45 },
  jungle: { shirt: [0x5a7a4a, 0x8a9a5a, 0xc4a03a, 0x7a8a5a], pants: [0x4a4a3a, 0x5a5a3a], hat: 'cap', hatOdds: 0.65, pack: true },
  cove: { shirt: [0x4dd0e1, 0xffd54f, 0xff8a5c, 0xffffff], pants: [0x2ab8d8, 0xffb347, 0x3a4a6a], hat: 'sun', hatOdds: 0.5 },
  beach: { shirt: [0xff8a5c, 0x4dd0e1, 0xffd54f, 0xff6f91, 0x7be8b0, 0xffffff], pants: [0xff5470, 0x2ab8d8, 0xffb347, 0x66de93], hat: 'sun', hatOdds: 0.5 },
  downtown: { shirt: [0x2e3a55, 0x3d4756, 0x545c6e, 0xffffff, 0xb9c6dd, 0x6e5c7a], pants: [0x232a3a, 0x2f2f38, 0x3a3f4d] },
  fancy: { shirt: [0x8a5cb8, 0xd8a848, 0xc65a78, 0x4a7a9a, 0xf0ead8], pants: [0x2a2a34, 0x4a3a5a, 0x5a4a3a] },
  park: { shirt: [0xffffff, 0xe8604d, 0x58c470, 0x4da3ff, 0xffd54f], pants: [0x3a4a6a, 0x2a2a34, 0x58c470], hat: 'cap', hatOdds: 0.45 },
  forest: { shirt: [0x5a7a4a, 0x8a6a4a, 0xc4693a, 0x7a8a5a], pants: [0x4a4a3a, 0x5a4a3a, 0x3a4a3a], hat: 'beanie', hatOdds: 0.6, pack: true },
  cozy: { shirt: [0xe8604d, 0x4d9de8, 0x58c470, 0xf0c050, 0xc65a9a, 0x7a6ae8], pants: [0x3a4a6a, 0x5a4a3a, 0x2a2a34, 0x6a3a4a, 0x3a5a4a] },
  zoo: { shirt: [0xf0c050, 0xe8604d, 0x4da3ff, 0xc8b088], pants: [0x3a4a6a, 0x8a7a5a], hat: 'cap', hatOdds: 0.3 },
  plaza: { shirt: [0xe8604d, 0x4d9de8, 0x58c470, 0xf0c050, 0xffffff, 0x9a6ae8], pants: [0x3a4a6a, 0x2a2a34, 0x5a4a3a] },
};

function makePerson(biome?: string, colOverride?: number): THREE.Group {
  // little character with real limbs + a walk cycle — dressed for their biome
  const g = new THREE.Group();
  const fit = OUTFIT[biome ?? 'cozy'] ?? OUTFIT.cozy;
  const shirt = mat(colOverride ?? pick(fit.shirt));
  const pants = mat(pick(fit.pants), 0.9);
  const skin = mat(pick(PROPS.skin), 0.75);
  const hair = mat(pick([0x2a2024, 0x6a4a2a, 0xd8b46a, 0x8a3a2a, 0x4a4a52, 0xe8e2d8]), 0.9);
  // legs (pivot at hip so they swing)
  const mkLeg = (sx: number) => {
    const hip = new THREE.Group(); hip.position.set(sx, 1.15, 0);
    const leg = new THREE.Mesh(G.leg, pants);
    leg.position.y = -0.57; hip.add(leg); g.add(hip); return hip;
  };
  const ll = mkLeg(-0.24), rl = mkLeg(0.24);
  // torso
  const torso = new THREE.Mesh(G.torso, shirt);
  torso.position.y = 1.75; g.add(torso);
  // arms (pivot at shoulder)
  const mkArm = (sx: number) => {
    const sh = new THREE.Group(); sh.position.set(sx, 2.2, 0);
    const arm = new THREE.Mesh(G.arm, shirt);
    arm.position.y = -0.5; sh.add(arm);
    const hand = new THREE.Mesh(G.hand, skin);
    hand.position.y = -1.05; sh.add(hand);
    g.add(sh); return sh;
  };
  const la = mkArm(-0.62), ra = mkArm(0.62);
  // head + hair cap
  const head = new THREE.Mesh(G.head, skin);
  head.position.y = 2.9; g.add(head);
  const cap = new THREE.Mesh(G.cap, hair);
  cap.position.y = 2.98; g.add(cap);
  // biome accessories: sun hats at the beach, caps in the park, beanies + packs on the trail
  if (fit.hat && Math.random() < (fit.hatOdds ?? 0.4)) {
    const hatCol = mat(pick([0xf6e3b8, 0xff6f91, 0xffffff, 0xe8604d, 0x4da3ff]), 0.9);
    if (fit.hat === 'sun') {
      const brim = new THREE.Mesh(G.brim, hatCol); brim.position.y = 3.18; g.add(brim);
      const top = new THREE.Mesh(G.beanie, hatCol); top.position.y = 3.1; g.add(top);
    } else if (fit.hat === 'cap') {
      const top = new THREE.Mesh(G.beanie, hatCol); top.position.y = 3.12; g.add(top);
      const bill = new THREE.Mesh(G.hand, hatCol); bill.scale.set(2.2, 0.35, 1.6); bill.position.set(0, 3.14, 0.55); g.add(bill);
    } else {
      const top = new THREE.Mesh(G.beanie, hatCol); top.scale.y = 1.25; top.position.y = 3.05; g.add(top);
    }
  }
  if (fit.pack && Math.random() < 0.7) {
    const pk = new THREE.Mesh(G.pack, mat(pick([0xc4693a, 0x4a7a9a, 0x8a5cb8]), 0.9));
    pk.position.set(0, 1.85, -0.48); g.add(pk);
  }
  g.userData.limbs = { la, ra, ll, rl, phase: Math.random() * 6 } as Limbs;
  return g;
}
let animalN = 0;
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
  const peds: { mesh: THREE.Object3D; biome: string; panic: number }[] = [];

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
  for (const rc of ROAD_CENTERS_3D) {
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
  for (let i = 0; i < 30; i++) {
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
  function addWanderer(mesh: THREE.Object3D, hx: number, hz: number, tether: number, base: number, fear: number, radius: number, biome: string, panicLines?: string[]) {
    if (!biomeAt(hx, hz)) return;   // don't spawn anyone off the coastline
    let ang = rand(0, Math.PI * 2), hop = 0, fled = false, slideT = 0;
    mesh.userData.ptsMult = 1.5;   // moving prey beats furniture of the same size
    mesh.userData.mover = true;    // steers itself — the magnet must never grab it
    const cs = contactShadow(radius * 0.55);   // grounded on every quality tier
    mesh.add(cs);
    mesh.position.set(hx, 0, hz); setShadow(mesh); scene.add(mesh); addEdible(mesh, radius);
    const rec = { mesh, biome, panic: 0 };
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
              const pool = panicLines || PANIC[biome] || PANIC.generic;
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
        mesh.rotation.y = -ang + Math.PI / 2;
        if (hop > 0) { hop -= dt; mesh.position.y = Math.abs(Math.sin(hop * 12)) * 0.8; } else mesh.position.y = 0;
        cs.position.y = 0.045 - mesh.position.y;   // the blob stays ON the ground while its owner hops
        // walk cycle: arms + legs swing with travel speed
        const limbs = mesh.userData.limbs;
        const dnc = mesh.userData.dancer as { t: number; spin: number } | undefined;
        if (dnc && hop <= 0) {
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
          limbs.phase += dt * spd * 2.4;
          const sw = Math.sin(limbs.phase) * 0.55;
          limbs.ll.rotation.x = sw; limbs.rl.rotation.x = -sw;
          limbs.la.rotation.x = -sw * 0.8; limbs.ra.rotation.x = sw * 0.8;
        }
      },
    });
    return rec;
  }

  // scatter pedestrians across walkable biomes
  const pedZones: Biome[] = ['cozy', 'fancy', 'park', 'beach', 'plaza', 'downtown', 'forest', 'zoo',
    // PIRATE BAY is a RESORT — it should feel busier than a suburb
    'port', 'resort', 'party', 'market', 'jungle', 'cove'];
  for (let gy = 0; gy < 6; gy++) for (let gx = 0; gx < 6; gx++) {
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
  {
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

  // pond ducks — "the ducks are rowdy" is finally TRUE, and they PARADE:
  // ducks 1-3 tail duck 0 in the classic line
  const duckLine: THREE.Object3D[] = [];
  for (let i = 0; i < 4; i++) {
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
    const cx = rand(-180, 180), cz = rand(-180, 180), fly = rand(26, 34);
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
          else { ang += rand(-1, 1) * dt * 2; if (Math.hypot(mesh.position.x - cx, mesh.position.z - cz) > 70) ang = Math.atan2(cz - mesh.position.z, cx - mesh.position.x); mesh.position.x += Math.cos(ang) * 10 * dt; mesh.position.z += Math.sin(ang) * 10 * dt; }
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
  // Three staged scenes with their own crowds and their own voices, so the
  // resort has beats the way Maple Isle has its rally and its ball game.
  if (worldId() === 'pirate') {
    const addPB = (gx: number, gy: number, amb: string[], pan: string[], n: number, col?: number) => {
      const [x, z] = blockCenter3D(gx, gy);
      for (let i = 0; i < n; i++) {
        const p2 = makePerson('party', col);
        p2.userData.dancer = { t: rand(0, 6), spin: Math.random() < 0.5 ? 1 : -1 };
        addWanderer(p2, x + rand(-16, 16), z + rand(-16, 16), 3, rand(0.3, 0.8), 24, 2.4, 'generic', pan);
      }
      events.push({ x, z, ambient: amb, panic: pan, cd: rand(1, 4), panicked: 0 });
    };
    // THE DJ SET — the biggest crowd on the island, all on the same beat
    addPB(2, 4,
      ['DJ COCONUT! DJ COCONUT!', 'DROP IT!! DROP THE THING!!', 'my legs have given up. still dancing.',
        'this is the BEST song', 'one more!! ONE MORE!!', 'I love everyone here'],
      ['THE DJ IS GONE!!', 'save the SPEAKERS!!', 'conga OUT!! conga OUT!!', 'the beat has DROPPED. us.'],
      9, 0xff2fa0);
    // THE MARKET HAGGLE — traders and a very rude parrot
    addPB(3, 1,
      ['final price! FINAL price!', 'the parrot called me a name', 'mango so good it is illegal',
        'genuine pirate gold, probably', 'two for one! one for two!'],
      ['MY MANGOES!! MY LIFE!!', 'take the stall!! LEAVE the stall!!', 'the parrot KNEW'],
      6, 0xffd23f);
    // THE TREASURE DIG — everyone convinced X marks right here
    addPB(0, 0,
      ['X marks... hang on', 'I felt something! it was a crab', 'DIG! we are SO close!',
        'my metal detector loves bottlecaps', 'the map is upside down, isn\'t it'],
      ['LEAVE THE TREASURE!!', 'the crabs were a WARNING', 'RUN! bring the shovel!!'],
      5, 0xffb054);
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
          const pool = AMBIENT[p.biome] || AMBIENT.cozy;
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
