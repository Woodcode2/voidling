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
}

const NAMES = ['MUNCHER', 'GOBBLER', 'NOMLET', 'CHOMPZILLA', 'GULPY'];
const COLORS = [0x2fd8c0, 0xff6fb0, 0xff9a3a, 0x7ed57a, 0x4d8ff0];
const rand = (a: number, b: number) => a + Math.random() * (b - a);
// must match the player model (2D game constants through the 0.05 map scale)
const EAT_RATIO = 1.11, R_CAP = 12, START_R = 0.9, LAW_RATE = 0.030;
const growR = (R: number, eR: number) => {
  const rookie = R < 1.7 ? 1.6 : R < 2.5 ? 1.3 : 1;
  const diminish = Math.sqrt(START_R / Math.max(START_R, R));
  return Math.min(R_CAP, Math.sqrt(R * R + 0.6 * eR * eR * rookie * diminish));
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
    const white = new THREE.Mesh(new THREE.CircleGeometry(0.2, 20), new THREE.MeshBasicMaterial({ color: 0xffffff, depthWrite: false }));
    white.position.set(sx, 0.08, 1.0);
    const pupil = new THREE.Mesh(new THREE.CircleGeometry(0.11, 16), new THREE.MeshBasicMaterial({ color: 0x140a26, depthWrite: false }));
    pupil.position.set(sx, 0.08, 1.02);
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
  interface R extends Rival { group: THREE.Group; eyes: THREE.Group; halo: THREE.Mesh; tx: number; tz: number; retarget: number; joinAt: number; joined: boolean; }
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
      joinAt: JOIN_TIMES[i % JOIN_TIMES.length], joined: false });
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
        // AI: retarget to nearest food (or flee a much bigger player)
        rv.retarget -= dt;
        const dpx = rv.x - px, dpz = rv.z - pz, dp = Math.hypot(dpx, dpz);
        const fleeing = pr > rv.r * 1.15 && dp < pr + 40;
        if (fleeing) { rv.tx = rv.x + dpx; rv.tz = rv.z + dpz; }
        else if (rv.retarget <= 0) {
          rv.retarget = rand(0.8, 1.6);
          let best: RivalEdible | null = null, bd = Infinity;
          for (const e of edibles) {
            if (eaten(e.mesh) || e.radius > rv.r * EAT_RATIO) continue;   // only hunt what it can eat
            const d = (e.mesh.position.x - rv.x) ** 2 + (e.mesh.position.z - rv.z) ** 2;
            if (d < bd) { bd = d; best = e; }
          }
          if (best) { rv.tx = best.mesh.position.x; rv.tz = best.mesh.position.z; }
          else { rv.tx = rand(-200, 200); rv.tz = rand(-200, 200); }
        }
        // move toward target (stay on island)
        const mx = rv.tx - rv.x, mz = rv.tz - rv.z, md = Math.hypot(mx, mz) || 1;
        const spd = (fleeing ? 34 : 22) * dt;
        const nx = rv.x + (mx / md) * spd, nz = rv.z + (mz / md) * spd;
        if (biomeAt(nx, nz)) { rv.x = nx; rv.z = nz; } else rv.retarget = 0;

        // eat nearby food (size-gated) -> grow by area + score
        for (const e of edibles) {
          if (eaten(e.mesh) || e.radius > rv.r * EAT_RATIO) continue;
          const dx = e.mesh.position.x - rv.x, dz = e.mesh.position.z - rv.z;
          if (dx * dx + dz * dz < (rv.r + e.radius) ** 2) {
            e.mesh.userData.eaten = true; e.mesh.visible = false; scene.remove(e.mesh);
            rv.score += Math.max(1, Math.round(e.radius * 12));   // same points scale as the player
            rv.r = growR(rv.r, e.radius);
          }
        }

        // render
        rv.group.position.set(rv.x, rv.r * 0.9, rv.z);
        rv.group.scale.setScalar(rv.r);
        rv.eyes.quaternion.copy(camera.quaternion);
        // look toward travel dir
        rv.eyes.children.forEach((c) => { c.position.x = (c.position.x < 0 ? -0.32 : 0.32) + THREE.MathUtils.clamp(mx / md * 0.06, -0.06, 0.06); });
        rv.halo.position.set(rv.x, 0.07, rv.z); rv.halo.scale.setScalar(rv.r * 1.5);
        void tmp;
      }
    },
  };
  return api;
}
