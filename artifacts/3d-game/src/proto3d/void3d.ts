// The VOIDLING void, in 3D — a faithful port of the 2D "pit into space" orb.
// The 2D orb is a flat radial gradient: darkest dead-centre, lit violet at the
// rim. On a real sphere that IS a fresnel term (dark where the surface faces the
// camera, bright at the silhouette), so the body is a custom fresnel shader —
// not a lit glossy sphere. Face is a billboarded set of crisp flat features,
// exactly like the 2D canvas draw.
import * as THREE from 'three';
import { VOID, VOID_COL, type Skin } from './palette';

export interface VoidState {
  t: number;        // seconds clock
  x: number; z: number;
  vx: number; vz: number;   // world velocity (units/s)
  lookX: number; lookY: number; // aim -1..1 for pupil tracking
}

export type Mood = 'cruise' | 'hungry' | 'frenzy' | 'scared' | 'hurt' | 'smug' | 'sleepy' | 'victory';

export interface Void3D {
  group: THREE.Group;
  radius: number;
  setRadius(r: number): void;
  setStage(n: number): void;
  setSkin(s: Skin): void;    // recolour body/glow/halo/rings to a skin
  setMood(m: Mood): void;    // the emotional state machine's current state
  chomp(): void;             // quick mouth-open bite (on eat)
  animGulp(): void;          // big gape + hold (GULP)
  animDash(): void;          // stretch pulse (ROCKET BITE)
  animCollapse(): void;      // inhale-shrink then burst (COLLAPSE)
  update(dt: number, s: VoidState): void;
}

const RADIUS_SINK = 0.9;   // how much of the orb sits above ground (rest sinks)
const texCache = new Map<string, THREE.Texture>();   // premium skin textures

export function createVoid(scene: THREE.Scene, camera: THREE.Camera): Void3D {
  const group = new THREE.Group();
  scene.add(group);

  // bob holds the body + glow; it gets squash/stretch. Face is separate (uniform).
  const bob = new THREE.Group();
  group.add(bob);

  // ── body: fresnel "pit into space" ────────────────────────────────────────
  const whiteTex = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
  whiteTex.needsUpdate = true;
  const bodyMat = new THREE.ShaderMaterial({
    uniforms: {
      uAbyss: { value: VOID_COL.abyss },
      uInner: { value: new THREE.Color(VOID.bodyInner) },
      uMid: { value: VOID_COL.bodyMid },
      uRim: { value: VOID_COL.bodyRim },
      uSwirl: { value: new THREE.Color(VOID.swirl) },
      uTime: { value: 0 },
      uTex: { value: whiteTex },      // premium skin texture (AI-generated)
      uTexAmt: { value: 0 },
      uStars: { value: whiteTex },    // AI starfield living inside the pit
      uStarAmt: { value: 0 },
      uStage: { value: 0 },
      uWobble: { value: 0 },          // jelly amplitude — spikes on every eat
    },
    vertexShader: `
      varying vec3 vN; varying vec3 vView; varying vec3 vObj; varying vec2 vUv;
      uniform float uTime; uniform float uWobble;
      void main(){
        vN = normalize(normalMatrix * normal);
        // FLUID BODY: low-frequency jelly waves ride the surface — a faint
        // liquid idle so the void never sits static, and a big slosh (uWobble)
        // every time it absorbs something. The blob visibly digests its meals.
        float wob =
            sin(position.y * 3.1 + uTime * 5.0)
          * sin(position.x * 2.6 - uTime * 4.1)
          + 0.6 * sin((position.x + position.z) * 4.2 + uTime * 6.3);
        vec3 pos = position * (1.0 + wob * (0.012 + uWobble * 0.06));
        vec4 mv = modelViewMatrix * vec4(pos,1.0);
        vView = normalize(-mv.xyz);
        vObj = pos;
        vUv = uv;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      varying vec3 vN; varying vec3 vView; varying vec3 vObj; varying vec2 vUv;
      uniform vec3 uAbyss; uniform vec3 uInner; uniform vec3 uMid; uniform vec3 uRim; uniform vec3 uSwirl;
      uniform float uTime; uniform sampler2D uTex; uniform float uTexAmt;
      uniform sampler2D uStars; uniform float uStarAmt; uniform float uStage;
      // cheap hash for star specks
      float hash(vec2 p){ return fract(sin(dot(p, vec2(41.31, 289.17))) * 43758.5453); }
      // value noise for the HD nebula wisps (procedural — crisp at any zoom)
      float vnoise(vec2 p){
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float a = hash(i), b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0)), d2 = hash(i + vec2(1.0, 1.0));
        return mix(mix(a, b, f.x), mix(c, d2, f.x), f.y);
      }
      void main(){
        // screen-space radius: 0 at disc centre, 1 at the silhouette. This
        // reproduces the 2D canvas radial gradient (radial in screen space).
        float d = clamp(dot(normalize(vN), normalize(vView)), 0.0, 1.0);
        float u = sqrt(max(0.0, 1.0 - d * d));
        // stops tuned CUTE: the dark heart is small, the visible disc reads as
        // a bright plush purple that lifts quickly toward the lit rim
        vec3 col = mix(uAbyss, uInner, smoothstep(0.0, 0.18, u));
        col = mix(col, uMid, smoothstep(0.15, 0.52, u));
        col = mix(col, uRim, smoothstep(0.55, 1.0, u));
        col *= 1.0;
        // premium skin: wrap the AI texture around the orb (slow drift), keep
        // the darker core + lit rim so it still reads as a VOID
        if (uTexAmt > 0.01) {
          vec3 tc = texture2D(uTex, vec2(vUv.x + uTime * 0.012, vUv.y)).rgb;
          col = mix(col, tc * (0.34 + 0.9 * u), uTexAmt);
        }
        // ✨ a real galaxy inside: AI starfield drifting slowly through the dark
        // core, fading toward the lit rim so depth reads as "pit into space"
        if (uStarAmt > 0.01) {
          vec3 st = texture2D(uStars, vec2(vUv.x * 2.0 + uTime * 0.006, vUv.y * 2.0 - uTime * 0.003)).rgb;
          col += st * st * uStarAmt * (1.0 - u) * 0.9;   // st*st: keep only the bright stars, drop the nebula haze
        }
        float ang = atan(vObj.y, vObj.x) + uTime * 0.3;
        // ☁️ HD nebula wisps: two octaves of drifting value noise in the dark
        // core — the "living galaxy inside" reads at every zoom, no asset needed
        vec2 np = vObj.xy * 2.6 + vec2(uTime * 0.05, -uTime * 0.03);
        float neb = vnoise(np) * 0.6 + vnoise(np * 2.3 + 7.7) * 0.4;
        neb = smoothstep(0.45, 0.85, neb);
        col += mix(uInner, uSwirl, 0.6) * neb * (1.0 - u) * 0.35;
        // luminous event-horizon rim-light — intensifies with each evolution
        col += uRim * pow(u, 3.2) * (0.36 + uStage * 0.05);
        // 🌈 iridescent horizon: a slow pink↔violet shimmer riding the last few
        // degrees of the silhouette (premium toy-gloss, kills the flat rim band)
        vec3 iri = mix(uRim, vec3(1.0, 0.62, 0.9), 0.5 + 0.5 * sin(ang * 3.0 + uTime * 0.8));
        col += iri * pow(u, 6.0) * 0.18;
        // faint interior galaxy swirl (subtle, alive)
        float sw = sin(ang * 2.0 + u * 7.0) * 0.5 + 0.5;
        col += uSwirl * sw * (1.0 - u) * (0.06 + uStage * 0.015);
        // glossy toy catchlight + soft opposite fill (the key-art polish)
        vec3 L = normalize(vec3(-0.45, 0.74, 0.5));
        float spec = pow(max(dot(normalize(vN), L), 0.0), 30.0);
        col += vec3(1.0, 0.97, 1.0) * spec * 0.26;
        vec3 L2 = normalize(vec3(0.55, 0.28, 0.55));
        col += vec3(0.82, 0.76, 1.0) * pow(max(dot(normalize(vN), L2), 0.0), 14.0) * 0.08;
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
        // second, finer star layer — HD depth (tiny fast twinkles between the big ones)
        vec2 sc2 = vObj.xy * 26.0 + 3.7;
        vec2 cell2 = floor(sc2);
        float h2 = hash(cell2);
        if (h2 > 0.955) {
          vec2 f2 = fract(sc2) - 0.5;
          float dot3 = 1.0 - smoothstep(0.0, 0.28, length(f2));
          col += vec3(0.9, 0.85, 1.0) * dot3 * (0.5 + 0.5 * sin(uTime * 5.0 + h2 * 60.0)) * (1.0 - u) * 0.55;
        }
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 72), bodyMat);
  bob.add(body);

  // the interior starfield (Higgsfield seamless texture) — engages on load,
  // shader keeps the gradient look until then (offline dev stays clean)
  {
    const src = '/assets/hf/hf_20260717_025459_0c14ef07-9609-491e-aa5c-87a80998c65d.png';
    const t = new THREE.TextureLoader().load(src, () => { bodyMat.uniforms.uStarAmt.value = 1; });
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    texCache.set(src, t);
    bodyMat.uniforms.uStars.value = t;
  }

  // (The old translucent glow SHELL read as a soap-bubble outline around the
  // orb — killed. The rim light lives in the body shader; ambient glow comes
  // from the bloom sprite only, so the silhouette stays razor crisp.)
  const glowMat = { uniforms: { uColor: { value: VOID_COL.glow.clone() }, uIntensity: { value: 0.5 } } };

  // bloom sprite: a soft radial glow billboard behind the orb — reads as real
  // bloom on the void without post-processing washing out the sunlit world
  // (baked WHITE, tinted via material.color — so skins can recolour it live)
  const softRadialTex = (size: number, a0: number, a1: number, inner: number) => {
    const cv = document.createElement('canvas'); cv.width = cv.height = size;
    const x = cv.getContext('2d')!;
    const gr = x.createRadialGradient(size / 2, size / 2, inner, size / 2, size / 2, size / 2);
    gr.addColorStop(0, `rgba(255,255,255,${a0})`);
    gr.addColorStop(0.5, `rgba(255,255,255,${a1})`);
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = gr; x.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(cv);
  };
  // NO screen-space aura AT ALL: the bloom sprite and the x-ray ghost ring
  // both read as a "white circle glued around the void" on phone screens —
  // dimming them wasn't enough, so they're gone. The shader's own rim light
  // is the only glow; the silhouette is razor crisp against any ground.

  // ── contact shadow, in scene-floor space ──────────────────────────────────
  // (The old ground-halo colour disc is GONE — over pale asphalt it read as a
  // rough white circle glued around the hero. The dark contact shadow grounds
  // him; the bloom sprite carries what little aura remains.)
  const contact = new THREE.Mesh(
    new THREE.CircleGeometry(1, 40),
    new THREE.MeshBasicMaterial({ map: softRadialTex(128, 0.55, 0.28, 12), color: 0x160a30, transparent: true, opacity: 0.6, depthWrite: false }),
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
    // crisp full-opacity outline ring (not a translucent blur disc)
    const outline = new THREE.Mesh(new THREE.RingGeometry(0.198, 0.218, 56),
      new THREE.MeshBasicMaterial({ color: 0x2a1f45, depthWrite: false }));
    outline.position.z = 0.005;
    const white = flat(0.21, VOID.sclera);
    sclera.add(white); sclera.add(outline);
    const pupilGrp = new THREE.Group(); pupilGrp.position.z = 1.02;
    // KEY-ART eye: clean white sclera + big dark pupil + twin catchlights.
    // (The old violet iris ring read as a hazy glow over the whole eye — cut.)
    const pupil = flat(0.128, VOID.pupil);
    const catch_ = flat(0.046, 0xffffff); catch_.position.set(-0.038, 0.042, 0.01);
    const catch2 = flat(0.018, 0xffffff); catch2.position.set(0.032, -0.03, 0.01);
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
  // smiling mouth — the KEY-ART kawaii open smile: a soft plum half-disc with
  // a little pink tongue. (The old thin torus arc curled up hard at both ends
  // — read as a too-wide clown grin.) Plus the big "maw" that scales in when
  // eating or firing GULP.
  const mouth = new THREE.Group();
  {
    // upper semicircle; the group's PI rotation (below) hangs the dome down
    const lip = new THREE.Mesh(new THREE.CircleGeometry(0.165, 40, 0, Math.PI),
      new THREE.MeshBasicMaterial({ color: VOID.mouth, depthWrite: false }));
    const tongue = new THREE.Mesh(new THREE.CircleGeometry(0.09, 24),
      new THREE.MeshBasicMaterial({ color: 0xff6f91, depthWrite: false }));
    tongue.scale.set(1.35, 0.6, 1); tongue.position.set(0, 0.075, 0.004);
    mouth.add(lip); mouth.add(tongue);
  }
  mouth.rotation.z = Math.PI; mouth.position.set(0, -0.26, 1.0);
  face.add(mouth);
  const maw = new THREE.Group(); maw.position.set(0, -0.3, 1.01); maw.scale.setScalar(0.001);
  const mawDark = flat(0.2, 0x2a0e2e); mawDark.scale.set(1, 1.15, 1);
  const tongue = flat(0.12, 0xff6f91); tongue.position.set(0, -0.09, 0.01); tongue.scale.set(1.15, 0.7, 1);
  maw.add(mawDark); maw.add(tongue);
  face.add(maw);

  // ── EXPRESSION RIG: brows / sweat / zzz — the mood system's extra parts ────
  // (flat meshes inside the billboarded face group: cheap, always camera-true)
  const browMat = new THREE.MeshBasicMaterial({ color: 0x2a1f45, transparent: true, opacity: 0, depthWrite: false });
  const brows: THREE.Mesh[] = [];
  for (const sx of [-0.36, 0.36]) {
    const bw = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.06), browMat);
    bw.position.set(sx, 0.4, 1.0);
    face.add(bw); brows.push(bw);
  }
  const emoteTex = (txt: string) => {
    const cv = document.createElement('canvas'); cv.width = cv.height = 64;
    const g = cv.getContext('2d')!;
    g.font = '46px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(txt, 32, 36);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  const sweat = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3),
    new THREE.MeshBasicMaterial({ map: emoteTex('💧'), transparent: true, opacity: 0, depthWrite: false }));
  sweat.position.set(0.62, 0.52, 1.02); face.add(sweat);
  const zzz = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.42),
    new THREE.MeshBasicMaterial({ map: emoteTex('💤'), transparent: true, opacity: 0, depthWrite: false }));
  zzz.position.set(0.55, 0.92, 1.0); face.add(zzz);
  // remember the blush materials — moods flush and fade the cheeks
  const blushMats: THREE.MeshBasicMaterial[] = [];
  face.children.forEach((c) => {
    const m = (c as THREE.Mesh).material as THREE.MeshBasicMaterial | undefined;
    if (m && m.color && m.color.getHex() === VOID.blush) blushMats.push(m);
  });

  // ── MOOD ENGINE: the void ACTS. Targets per mood, lerped so expressions
  // melt into each other instead of snapping.
  let mood: Mood = 'cruise';
  let moodT = 0;
  let stageBoost = 1;   // pupil boost from evolution stage (was set directly)
  const mp = { lid: 1, pupil: 1, wide: 1, smile: 1, mouthY: 1, smirk: 0, brow: 0, browAng: 0, browY: 0.4, maw: 0, blush: 0.5, sweat: 0, zzz: 0, bounce: 0 };
  const MOODS: Record<Mood, Partial<typeof mp>> = {
    cruise:  {},
    hungry:  { pupil: 1.28, smile: 1.1, maw: 0.26, brow: 0.85, browAng: 0.12, browY: 0.45, blush: 0.6 },
    frenzy:  { pupil: 1.35, smile: 1.42, wide: 1.05, blush: 0.85, brow: 0.85, browAng: 0.18, browY: 0.47, maw: 0.12, bounce: 1 },
    scared:  { wide: 1.16, pupil: 0.55, smile: 0.85, mouthY: -0.65, brow: 1, browAng: -0.5, browY: 0.43, sweat: 1, blush: 0.3 },
    hurt:    { lid: 0.3, mouthY: -0.8, smile: 0.8, brow: 1, browAng: -0.6, browY: 0.38, sweat: 1, blush: 0.35 },
    smug:    { lid: 0.55, smile: 1.15, smirk: 0.2, brow: 0.7, browAng: 0.04, browY: 0.33, blush: 0.7 },
    sleepy:  { lid: 0.35, smile: 0.95, pupil: 0.9, zzz: 1 },
    victory: { pupil: 1.35, wide: 1.06, smile: 1.5, blush: 0.9, maw: 0.18, brow: 0.85, browAng: 0.2, browY: 0.47, bounce: 1 },
  };
  const BASE = { ...mp };
  // direction-flip anticipation squash
  let pvx = 0, pvz = 0, flipT = 0;

  // ── legendary accessories: 3D flair that rides (and squashes with) the orb ──
  const acc: Record<string, THREE.Group> = {};
  {
    for (const name of ['unicorn', 'dino', 'wizard', 'dragon', 'mecha', 'ninja', 'king']) {
      const g = buildAccessory(name);
      g.visible = false;
      bob.add(g); acc[name] = g;
    }
  }

  // ── evolution ring — ONE crisp thin ribbon, normal blending so it reads as
  // a saturated violet band (additive washed to white over bright ground)
  const rings = new THREE.Group();
  group.add(rings);
  const ringMats: THREE.MeshBasicMaterial[] = [];
  {
    const rm = new THREE.MeshBasicMaterial({ color: VOID.glow, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
    const rg = new THREE.Mesh(new THREE.TorusGeometry(1.42, 0.03, 8, 96), rm);
    rg.rotation.x = Math.PI / 2 - 0.5;
    rings.add(rg); ringMats.push(rm);
    // faint companion band just outside — subtle depth, same crispness
    const rm2 = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
    const rg2 = new THREE.Mesh(new THREE.TorusGeometry(1.52, 0.014, 8, 96), rm2);
    rg2.rotation.x = Math.PI / 2 - 0.5;
    rings.add(rg2); ringMats.push(rm2);
  }
  // ✦ orbiting star sparkles riding the evolution ring — they flare on every
  // evolution and stay twinkling once the ring is earned (stage 2+)
  const starTex = (() => {
    const cv = document.createElement('canvas'); cv.width = cv.height = 64;
    const x = cv.getContext('2d')!;
    x.translate(32, 32); x.fillStyle = '#ffffff';
    x.beginPath();
    for (let i = 0; i < 4; i++) {
      x.moveTo(0, 0); x.quadraticCurveTo(5, -5, 0, -26); x.quadraticCurveTo(-5, -5, 0, 0);
      x.rotate(Math.PI / 2);
    }
    x.fill();
    return new THREE.CanvasTexture(cv);
  })();
  const orbit = new THREE.Group();
  orbit.rotation.x = Math.PI / 2 - 0.5;   // ride the same tilt as the ring ribbon
  rings.add(orbit);
  const orbStars: THREE.Sprite[] = [];
  for (let i = 0; i < 6; i++) {
    const sm = new THREE.SpriteMaterial({ map: starTex, color: VOID.glow, transparent: true, opacity: 0, depthWrite: false });
    const sp = new THREE.Sprite(sm);
    const a = (i / 6) * Math.PI * 2;
    sp.position.set(Math.cos(a) * 1.42, Math.sin(a) * 1.42, 0);
    sp.scale.setScalar(0.16);
    orbit.add(sp); orbStars.push(sp);
  }

  let radius = 4;
  // AAA growth feel: gameplay radius is the TARGET; what you SEE is a spring
  // chasing it with a slight underdamp — every meal lands as a visible jiggly
  // swell-and-settle instead of an imperceptible creep. Big jumps (rematch,
  // debug warp) snap so the spring never animates across half the island.
  let dispR = 4, dispV = 0;
  let wobble = 0;   // jelly slosh amplitude (decays after each eat)
  let stage = 0, ringFade = 0;
  let moveAmt = 0, blinkT = 3 + Math.random() * 3, blink = 0;
  let mouthT = 0, mouthMax = 0;    // open-mouth envelope
  let stretchT = 0;                // rocket stretch pulse
  let inhaleT = 0;                 // collapse inhale->burst envelope
  let evolveT = 0;                 // evolution celebration pop
  let ringBurst = 0;               // ring + star flare on evolve
  let skinHasTex = false;

  const api: Void3D = {
    group,
    get radius() { return radius; },
    set radius(r: number) { radius = r; },
    setRadius(r: number) { radius = r; },
    setMood(m) { if (m !== mood) { mood = m; moodT = 0; } },
    setStage(n: number) {
      if (n < stage) {   // instant rematch: shed the late-form dressing
        stageBoost = n >= 1 ? 1.15 : 1;
        if (!skinHasTex) bodyMat.uniforms.uTexAmt.value = 0;
        bodyMat.uniforms.uStage.value = n;
        ringBurst = 0;
      }
      if (n > stage) {
        evolveT = 0.7;   // celebratory pop on every evolution
        wobble = 1;      // full-body jelly slosh — the form-change feels physical
        ringBurst = 1;   // ring + orbit stars flare outward
        bodyMat.uniforms.uStage.value = n;
        // each form gets a stronger presence: pupils grow (2D rule), rim/glow
        // intensify; WORLD ENDER becomes a living galaxy (auto nebula wrap)
        stageBoost = n >= 1 ? 1.15 : 1;
        if (n >= 4 && !skinHasTex) {
          const nebSrc = '/assets/hf/hf_20260717_005240_697d3ae9-f61f-4f42-8ece-3b2413779221.png';
          let t = texCache.get(nebSrc);
          if (!t) {
            t = new THREE.TextureLoader().load(nebSrc, () => { if (stage >= 4 && !skinHasTex) bodyMat.uniforms.uTexAmt.value = 0.55; });
            t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.ClampToEdgeWrapping;
            t.colorSpace = THREE.SRGBColorSpace;
            texCache.set(nebSrc, t);
          }
          bodyMat.uniforms.uTex.value = t;
          if (t.image) bodyMat.uniforms.uTexAmt.value = 0.55;
        }
      }
      stage = n;
    },
    setSkin(s: Skin) {
      bodyMat.uniforms.uAbyss.value.set(s.abyss);
      bodyMat.uniforms.uInner.value.set(s.inner);
      bodyMat.uniforms.uMid.value.set(s.mid);
      bodyMat.uniforms.uRim.value.set(s.rim);
      bodyMat.uniforms.uSwirl.value.set(s.glow);
      glowMat.uniforms.uColor.value.set(s.glow);
      ringMats.forEach((m) => m.color.set(s.glow));
      orbStars.forEach((sp) => (sp.material as THREE.SpriteMaterial).color.set(s.glow));
      for (const k in acc) acc[k].visible = false;
      if (s.acc && acc[s.acc]) acc[s.acc].visible = true;
      skinHasTex = !!s.tex;
      if (s.tex) {
        let t = texCache.get(s.tex);
        if (!t) {
          // only engage the texture once it actually loads (offline/dev keeps
          // the colour-gradient look instead of a broken white orb)
          t = new THREE.TextureLoader().load(s.tex,
            () => { if (bodyMat.uniforms.uTex.value === t) bodyMat.uniforms.uTexAmt.value = 1; });
          t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.ClampToEdgeWrapping;
          t.colorSpace = THREE.SRGBColorSpace;
          texCache.set(s.tex, t);
        }
        bodyMat.uniforms.uTex.value = t;
        bodyMat.uniforms.uTexAmt.value = (t.image ? 1 : 0);
      } else {
        bodyMat.uniforms.uTex.value = whiteTex;
        bodyMat.uniforms.uTexAmt.value = 0;
      }
    },
    chomp() { if (mouthT < 0.22) { mouthT = 0.22; mouthMax = 0.55; } wobble = Math.min(1, wobble + 0.55); },
    animGulp() { mouthT = 0.6; mouthMax = 1; wobble = 1; },
    animDash() { stretchT = 0.5; mouthT = Math.max(mouthT, 0.4); mouthMax = 0.8; wobble = Math.min(1, wobble + 0.4); },
    animCollapse() { inhaleT = 0.9; mouthT = 0.9; mouthMax = 1; wobble = 1; },
    update(dt, s) {
      bodyMat.uniforms.uTime.value = s.t;

      // ── FLUID GROWTH: the displayed size springs after the gameplay size ──
      // slightly underdamped, so each absorb visibly swells the blob past its
      // new size and jiggles back — you SEE the growth land, hole.io-style
      if (Math.abs(radius - dispR) > Math.max(1.5, radius * 0.5)) { dispR = radius; dispV = 0; }   // warp/rematch: snap
      dispV += (radius - dispR) * 46 * dt;
      dispV *= Math.max(0, 1 - 8.5 * dt);
      dispR = Math.max(0.2, dispR + dispV * dt);
      // jelly slosh decays after each meal; a faint idle wave always survives
      wobble = Math.max(0, wobble - dt * 1.7);
      bodyMat.uniforms.uWobble.value = wobble;

      // evolution rings + glow intensify with the form (rings are a child of the
      // group, which is positioned below; keep them local + centred on the orb)
      // the ring is EVOLVE-MOMENT ONLY — a void doesn't wear jewelry. On each
      // evolution the ribbon + star sparkles flare out, spin, and fade away.
      ringFade = 0;
      if (ringBurst > 0) ringBurst = Math.max(0, ringBurst - dt * 0.55);
      const flare = 1 + Math.sin(Math.min(1, 1 - ringBurst) * Math.PI) * 0.6;
      rings.scale.setScalar(dispR * flare);
      rings.rotation.y += dt * 0.5;
      orbit.rotation.z += dt * (0.6 + ringBurst * 1.6);
      const fadeEnv = Math.sin(Math.min(1, 1 - ringBurst) * Math.PI);   // in-out
      ringMats[0].opacity = ringBurst > 0 ? Math.min(1, fadeEnv * 1.2) : 0;
      ringMats[1].opacity = ringBurst > 0 ? fadeEnv * 0.5 : 0;
      for (let i = 0; i < orbStars.length; i++) {
        const tw = 0.55 + 0.45 * Math.sin(s.t * 4 + i * 2.1);
        (orbStars[i].material as THREE.SpriteMaterial).opacity = ringBurst > 0 ? fadeEnv * tw : 0;
        orbStars[i].scale.setScalar(0.16 * (1 + fadeEnv * 0.9) * (0.8 + tw * 0.4));
      }

      const speed = Math.hypot(s.vx, s.vz);
      moveAmt += (Math.min(1, speed / 40) - moveAmt) * Math.min(1, dt * 6);
      // ANTICIPATION: a hard direction flip squashes for a beat before launch
      const pm = Math.hypot(pvx, pvz);
      if (speed > 10 && pm > 10 && (s.vx * pvx + s.vz * pvz) / (speed * pm) < -0.25) flipT = 0.14;
      pvx = s.vx; pvz = s.vz;
      if (flipT > 0) flipT -= dt;

      // lift so the orb rests partly sunk into the ground; roll-bob while
      // moving — frenzy/victory add a real happy bounce
      const lift = dispR * (RADIUS_SINK + Math.abs(Math.sin(s.t * (6 + mp.bounce * 3))) * moveAmt * (0.05 + mp.bounce * 0.055));
      group.position.set(s.x, lift, s.z);

      // squash/stretch + lean on the bob (body+glow only) — gentle, so the orb
      // stays a cute round orb, never pinched
      const breathe = Math.sin(s.t * 2.2) * 0.016;
      let stretch = 1 + moveAmt * 0.05 - breathe;
      let squash = 1 - moveAmt * 0.045 + breathe;
      if (flipT > 0) { stretch *= 0.87; squash *= 1.1; }   // wind-up before the turn
      if (mood === 'hurt') bob.rotation.y = Math.sin(s.t * 34) * 0.05; else bob.rotation.y *= 1 - Math.min(1, dt * 8);
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
      if (evolveT > 0) {            // EVOLVED! celebratory double-bounce
        evolveT -= dt;
        const k = Math.sin(Math.max(0, evolveT) / 0.7 * Math.PI * 2) * 0.16 * (evolveT / 0.7);
        stretch += k; squash += k;
      }
      bob.scale.set(dispR * stretch, dispR * squash, dispR * stretch);
      bob.rotation.z = THREE.MathUtils.clamp(-s.vx / 520, -0.11, 0.11);
      bob.rotation.x = THREE.MathUtils.clamp(s.vz / 520, -0.11, 0.11);

      // face: billboard to camera, scale with the void
      face.scale.setScalar(dispR);
      face.position.set(0, dispR * 0.1, 0);
      face.quaternion.copy(camera.quaternion);

      // mouth: maw scales in while open, smile hides
      if (mouthT > 0) mouthT -= dt;
      const mo = Math.max(mouthT > 0 ? mouthMax * Math.min(1, mouthT * 8) : 0, mp.maw);
      maw.scale.setScalar(Math.max(0.001, mo));
      mouth.visible = mo < 0.25;

      // ── MOOD ENGINE: lerp every expression param toward the mood's targets
      moodT += dt;
      {
        const tgt = { ...BASE, ...MOODS[mood] };
        const k = Math.min(1, dt * 9);
        for (const key of Object.keys(mp) as (keyof typeof mp)[]) mp[key] += (tgt[key] - mp[key]) * k;
      }
      browMat.opacity = mp.brow;
      brows[0].rotation.z = mp.browAng; brows[1].rotation.z = -mp.browAng;
      brows[0].position.y = brows[1].position.y = mp.browY;
      for (const bm of blushMats) bm.opacity = mp.blush;
      (sweat.material as THREE.MeshBasicMaterial).opacity = mp.sweat;
      sweat.position.y = 0.52 + Math.sin(s.t * 9) * 0.045;
      sweat.scale.setScalar(0.9 + Math.sin(s.t * 9) * 0.1);
      (zzz.material as THREE.MeshBasicMaterial).opacity = mp.zzz * (0.55 + 0.45 * Math.sin(s.t * 1.6));
      zzz.position.set(0.55 + Math.sin(s.t * 0.9) * 0.05, 0.92 + Math.sin(s.t * 1.3) * 0.09, 1.0);

      // pupil tracking + blink (sleepy mood = slow drowsy wander)
      blinkT -= dt;
      if (blinkT <= 0 && blink <= 0) { blink = 0.16; blinkT = (mood === 'sleepy' ? 1.4 : 2.5) + Math.random() * 4; }
      let open = 1;
      if (blink > 0) { blink -= dt; open = Math.abs(blink - 0.08) / 0.08; }
      const wanderX = mood === 'sleepy' ? Math.sin(s.t * 0.7) * 0.6 : 0;
      const wanderY = mood === 'sleepy' ? Math.sin(s.t * 0.47) * 0.3 - 0.25 : 0;
      for (const e of eyes) {
        e.pupilGrp.position.x = (s.lookX + wanderX) * 0.09;
        e.pupilGrp.position.y = 0.06 + (s.lookY + wanderY) * 0.06;
        const oy = Math.max(0.08, open) * mp.lid;
        e.sclera.scale.set(mp.wide, Math.max(0.08, oy) * mp.wide, 1);
        const pk = stageBoost * mp.pupil;
        e.pupilGrp.scale.set(pk, Math.max(0.08, oy) * pk, 1);
      }
      // mouth: smile scale + smirk tilt + frown flip (scale.y through ~0 = flat)
      mouth.scale.set(mp.smile, Math.sign(mp.mouthY || 1) * Math.max(0.06, Math.abs(mp.mouthY)) * mp.smile, 1);
      mouth.rotation.z = Math.PI + mp.smirk;
      mouth.position.y = mp.mouthY < 0 ? -0.22 : -0.28;   // frowns ride a touch higher

      // contact shadow tracks the void on the floor
      contact.position.set(s.x, 0.05, s.z); contact.scale.setScalar(dispR * 1.02);
    },
  };

  return api;
}

// ── shared legendary-accessory factory: the SAME 3D flair the player wears
// is worn by rivals in their random skins (unit-orb space, scale with r)
export function buildAccessory(kind: string): THREE.Group {
  const g = new THREE.Group();
  if (kind === 'unicorn') {
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.72, 10),
      new THREE.MeshStandardMaterial({ color: 0xffd9f0, roughness: 0.3, metalness: 0.4, emissive: 0xff9ad8, emissiveIntensity: 0.3 }));
    horn.position.set(0, 1.2, 0.16); horn.rotation.x = 0.24; g.add(horn);
    const earMat = new THREE.MeshStandardMaterial({ color: 0xf6e8ff, roughness: 0.6 });
    for (const sx of [-0.44, 0.44]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.34, 8), earMat);
      ear.position.set(sx, 1.0, 0); ear.rotation.z = -sx * 0.9; g.add(ear);
    }
  }
  else if (kind === 'dino') {
    const m = new THREE.MeshStandardMaterial({ color: 0x2e7a34, roughness: 0.6 });
    for (let i = 0; i < 4; i++) {
      const th = 0.16 + i * 0.36;
      const sp = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.36, 6), m);
      sp.position.set(0, Math.cos(th) * 1.0, -Math.sin(th) * 1.0);
      sp.rotation.x = -th;
      sp.scale.setScalar(1 - i * 0.13);
      g.add(sp);
    }
  }
  else if (kind === 'wizard') {
    const hm = new THREE.MeshStandardMaterial({ color: 0x2a2270, roughness: 0.7 });
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.88, 12), hm);
    cone.position.set(0.06, 1.34, 0); cone.rotation.z = -0.14; g.add(cone);
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.66, 0.08, 16), hm);
    brim.position.set(0.03, 0.94, 0); brim.rotation.z = -0.08; g.add(brim);
    const star = new THREE.Mesh(new THREE.CircleGeometry(0.09, 5),
      new THREE.MeshBasicMaterial({ color: 0xffe08a, side: THREE.DoubleSide }));
    star.position.set(0.28, 1.28, 0.3); g.add(star);
  }
  else if (kind === 'dragon') {
    const wingMat = new THREE.MeshStandardMaterial({ color: 0x2a8a9a, roughness: 0.6, side: THREE.DoubleSide, emissive: 0x1a5a6a, emissiveIntensity: 0.3 });
    for (const sx of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.CircleGeometry(0.62, 5, 0, Math.PI * 0.7), wingMat);
      wing.position.set(sx * 0.82, 0.62, -0.5);
      wing.rotation.set(0.3, sx * 1.1, sx * 0.9);
      wing.scale.set(1.5, 1, 1); g.add(wing);
    }
    const hornMat = new THREE.MeshStandardMaterial({ color: 0xffd25a, roughness: 0.35, metalness: 0.4 });
    for (const sx of [-0.3, 0.3]) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.42, 8), hornMat);
      horn.position.set(sx, 1.08, 0.2); horn.rotation.x = 0.2; horn.rotation.z = -sx; g.add(horn);
    }
    // lighter teal belly patch (the card art's pale tummy) — a flattened
    // sphere hugging the lower front of the orb, kept below the mouth
    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.5, 20, 16),
      new THREE.MeshStandardMaterial({ color: 0x7ad8c8, roughness: 0.5, emissive: 0x2a7a6a, emissiveIntensity: 0.25 }));
    belly.position.set(0, -0.58, 0.72); belly.rotation.x = -0.68;
    belly.scale.set(1.15, 0.75, 0.4); g.add(belly);
  }
  else if (kind === 'mecha') {
    const chrome = new THREE.MeshStandardMaterial({ color: 0xb8c4d0, metalness: 0.8, roughness: 0.25 });
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.7, 6), chrome);
    ant.position.set(0.18, 1.24, 0); g.add(ant);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0x4de8ff, emissive: 0x4de8ff, emissiveIntensity: 1.4 }));
    tip.position.set(0.18, 1.62, 0); g.add(tip);
    for (const sx of [-1, 1]) {   // ear pods
      const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.14, 10), chrome);
      pod.rotation.z = Math.PI / 2; pod.position.set(sx * 1.02, 0.12, 0); g.add(pod);
      const glow2 = new THREE.Mesh(new THREE.CircleGeometry(0.1, 10),
        new THREE.MeshStandardMaterial({ color: 0x4de8ff, emissive: 0x4de8ff, emissiveIntensity: 1.2, side: THREE.DoubleSide }));
      glow2.rotation.y = sx * Math.PI / 2; glow2.position.set(sx * 1.1, 0.12, 0); g.add(glow2);
    }
  }
  else if (kind === 'ninja') {
    const bandMat = new THREE.MeshStandardMaterial({ color: 0xe83a4a, roughness: 0.7 });
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.98, 0.09, 8, 32), bandMat);
    band.rotation.x = Math.PI / 2 - 0.28; band.position.y = 0.42; g.add(band);
    for (const sx of [-0.1, 0.14]) {   // flowing tails at the back
      const tail = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.85), new THREE.MeshStandardMaterial({ color: 0xe83a4a, roughness: 0.7, side: THREE.DoubleSide }));
      tail.position.set(sx, 0.14, -1.0); tail.rotation.x = 0.5; tail.rotation.z = sx * 2; g.add(tail);
    }
    // chunky knot where the band ties — sells "headband", not "red ring"
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), bandMat);
    knot.scale.set(1, 0.8, 0.8); knot.position.set(0.02, 0.5, -0.92); g.add(knot);
  }
  else if (kind === 'king') {
    // matches the King Void card art: gold 5-point crown with PURPLE gems,
    // worn TILTED, plus a ring of gold stardust sparkles riding the equator
    const gold = new THREE.MeshStandardMaterial({ color: 0xffd25a, roughness: 0.25, metalness: 0.7, emissive: 0x7a5a10, emissiveIntensity: 0.35 });
    const crown = new THREE.Group();
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.54, 0.6, 0.32, 12, 1, true), gold);
    crown.add(band);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const pt = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.38, 6), gold);
      pt.position.set(Math.cos(a) * 0.54, 0.3, Math.sin(a) * 0.54); crown.add(pt);
    }
    // purple gems on the band (the card art's amethysts)
    const gemMat = new THREE.MeshStandardMaterial({ color: 0xa04df0, roughness: 0.2, metalness: 0.3, emissive: 0x7a2ad8, emissiveIntensity: 0.9 });
    for (const a of [-0.55, 0, 0.55]) {
      const gem = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), gemMat);
      gem.position.set(Math.sin(a) * 0.6, 0.01, Math.cos(a) * 0.6); crown.add(gem);
    }
    crown.position.set(0.14, 0.98, 0); crown.rotation.z = -0.18;   // tilted, like the art
    g.add(crown);
    // gold-stardust ring: small emissive sparkles orbiting the equator
    const sparkMat = new THREE.MeshBasicMaterial({ color: 0xffe8a0 });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.4;
      const sp = new THREE.Mesh(new THREE.OctahedronGeometry(0.07), sparkMat);
      sp.position.set(Math.cos(a) * 1.15, ((i % 3) - 1) * 0.16 - 0.05, Math.sin(a) * 1.15);
      sp.rotation.set(a, a * 1.7, 0);
      sp.scale.setScalar(0.8 + (i % 2) * 0.5);
      g.add(sp);
    }
  }
  g.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.castShadow = true; });
  return g;
}
