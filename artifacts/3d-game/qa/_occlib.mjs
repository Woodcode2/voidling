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

  // ── IS HE EVEN IN THE PICTURE? ────────────────────────────────────────────
  //
  // THE BLIND SPOT THAT NEARLY SHIPPED. Everything above answers "is anything
  // between the lens and the hero". That is NOT the question. The question is
  // "can the child see her character". Push him off the side of the screen and
  // nothing is in front of him, so this returns 0% covered — THE BEST SCORE IT
  // CAN GIVE. Deleting the hero scores perfectly.
  //
  // It was caught by a screenshot, not by a number: pirate at lateral 26 measured
  // 1.4% covered across a whole camera swing, and the picture has no hero in it
  // at all. footY was already checked against the ladder panel, so VERTICAL
  // displacement was covered; footX was never recorded, and lateral is exactly
  // the move the fix was built on.
  const c = ctr.clone().project(cam);
  const cx = (c.x + 1) * 0.5 * 430, cy = (1 - c.y) * 0.5 * 932;
  const rpx = (932 / (2 * camD * Math.tan(16 * Math.PI / 180))) * HR;   // his radius on screen
  const offScreen = c.z > 1 || cx + rpx < 0 || cx - rpx > 430 || cy + rpx < 0 || cy - rpx > 932;
  // how much of his disc's bounding box is inside the viewport, 0..1
  const vis = Math.max(0, Math.min(430, cx + rpx) - Math.max(0, cx - rpx)) *
              Math.max(0, Math.min(932, cy + rpx) - Math.max(0, cy - rpx)) /
              Math.max(1, (2 * rpx) * (2 * rpx));
  const ms = window.__menuState();
  return {
    az: ms.azimuth === null ? null : +ms.azimuth.toFixed(1),
    a0: ms.a0, menuT: ms.menuT, mark: window.__dioMark ? window.__dioMark() : -1,
    camD: +camD.toFixed(1), heroR: +HR.toFixed(2), candidates: cand.length,
    samples: tried, blocked,
    coveredPct: tried ? +(100 * blocked / tried).toFixed(1) : 0,
    footY: Math.round((1 - foot.y) * 0.5 * 932),
    footX: Math.round((foot.x + 1) * 0.5 * 430),
    cx: Math.round(cx), cy: Math.round(cy), rpx: Math.round(rpx),
    offScreen, onScreenFrac: +vis.toFixed(2),
    worst: worst ? `${worst[0]} x${worst[1]}` : null,
  };
}

// ── THE THIRD CLOCK: THE SCENE IS STILL ARRIVING ────────────────────────────
//
// Pinning menuT pins the camera and the crowd, both of which run on GAME time.
// It does nothing about the asset stream, which runs on WALL time and on the
// sandbox's mood: "GLB props stream in for a while after boot"
// (src/prototype3d.ts:4610), and the landmarks are among them (:1170). A probe
// that waits a flat 20 seconds is guessing, and three runs of one world, one
// offset and one frozen azimuth came back 6.8%, 15% and 17% because the scene
// they each measured was a different scene.
//
// So: stop waiting for a clock and wait for the WORLD. Poll what is in the
// scene until it stops changing. Cheap — a traverse and two counters — and it
// answers the actual question, which is "has everything arrived yet".
export function sceneFingerprint() {
  let meshes = 0, tris = 0;
  window.__scene.traverse((o) => {
    if (!o.isMesh) return;
    meshes++;
    const g = o.geometry;
    if (g && g.index) tris += g.index.count;
    else if (g && g.attributes && g.attributes.position) tris += g.attributes.position.count;
  });
  return `${meshes}:${tris}`;
}

/** Block until sceneFingerprint() is unchanged across `stable` consecutive polls. */
export async function waitForScene(page, { gap = 2500, stable = 3, timeout = 300000 } = {}) {
  const t0 = Date.now();
  let last = null, runs = 0;
  for (;;) {
    const fp = await page.evaluate(sceneFingerprint);
    runs = fp === last ? runs + 1 : 0;
    last = fp;
    if (runs >= stable) return fp;
    if (Date.now() - t0 > timeout) throw new Error(`scene never settled, last ${fp}`);
    await page.waitForTimeout(gap);
  }
}
