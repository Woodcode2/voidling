// ─────────────────────────────────────────────────────────────────────────────
// WHAT GROUND A PROP ACTUALLY STANDS ON
//
// The placement hash reserves ground as CIRCLES — one radius per prop. The
// audit that grades placement, qa/placement.mjs, does not: it builds each
// prop's ORIENTED RECTANGLE and runs a separating-axis test between pairs
// (qa/placement.mjs:48, :322-328). The two systems disagree about what shape a
// prop is, and for anything long and thin they disagree badly: a market shed
// is 12.2 x 3.6 on the ground, and the smallest circle that covers its corners
// has radius 6.36 — 127 square units of reservation for a prop standing on 44.
// That is why widening claims to satisfy the audit costs prop density, and
// density is the thing this game is being tuned for.
//
// This module computes the same rectangle the audit does, so the game can
// reserve the ground a prop occupies instead of a circle around it.
//
// THE AUDIT'S ALGORITHM, matched deliberately (qa/placement.mjs:276-302):
//   - only geometry at or below GROUND_H counts. A pine's canopy is not its
//     footprint; its trunk is. This is the rule that keeps a tree from
//     reserving the whole clearing it stands in.
//   - extents are taken in the PROP'S OWN local frame, so the rectangle is
//     tight to a rotated prop rather than to a world-aligned box around it.
//   - the rectangle's centre is generally OFFSET from the mesh origin, because
//     a prop is not always modelled around its own middle.
//
// A VERTEX WALK, PAID ONCE PER PART. The first cut of this walked each child's
// BOUNDING BOX instead, which is far cheaper, and qa/footprint.mjs measured it
// against the audit and rejected it: a pine came out 2.11 x 2.11 against a true
// 0.32 x 0.37, because the canopy's box dips below the ground line and so the
// whole canopy was handed to the footprint. A pine reserving forty times the
// ground it stands on would empty out the forest, which is the exact failure
// this change exists to prevent. Lantern had 10.5% of its props over by half a
// unit or more.
//
// So it walks vertices, like the audit — but a prop's PARTS are shared. Every
// pine in the world is the same geometry at the same local transform inside the
// prop, so the slice below the ground line is the same rectangle every time.
// That result is cached per (geometry, transform-within-the-prop) and the walk
// is paid once per distinct part instead of once per prop: on Powder, hundreds
// of pines cost one walk between them.
//
// THE FRAME IS THE AUDIT'S FRAME, and getting that wrong was the second thing
// qa/footprint.mjs caught. The obvious move is to work in the prop's own local
// space — invert its matrixWorld — and it is wrong, because that divides the
// scale out. The audit builds its frame as rotation-about-Y plus translation
// and NOTHING ELSE (qa/placement.mjs:277), so a vertex lands there in WORLD
// units with any scale already baked in, and its height is its true world
// height. Props scaled by glb() (island.ts:3833) are the ones that expose the
// difference: on the local-space version a scaled model reported 7.25 x 2.77
// where the truth was 14.88 x 3.20 — the game would have reserved half the
// ground the prop stands on. Nine props on Maple, sixteen on Pirate.
//
// Building the frame the same way makes the height filter correct for free:
// rotation about Y does not change height, and the frame's origin is at y = 0,
// so a transformed vertex's y IS its world y.

import * as THREE from 'three';

/** Half-extents and centre offset in the prop's local frame, in 3D units. */
export interface Foot { hx: number; hz: number; cx: number; cz: number }

/** Only geometry at or below this height counts as touching the ground.
 *  qa/placement.mjs calls the same number GROUND_H and uses it the same way. */
export const GROUND_H = 1.0;

const _v = new THREE.Vector3();
const _m = new THREE.Matrix4();

/** Local x/z bounds of one part's below-the-line slice, in the prop's frame. */
interface Slice { x0: number; x1: number; z0: number; z1: number; any: boolean }
const SLICES = new Map<string, Slice>();

/** A part is the same part in every copy of a prop when it is the same geometry
 *  at the same transform inside the prop. Six decimals is finer than any
 *  placement decision and coarse enough that float noise does not miss. */
const partKey = (g: THREE.BufferGeometry, m: THREE.Matrix4, h: number): string => {
  let k = g.uuid + '|' + h;
  for (let i = 0; i < 16; i++) k += ',' + m.elements[i].toFixed(6);
  return k;
};

/** Clear the cache. A world build may rebuild geometry, and a stale slice would
 *  be a prop reserving another prop's ground. */
export function resetFootprints(): void { SLICES.clear(); }

/** The ground rectangle of a prop, in its own local frame. Returns null for a
 *  prop with nothing at ground level at all — a hanging lantern, a banner on a
 *  wire — which reserves no ground and should not be given a rectangle. */
export function groundFootprint(root: THREE.Object3D, groundH = GROUND_H): Foot | null {
  root.updateWorldMatrix(false, true);
  // the audit's frame, element for element — see the note above
  const inv = new THREE.Matrix4()
    .makeRotationY(root.rotation.y)
    .setPosition(root.position.x, 0, root.position.z)
    .invert();
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || !mesh.geometry) return;
    const pos = mesh.geometry.getAttribute('position') as THREE.BufferAttribute | undefined;
    if (!pos) return;
    // the part's transform WITHIN the prop — the same for every copy of it
    _m.multiplyMatrices(inv, mesh.matrixWorld);
    const key = partKey(mesh.geometry, _m, groundH);
    let s = SLICES.get(key);
    if (!s) {
      s = { x0: Infinity, x1: -Infinity, z0: Infinity, z1: -Infinity, any: false };
      for (let i = 0; i < pos.count; i++) {
        _v.fromBufferAttribute(pos, i).applyMatrix4(_m);
        if (_v.y > groundH) continue;
        s.any = true;
        if (_v.x < s.x0) s.x0 = _v.x;
        if (_v.x > s.x1) s.x1 = _v.x;
        if (_v.z < s.z0) s.z0 = _v.z;
        if (_v.z > s.z1) s.z1 = _v.z;
      }
      SLICES.set(key, s);
    }
    if (!s.any) return;
    if (s.x0 < x0) x0 = s.x0;
    if (s.x1 > x1) x1 = s.x1;
    if (s.z0 < z0) z0 = s.z0;
    if (s.z1 > z1) z1 = s.z1;
  });
  if (x0 === Infinity) return null;
  return { hx: (x1 - x0) / 2, hz: (z1 - z0) / 2, cx: (x0 + x1) / 2, cz: (z0 + z1) / 2 };
}

/** The four world-space corners of a prop's ground rectangle, in the same
 *  winding and the same frame qa/placement.mjs builds. `ry` is rotation.y. */
export function footCorners(f: Foot, x: number, z: number, ry: number): [number, number][] {
  const c = Math.cos(ry), s = Math.sin(ry);
  const w = (lx: number, lz: number): [number, number] => [x + lx * c + lz * s, z - lx * s + lz * c];
  return [w(f.cx - f.hx, f.cz - f.hz), w(f.cx + f.hx, f.cz - f.hz),
    w(f.cx + f.hx, f.cz + f.hz), w(f.cx - f.hx, f.cz + f.hz)];
}

/** The prop's ground rectangle expressed the way the placement hash wants it:
 *  WORLD units, centred on the claim point, with the prop's own rotation.
 *  `wx, wy` is the claim point in world units and `ry` the prop's rotation.y —
 *  the same pair drop() already passes to claimSpot. Scale is world = 3D x 20,
 *  the constant every world module already uses. */
export function worldRect(f: Foot, wx: number, wy: number, ry: number):
{ cx: number; cz: number; hx: number; hz: number; c: number; s: number } {
  const c = Math.cos(ry), s = Math.sin(ry);
  // the footprint's centre is offset from the mesh origin, and that offset is
  // stated in the prop's own turned frame — so it turns with the prop
  return { cx: wx + (f.cx * c + f.cz * s) * 20, cz: wy + (-f.cx * s + f.cz * c) * 20,
    hx: f.hx * 20, hz: f.hz * 20, c, s };
}
