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
  railPointAt, type Biome, type AddEdible,
} from './island';

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
const setShadow = (m: THREE.Object3D) => m.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });

export type Say = (pos: THREE.Vector3, text: string, kind: 'ambient' | 'panic' | 'event') => void;

// ── biome dialogue (from the 2D AMBIENT_BY_BIOME / PANIC_BY_BIOME pools) ─────────
const AMBIENT: Record<string, string[]> = {
  cozy: ['my hedge. my rules.', 'did you see the HOA email?', 'lawn\'s looking crisp', 'new mailbox day!', 'block party friday?'],
  fancy: ['the help is late again', 'my topiary won an award', 'is that valet parking?', 'darling, how gauche'],
  downtown: ['this commute is BRUTAL', 'rent here is CRIMINAL', 'need. more. coffee.', 'my startup\'s pre-seed', 'hustle never sleeps'],
  park: ['lovely day for it', 'the ducks are rowdy', 'picnic o\'clock!', 'jog complete 💪', 'frisbee!'],
  forest: ['so peaceful out here', 'was that a bird?', 'fresh piney air', 'love this trail'],
  beach: ['sunscreen me. NOW.', 'crab looked at me funny', 'best beach day EVER', 'wave check! 🌊'],
  plaza: ['meet me by the fountain', 'downtown\'s buzzing', 'street food time', 'is there a rally?'],
  zoo: ['the lions look hungry', 'popcorn! 🍿', 'look, flamingos!'],
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
function makePerson(colOverride?: number): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.85, 1.7, 3, 8),
    new THREE.MeshStandardMaterial({ color: colOverride ?? pick(PROPS.person), roughness: 0.85 }));
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

  // ── cars: grid-locked lanes ──────────────────────────────────────────────
  const LANE = 2.6;
  for (let i = 0; i < 30; i++) {
    const mesh = makeCar();
    const horiz = Math.random() < 0.5;
    const centre = pick(ROAD_CENTERS_3D);
    const dir = Math.random() < 0.5 ? 1 : -1;
    const st = { axis: horiz ? 'h' : 'v' as 'h' | 'v', dir, centre, along: rand(-230, 230), laneOff: dir * LANE * (horiz ? 1 : -1), speed: rand(14, 22), turnCd: 0 };
    if (st.axis === 'h') mesh.position.set(st.along, 0, centre + st.laneOff); else mesh.position.set(centre + st.laneOff, 0, st.along);
    mesh.rotation.y = st.axis === 'h' ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (dir > 0 ? 0 : Math.PI);
    setShadow(mesh); scene.add(mesh); addEdible(mesh, 4);
    movers.push({
      mesh,
      update(dt, _t, vx, vz, vR) {
        if (eaten(mesh)) return;
        st.turnCd = Math.max(0, st.turnCd - dt);
        const dx = mesh.position.x - vx, dz = mesh.position.z - vz;
        let spd = st.speed;
        if (Math.hypot(dx, dz) < vR + 26) { spd = st.speed * 2.1; const ac = st.axis === 'h' ? dx : dz; st.dir = ac >= 0 ? 1 : -1; }
        st.along += st.dir * spd * dt;
        const nx = st.axis === 'h' ? st.along : st.centre + st.laneOff;
        const nz = st.axis === 'h' ? st.centre + st.laneOff : st.along;
        if (!biomeAt(nx, nz) && Math.abs(st.along) > 40) { st.dir *= -1; st.along += st.dir * spd * dt * 2; }
        if (st.turnCd === 0) for (const rc of ROAD_CENTERS_3D) if (Math.abs(st.along - rc) < 3 && Math.random() < 0.5) {
          const na = st.centre; st.centre = rc; st.axis = st.axis === 'h' ? 'v' : 'h'; st.along = na; st.laneOff = st.dir * LANE * (st.axis === 'h' ? 1 : -1); st.turnCd = 2.5; break;
        }
        if (st.axis === 'h') { mesh.position.set(st.along, 0, st.centre + st.laneOff); mesh.rotation.y = st.dir > 0 ? Math.PI / 2 : -Math.PI / 2; }
        else { mesh.position.set(st.centre + st.laneOff, 0, st.along); mesh.rotation.y = st.dir > 0 ? 0 : Math.PI; }
      },
    });
  }

  // ── wanderer (pedestrians, animals, event NPCs) ──────────────────────────
  const tmp = new THREE.Vector3();
  function addWanderer(mesh: THREE.Object3D, hx: number, hz: number, tether: number, base: number, fear: number, radius: number, biome: string, panicLines?: string[]) {
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
      },
    });
    return rec;
  }

  // scatter pedestrians across walkable biomes
  const pedZones: Biome[] = ['cozy', 'fancy', 'park', 'beach', 'plaza', 'downtown'];
  for (let gy = 0; gy < 6; gy++) for (let gx = 0; gx < 6; gx++) {
    const b = PLAN_GRID[gy][gx];
    if (!pedZones.includes(b)) continue;
    const [cx, cz] = blockCenter3D(gx, gy);
    const n = b === 'beach' ? 3 : 2;
    for (let i = 0; i < n; i++) {
      addWanderer(makePerson(), cx + rand(-HALF_BLOCK_3D * 0.7, HALF_BLOCK_3D * 0.7), cz + rand(-HALF_BLOCK_3D * 0.7, HALF_BLOCK_3D * 0.7), 22, rand(4, 7), 18, 2.4, biomeKey(b));
    }
  }

  // zoo animals: clamped near the pen
  {
    const [zx, zz] = blockCenter3D(5, 1);
    for (let i = 0; i < 6; i++) addWanderer(makeAnimal(), zx + rand(-HALF_BLOCK_3D * 0.6, HALF_BLOCK_3D * 0.6), zz + rand(-HALF_BLOCK_3D * 0.6, HALF_BLOCK_3D * 0.6), HALF_BLOCK_3D * 0.55, rand(3, 5), 22, 3, 'zoo');
  }

  // birds: flocks that drift and scatter
  for (let f = 0; f < 3; f++) {
    const cx = rand(-180, 180), cz = rand(-180, 180), fly = rand(18, 30);
    for (let i = 0; i < 4; i++) {
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
      for (let i = 0; i < trainCars.length; i++) { const p = railPointAt(trainT - i * CAR_GAP); trainCars[i].position.set(p.x - lead.x, 0, p.z - lead.z); trainCars[i].rotation.y = p.angle; }
    },
  } as Mover);

  // ── staged VIGNETTE EVENTS ──────────────────────────────────────────────────
  interface Ev { x: number; z: number; ambient: string[]; panic: string[]; cd: number; panicked: number; }
  const events: Ev[] = [];
  const decor = (mesh: THREE.Object3D, x: number, z: number, r = 3) => { mesh.position.set(x, 0, z); setShadow(mesh); scene.add(mesh); addEdible(mesh, r); };

  function addEvent(gx: number, gy: number, ambient: string[], panic: string[], build: (x: number, z: number) => void, pedN: number, pedCol?: number) {
    const [x, z] = blockCenter3D(gx, gy);
    build(x, z);
    for (let i = 0; i < pedN; i++) addWanderer(makePerson(pedCol), x + rand(-14, 14), z + rand(-14, 14), 16, rand(3, 5), 18, 2.4, 'generic', panic);
    events.push({ x, z, ambient, panic, cd: rand(1, 4), panicked: 0 });
  }

  // Mayor at the plaza (town hall)
  addEvent(3, 2,
    ['re-elect me, and the void LEAVES!', 'my fellow citizens…', 'VOIDLING is UNDER CONTROL', 'read my lips: no new voids'],
    ['WOMEN, CHILDREN, MAYORS FIRST!', 'IT HAS MY VOTE— I MEAN—', 'SECURITY! SECUR—'],
    (x, z) => {
      const podium = new THREE.Mesh(new THREE.BoxGeometry(4, 4, 3), new THREE.MeshStandardMaterial({ color: 0xf0e6d2, roughness: 0.8 }));
      decor(podium, x, z + 6, 3);
      const banner = new THREE.Mesh(new THREE.BoxGeometry(9, 3, 0.4), new THREE.MeshStandardMaterial({ color: 0x8a5cff, roughness: 0.6 }));
      banner.position.y = 7; banner.rotation.y = 0; decor(banner, x, z + 4, 3);
    }, 4, 0x2a2a44);

  // Campsite in the forest (s'mores)
  addEvent(5, 0,
    ['s\'mores?! 🔥', 'nature is HEALING', 'one more ghost story…', 'who packed the bug spray?'],
    ['BEAR?! no— WORSE!!', 'ABANDON CAMP!!', 'the tent has NO defense stat!!'],
    (x, z) => {
      for (const [ox, oz, col] of [[-7, 0, 0xe8604d], [7, 3, 0x4db0e8]] as const) {
        const tent = new THREE.Mesh(new THREE.ConeGeometry(4, 5, 4), new THREE.MeshStandardMaterial({ color: col, roughness: 0.85, flatShading: true }));
        tent.rotation.y = Math.PI / 4; decor(tent, x + ox, z + oz, 3);
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
      flag.position.set(1.5, 7, 0); const grp = new THREE.Group(); grp.add(pole); grp.add(flag); decor(grp, x, z, 3);
    }, 3, 0xf0f0f0);

  // Beach volleyball
  addEvent(2, 5,
    ['SPIKE IT!! 🏐', 'set! set! SET!', 'point, beach team!', 'ace!'],
    ['sand in my EVERYTHING!!', 'GAME. OVER.', 'serve THAT, void!!'],
    (x, z) => {
      for (const ox of [-6, 6]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 6, 6), new THREE.MeshStandardMaterial({ color: 0x4a5568 }));
        post.position.y = 3; decor(post, x + ox, z, 2);
      }
      const net = new THREE.Mesh(new THREE.PlaneGeometry(12, 2.4), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.4, side: THREE.DoubleSide }));
      net.position.set(x, 4.4, z); scene.add(net);
      const ball = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 10), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 }));
      ball.position.y = 1; decor(ball, x + 3, z + 5, 1.5);
    }, 4, 0xff9f4d);

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
