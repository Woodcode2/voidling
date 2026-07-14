// VOIDLING — 3D PROTOTYPE (Three.js / WebGL)
// The cute VOIDLING void, rebuilt as a faithful 3D port of the 2D star, rolling
// through MAPLE ISLE — the 2D island ported to 3D, floating in cosmic space.
// Void: ./proto3d/void3d · island: ./proto3d/island · palette: ./proto3d/palette
// Standalone page — the main game bundle is untouched.
import * as THREE from 'three';
import { createVoid } from './proto3d/void3d';
import { createIsland } from './proto3d/island';
import { createLife } from './proto3d/life';
import { createBubbles } from './proto3d/bubbles';

// ── renderer / scene / camera ────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(32, window.innerWidth / window.innerHeight, 1, 1400);
let camDist = 82;
const camOffset = new THREE.Vector3(0.62, 0.92, 0.62).normalize();
const TOPDOWN = location.search.includes('top');

// ── lighting ─────────────────────────────────────────────────────────────────
scene.add(new THREE.HemisphereLight(0xdfeaff, 0x6a6a90, 0.95));
const sun = new THREE.DirectionalLight(0xfff2d8, 1.5);
const sunOff = new THREE.Vector3(-55, 95, 42);
sun.position.copy(sunOff);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 10;
sun.shadow.camera.far = 320;
const SH = 120;
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
voidling.setRadius(4);   // start tiny — you're a speck against the island
const voidState = { x: island.spawn.x, z: island.spawn.z };
// debug: jump the void to an event block (?at=plaza|golf|beach|camp)
{
  const at = new URLSearchParams(location.search).get('at');
  const spots: Record<string, [number, number]> = { plaza: [42.75, -42.75], golf: [128.25, -42.75], beach: [-42.75, 213.75], camp: [213.75, -213.75] };
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

// ── input ──────────────────────────────────────────────────────────────────────
const raycaster = new THREE.Raycaster();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const target = new THREE.Vector3(voidState.x, 0, voidState.z);
let dragging = false, lastInput = -9999, tClock = 0;
function pointerTo(ev: PointerEvent) {
  const ndc = new THREE.Vector2((ev.clientX / window.innerWidth) * 2 - 1, -(ev.clientY / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  const hit = new THREE.Vector3();
  if (raycaster.ray.intersectPlane(groundPlane, hit)) { target.copy(hit); lastInput = tClock; }
}
renderer.domElement.addEventListener('pointerdown', (e) => { dragging = true; pointerTo(e); });
renderer.domElement.addEventListener('pointermove', (e) => { if (dragging) pointerTo(e); });
window.addEventListener('pointerup', () => { dragging = false; });
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ── loop ─────────────────────────────────────────────────────────────────────
const sizeEl = document.getElementById('size')!;
const WANDER_R = 230;
let wanderT = 0; const wander = new THREE.Vector3(voidState.x, 0, voidState.z);
const clock = new THREE.Clock();
const prev = { x: voidState.x, z: voidState.z };
const tmpV = new THREE.Vector3();

function animate() {
  const dt = Math.min(0.05, clock.getDelta());
  tClock += dt;
  island.update(dt, tClock);

  if (tClock - lastInput > 1.2) {
    wanderT -= dt;
    if (wanderT <= 0) {
      wanderT = rand(0.9, 1.8);
      // hunt the nearest un-eaten morsel so the demo void keeps feeding + growing
      let best: Edible | null = null, bd = Infinity;
      for (const e of edibles) {
        if (e.eaten || !e.mesh.visible) continue;
        const dx = e.mesh.position.x - voidState.x, dz = e.mesh.position.z - voidState.z;
        const d = dx * dx + dz * dz;
        if (d < bd) { bd = d; best = e; }
      }
      if (best) wander.set(best.mesh.position.x, 0, best.mesh.position.z);
      else wander.set(rand(-WANDER_R, WANDER_R), 0, rand(-WANDER_R, WANDER_R));
    }
    target.lerp(wander, 0.1);
  }
  voidState.x += (target.x - voidState.x) * Math.min(1, dt * 2.4);
  voidState.z += (target.z - voidState.z) * Math.min(1, dt * 2.4);
  const vx = (voidState.x - prev.x) / Math.max(1e-4, dt);
  const vz = (voidState.z - prev.z) / Math.max(1e-4, dt);
  prev.x = voidState.x; prev.z = voidState.z;

  const R = voidling.radius;
  voidling.update(dt, { t: tClock, x: voidState.x, z: voidState.z, vx, vz, lookX: THREE.MathUtils.clamp(vx / 40, -1, 1), lookY: THREE.MathUtils.clamp(vz / 40, -1, 1) });
  life.update(dt, tClock, voidState.x, voidState.z, R);
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
    const dx = e.mesh.position.x - voidState.x, dz = e.mesh.position.z - voidState.z;
    const d = Math.hypot(dx, dz);
    if (d < R + e.radius * 0.5) {
      e.eaten = true; e.t = 0; e.orbit = Math.atan2(dz, dx); e.orbitR = Math.max(R * 0.6, d);
      e.mesh.userData.eaten = true;
      e.spin.set(rand(-6, 6), rand(-6, 6), rand(-6, 6));
      voidling.setRadius(Math.min(70, R + e.radius * 0.08));
      spawnPuff(e.mesh.position.x, cy, e.mesh.position.z, 3);
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
    camDist += ((62 + R * 4.0) - camDist) * dt * 1.5;
    tmpV.copy(camOffset).multiplyScalar(camDist).add(new THREE.Vector3(voidState.x, 0, voidState.z));
    camera.position.lerp(tmpV, Math.min(1, dt * 3));
    camera.lookAt(voidState.x, R * 0.5, voidState.z);
  }
  // sun follows the void so shadows stay crisp near the action
  sun.position.set(voidState.x + sunOff.x, sunOff.y, voidState.z + sunOff.z);
  sun.target.position.set(voidState.x, 0, voidState.z);

  sizeEl.textContent = `${Math.round(R * 1.6)}m`;
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
if (TOPDOWN) { camera.position.set(0, 1120, 0.001); camera.lookAt(0, 0, 0); }
else {
  camera.position.copy(camOffset).multiplyScalar(camDist).add(new THREE.Vector3(voidState.x, 0, voidState.z));
  camera.lookAt(voidState.x, voidling.radius * 0.5, voidState.z);
}
animate();
