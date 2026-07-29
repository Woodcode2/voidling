// VOIDLING — 3D PROTOTYPE (Three.js / WebGL)
// The cute VOIDLING void, rebuilt as a faithful 3D port of the 2D star, rolling
// through MAPLE ISLE — the 2D island ported to 3D, floating in cosmic space.
// Void: ./proto3d/void3d · island: ./proto3d/island · palette: ./proto3d/palette
// Standalone page — the main game bundle is untouched.
declare const __BUILD__: string;   // injected by vite.config define (build stamp)
import * as THREE from 'three';
// brand type: the shipping page used system-ui while only the retired React
// entry bundled the brand font — single cheapest "top-10 app" lift
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import '@fontsource/fredoka/400.css';
import '@fontsource/fredoka/600.css';
import '@fontsource/fredoka/700.css';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createVoid, type Mood } from './proto3d/void3d';
import { createIsland, ROAD_CENTERS_3D, insideIsland3, inLagoon3, inDeepWater3, islandOutline3, setWorld } from './proto3d/island';
import { createLife } from './proto3d/life';
import { createBubbles } from './proto3d/bubbles';
import { createRivals, RIVAL_VOICE } from './proto3d/rivals';
import { createMinimap } from './proto3d/minimap';
import { createFx } from './proto3d/fx';
import { createAudio } from './proto3d/audio3d';
import { SKINS, type Skin } from './proto3d/palette';
import { buildGallery, updateLodBias, preloadPack } from './proto3d/assets3d';
import { pickNews, resetNews, BRAND as PB_BRAND, type Dist as PBDist } from './proto3d/newsroom';
import { pickMapleNews, resetMapleNews, MAPLE_BRAND, type MapleDist } from './proto3d/newsroom_maple';
import { track, setCtx, countMatch, tickFrame, fpsSummary, resetFps } from './proto3d/telemetry';
import { initIAP, iapPrice, iapAvailable, purchase as iapPurchase, restorePurchases } from './proto3d/store3d';

// ── renderer / scene / camera ────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
// 1.6 is visually indistinguishable at mobile viewing distance but ~35% fewer
// pixels than 2.0 — the single biggest lag lever on phones.
const IS_SMALL_SCREEN = matchMedia('(pointer: coarse)').matches || window.innerWidth < 900;
renderer.setPixelRatio(Math.min(window.devicePixelRatio, IS_SMALL_SCREEN ? 1.3 : 1.6));
renderer.shadowMap.autoUpdate = false;   // half-rate shadow pass (updated in the frame loop)
let shadowFrame = 0;
// if the OS ever reclaims the GPU context, recover with a clean reload instead
// of a frozen black screen
renderer.domElement.addEventListener('webglcontextlost', (ev) => {
  ev.preventDefault();
  setTimeout(() => location.reload(), 400);
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();

// image-based ambience: gives every PBR material real specular response so
// surfaces read crisp/dimensional instead of flatly lit (the "2026" lift)
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
const hemi = new THREE.HemisphereLight(0xdfeaff, 0x4a4468, 0.22);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff2d8, 2.3);
const sunOff = new THREE.Vector3(-55, 95, 42);
sun.position.copy(sunOff);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 10;
sun.shadow.camera.far = 380;
let shCur = 165;
sun.shadow.camera.left = -shCur; sun.shadow.camera.right = shCur;
sun.shadow.camera.top = shCur; sun.shadow.camera.bottom = -shCur;
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.15;
const SUN_DAY = new THREE.Color(0xfff2d8);
const HEMI_DAY = new THREE.Color(0xdfeaff);
// the shadow frustum rides the camera: tight box up close = crisp tree
// shadows, widening as you zoom out (fixed 330u box was ~6 texels/unit)
function fitShadow(dist: number) {
  // THE STICKS ON THE SAND. At the 165-unit box the shadow map resolves 6.2
  // texels per world unit, so a palm trunk or a frond is one or two texels and
  // PCF smears it into a detached grey streak — dozens of them lying on open
  // ground with nothing above them. Capping the box at 110 roughly doubles the
  // resolution where the player actually is.
  const target = THREE.MathUtils.clamp(dist * 1.1, 45, 110);
  if (Math.abs(target - shCur) < 10) return;
  shCur = target;
  sun.shadow.camera.left = -shCur; sun.shadow.camera.right = shCur;
  sun.shadow.camera.top = shCur; sun.shadow.camera.bottom = -shCur;
  sun.shadow.camera.updateProjectionMatrix();
}
scene.add(sun); scene.add(sun.target);

// ── adaptive quality: hold a smooth frame rate on ANY device ─────────────────
// samples real fps and walks a quality ladder (pixel ratio → shadow res →
// shadows off). Climbing back up is slow and rare so it never oscillates.
const QUALITY = [
  { pr: 1.6, shadows: true, shSize: 2048 },
  { pr: 1.35, shadows: true, shSize: 1024 },
  { pr: 1.15, shadows: true, shSize: 1024 },
  { pr: 1.0, shadows: false, shSize: 512 },
];
let qLevel = 0, qAccT = 0, qAccN = 0, qCd = 4;
function applyQuality() {
  const q = QUALITY[qLevel];
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, IS_SMALL_SCREEN ? Math.min(q.pr, 1.3) : q.pr));
  if (renderer.shadowMap.enabled !== q.shadows) {
    renderer.shadowMap.enabled = q.shadows;
    sun.castShadow = q.shadows;
    scene.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
      if (m) (Array.isArray(m) ? m : [m]).forEach((mm) => { mm.needsUpdate = true; });
    });
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
const WORLD_NAMES: Record<string, string> = { maple: 'MAPLE ISLE', pirate: 'PIRATE BAY RESORT' };
const pickedWorld = (new URLSearchParams(location.search).get('w')
  ?? localStorage.getItem('voidWorld') ?? 'maple') === 'pirate' ? 'pirate' : 'maple';
setWorld(pickedWorld);
// every world-facing label follows the pick — title card, loading screen, and
// the newsroom's own brand
{
  const PB = pickedWorld === 'pirate';
  const nm = WORLD_NAMES[pickedWorld];
  document.title = `VOIDLING · ${nm} (3D)`;
  const tc = document.querySelector('#titlecard .name'); if (tc) tc.textContent = nm;
  const tl = document.querySelector('#titlecard .lvl'); if (tl) tl.textContent = PB ? 'LEVEL 2' : 'LEVEL 1';
  const ts = document.querySelector('#titlecard .sub');
  if (ts) ts.textContent = PB ? 'the resort is packed · eat the party' : 'the little void is hungry · eat the island';
  const ln = document.querySelector('#loadScr .lName'); if (ln) ln.textContent = nm;
}
const island = createIsland(scene, addEdible);
// dev/QA introspection hooks (harmless in prod; no gameplay reads these).
// __edibles + __insideIsland3 + __validateWorld power the placement auditor:
// a headless sweep measures every edible's REAL world-space bounding box
// against the road/sidewalk bands and the coastline.
const _dbg = window as unknown as {
  __scene: THREE.Scene; __cam: THREE.Camera; __THREE: typeof THREE; __renderer: THREE.WebGLRenderer;
  __edibles: Edible[]; __insideIsland3: (x: number, z: number) => boolean; __validateWorld: () => void;
  __news: () => void;
  __voidState: () => { x: number; z: number; r: number };
  __biomeAt: (x: number, z: number) => string | null;
  __rushClock: (to: number) => void;
  // QA: whole-match telemetry — player score/radius against every rival's, so a
  // harness can log the real race curve instead of scraping the HUD.
  __matchState: () => { t: number; clock: number; score: number; r: number; ev: typeof rivalEv;
    ate: { you: number; family: number };
    rivals: { name: string; score: number; r: number; x: number; z: number; joined: boolean; arch: string; hunt: boolean }[] };
};
// QA counters: what the family actually DID to the player over a match
const rivalEv = { bites: 0, hunterBites: 0, stolen: 0, charges: 0, nearMiss: 0, eaten: 0, marquee: 0 };
_dbg.__scene = scene; _dbg.__cam = camera; _dbg.__THREE = THREE; _dbg.__renderer = renderer;
_dbg.__edibles = edibles; _dbg.__insideIsland3 = insideIsland3; _dbg.__validateWorld = () => validateWorld();
_dbg.__news = () => showNews();   // QA: fire a headline on demand (audits the live templates)
_dbg.__voidState = () => ({ x: voidState.x, z: voidState.z, r: voidling.radius });   // QA: containment tests
_dbg.__biomeAt = (x: number, z: number) => island.biomeAt(x, z);   // QA: district centroid sweeps
// QA: wind the match clock forward so a harness can photograph the results
// screen without simulating three real minutes of software rendering
_dbg.__rushClock = (to: number) => { matchClock = to; };
// QA: one call returns the whole race — used to log score curves over a match
_dbg.__matchState = () => ({
  t: started ? tClock - startT : 0, clock: matchClock, score: playerScore, r: voidling.radius, ev: rivalEv,
  ate: { you: devPlayerPct, family: devFamilyPct },
  rivals: rivals.list.map((r) => ({ name: r.name, score: r.score, r: r.r, x: r.x, z: r.z,
    joined: !!r.joined, arch: r.arch ?? '', hunt: !!r.hunting,
    lane: r.lane ?? -1, dry: Math.round((r.dry ?? 0) * 10) / 10, full: !!r.full })),
});
// build stamp: tiny, menu-only — every screenshot identifies its build
{
  const bs = document.createElement('div');
  // a missing `define` would take out every statement after this line — the
  // input handlers, the PLAY listener, beginMatch, the lot — and do it
  // silently. A build stamp is not worth that risk.
  bs.textContent = `v ${typeof __BUILD__ === 'undefined' ? 'dev' : __BUILD__}`;
  bs.style.cssText = 'position:fixed;right:8px;bottom:4px;z-index:11;font-size:9px;font-weight:700;letter-spacing:1px;color:rgba(203,178,255,0.5);pointer-events:none;';
  document.body.appendChild(bs);
  // …and NOT on the shop or the worlds screen. body.menu is still set inside
  // those overlays, so a build stamp shipped on two player-facing screens.
  const OVERLAYS = ['worlds', 'shop', 'daily', 'tut', 'settings', 'trophies', 'skinPrev'];
  const vis = () => {
    const overlaid = OVERLAYS.some((id) => document.getElementById(id)?.classList.contains('show'));
    bs.style.display = document.body.classList.contains('menu') && !overlaid ? 'block' : 'none';
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
// 3-5 family members per match, randomly cast — you never know who's coming
const rivals = createRivals(scene, camera, edibles, island.biomeAt, 3 + Math.floor(Math.random() * 3));
const minimap = createMinimap(islandOutline3());
const fx = createFx(scene);
const FAMILY_TITLE: Record<string, string> = {
  WOBBLES: 'Cousin', GLITZ: 'Uncle', BITSY: 'Baby', CHOMPZILLA: 'Auntie', DOZER: 'Grandpa',
};
// each family member's ARCHETYPE, named on arrival — a kid should be told what
// to watch for once, then be able to read it off the screen forever after
const ARCH_TAG: Record<string, string> = {
  BULLY: '😈 she HUNTS you', COWARD: '😱 runs from everything',
  SHOWOFF: '✨ only eats big stuff', COPYCAT: '👣 copies your route',
  // …no longer "camps one spot": the camp was deleted when it turned out to be
  // what was pinning him (rivals.ts records the five attempts). A join banner
  // that teaches a behaviour the code does not implement is worse than no
  // banner — the child watches for it and it never happens.
  HOARDER: '😴 slow and steady',
};
rivals.onJoin = (name, color, x, z, arch) => {
  announceFam(`🌀 ${FAMILY_TITLE[name] ?? 'Cousin'} ${name} joined — ${ARCH_TAG[arch] ?? ''}`);
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
  announceFam(marquee
    ? `🏆 you ATE THE HUNTER! ${name} is DINNER! +${pts}`
    : `🍽️ you DEVOURED ${FAMILY_TITLE[name] ?? ''} ${name}! +${pts}`);
  if (marquee) { breakingNews('one hole has eaten the other. there is one left. it is bigger.'); addCoins(35); }
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
  bubbles.float(floatPos, hit.hunter ? 'CAUGHT!! 😱' : 'OW!! 😱', true);
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
  announceFam(`🍖 ${name} is TOO FULL to chase — EAT HER!`);
  breakingNews('the second hole has stopped moving. it looks full. it looks slow.');
  audio.ready();
};
const audio = createAudio();
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
const puffPoints = new THREE.Points(puffGeo, new THREE.PointsMaterial({ color: 0x9a6ae0, size: 2.1, map: puffTex, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false }));
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
const FIND_RING_PX = 26;            // ring radius in screen pixels, minimum
const findRingMat = new THREE.MeshBasicMaterial({
  color: 0x7ef2a0, transparent: true, opacity: 0, depthWrite: false,
  blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
const findRing = new THREE.Mesh(new THREE.RingGeometry(0.80, 1.0, 48), findRingMat);
findRing.rotation.x = -Math.PI / 2;
findRing.frustumCulled = false;
findRing.renderOrder = 2;
scene.add(findRing);
function updateFindRing(t: number, since: number): void {
  // fades out over 3s once either the grace window closes or the void is
  // plainly large enough to see
  const wanted = since < 18 && voidling.radius < 2.6;
  const target = wanted ? 1 : 0;
  findRingK += (target - findRingK) * (1 - Math.exp(-3.2 * Math.max(0.001, t - findRingLast)));
  findRingLast = t;
  if (findRingK < 0.01) { findRing.visible = false; return; }
  findRing.visible = true;
  // world units per screen pixel at the void's depth
  const wpp = (2 * camDist * Math.tan((camera.fov * Math.PI / 180) / 2)) / Math.max(1, window.innerHeight);
  const pulse = 1 + Math.sin(t * 4.2) * 0.09;
  const r = Math.max(voidling.radius * 1.75, FIND_RING_PX * wpp) * pulse;
  findRing.scale.setScalar(r);
  findRing.position.set(voidState.x, 0.08, voidState.z);
  findRingMat.opacity = findRingK * (0.42 + Math.sin(t * 4.2) * 0.16);
}
let findRingK = 0, findRingLast = 0;
const puffVel: THREE.Vector3[] = []; const puffLife: number[] = [];
for (let i = 0; i < PUFF; i++) { puffVel.push(new THREE.Vector3()); puffLife.push(0); puffPos[i * 3 + 1] = -999; }
let puffHead = 0;
function spawnPuff(x: number, y: number, z: number, n: number) {
  for (let k = 0; k < n; k++) {
    const i = puffHead; puffHead = (puffHead + 1) % PUFF;
    puffPos[i * 3] = x; puffPos[i * 3 + 1] = y; puffPos[i * 3 + 2] = z;
    const a = Math.random() * Math.PI * 2, up = rand(2, 8);
    puffVel[i].set(Math.cos(a) * rand(3, 9), up, Math.sin(a) * rand(3, 9));
    puffLife[i] = rand(0.35, 0.7);
  }
}

// ── input: relative drag joystick (hole.io style) + WASD/arrows ───────────────
const joyEl = document.getElementById('joy')!, joyNubEl = document.getElementById('joyNub')!;
const joy = { active: false, id: -1, ax: 0, ay: 0, dx: 0, dy: 0, mag: 0 };
const JOY_R = 64;
let lastInput = -9999, tClock = 0;
function joySet(ev: PointerEvent) {
  // RE-ANCHOR (hole.io convention) with an OVERSHOOT ZONE: the base only
  // chases the finger once it's pulled well past the ring (1.7×). The old
  // tight follow parked the rim exactly under the thumb, so every micro-
  // wiggle dipped below full deflection — speed stuttered and steering felt
  // like it "needed progressively more movement". Now the thumb rests
  // comfortably past the rim at full speed; big pulls and direction flips
  // still drag the base along, so a flip never needs a 2-ring swipe back.
  const FOLLOW = JOY_R * 1.7;
  const m0 = Math.hypot(ev.clientX - joy.ax, ev.clientY - joy.ay);
  if (m0 > FOLLOW) {
    const g = 1 - FOLLOW / m0;
    joy.ax += (ev.clientX - joy.ax) * g; joy.ay += (ev.clientY - joy.ay) * g;
    joyEl.style.left = `${joy.ax}px`; joyEl.style.top = `${joy.ay}px`;
  }
  const dx = ev.clientX - joy.ax, dy = ev.clientY - joy.ay;
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
  joy.dx = dx * inv; joy.dy = dy * inv; joy.mag = Math.min(1, m / JOY_R);
  joyNubEl.style.left = `${joy.ax + dx * k}px`; joyNubEl.style.top = `${joy.ay + dy * k}px`;
  lastInput = tClock;
}
renderer.domElement.style.touchAction = 'none';   // stop iOS turning a fast drag into a browser gesture (pointercancel mid-steer)
renderer.domElement.addEventListener('pointerdown', (e) => {
  if (joy.active) return;   // a second finger/palm must NEVER steal the anchor mid-drive
  joy.active = true; joy.id = e.pointerId; joy.ax = e.clientX; joy.ay = e.clientY;
  try { renderer.domElement.setPointerCapture(e.pointerId); } catch { /* not supported */ }
  joyEl.style.display = joyNubEl.style.display = 'block';
  joyEl.style.left = `${e.clientX}px`; joyEl.style.top = `${e.clientY}px`;
  joySet(e);
});
window.addEventListener('pointermove', (e) => { if (joy.active && e.pointerId === joy.id) joySet(e); });
const joyEnd = (e: PointerEvent) => {
  if (joy.active && e.pointerId === joy.id) { joy.active = false; joy.mag = 0; joy.dx = joy.dy = 0; joyEl.style.display = joyNubEl.style.display = 'none'; }
};
window.addEventListener('pointerup', joyEnd);
window.addEventListener('pointercancel', joyEnd);

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
const timerEl = el('timer'), devEl = el('devoured'), boardEl = el('board'), formEl = el('form');
const _chipV = new THREE.Vector3();
const hungerLbl = el('hungerlbl');
const evolveEl = el('evolve'), endEl = el('end'), endHd = el('endHd'), endSub = el('endSub'), endList = el('endList');
const bannerEl = el('banner'), hungerEl = el('hunger'), hungerFill = hungerEl.querySelector('.fill') as HTMLElement;
const formFill = el('formbar').querySelector('.fill') as HTMLElement;
const scFill = () => document.getElementById('scFill');
let prevHunger = 0;

function announceFam(text: string) {
  bannerEl.classList.add('fam');
  announce(text);
  setTimeout(() => bannerEl.classList.remove('fam'), 2300);
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
const bannerQ: string[] = [];
function announce(text: string) {
  if (tClock < bannerFree) {
    // never let a backlog build: the newest message is the relevant one
    bannerQ.length = 0; bannerQ.push(text);
    return;
  }
  bannerEl.textContent = text;
  bannerEl.classList.remove('show'); void bannerEl.offsetWidth; bannerEl.classList.add('show');
}
/** the evolve card is playing — hold the banner until it has finished */
function holdBanner(sec: number) { bannerFree = Math.max(bannerFree, tClock + sec); }
function pumpBanner() {
  if (tClock < bannerFree || !bannerQ.length) return;
  const t = bannerQ.shift()!;
  bannerEl.textContent = t;
  bannerEl.classList.remove('show'); void bannerEl.offsetWidth; bannerEl.classList.add('show');
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
const FORMS = ['VOIDLING', 'MUNCHER', 'GOBBLER', 'DEVOURER', 'COLOSSUS', 'WORLD ENDER'];
// 2D thresholds 18/32/50/78/110 world-px, mapped through the 0.05 world scale
const FORM_MIN = [0, 1.6, 2.5, 3.6, 5.5, 8.0];
// the void renderer and the soundtrack both ship five visual tiers. COLOSSUS
// wears DEVOURER's dressing — it IS a huge devourer — so the top tier stays
// unique to WORLD ENDER and arriving there looks like something.
const VISUAL_STAGE = [0, 1, 2, 3, 3, 4];
const stageFor = (r: number) => { let s = 0; for (let i = 0; i < FORM_MIN.length; i++) if (r >= FORM_MIN[i]) s = i; return s; };
const PLAYER_COLOR = 0x9a5cff;

// ── scale/eat/growth — the 2D game's exact model, through the 0.05 map scale ─
// Start r=0.9 (2D: 18). Eat if voidR >= targetR·0.9. Growth is area-based with
// the 2D's diminishing factor sqrt(startR/R) and rookie surge — AND the 2D
// GROWTH LAW: radius can never exceed startR + rate·seconds. That law is the
// real pacing: no ballooning off one item, the whole match is a steady climb.
const START_R = 0.9;
export const EAT_RATIO = 1.11;         // eat if target.radius <= R*1.11  (voidR >= targetR*0.9)
const R_CAP = 12;                       // 2D MAX_RADIUS 240 · 0.05
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
function addCoins(n: number) {
  coins += n;
  localStorage.setItem('voidCoins', String(coins));
  coinEl.textContent = `✦ ${coins}`;
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
  { id: 'houses', icon: '🏠', label: 'Home Wrecker: eat 3 houses', target: 3, reward: 25, kind: 'house' },
  // PER-WORLD. Houses only exist in Maple's cozy/fancy biomes and Pirate Bay's
  // entire car population is seven shuttle buggies, so a board drawn as
  // "6 cars / combo / 3 houses" — which is what today drew — was impossible on
  // the flagship world. Measured: Maple cleared 3/3 and 2/3, Pirate 1/3, 1/3, 0/3.
  { id: 'cabanas', icon: '⛱️', label: 'Beach Party: eat 4 cabanas', target: 4, reward: 25, kind: 'cabana' },
  { id: 'gold', icon: '✦', label: 'Treasure Hunter: find 4 golden things', target: 4, reward: 25, kind: 'gild' },
  { id: 'rival', icon: '😈', label: 'Void Eats Void: devour a rival', target: 1, reward: 30, kind: 'rival' },
  { id: 'big', icon: '🏨', label: 'Big Fish: eat 3 LANDMARK buildings', target: 3, reward: 25, kind: 'big' },
];
// EASY and MED both contained 'cars' and 'combo', so roughly one day in seven
// drew the SAME chip twice. Disjoint now, and the hard slot is world-aware.
const EASY_Q = ['snack', 'gold', 'combo'];
const MED_Q = pickedWorld === 'pirate' ? ['cabanas', 'evolve', 'gold'] : ['cars', 'evolve', 'combo'];
const HARD_Q = pickedWorld === 'pirate' ? ['cabanas', 'rival', 'big'] : ['houses', 'rival', 'big'];   // easy rotates daily; 'solo' retired with the menu button
const quests: Quest[] = (() => {
  const today = new Date().toDateString();
  // uint32 hash (imul + >>>0). The old float reduce blew past 2^53, and the
  // >> coercion could go NEGATIVE — array[-1] = undefined = a day where every
  // kid's quest chips read "undefined 0/undefined" (first hit: Jul 26 2026)
  let daySeed = 7;
  for (const c of today) daySeed = (Math.imul(daySeed, 31) + c.charCodeAt(0)) >>> 0;
  const ids = [EASY_Q[daySeed % EASY_Q.length], MED_Q[(daySeed >>> 2) % MED_Q.length], HARD_Q[(daySeed >>> 4) % HARD_Q.length]];   // independent indices — the same seed produced only 3 boards ever
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
const MAPLE_BEATS = [
  { at: 32, dur: 15, mult: 2, fired: false, col: 0xffd23f, flash: 'rgba(255,210,90,0.3)',
    banner: '🥧 BAKE SALE RUSH! everything is DOUBLE!', news: 'PEARL opens the bake sale. rival pies appear instantly' },
  { at: 95, dur: 18, mult: 2, fired: false, col: 0xff5d7e, flash: 'rgba(255,93,126,0.28)',
    banner: '📣 RECALL VOTE! the whole town is OUT!', news: 'RECALL VOTE called. DINKLE calls it a scheduling matter' },
  { at: 150, dur: 30, mult: 3, fired: false, col: 0xb875ff, flash: 'rgba(184,117,255,0.32)',
    banner: '🗳️ THE LANDSLIDE! everything is TRIPLE!', news: 'THE COUNT BEGINS. turnout is described as "total"' },
];
// PIRATE BAY runs the same three-beat spine, themed to the resort
const PIRATE_BEATS: typeof MAPLE_BEATS = [
  { at: 32, dur: 15, mult: 2, fired: false, col: 0x7bffe8, flash: 'rgba(123,255,232,0.28)',
    banner: '🍹 HAPPY HOUR! everything is worth DOUBLE!', news: 'HAPPY HOUR declared. bar is delighted' },
  { at: 95, dur: 18, mult: 2, fired: false, col: 0xff2fa0, flash: 'rgba(255,47,160,0.28)',
    banner: '🪩 DANCE PARTY! the whole bay is MOVING!', news: 'DJ Coconut drops the big one. floor shakes' },
  { at: 150, dur: 30, mult: 3, fired: false, col: 0xffd23f, flash: 'rgba(255,210,90,0.32)',
    banner: '🏴‍☠️ TREASURE FEAST! everything is TRIPLE!', news: 'TREASURE FEAST! grab a doubloon and a fork' },
];
const BEATS = pickedWorld === 'pirate' ? PIRATE_BEATS : MAPLE_BEATS;
const MEAL_NAME: Record<string, string> = {
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
    if (e.radius > 2.2) return 'a truck, in motion';
    if (e.radius > 1.1) return 'a guest. mid-sentence.';
    return 'a very small dog';
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
};
// TEMPLATED headlines: a tiny pool × live variables = copy that never repeats
// AND is always about the player. This is what killed the "generic ticker"
// feel — every one of these is a mirror of the run in progress.
// THE MAYOR — one recurring character running a denial-to-collapse arc
// across the match. A running joke beats 54 unrelated one-liners.
const newsEl = el('news');
let devouredPct = 0, newsCd = 14;
// QA: the you-vs-family split of what the island has lost, so a harness can
// check the family is not simply eating the player's food out from under them
let devPlayerPct = 0, devFamilyPct = 0;
// reactive one-shots: big beats the player just caused jump the queue
const newsQueue: string[] = [];
function breakingNews(h: string) {
  if (newsQueue.length > 1) return;   // never stack a queue of cards at the player
  newsQueue.push(h); newsCd = Math.min(newsCd, 2.5);
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
  // from "there is no hole" to "goodbye forever" before the player had eaten a
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
  if (PB) {
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
    // MAPLE FALLS runs its own newsroom too: 449 headlines across nine
    // districts plus 242 spoken lines, built around a mayoral election nobody
    // asked for. Mayor Dinkle is denying the void exists, his challenger's
    // entire platform is that it's Dinkle's fault, and Marge has been
    // protesting the same parking meter for nine years.
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
let lastRankBrag = -99;
let stallT = 0;     // seconds spent driving into something that will not move
let prevRank = 0;   // 0 = unset; rank-change drama needs a baseline first
function refreshHud() {
  const R = voidling.radius;
  // leaderboard: player + rivals, ranked by score
  // the hunter is FLAGGED on the board: when a name has a 😈 next to it, that
  // is the one on the island that can eat you right now
  const rows = [{ name: 'You', color: PLAYER_COLOR, score: playerScore, me: true },
    ...rivals.list.map((r) => ({ name: r.hunting ? `😈 ${r.name}` : r.name, color: r.color, score: r.score, me: false }))]
    .sort((a, b) => b.score - a.score);
  // overtaking is DRAMA — celebrate every rank gained (hole.io's rank swings)
  const myRank = rows.findIndex((r) => r.me) + 1;
  // …and the SAME cooldown as its mirror branch below, which had one all along.
  // Without it, a player whose score sits inside a rival's band flip-flops and
  // fires the identical brag twice within a second.
  if (started && !ended && prevRank > 0 && myRank < prevRank && tClock - lastRankBrag > 12) {
    lastRankBrag = tClock;
    // the board prefixes the hunter with 😈; the sentence should not
    announce(`👑 you passed ${(rows[myRank]?.name ?? 'a rival').replace('😈 ', '')}!`);
    audio.ready(); buzz(20);
  }
  // refreshHud runs 5x/s and rank oscillates, so this fired 18 times in one
  // measured match — the banner channel that should carry HAPPY HOUR was
  // mostly carrying rank noise. One brag per rival per 12 seconds.
  if (started && !ended && prevRank > 0 && myRank > prevRank && tClock - lastRankBrag > 12) {
    lastRankBrag = tClock;
    // a rival just passed YOU — they get to brag about it
    const passer = rows[myRank - 2];
    // …the board prefixes the hunter's row with 😈, so match on the bare name
    const rv = passer && !passer.me ? rivals.list.find((r) => passer.name.endsWith(r.name)) : undefined;
    if (rv && RIVAL_VOICE[rv.name]) {
      bubbles.say(rivalBubblePos.set(rv.x, 5, rv.z), RIVAL_VOICE[rv.name].rankUp[Math.floor(Math.random() * 3)], 'event');
      rv.pulse = 1;
    }
  }
  prevRank = myRank;
  const shown = rows.filter((r, i) => i < 3 || r.me);   // compact: podium + you
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
  if (devouredPct >= 50 && !moments.half && started && !ended) { moments.half = true; announce('🍽️ HALF the island. gone.'); }
  // A LINEAR PERCENTAGE OVER 3,286 PROPS IS A METER THAT SAYS ZERO. One percent
  // costs 33 props, so a child who has eaten two hundred things reads "6%", and
  // for the whole first half-minute the biggest number on their screen is 0.
  // Every playtest screenshot showed 0% — including the results panel of a
  // 948-point run. Lead with the COUNT, which is a number that moves on every
  // single bite, and keep the percentage as the meter underneath it.
  const minePct = Math.min(100, Math.round((mine / Math.max(1, initialMass)) * 100));
  devPlayerPct = minePct; devFamilyPct = Math.max(0, devouredPct - minePct);   // QA readout
  const themPct = Math.max(0, devouredPct - minePct);
  // ONE LINE. The "you 1% · family 3%" sub-line was a second HUD block under
  // the timer that a child cannot act on mid-match — it is a post-match stat,
  // and it is on the results screen. Dropping it removes a whole layer from
  // the busiest part of the screen and lets the news card move up.
  void themPct;
  devEl.innerHTML = `${matchEaten} EATEN`;
  formEl.innerHTML = `${FORMS[curStage]} · ${Math.round(R * 1.6)}m<div class="scBar"><div id="scFill"></div></div>`;
}

// rank ladder (hole.io placement points: 20/10/5/2/1) + daily streak
let xp = Number(localStorage.getItem('voidXP') || 0);
let streak = Number(localStorage.getItem('voidStreak') || 0);
// per-level XP spans: the first levels pop in 1-2 matches, MASTER is a season
const XP_SPANS = [20, 30, 40, 50, 60, 75, 90, 105, 120, 140, 160, 190, 220, 250, 300, 400];
const PRICES: Record<string, number> = {
  classic: 0, galaxy: 150, wizard: 150, sunset: 250, toxic: 250, ocean: 400,
  nebula: 600, magma: 600, candy: 600, aurora: 750,
  honey: 750, glacier: 750, sherbet: 900, cyber: 900, blossom: 900, royal: 1500,
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
function rankInfo(x: number) {
  let lvl = 1, rem = x, span = XP_SPANS[0];
  for (const sp of XP_SPANS) {
    if (rem < sp || lvl >= 17) { span = sp; break; }
    rem -= sp; lvl++; span = sp;
  }
  lvl = Math.min(17, lvl);
  const t = lvl >= 15 ? ['👑', 'MASTER'] : lvl >= 12 ? ['💎', 'DIAMOND'] : lvl >= 9 ? ['💠', 'PLATINUM']
    : lvl >= 6 ? ['🥇', 'GOLD'] : lvl >= 3 ? ['🥈', 'SILVER'] : ['🥉', 'BRONZE'];
  return { lvl, ic: t[0], nm: t[1], prog: lvl >= 17 ? 1 : Math.min(1, rem / span) };
}
function renderRank() {
  const r = rankInfo(xp);
  const st = streak >= 2 ? ` · 🔥${streak}` : '';
  el('rankChip').innerHTML = `${r.ic} ${r.nm} · LVL ${r.lvl}${st}<div class="rkBar"><div style="width:${Math.round(r.prog * 100)}%"></div></div>`;
}
function bumpStreak() {
  const today = new Date().toDateString();
  const last = localStorage.getItem('voidLastDay');
  if (last === today) return;
  const yd = new Date(Date.now() - 86400000).toDateString();
  streak = last === yd ? streak + 1 : 1;
  localStorage.setItem('voidStreak', String(streak));
  localStorage.setItem('voidLastDay', today);
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
  const rows = [{ name: 'You', color: PLAYER_COLOR, score: playerScore, me: true },
    ...rivals.list.map((r) => ({ name: r.name, color: r.color, score: r.score, me: false }))]
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
  const WIN_TITLES = ['ISLAND: DELICIOUS', 'YOU ATE. YOU WON.', 'BURP OF CHAMPIONS', 'VOID SWEET VOID', 'CHOMPION OF THE ISLE'];
  const LOSE_TITLES = ['STILL PECKISH…', 'OUT-NOMMED!', 'SO CLOSE TO DELICIOUS', 'THE ISLAND SURVIVED. RUDE.', 'SNACK-SIZED THIS TIME'];
  endHd.textContent = myRank === 1 ? WIN_TITLES[Math.floor(Math.random() * WIN_TITLES.length)]
    : `#${myRank} · ${LOSE_TITLES[Math.floor(Math.random() * LOSE_TITLES.length)]}`;
  celebrateEnd(reward, gain, myRank === 1 ? 'the island belongs to the void' : `${rows[0].name} devoured the most`, myRank === 1);
  // THE RUN'S OWN NUMBERS. % DEVOURED was shown in Solo and nowhere else — the
  // figure a child watched climb for three minutes simply vanished at the
  // whistle — and nothing on the screen compared this run to their best.
  {
    const pb = Number(localStorage.getItem('voidBestScore') || 0);
    const isPb = Math.round(playerScore) > pb;
    if (isPb) localStorage.setItem('voidBestScore', String(Math.round(playerScore)));
    const st = el('endStats');
    st.innerHTML =
      `<div class="es"><i>DEVOURED</i><b>${devouredPct}%</b></div>` +
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
  e.orbitR = Math.min(Math.max(voidling.radius * 0.6, d), voidling.radius * 0.9);   // spiral stays INSIDE the rim
  e.mesh.userData.eaten = true;
  // topple toward the hole (the hole.io fantasy): the tip axis is perpendicular
  // to the pull direction, so things visibly keel over INTO the void
  e.spin.set((dz / d) * rand(4.5, 7.5), rand(-1.5, 1.5), (-dx / d) * rand(4.5, 7.5));
  voidling.setRadius(growRadius(voidling.radius, e.radius));   // area-based growth
  combo++; comboT = 1.6;
  if (combo > (stats.combo ?? 0)) { stats.combo = combo; saveStats(); }
  const comboMult = 1 + Math.min(combo, 25) * 0.1;             // 2D: 1 + min(combo,25)·0.1
  // moving prey (people/animals/cars — tagged ptsMult 1.5) beats furniture of
  // the same size: chasing pays. Everything else stays radius-proportional.
  const preyMult = (e.mesh.userData.ptsMult as number | undefined) ?? 1;
  const pts = Math.max(1, Math.round(e.radius * 12 * comboMult * preyMult * feverMult));
  playerScore += pts;
  // remember the last meal so the news can report on it BY NAME
  lastMeal = MEAL_NAME[(e.mesh.userData.qk as string) ?? ''] ?? mealOf(e);
  if (giveHunger) hunger = Math.min(1, hunger + 0.03);
  spawnPuff(e.mesh.position.x, voidling.group.position.y, e.mesh.position.z, 3);
  // a building-sized bite lands with a ground shockwave + dust — seismic,
  // but deliberately NO camera shake (kids found the shake unpleasant)
  if (e.radius > 2) {
    audio.voice('yum');
    fx.ring(e.mesh.position.x, e.mesh.position.z, 0xb875ff, e.radius * 3, 0.45);
    spawnPuff(e.mesh.position.x, 0.5, e.mesh.position.z, e.radius > 4 ? 10 : 6);
  }
  voidling.chomp();
  stats.eaten++; matchEaten++;
  // the very first thing a brand-new player ever eats gets a PARTY — the
  // guaranteed wow inside the first 30 seconds
  if (!localStorage.getItem('voidFirstNom')) {
    localStorage.setItem('voidFirstNom', '1');
    bubbles.float(floatPos.set(e.mesh.position.x, voidling.radius + 3, e.mesh.position.z), 'FIRST NOM! 🎉', true);
    fx.ring(e.mesh.position.x, e.mesh.position.z, 0xffd23f, 7, 0.6);
    audio.ready(); buzz(25);
  }
  if (guideStep === 1 && stats.eaten > 2 && tClock > 4) { guideStep = 2; showGuide('eat everything <b>smaller than you</b> — grow!', 6); }
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
  } else { audio.pop(combo, voidling.radius); buzz(e.radius > 2 ? 15 : 8); }
  if (combo > 0 && combo % 5 === 0) bubbles.float(floatPos, `COMBO ×${comboMult.toFixed(1)}`, true);
  // quest + milestone hooks (tagged at spawn: qk = 'car' | 'house' | 'big')
  e.mesh.userData.byPlayer = true;   // the DEVOURED meter is split you-vs-family
  const qk = e.mesh.userData.qk as string | undefined;
  if (e.radius < 1) questEvent('snack');
  if (e.radius >= 6) questEvent('big');   // landmark-class: hotels, ships, the temple, the stage
  if (e.mesh.userData.gild) questEvent('gild');
  if (e.radius >= 2.6 && e.radius <= 3.4) questEvent('cabana');
  if (qk) questEvent(qk);
  if (comboMult >= 2) questEvent('combo');
  if (qk === 'house' && !moments.firstBuilding) { moments.firstBuilding = true; announce('🏠 FIRST BUILDING! crunch.'); breakingNews('it ate a house. a WHOLE house. we have questions.'); }
  if (qk === 'car' && !moments.firstCar) { moments.firstCar = true; announce('🚗 first car! tastes like vroom'); }
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
const guideEl = () => el('guide');
function showGuide(text: string, dur = 5) {
  const g = guideEl();
  g.innerHTML = text;
  g.classList.add('show');
  guideT = dur;
}
let _revalQueue: number[] = [];
function beginMatch(solo = false) {
  validateWorld();   // covers late async-registered GLB props on every start
  // gild HERE, not at the world-ready hook: there are several entry points
  // into a match (menu PLAY, solo, the debug autostart) and only one of them
  // went through that hook, so most matches shipped with no treasure at all
  gildTreasure();
  for (const bt of BEATS) bt.fired = false;
  feverMult = 1; feverT = 0; lastR = voidling.radius; matchEaten = 0; signedOn = false;
  // GLBs stream in for a while after start — re-sweep twice so props that
  // finished loading (and finally have real footprints) also get validated
  _revalQueue = [tClock + 8, tClock + 22];
  bakeContactShadows();   // and again on each re-sweep, for late GLB arrivals
  soloMode = solo;
  matchLen = solo ? 120 : MATCH_LEN;
  matchClock = matchLen;
  started = true; startT = tClock;
  resetFps();
  setCtx('world', pickedWorld);
  setCtx('skin', localStorage.getItem('voidSkin') || 'classic');
  track('match_start', {
    solo, lvl: rankInfo(xp).lvl, coins, played: stats.matches,
    skins: (JSON.parse(localStorage.getItem('voidSkinsOwned') || '[]') as string[]).length,
    first: !localStorage.getItem('voidPlayed'),
  });
  document.body.classList.remove('menu');
  menuEl.style.display = 'none';
  boardEl.style.display = solo ? 'none' : '';
  el('titlecard').classList.add('show');
  titleUntil = tClock + 4.6;
  audio.startMusic(); audio.setMusicStage(0);
  introT = 2.2;   // orbital reveal: the whole island, then dive to the tiny void
  if (!localStorage.getItem('voidPlayed')) { guideStep = 1; showGuide('<b>DRAG</b> anywhere to move!', 6); }
}
// ── asset preloader: menu time is download time; PLAY holds on a branded
// loading bar until every pack mesh is resident, so a match never starts
// with stand-in geometry visible (hole.io's load-then-play flow)
let packReady = false;
const preloadP = preloadPack((done, total) => {
  const pct = Math.round((done / total) * 100);
  el('lBar').style.width = pct + '%';
  el('lPct').textContent = pct + '%';
}).then(() => { packReady = true; });
const LOAD_TIPS = [
  'tip: eat the little stuff first — cones, hydrants, mailboxes',
  'tip: cars count as people-sized once you evolve',
  'tip: get CLOSE — small stuff gets sucked right in',
  'tip: rival voids can eat YOU — check the leaderboard sizes',
  'tip: the downtown towers are the biggest meal on the island',
  'tip: play daily — streak skins unlock at 2 and 7 days',
  "tip: parked cars can't run away. just saying.",
  'tip: buildings topple INTO you. very satisfying.',
  'tip: bite fast — combos multiply your points',
  'tip: the beach is full of easy snacks (sorry, towels)',
  'tip: eat a rival and they respawn tiny — and grumpy',
  'tip: the ferris wheel is dessert. save room.',
  'tip: quests pay VOID POINTS — check mid-match',
  'tip: BITSY cries when eaten. worth it.',
];
function withWorldReady(cb: () => void) {
  if (packReady) { cb(); return; }
  const scr = el('loadScr');
  (scr.querySelector('.lTip') as HTMLElement).textContent = LOAD_TIPS[Math.floor(Math.random() * LOAD_TIPS.length)];
  scr.classList.add('show');
  // slow networks still get in: cap the wait, fallbacks cover stragglers
  const waitT0 = performance.now();
  Promise.race([preloadP, new Promise((r) => setTimeout(r, 12000))]).then(() => {
    track('load_wait', { ms: Math.round(performance.now() - waitT0) });
    packReady = true;
    el('lBar').style.width = '100%'; el('lPct').textContent = '100%';
    setTimeout(() => { scr.classList.remove('show'); cb(); }, 300);
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
// …and the picker is what actually starts the match.
function launchWorld() {
  el('worlds').classList.remove('show');
  menuEl.style.display = 'none';
  // one-time teach card before the first menu-launched match: it's the only
  // place the danger loop ("eat the family when bigger, RUN when not") lives
  if (!localStorage.getItem('voidTut')) { track('tutorial_view', {}); tutEl.classList.add('show'); return; }
  withWorldReady(() => startFresh(false));
}
el('btnSolo').addEventListener('click', () => {
  menuEl.style.display = 'none';
  if (!localStorage.getItem('voidTut')) localStorage.setItem('voidTut', '1');
  withWorldReady(() => startFresh(true));
});
el('btnGotIt').addEventListener('click', () => {
  track('tutorial_done', {});
  localStorage.setItem('voidTut', '1');
  tutEl.classList.remove('show');
  withWorldReady(() => startFresh(false));
});
// FIRST LAUNCH: no menu — splash straight into the game with in-game guidance
// (hole.io's onboarding). The menu earns its place from session two.
if (!DEBUG_HARNESS && !TOPDOWN && !ASSETVIEW && !localStorage.getItem('voidPlayed')) {
  menuEl.style.display = 'none';
  withWorldReady(() => beginMatch());
}
/** The card art. This started as the world's real top-down map — accurate, and
 *  the wrong job: a map tells you where things are, a poster tells you why you
 *  want to go. These are hero renders shot in-engine from a low three-quarter
 *  angle with the HUD stripped — the void standing in the suburbs, the void on
 *  the resort boardwalk — so the card is a picture of the fun rather than a
 *  diagram of the terrain, and it is literally the game rather than a promise
 *  the game has to live up to. Vendored locally, so no CDN can take them away. */
const CARD_ART: Record<string, string> = {
  maple: '/assets/card_maple.webp',
  pirate: '/assets/card_pirate.webp',
};
function paintWorldCard(host: HTMLElement, id: string): void {
  const src = CARD_ART[id];
  if (!src) return;
  host.style.backgroundImage = `url('${src}')`;
  host.style.backgroundSize = 'cover';
  host.style.backgroundPosition = 'center 42%';
}
// world cards: MAPLE ISLE + PIRATE BAY are both live now
{
  const chip = el('btnWorlds');
  chip.innerHTML = `<i>${pickedWorld === 'pirate' ? '🏴‍☠️' : '🏝️'}</i> ${WORLD_NAMES[pickedWorld]} <span>WORLD ${pickedWorld === 'pirate' ? 2 : 1} OF 3</span><b>›</b>`;
  document.querySelectorAll('#worldRow .wCard[data-world]').forEach((c) => {
    const id = (c as HTMLElement).dataset.world!;
    const art = c.querySelector('.wArt') as HTMLElement | null;
    if (art) paintWorldCard(art, id);
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
// locked world teasers wiggle on tap
document.querySelectorAll('.wCard.lock').forEach((c) => c.addEventListener('click', () => {
  // demand signal for world 3: a locked card nobody taps is a world nobody wants
  track('world_locked_tap', { card: (c as HTMLElement).dataset.name || c.textContent?.trim().slice(0, 24) });
  c.classList.remove('shake'); void (c as HTMLElement).offsetWidth; c.classList.add('shake');
}));
el('btnWorlds').addEventListener('click', () => el('worlds').classList.add('show'));
// a world switch reloads the page to rebuild the island; pick up where the tap
// left off rather than dumping the player back on the splash they just left
if (localStorage.getItem('voidAutoPlay') === '1') {
  localStorage.removeItem('voidAutoPlay');
  requestAnimationFrame(() => launchWorld());
}
el('btnShop').addEventListener('click', () => { track('shop_view', { coins, from: 'menu' }); shopEl.classList.add('show'); });
el('btnBack').addEventListener('click', () => shopEl.classList.remove('show'));
// ── world integrity: NOTHING stands on asphalt, ever ─────────────────────────
// Footprint-aware post-build sweep. Runs at every match start (so props that
// registered asynchronously from GLB loads are covered too): any prop whose
// real bounding box overlaps a road lane is pushed to the nearest legal spot
// beside the road; if no legal spot exists it is retired from the match.
const ASPHALT_HALF = 2.75;
const _vBox = new THREE.Box3(); const _vSz = new THREE.Vector3();
let _validated = false;   // homes are canonical after the first pass — later passes are cheap re-checks of new props
function validateWorld() {
  let moved = 0;
  const cull: number[] = [];
  for (let i = 0; i < edibles.length; i++) {
    const e = edibles[i];
    const ud = e.mesh.userData;
    if (ud.mover || ud.vChecked) continue;   // movers steer themselves; checked props are settled
    _vBox.setFromObject(e.mesh); _vBox.getSize(_vSz);
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
    const f = house ? 0.85 : ud.building ? 0.45 : 0.7;
    const band = house || parked ? ASPHALT_HALF + 1.4 : ASPHALT_HALF;
    const hx = (Math.min(_vSz.x, 24) / 2) * f, hz = (Math.min(_vSz.z, 24) / 2) * f;
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
    // Pirate Bay Resort has NO ROADS. This sweep was still nudging its props
    // off Maple's road centres — phantom bands at world 2580/4290/6000/7710/
    // 9420 that do not exist on the hooked island — quietly shoving cabanas and
    // market stalls sideways for a grid that isn't there.
    for (const rc of pickedWorld === 'pirate' ? [] : ROAD_CENTERS_3D) {
      if (Math.abs(px - rc) < band + hx) {   // straddles a vertical road lane
        const off = band + hx + 0.4;
        const side = px >= rc ? 1 : -1;
        if (insideIsland3(rc + side * off, pz) && !inLagoon3(rc + side * off, pz)) { px = rc + side * off; dirty = true; }
        else if (insideIsland3(rc - side * off, pz) && !inLagoon3(rc - side * off, pz)) { px = rc - side * off; dirty = true; }
        else { dead = true; break; }
      }
      if (Math.abs(pz - rc) < band + hz) {   // straddles a horizontal road lane
        const off = band + hz + 0.4;
        const side = pz >= rc ? 1 : -1;
        if (insideIsland3(px, rc + side * off) && !inLagoon3(px, rc + side * off)) { pz = rc + side * off; dirty = true; }
        else if (insideIsland3(px, rc - side * off) && !inLagoon3(px, rc - side * off)) { pz = rc - side * off; dirty = true; }
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
  if ((moved || cull.length) && !_validated) console.info(`[world] placement sweep: ${moved} nudged off roads, ${cull.length} retired`);
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
  resetNews(); resetMapleNews(); signedOn = false;   // memory + the sign-on are per-match
  // restore every eaten thing to its remembered home — the island regrows in
  // one frame and the next run starts in under a second
  for (const e of edibles) {
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
  playerScore = 0; hunger = 0; combo = 0; prevRank = 0; chompCd = 0; newsCd = 14;
  for (const k in moments) (moments as Record<string, boolean>)[k] = false;
  renderQuests();
  ended = false;
  sun.color.copy(SUN_DAY); renderer.toneMappingExposure = 1.0; outroT = 0;
  hemi.color.copy(HEMI_DAY); hemi.intensity = 0.5; scene.backgroundIntensity = 0.55; island.setDusk(0); sun.intensity = 1.75;
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
  qBtn.addEventListener('click', () => {
    if (!started) return;
    if (performance.now() - armT > 3000) {
      armT = performance.now();
      qBtn.textContent = 'LEAVE?';
      qBtn.classList.add('arm');
      setTimeout(() => { qBtn.textContent = '⌂'; qBtn.classList.remove('arm'); }, 3000);
      return;
    }
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
  });
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
  { ic: '🚀', nm: 'High Roller', ds: 'score 15,000 in a run', cur: () => stats.best, max: 15000 },
  { ic: '🍽️', nm: 'Glutton', ds: 'eat 500 things', cur: () => stats.eaten, max: 500 },
  { ic: '🌌', nm: 'Bottomless', ds: 'eat 5,000 things', cur: () => stats.eaten, max: 5000 },
  { ic: '😈', nm: 'Void Eats Void', ds: 'devour a family member', cur: () => stats.rivals ?? 0, max: 1 },
  { ic: '🍴', nm: 'Family Feast', ds: 'devour 10 family', cur: () => stats.rivals ?? 0, max: 10 },
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
  const anchor = Math.max(220, stats.best, mine);
  const mul = [1.85, 1.6, 1.38, 1.2, 1.08, 0.86, 0.55];
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
// ── daily login rewards — the agar.io calendar: 7 escalating days, resets
// if you skip a day, shows once per day on the menu
{
  const DAILY = [50, 75, 100, 125, 150, 200, 300];
  const today = new Date().toDateString();
  const last = localStorage.getItem('voidDailyLast');
  if (last !== today && menuEl.style.display !== 'none' && !DEBUG_HARNESS && !TOPDOWN && !ASSETVIEW) {
    const yd = new Date(Date.now() - 86400000).toDateString();
    const day = last === yd ? Math.min(6, Number(localStorage.getItem('voidDailyDay') || 0) + 1) : 0;
    const modal = el('daily');
    // each day is a PRIZE, not a table cell: claimed days stamp a green tick,
    // today's cell is a big bouncing gift, day 7 is the gold treasure chest
    const ICON = ['🪙', '🪙', '💰', '💰', '💎', '💎', '🏆'];
    el('dailyGrid').innerHTML = DAILY.map((amt, i) =>
      `<div class="dCell ${i < day ? 'past' : i === day ? 'now' : ''} ${i === 6 ? 'mega' : ''}">` +
      `<b>DAY ${i + 1}</b><span class="dIcon">${i < day ? '✅' : i === day ? '🎁' : ICON[i]}</span>` +
      `<span class="dAmt">${amt}<i>✦</i></span></div>`).join('');
    el('dailyStreak').textContent = day > 0 ? `🔥 ${day + 1} DAY STREAK!` : 'welcome back!';
    (el('dailyClaim') as HTMLButtonElement).innerHTML = `CLAIM ${DAILY[day]}<i>✦</i>`;
    (el('dailyClaim') as HTMLButtonElement).onclick = () => {
      addCoins(DAILY[day]);
      localStorage.setItem('voidDailyLast', today);
      localStorage.setItem('voidDailyDay', String(day));
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
      setTimeout(() => modal.classList.remove('show'), 750);
    };
    // …and it must be DISMISSIBLE. It fires on menu open, covers the whole
    // screen and intercepts every button behind it — a playtest harness could
    // not reach PLAY at all until it learned to claim first. CLAIM is still the
    // reward, but tapping the backdrop now gets you out.
    modal.onclick = (ev) => { if (ev.target === modal) modal.classList.remove('show'); };
    modal.classList.add('show');
  }
}
// ── SETTINGS: sound + rumble toggles, persisted. A parent (and an App Store
// reviewer) expects to be able to silence a kids' game in one tap.
{
  const panel = el('settings');
  const sndRow = el('setSound'), hapRow = el('setHaptics');
  const paint = () => {
    const sOff = audio.isMuted();
    sndRow.classList.toggle('off', sOff);
    sndRow.querySelector('b')!.textContent = sOff ? 'OFF' : 'ON';
    hapRow.classList.toggle('off', !hapticsOn);
    hapRow.querySelector('b')!.textContent = hapticsOn ? 'ON' : 'OFF';
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
}
// EXPLICIT debug params only skip the menu — arbitrary query strings on shared
// links (?utm_source=…) must land on the real splash like any player
if (DEBUG_HARNESS || TOPDOWN || ASSETVIEW) { localStorage.setItem('voidTut', '1'); beginMatch(); }

// skin SHOP — earn coins in matches, spend them on skins (LoL soft-currency
// model, same as the 2D shop); owned + equipped persist across sessions
{
  const grid = el('shopGrid');
  const owned = new Set<string>(JSON.parse(localStorage.getItem('voidSkinsOwned') || '["classic"]'));
  let equipped = localStorage.getItem('voidSkin') || 'classic';
  if (!owned.has(equipped)) equipped = 'classic';
  const cards = new Map<string, HTMLElement>();
  const refresh = () => {
    for (const s of SKINS) {
      // streak skins unlock themselves the moment the streak is long enough
      if (s.streak && streak >= s.streak && !owned.has(s.id)) {
        owned.add(s.id);
        localStorage.setItem('voidSkinsOwned', JSON.stringify([...owned]));
      }
      const card = cards.get(s.id)!;
      const pr = card.querySelector('.pr') as HTMLElement;
      card.classList.toggle('equip', equipped === s.id);
      card.classList.toggle('locked', !owned.has(s.id));
      pr.className = 'pr' + (owned.has(s.id) ? ' owned' : '');
      pr.textContent = equipped === s.id ? 'EQUIPPED' : owned.has(s.id) ? 'OWNED'
        : s.cash ? `💎 ${iapPrice(s.id) ?? `$${s.cash.toFixed(2)}`}`
        : s.streak ? `🔥 ${s.streak}-DAY STREAK` : `✦ ${PRICES[s.id]}`;
    }
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
  const tierOf = (s: Skin) => (s.cash ? 2 : s.tex ? 1 : 0);
  const SORTED = [...SKINS].sort((a, b) => tierOf(a) - tierOf(b));
  const TIER_HEAD = [
    '<div class="shopTier">🎨 EVERYDAY <span>SPEND ✦ COINS</span></div>',
    '<div class="shopTier">💫 EPIC <span>SPEND ✦ COINS</span></div>',
    `<div class="shopTier gold">✨ LEGENDARY <span>${iapAvailable() ? 'REAL MONEY' : 'ON THE APP STORE'}</span></div>`,
  ];
  // the skin's own gradient always sits UNDER the AI art — a failed CDN load
  // still shows a branded colored orb, never a bare black hole on a $4.99 card
  // INSIDE OUT. This ran rim -> mid -> abyss from the centre outward, which is
  // the exact opposite of the void shader (palette.ts: "darkest dead-centre,
  // lit violet at the rim"). So whenever the CDN art is slow or offline — the
  // very case this fallback exists for — the shop card advertised a purple ball
  // with an orange highlight and the match handed over a black orb in a halo.
  const skinGrad = (s: Skin) => `radial-gradient(circle at 50% 46%, #${s.abyss.toString(16).padStart(6, '0')} 0%, #${s.mid.toString(16).padStart(6, '0')} 58%, #${s.rim.toString(16).padStart(6, '0')} 100%)`;
  const orbStyle = (s: Skin) => s.cash
    ? `background: ${skinGrad(s)}; box-shadow: 0 8px 18px rgba(0,0,0,0.45), 0 0 18px rgba(255,210,90,0.3);`
    : s.tex
      ? `background: ${skinGrad(s)}; box-shadow: inset 0 -14px 26px rgba(0,0,0,0.55), 0 8px 18px rgba(0,0,0,0.45);`
      : `background: ${skinGrad(s)}`;
  // the ART rides ABOVE the face on its own layer: when the CDN blinks the
  // layer is simply empty and the branded gradient + face show through, so a
  // premium card can never render as a bare circle
  const artLayer = (s: Skin) => {
    const src = s.art ?? s.tex;
    return src ? `<div class="artLay" style="background-image:url('${src}')"></div>` : '';
  };
  // every orb wears the FACE — it's the voidling you're buying, not a marble
  // (legendary card art already has the character drawn in)
  const FACE_SVG = `<svg class="face" viewBox="0 0 100 100">
      <ellipse cx="34" cy="26" rx="12" ry="7" fill="#ffffff" opacity="0.14" transform="rotate(-24 34 26)"/>
      <circle cx="38" cy="45" r="11" fill="#fff"/><circle cx="62" cy="45" r="11" fill="#fff"/>
      <circle cx="40" cy="47" r="6.2" fill="#160a30"/><circle cx="64" cy="47" r="6.2" fill="#160a30"/>
      <circle cx="38" cy="44" r="2.4" fill="#fff"/><circle cx="62" cy="44" r="2.4" fill="#fff"/>
      <ellipse cx="25" cy="59" rx="6.5" ry="4.2" fill="#ff7da8" opacity="0.6"/>
      <ellipse cx="75" cy="59" rx="6.5" ry="4.2" fill="#ff7da8" opacity="0.6"/>
      <path d="M41 63 Q50 72 59 63" stroke="#1a0b33" stroke-width="3.6" fill="none" stroke-linecap="round"/>
    </svg>`;
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
    const orb = el('spOrb');
    orb.setAttribute('style', orbStyle(s));
    orb.innerHTML = s.art ? '' : FACE_SVG;
    el('spName').textContent = s.name;
    el('spTier').textContent = s.cash ? 'LEGENDARY' : s.streak ? 'STREAK REWARD' : s.tex ? 'EPIC' : 'CLASSIC LINE';
    refreshPreview();
    prevEl.classList.add('show');
    audio.ready();
    track('skin_view', {
      skin: s.id, tier: s.cash ? 'legendary' : s.streak ? 'streak' : s.tex ? 'epic' : 'classic',
      owned: owned.has(s.id), price: s.cash ?? PRICES[s.id] ?? 0, coins,
    });
  };
  el('spClose').addEventListener('click', () => prevEl.classList.remove('show'));
  prevEl.addEventListener('click', (ev) => { if (ev.target === prevEl) prevEl.classList.remove('show'); });
  spAct.addEventListener('click', () => {
    const s = prevSkin;
    if (!s) return;
    if (s.streak && !owned.has(s.id)) {
      track('skin_streak_tap', { skin: s.id, days: s.streak });
      audio.hit(); return;   // earned by coming back
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
      buying = true; refreshPreview();
      void iapPurchase(s.id, s.cash).then((res) => {
        buying = false;
        if (res === 'started') { spAct.textContent = 'CONFIRM IN THE APP STORE…'; return; }
        if (res === 'granted') { audio.evolve(); refresh(); refreshPreview(); return; }
        spAct.textContent = res === 'unavailable' ? '👀 COMING TO THE APP STORE!' : 'COULD NOT BUY — TRY AGAIN';
        audio.hit();
        setTimeout(refreshPreview, 2000);
      });
      return;
    }
    if (!owned.has(s.id)) {
      if (coins >= PRICES[s.id]) {
        track('skin_buy', { skin: s.id, price: PRICES[s.id], left: coins - PRICES[s.id], played: stats.matches });
        addCoins(-PRICES[s.id]);
        owned.add(s.id);
        localStorage.setItem('voidSkinsOwned', JSON.stringify([...owned]));
        audio.evolve();
      } else {
        // how far short, and how often — the coin economy's only real feedback
        track('skin_short', { skin: s.id, price: PRICES[s.id], coins, short: PRICES[s.id] - coins });
        spAct.textContent = `NEED ${PRICES[s.id] - coins}✦ MORE!`; audio.hit(); setTimeout(refreshPreview, 1400); return;
      }
    }
    if (equipped !== s.id) track('skin_equip', { skin: s.id });
    equipped = s.id;
    voidling.setSkin(s);
    localStorage.setItem('voidSkin', s.id);
    refresh(); refreshPreview();
  });
  // StoreKit hands ownership back here — from a fresh purchase, and from
  // RESTORE PURCHASES, which App Review requires and which a child who got a
  // new iPad genuinely needs.
  initIAP((skinIds) => {
    let gained = false;
    for (const id of skinIds) if (!owned.has(id)) { owned.add(id); gained = true; }
    if (!gained) return;
    localStorage.setItem('voidSkinsOwned', JSON.stringify([...owned]));
    refresh(); refreshPreview();
    audio.evolve(); buzz(70);
  }, () => { refresh(); refreshPreview(); });   // prices land async — repaint

  {
    const rb = el('btnRestore');
    rb.addEventListener('click', () => {
      rb.textContent = 'RESTORING…';
      void restorePurchases().then((ok) => {
        rb.textContent = ok ? 'RESTORED ✓' : 'NOTHING TO RESTORE';
        setTimeout(() => { rb.textContent = 'RESTORE PURCHASES'; }, 2400);
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
    card.className = 'skCard' + (s.cash ? ' legend' : s.tex ? ' epic' : '');
    const ribbon = s.cash ? '<div class="rib">LEGENDARY</div>' : s.tex ? '<div class="rib epicRib">EPIC</div>' : '';
    // the face ALWAYS renders under the art: if the art CDN blinks, a $9.99
    // card must still show a voidling, never a bare gradient circle
    card.innerHTML = `${ribbon}<div class="orb" style="${orbStyle(s)}">${FACE_SVG}${artLayer(s)}</div><div class="nm">${s.name}</div><div class="pr"></div>`;
    card.addEventListener('click', () => openPreview(s));
    cards.set(s.id, card);
    grid.appendChild(card);
    if (s.id === equipped) voidling.setSkin(s);
  }
  refresh();
}

function animate() {
  tickFrame();
  const dt = Math.min(0.05, clock.getDelta());
  let dtw = dt;
  if (outroT > 0) { outroT -= dt; if (outroT <= 0) endMatch(); else dtw = dt * 0.3; }
  tClock += dt;
  if (_revalQueue.length && tClock >= _revalQueue[0]) { _revalQueue.shift(); validateWorld(); bakeContactShadows(); }
  island.update(dt, tClock);

  if (started && !ended) {
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
          announce(bt.banner);
          breakingNews(bt.news);
          audio.evolve(); buzz(35);
          fx.ring(voidState.x, voidState.z, bt.col, voidling.radius * 6, 0.9);
          fx.flash(bt.flash, 0.35);
      audio.matchBeat(bt.banner);   // happy hour / dance party / treasure feast each get their own sting
        }
      }
      if (feverT > 0) {
        feverT -= dt;
        if (feverT <= 0) { feverMult = 1; announce('…rush over. keep eating!'); }
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
      const lawCap = START_R + (0.022 * Math.min(el2, 30) + LAW_RATE * el2) * paceK
        + surgeT * surgeT * (2.8 + 2.6 * pace);
      // the rate limiter is what actually stops a single landmark ballooning
      // you — it is the job the absolute clamp was doing by accident
      const maxStep = (0.11 + surgeT * 0.16) * dt;
      if (voidling.radius > lastR + maxStep) voidling.setRadius(lastR + maxStep);
      if (voidling.radius > lawCap) voidling.setRadius(lawCap);
      lastR = voidling.radius;
      // 2D score-floor: strong scoring pulls your radius up toward the cap
      // the floor rides the surge too — a strong late run is PULLED to the
      // new ceiling instead of being pinned at the old 6.06 plateau
      const scoreFloor = Math.min(lawCap, START_R * (1 + Math.pow(playerScore / 974, 0.57)) + surgeT * surgeT * 2.6);
      if (voidling.radius < scoreFloor) voidling.setRadius(scoreFloor);
    }
  }

  powerCd = Math.max(0, powerCd - dt);
  // screen-space input: joystick first, else keys
  let inX = 0, inY = 0;
  if (joy.active && joy.mag > 0.08) { inX = joy.dx; inY = joy.dy; }
  else if (keys.size) {
    if (keys.has('KeyW') || keys.has('ArrowUp')) inY -= 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) inY += 1;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) inX -= 1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) inX += 1;
    const m = Math.hypot(inX, inY) || 1; inX /= m; inY /= m;
    if (inX || inY) lastInput = tClock;
  }
  const driving = inX !== 0 || inY !== 0;
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
      camera.getWorldDirection(fwdTmp); fwdTmp.y = 0; fwdTmp.normalize();
      rightTmp.set(1, 0, 0).applyQuaternion(camera.quaternion); rightTmp.y = 0; rightTmp.normalize();
      // PERCEIVED speed is constant: world speed rides the camera distance, so
      // a WORLD ENDER crosses its screen exactly as fast as a hatchling does.
      // Joystick: full speed at ~58% thumb extension (hole.io feel), linear below.
      const jm = joy.active ? THREE.MathUtils.clamp((joy.mag - 0.06) / 0.5, 0, 1) : 1;
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
    voidling.setMood(mood);
    if (mood !== prevMood) {
      if (mood === 'scared') audio.voice('scared');
      else if (mood === 'frenzy' || mood === 'victory') audio.voice('happy');
      else if (mood === 'sleepy') audio.voice('sleepy');
      prevMood = mood;
    }
  }

  voidling.update(dt, { t: tClock, x: voidState.x, z: voidState.z, vx, vz, lookX: THREE.MathUtils.clamp(vx / 40, -1, 1), lookY: THREE.MathUtils.clamp(vz / 40, -1, 1) });
  life.update(dt, tClock, voidState.x, voidState.z, R);
  // the family races on the SAME terms as the player now, so it needs the same
  // three numbers: the clock it is pacing against, the score its rubber band
  // reads, and the shared HAPPY HOUR multiplier
  rivals.update(dt, started && !soloMode ? tClock - startT : 0, voidState.x, voidState.z, R,
    { matchLen, playerScore, fever: feverMult });   // solo: the family never joins
  bubbles.update(dt);
  const cy = voidling.group.position.y;

  for (const e of edibles) {
    if (!started) break;   // menu attract mode: the world idles, nothing is eaten
    if (e.eaten) {
      e.t += dt * 2.4;
      const p = e.mesh.position;
      e.orbit += dt * 10;
      const r = e.orbitR * (1 - e.t);
      p.x = voidState.x + Math.cos(e.orbit) * r;
      p.z = voidState.z + Math.sin(e.orbit) * r;
      // THINGS WERE FALLING UPWARDS. `cy` is the void's group height, which is
      // dispR * RADIUS_SINK = +0.31 x R ABOVE the ground — so this line, whose
      // own comment says "sink INTO the pit", lerped every prop UP. Measured
      // across 295 captures of every prop kind in both worlds: +2.6 to +3.6
      // units of RISE, 245 of them climbing. Straight down into the hole now.
      p.y = THREE.MathUtils.lerp(p.y, -R * 0.55, Math.min(1, dt * 7));
      e.mesh.rotation.x += e.spin.x * dt; e.mesh.rotation.y += e.spin.y * dt; e.mesh.rotation.z += e.spin.z * dt;
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
      e.mesh.rotation.z = (dx / d) * Math.min(0.16, (1 - d / reach) * 0.3);
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
      const k2 = Math.max(0, introT / 2.2);
      camDist = 38 + 262 * k2 * k2;   // ease-in dive from orbit
      targetDist = camDist;
    }
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
    const lookX = voidState.x + lookVX * 0.10 * lookK, lookZ = voidState.z + lookVZ * 0.10 * lookK;
    tmpV.copy(camOffset).multiplyScalar(camDist);
    tmpV.x += lookX; tmpV.z += lookZ;
    camera.position.lerp(tmpV, 1 - Math.exp(-5.0 * dt));
    camera.lookAt(lookX, R * 0.5, lookZ);
    // the SIZE chip rides just under the hole (hole.io pattern) — projected
    // with THIS frame's camera, or the chip swims against the hole at 30fps
    camera.updateMatrixWorld();
    _chipV.set(voidState.x, 0, voidState.z).project(camera);
    formEl.style.left = `${(_chipV.x * 0.5 + 0.5) * innerWidth}px`;
    // …clear of the HOLE, not a flat 70px below its centre. A WORLD ENDER is
    // wider than that offset, so late in the match the chip sat inside the void
    // it was labelling — and it overlapped the speech bubbles behind it.
    const pxPerWorld = innerHeight / (2 * camDist * Math.tan((camera.fov * Math.PI / 180) / 2));
    formEl.style.top = `${(-_chipV.y * 0.5 + 0.5) * innerHeight + 34 + R * pxPerWorld}px`;
    // fog rides the zoom: distance melts into cosmos = instant diorama depth
    if (scene.fog) { (scene.fog as THREE.Fog).near = 60 + camDist * 1.4; (scene.fog as THREE.Fog).far = 260 + camDist * 4; }
  }
  // sun follows the void so shadows stay crisp near the action (fixed high
  // noon — the sun never drops, the island never changes colour mid-match)
  sun.position.set(voidState.x + sunOff.x, sunOff.y, voidState.z + sunOff.z);
  sun.target.position.set(voidState.x, 0, voidState.z);

  // evolution: form change on growth (with a flash), plus ring/glow via setStage
  const ns = stageFor(voidling.radius);
  if (ns > curStage) {
    curStage = ns;
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
      announce('🌑 WORLD ENDER — the island is OVER');
      breakingNews(pickedWorld === 'pirate'
        ? 'PIRATE BAY is CANCELLED!! it was lovely while it lasted.'
        : 'MAPLE FALLS: both candidates concede!! to the hole.');
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
    newsCd -= dt;
    // BREATHING ROOM: a headline every 14-20s meant the card was on screen
    // roughly a third of the match — it stopped being an event. Now 30-42s,
    // and a breaking beat still cuts the line when the player earns one.
    if (newsCd <= 0) { newsCd = 30 + Math.random() * 12; showNews(); }
  }

  // the DRAG-to-steer hint retires itself once the player has been driving
  if (started && tClock - lastInput < 1 && tClock - startT > 8) hungerLbl.style.opacity = '0';

  hudCd -= dt;
  if (hudCd <= 0) {
    hudCd = 0.2; refreshHud();
    // treasure is the whole reason this exists — show the ones still out there
    minimap.update(voidState.x, voidState.z, voidling.radius,
      gilded.filter((e) => !e.eaten).map((e) => ({ x: e.mesh.position.x, z: e.mesh.position.z })),
      rivals.list.map((rv) => ({ x: rv.x, z: rv.z, r: rv.r, color: rv.color })));
    hungerFill.style.width = `${Math.max(6, Math.round(hunger * 100))}%`;
    hungerEl.classList.toggle('ready', hunger >= COST.gulp);
    pwBtns[0].classList.toggle('off', hunger < COST.gulp || powerCd > 0);
    pwBtns[1].classList.toggle('off', hunger < COST.collapse || powerCd > 0);
    // form progress toward the next evolution
    const lo = FORM_MIN[curStage], hi = FORM_MIN[curStage + 1] ?? R_CAP;
    formFill.style.width = `${Math.round(Math.min(1, (R - lo) / Math.max(0.001, hi - lo)) * 100)}%`;
    { const f2 = scFill(); if (f2) f2.style.width = `${Math.round(Math.min(1, (R - lo) / Math.max(0.001, hi - lo)) * 100)}%`; }
  }

  pumpBanner();   // anything the evolve card held back gets its turn now
  updateFindRing(tClock, started ? tClock - startT : 999);   // menu never shows it

  // LOD band + shadow frustum track the camera
  updateLodBias(camDist);
  fitShadow(camDist);

  // adaptive quality: step down fast when fps dips, climb back slowly
  qAccT += dt; qAccN++; qCd -= dt;
  if (qCd <= 0 && qAccT > 0) {
    const avg = qAccN / qAccT; qAccN = 0; qAccT = 0;
    if (avg < 46 && qLevel < QUALITY.length - 1) { qLevel++; applyQuality(); qCd = 4; }
    else if (avg > 57 && qLevel > 0) { qLevel--; applyQuality(); qCd = 10; }
    else qCd = 3;
  }

  // FIRST FRAME: the boot cover comes down only once there is something behind
  // it. Until now the menu painted immediately and then the main thread blocked
  // for 30-45 seconds building the island, with the player tapping PLAY at a
  // page that could not answer.
  if (!_booted) {
    _booted = true;
    const bs2 = el('loadScr'); bs2.style.transition = 'opacity 0.45s ease'; bs2.style.opacity = '0';
    setTimeout(() => { bs2.classList.remove('boot'); bs2.style.opacity = ''; bs2.style.transition = ''; }, 480);
  }
  const shakeOff = fx.update(dt);
  camera.position.add(shakeOff);
  // GOLDEN HOUR IS OUT. Dimming the sky and sun over the last 45s read as the
  // world randomly "turning to night" — confusing mid-match, and a kids' game
  // should look identical from the first second to the last. Maple Isle is
  // permanently high noon. (The lamp/window emissive ramp goes with it.)
  if ((shadowFrame++ & 1) === 0) renderer.shadowMap.needsUpdate = true;
  renderer.render(scene, camera);
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
