// Juice kit — shockwave rings, screen flash, camera shake. Shared by powers and
// the city's defense so hits and blasts feel weighty.
import * as THREE from 'three';

export interface Fx {
  ring(x: number, z: number, color: number, maxR: number, dur?: number): void;
  flash(color: string, alpha?: number): void;
  shake(amt: number): void;
  update(dt: number): THREE.Vector3;   // returns a camera-shake offset to add
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

  return {
    ring(x, z, color, maxR, dur = 0.6) {
      const r = rings[ringHead]; ringHead = (ringHead + 1) % RING_POOL;
      r.mesh.visible = true; r.mesh.position.set(x, 0.15, z);
      r.mat.color.set(color); r.t = 0; r.dur = dur; r.maxR = maxR;
    },
    flash(color, alpha = 0.5) {
      flashEl.style.background = color;
      flashEl.style.opacity = String(alpha);
      flashT = 0.12;
    },
    shake(amt) { shakeAmt = Math.max(shakeAmt, amt); },
    update(dt) {
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
      // decaying shake
      if (shakeAmt > 0.001) {
        shakeVec.set((Math.random() - 0.5) * shakeAmt, (Math.random() - 0.5) * shakeAmt * 0.6, (Math.random() - 0.5) * shakeAmt);
        shakeAmt *= Math.pow(0.001, dt);   // fast decay
        if (shakeAmt < 0.05) shakeAmt = 0;
      } else shakeVec.set(0, 0, 0);
      return shakeVec;
    },
  };
}
