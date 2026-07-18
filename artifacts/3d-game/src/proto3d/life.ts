// What makes the island ALIVE — the 2D "feel recipe" ported to 3D: everything is
// on a leash (people/animals wander a tether), on a track (cars on road lanes,
// the train on a rail loop), or hunting you — and everything flees + SHOUTS when
// the void looms. Plus staged vignette events (mayor, campsite, golf, beach
// volleyball) with biome-flavoured speech bubbles. Each mover is also an edible;
// the host's eat loop takes over once a mover is captured (mesh.userData.eaten).
import * as THREE from 'three';
import { PROPS } from './palette';
import {
  ROAD_CENTERS_3D, blockCenter3D, PLAN_GRID, HALF_BLOCK_3D,
  railPointAt, insideIsland3, type Biome, type AddEdible,
} from './island';
import { glb, vehicleGlb } from './assets3d';

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
const setShadow = (m: THREE.Object3D) => m.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });

export type Say = (pos: THREE.Vector3, text: string, kind: 'ambient' | 'panic' | 'event') => void;

// ── biome dialogue (from the 2D AMBIENT_BY_BIOME / PANIC_BY_BIOME pools) ─────────
const AMBIENT: Record<string, string[]> = {
  cozy: ['my hedge. my rules.', 'did you see the HOA email?', 'lawn\'s looking crisp', 'new mailbox day!', 'block party friday?', 'who let their dog out again', 'fresh cookies, anyone?', 'bin day tomorrow!', 'sprinklers at 6 sharp', 'love what you did with the roses'],
  fancy: ['the help is late again', 'my topiary won an award', 'is that valet parking?', 'darling, how gauche', 'we summer elsewhere, obviously', 'this fountain? imported.', 'the gala is SATURDAY', 'my third chandelier arrives today'],
  downtown: ['this commute is BRUTAL', 'rent here is CRIMINAL', 'need. more. coffee.', 'my startup\'s pre-seed', 'hustle never sleeps', 'meeting ran LONG', 'quarterly numbers look… fine', 'anyone else smell burning?', 'elevator\'s down AGAIN', 'lunch is a spreadsheet today'],
  park: ['lovely day for it', 'the ducks are rowdy', 'picnic o\'clock!', 'jog complete 💪', 'frisbee!', 'kite weather!!', '10k steps, easy', 'the gazebo band plays at noon', 'ice cream truck?! where!'],
  forest: ['so peaceful out here', 'was that a bird?', 'fresh piney air', 'love this trail', 'found the COOLEST rock', 's\'mores tonight!', 'trail mix is 90% chocolate', 'shhh… deer!', 'my boots are soaked'],
  beach: ['sunscreen me. NOW.', 'crab looked at me funny', 'best beach day EVER', 'wave check! 🌊', 'sandcastle masterpiece incoming', 'the tide stole my flip-flop', 'volleyball later?', 'ice cream then swim then ice cream', 'don\'t feed the seagulls!!', 'SPF one MILLION'],
  plaza: ['meet me by the fountain', 'downtown\'s buzzing', 'street food time', 'is there a rally?', 'the mayor\'s speaking today!', 'taco truck line is LONG', 'live music by the fountain!', 'market day is the best day'],
  zoo: ['the lions look hungry', 'popcorn! 🍿', 'look, flamingos!', 'the elephant waved at me!!', 'gift shop. NOW.', 'do NOT tap the glass', 'feeding time!!'],
};
const PANIC: Record<string, string[]> = {
  cozy: ['NOT my garden gnome!!', 'MY LAWN!!', 'save the HOA!!'],
  fancy: ['my ANTIQUES!!', 'the CHANDELIER!!', 'call my lawyer!!'],
  downtown: ['MY STARTUP!!', 'the WIFI\'S DOWN!!', 'not my oat-milk latte!!'],
  park: ['grab the frisbee, RUN!!', 'not the PICNIC!!', 'the DUCKS!!'],
  forest: ['BEAR?! no— WORSE!!', 'ABANDON TRAIL!!'],
  beach: ['SAVE THE COOLER!!', 'my SANDCASTLE!!', 'not the towels!!'],
  plaza: ['EVERYONE RUN!!', 'it\'s REAL!!', 'aaaah!!'],
  zoo: ['WHO OPENED THE PENS?!', 'the lions are LOOSE!!'],
  generic: ['tell my wife I love h—', 'AAAAH!!', 'RUN FOR IT!!', 'it\'s HUNGRY!!'],
};
const biomeKey = (b: Biome): string => (b === 'military' || b === 'airport') ? 'downtown' : b;

interface Mover { mesh: THREE.Object3D; update(dt: number, t: number, vx: number, vz: number, vR: number): void; }
export interface Life { update(dt: number, t: number, vx: number, vz: number, vR: number): void; }

// ── mesh factories ─────────────────────────────────────────────────────────────
function makeCar(): THREE.Group {
  const g = new THREE.Group();
  const col = pick(PROPS.car);
  const bodyMat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.32, metalness: 0.22 });
  // lower body with a distinct hood + trunk step (reads "car", not "brick")
  const body = new THREE.Mesh(new THREE.BoxGeometry(5.6, 1.4, 2.9), bodyMat);
  body.position.y = 1.25; g.add(body);
  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.0, 2.7), bodyMat);
  hood.position.set(2.6, 1.1, 0); g.add(hood);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.9, 1.35, 2.55),
    new THREE.MeshStandardMaterial({ color: PROPS.carGlass, roughness: 0.12, metalness: 0.4 }));
  cabin.position.set(-0.5, 2.55, 0); g.add(cabin);
  const roofM = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.18, 2.5), bodyMat);
  roofM.position.set(-0.5, 3.3, 0); g.add(roofM);
  // headlights + taillights
  const hl = new THREE.MeshStandardMaterial({ color: 0xfff2c8, emissive: 0xffe9a8, emissiveIntensity: 0.7, roughness: 0.3 });
  const tl = new THREE.MeshStandardMaterial({ color: 0xff4d4d, emissive: 0xd82a2a, emissiveIntensity: 0.55, roughness: 0.3 });
  for (const sz of [-0.95, 0.95]) {
    const a = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.34, 0.5), hl); a.position.set(3.36, 1.2, sz); g.add(a);
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.3, 0.45), tl); b.position.set(-2.82, 1.35, sz); g.add(b);
  }
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x20242c, roughness: 0.9 });
  const hubMat = new THREE.MeshStandardMaterial({ color: 0xc9cdd6, roughness: 0.4, metalness: 0.5 });
  for (const sx of [-1.8, 1.9]) for (const sz of [-1.45, 1.45]) {
    const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.5, 12), wheelMat);
    wh.rotation.x = Math.PI / 2; wh.position.set(sx, 0.8, sz); g.add(wh);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.54, 8), hubMat);
    hub.rotation.x = Math.PI / 2; hub.position.set(sx, 0.8, sz); g.add(hub);
  }
  // most of the fleet upgrades itself to the AI cars once the GLBs stream in
  if (Math.random() < 0.65) vehicleGlb(g, Math.random() < 0.72 ? 'car_sedan' : 'car_taxi', 6.2);
  return g;
}
interface Limbs { la: THREE.Object3D; ra: THREE.Object3D; ll: THREE.Object3D; rl: THREE.Object3D; phase: number; }

// shared material + geometry pools — hundreds of townsfolk, one GPU footprint
const _matCache = new Map<string, THREE.MeshStandardMaterial>();
function mat(color: number, roughness = 0.85): THREE.MeshStandardMaterial {
  const k = `${color}:${roughness}`;
  let m = _matCache.get(k);
  if (!m) { m = new THREE.MeshStandardMaterial({ color, roughness }); _matCache.set(k, m); }
  return m;
}
const G = {
  leg: new THREE.BoxGeometry(0.34, 1.15, 0.4),
  torso: new THREE.BoxGeometry(0.95, 1.15, 0.55),
  arm: new THREE.BoxGeometry(0.26, 1.0, 0.3),
  hand: new THREE.BoxGeometry(0.24, 0.22, 0.26),
  head: new THREE.SphereGeometry(0.52, 14, 12),
  cap: new THREE.SphereGeometry(0.55, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.55),
  brim: new THREE.CylinderGeometry(0.85, 0.85, 0.08, 12),
  beanie: new THREE.SphereGeometry(0.56, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5),
  pack: new THREE.BoxGeometry(0.7, 0.85, 0.35),
};

// what people WEAR is where they ARE — biome dress codes
const OUTFIT: Record<string, { shirt: number[]; pants: number[]; hat?: 'sun' | 'cap' | 'beanie'; hatOdds?: number; pack?: boolean }> = {
  beach: { shirt: [0xff8a5c, 0x4dd0e1, 0xffd54f, 0xff6f91, 0x7be8b0, 0xffffff], pants: [0xff5470, 0x2ab8d8, 0xffb347, 0x66de93], hat: 'sun', hatOdds: 0.5 },
  downtown: { shirt: [0x2e3a55, 0x3d4756, 0x545c6e, 0xffffff, 0xb9c6dd, 0x6e5c7a], pants: [0x232a3a, 0x2f2f38, 0x3a3f4d] },
  fancy: { shirt: [0x8a5cb8, 0xd8a848, 0xc65a78, 0x4a7a9a, 0xf0ead8], pants: [0x2a2a34, 0x4a3a5a, 0x5a4a3a] },
  park: { shirt: [0xffffff, 0xe8604d, 0x58c470, 0x4da3ff, 0xffd54f], pants: [0x3a4a6a, 0x2a2a34, 0x58c470], hat: 'cap', hatOdds: 0.45 },
  forest: { shirt: [0x5a7a4a, 0x8a6a4a, 0xc4693a, 0x7a8a5a], pants: [0x4a4a3a, 0x5a4a3a, 0x3a4a3a], hat: 'beanie', hatOdds: 0.6, pack: true },
  cozy: { shirt: [0xe8604d, 0x4d9de8, 0x58c470, 0xf0c050, 0xc65a9a, 0x7a6ae8], pants: [0x3a4a6a, 0x5a4a3a, 0x2a2a34, 0x6a3a4a, 0x3a5a4a] },
  zoo: { shirt: [0xf0c050, 0xe8604d, 0x4da3ff, 0xc8b088], pants: [0x3a4a6a, 0x8a7a5a], hat: 'cap', hatOdds: 0.3 },
  plaza: { shirt: [0xe8604d, 0x4d9de8, 0x58c470, 0xf0c050, 0xffffff, 0x9a6ae8], pants: [0x3a4a6a, 0x2a2a34, 0x5a4a3a] },
};

function makePerson(biome?: string, colOverride?: number): THREE.Group {
  // little character with real limbs + a walk cycle — dressed for their biome
  const g = new THREE.Group();
  const fit = OUTFIT[biome ?? 'cozy'] ?? OUTFIT.cozy;
  const shirt = mat(colOverride ?? pick(fit.shirt));
  const pants = mat(pick(fit.pants), 0.9);
  const skin = mat(pick(PROPS.skin), 0.75);
  const hair = mat(pick([0x2a2024, 0x6a4a2a, 0xd8b46a, 0x8a3a2a, 0x4a4a52, 0xe8e2d8]), 0.9);
  // legs (pivot at hip so they swing)
  const mkLeg = (sx: number) => {
    const hip = new THREE.Group(); hip.position.set(sx, 1.15, 0);
    const leg = new THREE.Mesh(G.leg, pants);
    leg.position.y = -0.57; hip.add(leg); g.add(hip); return hip;
  };
  const ll = mkLeg(-0.24), rl = mkLeg(0.24);
  // torso
  const torso = new THREE.Mesh(G.torso, shirt);
  torso.position.y = 1.75; g.add(torso);
  // arms (pivot at shoulder)
  const mkArm = (sx: number) => {
    const sh = new THREE.Group(); sh.position.set(sx, 2.2, 0);
    const arm = new THREE.Mesh(G.arm, shirt);
    arm.position.y = -0.5; sh.add(arm);
    const hand = new THREE.Mesh(G.hand, skin);
    hand.position.y = -1.05; sh.add(hand);
    g.add(sh); return sh;
  };
  const la = mkArm(-0.62), ra = mkArm(0.62);
  // head + hair cap
  const head = new THREE.Mesh(G.head, skin);
  head.position.y = 2.9; g.add(head);
  const cap = new THREE.Mesh(G.cap, hair);
  cap.position.y = 2.98; g.add(cap);
  // biome accessories: sun hats at the beach, caps in the park, beanies + packs on the trail
  if (fit.hat && Math.random() < (fit.hatOdds ?? 0.4)) {
    const hatCol = mat(pick([0xf6e3b8, 0xff6f91, 0xffffff, 0xe8604d, 0x4da3ff]), 0.9);
    if (fit.hat === 'sun') {
      const brim = new THREE.Mesh(G.brim, hatCol); brim.position.y = 3.18; g.add(brim);
      const top = new THREE.Mesh(G.beanie, hatCol); top.position.y = 3.1; g.add(top);
    } else if (fit.hat === 'cap') {
      const top = new THREE.Mesh(G.beanie, hatCol); top.position.y = 3.12; g.add(top);
      const bill = new THREE.Mesh(G.hand, hatCol); bill.scale.set(2.2, 0.35, 1.6); bill.position.set(0, 3.14, 0.55); g.add(bill);
    } else {
      const top = new THREE.Mesh(G.beanie, hatCol); top.scale.y = 1.25; top.position.y = 3.05; g.add(top);
    }
  }
  if (fit.pack && Math.random() < 0.7) {
    const pk = new THREE.Mesh(G.pack, mat(pick([0xc4693a, 0x4a7a9a, 0x8a5cb8]), 0.9));
    pk.position.set(0, 1.85, -0.48); g.add(pk);
  }
  g.userData.limbs = { la, ra, ll, rl, phase: Math.random() * 6 } as Limbs;
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
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2, 3.2), new THREE.MeshStandardMaterial({ color: 0x3a2470, roughness: 0.5 }));
    cab.position.set(-1.8, 4.4, 0); g.add(cab);
    const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 1.4, 8), new THREE.MeshStandardMaterial({ color: 0x2a2440 }));
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
  say: Say,
): Life {
  const movers: Mover[] = [];
  const peds: { mesh: THREE.Object3D; biome: string; panic: number }[] = [];

  // ── cars: grid-locked lanes with real arc turns ──────────────────────────
  // The car model's nose points +X, so heading comes from the velocity vector:
  // rotY = atan2(-vz, vx). (The old +Z-forward formula had every car rotated
  // 90° from its motion — the "driving on their side" bug.)
  const LANE = 2.6;
  const headingOf = (mvx: number, mvz: number) => Math.atan2(-mvz, mvx);
  // a car position is legal only ON the painted road network AND on the island —
  // no more sand cruises to the waterline or corners cut across lawns
  const onRoad = (x: number, z: number): boolean => {
    if (!biomeAt(x, z)) return false;
    for (const rc of ROAD_CENTERS_3D) if (Math.abs(x - rc) < 5.4 || Math.abs(z - rc) < 5.4) return true;
    return false;
  };
  interface Arc { p0x: number; p0z: number; p1x: number; p1z: number; p2x: number; p2z: number; u: number; len: number; }
  for (let i = 0; i < 30; i++) {
    const mesh = makeCar();
    const horiz = Math.random() < 0.5;
    const centre = pick(ROAD_CENTERS_3D);
    const dir = Math.random() < 0.5 ? 1 : -1;
    // spawn on land: an off-island 'along' leaves the car vibrating in the sea
    let along0 = rand(-230, 230);
    for (let k = 0; k < 10; k++) {
      const px0 = horiz ? along0 : centre, pz0 = horiz ? centre : along0;
      if (biomeAt(px0, pz0)) break;
      along0 = rand(-150, 150);
    }
    const st = {
      axis: horiz ? 'h' : 'v' as 'h' | 'v', dir, centre, along: along0,
      laneOff: dir * LANE * (horiz ? 1 : -1), speed: rand(14, 22), turnCd: rand(0, 2),
      arc: null as Arc | null, nAxis: 'h' as 'h' | 'v', nCentre: 0, nAlong: 0, nLaneOff: 0,
    };
    if (st.axis === 'h') mesh.position.set(st.along, 0, centre + st.laneOff); else mesh.position.set(centre + st.laneOff, 0, st.along);
    mesh.rotation.y = st.axis === 'h' ? headingOf(dir, 0) : headingOf(0, dir);
    setShadow(mesh); scene.add(mesh); addEdible(mesh, 4);
    movers.push({
      mesh,
      update(dt, _t, vx, vz, vR) {
        if (eaten(mesh)) return;
        // mid-turn: follow the bezier so nose and path always agree
        if (st.arc) {
          const a = st.arc;
          a.u = Math.min(1, a.u + (st.speed * dt) / a.len);
          const w = 1 - a.u;
          const px = w * w * a.p0x + 2 * w * a.u * a.p1x + a.u * a.u * a.p2x;
          const pz = w * w * a.p0z + 2 * w * a.u * a.p1z + a.u * a.u * a.p2z;
          // a turn that would carry the car off the road network (clipped road
          // stub near the coast) is cancelled — U-turn instead
          if (!biomeAt(px, pz)) { st.arc = null; st.dir *= -1; st.turnCd = 2; return; }
          const dxu = 2 * w * (a.p1x - a.p0x) + 2 * a.u * (a.p2x - a.p1x);
          const dzu = 2 * w * (a.p1z - a.p0z) + 2 * a.u * (a.p2z - a.p1z);
          mesh.position.set(px, 0, pz);
          mesh.rotation.y = headingOf(dxu, dzu);
          if (a.u >= 1) {
            st.arc = null; st.axis = st.nAxis; st.centre = st.nCentre; st.along = st.nAlong; st.laneOff = st.nLaneOff;
            // landed on a clipped road stub? bounce back onto the network
            if (!onRoad(mesh.position.x, mesh.position.z)) st.dir *= -1;
          }
          return;
        }
        st.turnCd = Math.max(0, st.turnCd - dt);
        const dx = mesh.position.x - vx, dz = mesh.position.z - vz;
        let spd = st.speed;
        if (Math.hypot(dx, dz) < vR + 26) { spd = st.speed * 2.1; const ac = st.axis === 'h' ? dx : dz; st.dir = ac >= 0 ? 1 : -1; }
        st.along += st.dir * spd * dt;
        const nx = st.axis === 'h' ? st.along : st.centre + st.laneOff;
        const nz = st.axis === 'h' ? st.centre + st.laneOff : st.along;
        const noseX = st.axis === 'h' ? nx + st.dir * 3.5 : nx;
        const noseZ = st.axis === 'h' ? nz : nz + st.dir * 3.5;
        if (!onRoad(nx, nz) || !biomeAt(noseX, noseZ)) { st.dir *= -1; st.along += st.dir * spd * dt * 2; }
        if (st.turnCd === 0) for (const rc of ROAD_CENTERS_3D) if (Math.abs(st.along - rc) < 5 && Math.random() < 0.5) {
          // set up a quarter-circle-ish bezier: current pos -> lane corner -> exit on the new lane
          const nAxis = st.axis === 'h' ? 'v' : 'h';
          const nLaneOff = st.dir * LANE * (nAxis === 'h' ? 1 : -1);
          const nAlong = st.centre + st.dir * 8;             // exit a little past the corner
          const p1x = st.axis === 'h' ? rc + nLaneOff : st.centre + st.laneOff;
          const p1z = st.axis === 'h' ? st.centre + st.laneOff : rc + nLaneOff;
          const p2x = nAxis === 'h' ? nAlong : rc + nLaneOff;
          const p2z = nAxis === 'h' ? rc + nLaneOff : nAlong;
          const len = Math.hypot(p1x - mesh.position.x, p1z - mesh.position.z) + Math.hypot(p2x - p1x, p2z - p1z);
          st.arc = { p0x: mesh.position.x, p0z: mesh.position.z, p1x, p1z, p2x, p2z, u: 0, len: Math.max(4, len) };
          st.nAxis = nAxis; st.nCentre = rc; st.nAlong = nAlong; st.nLaneOff = nLaneOff; st.turnCd = 3;
          return;
        }
        if (st.axis === 'h') mesh.position.set(st.along, 0, st.centre + st.laneOff);
        else mesh.position.set(st.centre + st.laneOff, 0, st.along);
        const targetRot = st.axis === 'h' ? headingOf(st.dir, 0) : headingOf(0, st.dir);
        let dr = targetRot - mesh.rotation.y;
        while (dr > Math.PI) dr -= Math.PI * 2;
        while (dr < -Math.PI) dr += Math.PI * 2;
        mesh.rotation.y += dr * Math.min(1, dt * 10);
      },
    });
  }

  // ── wanderer (pedestrians, animals, event NPCs) ──────────────────────────
  const tmp = new THREE.Vector3();
  function addWanderer(mesh: THREE.Object3D, hx: number, hz: number, tether: number, base: number, fear: number, radius: number, biome: string, panicLines?: string[]) {
    if (!biomeAt(hx, hz)) return;   // don't spawn anyone off the coastline
    let ang = rand(0, Math.PI * 2), hop = 0, fled = false;
    mesh.position.set(hx, 0, hz); setShadow(mesh); scene.add(mesh); addEdible(mesh, radius);
    const rec = { mesh, biome, panic: 0 };
    peds.push(rec);
    movers.push({
      mesh,
      update(dt, _t, vx, vz, vR) {
        if (eaten(mesh)) return;
        const dx = mesh.position.x - vx, dz = mesh.position.z - vz;
        const dist = Math.hypot(dx, dz);
        let spd = base;
        if (dist < vR + fear) {
          ang = Math.atan2(dz, dx); spd = base * 3.4; hop = 0.5;
          if (!fled && Math.random() < 0.5) {
            const pool = panicLines || PANIC[biome] || PANIC.generic;
            tmp.set(mesh.position.x, 5, mesh.position.z);
            say(tmp, pick(pool), 'panic');
          }
          fled = true;
        } else {
          if (dist > vR + fear + 40) fled = false;
          ang += rand(-1, 1) * dt * 3;
          const hd = Math.hypot(mesh.position.x - hx, mesh.position.z - hz);
          if (hd > tether) ang = Math.atan2(hz - mesh.position.z, hx - mesh.position.x);
        }
        const nx = mesh.position.x + Math.cos(ang) * spd * dt, nz = mesh.position.z + Math.sin(ang) * spd * dt;
        if (biomeAt(nx, nz)) { mesh.position.x = nx; mesh.position.z = nz; } else ang += Math.PI;
        mesh.rotation.y = -ang + Math.PI / 2;
        if (hop > 0) { hop -= dt; mesh.position.y = Math.abs(Math.sin(hop * 12)) * 0.8; } else mesh.position.y = 0;
        // walk cycle: arms + legs swing with travel speed
        const limbs = mesh.userData.limbs;
        if (limbs) {
          limbs.phase += dt * spd * 2.4;
          const sw = Math.sin(limbs.phase) * 0.55;
          limbs.ll.rotation.x = sw; limbs.rl.rotation.x = -sw;
          limbs.la.rotation.x = -sw * 0.8; limbs.ra.rotation.x = sw * 0.8;
        }
      },
    });
    return rec;
  }

  // scatter pedestrians across walkable biomes
  const pedZones: Biome[] = ['cozy', 'fancy', 'park', 'beach', 'plaza', 'downtown', 'forest', 'zoo'];
  for (let gy = 0; gy < 6; gy++) for (let gx = 0; gx < 6; gx++) {
    const b = PLAN_GRID[gy][gx];
    if (!pedZones.includes(b)) continue;
    const [cx, cz] = blockCenter3D(gx, gy);
    const n = b === 'beach' || b === 'plaza' ? 6 : b === 'forest' || b === 'zoo' ? 2 : 5;
    for (let i = 0; i < n; i++) {
      // half the crowd lives mid-block, half strolls near the sidewalk edges
      const edge = i % 2 === 1;
      const t = HALF_BLOCK_3D * (edge ? rand(0.88, 0.98) : rand(-0.7, 0.7));
      const hx = edge && Math.random() < 0.5 ? cx + (Math.random() < 0.5 ? t : -t) : cx + rand(-HALF_BLOCK_3D * 0.7, HALF_BLOCK_3D * 0.7);
      const hz = edge ? cz + (Math.random() < 0.5 ? t : -t) : cz + rand(-HALF_BLOCK_3D * 0.7, HALF_BLOCK_3D * 0.7);
      addWanderer(makePerson(biomeKey(b)), hx, hz, edge ? 28 : 20, rand(4, 7), 18, 2.4, biomeKey(b));
    }
  }

  // zoo animals: clamped near the pen
  {
    const [zx, zz] = blockCenter3D(5, 1);
    for (let i = 0; i < 6; i++) addWanderer(makeAnimal(), zx + rand(-HALF_BLOCK_3D * 0.6, HALF_BLOCK_3D * 0.6), zz + rand(-HALF_BLOCK_3D * 0.6, HALF_BLOCK_3D * 0.6), HALF_BLOCK_3D * 0.55, rand(3, 5), 22, 3, 'zoo');
  }

  // beach sunbathers: flat out on their towels, working on the tan
  const towelGeo = new THREE.PlaneGeometry(3.6, 5.4);
  for (let gy = 0; gy < 6; gy++) for (let gx = 0; gx < 6; gx++) {
    if (PLAN_GRID[gy][gx] !== 'beach') continue;
    const [bx, bz] = blockCenter3D(gx, gy);
    for (let i = 0; i < 3; i++) {
      const tx = bx + rand(-HALF_BLOCK_3D * 0.55, HALF_BLOCK_3D * 0.55);
      const tz = bz + rand(-HALF_BLOCK_3D * 0.55, HALF_BLOCK_3D * 0.55);
      if (!biomeAt(tx, tz)) continue;
      const towel = new THREE.Mesh(towelGeo, mat(pick([0xff6f91, 0x4dd0e1, 0xffd54f, 0x7be8b0]), 0.95));
      towel.rotation.x = -Math.PI / 2; towel.rotation.z = rand(0, Math.PI * 2);
      towel.position.set(tx, 0.08, tz); scene.add(towel);
      const bather = makePerson('beach');
      bather.rotation.x = -Math.PI / 2;                        // flat on the back
      bather.rotation.z = towel.rotation.z;
      bather.position.set(tx, 0.55, tz);
      setShadow(bather); scene.add(bather); addEdible(bather, 2.4);
    }
  }

  // birds: a couple of small flocks, high up and out of the way
  for (let f = 0; f < 2; f++) {
    const cx = rand(-180, 180), cz = rand(-180, 180), fly = rand(26, 34);
    for (let i = 0; i < 3; i++) {
      const mesh = makeBird();
      let ang = rand(0, Math.PI * 2);
      mesh.position.set(cx + rand(-10, 10), fly, cz + rand(-10, 10)); setShadow(mesh); scene.add(mesh); addEdible(mesh, 2);
      movers.push({
        mesh,
        update(dt, t, vx, vz, vR) {
          if (eaten(mesh)) return;
          const dx = mesh.position.x - vx, dz = mesh.position.z - vz;
          if (Math.hypot(dx, dz) < vR + 40) { ang = Math.atan2(dz, dx); mesh.position.x += Math.cos(ang) * 26 * dt; mesh.position.z += Math.sin(ang) * 26 * dt; }
          else { ang += rand(-1, 1) * dt * 2; if (Math.hypot(mesh.position.x - cx, mesh.position.z - cz) > 70) ang = Math.atan2(cz - mesh.position.z, cx - mesh.position.x); mesh.position.x += Math.cos(ang) * 10 * dt; mesh.position.z += Math.sin(ang) * 10 * dt; }
          mesh.position.y = fly + Math.sin(t * 3 + i) * 1.5;
          mesh.rotation.y = -ang + Math.PI / 2;
          const flap = 0.5 + Math.sin(t * 14 + i) * 0.5;
          mesh.children.forEach((c, ci) => { if (ci > 0) c.rotation.x = flap; });
        },
      });
    }
  }

  // ── the train ─────────────────────────────────────────────────────────────
  const CAR_GAP = 0.028;
  let trainGrp: THREE.Group | null = null, trainCars: THREE.Group[] = [], trainT = 0, respawn = 0;
  function buildTrain() {
    const grp = new THREE.Group(); scene.add(grp);
    const cars: THREE.Group[] = [];
    for (let i = 0; i < 4; i++) { const c = makeLoco(i === 0); grp.add(c); cars.push(c); }
    setShadow(grp); addEdible(grp, 8); trainGrp = grp; trainCars = cars; trainT = rand(0, 1);
  }
  buildTrain();
  movers.push({
    get mesh() { return trainGrp!; },
    update(dt) {
      if (!trainGrp) return;
      if (eaten(trainGrp)) { respawn += dt; if (respawn > 6) { respawn = 0; trainGrp = null; buildTrain(); } return; }
      trainT = (trainT + dt * 0.02) % 1;
      const lead = railPointAt(trainT);
      trainGrp.position.set(lead.x, 0, lead.z);
      // -π/2: rail angle is +Z-forward, the loco model's nose is +X
      for (let i = 0; i < trainCars.length; i++) { const p = railPointAt(trainT - i * CAR_GAP); trainCars[i].position.set(p.x - lead.x, 0, p.z - lead.z); trainCars[i].rotation.y = p.angle - Math.PI / 2; }
    },
  } as Mover);

  // ── staged VIGNETTE EVENTS ──────────────────────────────────────────────────
  interface Ev { x: number; z: number; ambient: string[]; panic: string[]; cd: number; panicked: number; }
  const events: Ev[] = [];
  const decor = (mesh: THREE.Object3D, x: number, z: number, r = 3) => { if (!insideIsland3(x, z)) return; mesh.position.set(x, 0, z); setShadow(mesh); scene.add(mesh); addEdible(mesh, r); };

  function addEvent(gx: number, gy: number, ambient: string[], panic: string[], build: (x: number, z: number) => void, pedN: number, pedCol?: number) {
    const [x, z] = blockCenter3D(gx, gy);
    const evBiome = biomeKey(PLAN_GRID[gy][gx]);
    build(x, z);
    for (let i = 0; i < pedN; i++) addWanderer(makePerson(evBiome, pedCol), x + rand(-14, 14), z + rand(-14, 14), 16, rand(3, 5), 18, 2.4, 'generic', panic);
    events.push({ x, z, ambient, panic, cd: rand(1, 4), panicked: 0 });
  }

  // Mayor's rally at town hall: mayor up on the stage, crowd gathered in front
  addEvent(3, 2,
    ['re-elect me, and the void LEAVES!', 'my fellow citizens…', 'VOIDLING is UNDER CONTROL', 'read my lips: no new voids', 'four more years! four more years!', 'boooo! …sorry, continue', 'and ANOTHER thing about potholes—'],
    ['WOMEN, CHILDREN, MAYORS FIRST!', 'IT HAS MY VOTE— I MEAN—', 'SECURITY! SECUR—', 'the rally is CANCELLED!!'],
    (x, z) => {
      // The rally happens on TOWN HALL's steps (north end of the square), the
      // stage facing the fountain — nobody is standing in the water anymore.
      const SZ = z - 12;   // stage line, south of the town hall facade
      glb(scene, addEdible, 'stage', x, SZ, 5, {
        h: 3.2, rotY: Math.PI,
        fallback: () => {
          const grp = new THREE.Group();
          const stage = new THREE.Mesh(new THREE.BoxGeometry(10, 1.6, 6), new THREE.MeshStandardMaterial({ color: 0xf0e6d2, roughness: 0.8 }));
          stage.position.y = 0.8; grp.add(stage);
          const lectern = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.2, 1.2), new THREE.MeshStandardMaterial({ color: 0xe8ddc4, roughness: 0.75 }));
          lectern.position.set(0, 2.7, 1.6); grp.add(lectern);
          return grp;
        },
      });
      // the mayor: on the stage, one arm working the crowd
      const mayor = makePerson('downtown', 0x2a2a44);
      mayor.position.set(x, 1.6, SZ); mayor.rotation.y = Math.PI;   // faces the fountain
      setShadow(mayor); scene.add(mayor); addEdible(mayor, 2.4);
      movers.push({
        mesh: mayor,
        update(dt, t) {
          if (eaten(mayor)) return;
          mayor.rotation.y = Math.PI;   // keep facing the crowd
          const L = mayor.userData.limbs as Limbs;
          L.ra.rotation.z = -Math.PI * 0.8 + Math.sin(t * 2.6) * 0.3;   // raised, waving
          L.la.rotation.x = Math.sin(t * 1.4) * 0.25;
        },
      });
      // the crowd: a loose arc between the stage and the fountain
      for (let i = 0; i < 7; i++) {
        const a = Math.PI * (0.15 + 0.7 * (i / 6));
        const cx2 = x + Math.cos(a) * rand(8, 14), cz2 = SZ + 5 + Math.sin(a) * rand(4, 9);
        addWanderer(makePerson('plaza'), cx2, cz2, 3.5, rand(0.6, 1.2), 20, 2.4, 'plaza',
          ['the SPEECH!! RUN!!', 'democracy is DOOMED!!', 'save the ballot box!!']);
      }
    }, 0);

  // Campsite in the forest (s'mores)
  addEvent(4, 0,
    ['s\'mores?! 🔥', 'nature is HEALING', 'one more ghost story…', 'who packed the bug spray?'],
    ['BEAR?! no— WORSE!!', 'ABANDON CAMP!!', 'the tent has NO defense stat!!'],
    (x, z) => {
      for (const [ox, oz, col] of [[-7, 0, 0xff8a70], [7, 3, 0x6db8e8]] as const) {
        const grp2 = new THREE.Group();
        const tent = new THREE.Mesh(new THREE.ConeGeometry(4, 5, 4), new THREE.MeshStandardMaterial({ color: col, roughness: 0.85, flatShading: true }));
        tent.rotation.y = Math.PI / 4; tent.position.y = 2.5; grp2.add(tent);
        const flap = new THREE.Mesh(new THREE.CircleGeometry(1.1, 3),
          new THREE.MeshStandardMaterial({ color: 0x2a2438, roughness: 0.95, side: THREE.DoubleSide }));
        flap.position.set(0, 1.05, 2.62); flap.rotation.x = -0.42; grp2.add(flap);
        decor(grp2, x + ox, z + oz, 3);
      }
      const logs = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 0.8, 8), new THREE.MeshStandardMaterial({ color: 0x6a4a2a, roughness: 1 }));
      logs.position.y = 0.4; decor(logs, x, z, 2);
      const flame = new THREE.Mesh(new THREE.ConeGeometry(1.3, 3, 7), new THREE.MeshStandardMaterial({ color: 0xff8a3a, emissive: 0xff5a1a, emissiveIntensity: 1.2, roughness: 0.6 }));
      flame.position.set(x, 2, z); scene.add(flame);
    }, 3);

  // Golf on the park
  addEvent(4, 2,
    ['FORE!! ⛳', 'keep your head down', 'nice putt, Karen', 'that\'s a birdie'],
    ['it ate the GREEN!!', 'MY HANDICAP!!', 'not the 18th hole!!'],
    (x, z) => {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 8, 6), new THREE.MeshStandardMaterial({ color: 0xf2f4f8 }));
      pole.position.y = 4; const flag = new THREE.Mesh(new THREE.PlaneGeometry(3, 1.6), new THREE.MeshStandardMaterial({ color: 0xe8453c, side: THREE.DoubleSide }));
      flag.position.set(1.5, 7, 0); const grp = new THREE.Group(); grp.add(pole); grp.add(flag);
      grp.rotation.y = 0.8;   // angled to the play camera — never edge-on invisible
      decor(grp, x - 15, z - 21, 3);   // on the putting green, west of the river
    }, 3, 0xf0f0f0);

  // Beach volleyball
  addEvent(2, 5,
    ['SPIKE IT!! 🏐', 'set! set! SET!', 'point, beach team!', 'ace!'],
    ['sand in my EVERYTHING!!', 'GAME. OVER.', 'serve THAT, void!!'],
    (x, z) => {
      for (const ox of [-6, 6]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 6, 6), new THREE.MeshStandardMaterial({ color: 0x9a7a5a, roughness: 0.8 }));
        post.position.y = 3; decor(post, x + ox, z, 2);
      }
      const netTex = (() => {   // a real grid so the net reads over sand
        const cv2 = document.createElement('canvas'); cv2.width = 96; cv2.height = 24;
        const x2 = cv2.getContext('2d')!;
        x2.strokeStyle = 'rgba(255,255,255,0.95)'; x2.lineWidth = 1.4;
        for (let gx2 = 0; gx2 <= 96; gx2 += 8) { x2.beginPath(); x2.moveTo(gx2, 0); x2.lineTo(gx2, 24); x2.stroke(); }
        for (let gy2 = 0; gy2 <= 24; gy2 += 8) { x2.beginPath(); x2.moveTo(0, gy2); x2.lineTo(96, gy2); x2.stroke(); }
        return new THREE.CanvasTexture(cv2);
      })();
      const net = new THREE.Mesh(new THREE.PlaneGeometry(12, 2.4),
        new THREE.MeshBasicMaterial({ map: netTex, transparent: true, opacity: 0.85, side: THREE.DoubleSide }));
      net.position.set(x, 4.4, z); scene.add(net);
      const ball = new THREE.Group();
      const bwhite = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 10), new THREE.MeshStandardMaterial({ color: 0xf6f6f2, roughness: 0.45 }));
      ball.add(bwhite);
      const band = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.14, 8, 20),
        new THREE.MeshStandardMaterial({ color: 0xffd23f, roughness: 0.5 }));
      band.rotation.x = 0.6; ball.add(band);
      const band2 = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.14, 8, 20),
        new THREE.MeshStandardMaterial({ color: 0x4da3ff, roughness: 0.5 }));
      band2.rotation.y = 0.9; ball.add(band2);
      ball.position.y = 1; decor(ball, x + 3, z + 5, 1.5);
    }, 4, 0xff9f4d);

  // Soccer match in the park (second park block)
  addEvent(4, 3,
    ['GOOOAL! ⚽', 'DEFENSE!! DEFENSE!!', 'ref, that was SO offside', 'nutmeg!!'],
    ['REF!! TIME OUT!!', 'it ate the REF?!', 'match ABANDONED!!'],
    (x, z) => {
      // pitch stripes
      const pitch = new THREE.Mesh(new THREE.PlaneGeometry(30, 20),
        new THREE.MeshStandardMaterial({ color: 0x6fbe5e, roughness: 0.95 }));
      pitch.rotation.x = -Math.PI / 2; pitch.position.set(x, 0.06, z); scene.add(pitch);
      const line = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 20), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      line.rotation.x = -Math.PI / 2; line.position.set(x, 0.08, z); scene.add(line);
      // goals
      for (const gx2 of [-14, 14]) {
        const goal = new THREE.Group();
        const white = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
        for (const oz of [-3, 3]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 3, 6), white); p.position.set(0, 1.5, oz); goal.add(p); }
        const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 6, 6), white);
        bar.rotation.x = Math.PI / 2; bar.position.y = 3; goal.add(bar);
        decor(goal, x + gx2, z, 2.6);
      }
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.7, 12, 10), new THREE.MeshStandardMaterial({ color: 0xf4f4f4, roughness: 0.4 }));
      ball.position.y = 0.7; decor(ball, x + rand(-4, 4), z + rand(-3, 3), 1);
    }, 6, 0xffffff);

  // School at recess (fancy district)
  addEvent(2, 4,
    ['recess!! 🎒', 'tag, you\'re it!', 'pop quiz?! nooo', 'the bell! THE BELL!'],
    ['SNOW DAY!! I mean— VOID DAY!!', 'homework CANCELLED!!', 'RUN, class, RUN!!'],
    (x, z) => {
      // AI schoolhouse (bell tower + clock); procedural brick school if offline
      const buildFallback = () => {
        const school = new THREE.Group();
        const brick = new THREE.Mesh(new THREE.BoxGeometry(16, 6, 9),
          new THREE.MeshStandardMaterial({ color: 0xc25a4a, roughness: 0.85 }));
        brick.position.y = 3; school.add(brick);
        const trim = new THREE.Mesh(new THREE.BoxGeometry(16.4, 0.8, 9.4), new THREE.MeshStandardMaterial({ color: 0xf2efe6, roughness: 0.8 }));
        trim.position.y = 6.2; school.add(trim);
        const bell = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.6, 2.4, 4),
          new THREE.MeshStandardMaterial({ color: 0xf2efe6, roughness: 0.8, flatShading: true }));
        bell.position.y = 7.6; school.add(bell);
        const door = new THREE.Mesh(new THREE.BoxGeometry(2.4, 3.2, 0.3), new THREE.MeshStandardMaterial({ color: 0x3a5a7a, roughness: 0.7 }));
        door.position.set(0, 1.6, 4.6); school.add(door);
        return school;
      };
      glb(scene, addEdible, 'school', x, z - 6, 9, { h: 11, fallback: buildFallback });
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 7, 6), new THREE.MeshStandardMaterial({ color: 0xc8cdd8, metalness: 0.5 }));
      pole.position.set(x + 9.5, 3.5, z - 3); setShadow(pole); scene.add(pole);
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.3), new THREE.MeshStandardMaterial({ color: 0x9350e8, side: THREE.DoubleSide }));
      flag.position.set(x + 10.6, 6.4, z - 3); scene.add(flag);
    }, 5);

  // ── ambient chatter throttle ────────────────────────────────────────────────
  let chatCd = 2;
  const cpos = new THREE.Vector3();

  return {
    update(dt, t, vx, vz, vR) {
      for (const m of movers) m.update(dt, t, vx, vz, vR);

      // one ambient line at a time, from a pedestrian near the void (on-screen)
      chatCd -= dt;
      if (chatCd <= 0) {
        chatCd = rand(1.8, 3.0);
        const near = peds.filter((p) => !eaten(p.mesh) && Math.hypot(p.mesh.position.x - vx, p.mesh.position.z - vz) < 68);
        if (near.length) {
          const p = pick(near);
          const pool = AMBIENT[p.biome] || AMBIENT.cozy;
          cpos.set(p.mesh.position.x, 5, p.mesh.position.z);
          say(cpos, pick(pool), 'ambient');
        }
      }

      // events: panic when the void closes in, ambient banter otherwise
      for (const ev of events) {
        const d = Math.hypot(ev.x - vx, ev.z - vz);
        ev.panicked = Math.max(0, ev.panicked - dt);
        ev.cd -= dt;
        if (d < vR + 55 && ev.panicked <= 0) { cpos.set(ev.x, 6, ev.z); say(cpos, pick(ev.panic), 'panic'); ev.panicked = 3.5; }
        else if (ev.cd <= 0 && d < 130) { ev.cd = rand(4, 7); cpos.set(ev.x, 6, ev.z); say(cpos, pick(ev.ambient), 'event'); }
      }
    },
  };
}
