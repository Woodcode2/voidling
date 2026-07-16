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
  scene.fog = new THREE.Fog(WORLD.space, 420, 1500);   // wide, so big-void pull-back views stay clear

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
  // dashed lane lines
  g.strokeStyle = 'rgba(220,227,238,0.85)'; g.lineWidth = Math.max(2, roadPx * 0.05);
  g.setLineDash([roadPx * 0.9, roadPx * 0.9]);
  for (const c of ROAD_CENTERS) { roadLine(c, true); roadLine(c, false); }
  g.setLineDash([]);
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
      g.strokeStyle = 'rgba(220,227,238,0.85)'; g.lineWidth = Math.max(2, roadPx * 0.05);
      g.setLineDash([roadPx * 0.9, roadPx * 0.9]);
      g.beginPath(); g.moveTo(bx - deckHalf, by); g.lineTo(bx + deckHalf, by); g.stroke();
      g.setLineDash([]);
    }
  }

  // plaza fountain — a civic landmark at the heart of downtown
  {
    const fx2 = pxW(6855), fy2 = pyW(5145);
    const rOuter = pxW(190) - pxW(0);
    g.fillStyle = hex(WORLD.pavement); g.beginPath(); g.arc(fx2, fy2, rOuter * 1.35, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#c9cdd9'; g.lineWidth = rOuter * 0.12; g.beginPath(); g.arc(fx2, fy2, rOuter, 0, Math.PI * 2); g.stroke();
    g.fillStyle = hex(WORLD.waterShallow); g.beginPath(); g.arc(fx2, fy2, rOuter * 0.88, 0, Math.PI * 2); g.fill();
    g.fillStyle = hex(WORLD.foam); g.beginPath(); g.arc(fx2, fy2, rOuter * 0.3, 0, Math.PI * 2); g.fill();
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
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.45, 1.2, 8), mat); body.position.y = 0.6; g.add(body);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.42, 8, 6), mat); cap.position.y = 1.2; g.add(cap);
  for (const s of [-1, 1]) { const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.5, 6), mat); arm.rotation.z = Math.PI / 2; arm.position.set(s * 0.4, 0.75, 0); g.add(arm); }
  return g;
}
function makeTrash(): THREE.Group {
  const g = new THREE.Group();
  const can = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.42, 1.3, 10), new THREE.MeshStandardMaterial({ color: pick([0x3a7a4a, 0x3a5a8a, 0x555a66]), roughness: 0.8, metalness: 0.2 }));
  can.position.y = 0.65; g.add(can);
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.56, 0.2, 10), new THREE.MeshStandardMaterial({ color: 0x2a2f38 })); lid.position.y = 1.35; g.add(lid);
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
const makeTinyProp = () => pick([makeCone, makeHydrant, makeTrash, makeFlowers])();

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
      // neat rows of houses facing the street, each with a yard: bush + mailbox
      const rows = 4, cols = 3, sc = biome === 'fancy' ? 1.3 : 1;
      const facing = pick([0, Math.PI]);   // whole block faces one way = designed
      for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
        const hx = cx - half + (j + 0.5) * (half * 2 / cols) + rand(-1.5, 1.5);
        const hz = cz - half + (i + 0.5) * (half * 2 / rows) + rand(-1.5, 1.5);
        const house = makeHouse(); house.scale.setScalar(sc); house.rotation.y = facing;
        place(house, hx, hz, (biome === 'fancy' ? 4 : 3.2) * sc);
        if (Math.random() < 0.7) place(makeBush(), hx + rand(3, 5) * sc, hz + rand(-3, 3), 1.6);
        if (Math.random() < 0.5) place(makeMailbox(), hx - rand(3, 5) * sc, hz + 4, 1.2);
      }
      for (let t = 0; t < 4; t++) { const [x, z] = jitter(); place(makeTree(), x, z, 3.2); }
    } else if (biome === 'downtown' || biome === 'plaza') {
      const n = biome === 'plaza' ? 4 : 3 + Math.floor(Math.random() * 2);
      for (let i = 0; i < n; i++) { const t = makeTower(biome === 'plaza' || Math.random() < 0.5); const [x, z] = jitter(); place(t, x, z, 8); }
      for (let t = 0; t < 3; t++) { const [x, z] = jitter(); place(Math.random() < 0.5 ? makeTree() : makeBench(), x, z, 2.6); }
    } else if (biome === 'park') {
      for (let t = 0; t < 9; t++) { const [x, z] = jitter(); place(makeTree(), x, z, 3.4); }
      for (let t = 0; t < 4; t++) { const [x, z] = jitter(); place(makeBush(), x, z, 1.6); }
      for (let t = 0; t < 2; t++) { const [x, z] = jitter(); place(makeBench(), x, z, 2.4); }
    } else if (biome === 'forest') {
      for (let t = 0; t < 20; t++) { const [x, z] = jitter(); place(Math.random() < 0.7 ? makePine() : makeTree(), x, z, 3); }
      for (let t = 0; t < 5; t++) { const [x, z] = jitter(); place(makeBush(), x, z, 1.6); }
    } else if (biome === 'beach') {
      for (let t = 0; t < 6; t++) { const [x, z] = jitter(); place(makePalm(), x, z, 2.6); }
      for (let t = 0; t < 3; t++) { const [x, z] = jitter(); place(makeBush(), x, z, 1.4); }
    } else if (biome === 'zoo') {
      for (let t = 0; t < 5; t++) { const [x, z] = jitter(); place(Math.random() < 0.5 ? makeTree() : makeBush(), x, z, 3); }
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

    // starter food — tiny props (cones/hydrants/trash/flowers) scattered in every
    // walkable block so a speck-sized void always has something to nibble.
    if (biome !== 'military') {
      const tinyN = biome === 'forest' ? 4 : 10;
      for (let t = 0; t < tinyN; t++) { const [x, z] = jitter(); place(makeTinyProp(), x, z, rand(0.6, 0.85)); }
    }
  }

  // line the road edges with traffic cones — classic hole.io starter snacks
  const roads3 = ROAD_CENTERS.map((c) => w(c));
  for (const rc of roads3) {
    for (let a = -270; a < 270; a += rand(30, 46)) {
      if (inIslandApprox(a, rc)) place(makeCone(), a, rc + (Math.random() < 0.5 ? 3.4 : -3.4), 0.7);
      if (inIslandApprox(rc, a)) place(makeCone(), rc + (Math.random() < 0.5 ? 3.4 : -3.4), a, 0.7);
    }
  }
}

// cheap island-membership check (bounding blob) for road-edge scatter
function inIslandApprox(x3: number, z3: number): boolean {
  return Math.hypot(x3 / 285, z3 / 300) < 0.96;
}
