// VOIDLING — 3D PROTOTYPE (Three.js / WebGL)
// The cute VOIDLING void, rebuilt as a faithful 3D port of the 2D star, rolling
// through MAPLE ISLE — the 2D island ported to 3D, floating in cosmic space.
// Void: ./proto3d/void3d · island: ./proto3d/island · palette: ./proto3d/palette
// Standalone page — the main game bundle is untouched.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createVoid } from './proto3d/void3d';
import { createIsland } from './proto3d/island';
import { createLife } from './proto3d/life';
import { createBubbles } from './proto3d/bubbles';
import { createRivals } from './proto3d/rivals';
import { createFx } from './proto3d/fx';
import { createDefense } from './proto3d/defense';
import { createAudio } from './proto3d/audio3d';
import { SKINS, type Skin } from './proto3d/palette';
import { buildGallery, updateLodBias, preloadPack } from './proto3d/assets3d';

// ── renderer / scene / camera ────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
// 1.6 is visually indistinguishable at mobile viewing distance but ~35% fewer
// pixels than 2.0 — the single biggest lag lever on phones.
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
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
  scene.environmentIntensity = 0.25;   // specular sheen only — keep colours saturated
}
const camera = new THREE.PerspectiveCamera(32, window.innerWidth / window.innerHeight, 1, 1900);
let camDist = 50;
const camOffset = new THREE.Vector3(0.62, 0.92, 0.62).normalize();
const TOPDOWN = location.search.includes('top');
const ASSETVIEW = location.search.includes('assets');   // ?debug gallery of the GLB pack

// (Full-screen bloom washed out the sunlit island — the void's "bloom" is a
// dedicated additive glow sprite inside void3d instead: same pop, zero wash.)

// ── lighting ─────────────────────────────────────────────────────────────────
scene.add(new THREE.HemisphereLight(0xdfeaff, 0x5a5a80, 0.72));
const sun = new THREE.DirectionalLight(0xfff2d8, 1.35);
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
// the shadow frustum rides the camera: tight box up close = crisp tree
// shadows, widening as you zoom out (fixed 330u box was ~6 texels/unit)
function fitShadow(dist: number) {
  const target = THREE.MathUtils.clamp(dist * 1.1, 45, 165);
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
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, q.pr));
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
  edibles.push({ mesh, radius, eaten: false, t: 0, orbit: 0, orbitR: 0, spin: new THREE.Vector3(),
    home: mesh.position.clone(), homeScale: mesh.scale.clone(), homeRotY: mesh.rotation.y });
}

const island = createIsland(scene, addEdible);
const bubbles = createBubbles(camera);
const life = createLife(scene, addEdible, island.biomeAt, bubbles.say);
const rivals = createRivals(scene, camera, edibles, island.biomeAt, 4);
const fx = createFx(scene);
rivals.onJoin = (name, color, x, z) => {
  announce(`💜 ${name} joined the feast!`);
  fx.ring(x, z, color, 22, 0.8);
  audio.alert();
};
// the family SPEAKS — personality bubbles over rival voids
const rivalBubblePos = new THREE.Vector3();
rivals.onSpeak = (x, z, line) => {
  bubbles.say(rivalBubblePos.set(x, 5, z), line, 'event');
};
// hole-vs-hole danger: rivals are PLAYERS now, not decoration
rivals.onRivalEaten = (name, pts) => {
  playerScore += pts;
  addCoins(15);
  questEvent('rival');
  if (!moments.firstRival) { moments.firstRival = true; announce('🌀 rival DEVOURED! burp.'); }
  else announce(`🌀 you DEVOURED ${name}! +${pts}`);
  audio.bigEat(); fx.ring(voidState.x, voidState.z, 0xffe08a, voidling.radius * 3, 0.7);
  buzz(60);
};
rivals.onPlayerBitten = (name) => {
  voidling.setRadius(Math.max(START_R, voidling.radius * 0.82));
  announce(`😱 ${name} took a BITE of you!!`);
  audio.hit(); fx.shake(3); fx.flash('rgba(154,92,255,0.3)', 0.4);
  buzz(50);
};
const defense = createDefense(scene, fx, island.biomeAt);
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
  const spots: Record<string, [number, number]> = { plaza: [42.75, -42.75], golf: [128.25, -42.75], beach: [-42.75, 213.75], camp: [128.25, -213.75], cozy: [-128.25, -128.25], downtown: [-42.75, -42.75], zoo: [213.75, -128.25], military: [198, 190], airport: [213.75, 128.25], fancy: [-128.25, -42.75] };
  if (at && spots[at]) { voidState.x = spots[at][0]; voidState.z = spots[at][1]; }
}

// absorb puffs
const PUFF = 120;
const puffGeo = new THREE.BufferGeometry();
const puffPos = new Float32Array(PUFF * 3);
puffGeo.setAttribute('position', new THREE.BufferAttribute(puffPos, 3));
const puffPoints = new THREE.Points(puffGeo, new THREE.PointsMaterial({ color: 0xc9a6ff, size: 3.2, map: puffTex, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }));
puffPoints.frustumCulled = false; scene.add(puffPoints);
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
  const dx = ev.clientX - joy.ax, dy = ev.clientY - joy.ay;
  const m = Math.hypot(dx, dy);
  const k = m > JOY_R ? JOY_R / m : 1;
  joy.dx = (dx * k) / JOY_R; joy.dy = (dy * k) / JOY_R; joy.mag = Math.min(1, m / JOY_R);
  joyNubEl.style.left = `${joy.ax + dx * k}px`; joyNubEl.style.top = `${joy.ay + dy * k}px`;
  lastInput = tClock;
}
renderer.domElement.addEventListener('pointerdown', (e) => {
  joy.active = true; joy.id = e.pointerId; joy.ax = e.clientX; joy.ay = e.clientY;
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
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ── match state + HUD ─────────────────────────────────────────────────────────
const el = (id: string) => document.getElementById(id)!;
const timerEl = el('timer'), devEl = el('devoured'), boardEl = el('board'), formEl = el('form');
const hungerLbl = el('hungerlbl');
const evolveEl = el('evolve'), endEl = el('end'), endHd = el('endHd'), endSub = el('endSub'), endList = el('endList');
const bannerEl = el('banner'), hungerEl = el('hunger'), hungerFill = hungerEl.querySelector('.fill') as HTMLElement;
const formFill = el('formbar').querySelector('.fill') as HTMLElement;
let prevHunger = 0;

function announce(text: string) {
  bannerEl.textContent = text;
  bannerEl.classList.remove('show'); void bannerEl.offsetWidth; bannerEl.classList.add('show');
}

// haptics — hole.io vibrates on every absorb and it's core to the feel.
// Rate-capped so a feeding frenzy doesn't turn the phone into a massager.
let buzzGate = 0, hadGesture = false;
window.addEventListener('pointerdown', () => { hadGesture = true; }, { once: true });
function buzz(ms: number) {
  if (!hadGesture || !('vibrate' in navigator)) return;   // browsers require a tap first
  const now = performance.now();
  if (ms < 20 && now < buzzGate) return;   // ticks are rate-limited; big hits always land
  buzzGate = now + 70;
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

const FORMS = ['VOIDLING', 'MUNCHER', 'GOBBLER', 'DEVOURER', 'WORLD ENDER'];
// 2D thresholds 18/32/50/78/110 world-px, mapped through the 0.05 world scale
const FORM_MIN = [0, 1.6, 2.5, 3.9, 5.5];
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
let initialMass = 0;                   // set once, after the world is built
let hudCd = 0;

const WANDER_R = 230;
let wanderT = 0; const wander = new THREE.Vector3(voidState.x, 0, voidState.z);
const clock = new THREE.Clock();
const prev = { x: voidState.x, z: voidState.z };
const tmpV = new THREE.Vector3();
const fwdTmp = new THREE.Vector3(), rightTmp = new THREE.Vector3();
let velX = 0, velZ = 0;   // smoothed velocity — kills the boxy/jerky feel

function fmtTime(s: number) { s = Math.max(0, Math.ceil(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }

// ── coin wallet (persisted — the soft-currency for skins) ───────────────────
let coins = Number(localStorage.getItem('voidCoins') || 0);
const coinEl = el('coins');
function addCoins(n: number) {
  coins += n;
  localStorage.setItem('voidCoins', String(coins));
  coinEl.textContent = `🪙 ${coins}`;
}
addCoins(0);

// ── DAILY QUESTS: 3 drawn per day (1 easy / 1 medium / 1 hard), progress
// persists across matches, +25¢ for clearing the board — three stacking
// come-back-tomorrow hooks with the gift box and streak skins
interface Quest { id: string; label: string; target: number; count: number; reward: number; kind: string; done: boolean; }
const QUEST_POOL: Omit<Quest, 'count' | 'done'>[] = [
  { id: 'snack', label: 'Snack Attack: eat 25 tiny things', target: 25, reward: 15, kind: 'snack' },
  { id: 'gulp', label: 'Big Gulp: use GULP 3×', target: 3, reward: 15, kind: 'gulp' },
  { id: 'collapse', label: 'Supernova: use COLLAPSE', target: 1, reward: 20, kind: 'collapse' },
  { id: 'cars', label: 'Rush Hour: eat 6 cars', target: 6, reward: 20, kind: 'car' },
  { id: 'combo', label: 'Combo Chef: hit a ×2.0 combo', target: 1, reward: 20, kind: 'combo' },
  { id: 'evolve', label: 'Evolve to DEVOURER', target: 1, reward: 25, kind: 'devourer' },
  { id: 'solo', label: 'Islander: 40% in a Solo Run', target: 1, reward: 20, kind: 'solo40' },
  { id: 'houses', label: 'Home Wrecker: eat 3 houses', target: 3, reward: 25, kind: 'house' },
  { id: 'rival', label: 'Void Eats Void: devour a rival', target: 1, reward: 30, kind: 'rival' },
  { id: 'army', label: 'Delicious Irony: eat 2 army units', target: 2, reward: 25, kind: 'army' },
];
const EASY_Q = ['snack'], MED_Q = ['cars', 'combo', 'evolve', 'solo'], HARD_Q = ['houses', 'rival', 'army'];   // gulp/collapse rejoin when powers return
const quests: Quest[] = (() => {
  const today = new Date().toDateString();
  const daySeed = Math.abs(today.split('').reduce((a, c) => a * 31 + c.charCodeAt(0), 7));
  const ids = [EASY_Q[daySeed % EASY_Q.length], MED_Q[daySeed % MED_Q.length], HARD_Q[daySeed % HARD_Q.length]];
  const saved = localStorage.getItem('voidQuestDay') === today
    ? JSON.parse(localStorage.getItem('voidQuestState') || '{}') : {};
  localStorage.setItem('voidQuestDay', today);
  return ids.map((id) => {
    const t = QUEST_POOL.find((q) => q.id === id)!;
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
  questsEl.innerHTML = quests.map((q) =>
    `<div class="q ${q.done ? 'done' : ''}"><span>${q.done ? '✓' : '○'}</span> ${q.label} <b>+${q.reward}¢</b>${q.done ? '' : ` <i>${q.count}/${q.target}</i>`}</div>`).join('');
}
function questComplete(q: Quest) {
  q.done = true; addCoins(q.reward);
  announce(`QUEST DONE! +${q.reward}¢`);
  audio.evolve();
  if (quests.every((x) => x.done)) { addCoins(25); announce('ALL QUESTS CLEAR! +25¢ BONUS'); }
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
const NEWS_CALM = [
  'BREAKING: mayor announces run for a THIRD term',
  'local cat stuck in tree again. hang on, Waffles',
  'zoo flamingo count: still eleven. riveting.',
  'ferris wheel voted #1 wheel by wheel fans',
  'school spelling bee ends in a 14-way tie',
  'golf course mole "not sorry", witnesses say',
  'airport adds new flight to the OTHER beach',
  'duck parade delays traffic. mayor: "worth it"',
  "weather: sunny. tiny purple dot 'probably a bug'",
  'town hall bake sale: brownies gone in 4 minutes',
  'beach crab steals sandwich, declines interview',
  'ISLE NEWS wins award for best news on the isle',
];
const NEWS_WORRIED = [
  'mayor: DO NOT feed the void. it feeds itself',
  "scientists: it's PROBABLY fine (they are packing)",
  'zoo animals seen forming an escape committee',
  'golf course now a golf shortcourse',
  "airport reports all outgoing flights 'very full'",
  'poll: 6 in 10 residents "would rather not be eaten"',
  'lifeguards now guarding the land too',
  'school swaps fire drill for VOID drill. kids thrilled',
  'ferris wheel operator refuses to look down',
  'hardware store sells out of locks, tape, courage',
  'mayor unveils anti-void plan: a really big net',
  "MISSING: 14 mailboxes, 3 cars, the mayor's hat",
];
const NEWS_PANIC = [
  'THE ARMY HAS A PLAN (the plan is honking)',
  'LAST ONE OFF THE ISLAND TURNS OFF THE SUN',
  'town hall meeting cancelled. also town hall.',
  'ferris wheel now tallest thing left. barely.',
  'zoo update: the lions are rooting for the void',
  'mayor spotted rowing away in a paddle boat',
  'airport gone. planes now simply birds',
  'golf report: hole in one. the hole is EVERYTHING',
  'school declares recess FOREVER (for bad reasons)',
  'void upgraded from weather event to landlord',
  'ISLE NEWS now broadcasting from a kayak',
  'beach missing. ocean confused. more at 6, maybe',
];
const newsEl = el('news');
let devouredPct = 0, newsCd = 7, lastNews = '';
function showNews() {
  const tier = devouredPct < 8 ? 0 : devouredPct < 30 ? 1 : 2;
  const pool = [NEWS_CALM, NEWS_WORRIED, NEWS_PANIC][tier];
  let h = pool[Math.floor(Math.random() * pool.length)];
  if (h === lastNews) h = pool[(pool.indexOf(h) + 1) % pool.length];
  lastNews = h;
  newsEl.innerHTML = `<i>${['📰 ISLE NEWS', '⚠️ ISLE NEWS', '🚨 BREAKING'][tier]}</i>${h}`;
  newsEl.className = tier === 2 ? 'panic' : tier === 1 ? 'worried' : '';
  newsEl.classList.remove('show'); void (newsEl as HTMLElement).offsetWidth; newsEl.classList.add('show');
  audio.ready();   // a soft chime so headlines register even mid-chomp
}

let prevRank = 0;   // 0 = unset; rank-change drama needs a baseline first
function refreshHud() {
  const R = voidling.radius;
  // leaderboard: player + rivals, ranked by score
  const rows = [{ name: 'You', color: PLAYER_COLOR, score: playerScore, me: true },
    ...rivals.list.map((r) => ({ name: r.name, color: r.color, score: r.score, me: false }))]
    .sort((a, b) => b.score - a.score);
  // overtaking is DRAMA — celebrate every rank gained (hole.io's rank swings)
  const myRank = rows.findIndex((r) => r.me) + 1;
  if (started && !ended && prevRank > 0 && myRank < prevRank) {
    announce(`👑 you passed ${rows[myRank]?.name ?? 'a rival'}!`);
    audio.ready(); buzz(20);
  }
  prevRank = myRank;
  boardEl.innerHTML = rows.map((r, i) =>
    `<div class="row ${r.me ? 'me' : ''}"><span>${i + 1}</span><span class="dot" style="background:#${r.color.toString(16).padStart(6, '0')}"></span><span class="nm">${r.name}</span><span class="sc">${Math.round(r.score)}</span></div>`).join('');
  let consumed = 0;
  for (const e of edibles) if (e.eaten || !e.mesh.visible) consumed += e.radius;
  devouredPct = Math.min(100, Math.round((consumed / Math.max(1, initialMass)) * 100));
  if (devouredPct >= 50 && !moments.half && started && !ended) { moments.half = true; announce('🍽️ HALF the island. gone.'); }
  devEl.textContent = `${devouredPct}% DEVOURED`;
  formEl.textContent = `${FORMS[curStage]} · ${Math.round(R * 1.6)}m`;
}

// rank ladder (hole.io placement points: 20/10/5/2/1) + daily streak
let xp = Number(localStorage.getItem('voidXP') || 0);
let streak = Number(localStorage.getItem('voidStreak') || 0);
// per-level XP spans: the first levels pop in 1-2 matches, MASTER is a season
const XP_SPANS = [20, 30, 40, 50, 60, 75, 90, 105, 120, 140, 160, 190, 220, 250, 300, 400];
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
function endMatch() {
  ended = true;
  audio.stopMusic();
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
    endSub.textContent = `${newBest ? 'NEW BEST!!' : `best: ${Math.max(best, devouredPct)}%`} · +${reward2}¢ · +${gain2} XP`;
    endList.innerHTML = '';
    endEl.classList.add('show');
    stats.matches++; saveStats();
    return;
  }
  const rows = [{ name: 'You', color: PLAYER_COLOR, score: playerScore, me: true },
    ...rivals.list.map((r) => ({ name: r.name, color: r.color, score: r.score, me: false }))]
    .sort((a, b) => b.score - a.score);
  const myRank = rows.findIndex((r) => r.me) + 1;
  // everyone leaves with something; winning is 5x last place, not infinity-x
  const today = new Date().toDateString();
  let reward = ([50, 35, 25, 15, 10][myRank - 1] ?? 10) + Math.min(60, Math.floor(playerScore / 50));
  if (myRank === 1 && localStorage.getItem('voidFirstWinDay') !== today) {
    localStorage.setItem('voidFirstWinDay', today); reward += 50;
  }
  addCoins(reward);
  let gain = ([25, 18, 12, 8, 5][myRank - 1] ?? 5) + Math.min(10, Math.floor(playerScore / 400));
  if (localStorage.getItem('voidFirstMatchDay') !== today) { localStorage.setItem('voidFirstMatchDay', today); gain += 10; }
  xp += gain; localStorage.setItem('voidXP', String(xp)); renderRank();
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
  endSub.textContent = (myRank === 1 ? 'the island belongs to the void' : `${rows[0].name} devoured the most`) + ` · +${reward}¢ · +${gain} XP`;
  endList.innerHTML = rows.map((r, i) =>
    `<div class="er ${r.me ? 'me' : ''}"><span>${i + 1}</span><span class="dot" style="background:#${r.color.toString(16).padStart(6, '0')}"></span><span class="nm">${r.name}</span><span class="sc">${Math.round(r.score)}</span></div>`).join('');
  endEl.classList.add('show');
}

// devour one edible: spiral it in, grow, score (2D combo model), charge hunger
let combo = 0, comboT = 0, chompCd = 0;
// once-per-match milestone banners (hole.io celebrates the firsts)
const moments = { firstBuilding: false, firstCar: false, firstRival: false, half: false, last30: false };
const floatPos = new THREE.Vector3();
function capture(e: Edible, giveHunger = true) {
  const dx = e.mesh.position.x - voidState.x, dz = e.mesh.position.z - voidState.z;
  const d = Math.hypot(dx, dz) || 1;
  e.eaten = true; e.t = 0; e.orbit = Math.atan2(dz, dx); e.orbitR = Math.max(voidling.radius * 0.6, d);
  e.mesh.userData.eaten = true;
  // topple toward the hole (the hole.io fantasy): the tip axis is perpendicular
  // to the pull direction, so things visibly keel over INTO the void
  e.spin.set((dz / d) * rand(4.5, 7.5), rand(-1.5, 1.5), (-dx / d) * rand(4.5, 7.5));
  voidling.setRadius(growRadius(voidling.radius, e.radius));   // area-based growth
  combo++; comboT = 1.2;
  const comboMult = 1 + Math.min(combo, 25) * 0.1;             // 2D: 1 + min(combo,25)·0.1
  // moving prey (people/animals/cars — tagged ptsMult 1.5) beats furniture of
  // the same size: chasing pays. Everything else stays radius-proportional.
  const preyMult = (e.mesh.userData.ptsMult as number | undefined) ?? 1;
  const pts = Math.max(1, Math.round(e.radius * 12 * comboMult * preyMult));
  playerScore += pts;
  if (giveHunger) hunger = Math.min(1, hunger + 0.03);
  spawnPuff(e.mesh.position.x, voidling.group.position.y, e.mesh.position.z, 3);
  voidling.chomp();
  stats.eaten++;
  // juice: score floater on the morsel, flair on big bites and hot combos
  floatPos.set(e.mesh.position.x, voidling.radius + 2, e.mesh.position.z);
  const coinVal = e.mesh.userData.coin as number | undefined;
  if (coinVal) { addCoins(coinVal); bubbles.float(floatPos, `+${coinVal}¢`, true); }
  else bubbles.float(floatPos, `+${pts}`);
  // CHOMP! is an EVENT, not wallpaper. The growth law parks the player just
  // above their staple food size, so the bar is "bigger than YOU" + a long
  // cooldown — a couple of CHOMPs a match, each one earned.
  if (e.radius > voidling.radius && tClock > chompCd) {
    chompCd = tClock + 7;
    bubbles.float(floatPos, 'CHOMP!', true); audio.bigEat(); buzz(30);
  } else { audio.pop(combo); buzz(e.radius > 2 ? 15 : 8); }
  if (combo > 0 && combo % 5 === 0) bubbles.float(floatPos, `COMBO ×${comboMult.toFixed(1)}`, true);
  // quest + milestone hooks (tagged at spawn: qk = 'car' | 'house' | 'army')
  const qk = e.mesh.userData.qk as string | undefined;
  if (e.radius < 1) questEvent('snack');
  if (qk) questEvent(qk);
  if (comboMult >= 2) questEvent('combo');
  if (qk === 'house' && !moments.firstBuilding) { moments.firstBuilding = true; announce('🏠 FIRST BUILDING! crunch.'); }
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
function beginMatch(solo = false) {
  soloMode = solo;
  matchLen = solo ? 120 : MATCH_LEN;
  matchClock = matchLen;
  started = true; startT = tClock;
  document.body.classList.remove('menu');
  menuEl.style.display = 'none';
  boardEl.style.display = solo ? 'none' : '';
  el('titlecard').classList.add('show');
  titleUntil = tClock + 4.6;
  audio.startMusic(); audio.setMusicStage(0);
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
  'tip: quests pay coins — peek at the list mid-match',
  'tip: NOMLET cries when eaten. worth it.',
];
function withWorldReady(cb: () => void) {
  if (packReady) { cb(); return; }
  const scr = el('loadScr');
  (scr.querySelector('.lTip') as HTMLElement).textContent = LOAD_TIPS[Math.floor(Math.random() * LOAD_TIPS.length)];
  scr.classList.add('show');
  // slow networks still get in: cap the wait, fallbacks cover stragglers
  Promise.race([preloadP, new Promise((r) => setTimeout(r, 12000))]).then(() => {
    packReady = true;
    el('lBar').style.width = '100%'; el('lPct').textContent = '100%';
    setTimeout(() => { scr.classList.remove('show'); cb(); }, 300);
  });
}
el('btnPlay').addEventListener('click', () => {
  menuEl.style.display = 'none';
  if (!localStorage.getItem('voidTut')) tutEl.classList.add('show');
  else withWorldReady(() => beginMatch());
});
el('btnSolo').addEventListener('click', () => {
  menuEl.style.display = 'none';
  if (!localStorage.getItem('voidTut')) localStorage.setItem('voidTut', '1');
  withWorldReady(() => beginMatch(true));
});
el('btnGotIt').addEventListener('click', () => {
  localStorage.setItem('voidTut', '1');
  tutEl.classList.remove('show');
  withWorldReady(() => beginMatch());
});
// locked world teasers wiggle on tap
document.querySelectorAll('.wCard.lock').forEach((c) => c.addEventListener('click', () => {
  c.classList.remove('shake'); void (c as HTMLElement).offsetWidth; c.classList.add('shake');
}));
el('btnWorlds').addEventListener('click', () => el('worlds').classList.add('show'));
el('btnShop').addEventListener('click', () => shopEl.classList.add('show'));
el('btnBack').addEventListener('click', () => shopEl.classList.remove('show'));
function resetMatch() {
  // restore every eaten thing to its remembered home — the island regrows in
  // one frame and the next run starts in under a second
  for (const e of edibles) {
    e.eaten = false; e.t = 0;
    e.mesh.userData.eaten = false;
    e.mesh.visible = true;
    if (!e.mesh.parent) scene.add(e.mesh);
    // magnet drift + topple mean EVERYTHING goes back to its surveyed home
    e.mesh.position.copy(e.home);
    e.mesh.scale.copy(e.homeScale);
    e.mesh.rotation.set(0, e.homeRotY, 0);
  }
  rivals.reset();
  defense.reset();
  curStage = 0; voidling.setStage(0); voidling.setRadius(START_R);
  voidState.x = island.spawn.x; voidState.z = island.spawn.z;
  velX = 0; velZ = 0; camDist = 50;
  playerScore = 0; hunger = 0; combo = 0; prevRank = 0; chompCd = 0; newsCd = 7;
  for (const k in moments) (moments as Record<string, boolean>)[k] = false;
  renderQuests();
  ended = false;
  el('end').classList.remove('show');
  timerEl.style.color = '';
  beginMatch(soloMode);
}
el('btnAgain').addEventListener('click', resetMatch);
document.querySelectorAll('.backBtn').forEach((b) => b.addEventListener('click', () => el((b as HTMLElement).dataset.close!).classList.remove('show')));

// ── lifetime stats + trophies ────────────────────────────────────────────────
interface Stats { matches: number; wins: number; best: number; bestForm: number; eaten: number; }
const stats: Stats = JSON.parse(localStorage.getItem('voidStats') || '{"matches":0,"wins":0,"best":0,"bestForm":0,"eaten":0}');
const saveStats = () => localStorage.setItem('voidStats', JSON.stringify(stats));
const TROPHIES = [
  { ic: '🍩', nm: 'First Bite', ds: 'eat your first snack', ok: () => stats.eaten >= 1 },
  { ic: '😋', nm: 'MUNCHER', ds: 'reach MUNCHER form', ok: () => stats.bestForm >= 1 },
  { ic: '🌀', nm: 'GOBBLER', ds: 'reach GOBBLER form', ok: () => stats.bestForm >= 2 },
  { ic: '🕳️', nm: 'DEVOURER', ds: 'reach DEVOURER form', ok: () => stats.bestForm >= 3 },
  { ic: '🪐', nm: 'WORLD ENDER', ds: 'reach the final form', ok: () => stats.bestForm >= 4 },
  { ic: '👑', nm: 'Champion', ds: 'win a match', ok: () => stats.wins >= 1 },
  { ic: '💯', nm: 'Century', ds: 'score 2,500 in one run', ok: () => stats.best >= 2500 },
  { ic: '🍽️', nm: 'Glutton', ds: 'eat 500 things (lifetime)', ok: () => stats.eaten >= 500 },
];
function renderTrophies() {
  el('statsRow').innerHTML = [
    { v: stats.matches, l: 'MATCHES' }, { v: stats.wins, l: 'WINS' },
    { v: stats.best, l: 'BEST SCORE' }, { v: stats.eaten, l: 'THINGS EATEN' },
  ].map((s) => `<div class="stat"><div class="v">${s.v}</div><div class="l">${s.l}</div></div>`).join('');
  el('trophyGrid').innerHTML = TROPHIES.map((t) =>
    `<div class="tr ${t.ok() ? 'got' : ''}"><div class="ic">${t.ic}</div><div class="nm">${t.nm}</div><div class="ds">${t.ds}</div></div>`).join('');
}
el('btnTrophies').addEventListener('click', () => { renderTrophies(); el('trophies').classList.add('show'); });

// ── top voids of the week (local weekly board, seeded with the family) ──────
function weekKey() { const d = new Date(); const on = new Date(d.getFullYear(), 0, 1); return `voidWeek-${d.getFullYear()}-${Math.ceil((((d.getTime() - on.getTime()) / 86400000) + on.getDay() + 1) / 7)}`; }
function weeklyBoard(): { name: string; score: number; color: number; me?: boolean }[] {
  const seeded = [
    { name: 'CHOMPZILLA', score: 3720, color: 0x7ed57a }, { name: 'NOMLET', score: 3315, color: 0xff9a3a },
    { name: 'GOBBLER', score: 2940, color: 0xff6fb0 }, { name: 'GULPY', score: 2535, color: 0x4d8ff0 },
    { name: 'MUNCHER', score: 2160, color: 0x2fd8c0 }, { name: 'B1G-B1TE', score: 1830, color: 0xd85a5a },
    { name: 'snackrat', score: 1320, color: 0xb98cff },
  ];
  const mine = Number(localStorage.getItem(weekKey()) || 0);
  const rows = [...seeded, { name: 'You', score: mine, color: 0x9a5cff, me: true }];
  return rows.sort((a, b) => b.score - a.score);
}
function renderTop() {
  const medals = ['🥇', '🥈', '🥉'];
  el('topList').innerHTML = weeklyBoard().map((r, i) =>
    `<div class="tv ${r.me ? 'me' : ''}"><span class="rk">${medals[i] || i + 1}</span><span class="dot2" style="background:#${r.color.toString(16).padStart(6, '0')}"></span><span class="nm2">${r.name}</span><span class="sc2">${r.score}</span></div>`).join('');
}
el('btnTop').addEventListener('click', () => { renderTop(); el('topvoids').classList.add('show'); });

// ── menu gift box: a present every 30 minutes (hole.io's timer-gift retention) ─
{
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
    giftEl.textContent = `+${amt}¢!`;
    audio.evolve(); buzz(40);
    localStorage.setItem('voidGiftAt', String(Date.now() + 30 * 60 * 1000));
    setTimeout(() => { giftEl.textContent = '🎁'; refreshGift(); }, 1400);
  });
  setInterval(refreshGift, 20000);
  refreshGift();
}
renderRank();
// EXPLICIT debug params only skip the menu — arbitrary query strings on shared
// links (?utm_source=…) must land on the real splash like any player
if (DEBUG_HARNESS || TOPDOWN || ASSETVIEW) { localStorage.setItem('voidTut', '1'); beginMatch(); }

// skin SHOP — earn coins in matches, spend them on skins (LoL soft-currency
// model, same as the 2D shop); owned + equipped persist across sessions
{
  const PRICES: Record<string, number> = {
    classic: 0, galaxy: 150, wizard: 150, sunset: 250, toxic: 250, ocean: 400,
    nebula: 600, magma: 600, candy: 600, aurora: 750,
    honey: 750, glacier: 750, sherbet: 900, cyber: 900, blossom: 900, royal: 1500,
  };
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
        : s.cash ? `💎 $${s.cash.toFixed(2)}`
        : s.streak ? `🔥 ${s.streak}-DAY STREAK` : `🪙 ${PRICES[s.id]}¢`;
    }
  };
  // shop order tells the value story: colours → AI textures → LEGENDARY
  const SORTED = [...SKINS].sort((a, b) =>
    (a.cash ? 2 : a.tex ? 1 : 0) - (b.cash ? 2 : b.tex ? 1 : 0));
  const orbStyle = (s: Skin) => s.art
    ? `background: url('${s.art}') center / cover; box-shadow: 0 8px 18px rgba(0,0,0,0.45), 0 0 18px rgba(255,210,90,0.3);`
    : s.tex
      ? `background: url('${s.tex}') center / cover; box-shadow: inset 0 -14px 26px rgba(0,0,0,0.55), inset 6px 10px 18px rgba(255,255,255,0.18), 0 8px 18px rgba(0,0,0,0.45);`
      : `background: radial-gradient(circle at 38% 34%, #${s.rim.toString(16).padStart(6, '0')}, #${s.mid.toString(16).padStart(6, '0')} 60%, #${s.abyss.toString(16).padStart(6, '0')})`;
  // every orb wears the FACE — it's the voidling you're buying, not a marble
  // (legendary card art already has the character drawn in)
  const FACE_SVG = `<svg class="face" viewBox="0 0 100 100">
      <ellipse cx="34" cy="26" rx="14" ry="9" fill="#ffffff" opacity="0.28" transform="rotate(-24 34 26)"/>
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
  const refreshPreview = () => {
    if (!prevSkin) return;
    const s = prevSkin;
    spAct.textContent = equipped === s.id ? '✓ EQUIPPED'
      : owned.has(s.id) ? 'EQUIP'
      : s.cash ? `💎 $${s.cash.toFixed(2)} · APP STORE SOON`
      : s.streak ? `🔥 PLAY ${s.streak} DAYS IN A ROW`
      : `BUY · 🪙 ${PRICES[s.id]}¢`;
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
  };
  el('spClose').addEventListener('click', () => prevEl.classList.remove('show'));
  prevEl.addEventListener('click', (ev) => { if (ev.target === prevEl) prevEl.classList.remove('show'); });
  spAct.addEventListener('click', () => {
    const s = prevSkin;
    if (!s) return;
    if (s.streak && !owned.has(s.id)) { audio.hit(); return; }   // earned by coming back
    if (s.cash && !owned.has(s.id)) {
      spAct.textContent = '✨ COMING WITH THE APP STORE BUILD';
      audio.ready();
      setTimeout(refreshPreview, 1800);
      return;
    }
    if (!owned.has(s.id)) {
      if (coins >= PRICES[s.id]) {
        addCoins(-PRICES[s.id]);
        owned.add(s.id);
        localStorage.setItem('voidSkinsOwned', JSON.stringify([...owned]));
        audio.evolve();
      } else { spAct.textContent = `NEED ${PRICES[s.id] - coins}¢ MORE!`; audio.hit(); setTimeout(refreshPreview, 1400); return; }
    }
    equipped = s.id;
    voidling.setSkin(s);
    localStorage.setItem('voidSkin', s.id);
    refresh(); refreshPreview();
  });
  for (const s of SORTED) {
    const card = document.createElement('div');
    card.className = 'skCard' + (s.cash ? ' legend' : s.tex ? ' epic' : '');
    const ribbon = s.cash ? '<div class="rib">LEGENDARY</div>' : s.tex ? '<div class="rib epicRib">EPIC</div>' : '';
    card.innerHTML = `${ribbon}<div class="orb" style="${orbStyle(s)}">${s.art ? '' : FACE_SVG}</div><div class="nm">${s.name}</div><div class="pr"></div>`;
    card.addEventListener('click', () => openPreview(s));
    cards.set(s.id, card);
    grid.appendChild(card);
    if (s.id === equipped) voidling.setSkin(s);
  }
  refresh();
}

function animate() {
  const dt = Math.min(0.05, clock.getDelta());
  tClock += dt;
  island.update(dt, tClock);

  if (started && !ended) {
    matchClock -= dt * clockSpeed;
    timerEl.textContent = fmtTime(matchClock);
    if (matchClock <= 30) {
      timerEl.style.color = '#ff8a8a';
      if (!moments.last30 && !ended) { moments.last30 = true; announce('⏰ 30 SECONDS — EAT FASTER!!'); }
    }
    if (matchClock <= 0) endMatch();
    // the 2D GROWTH LAW: radius can never outrun the clock (disabled for ?r= debug)
    if (!bigStart) {
      // hole.io opening: the first 30s run HOT so the first evolution lands
      // around ~15s and a new player feels growth immediately; then it settles
      const el2 = matchLen - matchClock;
      const lawCap = START_R + 0.022 * Math.min(el2, 30) + LAW_RATE * el2;
      if (voidling.radius > lawCap) voidling.setRadius(lawCap);
      // 2D score-floor: strong scoring pulls your radius up toward the cap
      const scoreFloor = Math.min(lawCap, START_R * (1 + Math.pow(playerScore / 974, 0.57)));
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
      const jm = joy.active ? Math.min(1, joy.mag / 0.58) : 1;
      const speed = Math.min(58, 16 * (camDist / 50)) * jm;
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
    const k = Math.min(1, dt * (driving ? 7.5 : 4.5));
    velX += (tvx - velX) * k;
    velZ += (tvz - velZ) * k;
    const nx = voidState.x + velX * dt, nz = voidState.z + velZ * dt;
    if (island.biomeAt(nx, voidState.z)) voidState.x = nx; else velX = 0;   // slide along the coast
    if (island.biomeAt(voidState.x, nz)) voidState.z = nz; else velZ = 0;
  }
  const vx = (voidState.x - prev.x) / Math.max(1e-4, dt);
  const vz = (voidState.z - prev.z) / Math.max(1e-4, dt);
  prev.x = voidState.x; prev.z = voidState.z;
  { const sp = Math.hypot(vx, vz); if (sp > 4) { aim.x = vx / sp; aim.z = vz / sp; } }

  // powers are PLAYER decisions — auto-fire only exists for the headless demo
  // harness (debug URLs). In a real match nothing ever blasts on its own.
  autoFireCd -= dt;
  if (DEBUG_HARNESS && started && !ended && autoFireCd <= 0 && powerCd <= 0) {
    autoFireCd = rand(2.5, 4.2);
    if (hunger >= COST.collapse) fireCollapse();
    else if (hunger >= COST.gulp) fireGulp();
  }

  const R = voidling.radius;
  voidling.update(dt, { t: tClock, x: voidState.x, z: voidState.z, vx, vz, lookX: THREE.MathUtils.clamp(vx / 40, -1, 1), lookY: THREE.MathUtils.clamp(vz / 40, -1, 1) });
  life.update(dt, tClock, voidState.x, voidState.z, R);
  rivals.update(dt, started && !soloMode ? tClock - startT : 0, voidState.x, voidState.z, R);   // solo: the family never joins
  bubbles.update();
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
      p.y = THREE.MathUtils.lerp(p.y, cy, Math.min(1, dt * 6));
      e.mesh.rotation.x += e.spin.x * dt; e.mesh.rotation.y += e.spin.y * dt; e.mesh.rotation.z += e.spin.z * dt;
      e.mesh.scale.multiplyScalar(1 - dt * 3.4);
      if (e.t >= 1) { spawnPuff(voidState.x, cy, voidState.z, 6); scene.remove(e.mesh); e.eaten = false; e.mesh.visible = false; }
      continue;
    }
    if (!e.mesh.visible) continue;
    const dx = e.mesh.position.x - voidState.x, dz = e.mesh.position.z - voidState.z;
    const d = Math.hypot(dx, dz);
    if (e.radius > R * EAT_RATIO) {
      // too big to eat yet — 2D rule: you pass through, it SHAKES (no weird block)
      if (d < R + e.radius * 0.7 && !(e.mesh.userData.shakeT > 0)) e.mesh.userData.shakeT = 0.45;
      continue;
    }
    if (d < R + e.radius * 0.5) {
      capture(e);
    } else {
      // MAGNET: the void's gravity well scales with its size — anything
      // edible inside ~1.7R visibly drifts in (hole.io's suction fantasy)
      const reach = R * 1.7 + e.radius * 2.4;
      if (d < reach) {
        const pull = (1 - d / reach) * (3.2 + R * 0.55);
        e.mesh.position.x -= (dx / d) * dt * pull;
        e.mesh.position.z -= (dz / d) * dt * pull;
        e.mesh.rotation.z = (dx / d) * Math.min(0.16, (1 - d / reach) * 0.3);   // lean toward the pit
        e.mesh.userData.drifted = true;
      } else if (e.mesh.userData.drifted) {
        // you moved on without eating it — it springs back to its surveyed home
        // (no more flowers and bins stranded in the middle of the street)
        const hx2 = e.home.x - e.mesh.position.x, hz2 = e.home.z - e.mesh.position.z;
        const hd = Math.hypot(hx2, hz2);
        if (hd < 0.1) { e.mesh.position.x = e.home.x; e.mesh.position.z = e.home.z; e.mesh.rotation.z = 0; e.mesh.userData.drifted = false; }
        else {
          const k2 = Math.min(1, dt * 3);
          e.mesh.position.x += hx2 * k2; e.mesh.position.z += hz2 * k2;
          e.mesh.rotation.z *= 1 - k2;
        }
      }
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
    camera.position.set(0, 1120, 0.001);
    camera.lookAt(0, 0, 0);
  } else {
    // CONTINUOUS zoom (hole.io): distance ∝ R^0.78 — the void visibly gains
    // ~20% screen size across a form before the camera catches up, so growth
    // reads every few seconds instead of only at evolutions
    const targetDist = Math.min(300, Math.max(30, 52 * Math.pow(R / 0.9, 0.78)));
    camDist += (targetDist - camDist) * Math.min(1, dt * 1.4);
    tmpV.copy(camOffset).multiplyScalar(camDist).add(new THREE.Vector3(voidState.x, 0, voidState.z));
    camera.position.lerp(tmpV, Math.min(1, dt * 3));
    camera.lookAt(voidState.x, R * 0.5, voidState.z);
  }
  // sun follows the void so shadows stay crisp near the action
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
      evolveEl.classList.remove('show'); void (evolveEl as HTMLElement).offsetWidth; evolveEl.classList.add('show');
    }
    audio.evolve();
    fx.ring(voidState.x, voidState.z, 0xc9a6ff, R * 5, 0.8);
    if (curStage >= 2 && !quests[2].done) questComplete(quests[2]);   // GOBBLER quest
    const wave = defense.setPhase(curStage);   // the city escalates with your form
    if (wave) { announce(wave); audio.alert(); }
    audio.setMusicStage(curStage);             // the soundtrack escalates too
    buzz(45);
  }
  // NEVER downgrade: the growth-law clamp can pull radius back under a form
  // threshold the frame after evolving — re-announcing the same form forever
  voidling.setStage(curStage);

  // combo decays when you stop eating
  comboT -= dt; if (comboT <= 0) combo = 0;

  // the city fights back — apply hits taken / units devoured
  if (started) {
    const defDelta = defense.update(dt, voidState.x, voidState.z, R);
    // a void CANNOT take damage — army fire is fireworks, not a threat.
    // Only positive deltas (devouring the units themselves) reach the score.
    if (defDelta > 0) { questEvent('army'); playerScore += defDelta; }
  }

  // throttle DOM leaderboard updates (~5/s)
  // power-ready toast: celebrate the moment a power charges up
  if (hunger >= COST.gulp && prevHunger < COST.gulp) { floatPos.set(voidState.x, R + 3, voidState.z); bubbles.float(floatPos, 'GULP READY!', true); audio.ready(); }
  if (hunger >= COST.collapse && prevHunger < COST.collapse) { floatPos.set(voidState.x, R + 3, voidState.z); bubbles.float(floatPos, 'COLLAPSE READY!!', true); audio.ready(); }
  prevHunger = hunger;

  // island news: a headline every ~20s, tone tracks the devoured meter
  if (started && !ended) {
    newsCd -= dt;
    if (newsCd <= 0) { newsCd = 17 + Math.random() * 7; showNews(); }
  }

  // the DRAG-to-steer hint retires itself once the player has been driving
  if (started && tClock - lastInput < 1 && tClock - startT > 8) hungerLbl.style.opacity = '0';

  hudCd -= dt;
  if (hudCd <= 0) {
    hudCd = 0.2; refreshHud();
    hungerFill.style.width = `${Math.max(6, Math.round(hunger * 100))}%`;
    hungerEl.classList.toggle('ready', hunger >= COST.gulp);
    pwBtns[0].classList.toggle('off', hunger < COST.gulp || powerCd > 0);
    pwBtns[1].classList.toggle('off', hunger < COST.collapse || powerCd > 0);
    // form progress toward the next evolution
    const lo = FORM_MIN[curStage], hi = FORM_MIN[curStage + 1] ?? R_CAP;
    formFill.style.width = `${Math.round(Math.min(1, (R - lo) / Math.max(0.001, hi - lo)) * 100)}%`;
  }

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

  const shakeOff = fx.update(dt);
  camera.position.add(shakeOff);
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
// total edible mass on the island — the denominator for "% devoured"
initialMass = edibles.reduce((a, e) => a + e.radius, 0);
if (bigStart > 0) voidling.setRadius(bigStart);   // debug: preview a bigger form
refreshHud();

if (ASSETVIEW) { scene.fog = null; buildGallery(scene); camera.position.set(0, 716, 138); camera.lookAt(0, 588, -6); }
else if (TOPDOWN) { camera.position.set(0, 1120, 0.001); camera.lookAt(0, 0, 0); }
else {
  camera.position.copy(camOffset).multiplyScalar(camDist).add(new THREE.Vector3(voidState.x, 0, voidState.z));
  camera.lookAt(voidState.x, voidling.radius * 0.5, voidState.z);
}
animate();
