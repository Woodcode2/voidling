// What makes the island ALIVE — the 2D "feel recipe" ported to 3D: everything is
// on a leash (people/animals wander a tether), on a track (cars on road lanes,
// the train on a rail loop), or hunting you — and everything flees when the void
// looms. Each mover is also an edible; the host's eat loop takes over once a
// mover is captured (flagged via mesh.userData.eaten), so life stops steering it.
import * as THREE from 'three';
import { PROPS } from './palette';
import {
  worldTo3D as w, ROAD_CENTERS_3D, blockCenter3D, PLAN_GRID, HALF_BLOCK_3D,
  railPointAt, type Biome, type AddEdible,
} from './island';

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
const setShadow = (m: THREE.Object3D) => m.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });

interface Mover {
  mesh: THREE.Object3D;
  update(dt: number, t: number, vx: number, vz: number, vR: number): void;
}

export interface Life { update(dt: number, t: number, vx: number, vz: number, vR: number): void; }

// ── mesh factories ─────────────────────────────────────────────────────────────
function makeCar(): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(6.2, 2.2, 3),
    new THREE.MeshStandardMaterial({ color: pick(PROPS.car), roughness: 0.4, metalness: 0.15, flatShading: true }));
  body.position.y = 1.6; g.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.7, 2.6),
    new THREE.MeshStandardMaterial({ color: PROPS.carGlass, roughness: 0.2, metalness: 0.3 }));
  cabin.position.set(-0.4, 2.9, 0); g.add(cabin);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x20242c, roughness: 0.9 });
  for (const sx of [-1.9, 1.9]) for (const sz of [-1.4, 1.4]) {
    const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.6, 10), wheelMat);
    wh.rotation.x = Math.PI / 2; wh.position.set(sx, 0.85, sz); g.add(wh);
  }
  return g;
}
function makePerson(): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.85, 1.7, 3, 8),
    new THREE.MeshStandardMaterial({ color: pick(PROPS.person), roughness: 0.85 }));
  body.position.y = 1.8; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.8, 12, 10),
    new THREE.MeshStandardMaterial({ color: pick(PROPS.skin), roughness: 0.75 }));
  head.position.y = 3.3; g.add(head);
  return g;
}
function makeAnimal(): THREE.Group {
  const g = new THREE.Group();
  const col = pick([0xf2d06b, 0xe08a5a, 0xdedede, 0x8a8a8a, 0xf0a0c0, 0x6a5a4a]);
  const body = new THREE.Mesh(new THREE.SphereGeometry(1.6, 12, 10),
    new THREE.MeshStandardMaterial({ color: col, roughness: 0.85, flatShading: true }));
  body.scale.set(1.5, 1, 1); body.position.y = 1.6; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8),
    new THREE.MeshStandardMaterial({ color: col, roughness: 0.85, flatShading: true }));
  head.position.set(2, 2.2, 0); g.add(head);
  for (const sx of [-1.2, 1.2]) for (const sz of [-0.8, 0.8]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 1.4, 6),
      new THREE.MeshStandardMaterial({ color: col, roughness: 0.9 }));
    leg.position.set(sx, 0.7, sz); g.add(leg);
  }
  return g;
}
function makeBird(): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: pick([0xffffff, 0x33384a, 0xf0f0f0]), roughness: 0.7, flatShading: true, side: THREE.DoubleSide });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.6, 8, 6), mat); g.add(body);
  for (const s of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.ConeGeometry(0.5, 2.2, 4), mat);
    wing.rotation.z = s * Math.PI / 2; wing.position.x = s * 1.2; g.add(wing);
  }
  return g;
}
function makeLoco(isLoco: boolean): THREE.Group {
  const g = new THREE.Group();
  const col = isLoco ? 0x5a3aa0 : pick([0xd85a5a, 0x5ab0d8, 0xf0c050]);
  const body = new THREE.Mesh(new THREE.BoxGeometry(7, 3.2, 3.4),
    new THREE.MeshStandardMaterial({ color: col, roughness: 0.55, metalness: 0.2, flatShading: true }));
  body.position.y = 2.4; g.add(body);
  if (isLoco) {
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2, 3.2),
      new THREE.MeshStandardMaterial({ color: 0x3a2470, roughness: 0.5 }));
    cab.position.set(-1.8, 4.4, 0); g.add(cab);
    const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 1.4, 8),
      new THREE.MeshStandardMaterial({ color: 0x2a2440 }));
    chimney.position.set(2, 4.4, 0); g.add(chimney);
  }
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1a1a22, roughness: 0.9 });
  for (const sx of [-2, 0, 2]) for (const sz of [-1.7, 1.7]) {
    const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.5, 10), wheelMat);
    wh.rotation.x = Math.PI / 2; wh.position.set(sx, 0.8, sz); g.add(wh);
  }
  return g;
}

const eaten = (m: THREE.Object3D) => m.userData.eaten || !m.visible;

export function createLife(
  scene: THREE.Scene,
  addEdible: AddEdible,
  biomeAt: (x: number, z: number) => Biome | null,
): Life {
  const movers: Mover[] = [];

  // ── cars: grid-locked lanes ──────────────────────────────────────────────
  const LANE = 2.6;   // offset from road centre for right-hand traffic
  for (let i = 0; i < 30; i++) {
    const mesh = makeCar();
    const horiz = Math.random() < 0.5;
    const centre = pick(ROAD_CENTERS_3D);
    const dir = Math.random() < 0.5 ? 1 : -1;
    const laneOff = dir * LANE * (horiz ? 1 : -1);
    let along = rand(-230, 230);
    const speed = rand(14, 22);
    const st = { axis: horiz ? 'h' : 'v' as 'h' | 'v', dir, centre, along, laneOff, speed, turnCd: 0 };
    // place
    if (st.axis === 'h') mesh.position.set(along, 0, centre + laneOff);
    else mesh.position.set(centre + laneOff, 0, along);
    mesh.rotation.y = st.axis === 'h' ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (dir > 0 ? 0 : Math.PI);
    setShadow(mesh); scene.add(mesh); addEdible(mesh, 4);
    movers.push({
      mesh,
      update(dt, _t, vx, vz, vR) {
        if (eaten(mesh)) return;
        st.turnCd = Math.max(0, st.turnCd - dt);
        // flee: if void near, drive away fast along the axis
        const dx = mesh.position.x - vx, dz = mesh.position.z - vz;
        const dist = Math.hypot(dx, dz);
        let spd = st.speed;
        if (dist < vR + 26) {
          spd = st.speed * 2.1;
          const axisComp = st.axis === 'h' ? dx : dz;
          st.dir = axisComp >= 0 ? 1 : -1;
        }
        st.along += st.dir * spd * dt;
        // reverse at the island edge
        const nx = st.axis === 'h' ? st.along : st.centre + st.laneOff;
        const nz = st.axis === 'h' ? st.centre + st.laneOff : st.along;
        if (!biomeAt(nx, nz) && Math.abs(st.along) > 40) { st.dir *= -1; st.along += st.dir * spd * dt * 2; }
        // occasional junction turn
        if (st.turnCd === 0) for (const rc of ROAD_CENTERS_3D) {
          if (Math.abs(st.along - rc) < 3 && Math.random() < 0.5) {
            const newAlong = st.centre; st.centre = rc;
            st.axis = st.axis === 'h' ? 'v' : 'h';
            st.along = newAlong; st.laneOff = st.dir * LANE * (st.axis === 'h' ? 1 : -1);
            st.turnCd = 2.5; break;
          }
        }
        if (st.axis === 'h') { mesh.position.set(st.along, 0, st.centre + st.laneOff); mesh.rotation.y = st.dir > 0 ? Math.PI / 2 : -Math.PI / 2; }
        else { mesh.position.set(st.centre + st.laneOff, 0, st.along); mesh.rotation.y = st.dir > 0 ? 0 : Math.PI; }
      },
    });
  }

  // ── pedestrians: wander on a tether, flee the void ───────────────────────
  function addWanderer(mesh: THREE.Object3D, hx: number, hz: number, tether: number, base: number, fear: number, radius: number) {
    let ang = rand(0, Math.PI * 2), hop = 0;
    mesh.position.set(hx, 0, hz); setShadow(mesh); scene.add(mesh); addEdible(mesh, radius);
    movers.push({
      mesh,
      update(dt, _t, vx, vz, vR) {
        if (eaten(mesh)) return;
        const dx = mesh.position.x - vx, dz = mesh.position.z - vz;
        const dist = Math.hypot(dx, dz);
        let spd = base;
        if (dist < vR + fear) { ang = Math.atan2(dz, dx); spd = base * 3.4; hop = 0.5; }   // flee
        else {
          ang += rand(-1, 1) * dt * 3;
          const hd = Math.hypot(mesh.position.x - hx, mesh.position.z - hz);
          if (hd > tether) ang = Math.atan2(hz - mesh.position.z, hx - mesh.position.x);
        }
        const nx = mesh.position.x + Math.cos(ang) * spd * dt;
        const nz = mesh.position.z + Math.sin(ang) * spd * dt;
        if (biomeAt(nx, nz)) { mesh.position.x = nx; mesh.position.z = nz; }
        else ang += Math.PI;
        mesh.rotation.y = -ang + Math.PI / 2;
        if (hop > 0) { hop -= dt; mesh.position.y = Math.abs(Math.sin(hop * 12)) * 0.8; } else mesh.position.y = 0;
      },
    });
  }
  // scatter pedestrians across walkable biomes
  const pedZones: Biome[] = ['cozy', 'fancy', 'park', 'beach', 'plaza'];
  for (let gy = 0; gy < 6; gy++) for (let gx = 0; gx < 6; gx++) {
    if (!pedZones.includes(PLAN_GRID[gy][gx])) continue;
    const [cx, cz] = blockCenter3D(gx, gy);
    const n = PLAN_GRID[gy][gx] === 'beach' ? 3 : 2;
    for (let i = 0; i < n; i++) {
      const hx = cx + rand(-HALF_BLOCK_3D * 0.7, HALF_BLOCK_3D * 0.7);
      const hz = cz + rand(-HALF_BLOCK_3D * 0.7, HALF_BLOCK_3D * 0.7);
      addWanderer(makePerson(), hx, hz, 22, rand(4, 7), 30, 2.4);
    }
  }

  // ── zoo animals: wander clamped near the pen ──────────────────────────────
  {
    const [zx, zz] = blockCenter3D(5, 1);
    for (let i = 0; i < 6; i++) {
      const hx = zx + rand(-HALF_BLOCK_3D * 0.6, HALF_BLOCK_3D * 0.6);
      const hz = zz + rand(-HALF_BLOCK_3D * 0.6, HALF_BLOCK_3D * 0.6);
      addWanderer(makeAnimal(), hx, hz, HALF_BLOCK_3D * 0.55, rand(3, 5), 22, 3);
    }
  }

  // ── birds: flocks that drift and scatter, up in the air ──────────────────
  for (let f = 0; f < 3; f++) {
    const cx = rand(-180, 180), cz = rand(-180, 180), fly = rand(18, 30);
    for (let i = 0; i < 4; i++) {
      const mesh = makeBird();
      let ang = rand(0, Math.PI * 2);
      const ox = cx + rand(-10, 10), oz = cz + rand(-10, 10);
      mesh.position.set(ox, fly, oz); setShadow(mesh); scene.add(mesh); addEdible(mesh, 2);
      const home = { x: cx, z: cz };
      movers.push({
        mesh,
        update(dt, t, vx, vz, vR) {
          if (eaten(mesh)) return;
          const dx = mesh.position.x - vx, dz = mesh.position.z - vz;
          const dist = Math.hypot(dx, dz);
          let spd = 10;
          if (dist < vR + 40) { ang = Math.atan2(dz, dx); spd = 26; }
          else { ang += rand(-1, 1) * dt * 2; if (Math.hypot(mesh.position.x - home.x, mesh.position.z - home.z) > 70) ang = Math.atan2(home.z - mesh.position.z, home.x - mesh.position.x); }
          mesh.position.x += Math.cos(ang) * spd * dt;
          mesh.position.z += Math.sin(ang) * spd * dt;
          mesh.position.y = fly + Math.sin(t * 3 + i) * 1.5;
          mesh.rotation.y = -ang + Math.PI / 2;
          const flap = 0.5 + Math.sin(t * 14 + i) * 0.5;
          mesh.children.forEach((c, ci) => { if (ci > 0) c.rotation.x = flap; });
        },
      });
    }
  }

  // ── the train: loco + 3 cars on the rail loop around downtown ─────────────
  const CAR_GAP = 0.028;
  let trainGrp: THREE.Group | null = null;
  let trainCars: THREE.Group[] = [];
  let trainT = 0, respawn = 0;
  function buildTrain() {
    const grp = new THREE.Group(); scene.add(grp);
    const cars: THREE.Group[] = [];
    for (let i = 0; i < 4; i++) { const c = makeLoco(i === 0); grp.add(c); cars.push(c); }
    setShadow(grp); addEdible(grp, 8);
    trainGrp = grp; trainCars = cars; trainT = rand(0, 1);
  }
  buildTrain();
  movers.push({
    get mesh() { return trainGrp!; },
    update(dt, _t, _vx, _vz, _vR) {
      if (!trainGrp) return;
      if (eaten(trainGrp)) {
        respawn += dt;
        if (respawn > 6) { respawn = 0; trainGrp = null; buildTrain(); }
        return;
      }
      trainT = (trainT + dt * 0.02) % 1;
      const lead = railPointAt(trainT);
      trainGrp.position.set(lead.x, 0, lead.z);
      for (let i = 0; i < trainCars.length; i++) {
        const p = railPointAt(trainT - i * CAR_GAP);
        trainCars[i].position.set(p.x - lead.x, 0, p.z - lead.z);
        trainCars[i].rotation.y = p.angle;
      }
    },
  } as Mover);

  return {
    update(dt, t, vx, vz, vR) {
      for (const m of movers) m.update(dt, t, vx, vz, vR);
    },
  };
}
