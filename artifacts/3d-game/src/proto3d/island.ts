// VOIDLING island — "MAPLE ISLE", ported from the 2D map into 3D.
// The ground is a top-down texture baked from the real 2D coordinate map (grass,
// biomes, roads, river, coast) so it reads exactly like the 2D game; it sits on
// a floating slab with cliff walls in cosmic space. Real 3D props (houses,
// towers, trees, palms, landmarks) are placed on top per the FIXED_PLAN biome
// grid. Moving life is added separately (./life).
import * as THREE from 'three';
import { WORLD, PROPS } from './palette';

export type Biome = 'cozy' | 'fancy' | 'downtown' | 'plaza' | 'park' | 'forest' | 'beach' | 'zoo' | 'airport' | 'military';

export interface AddEdible { (mesh: THREE.Object3D, radius: number): void; }
export interface Island {
  spawn: { x: number; z: number };
  biomeAt(x: number, z: number): Biome | null;
  update(dt: number, t: number): void;
  W: number;  // 3D world helper (world units -> 3D)
}

// ── coordinate system ────────────────────────────────────────────────────────
const SCALE = 0.05;               // 1 3D unit = 20 world units
const CX = 6000, CZ = 6000;       // world centre
const w = (v: number) => (v - CX) * SCALE;   // world -> 3D (both axes share centre)
const wLen = (v: number) => v * SCALE;

// island silhouette control points (world)
const ISLAND_CTRL: [number, number][] = [
  [980, 3200], [580, 5900], [1000, 8900], [2100, 10950], [4500, 11550],
  [6600, 11650], [8300, 11350], [9800, 10150], [11400, 8700], [11550, 6200],
  [11050, 3750], [9350, 400], [6000, 150], [2600, 500],
];

// 6x6 biome plan (rows = gy north->south)
const PLAN: Biome[][] = [
  ['cozy', 'cozy', 'cozy', 'cozy', 'forest', 'forest'],
  ['cozy', 'cozy', 'downtown', 'downtown', 'forest', 'zoo'],
  ['fancy', 'fancy', 'downtown', 'plaza', 'park', 'forest'],
  ['fancy', 'fancy', 'downtown', 'downtown', 'park', 'forest'],
  ['cozy', 'cozy', 'fancy', 'fancy', 'forest', 'airport'],
  ['beach', 'beach', 'beach', 'beach', 'beach', 'military'],
];
const BLOCK_ORIGIN = 925, STRIDE = 1710, BLOCK_SIZE = 1600;
const blockCenter = (g: number) => BLOCK_ORIGIN + STRIDE * g + BLOCK_SIZE / 2;
const ROAD_CENTERS = [2580, 4290, 6000, 7710, 9420];

const RIVER: [number, number][] = [
  [8405, 1149], [8277, 3035], [8565, 5337], [8213, 6887], [8469, 8661], [9431, 9305], [9700, 9830], [9800, 10150],
];
const POND: [number, number, number] = [8565, 5337, 304];
const LAGOON = { x: 3675, y: 10307, rx: 832, ry: 608 };
const WATERFALL: [number, number] = [9800, 10150];

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

// ── shared geometry helpers for ./life ─────────────────────────────────────────
export const worldTo3D = (v: number) => w(v);
export const worldLen = (v: number) => wLen(v);
export const ROAD_CENTERS_3D = ROAD_CENTERS.map((c) => w(c));
export const blockCenter3D = (gx: number, gy: number): [number, number] => [w(blockCenter(gx)), w(blockCenter(gy))];
export const PLAN_GRID = PLAN;
export const HALF_BLOCK_3D = wLen(BLOCK_SIZE / 2);

// train rail loop around downtown (corner-cut rectangle, world coords)
const RAIL_PTS: [number, number][] = [
  [4240, 2420], [7760, 2420], [7870, 2530], [7870, 7760],
  [7760, 7870], [4240, 7870], [4130, 7760], [4130, 2530],
];
const railCurve = new THREE.CatmullRomCurve3(
  RAIL_PTS.map(([x, y]) => new THREE.Vector3(w(x), 0, w(y))), true, 'catmullrom', 0.02,
);
export function railPointAt(t: number): { x: number; z: number; angle: number } {
  const u = ((t % 1) + 1) % 1;
  const p = railCurve.getPointAt(u);
  const tan = railCurve.getTangentAt(u);
  return { x: p.x, z: p.z, angle: Math.atan2(tan.x, tan.z) };
}

// smooth closed curve through control points (midpoint-quadratic, matches 2D)
function silhouetteWorld(steps = 10): [number, number][] {
  const P = ISLAND_CTRL, n = P.length, out: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const p0 = P[i], p1 = P[(i + 1) % n], p2 = P[(i + 2) % n];
    const m0 = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2];
    const m1 = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];
    for (let s = 0; s < steps; s++) {
      const t = s / steps, it = 1 - t;
      out.push([
        it * it * m0[0] + 2 * it * t * p1[0] + t * t * m1[0],
        it * it * m0[1] + 2 * it * t * p1[1] + t * t * m1[1],
      ]);
    }
  }
  return out;
}

export function createIsland(scene: THREE.Scene, addEdible: AddEdible): Island {
  const silW = silhouetteWorld(12);
  const sil3 = silW.map(([x, y]) => new THREE.Vector2(w(x), w(y)));
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const p of sil3) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minZ = Math.min(minZ, p.y); maxZ = Math.max(maxZ, p.y); }
  const W3 = maxX - minX, H3 = maxZ - minZ;

  // ── space backdrop ─────────────────────────────────────────────────────────
  scene.background = new THREE.Color(WORLD.space);
  scene.fog = new THREE.Fog(WORLD.space, 240, 640);

  // starfield
  {
    const N = 900, pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const r = rand(340, 620), th = rand(0, Math.PI * 2), ph = rand(0.15, Math.PI * 0.6);
      pos[i * 3] = Math.cos(th) * Math.sin(ph) * r;
      pos[i * 3 + 1] = Math.cos(ph) * r * 0.7 - 40;
      pos[i * 3 + 2] = Math.sin(th) * Math.sin(ph) * r;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xd8c8ff, size: 1.5, transparent: true, opacity: 0.8, depthWrite: false })));
  }

  // violet energy halo bleeding off the island edge (additive radial gradient)
  {
    const cv = document.createElement('canvas'); cv.width = cv.height = 512;
    const g = cv.getContext('2d')!;
    const grd = g.createRadialGradient(256, 256, 120, 256, 256, 256);
    grd.addColorStop(0, 'rgba(168,123,255,0.55)');
    grd.addColorStop(0.55, 'rgba(123,79,224,0.28)');
    grd.addColorStop(1, 'rgba(123,79,224,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 512, 512);
    const tex = new THREE.CanvasTexture(cv);
    const halo = new THREE.Mesh(
      new THREE.PlaneGeometry(Math.max(W3, H3) * 2.1, Math.max(W3, H3) * 2.1),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    halo.rotation.x = -Math.PI / 2; halo.position.y = -3;
    halo.position.x = (minX + maxX) / 2; halo.position.z = (minZ + maxZ) / 2;
    scene.add(halo);
  }

  // ── baked ground texture ───────────────────────────────────────────────────
  const TEX = 2048;
  const cv = document.createElement('canvas'); cv.width = cv.height = TEX;
  const g = cv.getContext('2d')!;
  const px = (x3: number) => ((x3 - minX) / W3) * TEX;
  const py = (z3: number) => ((z3 - minZ) / H3) * TEX;
  const pxW = (worldX: number) => px(w(worldX));
  const pyW = (worldY: number) => py(w(worldY));
  const hex = (n: number) => '#' + n.toString(16).padStart(6, '0');

  // clip to the island silhouette so everything is masked to the coast
  g.save();
  g.beginPath();
  g.moveTo(px(sil3[0].x), py(sil3[0].y));
  for (const p of sil3) g.lineTo(px(p.x), py(p.y));
  g.closePath();
  g.clip();

  // base grass
  g.fillStyle = hex(WORLD.meadow); g.fillRect(0, 0, TEX, TEX);
  // subtle grass mottling
  for (let i = 0; i < 1400; i++) {
    g.fillStyle = Math.random() < 0.5 ? 'rgba(120,201,78,0.18)' : 'rgba(255,255,255,0.05)';
    const x = Math.random() * TEX, y = Math.random() * TEX, r = rand(6, 18);
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }

  // biome block fills
  const biomeColor: Record<Biome, number | null> = {
    cozy: null, fancy: null, downtown: WORLD.pavement, plaza: WORLD.pavement,
    park: WORLD.park, forest: WORLD.forest, beach: WORLD.sand, zoo: WORLD.zooGround,
    airport: 0xd9dbe6, military: 0x8f9576,
  };
  for (let gy = 0; gy < 6; gy++) for (let gx = 0; gx < 6; gx++) {
    const col = biomeColor[PLAN[gy][gx]];
    if (col == null) continue;
    const cx = blockCenter(gx), cy = blockCenter(gy);
    const x0 = pxW(cx - BLOCK_SIZE / 2), y0 = pyW(cy - BLOCK_SIZE / 2);
    const x1 = pxW(cx + BLOCK_SIZE / 2), y1 = pyW(cy + BLOCK_SIZE / 2);
    g.fillStyle = hex(col);
    g.fillRect(x0, y0, x1 - x0, y1 - y0);
  }
  // forest gets a darker dappling; downtown a plaza tint already via pavement

  // roads
  const roadPx = pxW(ROAD_CENTERS[1]) - pxW(ROAD_CENTERS[1] - 110);
  g.strokeStyle = hex(WORLD.road); g.lineWidth = roadPx; g.lineCap = 'butt';
  for (const c of ROAD_CENTERS) {
    g.beginPath(); g.moveTo(pxW(c), 0); g.lineTo(pxW(c), TEX); g.stroke();       // vertical
    g.beginPath(); g.moveTo(0, pyW(c)); g.lineTo(TEX, pyW(c)); g.stroke();       // horizontal
  }
  // dashed lane lines
  g.strokeStyle = 'rgba(220,227,238,0.85)'; g.lineWidth = Math.max(2, roadPx * 0.05);
  g.setLineDash([roadPx * 0.9, roadPx * 0.9]);
  for (const c of ROAD_CENTERS) {
    g.beginPath(); g.moveTo(pxW(c), 0); g.lineTo(pxW(c), TEX); g.stroke();
    g.beginPath(); g.moveTo(0, pyW(c)); g.lineTo(TEX, pyW(c)); g.stroke();
  }
  g.setLineDash([]);

  // train tracks (ballast + twin rails + ties) around downtown
  const railPath = () => {
    g.beginPath(); g.moveTo(pxW(RAIL_PTS[0][0]), pyW(RAIL_PTS[0][1]));
    for (const [rx, ry] of RAIL_PTS) g.lineTo(pxW(rx), pyW(ry));
    g.closePath();
  };
  g.lineJoin = 'round'; g.lineCap = 'round';
  g.strokeStyle = '#9a8f7e'; g.lineWidth = pxW(150) - pxW(0); railPath(); g.stroke();   // ballast
  g.strokeStyle = 'rgba(70,66,60,0.85)'; g.lineWidth = Math.max(2, (pxW(150) - pxW(0)) * 0.12);
  g.setLineDash([(pxW(60) - pxW(0)), (pxW(40) - pxW(0))]); railPath(); g.stroke();       // ties
  g.setLineDash([]);
  g.strokeStyle = '#c7ccd6'; g.lineWidth = Math.max(1.5, (pxW(150) - pxW(0)) * 0.09); railPath(); g.stroke(); // rail sheen

  // river
  g.strokeStyle = hex(WORLD.riverMid); g.lineWidth = (pxW(124) - pxW(0)); g.lineJoin = 'round'; g.lineCap = 'round';
  g.beginPath(); g.moveTo(pxW(RIVER[0][0]), pyW(RIVER[0][1]));
  for (const [rx, ry] of RIVER) g.lineTo(pxW(rx), pyW(ry));
  g.stroke();
  g.strokeStyle = hex(WORLD.riverDeep); g.lineWidth = (pxW(62) - pxW(0));
  g.beginPath(); g.moveTo(pxW(RIVER[0][0]), pyW(RIVER[0][1]));
  for (const [rx, ry] of RIVER) g.lineTo(pxW(rx), pyW(ry));
  g.stroke();
  // pond
  g.fillStyle = hex(WORLD.riverMid);
  g.beginPath(); g.ellipse(pxW(POND[0]), pyW(POND[1]), pxW(POND[2]) - pxW(0), pyW(POND[2]) - pyW(0), 0, 0, Math.PI * 2); g.fill();
  // lagoon
  g.fillStyle = hex(WORLD.waterShallow);
  g.beginPath(); g.ellipse(pxW(LAGOON.x), pyW(LAGOON.y), pxW(LAGOON.rx) - pxW(0), pyW(LAGOON.ry) - pyW(0), 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = hex(WORLD.waterDeep);
  g.beginPath(); g.ellipse(pxW(LAGOON.x), pyW(LAGOON.y), (pxW(LAGOON.rx) - pxW(0)) * 0.6, (pyW(LAGOON.ry) - pyW(0)) * 0.6, 0, 0, Math.PI * 2); g.fill();

  g.restore(); // end island clip

  // coast: sand band + white foam rim, stroked along the silhouette
  g.lineJoin = 'round';
  g.strokeStyle = 'rgba(246,227,164,0.9)'; g.lineWidth = TEX * 0.02;
  g.beginPath(); g.moveTo(px(sil3[0].x), py(sil3[0].y));
  for (const p of sil3) g.lineTo(px(p.x), py(p.y));
  g.closePath(); g.stroke();
  g.strokeStyle = '#ffffff'; g.lineWidth = TEX * 0.008;
  g.beginPath(); g.moveTo(px(sil3[0].x), py(sil3[0].y));
  for (const p of sil3) g.lineTo(px(p.x), py(p.y));
  g.closePath(); g.stroke();

  const groundTex = new THREE.CanvasTexture(cv);
  groundTex.anisotropy = 8;
  groundTex.colorSpace = THREE.SRGBColorSpace;

  // ground plane (flat, cutout by texture alpha? no alpha here — we use the slab
  // shape for the silhouette instead). Use a ShapeGeometry so the coast is real.
  const shape = new THREE.Shape();
  shape.moveTo(sil3[0].x, sil3[0].y);
  for (const p of sil3) shape.lineTo(p.x, p.y);
  shape.closePath();
  const topGeo = new THREE.ShapeGeometry(shape);
  // custom UVs from bbox so the baked texture aligns
  {
    const pos = topGeo.attributes.position;
    const uv = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) {
      uv[i * 2] = (pos.getX(i) - minX) / W3;
      uv[i * 2 + 1] = (pos.getY(i) - minZ) / H3;
    }
    topGeo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  }
  const top = new THREE.Mesh(topGeo, new THREE.MeshStandardMaterial({ map: groundTex, roughness: 0.97 }));
  top.rotation.x = -Math.PI / 2;   // shape XY -> world XZ (shape.y -> world -z)
  top.position.y = 0; top.receiveShadow = true;
  scene.add(top);

  // cliff wall skirt (thickness): vertical wall from y=0 down to y=-DEPTH
  {
    const DEPTH = 9;
    const n = sil3.length;
    const verts: number[] = [];
    for (let i = 0; i < n; i++) {
      const a = sil3[i], b = sil3[(i + 1) % n];
      // shape.y -> world -z (matches top rotation)
      const ax = a.x, az = -a.y, bx = b.x, bz = -b.y;
      verts.push(ax, 0, az, bx, 0, bz, ax, -DEPTH, az);
      verts.push(bx, 0, bz, bx, -DEPTH, bz, ax, -DEPTH, az);
    }
    const wallGeo = new THREE.BufferGeometry();
    wallGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts), 3));
    wallGeo.computeVertexNormals();
    const wall = new THREE.Mesh(wallGeo, new THREE.MeshStandardMaterial({ color: WORLD.cliff, roughness: 1, flatShading: true, side: THREE.DoubleSide }));
    scene.add(wall);
    // underside cap
    const cap = new THREE.Mesh(topGeo.clone(), new THREE.MeshStandardMaterial({ color: 0x2a2140, roughness: 1 }));
    cap.rotation.x = Math.PI / 2; cap.position.y = -DEPTH; scene.add(cap);
  }

  // ── waterfall at the SE edge (animated) ────────────────────────────────────
  const wfX = w(WATERFALL[0]), wfZ = w(WATERFALL[1]);
  const wfTex = (() => {
    const c = document.createElement('canvas'); c.width = 64; c.height = 128;
    const x = c.getContext('2d')!;
    const gr = x.createLinearGradient(0, 0, 0, 128);
    gr.addColorStop(0, '#93e2f3'); gr.addColorStop(1, '#4fa6cb');
    x.fillStyle = gr; x.fillRect(0, 0, 64, 128);
    for (let i = 0; i < 22; i++) { x.fillStyle = 'rgba(233,246,255,0.7)'; const yy = Math.random() * 128; x.fillRect(0, yy, 64, rand(1, 3)); }
    return new THREE.CanvasTexture(c);
  })();
  wfTex.wrapT = THREE.RepeatWrapping; wfTex.wrapS = THREE.RepeatWrapping; wfTex.repeat.set(1, 2);
  const waterfall = new THREE.Mesh(
    new THREE.PlaneGeometry(wLen(700), 26),
    new THREE.MeshBasicMaterial({ map: wfTex, transparent: true, opacity: 0.92, side: THREE.DoubleSide }),
  );
  // face outward from island centre at the waterfall point
  const outAng = Math.atan2(wfZ, wfX);
  waterfall.position.set(wfX, -11, wfZ);
  waterfall.rotation.y = -outAng + Math.PI / 2;
  scene.add(waterfall);
  // spray glow at base
  const spray = new THREE.Mesh(new THREE.CircleGeometry(wLen(500), 24),
    new THREE.MeshBasicMaterial({ color: WORLD.foam, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
  spray.rotation.x = -Math.PI / 2; spray.position.set(wfX * 1.05, -22, wfZ * 1.05); scene.add(spray);

  // ── PROPS: populate each block per biome ───────────────────────────────────
  populate(scene, addEdible);

  // ── biome lookup ───────────────────────────────────────────────────────────
  function biomeAt(x3: number, z3: number): Biome | null {
    const wx = x3 / SCALE + CX, wy = z3 / SCALE + CZ;
    const gx = Math.round((wx - BLOCK_ORIGIN - BLOCK_SIZE / 2) / STRIDE);
    const gy = Math.round((wy - BLOCK_ORIGIN - BLOCK_SIZE / 2) / STRIDE);
    if (gx < 0 || gx > 5 || gy < 0 || gy > 5) return null;
    return PLAN[gy][gx];
  }

  // spawn: a cozy-suburb road junction, clear of the downtown core
  const spawn = { x: w(ROAD_CENTERS[0]), z: w(ROAD_CENTERS[2]) };

  return {
    spawn,
    biomeAt,
    W: SCALE,
    update(dt, t) {
      wfTex.offset.y = (wfTex.offset.y - dt * 1.6) % 1;
      (spray.material as THREE.MeshBasicMaterial).opacity = 0.42 + Math.sin(t * 3) * 0.08;
    },
  };
}

// ── prop factories ─────────────────────────────────────────────────────────────
function makeHouse(): THREE.Group {
  const grp = new THREE.Group();
  const wWall = rand(5, 7), d = rand(5, 7), h = rand(3.5, 5);
  const walls = new THREE.Mesh(new THREE.BoxGeometry(wWall, h, d),
    new THREE.MeshStandardMaterial({ color: pick(PROPS.house), roughness: 0.9, flatShading: true }));
  walls.position.y = h / 2; grp.add(walls);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(wWall, d) * 0.78, rand(2.4, 3.4), 4),
    new THREE.MeshStandardMaterial({ color: pick(PROPS.roof), roughness: 0.85, flatShading: true }));
  roof.position.y = h + 1.3; roof.rotation.y = Math.PI / 4; grp.add(roof);
  // door
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.8, 0.2),
    new THREE.MeshStandardMaterial({ color: 0x6a4a6a, roughness: 0.8 }));
  door.position.set(0, 0.9, d / 2 + 0.05); grp.add(door);
  return grp;
}
function makeTower(tall = false): THREE.Group {
  const grp = new THREE.Group();
  const wB = rand(9, 14), d = rand(9, 14), h = tall ? rand(28, 48) : rand(12, 26);
  const body = new THREE.Mesh(new THREE.BoxGeometry(wB, h, d),
    new THREE.MeshStandardMaterial({ color: pick(PROPS.tower), roughness: 0.72, flatShading: true }));
  body.position.y = h / 2; grp.add(body);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(wB * 1.02, 1.4, d * 1.02),
    new THREE.MeshStandardMaterial({ color: 0x4a5670, roughness: 0.7 }));
  roof.position.y = h + 0.6; grp.add(roof);
  const winMat = new THREE.MeshStandardMaterial({ color: PROPS.towerGlass, roughness: 0.35, metalness: 0.15 });
  const rows = Math.max(1, Math.floor(h / 6));
  for (let r = 0; r < rows; r++) for (let c = -1; c <= 1; c++) {
    const win = new THREE.Mesh(new THREE.BoxGeometry(2.2, 3, 0.3), winMat);
    win.position.set(c * (wB / 3.2), 5 + r * 6, d / 2 + 0.05); grp.add(win);
    const win2 = win.clone(); win2.position.set(wB / 2 + 0.05, 5 + r * 6, c * (d / 3.2)); win2.rotation.y = Math.PI / 2; grp.add(win2);
  }
  return grp;
}
function makeTree(): THREE.Group {
  const grp = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.8, 3.4, 6),
    new THREE.MeshStandardMaterial({ color: PROPS.trunk, roughness: 1, flatShading: true }));
  trunk.position.y = 1.7; grp.add(trunk);
  const f = new THREE.Mesh(new THREE.IcosahedronGeometry(rand(2.6, 3.6), 0),
    new THREE.MeshStandardMaterial({ color: pick(PROPS.foliage), roughness: 0.9, flatShading: true }));
  f.position.y = 5.2; grp.add(f);
  return grp;
}
function makePine(): THREE.Group {
  const grp = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 2.4, 6),
    new THREE.MeshStandardMaterial({ color: PROPS.trunk, roughness: 1 }));
  trunk.position.y = 1.2; grp.add(trunk);
  const mat = new THREE.MeshStandardMaterial({ color: PROPS.pine, roughness: 0.9, flatShading: true });
  for (let i = 0; i < 3; i++) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(3.2 - i * 0.7, 3, 7), mat);
    cone.position.y = 3 + i * 2.1; grp.add(cone);
  }
  return grp;
}
function makePalm(): THREE.Group {
  const grp = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.6, 6, 6),
    new THREE.MeshStandardMaterial({ color: 0xba9a6a, roughness: 1, flatShading: true }));
  trunk.position.y = 3; trunk.rotation.z = rand(-0.12, 0.12); grp.add(trunk);
  const frondMat = new THREE.MeshStandardMaterial({ color: 0x5fbf6a, roughness: 0.85, flatShading: true, side: THREE.DoubleSide });
  for (let i = 0; i < 6; i++) {
    const fr = new THREE.Mesh(new THREE.ConeGeometry(1.1, 4.2, 4), frondMat);
    fr.position.y = 6; fr.rotation.z = Math.PI / 2.3; fr.rotation.y = (i / 6) * Math.PI * 2;
    fr.position.x = Math.cos((i / 6) * Math.PI * 2) * 1.6; fr.position.z = Math.sin((i / 6) * Math.PI * 2) * 1.6;
    grp.add(fr);
  }
  return grp;
}

function populate(scene: THREE.Scene, addEdible: AddEdible) {
  const setShadow = (m: THREE.Object3D) => m.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  const place = (mesh: THREE.Object3D, x3: number, z3: number, r: number) => { mesh.position.set(x3, 0, z3); setShadow(mesh); scene.add(mesh); addEdible(mesh, r); };

  for (let gy = 0; gy < 6; gy++) for (let gx = 0; gx < 6; gx++) {
    const biome = PLAN[gy][gx];
    const cxW = blockCenter(gx), cyW = blockCenter(gy);
    const cx = w(cxW), cz = w(cyW);
    const half = wLen(BLOCK_SIZE / 2) - 6;   // inset so props stay off roads
    const jitter = () => [cx + rand(-half, half), cz + rand(-half, half)] as const;

    if (biome === 'cozy' || biome === 'fancy') {
      const rows = 3, cols = 3;
      for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
        const hx = cx - half + (j + 0.5) * (half * 2 / cols) + rand(-2, 2);
        const hz = cz - half + (i + 0.5) * (half * 2 / rows) + rand(-2, 2);
        const house = makeHouse();
        if (biome === 'fancy') house.scale.setScalar(1.25);
        house.rotation.y = pick([0, Math.PI / 2, Math.PI, -Math.PI / 2]);
        place(house, hx, hz, biome === 'fancy' ? 4 : 3.2);
      }
      for (let t = 0; t < 3; t++) { const [x, z] = jitter(); place(makeTree(), x, z, 3.2); }
    } else if (biome === 'downtown' || biome === 'plaza') {
      const n = biome === 'plaza' ? 4 : 2 + Math.floor(Math.random() * 2);
      for (let i = 0; i < n; i++) {
        const t = makeTower(biome === 'plaza' || Math.random() < 0.5);
        const [x, z] = jitter(); place(t, x, z, 8);
      }
    } else if (biome === 'park') {
      for (let t = 0; t < 7; t++) { const [x, z] = jitter(); place(makeTree(), x, z, 3.4); }
    } else if (biome === 'forest') {
      for (let t = 0; t < 12; t++) { const [x, z] = jitter(); place(Math.random() < 0.7 ? makePine() : makeTree(), x, z, 3); }
    } else if (biome === 'beach') {
      for (let t = 0; t < 4; t++) { const [x, z] = jitter(); place(makePalm(), x, z, 2.6); }
    } else if (biome === 'zoo') {
      for (let t = 0; t < 4; t++) { const [x, z] = jitter(); place(makeTree(), x, z, 3); }
    } else if (biome === 'airport') {
      const hangar = new THREE.Mesh(new THREE.CylinderGeometry(10, 10, 20, 12, 1, false, 0, Math.PI),
        new THREE.MeshStandardMaterial({ color: 0xcfd6e0, roughness: 0.7, flatShading: true }));
      hangar.rotation.z = Math.PI / 2; hangar.rotation.y = Math.PI / 2; hangar.position.set(cx, 5, cz);
      setShadow(hangar); scene.add(hangar); addEdible(hangar, 10);
    } else if (biome === 'military') {
      for (let t = 0; t < 3; t++) {
        const bunker = new THREE.Mesh(new THREE.BoxGeometry(rand(6, 9), rand(3, 5), rand(6, 9)),
          new THREE.MeshStandardMaterial({ color: 0x6b7050, roughness: 0.95, flatShading: true }));
        const [x, z] = jitter(); place(bunker, x, z, 4);
      }
    }
  }
}
