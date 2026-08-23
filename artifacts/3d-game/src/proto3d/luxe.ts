// ══════════════════════════════════════════════════════════════════════════
//  PIRATE BAY RESORT — the luxury prop kit
//  A world-class resort with a (tastefully tasteless) pirate veneer: infinity
//  pools, superyachts, champagne towers, a valet stand and one genuinely
//  beautiful galleon.
//
//  House rules, same as island.ts:
//    • every prop is ONE merged mesh sharing PROP_SHARED_MAT (one draw call)
//    • no per-prop materials, no textures, flat shading, chunky silhouettes
//    • y = 0 is the ground plane, the prop's nose/front faces +X
//    • keep each prop under ~140 parts
// ══════════════════════════════════════════════════════════════════════════
import * as THREE from 'three';
import { part, mergedProp } from './island';
import { registerGloss } from './gloss';

/** A prop with NO FRONT. island.ts's place() turns anything tagged here by a
 *  hash of its own position, because 87% of Maple Falls sat at exactly 0
 *  radians and read as stamped. Anything with a door, a face, a screen or a
 *  direction must NOT be tagged — it keeps the facing its call site authored. */
const noFront = <T extends THREE.Object3D>(m: T): T => { m.userData.spin = 1; return m; };


type G = THREE.BufferGeometry;

// ── palette ───────────────────────────────────────────────────────────────
// Rich but bright and toy-like. The game deliberately avoids muddy browns.
const IVORY = 0xfdf3de;      // sails, walls, linen
const CREAM = 0xf6ead0;      // second cream, for banding
const WHITE = 0xfbfaf6;      // yacht gelcoat
const TEAK = 0xc79350;       // warm deck timber
const TEAK_D = 0x9a6a38;     // shadowed timber
const WOOD = 0xb0834e;       // masts, spars
const GOLD = 0xf0c050;       // trim
const GOLD_B = 0xffd23f;     // bright gold, treasure
const NAVY = 0x2c3f5e;       // hull bulwarks, awnings
const NAVY_L = 0x3d5680;
const TURQ = 0x3fc9d8;       // pool water
const AQUA = 0x4dd0e1;       // shallow water, glass
const CORAL = 0xff6a5e;      // stripes, cushions
const PALM = 0x3f8f52;       // foliage
const PALM_L = 0x56a862;
const SLATE = 0x9aa2ab;      // stone
const RED = 0xd85a5a;        // sail stripe, carpet
const BLUSH = 0xff8ac0;      // cushions, flowers
const MARBLE = 0xeceaf0;     // spa stone, plinths
const GLASS = 0x2f6f86;      // tinted glazing
const CHAR = 0x2a2430;       // near-black: flags, tyres, gun ports
const SAND = 0xeed9a0;
const MAROON = 0xa8544a;     // antifouling below the waterline
const ICE = 0xd8f0f6;

// ── WHAT SHINES ON PIRATE BAY ─────────────────────────────────────────────
// See installPropShader in island.ts. A resort is glass and polished metal
// and water, and this level had 3.7% of its triangles able to show any of it
// — nearly all of that the lagoon, none of it the props sitting in it.
// Treasure runs highest: gold that cannot catch the light is a yellow box,
// and a chest of yellow boxes is the one prop in this game a six-year-old is
// most certain they already know the look of.
registerGloss([
  [GOLD, 0.62], [GOLD_B, 0.78], [GLASS, 0.80], [AQUA, 0.62], [TURQ, 0.58],
  [MARBLE, 0.34], [SLATE, 0.20], [ICE, 0.50],
  // the banding cream is 6.2% of Pirate Bay's vertices (qa/glossgap.mjs) and
  // was dead matte — painted plaster, same 0.18 as Maple's house paint
  [CREAM, 0.18],
], 'luxe');

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T>(a: T[]): T => a[(Math.random() * a.length) | 0];
const finish = (parts: G[]): THREE.Group => { const g = new THREE.Group(); g.add(mergedProp(parts)); return g; };

// ── shared geometry helpers ───────────────────────────────────────────────

// A rope / rigging line: one thin cylinder spanning two arbitrary points.
// part() applies rotateX then rotateY then rotateZ, so with rx+rz alone a
// +Y cylinder ends up along (-cos(rx)sin(rz), cos(rx)cos(rz), sin(rx)).
function rope(a: [number, number, number], b: [number, number, number], col: number, r = 0.06, seg = 4): G {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
  const len = Math.hypot(dx, dy, dz) || 0.001;
  const rx = Math.asin(Math.max(-1, Math.min(1, dz / len)));
  const rz = Math.atan2(-dx / len, dy / len);
  return part(new THREE.CylinderGeometry(r, r, len, seg), col,
    (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2, rx, 0, rz);
}

// A billowing sail: vertical slats laid on a parabolic arc so the surface is
// genuinely curved AND solid (visible from both sides, unlike an open shell).
// `cols` is one colour per slat — that's how the red centre stripe is free.
function sailPanel(out: G[], cols: number[], cx: number, cy: number, cz: number,
                   w: number, h: number, bow: number, th = 0.18) {
  const n = cols.length;
  for (let i = 0; i < n; i++) {
    const t = ((i + 0.5) / n) * 2 - 1;              // −1..1 across the width
    const f = 1 - t * t;                             // fullest in the middle
    const slope = (-2 * bow * t) / (w / 2);
    out.push(part(new THREE.BoxGeometry(th, h * (1 + 0.09 * f), (w / n) * 1.14), cols[i],
      cx + bow * f, cy - h * 0.045 * f, cz + (t * w) / 2, 0, Math.atan(slope), 0));
  }
}

// A rippling flag streaming toward −X (or +X with dir = 1).
function flagWave(out: G[], col: number, x: number, y: number, z: number,
                  len: number, h: number, n = 4, amp = 0.22, dir = -1) {
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    out.push(part(new THREE.BoxGeometry((len / n) * 1.12, h * (1 - 0.14 * t), 0.13), col,
      x + dir * t * len, y - h * 0.05 * t, z + Math.sin(t * 5.5) * amp));
  }
}

// A striped fabric canopy made of gores (used by parasols and pavilions).
function goreCanopy(out: G[], cols: number[], x: number, y: number, z: number, r: number, droop = 0.3) {
  const n = cols.length;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const gore = new THREE.BoxGeometry(r * 1.02, 0.09, (r * 1.35) / (n / 4));
    gore.rotateZ(-droop);
    out.push(part(gore, cols[i], x + Math.cos(a) * r * 0.5, y, z + Math.sin(a) * r * 0.5, 0, -a, 0));
  }
}

// A sun lounger, dropped straight into a bigger prop's part list.
function loungerParts(out: G[], x: number, y: number, z: number, faceX = 1, accent = NAVY) {
  const f = faceX;
  for (const sx of [-0.82, 0.82]) for (const sz of [-0.36, 0.36])
    out.push(part(new THREE.CylinderGeometry(0.06, 0.06, 0.46, 5), GOLD, x + sx, y + 0.23, z + sz));
  out.push(part(new THREE.BoxGeometry(2.0, 0.16, 0.94), IVORY, x, y + 0.52, z));
  out.push(part(new THREE.BoxGeometry(1.86, 0.14, 0.84), CREAM, x, y + 0.63, z));
  out.push(part(new THREE.BoxGeometry(0.32, 0.15, 0.86), accent, x + f * 0.26, y + 0.64, z));
  out.push(part(new THREE.BoxGeometry(0.98, 0.15, 0.9), CREAM, x - f * 1.2, y + 0.92, z, 0, 0, -f * 0.6));
  out.push(part(new THREE.CylinderGeometry(0.13, 0.13, 0.78, 8), IVORY, x - f * 0.62, y + 0.76, z, Math.PI / 2));
}

// ══ HERO 1 ═══════════════════════════════════════════════════════════════
/** THE BLACK PEARL OF THE 1%: a three-mast galleon; hull ~30, ~38 over the
 *  bowsprit, ~26 to the maintruck. The kit's hero — 140 parts, one draw call. */
export function makeGalleon(): THREE.Group {
  const p: G[] = [];
  const HL = 14.5;                     // hull runs x = −14.5 … +14.5

  // ── hull: five stacked strakes. Each strake is TWO tapered cylinders (stern
  // half + bow half) so the plan view is fair — widest amidships, pointed at
  // the bow — and each cross-section is round, not a slab.
  // [ y, verticalSquash, rStern, rMid, rBow, beamScale, colour ]
  const STRAKES: [number, number, number, number, number, number, number][] = [
    [1.35, 0.55, 2.20, 2.50, 0.60, 1.28, MAROON],   // underbody
    [2.95, 0.42, 2.30, 2.60, 0.70, 1.28, TEAK],     // main planking
    [4.10, 0.11, 2.34, 2.65, 0.74, 1.30, GOLD],     // gilded wale
    [5.00, 0.34, 2.32, 2.62, 0.72, 1.26, NAVY],     // bulwark
    [5.85, 0.09, 2.36, 2.67, 0.76, 1.31, GOLD],     // cap rail
    [6.02, 0.10, 2.10, 2.40, 0.55, 1.18, 0xe8c07a], // deck (proud of the rail)
  ];
  for (const [y, sq, rS, rM, rB, bs, col] of STRAKES) {
    p.push(part(new THREE.CylinderGeometry(rM, rS, HL, 12), col, -HL / 2, y, 0, 0, 0, -Math.PI / 2, sq, 1, bs));
    p.push(part(new THREE.CylinderGeometry(rB, rM, HL, 12), col, HL / 2, y, 0, 0, 0, -Math.PI / 2, sq, 1, bs));
  }
  const DECK = 6.26;
  // half-beam of a strake at a given x, for hanging things off the hull sides
  const hbAt = (x: number, rS: number, rM: number, rB: number, bs: number) =>
    bs * (x < 0 ? rS + (rM - rS) * ((x + HL) / HL) : rM + (rB - rM) * (x / HL));
  const railHB = (x: number) => hbAt(x, 2.36, 2.67, 0.76, 1.31);
  const sideHB = (x: number) => hbAt(x, 2.30, 2.60, 0.70, 1.28) * 0.94;

  // ── gun ports with cannon muzzles poking out
  for (const gx of [-5.5, 1.5]) for (const sz of [-1, 1]) {
    const z = sz * sideHB(gx);
    p.push(part(new THREE.BoxGeometry(1.0, 0.86, 0.26), CHAR, gx, 3.35, z));
    p.push(part(new THREE.CylinderGeometry(0.19, 0.24, 0.9, 8), 0x3a3f46, gx, 3.35, z + sz * 0.42, Math.PI / 2));
  }

  // ── square stern: transom, gilt frame and cabin windows
  p.push(part(new THREE.BoxGeometry(1.0, 4.6, 5.8), TEAK, -14.75, 3.6, 0));
  p.push(part(new THREE.BoxGeometry(1.16, 0.3, 5.9), GOLD, -14.75, 5.75, 0));
  p.push(part(new THREE.BoxGeometry(1.16, 0.26, 5.9), GOLD, -14.75, 4.05, 0));
  for (const wy of [3.25, 4.85]) for (const wz of [-1.75, 0, 1.75])
    p.push(part(new THREE.BoxGeometry(0.3, 1.0, 1.05), AQUA, -15.3, wy, wz));
  for (const wz of [-2.6, 2.6])
    p.push(part(new THREE.BoxGeometry(0.34, 3.2, 0.2), GOLD, -15.3, 4.05, wz));

  // ── stern castle: two raised tiers with the great cabin under them
  p.push(part(new THREE.BoxGeometry(8.0, 2.2, 5.6), NAVY, -10.5, 7.36, 0));
  p.push(part(new THREE.BoxGeometry(8.2, 0.24, 5.8), GOLD, -10.5, 8.5, 0));
  p.push(part(new THREE.BoxGeometry(7.9, 0.26, 5.5), 0xe8c07a, -10.5, 8.7, 0));
  for (const sz of [-1, 1]) for (const wx of [-12.6, -10.5, -8.4])
    p.push(part(new THREE.BoxGeometry(1.0, 0.9, 0.24), AQUA, wx, 7.4, sz * 2.82));
  p.push(part(new THREE.BoxGeometry(5.0, 1.8, 4.8), NAVY, -12.2, 9.7, 0));
  p.push(part(new THREE.BoxGeometry(5.3, 0.24, 5.1), GOLD, -12.2, 10.7, 0));
  p.push(part(new THREE.BoxGeometry(5.0, 0.24, 4.7), 0xe8c07a, -12.2, 10.9, 0));
  // stern lantern on a gilt bracket, plus quarter lanterns
  p.push(part(new THREE.CylinderGeometry(0.09, 0.09, 1.1, 5), GOLD, -14.9, 11.4, 0));
  p.push(part(new THREE.SphereGeometry(0.46, 9, 7), GOLD_B, -14.9, 12.2, 0));
  p.push(part(new THREE.ConeGeometry(0.34, 0.42, 6), GOLD, -14.9, 12.7, 0));

  // ── forecastle
  p.push(part(new THREE.BoxGeometry(4.6, 1.6, 2.8), NAVY, 10.2, 7.06, 0));
  p.push(part(new THREE.BoxGeometry(4.8, 0.22, 3.0), GOLD, 10.2, 7.95, 0));
  p.push(part(new THREE.BoxGeometry(4.5, 0.24, 2.7), 0xe8c07a, 10.2, 8.14, 0));

  // ── beakhead, bowsprit and a gilded mermaid figurehead
  p.push(part(new THREE.ConeGeometry(0.98, 3.6, 6), TEAK, 15.9, 5.5, 0, 0, 0, -Math.PI / 2));
  for (const sz of [-1, 1]) p.push(part(new THREE.BoxGeometry(3.2, 0.16, 0.16), GOLD, 15.6, 6.2, sz * 0.62, 0, 0, 0.13));
  p.push(part(new THREE.SphereGeometry(0.62, 10, 8), GOLD_B, 15.1, 4.85, 0, 0, 0, 0.2, 0.95, 1.15, 0.7));
  p.push(part(new THREE.SphereGeometry(0.33, 9, 7), IVORY, 15.65, 5.75, 0));
  p.push(part(new THREE.SphereGeometry(0.36, 8, 6), RED, 15.35, 5.92, 0, 0, 0, 0, 0.9, 0.8, 0.85));
  p.push(part(new THREE.ConeGeometry(0.42, 2.4, 6), GOLD_B, 13.9, 4.0, 0, 0, 0, Math.PI / 2 + 0.35));
  p.push(part(new THREE.BoxGeometry(0.9, 0.16, 1.5), GOLD_B, 12.85, 3.35, 0, 0, 0, 0.2));
  p.push(part(new THREE.CylinderGeometry(0.24, 0.34, 7.5, 8), WOOD, 17.05, 7.45, 0, 0, 0, -Math.PI / 2 + 0.32));
  p.push(part(new THREE.SphereGeometry(0.26, 8, 6), GOLD_B, 20.6, 8.62, 0));
  p.push(part(new THREE.BoxGeometry(0.2, 0.2, 4.2), WOOD, 17.0, 7.32, 0));
  sailPanel(p, [IVORY, IVORY, IVORY], 17.0, 6.1, 0, 3.8, 1.9, 0.42);

  // ── three masts, tops, crow's nests and yards
  const MASTS: [number, number, number, number, number][] = [
    // x, base y, lower-mast top, topmast top, radius
    [-1.0, DECK, 18.2, 25.4, 0.44],   // main
    [7.0, DECK, 16.2, 22.2, 0.38],    // fore
    [-9.0, 8.95, 17.4, 21.6, 0.32],   // mizzen (stands on the quarterdeck)
  ];
  for (const [mx, by, lt, tt, r] of MASTS) {
    p.push(part(new THREE.CylinderGeometry(r * 0.78, r, lt - by, 8), WOOD, mx, (by + lt) / 2, 0));
    p.push(part(new THREE.CylinderGeometry(r * 0.5, r * 0.72, tt - lt + 1.4, 7), WOOD, mx, (lt + tt) / 2 - 0.7, 0));
    p.push(part(new THREE.CylinderGeometry(r * 1.05, r * 1.05, 0.22, 8), GOLD, mx, lt - 3.0, 0));
  }
  // crow's nests on the main and fore
  for (const [mx, ny] of [[-1.0, 15.0], [7.0, 13.6]] as [number, number][]) {
    p.push(part(new THREE.CylinderGeometry(1.35, 0.92, 0.78, 10), TEAK, mx, ny, 0));
    p.push(part(new THREE.TorusGeometry(1.3, 0.1, 5, 14), GOLD, mx, ny + 0.44, 0, Math.PI / 2));
  }
  // yards + the sails they carry (ivory with a bold red centre stripe — black
  // sails read as flat holes at this camera distance)
  const IV = IVORY, S3 = [IV, RED, IV], S5 = [IV, IV, RED, IV, IV];
  p.push(part(new THREE.BoxGeometry(0.3, 0.3, 12.4), WOOD, -1.0, 14.0, 0));
  sailPanel(p, S5, -1.0, 10.6, 0, 11.0, 6.4, 0.95);
  p.push(part(new THREE.BoxGeometry(0.26, 0.26, 9.0), WOOD, -1.0, 20.4, 0));
  sailPanel(p, S3, -1.0, 17.9, 0, 8.0, 4.6, 0.7);
  p.push(part(new THREE.BoxGeometry(0.22, 0.22, 5.6), WOOD, -1.0, 24.2, 0));
  p.push(part(new THREE.CylinderGeometry(0.3, 0.3, 5.0, 8), CREAM, -1.0, 23.9, 0, Math.PI / 2));  // furled
  p.push(part(new THREE.BoxGeometry(0.28, 0.28, 10.4), WOOD, 7.0, 12.6, 0));
  sailPanel(p, S3, 7.0, 9.9, 0, 9.0, 5.4, 0.8);
  p.push(part(new THREE.BoxGeometry(0.24, 0.24, 7.4), WOOD, 7.0, 18.4, 0));
  sailPanel(p, S3, 7.0, 16.4, 0, 6.6, 4.0, 0.6);
  p.push(part(new THREE.BoxGeometry(0.24, 0.24, 7.4), WOOD, -9.0, 15.4, 0));
  sailPanel(p, S3, -9.0, 13.2, 0, 6.4, 4.4, 0.62);
  p.push(part(new THREE.CylinderGeometry(0.26, 0.26, 4.6, 8), CREAM, -9.0, 19.4, 0, Math.PI / 2));  // furled

  // ── RIGGING: the thing that actually sells a ship
  const SH: [number, number, number, number, number[]][] = [
    // mast x, masthead y, anchor x spread, anchor deck y, shroud offsets per side
    [-1.0, 18.2, 2.6, DECK, [-1, 0, 1]], [7.0, 16.2, 1.9, DECK, [-1, 1]], [-9.0, 17.4, 1.5, 8.95, [-1, 1]],
  ];
  for (const [mx, my, spread, ay, ks] of SH) {
    for (const sz of [-1, 1]) for (const k of ks) {
      const ax = mx + k * spread;
      p.push(rope([mx, my, 0], [ax, ay, sz * Math.max(1.4, railHB(ax) - 0.25)], 0x6f5a3e, 0.055));
    }
  }
  p.push(rope([-1.0, 25.4, 0], [19.6, 8.3, 0], 0x6f5a3e, 0.06));           // main forestay
  p.push(rope([7.0, 22.2, 0], [18.6, 8.0, 0], 0x6f5a3e, 0.055));           // fore forestay
  p.push(rope([-1.0, 18.0, 0], [7.0, 13.4, 0], 0x6f5a3e, 0.05));           // main→fore stay
  p.push(rope([-9.0, 17.4, 0], [-1.0, 15.4, 0], 0x6f5a3e, 0.05));          // mizzen stay
  for (const sz of [-1, 1]) p.push(rope([-1.0, 25.4, 0], [-14.0, 6.4, sz * 1.9], 0x6f5a3e, 0.05));

  // ── colours flying: jolly roger at the main truck, ensign at the stern
  flagWave(p, CHAR, -1.35, 24.5, 0, 2.7, 1.7, 3, 0.24);
  p.push(part(new THREE.SphereGeometry(0.3, 9, 7), IVORY, -2.05, 24.6, 0.06));
  for (const ez of [-0.14, 0.14]) p.push(part(new THREE.BoxGeometry(0.14, 0.14, 0.12), CHAR, -2.22, 24.72, ez));
  p.push(part(new THREE.BoxGeometry(0.5, 0.12, 0.12), IVORY, -2.02, 24.16, 0, 0, 0, 0.4));
  p.push(part(new THREE.ConeGeometry(0.42, 3.0, 3), RED, 5.6, 22.2, 0, 0, 0, Math.PI / 2, 1, 1, 0.12));
  p.push(part(new THREE.CylinderGeometry(0.09, 0.11, 3.0, 6), WOOD, -15.3, 7.4, 0, 0, 0, 0.3));
  flagWave(p, CORAL, -15.9, 8.5, 0, 1.5, 1.1, 2, 0.16);

  // ── ship's wheel, binnacle and companionway on the quarterdeck
  p.push(part(new THREE.BoxGeometry(0.5, 1.0, 0.5), TEAK, -7.2, 9.35, 0));
  p.push(part(new THREE.TorusGeometry(0.7, 0.1, 5, 12), GOLD_B, -7.2, 10.15, 0, 0, Math.PI / 2));
  p.push(part(new THREE.BoxGeometry(0.1, 1.44, 0.1), GOLD_B, -7.2, 10.15, 0));
  p.push(part(new THREE.BoxGeometry(0.1, 0.1, 1.44), GOLD_B, -7.2, 10.15, 0));
  p.push(part(new THREE.BoxGeometry(1.2, 0.7, 1.2), TEAK, -5.4, 9.2, 0));
  p.push(part(new THREE.SphereGeometry(0.3, 8, 6), GOLD_B, -5.4, 9.7, 0));
  // a couple of gilt scroll flourishes on the wale
  for (const sz of [-1, 1])
    p.push(part(new THREE.TorusGeometry(0.4, 0.11, 5, 10), GOLD_B, -11.5, 4.6, sz * (railHB(-11.5) - 0.1), Math.PI / 2));
  return finish(p);
}

// ══ HERO 2 ═══════════════════════════════════════════════════════════════
/** SEA WITCH: a gleaming billionaire's superyacht, ~30 long, ~14 tall. */
export function makeSuperYacht(): THREE.Group {
  const p: G[] = [];
  const HL = 14.0;
  // sleek white hull: same two-cylinder trick, much finer entry at the bow
  const BANDS: [number, number, number, number, number, number, number][] = [
    [0.85, 0.42, 1.90, 2.10, 0.38, 1.28, NAVY],     // boot top
    [2.05, 0.50, 2.00, 2.22, 0.44, 1.30, WHITE],    // topsides
    [3.05, 0.07, 2.04, 2.26, 0.48, 1.32, GOLD],     // gold sheer stripe
    [3.30, 0.10, 1.86, 2.06, 0.36, 1.20, 0xf0ece2], // main deck
  ];
  for (const [y, sq, rS, rM, rB, bs, col] of BANDS) {
    p.push(part(new THREE.CylinderGeometry(rM, rS, HL, 12), col, -HL / 2, y, 0, 0, 0, -Math.PI / 2, sq, 1, bs));
    p.push(part(new THREE.CylinderGeometry(rB, rM, HL, 12), col, HL / 2, y, 0, 0, 0, -Math.PI / 2, sq, 1, bs));
  }
  // hull portholes + a swim platform at the transom
  for (const sz of [-1, 1]) for (const wx of [-8, -5.4, -2.8, -0.2])
    p.push(part(new THREE.BoxGeometry(1.1, 0.4, 0.2), GLASS, wx, 2.3, sz * 2.7));
  p.push(part(new THREE.BoxGeometry(2.4, 0.3, 4.6), 0xf0ece2, -15.0, 2.1, 0));
  p.push(part(new THREE.BoxGeometry(0.3, 1.4, 4.8), WHITE, -14.1, 2.6, 0));

  // three decks of superstructure with tinted glass bands
  p.push(part(new THREE.BoxGeometry(13.0, 2.3, 5.2), WHITE, -2.0, 4.6, 0));
  p.push(part(new THREE.BoxGeometry(13.2, 0.95, 5.36), GLASS, -2.0, 4.9, 0));
  p.push(part(new THREE.BoxGeometry(13.4, 0.16, 5.5), GOLD, -2.0, 5.78, 0));
  p.push(part(new THREE.BoxGeometry(12.6, 0.16, 4.8), 0xf0ece2, -2.0, 5.9, 0));
  p.push(part(new THREE.BoxGeometry(9.0, 2.1, 4.4), WHITE, -3.6, 6.95, 0));
  p.push(part(new THREE.BoxGeometry(9.2, 0.85, 4.56), GLASS, -3.6, 7.2, 0));
  p.push(part(new THREE.BoxGeometry(9.4, 0.16, 4.7), GOLD, -3.6, 8.05, 0));
  p.push(part(new THREE.BoxGeometry(8.6, 0.16, 4.0), 0xf0ece2, -3.6, 8.17, 0));
  p.push(part(new THREE.BoxGeometry(5.4, 1.9, 3.6), WHITE, -4.6, 9.1, 0));
  p.push(part(new THREE.BoxGeometry(5.5, 0.8, 3.74), GLASS, -4.6, 9.4, 0));
  p.push(part(new THREE.BoxGeometry(5.6, 0.16, 3.9), GOLD, -4.6, 10.1, 0));
  p.push(part(new THREE.BoxGeometry(4.9, 0.16, 3.2), 0xf0ece2, -4.6, 10.22, 0));

  // radar mast: dome, crossbar, spinner and whip antennae
  p.push(part(new THREE.CylinderGeometry(0.14, 0.22, 3.2, 7), WHITE, -6.2, 11.7, 0));
  p.push(part(new THREE.BoxGeometry(0.18, 0.18, 3.2), WHITE, -6.2, 12.4, 0));
  p.push(part(new THREE.SphereGeometry(0.62, 10, 8), 0xf4f6fa, -6.2, 13.4, 0));
  p.push(part(new THREE.BoxGeometry(0.24, 0.14, 2.2), SLATE, -6.2, 12.9, 0, 0, 0.5));
  for (const sz of [-1, 1]) p.push(part(new THREE.CylinderGeometry(0.05, 0.05, 1.8, 4), SLATE, -6.2, 13.1, sz * 1.5));
  // the joke: a tiny jolly roger on the mast
  flagWave(p, CHAR, -6.5, 12.9, 0.05, 1.2, 0.72, 3, 0.1);
  p.push(part(new THREE.SphereGeometry(0.15, 7, 6), IVORY, -6.85, 12.94, 0.08));

  // helipad on the foredeck: dark disc, white ring, a big H, edge lights
  p.push(part(new THREE.CylinderGeometry(3.1, 3.1, 0.16, 20), 0x39434f, 7.6, 3.5, 0));
  p.push(part(new THREE.TorusGeometry(2.6, 0.12, 5, 22), WHITE, 7.6, 3.6, 0, Math.PI / 2));
  p.push(part(new THREE.BoxGeometry(0.28, 0.1, 1.7), WHITE, 6.9, 3.62, 0));
  p.push(part(new THREE.BoxGeometry(0.28, 0.1, 1.7), WHITE, 8.3, 3.62, 0));
  p.push(part(new THREE.BoxGeometry(1.4, 0.1, 0.28), WHITE, 7.6, 3.62, 0));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    p.push(part(new THREE.CylinderGeometry(0.09, 0.09, 0.2, 5), GOLD_B, 7.6 + Math.cos(a) * 2.9, 3.68, Math.sin(a) * 2.9));
  }

  // jacuzzi on the aft deck + loungers + a parasol
  p.push(part(new THREE.CylinderGeometry(1.5, 1.6, 0.85, 14), WHITE, -10.4, 3.85, 0));
  p.push(part(new THREE.CylinderGeometry(1.28, 1.28, 0.24, 14), TURQ, -10.4, 4.24, 0));
  for (let i = 0; i < 5; i++) p.push(part(new THREE.SphereGeometry(0.2, 7, 6), 0xa8ecf4,
    -10.4 + Math.cos(i * 1.3) * 0.7, 4.36, Math.sin(i * 1.3) * 0.7));
  p.push(part(new THREE.TorusGeometry(1.58, 0.09, 5, 16), GOLD, -10.4, 4.3, 0, Math.PI / 2));
  loungerParts(p, -13.0, 3.5, -1.2, 1, NAVY);
  loungerParts(p, -13.0, 3.5, 1.2, 1, NAVY);

  // gold rails and stanchions round the sheer
  for (const sz of [-1, 1]) {
    p.push(part(new THREE.BoxGeometry(19.0, 0.1, 0.1), GOLD, 0.5, 4.5, sz * 2.55));
    for (let i = 0; i < 7; i++) p.push(part(new THREE.CylinderGeometry(0.05, 0.05, 1.0, 5), GOLD, -6.5 + i * 3.0, 4.0, sz * 2.55));
  }
  p.push(part(new THREE.CylinderGeometry(0.18, 0.22, 0.7, 8), GOLD_B, 12.6, 3.7, 0));  // bow capstan
  p.push(part(new THREE.ConeGeometry(0.5, 1.0, 6), GOLD_B, 13.6, 3.6, 0, 0, 0, -Math.PI / 2));
  return finish(p);
}

// ══ THE RESORT KIT ═══════════════════════════════════════════════════════

/** Raised infinity pool deck with a spill edge and loungers, ~14 × 10. */
export function makeInfinityPool(): THREE.Group {
  const p: G[] = [
    part(new THREE.BoxGeometry(14, 0.9, 10), MARBLE, 0, 0.45, 0),
    part(new THREE.BoxGeometry(9.8, 0.34, 6.8), 0x1c8fa0, 0, 0.86, 0),      // pool shell
    part(new THREE.BoxGeometry(9.6, 0.22, 6.6), TURQ, 0, 1.0, 0),           // water
    part(new THREE.BoxGeometry(5.4, 0.08, 3.0), 0x8ee8f2, -0.8, 1.1, 0),    // sun shimmer
  ];
  // coping ring
  for (const sz of [-3.6, 3.6]) p.push(part(new THREE.BoxGeometry(10.6, 0.28, 0.7), IVORY, 0, 1.02, sz));
  p.push(part(new THREE.BoxGeometry(0.7, 0.28, 7.9), IVORY, -5.2, 1.02, 0));
  // the infinity edge: a lip, a falling sheet of water, a catch trough
  p.push(part(new THREE.BoxGeometry(0.4, 1.5, 7.9), MARBLE, 5.1, 0.75, 0));
  p.push(part(new THREE.BoxGeometry(0.22, 1.35, 6.7), AQUA, 5.36, 0.62, 0));
  p.push(part(new THREE.BoxGeometry(1.7, 0.34, 8.2), TURQ, 6.2, 0.2, 0));
  p.push(part(new THREE.BoxGeometry(0.5, 0.5, 8.4), IVORY, 7.2, 0.3, 0));
  // steps in at the shallow end
  for (let i = 0; i < 3; i++) p.push(part(new THREE.BoxGeometry(0.7, 0.2, 2.6), 0x7fdce8, -4.4 + i * 0.7, 1.02 - i * 0.16, 0));
  // loungers and parasols along the far side
  loungerParts(p, -3.4, 0.9, -4.3, 1, CORAL);
  loungerParts(p, -0.6, 0.9, -4.3, 1, NAVY);
  loungerParts(p, 2.2, 0.9, -4.3, 1, CORAL);
  for (const px of [-2.0, 3.6]) {
    p.push(part(new THREE.CylinderGeometry(0.07, 0.09, 3.0, 6), IVORY, px, 2.4, -4.4));
    goreCanopy(p, [IVORY, CORAL, IVORY, CORAL, IVORY, CORAL], px, 3.7, -4.4, 1.7, 0.3);
    p.push(part(new THREE.SphereGeometry(0.16, 7, 6), GOLD, px, 4.05, -4.4));
  }
  // a folded towel and a drink on the coping
  p.push(part(new THREE.BoxGeometry(0.7, 0.22, 0.5), IVORY, -5.2, 1.26, 2.2));
  p.push(part(new THREE.CylinderGeometry(0.14, 0.1, 0.34, 8), GOLD_B, 4.6, 1.34, 2.6));
  return finish(p);
}

/** Draped four-poster beach cabana with tied curtains, ~7 square, 7 tall. */
export function makeCabanaLux(): THREE.Group {
  const p: G[] = [
    part(new THREE.BoxGeometry(6.4, 0.4, 6.4), 0xe8dcc0, 0, 0.2, 0),
    part(new THREE.BoxGeometry(5.4, 0.1, 5.4), 0xd8c8a8, 0, 0.42, 0),
  ];
  for (const sx of [-2.7, 2.7]) for (const sz of [-2.7, 2.7]) {
    p.push(part(new THREE.CylinderGeometry(0.15, 0.18, 4.3, 8), IVORY, sx, 2.55, sz));
    p.push(part(new THREE.SphereGeometry(0.19, 8, 6), GOLD, sx, 4.78, sz));
    // a tied-back drape at each post: gathered top, gold rope, falling skirt
    const ix = sx * 0.86, iz = sz * 0.86;
    p.push(part(new THREE.CylinderGeometry(0.36, 0.2, 1.7, 8), IVORY, ix, 3.7, iz));
    p.push(part(new THREE.TorusGeometry(0.22, 0.07, 5, 10), GOLD, ix, 2.85, iz, Math.PI / 2));
    p.push(part(new THREE.CylinderGeometry(0.2, 0.46, 2.4, 8), IVORY, ix, 1.65, iz));
  }
  // roof: flat frame, pitched canvas, scalloped valance, coral finial
  p.push(part(new THREE.BoxGeometry(6.9, 0.24, 6.9), IVORY, 0, 4.72, 0));
  p.push(part(new THREE.ConeGeometry(5.0, 1.7, 4), CORAL, 0, 5.7, 0, 0, Math.PI / 4));
  p.push(part(new THREE.SphereGeometry(0.34, 9, 7), GOLD_B, 0, 6.6, 0));
  for (const sz of [-1, 1]) for (let i = 0; i < 5; i++) {
    p.push(part(new THREE.SphereGeometry(0.34, 7, 6), CREAM, -2.6 + i * 1.3, 4.5, sz * 3.42, 0, 0, 0, 1, 0.7, 0.5));
    p.push(part(new THREE.SphereGeometry(0.34, 7, 6), CREAM, sz * 3.42, 4.5, -2.6 + i * 1.3, 0, 0, 0, 0.5, 0.7, 1));
  }
  // back wall + daybed + cushions + a side table
  p.push(part(new THREE.BoxGeometry(0.16, 3.4, 5.4), IVORY, -2.9, 2.3, 0));
  p.push(part(new THREE.BoxGeometry(3.4, 0.6, 2.8), 0xf0e6d0, -0.6, 0.72, 0));
  p.push(part(new THREE.BoxGeometry(3.5, 0.24, 2.9), IVORY, -0.6, 1.1, 0));
  p.push(part(new THREE.BoxGeometry(0.5, 0.7, 2.7), CREAM, -2.15, 1.35, 0, 0, 0, -0.35));
  for (const cz of [-0.8, 0.0, 0.8]) p.push(part(new THREE.BoxGeometry(0.6, 0.4, 0.66), pick([CORAL, TURQ, BLUSH]), -1.8, 1.4, cz));
  p.push(part(new THREE.CylinderGeometry(0.5, 0.42, 0.6, 10), TEAK, 1.9, 0.72, 1.6));
  p.push(part(new THREE.CylinderGeometry(0.16, 0.11, 0.36, 8), GOLD_B, 1.9, 1.2, 1.6));
  return finish(p);
}

/** Open spa pagoda with massage beds and hanging lanterns, ~13 wide, 12 tall. */
export function makeSpaPavilion(): THREE.Group {
  const p: G[] = [
    part(new THREE.CylinderGeometry(5.6, 6.0, 0.8, 8), MARBLE, 0, 0.4, 0),
    part(new THREE.CylinderGeometry(5.1, 5.1, 0.12, 8), 0xe4e0e8, 0, 0.86, 0),
    part(new THREE.BoxGeometry(2.4, 0.28, 1.4), MARBLE, 5.6, 0.26, 0),
  ];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    p.push(part(new THREE.CylinderGeometry(0.19, 0.22, 4.6, 8), IVORY, Math.cos(a) * 4.7, 3.1, Math.sin(a) * 4.7));
  }
  p.push(part(new THREE.TorusGeometry(4.8, 0.12, 5, 18), GOLD, 0, 5.2, 0, Math.PI / 2));
  p.push(part(new THREE.ConeGeometry(5.7, 2.2, 8), 0x2fb8a8, 0, 6.4, 0));
  p.push(part(new THREE.CylinderGeometry(2.3, 2.3, 0.2, 8), IVORY, 0, 7.5, 0));
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    p.push(part(new THREE.CylinderGeometry(0.13, 0.13, 1.6, 6), IVORY, Math.cos(a) * 1.8, 8.3, Math.sin(a) * 1.8));
  }
  p.push(part(new THREE.ConeGeometry(3.2, 1.8, 8), 0x2fb8a8, 0, 9.8, 0));
  p.push(part(new THREE.SphereGeometry(0.42, 9, 7), GOLD_B, 0, 10.7, 0));
  p.push(part(new THREE.ConeGeometry(0.2, 0.7, 6), GOLD, 0, 11.25, 0));
  // lanterns hung outside the eaves, where they can actually be seen
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.7;
    const lx = Math.cos(a) * 5.3, lz = Math.sin(a) * 5.3;
    p.push(part(new THREE.CylinderGeometry(0.035, 0.035, 1.3, 4), TEAK_D, lx, 4.6, lz));
    p.push(part(new THREE.SphereGeometry(0.44, 9, 7), [CORAL, GOLD_B, TURQ, BLUSH, 0xffb054][i], lx, 3.7, lz));
    p.push(part(new THREE.CylinderGeometry(0.14, 0.14, 0.12, 8), GOLD, lx, 4.1, lz));
  }
  // two massage beds with head rolls and folded towels
  for (const bz of [-1.9, 1.9]) {
    p.push(part(new THREE.BoxGeometry(2.6, 0.5, 1.05), TEAK, 0.2, 1.15, bz));
    p.push(part(new THREE.BoxGeometry(2.65, 0.22, 1.1), IVORY, 0.2, 1.5, bz));
    p.push(part(new THREE.CylinderGeometry(0.16, 0.16, 0.95, 8), CREAM, -0.85, 1.72, bz, Math.PI / 2));
    p.push(part(new THREE.BoxGeometry(0.62, 0.16, 0.7), pick([TURQ, BLUSH]), 0.85, 1.68, bz));
    for (const lx of [-1.1, 1.1]) for (const lz of [-0.4, 0.4])
      p.push(part(new THREE.CylinderGeometry(0.06, 0.06, 0.9, 5), GOLD, 0.2 + lx, 0.45, bz + lz));
  }
  // a stone water bowl and two orchid pots
  p.push(part(new THREE.CylinderGeometry(0.75, 0.6, 0.5, 12), MARBLE, -3.2, 1.15, 0));
  p.push(part(new THREE.CylinderGeometry(0.62, 0.62, 0.1, 12), AQUA, -3.2, 1.42, 0));
  for (const oz of [-3.6, 3.6]) {
    p.push(part(new THREE.CylinderGeometry(0.34, 0.26, 0.6, 9), IVORY, 3.4, 1.2, oz));
    p.push(part(new THREE.IcosahedronGeometry(0.42, 0), PALM, 3.4, 1.7, oz));
    p.push(part(new THREE.SphereGeometry(0.15, 7, 6), BLUSH, 3.4, 2.02, oz));
  }
  return finish(p);
}

/** Stacked coupe pyramid on a gold plinth, ~3 wide, 2.8 tall. */
export function makeChampagneTower(): THREE.Group {
  const p: G[] = [
    part(new THREE.CylinderGeometry(1.3, 1.5, 0.9, 12), MARBLE, 0, 0.45, 0),
    part(new THREE.TorusGeometry(1.34, 0.1, 5, 14), GOLD, 0, 0.86, 0, Math.PI / 2),
    part(new THREE.CylinderGeometry(1.22, 1.22, 0.16, 12), GOLD_B, 0, 0.96, 0),
  ];
  // three tiers of coupes: 3×3, 2×2, 1
  const TIERS: [number, number, number][] = [[3, 1.12, 0.62], [2, 1.62, 0.42], [1, 2.1, 0.0]];
  for (const [n, y, spread] of TIERS) {
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const cx = (i - (n - 1) / 2) * spread * (n > 1 ? 1 : 0);
      const cz = (j - (n - 1) / 2) * spread * (n > 1 ? 1 : 0);
      p.push(part(new THREE.CylinderGeometry(0.28, 0.1, 0.4, 8), 0xdff2f6, cx, y + 0.2, cz));
      p.push(part(new THREE.CylinderGeometry(0.24, 0.24, 0.06, 8), 0xffe89a, cx, y + 0.34, cz));
    }
  }
  p.push(part(new THREE.SphereGeometry(0.14, 7, 6), GOLD_B, 0, 2.62, 0));
  // the magnum, poured mid-air
  p.push(part(new THREE.CylinderGeometry(0.24, 0.28, 1.0, 9), 0x2c4a3a, -1.5, 1.6, 0.9, 0, 0, 0.7));
  p.push(part(new THREE.CylinderGeometry(0.1, 0.16, 0.5, 7), 0x2c4a3a, -1.05, 1.9, 0.9, 0, 0, 0.7));
  p.push(part(new THREE.CylinderGeometry(0.12, 0.12, 0.2, 8), GOLD_B, -0.85, 2.02, 0.9, 0, 0, 0.7));
  return finish(p);
}

/** Valet podium with a key board and a red carpet, ~7.5 × 3.5. */
export function makeValetStand(): THREE.Group {
  const p: G[] = [
    part(new THREE.BoxGeometry(6.4, 0.1, 2.3), RED, 1.4, 0.05, 0),
    part(new THREE.BoxGeometry(6.4, 0.12, 0.22), GOLD, 1.4, 0.06, 1.1),
    part(new THREE.BoxGeometry(6.4, 0.12, 0.22), GOLD, 1.4, 0.06, -1.1),
    part(new THREE.BoxGeometry(1.9, 1.2, 1.0), TEAK, -2.0, 0.6, 0),
    part(new THREE.BoxGeometry(2.05, 0.14, 1.15), GOLD, -2.0, 1.26, 0),
    part(new THREE.BoxGeometry(1.7, 0.14, 1.0), 0xe8c07a, -2.0, 1.42, 0, 0, 0, -0.2),
    part(new THREE.BoxGeometry(1.7, 0.5, 0.1), NAVY, -2.05, 0.95, 0.52),
  ];
  // key board on two posts
  for (const sz of [-0.8, 0.8]) p.push(part(new THREE.CylinderGeometry(0.07, 0.08, 2.2, 6), GOLD, -2.6, 1.1, sz));
  p.push(part(new THREE.BoxGeometry(0.16, 1.62, 2.02), GOLD, -2.66, 2.2, 0));
  p.push(part(new THREE.BoxGeometry(0.12, 1.5, 1.9), NAVY, -2.6, 2.2, 0));
  for (let i = 0; i < 8; i++)
    p.push(part(new THREE.SphereGeometry(0.09, 6, 5), GOLD_B, -2.5, 1.75 + (i % 2) * 0.6, -0.7 + Math.floor(i / 2) * 0.47));
  p.push(part(new THREE.BoxGeometry(0.14, 0.5, 1.7), IVORY, -2.7, 3.1, 0));
  // bell + rope bollards flanking the carpet
  p.push(part(new THREE.SphereGeometry(0.2, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), GOLD_B, -1.4, 1.5, -0.5, Math.PI));
  for (const bx of [0.6, 3.6]) for (const bz of [-1.5, 1.5]) {
    p.push(part(new THREE.CylinderGeometry(0.28, 0.34, 0.14, 10), MARBLE, bx, 0.07, bz));
    p.push(part(new THREE.CylinderGeometry(0.1, 0.12, 1.1, 8), GOLD, bx, 0.6, bz));
    p.push(part(new THREE.SphereGeometry(0.17, 8, 6), GOLD_B, bx, 1.22, bz));
  }
  for (const bz of [-1.5, 1.5]) p.push(rope([0.6, 1.05, bz], [3.6, 1.05, bz], RED, 0.09, 6));
  return finish(p);
}

/** Moored jet ski, ~3.6 long. */
export function makeJetSki(): THREE.Group {
  const body = pick([CORAL, TURQ, GOLD_B]);
  const p: G[] = [];
  for (const [y, sq, rS, rM, rB, bs, col] of [
    [0.4, 0.55, 0.55, 0.68, 0.16, 1.0, WHITE],
    [0.85, 0.28, 0.5, 0.62, 0.14, 1.0, body],
  ] as [number, number, number, number, number, number, number][]) {
    p.push(part(new THREE.CylinderGeometry(rM, rS, 1.7, 10), col, -0.85, y, 0, 0, 0, -Math.PI / 2, sq, 1, bs));
    p.push(part(new THREE.CylinderGeometry(rB, rM, 1.7, 10), col, 0.85, y, 0, 0, 0, -Math.PI / 2, sq, 1, bs));
  }
  p.push(part(new THREE.BoxGeometry(1.3, 0.34, 0.62), CHAR, -0.35, 1.14, 0));
  p.push(part(new THREE.BoxGeometry(1.1, 0.1, 0.56), 0x3d3648, -0.35, 1.32, 0));
  p.push(part(new THREE.BoxGeometry(0.7, 0.5, 0.5), body, 0.55, 1.2, 0, 0, 0, -0.25));
  p.push(part(new THREE.CylinderGeometry(0.05, 0.05, 0.86, 6), CHAR, 0.62, 1.5, 0, Math.PI / 2));
  for (const sz of [-0.42, 0.42]) p.push(part(new THREE.SphereGeometry(0.09, 6, 5), CHAR, 0.62, 1.5, sz));
  p.push(part(new THREE.BoxGeometry(0.9, 0.09, 0.09), GOLD, 0.9, 0.98, 0, 0, 0, 0.1));
  p.push(part(new THREE.SphereGeometry(0.16, 8, 6), IVORY, 1.15, 1.02, 0));   // skull decal
  return finish(p);
}

/** Varnished resort speedboat, ~7.5 long. */
export function makeSpeedboat(): THREE.Group {
  const p: G[] = [];
  const BANDS: [number, number, number, number, number, number, number][] = [
    [0.42, 0.5, 0.7, 0.88, 0.2, 1.2, NAVY],
    [0.98, 0.42, 0.76, 0.94, 0.24, 1.22, WHITE],
    [1.35, 0.06, 0.78, 0.96, 0.26, 1.24, GOLD],
    [1.44, 0.08, 0.66, 0.82, 0.18, 1.1, TEAK],
  ];
  for (const [y, sq, rS, rM, rB, bs, col] of BANDS) {
    p.push(part(new THREE.CylinderGeometry(rM, rS, 3.4, 10), col, -1.7, y, 0, 0, 0, -Math.PI / 2, sq, 1, bs));
    p.push(part(new THREE.CylinderGeometry(rB, rM, 3.4, 10), col, 1.7, y, 0, 0, 0, -Math.PI / 2, sq, 1, bs));
  }
  p.push(part(new THREE.BoxGeometry(1.9, 0.6, 1.7), TEAK, -0.6, 1.72, 0));
  p.push(part(new THREE.BoxGeometry(1.7, 0.16, 1.5), 0x1e2632, -0.6, 2.05, 0));
  for (const sz of [-0.45, 0.45]) {
    p.push(part(new THREE.BoxGeometry(0.6, 0.5, 0.6), CREAM, -0.9, 2.2, sz));
    p.push(part(new THREE.BoxGeometry(0.16, 0.6, 0.6), CREAM, -1.24, 2.4, sz));
  }
  p.push(part(new THREE.BoxGeometry(0.14, 0.72, 1.6), GLASS, 0.5, 2.1, 0, 0, 0, 0.34));
  p.push(part(new THREE.BoxGeometry(0.9, 0.9, 0.8), CHAR, -3.5, 1.4, 0));
  p.push(part(new THREE.BoxGeometry(0.4, 1.0, 0.4), SLATE, -3.9, 0.9, 0));
  p.push(part(new THREE.CylinderGeometry(0.05, 0.06, 2.0, 5), IVORY, -3.2, 2.7, 0));
  flagWave(p, CORAL, -3.4, 3.4, 0, 0.9, 0.5, 3, 0.08);
  p.push(part(new THREE.CylinderGeometry(0.14, 0.16, 0.3, 8), GOLD_B, 2.9, 1.6, 0));
  return finish(p);
}

/** Marked circular helipad, ~13 across (12.6 pad plus a windsock). */
export function makeHelipad(): THREE.Group {
  const p: G[] = [
    part(new THREE.CylinderGeometry(6.0, 6.3, 0.4, 24), 0x3a4450, 0, 0.2, 0),
    part(new THREE.CylinderGeometry(5.7, 5.7, 0.06, 24), 0x454f5c, 0, 0.42, 0),
    part(new THREE.TorusGeometry(5.0, 0.2, 5, 28), IVORY, 0, 0.44, 0, Math.PI / 2),
    part(new THREE.BoxGeometry(0.6, 0.1, 3.6), IVORY, -1.3, 0.46, 0),
    part(new THREE.BoxGeometry(0.6, 0.1, 3.6), IVORY, 1.3, 0.46, 0),
    part(new THREE.BoxGeometry(2.7, 0.1, 0.6), IVORY, 0, 0.46, 0),
  ];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    p.push(part(new THREE.CylinderGeometry(0.13, 0.16, 0.32, 6), i % 3 ? GOLD_B : CORAL,
      Math.cos(a) * 5.7, 0.52, Math.sin(a) * 5.7));
  }
  // approach chevrons + a windsock on a pole
  for (const cz of [-1.2, 0, 1.2]) p.push(part(new THREE.BoxGeometry(1.2, 0.1, 0.4), GOLD, 5.0, 0.46, cz, 0, 0.5));
  p.push(part(new THREE.CylinderGeometry(0.09, 0.12, 3.4, 6), IVORY, -6.4, 1.7, 0));
  p.push(part(new THREE.TorusGeometry(0.3, 0.06, 5, 10), GOLD, -6.4, 3.3, 0, 0, Math.PI / 2));
  for (let i = 0; i < 4; i++)
    p.push(part(new THREE.CylinderGeometry(0.3 - i * 0.05, 0.34 - i * 0.05, 0.44, 8), i % 2 ? CORAL : IVORY,
      -6.7 - i * 0.44, 3.3 - i * 0.06, 0, 0, 0, -Math.PI / 2));
  return finish(p);
}

/** Low white clubhouse with a terrace and awnings, ~22 wide, 9 tall. */
export function makeYachtClub(): THREE.Group {
  const p: G[] = [
    part(new THREE.BoxGeometry(21, 0.7, 13), 0xe8dcc0, 0, 0.35, 0),
    part(new THREE.BoxGeometry(15, 4.4, 9), WHITE, -1.5, 2.9, 0),
    part(new THREE.BoxGeometry(15.6, 0.4, 9.6), 0xd8dee6, -1.5, 5.3, 0),
    part(new THREE.BoxGeometry(15.9, 0.22, 9.9), GOLD, -1.5, 5.05, 0),
    part(new THREE.BoxGeometry(14.4, 2.4, 0.2), GLASS, -1.5, 3.0, 4.55),
    part(new THREE.BoxGeometry(6.0, 2.6, 0.24), GLASS, -1.5, 2.9, -4.55),
  ];
  // upper deck / lookout
  p.push(part(new THREE.BoxGeometry(7.0, 2.2, 6.0), WHITE, -3.5, 6.6, 0));
  p.push(part(new THREE.BoxGeometry(7.2, 0.9, 6.2), GLASS, -3.5, 6.8, 0));
  p.push(part(new THREE.BoxGeometry(7.4, 0.3, 6.4), 0xd8dee6, -3.5, 7.85, 0));
  p.push(part(new THREE.BoxGeometry(7.6, 0.16, 6.6), GOLD, -3.5, 7.62, 0));
  // striped awnings over the terrace frontage
  for (let i = 0; i < 7; i++)
    p.push(part(new THREE.BoxGeometry(2.0, 0.14, 2.4), i % 2 ? NAVY : IVORY, -7.5 + i * 2.0, 4.5, 5.5, -0.28));
  p.push(part(new THREE.BoxGeometry(14.4, 0.3, 0.3), GOLD, -1.5, 4.05, 6.6));
  // gold terrace rail
  for (const sz of [-1, 1]) {
    p.push(part(new THREE.BoxGeometry(20.6, 0.09, 0.09), GOLD, 0, 1.6, sz * 6.3));
    for (let i = 0; i < 9; i++) p.push(part(new THREE.CylinderGeometry(0.05, 0.05, 1.2, 5), GOLD, -9.6 + i * 2.4, 1.05, sz * 6.3));
  }
  p.push(part(new THREE.BoxGeometry(0.09, 0.09, 12.4), GOLD, 10.2, 1.6, 0));
  // flagpole with a burgee, and a gold ship's bell over the door
  p.push(part(new THREE.CylinderGeometry(0.11, 0.14, 6.0, 6), IVORY, 8.0, 3.7, 0));
  p.push(part(new THREE.SphereGeometry(0.24, 8, 6), GOLD_B, 8.0, 6.85, 0));
  p.push(part(new THREE.ConeGeometry(0.55, 2.4, 3), NAVY, 6.9, 6.1, 0, 0, 0, Math.PI / 2, 1, 1, 0.12));
  p.push(part(new THREE.BoxGeometry(0.3, 1.2, 4.4), NAVY, 6.15, 3.2, 0));
  p.push(part(new THREE.BoxGeometry(0.16, 0.9, 3.8), GOLD_B, 6.05, 3.2, 0));
  // roof parapet + skylights so the top face isn't a bare slab
  p.push(part(new THREE.BoxGeometry(15.8, 0.34, 9.8), GOLD, -1.5, 5.62, 0));
  p.push(part(new THREE.BoxGeometry(15.0, 0.36, 9.0), 0xc8d2dc, -1.5, 5.7, 0));
  for (const sx of [1.6, 4.0]) p.push(part(new THREE.BoxGeometry(1.8, 0.3, 3.2), AQUA, sx, 5.78, 0));
  // terrace: four parasol tables, planters and a runner to the door
  p.push(part(new THREE.BoxGeometry(4.0, 0.1, 2.2), NAVY, 8.4, 0.74, 0));
  for (const tx of [1.6, 5.2]) for (const tz of [-3.7, 3.7]) {
    p.push(part(new THREE.CylinderGeometry(0.9, 0.9, 0.14, 12), IVORY, tx, 1.5, tz));
    p.push(part(new THREE.CylinderGeometry(0.14, 0.2, 1.2, 6), GOLD, tx, 1.05, tz));
    p.push(part(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 5), IVORY, tx, 2.6, tz));
    goreCanopy(p, [IVORY, NAVY, IVORY, NAVY, IVORY, NAVY], tx, 3.5, tz, 1.5, 0.3);
  }
  for (const [px, pz] of [[9.6, -5.2], [9.6, 5.2], [-9.6, -5.2], [-9.6, 5.2]] as [number, number][]) {
    p.push(part(new THREE.CylinderGeometry(0.62, 0.5, 1.0, 10), IVORY, px, 1.2, pz));
    p.push(part(new THREE.TorusGeometry(0.62, 0.08, 5, 12), GOLD, px, 1.62, pz, Math.PI / 2));
    p.push(part(new THREE.IcosahedronGeometry(0.85, 0), PALM, px, 2.3, pz));
    p.push(part(new THREE.IcosahedronGeometry(0.55, 0), PALM_L, px, 3.0, pz));
  }
  return finish(p);
}

/** Groomed palm wrapped in fairy lights, ~8 tall. */
export function makePalmLux(): THREE.Group {
  const p: G[] = [
    part(new THREE.CylinderGeometry(0.6, 0.85, 0.4, 12), IVORY, 0, 0.2, 0),   // whitewashed collar
  ];
  // a curved trunk from stacked segments
  let tx = 0, ty = 0.3;
  for (let i = 0; i < 7; i++) {
    const lean = 0.055 * i;
    p.push(part(new THREE.CylinderGeometry(0.3 - i * 0.02, 0.36 - i * 0.02, 1.0, 8), 0xc39a68, tx, ty + 0.5, 0, 0, 0, -lean));
    if (i < 3) p.push(part(new THREE.TorusGeometry(0.32, 0.06, 5, 10), GOLD, tx, ty + 0.95, 0, Math.PI / 2));
    tx += Math.sin(lean) * 1.0; ty += 0.98;
  }
  const cx = tx, cy = ty + 0.35;
  // fronds: tapered blades, pre-pointed at +X and pre-drooped, then spun round
  // the crown (part() applies rz last, so the droop has to be baked in first)
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + 0.2;
    const long = i % 2 === 0;
    const fr = new THREE.ConeGeometry(long ? 0.58 : 0.46, long ? 3.6 : 2.7, 4);
    fr.rotateZ(-Math.PI / 2 - (long ? 0.5 : 0.72));
    fr.scale(1, 0.3, 1);
    p.push(part(fr, long ? PALM : PALM_L, cx + Math.cos(a) * (long ? 1.75 : 1.4),
      cy - (long ? 0.5 : 0.75), Math.sin(a) * (long ? 1.75 : 1.4), 0, -a, 0));
  }
  p.push(part(new THREE.SphereGeometry(0.34, 8, 6), 0x8a6a4a, cx, cy - 0.1, 0));
  for (let i = 0; i < 3; i++) {
    const a = i * 2.1;
    p.push(part(new THREE.SphereGeometry(0.22, 7, 6), 0x7a5a3a, cx + Math.cos(a) * 0.48, cy - 0.5, Math.sin(a) * 0.48));
  }
  // fairy lights spiralling up the trunk
  for (let i = 0; i < 16; i++) {
    const t = i / 16, a = t * 9.5, lean = 0.055 * (t * 7);
    p.push(part(new THREE.SphereGeometry(0.11, 6, 5), i % 3 ? GOLD_B : 0xfff0b8,
      Math.sin(lean) * 3.4 * t + Math.cos(a) * 0.34, 0.5 + t * 6.6, Math.sin(a) * 0.34));
  }
  return noFront(finish(p));
}

/** Marble mermaid fountain, ~9 across, ~8 tall. */
export function makeStatueFountain(): THREE.Group {
  const p: G[] = [
    part(new THREE.CylinderGeometry(4.2, 4.5, 1.2, 16), MARBLE, 0, 0.6, 0),
    part(new THREE.CylinderGeometry(3.85, 3.85, 0.3, 16), TURQ, 0, 1.15, 0),
    part(new THREE.TorusGeometry(4.25, 0.16, 5, 20), GOLD, 0, 1.2, 0, Math.PI / 2),
    part(new THREE.CylinderGeometry(1.15, 1.5, 1.8, 10), MARBLE, 0, 1.9, 0),
    part(new THREE.CylinderGeometry(1.35, 1.2, 0.22, 10), GOLD, 0, 2.85, 0),
  ];
  // the mermaid: gold tail, ivory torso, coral hair, arms raised to a shell
  p.push(part(new THREE.ConeGeometry(0.95, 3.4, 8), GOLD_B, 0.2, 4.5, 0, 0, 0, -0.35));
  p.push(part(new THREE.BoxGeometry(2.1, 0.26, 1.3), GOLD_B, -1.0, 5.9, 0, 0, 0, 0.5));
  p.push(part(new THREE.SphereGeometry(0.78, 10, 8), IVORY, 0.7, 5.9, 0, 0, 0, -0.2, 0.85, 1.15, 0.78));
  p.push(part(new THREE.SphereGeometry(0.44, 9, 7), IVORY, 0.86, 7.1, 0));
  p.push(part(new THREE.SphereGeometry(0.5, 8, 6), CORAL, 0.58, 7.3, 0, 0, 0, 0, 0.9, 0.9, 0.95));
  for (const sz of [-1, 1]) p.push(part(new THREE.CylinderGeometry(0.14, 0.14, 1.4, 6), IVORY, 1.0, 6.7, sz * 0.56, 0, 0, -0.5));
  // she holds a scallop urn that the water pours from
  p.push(part(new THREE.CylinderGeometry(0.42, 0.24, 0.5, 8), CORAL, 1.4, 7.6, 0, 0, 0, 0.35));
  p.push(part(new THREE.TorusGeometry(0.4, 0.07, 5, 10), GOLD_B, 1.44, 7.82, 0, 0, 0, 0.35));
  p.push(part(new THREE.CylinderGeometry(0.11, 0.06, 2.0, 6), AQUA, 1.62, 6.7, 0, 0, 0, 0.22));
  // scallop spouts round the rim
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.78;
    const fx = Math.cos(a) * 3.1, fz = Math.sin(a) * 3.1;
    p.push(part(new THREE.ConeGeometry(0.46, 0.7, 7), GOLD, fx, 1.6, fz, 0, -a, 0, 1, 1, 0.55));
    p.push(part(new THREE.CylinderGeometry(0.06, 0.04, 1.2, 5), AQUA, fx * 0.78, 2.1, fz * 0.78, 0, 0, 0, 1, 1, 1));
  }
  for (let i = 0; i < 6; i++) {
    const a = i * 1.05;
    p.push(part(new THREE.SphereGeometry(0.2, 7, 6), 0x9fe8f2, Math.cos(a) * 2.2, 1.4, Math.sin(a) * 2.2));
  }
  return finish(p);
}

/** Brass bellhop cart piled with monogrammed cases, ~2.8 long, 2.6 tall. */
export function makeLuggageCart(): THREE.Group {
  const p: G[] = [
    part(new THREE.BoxGeometry(2.8, 0.16, 1.5), TEAK, 0, 0.4, 0),
    part(new THREE.BoxGeometry(2.6, 0.06, 1.3), RED, 0, 0.5, 0),
  ];
  for (const sx of [-1.25, 1.25]) for (const sz of [-0.62, 0.62])
    p.push(part(new THREE.CylinderGeometry(0.07, 0.07, 2.3, 7), GOLD, sx, 1.45, sz));
  p.push(part(new THREE.BoxGeometry(2.8, 0.1, 0.1), GOLD, 0, 2.55, 0.62));
  p.push(part(new THREE.BoxGeometry(2.8, 0.1, 0.1), GOLD, 0, 2.55, -0.62));
  p.push(part(new THREE.BoxGeometry(0.1, 0.1, 1.34), GOLD, 1.25, 2.55, 0));
  p.push(part(new THREE.BoxGeometry(0.1, 0.1, 1.34), GOLD, -1.25, 2.55, 0));
  for (const sx of [-1.05, 1.05]) for (const sz of [-0.62, 0.62]) {
    p.push(part(new THREE.CylinderGeometry(0.24, 0.24, 0.14, 10), CHAR, sx, 0.24, sz, Math.PI / 2));
    p.push(part(new THREE.CylinderGeometry(0.11, 0.11, 0.16, 8), GOLD_B, sx, 0.24, sz, Math.PI / 2));
  }
  // the pile: monogrammed cases and a hat box
  const CASES: [number, number, number, number, number, number, number][] = [
    [-0.6, 0.78, 0, 1.5, 0.5, 1.15, NAVY],
    [0.7, 0.8, 0.1, 1.1, 0.55, 1.0, CREAM],
    [-0.5, 1.28, -0.05, 1.25, 0.45, 0.95, CORAL],
    [0.6, 1.3, 0.0, 0.9, 0.45, 0.8, NAVY_L],
    [-0.4, 1.72, 0.05, 0.9, 0.4, 0.7, IVORY],
  ];
  for (const [cx, cy, cz, w, h, d, col] of CASES) {
    p.push(part(new THREE.BoxGeometry(w, h, d), col, cx, cy, cz));
    p.push(part(new THREE.BoxGeometry(w * 0.2, h * 1.06, d * 1.04), GOLD, cx, cy, cz));
    p.push(part(new THREE.SphereGeometry(0.11, 7, 6), GOLD_B, cx, cy, cz + d * 0.53));
  }
  p.push(part(new THREE.CylinderGeometry(0.45, 0.45, 0.5, 12), BLUSH, 0.55, 1.8, 0));
  p.push(part(new THREE.TorusGeometry(0.46, 0.06, 5, 12), GOLD, 0.55, 2.03, 0, Math.PI / 2));
  return finish(p);
}

/** Swim-up deck bar with stools half in the water, ~11 × 9, 6.5 tall. */
export function makeDeckBar(): THREE.Group {
  const p: G[] = [
    part(new THREE.BoxGeometry(11, 0.24, 8), TURQ, 0, 0.12, 0),
    part(new THREE.BoxGeometry(11.4, 0.34, 8.4), IVORY, 0, 0.1, 0),
    part(new THREE.CylinderGeometry(3.2, 3.4, 1.5, 16), TEAK, -0.6, 0.75, 0),
    part(new THREE.CylinderGeometry(3.7, 3.7, 0.26, 16), 0xe8c07a, -0.6, 1.6, 0),
    part(new THREE.TorusGeometry(3.72, 0.09, 5, 20), GOLD, -0.6, 1.72, 0, Math.PI / 2),
    part(new THREE.BoxGeometry(0.4, 2.4, 5.4), IVORY, -4.5, 1.2, 0),
    part(new THREE.BoxGeometry(0.5, 0.16, 5.0), TEAK, -4.25, 1.7, 0),
  ];
  for (let i = 0; i < 7; i++)
    p.push(part(new THREE.CylinderGeometry(0.14, 0.16, 0.6, 7), [CORAL, GOLD_B, TURQ, PALM, BLUSH, 0xff8a3a, IVORY][i],
      -4.25, 2.08, -1.9 + i * 0.63));
  // thatch-and-canvas roof on four posts, clear of the bar drum
  for (const sx of [-4.2, 3.2]) for (const sz of [-2.7, 2.7])
    p.push(part(new THREE.CylinderGeometry(0.14, 0.16, 4.4, 7), IVORY, sx, 2.2, sz));
  p.push(part(new THREE.CylinderGeometry(4.0, 4.0, 0.16, 8), IVORY, -0.6, 4.3, 0));
  p.push(part(new THREE.ConeGeometry(4.4, 1.7, 8), CORAL, -0.6, 5.2, 0));
  p.push(part(new THREE.SphereGeometry(0.3, 8, 6), GOLD_B, -0.6, 6.1, 0));
  // stools set on the arc, sunk to the knees in the water
  for (let i = 0; i < 5; i++) {
    const a = -1.0 + (i / 4) * 2.0;
    const sx = -0.6 + Math.cos(a) * 4.4, sz = Math.sin(a) * 4.4;
    p.push(part(new THREE.CylinderGeometry(0.3, 0.24, 1.1, 9), TEAK, sx, 0.55, sz));
    p.push(part(new THREE.CylinderGeometry(0.42, 0.42, 0.22, 10), pick([CORAL, TURQ, BLUSH]), sx, 1.18, sz));
    p.push(part(new THREE.TorusGeometry(0.42, 0.05, 5, 10), GOLD, sx, 1.28, sz, Math.PI / 2));
  }
  // a floating tray of drinks
  p.push(part(new THREE.CylinderGeometry(0.6, 0.6, 0.1, 10), IVORY, 3.6, 0.28, 2.2));
  for (let i = 0; i < 3; i++) p.push(part(new THREE.CylinderGeometry(0.16, 0.11, 0.36, 8), GOLD_B, 3.6 + Math.cos(i * 2.1) * 0.28, 0.5, 2.2 + Math.sin(i * 2.1) * 0.28));
  return finish(p);
}

/** Cream resort buggy with a striped canopy and gold trim, ~4.4 long. */
export function makeGolfBuggyLux(): THREE.Group {
  const p: G[] = [
    part(new THREE.BoxGeometry(3.6, 0.85, 1.8), CREAM, 0, 0.85, 0),
    part(new THREE.BoxGeometry(3.7, 0.14, 1.86), GOLD, 0, 1.2, 0),
    part(new THREE.BoxGeometry(1.5, 0.5, 1.7), CREAM, 1.4, 1.5, 0, 0, 0, -0.16),
    part(new THREE.BoxGeometry(1.4, 0.55, 1.6), NAVY, -0.4, 1.55, 0),
    part(new THREE.BoxGeometry(0.4, 0.9, 1.6), NAVY, -1.1, 1.85, 0, 0, 0, -0.14),
    part(new THREE.BoxGeometry(1.44, 0.12, 1.64), 0x4a648c, -0.4, 1.85, 0),
    part(new THREE.BoxGeometry(0.14, 0.9, 1.7), GLASS, 1.9, 1.9, 0, 0, 0, 0.28),
  ];
  for (const sx of [-1.5, 1.5]) for (const sz of [-0.82, 0.82])
    p.push(part(new THREE.CylinderGeometry(0.07, 0.08, 1.6, 6), GOLD, sx, 2.3, sz));
  for (let i = 0; i < 6; i++)
    p.push(part(new THREE.BoxGeometry(0.58, 0.14, 2.1), i % 2 ? CORAL : IVORY, -1.55 + i * 0.62, 3.12, 0));
  p.push(part(new THREE.BoxGeometry(3.8, 0.1, 0.14), GOLD, 0, 3.02, 1.06));
  p.push(part(new THREE.BoxGeometry(3.8, 0.1, 0.14), GOLD, 0, 3.02, -1.06));
  for (const sx of [-1.25, 1.25]) for (const sz of [-0.92, 0.92]) {
    p.push(part(new THREE.CylinderGeometry(0.42, 0.42, 0.28, 12), CHAR, sx, 0.44, sz, Math.PI / 2));
    p.push(part(new THREE.CylinderGeometry(0.22, 0.22, 0.32, 10), GOLD_B, sx, 0.44, sz, Math.PI / 2));
  }
  p.push(part(new THREE.TorusGeometry(0.3, 0.05, 5, 10), CHAR, 1.15, 1.95, 0, 0, Math.PI / 2, 0.3));
  p.push(part(new THREE.SphereGeometry(0.18, 8, 6), IVORY, 2.05, 1.35, 0));      // skull ornament
  p.push(part(new THREE.BoxGeometry(0.5, 1.1, 0.5), TEAK, -1.75, 1.7, 0, 0, 0, 0.16));
  for (let i = 0; i < 3; i++) p.push(part(new THREE.CylinderGeometry(0.05, 0.05, 0.6, 5), SLATE, -1.9, 2.4 + i * 0.06, -0.14 + i * 0.14, 0, 0, 0.2));
  return finish(p);
}

/** Stone fire table ringed with cushions, ~8 across. */
export function makeFireTable(): THREE.Group {
  const p: G[] = [
    part(new THREE.CylinderGeometry(2.4, 2.6, 0.7, 12), SLATE, 0, 0.35, 0),
    part(new THREE.CylinderGeometry(2.7, 2.7, 0.22, 12), 0xe8dcc0, 0, 0.78, 0),
    part(new THREE.CylinderGeometry(1.5, 1.4, 0.4, 12), CHAR, 0, 0.75, 0),
  ];
  for (let i = 0; i < 7; i++) {
    const a = i * 0.9;
    p.push(part(new THREE.DodecahedronGeometry(0.24, 0), 0x4a4a52, Math.cos(a) * 0.9, 0.95, Math.sin(a) * 0.9));
  }
  p.push(part(new THREE.ConeGeometry(0.72, 1.5, 7), 0xff9a3a, 0, 1.6, 0));
  p.push(part(new THREE.ConeGeometry(0.44, 1.2, 6), 0xffc44a, 0.1, 1.9, -0.05));
  p.push(part(new THREE.ConeGeometry(0.22, 0.8, 6), 0xffe89a, -0.05, 2.2, 0.05));
  // cushions and low drink tables around the ring
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    const cx = Math.cos(a) * 3.5, cz = Math.sin(a) * 3.5;
    p.push(part(new THREE.BoxGeometry(1.25, 0.42, 1.25), [CORAL, TURQ, BLUSH, IVORY, NAVY_L, GOLD][i], cx, 0.24, cz, 0, -a));
    p.push(part(new THREE.BoxGeometry(1.1, 0.18, 1.1), CREAM, cx, 0.5, cz, 0, -a));
    p.push(part(new THREE.SphereGeometry(0.1, 6, 5), GOLD_B, cx, 0.6, cz));
  }
  for (const a of [0.9, 4.0]) {
    p.push(part(new THREE.CylinderGeometry(0.5, 0.42, 0.5, 10), TEAK, Math.cos(a) * 2.9, 0.25, Math.sin(a) * 2.9));
    p.push(part(new THREE.CylinderGeometry(0.16, 0.11, 0.36, 8), GOLD_B, Math.cos(a) * 2.9, 0.68, Math.sin(a) * 2.9));
  }
  return finish(p);
}

/** Carved resort signpost with arrow boards, ~3.4 wide, 5 tall. */
export function makeSignpost(): THREE.Group {
  const p: G[] = [
    part(new THREE.BoxGeometry(1.3, 0.4, 1.3), SLATE, 0, 0.2, 0),
    part(new THREE.CylinderGeometry(0.6, 0.75, 0.35, 10), SAND, 0, 0.42, 0),
    part(new THREE.CylinderGeometry(0.2, 0.26, 4.6, 8), TEAK, 0, 2.5, 0),
    part(new THREE.TorusGeometry(0.24, 0.06, 5, 10), GOLD, 0, 1.1, 0, Math.PI / 2),
    part(new THREE.TorusGeometry(0.22, 0.06, 5, 10), GOLD, 0, 4.55, 0, Math.PI / 2),
    part(new THREE.SphereGeometry(0.26, 9, 7), GOLD_B, 0, 4.92, 0),
    part(new THREE.SphereGeometry(0.2, 8, 6), IVORY, 0, 5.24, 0),
  ];
  for (const ez of [-0.08, 0.08]) p.push(part(new THREE.BoxGeometry(0.09, 0.09, 0.08), CHAR, 0.14, 5.28, ez));
  const BOARDS: [number, number, number][] = [
    [4.0, 0.0, CORAL], [3.35, 2.3, IVORY], [2.7, -1.5, TURQ], [2.05, 3.6, GOLD_B], [1.4, 1.0, NAVY],
  ];
  for (const [by, ba, col] of BOARDS) {
    const dx = Math.cos(ba), dz = -Math.sin(ba);           // board direction
    const nx = Math.sin(ba), nz = Math.cos(ba);            // board face normal
    p.push(part(new THREE.BoxGeometry(2.0, 0.46, 0.14), col, dx * 0.85, by, dz * 0.85, 0, ba));
    // the arrow tip must be pre-rotated: part() applies rz LAST, which would
    // point every tip at +X regardless of the board's bearing
    const tip = new THREE.ConeGeometry(0.33, 0.5, 3);
    tip.rotateZ(-Math.PI / 2);
    p.push(part(tip, col, dx * 1.9, by, dz * 1.9, 0, ba, 0, 1, 1, 0.28));
    p.push(part(new THREE.BoxGeometry(1.5, 0.1, 0.05), col === IVORY ? NAVY : IVORY,
      dx * 0.85 + nx * 0.09, by, dz * 0.85 + nz * 0.09, 0, ba));
  }
  return finish(p);
}

/** Glass case over a heap of gold, with a velvet rope, ~4.5 × 3. */
export function makeTreasureDisplay(): THREE.Group {
  const p: G[] = [
    part(new THREE.BoxGeometry(3.0, 1.0, 2.1), NAVY, 0, 0.5, 0),
    part(new THREE.BoxGeometry(3.2, 0.16, 2.3), GOLD, 0, 1.03, 0),
    part(new THREE.BoxGeometry(2.9, 0.1, 2.0), 0x6a1f2e, 0, 1.16, 0),
  ];
  // gold heap, crown and gems
  p.push(part(new THREE.ConeGeometry(1.05, 0.75, 9), GOLD_B, 0, 1.55, 0));
  for (let i = 0; i < 9; i++) {
    const a = i * 0.8, r = 0.3 + (i % 3) * 0.3;
    p.push(part(new THREE.CylinderGeometry(0.27, 0.27, 0.12, 10), GOLD_B, Math.cos(a) * r, 1.28 + (i % 4) * 0.16, Math.sin(a) * r, 0, 0, (i % 2) * 0.35));
  }
  p.push(part(new THREE.CylinderGeometry(0.42, 0.34, 0.4, 8), GOLD_B, 0, 2.1, 0));
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    p.push(part(new THREE.ConeGeometry(0.12, 0.34, 4), GOLD_B, Math.cos(a) * 0.36, 2.42, Math.sin(a) * 0.36));
  }
  for (const [gx, gz, gc] of [[-0.85, 0.5, CORAL], [0.85, -0.45, TURQ], [0.45, 0.8, BLUSH]] as [number, number, number][])
    p.push(part(new THREE.IcosahedronGeometry(0.19, 0), gc, gx, 1.38, gz));
  // the case: gold edges plus two pale glazing panels
  for (const sx of [-1.3, 1.3]) for (const sz of [-0.9, 0.9])
    p.push(part(new THREE.CylinderGeometry(0.06, 0.06, 1.8, 5), GOLD, sx, 2.0, sz));
  p.push(part(new THREE.BoxGeometry(2.8, 0.14, 2.0), GOLD, 0, 2.94, 0));
  p.push(part(new THREE.ConeGeometry(1.7, 0.5, 4), GOLD_B, 0, 3.2, 0, 0, Math.PI / 4));
  p.push(part(new THREE.SphereGeometry(0.18, 8, 6), GOLD_B, 0, 3.5, 0));
  // only the lower glazing, so the hoard stays visible from above
  for (const sz of [-0.92, 0.92]) p.push(part(new THREE.BoxGeometry(2.6, 0.5, 0.06), 0xb8e4ee, 0, 1.42, sz));
  for (const sx of [-1.32, 1.32]) p.push(part(new THREE.BoxGeometry(0.06, 0.5, 1.84), 0xb8e4ee, sx, 1.42, 0));
  for (const sz of [-0.92, 0.92]) p.push(part(new THREE.BoxGeometry(2.66, 0.1, 0.12), GOLD, 0, 1.7, sz));
  for (const sx of [-1.32, 1.32]) p.push(part(new THREE.BoxGeometry(0.12, 0.1, 1.9), GOLD, sx, 1.7, 0));
  // velvet rope on four posts
  for (const px of [-2.1, 2.1]) for (const pz of [-1.5, 1.5]) {
    p.push(part(new THREE.CylinderGeometry(0.24, 0.3, 0.12, 10), MARBLE, px, 0.06, pz));
    p.push(part(new THREE.CylinderGeometry(0.09, 0.11, 1.0, 8), GOLD, px, 0.55, pz));
    p.push(part(new THREE.SphereGeometry(0.15, 8, 6), GOLD_B, px, 1.12, pz));
  }
  for (const pz of [-1.5, 1.5]) p.push(rope([-2.1, 0.95, pz], [2.1, 0.95, pz], 0x8a2440, 0.08, 6));
  return finish(p);
}

/** Beach lookout styled as a mast, ~13 tall, 5 across at the nest. */
export function makeCrowsNestTower(): THREE.Group {
  const p: G[] = [
    part(new THREE.CylinderGeometry(2.5, 2.8, 0.5, 10), SAND, 0, 0.25, 0),
    part(new THREE.CylinderGeometry(2.2, 2.2, 0.16, 10), 0xe8dcc0, 0, 0.55, 0),
    part(new THREE.CylinderGeometry(0.34, 0.42, 9.4, 8), IVORY, 0, 4.7, 0),
  ];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    p.push(part(new THREE.CylinderGeometry(0.18, 0.24, 8.4, 7), IVORY, sx * 1.05, 4.1, sz * 1.05, sz * 0.11, 0, -sx * 0.11));
    p.push(part(new THREE.BoxGeometry(2.5, 0.14, 0.14), TEAK_D, sx * 0.55, 3.0, sz * 1.5, 0, 0, 0.16));
  }
  for (const sz of [-1, 1]) p.push(part(new THREE.BoxGeometry(0.14, 0.14, 2.9), TEAK_D, sz * 1.5, 5.4, 0, 0.16));
  // ladder up the +X face
  for (let i = 0; i < 9; i++) p.push(part(new THREE.BoxGeometry(0.1, 0.1, 1.0), TEAK, 1.5, 0.9 + i * 0.85, 0));
  for (const sz of [-0.5, 0.5]) p.push(part(new THREE.CylinderGeometry(0.07, 0.07, 8.2, 5), TEAK, 1.5, 4.5, sz));
  // the nest
  p.push(part(new THREE.CylinderGeometry(2.0, 1.3, 1.1, 12), IVORY, 0, 9.0, 0));
  p.push(part(new THREE.CylinderGeometry(2.06, 1.36, 0.34, 12), NAVY, 0, 8.7, 0));
  p.push(part(new THREE.CylinderGeometry(1.75, 1.75, 0.14, 12), 0xe8c07a, 0, 9.0, 0));
  p.push(part(new THREE.TorusGeometry(1.98, 0.12, 5, 16), GOLD, 0, 9.5, 0, Math.PI / 2));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    p.push(part(new THREE.CylinderGeometry(0.07, 0.07, 0.7, 5), GOLD, Math.cos(a) * 1.9, 9.85, Math.sin(a) * 1.9));
  }
  p.push(part(new THREE.TorusGeometry(1.9, 0.07, 5, 16), GOLD, 0, 10.2, 0, Math.PI / 2));
  // topmast, pennant, telescope and a lantern
  p.push(part(new THREE.CylinderGeometry(0.14, 0.2, 3.4, 7), IVORY, 0, 11.3, 0));
  p.push(part(new THREE.SphereGeometry(0.2, 8, 6), GOLD_B, 0, 13.05, 0));
  flagWave(p, CORAL, -0.25, 12.5, 0, 1.8, 0.9, 3, 0.16);
  p.push(part(new THREE.CylinderGeometry(0.1, 0.15, 1.3, 8), GOLD_B, 1.5, 10.1, 0.5, 0, 0, -Math.PI / 2 + 0.35));
  p.push(part(new THREE.SphereGeometry(0.26, 8, 6), 0xffb054, -1.6, 9.9, 0.9));
  return finish(p);
}

// ── six more of my own, for people with more money than shame ─────────────

/** Gold gullwing supercar, doors up on the valet forecourt, ~6 long. */
export function makeGullwingSupercar(): THREE.Group {
  const p: G[] = [
    part(new THREE.BoxGeometry(4.6, 0.6, 2.1), GOLD_B, -0.2, 0.72, 0),
    part(new THREE.BoxGeometry(4.7, 0.16, 2.16), GOLD, -0.2, 0.44, 0),
    part(new THREE.BoxGeometry(1.5, 0.42, 1.95), GOLD_B, 2.25, 0.66, 0, 0, 0, -0.16),
    part(new THREE.ConeGeometry(1.0, 1.1, 4), GOLD_B, 2.95, 0.7, 0, 0, Math.PI / 4, -Math.PI / 2, 1, 1, 0.9),
    part(new THREE.BoxGeometry(2.3, 0.62, 1.8), CHAR, -0.5, 1.32, 0),
    part(new THREE.BoxGeometry(1.05, 0.6, 1.72), GLASS, 0.75, 1.24, 0, 0, 0, 0.35),
    part(new THREE.BoxGeometry(1.0, 0.55, 1.72), GLASS, -1.75, 1.28, 0, 0, 0, -0.4),
    part(new THREE.BoxGeometry(1.9, 0.1, 1.7), GLASS, -0.5, 1.63, 0),
  ];
  for (const sz of [-1, 1]) {                                     // the gullwings
    p.push(part(new THREE.BoxGeometry(1.7, 0.12, 1.15), GOLD_B, -0.45, 1.95, sz * 1.2, -sz * 0.72));
    p.push(part(new THREE.BoxGeometry(1.35, 0.08, 0.66), GLASS, -0.45, 2.05, sz * 1.05, -sz * 0.72));
  }
  for (const sz of [-0.68, 0.68]) {
    p.push(part(new THREE.BoxGeometry(0.3, 0.24, 0.4), IVORY, 2.85, 0.85, sz));
    p.push(part(new THREE.BoxGeometry(0.24, 0.2, 0.5), CORAL, -2.6, 0.95, sz));
  }
  for (const sx of [-1.6, 1.5]) for (const sz of [-1.02, 1.02]) {
    p.push(part(new THREE.CylinderGeometry(0.52, 0.52, 0.36, 12), CHAR, sx, 0.52, sz, Math.PI / 2));
    p.push(part(new THREE.CylinderGeometry(0.31, 0.31, 0.4, 10), GOLD, sx, 0.52, sz, Math.PI / 2));
  }
  p.push(part(new THREE.BoxGeometry(0.5, 0.1, 1.9), CHAR, -2.55, 1.5, 0, 0, 0, -0.2));
  for (const sz of [-0.8, 0.8]) p.push(part(new THREE.BoxGeometry(0.12, 0.4, 0.12), CHAR, -2.4, 1.3, sz));
  return finish(p);
}

/** Caviar and oyster bar on crushed ice, ~5.4 wide. */
export function makeCaviarBar(): THREE.Group {
  const p: G[] = [
    part(new THREE.BoxGeometry(5.0, 1.1, 2.0), IVORY, 0, 0.55, 0),
    part(new THREE.BoxGeometry(5.1, 0.14, 2.1), GOLD, 0, 0.22, 0),
    part(new THREE.BoxGeometry(5.2, 0.16, 2.2), GOLD, 0, 1.16, 0),
    part(new THREE.BoxGeometry(4.4, 0.4, 1.6), ICE, 0, 1.4, 0),
  ];
  for (let i = 0; i < 7; i++)
    p.push(part(new THREE.IcosahedronGeometry(0.22, 0), 0xeaf8fc, -1.9 + i * 0.63, 1.62, rnd(-0.5, 0.5)));
  for (const cx of [-1.4, -0.2, 1.0]) {
    p.push(part(new THREE.CylinderGeometry(0.3, 0.3, 0.2, 10), GOLD_B, cx, 1.7, -0.3));
    p.push(part(new THREE.CylinderGeometry(0.26, 0.26, 0.08, 10), 0x2b2536, cx, 1.82, -0.3));
  }
  for (let i = 0; i < 5; i++)
    p.push(part(new THREE.SphereGeometry(0.24, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), 0xf2e6ea,
      -1.6 + i * 0.8, 1.62, 0.45, 0, 0, 0, 1, 0.5, 0.85));
  for (const lx of [1.8, 2.05]) p.push(part(new THREE.SphereGeometry(0.18, 8, 6), 0xffe066, lx, 1.72, 0.3));
  // gold sneeze guard + a navy canopy
  for (const sx of [-2.2, 2.2]) p.push(part(new THREE.CylinderGeometry(0.06, 0.06, 0.9, 5), GOLD, sx, 2.05, 0.7));
  p.push(part(new THREE.BoxGeometry(4.6, 0.7, 0.06), 0xc8e8f0, 0, 2.1, 0.7));
  for (const sx of [-2.3, 2.3]) p.push(part(new THREE.CylinderGeometry(0.09, 0.11, 3.2, 6), IVORY, sx, 1.6, -0.9));
  p.push(part(new THREE.BoxGeometry(5.4, 0.22, 2.8), NAVY, 0, 3.3, 0));
  p.push(part(new THREE.BoxGeometry(5.5, 0.12, 2.9), GOLD, 0, 3.14, 0));
  for (let i = 0; i < 8; i++) p.push(part(new THREE.SphereGeometry(0.12, 6, 5), GOLD_B, -2.4 + i * 0.69, 3.1, 1.4));
  return finish(p);
}

/** Gilded concierge parrot on a perch, ~2.7 tall. */
export function makeParrotPerch(): THREE.Group {
  const p: G[] = [
    part(new THREE.CylinderGeometry(0.5, 0.62, 0.22, 12), MARBLE, 0, 0.11, 0),
    part(new THREE.CylinderGeometry(0.1, 0.13, 1.5, 8), GOLD, 0, 0.95, 0),
    part(new THREE.CylinderGeometry(0.07, 0.07, 1.1, 8), GOLD, 0, 1.7, 0, Math.PI / 2),
    part(new THREE.TorusGeometry(0.22, 0.04, 5, 10), GOLD_B, 0, 1.42, 0.42, 0, Math.PI / 2),
    part(new THREE.CylinderGeometry(0.16, 0.13, 0.1, 8), GOLD_B, 0.32, 1.6, -0.3),
  ];
  p.push(part(new THREE.SphereGeometry(0.34, 10, 8), CORAL, 0, 2.1, 0, 0, 0, 0.2, 0.85, 1.15, 0.8));
  p.push(part(new THREE.SphereGeometry(0.22, 9, 7), CORAL, 0.13, 2.5, 0));
  p.push(part(new THREE.ConeGeometry(0.12, 0.28, 6), GOLD_B, 0.33, 2.44, 0, 0, 0, -Math.PI / 2 - 0.3));
  p.push(part(new THREE.SphereGeometry(0.05, 6, 5), CHAR, 0.24, 2.58, 0.11));
  p.push(part(new THREE.BoxGeometry(0.16, 0.34, 0.12), TURQ, -0.1, 2.14, 0.3, 0, 0, 0.3));
  for (const [i, c] of [TURQ, GOLD_B, BLUSH].entries())
    p.push(part(new THREE.ConeGeometry(0.09, 0.9, 4), c, -0.28, 1.82 - i * 0.06, (i - 1) * 0.09, 0, 0, Math.PI / 2 + 0.5));
  return finish(p);
}

/** Wicker reading lounge under a raised canopy, ~6.6 × 6.2, 5.3 tall.
 *  WAS a cigar lounge, placed as a NAMED LANDMARK in Pirate Bay — a resort
 *  smoking room in a game rated 4+. The furniture was always just wicker; only
 *  the name and one small ivory cylinder on the side table said otherwise, and
 *  the cylinder is now a rolled magazine. Nothing else about the geometry
 *  changed. */
export function makeWickerLounge(): THREE.Group {
  const p: G[] = [
    part(new THREE.BoxGeometry(6.6, 0.12, 5.2), 0x7a3b48, 0, 0.06, 0),
    part(new THREE.BoxGeometry(6.0, 0.06, 4.6), 0x8f4a58, 0, 0.13, 0),
  ];
  for (const sz of [-1.5, 1.5]) {
    p.push(part(new THREE.BoxGeometry(1.5, 0.5, 1.5), 0xd8b98a, -1.4, 0.42, sz));
    p.push(part(new THREE.BoxGeometry(1.45, 0.24, 1.45), CREAM, -1.4, 0.78, sz));
    p.push(part(new THREE.BoxGeometry(0.36, 1.2, 1.5), 0xd8b98a, -2.05, 1.0, sz, 0, 0, -0.16));
    p.push(part(new THREE.BoxGeometry(1.5, 0.5, 0.3), 0xd8b98a, -1.4, 1.0, sz + (sz > 0 ? 0.62 : -0.62)));
    p.push(part(new THREE.BoxGeometry(0.7, 0.3, 0.7), pick([NAVY, CORAL]), -1.5, 1.05, sz));
  }
  p.push(part(new THREE.BoxGeometry(1.5, 0.14, 1.5), TEAK, 0.9, 0.72, 0));
  for (const sx of [-0.55, 0.55]) for (const sz of [-0.55, 0.55])
    p.push(part(new THREE.CylinderGeometry(0.06, 0.06, 0.66, 5), GOLD, 0.9 + sx, 0.36, sz));
  p.push(part(new THREE.BoxGeometry(0.9, 0.34, 0.6), TEAK_D, 0.9, 0.96, 0));
  p.push(part(new THREE.BoxGeometry(0.94, 0.08, 0.64), GOLD, 0.9, 1.15, 0));
  p.push(part(new THREE.CylinderGeometry(0.24, 0.2, 0.1, 10), MARBLE, 1.5, 0.84, 0.45));
  // the rolled magazine on the side table (was a cigar)
  p.push(part(new THREE.CylinderGeometry(0.07, 0.07, 0.44, 6), CREAM, 1.6, 0.96, 0.45, 0, 0, -Math.PI / 2));
  // canopy
  for (const sx of [-2.6, 2.6]) for (const sz of [-2.1, 2.1])
    p.push(part(new THREE.CylinderGeometry(0.11, 0.13, 4.2, 7), TEAK, sx, 2.1, sz));
  p.push(part(new THREE.BoxGeometry(5.9, 0.26, 4.9), NAVY_L, 0, 4.3, 0));
  p.push(part(new THREE.ConeGeometry(4.4, 0.9, 4), NAVY, 0, 4.85, 0, 0, Math.PI / 4));
  p.push(part(new THREE.BoxGeometry(6.1, 0.14, 5.1), GOLD, 0, 4.1, 0));
  for (let i = 0; i < 8; i++) p.push(part(new THREE.SphereGeometry(0.12, 6, 5), GOLD_B, -2.8 + i * 0.8, 4.05, 2.5));
  p.push(part(new THREE.CylinderGeometry(0.06, 0.09, 2.2, 6), GOLD, 2.15, 1.1, -1.55));
  p.push(part(new THREE.ConeGeometry(0.5, 0.6, 8), CREAM, 2.15, 2.4, -1.55, Math.PI));
  return finish(p);
}

/** Tiered fruit-punch fountain with a skull finial, ~3.6 wide, 3.7 tall.
 *  The skull stays — it is a pirate resort and a skull is set dressing. The
 *  rum does not. */
export function makePunchFountain(): THREE.Group {
  const p: G[] = [
    part(new THREE.CylinderGeometry(1.2, 1.45, 0.8, 12), TEAK, 0, 0.4, 0),
    part(new THREE.TorusGeometry(1.24, 0.09, 5, 14), GOLD, 0, 0.76, 0, Math.PI / 2),
    part(new THREE.CylinderGeometry(0.14, 0.14, 3.0, 8), GOLD, 0, 2.2, 0),
  ];
  const TIER: [number, number][] = [[1.35, 1.05], [1.0, 1.95], [0.66, 2.75]];
  for (const [r, y] of TIER) {
    p.push(part(new THREE.CylinderGeometry(r, r * 0.82, 0.26, 12), GOLD_B, 0, y, 0));
    p.push(part(new THREE.CylinderGeometry(r * 0.9, r * 0.9, 0.1, 12), 0xf06a70, 0, y + 0.16, 0));
    p.push(part(new THREE.TorusGeometry(r, 0.06, 5, 14), GOLD, 0, y + 0.13, 0, Math.PI / 2));
  }
  for (const [r, y] of TIER.slice(1))
    for (let i = 0; i < 3; i++) p.push(part(new THREE.CylinderGeometry(0.04, 0.04, 0.72, 4), 0xff8a90,
      Math.cos(i * 2.1) * r * 0.8, y - 0.36, Math.sin(i * 2.1) * r * 0.8));
  p.push(part(new THREE.SphereGeometry(0.34, 10, 8), IVORY, 0, 3.25, 0));
  for (const ez of [-0.13, 0.13]) p.push(part(new THREE.BoxGeometry(0.14, 0.14, 0.11), CHAR, 0.24, 3.32, ez));
  p.push(part(new THREE.BoxGeometry(0.28, 0.14, 0.3), IVORY, 0.16, 3.0, 0));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.4;
    p.push(part(new THREE.CylinderGeometry(0.17, 0.13, 0.3, 8), GOLD_B, Math.cos(a) * 1.75, 0.15, Math.sin(a) * 1.75));
  }
  return finish(p);
}

/** Chart-table pavilion for planning your next acquisition, ~7.5 wide, 7 tall. */
export function makeMapPavilion(): THREE.Group {
  const p: G[] = [
    part(new THREE.CylinderGeometry(3.4, 3.7, 0.5, 8), 0xe8dcc0, 0, 0.25, 0),
    part(new THREE.CylinderGeometry(3.0, 3.0, 0.1, 8), 0xd8c8a8, 0, 0.55, 0),
  ];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    p.push(part(new THREE.CylinderGeometry(0.14, 0.17, 4.2, 7), IVORY, Math.cos(a) * 2.9, 2.6, Math.sin(a) * 2.9));
  }
  p.push(part(new THREE.ConeGeometry(3.7, 1.6, 8), IVORY, 0, 5.4, 0));
  p.push(part(new THREE.CylinderGeometry(3.3, 3.6, 0.2, 8), CORAL, 0, 4.8, 0));
  p.push(part(new THREE.SphereGeometry(0.3, 9, 7), GOLD_B, 0, 6.4, 0));
  // the chart table
  p.push(part(new THREE.CylinderGeometry(0.35, 0.55, 0.9, 8), TEAK, 0, 1.0, 0));
  p.push(part(new THREE.CylinderGeometry(2.0, 2.0, 0.2, 8), TEAK, 0, 1.55, 0));
  p.push(part(new THREE.CylinderGeometry(1.85, 1.85, 0.08, 8), 0xf6e6c0, 0, 1.69, 0));
  for (let i = 0; i < 4; i++) {                              // compass rose
    const a = (i / 4) * Math.PI * 2;
    const pt = new THREE.ConeGeometry(0.16, 0.9, 3);
    pt.rotateZ(-Math.PI / 2);                                // pre-rotate: see makeSignpost
    p.push(part(pt, GOLD, Math.cos(a) * 0.45, 1.74, Math.sin(a) * 0.45, 0, -a, 0, 1, 1, 0.5));
  }
  for (const [rx, rz] of [[-1.1, 0.5], [-0.3, 1.0], [0.6, 0.8], [1.1, 0.0]] as [number, number][])
    p.push(part(new THREE.BoxGeometry(0.55, 0.05, 0.09), RED, rx, 1.75, rz, 0, rnd(-1, 1)));
  p.push(part(new THREE.BoxGeometry(0.4, 0.06, 0.1), CHAR, 1.35, 1.75, -0.6, 0, 0.8));
  p.push(part(new THREE.BoxGeometry(0.4, 0.06, 0.1), CHAR, 1.35, 1.75, -0.6, 0, -0.8));
  // brass telescope on a tripod
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    p.push(part(new THREE.CylinderGeometry(0.05, 0.05, 1.7, 5), TEAK_D, 2.3 + Math.cos(a) * 0.28, 0.9, Math.sin(a) * 0.28, Math.sin(a) * 0.18, 0, -Math.cos(a) * 0.18));
  }
  p.push(part(new THREE.CylinderGeometry(0.11, 0.17, 1.5, 8), GOLD_B, 2.3, 2.1, 0, 0, 0, -Math.PI / 2 + 0.5));
  return finish(p);
}

/** Polished gold anchor monument on a marble plinth, ~8 tall. */
export function makeAnchorMonument(): THREE.Group {
  const p: G[] = [
    part(new THREE.BoxGeometry(3.6, 0.5, 3.6), MARBLE, 0, 0.25, 0),
    part(new THREE.BoxGeometry(2.8, 1.4, 2.8), MARBLE, 0, 1.2, 0),
    part(new THREE.BoxGeometry(3.0, 0.2, 3.0), GOLD, 0, 2.0, 0),
    part(new THREE.BoxGeometry(0.14, 0.7, 1.6), GOLD_B, 1.42, 1.3, 0),
    part(new THREE.CylinderGeometry(0.3, 0.3, 5.0, 10), GOLD_B, 0, 4.5, 0),
    part(new THREE.BoxGeometry(0.34, 0.34, 3.4), GOLD_B, 0, 6.4, 0),
    part(new THREE.TorusGeometry(0.45, 0.12, 6, 12), GOLD_B, 0, 7.3, 0),
    // the crown: a half-torus flipped so the U opens upward, clear of the plinth
    part(new THREE.TorusGeometry(1.55, 0.32, 6, 14, Math.PI), GOLD_B, 0, 3.7, 0, 0, 0, Math.PI),
  ];
  for (const sx of [-1, 1]) {
    p.push(part(new THREE.ConeGeometry(0.55, 1.3, 4), GOLD_B, sx * 1.55, 4.2, 0, 0, 0, -sx * 0.5));
    p.push(part(new THREE.SphereGeometry(0.22, 8, 6), GOLD_B, sx * 1.7, 6.4, 0));
  }
  for (let i = 0; i < 3; i++) p.push(part(new THREE.TorusGeometry(0.42, 0.09, 5, 12), CREAM, 0, 5.1 + i * 0.35, 0, Math.PI / 2 + 0.12));
  for (const sx of [-1.3, 1.3]) for (const sz of [-1.3, 1.3])
    p.push(part(new THREE.CylinderGeometry(0.16, 0.2, 0.3, 8), 0xfff0b8, sx, 0.15, sz));
  return finish(p);
}

/** Boutique gift kiosk with a striped awning, ~4 wide. */
export function makeGiftKiosk(): THREE.Group {
  const p: G[] = [
    part(new THREE.BoxGeometry(3.4, 0.3, 2.6), 0xe8dcc0, 0, 0.15, 0),
    part(new THREE.BoxGeometry(3.0, 2.4, 2.2), IVORY, 0, 1.5, 0),
    part(new THREE.BoxGeometry(3.1, 0.14, 2.3), GOLD, 0, 2.72, 0),
    part(new THREE.BoxGeometry(2.4, 0.9, 0.24), CHAR, 0, 2.0, 1.06),
    part(new THREE.BoxGeometry(2.7, 0.18, 0.6), TEAK, 0, 1.5, 1.25),
    part(new THREE.BoxGeometry(3.6, 0.3, 2.8), NAVY, 0, 2.95, 0),
    part(new THREE.BoxGeometry(1.9, 0.7, 0.16), NAVY, 0, 3.5, 1.0),
    part(new THREE.BoxGeometry(1.7, 0.5, 0.06), GOLD_B, 0, 3.5, 1.09),
    part(new THREE.SphereGeometry(0.2, 8, 6), GOLD_B, 0, 3.98, 0),
  ];
  for (let i = 0; i < 6; i++)
    p.push(part(new THREE.BoxGeometry(0.56, 0.12, 1.3), i % 2 ? CORAL : IVORY, -1.4 + i * 0.56, 2.55, 1.85, -0.32));
  p.push(part(new THREE.BoxGeometry(3.5, 0.16, 0.16), GOLD, 0, 2.15, 2.42));
  for (let i = 0; i < 4; i++)
    p.push(part(new THREE.SphereGeometry(0.16, 7, 6), [CORAL, TURQ, BLUSH, GOLD_B][i], -0.9 + i * 0.6, 1.72, 1.3));
  for (const sz of [-0.7, 0.7]) {
    p.push(part(new THREE.CylinderGeometry(0.05, 0.05, 1.4, 5), GOLD, -1.75, 0.9, sz));
    p.push(part(new THREE.ConeGeometry(0.4, 0.26, 10), CREAM, -1.75, 1.6, sz));
  }
  return finish(p);
}

// ══ SMALL DRESSING PROPS — cheap, scattered in the hundreds ══════════════

/** Gold ice bucket with a magnum, ~1 across, 1.9 tall. */
export function makeChampagneBucket(): THREE.Group {
  const p: G[] = [
    part(new THREE.CylinderGeometry(0.44, 0.32, 0.72, 10), GOLD_B, 0, 0.36, 0),
    part(new THREE.TorusGeometry(0.44, 0.06, 5, 12), GOLD, 0, 0.7, 0, Math.PI / 2),
    part(new THREE.CylinderGeometry(0.4, 0.4, 0.08, 10), ICE, 0, 0.74, 0),
  ];
  for (const sz of [-1, 1]) p.push(part(new THREE.TorusGeometry(0.14, 0.04, 4, 8, Math.PI), GOLD, 0, 0.56, sz * 0.44, 0, Math.PI / 2));
  for (let i = 0; i < 3; i++) p.push(part(new THREE.IcosahedronGeometry(0.14, 0), 0xeaf8fc, Math.cos(i * 2.1) * 0.22, 0.8, Math.sin(i * 2.1) * 0.22));
  p.push(part(new THREE.CylinderGeometry(0.15, 0.17, 0.72, 8), 0x2c4a3a, 0.12, 1.12, 0, 0, 0, 0.3));
  p.push(part(new THREE.CylinderGeometry(0.07, 0.11, 0.36, 7), 0x2c4a3a, 0.28, 1.6, 0, 0, 0, 0.3));
  p.push(part(new THREE.CylinderGeometry(0.08, 0.08, 0.14, 8), GOLD_B, 0.35, 1.78, 0, 0, 0, 0.3));
  return noFront(finish(p));
}

/** Rolled spa towels on a teak shelf, ~1.5 wide. */
export function makeRolledTowels(): THREE.Group {
  const p: G[] = [
    part(new THREE.BoxGeometry(1.5, 0.14, 0.8), TEAK, 0, 0.07, 0),
    part(new THREE.BoxGeometry(1.5, 0.06, 0.84), GOLD, 0, 0.15, 0),
  ];
  const cols = [IVORY, CREAM, IVORY];
  for (let i = 0; i < 3; i++) p.push(part(new THREE.CylinderGeometry(0.2, 0.2, 0.72, 10), cols[i], -0.46 + i * 0.46, 0.35, 0, Math.PI / 2));
  for (let i = 0; i < 2; i++) p.push(part(new THREE.CylinderGeometry(0.2, 0.2, 0.72, 10), i ? IVORY : CREAM, -0.23 + i * 0.46, 0.73, 0, Math.PI / 2));
  for (const bx of [-0.23, 0.23]) p.push(part(new THREE.TorusGeometry(0.21, 0.03, 4, 10), GOLD, bx, 0.73, 0, 0, Math.PI / 2));
  return noFront(finish(p));
}

/** Teak-and-linen sun lounger with a side table, ~2.8 long. */
export function makeSunLounger(): THREE.Group {
  const accent = pick([NAVY, CORAL, TURQ]);
  const p: G[] = [];
  loungerParts(p, 0, 0, 0, 1, accent);
  p.push(part(new THREE.BoxGeometry(0.6, 0.12, 0.62), accent, 0.7, 0.72, 0));   // folded towel
  p.push(part(new THREE.CylinderGeometry(0.34, 0.28, 0.44, 10), TEAK, 0, 0.22, 0.95));
  p.push(part(new THREE.CylinderGeometry(0.36, 0.36, 0.08, 10), 0xe8c07a, 0, 0.48, 0.95));
  p.push(part(new THREE.CylinderGeometry(0.13, 0.09, 0.3, 8), GOLD_B, 0, 0.66, 0.95));
  return finish(p);
}

/** Fringed resort parasol, ~3.8 across. */
export function makeParasolLux(): THREE.Group {
  const accent = pick([CORAL, NAVY, TURQ, BLUSH]);
  const p: G[] = [
    part(new THREE.CylinderGeometry(0.5, 0.62, 0.28, 10), MARBLE, 0, 0.14, 0),
    part(new THREE.CylinderGeometry(0.07, 0.09, 3.2, 6), IVORY, 0, 1.6, 0),
  ];
  goreCanopy(p, [IVORY, accent, IVORY, accent, IVORY, accent, IVORY, accent], 0, 3.0, 0, 1.9, 0.32);
  p.push(part(new THREE.TorusGeometry(1.72, 0.07, 5, 16), GOLD, 0, 2.72, 0, Math.PI / 2));
  p.push(part(new THREE.SphereGeometry(0.16, 8, 6), GOLD_B, 0, 3.3, 0));
  p.push(part(new THREE.ConeGeometry(0.1, 0.3, 6), GOLD, 0, 3.55, 0));
  return finish(p);
}

/** A coconut with a straw and a paper umbrella, ~1 tall. */
export function makeCoconutDrink(): THREE.Group {
  const p: G[] = [
    part(new THREE.SphereGeometry(0.3, 10, 8), 0x7d5a42, 0, 0.28, 0, 0, 0, 0, 1, 0.95, 1),
    part(new THREE.CylinderGeometry(0.19, 0.19, 0.06, 10), 0xf6f0e0, 0, 0.53, 0),
    part(new THREE.CylinderGeometry(0.03, 0.03, 0.6, 5), CORAL, 0.1, 0.78, 0.04, 0, 0, -0.35),
    part(new THREE.BoxGeometry(0.14, 0.02, 0.14), GOLD_B, -0.16, 0.56, 0.1, 0, 0.5, 0.3),
    part(new THREE.CylinderGeometry(0.02, 0.02, 0.4, 4), IVORY, -0.13, 0.7, -0.06, 0, 0, 0.25),
    part(new THREE.ConeGeometry(0.16, 0.12, 8), BLUSH, -0.18, 0.9, -0.06),
    part(new THREE.SphereGeometry(0.06, 6, 5), 0xe0483a, 0.16, 0.6, -0.06),
  ];
  return noFront(finish(p));
}

/** Gold rope bollard with a draped rope, ~1.7 tall, rope reaching ~2 along +X. */
export function makeRopeBollard(): THREE.Group {
  const p: G[] = [
    part(new THREE.CylinderGeometry(0.3, 0.38, 0.16, 10), MARBLE, 0, 0.08, 0),
    part(new THREE.CylinderGeometry(0.12, 0.15, 1.15, 8), GOLD, 0, 0.72, 0),
    part(new THREE.TorusGeometry(0.14, 0.04, 5, 10), GOLD_B, 0, 1.1, 0, Math.PI / 2),
    part(new THREE.SphereGeometry(0.19, 9, 7), GOLD_B, 0, 1.4, 0),
    part(new THREE.ConeGeometry(0.1, 0.16, 6), GOLD, 0, 1.58, 0),
  ];
  // a rope drooping away toward +X
  p.push(rope([0.08, 1.24, 0], [0.9, 0.92, 0], 0x8a2440, 0.07, 5));
  p.push(rope([0.9, 0.92, 0], [1.75, 1.04, 0], 0x8a2440, 0.07, 5));
  return noFront(finish(p));
}

/** Monogrammed steamer trunk, ~2 long. */
export function makeDeckChest(): THREE.Group {
  const col = pick([NAVY, 0x8f3a4a, TEAK_D]);
  const p: G[] = [
    part(new THREE.BoxGeometry(1.8, 0.85, 1.1), col, 0, 0.43, 0),
    part(new THREE.CylinderGeometry(0.56, 0.56, 1.8, 10, 1, false, 0, Math.PI), col, 0, 0.85, 0, 0, 0, Math.PI / 2, 1, 1, 0.98),
    part(new THREE.BoxGeometry(1.86, 0.12, 1.16), GOLD, 0, 0.86, 0),
    part(new THREE.BoxGeometry(0.24, 0.95, 1.16), GOLD, -0.5, 0.44, 0),
    part(new THREE.BoxGeometry(0.24, 0.95, 1.16), GOLD, 0.5, 0.44, 0),
    part(new THREE.BoxGeometry(0.28, 0.34, 0.16), GOLD_B, 0, 0.78, 0.56),
    part(new THREE.SphereGeometry(0.07, 6, 5), CHAR, 0, 0.76, 0.63),
  ];
  for (const sx of [-0.86, 0.86]) for (const sz of [-0.52, 0.52])
    p.push(part(new THREE.BoxGeometry(0.14, 0.14, 0.14), GOLD_B, sx, 0.06, sz));
  p.push(part(new THREE.TorusGeometry(0.16, 0.04, 5, 10), GOLD_B, -0.92, 0.5, 0, 0, Math.PI / 2));
  return finish(p);
}

/** Clipped topiary in an urn, ~2.1 tall. */
export function makePotPlant(): THREE.Group {
  const p: G[] = [
    part(new THREE.CylinderGeometry(0.42, 0.3, 0.72, 10), IVORY, 0, 0.36, 0),
    part(new THREE.TorusGeometry(0.42, 0.06, 5, 12), GOLD, 0, 0.68, 0, Math.PI / 2),
    part(new THREE.CylinderGeometry(0.36, 0.36, 0.08, 10), 0x5a4632, 0, 0.72, 0),
    part(new THREE.CylinderGeometry(0.09, 0.09, 0.5, 6), TEAK_D, 0, 0.95, 0),
    part(new THREE.IcosahedronGeometry(0.5, 0), PALM, 0, 1.35, 0),
    part(new THREE.IcosahedronGeometry(0.34, 0), PALM_L, 0, 1.82, 0),
  ];
  for (let i = 0; i < 4; i++) {
    const a = i * 1.6;
    p.push(part(new THREE.SphereGeometry(0.11, 6, 5), i % 2 ? BLUSH : IVORY, Math.cos(a) * 0.44, 1.32 + (i % 2) * 0.3, Math.sin(a) * 0.44));
  }
  return noFront(finish(p));
}

// ══ MANIFEST ═════════════════════════════════════════════════════════════
// `r` is the edible radius (roughly half the footprint) used for scoring and
// size-gating. `district` lists where the scatterer may place the prop.
export const LUXE_KIT: { name: string; make: () => THREE.Group; r: number; district: string[] }[] = [
  // ── landmarks
  { name: 'galleon', make: makeGalleon, r: 9.0, district: ['port', 'cove'] },
  { name: 'superYacht', make: makeSuperYacht, r: 8.0, district: ['port', 'resort'] },
  { name: 'yachtClub', make: makeYachtClub, r: 7.5, district: ['port', 'resort'] },
  { name: 'spaPavilion', make: makeSpaPavilion, r: 5.5, district: ['resort', 'jungle'] },
  { name: 'infinityPool', make: makeInfinityPool, r: 5.5, district: ['resort', 'party'] },
  { name: 'helipad', make: makeHelipad, r: 6.0, district: ['resort', 'port'] },
  { name: 'crowsNestTower', make: makeCrowsNestTower, r: 2.6, district: ['beach', 'cove', 'port'] },
  { name: 'statueFountain', make: makeStatueFountain, r: 4.2, district: ['resort', 'market'] },
  { name: 'deckBar', make: makeDeckBar, r: 4.8, district: ['party', 'resort'] },
  { name: 'anchorMonument', make: makeAnchorMonument, r: 2.0, district: ['port', 'market'] },
  { name: 'mapPavilion', make: makeMapPavilion, r: 3.6, district: ['resort', 'jungle', 'market'] },
  { name: 'wickerLounge', make: makeWickerLounge, r: 3.4, district: ['resort', 'party'] },
  { name: 'caviarBar', make: makeCaviarBar, r: 2.7, district: ['market', 'party', 'resort'] },
  { name: 'cabanaLux', make: makeCabanaLux, r: 3.0, district: ['beach', 'resort', 'cove'] },
  { name: 'giftKiosk', make: makeGiftKiosk, r: 1.8, district: ['market', 'resort', 'beach'] },
  { name: 'treasureDisplay', make: makeTreasureDisplay, r: 2.2, district: ['market', 'resort'] },
  { name: 'fireTable', make: makeFireTable, r: 3.6, district: ['beach', 'party', 'cove'] },
  { name: 'valetStand', make: makeValetStand, r: 3.2, district: ['resort', 'market'] },
  { name: 'champagneTower', make: makeChampagneTower, r: 1.5, district: ['party', 'resort'] },
  { name: 'punchFountain', make: makePunchFountain, r: 1.7, district: ['party', 'market'] },
  // ── vehicles and watercraft
  { name: 'speedboat', make: makeSpeedboat, r: 3.6, district: ['port', 'cove'] },
  { name: 'jetSki', make: makeJetSki, r: 1.8, district: ['cove', 'beach', 'port'] },
  { name: 'golfBuggyLux', make: makeGolfBuggyLux, r: 2.2, district: ['resort', 'market', 'jungle'] },
  { name: 'gullwingSupercar', make: makeGullwingSupercar, r: 2.8, district: ['resort', 'market'] },
  { name: 'luggageCart', make: makeLuggageCart, r: 1.4, district: ['resort', 'port', 'market'] },
  // ── planting and dressing
  { name: 'palmLux', make: makePalmLux, r: 1.8, district: ['resort', 'beach', 'jungle', 'market'] },
  { name: 'signpost', make: makeSignpost, r: 1.7, district: ['beach', 'jungle', 'resort', 'market'] },
  { name: 'parrotPerch', make: makeParrotPerch, r: 0.7, district: ['resort', 'market', 'jungle'] },
  { name: 'sunLounger', make: makeSunLounger, r: 1.4, district: ['beach', 'resort', 'cove'] },
  { name: 'parasolLux', make: makeParasolLux, r: 1.9, district: ['beach', 'resort', 'cove'] },
  { name: 'potPlant', make: makePotPlant, r: 0.6, district: ['resort', 'market', 'party'] },
  { name: 'deckChest', make: makeDeckChest, r: 1.0, district: ['port', 'beach', 'cove', 'market'] },
  { name: 'rolledTowels', make: makeRolledTowels, r: 0.8, district: ['resort', 'beach'] },
  { name: 'champagneBucket', make: makeChampagneBucket, r: 0.5, district: ['party', 'resort', 'beach'] },
  { name: 'coconutDrink', make: makeCoconutDrink, r: 0.35, district: ['beach', 'party', 'cove', 'resort'] },
  { name: 'ropeBollard', make: makeRopeBollard, r: 0.5, district: ['port', 'resort', 'market'] },
];
