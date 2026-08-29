// Rival voids — the AI "family". They roam the island, eat from the SAME food
// pool as the player, and grow. Whoever consumes the most by the final whistle
// wins — so a rival really can beat you. Each is a cute coloured void (a tinted
// fresnel orb + glow + billboarded eyes) with a name and a live score.
import * as THREE from 'three';
import { inDeepWater3, type Biome } from './island';
import { SKINS, type Skin } from './palette';
import { buildAccessory, makeVoidBody, applySkinToBody } from './void3d';

export interface RivalEdible { mesh: THREE.Object3D; radius: number; }
// live match context the family needs to race the player fairly: the clock
// length, the player's score (the rubber band reads it) and the shared HAPPY
// HOUR multiplier (the family eats the bake sale too).
// `par` is what FIRST PLACE is worth in a full-length match ON THIS WORLD, as
// an ABSOLUTE score. It has to come from the caller because the worlds are not
// comparable: measured child runs finish around 104k on Maple Falls and 230k on
// Game Day, because Game Day is dense enough that the combo multiplier never
// lapses. A single global constant is what made the ladder decorative — see
// laneWant.
export interface RivalCtx { matchLen: number; playerScore: number; fever: number; par?: number; }
// what a rival COSTS you when it catches you — the HUD reports both halves.
// `form` is the owner's price (decision 2, 2026-08-26: "more punishing then 10
// percent loss. Like a level loss"): true means the handler walks the player
// one rung down the form ladder; false is the legacy percentage nibble, which
// only the QA __bite hook can still send.
export interface RivalHit { shrink: number; steal: number; hunter: boolean; form: boolean; }
export interface Rival { name: string; color: number; score: number; x: number; z: number; r: number; pulse?: number; arch?: string; hunting?: boolean; joined?: boolean;
  // QA readouts: which rung of the ladder this one is running, and how long
  // since it last swallowed anything. Both exist because "why is GRUMPS on 47
  // points" cost five wrong guesses to answer without them.
  lane?: number; dry?: number; full?: boolean;
  // QA: is THE SURGE (owner decision 2) holding this rival above the player
  // right now? qa/rivalswing.mjs attributes size-lead crossings with it.
  surge?: boolean; }
export interface Rivals {
  list: Rival[];
  /** QA: how many props the family has taken off-screen this match. */
  grazeCount(): number;
  /** QA: the lane multiplier's behaviour this match — mean, max, and how much
   *  of the time it sat pinned at its clamp. A band pinned at the ceiling means
   *  the family is FOOD-limited, not multiplier-limited, and no amount of
   *  raising the target will move them. See qa notes on Pirate Bay. */
  bandStat(): { mean: number; max: number; pinnedPct: number; n: number };
  update(dt: number, t: number, playerX: number, playerZ: number, playerR: number, ctx?: RivalCtx): void;
  onJoin?: (name: string, color: number, x: number, z: number, arch: Arch) => void;
  onRivalEaten?: (name: string, pts: number, x: number, z: number, r: number, marquee: boolean) => void; // you swallowed one
  onPlayerBitten?: (name: string, hit: RivalHit) => void; // one bit YOU
  // `name` rides along so the caller can attribute a line it cannot show as a
  // bubble — a rival speaking from across the island is out of frame, and a
  // bubble at their world position plays to nobody. See rivals.onSpeak in
  // prototype3d.ts, which routes far speech to the ticker under the name.
  onSpeak?: (x: number, z: number, line: string, name: string) => void;
  onCharge?: (name: string, x: number, z: number) => void;   // the BULLY winds up a lunge
  /** A rival bigger than you has NOTICED you and is holding a look. Not a
   *  charge and not a threat to dodge — the cue for it must stay quieter than
   *  onCharge's, or the two stop meaning different things. See rivals.onNotice
   *  in prototype3d.ts. */
  onNotice?: (name: string, x: number, z: number, color: number) => void;
  onNearMiss?: (name: string, x: number, z: number) => void; // …and it whiffs. the retellable beat.
  onStuffed?: (name: string, x: number, z: number) => void;  // the threat turns into the MEAL
  /** THE SURGE (owner decision 2): a sibling has grown LARGER than the player
   *  and will hold it for a beat before sagging back. Like onNotice, the cue
   *  for this must stay quieter than onCharge's — it is "be on your toes",
   *  not "dodge NOW". See rivals.onSurge in prototype3d.ts. */
  onSurge?: (name: string, x: number, z: number, color: number) => void;
  reset(matchLen?: number): void;                        // instant rematch
}

/** Fisher-Yates. `.sort(() => Math.random() - 0.5)` is not a shuffle: it hands
 *  a non-transitive comparator to an implementation-defined sort, and the
 *  result is strongly biased. Measured on V8 over 100,000 trials, the cast
 *  draw dropped BIGSHOT 9.4% of the time and GRUMPS 31.3% — so BIGSHOT played 91%
 *  of matches and GRUMPS 69%, on the one system that gives a match its variety. */
function shuffle<T>(a: T[]): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// THE FAMILY, RENAMED (owner: "Chompzilla and void family names... are lame").
// Every name SAYS its game, in a six-year-old's own vocabulary, and the irony
// lands where it should: the apex predator of the family is called NIBBLES.
//   NIBBLES  (Auntie)  BULLY   — hunts YOU. the sweetest name on the scariest void.
//   BIGSHOT  (Uncle)   SHOWOFF — crosses the island for the biggest thing on it.
//   JELLY    (Cousin)  COWARD  — wobbly, scared of everything, delicious-sounding.
//   ECHO     (Baby)    COPYCAT — does whatever you just did.
//   GRUMPS   (Grandpa) HOARDER — half everyone's speed. gets there when he gets there.
// All ≤7 characters, which also un-truncates the live leaderboard rows.
const NAMES = ['JELLY', 'BIGSHOT', 'ECHO', 'NIBBLES', 'GRUMPS'];
const FIRST_LANE: Record<string, number> = {
  NIBBLES: 0, BIGSHOT: 1, ECHO: 2, JELLY: 3, GRUMPS: 4,
};
// ── ARCHETYPES ───────────────────────────────────────────────────────────────
// The family used to path to food and back — five different faces running one
// brain. Every member now plays a game a child can NAME after watching it for
// ten seconds, and the archetype is FIXED to the name so it is learnable:
//   BULLY   NIBBLES  hunts YOU. charges, bites, gloats. the threat.
//   COWARD  JELLY     bolts from anything bigger. wide berth, jittery.
//   SHOWOFF BIGSHOT       crosses the whole island for the biggest landmark.
//   COPYCAT ECHO       drives your own route about 7 seconds behind you.
//   HOARDER GRUMPS       works a drifting patch at HALF everyone else's cruising
//                        speed. (Not "camps one district": the camp is gone —
//                        see the five attempts recorded at the target picker.
//                        A comment that describes a behaviour the code does not
//                        implement is how a costume gets cast against the truth.)
export type Arch = 'BULLY' | 'COWARD' | 'SHOWOFF' | 'COPYCAT' | 'HOARDER';
export const ARCH_OF: Record<string, Arch> = {
  NIBBLES: 'BULLY', JELLY: 'COWARD', BIGSHOT: 'SHOWOFF', ECHO: 'COPYCAT', GRUMPS: 'HOARDER',
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
  JELLY: {
    taunt: ['sorry!! but also: yum!!', 'I ate it?? I ATE IT!', "don't be mad don't be mad", 'oh no. am I winning??', 'was that ok to eat??', 'eek! I mean. NOM!'],
    respawn: ['I KNEW this would happen', 'ow. told you. OW.', 'respawning. nervously.', "is it safe?? it's not."],
    eaten: ['called it.', "it's dark in here??", 'worst. day. EVER.'],
    steal: ['I was gonna eat that!!', 'that was MY snack!! eep', 'rude!! politely rude!!'],
    escape: ['THAT WAS TOO CLOSE!!', 'too close too close!!', 'never doing that again'],
    bite: ['SORRY!! it was reflex!!', 'I panicked and CHOMPED', 'oh no I chomped a friend'],
    nearBig: ['am I… bigger?? AAAH', 'being big is SCARY', "don't make me use this"],
    nearSmall: ['NOPE NOPE NOPE NOPE', 'pretend I am a rock', 'walking away quickly!!'],
    rankUp: ['I passed you?? sorry!!', 'winning is stressful!!', 'how did THAT happen'],
    visit: ['hi!! just checking on you', 'you look bigger?? EEP', 'stay safe ok?? ok bye!!', 'I brought moral support'],
    arch: ['RUNNING AWAY NOW!!', 'nope nope nope nope NOPE', 'I choose: not that!!', 'scattering!! like a bird!!'],
  },
  BIGSHOT: {
    taunt: ['no photos, please', 'skill. pure skill.', 'the crowd goes WILD', "bet you can't do THAT", 'flawless. as usual.', 'top THAT, superstar'],
    respawn: ['I meant to do that', 'nobody saw that. good.', 'a fluke. obviously.', 'my glow!! ruined!!'],
    eaten: ["unfair!! I'm the STAR", 'my fans will hear of this', 'rude AND jealous'],
    steal: ['excuse me?? RESERVED', 'that had MY name on it', 'the AUDACITY. stunning.'],
    escape: ['TOO SLOW! hehehe', 'you almost touched FAME', 'catch me? adorable.'],
    bite: ['delicious. obviously.', 'a five-star bite', "don't take it personally"],
    nearBig: ['ooh, a tiny one!', 'you will get BIG soon', 'so small. so speedy.'],
    nearSmall: ["I'm not scared. (I am)", 'my mirror said RUN', 'this is bad for my HAIR'],
    rankUp: ['outta my way, speedy', 'first place suits me', 'and THAT is star power'],
    visit: ['came to bless your day', 'you may admire me. go.', 'we are SO photogenic', 'twinning!! sort of.'],
    arch: ['that one. the BIG one.', 'only landmarks, darling', 'watch me eat something HUGE', 'small snacks are for YOU'],
  },
  ECHO: {
    taunt: ['nom nom nom hehe', 'I did a WINNING!', 'big bite! BIGGEST bite!', 'dat one was YUMMY', 'me first! ME FIRST!', 'look!! I ate a house!!'],
    respawn: ['owie.', 'I want a do-over!!', 'not fair!! *sniff*', 'nap. then REMATCH.'],
    eaten: ['waaaAAAH!!', "you're a MEANIE", "I'm telling NIBBLES"],
    steal: ['MINE! dat was MINE!!', 'gimme it BACK!!', "I'm telling GRUMPS!!"],
    escape: ["can't catch meee!", 'hehehe too wiggly!', 'nyoom nyoom nyoom!'],
    bite: ['CHOMP! hehehe', 'you taste like grape', 'oopsie chompsie!'],
    nearBig: ["I'm da BIG kid now!", 'look how BIG I got!!', 'fear my tiny might!!'],
    nearSmall: ['eep!! big person!!', 'be nice to babies!!', 'I want my blankie!!'],
    rankUp: ['I winned past you!!', 'zoom zoom, catch up!', 'babies rule!!'],
    visit: ['HI HI HI HI HI!!', 'watcha eating?? can I??', "tag!! you're it!! hehe", 'I missed you SO much'],
    arch: ['I go where YOU go!!', 'copying you!! hehehe', 'me too!! me too!! me TOO', 'following!! following!!'],
  },
  NIBBLES: {
    taunt: ['BEHOLD: dinner AND a show', 'a FEAST worthy of ME', 'the island? MY stage.', 'gasp. magnificent. me.', 'act two: I DEVOUR', "applause. I'll wait."],
    respawn: ['the AUDACITY!!', 'I shall RETURN!! *swish*', 'my villain origin story', 'curtain?? ALREADY??'],
    eaten: ['a TRAGEDY in one act', 'the drama!! the DRAMA!!', 'eaten?! by an AMATEUR?!'],
    steal: ['STOP!! THIEF!! DRAMA!!', 'my dinner!! MY SCENE!!', 'you DARE upstage me?!'],
    escape: ['DENIED! crowd goes wild', 'you missed! DRAMATIC!', 'the plot THICKENS!!'],
    bite: ['a taste of VICTORY!!', 'consider that ACT ONE', 'delicious foreshadowing'],
    nearBig: ['tremble, tiny snack!!', 'bow before NIBBLES', 'the stage is MINE now'],
    nearSmall: ["spare me!! I'm FAMOUS", 'not the GLOW!!', 'exit!! stage LEFT!!'],
    rankUp: ['the LEAD is my destiny', 'a STAR is reborn!!', 'weep, understudy!!'],
    visit: ['a VISIT from greatness', 'we feast TOGETHER, kid', 'the gala is SATURDAY', 'family!! DRAMATIC hug!!'],
    arch: ['I am CHASING you, dear', 'race you, darling!', 'I want that snack TOO', 'faster, darling! FASTER!'],
    charge: ['ACT TWO: I CHARGE!!', 'HERE I COME, DARLING!!', 'CHAAARGE!! dramatically!!', 'coming through, DARLING!!'],
    // no reverse psychology in the stuffed pool: this state is the designed
    // pivot where the predator becomes the prize, and "do NOT eat me" was a
    // literal instruction not to — at the exact moment the game wants attack
    stuffed: ['ohh… I am SO full…', 'too full… to chase… ugh', 'I cannot run!! TOO FULL!!', 'I regret… everything…'],
  },
  GRUMPS: {
    taunt: ['huh? oh. I ate that.', '*yawn* …delicious', 'winning is exhausting', 'five more bites…', 'zzz… crunch… zzz', 'oops. swallowed a bus.'],
    respawn: ['best nap ever', "wake me when it's safe", 'ugh. mornings.', 'snooze… then chomp'],
    eaten: ['finally, a nap', 'cozy in here, actually', 'zzzzz…'],
    steal: ['hey… I called dibs… zzz', 'that was my breakfast…', 'rude. *angry yawn*'],
    escape: ['phew. back to my nap', 'cardio?? never again', 'sneaking off. sleepily.'],
    bite: ['mm. midnight snack.', 'sorry. sleep-chomping.', 'zzz. chomp. zzz.'],
    nearBig: ['oh. when did I get big', 'being big is nap-sized', 'huh. tall now.'],
    nearSmall: ['zzz— AAH okay running', 'five more minutes!!', 'too sleepy to flee…'],
    rankUp: ['passed you in my sleep', 'passed you. still yawning.', 'zzzoom.'],
    visit: ['strolled by… *yawn* hi', 'nice spot for a nap', 'you grew. neat. zzz', 'grandpa hug… later…'],
    // the camp is gone, so these lines cannot promise one either
    arch: ['no rush. no rush at all.', '*yawn* …still eating', 'slow and steady, dear', 'save some for grandpa'],
  },
};
const pickLine = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
const COLORS = [0x2fd8c0, 0xff6fb0, 0xff9a3a, 0x7ed57a, 0x4d8ff0];
const rand = (a: number, b: number) => a + Math.random() * (b - a);
// must match the player model (2D game constants through the 0.05 map scale)
const EAT_RATIO = 1.11, R_CAP = 12, START_R = 0.9, LAW_RATE = 0.025;
// ── THE FIELD IS A LADDER, NOT A LOTTERY ─────────────────────────────────────
// Measured across identical zero-input matches on MAPLE FALLS: the leader
// finished on 13,482 / 13,459 / 13,313 — a 1.3% spread, because the size cap
// pins the top of the field — while SECOND place came in on 11,988, then
// 3,663, then 10,194, and FOURTH on 3,527, then 792, then 4,653. A fifteenfold
// swing on identical play. A child's finishing position was therefore decided
// by which district a sibling happened to wander into, not by anything the
// child did, and "you came 2nd" carried no information about how well they
// played.
//
// Each rival now runs in a LANE: a target score for this moment in the match.
// They still hunt, flee, follow footprints and amble exactly as before — the
// lane only nudges what a BITE IS WORTH, bounded hard in both directions, so a
// sibling who blunders into the fairground cannot run away with the match and
// one who finds an empty field cannot finish on 47. Placement becomes five
// spaced thresholds a player can learn and beat.
//
// Lanes are re-shuffled every match, so which sibling is the one to beat still
// changes — the variety lives in the CAST, not in the difficulty.
//
// Tuned against measurement, not intuition. A first pass tried to hold the
// lanes with the score multiplier alone and could not: a rival ten times over
// its lane was already pinned at the multiplier's floor and still finished on
// 9,901 against a target of 1,041, because 0.35x of a large appetite is still
// large. Pushing the floor low enough to bind would have meant a rival
// swallowing a house for one point, which looks broken on the leaderboard.
// So the multiplier handles the rival who is BEHIND, and a satiety gate
// handles the one who is ahead: past its lane it simply stops looking for
// food and ambles until the lane catches up. That reads on screen as a
// character who has had enough, which is the same beat the stuffed hunter
// already plays.
//
// VERIFIED, four identical matches, MAPLE FALLS:
//   1st  11867 / 12141 / 12182 / 12007   sd  1%
//   2nd   8214 /  6934 /  8574 /  7273   sd  9%
//   3rd   5618 /  5521 /  5528 /  5516   sd  1%
//   4th   3769 /  3954 /  3440 /  3763   sd  5%
//   5th   1992 /  2128 /  2519 /  2457   sd 10%
// Five separated rungs, worst spread 10%, against a second place that used to
// swing fifteenfold. A different sibling led all four matches — NIBBLES,
// JELLY, BIGSHOT, BIGSHOT — so the variety lives in the cast while the
// difficulty stays learnable, which is the whole point.
const LANE_FINAL = [1.00, 0.68, 0.46, 0.31, 0.20];   // fractions of the top lane
const FIELD_TOP = 16000;        // LEGACY fallback only — see laneWant and PAR below
// How far above the player the whole field may ever be anchored. This is the
// owner's "never finish below 3rd" floor expressed as a number: at 1.15, lane 1
// tops out at 0.94 x the player even after satiety, so the leader is the only
// rival that can beat them.
const PLAYER_CEIL = 1.15;
const FIELD_CURVE = 1.45;       // eating accelerates: the ladder rises the same way
const FULL_AT = 1.20;           // stop foraging this far past the lane…
const HUNGRY_AT = 0.95;         // …and start again when the lane catches up
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
  else if (idx % 5 === 0) {   // JELLY: sweat drop at the temple
    const drop = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), new THREE.MeshBasicMaterial({ color: 0x8fd8ff, transparent: true, opacity: 0.9, depthWrite: false }));
    drop.scale.set(1, 1.5, 1); drop.position.set(0.5, 0.72, 0.5); group.add(drop);
  } else if (idx % 5 === 1) {   // BIGSHOT: star shades (billboard with the eyes)
    for (const sx of [-0.32, 0.32]) {
      const lens = new THREE.Mesh(new THREE.CircleGeometry(0.15, 16), new THREE.MeshBasicMaterial({ color: 0x140a26, depthTest: false, depthWrite: false }));
      lens.position.set(sx, 0.1, 1.03); lens.renderOrder = 7; eyes.add(lens);
    }
    const bridge = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.03), new THREE.MeshBasicMaterial({ color: 0x140a26, depthTest: false, depthWrite: false }));
    bridge.position.set(0, 0.12, 1.03); bridge.renderOrder = 7; eyes.add(bridge);
  } else if (idx % 5 === 2) {   // ECHO: single baby hair curl
    const curl = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.035, 8, 14, Math.PI * 1.4), bmat(new THREE.Color(color).multiplyScalar(0.7).getHex()));
    curl.position.set(0, 1.02, 0); curl.rotation.set(0.4, 0, 0.3); group.add(curl);
  } else if (idx % 5 === 3) {   // NIBBLES: rakishly tilted gold crown
    const crown = new THREE.Group();
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.14, 0.13, 8, 1, true), new THREE.MeshBasicMaterial({ color: 0xffd34d, side: THREE.DoubleSide }));
    crown.add(band);
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2;
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.1, 6), bmat(0xffd34d));
      spike.position.set(Math.cos(a) * 0.15, 0.11, Math.sin(a) * 0.15); crown.add(spike);
    }
    crown.position.set(0.12, 0.96, 0.1); crown.rotation.z = -0.3; group.add(crown);
  } else {   // GRUMPS: floppy nightcap + pom-pom
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
    lane: number;   // which rung of the finishing ladder this one is running
    dry: number;    // seconds since this rival last swallowed anything
    graze: number;  // countdown to the next off-screen larder bite (see below)
    full: boolean;  // past its lane: ambling, not foraging
    respawnT: number; speakCd: number; tgt: RivalEdible | null; closeCall: boolean;
    visitT: number; visiting: boolean; dyingT: number; hx: number; hz: number; panic: number;
    // scoring, on the player's own terms
    combo: number; comboT: number;
    // raw points this rival has earned BEFORE the lane multiplier — the plant
    // gain the controller below divides by. Without it the band is guessing at
    // how rich a world is; with it, it measures.
    raw: number;
    // BULLY: the charge state machine (0 prowl, 1 wind-up, 2 lunge, 3 recover)
    cst: number; ctim: number; missPend: boolean; missCd: number; stolen: number; stuffedSaid: boolean; stuffCap: number;
    // THE SURGE (owner decision 2). surgeR is the pinned target radius while a
    // surge runs (0 = not surging) — absolute, fixed at surge start, so a
    // player who goes and consumes can outgrow it; surgeT is the hold time
    // left before it sags.
    surgeR: number; surgeT: number;
    // ── THE LOOK ─────────────────────────────────────────────────────────
    // Every void bigger than you CAN bite you — the bite gate is
    // `rv.r > pr * 1.2`, not "is this the bully" — but only the BULLY ever
    // came at you, so the other four read as scenery with teeth nobody
    // believes in. The owner: "It seems only 1 void is ever hostile … there
    // should be some sense of like I need to be on my toes somewhat. Again a
    // kids game right."
    //
    // So the rest of the family NOTICES. A big one that finds you close by
    // stops what it is doing, turns to face you, and holds for a beat. It does
    // not pursue, it does not charge, and it cannot start a chase — but since
    // owner decision 2 (2026-08-26), walking into one that is strictly larger
    // costs A FORM, not the old 10%, so the look is the warning for something
    // real. It is a LOOK, and it is enough to make a child steer around someone.
    eye: number; eyeCd: number;
    // SHOWOFF: the radius of the landmark it is currently crossing the map for
    lockR: number;
    // HOARDER: the district it has decided is its
    campX: number; campZ: number; campT: number;
    roll: THREE.Quaternion;
  }
  let grazeN = 0;   // QA: larder bites this match (see api.grazeCount)
  let bandSum = 0, bandMax = 0, bandPinned = 0, bandN = 0;   // QA: see bandStat
  // THE SURGE's clock: seconds until the next surge MAY start. It only counts
  // down while no surge is running and the window is open, so the 26-40s gap
  // it is refilled with is measured from the moment the previous surge CLEARS.
  let surgeCd = rand(4, 12);
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
  // ── THE CASTING, RE-DEALT (round 4, after the void-cast verdict) ────────
  // The previous deal put three of the five in somebody else's body: a SHADOW
  // NINJA called JELLY who runs away from everything, a T-REX called ECHO who
  // is the baby, and a DRAGON called GRUMPS who ambles at half everyone's
  // speed. That disagreement is what "the void names seem lame" was pointing
  // at — a name only sounds like somebody when the picture agrees with it, and
  // no rewrite of the word list can fix a picture that contradicts it. The
  // names are fine and they stay; the costumes move.
  //
  // The rule the deal is made on, because it outranks the joke: HOW DANGEROUS
  // A COSTUME LOOKS MUST TRACK HOW DANGEROUS THE SIBLING IS. The costume is on
  // screen for the whole match and a six-year-old reads a picture before it
  // reads a ring, so the fiercest body has to be on the only one that can eat
  // you and the softest on the one a child is supposed to chase.
  //
  //   NIBBLES  BULLY   → drako        the only sibling that hunts, charges and
  //                                   bites now wears the only costume that
  //                                   looks like it might: wings, gold horns,
  //                                   a muzzle. The sweetest name in the family
  //                                   on the fiercest body is the same joke it
  //                                   always was — finally told with a picture.
  //   BIGSHOT  SHOWOFF → kingvoid     a gold crown is "I am the biggest deal on
  //                                   this island", and crossing the whole map
  //                                   to be seen at the biggest thing on it is
  //                                   literally his target rule. BIGSHOT and a
  //                                   crown are one joke twice.
  //   JELLY    COWARD  → univoid      the harmless one a child is meant to
  //                                   CHASE now LOOKS harmless: pastel, soft
  //                                   ears, pink glow, sparkles. A sweet-food
  //                                   name gets a sweet body. And she bolts
  //                                   from 4.5x further out than anyone else,
  //                                   so she is the sibling you must name from
  //                                   across a street — which is exactly what
  //                                   the horn is for. It is the one accessory
  //                                   in the family that changes the OUTLINE
  //                                   rather than decorating the top of the
  //                                   skull, and the only one that still reads
  //                                   at a third of a screen away.
  //   ECHO     COPYCAT → shadowninja  the skin is called SHADOW, and a shadow
  //                                   is exactly what a copycat is: the dark
  //                                   one always behind you, driving the route
  //                                   you drove four seconds ago. Name, costume
  //                                   and behaviour finally say one thing.
  //   GRUMPS   HOARDER → rexling      a row of plates down a scaly back and two
  //                                   brow horns — a slow plated grazer, not a
  //                                   runner — on the one who moves at half
  //                                   everyone else's speed. The old lizard who
  //                                   will not get off his lawn.
  //
  // ZERO TRIANGLES, ZERO DRAW CALLS, ZERO SEEDED DRAWS. The SET of skins built
  // is unchanged, so this is a permutation of five strings and nothing else:
  // the same five accessories, the same five bodies, the same meshes in a
  // different order. qa/ringmeaning.mjs holds that as an invariant — FAMILY_SKIN
  // must stay a bijection onto the skins carrying `acc` — so a future re-deal
  // cannot quietly drop a costume or double one up. And rivals.ts makes no
  // seeded draws at all (grep mrnd/mr/mpick/mchance here: 0), so nothing here
  // can move an authored Maple placement.
  //
  // WHAT THIS CANNOT FIX FROM IN HERE: the shop still sells GRUMPS's costume
  // under the name "Rexling", which says little-rex where the sibling says old.
  // That name lives in palette.ts and renaming a $2.99 character is the owner's
  // call, not a casting one.
  const FAMILY_SKIN: Record<string, string> = {
    JELLY: 'univoid', BIGSHOT: 'kingvoid', ECHO: 'shadowninja',
    NIBBLES: 'drako', GRUMPS: 'rexling',
  };
  // ── THE FAMILY'S OWN COLOUR — AND WHY IT IS NOT THE SKIN'S ANY MORE ─────
  // A sibling's colour is its identity everywhere a child meets it: the ground
  // ring in the neutral band (the fair fight, below), the LOOK ring, the SURGE
  // ring, the join banner, the leaderboard row and the chip on its speech
  // bubble. It used to be `sk.rim` — taken straight off the SHOP palette, which
  // was authored to match five product cards and had never once been measured
  // against the four things this ring MEANS.
  //
  // Measured in CIE Lab on qa/formsep.mjs's own convention, whose bar for
  // "these two are the same colour" is ΔE 6:
  //
  //   JELLY   #ff4d5e   ΔE  3.1 from DANGER red  — the COWARD wore RUN. Her ring
  //                                                was red when she was dangerous
  //                                                and red when she was not, so
  //                                                the channel said nothing at all
  //                                                about the one sibling a child
  //                                                is supposed to chase.
  //   NIBBLES #ffd25a   ΔE 11.3 from PRIZE gold  — and in the neutral band, which
  //                                                is exactly when you CANNOT yet
  //                                                eat her. Two golds, adjacent
  //                                                meanings, opposite instructions.
  //   ECHO    #8ef07a   ΔE 16.6 from SAFE green
  //
  // These five are authored HERE, beside the cue colours they have to stay away
  // from, against both constraints at once: ΔE >= 42.2 from every cue colour and
  // ΔE >= 41.6 from each other — about seven times the ΔE 6 floor on both. They
  // are also deliberately all COOL, so "not red, not gold, not green" reads as
  // the fair fight before a child has learned which sibling is which, and none
  // of them is near white either (ΔE >= 44.0), because white at a rival's feet
  // is already the NEAR MISS flash.
  //
  //   JELLY   #ff8fd0  bubblegum — the unicorn's own pink glow
  //   BIGSHOT #b96bff  amethyst — the gems set in the crown he wears
  //   ECHO    #1ac6ff  electric blue, the one colour that reads off a black body
  //   NIBBLES #5ee8d8  the dragon's own teal
  //   GRUMPS  #9ea0fa  faded periwinkle. Not green: green is SAFE and the whole
  //                    point of this table is that a costume colour may not be a
  //                    meaning colour, even when the costume is green.
  //
  // qa/ringmeaning.mjs re-measures both bars from this table and from the halo
  // block's own literals, and photographs the real ring to check that the render
  // pipeline has not compressed the difference away.
  const FAMILY_INK: Record<string, number> = {
    JELLY: 0xff8fd0, BIGSHOT: 0xb96bff, ECHO: 0x1ac6ff,
    NIBBLES: 0x5ee8d8, GRUMPS: 0x9ea0fa,
  };
  const skinFor = (nm: string): Skin =>
    SKINS.find((s) => s.id === FAMILY_SKIN[nm]) ?? SKINS.filter((s) => s.acc)[0];
  NAMES.forEach((nm, i) => {
    const sk = skinFor(nm);
    const { group, eyes, halo } = makeRivalMesh(sk, NAMES.indexOf(nm));
    scene.add(group); scene.add(halo);
    group.visible = halo.visible = false;   // hidden until they join the feast
    const ang = (i / NAMES.length) * Math.PI * 2 + 0.6;
    roster.push({ name: nm, arch: ARCH_OF[nm], color: FAMILY_INK[nm], score: 0, r: START_R,
      group, body: group.children[0] as THREE.Mesh, eyes, halo,
      x: Math.cos(ang) * 150, z: Math.sin(ang) * 150, tx: 0, tz: 0, retarget: 0, graze: 0,
      joinAt: 9e9, joined: false, cast: false, stall: 0, stuckN: 0, ph: rand(0, 6), pulse: 0,
      // THE FIRST MATCH OF A PAGE LOAD IS AUTHORED, like the spawn. reset()
      // re-deals the ladder on every rematch, but a fresh load should open on
      // the reading that teaches the game: the hunter is the one to beat and
      // grandpa is bringing up the rear.
      lane: FIRST_LANE[nm] ?? i, dry: 0, full: false,
      vx: 0, vz: 0, biteCd: 0, respawnT: 0, speakCd: rand(4, 10), tgt: null, closeCall: false,
      visitT: rand(30, 70), visiting: false, dyingT: 0, panic: 0,
      combo: 0, comboT: 0, raw: 0, cst: 0, ctim: rand(6, 10), missPend: false, missCd: 0,
      eye: 0, eyeCd: rand(4, 12),
      stolen: 0, stuffedSaid: false, stuffCap: 0, lockR: 0,
      surgeR: 0, surgeT: 0,
      campX: Math.cos(ang) * 130, campZ: Math.sin(ang) * 130, campT: 0,
      roll: new THREE.Quaternion(),
      // HOME TURF: each family member forages their OWN corner of the island.
      // Without this they orbited the player all match ("they hover around
      // you"), which is clingy, not alive.
      hx: Math.cos(ang) * 130, hz: Math.sin(ang) * 130 });
  });

  // WHO SHOWS UP is a roll of the dice — with one fixed point. NIBBLES is
  // ALWAYS at the table, because she is the match's threat and, later, its
  // marquee meal; a match where the danger simply failed to be cast is a match
  // with no story. The other 2-4 seats are shuffled.
  function reroll(matchLen = 180) {
    // ── HOW MANY, NOT JUST WHO ────────────────────────────────────────────
    // The cast SIZE was drawn once, at module scope, in prototype3d.ts:
    // `createRivals(..., 3 + Math.floor(Math.random() * 3))`. reroll() reads
    // that closure-captured number, so it re-shuffled which siblings filled the
    // seats and never how many there were. One page load meant three rivals in
    // every match of that session; another meant five in every match — while
    // the comment beside the call promised "3-5 family members per match,
    // randomly cast — you never know who's coming."
    //
    // The roll belongs here, where the match starts.
    count = 3 + Math.floor(Math.random() * 3);
    const others = shuffle(NAMES.filter((n) => n !== 'NIBBLES'));
    const picked = ['NIBBLES', ...others.slice(0, Math.max(2, count - 1))];
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
      rv.joinAt = nm === 'NIBBLES' ? rand(7, 13) * k : slots[i];
    });
    rivals.length = 0;
    for (const rv of roster) if (rv.cast) rivals.push(rv);
  }
  reroll();

  // ── the player's breadcrumb trail ──────────────────────────────────────────
  // Sampled every third of a second. ECHO the COPYCAT drives down it about
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
    if (!biomeAt(x, z) || inDeepWater3(x, z, bm)) return false;
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

  /**
   * The score a rival in this lane should be carrying at time t.
   *
   * The ladder is anchored to FIELD_TOP but scaled by how the player is
   * actually doing, bounded to 0.62x-1.35x. That keeps both halves of the
   * promise: a struggling child can still reach third rather than staring at
   * an unreachable wall, and a child who is genuinely eating the island has to
   * keep earning first place instead of lapping a frozen field. It is a nudge
   * with a hard ceiling, not the old lottery.
   */
  const laneWant = (lane: number, t: number, matchLen: number, pScore: number, absPar?: number): number => {
    const prog = THREE.MathUtils.clamp(t / Math.max(1, matchLen), 0, 1);
    const shape = Math.pow(prog, FIELD_CURVE);
    // ── THE TARGET STOPS FLEEING ──────────────────────────────────────────
    // Everything below this block is the OLD ladder and is kept only as the
    // fallback for a caller that has not supplied a par. Read the block in
    // laneWant's docstring and docs/OVERNIGHT.md first: nine tuning attempts
    // failed because `top` was a function of pScore on BOTH branches, so the
    // whole thing was scale-invariant and any lever aimed at the player was
    // cancelled by the target moving with them.
    //
    // Worked out at full time (shape = 1) with a measured child run at 98k:
    //   branch A = FIELD_TOP * scale  = 9920 + 6080 * (pScore/7360)^0.88
    //   branch B = 0.94 * pScore
    // A binds, and A is very nearly proportional to pScore^0.88 — so cutting
    // the player 98k -> 82k moved leader/player from 0.706 to 0.739. Three
    // percentage points, against a measurement noise of nine. That is the whole
    // story of attempt 8.
    //
    // With an absolute par the player-side lever starts working again, because
    // every point the player gives up is a point of gap closed rather than a
    // point the target also gives up.
    //
    // The player CEILING is what keeps the owner's floor ("never finish below
    // 3rd"). Lane 1 wants 0.68 of the top and satiety lets it overshoot to
    // 1.2x, so its best case is 0.816 x top; at a ceiling of 1.15 x pScore that
    // is 0.94 x the player, i.e. lane 1 structurally cannot beat them. Only the
    // leader can, so a bad run finishes 2nd and a good one finishes 1st.
    if (absPar && absPar > 0) {
      const top = Math.min(absPar * shape, pScore * PLAYER_CEIL);
      return top * (LANE_FINAL[lane] ?? 0.14);
    }
    // par: what a player keeping level with third place would be carrying now
    const par = Math.max(200, FIELD_TOP * LANE_FINAL[2] * shape);
    // THE CEILING WAS THE WHOLE PROBLEM. Clamped at 1.35, first place could
    // never be worth more than 16,000 x 1.35 = 21,600 in a full match, while a
    // player who is actually playing finishes on 86,000-180,000. Measured final
    // boards: 179,923 against 9,571. The leaderboard is on screen for the whole
    // three minutes and it never once said anything true — you had already won
    // by the first evolution and nothing after that was a contest.
    //
    // The SLOPE was already right (0.38 against a par of 0.46 x FIELD_TOP puts
    // first place at roughly 0.8 x the player's score). Only the clamp was
    // wrong. The exponent is the one addition: sub-linear, so a genuinely great
    // run still pulls clear instead of being shadowed point for point, which is
    // the thing that makes rubber-banding feel like cheating.
    //
    //   player = par        -> first 16,000, player ties third   (as designed)
    //   player = 2x par     -> player runs second
    //   player = 100,000    -> first ~70,000, player wins by ~40%
    //   player = 180,000    -> first ~104,000, player wins by ~70%
    const ratio = Math.max(0, pScore / par);
    // THE CEILING CAME BACK, ONE WORLD LATER. 6.5 put a hard cap of
    // 16,000 x 6.5 = 104,000 on the ramp below, and since the ramp is the
    // MIN'd term, the player anchor stops binding the moment 0.78 x pScore
    // clears 104,000 — i.e. above a player score of about 133,000. On MAPLE
    // FALLS that never happened (a measured optimal run finishes near 47,000),
    // so the cap was invisible. GAME DAY is dense enough that the combo
    // multiplier never lapses, an optimal run finishes above 300,000, and the
    // field froze at 76,000 — a fourfold win, on a leaderboard that is on
    // screen the whole match. Exactly the bug the block above was written to
    // kill, hiding one world away.
    //
    // 24 is chosen so the ramp can still reach 0.78 x pScore at full time for
    // any player score up to ~490,000, which is well past anything reachable.
    // It does not loosen the early match: `shape` is what holds the field back
    // there, and re-measuring the same run gives a TIGHTER opening (1.30x at
    // 30 seconds against 1.78x before) because the ramp was clipped there too.
    const scale = THREE.MathUtils.clamp(0.62 + 0.38 * Math.pow(ratio, 0.88), 0.62, 24);
    // ── AND THE LADDER IS ANCHORED TO THE PLAYER, NOT JUST SCALED BY THEM ──
    // The scale curve alone over-corrected in the middle of the range. Worked
    // out from FULL_AT (a rival stops eating at 1.2x its lane, so that product
    // is the most it can ever be worth): at a player score of 20,000 first
    // place capped at 29,489, and at 50,000 it capped at 51,289 — ABOVE the
    // player in both cases. A child playing competently but not brilliantly
    // would have been beaten by the rubber band itself. That is worse than the
    // decorative race it replaced, and I would have shipped it without this.
    //
    // Anchoring the top of the field at 0.78x the player's own score fixes the
    // whole range at once: x1.2 for satiety puts the best possible rival at
    // 0.94x, so a player who is playing always finishes first — by a nose, with
    // the leader visible on the board the entire match, which is the point.
    // The nominal ladder stays as a FLOOR so a struggling child still has a
    // field to chase (and can still lose, which has to remain possible).
    // 0.78 x FULL_AT 1.2 = 0.94, so the best possible rival finished at 94% of
    // the player and the match could not be lost by anyone who touched the
    // screen. That was the right call while the family was starving — a
    // rubber band that can overtake a child who is trying is worse than a
    // decorative race. Now that the larder feeds them, the band can close: at
    // 0.94 the top lane reaches 1.13x the player with satiety, so a distracted
    // run genuinely loses and an attentive one genuinely wins. The nominal
    // ladder still floors it, so a struggling child keeps a field to chase.
    const top = Math.min(FIELD_TOP * shape * scale,
      Math.max(FIELD_TOP * LANE_FINAL[2] * shape, pScore * 0.94));
    return top * (LANE_FINAL[lane] ?? 0.14);
  };

  const anyVisiting = () => rivals.some((r) => r.visiting);
  const tmp = new THREE.Vector3();
  const rollQ = new THREE.Quaternion();   // scratch: the rolling-ball delta
  const api: Rivals = {
    list: rivals,
    grazeCount: () => grazeN,
    bandStat: () => ({ mean: bandN ? bandSum / bandN : 0, max: bandMax,
      pinnedPct: bandN ? bandPinned / bandN * 100 : 0, n: bandN }),
    reset(matchLen = 180) {
      // abandon in-flight eaten-anims: resetMatch restores those props to their
      // homes — leaving them queued here re-shrank them at match start (a
      // half-buried spinning house on lot #1 of every rematch)
      shrinking.length = 0; grazeN = 0;
      bandSum = 0; bandMax = 0; bandPinned = 0; bandN = 0;
      surgeCd = rand(4, 12);
      trail.length = 0; trailT = 0;
      roster.forEach((rv, i) => {
        const ang = (i / roster.length) * Math.PI * 2 + rand(0, Math.PI * 2);
        rv.x = Math.cos(ang) * 150; rv.z = Math.sin(ang) * 150;
        rv.r = START_R; rv.score = 0; rv.vx = 0; rv.vz = 0;
        rv.joined = false; rv.respawnT = 0; rv.biteCd = 0; rv.stall = 0; rv.pulse = 0;
        rv.visitT = rand(14, 30); rv.visiting = false; rv.dyingT = 0;
        rv.combo = 0; rv.comboT = 0; rv.raw = 0; rv.cst = 0; rv.ctim = rand(6, 10);
        rv.eye = 0; rv.eyeCd = rand(4, 12);
        rv.missPend = false; rv.missCd = 0; rv.stolen = 0; rv.stuffedSaid = false; rv.stuffCap = 0;
        rv.surgeR = 0; rv.surgeT = 0; rv.surge = false;
        rv.lockR = 0; rv.tgt = null; rv.dry = 0; rv.full = false;
        rv.speakCd = rand(4, 10); rv.ph = rand(0, 6);
        rv.roll.identity(); rv.body.quaternion.identity();
        rv.group.visible = rv.halo.visible = false;
        rv.group.rotation.y = 0;
        // a different corner of the island to forage — and to camp in — each time
        rv.hx = Math.cos(ang) * rand(105, 155); rv.hz = Math.sin(ang) * rand(105, 155);
        rv.campX = rv.hx; rv.campZ = rv.hz; rv.campT = 0;
      });
      // …and re-deal the ladder. Every sibling gets a turn at the top of the
      // leaderboard across a session, while the thresholds themselves stay put.
      {
        const lanes = shuffle(roster.map((_, i) => i));
        roster.forEach((rv, i) => { rv.lane = lanes[i]; });
      }
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
      const par = ctx?.par;
      // ── THE HUNT WINDOW ─────────────────────────────────────────────────
      // NIBBLES is a genuine predator for the first 55% of the match — she
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
      // Drive the SHARED void shader for every family body: the clock runs the
      // jelly idle + nebula drift, and each rival's wobble decays after its own
      // bites — they slosh when they swallow, exactly like the hero.
      //
      // AND THE REST OF ITS INPUTS, which is what was missing. The rivals wear
      // the hero's body (makeVoidBody) but only two of its seven per-frame
      // uniforms were ever written, so every sibling sat at uPxR's default,
      // uStage 0, uSlow 1 while the hero moved through 0.6, 1.25 and the rest.
      // uPxR is the readability law — the shader derives the rim's width from
      // it so the lit lip never drops below about two pixels — so a small
      // rival, which is exactly when a child most needs to see one coming,
      // rendered with the narrow lip meant for a WORLD ENDER filling the
      // screen. uSlow is the mass law: without it a five-unit rival vibrates at
      // the speed a marble does.
      //
      // Read off rv.body, not a parallel array. rivalMats aligns with roster
      // today only because both are pushed in the same forEach, and that is the
      // kind of coupling that survives exactly until someone adds a sixth
      // sibling or a menu preview.
      const persp = camera as THREE.PerspectiveCamera;
      const fovR = (persp.isPerspectiveCamera ? persp.fov : 32) * Math.PI / 360;
      const halfH = window.innerHeight / 2;
      for (const rv of roster) {
        const u = (rv.body.material as THREE.ShaderMaterial).uniforms;
        u.uTime.value = _t;
        u.uWobble.value = Math.max(0, (u.uWobble.value as number) - dt * 1.7);
        if (!rv.joined) continue;   // hidden siblings cost nothing
        u.uSlow.value = Math.min(1.25, Math.max(0.36, 1.25 / (0.6 + rv.r * 0.28)));
        const camD = Math.max(1, camera.position.distanceTo(rv.group.position));
        const pxR = (halfH / (camD * Math.tan(fovR))) * rv.r;
        u.uPxR.value = pxR;
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
      // play we want them chasing. The cap sits just under the 1/1.2 swallow
      // threshold (0.8333), so a rival at its ceiling is always catchable.
      //
      // The early clause is an absolute track, so the opening minute still has
      // real peers instead of a family scaled off a 0.9 hatchling — and it is
      // deliberately LOW. A first pass ran it to 2.7 by forty seconds against a
      // player who was still 1.2, and the measured result was ugly in two ways
      // at once: the family towered over the player for the whole first minute,
      // and at that size they could swallow prop classes the player could not,
      // so they stripped the island roughly six times faster than the player
      // ate. The family must never be the reason the island runs out.
      // ── 0.78 WAS THE REASON THE RACE ENDED AT SEVENTY SECONDS ─────────────
      // Instrumented (qa/laneshort.mjs, maple/child): the leader runs at 256%
      // of the player at t=20 and 122% at t=60 — the family genuinely races
      // while sizes are comparable — then 79% at t=81 and 56% at the whistle,
      // against a lane that wants 94%. Every rival finished at exactly 100.0%
      // of this cap. They are not short of food and not short of time; they are
      // pinned against this number.
      //
      // It caps SCORE, not just size, and that is the part that was missed.
      // Points are radius x 12 x multipliers, and what a rival may eat is
      // radius <= r x EAT_RATIO — so a cap on r is a cap on the CLASS of prop
      // it can score from. At 0.78 a rival reaches 0.87x the player's own bite
      // size, so the biggest and highest-scoring props on the island are the
      // player's alone. Worse, every bite it does take grows it into hardCap,
      // which confiscates the gain: the player's growth compounds and the
      // family's is taken away each frame.
      //
      // The band cannot fix that, and the three attempts recorded further down
      // this file are all the same mistake — a multiplier of a throttled
      // earnings rate. Measured, band settled at 1.68 while the shortfall was
      // also 1.68, which is textbook proportional steady-state error: closing
      // it with an exponent needs off^4.7 and is violently sensitive to how
      // rich the world is.
      //
      // I RAISED THIS TO 0.88 AND BROKE EATING RIVALS ENTIRELY. Caught in a
      // real playtest — "you can't seem to eat other smaller voids until you
      // hit a certain size" — and the arithmetic is not close.
      //
      // The swallow test is `pr > rv.r * 1.2` (the hole-vs-hole branch below),
      // NOT EAT_RATIO. The comment above used to claim 0.78 sat "just under the
      // 1/1.11 swallow threshold", and I repeated it: the real line is
      // 1/1.2 = 0.8333.
      //
      //   0.78 < 0.8333   a rival at its ceiling is catchable, just
      //   0.88 > 0.8333   a rival at its ceiling can NEVER be eaten
      //
      // So the whole family became uneatable the moment each one reached its
      // cap, which also quietly sabotaged the feast mechanic that VOID TITAN
      // depends on. 0.80 restores catchability with a little more margin than
      // 0.78 had, and the crumb floor below — not this number — was always the
      // real lever on whether the family can score.
      const softCap = Math.max(Math.min(START_R + 0.02 * _t, 1.6), pr * 0.80);
      // ── THE SURGE: the family finally gets to be LARGER ──────────────────
      // Owner decision 2, verbatim: "yes, however there needs to be a way
      // where if they're larger you go and consume and come back right. It
      // should be back and forth." softCap above pins every non-hunter at
      // 0.80x the player — measured, 94% of family samples at 0.75-0.85x and
      // 0% above 0.85x, bite gate open 0% of two worlds (see the 0.75x note at
      // the look gate below). This is the bounded escape: ONE sibling at a
      // time, in the middle half of the match, is grown to 1.26x the player's
      // size AT THAT MOMENT — an absolute pin, fixed at surge start, NOT a
      // tracking multiplier. The pin is the counterplay: go and consume, grow
      // past a rival that cannot follow, come back and eat it. After a 12-18s
      // hold it sags 3.5%/s back under softCap, so the surge always ends
      // EATABLE even for a player who ate nothing. 1.26 clears the bite gate's
      // 1.2 with margin (a sibling's red ring finally tells the truth) and
      // stays under the hunter's 1.5x hunt loom — she remains the apex.
      //
      // Size is AUTHORED by easing, exactly like the hunter's `want` below —
      // a surge that waits for organic eating is a gate that never opens,
      // which is the failure the look gate shipped twice.
      //
      // ONE THING THE PROPOSAL CLAIMED AND THE SKEPTIC KILLED, recorded here
      // so nobody re-derives it from the comment: eating PROPS cannot close
      // the gap. The player's radius is pinned at lawCap by the score floor,
      // and props move lawCap only through `pace` (<=+8% above par). The one
      // term that lifts the law is `feastR` — 0.69 units per sibling swallowed,
      // released at 0.11 units/s — so the counterplay inside a hold is "eat two
      // of your other siblings", and outside it the sag is what returns the
      // lead. The last surge clears by ~72-79% of the clock either way.
      //
      // Kid-mercy, explicit (owner: "no shit show of every void attacking"):
      //   · one surge at a time; never started while the hunter is HUNTING
      //   · BULLY excluded (she has her own act); COPYCAT excluded — the one
      //     archetype whose errand FOLLOWS the player, and a bigger-than-you
      //     void on your footprints is a pursuit
      //   · a surged rival never pursues: visits are off (see `sociable`), it
      //     forages where it stands, bigger
      //   · starts 40-200 units out — never inside biting range, never off
      //     the far coast where the growth plays to nobody
      //   · not in the finale: VOID TITAN's feast needs the family eatable
      //     (qa/titan.mjs measured that dependency)
      //   · ONE connecting bite ends the hold (see the bite block), so a
      //     surge can never take two forms
      // …AND NOT WHILE THE HUNT IS RUNNING. The `cst >= 1` guard below blocks
      // only the 5.15s of a 26-39s charge cycle in which she is already
      // committed — about 15% of frames — so under the first draft the FIRST
      // surge of every match (47-55s, against a hunt that ends at 55% of the
      // clock) ran straight through her charges. biteMercy is a SINGLE GLOBAL
      // 4.0s window (prototype3d.ts:2460), so two voids that can both take a
      // form means a child can lose two forms four seconds apart. The owner
      // ruled that out in the same breath as he asked for the tension: "I
      // don't want to create this shit show of every void attacking you."
      // She owns the first half; the surge owns the stretch after she is
      // stuffed, which is also the stretch where the finale law is opening and
      // "come back and eat it" is a thing a player can actually do.
      // CORRECTED after the landing was measured: this sentence was false as
      // first written. Ending the hunt stops her CHARGING, not her being big —
      // she stayed over the form-bite gate for ~21s of this very stretch, 10.4
      // of them overlapping a live surge. The bite dispatch below now denies
      // her a form once the hunt is over, which is what makes "one form-taker
      // at a time" true rather than merely promised.
      const surgeOpen = _t > matchLen * 0.55 && _t < matchLen * 0.72 && !hunting;
      const anySurge = rivals.some((r) => r.surgeR > 0);
      if (surgeOpen && !anySurge
        && !rivals.some((r) => r.arch === 'BULLY' && r.hunting && r.cst >= 1)) {
        surgeCd -= dt;
        if (surgeCd <= 0) {
          let sPick: R | null = null, sD = Infinity;
          for (const c of rivals) {
            if (!c.joined || c.dyingT > 0 || c.respawnT > 0) continue;
            if (c.arch === 'BULLY' || c.arch === 'COPYCAT') continue;
            const d = Math.hypot(c.x - px, c.z - pz);
            if (d < 40 || d > 200) continue;
            if (d < sD) { sD = d; sPick = c; }
          }
          if (sPick) {
            sPick.surgeR = Math.min(R_CAP, Math.max(sPick.r, pr * 1.26));
            sPick.surgeT = rand(12, 18);
            sPick.visiting = false; sPick.visitT = Math.max(sPick.visitT, 25); sPick.tgt = null;
            api.onSurge?.(sPick.name, sPick.x, sPick.z, sPick.color);
            // the nearBig pool was written for exactly this moment and has
            // been waiting for a trigger that can reach it
            api.onSpeak?.(sPick.x, sPick.z, pickLine(RIVAL_VOICE[sPick.name].nearBig), sPick.name);
            sPick.speakCd = rand(8, 12);
            surgeCd = rand(26, 40);   // gap to the NEXT surge, counted after this one clears
          } else surgeCd = 4;   // nobody in the 40-200 band right now — ask again
          // shortly. This retry costs one Math.random per 4s of an open window
          // and nothing else; it can never fire a surge it did not pick.
        }
      }
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
              // 1.5x THE PLAYER, ON ARRIVAL, was too much. She only has to be
              // over the swallow line (1.11) to be a threat you must respect;
              // half again your size reads as the game dropping a boss on you
              // rather than a family member turning up, and it is what makes
              // the family "feel like it starts bigger". 1.18 keeps her
              // genuinely dangerous — she can still eat you and you cannot eat
              // her — while leaving the gap small enough that a good run closes
              // it. She grows into the marquee meal later regardless.
              const a0 = rand(0, Math.PI * 2), d0 = rand(46, 74);
              rv.r = Math.max(START_R * 1.2, pr * 1.18);
              [rv.x, rv.z] = placeOnLand(px + Math.cos(a0) * d0, pz + Math.sin(a0) * d0, rv.r);
            } else {
              // …and nobody else ever walks in BIGGER than the player. The
              // softCap floor is 0.80x the player, so a late arrival could
              // land above them; the extra clamp makes "a snack joined" true.
              rv.r = Math.max(START_R, Math.min(softCap, pr * 0.62, pr * 0.92));
              [rv.x, rv.z] = placeOnLand(rv.hx, rv.hz, rv.r);
            }
            rv.campX = rv.x; rv.campZ = rv.z; rv.campT = 0;
            rv.group.visible = rv.halo.visible = true;
            api.onJoin?.(rv.name, rv.color, rv.x, rv.z, rv.arch);
            api.onSpeak?.(rv.x, rv.z, pickLine(RIVAL_VOICE[rv.name].arch), rv.name);
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
              api.onSpeak?.(rv.x, rv.z, pickLine(RIVAL_VOICE[rv.name].stuffed ?? RIVAL_VOICE[rv.name].taunt), rv.name);
              rv.speakCd = rand(8, 12);
            }
          }
        } else if (rv.surgeR > 0) {
          // THE SURGE (scheduler above). Two acts, the same shape as the
          // hunter's: ease up to the pinned target, hold, then sag back under
          // the cap. This is the third hardCap escape and the first one
          // outside `if (isHunter)` — the exact line the round-2 brief names.
          if (rv.surgeT > 0) {
            rv.surgeT -= dt;
            rv.r += (rv.surgeR - rv.r) * Math.min(1, dt * 0.55);   // grow, don't pop
            hardCap = rv.surgeR * 1.02;
          } else {
            // 3.5%/s: from 1.26x down through the swallow line (1/1.2 =
            // 0.8333) to the 0.80x floor in about 13 seconds. A player who
            // went and consumed crosses it sooner; a player who ate nothing
            // still gets the lead handed back. Either way it ends EATABLE.
            rv.surgeR *= 1 - dt * 0.035;
            if (rv.surgeR <= softCap) rv.surgeR = 0;
            else hardCap = rv.surgeR;
          }
        }
        rv.surge = rv.surgeR > 0;   // QA: __matchState reads this per frame
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
            api.onSpeak?.(rv.x, rv.z, pickLine(RIVAL_VOICE[rv.name].respawn), rv.name);
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
            api.onSpeak?.(rv.x, rv.z, pickLine(RIVAL_VOICE[rv.name].steal), rv.name);
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
          api.onSpeak?.(rv.x, rv.z, pickLine(RIVAL_VOICE[rv.name].arch), rv.name);
        }
        if (fleeing && dp < pr * 1.05) rv.closeCall = true;   // almost swallowed…
        if (rv.closeCall && dp > pr * 1.8) {                   // …and wriggled free
          rv.closeCall = false;
          if (rv.speakCd <= 0) { rv.speakCd = 8; api.onSpeak?.(rv.x, rv.z, pickLine(RIVAL_VOICE[rv.name].escape), rv.name); }
        }
        // drive-by size chirps — every close pass becomes a beat
        if (rv.speakCd <= 0 && dp < pr + rv.r + 6) {
          if (rv.r > pr * 1.15) { rv.speakCd = rand(12, 16); api.onSpeak?.(rv.x, rv.z, pickLine(RIVAL_VOICE[rv.name].nearBig), rv.name); }
          else if (rv.r < pr * 0.85) { rv.speakCd = rand(12, 16); api.onSpeak?.(rv.x, rv.z, pickLine(RIVAL_VOICE[rv.name].nearSmall), rv.name); }
        }
        // ── SWING-BY VISITS: occasionally a family member breaks off, rolls
        // over to say hi, then goes back to its own business. Rarer now
        // (every ~30-70s, and only one visitor at a time) — a visit should be
        // a moment, not the default state of the family.
        rv.visitT -= dt;
        if (rv.visiting && fleeing) rv.visiting = false;   // visit's off — you got scary
        // the HOARDER does not travel, the BULLY is not paying a social call —
        // and a SURGED rival must never beeline to the player: while it is the
        // one thing on the island that can take a form off them, an approach
        // is a pursuit, and pursuit belongs to the hunter alone (kid-mercy).
        const sociable = rv.arch !== 'HOARDER' && !(rv.arch === 'BULLY' && hunting) && !(rv.surgeR > 0);
        if (sociable && !rv.visiting && !fleeing && rv.visitT <= 0 && dp > 60 && !anyVisiting()) {
          rv.visiting = true; rv.tgt = null;
        }
        if (rv.visiting) {
          rv.tx = px; rv.tz = pz;   // chase the moving player, not a stale spot
          if (dp < pr + rv.r + 9) {   // arrived: deliver the line, hang out beat
            rv.visiting = false; rv.visitT = rand(45, 90);
            rv.speakCd = rand(10, 14);
            api.onSpeak?.(rv.x, rv.z, pickLine(RIVAL_VOICE[rv.name].visit), rv.name);
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
          // A rival past its lane picks no target at all — it wanders, chats and
          // waits for the ladder to rise past it.
          const minBite = rv.full ? Infinity : rv.r * 0.45;
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
            // …and if the footprints stop paying she forages for herself.
            // Measured: against a player who parked, ECHO went 79.9 seconds
            // without swallowing anything, because the patch four seconds
            // behind a stationary void is a patch she already stripped.
            const back = Math.max(0, trail.length - 1 - 12);
            const spot = rv.dry > 12 ? null : trail[back];
            if (spot) { ax = spot.x; az = spot.z; reach = 78; }
            else if (rv.dry > 12) { /* forage anywhere, like everyone else */ }
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
              api.onSpeak?.(rv.x, rv.z, pickLine(RIVAL_VOICE[rv.name].arch), rv.name);
            }
          } else if (rv.arch === 'COPYCAT') {
            rv.tx = ax + rand(-18, 18); rv.tz = az + rand(-18, 18); rv.tgt = null;
            if (rv.speakCd <= 0 && dp < 90) {
              rv.speakCd = rand(12, 18);
              api.onSpeak?.(rv.x, rv.z, pickLine(RIVAL_VOICE[rv.name].arch), rv.name);
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
        // ── THE LOOK, for everyone who is NOT the threat ────────────────────
        // Bigger than you, close enough to matter, and off cooldown: stop, turn
        // to face you, hold it for a beat. Deliberately narrow so the island
        // never turns into five voids staring at you at once:
        //   · it needs a size the family can actually REACH — see below
        //   · it needs you INSIDE 62 units, which is about two of your own
        //     diameters at match start — close enough that you chose to be there
        //   · one look per rival every 9-16 seconds, and never two at once
        // No pursuit. No charge. And walking into one usually costs NOTHING:
        // this gate opens at 0.75x, the bite gate at 1.2x, and 94% of the
        // family lives at 0.75-0.85x (the distribution below). The exception
        // is THE SURGE — a sibling held above 1.2x can bite, and since owner
        // decision 2 that bite costs a form. So the look is a peer sizing you
        // up, except during a surge, when it is the real warning. The whole
        // job is to make a child steer around a big void instead of through it.
        // ── AND THE FIRST VERSION OF THIS GATE COULD NEVER OPEN ─────────────
        // It read `rv.r > pr * 1.2`, copied from the BITE threshold on the
        // reasoning that a look should come from something that could eat you.
        // Measured across two worlds: zero looks, gate open 0% of the time.
        //
        // Not tight. Unreachable — and the source proves it. softCap above is
        // `max(min(START_R + 0.02t, 1.6), pr * 0.80)`, hardCap is softCap for
        // every non-hunter (the `want * 1.04` and `stuffCap` escapes are both
        // inside `if (isHunter)`), and it is clamped every frame. For a family
        // member to clear 1.2x the player you need 1.6 > 1.2 * pr, i.e. a
        // player still under radius 1.333 — and they join at 0.62x and grow
        // slowly, while the player passes 1.333 inside the first ten seconds.
        // It cannot happen.
        //
        // WHICH ALSO ANSWERS THE OWNER'S OTHER QUESTION, and corrects the
        // answer I gave him. He asked "can other voids eat him or just that
        // one?" and I wrote up the bite gate — the same 1.2x — as "anyone more
        // than 1.2x your radius, not one specific void". True of the gate,
        // false of the game: the cap makes it unreachable, so in practice it IS
        // just that one.
        //
        // 0.85, then, which the cap CAN deliver: a family member at its ceiling
        // sits at 0.80x you, and one still riding the 1.6 clock term is larger
        // than you while you are small. At that size it reads as a peer on
        // screen, and the beat it takes is "sizing you up" rather than "about
        // to eat you" — which is the honest version, because it cannot eat you.
        // Making one that genuinely CAN is a balance change to a measured
        // number and belongs with the owner, not with me.
        // ── 0.75x, AND THE NUMBER IS MEASURED, NOT CHOSEN ──────────────────
        // This gate has been wrong twice, both times because I picked the
        // threshold by reasoning about what SHOULD be true instead of asking
        // what is.
        //
        // First it was `pr * 1.2`, copied from the bite gate on the logic that
        // a void which can eat you is the one worth fearing. Measured: the gate
        // was open 0% of a match in two worlds, and the look never fired once.
        // The cap above makes 1.2x arithmetically impossible for a non-hunter —
        // hardCap IS softCap for them, and the two escapes that lift it are
        // both inside `if (isHunter)`.
        //
        // Then 0.85x, which was closer and still a guess. Also 0%.
        //
        // So qa/rivalnotice.mjs was made to report the size DISTRIBUTION of
        // every joined family member at every sample, rather than one extremum.
        // Maple, 45 match-seconds:
        //
        //     <0.5x  0%   0.5-0.65  0%   0.65-0.75  6%   0.75-0.85  94%   0.85x+  0%
        //
        // The family lives at 0.75-0.85 of the player, which is the softCap's
        // 0.80x floor with the easing either side of it. That is not a bug —
        // it is the number that keeps them catchable and makes VOID TITAN's
        // feast work. 0.75x is where they are, so 0.75x is where the gate goes.
        //
        // ONE THING TO BE STRAIGHT ABOUT: the owner asked for "any void that's
        // larger". A void at 0.78x is not larger, it is a peer — and at play
        // size a child cannot tell 0.78 from 1.1 at a glance, so it reads as
        // one. Making it literally true means raising the family's cap, which
        // is a measured balance number, and that is his call and not mine.
        if (!isHunter && rv.joined && rv.eye <= 0) {
          rv.eyeCd -= dt;
          const others = rivals.some((o) => o !== rv && o.eye > 0);
          if (rv.eyeCd <= 0 && !others && rv.r > pr * 0.75 && dp < 62 && dp > rv.r * 0.9) {
            rv.eye = 1.25; rv.eyeCd = rand(9, 16);
            api.onNotice?.(rv.name, rv.x, rv.z, rv.color);
            // …and they say something. The taunt pool is already written in
            // their own voice, which is what stops this reading as a system
            // event rather than a character noticing you.
            if (rv.speakCd <= 0) {
              api.onSpeak?.(rv.x, rv.z, pickLine(RIVAL_VOICE[rv.name].taunt), rv.name);
              rv.speakCd = rand(7, 11);
            }
          }
        }
        if (rv.eye > 0) {
          // A LOOK IS A PAUSE. Dropping the target is the whole behaviour: a
          // rival that keeps grazing while "noticing" you reads as a bug rather
          // than a beat, and stopping is legible from across the island at the
          // size these are drawn. It deliberately does NOT turn to face you —
          // that would need rival orientation, which nothing else here touches,
          // and a stop plus a ring already says it.
          rv.eye -= dt;
          rv.tgt = null;
        }
        if (isHunter && hunting) {
          rv.ctim -= dt; rv.missCd = Math.max(0, rv.missCd - dt);
          if (rv.cst === 0) {
            if (rv.ctim <= 0 && dp < 95 && dp > rv.r * 0.9) {
              rv.cst = 1; rv.ctim = 0.85; rv.missPend = false;
              api.onCharge?.(rv.name, rv.x, rv.z);
              api.onSpeak?.(rv.x, rv.z, pickLine(RIVAL_VOICE[rv.name].charge ?? RIVAL_VOICE[rv.name].taunt), rv.name);
              rv.speakCd = rand(6, 9);
            }
          } else if (rv.cst === 1 && rv.ctim <= 0) { rv.cst = 2; rv.ctim = 2.6; }
          else if (rv.cst === 2) {
            // a whisker away and still empty-jawed: bank the near miss
            // THE WHIFF IS THE POINT, AND IT ALMOST NEVER FIRED. Measured
            // once in eleven matches. The band was 0.85r-1.5r, which is barely
            // wider than the bite itself, so a lunge that missed by a body
            // length registered as nothing at all. Widened: a charge that ends
            // anywhere near the player now banks the beat the whole arc is
            // built around — and unlike a bite it costs the child nothing, so
            // it can afford to be generous.
            if (dp < rv.r * 2.4 && dp > rv.r * 0.9) rv.missPend = true;
            if (rv.ctim <= 0) {
              rv.cst = 3; rv.ctim = 1.7;
              if (rv.missPend && rv.missCd <= 0) {
                rv.missCd = 7; api.onNearMiss?.(rv.name, rv.x, rv.z);   // was 12: at most one whiff a match
              }
              rv.missPend = false;
            }
          } else if (rv.cst === 3 && rv.ctim <= 0) {
            // …and then she LEAVES YOU ALONE for a while. A 5.5-9 second gap
            // produced seven charges a match, which from the player's seat is
            // one rival attacking them more or less continuously. A threat that
            // never stops is not a threat, it is weather. Long gaps make each
            // charge an event again.
            rv.cst = 0; rv.ctim = rand(21, 34);
          }
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
        const fits = (x: number, z: number) => !!biomeAt(x, z) && !inDeepWater3(x, z, bm)
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
          // still pinned, stall. Traced on GRUMPS, who is slowest and therefore
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
          // THE COMEBACK EDGE (owner decision 2: "give them an edge to win").
          // A sibling that surged and bit pays its banked steal BACK when
          // eaten, plus a flat revenge bounty — the same contract the hunter
          // has always had, at sibling scale. The marquee arithmetic is
          // untouched: it was measured and it already includes rv.stolen.
          // The bounty rides `rv.stolen > 0` and NOT a "this one bit you" flag,
          // because rivals.ts fires onPlayerBitten unconditionally and the
          // handler's first line is `if (tClock < biteMercy) return` — a flag
          // set here would be true for bites the player never took, and a
          // bounty payable for nothing. rv.stolen > 0 is true of exactly the
          // rivals a revenge bounty is for and adds no new state.
          const pts = marquee
            ? Math.round(400 + rv.r * 180 + looted + rv.stolen)
            : Math.round(100 + rv.r * 40 + rv.stolen + (rv.stolen > 0 ? 150 : 0));
          if (marquee) { rv.score -= looted; rv.stolen = 0; }
          else if (rv.stolen > 0) { rv.score = Math.max(0, rv.score - rv.stolen); rv.stolen = 0; }
          rv.surgeR = 0; rv.surgeT = 0;   // a devoured rival respawns small, never mid-surge
          api.onSpeak?.(rv.x, rv.z, pickLine(RIVAL_VOICE[rv.name].eaten), rv.name);
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
        // …and 0.85r asked the player's CENTRE to be inside 0.85 of the
        // hunter's radius while she is only 1.5x their size — a near-total
        // overlap, during a 2.6s lunge, against a moving target. Two bites in
        // eleven matches, on the one character the banner promises "CHASES
        // you". At 1.05r she connects when she actually reaches you, which is
        // still only ever out of a telegraphed charge you were warned about.
        if (rv.r > pr * 1.2 && dp < rv.r * 1.05 && rv.biteCd <= 0 && canBite) {
          // ── WHAT A BITE COSTS ───────────────────────────────────────────────
          // -12% radius was undone by the score floor within a frame or two, so
          // being caught was free and the family had no teeth at all. A bite now
          // takes SCORE as well as size — and the threat's bite is the one that
          // hurts, because she banks what she takes and you can win it all back
          // by eating her later. Shrink alone can be refunded by the growth law;
          // points cannot, so this is a cost the leaderboard actually shows.
          //
          // …and it costs A FORM. Every bite this gate can fire is from a void
          // strictly larger than the player (the gate itself is rv.r > pr*1.2)
          // and the owner priced that bite: "more punishing then 10 percent
          // loss. Like a level loss" (decision 2). form:true sends the handler
          // in prototype3d.ts down the demotion path for every biter — the
          // hunter keeps her heavier steal, a surged sibling banks a smaller
          // one, and both are paid back through the eaten branch above. The
          // demotion only outlives the frame because of the demote hold beside
          // biteMercy; without it the score floor refunds the radius, and with
          // it the form, on the very next frame.
          const heavyBite = isHunter && hunting;
          const steal = heavyBite ? Math.min(1200, Math.round(pScore * 0.08))
            : rv.surgeR > 0 ? Math.min(600, Math.round(pScore * 0.05)) : 0;
          // every form bite carries the hunter's long cooldown (kid-mercy:
          // the same void cannot take two forms inside twelve seconds)
          rv.biteCd = 12; rv.pulse = 1;
          // KID-MERCY: one bite ends a surge's hold on the spot — it starts
          // sagging toward the comeback meal, so a surge never costs two forms
          if (rv.surgeT > 0) rv.surgeT = 0;
          rv.missPend = false;   // she connected: this was no near miss
          if (heavyBite) {
            // she got what she came for: break off, wallow, and leave a long
            // gap before the next attempt
            rv.cst = 3; rv.ctim = 2.2;
          }
          if (steal > 0) { rv.score += steal; rv.stolen += steal; }
          api.onSpeak?.(rv.x, rv.z, pickLine(RIVAL_VOICE[rv.name].bite), rv.name);
          // form: NOT for the stuffed hunter's contact bite. After huntEnd she stops
          // CHARGING, not being big: her ceiling decays 0.3%/s from pr*1.5 while the
          // player's law grows 0.025/s, so she sits over the bite gate for ~21s of the
          // surge stretch — measured 10.4 match seconds OVERLAPPING a live surge, two
          // form-takers with one global 4s mercy between them. That is the shape the
          // owner ruled out, and the surge window's own comment promised it could not
          // happen. Her contact bite goes back to the percentage nibble it always was
          // (steal is already 0 for her — heavyBite requires hunting).
          api.onPlayerBitten?.(rv.name, { shrink: 0.85, steal, hunter: heavyBite, form: !(isHunter && !hunting) });
        }

        // ── eat nearby food -> grow by area + score ON THE PLAYER'S TERMS ─────
        // The family used to score a flat radius·12 with no combo, no prey
        // bonus and no rush multiplier, against a player who had all three.
        // They ate 2.2-3.4x more of the island than the player and still lost
        // 15:1, which meant the HUD and the leaderboard told a child two
        // opposite stories about the same match.
        rv.comboT -= dt; if (rv.comboT <= 0) rv.combo = 0;
        rv.dry += dt;
        // LANE CONTROL — see LANE_FINAL. Where this rival's score OUGHT to be
        // by now, and a bounded correction toward it. The old rubber band read
        // the gap to the PLAYER, which kept the race close on average and did
        // nothing at all about the field's own wild internal spread.
        const want = laneWant(rv.lane, _t, matchLen, pScore, par);
        // >1 means behind the lane. The square root makes the correction firm
        // without being a teleport: a quarter of the way to target eats at 2x,
        // four times past it eats at half.
        // ── WHY THIS IS NO LONGER want/score ──────────────────────────────
        // Ten attempts are recorded above and in docs/OVERNIGHT.md. Nine of
        // them changed an INPUT to this controller — the target, the food, the
        // field size, the player's own multipliers — and every one was absorbed,
        // because `band = want/score` is proportional control and proportional
        // control has a fixed point it returns to no matter what you feed it.
        // Measured: the leader sat at 47% of its lane while the band read 1.68,
        // i.e. the shortfall and the correction were the SAME number. That is
        // the textbook signature of steady-state error, and you cannot tune it
        // away — a P controller with a throttled plant converges BELOW setpoint
        // by exactly the amount the throttle costs. Squaring past the setpoint
        // (the previous line here) only changed the exponent of the fixed
        // point: score settles at want^(2/3) instead of want^(1/2). Still short,
        // just short differently.
        //
        // So this is a different controller, not a better-tuned one. Instead of
        // asking "how far below the lane am I?" it asks "at the rate I am
        // actually earning, what multiplier puts me on the lane H seconds from
        // now?" — feedforward against a measured plant gain. It has no
        // steady-state error by construction: if the rival is on pace the
        // answer is 1.0, and if it is behind, the answer is exactly the number
        // that closes the gap rather than a number proportional to it.
        //
        // rv.raw is the plant gain, measured rather than assumed: the points
        // this rival earned BEFORE any multiplier. That is what makes it work
        // on both MAPLE FALLS and GAME DAY, whose prop densities differ by
        // roughly a factor of nine — the controller reads the world it is in.
        const LOOK = 12;                                   // seconds of look-ahead
        const tA = Math.min(matchLen, _t + LOOK);
        const dtA = Math.max(1, tA - _t);
        const wantA = laneWant(rv.lane, tA, matchLen, pScore, par);
        // observed raw earning rate. The 6s floor on elapsed stops the opening
        // seconds — when a rival has eaten one prop and `elapsed` is 0.4 — from
        // reading as an enormous rate and pinning the band at its floor.
        const rawRate = rv.raw / Math.max(6, _t);
        const need = Math.max(0, wantA - rv.score) / dtA;
        const off = need / Math.max(1, rawRate);
        // …and raising the target alone would have changed nothing, because
        // this is what actually gets them there. A rival's score is EARNED, one
        // prop at a time, multiplied by this band — and at a ceiling of 2.4 they
        // were already saturated and falling short of even the old 21,600. The
        // headroom has to match the target or the ladder is decoration with
        // extra steps. Radius is unaffected (it comes from growR and is held at
        // 0.80x the player by softCap), so they stay believable competitors
        // rather than tiny voids with enormous numbers.
        // 8 was not enough with a FULL cast. Measured you/top across three
        // matches: 1.95x with three rivals, 2.29x with four, 3.45x with five —
        // because five siblings compete for the same props, so each one eats
        // less and falls further behind a target it can only reach by eating.
        // The ceiling has to cover the worst case, not the average. It only
        // engages when a rival is far behind its lane, which is exactly when it
        // should; a rival at target sits near 1.0 and one ahead is throttled to
        // 0.5, both unchanged.
        // …AND THE SQUARE ROOT IS TOO SOFT ON A DENSE WORLD. sqrt(off) is
        // strongly self-limiting: a rival earning E raw points a match settles
        // at (E^2 * want)^(1/3), so closing a gap needs the gap to be enormous.
        // On MAPLE FALLS that never mattered — an optimal run scores 47,000
        // and the family's raw earnings are within about 2x of it. GAME DAY is
        // dense enough that the player's combo multiplier never lapses, so an
        // optimal run earns nine times what a rival does, and measured, the
        // band sat at 1.72 against a 16 ceiling it never came near. The field
        // froze at 66,000 against 357,000.
        //
        // Linear settles at sqrt(E * want) instead, which is the same answer
        // when a rival is near its lane (off ~ 1, and sqrt(1) = 1 either way,
        // so Maple is untouched) and a much firmer pull when it is far below.
        // The 0.50 floor is unchanged: a rival AHEAD of its lane is still
        // throttled to half, and satiety above still stops it outright.
        // ── PROPORTIONAL CONTROL ALWAYS SETTLES SHORT ─────────────────────
        // band = off = want/score is a P controller, and a P controller with a
        // throttled plant converges BELOW its setpoint — always, by the amount
        // the throttle costs. Measured across 5 matches: the leader sits at
        // 47.4% +/- 6.2 of the lane while the band reads ~1.68, i.e. the band
        // and the shortfall are the SAME number. That is the signature, and it
        // is why the three ceiling-raises recorded above all failed: they moved
        // the clamp, which was never binding, instead of the authority.
        //
        // Squaring past the setpoint is the smallest change that closes it. At
        // off 2.1 the multiplier goes 2.1 -> 4.4 rather than a 4.7th power that
        // is violently sensitive to how rich a world is. Below the lane nothing
        // changes (off <= 1 stays linear, and 1^n == 1, so a rival AT target is
        // untouched and one AHEAD is still throttled to 0.5).
        //
        // It cannot rout the player, and that is structural rather than tuned:
        // satiety stops a rival dead at FULL_AT 1.2x its lane no matter what
        // the multiplier says, and lane 0's want is 0.94x the player's score.
        // 0.94 x 1.2 = 1.128, so the best possible rival finishes at 113% of a
        // player who is playing — beatable by anyone paying attention, and
        // genuinely lost by anyone who is not. Which is the whole point.
        // `off` is now already the multiplier the plan calls for, so it is used
        // straight. No exponent: shaping it was the old controller's way of
        // buying authority it structurally could not have, and this one does
        // not need to. The clamp stays as a sanity rail in both directions —
        // 0.5 so a rival ahead of its lane is still throttled rather than
        // frozen, 24 so a rival that has eaten nothing for a long stretch does
        // not cash a single hedge for a five-figure number.
        const band = THREE.MathUtils.clamp(off, 0.50, 24);
        // QA only: is this controller ASKING for more than the clamp allows?
        if (rv.joined && !rv.full) {
          bandSum += band; bandN++;
          if (band > bandMax) bandMax = band;
          if (off >= 23.5) bandPinned++;
        }
        // SATIETY. The half of lane control the multiplier cannot do.
        if (rv.score > want * FULL_AT) rv.full = true;
        else if (rv.score < want * HUNGRY_AT) rv.full = false;
        // ── THE CRUMB FLOOR IS WHY THE FAMILY STARVES ─────────────────────
        // Counted on Maple at match start (5,790 props on the island):
        //
        //   the PLAYER at r=12.44          5,790 props    100.0%   no floor
        //   a rival at 9.70, floor 0.45r     194 props      3.4%
        //   a rival at 10.75, floor 0.45r     88 props      1.5%
        //   a rival at 9.70, floor 0.18r   2,255 props     38.9%
        //
        // The player may eat EVERYTHING and the family is locked out of 96.6%
        // of the island. Worse, the floor scales with r, so a rival that eats
        // well starves itself: growing from 9.70 to 10.75 more than HALVES the
        // food it is allowed. That is why raising the size cap to 0.88 in the
        // previous commit moved the leader the wrong way, 59% of its lane to
        // 44% — I fed them by making them pickier.
        //
        // The floor's stated reason is "they would strip the beginner layer
        // just by driving over it". That reason is real, and it is about props
        // vanishing where a child can see it — so it belongs on the drive-over
        // path (minBite, above), which is exactly where it stays. The LARDER
        // cannot commit that offence: it only runs when the rival is more than
        // 95 units from the player, which is the gate written for this very
        // concern. Off-screen, a rival eating small things is not stealing a
        // beginner's layer; it is the island being eaten by somebody else,
        // which is the whole point of the mechanism.
        const minSwallow = rv.full ? Infinity : rv.r * 0.18;   // larder: off-screen
        // …and the drive-over sweep keeps the original floor, because THAT is
        // the one that happens where a child can watch it happen.
        const minPassing = rv.full ? Infinity : rv.r * 0.45;
        // ── THE LARDER: a rival eats its own patch even when nobody is watching.
        //
        // This is the fix for the single worst thing in the game. A rival only
        // ever scored from props it physically drove over, and five of them
        // compete for the same food as a player who is hoovering it optimally —
        // this file's own comment at the forage picker calls it "starved out by
        // the AI". Measured across the evidence pack: an optimal run finished
        // 2.8x clear on Maple, 4.1x on Game Day and 7.4x on Pirate Bay, and one
        // captured results screen shows the LEADER on zero. Not "the player
        // usually wins" — there was no opponent. A 180-second match whose
        // outcome is decided by the first evolution is not a match.
        //
        // Raising the ladder's ceiling was tried three times and could not work:
        // `band` multiplies points a rival EARNS, so if it earns nothing, any
        // multiplier of nothing is still nothing. The missing thing was never
        // the target, it was the food.
        //
        // So each rival works a patch. When the player is far enough away that
        // this is genuinely off-screen, it consumes what is in that patch on a
        // timer rather than by driving over it. The props really are removed —
        // this is not fake score, it is the same island getting eaten by
        // somebody else, which is exactly the loss a child can understand and
        // point at: NIBBLES cleared the fairground while you did Main Street.
        //
        // It only runs when: the rival is behind its lane (so it can never
        // overshoot into a rout), the player is more than 150 units away (so a
        // child never watches props vanish next to them), and the rival is not
        // hunting. The rate is tuned in the harness, not guessed.
        rv.graze -= dt;
        const away = Math.hypot(rv.x - px, rv.z - pz) > 95;
        if (!rv.full && !isHunter && away && rv.score < want * 0.98 && rv.graze <= 0) {
          // Tuned in the harness, not guessed. At 0.42s taking the NEAREST
          // prop the leader reached 31k against a lane that wanted 68k and the
          // optimal player still finished 2.56x clear — the larder worked and
          // was simply too slow. It takes the BIGGEST thing in its patch now,
          // which is both worth more and truer to a rival working through the
          // good stuff first, and it ticks fast enough to matter.
          // SELF-CORRECTING RATE. A flat interval is either too slow for a
          // rival that has fallen right off the pace or too fast for one that
          // is nearly there. Instrumented at a flat 0.25s the family took 203
          // props off-screen and the leader reached 36.8k against a lane that
          // wanted ~85k — working, and running at about half the rate it
          // needed. Scaling the interval by how far behind the lane it is
          // makes it hungry when it is losing and calm when it is not, and it
          // still cannot overshoot because the whole branch stops at 0.98 of
          // the lane.
          rv.graze = Math.max(0.09, Math.min(0.42, 0.42 * (rv.score / Math.max(1, want))));
          let pick2: RivalEdible | null = null, pw = -1;
          for (const e of edibles) {
            if (eaten(e.mesh) || e.radius > rv.r * EAT_RATIO || e.radius < minSwallow) continue;
            const ddx = e.mesh.position.x - rv.x, ddz = e.mesh.position.z - rv.z;
            const d2 = ddx * ddx + ddz * ddz;
            if (d2 > 170 * 170) continue;          // its own patch, not the whole map
            if (e.radius > pw) { pw = e.radius; pick2 = e; }
          }
          if (pick2) {
            grazeN++;
            pick2.mesh.userData.eaten = true;
            shrinking.push(pick2.mesh);
            rv.combo++; rv.comboT = RIVAL_COMBO_HOLD; rv.dry = 0;
            const cm = 1 + Math.min(rv.combo, 25) * 0.1;
            const pm = (pick2.mesh.userData.ptsMult as number | undefined) ?? 1;
            const raw2 = pick2.radius * 12 * cm * pm * fever;
            rv.raw += raw2;
            rv.score += Math.max(1, Math.round(raw2 * band));
            rv.r = growR(rv.r, pick2.radius);
          }
        }
        for (const e of edibles) {
          if (eaten(e.mesh) || e.radius > rv.r * EAT_RATIO || e.radius < minPassing) continue;
          const dx = e.mesh.position.x - rv.x, dz = e.mesh.position.z - rv.z;
          if (dx * dx + dz * dz < (rv.r + e.radius * 0.6) ** 2) {
            e.mesh.userData.eaten = true;
            shrinking.push(e.mesh);   // animate out — buildings must never BLINK away
            rv.combo++; rv.comboT = RIVAL_COMBO_HOLD; rv.dry = 0;
            const comboMult = 1 + Math.min(rv.combo, 25) * 0.1;
            const preyMult = (e.mesh.userData.ptsMult as number | undefined) ?? 1;
            const raw1 = e.radius * 12 * comboMult * preyMult * fever;
            rv.raw += raw1;
            rv.score += Math.max(1, Math.round(raw1 * band));
            rv.r = growR(rv.r, e.radius);
            rv.pulse = 1;   // visible gulp — the family EATS, not just exists
            const bm2 = rv.body.material as THREE.ShaderMaterial | undefined;
            if (bm2?.uniforms?.uWobble) bm2.uniforms.uWobble.value = Math.min(1, (bm2.uniforms.uWobble.value as number) + 0.6);
            if (e.radius > rv.r * 0.55 && rv.speakCd <= 0) {   // a BIG bite earns a taunt
              rv.speakCd = rand(9, 16);
              api.onSpeak?.(rv.x, rv.z, pickLine(RIVAL_VOICE[rv.name].taunt), rv.name);
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
