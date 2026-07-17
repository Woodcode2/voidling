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

export interface Void3D {
  group: THREE.Group;
  radius: number;
  setRadius(r: number): void;
  setStage(n: number): void;
  setSkin(s: Skin): void;    // recolour body/glow/halo/rings to a skin
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
    },
    vertexShader: `
      varying vec3 vN; varying vec3 vView; varying vec3 vObj; varying vec2 vUv;
      void main(){
        vN = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(position,1.0);
        vView = normalize(-mv.xyz);
        vObj = position;
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
        // luminous event-horizon rim-light — intensifies with each evolution
        col += uRim * pow(u, 3.8) * (0.3 + uStage * 0.05);
        // faint interior galaxy swirl (subtle, alive)
        float ang = atan(vObj.y, vObj.x) + uTime * 0.3;
        float sw = sin(ang * 2.0 + u * 7.0) * 0.5 + 0.5;
        col += uSwirl * sw * (1.0 - u) * (0.06 + uStage * 0.015);
        // glossy toy catchlight (the polished-3D look of the key art)
        vec3 L = normalize(vec3(-0.45, 0.74, 0.5));
        float spec = pow(max(dot(normalize(vN), L), 0.0), 30.0);
        col += vec3(1.0, 0.97, 1.0) * spec * 0.26;
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
  const bloomSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: softRadialTex(256, 0.3, 0.1, 30), color: VOID.glow, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  bloomSprite.renderOrder = -1;   // behind the body
  group.add(bloomSprite);

  // ── ground halo + contact shadow, in scene-floor space ─────────────────────
  // ground halo: a soft radial-gradient colour stain (NOT a hard bright disc)
  const halo = new THREE.Mesh(
    new THREE.CircleGeometry(1, 48),
    new THREE.MeshBasicMaterial({ map: softRadialTex(128, 0.3, 0.13, 18), color: 0x7a4fe0, transparent: true, depthWrite: false }),
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
    // crisp full-opacity outline ring (not a translucent blur disc)
    const outline = new THREE.Mesh(new THREE.RingGeometry(0.198, 0.218, 56),
      new THREE.MeshBasicMaterial({ color: 0x2a1f45, depthWrite: false }));
    outline.position.z = 0.005;
    const white = flat(0.21, VOID.sclera);
    sclera.add(white); sclera.add(outline);
    const pupilGrp = new THREE.Group(); pupilGrp.position.z = 1.02;
    const pupil = flat(0.118, VOID.pupil);
    const catch_ = flat(0.042, 0xffffff); catch_.position.set(-0.036, 0.04, 0.01);
    const catch2 = flat(0.016, 0xffffff); catch2.position.set(0.03, -0.028, 0.01);
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

  // ── evolution ring — ONE crisp thin ribbon, normal blending so it reads as
  // a saturated violet band (additive washed to white over bright ground)
  const rings = new THREE.Group();
  group.add(rings);
  const ringMats: THREE.MeshBasicMaterial[] = [];
  {
    const rm = new THREE.MeshBasicMaterial({ color: VOID.glow, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
    const rg = new THREE.Mesh(new THREE.TorusGeometry(1.42, 0.016, 8, 96), rm);
    rg.rotation.x = Math.PI / 2 - 0.5;
    rings.add(rg); ringMats.push(rm);
    // faint companion band just outside — subtle depth, same crispness
    const rm2 = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
    const rg2 = new THREE.Mesh(new THREE.TorusGeometry(1.52, 0.008, 8, 96), rm2);
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
    setStage(n: number) {
      if (n > stage) {
        evolveT = 0.7;   // celebratory pop on every evolution
        ringBurst = 1;   // ring + orbit stars flare outward
        bodyMat.uniforms.uStage.value = n;
        // each form gets a stronger presence: pupils grow (2D rule), rim/glow
        // intensify; WORLD ENDER becomes a living galaxy (auto nebula wrap)
        const pupilScale = n >= 1 ? 1.15 : 1;
        for (const e of eyes) e.pupilGrp.scale.setScalar(pupilScale);
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
      (bloomSprite.material as THREE.SpriteMaterial).color.set(s.glow);
      (halo.material as THREE.MeshBasicMaterial).color.set(s.glow);
      ringMats.forEach((m) => m.color.set(s.glow));
      orbStars.forEach((sp) => (sp.material as THREE.SpriteMaterial).color.set(s.glow));
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
    chomp() { if (mouthT < 0.22) { mouthT = 0.22; mouthMax = 0.55; } },
    animGulp() { mouthT = 0.6; mouthMax = 1; },
    animDash() { stretchT = 0.5; mouthT = Math.max(mouthT, 0.4); mouthMax = 0.8; },
    animCollapse() { inhaleT = 0.9; mouthT = 0.9; mouthMax = 1; },
    update(dt, s) {
      bodyMat.uniforms.uTime.value = s.t;

      // evolution rings + glow intensify with the form (rings are a child of the
      // group, which is positioned below; keep them local + centred on the orb)
      const targetRing = stage >= 2 ? Math.min(0.85, 0.45 + (stage - 2) * 0.2) : 0;
      ringFade += (targetRing - ringFade) * Math.min(1, dt * 3);
      if (ringBurst > 0) ringBurst = Math.max(0, ringBurst - dt * 1.4);
      // on evolve the whole ring system flares out and eases back in
      const flare = 1 + Math.sin(Math.min(1, 1 - ringBurst) * Math.PI) * 0.45;
      rings.scale.setScalar(radius * flare);
      rings.rotation.y += dt * 0.4;
      orbit.rotation.z += dt * 0.55;               // stars process around the band
      ringMats[0].opacity = Math.min(1, ringFade + ringBurst * 0.9);
      ringMats[1].opacity = Math.min(1, ringFade * 0.4 + ringBurst * 0.5);
      const starVis = Math.min(1, ringFade * 1.1 + ringBurst);
      for (let i = 0; i < orbStars.length; i++) {
        const tw = 0.55 + 0.45 * Math.sin(s.t * 4 + i * 2.1);
        (orbStars[i].material as THREE.SpriteMaterial).opacity = starVis * tw;
        orbStars[i].scale.setScalar(0.16 * (1 + ringBurst * 0.8) * (0.8 + tw * 0.4));
      }

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
      if (evolveT > 0) {            // EVOLVED! celebratory double-bounce
        evolveT -= dt;
        const k = Math.sin(Math.max(0, evolveT) / 0.7 * Math.PI * 2) * 0.16 * (evolveT / 0.7);
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
