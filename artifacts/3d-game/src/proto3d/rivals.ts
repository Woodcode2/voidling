// Rival voids — the AI "family". They roam the island, eat from the SAME food
// pool as the player, and grow. Whoever consumes the most by the final whistle
// wins — so a rival really can beat you. Each is a cute coloured void (a tinted
// fresnel orb + glow + billboarded eyes) with a name and a live score.
import * as THREE from 'three';
import { inWater3, type Biome } from './island';
import { SKINS, type Skin } from './palette';
import { buildAccessory, makeVoidBody, applySkinToBody } from './void3d';

export interface RivalEdible { mesh: THREE.Object3D; radius: number; }
// live match context the family needs to race the player fairly: the clock
// length, the player's score (the rubber band reads it) and the shared HAPPY
// HOUR multiplier (the family eats the bake sale too).
export interface RivalCtx { matchLen: number; playerScore: number; fever: number; }
// what a rival COSTS you when it catches you — the HUD reports both halves
export interface RivalHit { shrink: number; steal: number; hunter: boolean; }
export interface Rival { name: string; color: number; score: number; x: number; z: number; r: number; pulse?: number; arch?: string; hunting?: boolean; joined?: boolean; }
export interface Rivals {
  list: Rival[];
  update(dt: number, t: number, playerX: number, playerZ: number, playerR: number, ctx?: RivalCtx): void;
  onJoin?: (name: string, color: number, x: number, z: number, arch: Arch) => void;
  onRivalEaten?: (name: string, pts: number, x: number, z: number, r: number, marquee: boolean) => void; // you swallowed one
  onPlayerBitten?: (name: string, hit: RivalHit) => void; // one bit YOU
  onSpeak?: (x: number, z: number, line: string) => void; // personality bubbles
  onCharge?: (name: string, x: number, z: number) => void;   // the BULLY winds up a lunge
  onNearMiss?: (name: string, x: number, z: number) => void; // …and it whiffs. the retellable beat.
  onStuffed?: (name: string, x: number, z: number) => void;  // the threat turns into the MEAL
  reset(matchLen?: number): void;                        // instant rematch
}

const NAMES = ['WOBBLES', 'GLITZ', 'BITSY', 'CHOMPZILLA', 'DOZER'];
// ── ARCHETYPES ───────────────────────────────────────────────────────────────
// The family used to path to food and back — five different faces running one
// brain. Every member now plays a game a child can NAME after watching it for
// ten seconds, and the archetype is FIXED to the name so it is learnable:
//   BULLY   CHOMPZILLA  hunts YOU. charges, bites, gloats. the threat.
//   COWARD  WOBBLES     bolts from anything bigger. wide berth, jittery.
//   SHOWOFF GLITZ       crosses the whole island for the biggest landmark.
//   COPYCAT BITSY       drives your own route about 7 seconds behind you.
//   HOARDER DOZER       camps one district and never leaves it.
export type Arch = 'BULLY' | 'COWARD' | 'SHOWOFF' | 'COPYCAT' | 'HOARDER';
export const ARCH_OF: Record<string, Arch> = {
  CHOMPZILLA: 'BULLY', WOBBLES: 'COWARD', GLITZ: 'SHOWOFF', BITSY: 'COPYCAT', DOZER: 'HOARDER',
};
// cruising speed IS characterisation: Grandpa ambles, the bully drives
const ARCH_SPD: Record<Arch, number> = {
  BULLY: 27, COWARD: 25, SHOWOFF: 26, COPYCAT: 25, HOARDER: 16,
};
// the family: anxious / show-off / baby / drama queen / sleepy. Names ARE the
// personalities now (Wobbles saying "I KNEW this would happen" is the joke).
// All lines <=26 chars so bubbles never wrap.
export const RIVAL_VOICE: Record<string, {
  taunt: string[]; respawn: string[]; eaten: string[];
  steal: string[]; escape: string[]; bite: string[];
  nearBig: string[]; nearSmall: string[]; rankUp: string[];
  visit: string[];   // the swing-by-and-say-hi lines (family, not enemies)
  // ARCHETYPE lines: fired at the exact moment the behaviour becomes legible,
  // so what a family member SAYS matches what it is DOING.
  arch: string[];
  charge?: string[];    // BULLY only: the wind-up before a lunge
  stuffed?: string[];   // BULLY only: the turn from threat into marquee meal
}> = {
  WOBBLES: {
    taunt: ['sorry!! but also: yum!!', 'I ate it?? I ATE IT!', "don't be mad don't be mad", 'oh no. am I winning??', 'was that ok to eat??', 'eek— I mean… NOM!'],
    respawn: ['I KNEW this would happen', 'ow. told you. OW.', 'respawning. nervously.', "is it safe?? it's not."],
    eaten: ['called it.', "it's dark in here??", 'worst. day. EVER.'],
    steal: ['I was gonna eat that!!', 'that was MY snack!! eep', 'rude!! politely rude!!'],
    escape: ['MY WHOLE LIFE FLASHED!!', 'too close too close!!', 'never doing that again'],
    bite: ['SORRY!! it was reflex!!', 'I panicked and CHOMPED', 'oh no I bit someone'],
    nearBig: ['am I… bigger?? AAAH', 'being big is SCARY', "don't make me use this"],
    nearSmall: ['NOPE NOPE NOPE NOPE', 'pretend I am a rock', 'walking away quickly!!'],
    rankUp: ['I passed you?? sorry!!', 'winning is stressful!!', 'how did THAT happen'],
    visit: ['hi!! just checking on you', 'you look bigger?? EEP', 'stay safe ok?? ok bye!!', 'I brought moral support'],
    arch: ['RUNNING AWAY NOW!!', 'nope nope nope nope NOPE', 'I choose: not that!!', 'scattering!! like a bird!!'],
  },
  GLITZ: {
    taunt: ['no photos, please', 'skill. pure skill.', 'the crowd goes WILD', "bet you can't do THAT", 'flawless. as usual.', 'top THAT, superstar'],
    respawn: ['I meant to do that', 'nobody saw that. good.', 'a fluke. obviously.', 'my glow!! ruined!!'],
    eaten: ["unfair!! I'm the STAR", 'my fans will hear of this', 'rude AND jealous'],
    steal: ['excuse me?? RESERVED', 'that had MY name on it', 'the AUDACITY. stunning.'],
    escape: ['TOO SLOW! hehehe', 'you almost touched FAME', 'catch me? adorable.'],
    bite: ['delicious. obviously.', 'a five-star bite', "don't take it personal"],
    nearBig: ["aww. you're teeny.", 'love the mini look', 'so small. so brave.'],
    nearSmall: ["I'm not scared. (I am)", 'my agent said RUN', 'this is bad for my brand'],
    rankUp: ['outta my way, slowpoke', 'first place suits me', 'and THAT is star power'],
    visit: ['came to bless your day', 'you may admire me. go.', 'we are SO photogenic', 'twinning!! sort of.'],
    arch: ['that one. the BIG one.', 'only landmarks, darling', 'watch me eat something HUGE', 'small snacks are for YOU'],
  },
  BITSY: {
    taunt: ['nom nom nom hehe', 'I did a WINNING!', 'big bite! BIGGEST bite!', 'dat one was YUMMY', 'me first! ME FIRST!', 'look!! I ate a house!!'],
    respawn: ['owie.', 'I want a do-over!!', 'not fair!! *sniff*', 'nap. then REVENGE.'],
    eaten: ['waaaAAAH!!', "you're a MEANIE", "I'm telling CHOMPZILLA"],
    steal: ['MINE! dat was MINE!!', 'gimme it BACK!!', "I'm telling DOZER!!"],
    escape: ["can't catch meee!", 'hehehe too wiggly!', 'nyoom nyoom nyoom!'],
    bite: ['CHOMP! hehehe', 'you taste like grape', 'oopsie chompsie!'],
    nearBig: ["I'm da BIG kid now!", 'look how BIG I got!!', 'fear my tiny might!!'],
    nearSmall: ['eep!! big person!!', 'be nice to babies!!', 'I want my blankie!!'],
    rankUp: ['I winned past you!!', 'zoom zoom, slowpoke!', 'babies rule!!'],
    visit: ['HI HI HI HI HI!!', 'watcha eating?? can I??', "tag!! you're it!! hehe", 'I missed you SO much'],
    arch: ['I go where YOU go!!', 'copying you!! hehehe', 'me too!! me too!! me TOO', 'following!! following!!'],
  },
  CHOMPZILLA: {
    taunt: ['BEHOLD: dinner theater', 'a FEAST worthy of ME', 'the island? MY stage.', 'gasp. magnificent. me.', 'act two: I DEVOUR', "applause. I'll wait."],
    respawn: ['the AUDACITY!!', 'I shall RETURN!! *swish*', 'my villain origin story', 'curtain?? ALREADY??'],
    eaten: ['a TRAGEDY in one act', 'the drama!! the DRAMA!!', 'eaten?! by an AMATEUR?!'],
    steal: ['STOP!! THIEF!! DRAMA!!', 'my dinner!! MY SCENE!!', 'you DARE upstage me?!'],
    escape: ['DENIED! crowd goes wild', 'you missed! DRAMATIC!', 'the plot THICKENS!!'],
    bite: ['a taste of VICTORY!!', 'consider that ACT ONE', 'delicious foreshadowing'],
    nearBig: ['tremble, tiny snack!!', 'bow before CHOMPZILLA', 'the stage is MINE now'],
    nearSmall: ["spare me!! I'm FAMOUS", 'not the FACE!!', 'exit!! stage LEFT!!'],
    rankUp: ['the LEAD is my destiny', 'a STAR is reborn!!', 'weep, understudy!!'],
    visit: ['a VISIT from greatness', 'we feast TOGETHER, kid', 'the gala is SATURDAY', 'family!! DRAMATIC hug!!'],
    arch: ['I am HUNTING you, dear', 'you. are. the MAIN COURSE', 'I have chosen my snack', 'run, darling. RUN.'],
    charge: ['ACT TWO: I DEVOUR!!', 'HERE I COME, DARLING!!', 'CHAAARGE!! dramatically!!', 'brace yourself, SNACK!!'],
    stuffed: ['ohh… I am SO full…', 'too full… to chase… ugh', 'do NOT eat me. I mean it', 'I regret… everything…'],
  },
  DOZER: {
    taunt: ['huh? oh. I ate that.', '*yawn* …delicious', 'winning is exhausting', 'five more bites…', 'zzz… crunch… zzz', 'oops. swallowed a bus.'],
    respawn: ['best nap ever', "wake me when it's safe", 'ugh. mornings.', 'snooze… then chomp'],
    eaten: ['finally, a nap', 'cozy in here, actually', 'zzzzz…'],
    steal: ['hey… I called dibs… zzz', 'that was my breakfast…', 'rude. *yawns angrily*'],
    escape: ['phew. back to my nap', 'cardio?? never again', '*escapes sleepily*'],
    bite: ['mm. midnight snack.', 'sorry. sleep-chomping.', '*bites in his sleep*'],
    nearBig: ['oh. when did I get big', 'being big is nap-sized', 'huh. tall now.'],
    nearSmall: ['zzz— AAH okay running', 'five more minutes!!', 'too sleepy to flee…'],
    rankUp: ['passed you in my sleep', '*overtakes while yawning*', 'zzzoom.'],
    visit: ['strolled by… *yawn* hi', 'nice spot for a nap', 'you grew. neat. zzz', 'grandpa hug… later…'],
    arch: ['this is MY spot. zzz', 'not moving. ever. bye.', 'I live here now', 'my corner. my snacks.'],
  },
};
const pickLine = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
const COLORS = [0x2fd8c0, 0xff6fb0, 0xff9a3a, 0x7ed57a, 0x4d8ff0];
const rand = (a: number, b: number) => a + Math.random() * (b - a);
// must match the player model (2D game constants through the 0.05 map scale)
const EAT_RATIO = 1.11, R_CAP = 12, START_R = 0.9, LAW_RATE = 0.025;
const growR = (R: number, eR: number) => {
  const rookie = R < 1.7 ? 1.6 : R < 2.5 ? 1.3 : 1;
  const diminish = Math.sqrt(START_R / Math.max(START_R, R));
  return Math.min(R_CAP, Math.sqrt(R * R + 0.5 * eR * eR * rookie * diminish));
};
// the player's own world speed, as a pure function of radius (prototype3d
// derives it from the camera distance). The BULLY's charge is tuned AGAINST
// this number, so a lunge is always a near thing at every size — outrunnable
// if you are steering, catchable if you are not looking.
const playerSpeed = (pr: number) =>
  Math.min(96, 16 * (Math.min(340, Math.max(26, 38 * Math.pow(pr / START_R, 0.82))) / 50));
// ── the family's scoring model ───────────────────────────────────────────────
// It used to be a flat radius*12 with no combo, no prey bonus and no rush
// multiplier, against a player who had all three — so the family ate 2.2-3.4x
// more of the island and still lost 15:1. They now score on the SAME terms.
const RIVAL_COMBO_HOLD = 1.9;   // slightly longer than the player's 1.6: they sweep, they don't dart

let _rivalGlowTex: THREE.CanvasTexture | null = null;
function rivalGlowTex(): THREE.CanvasTexture {
  if (_rivalGlowTex) return _rivalGlowTex;
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const g = cv.getContext('2d')!;
  const grd = g.createRadialGradient(64, 64, 8, 64, 64, 64);
  grd.addColorStop(0, 'rgba(255,255,255,0.5)');
  grd.addColorStop(0.45, 'rgba(255,255,255,0.16)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  _rivalGlowTex = new THREE.CanvasTexture(cv);
  return _rivalGlowTex;
}

const rivalTexCache = new Map<string, THREE.Texture>();
// every rival body material, so the shared shader's clock + jelly can be
// driven once per frame (the wobble is what makes them feel ALIVE)
const rivalMats: THREE.ShaderMaterial[] = [];
function makeRivalMesh(sk: Skin, idx = 0): { group: THREE.Group; eyes: THREE.Group; halo: THREE.Mesh } {
  const color = sk.rim, glowCol = sk.glow;
  const group = new THREE.Group();
  // THE SAME BODY THE HERO WEARS — jelly wobble, four-stop fresnel, character
  // sheen and the hide pattern. The old two-stop tint is why the family read
  // as flat blue stickers sitting next to a living orb.
  const bodyMat = makeVoidBody();
  applySkinToBody(bodyMat, sk);
  rivalMats.push(bodyMat);
  if (sk.tex) {
    let t = rivalTexCache.get(sk.tex);
    if (!t) {
      t = new THREE.TextureLoader().load(sk.tex, () => { bodyMat.uniforms.uTexAmt.value = 1; });
      t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.ClampToEdgeWrapping;
      t.colorSpace = THREE.SRGBColorSpace;
      rivalTexCache.set(sk.tex, t);
    } else bodyMat.uniforms.uTexAmt.value = t.image ? 1 : 0;
    bodyMat.uniforms.uTex.value = t;
    if (!bodyMat.uniforms.uTexAmt.value) {
      const t2 = t;
      const poll = setInterval(() => { if (t2.image) { bodyMat.uniforms.uTexAmt.value = 1; clearInterval(poll); } }, 500);
    }
  }
  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 30), bodyMat); group.add(body);
  // legendary flair: the SAME accessory rig the player's skin wears
  if (sk.acc) group.add(buildAccessory(sk.acc));
  // tinted bloom sprite — the same treatment as the player hero. (The old
  // additive back-side shell read as a soap-bubble outline next to the hero.)
  const bloom = new THREE.Sprite(new THREE.SpriteMaterial({ map: rivalGlowTex(), color: glowCol, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.5 }));
  bloom.scale.set(2.0, 2.0, 1); bloom.renderOrder = -1;
  group.add(bloom);
  // billboarded eyes
  const eyes = new THREE.Group(); group.add(eyes);
  for (const sx of [-0.32, 0.32]) {
    // depthTest off + renderOrder: billboarded circles can never slice into the
    // body sphere at steep camera angles (the "glitchy half-buried eyes")
    const white = new THREE.Mesh(new THREE.CircleGeometry(0.2, 20), new THREE.MeshBasicMaterial({ color: 0xffffff, depthWrite: false, depthTest: false }));
    white.position.set(sx, 0.08, 1.0); white.renderOrder = 5;
    const pupil = new THREE.Mesh(new THREE.CircleGeometry(0.11, 16), new THREE.MeshBasicMaterial({ color: 0x140a26, depthWrite: false, depthTest: false }));
    pupil.position.set(sx, 0.08, 1.02); pupil.renderOrder = 6;
    // catchlight rides the pupil (child) so it tracks the look direction
    const glint = new THREE.Mesh(new THREE.CircleGeometry(0.038, 10), new THREE.MeshBasicMaterial({ color: 0xffffff, depthWrite: false, depthTest: false }));
    glint.position.set(-0.032, 0.034, 0.01); glint.renderOrder = 7; pupil.add(glint);
    eyes.add(white); eyes.add(pupil);
  }
  // family face, not googly-eye NPC face: blush + a tiny kawaii smile
  // (added AFTER the 4 tracked eye meshes — the aim loop skips index >= 4)
  for (const sx of [-0.44, 0.44]) {
    const blush = new THREE.Mesh(new THREE.CircleGeometry(0.085, 14),
      new THREE.MeshBasicMaterial({ color: 0xff7da8, transparent: true, opacity: 0.5, depthWrite: false, depthTest: false }));
    blush.scale.set(1.1, 0.72, 1); blush.position.set(sx, -0.1, 1.0); blush.renderOrder = 5;
    eyes.add(blush);
  }
  {
    const smile = new THREE.Mesh(new THREE.CircleGeometry(0.095, 24, Math.PI, Math.PI),
      new THREE.MeshBasicMaterial({ color: 0x2a1040, depthWrite: false, depthTest: false }));
    smile.position.set(0, -0.16, 1.0); smile.renderOrder = 5;
    eyes.add(smile);
  }
  // personality accessory: sweat drop / star shades / hair curl / crown / nightcap
  // (skipped when a legendary skin brings its own 3D accessory — no double hats)
  const bmat = (c2: number) => new THREE.MeshBasicMaterial({ color: c2 });
  if (sk.acc) { /* legendary accessory IS the look */ }
  else if (idx % 5 === 0) {   // WOBBLES: sweat drop at the temple
    const drop = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), new THREE.MeshBasicMaterial({ color: 0x8fd8ff, transparent: true, opacity: 0.9, depthWrite: false }));
    drop.scale.set(1, 1.5, 1); drop.position.set(0.5, 0.72, 0.5); group.add(drop);
  } else if (idx % 5 === 1) {   // GLITZ: star shades (billboard with the eyes)
    for (const sx of [-0.32, 0.32]) {
      const lens = new THREE.Mesh(new THREE.CircleGeometry(0.15, 16), new THREE.MeshBasicMaterial({ color: 0x140a26, depthTest: false, depthWrite: false }));
      lens.position.set(sx, 0.1, 1.03); lens.renderOrder = 7; eyes.add(lens);
    }
    const bridge = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.03), new THREE.MeshBasicMaterial({ color: 0x140a26, depthTest: false, depthWrite: false }));
    bridge.position.set(0, 0.12, 1.03); bridge.renderOrder = 7; eyes.add(bridge);
  } else if (idx % 5 === 2) {   // BITSY: single baby hair curl
    const curl = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.035, 8, 14, Math.PI * 1.4), bmat(new THREE.Color(color).multiplyScalar(0.7).getHex()));
    curl.position.set(0, 1.02, 0); curl.rotation.set(0.4, 0, 0.3); group.add(curl);
  } else if (idx % 5 === 3) {   // CHOMPZILLA: rakishly tilted gold crown
    const crown = new THREE.Group();
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.14, 0.13, 8, 1, true), new THREE.MeshBasicMaterial({ color: 0xffd34d, side: THREE.DoubleSide }));
    crown.add(band);
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2;
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.1, 6), bmat(0xffd34d));
      spike.position.set(Math.cos(a) * 0.15, 0.11, Math.sin(a) * 0.15); crown.add(spike);
    }
    crown.position.set(0.12, 0.96, 0.1); crown.rotation.z = -0.3; group.add(crown);
  } else {   // DOZER: floppy nightcap + pom-pom
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.55, 12), bmat(0x4d6bff));
    cap.position.set(0, 1.0, 0); cap.rotation.z = 0.7; group.add(cap);
    const pom = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), bmat(0xffffff));
    pom.position.set(0.42, 1.18, 0); group.add(pom);
  }
  // danger cue is a crisp OUTLINE ring (normal blending survives any surface),
  // not an additive disc that washes out over pale pavement
  const halo = new THREE.Mesh(new THREE.RingGeometry(1.15, 1.42, 40), new THREE.MeshBasicMaterial({ color: glowCol, transparent: true, opacity: 0.85, depthWrite: false }));
  halo.rotation.x = -Math.PI / 2; halo.position.y = 0.07;
  return { group, eyes, halo };
}

export function createRivals(
  scene: THREE.Scene,
  camera: THREE.Camera,
  edibles: RivalEdible[],
  biomeAt: (x: number, z: number) => Biome | null,
  count = 4,
): Rivals {
  // props the family has eaten, mid shrink-out animation
  const shrinking: THREE.Object3D[] = [];
  interface R extends Rival {
    arch: Arch; group: THREE.Group; body: THREE.Mesh; eyes: THREE.Group; halo: THREE.Mesh;
    tx: number; tz: number; retarget: number; joinAt: number; joined: boolean; cast: boolean;
    stall: number; stuckN: number; ph: number; pulse: number; vx: number; vz: number; biteCd: number;
    respawnT: number; speakCd: number; tgt: RivalEdible | null; closeCall: boolean;
    visitT: number; visiting: boolean; dyingT: number; hx: number; hz: number; panic: number;
    // scoring, on the player's own terms
    combo: number; comboT: number;
    // BULLY: the charge state machine (0 prowl, 1 wind-up, 2 lunge, 3 recover)
    cst: number; ctim: number; missPend: boolean; missCd: number; stolen: number; stuffedSaid: boolean; stuffCap: number;
    // SHOWOFF: the radius of the landmark it is currently crossing the map for
    lockR: number;
    // HOARDER: the district it has decided is its
    campX: number; campZ: number; campT: number;
    roll: THREE.Quaternion;
  }
  const roster: R[] = [];        // one per NAME — built once, skins fixed forever
  const rivals: R[] = [];        // THIS match's cast (api.list points at it)
  const eaten = (m: THREE.Object3D) => m.userData.eaten || !m.visible;

  // the family wears LEGENDARIES ONLY — the 3D-accessory hero skins (unicorn
  // horn, dino spikes, wizard hat, crown…). Aspirational: every family member
  // looks like something the player wants to own.
  // FIXED CASTING: every family member always wears the SAME legendary, so a
  // kid learns "the sparkly unicorn is Uncle Glitz" instead of meeting five
  // strangers in new costumes every match. Recognition is the whole point.
  // This used to be a LIE on every rematch: the meshes were built once per
  // SLOT and reset() reassigned the names, so match two put Grandpa's wizard
  // hat on Baby Bitsy — and now that behaviour is keyed to the name, it would
  // have put the bully's brain in the coward's body. One rival object per
  // NAME, permanently: the body, the voice and the archetype never separate.
  const FAMILY_SKIN: Record<string, string> = {
    WOBBLES: 'mecha', GLITZ: 'univoid', BITSY: 'rexling',
    CHOMPZILLA: 'kingvoid', DOZER: 'archmage',
  };
  const skinFor = (nm: string): Skin =>
    SKINS.find((s) => s.id === FAMILY_SKIN[nm]) ?? SKINS.filter((s) => s.acc)[0];
  NAMES.forEach((nm, i) => {
    const sk = skinFor(nm);
    const { group, eyes, halo } = makeRivalMesh(sk, NAMES.indexOf(nm));
    scene.add(group); scene.add(halo);
    group.visible = halo.visible = false;   // hidden until they join the feast
    const ang = (i / NAMES.length) * Math.PI * 2 + 0.6;
    roster.push({ name: nm, arch: ARCH_OF[nm], color: sk.rim, score: 0, r: START_R,
      group, body: group.children[0] as THREE.Mesh, eyes, halo,
      x: Math.cos(ang) * 150, z: Math.sin(ang) * 150, tx: 0, tz: 0, retarget: 0,
      joinAt: 9e9, joined: false, cast: false, stall: 0, stuckN: 0, ph: rand(0, 6), pulse: 0,
      vx: 0, vz: 0, biteCd: 0, respawnT: 0, speakCd: rand(4, 10), tgt: null, closeCall: false,
      visitT: rand(30, 70), visiting: false, dyingT: 0, panic: 0,
      combo: 0, comboT: 0, cst: 0, ctim: rand(6, 10), missPend: false, missCd: 0,
      stolen: 0, stuffedSaid: false, stuffCap: 0, lockR: 0,
      campX: Math.cos(ang) * 130, campZ: Math.sin(ang) * 130, campT: 0,
      roll: new THREE.Quaternion(),
      // HOME TURF: each family member forages their OWN corner of the island.
      // Without this they orbited the player all match ("they hover around
      // you"), which is clingy, not alive.
      hx: Math.cos(ang) * 130, hz: Math.sin(ang) * 130 });
  });

  // WHO SHOWS UP is a roll of the dice — with one fixed point. CHOMPZILLA is
  // ALWAYS at the table, because she is the match's threat and, later, its
  // marquee meal; a match where the danger simply failed to be cast is a match
  // with no story. The other 2-4 seats are shuffled.
  function reroll(matchLen = 180) {
    const others = NAMES.filter((n) => n !== 'CHOMPZILLA').sort(() => Math.random() - 0.5);
    const picked = ['CHOMPZILLA', ...others.slice(0, Math.max(2, count - 1))];
    // ── JOIN TIMES ────────────────────────────────────────────────────────
    // The last seat used to open as late as 165s of a 180s match: a family
    // member who arrives with fifteen seconds left is a cutscene, not a rival.
    // The whole family is now on the island inside the first third, scaled to
    // the clock so a short match still fills up early.
    const k = matchLen / 180;
    const slots = [rand(2, 5), rand(9, 15), rand(19, 27), rand(30, 40), rand(42, 54)].map((s) => s * k);
    // …and the threat needs to be early enough to BE the mid-match, so she
    // takes an early seat regardless of which slot she drew.
    roster.forEach((rv) => { rv.cast = false; rv.joinAt = 9e9; });
    picked.forEach((nm, i) => {
      const rv = roster.find((r) => r.name === nm)!;
      rv.cast = true;
      rv.joinAt = nm === 'CHOMPZILLA' ? rand(7, 13) * k : slots[i];
    });
    rivals.length = 0;
    for (const rv of roster) if (rv.cast) rivals.push(rv);
  }
  reroll();

  // ── the player's breadcrumb trail ──────────────────────────────────────────
  // Sampled every third of a second. BITSY the COPYCAT drives down it about
  // seven seconds behind you, which is the single most legible AI behaviour in
  // the game: a child watches once and says "she's copying me".
  const trail: { x: number; z: number }[] = [];
  let trailT = 0;
  let pvx = 0, pvz = 0;   // player velocity, derived from the trail (charge leading)

  // ── NEVER SET A FAMILY MEMBER DOWN WHERE ITS BODY DOES NOT FIT ────────────
  // Joins and respawns only ever checked biomeAt at the CENTRE point, so a
  // rival could be placed on a spit, a jetty or a strip of park too narrow for
  // it — and then every candidate move failed the body test and the escape
  // gradient was zero in all directions, so it stayed there. Measured: Grandpa
  // Dozer spent an entire 180-second match with a total path length of 144
  // units and a final score of 21. That is the "they just float" complaint in
  // its purest form, and it was a spawn bug, not an AI one.
  const bodyMargin = (r: number) => Math.min(r * 0.7, 3.5 + r * 0.15) + 1.0;
  const fitsAt = (x: number, z: number, r: number) => {
    const bm = bodyMargin(r);
    if (!biomeAt(x, z) || inWater3(x, z, bm)) return false;
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      if (!biomeAt(x + Math.cos(a) * bm, z + Math.sin(a) * bm)) return false;
    }
    return true;
  };
  const placeOnLand = (x: number, z: number, r: number): [number, number] => {
    if (fitsAt(x, z, r)) return [x, z];
    for (let ring = 1; ring <= 14; ring++) {
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * Math.PI * 2 + ring * 0.37, rr = ring * 14;
        const nx = x + Math.cos(a) * rr, nz = z + Math.sin(a) * rr;
        if (fitsAt(nx, nz, r)) return [nx, nz];
      }
    }
    return [0, 0];   // the island centre always works
  };

  const anyVisiting = () => rivals.some((r) => r.visiting);
  const tmp = new THREE.Vector3();
  const rollQ = new THREE.Quaternion();   // scratch: the rolling-ball delta
  const api: Rivals = {
    list: rivals,
    reset(matchLen = 180) {
      // abandon in-flight eaten-anims: resetMatch restores those props to their
      // homes — leaving them queued here re-shrank them at match start (a
      // half-buried spinning house on lot #1 of every rematch)
      shrinking.length = 0;
      trail.length = 0; trailT = 0;
      roster.forEach((rv, i) => {
        const ang = (i / roster.length) * Math.PI * 2 + rand(0, Math.PI * 2);
        rv.x = Math.cos(ang) * 150; rv.z = Math.sin(ang) * 150;
        rv.r = START_R; rv.score = 0; rv.vx = 0; rv.vz = 0;
        rv.joined = false; rv.respawnT = 0; rv.biteCd = 0; rv.stall = 0; rv.pulse = 0;
        rv.visitT = rand(14, 30); rv.visiting = false; rv.dyingT = 0;
        rv.combo = 0; rv.comboT = 0; rv.cst = 0; rv.ctim = rand(6, 10);
        rv.missPend = false; rv.missCd = 0; rv.stolen = 0; rv.stuffedSaid = false; rv.stuffCap = 0;
        rv.lockR = 0; rv.tgt = null;
        rv.speakCd = rand(4, 10); rv.ph = rand(0, 6);
        rv.roll.identity(); rv.body.quaternion.identity();
        rv.group.visible = rv.halo.visible = false;
        rv.group.rotation.y = 0;
        // a different corner of the island to forage — and to camp in — each time
        rv.hx = Math.cos(ang) * rand(105, 155); rv.hz = Math.sin(ang) * rand(105, 155);
        rv.campX = rv.hx; rv.campZ = rv.hz; rv.campT = 0;
      });
      // RE-ROLL THE MATCH. The cast shuffle and the join times used to be
      // rolled once, in the closure, at module load — so they only ever changed
      // on a full page reload, and the game's own PLAY AGAIN button never
      // reloads. A play-through of three back-to-back matches produced the same
      // line-up joining at the same seconds, three times running. The variety
      // was real and permanently invisible.
      reroll(matchLen);
    },
    update(dt, _t, px, pz, pr, ctx) {
      const matchLen = ctx?.matchLen ?? 180;
      const pScore = ctx?.playerScore ?? 0;
      const fever = ctx?.fever ?? 1;
      // ── THE HUNT WINDOW ─────────────────────────────────────────────────
      // CHOMPZILLA is a genuine predator for the first 55% of the match — she
      // spawns near you at 1.5x your size and charges. After that she is
      // STUFFED: she stops growing while your finale surge runs, and turns
      // into the best thing on the island to eat. One rival, two acts.
      const huntEnd = matchLen * 0.55;
      const hunting = _t > 0 && _t < huntEnd;
      // breadcrumbs for the COPYCAT + a player velocity for the BULLY's lead
      if (_t > 0) {
        trailT -= dt;
        if (trailT <= 0) {
          trailT = 0.33;
          const last = trail[trail.length - 1];
          if (last) { pvx = (px - last.x) / 0.33; pvz = (pz - last.z) / 0.33; }
          trail.push({ x: px, z: pz });
          if (trail.length > 64) trail.shift();
        }
      }
      // drive the SHARED void shader for every family body: the clock runs the
      // jelly idle + nebula drift, and each rival's wobble decays after its
      // own bites — they slosh when they swallow, exactly like the hero
      for (let i = 0; i < rivalMats.length; i++) {
        const u = rivalMats[i].uniforms;
        u.uTime.value = _t;
        u.uWobble.value = Math.max(0, (u.uWobble.value as number) - dt * 1.7);
      }
      // rival-eaten props spiral down and shrink — cause and effect a kid can
      // SEE (they used to vanish in one frame, reading as a rendering bug)
      for (let i = shrinking.length - 1; i >= 0; i--) {
        const m = shrinking[i];
        // GLB wrappers keep scale 1 (real scale is on the inner group), so a
        // scale heuristic misses towers/houses/schools — use the tags: any
        // building or any tall/large prop sinks with dignity, no spin
        const big = m.userData.building || m.userData.qk === 'house' || m.scale.x > 3 || (m.userData.eRadius ?? 0) >= 2.5;
        m.scale.multiplyScalar(1 - dt * (big ? 6.5 : 4.5));
        m.position.y -= dt * (big ? 4 : 2.4);
        if (!big) m.rotation.y += dt * 5;   // spinning HOUSES read as parked-on-road chaos
        if (m.scale.x < 0.05) { m.visible = false; scene.remove(m); shrinking.splice(i, 1); }
      }
      // ── THE GROWTH LAW, REBALANCED ────────────────────────────────────────
      // It used to be a flat START_R + 0.025·t, topping out at 5.4 on a 3:00
      // clock while the player reached ~11.5. That single line is most of why
      // the family could not race: half the island's props were permanently
      // too big for them to even target.
      //
      // The family now tracks the PLAYER's size instead of the clock, and sits
      // deliberately just BELOW it. That is the whole shape of the fight: the
      // family competes on SCORE, the player wins on SIZE. A kid ends up the
      // biggest thing on the island and still has to work to out-point them —
      // and the way to close a points gap is to EAT one, which is exactly the
      // play we want them chasing. 0.78 sits just under the 1/1.11 swallow
      // threshold, so a rival at its ceiling is always catchable.
      //
      // The early clause is an absolute track, so the opening minute still has
      // real peers instead of a family scaled off a 0.9 hatchling — and it is
      // deliberately LOW. A first pass ran it to 2.7 by forty seconds against a
      // player who was still 1.2, and the measured result was ugly in two ways
      // at once: the family towered over the player for the whole first minute,
      // and at that size they could swallow prop classes the player could not,
      // so they stripped the island roughly six times faster than the player
      // ate. The family must never be the reason the island runs out.
      const softCap = Math.max(Math.min(START_R + 0.02 * _t, 1.6), pr * 0.78);
      for (const rv of rivals) {
        const isHunter = rv.arch === 'BULLY';
        rv.hunting = isHunter && hunting && rv.joined;   // HUD + QA read this
        if (!rv.joined) {
          if (_t >= rv.joinAt) {
            rv.joined = true;
            // WHERE they walk in from is characterisation. The threat arrives
            // on top of you, already big; everyone else walks in off their own
            // turf. And a late arrival is scaled to the match it is joining, so
            // the last seat is a rival rather than a snack.
            if (isHunter) {
              const a0 = rand(0, Math.PI * 2), d0 = rand(46, 74);
              rv.r = Math.max(START_R * 1.35, pr * 1.5);
              [rv.x, rv.z] = placeOnLand(px + Math.cos(a0) * d0, pz + Math.sin(a0) * d0, rv.r);
            } else {
              rv.r = Math.max(START_R, Math.min(softCap, pr * 0.62));
              [rv.x, rv.z] = placeOnLand(rv.hx, rv.hz, rv.r);
            }
            rv.campX = rv.x; rv.campZ = rv.z; rv.campT = 0;
            rv.group.visible = rv.halo.visible = true;
            api.onJoin?.(rv.name, rv.color, rv.x, rv.z, rv.arch);
            api.onSpeak?.(rv.x, rv.z, pickLine(RIVAL_VOICE[rv.name].arch));
            rv.speakCd = rand(6, 10);
          } else continue;   // not on the island yet
        }
        // ── THE THREAT'S TWO ACTS ───────────────────────────────────────────
        // hardCap is applied AFTER the eating loop, not here. Doing it here was
        // a measured bug: the stuffed hunter kept swallowing buildings and grew
        // 7.2 → 9.6 in the last third against a player of 2.1, so the marquee
        // meal — the whole payoff of the arc — could never happen.
        let hardCap = softCap;
        if (isHunter) {
          if (hunting) {
            // she looms at ~1.5x whatever you are, eased so it never pops
            const want = Math.min(R_CAP, Math.max(START_R * 1.35, pr * 1.5));
            rv.r += (want - rv.r) * Math.min(1, dt * 0.9);
            hardCap = want * 1.04;
            rv.stuffCap = 0;
          } else {
            // STUFFED. Growth stops dead at whatever she reached, and the
            // ceiling sags 0.7%/s — invisible frame to frame — while the
            // player's finale surge runs. Somewhere in the last third she
            // crosses under the swallow line and becomes the best meal on the
            // island.
            if (!rv.stuffCap) rv.stuffCap = rv.r;
            // 0.3%/s. A first pass ran 0.7 and she deflated to r=1.3 by the
            // whistle — still a prize on points, but she no longer LOOKED like
            // the biggest meal on the island, which is half of why a kid goes
            // after her. The player's finale surge is what should overtake her.
            rv.stuffCap = Math.max(START_R, rv.stuffCap * (1 - dt * 0.003));
            hardCap = rv.stuffCap;
            if (!rv.stuffedSaid) {
              rv.stuffedSaid = true; rv.cst = 0;
              api.onStuffed?.(rv.name, rv.x, rv.z);
              api.onSpeak?.(rv.x, rv.z, pickLine(RIVAL_VOICE[rv.name].stuffed ?? RIVAL_VOICE[rv.name].taunt));
              rv.speakCd = rand(8, 12);
            }
          }
        }
        if (rv.r > hardCap) rv.r = hardCap;
        // being devoured: a visible SUCK-IN — the rival spirals into the
        // player's pit, shrinking, before it winks out. Cause and effect a kid
        // can see (the old instant-hide read as "nothing happened").
        if (rv.dyingT > 0) {
          rv.dyingT -= dt;
          const k = Math.max(0, rv.dyingT) / 0.55;   // 1 → 0 over the gulp
          rv.x += (px - rv.x) * Math.min(1, dt * 7);
          rv.z += (pz - rv.z) * Math.min(1, dt * 7);
          const swirl = (1 - k) * 9;
          rv.group.position.set(rv.x + Math.cos(swirl) * 1.6 * k, Math.max(0.2, rv.r * k * 0.9), rv.z + Math.sin(swirl) * 1.6 * k);
          rv.group.scale.setScalar(Math.max(0.05, rv.r * k));
          rv.group.rotation.y += dt * 10;
          if (rv.dyingT <= 0) {
            rv.group.visible = false; rv.group.rotation.y = 0;
            rv.respawnT = 6; rv.r = START_R; rv.vx = rv.vz = 0;
          }
          continue;
        }
        // knocked out after being devoured: respawn small on the far coast
        if (rv.respawnT > 0) {
          rv.respawnT -= dt;
          if (rv.respawnT <= 0) {
            const a2 = rand(0, Math.PI * 2);
            const rr = rand(45, 80);   // near the player — a grumpy tiny rival re-entering IS a story
            [rv.x, rv.z] = placeOnLand(px + Math.cos(a2) * rr, pz + Math.sin(a2) * rr, rv.r);
            rv.group.visible = rv.halo.visible = true; rv.pulse = 1;
            api.onSpeak?.(rv.x, rv.z, pickLine(RIVAL_VOICE[rv.name].respawn));
          } else continue;
        }
        rv.biteCd = Math.max(0, rv.biteCd - dt);
        rv.speakCd = Math.max(0, rv.speakCd - dt);
        // AI: STICKY targeting — commit to a snack until it's gone/reached,
        // flee a much bigger player, and contest the player's size directly
        rv.retarget -= dt;
        // the player STOLE the snack this rival was beelining for — say so
        if (rv.tgt && eaten(rv.tgt.mesh)) {
          const sx2 = rv.tgt.mesh.position.x - px, sz2 = rv.tgt.mesh.position.z - pz;
          if (Math.hypot(sx2, sz2) < pr + 5 && rv.speakCd <= 0) {
            rv.speakCd = rand(6, 10);
            api.onSpeak?.(rv.x, rv.z, pickLine(RIVAL_VOICE[rv.name].steal));
          }
          rv.tgt = null;
        }
        const dpx = rv.x - px, dpz = rv.z - pz, dp = Math.hypot(dpx, dpz);
        // flee only from REAL danger, and only when it's actually close —
        // family that bolts the moment you approach never feels like family
        // FLEE ONLY FROM DEATH. The old test made anyone slightly smaller bolt
        // the moment you approached, so the family read as "hovers, then runs".
        // Now they only run when you could actually swallow them AND you're
        // genuinely on top of them; otherwise they keep doing their thing.
        const canBeEaten = pr > rv.r * 1.25;
        // 10 units of warning at every size meant a rival was already sprinting
        // before you were close enough to matter
        // …and the COWARD is the exception that proves the rule: Wobbles bolts
        // from four times as far out as anyone else, which is the entire joke
        // and the entire read. You can name him from the far side of a street.
        const fleeReach = rv.arch === 'COWARD' ? pr + rv.r * 4.5 : pr + rv.r * 1.4;
        let fleeing = (rv.arch === 'COWARD' ? pr > rv.r * 1.02 : canBeEaten) && dp < fleeReach
          // the STUFFED threat is prey now, and she knows it
          && !(rv.arch === 'BULLY' && hunting);
        // …and Wobbles runs from the FAMILY too. Watching the coward scatter
        // away from Auntie Chompzilla — with no player involved at all — is the
        // cheapest, clearest proof on screen that these are characters and not
        // five instances of one pathfinder.
        let scareX = px, scareZ = pz;   // what he is running FROM
        if (rv.arch === 'COWARD' && !fleeing) {
          for (const o of rivals) {
            if (o === rv || !o.joined || o.dyingT > 0 || o.respawnT > 0) continue;
            if (o.r < rv.r * 1.15) continue;
            if (Math.hypot(o.x - rv.x, o.z - rv.z) < o.r + rv.r * 4.0) {
              fleeing = true; scareX = o.x; scareZ = o.z; break;
            }
          }
        }
        if (fleeing && rv.arch === 'COWARD' && rv.speakCd <= 0 && dp < fleeReach * 0.6) {
          rv.speakCd = rand(9, 14);
          api.onSpeak?.(rv.x, rv.z, pickLine(RIVAL_VOICE[rv.name].arch));
        }
        if (fleeing && dp < pr * 1.05) rv.closeCall = true;   // almost swallowed…
        if (rv.closeCall && dp > pr * 1.8) {                   // …and wriggled free
          rv.closeCall = false;
          if (rv.speakCd <= 0) { rv.speakCd = 8; api.onSpeak?.(rv.x, rv.z, pickLine(RIVAL_VOICE[rv.name].escape)); }
        }
        // drive-by size chirps — every close pass becomes a beat
        if (rv.speakCd <= 0 && dp < pr + rv.r + 6) {
          if (rv.r > pr * 1.15) { rv.speakCd = rand(12, 16); api.onSpeak?.(rv.x, rv.z, pickLine(RIVAL_VOICE[rv.name].nearBig)); }
          else if (rv.r < pr * 0.85) { rv.speakCd = rand(12, 16); api.onSpeak?.(rv.x, rv.z, pickLine(RIVAL_VOICE[rv.name].nearSmall)); }
        }
        // ── SWING-BY VISITS: occasionally a family member breaks off, rolls
        // over to say hi, then goes back to its own business. Rarer now
        // (every ~30-70s, and only one visitor at a time) — a visit should be
        // a moment, not the default state of the family.
        rv.visitT -= dt;
        if (rv.visiting && fleeing) rv.visiting = false;   // visit's off — you got scary
        // the HOARDER does not travel and the BULLY is not paying a social call
        const sociable = rv.arch !== 'HOARDER' && !(rv.arch === 'BULLY' && hunting);
        if (sociable && !rv.visiting && !fleeing && rv.visitT <= 0 && dp > 60 && !anyVisiting()) {
          rv.visiting = true; rv.tgt = null;
        }
        if (rv.visiting) {
          rv.tx = px; rv.tz = pz;   // chase the moving player, not a stale spot
          if (dp < pr + rv.r + 9) {   // arrived: deliver the line, hang out beat
            rv.visiting = false; rv.visitT = rand(45, 90);
            rv.speakCd = rand(10, 14);
            api.onSpeak?.(rv.x, rv.z, pickLine(RIVAL_VOICE[rv.name].visit));
            rv.retarget = 0;   // pick a snack right away (near the player now)
          }
        }
        const reached = Math.hypot(rv.tx - rv.x, rv.tz - rv.z) < 2.5;
        if (fleeing) {
          // flee INLAND-biased: near the coast the escape vector curves back
          // toward the island centre — no more rivals pinned jittering on the
          // waterline with nowhere to run
          const sdx = rv.x - scareX, sdz = rv.z - scareZ, sd = Math.hypot(sdx, sdz) || 1;
          let fdx = sdx / sd, fdz = sdz / sd;
          const cd = Math.hypot(rv.x, rv.z);
          if (cd > 190) {
            const k2 = Math.min(1, (cd - 190) / 60);
            fdx = fdx * (1 - k2) - (rv.x / cd) * k2;
            fdz = fdz * (1 - k2) - (rv.z / cd) * k2;
            const fm = Math.hypot(fdx, fdz) || 1; fdx /= fm; fdz /= fm;
          }
          rv.tx = rv.x + fdx * 60; rv.tz = rv.z + fdz * 60;
        }
        else if (!rv.visiting && (rv.retarget <= 0 || reached)) {
          rv.retarget = rand(2.5, 4);
          // ── FIVE BRAINS, NOT ONE ───────────────────────────────────────────
          // Every branch below answers "what is this character DOING?" in a way
          // a six-year-old can narrate out loud. That is the whole spec.
          let best: RivalEdible | null = null, bd = -Infinity;
          // ── THE FAMILY EATS MEALS, NOT CRUMBS ─────────────────────────────
          // Measured, and the most important number in this file. Once the
          // family was sized near the player they hunted the player's exact
          // food class — the small props — and there are three or four of them
          // moving faster than the player is. The player's score flatlined at
          // 173 points and radius 1.24 at ninety seconds (the old build reached
          // 1,781 and 2.18 by then): they were beelining to snacks that were
          // always swallowed before they arrived. Starved out by the AI.
          // So the family ignores anything below 45% of their own size. The
          // whole bottom layer of the island — cones, hydrants, flowers, the
          // stuff a beginner lives on — is now permanently the player's, and
          // the family competes for the tier above it. It also means each thing
          // they eat is WORTH more, so their score does not need the volume.
          // THIS FLOOR MUST MATCH THE ONE IN THE SWALLOW LOOP. It is 45% of the
          // rival's own radius in both places, and dropping it here alone — an
          // attempt to widen the hoarder's diet — was actively worse: he then
          // LOCKED ON to 0.55 crumbs that the swallow test still refused at
          // 0.70, drove to one, and sat on it for the rest of the match. A
          // rival that can target what it cannot eat is a rival that starves
          // next to food.
          const minBite = rv.r * 0.45;
          // where this archetype is allowed to look, and how it ranks what it finds
          let ax = rv.x, az = rv.z, reach = Infinity, bigHunger = 0;
          // THE HOARDER HAS NO CAMP ANY MORE. He had a bespoke one — search
          // anchored on a fixed point, wander orbiting it, relocate on a sweep
          // counter — and five separate attempts to make it feed him all ended
          // the same way: instrumented, he FOUND a target every single tick
          // (600-plus candidates, best locked at 0.60) and still sat at score
          // 47 and radius 1.38 from t=34 to the whistle. He was not blind and
          // he was not slow; the camp was pinning him. Grandpa keeps what
          // actually reads on screen — half everyone else's cruising speed —
          // and works a drifting patch of turf like the rest of the family.
          if (rv.arch === 'SHOWOFF') { bigHunger = 1; }      // size beats distance
          else if (rv.arch === 'COPYCAT') {
            // Drive the player's own route and eat what they left. The flaw was
            // literal: anchored seven seconds back with a 55-unit reach, Bitsy
            // was hunting ground the player had just stripped, so she found
            // nothing almost every tick — 909 to 3,976 points a match. She now
            // trails four seconds back with a wider look, which is still
            // unmistakably "following your footprints" but leaves her the
            // things you drove straight past.
            const back = Math.max(0, trail.length - 1 - 12);
            const spot = trail[back];
            if (spot) { ax = spot.x; az = spot.z; reach = 78; }
            else { ax = px; az = pz; reach = 78; }
          } else if (rv.arch === 'BULLY' && hunting) { ax = px; az = pz; reach = 85; }  // prowls YOUR block
          for (const e of edibles) {
            if (eaten(e.mesh) || e.radius > rv.r * EAT_RATIO || e.radius < minBite) continue;
            const d = Math.hypot(e.mesh.position.x - ax, e.mesh.position.z - az);
            if (d > reach) continue;
            // SHOWOFF trades distance for spectacle: it will cross the entire
            // island for a hotel and step over a hundred traffic cones on the
            // way. Everyone else takes the nearest thing.
            const w = bigHunger ? e.radius * 26 - d * 0.55 : -d;
            if (w > bd) { bd = w; best = e; }
          }
          if (best) {
            rv.tx = best.mesh.position.x; rv.tz = best.mesh.position.z; rv.tgt = best;
            // "watch me eat something HUGE" — said only when it really is huge
            if (rv.arch === 'SHOWOFF' && best.radius > 2.2 && best.radius > rv.lockR * 1.15 && rv.speakCd <= 0) {
              rv.lockR = best.radius; rv.speakCd = rand(10, 16);
              api.onSpeak?.(rv.x, rv.z, pickLine(RIVAL_VOICE[rv.name].arch));
            }
          } else if (rv.arch === 'COPYCAT') {
            rv.tx = ax + rand(-18, 18); rv.tz = az + rand(-18, 18); rv.tgt = null;
            if (rv.speakCd <= 0 && dp < 90) {
              rv.speakCd = rand(12, 18);
              api.onSpeak?.(rv.x, rv.z, pickLine(RIVAL_VOICE[rv.name].arch));
            }
          } else {
            // idle wander sweeps their OWN turf, and the turf itself drifts —
            // so a family member works a district, moves on, and occasionally
            // ends up near you by coincidence rather than by clinging
            if (Math.random() < 0.25) {
              const ha = rand(0, Math.PI * 2);
              rv.hx = Math.cos(ha) * rand(60, 165); rv.hz = Math.sin(ha) * rand(60, 165);
            }
            const a3 = rand(0, Math.PI * 2), rr2 = rand(20, 70);
            rv.tx = rv.hx + Math.cos(a3) * rr2; rv.tz = rv.hz + Math.sin(a3) * rr2;
            if (!biomeAt(rv.tx, rv.tz)) { rv.tx = Math.cos(a3) * rand(40, 150); rv.tz = Math.sin(a3) * rand(40, 150); }
            rv.tgt = null;
          }
        }
        // ── THE CHARGE ────────────────────────────────────────────────────────
        // The threat does not simply home in on you — that is unreadable and
        // unfair. She TELEGRAPHS: she plants, her ring flashes, she announces
        // the lunge, and only then does she come. Two seconds of warning is
        // what turns "the game shrank me" into "she CHARGED and I DODGED",
        // which is the sentence a seven-year-old repeats at dinner.
        if (isHunter && hunting) {
          rv.ctim -= dt; rv.missCd = Math.max(0, rv.missCd - dt);
          if (rv.cst === 0) {
            if (rv.ctim <= 0 && dp < 95 && dp > rv.r * 0.9) {
              rv.cst = 1; rv.ctim = 0.85; rv.missPend = false;
              api.onCharge?.(rv.name, rv.x, rv.z);
              api.onSpeak?.(rv.x, rv.z, pickLine(RIVAL_VOICE[rv.name].charge ?? RIVAL_VOICE[rv.name].taunt));
              rv.speakCd = rand(6, 9);
            }
          } else if (rv.cst === 1 && rv.ctim <= 0) { rv.cst = 2; rv.ctim = 2.6; }
          else if (rv.cst === 2) {
            // a whisker away and still empty-jawed: bank the near miss
            if (dp < rv.r * 1.5 && dp > rv.r * 0.85) rv.missPend = true;
            if (rv.ctim <= 0) {
              rv.cst = 3; rv.ctim = 1.7;
              if (rv.missPend && rv.missCd <= 0) {
                rv.missCd = 12; api.onNearMiss?.(rv.name, rv.x, rv.z);
              }
              rv.missPend = false;
            }
          } else if (rv.cst === 3 && rv.ctim <= 0) { rv.cst = 0; rv.ctim = rand(5.5, 9); }
          // during wind-up and lunge she is aimed squarely at you (leading a
          // little, so a straight line away is not a free escape)
          if (rv.cst >= 1 && rv.cst <= 2) {
            const lead = rv.cst === 2 ? 0.55 : 0;
            rv.tx = px + pvx * lead; rv.tz = pz + pvz * lead;
            rv.tgt = null; rv.visiting = false;
          }
        } else if (isHunter) { rv.cst = 0; }
        // SMOOTHED motion (no more teleporty slides) + coast handling
        const mx = rv.tx - rv.x, mz = rv.tz - rv.z, md = Math.hypot(mx, mz) || 1;
        // CATCHABLE. Flee speed peaked at 34 * 2.1 = 71 u/s against a player
        // hard-capped at 58, so at every size where you were big enough to
        // swallow a rival they outran you by 40-70%. Six full measured matches
        // produced ONE rival eaten — the marquee play, the thing a kid re-tells,
        // was mechanically unreachable. Flee now tops out below the player's
        // ceiling, and panic costs stamina so a determined 3-second chase
        // closes: they bolt, then tire, and that is the whole drama.
        if (fleeing) rv.panic = Math.min(1, (rv.panic ?? 0) + dt * 0.42);
        else rv.panic = Math.max(0, (rv.panic ?? 0) - dt * 0.30);
        const tired = 1 - 0.34 * (rv.panic ?? 0);
        // ── SPEED IS CHARACTER ────────────────────────────────────────────────
        // Grandpa ambles, Uncle Glitz struts, Auntie Chompzilla drives. You can
        // tell them apart at fifty metres with the labels off.
        const cruise = ARCH_SPD[rv.arch];
        // the STUFFED threat is heavy and slow — the chase that ends the match
        // has to actually close
        const heavy = isHunter && !hunting ? 0.72 : 1;
        let spdSec = (fleeing ? 31 * tired : cruise) * heavy
          * Math.min(1.7, Math.pow(rv.r / START_R, 0.5));
        if (isHunter && hunting) {
          // the lunge is pinned to the PLAYER's own top speed, so a charge is a
          // near thing at every size: outrun it by steering, eat the shrink by
          // not looking. Wind-up plants her; recovery leaves her wallowing.
          const ps = playerSpeed(pr);
          if (rv.cst === 1) spdSec = 1.5;
          else if (rv.cst === 2) spdSec = ps * 1.22;
          else if (rv.cst === 3) spdSec = ps * 0.28;
          else spdSec = Math.min(spdSec, ps * 0.62);   // prowling, not chasing
        }
        rv.vx += ((mx / md) * spdSec - rv.vx) * Math.min(1, dt * 5);
        rv.vz += ((mz / md) * spdSec - rv.vz) * Math.min(1, dt * 5);
        const spd = Math.hypot(rv.vx, rv.vz) * dt;
        const nx = rv.x + rv.vx * dt, nz = rv.z + rv.vz * dt;
        // BODY-AWARE. This used to test the CENTRE point only, so a rival would
        // walk its whole body out over the water and jitter on the waterline —
        // the "AI tries to go into the water and it's glitching" report. Test a
        // ring at the rival's own size, exactly like the player's wall does.
        const bm = Math.min(rv.r * 0.7, 3.5 + rv.r * 0.15) + 1.0;
        // …and biomeAt calls Maple's pond, river and lagoon dry land, because
        // they are inside the coastline. Rival 0 spent 5.4 seconds of a live
        // 90-second match inside the river.
        const fits = (x: number, z: number) => !!biomeAt(x, z) && !inWater3(x, z, bm)
          && !!biomeAt(x + bm, z) && !!biomeAt(x - bm, z)
          && !!biomeAt(x, z + bm) && !!biomeAt(x, z - bm)
          // diagonals leak too: up to 1.7% of accepted cells put the body over
          // water on a diagonal. The cars have had an 8-point ring all along.
          && !!biomeAt(x + bm * 0.7071, z + bm * 0.7071) && !!biomeAt(x - bm * 0.7071, z - bm * 0.7071)
          && !!biomeAt(x + bm * 0.7071, z - bm * 0.7071) && !!biomeAt(x - bm * 0.7071, z + bm * 0.7071);
        let movedOk = false;
        if (fits(nx, nz)) { rv.x = nx; rv.z = nz; movedOk = true; }
        else {
          const sx = -(mz / md), sz = mx / md;   // slide directions along the wall
          if (fits(rv.x + sx * spd, rv.z + sz * spd)) { rv.x += sx * spd; rv.z += sz * spd; movedOk = true; }
          else if (fits(rv.x - sx * spd, rv.z - sz * spd)) { rv.x -= sx * spd; rv.z -= sz * spd; movedOk = true; }
          // and if the body is ALREADY off the land, walk it back on rather
          // than leaving it hovering over the sea until the stall timer fires
          if (!movedOk && !fits(rv.x, rv.z)) {
            const h = Math.max(2, bm * 0.6);
            const gx = (biomeAt(rv.x + h, rv.z) ? 1 : 0) - (biomeAt(rv.x - h, rv.z) ? 1 : 0);
            const gz = (biomeAt(rv.x, rv.z + h) ? 1 : 0) - (biomeAt(rv.x, rv.z - h) ? 1 : 0);
            const gl = Math.hypot(gx, gz);
            if (gl > 0) { rv.x += (gx / gl) * dt * 30; rv.z += (gz / gl) * dt * 30; }
          }
        }
        rv.stall = movedOk ? Math.max(0, rv.stall - dt * 2) : rv.stall + dt;
        if (movedOk) rv.stuckN = 0;
        if (rv.stall > 0.8) {   // pinned in a corner: abandon target, wander inland
          rv.stall = 0; rv.retarget = rand(1.2, 2.2);
          // RETARGETING IS NOT ENOUGH. A rival GROWS during a match, and the
          // body-fit ring grows with it — so a spot that was fine at 0.9 can
          // become impossible at 1.6, and then every step is refused no matter
          // where the target is. The loop just runs forever: stall, retarget,
          // still pinned, stall. Traced on DOZER, who is slowest and therefore
          // most likely to still be in a tight spot when he grows: score frozen
          // at 99 and radius at 1.6 from t=46 to the whistle, three matches
          // running. Joins and respawns already spiral out to somewhere the
          // body fits; a rival that grows into a corner deserves the same.
          if (++rv.stuckN >= 3) {
            rv.stuckN = 0;
            [rv.x, rv.z] = placeOnLand(rv.x, rv.z, rv.r);
            rv.vx = 0; rv.vz = 0; rv.tgt = null;
          }
          // "inland" was ALWAYS toward the world origin. That is only correct
          // for an island with water strictly on the outside — Pirate Bay has a
          // bay in the MIDDLE, so from the resort shore this aimed the escape
          // straight across the water and the rival re-pinned immediately.
          // Find real land instead, and fall back to the origin heading.
          let inland = Math.atan2(-rv.z, -rv.x);
          for (let ring = 1; ring <= 10; ring++) {
            let found = false;
            for (let k = 0; k < 12; k++) {
              const a4 = (k / 12) * Math.PI * 2 + ring * 0.26;
              const rr = ring * 12;
              if (biomeAt(rv.x + Math.cos(a4) * rr, rv.z + Math.sin(a4) * rr)
                && biomeAt(rv.x + Math.cos(a4) * (rr + 24), rv.z + Math.sin(a4) * (rr + 24))) {
                inland = a4; found = true; break;
              }
            }
            if (found) break;
          }
          inland += rand(-0.5, 0.5);
          rv.tx = rv.x + Math.cos(inland) * rand(50, 110);
          rv.tz = rv.z + Math.sin(inland) * rand(50, 110);
        }
        // ── hole-vs-hole: the danger loop ─────────────────────────────────────
        if (pr > rv.r * 1.2 && dp < pr * 0.95) {
          // the player swallows this rival whole — kick off the suck-in
          // spectacle (spiral + shrink above), out for 6s, respawns small
          // THE MARQUEE MEAL. Once the threat is stuffed she is the single best
          // thing on the island to eat: a fat flat bounty, a size bounty, and
          // HALF HER SCORE, plus every point she ever bit off you handed back.
          // That is the comeback play — you can be losing the leaderboard all
          // match and take the lead in one bite, which is exactly the kind of
          // ending a kid replays for.
          const marquee = isHunter && !hunting;
          const looted = marquee ? Math.round(rv.score * 0.5) : 0;
          const pts = marquee
            ? Math.round(400 + rv.r * 180 + looted + rv.stolen)
            : Math.round(100 + rv.r * 40);
          if (marquee) { rv.score -= looted; rv.stolen = 0; }
          api.onSpeak?.(rv.x, rv.z, pickLine(RIVAL_VOICE[rv.name].eaten));
          rv.halo.visible = false;
          rv.dyingT = 0.55; rv.visiting = false; rv.tgt = null; rv.cst = 0;
          api.onRivalEaten?.(rv.name, pts, rv.x, rv.z, rv.r, marquee);
          continue;
        }
        // THE HUNTER ONLY BITES OUT OF A CHARGE. Letting her bite on contact
        // measured at five hits in the first forty seconds — she simply loomed
        // over the player and the player walked into her. That is not a
        // predator, it is a hazard, and it read as the game punishing a child
        // for nothing they could see. A bite must be the outcome of a lunge the
        // player was warned about and failed to dodge, which caps it at one per
        // charge cycle and makes every one of them a beat with a cause.
        const canBite = !isHunter || !hunting || rv.cst === 2;
        if (rv.r > pr * 1.2 && dp < rv.r * 0.85 && rv.biteCd <= 0 && canBite) {
          // ── WHAT A BITE COSTS ───────────────────────────────────────────────
          // -12% radius was undone by the score floor within a frame or two, so
          // being caught was free and the family had no teeth at all. A bite now
          // takes SCORE as well as size — and the threat's bite is the one that
          // hurts, because she banks what she takes and you can win it all back
          // by eating her later. Shrink alone can be refunded by the growth law;
          // points cannot, so this is a cost the leaderboard actually shows.
          const heavyBite = isHunter && hunting;
          const steal = heavyBite ? Math.min(1200, Math.round(pScore * 0.08)) : 0;
          rv.biteCd = heavyBite ? 12 : 9; rv.pulse = 1;
          rv.missPend = false;   // she connected: this was no near miss
          if (heavyBite) {
            // she got what she came for: break off, wallow, and leave a long
            // gap before the next attempt
            rv.cst = 3; rv.ctim = 2.2;
          }
          if (steal > 0) { rv.score += steal; rv.stolen += steal; }
          api.onSpeak?.(rv.x, rv.z, pickLine(RIVAL_VOICE[rv.name].bite));
          api.onPlayerBitten?.(rv.name, { shrink: heavyBite ? 0.85 : 0.90, steal, hunter: heavyBite });
        }

        // ── eat nearby food -> grow by area + score ON THE PLAYER'S TERMS ─────
        // The family used to score a flat radius·12 with no combo, no prey
        // bonus and no rush multiplier, against a player who had all three.
        // They ate 2.2-3.4x more of the island than the player and still lost
        // 15:1, which meant the HUD and the leaderboard told a child two
        // opposite stories about the same match.
        rv.comboT -= dt; if (rv.comboT <= 0) rv.combo = 0;
        // RUBBER BAND — the leaderboard has to stay a real question without
        // ever becoming hopeless. A family member well ahead of the player eats
        // for less; one falling behind eats for more. Bounded both ways, so it
        // nudges the race without deciding it.
        const gap = (rv.score - pScore) / Math.max(900, pScore * 0.4);
        const band = THREE.MathUtils.clamp(1 - gap * 0.7, 0.34, 1.55);
        // …and the same crumb floor applies to what they sweep up in passing,
        // or they would strip the beginner layer just by driving over it
        const minSwallow = rv.r * 0.45;
        for (const e of edibles) {
          if (eaten(e.mesh) || e.radius > rv.r * EAT_RATIO || e.radius < minSwallow) continue;
          const dx = e.mesh.position.x - rv.x, dz = e.mesh.position.z - rv.z;
          if (dx * dx + dz * dz < (rv.r + e.radius * 0.6) ** 2) {
            e.mesh.userData.eaten = true;
            shrinking.push(e.mesh);   // animate out — buildings must never BLINK away
            rv.combo++; rv.comboT = RIVAL_COMBO_HOLD;
            const comboMult = 1 + Math.min(rv.combo, 25) * 0.1;
            const preyMult = (e.mesh.userData.ptsMult as number | undefined) ?? 1;
            rv.score += Math.max(1, Math.round(e.radius * 12 * comboMult * preyMult * fever * band));
            rv.r = growR(rv.r, e.radius);
            rv.pulse = 1;   // visible gulp — the family EATS, not just exists
            const bm2 = rv.body.material as THREE.ShaderMaterial | undefined;
            if (bm2?.uniforms?.uWobble) bm2.uniforms.uWobble.value = Math.min(1, (bm2.uniforms.uWobble.value as number) + 0.6);
            if (e.radius > rv.r * 0.55 && rv.speakCd <= 0) {   // a BIG bite earns a taunt
              rv.speakCd = rand(9, 16);
              api.onSpeak?.(rv.x, rv.z, pickLine(RIVAL_VOICE[rv.name].taunt));
            }
          }
        }
        // …and a score FLOOR, the same contract the player has: a family member
        // who is genuinely out-eating the island grows into it instead of being
        // pinned under a clock-shaped ceiling.
        if (!isHunter) {
          const floor = Math.min(softCap, START_R * (1 + Math.pow(Math.max(0, rv.score) / 974, 0.57)));
          if (rv.r < floor) rv.r = floor;
        }
        // THE CEILING, ENFORCED AFTER EATING. A single swallowed landmark can
        // add more radius in one frame than any per-frame easing can take back,
        // so the clamp has to be the last word on size every frame.
        if (rv.r > hardCap) rv.r = hardCap;

        // render — alive: a little roll-hop while moving, a squash-gulp on eats
        rv.pulse = Math.max(0, rv.pulse - dt * 3);
        // ── THEY MUST NOT FLOAT ───────────────────────────────────────────────
        // A sphere translated across a plane reads as a sliding orb, however
        // pretty it is. Three things fix that, and all three are free:
        //   1. it ROLLS. Rolling without slipping, ω = (up × v)/r, applied to
        //      the BODY only — the crown and the nightcap stay upright, which
        //      is what sells the body as a physical thing under a hat.
        //   2. it BOUNCES, at a rate and height set by how fast it is going,
        //      and it SQUASHES at the bottom of every bounce. Contact.
        //   3. it never leaves the ground: the centre sits at 0.88·r, so the
        //      bottom of the sphere is buried a little at all times.
        const spdN = Math.min(1, Math.hypot(rv.vx, rv.vz) / 34);
        const bounce = Math.abs(Math.sin(_t * (4.4 + 3.4 * spdN) + rv.ph));
        const hopA = bounce * (movedOk ? 0.035 + 0.085 * spdN : 0.02);
        const land = (1 - bounce) * spdN;                 // 1 at ground contact, at speed
        const sq = 1 + rv.pulse * 0.2 - land * 0.075;     // squash on landing, stretch on the gulp
        rv.group.position.set(rv.x, rv.r * (0.88 + hopA), rv.z);
        rv.group.scale.set(rv.r / Math.sqrt(sq), rv.r * sq, rv.r / Math.sqrt(sq));
        if (spdN > 0.01) {
          const vm = Math.hypot(rv.vx, rv.vz) || 1;
          tmp.set(rv.vz / vm, 0, -rv.vx / vm);            // up × v, normalised
          rollQ.setFromAxisAngle(tmp, (vm * dt) / Math.max(0.5, rv.r));
          rv.roll.premultiply(rollQ);
          rv.body.quaternion.copy(rv.roll);
        }
        rv.eyes.quaternion.copy(camera.quaternion);
        // look toward travel dir
        const aimX = dp < 30 ? (rv.x - px) / (dp || 1) * -1 : mx / md;   // it SAW you
        const wide = fleeing ? 1.28 : rv.cst === 1 ? 1.2 : 1;
        rv.eyes.children.forEach((c, ci) => {
          if (ci >= 4) return;   // accessory shades stay put
          c.position.x = (c.position.x < 0 ? -0.32 : 0.32) + THREE.MathUtils.clamp(aimX * 0.06, -0.06, 0.06);
          if (ci % 2 === 0) c.scale.setScalar(wide);   // scared stare
        });
        // hole.io's danger cue, pre-reader-proof: the ground disc tells the
        // truth at a glance — green = you can eat them, red = RUN, skin glow
        // when it's a fair fight
        const hm = rv.halo.material as THREE.MeshBasicMaterial;
        let haloK = 1.5;
        if (isHunter && hunting && rv.cst >= 1 && rv.cst <= 2) {
          // WIND-UP: the ring strobes and swells. Two seconds of "something is
          // about to happen" that a pre-reader cannot miss.
          const f = Math.abs(Math.sin(_t * (rv.cst === 1 ? 16 : 9)));
          hm.color.setHex(0xff2b3c); hm.opacity = 0.55 + 0.45 * f; haloK = 1.6 + 0.5 * f;
        } else if (isHunter && !hunting && rv.r > START_R * 2 && pr > rv.r * 1.05) {
          // THE PRIZE: gold, pulsing, unmistakable — the best meal on the island
          hm.color.setHex(0xffcf3a); hm.opacity = 0.7 + 0.3 * Math.abs(Math.sin(_t * 4)); haloK = 1.75;
        } else {
          hm.opacity = 0.85;
          if (pr > rv.r * 1.2) hm.color.setHex(0x54e88a);
          else if (rv.r > pr * EAT_RATIO) hm.color.setHex(0xff5560);
          else hm.color.setHex(rv.color);
        }
        rv.halo.position.set(rv.x, 0.14, rv.z); rv.halo.scale.setScalar(rv.r * haloK);
      }
    },
  };
  return api;
}
