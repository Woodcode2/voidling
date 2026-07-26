// Rival voids — the AI "family". They roam the island, eat from the SAME food
// pool as the player, and grow. Whoever consumes the most by the final whistle
// wins — so a rival really can beat you. Each is a cute coloured void (a tinted
// fresnel orb + glow + billboarded eyes) with a name and a live score.
import * as THREE from 'three';
import type { Biome } from './island';
import { SKINS, type Skin } from './palette';
import { buildAccessory, makeVoidBody, applySkinToBody } from './void3d';

export interface RivalEdible { mesh: THREE.Object3D; radius: number; }
export interface Rival { name: string; color: number; score: number; x: number; z: number; r: number; pulse?: number; }
export interface Rivals {
  list: Rival[];
  update(dt: number, t: number, playerX: number, playerZ: number, playerR: number): void;
  onJoin?: (name: string, color: number, x: number, z: number) => void;
  onRivalEaten?: (name: string, pts: number, x: number, z: number, r: number) => void;    // you swallowed one
  onPlayerBitten?: (name: string) => void;               // one bit YOU
  onSpeak?: (x: number, z: number, line: string) => void; // personality bubbles
  reset(): void;                                         // instant rematch
}

const NAMES = ['WOBBLES', 'GLITZ', 'BITSY', 'CHOMPZILLA', 'DOZER'];
// the family: anxious / show-off / baby / drama queen / sleepy. Names ARE the
// personalities now (Wobbles saying "I KNEW this would happen" is the joke).
// All lines <=26 chars so bubbles never wrap.
export const RIVAL_VOICE: Record<string, {
  taunt: string[]; respawn: string[]; eaten: string[];
  steal: string[]; escape: string[]; bite: string[];
  nearBig: string[]; nearSmall: string[]; rankUp: string[];
  visit: string[];   // the swing-by-and-say-hi lines (family, not enemies)
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
  interface R extends Rival { group: THREE.Group; eyes: THREE.Group; halo: THREE.Mesh; tx: number; tz: number; retarget: number; joinAt: number; joined: boolean; stall: number; ph: number; pulse: number; vx: number; vz: number; biteCd: number; respawnT: number; speakCd: number; tgt: RivalEdible | null; closeCall: boolean; visitT: number; visiting: boolean; dyingT: number; hx: number; hz: number; panic: number; }
  const rivals: R[] = [];
  const eaten = (m: THREE.Object3D) => m.userData.eaten || !m.visible;
  // WHO SHOWS UP is a roll of the dice: 3-5 family members, shuffled casting,
  // arriving at randomised times. Every match has a different line-up, so the
  // island never feels like the same scripted five.
  let cast: string[] = [];
  let JOIN_TIMES: number[] = [];
  function reroll() {
    cast = [...NAMES].sort(() => Math.random() - 0.5).slice(0, count);
    JOIN_TIMES = [rand(3, 8), rand(22, 40), rand(55, 80), rand(95, 125), rand(135, 165)];
  }
  reroll();

  // the family wears LEGENDARIES ONLY — the 3D-accessory hero skins (unicorn
  // horn, dino spikes, wizard hat, crown…). Aspirational: every family member
  // looks like something the player wants to own. Unique per rival, shuffled
  // per boot so each match features a different line-up.
  // FIXED CASTING: every family member always wears the SAME legendary, so a
  // kid learns "the sparkly unicorn is Uncle Glitz" instead of meeting five
  // strangers in new costumes every match. Recognition is the whole point.
  const FAMILY_SKIN: Record<string, string> = {
    WOBBLES: 'mecha', GLITZ: 'univoid', BITSY: 'rexling',
    CHOMPZILLA: 'kingvoid', DOZER: 'archmage',
  };
  const skinFor = (nm: string): Skin =>
    SKINS.find((s) => s.id === FAMILY_SKIN[nm]) ?? SKINS.filter((s) => s.acc)[0];
  for (let i = 0; i < count; i++) {
    const nm = cast[i % cast.length];
    const sk = skinFor(nm);
    const color = sk.rim;
    const { group, eyes, halo } = makeRivalMesh(sk, i);
    scene.add(group); scene.add(halo);
    group.visible = halo.visible = false;   // hidden until they join the feast
    // spread rivals around the island away from the player start
    const ang = (i / count) * Math.PI * 2 + 0.6;
    rivals.push({ name: nm, color, score: 0, r: START_R, group, eyes, halo,
      x: Math.cos(ang) * 150, z: Math.sin(ang) * 150, tx: 0, tz: 0, retarget: 0,
      joinAt: JOIN_TIMES[i % JOIN_TIMES.length], joined: false, stall: 0, ph: rand(0, 6), pulse: 0,
      vx: 0, vz: 0, biteCd: 0, respawnT: 0, speakCd: rand(4, 10), tgt: null, closeCall: false,
      visitT: rand(30, 70), visiting: false, dyingT: 0, panic: 0,
      // HOME TURF: each family member forages their OWN corner of the island.
      // Without this they orbited the player all match ("they hover around
      // you"), which is clingy, not alive.
      hx: Math.cos(ang) * 130, hz: Math.sin(ang) * 130 });
  }

  const anyVisiting = () => rivals.some((r) => r.visiting);
  const tmp = new THREE.Vector3();
  const api: Rivals = {
    list: rivals,
    reset() {
      // abandon in-flight eaten-anims: resetMatch restores those props to their
      // homes — leaving them queued here re-shrank them at match start (a
      // half-buried spinning house on lot #1 of every rematch)
      shrinking.length = 0;
      rivals.forEach((rv, i) => {
        const ang = (i / rivals.length) * Math.PI * 2 + 0.6;
        rv.x = Math.cos(ang) * 150; rv.z = Math.sin(ang) * 150;
        rv.r = START_R; rv.score = 0; rv.vx = 0; rv.vz = 0;
        rv.joined = false; rv.respawnT = 0; rv.biteCd = 0; rv.stall = 0; rv.pulse = 0;
        rv.visitT = rand(14, 30); rv.visiting = false; rv.dyingT = 0;
        rv.group.visible = rv.halo.visible = false;
        rv.group.rotation.y = 0;
      });
      // RE-ROLL THE MATCH. The cast shuffle and the join times used to be
      // rolled once, in the closure, at module load — so they only ever changed
      // on a full page reload, and the game's own PLAY AGAIN button never
      // reloads. A play-through of three back-to-back matches produced the same
      // line-up joining at the same seconds, three times running. The variety
      // was real and permanently invisible.
      reroll();
      rivals.forEach((rv, i) => {
        rv.name = cast[i % cast.length];
        rv.joinAt = JOIN_TIMES[i % JOIN_TIMES.length];
        rv.speakCd = rand(4, 10);
        rv.ph = rand(0, 6);
        // and a different corner of the island to forage each time
        const a2 = (i / rivals.length) * Math.PI * 2 + rand(0, Math.PI * 2);
        rv.hx = Math.cos(a2) * rand(105, 155); rv.hz = Math.sin(a2) * rand(105, 155);
      });
    },
    update(dt, _t, px, pz, pr) {
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
      const lawCap = START_R + LAW_RATE * _t;   // rivals obey the growth law too
      for (const rv of rivals) {
        if (!rv.joined) {
          if (_t >= rv.joinAt) {
            rv.joined = true;
            rv.group.visible = rv.halo.visible = true;
            api.onJoin?.(rv.name, rv.color, rv.x, rv.z);
          } else continue;   // not on the island yet
        }
        if (rv.r > lawCap) rv.r = lawCap;
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
            rv.x = px + Math.cos(a2) * rr; rv.z = pz + Math.sin(a2) * rr;
            if (!biomeAt(rv.x, rv.z)) { rv.x = Math.cos(a2) * 100; rv.z = Math.sin(a2) * 100; }
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
        const fleeing = canBeEaten && dp < pr + rv.r * 1.4;
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
        if (!rv.visiting && !fleeing && rv.visitT <= 0 && dp > 60 && !anyVisiting()) {
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
          let fdx = dpx / (dp || 1), fdz = dpz / (dp || 1);
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
          let best: RivalEdible | null = null, bd = Infinity;
          for (const e of edibles) {
            if (eaten(e.mesh) || e.radius > rv.r * EAT_RATIO) continue;   // only hunt what it can eat
            const d = (e.mesh.position.x - rv.x) ** 2 + (e.mesh.position.z - rv.z) ** 2;
            if (d < bd) { bd = d; best = e; }
          }
          if (best) { rv.tx = best.mesh.position.x; rv.tz = best.mesh.position.z; rv.tgt = best; }
          else if (rv.name === 'BITSY') { rv.tx = px + rand(-45, 45); rv.tz = pz + rand(-45, 45); rv.tgt = null; }   // the baby follows the player around
          else {
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
        const spdSec = (fleeing ? 31 * tired : 22) * Math.min(1.7, Math.pow(rv.r / START_R, 0.5));
        rv.vx += ((mx / md) * spdSec - rv.vx) * Math.min(1, dt * 5);
        rv.vz += ((mz / md) * spdSec - rv.vz) * Math.min(1, dt * 5);
        const spd = Math.hypot(rv.vx, rv.vz) * dt;
        const nx = rv.x + rv.vx * dt, nz = rv.z + rv.vz * dt;
        // BODY-AWARE. This used to test the CENTRE point only, so a rival would
        // walk its whole body out over the water and jitter on the waterline —
        // the "AI tries to go into the water and it's glitching" report. Test a
        // ring at the rival's own size, exactly like the player's wall does.
        const bm = Math.min(rv.r * 0.7, 3.5 + rv.r * 0.15) + 1.0;
        const fits = (x: number, z: number) => !!biomeAt(x, z)
          && !!biomeAt(x + bm, z) && !!biomeAt(x - bm, z)
          && !!biomeAt(x, z + bm) && !!biomeAt(x, z - bm);
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
        if (rv.stall > 0.8) {   // pinned in a corner: abandon target, wander inland
          rv.stall = 0; rv.retarget = rand(1.2, 2.2);
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
          const pts = Math.round(100 + rv.r * 40);   // eating a hole is the marquee play
          api.onSpeak?.(rv.x, rv.z, pickLine(RIVAL_VOICE[rv.name].eaten));
          rv.halo.visible = false;
          rv.dyingT = 0.55; rv.visiting = false; rv.tgt = null;
          api.onRivalEaten?.(rv.name, pts, rv.x, rv.z, rv.r);
          continue;
        }
        if (rv.r > pr * 1.2 && dp < rv.r * 0.85 && rv.biteCd <= 0) {
          rv.biteCd = 9; rv.pulse = 1;
          api.onSpeak?.(rv.x, rv.z, pickLine(RIVAL_VOICE[rv.name].bite));
          api.onPlayerBitten?.(rv.name);
        }

        // eat nearby food (size-gated) -> grow by area + score
        for (const e of edibles) {
          if (eaten(e.mesh) || e.radius > rv.r * EAT_RATIO) continue;
          const dx = e.mesh.position.x - rv.x, dz = e.mesh.position.z - rv.z;
          if (dx * dx + dz * dz < (rv.r + e.radius * 0.6) ** 2) {
            e.mesh.userData.eaten = true;
            shrinking.push(e.mesh);   // animate out — buildings must never BLINK away
            rv.score += Math.max(1, Math.round(e.radius * 12));   // same points scale as the player
            rv.r = growR(rv.r, e.radius);
            rv.pulse = 1;   // visible gulp — the family EATS, not just exists
            const bm = (rv.group.children[0] as THREE.Mesh)?.material as THREE.ShaderMaterial | undefined;
            if (bm?.uniforms?.uWobble) bm.uniforms.uWobble.value = Math.min(1, (bm.uniforms.uWobble.value as number) + 0.6);
            if (e.radius > rv.r * 0.55 && rv.speakCd <= 0) {   // a BIG bite earns a taunt
              rv.speakCd = rand(9, 16);
              api.onSpeak?.(rv.x, rv.z, pickLine(RIVAL_VOICE[rv.name].taunt));
            }
          }
        }

        // render — alive: a little roll-hop while moving, a squash-gulp on eats
        rv.pulse = Math.max(0, rv.pulse - dt * 3);
        const hopA = Math.abs(Math.sin(_t * 5 + rv.ph)) * (movedOk ? 0.07 : 0.02);
        const sq = 1 + rv.pulse * 0.2;
        rv.group.position.set(rv.x, rv.r * (0.9 + hopA), rv.z);
        rv.group.scale.set(rv.r / Math.sqrt(sq), rv.r * sq, rv.r / Math.sqrt(sq));
        rv.eyes.quaternion.copy(camera.quaternion);
        // look toward travel dir
        const aimX = dp < 30 ? (rv.x - px) / (dp || 1) * -1 : mx / md;   // it SAW you
        const wide = fleeing ? 1.28 : 1;
        rv.eyes.children.forEach((c, ci) => {
          if (ci >= 4) return;   // accessory shades stay put
          c.position.x = (c.position.x < 0 ? -0.32 : 0.32) + THREE.MathUtils.clamp(aimX * 0.06, -0.06, 0.06);
          if (ci % 2 === 0) c.scale.setScalar(wide);   // scared stare
        });
        rv.halo.position.set(rv.x, 0.14, rv.z); rv.halo.scale.setScalar(rv.r * 1.5);
        // hole.io's danger cue, pre-reader-proof: the ground disc tells the
        // truth at a glance — green = you can eat them, red = RUN, skin glow
        // when it's a fair fight
        const hm = rv.halo.material as THREE.MeshBasicMaterial;
        if (pr > rv.r * 1.2) hm.color.setHex(0x54e88a);
        else if (rv.r > pr * EAT_RATIO) hm.color.setHex(0xff5560);
        else hm.color.setHex(rv.color);
        void tmp;
      }
    },
  };
  return api;
}
