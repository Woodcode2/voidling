// The city fights back. Defense waves escalate with the player's form:
// police -> army -> tanks -> helicopters. Units close in and fire telegraphed
// shots (screen shake + a score chip on hit); a big-enough void devours them for
// points ("delicious irony"). Returns a running score delta to the host.
import * as THREE from 'three';
import type { Biome } from './island';
import type { Fx } from './fx';
import { vehicleGlb } from './assets3d';

export interface Defense {
  setPhase(n: number): string | null;   // returns a banner if a new wave spawned
  update(dt: number, vx: number, vz: number, vR: number): number;   // score delta
}

type Kind = 'police' | 'jeep' | 'tank' | 'heli';
const rand = (a: number, b: number) => a + Math.random() * (b - a);

function makeUnit(kind: Kind): THREE.Group {
  const g = new THREE.Group();
  if (kind === 'heli') {
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(1.4, 3, 4, 8), new THREE.MeshStandardMaterial({ color: 0x2f6a3a, roughness: 0.5, metalness: 0.3 }));
    body.rotation.z = Math.PI / 2; body.position.y = 0; g.add(body);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(4, 0.5, 0.5), new THREE.MeshStandardMaterial({ color: 0x2f6a3a })); tail.position.set(-3, 0.3, 0); g.add(tail);
    const rotor = new THREE.Mesh(new THREE.BoxGeometry(9, 0.15, 0.6), new THREE.MeshStandardMaterial({ color: 0x20242c })); rotor.position.y = 1.6; g.add(rotor);
    g.userData.rotor = rotor;
    return g;
  }
  const cols: Record<string, number> = { police: 0x2b3a67, jeep: 0x5a6a3a, tank: 0x47533a };
  const w = kind === 'tank' ? 5 : 6.2, h = kind === 'tank' ? 2.6 : 2.2, d = kind === 'tank' ? 4 : 3;
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: cols[kind], roughness: 0.6, metalness: 0.2, flatShading: true }));
  body.position.y = 1.5; g.add(body);
  if (kind === 'police') {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 1.6), new THREE.MeshStandardMaterial({ color: 0xff3b3b, emissive: 0xff0000, emissiveIntensity: 0.6 }));
    bar.position.y = 2.9; g.add(bar); g.userData.light = bar;
  }
  if (kind === 'tank') {
    const turret = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.8, 1.4, 8), new THREE.MeshStandardMaterial({ color: 0x3c472f, flatShading: true }));
    turret.position.y = 3; g.add(turret);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 4, 6), new THREE.MeshStandardMaterial({ color: 0x2a3020 }));
    barrel.rotation.z = Math.PI / 2; barrel.position.set(2.5, 3, 0); g.add(barrel);
  }
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x20242c, roughness: 0.9 });
  for (const sx of [-1.9, 1.9]) for (const sz of [-1.4, 1.4]) {
    const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.6, 8), wheelMat);
    wh.rotation.x = Math.PI / 2; wh.position.set(sx, 0.9, sz); g.add(wh);
  }
  // NO BLOCK VEHICLES: every ground unit upgrades to an AI mesh.
  // tank = the tank; jeep = a smaller tank variant; police = the sedan washed
  // toward cruiser-blue, keeping its procedural light bar on top.
  if (kind === 'tank') vehicleGlb(g, 'tank', 7);
  else if (kind === 'jeep') vehicleGlb(g, 'tank', 5.4);
  else if (kind === 'police') vehicleGlb(g, 'car_sedan', 6.2, { tint: 0x7788dd, keep: g.userData.light ? [g.userData.light] : [] });
  return g;
}

interface Unit { g: THREE.Group; kind: Kind; x: number; z: number; y: number; fireCd: number; value: number; speed: number; dmg: number; }

export function createDefense(scene: THREE.Scene, fx: Fx, biomeAt: (x: number, z: number) => Biome | null): Defense {
  const units: Unit[] = [];
  const PELLET = 60;
  const pgeo = new THREE.SphereGeometry(0.4, 6, 6);
  const pmat = new THREE.MeshBasicMaterial({ color: 0xffe08a });
  const pellets = new THREE.InstancedMesh(pgeo, pmat, PELLET);
  pellets.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  pellets.count = PELLET; scene.add(pellets);
  const pst: { x: number; y: number; z: number; vx: number; vy: number; vz: number; life: number; dmg: number }[] = [];
  const dummy = new THREE.Object3D();
  for (let i = 0; i < PELLET; i++) { pst.push({ x: 0, y: -999, z: 0, vx: 0, vy: 0, vz: 0, life: 0, dmg: 0 }); dummy.position.set(0, -999, 0); dummy.updateMatrix(); pellets.setMatrixAt(i, dummy.matrix); }
  let phead = 0;
  const setShadow = (m: THREE.Object3D) => m.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.castShadow = true; });

  function spawn(kind: Kind, n: number, value: number, speed: number, dmg: number) {
    for (let i = 0; i < n; i++) {
      const g = makeUnit(kind); setShadow(g);
      // ground units must spawn ON the island — never in the ocean (helis fly)
      let x = 0, z = 0;
      for (let k = 0; k < 14; k++) {
        const ang = rand(0, Math.PI * 2), rad = rand(120, 230);
        x = Math.cos(ang) * rad; z = Math.sin(ang) * rad;
        if (kind === 'heli' || biomeAt(x, z)) break;
        if (k === 13) { x *= 0.5; z *= 0.5; }   // deep fallback: well inland
      }
      const y = kind === 'heli' ? 20 : 0;
      g.position.set(x, y, z); scene.add(g);
      units.push({ g, kind, x, z, y, fireCd: rand(1, 3), value, speed, dmg });
    }
  }

  let phase = 0;
  const firePellet = (x: number, y: number, z: number, tx: number, ty: number, tz: number, dmg: number) => {
    const i = phead; phead = (phead + 1) % PELLET;
    const dx = tx - x, dy = ty - y, dz = tz - z, d = Math.hypot(dx, dy, dz) || 1;
    const sp = 70;
    pst[i] = { x, y, z, vx: dx / d * sp, vy: dy / d * sp, vz: dz / d * sp, life: 2.2, dmg };
  };

  return {
    setPhase(n) {
      if (n <= phase) return null;
      phase = n;
      // the city lets a little void be — trouble starts at GOBBLER
      if (n === 2) { spawn('police', 2, 6, 28, 2); return '🚔 POLICE RESPONSE'; }
      if (n === 3) { spawn('jeep', 2, 10, 32, 3); spawn('tank', 2, 18, 20, 6); return '🪖 THE ARMY ROLLS IN'; }
      if (n >= 4) { spawn('heli', 3, 24, 40, 5); return '🚁 AIR SUPPORT INBOUND'; }
      return null;
    },
    update(dt, vx, vz, vR) {
      let delta = 0;
      for (let u = units.length - 1; u >= 0; u--) {
        const un = units[u];
        const dx = vx - un.x, dz = vz - un.z, d = Math.hypot(dx, dz) || 1;
        // devoured by a big void
        if (d < vR + 3) { scene.remove(un.g); units.splice(u, 1); delta += un.value; fx.ring(vx, vz, 0xffe08a, vR * 1.4, 0.4); continue; }
        // approach (helis hover at range; ground units slide on island)
        const stop = un.kind === 'heli' ? 60 : vR + 22;
        if (d > stop) {
          const nx = un.x + dx / d * un.speed * dt, nz = un.z + dz / d * un.speed * dt;
          if (un.kind === 'heli' || biomeAt(nx, nz)) { un.x = nx; un.z = nz; }
          else {
            // slide around water — but only onto LAND (the old slide was
            // unvalidated and marched tanks straight into the sea)
            const sx = un.x + (dz / d) * un.speed * dt * 0.6, sz = un.z + (-dx / d) * un.speed * dt * 0.6;
            if (biomeAt(sx, sz)) { un.x = sx; un.z = sz; }
          }
        }
        un.g.position.set(un.x, un.y, un.z);
        un.g.rotation.y = Math.atan2(-dz, dx);   // nose +X faces the void
        if (un.g.userData.rotor) un.g.userData.rotor.rotation.y += dt * 40;
        if (un.g.userData.light) (un.g.userData.light.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.3 + 0.5 * Math.abs(Math.sin(performance.now() / 200));
        // fire
        un.fireCd -= dt;
        if (un.fireCd <= 0 && d < 130) { un.fireCd = un.kind === 'tank' ? 2.6 : 1.6; firePellet(un.x, un.y + 2, un.z, vx, vR * 0.5, vz, un.dmg); }
      }
      // pellets
      for (let i = 0; i < PELLET; i++) {
        const p = pst[i];
        if (p.life <= 0) continue;
        p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
        const hd = Math.hypot(p.x - vx, p.z - vz);
        if (hd < vR + 1 && Math.abs(p.y - vR * 0.5) < vR) {
          // a bonk, not a jump-scare: tiny shake, no full-screen red flash
          p.life = 0; p.y = -999; delta -= p.dmg; fx.shake(0.9);
        }
        if (p.life <= 0) p.y = -999;
        dummy.position.set(p.x, p.y, p.z); dummy.updateMatrix(); pellets.setMatrixAt(i, dummy.matrix);
      }
      pellets.instanceMatrix.needsUpdate = true;
      return delta;
    },
  };
}
