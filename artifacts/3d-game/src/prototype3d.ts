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
import { SKINS } from './proto3d/palette';

// ── renderer / scene / camera ────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
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
let camDist = 28;
const camOffset = new THREE.Vector3(0.62, 0.92, 0.62).normalize();
const TOPDOWN = location.search.includes('top');

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
const SH = 165;
sun.shadow.camera.left = -SH; sun.shadow.camera.right = SH;
sun.shadow.camera.top = SH; sun.shadow.camera.bottom = -SH;
sun.shadow.bias = -0.0004;
scene.add(sun); scene.add(sun.target);

// ── edibles + island ─────────────────────────────────────────────────────────
interface Edible { mesh: THREE.Object3D; radius: number; eaten: boolean; t: number; orbit: number; orbitR: number; spin: THREE.Vector3; }
const edibles: Edible[] = [];
const rand = (a: number, b: number) => a + Math.random() * (b - a);
function addEdible(mesh: THREE.Object3D, radius: number) {
  edibles.push({ mesh, radius, eaten: false, t: 0, orbit: 0, orbitR: 0, spin: new THREE.Vector3() });
}

const island = createIsland(scene, addEdible);
const bubbles = createBubbles(camera);
const life = createLife(scene, addEdible, island.biomeAt, bubbles.say);
const rivals = createRivals(scene, camera, edibles, island.biomeAt, 4);
const fx = createFx(scene);
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
  const spots: Record<string, [number, number]> = { plaza: [42.75, -42.75], golf: [128.25, -42.75], beach: [-42.75, 213.75], camp: [213.75, -213.75], cozy: [-128.25, -128.25] };
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
window.addEventListener('keydown', (e) => { if (MOVE_KEYS.includes(e.code)) { keys.add(e.code); lastInput = tClock; } });
window.addEventListener('keyup', (e) => keys.delete(e.code));
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ── match state + HUD ─────────────────────────────────────────────────────────
const el = (id: string) => document.getElementById(id)!;
const timerEl = el('timer'), devEl = el('devoured'), boardEl = el('board'), formEl = el('form');
const evolveEl = el('evolve'), endEl = el('end'), endHd = el('endHd'), endSub = el('endSub'), endList = el('endList');
const bannerEl = el('banner'), hungerEl = el('hunger'), hungerFill = hungerEl.querySelector('.fill') as HTMLElement;

function announce(text: string) {
  bannerEl.textContent = text;
  bannerEl.classList.remove('show'); void bannerEl.offsetWidth; bannerEl.classList.add('show');
}

// ── powers (hunger meter) ────────────────────────────────────────────────────
let hunger = 0;
const COST = { gulp: 0.35, rocket: 0.45, collapse: 1.0 };
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
const LAW_RATE = 0.0525;                // 2D 1.05/s · 0.05 — cap ≈ 11.9 at the 3:30 whistle
const growRadius = (R: number, eR: number) => {
  const rookie = R < 1.7 ? 1.6 : R < 2.5 ? 1.3 : 1;   // 2D: <34 → 1.6, <50 → 1.3
  const diminish = Math.sqrt(START_R / Math.max(START_R, R));
  return Math.min(R_CAP, Math.sqrt(R * R + 0.5 * eR * eR * rookie * diminish));
};

const _q = new URLSearchParams(location.search);
const MATCH_LEN = Number(_q.get('len')) || 210;                // 3:30 (?len=N to shorten)
const clockSpeed = _q.has('fast') ? 6 : 1;                     // ?fast to speed the clock
const bigStart = Number(_q.get('r')) || 0;                     // ?r=N debug: start big
let matchClock = MATCH_LEN, ended = false, playerScore = 0, curStage = 0;
let initialMass = 0;                   // set once, after the world is built
let hudCd = 0;

const WANDER_R = 230;
let wanderT = 0; const wander = new THREE.Vector3(voidState.x, 0, voidState.z);
const clock = new THREE.Clock();
const prev = { x: voidState.x, z: voidState.z };
const tmpV = new THREE.Vector3();
const fwdTmp = new THREE.Vector3(), rightTmp = new THREE.Vector3();

function fmtTime(s: number) { s = Math.max(0, Math.ceil(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }

function refreshHud() {
  const R = voidling.radius;
  // leaderboard: player + rivals, ranked by score
  const rows = [{ name: 'You', color: PLAYER_COLOR, score: playerScore, me: true },
    ...rivals.list.map((r) => ({ name: r.name, color: r.color, score: r.score, me: false }))]
    .sort((a, b) => b.score - a.score);
  boardEl.innerHTML = rows.map((r, i) =>
    `<div class="row ${r.me ? 'me' : ''}"><span>${i + 1}</span><span class="dot" style="background:#${r.color.toString(16).padStart(6, '0')}"></span><span class="nm">${r.name}</span><span class="sc">${Math.round(r.score)}</span></div>`).join('');
  const consumed = playerScore + rivals.list.reduce((a, r) => a + r.score, 0);
  devEl.textContent = `${Math.min(100, Math.round((consumed / Math.max(1, initialMass)) * 100))}% DEVOURED`;
  formEl.textContent = `${FORMS[curStage]} · ${Math.round(R * 1.6)}m`;
}

function endMatch() {
  ended = true;
  const rows = [{ name: 'You', color: PLAYER_COLOR, score: playerScore, me: true },
    ...rivals.list.map((r) => ({ name: r.name, color: r.color, score: r.score, me: false }))]
    .sort((a, b) => b.score - a.score);
  const myRank = rows.findIndex((r) => r.me) + 1;
  endHd.textContent = myRank === 1 ? 'YOU WIN!' : `#${myRank} PLACE`;
  endSub.textContent = myRank === 1 ? 'the island belongs to the void' : `${rows[0].name} devoured the most`;
  endList.innerHTML = rows.map((r, i) =>
    `<div class="er ${r.me ? 'me' : ''}"><span>${i + 1}</span><span class="dot" style="background:#${r.color.toString(16).padStart(6, '0')}"></span><span class="nm">${r.name}</span><span class="sc">${Math.round(r.score)}</span></div>`).join('');
  endEl.classList.add('show');
}

// devour one edible: spiral it in, grow, score, (optionally) charge hunger
let combo = 0, comboT = 0;
function capture(e: Edible, giveHunger = true) {
  const dx = e.mesh.position.x - voidState.x, dz = e.mesh.position.z - voidState.z;
  const d = Math.hypot(dx, dz) || 1;
  e.eaten = true; e.t = 0; e.orbit = Math.atan2(dz, dx); e.orbitR = Math.max(voidling.radius * 0.6, d);
  e.mesh.userData.eaten = true;
  e.spin.set(rand(-6, 6), rand(-6, 6), rand(-6, 6));
  voidling.setRadius(growRadius(voidling.radius, e.radius));   // area-based growth
  playerScore += e.radius;
  if (giveHunger) hunger = Math.min(1, hunger + 0.03);
  spawnPuff(e.mesh.position.x, voidling.group.position.y, e.mesh.position.z, 3);
  voidling.chomp();
  combo++; comboT = 1.2;
  if (e.radius > voidling.radius * 0.6) audio.bigEat(); else audio.pop(combo);
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
function fireGulp() {
  if (hunger < COST.gulp || powerCd > 0) return;
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
}
function fireRocket() {
  if (hunger < COST.rocket || powerCd > 0) return;
  hunger -= COST.rocket; powerCd = 0.6;
  dashT = 0.55; dashDir.x = aim.x; dashDir.z = aim.z;
  voidling.animDash(); audio.rocket();
  fx.ring(voidState.x, voidState.z, 0xff9f4d, voidling.radius * 4, 0.4);
  announce('ROCKET BITE!');
}
function fireCollapse() {
  if (hunger < COST.collapse || powerCd > 0) return;
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
}
window.addEventListener('keydown', (e) => {
  if (e.code === 'Digit1') fireGulp();
  else if (e.code === 'Digit2') fireRocket();
  else if (e.code === 'Digit3') fireCollapse();
});
// touch power buttons
const pwBtns = [el('pw1'), el('pw2'), el('pw3')];
pwBtns[0].addEventListener('click', fireGulp);
pwBtns[1].addEventListener('click', fireRocket);
pwBtns[2].addEventListener('click', fireCollapse);

// skin swatches — recolour the void live, remembered across sessions
{
  const row = el('skins');
  const saved = localStorage.getItem('voidSkin') || 'classic';
  for (const s of SKINS) {
    const btn = document.createElement('button');
    btn.title = s.name;
    btn.style.background = `radial-gradient(circle at 38% 34%, #${s.rim.toString(16).padStart(6, '0')}, #${s.mid.toString(16).padStart(6, '0')} 60%, #${s.abyss.toString(16).padStart(6, '0')})`;
    btn.addEventListener('click', () => {
      voidling.setSkin(s);
      localStorage.setItem('voidSkin', s.id);
      row.querySelectorAll('button').forEach((b) => b.classList.remove('sel'));
      btn.classList.add('sel');
    });
    if (s.id === saved) { voidling.setSkin(s); btn.classList.add('sel'); }
    row.appendChild(btn);
  }
}

function animate() {
  const dt = Math.min(0.05, clock.getDelta());
  tClock += dt;
  island.update(dt, tClock);

  if (!ended) {
    matchClock -= dt * clockSpeed;
    timerEl.textContent = fmtTime(matchClock);
    if (matchClock <= 30) timerEl.style.color = '#ff8a8a';
    if (matchClock <= 0) endMatch();
    // the 2D GROWTH LAW: radius can never outrun the clock (disabled for ?r= debug)
    if (!bigStart) {
      const lawCap = START_R + LAW_RATE * (MATCH_LEN - matchClock);
      if (voidling.radius > lawCap) voidling.setRadius(lawCap);
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
  } else if (driving) {
    // camera-relative drive: screen-up = away from camera, screen-right = camera right
    camera.getWorldDirection(fwdTmp); fwdTmp.y = 0; fwdTmp.normalize();
    rightTmp.set(1, 0, 0).applyQuaternion(camera.quaternion); rightTmp.y = 0; rightTmp.normalize();
    const speed = 15 * (1 + curStage * 0.08) * (joy.active ? joy.mag : 1);
    const wdx = rightTmp.x * inX - fwdTmp.x * inY;
    const wdz = rightTmp.z * inX - fwdTmp.z * inY;
    const nx = voidState.x + wdx * speed * dt, nz = voidState.z + wdz * speed * dt;
    if (island.biomeAt(nx, voidState.z)) voidState.x = nx;   // slide along the coast
    if (island.biomeAt(voidState.x, nz)) voidState.z = nz;
  } else if (tClock - lastInput > 4) {
    // attract mode: after 4s idle the void hunts snacks on its own (also drives
    // the headless demo/verification harness)
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
    if (dm > 1.5) {
      const spd = 13 * Math.min(1, dm / 10);
      const nx = voidState.x + (ddx / dm) * spd * dt, nz = voidState.z + (ddz / dm) * spd * dt;
      if (island.biomeAt(nx, voidState.z)) voidState.x = nx;
      if (island.biomeAt(voidState.x, nz)) voidState.z = nz;
    }
  }
  const vx = (voidState.x - prev.x) / Math.max(1e-4, dt);
  const vz = (voidState.z - prev.z) / Math.max(1e-4, dt);
  prev.x = voidState.x; prev.z = voidState.z;
  { const sp = Math.hypot(vx, vz); if (sp > 4) { aim.x = vx / sp; aim.z = vz / sp; } }

  // auto-fire powers when charged (demo AI; keys 1/2/3 also work)
  autoFireCd -= dt;
  if (!ended && autoFireCd <= 0 && powerCd <= 0) {
    autoFireCd = rand(2.5, 4.2);
    if (hunger >= COST.collapse) fireCollapse();
    else if (hunger >= COST.rocket && Math.random() < 0.5) fireRocket();
    else if (hunger >= COST.gulp) fireGulp();
  }

  const R = voidling.radius;
  voidling.update(dt, { t: tClock, x: voidState.x, z: voidState.z, vx, vz, lookX: THREE.MathUtils.clamp(vx / 40, -1, 1), lookY: THREE.MathUtils.clamp(vz / 40, -1, 1) });
  life.update(dt, tClock, voidState.x, voidState.z, R);
  rivals.update(dt, tClock, voidState.x, voidState.z, R);
  bubbles.update();
  const cy = voidling.group.position.y;

  for (const e of edibles) {
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
    if (e.radius > R * EAT_RATIO) continue;   // too big to eat yet — it blocks you
    const dx = e.mesh.position.x - voidState.x, dz = e.mesh.position.z - voidState.z;
    const d = Math.hypot(dx, dz);
    if (d < R + e.radius * 0.5) {
      capture(e);
    } else if (d < R + e.radius * 2.4) {
      const pull = (R + e.radius * 2.4 - d) * 1.4;
      e.mesh.position.x -= (dx / d) * dt * pull;
      e.mesh.position.z -= (dz / d) * dt * pull;
    }
  }

  const pa = puffGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < PUFF; i++) if (puffLife[i] > 0) {
    puffLife[i] -= dt; puffVel[i].y -= dt * 14;
    puffPos[i * 3] += puffVel[i].x * dt; puffPos[i * 3 + 1] += puffVel[i].y * dt; puffPos[i * 3 + 2] += puffVel[i].z * dt;
    if (puffLife[i] <= 0) puffPos[i * 3 + 1] = -999;
  }
  pa.needsUpdate = true;

  // camera
  if (TOPDOWN) {
    camera.position.set(0, 1120, 0.001);
    camera.lookAt(0, 0, 0);
  } else {
    camDist += ((20 + R * 6.0) - camDist) * dt * 1.6;
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
    evolveEl.querySelector('.big')!.textContent = FORMS[curStage];
    evolveEl.classList.remove('show'); void (evolveEl as HTMLElement).offsetWidth; evolveEl.classList.add('show');
    audio.evolve();
    fx.ring(voidState.x, voidState.z, 0xc9a6ff, R * 5, 0.8);
    const wave = defense.setPhase(curStage);   // the city escalates with your form
    if (wave) { announce(wave); audio.alert(); }
  } else curStage = ns;
  voidling.setStage(curStage);

  // combo decays when you stop eating
  comboT -= dt; if (comboT <= 0) combo = 0;

  // the city fights back — apply hits taken / units devoured
  const defDelta = defense.update(dt, voidState.x, voidState.z, R);
  if (defDelta < 0) audio.hit();
  playerScore += defDelta;
  if (playerScore < 0) playerScore = 0;

  // throttle DOM leaderboard updates (~5/s)
  hudCd -= dt;
  if (hudCd <= 0) {
    hudCd = 0.2; refreshHud();
    hungerFill.style.width = `${Math.round(hunger * 100)}%`;
    hungerEl.classList.toggle('ready', hunger >= COST.gulp);
    pwBtns[0].classList.toggle('off', hunger < COST.gulp || powerCd > 0);
    pwBtns[1].classList.toggle('off', hunger < COST.rocket || powerCd > 0);
    pwBtns[2].classList.toggle('off', hunger < COST.collapse || powerCd > 0);
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

if (TOPDOWN) { camera.position.set(0, 1120, 0.001); camera.lookAt(0, 0, 0); }
else {
  camera.position.copy(camOffset).multiplyScalar(camDist).add(new THREE.Vector3(voidState.x, 0, voidState.z));
  camera.lookAt(voidState.x, voidling.radius * 0.5, voidState.z);
}
animate();
