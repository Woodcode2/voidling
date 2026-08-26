// ══════════════════════════════════════════════════════════════════════════
//  POWDER PASS — the snow-day mountain village prop kit
//  A valley bowl the morning the school rang every parent at 6:40am: chalets
//  shoulder-deep in overnight snow, a frozen lake in the middle of everything,
//  a pinewood up one wall, a chairlift running to nowhere anyone is going
//  today, and THE LODGE at the head of the valley with every window lit,
//  waiting to be the last thing eaten.
//
//  House rules, same as island.ts, nightmarket.ts and the rest:
//    • every prop is ONE merged mesh sharing PROP_SHARED_MAT (one draw call)
//    • no per-prop materials, no textures, flat shading, chunky silhouettes
//    • y = 0 is the ground plane, the prop's nose/front faces +X
//    • keep each prop under ~140 parts
//
//  …AND ONE RULE THAT IS NEW HERE: THE SNOW CAP. This game's camera looks
//  DOWN, which means a building is mostly its roof — nightmarket learned that
//  the hard way when its bathhouse photographed as a black rectangle. In a
//  snow world the same fact is a gift instead of a bug: every roof in this
//  kit carries a thick white cap that stops just shy of the eave, so from the
//  play camera the village reads as a field of soft white slabs with one dark
//  slate line at each lip. That eave line is the whole trick. A roof that is
//  white to the edge merges with the white ground and the building vanishes;
//  the dark strip is what says "this white is SITTING ON something." If a
//  factory in this file has a roof and no cap, the factory is not finished.
//
//  THE BLUE SHADOW RULE. Snow is lit twice — once by the sun, warm and
//  direct, and once by the entire sky, which is blue and everywhere. The
//  sunlit side of a drift is warm white; the shadowed side is not grey, it is
//  SKY-coloured, because the sky is the only light reaching it. So SNOW_D is
//  a blue, deliberately, and nothing in this file may use a neutral grey for
//  snow in shadow: grey snow reads as slush, and a valley of slush is a
//  washed-out valley. Blue shadows + warm windows + hard saturated accents
//  (sled red, gritter orange, pine green) are the three things standing
//  between this world and a whiteout, and all three are enforced here.
//
//  ON THE WINDOWS. This is a daytime world and the windows still burn —
//  every lit pane rides PROP_GLOW_MAT, which is unlit and HDR (island.ts
//  pushes it to 1.75, past the bloom threshold, so warm glass halos). The
//  reason is the fiction as much as the frame: it is a SNOW DAY. School is
//  shut, the council has issued a statement, and every single person in this
//  valley is indoors with the heating on. A village with dark windows on a
//  snow day reads abandoned; a village with two hundred warm windows reads
//  like everyone is watching the hole in the snow from behind their curtains,
//  which is exactly what is happening.
//
//  THE REGISTER, for anyone adding to this kit: the comedy here is municipal.
//  Nothing is ever dangerous and nobody is ever hurt; the jokes are a gritter
//  lorry gamely ploughing a road that is about to stop existing, and a piste
//  sign still pointing the correct way down. Understatement against total
//  catastrophe. Keep it that way.
// ══════════════════════════════════════════════════════════════════════════
import * as THREE from 'three';
import { part, mergedProp, PROP_GLOW_MAT, PROP_SMOOTH_MAT } from './island';
import { registerGloss } from './gloss';

/** A prop with NO FRONT. island.ts's place() turns anything tagged here by a
 *  hash of its own position, because 87% of Maple Falls sat at exactly 0
 *  radians and read as stamped. Anything with a door, a face, a screen or a
 *  direction must NOT be tagged — it keeps the facing its call site authored. */
const noFront = <T extends THREE.Object3D>(m: T): T => { m.userData.spin = 1; return m; };


type G = THREE.BufferGeometry;

// ── palette ───────────────────────────────────────────────────────────────
// Two families again, doing opposite jobs from nightmarket's. There the
// solids were dark and the glows carried the scene; here the ground state of
// the world is BRIGHT, so the solids carry it and the glows are small warm
// punctuation. Everything cold leans blue, everything alive leans warm and
// saturated, and there is no neutral grey anywhere in this table — a neutral
// in a snow scene is a smudge.
const SNOW = 0xf4f7ff;      // sunlit snow: white with the faintest cool cast
const SNOW_D = 0xdbe4f5;    // snow in shadow — BLUE, per the rule above
const ICE = 0xcfe8f2;       // the lake, the rink: pale glacial blue-green
const ICE_D = 0xa8ccdd;     // thick ice, ice in shadow under the bank
const TIMBER = 0x8a5a34;    // chalet boards, oiled against the weather
const TIMBER_D = 0x6b4426;  // undersides, door frames, shadowed timber
const SLATE = 0x55617a;     // roof slate — the dark eave strip under the cap
const SLATE_D = 0x3e4859;   // slate in shadow, chimney flashing
const STONE = 0x8b8f9c;     // granite: plinths, chimneys, the lodge's base
const STONE_D = 0x62667a;   // shadowed granite, cool like everything else
const PINE = 0x2e6b46;      // pine boughs where the snow slid off
const PINE_D = 0x1e4c33;    // inner boughs, the dark under each tier
const BARK = 0x4e3a28;      // trunks, fence posts, log piles
const CUT = 0xc9a06a;       // the sawn face of a log — the one warm wood note
const RED = 0xd83a2e;       // THE accent: sleds, scarves, shutters, hazards
const RED_D = 0xa32a22;     // shadowed red, painted iron
const TEAL = 0x2f8ba3;      // knitwear and ski lacquer, the cold accent
const GOLD = 0xdba32c;      // ski lacquer, the bell, a bobble hat
const STEEL = 0x9aa4b2;     // the lift line: pylons, runners, the plough
const CHAR = 0x2a2e38;      // coal, ironwork, tyres, the black piste sign
const ORANGE = 0xe07820;    // the gritter — statutory municipal orange
const ORANGE_D = 0xb45c14;  // its shadowed panels
const SMOKE = 0xb9c2d4;     // chimney smoke: blue-grey, so it reads over the
                            // white cap it drifts across (white-on-white dies)

// the glows — unlit and HDR, so these are the literal pixels on screen
const G_WINDOW = 0xffc978;  // the workhorse: every lit pane in the valley
const G_DOOR = 0xffe9c4;    // an open doorway, paler — a room not a lamp
const G_HEARTH = 0xff8e40;  // the lodge entrance: the warmest note in the map
const G_BEACON = 0xffb545;  // the gritter's roof beacon, dutifully turning

// ── WHAT CATCHES THE SUN ──────────────────────────────────────────────────
// See installPropShader in island.ts. This is the anti-nightmarket: full
// daylight, so the diffuse survives fine and the specular's job is TEXTURE —
// telling ice from snow from slate when all three are pale and cool.
//
// ICE runs highest because the frozen lake is the arena floor and the only
// true mirror in the valley; the sun streak sliding across it as the camera
// orbits is what says "this is slippery" without a single physics change.
// SNOW is low but NOT zero — powder is the most matte material there is, but
// packed and groomed snow throws a faint sparkle, and a dead-matte white at
// this coverage (most of the level's pixels) goes cardboard. SLATE gets a
// real value even though most of every roof hides under the cap: the exposed
// eave strip is thin, and a wet-slate glint is how a thin strip stays
// legible at distance. TIMBER matches the other worlds' oiled boards, and
// STEEL is the lift — a cable span reads from across a valley precisely
// because it is the shiniest thing in it.
registerGloss([
  [ICE, 0.80], [ICE_D, 0.72],
  [SNOW, 0.15], [SNOW_D, 0.12],
  [TIMBER, 0.20], [TIMBER_D, 0.20],
  [SLATE, 0.40], [SLATE_D, 0.34],
  [STEEL, 0.55], [CHAR, 0.30],
  // painted enamel: a sled and a gritter are lacquered metal, and the red
  // needs the pop — a matte red in blue shadow drifts toward brick
  [RED, 0.32], [RED_D, 0.28], [ORANGE, 0.30], [TEAL, 0.30], [GOLD, 0.35],
  [STONE, 0.18], [STONE_D, 0.16],
  [PINE, 0.10], [PINE_D, 0.08],   // needles hold snow; snow doesn't shine
], 'alpine');

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T>(a: T[]): T => a[(Math.random() * a.length) | 0];

/** Both halves of a prop that is partly its own light source — same idiom as
 *  nightmarket.ts. Here the glow half is almost always windows. */
function lit(solid: G[], glow: G[]): THREE.Group {
  const g = new THREE.Group();
  if (solid.length) g.add(mergedProp(solid));
  if (glow.length) g.add(mergedProp(glow, PROP_GLOW_MAT));
  return g;
}

// ── the signature construction ────────────────────────────────────────────
/** A gabled roof with the snow cap, ridge running along X (so the gable ends
 *  face ±X, where the prop's front is). Pushes into `solid`:
 *    • two slate planes, full length, meeting at the ridge
 *    • two SNOW cap slabs riding above them, stopped SHORT of the eave — the
 *      exposed slate strip at the lip is the signature read (see header)
 *    • a snow ridge roll, because wind builds a cornice on every ridge line
 *    • gable boards filling the triangular ends
 *  The gable boards are 4-segment cones squashed flat in X: an unrotated
 *  ConeGeometry's square base sits corner-out (a diamond), so from ±X its
 *  silhouette is exactly the triangle we need, and squashing X to a sliver
 *  turns the diamond into a board. part() scales BEFORE it rotates, so the
 *  usual rotate-45° pyramid trick can't be stretched anisotropically — this
 *  is the version that survives that ordering.
 *  Returns the ridge height. */
function capRoof(solid: G[], w: number, d: number, eaveY: number, rise: number,
  over = 1.1, body: number = TIMBER, roof: number = SLATE, glow?: G[]): number {
  const half = d / 2 + over * 0.5;             // eave half-span in z
  const slope = Math.hypot(half, rise);
  const pitch = Math.atan2(rise, half);
  for (const sz of [-1, 1]) {
    // the slate, ridge to eave
    solid.push(part(new THREE.BoxGeometry(w + over * 2, 0.16, slope * 1.02), roof,
      0, eaveY + rise / 2, sz * half / 2, sz * pitch, 0, 0));
    // ── THE CAP USED TO BE WIDER THAN THE ROOF IT SAT ON ──────────────────
    // It was `w + over * 2 + 0.24` against a slate of `w + over * 2` — 0.12
    // PROUD at each gable verge. So the roof colour survived only where the cap
    // is short along the slope, which is the eave, and that single navy line at
    // the bottom edge was the whole of what a top-down camera could see of this
    // house. Both verges were buried under snow that overhung them.
    //
    // Inset 0.45 a side now, so the border runs all the way round. New Horizons
    // keeps its winter snow short on every edge of a roof for exactly this
    // reason: it is the difference between one dark line and a frame.
    solid.push(part(new THREE.BoxGeometry(w + over * 2 - 0.9, 0.36, slope * 0.72), SNOW,
      0, eaveY + rise * 0.62 + 0.22, sz * half * 0.38, sz * pitch, 0, 0));
  }
  // The cornice was SNOW on SNOW and therefore invisible — and after the inset
  // above it would have overhung the cap and capped the new border in white at
  // both ridge corners. In the roof's own colour it reads as a ridge for the
  // first time, at no triangle cost.
  solid.push(part(new THREE.CylinderGeometry(0.3, 0.3, w + over * 2, 8), roof,
    0, eaveY + rise + 0.16, 0, 0, 0, Math.PI / 2));
  // gable boards, one each end
  for (const sx of [-1, 1])
    solid.push(part(new THREE.ConeGeometry(half * 0.94, rise * 0.98, 4), body,
      sx * (w / 2 - 0.06), eaveY + rise * 0.49, 0, 0, 0, 0, 0.12, 1, 1));
  // ── THE ROOF LIGHT ────────────────────────────────────────────────────────
  // The one warm thing on the surface the camera owns. Every other window on
  // this house is on a wall — about 15% of its pixels, ambient-lit — and the
  // camera never drops below 46 degrees. This lies IN the slope plane and rides
  // PROP_GLOW_MAT, so it does not depend on where the key is pointing.
  //
  // The offsets are divided by cos(pitch) because they are measured along the
  // roof's NORMAL, not vertically. Left vertical, the pane's overlap with its
  // own curb is 0.20*cos(p) - 0.17, which is 0.019 at the village pitch and
  // reaches ZERO at pitch 31.8 — a future caller with a shallower roof would
  // float the glass off its frame. This is the skeptic's catch, not mine.
  if (glow) for (const sz of [-1, 1]) {
    const cp = Math.cos(pitch);
    const lw = w * 0.24, ll = slope * 0.30;
    const ly = eaveY + rise * 0.55, lz = sz * half * 0.45;
    solid.push(part(new THREE.BoxGeometry(lw, 0.24, ll), roof,
      w * 0.14, ly + 0.46 / cp, lz, sz * pitch, 0, 0));
    glow.push(part(new THREE.BoxGeometry(lw * 0.74, 0.10, ll * 0.70), G_WINDOW,
      w * 0.14, ly + 0.66 / cp, lz, sz * pitch, 0, 0));
  }
  return eaveY + rise;
}

/** A stone chimney through a snow cap: the stack, an iron rim, a snow collar
 *  where the roof snow banks against it, and smoke — SMOKE-coloured, because
 *  white smoke over a white cap is invisible and a cold chimney on a snow day
 *  is a household emergency. */
function chimney(solid: G[], x: number, topY: number, z = 0, k = 1): void {
  solid.push(part(new THREE.BoxGeometry(0.9 * k, 2.4 * k, 0.9 * k), STONE, x, topY - 0.6 * k, z));
  solid.push(part(new THREE.BoxGeometry(1.04 * k, 0.18 * k, 1.04 * k), SLATE_D, x, topY + 0.5 * k, z));
  solid.push(part(new THREE.BoxGeometry(1.2 * k, 0.3 * k, 1.2 * k), SNOW, x, topY + 0.1 * k, z));
  for (let i = 0; i < 2; i++)
    solid.push(part(new THREE.SphereGeometry((0.3 + i * 0.12) * k, 6, 5), SMOKE,
      x + i * 0.3 * k, topY + (1.0 + i * 0.55) * k, z + rnd(-0.1, 0.1), 0, 0, 0, 1, 0.7, 1));
}

// ── the buildings ─────────────────────────────────────────────────────────
/** A chalet. The repeated unit of the village: stone plinth, timber body,
 *  steep capped roof, shutters, and windows that are ALL lit (snow day —
 *  everyone is home). Size comes through the args so the integrator can run
 *  two or three variants down a lane; the default is the mid-size house.
 *  Snow sits on every sill, because the sills are horizontal and it snowed
 *  all night — the kit's rule is that anything flat carries white. */
const CHALET_ROOFS = [RED_D, TEAL, PINE_D, SLATE] as const;

export function makeChalet(w = rnd(6.2, 8.6), d = rnd(4.8, 6.4)): THREE.Group {
  const solid: G[] = [], glow: G[] = [];
  const H = 2.9;                                   // wall height to the eave
  // ── THE ROOF IS THE FACE ────────────────────────────────────────────────
  // Every chalet's slate was the same hard-coded SLATE, so from 46 degrees
  // above, the village was two dozen identical white slabs with identical grey
  // edges. New Horizons puts a house's identity colour on its ROOF precisely
  // because that is the face its camera can see; this kit shipped the snow half
  // of that idea without the colour half.
  //
  // SLATE stays in the set so a quarter of the village keeps an unpainted roof
  // and it reads as a village rather than as bunting. All four are already in
  // the palette and already in the gloss table above: no new colour, no new
  // material, no new draw call.
  //
  // DETERMINISM: derived from `w`, which the default argument has already
  // sampled — no mrnd/mr/mpick/mchance and no Math.random added or removed, in
  // either the seeded stream or the unseeded one.
  const ID = CHALET_ROOFS[Math.floor(w * 5) % CHALET_ROOFS.length];
  // plinth and body
  solid.push(part(new THREE.BoxGeometry(w * 1.04, 0.7, d * 1.04), STONE_D, 0, 0.35, 0));
  solid.push(part(new THREE.BoxGeometry(w, H, d), TIMBER, 0, 0.7 + H / 2, 0));
  // drift banked against the uphill wall — the house has been snowed AGAINST
  solid.push(part(new THREE.SphereGeometry(d * 0.42, 8, 5), SNOW_D,
    -w * 0.5, 0.35, 0, 0, 0, 0, 1, 0.55, 1.35));
  // windows down both long faces, shuttered and lit
  const n = Math.max(2, Math.round(w / 3));
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + (w / n) * (i + 0.5);
    for (const sz of [-1, 1]) {
      glow.push(part(new THREE.BoxGeometry(0.78, 0.72, 0.12), G_WINDOW, x, 0.7 + H * 0.58, sz * (d / 2 + 0.02)));
      for (const s of [-1, 1])
        solid.push(part(new THREE.BoxGeometry(0.24, 0.76, 0.08), RED, x + s * 0.56, 0.7 + H * 0.58, sz * (d / 2 + 0.05)));
      // the snowed sill
      solid.push(part(new THREE.BoxGeometry(1.0, 0.12, 0.2), SNOW, x, 0.7 + H * 0.58 - 0.44, sz * (d / 2 + 0.08)));
    }
  }
  // the gable end faces +X: the door, its little capped hood, and one small
  // window up in the gable so the attic is home too
  solid.push(part(new THREE.BoxGeometry(0.14, 1.5, 1.0), TIMBER_D, w / 2 + 0.02, 1.45, 0));
  glow.push(part(new THREE.BoxGeometry(0.1, 0.3, 0.7), G_DOOR, w / 2 + 0.08, 2.32, 0));
  solid.push(part(new THREE.BoxGeometry(0.9, 0.14, 1.5), SLATE, w / 2 + 0.3, 2.62, 0, 0, 0, -0.2));
  solid.push(part(new THREE.BoxGeometry(0.9, 0.22, 1.56), SNOW, w / 2 + 0.28, 2.78, 0, 0, 0, -0.2));
  glow.push(part(new THREE.BoxGeometry(0.12, 0.5, 0.5), G_WINDOW, w / 2 - 0.02, 0.7 + H + d * 0.16, 0));
  // roof + chimney, offset so the smoke never rises through the ridge roll
  const ridge = capRoof(solid, w, d, 0.7 + H, d * 0.52, 1.1, TIMBER, ID, glow);
  chimney(solid, -w * 0.22, ridge + 0.4, d * 0.16, 0.85);
  return lit(solid, glow);
}

/** THE LODGE — the landmark, and the mesh the void eventually eats. Sized
 *  from nightmarket's bathhouse (a ~26-unit footprint that reads from the far
 *  side of the map): a full-width stone terrace, a stone ground floor, a
 *  timber storey over it, a great capped roof deeper than any chalet's, twin
 *  chimneys both going (the lodge's boilers do not observe snow days), and
 *  rows of windows lit on every face because everyone who is not behind a
 *  curtain is in here drinking chocolate. The entrance faces +X and glows
 *  G_HEARTH, one warmth-stop past the windows: the building's whole job is
 *  to be the warmest thing in a cold valley, visible from spawn. */
export function makeLodge(): THREE.Group {
  const solid: G[] = [], glow: G[] = [];
  const W = 24, D = 15;
  // terrace: two stone steps the whole width, swept — the caretaker got up
  // early, which is the only reason any stone shows in this map
  solid.push(part(new THREE.BoxGeometry(W * 1.34, 1.0, D * 1.4), STONE_D, 0, 0.5, 0));
  solid.push(part(new THREE.BoxGeometry(W * 1.22, 0.5, D * 1.26), STONE, 0, 1.25, 0));
  // snow shovelled off the terrace piles at its edges — work has been done
  for (const sz of [-1, 1])
    solid.push(part(new THREE.SphereGeometry(1.6, 8, 5), SNOW_D, -W * 0.55, 1.2, sz * D * 0.6, 0, 0, 0, 2.2, 0.5, 1));
  // ground floor: stone, tall
  const H1 = 4.2, y1 = 1.5;
  solid.push(part(new THREE.BoxGeometry(W, H1, D), STONE, 0, y1 + H1 / 2, 0));
  // first floor: timber, slightly proud of the stone, chalet-fashion
  const H2 = 3.6, y2 = y1 + H1;
  solid.push(part(new THREE.BoxGeometry(W * 1.06, H2, D * 1.06), TIMBER, 0, y2 + H2 / 2, 0));
  solid.push(part(new THREE.BoxGeometry(W * 1.1, 0.35, D * 1.1), TIMBER_D, 0, y2 + 0.1, 0));
  // THE WINDOWS — both storeys, all four faces, every one lit. Same loop
  // shape as the bathhouse because it solves the same problem: a landmark
  // has to read as inhabited from every approach, not just its front.
  for (const [yF, hF, wF, dF] of [[y1, H1, W, D], [y2, H2, W * 1.06, D * 1.06]] as const) {
    const cols = Math.max(4, Math.round(wF / 3.2));
    for (let c = 0; c < cols; c++) {
      const x = -wF / 2 + (wF / cols) * (c + 0.5);
      for (const sz of [-1, 1])
        glow.push(part(new THREE.BoxGeometry(wF / cols * 0.5, hF * 0.38, 0.14), G_WINDOW,
          x, yF + hF * 0.58, sz * (dF / 2 + 0.03)));
    }
    const rows = Math.max(3, Math.round(dF / 3.2));
    for (let r = 0; r < rows; r++) {
      const z = -dF / 2 + (dF / rows) * (r + 0.5);
      for (const sx of [-1, 1])
        glow.push(part(new THREE.BoxGeometry(0.14, hF * 0.38, dF / rows * 0.5), G_WINDOW,
          sx * (wF / 2 + 0.03), yF + hF * 0.58, z));
    }
  }
  // the balcony rail across the +X face of the timber storey, snow on it
  solid.push(part(new THREE.BoxGeometry(0.16, 0.16, D * 1.02), TIMBER_D, W * 0.55, y2 + 1.3, 0));
  solid.push(part(new THREE.BoxGeometry(0.2, 0.12, D * 1.04), SNOW, W * 0.55, y2 + 1.42, 0));
  for (let i = 0; i < 7; i++)
    solid.push(part(new THREE.BoxGeometry(0.12, 1.2, 0.12), TIMBER_D, W * 0.55, y2 + 0.7, -D * 0.45 + i * D * 0.15));
  // THE ENTRANCE: a porch under its own small capped gable, and the doorway
  // itself is the hottest glow in the kit — approached head-on from spawn.
  solid.push(part(new THREE.BoxGeometry(1.6, 0.5, 6.4), STONE, W * 0.56, 1.75, 0));
  for (const sz of [-1, 1])
    solid.push(part(new THREE.BoxGeometry(0.4, 3.4, 0.4), TIMBER_D, W * 0.56 + 0.4, 3.7, sz * 2.4));
  glow.push(part(new THREE.BoxGeometry(0.16, 3.2, 3.2), G_HEARTH, W / 2 + 0.06, 3.6, 0));
  solid.push(part(new THREE.BoxGeometry(2.6, 0.16, 6.0), SLATE, W * 0.55, 5.7, 0, 0, 0, -0.24));
  solid.push(part(new THREE.BoxGeometry(2.6, 0.3, 6.1), SNOW, W * 0.54, 5.92, 0, 0, 0, -0.24));
  // two lanterns flanking the door, small and warm
  for (const sz of [-1, 1])
    glow.push(part(new THREE.BoxGeometry(0.3, 0.44, 0.3), G_WINDOW, W * 0.56 + 0.4, 2.9, sz * 2.4));
  // THE GREAT ROOF. Deeper rise than the chalets — the lodge's silhouette
  // has to win the skyline — and a heavier cap, laid on in two slabs so its
  // edge reads stepped, the way a season's snowpack actually sits.
  const ridge = capRoof(solid, W * 1.06, D * 1.06, y2 + H2, D * 0.62, 1.6, TIMBER_D);
  solid.push(part(new THREE.BoxGeometry(W * 0.7, 0.4, D * 0.5), SNOW, 0, ridge - D * 0.1, 0));
  // icicles along the +X eave lip: ICE, so they run glossy — six cold
  // sparks under the warmest doorway in the map, which is the whole palette
  // argument of this world in one eave
  for (let i = 0; i < 6; i++)
    solid.push(part(new THREE.ConeGeometry(0.11, rnd(0.5, 1.0), 5), ICE,
      W * 0.54, y2 + H2 - 0.35, -D * 0.42 + i * D * 0.168, Math.PI, 0, 0));
  // twin chimneys, both smoking
  chimney(solid, -W * 0.28, ridge + 1.2, 0, 1.5);
  chimney(solid, W * 0.18, ridge + 0.6, 0, 1.35);
  const g = lit(solid, glow);
  // named so match beats and the newsroom can find the landmark, the same
  // way nightmarket names its drum tower
  g.name = 'lodge';
  return g;
}

/** The bell tower: the village centrepiece for the square by the rink. A
 *  clock that is still running and a bell nobody has rung since the school
 *  closure was announced — the closure IS the announcement. */
export function makeBellTower(): THREE.Group {
  const solid: G[] = [], glow: G[] = [];
  const H = 7.2;
  solid.push(part(new THREE.BoxGeometry(3.4, 1.1, 3.4), STONE_D, 0, 0.55, 0));
  solid.push(part(new THREE.BoxGeometry(3.7, 0.24, 3.7), SNOW, 0, 1.16, 0));
  solid.push(part(new THREE.BoxGeometry(2.4, H, 2.4), TIMBER, 0, 1.1 + H / 2, 0));
  for (const sx of [-1, 1]) for (const sz of [-1, 1])
    solid.push(part(new THREE.BoxGeometry(0.28, H, 0.28), TIMBER_D, sx * 1.2, 1.1 + H / 2, sz * 1.2));
  // the clock face, on +X where the village looks from: SNOW disc, CHAR
  // hands stopped at twenty to seven — the minute the phones started
  solid.push(part(new THREE.CylinderGeometry(0.72, 0.72, 0.12, 14), SNOW, 1.26, 1.1 + H * 0.72, 0, 0, 0, Math.PI / 2));
  solid.push(part(new THREE.BoxGeometry(0.14, 0.09, 0.52), CHAR, 1.34, 1.1 + H * 0.72, -0.2, 0, 0.5, 0));
  solid.push(part(new THREE.BoxGeometry(0.14, 0.09, 0.34), CHAR, 1.34, 1.1 + H * 0.72 + 0.14, 0.08, 0, -0.6, 0));
  // one warm slit low in the shaft: the keeper's stair is heated too
  glow.push(part(new THREE.BoxGeometry(0.12, 0.7, 0.4), G_WINDOW, 1.22, 2.6, 0));
  // the open belfry and the bell
  const by = 1.1 + H;
  solid.push(part(new THREE.BoxGeometry(2.9, 0.3, 2.9), TIMBER_D, 0, by + 0.15, 0));
  for (const sx of [-1, 1]) for (const sz of [-1, 1])
    solid.push(part(new THREE.BoxGeometry(0.24, 1.7, 0.24), TIMBER, sx * 1.25, by + 1.15, sz * 1.25));
  solid.push(part(new THREE.CylinderGeometry(0.3, 0.62, 0.8, 9), GOLD, 0, by + 1.2, 0));
  solid.push(part(new THREE.SphereGeometry(0.32, 8, 6), GOLD, 0, by + 1.58, 0));
  solid.push(part(new THREE.SphereGeometry(0.12, 6, 5), CHAR, 0, by + 0.72, 0));
  // pyramid roof — the rotate-45° trick is safe here because the scale is
  // uniform — with its own cap cone and a finial
  solid.push(part(new THREE.ConeGeometry(2.5, 2.0, 4), SLATE, 0, by + 3.0, 0, 0, Math.PI / 4, 0));
  solid.push(part(new THREE.ConeGeometry(2.1, 1.5, 4), SNOW, 0, by + 3.6, 0, 0, Math.PI / 4, 0));
  solid.push(part(new THREE.CylinderGeometry(0.08, 0.08, 1.0, 6), CHAR, 0, by + 4.6, 0));
  solid.push(part(new THREE.SphereGeometry(0.16, 6, 5), GOLD, 0, by + 5.1, 0));
  return lit(solid, glow);
}

// ── the woods and the weather ─────────────────────────────────────────────
/** A pine under snow load. Cone tiers, and each tier carries its own white
 *  rim ON TOP — from the play camera a pine is a stack of concentric rings,
 *  green edge under white centre, which is the single cheapest "it snowed
 *  overnight" read in the kit. The green survives only at each tier's skirt,
 *  where the slope is too steep to hold powder, and that sliver of saturated
 *  PINE against the white is doing accent duty for the whole pinewood. */
export function makePine(h = rnd(4.5, 8.5)): THREE.Object3D {
  const p: G[] = [];
  p.push(part(new THREE.CylinderGeometry(h * 0.03, h * 0.045, h * 0.24, 6), BARK, 0, h * 0.1, 0));
  const tiers = h > 6.5 ? 4 : 3;
  for (let i = 0; i < tiers; i++) {
    const t = i / tiers;
    const r = h * 0.26 * (1 - t * 0.62);
    const th = h * 0.34;
    const y = h * 0.16 + t * h * 0.62;
    p.push(part(new THREE.ConeGeometry(r, th, 8), i % 2 ? PINE : PINE_D, 0, y + th * 0.4, 0));
    // the snow: a shallower, slightly narrower cone seated on the tier —
    // narrower, so the green skirt shows below the white
    p.push(part(new THREE.ConeGeometry(r * 0.8, th * 0.52, 8), SNOW, 0, y + th * 0.62, 0));
  }
  // the topmost snow, a blob rather than a point — points don't hold snow,
  // but every pine in a photograph of a snowfall has one anyway
  p.push(part(new THREE.SphereGeometry(h * 0.06, 6, 5), SNOW, 0, h * 1.0, 0, 0, 0, 0, 1, 0.8, 1));
  return noFront(mergedProp(p));
}

/** A snowdrift: the deep-snow mound the void carves through, so it is the
 *  most numerous prop in the world and the cheapest — four spheres. Smooth
 *  shading, because a faceted drift reads as a rock, and the one thing a
 *  drift must never do is look like it would hurt to slide into.
 *  The BLUE SHADOW RULE, made literal: the drift carries its own shadowed
 *  skirt as a SNOW_D sphere tucked on the -X side, which is downlight from
 *  the rig's sun. A pure-white mound on pure-white ground is invisible; the
 *  blue underside is the entire silhouette. */
export function makeDrift(): THREE.Object3D {
  const p: G[] = [];
  const k = rnd(0.8, 1.8);
  p.push(part(new THREE.SphereGeometry(1.1 * k, 8, 6), SNOW, 0, 0.28 * k, 0, 0, rnd(0, 3), 0, 1.4, 0.55, 1));
  p.push(part(new THREE.SphereGeometry(0.7 * k, 7, 5), SNOW, 0.8 * k, 0.2 * k, 0.5 * k, 0, rnd(0, 3), 0, 1.2, 0.5, 1));
  p.push(part(new THREE.SphereGeometry(0.55 * k, 7, 5), SNOW, -0.5 * k, 0.34 * k, -0.6 * k, 0, rnd(0, 3), 0, 1, 0.6, 1));
  p.push(part(new THREE.SphereGeometry(0.95 * k, 8, 6), SNOW_D, -0.55 * k, 0.16 * k, 0.1 * k, 0, rnd(0, 3), 0, 1.35, 0.42, 1));
  return noFront(mergedProp(p, PROP_SMOOTH_MAT));
}

// ── the villagers' handiwork ──────────────────────────────────────────────
/** A snowman, regulation pattern: three spheres, coal, carrot, twig arms,
 *  and somebody's good scarf. Built at speed by people who were meant to be
 *  in school, and the workmanship shows — the tiers never stack quite true.
 *  The scarf and hat are the accent system again: every snowman is a small
 *  red-or-teal flag planted on a white field. */
export function makeSnowman(): THREE.Group {
  const solid: G[] = [], glow: G[] = [];
  const k = rnd(0.8, 1.15);
  const wob = rnd(-0.08, 0.08);
  solid.push(part(new THREE.SphereGeometry(0.62 * k, 9, 7), SNOW, 0, 0.5 * k, 0, 0, 0, 0, 1, 0.86, 1));
  solid.push(part(new THREE.SphereGeometry(0.45 * k, 8, 6), SNOW, wob * k, 1.28 * k, 0.04 * k));
  solid.push(part(new THREE.SphereGeometry(0.32 * k, 8, 6), SNOW, wob * 2 * k, 1.88 * k, 0.02 * k));
  // face, on +X: two coal eyes, a carrot doing its best
  for (const sz of [-1, 1])
    solid.push(part(new THREE.SphereGeometry(0.045 * k, 5, 4), CHAR, (wob * 2 + 0.27) * k, 1.96 * k, sz * 0.11 * k));
  solid.push(part(new THREE.ConeGeometry(0.06 * k, 0.34 * k, 6), ORANGE, (wob * 2 + 0.42) * k, 1.86 * k, 0, 0, 0, -Math.PI / 2));
  // coal buttons down the middle tier
  for (let i = 0; i < 3; i++)
    solid.push(part(new THREE.SphereGeometry(0.05 * k, 5, 4), CHAR, (wob + 0.42) * k, (1.14 + i * 0.16) * k, 0));
  // twig arms, one raised — mid-wave when the hole arrived
  solid.push(part(new THREE.CylinderGeometry(0.03, 0.045, 0.9 * k, 5), BARK, 0, 1.35 * k, 0.62 * k, 1.2, 0, 0.5));
  solid.push(part(new THREE.CylinderGeometry(0.03, 0.045, 0.9 * k, 5), BARK, 0, 1.5 * k, -0.6 * k, -1.9, 0, 0.4));
  // the scarf: a flattened torus and a tail flying sideways
  const knit = pick([RED, TEAL, GOLD]);
  solid.push(part(new THREE.TorusGeometry(0.33 * k, 0.09 * k, 5, 10), knit, wob * k, 1.6 * k, 0.02 * k, Math.PI / 2, 0, 0));
  solid.push(part(new THREE.BoxGeometry(0.16 * k, 0.5 * k, 0.06 * k), knit, (wob + 0.2) * k, 1.4 * k, 0.26 * k, 0, 0, -0.3));
  // hat: half wear a coal-black topper, half a bobble in the other accent
  if (Math.random() < 0.5) {
    // ── THE BRIM OVERHUNG THE FACE IT SAT ABOVE ─────────────────────────────
    // TEAM STATIC filed this as "the face is 100% occluded by a brimless black
    // cylinder". Two of those three words are wrong — there IS a brim, and the
    // face is not always hidden — but the shape of the complaint is right.
    //
    // Measured over 36 yaws: a topper snowman's eyes reach the camera in 54% of
    // drops at spawn pitch and 49% at VOID TITAN, against 68% for the bobble
    // variant. So the hat costs about fourteen points and the rest is the yaw.
    // The mechanism is one number: the brim was r=0.36 over a head of r=0.32,
    // so it overhung the skull by 0.04 and the eyes at x=0.27 needed 0.09 of
    // sightline clearance — more than a 65-degree camera can give across the
    // 0.18 between eye and brim. At 0.30 it needs 0.03 and clears at every
    // pitch the game has.
    //
    // Deliberately NOT the fix that was proposed to me, which deleted both hat
    // branches. The skeptic measured that: it would cut accent pixels 79% on
    // half the population, because the bobble variant is not broken. One
    // number moves; the character keeps its hat.
    solid.push(part(new THREE.CylinderGeometry(0.30 * k, 0.30 * k, 0.05 * k, 10), CHAR, wob * 2 * k, 2.14 * k, 0.02 * k));
    solid.push(part(new THREE.CylinderGeometry(0.22 * k, 0.24 * k, 0.34 * k, 9), CHAR, wob * 2 * k, 2.32 * k, 0.02 * k));
  } else {
    const wool = pick([RED, TEAL, GOLD].filter(c => c !== knit));
    solid.push(part(new THREE.SphereGeometry(0.3 * k, 8, 6), wool, wob * 2 * k, 2.1 * k, 0.02 * k, 0, 0, 0, 1, 0.75, 1));
    solid.push(part(new THREE.SphereGeometry(0.1 * k, 6, 5), SNOW, wob * 2 * k, 2.34 * k, 0.02 * k));
  }
  return lit(solid, glow);
}

/** A kid-built snowball pyramid: ammunition, stockpiled with real project
 *  management. Sub-1 radius on purpose — this is hatchling food, the same
 *  slot nightmarket's floating lanterns fill, scattered wherever children
 *  would have staged their positions (behind fences, beside doors). */
export function makeSnowballStack(): THREE.Object3D {
  const p: G[] = [];
  const k = rnd(0.7, 1.0);
  const r = 0.26 * k;
  // 3-and-1: a triangle base and one on top, each ball slightly its own size
  // because they were made by hand in a hurry
  const base: [number, number][] = [[0.3, 0], [-0.15, 0.26], [-0.15, -0.26]];
  for (const [bx, bz] of base)
    p.push(part(new THREE.SphereGeometry(r * rnd(0.9, 1.1), 7, 5), SNOW, bx * k, r, bz * k));
  p.push(part(new THREE.SphereGeometry(r * 0.95, 7, 5), SNOW, 0, r * 2.5, 0));
  // one loose ball that rolled, in shadow colour where it sits in the pile's lee
  if (Math.random() < 0.6)
    p.push(part(new THREE.SphereGeometry(r * 0.8, 6, 5), SNOW_D, -0.55 * k, r * 0.8, 0.4 * k));
  return noFront(mergedProp(p, PROP_SMOOTH_MAT));
}

/** The red runner sled, parked nose-up the way sleds are abandoned. The
 *  reddest object in the kit and there should be dozens: the sled is to
 *  POWDER PASS what the paper lantern is to LANTERN NIGHT — the repeated
 *  saturated note that keeps the white from winning. */
export function makeSled(): THREE.Object3D {
  const p: G[] = [];
  const k = rnd(0.85, 1.15);
  // three deck slats
  for (let i = 0; i < 3; i++)
    p.push(part(new THREE.BoxGeometry(1.7 * k, 0.07, 0.22 * k), i === 1 ? RED : RED_D, 0, 0.36 * k, (i - 1) * 0.26 * k));
  // steel runners, up-curled at the nose with a stubby rotated tip
  for (const sz of [-1, 1]) {
    p.push(part(new THREE.BoxGeometry(1.8 * k, 0.3 * k, 0.06), STEEL, 0, 0.15 * k, sz * 0.34 * k));
    p.push(part(new THREE.BoxGeometry(0.5 * k, 0.08 * k, 0.06), STEEL, 0.95 * k, 0.34 * k, sz * 0.34 * k, 0, 0, 0.7));
  }
  // cross struts and the tow rope, dropped where it was let go
  for (const sx of [-1, 1])
    p.push(part(new THREE.BoxGeometry(0.09 * k, 0.09 * k, 0.72 * k), TIMBER_D, sx * 0.6 * k, 0.28 * k, 0));
  p.push(part(new THREE.CylinderGeometry(0.025, 0.025, 0.9 * k, 4), CUT, 1.45 * k, 0.05 * k, 0.2 * k, 0, 0.7, Math.PI / 2));
  return mergedProp(p);
}

/** The ski rack outside every chalet: an A-frame with the household's skis
 *  leaned into it, each pair its own lacquer colour. Nobody is skiing today —
 *  the lifts are shut, which is the sign's department — so the rack is full,
 *  and a full rack is six vertical accent stripes for the price of one prop. */
export function makeSkiRack(): THREE.Object3D {
  const p: G[] = [];
  const L = rnd(2.2, 3.0);
  // the A-frames and ridge bar
  for (const sx of [-1, 1]) for (const s of [-1, 1])
    p.push(part(new THREE.BoxGeometry(0.11, 2.0, 0.11), BARK, sx * L * 0.5, 0.95, s * 0.28, s * 0.3, 0, 0));
  p.push(part(new THREE.CylinderGeometry(0.06, 0.06, L * 1.1, 6), TIMBER_D, 0, 1.72, 0, 0, 0, Math.PI / 2));
  p.push(part(new THREE.BoxGeometry(L * 1.12, 0.1, 0.16), SNOW, 0, 1.84, 0));
  // the skis: 4-6, alternating sides of the bar, tips up
  const n = 4 + ((Math.random() * 3) | 0);
  for (let i = 0; i < n; i++) {
    const s = i % 2 ? 1 : -1;
    const x = (i / (n - 1) - 0.5) * L * 0.85;
    const col = pick([RED, TEAL, GOLD, PINE]);
    p.push(part(new THREE.BoxGeometry(0.16, 2.3, 0.05), col, x, 1.1, s * 0.34, s * 0.28, 0, rnd(-0.05, 0.05)));
    p.push(part(new THREE.BoxGeometry(0.16, 0.28, 0.05), col, x, 2.28, s * 0.02, s * -0.5, 0, 0));
  }
  // one pair of poles, because there is always one pair of poles
  for (const s of [-1, 1]) {
    p.push(part(new THREE.CylinderGeometry(0.03, 0.03, 1.5, 5), STEEL, L * 0.55 + s * 0.1, 0.75, s * 0.2, s * 0.15, 0, 0.1));
    p.push(part(new THREE.TorusGeometry(0.09, 0.025, 4, 8), CHAR, L * 0.55 + s * 0.12, 0.14, s * 0.22, Math.PI / 2, 0, 0));
  }
  return mergedProp(p);
}

// ── the chairlift ─────────────────────────────────────────────────────────
/** A lift pylon. The integrator runs the line along X — the crossarm spans Z,
 *  perpendicular to travel — and hangs makeLiftChair() between pylons. Steel,
 *  and gloss-registered as the shiniest solid in the valley: a lift line
 *  reads from anywhere because it is the one thing the snow can't dull.
 *  The LIFTS CLOSED sign at the base is the register of this world in four
 *  words; the chairs continue to circulate above it regardless, because the
 *  mechanism was never told. */
export function makeLiftPylon(): THREE.Group {
  const solid: G[] = [], glow: G[] = [];
  const H = 10;
  // concrete footing, snowed
  solid.push(part(new THREE.BoxGeometry(2.4, 1.1, 2.4), STONE_D, 0, 0.55, 0));
  solid.push(part(new THREE.BoxGeometry(2.6, 0.26, 2.6), SNOW, 0, 1.2, 0));
  // the column with its statutory hazard band
  solid.push(part(new THREE.CylinderGeometry(0.4, 0.56, H, 9), STEEL, 0, 1.1 + H / 2, 0));
  solid.push(part(new THREE.CylinderGeometry(0.58, 0.6, 0.6, 9), RED, 0, 1.7, 0));
  // maintenance ladder up the -X side, rungs only — the stringers would
  // vanish at this distance and the rungs alone read as "climbable"
  for (let i = 0; i < 6; i++)
    solid.push(part(new THREE.BoxGeometry(0.06, 0.06, 0.5), CHAR, -0.55, 2.2 + i * 1.4, 0));
  // crossarm, its snow cap, and the sheave stacks hanging at each end
  const ay = 1.1 + H;
  solid.push(part(new THREE.BoxGeometry(0.6, 0.5, 7.4), STEEL, 0, ay, 0));
  solid.push(part(new THREE.BoxGeometry(0.66, 0.22, 7.6), SNOW, 0, ay + 0.36, 0));
  for (const sz of [-1, 1]) for (let i = 0; i < 3; i++)
    solid.push(part(new THREE.CylinderGeometry(0.3, 0.3, 0.16, 10), CHAR,
      -0.5 + i * 0.5, ay - 0.5, sz * 3.4, Math.PI / 2, 0, 0));
  // the notice, bolted at reading height: LIFTS CLOSED. The sign is dark so
  // its small warm lamp — still dutifully on — is what the eye finds.
  solid.push(part(new THREE.BoxGeometry(0.1, 0.7, 1.1), CHAR, 0.62, 2.6, 0));
  glow.push(part(new THREE.BoxGeometry(0.08, 0.12, 0.9), G_WINDOW, 0.7, 2.82, 0));
  return lit(solid, glow);
}

/** A two-seat chair for the line. Built hanging: the cable grip is the top
 *  of the prop at y ≈ 2.9, the footrest is the bottom at y ≈ 0.55, so the
 *  integrator parents it to a rail point and sinks it 2.9. Both seats carry
 *  a stripe of snow — these chairs have been circulating empty since the
 *  first flake, and the kit's flat-things-carry-white rule applies to moving
 *  furniture too. The chair faces +X, the direction of travel. */
export function makeLiftChair(): THREE.Object3D {
  const p: G[] = [];
  // grip and hanger
  p.push(part(new THREE.BoxGeometry(0.34, 0.22, 0.22), CHAR, 0, 2.9, 0));
  p.push(part(new THREE.BoxGeometry(0.1, 1.3, 0.1), STEEL, -0.06, 2.2, 0, 0, 0, 0.08));
  p.push(part(new THREE.BoxGeometry(0.1, 0.7, 0.1), STEEL, -0.16, 1.35, 0, 0, 0, 0.18));
  // bench, back, and the side frames
  p.push(part(new THREE.BoxGeometry(0.56, 0.14, 1.7), RED, 0.05, 1.0, 0));
  p.push(part(new THREE.BoxGeometry(0.14, 0.72, 1.7), RED_D, -0.3, 1.42, 0, 0, 0, 0.16));
  for (const sz of [-1, 1])
    p.push(part(new THREE.BoxGeometry(0.5, 0.1, 0.08), STEEL, 0.02, 1.12, sz * 0.85));
  // safety bar down (nobody aboard to lift it) and the footrest
  p.push(part(new THREE.BoxGeometry(0.07, 0.07, 1.66), STEEL, 0.34, 1.5, 0));
  p.push(part(new THREE.BoxGeometry(0.3, 0.06, 1.5), STEEL, 0.3, 0.55, 0));
  // the snow stripe on the seat
  p.push(part(new THREE.BoxGeometry(0.5, 0.1, 1.6), SNOW, 0.05, 1.12, 0));
  return mergedProp(p);
}

// ── the council's response ────────────────────────────────────────────────
/** The gritter: the municipality's entire winter fleet, deployed. A chunky
 *  orange lorry with an angled plough, a full hopper, and its beacon turning
 *  — the integrator drives it up and down the valley road, gamely clearing a
 *  route that will shortly be a hole. The cab windscreen glows: there is a
 *  driver in there with a flask, on double time, entirely unbothered. This
 *  is the comic register of the world in one mover, so it is built chunky
 *  and cheerful — nothing about it may read as menacing from any angle. */
export function makeGritter(): THREE.Group {
  const solid: G[] = [], glow: G[] = [];
  // chassis and six wheels
  solid.push(part(new THREE.BoxGeometry(5.6, 0.5, 2.2), CHAR, -0.2, 0.95, 0));
  for (const x of [1.5, -0.7, -1.8]) for (const sz of [-1, 1])
    solid.push(part(new THREE.CylinderGeometry(0.55, 0.55, 0.4, 10), CHAR, x, 0.55, sz * 1.05, Math.PI / 2, 0, 0));
  // cab at the nose, windscreen lit
  solid.push(part(new THREE.BoxGeometry(1.7, 1.6, 2.1), ORANGE, 1.7, 2.0, 0));
  solid.push(part(new THREE.BoxGeometry(1.74, 0.4, 2.14), ORANGE_D, 1.7, 1.35, 0));
  glow.push(part(new THREE.BoxGeometry(0.12, 0.8, 1.6), G_WINDOW, 2.58, 2.2, 0));
  for (const sz of [-1, 1])
    solid.push(part(new THREE.BoxGeometry(1.0, 0.7, 0.08), SLATE_D, 1.75, 2.25, sz * 1.06));
  // the beacon, and the snow the cab roof has collected around it
  solid.push(part(new THREE.BoxGeometry(1.6, 0.14, 2.0), SNOW, 1.7, 2.87, 0));
  solid.push(part(new THREE.CylinderGeometry(0.12, 0.14, 0.12, 8), CHAR, 1.7, 3.0, 0));
  glow.push(part(new THREE.CylinderGeometry(0.13, 0.15, 0.22, 8), G_BEACON, 1.7, 3.17, 0));
  // the hopper: full of grit, capped with — inevitably — snow
  solid.push(part(new THREE.BoxGeometry(3.0, 1.5, 2.0), ORANGE, -1.1, 2.05, 0));
  solid.push(part(new THREE.BoxGeometry(3.0, 0.5, 1.4), ORANGE_D, -1.1, 1.2, 0));
  solid.push(part(new THREE.BoxGeometry(2.8, 0.22, 1.8), CUT, -1.1, 2.85, 0));
  solid.push(part(new THREE.BoxGeometry(2.9, 0.18, 1.9), SNOW, -1.1, 3.0, 0));
  // THE PLOUGH: five chevron slats, red and white alternating, tipped back
  // and swept to one side the way a working blade actually runs
  for (let i = 0; i < 5; i++)
    solid.push(part(new THREE.BoxGeometry(0.22, 1.1, 0.56), i % 2 ? SNOW : RED,
      3.1 + (i - 2) * 0.09, 0.8, (i - 2) * 0.52, 0, 0.16, -0.3));
  // the bow-wave of snow the blade is turning over, frozen mid-curl
  solid.push(part(new THREE.SphereGeometry(0.7, 7, 5), SNOW, 3.5, 0.4, -1.0, 0, 0, 0, 1.3, 0.7, 1));
  solid.push(part(new THREE.SphereGeometry(0.5, 6, 5), SNOW_D, 3.3, 0.25, -1.5, 0, 0, 0, 1.2, 0.6, 1));
  // the spreader disc at the rear, mid-fling
  solid.push(part(new THREE.CylinderGeometry(0.5, 0.5, 0.12, 10), CHAR, -2.8, 0.7, 0));
  for (let i = 0; i < 4; i++)
    solid.push(part(new THREE.BoxGeometry(0.1, 0.1, 0.1), CUT, -3.2 - rnd(0, 0.5), rnd(0.3, 0.9), rnd(-0.8, 0.8)));
  // exhaust stack behind the cab, running
  solid.push(part(new THREE.CylinderGeometry(0.08, 0.08, 1.2, 6), STEEL, 0.8, 2.6, 0.9));
  solid.push(part(new THREE.SphereGeometry(0.24, 6, 5), SMOKE, 0.85, 3.4, 0.95, 0, 0, 0, 1, 0.75, 1));
  return lit(solid, glow);
}

/** The piste signpost, still pointing the correct way down every run. The
 *  boards carry the real grading colours — green, blue, red, black — which
 *  happens to be this kit's accent system wearing an official hat. The runs
 *  are all closed; the sign has not been consulted about the hole. */
export function makeSignpost(): THREE.Object3D {
  const p: G[] = [];
  const h = rnd(2.6, 3.2);
  p.push(part(new THREE.CylinderGeometry(0.09, 0.12, h, 7), TIMBER_D, 0, h / 2, 0));
  p.push(part(new THREE.SphereGeometry(0.14, 6, 5), SNOW, 0, h + 0.04, 0, 0, 0, 0, 1, 0.6, 1));
  const grades = [PINE, TEAL, RED, CHAR];
  const n = 3 + ((Math.random() * 2) | 0);
  for (let i = 0; i < n; i++) {
    const y = h - 0.35 - i * 0.32;
    const ry = rnd(0, Math.PI * 2);
    // board plus a pointed tip: the tip is a squashed 4-cone lying on its
    // side, the same diamond-silhouette trick as the roof gables
    p.push(part(new THREE.BoxGeometry(0.9, 0.24, 0.07), grades[i % 4], Math.cos(ry) * 0.45, y, -Math.sin(ry) * 0.45, 0, ry, 0));
    p.push(part(new THREE.ConeGeometry(0.13, 0.24, 4), grades[i % 4],
      Math.cos(ry) * 0.98, y, -Math.sin(ry) * 0.98, 0, ry, -Math.PI / 2));
  }
  return mergedProp(p);
}

// ── the village floor ─────────────────────────────────────────────────────
/** A log pile against a wall: the winter's fuel, stacked 3-2-1 with the sawn
 *  ends facing +X — CUT is the only warm wood colour in the kit and the pile
 *  is where it lives. Snow on top, obviously; the rule is the rule. */
export function makeLogPile(): THREE.Object3D {
  const p: G[] = [];
  const L = rnd(1.5, 2.1);
  const rows: [number, number[]][] = [[0.3, [-0.62, 0, 0.62]], [0.82, [-0.31, 0.31]], [1.32, [0]]];
  for (const [y, zs] of rows) for (const z of zs) {
    p.push(part(new THREE.CylinderGeometry(0.3, 0.3, L, 8), BARK, 0, y, z, 0, 0, Math.PI / 2));
    p.push(part(new THREE.CylinderGeometry(0.27, 0.27, 0.05, 8), CUT, L / 2, y, z, 0, 0, Math.PI / 2));
  }
  p.push(part(new THREE.BoxGeometry(L * 0.9, 0.16, 1.1), SNOW, 0, 1.68, 0));
  return noFront(mergedProp(p));
}

/** A run of post-and-rail fence. `len` is along X. Every post leans its own
 *  way (frost heave gets them all eventually) and the top rail carries a
 *  ridge of snow the full length — a fence in this world is two brown lines
 *  under one white one, and a row of them is what makes a lane a lane. */
export function makeFence(len = 6): THREE.Object3D {
  const p: G[] = [];
  const n = Math.max(2, Math.round(len / 1.6) + 1);
  for (let i = 0; i < n; i++) {
    const x = -len / 2 + (len / (n - 1)) * i;
    const lean = rnd(-0.08, 0.08);
    p.push(part(new THREE.BoxGeometry(0.16, 1.15, 0.16), BARK, x, 0.55, 0, lean, 0, lean));
    p.push(part(new THREE.BoxGeometry(0.2, 0.1, 0.2), SNOW, x + lean, 1.16, 0));
  }
  p.push(part(new THREE.BoxGeometry(len, 0.1, 0.12), TIMBER_D, 0, 1.0, 0));
  p.push(part(new THREE.BoxGeometry(len, 0.1, 0.12), TIMBER_D, 0, 0.55, 0));
  p.push(part(new THREE.BoxGeometry(len, 0.09, 0.2), SNOW, 0, 1.1, 0));
  return mergedProp(p);
}

/** The village rink: a swept ice disc inside a shovelled snow bank, for the
 *  square. Decorative and small — the LAKE is the arena; this is the rink
 *  the village made for the toddlers, complete with a bench for the adults
 *  who are officially supervising. The ice runs the full 0.8 gloss, and at
 *  this diameter the sun streak crossing it is the brightest solid highlight
 *  in the village — one white coin among the white, which oddly enough is
 *  what makes it read as DIFFERENT white. */
export function makeRink(): THREE.Group {
  const solid: G[] = [], glow: G[] = [];
  const R = rnd(4.0, 5.0);
  solid.push(part(new THREE.CylinderGeometry(R, R, 0.14, 22), ICE, 0, 0.07, 0));
  solid.push(part(new THREE.CylinderGeometry(R * 0.96, R * 0.96, 0.15, 22), ICE_D, 0, 0.05, 0));
  // the shovelled bank: a squashed torus, snow-white above, and a red line
  // marker ring on the ice because somebody owns a paint kit
  solid.push(part(new THREE.TorusGeometry(R * 1.06, 0.55, 5, 16), SNOW, 0, 0.24, 0, Math.PI / 2, 0, 0, 1, 1, 0.6));
  solid.push(part(new THREE.TorusGeometry(R * 0.4, 0.05, 4, 14), RED, 0, 0.15, 0, Math.PI / 2, 0, 0, 1, 1, 0.5));
  // the supervision bench, facing the ice
  solid.push(part(new THREE.BoxGeometry(0.5, 0.12, 2.2), TIMBER, R * 1.35, 0.55, 0));
  for (const sz of [-1, 1])
    solid.push(part(new THREE.BoxGeometry(0.4, 0.55, 0.18), TIMBER_D, R * 1.35, 0.28, sz * 0.9));
  solid.push(part(new THREE.BoxGeometry(0.5, 0.09, 2.2), SNOW, R * 1.35, 0.66, 0));
  return lit(solid, glow);
}

// The kit deliberately has no makeLamp: island.ts already owns the street
// lamp, and one lamp design across worlds is how the game stays one game.
