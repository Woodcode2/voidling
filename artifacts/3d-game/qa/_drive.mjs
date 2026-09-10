// THE AUTOPILOT, IN ONE PLACE.
//
// qa/pace.mjs carried this inline, and the note it carries with it is the
// reason this file exists: for as long as that probe had existed the driver
// steered 45 DEGREES OFF TARGET, because it fed a WORLD direction into a
// SCREEN joystick. The play camera is isometric (camOffset 0.62, 0.92, 0.62),
// so its X and Z are equal and screen-forward is world (-1,-1)/sqrt(2);
// handing it (dx, dz) produces the same vector rotated 45 degrees. It still
// converged — retargeting every frame turns a constant angular bias into a
// spiral — so nothing looked broken, it just walked 1/cos(45) = 1.41x further
// to reach anything, and every pacing number in the repo was tuned against it.
//
// A bug that survives that long in copy #1 will survive in copy #2. So the
// corrected driver lives here and both probes take it from here. The camera
// basis is read from the LIVE camera rather than hardcoded, so it stays correct
// if the camera angle is ever retuned.
//
// It is a STRING because it is handed to page.evaluate/addInitScript, which
// serialises the function into the page — a closure over anything on the node
// side would be a ReferenceError over there.

/** Drive at the nearest edible the void can currently eat, forever.
 *  Dispatches the real input path: one pointerdown on the canvas (which is
 *  also what STARTS the match clock, prototype3d.ts:3397) then pointermove on
 *  window, exactly as a thumb does. */
export const DRIVE_NEAREST = `(() => {
  const cv = document.querySelector('canvas');
  const cx = innerWidth / 2, cy = innerHeight / 2;
  cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: cx, clientY: cy, bubbles: true }));
  const tick = () => {
    const vs = window.__voidState(); let best = null, bd = 1e9;
    for (const e of window.__edibles) {
      if (e.eaten || !e.mesh?.visible || e.radius > vs.r * 0.92) continue;
      const dx = e.mesh.position.x - vs.x, dz = e.mesh.position.z - vs.z;
      const d = dx * dx + dz * dz; if (d < bd) { bd = d; best = { dx, dz }; }
    }
    if (best) {
      const cam = window.__cam;
      let fx = vs.x - cam.position.x, fz = vs.z - cam.position.z;
      const fl = Math.hypot(fx, fz) || 1; fx /= fl; fz /= fl;      // camera forward, on the ground
      const rx = -fz, rz = fx;                                      // and screen-right
      const m = Math.hypot(best.dx, best.dz) || 1;
      const wx = best.dx / m, wz = best.dz / m;
      const sx = -fz * wx + fx * wz;                                // screen x
      const sy = -rz * wx + rx * wz;                                // screen y
      const sm = Math.hypot(sx, sy) || 1;
      dispatchEvent(new PointerEvent('pointermove', { pointerId: 1,
        clientX: cx + sx / sm * 110, clientY: cy + sy / sm * 110, bubbles: true }));
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
})()`;
