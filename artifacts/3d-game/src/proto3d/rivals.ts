// Rival voids — the AI "family". They roam the island, eat from the SAME food
// pool as the player, and grow. Whoever consumes the most by the final whistle
// wins — so a rival really can beat you. Each is a cute coloured void (a tinted
// fresnel orb + glow + billboarded eyes) with a name and a live score.
import * as THREE from 'three';
import type { Biome } from './island';

export interface RivalEdible { mesh: THREE.Object3D; radius: number; }
export interface Rival { name: string; color: number; score: number; x: number; z: number; r: number; pulse?: number; }
export interface Rivals {
  list: Rival[];
  update(dt: number, t: number, playerX: number, playerZ: number, playerR: number): void;
  onJoin?: (name: string, color: number, x: number, z: number) => void;
  onRivalEaten?: (name: string, pts: number) => void;    // you swallowed one
  onPlayerBitten?: (name: string) => void;               // one bit YOU
  onSpeak?: (x: number, z: number, line: string) => void; // personality bubbles
  reset(): void;                                         // instant rematch
}

const NAMES = ['YIKES', 'DAZZLE', 'BITSY', 'CHOMPZILLA', 'SNOOZLE'];
// the family: anxious / show-off / baby / drama queen / sleepy. Names ARE the
// personalities now (YIKES saying "I KNEW this would happen" is the joke).
// All lines <=26 chars so bubbles never wrap.
export const RIVAL_VOICE: Record<string, {
  taunt: string[]; respawn: string[]; eaten: string[];
  steal: string[]; escape: string[]; bite: string[];
  nearBig: string[]; nearSmall: string[]; rankUp: string[];
}> = {
  YIKES: {
    taunt: ['sorry!! but also: yum!!', 'I ate it?? I ATE IT!', "don't be mad don't be mad", 'oh no. am I winning??', 'was that ok to eat??', 'eek— I mean… NOM!'],
    respawn: ['I KNEW this would happen', 'ow. told you. OW.', 'respawning. nervously.', "is it safe?? it's not."],
    eaten: ['called it.', "it's dark in here??", 'worst. day. EVER.'],
    steal: ['I was gonna eat that!!', 'that was MY snack!! eep', 'rude!! politely rude!!'],
    escape: ['MY WHOLE LIFE FLASHED!!', 'too close too close!!', 'never doing that again'],
    bite: ['SORRY!! it was reflex!!', 'I panicked and CHOMPED', 'oh no I bit someone'],
    nearBig: ['am I… bigger?? AAAH', 'being big is SCARY', "don't make me use this"],
    nearSmall: ['NOPE NOPE NOPE NOPE', 'pretend I am a rock', 'walking away quickly!!'],
    rankUp: ['I passed you?? sorry!!', 'winning is stressful!!', 'how did THAT happen'],
  },
  DAZZLE: {
    taunt: ['no photos, please', 'skill. pure skill.', 'the crowd goes WILD', "bet you can't do THAT", 'flawless. as usual.', 'top THAT, superstar'],
    respawn: ['I meant to do that', 'nobody saw that. good.', 'a fluke. obviously.', 'my glow!! ruined!!'],
    eaten: ["unfair!! I'm the STAR", 'my fans will hear of this', 'rude AND jealous'],
    steal: ['excuse me?? RESERVED', 'that had MY name on it', 'the AUDACITY. stunning.'],
    escape: ['TOO SLOW! hehehe', 'you almost touched FAME', 'catch me? adorable.'],
    bite: ['delicious. obviously.', 'a five-star bite', "don't take it personal"],
    nearBig: ["aww. you're teeny.", 'love the mini look', 'so small. so brave.'],
    nearSmall: ["I'm not scared. (I am)", 'my agent said RUN', 'this is bad for my brand'],
    rankUp: ['outta my way, slowpoke', 'first place suits me', 'and THAT is star power'],
  },
  BITSY: {
    taunt: ['nom nom nom hehe', 'I did a WINNING!', 'big bite! BIGGEST bite!', 'dat one was YUMMY', 'me first! ME FIRST!', 'look!! I ate a house!!'],
    respawn: ['owie.', 'I want a do-over!!', 'not fair!! *sniff*', 'nap. then REVENGE.'],
    eaten: ['waaaAAAH!!', "you're a MEANIE", "I'm telling CHOMPZILLA"],
    steal: ['MINE! dat was MINE!!', 'gimme it BACK!!', "I'm telling SNOOZLE!!"],
    escape: ["can't catch meee!", 'hehehe too wiggly!', 'nyoom nyoom nyoom!'],
    bite: ['CHOMP! hehehe', 'you taste like grape', 'oopsie chompsie!'],
    nearBig: ["I'm da BIG kid now!", 'look how BIG I got!!', 'fear my tiny might!!'],
    nearSmall: ['eep!! big person!!', 'be nice to babies!!', 'I want my blankie!!'],
    rankUp: ['I winned past you!!', 'zoom zoom, slowpoke!', 'babies rule!!'],
  },
  CHOMPZILLA: {
    taunt: ['BEHOLD: dinner theater', 'a FEAST worthy of ME', 'the island? MY stage.', 'gasp. magnificent. me.', 'act two: I DEVOUR', "applause. I'll wait."],
    respawn: ['the AUDACITY!!', 'I shall RETURN!! *swish*', 'my villain origin story', 'curtain?? ALREADY??'],
    eaten: ['a TRAGEDY in one act', 'the drama!! the DRAMA!!', 'eaten?! by an AMATEUR?!'],
    steal: ['STOP!! THIEF!! DRAMA!!', 'my dinner!! MY SCENE!!', 'you DARE upstage me?!'],
    escape: ['DENIED! crowd goes wild', 'you missed! DRAMATIC!', 'the plot THICKENS!!'],
    bite: ['a taste of VICTORY!!', 'consider that ACT ONE', 'delicious foreshadowing'],
    nearBig: ['tremble, tiny snack!!', 'bow before CHOMPZILLA', 'the stage is MINE now'],
    nearSmall: ["spare me!! I'm FAMOUS", 'not the FACE!!', 'exit!! stage LEFT!!'],
    rankUp: ['the LEAD is my destiny', 'a STAR is reborn!!', 'weep, understudy!!'],
  },
  SNOOZLE: {
    taunt: ['huh? oh. I ate that.', '*yawn* …delicious', 'winning is exhausting', 'five more bites…', 'zzz… crunch… zzz', 'oops. swallowed a bus.'],
    respawn: ['best nap ever', "wake me when it's safe", 'ugh. mornings.', 'snooze… then chomp'],
    eaten: ['finally, a nap', 'cozy in here, actually', 'zzzzz…'],
    steal: ['hey… I called dibs… zzz', 'that was my breakfast…', 'rude. *yawns angrily*'],
    escape: ['phew. back to my nap', 'cardio?? never again', '*escapes sleepily*'],
    bite: ['mm. midnight snack.', 'sorry. sleep-chomping.', '*bites in his sleep*'],
    nearBig: ['oh. when did I get big', 'being big is nap-sized', 'huh. tall now.'],
    nearSmall: ['zzz— AAH okay running', 'five more minutes!!', 'too sleepy to flee…'],
    rankUp: ['passed you in my sleep', '*overtakes while yawning*', 'zzzoom.'],
  },
};
const pickLine = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
const COLORS = [0x2fd8c0, 0xff6fb0, 0xff9a3a, 0x7ed57a, 0x4d8ff0];
const rand = (a: number, b: number) => a + Math.random() * (b - a);
// must match the player model (2D game constants through the 0.05 map scale)
const EAT_RATIO = 1.11, R_CAP = 12, START_R = 0.9, LAW_RATE = 0.025;
const growR = (R: number, eR: number) => {
  const rookie = R < 1.7 ? 1.6 : R < 2.5 ? 1.3 : 1;
  const diminish = Math.sqrt(START_R / Math.max(START_R, R));
  return Math.min(R_CAP, Math.sqrt(R * R + 0.5 * eR * eR * rookie * diminish));
};

function makeRivalMesh(color: number, idx = 0): { group: THREE.Group; eyes: THREE.Group; halo: THREE.Mesh } {
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
  // personality accessory: sweat drop / star shades / hair curl / crown / nightcap
  const bmat = (c2: number) => new THREE.MeshBasicMaterial({ color: c2 });
  if (idx % 5 === 0) {   // YIKES: sweat drop at the temple
    const drop = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), new THREE.MeshBasicMaterial({ color: 0x8fd8ff, transparent: true, opacity: 0.9, depthWrite: false }));
    drop.scale.set(1, 1.5, 1); drop.position.set(0.5, 0.72, 0.5); group.add(drop);
  } else if (idx % 5 === 1) {   // DAZZLE: star shades (billboard with the eyes)
    for (const sx of [-0.32, 0.32]) {
      const lens = new THREE.Mesh(new THREE.CircleGeometry(0.15, 16), new THREE.MeshBasicMaterial({ color: 0x140a26, depthTest: false, depthWrite: false }));
      lens.position.set(sx, 0.1, 1.03); lens.renderOrder = 7; eyes.add(lens);
    }
    const bridge = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.03), new THREE.MeshBasicMaterial({ color: 0x140a26, depthTest: false, depthWrite: false }));
    bridge.position.set(0, 0.12, 1.03); bridge.renderOrder = 7; eyes.add(bridge);
  } else if (idx % 5 === 2) {   // BITSY: single baby hair curl
    const curl = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.035, 8, 14, Math.PI * 1.4), bmat(new THREE.Color(color).multiplyScalar(0.7).getHex()));
    curl.position.set(0, 1.02, 0); curl.rotation.set(0.4, 0, 0.3); group.add(curl);
  } else if (idx % 5 === 3) {   // CHOMPZILLA: rakishly tilted gold crown
    const crown = new THREE.Group();
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.14, 0.13, 8, 1, true), new THREE.MeshBasicMaterial({ color: 0xffd34d, side: THREE.DoubleSide }));
    crown.add(band);
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2;
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.1, 6), bmat(0xffd34d));
      spike.position.set(Math.cos(a) * 0.15, 0.11, Math.sin(a) * 0.15); crown.add(spike);
    }
    crown.position.set(0.12, 0.96, 0.1); crown.rotation.z = -0.3; group.add(crown);
  } else {   // SNOOZLE: floppy nightcap + pom-pom
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.55, 12), bmat(0x4d6bff));
    cap.position.set(0, 1.0, 0); cap.rotation.z = 0.7; group.add(cap);
    const pom = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), bmat(0xffffff));
    pom.position.set(0.42, 1.18, 0); group.add(pom);
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
  // props the family has eaten, mid shrink-out animation
  const shrinking: THREE.Object3D[] = [];
  interface R extends Rival { group: THREE.Group; eyes: THREE.Group; halo: THREE.Mesh; tx: number; tz: number; retarget: number; joinAt: number; joined: boolean; stall: number; ph: number; pulse: number; vx: number; vz: number; biteCd: number; respawnT: number; speakCd: number; tgt: RivalEdible | null; closeCall: boolean; }
  const rivals: R[] = [];
  const eaten = (m: THREE.Object3D) => m.userData.eaten || !m.visible;
  const JOIN_TIMES = [4, 30, 65, 105, 145];   // the family arrives one by one

  for (let i = 0; i < count; i++) {
    const color = COLORS[i % COLORS.length];
    const { group, eyes, halo } = makeRivalMesh(color, i);
    scene.add(group); scene.add(halo);
    group.visible = halo.visible = false;   // hidden until they join the feast
    // spread rivals around the island away from the player start
    const ang = (i / count) * Math.PI * 2 + 0.6;
    rivals.push({ name: NAMES[i % NAMES.length], color, score: 0, r: START_R, group, eyes, halo,
      x: Math.cos(ang) * 150, z: Math.sin(ang) * 150, tx: 0, tz: 0, retarget: 0,
      joinAt: JOIN_TIMES[i % JOIN_TIMES.length], joined: false, stall: 0, ph: rand(0, 6), pulse: 0,
      vx: 0, vz: 0, biteCd: 0, respawnT: 0, speakCd: rand(4, 10), tgt: null, closeCall: false });
  }

  const tmp = new THREE.Vector3();
  const api: Rivals = {
    list: rivals,
    reset() {
      rivals.forEach((rv, i) => {
        const ang = (i / rivals.length) * Math.PI * 2 + 0.6;
        rv.x = Math.cos(ang) * 150; rv.z = Math.sin(ang) * 150;
        rv.r = START_R; rv.score = 0; rv.vx = 0; rv.vz = 0;
        rv.joined = false; rv.respawnT = 0; rv.biteCd = 0; rv.stall = 0; rv.pulse = 0;
        rv.group.visible = rv.halo.visible = false;
      });
    },
    update(dt, _t, px, pz, pr) {
      // rival-eaten props spiral down and shrink — cause and effect a kid can
      // SEE (they used to vanish in one frame, reading as a rendering bug)
      for (let i = shrinking.length - 1; i >= 0; i--) {
        const m = shrinking[i];
        m.scale.multiplyScalar(1 - dt * 4.5);
        m.position.y -= dt * 2.4;
        m.rotation.y += dt * 5;
        if (m.scale.x < 0.05) { m.visible = false; scene.remove(m); shrinking.splice(i, 1); }
      }
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
            const rr = rand(45, 80);   // near the player — a grumpy tiny rival re-entering IS a story
            rv.x = px + Math.cos(a2) * rr; rv.z = pz + Math.sin(a2) * rr;
            if (!biomeAt(rv.x, rv.z)) { rv.x = Math.cos(a2) * 100; rv.z = Math.sin(a2) * 100; }
            rv.group.visible = rv.halo.visible = true; rv.pulse = 1;
            api.onSpeak?.(rv.x, rv.z, pickLine(RIVAL_VOICE[rv.name].respawn));
          } else continue;
        }
        rv.biteCd = Math.max(0, rv.biteCd - dt);
        rv.speakCd = Math.max(0, rv.speakCd - dt);
        // AI: STICKY targeting — commit to a snack until it's gone/reached,
        // flee a much bigger player, and contest the player's size directly
        rv.retarget -= dt;
        // the player STOLE the snack this rival was beelining for — say so
        if (rv.tgt && eaten(rv.tgt.mesh)) {
          const sx2 = rv.tgt.mesh.position.x - px, sz2 = rv.tgt.mesh.position.z - pz;
          if (Math.hypot(sx2, sz2) < pr + 5 && rv.speakCd <= 0) {
            rv.speakCd = rand(6, 10);
            api.onSpeak?.(rv.x, rv.z, pickLine(RIVAL_VOICE[rv.name].steal));
          }
          rv.tgt = null;
        }
        const dpx = rv.x - px, dpz = rv.z - pz, dp = Math.hypot(dpx, dpz);
        const fleeing = pr > rv.r * 1.15 && dp < pr + 40;
        if (fleeing && dp < pr * 1.05) rv.closeCall = true;   // almost swallowed…
        if (rv.closeCall && dp > pr * 1.8) {                   // …and wriggled free
          rv.closeCall = false;
          if (rv.speakCd <= 0) { rv.speakCd = 8; api.onSpeak?.(rv.x, rv.z, pickLine(RIVAL_VOICE[rv.name].escape)); }
        }
        // drive-by size chirps — every close pass becomes a beat
        if (rv.speakCd <= 0 && dp < pr + rv.r + 6) {
          if (rv.r > pr * 1.15) { rv.speakCd = rand(12, 16); api.onSpeak?.(rv.x, rv.z, pickLine(RIVAL_VOICE[rv.name].nearBig)); }
          else if (rv.r < pr * 0.85) { rv.speakCd = rand(12, 16); api.onSpeak?.(rv.x, rv.z, pickLine(RIVAL_VOICE[rv.name].nearSmall)); }
        }
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
          if (best) { rv.tx = best.mesh.position.x; rv.tz = best.mesh.position.z; rv.tgt = best; }
          else if (rv.name === 'BITSY') { rv.tx = px + rand(-45, 45); rv.tz = pz + rand(-45, 45); rv.tgt = null; }   // the baby follows the player around
          else { const a3 = rand(0, Math.PI * 2); rv.tx = Math.cos(a3) * rand(40, 170); rv.tz = Math.sin(a3) * rand(40, 170); rv.tgt = null; }
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
          const pts = Math.round(100 + rv.r * 40);   // eating a hole is the marquee play
          api.onSpeak?.(rv.x, rv.z, pickLine(RIVAL_VOICE[rv.name].eaten));
          rv.group.visible = rv.halo.visible = false;
          rv.respawnT = 6; rv.r = START_R; rv.vx = rv.vz = 0;
          api.onRivalEaten?.(rv.name, pts);
          continue;
        }
        if (rv.r > pr * 1.2 && dp < rv.r * 0.85 && rv.biteCd <= 0) {
          rv.biteCd = 9; rv.pulse = 1;
          api.onSpeak?.(rv.x, rv.z, pickLine(RIVAL_VOICE[rv.name].bite));
          api.onPlayerBitten?.(rv.name);
        }

        // eat nearby food (size-gated) -> grow by area + score
        for (const e of edibles) {
          if (eaten(e.mesh) || e.radius > rv.r * EAT_RATIO) continue;
          const dx = e.mesh.position.x - rv.x, dz = e.mesh.position.z - rv.z;
          if (dx * dx + dz * dz < (rv.r + e.radius) ** 2) {
            e.mesh.userData.eaten = true;
            shrinking.push(e.mesh);   // animate out — buildings must never BLINK away
            rv.score += Math.max(1, Math.round(e.radius * 12));   // same points scale as the player
            rv.r = growR(rv.r, e.radius);
            rv.pulse = 1;   // visible gulp — the family EATS, not just exists
            if (e.radius > rv.r * 0.55 && rv.speakCd <= 0) {   // a BIG bite earns a taunt
              rv.speakCd = rand(9, 16);
              api.onSpeak?.(rv.x, rv.z, pickLine(RIVAL_VOICE[rv.name].taunt));
            }
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
        const aimX = dp < 30 ? (rv.x - px) / (dp || 1) * -1 : mx / md;   // it SAW you
        const wide = fleeing ? 1.28 : 1;
        rv.eyes.children.forEach((c, ci) => {
          if (ci >= 4) return;   // accessory shades stay put
          c.position.x = (c.position.x < 0 ? -0.32 : 0.32) + THREE.MathUtils.clamp(aimX * 0.06, -0.06, 0.06);
          if (ci % 2 === 0) c.scale.setScalar(wide);   // scared stare
        });
        rv.halo.position.set(rv.x, 0.14, rv.z); rv.halo.scale.setScalar(rv.r * 1.5);
        void tmp;
      }
    },
  };
  return api;
}
