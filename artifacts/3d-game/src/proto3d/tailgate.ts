// ══════════════════════════════════════════════════════════════════════════
//  GAME DAY — the tailgate prop kit
//  A fall Saturday in a small college town: the parking lot is nose-to-tail
//  with pickups, canopies and grills, the gate plaza is queueing, and the
//  stadium sits at the north end waiting to be the last thing eaten.
//
//  House rules, same as island.ts and luxe.ts:
//    • every prop is ONE merged mesh sharing PROP_SHARED_MAT (one draw call)
//    • no per-prop materials, no textures, flat shading, chunky silhouettes
//    • y = 0 is the ground plane, the prop's nose/front faces +X
//    • keep each prop under ~140 parts
//
//  Two teams exist and they are WALLPAPER. Crimson runs about 4:1 over
//  everything else so the place reads as one town in one mood, not as a
//  fixture with sides — see the county-fair note in mainstreet.ts for what
//  happens when signage starts picking a winner.
// ══════════════════════════════════════════════════════════════════════════
import * as THREE from 'three';
import { part, mergedProp, PROP_SMOOTH_MAT } from './island';

type G = THREE.BufferGeometry;

// ── palette ───────────────────────────────────────────────────────────────
// Autumn: warm, saturated, low sun. Deliberately warmer than Maple Isle's
// midday green and nowhere near Pirate Bay's white sand.
const CRIM = 0xc4342f;       // HOME_A — the dominant colour of the whole world
const CRIM_D = 0x922520;     // shadowed crimson, undersides and trim
const GOLD = 0xf0b429;       // HOME_B
const GOLD_L = 0xffd45e;     // lit gold, lamps and glowing panels
const TEAL = 0x2aa9a0;       // AWAY — used sparingly, roughly one part in five
const WHITE = 0xf6f2e8;      // markings, canopies, paint
const CREAM = 0xece0c8;      // second white, for banding
const CONC = 0xb9b4a8;       // concrete
const CONC_D = 0x8d887d;     // shadowed concrete
const ALU = 0xc8ccd2;        // aluminium: bleachers, masts, awning frames
const STEEL = 0x7d848c;      // darker metal: legs, poles, frames
const CHAR = 0x2c2a33;       // near-black: tyres, screens, grills
const ASPHALT = 0x4a4a52;    // the car park itself
const TURF = 0x3f8f4e;       // pitch green
const GRASS = 0x5aa35e;      // lawn, lighter than the pitch
const BRICK = 0xa8553f;      // collegiate brick
const BRICK_D = 0x8a4030;
const TIMBER = 0xb0834e;     // porches, trestles, boards
const TIMBER_D = 0x7d5a3a;
const NAVY = 0x2f4a6e;       // coolers, cushions, denim
const ORANGE = 0xe8752a;     // cones, autumn leaves, hot food
const BLUE = 0x3f7ac4;       // the other cooler
const MEAT = 0xc2603f;       // sausages, chilli, the inside of a sub
const BUN = 0xe0b070;        // bread
const SMOKE = 0xd7d3cc;

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T>(a: T[]): T => a[(Math.random() * a.length) | 0];
const finish = (parts: G[]): THREE.Group => { const g = new THREE.Group(); g.add(mergedProp(parts)); return g; };
// Soft/inflatable/organic props only. Flat shading on a round soft object is
// the exact bug that was just fixed across the game's foliage.
const finishSoft = (parts: G[]): THREE.Group => {
  const g = new THREE.Group(); g.add(mergedProp(parts, PROP_SMOOTH_MAT)); return g;
};

// ── shared geometry helpers ───────────────────────────────────────────────

// A guy line / bunting cord: one thin cylinder spanning two arbitrary points.
// part() applies rotateX then rotateY then rotateZ, so with rx+rz alone a
// +Y cylinder ends up along (-cos(rx)sin(rz), cos(rx)cos(rz), sin(rx)).
function rope(a: [number, number, number], b: [number, number, number], col: number, r = 0.05, seg = 4): G {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
  const len = Math.hypot(dx, dy, dz) || 0.001;
  const rx = Math.asin(Math.max(-1, Math.min(1, dz / len)));
  const rz = Math.atan2(-dx / len, dy / len);
  return part(new THREE.CylinderGeometry(r, r, len, seg), col,
    (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2, rx, 0, rz);
}

// A flag streaming toward −X (or +X with dir = 1), rippling as it goes.
function flagWave(out: G[], col: number, x: number, y: number, z: number,
                  len: number, h: number, n = 3, amp = 0.2, dir = -1) {
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    out.push(part(new THREE.BoxGeometry((len / n) * 1.12, h * (1 - 0.14 * t), 0.12), col,
      x + dir * t * len, y - h * 0.05 * t, z + Math.sin(t * 5.5) * amp));
  }
}

// A sagging string of triangular pennants between two points. The cone is
// pre-flattened and pre-flipped in geometry space because part() applies rz
// LAST, which would otherwise swing every pennant back upright.
function buntingRun(out: G[], cols: number[], ax: number, ay: number, az: number,
                    bx: number, by: number, bz: number, n = 7, sag = 0.45) {
  const bearing = -Math.atan2(bz - az, bx - ax);
  out.push(rope([ax, ay - sag * 0.42, az], [(ax + bx) / 2, ay + (by - ay) / 2 - sag, (az + bz) / 2], 0x3a3a42, 0.04));
  out.push(rope([(ax + bx) / 2, ay + (by - ay) / 2 - sag, (az + bz) / 2], [bx, by - sag * 0.42, bz], 0x3a3a42, 0.04));
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const tri = new THREE.ConeGeometry(0.2, 0.46, 3);
    tri.scale(1, 1, 0.14);
    tri.rotateZ(Math.PI);                                     // point downward
    out.push(part(tri, cols[i % cols.length], ax + (bx - ax) * t,
      ay + (by - ay) * t - Math.sin(t * Math.PI) * sag - 0.23, az + (bz - az) * t, 0, bearing));
  }
}

// A classical pediment: a triangular prism, apex up, its face in the YZ plane
// so it caps a front that looks down +X. Both rotations are baked into the
// geometry — part() applies rz last in WORLD space, which tips the apex over.
// Bottom sits halfSpan/2 below centre; apex halfSpan above it.
function pediment(halfSpan: number, depth: number): G {
  const g = new THREE.CylinderGeometry(halfSpan, halfSpan, depth, 3);
  g.rotateZ(Math.PI / 2);
  g.rotateX(-Math.PI / 2);
  return g;
}

// A folding camp chair. Four parts, because there are two of these on every
// truck in a lot that holds hundreds of trucks. Seat sits 0.62 off the deck.
function chairParts(out: G[], x: number, y: number, z: number, face: number, col: number) {
  const f = face;                                             // +1 faces +X
  out.push(part(new THREE.BoxGeometry(0.1, 0.62, 0.8), STEEL, x + f * 0.2, y + 0.32, z, 0, 0, f * 0.3));
  out.push(part(new THREE.BoxGeometry(0.1, 0.62, 0.8), STEEL, x - f * 0.2, y + 0.32, z, 0, 0, -f * 0.3));
  out.push(part(new THREE.BoxGeometry(0.8, 0.12, 0.82), col, x, y + 0.62, z));
  out.push(part(new THREE.BoxGeometry(0.13, 0.8, 0.8), col, x - f * 0.36, y + 1.0, z, 0, 0, f * 0.2));
}

// A cooler, the unit of currency of a car park. Body, lid, grab handle.
function coolerParts(out: G[], x: number, y: number, z: number, w: number, h: number, col: number) {
  out.push(part(new THREE.BoxGeometry(w, h, w * 0.68), col, x, y + h / 2, z));
  out.push(part(new THREE.BoxGeometry(w * 1.05, h * 0.24, w * 0.72), WHITE, x, y + h * 1.02, z));
  out.push(part(new THREE.BoxGeometry(w * 0.3, h * 0.1, w * 0.12), CHAR, x, y + h * 1.16, z));
}

// A stack of red cups, the single most photographed object in a car park.
function cupParts(out: G[], x: number, y: number, z: number, n = 3) {
  for (let i = 0; i < n; i++)
    out.push(part(new THREE.CylinderGeometry(0.11, 0.08, 0.2, 8), i % 3 === 1 ? WHITE : CRIM,
      x + Math.cos(i * 2.2) * 0.16, y + 0.1, z + Math.sin(i * 2.2) * 0.16));
}

// A road wheel: tyre plus hub, laid on its side. Two parts, called a lot.
function wheelParts(out: G[], x: number, y: number, z: number, r: number, w = 0.42) {
  out.push(part(new THREE.CylinderGeometry(r, r, w, 12), CHAR, x, y, z, Math.PI / 2));
  out.push(part(new THREE.CylinderGeometry(r * 0.5, r * 0.5, w * 1.1, 9), ALU, x, y, z, Math.PI / 2));
}

// ══ THE HERO ═════════════════════════════════════════════════════════════
/** THE STADIUM: an open bowl ~56 × 42 on plan, rim at 10, floodlights at 18.
 *  It is eaten last and it is the biggest meal in the game, so the whole
 *  parts budget goes here — 15 of 18 facets round the bowl carry three raked
 *  decks and a concourse wall, and the missing three are the open end. */
export function makeStadium(): THREE.Group {
  const p: G[] = [];
  const A = 28, B = 21;                      // outer ellipse semi-axes
  const N = 18;                              // facets round the bowl
  const step = (Math.PI * 2) / N;
  // the gap is centred on +X, which is the face the player approaches
  const openEnd = (i: number) => i === 0 || i === 1 || i === N - 1;

  // ── the field. A rectangle 22 × 12, sized so its corners clear the inner
  // edge of the lowest deck (0.5 of the ellipse) rather than poking through it.
  p.push(part(new THREE.BoxGeometry(22, 0.12, 12), TURF, 0, 0.06, 0));
  for (const ex of [-1, 1]) p.push(part(new THREE.BoxGeometry(3.0, 0.06, 12), CRIM, ex * 9.5, 0.15, 0));
  for (let i = 0; i < 5; i++) p.push(part(new THREE.BoxGeometry(0.2, 0.06, 12), WHITE, -6.4 + i * 3.2, 0.15, 0));
  p.push(part(new THREE.CylinderGeometry(2.0, 2.0, 0.06, 14), GOLD, 0, 0.16, 0));

  // ── the seating decks. Each facet gets three slabs, pre-tilted about Z so
  // the outer edge lifts — that pre-rotation has to be baked in, because
  // part() applies rz after ry and would rake every deck toward world +X
  // instead of outward. [ scale in, scale out, deck centre y, rake ]
  const BANDS: [number, number, number, number][] = [
    [0.50, 0.66, 1.80, 0.36],
    [0.66, 0.81, 4.85, 0.44],
    [0.81, 0.95, 7.90, 0.50],
  ];
  for (let i = 0; i < N; i++) {
    if (openEnd(i)) continue;
    const t = i * step;
    for (const [sIn, sOut, dy, rake] of BANDS) {
      const s = (sIn + sOut) / 2;
      const cx = A * s * Math.cos(t), cz = B * s * Math.sin(t);
      const depth = (Math.hypot(cx, cz) / s) * (sOut - sIn) * 1.05;
      const e1x = A * s * Math.cos(t - step / 2), e1z = B * s * Math.sin(t - step / 2);
      const e2x = A * s * Math.cos(t + step / 2), e2z = B * s * Math.sin(t + step / 2);
      const chord = Math.hypot(e2x - e1x, e2z - e1z) * 1.14;   // overlap, so no gaps show
      const deck = new THREE.BoxGeometry(depth, 1.7, chord);
      deck.rotateZ(rake);
      // crimson with a scatter of gold and one teal block: a crowd, not a fixture
      const seat = i % 7 === 3 ? GOLD : i % 11 === 5 ? TEAL : CRIM;
      p.push(part(deck, seat, cx, dy, cz, 0, -Math.atan2(cz, cx)));
    }
    // ── the concourse wall, which is all anyone sees from outside
    const s = 0.97;
    const wx = A * s * Math.cos(t), wz = B * s * Math.sin(t);
    const w1x = A * s * Math.cos(t - step / 2), w1z = B * s * Math.sin(t - step / 2);
    const w2x = A * s * Math.cos(t + step / 2), w2z = B * s * Math.sin(t + step / 2);
    p.push(part(new THREE.BoxGeometry(1.5, 9.8, Math.hypot(w2x - w1x, w2z - w1z) * 1.16),
      i % 5 === 2 ? CRIM_D : CONC, wx, 4.9, wz, 0, -Math.atan2(wz, wx)));
  }

  // ── pennants round the rim. A single flattened three-sided cone reads as a
  // pennant from anywhere the camera actually goes, at two parts instead of five.
  for (let k = 0; k < 5; k++) {
    const t = Math.PI * (0.42 + k * 0.29);
    const fx = A * 0.98 * Math.cos(t), fz = B * 0.98 * Math.sin(t);
    p.push(part(new THREE.CylinderGeometry(0.13, 0.16, 4.4, 6), ALU, fx, 12.0, fz));
    p.push(part(new THREE.ConeGeometry(0.5, 2.2, 3), [CRIM, GOLD, WHITE, CRIM, TEAL][k],
      fx - 1.2, 13.5, fz, 0, 0, Math.PI / 2, 1, 1, 0.14));
  }

  // ── floodlight masts, set outside the wall on the four quarters
  for (const t of [Math.PI * 0.28, Math.PI * 0.72, Math.PI * 1.28, Math.PI * 1.72]) {
    const lx = A * 1.06 * Math.cos(t), lz = B * 1.06 * Math.sin(t);
    const r = Math.hypot(lx, lz), ux = lx / r, uz = lz / r, ry = -Math.atan2(lz, lx);
    p.push(part(new THREE.CylinderGeometry(0.34, 0.62, 16.4, 7), ALU, lx, 8.2, lz));
    p.push(part(new THREE.BoxGeometry(1.3, 0.5, 5.2), STEEL, lx, 16.6, lz, 0, ry));
    p.push(part(new THREE.BoxGeometry(1.0, 1.5, 4.8), CHAR, lx, 17.5, lz, 0, ry));
    p.push(part(new THREE.BoxGeometry(0.3, 1.2, 4.4), GOLD_L, lx - ux * 0.6, 17.5, lz - uz * 0.6, 0, ry));
  }

  // ── scoreboard at the closed end, on two legs
  const SB = -A * 1.05;
  for (const sz of [-4.4, 4.4]) p.push(part(new THREE.CylinderGeometry(0.4, 0.52, 8.0, 6), STEEL, SB, 4.0, sz));
  p.push(part(new THREE.BoxGeometry(1.6, 6.4, 12.0), CONC_D, SB, 11.2, 0));
  p.push(part(new THREE.BoxGeometry(0.3, 5.4, 11.0), GOLD, SB + 0.9, 11.2, 0));
  p.push(part(new THREE.BoxGeometry(0.2, 4.6, 10.2), CHAR, SB + 1.02, 11.2, 0));
  for (let i = 0; i < 4; i++)
    p.push(part(new THREE.BoxGeometry(0.1, 1.2, 1.6), i % 2 ? GOLD_L : CRIM, SB + 1.14, 12.1, -3.6 + i * 2.4));
  p.push(part(new THREE.BoxGeometry(1.8, 0.9, 12.6), CRIM, SB, 14.7, 0));
  p.push(part(new THREE.BoxGeometry(0.16, 0.6, 8.0), GOLD, SB + 0.95, 14.7, 0));

  // ── the open end: two pylons and a banner slung across them
  for (const sz of [-1, 1]) {
    const t = sz * 0.56;
    p.push(part(new THREE.BoxGeometry(2.2, 7.0, 2.8), CONC, A * 0.92 * Math.cos(t), 3.5, B * 0.92 * Math.sin(t)));
    p.push(part(new THREE.BoxGeometry(2.4, 0.6, 3.0), CRIM, A * 0.92 * Math.cos(t), 7.3, B * 0.92 * Math.sin(t)));
  }
  p.push(part(new THREE.BoxGeometry(2.0, 1.0, 22.0), CONC, A * 0.92, 8.1, 0));
  p.push(part(new THREE.BoxGeometry(0.3, 1.8, 15.0), CRIM, A * 0.92 + 1.1, 6.6, 0));
  p.push(part(new THREE.BoxGeometry(0.16, 0.5, 12.0), GOLD, A * 0.92 + 1.28, 6.6, 0));

  // ── goalposts, gooseneck out over the end line
  for (const gx of [-10, 10]) {
    const d = Math.sign(gx);
    p.push(part(new THREE.CylinderGeometry(0.16, 0.2, 2.6, 6), GOLD, gx, 1.3, 0));
    p.push(part(new THREE.CylinderGeometry(0.14, 0.14, 1.7, 6), GOLD, gx + d * 0.42, 2.75, 0, 0, 0, d * 0.5));
    p.push(part(new THREE.BoxGeometry(0.16, 0.16, 4.6), GOLD, gx + d * 0.9, 3.4, 0));
    for (const uz of [-2.3, 2.3]) p.push(part(new THREE.CylinderGeometry(0.13, 0.13, 3.6, 6), GOLD, gx + d * 0.9, 5.2, uz));
  }
  return finish(p);
}

// ══ THE TAILGATE ═════════════════════════════════════════════════════════
// The hero district. Everything below repeats by the hundred, so the part
// counts matter far more than they do in the bowl.

/** Pickup with the tailgate down, a cooler in the bed and two chairs out. Body ~7
 *  long, 9 with the chairs pulled out behind it. */
export function makeTailgateTruck(): THREE.Group {
  const col = pick([CRIM, CRIM, CRIM, NAVY, WHITE, TEAL]);    // crimson roughly 3 in 6
  const p: G[] = [
    part(new THREE.BoxGeometry(5.9, 0.9, 2.4), col, 0, 1.35, 0),
    part(new THREE.BoxGeometry(2.3, 1.35, 2.3), col, 0.55, 2.4, 0),
    part(new THREE.BoxGeometry(2.05, 0.62, 2.36), 0x33414f, 0.6, 2.52, 0),      // glazing band
    part(new THREE.BoxGeometry(1.8, 0.78, 2.3), col, 2.5, 1.98, 0),             // bonnet
    part(new THREE.BoxGeometry(0.2, 0.5, 2.0), CHAR, 3.44, 1.85, 0),            // grille
    part(new THREE.BoxGeometry(0.34, 0.36, 2.5), STEEL, 3.44, 1.2, 0),          // bumper
  ];
  for (const sz of [-0.78, 0.78]) p.push(part(new THREE.BoxGeometry(0.16, 0.26, 0.5), GOLD_L, 3.46, 2.2, sz));
  // the bed, and the tailgate folded out flat — which is the whole point of
  // the prop: it is a bench, and half the district is sitting on one
  p.push(part(new THREE.BoxGeometry(2.7, 0.16, 2.2), CHAR, -1.6, 1.88, 0));
  for (const sz of [-1.12, 1.12]) p.push(part(new THREE.BoxGeometry(2.7, 0.72, 0.22), col, -1.6, 2.16, sz));
  p.push(part(new THREE.BoxGeometry(0.22, 0.72, 2.3), col, -0.3, 2.16, 0));
  p.push(part(new THREE.BoxGeometry(1.35, 0.14, 2.3), col, -3.6, 1.88, 0));
  p.push(part(new THREE.BoxGeometry(1.1, 0.06, 1.6), GOLD, -3.65, 1.96, 0));
  for (const sx of [-1.85, 1.9]) for (const sz of [-1.3, 1.3]) wheelParts(p, sx, 0.66, sz, 0.66);
  coolerParts(p, -1.5, 1.96, -0.5, 1.0, 0.6, BLUE);
  p.push(part(new THREE.BoxGeometry(0.7, 0.44, 0.7), CRIM, -1.7, 2.18, 0.7));   // a crate of something
  chairParts(p, -4.9, 0, -1.0, 1, CRIM);
  chairParts(p, -4.9, 0, 0.9, 1, GOLD);
  return finish(p);
}

/** Pop-up gazebo with bunting on two sides and a table under it, ~3.4 square. */
export function makeCanopy(): THREE.Group {
  const top = pick([CRIM, CRIM, CRIM, WHITE, TEAL]);
  const p: G[] = [];
  for (const sx of [-1.5, 1.5]) for (const sz of [-1.5, 1.5])
    p.push(part(new THREE.CylinderGeometry(0.08, 0.1, 2.7, 6), ALU, sx, 1.35, sz));
  p.push(part(new THREE.BoxGeometry(3.3, 0.12, 3.3), ALU, 0, 2.72, 0));
  p.push(part(new THREE.ConeGeometry(2.6, 0.95, 4), top, 0, 3.24, 0, 0, Math.PI / 4));
  p.push(part(new THREE.SphereGeometry(0.16, 8, 6), GOLD, 0, 3.78, 0));
  for (const sz of [-1, 1]) {
    p.push(part(new THREE.BoxGeometry(3.5, 0.34, 0.1), top === WHITE ? CRIM : WHITE, 0, 2.6, sz * 1.72));
    p.push(part(new THREE.BoxGeometry(0.1, 0.34, 3.5), top === WHITE ? CRIM : WHITE, sz * 1.72, 2.6, 0));
  }
  // bunting on the two sides that face the aisles
  buntingRun(p, [CRIM, GOLD, WHITE], -1.5, 2.6, 1.6, 1.5, 2.6, 1.6, 6, 0.4);
  buntingRun(p, [CRIM, WHITE, GOLD], 1.6, 2.6, 1.5, 1.6, 2.6, -1.5, 6, 0.4);
  // the table underneath, with the cloth hanging off it
  p.push(part(new THREE.BoxGeometry(2.2, 0.12, 0.9), WHITE, -0.3, 0.86, -0.5));
  p.push(part(new THREE.BoxGeometry(2.3, 0.5, 0.06), CRIM, -0.3, 0.6, -0.94));
  for (const sx of [-1.0, 1.0]) p.push(part(new THREE.BoxGeometry(0.09, 0.86, 0.8), STEEL, -0.3 + sx, 0.43, -0.5));
  cupParts(p, 0.3, 0.92, -0.5, 4);
  p.push(part(new THREE.CylinderGeometry(0.28, 0.28, 0.3, 10), GOLD, -1.0, 1.07, -0.5));
  return finish(p);
}

/** Barrel grill on wheels with a smoke plume, ~2.4 long, 3.8 to the top of the smoke. */
export function makeGrill(): THREE.Group {
  const shell = (thetaStart: number) => {
    const g = new THREE.CylinderGeometry(0.62, 0.62, 2.0, 14, 1, false, thetaStart, Math.PI);
    g.rotateZ(Math.PI / 2);                                   // lay the barrel along X
    return g;
  };
  const p: G[] = [
    part(shell(Math.PI), CHAR, 0, 1.0, 0),                    // firebox
    part(shell(0), CRIM, 0, 1.02, 0),                         // lid
    part(new THREE.BoxGeometry(2.05, 0.1, 1.28), STEEL, 0, 1.02, 0),
    part(new THREE.BoxGeometry(0.5, 0.08, 0.08), CHAR, 0.72, 1.62, 0),   // lid handle
    part(new THREE.BoxGeometry(0.9, 0.1, 1.3), ALU, -1.35, 1.0, 0),      // side shelf
  ];
  for (const sz of [-0.55, 0.55]) p.push(part(new THREE.CylinderGeometry(0.06, 0.07, 1.1, 6), STEEL, 0.72, 0.56, sz, 0, 0, -0.22));
  wheelParts(p, -0.75, 0.34, 0.64, 0.34, 0.16);
  wheelParts(p, -0.75, 0.34, -0.64, 0.34, 0.16);
  p.push(part(new THREE.CylinderGeometry(0.13, 0.15, 0.7, 8), CHAR, -0.55, 1.85, 0));   // chimney
  p.push(part(new THREE.CylinderGeometry(0.17, 0.17, 0.1, 8), STEEL, -0.55, 2.2, 0));
  p.push(part(new THREE.BoxGeometry(0.5, 0.24, 0.06), GOLD, 0.5, 1.05, 0.63));          // badge
  // The plume stays on the flat prop material with the rest of the prop: at
  // 0.26 radius these spheres facet at about four screen pixels, and splitting
  // the grill into two meshes to smooth them would double its draw calls.
  for (let i = 0; i < 4; i++)
    p.push(part(new THREE.SphereGeometry(0.26 + i * 0.07, 8, 6), SMOKE,
      -0.55 - i * 0.15, 2.35 + i * 0.36, Math.sin(i * 1.6) * 0.22));
  return finish(p);
}

/** Coolers and a keg tub, the drinks station of a tailgate, ~3 across. */
export function makeCoolerStack(): THREE.Group {
  const p: G[] = [];
  coolerParts(p, -0.9, 0, -0.4, 1.15, 0.68, BLUE);
  coolerParts(p, -0.9, 0.78, -0.4, 1.0, 0.5, CRIM);
  coolerParts(p, -0.6, 0, 0.85, 0.95, 0.58, WHITE);
  // the keg tub: a galvanised tub of ice with the keg standing in it
  p.push(part(new THREE.CylinderGeometry(0.86, 0.72, 0.72, 14), ALU, 1.1, 0.36, 0));
  p.push(part(new THREE.TorusGeometry(0.86, 0.07, 5, 16), STEEL, 1.1, 0.7, 0, Math.PI / 2));
  for (let i = 0; i < 5; i++)
    p.push(part(new THREE.IcosahedronGeometry(0.17, 0), 0xe8f4f8, 1.1 + Math.cos(i * 1.3) * 0.5, 0.72, Math.sin(i * 1.3) * 0.5));
  p.push(part(new THREE.CylinderGeometry(0.42, 0.42, 1.1, 12), ALU, 1.1, 1.05, 0));
  p.push(part(new THREE.TorusGeometry(0.42, 0.08, 5, 12), STEEL, 1.1, 1.55, 0, Math.PI / 2));
  p.push(part(new THREE.CylinderGeometry(0.18, 0.18, 0.16, 8), CHAR, 1.1, 1.68, 0));
  p.push(part(new THREE.CylinderGeometry(0.05, 0.05, 0.5, 6), STEEL, 1.1, 1.95, 0));
  p.push(part(new THREE.BoxGeometry(0.4, 0.1, 0.1), CRIM, 1.28, 2.16, 0));
  cupParts(p, 0.1, 1.06, -0.4, 4);
  return finish(p);
}

/** Two cornhole boards facing off across the aisle with the bags, ~10 long. */
export function makeCornhole(): THREE.Group {
  const p: G[] = [];
  const TILT = 0.245;                                         // 0.6 rise over 2.4 of board
  for (const [bx, dir, col] of [[-3.6, 1, CRIM], [3.6, -1, GOLD]] as [number, number, number][]) {
    const board = new THREE.BoxGeometry(2.4, 0.1, 1.2);
    board.rotateZ(dir * TILT);
    p.push(part(board, col, bx, 0.45, 0));
    const hole = new THREE.CylinderGeometry(0.24, 0.24, 0.08, 10);
    hole.rotateZ(dir * TILT);
    p.push(part(hole, CHAR, bx + dir * 0.72, 0.45 + 0.72 * TILT + 0.06, 0));
    p.push(part(new THREE.BoxGeometry(0.12, 0.2, 1.2), col === CRIM ? WHITE : CRIM, bx - dir * 1.18, 0.1, 0));
    for (const sz of [-0.5, 0.5])
      p.push(part(new THREE.CylinderGeometry(0.05, 0.05, 0.68, 5), TIMBER_D, bx + dir * 1.0, 0.34, sz, 0, 0, dir * 0.14));
  }
  // the bags, some on the boards, some in the dirt where they landed
  const BAGS: [number, number, number, number][] = [
    [-2.9, 0.58, 0.3, CRIM], [-3.9, 0.52, -0.35, GOLD], [-1.4, 0.06, 0.6, CRIM],
    [3.2, 0.56, -0.2, GOLD], [4.2, 0.62, 0.35, CRIM], [1.1, 0.06, -0.5, GOLD],
  ];
  for (const [gx, gy, gz, gc] of BAGS)
    p.push(part(new THREE.BoxGeometry(0.32, 0.11, 0.3), gc, gx, gy, gz, 0, rnd(-0.8, 0.8)));
  return finish(p);
}

/** Trestle table with cups, a giant sub and a crock pot, ~3 long. */
export function makeTailgateTable(): THREE.Group {
  const p: G[] = [
    part(new THREE.BoxGeometry(2.9, 0.12, 1.0), CREAM, 0, 0.82, 0),
    part(new THREE.BoxGeometry(3.0, 0.42, 0.06), CRIM, 0, 0.6, 0.52),
    part(new THREE.BoxGeometry(3.0, 0.42, 0.06), CRIM, 0, 0.6, -0.52),
  ];
  for (const sx of [-1.1, 1.1]) {
    p.push(part(new THREE.BoxGeometry(0.09, 0.86, 0.9), STEEL, sx, 0.44, 0, 0, 0, 0.16));
    p.push(part(new THREE.BoxGeometry(0.09, 0.86, 0.9), STEEL, sx, 0.44, 0, 0, 0, -0.16));
  }
  // THE SUB. Absurdly long, which is the joke and also why it reads at 30 metres.
  p.push(part(new THREE.CylinderGeometry(0.18, 0.18, 2.0, 10), BUN, -0.4, 1.0, -0.24, 0, 0, Math.PI / 2));
  p.push(part(new THREE.BoxGeometry(1.95, 0.1, 0.34), MEAT, -0.4, 1.06, -0.24));
  p.push(part(new THREE.BoxGeometry(1.9, 0.06, 0.4), GRASS, -0.4, 1.12, -0.24));
  p.push(part(new THREE.BoxGeometry(1.98, 0.12, 0.3), BUN, -0.4, 1.18, -0.24));
  for (let i = 0; i < 4; i++) p.push(part(new THREE.BoxGeometry(0.06, 0.3, 0.06), WHITE, -1.2 + i * 0.55, 1.34, -0.24));
  // the crock pot, plugged into nothing at all
  p.push(part(new THREE.CylinderGeometry(0.34, 0.3, 0.42, 12), CHAR, 1.05, 1.09, 0.26));
  p.push(part(new THREE.CylinderGeometry(0.36, 0.36, 0.1, 12), ALU, 1.05, 1.33, 0.26));
  p.push(part(new THREE.SphereGeometry(0.1, 8, 6), STEEL, 1.05, 1.4, 0.26));
  p.push(part(new THREE.BoxGeometry(0.08, 0.12, 0.4), CRIM, 1.05, 1.14, 0.26));
  // chips, a tray of cookies and the cups
  p.push(part(new THREE.CylinderGeometry(0.3, 0.24, 0.16, 12), WHITE, 0.5, 0.96, 0.3));
  for (let i = 0; i < 4; i++)
    p.push(part(new THREE.CylinderGeometry(0.09, 0.09, 0.04, 7), GOLD, 0.5 + Math.cos(i * 1.6) * 0.14, 1.06, 0.3 + Math.sin(i * 1.6) * 0.14));
  p.push(part(new THREE.BoxGeometry(0.5, 0.06, 0.36), ALU, -1.15, 0.91, 0.28));
  cupParts(p, -1.15, 0.88, 0.28, 5);
  return finish(p);
}

/** Hitch-mounted pennant on a tall whippy pole, ~5.4 tall. */
export function makeFlagPole(): THREE.Group {
  const p: G[] = [
    part(new THREE.BoxGeometry(0.7, 0.14, 0.7), CHAR, 0, 0.07, 0),
    part(new THREE.BoxGeometry(0.3, 0.5, 0.3), STEEL, 0, 0.32, 0),
  ];
  // The pole bends. A straight one photographed as a lamp post — the lean
  // accumulates 0.05 rad a segment, which is the point where it reads as fibreglass.
  let px = 0, py = 0.55;
  for (let i = 0; i < 6; i++) {
    const lean = 0.05 * i;
    p.push(part(new THREE.CylinderGeometry(0.05 - i * 0.005, 0.06 - i * 0.005, 0.82, 6), ALU, px, py + 0.41, 0, 0, 0, -lean));
    px += Math.sin(lean) * 0.82; py += 0.8;
  }
  p.push(part(new THREE.SphereGeometry(0.1, 8, 6), GOLD, px, py + 0.1, 0));
  flagWave(p, CRIM, px - 0.12, py - 0.5, 0, 1.5, 0.95, 3, 0.16);
  flagWave(p, GOLD, px - 0.12, py - 1.5, 0, 1.1, 0.6, 2, 0.12);
  return finish(p);
}

/** A row of three, because it is funny and it is true. ~4.4 across. */
export function makePortaloo(): THREE.Group {
  const p: G[] = [];
  const COLS = [CRIM, GOLD, CRIM];                            // teal here would read as a scoreline
  for (let i = 0; i < 3; i++) {
    const z = (i - 1) * 1.45;
    p.push(part(new THREE.BoxGeometry(1.2, 2.3, 1.24), COLS[i], 0, 1.15, z));
    p.push(part(new THREE.BoxGeometry(1.34, 0.16, 1.38), WHITE, 0, 2.38, z));
    p.push(part(new THREE.BoxGeometry(0.1, 1.9, 0.9), CREAM, 0.62, 1.12, z));
    p.push(part(new THREE.BoxGeometry(0.08, 0.3, 0.5), CHAR, 0.66, 2.02, z));       // vent
    p.push(part(new THREE.SphereGeometry(0.07, 6, 5), STEEL, 0.68, 1.1, z + 0.32));  // handle
    p.push(part(new THREE.BoxGeometry(0.06, 0.22, 0.22), i === 1 ? GOLD_L : CHAR, 0.68, 1.5, z - 0.28));
  }
  return finish(p);
}

// ══ GATE PLAZA ═══════════════════════════════════════════════════════════

/** Turnstiles under a crimson arch, ~6.8 wide, 5.7 tall. */
export function makeTicketGate(): THREE.Group {
  const p: G[] = [
    part(new THREE.BoxGeometry(1.1, 4.4, 1.1), CONC, 0, 2.2, -2.7),
    part(new THREE.BoxGeometry(1.1, 4.4, 1.1), CONC, 0, 2.2, 2.7),
    part(new THREE.BoxGeometry(1.4, 0.9, 6.6), CRIM, 0, 4.85, 0),
    part(new THREE.BoxGeometry(1.5, 0.2, 6.8), GOLD, 0, 4.32, 0),
    part(new THREE.BoxGeometry(0.16, 0.5, 4.6), GOLD, 0.75, 4.85, 0),
    part(new THREE.BoxGeometry(1.2, 0.4, 1.2), CONC_D, 0, 5.5, -2.7),
    part(new THREE.BoxGeometry(1.2, 0.4, 1.2), CONC_D, 0, 5.5, 2.7),
  ];
  // three turnstiles, arms at 120°
  for (const tz of [-1.6, 0, 1.6]) {
    p.push(part(new THREE.CylinderGeometry(0.16, 0.2, 1.05, 8), STEEL, 0, 0.53, tz));
    p.push(part(new THREE.BoxGeometry(0.5, 0.5, 0.5), CHAR, 0, 1.12, tz));
    for (let a = 0; a < 3; a++) {
      // ry cannot swing a cylinder that is still standing on its own axis — all
      // three arms came out pointing at +X. Lay it down and offset it here, in
      // geometry space, so the bearing has something to act on.
      const arm = new THREE.CylinderGeometry(0.06, 0.06, 1.3, 6);
      arm.rotateZ(Math.PI / 2);
      arm.translate(0.65, 0, 0);
      p.push(part(arm, ALU, 0, 1.12, tz, 0, -a * 2.094));
    }
  }
  p.push(part(new THREE.BoxGeometry(0.5, 1.1, 0.6), CRIM, -0.9, 0.55, -2.2));       // scanner podium
  p.push(part(new THREE.BoxGeometry(0.3, 0.24, 0.4), GOLD_L, -0.9, 1.18, -2.2));
  return finish(p);
}

/** Merch kiosk hung with scarves and foam fingers, ~4 wide. */
export function makeMerchStand(): THREE.Group {
  const p: G[] = [
    part(new THREE.BoxGeometry(1.9, 2.3, 3.4), CREAM, -0.3, 1.15, 0),
    part(new THREE.BoxGeometry(2.1, 0.16, 3.6), CRIM, -0.3, 2.4, 0),
    part(new THREE.BoxGeometry(0.5, 0.16, 3.4), TIMBER, 0.8, 1.5, 0),               // counter
    part(new THREE.BoxGeometry(0.24, 1.4, 3.4), CHAR, 0.5, 1.9, 0),                 // the serving gap
    part(new THREE.BoxGeometry(0.9, 0.8, 3.0), CRIM, -0.3, 2.95, 0),                // sign board
    part(new THREE.BoxGeometry(0.2, 0.36, 2.2), GOLD, 0.2, 2.95, 0),
  ];
  // striped awning over the counter
  for (let i = 0; i < 6; i++)
    p.push(part(new THREE.BoxGeometry(0.5, 0.12, 1.4), i % 2 ? CRIM : WHITE, 0.7, 2.36, -1.6 + i * 0.64, 0, 0, -0.3));
  p.push(part(new THREE.BoxGeometry(0.14, 0.14, 3.5), STEEL, 1.4, 2.06, 0));
  // scarves on a rail, and the foam fingers
  p.push(part(new THREE.CylinderGeometry(0.05, 0.05, 3.0, 6), STEEL, 0.72, 2.28, 0, Math.PI / 2));
  for (let i = 0; i < 5; i++) {
    const sc = i % 2 ? GOLD : CRIM;
    p.push(part(new THREE.BoxGeometry(0.07, 1.15, 0.34), sc, 0.72, 1.7, -1.28 + i * 0.64));
    p.push(part(new THREE.BoxGeometry(0.09, 0.18, 0.34), WHITE, 0.74, 1.5, -1.28 + i * 0.64));
  }
  for (const fz of [-1.1, 1.1]) {
    p.push(part(new THREE.BoxGeometry(0.16, 0.9, 0.42), CRIM, -0.25, 3.75, fz));
    p.push(part(new THREE.BoxGeometry(0.18, 0.55, 0.2), CRIM, -0.25, 4.32, fz + 0.14));
  }
  p.push(part(new THREE.BoxGeometry(0.6, 0.3, 0.6), GOLD, 0.85, 1.73, -1.2));       // stack of caps
  p.push(part(new THREE.BoxGeometry(0.55, 0.26, 0.55), CRIM, 0.85, 1.98, -1.2));
  return finish(p);
}

/** The giant inflatable helmet the team runs out through, ~14 long, 8.5 tall.
 *  On PROP_SMOOTH_MAT: it is a balloon, and a faceted balloon is a rock. */
export function makeHelmetTunnel(): THREE.Group {
  const p: G[] = [];
  // inflated bolsters it sits on, so the whole thing meets the tarmac at y = 0
  for (const sz of [-2.2, 2.2])
    p.push(part(new THREE.CylinderGeometry(0.9, 0.9, 9.0, 12), CRIM_D, -1.0, 0.9, sz, 0, 0, Math.PI / 2));
  p.push(part(new THREE.SphereGeometry(4.0, 18, 14), CRIM, 0.4, 4.3, 0, 0, 0, 0, 1.06, 1.0, 0.96));
  p.push(part(new THREE.SphereGeometry(3.4, 16, 12), CRIM_D, -1.6, 4.0, 0, 0, 0, 0, 1.0, 0.94, 0.92));
  // crown stripe
  for (const [sx, sy] of [[2.6, 7.57], [0.4, 8.15], [-1.8, 7.57]] as [number, number][])
    p.push(part(new THREE.SphereGeometry(0.6, 12, 9), GOLD, sx, sy, 0, 0, 0, 0, 1.6, 0.5, 1.0));
  // facemask: three bars across the front, and the ear hole
  for (const [bx, by, bl] of [[4.23, 2.4, 2.8], [4.6, 3.3, 3.4], [4.74, 4.2, 3.4]] as [number, number, number][])
    p.push(part(new THREE.CylinderGeometry(0.19, 0.19, bl, 8), WHITE, bx, by, 0, Math.PI / 2));
  for (const sz of [-1.5, 1.5])
    p.push(part(new THREE.CylinderGeometry(0.17, 0.17, 2.1, 8), WHITE, 4.4, 3.3, sz));
  for (const sz of [-1, 1]) p.push(part(new THREE.CylinderGeometry(0.9, 0.9, 0.5, 12), CRIM_D, 0.6, 3.4, sz * 3.85, Math.PI / 2));
  // the tunnel the players actually run down, trailing off −X
  p.push(part(new THREE.CylinderGeometry(2.4, 2.9, 5.0, 14), CRIM, -5.6, 2.9, 0, 0, 0, Math.PI / 2));
  p.push(part(new THREE.TorusGeometry(2.45, 0.28, 8, 14), GOLD, -8.0, 2.9, 0, 0, Math.PI / 2));
  p.push(part(new THREE.CylinderGeometry(0.55, 0.55, 1.1, 10), STEEL, -8.4, 0.55, 2.6));   // the blower
  p.push(part(new THREE.CylinderGeometry(0.3, 0.3, 1.4, 8), STEEL, -8.4, 1.4, 2.6, 0, 0, 0.5));
  return finishSoft(p);
}

/** Hot dogs, popcorn and a striped awning, ~3.4 long. */
export function makeConcessionCart(): THREE.Group {
  const p: G[] = [
    part(new THREE.BoxGeometry(2.6, 1.0, 1.4), WHITE, 0, 1.06, 0),
    part(new THREE.BoxGeometry(2.7, 0.14, 1.5), CRIM, 0, 1.62, 0),
    part(new THREE.BoxGeometry(2.5, 0.3, 1.3), CRIM, 0, 1.06, 0),
    part(new THREE.BoxGeometry(0.9, 0.22, 1.0), ALU, -0.6, 1.72, 0),
  ];
  wheelParts(p, -0.9, 0.5, 0.78, 0.5, 0.2);
  wheelParts(p, -0.9, 0.5, -0.78, 0.5, 0.2);
  p.push(part(new THREE.CylinderGeometry(0.16, 0.16, 0.5, 8), STEEL, 1.5, 0.5, 0));
  p.push(part(new THREE.BoxGeometry(0.9, 0.1, 0.1), STEEL, 1.75, 1.2, 0, 0, 0, 0.5));
  // the food: dogs on the griddle, and a popcorn kettle behind glass
  for (let i = 0; i < 4; i++) {
    p.push(part(new THREE.CylinderGeometry(0.09, 0.09, 0.62, 8), MEAT, -0.6, 1.86, -0.36 + i * 0.24, 0, 0, Math.PI / 2));
    p.push(part(new THREE.BoxGeometry(0.62, 0.08, 0.2), BUN, -0.6, 1.79, -0.36 + i * 0.24));
  }
  p.push(part(new THREE.BoxGeometry(0.85, 0.95, 0.9), ALU, 0.75, 2.16, 0));
  p.push(part(new THREE.BoxGeometry(0.7, 0.7, 0.94), 0x9fd8e4, 0.78, 2.2, 0));
  for (let i = 0; i < 6; i++)
    p.push(part(new THREE.SphereGeometry(0.11, 7, 6), i % 3 ? CREAM : GOLD_L,
      0.75 + rnd(-0.22, 0.22), 2.0 + rnd(0, 0.5), rnd(-0.3, 0.3)));
  // striped awning on two arms
  for (const sz of [-0.72, 0.72]) p.push(part(new THREE.CylinderGeometry(0.05, 0.06, 1.5, 5), STEEL, -1.2, 2.4, sz));
  for (let i = 0; i < 6; i++)
    p.push(part(new THREE.BoxGeometry(0.6, 0.12, 0.62), i % 2 ? CRIM : WHITE, 0.1, 3.2, -0.9 + i * 0.36, 0, 0, 0.16));
  p.push(part(new THREE.BoxGeometry(2.6, 0.26, 0.1), GOLD, 0.1, 3.0, 0.98));
  p.push(part(new THREE.BoxGeometry(0.06, 0.5, 1.2), GOLD, -1.36, 2.9, 0));
  return finish(p);
}

// ══ CAMPUS, FRAT ROW AND THE PRACTICE FIELD ══════════════════════════════

/** Big porched house with a banner between the columns, ~12 deep, 8.5 tall, plus
 *  the sofa that lives on the lawn now. */
export function makeFratHouse(): THREE.Group {
  const wall = pick([CREAM, CREAM, 0xd8c4a4, BRICK]);
  const p: G[] = [
    part(new THREE.BoxGeometry(9.0, 5.6, 8.2), wall, -1.2, 2.8, 0),
    part(new THREE.BoxGeometry(9.4, 0.36, 8.6), TIMBER_D, -1.2, 5.75, 0),
    part(new THREE.ConeGeometry(6.4, 2.6, 4), 0x6a5a52, -1.2, 7.2, 0, 0, Math.PI / 4),
    part(new THREE.BoxGeometry(3.2, 0.3, 8.6), TIMBER, 4.6, 0.16, 0),               // porch deck
    part(new THREE.BoxGeometry(3.4, 0.34, 8.8), TIMBER_D, 4.6, 3.9, 0),             // porch roof
    part(new THREE.BoxGeometry(3.6, 0.22, 9.0), WHITE, 4.6, 4.16, 0),
  ];
  for (const cz of [-3.4, -1.15, 1.15, 3.4]) {
    p.push(part(new THREE.CylinderGeometry(0.22, 0.26, 3.55, 9), WHITE, 5.7, 2.08, cz));
    p.push(part(new THREE.BoxGeometry(0.66, 0.2, 0.66), WHITE, 5.7, 3.94, cz));
  }
  // the banner, slung between the two middle columns
  p.push(part(new THREE.BoxGeometry(0.14, 1.4, 4.5), CRIM, 5.9, 2.7, 0));
  p.push(part(new THREE.BoxGeometry(0.08, 0.4, 3.6), GOLD, 5.99, 2.7, 0));
  // door, windows and steps
  p.push(part(new THREE.BoxGeometry(0.2, 2.3, 1.4), TIMBER_D, 3.15, 1.45, 0));
  p.push(part(new THREE.SphereGeometry(0.09, 6, 5), GOLD, 3.28, 1.4, 0.45));
  for (const wz of [-2.6, 2.6]) p.push(part(new THREE.BoxGeometry(0.16, 1.3, 1.2), 0x8fc4d8, 3.16, 1.9, wz));
  for (const wy of [4.3]) for (const wz of [-2.8, -0.9, 0.9, 2.8])
    p.push(part(new THREE.BoxGeometry(0.16, 1.4, 1.1), 0x8fc4d8, 3.35, wy, wz));
  for (const sx of [-3.5, 3.5]) for (const wy of [1.7, 4.3])
    p.push(part(new THREE.BoxGeometry(1.2, 1.4, 0.16), 0x8fc4d8, -1.2 + sx, wy, 4.15));
  for (let i = 0; i < 3; i++) p.push(part(new THREE.BoxGeometry(0.4, 0.12, 2.4), TIMBER, 6.4 + i * 0.4, 0.3 - i * 0.1, 0));
  // the sofa that lives on the lawn now
  const sofa = pick([0x8a6a4a, NAVY, 0x7a5a68]);
  p.push(part(new THREE.BoxGeometry(2.4, 0.5, 1.0), sofa, 8.6, 0.35, -2.6, 0, 0.4));
  p.push(part(new THREE.BoxGeometry(2.4, 0.7, 0.3), sofa, 8.4, 0.8, -3.0, 0, 0.4));
  for (const ax of [-1.1, 1.1]) p.push(part(new THREE.BoxGeometry(0.28, 0.55, 1.0), sofa, 8.6 + ax * 0.92, 0.75, -2.6 + ax * 0.39, 0, 0.4));
  for (const cx of [-0.55, 0.55]) p.push(part(new THREE.BoxGeometry(1.0, 0.16, 0.9), CRIM, 8.6 + cx * 0.92, 0.66, -2.6 + cx * 0.39, 0, 0.4));
  cupParts(p, 7.4, 0, -1.4, 4);
  return finish(p);
}

/** Collegiate brick hall with a portico and pediment, ~18 deep, 10 tall. */
export function makeBrickHall(): THREE.Group {
  const p: G[] = [
    part(new THREE.BoxGeometry(14.4, 0.7, 9.6), CONC_D, -0.6, 0.35, 0),
    part(new THREE.BoxGeometry(13.8, 6.8, 9.0), BRICK, -0.6, 4.1, 0),
    part(new THREE.BoxGeometry(14.0, 0.3, 9.2), CONC, -0.6, 3.7, 0),                // string course
    part(new THREE.BoxGeometry(14.2, 0.5, 9.4), CONC, -0.6, 7.6, 0),                // cornice
    part(new THREE.BoxGeometry(13.6, 0.6, 8.8), BRICK_D, -0.6, 8.05, 0),
    part(new THREE.ConeGeometry(6.6, 1.8, 4), 0x5e5a5e, -0.6, 9.0, 0, 0, Math.PI / 4),
  ];
  for (const wy of [2.2, 5.6]) for (const wz of [-3.4, -1.7, 0, 1.7, 3.4]) {
    p.push(part(new THREE.BoxGeometry(0.2, 1.7, 1.0), CONC, 6.4, wy, wz));
    p.push(part(new THREE.BoxGeometry(0.14, 1.4, 0.8), 0x7fb4cc, 6.5, wy, wz));
  }
  for (const sx of [-7.5, 6.3]) for (const wy of [2.2, 5.6]) for (const wz of [-2.6, 0, 2.6])
    p.push(part(new THREE.BoxGeometry(1.0, 1.5, 0.16), 0x7fb4cc, -0.6 + sx, wy, wz * 1.7));
  // portico: four columns, entablature, pediment
  for (const cz of [-2.4, -0.8, 0.8, 2.4]) {
    p.push(part(new THREE.CylinderGeometry(0.3, 0.34, 5.0, 10), CONC, 7.8, 2.8, cz));
    p.push(part(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 10), CONC, 7.8, 5.45, cz));
    p.push(part(new THREE.CylinderGeometry(0.44, 0.44, 0.26, 10), CONC, 7.8, 0.43, cz));
  }
  p.push(part(new THREE.BoxGeometry(2.2, 0.8, 6.4), CONC, 7.6, 6.0, 0));
  p.push(part(pediment(1.9, 2.2), CONC, 7.6, 7.35, 0));
  p.push(part(new THREE.BoxGeometry(0.2, 0.6, 4.0), CRIM, 8.72, 7.4, 0));
  p.push(part(new THREE.BoxGeometry(0.3, 3.0, 2.0), TIMBER_D, 6.5, 1.9, 0));
  for (let i = 0; i < 3; i++) p.push(part(new THREE.BoxGeometry(0.55, 0.14, 6.4), CONC_D, 8.4 + i * 0.55, 0.5 - i * 0.14, 0));
  return finish(p);
}

/** The campus landmark: a tall slim clock tower, ~22 tall on a 4.6 base. */
export function makeClockTower(): THREE.Group {
  const p: G[] = [
    part(new THREE.BoxGeometry(4.6, 0.7, 4.6), CONC_D, 0, 0.35, 0),
    part(new THREE.BoxGeometry(3.9, 5.4, 3.9), BRICK, 0, 3.4, 0),
    part(new THREE.BoxGeometry(4.1, 0.3, 4.1), CONC, 0, 6.2, 0),
    part(new THREE.BoxGeometry(3.5, 4.6, 3.5), BRICK, 0, 8.6, 0),
    part(new THREE.BoxGeometry(3.7, 0.3, 3.7), CONC, 0, 11.0, 0),
    part(new THREE.BoxGeometry(3.2, 3.0, 3.2), CONC, 0, 12.6, 0),                   // clock stage
  ];
  // a clock on all four faces: the tower is a landmark from every district
  for (let f = 0; f < 4; f++) {
    const a = (f / 4) * Math.PI * 2;
    const nx = Math.cos(a) * 1.64, nz = Math.sin(a) * 1.64;
    const dial = new THREE.CylinderGeometry(1.05, 1.05, 0.16, 14);
    dial.rotateZ(Math.PI / 2);                              // face it along +X before spinning it
    p.push(part(dial, CREAM, nx, 12.7, nz, 0, -a));
    p.push(part(new THREE.BoxGeometry(0.1, 0.12, 0.7), CHAR, nx * 1.06, 12.9, nz * 1.06, 0, -a));
    p.push(part(new THREE.BoxGeometry(0.1, 0.5, 0.12), CHAR, nx * 1.06, 12.5, nz * 1.06, 0, -a));
    p.push(part(new THREE.BoxGeometry(0.2, 1.9, 0.5), BRICK_D, nx * 1.9, 15.6, nz * 1.9, 0, -a));   // belfry opening
  }
  p.push(part(new THREE.BoxGeometry(3.4, 0.34, 3.4), CONC, 0, 14.2, 0));
  p.push(part(new THREE.BoxGeometry(3.0, 2.6, 3.0), BRICK, 0, 15.6, 0));
  p.push(part(new THREE.BoxGeometry(3.6, 0.4, 3.6), CONC, 0, 17.1, 0));
  for (const sx of [-1, 1]) for (const sz of [-1, 1])
    p.push(part(new THREE.BoxGeometry(0.45, 0.7, 0.45), CONC, sx * 1.55, 17.6, sz * 1.55));
  p.push(part(new THREE.ConeGeometry(2.3, 3.0, 4), CRIM_D, 0, 18.7, 0, 0, Math.PI / 4));
  p.push(part(new THREE.SphereGeometry(0.26, 9, 7), GOLD, 0, 20.4, 0));
  p.push(part(new THREE.CylinderGeometry(0.05, 0.05, 1.4, 5), GOLD, 0, 21.2, 0));
  p.push(part(new THREE.ConeGeometry(0.24, 0.7, 3), GOLD, 0.4, 21.6, 0, 0, 0, Math.PI / 2, 1, 1, 0.14));
  return finish(p);
}

/** A proper Y goalpost, ~8 tall, 5.7 across the uprights. */
export function makeGoalpost(): THREE.Group {
  const p: G[] = [
    part(new THREE.CylinderGeometry(0.4, 0.5, 0.2, 10), CONC, 0, 0.1, 0),
    part(new THREE.CylinderGeometry(0.16, 0.2, 2.9, 8), GOLD, 0, 1.55, 0),
    part(new THREE.CylinderGeometry(0.15, 0.15, 1.9, 8), GOLD, 0.45, 3.2, 0, 0, 0, -0.55),
    part(new THREE.BoxGeometry(0.18, 0.18, 5.6), GOLD, 0.95, 3.95, 0),
    part(new THREE.CylinderGeometry(0.5, 0.55, 1.9, 10), CRIM, 0, 0.95, 0),         // base pad
  ];
  for (const uz of [-2.7, 2.7]) p.push(part(new THREE.CylinderGeometry(0.14, 0.14, 4.2, 8), GOLD, 0.95, 6.05, uz));
  for (const uz of [-2.7, 2.7]) p.push(part(new THREE.ConeGeometry(0.2, 0.7, 3), CRIM, 0.8, 7.8, uz, 0, 0, Math.PI / 2, 1, 1, 0.14));
  return finish(p);
}

/** Small aluminium stand, five rows, ~7 wide. */
export function makeBleacherStack(): THREE.Group {
  const p: G[] = [];
  for (let i = 0; i < 5; i++) {
    const x = -1.6 + i * 0.8, y = 0.5 + i * 0.5;
    p.push(part(new THREE.BoxGeometry(0.62, 0.1, 6.6), ALU, x, y, 0));              // bench
    p.push(part(new THREE.BoxGeometry(0.14, 0.5, 6.6), 0xa8adb4, x - 0.24, y - 0.25, 0));   // riser
  }
  for (const sz of [-3.2, 3.2]) {
    p.push(part(new THREE.BoxGeometry(4.4, 0.16, 0.16), STEEL, 0, 1.5, sz, 0, 0, 0.55));
    p.push(part(new THREE.BoxGeometry(0.16, 3.0, 0.16), STEEL, 1.9, 1.5, sz));
    p.push(part(new THREE.BoxGeometry(0.16, 0.9, 0.16), STEEL, -1.6, 0.45, sz));
    p.push(part(new THREE.BoxGeometry(4.4, 0.12, 0.12), STEEL, 0, 3.2, sz, 0, 0, 0.55));
    p.push(part(new THREE.BoxGeometry(0.14, 1.7, 0.14), STEEL, -1.9, 3.6, sz));
  }
  p.push(part(new THREE.BoxGeometry(0.16, 1.7, 6.6), STEEL, -2.05, 3.6, 0));        // back rail
  p.push(part(new THREE.BoxGeometry(0.14, 0.14, 6.6), CRIM, -2.05, 4.4, 0));
  for (let i = 0; i < 4; i++) p.push(part(new THREE.BoxGeometry(0.5, 0.1, 0.9), ALU, 2.3 - i * 0.36, 0.34 + i * 0.5, 3.9));
  return finish(p);
}

/** Practice sled with three pads, ~3 long, 2.2 tall. */
export function makeBlockingSled(): THREE.Group {
  const p: G[] = [
    part(new THREE.BoxGeometry(2.6, 0.24, 0.3), STEEL, -0.4, 0.12, -1.4),
    part(new THREE.BoxGeometry(2.6, 0.24, 0.3), STEEL, -0.4, 0.12, 1.4),
    part(new THREE.BoxGeometry(0.3, 0.24, 3.1), STEEL, -1.5, 0.12, 0),
    // the skid noses. part() scales BEFORE it rotates, so squashing the cone's
    // length here would have squashed its radius into Y instead — the radius is
    // what ends up vertical once it is laid down, and 0.3 of it hung under the field.
    part(new THREE.ConeGeometry(0.12, 0.6, 4), STEEL, 1.0, 0.12, -1.4, 0, 0, -Math.PI / 2),
    part(new THREE.ConeGeometry(0.12, 0.6, 4), STEEL, 1.0, 0.12, 1.4, 0, 0, -Math.PI / 2),
    part(new THREE.BoxGeometry(0.8, 0.3, 3.1), CHAR, -1.2, 0.4, 0),                 // ballast
  ];
  for (const pz of [-1.15, 0, 1.15]) {
    p.push(part(new THREE.CylinderGeometry(0.1, 0.12, 1.5, 7), STEEL, -0.3, 0.85, pz, 0, 0, -0.5));
    p.push(part(new THREE.BoxGeometry(0.44, 1.5, 0.85), CRIM, 0.45, 1.15, pz));
    p.push(part(new THREE.BoxGeometry(0.2, 1.3, 0.72), GOLD, 0.72, 1.2, pz));
    p.push(part(new THREE.CylinderGeometry(0.24, 0.24, 0.9, 10), CRIM_D, 0.5, 1.95, pz, Math.PI / 2));
  }
  return finish(p);
}

/** Motorhome with the awning out, a dish and deck chairs, ~12 long. */
export function makeRV(): THREE.Group {
  const p: G[] = [
    part(new THREE.BoxGeometry(10.4, 3.0, 3.2), CREAM, -0.4, 2.4, 0),
    part(new THREE.BoxGeometry(10.6, 0.3, 3.4), CRIM, -0.4, 3.95, 0),               // roof cap
    part(new THREE.BoxGeometry(10.5, 0.4, 3.3), CRIM, -0.4, 2.2, 0),                // waist stripe
    part(new THREE.BoxGeometry(10.5, 0.16, 3.3), GOLD, -0.4, 1.94, 0),
    part(new THREE.BoxGeometry(1.8, 2.0, 3.1), CREAM, 5.4, 2.1, 0, 0, 0, 0.12),     // cab
    part(new THREE.BoxGeometry(0.4, 1.2, 2.9), 0x3d4c5c, 6.2, 2.5, 0, 0, 0, 0.12),  // windscreen
    part(new THREE.BoxGeometry(0.6, 0.5, 3.2), STEEL, 6.3, 1.1, 0),
    part(new THREE.BoxGeometry(1.4, 0.5, 2.0), ALU, -2.0, 4.3, 0),                  // air con
  ];
  for (const wz of [-1.62, 1.62]) for (const wx of [-3.2, -0.6, 2.0])
    p.push(part(new THREE.BoxGeometry(1.7, 1.0, 0.14), 0x9fd0e0, wx, 2.9, wz));
  p.push(part(new THREE.BoxGeometry(0.9, 1.9, 0.16), CREAM, 3.4, 1.95, 1.62));      // door
  p.push(part(new THREE.BoxGeometry(0.7, 0.1, 0.5), ALU, 3.4, 0.95, 2.0));
  for (const sx of [-3.4, -2.3, 3.6]) { wheelParts(p, sx, 0.7, 1.62, 0.7); wheelParts(p, sx, 0.7, -1.62, 0.7); }
  // the awning, out over a small camp
  p.push(part(new THREE.BoxGeometry(6.0, 0.16, 3.0), CRIM, -0.6, 3.5, 3.1, -0.14));
  p.push(part(new THREE.BoxGeometry(6.0, 0.16, 0.9), WHITE, -0.6, 3.34, 4.3, -0.14));
  for (const ax of [-3.3, 2.1]) p.push(part(new THREE.CylinderGeometry(0.06, 0.08, 3.3, 6), ALU, ax, 1.65, 4.5));
  // the dish, which is aimed at nothing in particular
  p.push(part(new THREE.CylinderGeometry(0.16, 0.2, 0.5, 8), STEEL, 2.8, 4.2, -0.8));
  p.push(part(new THREE.SphereGeometry(0.7, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), ALU, 2.8, 4.45, -0.8, -0.8, 0, 0.4));
  p.push(part(new THREE.CylinderGeometry(0.06, 0.06, 0.6, 5), STEEL, 3.2, 4.9, -0.7, 0, 0, 0.6));
  chairParts(p, -1.6, 0, 4.2, 1, TEAL);
  chairParts(p, -0.2, 0, 4.3, 1, CRIM);
  p.push(part(new THREE.CylinderGeometry(0.42, 0.36, 0.5, 10), TIMBER, -0.9, 0.25, 3.4));
  p.push(part(new THREE.CylinderGeometry(0.46, 0.46, 0.08, 10), TIMBER_D, -0.9, 0.54, 3.4));
  cupParts(p, -0.9, 0.58, 3.4, 3);
  return finish(p);
}

// ══ SMALL STUFF — cheap, scattered by the hundred ════════════════════════

/** Overflowing car park bin, ~1.4 tall. */
export function makeTrashBarrel(): THREE.Group {
  const p: G[] = [
    part(new THREE.CylinderGeometry(0.46, 0.38, 1.1, 12), pick([CRIM, ASPHALT, GRASS]), 0, 0.55, 0),
    part(new THREE.TorusGeometry(0.46, 0.06, 5, 14), CHAR, 0, 1.08, 0, Math.PI / 2),
    part(new THREE.CylinderGeometry(0.44, 0.44, 0.14, 12), CHAR, 0, 1.14, 0),
    part(new THREE.SphereGeometry(0.4, 9, 7), 0x9aa0a8, 0, 1.3, 0, 0, 0, 0, 1, 0.6, 1),
  ];
  cupParts(p, 0.1, 1.4, 0.05, 3);
  p.push(part(new THREE.BoxGeometry(0.3, 0.06, 0.24), BUN, -0.5, 0.03, 0.4, 0, 0.6));
  p.push(part(new THREE.BoxGeometry(0.2, 0.06, 0.2), WHITE, 0.55, 0.03, -0.3, 0, -0.4));
  return finish(p);
}

/** A stack of traffic cones with one knocked over, ~1.4 across. */
export function makeConeStack(): THREE.Group {
  const p: G[] = [];
  for (let i = 0; i < 3; i++) {
    p.push(part(new THREE.BoxGeometry(0.62, 0.07, 0.62), ORANGE, 0, 0.035 + i * 0.14, 0));
    p.push(part(new THREE.ConeGeometry(0.26, 0.86, 8), ORANGE, 0, 0.5 + i * 0.14, 0));
    p.push(part(new THREE.ConeGeometry(0.2, 0.16, 8), WHITE, 0, 0.66 + i * 0.14, 0));
  }
  // the one that got clipped by a reversing pickup
  const down = new THREE.ConeGeometry(0.26, 0.86, 8);
  down.rotateZ(-Math.PI / 2);
  p.push(part(down, ORANGE, 0.95, 0.26, 0.5, 0, 0.4));
  p.push(part(new THREE.BoxGeometry(0.07, 0.62, 0.62), ORANGE, 0.58, 0.31, 0.34, 0, 0.4));
  return finish(p);
}

/** One camp chair with a cup in the holder, ~0.9 across. */
export function makeFoldingChair(): THREE.Group {
  const p: G[] = [];
  chairParts(p, 0, 0, 0, 1, pick([CRIM, CRIM, GOLD, TEAL, NAVY]));
  p.push(part(new THREE.CylinderGeometry(0.11, 0.09, 0.16, 8), STEEL, 0.28, 0.7, 0.48));
  p.push(part(new THREE.CylinderGeometry(0.09, 0.07, 0.2, 8), CRIM, 0.28, 0.86, 0.48));
  p.push(part(new THREE.BoxGeometry(0.14, 0.5, 0.62), GOLD, -0.44, 1.16, 0, 0, 0, 0.2));  // a jacket over the back
  return finish(p);
}

/** Two poles and a banner between them, ~4 wide, 3 tall. */
export function makeBanner(): THREE.Group {
  const col = pick([CRIM, CRIM, CRIM, GOLD, TEAL]);
  const p: G[] = [];
  for (const sz of [-1.9, 1.9]) {
    p.push(part(new THREE.CylinderGeometry(0.08, 0.1, 3.0, 6), ALU, 0, 1.5, sz));
    p.push(part(new THREE.SphereGeometry(0.13, 8, 6), GOLD, 0, 3.06, sz));
  }
  p.push(part(new THREE.BoxGeometry(0.1, 1.3, 3.7), col, 0, 2.1, 0));
  p.push(part(new THREE.BoxGeometry(0.06, 0.34, 2.9), col === GOLD ? CRIM : GOLD, 0.06, 2.1, 0));
  p.push(part(new THREE.BoxGeometry(0.06, 0.12, 3.7), WHITE, 0.05, 2.68, 0));
  p.push(part(new THREE.BoxGeometry(0.06, 0.12, 3.7), WHITE, 0.05, 1.52, 0));
  return finish(p);
}

/** A run of pennants between two stakes, ~6 long. */
export function makePennantString(): THREE.Group {
  const p: G[] = [];
  for (const sx of [-3.0, 3.0]) p.push(part(new THREE.CylinderGeometry(0.06, 0.07, 2.4, 5), STEEL, sx, 1.2, 0));
  buntingRun(p, [CRIM, GOLD, WHITE, CRIM, TEAL], -3.0, 2.3, 0, 3.0, 2.3, 0, 9, 0.55);
  return finish(p);
}

/** A football on the grass, ~0.7 long. On PROP_SMOOTH_MAT — it is a ball. */
export function makeFootball(): THREE.Group {
  const p: G[] = [
    part(new THREE.SphereGeometry(0.2, 14, 10), 0x8a4a2a, 0, 0.2, 0, 0, 0, 0, 1.6, 1.0, 1.0),
    part(new THREE.ConeGeometry(0.13, 0.16, 8), 0x8a4a2a, 0.34, 0.2, 0, 0, 0, -Math.PI / 2),
    part(new THREE.ConeGeometry(0.13, 0.16, 8), 0x8a4a2a, -0.34, 0.2, 0, 0, 0, Math.PI / 2),
    part(new THREE.CylinderGeometry(0.185, 0.185, 0.04, 12), WHITE, 0.15, 0.2, 0, 0, 0, Math.PI / 2),
    part(new THREE.CylinderGeometry(0.185, 0.185, 0.04, 12), WHITE, -0.15, 0.2, 0, 0, 0, Math.PI / 2),
  ];
  for (let i = 0; i < 4; i++) p.push(part(new THREE.BoxGeometry(0.03, 0.05, 0.08), WHITE, -0.09 + i * 0.06, 0.395, 0));
  return finishSoft(p);
}

/** A helmet left on the grass, ~1 across. On PROP_SMOOTH_MAT — it is a shell. */
export function makeHelmetProp(): THREE.Group {
  const shell = pick([CRIM, CRIM, CRIM, GOLD, TEAL]);
  const p: G[] = [
    part(new THREE.SphereGeometry(0.5, 14, 10), shell, 0, 0.5, 0, 0, 0, 0, 1.12, 1.0, 1.04),
    part(new THREE.SphereGeometry(0.13, 10, 8), shell === GOLD ? CRIM : GOLD, 0, 0.98, 0, 0, 0, 0, 3.6, 0.45, 1.0),
    part(new THREE.CylinderGeometry(0.14, 0.14, 0.1, 10), CHAR, 0, 0.5, 0.52, Math.PI / 2),
    part(new THREE.CylinderGeometry(0.14, 0.14, 0.1, 10), CHAR, 0, 0.5, -0.52, Math.PI / 2),
    part(new THREE.TorusGeometry(0.5, 0.05, 6, 14), shell === GOLD ? CRIM : GOLD, 0, 0.5, 0, Math.PI / 2, 0, 0, 1.12, 1.12, 1.04),
  ];
  for (let i = 0; i < 3; i++)
    p.push(part(new THREE.CylinderGeometry(0.035, 0.035, 0.62, 6), WHITE, 0.5 + i * 0.03, 0.2 + i * 0.16, 0, Math.PI / 2));
  p.push(part(new THREE.CylinderGeometry(0.035, 0.035, 0.42, 6), WHITE, 0.52, 0.36, 0, 0, 0, Math.PI / 2));
  return finishSoft(p);
}

/** A megaphone dropped on the tarmac, ~0.9 long. */
export function makeMegaphone(): THREE.Group {
  const p: G[] = [
    part(new THREE.ConeGeometry(0.3, 0.68, 10, 1, true), CRIM, 0.16, 0.3, 0, 0, 0, -Math.PI / 2),
    part(new THREE.CylinderGeometry(0.3, 0.3, 0.05, 10), GOLD, 0.5, 0.3, 0, 0, 0, Math.PI / 2),
    part(new THREE.CylinderGeometry(0.11, 0.13, 0.3, 8), CHAR, -0.28, 0.3, 0, 0, 0, Math.PI / 2),
    part(new THREE.BoxGeometry(0.16, 0.24, 0.14), CHAR, -0.16, 0.12, 0),
    part(new THREE.SphereGeometry(0.05, 7, 6), GOLD_L, -0.1, 0.36, 0.1),
  ];
  return finish(p);
}

// ══ MANIFEST ═════════════════════════════════════════════════════════════
// `r` is the edible radius (roughly half the footprint) used for scoring and
// size-gating. `district` lists where the scatterer may place the prop, using
// the ids from docs/GAMEDAY.md.
export const TAILGATE_KIT: { name: string; make: () => THREE.Group; r: number; district: string[] }[] = [
  // ── the meal at the end
  { name: 'stadium', make: makeStadium, r: 26.0, district: ['bowl'] },
  // ── the tailgate, the hero district
  { name: 'tailgateTruck', make: makeTailgateTruck, r: 3.4, district: ['lot', 'rvpark', 'greek'] },
  { name: 'canopy', make: makeCanopy, r: 1.9, district: ['lot', 'plaza', 'rvpark'] },
  { name: 'grill', make: makeGrill, r: 1.2, district: ['lot', 'rvpark', 'greek'] },
  { name: 'coolerStack', make: makeCoolerStack, r: 1.4, district: ['lot', 'rvpark', 'greek'] },
  { name: 'cornhole', make: makeCornhole, r: 4.4, district: ['lot', 'greek', 'practice'] },
  { name: 'tailgateTable', make: makeTailgateTable, r: 1.6, district: ['lot', 'rvpark', 'greek'] },
  { name: 'flagPole', make: makeFlagPole, r: 0.8, district: ['lot', 'rvpark'] },
  { name: 'portaloo', make: makePortaloo, r: 2.3, district: ['lot', 'plaza', 'practice'] },
  // ── gate plaza
  { name: 'ticketGate', make: makeTicketGate, r: 3.4, district: ['plaza'] },
  { name: 'merchStand', make: makeMerchStand, r: 2.0, district: ['plaza', 'lot'] },
  { name: 'helmetTunnel', make: makeHelmetTunnel, r: 5.0, district: ['plaza', 'practice'] },
  { name: 'concessionCart', make: makeConcessionCart, r: 1.7, district: ['plaza', 'lot', 'campus'] },
  // ── campus, frat row, practice field
  { name: 'fratHouse', make: makeFratHouse, r: 5.5, district: ['greek'] },
  { name: 'brickHall', make: makeBrickHall, r: 7.5, district: ['campus'] },
  { name: 'clockTower', make: makeClockTower, r: 2.4, district: ['campus'] },
  { name: 'goalpost', make: makeGoalpost, r: 2.8, district: ['practice', 'greek'] },
  { name: 'bleacherStack', make: makeBleacherStack, r: 3.4, district: ['practice', 'campus'] },
  { name: 'blockingSled', make: makeBlockingSled, r: 1.8, district: ['practice'] },
  { name: 'rv', make: makeRV, r: 6.0, district: ['rvpark', 'lot'] },
  // ── dressing, scattered by the hundred
  { name: 'trashBarrel', make: makeTrashBarrel, r: 0.5, district: ['lot', 'plaza', 'campus', 'greek', 'practice'] },
  { name: 'coneStack', make: makeConeStack, r: 0.6, district: ['lot', 'plaza', 'practice'] },
  { name: 'foldingChair', make: makeFoldingChair, r: 0.5, district: ['lot', 'rvpark', 'greek', 'practice'] },
  { name: 'banner', make: makeBanner, r: 1.9, district: ['plaza', 'greek', 'campus', 'lot'] },
  { name: 'pennantString', make: makePennantString, r: 3.0, district: ['lot', 'plaza', 'greek'] },
  { name: 'football', make: makeFootball, r: 0.35, district: ['practice', 'greek', 'campus', 'lot'] },
  { name: 'helmetProp', make: makeHelmetProp, r: 0.6, district: ['practice', 'lot', 'plaza'] },
  { name: 'megaphone', make: makeMegaphone, r: 0.45, district: ['plaza', 'lot', 'practice'] },
];
