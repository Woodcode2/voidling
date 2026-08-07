// PROP PLACEMENT. Every landmark, house, tree and beach toy on the island is
// built from primitives, here and in the world builders.
//
// THERE USED TO BE A GLB PACK: thirty-three AI-generated textured meshes,
// fetched at boot through an /assets/hf3d rewrite, with the built prop as a
// fallback for when a download failed. It is deleted and the fallback is the
// game. Every reason is measured:
//   - 17 of the 33 URLs are permanently 403 and unrecoverable from any
//     network, and the missing half was the VISIBLE half. Pirate Bay placed
//     palm x352 and cabana x44 procedurally while umbrella x142 loaded as a
//     photoreal mesh: a beach where the umbrellas were detailed and every
//     palm tree was a cone.
//   - the 16 that did vendor came to 100.7 MB, averaging 6.3 MB a prop (a
//     7.26 MB taxi, a 7.22 MB sandcastle), taking dist/ to 149 MB. For a
//     no-brand children's game that is an abandoned download, not a feature.
//   - GAME DAY and LANTERN NIGHT place none of them at all, and of the four
//     worlds Game Day measures the highest prop density on screen.
//   - nobody has ever seen the mesh build. Every screenshot, hero portrait,
//     palette sweep and contrast decision in this repo describes the built
//     game. That is the look that has been reviewed and liked.
// The pack also cost a 12-second gate on PLAY, a GLTFLoader, an LOD registry,
// a texture-shrinking pass and a load queue. All of it goes.
import * as THREE from 'three';

type AddEdible = (mesh: THREE.Object3D, radius: number) => void;


// small screens get small textures: a 2K texture set across 33 meshes decodes
// to hundreds of MB — past iOS Safari's tab ceiling (the load-screen crash).
// At gameplay zoom a 512px cap is visually identical on a phone.
export const IS_MOBILE = typeof matchMedia !== 'undefined' && (matchMedia('(pointer: coarse)').matches || window.innerWidth < 900);
// LOD went with the pack: there is one level of detail now, the built one.
// Kept as a no-op because the frame loop calls it every frame.
export function updateLodBias(_camDist: number): void { /* no LODs without the pack */ }

export function requestedReady(onProgress: (done: number, total: number) => void): Promise<void> {
  // NOTHING TO WAIT FOR ANY MORE. This held the loading cover until every mesh
  // this world places had downloaded — the whole reason PLAY sat behind a
  // 12-second gate. With the pack deleted there is no network work at boot, so
  // it resolves at once and reports a truthful 100%. Kept because
  // prototype3d drives the loading bar through it, and the cover still has a
  // job: createIsland() is a long synchronous build and the cover stands in
  // front of it.
  onProgress(1, 1);
  return Promise.resolve();
}

export function shouldCast(r: number, obj?: THREE.Object3D): boolean {
  if (r >= 4) return true;
  if (!obj) return false;
  const bb = new THREE.Box3().setFromObject(obj);
  if (!isFinite(bb.min.y)) return false;
  const h = bb.max.y - bb.min.y;
  const thin = Math.min(bb.max.x - bb.min.x, bb.max.z - bb.min.z);
  return h >= 6 && thin >= 0.8;
}
// soft contact shadow — grounds every prop so nothing reads as "floating on a
// lawn" (the single cheapest polish win: one shared texture + geometry)
let _shTex: THREE.CanvasTexture | null = null;
const _shGeo = new THREE.CircleGeometry(1, 24);
let _shMat: THREE.MeshBasicMaterial | null = null;
export function contactShadow(r: number): THREE.Mesh {
  if (!_shTex) {
    // WHITE gradient used as pure alpha; the DARK comes from material.color
    // (which three color-manages correctly). Baking the dark color into the
    // canvas left the texture in linear space, and the output transform
    // brightened every blob into a pale BLUE disc — the "lake in the street".
    const cv = document.createElement('canvas'); cv.width = cv.height = 128;
    const x = cv.getContext('2d')!;
    const gr = x.createRadialGradient(64, 64, 8, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,255,255,0.38)');
    gr.addColorStop(0.7, 'rgba(255,255,255,0.14)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
    _shTex = new THREE.CanvasTexture(cv);
    _shMat = new THREE.MeshBasicMaterial({ map: _shTex, color: 0x14100f, transparent: true, depthWrite: false });
  }
  const m = new THREE.Mesh(_shGeo, _shMat!);
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.045;
  m.scale.setScalar(r * 1.35);
  // tagged so the match loop can harvest the static ones into a single
  // InstancedMesh — 2,682 of these on Maple is 2,682 draw calls for one
  // geometry and one material
  m.userData.cshadow = true;
  return m;
}

export interface GlbOpts {
  rotY?: number;
  h?: number;                              // inert since the pack was deleted
  smallShadow?: boolean;                   // receive-only (tiny props)
  fallback?: () => THREE.Object3D;         // THE prop — no longer a stand-in
  lodDist?: number;                        // inert since the pack was deleted
  onReady?: (g: THREE.Group) => void;      // hook for animated placements
}

export function glb(
  scene: THREE.Scene, addEdible: AddEdible | null, name: string,
  x: number, z: number, r: number, opts: GlbOpts = {},
): void {
  // A CENSUS OF WHAT EACH WORLD PLACES. island.ts passes `name` as a variable
  // at four call sites, so this is still the only way to answer the question
  // without reading every builder — qa/_census.mjs reads it. One property
  // write per placement, at boot only, never per frame.
  const _w = window as unknown as { __glbCount?: Record<string, number> };
  _w.__glbCount = _w.__glbCount || {};
  _w.__glbCount[name] = (_w.__glbCount[name] || 0) + 1;
  // THE PACK IS GONE AND THE BUILT PROP IS THE GAME. This used to fetch a GLB
  // and place the procedural version only if the download failed; that is now
  // the only path. See the note at the top of this file for why.
  //
  // opts.h and opts.lodDist are inert. They stay in the signature so several
  // hundred call sites do not have to change, and so restoring the pack would
  // be a change to this one function.
  if (!opts.fallback) return;
  const fb = opts.fallback();
  // never register an INVISIBLE edible — an empty group is a prop the player
  // can eat and cannot see
  if (fb.children.length === 0 && !(fb as THREE.Mesh).isMesh) return;
  const qk = name.startsWith('house') ? 'house' : undefined;
  if (qk) fb.userData.qk = qk;
  fb.position.set(x, 0, z);
  if (opts.rotY) fb.rotation.y = opts.rotY;
  const fbCast = shouldCast(r, fb);
  fb.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = fbCast; o.receiveShadow = true; } });
  // anything that does not cast gets a contact disc, or it reads as floating
  if (!fbCast) fb.add(contactShadow(Math.max(0.55, r * 1.1)));
  scene.add(fb);
  addEdible?.(fb, r);
  opts.onReady?.(fb as THREE.Group);
}

// ?debug=assets used to photograph the whole GLB pack on floating platforms.
// There is no pack; qa/keyart.mjs and qa/hero.mjs shoot the actual game.
export function buildGallery(_scene: THREE.Scene): void { /* the pack is gone */ }

/** THE VEHICLES ARE PROCEDURAL TOO. This swapped a mover's built mesh for a
 *  downloaded one once it arrived. Its three names — tank, car_sedan and
 *  car_taxi — are gone with the rest of the pack (`tank` was one of the
 *  seventeen permanent 403s anyway), so the procedural vehicle that used to be
 *  the fallback is simply the vehicle.
 *
 *  A no-op rather than a deletion: defense.ts and the traffic builders call it
 *  at several sites, and this keeps the decision reversible in one file. */
export function vehicleGlb(
  _container: THREE.Object3D, _name: string, _len: number,
  _opts: { tint?: number; keep?: THREE.Object3D[] } = {},
): void { /* the pack is gone — the procedural mesh stays */ }

let balloonHook: (g: THREE.Group) => void = () => {};
export const setBalloonHook = (fn: (g: THREE.Group) => void) => { balloonHook = fn; };
/** THE ONE PROP THE PACK WAS CARRYING ALONE. Every other glb() call site
 *  passes a `fallback`, so deleting the pack changed how they look and not
 *  whether they exist — but `balloon2` had none, which means it would have
 *  silently ceased to be, and Maple Falls is already the world with the least
 *  going on. It is drifting scenery seen from a long way off, so it is a
 *  striped envelope, a basket and four lines. */
export function spawnBalloon(scene: THREE.Scene) {
  glb(scene, null, 'balloon2', 0, 0, 0, {
    h: 13,
    fallback: () => {
      const g = new THREE.Group();
      const envelope = new THREE.Mesh(
        new THREE.SphereGeometry(3.1, 18, 14),
        new THREE.MeshStandardMaterial({ color: 0xff6b8a, roughness: 0.72, flatShading: true }));
      envelope.scale.set(1, 1.24, 1);
      envelope.position.y = 9.6;
      g.add(envelope);
      // gores, so it reads as a balloon and not a floating ball
      for (let i = 0; i < 4; i++) {
        const gore = new THREE.Mesh(
          new THREE.SphereGeometry(3.13, 10, 14, (i / 4) * Math.PI * 2, Math.PI / 5.5),
          new THREE.MeshStandardMaterial({ color: 0xffd25a, roughness: 0.72, flatShading: true }));
        gore.scale.set(1, 1.24, 1); gore.position.y = 9.6;
        g.add(gore);
      }
      const basket = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 1.25, 1.5),
        new THREE.MeshStandardMaterial({ color: 0x9a6b3f, roughness: 0.95, flatShading: true }));
      basket.position.y = 5.0;
      g.add(basket);
      const lineMat = new THREE.MeshStandardMaterial({ color: 0x5a4630, roughness: 1 });
      for (const [sx, sz] of [[0.62, 0.62], [-0.62, 0.62], [0.62, -0.62], [-0.62, -0.62]]) {
        const line = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.1, 4), lineMat);
        line.position.set(sx, 6.7, sz);
        g.add(line);
      }
      return g;
    },
    onReady: (g) => balloonHook(g),
  });
}
