// The Higgsfield asset pack: every landmark, house, tree and beach toy on the
// island can be an AI-generated textured GLB. Meshes load async through the
// same-origin /assets/hf3d rewrite; each named asset is normalized defensively
// (uniform scale to height 1, centred, feet on the ground) so a generation
// quirk can never produce a floating or buried prop. When a mesh can't load
// (offline dev) the caller's procedural fallback is placed instead — the
// island is never sparse.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

type AddEdible = (mesh: THREE.Object3D, radius: number) => void;

// name → { url (same-origin GLB), h (world-unit height) }
// URLs are produced by the image→3D pipeline (see scratchpad hf_manifest).
const DIR = '/assets/hf3d/7d051b5a-7bfe-49fe-a484-24e7b3a9458a';
export const PACK: Record<string, { url: string; h: number }> = {
  house_pink: { url: `${DIR}/4953e198-a7b0-4604-9ac6-579cc8392fcb.glb`, h: 5.2 },
  house_blue: { url: `${DIR}/70d62764-352b-4524-9260-4f263e48928b.glb`, h: 5.6 },
  house_modern: { url: `${DIR}/3bd79c73-43c6-47a9-8620-281d4926df84.glb`, h: 5 },
  house_craftsman: { url: `${DIR}/40bdfd42-f7a9-4032-9172-663990078e9e.glb`, h: 5.2 },
  tower_glass: { url: `${DIR}/629e3d55-fe73-4dd6-a0e9-6dec17b2e072.glb`, h: 24 },
  tower_deco: { url: `${DIR}/34959892-e727-40ba-bdc5-667a10c5b741.glb`, h: 22 },
  townhall: { url: `${DIR}/ef5fa4e4-968f-4993-a2ee-0c9461671c4e.glb`, h: 17 },
  school: { url: `${DIR}/464daa25-a487-4aca-b81e-68ff8d33a15f.glb`, h: 11 },
  cafe: { url: `${DIR}/95e469c0-e8ec-40b9-9f9e-2ccb3d732c1e.glb`, h: 8.5 },
  shop: { url: `${DIR}/f771c107-f5aa-4162-9f1b-d1751bb4b9db.glb`, h: 8.5 },
  fountain: { url: `${DIR}/290f6c1c-f762-4b6c-a13f-a9fc5caa5218.glb`, h: 6.5 },
  icecream: { url: `${DIR}/df76ace5-489f-4c31-beb6-5e72090612c1.glb`, h: 3.6 },
  palm: { url: `${DIR}/ea798bca-5fbb-4cb0-bb98-45bfbe3ea752.glb`, h: 7.5 },
  lifeguard: { url: `${DIR}/4e960a6a-63bb-4a68-90a4-979fb40610cd.glb`, h: 7.5 },
  umbrella: { url: `${DIR}/14ad375d-efd0-4559-8c50-22b2731d6c65.glb`, h: 3.2 },
  sandcastle: { url: `${DIR}/d09ff62f-dda2-4987-9500-9354ae5124f8.glb`, h: 1.9 },
  cabana: { url: `${DIR}/d5e1d66b-89aa-48c9-86d2-497097047527.glb`, h: 4.6 },
  lighthouse: { url: `${DIR}/18c46841-f358-46a8-8c72-d0238f044fb2.glb`, h: 19 },
  pine: { url: `${DIR}/b20dda53-b332-48e2-8a3f-2438942cf83b.glb`, h: 8.5 },
  tent: { url: `${DIR}/3d7ea70a-4587-4662-b1b4-f9ab25836e71.glb`, h: 4.2 },
  campfire: { url: `${DIR}/bbd46ddc-312e-40a9-85bc-dbcc9d9b04dd.glb`, h: 1.7 },
  gazebo: { url: `${DIR}/2b1ff369-4fd9-4bd2-8def-d125a0065606.glb`, h: 8.5 },
  golfcart: { url: `${DIR}/1ca1e5ec-22fe-4fd1-93b1-e4881d9d01b6.glb`, h: 3.2 },
  balloon2: { url: `${DIR}/f25baa8c-1220-40a4-bf67-cebfb6791a00.glb`, h: 13 },
  zooarch: { url: `${DIR}/730acaba-6caf-452a-9acb-5b41f911601a.glb`, h: 9 },
  foodtruck: { url: `${DIR}/8dee24fe-6070-4c22-9b96-64f0e2bf5c44.glb`, h: 5 },
  parktree: { url: `${DIR}/e755b0f3-fe13-4d0b-ada5-c219faa7866f.glb`, h: 7 },
  rocks: { url: `${DIR}/02ad2c55-a0e3-4d14-8932-537b42ea5c85.glb`, h: 2.6 },
  stage: { url: `${DIR}/e4f7a55c-a7f3-4408-a6bb-2d5362ecba94.glb`, h: 3.2 },
  car_sedan: { url: `${DIR}/b3d07fca-ccdd-4f41-8dbd-3954958e22c3.glb`, h: 2.6 },
  car_taxi: { url: `${DIR}/4275a986-fe46-463f-a73e-47571f262ac7.glb`, h: 2.6 },
  tank: { url: `${DIR}/ccb80bfc-fc5d-4352-976b-15b5fc42085a.glb`, h: 3.4 },
  heli: { url: `${DIR}/eed92755-71ef-4e6f-a201-128b0c56975a.glb`, h: 5.5 },
};

const loader = new GLTFLoader();
const templates = new Map<string, Promise<THREE.Object3D | null>>();

// mobile-safe loading: GLTF parse allocates large intermediate buffers and
// decodes textures — 33 in flight at once spikes past iOS Safari's per-tab
// memory ceiling and kills the page at the loading screen. A small queue
// keeps peak memory flat; total load time barely changes (network dominates).
const MAX_PARALLEL = 4;
let active = 0;
const waiting: (() => void)[] = [];
function slot(): Promise<void> {
  if (active < MAX_PARALLEL) { active++; return Promise.resolve(); }
  return new Promise((res) => waiting.push(() => { active++; res(); }));
}
function release() {
  active--;
  const next = waiting.shift();
  if (next) next();
}

// LOD registry: switch distances must TRACK the camera. A fixed threshold dies
// the moment the camera pulls back past it (every AI mesh degraded to its
// stand-in for the whole match). Instead the game feeds us its camera distance
// each frame and the hi-detail band rides just beyond it — crisp where the
// player is looking, cheap at the screen edges and far side of the island.
const LODS: THREE.LOD[] = [];
export function updateLodBias(camDist: number) {
  const d = Math.min(280, camDist * 1.25);
  for (const l of LODS) if (l.levels.length > 1) l.levels[1].distance = d;
}

function template(url: string): Promise<THREE.Object3D | null> {
  let p = templates.get(url);
  if (!p) {
    p = slot().then(() => new Promise<THREE.Object3D | null>((resolve) => {
      loader.load(url, (gltf) => {
        const m = gltf.scene;
        const box = new THREE.Box3().setFromObject(m);
        const size = box.getSize(new THREE.Vector3());
        m.scale.setScalar(1 / Math.max(size.y, 1e-4));      // height exactly 1
        box.setFromObject(m);
        const c = box.getCenter(new THREE.Vector3());
        m.position.set(m.position.x - c.x, m.position.y - box.min.y, m.position.z - c.z);
        resolve(m);
      }, undefined, () => resolve(null));
    })).then((m) => { release(); return m; });
    templates.set(url, p);
  }
  return p;
}

// preloader: attach to (or start) every pack download and report progress.
// populate() already requests the meshes it uses at boot, so these promises
// mostly piggyback on in-flight downloads — the menu's loading bar simply
// guarantees a match never starts with stand-in meshes visible.
export function preloadPack(onProgress: (done: number, total: number) => void): Promise<void> {
  const urls = Object.values(PACK).map((p) => p.url);
  const total = urls.length;
  let done = 0;
  return new Promise((resolve) => {
    for (const u of urls) {
      template(u).then(() => {
        done++;
        onProgress(done, total);
        if (done === total) resolve();
      });
    }
  });
}

// soft contact shadow — grounds every prop so nothing reads as "floating on a
// lawn" (the single cheapest polish win: one shared texture + geometry)
let _shTex: THREE.CanvasTexture | null = null;
const _shGeo = new THREE.CircleGeometry(1, 24);
let _shMat: THREE.MeshBasicMaterial | null = null;
export function contactShadow(r: number): THREE.Mesh {
  if (!_shTex) {
    const cv = document.createElement('canvas'); cv.width = cv.height = 128;
    const x = cv.getContext('2d')!;
    const gr = x.createRadialGradient(64, 64, 8, 64, 64, 64);
    gr.addColorStop(0, 'rgba(20,14,34,0.55)');
    gr.addColorStop(0.7, 'rgba(20,14,34,0.22)');
    gr.addColorStop(1, 'rgba(20,14,34,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
    _shTex = new THREE.CanvasTexture(cv);
    _shMat = new THREE.MeshBasicMaterial({ map: _shTex, transparent: true, depthWrite: false });
  }
  const m = new THREE.Mesh(_shGeo, _shMat!);
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.045;
  m.scale.setScalar(r * 1.35);
  return m;
}

export interface GlbOpts {
  rotY?: number;
  h?: number;                              // override PACK height
  smallShadow?: boolean;                   // receive-only (tiny props)
  fallback?: () => THREE.Object3D;         // procedural stand-in (offline + far LOD)
  lodDist?: number;                        // distance where the stand-in takes over
  onReady?: (g: THREE.Group) => void;      // hook for animated placements
}

export function glb(
  scene: THREE.Scene, addEdible: AddEdible | null, name: string,
  x: number, z: number, r: number, opts: GlbOpts = {},
): void {
  const spec = PACK[name];
  const qk = name.startsWith('house') ? 'house' : undefined;
  const placeFallback = () => {
    if (!opts.fallback) return;
    const fb = opts.fallback();
    if (fb.children.length === 0 && !(fb as THREE.Mesh).isMesh) return;   // never register an INVISIBLE edible
    if (qk) fb.userData.qk = qk;
    fb.position.set(x, 0, z);
    if (opts.rotY) fb.rotation.y = opts.rotY;
    fb.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = !opts.smallShadow; o.receiveShadow = true; } });
    scene.add(fb);
    addEdible?.(fb, r);
  };
  if (!spec) { placeFallback(); return; }
  template(spec.url).then((tpl) => {
    if (!tpl) { placeFallback(); return; }
    const hi = new THREE.Group();
    hi.add(tpl.clone(true));
    hi.scale.setScalar(opts.h ?? spec.h);
    // PERF: generated meshes are dense (30-150k tris each, ~100 instances on
    // the island). With a procedural fallback available, wrap in an LOD so the
    // full-detail mesh only renders near the camera and the cheap procedural
    // stand-in carries the distance — most of the island most of the time.
    let obj: THREE.Object3D;
    if (opts.fallback) {
      const lod = new THREE.LOD();
      lod.addLevel(hi, 0);
      lod.addLevel(opts.fallback(), opts.lodDist ?? 110);
      LODS.push(lod);
      obj = lod;
    } else {
      obj = hi;
    }
    if (qk) obj.userData.qk = qk;
    obj.position.set(x, 0, z);
    if (opts.rotY) obj.rotation.y = opts.rotY;
    obj.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = !opts.smallShadow; o.receiveShadow = true; } });
    if (r >= 2.5) obj.add(contactShadow(r));   // grounded, never floating
    scene.add(obj);
    addEdible?.(obj, r);
    opts.onReady?.(obj as THREE.Group);
  });
}

// ?debug=assets — QA gallery: every pack asset on a floating platform with a
// name label, one screenshot audits the whole set (which meshes need a re-roll)
export function buildGallery(scene: THREE.Scene) {
  const names = Object.keys(PACK);
  const COLS = 7, GAP = 26, Y = 600;
  const label = (text: string) => {
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64;
    const x = cv.getContext('2d')!;
    x.fillStyle = 'rgba(13,8,33,0.85)'; x.fillRect(0, 0, 256, 64);
    x.fillStyle = '#fff'; x.font = '900 30px system-ui'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(text, 128, 34);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), depthWrite: false }));
    sp.scale.set(10, 2.5, 1);
    return sp;
  };
  const rows = Math.ceil(names.length / COLS);
  names.forEach((name, i) => {
    const gx = (i % COLS - (COLS - 1) / 2) * GAP;
    const gz = (Math.floor(i / COLS) - (rows - 1) / 2) * GAP;
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(9, 9, 0.5, 24),
      new THREE.MeshStandardMaterial({ color: 0x3a2a5a, roughness: 0.9 }));
    pad.position.set(gx, Y - 0.25, gz); scene.add(pad);
    const tag = label(name); tag.position.set(gx, Y + 13, gz); scene.add(tag);
    template(PACK[name].url).then((tpl) => {
      if (!tpl) return;
      const g = new THREE.Group();
      g.add(tpl.clone(true));
      g.scale.setScalar(10);          // uniform preview height
      g.position.set(gx, Y, gz);
      scene.add(g);
    });
  });
}

// vehicles: swap a mover's procedural mesh for the AI one once it loads. The
// game's vehicle convention is nose = +X, so the mesh's longest horizontal
// axis is rotated onto X and scaled to `len` world units. If the GLB never
// loads, the procedural vehicle simply stays — no empty roads.
export function vehicleGlb(
  container: THREE.Object3D, name: string, len: number,
  opts: { tint?: number; keep?: THREE.Object3D[] } = {},
) {
  const spec = PACK[name];
  if (!spec) return;
  template(spec.url).then((tpl) => {
    if (!tpl) return;
    const inst = tpl.clone(true);
    // tint: clone materials and multiply (e.g. the police cruiser is the sedan
    // mesh washed toward blue — one asset, many liveries)
    if (opts.tint !== undefined) {
      const t = new THREE.Color(opts.tint);
      inst.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mesh.material = (Array.isArray(mesh.material) ? mats.map((m) => m.clone()) : mats[0].clone()) as typeof mesh.material;
        const nm = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const m of nm) { const mm = m as THREE.MeshStandardMaterial; if (mm.color) mm.color.multiply(t); }
      });
    }
    const box = new THREE.Box3().setFromObject(inst);
    const size = box.getSize(new THREE.Vector3());
    const wrap = new THREE.Group();
    wrap.add(inst);
    // longest axis → +X, then a 180° flip: the generated meshes model their
    // nose toward -X (verified in the ?assets gallery), the game drives +X
    wrap.rotation.y = (size.z > size.x ? Math.PI / 2 : 0) + Math.PI;
    wrap.scale.setScalar(len / Math.max(Math.max(size.x, size.z), 1e-4));
    wrap.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    // LOD: the existing procedural vehicle becomes the far level, the dense AI
    // mesh only renders near the camera. `keep` children (light bars, rotors)
    // stay on the container itself so they ride both levels.
    const lo = new THREE.Group();
    for (const c of [...container.children]) if (!opts.keep?.includes(c)) lo.add(c);
    const lod = new THREE.LOD();
    lod.addLevel(wrap, 0);
    lod.addLevel(lo, 95);
    LODS.push(lod);
    container.add(lod);
  });
}

// the drifting hot-air balloon needs an animation handle back in island.ts
let balloonHook: (g: THREE.Group) => void = () => {};
export const setBalloonHook = (fn: (g: THREE.Group) => void) => { balloonHook = fn; };
export function spawnBalloon(scene: THREE.Scene) {
  glb(scene, null, 'balloon2', 0, 0, 0, { h: 13, onReady: (g) => balloonHook(g) });
}
