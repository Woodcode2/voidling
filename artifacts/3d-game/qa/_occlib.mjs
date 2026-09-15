// ── ONE MEASUREMENT OF "IS ANYTHING IN FRONT OF HIM", USED BY EVERY PROBE ────
//
// This existed three times — in _dioocc, _marksweep and _driftcheck — and the
// copies disagreed. Pirate at lat 20 and phase t0 measured 3.4% in one and 6.6%
// in another: same world, same offset, same azimuth, one PASS and one FAIL. The
// difference was never going to be visible by reading them side by side, which
// is the whole argument for there being one.
//
// It is the same lesson _fadeable.mjs already taught this project: a probe that
// reimplements what it audits will drift from it, and a probe that reimplements
// ANOTHER PROBE will drift from that too.
//
// Passed straight to page.evaluate, so it must be self-contained — no closure
// over module scope, everything it needs off `window`.
export function measureOcclusion() {
  const T = window.__THREE, cam = window.__cam, scene = window.__scene;
  const vg = window.__voidGroup();
  let bob = null;
  vg.traverse((o) => {
    const q = o.geometry && o.geometry.parameters;
    if (q && q.radius === 1 && q.widthSegments === 96 && q.heightSegments === 72) bob = o.parent;
  });
  if (!bob) return { error: 'body sphere not found' };
  bob.updateWorldMatrix(true, false);
  const ctr = new T.Vector3(), sc = new T.Vector3();
  bob.matrixWorld.decompose(ctr, new T.Quaternion(), sc);
  const HR = sc.y;                                   // his world radius, from the mesh
  const camD = cam.position.distanceTo(ctr);
  const axis = new T.Vector3().subVectors(ctr, cam.position).normalize();
  const up = new T.Vector3(0, 1, 0).projectOnPlane(axis).normalize();
  const right = new T.Vector3().crossVectors(axis, up).normalize();

  // CANDIDATES. The NEAR FACE is what occludes, not the centre — the shipped
  // fadeOccluders was fixed for exactly this (src/prototype3d.ts:1925) and the
  // probes kept the broken form for a while. Generosity is free: the raycast
  // below stops short of his surface, so a prop that does not reach him cannot
  // register a hit.
  const inVoid = (x) => { for (let a = x; a; a = a.parent) if (a === vg) return true; return false; };
  const cand = [], bs = new T.Sphere(), tmp = new T.Vector3();
  scene.traverse((o) => {
    if (!o.isMesh || inVoid(o)) return;
    for (let a = o; a; a = a.parent) if (!a.visible) return;
    if (!o.geometry) return;
    if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
    if (!o.geometry.boundingSphere) return;
    bs.copy(o.geometry.boundingSphere).applyMatrix4(o.matrixWorld);
    tmp.subVectors(bs.center, cam.position);
    const t = tmp.dot(axis);
    if (t + bs.radius <= 0 || t - bs.radius >= camD + HR) return;
    if (Math.sqrt(Math.max(0, tmp.lengthSq() - t * t)) > HR + bs.radius) return;
    cand.push(o);
  });

  const rc = new T.Raycaster();
  rc.layers.set(0);
  const N = 25;
  let tried = 0, blocked = 0; const by = {};
  for (let iy = 0; iy < N; iy++) for (let ix = 0; ix < N; ix++) {
    const u = (ix / (N - 1)) * 2 - 1, v = (iy / (N - 1)) * 2 - 1;
    if (u * u + v * v > 1) continue;                 // outside his disc
    tried++;
    const k = Math.sqrt(Math.max(0, 1 - (u * u + v * v)));
    const surf = ctr.clone()
      .addScaledVector(right, u * HR).addScaledVector(up, v * HR).addScaledVector(axis, -k * HR);
    const d = new T.Vector3().subVectors(surf, cam.position);
    const len = d.length();
    d.multiplyScalar(1 / len);
    rc.set(cam.position.clone(), d);
    rc.near = 0.1; rc.far = len - 0.05;              // stop short of him
    const hits = rc.intersectObjects(cand, false);
    if (hits.length) {
      blocked++;
      const nm = hits[0].object.name || hits[0].object.parent?.name || hits[0].object.type;
      by[nm] = (by[nm] || 0) + 1;
    }
  }
  const foot = ctr.clone().addScaledVector(new T.Vector3(0, 1, 0), -HR).project(cam);
  const worst = Object.entries(by).sort((a, b) => b[1] - a[1])[0];
  const ms = window.__menuState();
  return {
    az: ms.azimuth === null ? null : +ms.azimuth.toFixed(1),
    a0: ms.a0, menuT: ms.menuT, mark: window.__dioMark ? window.__dioMark() : -1,
    camD: +camD.toFixed(1), heroR: +HR.toFixed(2), candidates: cand.length,
    samples: tried, blocked,
    coveredPct: tried ? +(100 * blocked / tried).toFixed(1) : 0,
    footY: Math.round((1 - foot.y) * 0.5 * 932),
    worst: worst ? `${worst[0]} x${worst[1]}` : null,
  };
}
