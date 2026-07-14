// VOIDLING — 3D PROTOTYPE (Three.js / WebGL)
// A standalone proof-of-concept: an isometric low-poly city with real lighting,
// real shadows, and the star of the show — the cute VOIDLING void sphere: a
// dark glossy orb with a glowing purple rim, a billboarded smiling face, and a
// hungry pull that sucks the whole world in and grows. No external assets —
// every mesh is procedural geometry.
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
  // brand void
  voidBody: 0x1b0f36,
  voidCore: 0x2a1656,
  voidGlow: 0xb388ff,
  voidRim: 0x8a5cff,
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

// Slightly-perspective iso camera (Hole.io look): high, angled, follows the void.
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
}

// ── world objects (edible) ───────────────────────────────────────────────────
interface Edible {
  mesh: THREE.Object3D;
  radius: number;
  eaten: boolean;
  t: number;          // absorb progress 0..1
  orbit: number;      // orbit angle at capture
  orbitR: number;     // orbit radius at capture
  spin: THREE.Vector3;
}
const edibles: Edible[] = [];
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

function addEdible(mesh: THREE.Object3D, radius: number) {
  mesh.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  scene.add(mesh);
  edibles.push({ mesh, radius, eaten: false, t: 0, orbit: 0, orbitR: 0, spin: new THREE.Vector3() });
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

// ── THE VOIDLING (the star) ──────────────────────────────────────────────────
const voidGroup = new THREE.Group();
scene.add(voidGroup);
let voidR = 6;                        // world radius of the void
const voidState = { x: 0, z: 0 };
const bob = new THREE.Group();        // holds body + face; we squash/bob this
voidGroup.add(bob);

// body: a dark glossy orb (deep indigo, near-black), lit so highlights read glossy
const bodyMat = new THREE.MeshStandardMaterial({
  color: PALETTE.voidBody,
  roughness: 0.18,
  metalness: 0.35,
  emissive: PALETTE.voidCore,
  emissiveIntensity: 0.35,
});
const body = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 40), bodyMat);
bob.add(body);

// fresnel rim glow — a slightly larger inverted sphere, additive, so the void
// edge always halos in brand purple regardless of the sun angle.
const fresnelMat = new THREE.ShaderMaterial({
  transparent: true,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  side: THREE.BackSide,
  uniforms: {
    uColor: { value: new THREE.Color(PALETTE.voidGlow) },
    uPower: { value: 2.6 },
    uIntensity: { value: 1.15 },
  },
  vertexShader: `
    varying vec3 vN; varying vec3 vView;
    void main(){
      vN = normalize(normalMatrix * normal);
      vec4 mv = modelViewMatrix * vec4(position,1.0);
      vView = normalize(-mv.xyz);
      gl_Position = projectionMatrix * mv;
    }
  `,
  fragmentShader: `
    varying vec3 vN; varying vec3 vView;
    uniform vec3 uColor; uniform float uPower; uniform float uIntensity;
    void main(){
      float f = pow(1.0 - abs(dot(normalize(vN), normalize(vView))), uPower);
      gl_FragColor = vec4(uColor, f * uIntensity);
    }
  `,
});
const fresnel = new THREE.Mesh(new THREE.SphereGeometry(1.14, 48, 40), fresnelMat);
bob.add(fresnel);

// soft ground halo (additive disc) so the void glows onto the world beneath it.
// Lives in scene-space on the floor (not parented to the lifted/squashed orb).
const halo = new THREE.Mesh(
  new THREE.CircleGeometry(1, 48),
  new THREE.MeshBasicMaterial({ color: PALETTE.voidGlow, transparent: true, opacity: 0.30, blending: THREE.AdditiveBlending, depthWrite: false }),
);
halo.rotation.x = -Math.PI / 2;
halo.position.y = 0.06;
scene.add(halo);

// contact shadow (dark soft disc, plain — reads as grounding under the orb)
const contact = new THREE.Mesh(
  new THREE.CircleGeometry(1, 40),
  new THREE.MeshBasicMaterial({ color: 0x241a3a, transparent: true, opacity: 0.34, depthWrite: false }),
);
contact.rotation.x = -Math.PI / 2;
contact.position.y = 0.045;
scene.add(contact);

// cute face — a billboarded group that always faces the camera. Parented to the
// (uniform-scaled) voidGroup, NOT the squashed bob, so eyes never skew.
const face = new THREE.Group();
voidGroup.add(face);
const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25, emissive: 0x8899bb, emissiveIntensity: 0.12 });
const pupilMat = new THREE.MeshBasicMaterial({ color: 0x140b26 });
const blushMat = new THREE.MeshBasicMaterial({ color: 0xff85c2, transparent: true, opacity: 0.55 });
const mouthMat = new THREE.MeshBasicMaterial({ color: 0x140b26 });
const eyes: THREE.Group[] = [];
for (const sx of [-0.34, 0.34]) {
  const eg = new THREE.Group();
  const white = new THREE.Mesh(new THREE.SphereGeometry(0.26, 20, 16), eyeWhiteMat);
  white.scale.set(0.86, 1, 0.5);
  const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), pupilMat);
  pupil.position.set(sx > 0 ? -0.03 : 0.03, -0.02, 0.2);
  pupil.scale.set(1, 1, 0.5);
  const shine = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  shine.position.set((sx > 0 ? -0.03 : 0.03) + 0.05, 0.06, 0.28);
  eg.add(white); eg.add(pupil); eg.add(shine);
  eg.position.set(sx, 0.12, 1.02);    // proud of the body surface so never occluded
  face.add(eg); eyes.push(eg);
}
// rosy blush under each eye
for (const sx of [-0.5, 0.5]) {
  const b = new THREE.Mesh(new THREE.CircleGeometry(0.15, 16), blushMat);
  b.position.set(sx, -0.22, 1.0);
  face.add(b);
}
// smiling mouth — a thin torus arc
const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.045, 10, 24, Math.PI), mouthMat);
mouth.rotation.z = Math.PI;           // open side down = smile
mouth.position.set(0, -0.28, 1.02);
face.add(mouth);

function updateVoidMesh() {
  // halo + contact live on the floor in scene-space; just track x/z and size.
  halo.position.set(voidState.x, 0.06, voidState.z);
  halo.scale.setScalar(voidR * 1.7);
  contact.position.set(voidState.x, 0.045, voidState.z);
  contact.scale.setScalar(voidR * 1.05);
}

// ── absorb particle puff (shared pool) ───────────────────────────────────────
const PUFF = 90;
const puffGeo = new THREE.BufferGeometry();
const puffPos = new Float32Array(PUFF * 3);
puffGeo.setAttribute('position', new THREE.BufferAttribute(puffPos, 3));
const puffMat = new THREE.PointsMaterial({ color: PALETTE.voidGlow, size: 1.6, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
const puffPoints = new THREE.Points(puffGeo, puffMat);
puffPoints.frustumCulled = false;
scene.add(puffPoints);
const puffVel: THREE.Vector3[] = [];
const puffLife: number[] = [];
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

updateVoidMesh();

// ── input: drag to move the void; auto-wander when idle ──────────────────────
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
let moveAmt = 0, blinkT = rand(2, 5), blink = 0;
const prev = { x: 0, z: 0 };
const tmpV = new THREE.Vector3();

function animate() {
  const dt = Math.min(0.05, clock.getDelta());
  tClock += dt;

  // auto-wander after 1.5s idle so the demo is always alive
  if (tClock - lastInput > 1.5) {
    wanderT -= dt;
    if (wanderT <= 0) { wanderT = rand(1.5, 3); wander.set(rand(-HALF * 0.8, HALF * 0.8), 0, rand(-HALF * 0.8, HALF * 0.8)); }
    target.lerp(wander, 0.02);
  }
  // move void toward target
  voidState.x += (target.x - voidState.x) * Math.min(1, dt * 2.4);
  voidState.z += (target.z - voidState.z) * Math.min(1, dt * 2.4);

  // velocity → lean + squash + face look
  const vx = (voidState.x - prev.x) / Math.max(1e-4, dt);
  const vz = (voidState.z - prev.z) / Math.max(1e-4, dt);
  prev.x = voidState.x; prev.z = voidState.z;
  const speed = Math.hypot(vx, vz);
  moveAmt += (Math.min(1, speed / 40) - moveAmt) * Math.min(1, dt * 6);

  updateVoidMesh();

  // squash/stretch: squish vertically a touch while rolling, gentle idle breathe
  const breathe = Math.sin(tClock * 2.2) * 0.02;
  const squash = 1 - moveAmt * 0.10 + breathe;
  const stretch = 1 + moveAmt * 0.12 - breathe;
  bob.scale.set(voidR * stretch, voidR * squash, voidR * stretch);
  // lean into travel direction
  bob.rotation.z = THREE.MathUtils.clamp(-vx / 260, -0.22, 0.22);
  bob.rotation.x = THREE.MathUtils.clamp(vz / 260, -0.22, 0.22);
  // position the whole void group; bob height adds a gentle roll-bob
  voidGroup.position.set(
    voidState.x,
    voidR * (0.92 + Math.abs(Math.sin(tClock * 6)) * moveAmt * 0.06),
    voidState.z,
  );

  // face billboards toward the camera; centred on the void, scaled with it, so
  // the eyes/mouth (local z≈1.0) ride the front hemisphere facing the viewer.
  face.scale.setScalar(voidR);
  face.position.set(0, voidR * 0.12, 0);
  face.quaternion.copy(camera.quaternion);
  // eyes track the travel direction a little (pupils already offset; nudge group)
  const look = THREE.MathUtils.clamp(vx / 400, -0.06, 0.06);
  for (const e of eyes) e.position.x = (e.position.x < 0 ? -0.34 : 0.34) + look;

  // blink
  blinkT -= dt;
  if (blinkT <= 0 && blink <= 0) { blink = 0.16; blinkT = rand(2.5, 6); }
  if (blink > 0) {
    blink -= dt;
    const openness = Math.abs(blink - 0.08) / 0.08; // 1→0→1 over the blink
    for (const e of eyes) e.scale.y = Math.max(0.08, openness);
  } else for (const e of eyes) e.scale.y = 1;

  // eat: capture nearby edibles, then spiral them into the void + puff
  for (const e of edibles) {
    if (e.eaten) {
      e.t += dt * 2.4;
      const p = e.mesh.position;
      // spiral inward toward the void centre while lifting to void height
      e.orbit += dt * 10;
      const r = e.orbitR * (1 - e.t);
      const cy = voidGroup.position.y;
      p.x = voidState.x + Math.cos(e.orbit) * r;
      p.z = voidState.z + Math.sin(e.orbit) * r;
      p.y = THREE.MathUtils.lerp(p.y, cy, Math.min(1, dt * 6));
      e.mesh.rotation.x += e.spin.x * dt; e.mesh.rotation.y += e.spin.y * dt; e.mesh.rotation.z += e.spin.z * dt;
      e.mesh.scale.multiplyScalar(1 - dt * 3.4);
      if (e.t >= 1) {
        spawnPuff(voidState.x, cy, voidState.z, 5);
        scene.remove(e.mesh); e.eaten = false; e.mesh.visible = false;
      }
      continue;
    }
    if (!e.mesh.visible) continue;
    const dx = e.mesh.position.x - voidState.x, dz = e.mesh.position.z - voidState.z;
    const d = Math.hypot(dx, dz);
    if (d < voidR + e.radius * 0.5) {
      // captured
      e.eaten = true; e.t = 0;
      e.orbit = Math.atan2(dz, dx);
      e.orbitR = Math.max(voidR * 0.6, d);
      e.spin.set(rand(-6, 6), rand(-6, 6), rand(-6, 6));
      voidR = Math.min(52, voidR + e.radius * 0.05); // grow
      // little pop of joy
      spawnPuff(e.mesh.position.x, voidGroup.position.y, e.mesh.position.z, 3);
    } else if (d < voidR + e.radius * 2.4) {
      // hungry pull toward the void before capture
      const pull = (voidR + e.radius * 2.4 - d) * 1.4;
      e.mesh.position.x -= (dx / d) * dt * pull;
      e.mesh.position.z -= (dz / d) * dt * pull;
    }
  }

  // step particles
  const pa = puffGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < PUFF; i++) {
    if (puffLife[i] > 0) {
      puffLife[i] -= dt;
      puffVel[i].y -= dt * 14;
      puffPos[i * 3] += puffVel[i].x * dt;
      puffPos[i * 3 + 1] += puffVel[i].y * dt;
      puffPos[i * 3 + 2] += puffVel[i].z * dt;
      if (puffLife[i] <= 0) puffPos[i * 3 + 1] = -999;
    }
  }
  pa.needsUpdate = true;

  // camera follows + eases out as the void grows
  camDist += ((70 + voidR * 2.6) - camDist) * dt * 1.5;
  tmpV.copy(camOffset).multiplyScalar(camDist).add(new THREE.Vector3(voidState.x, 0, voidState.z));
  camera.position.lerp(tmpV, Math.min(1, dt * 3));
  camera.lookAt(voidState.x, voidR * 0.5, voidState.z);
  sun.target.position.set(voidState.x, 0, voidState.z);

  sizeEl.textContent = `${Math.round(voidR * 1.6)}m`;
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
// frame the void on the very first paint (no snap-in from the origin)
camera.position.copy(camOffset).multiplyScalar(camDist).add(new THREE.Vector3(voidState.x, 0, voidState.z));
camera.lookAt(voidState.x, voidR * 0.5, voidState.z);
animate();
