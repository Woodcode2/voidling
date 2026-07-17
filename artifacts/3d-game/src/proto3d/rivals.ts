// Rival voids — the AI "family". They roam the island, eat from the SAME food
// pool as the player, and grow. Whoever consumes the most by the final whistle
// wins — so a rival really can beat you. Each is a cute coloured void (a tinted
// fresnel orb + glow + billboarded eyes) with a name and a live score.
import * as THREE from 'three';
import type { Biome } from './island';

export interface RivalEdible { mesh: THREE.Object3D; radius: number; }
export interface Rival { name: string; color: number; score: number; x: number; z: number; r: number; }
export interface Rivals {
  list: Rival[];
  update(dt: number, t: number, playerX: number, playerZ: number, playerR: number): void;
  onJoin?: (name: string, color: number, x: number, z: number) => void;
  onRivalEaten?: (name: string, pts: number) => void;    // you swallowed one
  onPlayerBitten?: (name: string) => void;               // one bit YOU
}

const NAMES = ['MUNCHER', 'GOBBLER', 'NOMLET', 'CHOMPZILLA', 'GULPY'];
const COLORS = [0x2fd8c0, 0xff6fb0, 0xff9a3a, 0x7ed57a, 0x4d8ff0];
const rand = (a: number, b: number) => a + Math.random() * (b - a);
// must match the player model (2D game constants through the 0.05 map scale)
const EAT_RATIO = 1.11, R_CAP = 12, START_R = 0.9, LAW_RATE = 0.025;
const growR = (R: number, eR: number) => {
  const rookie = R < 1.7 ? 1.6 : R < 2.5 ? 1.3 : 1;
  const diminish = Math.sqrt(START_R / Math.max(START_R, R));
  return Math.min(R_CAP, Math.sqrt(R * R + 0.5 * eR * eR * rookie * diminish));
};

function makeRivalMesh(color: number): { group: THREE.Group; eyes: THREE.Group; halo: THREE.Mesh } {
  const group = new THREE.Group();
  const col = new THREE.Color(color);
  // tinted fresnel body: dark core -> coloured rim (same idea as the player void)
  const bodyMat = new THREE.ShaderMaterial({
    uniforms: { uCol: { value: col }, uDark: { value: new THREE.Color(0x140a26) } },
    vertexShader: `varying vec3 vN; varying vec3 vV;
      void main(){ vN=normalize(normalMatrix*normal); vec4 mv=modelViewMatrix*vec4(position,1.); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `varying vec3 vN; varying vec3 vV; uniform vec3 uCol; uniform vec3 uDark;
      void main(){ float d=clamp(dot(normalize(vN),normalize(vV)),0.,1.); float u=sqrt(max(0.,1.-d*d));
        vec3 c=mix(uDark, uCol, smoothstep(0.15,0.95,u)); c+=uCol*pow(u,3.5)*0.4; gl_FragColor=vec4(c,1.); }`,
  });
  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 30), bodyMat); group.add(body);
  const glow = new THREE.Mesh(new THREE.SphereGeometry(1.08, 32, 24), new THREE.ShaderMaterial({
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.BackSide,
    uniforms: { uCol: { value: col } },
    vertexShader: `varying vec3 vN; varying vec3 vV; void main(){ vN=normalize(normalMatrix*normal); vec4 mv=modelViewMatrix*vec4(position,1.); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `varying vec3 vN; varying vec3 vV; uniform vec3 uCol; void main(){ float f=pow(1.-abs(dot(normalize(vN),normalize(vV))),4.); gl_FragColor=vec4(uCol,f*0.55); }`,
  }));
  group.add(glow);
  // billboarded eyes
  const eyes = new THREE.Group(); group.add(eyes);
  for (const sx of [-0.32, 0.32]) {
    // depthTest off + renderOrder: billboarded circles can never slice into the
    // body sphere at steep camera angles (the "glitchy half-buried eyes")
    const white = new THREE.Mesh(new THREE.CircleGeometry(0.2, 20), new THREE.MeshBasicMaterial({ color: 0xffffff, depthWrite: false, depthTest: false }));
    white.position.set(sx, 0.08, 1.0); white.renderOrder = 5;
    const pupil = new THREE.Mesh(new THREE.CircleGeometry(0.11, 16), new THREE.MeshBasicMaterial({ color: 0x140a26, depthWrite: false, depthTest: false }));
    pupil.position.set(sx, 0.08, 1.02); pupil.renderOrder = 6;
    eyes.add(white); eyes.add(pupil);
  }
  const halo = new THREE.Mesh(new THREE.CircleGeometry(1, 32), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false }));
  halo.rotation.x = -Math.PI / 2; halo.position.y = 0.07;
  return { group, eyes, halo };
}

export function createRivals(
  scene: THREE.Scene,
  camera: THREE.Camera,
  edibles: RivalEdible[],
  biomeAt: (x: number, z: number) => Biome | null,
  count = 4,
): Rivals {
  interface R extends Rival { group: THREE.Group; eyes: THREE.Group; halo: THREE.Mesh; tx: number; tz: number; retarget: number; joinAt: number; joined: boolean; stall: number; ph: number; pulse: number; vx: number; vz: number; biteCd: number; respawnT: number; }
  const rivals: R[] = [];
  const eaten = (m: THREE.Object3D) => m.userData.eaten || !m.visible;
  const JOIN_TIMES = [4, 30, 65, 105, 145];   // the family arrives one by one

  for (let i = 0; i < count; i++) {
    const color = COLORS[i % COLORS.length];
    const { group, eyes, halo } = makeRivalMesh(color);
    scene.add(group); scene.add(halo);
    group.visible = halo.visible = false;   // hidden until they join the feast
    // spread rivals around the island away from the player start
    const ang = (i / count) * Math.PI * 2 + 0.6;
    rivals.push({ name: NAMES[i % NAMES.length], color, score: 0, r: START_R, group, eyes, halo,
      x: Math.cos(ang) * 150, z: Math.sin(ang) * 150, tx: 0, tz: 0, retarget: 0,
      joinAt: JOIN_TIMES[i % JOIN_TIMES.length], joined: false, stall: 0, ph: rand(0, 6), pulse: 0,
      vx: 0, vz: 0, biteCd: 0, respawnT: 0 });
  }

  const tmp = new THREE.Vector3();
  const api: Rivals = {
    list: rivals,
    update(dt, _t, px, pz, pr) {
      const lawCap = START_R + LAW_RATE * _t;   // rivals obey the growth law too
      for (const rv of rivals) {
        if (!rv.joined) {
          if (_t >= rv.joinAt) {
            rv.joined = true;
            rv.group.visible = rv.halo.visible = true;
            api.onJoin?.(rv.name, rv.color, rv.x, rv.z);
          } else continue;   // not on the island yet
        }
        if (rv.r > lawCap) rv.r = lawCap;
        // knocked out after being devoured: respawn small on the far coast
        if (rv.respawnT > 0) {
          rv.respawnT -= dt;
          if (rv.respawnT <= 0) {
            const a2 = rand(0, Math.PI * 2);
            rv.x = Math.cos(a2) * 140; rv.z = Math.sin(a2) * 140;
            if (!biomeAt(rv.x, rv.z)) { rv.x *= 0.6; rv.z *= 0.6; }
            rv.group.visible = rv.halo.visible = true; rv.pulse = 1;
          } else continue;
        }
        rv.biteCd = Math.max(0, rv.biteCd - dt);
        // AI: STICKY targeting — commit to a snack until it's gone/reached,
        // flee a much bigger player, and contest the player's size directly
        rv.retarget -= dt;
        const dpx = rv.x - px, dpz = rv.z - pz, dp = Math.hypot(dpx, dpz);
        const fleeing = pr > rv.r * 1.15 && dp < pr + 40;
        const reached = Math.hypot(rv.tx - rv.x, rv.tz - rv.z) < 2.5;
        if (fleeing) { rv.tx = rv.x + dpx; rv.tz = rv.z + dpz; }
        else if (rv.retarget <= 0 || reached) {
          rv.retarget = rand(2.5, 4);
          let best: RivalEdible | null = null, bd = Infinity;
          for (const e of edibles) {
            if (eaten(e.mesh) || e.radius > rv.r * EAT_RATIO) continue;   // only hunt what it can eat
            const d = (e.mesh.position.x - rv.x) ** 2 + (e.mesh.position.z - rv.z) ** 2;
            if (d < bd) { bd = d; best = e; }
          }
          if (best) { rv.tx = best.mesh.position.x; rv.tz = best.mesh.position.z; }
          else { const a3 = rand(0, Math.PI * 2); rv.tx = Math.cos(a3) * rand(40, 170); rv.tz = Math.sin(a3) * rand(40, 170); }
        }
        // SMOOTHED motion (no more teleporty slides) + coast handling
        const mx = rv.tx - rv.x, mz = rv.tz - rv.z, md = Math.hypot(mx, mz) || 1;
        const spdSec = (fleeing ? 34 : 22) * Math.min(2.1, Math.pow(rv.r / START_R, 0.5));
        rv.vx += ((mx / md) * spdSec - rv.vx) * Math.min(1, dt * 5);
        rv.vz += ((mz / md) * spdSec - rv.vz) * Math.min(1, dt * 5);
        const spd = Math.hypot(rv.vx, rv.vz) * dt;
        const nx = rv.x + rv.vx * dt, nz = rv.z + rv.vz * dt;
        let movedOk = false;
        if (biomeAt(nx, nz)) { rv.x = nx; rv.z = nz; movedOk = true; }
        else {
          const sx = -(mz / md), sz = mx / md;   // slide directions along the wall
          if (biomeAt(rv.x + sx * spd, rv.z + sz * spd)) { rv.x += sx * spd; rv.z += sz * spd; movedOk = true; }
          else if (biomeAt(rv.x - sx * spd, rv.z - sz * spd)) { rv.x -= sx * spd; rv.z -= sz * spd; movedOk = true; }
        }
        rv.stall = movedOk ? Math.max(0, rv.stall - dt * 2) : rv.stall + dt;
        if (rv.stall > 0.8) {   // pinned in a corner: abandon target, wander inland
          rv.stall = 0; rv.retarget = rand(1.2, 2.2);
          const inland = Math.atan2(-rv.z, -rv.x) + rand(-0.9, 0.9);
          rv.tx = rv.x + Math.cos(inland) * rand(50, 110);
          rv.tz = rv.z + Math.sin(inland) * rand(50, 110);
        }
        // ── hole-vs-hole: the danger loop ─────────────────────────────────────
        if (pr > rv.r * 1.2 && dp < pr * 0.8) {
          // the player swallows this rival whole — out for 6s, respawns small
          const pts = Math.round(25 + rv.r * 15);
          rv.group.visible = rv.halo.visible = false;
          rv.respawnT = 6; rv.r = START_R; rv.vx = rv.vz = 0;
          api.onRivalEaten?.(rv.name, pts);
          continue;
        }
        if (rv.r > pr * 1.2 && dp < rv.r * 0.85 && rv.biteCd <= 0) {
          rv.biteCd = 9; rv.pulse = 1;
          api.onPlayerBitten?.(rv.name);
        }

        // eat nearby food (size-gated) -> grow by area + score
        for (const e of edibles) {
          if (eaten(e.mesh) || e.radius > rv.r * EAT_RATIO) continue;
          const dx = e.mesh.position.x - rv.x, dz = e.mesh.position.z - rv.z;
          if (dx * dx + dz * dz < (rv.r + e.radius) ** 2) {
            e.mesh.userData.eaten = true; e.mesh.visible = false; scene.remove(e.mesh);
            rv.score += Math.max(1, Math.round(e.radius * 12));   // same points scale as the player
            rv.r = growR(rv.r, e.radius);
            rv.pulse = 1;   // visible gulp — the family EATS, not just exists
          }
        }

        // render — alive: a little roll-hop while moving, a squash-gulp on eats
        rv.pulse = Math.max(0, rv.pulse - dt * 3);
        const hopA = Math.abs(Math.sin(_t * 5 + rv.ph)) * (movedOk ? 0.07 : 0.02);
        const sq = 1 + rv.pulse * 0.2;
        rv.group.position.set(rv.x, rv.r * (0.9 + hopA), rv.z);
        rv.group.scale.set(rv.r / Math.sqrt(sq), rv.r * sq, rv.r / Math.sqrt(sq));
        rv.eyes.quaternion.copy(camera.quaternion);
        // look toward travel dir
        rv.eyes.children.forEach((c) => { c.position.x = (c.position.x < 0 ? -0.32 : 0.32) + THREE.MathUtils.clamp(mx / md * 0.06, -0.06, 0.06); });
        rv.halo.position.set(rv.x, 0.14, rv.z); rv.halo.scale.setScalar(rv.r * 1.5);
        void tmp;
      }
    },
  };
  return api;
}
