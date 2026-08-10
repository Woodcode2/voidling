// VOIDLING — 3D PROTOTYPE (Three.js / WebGL)
// The cute VOIDLING void, rebuilt as a faithful 3D port of the 2D star, rolling
// through MAPLE ISLE — the 2D island ported to 3D, floating in cosmic space.
// Void: ./proto3d/void3d · island: ./proto3d/island · palette: ./proto3d/palette
// Standalone page — the main game bundle is untouched.
declare const __BUILD__: string;   // injected by vite.config define (build stamp)
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
// brand type: the shipping page used system-ui while only the retired React
// entry bundled the brand font — single cheapest "top-10 app" lift
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import '@fontsource/fredoka/400.css';
import '@fontsource/fredoka/600.css';
import '@fontsource/fredoka/700.css';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createVoid, makeVoidBody, applySkinToBody, type Mood } from './proto3d/void3d';
import { createIsland, ROAD_CENTERS_3D, insideIsland3, inLagoon3, inDeepWater3, setWorld, setMeshFade, type WorldId } from './proto3d/island';
import { createLife, pickFresh, type Life } from './proto3d/life';
import { createBubbles } from './proto3d/bubbles';
import { HATS, HAT_BY_ID, hatLine, type Hat } from './proto3d/hats';
import { buildHat } from './proto3d/hatgeo';
import { createRivals, RIVAL_VOICE } from './proto3d/rivals';
import { createFx, reduceMotion, setReduceMotion } from './proto3d/fx';
import { createAudio } from './proto3d/audio3d';
import { SKINS, VOID, type Skin } from './proto3d/palette';
import { buildGallery, updateLodBias, requestedReady } from './proto3d/assets3d';
import { pickNews, resetNews, BRAND as PB_BRAND, type Dist as PBDist } from './proto3d/newsroom';
import { pickMapleNews, resetMapleNews, MAPLE_BRAND, type MapleDist } from './proto3d/newsroom_maple';
import { pickGamedayNews, resetGamedayNews, GAMEDAY_BRAND, type GdDist } from './proto3d/newsroom_gameday';
import { pickLanternNews, resetLanternNews, LANTERN_BRAND, type LnDist } from './proto3d/newsroom_lantern';
import { makeCurio, animateCurio, CURIO_R, type CurioTier } from './proto3d/curio';
import { STICKERS_BY_WORLD, STICKERS, collectInRun, hasSticker, TIER_POINTS,
  runFinds, clearRun, foundCount, totalCount, type Sticker } from './game/stickers';
// the district ids this world's newsroom knows, so a biome from another world
// can never be handed to it as a key
const LN_DISTS: string[] = ['torii', 'stalls', 'canal', 'teahouse', 'shrine',
  'moonbridge', 'nightgarden', 'bathhouse', 'onsen', 'bamboo'];
import {
  track, setCtx, countMatch, tickFrame, fpsSummary, resetFps,
  analyticsEnabled, setAnalyticsEnabled,
} from './proto3d/telemetry';
import { initIAP, iapPrice, iapAvailable, purchase as iapPurchase, restorePurchases } from './proto3d/store3d';

// ── STORAGE THAT CANNOT KILL THE GAME ───────────────────────────────────────
// A DEAD APP THAT LOOKS COMPLETELY ALIVE. There are 65 bare localStorage calls
// in this file and the first one runs before the renderer is even registered.
// With storage throwing — iOS Safari with "Block All Cookies", a managed school
// or kiosk profile, an iframe embed, or a full quota — the module threw on
// import, so NOTHING after that line ran: no input handlers, no PLAY listener,
// no beginMatch. Measured in that state: renderer absent, zero edibles, zero
// scene nodes. And the child sees a perfect main menu, because #menu is static
// HTML in index.html. They tap the real PLAY button and the game simply never
// starts, with no error and no clue.
//
// This shadows the global for the whole module, so all 65 call sites are fixed
// without touching one of them, and a call site added tomorrow is safe too. It
// falls back to an in-memory map: progress lasts the session instead of
// forever, which is an enormous improvement on a blank screen. Every operation
// is individually guarded as well, because a quota error can arrive at any
// setItem long after the constructor probed clean.
const localStorage: Storage = (() => {
  const mem = new Map<string, string>();
  let real: Storage | null = null;
  try {
    const probe = '__vd_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    real = window.localStorage;
  } catch { real = null; }
  return {
    getItem: (k: string) => {
      try { const v = real?.getItem(k); if (v !== null && v !== undefined) return v; } catch { /* fall through */ }
      return mem.has(k) ? mem.get(k)! : null;
    },
    setItem: (k: string, v: string) => {
      mem.set(k, String(v));                       // the mirror always succeeds
      try { real?.setItem(k, String(v)); } catch { /* session-only from here */ }
    },
    removeItem: (k: string) => {
      mem.delete(k);
      try { real?.removeItem(k); } catch { /* ignore */ }
    },
    clear: () => { mem.clear(); try { real?.clear(); } catch { /* ignore */ } },
    key: (i: number) => [...mem.keys()][i] ?? null,
    get length() { return mem.size; },
  } as Storage;
})();

// ── renderer / scene / camera ────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
// THE "NOT HD" BUG. This was hard-capped at 1.3 on every touch device — and
// the adaptive ladder below re-clamped to 1.3 as well, so even the TOP quality
// rung could not exceed it. Measured on a 390x844 iPhone viewport: a drawing
// buffer of 507x1097, which is 18.8% of the device's actual pixel count, then
// upscaled 2.31x by the compositor. Every edge in the game crossed four device
// pixels instead of one. It was not the models that looked soft first — it was
// all of them, in every frame, including the UI-adjacent 3D.
//
// The ladder is the right mechanism and it already steps down within four
// seconds below 46fps, so the ceiling can simply be raised: a device that
// cannot hold 2.0 lands back on 1.3 by itself, which is exactly where it is
// today. Nothing gets worse; most things get much sharper.
const IS_SMALL_SCREEN = matchMedia('(pointer: coarse)').matches || window.innerWidth < 900;
const PR_TOP = 2;
renderer.setPixelRatio(Math.min(window.devicePixelRatio, PR_TOP));
renderer.shadowMap.autoUpdate = false;   // half-rate shadow pass (updated in the frame loop)
// ── THE GLOW THE GAME NEVER HAD ───────────────────────────────────────────
// There was no post chain at all: no EffectComposer, no RenderPass, nothing
// after ACES tone mapping. Every emissive in the game — lantern light, the
// void's rim, neon, Game Day's floodlights, the legendary auras, 23 materials
// across island.ts and void3d.ts — rendered as flat bright pixels with no
// bleed, which is the difference between "lit" and "glowing".
//
// THRESHOLD 0.92 IS THE WHOLE DESIGN. Maple is a bright autumn palette under
// ACES at exposure 1.0, and a naive threshold hazes every white wall and lane
// line — that reads as fog, not glow, and it is how bloom gets a bad name. The
// cut sits above diffuse white so only genuine light sources bleed. Strength
// stays low for the same reason: felt, not seen.
let composer: EffectComposer | null = null;
let bloomPass: UnrealBloomPass | null = null;
function ensureComposer(): EffectComposer {
  if (composer) return composer;
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    // ── MEASURED AGAINST THE CHARACTER, NOT AGAINST THE SCENE ───────────
    // The owner, repeatedly: "Sometimes that light purple wash is still showing
    // rather than our crisp dark one." Bloom is the wash. Drawing the SAME
    // frozen frame twice — once straight to the canvas, once through this
    // composer — and measuring the void's own disc:
    //
    //   gameday   bloom off 0.702 sat / 0.526 val  ->  bloom on 0.503 / 0.660
    //   lantern   bloom off 0.689 / 0.550          ->  bloom on 0.528 / 0.662
    //
    // He loses 0.16-0.20 saturation and gains 0.11-0.13 value: several times
    // larger than every other colour effect measured on this character, and it
    // is the direction he was reported in — lighter and less purple. Because
    // bloomOn is set per QUALITY RUNG, the adapter walking the ladder also
    // flips him between washed and crisp mid-match, which is the "switching"
    // half of the report.
    //
    // THRESHOLD CANNOT FIX IT. His peak luminance is 1.000 — the white sclera
    // and the specular dots in his eyes blow out — and 0.5-0.6% of his pixels
    // clear 0.92, against a world peak of 0.984-1.000. There is no cut that
    // keeps the lanterns and drops him: he blooms HIMSELF, and the blur smears
    // that light straight back across his face.
    //
    // So strength comes down until he survives it. Lanterns and neon still
    // lift, because they are broad areas of near-white rather than a handful of
    // blown pixels — they just lift less. The proper fix is selective bloom on
    // a layer mask (second pass + composite shader); if the glow is ever worth
    // that cost, that is the direction, not a bigger number here.
    0.34,   // strength — a lift, not a bath
    0.42,   // radius — tighter, so what does bleed stays local to its source
    0.94,   // threshold: above diffuse white, so only real light sources bleed
  );
  composer.addPass(bloomPass);
  // ── THE MISSING PASS THAT WAS WASHING THE WHOLE FRAME ────────────────────
  // Without an OutputPass the composer's chain applies the sRGB transform a
  // second time on its way to the screen, which lifts midtones and drains
  // chroma. Measured on the void's own disc, the SAME frozen frame drawn both
  // ways, with bloom strength forced to ZERO so it could contribute nothing:
  //
  //   world     direct render        through the composer
  //   maple     0.589 sat / 0.539    0.392 / 0.662
  //   pirate    0.672 / 0.549        0.492 / 0.664
  //   gameday   0.686 / 0.544        0.475 / 0.667
  //   lantern   0.683 / 0.508        0.465 / 0.624
  //
  // A loss of about 0.20 saturation and a gain of 0.12 value on every world,
  // with the glow contributing nothing. So this was never "bloom is too
  // strong" — I lowered the strength from 0.42 to 0.16 first and the numbers
  // did not move at all, which is what sent me to test zero.
  //
  // Adding an OutputPass, the documented fix for exactly this, made it WORSE
  // (-0.232): the chain is already over-encoding and that adds another. The
  // right repair is to get the composer's render target and the output encode
  // agreeing exactly once, and that is a change worth making carefully with the
  // instrument above, not at the end of a long night.
  //
  // Until then this whole path is switched OFF at every quality rung, because
  // it explains the SWITCHING as well as the wash: bloomOn is set per rung, so
  // the adapter walking the ladder moved the entire frame between two different
  // colour pipelines mid-match. The owner saw both halves — "sometimes that
  // light purple wash is still showing rather than our crisp dark one".
  return composer;
}
let shadowFrame = 0;
// if the OS ever reclaims the GPU context, recover with a clean reload instead
// of a frozen black screen
renderer.domElement.addEventListener('webglcontextlost', (ev) => {
  ev.preventDefault();
  setTimeout(() => location.reload(), 400);
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
// PCFSoftShadowMap is DEPRECATED in three 0.185 — WebGLShadowMap substitutes
// PCFShadowMap and logs a warning on every launch (three.module.js:9148). So
// the lighting was authored against a soft filter and has been shipping a hard
// one for as long as the dependency has been current, silently. Ask for what
// we actually get, and buy the softness back with resolution instead: the
// shadow map now runs at the top of the quality ladder, and the frustum is
// already distance-capped by fitShadow(), so those texels land where the
// player is looking.
renderer.shadowMap.type = THREE.PCFShadowMap;
// ── THE COLOUR GRADE, AND IT COSTS NOTHING ────────────────────────────────
// A grade over the final frame — crushed blacks, a tint in the shadows,
// controlled highlights — is most of what reads as "fine-tuned" in a shipped
// game. The obvious way to get one is a LUT pass in a composer, and this
// project has already paid for that road: routing the frame through
// EffectComposer costs the hero 0.20 saturation, the fix for that made it
// worse, and post is switched off at every rung as a result.
//
// So the grade goes where the frame ALREADY passes through a curve. three
// supports CustomToneMapping precisely for this: define one function, and every
// material that includes <tonemapping_fragment> runs it — which, since the
// void's body shader was repaired to include the chunk, is now genuinely
// everything. No extra pass, no render target, no mip chain, and it works
// identically on the lowest quality rung as on the highest.
//
// The curve is ACES, unchanged, plus three deliberately small moves:
//   TOE      blacks pulled down a touch so shadows have somewhere to sit
//   SPLIT    shadows cooled and highlights warmed, the oldest grade there is
//   CHROMA   a little saturation back, because filmic curves always cost some
// Small on purpose. A grade a player NOTICES is a filter; this is meant to be
// felt and not seen, and it has to survive four worlds that already have very
// different palettes.
// three ships a STUB — vec3 CustomToneMapping( vec3 color ) { return color; } —
// inside this chunk, so appending a definition duplicates it and every shader in
// the game fails to compile. Replace the stub; do not append to the chunk.
THREE.ShaderChunk.tonemapping_pars_fragment = THREE.ShaderChunk.tonemapping_pars_fragment.replace(
  'vec3 CustomToneMapping( vec3 color ) { return color; }', `
vec3 CustomToneMapping( vec3 color ) {
  color *= toneMappingExposure;
  // ACES, exactly as three implements it, so the base look does not move
  const mat3 ACESInputMat = mat3(
    vec3( 0.59719, 0.07600, 0.02840 ), vec3( 0.35458, 0.90834, 0.13383 ), vec3( 0.04823, 0.01566, 0.83777 ) );
  const mat3 ACESOutputMat = mat3(
    vec3(  1.60475, -0.10208, -0.00327 ), vec3( -0.53108, 1.10813, -0.07276 ), vec3( -0.07367, -0.00605, 1.07602 ) );
  color = ACESInputMat * color;
  color = RRTAndODTFit( color );
  color = ACESOutputMat * color;
  color = clamp( color, 0.0, 1.0 );
  // ── the grade ──
  float l = dot( color, vec3( 0.2126, 0.7152, 0.0722 ) );
  color = max( vec3( 0.0 ), ( color - 0.014 ) / ( 1.0 - 0.014 ) );   // toe
  vec3 cool = vec3( 0.96, 0.99, 1.06 );
  vec3 warm = vec3( 1.05, 1.005, 0.95 );
  color *= mix( cool, warm, smoothstep( 0.18, 0.78, l ) );           // split tone
  color = mix( vec3( l ), color, 1.07 );                             // chroma back
  return clamp( color, 0.0, 1.0 );
}
`);
renderer.toneMapping = THREE.CustomToneMapping;
renderer.toneMappingExposure = 1.0;
// ── THE GAME CANVAS GOES FIRST, AND THAT IS NOT COSMETIC ──────────────────
// Eighty-five probes in qa/ find the play surface with
// document.querySelector('canvas') and dispatch input at it. That worked for
// as long as this was the only canvas in the document — and then the shop grew
// a mirror, thirteen void cards and thirteen hat cards, all of them canvases
// sitting EARLIER in the DOM than a node appended to the end of <body>. The
// renderer's canvas went to index 27, every probe started steering a shop
// thumbnail, and qa/_econ.mjs reported a void that travelled 0.0 units in
// twenty seconds while dispatching 1,190 pointermoves. It was still reporting
// a coins-per-match figure.
//
// Making it the FIRST child restores that selector for all of them at once.
// It costs nothing visually: every overlay in this app is position:fixed, so
// the canvas is the only element in normal flow either way.
renderer.domElement.id = 'gameCanvas';
document.body.insertBefore(renderer.domElement, document.body.firstChild);

// ── WHICH WORLD ───────────────────────────────────────────────────────────
// Resolved before anything else, because the light rig, the ground bake and
// the prop kit all branch on it.
const WORLD_NAMES: Record<string, string> = { maple: 'MAPLE FALLS', pirate: 'PIRATE BAY RESORT', gameday: 'GAME DAY', lantern: 'LANTERN NIGHT' };
// A ternary chain resolved exactly two worlds, so a third could never be
// picked however the picker was wired. Validate against the real list instead,
// which also means an unknown ?w= on a shared link lands on Maple rather than
// on a world that does not exist.
const WORLDS: WorldId[] = ['maple', 'pirate', 'gameday', 'lantern'];
const _wantWorld = new URLSearchParams(location.search).get('w')
  ?? localStorage.getItem('voidWorld') ?? 'maple';
const pickedWorld: WorldId = (WORLDS as string[]).includes(_wantWorld) ? _wantWorld as WorldId : 'maple';
setWorld(pickedWorld);

// ── WHAT FIRST PLACE IS WORTH, PER WORLD ────────────────────────────────────
// The family's ladder is anchored to an ABSOLUTE score rather than to a
// fraction of the player's, because a target defined as a fraction of the
// player can never be caught — see laneWant in rivals.ts, which carries the
// nine failed attempts that taught this.
//
// These are MEASURED, not chosen. `node qa/ab.mjs 5 <world> child` drives a
// deliberately sloppy player (stalls a third of the time, 60 degrees of aim
// error, chases things it cannot eat) and reports what it scores.
//
// ── PAR IS THE DIFFICULTY DIAL, AND IT IS EXACTLY ONE NUMBER ──────────────
// Worked out from laneWant and confirmed against 10 measured matches: THE
// PLAYER WINS IF AND ONLY IF THEIR SCORE BEATS PAR. If par is below their
// score the leader lands on par and finishes behind them; if par is above it,
// the leader is capped at PLAYER_CEIL x their score and finishes ahead. There
// is no third case. So the win rate is just P(score > par), and the first
// measured pass predicted 40% against 2/5 observed.
//
// PAR IS ALSO A MOVING TARGET, which is the trap here. A hungrier family eats
// the island the player was going to eat: the same child driver that scored
// 110,983 on Maple before this change scored 88,294 after it, a 20% drop, with
// the family's share of all bites going 40.7% -> 50.1%. Calibrating par against
// pre-change scores therefore sets it far too high — 94,000 against a post-
// change mean of 88,294 made Maple a coin flip.
//
// So these are set from the POST-change distribution, targeting a child winning
// roughly 70-75% of the time: often enough that a six-year-old feels good at
// the game, rarely enough that first place means something. Lowering par also
// feeds back the other way (a calmer family leaves more food, so scores rise),
// which is why this wants one more measured pass rather than an exact formula.
//
// The loop is real and it CONVERGES, measured across two passes on Maple:
//   par 94,000 -> child mean 88,294, wins 2/5   (too hard)
//   par 80,000 -> child mean 103,642, wins 3/5  (the mean recovered 17%)
// So each pass moves both numbers and the second pass landed in spec. Two
// matches in that second pass were decided by 4,772 and 868 points.
//
// AND DO NOT JUDGE THIS BY `leader / lane` ANY MORE. qa/ab.mjs reports the
// leader against 0.94 x the player's score, which was the right yardstick when
// the lane WAS a fraction of the player. It is not any more. With an absolute
// par, a player having a great run leaves the leader sitting on par and the
// ratio falls — correctly. Maple reads 80.9% here not because the field is
// failing but because the player averaged 103,642 against a par of 80,000.
// Judge it on WIN RATE, WORST PLACE, and how close the losses are.
//
// Re-measure if scoring changes. A par that drifts high makes the game
// punishing; one that drifts low turns the family back into scenery, which is
// the exact bug this whole mechanism replaced.
const WORLD_PAR: Record<string, number> = {
  maple: 80000,      // verified: mean 103,642, wins 3/5, worst place 2nd
  pirate: 105000,    // child mean 142,755 uncontested — nearly 2x Maple's scale
  gameday: 175000,   // verified: mean 198,446 (sd 61,657), wins 4/5
  lantern: 150000,   // child mean 199,791 uncontested; 0.75 of it, as Maple sits
};


const scene = new THREE.Scene();

// image-based ambience: gives every PBR material real specular response so
// surfaces read crisp/dimensional instead of flatly lit (the "2026" lift).
//
// AND IT STAYS RoomEnvironment, which was tried and reverted. Swapping it for
// each world's own painted sky sounds obviously better — a lantern in a night
// market and a mailbox in an autumn town should not reflect the same grey box
// — and it measured 15% DARKER on GAME DAY (whole-frame luminance 0.406 ->
// 0.343), which was the clean control since nothing else about that world had
// changed. The reasoning was wrong in a way the theory hid: every world in
// this game floats in the SAME near-black space (WORLD.space is 0x0d0821),
// only tinted. There is no warm daylight sky to reflect on Maple, so "the
// world's own sky" hands a sunny autumn town a dark violet sheen and takes
// away most of the specular that made the props read dimensional at all.
// A neutral lit box is the right environment for a game lit by a sun it does
// not draw.
{
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.15;   // specular sheen only — keep colours saturated
}
const camera = new THREE.PerspectiveCamera(32, window.innerWidth / window.innerHeight, 1, 1000);
let camDist = 50;
let lookVX = 0, lookVZ = 0, camPrevX = 0, camPrevZ = 0;   // camera lookahead, smoothed off real motion
const camOffset = new THREE.Vector3(0.62, 0.92, 0.62).normalize();
const TOPDOWN = location.search.includes('top');
const SHOW_WALLS = location.search.includes('walls');   // ?walls=1 — see the containment boundary
const ASSETVIEW = location.search.includes('assets');   // ?debug gallery of the GLB pack

// (Full-screen bloom washed out the sunlit island — the void's "bloom" is a
// dedicated additive glow sprite inside void3d instead: same pop, zero wash.)

// ── lighting ─────────────────────────────────────────────────────────────────
// Isolated by rendering sun-only against fill-only from a frozen camera: the
// ambient fill was supplying 68% of Maple's scene luminance and 73% of Pirate's,
// against 40% and 49% from the sun. A shadowed pixel therefore kept ~70% of its
// brightness and shadow contrast capped at 1.44x — a stylised diorama wants
// 2.5-3.5x. Nothing was clipping (p99 luminance 0.74, 0.00% clipped white in 26
// frames), so the headroom was there the whole time.
// ── THE LIGHT RIG IS PER WORLD ─────────────────────────────────────────────
// It was one rig for all three: sun at (-55, 95, 42), which is an elevation of
// 53.9 degrees — midday — in a warm white, everywhere. That is right for a
// sleepy town at noon and right for a tropical resort, and wrong for the world
// whose design contract opens on "low warm sun, long shadows, amber and
// crimson trees at the edges". The trees went amber; the light stayed at noon,
// so the level's whole stated mood was carried by foliage alone.
//
// GAME DAY now runs a real late-afternoon rig:
//   • the sun drops to ~26 degrees, so every truck, canopy and goalpost throws
//     a shadow two to three times its own length across flat tarmac — which is
//     the single most characteristic image a car park at 4pm produces, and the
//     one thing a dense flat district needs to stop reading as a texture;
//   • the azimuth swings round so the rake runs ACROSS the parking rows rather
//     than down them, giving the lot a visible rhythm from the play camera;
//   • the key warms to a low amber and the fill goes COLD, so lit and shadowed
//     faces separate by hue as well as by value — the golden-hour read;
//   • baseline dusk sits at 0.45, which lights the stadium's own fittings and
//     every window on Frat Row and Old Campus without waiting for the outro.
// Low sun costs shadow precision, so gameday carries its own normalBias.
//
// FIRST PASS OF THIS WAS TOO DARK, and only a framebuffer sample said so: mean
// luminance 0.280 against Maple's 0.626 and Pirate's 0.514, with the shadows
// coming out WARMER than the lit faces (red:blue 2.45 vs 1.36) because the fill
// was a brown. That is dusk, not late afternoon, and it is the wrong register
// for a game aimed at six-year-olds. Dropping the sun costs roughly half the
// light, so the key and the fill have to be paid back — the angle is the point,
// the darkness is not.
interface WorldLight {
  sun: number; sunI: number; hemiSky: number; hemiGround: number; hemiI: number;
  off: [number, number, number]; dusk: number; normalBias: number; exposure: number;
  // ── THE COUNTER-LIGHT, WHICH THE WORLD DID NOT HAVE ──────────────────────
  // The scene ran one directional sun plus a hemisphere, so every form was lit
  // from a single direction and its shadow side fell to flat ambient. That is
  // the difference between "3D" and "lit": with one lamp, a sphere is a
  // gradient, and with a warm key against a cool counter it is an object.
  //
  // The shop-card scenes in this very file have had the right rig all along —
  // key 0xfff2d8 at 2.4-2.6, rim 0x9fc8ff at 1.0-1.1, plus hemi (see the card
  // shooters). So the CARDS were better lit than the game they advertise. This
  // ports that idea to the world, per world, and it casts no shadows: a second
  // shadow map is the single most expensive thing that could be added here, and
  // a fill light does not need one.
  fill: number; fillI: number; fillOff: [number, number, number];
}
const WORLD_LIGHT: Record<WorldId, WorldLight> = {
  maple:   { sun: 0xfff2d8, sunI: 1.75, hemiSky: 0xdfeaff, hemiGround: 0x4a4468, hemiI: 0.5,
             off: [-55, 95, 42], dusk: 0, normalBias: 0.15, exposure: 1.0,
             fill: 0x9fc8ff, fillI: 0.62, fillOff: [62, 46, -58] },
  pirate:  { sun: 0xfff2d8, sunI: 1.75, hemiSky: 0xdfeaff, hemiGround: 0x4a4468, hemiI: 0.5,
             off: [-55, 95, 42], dusk: 0, normalBias: 0.15, exposure: 1.0,
             fill: 0x8fd6ff, fillI: 0.58, fillOff: [62, 46, -58] },
  // key paid back to 3.05, fill lifted to 0.66 and swung COOL (a slate, not a
  // brown) so the shadow side goes blue against the amber key instead of
  // muddying into it — warm light, cool shade, which is the whole read.
  // …AND 26 DEGREES WAS STILL TOO LOW, for a reason specific to this level:
  // it is a WALL-TO-WALL car park. A 2.5-unit truck at 26 degrees throws a
  // 5-unit shadow and the rows sit about 8 apart, so the shadows very nearly
  // bridge the aisles and the whole district ends up in shade — paying the key
  // back from 1.75 to 3.05 moved mean luminance only 0.280 to 0.331, because
  // there was hardly any lit ground left to brighten. Density and a low sun
  // fight each other. 40 degrees keeps the rake across the rows and a shadow
  // about 1.2x each object's height — long enough to read as afternoon, short
  // enough that the aisles stay lit.
  gameday: { sun: 0xffd9a8, sunI: 2.55, hemiSky: 0xc8dcf8, hemiGround: 0x53658c, hemiI: 0.86,
             off: [-38, 72, 78], dusk: 0.45, normalBias: 0.26, exposure: 1.12,
             fill: 0x93b4e8, fillI: 0.52, fillOff: [58, 44, -62] },
  // ── LANTERN NIGHT: the first rig in the game with no sun in it ──────────
  // Everything above is a daylight rig with the key doing the work. Here the
  // key is the MOON — cold, dim, and high, at 0.42 — and it is deliberately
  // too weak to light anything on its own. It exists to put a cool rim on the
  // roofs and a soft blue on the ground so the world has form; the actual
  // illumination comes from the lanterns, baked into the ground and carried by
  // emissive materials on the props themselves.
  //
  // That inversion is the whole look. In the other three worlds a prop is lit
  // BY the scene; here half the props ARE the scene's light sources, so the
  // street glows from within and the bamboo at the rim falls away into blue-
  // black. It is also why this is the cheapest world to light: a hundred real
  // point lights would be unshippable on a phone, and none of them are real.
  //
  // The hemisphere carries the mood: a deep indigo sky against a warm ground
  // bounce, which is the trick that stops night reading as "the day but darker"
  // — the ground is warmer than the sky, exactly backwards from every daylight
  // rig above, because the light is coming from the lanterns at street level.
  // dusk 1.0 lights every window, sign and paper lantern in the level from the
  // first frame; there is no golden hour to wait for here.
  // Exposure runs high (1.34) so the lantern pools bloom out toward white
  // while the shadows still have somewhere to go.
  lantern: { sun: 0xbfd4ff, sunI: 0.42, hemiSky: 0x141a3a, hemiGround: 0x6a4a3c, hemiI: 1.05,
             off: [-30, 96, 46], dusk: 1.0, normalBias: 0.14, exposure: 1.34,
             fill: 0x6a8cff, fillI: 0.46, fillOff: [52, 40, -60] },
};
const LIGHT = WORLD_LIGHT[pickedWorld];

// ── ONE RIG, APPLIED IN ONE PLACE ──────────────────────────────────────────
// THE GAME WAS LIT DIFFERENTLY ON EVERY MATCH AFTER THE FIRST, in all four
// worlds, and had been for as long as resetMatch has existed. The rig is built
// here from three numbers that are not in WORLD_LIGHT — a hemisphere pinned at
// 0.22, the key paid back by 1.31, exposure at 1.0 — and `scene
// .backgroundIntensity` was never set here at all, so it sat at three's
// default of 1. resetMatch() then wrote the RAW table values over all four.
//
// Measured on the live scene: Maple's key:fill went 10.42 -> 3.50 the instant
// a child tapped PLAY AGAIN, Game Day 15.18 -> 2.97, Lantern 2.50 -> 0.40, and
// the sky dropped 45%. Three times less contrast, on the screen that decides
// whether there is a third match. No returning player has ever seen this game
// lit the way it was tuned.
//
// The constructor is the authored side — the 0.22 and the 1.31 are the RESULT
// of the fill-vs-key measurement written up above WORLD_LIGHT, and resetMatch
// simply never got the memo. So the fix is to name those numbers once and have
// both paths read them. Nothing about match 1 changes in any world, which is
// the point: every screenshot, every palette call and every art argument in
// this repo was made against match 1.
const RIG = {
  /** the key, paid back after the fill measurement */
  sunI: LIGHT.sunI * 1.31,
  /** flat across worlds on purpose — the per-world hemiI in the table was
   *  never once applied at construction, and every world was tuned without it */
  hemiI: 0.22,
  exposure: 1.0,
};
/** The ONLY place these three are written. Called at boot and on every reset.
 *
 *  THE SKY IS NOT ONE OF THEM, and it used to be. This rig carried a bgI of
 *  1.0 and wrote it here, which fixed half of a bug and installed the other
 *  half: island.ts hangs a painted nebula on an async texture load and sets
 *  backgroundIntensity to 0.55 when it lands, so match 1 was correct, and then
 *  resetMatch() called this and forced the sky back to 1.0 — 82% brighter than
 *  authored — with the texture already cached so the 0.55 callback could never
 *  run again. Every match after the first, forever.
 *
 *  The rig cannot own that number because it does not know which sky is
 *  installed: the procedural canvas fallback wants 1.0 and the painted nebula
 *  wants 0.55, and which one is up depends on whether a download finished.
 *  Whoever sets scene.background sets its intensity with it. Measured with
 *  qa/_sky.mjs, which fails on 0.55 -> 1 and passes when the sky holds. */
function applyLightRig(): void {
  sun.intensity = RIG.sunI;
  hemi.intensity = RIG.hemiI;
  // the fill rides the same dimmer as the key, so a world that dims at dusk
  // does not end up lit only from behind
  fill.intensity = LIGHT.fillI * (RIG.sunI / WORLD_LIGHT[pickedWorld].sunI);
  renderer.toneMappingExposure = RIG.exposure;
}
const hemi = new THREE.HemisphereLight(LIGHT.hemiSky, LIGHT.hemiGround, RIG.hemiI);
scene.add(hemi);
// THE COOL COUNTER-LIGHT. See WorldLight.fill: the world had a single sun, so
// every shadow side fell to flat hemisphere ambient and forms read as gradients
// rather than as objects. This sits roughly opposite the sun, cool against the
// sun's warm, and casts NO shadow — a second shadow map is the most expensive
// thing that could be added to this scene, and a fill does not need one.
const fill = new THREE.DirectionalLight(LIGHT.fill, LIGHT.fillI);
fill.position.set(...LIGHT.fillOff);
fill.castShadow = false;
scene.add(fill);
const sun = new THREE.DirectionalLight(LIGHT.sun, RIG.sunI);
const sunOff = new THREE.Vector3(...LIGHT.off);
sun.position.copy(sunOff);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 10;
sun.shadow.camera.far = 380;
let shCur = 165;
sun.shadow.camera.left = -shCur; sun.shadow.camera.right = shCur;
sun.shadow.camera.top = shCur; sun.shadow.camera.bottom = -shCur;
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = LIGHT.normalBias;
const SUN_DAY = new THREE.Color(LIGHT.sun);
const HEMI_DAY = new THREE.Color(LIGHT.hemiSky);
// the shadow frustum rides the camera: tight box up close = crisp tree
// shadows, widening as you zoom out (fixed 330u box was ~6 texels/unit)
function fitShadow(dist: number) {
  // THE STICKS ON THE SAND. At the 165-unit box the shadow map resolves 6.2
  // texels per world unit, so a palm trunk or a frond is one or two texels and
  // PCF smears it into a detached grey streak — dozens of them lying on open
  // ground with nothing above them. Capping the box at 110 roughly doubles the
  // resolution where the player actually is.
  // …and the 110 cap is only right while the void is small. The camera reaches
  // ~318 units at WORLD ENDER and sees roughly +/-150-190 units of ground, so
  // everything past 110 fell outside the shadow frustum and rendered fully
  // shadowed — a hard straight diagonal across the screen with the corner flat
  // dark, in the last third of EVERY match. Crisp palm-frond shadows stop
  // mattering once the hero is nineteen metres wide, so the cap opens up with
  // the camera instead of fighting it.
  const cap = dist > 150 ? 220 : dist > 90 ? 150 : 110;
  const target = THREE.MathUtils.clamp(dist * 1.1, 45, cap);
  if (Math.abs(target - shCur) < 10) return;
  shCur = target;
  sun.shadow.camera.left = -shCur; sun.shadow.camera.right = shCur;
  sun.shadow.camera.top = shCur; sun.shadow.camera.bottom = -shCur;
  sun.shadow.camera.updateProjectionMatrix();
}
scene.add(sun); scene.add(sun.target);

// ══ NOTHING STANDS IN FRONT OF THE HERO ════════════════════════════════════
//
// Measured before this existed: 3-13% of sampled frames per world hid a
// quarter or more of the void behind scenery, and both Maple and Lantern
// produced a frame inside the first FORTY SECONDS where it was 100% invisible.
// The void is the character and the only thing on screen that is the child.
//
// The test is a CYLINDER along the camera-to-hero segment, not a raycast:
// raycasting into ~10,900 meshes every frame is not affordable, and a cylinder
// is both cheaper and kinder — it catches the prop about to clip the void's
// edge, which is the case that actually looks wrong, rather than only the one
// dead centre.
//
// Costs one pass over the edibles, which the frame already walks several
// times, and skips almost everything on a cheap squared-distance test first.
const _foCam = new THREE.Vector3(), _foDir = new THREE.Vector3(), _foTo = new THREE.Vector3();
const _foFading = new Set<THREE.Object3D>();
const _foPrev = new Set<THREE.Object3D>();
/** how fast a prop dissolves and comes back, in fade units per second */
const FO_RATE = 5.5;
function fadeOccluders(dt: number): void {
  const heroX = voidState.x, heroZ = voidState.z, heroY = voidling.group.position.y;
  _foCam.copy(camera.position);
  _foTo.set(heroX - _foCam.x, heroY - _foCam.y, heroZ - _foCam.z);
  const camToHero = _foTo.length();
  if (camToHero < 1) return;
  _foDir.copy(_foTo).multiplyScalar(1 / camToHero);
  // the void's world radius, plus a margin so a prop clipping its edge counts
  const shield = voidling.radius * 1.35 + 1.2;
  // only props whose CENTRE is nearer the camera than the hero can occlude it,
  // so the search never needs to look past the hero
  _foPrev.clear();
  for (const o of _foFading) _foPrev.add(o);
  _foFading.clear();
  for (const e of edibles) {
    if (e.eaten) continue;
    const m = e.mesh;
    if (!m.visible || m.userData.fade === undefined) continue;
    const px = m.position.x - _foCam.x, py = m.position.y - _foCam.y, pz = m.position.z - _foCam.z;
    // distance ALONG the camera->hero axis
    const t = px * _foDir.x + py * _foDir.y + pz * _foDir.z;
    if (t <= 0 || t >= camToHero) continue;          // behind the camera, or past the hero
    // perpendicular distance from that axis
    const cx = px - _foDir.x * t, cy = py - _foDir.y * t, cz = pz - _foDir.z * t;
    const perp2 = cx * cx + cy * cy + cz * cz;
    const reach = shield + (e.radius || 1);
    if (perp2 > reach * reach) continue;
    _foFading.add(m);
  }
  // EASE, DO NOT SNAP. A prop that pops to 30% and back as the void slides
  // past reads as a rendering fault; half a second of dissolve reads as the
  // camera being polite. Everything that stopped occluding this frame is
  // walked back up by the same rate.
  const step = FO_RATE * Math.min(dt, 0.05);
  for (const m of _foFading) {
    const cur = (m.userData.fade as number) ?? 1;
    setMeshFade(m, Math.max(0.28, cur - step));
  }
  for (const m of _foPrev) {
    if (_foFading.has(m)) continue;
    const cur = (m.userData.fade as number) ?? 1;
    const next = Math.min(1, cur + step);
    setMeshFade(m, next);
    if (next < 1) _foFading.add(m);   // keep easing it back next frame
  }
}

// ── adaptive quality: hold a smooth frame rate on ANY device ─────────────────
// samples real fps and walks a quality ladder (pixel ratio → shadow res →
// shadows off). Climbing back up is slow and rare so it never oscillates.
// Each rung carries its own phone value now. The old code applied
// Math.min(q.pr, 1.3) on touch devices, which flattened the whole ladder to a
// single blurry rung and made three of the four entries unreachable.
// ── BLOOM IS OFF ON EVERY RUNG, AND THAT IS A COLOUR DECISION ─────────────
// The composer path does not render the same colours as the direct path — it
// costs the hero about 0.20 saturation and adds 0.12 value, measured on all
// four worlds with the glow's own strength forced to zero (see ensureComposer).
// Because this flag is what selects between the two paths, the adapter walking
// the ladder was switching the entire frame between two colour pipelines
// mid-match, which is exactly what the owner kept reporting.
//
// Leaving these true and merely lowering the glow does NOT help: the wash is
// the pipeline, not the bloom. So until the encode is repaired, every rung
// renders straight to the canvas. The player gets ONE look, the crisp one, and
// a full-screen pass back on every device.
const QUALITY = [
  { pr: 2.0, prSmall: 2.0, shadows: true, shSize: 2048, bloom: false },
  { pr: 1.6, prSmall: 1.6, shadows: true, shSize: 1024, bloom: false },
  // BLOOM GOES BEFORE RESOLUTION DOES. A composer costs a full-screen pass and
  // a mip chain every frame, and a blurry-but-smooth frame beats a sharp-but-
  // stuttering one on a phone — so the ladder drops the glow one rung before it
  // starts dropping pixels the player can see.
  { pr: 1.35, prSmall: 1.3, shadows: true, shSize: 1024, bloom: false },
  { pr: 1.15, prSmall: 1.0, shadows: false, shSize: 512, bloom: false },
];
let qLevel = 0, qAccT = 0, qAccN = 0, qCd = 4;
let bloomOn = true;   // set by applyQuality from the rung's own flag
/** QA only: when non-null the adapter stops walking and stays on this rung.
 *  See __pinQuality — a moving ladder makes every graphics measurement a
 *  reading from a rung nobody chose. */
let qPinned: number | null = null;
/** Shadows have been turned off once this session. Crossing that boundary
 *  rebuilds every shader program, so it is a ONE-WAY DOOR: a device weak
 *  enough to need the bottom rung does not benefit from being handed a
 *  1,677 ms rebuild every time it briefly recovers. */
let qShadowLatch = false;
function applyQuality() {
  const q = QUALITY[qLevel];
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, IS_SMALL_SCREEN ? q.prSmall : q.pr));
  bloomOn = q.bloom;
  if (renderer.shadowMap.enabled !== q.shadows) {
    // ── THE MOST EXPENSIVE THING IN THE GAME, AND IT FIRES WHEN THE DEVICE
    //    IS ALREADY STRUGGLING ────────────────────────────────────────────
    // three bakes shadow support into the compiled program, so flipping
    // shadowMap.enabled invalidates every material and rebuilds ~45 shader
    // programs across a 10,869-mesh scene. Measured: a 1,677 ms frame and
    // 3,190 ms of extra work spread over the next 60 frames — and it was
    // reachable in BOTH directions roughly every 14 seconds, triggered BY the
    // frame rate dropping. Frames drop, the ladder demotes, the demotion
    // freezes for over a second, frames drop.
    //
    // Two changes break the loop. This one stops walking 10,869 meshes to
    // reach ~45 distinct materials: needsUpdate is per MATERIAL, and the whole
    // island shares two of them. The other is the latch below — crossing this
    // boundary is now one-way, so the rebuild happens at most once a session
    // instead of ping-ponging.
    renderer.shadowMap.enabled = q.shadows;
    sun.castShadow = q.shadows;
    if (!q.shadows) qShadowLatch = true;
    const seen = new Set<THREE.Material>();
    scene.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
      if (m) (Array.isArray(m) ? m : [m]).forEach((mm) => { seen.add(mm); });
    });
    seen.forEach((mm) => { mm.needsUpdate = true; });
  }
  if (sun.shadow.mapSize.x !== q.shSize) {
    sun.shadow.mapSize.set(q.shSize, q.shSize);
    sun.shadow.map?.dispose();
    (sun.shadow as { map: unknown }).map = null;
  }
}

// ── edibles + island ─────────────────────────────────────────────────────────
interface Edible { mesh: THREE.Object3D; radius: number; eaten: boolean; t: number; orbit: number; orbitR: number; spin: THREE.Vector3; home: THREE.Vector3; homeScale: THREE.Vector3; homeRotY: number; }
const edibles: Edible[] = [];
const rand = (a: number, b: number) => a + Math.random() * (b - a);
function addEdible(mesh: THREE.Object3D, radius: number) {
  // remember where everything LIVES — instant rematch restores the island
  // in-place instead of a full page reload (hole.io's <2s "one more go" loop)
  mesh.userData.eRadius = radius;   // gameplay size, readable by rivals/validators
  if (radius >= 2.5 && !mesh.userData.mover) mesh.userData.building = true;   // building-class: may NEVER be translated by FX
  edibles.push({ mesh, radius, eaten: false, t: 0, orbit: 0, orbitR: 0, spin: new THREE.Vector3(),
    home: mesh.position.clone(), homeScale: mesh.scale.clone(), homeRotY: mesh.rotation.y });
}

// ── WORLD SELECT ────────────────────────────────────────────────────────────
// The chosen world must be set BEFORE the island is built (the ground bake and
// the prop pass both read the plan). Switching worlds reloads, which is fine:
// it's a level select, not a mid-match toggle.
// MAPLE FALLS, everywhere. This said MAPLE ISLE — on the loading screen and
// the match title card, the two places a child reads the world's name — while
// 60 other player-facing strings, including the world-picker card they tap
// immediately beforehand, say MAPLE FALLS.
// ── EVERY WORLD-FACING STRING, IN ONE PLACE ────────────────────────────────
// This used to be a scatter of `pirate ? A : B` ternaries, which is a two-world
// shape in a three-world game: GAME DAY silently took Maple Falls' half of
// every one of them. It shipped as "LEVEL 1", "the little void is hungry · eat
// the island", a palm-island chip reading "WORLD 1 OF 3", a results screen
// titled CHOMPION OF THE ISLE, and — loudest of all — a WORLD ENDER headline
// announcing that MAPLE FALLS had gone, at the biggest moment of the match, on
// a plateau in a college town.
//
// A table cannot do that. Adding a fourth world means filling in a row and the
// compiler naming anything left out.
interface WorldCopy {
  n: number;            // which level this is, for the title card and the chip
  newsGap: [number, number];   // seconds between scheduled headlines, min/spread
  signOn: number;              // …and how long before the station says hello
  /** THE ESTABLISHING SHOT'S SUBJECT, in 3D coords, or null to open on the void.
   *
   *  GAME DAY's design contract promises the player spawns "facing the stadium,
   *  so the first thing they see is the thing they are working toward". It never
   *  happened, and projecting the bowl's bounding box each frame says why it
   *  never could: the camera sits at a 46-62 degree pitch with a 32 degree
   *  field of view, the stadium is 281 units away, and it lands at NDC y 1.28
   *  to 1.78 — entirely above the top of the screen, at every size the player
   *  passes through. Nothing 280 units out is visible in a top-down camera, on
   *  any of the three worlds, and making the bowl taller pushes it FURTHER off
   *  the top rather than into frame.
   *
   *  So the promise is kept the way films keep it: the match opens on the
   *  stadium and pulls back to the void. The existing 2.2-second dive already
   *  had the altitude for it and was simply pointed at the player's feet. */
  hero: [number, number] | null;
  /** How long the opening camera move runs. The title card animation is 4.2s,
   *  so anything up to about 3.6 plays UNDER the card, which is the point:
   *  the world's name over a shot of the world's landmark. */
  introLen: number;
  icon: string;         // the chip's glyph
  sub: string;          // the title card's one line
  ender: string;        // the WORLD ENDER announce banner
  enderNews: string;    // …and the headline that goes with it
  winSub: string;       // the results screen, when the player came first
  winTitles: string[];  // …and the rotating title above it
  place: string;        // the noun for this world, mid-sentence
  /** THE FINALE CUE, per world — the banner when the hero landmark becomes
   *  edible, the headline under it, and the banner when it goes.
   *
   *  These three were hard-coded to GAME DAY's stadium while `heroProp` is
   *  resolved per-match as the largest edible in the world. So Pirate Bay's
   *  radius-10 Royal Mariner and Lantern Night's radius-11 bathhouse both
   *  raised '🏟️ THE STADIUM IS IN REACH' at the single biggest moment of the
   *  match, followed by a headline naming Hank — Game Day's play-by-play
   *  announcer, who does not exist in either world.
   *
   *  This is the exact failure WORLD_COPY was built to make impossible: a
   *  table cannot be forgotten, because adding a world means filling in a row
   *  and the compiler names anything left out. These three strings were simply
   *  never moved into it. `null` on a world with no hero landmark. */
  heroCue: string | null;
  heroCueNews: string | null;
  heroGone: string | null;
  /** THE REACTIVE ONE-SHOTS, per world. `breakingNews()` jumps the newsroom
   *  queue when the player causes a big beat, and until now three of those
   *  beats were hard-coded generic strings that fired in ALL FOUR worlds.
   *  LANTERN NIGHT is where it showed: the market's public address is a
   *  recording that has no mechanism for noticing anything, and it was
   *  printing "It ate a house. A WHOLE house. We have questions." That is the
   *  same class of leak as the stadium banner above, and the same fix. */
  houseNews: string;      // the first building goes
  rivalGoneNews: string;  // one void has eaten the other
  rivalFullNews: string;  // …and the survivor has slowed right down
}
const WORLD_COPY: Record<WorldId, WorldCopy> = {
  maple: {
    // MAPLE FALLS WAS WEARING PIRATE BAY'S ICON. 🏝️ is a palm on a sand spit,
    // and this world is a sleepy autumn town — Main Street, a courthouse, a
    // county fair, and several hundred maples. The card said SLEEPY LITTLE
    // TOWN under a picture of a tropical island, and every line of its copy
    // called the place "the island", which is the engine's word for a
    // landmass, not the player's word for where they are. PIRATE BAY is the
    // tropical island in this game and it is two cards along.
    n: 1, icon: '🍁', sub: 'the little void is hungry · eat the town',
    newsGap: [16, 8], signOn: 6, hero: null, introLen: 2.2,
    ender: '🌑 WORLD ENDER! The town is OVER.',
    enderNews: 'MAPLE FALLS has GONE!! The clock is still nine minutes fast.',
    houseNews: 'A whole house has gone. Town hall will discuss it for four hours.',
    rivalGoneNews: 'One void has eaten the other. There is one left, and it is bigger.',
    rivalFullNews: 'The second void has stopped moving. It looks full. It looks slow.',
    winSub: 'the whole town belongs to the void', place: 'the town',
    winTitles: ['TOWN: DELICIOUS', 'YOU ATE. YOU WON.', 'BURP OF CHAMPIONS', 'VOID SWEET VOID', 'CHOMPION OF MAPLE FALLS'],
    // ── MAPLE HAS A FINALE NOW, AND THE REASON IT DID NOT WAS ARITHMETIC ───
    // This said: "no hero landmark — the biggest thing in Maple Falls is a 6.5
    // town hall, which the void passes without ceremony. A cue here would be
    // noise." The claim underneath it was that the hall comes into range
    // halfway through. It does not.
    //
    // The cue fires at `heroProp.radius <= voidling.radius * EAT_RATIO`, and
    // EAT_RATIO is 1.11, so a 6.5 hall needs the void at r >= 5.86. Measured
    // on a full match with qa/pace.mjs (after its own 45-degree steering bug
    // was fixed — every earlier pacing number in this repo is inflated):
    // Maple's radius is 4.85 at 120s and 6.09 at 140s, so it crosses at about
    // t=132s of 180. That is the last quarter, the same window Pirate, Game
    // Day and Lantern were tuned to — not halfway, and not noise.
    //
    // Maple needed this more than any of them. Same probe, one match each:
    // it is LAST on every axis while being WORLD 1 — 3,514 eats against Game
    // Day's 4,666, 237,784 points against 475,640, 1.9u of travel per eat
    // against 1.4, and 16 headlines against 21. The first level a child plays
    // was the least generous one and the only one with no climax.
    //
    // A weaker player simply never reaches r5.86 and the cue never fires,
    // which is exactly today's behaviour — so this is upside for a good run
    // and unchanged for a poor one.
    //
    // `heroGone` calls back a set piece that already exists: life.ts runs a
    // town-hall meeting whose crowd shouts "move to adjourn? DENIED." and
    // "ADJOURNED!! ADJOURNED!!". The newsroom register is plain sentences with
    // a full stop and one joke — see newsroom_maple.ts.
    heroCue: '🏛️ THE TOWN HALL IS IN REACH — GO!',
    heroCueNews: 'It is big enough for the town hall. The meeting has gone quiet.',
    heroGone: '🏛️ TOWN HALL: ADJOURNED.',
  },
  pirate: {
    n: 2, icon: '🏴‍☠️', sub: 'the resort is packed · eat the party',
    newsGap: [16, 8], signOn: 6,
    // THE ROYAL MARINER, in 3D: island.ts authors the grand hotel at world
    // (8540, 3700). Pirate Bay was written off for a finale cue on the
    // grounds that it has "no single object the match builds toward" — but it
    // does, and it is a radius-10 hotel that only becomes edible in the last
    // half-minute, which is the exact definition GAME DAY's stadium meets.
    // Without the cue a child reached the biggest meal on the island with no
    // idea it had become reachable.
    hero: [(8540 - 6000) * 0.05, (3700 - 6000) * 0.05], introLen: 2.2,
    ender: '🌑 WORLD ENDER! The resort is OVER.',
    enderNews: 'PIRATE BAY is CANCELLED!! It was lovely while it lasted.',
    houseNews: 'A whole villa, gone in one go. Do book early for next year.',
    rivalGoneNews: 'One of them has eaten the other. There is one left. Rather large.',
    rivalFullNews: 'The other one has stopped moving. It looks full. Extremely full.',
    winSub: 'the whole resort belongs to the void', place: 'the resort',
    winTitles: ['RESORT: DEVOURED', 'YOU ATE. YOU WON.', 'BURP OF CHAMPIONS', 'ALL-INCLUSIVE, LITERALLY', 'CHOMPION OF THE BAY'],
    heroCue: '🏨 THE ROYAL MARINER IS IN REACH — GO!',
    heroCueNews: 'It is big enough for the Royal Mariner. The concierge has gone quiet.',
    heroGone: '🏨 THE ROYAL MARINER IS GONE. ALL FIVE STARS.',
  },
  gameday: {
    n: 3, icon: '🏈', sub: 'the whole town turned out · eat the tailgate',
    // THE BOOTH IS NOT A TICKER. Hank and Bill are two announcers who never
    // stop calling the game — that is the entire conceit of this world's
    // newsroom, and on a 30-42 second cadence a full match produced EIGHT
    // headlines out of a pool of 464, about 2% of the writing, delivered at
    // the pace of a station ident. Halved, so a match runs 10-12 scheduled
    // calls plus whatever the player causes. The card itself lives 5.6s, so
    // even at the short end there is a clear ten-second gap between them.
    // The sign-on comes early too: "Good afternoon from Marston!" is the
    // opening line of a broadcast, not something you hear a quarter in.
    newsGap: [16, 8], signOn: 6,
    // the bowl, in 3D: gameday.ts authors it at world (5930, 3200), and the
    // world-to-3D transform is (v - 6000) * 0.05.
    hero: [(5930 - 6000) * 0.05, (3200 - 6000) * 0.05],
    // 2.2 was not long enough to READ the shot: at 0.6s the pan had already
    // cleared the bowl and was over the concourse, because the dive and the
    // pan both ran off the same curve. 3.4 still finishes inside the 4.2s
    // title card, and the hero hold below buys the first second outright.
    introLen: 3.4,
    ender: '🌑 WORLD ENDER! The stadium is OVER.',
    enderNews: 'MARSTON has GONE!! Hank Prewitt is still calling it, play by play.',
    houseNews: 'Bill, that was a HOUSE. Straight down the middle, and no flag.',
    rivalGoneNews: 'One took the other, Bill. One left on the field, and it is bigger.',
    rivalFullNews: 'The second one has stopped moving. Bill calls that a slow start.',
    winSub: 'the whole of Marston belongs to the void', place: 'the town',
    winTitles: ['FINAL: VOID, EVERYBODY ELSE 0', 'YOU ATE. YOU WON.', 'BURP OF CHAMPIONS', 'THAT IS A GAME', 'CHOMPION OF MARSTON'],
    heroCue: '🏟️ THE STADIUM IS IN REACH — GO!',
    heroCueNews: 'It is big enough for the stadium. Hank has stopped describing it.',
    heroGone: '🏟️ THE STADIUM IS GONE. ALL OF IT.',
  },
  lantern: {
    n: 4, icon: '🏮', sub: 'the spirits think you are a guest · eat the market',
    // The market's own voice is a PA that cannot tell anything is wrong, so it
    // talks like a station that has nothing to report — often, and cheerfully.
    newsGap: [15, 7], signOn: 5,
    // the bathhouse, in 3D: lantern.ts authors it at world (6280, 2500), and
    // the world-to-3D transform is (v - 6000) * 0.05.
    hero: [(6280 - 6000) * 0.05, (2500 - 6000) * 0.05],
    // Longer than GAME DAY's 3.4. This world's establishing shot is a CORRIDOR
    // — lanterns receding to a lit building — and a corridor needs travel to
    // read as one. 3.6 still finishes inside the 4.2s title card.
    introLen: 3.6,
    ender: '🌑 WORLD ENDER! The market is OVER.',
    enderNews: 'THE MARKET HAS GONE. The bathhouse thanks you for visiting.',
    houseNews: 'A guest has taken a whole house. We hope it was to their liking.',
    rivalGoneNews: 'There is one guest tonight. The guest list has been updated.',
    rivalFullNews: 'The other guest has stopped. We think the other guest is full.',
    winSub: 'the whole market belongs to the void', place: 'the market',
    winTitles: ['MARKET: DEVOURED', 'YOU ATE. YOU WON.', 'BURP OF CHAMPIONS',
                'THE GUEST HAS FINISHED', 'HONOURED, AND ALSO ENORMOUS'],
    heroCue: '🏮 THE BATHHOUSE IS IN REACH — GO!',
    heroCueNews: 'It is big enough for the bathhouse. The PA is still reading the hours.',
    heroGone: '🏮 THE BATHHOUSE IS GONE. SIX HUNDRED YEARS, DRY.',
  },
};
const COPY = WORLD_COPY[pickedWorld];
{
  const nm = WORLD_NAMES[pickedWorld];
  document.title = `VOIDLING · ${nm} (3D)`;
  const tc = document.querySelector('#titlecard .name'); if (tc) tc.textContent = nm;
  const tl = document.querySelector('#titlecard .lvl'); if (tl) tl.textContent = `LEVEL ${COPY.n}`;
  const ts = document.querySelector('#titlecard .sub');
  if (ts) ts.textContent = COPY.sub;
  const ln = document.querySelector('#loadScr .lName'); if (ln) ln.textContent = nm;
}
const island = createIsland(scene, addEdible);

// ══ THE SCRAPBOOK, IN THE WORLD ═══════════════════════════════════════════
// One hidden curio per sticker this world has, dropped in the district its
// clue names. Placement is DETERMINISTIC — the same seed every time — because
// the point is a hunt a child can learn, finish and then tell somebody else
// about. A randomised hiding place is a slot machine; a fixed one is a secret.
//
// Already-found stickers are not placed at all. A book you have filled in is
// a world you have finished, and re-eating a sticker you own is a non-event
// standing where a real prop could be.
const curios: { mesh: THREE.Object3D; seed: number }[] = [];
function placeStickers(): void {
  // the district maps are per-world; biomeAt returns raw biome ids
  const distOf = (x: number, z: number): string => {
    const b = String(island.biomeAt(x, z));
    if (pickedWorld === 'maple') return MAPLE_DIST[b] ?? b;
    if (pickedWorld === 'gameday') return GAMEDAY_DIST[b] ?? b;
    return b;   // Pirate Bay and Lantern Night already speak in district ids
  };
  for (const st of STICKERS_BY_WORLD(pickedWorld)) {
    if (hasSticker(st.id)) continue;
    // a tiny deterministic PRNG seeded off the id: same hiding place forever
    let h = 2166136261;
    for (let i = 0; i < st.id.length; i++) { h ^= st.id.charCodeAt(i); h = Math.imul(h, 16777619); }
    const rnd = () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 100000) / 100000; };
    let put: [number, number] | null = null;
    // reject until the point is in the RIGHT district, on land, out of the
    // water and away from the spawn — 900 tries is generous and costs nothing
    // once, at boot. Districts are large; this lands inside twenty on average.
    for (let i = 0; i < 4000 && !put; i++) {
      // ±290, not ±130. The island spans roughly ±280 in 3D units (12,000
      // world units at SCALE 0.05, centred on 6000), and a ±130 box is the
      // MIDDLE of it — so the outer districts, which is where the good
      // hiding is, could never be sampled at all. Four of Maple's twelve
      // silently failed to place: the strip, the lake shore and the woods.
      const x = (rnd() - 0.5) * 580, z = (rnd() - 0.5) * 580;
      if (!insideIsland3(x, z)) continue;
      if (inDeepWater3(x, z, 4)) continue;
      if (Math.hypot(x - island.spawn.x, z - island.spawn.z) < 26) continue;   // never on the doorstep
      if (distOf(x, z) !== st.biome) continue;
      put = [x, z];
    }
    if (!put) continue;   // this world has no such district — skip, never crash
    const g = makeCurio(st.tier as CurioTier);
    g.position.set(put[0], 0, put[1]);
    g.rotation.y = rnd() * Math.PI * 2;
    g.userData.sticker = st.id;
    scene.add(g);
    addEdible(g, CURIO_R[st.tier as CurioTier]);
    curios.push({ mesh: g, seed: rnd() * 6.28 });
  }
}
// NOT CALLED HERE. This runs at module scope, and the district maps it reads
// (MAPLE_DIST, GAMEDAY_DIST) are consts declared a thousand lines further
// down — touching them from up here is a temporal dead zone and the whole
// module fails to initialise. It is latched and called from the first
// beginMatch instead, which is after everything exists.
let _stickersPlaced = false;
function placeStickersOnce(): void {
  if (_stickersPlaced) return;
  _stickersPlaced = true;
  placeStickers();
}
// dev/QA introspection hooks (harmless in prod; no gameplay reads these).
// __edibles + __insideIsland3 + __validateWorld power the placement auditor:
// a headless sweep measures every edible's REAL world-space bounding box
// against the road/sidewalk bands and the coastline.
const _dbg = window as unknown as {
  __scene: THREE.Scene; __cam: THREE.Camera; __THREE: typeof THREE; __renderer: THREE.WebGLRenderer;
  __edibles: Edible[]; __insideIsland3: (x: number, z: number) => boolean; __validateWorld: () => void;
  __life: Life; __moverStats: (gate: number) => { near: number; total: number }; __crowdGate: number;
  __hatSheet: (ids: string[]) => Promise<unknown>;
  __voidSheet: (ids: string[]) => Promise<unknown>;
  __texRace: (skinId: string) => Promise<Record<string, unknown>>;
  __paintVoids?: () => void;
  __previewVoid?: (s: Skin) => void;
  __previewStop?: () => void;
  __shopMirror?: () => void;
  __shopTab?: () => void;
  __skinsGranted?: (ids: string[]) => void;
  __celebrateSkins?: (skins: Skin[]) => void;
  __grantHats: (ids: string[]) => void;
  __news: () => void;
  __setSkin: (s: Record<string, unknown>) => void;
  __voidState: () => { x: number; z: number; r: number };
  __biomeAt: (x: number, z: number) => string | null;
  __rushClock: (to: number) => void;
  __setVoidR: (r: number) => void;
  __pinQuality: (n: number | null) => void;
  __renderBloom: () => void;
  __quality: () => { level: number; pinned: number | null; shadows: boolean; shSize: number; pr: number };
  __warpVoid: (x: number, z: number) => void;
  __inDeepWater3: (x: number, z: number, m: number) => boolean;
  __setMood: (m: string | null) => void;
  __faceWrap: (v: number) => void;
  __groundSurf: (road: number, grass: number, debug?: number) => void;
  __pickFresh: <T>(arr: T[]) => T;
  __spawn: () => { x: number; z: number };
  // QA: whole-match telemetry — player score/radius against every rival's, so a
  // harness can log the real race curve instead of scraping the HUD.
  __matchState: () => { t: number; clock: number; score: number; r: number; ev: typeof rivalEv; graze: number; tense: number;
    ate: { you: number; family: number };
    rivals: { name: string; score: number; r: number; x: number; z: number; joined: boolean; arch: string; hunt: boolean }[] };
};
// QA counters: what the family actually DID to the player over a match
const rivalEv = { bites: 0, hunterBites: 0, stolen: 0, charges: 0, nearMiss: 0, eaten: 0, marquee: 0 };
_dbg.__scene = scene; _dbg.__cam = camera; _dbg.__THREE = THREE; _dbg.__renderer = renderer;
/** QA: draw one frame THROUGH the bloom composer, synchronously.
 *  Without this a probe has to re-enable the game's own rAF and hope to read
 *  the canvas before it is cleared — which returns a blank buffer most of the
 *  time and reported the void's colour as pure black on 4 worlds out of 4.
 *  Bloom's effect on the character is the largest colour effect in the game, so
 *  it needs to be measurable on demand rather than by lucky timing. */
_dbg.__renderBloom = () => { ensureComposer().render(); };
_dbg.__edibles = edibles; _dbg.__insideIsland3 = insideIsland3; _dbg.__validateWorld = () => validateWorld();

_dbg.__news = () => showNews();   // QA: fire a headline on demand (audits the live templates)
_dbg.__voidState = () => ({ x: voidState.x, z: voidState.z, r: voidling.radius });   // QA: containment tests
_dbg.__biomeAt = (x: number, z: number) => island.biomeAt(x, z);   // QA: district centroid sweeps
// QA: the third term of the containment rule, so a harness can reproduce
// solid() exactly and sweep a whole map for pockets the player cannot enter.
_dbg.__inDeepWater3 = (x: number, z: number, m: number) => inDeepWater3(x, z, m);
// QA: wind the match clock forward so a harness can photograph the results
// screen without simulating three real minutes of software rendering
_dbg.__rushClock = (to: number) => { matchClock = to; };
// QA: pin an expression so the face rig can be measured mood by mood without
// waiting on the idle timer or getting bitten. `null` hands control back.
let moodPin: string | null = null;
_dbg.__setMood = (m: string | null) => { moodPin = m; if (m) voidling.setMood(m as never); };
// How far the face is seated onto the sphere, 0..0.9. A look knob — see
// FACE_WRAP in void3d.ts. Exposed so qa/facewrap.mjs can render the same
// frame at several values and the choice can be made from pictures.
_dbg.__faceWrap = (v: number) => voidling.setFaceWrap(v);
// The ground's two-material split — see uSurf in island.ts. (road, grass) are
// roughness values; 0.97 is the old single-material value, i.e. off. A third
// argument of 1 paints the MASK instead of the world (red = road, green =
// grass), which is the only way to see what the heuristic actually selected
// before trusting a roughness applied through it.
_dbg.__groundSurf = (road: number, grass: number, debug = 0) => {
  scene.traverse((o) => {
    const m = (o as THREE.Mesh).material as THREE.Material | undefined;
    const u = (m as { userData?: { surfU?: { value: THREE.Vector4 } } } | undefined)?.userData?.surfU;
    if (u) u.value.set(road, grass, debug, 0);
  });
};
// QA: the crowd's recency guard itself. The end-to-end match measurement of it
// was too noisy at n=2 to say anything (9 and 16 repeats against a 21/11/14
// baseline), so qa/fresh.mjs drives THIS — the shipped function, not a copy —
// a hundred thousand times and settles it on the statistics instead.
_dbg.__pickFresh = pickFresh;
// QA: repaint the hero's four body colours live. Every argument about whether
// he reads as DEFINED — dark heart, crisp lit rim, real separation between the
// two — is a question about these four numbers, and settling it by editing the
// palette and waiting for a rebuild is how it stayed unsettled. qa/voidgrid.mjs
// drives this to shoot a whole sweep in one run.
_dbg.__setSkin = (s: Record<string, unknown>) => voidling.setSkin(s as never);
// QA: the AUTHORED spawn, which is not the same as where the void is a few
// seconds in — it drifts toward whatever it is eating. Spawn-framing checks
// have to test against this, not against __voidState().
_dbg.__spawn = () => ({ x: island.spawn.x, z: island.spawn.z });
// QA: force the hero to a size so the renderer can be shot at every form
// without playing a whole match. Sets the visual stage too, so the void looks
// exactly as it would if a player had grown into it.
_dbg.__setVoidR = (r: number) => {
  frozenR = true;             // …and hold it there against the growth law
  voidling.setRadius(r); lastR = r;
  curStage = stageFor(r); voidling.setStage(VISUAL_STAGE[curStage] ?? 0);
  audio.setMusicStage(VISUAL_STAGE[curStage] ?? 0);
};
// QA: PIN THE QUALITY LADDER. The adapter samples real fps and walks a ladder
// whose bottom rung turns shadows off and drops the pixel ratio — correct on a
// real device, ruinous for measurement, because a software renderer is slow
// enough to demote inside the first few seconds of any probe. Any graphics
// number sampled while it is moving is a number from a rung nobody chose: a
// shadow-cost sweep came back with rows reading a 0% saving, which was not the
// shadows being free but the ladder having already switched them off.
// __pinQuality(n) parks it on rung n and stops the adapter; __pinQuality(null)
// hands it back.
_dbg.__pinQuality = (n: number | null) => {
  qPinned = n;
  if (n !== null) { qLevel = Math.max(0, Math.min(QUALITY.length - 1, n)); applyQuality(); }
};
_dbg.__quality = () => ({ level: qLevel, pinned: qPinned, shadows: renderer.shadowMap.enabled,
  shSize: sun.shadow.mapSize.x, pr: renderer.getPixelRatio() });
// QA: put the hero anywhere on the map. There was no way to photograph a
// district without playing the three minutes it takes to reach it, which meant
// every density and lighting judgement was made from the two or three places a
// harness could actually get to. Snaps the camera with it so the shot is not a
// two-second dolly.
_dbg.__warpVoid = (x: number, z: number) => {
  voidState.x = x; voidState.z = z;
  voidling.group.position.set(x, voidling.group.position.y, z);
  // and drag the camera with it rather than letting it lerp across the valley
  camera.position.set(x + camOffset.x * camDist, camOffset.y * camDist, z + camOffset.z * camDist);
  camera.lookAt(x, voidling.radius * 0.5, z);
  camera.updateMatrixWorld();
};
// QA: one call returns the whole race — used to log score curves over a match
_dbg.__matchState = () => ({
  // QA: the crowd's mood driver, so a harness can measure how long LANTERN
  // NIGHT's three acts actually last in wall-clock instead of inferring them
  // from the radius curve.
  tense: tension(),
  graze: rivals.grazeCount(),
  band: rivals.bandStat(),   // QA: is the lane multiplier pinned at its clamp?
  t: started ? matchElapsed() : 0, clock: matchClock, score: playerScore, r: voidling.radius, ev: rivalEv,
  ate: { you: devPlayerPct, family: devFamilyPct },
  rivals: rivals.list.map((r) => ({ name: r.name, score: r.score, r: r.r, x: r.x, z: r.z,
    joined: !!r.joined, arch: r.arch ?? '', hunt: !!r.hunting,
    lane: r.lane ?? -1, dry: Math.round((r.dry ?? 0) * 10) / 10, full: !!r.full })),
});
// build stamp: tiny, menu-only — every screenshot identifies its build
//
// DEV AND QA ONLY. Its whole purpose is telling one internal screenshot from
// another, and it does that job in dev; on a shipped build it is a version
// string sitting in the corner of the App Store's first screenshot, which
// reads as an unfinished app to the one reviewer whose opinion decides
// whether anyone else ever sees it. `?stamp` brings it back on any build, so
// the store shooter can still identify what it photographed when it needs to.
// (reads the query string directly rather than through _qd, which is declared
// 550 lines below this and would be a temporal dead zone from here)
if (import.meta.env.DEV || new URLSearchParams(location.search).has('stamp')) {
  const bs = document.createElement('div');
  // a missing `define` would take out every statement after this line — the
  // input handlers, the PLAY listener, beginMatch, the lot — and do it
  // silently. A build stamp is not worth that risk.
  bs.textContent = `v ${typeof __BUILD__ === 'undefined' ? 'dev' : __BUILD__}`;
  bs.style.cssText = 'position:fixed;right:8px;bottom:calc(4px + env(safe-area-inset-bottom, 0px));z-index:11;font-size:9px;font-weight:700;letter-spacing:1px;color:rgba(203,178,255,0.5);pointer-events:none;';
  document.body.appendChild(bs);
  // …and NOT on the shop or the worlds screen. body.menu is still set inside
  // those overlays, so a build stamp shipped on two player-facing screens.
  // 'topvoids' was missing, so the dev build stamp painted over the TOP VOIDS
// board — on a screen whose whole job is to look like a real leaderboard. The
// comment two lines up already said "and NOT on the shop or the worlds screen":
// a fix that missed a case. 'pause' and 'policy' are new and belong here too.
const OVERLAYS = ['worlds', 'shop', 'daily', 'tut', 'settings', 'trophies', 'skinPrev',
  'topvoids', 'pause', 'policy', 'gate'];
  const vis = () => {
    const overlaid = OVERLAYS.some((id) => document.getElementById(id)?.classList.contains('show'));
    bs.style.display = document.body.classList.contains('menu') && !overlaid ? 'block' : 'none';
    // …and the same signal drives the quest board, which is menu furniture now:
    // it must not sit on top of the shop, the world picker or the settings sheet
    document.body.classList.toggle('ovl', overlaid);
  };
  const mo = new MutationObserver(vis);
  mo.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  for (const id of OVERLAYS) {
    const n = document.getElementById(id);
    if (n) mo.observe(n, { attributes: true, attributeFilter: ['class'] });
  }
  vis();
}
const bubbles = createBubbles(camera);
const life = createLife(scene, addEdible, island.biomeAt, bubbles.say);
// QA: the crowd gate. `life` is exposed so qa/crowdgate.mjs can time
// life.update() directly with the gate on and off, isolating the crowd from
// the renderer and the sim — the only way to get a number out of a software-GL
// harness that is not mostly noise. __crowdGate is what the game is using this
// frame. ASSIGNED HERE, not up with the other hooks: `life` is a const
// declared on this line, so touching it from the hook block 120 lines above is
// a temporal dead zone and the module fails to initialise.
// QA: THE HAT CONTACT SHEET. A hat rides the hero, so it is the closest and
// largest thing on screen — hundreds of pixels at WORLD ENDER, not the forty a
// background prop gets. It cannot be signed off from source or from a triangle
// count; it has to be LOOKED at, at size, from the angles the play camera
// actually uses. This renders each hat on a real void body with the real light
// rig into one strip per hat, and reports the closest approach of its geometry
// to the origin so the 1.22 jelly-clearance rule is a number rather than a
// hope. See qa/hatsheet.mjs.
_dbg.__hatSheet = async (ids: string[]) => {
  const { HATS } = await import('./proto3d/hats');
  const { buildHat } = await import('./proto3d/hatgeo');
  const { makeVoidBody, applySkinToBody } = await import('./proto3d/void3d');
  const want = ids && ids.length ? HATS.filter((h) => ids.includes(h.id)) : HATS;
  const S = 420, N = 3;                       // three angles per hat
  const sc = new THREE.Scene();
  sc.background = new THREE.Color(0x1a1030);
  sc.environment = scene.environment;
  sc.environmentIntensity = 0.35;             // a shade brighter than play: this is a shop light
  const key = new THREE.DirectionalLight(0xfff2d8, 2.6); key.position.set(-3, 5, 4); sc.add(key);
  const rim = new THREE.DirectionalLight(0x9fc8ff, 1.1); rim.position.set(4, 2, -4); sc.add(rim);
  sc.add(new THREE.HemisphereLight(0xdfeaff, 0x4a4468, 0.5));
  const bodyMat = makeVoidBody();
  applySkinToBody(bodyMat, SKINS[0]);
  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 36), bodyMat);
  sc.add(body);
  const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  // …and a census of everything in the WHOLE SCENE that will actually draw.
  // Three earlier versions of this were wrong, each differently: one walked
  // only v.group, and createVoid adds its contact shadow straight to the SCENE
  // (void3d.ts:431); one tested o.visible, which is the object's OWN flag, so
  // a child of a hidden group still reported true; and one ran BEFORE update(),
  // which is where every sprite and ring gets its scale — so it reported an
  // empty frame while the render came back with a grey ellipse through the
  // character's waist. Walk the parent chain, and take the census after the
  // pose has settled.
  const drawn = (o: THREE.Object3D): boolean => {
    for (let n: THREE.Object3D | null = o; n; n = n.parent) if (!n.visible) return false;
    return true;
  };
  const census = (): string[] => {
    const q: string[] = [];
    sc.traverse((o) => {
      const g2 = (o as THREE.Mesh).geometry;
      if (!g2 || !drawn(o)) return;
      g2.computeBoundingSphere();
      const r2 = (g2.boundingSphere?.radius ?? 0) * Math.max(o.scale.x, o.scale.y, o.scale.z);
      if (r2 > 1.3) q.push(`${o.name || o.type}:${g2.type} r=${r2.toFixed(2)} y=${o.position.y.toFixed(2)} parent=${o.parent?.name || o.parent?.type || 'scene'}`);
    });
    return q;
  };
  /** How open the lid is, 0..1: sclera.scale.y is the lid value times the
   *  mood's width, and scale.x is that width alone (void3d.ts:1402). */
  const lidOpen = (g: THREE.Object3D): number => {
    const sc2 = g.getObjectByName('sclera');
    return sc2 && sc2.scale.x > 0 ? sc2.scale.y / sc2.scale.x : 1;
  };
  const rt = new THREE.WebGLRenderTarget(S, S);
  rt.texture.colorSpace = THREE.SRGBColorSpace;
  const cv = document.createElement('canvas'); cv.width = S * N; cv.height = S;
  const ctx = cv.getContext('2d')!;
  const out: unknown[] = [];
  for (const h of want) {
    const g = buildHat(h.id);
    g.position.y = h.drop ?? 0;   // render what SHIPS, not what was authored
    sc.add(g);
    let meshes = 0, tris = 0, closest = 1e9, top = 0, wide = 0;
    const graze: string[] = [];
    g.updateWorldMatrix(true, true);
    const _v = new THREE.Vector3();
    g.traverse((o) => {
      const geo = (o as THREE.Mesh).geometry;
      if (!geo) return;
      const pos = geo.getAttribute('position');
      if (!pos) return;
      meshes++;
      tris += (geo.index ? geo.index.count : pos.count) / 3;
      // PER VERTEX, not per bounding sphere. A flat torus lying on the skull
      // has a bounding sphere whose centre-minus-radius is far inside the
      // body while every actual vertex clears it — the first version of this
      // reported the party hat's frill at 0.45 and the frill was fine at 1.06.
      // Conservative is the wrong kind of wrong for a rule that decides
      // whether geometry gets rebuilt.
      //
      // …AND PER MESH, which the first version was not. It took ONE min over
      // the whole hat, so a single deliberately-buried part — a chinstrap, a
      // horn root — set `closest` under 0.85 and passed the entire hat,
      // floating brim and all. The chef read 1.14 and rendered as a flying
      // saucer; the horn read 1.02 with a mane hanging off the back in mid
      // air. A hat is only as good as its worst PART.
      let lo = 1e9, hi = 0;
      for (let i = 0; i < pos.count; i++) {
        _v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
        const d = _v.length();
        if (d < lo) lo = d;
        if (d > hi) hi = d;
        if (_v.y > top) top = _v.y;
        const rr = Math.hypot(_v.x, _v.z);
        if (rr > wide) wide = rr;
      }
      if (lo < closest) closest = lo;
      // Three ways to be right, and only three:
      //   CLEAR  — every vertex outside the jelly's reach (>= 1.14)
      //   BURIED — every vertex inside the skull (<= 0.85), e.g. a strap
      //   ROOTED — it CROSSES, steeply: in past 0.85 and out past 1.14. A horn
      //            or an ear grows through the surface, and the churn only
      //            ever moves the waterline over a part that is deep on both
      //            sides of it.
      // Anything else GRAZES: it hovers just off the skin or barely dips in,
      // and the body's swell will swallow and spit it out every frame.
      const ok = lo >= 1.14 || hi <= 0.85 || (lo <= 0.85 && hi >= 1.14);
      if (!ok) graze.push(`${o.name || geo.type}#${meshes} ${lo.toFixed(2)}..${hi.toFixed(2)}`);
    });
    // FRAME TO FIT. A fixed camera cropped the pompom off the first hat it
    // rendered, which is exactly the detail these sheets exist to judge.
    const hi = Math.max(top, 1.6), mid = (hi - 1.05) / 2;
    const span = Math.max(hi + 1.05, wide * 2.2);
    const dist = span / (2 * Math.tan((30 * Math.PI) / 360)) * 1.12;
    for (let i = 0; i < N; i++) {
      // 0 deg is the face; 35 and 70 are the 3/4 views the play camera lives at
      const a = (i * 35 * Math.PI) / 180;
      cam.position.set(Math.sin(a) * dist, mid + 0.35, Math.cos(a) * dist);
      cam.lookAt(0, mid, 0);
      renderer.setRenderTarget(rt);
      renderer.render(sc, cam);
      const buf = new Uint8Array(S * S * 4);
      renderer.readRenderTargetPixels(rt, 0, 0, S, S, buf);
      renderer.setRenderTarget(null);
      const img = ctx.createImageData(S, S);
      for (let y = 0; y < S; y++) img.data.set(buf.subarray((S - 1 - y) * S * 4, (S - y) * S * 4), y * S * 4);
      ctx.putImageData(img, i * S, 0);
    }
    sc.remove(g);
    out.push({ id: h.id, meshes, tris: Math.round(tris), closest, top, wide, graze,
      png: cv.toDataURL('image/png').split(',')[1] });
  }
  return out;
};
// ── EVERY VOID, AS THE SHOP WOULD RENDER IT ────────────────────────────────
// The hats tab renders its cards; the voids tab paints a CSS gradient with an
// SVG face and, for five of them, a CDN photo cropped to a circle. Toxic,
// Magma, Circuit, Candy and Honey render as a swatch of aurora / lava / PCB /
// candy / honeycomb with no face and no character at all.
//
// This is the spike that says whether the fix is possible: it builds a SECOND
// full voidling — body shader, face rig, character eyes, aura, pattern and
// accessory — offscreen, and photographs each skin on it. If this works the
// void cards can be the real thing, the way the hat cards already are.
//
// ONE voidling, reused. setSkin hides every accessory and every body part
// before showing the right one (void3d.ts:1093, :1127) and everything else it
// touches is a uniform, so a single rig can wear all thirteen in turn. Thirteen
// separate rigs would be thirteen SphereGeometry(1, 96, 72) bodies.
//
//   node qa/voidsheet.mjs [ids] [port]
/** Read uTexAmt straight off the body material — the one number that says
 *  whether the skin's texture actually arrived, rather than whether it was
 *  asked for. */
function bodyTexAmt(g: THREE.Object3D): number {
  let amt = -1;
  g.traverse((o) => {
    const m = (o as THREE.Mesh).material as THREE.ShaderMaterial | undefined;
    if (amt < 0 && m && m.uniforms && m.uniforms.uTexAmt) amt = m.uniforms.uTexAmt.value as number;
  });
  return amt;
}
// ── TWO VOIDS, ONE TEXTURE ────────────────────────────────────────────────
// The exact shape of the bug the shop's card renderer exposed. void3d caches
// skin textures in a module-level map and TextureLoader fires exactly ONE
// callback — so before the fix, the SECOND void to ask for a texture that was
// already in flight got a cache hit on a Texture with no image yet, read
// uTexAmt 0, and was never told the load finished.
//
// With one void in the world that was unreachable. The shop is a second void
// that warms the cache from the menu, so the shop could win the race and leave
// the HERO on a flat gradient for a whole match — a child spends 1,000 coins on
// Honey and plays a brown ball.
//
// A = the shop's rig, B = a fresh stand-in for the hero. Both must reach 1.
//   node qa/texrace.mjs [port]
_dbg.__texRace = async (skinId: string) => {
  const { createVoid } = await import('./proto3d/void3d');
  const sk = SKINS.find((x) => x.id === skinId);
  if (!sk?.tex) return { error: `no textured skin "${skinId}"` };
  const mk = () => {
    const sc2 = new THREE.Scene();
    const cm = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    return { rig: createVoid(sc2, cm), sc2 };
  };
  const a = mk(), b = mk();
  // A asks first and starts the fetch; B asks in the SAME tick and gets a cache
  // hit on a Texture whose image has not arrived. That is the race.
  a.rig.setSkin(sk);
  b.rig.setSkin(sk);
  const t0 = bodyTexAmt(a.rig.group), t1 = bodyTexAmt(b.rig.group);
  await new Promise((r) => setTimeout(r, 4000));
  const out = {
    skin: skinId, url: sk.tex,
    beforeA: t0, beforeB: t1,
    afterA: bodyTexAmt(a.rig.group), afterB: bodyTexAmt(b.rig.group),
  };
  a.sc2.remove(a.rig.group); b.sc2.remove(b.rig.group);
  return out;
};
/** WCAG relative luminance, so "can you see it" is a number and not a view. */
function relLum(hex: number): number {
  const f = (c: number) => { const u = c / 255; return u <= 0.04045 ? u / 12.92 : ((u + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f((hex >> 16) & 255) + 0.7152 * f((hex >> 8) & 255) + 0.0722 * f(hex & 255);
}
function contrast(a: number, b: number): number {
  const la = relLum(a), lb = relLum(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
/** The smile's legibility on a skin, by whichever of its two routes it takes.
 *  Must match setSkin in void3d.ts: light candy mouth on a dark body, near-black
 *  on a light one, chosen by whichever measures higher. (This used to model a
 *  white plate behind the lip; the owner rejected that on sight — "the white
 *  part I'm not a fan of, it looks cheap" — so both routes are warm now.) */
function smileContrast(sk: Skin): number {
  const LIGHT = 0xff6f91, DARK = 0x24050f;    // must match void3d's MOUTH_*
  return Math.max(contrast(LIGHT, sk.mid), contrast(DARK, sk.mid));
}
_dbg.__voidSheet = async (ids: string[]) => {
  const { createVoid } = await import('./proto3d/void3d');
  const want = ids && ids.length ? SKINS.filter((s) => ids.includes(s.id)) : SKINS;
  const S = 420, N = 2;
  const sc = new THREE.Scene();
  sc.background = new THREE.Color(0x150c2a);
  sc.environment = scene.environment;
  sc.environmentIntensity = 0.4;
  const key = new THREE.DirectionalLight(0xfff2d8, 2.4); key.position.set(-3, 5, 4); sc.add(key);
  const rim = new THREE.DirectionalLight(0x9fc8ff, 1.0); rim.position.set(4, 2, -4); sc.add(rim);
  sc.add(new THREE.HemisphereLight(0xdfeaff, 0x4a4468, 0.5));
  const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  // createVoid billboards the face with camera.quaternion and yaws the costume
  // to face the camera (void3d.ts:1275, :1278), so it has to be built against
  // THIS camera — handing it the game's own would point every face off-screen.
  const v = createVoid(sc, cam);
  v.setRadius(1);
  v.setMood('cruise');

  // ── A PORTRAIT HAS NO FLOOR ─────────────────────────────────────────────
  // createVoid ships a contact shadow and an evolution ring, both there to
  // plant the hero on a street. On a card they render as a grey ellipse under
  // the character like a saucer — the exact read the hat rebuild spent a week
  // removing. Hidden BY NAME: an earlier pass guessed at "flat CircleGeometry
  // or RingGeometry" and missed the ring, which is a torus tilted 0.5 rather
  // than a circle laid flat, and then missed the LIP — the bright ring that
  // says "hole" rather than "ball" — which is parented to the scene and is not
  // in the void's group at all. void3d names all three now.
  // DETACHED, not hidden. update() recomputes `lip.visible` from its own
  // opacity on every single frame (void3d.ts:1492), so setting visible=false
  // survives exactly until the next update — which is why the census kept
  // reporting a ring that had just been switched off. Taking the three out of
  // the graph is the only thing that holds; update() goes on writing their
  // transforms to orphans, which costs nothing and draws nothing.
  const hid: string[] = [], missed: string[] = [];
  // 'lip' — the hero's ground annulus — was deleted outright, see void3d.ts.
  for (const n of ['contact', 'rings']) {
    const o = (v.group.getObjectByName(n) ?? sc.getObjectByName(n));
    if (o) { o.removeFromParent(); hid.push(n); } else missed.push(n);
  }

  // ── AND A CENSUS TO PROVE IT ────────────────────────────────────────────
  // Three earlier versions of this check were wrong, each differently: one
  // walked only v.group, and the contact shadow is added straight to the SCENE
  // (void3d.ts:431); one tested o.visible, which is the object's OWN flag, so a
  // child of a hidden group still reported true; and one ran BEFORE update(),
  // which is where every sprite and ring takes its scale — it reported an empty
  // frame while the render came back with an ellipse through the character's
  // waist. Walk the parent chain, and count after the pose has settled.
  const drawn = (o: THREE.Object3D): boolean => {
    for (let n: THREE.Object3D | null = o; n; n = n.parent) if (!n.visible) return false;
    return true;
  };
  const census = (): string[] => {
    const q: string[] = [];
    sc.traverse((o) => {
      const g2 = (o as THREE.Mesh).geometry;
      if (!g2 || !drawn(o)) return;
      g2.computeBoundingSphere();
      const r2 = (g2.boundingSphere?.radius ?? 0) * Math.max(o.scale.x, o.scale.y, o.scale.z);
      if (r2 > 1.3) {
        q.push(`${o.name || o.type}:${g2.type} r=${r2.toFixed(2)} y=${o.position.y.toFixed(2)}`
          + ` parent=${o.parent?.name || o.parent?.type || 'scene'}`);
      }
    });
    return q;
  };

  /** How open the lid is, 0..1: sclera.scale.y is the lid value times the
   *  mood's width, and scale.x is that width alone (void3d.ts:1402). */
  const lidOpen = (g: THREE.Object3D): number => {
    const sc2 = g.getObjectByName('sclera');
    return sc2 && sc2.scale.x > 0 ? sc2.scale.y / sc2.scale.x : 1;
  };
  const rt = new THREE.WebGLRenderTarget(S, S);
  rt.texture.colorSpace = THREE.SRGBColorSpace;
  const cv = document.createElement('canvas'); cv.width = S * N; cv.height = S;
  const ctx = cv.getContext('2d')!;
  const out: unknown[] = [];
  for (const sk of want) {
    v.setSkin(sk);
    // settle the springs: radius, breathe and the mood blend are all damped, so
    // one frame renders a half-formed pose
    for (let i = 0; i < 40; i++) {
      v.update(1 / 60, { t: 6.2 + i / 60, x: 0, z: 0, vx: 0, vz: 0, lookX: 0, lookY: 0.06 });
    }
    // ── AND WAIT FOR THE EYES ────────────────────────────────────────────
    // blinkT is a free-running clock on the rig (void3d.ts:1018) and this
    // renderer reuses ONE rig for all thirteen skins, so the blink phase drifts
    // by 0.68s per skin — Candy came out of the first full run with its eyes
    // shut. A blink is 0.16s, and blinkT resets to at least 3.4s afterwards, so
    // stepping until the lid is open always terminates well inside this bound.
    for (let i = 0; i < 90 && lidOpen(v.group) < 0.98; i++) {
      v.update(1 / 60, { t: 7 + i / 60, x: 0, z: 0, vx: 0, vz: 0, lookX: 0, lookY: 0.06 });
    }
    for (let i = 0; i < N; i++) {
      // FRAME THE WHOLE CHARACTER. The body's top is at ~1.9 and the unicorn
      // horn reaches 2.3, so aiming at y=0.15 — the middle of a bare orb —
      // pushed every accessory out through the top of the frame.
      const a = (i * 32 * Math.PI) / 180;
      const d = 6.0;
      cam.position.set(Math.sin(a) * d, 1.45, Math.cos(a) * d);
      cam.lookAt(0, 1.05, 0);
      // one more update AFTER the camera moves: the face billboard and the
      // costume yaw are both read off the camera inside update()
      v.update(1 / 60, { t: 7, x: 0, z: 0, vx: 0, vz: 0, lookX: 0, lookY: 0.06 });
      renderer.setRenderTarget(rt);
      renderer.render(sc, cam);
      const buf = new Uint8Array(S * S * 4);
      renderer.readRenderTargetPixels(rt, 0, 0, S, S, buf);
      renderer.setRenderTarget(null);
      const img = ctx.createImageData(S, S);
      for (let y = 0; y < S; y++) img.data.set(buf.subarray((S - 1 - y) * S * 4, (S - y) * S * 4), y * S * 4);
      ctx.putImageData(img, i * S, 0);
    }
    out.push({
      id: sk.id, name: sk.name, tier: sk.cash ? 'legendary' : sk.streak ? 'streak' : 'coins',
      acc: sk.acc ?? null, pattern: sk.char?.pattern ?? null,
      // DID THE TEXTURE ACTUALLY ARRIVE? uTexAmt only flips to 1 in the
      // TextureLoader onLoad callback (void3d.ts:1135). A card rendered before
      // that lands advertises the wrong orb for ever, because the thumbnail is
      // cached. In this sandbox the CDN 403s, so this reads 0 for every
      // textured skin — which is exactly the failure mode to design around,
      // not a sandbox artefact to wave away.
      wantsTex: !!sk.tex, texAmt: bodyTexAmt(v.group), lid: lidOpen(v.group),
      // CAN YOU SEE THE SMILE? VOID.mouth is one fixed plum for every skin, so
      // a new palette entry can silently make the mouth vanish — it already had,
      // on six of eight sampled skins, worst of all on the DEFAULT one. The
      // smile reads by one of two routes: the lip contrasts with the body, or
      // the highlight does and the lip contrasts with the highlight.
      smile: smileContrast(sk),
      hid, missed, stray: census(),
      png: cv.toDataURL('image/png').split(',')[1],
    });
  }
  sc.remove(v.group);
  return out;
};
_dbg.__life = life;
_dbg.__moverStats = (gate: number) => life.moverStats(gate);
// 3-5 family members per match, randomly cast — you never know who's coming
// FIELD SIZE IS NOT THE LEVER — attempt seven, retracted. Cutting 3-5 rivals to
// a flat 3 measured 53.5% of lane (sd 16.2) against 62.2% (sd 9.2) for the same
// build with the full field: no better, and the spread nearly DOUBLED, because
// with three rivals the leader depends far more on which single one gets lucky.
// The older comment in rivals.ts about 3/4/5 rivals is about the ratio between
// the player and the top rival, not about whether the race is winnable, and I
// read it as support for a change it does not support.
const rivals = createRivals(scene, camera, edibles, island.biomeAt, 3 + Math.floor(Math.random() * 3));
const fx = createFx(scene);
const FAMILY_TITLE: Record<string, string> = {
  WOBBLES: 'Cousin', GLITZ: 'Uncle', BITSY: 'Baby', CHOMPZILLA: 'Auntie', DOZER: 'Grandpa',
};
// each family member's ARCHETYPE, named on arrival — a kid should be told what
// to watch for once, then be able to read it off the screen forever after
const ARCH_TAG: Record<string, string> = {
  BULLY: '⚡ she CHASES you', COWARD: '😱 runs from everything',
  SHOWOFF: '✨ only eats big stuff', COPYCAT: '👣 copies your route',
  // …no longer "camps one spot": the camp was deleted when it turned out to be
  // what was pinning him (rivals.ts records the five attempts). A join banner
  // that teaches a behaviour the code does not implement is worse than no
  // banner — the child watches for it and it never happens.
  HOARDER: '😴 slow and steady',
};
rivals.onJoin = (name, color, x, z, arch) => {
  announceJoin(name, color, FAMILY_TITLE[name] ?? 'Cousin', (ARCH_TAG[arch] ?? '').replace(/^\S+\s*/, ''));
  fx.ring(x, z, color, 22, 0.8);
  audio.alert();
};
// the family SPEAKS — personality bubbles over rival voids
const rivalBubblePos = new THREE.Vector3();
rivals.onSpeak = (x, z, line) => {
  bubbles.say(rivalBubblePos.set(x, 5, z), line, 'event');
};
// hole-vs-hole danger: rivals are PLAYERS now, not decoration
rivals.onRivalEaten = (name, pts, rx, rz, rr, marquee) => {
  rivalEv.eaten++; if (marquee) rivalEv.marquee++;
  // THE FEAST. This is the only thing in the game that lifts the growth law,
  // so the size a child ends on finally reflects a decision they made rather
  // than how long the clock ran. Scaled by the meal: eating the chaser, who is
  // the biggest thing on the island, is worth more than eating a straggler.
  feastR += FEAST_PER_RIVAL * (marquee ? 1.6 : 1) * THREE.MathUtils.clamp(rr / 6, 0.55, 1.5);
  smugUntil = tClock + 2.4; audio.voice('happy');
  // no breakingNews here: announceFam already puts a full-screen card up for
  // this, and a ticker headline three seconds later is the same news twice
  playerScore += pts;
  addCoins(15);
  questEvent('rival');
  stats.rivals = (stats.rivals ?? 0) + 1; saveStats();
  track('ate_rival', { name, pts: Math.round(pts), marquee: !!marquee, sec: elapsed() });
  // the stuffed hunter is the MARQUEE meal: it hands back everything she bit
  // off you plus half her score, so it has to land like the ending it is
  announceHtml(marquee
    ? `<div class="bCard"><span class="bIco">🏆</span><span class="bTx">You beat the chaser!<span class="bSub">${name} is out</span></span><span class="bMul">+${pts}</span></div>`
    : `<div class="bCard"><span class="bIco">🍽️</span><span class="bTx">You ate ${esc(name)}!<span class="bSub">${esc(FAMILY_TITLE[name] ?? 'a rival')} is out</span></span><span class="bMul">+${pts}</span></div>`);
  if (marquee) { breakingNews(COPY.rivalGoneNews); addCoins(35); }
  // real PAYOFF: the rival spirals in (rivals.ts), the void gapes wide, and a
  // shockwave stack fires at BOTH ends of the meal — the marquee play LANDS
  voidling.animGulp();
  fx.ring(rx, rz, 0xffffff, rr * 5 + 8, 0.8);        // where the family member was…
  fx.ring(rx, rz, 0xffe08a, rr * 3.4 + 6, 0.65);
  fx.ring(voidState.x, voidState.z, 0xffffff, voidling.radius * 4.2, 0.9);   // …and where it went
  fx.ring(voidState.x, voidState.z, 0xb875ff, voidling.radius * 3, 0.7);
  fx.shake(9); fx.flash('rgba(255,224,138,0.4)', 0.3); fx.flash('rgba(184,117,255,0.35)', 0.6);
  floatPos.set(rx, rr + 5, rz);
  bubbles.float(floatPos, `${FAMILY_TITLE[name] ?? ''} ${name} DEVOURED! +${pts}`, true);
  audio.bigEat();
  buzz(80);
};
// ── the void's EMOTIONS: game state resolves to a mood every frame ──────────
let hungryT = -99, hurtUntil = 0, smugUntil = 0, prevMood: Mood = 'cruise';
let biteMercy = 0;   // global mercy: two big rivals overlapping must not chain-bite
rivals.onPlayerBitten = (name, hit) => {
  if (tClock < biteMercy) return;
  // MERCY FRAMES. Longer after the hunter connects, so a caught player gets a
  // clear, visible moment to drive away instead of being chain-bitten.
  biteMercy = tClock + (hit.hunter ? 3.2 : 2.5);
  rivalEv.bites++; if (hit.hunter) rivalEv.hunterBites++; rivalEv.stolen += hit.steal;
  hurtUntil = tClock + (hit.hunter ? 1.3 : 0.9); audio.voice('hurt');
  // THE COST. The old flat 12% shrink was silently refunded by the score floor
  // (which is a pure function of playerScore) inside a frame or two — measured
  // matches showed the radius back where it started before the flash had even
  // faded, so being caught was free. The hunter's bite now takes SCORE too,
  // which the floor cannot hand back, and she banks it: every point she takes
  // is a point you win back by eating her later.
  // A LEVEL. Not a percentage. A 15% shrink is a number the player cannot see
  // and the growth law hands most of it back within seconds; being eaten should
  // cost the thing the whole game is about. The hunter's connecting bite drops
  // you to the bottom of the form you are in — one rung down the ladder, with
  // the form name on the HUD changing to prove it — and the shallow nibble
  // keeps its percentage. START_R is the floor: a VOIDLING cannot go lower.
  if (hit.hunter) {
    const st = stageFor(voidling.radius);
    const down = Math.max(START_R, (FORM_MIN[Math.max(0, st - 1)] || START_R) * 1.02);
    voidling.setRadius(Math.max(START_R, Math.min(voidling.radius * hit.shrink, down)));
    if (st > 0) {
      curStage = stageFor(voidling.radius);
      voidling.setStage(VISUAL_STAGE[curStage] ?? 0);
      audio.setMusicStage(VISUAL_STAGE[curStage] ?? 0);
    }
  } else {
    voidling.setRadius(Math.max(START_R, voidling.radius * hit.shrink));
  }
  if (hit.steal > 0) {
    playerScore = Math.max(0, playerScore - hit.steal);
    floatPos.set(voidState.x, voidling.radius + 4, voidState.z);
    bubbles.float(floatPos, `-${hit.steal} STOLEN!`, true);
  }
  // NO BANNER. Being hit already reads without words: the screen flashes, the
  // camera kicks, the void shrinks and a float rises off it. A full-width
  // announcement on top of that is the third telling of the same event, and
  // over a match it is the single biggest source of HUD clutter.
  floatPos.set(voidState.x, voidling.radius + 5, voidState.z);
  bubbles.float(floatPos, hit.hunter ? 'BONK!! 💫' : 'OOF!! 💫', true);
  audio.hit(); fx.flash('rgba(154,92,255,0.3)', 0.4);
  if (hit.hunter) { fx.shake(11); fx.flash('rgba(255,43,60,0.4)', 0.5); }
  buzz(hit.hunter ? 90 : 50);
  track(hit.hunter ? 'caught' : 'nibbled', {
    name, sec: elapsed(), form: curStage, stolen: Math.round(hit.steal),
  });
};
// ── THE THREAT'S THREE BEATS ────────────────────────────────────────────────
// A charge that is telegraphed, a miss that is celebrated, and the moment the
// predator becomes the prize. Near-misses are the thing a seven-year-old
// retells, so the whiff gets more spectacle than the hit.
rivals.onCharge = (name, x, z) => {
  rivalEv.charges++;
  // The telegraph belongs IN THE WORLD, not across the HUD. A red ring under
  // her, a red pulse on the screen edge, an alert sting and a rumble say
  // "something is coming at you" without a banner — and the banner was firing
  // often enough to read as the game shouting the same sentence all match.
  fx.ring(x, z, 0xff2b3c, 26, 0.6); fx.flash('rgba(255,43,60,0.16)', 0.35);
  audio.alert(); audio.voice('scared'); buzz(35);
};
rivals.onNearMiss = (name, x, z) => {
  rivalEv.nearMiss++;
  floatPos.set(voidState.x, voidling.radius + 5, voidState.z);
  bubbles.float(floatPos, 'NEAR MISS!! 😤', true);
  fx.ring(x, z, 0xffffff, 30, 0.5); fx.ring(voidState.x, voidState.z, 0x7ef2a0, voidling.radius * 4, 0.55);
  fx.shake(6); fx.flash('rgba(126,242,160,0.22)', 0.3);
  audio.ready(); buzz(45);
  addCoins(5);   // dodging is a SKILL — pay it
};
rivals.onStuffed = (name) => {
  announceHtml(`<div class="bCard"><span class="bIco">🍰</span><span class="bTx">${esc(name)} is too full<span class="bSub">now is your chance</span></span></div>`);
  breakingNews(COPY.rivalFullNews);
  audio.ready();
};
const audio = createAudio();
// QA: drive the score's stage directly, so a harness can audit each world's
// arrangement at every rung without playing four matches to reach them
(window as unknown as { __audio: typeof audio }).__audio = audio;
if (TOPDOWN) scene.fog = null;   // debug: see the whole island unfogged

// soft round sprite for absorb puffs (avoids hard square points)
const puffTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d')!;
  const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(200,170,255,0.8)'); gr.addColorStop(1, 'rgba(180,136,255,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
})();

// ── the void ──────────────────────────────────────────────────────────────────
const voidling = createVoid(scene, camera);
voidling.setRadius(0.9);   // start tiny — a speck that can barely eat a cone
const voidState = { x: island.spawn.x, z: island.spawn.z };
// debug: jump the void to an event block (?at=plaza|golf|beach|camp)
{
  const at = new URLSearchParams(location.search).get('at');
  // MAPLE FALLS districts — swept from the live biome map, not guessed. The old
  // table still named zoo / military / airport / fancy, none of which exist any
  // more, so half the debug spots teleported into a district that had been
  // deleted.
  const spots: Record<string, [number, number]> = {
    square: [41, -43], plaza: [41, -43], mainst: [-15, 13], downtown: [-15, 13],
    burb: [-75, 78], cozy: [-75, 78], fair: [-124, -126], farm: [95, -158],
    campus: [175, 83], school: [175, 83], strip: [-214, 38], park: [175, -42],
    forest: [-15, -219], woods: [-15, -219], lake: [-12, 219], beach: [-12, 219],
    // PIRATE BAY districts — real region centroids, not Maple grid blocks
    port: [71, -146], oldtown: [-5.8, -185], resort: [141.4, -28.6], party: [71, 224.4],
    market: [-21, -70], jungle: [-114.3, -51.4], cove: [-181, 18], sunset: [-103.6, 145.6],
    bay: [45, 75],   // debug: drop INTO the bay to exercise the water-escape
    axis: [151, -16], marina: [131, -24], stage: [70, 219] };
  if (at && spots[at]) { voidState.x = spots[at][0]; voidState.z = spots[at][1]; }
}

// absorb puffs
const PUFF = 120;
const puffGeo = new THREE.BufferGeometry();
const puffPos = new Float32Array(PUFF * 3);
puffGeo.setAttribute('position', new THREE.BufferAttribute(puffPos, 3));
// ── THE EAT IS THE VERB, AND IT WAS THREE PURPLE DOTS ─────────────────────
// Every absorb in the game spat the same 0x9a6ae0 whatever it had just
// swallowed, so eating a red postbox and eating a green hedge produced
// identical feedback on the one action the entire game is built around. The
// colour is per-particle now and comes from the prop's own vertex colours, so
// the burst is made of the thing that just went in.
const puffCol = new Float32Array(PUFF * 3);
puffCol.fill(0.6);
puffGeo.setAttribute('color', new THREE.BufferAttribute(puffCol, 3));
const puffPoints = new THREE.Points(puffGeo, new THREE.PointsMaterial({ vertexColors: true, size: 2.1, map: puffTex, transparent: true, opacity: 0.78, blending: THREE.AdditiveBlending, depthWrite: false }));
puffPoints.frustumCulled = false; scene.add(puffPoints);

// ── ONE DRAW CALL FOR EVERY SHADOW ON THE ISLAND ────────────────────────────
// contactShadow() already shares a single CircleGeometry and a single
// MeshBasicMaterial across every prop that uses it — 2,682 meshes on Maple
// (a quarter of the whole scene) and 1,570 on Pirate, all of them the same
// buffer with the same material, each costing its own draw call. That is an
// InstancedMesh that nobody had written yet.
//
// The static props never move, so the matrices are written ONCE at bake and
// then only touched when something is eaten (scale to zero) or the match
// resets. Movers keep their own disc: they need a matrix every frame and
// there are only a few dozen of them.
const SH_CAP = 4096;
let shMesh: THREE.InstancedMesh | null = null;
let shCount = 0;
const _shM = new THREE.Matrix4();
const _shZero = new THREE.Matrix4().makeScale(0, 0, 0);
function setShadowInstance(idx: number, on: boolean, x = 0, z = 0, s = 1): void {
  if (!shMesh || idx < 0) return;
  shMesh.setMatrixAt(idx, on ? _shM.makeScale(s, 1, s).setPosition(x, 0.045, z) : _shZero);
  shMesh.instanceMatrix.needsUpdate = true;
}
/** Harvest every tagged disc off the STATIC props into one instanced mesh.
 *  Idempotent and re-runnable: GLB props stream in for a while after boot, so
 *  this is called again once they have landed. */
function bakeContactShadows(): void {
  for (const e of edibles) {
    const ud = e.mesh.userData as Record<string, unknown>;
    if (ud.mover) continue;
    if (ud.shIdx !== undefined) {
      // already harvested — but validateWorld nudges props off roads between
      // sweeps, so refresh the matrix rather than leaving the disc behind
      if (!e.eaten && e.mesh.visible) {
        setShadowInstance(ud.shIdx as number, true, e.mesh.position.x, e.mesh.position.z, (ud.shScale as number) ?? 1);
      }
      continue;
    }
    const disc = e.mesh.children.find((c) => c.userData.cshadow) as THREE.Mesh | undefined;
    if (!disc) continue;
    if (shCount >= SH_CAP) return;
    if (!shMesh) {
      shMesh = new THREE.InstancedMesh(disc.geometry, disc.material as THREE.Material, SH_CAP);
      shMesh.frustumCulled = false;
      shMesh.renderOrder = -1;
      shMesh.count = SH_CAP;
      for (let i = 0; i < SH_CAP; i++) shMesh.setMatrixAt(i, _shZero);
      scene.add(shMesh);
    }
    e.mesh.remove(disc);
    const idx = shCount++;
    ud.shIdx = idx;
    ud.shScale = disc.scale.x;
    setShadowInstance(idx, true, e.mesh.position.x, e.mesh.position.z, disc.scale.x);
  }
}

// ── FIND ME ────────────────────────────────────────────────────────────────
// At match start the void is 18 pixels across on a 390px phone and 10 on a
// tablet: 4.7% and 1.0% of the screen width, with no ring, no arrow and no
// pulse. Testers could not locate their own character in the opening shots.
// This is the ground ring that fixes it — sized in SCREEN space, so it holds a
// readable footprint however far the camera is, and it retires itself once the
// void is big enough to find on its own.
// ── AND IT IS THE RING THE OWNER KEPT REPORTING ───────────────────────────
// Twice: "There's a white circle always around the void?" and later "And
// there's a ring around him". Both times I went looking at the void's own
// furniture — I deleted the hole.io ground annulus in void3d, which was a real
// but DIFFERENT ring — and this one survived, because it does not live with the
// character at all. It is added straight to the scene, two thousand lines away
// from everything else that draws him.
//
// Two things made it read as a permanent white hoop rather than a brief hint:
//   - ADDITIVE blending. Mint green added onto Maple's pale sand and the pink
//     plaza clips straight to white, which is why he reported it as white both
//     times and why no amount of looking for a white MATERIAL found it.
//   - The retire condition, `since < 18 && radius < 2.6`. The HUD reports
//     1.6 x radius in metres, so 2.6 is "VOIDLING 4m" — a size a child is still
//     at well into the match. It was never the opening-seconds hint it was
//     written to be; it was on for most of the early game.
// Now: normal blending so it can never blow out, the void's own violet instead
// of a mint green that belonged to no part of this character, and a window that
// actually means "the first few seconds".
// ── THE FIND RING IS GONE. IT WAS THE RING HE KEPT REPORTING. ──────────────
// There used to be an additively-blended mint-green annulus on the ground at
// 1.75x the void's radius, on for `since < 18 && radius < 2.6`.
//
// The owner reported it twice — "There's a white circle always around the
// void?" and later "And there's a ring around him" — and BOTH times I went
// hunting through void3d.ts, because that is where the character is drawn. It
// was never there. It lived here, two thousand lines away, added straight to
// the scene by the camera code. I deleted a different ring (the hole.io ground
// lip) on the first report and told him it was fixed. It was not.
//
// Why it read as WHITE when the material was green: AdditiveBlending. Mint
// added onto Maple's pale sand and the pink plaza clips to white, so searching
// for a white material was never going to find it.
//
// Why it was always on: the retire gate. The HUD shows 1.6 x radius in metres,
// so `radius < 2.6` is "up to VOIDLING 4m" — most of the early match, not the
// opening moment. Both of his screenshots are 4-5 seconds in, squarely inside
// it.
//
// Its stated purpose was real: "at match start the void is 18 pixels across on
// a 390px phone and testers could not locate their own character". That premise
// is stale. He now starts around 47px on the same phone, the camera is locked
// to him, he has a dark contact shadow under him and a saturated violet body
// against pastel ground. The thing the ring was compensating for is fixed, so
// the compensation goes rather than getting quieter for a third time.

const puffVel: THREE.Vector3[] = []; const puffLife: number[] = [];
for (let i = 0; i < PUFF; i++) { puffVel.push(new THREE.Vector3()); puffLife.push(0); puffPos[i * 3 + 1] = -999; }
let puffHead = 0;
/** THE COLOUR A PROP IS, averaged from its own vertex colours and cached on
 *  it. Props are merged geometries with per-vertex colour — that IS the art —
 *  so the honest tint is already in the buffer and costs one sampled pass the
 *  first time a prop is eaten. Sampled, not summed: a bus has thousands of
 *  vertices and 24 of them describe it well enough for a spark.
 *  Saturation is pushed and lightness floored afterwards, because a straight
 *  mean of a whole prop tends to mud, and mud on an additive blend is grey. */
const _tintC = new THREE.Color(), _tintHSL = { h: 0, s: 0, l: 0 };
function propTint(o: THREE.Object3D): THREE.Color {
  const hit = o.userData.tint as THREE.Color | undefined;
  if (hit) return hit;
  let r = 0, g = 0, b = 0, n = 0;
  o.traverse((m) => {
    const ca = (m as THREE.Mesh).geometry?.getAttribute?.('color');
    if (!ca) return;
    const step = Math.max(1, Math.floor(ca.count / 24));
    for (let i = 0; i < ca.count; i += step) { r += ca.getX(i); g += ca.getY(i); b += ca.getZ(i); n++; }
  });
  const c = new THREE.Color();
  if (n) {
    c.setRGB(r / n, g / n, b / n);
    c.getHSL(_tintHSL);
    // a spark should read as the OBJECT's colour, louder than the object is
    c.setHSL(_tintHSL.h, Math.min(1, _tintHSL.s * 1.6 + 0.12), Math.min(0.82, Math.max(0.52, _tintHSL.l * 1.25)));
  } else {
    c.setHex(0x9a6ae0);   // the old purple, for anything with no vertex colour
  }
  o.userData.tint = c;
  return c;
}
function spawnPuff(x: number, y: number, z: number, n: number, col?: THREE.Color) {
  const c = col ?? _tintC.setHex(0x9a6ae0);
  for (let k = 0; k < n; k++) {
    const i = puffHead; puffHead = (puffHead + 1) % PUFF;
    puffPos[i * 3] = x; puffPos[i * 3 + 1] = y; puffPos[i * 3 + 2] = z;
    // a little per-spark variation so a burst is not one flat colour chip
    const j = 0.86 + Math.random() * 0.28;
    puffCol[i * 3] = c.r * j; puffCol[i * 3 + 1] = c.g * j; puffCol[i * 3 + 2] = c.b * j;
    const a = Math.random() * Math.PI * 2, up = rand(2, 8);
    puffVel[i].set(Math.cos(a) * rand(3, 9), up, Math.sin(a) * rand(3, 9));
    puffLife[i] = rand(0.35, 0.7);
  }
  (puffGeo.getAttribute('color') as THREE.BufferAttribute).needsUpdate = true;
}

// ── input: relative drag joystick (hole.io style) + WASD/arrows ───────────────
const joyEl = document.getElementById('joy')!, joyNubEl = document.getElementById('joyNub')!;
const joy = { active: false, id: -1, ax: 0, ay: 0, dx: 0, dy: 0, mag: 0,
  // where the thumb was last seen, and whether it has actually DRIVEN yet.
  // Both exist for the edge rescue below; `moved` also decides who owns the
  // stick when two fingers are down.
  px: 0, py: 0, moved: false };
const JOY_R = 64;
// "pinned": this close to the bezel there is no glass left to deflect into
const JOY_EDGE = 22;
// px of base travel per rescue tick — ~4 frames from crippled to full reach
const JOY_STEP = 16;
let lastInput = -9999, tClock = 0;
let hatSayCd = 12;   // legendary hats speak, but not for the first few seconds
function joySet(cx: number, cy: number) {
  joy.px = cx; joy.py = cy;
  // RE-ANCHOR (hole.io convention) with an OVERSHOOT ZONE: the base only
  // chases the finger once it's pulled well past the ring (1.7×). The old
  // tight follow parked the rim exactly under the thumb, so every micro-
  // wiggle dipped below full deflection — speed stuttered and steering felt
  // like it "needed progressively more movement". Now the thumb rests
  // comfortably past the rim at full speed; big pulls and direction flips
  // still drag the base along, so a flip never needs a 2-ring swipe back.
  const FOLLOW = JOY_R * 1.7;
  const m0 = Math.hypot(cx - joy.ax, cy - joy.ay);
  if (m0 > FOLLOW) {
    const g = 1 - FOLLOW / m0;
    joy.ax += (cx - joy.ax) * g; joy.ay += (cy - joy.ay) * g;
    joyEl.style.left = `${joy.ax}px`; joyEl.style.top = `${joy.ay}px`;
  }
  // ── THE GLASS RUNS OUT ────────────────────────────────────────────────────
  // The owner, playing on a phone: "eventually your finger goes off screen
  // with the way it's designed. Surely this is an oversight."
  //
  // It is, and it is worse than it looks. The base is planted wherever the
  // thumb lands, and full speed needs the thumb JOY_R past it — so a thumb
  // that lands 20px from the right bezel and pushes right can never deflect
  // more than 20px, which is mag 0.31 and about 19% of full speed. Pushing
  // LEFT from that same spot gives 100%. A child holding the phone one-handed
  // gets a void that is fast one way and treacle the other, and the escape
  // hatch cannot fire either: the re-anchor above needs 109px of deflection to
  // trigger, and there are only 20px of glass to find it in.
  //
  // So when the thumb is pinned against an edge and short of full deflection,
  // the BASE slides away from that edge instead. A few frames of that and the
  // ring is back in reach without the thumb moving at all.
  //
  // GATED ON `moved`, and that gate is the whole design. Clamping the base
  // into a safe rect at pointerdown — the obvious fix — starts every touch
  // near an edge already deflected by up to a full ring, so a TAP flings the
  // void. Nothing slides until the thumb has actually driven.
  if (joy.moved) {
    const W = window.innerWidth, H = window.innerHeight;
    const gap = (short: number) => Math.min(JOY_R - short, JOY_STEP);
    if (cx > W - JOY_EDGE && cx - joy.ax < JOY_R) joy.ax -= gap(cx - joy.ax);
    else if (cx < JOY_EDGE && joy.ax - cx < JOY_R) joy.ax += gap(joy.ax - cx);
    if (cy > H - JOY_EDGE && cy - joy.ay < JOY_R) joy.ay -= gap(cy - joy.ay);
    else if (cy < JOY_EDGE && joy.ay - cy < JOY_R) joy.ay += gap(joy.ay - cy);
    joyEl.style.left = `${joy.ax}px`; joyEl.style.top = `${joy.ay}px`;
  }
  const dx = cx - joy.ax, dy = cy - joy.ay;
  const m = Math.hypot(dx, dy);
  const k = m > JOY_R ? JOY_R / m : 1;
  // THE DOUBLE RAMP. joy.dx/dy used to be (dx*k)/JOY_R, whose MAGNITUDE is
  // already joy.mag — and the speed line then multiplied by joy.mag again. The
  // response curve was squared, so the thumb had to travel about 1.7x further
  // than intended: full speed needed the thumb exactly on the rim, half a ring
  // gave 42%, and easing back after a re-anchor gave 6%. Measured against the
  // intended curve at twelve rungs, the fit was exact. Direction is a UNIT
  // vector now; joy.mag alone carries the ramp.
  const inv = m > 0 ? 1 / m : 0;
  joy.mag = Math.min(1, m / JOY_R);
  // HEADING SMOOTHING, WEIGHTED BY HOW HARD YOU ARE PULLING. Near the centre
  // the direction of a few pixels is mostly noise, so it barely moves the
  // committed heading; out at the rim the child has clearly decided, so it
  // snaps. This is the standard twin-stick treatment and it costs one lerp.
  // (Velocity is smoothed downstream too, but that filter cannot tell a
  // deliberate flick from a wobble — this one can, by amplitude.)
  const nx0 = dx * inv, ny0 = dy * inv;
  if (joy.dx === 0 && joy.dy === 0) { joy.dx = nx0; joy.dy = ny0; }
  else {
    const w = 0.28 + 0.72 * joy.mag * joy.mag;   // 0.28 at the centre, 1.0 at the rim
    let hx = joy.dx + (nx0 - joy.dx) * w, hy = joy.dy + (ny0 - joy.dy) * w;
    const hl = Math.hypot(hx, hy) || 1;
    joy.dx = hx / hl; joy.dy = hy / hl;
  }
  // A REAL STEER, not a stray tap. Arms the FIRST NOM celebration so the party
  // belongs to a bite the child aimed at, not to the void drifting into a
  // postbox on the auto-started first launch.
  if (!nomArmed && joy.mag > 0.25) nomArmed = true;
  // a real drive, which is what arms the edge rescue and settles ownership
  if (joy.mag > 0.12) joy.moved = true;
  joyNubEl.style.left = `${joy.ax + dx * k}px`; joyNubEl.style.top = `${joy.ay + dy * k}px`;
  lastInput = tClock;
}
renderer.domElement.style.touchAction = 'none';   // stop iOS turning a fast drag into a browser gesture (pointercancel mid-steer)
renderer.domElement.addEventListener('pointerdown', (e) => {
  // A second finger must never steal the anchor MID-DRIVE — but the old guard
  // said `if (joy.active) return`, and a thumb merely RESTING on the glass is
  // active at mag 0. Two-handed, that idle contact took ownership and the hand
  // actually steering was filtered out by the pointerId check below: the game
  // looked frozen for as long as the resting thumb stayed down. Ownership is
  // provisional until the owner has driven.
  if (joy.active && joy.moved) return;
  if (joy.active) { try { renderer.domElement.releasePointerCapture(joy.id); } catch { /* fine */ } }
  joy.active = true; joy.id = e.pointerId; joy.ax = e.clientX; joy.ay = e.clientY;
  // load-bearing on the takeover path: without it the heading filter would
  // lerp the new thumb's direction out of the abandoned one
  joy.dx = joy.dy = 0; joy.mag = 0; joy.moved = false;
  try { renderer.domElement.setPointerCapture(e.pointerId); } catch { /* not supported */ }
  joyEl.style.display = joyNubEl.style.display = 'block';
  joyEl.style.left = `${e.clientX}px`; joyEl.style.top = `${e.clientY}px`;
  joySet(e.clientX, e.clientY);
});
window.addEventListener('pointermove', (e) => { if (joy.active && e.pointerId === joy.id) joySet(e.clientX, e.clientY); });
/** Is the thumb jammed against a bezel with nowhere left to push? */
function joyPinned(): boolean {
  return joy.active && joy.moved
    && (joy.px > window.innerWidth - JOY_EDGE || joy.px < JOY_EDGE
      || joy.py > window.innerHeight - JOY_EDGE || joy.py < JOY_EDGE);
}
/** THE RESCUE HAS TO RUN OFF THE CLOCK, NOT OFF THE EVENTS.
 *
 *  Sliding the base inside joySet only helps while the thumb is still MOVING,
 *  and a thumb that has hit the bezel has by definition stopped. Measured with
 *  qa/joyedge.mjs: from 20px out there is just enough travel left to emit the
 *  handful of pointermoves the rescue needs and it recovers to 0.97 of the
 *  speed the same push gets away from the edge — but from 12px out there is
 *  almost nothing left to move through, only two events fire, and it stalls at
 *  0.53. Half speed, in the exact corner grip that started this.
 *
 *  So the frame loop drives it too, from the last known thumb position. Gated
 *  on actually being pinned, so during normal play this never runs and the
 *  heading filter keeps its existing event-driven cadence. */
function joyEdgeTick(): void { if (joyPinned()) joySet(joy.px, joy.py); }
// ── LETTING GO, FROM EVERY DIRECTION ──────────────────────────────────────
// A finger lifting is only ONE of the ways a drive ends, and it was the only
// one handled. The joystick is a latch: joy.mag survives until something
// clears it, and the void keeps driving on the last heading for as long as it
// stays set. Every path below leaves a thumb "down" that will never come up:
//
//   • the app is BACKGROUNDED mid-drag — a call banner, the control centre,
//     Cmd-Tab. The keyboard has been guarded against exactly this since it was
//     written (`blur` -> keys.clear(), one line down); the joystick, which is
//     how every phone player actually steers, never was.
//   • the PAUSE SHEET comes up with the thumb still on the glass. The sheet
//     stops the clock, and the child lifts their thumb over a modal that is
//     not listening — so the stick is still pushed when they hit RESUME.
//   • PLAY AGAIN is tapped and held. The tap lands on the results card, which
//     is a DOM button, so no pointerdown ever reaches the canvas — but if the
//     previous match ended while driving, joy.mag is whatever it was, and the
//     new match opens with the void already moving at 14 u/s.
//
// So the reset is a named function and every one of those paths calls it.
function joyRelease(): void {
  joy.active = false; joy.id = -1; joy.mag = 0; joy.dx = joy.dy = 0; joy.moved = false;
  joyEl.style.display = joyNubEl.style.display = 'none';
}
const joyEnd = (e: PointerEvent) => { if (joy.active && e.pointerId === joy.id) joyRelease(); };
window.addEventListener('pointerup', joyEnd);
window.addEventListener('pointercancel', joyEnd);
// Not `joyEnd` — a blur carries no pointerId, and the whole point is that the
// pointer this was waiting for is never coming back.
window.addEventListener('blur', joyRelease);
document.addEventListener('visibilitychange', () => { if (document.hidden) joyRelease(); });

const keys = new Set<string>();
const MOVE_KEYS = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
window.addEventListener('keydown', (e) => { if (started && MOVE_KEYS.includes(e.code)) { keys.add(e.code); lastInput = tClock; } });
window.addEventListener('keyup', (e) => keys.delete(e.code));
window.addEventListener('blur', () => keys.clear());   // Cmd-Tab mid-hold must not leave the void driving itself
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ── match state + HUD ─────────────────────────────────────────────────────────
const el = (id: string) => document.getElementById(id)!;
const timerEl = el('timer'), boardEl = el('board');
// THE GROWTH BAR's nodes, resolved ONCE. The old chip was re-templated through
// innerHTML five times a second, which is why its progress bar could not
// animate: the fill element it was transitioning was a different element every
// repaint, always starting from width 0. Nothing below ever touches innerHTML.
const growthEl = el('growth');
const gNowEl = growthEl.querySelector('.gNow') as HTMLElement;
const gMEl = growthEl.querySelector('.gM') as HTMLElement;
const gNextEl = growthEl.querySelector('.gNext') as HTMLElement;
const gTrackEl = growthEl.querySelector('.gTrack') as HTMLElement;
const gFillEl = growthEl.querySelector('.gFill') as HTMLElement;
const hungerLbl = el('hungerlbl');
const evolveEl = el('evolve'), endEl = el('end'), endHd = el('endHd'), endSub = el('endSub'), endList = el('endList');
const bannerEl = el('banner'), hungerEl = el('hunger'), hungerFill = hungerEl.querySelector('.fill') as HTMLElement;
let prevHunger = 0;

/** A rival has arrived. Was: pink 30px text reading
 *  "🌀 Cousin WOBBLES joined — 😱 runs from everything", which is a sentence
 *  with two emoji in it and reads like a chat log. Now it is a card with the
 *  rival's own colour on it, their name at card size, and what they DO on a
 *  second line — the same shape a fighting game uses to say who just walked in. */
function announceJoin(name: string, color: number, title: string, tag: string) {
  const hex = '#' + color.toString(16).padStart(6, '0');
  announceHtml(
    `<div class="bCard"><span class="bDot" style="background:${hex};color:${hex}"></span>`
    + `<span class="bTx">${esc(title)} ${esc(name)}<span class="bSub">${esc(tag)}</span></span></div>`,
  );
}
/** A scripted beat. The multiplier is a BADGE, not a clause — "Everything is
 *  DOUBLE!" was two thirds of the sentence and the least interesting third. */
function announceBeat(icon: string, title: string, sub: string, mult: number) {
  announceHtml(
    `<div class="bCard"><span class="bIco">${icon}</span>`
    + `<span class="bTx">${esc(title)}<span class="bSub">${esc(sub)}</span></span>`
    + `<span class="bMul">×${mult}</span></div>`,
  );
}
// ── ?walls=1 : the containment boundary, drawn ─────────────────────────────
// One InstancedMesh of flat red tiles that follows the player and re-tests the
// grid around them every third of a second, using the SAME solidity rule the
// movement code uses at the void's current radius. Nothing is allocated unless
// the flag is on.
const WALL_N = 44, WALL_STEP = 7;   // 44x44 tiles at 7 units = a 308-unit window
let wallMesh: THREE.InstancedMesh | null = null;
let wallCd = 0;
const _wm = new THREE.Matrix4();
function paintWalls() {
  if (!wallMesh) {
    wallMesh = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(WALL_STEP * 0.92, WALL_STEP * 0.92),
      new THREE.MeshBasicMaterial({ color: 0xff2a44, transparent: true, opacity: 0.34, depthWrite: false }),
      WALL_N * WALL_N,
    );
    wallMesh.frustumCulled = false;
    wallMesh.renderOrder = 3;
    scene.add(wallMesh);
  }
  wallCd -= 1 / 60;
  if (wallCd > 0) return;
  wallCd = 0.33;
  // the movement rule, verbatim — see the containment block in animate()
  const R0 = voidling.radius;
  const m = Math.min(R0 * 0.75, 4 + R0 * 0.15) + 1.2;
  const d45 = m * 0.7071;
  const solid = (x: number, z: number) => !!island.biomeAt(x, z) && !inDeepWater3(x, z, m)
    && insideIsland3(x + m, z) && insideIsland3(x - m, z)
    && insideIsland3(x, z + m) && insideIsland3(x, z - m)
    && insideIsland3(x + d45, z + d45) && insideIsland3(x - d45, z - d45)
    && insideIsland3(x + d45, z - d45) && insideIsland3(x - d45, z + d45);
  const ox = Math.round(voidState.x / WALL_STEP) * WALL_STEP;
  const oz = Math.round(voidState.z / WALL_STEP) * WALL_STEP;
  let n = 0;
  for (let i = -WALL_N / 2; i < WALL_N / 2; i++) {
    for (let j = -WALL_N / 2; j < WALL_N / 2; j++) {
      const x = ox + i * WALL_STEP, z = oz + j * WALL_STEP;
      if (solid(x, z)) continue;                       // legal — draw nothing
      if (!insideIsland3(x, z)) continue;              // off the map entirely — not a wall
      _wm.makeRotationX(-Math.PI / 2); _wm.setPosition(x, 0.12, z);
      wallMesh.setMatrixAt(n++, _wm);
      if (n >= WALL_N * WALL_N) break;
    }
  }
  wallMesh.count = n;
  wallMesh.instanceMatrix.needsUpdate = true;
}

// ── ONE HERO MESSAGE AT A TIME ──────────────────────────────────────────────
// The EVOLVE card and this banner are two independent channels that nothing
// arbitrated between, and at the top rung they fire in the SAME synchronous
// block — so the word EVOLVED, at the single biggest reward moment in the
// game, was covered 100% of the time on every device. Instrumented over a live
// match the banner alone ran a 39% duty cycle, one impression every 5.6
// seconds, so even the ordinary evolutions collided with it about half the
// time. The evolve card now owns the screen for its animation, and anything
// the banner wants to say during that window QUEUES rather than talks over it.
let bannerFree = 0;          // tClock before which the banner must stay quiet
// The banner carries MARKUP now, not a string — see the #banner card rules.
// announce() still takes plain text and wraps it, so the sixty-odd existing
// call sites are untouched; the structured helpers below build richer cards.
const bannerQ: string[] = [];
const esc = (v: string) => v.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string));
/** A plain one-line card. `icon` is pulled out of the string if it starts with one. */
function cardHtml(text: string): string {
  // most call sites pass "<emoji> WORDS" — split it so the glyph gets its own
  // slot at card size instead of sitting inline at text size
  const m = text.match(/^(\p{Extended_Pictographic}(?:\u200d\p{Extended_Pictographic})*[\uFE0F]?)\s*(.*)$/u);
  const ico = m ? m[1] : '';
  const body = m ? m[2] : text;
  return `<div class="bCard">${ico ? `<span class="bIco">${ico}</span>` : ''}<span class="bTx">${esc(body)}</span></div>`;
}
function paintBanner(html: string) {
  bannerEl.innerHTML = html;
  bannerEl.classList.remove('show'); void bannerEl.offsetWidth; bannerEl.classList.add('show');
}
function announce(text: string) { announceHtml(cardHtml(text)); }
function announceHtml(html: string) {
  if (tClock < bannerFree) {
    // never let a backlog build: the newest message is the relevant one
    bannerQ.length = 0; bannerQ.push(html);
    return;
  }
  paintBanner(html);
}
/** the evolve card is playing — hold the banner until it has finished */
function holdBanner(sec: number) { bannerFree = Math.max(bannerFree, tClock + sec); }
function pumpBanner() {
  if (tClock < bannerFree || !bannerQ.length) return;
  paintBanner(bannerQ.shift()!);
}

// haptics — hole.io vibrates on every absorb and it's core to the feel.
// Rate-capped so a feeding frenzy doesn't turn the phone into a massager.
let buzzGate = 0, hadGesture = false;
window.addEventListener('pointerdown', () => { hadGesture = true; }, { once: true });
let hapticsOn = localStorage.getItem('voidHaptics') !== '0';
function buzz(ms: number) {
  if (!hapticsOn) return;
  const now = performance.now();
  if (ms < 20 && now < buzzGate) return;   // ticks are rate-limited; big hits always land
  buzzGate = now + 70;
  // iOS Safari/WKWebView never implemented navigator.vibrate — every haptic
  // beat was silent on the App Store target. Route through Capacitor Haptics
  // on native; web keeps the vibrate path.
  if (Capacitor.isNativePlatform()) {
    void Haptics.impact({ style: ms >= 45 ? ImpactStyle.Heavy : ms >= 25 ? ImpactStyle.Medium : ImpactStyle.Light });
    return;
  }
  if (!hadGesture || !('vibrate' in navigator)) return;   // browsers require a tap first
  try { navigator.vibrate(ms); } catch { /* not supported */ }
}

// ── powers (hunger meter) ────────────────────────────────────────────────────
let hunger = 0;
const COST = { gulp: 0.35, collapse: 1.0 };   // two powers, both readable: suck-in + super-nova
// the harness needs EXPLICIT debug params — a shared link with ?utm_source=…
// must never enable auto-fire, menu-skip, or autopilot for a real player
const _qd = new URLSearchParams(location.search);
const DEBUG_HARNESS = _qd.has('at') || _qd.has('r') || _qd.has('len') || _qd.has('fast') || _qd.has('demo');
let powerCd = 0;                       // shared re-trigger delay
let dashT = 0; const dashDir = { x: 0, z: 1 };
const aim = { x: 0, z: 1 };            // last travel direction
let autoFireCd = 3;

// SIX FORMS, and the last one is RARE. WORLD ENDER sat at radius 5.0, which
// the old clock-locked curve handed to literally every run at about two
// minutes — so "BIGGEST: WORLD ENDER" on the results screen was decoration,
// not an achievement. It is 8.0 now, above where a weak run finishes, and
// COLOSSUS fills the gap so the ladder still has a rung every 30-40 seconds.
// Ending a world should be the thing you tell someone about.
// …and a SEVENTH, which no amount of clock can reach. lawCap tops out near 12
// on a perfect run, so 13.5 is only crossed on feastR — you get here by eating
// the family, or you do not get here. It is the one line on the results screen
// that cannot be earned by turning up.
const FORMS = ['VOIDLING', 'MUNCHER', 'GOBBLER', 'DEVOURER', 'COLOSSUS', 'WORLD ENDER', 'VOID TITAN'];
// 2D thresholds 18/32/50/78/110 world-px, mapped through the 0.05 world scale
const FORM_MIN = [0, 1.6, 2.5, 3.6, 5.5, 8.0, 13.5];
// the void renderer and the soundtrack both ship five visual tiers. COLOSSUS
// wears DEVOURER's dressing — it IS a huge devourer — so the top tier stays
// unique to WORLD ENDER and arriving there looks like something.
const VISUAL_STAGE = [0, 1, 2, 3, 3, 4, 4];   // TITAN wears WORLD ENDER's dressing, at scale
const stageFor = (r: number) => { let s = 0; for (let i = 0; i < FORM_MIN.length; i++) if (r >= FORM_MIN[i]) s = i; return s; };
const PLAYER_COLOR = 0x9a5cff;

// ── scale/eat/growth — the 2D game's exact model, through the 0.05 map scale ─
// Start r=0.9 (2D: 18). Eat if voidR >= targetR·0.9. Growth is area-based with
// the 2D's diminishing factor sqrt(startR/R) and rookie surge — AND the 2D
// GROWTH LAW: radius can never exceed startR + rate·seconds. That law is the
// real pacing: no ballooning off one item, the whole match is a steady climb.
const START_R = 0.9;
export const EAT_RATIO = 1.11;         // eat if target.radius <= R*1.11  (voidR >= targetR*0.9)
// ── THE CEILING IS 50% HIGHER, AND ONLY RIVALS UNLOCK IT ──────────────────
// 12 was reached by EVERY run, including a driver that picks a random heading
// every two seconds (qa/difficulty.mjs: flail finished at r=12.5). A ladder
// whose top rung is handed to random input is decoration, which is the same
// thing WORLD ENDER itself was before it moved from 5.0 to 8.0.
//
// 18 is the owner's call and the right shape: absurd, and out of reach of
// ordinary play. Raising this alone would do nothing — R_CAP is not what binds,
// lawCap is (see the growth law below) — so the two move together. Normal
// eating stays on the law exactly as it was, and every rival you SWALLOW buys
// permanent headroom above it. Ordinary play still tops out near 12; the last
// six belong to whoever hunts the family.
const R_CAP = 18;                       // was 12 (2D MAX_RADIUS 240 · 0.05)
// headroom bought by eating rivals, in world units, spent against lawCap
let feastR = 0;
const FEAST_PER_RIVAL = 1.25;           // five rivals eaten = the full +6
// Pacing: evolutions should be EARNED milestones. law cap ≈ MUNCHER ~23s,
// GOBBLER ~53s, DEVOURER ~100s, WORLD ENDER ~153s on a strong run.
const LAW_RATE = 0.025;   // evolutions are EARNED — slower clock, same 2D shape
let lastR = 0.9;          // previous frame's radius — the growth RATE limiter
const growRadius = (R: number, eR: number) => {
  const rookie = R < 1.7 ? 1.6 : R < 2.5 ? 1.3 : 1;   // 2D: <34 → 1.6, <50 → 1.3
  const diminish = Math.sqrt(START_R / Math.max(START_R, R));
  return Math.min(R_CAP, Math.sqrt(R * R + 0.5 * eR * eR * rookie * diminish));
};

const _q = new URLSearchParams(location.search);
const MATCH_LEN = Number(_q.get('len')) || 180;                // 3:00 — tighter, hole.io-style (?len=N)
const clockSpeed = _q.has('fast') ? 6 : 1;                     // ?fast to speed the clock
const bigStart = Number(_q.get('r')) || 0;                     // ?r=N debug: start big
let matchClock = MATCH_LEN, matchLen = MATCH_LEN, ended = false, playerScore = 0, curStage = 0;
// ── HOW LONG THE MATCH HAS BEEN RUNNING ────────────────────────────────────
// There are two clocks in this file and they are not interchangeable. `tClock`
// is wall time: it advances every frame, forever, including while the pause
// sheet is up, during hit-stop, and on the results screen. `matchClock` is the
// one the player can see — it counts down only inside
// `if (started && !ended && !paused)`, it is scaled by hit-stop through `dtw`,
// and it honours ?fast.
//
// The rivals were scheduled off `tClock - startT`, so ANY pause slid the whole
// family forward relative to the match the child was watching. Pause 40s to
// turn the sound off — the pause sheet is the only in-match route to that — and
// the hunt window, which ends at matchLen * 0.55, closes 40s early in match
// terms; every rival scheduled during the pause joins on the single resume
// frame, stacking one audio.alert() sting per arrival; and past ~99s of
// accumulated pause CHOMPZILLA is stuffed the instant play resumes, skipping
// the whole predator act while the HUD still reads nearly three minutes.
// ?fast diverged the two by 6x for an entire match, which quietly made every
// harness run with that flag see a family that barely joined.
//
// The authored beats always used the visible clock (`matchLen - matchClock`).
// This is that same expression, named once, so the two cannot drift apart again.
const matchElapsed = () => matchLen - matchClock;
// QA only: __setVoidR sets this so the growth law stops pulling the hero back
// to its clock-derived size, which is what a renderer screenshot needs.
let frozenR = false;
let matchEaten = 0;   // props eaten THIS match — the results screen's own number
let signedOn = false; // has the station said good morning yet this match?
let _booted = false;  // has one frame actually rendered? (drops the boot cover)
let initialMass = 0;                   // set once, after the world is built
let hudCd = 0;

const WANDER_R = 230;
let wanderT = 0; const wander = new THREE.Vector3(voidState.x, 0, voidState.z);
const clock = new THREE.Clock();
const prev = { x: voidState.x, z: voidState.z };
const tmpV = new THREE.Vector3();
const fwdTmp = new THREE.Vector3(), rightTmp = new THREE.Vector3();
let velX = 0, velZ = 0;   // smoothed velocity — kills the boxy/jerky feel

/** Seconds elapsed in the current match, floored at zero — the clock reads a
 *  hair over matchLen before the first tick, which put negative timestamps
 *  into the telemetry. */
const elapsed = (): number => Math.max(0, Math.round(matchLen - matchClock));
function fmtTime(s: number) { s = Math.max(0, Math.ceil(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }

// ── coin wallet (persisted — the soft-currency for skins) ───────────────────
let coins = Number(localStorage.getItem('voidCoins') || 0);
const coinEl = el('coins');
// Anything that wants to know the wallet moved. The shop needs it: claim a
// daily reward with the shop open and the balance, the affordable states and
// every progress bar are all stale until you switch tabs.
const coinWatchers: ((n: number) => void)[] = [];
function addCoins(n: number) {
  coins += n;
  localStorage.setItem('voidCoins', String(coins));
  coinEl.textContent = `✦ ${coins}`;
  for (const f of coinWatchers) f(coins);
}
addCoins(0);

// ── DAILY QUESTS: 3 drawn per day (1 easy / 1 medium / 1 hard), progress
// persists across matches, +25✦ for clearing the board — three stacking
// come-back-tomorrow hooks with the gift box and streak skins
interface Quest { id: string; icon: string; label: string; target: number; count: number; reward: number; kind: string; done: boolean; }
const QUEST_POOL: Omit<Quest, 'count' | 'done'>[] = [
  { id: 'snack', icon: '🍩', label: 'Snack Attack: eat 25 tiny things', target: 25, reward: 15, kind: 'snack' },
  { id: 'gulp', icon: '🌀', label: 'Big Gulp: use GULP 3×', target: 3, reward: 15, kind: 'gulp' },
  { id: 'collapse', icon: '💥', label: 'Supernova: use COLLAPSE', target: 1, reward: 20, kind: 'collapse' },
  { id: 'cars', icon: '🚗', label: 'Rush Hour: eat 6 cars', target: 6, reward: 20, kind: 'car' },
  { id: 'combo', icon: '🔥', label: 'Combo Chef: hit a ×2.0 combo', target: 1, reward: 20, kind: 'combo' },
  { id: 'evolve', icon: '🕳️', label: 'Evolve to DEVOURER', target: 1, reward: 25, kind: 'devourer' },
  { id: 'solo', icon: '🏝️', label: 'Islander: 40% in a Solo Run', target: 1, reward: 20, kind: 'solo40' },
  { id: 'houses', icon: '🏠', label: 'Roof Raider: eat 3 houses', target: 3, reward: 25, kind: 'house' },
  // PER-WORLD. Houses only exist in Maple's cozy/fancy biomes and Pirate Bay's
  // entire car population is seven shuttle buggies, so a board drawn as
  // "6 cars / combo / 3 houses" — which is what today drew — was impossible on
  // the flagship world. Measured: Maple cleared 3/3 and 2/3, Pirate 1/3, 1/3, 0/3.
  { id: 'cabanas', icon: '⛱️', label: 'Beach Party: eat 4 cabanas', target: 4, reward: 25, kind: 'cabana' },
  { id: 'gold', icon: '✦', label: 'Treasure Hunter: find 4 golden things', target: 4, reward: 25, kind: 'gild' },
  { id: 'rival', icon: '⚡', label: 'Out-Gobbler: out-gobble a rival', target: 1, reward: 30, kind: 'rival' },
  { id: 'big', icon: '🏨', label: 'Big Fish: eat 3 LANDMARK buildings', target: 3, reward: 25, kind: 'big' },
];
// EASY and MED both contained 'cars' and 'combo', so roughly one day in seven
// drew the SAME chip twice. Disjoint now, and the hard slot is world-aware.
const EASY_Q = ['snack', 'gold', 'combo'];
// 'cabanas' sat in BOTH of Pirate's lists, so with the no-duplicate draw it
// still appeared on 228 of 365 days — the same chip on nearly two days in
// three is not a daily quest, it is a chore. It keeps the hard slot, where its
// 4-count target belongs, and the medium slot goes to quests every world can
// serve. Measured after: cabanas 139, and no chip above 217.
// PER WORLD, AS A TABLE — the same two-world ternary that broke the copy also
// broke this. Measured on a live build: Game Day carries 0 props tagged 'car'
// and 0 tagged 'house', against Maple's 67 and 70, and it was being handed
// Maple's board. On any day the draw took 'cars' or 'houses' a child got a
// chip that could not be completed on that world — the exact bug the note
// above records being fixed for Pirate Bay, one world late.
//
// Game Day's own props are now TAGGED instead (see island.ts), so its trucks
// count as cars and its frat houses, brick halls and motorhomes count as
// houses. That fixes the board and, at the same time, the FIRST CAR and FIRST
// BUILDING moments and the newsroom's meal names, all of which were dead here
// for the same reason.
const MED_Q = pickedWorld === 'pirate' ? ['evolve', 'combo', 'gold'] : ['cars', 'evolve', 'combo'];
const HARD_Q = pickedWorld === 'pirate' ? ['cabanas', 'rival', 'big'] : ['houses', 'rival', 'big'];   // easy rotates daily; 'solo' retired with the menu button
const quests: Quest[] = (() => {
  const today = new Date().toDateString();
  // uint32 hash (imul + >>>0). The old float reduce blew past 2^53, and the
  // >> coercion could go NEGATIVE — array[-1] = undefined = a day where every
  // kid's quest chips read "undefined 0/undefined" (first hit: Jul 26 2026)
  let daySeed = 7;
  for (const c of today) daySeed = (Math.imul(daySeed, 31) + c.charCodeAt(0)) >>> 0;
  // NO DUPLICATES, STRUCTURALLY. Making the three pools disjoint by hand was
  // tried and did not hold: 'combo' is in EASY and Maple's MED, 'gold' is in
  // EASY and Pirate's MED, and 'cabanas' is in Pirate's MED and HARD. Measured
  // over a year of real day-seeds that is 63/365 duplicate days on Maple and
  // 100/365 on Pirate — a board reading "combo · combo · rival" is two chips
  // that complete together and one that does not, which reads as a bug.
  //
  // The draw now excludes what earlier slots already took, so the pools can
  // overlap freely and a new quest can be added to any of them without
  // re-deriving the partition. Falling back to the full pool if a slot is
  // exhausted keeps it safe even if someone shrinks a list to one entry.
  const taken = new Set<string>();
  const draw = (pool: string[], seed: number): string => {
    const free = pool.filter((id) => !taken.has(id));
    const src = free.length ? free : pool;
    const id = src[seed % src.length];
    taken.add(id);
    return id;
  };
  const ids = [draw(EASY_Q, daySeed), draw(MED_Q, daySeed >>> 2), draw(HARD_Q, daySeed >>> 4)];   // independent indices — the same seed produced only 3 boards ever
  const saved = localStorage.getItem('voidQuestDay') === today
    ? JSON.parse(localStorage.getItem('voidQuestState') || '{}') : {};
  localStorage.setItem('voidQuestDay', today);
  return ids.map((id) => {
    const t = QUEST_POOL.find((q) => q.id === id) ?? QUEST_POOL[0];   // belt-and-braces: never render an undefined chip
    return { ...t, count: saved[id]?.c ?? 0, done: saved[id]?.d ?? false };
  });
})();
function saveQuests() {
  const s: Record<string, { c: number; d: boolean }> = {};
  for (const q of quests) s[q.id] = { c: q.count, d: q.done };
  localStorage.setItem('voidQuestState', JSON.stringify(s));
}
const questsEl = el('quests');
function renderQuests() {
  // icon chips, not sentences — a pre-reader can track 🍩 12/25 at a glance,
  // and the panel stops eating a third of the play screen
  questsEl.innerHTML = quests.map((q) =>
    `<div class="q ${q.done ? 'done' : ''}" title="${q.label} +${q.reward}✦">` +
    `<span class="qi">${q.icon}</span>` +
    (q.done ? '<span class="qc">✓</span>' : `<span class="qc">${q.count}/${q.target}</span>`) +
    `<div class="qb"><div style="width:${Math.min(100, Math.round((q.count / q.target) * 100))}%"></div></div></div>`).join('');
}
function questComplete(q: Quest) {
  q.done = true; addCoins(q.reward);
  announce(`QUEST DONE! +${q.reward}✦`);
  audio.evolve();
  if (quests.every((x) => x.done)) { addCoins(25); announce('ALL QUESTS CLEAR! +25✦ BONUS'); }
  renderQuests(); saveQuests();
}
function questEvent(kind: string, n = 1) {
  for (const q of quests) {
    if (q.done || q.kind !== kind) continue;
    q.count += n;
    if (q.count >= q.target) questComplete(q); else { renderQuests(); saveQuests(); }
  }
}
renderQuests();

// ── MAPLE ISLE NEWS — the island reacts to how much of it still exists ──────
// ── LIVE STATE the newsroom reports on ─────────────────────────────────────
let lastMeal = 'a traffic cone';
let feverMult = 1, feverT = 0;   // match-beat scoring multiplier
// the match's authored spine — fires on elapsed seconds, resets every run
// The three beats belong to the town now. A generic DONUT RUSH on an island
// that is holding a mayoral election is a wasted beat — these are the same
// three-beat spine, told as election night.
// THE MID-MATCH HOLE. The spine was three beats at 32 / 95 / 150 with durations
// 15 / 18 / 30, which leaves 47s->95s and 113s->150s with no beat, no
// multiplier and — because DEVOURER->COLOSSUS has a median 52-second gap —
// usually no evolution either. That is 47 seconds and 37 seconds of a
// three-minute match where nothing is scheduled to happen. A fourth beat fills
// the larger hole and the rest re-space around it.
//
// `at` is the BASE time; jitter() moves each one per match (see resetBeats).
// Measured before: beat 1 fired at 32.1-32.2s, beat 2 at 95.0-95.5s and beat 3
// at 150.1-151.4s across ELEVEN matches on both worlds. Same island, same
// spawn, same cast, same script, to the tenth of a second.
const MAPLE_BEATS = [
  { at: 30, dur: 14, mult: 2, fired: false, base: 0, col: 0xffd23f, flash: 'rgba(255,210,90,0.3)',
    icon: '🎺', title: 'Band practice', sub: 'they only know one song',
    news: 'The marching band is out. They know one song. Here it comes.' },
  { at: 66, dur: 16, mult: 2, fired: false, base: 0, col: 0x5ee8d8, flash: 'rgba(94,232,216,0.26)',
    icon: '🐕', title: 'Dog off the lead!', sub: 'six people are chasing it',
    news: 'A dog is loose on Main Street. Six people are chasing it. It thinks this is a game.' },
  { at: 110, dur: 18, mult: 2, fired: false, base: 0, col: 0xff5d7e, flash: 'rgba(255,93,126,0.28)',
    icon: '📣', title: 'Town parade!', sub: 'everybody is on Main Street',
    news: 'The parade has started. The mayor calls it a scheduling matter.' },
  { at: 148, dur: 32, mult: 3, fired: false, base: 0, col: 0xb875ff, flash: 'rgba(184,117,255,0.32)',
    icon: '🐐', title: 'The goat is loose!', sub: 'nobody is even chasing it',
    news: 'The goat is out again. Nobody is chasing it. Everybody is watching.' },
];
// PIRATE BAY runs the same three-beat spine, themed to the resort
const PIRATE_BEATS: typeof MAPLE_BEATS = [
  { at: 30, dur: 14, mult: 2, fired: false, base: 0, col: 0x7bffe8, flash: 'rgba(123,255,232,0.28)',
    icon: '🍦', title: 'Ice cream hour!', sub: 'the hut is very pleased',
    news: 'Ice cream hour has been declared. The ice cream hut is delighted.' },
  { at: 66, dur: 16, mult: 2, fired: false, base: 0, col: 0xffa63f, flash: 'rgba(255,166,63,0.26)',
    icon: '🦜', title: 'The parrot escaped!', sub: 'it knows the whole menu',
    news: 'The resort parrot is loose. It has learned the breakfast menu and will not stop.' },
  { at: 110, dur: 18, mult: 2, fired: false, base: 0, col: 0xff2fa0, flash: 'rgba(255,47,160,0.28)',
    icon: '🪩', title: 'Dance party!', sub: 'the whole bay is moving',
    news: 'DJ Coconut has dropped the big one. The floor is shaking.' },
  { at: 148, dur: 32, mult: 3, fired: false, base: 0, col: 0xffd23f, flash: 'rgba(255,210,90,0.32)',
    icon: '🏴‍☠️', title: 'Treasure hunt!', sub: 'the map is still wrong',
    news: 'The treasure hunt has begun. The map is still wrong.' },
];
// GAME DAY runs the clock of an actual football game, which is the whole
// pleasure of the conceit: the beats are not generic multipliers with a coat of
// paint on, they are the four moments of a match. The finale is the fourth
// quarter, and the commentary box knows it.
const GAMEDAY_BEATS: typeof MAPLE_BEATS = [
  { at: 30, dur: 14, mult: 2, fired: false, base: 0, col: 0xf0b429, flash: 'rgba(240,180,41,0.28)',
    icon: '🏈', title: 'Kickoff!', sub: 'the ball is in the air',
    news: 'And we are under way. The ball is in the air and so, apparently, is the parking lot.' },
  { at: 66, dur: 16, mult: 2, fired: false, base: 0, col: 0xc4342f, flash: 'rgba(196,52,47,0.26)',
    icon: '🥁', title: 'The band is on the field!', sub: 'nobody told them about you',
    news: 'The marching band has taken the field. They have not been told. They are playing anyway.' },
  { at: 110, dur: 18, mult: 2, fired: false, base: 0, col: 0xff8a3d, flash: 'rgba(255,138,61,0.26)',
    icon: '🌭', title: 'Concession rush!', sub: 'everybody wants a hot dog',
    news: 'Everybody has gone for a hot dog at once. The queue is now the largest thing here.' },
  { at: 148, dur: 32, mult: 3, fired: false, base: 0, col: 0x2aa9a0, flash: 'rgba(42,169,160,0.30)',
    icon: '📣', title: 'Fourth quarter!', sub: 'the stadium is on its feet',
    news: 'Fourth quarter. The stadium is on its feet, which is fortunate, because the seats have gone.' },
];
// ── LANTERN NIGHT. The market's own four beats, and they follow the level's
// walk north: the gate, the row, the bridge, the bathhouse. The third is the
// turn — the moment the market stops offering you things — so it is the one
// with the drum on it.
const LANTERN_BEATS: typeof MAPLE_BEATS = [
  { at: 30, dur: 14, mult: 2, fired: false, base: 0, col: 0xffb256, flash: 'rgba(255,178,86,0.28)',
    icon: '🏮', title: 'The lanterns are lit!', sub: 'every one of them, for you',
    news: 'The lanterns have all been lit at once. The market says this is in your honour.' },
  { at: 66, dur: 16, mult: 2, fired: false, base: 0, col: 0xff5a4a, flash: 'rgba(255,90,74,0.26)',
    icon: '🍡', title: 'Everything is free!', sub: 'they insist. they keep insisting',
    news: 'Every stall on Lantern Row has waived its prices for the guest in the purple.' },
  { at: 110, dur: 18, mult: 2, fired: false, base: 0, col: 0x8ad4ff, flash: 'rgba(138,212,255,0.26)',
    icon: '🥁', title: 'The drum has started', sub: 'nobody ordered the drum',
    news: 'The drum tower has begun. It is only ever struck for two reasons and this is not the other one.' },
  { at: 148, dur: 32, mult: 3, fired: false, base: 0, col: 0xffd489, flash: 'rgba(255,212,137,0.32)',
    icon: '♨️', title: 'The bathhouse is open!', sub: 'they are calling you up',
    news: 'The bathhouse has opened its doors and lit every window. It is the last thing standing.' },
];
const BEATS = pickedWorld === 'gameday' ? GAMEDAY_BEATS
  : pickedWorld === 'pirate' ? PIRATE_BEATS
    : pickedWorld === 'lantern' ? LANTERN_BEATS : MAPLE_BEATS;
const MEAL_NAME: Record<string, string> = pickedWorld === 'gameday' ? {
  // GAME DAY names its own meals: 'a parked car' for a pickup with the tailgate
  // down is the wrong noun, and newsroom_gameday's matcher already looks for
  // 'truck' and 'rv' by name (its own comment: on RV Row a motorhome IS
  // somebody's house, and the house lines read correctly for it).
  house: 'a whole HOUSE', car: 'a pickup truck', rv: 'a whole MOTORHOME',
  big: 'an entire LANDMARK',
} : {
  house: 'a whole HOUSE', car: 'a parked car', big: 'an entire LANDMARK',
};
/** WHAT DID IT JUST EAT? The newsroom keys its reaction lines off this string,
 *  and it only ever saw two of them: nothing in the repo tags 'house' or 'big',
 *  so every meal that was not a car collapsed to a size bucket and every
 *  house/landmark/boat/person headline was unreachable. Classify from the flags
 *  that DO exist — afloat, mover, radius — and make sure the words the
 *  newsroom's own matcher looks for actually appear in the string. */
function mealOf(e: Edible): string {
  const u = e.mesh.userData as Record<string, unknown>;
  if (u.qk === 'car') return 'a parked car';
  if (u.afloat) return e.radius > 4 ? 'a whole SHIP' : 'somebody\'s boat';
  if (u.mover) {
    // NO TERMINAL PUNCTUATION IN A FRAGMENT, and NO COMMA EITHER. This is
    // substituted into 22 newsroom templates, every one of which supplies its
    // own sentence end and most of which embed {M} mid-clause. The full stop
    // was caught first — it produced "It ate a guest. mid-sentence.." on a
    // full-screen card. The comma survived it and does the same job more
    // quietly: "One gulp, one burp, and a truck, in motion was gone" is what
    // the ticker printed, measured on a live run.
    if (e.radius > 2.2) return 'a moving truck';
    // AND NOT A PERSON, EVER. A mover this size is a pedestrian or a monkey,
    // and the old string said "a guest" — so the paper printed "It ate a
    // guest" at a six-year-old, in a 4+ app whose four newsroom files all
    // carry an explicit rule that no line may say a person was eaten. The
    // rule was enforced in the pools and broken at the substitution point,
    // which is why nobody reading the pools ever saw it. Cartoon convention
    // and the paper's own voice agree: name what got dropped, not who
    // dropped it. Every newsroom already runs on lost property.
    if (e.radius > 1.1) return 'somebody\'s hat';
    return 'somebody\'s lunch';
  }
  if (e.radius > 6) return 'an entire LANDMARK';
  if (e.radius > 3.4) return 'a whole HOUSE';
  if (e.radius > 2.2) return 'a big building';
  if (e.radius > 1.2) return 'a mailbox';
  return 'a snack';
}
const mealBySize = (r: number) =>
  r > 5 ? 'an entire BUILDING' : r > 2.5 ? 'something big' : r > 1.2 ? 'a mailbox' : 'a snack';
const DISTRICT: Record<string, string> = {
  cozy: 'MAPLE HEIGHTS', fancy: 'FANCY HILLS', downtown: 'DOWNTOWN', plaza: 'THE PLAZA',
  park: 'THE PARK', forest: 'PINE WOODS', beach: 'LAKESIDE',
  // MAPLE FALLS re-zone: without these four, a quarter of the island's
  // headlines said "THE ISLE" instead of naming where you were standing
  fair: 'THE COUNTY FAIR', farm: 'THE FARM', campus: 'MAPLE FALLS HIGH', strip: 'THE STRIP',
  // PIRATE BAY
  port: 'THE DOCKS', resort: 'THE RESORT', party: 'THE DANCE FLOOR',
  market: 'THE BAZAAR', jungle: 'THE JUNGLE', cove: 'SMUGGLERS COVE',
  // GAME DAY. island.ts renames three of gameday.ts's district ids on the way
  // out (plaza→gate, campus→quad, woods→treeline) because 'plaza' and 'campus'
  // already mean something in Maple; both spellings are listed so a headline
  // never says "THE ISLE" because of a rename.
  bowl: 'MARSTON STADIUM', gate: 'GATE PLAZA', lot: 'THE TAILGATE',
  rvpark: 'RV ROW', greek: 'FRAT ROW', quad: 'OLD CAMPUS',
  practice: 'THE PRACTICE FIELD', treeline: 'THE TREE LINE',
};
// TEMPLATED headlines: a tiny pool × live variables = copy that never repeats
// AND is always about the player. This is what killed the "generic ticker"
// feel — every one of these is a mirror of the run in progress.
// THE MAYOR — one recurring character running a denial-to-collapse arc
// across the match. A running joke beats 54 unrelated one-liners.
const newsEl = el('news');
let devouredPct = 0, newsCd = COPY.signOn;
/** How bad it has got, 0..1 — the continuous form of the newsroom's tier.
 *  Form and meter both feed it and the higher one wins, exactly as the tier
 *  does: a WORLD ENDER standing on an untouched suburb is still an emergency,
 *  and so is a VOIDLING that has quietly eaten a third of the map. */
function tension(): number {
  const byForm = THREE.MathUtils.clamp((curStage - 1.4) / 2.6, 0, 1);   // MUNCHER ~0, COLOSSUS 1
  const byPct = THREE.MathUtils.clamp((devouredPct - 6) / 26, 0, 1);    // 6% ~0, 32% 1
  return Math.max(byForm, byPct);
}
// QA: the you-vs-family split of what the island has lost, so a harness can
// check the family is not simply eating the player's food out from under them
let devPlayerPct = 0, devFamilyPct = 0;
// …and the raw counts behind that split. The percentages are rounded to whole
// numbers against a 3,297-prop island, so at the low end they quantise to
// nothing useful — the results screen needs the counts themselves.
let devMineN = 0, devAllN = 0;
// ── THE FINALE CUE ─────────────────────────────────────────────────────────
// GAME DAY's stadium is the biggest meal in the game and it comes into range
// at radius 9.91, which a measured run reaches at about 167 seconds of 180.
// Timed, that is exactly right: the bowl unlocks in the last quarter with the
// fourth-quarter multiplier live and just enough clock to drive north and take
// it. Instrumented, it works — in range at 167, swallowed at 172.
//
// But NOTHING TOLD THE PLAYER. A finale nobody is pointed at is a landmark
// that happens to be edible, and a child in the car park with thirteen seconds
// left has no reason to look up. So the moment it becomes reachable, the game
// says so once, loudly, and the booth says it too.
//
// Only worlds that declare a hero landmark get this (COPY.hero). Of the four,
// only MAPLE FALLS has none — its biggest prop is a 6.5 town hall that comes
// into range halfway through, so a cue there would be noise. Pirate Bay's
// Royal Mariner (r10) and Lantern Night's bathhouse (r11) both qualify on
// GAME DAY's own definition and both declare one.
//
// THE WORDING IS PER-WORLD AND LIVES IN WORLD_COPY. It used to be three
// hard-coded strings about a stadium, which is what Pirate Bay and Lantern
// Night announced — naming Game Day's commentator — at the biggest moment of
// their matches. `heroProp` is resolved below as the largest edible in
// whatever world is loaded, so nothing about it was ever Game Day-specific
// except the copy.
let heroProp: Edible | null = null;
let heroCued = false, heroAte = false;
// reactive one-shots: big beats the player just caused jump the queue
const newsQueue: string[] = [];
function breakingNews(h: string) {
  if (newsQueue.length > 1) return;   // never stack a queue of cards at the player
  // The queue BYPASSES the newsroom, so it also bypassed the newsroom's own
  // 78-character ticker clip — all three hero cues ran to 84, 88 and 89 and
  // reached the card unclipped. Everything on the ticker gets the same width.
  newsQueue.push(h.length > 78 ? h.slice(0, h.lastIndexOf(' ', 78)).trim() : h);
  newsCd = Math.min(newsCd, 2.5);
}
const newsSeen: string[] = [];
// Both worlds now have their own newsroom module — ./proto3d/newsroom for
// PIRATE BAY RESORT and ./proto3d/newsroom_maple for MAPLE FALLS. What used to
// live here was one shared pool of about fifty one-liners, reused across every
// district of both islands, which is the "vanilla and boring" this replaces.
function pickHeadline(pool: string[]): string {
  const fresh = pool.filter((h) => !newsSeen.includes(h));
  const src = fresh.length ? fresh : pool;
  const h = src[Math.floor(Math.random() * src.length)];
  newsSeen.push(h); if (newsSeen.length > 5) newsSeen.shift();
  return h;
}
// fill a template from the live match. Every variable is real state, so the
// newsroom is literally narrating the player's run back to them.
function fillHeadline(t: string): string {
  const b = island.biomeAt(voidState.x, voidState.z);
  const leader = [{ n: 'YOU', s: playerScore }, ...rivals.list.map((r) => ({ n: r.name, s: r.score }))]
    .sort((a2, b2) => b2.s - a2.s)[0];
  // one rounded value drives BOTH percentages — "1% devoured, the other 100%
  // is nervous" was the newsroom failing arithmetic in front of children
  const pct = Math.min(99, Math.max(1, Math.round(devouredPct)));
  return t
    .replace('{D}', DISTRICT[b ?? 'cozy'] ?? 'THE ISLE')
    .replace(/\{M\}/g, lastMeal)
    .replace('{F}', FORMS[curStage])
    .replace('{L}', leader.n === 'YOU' ? 'the little void' : leader.n)
    .replace('{P}', String(pct))
    .replace('{R}', String(100 - pct))
    .replace('{S}', String(Math.max(1, Math.ceil(matchClock))));
}
function showNews() {
  // tier rides BOTH the meter and the player's form: a WORLD ENDER flattening
  // downtown must never get "spelling bee ends in a 14-way tie"
  // DENIAL has to last long enough to be a joke. It flipped to tier 1 at 5%
  // devoured and tier 2 at 18%, which is one or two headlines — the town went
  // from "there is no void" to "goodbye forever" before the player had eaten a
  // street. The arc is: refuse to admit it, then panic, then read the weather
  // from a field. Widened, and the form ladder now has six rungs so DEVOURER
  // rather than GOBBLER is what starts the panic.
  const formTier = curStage <= 2 ? 0 : curStage <= 3 ? 1 : 2;
  const pctTier = devouredPct < 10 ? 0 : devouredPct < 30 ? 1 : 2;
  const tier = Math.min(2, Math.max(pctTier, formTier)) as 0 | 1 | 2;
  // …and the SIGN-ON must be the first thing anyone hears. The newsroom
  // guarantees it returns the greeting on its first call, but `queue.shift() ??`
  // short-circuits — so a breaking-news one-shot fired in the opening seconds
  // would jump the queue and the station would never say good morning.
  if (!signedOn) { signedOn = true; newsQueue.length = 0; }
  const PB = pickedWorld === 'pirate';
  let h: string, brand: string;
  if (pickedWorld === 'lantern') {
    // LANTERN NIGHT is not a newsroom either — it is the market's PUBLIC
    // ADDRESS, a recorded courtesy system that has run the same announcements
    // for six hundred years and has no mechanism for noticing anything. It
    // cannot deny the void, because denial requires having considered it. The
    // arc is HOSPITALITY -> CONCERN -> ALARM rather than the denial-then-panic
    // the other three all share: tier 0 is pure courtesy, tier 1 is management
    // several floors up reading a ledger that will not stop going up, and tier
    // 2 is a person who has taken the microphone — with the recording still
    // audible underneath, because a recording does not stop for an emergency.
    const ld = String(island.biomeAt(voidState.x, voidState.z)) as LnDist;
    h = newsQueue.shift() ?? pickLanternNews({
      tier, district: (LN_DISTS.includes(ld) ? ld : null), lastMeal, devouredPct,
      form: FORMS[curStage] ?? 'VOIDLING', secondsLeft: Math.round(matchClock),
    });
    brand = LANTERN_BRAND[tier];
  } else if (pickedWorld === 'gameday') {
    // GAME DAY is not a newsroom at all — it is a COMMENTARY BOOTH. Hank
    // Prewitt has the play-by-play and Bill Ordway has the colour, and the
    // conceit is that they never stop calling the game: tier 0 is pre-game
    // chat about the weather and somebody's casserole, tier 1 is the two of
    // them describing a void in the parking lot as if it were a formation
    // they have not seen before, and tier 2 is two professionals calling the
    // end of the world because that is the job. 464 headlines.
    const gd = GAMEDAY_DIST[String(island.biomeAt(voidState.x, voidState.z))] ?? null;
    h = newsQueue.shift() ?? pickGamedayNews({
      tier, district: gd, lastMeal, devouredPct,
      form: FORMS[curStage] ?? 'VOIDLING', secondsLeft: Math.round(matchClock),
    });
    brand = GAMEDAY_BRAND[tier];
  } else if (PB) {
    // PIRATE BAY RESORT runs its own newsroom: ~380 lines, a per-district pool
    // for all seven areas, and CAPT. ROGER holding the resort's PR line all the
    // way from "enjoy a nice cold drink" to "the resort is gone, the SPA is
    // still bookable". The old shared templates were the "lame news".
    const dist = island.biomeAt(voidState.x, voidState.z);
    const lead = rivals.list.length
      ? Math.max(...rivals.list.map((r) => r.score)) - playerScore : 0;
    const top = rivals.list.slice().sort((a, b) => b.score - a.score)[0];
    h = newsQueue.shift() ?? pickNews({
      tier, district: (dist as PBDist | null), lastMeal, devouredPct,
      form: FORMS[curStage] ?? 'VOIDLING', secondsLeft: Math.round(matchClock),
      rivalName: top?.name ?? 'CHOMPZILLA', rivalLead: lead,
    });
    brand = PB_BRAND[tier];
  } else {
    // MAPLE FALLS runs its own newsroom too: the Bugle, circulation 40, across
    // nine districts plus 242 spoken lines. Mayor Dinkle is denying the void
    // exists and Marge has been protesting the same parking meter for nine
    // years. NO ELECTION — the newsroom file is rated 4+ and bars real politics
    // outright, so Dinkle is funny for refusing to admit an obvious void, not
    // for any office he holds. Do not put the election back.
    const md = MAPLE_DIST[String(island.biomeAt(voidState.x, voidState.z))] ?? null;
    const lead2 = rivals.list.length
      ? Math.max(...rivals.list.map((r) => r.score)) - playerScore : 0;
    const top2 = rivals.list.slice().sort((a, b) => b.score - a.score)[0];
    h = newsQueue.shift() ?? pickMapleNews({
      tier, district: md, lastMeal, devouredPct,
      form: FORMS[curStage] ?? 'VOIDLING', secondsLeft: Math.round(matchClock),
      rivalName: top2?.name ?? 'CHOMPZILLA', rivalLead: lead2,
    });
    brand = MAPLE_BRAND[tier];
  }
  newsEl.innerHTML = `<i>${brand}</i>${h}`;
  newsEl.className = tier === 2 ? 'panic' : tier === 1 ? 'worried' : '';
  newsEl.classList.remove('show'); void (newsEl as HTMLElement).offsetWidth; newsEl.classList.add('show');
  audio.ready();   // a soft chime so headlines register even mid-chomp
}

const GATE_GREY = new THREE.Color(0x6b6b7a);
let gateT = 0;      // throttle for the too-big-to-eat tint
// Maple's biome ids to the newsroom's district ids. Written to cover BOTH the
// old zoning and the re-zone that is landing separately, so a headline never
// falls back to "general" just because a cell got renamed.
const MAPLE_DIST: Record<string, MapleDist> = {
  cozy: 'burb', fancy: 'burb', burb: 'burb',
  downtown: 'mainst', mainst: 'mainst',   // MAIN STREET: the shopfronts and the diner
  plaza: 'civic', civic: 'civic',          // THE SQUARE: town hall, bandstand, the protest
  fair: 'fair', park: 'fair',
  forest: 'woods', woods: 'woods', camp: 'woods',
  beach: 'lake', lake: 'lake',
  farm: 'farm', campus: 'school', school: 'school', strip: 'strip',
};
// …and the same for GAME DAY. island.ts's Biome union renames three of
// gameday.ts's ids on the way out; the booth's GdDist keeps the originals.
const GAMEDAY_DIST: Record<string, GdDist> = {
  bowl: 'bowl', gate: 'plaza', plaza: 'plaza', lot: 'lot', rvpark: 'rvpark',
  greek: 'greek', quad: 'campus', campus: 'campus', practice: 'practice',
  treeline: 'woods', woods: 'woods',
};
let lastRankBrag = -99;
// ── BEING IN FRONT WAS NEVER AN EVENT ─────────────────────────────────────
// `myRank === 1` appears nowhere in the match loop — the only tests for it are
// inside endMatch(). So 5th->4th and 2nd->1st ran the identical code path: the
// same small card, the same audio.ready(), the same 20ms buzz. Taking the lead,
// which is the entire reason five rivals exist, registered as nothing, and a
// child learned they had won when the results panel told them.
//
// Debounced, not just cooled down. refreshHud samples at 5Hz and prevRank is a
// 200ms-old sample, so a crossing flaps 1-2-1-2 for a few seconds; the old
// code fired on the FIRST flap and burned its shared 12s budget there, which
// is how a real lead change ended up silent. rankHold waits for the rank to
// SETTLE before saying anything, so what gets announced is the state the
// player is actually in.
let rankHold = 0, shownRank = 0, announcedRank = 0, lastLeadBrag = -99;
let stallT = 0;     // seconds spent driving into something that will not move
let prevRank = 0;   // 0 = unset; rank-change drama needs a baseline first
function refreshHud() {
  const R = voidling.radius;
  // leaderboard: player + rivals, ranked by score
  // the chaser is FLAGGED on the board: when a name has a ⚡ next to it, that
  // is the one on the island that can eat you right now
  // ONLY WHO IS ACTUALLY ON THE ISLAND. rivals.list is this match's whole cast,
  // including the two or three who have not walked in yet, so the board was
  // ranking the player against voids that did not exist — and the end screen
  // listed every one of them, which is the "ton of voids" at the whistle.
  const rows = [{ name: 'You', color: PLAYER_COLOR, score: playerScore, me: true },
    ...rivals.list.filter((r) => r.joined)
      .map((r) => ({ name: r.hunting ? `⚡ ${r.name}` : r.name, color: r.color, score: r.score, me: false }))]
    .sort((a, b) => b.score - a.score);
  // overtaking is DRAMA — celebrate every rank gained (hole.io's rank swings)
  const myRank = rows.findIndex((r) => r.me) + 1;
  // settle first: 1.4s at the 5Hz sample rate the HUD already runs at
  if (myRank === shownRank) rankHold += 0.2; else { rankHold = 0; shownRank = myRank; }
  const settled = rankHold >= 1.4 && shownRank !== announcedRank;
  let ledJust = false;   // …so an ordinary overtake does not also fire below
  // ── FIRST PLACE GETS ITS OWN MOMENT, AND ITS OWN BUDGET ─────────────────
  // Its own cooldown, because a traded lead in the last thirty seconds is the
  // most exciting thing that can happen in a match and it must not be silenced
  // by an ordinary overtake forty seconds earlier. No holdBanner and no ×1
  // badge: the banner was measured at a 39% duty cycle and holdBanner is
  // reserved for EVOLVED and the hero prop, which is a decision worth keeping.
  if (started && !ended && settled && shownRank === 1 && prevRank > 1
      && tClock - lastLeadBrag > 6) {
    lastLeadBrag = tClock; announcedRank = shownRank;
    const chased = (rows[1]?.name ?? 'the family').replace('⚡ ', '');
    announceHtml(`<div class="bCard"><span class="bIco">👑</span><span class="bTx">`
      + `YOU ARE IN FRONT!<span class="bSub">${esc(chased)} is behind you</span></span></div>`);
    fx.ring(voidState.x, voidState.z, 0xffd23f, voidling.radius * 6, 0.9);
    fx.flash('rgba(255,210,90,0.26)', 0.3);
    audio.voice('happy'); buzz(70);
    ledJust = true;
  }
  // …and the SAME cooldown as its mirror branch below, which had one all along.
  // Without it, a player whose score sits inside a rival's band flip-flops and
  // fires the identical brag twice within a second.
  if (!ledJust && started && !ended && prevRank > 0 && myRank < prevRank
      && tClock - lastRankBrag > 12) {
    lastRankBrag = tClock; announcedRank = shownRank;
    // the board prefixes the chaser with ⚡; the sentence should not
    announce(`👑 you passed ${(rows[myRank]?.name ?? 'a rival').replace('⚡ ', '')}!`);
    audio.ready(); buzz(20);
  }
  // refreshHud runs 5x/s and rank oscillates, so this fired 18 times in one
  // measured match — the banner channel that should carry HAPPY HOUR was
  // mostly carrying rank noise. One brag per rival per 12 seconds.
  if (started && !ended && prevRank > 0 && myRank > prevRank && tClock - lastRankBrag > 12) {
    lastRankBrag = tClock;
    // a rival just passed YOU — they get to brag about it
    const passer = rows[myRank - 2];
    // …the board prefixes the chaser's row with ⚡, so match on the bare name
    const rv = passer && !passer.me ? rivals.list.find((r) => passer.name.endsWith(r.name)) : undefined;
    if (rv && RIVAL_VOICE[rv.name]) {
      bubbles.say(rivalBubblePos.set(rv.x, 5, rv.z), RIVAL_VOICE[rv.name].rankUp[Math.floor(Math.random() * 3)], 'event');
      rv.pulse = 1;
    }
  }
  prevRank = myRank;
  // EVERY VOID ON THE ISLAND, always. It was capped at the podium plus you, so
  // a family member who joined at ninety seconds and was quietly beating two
  // others never appeared at all — the owner's report was that the board "isn't
  // in line with who's joining later" and "isn't updating". It was updating; it
  // was hiding two thirds of the field. With the cast filtered to arrivals this
  // is at most six rows, and each one is a name a child recognises.
  const shown = rows;
  boardEl.innerHTML = shown.map((r) => {
    const i = rows.indexOf(r);
    return `<div class="row ${r.me ? 'me' : ''}"><span>${i + 1}</span><span class="dot" style="background:#${r.color.toString(16).padStart(6, '0')}"></span><span class="nm">${r.name}</span><span class="sc">${Math.round(r.score)}</span></div>`;
  }).join('');
  // COUNT-based, not mass-based: summed radius made the meter dead air (an
  // hour of snacking read 0% because towers own the mass). One prop = one
  // tick, so a kid sees the number move in the first minute — and Solo's
  // "devour 100%" honestly means "ate everything".
  // MINE vs THEIRS. This counted every prop eaten by ANYONE, so a player who
  // scored 31 points all match was told "85% DEVOURED" — the second-biggest
  // number on screen was mostly a report on what the family had done. Split it.
  let consumed = 0, total = 0, mine = 0;
  for (const e of edibles) { total++; if (e.eaten || !e.mesh.visible) { consumed++; if (e.mesh.userData.byPlayer) mine++; } }
  if (total > initialMass) initialMass = total;   // async-loaded meshes keep registering after boot
  devouredPct = Math.min(100, Math.round((consumed / Math.max(1, initialMass)) * 100));
  // …and the last of the island words. COPY.place is 'the island', 'the
  // resort' or 'the town' — the halfway banner is the one milestone that
  // names the place out loud, so it has to name the right one.
  if (devouredPct >= 50 && !moments.half && started && !ended) { moments.half = true; announce(`🍽️ HALF ${COPY.place}. Gone.`); }
  // A LINEAR PERCENTAGE OVER 3,286 PROPS IS A METER THAT SAYS ZERO. One percent
  // costs 33 props, so a child who has eaten two hundred things reads "6%", and
  // for the whole first half-minute the biggest number on their screen is 0.
  // Every playtest screenshot showed 0% — including the results panel of a
  // 948-point run. Lead with the COUNT, which is a number that moves on every
  // single bite, and keep the percentage as the meter underneath it.
  const minePct = Math.min(100, Math.round((mine / Math.max(1, initialMass)) * 100));
  devPlayerPct = minePct; devFamilyPct = Math.max(0, devouredPct - minePct);   // QA readout
  devMineN = mine; devAllN = consumed;
  const themPct = Math.max(0, devouredPct - minePct);
  // ONE LINE. The "you 1% · family 3%" sub-line was a second HUD block under
  // the timer that a child cannot act on mid-match — it is a post-match stat,
  // and it is on the results screen. Dropping it removes a whole layer from
  // the busiest part of the screen and lets the news card move up.
  void themPct;
}

// ── WHAT THE BAR ACTUALLY MEASURES ─────────────────────────────────────────
// Growth is AREA-based: growRadius does R² += 0.5·eR²·k, so the currency the
// player is feeding the void is R², not R. The bar was linear in R, which
// means an identical prop moved it less and less the further into a form you
// got — measured across the DEVOURER band (3.6→5.5), one 1-unit prop moved it
// 1.8% at the bottom and 1.0% at the top, a 45% falloff for eating exactly the
// same thing. On the R² axis the same two bites read 1.4% and 1.2%, and what
// is left is the intended `diminish` term rather than an artefact of the axis.
const formProgress = (r: number) => {
  const st = stageFor(r);
  const lo = FORM_MIN[st], hi = FORM_MIN[st + 1] ?? R_CAP;
  return THREE.MathUtils.clamp((r * r - lo * lo) / Math.max(1e-4, hi * hi - lo * lo), 0, 1);
};
// the pips: every form still ahead, drawn on the track once per evolution
let gPipStage = -1;
function paintGrowth(r: number) {
  const st = stageFor(r);
  if (st !== gPipStage) {
    gPipStage = st;
    gNowEl.textContent = FORMS[st];
    const nxt = FORMS[st + 1];
    gNextEl.innerHTML = nxt ? `NEXT <b>${nxt}</b>` : '<b>MAXED OUT</b>';
    growthEl.classList.toggle('max', !nxt);
    // one pip per remaining form, spaced across what is LEFT of the journey —
    // "three more to go" is the thing a child wants off this bar
    for (const p of Array.from(gTrackEl.querySelectorAll('.gPip'))) p.remove();
    const left = FORMS.length - 1 - st;
    for (let i = 1; i < left; i++) {
      const pip = document.createElement('div');
      pip.className = 'gPip';
      pip.style.left = `${(i / left) * 100}%`;
      gTrackEl.appendChild(pip);
    }
  }
  gMEl.textContent = `${Math.round(r * 1.6)}m`;
  gFillEl.style.width = `${(formProgress(r) * 100).toFixed(2)}%`;
}

// rank ladder (hole.io placement points: 20/10/5/2/1) + daily streak
let xp = Number(localStorage.getItem('voidXP') || 0);
let streak = Number(localStorage.getItem('voidStreak') || 0);
// ── ONE COUNTER, ONE DAY GATE ─────────────────────────────────────────────
// `voidDailyStreak` is the count and `voidStreakDay` is the day it was last
// counted. Both writers — the daily calendar and the end of a match — read and
// write exactly these two, so the streak advances once a day no matter which
// of them the child reaches first.
//
// It did not used to. bumpStreak() had its own gate (`voidLastDay`) and its own
// arithmetic, and the calendar had `voidDailyLast`, so on any ordinary day —
// open the menu, claim the card, play a match — the counter moved TWICE.
// Measured: claim on day six set it to 6, the match pushed it to 7, the rank
// chip then read 🔥7 beside a card that had just said 6, and Prism, the SEVEN
// day prize, unlocked at the end of day SIX announcing "7 DAYS IN A ROW".
//
// Migration: existing installs have no voidStreakDay. Seed it from whichever
// of the two old gates ran last, or the streak they are on resets to 1 the
// first time they open this build.
if (!localStorage.getItem('voidStreakDay')) {
  const a = localStorage.getItem('voidDailyLast') || '';
  const bq = localStorage.getItem('voidLastDay') || '';
  const today = new Date().toDateString();
  const seed = [a, bq].includes(today) ? today
    : [a, bq].find((d) => d) || '';
  if (seed) localStorage.setItem('voidStreakDay', seed);
  // …and the count itself, if only the old voidStreak mirror was ever written
  if (!localStorage.getItem('voidDailyStreak') && streak > 0) {
    localStorage.setItem('voidDailyStreak', String(streak));
  }
}
// per-level XP spans: the first levels pop in 1-2 matches, MASTER is a season
const XP_SPANS = [20, 30, 40, 50, 60, 75, 90, 105, 120, 140, 160, 190, 220, 250, 300, 400];
// ONE LADDER, FIVE RUNGS, VISIBLE DOUBLING. There were five price points
// inside a single tier with 1.2x steps between them (600/600/600/750/750/750/
// 900/900/900/1500), which is noise a child cannot rank — Royal cost 2.5x
// Nebula and wore the identical ribbon. The whole coin catalogue was 9,450
// coins; it is now 2,700, and every rung is a different colour.
//
// ── THE "19 MATCHES" HERE WAS WRONG, AND SO WAS THE 139 IT CAME FROM ──────
// Both were inherited, neither was ever measured end to end, and qa/_econ.mjs
// — the only thing that could have checked — had been dispatching its input at
// a shop thumbnail since the hat grid shipped, so it reported a number for a
// void that never moved.
//
// With that fixed, three full Maple matches pay 692, 500 and 554 coins. The
// ENTIRE 2,700-coin catalogue is four to five matches. Not nineteen — four.
//
// AND THE PAYOUT BARELY NOTICES HOW WELL YOU PLAY. The 554 came from a driver
// rewritten specifically to be bad: it stalls a third of the time, aims to
// plus or minus sixty degrees, and chases a random nearby prop 30% of the
// time including ones too big to eat. It scored 228,314 — HIGHER than the
// near-optimal run's 186,835 — and still placed 1st of 6.
//
// Read that carefully rather than triumphantly. At one run per driver the
// spread between runs (150k to 228k) is wider than any gap between drivers,
// so this does NOT establish that skill is irrelevant; it establishes that a
// single run cannot tell them apart, which is a reason not to trust a
// per-driver number without repeats. What survives either way is the range:
// somewhere around 500-700 coins a match across a wide band of play quality,
// which is all a price needs.
//
// One thing that is worth someone's attention outside the shop: a driver
// built to play badly still won its match. Whatever that says about the
// rivals, it is not a coin-economy question.
//
// Last caveat. Most of the payout is in-match pickups rather than the
// results-screen bonus (the score term is a log curve capped at 300), so it
// scales with how much you EAT — and these drivers ate 1,300-1,700 things.
//
// What is certain either way: a coin catalogue this size is exhausted almost
// immediately, and after that coins buy nothing at all. That is a content
// question (more voids to earn), not a pricing one — and hats are deliberately
// NOT the answer, because hats are the slot that takes money.
// THE LADDER, RE-CUT AGAINST THE MEASUREMENT. Ten rungs instead of five, and
// each one is roughly a third dearer than the last, so a child can always see
// the next thing and it is always further than the one before. First rung
// inside a single match — a first session should end with a purchase — and the
// whole set around thirty matches at 550✦, which is a collection rather than
// an afternoon.
const PRICES: Record<string, number> = {
  classic: 0, toxic: 150, sunset: 300, ocean: 500, candy: 800, honey: 1100,
  lagoon: 1500, neon: 2000, lemon: 2600, silver: 3300, chilli: 4200,
};
/** THE NEXT THING TO CHASE. The results screen stated an outcome and offered a
 *  button; it never stated a goal, which is the moment a child decides whether
 *  there is a reason to press PLAY AGAIN. Cheapest skin they don't own yet. */
function nextGoal(): { label: string; have: number; need: number } | null {
  let owned: Set<string>;
  try { owned = new Set<string>(JSON.parse(localStorage.getItem('voidSkinsOwned') || '["classic"]')); }
  catch { owned = new Set(['classic']); }
  let best: { id: string; p: number } | null = null;
  for (const sk of SKINS) {
    const p = PRICES[sk.id];
    if (p === undefined || p <= 0 || owned.has(sk.id)) continue;
    if (!best || p < best.p) best = { id: sk.id, p };
  }
  if (!best) return null;
  const nm = SKINS.find((sk) => sk.id === best!.id)?.name ?? best.id;
  return { label: nm.toUpperCase(), have: coins, need: best.p };
}
// THE LADDER HAS NO TOP. It used to stop dead at LVL 17: sixteen authored
// spans totalling 2,250 XP, and a match pays 30-115. A child who plays every
// day reaches the end in a few weeks, and from then on every results screen
// shows the same level and a bar that is already full — the one element on
// that screen whose entire job is to say "you moved" says "you did not".
//
// Past the authored spans the ladder continues forever at a flat XP_TAIL, and
// two tiers open above MASTER so the number is not the only thing that moves.
// Nothing about the early game changes: levels 1-17 cost exactly what they did.
const XP_TAIL = 450;
function rankInfo(x: number) {
  let lvl = 1, rem = x, span = XP_SPANS[0];
  for (const sp of XP_SPANS) {
    span = sp;
    if (rem < sp) break;
    rem -= sp; lvl++;
  }
  if (lvl > XP_SPANS.length) {   // past the authored ladder — keep climbing
    span = XP_TAIL;
    lvl += Math.floor(rem / XP_TAIL);
    rem %= XP_TAIL;
  }
  const t = lvl >= 30 ? ['🌌', 'VOID LORD'] : lvl >= 22 ? ['🌟', 'LEGEND']
    : lvl >= 15 ? ['👑', 'MASTER'] : lvl >= 12 ? ['💎', 'DIAMOND'] : lvl >= 9 ? ['💠', 'PLATINUM']
    : lvl >= 6 ? ['🥇', 'GOLD'] : lvl >= 3 ? ['🥈', 'SILVER'] : ['🥉', 'BRONZE'];
  return { lvl, ic: t[0], nm: t[1], prog: Math.min(1, rem / span) };
}
function renderRank() {
  const r = rankInfo(xp);
  const st = streak >= 2 ? ` · 🔥${streak}` : '';
  el('rankChip').innerHTML = `${r.ic} ${r.nm} · LVL ${r.lvl}${st}<div class="rkBar"><div style="width:${Math.round(r.prog * 100)}%"></div></div>`;
}
/** Count today, if nobody has yet. The daily calendar does the same job from
 *  the other end; whichever runs first wins and the other is a no-op. */
function bumpStreak() {
  const today = new Date().toDateString();
  const last = localStorage.getItem('voidStreakDay');
  if (last === today) return;                       // already counted today
  const yd = new Date(Date.now() - 86400000).toDateString();
  const n = last === yd ? Number(localStorage.getItem('voidDailyStreak') || 0) + 1 : 1;
  localStorage.setItem('voidDailyStreak', String(n));
  localStorage.setItem('voidStreakDay', today);
  // voidLastDay is kept written for anything still reading it, but it is no
  // longer what decides the streak — that was the second gate that caused the
  // double count.
  localStorage.setItem('voidLastDay', today);
  setStreak(n);
}
/** The single writer for the streak the chip, the shop and the calendar share. */
function setStreak(n: number): void {
  streak = n;
  localStorage.setItem('voidStreak', String(n));
  renderRank();
  unlockStreakSkins(n);
}

// ── THE STREAK REWARD WAS ARRIVING IN SILENCE ──────────────────────────────
// A child comes back seven days running. The daily modal fires its confetti
// for the coins, and Prism — the thing those seven days were FOR — was granted
// by a line inside the shop's own refresh(): no announcement, no sound, not
// even a state change they could see, because refresh() only runs if the shop
// is open. So the reward was discoverable only by opening the shop and
// noticing that a card had quietly changed from a lock to OWNED.
//
// It is granted here instead, at the moment the streak is actually earned, and
// it says so. Anything unlocked is also flagged NEW until the child has looked
// at it, which is the difference between owning something and knowing you do.
function unlockStreakSkins(n: number): void {
  let owned: string[];
  try { owned = JSON.parse(localStorage.getItem('voidSkinsOwned') || '["classic"]'); }
  catch { owned = ['classic']; }
  const have = new Set(owned);
  const won = SKINS.filter((s) => s.streak && n >= s.streak && !have.has(s.id));
  if (!won.length) return;
  for (const s of won) have.add(s.id);
  localStorage.setItem('voidSkinsOwned', JSON.stringify([...have]));
  let fresh: string[];
  try { fresh = JSON.parse(localStorage.getItem('voidSkinsNew') || '[]'); } catch { fresh = []; }
  localStorage.setItem('voidSkinsNew', JSON.stringify([...new Set([...fresh, ...won.map((s) => s.id)])]));
  // tell the shop, if it has already built its own copy of the set
  _dbg.__skinsGranted?.(won.map((s) => s.id));
  for (const s of won) {
    track('streak_skin', { skin: s.id, days: s.streak, streak: n });
  }
  // …and SHOW it. Two earlier attempts at this line were both still silent in
  // practice, for the same reason twice over: announce() escapes its argument,
  // so a message written with a <br> printed the tag; and #banner is HUD, hidden
  // by `body.menu { display: none }` — and a streak can only ever advance from
  // the daily card, which only opens ON the menu. Every word sent to the banner
  // here was posted to an element that was not on screen.
  //
  // The preview modal is the surface that works: it is a menu overlay, and it
  // renders the actual void alive and turning instead of naming it. Delayed
  // past the daily card's own 750ms close so the two do not stack.
  //
  // Biggest prize last — a fresh player who reaches day 7 collects Ember and
  // Prism together, and Prism is the one to end on.
  const order = [...won].sort((a, b) => (a.streak ?? 0) - (b.streak ?? 0));
  setTimeout(() => _dbg.__celebrateSkins?.(order), 1400);
}
// the end screen is THE retention moment — the reward has to land as a beat,
// not a gray sub-line: warm sting, coins visibly counting up, rows sliding in
function celebrateEnd(coins: number, xpGain: number, lead: string, won = false) {
  endSub.innerHTML = `${lead}<br><b class="endCnt">+0✦</b> · +${xpGain} XP`;
  if (won) {
    // champion confetti: two dozen falling sparks over the end screen
    for (let i = 0; i < 24; i++) {
      const sp = document.createElement('span');
      sp.className = 'endConf';
      sp.textContent = i % 3 ? '✦' : '●';
      sp.style.left = `${Math.random() * 100}%`;
      sp.style.color = ['#ffd23f', '#b875ff', '#7ef2a0', '#ff7da8'][i % 4];
      sp.style.animationDelay = `${Math.random() * 0.8}s`;
      endEl.appendChild(sp);
      setTimeout(() => sp.remove(), 3200);
    }
  }
  const b = endSub.querySelector('.endCnt') as HTMLElement;
  const t0 = performance.now();
  const tick = () => {
    if (!ended || !b.isConnected) return;
    const k = Math.min(1, (performance.now() - t0) / 900);
    b.textContent = `+${Math.round(coins * (k * (2 - k)))}✦`;   // ease-out count-up
    if (k < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function endMatch() {
  // the crowd stops fleeing behind the results panel — the world back there
  // should look alive, not mid-evacuation with nothing chasing it
  life.calm(Infinity);
  ended = true;
  localStorage.setItem('voidPlayed', '1');
  audio.stopMusic();
  audio.win();
  bumpStreak();
  if (soloMode) {
    // SOLO RUN: the goal is the island itself — beat your best %
    const best = Number(localStorage.getItem('voidBestPct') || 0);
    const newBest = devouredPct > best;
    if (newBest) localStorage.setItem('voidBestPct', String(devouredPct));
    const gain2 = 8 + (newBest ? 8 : 0);
    xp += gain2; localStorage.setItem('voidXP', String(xp)); renderRank();
    const reward2 = Math.max(5, Math.min(80, Math.round(devouredPct * 0.8))) + (newBest ? 20 : 0);
    addCoins(reward2);
    if (devouredPct >= 40) questEvent('solo40');
    endHd.textContent = `${devouredPct}% DEVOURED`;
    celebrateEnd(reward2, gain2, newBest ? 'NEW BEST!!' : `best: ${Math.max(best, devouredPct)}%`);
    endList.innerHTML = '';
    endEl.classList.add('show');
    stats.matches++; saveStats();
    countMatch();
    track('match_end', {
      solo: true, sec: elapsed(), score: Math.round(playerScore),
      eaten: matchEaten, pct: devouredPct, form: curStage, coins: reward2, xp: gain2,
      ...fpsSummary(),
    });
    return;
  }
  // the same filter as the live board: only voids that actually turned up. This
  // listed the whole cast including the ones who never arrived, which is why a
  // three-rival match ended on a screen full of names at zero.
  const rows = [{ name: 'You', color: PLAYER_COLOR, score: playerScore, me: true },
    ...rivals.list.filter((r) => r.joined)
      .map((r) => ({ name: r.name, color: r.color, score: r.score, me: false }))]
    .sort((a, b) => b.score - a.score);
  const myRank = rows.findIndex((r) => r.me) + 1;
  // everyone leaves with something; winning is 5x last place, not infinity-x
  const today = new Date().toDateString();
  // The score term was min(60, score/50) — SATURATED at 3,000 points, which a
  // logged match crossed at thirty-five seconds. A 134,063-point run and a
  // 53,259-point run both paid exactly +160 coins. Two thirds of every match
  // was unpaid, and playing twice as well paid nothing at all: the game was
  // rewarding a child for stopping after half a minute. A log curve keeps
  // climbing — 3k pays 60, 20k pays 137, 130k pays 219 — without ever letting
  // one enormous run out-earn a week of ordinary ones.
  const scoreCoins = Math.floor(60 * Math.log10(1 + playerScore / 500) / Math.log10(7));
  let reward = ([50, 35, 25, 15, 10][myRank - 1] ?? 10) + Math.min(300, scoreCoins);
  if (myRank === 1 && localStorage.getItem('voidFirstWinDay') !== today) {
    localStorage.setItem('voidFirstWinDay', today); reward += 50;
  }
  addCoins(reward);
  // …and XP saturated at 4,000, crossed at about the same moment
  const scoreXp = Math.floor(22 * Math.log10(1 + playerScore / 800) / Math.log10(6));
  let gain = ([25, 18, 12, 8, 5][myRank - 1] ?? 5) + Math.min(90, scoreXp);
  if (localStorage.getItem('voidFirstMatchDay') !== today) { localStorage.setItem('voidFirstMatchDay', today); gain += 10; }
  // LEVELLING UP WAS SILENT. XP increments, persists and renders correctly —
  // on the MENU, which a player who only ever taps PLAY AGAIN never sees.
  // Verified across three back-to-back matches crossing three level boundaries
  // with no acknowledgement on any results screen. A ladder nobody is told
  // they are climbing is not a ladder.
  const lvlBefore = rankInfo(xp).lvl;
  xp += gain; localStorage.setItem('voidXP', String(xp)); renderRank();
  const rankAfter = rankInfo(xp);
  const leveledTo = rankAfter.lvl > lvlBefore ? rankAfter.lvl : 0;
  // lifetime stats + weekly best
  stats.matches++;
  if (myRank === 1) stats.wins++;
  stats.best = Math.max(stats.best, Math.round(playerScore));
  stats.bestForm = Math.max(stats.bestForm, curStage);
  saveStats();
  const wk = weekKey();
  localStorage.setItem(wk, String(Math.max(Number(localStorage.getItem(wk) || 0), Math.round(playerScore))));
  const WIN_TITLES = COPY.winTitles;
  const LOSE_TITLES = ['STILL HUNGRY!', 'OUT-NOMMED!', 'SO CLOSE TO DELICIOUS', 'THE ISLAND SURVIVED. RUDE.', 'SNACK-SIZED THIS TIME'];
  endHd.textContent = myRank === 1 ? WIN_TITLES[Math.floor(Math.random() * WIN_TITLES.length)]
    : `#${myRank} · ${LOSE_TITLES[Math.floor(Math.random() * LOSE_TITLES.length)]}`;
  celebrateEnd(reward, gain, myRank === 1 ? COPY.winSub : `${rows[0].name} devoured the most`, myRank === 1);
  // THE RUN'S OWN NUMBERS. % DEVOURED was shown in Solo and nowhere else — the
  // figure a child watched climb for three minutes simply vanished at the
  // whistle — and nothing on the screen compared this run to their best.
  {
    // per-world best too, so each poster in the picker carries its own number
    {
      const wk = `voidBest_${pickedWorld}`;
      const wb = Number(localStorage.getItem(wk) || 0);
      if (Math.round(playerScore) > wb) localStorage.setItem(wk, String(Math.round(playerScore)));
    }
    const pb = Number(localStorage.getItem('voidBestScore') || 0);
    const isPb = Math.round(playerScore) > pb;
    if (isPb) localStorage.setItem('voidBestScore', String(Math.round(playerScore)));
    renderFinds(); paintBookChip();
    const st = el('endStats');
    st.innerHTML =
      // DEVOURED read the share of the WHOLE ISLAND that vanished, counting
      // every rival's meal as well as yours. Maple Falls carries 3,297 props,
      // so one percent costs 33 of them and a real match lands in single
      // digits — the headline number on the results screen was "1%", most of
      // which somebody else ate. It is the same dead-air problem the live HUD
      // already solved by leading with the count.
      //
      // Your share OF WHAT WAS EATEN is the stat this screen wants: it is
      // about you, it answers the question the match actually posed (did I
      // out-eat the family), and against six voids it sits in a range a child
      // can read. EATEN, right beside it, still gives the raw count.
      `<div class="es"><i>YOUR SHARE</i><b>${devAllN ? Math.round((devMineN / devAllN) * 100) : 0}%</b></div>` +
      `<div class="es"><i>EATEN</i><b>${matchEaten}</b></div>` +
      `<div class="es"><i>BIGGEST</i><b>${FORMS[curStage]}</b></div>` +
      `<div class="es${isPb ? ' pb' : ''}"><i>${isPb ? 'NEW BEST!' : 'YOUR BEST'}</i><b>${Math.round(isPb ? playerScore : pb)}</b></div>`;
    // the rank row: tier, level, the bar, and a LEVEL UP! beat when it moved
    const rk = rankInfo(xp);
    st.innerHTML +=
      `<div class="es rk${leveledTo ? ' up' : ''}"><i>${leveledTo ? 'LEVEL UP!' : rk.nm}</i>` +
      `<b>${rk.ic} LVL ${rk.lvl}</b>` +
      `<div class="xpb"><div style="width:${Math.round(rk.prog * 100)}%"></div></div></div>`;
    if (leveledTo) { audio.evolve(); buzz(70); }
    // ── TODAY'S QUESTS, on the screen where "what next" is the live question.
    // The board pays a +25 completion bonus and was, until now, invisible.
    {
      const qs = el('endQuests');
      const open2 = quests.filter((q) => !q.done);
      qs.className = 'on';
      qs.innerHTML = '<div class="eqh">TODAY</div>' + quests.map((q) => {
        // the pool's labels carry their own "Name: do the thing" prefix, which
        // is a lot of words on a results screen — keep the instruction only
        const said = q.label.includes(':') ? q.label.split(':').slice(1).join(':').trim() : q.label;
        return `<div class="eq${q.done ? ' done' : ''}"><span class="eqi">${q.icon}</span>`
          + `<span class="eqt">${said}</span>`
          + `<span class="eqn">${q.done ? '✓' : `${Math.min(q.count, q.target)}/${q.target}`}</span></div>`;
      }).join('')
        + (open2.length ? '' : '<div class="eqh" style="color:#7ef2a0">ALL DONE — COME BACK TOMORROW</div>');
    }
    const g = nextGoal();
    const nx = el('endNext');
    if (g) {
      const k = Math.min(1, g.have / g.need);
      // It said UNLOCKED when the skin was merely AFFORDABLE — the shop card
      // still reads "locked" at its price until the child pays — and then
      // offered no way to "go and get it", because #end is a full-screen
      // overlay whose only two buttons are PLAY AGAIN and HOME. Tell the truth,
      // and put the door in the room.
      nx.innerHTML = g.have >= g.need
        ? `✦ you can afford the <b>${g.label}</b> skin!<div class="nb"><div style="width:100%"></div></div>`
          + `<button id="endShop" class="goShop">OPEN SHOP →</button>`
        : `${g.need - g.have}✦ to the <b>${g.label}</b> skin<div class="nb"><div style="width:${Math.round(k * 100)}%"></div></div>`;
      const gs = document.getElementById('endShop');
      if (gs) gs.addEventListener('click', () => {
        track('shop_view', { coins, from: 'end' });
        endEl.classList.remove('show');
        document.body.classList.add('menu');
        menuEl.style.display = '';
        el('shop').classList.add('show');
        // …AND PAINT IT. The cards are live renders that only start when
        // __shopTab() runs, and #btnShop has called it since the day the
        // comment beside it was written: "without this the first thing a child
        // sees is thirteen empty gradients until they touch something."
        // That fix went on the menu button only. This is the other door, and
        // it is the one a child arrives at holding the coins the card just
        // told them they could spend — so it opened on a grid of blanks at the
        // exact moment the shop had earned their attention.
        requestAnimationFrame(() => { _dbg.__shopTab?.(); });
      });
    } else nx.innerHTML = '';
  }
  endList.innerHTML = rows.map((r, i) =>
    `<div class="er ${r.me ? 'me' : ''}" style="animation-delay:${0.15 + i * 0.12}s"><span>${r.me && i === 0 ? '👑' : i + 1}</span><span class="dot" style="background:#${r.color.toString(16).padStart(6, '0')}"></span><span class="nm">${r.name}</span><span class="sc">${Math.round(r.score)}</span></div>`).join('');
  endEl.classList.add('show');
  countMatch();
  track('match_end', {
    sec: elapsed(), score: Math.round(playerScore), eaten: matchEaten,
    pct: devouredPct, place: myRank, form: curStage, coins: reward, xp: gain,
    lvl_up: leveledTo, lvl: rankInfo(xp).lvl, bites: rivalEv.bites, hunter_bites: rivalEv.hunterBites,
    ate_rivals: rivalEv.eaten, top: Math.round(rows[0].score), ...fpsSummary(),
  });
}

// devour one edible: spiral it in, grow, score (2D combo model), charge hunger
let combo = 0, comboT = 0, chompCd = 0;
// once-per-match milestone banners (hole.io celebrates the firsts)
const moments = { firstBuilding: false, firstCar: false, firstRival: false, half: false, last30: false };
const floatPos = new THREE.Vector3();
function capture(e: Edible, giveHunger = true) {
  const dx = e.mesh.position.x - voidState.x, dz = e.mesh.position.z - voidState.z;
  const d = Math.hypot(dx, dz) || 1;
  e.eaten = true; e.t = 0; e.orbit = Math.atan2(dz, dx);
  setShadowInstance((e.mesh.userData.shIdx as number) ?? -1, false);   // its shadow goes with it
  // THE SPIRAL STARTED WITH A TELEPORT. capture() fires while the prop is still
  // out at d < R + e.radius*0.7, and this line then MOVED it to at least
  // 0.6 x R — so on exactly the bites a child cares about, the big ones taken
  // at the rim, the object jumped inward by up to a third of the void's width
  // on the capture frame. Keep the inner clamp (a prop that is already past the
  // centre should not spiral outwards) and otherwise start where it actually is.
  e.orbitR = Math.min(d, voidling.radius * 0.9);
  e.mesh.userData.eaten = true;
  // topple toward the hole (the hole.io fantasy): the tip axis is perpendicular
  // to the pull direction, so things visibly keel over INTO the void
  e.spin.set((dz / d) * rand(4.5, 7.5), rand(-1.5, 1.5), (-dx / d) * rand(4.5, 7.5));
  // HOW BIG WAS THAT, RELATIVE TO ME? Everything below is graded by it, which
  // is the whole point: one number separates a landmark from a traffic cone.
  const bite = THREE.MathUtils.clamp(e.radius / Math.max(0.4, voidling.radius), 0.12, 1);
  voidling.setRadius(growRadius(voidling.radius, e.radius));   // area-based growth
  // …and the blob LUNGES past its new size rather than easing to it
  voidling.impulse(Math.min(2.2, e.radius * 0.9));
  // THE WORLD STOPS for a big one. Gated at 0.55 so it is a landmark event,
  // never a hoover spree, and hitStop() carries its own cooldown as well.
  if (bite > 0.55) hitStop(0.055 + 0.05 * bite);
  combo++; comboT = 1.6;
  if (combo > (stats.combo ?? 0)) { stats.combo = combo; saveStats(); }
  // ── THE COMBO IS WHY NOBODY CAN CATCH THE PLAYER ──────────────────────────
  // Five attempts to close the race by feeding the family have now failed, four
  // of them by multiplying an earnings rate that was throttled elsewhere. The
  // measurement that reframes it: the family is food-limited in ABSOLUTE terms
  // (~70k a match) while the player reaches ~150k, and the lane the family
  // chases is 0.94 x the PLAYER's score. So the target moves away from them
  // exactly as fast as the player's multiplier inflates it.
  //
  // 1 + min(combo,25)*0.1 tops out at 3.5x, and on a map this dense it never
  // lapses — comboT resets to 1.6s on every bite and the player eats far more
  // often than that, so the multiplier is effectively a constant 3.5 for most
  // of a match rather than a reward for a streak.
  //
  // Sub-linear fixes both halves at once, and it is BETTER early: at combo 5 it
  // pays 1.54x where linear paid 1.50, so a child sees COMBO x2 sooner; at the
  // 25 ceiling it pays 2.20x instead of 3.50x, cutting the score inflation that
  // put the field out of reach. The lane comes down with it, to a number the
  // family can actually earn.
  // 0.24 is the measured optimum: pushing to 0.18 gave 59.8% of lane (sd 14.2)
  // against 62.2% (sd 9.2) — no gain, because the lever SATURATES. The lane is
  // 0.94 x pScore and the band is want/score, so lowering the player lowers the
  // family's target AND their multiplier in the same proportion. The ratio is
  // scale-invariant and pins near 60% whatever the player scores. Only the
  // family's RAW earning capacity is not scale-invariant, so that is where the
  // rest of this fight has to happen.
  const comboMult = 1 + Math.sqrt(Math.min(combo, 25)) * 0.24;
  // moving prey (people/animals/cars — tagged ptsMult 1.5) beats furniture of
  // the same size: chasing pays. Everything else stays radius-proportional.
  const preyMult = (e.mesh.userData.ptsMult as number | undefined) ?? 1;
  const pts = Math.max(1, Math.round(e.radius * 12 * comboMult * preyMult * feverMult));
  playerScore += pts;
  // ── A FIND ────────────────────────────────────────────────────────────
  // Loud, and immediately: this is the only thing in the game a child keeps.
  const sid = e.mesh.userData.sticker as string | undefined;
  if (sid) {
    const got = collectInRun(sid);
    if (got) {
      playerScore += TIER_POINTS[got.tier];
      announceBeat('⭐', 'STICKER FOUND!', got.name.toUpperCase(), 1);
      audio.voice('yum');
      fx.ring(e.mesh.position.x, e.mesh.position.z, 0xffd25a, 14, 0.7);
      spawnPuff(e.mesh.position.x, 1.2, e.mesh.position.z, 14);
      buzz(30);
      breakingNews(`${got.name} has gone. It was ${got.where.toLowerCase()} the whole time.`);
      // FIRST ONE EVER. Nothing else in the game says the Scrapbook exists, so
      // without this a child gets a nice banner, never opens the menu card,
      // and never learns there are forty seven more.
      let seen = '1';
      try { seen = localStorage.getItem('voidBookSeen') ?? ''; } catch { /* private mode */ }
      if (!seen) {
        try { localStorage.setItem('voidBookSeen', '1'); } catch { /* private mode */ }
        setTimeout(() => announceBeat('📗', 'YOUR SCRAPBOOK',
          `${totalCount() - 1} MORE ARE HIDDEN OUT THERE`, 1), 2600);
      }
    }
  }
  // remember the last meal so the news can report on it BY NAME
  lastMeal = MEAL_NAME[(e.mesh.userData.qk as string) ?? ''] ?? mealOf(e);
  if (giveHunger) hunger = Math.min(1, hunger + 0.03);
  // THE BURST IS MADE OF WHAT WENT IN, and there is more of it for a bigger
  // meal. Three particles was the same amount of spectacle for a traffic cone
  // and a house; the count now rides the radius the way every other cue in the
  // game does. Small things still fizz rather than explode — 4 at r0.5, 12 at
  // the top of the range.
  const tint = propTint(e.mesh);
  spawnPuff(e.mesh.position.x, voidling.group.position.y, e.mesh.position.z,
    Math.round(3 + Math.min(9, e.radius * 2.2)), tint);
  // a building-sized bite lands with a ground shockwave + dust — seismic,
  // but deliberately NO camera shake (kids found the shake unpleasant)
  if (e.radius > 2) {
    audio.voice('yum');
    // …and the shockwave ring takes the prop's colour too, instead of the
    // house violet it used whatever it had just flattened
    fx.ring(e.mesh.position.x, e.mesh.position.z, tint.getHex(), e.radius * 3, 0.45);
    spawnPuff(e.mesh.position.x, 0.5, e.mesh.position.z, e.radius > 4 ? 10 : 6, tint);
  }
  voidling.chomp(bite);   // graded by how big that was relative to us
  stats.eaten++; matchEaten++;
  // the very first thing a brand-new player ever eats gets a PARTY — the
  // guaranteed wow inside the first 30 seconds
  // …and it has to be a bite the child MEANT. The first launch auto-starts
  // into a live match, so the void drifts into a prop and burns this on its
  // own: measured at 913ms after the match went live with zero taps recorded,
  // and in one run 657ms BEFORE the title card had even faded in over the top
  // of it. The one designed celebration in the game was being spent before the
  // child touched the screen, and their real first bite then got nothing.
  // nomArmed is set true by the first genuine drag (see the pointer handler).
  if (nomArmed && !localStorage.getItem('voidFirstNom')) {
    localStorage.setItem('voidFirstNom', '1');
    bubbles.float(floatPos.set(e.mesh.position.x, voidling.radius + 3, e.mesh.position.z), 'FIRST NOM! 🎉', true);
    fx.ring(e.mesh.position.x, e.mesh.position.z, 0xffd23f, 7, 0.6);
    audio.ready(); buzz(25);
  }
  // …AND THE SAME TRAP CAUGHT THE LESSON THAT TEACHES THE CONTROL. This used
  // to advance on `stats.eaten > 2 && tClock > 4` alone, and the void's
  // gravity well feeds itself: a child who never touches the screen still eats
  // four props in the first few seconds. So the drag lesson — authored for six
  // seconds, and the ONLY thing in the game that says how to move — was
  // measured surviving 1.38s with the child driving and 2.76s with the child
  // sitting there, overwritten by a sentence about eating things they had not
  // learned to reach yet. `nomArmed` is already the "a real drag happened"
  // flag (pointer handler, joy.mag > 0.25); the lesson now waits for it.
  if (guideStep === 1 && nomArmed && stats.eaten > 2 && tClock > 4) { guideStep = 2; showGuide('eat everything <b>smaller than you</b> — grow!', 6); }
  // juice: score floater on the morsel, flair on big bites and hot combos
  floatPos.set(e.mesh.position.x, voidling.radius + 2, e.mesh.position.z);
  const coinVal = e.mesh.userData.coin as number | undefined;
  if (coinVal) { addCoins(coinVal); bubbles.float(floatPos, `+${coinVal}✦`, true); }
  else bubbles.float(floatPos, `+${pts}`);
  // CHOMP! is an EVENT, not wallpaper. The growth law parks the player just
  // above their staple food size, so the bar is "bigger than YOU" + a long
  // cooldown — a couple of CHOMPs a match, each one earned.
  if (e.radius > voidling.radius && tClock > chompCd) {
    chompCd = tClock + 7;
    bubbles.float(floatPos, 'CHOMP!', true); audio.bigEat(); buzz(30);
  } else { audio.pop(combo, e.radius, voidling.radius); buzz(e.radius > 2 ? 15 : 8); }
  if (combo > 0 && combo % 5 === 0) bubbles.float(floatPos, `COMBO ×${comboMult.toFixed(1)}`, true);
  // ── THE HAT HAS OPINIONS ────────────────────────────────────────────────
  // Legendary hats only, and RARELY. A hat that comments on every bite is a
  // hat a child mutes inside one match; one that pipes up every half-minute
  // or so, on a bite that actually mattered, is a hat with a personality —
  // and personality is the whole thing being sold at this tier.
  //
  // Gated on a BIG meal rather than on a timer alone, so the line always
  // lands on something the child just did and feels like a reaction. Sharing
  // the chomp cooldown would tie it to a rarer event than intended, so it
  // keeps its own, and it never speaks over the CHOMP! callout.
  if (tClock > hatSayCd && e.radius > voidling.radius * 0.55 && tClock > chompCd - 6.4) {
    const line = hatLine(voidling.hatId);
    if (line) {
      hatSayCd = tClock + 26 + Math.random() * 16;
      bubbles.say(rivalBubblePos.set(voidState.x, voidling.radius * 2.1 + 2.6, voidState.z), line, 'event');
    }
  }
  // quest + milestone hooks (tagged at spawn: qk = 'car' | 'house' | 'big')
  e.mesh.userData.byPlayer = true;   // the DEVOURED meter is split you-vs-family
  const qk = e.mesh.userData.qk as string | undefined;
  if (e.radius < 1) questEvent('snack');
  if (e.radius >= 6) questEvent('big');   // landmark-class: hotels, ships, the temple, the stage
  if (e.mesh.userData.gild) questEvent('gild');
  if (e.radius >= 2.6 && e.radius <= 3.4) questEvent('cabana');
  if (qk) questEvent(qk);
  // a motorhome is somebody's house for the week — it counts for Roof Raider,
  // which is what makes the 'houses' chip completable in RV Row
  if (qk === 'rv') questEvent('house');
  if (comboMult >= 2) questEvent('combo');
  if (qk === 'house' && !moments.firstBuilding) { moments.firstBuilding = true; announce('🏠 FIRST BUILDING! Crunch.'); breakingNews(COPY.houseNews); }
  if (qk === 'car' && !moments.firstCar) { moments.firstCar = true; announce('🚗 FIRST CAR! Tastes like vroom.'); }
  // no COPY row for this one: 'rv' is tagged on RV Row and nowhere else, so it
  // can only ever fire on GAME DAY. It should still sound like the booth.
  if (qk === 'rv' && !moments.firstBuilding) { moments.firstBuilding = true; announce('🚐 A WHOLE MOTORHOME! Gone.'); breakingNews('A whole MOTORHOME, Bill. Somebody was living in that until Sunday.'); }
}

// converging suck streaks — sells the "vacuum" on GULP / COLLAPSE
function spawnSuck(n: number, reach: number) {
  const cy = voidling.group.position.y;
  for (let k = 0; k < n; k++) {
    const i = puffHead; puffHead = (puffHead + 1) % PUFF;
    const a = Math.random() * Math.PI * 2, r0 = reach * rand(0.55, 1);
    puffPos[i * 3] = voidState.x + Math.cos(a) * r0;
    puffPos[i * 3 + 1] = cy * rand(0.2, 1.4);
    puffPos[i * 3 + 2] = voidState.z + Math.sin(a) * r0;
    const inSpd = r0 / rand(0.28, 0.42);
    puffVel[i].set(-Math.cos(a) * inSpd, (cy - puffPos[i * 3 + 1]) * 2, -Math.sin(a) * inSpd);
    puffLife[i] = rand(0.25, 0.4);
  }
}

// ── power fire functions ─────────────────────────────────────────────────────
const POWERS_ON = false;   // carved out for launch — pure drag+eat (hole.io purity)
function fireGulp() {
  if (!POWERS_ON || hunger < COST.gulp || powerCd > 0) return;
  hunger -= COST.gulp; powerCd = 0.5;
  const R = voidling.radius, reach = R * 8;
  for (const e of edibles) {
    if (e.eaten || !e.mesh.visible || e.radius > R * EAT_RATIO) continue;
    const dx = e.mesh.position.x - voidState.x, dz = e.mesh.position.z - voidState.z;
    const d = Math.hypot(dx, dz); if (d > reach) continue;
    if ((dx / (d || 1)) * aim.x + (dz / (d || 1)) * aim.z > 0.2) capture(e, false);   // forward cone
  }
  voidling.animGulp(); audio.gulp(); spawnSuck(26, reach);
  fx.ring(voidState.x, voidState.z, 0xc9a6ff, reach, 0.5); fx.flash('rgba(155,92,255,0.22)', 0.22);
  announce('GULP!');
  questEvent('gulp');
}
function fireCollapse() {
  if (!POWERS_ON || hunger < COST.collapse || powerCd > 0) return;
  hunger -= COST.collapse; powerCd = 1.2;
  const R = voidling.radius, reach = R * 16;
  for (const e of edibles) {
    if (e.eaten || !e.mesh.visible || e.radius > R * 2.5) continue;   // COLLAPSE devours even big things
    const dx = e.mesh.position.x - voidState.x, dz = e.mesh.position.z - voidState.z;
    if (Math.hypot(dx, dz) < reach) capture(e, false);
  }
  voidling.animCollapse(); audio.collapse(); spawnSuck(60, reach);
  fx.ring(voidState.x, voidState.z, 0xffffff, reach, 0.85); fx.ring(voidState.x, voidState.z, 0xc9a6ff, reach * 0.65, 0.6);
  fx.flash('rgba(230,220,255,0.6)', 0.6); fx.shake(6);
  announce('COLLAPSE!!');
  questEvent('collapse');
}
window.addEventListener('keydown', (e) => {
  if (e.code === 'Digit1') fireGulp();
  else if (e.code === 'Digit2' || e.code === 'Digit3') fireCollapse();
});
// touch power buttons — two powers, instantly readable
const pwBtns = [el('pw1'), el('pw3')];
pwBtns[0].addEventListener('click', fireGulp);
pwBtns[1].addEventListener('click', fireCollapse);

// ── game shell: start menu → (tutorial) → match → end → play again ──────────
let started = false, startT = 0, soloMode = false, titleUntil = 0;
const menuEl = el('menu'), shopEl = el('shop'), tutEl = el('tut');
let guideStep = 0, guideT = 0, presenceT = 0;
let introT = 0, outroT = 0;
// how far the opening shot's subject currently sits from the void (see COPY.hero)
let introHX = 0, introHZ = 0;
// what the shadow map was set to before the opening move borrowed it
let introShadow: boolean | null = null;
// THE HAND-AUTHORED FIRST SIXTY SECONDS. All of these are per-match, and all of
// them exist because the opening was measured and found to teach the wrong
// things in the wrong order.
let paused = false;        // the pause sheet is up: the whole match holds still
let firstRun = false;      // this child has never seen a match before
let dragTaught = false;    // the DRAG pill has been shown for this match
let dragNagT = 0;          // cooldown before the drag lesson repeats
let dragNags = 0;          // how many times it has repeated (capped at 3)
let nomArmed = true;       // the FIRST NOM party may fire (see beginMatch)
let dangerTaught = false;  // the "you can be eaten" beat has played this match
const guideEl = () => el('guide');
function showGuide(text: string, dur = 5) {
  const g = guideEl();
  g.innerHTML = text;
  g.classList.add('show');
  guideT = dur;
}
let _revalQueue: number[] = [];
function beginMatch(solo = false) {
  clearRun();            // last match's finds are not this match's finds
  placeStickersOnce();   // hidden curios go in before the world is validated
  validateWorld();   // covers late async-registered GLB props on every start
  // gild HERE, not at the world-ready hook: there are several entry points
  // into a match (menu PLAY, solo, the debug autostart) and only one of them
  // went through that hook, so most matches shipped with no treasure at all
  gildTreasure();
  feverMult = 1; feverT = 0; lastR = voidling.radius; matchEaten = 0; signedOn = false;
  // ── THE HERO WAS ASLEEP BEFORE THE MATCH BEGAN ────────────────────────────
  // `sleepy` fires at `tClock - lastInput > 8`, and tClock is WALL time since
  // the page loaded while lastInput only moves on canvas input. Tapping PLAY
  // and then a world card are DOM button clicks — neither touches it. Loading,
  // the picker and the intro camera comfortably exceed eight seconds, so the
  // very first frame of every match had the void half-lidded with Zzz over its
  // head, before the child had done anything at all. The owner: "when the game
  // loads the voids eyes are half closed. It looks so weird."
  // The match is new input by definition; start the idle clock from here.
  lastInput = tClock;
  // the hero is whatever the biggest thing on this world is — resolved per
  // match, so a re-rolled or re-scaled landmark needs no second list
  heroCued = false; heroAte = false; heroProp = null;
  // GATED ON THE CUE, NOT ON `hero`. `hero` is a camera waypoint — the fly-by
  // coordinates for the intro — and Maple deliberately has none, which also
  // switched off its finale as a side effect. The other three declare both, so
  // their behaviour is bit-identical; this only lets a world have a climax
  // without also having an establishing shot.
  if (COPY.heroCue) {
    for (const e of edibles) if (!heroProp || e.radius > heroProp.radius) heroProp = e;
  }
  // THE OPENING FRAME IS CALM. The void arrives 0.9 units across inside a fear
  // radius of eighteen, so without this the crowd is already screaming on the
  // title card and every world's best writing — its tier-0 ambient pool — is
  // skipped. Four seconds is the title card plus a beat: long enough to hear
  // two or three people talking about the pie/the rub/the tide, short enough
  // that the first thing the player DOES still causes a scream.
  life.calm(4);
  // GLBs stream in for a while after start — re-sweep twice so props that
  // finished loading (and finally have real footprints) also get validated
  _revalQueue = [tClock + 8, tClock + 22];
  bakeContactShadows();   // and again on each re-sweep, for late GLB arrivals
  soloMode = solo;
  matchLen = solo ? 120 : MATCH_LEN;
  matchClock = matchLen;
  // NO TWO MATCHES ON THE SAME SCHEDULE. Each beat keeps its authored slot as a
  // base and moves +-6s around it, so the arc is recognisable but never
  // recited. Clamped so the finale never lands late enough to be a cutscene.
  // This has to sit AFTER matchLen is assigned — one line earlier it clamps
  // against the PREVIOUS match's length, and against 0 on the very first match.
  for (const bt of BEATS) {
    if (!bt.base) bt.base = bt.at;
    bt.at = Math.max(8, Math.min(matchLen - bt.dur - 2, bt.base + (Math.random() * 12 - 6)));
    bt.fired = false;
  }
  started = true; startT = tClock;
  resetFps();
  setCtx('world', pickedWorld);
  setCtx('skin', localStorage.getItem('voidSkin') || 'classic');
  // read it BEFORE it is banked below — everything downstream that means
  // "this child has never played" has to key off this, not off the flag
  const firstEver = !localStorage.getItem('voidPlayed');
  track('match_start', {
    solo, lvl: rankInfo(xp).lvl, coins, played: stats.matches,
    skins: (JSON.parse(localStorage.getItem('voidSkinsOwned') || '[]') as string[]).length,
    first: firstEver,
  });
  // BANK IT NOW, NOT AT THE WHISTLE. This flag was written in exactly one
  // place — endMatch() — so a child who put the iPad down before the three
  // minutes were up never earned it. Every later launch then took the
  // auto-start branch, which hides the menu, which makes the shop, the
  // trophies and TOP VOIDS unreachable — and because the daily-reward block
  // tests menu visibility at module-init time, that child received NO DAILY
  // REWARD, EVER. At this age most first sessions end early. It also cost
  // every player day 1 of the calendar, because the first launch always
  // auto-plays. The flag means "has seen a match", so it belongs here.
  localStorage.setItem('voidPlayed', '1');
  document.body.classList.remove('menu');
  menuEl.style.display = 'none';
  boardEl.style.display = solo ? 'none' : '';
  // RESTART the card animation. classList.add on an element that already has
  // the class is a no-op, so `cardFade 4.2s forwards` played on match 1 and
  // never again — and PLAY AGAIN is how children actually start matches.
  // Measured: peak opacity 1.00 on the first match, 0.00 on the second. Same
  // remove/reflow/add the evolve card already uses correctly.
  const tcEl = el('titlecard');
  tcEl.classList.remove('show'); void tcEl.offsetWidth; tcEl.classList.add('show');
  titleUntil = tClock + 4.6;
  audio.startMusic(); audio.setMusicStage(0);
  introT = COPY.introLen;   // orbital reveal: the world's landmark, then dive to the tiny void
  // THE FIRST INSTRUCTION USED TO ARRIVE WHILE THE CONTROLS WERE OFF. This
  // fired here, in the same block that sets introT = 2.2 — and the intro damps
  // velocity by 0.9^(dt*60) for those 2.2 seconds, roughly 0.0018x per second.
  // A six-year-old obeys the first thing they are told, drags, and learns that
  // the screen does not respond. It is now queued and fires the moment the
  // controls are actually live.
  firstRun = firstEver;
  dragTaught = false;
  dragNagT = 0; dragNags = 0;   // the drag lesson gets its repeats back each match
  nomArmed = !firstEver;   // see onEat: the FIRST NOM party waits for a real drag
}
// ── asset preloader: menu time is download time; PLAY holds on a branded
// loading bar until every pack mesh is resident, so a match never starts
// with stand-in geometry visible (hole.io's load-then-play flow)
let packReady = false;
// THE BAR REWOUND. When the 12-second bail-out below won the Promise.race it
// wrote 100%, and this callback — still firing, because the pack keeps
// downloading — immediately overwrote it with the true, lower number. A child
// watched the bar reach 100% and then snap back to 48%, and the match started
// anyway, which defeats the whole point of the gate. It is also latched
// monotonic: a progress bar that goes backwards reads as a fault.
let loadFinal = false, loadPct = 0;
// WAIT FOR THIS WORLD'S MESHES, NOT FOR ALL THIRTY-FOUR. This used to be
// preloadPack(), which requested the whole pack and held PLAY until every one
// resolved or the 12-second cap fired. Two measurements killed it: a runtime
// census (qa/_census.mjs) says GAME DAY and LANTERN NIGHT place ZERO pack
// meshes and Pirate Bay places three, and the vendoring job says 17 of the 34
// URLs are permanently 403. So on half the worlds the loading cover was
// holding the child on downloads the world never uses, and on the other half
// it was also waiting on seventeen that were never going to arrive.
// requestedReady() waits on exactly what populate() asked for, which is a set
// the world builders maintain by construction.
const preloadP = requestedReady((done, total) => {
  if (loadFinal) return;
  const pct = total > 0 ? Math.round((done / total) * 100) : 100;
  // belt and braces on the NaN: `NaN <= loadPct` is false, so an unguarded
  // divide-by-zero sails through the monotonic check and writes NaN% to the
  // bar. requestedReady no longer reports 0/0, and this could not print it
  // even if something else did.
  if (!Number.isFinite(pct) || pct <= loadPct) return;
  loadPct = pct;
  el('lBar').style.width = pct + '%';
  el('lPct').textContent = pct + '%';
}).then(() => { packReady = true; });
// NO PRE-WARMING THE DEFENSE VEHICLES. I added a warmLater() here on the
// reasoning that a tank which starts downloading when it spawns is a tank that
// shows up as a box, and it cost Maple Falls 4.8 SECONDS on the gate — 9,440ms
// against 4,841ms with it gone, repeatable. Two reasons, both measured:
// assets3d caps concurrent GLB loads at MAX_PARALLEL to stay under iOS
// Safari's memory ceiling, so those requests take slots at exactly the moment
// the match is starting; and `tank` is one of the seventeen URLs that are
// permanently 403, so it was a slot spent on a download that can never finish.
// vehicleGlb already swaps the mesh in whenever it arrives, which is the right
// behaviour for something that appears a minute into a match.
const LOAD_TIPS = [
  'tip: eat the little stuff first — cones, hydrants, mailboxes',
  'tip: cars count as people-sized once you evolve',
  'tip: get CLOSE — small stuff gets sucked right in',
  'tip: rival voids can eat YOU — check the leaderboard sizes',
  // …was 'the downtown towers are the biggest meal on the island', which is
  // Maple's skyline and nobody else's. The biggest meal is a different
  // object on each world, so the tip names the thing rather than the place.
  'tip: the biggest thing you can see is always worth saving for last',
  'tip: play daily — streak skins unlock at 2 and 7 days',
  "tip: parked cars can't run away. just saying.",
  'tip: buildings topple INTO you. very satisfying.',
  'tip: bite fast — combos multiply your points',
  'tip: crowds are snacks — and they run, which is worth extra',
  'tip: eat a rival and they respawn tiny — and grumpy',
  'tip: the landmark in the middle is dessert. save room.',
  'tip: quests pay VOID POINTS — check mid-match',
  'tip: BITSY is the smallest — the easiest one in the family to catch',
];
// who is currently holding the load cover up. 'boot' is released by the first
// rendered frame; 'pack' by the asset preload finishing.
const coverHeld = new Set<string>(['boot']);
let coverFading = false;
function coverHold(who: string) {
  coverHeld.add(who);
  coverFading = false;
  const scr = el('loadScr');
  scr.style.transition = ''; scr.style.opacity = '';
  scr.classList.add('show');
}
/** Release one hold. The cover only leaves when NOBODY is still holding it. */
function coverRelease(who: string, then?: () => void) {
  coverHeld.delete(who);
  if (coverHeld.size) { then?.(); return; }   // someone else still wants it up
  if (coverFading) { then?.(); return; }
  coverFading = true;
  const scr = el('loadScr');
  scr.style.transition = 'opacity 0.45s ease';
  scr.style.opacity = '0';
  setTimeout(() => {
    // …and only tear down if nothing grabbed it again during the fade
    if (!coverHeld.size) {
      scr.classList.remove('show'); scr.classList.remove('boot');
      scr.style.opacity = ''; scr.style.transition = '';
    }
    coverFading = false;
  }, 480);
  then?.();
}
function withWorldReady(cb: () => void) {
  // THE FAST PATH MUST STILL DROP THE HOLD, and it used to not — it just ran
  // the callback. That was survivable while packReady only went true after a
  // real download, because nothing had taken a 'pack' hold yet when it did.
  // It stopped being survivable the moment requestedReady() started returning
  // an ALREADY-RESOLVED promise: `packReady = true` then lands in a microtask,
  // which runs AFTER module evaluation reaches the world-switch block at the
  // bottom of this file. So that block sees packReady === false, takes
  // coverHold('pack') — and by the time launchWorld() calls in here, packReady
  // is true, this returned early, and nobody ever released it.
  //
  // Measured: 4 of 4 worlds, 5 of 5 runs, switching worlds left a frozen 100%
  // loading screen over the whole screen forever while the match played out
  // behind it — scoring, banking coins and hitting the whistle invisibly.
  // coverRelease is safe to call for a hold nobody took: it is a Set delete
  // followed by a size check.
  if (packReady) { coverRelease('pack', cb); return; }
  const scr = el('loadScr');
  (scr.querySelector('.lTip') as HTMLElement).textContent = LOAD_TIPS[Math.floor(Math.random() * LOAD_TIPS.length)];
  coverHold('pack');   // idempotent — it is a set, and the autoplay path may already hold it
  // slow networks still get in: cap the wait, fallbacks cover stragglers
  const waitT0 = performance.now();
  Promise.race([preloadP, new Promise((r) => setTimeout(r, 12000))]).then(() => {
    track('load_wait', { ms: Math.round(performance.now() - waitT0) });
    packReady = true;
    loadFinal = true;   // …and nothing may write the bar after this
    el('lBar').style.width = '100%'; el('lPct').textContent = '100%';
    // the bar is allowed to land on 100% before the curtain moves
    setTimeout(() => coverRelease('pack', cb), 300);
  });
}
function startFresh(solo: boolean) {
  if (ended || started) { soloMode = solo; resetMatch(); }
  else beginMatch(solo);
}
// PLAY opens the level picker. The old flow ran the other way — pick a level,
// get returned to the splash, then press PLAY — which asks the player to make
// the same decision twice and lands them back where they started.
el('btnPlay').addEventListener('click', () => {
  track('play_tap', { played: stats.matches, lvl: rankInfo(xp).lvl });
  el('worlds').classList.add('show');
});
// A world switch that lands on a day the daily card has not been claimed has
// to wait for it: the card is z-index 45 and takes the whole screen, so
// starting the match underneath means a timed run playing on with every drag
// swallowed by a modal backdrop. closeDaily() below picks this back up.
let pendingLaunch = false;
// …and the picker is what actually starts the match.
function launchWorld() {
  el('worlds').classList.remove('show');
  menuEl.style.display = 'none';
  // one-time teach card before the first menu-launched match: it's the only
  // place the danger loop ("eat the family when bigger, RUN when not") lives
  if (!localStorage.getItem('voidTut')) {
    track('tutorial_view', {});
    tutEl.classList.add('show');
    // …AND DROP THE COVER, because this return skips withWorldReady() and
    // withWorldReady() is the only thing that ever releases a 'pack' hold.
    //
    // The world-switch path takes that hold synchronously before calling in
    // here (see the autoplay block at the bottom of this file), so on the one
    // journey that combines the two — session two, where voidPlayed is set but
    // voidTut is not, because first launch calls beginMatch() directly and only
    // the card's own button writes voidTut — the child picked a world and got a
    // loading screen frozen at 100% for ever. #loadScr is z-index 60 and #tut
    // is 12, so the card asking them to tap was UNDERNEATH the cover, with the
    // menu already hidden. There was no way out of it at all.
    //
    // This is the same bug withWorldReady's own comment describes fixing on the
    // fast path: "nobody ever released it". The teach card was the other door
    // into it. Releasing is safe for a hold nobody took — a Set delete and a
    // size check — and the card is its own full-screen scrim, so nothing
    // half-built shows through while it is up.
    coverRelease('pack');
    return;
  }
  withWorldReady(() => startFresh(soloOn()));
}
// ── SOLO IS A SETTING NOW, NOT A SECOND FRONT DOOR ────────────────────────
// It used to be a full-width button under PLAY, which made the first choice a
// pre-reader faced a choice between two words they cannot read — one of which
// led to the same four world cards as the other. It is a MODE, so it lives on
// the screen where the run is chosen, and it costs the splash art nothing.
//
// It also PERSISTS now. The old button set the mode for exactly one match and
// forgot it; a child who wants to play without rivals wants that every time,
// and PLAY AGAIN already carried soloMode forward, so the menu was the only
// place it was dropped.
//
// And deleting that handler fixes something it did quietly: it wrote voidTut
// itself, so a child whose first tap was SOLO RUN was marked as taught and
// never saw the danger card — the one place the game explains "eat the family
// when you are bigger, RUN when you are not."
const soloOn = () => localStorage.getItem('voidSolo') === '1';
{
  const tog = el('soloTog');
  tog.classList.toggle('on', soloOn());
  tog.addEventListener('click', () => {
    const on = !soloOn();
    localStorage.setItem('voidSolo', on ? '1' : '0');
    tog.classList.toggle('on', on);
    track('solo_toggle', { on });
  });
}
el('btnGotIt').addEventListener('click', () => {
  track('tutorial_done', {});
  localStorage.setItem('voidTut', '1');
  tutEl.classList.remove('show');
  withWorldReady(() => startFresh(soloOn()));
});
// FIRST LAUNCH: no menu — splash straight into the game with in-game guidance
// (hole.io's onboarding). The menu earns its place from session two.
if (!DEBUG_HARNESS && !TOPDOWN && !ASSETVIEW && !localStorage.getItem('voidPlayed')) {
  menuEl.style.display = 'none';
  withWorldReady(() => beginMatch());
}
/** THE POSTERS.
 *
 *  This started as the world's real top-down map, then became an in-engine hero
 *  render with the HUD stripped. Both were the wrong job, and the second was
 *  the owner's own verdict: "it's just showing a screenshot." A shelf of levels
 *  is a shelf of POSTERS — the card's job is to make a child want to go
 *  somewhere, which a photograph of the terrain cannot do however well it is
 *  framed.
 *
 *  These are painted key-art illustrations: the void grinning in a sunlit
 *  suburb of clapboard houses and picket fences, the void on a tropical resort
 *  boardwalk with a galleon in the lagoon, and — desaturated behind its lock —
 *  a snowbound alpine village with two curious eyes glowing in a drift.
 *
 *  Served through the /assets/hf/ rewrite in vercel.json, which proxies the
 *  generation CDN. The same path the legendary shop cards already use, and the
 *  reason nothing has to be vendored into the bundle.
 *
 *  SECOND PASS. The first set had two faults, both visible the moment they were
 *  on a real phone: the hero was dead-centre so the title landed on the void's
 *  face, and the Pirate Bay illustration had painted a "TIKI DRINKS" sign into
 *  the scene — an alcohol reference sitting in the ART, immediately after a
 *  sweep that removed twelve of them from the TEXT. These are regenerated with
 *  the void in the upper middle, a deliberately empty bottom third for the
 *  title plate, and signage of any kind forbidden outright.
 *
 *  ALTERNATES, if one still misses: Maple's second take is
 *  hf_20260730_125858_e31cc3b1-18ca-4e17-a47a-26ead66b54ff.png and the bay's is
 *  hf_20260730_125832_499e6122-b092-4923-aa0e-f2b40d65ba33.png. */
const CARD_ART: Record<string, string> = {
  // THE FIRST TWO CARDS WERE NOT POSTERS AT ALL. On a real device, worlds 1
  // and 2 photographed as a close-up of the void sitting on a road and on a
  // jetty — gameplay grabs with the hero pasted in the middle — against world
  // 3, which is a proper key-art poster of a stadium on a floating island in
  // space. Three cards, two visual languages, and the odd one out was the pair.
  // (card_maple.webp / card_pirate.webp in public/assets are those same grabs;
  // pointing at them fixed the offline problem and kept the wrong picture.)
  //
  // Both are re-drawn to World 3's brief: the world itself as a small floating
  // island against the cosmos, its landmarks legible at card size, no void in
  // frame. They stay written as /assets/hf paths because asset-refs.mjs scans
  // the source for exactly that shape — `pnpm build:ios` vendors all three.
  maple: '/assets/hf/hf_20260801_130607_c92a52e5-8c1c-4a60-a566-ba19583fd532.png',
  pirate: '/assets/hf/hf_20260801_130624_b1d4e117-1a45-4447-9bb8-e7f764565975.png',
  // WORLD 3 — GAME DAY. A stadium above, a tailgate party below, in the same
  // chunky-clay register as the other two posters so the picker reads as one
  // set. (An alternate take from the same batch is
  // hf_20260731_091353_ac1f7e36-5d53-40f7-971b-ba23d7377f5f.png.)
  // GAME DAY's card is still remote, and stays written as an /assets/hf path on
  // purpose: scripts/asset-refs.mjs scans the source for exactly that shape, so
  // `pnpm build:ios` vendors it to disk with everything else. Regenerated to
  // match the finished level — a crimson-and-gold bowl above, the tailgate on
  // the underside of the floating island, autumn rim, golden-hour rake.
  gameday: '/assets/hf/hf_20260801_053403_0dc79112-b8fd-4304-9d15-8630620b2218.png',
  // LANTERN NIGHT: the valley from above, the canal down the middle strung
  // with lanterns, the bathhouse lit at the top. Two candidates were painted;
  // this is the first. The alternate is
  // hf_20260802_020637_ab38aed8-5041-4109-83be-23acf11175a6.png.
  lantern: '/assets/hf/hf_20260802_020636_0bc97a9d-a168-4667-bf5d-76ac9418bff1.png',
  frost: '/assets/hf/hf_20260730_000329_762b5f44-3c3d-4030-8429-099f02691b5e.png',
};
// A CARD IS NEVER BLANK. This set the background and hoped: if the file 404s —
// which is exactly what every /assets/hf path does inside an iOS bundle that
// has not been through vendor-assets — the player gets an empty rectangle with
// a title under it, which is what the world picker photographed as. Each world
// now carries a painted fallback in its own colours, applied first and replaced
// only once the real art has actually decoded.
const CARD_FALLBACK: Record<string, string> = {
  maple: 'radial-gradient(ellipse at 50% 34%, #6fd08a 0%, #2f7a4a 44%, #16264a 100%)',
  pirate: 'radial-gradient(ellipse at 50% 34%, #ffd9a0 0%, #d98f4a 40%, #1a3352 100%)',
  gameday: 'radial-gradient(ellipse at 50% 34%, #f0b429 0%, #c4342f 42%, #241030 100%)',
  frost: 'radial-gradient(ellipse at 50% 34%, #cfe9ff 0%, #5a8fd0 42%, #17203f 100%)',
  // lantern amber falling into an indigo night — the level's own two colours,
  // so a card that never loads its poster still says the right thing
  lantern: 'radial-gradient(ellipse at 50% 38%, #ffbe6a 0%, #d1452f 34%, #241436 68%, #0e1226 100%)',
};
function paintWorldCard(host: HTMLElement, id: string): void {
  host.style.backgroundSize = 'cover';
  host.style.backgroundPosition = 'center 46%';
  const fb = CARD_FALLBACK[id];
  if (fb) host.style.backgroundImage = fb;
  const src = CARD_ART[id];
  if (!src) return;
  const probe = new Image();
  probe.onload = () => { host.style.backgroundImage = `url('${src}')`; };
  probe.src = src;   // no onerror handler needed: the fallback is already up
}
/** Best score on a given world, or 0. Written by endMatch(). */
const worldBest = (id: string) => Number(localStorage.getItem(`voidBest_${id}`) || 0);
// world cards: MAPLE FALLS + PIRATE BAY are live; FROST PEAKS is the locked third
{
  document.querySelectorAll('#worldRow .wCard[data-world]').forEach((c) => {
    const id = (c as HTMLElement).dataset.world!;
    const art = c.querySelector('.wArt') as HTMLElement | null;
    if (art) paintWorldCard(art, id);
    // …and the thing to beat. Best score per world was never stored and never
    // shown anywhere a player looks BEFORE a match, so "play again" could not
    // become "beat 12,045".
    const bestEl = c.querySelector('.wBest') as HTMLElement | null;
    if (bestEl) { const b = worldBest(id); bestEl.textContent = b ? `★ BEST ${b.toLocaleString()}` : ''; }
    c.classList.toggle('sel', id === pickedWorld);
    c.addEventListener('click', () => {
      track('world_pick', { pick: id, from: pickedWorld, rebuild: id !== pickedWorld });
      if (id === pickedWorld) { launchWorld(); return; }   // already built: just go
      // a different world needs the island rebuilt, so come back playing
      localStorage.setItem('voidWorld', id);
      localStorage.setItem('voidAutoPlay', '1');
      location.href = location.pathname;
    });
  });
}
// locked world teasers wiggle on tap — and show what they are, desaturated,
// because a child should be able to see what they are waiting for
document.querySelectorAll('.wCard.lock').forEach((c) => {
  const art = c.querySelector('.wArt') as HTMLElement | null;
  if (art) paintWorldCard(art, 'frost');
});
document.querySelectorAll('.wCard.lock').forEach((c) => c.addEventListener('click', () => {
  // demand signal for world 3: a locked card nobody taps is a world nobody wants
  track('world_locked_tap', { card: (c as HTMLElement).dataset.name || c.textContent?.trim().slice(0, 24) });
  c.classList.remove('shake'); void (c as HTMLElement).offsetWidth; c.classList.add('shake');
}));
// a world switch reloads the page to rebuild the island; pick up where the tap
// left off rather than dumping the player back on the splash they just left
if (localStorage.getItem('voidAutoPlay') === '1') {
  localStorage.removeItem('voidAutoPlay');
  // CLAIM THE COVER NOW, not inside the rAF. animate()'s first frame and this
  // callback are both queued before the browser's next paint, and animate()
  // was registered first — so it released the boot hold, started the fade, and
  // only THEN did launchWorld take its own hold, which snapped the curtain
  // back. Measured on the real reload path: 12ms of the game visible, then 1.4
  // seconds of load screen. Taking the hold synchronously makes the ordering
  // irrelevant: there is never a moment when nobody is holding it.
  if (!packReady) coverHold('pack');
  requestAnimationFrame(() => {
    // THE DAILY CARD GOES FIRST. It is built further down this same module
    // evaluation, so by the time this frame runs it is already on screen — and
    // launching under it starts a three-minute timed match behind a full-screen
    // modal that eats every pointer event. Drop the cover too (it is z-60
    // against the card's z-45, so the child would be looking at a loading
    // screen with their reward hidden behind it) and let closeDaily() start
    // the match once the card is done.
    if (el('daily').classList.contains('show')) {
      pendingLaunch = true;
      coverRelease('pack');
      return;
    }
    launchWorld();
  });
}
el('btnShop').addEventListener('click', () => {
  track('shop_view', { coins, from: 'menu' });
  shopEl.classList.add('show');
  // paint on the frame AFTER the overlay is laid out: the canvases have to be
  // in the document and sized before anything is drawn into them
  requestAnimationFrame(() => { _dbg.__shopTab?.(); });
});
el('btnBack').addEventListener('click', () => shopEl.classList.remove('show'));
// ── world integrity: NOTHING stands on asphalt, ever ─────────────────────────
// Footprint-aware post-build sweep. Runs at every match start (so props that
// registered asynchronously from GLB loads are covered too): any prop whose
// real bounding box overlaps a road lane is pushed to the nearest legal spot
// beside the road; if no legal spot exists it is retired from the match.
const ASPHALT_HALF = 2.75;
const _vBox = new THREE.Box3(); const _vSz = new THREE.Vector3(); const _vCtr = new THREE.Vector3();
let _validated = false;   // homes are canonical after the first pass — later passes are cheap re-checks of new props
// ══ THE SCRAPBOOK, ON SCREEN ══════════════════════════════════════════════
const TIER_ICON: Record<string, string> = { common: '🔹', rare: '💜', legendary: '⭐' };

/** THE STICKER'S FACE. Painted art if we have it, the tier glyph if we do not.
 *  The art is 48 separate files that land through CI, so at any moment some,
 *  none or all of them exist — an <img> that swaps itself for the glyph on
 *  error means the book is never broken and never waits, and a half-delivered
 *  art set degrades one cell at a time instead of all at once. */
function stickerFace(st: Sticker, px: number): string {
  const g = TIER_ICON[st.tier];
  return `<img class="stkArt" src="/assets/stickers/${st.id}.webp" alt="" width="${px}" height="${px}"`
    + ` loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('i'),`
    + `{textContent:'${g}'}))">`;
}

/** The results-screen reveal. Nothing at all on a run with no finds — an empty
 *  trophy case is worse than no trophy case. */
function renderFinds(): void {
  const box = el('endFinds');
  const got = runFinds();
  box.classList.toggle('show', got.length > 0);
  if (!got.length) { box.innerHTML = ''; return; }
  // AT MOST THREE CARDS. Each one is a ~64px row on a screen that was already
  // 848px of content in an 844px viewport with none of them — measured, five
  // finds put it at 1,207px and pushed PLAY AGAIN completely off. The count in
  // the label is still the true count and the rest are one line of text, so a
  // six-sticker run reads as a bigger win than a three-sticker run without
  // costing the screen six rows. The book is where you go to see them all;
  // this is a receipt, not the collection.
  const MAX = 3;
  const show = got.slice(0, MAX), rest = got.length - show.length;
  box.innerHTML = `<div class="fLbl">${got.length === 1 ? 'NEW STICKER' : `${got.length} NEW STICKERS`}</div>`
    + show.map((g, i) => `<div class="stk t-${g.tier}" style="animation-delay:${0.12 + i * 0.16}s">`
      + `${stickerFace(g, 44)}<span><b>${g.name}</b>`
      + `<s>${g.where.toUpperCase()} · ${g.tier.toUpperCase()}</s></span></div>`).join('')
    + (rest > 0 ? `<div class="fMore">and ${rest} more in the scrapbook</div>` : '');
}

let bookWorld: WorldId = pickedWorld;
function renderBook(): void {
  const tabs = el('bookTabs'), grid = el('bookGrid'), foot = el('bookFoot');
  const NAMES: Record<WorldId, string> = { maple: '🍁 MAPLE FALLS', pirate: '🏴‍☠️ PIRATE BAY',
    gameday: '🏈 GAME DAY', lantern: '🏮 LANTERN NIGHT' };
  tabs.innerHTML = (Object.keys(NAMES) as WorldId[]).map((w) =>
    `<button data-w="${w}" class="${w === bookWorld ? 'on' : ''}">${NAMES[w]} `
    + `${foundCount(w)}/${totalCount(w)}</button>`).join('');
  tabs.querySelectorAll('button').forEach((btn) => btn.addEventListener('click', () => {
    bookWorld = (btn as HTMLElement).dataset.w as WorldId; renderBook();
  }));
  grid.innerHTML = STICKERS_BY_WORLD(bookWorld).map((st: Sticker) => {
    const got = hasSticker(st.id);
    // A found cell states what it is. An empty one states WHERE TO LOOK — the
    // clue is the entire point of a gap, so it is a to-do list rather than a
    // locked door, and it is the same sentence the newsroom has been saying.
    return `<div class="bkCell ${got ? 'got' : 'miss'} t-${st.tier}">`
      + (got ? stickerFace(st, 56) : `<i>${TIER_ICON[st.tier]}</i>`)
      + `<b>${got ? st.name : '· · ·'}</b>`
      + `<s>${got ? st.where.toUpperCase() : st.hint}</s></div>`;
  }).join('');
  const f = foundCount(), t = totalCount();
  foot.textContent = f === t ? 'EVERY LAST ONE. Goodness.' : `${f} of ${t} found`;
}
function openBook(): void {
  bookWorld = pickedWorld; renderBook();
  el('book').classList.add('show');
}
el('btnBook')?.addEventListener('click', () => { openBook(); track('book_open', { found: foundCount() }); });
el('bookClose')?.addEventListener('click', () => el('book').classList.remove('show'));
/** the menu chip's own count, refreshed whenever the menu is shown */
function paintBookChip(): void {
  const e = document.getElementById('bookCount');
  if (e) e.textContent = `${foundCount()}/${totalCount()}`;
}
paintBookChip();

function validateWorld() {
  let moved = 0;
  const cull: number[] = [];
  for (let i = 0; i < edibles.length; i++) {
    const e = edibles[i];
    const ud = e.mesh.userData;
    if (ud.mover || ud.vChecked) continue;   // movers steer themselves; checked props are settled
    _vBox.setFromObject(e.mesh); _vBox.getSize(_vSz); _vBox.getCenter(_vCtr);
    // a GLB wrapper whose model hasn't streamed yet measures ~empty — do NOT
    // stamp it checked, or the house it becomes is never validated at all
    // (exactly how oversized houses kept ending up "in the street")
    if (_vSz.x < 0.05 && _vSz.z < 0.05) continue;
    ud.vChecked = true;
    // buildings get a tighter test (0.45) — downtown street walls legitimately
    // hug the sidewalk and must not be "corrected" away from their block face.
    // HOUSES are the exception: near-true footprint (0.85) and the no-go band
    // includes the sidewalk, so a porch can never ride the curb again.
    const house = ud.qk === 'house';
    const parked = ud.qk === 'car';   // (movers were skipped above — this is only driveway cars)
    // ── THE TOLERANCE WAS A HAIRCUT, NOT A CLEARANCE ──────────────────────
    // `f` scaled the measured half-extent, so the allowance grew with the prop:
    // a 16.6-unit barn was handed 4.6 units of free overhang while a 2-unit
    // bollard got 0.55. Worked through with real numbers — Maple's country fill
    // places a barn (island.ts makeBarn, r3 5.2) at roadClear(5.2) = 9.64 units
    // from a road centreline, and the barn's true half-extent is 8.3, so its
    // wall stands 1.41 units INSIDE the traffic lane. The old test needed
    // band + hx = 2.75 + 8.3x0.45 = 6.49 to flag it and the prop sat at 9.64,
    // so the sweep never saw the thing it exists to catch.
    //
    // The same shrunken half was also used to compute `off`, so anything this
    // sweep DID move was set back down still on the asphalt. Any fraction — or
    // any constant — subtracted here leaves a blind window exactly that wide,
    // and the barn's whole offending range is only 1.41 units, so there is no
    // slack to spend. The tolerance belongs in the BAND, where it is a fixed
    // clearance, and the half-extent is measured true.
    const band = (house || parked ? ASPHALT_HALF + 1.4 : ASPHALT_HALF)
      - (house ? 0.35 : ud.building ? 0.25 : 0.15);
    const hx = Math.min(_vSz.x, 40) / 2, hz = Math.min(_vSz.z, 40) / 2;
    // …AND MAPLE'S KIT PROPS ARE AUTHORED OFF-CENTRE. makeGrainElevator's silo
    // bank spans x -8.1..+17.25 about its own origin, so a test on e.home.x is
    // wrong by 4.58 units for that prop alone. Measure the BOX and back the
    // offset out again when placing.
    const ox = _vCtr.x - e.mesh.position.x, oz = _vCtr.z - e.mesh.position.z;
    let px = e.home.x, pz = e.home.z, dirty = false, dead = false;
    // OFF-ISLAND CULL — the catch-all. Any static prop sitting over open space
    // is retired outright, no matter which placement path put it there. (A raw
    // glb() call bypassing its island guard is how cars ended up in orbit;
    // this makes that class of bug invisible to the player forever.)
    // …except things that are MEANT to be on the water. Pirate Bay Resort moors
    // a superyacht, two galleons, five speedboats and four jet skis in the bay;
    // without this exemption the off-island cull quietly deleted the entire
    // fleet a few seconds after the match started.
    if (!insideIsland3(px, pz) && !ud.afloat) { cull.push(i); continue; }
    if (ud.afloat) continue;   // moored: no road/coast correction applies
    // ONLY MAPLE FALLS HAS A ROAD GRID. This sweep nudges props off the road
    // centres, and it was written as "not pirate" — so Pirate Bay was fixed and
    // Game Day, which arrived later, inherited the bug: its trucks, canopies
    // and frat houses were being shoved sideways for phantom bands at world
    // 2580/4290/6000/7710/9420 that exist on neither island.
    for (const rc of pickedWorld === 'maple' ? ROAD_CENTERS_3D : []) {
      // tested on the BOX (px + ox), placed so the BOX clears (…- ox)
      if (Math.abs(px + ox - rc) < band + hx) {   // straddles a vertical road lane
        const off = band + hx + 0.4;
        const side = (px + ox) >= rc ? 1 : -1;
        const a = rc + side * off - ox, bq = rc - side * off - ox;
        if (insideIsland3(a, pz) && !inLagoon3(a, pz)) { px = a; dirty = true; }
        else if (insideIsland3(bq, pz) && !inLagoon3(bq, pz)) { px = bq; dirty = true; }
        else { dead = true; break; }
      }
      if (Math.abs(pz + oz - rc) < band + hz) {   // straddles a horizontal road lane
        const off = band + hz + 0.4;
        const side = (pz + oz) >= rc ? 1 : -1;
        const a = rc + side * off - oz, bq = rc - side * off - oz;
        if (insideIsland3(px, a) && !inLagoon3(px, a)) { pz = a; dirty = true; }
        else if (insideIsland3(px, bq) && !inLagoon3(px, bq)) { pz = bq; dirty = true; }
        else { dead = true; break; }
      }
    }
    if (dead) { cull.push(i); continue; }
    if (dirty) {
      e.home.x = px; e.home.z = pz;
      e.mesh.position.x = px; e.mesh.position.z = pz;
      moved++;
    }
  }
  // retire the unfixable entirely — out of the scene AND the mass ledger, so
  // %devoured stays honest
  for (let k = cull.length - 1; k >= 0; k--) {
    const e = edibles[cull[k]];
    // This sweep re-runs 8 and 22 seconds INTO the match, and a bare remove()
    // meant a prop at full scale, in plain view, blinked out of the world
    // mid-play — an instrumented run caught a 5.6-unit ferris wheel doing
    // exactly that at t=258s. If the player can see it go, it has to go the
    // way everything else goes.
    if (started && e.mesh.visible) { spawnPuff(e.mesh.position.x, 0.6, e.mesh.position.z, 5); }
    setShadowInstance((e.mesh.userData.shIdx as number) ?? -1, false);   // and its shadow
    scene.remove(e.mesh);
    edibles.splice(cull[k], 1);
  }
  // ── AND NOTHING MAY STAND IN FRONT OF THE HERO AT SPAWN ───────────────────
  // The opening is hand-authored and identical every load, so whatever sits in
  // the first frame sits there forever, for every player, in the screenshot the
  // store gets. Maple Falls opened with a 2.6-radius tree across the lower right
  // of the void — 8.2% of the hero's silhouette, measured — and a child's first
  // sight of the character they are about to be was partly behind a shrub.
  //
  // A single ray at the void's centre does NOT find this: scenery that clips the
  // edge leaves the centre completely clear. The rule is geometric instead.
  //
  // The camera sits at spawn + camOffset * camDist, so the ground direction from
  // the hero TOWARD the lens is (camOffset.x, camOffset.z) normalised — with the
  // authored (0.62, 0.92, 0.62) that is (0.707, 0.707), i.e. x and z increase
  // together. A prop at horizontal distance t along that direction rises into
  // the sight line if its top is above t * (camY / camHoriz). Anything inside
  // that wedge, and within its own half-width of the line, is in the way.
  //
  // Offenders are pushed sideways out of the corridor rather than retired: this
  // is authored scenery and a town with a hole in it is a worse opening than a
  // tree two metres to the left.
  let cleared = 0;
  if (!_validated && island.spawn) {
    const sx = island.spawn.x, sz = island.spawn.z;
    const camH = Math.hypot(camOffset.x, camOffset.z) * 50;   // camDist at spawn
    const camY = camOffset.y * 50;
    const dx = camOffset.x / Math.hypot(camOffset.x, camOffset.z);
    const dz = camOffset.z / Math.hypot(camOffset.x, camOffset.z);
    const slope = camY / camH;
    for (const e of edibles) {
      const ox = e.mesh.position.x - sx, oz = e.mesh.position.z - sz;
      const t = ox * dx + oz * dz;                   // along the sight line
      if (t <= 0 || t > camH) continue;              // behind the hero, or past the lens
      const lat = Math.abs(ox * dz - oz * dx);       // perpendicular offset
      const half = e.radius;
      if (lat > half + START_R * 1.6) continue;      // clear of the corridor
      // does it actually rise into the line of sight at its own distance?
      const box = new THREE.Box3().setFromObject(e.mesh);
      const top = box.max.y - box.min.y;
      if (top < t * slope * 0.55) continue;          // too short to matter
      // push it perpendicular, to whichever side is nearer, and keep it legal
      const need = half + START_R * 1.6 + 0.6;
      const side = (ox * dz - oz * dx) >= 0 ? 1 : -1;
      for (const s of [side, -side]) {
        const nx = e.mesh.position.x + dz * s * (need - lat);
        const nz = e.mesh.position.z - dx * s * (need - lat);
        if (insideIsland3(nx, nz) && !inDeepWater3(nx, nz, 1)) {
          e.home.x = nx; e.home.z = nz;
          e.mesh.position.x = nx; e.mesh.position.z = nz;
          cleared++; break;
        }
      }
    }
  }
  if ((moved || cull.length || cleared) && !_validated) console.info(`[world] placement sweep: ${moved} nudged off roads, ${cull.length} retired, ${cleared} cleared from the spawn shot`);
  _validated = true;
}

// GOLDEN FINDS. capture() has always had a coin payout branch and not one
// prop in either world ever set userData.coin — the whole discovery layer was
// written and dead. There was nothing on the island worth going to look for: a
// treasure chest in Smugglers Cove paid exactly what a beach towel of the same
// size paid. Twenty props are gilded per match, re-rolled every time, biased
// toward the things that already look special. This is where the run-to-run
// variety lives now that the opening is deliberately fixed.
const GILD_N = 20;
let gilded: Edible[] = [];
function gildTreasure() {
  for (const e of gilded) { e.mesh.userData.coin = undefined; e.mesh.userData.gild = false; }
  gilded = [];
  const pool = edibles.filter((e) => e.radius >= 0.5 && e.radius <= 6 && !e.mesh.userData.mover);
  if (!pool.length) return;
  const score = (e: Edible) => (e.mesh.userData.building ? 3 : 1) + (e.radius > 2 ? 2 : 0);
  for (let k = 0; k < GILD_N && pool.length; k++) {
    let best: Edible | null = null, bw = -1;
    for (let t = 0; t < 6; t++) {
      const c = pool[(Math.random() * pool.length) | 0];
      const w = score(c) * Math.random();
      if (w > bw && !c.mesh.userData.gild) { bw = w; best = c; }
    }
    if (!best) break;
    best.mesh.userData.coin = 3 + Math.round(best.radius * 2);
    best.mesh.userData.gild = true;
    gilded.push(best);
  }
}

function resetMatch() {
  joyRelease();   // PLAY AGAIN can be tapped and HELD — see joyRelease
  resetNews(); resetMapleNews(); resetGamedayNews(); resetLanternNews(); signedOn = false;   // memory + the sign-on are per-match
  // ── NOTHING FROM THE LAST MATCH MAY SPEAK IN THIS ONE ─────────────────────
  // Proven with an isolation test, not inferred: a uniquely-tagged banner
  // planted on the menu, left for ten seconds (the animation is 2.2s), then a
  // match launched — peak opacity 1.00 at 330ms, with the planted text. The
  // cause is that `body.menu #banner { display:none }` cancels the CSS
  // animation, and restoring display restarts it from 0%. Natural captures
  // included "🍰 CHOMPZILLA is TOO FULL to chase — now is your chance!" at
  // t=0.1s of a match CHOMPZILLA had not joined, and "QUEST DONE! +15✦" over a
  // 2:57 clock and a score of 10. Neither resetMatch() nor beginMatch() cleared
  // the text, the .show class, the queue or the hold timer — all four.
  bannerEl.classList.remove('show', 'fam');
  bannerEl.textContent = '';
  bannerQ.length = 0;
  bannerFree = 0;
  evolveEl.classList.remove('show');
  // …and the speech bubbles, which carried over verbatim in 5 of 5 transitions
  // and hovered over empty grass for 2-4 seconds at the start of the new match.
  bubbles.reset();
  // restore every eaten thing to its remembered home — the island regrows in
  // one frame and the next run starts in under a second
  for (const e of edibles) {
    // ── A REPLACED MOVER MUST NOT BE RESURRECTED ────────────────────────────
    // Maple Falls' commuter train is the only thing in the game that rebuilds
    // itself mid-match: six seconds after it is swallowed, life.ts constructs a
    // NEW four-car train and registers it. The old group stayed in this array
    // forever, and this loop faithfully restored it — visible, un-eaten, and
    // at its remembered home.
    //
    // That home was (0,0,0), because addEdible() snapshots `home` from the
    // group's position and buildTrain() registered the new train while it was
    // still at the origin, before the rail placed it. Under w(v)=(v-6000)*0.05
    // the origin is world 6000: the central crossroads. So every match after
    // the first opened with a dead locomotive parked in the middle of town, on
    // top of whatever is authored there — and the placement sweep that would
    // have nudged or retired it skips anything flagged `mover`. Each further
    // eat-and-respawn added another one.
    //
    // Nothing reached this except a session's SECOND match, which is why it
    // survived every single-match playtest — on the world the store screenshots
    // are shot from. Rivals eat by the same rule with no mover exclusion, so it
    // did not even need the player to be near the rail.
    if (e.mesh.userData.retired) { e.mesh.visible = false; if (e.mesh.parent) scene.remove(e.mesh); continue; }
    e.eaten = false; e.t = 0;
    e.mesh.userData.eaten = false;
    e.mesh.userData.byPlayer = false;
    e.mesh.visible = true;
    if (!e.mesh.parent) scene.add(e.mesh);
    // magnet drift + topple mean EVERYTHING goes back to its surveyed home
    e.mesh.position.copy(e.home);
    e.mesh.scale.copy(e.homeScale);
    // the island regrows, and so do its shadows
    setShadowInstance((e.mesh.userData.shIdx as number) ?? -1, true,
      e.home.x, e.home.z, (e.mesh.userData.shScale as number) ?? 1);
    // sunbathers lie down (rot.x = -π/2) — restoring plain (0, y, 0) stood
    // every bather up at towel height after a rematch
    e.mesh.rotation.set(e.mesh.userData.homeRotX ?? 0, e.homeRotY, e.mesh.userData.homeRotZ ?? 0);
  }
  // join times are scaled to the clock they'll run on. beginMatch() sets
  // matchLen further down, so pass the length it is ABOUT to choose — reading
  // the live one here would scale the new match's joins to the old match's clock.
  rivals.reset(soloMode ? 120 : MATCH_LEN);
  curStage = 0; voidling.setStage(0); voidling.setRadius(START_R);
  // FIXED START, deliberately. A replay review argued for randomising this —
  // every match opening on the same twenty seconds is real repetition — but the
  // owner's call is that the opening must be hand-authored and identical every
  // single load: "the void should start somewhere more fun and super crisp.
  // Consistency is key here. Always the same for every load." A first
  // impression you can tune beats one you can only sample. The variety budget
  // is spent on the rival cast, their join times and the gilded treasure
  // instead, all of which re-roll per match without touching the opening.
  voidState.x = island.spawn.x; voidState.z = island.spawn.z;
  gildTreasure();
  velX = 0; velZ = 0; camDist = 50;
  playerScore = 0; hunger = 0; combo = 0; prevRank = 0; chompCd = 0; newsCd = COPY.signOn;
  feastR = 0;     // the ceiling a rival bought you does not carry into the next match
  for (const k in moments) (moments as Record<string, boolean>)[k] = false;
  renderQuests();
  ended = false;
  // colours and dusk reset per match; the four INTENSITIES come from the one
  // rig, so a replay is lit exactly like the first match (see RIG above)
  sun.color.copy(SUN_DAY); hemi.color.copy(HEMI_DAY); island.setDusk(LIGHT.dusk);
  applyLightRig(); outroT = 0;
  el('end').classList.remove('show');
  timerEl.style.color = '';
  beginMatch(soloMode);
}
el('btnAgain').addEventListener('click', () => { track('again_tap', { played: stats.matches }); resetMatch(); });
el('btnHome').addEventListener('click', () => {
  track('home_tap', { played: stats.matches });
  el('end').classList.remove('show');
  document.body.classList.add('menu');
  menuEl.style.display = '';
  renderRank();
});
// in-game HOME (⌂): confirm first — a kid's stray tap must not eat the match.
// Tap once: the button becomes "LEAVE?" for 3 seconds; tap again to confirm.
{
  const qBtn = el('btnQuit');
  let armT = 0;
  // FIRST TAP PAUSES. It used to arm a LEAVE? confirm, which meant the only
  // in-match control a child had was "throw this away" — and there was no way
  // to reach sound at all, because #btnSettings lives inside #menu and measures
  // 0x0 during a match. A parent who needed quiet had to end the run.
  const pauseEl = el('pause');
  const pSnd = el('pauseSound'), pHap = el('pauseHaptics'), pMot = el('pauseMotion');
  const paintPause = () => {
    const sOff = audio.isMuted();
    pSnd.classList.toggle('off', sOff);
    pSnd.querySelector('b')!.textContent = sOff ? 'OFF' : 'ON';
    pHap.classList.toggle('off', !hapticsOn);
    pHap.querySelector('b')!.textContent = hapticsOn ? 'ON' : 'OFF';
    const bigMotion = !reduceMotion();
    pMot.classList.toggle('off', !bigMotion);
    pMot.querySelector('b')!.textContent = bigMotion ? 'ON' : 'OFF';
  };
  const resume = () => { paused = false; pauseEl.classList.remove('show'); clock.getDelta(); };
  pSnd.addEventListener('click', () => { audio.setMuted(!audio.isMuted()); paintPause(); });
  pHap.addEventListener('click', () => {
    hapticsOn = !hapticsOn;
    localStorage.setItem('voidHaptics', hapticsOn ? '1' : '0');
    paintPause(); if (hapticsOn) buzz(30);
  });
  pMot.addEventListener('click', () => { setReduceMotion(!reduceMotion()); paintPause(); });
  el('pauseResume').addEventListener('click', resume);
  // …and backgrounding the app pauses it too, so a child who is called away
  // does not come back to a finished match they never got to play.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && started && !ended && !paused) {
      paused = true; paintPause(); pauseEl.classList.add('show');
    }
    // (the joystick's own visibilitychange handler, next to joyRelease, clears
    // the stick itself — this listener only owns the sheet)
  });
  qBtn.addEventListener('click', () => {
    if (!started || ended) return;
    void armT;
    paused = true; paintPause(); pauseEl.classList.add('show');
    joyRelease();   // the thumb that was steering is now over a modal that cannot hear it
    track('pause_open', { sec: elapsed() });
  });
  const doQuit = () => {
    resume();
    qBtn.textContent = '⌂'; qBtn.classList.remove('arm');
    saveStats();   // partial progress (things eaten) still counts toward trophies
    countMatch();
    track('match_quit', {
      sec: elapsed(), left: Math.round(matchClock),
      score: Math.round(playerScore), eaten: matchEaten, pct: devouredPct,
      form: curStage, bites: rivalEv.bites, ...fpsSummary(),
    });
    started = false; ended = true;
    audio.stopMusic();
    document.body.classList.add('menu');
    menuEl.style.display = '';
    renderRank();
  };
  el('pauseQuit').addEventListener('click', doQuit);
}
document.querySelectorAll('.backBtn').forEach((b) => b.addEventListener('click', () => el((b as HTMLElement).dataset.close!).classList.remove('show')));

// ── lifetime stats + trophies ────────────────────────────────────────────────
interface Stats { matches: number; wins: number; best: number; bestForm: number; eaten: number; rivals?: number; combo?: number; }
const stats: Stats = JSON.parse(localStorage.getItem('voidStats') || '{"matches":0,"wins":0,"best":0,"bestForm":0,"eaten":0}');
stats.rivals ??= 0; stats.combo ??= 0;
const saveStats = () => localStorage.setItem('voidStats', JSON.stringify(stats));
// Trophies span DIFFERENT axes (forms, wins, scores, appetite, the family,
// combos, loyalty) and every one carries live progress — a kid can see
// "812 / 5000" and keep chasing instead of staring at a grey square.
const TROPHIES: { ic: string; nm: string; ds: string; cur: () => number; max: number }[] = [
  { ic: '🍩', nm: 'First Bite', ds: 'eat your first snack', cur: () => stats.eaten, max: 1 },
  { ic: '😋', nm: 'Muncher', ds: 'reach MUNCHER form', cur: () => stats.bestForm, max: 1 },
  { ic: '🌀', nm: 'Gobbler', ds: 'reach GOBBLER form', cur: () => stats.bestForm, max: 2 },
  { ic: '🕳️', nm: 'Devourer', ds: 'reach DEVOURER form', cur: () => stats.bestForm, max: 3 },
  { ic: '🪐', nm: 'World Ender', ds: 'reach the final form', cur: () => stats.bestForm, max: 4 },
  { ic: '👑', nm: 'Champion', ds: 'win a match', cur: () => stats.wins, max: 1 },
  { ic: '🏰', nm: 'Dynasty', ds: 'win 10 matches', cur: () => stats.wins, max: 10 },
  { ic: '💯', nm: 'Century', ds: 'score 2,500 in a run', cur: () => stats.best, max: 2500 },
  { ic: '🚀', nm: 'Moon Shot', ds: 'score 15,000 in a run', cur: () => stats.best, max: 15000 },
  { ic: '🍽️', nm: 'Big Appetite', ds: 'eat 500 things', cur: () => stats.eaten, max: 500 },
  { ic: '🌌', nm: 'Bottomless', ds: 'eat 5,000 things', cur: () => stats.eaten, max: 5000 },
  { ic: '⚡', nm: 'Bigger Than Auntie', ds: 'out-gobble a family member', cur: () => stats.rivals ?? 0, max: 1 },
  { ic: '🏅', nm: 'Family Champion', ds: 'out-gobble 10 family members', cur: () => stats.rivals ?? 0, max: 10 },
  { ic: '🔥', nm: 'Combo King', ds: 'hit a x2.5 combo', cur: () => stats.combo ?? 0, max: 25 },
  { ic: '📅', nm: 'Regular', ds: 'play 25 matches', cur: () => stats.matches, max: 25 },
];
function renderTrophies() {
  el('statsRow').innerHTML = [
    { v: stats.matches, l: 'MATCHES' }, { v: stats.wins, l: 'WINS' },
    { v: stats.best, l: 'BEST SCORE' }, { v: stats.eaten, l: 'THINGS EATEN' },
  ].map((s) => `<div class="stat"><div class="v">${s.v}</div><div class="l">${s.l}</div></div>`).join('');
  const got = TROPHIES.filter((t) => t.cur() >= t.max).length;
  el('trophyGrid').innerHTML = TROPHIES.map((t) => {
    const c = t.cur(), done = c >= t.max;
    const pct = Math.min(100, Math.round((c / t.max) * 100));
    return `<div class="tr ${done ? 'got' : ''}"><div class="ic">${t.ic}</div>` +
      `<div class="nm">${t.nm}</div><div class="ds">${t.ds}</div>` +
      (done ? '<div class="trDone">✓ EARNED</div>'
        : `<div class="trBar"><div style="width:${pct}%"></div></div><div class="trCnt">${Math.min(c, t.max)} / ${t.max}</div>`) +
      '</div>';
  }).join('');
  el('trophyCount').textContent = `${got} / ${TROPHIES.length} EARNED`;
}
el('btnTrophies').addEventListener('click', () => { renderTrophies(); el('trophies').classList.add('show'); });

// ── top voids of the week (local weekly board, seeded with the family) ──────
function weekKey() { const d = new Date(); const on = new Date(d.getFullYear(), 0, 1); return `voidWeek-${d.getFullYear()}-${Math.ceil((((d.getTime() - on.getTime()) / 86400000) + on.getDay() + 1) / 7)}`; }
function weeklyBoard(): { name: string; score: number; color: number; me?: boolean }[] {
  // the family's weekly scores SCALE to the player: always a couple of rungs
  // just above your best (chaseable), never a fixed 1830-3720 wall that parks
  // a new kid at permanent rank 8
  // honesty: a player whose trophy screen says BEST 31,240 must never be
  // shown as "You — 0" here. No weekly score yet? fall back to the real best.
  const mine = Number(localStorage.getItem(weekKey()) || 0) || stats.best;
  // THE BOARD HAD TO BE UNCLIMBABLE, and the comment above says why it was
  // written that way — a fixed wall parks a new player at permanent rank 8, so
  // the ladder was scaled to them instead. But scaling every rival off the
  // player's OWN best just moves the trap: five of the seven multipliers were
  // at or above 1.0, so the player sat 6th of 8 at 200 points and 6th of 8 at
  // 200,000, and a brilliant week changed nothing because the whole board rose
  // with it. It is a leaderboard on which the number can never go up.
  //
  // The anchor is now FROZEN on the first view of each week. The rivals are a
  // fixed ladder for those seven days, so beating your Tuesday score genuinely
  // overtakes WOBBLES on Wednesday — and the anchor is seeded from the player's
  // best, so a new child still opens mid-table rather than at the bottom.
  const aKey = weekKey() + '-anchor';
  let anchor = Number(localStorage.getItem(aKey) || 0);
  if (!anchor) {
    anchor = Math.max(220, stats.best, mine);
    localStorage.setItem(aKey, String(anchor));
  }
  // straddles 1.0 so the opening position is mid-table and both directions are
  // reachable inside one week
  const mul = [1.42, 1.19, 1.02, 0.88, 0.72, 0.55, 0.34];
  const seeds = [
    { name: 'CHOMPZILLA', color: 0x7ed57a }, { name: 'BITSY', color: 0xff9a3a },
    { name: 'GLITZ', color: 0xff6fb0 }, { name: 'DOZER', color: 0x4d8ff0 },
    { name: 'WOBBLES', color: 0x2fd8c0 }, { name: 'B1G-B1TE', color: 0xd85a5a },
    { name: 'snackrat', color: 0xb98cff },
  ].map((s, i) => ({ ...s, score: Math.round((anchor * mul[i]) / 5) * 5 }));
  const rows = [...seeds, { name: 'You', score: mine, color: 0x9a5cff, me: true }];
  return rows.sort((a, b) => b.score - a.score);
}
function renderTop() {
  const medals = ['🥇', '🥈', '🥉'];
  el('topList').innerHTML = weeklyBoard().map((r, i) =>
    `<div class="tv ${r.me ? 'me' : ''}"><span class="rk">${medals[i] || i + 1}</span><span class="dot2" style="background:#${r.color.toString(16).padStart(6, '0')}"></span><span class="nm2">${r.name}</span><span class="sc2">${r.score}</span></div>`).join('');
}
el('btnTop').addEventListener('click', () => { renderTop(); el('topvoids').classList.add('show'); });

// ── menu gift box RETIRED — the daily calendar owns login rewards now ──
if (false) {
  const giftEl = el('gift');
  const refreshGift = () => { giftEl.style.display = Date.now() >= Number(localStorage.getItem('voidGiftAt') || 0) ? '' : 'none'; };
  giftEl.addEventListener('click', () => {
    // deterministic ladder (50/75/100), resets daily — a gift, not a slot machine
    const today = new Date().toDateString();
    if (localStorage.getItem('voidGiftDay') !== today) { localStorage.setItem('voidGiftDay', today); localStorage.setItem('voidGiftN', '0'); }
    const n = Math.min(2, Number(localStorage.getItem('voidGiftN') || 0));
    localStorage.setItem('voidGiftN', String(n + 1));
    const amt = [50, 75, 100][n];
    addCoins(amt);
    giftEl.textContent = `+${amt}✦!`;
    audio.evolve(); buzz(40);
    localStorage.setItem('voidGiftAt', String(Date.now() + 30 * 60 * 1000));
    setTimeout(() => { giftEl.textContent = '🎁'; refreshGift(); }, 1400);
  });
  setInterval(refreshGift, 20000);
  refreshGift();
}
renderRank();
// ── daily login rewards — a calendar that DOES NOT END ────────────────────
// It used to clamp the day index with Math.min(6, ...), so from the seventh day
// onward a returning child saw the identical "DAY 7 · 300✦" card every single
// morning, with the streak frozen at 7 and nothing new ever again. The owner
// asked the obvious question — "what happens after they hit 7 days?" — and the
// answer was nothing, forever.
//
// The week now CYCLES. Finish day 7 and the calendar rolls over to WEEK 2, and
// every reward in it is worth more: +20% per completed week, capped at 3x so it
// climbs without running away. The true consecutive-day count is kept and shown
// separately, so a child on day 23 is told they are on day 23 rather than
// day 7 for the seventeenth time.
{
  // Flatter than [50,75,100,125,150,200,300], which made day 7 a 6x spike over
  // day 1 and therefore a 5x fall on the morning after. A cyclical calendar
  // always dips at the roll-over — the fix is to make the dip small and to
  // label the day honestly, not to pretend it is not there.
  const DAILY = [90, 110, 130, 160, 190, 230, 300];
  const today = new Date().toDateString();
  const last = localStorage.getItem('voidDailyLast');
  if (last !== today && menuEl.style.display !== 'none' && !DEBUG_HARNESS && !TOPDOWN && !ASSETVIEW) {
    const yd = new Date(Date.now() - 86400000).toDateString();
    const kept = last === yd;                                  // did they come back yesterday?
    const prevDay = Number(localStorage.getItem('voidDailyDay') || 0);
    // day 0-6 inside the week; finishing 6 rolls the week over
    const day = kept ? (prevDay + 1) % 7 : 0;
    const week = kept
      ? Number(localStorage.getItem('voidDailyWeek') || 1) + (prevDay === 6 ? 1 : 0)
      : 1;
    // ONE STREAK, NOT TWO. `voidStreak` (bumped when a match ends) and
    // `voidDailyStreak` (bumped when the calendar is claimed) counted the same
    // idea separately and drifted apart: measured, the calendar header read
    // "🔥 22 DAY STREAK!" while the rank chip beside it read "🥉 BRONZE · LVL 1"
    // with no flame at all, and the shop still gated Prism behind "7-DAY
    // STREAK". A child was on three different streaks at once.
    //
    // The daily calendar is the honest one — it counts days the game was
    // OPENED, which is what a streak means and what the streak skins are
    // promising. It now writes the shared counter that the chip and the shop
    // already read.
    // …off the SHARED gate, not `kept`. `kept` asks whether the CARD was
    // claimed yesterday, which is the right question for the reward index and
    // the week rollover and the wrong one for the streak: a match finished
    // yesterday also counts, and a match finished earlier TODAY has already
    // counted. Reading voidStreakDay makes this and bumpStreak() the same
    // decision made twice rather than two decisions that disagree.
    const sDay = localStorage.getItem('voidStreakDay');
    const streak = sDay === today ? Number(localStorage.getItem('voidDailyStreak') || 1)
      : sDay === yd ? Number(localStorage.getItem('voidDailyStreak') || 0) + 1
      : 1;
    // +20% a week, capped at 3x. Day 7 of week 4 pays 900 instead of 300.
    const mult = Math.min(3.5, 1 + 0.3 * (week - 1));   // week 2 already pays 30% more
    const amount = (i: number) => Math.round(DAILY[i] * mult / 5) * 5;
    const modal = el('daily');
    // each day is a PRIZE, not a table cell: claimed days stamp a green tick,
    // today's cell is a big bouncing gift, day 7 is the gold treasure chest
    const ICON = ['🪙', '🪙', '💰', '💰', '💎', '💎', '🏆'];
    // LIFETIME day numbers, not day-of-week. On the morning after a child
    // finished day 7 for 300 coins, the card reset to a cell labelled "DAY 1"
    // paying 60 — the single most important morning in the whole retention
    // loop, and it read as a demotion for coming back. The prizes still cycle
    // (they have to; that is what a calendar is) but the number never goes
    // backwards, so day 8 is day 8 and the WEEK 2 header explains why the
    // prizes are bigger this time round.
    const dayNo = (week - 1) * 7;
    el('dailyGrid').innerHTML = DAILY.map((_amt, i) =>
      `<div class="dCell ${i < day ? 'past' : i === day ? 'now' : ''} ${i === 6 ? 'mega' : ''}">` +
      `<b>DAY ${dayNo + i + 1}</b><span class="dIcon">${i < day ? '✅' : i === day ? '🎁' : ICON[i]}</span>` +
      `<span class="dAmt">${amount(i)}<i>✦</i></span></div>`).join('');
    // the streak is the LIFETIME consecutive-day count, and the week is stated,
    // so the card is different on day 8 from how it was on day 7
    el('dailyStreak').textContent = streak > 1
      ? `🔥 ${streak} DAY STREAK!${week > 1 ? ` · WEEK ${week}` : ''}`
      : 'welcome back!';
    el('dailyTitle').textContent = week > 1 ? `WEEK ${week} REWARD` : 'DAILY REWARD';
    // ONE WAY OUT, whichever way they take it — claim or tap the backdrop — so
    // a world switch that had to wait for this card is never forgotten.
    const closeDaily = () => {
      modal.classList.remove('show');
      if (!pendingLaunch) return;
      pendingLaunch = false;
      launchWorld();
    };
    (el('dailyClaim') as HTMLButtonElement).innerHTML = `CLAIM ${amount(day)}<i>✦</i>`;
    (el('dailyClaim') as HTMLButtonElement).onclick = () => {
      addCoins(amount(day));
      localStorage.setItem('voidDailyLast', today);
      localStorage.setItem('voidDailyDay', String(day));
      localStorage.setItem('voidDailyWeek', String(week));
      localStorage.setItem('voidDailyStreak', String(streak));
      localStorage.setItem('voidStreakDay', today);   // counted — bumpStreak stands down
      // …and the one the rank chip and the streak skins read
      setStreak(streak);
      track('daily_claim', { day: day + 1, week, streak, coins: amount(day) });
      // payoff: the prize bursts, coins rain across the card, THEN it closes
      const cell = modal.querySelector('.dCell.now');
      if (cell) { cell.classList.add('pop'); cell.querySelector('.dIcon')!.textContent = '✅'; }
      for (let i = 0; i < 14; i++) {
        const c = document.createElement('div');
        c.className = 'endConf'; c.textContent = i % 3 === 0 ? '✦' : i % 3 === 1 ? '🪙' : '⭐';
        c.style.left = `${Math.random() * 100}%`;
        c.style.animationDelay = `${Math.random() * 0.35}s`;
        modal.appendChild(c);
        setTimeout(() => c.remove(), 3000);
      }
      audio.evolve(); buzz(40);
      setTimeout(closeDaily, 750);
    };
    // …and it must be DISMISSIBLE. It fires on menu open, covers the whole
    // screen and intercepts every button behind it — a playtest harness could
    // not reach PLAY at all until it learned to claim first. CLAIM is still the
    // reward, but tapping the backdrop now gets you out.
    modal.onclick = (ev) => { if (ev.target === modal) closeDaily(); };
    modal.classList.add('show');
  }
}
// ── SETTINGS: sound + rumble toggles, persisted. A parent (and an App Store
// reviewer) expects to be able to silence a kids' game in one tap.
{
  const panel = el('settings');
  const sndRow = el('setSound'), hapRow = el('setHaptics'), motRow = el('setMotion');
  const staRow = el('setStats');
  const paint = () => {
    const sOff = audio.isMuted();
    sndRow.classList.toggle('off', sOff);
    sndRow.querySelector('b')!.textContent = sOff ? 'OFF' : 'ON';
    hapRow.classList.toggle('off', !hapticsOn);
    hapRow.querySelector('b')!.textContent = hapticsOn ? 'ON' : 'OFF';
    // BIG MOTION rather than "reduce motion": the row reads as the thing being
    // turned off, like SOUND and RUMBLE above it, so a parent does not have to
    // reason about a double negative to work out which way is calmer.
    const bigMotion = !reduceMotion();
    motRow.classList.toggle('off', !bigMotion);
    motRow.querySelector('b')!.textContent = bigMotion ? 'ON' : 'OFF';
    const on = analyticsEnabled();
    staRow.classList.toggle('off', !on);
    staRow.querySelector('b')!.textContent = on ? 'ON' : 'OFF';
  };
  el('btnSettings').addEventListener('click', () => { paint(); panel.classList.add('show'); });
  el('setClose').addEventListener('click', () => panel.classList.remove('show'));
  panel.addEventListener('click', (e) => { if (e.target === panel) panel.classList.remove('show'); });
  sndRow.addEventListener('click', () => { audio.setMuted(!audio.isMuted()); paint(); });
  hapRow.addEventListener('click', () => {
    hapticsOn = !hapticsOn;
    localStorage.setItem('voidHaptics', hapticsOn ? '1' : '0');
    paint(); if (hapticsOn) buzz(30);
  });
  motRow.addEventListener('click', () => { setReduceMotion(!reduceMotion()); paint(); });
  // Consent is a grown-up's to give AND to take back, so the gate guards the
  // switch in both directions — a child cannot turn it on, and cannot silently
  // turn off a parent's choice either.
  staRow.addEventListener('click', () => {
    askGrownUp(() => { setAnalyticsEnabled(!analyticsEnabled()); paint(); });
  });
  // Reading the policy is exactly what the gate is for — and it is READ IN
  // APP. window.open() is a dead end inside Capacitor: the app runs at
  // capacitor://localhost with no CFBundleURLTypes registered, so the call is
  // handed to UIApplication.open, which silently returns false for an unknown
  // scheme. A parent answered the sum and absolutely nothing happened.
  {
    const pol = el('policy');
    const frame = el('polFrame') as HTMLIFrameElement;
    const close = () => { pol.classList.remove('show'); frame.src = 'about:blank'; };
    el('setPrivacy').addEventListener('click', () => {
      askGrownUp(() => {
        frame.src = 'privacy.html';   // relative: works at file://, capacitor:// and https
        pol.classList.add('show');
        track('privacy_open', {});
      });
    });
    el('polClose').addEventListener('click', close);
  }
}
// ── THE PARENTAL GATE ──────────────────────────────────────────────────────
// Apple's Kids guidance requires a real CHALLENGE in front of anything that
// spends money or leaves the app. What shipped was one line of static text
// reading "ask a grown-up before you buy" — a sign, not a gate. Two-digit
// multiplication is the standard form: a six-year-old cannot do it, an adult
// does not notice it. The numbers are re-rolled every time so it cannot be
// learned by repetition.
const gateEl = el('gate');
let gatePass: (() => void) | null = null;
let gateAns = 0;
/** Run `then` only if a grown-up answers the sum. */
function askGrownUp(then: () => void): void {
  // Two-digit x one-digit, never a times-table fact. 3 x 6 is homework for a
  // seven-year-old; 17 x 8 is not something the target age does in their head
  // while a grown-up is out of the room, and an adult answers it without
  // thinking. Re-rolled every time, so it cannot be learned by repetition.
  const a = 12 + Math.floor(Math.random() * 8);     // 12..19
  const b = 6 + Math.floor(Math.random() * 4);      // 6..9
  gateAns = a * b;
  gatePass = then;
  el('gateSum').textContent = `${a} × ${b} = ?`;
  (el('gateIn') as HTMLInputElement).value = '';
  el('gateErr').textContent = '';
  gateEl.classList.add('show');
  setTimeout(() => (el('gateIn') as HTMLInputElement).focus(), 60);
}
{
  const go = () => {
    const v = Number((el('gateIn') as HTMLInputElement).value.trim());
    if (v === gateAns) {
      gateEl.classList.remove('show');
      const fn = gatePass; gatePass = null;
      track('gate_pass', {});
      fn?.();
    } else {
      el('gateErr').textContent = 'Not quite. Ask a grown-up to help.';
      (el('gateIn') as HTMLInputElement).value = '';
      audio.hit();
    }
  };
  el('gateGo').addEventListener('click', go);
  el('gateIn').addEventListener('keydown', (e) => { if ((e as KeyboardEvent).key === 'Enter') go(); });
  el('gateNo').addEventListener('click', () => { gatePass = null; gateEl.classList.remove('show'); track('gate_cancel', {}); });
  gateEl.addEventListener('click', (e) => { if (e.target === gateEl) { gatePass = null; gateEl.classList.remove('show'); } });
}

// EXPLICIT debug params only skip the menu — arbitrary query strings on shared
// links (?utm_source=…) must land on the real splash like any player
if (DEBUG_HARNESS || TOPDOWN || ASSETVIEW) { localStorage.setItem('voidTut', '1'); beginMatch(); }

// skin SHOP — earn coins in matches, spend them on skins (LoL soft-currency
// model, same as the 2D shop); owned + equipped persist across sessions
{
  const grid = el('shopGrid');
  // ── SAVE MIGRATION ────────────────────────────────────────────────────────
  // The catalogue went from 25 skins to 15. Anyone who played before that has
  // ids in voidSkinsOwned that no longer exist, and — the part that actually
  // breaks — if their EQUIPPED skin was one of the cut ones, `owned.has(id)`
  // is still true, so the guard below never fires, no card ever renders as
  // EQUIPPED, and setSkin is never called. They are wearing a skin the shop
  // cannot show them and cannot change.
  //
  // Small population today; unfixable after launch. The version key means the
  // next catalogue change gets a place to hang its own migration.
  const SAVE_VER = 2;
  const knownSkin = new Set(SKINS.map((sk) => sk.id));
  {
    const ver = Number(localStorage.getItem('voidSaveVer') || 0);
    if (ver < SAVE_VER) {
      try {
        const raw = JSON.parse(localStorage.getItem('voidSkinsOwned') || '["classic"]') as string[];
        const kept = raw.filter((id) => knownSkin.has(id));
        if (!kept.includes('classic')) kept.push('classic');
        if (kept.length !== raw.length) {
          localStorage.setItem('voidSkinsOwned', JSON.stringify(kept));
          track('save_migrated', { from: ver, dropped: raw.length - kept.length });
        }
      } catch { localStorage.setItem('voidSkinsOwned', '["classic"]'); }
      const eq = localStorage.getItem('voidSkin');
      if (eq && !knownSkin.has(eq)) localStorage.setItem('voidSkin', 'classic');
      localStorage.setItem('voidSaveVer', String(SAVE_VER));
    }
  }
  let owned: Set<string>;
  try { owned = new Set<string>(JSON.parse(localStorage.getItem('voidSkinsOwned') || '["classic"]')); }
  catch { owned = new Set(['classic']); }
  owned.add('classic');   // the free one can never be missing
  let equipped = localStorage.getItem('voidSkin') || 'classic';
  if (!owned.has(equipped) || !knownSkin.has(equipped)) equipped = 'classic';
  const cards = new Map<string, HTMLElement>();
  /** Wear it. Shared by the one-tap card path and the preview's own button so
   *  the two can never drift. */
  const equipSkin = (s: Skin) => {
    if (equipped !== s.id) track('skin_equip', { skin: s.id });
    equipped = s.id;
    voidling.setSkin(s);
    localStorage.setItem('voidSkin', s.id);
    audio.ready();
    refresh();
    // the mirror at the top of the shop is the whole point of two slots
    _dbg.__shopMirror?.();
  };
  // what has been unlocked but not yet looked at
  let fresh: Set<string>;
  try { fresh = new Set<string>(JSON.parse(localStorage.getItem('voidSkinsNew') || '[]')); }
  catch { fresh = new Set(); }
  const sawSkin = (id: string) => {
    if (!fresh.delete(id)) return;
    localStorage.setItem('voidSkinsNew', JSON.stringify([...fresh]));
    // repaint, or the badge outlives the look that cleared it. Tapping an
    // owned card takes the equip path, which refreshes anyway — but tapping a
    // LOCKED one opens the preview and refreshes nothing, so the pill sat
    // there after the child had plainly seen it.
    refresh();
  };
  const walletEl = document.getElementById('shopWalletN');
  let walletShown = coins, walletRaf = 0;
  const paintWallet = (bump = false) => {
    if (!walletEl) return;
    walletShown = coins;
    walletEl.textContent = String(coins);
    const w = walletEl.parentElement;
    if (bump && w) { w.classList.remove('bump'); void w.offsetWidth; w.classList.add('bump'); }
  };
  /** Count the wallet down instead of teleporting it. A number that jumps has
   *  not told a six-year-old that THEY SPENT THAT — one that runs down has. */
  const tweenWallet = (from: number) => {
    if (!walletEl) return;
    if (walletRaf) cancelAnimationFrame(walletRaf);
    const to = coins, t0 = performance.now(), MS = 620;
    walletShown = from;
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / MS);
      const e = 1 - (1 - k) * (1 - k);                    // ease-out, no overshoot
      walletShown = Math.round(from + (to - from) * e);
      walletEl.textContent = String(walletShown);
      if (k < 1) walletRaf = requestAnimationFrame(step);
      else { walletRaf = 0; paintWallet(true); }
    };
    walletRaf = requestAnimationFrame(step);
  };
  /** The card pops and throws a handful of sparkles. Everything here is CSS on
   *  two throwaway classes, so the reduced-motion block can switch it off. */
  const celebrate = (s: Skin) => {
    const card = cards.get(s.id);
    if (!card) return;
    card.classList.remove('bought'); void card.offsetWidth; card.classList.add('bought');
    const burst = document.createElement('div');
    burst.className = 'burst';
    for (let i = 0; i < 7; i++) {
      const g = document.createElement('i');
      const a = (i / 7) * Math.PI * 2 + 0.4;
      g.style.setProperty('--dx', `${Math.cos(a) * 46}px`);
      g.style.setProperty('--dy', `${Math.sin(a) * 46}px`);
      g.style.animationDelay = `${i * 22}ms`;
      g.textContent = '✦';
      burst.appendChild(g);
    }
    card.appendChild(burst);
    setTimeout(() => burst.remove(), 900);
  };
  const refresh = () => {
    paintWallet();
    // the tab is the collection meter: how many of these do you have?
    const tv = document.getElementById('tabVoids');
    if (tv) tv.textContent = `${SKINS.filter((x) => owned.has(x.id)).length} of ${SKINS.length} collected`;
    for (const s of SKINS) {
      const card = cards.get(s.id)!;
      const pr = card.querySelector('.pr') as HTMLElement;
      const has = owned.has(s.id);
      // NEW until you have looked at it. Owning a thing and knowing you own it
      // are different, and a streak reward that appears between sessions is
      // exactly the case where they come apart.
      card.classList.toggle('isnew', fresh.has(s.id));
      const cost = PRICES[s.id] ?? 0;
      // AFFORDABLE IS A STATE. Without it the shop asks a six-year-old to hold
      // a four-digit wallet in their head and compare it to thirteen prices.
      const can = !has && !s.cash && !s.streak && cost > 0 && coins >= cost;
      card.classList.toggle('equip', equipped === s.id);
      card.classList.toggle('locked', !has);
      card.classList.toggle('owned', has);
      card.classList.toggle('can', can);
      pr.className = 'pr' + (has ? ' owned' : '');
      pr.textContent = equipped === s.id ? 'EQUIPPED' : has ? 'OWNED'
        : s.cash ? `💎 ${iapPrice(s.id) ?? `$${s.cash.toFixed(2)}`}`
        : s.streak ? `🔥 ${s.streak}-DAY STREAK` : `✦ ${cost}`;
      // …and HOW FAR ALONG, which is what turns a price list into a collection
      const bar = card.querySelector('.skBar > i') as HTMLElement | null;
      if (bar) bar.style.width = `${Math.min(100, cost ? (coins / cost) * 100 : 0)}%`;
    }
  };
  // AFTER the definition, not before it. A `() => refresh()` thunk registered
  // above the const would be fine only until something called addCoins before
  // this block finished evaluating, and this file has already lost an evening
  // to exactly that class of bug.
  coinWatchers.push(refresh);
  // unlockStreakSkins() writes straight to localStorage because it can run
  // before this block exists; when it runs after, this keeps the in-memory set
  // and the grid in step instead of waiting for a reload.
  _dbg.__skinsGranted = (ids: string[]) => {
    let any = false;
    for (const id of ids) if (!owned.has(id)) { owned.add(id); fresh.add(id); any = true; }
    if (any) refresh();
  };
  // LEGENDARY FIRST is the right instinct for a store whose in-app purchases
  // work — but when they did not, the shop opened on seven consecutive
  // refusals at $4.99-$9.99, and with two thousand coins in the wallet the
  // first thing a child could actually buy was the eighth card, below the
  // fold. The coin tier still leads: a child should meet something they can
  // earn before something a parent has to pay for, and that stays true now
  // that the paid tier takes money.
  // …and the reorder only went half way. It moved EPIC above LEGENDARY and
  // left EVERYDAY at the bottom — but EPIC starts at 600 coins and EVERYDAY
  // starts at 150, and a first match pays somewhere between 35 and 160. So a
  // child opening the shop for the first time still met ten cards at
  // 600-1,500, then seven at $4.99-$9.99, and the first thing they could
  // realistically save for was card eighteen, below the fold. Cheapest first,
  // dearest last: the aspirational tier is what you scroll INTO, which is
  // where wanting things comes from.
  // THE EPIC TIER IS GONE. void3d's setSkin shows the engine's entire
  // difference between CLASSIC and EPIC: one texture uniform. Pattern, eye
  // shape, aura, body geometry and accessories are all gated on the character
  // rig, which only the paid skins have. So there were three rarity names for
  // two real classes — colour, and character. Now there are two, plus the free
  // streak rewards, which had been sorting under a header that said SPEND
  // COINS above two cards that cannot be bought with coins.
  const tierOf = (s: Skin) => (s.cash ? 2 : s.streak ? 1 : 0);
  const SORTED = [...SKINS].sort((a, b) => tierOf(a) - tierOf(b));
  const TIER_HEAD = [
    '<div class="shopTier">🎨 COINS <span>A NEW LOOK FOR YOUR VOID</span></div>',
    '<div class="shopTier">🔥 COME BACK <span>FREE — PLAY EVERY DAY</span></div>',
    `<div class="shopTier gold">✨ LEGENDARY <span>${iapAvailable() ? 'A WHOLE NEW CHARACTER' : 'COMING SOON ON iPHONE'}</span></div>`,
  ];
  // the skin's own gradient always sits UNDER the AI art — a failed CDN load
  // still shows a branded colored orb, never a bare black hole on a paid card
  // INSIDE OUT. This ran rim -> mid -> abyss from the centre outward, which is
  // the exact opposite of the void shader (palette.ts: "darkest dead-centre,
  // lit violet at the rim"). So whenever the CDN art is slow or offline — the
  // very case this fallback exists for — the shop card advertised a purple ball
  // with an orange highlight and the match handed over a black orb in a halo.
  const skinGrad = (s: Skin) => `radial-gradient(circle at 50% 46%, #${s.abyss.toString(16).padStart(6, '0')} 0%, #${s.mid.toString(16).padStart(6, '0')} 58%, #${s.rim.toString(16).padStart(6, '0')} 100%)`;
  // ── THE CARD'S BACKDROP ──────────────────────────────────────────────────
  // Once the card became a render, the old orbStyle disc stopped being a
  // fallback and started being a mistake: a hard-edged coloured circle with an
  // inset shadow, sitting behind a character that does not quite fill it, so
  // every card read as a coin in a saucer.
  //
  // What it should be is a SPOTLIGHT — a soft bloom in the skin's own colours
  // that fades out before it reaches an edge. It still does the fallback job
  // (a card is never a bare hole before the render lands) and it still carries
  // the skin's identity at thumbnail size, but there is no rim for the
  // character to fail to touch.
  const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;
  // ── THE BACKDROP IS A HALO, NOT A CLOUD ───────────────────────────────────
  // It used to run the skin's mid colour at cc (80% alpha) from the centre out
  // to a third of the radius and 88 (53%) past halfway, which put a saturated
  // disc DIRECTLY BEHIND a character that only covered 58% of the circle. What
  // reads as "not crisp" in a screenshot is mostly this: a bright cloud bleeding
  // out around the silhouette, softening an edge the renderer drew sharp.
  //
  // The character carries the picture now. The colour survives as a dim wash
  // and a rim that peaks OUTSIDE the void's own outline, so a card still reads
  // as its skin at a glance — and one that has not painted yet is still a
  // coloured orb rather than a hole.
  const cardGlow = (s: Skin) => `background: radial-gradient(circle at 50% 46%, `
    + `${hex(s.mid)}3d 0%, ${hex(s.mid)}33 42%, ${hex(s.rim)}2b 66%, ${hex(s.rim)}14 80%, transparent 92%);`;
  // orbStyle, artLayer and FACE_SVG lived here. All three are gone with the
  // painted card: orbStyle drew the hard-edged disc that framed every render
  // as a coin in a saucer, artLayer pasted a CDN photograph over the face, and
  // FACE_SVG was a hand-drawn approximation of a face the renderer now draws
  // properly. Nothing on either tab reads Skin.art any more.
  // ── skin PREVIEW: tap a card → meet the skin BIG, then equip/buy from there
  const prevEl = el('skinPrev'), spAct = el('spAct');
  let prevSkin: Skin | null = null;
  // The store's own localized price where StoreKit has one — a child in
  // France should read "4,99 €", not a hard-coded dollar figure — falling back
  // to the config USD everywhere else.
  const priceOf = (s: Skin) => iapPrice(s.id) ?? `$${(s.cash ?? 0).toFixed(2)}`;
  let buying = false;
  const refreshPreview = () => {
    if (!prevSkin) return;
    const s = prevSkin;
    spAct.classList.toggle('busy', buying);
    spAct.textContent = buying ? '…' : equipped === s.id ? '✓ EQUIPPED'
      : owned.has(s.id) ? 'EQUIP'
      // The legendary tier took no money and said COMING SOON. It now says
      // what it costs, and on iOS it charges. On the open web there is no way
      // to take payment, so it points at the App Store rather than pretending.
      : s.cash ? (iapAvailable() ? `💎 BUY · ${priceOf(s)}` : `💎 ${priceOf(s)} · ON THE APP STORE`)
      : s.streak ? `🔥 PLAY ${s.streak} DAYS IN A ROW`
      : `BUY · ✦ ${PRICES[s.id]}`;
  };
  const openPreview = (s: Skin) => {
    prevSkin = s;
    // THE PREVIEW IS ALIVE. It used to be the card's picture at a larger size —
    // a gradient, an SVG face, and for the paid tier a CDN photograph. A child
    // who taps a card has asked to look at ONE character, which is the only
    // place in the shop where a still is the wrong answer.
    const orb = el('spOrb');
    orb.setAttribute('style', cardGlow(s));
    orb.innerHTML = '';
    prevEl.classList.remove('win');   // showUnlock() puts it back; a plain look never has it
    el('spName').textContent = s.name;
    el('spTier').textContent = s.cash ? 'LEGENDARY · A WHOLE NEW CHARACTER'
      : s.streak ? 'COME BACK · FREE' : 'COINS · A NEW LOOK';
    refreshPreview();
    _dbg.__previewVoid?.(s);
    prevEl.classList.add('show');
    audio.ready();
    track('skin_view', {
      skin: s.id, tier: s.cash ? 'legendary' : s.streak ? 'streak' : s.tex ? 'epic' : 'classic',
      owned: owned.has(s.id), price: s.cash ?? PRICES[s.id] ?? 0, coins,
    });
  };
  // …and it stops dead when the modal shuts. A turntable left running behind a
  // closed overlay is a phone battery being spent on nothing.
  const closePreview = () => {
    prevEl.classList.remove('show');
    prevEl.classList.remove('win');
    _dbg.__previewStop?.();
    // a second prize waiting behind the first
    if (celebQ.length) setTimeout(() => showUnlock(celebQ.shift()!), 340);
  };
  el('spClose').addEventListener('click', closePreview);
  prevEl.addEventListener('click', (ev) => { if (ev.target === prevEl) closePreview(); });

  // ── THE UNLOCK MOMENT ─────────────────────────────────────────────────────
  // The banner cannot do this job. #banner is HUD furniture and index.html
  // hides it under `body.menu` — which is precisely where a streak reward
  // lands, on the menu, a second after the daily card closes. A message posted
  // to a hidden element is the same silence the reward already had.
  //
  // So the celebration is THIS card, which is the only surface in the game
  // that shows the real void alive and turning rather than describing it. Same
  // modal, different headline: not "here is something you could have" but
  // "here is something you just got, go and put it on".
  const showUnlock = (s: Skin) => {
    openPreview(s);
    prevEl.classList.add('win');
    el('spWin').textContent = s.streak ? `🔥 ${s.streak} DAYS IN A ROW` : 'UNLOCKED!';
    el('spTier').textContent = 'IT IS YOURS — FOREVER';
    spAct.textContent = 'WEAR IT!';
    audio.evolve();
    buzz(70);
    for (let i = 0; i < 16; i++) {
      const c = document.createElement('div');
      c.className = 'endConf';
      c.textContent = i % 3 === 0 ? '✦' : i % 3 === 1 ? '⭐' : '🎉';
      c.style.left = `${Math.random() * 100}%`;
      c.style.animationDelay = `${Math.random() * 0.4}s`;
      prevEl.appendChild(c);
      setTimeout(() => c.remove(), 3000);
    }
    track('skin_unlock_shown', { skin: s.id, days: s.streak ?? 0 });
  };
  let celebQ: Skin[] = [];
  _dbg.__celebrateSkins = (list: Skin[]) => {
    if (!list.length) return;
    celebQ = list.slice(1);
    showUnlock(list[0]);
  };
  spAct.addEventListener('click', () => {
    const s = prevSkin;
    if (!s) return;
    if (s.streak && !owned.has(s.id)) {
      // it used to fire the error buzz and return — no toast, no explanation,
      // no state change. A child taps a card in the shop and the game buzzes.
      track('skin_streak_tap', { skin: s.id, days: s.streak });
      spAct.textContent = `PLAY ${s.streak} DAYS IN A ROW — YOU'RE ON DAY ${streak}`;
      audio.ready();
      setTimeout(refreshPreview, 2200);
      return;
    }
    if (s.cash && !owned.has(s.id)) {
      // THE demand signal for in-app purchases: how many children reach for a
      // paid skin, and which one. Nothing else in the build answers that.
      track('legendary_tap', { skin: s.id, usd: s.cash, coins, lvl: rankInfo(xp).lvl, played: stats.matches });
      if (buying) return;
      if (!iapAvailable()) {
        // No payment path on this platform. Say where to get it — a locked
        // hero should read as something to look forward to, not a refusal.
        spAct.textContent = '👀 COMING TO THE APP STORE!';
        audio.ready();
        setTimeout(refreshPreview, 2000);
        return;
      }
      // THE gate. Before this, the StoreKit sheet was three taps from the main
      // menu with nothing but a line of text in between.
      const price = s.cash;
      askGrownUp(() => {
        buying = true; refreshPreview();
        void iapPurchase(s.id, price).then((res) => {
          buying = false;
          if (res === 'started') { spAct.textContent = 'CONFIRM IN THE APP STORE…'; return; }
          if (res === 'granted') { audio.evolve(); refresh(); refreshPreview(); return; }
          // 'not_ready' must NEVER read as "coming soon" — the product exists,
          // the store is simply still waking up.
          spAct.textContent = res === 'unavailable' ? '👀 COMING TO THE APP STORE!'
            : res === 'not_ready' ? 'THE STORE IS BUSY — TRY AGAIN'
            : 'COULD NOT BUY — TRY AGAIN';
          audio.hit();
          setTimeout(refreshPreview, 2000);
        });
      });
      return;
    }
    if (!owned.has(s.id)) {
      if (coins >= PRICES[s.id]) {
        track('skin_buy', { skin: s.id, price: PRICES[s.id], left: coins - PRICES[s.id], played: stats.matches });
        const before = coins;
        addCoins(-PRICES[s.id]);
        tweenWallet(before);
        owned.add(s.id);
        localStorage.setItem('voidSkinsOwned', JSON.stringify([...owned]));
        // A PURCHASE SHOULD FEEL LIKE ONE. This used to change a label from
        // '✦ 750' to 'OWNED' — the entire payoff for roughly nineteen matches
        // of earning, delivered as a text swap behind a modal the child is
        // still looking at. Now the card pops, the wallet counts itself down,
        // and the void says something.
        celebrate(s);
        audio.evolve();
        buzz(70);
        setTimeout(() => audio.voice('happy'), 260);
      } else {
        // how far short, and how often — the coin economy's only real feedback
        track('skin_short', { skin: s.id, price: PRICES[s.id], coins, short: PRICES[s.id] - coins });
        spAct.textContent = `NEED ${PRICES[s.id] - coins}✦ MORE!`; audio.hit(); setTimeout(refreshPreview, 1400); return;
      }
    }
    equipSkin(s);
    refreshPreview();
  });
  // StoreKit hands ownership back here — from a fresh purchase, and from
  // RESTORE PURCHASES, which App Review requires and which a child who got a
  // new iPad genuinely needs.
  initIAP((ids) => {
    // TWO WARDROBES NOW. StoreKit hands back product ids and does not care
    // which slot they belong to, so route by id — a purchased hat landing in
    // voidSkinsOwned would be a skin the shop cannot show and a hat the child
    // paid for and never receives.
    const hats = ids.filter((id) => !!HAT_BY_ID[id]);
    if (hats.length) _dbg.__grantHats(hats);
    let gained = false;
    for (const id of ids) if (!HAT_BY_ID[id] && !owned.has(id)) { owned.add(id); gained = true; }
    if (gained) {
      localStorage.setItem('voidSkinsOwned', JSON.stringify([...owned]));
      refresh(); refreshPreview();
    }
    if (gained || hats.length) { audio.evolve(); buzz(70); }
  }, () => { refresh(); refreshPreview(); });   // prices land async — repaint

  {
    const rb = el('btnRestore');
    rb.addEventListener('click', () => {
      // ── CHECK THE PLATFORM BEFORE THE GATE, NOT AFTER IT ────────────────
      // The third instance of this. The skin path has always done it, the hat
      // path was fixed with the note "a parent was handed a two-digit
      // multiplication to solve and the reward for solving it was being told
      // the thing is not for sale", and RESTORE was left behind — worse than
      // either, because restoring is the button a parent presses when they
      // believe they have ALREADY paid, so the dead end lands on someone with
      // a genuine grievance.
      if (!iapAvailable()) {
        rb.textContent = 'ONLY ON THE APP STORE';
        audio.ready();
        track('restore_noiap', {});
        setTimeout(() => { rb.textContent = 'RESTORE PURCHASES'; }, 2600);
        return;
      }
      askGrownUp(() => {
        rb.textContent = 'RESTORING…';
        void restorePurchases().then((res) => {
          rb.textContent = res === 'restored' ? 'RESTORED ✓'
            : res === 'nothing' ? 'NOTHING TO RESTORE'
            : res === 'not_ready' ? 'THE STORE IS BUSY — TRY AGAIN'
            : 'COULD NOT RESTORE — TRY AGAIN';
          track('restore_result', { res });
          setTimeout(() => { rb.textContent = 'RESTORE PURCHASES'; }, 2600);
        });
      });
    });
  }

  let lastTier = -1;
  for (const s of SORTED) {
    const tier = tierOf(s);
    if (tier !== lastTier) {
      lastTier = tier;
      const hd = document.createElement('div');
      hd.innerHTML = TIER_HEAD[tier];
      grid.appendChild(hd.firstElementChild!);
    }
    const card = document.createElement('div');
    // the ribbon marks the ONE tier that is different in kind. It used to key
    // on s.tex, which is now on every coin skin, so a 150-coin card wore an
    // EPIC banner.
    card.className = 'skCard' + (s.cash ? ' legend' : '');
    const ribbon = s.cash ? '<div class="rib">LEGENDARY</div>' : '';
    // the face ALWAYS renders under the art: if the art CDN blinks, a paid
    // card must still show a voidling, never a bare gradient circle
    // THE CARD IS A RENDER, NOT A PAINTING. It used to be a CSS radial-gradient
    // with an SVG face on top and, for some skins, a CDN photo over that — and
    // the owner's own screenshot showed what that bought: Toxic, Magma,
    // Circuit, Candy and Honey rendering as swatches of aurora, lava, printed
    // circuit board, candy and honeycomb. No face, no character, and nothing a
    // child could match to the orb they play as. Three visual languages inside
    // one tab, next to a HATS tab where every card is the real geometry.
    //
    // The gradient stays as the canvas's backdrop, so a card is never a bare
    // hole if the render has not run yet.
    card.innerHTML = `${ribbon}<div class="orb" style="${cardGlow(s)}">`
      + `<canvas id="skcv_${s.id}"></canvas></div>`
      + `<div class="nm">${s.name}</div><div class="pr"></div>`
      + (PRICES[s.id] ? '<div class="skBar"><i></i></div>' : '');
    // ONE TAP IF YOU OWN IT. The hats tab already settled this — a card you own
    // equips on touch — while the voids tab made a child open a modal and press
    // a second button to put on a skin they had already earned. The modal is
    // for deciding, and there is nothing to decide here.
    card.addEventListener('click', () => {
      sawSkin(s.id);
      if (owned.has(s.id) && equipped !== s.id) { equipSkin(s); return; }
      openPreview(s);
    });
    cards.set(s.id, card);
    grid.appendChild(card);
    if (s.id === equipped) voidling.setSkin(s);
  }
  refresh();
}

// ══ THE HAT SHOP ═══════════════════════════════════════════════════════════
//
// A second, independent slot. The void is who you are and it is earned; the
// hat is what you are wearing and it is bought. Keeping them apart is what
// makes the catalogue multiply instead of compete — any hat on any void.
//
// THE CARDS ARE RENDERED, NOT PAINTED. The skin cards are a CSS gradient with
// a face SVG on top, and the owner's own screenshot shows what that costs: a
// skin called Circuit rendering as a plain blue ball because its texture only
// exists in game, next to a Honey card that shows its texture and loses the
// face. Three different treatments across one tier. A hat card cannot afford
// that — it IS the product — so each one is the real geometry, on a real void,
// under the real light rig, rendered once into a still. What the child sees on
// the card is what arrives on their void.
//
// One render target, borrowed from the game's own renderer during a modal
// where nothing else is drawing, so this costs no extra WebGL context and
// nothing per frame.
{
  const grid = el('hatGrid');
  const skinGrid = el('shopGrid');
  let ownedHats: Set<string>;
  try { ownedHats = new Set<string>(JSON.parse(localStorage.getItem('voidHatsOwned') || '["party"]')); }
  catch { ownedHats = new Set(['party']); }
  ownedHats.add('party');                       // the free one can never be missing
  let wornHat = localStorage.getItem('voidHat');
  if (wornHat && !HAT_BY_ID[wornHat]) wornHat = null;
  const saveHats = () => localStorage.setItem('voidHatsOwned', JSON.stringify([...ownedHats]));
  const wearHat = (id: string | null) => {
    wornHat = id;
    if (id) localStorage.setItem('voidHat', id); else localStorage.removeItem('voidHat');
    voidling.setHat(id);
    paintMirror();
  };
  voidling.setHat(wornHat);                     // whatever they had on last time

  // ── THUMBNAILS ────────────────────────────────────────────────────────────
  // Rendered lazily on first open and cached: thirteen 256px renders is a few
  // hundred milliseconds of work that should not happen at boot for a child
  // who never visits the shop.
  // ── THE VOID CARDS ────────────────────────────────────────────────────────
  // Same technique as the hats above, on the other half of the shop. The skin
  // cards were a CSS radial-gradient with an SVG face on top and, for some,
  // a CDN photo over that — so five of them rendered as swatches of aurora,
  // lava, printed circuit board, candy and honeycomb. A child saved a thousand
  // coins for Honey and the card showed a photograph of honeycomb.
  //
  // ONE RIG, THIRTEEN SKINS. setSkin hides every accessory and every body part
  // before showing the right one, and everything else it touches is a uniform,
  // so a single voidling wears all of them in turn. Thirteen rigs would be
  // thirteen SphereGeometry(1, 96, 72) bodies for a screen a child may never
  // open, which is why this is lazy and cached like the hats.
  //
  // Everything here was found by qa/voidsheet.mjs, which drives the same
  // rendering path — see the commit that added it for the four separate ways
  // the first attempts came out wrong.
  let voidsDone = false;
  let voidRig: ReturnType<typeof createVoid> | null = null;
  let voidScene: THREE.Scene | null = null;
  let voidCam: THREE.PerspectiveCamera | null = null;
  // ── RENDER AT THE PIXELS THE SCREEN ACTUALLY HAS ──────────────────────────
  // This was a flat 192 with a comment claiming the card canvas was 84 CSS px.
  // It is 96 (index.html, `.skCard .orb`), and the phone this ships to is a 3x
  // display — so the card was rendering 192 device pixels into a 288-pixel hole
  // and letting the browser stretch it 1.5x. Measured at deviceScaleFactor 3:
  // 0.67x of native on the cards, 0.65x on the preview. Every render in the
  // shop was being upscaled before a child ever saw it.
  //
  // Capped at 3: beyond that the readback and the fill cost grow faster than
  // anyone can see the difference.
  const DPR = Math.min(3, Math.max(1, window.devicePixelRatio || 1));
  const ORB_CSS = 96;                   // .skCard .orb — keep in step with the CSS
  const VS = Math.round(ORB_CSS * DPR);

  /** How open the lid is, 0..1. sclera.scale.y is the lid value times the
   *  mood's width and scale.x is that width alone (void3d.ts). Blink is a
   *  free-running clock, so without this a card can ship a void with its eyes
   *  shut — Candy did exactly that on the probe's first full run. */
  const lidOpen = (g: THREE.Object3D): number => {
    const sc2 = g.getObjectByName('sclera');
    return sc2 && sc2.scale.x > 0 ? sc2.scale.y / sc2.scale.x : 1;
  };

  function voidStudio(): { sc: THREE.Scene; cam: THREE.PerspectiveCamera; rig: ReturnType<typeof createVoid> } {
    if (voidRig && voidScene && voidCam) return { sc: voidScene, cam: voidCam, rig: voidRig };
    const sc = new THREE.Scene();
    sc.environment = scene.environment;
    sc.environmentIntensity = 0.4;
    const k = new THREE.DirectionalLight(0xfff2d8, 2.4); k.position.set(-3, 5, 4); sc.add(k);
    const r = new THREE.DirectionalLight(0x9fc8ff, 1.0); r.position.set(4, 2, -4); sc.add(r);
    sc.add(new THREE.HemisphereLight(0xdfeaff, 0x4a4468, 0.5));
    const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    // createVoid billboards the face with camera.quaternion and yaws the
    // costume to face the camera, so it has to be built against THIS camera —
    // handing it the game's own points every face off-screen.
    const rig = createVoid(sc, cam);
    rig.setRadius(1);
    rig.setMood('cruise');
    // A PORTRAIT HAS NO FLOOR, and the ground furniture is DETACHED rather
    // than hidden: update() rewrites these every frame, so visible=false
    // survives exactly one frame. The contact shadow is parented to the scene
    // and the evolution ring is a torus tilted 0.5 — they are named in void3d
    // because guessing at their shape missed one every time. (The third,
    // 'lip', was the hero's ground annulus and no longer exists.)
    for (const n of ['contact', 'rings']) {
      (rig.group.getObjectByName(n) ?? sc.getObjectByName(n))?.removeFromParent();
    }
    voidScene = sc; voidCam = cam; voidRig = rig;
    return { sc, cam, rig };
  }

  // ── ONE FRAMING WALK ──────────────────────────────────────────────────────
  // This existed twice, copied between the card shooter and the preview
  // turntable, and that is exactly how the "Zzz" billboard went on inflating
  // the preview after the cards were fixed. It is also per-frame code in the
  // turntable, so the two Box3 allocations it used to make every frame are now
  // module-level scratch.
  const _fitBox = new THREE.Box3(), _fitBB = new THREE.Box3();
  function fitVoid(rig: ReturnType<typeof createVoid>): { span: number; mid: number } {
    _fitBox.makeEmpty();
    rig.group.updateWorldMatrix(true, true);
    rig.group.traverse((o) => {
      const g2 = (o as THREE.Mesh).geometry;
      if (!g2 || !o.visible) return;
      for (let n: THREE.Object3D | null = o.parent; n; n = n.parent) if (!n.visible) return;
      // …AND SKIP WHAT DRAWS NOTHING. `visible` was not a strict enough test.
      // The rig carries a 1.15-unit "Zzz" billboard for the sleep mood, parked
      // at (0.62, 1.05, 1.0) on the face group at opacity 0 — permanently
      // visible, permanently invisible. It reached y=2.77 on EVERY skin,
      // including a plain orb that tops out near 1.12, and pushed the fit span
      // from 2.6 to 3.50. That is a 35% zoom-out on every card and on the
      // preview, which is most of why the shop read as small characters
      // floating in coloured haze: the void was rendering into 58% of its own
      // frame and the rest was gradient.
      const mm = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
      const mats = Array.isArray(mm) ? mm : mm ? [mm] : [];
      if (mats.length && mats.every((m) => m.transparent && m.opacity <= 0.02)) return;
      g2.computeBoundingBox();
      if (!g2.boundingBox) return;
      _fitBox.union(_fitBB.copy(g2.boundingBox).applyMatrix4(o.matrixWorld));
    });
    const top = Math.max(_fitBox.max.y, 1.2);
    const lo = Math.min(_fitBox.min.y, -0.2);
    const wide = Math.max(_fitBox.max.x, -_fitBox.min.x, _fitBox.max.z, -_fitBox.min.z, 1.0);
    // 1.18, and it is the horn that set it. The margin was 1.10 until Uni-Void
    // stopped being a stack of cones and became a real spiral that reaches
    // y=2.14 — the camera is lifted to look slightly DOWN at the subject, so
    // the tilt pushes the top of a tall accessory further up the frame than a
    // straight vertical fit predicts, and the tip clipped.
    return { span: Math.max(top - lo, wide * 2) * 1.18, mid: (top + lo) / 2 };
  }

  // ── …THEN FRAME ON THE PIXELS, NOT THE BOX ────────────────────────────────
  // A bounding box is a poor stand-in for what a round thing actually covers:
  // fit a sphere by its box and you leave the corners empty, which is most of
  // the shop. So every skin is shot once, its drawn extent measured from the
  // alpha it produced, and the span corrected so all eighteen fill their frame
  // to the same degree — a plain orb and a horned unicorn included. The factor
  // is kept per skin and handed to the preview, which cannot afford a second
  // render per frame to work it out again.
  const FILL = 0.86;                    // of the frame; the rest is breathing room
  const fitFix = new Map<string, Frame>();

  /** The drawn extent of an RGBA buffer, as a fraction of its width, plus the
   *  centre of that extent. Rows arrive bottom-up from readRenderTargetPixels;
   *  `cy` is returned already flipped to top-down image space. */
  function alphaExtent(buf: Uint8Array, size: number) {
    let minX = size, maxX = -1, minY = size, maxY = -1;
    for (let y = 0; y < size; y++) {
      const row = y * size * 4;
      for (let x = 0; x < size; x++) {
        if (buf[row + x * 4 + 3] > 24) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX < 0) return null;
    return {
      fill: Math.max(maxX - minX + 1, maxY - minY + 1) / size,
      cx: (minX + maxX + 2) / 2 / size,
      cy: 1 - (minY + maxY + 2) / 2 / size,        // bottom-up -> top-down
      touches: minX <= 0 || minY <= 0 || maxX >= size - 1 || maxY >= size - 1,
    };
  }

  /** span multiplier, look-at height, and lateral offset — the whole framing
   *  correction for one subject, cached so it is solved once. */
  type Frame = { k: number; mid: number; off: number };

  // ── SHOOT, LOOK, CORRECT ──────────────────────────────────────────────────
  // Two passes of measure-and-adjust, then a safety pass that only ever backs
  // OFF. The lateral term is what the first version was missing: it recentred
  // vertically only, and the five skins with an asymmetric aura or a wing —
  // Prism, Uni-Void, Rexling, King Void, Drako — sat at 56-58% across their
  // own frame and three of them ran off the right edge once the fill target
  // was raised. Their silhouette is not centred on their origin, so nothing
  // short of measuring the drawn pixels can know where they actually are.
  function autoFrame(
    shoot: (span: number, mid: number, off: number) => void,
    buf: Uint8Array, size: number, fit: { span: number; mid: number },
    cached?: Frame,
  ): Frame {
    if (cached) { shoot(fit.span * cached.k, cached.mid, cached.off); return cached; }
    let span = fit.span, mid = fit.mid, off = 0;
    shoot(span, mid, off);
    for (let pass = 0; pass < 2; pass++) {
      const ex = alphaExtent(buf, size);
      if (!ex || ex.fill < 0.05) break;
      span *= ex.fill / FILL;                  // too small -> pull the camera in
      mid += (0.5 - ex.cy) * span;             // …and put it in the middle
      off += (ex.cx - 0.5) * span;             // both ways
      shoot(span, mid, off);
    }
    // never ship a clipped card: if anything still touches an edge, widen until
    // it does not. This can only lose fill, never gain it, so it cannot loop.
    for (let guard = 0; guard < 4; guard++) {
      const ex = alphaExtent(buf, size);
      if (!ex || !ex.touches) break;
      span *= 1.06;
      shoot(span, mid, off);
    }
    return { k: span / fit.span, mid, off };
  }

  /** Photograph one skin onto its card. Also returns whether the skin's body
   *  texture was live at the moment of the shot — see repaintOnTexture. */
  function shootVoid(s: Skin, cvId: string, size: number, az = 0.30): boolean {
    const cv = document.getElementById(cvId) as HTMLCanvasElement | null;
    if (!cv) return true;
    const { sc, cam, rig } = voidStudio();
    rig.setSkin(s);
    const st = { t: 6.2, x: 0, z: 0, vx: 0, vz: 0, lookX: 0, lookY: 0.06 };
    for (let i = 0; i < 40; i++) { st.t = 6.2 + i / 60; rig.update(1 / 60, st); }
    // …then wait for the lid. A blink is 0.16s and blinkT resets to at least
    // 3.4s afterwards, so this always terminates well inside the bound.
    for (let i = 0; i < 90 && lidOpen(rig.group) < 0.98; i++) { st.t = 7 + i / 60; rig.update(1 / 60, st); }
    // ── FRAME TO FIT, PER SKIN ──────────────────────────────────────────
    // A fixed camera has to leave headroom for the tallest thing in the shop —
    // Uni-Void's horn reaches 2.3 — and then every plain orb renders small and
    // centred inside its own card, floating in the middle of the gradient like
    // a coin in a saucer. That is exactly how the first pass looked.
    const fit = fitVoid(rig);
    const rt = new THREE.WebGLRenderTarget(size, size);
    rt.texture.colorSpace = THREE.SRGBColorSpace;
    const buf = new Uint8Array(size * size * 4);
    // the lateral offset moves the camera ALONG ITS OWN RIGHT VECTOR, so the
    // view direction is unchanged and only the framing slides
    const rx = Math.cos(az), rz = -Math.sin(az);
    const shoot = (span: number, mid: number, off: number) => {
      const dist = span / (2 * Math.tan((30 * Math.PI) / 360));
      cam.position.set(Math.sin(az) * dist + rx * off, mid + dist * 0.10, Math.cos(az) * dist + rz * off);
      cam.lookAt(rx * off, mid, rz * off);
      // dt 0: the billboard still needs a call to read the camera, but the
      // correction below re-shoots the SAME pose. At 1/60 each pass advanced
      // the springs, so the measurement chased a subject that was still
      // bobbing — the mirror settled 12 points short of its target that way.
      rig.update(0, st);
      renderer.setRenderTarget(rt);
      renderer.setClearColor(0x000000, 0);    // transparent: the card's gradient shows through
      renderer.clear();
      renderer.render(sc, cam);
      renderer.readRenderTargetPixels(rt, 0, 0, size, size, buf);
      renderer.setRenderTarget(null);
    };
    // A bounding box over-reserves for anything round — a sphere leaves its
    // box's corners empty — so fitting the box left a plain orb small while a
    // horn filled the frame. Measuring the alpha fits every skin the same.
    const solved = autoFrame(shoot, buf, size, fit, fitFix.get(s.id));
    fitFix.set(s.id, solved);
    cv.width = size; cv.height = size;
    const ctx = cv.getContext('2d');
    if (ctx) {
      const img = ctx.createImageData(size, size);
      for (let y = 0; y < size; y++) img.data.set(buf.subarray((size - 1 - y) * size * 4, (size - y) * size * 4), y * size * 4);
      ctx.putImageData(img, 0, 0);
    }
    rt.dispose();
    let live = true;
    rig.group.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.ShaderMaterial | undefined;
      if (m?.uniforms?.uTexAmt) live = (m.uniforms.uTexAmt.value as number) >= 1;
    });
    return !s.tex || live;
  }

  // ── AND SHOOT IT AGAIN WHEN THE TEXTURE LANDS ─────────────────────────────
  // uTexAmt only flips to 1 inside the TextureLoader's own callback, and by the
  // time a texture arrives this loop has moved on to another skin — so the flag
  // is never set for it. A card rendered before its texture lands advertises
  // the wrong orb FOR EVER, because the thumbnail is painted once and cached.
  // That is not a hypothetical: it is what a real phone on a slow network does,
  // and it is what this sandbox does on every run because the asset CDN is
  // blocked. So any skin photographed without its texture gets re-shot when the
  // browser has the bytes.
  function repaintOnTexture(s: Skin, cvId: string, size: number): void {
    if (!s.tex) return;
    const img = new Image();
    img.onload = () => { shootVoid(s, cvId, size); };
    img.src = s.tex;
  }

  // ── PAINTED ACROSS FRAMES, NOT IN ONE ────────────────────────────────────
  // Eighteen cards at 118 ms each under the software renderer is 2.1 seconds
  // in a single synchronous block; on a real GPU it is far less, but it is
  // still a freeze between tapping SHOP and the shop existing, and it grows
  // every time a skin is added. Spread over animation frames the shop opens
  // instantly and fills in top-down, which is also the order a child reads it.
  //
  // The budget is per-frame, not per-card: on hardware that can manage several
  // in 8 ms it does several, and on hardware that cannot it still does one, so
  // this never stalls and never dawdles.
  function paintVoids(): void {
    if (voidsDone) return;
    voidsDone = true;
    const queue = [...SKINS];
    const step = () => {
      const t0 = performance.now();
      do {
        const s = queue.shift();
        if (!s) break;
        const id = `skcv_${s.id}`;
        if (!shootVoid(s, id, VS)) repaintOnTexture(s, id, VS);
      } while (queue.length && performance.now() - t0 < 8);
      if (queue.length) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  // ── MEET THE VOID ─────────────────────────────────────────────────────────
  // The cards are stills, and stills are right for a grid of thirteen. The
  // PREVIEW is the one place a child has asked to look at a single character,
  // and it was a CSS gradient with an SVG face pasted on — the same picture as
  // the card, only bigger. So it is alive: the real rig, breathing and
  // blinking on its own clock, turning slowly so the accessories read from
  // every side, which is the whole reason the legendary tier costs money.
  //
  // It borrows the game's renderer inside a modal where the menu behind it is
  // the only other thing drawing, and it stops dead when the modal closes —
  // there is no second WebGL context and no cost at all when it is shut.
  let prevRaf = 0, prevAz = 0, prevLast = 0;
  // The hero shot of the whole shop, and it was the softest thing in it: a flat
  // 384 buffer stretched across 587 device pixels on a 3x phone. Measured off
  // the element itself rather than re-deriving `min(190px, 42vh)` in code —
  // a second copy of a CSS rule is a second thing to get out of step, and the
  // first guess at it was already 3% wrong.
  let PREV_S = 0;
  let prevRT: THREE.WebGLRenderTarget | null = null;

  function stopPreviewSpin(): void {
    if (prevRaf) cancelAnimationFrame(prevRaf);
    prevRaf = 0;
  }

  function startPreviewSpin(s: Skin): void {
    stopPreviewSpin();
    const host = document.getElementById('spOrb');
    if (!host) return;
    let cv = host.querySelector('canvas') as HTMLCanvasElement | null;
    if (!cv) { cv = document.createElement('canvas'); host.appendChild(cv); }
    // sized once, from the element, at the screen's own density
    if (!PREV_S) PREV_S = Math.round((host.getBoundingClientRect().width || 190) * DPR);
    cv.width = PREV_S; cv.height = PREV_S;
    const ctx = cv.getContext('2d');
    const { sc, cam, rig } = voidStudio();
    rig.setSkin(s);
    prevAz = 0.30; prevLast = 0;
    if (!prevRT) {
      prevRT = new THREE.WebGLRenderTarget(PREV_S, PREV_S);
      prevRT.texture.colorSpace = THREE.SRGBColorSpace;
    }
    const buf = new Uint8Array(PREV_S * PREV_S * 4);
    const st = { t: 0, x: 0, z: 0, vx: 0, vz: 0, lookX: 0, lookY: 0.06 };
    const frame = (now: number) => {
      prevRaf = requestAnimationFrame(frame);
      // clamp dt: a backgrounded tab hands back a two-second step, which would
      // fling the turntable round and fire a whole blink between two frames
      const dt = prevLast ? Math.min(0.05, (now - prevLast) / 1000) : 1 / 60;
      prevLast = now;
      st.t += dt;
      prevAz += dt * 0.42;                       // a slow turntable, not a spin
      // RE-ASSERT THE SKIN EVERY FRAME. The card painter now runs across
      // frames too and shares this one rig, so a child who taps a card while
      // the grid is still filling in would otherwise watch the turntable
      // change colour under them. setSkin is uniforms and visibility flags —
      // cheap enough to simply do again.
      rig.setSkin(s);
      rig.update(dt, st);
      // the SAME framing walk the cards use, and the same per-skin correction
      // measured from their alpha — a turntable cannot afford to re-measure
      // every frame, and the hero shot should be framed like its own card.
      // the SAME correction the card solved, offset included: the lateral term
      // is measured along the camera's own right vector, so it stays lateral as
      // the turntable comes round. Without it Uni-Void sat at 54% across its
      // own frame — its sparkles hang off one side, so centring the origin does
      // not centre the character.
      const fix = fitFix.get(s.id);
      const fit = fitVoid(rig);
      const span = fit.span * (fix?.k ?? 1);
      const mid = fix?.mid ?? fit.mid, off = fix?.off ?? 0;
      const dist = span / (2 * Math.tan((30 * Math.PI) / 360));
      const rx = Math.cos(prevAz), rz = -Math.sin(prevAz);
      cam.position.set(Math.sin(prevAz) * dist + rx * off, mid + dist * 0.10, Math.cos(prevAz) * dist + rz * off);
      cam.lookAt(rx * off, mid, rz * off);
      rig.update(0, st);                          // face billboard reads the camera
      renderer.setRenderTarget(prevRT);
      renderer.setClearColor(0x000000, 0);
      renderer.clear();
      renderer.render(sc, cam);
      renderer.readRenderTargetPixels(prevRT!, 0, 0, PREV_S, PREV_S, buf);
      renderer.setRenderTarget(null);
      if (ctx) {
        const img = ctx.createImageData(PREV_S, PREV_S);
        for (let y = 0; y < PREV_S; y++) {
          img.data.set(buf.subarray((PREV_S - 1 - y) * PREV_S * 4, (PREV_S - y) * PREV_S * 4), y * PREV_S * 4);
        }
        ctx.putImageData(img, 0, 0);
      }
    };
    prevRaf = requestAnimationFrame(frame);
  }

  _dbg.__previewVoid = startPreviewSpin;
  _dbg.__previewStop = stopPreviewSpin;

  // ── THE MIRROR ────────────────────────────────────────────────────────────
  // You, in what you are wearing, at the top of both tabs. The whole reason
  // the shop has two slots is that any hat goes on any void — thirteen voids
  // and thirteen hats is a hundred and sixty-nine combinations — and the
  // combination was displayed nowhere at all. Equipping something changed a
  // label and nothing else.
  // the mirror is 96 CSS px in the shop header; at 3x that is 288
  const MIRROR_S = Math.round(96 * DPR);
  let mirrorWarm = false;
  const mirrorFix = new Map<string, Frame>();
  let mirrorRT: THREE.WebGLRenderTarget | null = null;
  function paintMirror(): void {
    const cv = document.getElementById('mirrorCv') as HTMLCanvasElement | null;
    const cap = document.getElementById('mirrorCap');
    if (!cv) return;
    const skinId = localStorage.getItem('voidSkin') || 'classic';
    const sk = SKINS.find((x) => x.id === skinId) ?? SKINS[0];
    const { sc, cam, rig } = voidStudio();
    rig.setSkin(sk);
    rig.setHat(wornHat);
    // A WARM RIG DOES NOT NEED A COLD SETTLE. The mirror repaints on every
    // equip, and a full forty-frame settle made that a 417 ms hitch (software
    // renderer) for a rig whose springs are already at rest from the last
    // paint. Only the skin and hat changed, and those are uniforms and
    // visibility flags. The lid loop still runs — blink is a free clock and a
    // mirror of yourself with its eyes shut is worse than a card of one.
    const st = { t: 6.2, x: 0, z: 0, vx: 0, vz: 0, lookX: 0, lookY: 0.06 };
    const warm = mirrorWarm ? 8 : 40;
    mirrorWarm = true;
    for (let i = 0; i < warm; i++) { st.t = 6.2 + i / 60; rig.update(1 / 60, st); }
    for (let i = 0; i < 90 && lidOpen(rig.group) < 0.98; i++) { st.t = 7 + i / 60; rig.update(1 / 60, st); }
    const fit = fitVoid(rig);
    if (!mirrorRT) {
      mirrorRT = new THREE.WebGLRenderTarget(MIRROR_S, MIRROR_S);
      mirrorRT.texture.colorSpace = THREE.SRGBColorSpace;
    }
    const buf = new Uint8Array(MIRROR_S * MIRROR_S * 4);
    const rx = Math.cos(0.34), rz = -Math.sin(0.34);
    const shoot = (span: number, mid: number, off: number) => {
      const dist = span / (2 * Math.tan((30 * Math.PI) / 360));
      cam.position.set(Math.sin(0.34) * dist + rx * off, mid + dist * 0.10, Math.cos(0.34) * dist + rz * off);
      cam.lookAt(rx * off, mid, rz * off);
      rig.update(0, st);            // frozen pose — see the note in shootVoid
      renderer.setRenderTarget(mirrorRT!);
      renderer.setClearColor(0x000000, 0);
      renderer.clear();
      renderer.render(sc, cam);
      renderer.readRenderTargetPixels(mirrorRT!, 0, 0, MIRROR_S, MIRROR_S, buf);
      renderer.setRenderTarget(null);
    };
    // the mirror is the one render that changes with BOTH slots, so it is keyed
    // on the pair — a hat changes the silhouette as much as a skin does
    const key = `${skinId}/${wornHat ?? '-'}`;
    mirrorFix.set(key, autoFrame(shoot, buf, MIRROR_S, fit, mirrorFix.get(key)));
    cv.width = MIRROR_S; cv.height = MIRROR_S;
    const ctx = cv.getContext('2d');
    if (ctx) {
      const img = ctx.createImageData(MIRROR_S, MIRROR_S);
      for (let y = 0; y < MIRROR_S; y++) {
        img.data.set(buf.subarray((MIRROR_S - 1 - y) * MIRROR_S * 4, (MIRROR_S - y) * MIRROR_S * 4), y * MIRROR_S * 4);
      }
      ctx.putImageData(img, 0, 0);
    }
    if (cap) {
      const hat = wornHat ? HAT_BY_ID[wornHat] : null;
      cap.innerHTML = `${sk.name}${hat ? ` in the ${hat.name}` : ''}<em>${hat ? 'ANY HAT GOES ON ANY VOID' : 'PICK A HAT TO GO WITH IT'}</em>`;
    }
    // the mirror shares the rig with the cards, so hand it back the way the
    // card renderer expects to find it
    rig.setHat(null);
  }
  _dbg.__shopMirror = paintMirror;
  // ── HAT CARDS, ON A VOID WITH A FACE ──────────────────────────────────────
  // These used to render onto a bare SphereGeometry with makeVoidBody() on it:
  // a featureless purple ball. That was the right call when it shipped, because
  // it was the only rig available — but the voids tab now builds a full one,
  // and a $6.99 product was the last thing in the shop still being sold on a
  // headless body. Same rig, wearing the void the child actually plays as.
  //
  // Keyed on the equipped skin, so equipping a void repaints the hat grid: the
  // cards are a picture of YOUR void in each hat, not of a stranger's.
  let thumbsFor: string | null = null;
  const hatFix = new Map<string, Frame>();
  function paintThumbs(): void {
    const skinId = localStorage.getItem('voidSkin') || 'classic';
    if (thumbsFor === skinId) return;
    thumbsFor = skinId;
    const sk = SKINS.find((x) => x.id === skinId) ?? SKINS[0];
    // measured off a real card so the hats tab gets the same native-resolution
    // treatment as the voids tab, rather than a constant that goes stale the
    // next time the grid changes columns
    const cw = (document.querySelector('#hatGrid .hatCard canvas') as HTMLElement | null)
      ?.getBoundingClientRect().width || 110;
    const S = Math.min(512, Math.round(cw * DPR));
    const { sc, cam, rig } = voidStudio();
    rig.setSkin(sk);
    const rt = new THREE.WebGLRenderTarget(S, S);
    rt.texture.colorSpace = THREE.SRGBColorSpace;
    const buf = new Uint8Array(S * S * 4);
    const st = { t: 6.2, x: 0, z: 0, vx: 0, vz: 0, lookX: 0, lookY: 0.06 };
    for (const h of HATS) {
      const cv = document.getElementById(`hatcv_${h.id}`) as HTMLCanvasElement | null;
      if (!cv) continue;
      rig.setHat(h.id);
      for (let i = 0; i < 40; i++) { st.t = 6.2 + i / 60; rig.update(1 / 60, st); }
      for (let i = 0; i < 90 && lidOpen(rig.group) < 0.98; i++) { st.t = 7 + i / 60; rig.update(1 / 60, st); }
      // Frame the whole thing, hat included — a cropped pompom is exactly the
      // detail these previews exist to sell — and frame on the WIDTH too,
      // because hats vary more across than up: the Ten-Gallon is 3.7 wide
      // against a 3.66-tall frame and its brim ran off both edges of the card.
      //
      // Walking VISIBLE meshes, not Box3.setFromObject: the rig keeps all seven
      // accessories and four body parts in the graph and shows one, so the box
      // would be inflated by whatever is switched off.
      const fit = fitVoid(rig);
      const rx = Math.cos(0.42), rz = -Math.sin(0.42);
      const shoot = (span: number, mid: number, off: number) => {
        const dist = span / (2 * Math.tan((30 * Math.PI) / 360));
        cam.position.set(Math.sin(0.42) * dist + rx * off, mid + dist * 0.10, Math.cos(0.42) * dist + rz * off);
        cam.lookAt(rx * off, mid, rz * off);
        rig.update(0, st);          // frozen pose — see the note in shootVoid
        renderer.setRenderTarget(rt);
        renderer.setClearColor(0x000000, 0);
        renderer.clear();
        renderer.render(sc, cam);
        renderer.readRenderTargetPixels(rt, 0, 0, S, S, buf);
        renderer.setRenderTarget(null);
      };
      // …corrected on the alpha, exactly as the void cards are. It matters more
      // here because hats differ so much in shape: measured on the box fit
      // alone, the Ten-Gallon filled 58% of its card and the Crown 86%, so a
      // row of hats read as a row of different sizes.
      hatFix.set(h.id, autoFrame(shoot, buf, S, fit, hatFix.get(h.id)));
      cv.width = S; cv.height = S;
      const ctx = cv.getContext('2d');
      if (ctx) {
        const img = ctx.createImageData(S, S);
        // readRenderTargetPixels hands back bottom-up
        for (let y = 0; y < S; y++) img.data.set(buf.subarray((S - 1 - y) * S * 4, (S - y) * S * 4), y * S * 4);
        ctx.putImageData(img, 0, 0);
      }
    }
    // hand the rig back the way the card renderer expects to find it
    rig.setHat(null);
    rt.dispose();
  }

  const hatCards = new Map<string, HTMLElement>();
  const priceText = (h: Hat): string => {
    if (wornHat === h.id) return 'WEARING';
    if (ownedHats.has(h.id)) return 'WEAR IT';
    if (h.tier === 'free') return 'FREE';
    // …and say so on the card too, the way the skin cards do
    const p2 = iapPrice(h.id) ?? `$${(h.usd ?? 0).toFixed(2)}`;
    return iapAvailable() ? `💎 ${p2}` : `💎 ${p2} · ON THE APP STORE`;
  };
  const refreshHats = () => {
    const th = document.getElementById('tabHats');
    if (th) th.textContent = `${HATS.filter((h) => ownedHats.has(h.id)).length} of ${HATS.length} collected`;
    for (const h of HATS) {
      const card = hatCards.get(h.id);
      if (!card) continue;
      card.classList.toggle('owned', ownedHats.has(h.id));
      card.classList.toggle('worn', wornHat === h.id);
      const pr = card.querySelector('.hp') as HTMLElement;
      pr.className = 'hp' + (h.tier === 'free' && !ownedHats.has(h.id) ? ' free' : '');
      pr.textContent = priceText(h);
    }
  };

  const SECTIONS: Array<[string, string, (h: Hat) => boolean]> = [
    ['🎉 START HERE', 'yours already', (h) => h.tier === 'free'],
    ['🎩 THE COLLECTION', 'one tap, any void', (h) => h.tier === 'plus'],
    ['✨ LEGENDARY', 'these ones talk back', (h) => h.tier === 'legendary'],
  ];
  for (const [title, sub, pick] of SECTIONS) {
    const head = document.createElement('div');
    head.className = 'hatSect';
    head.innerHTML = `<b>${title}</b> ${sub} <span></span>`;
    grid.appendChild(head);
    for (const h of HATS.filter(pick)) {
      const card = document.createElement('div');
      card.className = 'hatCard' + (h.tier === 'legendary' ? ' leg' : '');
      card.innerHTML = `<canvas id="hatcv_${h.id}"></canvas>`
        + `<div class="hn">${h.name}</div><div class="hb">${h.blurb}</div><div class="hp"></div>`;
      card.addEventListener('click', () => onHatTap(h));
      hatCards.set(h.id, card);
      grid.appendChild(card);
    }
  }

  function onHatTap(h: Hat): void {
    // OWNED: tapping is wearing, and tapping the worn one takes it off. No
    // confirm step — a cosmetic that costs nothing to change should cost
    // nothing to try, and the void behind the shop updates live so the tap IS
    // the preview.
    if (ownedHats.has(h.id)) {
      wearHat(wornHat === h.id ? null : h.id);
      audio.evolve(); refreshHats();
      track('hat_wear', { hat: h.id, on: wornHat === h.id });
      return;
    }
    if (h.tier === 'free') { ownedHats.add(h.id); saveHats(); wearHat(h.id); audio.evolve(); refreshHats(); return; }
    const pr = hatCards.get(h.id)?.querySelector('.hp') as HTMLElement | undefined;
    const usd = h.usd ?? 0;
    // ── CHECK THE PLATFORM BEFORE THE GATE, NOT AFTER IT ──────────────────
    // The skin path has done this since it shipped and this one never did: it
    // went straight to askGrownUp, so on the open web a parent was handed a
    // two-digit multiplication to solve and the reward for solving it was being
    // told the thing is not for sale. An advertised price with no way to pay it
    // is the advertising-accuracy problem in its most literal form.
    if (!iapAvailable()) {
      if (pr) pr.textContent = '👀 COMING TO THE APP STORE!';
      audio.ready();
      setTimeout(refreshHats, 2000);
      track('hat_tap_noiap', { hat: h.id, usd });
      return;
    }
    // the same parental gate the skins use — App Review expects it and a
    // six-year-old should not be able to reach a payment sheet unaided
    askGrownUp(() => {
      if (pr) pr.textContent = '…';
      void iapPurchase(h.id, usd).then((res) => {
        if (res === 'started') { if (pr) pr.textContent = 'CONFIRM IN THE APP STORE…'; return; }
        if (res === 'granted') { ownedHats.add(h.id); saveHats(); wearHat(h.id); audio.evolve(); refreshHats(); return; }
        if (pr) {
          pr.textContent = res === 'unavailable' ? 'COMING TO THE APP STORE'
            : res === 'not_ready' ? 'THE STORE IS BUSY' : 'COULD NOT BUY';
        }
        audio.hit();
        setTimeout(refreshHats, 2000);
      });
    });
  }


  // The shop OPENS on the voids tab, so the tab-switch handler below is not
  // enough on its own — without this the first thing a child sees is thirteen
  // empty gradients until they touch something.
  _dbg.__paintVoids = paintVoids;

  // ── TABS ──────────────────────────────────────────────────────────────────
  // …and remember which one you were on. A child who is saving for a hat and
  // opens the shop to check on it should not have to cross the room first.
  const showTab = (tab: string) => {
    document.querySelectorAll('.shopTab').forEach((o) => o.classList.toggle('on', (o as HTMLElement).dataset.tab === tab));
    const hats = tab === 'hats';
    skinGrid.style.display = hats ? 'none' : '';
    grid.style.display = hats ? '' : 'none';
    if (hats) paintThumbs(); else paintVoids();
    paintMirror();
    localStorage.setItem('voidShopTab', tab);
  };
  _dbg.__shopTab = () => showTab(localStorage.getItem('voidShopTab') === 'hats' ? 'hats' : 'voids');
  document.querySelectorAll('.shopTab').forEach((t) => t.addEventListener('click', () => {
    const tab = (t as HTMLElement).dataset.tab;
    document.querySelectorAll('.shopTab').forEach((o) => o.classList.toggle('on', o === t));
    const hats = tab === 'hats';
    localStorage.setItem('voidShopTab', tab ?? 'voids');
    skinGrid.style.display = hats ? 'none' : '';
    grid.style.display = hats ? '' : 'none';
    if (hats) paintThumbs(); else paintVoids();
    paintMirror();
    track('shop_tab', { tab });
  }));

  /** StoreKit restored a purchase, or granted one: it may be a hat. */
  _dbg.__grantHats = (ids: string[]) => {
    let any = false;
    for (const id of ids) if (HAT_BY_ID[id] && !ownedHats.has(id)) { ownedHats.add(id); any = true; }
    if (any) { saveHats(); refreshHats(); }
  };
  refreshHats();
}

// ── HIT-STOP ───────────────────────────────────────────────────────────────
// The verb of this game is EATING and it happens about fifty times a match, and
// until now a WORLD ENDER swallowing a hotel and a hatchling swallowing a
// postbox were, frame for frame, the same event: the same three-particle puff,
// the same fixed mouth animation, the same drain speed. There was no
// discontinuity anywhere in the one thing the product is about.
//
// A big bite now stops the world for 55-105ms. Everything that is part of the
// SIMULATION freezes — the hero, the drain spiral, the crowd, the family, the
// particles — while everything that would read as a hitch if it froze keeps
// running on real dt: tClock and its cooldowns, the camera lerp, the HUD, and
// the audio, which is already scheduled ahead on its own clock.
//
// The world time-scale to do it with was already in this file and driving
// exactly one line. `dtw` existed for the outro's slow-motion push-in and
// nothing else ever read it.
let stopT = 0;         // seconds of freeze left
let stopCd = 0;        // …and the gate that stops a hoover spree stuttering
function hitStop(sec: number) {
  if (stopCd > 0) return;
  stopT = Math.max(stopT, sec);
  stopCd = 0.35;
}
function animate() {
  tickFrame();
  const dt = Math.min(0.05, clock.getDelta());
  let dtw = dt;
  if (outroT > 0) { outroT -= dt; if (outroT <= 0) endMatch(); else dtw = dt * 0.3; }
  stopCd = Math.max(0, stopCd - dt);
  if (stopT > 0) { stopT = Math.max(0, stopT - dt); dtw *= 0.06; }
  tClock += dt;
  if (_revalQueue.length && tClock >= _revalQueue[0]) { _revalQueue.shift(); validateWorld(); bakeContactShadows(); }
  island.update(dt, tClock);
  // the curios turn and catch the light — the glint is what the eye finds
  for (const c of curios) if (c.mesh.visible) animateCurio(c.mesh, tClock, c.seed);

  if (started && !ended && !paused) {
    matchClock -= dtw * clockSpeed;
    if (guideT > 0) { guideT -= dt; if (guideT <= 0) guideEl().classList.remove('show'); }
    // PRESENCE: a big void is an EVENT — ambient suction sparkles from stage 2,
    // a low rolling rumble while moving fast from stage 3
    presenceT -= dt;
    if (curStage >= 2 && presenceT <= 0) {
      presenceT = 0.55 - curStage * 0.08;
      spawnSuck(1 + curStage, voidling.radius * 1.9);
    }
    timerEl.textContent = fmtTime(matchClock);
    // ── AUTHORED MATCH BEATS ────────────────────────────────────────────────
    // A 3-minute match needs a RHYTHM, not just ambience. Three scheduled
    // events with real scoring stakes give every run the same shape, so a kid
    // learns to anticipate them ("the donut rush is coming!") — which is what
    // turns one play into ten.
    {
      const el3 = matchLen - matchClock;
      for (const bt of BEATS) {
        if (!bt.fired && el3 >= bt.at) {
          bt.fired = true;
          feverMult = bt.mult; feverT = bt.dur;
          announceBeat(bt.icon, bt.title, bt.sub, bt.mult);
          // …and the newsroom is NOT told. It used to be handed bt.news the
          // same frame, so two seconds after "The band is on the field!" the
          // ticker said "The marching band has taken the field." Captured on
          // Maple: five of eight headlines in a whole match were the beat text
          // the player had just read on a card. That is why the news felt
          // empty — most of it was an echo. The banner owns the beat; the
          // newsroom keeps its own thread, and it has 400+ lines that were
          // never getting a turn.
          audio.evolve(); buzz(35);
          fx.ring(voidState.x, voidState.z, bt.col, voidling.radius * 6, 0.9);
          fx.flash(bt.flash, 0.35);
      audio.matchBeat(bt.title);   // ice cream hour / dance party / treasure hunt each get their own sting
        }
      }
      if (feverT > 0) {
        feverT -= dt;
        // …and NOTHING is announced when it ends. "Rush over. Keep eating!"
        // called every one of the twelve beats a "Rush" (only one of them is
        // named that), and spending a full hero card to tell a child that a
        // good thing has stopped is the opposite of a reward. The multiplier
        // badge leaving the screen is the signal.
        if (feverT <= 0) feverMult = 1;
      }
    }
    if (introT > 0) { const dk = Math.pow(0.9, dt * 60); velX *= dk; velZ *= dk; }
    if (matchClock <= 35) {
      timerEl.style.color = '#ff8a8a';
      // The warning used to fire at 30s — the exact frame the TREASURE FEAST
      // beat fires — and announce() overwrote the beat banner in the same
      // animate() call. The game's biggest scoring moment was silent in every
      // logged run. Moved to 35s so the two never collide.
      if (!moments.last30 && !ended) { moments.last30 = true; announce('⏰ 35 SECONDS — EAT FASTER!!'); }
    }
    if (matchClock <= 0 && !ended && outroT <= 0) {
      outroT = 2.0;   // slow-mo push-in beat before the results panel
      fx.ring(voidState.x, voidState.z, 0xffe08a, voidling.radius * 5, 1);
      fx.ring(voidState.x, voidState.z, 0xb875ff, voidling.radius * 3.4, 0.8);
      audio.evolve();
    }
    // the 2D GROWTH LAW: radius can never outrun the clock (disabled for ?r= debug)
    if (!bigStart) {
      // hole.io opening: the first 30s run HOT so the first evolution lands
      // around ~15s and a new player feels growth immediately; then it settles
      const el2 = matchLen - matchClock;
      // ── THE FINALE SURGE ────────────────────────────────────────────────
      // The old law topped out at 6.06 on a 3:00 clock — so WORLD ENDER (5.0)
      // was reached and then barely grew, and R_CAP 12 was unreachable dead
      // code. The last third is now the POWER FANTASY: the ceiling opens up
      // hard, so earning the final form actually feels like ending a world.
      const surgeT = Math.max(0, el2 - matchLen * 0.66) / Math.max(1, matchLen * 0.34);
      // ── PACE ────────────────────────────────────────────────────────────
      // The ceiling was a pure function of the clock, and it BOUND in 99% of
      // sampled frames. Two logged matches on different islands — 902 props
      // and 134,063 points against 385 props and 53,259 — came out the same
      // radius at every single checkpoint: 2.31 vs 2.32 at thirty seconds,
      // 4.56 vs 4.56 at two minutes. Every evolution fired within a second of
      // the same timestamp in both. A child who plays brilliantly and one who
      // wanders finished identically, which quietly tells them mastery does
      // not matter, and that is what kills the third session.
      //
      // The stated intent — "no ballooning off one item" — is right. So keep
      // it, but enforce it as a RATE, and let the ceiling itself move with how
      // well the run is actually going. pace 1 is par; a strong run opens the
      // ceiling by 45%, a weak one holds at 78% and the score floor below still
      // catches anyone struggling.
      // par is fitted to logged matches: ~3.2k at thirty seconds, ~9.4k at a
      // minute, ~63k at the whistle. A weak run holds the ceiling at 0.75 and
      // still reaches WORLD ENDER; a strong one opens it to 1.83 and can max
      // the final form. Nobody is locked out of the fantasy, and nobody gets
      // there without playing.
      // par is fitted to logged matches: ~3.2k at thirty seconds, ~9.4k at a
      // minute, ~63k at the whistle. The finale surge scales with pace too,
      // because that is where the spread has to live — a par run lands on the
      // old 10.3 ceiling exactly, a strong one maxes the final form, and a
      // weak one still reaches WORLD ENDER, just later. Nobody is locked out
      // of the fantasy, and nobody arrives without playing.
      const par = Math.max(1, 60 * el2 + 1.6 * el2 * el2);
      const pace = THREE.MathUtils.clamp(playerScore / par, 0, 1.2);
      // …and pace is meaningless in the opening seconds, when the score is
      // still near zero. Blend it in over 25s so the hook stays untouched.
      const warm = Math.min(1, el2 / 25);
      const paceK = (1 - warm) + warm * (0.60 + 0.40 * pace);
      // …CLAMPED TO WHAT THE CLOCK ALONE MAY BUY, PLUS THE FEAST.
      //
      // I claimed R_CAP was not what binds. It was. The pace term and the
      // finale surge can reach ~14.5 on a strong run, and R_CAP 12 had been
      // silently clamping them the whole time — so raising it to 18 did not
      // unlock hunting, it just let every good run climb higher. Measured
      // (qa/titan.mjs, corrected control): a props-only driver hit r=14.45 and
      // sailed past VOID TITAN at 13.5, while hunting the family was worth
      // MINUS 0.06 radius. The feature was decoration, which is the exact
      // failure the probe was written to catch.
      //
      // LAW_TOP restores the old ceiling for everything the clock buys, so
      // ordinary play tops out at 12 exactly as it did before any of this, and
      // feastR is the only term that can carry a run past it. That is what
      // "you would need to eat the other voids" has to mean mechanically.
      const LAW_TOP = 12;
      const lawCap = Math.min(LAW_TOP,
        START_R + (0.022 * Math.min(el2, 30) + LAW_RATE * el2) * paceK
        + surgeT * surgeT * (2.8 + 2.6 * pace)) + feastR;
      // the rate limiter is what actually stops a single landmark ballooning
      // you — it is the job the absolute clamp was doing by accident
      const maxStep = (0.11 + surgeT * 0.16) * dt;
      if (!frozenR && voidling.radius > lastR + maxStep) voidling.setRadius(lastR + maxStep);
      if (!frozenR && voidling.radius > lawCap) voidling.setRadius(lawCap);
      lastR = voidling.radius;
      // 2D score-floor: strong scoring pulls your radius up toward the cap
      // the floor rides the surge too — a strong late run is PULLED to the
      // new ceiling instead of being pinned at the old 6.06 plateau
      // …and the SURGE half of the floor has to be earned too. It had no pace
      // term, so it pulled an idle player's radius up unconditionally: a run
      // with the pointer parked at dead centre, six props eaten and 328 points
      // was awarded MUNCHER, then GOBBLER, then DEVOURER, and the results
      // screen told it "BIGGEST: DEVOURER". WORLD ENDER fired inside a
      // seven-second window across a SEVEN-FOLD spread in final score. The
      // ceiling was already pace-scaled; the floor underneath it was not, so
      // the floor decided the outcome and skill did nothing.
      const scoreFloor = Math.min(lawCap, START_R * (1 + Math.pow(playerScore / 974, 0.57)) + surgeT * surgeT * 2.6 * pace);
      if (!frozenR && voidling.radius < scoreFloor) voidling.setRadius(scoreFloor);
    }
  }

  powerCd = Math.max(0, powerCd - dt);
  joyEdgeTick();   // a thumb jammed on the bezel stops emitting events — see joyEdgeTick
  // screen-space input: joystick first, else keys
  let inX = 0, inY = 0;
  if (joy.active && joy.mag > 0.156) { inX = joy.dx; inY = joy.dy; }
  else if (keys.size) {
    if (keys.has('KeyW') || keys.has('ArrowUp')) inY -= 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) inY += 1;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) inX -= 1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) inX += 1;
    const m = Math.hypot(inX, inY) || 1; inX /= m; inY /= m;
  }
  const driving = inX !== 0 || inY !== 0;
  // TRACK THE STATE, NOT THE EVENT. lastInput only advanced inside joySet and
  // in the key branch above, both of which fire on EVENTS — so a stick held at
  // full deflection with the thumb mechanically still (pressed into a bezel, or
  // a mouse button down and the cursor stationary, which emits no pointermove
  // by spec) counted as no input at all. After eight seconds the void yawned,
  // pulled a sleepy face and played the sleepy voice line while barrelling
  // across the island at full speed.
  if (driving) lastInput = tClock;
  if (dashT > 0) {
    // ROCKET BITE dash — barrel forward, eating in the path
    dashT -= dt;
    const nx = voidState.x + dashDir.x * 130 * dt, nz = voidState.z + dashDir.z * 130 * dt;
    if (island.biomeAt(nx, nz)) { voidState.x = nx; voidState.z = nz; } else dashT = 0;
  } else {
    // target velocity from input (or attract-mode autopilot), then SMOOTH it —
    // acceleration-based motion so steering feels buttery, never boxy
    let tvx = 0, tvz = 0;
    if (driving) {
      fwdTmp.set(-camOffset.x, 0, -camOffset.z).normalize();
      rightTmp.set(-fwdTmp.z, 0, fwdTmp.x);
      // PERCEIVED speed is constant: world speed rides the camera distance, so
      // a WORLD ENDER crosses its screen exactly as fast as a hatchling does.
      // Joystick: full speed at ~58% thumb extension (hole.io feel), linear below.
      // …and the ramp opens out to match. A real deadzone (10 px, so a resting
      // thumb is genuinely at rest) and full speed at the RIM — 64 px, where
      // the ring the player can actually see already is — instead of at 36 px
      // in the middle of nowhere. The analog band goes from 32 px to 54, half
      // a ring now means half speed rather than a hair under full, and full
      // deflection is finally a thing the drawn ring tells you about.
      const jm = joy.active ? THREE.MathUtils.clamp((joy.mag - 0.156) / 0.844, 0, 1) : 1;
      // The 58 cap bound at camDist 181 — a radius ABOVE the WORLD ENDER
      // threshold — after which world speed stopped rising while the camera
      // kept pulling back. Measured: 440-470 screen px/s up to r=6, then 291
      // at r=12, i.e. the late-game void crossed its own body 2.4x slower.
      // That is the whole "end game feels like wading" complaint. 96 = 16*340/50,
      // so the cap now only binds where camDist is itself clamped.
      // During the intro dive camDist is still falling from 300, which spiked
      // the first touch to the cap and then sagged 60% — take the target.
      // targetDist is computed later in the frame, so derive the settled camera
      // distance from the radius directly rather than reading the diving one
      const cd = introT > 0
        ? Math.min(camDist, Math.min(340, Math.max(26, 38 * Math.pow(voidling.radius / 0.9, 0.82))))
        : camDist;
      const speed = Math.min(96, 16 * (cd / 50)) * jm;
      tvx = (rightTmp.x * inX - fwdTmp.x * inY) * speed;
      tvz = (rightTmp.z * inX - fwdTmp.z * inY) * speed;
    } else if ((!started || DEBUG_HARNESS) && tClock - lastInput > 4) {
      // attract mode: menu backdrop + demo harness ONLY — a real match never
      // self-drives; an idle player's void just sits there being cute
      wanderT -= dt;
      if (wanderT <= 0) {
        wanderT = rand(0.9, 1.8);
        let best: Edible | null = null, bd = Infinity;
        const Rh = voidling.radius;
        for (const e of edibles) {
          if (e.eaten || !e.mesh.visible || e.radius > Rh * EAT_RATIO) continue;
          const dx = e.mesh.position.x - voidState.x, dz = e.mesh.position.z - voidState.z;
          const d = dx * dx + dz * dz;
          if (d < bd) { bd = d; best = e; }
        }
        if (best) wander.set(best.mesh.position.x, 0, best.mesh.position.z);
        else wander.set(rand(-WANDER_R, WANDER_R), 0, rand(-WANDER_R, WANDER_R));
      }
      const ddx = wander.x - voidState.x, ddz = wander.z - voidState.z;
      const dm = Math.hypot(ddx, ddz);
      if (dm > 1.5) { const spd = 14 * Math.min(1, dm / 10); tvx = (ddx / dm) * spd; tvz = (ddz / dm) * spd; }
    }
    const wgt = THREE.MathUtils.clamp((voidling.radius - 0.9) / 5.1, 0, 1);
    const k = Math.min(1, dt * (driving ? 11 - 3.5 * wgt : 4.5));   // 91ms snappy tiny → 133ms weighty huge
    velX += (tvx - velX) * k;
    velZ += (tvz - velZ) * k;
    const nx = voidState.x + velX * dt, nz = voidState.z + velZ * dt;
    // ── INVISIBLE WALL at the coast ──────────────────────────────────────────
    // The old per-axis accept/reject (hard velX = 0) made the void SHUDDER on
    // the waterline: rejected frame kills the speed, the joystick instantly
    // re-accelerates into the same wall, position flickers across the boundary.
    // Now the wall is a real surface: the orb's RIM stops on land, only the
    // OUTWARD half of the velocity is cancelled (tangential sliding survives),
    // and a void that grows past the shore is eased back in instead of stuck.
    {
      // HOW MUCH BODY MUST BE ON LAND. A linear R*0.75 meant a WORLD ENDER
      // needed 26 units of clear corridor — and the island's narrowest
      // walkable stretches measure 16 and 25 units, so the late game was
      // physically unable to cross its own map and pinned against the sand
      // spits. A small void is still held tight to the shore (it would look
      // like it was floating otherwise); a big one is allowed to span, because
      // a giant hole bridging an isthmus is exactly what the fantasy looks
      // like. R=2 unchanged at 2.7; R=16 goes 13.2 -> 7.6.
      const R0 = voidling.radius;
      const m = Math.min(R0 * 0.75, 4 + R0 * 0.15) + 1.2;
      // biomeAt calls Maple's pond, river and lagoon dry land — they are all
      // inside the coastline. A live run drove from the spawn to 0.95 units off
      // the exact centre of the pond in 8 seconds with zero blocked frames.
      // The diagonals leaked too: 0.4% to 1.7% of accepted cells put the body
      // over water on a diagonal, which the cars have guarded against for ages.
      const d45 = m * 0.7071;
      const solid = (x: number, z: number) => !!island.biomeAt(x, z) && !inDeepWater3(x, z, m)
        && insideIsland3(x + m, z) && insideIsland3(x - m, z)
        && insideIsland3(x, z + m) && insideIsland3(x, z - m)
        && insideIsland3(x + d45, z + d45) && insideIsland3(x - d45, z - d45)
        && insideIsland3(x + d45, z - d45) && insideIsland3(x - d45, z + d45);
      // WHICH WAY IS LAND? The old version assumed "away from the island
      // centre", which is only true for a blob with water on the outside.
      // Pirate Bay has water INSIDE it: standing on the resort's inner shore,
      // "toward the centre" points straight across the bay, so the
      // recover-inland nudge was shoving the player into the water and the
      // wall normal was backwards. Search for the actual nearest land instead
      // — correct for the outer coast, the bay, and anything added later.
      // The reach has to cover the widest stretch of water on the map — the bay
      // is ~190 units across, so a step tied to the void's own size ran out of
      // rings for a small void dropped in the middle. Fixed 4-unit rings out to
      // 260 units instead. Two passes: prefer somewhere the whole body fits,
      // and fall back to bare land for a void too big for any shoreline.
      const dirScan = (x: number, z: number, test: (px: number, pz: number) => boolean): [number, number] | null => {
        for (let ring = 1; ring <= 65; ring++) {
          const rr = ring * 4;
          for (let a2 = 0; a2 < 16; a2++) {
            const ang = (a2 / 16) * Math.PI * 2 + ring * 0.19;   // stagger so rings don't resample the same spokes
            if (test(x + Math.cos(ang) * rr, z + Math.sin(ang) * rr)) return [Math.cos(ang), Math.sin(ang)];
          }
        }
        return null;
      };
      const landDir = (x: number, z: number): [number, number] | null =>
        dirScan(x, z, solid) ?? dirScan(x, z, (px, pz) => !!island.biomeAt(px, pz));
      // STALL BREAKER. `solid` needs all four cardinal probes on land, which a
      // concave shoreline can fail permanently — a play-through wedged the void
      // against the Dance Cove spit for 74 seconds of a 180-second match, and
      // again for a whole run. The rivals have had an escape hatch for this the
      // whole time (rv.stall > 0.8 abandons the target and wanders inland); the
      // player did not. If we are driving and going nowhere, walk inland.
      // …and it only counts as stuck if we are BOTH going nowhere AND properly
      // off the land. Holding a thumb into the shore is not stuck — you are
      // leaning on a wall, which is a legitimate thing to do — and treating it
      // as stuck made the breaker shove you inland while your own input pushed
      // straight back, once every 0.7 seconds. That was the shudder at the
      // waterline. It now fires only when the body is genuinely off the land.
      // …and "genuinely off the land" was WRONG, provably. A live run wedged
      // the void at (197.24, 201.09) with all four cardinal probes on land —
      // solid() true, so `wedged` was false, so stallT reset every frame and
      // this breaker was unreachable in exactly the case it exists for. The
      // void then held perfectly still for 15 seconds of a 180-second match.
      // Being fully on land and having no legal step are not mutually
      // exclusive. The trigger is ACTUAL IMMOBILITY; the "leaning on a wall is
      // legitimate" case is now handled by the heading sweep below succeeding,
      // not by disabling the timer.
      if (driving && Math.hypot(voidState.x - prev.x, voidState.z - prev.z) < 0.02 * Math.max(0.4, dt * 60)) {
        stallT += dt;
        if (stallT > 0.7) {
          const ld = landDir(voidState.x, voidState.z) ?? [-voidState.x, -voidState.z];
          const L = Math.hypot(ld[0], ld[1]) || 1;
          voidState.x += (ld[0] / L) * dt * 34; voidState.z += (ld[1] / L) * dt * 34;
          if (stallT > 2.2) stallT = 0;
        }
      } else stallT = 0;
      if (solid(nx, nz)) { voidState.x = nx; voidState.z = nz; }
      else {
        // THE HEADING SWEEP. Two previous attempts projected the velocity onto
        // a guessed wall normal. Both guesses are quantised — the 16-spoke ring
        // to 22.5 degrees, the four-probe finite difference to one of eight
        // compass bearings — so on any oblique shore the "tangential" residue
        // still pointed into the boundary, solid() refused it, and the 0.86
        // ease ran every frame: 0.86^40 is 0.002. A sweep measured 0.00 u/s
        // median tangential speed at 45 degrees incidence AT EVERY RADIUS, and
        // 61% arrival on 120 A-to-B navigation trials.
        //
        // So stop guessing the normal. Fan out from the desired heading and
        // take the first one that is actually legal — which is what a hole
        // game's wall does, and it needs no normal at all.
        let moved = false;
        const sp = Math.hypot(velX, velZ);
        if (sp > 0.001) {
          const base = Math.atan2(velZ, velX);
          for (const deg of [12, -12, 25, -25, 40, -40, 55, -55, 70, -70, 84, -84]) {
            const a2 = base + deg * (Math.PI / 180);
            const cx = Math.cos(a2), cz = Math.sin(a2);
            const tx = voidState.x + cx * sp * dt, tz = voidState.z + cz * sp * dt;
            if (solid(tx, tz)) {
              voidState.x = tx; voidState.z = tz;
              velX = cx * sp; velZ = cz * sp;    // keep the speed, take the legal heading
              moved = true; break;
            }
          }
        }
        if (!moved) {
          // a genuine dead end (an inside corner). Bleed off rather than snap.
          velX *= 0.86; velZ *= 0.86;
        }
        // off the land entirely — grew past the shore, or nudged in. Swimming
        // back has to be authoritative, not a nudge: a big void's steering runs
        // at up to 58 u/s and out-pushed the old drift, which is how a WORLD
        // ENDER could sit in the middle of the bay indefinitely.
        if (!solid(voidState.x, voidState.z)) {
          const ld = landDir(voidState.x, voidState.z);
          if (ld) {
            velX = ld[0] * 62; velZ = ld[1] * 62;
            voidState.x += velX * dt; voidState.z += velZ * dt;
          }
        }
      }
    }
  }
  const vx = (voidState.x - prev.x) / Math.max(1e-4, dt);
  const vz = (voidState.z - prev.z) / Math.max(1e-4, dt);
  prev.x = voidState.x; prev.z = voidState.z;
  { const sp = Math.hypot(vx, vz); if (sp > 4) { aim.x = vx / sp; aim.z = vz / sp; } }

  // ── CAN I EAT THAT? ───────────────────────────────────────────────────────
  // The only signal that a prop was over the size gate used to be a shake, set
  // when you were already touching it. Measured at the Pirate spawn: 160 props
  // on screen and 28.1% edible, so a child's first minute was 115 visible
  // objects silently refusing them. (Maple: 70 on screen, 58.6% edible — which
  // is most of why Maple feels better to play.) Anything too big is now
  // desaturated toward slate, so the line is glanceable from across the street.
  gateT -= dt;
  if (started && gateT <= 0) {
    gateT = 0.4;
    const Rg = voidling.radius, reach = Rg * 26 + 40;
    for (const e of edibles) {
      if (e.eaten || !e.mesh.visible) continue;
      const dx = e.mesh.position.x - voidState.x, dz = e.mesh.position.z - voidState.z;
      if (dx * dx + dz * dz > reach * reach) continue;
      const tooBig = e.radius > Rg * EAT_RATIO;
      if (tooBig === e.mesh.userData.gated) continue;   // no per-frame churn: only on the transition
      e.mesh.userData.gated = tooBig;
      e.mesh.traverse((o) => {
        const mm = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
        if (!mm || !mm.color) return;
        if (tooBig) {
          if (!o.userData.baseCol) o.userData.baseCol = mm.color.clone();
          // clone the material once per gated mesh, or every prop sharing the
          // merged-prop material would grey out together
          if (!o.userData.gateMat) { o.userData.gateMat = mm.clone(); (o as THREE.Mesh).material = o.userData.gateMat; }
          ((o as THREE.Mesh).material as THREE.MeshStandardMaterial).color
            .copy(o.userData.baseCol).lerp(GATE_GREY, 0.42);
        } else if (o.userData.baseCol && o.userData.gateMat) {
          ((o as THREE.Mesh).material as THREE.MeshStandardMaterial).color.copy(o.userData.baseCol);
        }
      });
    }
  }

  // powers are PLAYER decisions — auto-fire only exists for the headless demo
  // harness (debug URLs). In a real match nothing ever blasts on its own.
  autoFireCd -= dt;
  if (DEBUG_HARNESS && started && !ended && autoFireCd <= 0 && powerCd <= 0) {
    autoFireCd = rand(2.5, 4.2);
    if (hunger >= COST.collapse) fireCollapse();
    else if (hunger >= COST.gulp) fireGulp();
  }

  const R = voidling.radius;
  // ── resolve the void's mood from live game state ──
  {
    let mood: Mood = 'cruise';
    const R2 = voidling.radius;
    let scared = false;
    for (const rv of rivals.list) {
      if (rv.r > R2 * 1.15 && Math.hypot(rv.x - voidState.x, rv.z - voidState.z) < R2 + rv.r + 16) { scared = true; break; }
    }
    if (tClock < hurtUntil) mood = 'hurt';
    else if (outroT > 0) mood = playerScore >= Math.max(0, ...rivals.list.map((r) => r.score)) ? 'victory' : 'cruise';
    else if (scared) mood = 'scared';
    else if (tClock < smugUntil) mood = 'smug';
    else if (combo >= 5 && comboT > 0) mood = 'frenzy';
    else if (tClock - hungryT < 0.45) mood = 'hungry';
    else if (started && !ended && tClock - lastInput > 8) mood = 'sleepy';
    if (moodPin) mood = moodPin as typeof mood;   // QA pin, see __setMood
    voidling.setMood(mood);
    if (mood !== prevMood) {
      if (mood === 'scared') audio.voice('scared');
      else if (mood === 'frenzy' || mood === 'victory') audio.voice('happy');
      else if (mood === 'sleepy') audio.voice('sleepy');
      prevMood = mood;
    }
  }

  // ── THE PUPILS WERE JAMMED IN A CORNER AT SIZE ────────────────────────────
  // Owner, from a playtest: "when it gets big I feel like symmetry is off with
  // its face." The rig is symmetric — the fault is the GAZE, and it was two
  // bugs stacked.
  //
  // 1. `vx / 40` is a constant divisor in a game whose world speed rides the
  //    camera: speed = min(96, 16 * camDist/50), and camDist grows with radius.
  //    Top speed is 13.3 u/s at r=1 but 96 u/s at r=12, so from about r=3.8
  //    upward BOTH channels sat pinned at ±1 for most of the match and both
  //    pupils lived pressed into the same corner of both eyes. Held there, the
  //    two eyes stop reading as a pair and the face looks subtly wrong in a way
  //    that is hard to name and easy to see.
  // 2. It fed WORLD x/z into a face that is billboarded to the camera, and the
  //    camera's ground basis is a flat 45° off world axes (camOffset.x equals
  //    camOffset.z), so "look where you are going" pointed 45° away from where
  //    the void was actually going.
  //
  // Normalised against 3x top speed rather than top speed: perceived speed is
  // already constant by design ("world speed rides the camera distance"), so
  // the divisor has to be a fixed MULTIPLE of it to keep the feel identical at
  // every size. 3x reproduces the small void's current, un-complained-about
  // gaze (0.33 at full stick) at r=1 and at r=12 alike.
  const gFl = Math.hypot(camOffset.x, camOffset.z) || 1;
  const gS = 3 * Math.max(1, Math.min(96, 16 * (camDist / 50)));
  const gX = (camOffset.z * vx - camOffset.x * vz) / (gFl * gS);   // screen right
  const gY = (-camOffset.x * vx - camOffset.z * vz) / (gFl * gS);  // screen up
  voidling.update(dtw, { t: tClock, x: voidState.x, z: voidState.z, vx, vz,
    lookX: THREE.MathUtils.clamp(gX, -1, 1), lookY: THREE.MathUtils.clamp(gY, -1, 1) });
  // ── HOW FAR THE CROWD MATTERS ──────────────────────────────────────────
  // Everything past this runs on a stagger rather than every frame (see the
  // dispatch in life.ts). It is derived from the CAMERA, not from a constant,
  // because how much town is on screen is entirely a function of camDist —
  // which climbs from 38 to 340 as the void grows, so a fixed radius would be
  // generous at the start and would cut into the visible frame at the end.
  //
  // 2.2x plus 90 is deliberately loose. The saving comes from the hundreds of
  // walkers on the far side of the island, not from shaving the edge of the
  // frame, and a gate tight enough to be visible is a gate that will be
  // noticed for the wrong reason. During the establishing shot the gate is
  // off entirely: the camera is 300 units up and looking at the whole map.
  const crowdGate = introT > 0 ? Infinity : camDist * 2.2 + 90;
  _dbg.__crowdGate = crowdGate;
  life.update(dtw, tClock, voidState.x, voidState.z, R, crowdGate);
  // the family races on the SAME terms as the player now, so it needs the same
  // three numbers: the clock it is pacing against, the score its rubber band
  // reads, and the shared HAPPY HOUR multiplier
  // …and the family stops when the match stops. Passing t=0 was not enough:
  // the rivals keep moving and scoring at t=0, so twenty seconds parked on the
  // results screen still added points to a board the panel had already
  // snapshotted. The ambient town (life.update, above) deliberately keeps
  // running — the world behind the score card should still look alive.
  if (!ended && !paused) {
    rivals.update(dtw, started && !soloMode ? matchElapsed() : 0, voidState.x, voidState.z, R,
      { matchLen, playerScore, fever: feverMult, par: WORLD_PAR[pickedWorld] });   // solo: the family never joins
  }
  // ── THE RULE NOBODY WAS EVER TAUGHT ────────────────────────────────────────
  // "A bigger void eats you" is the entire danger half of the game, and the
  // ONLY place it was written down is the #tut card — which is shown from
  // launchWorld(), reachable only through the menu. The very first launch
  // bypasses the menu and drops straight into a live match, so a brand-new
  // child never saw it, while a rival was already charging them with a screen
  // shake and a red flash. The three guide beats that do fire cover moving,
  // eating and evolving. None of them mentions being eaten.
  //
  // Taught in context instead of in a modal: the beat fires the first time a
  // genuinely bigger rival is close enough to matter, which is the moment the
  // lesson is about. Its partner fires when the tables turn.
  // THE DRAG LESSON REPEATS UNTIL IT IS LEARNED. Gating step 1->2 on a real
  // drag stops the lesson being overwritten, but on its own it leaves the
  // child who still has not worked out the control with a pill that expired
  // six seconds in and nothing after it. So while they have not driven, the
  // instruction comes back — three times, three seconds apart, then it stops
  // and lets them be. It cannot nag a child who is already playing, because
  // nomArmed goes true on their first real drag and this never runs again.
  // The cooldown only runs while the pill is DOWN. Ticking it during the five
  // seconds the pill is up meant it had already expired by the time the pill
  // hid, so the repeat fired in the same frame — measured as one unbroken
  // 20.78s label, which reads as a stuck HUD element rather than as the game
  // saying it again. The gap is the whole message.
  if (firstRun && started && !ended && guideStep === 1 && !nomArmed && dragNags < 3 && guideT <= 0) {
    dragNagT -= dt;
    if (dragNagT <= 0) { showGuide('<b>DRAG</b> anywhere to move!', 5); dragNagT = 3; dragNags++; }
  }
  // …and NOT UNTIL THEY CAN MOVE. This fires on any frame the guide is idle,
  // which includes the gaps between the drag lesson's repeats — so a child who
  // had not yet worked out the control was being told "that one is BIGGER than
  // you — run!" about a rival they had no way to run from, in the middle of
  // being taught how to run. Measured sequence before this gate: DRAG, DRAG,
  // BIGGER, DRAG. `nomArmed` means a real drag has happened.
  if (firstRun && started && !ended && guideT <= 0 && nomArmed) {
    for (const rv of rivals.list) {
      if (!rv.joined) continue;
      const d = Math.hypot(rv.x - voidState.x, rv.z - voidState.z);
      if (!dangerTaught && rv.r > R * 1.15 && d < 70) {
        dangerTaught = true;
        showGuide('that one is <b>BIGGER</b> than you — run! 😱', 5);
        audio.alert(); buzz(30);
        break;
      }
      if (dangerTaught && guideStep < 4 && rv.r < R * 0.8 && d < 70) {
        guideStep = 4;
        showGuide('now <b>YOU</b> are bigger — eat them! 😋', 5);
        break;
      }
    }
  }
  bubbles.update(dt);
  const cy = voidling.group.position.y;

  for (const e of edibles) {
    if (!started || ended || paused) break;   // menu attract mode, the results screen, AND pause:
    // the sim used to run at full rate behind the score card, so the panel (a
    // snapshot) disagreed with the live board underneath it, rivals kept
    // scoring, chomp SFX chewed over the results, and the coins actually
    // banked drifted past the number the child had just been shown.
    if (e.eaten) {
      // A HOTEL AND A SEASHELL DRAINED AT THE SAME SPEED. e.t advanced at a flat
      // 2.4/s, so everything in the game took an identical 0.417s to go down,
      // on an identical linear ramp — which is most of why a landmark bite felt
      // like a pebble bite. Big things now take up to twice as long and start
      // slower, and the spiral accelerates as it falls so the last third whips.
      const mass = Math.min(1, e.radius / Math.max(0.4, R));
      e.t += dtw * (2.9 - 1.3 * mass);
      const p = e.mesh.position;
      // …never more than 42 degrees of arc in one frame, however long the
      // frame was. Past about a third of a turn the eye stops joining the
      // positions into a curve and starts seeing a jump.
      e.orbit += Math.min(0.73, dtw * 10 * (1 + 2.2 * e.t));
      // …and 1 - t is a straight line into the middle. Squared, the prop hangs
      // at the rim for a beat and then drops, which is what a drain does.
      const r = e.orbitR * (1 - e.t * e.t);
      p.x = voidState.x + Math.cos(e.orbit) * r;
      p.z = voidState.z + Math.sin(e.orbit) * r;
      // THINGS WERE FALLING UPWARDS. `cy` is the void's group height, which is
      // dispR * RADIUS_SINK = +0.31 x R ABOVE the ground — so this line, whose
      // own comment says "sink INTO the pit", lerped every prop UP. Measured
      // across 295 captures of every prop kind in both worlds: +2.6 to +3.6
      // units of RISE, 245 of them climbing. Straight down into the hole now.
      // the DESCENT stays on real time: hit-stop is meant to punch the void's
      // own body, not to hang the thing that is currently falling into it
      p.y = THREE.MathUtils.lerp(p.y, -R * 0.55, Math.min(1, dt * 7));
      e.mesh.rotation.x += e.spin.x * dtw; e.mesh.rotation.y += e.spin.y * dtw; e.mesh.rotation.z += e.spin.z * dtw;
      // …and it was DELETED AT 0.10 SCALE. On a shell nobody notices; on a
      // seven-unit hotel that is a 1.4-unit chunk of building blinking out in
      // mid-air, which is exactly the "they just disappear" report. Drive the
      // scale off e.t directly so it always finishes at zero.
      const k = Math.max(0, 1 - e.t);
      e.mesh.scale.set(e.homeScale.x * k, e.homeScale.y * k, e.homeScale.z * k);
      if (e.t >= 1) {
        // the puff marks where the THING went, not where the void is standing
        spawnPuff(p.x, Math.max(0.2, cy * 0.4), p.z, 6);
        scene.remove(e.mesh); e.eaten = false;
        e.mesh.visible = false; e.mesh.userData.eaten = false;
      }
      continue;
    }
    if (!e.mesh.visible || e.mesh.userData.eaten) continue;   // a rival owns it — never double-eat
    const dx = e.mesh.position.x - voidState.x, dz = e.mesh.position.z - voidState.z;
    const d = Math.hypot(dx, dz);
    const reach = R * 2.0 + e.radius * 2.4;
    const inWell = d < reach && e.radius < 2.5 && (!e.mesh.userData.mover || e.radius < 0.9) && e.radius <= R * EAT_RATIO;
    // spring-back runs FIRST, unconditionally: if a rival bite shrank us while
    // this prop was displaced, the old size-gated flow stranded it on the
    // asphalt forever — displaced props ALWAYS walk home when out of the well
    if (!inWell && e.mesh.userData.drifted) {
      const hx2 = e.home.x - e.mesh.position.x, hz2 = e.home.z - e.mesh.position.z;
      if (Math.hypot(hx2, hz2) < 0.1) { e.mesh.position.x = e.home.x; e.mesh.position.z = e.home.z; e.mesh.rotation.z = 0; e.mesh.userData.drifted = false; }
      else {
        const k2 = Math.min(1, dt * 3);
        e.mesh.position.x += hx2 * k2; e.mesh.position.z += hz2 * k2;
        e.mesh.rotation.z *= 1 - k2;
      }
    }
    if (e.radius > R * EAT_RATIO) {
      // too big to eat yet — 2D rule: you pass through, it SHAKES (no weird block)
      if (d < R + e.radius * 0.7 && !(e.mesh.userData.shakeT > 0)) e.mesh.userData.shakeT = 0.45;
      continue;
    }
    if (d < R + e.radius * 0.7) {
      capture(e);
    } else if (inWell) {
      // MAGNET: the void's gravity well scales with its size — small PROPS
      // drift in (hole.io's suction fantasy). Buildings stay founded; walkers,
      // cars and critters steer themselves and are never magnetized.
      const pull = (1 - d / reach) * (1 - d / reach) * (8 + R * 1.1);   // quadratic: violent at the rim, gentle at reach — reads as GRAVITY
      if (d < reach * 0.85) hungryT = tClock;   // food in the well: the face gets HUNGRY
      e.mesh.position.x -= (dx / d) * dt * pull;
      e.mesh.position.z -= (dz / d) * dt * pull;
      // …AND IT LEANS. This was capped at 0.16 rad — NINE DEGREES — which is
      // a nudge nobody has ever noticed. The single frame this genre sells
      // itself on is a lamppost or a hotel keeling over the rim and hanging
      // there for a beat before it goes, and at nine degrees we were not
      // taking that frame. 0.75 rad is 43 degrees: a real topple. It is scaled
      // by how far into the well the prop is, so distant things still only
      // shiver and the lean builds as it is drawn in.
      // Tilt on BOTH axes, toward the void rather than only side to side — a
      // prop directly up-screen of the hero was leaning sideways instead of
      // toward it, which reads as a wobble instead of a fall.
      const leanK = Math.min(0.75, (1 - d / reach) * 1.35);
      e.mesh.rotation.z = (dx / d) * leanK;
      e.mesh.rotation.x = -(dz / d) * leanK;
      e.mesh.userData.drifted = true;
    }
  }

  // decay prop shakes (too-big objects wobble as the void passes through)
  for (const e of edibles) {
    const ud = e.mesh.userData;
    if (ud.shakeT > 0) {
      ud.shakeT -= dt;
      e.mesh.rotation.z = ud.shakeT > 0 ? Math.sin(tClock * 42) * 0.05 * (ud.shakeT / 0.45) : 0;
    }
  }

  const pa = puffGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < PUFF; i++) if (puffLife[i] > 0) {
    puffLife[i] -= dt; puffVel[i].y -= dt * 14;
    puffPos[i * 3] += puffVel[i].x * dt; puffPos[i * 3 + 1] += puffVel[i].y * dt; puffPos[i * 3 + 2] += puffVel[i].z * dt;
    if (puffLife[i] <= 0) puffPos[i * 3 + 1] = -999;
  }
  pa.needsUpdate = true;

  // camera — the 2D game's zoom-band model: within a form the void keeps a
  // constant (small!) on-screen size; each evolution zooms the world out a
  // step, so growth READS. Start: void ≈ 6% of screen height, hole.io style.
  if (ASSETVIEW) {
    camera.position.set(0, 716, 138);
    camera.lookAt(0, 588, -6);
  } else if (TOPDOWN) {
    if (camera.far < 1400) { camera.far = 1400; camera.updateProjectionMatrix(); }   // island sits past the default far plane
    camera.position.set(0, 1120, 0.001);
    camera.lookAt(0, 0, 0);
  } else {
    // CONTINUOUS zoom (hole.io): distance ∝ R^0.78 — the void visibly gains
    // ~20% screen size across a form before the camera catches up, so growth
    // reads every few seconds instead of only at evolutions
    let targetDist = Math.min(340, Math.max(26, 38 * Math.pow(R / 0.9, 0.82)));
    if (introT > 0) {
      introT -= dt;
      // ── THE ESTABLISHING SHOT IS EXPENSIVE, so it does not pay for shadows.
      // Measured on GAME DAY: the opening frame renders 4,694 draw calls and
      // 1.40M triangles against 1,241 and 355k in settled play — the camera is
      // three hundred units up and pointed at a landmark most of the plateau
      // away, so nearly the whole world is inside the frustum. Draw calls count
      // the shadow pass too, and shadow detail is invisible under a 3.4-second
      // pull-back, so the cheapest half of that bill is also the half nobody
      // can see. Restored below the moment the move ends.
      if (introShadow === null) { introShadow = renderer.shadowMap.enabled; renderer.shadowMap.enabled = false; sun.castShadow = false; }
      if (introT <= 0 && introShadow !== null) {
        renderer.shadowMap.enabled = introShadow; sun.castShadow = introShadow; introShadow = null;
      }
      if (introT <= 0 && firstRun && !dragTaught) {
        // controls are live THIS frame — now the instruction is true
        dragTaught = true; guideStep = 1;
        showGuide('<b>DRAG</b> anywhere to move!', 6);
        dragNagT = 3;   // the repeat waits its gap too, not just the ones after it
      }
      const k2 = Math.max(0, introT / COPY.introLen);
      camDist = 38 + 262 * k2 * k2;   // ease-in dive from orbit
      targetDist = camDist;
    }
    // THE ESTABLISHING SHOT. While the intro runs, the camera's subject slides
    // from the world's hero landmark to the void — so GAME DAY opens looking
    // straight down the sightline at the stadium, holds it while the title card
    // is up, and arrives on the player as the controls go live. Smoothstep
    // rather than the dive's own quadratic: the subject should still be the
    // bowl for the first half-second, not already halfway home.
    // Worlds with no hero pass null and behave exactly as before.
    if (introT > 0 && COPY.hero) {
      const u = Math.max(0, Math.min(1, introT / COPY.introLen));
      // HOLD, THEN TRAVEL. A straight smoothstep across the whole intro left
      // the camera off the stadium within half a second — there was never a
      // frame you could call an establishing shot. This holds the subject ON
      // the landmark for the first quarter, hands it over across the middle
      // half, and spends the last quarter settled on the void so the controls
      // go live on a still camera.
      const q = Math.max(0, Math.min(1, (u - 0.25) / 0.5));
      const e = q * q * (3 - 2 * q);
      introHX = (COPY.hero[0] - voidState.x) * e;
      introHZ = (COPY.hero[1] - voidState.z) * e;
    } else { introHX = 0; introHZ = 0; }
    if (outroT > 0) targetDist *= 0.72;   // end-of-match push-in on the winner moment
    camDist += (targetDist - camDist) * (1 - Math.exp(-1.6 * dt));
    // steepen the camera as the void grows (hole.io): big hole ⇒ near-top-down,
    // so towers and trees stop hiding the hero
    const steep = THREE.MathUtils.clamp((R - 2.5) / 5.5, 0, 1);
    camOffset.set(0.62 + (0.45 - 0.62) * steep, 0.92 + (1.4 - 0.92) * steep, 0.62 + (0.45 - 0.62) * steep).normalize();
    // LOOKAHEAD: frame the ground AHEAD of travel — a steer-to-eat game gives
    // the pixels to where you're going, the void rides slightly behind center
    // …off SMOOTHED ACTUAL DISPLACEMENT, never off velX/velZ. Those are the
    // control velocity, which the wall code rewrites every frame — cancelled,
    // scaled by 0.86, or hard-set to 62 u/s for the swim-back, which is 6.2
    // units of lookahead in a single frame. camera.lookAt is applied with no
    // smoothing at all, so every one of those flips became an instantaneous
    // look-direction flip: measured 0.324 degrees mean angular jitter per frame
    // grinding the shoreline against 0.025 on open ground, 13x. That was the
    // screen shake at the waterline.
    lookVX += ((voidState.x - camPrevX) / Math.max(1e-4, dt) - lookVX) * Math.min(1, dt * 6);
    lookVZ += ((voidState.z - camPrevZ) / Math.max(1e-4, dt) - lookVZ) * Math.min(1, dt * 6);
    camPrevX = voidState.x; camPrevZ = voidState.z;
    // …and CLAMPED. Smoothing the lookahead fixed the jitter but not the swing:
    // the shore swim-back overwrites velocity outright at 62 u/s, which even
    // after smoothing is metres of look-target movement in a few frames, and
    // that still reads as the camera lurching whenever you touch the water.
    // Two and a half units is as far as the camera is ever allowed to lead.
    const lookL = Math.hypot(lookVX, lookVZ) * 0.10;
    const lookK = lookL > 2.5 ? 2.5 / lookL : 1;
    const lookX = voidState.x + lookVX * 0.10 * lookK + introHX;
    const lookZ = voidState.z + lookVZ * 0.10 * lookK + introHZ;
    tmpV.copy(camOffset).multiplyScalar(camDist);
    tmpV.x += lookX; tmpV.z += lookZ;
    camera.position.lerp(tmpV, 1 - Math.exp(-5.0 * dt));
    camera.lookAt(lookX, R * 0.5, lookZ);
    camera.updateMatrixWorld();
    // (the SIZE chip that used to be projected here is gone — the growth bar
    // on the floor carries the form name and the metres now, and it does not
    // sit under the steering thumb or swim against the void's own spring)
    // fog rides the zoom: distance melts into cosmos = instant diorama depth
    if (scene.fog) { (scene.fog as THREE.Fog).near = 60 + camDist * 1.4; (scene.fog as THREE.Fog).far = 260 + camDist * 4; }
  }
  // sun follows the void so shadows stay crisp near the action (fixed high
  // noon — the sun never drops, the island never changes colour mid-match)
  // A DIRECTIONAL LIGHT'S DIRECTION IS target MINUS position, so both ends have
  // to travel together. The target followed the player and the position did
  // not, which rotated the sun as you drove: measured 53.9 degrees of elevation
  // at the island centre and 21.7 at the east edge — shadows more than doubled
  // in length and swung about 180 degrees in azimuth depending on where the
  // player was standing. This line already moved the position; the bug was that
  // sunOff.y was used as an ABSOLUTE height while x and z were relative, so the
  // triangle changed shape with distance from the origin. All three are now
  // relative and the sun angle is fixed everywhere on the island.
  sun.position.set(voidState.x + sunOff.x, sunOff.y, voidState.z + sunOff.z);
  sun.target.position.set(voidState.x, 0, voidState.z);
  sun.target.updateMatrixWorld();

  // evolution: form change on growth (with a flash), plus ring/glow via setStage
  const ns = stageFor(voidling.radius);
  if (ns > curStage) {
    curStage = ns;
    // the bar takes the beat too — the pips retire one at a time and the whole
    // strip swells, so an evolution is visible at the bottom of the screen and
    // not only in the middle of it
    growthEl.classList.remove('pop'); void growthEl.offsetWidth; growthEl.classList.add('pop');
    setTimeout(() => growthEl.classList.remove('pop'), 260);
    // never draw over the MAPLE ISLE title card — one hero message at a time
    if (tClock > titleUntil) {
      evolveEl.querySelector('.big')!.textContent = FORMS[curStage];
      if (curStage >= 3) questEvent('devourer');
      if (guideStep === 2) { guideStep = 3; showGuide('you <b>EVOLVED</b>! bigger void, bigger meals 🏠', 5); }
      evolveEl.classList.remove('show'); void (evolveEl as HTMLElement).offsetWidth; evolveEl.classList.add('show');
      holdBanner(2.4);   // this card owns the screen while it plays
    }
    audio.evolve();
    track('evolve', { form: curStage, name: FORMS[curStage], sec: elapsed() });
    fx.ring(voidState.x, voidState.z, 0xc9a6ff, R * 5, 0.8);   // GOBBLER quest
    audio.setMusicStage(VISUAL_STAGE[curStage] ?? 4);   // the soundtrack escalates too
    buzz(45);
    // …and the last rung gets a whole moment of its own. Three rings, a white
    // flash, a long shake and its own headline: you are not meant to see this
    // every match.
    if (curStage === FORMS.length - 1) {
      fx.ring(voidState.x, voidState.z, 0xffffff, R * 9, 1.2);
      fx.ring(voidState.x, voidState.z, 0xffd23f, R * 6.5, 1.0);
      fx.flash('#ffffff', 0.55);
      fx.shake(1.1);
      announce(COPY.ender);
      breakingNews(COPY.enderNews);
      buzz(120);
    }
  }
  // NEVER downgrade: the growth-law clamp can pull radius back under a form
  // threshold the frame after evolving — re-announcing the same form forever
  voidling.setStage(VISUAL_STAGE[curStage] ?? 4);

  // the soundtrack follows you: standing on the dance floor brings in the kick,
  // the stab and the crowd, and ducks the island bed under them
  if (started) audio.setZone(island.biomeAt(voidState.x, voidState.z));

  // combo decays when you stop eating
  comboT -= dt; if (comboT <= 0) combo = 0;

  // NO DEFENCE LAYER. Police cars, army jeeps, tanks and gunships used to
  // escalate with the player's form. A void cannot be hurt, so they were free
  // points with a siren attached — noise that made the world feel less like a
  // holiday and generated the worst headline in the game ("army forms a snack
  // line"). Removed outright rather than re-themed.

  // throttle DOM leaderboard updates (~5/s)
  // power-ready toast: celebrate the moment a power charges up
  if (POWERS_ON && hunger >= COST.gulp && prevHunger < COST.gulp) { floatPos.set(voidState.x, R + 3, voidState.z); bubbles.float(floatPos, 'GULP READY!', true); audio.ready(); }
  if (POWERS_ON && hunger >= COST.collapse && prevHunger < COST.collapse) { floatPos.set(voidState.x, R + 3, voidState.z); bubbles.float(floatPos, 'COLLAPSE READY!!', true); audio.ready(); }
  prevHunger = hunger;

  // island news: a headline every ~20s, tone tracks the devoured meter
  if (started && !ended) {
    // ── THE FINALE COMES INTO RANGE ────────────────────────────────────────
    if (heroProp && COPY.heroCue && !heroCued && !heroProp.mesh.userData.eaten
        && heroProp.radius <= voidling.radius * EAT_RATIO) {
      heroCued = true;
      announce(COPY.heroCue);
      // …and hold the screen, the way the evolve card does. The "35 SECONDS"
      // warning fires at t=145s and announce() overwrites whatever is up: the
      // file already carries a comment about that exact collision eating the
      // TREASURE FEAST beat in every logged run. Maple's cue lands near 132s
      // on an optimal run, but a slower one drifts toward the warning, and
      // holdBanner queues rather than clobbers.
      holdBanner(2.4);
      if (COPY.heroCueNews) breakingNews(COPY.heroCueNews);
      audio.ready(); buzz(30);
      fx.ring(heroProp.mesh.position.x, heroProp.mesh.position.z, 0xf0b429, heroProp.radius * 5, 0.9);
    }
    if (heroProp && COPY.heroGone && !heroAte && heroProp.mesh.userData.eaten) {
      heroAte = true;
      // …but only celebrate it if the PLAYER ate it. Rivals eat by the same
      // rule with no exclusion for the hero prop, so this fired a full-screen
      // congratulation for something a rival had just taken off the board —
      // on every hero world, including the one the copy was written for.
      // byPlayer is already tracked for the DEVOURED meter's you-vs-family split.
      if (heroProp.mesh.userData.byPlayer) { announce(COPY.heroGone); audio.voice('happy'); buzz(120); }
    }
    newsCd -= dt;
    // BREATHING ROOM: a headline every 14-20s meant the card was on screen
    // roughly a third of the match — it stopped being an event. Now 30-42s,
    // and a breaking beat still cuts the line when the player earns one.
    if (newsCd <= 0) {
      // A NEWSROOM SPEEDS UP. The gap was a flat 16-24s from the sign-on to the
      // last second of the match, so the station was as relaxed reporting the
      // end of the town as it was reading the fair results. Halved at full
      // tension — a bulletin every 8-12s once it is really going.
      const urgent = 1 - 0.5 * tension();
      newsCd = (COPY.newsGap[0] + Math.random() * COPY.newsGap[1]) * urgent;
      showNews();
    }
  }

  // the DRAG-to-steer hint retires itself once the player has been driving
  if (started && tClock - lastInput < 1 && matchElapsed() > 8) hungerLbl.style.opacity = '0';

  hudCd -= dt;
  if (hudCd <= 0) {
    hudCd = 0.2; refreshHud();
    hungerFill.style.width = `${Math.max(6, Math.round(hunger * 100))}%`;
    hungerEl.classList.toggle('ready', hunger >= COST.gulp);
    pwBtns[0].classList.toggle('off', hunger < COST.gulp || powerCd > 0);
    pwBtns[1].classList.toggle('off', hunger < COST.collapse || powerCd > 0);
    // the street finds out at the same rate the HUD does
    life.tension(started && !ended ? tension() : 0);
  }
  // …the growth bar is NOT on that 5Hz tick. It is the one HUD element whose
  // whole job is to look continuous.
  // It is also only ever a MATCH element: body.ovl covers the sheets, but the
  // results card is #end and #end is not in OVERLAYS, so the bar was sitting
  // on top of the score screen at full opacity.
  const gOn = started && !ended && !paused;
  growthEl.classList.toggle('off', !gOn);
  if (gOn) paintGrowth(R);

  pumpBanner();   // anything the evolve card held back gets its turn now

  if (SHOW_WALLS) paintWalls();
  // LOD band + shadow frustum track the camera
  updateLodBias(camDist);
  fitShadow(camDist);
  fadeOccluders(dt);

  // adaptive quality: step down fast when fps dips, climb back slowly
  qAccT += dt; qAccN++; qCd -= dt;
  if (qPinned === null && qCd <= 0 && qAccT > 0) {
    const avg = qAccN / qAccT; qAccN = 0; qAccT = 0;
    if (avg < 46 && qLevel < QUALITY.length - 1) { qLevel++; applyQuality(); qCd = 4; }
    else if (avg > 57 && qLevel > 0) {
      // climbing back is free EXCEPT across the shadow boundary, which costs a
      // full shader rebuild. Once shadows have gone off, they stay off: the
      // pixel-ratio rungs above still give the device its quality back, and
      // they cost nothing to cross.
      const up = qLevel - 1;
      if (qShadowLatch && QUALITY[up].shadows && !QUALITY[qLevel].shadows) { qCd = 10; }
      else { qLevel = up; applyQuality(); qCd = 10; }
    }
    else qCd = 3;
  }

  // FIRST FRAME: the boot cover comes down only once there is something behind
  // it. Until now the menu painted immediately and then the main thread blocked
  // for 30-45 seconds building the island, with the player tapping PLAY at a
  // page that could not answer.
  if (!_booted) {
    _booted = true;
    // there is something behind the cover now — but if the world picker is
    // still waiting on the asset pack it keeps its own hold and the curtain
    // stays down. One owner, no flash of the game underneath.
    coverRelease('boot');
  }
  const shakeOff = fx.update(dtw);
  camera.position.add(shakeOff);
  // GOLDEN HOUR IS OUT. Dimming the sky and sun over the last 45s read as the
  // world randomly "turning to night" — confusing mid-match, and a kids' game
  // should look identical from the first second to the last. Maple Isle is
  // permanently high noon. (The lamp/window emissive ramp goes with it.)
  if ((shadowFrame++ & 1) === 0) renderer.shadowMap.needsUpdate = true;
  // …through the composer only on the rungs that can afford it. applyQuality
  // owns bloomOn, so the adapter switching rungs switches the glow with it.
  if (bloomOn) {
    const c = ensureComposer();
    c.setPixelRatio(renderer.getPixelRatio());
    c.setSize(renderer.domElement.clientWidth, renderer.domElement.clientHeight);
    c.render();
  } else {
    renderer.render(scene, camera);
  }
  requestAnimationFrame(animate);
}
// total edible mass on the island — the denominator for "% devoured"
initialMass = edibles.length;
if (bigStart > 0) voidling.setRadius(bigStart);   // debug: preview a bigger form
refreshHud();

if (ASSETVIEW) { scene.fog = null; buildGallery(scene); camera.position.set(0, 716, 138); camera.lookAt(0, 588, -6); }
else if (TOPDOWN) { camera.position.set(0, 1120, 0.001); camera.lookAt(0, 0, 0); }
else {
  camera.position.copy(camOffset).multiplyScalar(camDist).add(new THREE.Vector3(voidState.x, 0, voidState.z));
  camera.lookAt(voidState.x, voidling.radius * 0.5, voidState.z);
}
animate();
