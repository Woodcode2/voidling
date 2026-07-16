// The VOIDLING void, in 3D — a faithful port of the 2D "pit into space" orb.
// The 2D orb is a flat radial gradient: darkest dead-centre, lit violet at the
// rim. On a real sphere that IS a fresnel term (dark where the surface faces the
// camera, bright at the silhouette), so the body is a custom fresnel shader —
// not a lit glossy sphere. Face is a billboarded set of crisp flat features,
// exactly like the 2D canvas draw.
import * as THREE from 'three';
import { VOID, VOID_COL } from './palette';

export interface VoidState {
  t: number;        // seconds clock
  x: number; z: number;
  vx: number; vz: number;   // world velocity (units/s)
  lookX: number; lookY: number; // aim -1..1 for pupil tracking
}

export interface Void3D {
  group: THREE.Group;
  radius: number;
  setRadius(r: number): void;
  setStage(n: number): void;
  chomp(): void;             // quick mouth-open bite (on eat)
  animGulp(): void;          // big gape + hold (GULP)
  animDash(): void;          // stretch pulse (ROCKET BITE)
  animCollapse(): void;      // inhale-shrink then burst (COLLAPSE)
  update(dt: number, s: VoidState): void;
}

const RADIUS_SINK = 0.9;   // how much of the orb sits above ground (rest sinks)

export function createVoid(scene: THREE.Scene, camera: THREE.Camera): Void3D {
  const group = new THREE.Group();
  scene.add(group);

  // bob holds the body + glow; it gets squash/stretch. Face is separate (uniform).
  const bob = new THREE.Group();
  group.add(bob);

  // ── body: fresnel "pit into space" ────────────────────────────────────────
  const bodyMat = new THREE.ShaderMaterial({
    uniforms: {
      uAbyss: { value: VOID_COL.abyss },
      uInner: { value: new THREE.Color(VOID.bodyInner) },
      uMid: { value: VOID_COL.bodyMid },
      uRim: { value: VOID_COL.bodyRim },
      uSwirl: { value: new THREE.Color(VOID.swirl) },
      uTime: { value: 0 },
    },
    vertexShader: `
      varying vec3 vN; varying vec3 vView; varying vec3 vObj;
      void main(){
        vN = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(position,1.0);
        vView = normalize(-mv.xyz);
        vObj = position;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      varying vec3 vN; varying vec3 vView; varying vec3 vObj;
      uniform vec3 uAbyss; uniform vec3 uInner; uniform vec3 uMid; uniform vec3 uRim; uniform vec3 uSwirl;
      uniform float uTime;
      // cheap hash for star specks
      float hash(vec2 p){ return fract(sin(dot(p, vec2(41.31, 289.17))) * 43758.5453); }
      void main(){
        // screen-space radius: 0 at disc centre, 1 at the silhouette. This
        // reproduces the 2D canvas radial gradient (radial in screen space).
        float d = clamp(dot(normalize(vN), normalize(vView)), 0.0, 1.0);
        float u = sqrt(max(0.0, 1.0 - d * d));
        // stops tuned for a soft medium-VIOLET orb with a gently dark core
        vec3 col = mix(uAbyss, uInner, smoothstep(0.0, 0.32, u));
        col = mix(col, uMid, smoothstep(0.30, 0.64, u));
        col = mix(col, uRim, smoothstep(0.62, 1.0, u));
        col *= 1.0;
        // luminous event-horizon rim-light (gentle)
        col += uRim * pow(u, 3.8) * 0.3;
        // faint interior galaxy swirl (subtle, alive)
        float ang = atan(vObj.y, vObj.x) + uTime * 0.3;
        float sw = sin(ang * 2.0 + u * 7.0) * 0.5 + 0.5;
        col += uSwirl * sw * (1.0 - u) * 0.06;
        // ✦ interior star specks — twinkling, concentrated toward the dark core
        vec2 sc = vObj.xy * 12.0;
        vec2 cell = floor(sc);
        float h = hash(cell);
        if (h > 0.93) {
          vec2 f = fract(sc) - 0.5;
          float dot2 = 1.0 - smoothstep(0.0, 0.18, length(f));
          float tw = 0.4 + 0.6 * sin(uTime * 3.0 + h * 40.0);
          col += vec3(0.95, 0.9, 1.0) * dot2 * tw * (1.0 - u * 0.55) * 1.1;
        }
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 48), bodyMat);
  bob.add(body);

  // ── glow shell: tight additive lavender halo (the 2D #B388FF rings) ────────
  const glowMat = new THREE.ShaderMaterial({
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.BackSide,
    uniforms: {
      uColor: { value: VOID_COL.glow },
      uPower: { value: 4.2 },        // very tight -> a thin violet rim, never a white halo
      uIntensity: { value: 0.5 },
    },
    vertexShader: `
      varying vec3 vN; varying vec3 vView;
      void main(){
        vN = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(position,1.0);
        vView = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      varying vec3 vN; varying vec3 vView;
      uniform vec3 uColor; uniform float uPower; uniform float uIntensity;
      void main(){
        float f = pow(1.0 - abs(dot(normalize(vN), normalize(vView))), uPower);
        gl_FragColor = vec4(uColor, f * uIntensity);
      }
    `,
  });
  const glow = new THREE.Mesh(new THREE.SphereGeometry(1.08, 48, 36), glowMat);
  bob.add(glow);

  // bloom sprite: a soft radial glow billboard behind the orb — reads as real
  // bloom on the void without post-processing washing out the sunlit world
  const bloomTex = (() => {
    const cv = document.createElement('canvas'); cv.width = cv.height = 256;
    const x = cv.getContext('2d')!;
    const gr = x.createRadialGradient(128, 128, 30, 128, 128, 128);
    const c = new THREE.Color(VOID.glow);
    const rgb = `${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)}`;
    gr.addColorStop(0, `rgba(${rgb},0.30)`);
    gr.addColorStop(0.45, `rgba(${rgb},0.10)`);
    gr.addColorStop(1, `rgba(${rgb},0)`);
    x.fillStyle = gr; x.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(cv);
  })();
  const bloomSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: bloomTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  bloomSprite.renderOrder = -1;   // behind the body
  group.add(bloomSprite);

  // ── ground halo (violet) + contact shadow, in scene-floor space ───────────
  // ground halo: a soft radial-gradient violet stain (NOT a hard bright disc)
  const haloTex = (() => {
    const cv = document.createElement('canvas'); cv.width = cv.height = 128;
    const x = cv.getContext('2d')!;
    const gr = x.createRadialGradient(64, 64, 18, 64, 64, 64);
    gr.addColorStop(0, 'rgba(122,79,224,0.30)');
    gr.addColorStop(0.55, 'rgba(122,79,224,0.12)');
    gr.addColorStop(1, 'rgba(122,79,224,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(cv);
  })();
  const halo = new THREE.Mesh(
    new THREE.CircleGeometry(1, 48),
    new THREE.MeshBasicMaterial({ map: haloTex, transparent: true, depthWrite: false }),
  );
  halo.rotation.x = -Math.PI / 2; halo.position.y = 0.08; scene.add(halo);
  const contact = new THREE.Mesh(
    new THREE.CircleGeometry(1, 40),
    new THREE.MeshBasicMaterial({ color: 0x160a30, transparent: true, opacity: 0.32, depthWrite: false }),
  );
  contact.rotation.x = -Math.PI / 2; contact.position.y = 0.05; scene.add(contact);

  // ── face: crisp billboarded flat features (matches 2D canvas) ─────────────
  const face = new THREE.Group();
  group.add(face);
  const flat = (r: number, col: number, opacity = 1) =>
    new THREE.Mesh(new THREE.CircleGeometry(r, 56), new THREE.MeshBasicMaterial({ color: col, transparent: opacity < 1, opacity, depthWrite: false }));

  // eyes: dark outline ring + sclera + tracking pupil + catchlight (2D spec)
  interface Eye { g: THREE.Group; sclera: THREE.Group; pupilGrp: THREE.Group; }
  const eyes: Eye[] = [];
  for (const sx of [-0.36, 0.36]) {
    const g = new THREE.Group();
    const sclera = new THREE.Group(); sclera.position.z = 1.0;
    const outline = flat(0.225, 0x231a3d, 0.5); outline.position.z = -0.005;
    const white = flat(0.21, VOID.sclera);
    sclera.add(outline); sclera.add(white);
    const pupilGrp = new THREE.Group(); pupilGrp.position.z = 1.02;
    const pupil = flat(0.118, VOID.pupil);
    const catch_ = flat(0.046, 0xffffff); catch_.position.set(-0.038, 0.043, 0.01);
    const catch2 = flat(0.02, 0xffffff); catch2.position.set(0.032, -0.03, 0.01);
    pupilGrp.add(pupil); pupilGrp.add(catch_); pupilGrp.add(catch2);
    g.add(sclera); g.add(pupilGrp);
    g.position.set(sx, 0.06, 0);
    face.add(g); eyes.push({ g, sclera, pupilGrp });
  }
  // blush (pink, soft)
  for (const sx of [-0.5, 0.5]) {
    const b = flat(0.15, VOID.blush, 0.5);
    b.scale.set(1.06, 0.72, 1); b.position.set(sx, -0.2, 0.99);
    face.add(b);
  }
  // smiling mouth — a crisp torus arc; plus an "open" mouth (dark maw + tongue)
  // that scales in when eating or firing GULP
  const mouth = new THREE.Mesh(
    new THREE.TorusGeometry(0.22, 0.034, 12, 48, Math.PI),
    new THREE.MeshBasicMaterial({ color: VOID.mouth, depthWrite: false }),
  );
  mouth.rotation.z = Math.PI; mouth.position.set(0, -0.28, 1.0);
  face.add(mouth);
  const maw = new THREE.Group(); maw.position.set(0, -0.3, 1.01); maw.scale.setScalar(0.001);
  const mawDark = flat(0.2, 0x2a0e2e); mawDark.scale.set(1, 1.15, 1);
  const tongue = flat(0.12, 0xff6f91); tongue.position.set(0, -0.09, 0.01); tongue.scale.set(1.15, 0.7, 1);
  maw.add(mawDark); maw.add(tongue);
  face.add(maw);

  // ── evolution rings (Saturn-style) — appear only at higher forms ──────────
  const rings = new THREE.Group();
  group.add(rings);
  const ringMats: THREE.MeshBasicMaterial[] = [];
  for (let i = 0; i < 2; i++) {
    const rm = new THREE.MeshBasicMaterial({ color: VOID.glow, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const rg = new THREE.Mesh(new THREE.TorusGeometry(1.34 + i * 0.16, 0.028, 8, 72), rm);
    rg.rotation.x = Math.PI / 2 - 0.55 - i * 0.12;  // tilted like an orbit
    rings.add(rg); ringMats.push(rm);
  }

  let radius = 4;
  let stage = 0, ringFade = 0;
  let moveAmt = 0, blinkT = 3 + Math.random() * 3, blink = 0;
  let mouthT = 0, mouthMax = 0;    // open-mouth envelope
  let stretchT = 0;                // rocket stretch pulse
  let inhaleT = 0;                 // collapse inhale->burst envelope

  const api: Void3D = {
    group,
    get radius() { return radius; },
    set radius(r: number) { radius = r; },
    setRadius(r: number) { radius = r; },
    setStage(n: number) { stage = n; },
    chomp() { if (mouthT < 0.22) { mouthT = 0.22; mouthMax = 0.55; } },
    animGulp() { mouthT = 0.6; mouthMax = 1; },
    animDash() { stretchT = 0.5; mouthT = Math.max(mouthT, 0.4); mouthMax = 0.8; },
    animCollapse() { inhaleT = 0.9; mouthT = 0.9; mouthMax = 1; },
    update(dt, s) {
      bodyMat.uniforms.uTime.value = s.t;

      // evolution rings + glow intensify with the form (rings are a child of the
      // group, which is positioned below; keep them local + centred on the orb)
      const targetRing = stage >= 2 ? Math.min(0.7, (stage - 1) * 0.3) : 0;
      ringFade += (targetRing - ringFade) * Math.min(1, dt * 3);
      rings.scale.setScalar(radius);
      rings.rotation.y += dt * 0.5;
      ringMats.forEach((m, i) => { m.opacity = ringFade * (1 - i * 0.35); });
      glowMat.uniforms.uIntensity.value = 0.5 + stage * 0.13;

      const speed = Math.hypot(s.vx, s.vz);
      moveAmt += (Math.min(1, speed / 40) - moveAmt) * Math.min(1, dt * 6);

      // lift so the orb rests partly sunk into the ground; roll-bob while moving
      const lift = radius * (RADIUS_SINK + Math.abs(Math.sin(s.t * 6)) * moveAmt * 0.05);
      group.position.set(s.x, lift, s.z);

      // squash/stretch + lean on the bob (body+glow only) — gentle, so the orb
      // stays a cute round orb, never pinched
      const breathe = Math.sin(s.t * 2.2) * 0.016;
      let stretch = 1 + moveAmt * 0.05 - breathe;
      let squash = 1 - moveAmt * 0.045 + breathe;
      // power envelopes
      if (stretchT > 0) {           // ROCKET BITE: lunge-stretch pulse
        stretchT -= dt;
        const k = Math.sin(Math.max(0, stretchT) / 0.5 * Math.PI) * 0.2;
        stretch += k; squash -= k * 0.7;
      }
      if (inhaleT > 0) {            // COLLAPSE: inhale-shrink, then burst back
        inhaleT -= dt;
        const ph = 1 - Math.max(0, inhaleT) / 0.9;
        const k = ph < 0.62 ? -0.24 * (ph / 0.62) : -0.24 + 0.42 * ((ph - 0.62) / 0.38);
        stretch += k; squash += k;
      }
      bob.scale.set(radius * stretch, radius * squash, radius * stretch);
      bob.rotation.z = THREE.MathUtils.clamp(-s.vx / 520, -0.11, 0.11);
      bob.rotation.x = THREE.MathUtils.clamp(s.vz / 520, -0.11, 0.11);

      // face: billboard to camera, scale with the void
      face.scale.setScalar(radius);
      face.position.set(0, radius * 0.1, 0);
      face.quaternion.copy(camera.quaternion);

      // mouth: maw scales in while open, smile hides
      if (mouthT > 0) mouthT -= dt;
      const mo = mouthT > 0 ? mouthMax * Math.min(1, mouthT * 8) : 0;
      maw.scale.setScalar(Math.max(0.001, mo));
      mouth.visible = mo < 0.25;

      // pupil tracking + blink
      blinkT -= dt;
      if (blinkT <= 0 && blink <= 0) { blink = 0.16; blinkT = 2.5 + Math.random() * 4; }
      let open = 1;
      if (blink > 0) { blink -= dt; open = Math.abs(blink - 0.08) / 0.08; }
      for (const e of eyes) {
        e.pupilGrp.position.x = s.lookX * 0.09;
        e.pupilGrp.position.y = 0.06 + s.lookY * 0.06;
        const oy = Math.max(0.08, open);
        e.sclera.scale.y = oy; e.pupilGrp.scale.y = oy;
      }

      // ground halo + contact track the void on the floor
      halo.position.set(s.x, 0.08, s.z); halo.scale.setScalar(radius * 1.35);
      contact.position.set(s.x, 0.05, s.z); contact.scale.setScalar(radius * 1.02);

      // bloom sprite hugs the orb (pulses gently, swells with the stage)
      const bs = radius * (2.0 + stage * 0.14) * (1 + Math.sin(s.t * 1.7) * 0.03);
      bloomSprite.scale.set(bs, bs, 1);
    },
  };

  return api;
}
