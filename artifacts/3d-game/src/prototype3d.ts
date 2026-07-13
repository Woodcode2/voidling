// VOIDLING — 3D PROTOTYPE (Three.js / WebGL)
// A standalone proof-of-concept: an isometric low-poly city with real lighting,
// real shadows, and a REAL 3D hole that grows and swallows the world. No external
// assets — every mesh is procedural geometry. This is here to show the visual
// leap vs the Canvas-2D game; the game logic is unchanged and portable.
import * as THREE from 'three';

const PALETTE = {
  sky: 0xbfe8ff,
  ground: 0xdbe0e7,
  road: 0x6a7482,
  roadLine: 0xf2f4f8,
  grass: 0x86cf7e,
  buildings: [0xff8a7a, 0x5ec8d8, 0xf7c85a, 0x8fa9d8, 0xf6efe2, 0xb98cff, 0x7ed57a, 0xff9fbf],
  roof: 0x4a5670,
  car: [0xff5a4d, 0x2f9bd8, 0xffd23f, 0x7ed57a, 0xf06fb0, 0xf2f4f8],
  tree: 0x4faa5a,
  trunk: 0x8a6a4a,
  person: [0xff7a5a, 0x5ec8d8, 0xffd23f, 0x8fa9d8, 0xf06fb0, 0x9b7bd8],
  voidRim: 0x7b4fe0,
};

// ── renderer / scene / camera ────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(PALETTE.sky);
scene.fog = new THREE.Fog(PALETTE.sky, 120, 320);

// Slightly-perspective iso camera (Hole.io look): high, angled, follows the hole.
const camera = new THREE.PerspectiveCamera(32, window.innerWidth / window.innerHeight, 1, 800);
let camDist = 90;
const camOffset = new THREE.Vector3(0.62, 0.9, 0.62).normalize();

// ── lighting (the "dialed in" part) ──────────────────────────────────────────
scene.add(new THREE.HemisphereLight(0xffffff, 0x9fb0c8, 0.85));
const sun = new THREE.DirectionalLight(0xfff2d8, 1.55);
sun.position.set(-60, 90, 40);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 10;
sun.shadow.camera.far = 320;
const SH = 130;
sun.shadow.camera.left = -SH; sun.shadow.camera.right = SH;
sun.shadow.camera.top = SH; sun.shadow.camera.bottom = -SH;
sun.shadow.bias = -0.0004;
scene.add(sun);
scene.add(sun.target);

// ── ground + roads ───────────────────────────────────────────────────────────
const GRID = 6;          // blocks per side
const BLOCK = 34;        // block size (world units)
const ROAD = 12;         // road width
const CELL = BLOCK + ROAD;
const HALF = (GRID * CELL) / 2;

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(GRID * CELL + 80, GRID * CELL + 80),
  new THREE.MeshStandardMaterial({ color: PALETTE.ground, roughness: 0.95 }),
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// road strips (dark) + dashed centre lines, laid on the grid lines
const roadMat = new THREE.MeshStandardMaterial({ color: PALETTE.road, roughness: 1 });
const lineMat = new THREE.MeshStandardMaterial({ color: PALETTE.roadLine, roughness: 1 });
for (let i = 0; i <= GRID; i++) {
  const p = -HALF + i * CELL - ROAD / 2 + CELL / 2 - BLOCK / 2 - ROAD / 2;
  const c = -HALF + i * CELL - ROAD / 2;
  for (const axis of ['h', 'v'] as const) {
    const road = new THREE.Mesh(new THREE.PlaneGeometry(GRID * CELL + 80, ROAD), roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.y = 0.02;
    if (axis === 'h') { road.position.z = c; } else { road.rotation.z = Math.PI / 2; road.position.x = c; }
    road.receiveShadow = true;
    scene.add(road);
    for (let d = -HALF; d < HALF; d += 9) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(4, 1.1), lineMat);
      dash.rotation.x = -Math.PI / 2; dash.position.y = 0.04;
      if (axis === 'h') { dash.position.set(d + 2, 0.04, c); }
      else { dash.rotation.z = Math.PI / 2; dash.position.set(c, 0.04, d + 2); }
      scene.add(dash);
    }
  }
  void p;
}

// ── world objects (edible) ───────────────────────────────────────────────────
interface Edible { mesh: THREE.Object3D; radius: number; eaten: boolean; fall: number; }
const edibles: Edible[] = [];
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

function addEdible(mesh: THREE.Object3D, radius: number) {
  mesh.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  scene.add(mesh);
  edibles.push({ mesh, radius, eaten: false, fall: 0 });
}

function makeBuilding(): THREE.Group {
  const g = new THREE.Group();
  const w = rand(9, 15), depth = rand(9, 15), h = rand(10, 40);
  const bodyMat = new THREE.MeshStandardMaterial({ color: pick(PALETTE.buildings), roughness: 0.75, flatShading: true });
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, depth), bodyMat);
  body.position.y = h / 2;
  g.add(body);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(w * 1.02, 1.4, depth * 1.02),
    new THREE.MeshStandardMaterial({ color: PALETTE.roof, roughness: 0.7 }));
  roof.position.y = h + 0.6;
  g.add(roof);
  // window rows (thin dark insets on the front + side)
  const winMat = new THREE.MeshStandardMaterial({ color: 0x2c3a52, roughness: 0.4, metalness: 0.1 });
  const rows = Math.max(1, Math.floor(h / 6));
  for (let r = 0; r < rows; r++) {
    for (let c = -1; c <= 1; c++) {
      const win = new THREE.Mesh(new THREE.BoxGeometry(2.4, 3, 0.3), winMat);
      win.position.set(c * (w / 3.2), 5 + r * 6, depth / 2 + 0.05);
      g.add(win);
      const win2 = win.clone(); win2.position.set(w / 2 + 0.05, 5 + r * 6, c * (depth / 3.2)); win2.rotation.y = Math.PI / 2;
      g.add(win2);
    }
  }
  return g;
}

function makeTree(): THREE.Group {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 4, 6),
    new THREE.MeshStandardMaterial({ color: PALETTE.trunk, roughness: 1, flatShading: true }));
  trunk.position.y = 2; g.add(trunk);
  const foliage = new THREE.Mesh(new THREE.IcosahedronGeometry(3.4, 0),
    new THREE.MeshStandardMaterial({ color: PALETTE.tree, roughness: 0.9, flatShading: true }));
  foliage.position.y = 6; g.add(foliage);
  return g;
}

function makeCar(): THREE.Group {
  const g = new THREE.Group();
  const col = pick(PALETTE.car);
  const body = new THREE.Mesh(new THREE.BoxGeometry(6.2, 2.2, 3),
    new THREE.MeshStandardMaterial({ color: col, roughness: 0.4, metalness: 0.15, flatShading: true }));
  body.position.y = 1.6; g.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.8, 2.6),
    new THREE.MeshStandardMaterial({ color: 0xbfeaff, roughness: 0.2, metalness: 0.3 }));
  cabin.position.set(-0.4, 3, 0); g.add(cabin);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x20242c, roughness: 0.9 });
  for (const sx of [-1.9, 1.9]) for (const sz of [-1.4, 1.4]) {
    const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.7, 10), wheelMat);
    wh.rotation.x = Math.PI / 2; wh.position.set(sx, 0.9, sz); g.add(wh);
  }
  return g;
}

function makePerson(): THREE.Group {
  const g = new THREE.Group();
  const col = pick(PALETTE.person);
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.9, 1.8, 3, 8),
    new THREE.MeshStandardMaterial({ color: col, roughness: 0.8 }));
  body.position.y = 1.9; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.85, 12, 10),
    new THREE.MeshStandardMaterial({ color: 0xf4c9a0, roughness: 0.7 }));
  head.position.y = 3.5; g.add(head);
  return g;
}

// Populate each block with a mix
for (let bx = 0; bx < GRID; bx++) {
  for (let bz = 0; bz < GRID; bz++) {
    const cx = -HALF + bx * CELL + CELL / 2 - ROAD / 2;
    const cz = -HALF + bz * CELL + CELL / 2 - ROAD / 2;
    const isPark = Math.random() < 0.18;
    if (isPark) {
      const park = new THREE.Mesh(new THREE.BoxGeometry(BLOCK, 0.4, BLOCK),
        new THREE.MeshStandardMaterial({ color: PALETTE.grass, roughness: 1 }));
      park.position.set(cx, 0.2, cz); park.receiveShadow = true; scene.add(park);
      for (let t = 0; t < 5; t++) { const tr = makeTree(); tr.position.set(cx + rand(-11, 11), 0.4, cz + rand(-11, 11)); addEdible(tr, 4); }
    } else {
      const n = 1 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) {
        const b = makeBuilding();
        b.position.set(cx + rand(-7, 7), 0, cz + rand(-7, 7));
        b.rotation.y = Math.random() < 0.5 ? 0 : Math.PI / 2;
        addEdible(b, 8);
      }
      for (let t = 0; t < 2; t++) { const tr = makeTree(); tr.position.set(cx + rand(-13, 13), 0.4, cz + rand(-13, 13)); addEdible(tr, 4); }
    }
  }
}
// cars on roads + people on sidewalks
for (let i = 0; i < 40; i++) {
  const onH = Math.random() < 0.5;
  const line = -HALF + Math.floor(rand(0, GRID + 1)) * CELL - ROAD / 2;
  const along = rand(-HALF, HALF);
  const car = makeCar();
  if (onH) { car.position.set(along, 0, line + (Math.random() < 0.5 ? 3 : -3)); }
  else { car.position.set(line + (Math.random() < 0.5 ? 3 : -3), 0, along); car.rotation.y = Math.PI / 2; }
  addEdible(car, 4);
}
for (let i = 0; i < 55; i++) {
  const p = makePerson();
  p.position.set(rand(-HALF, HALF), 0, rand(-HALF, HALF));
  addEdible(p, 2.4);
}

// ── THE HOLE (the star) ──────────────────────────────────────────────────────
const hole = new THREE.Group();
scene.add(hole);
let holeR = 7;
const holeState = { x: 0, z: 0 };

// pit: an open black cylinder (inner walls visible = depth) + a dark floor disc
const PIT_DEPTH = 40;
const pitWall = new THREE.Mesh(
  new THREE.CylinderGeometry(1, 1, PIT_DEPTH, 48, 1, true),
  new THREE.MeshBasicMaterial({ color: 0x05060a, side: THREE.BackSide }),
);
pitWall.position.y = -PIT_DEPTH / 2 + 0.05;
hole.add(pitWall);
const pitFloor = new THREE.Mesh(new THREE.CircleGeometry(1, 48), new THREE.MeshBasicMaterial({ color: 0x05060a }));
pitFloor.rotation.x = -Math.PI / 2; pitFloor.position.y = -PIT_DEPTH + 0.1; hole.add(pitFloor);
// black opening disc just above the ground — this is what makes it read as a
// HOLE (covers the opaque ground inside the rim; things vanish under it).
const pitTop = new THREE.Mesh(new THREE.CircleGeometry(1, 48),
  new THREE.MeshBasicMaterial({ color: 0x08060f }));
pitTop.rotation.x = -Math.PI / 2; pitTop.position.y = 0.06; hole.add(pitTop);
// a soft dark inner-shadow ring at the lip for depth
const lip = new THREE.Mesh(new THREE.RingGeometry(0.72, 1, 48),
  new THREE.MeshBasicMaterial({ color: 0x1a1330, transparent: true, opacity: 0.55 }));
lip.rotation.x = -Math.PI / 2; lip.position.y = 0.07; hole.add(lip);
// rim ring (brand blue-purple) + a soft inner shadow disc so the lip reads
const rim = new THREE.Mesh(new THREE.TorusGeometry(1, 0.09, 12, 48),
  new THREE.MeshStandardMaterial({ color: PALETTE.voidRim, roughness: 0.5, emissive: 0x3a1e6b, emissiveIntensity: 0.4 }));
rim.rotation.x = -Math.PI / 2; rim.position.y = 0.12; hole.add(rim);
// cute VOIDLING eyes floating just inside the near lip (keeps our identity)
const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
const pupilMat = new THREE.MeshStandardMaterial({ color: 0x1a1030, roughness: 0.3 });
const eyeL = new THREE.Group(), eyeR = new THREE.Group();
for (const [grp, sx] of [[eyeL, -0.32], [eyeR, 0.32]] as const) {
  const white = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), eyeMat);
  const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), pupilMat);
  pupil.position.set(0, 0, 0.13); grp.add(white); grp.add(pupil);
  grp.position.set(sx, 0.35, 0.45); hole.add(grp);
  void sx;
}

function updateHoleMesh() {
  hole.scale.set(holeR, 1, holeR);
  // keep eyes/rim proportional-ish (scale group scales children; counter-scale eyes a touch)
  const es = 1 / Math.max(1, holeR * 0.14);
  eyeL.scale.setScalar(es); eyeR.scale.setScalar(es);
}
updateHoleMesh();

// ── input: drag to move the hole; auto-wander when idle ──────────────────────
const raycaster = new THREE.Raycaster();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const target = new THREE.Vector3(0, 0, 0);
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
let wanderT = 0; const wander = new THREE.Vector3();
const clock = new THREE.Clock();

function animate() {
  const dt = Math.min(0.05, clock.getDelta());
  tClock += dt;

  // auto-wander after 1.5s idle so the demo is always alive
  if (tClock - lastInput > 1.5) {
    wanderT -= dt;
    if (wanderT <= 0) { wanderT = rand(1.5, 3); wander.set(rand(-HALF * 0.8, HALF * 0.8), 0, rand(-HALF * 0.8, HALF * 0.8)); }
    target.lerp(wander, 0.02);
  }
  // move hole toward target
  holeState.x += (target.x - holeState.x) * Math.min(1, dt * 2.4);
  holeState.z += (target.z - holeState.z) * Math.min(1, dt * 2.4);
  hole.position.set(holeState.x, 0, holeState.z);

  // eat: pull nearby edibles in, then tumble them down the pit
  for (const e of edibles) {
    if (e.eaten) {
      e.fall += dt;
      const p = e.mesh.position;
      p.x += (holeState.x - p.x) * Math.min(1, dt * 8);
      p.z += (holeState.z - p.z) * Math.min(1, dt * 8);
      p.y -= dt * 40;
      e.mesh.rotation.x += dt * 6; e.mesh.rotation.z += dt * 5;
      e.mesh.scale.multiplyScalar(1 - dt * 2.2);
      if (e.fall > 0.9) { scene.remove(e.mesh); e.eaten = false; e.mesh.visible = false; }
      continue;
    }
    if (!e.mesh.visible) continue;
    const dx = e.mesh.position.x - holeState.x, dz = e.mesh.position.z - holeState.z;
    const d = Math.hypot(dx, dz);
    if (d < holeR + e.radius * 0.4) {
      e.eaten = true; e.fall = 0;
      holeR = Math.min(60, holeR + e.radius * 0.05); // grow
      updateHoleMesh();
    } else if (d < holeR + e.radius * 2.2) {
      // teeter toward the rim before the plunge
      e.mesh.position.x -= (dx / d) * dt * (holeR + e.radius * 2.2 - d) * 1.2;
      e.mesh.position.z -= (dz / d) * dt * (holeR + e.radius * 2.2 - d) * 1.2;
    }
  }

  // camera follows + eases out as the hole grows
  camDist += ((70 + holeR * 2.4) - camDist) * dt * 1.5;
  const camPos = new THREE.Vector3().copy(camOffset).multiplyScalar(camDist).add(new THREE.Vector3(holeState.x, 0, holeState.z));
  camera.position.lerp(camPos, Math.min(1, dt * 3));
  camera.lookAt(holeState.x, 0, holeState.z);
  sun.target.position.set(holeState.x, 0, holeState.z);

  sizeEl.textContent = `${Math.round(holeR * 1.6)}m`;
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();
