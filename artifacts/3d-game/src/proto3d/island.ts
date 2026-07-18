// VOIDLING island — "MAPLE ISLE", ported from the 2D map into 3D.
// The ground is a top-down texture baked from the real 2D coordinate map (grass,
// biomes, roads, river, coast) so it reads exactly like the 2D game; it sits on
// a floating slab with cliff walls in cosmic space. Real 3D props (houses,
// towers, trees, palms, landmarks) are placed on top per the FIXED_PLAN biome
// grid. Moving life is added separately (./life).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { WORLD, PROPS } from './palette';
import { glb, spawnBalloon, setBalloonHook, contactShadow } from './assets3d';

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

// deterministic edge-facing house lots — shared by the ground bake (driveways)
// and populate() (the houses themselves), so every house faces its road and
// every driveway actually reaches a house. World coordinates.
export interface HouseLot { x: number; y: number; rot: number; fx: number; fy: number; }  // f = front dir
export function houseLots(gx: number, gy: number): HouseLot[] {
  const cx = blockCenter(gx), cy = blockCenter(gy);
  const E = BLOCK_SIZE / 2 - 190;          // lot line inset from the block edge
  const lots: HouseLot[] = [];
  for (const k of [-1, 0, 1]) {
    lots.push({ x: cx + k * 470, y: cy - E, rot: Math.PI, fx: 0, fy: -1 });   // north row → north road
    lots.push({ x: cx + k * 470, y: cy + E, rot: 0, fx: 0, fy: 1 });          // south row → south road
  }
  for (const k of [-0.62, 0.62]) {
    lots.push({ x: cx - E, y: cy + k * 470, rot: -Math.PI / 2, fx: -1, fy: 0 });  // west edge
    lots.push({ x: cx + E, y: cy + k * 470, rot: Math.PI / 2, fx: 1, fy: 0 });    // east edge
  }
  return lots;
}
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

// module-level silhouette polygon (world coords) + point-in-polygon test, so
// prop placement and movement respect the actual coastline, not just the grid
const SIL_POLY = silhouetteWorld(12);
function insideIslandWorld(wx: number, wy: number): boolean {
  let inside = false;
  for (let i = 0, j = SIL_POLY.length - 1; i < SIL_POLY.length; j = i++) {
    const [xi, yi] = SIL_POLY[i], [xj, yj] = SIL_POLY[j];
    if ((yi > wy) !== (yj > wy) && wx < ((xj - xi) * (wy - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
export const insideIsland3 = (x3: number, z3: number) => insideIslandWorld(x3 / SCALE + CX, z3 / SCALE + CZ);

export function createIsland(scene: THREE.Scene, addEdible: AddEdible): Island {
  const silW = SIL_POLY;
  const sil3 = silW.map(([x, y]) => new THREE.Vector2(w(x), w(y)));
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const p of sil3) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minZ = Math.min(minZ, p.y); maxZ = Math.max(maxZ, p.y); }
  const W3 = maxX - minX, H3 = maxZ - minZ;

  // ── space backdrop ─────────────────────────────────────────────────────────
  scene.background = new THREE.Color(WORLD.space);
  scene.fog = new THREE.Fog(WORLD.space, 420, 1500);   // wide, so big-void pull-back views stay clear
  // Higgsfield-painted nebula sky — swaps in when it loads (colour fallback stays)
  new THREE.TextureLoader().load('/assets/hf/hf_20260717_021720_8d012b94-ca33-49d6-9db7-237b607fe3da.png', (skyTex) => {
    skyTex.colorSpace = THREE.SRGBColorSpace;
    scene.background = skyTex;
  });

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
  const TEX = 3072;   // high-res bake so roads/crosswalks stay crisp up close
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
  for (let i = 0; i < 4000; i++) {
    g.fillStyle = Math.random() < 0.5 ? 'rgba(120,201,78,0.16)' : 'rgba(255,255,255,0.035)';
    const x = Math.random() * TEX, y = Math.random() * TEX, r = rand(2, 6);
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

  // roads — sidewalk band first, asphalt over it, crisp edge lines, dashes
  const roadPx = pxW(ROAD_CENTERS[1]) - pxW(ROAD_CENTERS[1] - 110);
  const roadLine = (c: number, vert: boolean) => {
    g.beginPath();
    if (vert) { g.moveTo(pxW(c), 0); g.lineTo(pxW(c), TEX); }
    else { g.moveTo(0, pyW(c)); g.lineTo(TEX, pyW(c)); }
    g.stroke();
  };
  g.lineCap = 'butt';
  g.strokeStyle = hex(WORLD.pavement); g.lineWidth = roadPx * 1.6;          // sidewalks
  for (const c of ROAD_CENTERS) { roadLine(c, true); roadLine(c, false); }
  g.strokeStyle = 'rgba(120,126,150,0.5)'; g.lineWidth = roadPx * 1.62;     // curb shadow edge
  for (const c of ROAD_CENTERS) { roadLine(c, true); roadLine(c, false); }
  g.strokeStyle = hex(WORLD.pavement); g.lineWidth = roadPx * 1.56;
  for (const c of ROAD_CENTERS) { roadLine(c, true); roadLine(c, false); }
  g.strokeStyle = hex(WORLD.road); g.lineWidth = roadPx;                     // asphalt
  for (const c of ROAD_CENTERS) { roadLine(c, true); roadLine(c, false); }
  // (lane dashes are crisp GEOMETRY now — see the InstancedMesh below)
  // crosswalks: zebra ladders on all four arms of every junction
  g.fillStyle = 'rgba(240,244,252,0.88)';
  for (const cx of ROAD_CENTERS) for (const cyR of ROAD_CENTERS) {
    const jx = pxW(cx), jy = pyW(cyR), half = roadPx / 2;
    const crossW = roadPx * 0.34;          // ladder depth (walking direction)
    const off = half + roadPx * 0.1;       // just outside the junction box
    const bars = 5, barLen = roadPx * 0.86, step = barLen / bars;
    for (const s of [-1, 1]) {
      for (let k = 0; k < bars; k++) {
        const along = -barLen / 2 + k * step + step * 0.18;
        // arms of the HORIZONTAL road (walk north-south): bars elongated in x
        g.fillRect(jx + s * off + (s > 0 ? 0 : -crossW), jy + along, crossW, step * 0.62);
        // arms of the VERTICAL road (walk east-west): bars elongated in y
        g.fillRect(jx + along, jy + s * off + (s > 0 ? 0 : -crossW), step * 0.62, crossW);
      }
    }
  }

  // suburbs read DESIGNED: mow-stripes on every lawn block, then a concrete
  // driveway from each house lot across the sidewalk to its road
  for (let gy = 0; gy < 6; gy++) for (let gx = 0; gx < 6; gx++) {
    const b = PLAN[gy][gx];
    if (b !== 'cozy' && b !== 'fancy') continue;
    const cxB = blockCenter(gx), cyB = blockCenter(gy);
    // lawn mow-stripes (very subtle alternating bands)
    g.save();
    g.beginPath();
    g.rect(pxW(cxB - BLOCK_SIZE / 2), pyW(cyB - BLOCK_SIZE / 2), pxW(cxB + BLOCK_SIZE / 2) - pxW(cxB - BLOCK_SIZE / 2), pyW(cyB + BLOCK_SIZE / 2) - pyW(cyB - BLOCK_SIZE / 2));
    g.clip();
    g.fillStyle = 'rgba(255,255,255,0.07)';
    for (let s = 0; s < 8; s += 2) {
      const y0 = pyW(cyB - BLOCK_SIZE / 2 + (s / 8) * BLOCK_SIZE);
      const y1 = pyW(cyB - BLOCK_SIZE / 2 + ((s + 1) / 8) * BLOCK_SIZE);
      g.fillRect(pxW(cxB - BLOCK_SIZE / 2), y0, pxW(cxB + BLOCK_SIZE / 2) - pxW(cxB - BLOCK_SIZE / 2), y1 - y0);
    }
    g.restore();
    // driveways: from the house's front edge, over the sidewalk, to the asphalt
    const dw = pxW(110) - pxW(0);            // driveway width
    g.fillStyle = '#d9d5df';
    for (const lot of houseLots(gx, gy)) {
      const frontClear = 130;                // house footprint half-depth
      if (lot.fy !== 0) {
        const y0 = lot.fy < 0 ? cyB - BLOCK_SIZE / 2 : lot.y + frontClear;
        const y1 = lot.fy < 0 ? lot.y - frontClear : cyB + BLOCK_SIZE / 2;
        g.fillRect(pxW(lot.x + 90) - dw / 2, pyW(y0), dw, pyW(y1) - pyW(y0));
      } else {
        const x0 = lot.fx < 0 ? cxB - BLOCK_SIZE / 2 : lot.x + frontClear;
        const x1 = lot.fx < 0 ? lot.x - frontClear : cxB + BLOCK_SIZE / 2;
        g.fillRect(pxW(x0), pyW(lot.y + 90) - dw / 2, pxW(x1) - pxW(x0), dw);
      }
    }
  }

  // GOLF COURSE — park block (4,2): fairway sweep, putting green, bunkers, tee
  {
    const gcx = blockCenter(4), gcy = blockCenter(2);
    g.save();
    g.beginPath();
    g.rect(pxW(gcx - BLOCK_SIZE / 2), pyW(gcy - BLOCK_SIZE / 2), pxW(gcx + BLOCK_SIZE / 2) - pxW(gcx - BLOCK_SIZE / 2), pyW(gcy + BLOCK_SIZE / 2) - pyW(gcy - BLOCK_SIZE / 2));
    g.clip();
    // the river bisects this block near its centre — the course lives entirely
    // WEST of the water, the pond walk keeps the east (no drowned fairways)
    g.strokeStyle = '#a8de7e'; g.lineWidth = pxW(340) - pxW(0); g.lineCap = 'round';
    g.beginPath();
    g.moveTo(pxW(gcx - 600), pyW(gcy + 500));
    g.quadraticCurveTo(pxW(gcx - 560), pyW(gcy - 40), pxW(gcx - 300), pyW(gcy - 420));
    g.stroke();
    // putting green + hole ring (matches the flag prop in ./life)
    g.fillStyle = '#b8ec8a'; g.beginPath(); g.arc(pxW(gcx - 300), pyW(gcy - 420), pxW(180) - pxW(0), 0, Math.PI * 2); g.fill();
    g.fillStyle = '#8cc961'; g.beginPath(); g.arc(pxW(gcx - 300), pyW(gcy - 420), pxW(24) - pxW(0), 0, Math.PI * 2); g.fill();
    // tee box
    g.fillStyle = '#b8ec8a'; g.fillRect(pxW(gcx - 680), pyW(gcy + 460), pxW(160) - pxW(0), pyW(120) - pyW(0));
    // bunkers
    g.fillStyle = hex(WORLD.sand);
    g.beginPath(); g.ellipse(pxW(gcx - 480), pyW(gcy + 60), pxW(110) - pxW(0), pyW(75) - pyW(0), 0.5, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(pxW(gcx - 190), pyW(gcy - 300), pxW(85) - pxW(0), pyW(60) - pyW(0), -0.4, 0, Math.PI * 2); g.fill();
    g.restore();
  }

  // AIRPORT — a real little airfield: runway with threshold bars + centerline,
  // taxiway loop to an apron (control tower + hangar + plane are 3D props)
  {
    const acx = blockCenter(5), acy = blockCenter(4);
    g.save();
    g.beginPath();
    g.rect(pxW(acx - BLOCK_SIZE / 2), pyW(acy - BLOCK_SIZE / 2), pxW(acx + BLOCK_SIZE / 2) - pxW(acx - BLOCK_SIZE / 2), pyW(acy + BLOCK_SIZE / 2) - pyW(acy - BLOCK_SIZE / 2));
    g.clip();
    // runway diagonal-ish across the block
    g.strokeStyle = '#5b6070'; g.lineWidth = pxW(240) - pxW(0); g.lineCap = 'butt';
    g.beginPath(); g.moveTo(pxW(acx - 700), pyW(acy + 520)); g.lineTo(pxW(acx + 700), pyW(acy - 520)); g.stroke();
    // centerline dashes
    g.strokeStyle = 'rgba(240,244,252,0.9)'; g.lineWidth = pxW(24) - pxW(0);
    g.setLineDash([pxW(120) - pxW(0), pxW(90) - pxW(0)]);
    g.beginPath(); g.moveTo(pxW(acx - 640), pyW(acy + 476)); g.lineTo(pxW(acx + 640), pyW(acy - 476)); g.stroke();
    g.setLineDash([]);
    // threshold bars at both ends
    const ang = Math.atan2(-(pyW(acy - 520) - pyW(acy + 520)), pxW(acx + 700) - pxW(acx - 700));
    for (const e of [-1, 1]) {
      const ex = pxW(acx + e * 620), ey = pyW(acy - e * 460);
      g.save(); g.translate(ex, ey); g.rotate(-ang);
      g.fillStyle = 'rgba(240,244,252,0.9)';
      for (let k = -3; k <= 3; k++) if (k) g.fillRect(-(pxW(50) - pxW(0)), k * (pxW(28) - pxW(0)), pxW(100) - pxW(0), pxW(14) - pxW(0));
      g.restore();
    }
    // apron pad (parking) in the DRY south-west quadrant (the NE end of the
    // block is clipped by the coast — operations all live on solid ground)
    g.fillStyle = '#c3c7d4';
    g.fillRect(pxW(acx - 620), pyW(acy + 180), pxW(520) - pxW(0), pyW(380) - pyW(0));
    g.restore();
  }

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

  // river — dark bank underlay first, then water, then a bright foam edge
  g.strokeStyle = '#4d8aa0'; g.lineWidth = (pxW(144) - pxW(0)); g.lineJoin = 'round'; g.lineCap = 'round';
  g.beginPath(); g.moveTo(pxW(RIVER[0][0]), pyW(RIVER[0][1]));
  for (const [rx, ry] of RIVER) g.lineTo(pxW(rx), pyW(ry));
  g.stroke();
  g.strokeStyle = hex(WORLD.riverMid); g.lineWidth = (pxW(124) - pxW(0));
  g.beginPath(); g.moveTo(pxW(RIVER[0][0]), pyW(RIVER[0][1]));
  for (const [rx, ry] of RIVER) g.lineTo(pxW(rx), pyW(ry));
  g.stroke();
  g.strokeStyle = hex(WORLD.riverDeep); g.lineWidth = (pxW(62) - pxW(0));
  g.beginPath(); g.moveTo(pxW(RIVER[0][0]), pyW(RIVER[0][1]));
  for (const [rx, ry] of RIVER) g.lineTo(pxW(rx), pyW(ry));
  g.stroke();
  g.strokeStyle = 'rgba(233,246,255,0.35)'; g.lineWidth = (pxW(128) - pxW(0));
  g.setLineDash([pxW(90) - pxW(0), pxW(150) - pxW(0)]);
  g.beginPath(); g.moveTo(pxW(RIVER[0][0]), pyW(RIVER[0][1]));
  for (const [rx, ry] of RIVER) g.lineTo(pxW(rx), pyW(ry));
  g.stroke(); g.setLineDash([]);
  // pond
  g.fillStyle = hex(WORLD.riverMid);
  g.beginPath(); g.ellipse(pxW(POND[0]), pyW(POND[1]), pxW(POND[2]) - pxW(0), pyW(POND[2]) - pyW(0), 0, 0, Math.PI * 2); g.fill();
  // lagoon
  g.fillStyle = hex(WORLD.waterShallow);
  g.beginPath(); g.ellipse(pxW(LAGOON.x), pyW(LAGOON.y), pxW(LAGOON.rx) - pxW(0), pyW(LAGOON.ry) - pyW(0), 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = hex(WORLD.waterDeep);
  g.beginPath(); g.ellipse(pxW(LAGOON.x), pyW(LAGOON.y), (pxW(LAGOON.rx) - pxW(0)) * 0.6, (pyW(LAGOON.ry) - pyW(0)) * 0.6, 0, 0, Math.PI * 2); g.fill();

  // bridge decks — repaint the road over the river at each crossing, with pale
  // deck edging, so roads read as BRIDGES instead of drowning under the water
  {
    // approximate river x at each horizontal road, from the RIVER polyline
    const riverXAt = (wy: number) => {
      for (let i = 0; i < RIVER.length - 1; i++) {
        const [x0, y0] = RIVER[i], [x1, y1] = RIVER[i + 1];
        if ((wy >= y0 && wy <= y1) || (wy >= y1 && wy <= y0)) {
          const t = (wy - y0) / ((y1 - y0) || 1);
          return x0 + t * (x1 - x0);
        }
      }
      return null;
    };
    const deckHalf = pxW(230) - pxW(0);
    g.lineCap = 'butt';
    for (const c of ROAD_CENTERS) {
      const rx = riverXAt(c);
      if (rx == null) continue;
      const bx = pxW(rx), by = pyW(c);
      g.strokeStyle = '#cfd4de'; g.lineWidth = roadPx * 1.24;   // deck edging
      g.beginPath(); g.moveTo(bx - deckHalf, by); g.lineTo(bx + deckHalf, by); g.stroke();
      g.strokeStyle = hex(WORLD.road); g.lineWidth = roadPx;    // deck asphalt
      g.beginPath(); g.moveTo(bx - deckHalf, by); g.lineTo(bx + deckHalf, by); g.stroke();
    }
  }

  // plaza fountain — a civic landmark at the heart of downtown
  {
    const fx2 = pxW(6855), fy2 = pyW(5145);
    const rOuter = pxW(190) - pxW(0);
    g.fillStyle = hex(WORLD.pavement); g.beginPath(); g.arc(fx2, fy2, rOuter * 1.35, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#c9cdd9'; g.lineWidth = rOuter * 0.12; g.beginPath(); g.arc(fx2, fy2, rOuter, 0, Math.PI * 2); g.stroke();
    g.fillStyle = hex(WORLD.waterShallow); g.beginPath(); g.arc(fx2, fy2, rOuter * 0.88, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(233,246,255,0.55)'; g.beginPath(); g.arc(fx2, fy2, rOuter * 0.12, 0, Math.PI * 2); g.fill();
  }

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
  groundTex.anisotropy = 16;
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
  // detail-grain overlay: a small tiling noise texture multiplied into the
  // ground at high frequency — hides bake upscaling so grass/asphalt read as
  // TEXTURE up close (the 2D game's grass richness), not as blurry paint
  const detailTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d')!;
    x.fillStyle = '#808080'; x.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 2600; i++) {
      const v = 96 + Math.floor(Math.random() * 64);
      x.fillStyle = `rgb(${v},${v},${v})`;
      x.fillRect(Math.random() * 128, Math.random() * 128, Math.random() < 0.3 ? 2 : 1, Math.random() < 0.5 ? 2 : 1);
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  })();
  const groundMat = new THREE.MeshStandardMaterial({ map: groundTex, roughness: 0.97 });
  groundMat.onBeforeCompile = (shader) => {
    shader.uniforms.uDetail = { value: detailTex };
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <map_pars_fragment>', '#include <map_pars_fragment>\nuniform sampler2D uDetail;')
      .replace('#include <map_fragment>', '#include <map_fragment>\n{ vec3 g = texture2D(uDetail, vMapUv * 140.0).rgb; vec3 g2 = texture2D(uDetail, vMapUv * 34.0).rgb; diffuseColor.rgb *= mix(vec3(1.0), g * 2.0, 0.45) * mix(vec3(1.0), g2 * 2.0, 0.18); }');
  };
  const top = new THREE.Mesh(topGeo, groundMat);
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
    const wall = new THREE.Mesh(wallGeo, new THREE.MeshStandardMaterial({ color: WORLD.cliff, roughness: 1, flatShading: true, side: THREE.DoubleSide, emissive: 0x2a2138, emissiveIntensity: 0.4 }));
    scene.add(wall);
    // underside cap
    const cap = new THREE.Mesh(topGeo.clone(), new THREE.MeshStandardMaterial({ color: 0x2a2140, roughness: 1 }));
    cap.rotation.x = Math.PI / 2; cap.position.y = -DEPTH; scene.add(cap);
  }

  // crisp geometry lane dashes — razor sharp at any zoom (the baked ones blur)
  {
    const dashGeo = new THREE.BoxGeometry(2.6, 0.03, 0.34);
    const dashMat = new THREE.MeshBasicMaterial({ color: 0xf2f5fa });
    const spots: { x: number; z: number; rot: number }[] = [];
    for (const c of ROAD_CENTERS.map((v) => w(v))) {
      for (let a = -292; a < 292; a += 5.6) {
        if (insideIsland3(a, c)) spots.push({ x: a, z: c, rot: 0 });
        if (insideIsland3(c, a)) spots.push({ x: c, z: a, rot: Math.PI / 2 });
      }
    }
    const inst = new THREE.InstancedMesh(dashGeo, dashMat, spots.length);
    const dm = new THREE.Object3D();
    spots.forEach((s, i) => { dm.position.set(s.x, 0.06, s.z); dm.rotation.y = s.rot; dm.updateMatrix(); inst.setMatrixAt(i, dm.matrix); });
    inst.instanceMatrix.needsUpdate = true;
    scene.add(inst);
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
  const spray = new THREE.Mesh(new THREE.CircleGeometry(wLen(240), 24),
    new THREE.MeshBasicMaterial({ color: WORLD.foam, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
  spray.rotation.x = -Math.PI / 2; spray.position.set(wfX * 1.05, -22, wfZ * 1.05); scene.add(spray);

  // ── PROPS: populate each block per biome ───────────────────────────────────
  populate(scene, addEdible);

  // Higgsfield image→3D hero landmark: the ferris wheel — moved out of the city
  // core to a beach BOARDWALK FAIR where a ferris wheel actually belongs.
  new GLTFLoader().load('/assets/hf3d/7d051b5a-7bfe-49fe-a484-24e7b3a9458a/f1918f07-d6ac-4589-abe2-eeaf7ca703b2.glb', (gltf) => {
    const model = gltf.scene;
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const s = 16 / Math.max(size.y, 0.001);            // ~16u tall landmark
    model.scale.setScalar(s);
    box.setFromObject(model);
    model.position.y -= box.min.y;                      // feet on the ground
    const grp = new THREE.Group();
    grp.add(model);
    grp.position.set(w(blockCenter(3)) + 4, 0, w(blockCenter(5)) - 14);   // beach fairground
    grp.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    scene.add(grp);
    addEdible(grp, 9);
  }, undefined, () => { /* offline dev: no landmark, no error */ });

  // ONE hot-air balloon drifts over the island (the redesigned Higgsfield GLB
  // is wired via the asset pack in ./assets3d — placed by populate()).
  let balloon: THREE.Group | null = null;
  setBalloonHook((grp) => { balloon = grp; });

  // ── biome lookup ───────────────────────────────────────────────────────────
  function biomeAt(x3: number, z3: number): Biome | null {
    const wx = x3 / SCALE + CX, wy = z3 / SCALE + CZ;
    if (!insideIslandWorld(wx, wy)) return null;   // off the coast = off the island
    // inside the coast, clamp to the nearest block so the whole island is
    // walkable right up to the waterline (the grid doesn't cover the fringe)
    const gx = Math.min(5, Math.max(0, Math.round((wx - BLOCK_ORIGIN - BLOCK_SIZE / 2) / STRIDE)));
    const gy = Math.min(5, Math.max(0, Math.round((wy - BLOCK_ORIGIN - BLOCK_SIZE / 2) / STRIDE)));
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
      if (balloon) {
        const a = t * 0.022;   // one lazy lap of the island every ~5 minutes
        balloon.position.set(Math.cos(a) * 125, 42 + Math.sin(t * 0.4) * 2.2, Math.sin(a) * 125);
        balloon.rotation.y = -a;
      }
    },
  };
}

// ── prop factories ─────────────────────────────────────────────────────────────
function makeHouse(): THREE.Group {
  const grp = new THREE.Group();
  const wWall = rand(5.4, 7), d = rand(5.4, 7), h = rand(3.2, 4.2);
  const wallCol = pick(PROPS.house);
  const walls = new THREE.Mesh(new THREE.BoxGeometry(wWall, h, d),
    new THREE.MeshStandardMaterial({ color: wallCol, roughness: 0.9 }));
  walls.position.y = h / 2; grp.add(walls);
  // gabled roof: explicit prism geometry, ridge along the depth axis, with
  // eaves overhang (reads "house", not "tent")
  const roofCol = pick(PROPS.roof);
  const roofH = rand(1.9, 2.5);
  const rw = wWall * 0.62, rd = d * 0.58;
  const roofGeo = (() => {
    const v: number[] = [];
    const quad = (a: number[], b: number[], c: number[], e: number[]) => { v.push(...a, ...b, ...c, ...a, ...c, ...e); };
    quad([-rw, 0, -rd], [-rw, 0, rd], [0, roofH, rd], [0, roofH, -rd]);        // left slope
    quad([rw, 0, rd], [rw, 0, -rd], [0, roofH, -rd], [0, roofH, rd]);          // right slope
    v.push(-rw, 0, rd, rw, 0, rd, 0, roofH, rd);                              // front gable
    v.push(rw, 0, -rd, -rw, 0, -rd, 0, roofH, -rd);                           // back gable
    const gGeo = new THREE.BufferGeometry();
    gGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(v), 3));
    gGeo.computeVertexNormals();
    return gGeo;
  })();
  const roof = new THREE.Mesh(roofGeo, new THREE.MeshStandardMaterial({ color: roofCol, roughness: 0.85, flatShading: true }));
  roof.position.y = h - 0.02;
  grp.add(roof);
  // eaves trim under the roofline
  const trim = new THREE.Mesh(new THREE.BoxGeometry(wWall * 1.08, 0.28, d * 1.08),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 }));
  trim.position.y = h + 0.05; grp.add(trim);
  // chimney
  if (Math.random() < 0.65) {
    const ch = new THREE.Mesh(new THREE.BoxGeometry(0.7, rand(1.6, 2.2), 0.7),
      new THREE.MeshStandardMaterial({ color: 0xb8776a, roughness: 0.9 }));
    ch.position.set(wWall * rand(-0.22, 0.22), h + roofH * 0.75, d * 0.18); grp.add(ch);
  }
  // door with frame + step
  const doorG = new THREE.Group();
  const frame = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.1, 0.12), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 }));
  frame.position.y = 1.05;
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.05, 1.8, 0.16), new THREE.MeshStandardMaterial({ color: pick([0x7a4a5e, 0x4a5e7a, 0x5e7a4a, 0x8a5a3a]), roughness: 0.7 }));
  door.position.set(0, 0.9, 0.03);
  const step = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.22, 0.7), new THREE.MeshStandardMaterial({ color: 0xd9dbe2, roughness: 0.9 }));
  step.position.set(0, 0.11, 0.4);
  doorG.add(frame); doorG.add(door); doorG.add(step);
  doorG.position.set(wWall * rand(-0.14, 0.14), 0, d / 2 + 0.02); grp.add(doorG);
  // two front windows with white frames + warm glass
  const winFrameMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 });
  const winGlassMat = new THREE.MeshStandardMaterial({ color: 0xffe9b8, roughness: 0.4, emissive: 0xffd98a, emissiveIntensity: 0.25 });
  for (const sx of [-0.28, 0.28]) {
    const wf = new THREE.Mesh(new THREE.BoxGeometry(1.15, 1.15, 0.1), winFrameMat);
    wf.position.set(wWall * sx, h * 0.58, d / 2 + 0.02);
    const wg = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.85, 0.12), winGlassMat);
    wg.position.set(wWall * sx, h * 0.58, d / 2 + 0.03);
    grp.add(wf); grp.add(wg);
  }
  // side window
  const sw = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.05, 1.05), winFrameMat);
  sw.position.set(wWall / 2 + 0.02, h * 0.58, 0); grp.add(sw);
  const swg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.78, 0.78), winGlassMat);
  swg.position.set(wWall / 2 + 0.03, h * 0.58, 0); grp.add(swg);
  return grp;
}
// baked facade texture: crisp lit/unlit window grid on the wall colour — far
// sharper than box-windows, and one draw call per tower instead of a dozen
const facadeCache = new Map<string, THREE.CanvasTexture>();
function facadeTex(wall: number, glassWarm: boolean): THREE.CanvasTexture {
  const key = `${wall}-${glassWarm}`;
  const hit = facadeCache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas'); c.width = 128; c.height = 256;
  const x = c.getContext('2d')!;
  x.fillStyle = '#' + wall.toString(16).padStart(6, '0'); x.fillRect(0, 0, 128, 256);
  // subtle floor bands
  x.fillStyle = 'rgba(0,0,0,0.06)';
  for (let fy = 0; fy < 256; fy += 32) x.fillRect(0, fy + 29, 128, 3);
  for (let fy = 8; fy < 250; fy += 32) {
    for (let fx = 10; fx < 118; fx += 30) {
      const lit = Math.random() < 0.42;
      x.fillStyle = lit ? (glassWarm ? '#ffe9b0' : '#dff3ff') : '#26314a';
      x.fillRect(fx, fy, 20, 16);
      x.fillStyle = 'rgba(255,255,255,0.28)';
      x.fillRect(fx, fy, 20, 3);   // sky reflection strip
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  facadeCache.set(key, t);
  return t;
}
function makeTower(tall = false): THREE.Group {
  const grp = new THREE.Group();
  const wB = rand(9, 14), d = rand(9, 14), h = tall ? rand(28, 48) : rand(12, 26);
  const wall = pick(PROPS.tower);
  const tex = facadeTex(wall, Math.random() < 0.6);
  const side = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 });
  const capMat = new THREE.MeshStandardMaterial({ color: 0x4a5670, roughness: 0.75 });
  // podium base + tower shaft with facade texture on all four sides
  const podH = Math.min(4.5, h * 0.22);
  const pod = new THREE.Mesh(new THREE.BoxGeometry(wB * 1.18, podH, d * 1.18),
    new THREE.MeshStandardMaterial({ color: new THREE.Color(wall).multiplyScalar(0.82), roughness: 0.7 }));
  pod.position.y = podH / 2; grp.add(pod);
  const body = new THREE.Mesh(new THREE.BoxGeometry(wB, h, d), [side, side, capMat, capMat, side, side]);
  body.position.y = podH + h / 2; grp.add(body);
  // roof parapet + AC units + some spires on tall towers
  const parapet = new THREE.Mesh(new THREE.BoxGeometry(wB * 1.04, 0.9, d * 1.04), capMat);
  parapet.position.y = podH + h + 0.35; grp.add(parapet);
  const ac = new THREE.Mesh(new THREE.BoxGeometry(rand(1.6, 2.6), 1.1, rand(1.6, 2.6)),
    new THREE.MeshStandardMaterial({ color: 0x9aa3b2, roughness: 0.8 }));
  ac.position.set(rand(-wB * 0.24, wB * 0.24), podH + h + 1.2, rand(-d * 0.24, d * 0.24)); grp.add(ac);
  if (tall && Math.random() < 0.5) {
    const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.3, rand(4, 7), 6),
      new THREE.MeshStandardMaterial({ color: 0xc8cdd8, metalness: 0.5, roughness: 0.4 }));
    spire.position.y = podH + h + 3.4; grp.add(spire);
  }
  // street-level awning strip for shop-front charm
  if (Math.random() < 0.6) {
    const aw = new THREE.Mesh(new THREE.BoxGeometry(wB * 0.9, 0.24, 1.5),
      new THREE.MeshStandardMaterial({ color: pick([0xe8604d, 0x4db07a, 0x4d7de8, 0xf0c050]), roughness: 0.7 }));
    aw.position.set(0, podH * 0.72, d * 0.62); grp.add(aw);
  }
  return grp;
}
function makeTree(): THREE.Group {
  // clustered two-tone canopy like the 2D tree sprites — reads lush, not "gumdrop"
  const grp = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.72, 3.2, 7),
    new THREE.MeshStandardMaterial({ color: PROPS.trunk, roughness: 1, flatShading: true }));
  trunk.position.y = 1.6; grp.add(trunk);
  const base = pick(PROPS.foliage);
  const dark = new THREE.Color(base).multiplyScalar(0.7).getHex();
  const light = new THREE.Color(base).multiplyScalar(1.28).getHex();
  const blob = (r: number, col: number, x: number, y: number, z: number) => {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1),
      new THREE.MeshStandardMaterial({ color: col, roughness: 0.92, flatShading: true }));
    m.position.set(x, y, z); grp.add(m);
  };
  const R0 = rand(2.2, 2.9);
  blob(R0, dark, 0, 4.6, 0);
  blob(R0 * 0.72, base, R0 * 0.55, 5.4, R0 * 0.3);
  blob(R0 * 0.62, light, -R0 * 0.5, 5.6, -R0 * 0.25);
  blob(R0 * 0.5, base, 0.2, 6.4, 0.2);
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

function makeBush(): THREE.Mesh {
  const b = new THREE.Mesh(new THREE.IcosahedronGeometry(rand(1.4, 2.1), 0),
    new THREE.MeshStandardMaterial({ color: pick([0x6cc86e, 0x5db06a, 0x7ed57a]), roughness: 0.95, flatShading: true }));
  b.position.y = 1; b.scale.y = 0.7; return b;
}
function makeMailbox(): THREE.Group {
  const g = new THREE.Group();
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 1.6, 5), new THREE.MeshStandardMaterial({ color: 0x8a6a4a }));
  post.position.y = 0.8; g.add(post);
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.7, 1.1), new THREE.MeshStandardMaterial({ color: pick([0xd85a5a, 0x4d7de8, 0x4db07a]), roughness: 0.6, metalness: 0.2 }));
  box.position.y = 1.7; g.add(box); return g;
}
function makeBench(): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x9a7a5a, roughness: 0.9 });
  const seat = new THREE.Mesh(new THREE.BoxGeometry(3, 0.3, 1), mat); seat.position.y = 1; g.add(seat);
  const back = new THREE.Mesh(new THREE.BoxGeometry(3, 1, 0.3), mat); back.position.set(0, 1.6, -0.35); g.add(back);
  return g;
}

// ── tiny "starter food" — what a speck-sized void eats first ──────────────────
function makeCone(): THREE.Group {
  const g = new THREE.Group();
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1.5, 10), new THREE.MeshStandardMaterial({ color: 0xff7a2a, roughness: 0.7 }));
  cone.position.y = 0.75; g.add(cone);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 0.3, 10), new THREE.MeshStandardMaterial({ color: 0xffffff }));
  band.position.y = 0.7; g.add(band);
  return g;
}
function makeHydrant(): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0xe23b2e, roughness: 0.6, metalness: 0.2 });
  const lite = new THREE.MeshStandardMaterial({ color: 0xf0f2f6, roughness: 0.5, metalness: 0.3 });
  const flange = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.56, 0.18, 8), mat); flange.position.y = 0.09; g.add(flange);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.45, 1.1, 8), mat); body.position.y = 0.68; g.add(body);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.42, 8, 6), mat); cap.position.y = 1.22; g.add(cap);
  const nut = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.16, 6), lite); nut.position.y = 1.6; g.add(nut);
  for (const s of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.5, 6), mat); arm.rotation.z = Math.PI / 2; arm.position.set(s * 0.4, 0.78, 0); g.add(arm);
    const end = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.1, 6), lite); end.rotation.z = Math.PI / 2; end.position.set(s * 0.66, 0.78, 0); g.add(end);
  }
  return g;
}
function makeTrash(): THREE.Group {
  const g = new THREE.Group();
  const can = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.42, 1.3, 10), new THREE.MeshStandardMaterial({ color: pick([0x4d9a5e, 0x4d74a8, 0x6b7280]), roughness: 0.8, metalness: 0.2 }));
  can.position.y = 0.65; g.add(can);
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.56, 0.2, 10), new THREE.MeshStandardMaterial({ color: 0x555c68 })); lid.position.y = 1.35; g.add(lid);
  return g;
}
function makeFlowers(): THREE.Group {
  const g = new THREE.Group();
  const bush = new THREE.Mesh(new THREE.IcosahedronGeometry(0.7, 0), new THREE.MeshStandardMaterial({ color: 0x5db06a, roughness: 0.9, flatShading: true }));
  bush.position.y = 0.5; bush.scale.y = 0.7; g.add(bush);
  for (let i = 0; i < 5; i++) {
    const f = new THREE.Mesh(new THREE.SphereGeometry(0.16, 6, 5), new THREE.MeshStandardMaterial({ color: pick([0xff6fb0, 0xffd23f, 0xff5a4d, 0xa87bff, 0xffffff]), roughness: 0.6 }));
    f.position.set(rand(-0.5, 0.5), 0.8, rand(-0.5, 0.5)); g.add(f);
  }
  return g;
}
function makeCoins(): THREE.Group {
  const g = new THREE.Group();
  const gold = new THREE.MeshStandardMaterial({ color: 0xf2c94c, roughness: 0.3, metalness: 0.55, emissive: 0xa87614, emissiveIntensity: 0.25 });
  const n = 2 + Math.floor(Math.random() * 2);
  for (let i = 0; i < n; i++) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.18, 14), gold);
    c.position.set(rand(-0.15, 0.15), 0.1 + i * 0.2, rand(-0.15, 0.15));
    c.rotation.y = rand(0, Math.PI); g.add(c);
  }
  g.userData.coin = n;   // wallet value
  return g;
}
function makeLamp(): THREE.Group {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 3.6, 6),
    new THREE.MeshStandardMaterial({ color: 0x3c4454, roughness: 0.6, metalness: 0.3 }));
  pole.position.y = 1.8; g.add(pole);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0xfff2c0, emissive: 0xffdf8a, emissiveIntensity: 0.8, roughness: 0.4 }));
  head.position.y = 3.7; g.add(head);
  return g;
}
const makeTinyProp = () => pick([makeCone, makeHydrant, makeTrash, makeFlowers])();
// biome-true snacks — no fire hydrants on the 18th hole, no cones on the sand
function makeShell(): THREE.Group {
  const g = new THREE.Group();
  const sh = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: pick([0xffd9e8, 0xfff0d8, 0xe8f0ff]), roughness: 0.55, flatShading: true }));
  sh.scale.set(1, 0.55, 0.85); g.add(sh);
  return g;
}
function makeMushroom(): THREE.Group {
  const g = new THREE.Group();
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.5, 7),
    new THREE.MeshStandardMaterial({ color: 0xf2ead8, roughness: 0.8 }));
  stem.position.y = 0.25; g.add(stem);
  const capM = new THREE.Mesh(new THREE.SphereGeometry(0.42, 9, 7, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: pick([0xe0483a, 0xd88a3a]), roughness: 0.7, flatShading: true }));
  capM.position.y = 0.48; capM.scale.y = 0.7; g.add(capM);
  const dot = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 5), new THREE.MeshStandardMaterial({ color: 0xffffff }));
  dot.position.set(0.16, 0.72, 0.14); g.add(dot);
  return g;
}
function makeGolfball(): THREE.Group {
  const g = new THREE.Group();
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35 }));
  b.position.y = 0.3; g.add(b);
  return g;
}
const tinyFor = (biome: Biome) =>
  biome === 'beach' ? pick([makeShell, makeShell, makeFlowers, makeCone])()
  : biome === 'forest' ? pick([makeMushroom, makeMushroom, makeFlowers])()
  : biome === 'park' ? pick([makeGolfball, makeFlowers, makeFlowers])()
  : biome === 'zoo' ? pick([makeFlowers, makeShell, makeMushroom])()
  : makeTinyProp();

// ── civic/retail stand-ins (offline dev + far LOD) — downtown must NEVER show
// a gabled suburban house on pavement, and the plaza always has a fountain ────
function makeShopBox(): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(8, 4.5, 6),
    new THREE.MeshStandardMaterial({ color: pick([0xf6efe2, 0xbfe0cf, 0xeab8cc]), roughness: 0.8 }));
  body.position.y = 2.25; g.add(body);
  const parapet = new THREE.Mesh(new THREE.BoxGeometry(8.4, 0.5, 6.4),
    new THREE.MeshStandardMaterial({ color: 0xd8d4de, roughness: 0.8 }));
  parapet.position.y = 4.6; g.add(parapet);
  const awning = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.28, 1.7),
    new THREE.MeshStandardMaterial({ color: pick([0xe8604d, 0x58a8c4, 0x58c470]), roughness: 0.7 }));
  awning.position.set(0, 3.05, 3.4); awning.rotation.x = 0.35; g.add(awning);
  const win = new THREE.Mesh(new THREE.BoxGeometry(5.6, 2, 0.2),
    new THREE.MeshStandardMaterial({ color: 0x2c3a52, roughness: 0.2, metalness: 0.4 }));
  win.position.set(0, 1.9, 3.02); g.add(win);
  return g;
}
function makeCivicHall(): THREE.Group {
  const g = new THREE.Group();
  const cream = new THREE.MeshStandardMaterial({ color: 0xf2efe6, roughness: 0.8 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(16, 8, 9), cream);
  body.position.y = 4; g.add(body);
  for (const sx of [-5.4, -1.8, 1.8, 5.4]) {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.55, 7, 10), cream);
    col.position.set(sx, 3.5, 5); g.add(col);
  }
  const ped = new THREE.Mesh(new THREE.BoxGeometry(17, 1.4, 10.5), cream);
  ped.position.y = 8.4; g.add(ped);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(3.4, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x6fa8a0, roughness: 0.5, metalness: 0.2 }));
  dome.position.y = 9; g.add(dome);
  return g;
}
function makeFountainFB(): THREE.Group {
  const g = new THREE.Group();
  const stone = new THREE.MeshStandardMaterial({ color: 0xd8d4de, roughness: 0.7 });
  const basin = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 5, 1.2, 18), stone);
  basin.position.y = 0.6; g.add(basin);
  const water = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.2, 0.3, 18),
    new THREE.MeshStandardMaterial({ color: WORLD.waterShallow, roughness: 0.15 }));
  water.position.y = 1.25; g.add(water);
  const tier = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.5, 1, 14), stone);
  tier.position.y = 2; g.add(tier);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.1, 1.4, 12), stone);
  top.position.y = 3.2; g.add(top);
  return g;
}

function populate(scene: THREE.Scene, addEdible: AddEdible) {
  const setShadow = (m: THREE.Object3D) => m.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  const place = (mesh: THREE.Object3D, x3: number, z3: number, r: number) => {
    if (!insideIsland3(x3, z3)) return;   // never place props off the coastline
    mesh.position.set(x3, 0, z3);
    // shadow diet: tiny street props don't cast (hundreds of them; their shadows
    // are sub-pixel anyway) — a big chunk of the shadow pass for free
    if (r >= 2.5) { setShadow(mesh); mesh.add(contactShadow(r)); }
    else mesh.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.receiveShadow = true; });
    scene.add(mesh); addEdible(mesh, r);
  };

  for (let gy = 0; gy < 6; gy++) for (let gx = 0; gx < 6; gx++) {
    const biome = PLAN[gy][gx];
    const cxW = blockCenter(gx), cyW = blockCenter(gy);
    const cx = w(cxW), cz = w(cyW);
    const half = wLen(BLOCK_SIZE / 2) - 6;   // inset so props stay off roads
    const jitter = () => [cx + rand(-half, half), cz + rand(-half, half)] as const;

    // GLB placement helper: skips off-island spots, wires the shadow diet +
    // procedural fallback so offline dev still shows a full island
    const placeGlb = (name: string, x3: number, z3: number, r: number, h: number, fallback?: () => THREE.Object3D, rotY?: number) => {
      if (!insideIsland3(x3, z3)) return;
      glb(scene, addEdible, name, x3, z3, r, { h, rotY, smallShadow: r < 2.5, fallback });
    };

    if (biome === 'cozy' || biome === 'fancy') {
      // edge-facing lots: every house faces its own road, with a driveway baked
      // into the ground running from the house to the asphalt (see bake above)
      const sc = biome === 'fancy' ? 1.3 : 1;
      // (house_modern is benched: its baked roof reads as a black hole from
      // the play camera — three strong architectures beat four with one dud)
      const HOUSES = biome === 'fancy'
        ? ['house_blue', 'house_craftsman', 'house_pink']
        : ['house_pink', 'house_craftsman', 'house_blue'];
      houseLots(gx, gy).forEach((lot, li) => {
        const hx = w(lot.x), hz = w(lot.y);
        const fx3 = lot.fx, fz3 = lot.fy;             // toward the street
        const sx3 = -fz3, sz3 = fx3;                  // along the street
        placeGlb(HOUSES[li % 3], hx, hz, (biome === 'fancy' ? 4 : 3.2) * sc,
          (biome === 'fancy' ? 6.2 : 5.2) * rand(0.92, 1.08), makeHouse, lot.rot);
        // front-yard dressing on the STREET side; mailbox by the driveway
        const dvx = lot.fy !== 0 ? 4.5 : 0, dvz = lot.fx !== 0 ? 4.5 : 0;
        if (Math.random() < 0.8) place(makeFlowers(), hx + fx3 * 4.4 + sx3 * 2, hz + fz3 * 4.4 + sz3 * 2, 0.7);
        if (Math.random() < 0.5) place(makeFlowers(), hx + fx3 * 4.4 - sx3 * 2, hz + fz3 * 4.4 - sz3 * 2, 0.7);
        if (Math.random() < 0.7) place(makeMailbox(), hx + fx3 * 7.6 + dvx + sx3, hz + fz3 * 7.6 + dvz + sz3, 1.2);
        if (Math.random() < 0.7) place(makeBush(), hx - fx3 * 4.2 + sx3 * rand(3, 5), hz - fz3 * 4.2 + sz3 * rand(3, 5), 1.6);
      });
      // the block interior is a real green common — trees, bushes, flower
      // patches (screenshots showed one giant empty lawn per block)
      for (let t = 0; t < 6; t++) {
        const ix = cx + rand(-half * 0.42, half * 0.42), iz = cz + rand(-half * 0.42, half * 0.42);
        if (Math.random() < 0.5) placeGlb('parktree', ix, iz, 3.2, rand(6, 8), makeTree);
        else place(makeTree(), ix, iz, 3.2);
      }
      for (let t = 0; t < 4; t++) place(makeBush(), cx + rand(-half * 0.4, half * 0.4), cz + rand(-half * 0.4, half * 0.4), 1.6);
      for (let t = 0; t < 3; t++) place(makeFlowers(), cx + rand(-half * 0.38, half * 0.38), cz + rand(-half * 0.38, half * 0.38), 0.7);
    } else if (biome === 'downtown') {
      // DETERMINISTIC street-wall grid (no jitter, no interpenetration):
      // 4 corner towers form the block's walls, the tall pair alternates by
      // block parity so the skyline reads composed, not random
      const tallNW = (gx + gy) % 2 === 0;
      ([[-0.65, -0.65], [0.65, -0.65], [-0.65, 0.65], [0.65, 0.65]] as const).forEach(([ux, vz], i) => {
        const x = cx + ux * half, z = cz + vz * half;
        const diag = (ux < 0) === (vz < 0);
        if (diag === tallNW) placeGlb(i % 2 ? 'tower_deco' : 'tower_glass', x, z, 8, 22 + ((gx * 7 + gy * 13 + i) % 4) * 3, () => makeTower(true));
        else { const t = makeTower(false); place(t, x, z, 8); }
      });
      // ACTIVE retail edge along the south sidewalk — shop-box stand-ins so a
      // suburban house never again haunts downtown pavement
      placeGlb('cafe', cx - half * 0.3, cz + half * 0.68, 6, 8.5, makeShopBox, Math.PI);
      placeGlb('shop', cx + half * 0.3, cz + half * 0.68, 6, 8.5, makeShopBox, Math.PI);
      // pocket plaza interior — the empty centre becomes a place
      for (const [ux, vz] of [[-0.28, -0.28], [0.28, -0.28], [-0.28, 0.28], [0.28, 0.28]] as const)
        placeGlb('parktree', cx + ux * half, cz + vz * half, 3.2, 7, makeTree);
      place(makeBench(), cx, cz - 4.5, 2.4);
      const b2 = makeBench(); b2.rotation.y = Math.PI; place(b2, cx, cz + 4.5, 2.4);
      placeGlb('icecream', cx, cz, 2.2, 3.4, () => new THREE.Group());
    } else if (biome === 'plaza') {
      // civic square, properly staged: TOWN HALL at the north end, the mayor's
      // stage on its steps (./life), the AI fountain ON the paved circle at the
      // centre, food truck + ice-cream cart at the south corners
      placeGlb('townhall', cx, cz - half * 0.62, 10, 17, makeCivicHall, 0);
      placeGlb('fountain', cx, cz, 4, 6.5, makeFountainFB);
      placeGlb('foodtruck', cx - half * 0.66, cz + half * 0.64, 4, 5, undefined, Math.PI / 6);
      placeGlb('icecream', cx + half * 0.64, cz + half * 0.6, 2.2, 3.6, () => new THREE.Group(), -Math.PI / 6);
      // colonnades frame the civic axis; benches face the fountain
      for (const [ux, vz] of [[-0.5, -0.5], [0.5, -0.5], [-0.5, -0.15], [0.5, -0.15], [-0.5, 0.2], [0.5, 0.2]] as const)
        placeGlb('parktree', cx + ux * half, cz + vz * half, 3.2, 7, makeTree);
      for (const [ux, vz] of [[-0.32, -0.32], [0.32, -0.32], [-0.32, 0.05], [0.32, 0.05]] as const) {
        const bn = makeBench(); bn.rotation.y = Math.atan2(-(ux), -(vz + 0.1));
        place(bn, cx + ux * half, cz + vz * half, 2.4);
      }
    } else if (biome === 'park') {
      // gazebo lives on the pond-walk (block 4,2 east side); block (4,3) centre
      // belongs to the soccer pitch — no more landmarks stacked on events
      if (gy === 2) placeGlb('gazebo', cx + half * 0.5, cz + half * 0.42, 5, 8.5);
      for (let t = 0; t < 9; t++) {
        const [x, z] = jitter();
        if (Math.random() < 0.55) placeGlb('parktree', x, z, 3.4, rand(6.5, 8.5), makeTree);
        else place(makeTree(), x, z, 3.4);
      }
      if (gy === 2) placeGlb('golfcart', cx - half * 0.55, cz + half * 0.4, 2.6, 3.2, () => new THREE.Group(), rand(0, Math.PI));
      for (let t = 0; t < 4; t++) { const [x, z] = jitter(); place(makeBush(), x, z, 1.6); }
      for (let t = 0; t < 2; t++) { const [x, z] = jitter(); place(makeBench(), x, z, 2.4); }
    } else if (biome === 'forest') {
      const jf = () => [cx + rand(-(half - 4), half - 4), cz + rand(-(half - 4), half - 4)] as const;
      for (let t = 0; t < 20; t++) {
        const [x, z] = jf();
        if (Math.random() < 0.45) placeGlb('pine', x, z, 3, rand(7, 9.5), makePine);
        else place(Math.random() < 0.7 ? makePine() : makeTree(), x, z, 3);
      }
      placeGlb('rocks', cx + rand(-half * 0.5, half * 0.5), cz + rand(-half * 0.5, half * 0.5), 2.4, 2.6, () => new THREE.Group(), rand(0, Math.PI * 2));
      if (gx === 4 && gy === 0) {   // the campsite block gets the AI camp set
        placeGlb('tent', cx - 10, cz + 4, 2.6, 4.2, () => new THREE.Group(), rand(-0.4, 0.4));
        placeGlb('campfire', cx, cz, 1.4, 1.7, () => new THREE.Group());
      }
      for (let t = 0; t < 5; t++) { const [x, z] = jitter(); place(makeBush(), x, z, 1.6); }
    } else if (biome === 'beach') {
      // the beach CLUB: AI palms, lifeguard tower, umbrella camps, sandcastles
      for (let t = 0; t < 6; t++) {
        const [x, z] = jitter();
        if (Math.random() < 0.7) placeGlb('palm', x, z, 2.6, rand(6.5, 8.5), makePalm, rand(0, Math.PI * 2));
        else place(makePalm(), x, z, 2.6);
      }
      for (let t = 0; t < 2; t++) placeGlb('umbrella', cx + rand(-half * 0.7, half * 0.7), cz + rand(-half * 0.6, half * 0.6), 1.8, 3.2, () => new THREE.Group(), rand(0, Math.PI * 2));
      placeGlb('sandcastle', cx + rand(-half * 0.6, half * 0.6), cz + rand(-half * 0.4, half * 0.6), 1.2, 1.9, () => new THREE.Group(), rand(0, Math.PI * 2));
      if (gx === 1) placeGlb('lifeguard', cx, cz + half * 0.5, 3.4, 7.5, undefined, Math.PI);
      if (gx === 2) placeGlb('cabana', cx - half * 0.3, cz - half * 0.3, 3, 4.6, undefined, rand(-0.3, 0.3));
      if (gx === 0) placeGlb('lighthouse', cx - half * 0.55, cz + half * 0.55, 10, 19);
      for (let t = 0; t < 3; t++) { const [x, z] = jitter(); place(makeBush(), x, z, 1.4); }
    } else if (biome === 'zoo') {
      placeGlb('zooarch', cx - half * 0.7, cz, 6, 9, undefined, Math.PI / 2);
      for (let t = 0; t < 5; t++) { const [x, z] = jitter(); place(Math.random() < 0.5 ? makeTree() : makeBush(), x, z, 3); }
    } else if (biome === 'airport') {
      // a real airfield: hangar + control tower + windsock + parked plane on
      // the apron (the runway/taxiway markings are baked into the ground)
      const hangar = new THREE.Mesh(new THREE.CylinderGeometry(9, 9, 18, 12, 1, false, 0, Math.PI),
        new THREE.MeshStandardMaterial({ color: 0xcfd6e0, roughness: 0.7, flatShading: true }));
      hangar.rotation.z = Math.PI / 2; hangar.rotation.y = Math.PI / 4; hangar.position.set(cx - half * 0.55, 4.5, cz + half * 0.6);
      setShadow(hangar); scene.add(hangar); addEdible(hangar, 9);
      { // control tower with a glass cab
        const tw = new THREE.Group();
        const col = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.9, 12, 10),
          new THREE.MeshStandardMaterial({ color: 0xe8eaf2, roughness: 0.7 }));
        col.position.y = 6; tw.add(col);
        const cab = new THREE.Mesh(new THREE.CylinderGeometry(3, 2.4, 2.6, 10),
          new THREE.MeshStandardMaterial({ color: 0x9fd8ee, roughness: 0.2, metalness: 0.3 }));
        cab.position.y = 13.2; tw.add(cab);
        const roof = new THREE.Mesh(new THREE.ConeGeometry(3.2, 1.2, 10),
          new THREE.MeshStandardMaterial({ color: 0xd85a5a, roughness: 0.6 }));
        roof.position.y = 15; tw.add(roof);
        place(tw, cx - half * 0.75, cz + half * 0.35, 6);
      }
      { // cute parked plane, nose along the taxi direction
        const pl = new THREE.Group();
        const white = new THREE.MeshStandardMaterial({ color: 0xf4f6fa, roughness: 0.4, metalness: 0.1 });
        const teal = new THREE.MeshStandardMaterial({ color: 0x5ec8d8, roughness: 0.5 });
        const fus = new THREE.Mesh(new THREE.CapsuleGeometry(1.3, 6, 6, 10), white);
        fus.rotation.z = Math.PI / 2; fus.position.y = 2; pl.add(fus);
        const cockpit = new THREE.Mesh(new THREE.SphereGeometry(1.1, 10, 8), new THREE.MeshStandardMaterial({ color: 0xbfeaff, roughness: 0.15 }));
        cockpit.position.set(2.6, 2.6, 0); cockpit.scale.set(1.2, 0.8, 0.9); pl.add(cockpit);
        const wing = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.3, 11), teal);
        wing.position.set(0.4, 2.1, 0); pl.add(wing);
        const tail = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.6, 0.28), teal);
        tail.position.set(-4.2, 3.4, 0); pl.add(tail);
        const hstab = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.24, 4.2), teal);
        hstab.position.set(-4.2, 2.6, 0); pl.add(hstab);
        for (const sz of [-1.4, 1.4]) {
          const gear = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.4, 8), new THREE.MeshStandardMaterial({ color: 0x20242c }));
          gear.rotation.x = Math.PI / 2; gear.position.set(0.8, 0.55, sz); pl.add(gear);
        }
        pl.rotation.y = -Math.PI / 4;    // parked ON the apron, nose to the runway
        place(pl, cx - half * 0.35, cz + half * 0.45, 5);
      }
      { // windsock
        const ws = new THREE.Group();
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 7, 6), new THREE.MeshStandardMaterial({ color: 0xc8cdd8, metalness: 0.5 }));
        pole.position.y = 3.5; ws.add(pole);
        const sock = new THREE.Mesh(new THREE.ConeGeometry(0.7, 2.6, 8), new THREE.MeshStandardMaterial({ color: 0xff8a3a, roughness: 0.8 }));
        sock.rotation.z = Math.PI / 2; sock.position.set(1.4, 6.6, 0); ws.add(sock);
        place(ws, cx - half * 0.7, cz - half * 0.18, 1.4);
      }
    } else if (biome === 'military') {
      // most of this block is ocean — the base is a neat row on the NW land
      // triangle: three bunkers facing the road, helipad + tank behind
      for (const ux of [-0.8, -0.5, -0.2]) {
        const bunker = new THREE.Mesh(new THREE.BoxGeometry(8, 4, 8),
          new THREE.MeshStandardMaterial({ color: 0x6b7050, roughness: 0.95, flatShading: true }));
        place(bunker, cx + ux * half, cz - half * 0.8, 4);
      }
      placeGlb('heli', cx - half * 0.35, cz - half * 0.5, 5, 5.5, undefined, rand(0, Math.PI * 2));
      placeGlb('tank', cx - half * 0.65, cz - half * 0.5, 4, 3.4, undefined, Math.PI / 2);
    }

    // starter food — tiny props (cones/hydrants/trash/flowers) scattered in every
    // walkable block so a speck-sized void always has something to nibble.
    if (biome !== 'military') {
      const tinyN = biome === 'forest' ? 12 : 30;   // denser snack carpet
      // exclusion zones: nothing scatters into the fountain ring or the pond
      const tinyOk = (x: number, z: number) => {
        if (biome === 'plaza' && Math.hypot(x - cx, z - cz) < 13) return false;
        if (biome === 'park' && gx === 4 && gy === 2 && Math.hypot(x - cx, z - (cz + 6)) < 17) return false;
        return true;
      };
      for (let t = 0; t < tinyN; t++) {
        const [x, z] = jitter();
        if (!tinyOk(x, z)) continue;
        place(tinyFor(biome), x, z, rand(0.6, 0.85));
      }
      for (let t = 0; t < 3; t++) { const [x, z] = jitter(); if (tinyOk(x, z)) place(makeCoins(), x, z, 0.55); }
    }
  }

  // line the road edges: cones (starter snacks) + streetlamps on the sidewalks
  const roads3 = ROAD_CENTERS.map((c) => w(c));
  for (const rc of roads3) {
    let ci = 0;
    for (let a = -270; a < 270; a += 32, ci++) {
      const side = ci % 2 ? 3.4 : -3.4;   // even alternating comb, no clumps
      if (insideIsland3(a, rc)) place(makeCone(), a, rc + side, 0.7);
      if (insideIsland3(rc, a)) place(makeCone(), rc - side, a, 0.7);
    }
    let li = 0;
    for (let a = -280; a < 280; a += 24, li++) {
      const side = li % 2 ? 4.6 : -4.6;
      if (insideIsland3(a, rc)) place(makeLamp(), a, rc + side, 0.7);
      if (insideIsland3(rc, a)) place(makeLamp(), rc - side, a, 0.7);
    }
  }

  // opening snack cluster: a ring of easy food around the spawn junction so a
  // brand-new player eats 5+ things in the first fifteen seconds (hole.io rule)
  {
    const sx0 = w(ROAD_CENTERS[0]), sz0 = w(ROAD_CENTERS[2]);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const r0 = 7 + (i % 3) * 3.5;
      place(i % 3 === 0 ? makeCoins() : makeTinyProp(), sx0 + Math.cos(a) * r0, sz0 + Math.sin(a) * r0, i % 3 === 0 ? 0.55 : rand(0.6, 0.8));
    }
  }

  // exactly ONE hot-air balloon in the sky — animated from createIsland's update
  spawnBalloon(scene);
}

// cheap island-membership check (bounding blob) for road-edge scatter
function inIslandApprox(x3: number, z3: number): boolean {
  return Math.hypot(x3 / 285, z3 / 300) < 0.96;
}
