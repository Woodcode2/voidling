// The VOIDLING void, in 3D — a faithful port of the 2D "pit into space" orb.
// The 2D orb is a flat radial gradient: darkest dead-centre, lit violet at the
// rim. On a real sphere that IS a fresnel term (dark where the surface faces the
// camera, bright at the silhouette), so the body is a custom fresnel shader —
// not a lit glossy sphere. Face is a billboarded set of crisp flat features,
// exactly like the 2D canvas draw.
import * as THREE from 'three';
import { HAT_BY_ID, HAT_MAX_W, hatLean } from './hats';
import { buildHat, spiralHorn } from './hatgeo';
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
  /** Wear a hat, or null for none. Independent of the skin — see hats.ts. */
  setHat(id: string | null): void;
  /** What is on its head right now — the hat's voice lines read this. */
  readonly hatId: string | null;
  setMood(m: Mood): void;    // the emotional state machine's current state
  /** How far the face is wrapped onto the sphere, 0..1. A look knob, not a
   *  quality setting — see FACE_WRAP. Exposed so it can be swept and compared
   *  side by side (qa/facewrap.mjs) instead of argued about. */
  setFaceWrap(v: number): void;
  /** What the face is DOING this frame, for probes that must measure the
   *  expression rather than describe it. `smile` is the open kawaii grin's
   *  own visibility — the one feature a child reads first — and `maw` is the
   *  gape's current scale. See qa/faceparity.mjs. */
  faceState(): { mood: Mood; maw: number; smile: boolean; biting: boolean };
  /** QA/capture: hold the jaw shut so the face shows its MOOD and nothing else.
   *  The gape is driven by eating, not by mood, so a hero parked anywhere with
   *  food in reach is mid-bite in almost every frame and cannot be
   *  photographed wearing his own smile. Pinning is the only deterministic way
   *  to take that picture; waiting for a gap means waiting while he eats the
   *  set. See scripts/shoot-store.mjs. Never set from gameplay. */
  pinMouth(shut: boolean): void;
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
  // ── THE HERO RENDERS IN THE SAME PIPELINE AS THE TOWN, AT LAST ─────────
  // This is a raw ShaderMaterial, so three appends nothing to it and it used to
  // end at a bare gl_FragColor. Measured with qa/colorpipe.mjs, which pushes
  // known sRGB values through every path:
  //
  //     input      MeshBasic (correct)   raw ShaderMaterial (this)
  //     #808080    #8d8d8d               #373737
  //     #5f2ab4    #5a18bc               #1d0674
  //
  // 0x80 -> linear 0.216 -> written raw -> displayed as 0x37. The character was
  // rendering at roughly a THIRD of his authored brightness and taking no tone
  // mapping, while every surface around him took both. That is the deepest
  // reason hero and world never looked like they belonged together, and it is
  // why no palette ever matched the key art: every palette this project has
  // chosen was picked through that filter.
  //
  // DECLARE NOTHING. three prepends BOTH pars blocks to a non-raw
  // ShaderMaterial — colorspace_pars always, tonemapping_pars whenever tone
  // mapping is active — so any #include of them here is a redefinition and the
  // fragment shader fails to compile outright. When that happens the void is
  // simply not drawn, and a colour probe cheerfully measures the grass behind
  // him and reports his hue as 83 degrees.
  //
  // Both earlier attempts at this fix died here, and the second one hid: three
  // forces NoToneMapping while rendering INTO A RENDER TARGET, so the pars are
  // absent on that path and present on the canvas path. Declaring them
  // therefore compiles fine for the first few seconds and only fails once
  // something recompiles against the canvas — which is why it passed a 3-second
  // probe and failed qa/smoke.mjs at t=25s, with the error naming
  // 'LinearToneMapping' : function already has a body.
  //
  // The two epilogue chunks below are safe on BOTH paths without any
  // declaration: tonemapping_fragment is guarded by #if defined(TONE_MAPPING),
  // and linearToOutputTexel is always prepended.
  uniform float uPat; uniform vec3 uPatCol; uniform float uPxR;
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
    // The rim's width is derived from uPxR (his on-screen radius) so the lit
    // edge never falls below a pixel and dissolves into the ground.
    vec3 col = mix(uInner, uMid, smoothstep(0.10, 0.55, u));
    // THE RIM IS AN EVENT HORIZON, NOT THE BODY. u is the normalised disc
    // radius, so a 0.58 stop mixed the rim colour over 1 - 0.58^2 = 66% of the
    // disc AREA, and 88% at speck size. King Void therefore rendered as a solid
    // gold ball with a brown smudge, contradicting both its own palette comment
    // (body stays dark, the RIM is the gold) and its shop card, which draws a
    // dark orb with a thin gold edge. Pulled out to 0.74 so mid and inner
    // carry the character and the rim is the lit lip of the hole.
    // …and NARROWER than it was. u is the normalised disc radius, so the old
    // 0.74 stop painted rim over 1 - 0.74^2 = 45% of the disc AREA — a wide
    // soft halo, which is the opposite of definition. 0.86 is 26%, a lit lip
    // rather than a gradient, and the body underneath finally has room to be
    // dark.
    //
    // ── AND THE RIM IS MEASURED IN PIXELS, NOT IN DISC FRACTIONS ──────────
    // This used to widen the stop to 0.50 whenever the void was small, to keep
    // the lit edge from dropping below a pixel. The goal was right and the
    // arithmetic was not: u is the normalised RADIUS, so a 0.50 stop paints rim
    // over 1 - 0.50^2 = 75% of the disc AREA. At the size a match STARTS at —
    // measured 30px of radius on a phone, which puts the old ramp at 0.55 — the
    // hero was 69% bodyRim (0xcb99ff, a pale lavender) and only a sliver of
    // bodyMid (0x5f2ab4, the rich purple that is supposed to BE the character).
    // Owner, on a screenshot of the live build: "our voids purple faded". It
    // had: the first thirty seconds of every match, the menu, and every shop
    // card were rendering a lavender ball.
    //
    // A rim that must stay ~2px wide is a stop of 1 - 2/pxR. That is 0.93 at
    // 30px and only starts eating the body below about 17px, which is genuinely
    // speck size. Clamped at 0.88 so it never gets THINNER than the authored
    // look, and at 0.62 so it cannot vanish in the opening dive.
    // …AND THE CLAMP IS THE WHOLE BALLGAME. u is the normalised RADIUS, so a
    // stop of 0.88 is not "a lit lip": it is the outer 12% of the radius, which
    // on the 214px radius he renders at in play is a TWENTY-SIX PIXEL band of
    // near-white lavender wrapped around him. That is the ring. The pixel-based
    // numerator was right and I clamped it away — 1 - 2/uPxR only escapes the
    // clamp below about 17px, a size he is never at.
    // 0.985 keeps the lip around 3 device px at play size; the 0.90 floor keeps
    // it from vanishing in the opening dive.
    float rimStop = clamp(1.0 - 2.5 / max(8.0, uPxR), 0.90, 0.985);
    // 0 at normal sizes, 1 only when the pixel floor has genuinely taken over.
    // Everything that used to key off uSmall keys off this instead, so the three
    // desaturating terms can no longer fire at a size the player actually plays.
    float wide = smoothstep(0.985, 0.90, rimStop);
    float rimMix = smoothstep(rimStop, 1.0, u);
    col = mix(col, uRim, rimMix);
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
    // ── HOW MUCH THE INTERIOR BRIGHTENS AS HE EVOLVES ─────────────────────
    // Measured with the game's own frame loop FROZEN, so nothing but uStage
    // moved (the same sweep taken live drifts 0.181 on a null control and is
    // worthless — see qa notes): value climbed 0.489 at stage 0 to 0.602 at
    // stage 6, a spread of 0.113 against a null of 0.016. That is the character
    // getting visibly brighter as a match goes on, which is a large part of
    // "colour is still switching throughout".
    // Softened from 0.11 to 0.045 per stage, and the base lifted so the early
    // forms are not dimmer than they used to be. He still gains interior as he
    // grows — the owner asked for that — it just no longer doubles.
    col += gal * inside * (1.02 + uStage * 0.045);
    // ── EVENT HORIZON ─────────────────────────────────────────────────────
    // rim light lives OPPOSITE the key, like a real one, and fattens with
    // both the evolution stage and how small he is on screen
    // ── AND IT MUST NOT STACK ON THE RIM MIX ──────────────────────────────
    // THIS IS THE WHITE RING. The line above already mixes the body all the way
    // TO uRim at the silhouette. This term then ADDED uRim on top of it again:
    //
    //   mix result at u=1     (0.80, 0.60, 1.00)   uRim, 0xcb99ff
    //   + this term, max      x 0.30 x 1.45 = x1.435
    //   = (1.14, 0.86, 1.43) -> clipped by the framebuffer to (1.0, 0.86, 1.0)
    //
    // A hard, colourless, blown-out edge, one to two pixels wide, wrapped around
    // the character at every size. The owner reported it twice as "there's a
    // ring around him" and I twice went looking for scene furniture — I deleted
    // the ground annulus, which was a real but DIFFERENT ring, and the white one
    // survived because it was never a mesh at all. It is also why he reads pale:
    // the brightest pixels on him carry no chroma.
    //
    // Fading it out by (1 - rimMix) hands the silhouette back to uRim's actual
    // colour, which is a light VIOLET rather than white, and keeps the lift
    // where it was always meant to be — on the shoulder just inside the edge.
    // …AND ITS SHAPE NO LONGER DEPENDS ON HOW BIG HE IS ON SCREEN. The exponent
    // used to open from 3.0 to 1.9 as he got small, spreading the pale rim
    // colour much further across the disc. See the note on the brightness lift
    // below: together the two terms made him a measurably different colour at
    // the start of a match than thirty seconds later.
    // The rim carries no stage term at all now. It is the silhouette, so any
    // change to it changes his outline colour, and uRim is a saturated violet.
    col += uRim * pow(u, 3.0) * 0.38
         * mix(1.45, 0.72, key) * (1.0 - rimMix);
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
    // ── HE IS ONE COLOUR NOW, AT EVERY SIZE ───────────────────────────────
    // There used to be a "col *= 1.0 + 0.10 * wide" here — "at postage-stamp
    // size, punch the whole thing up a touch". Reasonable in isolation, and
    // wrong in effect: wide tracks how small he is ON SCREEN, and the camera
    // dives in over the opening seconds, so he was a different colour at the
    // start of a match than he was once it settled.
    //
    // The owner, on two screenshots of the same 2m void nineteen seconds apart:
    // "When you start the game you're light purple. After moving a bit you're
    // dark purple."
    //
    // Measured across uPxR 18 -> 220 at a FIXED radius, before the fix:
    //     saturation 0.715 -> 0.640      value 0.517 -> 0.443
    // A spread of 0.075 on both, where a size-invariant character reads about
    // 0.02. The brightness lift and the rim exponent above were the two terms
    // responsible; both are gone. rimStop still adapts, because a lit edge
    // thinner than a pixel disappears — but it is a narrow band, so it changes
    // his EDGE without changing his COLOUR.
    //
    // (And note the comment characters: this whole shader lives in a JS
    // template literal, so a BACKTICK in a comment ends the string and the file
    // stops compiling. That is how the first version of this note broke it.)

    gl_FragColor = vec4(col, 1.0);
    // ACES first, then the output encode — three's own order.
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
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
      uPxR: { value: 64 },            // his on-screen RADIUS in px; rim width is derived from it
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

// ── THE MOUTH IS AN OPENING, NOT A FEATURE DRAWN ON HIM ─────────────────────
// Two wrong answers are recorded here, both mine, both rejected on sight by the
// owner looking at the live build.
//
//   1. A WHITE PLATE behind the lip, to buy 3:1 contrast. "That white smile has
//      to go. The white part I'm not a fan of. It looks cheap."
//   2. A CANDY PINK LIP with a darker centre, which measured beautifully — all
//      18 skins over 3:1 — and looked like LIPSTICK. "Look at those lips. Why
//      does a void have lips."
//
// The second failure is the instructive one, because the measurement was right
// and the design was still wrong. A ring of one colour around a darker middle
// is the exact shape of a made-up mouth; contrast ratio cannot see that, and I
// shipped it because the number was good.
//
// What he actually asked for: "why can't it just be like he smiles we see red
// or whatever like before". So the mouth is now ONE warm red opening with a
// deeper throat behind it — no outer ring in a lighter colour, nothing that
// traces the lip line. It reads as a hole into a warm inside, which is what a
// cute mouth is.
//
// On contrast: red against the body is only 1.79:1 by luminance, and that is
// fine here, because the mouth does not sit on the body's mid tone. It sits low
// on the face where the shader's belly pit darkens toward abyss (L 0.0016),
// where the same red measures 4.3:1. Hue does the rest — warm red against cool
// violet separates even where luminance does not.
// The mouth is a DARK RIM around a LIGHTER INSIDE — the maw's own pair, so the
// closed smile and the open gape are one design at two sizes. See the long note
// where the smile is built for why the direction of that value step is the
// whole difference between "an opening" and "lipstick".
const MOUTH_RIM = 0x2a0e2e;    // the opening's edge — dark, so it reads as a cavity
const MOUTH_IN = 0xff6f91;     // …and the lit surface inside it
// There is deliberately no "inside" colour any more. An opening with something
// LIGHTER inside it is an annulus, and an annulus drawn on a face is a made-up
// mouth — that is the shape the owner rejected as lipstick. One mesh, one
// colour, no second ring. It cannot come back by accident.

const _s2l = (c: number) => { const u = c / 255; return u <= 0.04045 ? u / 12.92 : ((u + 0.055) / 1.055) ** 2.4; };
const _l2s = (u: number) => Math.round(255 * (u <= 0.0031308 ? u * 12.92 : 1.055 * u ** (1 / 2.4) - 0.055));
/** Mix two sRGB hexes in LINEAR light — the space the shader itself mixes in. */
function mixHex(a: number, b: number, t: number): number {
  let o = 0;
  for (let i = 16; i >= 0; i -= 8) {
    const la = _s2l((a >> i) & 255), lb = _s2l((b >> i) & 255);
    o = (o << 8) | _l2s(la + (lb - la) * t);
  }
  return o >>> 0;
}
/**
 * WHAT THE SHADER ACTUALLY PAINTS WHERE THE MOUTH SITS.
 *
 * This is the whole bug. The route below used to be chosen against `s.mid`, the
 * body's mid tone — but the mouth is not drawn on the mid tone. It hangs at
 * disc y = -0.26 on a face lifted 0.1R, i.e. N.y = -0.18, and down there two
 * things have happened to the colour: the inner->mid ramp has barely started
 * (smoothstep(0.10, 0.55, 0.18) = 0.0836), and the belly pit has mixed 0.740 of
 * the way to `abyss`. So the mouth is drawn on something far darker than `mid`,
 * and the contrast that got measured was against a colour that is not there.
 *
 * Measured over all 18 skins, scoring each route against this belly tone:
 *   routing on s.mid    8 of 18 skins under 1.5:1, and CLASSIC — the default
 *                       void every new player sees — at 1.01:1. Invisible.
 *   routing on belly    worst case 2.02:1, Classic 3.98:1.
 *
 * It went unnoticed because the number looked fine: the old pink cleared 3:1
 * against `mid` on every skin. It was the right measurement of the wrong pixel.
 */
const bellyOf = (s: Skin): number => mixHex(mixHex(s.inner, s.mid, 0.0836), s.abyss, 0.740);
/** WCAG contrast ratio. "Can you see the smile" is a number, not a view. */
function wcag(a: number, b: number): number {
  const f = (c: number) => { const u = c / 255; return u <= 0.04045 ? u / 12.92 : ((u + 0.055) / 1.055) ** 2.4; };
  const l = (h: number) => 0.2126 * f((h >> 16) & 255) + 0.7152 * f((h >> 8) & 255) + 0.0722 * f(h & 255);
  const la = l(a), lb = l(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
const texCache = new Map<string, THREE.Texture>();   // premium skin textures
// ── …AND WHO IS STILL WAITING FOR EACH ONE ────────────────────────────────
// TextureLoader fires exactly ONE callback, and it belongs to whoever asked
// first. The old code closed that callback over the FIRST requester's material,
// so a second void asking for a texture that was already in flight fell through
// to `t.image ? 1 : 0`, read 0, and was never told the load had finished. It sat
// on a flat gradient for ever.
//
// With one void in the world that was invisible. The shop's card renderer is a
// SECOND void, and it warms this cache from the menu — so the shop can now win
// the race and strand the HERO: a child spends 1,000 coins on Honey and then
// plays a whole match as a flat brown ball. The card work created that exposure,
// so it is closed here rather than worked around in the shop.
//
// (This was also mis-diagnosed once as the sandbox blocking a CDN. It is not:
// every one of these files is vendored under public/assets/hf and serves 200
// locally. It is a race, and it happens on real phones too.)
const texWaiting = new Map<string, THREE.ShaderMaterial[]>();

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
  contact.name = 'contact';                     // see the note on rings.name
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
  // ── THE GROUND LIP IS GONE, ON THE SECOND REPORT ──────────────────────────
  // There used to be a bright violet annulus at 1.5x the hero's radius, a thin
  // ring just outside the pit's dark edge. Its justification was hole.io's:
  // the ring is the single read that says "hole" rather than "ball".
  //
  // The owner flagged it once — "There's a white circle always around the
  // void?" — and it was given a fade instead of a removal: full strength at the
  // start radius, gone by 3.2. That was a half-measure and the measurement says
  // so. The HUD reports 1.6 x radius in metres, so the "VOIDLING 2m" the owner
  // was looking at in the second report is r = 1.25, where the fade still
  // leaves opacity at 0.44 of 0.52 — 85% of full. In other words the ring was
  // at nearly full strength for the whole early match, which is exactly the
  // stretch a new player spends the most time in. He reported it again:
  // "And there's a ring around him".
  //
  // The hole.io justification never applied to this character anyway. This
  // hero is a ball with a face, eyebrows, blush and a mouth, sitting on a
  // street; a permanent annulus around it reads as an RTS selection circle.
  // The contact shadow is what grounds him and it does that job alone.
  // (The RIVALS keep their halo — a ring around something that is HUNTING you
  // is information, not decoration. That one lives in rivals.ts.)

  // ── face: crisp billboarded flat features (matches 2D canvas) ─────────────
  const face = new THREE.Group();
  group.add(face);
  const flat = (r: number, col: number, opacity = 1) =>
    new THREE.Mesh(new THREE.CircleGeometry(r, 56), new THREE.MeshBasicMaterial({ color: col, transparent: opacity < 1, opacity, depthWrite: false }));

  // ── THE FEATURES BELONG TO THE FORM ───────────────────────────────────────
  // Lighting the face fixed WHERE the light falls on it (see FACE_L). This
  // fixes where it SITS. Every feature used to live on one flat plane at
  // z = 1.0 — the sphere's tangent plane at its front pole — so a brow at
  // (0.36, 0.4) floated 0.16 proud of the surface it is painted on and never
  // foreshortened toward the rim. That is a decal on a ball, not a face, and it
  // is the single biggest reason the character read as a sticker.
  //
  // The naive version of this is wrong and I shipped it once: setting an eye
  // GROUP's z and slerping ITS quaternion swings the eye clean out of frame,
  // because that group's origin is on the face plane while the sclera sits a
  // full radius in front of it — the rotation is a full-radius lever arm. Each
  // eye now has an intermediate `ball` group AT the eye (:790) so the tilt
  // happens in place, and every offset derived in the old space — blink drop,
  // gaze clamp, pupil containment — is still local to that group and needs no
  // re-derivation.
  //
  // FACE_OY matters. `face` is lifted to dispR * 0.1 (:1686) while the body is
  // a unit sphere at the group origin, so in face-local space the sphere's
  // centre is at y = -0.1, not at zero. Wrapping about the wrong centre puts
  // features BEHIND the surface, and these all depth-test — the blush at
  // x = 0.49 would simply vanish.
  //
  // FACE_WRAP is fractional on purpose, and this is a look decision, not a
  // budget one. A full wrap is geometrically honest and turns the outer eye
  // into a hard ellipse; this face is read at 40 px far more often than at 400,
  // and the eyes ARE the character. 0.62 seats the features most of the way
  // onto the form while every one of them stays clear of the silhouette.
  let FACE_WRAP = 0.62;
  const FACE_OY = 0.1;
  const _wq = new THREE.Quaternion(), _wn = new THREE.Vector3();
  const _wspin = new THREE.Quaternion(), _wz = new THREE.Vector3(0, 0, 1);
  // Features that never move (the cheeks, the gape) wrap once at build rather
  // than every frame. They are remembered so the knob can re-seat them — a
  // sweep that only moved the per-frame features would be comparing two
  // different faces, not two values of one number.
  const pinned: { o: THREE.Object3D; px: number; py: number; dz: number }[] = [];
  const wrapOnce = (o: THREE.Object3D, px: number, py: number, dz = 0) => {
    pinned.push({ o, px, py, dz }); wrapTo(o, px, py); o.position.z += dz;
  };
  const rewrapPinned = () => { for (const f of pinned) { wrapTo(f.o, f.px, f.py); f.o.position.z += f.dz; } };
  // px/py are face-local. The face billboards, so that is view space, and the
  // sphere normal under a feature is just (px, qy, sqrt(1 - px² - qy²)).
  // `spin` is the feature's own roll (the mouth is upside-down by PI, the brows
  // tilt by mood) and is composed INSIDE the wrap, so it still means "roll in
  // the plane you are painted on" after the feature has been tilted.
  function wrapTo(o: THREE.Object3D, px: number, py: number, spin = 0, amt = FACE_WRAP) {
    const qy = py + FACE_OY;
    const nz = Math.sqrt(Math.max(0, 1 - px * px - qy * qy));
    o.position.z = 1.0 + (nz - 1.0) * amt;
    _wq.setFromUnitVectors(_wz, _wn.set(px, qy, nz));
    o.quaternion.identity().slerp(_wq, amt);
    if (spin) o.quaternion.multiply(_wspin.setFromAxisAngle(_wz, spin));
    return nz;
  }

  // ── THE EYES ──────────────────────────────────────────────────────────────
  // Everything a player feels about this character comes through here, so the
  // eye is no longer three flat colour discs stacked up. The sclera and the
  // pupil are each a small painted texture: the sclera carries a cool lid
  // shadow across the top and a warm bounce underneath (so it sits IN a face
  // instead of on it), and the pupil carries an iris falloff, a violet
  // reflected-light crescent at the bottom and both catchlights baked in.
  // Baking the catchlights also retired four meshes.
  const SCL_R = 0.21;
  // ── THE EYES ARE THE FOCAL POINT, SO THEY GET THE RESOLUTION ────────────
  // These were 128px. Measured on a DPR-3 phone with the void at r=6, ONE EYE
  // COVERS 284 DEVICE PIXELS — a 2.2x magnification of the texture, and worse
  // again at the top forms where he fills the screen. A magnified gradient is
  // exactly what "not crisp" looks like, and it lands on the one part of the
  // character a player actually looks at.
  //
  // 512 gives 4x linear headroom, which covers every size in the game with room
  // over. Cost is 1 MB per texture and a one-off canvas draw at load; there are
  // two of them, and they are SHARED by the hero and all five family voids, so
  // this is 2 MB total for the whole cast rather than per void.
  const scleraTex = (() => {
    const S = 512, cv = document.createElement('canvas'); cv.width = cv.height = S;
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
    t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
    t.anisotropy = 4;
    return t;
  })();
  const pupilTex = (() => {
    const S = 512, cv = document.createElement('canvas'); cv.width = cv.height = S;
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
    // same sampling as the sclera: mipmaps so he stays clean when small, a
    // little anisotropy because the face billboards at a tilt
    t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
    t.anisotropy = 4;
    return t;
  })();
  interface Eye { g: THREE.Group; ball: THREE.Group; sclera: THREE.Group; pupilGrp: THREE.Group; outline: THREE.Mesh; white: THREE.Mesh; }
  const eyes: Eye[] = [];
  const charEyes: { star: THREE.Mesh; ring: THREE.Mesh }[] = [];   // legendary pupil overrides
  for (const sx of [-0.36, 0.36]) {
    const g = new THREE.Group();
    // ── THE PIVOT LIVES AT THE EYE, NOT ON THE FACE PLANE ─────────────────
    // `ball` sits where the eye actually is, one radius out along the face's
    // forward axis, and the sclera and pupil hang off it at local zero. That is
    // the whole trick for wrapping the features onto the head: rotating `ball`
    // tilts the eye IN PLACE, while rotating its parent (whose origin is back
    // on the face plane) swings it on a full-radius lever arm and throws it out
    // of frame. The first attempt at this did exactly that.
    const ball = new THREE.Group(); ball.position.z = 1.0;
    const sclera = new THREE.Group();
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
    const pupilGrp = new THREE.Group(); pupilGrp.position.z = 0.02;
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
    // NAMED so the lid is observable from outside. A shop card is a single
    // frame, and the blink cadence is a free-running clock (blinkT, :1018) —
    // photograph a void at the wrong moment and you have shipped a card of a
    // character with its eyes shut. Anything rendering a still can watch
    // sclera.scale.y / sclera.scale.x and wait for the lid to open.
    sclera.name = 'sclera';
    g.position.set(sx, 0.06, 0);
    ball.add(sclera); ball.add(pupilGrp); g.add(ball);
    face.add(g); eyes.push({ g, ball, sclera, pupilGrp, outline, white });
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
    // the cheeks never move, so they wrap once. They are also the outermost
    // feature on the face (x = 0.49), which makes them the one that most needed
    // it — a flat cheek disc at the rim is the classic sticker tell.
    b.scale.set(1.06, 0.70, 1); b.position.set(sx, -0.19, 0);
    wrapOnce(b, sx, -0.19);
    face.add(b);
  }
  // smiling mouth — the KEY-ART kawaii open smile: a soft plum half-disc with
  // a little pink tongue. (The old thin torus arc curled up hard at both ends
  // — read as a too-wide clown grin.) Plus the big "maw" that scales in when
  // eating or firing GULP.
  const mouth = new THREE.Group();
  let mouthRim: THREE.MeshBasicMaterial | null = null;      // the lip itself
  // ── NO FANGS ────────────────────────────────────────────────────────────
  // Two little teeth used to drop into the smile from GOBBLIN on, as a per-form
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
    // ── THE SMILE NEEDS A RIM, AND THAT IS A MEASUREMENT ──────────────────
    // VOID.mouth is 0x4a1a68, a warm dark plum chosen so the smile "reads
    // friendly, never a black slit". It does — against a light body. Against
    // the body colours this game actually ships it is very close to invisible:
    // WCAG contrast of the lip against each skin's mid tone is 1.51:1 on
    // Classic, 1.10:1 on King Void and 1.02:1 on Shadow Ninja. Six of eight
    // sampled skins fail 3:1. That is the DEFAULT skin, the hero in every
    // match, every rival, and every card in the shop.
    //
    // Rendered side by side it is obvious: Uni-Void, whose body is nearly
    // white, has a lovely open smile from this exact geometry; Classic is two
    // eyes and a floating pink pill. So the geometry was never the problem and
    // must not be reshaped — it needs somewhere to sit.
    //
    // …AND THE FIX FOR THAT WAS A WHITE PLATE, WHICH IS THE WRONG FIX.
    // It was a larger half-disc behind the lip in the skin's rim colour pushed
    // 60% toward white. It cleared 3:1 everywhere (worst 3.50, Ember) and the
    // owner rejected it on sight of the live build: "that white smile has to
    // go. The white part I'm not a fan of. It looks cheap." It reads as a pale
    // sticker ring around a tiny mouth, and at the size a match starts at the
    // plate, the lip and the tongue mush into one whitish blob.
    //
    // THE REAL CONSTRAINT, measured. Contrast against every skin's mid tone:
    //   - no single mouth colour works. The bodies span L 0.034 (Shadow Ninja)
    //     to 0.711 (Uni-Void), so anything fixed vanishes at one end.
    //   - a dark mouth CANNOT reach 3:1 on the default skin. Body L is 0.074,
    //     so even pure black tops out at 2.48:1. That is why a plate existed.
    //   - so the light route is genuinely needed on dark bodies — it just has
    //     no reason to be WHITE. 0xff6f91, the candy pink already used for the
    //     tongue, scores 3.20:1 on Classic and reads as a mouth, not a decal.
    //
    // Hence two routes, and the route is chosen by which one actually scores
    // higher on that skin rather than by a luminance threshold — chilli and
    // prism sit exactly at the crossover and fail both ways under a fixed cut.
    // Measured over all 18 skins: every one clears 3:1, worst case 3.20
    // (Classic), and there is no white anywhere in the mouth.
    // upper semicircle; the group's PI rotation (below) hangs the dome down
    const lip = new THREE.Mesh(new THREE.CircleGeometry(0.178, 40, 0, Math.PI),
      new THREE.MeshBasicMaterial({ color: MOUTH_RIM, depthWrite: false }));
    mouthRim = lip.material as THREE.MeshBasicMaterial;
    // ── THE INNER IS BACK, AND THE OWNER IS RIGHT ABOUT WHY ───────────────
    // I removed it, reasoning that lip-plus-inner is an annulus and an annulus
    // on a face reads as lipstick. Half true, and it threw away the thing that
    // makes a mouth read as a MOUTH. Shown three renders he picked the two-tone
    // one: "the third one looks better because there's like shading inside".
    //
    // The distinction I had missed is the DIRECTION of the value step:
    //   LIGHT rim around a DARK middle  = lipstick. Rejected, correctly.
    //   DARK rim around a LIGHTER middle = an opening with depth. This one.
    // The same two shapes read opposite ways, because a real cavity is dark at
    // its edge and catches light on the surface inside it. A single flat colour
    // has no depth cue at all, which is exactly why the pure red shape looked
    // like a sticker stuck on his face.
    //
    // These are the MAW's own two colours, so the little smile and the big gape
    // are now the same mouth at two sizes instead of two unrelated designs.
    // They are deliberately skin-blind, like the maw: the pair carries its own
    // contrast internally (0x2a0e2e against 0xff6f91), so it cannot be defeated
    // by a skin the way routing against the body could — which is what left
    // Classic's smile at 1.01:1 and invisible.
    // ── AND THE INNER IS A HALF-DISC, NOT A FULL CIRCLE ───────────────────
    // The first version made this a full CircleGeometry, and the owner caught
    // it immediately: "the pink overlaps the smile". The arithmetic agrees. The
    // lip is a HALF disc — CircleGeometry(r, 40, 0, PI) — so after its scale it
    // spans local y from 0 to 0.135. A full circle centred at y 0.052 with a
    // half-height of 0.067 spans -0.015 to 0.119, and that -0.015 is outside
    // the lip altogether: a sliver of pink sitting above the top edge of the
    // mouth, unattached to anything.
    //
    // Matching the lip's own geometry makes the containment structural instead
    // of arithmetic — a half-disc nested inside a half-disc cannot spill past
    // the flat edge no matter what either one is scaled to later. The small
    // downward offset leaves a dark band along the top, so the upper lip reads
    // as an edge rather than the pink running straight into the face.
    const inner = new THREE.Mesh(new THREE.CircleGeometry(0.108, 28, 0, Math.PI),
      new THREE.MeshBasicMaterial({ color: MOUTH_IN, depthWrite: false }));
    inner.scale.set(1.15, 0.62, 1);
    inner.position.set(0, 0.022, 0.004);
    inner.renderOrder = 1;
    // WIDER AND SHALLOWER, his call: a broad grin rather than a small round
    // one. The lip is a semicircle, so stretching x and squashing y turns a
    // half-penny into a smile.
    lip.scale.set(1.34, 0.76, 1);
    mouth.add(lip); mouth.add(inner);
    mkFang(mouth, -0.086, 0.052, 0.058); mkFang(mouth, 0.086, 0.052, 0.058);
  }
  mouth.position.set(0, -0.26, 0);
  wrapTo(mouth, 0, -0.26, Math.PI);   // re-wrapped per frame (mouthY + smirk move)
  face.add(mouth);
  // The body's key light, copied from the fragment shader so the face and the
  // body cannot drift apart. If that vector changes, change it here too.
  const FACE_L = new THREE.Vector3(-0.40, 0.60, 0.69).normalize();
  const maw = new THREE.Group(); maw.position.set(0, -0.3, 0); maw.scale.setScalar(0.001);
  // wrapped once (it never moves, only scales), then nudged 0.02 forward. The
  // gape and the closed mouth overlap for one mood step and the gape has to win
  // it — same reason it used to sit at 1.01 against the mouth's 1.0.
  wrapOnce(maw, 0, -0.3, 0.02);
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
    bw.position.set(sx, 0.4, 1.0);   // z + tilt are re-wrapped per frame (browY moves)
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
  const mp = { lid: 1, pupil: 1, wide: 1, smile: 1, mouthY: 1, smirk: 0, brow: 0, browAng: 0, browY: 0.4, maw: 0, blush: 0.5, sweat: 0, zzz: 0, bounce: 0, shut: 0 };
  // See the note at its use in the frame loop: any mood whose `maw` reaches
  // this has no smile, regardless of what its `smile` says.
  const MOUTH_HIDES_AT = 0.25;
  const MOODS: Record<Mood, Partial<typeof mp>> = {
    cruise:  {},
    // ── HUNGRY ASKED FOR A BIGGER GRIN AND GOT NO GRIN AT ALL ───────────
    // This line used to read `maw: 0.26`, and one line of it fought the other:
    // `smile: 1.1` says "grin, 10% wider than usual", while `maw: 0.26` sits a
    // single hundredth above MOUTH_HIDES_AT below — so the grin was switched
    // off outright and all that remained was a gape scaled to a quarter, which
    // is TALLER THAN IT IS WIDE and reads as a nostril, not a mouth.
    //
    // That mattered far more than it looks, because `hungry` is not a rare
    // state: prototype3d.ts re-arms it whenever ANY edible sits inside 85% of
    // the magnet reach, and it decays 0.45s later. In a town it never lapses.
    // Measured before this change (qa/faceparity.mjs): the hero had no smile
    // for 78% of a Maple Falls match and 52% of Powder Pass.
    //
    // 0.12 is not a new number — it is exactly what `frenzy` has always used,
    // so "a grin with a slight parting" is a look this game already ships and
    // nobody has ever objected to. It is also far enough under the cliff that
    // the mood lerp cannot flicker across it, which 0.26 was never safe from.
    hungry:  { pupil: 1.28, smile: 1.1, maw: 0.12, brow: 0.85, browAng: 0.12, browY: 0.45, blush: 0.6 },
    frenzy:  { pupil: 1.35, smile: 1.42, wide: 1.05, blush: 0.85, brow: 0.85, browAng: 0.18, browY: 0.47, maw: 0.12, bounce: 1 },
    scared:  { wide: 1.16, pupil: 0.55, smile: 0.85, mouthY: -0.65, brow: 1, browAng: -0.5, browY: 0.43, sweat: 1, blush: 0.3 },
    hurt:    { lid: 0.3, mouthY: -0.8, smile: 0.8, brow: 1, browAng: -0.6, browY: 0.38, sweat: 1, blush: 0.35 },
    // ── SMUG IS THE FACE FOR EATING A SIBLING, SO IT HAD BETTER BE A WIN ──
    // It used to be lid 0.55 — eyelids just over half shut — with a small
    // smirk. On a drawing board that is "pleased with myself". At 47px on a
    // phone it is DROWSY, and it is nearly the same face as sleepy below, which
    // also leads with a low lid. The owner: "When the void eats family he has
    // this half asleep reaction."
    //
    // The bigger problem is what it is attached to. onRivalEaten is the best
    // thing that happens in this game — the only event that lifts the growth
    // law, so it is the one moment where a child's decision changes the size
    // they finish at. It gets 2.4 seconds of face, and it was spending them
    // looking sleepy.
    //
    // Now it reads as triumph: eyes WIDE OPEN, big pupils, a real grin, blush
    // up, and the bounce that victory uses. The smirk stays, slightly stronger,
    // so he is gloating rather than merely happy — but nothing about it is
    // subtle, because subtle does not survive being 47 pixels tall.
    smug:    { lid: 0.96, pupil: 1.3, wide: 1.04, smile: 1.4, smirk: 0.26,
               brow: 0.7, browAng: 0.16, browY: 0.45, blush: 0.9, bounce: 1 },
    // heavy level brows sitting low, a lid most of the way down, and a small
    // soft mouth — a nap, not a grin with the eyes shut
    // EYES ACTUALLY CLOSED. lid 0.26 squashed the eye to a quarter height but
    // still drew the white and the pupil, so a napping void read as dazed —
    // half-lidded and staring — with Zzz floating over it. `shut` hides the
    // white and the pupil and leaves only the dark backing disc, squashed
    // flat: a line where the eye was, which is what a sleeping cartoon face
    // is. The lid value still drives how thick that line is.
    sleepy:  { lid: 0.13, smile: 0.66, mouthY: 0.62, pupil: 0.86, shut: 1,
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
      // NO TEETH. Two hundred lines up, mkFang builds fangs and deliberately
      // never adds them, for a reason recorded there: a fang is the one detail
      // that tips this character from cute toward predatory, in a game for
      // six-year-olds where every other decision has been pulled the other
      // way. Rexling's snout then hung two of them under its jaw anyway —
      // invisible at gameplay size, and the first thing you see on the card.
      // The decision was right; this was the place that had not heard it.
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

  // ── THE HAT SLOT ────────────────────────────────────────────────────────
  // Separate from `acc` below on purpose. An accessory is welded to a legendary
  // SKIN — you get the horn because you are Uni-Void — whereas a hat is bought
  // on its own and goes on any void in the game. Two slots, so a child can be
  // a Honey void in a Viking helm.
  //
  // BUILT LAZILY. The accessory loop below builds all five at boot whether or
  // not the player owns any; with thirteen hats on top of that, a cold start
  // would be paying for a wardrobe nobody is wearing. A hat is built the first
  // time it is worn and then cached — which also means the shop's preview pays
  // for exactly the hat it is showing.
  const hats: Record<string, THREE.Group> = {};
  let wornHat: THREE.Group | null = null;
  let wornHatId: string | null = null;
  let wornSeat = 1;
  // How wide this hat is, in BODY RADII, measured from its own geometry at
  // mount. The caricature LOD below is capped against it so a hat can never
  // grow wider than the void wearing it — see wornLodCap.
  let wornLodCap = 99;
  let hatSquash = 1;     // bob's current vertical squash, for the rigid hat follow
  const hatW: Record<string, number> = {};   // authored width, in body radii
  let spinner: THREE.Object3D | null = null;
  let spinRate = 0;

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
  // NAMED, because things outside this file need to switch it off. A shop-card
  // portrait has no floor and no earned evolution ring — see __voidSheet in
  // prototype3d.ts, which hid these by guessing at their geometry type and
  // rotation until the guess missed this one (a torus tilted 0.5, not a flat
  // circle) and every card rendered with a grey ellipse through the character.
  rings.name = 'rings';
  group.add(rings);
  const ringMats: THREE.MeshBasicMaterial[] = [];
  {
    // FrontSide, and it is a measured fix, not a style choice: a TORUS is a
    // closed surface, so DoubleSide cannot show anything FrontSide hides —
    // but three renders every transparent DoubleSide material in TWO passes,
    // setting material.needsUpdate on each side-swap, every frame. Trapped
    // live: these two rings were the entire "a material sets needsUpdate
    // ~twice per frame, all match" mystery (task #41) — 4 version bumps and
    // 2 extra draw calls per frame, all match, for faces that face inward.
    const rm = new THREE.MeshBasicMaterial({ color: VOID.glow, transparent: true, opacity: 0, depthWrite: false, side: THREE.FrontSide });
    const rg = new THREE.Mesh(new THREE.TorusGeometry(1.42, 0.03, 8, 96), rm);
    rg.rotation.x = Math.PI / 2 - 0.5;
    rings.add(rg); ringMats.push(rm);
    // faint companion band just outside — subtle depth, same crispness
    const rm2 = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, side: THREE.FrontSide });
    const rg2 = new THREE.Mesh(new THREE.TorusGeometry(1.52, 0.014, 8, 96), rm2);
    rg2.rotation.x = Math.PI / 2 - 0.5;
    rings.add(rg2); ringMats.push(rm2);
  }
  // ✦ orbiting star sparkles riding the evolution ring — they flare on every
  // evolution and stay twinkling once the ring is earned (stage 2+)
  const starTex = (() => {
    // 128, and with a core. These sprites ride the evolution ring, and the ring
    // scales with the hero — at WORLD ENDER a 0.16 sprite is no longer a
    // sparkle, it is an object, and a 64px four-pointed cutout with hard edges
    // and no centre photographs as a small grey cross. A real sparkle is a
    // bright point with arms coming off it.
    const cv = document.createElement('canvas'); cv.width = cv.height = 128;
    const x = cv.getContext('2d')!;
    x.translate(64, 64);
    // the arms
    x.fillStyle = '#ffffff';
    x.beginPath();
    for (let i = 0; i < 4; i++) {
      x.moveTo(0, 0); x.quadraticCurveTo(9, -9, 0, -56); x.quadraticCurveTo(-9, -9, 0, 0);
      x.rotate(Math.PI / 2);
    }
    x.fill();
    // …and the short diagonal arms, which is what stops it reading as a plus
    x.save(); x.rotate(Math.PI / 4);
    x.beginPath();
    for (let i = 0; i < 4; i++) {
      x.moveTo(0, 0); x.quadraticCurveTo(5, -5, 0, -22); x.quadraticCurveTo(-5, -5, 0, 0);
      x.rotate(Math.PI / 2);
    }
    x.fill(); x.restore();
    // the core: a soft bright centre, so the sprite has a source rather than
    // being four strokes meeting at a hole
    const rg = x.createRadialGradient(0, 0, 0, 0, 0, 22);
    rg.addColorStop(0, 'rgba(255,255,255,1)');
    rg.addColorStop(0.35, 'rgba(255,255,255,0.55)');
    rg.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = rg;
    x.beginPath(); x.arc(0, 0, 22, 0, Math.PI * 2); x.fill();
    const t = new THREE.CanvasTexture(cv);
    t.anisotropy = 2;
    return t;
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
  let mouthPinShut = false;        // QA/capture only — see pinMouth()
  // age of the CURRENT bite, counting up — drives the anticipation spring.
  // mouthT alone counts down, and min(1, mouthT*8) reaches 1 on the trigger
  // frame: the maw popped from closed to fully open in ONE frame, on the
  // single most-repeated action in the game (AAA-BRIEF absence #2 — no
  // anticipation, no settle). The envelope in the render (see `mo`) uses this
  // to part the jaw for ~45ms, spring open, overshoot ~10% and settle.
  let mouthAge = 1;
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
    faceState() { return { mood, maw: mp.maw, smile: mouth.visible, biting: mouthT > 0 }; },
    pinMouth(shut) { mouthPinShut = shut; if (shut) { mouthT = 0; mouthMax = 0; mouthAge = 0; } },
    setFaceWrap(v) {
      // clamped short of 1: a full wrap seats the cheeks exactly ON the surface
      // and they depth-fight the body they are painted on. 0.9 keeps a margin.
      FACE_WRAP = THREE.MathUtils.clamp(v, 0, 0.9);
      rewrapPinned();
    },
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
    get hatId() { return wornHatId; },
    setHat(id) {
      if (id === wornHatId) return;
      if (wornHat) wornHat.visible = false;
      wornHatId = id; wornHat = null; spinner = null; spinRate = 0;
      if (!id) return;
      const meta = HAT_BY_ID[id];
      if (!meta) return;
      let g = hats[id];
      if (!g) {
        g = buildHat(id);
        g.name = 'hat:' + id;   // QA: the occlusion/placement probes find it by this
        g.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.castShadow = true; });
        // ── MEASURE IT BEFORE IT HAS A PARENT ──────────────────────────────
        // This is the only moment the hat's own size can be read cleanly: it
        // is at the origin with an identity transform and nothing above it, so
        // setFromObject returns the AUTHORED box in body radii — the units the
        // body is 2.0 across in, and the units HAT_MAX_W is written in.
        //
        // The previous version measured AFTER `dress.add(g)`, which made the
        // number meaningless three ways over and is why a cap that reads
        // perfectly sensible has never actually capped anything:
        //   • it is a WORLD box, so it carried bob's radius and dress's LOD —
        //     i.e. the answer depended on how big the void happened to be at
        //     the instant the player equipped the hat;
        //   • dress YAWS to face the camera, and a world AABB of a yawed box
        //     is inflated by up to 41% — a 4.04 brim measured 5.52;
        //   • so `max(1, HAT_MAX_W / w)` was almost always < 1, clamped to 1,
        //     and the cap silently became "no cap at all".
        // Measured properly, the wizard's brim is 4.04 across against a body
        // of 2.0 — 202% — which is the owner's "it's covering the entire body"
        // in one number, and no amount of repositioning can fix a hat that is
        // twice as wide as the head it is on.
        {
          const bb = new THREE.Box3().setFromObject(g);
          hatW[id] = Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z);
        }
        // ── THE HAT DOES NOT LIVE ON THE JELLY ─────────────────────────────
        // It used to be a child of dress, under bob — and bob is the SQUASH:
        // non-uniform scale (dispR*lat, dispR*squash, dispR*lat) plus a
        // velocity tilt of up to ±0.11 rad on two axes. A rotated child under
        // a non-uniform parent scale is a SHEAR, so every frame the void was
        // moving, the hat's cone smeared sideways and its brim ellipse slid
        // across the face — worst at TITAN sizes where the same radians are
        // hundreds of pixels. Every previous hat measurement was taken on an
        // IDLE void (squash=1, no tilt), which is why three rounds of fixes
        // kept passing while the owner, who plays moving, kept being right.
        // The hat now hangs off the rig ROOT and follows the head rigidly:
        // a hat sits on a creature; it does not wobble like one.
        group.add(g); hats[id] = g;
      }
      g.visible = true;
      wornHat = g; wornSeat = meta.seat; spinRate = meta.spin ?? 0;
      g.position.y = meta.drop ?? 0;   // see Hat.drop
      // ── A HAT MAY NEVER BE WIDER THAN THE VOID WEARING IT ──────────────
      // The owner played with a hat on and the body had vanished underneath it.
      //
      // The cap is a hard invariant, not a nudge: whatever the caricature LOD
      // would like to do, the hat's rendered width is at most HAT_MAX_W body
      // radii. `min(lod, cap)` in animate does that in one line, and because
      // `cap` may be BELOW 1 for an over-wide hat, it shrinks as well as
      // limits growth. That is a change of policy from the version this
      // replaces, which refused to shrink anything — a defensible instinct
      // (nobody wants a hat a parent paid for made smaller) that measured out
      // badly: at the play camera the widest hats were hiding 84-89% of the
      // void, and a hat you cannot see the character under is worth less than
      // a smaller one you can.
      //
      // Two bolder fixes were tried and MEASURED, and both are dead ends worth
      // recording so nobody re-tries them:
      //   narrow on X/Z only -> the brims encircle the head, so pulling one
      //                         inward puts it THROUGH the skull. The width is
      //                         the design; the only safe shrink is uniform
      //                         and about the seat, which is what applyHatLod
      //                         already does.
      //   reposition alone   -> see the lean in animate. It moves the hat to
      //                         the top of the silhouette, which is necessary
      //                         and is not sufficient: a brim 2.02x the body's
      //                         diameter covers the void from anywhere.
      wornLodCap = hatW[id] > 0.01 ? HAT_MAX_W / hatW[id] : 99;
      if (spinRate) g.traverse((o) => { if (o.name === 'spin') spinner = o; });
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
      // THE MOUTH NO LONGER TAKES THE SKIN'S COLOUR AT ALL, and that is the
      // fix rather than an omission. It used to route between a light and a
      // dark mouth by measuring against the body — which put Classic's smile at
      // 1.01:1 and made it invisible, because it was measuring the wrong pixel.
      // A dark rim around a lighter inside carries its OWN contrast, so there
      // is nothing left for a skin to defeat. Same as the maw, which has been
      // skin-blind all along and has never had this problem.
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
        const url = s.tex;
        let t = texCache.get(url);
        if (!t) {
          // only engage the texture once it actually loads (offline/dev keeps
          // the colour-gradient look instead of a broken white orb) — and tell
          // EVERY material that was waiting on it, not just this one
          t = new THREE.TextureLoader().load(url, () => {
            const tex = texCache.get(url);
            for (const m of texWaiting.get(url) ?? []) {
              if (m.uniforms.uTex.value === tex) m.uniforms.uTexAmt.value = 1;
            }
            texWaiting.delete(url);
          });
          t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.ClampToEdgeWrapping;
          t.colorSpace = THREE.SRGBColorSpace;
          texCache.set(url, t);
        }
        bodyMat.uniforms.uTex.value = t;
        const ready = !!t.image;
        bodyMat.uniforms.uTexAmt.value = ready ? 1 : 0;
        if (!ready) {
          // join the queue. The guard above means a material that has since
          // moved to another skin is skipped rather than wrongly lit.
          const q = texWaiting.get(url) ?? [];
          if (!q.includes(bodyMat)) q.push(bodyMat);
          texWaiting.set(url, q);
        }
      } else {
        bodyMat.uniforms.uTex.value = whiteTex;
        bodyMat.uniforms.uTexAmt.value = 0;
      }
    },
    // GRADED. This took no argument, so the mouth opened exactly as wide for a
    // hotel as for a hydrant — about fifty times a match, on the one action the
    // whole game is made of. `k` is the meal's size relative to the void.
    chomp(k = 0.3) {
      if (mouthPinShut) return;
      const g = Math.min(1, Math.max(0.12, k));
      const want = 0.18 + 0.30 * g;                 // 0.22 -> 0.48 of a second
      const wide = 0.42 + 0.58 * g;                 // 0.47 -> 1.00 of the jaw
      // A RETRIGGER MAY EXTEND THE MAW, NEVER SHRINK IT. This used to
      // overwrite mouthMax outright, so a small bite landing inside a big
      // bite's envelope SNAPPED the jaw half shut mid-animation: eat a house
      // (mouthT 0.48, mouthMax 1.0), and 0.3s later — with the maw still
      // rendering fully open, because the render clamps at mouthT * 8 — a
      // traffic cone (want 0.216, wide 0.49) would set mouthMax to 0.49 and
      // halve the opening in one frame. On the one action the whole game is
      // made of, roughly fifty times a match. The current opening is now the
      // floor: a small bite buys more time open, and nothing else.
      const cur = mouthT > 0 ? mouthMax * Math.min(1, mouthT * 8) : 0;
      // the wind-up only plays from a CLOSED mouth — a hoover spree must not
      // re-anticipate mid-chew, that would read as stutter
      if (cur < 0.05) mouthAge = 0;
      if (mouthT < want) mouthT = want;
      mouthMax = Math.max(wide, cur);
      wobble = Math.min(1, wobble + 0.30 + 0.55 * g);
    },
    /** Kick the growth spring directly — an absorbed meal should shove the
     *  blob, not just raise its target radius. */
    impulse(v2: number) {
      dispV += v2;
      // one meal's worth of kick, never a chain of them summed
      dispV = Math.min(dispV, 2.6);
    },
    // the set-piece anims are REACTIONS, not bites — they skip the wind-up
    animGulp() { if (mouthPinShut) return; mouthT = 0.6; mouthMax = 1; wobble = 1; mouthAge = 0.3; },
    animDash() { if (mouthPinShut) return; stretchT = 0.5; mouthT = Math.max(mouthT, 0.4); mouthMax = 0.8; wobble = Math.min(1, wobble + 0.4); mouthAge = Math.max(mouthAge, 0.3); },
    animCollapse() { if (mouthPinShut) return; inhaleT = 0.9; mouthT = 0.9; mouthMax = 1; wobble = 1; mouthAge = 0.3; },
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
      hatSquash = squash;   // the hat rides the head's height, rigidly
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
      bodyMat.uniforms.uPxR.value = pxR;

      // face: billboard to camera, scale with the void
      face.scale.setScalar(dispR);
      face.position.set(0, dispR * 0.1, 0);
      face.quaternion.copy(camera.quaternion);
      // ── AND THE FACE TAKES THE SAME LIGHT THE BODY DOES ──────────────────
      // Every feature is a billboarded circle on a MeshBasicMaterial, which
      // means it takes NO light at all while the body underneath is fully
      // shaded. That is what makes a character read as a sticker rather than as
      // a face: the head turns into the light and the eyes do not.
      //
      // The fix is cheap because of the billboard. The face is oriented to the
      // camera, so its LOCAL x/y are view-space x/y — the same space the body's
      // key light is anchored in (see vec3 L in the fragment shader). So for a
      // feature sitting at face-local (px, py), the sphere normal under it is
      // just (px, py, sqrt(1 - px^2 - py^2)), and running that through the same
      // smoothstep the body uses gives the same form light, for free, on the
      // CPU, for a handful of meshes.
      //
      // The range is gentler than the body's 0.62-1.22. These are the features
      // a six-year-old reads the mood from, so they get lit, not dimmed: at
      // 0.82-1.12 the eye on the shadow side is visibly cooler without ever
      // becoming hard to see.
      for (const e of eyes) {
        const px = e.g.position.x, py = e.g.position.y;
        // …and the same normal that lights it also SEATS it: wrapTo pushes the
        // eyeball back to the surface depth and tilts it to face along the
        // normal, in place, so the outer eye foreshortens the way a painted
        // feature on a sphere has to.
        const nz = wrapTo(e.ball, px, py);
        // …and the normal is taken about the BODY's centre, which sits at
        // y = -FACE_OY in this space. Using the raw face y instead lit the top
        // of the head as if it faced the camera.
        const ndl = px * FACE_L.x + (py + FACE_OY) * FACE_L.y + nz * FACE_L.z;
        // THE BODY'S OWN RANGE, not a gentler one. The fragment shader does
        // col *= mix(0.62, 1.22, key) with this same smoothstep, so using any
        // other numbers here means the face is lit by a different sun than the
        // head it sits on — which is the exact failure being fixed. A shaded
        // white sclera going grey is correct; that is what white does in shade.
        const k = 0.62 + 0.60 * THREE.MathUtils.smoothstep(ndl, -0.55, 0.95);
        // the sclera and pupil are textured white, so the tint IS the light;
        // the outline is authored 0x2a1f45 and keeps its own hue
        (e.white.material as THREE.MeshBasicMaterial).color.setScalar(k);
        (e.outline.material as THREE.MeshBasicMaterial).color.setRGB(
          0x2a / 255 * k, 0x1f / 255 * k, 0x45 / 255 * k);
      }
      // …and the costume follows the face round the orb. Yaw only: a crown
      // must stay on top of the head, not tip toward the lens.
      dress.rotation.y = Math.atan2(camera.position.x - group.position.x, camera.position.z - group.position.z);
      // A crown point 0.38 units tall is 3.5 device pixels at match start, so
      // the parts get the same caricature LOD the eyes and mouth already have
      // (eyeLod below) — otherwise the thing a parent paid for is invisible for
      // the first third of every match.
      // THE COSTUME LOD, and the hat is exempt from the group form of it.
      // Scaling a GROUP scales its children's POSITIONS as well as their size,
      // so anything seated on TOP of the head lifts off: a brim at y=0.95 lands
      // at 1.35 at full strength. The five legendary accessories survive that
      // only by accident — measured with qa/acclift.mjs, every one of them sits
      // below y=0.6 or wraps the body from underneath, so scaling outward from
      // the centre keeps them attached. A hat has no such luck, so it takes the
      // same scalar about its own seat instead. See applyHatLod in hats.ts.
      const lod = 1 + small * 0.42;
      dress.scale.setScalar(lod);
      if (wornHat) {
        // …the HAT's share of the caricature LOD is capped at its own width
        // (wornLodCap, measured at mount from the AUTHORED geometry).
        const hatLod = Math.min(lod, wornLodCap);
        const meta = HAT_BY_ID[wornHatId!];
        // Rigid follow (see the note at mount): the hat is a child of the
        // unscaled rig root, so none of bob's squash, breathe, or velocity
        // tilt can shear it. It takes the body's SIZE (dispR), the camera
        // yaw the face uses, the camera-tracked lean, and rides the head's
        // squashed height — attached, never deformed.
        const py = wornSeat * (1 - hatLod) + (meta?.drop ?? 0) * hatLod;
        const lean = hatLean(Math.atan2(
          camera.position.y - group.position.y,
          Math.hypot(camera.position.x - group.position.x, camera.position.z - group.position.z) || 1e-4));
        wornHat.rotation.order = 'YXZ';
        wornHat.rotation.y = dress.rotation.y;
        wornHat.rotation.x = -lean;
        wornHat.scale.setScalar(dispR * hatLod);
        const zRoll = -py * Math.sin(lean) * dispR;
        wornHat.position.set(
          zRoll * Math.sin(dress.rotation.y),
          py * Math.cos(lean) * dispR * hatSquash,
          zRoll * Math.cos(dress.rotation.y));
        if (spinner) spinner.rotation.y += dt * spinRate;
      }
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

      // mouth: maw scales in while open, smile hides. Three phases instead of
      // the old single-frame pop: ~45ms of wind-up (the jaw barely parts —
      // the anticipation every polished eat animation has), a spring open
      // with ~10% overshoot at ~220ms, settled by ~400ms; the existing
      // mouthT*8 term stays as the CLOSING ease so the jaw never snaps shut.
      if (mouthT > 0) { mouthT -= dt; mouthAge += dt; }
      let openEnv = 1;
      if (mouthAge < 0.045) openEnv = (mouthAge / 0.045) * 0.12;
      else {
        const t2 = mouthAge - 0.045;
        openEnv = 1 - 0.88 * Math.exp(-t2 * 10) * Math.cos(t2 * 14);
      }
      const mo = Math.max(mouthT > 0 ? mouthMax * openEnv * Math.min(1, mouthT * 8) : 0, mp.maw);
      maw.scale.setScalar(Math.max(0.001, mo));
      // THE CLIFF. Above this the gape has swallowed the smile and drawing both
      // is just z-fighting two mouths. Below it they nest and read as one open
      // grin. It was a bare 0.25 for a year, and because nothing named it, a
      // mood was tuned to maw 0.26 and deleted the hero's face in four worlds
      // out of five without anyone editing a line of face code. If you are
      // adding a mood: a `maw` at or above this constant means YOUR MOOD HAS NO
      // SMILE, whatever its `smile` value says. qa/faceparity.mjs enforces it.
      mouth.visible = mo < MOUTH_HIDES_AT;
      // FANGS grow in over GOBBLIN→WORLD ENDER — the void's face itself levels up
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
      // BROWS SIT HIGHEST, so they were the worst offender: at y = 0.4 the flat
      // plane floats 0.16 proud of the head. The mood angle rides INSIDE the
      // wrap (see wrapTo's `spin`), so an angry brow still tilts in the plane of
      // the forehead rather than in the plane of the screen.
      brows[0].position.y = brows[1].position.y = mp.browY;
      wrapTo(brows[0], brows[0].position.x, mp.browY, mp.browAng);
      wrapTo(brows[1], brows[1].position.x, mp.browY, -mp.browAng);
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
        // THE SCALE GOES ON `ball`, NOT ON `g`. `ball` is tilted to the surface
        // normal, so scaling it applies inside the eye's own plane. Scaling the
        // untilted parent by a non-uniform (k, k, 1) instead would shear the
        // tilted child — the eye would skew as it foreshortened.
        e.ball.scale.set(eyeK, eyeK, 1);
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
        // ── ASLEEP MEANS SHUT ──────────────────────────────────────────────
        // Squashing the eye alone leaves a thin white slit with a dark dash in
        // it, which reads as half-lidded and dazed rather than asleep — and it
        // was doing that under a stack of floating Zzz. Hiding the white and
        // the pupil leaves the dark backing disc as the only thing drawn, and
        // a flattened disc IS the line a closed cartoon eye is made of.
        // Crossfaded rather than switched so waking up is not a pop.
        // The white and the pupil have to fade TOGETHER. The first version
        // faded the white by opacity and switched the pupil with .visible, so
        // waking up passed through a frame of blank white ovals with no pupil —
        // the same dazed look this whole change exists to remove, just briefly.
        const shut = mp.shut;
        const eyeOpen = 1 - shut;
        e.white.visible = eyeOpen > 0.02;
        e.pupilGrp.visible = eyeOpen > 0.02;
        if (eyeOpen > 0.02) {
          const wm = e.white.material as THREE.Material;
          if (wm.opacity !== eyeOpen) { wm.transparent = eyeOpen < 0.999; wm.opacity = eyeOpen; }
          e.pupilGrp.traverse((o) => {
            const pm = (o as THREE.Mesh).material as THREE.Material | undefined;
            // the character-eye star and ring carry their own opacity for the
            // legendary skins — those are driven elsewhere and left alone
            if (pm && o === e.pupilGrp.children[0]) { pm.transparent = eyeOpen < 0.999; pm.opacity = eyeOpen; }
          });
        }
        // outline weight: fattens as he shrinks, so the eye keeps a dark
        // boundary against a bright body even at a handful of pixels
        e.outline.scale.setScalar(SCL_R * (1 + 0.05 + small * 0.14));
      }
      // mouth: smile scale + smirk tilt + frown flip (scale.y through ~0 = flat)
      const mk = mp.smile * (1 + small * 0.20);            // caricature when tiny
      mouth.scale.set(mk, Math.sign(mp.mouthY || 1) * Math.max(0.06, Math.abs(mp.mouthY)) * mk, 1);
      // position BEFORE wrap — the wrap reads the y it is seating. The mouth is
      // built upside-down (the PI), and the smirk rides with it inside the wrap,
      // so a lopsided grin tilts across the chin rather than across the screen.
      mouth.position.y = mp.mouthY < 0 ? -0.22 : -0.28;   // frowns ride a touch higher
      wrapTo(mouth, 0, mouth.position.y, Math.PI + mp.smirk);

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
    },
  };

  return api;
}

// ── shared legendary-accessory factory: the SAME 3D flair the player wears
// is worn by rivals in their random skins (unit-orb space, scale with r)
export function buildAccessory(kind: string): THREE.Group {
  const g = new THREE.Group();
  if (kind === 'unicorn') {
    // ── THE HORN IS THE HAT'S HORN NOW ────────────────────────────────────
    // This used to be six open-ended cones stacked up the brow with a twist on
    // each, which at gameplay size passed for a spiral. Then the shop started
    // rendering cards, and at 420px it was unmistakably a small rainbow
    // CHRISTMAS TREE — six flared skirts, one on top of the next — on the card
    // selling a $2.99 character. A card on a retina phone is a magnifying
    // glass, and it is the forcing function these five never had.
    //
    // spiralHorn is the Rainbow Horn hat's horn: a tapering tube swept along a
    // real helix over a pearl core. One horn, built once, worn by both.
    const horn = spiralHorn(1.22, 0.185, 3.0);
    horn.position.set(0, 0.90, 0.14);
    horn.rotation.x = 0.20;
    g.add(horn);
    // ears: lathe teardrops rather than cones, with the pink inner sitting
    // proud of the FRONT face — the same shape the hat's ears settled on after
    // the cone version rendered as two traffic cones.
    const earProf: THREE.Vector2[] = [];
    for (let i = 0; i <= 8; i++) {
      const t = i / 8;
      earProf.push(new THREE.Vector2(0.5 * Math.sin(Math.PI * Math.pow(t, 0.68)) * (1 - t * 0.3), t));
    }
    const earGeo = new THREE.LatheGeometry(earProf, 10);
    const earMat = new THREE.MeshStandardMaterial({ color: 0xfff2f8, roughness: 0.5 });
    const innerMat = new THREE.MeshStandardMaterial({ color: 0xff87bd, roughness: 0.45,
      emissive: 0xff5c9e, emissiveIntensity: 0.3 });
    for (const sx of [-1, 1]) {
      const ear = new THREE.Group();
      const outer = new THREE.Mesh(earGeo, earMat);
      outer.scale.set(0.34, 0.78, 0.17);
      ear.add(outer);
      const inner = new THREE.Mesh(earGeo, innerMat);
      inner.scale.set(0.20, 0.62, 0.10);
      inner.position.set(0, -0.10, 0.055);
      ear.add(inner);
      ear.position.set(sx * 0.56, 0.66, 0.10);
      ear.rotation.set(-0.14, sx * 0.22, sx * -0.42);
      g.add(ear);
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
    // ── WINGS, NOT EARS ──────────────────────────────────────────────────
    // Mounted at y = 0.72 and swept UP, these two read unmistakably as rabbit
    // ears at the portrait yaw — two tall teal blades standing straight off the
    // top of the head, which is the one silhouette a dragon must not have. They
    // sit lower and further back now, and the sweep is outward rather than
    // upward, so they read as something folded against the shoulders.
    for (const sx of [-1, 1]) {
      // MIRRORED BY SCALE, not by negating Euler angles. CircleGeometry's fan
      // spans 0 to 0.72*PI from +X — it is not symmetric about its own origin —
      // so flipping the signs of three rotations gives two DIFFERENT shapes,
      // and the previous pass rendered one visible wing on the left and
      // nothing on the right. Negating x on a holder is a true reflection, and
      // the material is already DoubleSide so the flipped winding is fine.
      const holder = new THREE.Group();
      holder.scale.x = sx;
      g.add(holder);
      const wing = new THREE.Mesh(new THREE.CircleGeometry(0.95, 5, 0, Math.PI * 0.72), wingMat);
      // Three goes, and the third one finally names the cause. At y=0.72 swept
      // UP they were rabbit ears. A yaw of 1.35 turned them 77 degrees out of
      // the camera's plane and made them edge-on slivers. Lowering the mount
      // did not help either — and it could not, because the fan is 0.95 long
      // and was rolled so it pointed UPWARD, so whatever its origin the tip
      // still finished above the skull. Anything that rises past the top of a
      // round head is an ear. The roll is the fix: past a right angle the fan
      // sweeps DOWN and out, its highest point is its own mount, and it reads
      // as something folded against the back.
      wing.position.set(0.80, 0.22, -0.56);
      wing.rotation.set(0.18, 0.50, 2.40);
      wing.scale.set(1.55, 1.05, 1);
      holder.add(wing);
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
    // ── THE STARDUST RING IS GONE, AND THAT IS THE FIX ───────────────────
    // Six solid gold octahedra rode the equator at |p| = 1.15. Two of them sat
    // in FRONT of the head at the play camera's yaw and projected a gold cube
    // onto the king's cheek — which on a shop card reads as a rendering bug on
    // the product you are being asked to pay for. Moving them to the back
    // hemisphere only relocated the problem: an octahedron seen edge-on at the
    // silhouette is a flat quad, so they became gold debris pinned to his rim.
    //
    // They were never needed. King Void's char rig already carries
    // `aura: 0xffd25a, auraKind: 'stars'` — twelve billboarded, glowing,
    // camera-true star sprites that are gold stardust done properly, and they
    // were drawing underneath this ring the whole time. One of the two had to
    // go, and it is not the one that always faces the lens.
  }
  g.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.castShadow = true; });
  return g;
}
