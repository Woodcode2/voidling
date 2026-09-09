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
// WHERE IT DIFFERS, stated because it matters. The audit walks every vertex.
// Doing that for five thousand props at world build would cost seconds, so
// this walks each child mesh's bounding box instead — cached on the geometry,
// which the props share heavily. For a child whose box straddles GROUND_H the
// box is wider than the true slice, so this can over-report. qa/footprint.mjs
// measures that difference against the audit's own numbers rather than leaving
// it as an assumption.
import * as THREE from 'three';

/** Half-extents and centre offset in the prop's local frame, in 3D units. */
export interface Foot { hx: number; hz: number; cx: number; cz: number }

/** Only geometry at or below this height counts as touching the ground.
 *  qa/placement.mjs calls the same number GROUND_H and uses it the same way. */
export const GROUND_H = 1.0;

const _box = new THREE.Box3();
const _v = new THREE.Vector3();
const _m = new THREE.Matrix4();

/** The ground rectangle of a prop, in its own local frame. Returns null for a
 *  prop with nothing at ground level at all — a hanging lantern, a banner on a
 *  wire — which reserves no ground and should not be given a rectangle. */
export function groundFootprint(root: THREE.Object3D, groundH = GROUND_H): Foot | null {
  root.updateWorldMatrix(false, true);
  _m.copy(root.matrixWorld).invert();
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || !mesh.geometry) return;
    const g = mesh.geometry;
    if (!g.boundingBox) g.computeBoundingBox();
    const bb = g.boundingBox;
    if (!bb) return;
    // The child's eight corners, walked into the ROOT's local frame. A child
    // may be rotated inside the prop, so its own box is not axis-aligned there.
    _box.makeEmpty();
    for (let i = 0; i < 8; i++) {
      _v.set(i & 1 ? bb.max.x : bb.min.x, i & 2 ? bb.max.y : bb.min.y, i & 4 ? bb.max.z : bb.min.z);
      _v.applyMatrix4(mesh.matrixWorld).applyMatrix4(_m);
      _box.expandByPoint(_v);
    }
    // Nothing at ground level: this child is a canopy, a roof, a hanging sign.
    if (_box.min.y > groundH) return;
    if (_box.min.x < x0) x0 = _box.min.x;
    if (_box.max.x > x1) x1 = _box.max.x;
    if (_box.min.z < z0) z0 = _box.min.z;
    if (_box.max.z > z1) z1 = _box.max.z;
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
