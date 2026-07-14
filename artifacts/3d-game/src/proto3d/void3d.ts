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
      void main(){
        // screen-space radius: 0 at disc centre, 1 at the silhouette. This
        // reproduces the 2D canvas radial gradient (which is radial in screen
        // space) far better than a raw fresnel term.
        float d = clamp(dot(normalize(vN), normalize(vView)), 0.0, 1.0);
        float u = sqrt(max(0.0, 1.0 - d * d));
        // 2D stops, tightened so the orb reads distinctly PURPLE (not black-cored)
        vec3 col = mix(uAbyss, uInner, smoothstep(0.0, 0.26, u));
        col = mix(col, uMid, smoothstep(0.24, 0.62, u));
        col = mix(col, uRim, smoothstep(0.60, 1.0, u));
        col *= 1.18;   // gentle lift so the violet sings
        // luminous event-horizon rim-light
        col += uRim * pow(u, 3.5) * 0.6;
        // faint interior galaxy swirl (subtle, alive)
        float ang = atan(vObj.y, vObj.x) + uTime * 0.35;
        float sw = sin(ang * 2.0 + u * 7.0) * 0.5 + 0.5;
        col += uSwirl * sw * (1.0 - u) * 0.05;
        // crisp white hairline right at the silhouette (the 2D "logo edge")
        col = mix(col, vec3(1.0), smoothstep(0.93, 0.995, u) * 0.5);
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
      uPower: { value: 3.2 },        // high power -> hugs the rim like the 2D thin rings
      uIntensity: { value: 0.85 },
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

  // ── ground halo (violet) + contact shadow, in scene-floor space ───────────
  const halo = new THREE.Mesh(
    new THREE.CircleGeometry(1, 48),
    new THREE.MeshBasicMaterial({ color: VOID.glow, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false }),
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
    new THREE.Mesh(new THREE.CircleGeometry(r, 28), new THREE.MeshBasicMaterial({ color: col, transparent: opacity < 1, opacity, depthWrite: false }));

  // eyes: sclera 0.21R, pupil 0.118R (tracks look), catchlight upper-left
  interface Eye { g: THREE.Group; sclera: THREE.Mesh; pupilGrp: THREE.Group; }
  const eyes: Eye[] = [];
  for (const sx of [-0.36, 0.36]) {
    const g = new THREE.Group();
    const sclera = flat(0.21, VOID.sclera); sclera.position.z = 1.0;
    const pupilGrp = new THREE.Group(); pupilGrp.position.z = 1.02;
    const pupil = flat(0.118, VOID.pupil);
    const catch_ = flat(0.045, 0xffffff); catch_.position.set(-0.038, 0.043, 0.01);
    pupilGrp.add(pupil); pupilGrp.add(catch_);
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
  // smiling mouth — a torus arc, opening up = grin
  const mouth = new THREE.Mesh(
    new THREE.TorusGeometry(0.22, 0.03, 8, 24, Math.PI),
    new THREE.MeshBasicMaterial({ color: VOID.mouth, depthWrite: false }),
  );
  mouth.rotation.z = Math.PI; mouth.position.set(0, -0.28, 1.0);
  face.add(mouth);

  // ── companion spark: warm-white, orbits at 1.22R, twinkles ────────────────
  const spark = new THREE.Mesh(
    new THREE.CircleGeometry(0.07, 12),
    new THREE.MeshBasicMaterial({ color: VOID.spark, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  group.add(spark);

  let radius = 6;
  let moveAmt = 0, blinkT = 3 + Math.random() * 3, blink = 0;

  const api: Void3D = {
    group,
    get radius() { return radius; },
    set radius(r: number) { radius = r; },
    setRadius(r: number) { radius = r; },
    update(dt, s) {
      bodyMat.uniforms.uTime.value = s.t;

      const speed = Math.hypot(s.vx, s.vz);
      moveAmt += (Math.min(1, speed / 40) - moveAmt) * Math.min(1, dt * 6);

      // lift so the orb rests partly sunk into the ground; roll-bob while moving
      const lift = radius * (RADIUS_SINK + Math.abs(Math.sin(s.t * 6)) * moveAmt * 0.05);
      group.position.set(s.x, lift, s.z);

      // squash/stretch + lean on the bob (body+glow only) — gentle, so the orb
      // stays a cute round orb, never pinched
      const breathe = Math.sin(s.t * 2.2) * 0.016;
      const stretch = 1 + moveAmt * 0.05 - breathe;
      const squash = 1 - moveAmt * 0.045 + breathe;
      bob.scale.set(radius * stretch, radius * squash, radius * stretch);
      bob.rotation.z = THREE.MathUtils.clamp(-s.vx / 520, -0.11, 0.11);
      bob.rotation.x = THREE.MathUtils.clamp(s.vz / 520, -0.11, 0.11);

      // face: billboard to camera, scale with the void
      face.scale.setScalar(radius);
      face.position.set(0, radius * 0.1, 0);
      face.quaternion.copy(camera.quaternion);

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
      halo.position.set(s.x, 0.08, s.z); halo.scale.setScalar(radius * 1.55);
      contact.position.set(s.x, 0.05, s.z); contact.scale.setScalar(radius * 1.02);

      // companion spark orbit (elliptical, faster than the void)
      const sa = s.t * 1.1;
      const tw = 0.6 + 0.4 * Math.sin(s.t * 4);
      spark.position.set(Math.cos(sa) * radius * 1.28, radius * (0.1 + Math.sin(sa * 0.7) * 0.5), Math.sin(sa) * radius * 1.28 * 0.7);
      (spark.material as THREE.MeshBasicMaterial).opacity = 0.85 * tw;
      spark.scale.setScalar(radius);
      spark.quaternion.copy(camera.quaternion);
    },
  };

  return api;
}
