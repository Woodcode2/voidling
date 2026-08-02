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
  /** Kick the growth spring — an absorbed meal shoves the blob. */
  impulse(v: number): void;
  setStage(n: number): void;
  setSkin(s: Skin): void;    // recolour body/glow/halo/rings to a skin
  setMood(m: Mood): void;    // the emotional state machine's current state
  chomp(k?: number): void;             // quick mouth-open bite (on eat)
  animGulp(): void;          // big gape + hold (GULP)
  animDash(): void;          // stretch pulse (ROCKET BITE)
  animCollapse(): void;      // inhale-shrink then burst (COLLAPSE)
  update(dt: number, s: VoidState): void;
}

const RADIUS_SINK = 0.9;   // how much of the orb sits above ground (rest sinks)

/** A real N-point star. CircleGeometry(r, 5) is a regular PENTAGON, which is
 *  exactly what Uni-Void's signature "star eyes" and the Archmage's hat star
 *  were rendering as: two flat beige polygons in the pupils, and a pale
 *  pentagon on the wizard's forehead. */
function starShape(outer: number, inner: number, points = 5): THREE.ShapeGeometry {
  const sh = new THREE.Shape();
  for (let i = 0; i < points * 2; i++) {
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? outer : inner;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    if (i === 0) sh.moveTo(x, y); else sh.lineTo(x, y);
  }
  sh.closePath();
  return new THREE.ShapeGeometry(sh);
}

// ── ONE BODY FOR EVERY VOID ────────────────────────────────────────────────
// The player and the family now render with the SAME material: the jelly
// wobble, the four-stop fresnel, the character sheen and the hide pattern.
// Rivals used to get a cut-down two-stop shader, which is exactly why they
// read as flat stickers next to the hero.
// ── THE BODY SHADER ────────────────────────────────────────────────────────
// One source of truth, shared by the hero and the family. It was duplicated
// verbatim in createVoid, so every tuning pass had to be made twice and the
// two copies had already started to drift.
const VOID_VERT = `
  varying vec3 vN; varying vec3 vView; varying vec3 vObj; varying vec2 vUv; varying vec3 vRay;
  uniform float uTime; uniform float uWobble; uniform float uSlow; uniform float uStage;
  uniform vec3 uStretchDir; uniform float uStretchAmt;
  void main(){
    // MASS: a big void sloshes SLOWER than a little one. Same waveform, time
    // scaled by uSlow — the cheapest possible read on "this thing is heavy".
    float tt = uTime * uSlow;
    vec3 p = position;
    // FLUID BODY: low-frequency jelly waves ride the surface — a faint liquid
    // idle so the void never sits static, and a big slosh (uWobble) every time
    // it absorbs something. The blob visibly digests its meals.
    float wob =
        sin(p.y * 3.1 + tt * 5.0)
      * sin(p.x * 2.6 - tt * 4.1)
      + 0.6 * sin((p.x + p.z) * 4.2 + tt * 6.3);
    // EVENT-HORIZON CHURN: the late forms BOIL. The camera pulls back as the
    // void grows, so every form used to fill the same patch of screen as a
    // clean circle — VOIDLING and WORLD ENDER were the same picture. Now the
    // silhouette itself lobes and rolls harder with each evolution, which is a
    // read a six-year-old gets instantly and at any size.
    float churn = sin(p.x * 1.9 + tt * 0.55) * sin(p.z * 1.7 - tt * 0.44) * sin(p.y * 1.5 + tt * 0.66);
    p *= 1.0 + wob * (0.012 + uWobble * 0.06) + churn * 0.022 * max(0.0, uStage - 1.0);
    // DIRECTIONAL SQUASH & STRETCH: he elongates ALONG travel. The old rig
    // scaled him uniformly wider and shorter, which reads as breathing, not
    // as speed — nothing about it said which way he was going.
    p += uStretchDir * dot(p, uStretchDir) * uStretchAmt;
    // normal of the STRETCHED sphere, or the fresnel slides off the silhouette
    vec3 n = normalize(position);
    n = normalize(n - uStretchDir * dot(n, uStretchDir) * (uStretchAmt / (1.0 + uStretchAmt)));
    vN = normalize(normalMatrix * n);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vView = normalize(-mv.xyz);
    // the view ray back in OBJECT space — this is what lets the fragment
    // shader parallax the galaxy that lives inside the shell
    mat3 m = mat3(modelViewMatrix);
    mat3 mt = mat3(m[0][0], m[1][0], m[2][0], m[0][1], m[1][1], m[2][1], m[0][2], m[1][2], m[2][2]);
    vRay = normalize(mt * mv.xyz);
    vObj = p;
    vUv = uv;
    gl_Position = projectionMatrix * mv;
  }
`;

const VOID_FRAG = `
  varying vec3 vN; varying vec3 vView; varying vec3 vObj; varying vec2 vUv; varying vec3 vRay;
  uniform vec3 uAbyss; uniform vec3 uInner; uniform vec3 uMid; uniform vec3 uRim; uniform vec3 uSwirl;
  uniform float uTime; uniform sampler2D uTex; uniform float uTexAmt;
  uniform sampler2D uStars; uniform float uStarAmt; uniform float uStage; uniform float uGloss;
  uniform float uPat; uniform vec3 uPatCol; uniform float uSmall;
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
    vec3 N = normalize(vN);
    vec3 V = normalize(vView);
    // screen-space radius: 0 at disc centre, 1 at the silhouette. This
    // reproduces the 2D canvas radial gradient (radial in screen space).
    float d = clamp(dot(N, V), 0.0, 1.0);
    float u = sqrt(max(0.0, 1.0 - d * d));
    // stops tuned CUTE: the dark heart is small, the visible disc reads as
    // a bright plush purple that lifts quickly toward the lit rim.
    // uSmall (1 when he is only a few dozen pixels across) widens the rim so
    // the lit edge never falls below a pixel and dissolve into the ground.
    vec3 col = mix(uInner, uMid, smoothstep(0.10, 0.55, u));
    // THE RIM IS AN EVENT HORIZON, NOT THE BODY. u is the normalised disc
    // radius, so a 0.58 stop mixed the rim colour over 1 - 0.58^2 = 66% of the
    // disc AREA, and 88% at speck size. King Void therefore rendered as a solid
    // gold ball with a brown smudge, contradicting both its own palette comment
    // (body stays dark, the RIM is the gold) and its shop card, which draws a
    // dark orb with a thin gold edge. Pulled out to 0.74 so mid and inner
    // carry the character and the rim is the lit lip of the hole.
    col = mix(col, uRim, smoothstep(mix(0.74, 0.50, uSmall), 1.0, u));
    // premium skin: wrap the AI texture around the orb (slow drift), keep
    // the darker core + lit rim so it still reads as a VOID
    if (uTexAmt > 0.01) {
      vec3 tc = texture2D(uTex, vec2(vUv.x + uTime * 0.012, vUv.y)).rgb;
      col = mix(col, tc * (0.34 + 0.9 * u), uTexAmt);
    }
    // ── FORM LIGHT ────────────────────────────────────────────────────────
    // The fresnel gradient alone is radially symmetric, and a radially
    // symmetric ball is a flat disc with a glow: there is no up, no volume,
    // nothing for the eye to read as roundness. A single screen-anchored key
    // gives him a lit top-left cheek and a deep bottom-right. Anchored in VIEW
    // space on purpose — this is illustration lighting, so the read is
    // identical no matter where the camera has swung to.
    vec3 L = normalize(vec3(-0.40, 0.60, 0.69));
    float ndl = dot(N, L);
    float key = smoothstep(-0.55, 0.95, ndl);
    float low = smoothstep(-0.15, -0.95, N.y);      // his underside
    // ── THE PIT, MOVED OFF HIS FACE ───────────────────────────────────────
    // The abyss was a radial stop centred on the disc — and the disc centre is
    // where the eyes and the mouth live, so the one dark region the whole
    // "hole into space" idea depends on was (a) permanently covered and (b)
    // visible only as a grey thumbprint between his eyes. Drop the core into
    // his belly instead: face on top, open space below it. N.xy is the
    // fragment's position across the projected disc, so this is a clean
    // screen-space offset and it holds from every angle.
    float ud = length(N.xy - vec2(0.0, -0.46)) / 1.46;
    float core = 1.0 - smoothstep(0.02, 0.66, ud);
    col = mix(col, uAbyss * 0.9, core * 0.90);
    // a bright lip around the mouth of the pit — the event horizon catching
    // light, and the thing that stops it reading as a stain
    col += uRim * smoothstep(0.40, 0.60, ud) * (1.0 - smoothstep(0.60, 0.84, ud)) * 0.14;
    col *= mix(0.62, 1.22, key);
    col *= mix(1.0, 0.84, low);                     // occlusion where he meets the floor
    col += uRim * low * pow(u, 2.2) * 0.13;         // ...and the bounce lip just above it
    // ── THE PIT INTO SPACE ────────────────────────────────────────────────
    // The galaxy genuinely sits INSIDE the shell now: every interior layer is
    // sampled along the REFRACTED view ray, so the deeper a layer is the more
    // it slides against the surface — real parallax, the way something
    // suspended in glass behaves. The old star specks were pinned to object
    // space, i.e. painted on the outside, which is exactly why the interior
    // read as flat fill instead of depth.
    vec3 P = normalize(vObj);
    vec3 R = refract(vRay, P, 0.74);
    float b = dot(P, R);
    vec3 gal = vec3(0.0);
    vec3 starTint = mix(vec3(1.0), uSwirl, 0.6);    // each skin's galaxy is ITS colour
    float spin = uTime * 0.05, cs = cos(spin), sn = sin(spin);
    // three concentric INNER SHELLS, each hit by the refracted ray. Offsetting
    // a flat lookup by the ray (the obvious version) smears into scratches
    // near the silhouette; a real ray/sphere intersection stays clean, gives
    // honest parallax between the layers, and self-masks near the rim exactly
    // the way looking into a marble from the side does.
    for (int i = 0; i < 3; i++) {
      float k = 0.80 - float(i) * 0.24;
      float disc = b * b - (1.0 - k * k);
      if (disc <= 0.0) continue;                    // this shell isn't visible here
      vec3 q = P + R * (-b - sqrt(disc));
      vec2 qr = vec2(q.x * cs - q.y * sn, q.x * sn + q.y * cs);   // the galaxy turns
      vec2 sc = qr * (9.0 + float(i) * 11.0) + float(i) * 7.3;
      float h = hash(floor(sc));
      if (h > 0.885) {
        float dot2 = 1.0 - smoothstep(0.0, 0.26 - float(i) * 0.045, length(fract(sc) - 0.5));
        float tw = 0.5 + 0.5 * sin(uTime * (2.4 + float(i)) + h * 40.0);
        gal += starTint * dot2 * tw * (1.55 - float(i) * 0.34);
      }
    }
    // ☁️ HD nebula wisps: two octaves of drifting value noise on the outer shell
    float ndisc = max(0.0, b * b - (1.0 - 0.80 * 0.80));
    vec3 nq = P + R * (-b - sqrt(ndisc));
    vec2 np = nq.xy * 2.4 + vec2(uTime * 0.045, -uTime * 0.028);
    float neb = vnoise(np) * 0.62 + vnoise(np * 2.3 + 7.7) * 0.38;
    neb = smoothstep(0.50, 0.92, neb);
    gal += mix(uInner, uSwirl, 0.75) * neb * 0.6;
    // ✨ the AI starfield, drifting with the same parallax offset
    if (uStarAmt > 0.01) {
      vec2 su = vec2(vUv.x * 2.0 + uTime * 0.006, vUv.y * 2.0 - uTime * 0.003) + R.xy * 0.05;
      vec3 st = texture2D(uStars, su).rgb;
      gal += st * st * uStarAmt * 0.75;   // st*st: keep the bright stars, drop the haze
    }
    // the interior only shows through the face-on disc, and reads deepest on
    // the shaded side — which is what makes it a HOLE and not a decal
    float inside = 0.22 + 1.55 * (1.0 - smoothstep(0.10, 0.78, ud));
    col += gal * inside * (0.85 + uStage * 0.11);
    // ── EVENT HORIZON ─────────────────────────────────────────────────────
    // rim light lives OPPOSITE the key, like a real one, and fattens with
    // both the evolution stage and how small he is on screen
    col += uRim * pow(u, mix(3.0, 1.9, uSmall)) * (0.30 + uStage * 0.05) * mix(1.45, 0.72, key);
    // 🌈 iridescent horizon: a slow pink↔violet shimmer riding the last few
    // degrees of the silhouette (premium toy-gloss, kills the flat rim band)
    float ang = atan(vObj.y, vObj.x) + uTime * 0.3;
    vec3 iri = mix(uRim, vec3(1.0, 0.62, 0.9), 0.5 + 0.5 * sin(ang * 3.0 + uTime * 0.8));
    col += iri * pow(u, 6.0) * 0.16;
    // glossy toy catchlight: one tight hot dot plus a wide soft sheen
    col += vec3(1.0, 0.97, 1.0) * pow(max(ndl, 0.0), 46.0) * 0.34;
    col += mix(vec3(1.0), uRim, 0.5) * pow(max(ndl, 0.0), 7.0) * 0.09;
    // CHARACTER SHEEN: pearl/chrome legendaries get a hard wet highlight
    // plus a wide soft one — this is what sells "expensive" at a glance
    if (uGloss > 0.01) {
      col += vec3(1.0) * pow(max(ndl, 0.0), 90.0) * uGloss * 0.9;
      col += vec3(1.0, 0.98, 1.0) * pow(max(ndl, 0.0), 8.0) * uGloss * 0.14;
    }
    vec3 L2 = normalize(vec3(0.55, 0.10, 0.55));
    col += vec3(0.82, 0.76, 1.0) * pow(max(dot(N, L2), 0.0), 14.0) * 0.07;
    // ── BODY PATTERN: the legendary's actual SKIN. This is what makes a
    // character stop reading as "a purple ball wearing a costume" — the
    // surface itself is scaled, plated, furred or full of stars.
    if (uPat > 0.5) {
      float shade = 0.0;
      if (uPat < 1.5) {                       // SCALES — offset-row teardrops
        vec2 g = vec2(vUv.x * 34.0, vUv.y * 18.0);
        g.x += mod(floor(g.y), 2.0) * 0.5;
        vec2 f = fract(g) - 0.5;
        float dd = length(f * vec2(1.0, 1.25));
        shade = smoothstep(0.46, 0.30, dd) * 0.55 + smoothstep(0.30, 0.46, dd) * 0.15;
      } else if (uPat < 2.5) {                // CHROME — machined panel bands
        float band = abs(fract(vUv.y * 9.0) - 0.5);
        float seam = smoothstep(0.06, 0.0, band);
        float rivet = step(0.86, hash(floor(vec2(vUv.x * 22.0, vUv.y * 9.0))));
        shade = seam * 0.85 + rivet * 0.4;
      } else if (uPat < 3.5) {                // FUR — fine directional strands
        float st = vnoise(vec2(vUv.x * 120.0, vUv.y * 22.0));
        shade = smoothstep(0.55, 0.9, st) * 0.5;
      } else if (uPat < 4.5) {                // STARFIELD — a night sky for a hide
        vec2 sc3 = vUv * vec2(60.0, 34.0);
        float h3 = hash(floor(sc3));
        float dot4 = h3 > 0.9 ? (1.0 - smoothstep(0.0, 0.34, length(fract(sc3) - 0.5))) : 0.0;
        shade = dot4 * (0.6 + 0.4 * sin(uTime * 3.0 + h3 * 30.0)) * 1.6;
      } else {                                // STITCH — cloth seams (ninja wrap)
        float sew = abs(fract(vUv.y * 13.0 + vUv.x * 0.6) - 0.5);
        shade = smoothstep(0.09, 0.0, sew) * step(0.45, fract(vUv.x * 46.0)) * 0.7;
      }
      // patterns fade toward the silhouette so the fresnel read survives
      col = mix(col, uPatCol, shade * (1.0 - u * 0.55));
    }
    // at postage-stamp size, punch the whole thing up a touch — small objects
    // lose apparent contrast to the surrounding frame
    col *= 1.0 + 0.10 * uSmall;
    gl_FragColor = vec4(col, 1.0);
  }
`;

export function makeVoidBody(): THREE.ShaderMaterial {
  const white = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
  white.needsUpdate = true;
  return new THREE.ShaderMaterial({
    uniforms: {
      uAbyss: { value: VOID_COL.abyss.clone() },
      uInner: { value: new THREE.Color(VOID.bodyInner) },
      uMid: { value: VOID_COL.bodyMid.clone() },
      uRim: { value: VOID_COL.bodyRim.clone() },
      uSwirl: { value: new THREE.Color(VOID.swirl) },
      uTime: { value: 0 },
      uTex: { value: white },         // premium skin texture (AI-generated)
      uTexAmt: { value: 0 },
      uStars: { value: white },       // AI starfield living inside the pit
      uStarAmt: { value: 0 },
      uStage: { value: 0 },
      uWobble: { value: 0 },          // jelly amplitude — spikes on every eat
      uGloss: { value: 0 },           // legendary sheen (pearl / chrome character skins)
      uPat: { value: 0 },             // 0 none · 1 scales · 2 chrome · 3 fur · 4 starfield · 5 stitch
      uPatCol: { value: new THREE.Color(0xffffff) },
      uSmall: { value: 0 },           // 1 when he is only a few dozen pixels wide
      uSlow: { value: 1 },            // wobble time scale — big voids slosh slower
      uStretchDir: { value: new THREE.Vector3(0, 0, 1) },
      uStretchAmt: { value: 0 },
    },
    vertexShader: VOID_VERT,
    fragmentShader: VOID_FRAG,
  });
}

// paint a skin's identity onto any void body (player or family)
export function applySkinToBody(m: THREE.ShaderMaterial, s: Skin): void {
  m.uniforms.uAbyss.value.set(s.abyss);
  m.uniforms.uInner.value.set(s.inner);
  m.uniforms.uMid.value.set(s.mid);
  m.uniforms.uRim.value.set(s.rim);
  m.uniforms.uSwirl.value.set(s.glow);
  const ch = s.char;
  m.uniforms.uGloss.value = ch?.gloss ?? 0;
  const PAT: Record<string, number> = { scales: 1, chrome: 2, fur: 3, starfield: 4, stitch: 5 };
  m.uniforms.uPat.value = ch?.pattern ? PAT[ch.pattern] : 0;
  if (ch?.patCol) m.uniforms.uPatCol.value.set(ch.patCol);
}

const texCache = new Map<string, THREE.Texture>();   // premium skin textures

export function createVoid(scene: THREE.Scene, camera: THREE.Camera): Void3D {
  const group = new THREE.Group();
  scene.add(group);

  // bob holds the body + glow; it gets squash/stretch. Face is separate (uniform).
  const bob = new THREE.Group();
  group.add(bob);

  // ── body: fresnel "pit into space" ────────────────────────────────────────
  // ONE shader, shared with the family (see VOID_VERT / VOID_FRAG above).
  const bodyMat = makeVoidBody();
  const whiteTex = bodyMat.uniforms.uTex.value as THREE.Texture;
  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 72), bodyMat);
  // Starts true; setRadius() gates it once the hero is big — see the note there.
  body.castShadow = false;   // grounded by the contact disc, never by the shadow map
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
  /** The contact shadow's falloff, in ALPHA — white pixels the material tints,
   *  fading to fully transparent at the rim.
   *
   *  This was briefly a multiply mask instead, with the profile in RGB. On
   *  paper that is the correct way to darken ground without tinting it. In
   *  this renderer MultiplyBlending did not take: at WORLD ENDER scale the
   *  disc painted the mask as an IMAGE — grey core, white rim, thirty metres
   *  across — a white blob sitting on the world. Measured too, and dismissed
   *  at the time: a solid-WHITE mask came back brighter than no disc at all,
   *  which no multiply can do, and a solid-black one only reached 0.50 rather
   *  than 0. Both of those are what "the texture is being painted, not
   *  multiplied" looks like from the outside.
   *
   *  So: normal blending, which demonstrably darkens, with the two things that
   *  made the ORIGINAL normal-blended disc read as a grey circle fixed. It held
   *  0.72-0.95 alpha out to half its radius, so the ground contributed under a
   *  quarter of the result and the hue was simply replaced; and that near-solid
   *  core ended in a step, which is the edge the eye locked onto. The peak is
   *  a third of that now and the falloff is continuous from the centre. */
  const softShadowTex = (size: number) => {
    const cv = document.createElement('canvas'); cv.width = cv.height = size;
    const x = cv.getContext('2d')!;
    const gr = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gr.addColorStop(0.00, 'rgba(255,255,255,0.62)');
    gr.addColorStop(0.30, 'rgba(255,255,255,0.50)');
    gr.addColorStop(0.58, 'rgba(255,255,255,0.28)');
    gr.addColorStop(0.80, 'rgba(255,255,255,0.10)');
    gr.addColorStop(1.00, 'rgba(255,255,255,0)');
    x.fillStyle = gr; x.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(cv);
  };
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
  // Retuned: a TIGHT dark core right where he touches the floor, falling off
  // fast. The old even 0.55→0.28 spread was a grey smudge the same value all
  // the way out, so he hovered — nothing said which pixel he was standing on.
  const contact = new THREE.Mesh(
    new THREE.CircleGeometry(1, 64),
    new THREE.MeshBasicMaterial({
      map: softShadowTex(256),
      // a NEUTRAL near-black, not the old saturated navy: at any alpha a
      // saturated tint pulls the ground toward its own hue, and that is half
      // of what made the old disc read as a colour rather than as a shadow
      color: 0x171021,
      transparent: true,
      opacity: 0.62,
      depthWrite: false,
    }),
  );
  contact.rotation.x = -Math.PI / 2; contact.position.y = 0.05;
  // The disc is now the ONLY thing grounding the hero, so it must not flicker
  // either. It is transparent and depthWrite-free, which puts it in the sorted
  // pass with the puffs, the bubbles and Pirate Bay's bay water — all of which
  // share its x/z, so their sort keys differ by hundredths and can swap order
  // between frames. Pinning renderOrder takes it out of that argument, and the
  // polygon offset keeps it off the ground's own depth plane.
  contact.renderOrder = -2;
  (contact.material as THREE.MeshBasicMaterial).polygonOffset = true;
  (contact.material as THREE.MeshBasicMaterial).polygonOffsetFactor = -4;
  (contact.material as THREE.MeshBasicMaterial).polygonOffsetUnits = -4;
  scene.add(contact);
  // …and the LIP. A bright, thin ring just outside the pit's dark edge, which
  // is the single read that says "hole" rather than "ball": hole.io's whole
  // silhouette is that ring. Additive would blow out over pale ground (the
  // evolution torus already learned that), so it is a normal-blended warm
  // highlight that sits between the pit and the world.
  const lip = new THREE.Mesh(
    new THREE.RingGeometry(0.88, 1, 72),
    new THREE.MeshBasicMaterial({ color: 0xd9c2ff, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide }),
  );
  lip.rotation.x = -Math.PI / 2; lip.position.y = 0.06;
  lip.renderOrder = -1;   // always immediately after the pit it rims
  (lip.material as THREE.MeshBasicMaterial).polygonOffset = true;
  (lip.material as THREE.MeshBasicMaterial).polygonOffsetFactor = -5;
  (lip.material as THREE.MeshBasicMaterial).polygonOffsetUnits = -5;
  scene.add(lip);

  // ── face: crisp billboarded flat features (matches 2D canvas) ─────────────
  const face = new THREE.Group();
  group.add(face);
  const flat = (r: number, col: number, opacity = 1) =>
    new THREE.Mesh(new THREE.CircleGeometry(r, 56), new THREE.MeshBasicMaterial({ color: col, transparent: opacity < 1, opacity, depthWrite: false }));

  // ── THE EYES ──────────────────────────────────────────────────────────────
  // Everything a player feels about this character comes through here, so the
  // eye is no longer three flat colour discs stacked up. The sclera and the
  // pupil are each a small painted texture: the sclera carries a cool lid
  // shadow across the top and a warm bounce underneath (so it sits IN a face
  // instead of on it), and the pupil carries an iris falloff, a violet
  // reflected-light crescent at the bottom and both catchlights baked in.
  // Baking the catchlights also retired four meshes.
  const SCL_R = 0.21;
  const scleraTex = (() => {
    const S = 128, cv = document.createElement('canvas'); cv.width = cv.height = S;
    const x = cv.getContext('2d')!;
    x.beginPath(); x.arc(S / 2, S / 2, S / 2 - 1, 0, Math.PI * 2); x.clip();
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, S, S);
    // lid shadow across the top — the single cheapest cue that there is a
    // brow above this eye and a skull behind it
    let g = x.createLinearGradient(0, 0, 0, S * 0.62);
    g.addColorStop(0, 'rgba(96,74,150,0.42)');
    g.addColorStop(0.45, 'rgba(120,100,180,0.13)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, S, S);
    // warm bounce off the cheek
    g = x.createLinearGradient(0, S, 0, S * 0.6);
    g.addColorStop(0, 'rgba(255,196,214,0.30)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, S, S);
    // inner edge darkening so the white never blows out against the body
    g = x.createRadialGradient(S / 2, S / 2, S * 0.30, S / 2, S / 2, S * 0.5);
    g.addColorStop(0, 'rgba(120,100,180,0)');
    g.addColorStop(1, 'rgba(88,66,140,0.34)');
    x.fillStyle = g; x.fillRect(0, 0, S, S);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  const pupilTex = (() => {
    const S = 128, cv = document.createElement('canvas'); cv.width = cv.height = S;
    const x = cv.getContext('2d')!;
    x.beginPath(); x.arc(S / 2, S / 2, S / 2 - 1, 0, Math.PI * 2); x.clip();
    // iris: a hair lighter at the edge than dead centre, so the pupil has a
    // pupil. Flat black reads as a hole punched in the face.
    let g = x.createRadialGradient(S * 0.5, S * 0.56, S * 0.05, S * 0.5, S * 0.5, S * 0.5);
    g.addColorStop(0, '#0d0520');
    g.addColorStop(0.62, '#1b0e38');
    g.addColorStop(1, '#33195c');
    x.fillStyle = g; x.fillRect(0, 0, S, S);
    // reflected light: the sky bouncing up into the bottom of the iris
    g = x.createRadialGradient(S * 0.58, S * 0.78, 0, S * 0.58, S * 0.78, S * 0.42);
    g.addColorStop(0, 'rgba(140,110,255,0.55)');
    g.addColorStop(1, 'rgba(140,110,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, S, S);
    // the big soft catchlight, upper-left, matching the body's key
    g = x.createRadialGradient(S * 0.35, S * 0.31, 0, S * 0.35, S * 0.31, S * 0.20);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.55, 'rgba(255,255,255,0.95)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, S, S);
    // …and the tiny hard one opposite it
    x.fillStyle = 'rgba(255,255,255,0.92)';
    x.beginPath(); x.arc(S * 0.655, S * 0.68, S * 0.062, 0, Math.PI * 2); x.fill();
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  interface Eye { g: THREE.Group; sclera: THREE.Group; pupilGrp: THREE.Group; outline: THREE.Mesh; }
  const eyes: Eye[] = [];
  const charEyes: { star: THREE.Mesh; ring: THREE.Mesh }[] = [];   // legendary pupil overrides
  for (const sx of [-0.36, 0.36]) {
    const g = new THREE.Group();
    const sclera = new THREE.Group(); sclera.position.z = 1.0;
    // The outline is a dark disc BEHIND the sclera, not a ring on top of it.
    // A ring's weight is baked into its geometry; a backing disc's weight is
    // one scale value, so the line can be fattened per frame as he shrinks on
    // screen. A 0.02-wide ring was a third of a pixel at gameplay size, which
    // is exactly why the eyes dissolved into the body when he was small.
    const outline = new THREE.Mesh(new THREE.CircleGeometry(1, 56),
      new THREE.MeshBasicMaterial({ color: 0x2a1f45, depthWrite: false }));
    outline.position.z = -0.004; outline.renderOrder = 1;
    const white = new THREE.Mesh(new THREE.CircleGeometry(SCL_R, 56),
      new THREE.MeshBasicMaterial({ map: scleraTex, depthWrite: false }));
    white.renderOrder = 2;
    sclera.add(outline); sclera.add(white);
    const pupilGrp = new THREE.Group(); pupilGrp.position.z = 1.02;
    const pupil = new THREE.Mesh(new THREE.CircleGeometry(0.122, 48),
      new THREE.MeshBasicMaterial({ map: pupilTex, depthWrite: false }));
    pupil.renderOrder = 3;   // outline(1) → sclera(2) → pupil(3) → char eyes(4)
    pupilGrp.add(pupil);
    // ── CHARACTER EYES: legendary skins change the PUPIL, which is what your
    // brain reads as "a different creature". Hidden on the default void.
    const starPupil = new THREE.Mesh(starShape(0.075, 0.032, 5),
      new THREE.MeshBasicMaterial({ color: 0xffe8a0, transparent: true, opacity: 0, depthWrite: false }));
    starPupil.position.z = 0.012; starPupil.rotation.z = Math.PI;   // point up
    const glowRing = new THREE.Mesh(new THREE.RingGeometry(0.085, 0.13, 28),
      new THREE.MeshBasicMaterial({ color: 0x4de8ff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    glowRing.position.z = 0.008;
    starPupil.renderOrder = 4; glowRing.renderOrder = 4;
    pupilGrp.add(starPupil); pupilGrp.add(glowRing);
    charEyes.push({ star: starPupil, ring: glowRing });
    g.add(sclera); g.add(pupilGrp);
    g.position.set(sx, 0.06, 0);
    face.add(g); eyes.push({ g, sclera, pupilGrp, outline });
  }
  // blush (pink, soft) — a painted falloff, not a flat pink lozenge. The hard
  // edge of a plain disc is what made the cheeks read as two stickers.
  const blushTex = (() => {
    const S = 64, cv = document.createElement('canvas'); cv.width = cv.height = S;
    const x = cv.getContext('2d')!;
    const g = x.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.45, 'rgba(255,255,255,0.85)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, S, S);
    return new THREE.CanvasTexture(cv);
  })();
  for (const sx of [-0.49, 0.49]) {
    const b = new THREE.Mesh(new THREE.CircleGeometry(0.155, 32),
      new THREE.MeshBasicMaterial({ color: VOID.blush, map: blushTex, transparent: true, opacity: 0.5, depthWrite: false }));
    b.scale.set(1.06, 0.70, 1); b.position.set(sx, -0.19, 0.99);
    face.add(b);
  }
  // smiling mouth — the KEY-ART kawaii open smile: a soft plum half-disc with
  // a little pink tongue. (The old thin torus arc curled up hard at both ends
  // — read as a too-wide clown grin.) Plus the big "maw" that scales in when
  // eating or firing GULP.
  const mouth = new THREE.Group();
  // ── NO FANGS ────────────────────────────────────────────────────────────
  // Two little teeth used to drop into the smile from GOBBLER on, as a per-form
  // read that survives at eighteen pixels. The owner's verdict: "Why do the
  // voids have teeth? Doesn't make sense." He is right, and for a better reason
  // than legibility. This character is a HOLE with a face — a hole has no
  // dentistry — and teeth on a purple thing that eats people is the one detail
  // that tips it from cute toward predatory, in a game for six-year-olds where
  // every other decision has been pulled the other way.
  //
  // The mesh factory stays and the array stays empty, so the per-frame loop and
  // the growth easing below are untouched and there is one obvious place to put
  // a different per-form read if one is ever wanted (a wider maw, a rounder
  // lip, a brighter tongue — anything but teeth).
  const fangMat = new THREE.MeshBasicMaterial({ color: 0xfff6ec, depthWrite: false });
  const fangs: THREE.Mesh[] = [];
  const mkFang = (parent: THREE.Group, x: number, y: number, r: number) => {
    const f = new THREE.Mesh(new THREE.CircleGeometry(r, 3), fangMat);
    f.rotation.z = Math.PI / 2;   // point along +y (the group flip aims it down)
    f.position.set(x, y, 0.006);
    f.scale.set(0.72, 1, 1);
    f.renderOrder = 2;            // lip(0) → tongue(1) → teeth(2); z alone loses
    // NOT added to the mouth and NOT registered: see the note above. Returning
    // the mesh keeps every caller's shape.
    void parent;
    return f;
  };
  {
    // upper semicircle; the group's PI rotation (below) hangs the dome down
    const lip = new THREE.Mesh(new THREE.CircleGeometry(0.165, 40, 0, Math.PI),
      new THREE.MeshBasicMaterial({ color: VOID.mouth, depthWrite: false }));
    const tongue = new THREE.Mesh(new THREE.CircleGeometry(0.09, 24),
      new THREE.MeshBasicMaterial({ color: 0xff6f91, depthWrite: false }));
    tongue.scale.set(1.35, 0.6, 1); tongue.position.set(0, 0.075, 0.004);
    tongue.renderOrder = 1;
    mouth.add(lip); mouth.add(tongue);
    mkFang(mouth, -0.086, 0.052, 0.058); mkFang(mouth, 0.086, 0.052, 0.058);
  }
  mouth.rotation.z = Math.PI; mouth.position.set(0, -0.26, 1.0);
  face.add(mouth);
  const maw = new THREE.Group(); maw.position.set(0, -0.3, 1.01); maw.scale.setScalar(0.001);
  const mawDark = flat(0.2, 0x2a0e2e); mawDark.scale.set(1, 1.15, 1);
  const tongue = flat(0.12, 0xff6f91); tongue.position.set(0, -0.09, 0.01); tongue.scale.set(1.15, 0.7, 1);
  tongue.renderOrder = 1;
  maw.add(mawDark); maw.add(tongue);
  {
    // the gape gets its own, bigger set — hanging down from the upper lip
    const a = mkFang(maw, -0.098, 0.142, 0.072); a.rotation.z = -Math.PI / 2;
    const b = mkFang(maw, 0.098, 0.142, 0.072); b.rotation.z = -Math.PI / 2;
  }
  face.add(maw);

  // ── EXPRESSION RIG: brows / sweat / zzz — the mood system's extra parts ────
  // (flat meshes inside the billboarded face group: cheap, always camera-true)
  // brows are painted, not stamped: a tapered stroke with rounded ends reads
  // as a drawn brow. Two hard-edged rectangles read as two dashes of tape.
  const browTex = (() => {
    // 512 x 128, not 128 x 32. At WORLD ENDER the hero's face fills most of a
    // phone screen and this 0.32-unit plane is magnified enormously — at the
    // old resolution the brow arrived on screen as a blurred bar. It is four
    // kilobytes; there is no reason for it to be the softest thing on the
    // character's face.
    const W = 512, H = 128, cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d')!;
    x.fillStyle = '#ffffff';
    // A TAPER, drawn as an outline rather than stroked at one width. A
    // constant lineWidth with round caps is a sausage — same thickness at
    // both ends — and every brow anyone has ever drawn is heavy at the inner
    // end and runs out to a point at the outer one. That single asymmetry is
    // most of what makes a mark read as drawn rather than as placed.
    const P0 = [22, H * 0.70], P1 = [W * 0.46, H * 0.10], P2 = [W - 20, H * 0.40];
    const at = (t: number) => {
      const u = 1 - t;
      return [u * u * P0[0] + 2 * u * t * P1[0] + t * t * P2[0],
              u * u * P0[1] + 2 * u * t * P1[1] + t * t * P2[1]];
    };
    const halfW = (t: number) => H * 0.30 * Math.pow(1 - t, 0.75) + H * 0.035;
    const N = 48, top: number[][] = [], bot: number[][] = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N, [px, py] = at(t);
      const [nx0, ny0] = at(Math.min(1, t + 0.01));
      const dx = nx0 - px, dy = ny0 - py, L = Math.hypot(dx, dy) || 1;
      const nx = -dy / L, ny = dx / L, w2 = halfW(t);
      top.push([px + nx * w2, py + ny * w2]);
      bot.push([px - nx * w2, py - ny * w2]);
    }
    x.beginPath();
    x.moveTo(top[0][0], top[0][1]);
    for (const p of top) x.lineTo(p[0], p[1]);
    for (let i = bot.length - 1; i >= 0; i--) x.lineTo(bot[i][0], bot[i][1]);
    x.closePath(); x.fill();
    // and round the heavy inner end, so the taper starts from a cap not a cut
    x.beginPath(); x.arc(P0[0], P0[1], halfW(0), 0, Math.PI * 2); x.fill();
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  })();
  const browMat = new THREE.MeshBasicMaterial({ color: 0x2a1f45, map: browTex, transparent: true, opacity: 0, depthWrite: false });
  const brows: THREE.Mesh[] = [];
  for (const sx of [-0.36, 0.36]) {
    const bw = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.09), browMat);
    bw.position.set(sx, 0.4, 1.0);
    if (sx > 0) bw.scale.x = -1;   // mirror, so both brows sweep off the nose
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
  /** THREE CRISP Zs, NOT AN EMOJI. The idle tell was a 💤 glyph on a 64px
   *  canvas scaled to 0.42 face-units — about fifteen device pixels at ordinary
   *  play size, drawn in whatever the system font felt like, with no outline. It
   *  was invisible against a bright island, which is exactly the owner's report:
   *  "when we don't move we see zzzzz. It's hard to see." Hand-drawn Zs on a
   *  512px canvas with a dark stroke behind white fill read at any size and over
   *  any ground, and the three sizes give it the rising-cartoon-snore shape. */
  const zzzTex = (() => {
    const S = 512, cv = document.createElement('canvas');
    cv.width = cv.height = S;
    const g = cv.getContext('2d')!;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineJoin = 'round'; g.lineCap = 'round';
    // small at the mouth, big at the top — a snore drifting upward
    const zs: [number, number, number][] = [[0.30, 0.80, 96], [0.50, 0.52, 150], [0.72, 0.22, 210]];
    for (const [fx, fy, size] of zs) {
      g.font = `900 ${size}px Fredoka, system-ui, sans-serif`;
      g.strokeStyle = 'rgba(20,8,40,0.92)'; g.lineWidth = size * 0.26;
      g.strokeText('Z', fx * S, fy * S);
      g.fillStyle = '#ffffff';
      g.fillText('Z', fx * S, fy * S);
    }
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  const zzz = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 1.15),
    new THREE.MeshBasicMaterial({ map: zzzTex, transparent: true, opacity: 0, depthWrite: false }));
  zzz.position.set(0.62, 1.05, 1.0); face.add(zzz);
  // the whole face draws AFTER the body, in a fixed internal order. Left to
  // three's opaque sort these flat discs shuffle against each other and
  // against the sphere depending on camera angle — which is how you end up
  // with a pupil hidden behind its own eye white.
  face.traverse((o) => { o.renderOrder += 1; });
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
    // heavy level brows sitting low, a lid most of the way down, and a small
    // soft mouth — a nap, not a grin with the eyes shut
    sleepy:  { lid: 0.26, smile: 0.66, mouthY: 0.62, pupil: 0.86,
               brow: 0.95, browAng: -0.02, browY: 0.33, blush: 0.62, zzz: 1 },
    victory: { pupil: 1.35, wide: 1.06, smile: 1.5, blush: 0.9, maw: 0.18, brow: 0.85, browAng: 0.2, browY: 0.47, bounce: 1 },
  };
  const BASE = { ...mp };
  // direction-flip anticipation squash
  let pvx = 0, pvz = 0, flipT = 0;

  // ── BODY PARTS: anatomy, not costume. A snout/muzzle/mane changes the
  // SILHOUETTE of the creature itself, which is the difference between "a
  // void wearing a unicorn hat" and "a unicorn void".
  const bodyPart: Record<string, THREE.Group> = {};
  let maneMat: THREE.MeshStandardMaterial | null = null;
  const dress = new THREE.Group();
  dress.name = 'dress';   // QA: the costume-placement probe finds parts by this
  bob.add(dress);
  {
    const mk = (kind: string, build: (g: THREE.Group) => void) => {
      const g = new THREE.Group(); build(g); g.visible = false;
      g.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.castShadow = true; });
      dress.add(g); bodyPart[kind] = g;
    };
    // DINO SNOUT: a blunt jaw pushing out of the face, with nostrils + teeth
    mk('snout', (g) => {
      const skinM = new THREE.MeshStandardMaterial({ color: 0x55b850, roughness: 0.55 });
      const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.46, 16, 12), skinM);
      jaw.scale.set(0.78, 0.58, 1.0); jaw.position.set(0, -0.56, 0.8); g.add(jaw);
      const teeth = new THREE.MeshStandardMaterial({ color: 0xfff6e8, roughness: 0.4 });
      for (const sx of [-0.17, 0.17]) {
        const t = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.16, 5), teeth);
        t.position.set(sx, -0.74, 1.1); t.rotation.x = Math.PI; g.add(t);
      }
    });
    // DRAGON MUZZLE: longer, with brow ridges and warm nostril glow
    mk('muzzle', (g) => {
      const skinM = new THREE.MeshStandardMaterial({ color: 0x2394a8, roughness: 0.5 });
      const snout = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.34, 0.62, 12), skinM);
      snout.rotation.x = Math.PI / 2; snout.position.set(0, -0.5, 0.88); g.add(snout);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.21, 14, 10), skinM);
      tip.position.set(0, -0.5, 1.16); g.add(tip);
      const glow = new THREE.MeshStandardMaterial({ color: 0xffb054, emissive: 0xff7a2a, emissiveIntensity: 1.2 });
      for (const sx of [-0.08, 0.08]) {
        const n = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), glow);
        n.position.set(sx, -0.46, 1.3); g.add(n);
      }
    });
    // MANE: a soft ruff of tufts around the crown — reads as FUR from above
    mk('mane', (g) => {
      const m = new THREE.MeshStandardMaterial({ color: 0xf6e8ff, roughness: 0.85, flatShading: true });
      maneMat = m;   // tinted per skin at equip time — see setSkin
      // BACK HEMISPHERE ONLY. A ruff that wraps the front buries the face —
      // the eyes are the character, nothing may sit in front of them.
      for (let i = 0; i < 9; i++) {
        const a2 = Math.PI * (0.18 + (i / 8) * 0.64);   // 32deg..145deg, all behind
        const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.62, 5), m);
        const sx = Math.cos(a2) * 0.72, sz = -Math.abs(Math.sin(a2)) * 0.72 - 0.18;
        tuft.position.set(sx, 0.5 + Math.sin(i * 2.1) * 0.1, sz);
        tuft.rotation.set(-0.75, a2, Math.cos(a2) * 0.6);
        tuft.scale.setScalar(0.9 + (i % 3) * 0.18);
        g.add(tuft);
      }
    });
    // VISOR: a wraparound faceplate — the body is MACHINE, not a ball
    mk('visor', (g) => {
      // HELMET, not a faceplate: a chrome shell capping the crown and sweeping
      // down the sides, with a glowing brow band. Eyes stay wide open.
      const chrome2 = new THREE.MeshStandardMaterial({ color: 0xb8c4d0, metalness: 0.85, roughness: 0.22 });
      const cap = new THREE.Mesh(new THREE.SphereGeometry(1.03, 26, 16, 0, Math.PI * 2, 0, Math.PI * 0.34), chrome2);
      cap.position.z = -0.06; g.add(cap);
      for (const sx of [-1, 1]) {   // cheek plates, well clear of the face
        const pl = new THREE.Mesh(new THREE.SphereGeometry(1.02, 20, 14, 0, Math.PI * 0.3, Math.PI * 0.3, Math.PI * 0.4), chrome2);
        pl.rotation.y = sx > 0 ? -Math.PI * 0.15 : Math.PI * 0.85; g.add(pl);
      }
      const brow = new THREE.Mesh(new THREE.TorusGeometry(0.66, 0.07, 8, 24, Math.PI * 0.9),
        new THREE.MeshStandardMaterial({ color: 0x4de8ff, emissive: 0x4de8ff, emissiveIntensity: 1.3 }));
      brow.position.set(0, 0.52, 0.62); brow.rotation.set(0.5, 0, 0); g.add(brow);
    });
  }

  // ── legendary accessories: 3D flair that rides (and squashes with) the orb ──
  const acc: Record<string, THREE.Group> = {};
  {
    // the five that ship. buildAccessory still knows 'wizard' and 'mecha' —
    // rivals.ts calls it directly — but the hero does not build hidden groups
    // for skins that no longer exist.
    for (const name of ['unicorn', 'dino', 'dragon', 'ninja', 'king']) {
      const g = buildAccessory(name);
      g.visible = false;
      dress.add(g); acc[name] = g;
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

  // ── SIGNATURE AURA: the third thing (after silhouette and eyes) that makes a
  // legendary read as a CHARACTER — stars for the unicorn, embers for the
  // dragon, bolts for the mecha. Twelve billboards, one shared texture per
  // kind, drawn only when a skin asks for them.
  const auraTex: Record<string, THREE.CanvasTexture> = {};
  const makeAuraTex = (kind: string) => {
    if (auraTex[kind]) return auraTex[kind];
    const cv = document.createElement('canvas'); cv.width = cv.height = 64;
    const x = cv.getContext('2d')!;
    x.fillStyle = '#ffffff';
    x.translate(32, 32);
    if (kind === 'stars') {
      x.beginPath();
      for (let i = 0; i < 4; i++) { x.moveTo(0, 0); x.quadraticCurveTo(5, -6, 0, -28); x.quadraticCurveTo(-5, -6, 0, 0); x.rotate(Math.PI / 2); }
      x.fill();
    } else if (kind === 'bolts') {
      x.beginPath(); x.moveTo(-4, -26); x.lineTo(9, -4); x.lineTo(1, -2); x.lineTo(6, 26); x.lineTo(-9, 3); x.lineTo(-1, 1); x.closePath(); x.fill();
    } else {   // embers + bubbles: soft round dot
      const gr = x.createRadialGradient(0, 0, 0, 0, 0, 28);
      gr.addColorStop(0, 'rgba(255,255,255,1)');
      gr.addColorStop(kind === 'bubbles' ? 0.55 : 0.35, 'rgba(255,255,255,0.55)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = gr; x.beginPath(); x.arc(0, 0, 28, 0, Math.PI * 2); x.fill();
    }
    const t = new THREE.CanvasTexture(cv);
    auraTex[kind] = t; return t;
  };
  const AURA_N = 12;
  const aura = new THREE.Group();
  bob.add(aura);   // rides the squash/stretch so it feels attached to the body
  const auraSp: THREE.Sprite[] = [];
  const auraSeed: number[] = [];
  for (let i = 0; i < AURA_N; i++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    sp.scale.setScalar(0.2);
    // FIXED phases, not Math.random(): the hero has to look identical on every
    // single load. A sparkle ring that reshuffles itself per session is exactly
    // the kind of drift that makes a splash screen impossible to art-direct.
    aura.add(sp); auraSp.push(sp); auraSeed.push((i * 2.399963) % (Math.PI * 2));
  }
  let auraOn = false, auraKind = 'stars', pupilSquash = 1;

  let radius = 4;
  // AAA growth feel: gameplay radius is the TARGET; what you SEE is a spring
  // chasing it with a slight underdamp — every meal lands as a visible jiggly
  // swell-and-settle instead of an imperceptible creep. Big jumps (rematch,
  // debug warp) snap so the spring never animates across half the island.
  let dispR = 4, dispV = 0;
  let wobble = 0;   // jelly slosh amplitude (decays after each eat)
  let stage = 0, ringFade = 0;
  let moveAmt = 0, blinkT = 3.4, blink = 0, blinkN = 0;   // blink cadence is authored, not rolled
  let mouthT = 0, mouthMax = 0;    // open-mouth envelope
  let stretchT = 0;                // rocket stretch pulse
  let inhaleT = 0;                 // collapse inhale->burst envelope
  let evolveT = 0;                 // evolution celebration pop
  let ringBurst = 0;               // ring + star flare on evolve
  let skinHasTex = false;
  const stretchDir = new THREE.Vector3(0, 0, 1);   // travel direction, body space
  let fangGrow = 0;                                // teeth ease in with the form

  const api: Void3D = {
    group,
    get radius() { return radius; },
    set radius(r: number) { radius = r; },
    setRadius(r: number) {
      radius = r;
      // A HOLE SHOULD NOT THROW A SHADOW SIDEWAYS. Under GAME DAY's 40-degree
      // sun a WORLD ENDER is a 24-unit sphere, and casting from it laid a hard
      // black ellipse on the ground beside the hero, offset by more than its own
      // diameter — a second dark mass the eye reads as another void, fighting
      // the bright aperture lip that is the one cue saying "hole" and not
      // "ball". Small, a real shadow is what grounds him; big, the contact disc
      // below already does that job and does it correctly. It also hands back
      // the largest single caster in the frustum during the heaviest third of
      // every match.
      // (the body does not cast — see the note on `contact`. Left explicit so
      // nothing reintroduces it by accident.)
      body.castShadow = false;
    },
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
      // the mane is shared geometry, so it takes the wearer's own colour —
      // otherwise the Archmage turns up in Uni-Void's white unicorn hair
      if (maneMat) maneMat.color.set(s.rim);
      // ── apply the CHARACTER RIG (legendary skins only) ──────────────────
      const ch = s.char;
      const eyeMode = ch?.eyes;
      for (const ce of charEyes) {
        const sm = ce.star.material as THREE.MeshBasicMaterial;
        const rm = ce.ring.material as THREE.MeshBasicMaterial;
        sm.opacity = eyeMode === 'star' ? 1 : 0;
        rm.opacity = eyeMode === 'glow' ? 0.9 : eyeMode === 'fierce' ? 0.75 : 0;
        if (eyeMode === 'glow') rm.color.set(s.glow);
        if (eyeMode === 'fierce') rm.color.set(s.rim);
      }
      // fierce = narrowed pupils (predator read); star/glow keep the round eye
      pupilSquash = eyeMode === 'fierce' ? 0.72 : 1;
      auraOn = !!ch?.aura;
      auraKind = ch?.auraKind ?? 'stars';
      if (auraOn) {
        const t = makeAuraTex(auraKind);
        for (const sp of auraSp) {
          const m = sp.material as THREE.SpriteMaterial;
          m.map = t; m.color.set(ch!.aura!); m.needsUpdate = true;
        }
      } else {
        for (const sp of auraSp) (sp.material as THREE.SpriteMaterial).opacity = 0;
      }
      bodyMat.uniforms.uGloss.value = ch?.gloss ?? 0;
      const PAT: Record<string, number> = { scales: 1, chrome: 2, fur: 3, starfield: 4, stitch: 5 };
      bodyMat.uniforms.uPat.value = ch?.pattern ? PAT[ch.pattern] : 0;
      if (ch?.patCol) bodyMat.uniforms.uPatCol.value.set(ch.patCol);
      // extra BODY geometry (a snout is anatomy, not an accessory)
      for (const k in bodyPart) bodyPart[k].visible = false;
      if (ch?.body && bodyPart[ch.body]) bodyPart[ch.body].visible = true;
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
    // GRADED. This took no argument, so the mouth opened exactly as wide for a
    // hotel as for a hydrant — about fifty times a match, on the one action the
    // whole game is made of. `k` is the meal's size relative to the void.
    chomp(k = 0.3) {
      const g = Math.min(1, Math.max(0.12, k));
      const want = 0.18 + 0.30 * g;                 // 0.22 -> 0.48 of a second
      const wide = 0.42 + 0.58 * g;                 // 0.47 -> 1.00 of the jaw
      if (mouthT < want) { mouthT = want; mouthMax = wide; }
      wobble = Math.min(1, wobble + 0.30 + 0.55 * g);
    },
    /** Kick the growth spring directly — an absorbed meal should shove the
     *  blob, not just raise its target radius. */
    impulse(v2: number) {
      dispV += v2;
      // one meal's worth of kick, never a chain of them summed
      dispV = Math.min(dispV, 2.6);
    },
    animGulp() { mouthT = 0.6; mouthMax = 1; wobble = 1; },
    animDash() { stretchT = 0.5; mouthT = Math.max(mouthT, 0.4); mouthMax = 0.8; wobble = Math.min(1, wobble + 0.4); },
    animCollapse() { inhaleT = 0.9; mouthT = 0.9; mouthMax = 1; wobble = 1; },
    update(dt, s) {
      bodyMat.uniforms.uTime.value = s.t;

      // ── FLUID GROWTH: the displayed size springs after the gameplay size ──
      // slightly underdamped, so each absorb visibly swells the blob past its
      // new size and jiggles back — you SEE the growth land, hole.io-style
      if (Math.abs(radius - dispR) > Math.max(1.5, radius * 0.5)) { dispR = radius; dispV = 0; }   // warp/rematch: snap
      // 46/8.5 is zeta 0.63 — an 8% overshoot, which is invisible. The blob is
      // meant to visibly swell PAST its new size and jiggle back on every meal;
      // at 95/9.0 (zeta ~0.46) it actually does, and impulse() above can shove
      // it further on a big one.
      dispV += (radius - dispR) * 95 * dt;
      dispV *= Math.max(0, 1 - 9.0 * dt);
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

      // ── MASS ── a heavier void breathes, sloshes and bobs SLOWER. Same
      // curves, one time scale, and suddenly WORLD ENDER has weight instead of
      // vibrating at exactly the speed a marble does.
      const slow = THREE.MathUtils.clamp(1.25 / (0.6 + dispR * 0.28), 0.36, 1.25);
      bodyMat.uniforms.uSlow.value = slow;

      // lift so the orb rests partly sunk into the ground; roll-bob while
      // moving — frenzy/victory add a real happy bounce
      const lift = dispR * (RADIUS_SINK + Math.abs(Math.sin(s.t * (6 + mp.bounce * 3) * slow)) * moveAmt * (0.05 + mp.bounce * 0.055));
      group.position.set(s.x, lift, s.z);

      // squash/stretch + lean on the bob (body+glow only) — gentle, so the orb
      // stays a cute round orb, never pinched
      const breathe = Math.sin(s.t * 2.2 * slow) * 0.016;
      // DIRECTIONAL stretch goes to the shader (along the travel vector);
      // the bob keeps only the vertical squash, so hats and sparkles ride the
      // body without being sheared with it.
      let along = moveAmt * 0.085;
      let squash = 1 - moveAmt * 0.05 + breathe;
      if (flipT > 0) { along *= 0.25; squash *= 1.10; }   // wind-up before the turn
      if (mood === 'hurt') bob.rotation.y = Math.sin(s.t * 34) * 0.05; else bob.rotation.y *= 1 - Math.min(1, dt * 8);
      // power envelopes
      if (stretchT > 0) {           // ROCKET BITE: lunge-stretch pulse
        stretchT -= dt;
        const k = Math.sin(Math.max(0, stretchT) / 0.5 * Math.PI) * 0.2;
        along += k; squash -= k * 0.7;
      }
      let uniformK = 1;
      if (inhaleT > 0) {            // COLLAPSE: inhale-shrink, then burst back
        inhaleT -= dt;
        const ph = 1 - Math.max(0, inhaleT) / 0.9;
        uniformK += ph < 0.62 ? -0.24 * (ph / 0.62) : -0.24 + 0.42 * ((ph - 0.62) / 0.38);
      }
      if (evolveT > 0) {            // EVOLVED! celebratory double-bounce
        evolveT -= dt;
        uniformK += Math.sin(Math.max(0, evolveT) / 0.7 * Math.PI * 2) * 0.16 * (evolveT / 0.7);
      }
      const lat = uniformK - breathe;
      squash *= uniformK;
      bob.scale.set(dispR * lat, dispR * squash, dispR * lat);
      bob.rotation.z = THREE.MathUtils.clamp(-s.vx / 520, -0.11, 0.11);
      bob.rotation.x = THREE.MathUtils.clamp(s.vz / 520, -0.11, 0.11);
      // feed the travel direction to the vertex shader in the body's own space
      if (speed > 0.5) stretchDir.set(s.vx / speed, 0, s.vz / speed);
      bodyMat.uniforms.uStretchDir.value.copy(stretchDir);
      bodyMat.uniforms.uStretchAmt.value = along;

      // ── READABILITY ── how many pixels across is he, right now? The camera
      // pulls back as he grows, so his on-screen size is nearly constant in
      // play but collapses on a phone and in the opening dive. Everything the
      // player needs to read — rim width, eye size, outline weight — is scaled
      // off this instead of being authored once for a screenshot.
      const persp = camera as THREE.PerspectiveCamera;
      const fov = persp.isPerspectiveCamera ? persp.fov : 32;
      const camD = Math.max(1, camera.position.distanceTo(group.position));
      const pxR = (window.innerHeight / (2 * camD * Math.tan(fov * Math.PI / 360))) * dispR;
      const small = THREE.MathUtils.clamp((64 - pxR) / 40, 0, 1);
      bodyMat.uniforms.uSmall.value = small;

      // face: billboard to camera, scale with the void
      face.scale.setScalar(dispR);
      face.position.set(0, dispR * 0.1, 0);
      face.quaternion.copy(camera.quaternion);
      // …and the costume follows the face round the orb. Yaw only: a crown
      // must stay on top of the head, not tip toward the lens.
      dress.rotation.y = Math.atan2(camera.position.x - group.position.x, camera.position.z - group.position.z);
      // A crown point 0.38 units tall is 3.5 device pixels at match start, so
      // the parts get the same caricature LOD the eyes and mouth already have
      // (eyeLod below) — otherwise the thing a parent paid for is invisible for
      // the first third of every match.
      dress.scale.setScalar(1 + small * 0.42);
      // ── AND PUSH IT CLEAR OF THE BODY ──────────────────────────────────
      // The features used to sit at z = 1.0–1.02 in a unit-sphere face, i.e.
      // exactly ON the surface. Every jelly slosh (up to +11%) and every
      // ROCKET BITE stretch (up to +20%) therefore swallowed the eyes and the
      // smile — the void went blank at the exact moment it ate something,
      // which is the moment the whole game is about. The face now rides out in
      // front of whatever envelope the body is currently occupying, measured,
      // so it can never be buried and never floats further than it must.
      const envelope = Math.max(lat, squash) * (1 + along) * (1 + wobble * 0.075);
      face.translateZ(dispR * Math.max(0.04, envelope - 1 + 0.05));

      // mouth: maw scales in while open, smile hides
      if (mouthT > 0) mouthT -= dt;
      const mo = Math.max(mouthT > 0 ? mouthMax * Math.min(1, mouthT * 8) : 0, mp.maw);
      maw.scale.setScalar(Math.max(0.001, mo));
      mouth.visible = mo < 0.25;
      // FANGS grow in over GOBBLER→WORLD ENDER — the void's face itself levels up
      fangGrow += (THREE.MathUtils.clamp((stage - 1.2) * 0.75, 0, 1) - fangGrow) * Math.min(1, dt * 3);
      for (const f of fangs) { f.visible = fangGrow > 0.02; f.scale.set(0.72 * fangGrow, fangGrow, 1); }

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
      // blush turns to mud once the cheeks are a few pixels wide — fade it out
      // rather than let it grey down the two brightest parts of the silhouette
      for (const bm of blushMats) bm.opacity = mp.blush * (1 - small * 0.45);
      (sweat.material as THREE.MeshBasicMaterial).opacity = mp.sweat;
      sweat.position.y = 0.52 + Math.sin(s.t * 9) * 0.045;
      sweat.scale.setScalar(0.9 + Math.sin(s.t * 9) * 0.1);
      (zzz.material as THREE.MeshBasicMaterial).opacity = mp.zzz * (0.7 + 0.3 * Math.sin(s.t * 1.6));
      // …and it gets the same small-size caricature the eyes and mouth get, so
      // the idle tell is readable on a speck as well as on a WORLD ENDER
      zzz.scale.setScalar(1 + small * 0.5);
      zzz.position.set(0.62 + Math.sin(s.t * 0.9) * 0.05, 1.05 + Math.sin(s.t * 1.3) * 0.09, 1.0);

      // pupil tracking + blink (sleepy mood = slow drowsy wander). The cadence
      // is an authored cycle, not Math.random() — same void every load.
      blinkT -= dt;
      if (blinkT <= 0 && blink <= 0) {
        // a drowsy blink is a long slow droop, not the same 0.16s flick fired
        // more often — that read as fluttering, which is the opposite of tired
        blink = mood === 'sleepy' ? 0.44 : 0.16; blinkN++;
        blinkT = (mood === 'sleepy' ? 2.2 : 2.5) + [1.7, 3.4, 0.9, 2.6, 4.1][blinkN % 5];
      }
      let open = 1;
      if (blink > 0) {
        const halfB = mood === 'sleepy' ? 0.22 : 0.08;
        blink -= dt; open = Math.min(1, Math.abs(blink - halfB) / halfB);
      }
      // A DROWSY GAZE DRIFTS DOWN, it does not scan. This was a 0.7 Hz sweep
      // across 60% of the eye's width with a bias that ended up ABOVE centre
      // half the time. Now it settles low and wanders slowly and slightly,
      // which is what half-shut eyes do.
      const wanderX = mood === 'sleepy' ? Math.sin(s.t * 0.38) * 0.2 : 0;
      const wanderY = mood === 'sleepy' ? -0.75 + Math.sin(s.t * 0.29) * 0.12 : 0;
      // AT SMALL SIZE THE FACE GROWS. The eyes ARE the character; at 18 px a
      // "correctly proportioned" eye is four pixels of mush. Caricature them
      // back up as he shrinks on screen, exactly the way an icon designer would.
      const eyeLod = 1 + small * 0.18;
      for (const e of eyes) {
        // the pupil must live INSIDE the eyeball. It used to be offset by a
        // flat 0.09 on a 0.21 sclera with a pupil that grew to 0.198 in the
        // hungry/frenzy moods — so at the exact moments he was most alive, both
        // pupils slid out through the side of his own eyes.
        const pk = Math.min(1.3, stageBoost * mp.pupil);          // pupil vs sclera
        const grow = 1 + (stageBoost * mp.pupil - pk) * 0.5;      // surplus grows the EYE
        const eyeK = eyeLod * grow;
        e.g.scale.set(eyeK, eyeK, 1);
        e.g.position.x = Math.sign(e.g.position.x || 1) * 0.36 * (1 + small * 0.05);
        // BLINK FROM THE TOP: a lid comes down, it does not implode toward the
        // middle of the eyeball. Anchoring the collapse high sells the lid.
        const oy = Math.max(0.08, open) * mp.lid;
        const drop = SCL_R * (1 - oy) * 0.5;
        const room = Math.max(0, SCL_R - 0.122 * pk - 0.012);
        e.pupilGrp.position.x = THREE.MathUtils.clamp((s.lookX + wanderX) * 0.09, -room, room);
        // …and the VERTICAL offset lives in the squashed eye, so it is squashed
        // with it. Everything below the lift is in sclera-local space and is
        // multiplied by the same `oy` the eyeball got, which makes the pupil
        // containable at any lid value by construction rather than by luck at
        // lid 1. The clamp gets its own vertical room for the same reason.
        const roomY = Math.max(0, room * oy);
        const gazeY = 0.06 * oy + THREE.MathUtils.clamp((s.lookY + wanderY) * 0.06 * oy, -roomY, roomY);
        e.sclera.scale.set(mp.wide, oy * mp.wide, 1);
        e.sclera.position.y = drop;
        e.pupilGrp.scale.set(pk, oy * pk * pupilSquash, 1);
        e.pupilGrp.position.y = drop + gazeY;
        // outline weight: fattens as he shrinks, so the eye keeps a dark
        // boundary against a bright body even at a handful of pixels
        e.outline.scale.setScalar(SCL_R * (1 + 0.05 + small * 0.14));
      }
      // mouth: smile scale + smirk tilt + frown flip (scale.y through ~0 = flat)
      const mk = mp.smile * (1 + small * 0.20);            // caricature when tiny
      mouth.scale.set(mk, Math.sign(mp.mouthY || 1) * Math.max(0.06, Math.abs(mp.mouthY)) * mk, 1);
      mouth.rotation.z = Math.PI + mp.smirk;
      mouth.position.y = mp.mouthY < 0 ? -0.22 : -0.28;   // frowns ride a touch higher

      // ── SIGNATURE AURA: sparkles orbit the body on their own little paths.
      // Stars twinkle and drift; embers rise and fade; bubbles bob; bolts
      // flicker. Costs 12 sprites and gives every legendary a moving identity.
      if (auraOn) {
        for (let i = 0; i < AURA_N; i++) {
          const sp = auraSp[i], sd = auraSeed[i];
          const a = sd + s.t * (auraKind === 'bolts' ? 1.4 : 0.55) + i * 0.52;
          const rr = 1.24 + Math.sin(s.t * 0.9 + sd) * 0.1;
          const rise = auraKind === 'embers' ? ((s.t * 0.42 + sd) % 1) : 0;
          sp.position.set(
            Math.cos(a) * rr,
            Math.sin(sd * 3.1 + s.t * 0.8) * 0.55 + rise * 1.5 - (auraKind === 'embers' ? 0.5 : 0),
            Math.sin(a) * rr,
          );
          const tw = auraKind === 'bolts'
            ? (Math.sin(s.t * 9 + sd * 5) > 0.35 ? 1 : 0.05)
            : 0.45 + 0.55 * Math.sin(s.t * 2.4 + sd * 4);
          const fade = auraKind === 'embers' ? 1 - rise : 1;
          (sp.material as THREE.SpriteMaterial).opacity = tw * fade * 0.85;
          sp.scale.setScalar((auraKind === 'bubbles' ? 0.2 : 0.26) * (0.7 + tw * 0.5));
        }
      }

      // THE PIT tracks the void on the floor. 1.52x the ball's own width, so a
      // half-radius annulus of dark ground is always visible around the
      // silhouette however the camera is framed — at the fixed 46.4-degree
      // elevation anything under about 1.45x is entirely hidden behind the ball.
      contact.position.set(s.x, 0.05, s.z); contact.scale.setScalar(dispR * 1.52);
      lip.position.set(s.x, 0.06, s.z); lip.scale.setScalar(dispR * 1.5);
      // the lip is a RIM, not a hoop: it carries the read at speck size, where
      // the pit alone is a few pixels, and steps back once the hole is big
      // enough to speak for itself
      (lip.material as THREE.MeshBasicMaterial).opacity =
        THREE.MathUtils.clamp(0.52 - dispR * 0.028, 0.2, 0.52);
    },
  };

  return api;
}

// ── shared legendary-accessory factory: the SAME 3D flair the player wears
// is worn by rivals in their random skins (unit-orb space, scale with r)
export function buildAccessory(kind: string): THREE.Group {
  const g = new THREE.Group();
  if (kind === 'unicorn') {
    // matches the Uni-Void card: a BIG rainbow spiral horn and real fluffy
    // ears with pink inners. The old 0.16×0.72 nub was invisible in play.
    const RAINBOW = [0xff5d7e, 0xffb054, 0xffe066, 0x7ef2a0, 0x6fd8ff, 0xb875ff];
    for (let i = 0; i < 6; i++) {
      const t = i / 6;
      const seg = new THREE.Mesh(new THREE.ConeGeometry(0.3 * (1 - t * 0.82), 0.2, 12, 1, true),
        new THREE.MeshStandardMaterial({ color: RAINBOW[i], roughness: 0.25, metalness: 0.45,
          emissive: RAINBOW[i], emissiveIntensity: 0.45 }));
      seg.position.set(0, 1.12 + t * 0.92, 0.12);
      seg.rotation.set(0.2, t * 2.4, 0);   // twisting spiral
      seg.scale.setScalar(1 - t * 0.08);
      g.add(seg);
    }
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.24, 10),
      new THREE.MeshStandardMaterial({ color: 0xfff0ff, emissive: 0xffd2f0, emissiveIntensity: 1.1, roughness: 0.2 }));
    tip.position.set(0, 2.16, 0.12); tip.rotation.x = 0.2; g.add(tip);
    const earMat = new THREE.MeshStandardMaterial({ color: 0xfbf2ff, roughness: 0.55 });
    const innerMat = new THREE.MeshStandardMaterial({ color: 0xffb8d8, roughness: 0.7 });
    for (const sx of [-0.62, 0.62]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.66, 10), earMat);
      ear.position.set(sx, 0.95, 0.05); ear.rotation.z = -sx * 0.55; g.add(ear);
      const inner = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.42, 8), innerMat);
      inner.position.set(sx * 0.94, 0.94, 0.19); inner.rotation.z = -sx * 0.55; g.add(inner);
    }
  }
  else if (kind === 'dino') {
    // a real dorsal crest (6 tall plates) + horns — reads as DINO at any zoom
    const m = new THREE.MeshStandardMaterial({ color: 0x2e7a34, roughness: 0.55 });
    const m2 = new THREE.MeshStandardMaterial({ color: 0xffd25a, roughness: 0.5 });
    for (let i = 0; i < 6; i++) {
      const th = 0.1 + i * 0.3;
      const sp = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.62, 4), i % 2 ? m2 : m);
      sp.position.set(0, Math.cos(th) * 1.02, -Math.sin(th) * 1.02);
      sp.rotation.x = -th;
      sp.scale.setScalar(1.05 - i * 0.11);
      g.add(sp);
    }
    for (const sx of [-0.4, 0.4]) {   // little brow horns
      const hn = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.34, 7), m2);
      hn.position.set(sx, 1.0, 0.22); hn.rotation.set(0.3, 0, -sx * 0.7); g.add(hn);
    }
  }
  else if (kind === 'wizard') {
    const hm = new THREE.MeshStandardMaterial({ color: 0x2a2270, roughness: 0.7 });
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.88, 12), hm);
    cone.position.set(0.06, 1.34, 0); cone.rotation.z = -0.14; g.add(cone);
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.66, 0.08, 16), hm);
    brim.position.set(0.03, 0.94, 0); brim.rotation.z = -0.08; g.add(brim);
    const star = new THREE.Mesh(starShape(0.115, 0.05, 5),
      new THREE.MeshBasicMaterial({ color: 0xffe08a, side: THREE.DoubleSide }));
    star.position.set(0.28, 1.28, 0.3); g.add(star);
  }
  else if (kind === 'dragon') {
    const wingMat = new THREE.MeshStandardMaterial({ color: 0x2a8a9a, roughness: 0.6, side: THREE.DoubleSide, emissive: 0x1a5a6a, emissiveIntensity: 0.3 });
    for (const sx of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.CircleGeometry(0.95, 5, 0, Math.PI * 0.72), wingMat);
      wing.position.set(sx * 0.88, 0.72, -0.5);
      wing.rotation.set(0.3, sx * 1.1, sx * 0.9);
      wing.scale.set(1.6, 1.15, 1); g.add(wing);
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
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.0, 6), chrome);
    ant.position.set(0.18, 1.42, 0); g.add(ant);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0x4de8ff, emissive: 0x4de8ff, emissiveIntensity: 1.8 }));
    tip.position.set(0.18, 1.98, 0); g.add(tip);
    // brow plate: the single strongest "this is a robot" cue at gameplay size
    const brow = new THREE.Mesh(new THREE.BoxGeometry(1.34, 0.2, 0.3), chrome);
    brow.position.set(0, 0.62, 0.72); brow.rotation.x = 0.32; g.add(brow);
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
