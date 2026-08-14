// Juice kit — shockwave rings, screen flash, camera shake. Shared by powers and
// the city's defense so hits and blasts feel weighty.
import * as THREE from 'three';

export interface Fx {
  ring(x: number, z: number, color: number, maxR: number, dur?: number): void;
  flash(color: string, alpha?: number): void;
  shake(amt: number): void;
  /** `camDist` is the camera's current distance from the void. Shake is
   *  authored in SCREEN terms — a bite should kick the picture by the same
   *  visible amount at every size — but the offset is applied in world units,
   *  and the follow distance travels from ~26 at spawn to ~340 at WORLD ENDER.
   *  Without this the same shake(11) is a viewport-whipping lurch on a hatchling
   *  and literally sub-pixel on a colossus. Scaled here, once, so every call
   *  site keeps its authored number and means the same thing at both ends. */
  update(dt: number, camDist?: number): THREE.Vector3;   // returns a camera-shake offset to add
}

// ── REDUCE MOTION ───────────────────────────────────────────────────────────
// The shipped build had no motion accessibility of any kind: no
// prefers-reduced-motion CSS, no matchMedia check, and no toggle in Settings.
// A child with iOS Reduce Motion turned on — one of the settings parents of
// vestibular-sensitive, migraine-prone and autistic children most often enable
// — still got the full-screen 0.6-alpha wash on eating a rival, a 0.55-alpha
// white flash at final evolution, and camera shake of 11/9/6 on bites, meals
// and near-misses.
//
// IT HAS TO LIVE HERE, not in CSS. The flash is an inline style set from JS
// (flashEl.style.opacity) and the shake is a WebGL camera offset, so a media
// query in the stylesheet would not have gated either of them. There IS a
// prefers-reduced-motion block in src/ui.css, but that file is imported only by
// the retired React shell and index.html never loads it — it styles .vd-* and
// never covered this game.
//
// Default follows the OS; an explicit choice in Settings wins over it either
// way, so a parent can turn it on for a device whose global setting is off.
let _reduce: boolean | null = null;
const osReduce = () => {
  try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
};
export function reduceMotion(): boolean {
  if (_reduce === null) {
    let saved: string | null = null;
    try { saved = localStorage.getItem('voidMotion'); } catch { /* private mode */ }
    _reduce = saved === null ? osReduce() : saved === '0';
  }
  return _reduce;
}
export function setReduceMotion(on: boolean) {
  _reduce = on;
  try { localStorage.setItem('voidMotion', on ? '0' : '1'); } catch { /* private mode */ }
}

interface Ring { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; t: number; dur: number; maxR: number; }

export function createFx(scene: THREE.Scene): Fx {
  const rings: Ring[] = [];
  const RING_POOL = 12;
  for (let i = 0; i < RING_POOL; i++) {
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(new THREE.RingGeometry(0.86, 1, 48), mat);
    mesh.rotation.x = -Math.PI / 2; mesh.position.y = 0.15; mesh.visible = false;
    scene.add(mesh);
    rings.push({ mesh, mat, t: 0, dur: 0, maxR: 1 });
  }
  let ringHead = 0;

  // screen flash overlay
  const flashEl = document.createElement('div');
  flashEl.style.cssText = 'position:fixed;inset:0;z-index:4;pointer-events:none;opacity:0;transition:opacity 0.05s linear;';
  document.body.appendChild(flashEl);
  let flashT = 0;

  let shakeAmt = 0;
  const shakeVec = new THREE.Vector3();
  // The camera distance every shake() call in the game was tuned against —
  // roughly the early-form follow distance, where 11/9/6 were chosen by eye.
  const SHAKE_REF_DIST = 60;

  return {
    ring(x, z, color, maxR, dur = 0.6) {
      const r = rings[ringHead]; ringHead = (ringHead + 1) % RING_POOL;
      r.mesh.visible = true; r.mesh.position.set(x, 0.15, z);
      r.mat.color.set(color); r.t = 0; r.dur = dur; r.maxR = maxR;
    },
    flash(color, alpha = 0.5) {
      flashEl.style.background = color;
      // REDUCE MOTION caps the wash rather than removing it. The flash is a
      // readable signal — "you ate a rival", "you reached the final form" — so
      // silencing it outright would cost information; what makes it a
      // vestibular problem is the 0.55-0.6 alpha full-screen swing, not the
      // cue itself.
      flashEl.style.opacity = String(reduceMotion() ? Math.min(alpha, 0.15) : alpha);
      flashT = 0.12;
    },
    // …and camera shake goes entirely. Unlike the flash it carries no
    // information the rest of the frame does not already show, and translating
    // the viewpoint is the part that actually provokes motion sickness.
    shake(amt) { if (!reduceMotion()) shakeAmt = Math.max(shakeAmt, amt); },
    update(dt, camDist = SHAKE_REF_DIST) {
      for (const r of rings) {
        if (!r.mesh.visible) continue;
        r.t += dt;
        const k = r.t / r.dur;
        if (k >= 1) { r.mesh.visible = false; continue; }
        const rad = r.maxR * (0.15 + k * 0.85);
        r.mesh.scale.setScalar(rad);
        r.mat.opacity = (1 - k) * 0.8;
      }
      if (flashT > 0) { flashT -= dt; if (flashT <= 0) flashEl.style.opacity = '0'; }
      // decaying shake, in SCREEN terms (see the interface note on camDist):
      // the authored amount is multiplied by how far the camera currently sits
      // from the reference distance the numbers were tuned at, so shake(11)
      // kicks the same fraction of the frame at every form.
      if (shakeAmt > 0.001) {
        const s = shakeAmt * (camDist / SHAKE_REF_DIST);
        shakeVec.set((Math.random() - 0.5) * s, (Math.random() - 0.5) * s * 0.6, (Math.random() - 0.5) * s);
        shakeAmt *= Math.pow(0.001, dt);   // fast decay
        if (shakeAmt < 0.05) shakeAmt = 0;
      } else shakeVec.set(0, 0, 0);
      return shakeVec;
    },
  };
}
