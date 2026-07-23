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
  // dense hole.io-style subdivision: four lots per long row, three per side
  for (const k of [-1.5, -0.5, 0.5, 1.5]) {
    lots.push({ x: cx + k * 400, y: cy - E, rot: Math.PI, fx: 0, fy: -1 });   // north row → north road
    lots.push({ x: cx + k * 400, y: cy + E, rot: 0, fx: 0, fy: 1 });          // south row → south road
  }
  for (const k of [-1, 0, 1]) {
    lots.push({ x: cx - E, y: cy + k * 400, rot: -Math.PI / 2, fx: -1, fy: 0 });  // west edge
    lots.push({ x: cx + E, y: cy + k * 400, rot: Math.PI / 2, fx: 1, fy: 0 });    // east edge
  }
  return lots;
}
// deterministic backyard pool assignment (shared by bake + populate): fancy
// blocks give every third street-row lot a pool behind the house
export function lotPool(biome: Biome, li: number, lot: HouseLot): { x: number; y: number } | null {
  if (biome !== 'fancy' || lot.fy === 0 || li % 3 !== 1) return null;
  return { x: lot.x + 120, y: lot.y - lot.fy * 300 };
}
const ROAD_CENTERS = [2580, 4290, 6000, 7710, 9420];

const RIVER: [number, number][] = [
  [8405, 1149], [8277, 3035], [8565, 5337], [8213, 6887], [8469, 8661], [9431, 9305], [9700, 9830], [9800, 10150],
];
const POND: [number, number, number] = [8565, 5337, 304];
// river x at a given world y (linear along the polyline) — bridges + banks
function riverXAtWorld(wy: number): number | null {
  for (let i = 0; i < RIVER.length - 1; i++) {
    const [x0, y0] = RIVER[i], [x1, y1] = RIVER[i + 1];
    if ((wy >= y0 && wy <= y1) || (wy >= y1 && wy <= y0)) {
      const t = (wy - y0) / ((y1 - y0) || 1);
      return x0 + t * (x1 - x0);
    }
  }
  return null;
}
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
// lagoon membership (with a margin): roads, props and cars must never wade in
export function inLagoon3(x3: number, z3: number, margin = 120): boolean {
  const wx = x3 / SCALE + CX, wy = z3 / SCALE + CZ;
  const nx = (wx - LAGOON.x) / (LAGOON.rx + margin), ny = (wy - LAGOON.y) / (LAGOON.ry + margin);
  return nx * nx + ny * ny < 1;
}
// coast clearance: is this point at least `d` units from the void edge?
export function coastClear(x3: number, z3: number, d = 12): boolean {
  const len = Math.hypot(x3, z3) || 1;
  return insideIsland3(x3 + (x3 / len) * d, z3 + (z3 / len) * d);
}

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

  // pavement blocks read ENGINEERED: expansion-joint grid + inner courtyard
  // tint on downtown blocks (the street-wall buildings frame a service court)
  for (let gy = 0; gy < 6; gy++) for (let gx = 0; gx < 6; gx++) {
    const b = PLAN[gy][gx];
    if (b !== 'downtown' && b !== 'plaza') continue;
    const cxB = blockCenter(gx), cyB = blockCenter(gy);
    const x0 = pxW(cxB - BLOCK_SIZE / 2), y0 = pyW(cyB - BLOCK_SIZE / 2);
    const x1 = pxW(cxB + BLOCK_SIZE / 2), y1 = pyW(cyB + BLOCK_SIZE / 2);
    g.save(); g.beginPath(); g.rect(x0, y0, x1 - x0, y1 - y0); g.clip();
    g.strokeStyle = 'rgba(90,100,130,0.10)'; g.lineWidth = Math.max(1.2, pxW(10) - pxW(0));
    for (let s = 0; s <= 16; s++) {
      const t = cxB - BLOCK_SIZE / 2 + (s / 16) * BLOCK_SIZE;
      g.beginPath(); g.moveTo(pxW(t), y0); g.lineTo(pxW(t), y1); g.stroke();
      const ty = cyB - BLOCK_SIZE / 2 + (s / 16) * BLOCK_SIZE;
      g.beginPath(); g.moveTo(x0, pyW(ty)); g.lineTo(x1, pyW(ty)); g.stroke();
    }
    if (b === 'downtown') {
      // asphalt service court behind the street walls
      const ch = BLOCK_SIZE * 0.27;
      g.fillStyle = '#dcdce6';
      g.fillRect(pxW(cxB - ch), pyW(cyB - ch), pxW(cxB + ch) - pxW(cxB - ch), pyW(cyB + ch) - pyW(cyB - ch));
      g.strokeStyle = 'rgba(90,100,130,0.25)'; g.lineWidth = Math.max(1.5, pxW(14) - pxW(0));
      g.strokeRect(pxW(cxB - ch), pyW(cyB - ch), pxW(cxB + ch) - pxW(cxB - ch), pyW(cyB + ch) - pyW(cyB - ch));
    }
    g.restore();
  }

  // road furniture: manhole covers along every road + white guidance arrows
  // approaching each junction — the asphalt reads MAINTAINED, not painted-on
  {
    const mR = pxW(26) - pxW(0);
    for (const c of ROAD_CENTERS) {
      for (let a = 1500; a < 10800; a += 2900) {   // occasional — a real street has a manhole here and there, not a polka-dot pattern
        const off = ((a / 640) % 2 ? 1 : -1) * 30;
        for (const [mx, my] of [[a, c + off], [c + off, a]] as const) {
          if (!insideIslandWorld(mx, my)) continue;
          g.fillStyle = 'rgba(50,55,72,0.85)';
          g.beginPath(); g.arc(pxW(mx), pyW(my), mR, 0, Math.PI * 2); g.fill();
          g.strokeStyle = 'rgba(190,196,214,0.55)'; g.lineWidth = Math.max(1, mR * 0.22);
          g.beginPath(); g.arc(pxW(mx), pyW(my), mR * 0.66, 0, Math.PI * 2); g.stroke();
        }
      }
    }
    // lane arrows: one straight-ahead arrow per approach lane, 260wu before
    // the junction, pointing at it (right-hand traffic)
    const arrow = (wx: number, wy: number, dirX: number, dirY: number) => {
      if (!insideIslandWorld(wx, wy)) return;
      const axp = pxW(wx), ayp = pyW(wy), u = pxW(16) - pxW(0);
      const ang = Math.atan2(dirY, dirX);
      g.save(); g.translate(axp, ayp); g.rotate(ang);
      g.fillStyle = 'rgba(240,244,252,0.85)';
      g.fillRect(-u * 2.4, -u * 0.5, u * 2.8, u);
      g.beginPath(); g.moveTo(u * 0.4, -u * 1.4); g.lineTo(u * 2.4, 0); g.lineTo(u * 0.4, u * 1.4); g.closePath(); g.fill();
      g.restore();
    };
    for (const jx of ROAD_CENTERS) for (const jy of ROAD_CENTERS) {
      arrow(jx - 260, jy + 28, 1, 0);   // eastbound approach
      arrow(jx + 260, jy - 28, -1, 0);  // westbound
      arrow(jx + 28, jy - 260, 0, 1);   // southbound
      arrow(jx - 28, jy + 260, 0, -1);  // northbound
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
    // per-lot yard engineering: driveway to the road, lawn panel, front walk,
    // fenced-in backyard patch (+ pool on fancy lots) — the block reads like a
    // surveyor drew it, not like houses fell on grass
    const dw = pxW(110) - pxW(0);            // driveway width
    houseLots(gx, gy).forEach((lot, li) => {
      const frontClear = 130;                // house footprint half-depth
      const sxd = -lot.fy, syd = lot.fx;     // along-street direction
      // lawn panel: a slightly brighter, clearly-bounded yard rectangle
      const yw = 360, yd = 560;              // yard width (along street) / depth
      const yx = lot.x - (lot.fx !== 0 ? lot.fx * (yd / 2 - frontClear) : 0);
      const yy = lot.y - (lot.fy !== 0 ? lot.fy * (yd / 2 - frontClear) : 0);
      const rw = lot.fy !== 0 ? yw : yd, rh = lot.fy !== 0 ? yd : yw;
      g.fillStyle = 'rgba(255,255,255,0.10)';
      g.fillRect(pxW(yx - rw / 2), pyW(yy - rh / 2), pxW(yx + rw / 2) - pxW(yx - rw / 2), pyW(yy + rh / 2) - pyW(yy - rh / 2));
      g.strokeStyle = 'rgba(70,110,60,0.18)'; g.lineWidth = Math.max(1.5, pxW(14) - pxW(0));
      g.strokeRect(pxW(yx - rw / 2), pyW(yy - rh / 2), pxW(yx + rw / 2) - pxW(yx - rw / 2), pyW(yy + rh / 2) - pyW(yy - rh / 2));
      // driveway: from the house's front edge, over the sidewalk, to the asphalt
      g.fillStyle = '#d9d5df';
      if (lot.fy !== 0) {
        const y0 = lot.fy < 0 ? cyB - BLOCK_SIZE / 2 : lot.y + frontClear;
        const y1 = lot.fy < 0 ? lot.y - frontClear : cyB + BLOCK_SIZE / 2;
        g.fillRect(pxW(lot.x + 110) - dw / 2, pyW(y0), dw, pyW(y1) - pyW(y0));
      } else {
        const x0 = lot.fx < 0 ? cxB - BLOCK_SIZE / 2 : lot.x + frontClear;
        const x1 = lot.fx < 0 ? lot.x - frontClear : cxB + BLOCK_SIZE / 2;
        g.fillRect(pxW(x0), pyW(lot.y + 110) - dw / 2, pxW(x1) - pxW(x0), dw);
      }
      // front walk: stepping-stone dashes from the door to the sidewalk
      g.fillStyle = 'rgba(233,235,242,0.85)';
      const steps = 4;
      for (let s = 0; s < steps; s++) {
        const t = frontClear + 40 + s * 90;
        const wxs = lot.x + lot.fx * t - sxd * 30, wys = lot.y + lot.fy * t - syd * 30;
        g.fillRect(pxW(wxs) - (pxW(28) - pxW(0)), pyW(wys) - (pxW(20) - pxW(0)), pxW(56) - pxW(0), pxW(40) - pxW(0));
      }
      // backyard: garden bed + patio square behind the house
      const bx = lot.x - lot.fx * (frontClear + 240), by = lot.y - lot.fy * (frontClear + 240);
      g.fillStyle = 'rgba(126,213,122,0.75)';
      g.fillRect(pxW(bx - 130), pyW(by - 130), pxW(260) - pxW(0), pxW(260) - pxW(0));
      g.fillStyle = 'rgba(220,216,226,0.65)';   // soft patio slab tucked at the corner
      g.fillRect(pxW(bx + 40 * (li % 2 ? 1 : -1) - 55), pyW(by - 55), pxW(110) - pxW(0), pxW(110) - pxW(0));
      // pool (fancy lots, deterministic — matches populate's clutter exclusion)
      const pool = lotPool(b, li, lot);
      if (pool) {
        g.fillStyle = '#f2f3f7';
        g.beginPath(); g.ellipse(pxW(pool.x), pyW(pool.y), pxW(150) - pxW(0), pxW(105) - pxW(0), 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = hex(WORLD.waterShallow);
        g.beginPath(); g.ellipse(pxW(pool.x), pyW(pool.y), pxW(122) - pxW(0), pxW(80) - pxW(0), 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.45)';
        g.beginPath(); g.ellipse(pxW(pool.x - 30), pyW(pool.y - 20), pxW(34) - pxW(0), pxW(18) - pxW(0), 0.5, 0, Math.PI * 2); g.fill();
      }
    });
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

  // CIVIC PLAZA — formal axis: paved forecourt, twin lawn panels, a walkway
  // from the town-hall steps to the fountain (populate stages the buildings)
  {
    const pcx = 6855, pcy = 5145;
    // twin lawn panels flanking the axis
    for (const s of [-1, 1]) {
      g.fillStyle = hex(WORLD.park);
      g.fillRect(pxW(pcx + s * 330 - 190), pyW(4780), pxW(380) - pxW(0), pyW(5560) - pyW(4780));
      g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = Math.max(1.5, pxW(16) - pxW(0));
      g.strokeRect(pxW(pcx + s * 330 - 190), pyW(4780), pxW(380) - pxW(0), pyW(5560) - pyW(4780));
    }
    // ceremonial walkway: town hall → fountain
    g.fillStyle = '#e6e2ee';
    g.fillRect(pxW(pcx - 100), pyW(4520), pxW(200) - pxW(0), pyW(5145) - pyW(4520));
    g.strokeStyle = 'rgba(122,79,224,0.25)'; g.lineWidth = Math.max(1.5, pxW(12) - pxW(0));
    g.strokeRect(pxW(pcx - 100), pyW(4520), pxW(200) - pxW(0), pyW(5145) - pyW(4520));
  }

  // SCHOOLYARD — blacktop + hopscotch beside the school (kids notice schools)
  {
    const syx = 6440, syy = 5390;
    g.fillStyle = '#8d93aa';
    g.fillRect(pxW(syx - 170), pyW(syy - 130), pxW(340) - pxW(0), pyW(260) - pyW(0));
    g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = Math.max(1.2, pxW(10) - pxW(0));
    // hopscotch ladder
    for (let k = 0; k < 5; k++) g.strokeRect(pxW(syx - 120), pyW(syy - 100 + k * 42), pxW(44) - pxW(0), pyW(42) - pyW(0));
    // foursquare
    g.strokeRect(pxW(syx + 20), pyW(syy - 70), pxW(120) - pxW(0), pyW(120) - pyW(0));
    g.beginPath(); g.moveTo(pxW(syx + 80), pyW(syy - 70)); g.lineTo(pxW(syx + 80), pyW(syy + 50)); g.stroke();
    g.beginPath(); g.moveTo(pxW(syx + 20), pyW(syy - 10)); g.lineTo(pxW(syx + 140), pyW(syy - 10)); g.stroke();
  }

  // BEACH BOARDWALK — a continuous plank promenade along the top of the whole
  // beach strip, with scattered bright towels on the sand below it
  {
    const bwY0 = 9475, bwY1 = 9660;
    const bx0 = 925, bx1 = 9365;
    g.fillStyle = '#e2b378';
    g.fillRect(pxW(bx0), pyW(bwY0), pxW(bx1) - pxW(bx0), pyW(bwY1) - pyW(bwY0));
    g.strokeStyle = 'rgba(160,110,60,0.35)'; g.lineWidth = Math.max(1, pxW(8) - pxW(0));
    for (let bx = bx0; bx < bx1; bx += 55) {   // plank joints
      g.beginPath(); g.moveTo(pxW(bx), pyW(bwY0)); g.lineTo(pxW(bx), pyW(bwY1)); g.stroke();
    }
    g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = Math.max(1.5, pxW(14) - pxW(0));
    g.beginPath(); g.moveTo(pxW(bx0), pyW(bwY0)); g.lineTo(pxW(bx1), pyW(bwY0)); g.stroke();
    g.beginPath(); g.moveTo(pxW(bx0), pyW(bwY1)); g.lineTo(pxW(bx1), pyW(bwY1)); g.stroke();
    // towels: bright rounded rects angled on the sand
    const towelCols = ['#ff6a5e', '#4db07a', '#4d7de8', '#f0c050', '#f06fb0', '#5ec8d8'];
    for (let i = 0; i < 34; i++) {
      const twx = 1100 + Math.random() * 7900, twy = 9760 + Math.random() * 900;
      if (!insideIslandWorld(twx, twy)) continue;
      if (Math.hypot(twx - LAGOON.x, (twy - LAGOON.y) * 1.35) < LAGOON.rx + 160) continue;
      g.save(); g.translate(pxW(twx), pyW(twy)); g.rotate(Math.random() * 0.8 - 0.4);
      g.fillStyle = towelCols[i % towelCols.length];
      g.fillRect(-(pxW(55) - pxW(0)), -(pxW(90) - pxW(0)), pxW(110) - pxW(0), pxW(180) - pxW(0));
      g.fillStyle = 'rgba(255,255,255,0.55)';
      g.fillRect(-(pxW(55) - pxW(0)), -(pxW(90) - pxW(0)), pxW(110) - pxW(0), pxW(26) - pxW(0));
      g.restore();
    }
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

  // river SOURCE: a spring pool where the river begins (it used to dead-end
  // into plain forest grass like a cut hose)
  {
    const [sx2, sy2] = RIVER[0];
    g.fillStyle = '#4d8aa0';
    g.beginPath(); g.ellipse(pxW(sx2), pyW(sy2), pxW(210) - pxW(0), pyW(170) - pyW(0), 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = hex(WORLD.riverMid);
    g.beginPath(); g.ellipse(pxW(sx2), pyW(sy2), pxW(175) - pxW(0), pyW(138) - pyW(0), 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = hex(WORLD.riverDeep);
    g.beginPath(); g.ellipse(pxW(sx2), pyW(sy2), pxW(95) - pxW(0), pyW(75) - pyW(0), 0, 0, Math.PI * 2); g.fill();
  }

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


  // ZOO — visitor path loop + three pens (savanna / paddock / flamingo water)
  {
    const zcx = blockCenter(5), zcy = blockCenter(1);
    g.save(); g.beginPath();
    g.rect(pxW(zcx - BLOCK_SIZE / 2), pyW(zcy - BLOCK_SIZE / 2), pxW(zcx + BLOCK_SIZE / 2) - pxW(zcx - BLOCK_SIZE / 2), pyW(zcy + BLOCK_SIZE / 2) - pyW(zcy - BLOCK_SIZE / 2));
    g.clip();
    g.strokeStyle = hex(WORLD.dirtPath); g.lineWidth = pxW(120) - pxW(0); g.lineJoin = 'round';
    g.beginPath();
    g.ellipse(pxW(zcx - 240), pyW(zcy), pxW(430) - pxW(0), pyW(520) - pyW(0), 0, 0, Math.PI * 2);
    g.stroke();
    const pen = (px0: number, py0: number, wns: number, hns: number, col: string) => {
      g.fillStyle = col;
      g.fillRect(pxW(px0), pyW(py0), pxW(px0 + wns) - pxW(px0), pyW(py0 + hns) - pyW(py0));
      g.strokeStyle = 'rgba(120,100,60,0.4)'; g.lineWidth = Math.max(1.5, pxW(14) - pxW(0));
      g.strokeRect(pxW(px0), pyW(py0), pxW(px0 + wns) - pxW(px0), pyW(py0 + hns) - pyW(py0));
    };
    pen(zcx - 560, zcy - 620, 520, 380, '#e6d494');            // savanna sand
    pen(zcx - 560, zcy + 240, 520, 380, '#cfe0a8');            // grazing paddock
    pen(zcx - 20, zcy - 200, 440, 400, hex(WORLD.waterShallow)); // flamingo lagoon
    g.restore();
  }

  // MILITARY — fenced compound pad + painted helipad on the NW land triangle
  {
    const mcx = blockCenter(5), mcy = blockCenter(5);
    g.fillStyle = '#7d8268';
    g.fillRect(pxW(mcx - 780), pyW(mcy - 780), pxW(700) - pxW(0), pyW(420) - pyW(0));
    g.strokeStyle = 'rgba(255,210,60,0.75)'; g.lineWidth = Math.max(2, pxW(18) - pxW(0));
    g.strokeRect(pxW(mcx - 780), pyW(mcy - 780), pxW(700) - pxW(0), pyW(420) - pyW(0));
    // helipad: ring + H
    const hx2 = pxW(mcx - 250), hy2 = pyW(mcy - 580), hr = pxW(120) - pxW(0);
    g.strokeStyle = 'rgba(240,244,252,0.9)'; g.lineWidth = hr * 0.16;
    g.beginPath(); g.arc(hx2, hy2, hr, 0, Math.PI * 2); g.stroke();
    g.lineWidth = hr * 0.2; g.lineCap = 'butt';
    g.beginPath(); g.moveTo(hx2 - hr * 0.4, hy2 - hr * 0.45); g.lineTo(hx2 - hr * 0.4, hy2 + hr * 0.45); g.stroke();
    g.beginPath(); g.moveTo(hx2 + hr * 0.4, hy2 - hr * 0.45); g.lineTo(hx2 + hr * 0.4, hy2 + hr * 0.45); g.stroke();
    g.beginPath(); g.moveTo(hx2 - hr * 0.4, hy2); g.lineTo(hx2 + hr * 0.4, hy2); g.stroke();
  }

  // PARK — real soccer pitch paint at block (4,3): boundary, halfway, circle
  {
    const scx = blockCenter(4), scy = blockCenter(3);
    g.fillStyle = '#8fd472';
    g.fillRect(pxW(scx - 260), pyW(scy - 170), pxW(520) - pxW(0), pyW(340) - pyW(0));
    g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = Math.max(1.5, pxW(12) - pxW(0));
    g.strokeRect(pxW(scx - 240), pyW(scy - 150), pxW(480) - pxW(0), pyW(300) - pyW(0));
    g.beginPath(); g.moveTo(pxW(scx), pyW(scy - 150)); g.lineTo(pxW(scx), pyW(scy + 150)); g.stroke();
    g.beginPath(); g.arc(pxW(scx), pyW(scy), pxW(60) - pxW(0), 0, Math.PI * 2); g.stroke();
    for (const sxg of [-1, 1]) g.strokeRect(pxW(scx + sxg * 240 - (sxg > 0 ? 90 : 0)), pyW(scy - 80), pxW(90) - pxW(0), pyW(160) - pyW(0));
  }

  // FOREST CAMPSITE — dirt clearing + trail so the camp sits in a real glade
  {
    const ccx = blockCenter(4), ccy = blockCenter(0);
    g.fillStyle = hex(WORLD.dirtPath);
    g.beginPath(); g.ellipse(pxW(ccx - 100), pyW(ccy + 60), pxW(330) - pxW(0), pyW(260) - pyW(0), 0.3, 0, Math.PI * 2); g.fill();
    g.strokeStyle = hex(WORLD.dirtPath); g.lineWidth = pxW(70) - pxW(0); g.lineCap = 'round';
    g.beginPath(); g.moveTo(pxW(ccx - 100), pyW(ccy + 300)); g.quadraticCurveTo(pxW(ccx - 300), pyW(ccy + 600), pxW(ccx - 200), pyW(blockCenter(0) + BLOCK_SIZE / 2)); g.stroke();
  }

  // POND — sandy bank ring + deep centre (was a flat washed-out disc)
  g.strokeStyle = 'rgba(230,212,148,0.85)'; g.lineWidth = pxW(60) - pxW(0);
  g.beginPath(); g.ellipse(pxW(POND[0]), pyW(POND[1]), pxW(POND[2] + 20) - pxW(0), pyW(POND[2] + 20) - pyW(0), 0, 0, Math.PI * 2); g.stroke();
  g.fillStyle = hex(WORLD.riverDeep);
  g.beginPath(); g.ellipse(pxW(POND[0]), pyW(POND[1]), pxW(POND[2] * 0.55) - pxW(0), pyW(POND[2] * 0.55) - pyW(0), 0, 0, Math.PI * 2); g.fill();

  // BEACH VOLLEYBALL COURT — lined sand court under the net event at (2,5)
  {
    const vcx = blockCenter(2), vcy = blockCenter(5) + 180;
    g.fillStyle = '#fbeab2';
    g.fillRect(pxW(vcx - 200), pyW(vcy - 130), pxW(400) - pxW(0), pyW(260) - pyW(0));
    g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = Math.max(1.5, pxW(12) - pxW(0));
    g.strokeRect(pxW(vcx - 180), pyW(vcy - 110), pxW(360) - pxW(0), pyW(220) - pyW(0));
    g.beginPath(); g.moveTo(pxW(vcx), pyW(vcy - 110)); g.lineTo(pxW(vcx), pyW(vcy + 110)); g.stroke();
  }

  // AIRPORT — darker apron + yellow taxiway centreline + tie-down squares
  {
    const acx = blockCenter(5), acy = blockCenter(4);
    g.fillStyle = '#b8bcc9';
    g.fillRect(pxW(acx - 620), pyW(acy + 180), pxW(520) - pxW(0), pyW(380) - pyW(0));
    g.strokeStyle = 'rgba(255,210,60,0.85)'; g.lineWidth = Math.max(2, pxW(20) - pxW(0));
    g.beginPath(); g.moveTo(pxW(acx - 360), pyW(acy + 370)); g.lineTo(pxW(acx - 40), pyW(acy + 370)); g.lineTo(pxW(acx + 140), pyW(acy + 150)); g.stroke();
    g.strokeStyle = 'rgba(240,244,252,0.6)'; g.lineWidth = Math.max(1.5, pxW(10) - pxW(0));
    for (const tx of [-540, -420, -300]) g.strokeRect(pxW(acx + tx), pyW(acy + 240), pxW(90) - pxW(0), pyW(90) - pyW(0));
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
        if (insideIsland3(a, c) && !inLagoon3(a, c) && coastClear(a, c, 6)) spots.push({ x: a, z: c, rot: 0 });
        if (insideIsland3(c, a) && !inLagoon3(c, a) && coastClear(c, a, 6)) spots.push({ x: c, z: a, rot: Math.PI / 2 });
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
  waterfall.position.set(wfX, -8.5, wfZ);   // lip breaks the cliff rim — visible from above
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
  }, undefined, () => {
    // asset unreachable: the FAIR still exists — procedural wheel stand-in
    const fb = makeFerrisFB();
    fb.position.set(w(blockCenter(3)) + 4, 0, w(blockCenter(5)) - 14);
    fb.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    scene.add(fb); addEdible(fb, 9);
  });

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
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  facadeCache.set(key, t);
  return t;
}
// four outward side walls as ONE geometry (UVs tile in world units so window
// size is constant across building sizes) — a street of these is one draw
// call per building instead of six
function facadeBoxGeo(wB: number, h: number, d: number): THREE.BufferGeometry {
  const pos: number[] = [], norm: number[] = [], uv: number[] = [], idx: number[] = [];
  const face = (ax: number, az: number, bx: number, bz: number, nx: number, nz: number) => {
    const base = pos.length / 3, len = Math.hypot(bx - ax, bz - az);
    pos.push(ax, 0, az, bx, 0, bz, bx, h, bz, ax, h, az);
    for (let i = 0; i < 4; i++) norm.push(nx, 0, nz);
    uv.push(0, 0, len / 11, 0, len / 11, h / 26, 0, h / 26);
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  };
  const hw = wB / 2, hd = d / 2;
  face(-hw, hd, hw, hd, 0, 1);      // front (+z, street side)
  face(hw, -hd, -hw, -hd, 0, -1);   // back
  face(hw, hd, hw, -hd, 1, 0);      // right
  face(-hw, -hd, -hw, hd, -1, 0);   // left
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(norm), 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uv), 2));
  geo.setIndex(idx);
  return geo;
}
// shared downtown materials/geometry (hundreds of buildings — zero per-instance alloc)
const sideMatCache = new Map<string, THREE.MeshStandardMaterial>();
function facadeMat(wall: number, warm: boolean): THREE.MeshStandardMaterial {
  const key = `${wall}-${warm}`;
  let m = sideMatCache.get(key);
  if (!m) { m = new THREE.MeshStandardMaterial({ map: facadeTex(wall, warm), roughness: 0.65 }); sideMatCache.set(key, m); }
  return m;
}
const capMatShared = new THREE.MeshStandardMaterial({ color: 0x565e74, roughness: 0.8 });
const acMatShared = new THREE.MeshStandardMaterial({ color: 0x9aa3b2, roughness: 0.8 });
const tankMatShared = new THREE.MeshStandardMaterial({ color: 0xc8cdd8, metalness: 0.4, roughness: 0.5 });
const awningMats = [0xe8604d, 0x4db07a, 0x4d7de8, 0xf0c050, 0xf06fb0].map((c2) => new THREE.MeshStandardMaterial({ color: c2, roughness: 0.7 }));
// a flush-sided city block building: hole.io's street-wall unit. Front is +Z.
function makeRowBuilding(wB: number, d: number, h: number): THREE.Group {
  const grp = new THREE.Group();
  const sides = new THREE.Mesh(facadeBoxGeo(wB, h, d), facadeMat(pick(PROPS.tower), Math.random() < 0.5));
  grp.add(sides);
  // roof slab doubles as a parapet lip
  const cap = new THREE.Mesh(new THREE.BoxGeometry(wB + 0.36, 0.8, d + 0.36), capMatShared);
  cap.position.y = h - 0.15; grp.add(cap);
  // roof clutter: AC unit, or a water tower on taller stock
  if (h > 13 && Math.random() < 0.4) {
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.3, 2.2, 8), tankMatShared);
    tank.position.set(rand(-wB * 0.2, wB * 0.2), h + 1.7, rand(-d * 0.2, d * 0.2)); grp.add(tank);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(1.35, 0.8, 8), capMatShared);
    cone.position.set(tank.position.x, h + 3.2, tank.position.z); grp.add(cone);
  } else if (Math.random() < 0.7) {
    const ac = new THREE.Mesh(new THREE.BoxGeometry(rand(1.2, 2), 0.9, rand(1.2, 2)), acMatShared);
    ac.position.set(rand(-wB * 0.25, wB * 0.25), h + 0.7, rand(-d * 0.25, d * 0.25)); grp.add(ac);
  }
  // street-level awning — retail charm on the sidewalk face
  if (Math.random() < 0.55) {
    const aw = new THREE.Mesh(new THREE.BoxGeometry(wB * 0.72, 0.2, 1.2), pick(awningMats));
    aw.position.set(0, 3.1, d / 2 + 0.55); grp.add(aw);
  }
  return grp;
}
// small garden shed for suburban backyards
function makeShed(): THREE.Group {
  const grp = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2, 2), new THREE.MeshStandardMaterial({ color: pick([0xbfe0cf, 0xd8c8ec, 0xf2c9a0]), roughness: 0.9 }));
  body.position.y = 1; grp.add(body);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(2.2, 1.1, 4), new THREE.MeshStandardMaterial({ color: pick(PROPS.roof), roughness: 0.85, flatShading: true }));
  roof.rotation.y = Math.PI / 4; roof.position.y = 2.5; grp.add(roof);
  return grp;
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
  g.userData.coin = 5;   // flat wallet value — every pile visibly pays
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
  biome === 'beach' ? pick([makeShell, makeShell, makeFlowers, makeFlowers])()
  : biome === 'forest' ? pick([makeMushroom, makeMushroom, makeFlowers])()
  : biome === 'park' ? pick([makeGolfball, makeFlowers, makeFlowers])()
  : biome === 'zoo' ? pick([makeFlowers, makeShell, makeMushroom])()
  : biome === 'airport' ? pick([makeCone, makeLuggage, makeLuggage])()
  : makeTinyProp();
function makeReeds(): THREE.Group {
  const g = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const h = rand(0.9, 1.6);
    const r = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, h, 4),
      new THREE.MeshStandardMaterial({ color: pick([0x4faa5a, 0x67b25c, 0x7ec96e]), roughness: 1 }));
    r.position.set(rand(-0.5, 0.5), h / 2, rand(-0.5, 0.5)); r.rotation.z = rand(-0.15, 0.15); g.add(r);
    if (i < 2) {
      const tip = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.24, 3, 6),
        new THREE.MeshStandardMaterial({ color: 0x9a7a5a, roughness: 1 }));
      tip.position.set(r.position.x, h + 0.1, r.position.z); g.add(tip);
    }
  }
  return g;
}
function makeLuggage(): THREE.Group {
  const g = new THREE.Group();
  const b = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.6, 0.4), new THREE.MeshStandardMaterial({ color: pick([0xff5a4d, 0x5ec8d8, 0xffd23f, 0xb98cff]), roughness: 0.7 }));
  b.position.y = 0.3; g.add(b);
  const h = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.1, 0.08), new THREE.MeshStandardMaterial({ color: 0x3a3f4d }));
  h.position.y = 0.68; g.add(h);
  return g;
}

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


// silhouette sample points (3D) for the coast-dressing pass in populate()
const SIL3_FRINGE: [number, number][] = SIL_POLY.filter((_, i) => i % 3 === 0)
  .map(([wx2, wy2]) => [(wx2 - CX) * SCALE, (wy2 - CZ) * SCALE] as [number, number]);

// ── P0 fallback kit: every GLB prop has a real procedural stand-in, so no
// district is ever sparse while meshes stream (or offline). Cheap primitives,
// toy-bright colors, correct silhouettes.
const std = (c: number, r = 0.8) => new THREE.MeshStandardMaterial({ color: c, roughness: r });
function makeUmbrellaFB(): THREE.Group {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3, 6), std(0xf4f6fa));
  pole.position.y = 1.5; g.add(pole);
  const top = new THREE.Mesh(new THREE.ConeGeometry(2, 0.9, 10), std(pick([0xff6a5e, 0x5ec8d8, 0xffd23f, 0xf06fb0])));
  top.position.y = 3; g.add(top);
  g.rotation.z = rand(-0.12, 0.12);
  return g;
}
function makeSandcastleFB(): THREE.Group {
  const g = new THREE.Group(); const m = std(0xeed9a0, 0.95);
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.9, 1.6), m); base.position.y = 0.45; g.add(base);
  for (const [sx, sz] of [[-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7], [0.7, 0.7]] as const) {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 1.4, 8), m); t.position.set(sx, 0.7, sz); g.add(t);
    const c = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.5, 8), std(0xffd23f)); c.position.set(sx, 1.62, sz); g.add(c);
  }
  return g;
}
function makeCabanaFB(): THREE.Group {
  const g = new THREE.Group(); const col = pick([0xff6a5e, 0x5ec8d8]);
  for (const [sx, sz] of [[-1.5, -1.2], [1.5, -1.2], [-1.5, 1.2], [1.5, 1.2]] as const) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 3, 6), std(0xf4f0e2)); post.position.set(sx, 1.5, sz); g.add(post);
  }
  const roof = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.24, 3), std(col)); roof.position.y = 3.1; g.add(roof);
  const back = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.4, 0.14), std(0xfaf6ea)); back.position.set(0, 1.4, -1.2); g.add(back);
  return g;
}
function makeLifeguardFB(): THREE.Group {
  const g = new THREE.Group(); const red = std(0xff5a4d), white = std(0xf4f6fa);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 3.6, 6), white); leg.position.set(sx, 1.8, sz); g.add(leg);
  }
  const hut = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.8, 2.6), red); hut.position.y = 4.4; g.add(hut);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(2.3, 1, 4), white); roof.rotation.y = Math.PI / 4; roof.position.y = 5.9; g.add(roof);
  const ramp = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.12, 3.4), std(0xeecf9a)); ramp.position.set(0, 1.9, 2.4); ramp.rotation.x = 0.85; g.add(ramp);
  return g;
}
function makeLighthouseFB(): THREE.Group {
  const g = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const band = new THREE.Mesh(new THREE.CylinderGeometry(1.7 - i * 0.16, 1.85 - i * 0.16, 2.6, 12), std(i % 2 ? 0xff5a4d : 0xf6f8fc, 0.7));
    band.position.y = 1.3 + i * 2.6; g.add(band);
  }
  const cab = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 1.6, 10), std(0x2c3a52, 0.4));
  cab.position.y = 14; g.add(cab);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.7, 10, 8), new THREE.MeshStandardMaterial({ color: 0xffe08a, emissive: 0xffd25a, emissiveIntensity: 0.9 }));
  lamp.position.y = 14; g.add(lamp);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(1.4, 1.2, 10), std(0xff5a4d)); cap.position.y = 15.4; g.add(cap);
  return g;
}
function makeGazeboFB(): THREE.Group {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.6, 0.5, 8), std(0xe8e2d2)); base.position.y = 0.25; g.add(base);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 3.4, 6), std(0xf6f2e6));
    post.position.set(Math.cos(a) * 2.8, 2.2, Math.sin(a) * 2.8); g.add(post);
  }
  const roof = new THREE.Mesh(new THREE.ConeGeometry(3.8, 2.2, 8), std(0x6fa8a0)); roof.position.y = 5; g.add(roof);
  return g;
}
function makeGolfcartFB(): THREE.Group {
  const g = new THREE.Group(); const white = std(0xf4f6fa, 0.5);
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.9, 1.4), white); body.position.y = 0.75; g.add(body);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(1, 0.5, 1.2), std(0x5ec8d8)); seat.position.set(-0.3, 1.35, 0); g.add(seat);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.14, 1.4), white); roof.position.y = 2.5; g.add(roof);
  for (const sx of [-0.9, 0.9]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.6, 5), white); post.position.set(sx, 1.7, 0); g.add(post);
  }
  for (const [sx, sz] of [[-0.9, -0.75], [0.9, -0.75], [-0.9, 0.75], [0.9, 0.75]] as const) {
    const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.26, 10), std(0x20242c, 0.9));
    wh.rotation.x = Math.PI / 2; wh.position.set(sx, 0.34, sz); g.add(wh);
  }
  return g;
}
function makeRocksFB(): THREE.Group {
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const r = new THREE.Mesh(new THREE.DodecahedronGeometry(rand(0.6, 1.2), 0), std(pick([0x9aa3b2, 0x8a92a4]), 1));
    r.position.set(rand(-1, 1), rand(0.3, 0.5), rand(-1, 1)); r.rotation.set(rand(0, 3), rand(0, 3), 0); g.add(r);
  }
  return g;
}
function makeTentFB(): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0, 2.2, 2.6, 4), std(pick([0xff8a70, 0x6db8e8])));
  body.rotation.y = Math.PI / 4; body.position.y = 1.3; body.scale.z = 1.3; g.add(body);
  const door = new THREE.Mesh(new THREE.CircleGeometry(0.7, 12, Math.PI, Math.PI), std(0x3a2f4a));
  door.position.set(0, 0.7, 1.45); g.add(door);
  return g;
}
function makeCampfireFB(): THREE.Group {
  const g = new THREE.Group();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const st = new THREE.Mesh(new THREE.DodecahedronGeometry(0.28, 0), std(0x9aa3b2, 1));
    st.position.set(Math.cos(a) * 0.9, 0.2, Math.sin(a) * 0.9); g.add(st);
  }
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.2, 7), new THREE.MeshStandardMaterial({ color: 0xff9a3a, emissive: 0xff7a2a, emissiveIntensity: 0.8 }));
  flame.position.y = 0.8; g.add(flame);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.6, 6), new THREE.MeshStandardMaterial({ color: 0xffe08a, emissive: 0xffd25a, emissiveIntensity: 1 }));
  tip.position.y = 1.35; g.add(tip);
  return g;
}
function makeZooArchFB(): THREE.Group {
  const g = new THREE.Group(); const stone = std(0xd8c8a0, 0.9);
  for (const sz of [-3.4, 3.4]) {
    const p2 = new THREE.Mesh(new THREE.BoxGeometry(1.2, 6.5, 1.2), stone); p2.position.set(0, 3.25, sz); g.add(p2);
  }
  const bar = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.2, 8.2), stone); bar.position.y = 6.6; g.add(bar);
  const sign = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.6, 5), std(0x7ed57a)); sign.position.y = 6.6; sign.position.x = 0.6; g.add(sign);
  return g;
}
function makeIcecreamFB(): THREE.Group {
  const g = new THREE.Group();
  const cart = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.3, 1.1), std(0xfaf6ea, 0.6)); cart.position.y = 1; g.add(cart);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.84, 0.34, 1.14), std(0xf06fb0)); stripe.position.y = 1.45; g.add(stripe);
  const um = new THREE.Mesh(new THREE.ConeGeometry(1.4, 0.6, 10), std(0x5ec8d8)); um.position.y = 3; g.add(um);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.6, 5), std(0xf4f6fa)); pole.position.y = 2.2; g.add(pole);
  for (const sz of [-0.6, 0.6]) {
    const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.16, 10), std(0x20242c, 0.9));
    wh.rotation.x = Math.PI / 2; wh.position.set(-0.5, 0.32, sz); g.add(wh);
  }
  return g;
}
function makeFoodtruckFB(): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(4.6, 2.4, 2), std(0xffd23f, 0.6)); body.position.y = 1.7; g.add(body);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.6, 2), std(0xf4f6fa, 0.5)); cab.position.set(2.6, 1.3, 0); g.add(cab);
  const win = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1, 0.12), std(0x2c3a52, 0.3)); win.position.set(-0.4, 2, 1.02); g.add(win);
  const aw = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.14, 1), std(0xff5a4d)); aw.position.set(-0.4, 2.8, 1.4); aw.rotation.x = 0.3; g.add(aw);
  for (const [sx, sz] of [[-1.6, -1], [1.8, -1], [-1.6, 1], [1.8, 1]] as const) {
    const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.3, 10), std(0x20242c, 0.9));
    wh.rotation.x = Math.PI / 2; wh.position.set(sx, 0.5, sz); g.add(wh);
  }
  return g;
}
function makeFerrisFB(): THREE.Group {
  const g = new THREE.Group(); const steel = std(0xff8fb8, 0.5);
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(6.5, 0.28, 8, 28), steel); wheel.position.y = 8; g.add(wheel);
  for (let i = 0; i < 6; i++) {
    const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 13, 6), steel);
    spoke.position.y = 8; spoke.rotation.z = (i / 6) * Math.PI; g.add(spoke);
  }
  const GOND = [0x5ec8d8, 0xffd23f, 0x7ed57a, 0xf06fb0, 0xb98cff, 0xff9a3a];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const gd = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.1, 1.1), std(GOND[i]));
    gd.position.set(Math.cos(a) * 6.5, 8 + Math.sin(a) * 6.5 - 0.8, 0); g.add(gd);
  }
  for (const sx of [-2.6, 2.6]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.42, 8.6, 8), std(0xf4f6fa));
    leg.position.set(sx, 4.1, 0); leg.rotation.z = sx > 0 ? -0.3 : 0.3; g.add(leg);
  }
  return g;
}
function makeHeliFB(): THREE.Group {
  const g = new THREE.Group(); const olive = std(0x6b7050, 0.85);
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(1, 2.6, 6, 10), olive); body.rotation.z = Math.PI / 2; body.position.y = 1.6; g.add(body);
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.4, 3.4, 8), olive); tail.rotation.z = Math.PI / 2; tail.position.set(-3, 1.9, 0); g.add(tail);
  const rotor = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.08, 0.4), std(0x2c3038, 0.6)); rotor.position.y = 3; g.add(rotor);
  for (const sz of [-0.9, 0.9]) {
    const skid = new THREE.Mesh(new THREE.BoxGeometry(3, 0.14, 0.16), std(0x3a3f4d)); skid.position.set(0.2, 0.32, sz); g.add(skid);
  }
  return g;
}
function makeTankFB(): THREE.Group {
  const g = new THREE.Group(); const olive = std(0x6b7050, 0.9);
  const hull = new THREE.Mesh(new THREE.BoxGeometry(4, 1.1, 2.4), olive); hull.position.y = 0.95; g.add(hull);
  for (const sz of [-1.1, 1.1]) {
    const track = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.9, 0.6), std(0x3a3f30, 1)); track.position.set(0, 0.45, sz); g.add(track);
  }
  const tur = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.2, 0.8, 10), olive); tur.position.y = 1.9; g.add(tur);
  const gun = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 2.8, 8), olive); gun.rotation.z = Math.PI / 2; gun.position.set(2, 2, 0); g.add(gun);
  return g;
}
function makeBeachChairFB(): THREE.Group {
  const g = new THREE.Group(); const col = pick([0x5ec8d8, 0xffd23f, 0xf06fb0]);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(1, 0.14, 1.6), std(col)); seat.position.y = 0.5; g.add(seat);
  const back = new THREE.Mesh(new THREE.BoxGeometry(1, 1.2, 0.12), std(col)); back.position.set(0, 1, -0.8); back.rotation.x = -0.4; g.add(back);
  for (const [sx, sz] of [[-0.42, -0.7], [0.42, -0.7], [-0.42, 0.7], [0.42, 0.7]] as const) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.5, 5), std(0xf4f6fa)); leg.position.set(sx, 0.25, sz); g.add(leg);
  }
  return g;
}
function makeDuckFB(): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), std(0xf6f2da, 0.9)); body.scale.set(1.25, 0.85, 1); body.position.y = 0.36; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), std(0xf6f2da, 0.9)); head.position.set(0.42, 0.78, 0); g.add(head);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.26, 6), std(0xff9a3a)); beak.rotation.z = -Math.PI / 2; beak.position.set(0.68, 0.75, 0); g.add(beak);
  return g;
}
function makeFenceRun(len: number, col = 0xf4f0e2): THREE.Group {
  // low post-and-rail fence along +X, centered
  const g = new THREE.Group(); const m = std(col, 0.85);
  const rail = new THREE.Mesh(new THREE.BoxGeometry(len, 0.12, 0.1), m); rail.position.y = 0.85; g.add(rail);
  const rail2 = new THREE.Mesh(new THREE.BoxGeometry(len, 0.12, 0.1), m); rail2.position.y = 0.45; g.add(rail2);
  const n = Math.max(2, Math.round(len / 2.4));
  for (let i = 0; i <= n; i++) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.1, 0.16), m);
    post.position.set(-len / 2 + (i / n) * len, 0.55, 0); g.add(post);
  }
  return g;
}

function populate(scene: THREE.Scene, addEdible: AddEdible) {
  const setShadow = (m: THREE.Object3D) => m.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  const place = (mesh: THREE.Object3D, x3: number, z3: number, r: number) => {
    if (!insideIsland3(x3, z3)) return;   // never place props off the coastline
    if (inLagoon3(x3, z3, 40)) return;    // …or IN the lagoon
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
        const dvx = lot.fy !== 0 ? 5.5 : 0, dvz = lot.fx !== 0 ? 5.5 : 0;
        if (Math.random() < 0.7) place(makeFlowers(), hx + fx3 * 4.4 + sx3 * 2, hz + fz3 * 4.4 + sz3 * 2, 0.7);
        if (Math.random() < 0.7) place(makeMailbox(), hx + fx3 * 7.6 + dvx + sx3, hz + fz3 * 7.6 + dvz + sz3, 1.2);
        // backyard: shed on every third lot, hedge bush otherwise (pool lots
        // stay clear — the water is baked into the ground there)
        const pool = lotPool(biome, li, lot);
        if (!pool && li % 3 === 2) { const sh = makeShed(); sh.rotation.y = lot.rot + rand(-0.3, 0.3); place(sh, hx - fx3 * 12, hz - fz3 * 12, 1.8); }
        else if (!pool && Math.random() < 0.6) place(makeBush(), hx - fx3 * 10 + sx3 * rand(-3, 3), hz - fz3 * 10 + sz3 * rand(-3, 3), 1.6);
        if (biome === 'fancy') {
          // the rich part of town DRESSES: hedge along the lot line, topiary
          // pair flanking the walk, gate pillars at the driveway
          const hedge = makeFenceRun(9, 0x4faa5a);
          hedge.rotation.y = lot.fy !== 0 ? 0 : Math.PI / 2;
          place(hedge, hx + fx3 * 9.5 - sx3 * 5.5, hz + fz3 * 9.5 - sz3 * 5.5, 1.4);
          for (const sSide of [-1, 1]) {
            const top = new THREE.Group();
            const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 1, 6), new THREE.MeshStandardMaterial({ color: PROPS.trunk, roughness: 1 }));
            tr.position.y = 0.5; top.add(tr);
            const ball = new THREE.Mesh(new THREE.SphereGeometry(0.7, 10, 8), new THREE.MeshStandardMaterial({ color: 0x5dbe63, roughness: 0.9, flatShading: true }));
            ball.position.y = 1.5; top.add(ball);
            place(top, hx + fx3 * 6.5 + sx3 * (sSide * 2.2 - 1.5), hz + fz3 * 6.5 + sz3 * (sSide * 2.2 - 1.5), 1);
          }
          for (const gSide of [-1, 1]) {
            const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.5, 0.7), new THREE.MeshStandardMaterial({ color: 0xe8e2d2, roughness: 0.8 }));
            pillar.position.y = 0.75;
            const gp = new THREE.Group(); gp.add(pillar);
            place(gp, hx + fx3 * 9.5 + sx3 * (5.5 + gSide * 1.6), hz + fz3 * 9.5 + sz3 * (5.5 + gSide * 1.6), 0.9);
          }
        }
      });
      // interior commons: a tighter tree cluster at the centre (backyards now
      // own the mid-band, so greenery reads planted, not scattered)
      for (let t = 0; t < 4; t++) {
        const ix = cx + rand(-half * 0.22, half * 0.22), iz = cz + rand(-half * 0.22, half * 0.22);
        if (Math.random() < 0.5) placeGlb('parktree', ix, iz, 3.2, rand(6, 8), makeTree);
        else place(makeTree(), ix, iz, 3.2);
      }
      for (let t = 0; t < 3; t++) place(makeBush(), cx + rand(-half * 0.24, half * 0.24), cz + rand(-half * 0.24, half * 0.24), 1.6);
      for (let t = 0; t < 2; t++) place(makeFlowers(), cx + rand(-half * 0.22, half * 0.22), cz + rand(-half * 0.22, half * 0.22), 0.7);
    } else if (biome === 'downtown') {
      // HOLE.IO STREET WALLS: every block edge is a continuous run of flush
      // row buildings facing its street — the city reads as solid urban fabric
      // with a paved service court behind (baked) and the block's signature
      // tower rising from the middle. Deterministic seams, zero gaps.
      const inset = half * 0.74, rowD = 10;
      const buildRow = (len: number, at: (o: number) => [number, number], rotY: number, seed: number) => {
        let o = -len / 2;
        const tallAt = ((seed % 4) / 4 - 0.38) * len;   // one skyline slab per row
        while (o < len / 2 - 4) {
          const bw = Math.min(rand(8, 13), len / 2 - o);
          const isTall = o <= tallAt && tallAt < o + bw;
          const h = isTall ? rand(20, 27) : rand(8, 16);
          const bld = makeRowBuilding(bw, rowD, h);
          bld.rotation.y = rotY;
          const [x, z] = at(o + bw / 2);
          place(bld, x, z, Math.max(3.4, bw * 0.42));
          o += bw;
        }
      };
      const seed = gx * 3 + gy * 5;
      buildRow(half * 1.76, (o) => [cx + o, cz - inset], Math.PI, seed);          // north wall
      buildRow(half * 1.76, (o) => [cx + o, cz + inset], 0, seed + 1);            // south wall
      buildRow(half * 1.0, (o) => [cx - inset, cz + o], -Math.PI / 2, seed + 2);  // west wall
      buildRow(half * 1.0, (o) => [cx + inset, cz + o], Math.PI / 2, seed + 3);   // east wall
      // signature tower rising from the service court
      placeGlb((gx + gy) % 2 ? 'tower_deco' : 'tower_glass', cx, cz, 8,
        22 + ((gx * 7 + gy * 13) % 4) * 3, () => makeTower(true));
      // corner retail at the south junctions (the gaps the walls leave open)
      placeGlb('cafe', cx - half * 0.86, cz + half * 0.86, 6, 8.5, makeShopBox, Math.PI);
      placeGlb('shop', cx + half * 0.86, cz + half * 0.86, 6, 8.5, makeShopBox, Math.PI);
      // north corner pockets: a street tree + hydrant each
      for (const sxc of [-1, 1]) {
        placeGlb('parktree', cx + sxc * half * 0.87, cz - half * 0.87, 3.2, 7, makeTree);
        place(makeHydrant(), cx + sxc * half * 0.8, cz - half * 0.8, 0.8);
      }
      // court dressing: benches + ice-cream cart in the courtyard shade
      place(makeBench(), cx - 7, cz + 8, 2.4);
      const b2 = makeBench(); b2.rotation.y = Math.PI; place(b2, cx + 7, cz + 8, 2.4);
      placeGlb('icecream', cx - 8, cz - 8, 2.2, 3.4, makeIcecreamFB);
      for (const [ux, vz] of [[-0.4, 0.4], [0.4, -0.4]] as const)
        placeGlb('parktree', cx + ux * half, cz + vz * half, 3.2, 7, makeTree);
    } else if (biome === 'plaza') {
      // civic square, properly staged: TOWN HALL at the north end, the mayor's
      // stage on its steps (./life), the AI fountain ON the paved circle at the
      // centre, food truck + ice-cream cart at the south corners
      placeGlb('townhall', cx, cz - half * 0.62, 10, 17, makeCivicHall, 0);
      placeGlb('fountain', cx, cz, 4, 6.5, makeFountainFB);
      // civic institutions FLANK the square: school west (facing the axis),
      // library east — a real town centre, not a lone hall
      placeGlb('school', cx - half * 0.66, cz + half * 0.1, 8, 11, makeCivicHall, Math.PI / 2);
      { const lib = makeCivicHall(); lib.rotation.y = -Math.PI / 2; lib.scale.setScalar(0.75); place(lib, cx + half * 0.68, cz + half * 0.1, 7); }
      placeGlb('foodtruck', cx - half * 0.66, cz + half * 0.72, 4, 5, makeFoodtruckFB, Math.PI / 6);
      placeGlb('icecream', cx + half * 0.64, cz + half * 0.7, 2.2, 3.6, makeIcecreamFB, -Math.PI / 6);
      // flag poles flanking the town-hall steps
      for (const sxc of [-1, 1]) {
        const fp = new THREE.Group();
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 9, 6), new THREE.MeshStandardMaterial({ color: 0xc8cdd8, metalness: 0.5, roughness: 0.4 }));
        pole.position.y = 4.5; fp.add(pole);
        const flag = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.4), new THREE.MeshStandardMaterial({ color: sxc < 0 ? 0x7b4fe0 : 0xffd23f, side: THREE.DoubleSide, roughness: 0.8 }));
        flag.position.set(sxc * 1.25, 8, 0); fp.add(flag);
        place(fp, cx + sxc * 6.5, cz - half * 0.44, 1.2);
      }
      // pollarded trees line the lawn panels; benches face the fountain
      for (const [ux, vz] of [[-0.5, -0.5], [0.5, -0.5], [-0.5, -0.15], [0.5, -0.15], [-0.5, 0.2], [0.5, 0.2]] as const)
        placeGlb('parktree', cx + ux * half, cz + vz * half, 3.2, 7, makeTree);
      for (const [ux, vz] of [[-0.32, -0.32], [0.32, -0.32], [-0.32, 0.05], [0.32, 0.05]] as const) {
        const bn = makeBench(); bn.rotation.y = Math.atan2(-(ux), -(vz + 0.1));
        place(bn, cx + ux * half, cz + vz * half, 2.4);
      }
    } else if (biome === 'park') {
      // gazebo lives on the pond-walk (block 4,2 east side); block (4,3) centre
      // belongs to the soccer pitch — no more landmarks stacked on events
      if (gy === 2) placeGlb('gazebo', cx + half * 0.5, cz + half * 0.42, 5, 8.5, makeGazeboFB);
      const onPitch = (x: number, z: number) => gx === 4 && gy === 3 && Math.abs(x - cx) < 16 && Math.abs(z - cz) < 12;
      for (let t = 0; t < 9; t++) {
        const [x, z] = jitter();
        if (onPitch(x, z)) continue;
        if (Math.random() < 0.55) placeGlb('parktree', x, z, 3.4, rand(6.5, 8.5), makeTree);
        else place(makeTree(), x, z, 3.4);
      }
      if (gy === 2) placeGlb('golfcart', cx - half * 0.55, cz + half * 0.4, 2.6, 3.2, makeGolfcartFB, rand(0, Math.PI));
      for (let t = 0; t < 4; t++) { const [x, z] = jitter(); if (!onPitch(x, z)) place(makeBush(), x, z, 1.6); }
      for (let t = 0; t < 2; t++) { const [x, z] = jitter(); if (!onPitch(x, z)) place(makeBench(), x, z, 2.4); }
    } else if (biome === 'forest') {
      const jf = () => [cx + rand(-(half - 4), half - 4), cz + rand(-(half - 4), half - 4)] as const;
      const isCamp = gx === 4 && gy === 0;
      const inClearing = (x: number, z: number) => isCamp && Math.hypot(x - (cx - 5), z - (cz + 3)) < 15;
      for (let t = 0; t < 32; t++) {   // a forest, not a parkland
        const [x, z] = jf();
        if (inClearing(x, z)) continue;
        if (Math.random() < 0.4) placeGlb('pine', x, z, 3, rand(7, 9.5), makePine);
        else place(Math.random() < 0.7 ? makePine() : makeTree(), x, z, 3);
      }
      if (isCamp) for (let i = 0; i < 3; i++) {   // log seats around the fire
        const a = (i / 3) * Math.PI * 2 + 0.5;
        const log = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 2.2, 8), new THREE.MeshStandardMaterial({ color: 0x9a7a5a, roughness: 1 }));
        log.rotation.z = Math.PI / 2; log.rotation.y = a; log.position.y = 0.35;
        const lg = new THREE.Group(); lg.add(log);
        place(lg, cx + Math.cos(a) * 3.4, cz + Math.sin(a) * 3.4, 1.4);
      }
      placeGlb('rocks', cx + rand(-half * 0.5, half * 0.5), cz + rand(-half * 0.5, half * 0.5), 2.4, 2.6, makeRocksFB, rand(0, Math.PI * 2));
      if (gx === 4 && gy === 0) {   // the campsite block gets the AI camp set
        placeGlb('tent', cx - 10, cz + 4, 2.6, 4.2, makeTentFB, rand(-0.4, 0.4));
        placeGlb('campfire', cx, cz, 1.4, 1.7, makeCampfireFB);
      }
      for (let t = 0; t < 5; t++) { const [x, z] = jitter(); place(makeBush(), x, z, 1.6); }
    } else if (biome === 'beach') {
      // the DESIGNED beach: palms line the boardwalk promenade at the top,
      // umbrellas sit in staggered resort rows on the sand (matching the baked
      // towels), club landmarks anchor each block
      for (const ux of [-0.62, -0.21, 0.21, 0.62]) {   // palm colonnade on the promenade
        if (Math.random() < 0.75) placeGlb('palm', cx + ux * half, cz - half * 0.82, 2.6, rand(6.5, 8.5), makePalm, rand(0, Math.PI * 2));
        else place(makePalm(), cx + ux * half, cz - half * 0.82, 2.6);
      }
      // boardwalk benches face the water (south)
      for (const ux of [-0.4, 0.4]) { const bn = makeBench(); place(bn, cx + ux * half, cz - half * 1.02, 2.4); }
      // umbrella rows — staggered grid, resort-style
      for (const [ux, vz] of [[-0.55, -0.1], [-0.18, 0.14], [0.18, -0.1], [0.55, 0.14], [-0.36, 0.44], [0.36, 0.44]] as const)
        placeGlb('umbrella', cx + ux * half, cz + vz * half, 1.8, 3.2, makeUmbrellaFB, rand(0, Math.PI * 2));
      placeGlb('sandcastle', cx + rand(-half * 0.5, half * 0.5), cz + half * 0.68, 1.2, 1.9, makeSandcastleFB, rand(0, Math.PI * 2));
      for (let t = 0; t < 2; t++) { const ch = makeBeachChairFB(); ch.rotation.y = rand(0, Math.PI * 2); place(ch, cx + rand(-half * 0.5, half * 0.5), cz + rand(-half * 0.1, half * 0.5), 1.3); }
      if (gx === 1) placeGlb('lifeguard', cx, cz + half * 0.55, 3.4, 7.5, makeLifeguardFB, Math.PI);
      if (gx === 4) placeGlb('lifeguard', cx - half * 0.3, cz + half * 0.5, 3.4, 7.5, makeLifeguardFB, Math.PI);
      if (gx === 2) placeGlb('cabana', cx - half * 0.62, cz - half * 0.45, 3, 4.6, makeCabanaFB, rand(-0.3, 0.3));
      if (gx === 2) placeGlb('cabana', cx + half * 0.62, cz - half * 0.45, 3, 4.6, makeCabanaFB, rand(-0.3, 0.3));
      if (gx === 0) placeGlb('lighthouse', cx - half * 0.55, cz + half * 0.55, 10, 19, makeLighthouseFB);
      for (let t = 0; t < 2; t++) { const [x, z] = jitter(); place(makeBush(), x, z, 1.4); }
    } else if (biome === 'zoo') {
      placeGlb('zooarch', cx - half * 0.7, cz, 6, 9, makeZooArchFB, Math.PI / 2);
      // pen fences matching the baked pen floors (savanna / paddock / lagoon)
      const pens: [number, number, number, number][] = [
        [cx - 15, cz - 21.5, 26, 19], [cx - 15, cz + 21.5, 26, 19], [cx + 10, cz, 22, 20],
      ];
      for (const [pcx, pcz, pw2, pd2] of pens) {
        if (!insideIsland3(pcx + pw2 / 2, pcz) || !insideIsland3(pcx - pw2 / 2, pcz)) continue;
        const n2 = makeFenceRun(pw2, 0xc9b28a); n2.position.set(pcx, 0, pcz - pd2 / 2); place(n2, pcx, pcz - pd2 / 2, 1.4);
        const s2 = makeFenceRun(pw2, 0xc9b28a); place(s2, pcx, pcz + pd2 / 2, 1.4);
        const w2 = makeFenceRun(pd2, 0xc9b28a); w2.rotation.y = Math.PI / 2; place(w2, pcx - pw2 / 2, pcz, 1.4);
        const e2 = makeFenceRun(pd2, 0xc9b28a); e2.rotation.y = Math.PI / 2; place(e2, pcx + pw2 / 2, pcz, 1.4);
      }
      for (let t = 0; t < 4; t++) place(makeTree(), cx - half * 0.55 + rand(-6, 6), cz + rand(-half * 0.5, half * 0.5), 3);
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
        place(pl, cx - half * 0.15, cz + half * 0.3, 5);
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
      // perimeter fence + guard tower around the baked compound pad
      const fN = makeFenceRun(34, 0x8a8f74); place(fN, cx - half * 0.53, cz - half * 0.96, 1.4);
      const fS = makeFenceRun(34, 0x8a8f74); place(fS, cx - half * 0.53, cz - half * 0.45, 1.4);
      const fW = makeFenceRun(20, 0x8a8f74); fW.rotation.y = Math.PI / 2; place(fW, cx - half * 0.96, cz - half * 0.7, 1.4);
      {
        const tower = new THREE.Group();
        for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 5.5, 6), new THREE.MeshStandardMaterial({ color: 0x8a8f74, roughness: 0.9 }));
          leg.position.set(lx * 1.1, 2.75, lz * 1.1); tower.add(leg);
        }
        const cab = new THREE.Mesh(new THREE.BoxGeometry(3, 1.8, 3), new THREE.MeshStandardMaterial({ color: 0x6b7050, roughness: 0.9 }));
        cab.position.y = 6.4; tower.add(cab);
        const rf = new THREE.Mesh(new THREE.ConeGeometry(2.4, 1, 4), new THREE.MeshStandardMaterial({ color: 0x5a5f45, roughness: 0.9, flatShading: true }));
        rf.rotation.y = Math.PI / 4; rf.position.y = 7.8; tower.add(rf);
        place(tower, cx - half * 0.93, cz - half * 0.95, 4);
      }
      placeGlb('heli', cx - half * 0.31, cz - half * 0.72, 5, 5.5, makeHeliFB, rand(0, Math.PI * 2));
      placeGlb('tank', cx - half * 0.65, cz - half * 0.5, 4, 3.4, makeTankFB, Math.PI / 2);
    }

    // starter food — tiny props (cones/hydrants/trash/flowers) scattered in every
    // walkable block so a speck-sized void always has something to nibble.
    if (biome !== 'military') {
      const tinyN = biome === 'forest' ? 12 : 30;   // denser snack carpet
      // exclusion zones: nothing scatters into the fountain ring or the pond
      const tinyOk = (x: number, z: number) => {
        if (biome === 'plaza' && Math.hypot(x - cx, z - cz) < 13) return false;
        if (biome === 'park' && gx === 4 && gy === 2 && Math.hypot(x - cx, z - (cz + 6)) < 17) return false;
        // downtown blocks are walled with buildings — snacks live in the court
        if (biome === 'downtown' && Math.max(Math.abs(x - cx), Math.abs(z - cz)) > half * 0.55) return false;
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
      if (insideIsland3(a, rc) && !inLagoon3(a, rc) && coastClear(a, rc)) place(makeCone(), a, rc + side, 0.7);
      if (insideIsland3(rc, a) && !inLagoon3(rc, a) && coastClear(rc, a)) place(makeCone(), rc - side, a, 0.7);
    }
    let li = 0;
    for (let a = -280; a < 280; a += 24, li++) {
      const side = li % 2 ? 4.6 : -4.6;
      if (insideIsland3(a, rc) && !inLagoon3(a, rc) && coastClear(a, rc)) place(makeLamp(), a, rc + side, 0.7);
      if (insideIsland3(rc, a) && !inLagoon3(rc, a) && coastClear(rc, a)) place(makeLamp(), rc - side, a, 0.7);
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

  // river banks: rocks + reed tufts along the polyline (offset off the water),
  // and low white BRIDGE RAILINGS wherever a road crosses the river
  {
    const RIVER_W: [number, number][] = [
      [8405, 1149], [8277, 3035], [8565, 5337], [8213, 6887], [8469, 8661], [9431, 9305],
    ];
    for (let i = 0; i < RIVER_W.length - 1; i++) {
      const [x0, y0] = RIVER_W[i], [x1, y1] = RIVER_W[i + 1];
      const segLen = Math.hypot(x1 - x0, y1 - y0), steps = Math.floor(segLen / 420);
      const nx = -(y1 - y0) / segLen, ny = (x1 - x0) / segLen;   // perpendicular
      for (let k2 = 1; k2 < steps; k2++) {
        const t = k2 / steps, side = k2 % 2 ? 1 : -1;
        const bx = w(x0 + (x1 - x0) * t + nx * side * 105), bz = w(y0 + (y1 - y0) * t + ny * side * 105);
        if (Math.abs((y0 + (y1 - y0) * t) - POND[1]) < 420) continue;   // pond has its own bank
        place(Math.random() < 0.5 ? makeReeds() : makeRocksFB(), bx, bz, Math.random() < 0.5 ? 0.9 : 1.8);
      }
    }
    for (const rcW of [2580, 4290, 6000, 7710, 9420]) {
      const rx = riverXAtWorld(rcW);
      if (rx == null) continue;
      for (const side of [-1, 1]) {
        const rail = makeFenceRun(13, 0xf4f6fa);
        place(rail, w(rx), w(rcW) + side * 4.6, 1.6);
      }
    }
  }

  // plaza market stalls: striped stands along the square's south edge
  {
    const pcx = w(6855), pcz = w(5145);
    const STALL_COLS = [0xff6a5e, 0x4db07a, 0x4d7de8];
    STALL_COLS.forEach((col, i) => {
      const st2 = new THREE.Group();
      const counter = new THREE.Mesh(new THREE.BoxGeometry(3, 1.1, 1.6), new THREE.MeshStandardMaterial({ color: 0xf6f0e2, roughness: 0.85 }));
      counter.position.y = 0.55; st2.add(counter);
      for (const sxp of [-1.3, 1.3]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.6, 6), new THREE.MeshStandardMaterial({ color: 0xf6f0e2, roughness: 0.85 }));
        post.position.set(sxp, 1.3, -0.6); st2.add(post);
      }
      const awn = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.16, 2.2), new THREE.MeshStandardMaterial({ color: col, roughness: 0.75 }));
      awn.position.set(0, 2.7, 0); awn.rotation.x = 0.14; st2.add(awn);
      place(st2, pcx - 14 + i * 14, pcz + 27, 2.2);
    });
  }

  // coast fringe: the band between the grid and the cliff gets DESIGNED —
  // boulders + wildflowers north, palms south, pines east (walks the actual
  // silhouette, pulled inland so nothing hangs over the edge)
  for (let i = 0; i < SIL3_FRINGE.length; i += 3) {
    const [fx2, fz2] = SIL3_FRINGE[i];
    const x = fx2 * 0.9, z = fz2 * 0.9;
    if (!insideIsland3(x, z) || inLagoon3(x, z, 60)) continue;
    if (z > 150) { if (Math.random() < 0.6) place(makePalm(), x, z, 2.6); else place(makeBush(), x, z, 1.4); }
    else if (x > 150) place(Math.random() < 0.7 ? makePine() : makeRocksFB(), x, z, Math.random() < 0.7 ? 3 : 2.2);
    else if (Math.random() < 0.5) place(makeRocksFB(), x, z, 2.2);
    else place(makeFlowers(), x, z, 0.8);
  }

  // exactly ONE hot-air balloon in the sky — animated from createIsland's update
  spawnBalloon(scene);
}

// cheap island-membership check (bounding blob) for road-edge scatter
function inIslandApprox(x3: number, z3: number): boolean {
  return Math.hypot(x3 / 285, z3 / 300) < 0.96;
}
