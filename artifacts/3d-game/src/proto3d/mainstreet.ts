// ══ MAPLE FALLS ═══════════════════════════════════════════════════════════
// World 1's prop kit: a small American town in the middle of a mayoral
// election. Mayor DINKLE (red signs) is running for a fourth term against
// DEB HOLLIS (blue signs), and every yard, verge and shop window in town has
// picked a side. Everything here is warm and silly — the joke is that a town
// this small can argue this hard about a parking meter.
//
// RULES OF THIS FILE (inherited from island.ts's merged-prop kit):
//   • every factory returns ONE mesh — one geometry, one shared material,
//     ONE DRAW CALL. Hundreds of these are on screen on a phone.
//   • no textures, flat shading, chunky silhouettes that read from a
//     top-down 3/4 camera. Colour does the storytelling.
//   • no Math.random(). The town is hand-built and the same every load —
//     use mrnd()/mr()/mpick(), which run off a fixed seed.
import * as THREE from 'three';
import { part, mergedProp, PROP_SMOOTH_MAT, shade, tint } from './island';
import { registerGloss } from './gloss';
import { roundedBox } from './life';

/** A prop with NO FRONT. island.ts's place() turns anything tagged here by a
 *  hash of its own position, because 87% of Maple Falls sat at exactly 0
 *  radians and read as stamped. Anything with a door, a face, a screen or a
 *  direction must NOT be tagged — it keeps the facing its call site authored. */
const noFront = <T extends THREE.Object3D>(m: T): T => { m.userData.spin = 1; return m; };


// ── determinism ────────────────────────────────────────────────────────────
// "Consistency is key here. Always the same for every load." Maple Falls is
// authored, so its scatter passes, colour picks and jitter all come off one
// seeded stream (mulberry32) that is reset before the bake and before
// populate. Two loads of the same build are pixel-identical.
const SEED = 0x4d41504c;   // 'MAPL'
let _s = SEED;
export function resetMapleRng(seed = SEED): void { _s = seed; }
export function mrnd(): number {
  _s = (_s + 0x6d2b79f5) | 0;
  let t = Math.imul(_s ^ (_s >>> 15), 1 | _s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
export const mr = (a: number, b: number): number => a + mrnd() * (b - a);
export const mpick = <T,>(arr: readonly T[]): T => arr[Math.floor(mrnd() * arr.length) % arr.length];
export const mchance = (p: number): boolean => mrnd() < p;

// ── prop separation (the same idea as BAY's spatial hash, Maple's own copy) ──
// Nothing else stops two authored passes dropping a pie table inside a prize
// wheel. Every claimed prop reserves its footprint in a coarse hash; callers
// ask spotFree() before they place. Radii are WORLD units (3D radius × 20).
const CELL = 400;
interface Claim { x: number; y: number; r: number; }
const claims = new Map<string, Claim[]>();
export function resetSpots(): void { claims.clear(); }
export function claimSpot(x: number, y: number, rWorld: number): void {
  const k = `${Math.floor(x / CELL)},${Math.floor(y / CELL)}`;
  const b = claims.get(k);
  if (b) b.push({ x, y, r: rWorld }); else claims.set(k, [{ x, y, r: rWorld }]);
}
export function spotFree(x: number, y: number, rWorld: number): boolean {
  const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL);
  const reach = Math.ceil((rWorld + 260) / CELL);
  for (let i = -reach; i <= reach; i++) for (let j = -reach; j <= reach; j++) {
    const b = claims.get(`${cx + i},${cy + j}`);
    if (!b) continue;
    for (const c of b) {
      const need = (c.r + rWorld) * 0.82;   // a little interlock is fine; burial is not
      const dx = c.x - x, dy = c.y - y;
      if (dx * dx + dy * dy < need * need) return false;
    }
  }
  return true;
}
/** The BURIAL test — what drop() gates on. `spotFree` refuses any contact,
 *  which is right for a random scatter and wrong for authored dressing: a
 *  mailbox belongs against the house, not 40 units off it. This refuses only
 *  props that would be swallowed whole by something already standing there. */
export function spotOpen(x: number, y: number, rWorld: number): boolean {
  const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL);
  const reach = Math.ceil((rWorld + 260) / CELL);
  for (let i = -reach; i <= reach; i++) for (let j = -reach; j <= reach; j++) {
    const b = claims.get(`${cx + i},${cy + j}`);
    if (!b) continue;
    for (const c of b) {
      const dx = c.x - x, dy = c.y - y;
      if (dx === 0 && dy === 0 && c.r === rWorld) continue;   // your own claim
      const need = Math.max((c.r + rWorld) * 0.45, Math.max(c.r, rWorld) * 0.62);
      if (dx * dx + dy * dy < need * need) return false;
    }
  }
  return true;
}

// ── the town's colours ─────────────────────────────────────────────────────
// THE TOWN ONLY HAS TWO CANDIDATES. This file used to name a third — "PAT
// SPRUCE", teal — who appears nowhere else in the game: life.ts and all 66
// mentions in newsroom_maple.ts say the challenger is DEB HOLLIS, in blue. So
// twenty-five props were campaigning for a candidate who does not exist, and on
// screen you saw red plaques, teal plaques AND blue plaques and could not tell
// which two were the two sides. The whole premise of the level was unreadable
// because of one constant. Both colours are now the exact values life.ts uses.
// ── THE FAIR, NOT AN ELECTION ───────────────────────────────────────────────
// This town used to be mid-campaign: hundreds of red-and-blue lawn signs on
// every verge, alternating "candidates" the length of every road, rosettes on
// chests, whole streets colour-striped by which side they backed. The team
// banned political content in writing (newsroom_maple.ts: "RATED 4+. NO real
// politics of any kind") and rewrote a newsroom around it — the props never got
// the memo, and they are the single most repeated object in the game.
//
// It is now the COUNTY FAIR, which the town was already holding: pie judging,
// blue ribbons, a fair district. Same signs, same density, same charm — three
// festival colours instead of two party colours, which stops the two-party read
// on sight, and a rosette where "FOR MAYOR" used to be. A rosette at a county
// fair is a prize ribbon, so the chest badges became correct by doing nothing.
export const RED = 0xd8443c;     // fair crimson
export const BLUE = 0x2f6fd0;    // ribbon blue
export const FAIR_C = 0xf0b429;  // …and a third, so nothing reads as two sides
export const FAIR_SIGN = [RED, BLUE, FAIR_C] as const;
const CREAM = 0xf6f0e2, WHITE = 0xfdfaf2, BONE = 0xe8e0cc;
const BARN = 0xb5372e, BRICK = 0xa8543f, SLATE = 0x5b6070, SHINGLE = 0x7a5a44;
const WOOD = 0x9a7a5a, DARKWOOD = 0x6b503a, TIMBER = 0xc0a887;
const GRASSY = 0x5db06a, CORN = 0xd9b845, PUMPKIN = 0xef7a24, HAY = 0xd8c078;
const STEEL = 0xb9c1cc, DARKSTEEL = 0x6f7684, GLASS = 0x9fd0e8, NIGHTGLASS = 0x39506a;
const NEON_PINK = 0xff6fae, NEON_CYAN = 0x74f0ff, NEON_GOLD = 0xffd85e;
const ASPHALT = 0x5a6070, TARMAC = 0x7d8494;
const SHOP_WALL = [0xe4c4a0, 0xc9d8e2, 0xf0d2cc, 0xd8e0c4, 0xe8dcc0, 0xcdc2dc] as const;
const AWNING = [0xd8392f, 0x1fa8a0, 0x3f7a4e, 0xe0a83a, 0x4d7de8, 0xd8586f] as const;
const INK = 0x241f2e;
// 0xc98a5a WAS IN HERE, AND IT IS ALSO THE THIRD ENTRY OF SKIN BELOW. A
// townsperson who drew that shirt against that skin came out one solid tan from
// scalp to shoe — photographed in Maple Falls at 3x and it is a brown blob, no
// neck, no shoulder line, no arms, because every edge that says "person" is a
// value change and there were none. Replaced with a plum that sits clear of
// every skin tone. Same COUNT of entries, so mpick draws the same number of
// times and no authored placement moves.
const SHIRTS = [0xff7a5a, 0x5ec8d8, 0xffd23f, 0x8fa9d8, 0xf06fb0, 0x7ed57a, 0xf2f4f8, 0x9a6fb0] as const;
const SKIN = [0xf4c9a0, 0xe0a878, 0xc98a5a, 0xffd9b0] as const;
// Hair and shoes for the static townsfolk. NOT drawn from the seeded stream —
// see personParts: they are hashed from what the person already is, because a
// third seeded draw in that function would move every authored placement in
// Maple Falls that comes after it.
const HAIRC = [0x2e2018, 0x4a3324, 0x6b4a2e, 0x8a5a34, 0xb98a4a, 0xd8bc84, 0x8a8a92, 0x3a2a2a] as const;
const SHOES = [0x241f2e, 0x2e2a34, 0x4a3a30, 0x1f2430] as const;
const DENIM = [0x40567a, 0x5a6070, 0x8a6a4a, 0x2f3a52] as const;

type G = THREE.BufferGeometry;
const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
// vehicles get the fillet the buildings do not need — see life.ts roundedBox
const rbox = (w: number, h: number, d: number, r: number) => roundedBox(w, h, d, r);
const cyl = (rt: number, rb: number, h: number, s = 8) => new THREE.CylinderGeometry(rt, rb, h, s);
const cone = (r: number, h: number, s = 8) => new THREE.ConeGeometry(r, h, s);
const sph = (r: number, s = 8, t = 6) => new THREE.SphereGeometry(r, s, t);
const M = (p: G[]) => mergedProp(p);

// A PERSON, baked flat. life.ts owns the walking crowd; these are the people
/** THE ROOF KIT.
 *  This camera looks down. On a flat-roofed building the roof is most of what
 *  the player ever sees of it, and every flat roof in this town was one
 *  unbroken cream rectangle — which is why Main Street photographed as a row
 *  of blank slabs while its shopfronts, awnings and signage all faced a wall
 *  nobody can see. Dark membrane for contrast against pale ground, then plant,
 *  duct, skylight and stack so the shape is nameable from altitude.
 *  Deterministic: mrnd/mpick run off the seeded Maple RNG, so it is identical
 *  every load. */
const ROOF_TAR = 0x4e5560, ROOF_DUCT = 0xaeb6c2, ROOF_VENT = 0x8b93a0;

// ── THE AUTUMN CANOPY, WHICH IS HALF OF MAPLE FALLS ───────────────────────
// Named, not inline, because they are registered below and a gloss table that
// points at loose hex literals rots the first time a leaf colour is tweaked.
const LEAF_A = 0xe86a2a, LEAF_B = 0xd8392f, LEAF_C = 0xe8a83a, LEAF_D = 0xc9502a;
const LEAF_HERO = 0xe8903a;              // the one every second canopy ball wears
const BARK = 0x7a5a3e;

// ── WHAT SHINES IN MAPLE FALLS ────────────────────────────────────────────
// See installPropShader in island.ts. Maple's 2.9% glossy triangles were its
// thirty road cars and nothing else — the shopfronts, the diner, the water
// tower and every window on Main Street were the same matte as the pavement.
// NIGHTGLASS and GLASS are windows wherever they appear here; the NEONs are
// signage that already glows, and a little sheen keeps the tube reading as a
// tube rather than as a painted stripe.
//
// THAT ROUND WAS AIMED AT THE WRONG HALF OF THE WORLD. Measured with
// qa/glossgap.mjs, Maple's surface area is not shopfronts: five autumn leaf
// colours are 51.2% of every vertex the player looks at, and all five were dead
// matte. Game Day is 38.4% glossy, Lantern 33.4%, Pirate 16.9%, and Maple —
// the world a child sees FIRST and the one in the store screenshots — was 5.3%.
//
// The numbers below are low ON PURPOSE and a leaf is not a car:
//   · 0.14 puts radiance at 1.70x (GLOSS_RADIANCE is 1 + 5*g) while
//     metalnessFactor is 0.38 * g^2 = 0.007, so the canopy picks up sky on its
//     upper faces and gives back essentially none of its colour. That squared
//     term is exactly why a low sheen is nearly free and a high one is not.
//   · bark gets a third of that. Bark IS rough; it needs only enough to stop
//     the trunk reading as a flat brown cylinder under the canopy.
//   · painted clapboard and trim at 0.20 — house paint has a real sheen, and
//     white is the colour that shows it most.
//   · balloons, gumballs and candy at 0.42. They are small, round and lacquered,
//     which is the one case where a hard highlight reads as VOLUME rather than
//     as material, and this town is full of them.
//   · fair signage at 0.28: painted metal, not paper.
// Deliberately NOT registered: grass, and the road. Grass is matte and is only
// 3% here. A shiny road in a dry autumn town reads as WET, which is a look
// decision rather than a correctness one — left for the owner to call.
// Note one collision by design: ASPHALT and DENIM[1] are the same hex, which is
// why the road being left alone also leaves the crowd's jeans alone.
registerGloss([
  [STEEL, 0.66], [DARKSTEEL, 0.58], [GLASS, 0.74], [NIGHTGLASS, 0.78],
  [ROOF_DUCT, 0.55], [ROOF_VENT, 0.50],
  [NEON_PINK, 0.30], [NEON_CYAN, 0.30], [NEON_GOLD, 0.30],
  // the canopy — 51% of the world, and the whole point of this pass
  [LEAF_A, 0.14], [LEAF_B, 0.14], [LEAF_C, 0.14], [LEAF_D, 0.14], [LEAF_HERO, 0.14],
  [BARK, 0.05], [WOOD, 0.10], [DARKWOOD, 0.08], [TIMBER, 0.10],
  // painted surfaces
  [WHITE, 0.20], [CREAM, 0.20], [BONE, 0.18],
  // FAIR_C is NOT here: it is 0xf0b429, the same hex as Game Day's GOLD, which
  // tailgate registers at 0.50. mainstreet imports last, so listing it here
  // demoted every gold surface in the stadium. It is 0.05% of Maple. Not worth
  // a hex collision — see the warning in gloss.ts.
  [RED, 0.28], [BLUE, 0.28],
  // lacquered round things
  [0xff6fb0, 0.42], [0xa87bff, 0.42], [0xff5a4d, 0.42], [0xffffff, 0.42],
], 'mainstreet');

function roofKit(p: G[], w: number, d: number, y: number, dense = 1): void {
  p.push(part(box(w - 0.7, 0.22, d - 0.7), ROOF_TAR, 0, y + 0.11, 0));   // membrane
  const jx = () => (mrnd() - 0.5) * (w - 3.2), jz = () => (mrnd() - 0.5) * (d - 3.2);
  // it was round(w*d/90) — ONE unit on a 9x9 shop, and roof tar measured 13.5%
  // of the Main Street frame, the largest non-ground colour, carrying a single
  // grey box.
  const units = Math.max(3, Math.round((w * d) / 34 * dense));
  for (let i = 0; i < units; i++) {                                       // AC plant
    const ux = jx(), uz = jz(), uw = mr(1.5, 2.6), ud = mr(1.2, 2.0), uh = mr(0.7, 1.2);
    p.push(part(box(uw, uh, ud), ROOF_DUCT, ux, y + 0.22 + uh / 2, uz));
    p.push(part(box(uw * 0.8, 0.12, ud * 0.8), ROOF_VENT, ux, y + 0.3 + uh, uz));
  }
  for (let i = 0; i < Math.max(1, Math.round(units * 0.8)); i++)          // vent stacks
    p.push(part(cyl(0.22, 0.26, mr(0.8, 1.6), 6), ROOF_VENT, jx(), y + 0.9, jz()));
  if (w > 8 && d > 7) {                                                   // skylight
    p.push(part(box(2.4, 0.14, 1.7), STEEL, jx() * 0.5, y + 0.3, jz() * 0.5));
    p.push(part(box(2.0, 0.22, 1.35), GLASS, jx() * 0.5, y + 0.42, jz() * 0.5));
  }
  if (mchance(0.45) && w > 9)                                             // roof-access hatch
    p.push(part(box(1.5, 0.7, 1.4), mpick([RED, BLUE, SLATE]), jx(), y + 0.55, jz()));
}

// who are STANDING somewhere for a reason — the four-strong parking-meter
// protest, the two men arguing outside the diner, the pie judges. Static, one
// mesh each, and they put a face in every district life.ts can't reach.
// ── THE STATIC TOWNSFOLK, AT THE WALKING CROWD'S FIDELITY ───────────────────
// These stand in the districts life.ts never walks — the fair judges, the
// farmhands, the drive-in crowd — and about eighty of them are on screen in the
// world a child sees FIRST. They were five hard boxes and an 8x6 sphere head.
//
// That is the identical defect life.ts already fixed for the walking crowd, in
// a second copy nobody swept: its comment names "head SphereGeometry(r, 8, 6)
// — an octagon in silhouette" as the thing that made people read as blocky, and
// raised its own primitives. This file kept the octagon. Worse, it renders
// through PROP_SHARED_MAT, which is flatShading:true — right for architecture,
// where a crisply-facetted building is the house style, and wrong for a face.
//
// So the two populations stood next to each other at different resolutions, and
// the low one is the one beside the spawn. An earlier pass noticed they were
// side by side and fixed their SCALE (the S below) without touching their
// geometry, which is why the mismatch survived as a purely visual complaint.
//
// Rounded boxes for the body — soft-edged cloth rather than crates — a 16x11
// head to match life.ts's, and smooth shading via PROP_SMOOTH_MAT at the two
// call sites that return a person on their own. Boxes are unaffected by the
// material swap (a box already has per-face normals); it is the head and the
// hat brim that stop being faceted.
//
// Cost is triangles, not draw calls: still one merged mesh each, ~156 -> ~600
// triangles, on the order of 40k extra across the whole town.
//
// DETERMINISM: exactly two seeded draws, mpick(SKIN) then mpick(DENIM), in that
// order — unchanged. Adding or removing one would shift every subsequent
// authored placement in Maple Falls.
function personParts(out: G[], x: number, z: number, shirt: number, ry = 0, hat?: number): void {
  const skin = mpick(SKIN), leg = mpick(DENIM);
  // S brings the static townsfolk up to the 3.5-unit walking crowd. They were
  // built at 2.41 and read as children standing next to every adult in life.ts.
  const S = 1.41;
  // ROUNDED BOXES WERE NOT ENOUGH. The first attempt bevelled the corners with
  // roundedBox() and fixed the head, and the head did stop being an octagon —
  // but a 0.9 x 0.95 x 0.55 BOX reads as a slab however softly its edges are
  // cut, so the bodies still photographed as crates next to the walking crowd.
  // life.ts does not use boxes at all: hips and chest are cylinders, the
  // shoulders are a sphere yoke, the limbs are tapered tubes. That silhouette is
  // the thing that reads as a person. Same primitives here, same proportions.
  // ── THE PERSON'S OWN FRAME ──────────────────────────────────────────────
  // Limbs were positioned along WORLD X — `x - 0.44 * S` — regardless of which
  // way the person faces. That was invisible while every part was radially
  // symmetric: a cylinder looks the same from all sides, so nobody could tell
  // the arms were not at the person's sides. It stops being invisible the
  // moment anything on this body has a FRONT, which a face and a pair of shoes
  // both do. makeTownsfolk turns people through a full circle (mr(0, 2pi)), so
  // a third of the town had its arms where its chest should be.
  const fwdX = Math.sin(ry), fwdZ = Math.cos(ry);
  const rgtX = Math.cos(ry), rgtZ = -Math.sin(ry);
  const at = (r: number, f: number) => [x + rgtX * r + fwdX * f, z + rgtZ * r + fwdZ * f] as const;

  // ── PER-PERSON VARIATION, WITHOUT TOUCHING THE SEEDED STREAM ─────────────
  // The contract above this function is absolute: exactly two seeded draws,
  // mpick(SKIN) then mpick(DENIM), in that order. A third would shift every
  // authored placement in Maple Falls after it. So variation is HASHED from
  // what this person already is — where they stand, which way they look, what
  // they are wearing — which costs no draw and is identical every load.
  //
  // And it has to be hashed from more than position: makeProtester and
  // makeTownsfolk both build at the origin and are placed afterwards, so x and
  // z are 0 for most of the town and a position-only hash would give every one
  // of them the same hair.
  const h1 = Math.sin(x * 12.9898 + z * 4.1414 + shirt * 0.00073 + ry * 7.233) * 43758.5453;
  const h2 = Math.sin(x * 39.3468 + z * 11.135 + shirt * 0.00031 + ry * 2.717) * 24634.6345;
  const v1 = h1 - Math.floor(h1), v2 = h2 - Math.floor(h2);
  const hairCol = HAIRC[Math.floor(v1 * HAIRC.length) % HAIRC.length];
  const shoeCol = SHOES[Math.floor(v2 * SHOES.length) % SHOES.length];
  // a hand's width of height either way, so a crowd is not one production run
  const T = S * (0.94 + v2 * 0.12);

  const [lgxL, lgzL] = at(-0.17 * T, 0), [lgxR, lgzR] = at(0.17 * T, 0);
  out.push(part(cyl(0.155 * T, 0.175 * T, 0.86 * T, 10), leg, lgxL, 0.43 * T, lgzL, 0, ry, 0));
  out.push(part(cyl(0.155 * T, 0.175 * T, 0.86 * T, 10), leg, lgxR, 0.43 * T, lgzR, 0, ry, 0));
  // ── SHOES ── two dark cylinders ending flat on the pavement is a chess
  // piece. life.ts calls its feet "loaves" and the note there is the same one:
  // at spawn distance a pair of hard rectangles under each person was "the
  // second-loudest Lego tell after the hair". A squashed sphere, longer along
  // the way the person is pointing, is a rounded toe box.
  for (const [fx, fz] of [at(-0.17 * T, 0.05 * T), at(0.17 * T, 0.05 * T)])
    out.push(part(sph(0.155 * T, 8, 6), shoeCol, fx, 0.085 * T, fz, 0, ry, 0, 1, 0.56, 1.42));
  out.push(part(cyl(0.30 * T, 0.26 * T, 0.30 * T, 14), leg, x, 0.96 * T, z, 0, ry, 0));          // hips
  out.push(part(cyl(0.40 * T, 0.31 * T, 0.82 * T, 14), shirt, x, 1.44 * T, z, 0, ry, 0));        // chest
  out.push(part(sph(0.40 * T, 14, 10), shirt, x, 1.78 * T, z));                                  // shoulder yoke
  // ── ARMS, AND WHY THEY ARE AIMED RATHER THAN PLACED ─────────────────────
  // Every townsperson in the game stood in the identical rigid A-pose: two
  // vertical cylinders, dead straight, exactly the same on all of them. Once
  // there are twenty in a frame that is the loudest remaining cheap tell —
  // uniformity, absence #5 — and it is the cheapest one to fix, because an arm
  // that hangs three degrees differently costs nothing but an angle.
  //
  // part() rotates the geometry about its OWN centre and then translates, in
  // the order rotateX -> rotateY -> rotateZ. A vertical cylinder is unchanged
  // by rotateY, so the reachable orientations are rotateX then rotateZ, which
  // between them can aim +Y anywhere. Solving for a wanted direction d:
  //     rotateX(rx) : (0,1,0) -> (0, cos rx, sin rx)
  //     rotateZ(rz) : -> (-cos rx sin rz, cos rx cos rz, sin rx)
  // so rx = asin(dz) and rz = atan2(-dx, dy). The shoulder is the pivot, so
  // the cylinder's centre goes half a limb along d from the shoulder — which
  // is the part that keeps the arm attached to the body instead of hinging
  // about its own middle.
  const armAt = (side: number) => {
    // spread out from the body, and a little fore or aft. Hashed per person
    // AND per side, so nobody stands perfectly symmetrical either.
    const hs = Math.sin(x * 7.77 + z * 3.31 + shirt * 0.00017 + ry * 5.1 + side * 19.7) * 15731.7;
    const w = hs - Math.floor(hs);
    const sa = (0.06 + w * 0.20) * side;          // outward
    const sb = (v1 - 0.5) * 0.34 + (w - 0.5) * 0.18;  // fore/aft
    const dx = rgtX * sa + fwdX * sb, dz = rgtZ * sa + fwdZ * sb;
    const dy = -Math.sqrt(Math.max(0.05, 1 - dx * dx - dz * dz));
    const rx = Math.asin(Math.max(-1, Math.min(1, dz)));
    const rz = Math.atan2(-dx, dy);
    const [shx, shz] = at(side * 0.42 * T, 0);
    const shy = 1.79 * T;
    return { rx, rz, cx: shx + dx * 0.37 * T, cy: shy + dy * 0.37 * T, cz: shz + dz * 0.37 * T,
      hx: shx + dx * 0.80 * T, hy: shy + dy * 0.80 * T, hz: shz + dz * 0.80 * T };
  };
  for (const side of [-1, 1]) {
    const a = armAt(side);
    out.push(part(cyl(0.10 * T, 0.115 * T, 0.74 * T, 9), shirt, a.cx, a.cy, a.cz, a.rx, 0, a.rz));
    // ── HANDS ── the sleeve ended in a flat disc at the wrist and nothing
    // after it. The eye tracks the end of an arm; give it something to find.
    out.push(part(sph(0.115 * T, 7, 5), skin, a.hx, a.hy, a.hz));
  }
  out.push(part(cyl(0.13 * T, 0.13 * T, 0.16 * T, 10), skin, x, 1.98 * T, z));                   // neck
  out.push(part(sph(0.36 * T, 16, 11), skin, x, 2.22 * T, z));
  // ── HAIR ── a bare skin-coloured ball is the loudest cheap tell on a person,
  // and every static townsperson in the game had one. life.ts's crowd carries
  // nine hairstyles and this carried none, which is most of why the two read as
  // different quality standing side by side.
  //
  // A CAP, not a ball: centred well above the head's own centre and pushed
  // back, so it covers the crown and the back and leaves the face. The
  // arithmetic is checked against the eyes rather than eyeballed — at the eyes'
  // forward offset the cap's lower edge sits at 2.307 T and the eyes at 2.25 T,
  // so they clear it by about a twentieth of a head.
  {
    // ── AND IT MUST NOT OVERHANG THE SKULL ────────────────────────────────
    // The first cap was sph(0.38T) at 2.42T. At that height the skull's own
    // radius is sqrt(0.36^2 - 0.20^2) = 0.299T, so the cap stood 0.081T proud —
    // 27% wider than the head it sits on — and read as a moulded bowl helmet
    // with a rim rather than as hair. It was also tessellated 12x8 against a
    // 16x11 skull, so the coarser silhouette was the one on the outside.
    // TEAM MOTION found it in the character sheet, which is what the sheet is
    // for. Narrower, seated lower, and at least as smooth as the head.
    const [hxc, hzc] = at(0, -0.05 * T);
    out.push(part(sph(0.355 * T, 16, 9), hairCol, hxc, 2.40 * T, hzc, 0, ry, 0, 1, 0.58, 1));
  }
  // ── A FACE ── life.ts's walking crowd got eyes in the same pass as this; the
  // static townsfolk need them for the same reason and more so, because these
  // are the ones standing still on a path while the void rolls past. The play
  // camera is 46 degrees above the ground, so the front of a head is in shot
  // whenever a person is turned anywhere but straight away.
  //
  // Placed in the person's own facing (ry), because unlike every other part
  // here a face is not radially symmetric: `fwd` is the way they are looking
  // and `rgt` is across their shoulders. Two parts each, merged into the mesh
  // this function already returns, so the cost is triangles and not draw calls.
  //
  // DETERMINISM: no mpick, no mrnd, no mchance. The two seeded draws at the top
  // of this function are still the only two, in the same order, which is the
  // contract every authored placement in Maple Falls downstream depends on.
  {
    const fwdX = Math.sin(ry), fwdZ = Math.cos(ry);
    const rgtX = Math.cos(ry), rgtZ = -Math.sin(ry);
    for (const side of [-1, 1]) {
      // NO WHITE. THE WHITE WAS THE WHOLE MISTAKE.
      //
      // The first version gave every townsperson a white sclera with a dark
      // pupil, the way the hero's face is built. Photographed at four angles
      // (qa/personsheet.mjs) it is unmistakable: two pale spheres bulging out
      // of a 0.36 skull, reading as golf balls glued to the sides of the head.
      // The owner's word for it was "eyes that pop out", and he is right.
      //
      // The arithmetic says why. The white sat 0.462 units from the head centre
      // with a 0.134 radius, on a 0.508 skull — 17% of the head's radius proud
      // of its own surface — and it was PALE, so every one of those bulges
      // broke the silhouette in a bright colour. A townsperson is 30 screen
      // pixels tall. At 30 pixels there is no room for an eyeball; there is
      // room for a MARK.
      //
      // So: two dark dots, and nothing else. Dark cannot read as a lump against
      // a lit head, and the numbers keep them inside the skull from every angle
      // but the front — centre 0.302 out on a 0.36 radius with a 0.07 dot, so
      // 3% proud of the surface where a drawn eye should be, and 0.195 of
      // lateral extent against a 0.36 silhouette, so invisible from the side
      // and hidden by the skull from behind. Which is how a face works.
      const ex = x + rgtX * side * 0.125 * T + fwdX * 0.27 * T;
      const ez = z + rgtZ * side * 0.125 * T + fwdZ * 0.27 * T;
      out.push(part(sph(0.07 * T, 9, 7), INK, ex, 2.25 * T, ez));
    }
  }
  // T, NOT S. The per-person height jitter scales the whole body, and the hat
  // and the eyes were left on the un-jittered S when it was added — so a
  // slightly short townsperson wore their hat floating above their head with
  // daylight under the brim, which is exactly how it photographed.
  if (hat !== undefined) out.push(part(cyl(0.34 * T, 0.42 * T, 0.22 * T, 14), hat, x, 2.52 * T, z));
}

// ═══════════════════════════════════════════════════════════════════════════
// THE SQUARE — civic Maple Falls
// ═══════════════════════════════════════════════════════════════════════════

/** MAPLE FALLS TOWN HALL — columns, pediment, clock cupola. The landmark the
 *  match opens in front of, and the thing Mayor Dinkle will not shut up about. */
export function makeTownHall(): THREE.Mesh {
  const p: G[] = [];
  p.push(part(box(22, 1.2, 15), BONE, 0, 0.6, 0));                    // plinth
  p.push(part(box(20, 8.5, 13), CREAM, 0, 5.35, 0));                  // main block
  p.push(part(box(20.6, 0.9, 13.6), WHITE, 0, 10, 0));                // cornice
  for (let i = 0; i < 7; i++) {                                        // windows, a proper civic rhythm
    const wx = -7.5 + i * 2.5;
    p.push(part(box(1.2, 3, 0.3), NIGHTGLASS, wx, 5.6, 6.6));
    p.push(part(box(1.5, 0.35, 0.35), WHITE, wx, 7.3, 6.65));
  }
  p.push(part(box(9, 3, 6.5), CREAM, 0, 1.5 + 1.2, 8.2));             // portico
  for (const cx of [-3.6, -1.2, 1.2, 3.6]) {                          // COLUMNS
    p.push(part(cyl(0.42, 0.5, 6.4, 10), WHITE, cx, 4.4, 8.2));
    p.push(part(box(1.3, 0.4, 1.3), WHITE, cx, 7.75, 8.2));
    p.push(part(box(1.4, 0.35, 1.4), BONE, cx, 1.4, 8.2));
  }
  p.push(part(box(11, 1, 7.2), WHITE, 0, 8.2, 8.2));                  // architrave
  p.push(part(cone(6.4, 2.6, 4), WHITE, 0, 9.9, 8.2, 0, Math.PI / 4, 0, 1, 1, 0.62));  // pediment
  p.push(part(box(4.4, 0.6, 2), BONE, 0, 0.3, 13));                   // steps
  p.push(part(box(5, 0.6, 2), BONE, 0, 0.9, 12));
  p.push(part(box(3, 3.6, 0.4), 0x3f5a7a, 0, 3.1, 11.4));             // door
  // the cupola + CLOCK
  p.push(part(box(7, 1.4, 7), WHITE, 0, 11.2, 0));
  p.push(part(cyl(2.4, 2.9, 4.2, 10), CREAM, 0, 14, 0));
  for (const [dx, dz, ry] of [[0, 2.55, 0], [0, -2.55, Math.PI], [2.55, 0, Math.PI / 2], [-2.55, 0, -Math.PI / 2]] as const) {
    p.push(part(cyl(1.15, 1.15, 0.22, 14), WHITE, dx, 14.4, dz, Math.PI / 2, ry, 0));
    p.push(part(box(0.16, 0.85, 0.1), 0x2c2438, dx * 1.06, 14.7, dz * 1.06, 0, ry, 0));   // hands: 10 past 2, forever
    p.push(part(box(0.6, 0.14, 0.1), 0x2c2438, dx * 1.06 + (dz ? 0.24 : 0), 14.4, dz * 1.06 + (dx ? 0.24 : 0), 0, ry, 0));
  }
  p.push(part(cyl(0.1, 2.9, 2.6, 10), 0x3f7a4e, 0, 17.4, 0));         // verdigris roof
  p.push(part(sph(0.42, 8, 6), NEON_GOLD, 0, 19, 0));                 // finial
  return M(p);
}

/** THE BANDSTAND — octagonal, on the green. The high-school band plays here
 *  every Friday whether or not anybody asked. */
export function makeBandstand(): THREE.Mesh {
  const p: G[] = [];
  p.push(part(cyl(4.6, 5, 0.8, 8), BONE, 0, 0.4, 0));
  p.push(part(cyl(4.2, 4.2, 0.35, 8), TIMBER, 0, 0.95, 0));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    p.push(part(cyl(0.17, 0.2, 4.2, 6), WHITE, Math.cos(a) * 3.7, 3.1, Math.sin(a) * 3.7));
    p.push(part(box(1.5, 0.7, 0.24), WHITE, Math.cos(a) * 3.5, 1.6, Math.sin(a) * 3.5, 0, -a, 0));   // railing
  }
  p.push(part(cyl(4.6, 4.6, 0.45, 8), WHITE, 0, 5.4, 0));
  p.push(part(cone(5.2, 2.4, 8), RED, 0, 6.8, 0));
  p.push(part(cyl(0.12, 0.12, 1.1, 6), WHITE, 0, 8.4, 0));
  p.push(part(sph(0.3, 8, 6), NEON_GOLD, 0, 9.1, 0));
  return M(p);
}

/** FIRST MAPLE CHURCH — white clapboard, steeple, one bell. */
export function makeChurch(): THREE.Mesh {
  const p: G[] = [];
  p.push(part(box(10, 6, 15), WHITE, 0, 3, 0));
  p.push(part(cone(7.6, 3.4, 4), 0x8c5a4a, 0, 7.7, 0, 0, Math.PI / 4, 0, 1, 1, 1.5));
  for (const sz of [-4.5, -1.5, 1.5, 4.5]) for (const sx of [-1, 1]) {
    p.push(part(box(0.3, 2.4, 1.1), 0x6fa8d8, sx * 5.05, 3.6, sz));
  }
  p.push(part(box(4.6, 4.6, 4.6), WHITE, 0, 2.3, 8.4));               // tower base
  p.push(part(box(3.6, 4, 3.6), WHITE, 0, 6.6, 8.4));
  p.push(part(box(4.2, 0.5, 4.2), CREAM, 0, 8.8, 8.4));
  p.push(part(box(2.8, 3, 2.8), CREAM, 0, 10.4, 8.4));                // belfry
  p.push(part(cyl(0.9, 1.1, 1.2, 8), 0xc9a24a, 0, 10.6, 8.4));        // the bell
  p.push(part(cone(2.6, 6.5, 4), 0x8c5a4a, 0, 15.2, 8.4, 0, Math.PI / 4, 0));
  p.push(part(cyl(0.08, 0.08, 1.4, 5), 0xc9a24a, 0, 19, 8.4));
  p.push(part(box(1.1, 0.16, 0.16), 0xc9a24a, 0, 19.4, 8.4));
  p.push(part(box(2.4, 3.4, 0.4), 0x6b503a, 0, 1.7, 10.8));           // doors
  return M(p);
}

/** THE MAPLE DINER — chrome, checkerboard skirt, a neon coffee cup on the
 *  roof, and an argument that has been running since 1987. */
export function makeDiner(): THREE.Group {
  const p: G[] = [];
  p.push(part(box(14, 4.4, 8), STEEL, 0, 2.2, 0));
  p.push(part(cyl(4, 4, 14, 12), CREAM, 0, 4.4, 0, 0, 0, Math.PI / 2));   // barrel roof
  p.push(part(box(14.4, 0.5, 8.4), NEON_CYAN, 0, 4.5, 0));            // chrome band
  p.push(part(box(14.4, 0.4, 8.4), RED, 0, 1.1, 0));                  // red stripe
  for (let i = 0; i < 14; i++) {                                       // checkerboard skirt
    p.push(part(box(1, 0.7, 0.2), i % 2 ? 0x2c2438 : WHITE, -6.5 + i, 0.35, 4.1));
  }
  for (const wx of [-4.4, -1.5, 1.5, 4.4]) {                          // windows
    p.push(part(box(2.4, 2.2, 0.3), GLASS, wx, 2.8, 4.1));
    p.push(part(box(2.6, 0.25, 0.35), WHITE, wx, 4, 4.15));
  }
  p.push(part(box(2, 3, 0.35), 0x3f5a7a, 6, 1.5, 4.1));
  // the neon: a coffee cup and the word-bar under it
  p.push(part(cyl(0.14, 0.14, 3, 6), DARKSTEEL, -4, 6, 0));
  p.push(part(cyl(0.14, 0.14, 3, 6), DARKSTEEL, 4, 6, 0));
  p.push(part(box(10, 1.6, 0.4), 0x2c2438, 0, 8.2, 0));
  p.push(part(box(9.2, 0.9, 0.25), NEON_PINK, 0, 8.2, 0.25));
  p.push(part(cyl(1.2, 0.9, 1.6, 10), NEON_CYAN, -3.4, 10.2, 0));     // the cup
  p.push(part(new THREE.TorusGeometry(0.55, 0.14, 6, 10), NEON_CYAN, -2, 10.2, 0));
  p.push(part(box(0.3, 1.4, 0.3), WHITE, -3.8, 11.6, 0, 0.2, 0, 0.3));  // steam
  p.push(part(box(0.3, 1.2, 0.3), WHITE, -3, 11.5, 0, -0.2, 0, -0.25));
  p.push(part(box(4.6, 1, 0.3), NEON_GOLD, 2.2, 10.2, 0));
  // the argument, permanently in progress by the door. In their OWN merge:
  // the diner is majority-box, so mergedProp's auto flat/smooth pick renders
  // the whole building faceted — correct for the architecture and wrong for
  // the two people welded into it, whose cylinder limbs came out as hard
  // vertical facets. A person is round-majority on their own, so a separate
  // merge puts them on the smooth material the standalone folk already use.
  // One extra draw call, on the one storefront that contains people.
  const folk: G[] = [];
  personParts(folk, 7.6, 5.6, mpick(SHIRTS), -0.6, RED);
  personParts(folk, 9.2, 5.2, mpick(SHIRTS), 2.5, BLUE);
  const g = new THREE.Group();
  g.add(M(p)); g.add(mergedProp(folk, PROP_SMOOTH_MAT));
  return g;
}

/** A MAIN STREET STOREFRONT. Two floors, a parapet, an awning and a sign
 *  board — the unit the whole street is built from. `side` puts a campaign
 *  poster in the window: every shop in town has declared. */
export function makeStorefront(w = 9, h = 8, side = -1): THREE.Mesh {
  const wall = mpick(SHOP_WALL), awn = mpick(AWNING);
  const p: G[] = [];
  p.push(part(box(w, h, 9), wall, 0, h / 2, 0));
  p.push(part(box(w + 0.5, 0.9, 9.5), CREAM, 0, h + 0.35, 0));          // parapet cap
  p.push(part(box(w + 0.3, 0.6, 9.3), mpick(AWNING), 0, h - 1.4, 0));   // sign band
  p.push(part(box(w - 1.6, 3.2, 0.4), GLASS, 0, 2, 4.6));               // shop window
  p.push(part(box(w - 1.4, 0.4, 0.6), CREAM, 0, 3.75, 4.7));
  p.push(part(box(1.5, 3, 0.35), 0x5b4634, w / 2 - 1.4, 1.5, 4.6));     // door
  p.push(part(box(w - 1.2, 0.3, 2.4), awn, 0, 4.3, 5.6, -0.32, 0, 0));  // AWNING
  p.push(part(box(w - 1.2, 0.5, 0.3), CREAM, 0, 3.6, 6.6));
  const flr = Math.max(2, Math.floor(w / 3));
  for (let i = 0; i < flr; i++) {                                        // upstairs windows
    const wx = (i - (flr - 1) / 2) * (w / flr);
    p.push(part(box(1.3, 2, 0.35), NIGHTGLASS, wx, h - 3.4, 4.6));
    p.push(part(box(1.6, 0.25, 0.45), CREAM, wx, h - 2.3, 4.65));
  }
  if (side >= 0) p.push(part(box(1.6, 1.1, 0.2), side ? BLUE : RED, -w / 2 + 1.6, 2.4, 4.85));  // window poster
  // THE OTHER THREE SIDES. Every detail above sits at z >= +4.6, and the
  // camera azimuth is locked at 45 degrees — so any storefront rotated away
  // from it showed two blank walls. These are merged geometry, so the cost is
  // triangles, not draw calls.
  for (let i = 0; i < flr; i++) {                                        // rear windows
    const wx = (i - (flr - 1) / 2) * (w / flr);
    p.push(part(box(1.3, 2, 0.35), NIGHTGLASS, wx, h - 3.4, -4.6));
    p.push(part(box(1.3, 1.8, 0.35), NIGHTGLASS, wx, h - 6.2, -4.6));
  }
  p.push(part(box(2.2, 2.8, 0.3), 0x5b4634, -w / 2 + 2, 1.4, -4.6));     // service door
  p.push(part(box(1.4, 1.2, 1.0), SLATE, w / 2 - 2, 0.6, -4.2));         // bins, out the back
  const sideWin = Math.max(1, Math.floor(9 / 4));
  for (const sx of [-w / 2 - 0.02, w / 2 + 0.02]) {                       // gable-end windows
    for (let i = 0; i < sideWin; i++) {
      const sz = (i - (sideWin - 1) / 2) * 3.4;
      p.push(part(box(0.3, 1.8, 1.2), NIGHTGLASS, sx, h - 3.4, sz));
      p.push(part(box(0.3, 1.6, 1.1), NIGHTGLASS, sx, h - 6.2, sz));
    }
    p.push(part(box(0.22, 0.5, 9.2), CREAM, sx, h - 1.4, 0));            // sign band wraps
  }
  roofKit(p, w, 9, h + 0.8);
  return M(p);
}

/** BARBER POLE — the barber has an opinion and will share it. */
export function makeBarberPole(): THREE.Mesh {
  const p: G[] = [
    part(cyl(0.26, 0.3, 2.6, 8), WHITE, 0, 1.3, 0),
    part(cyl(0.3, 0.3, 0.3, 8), DARKSTEEL, 0, 2.65, 0),
    part(sph(0.28, 8, 6), DARKSTEEL, 0, 2.95, 0),
  ];
  for (let i = 0; i < 5; i++) p.push(part(box(0.62, 0.24, 0.62), i % 2 ? RED : 0x2f6ad8, 0, 0.5 + i * 0.45, 0, 0, 0, 0.5));
  return M(p);
}

/** A ROW OF MAILBOXES on one leaning beam — the end of a rural route. */
export function makeMailboxRow(): THREE.Mesh {
  const p: G[] = [
    part(cyl(0.16, 0.19, 2, 6), DARKWOOD, -1.6, 1, 0),
    part(cyl(0.16, 0.19, 2, 6), DARKWOOD, 1.6, 1, 0),
    part(box(4, 0.24, 0.3), DARKWOOD, 0, 1.95, 0),
  ];
  const cols = [RED, BLUE, 0xe0a83a, 0x8fa9d8];
  for (let i = 0; i < 4; i++) {
    const x = -1.5 + i;
    p.push(part(box(0.5, 0.55, 0.9), cols[i], x, 2.4, 0));
    p.push(part(cyl(0.25, 0.25, 0.5, 8), cols[i], x, 2.62, 0, 0, 0, Math.PI / 2, 1, 1, 1));
    p.push(part(box(0.1, 0.4, 0.1), RED, x + 0.3, 2.85, 0));
  }
  return M(p);
}

/** BUS SHELTER — one bus a day, and it is always late. */
export function makeBusShelter(): THREE.Mesh {
  const p: G[] = [
    part(box(4.4, 0.24, 2.2), BONE, 0, 0.12, 0),
    part(box(4.4, 2.8, 0.2), GLASS, 0, 1.5, -1),
    part(box(0.24, 2.8, 2.2), DARKSTEEL, -2.1, 1.5, 0),
    part(box(0.24, 2.8, 2.2), DARKSTEEL, 2.1, 1.5, 0),
    part(box(4.9, 0.3, 2.7), 0x3f7a4e, 0, 3.05, 0),
    part(box(3.6, 0.4, 0.7), WOOD, 0, 0.9, -0.6),                      // bench
    part(box(1.4, 1.9, 0.14), RED, 1.2, 1.6, -0.86),                   // and a poster, obviously
  ];
  return M(p);
}

/** THE WATER TOWER — MAPLE FALLS painted on the tank, and somebody has been
 *  up there with a can of teal paint. */
export function makeWaterTower(): THREE.Mesh {
  const p: G[] = [];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    p.push(part(cyl(0.24, 0.34, 11, 6), STEEL, Math.cos(a) * 2.6, 5.5, Math.sin(a) * 2.6, 0.12 * Math.sin(a), 0, -0.12 * Math.cos(a)));
  }
  for (const y of [3, 6.5]) for (let i = 0; i < 4; i++) {              // cross bracing
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4, b = ((i + 1) / 4) * Math.PI * 2 + Math.PI / 4;
    const x0 = Math.cos(a) * 3, z0 = Math.sin(a) * 3, x1 = Math.cos(b) * 3, z1 = Math.sin(b) * 3;
    p.push(part(box(Math.hypot(x1 - x0, z1 - z0), 0.16, 0.16), DARKSTEEL, (x0 + x1) / 2, y, (z0 + z1) / 2, 0, -Math.atan2(z1 - z0, x1 - x0), 0));
  }
  p.push(part(cyl(3.6, 3.6, 0.4, 12), DARKSTEEL, 0, 11, 0));
  p.push(part(cyl(3.5, 3.9, 4.6, 12), WHITE, 0, 13.4, 0));            // the tank
  p.push(part(cone(3.9, 1.6, 12), 0x3f7a4e, 0, 16.5, 0));
  p.push(part(cyl(3.55, 3.55, 1.3, 12), 0x3f7a4e, 0, 13.6, 0));       // the town name band
  p.push(part(cyl(3.6, 3.6, 0.5, 12), CREAM, 0, 13.6, 0));
  p.push(part(cyl(0.1, 0.1, 1.6, 5), STEEL, 0, 18, 0));
  p.push(part(sph(0.26, 8, 6), RED, 0, 18.9, 0));
  p.push(part(box(1.3, 0.9, 0.14), BLUE, 1.9, 12.2, 3.1, 0, 0, 0.25));  // somebody's editorial
  return M(p);
}

/** MAPLE FALLS FIRE CO. #1 — two bays, a hose tower, a dalmatian's worth of
 *  civic pride. */
export function makeFireStation(): THREE.Mesh {
  const p: G[] = [
    part(box(16, 7, 11), BRICK, 0, 3.5, 0),
    part(box(16.6, 0.8, 11.6), CREAM, 0, 7.3, 0),
    part(box(4.6, 0.6, 0.4), WHITE, -4, 6.2, 5.6),
    part(box(4.6, 0.6, 0.4), WHITE, 4, 6.2, 5.6),
    part(box(4.8, 5, 0.4), 0xe8ecf2, -4, 2.5, 5.6),                    // bay doors
    part(box(4.8, 5, 0.4), 0xe8ecf2, 4, 2.5, 5.6),
    part(box(3.4, 8.6, 3.4), BRICK, -7.4, 4.3, -4),                    // hose tower
    part(box(3.8, 0.6, 3.8), CREAM, -7.4, 8.8, -4),
    part(cyl(0.1, 0.1, 3, 5), STEEL, -7.4, 10.5, -4),
    part(box(1.7, 1, 0.1), RED, -7.4, 11.4, -4),
    part(box(3, 1.2, 0.2), RED, 0, 6.2, 5.65),                         // the sign
  ];
  roofKit(p, 16, 11, 7.7);
  return M(p);
}

/** U.S. POST OFFICE — the smallest federal building in America, probably. */
export function makePostOffice(): THREE.Mesh {
  const p: G[] = [
    part(box(11, 5.5, 9), BONE, 0, 2.75, 0),
    part(box(11.6, 0.7, 9.6), CREAM, 0, 5.8, 0),
    part(box(9, 0.6, 3), CREAM, 0, 4.4, 5.2, -0.2, 0, 0),
    part(box(2.4, 3.2, 0.4), 0x3f5a7a, 0, 1.6, 4.6),
    part(box(1.8, 2, 0.35), GLASS, -3.2, 3, 4.6),
    part(box(1.8, 2, 0.35), GLASS, 3.2, 3, 4.6),
    part(box(4, 0.9, 0.25), 0x2f4a7a, 0, 5, 4.7),
    part(cyl(0.1, 0.12, 8, 6), STEEL, -6.4, 4, 4),                     // flagpole
    part(box(2.2, 1.3, 0.1), 0x2f4a7a, -5.3, 7.2, 4),
    part(box(1, 1.3, 0.12), RED, -4.4, 7.2, 4),
    part(box(0.7, 1.1, 1.1), 0x2f6ad8, 4.8, 0.7, 5.6),                 // the blue box
  ];
  roofKit(p, 11, 9, 6.15);
  return M(p);
}

/** THE WAR MEMORIAL — an obelisk, a plaque, and a wreath somebody keeps
 *  fresh. Nobody argues about this one. */
export function makeWarMemorial(): THREE.Mesh {
  const p: G[] = [
    part(box(3.4, 0.5, 3.4), BONE, 0, 0.25, 0),
    part(box(2.6, 0.6, 2.6), 0xd8d2c4, 0, 0.8, 0),
    part(box(1.5, 5.4, 1.5), 0xe0dad0, 0, 3.8, 0),
    part(cone(1.15, 1.2, 4), 0xe0dad0, 0, 7.1, 0, 0, Math.PI / 4, 0),
    part(box(1, 0.8, 0.1), 0xc9a24a, 0, 2.4, 0.78),
    part(new THREE.TorusGeometry(0.45, 0.13, 6, 12), 0x3f7a4e, 0, 1.2, 0.9, 0, 0, 0),
  ];
  return M(p);
}

/** THE MAPLE FALLS GAZETTE honour box. Weekly. Mostly the zoning board. */
export function makeNewsBox(): THREE.Mesh {
  return M([
    part(box(0.6, 1, 0.5), DARKSTEEL, 0, 0.5, 0),
    part(box(0.8, 1.1, 0.7), mpick([0x2f6ad8, 0x3f7a4e, 0xd8586f]), 0, 1.5, 0),
    part(box(0.55, 0.6, 0.1), CREAM, 0, 1.7, 0.36),
    part(box(0.85, 0.16, 0.75), 0x2c2438, 0, 2.12, 0),
  ]);
}

/** THE PARKING METER. THE parking meter. The one the protest is about. */
export function makeParkingMeter(): THREE.Mesh {
  return M([
    part(cyl(0.11, 0.14, 2.1, 6), DARKSTEEL, 0, 1.05, 0),
    part(box(0.42, 0.7, 0.34), 0x8a929e, 0, 2.35, 0),
    part(cyl(0.16, 0.16, 0.36, 10), 0xf2e6a0, 0, 2.5, 0.2, Math.PI / 2, 0, 0),
    part(box(0.5, 0.12, 0.4), 0x6f7684, 0, 2.76, 0),
  ]);
}

/** LETTERING, AT THE SCALE THE CAMERA ACTUALLY RESOLVES.
 *
 *  Every sign in this game was a coloured board with ONE fat white bar on it,
 *  and at play distance a single bar does not read as writing — it reads as a
 *  label nobody got round to printing. Three visible in the owner's phone photo
 *  of Maple Falls, all blank, which is a large part of what "the items look
 *  bare minimum" means.
 *
 *  The bake cannot carry real glyphs (the ground texture already proved the
 *  texel budget: ~4.7 per 3D unit), and a CanvasTexture per sign would be a
 *  draw call per sign. But a sign board is ~100 screen pixels wide at the play
 *  camera, and at that size ROWS OF DIFFERENT LENGTHS are what the eye reads as
 *  text — which is exactly how every stylised game of this kind draws a sign.
 *  Extra boxes on a mesh that is already merged: no new material, no new draw
 *  call, ~6 triangles a row.
 *
 *  RATIO is a fixed table, not a random draw. mainstreet.ts:252 records that
 *  adding a seeded draw "would shift every subsequent authored placement in
 *  Maple Falls", and an unseeded one would reshuffle every sign in town on
 *  every load. `variant` walks the table so two signs side by side do not read
 *  as the same sign, and it comes from the caller's own side/index.
 */
function signLines(x: number, y: number, z: number, w: number, h: number,
                   col: number, rows: number, variant = 0, rz = 0): G[] {
  // no two adjacent rows the same length: equal bars read as a barcode
  const RATIO = [0.94, 0.62, 0.82, 0.50, 0.88, 0.70];
  const step = h / rows;
  const bar = Math.min(step * 0.5, h * 0.26);
  const out: G[] = [];
  // rz TILTS THE WHOLE BLOCK, not each bar. part() composes scale -> rotate ->
  // translate, so a bar given rz spins about its own centre and then lands
  // wherever it is told; the rows have to be laid out along the TILTED axis
  // too, or a tilted placard gets level lines of text on it. (Rotating the
  // geometry after part() has already translated it spins it about the world
  // origin and throws it across the map, which is what the first version did.)
  const cos = Math.cos(rz), sin = Math.sin(rz);
  for (let i = 0; i < rows; i++) {
    const r = RATIO[Math.abs(i + variant) % RATIO.length];
    const dy = h / 2 - step * (i + 0.5);
    out.push(part(box(w * r, bar, 0.1), col, x - dy * sin, y + dy * cos, z, 0, 0, rz));
  }
  return out;
}

/** A FAIR SIGN on a verge — "THE FAIR, THIS WAY". There are hundreds of these.
 *  That is the point: a town that has committed to an event. */
export function makeLawnSign(side: number): THREE.Mesh {
  const c = FAIR_SIGN[Math.abs(side) % FAIR_SIGN.length];
  return M([
    part(box(0.06, 0.9, 0.06), 0xd8d8d8, -0.34, 0.45, 0),
    part(box(0.06, 0.9, 0.06), 0xd8d8d8, 0.34, 0.45, 0),
    part(box(1.05, 0.72, 0.07), c, 0, 1.16, 0),
    ...signLines(0, 1.32, 0.02, 0.84, 0.34, WHITE, 2, side),           // "THE FAIR"
    // a rosette, where the candidate's office used to be printed
    part(new THREE.CircleGeometry(0.15, 12), WHITE, -0.28, 1.02, 0.035),
    part(new THREE.CircleGeometry(0.09, 10), c, -0.28, 1.02, 0.045),
    ...signLines(0.18, 1.02, 0.02, 0.42, 0.20, WHITE, 2, side + 3),    // "THIS WAY"
  ]);
}

/** THE BIG ROADSIDE SIGN — the 4x8 sheet of plywood version, staked in a
 *  field, angled at the traffic. */
export function makeBigSign(side: number): THREE.Mesh {
  const c = FAIR_SIGN[Math.abs(side) % FAIR_SIGN.length];
  return M([
    part(box(0.22, 2.6, 0.22), DARKWOOD, -1.7, 1.3, 0),
    part(box(0.22, 2.6, 0.22), DARKWOOD, 1.7, 1.3, 0),
    part(box(4.4, 2.4, 0.16), c, 0, 2.9, 0),
    ...signLines(0, 3.30, 0.05, 3.5, 0.86, WHITE, 2, side),            // the headline
    ...signLines(0, 2.42, 0.05, 3.1, 0.62, WHITE, 3, side + 2),        // the small print
    part(box(4.6, 0.2, 0.26), WHITE, 0, 4.15, 0),
  ]);
}

/** A PROTESTER. Four of these stand outside the town hall about the parking
 *  meter, in all weathers, forever. */
export function makeProtester(side: number): THREE.Mesh {
  const p: G[] = [];
  personParts(p, 0, 0, mpick(SHIRTS), 0);
  p.push(part(box(0.12, 2.2, 0.12), WOOD, 0.5, 1.6, 0.2, 0, 0, -0.22));
  p.push(part(box(1.5, 1.05, 0.1), side ? BLUE : RED, 0.9, 3.2, 0.2, 0, 0, -0.22));
  // a placard nobody wrote on is a placard nobody is protesting with. The board
  // carries a -0.22 rad tilt, so the lettering takes the same one.
  p.push(...signLines(0.9, 3.2, 0.245, 1.24, 0.74, WHITE, 3, side, -0.22));
  return mergedProp(p, PROP_SMOOTH_MAT);   // a face is not architecture
}

/** A CITIZEN, standing about. Used to give districts life.ts never visits a
 *  face — the fair judges, the farmhands, the crowd at the drive-in. */
export function makeTownsfolk(hat = false): THREE.Mesh {
  const p: G[] = [];
  personParts(p, 0, 0, mpick(SHIRTS), mr(0, Math.PI * 2), hat ? mpick([0xd8b878, 0x5b6070, RED, BLUE]) : undefined);
  return mergedProp(p, PROP_SMOOTH_MAT);   // a face is not architecture
}

/** THE TOWN NOTICEBOARD — every flyer in Maple Falls, layered six deep. */
export function makeNoticeBoard(): THREE.Mesh {
  const p: G[] = [
    part(box(0.2, 2, 0.2), DARKWOOD, -1.5, 1, 0),
    part(box(0.2, 2, 0.2), DARKWOOD, 1.5, 1, 0),
    part(box(3.6, 2.2, 0.2), 0x6b503a, 0, 3, 0),
    part(box(3.9, 0.3, 0.45), 0x8c5a4a, 0, 4.25, 0, -0.2, 0, 0),
  ];
  for (let i = 0; i < 7; i++) {
    p.push(part(box(mr(0.5, 0.8), mr(0.4, 0.7), 0.06), mpick([WHITE, CREAM, 0xffe9a8, RED, BLUE]),
      mr(-1.4, 1.4), mr(2.3, 3.6), 0.13, 0, 0, mr(-0.2, 0.2)));
  }
  return M(p);
}

// ═══════════════════════════════════════════════════════════════════════════
// THE FAIRGROUNDS — Maple County Fair, running whether or not it is the season
// ═══════════════════════════════════════════════════════════════════════════

/** A STRIPED FAIR TENT. */
export function makeFairTent(col = RED): THREE.Mesh {
  const p: G[] = [];
  const R = 5;
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    p.push(part(cone(R * 0.34, 3.6, 3), i % 2 ? col : CREAM, Math.cos(a) * R * 0.72, 4.4, Math.sin(a) * R * 0.72, 0, -a, 0));
  }
  p.push(part(cone(R, 3.4, 10), CREAM, 0, 4.6, 0));
  p.push(part(cone(R * 0.62, 2.6, 10), col, 0, 6.4, 0));
  p.push(part(cyl(0.12, 0.12, 1.6, 5), WOOD, 0, 8.4, 0));
  p.push(part(box(1.2, 0.7, 0.06), mpick([RED, BLUE]), 0.6, 8.9, 0));
  for (let i = 0; i < 10; i++) {                                        // pole ring
    const a = (i / 10) * Math.PI * 2;
    p.push(part(cyl(0.1, 0.12, 2.9, 5), WOOD, Math.cos(a) * R, 1.45, Math.sin(a) * R));
  }
  return M(p);
}

/** THE FAIR ARCH — MAPLE COUNTY FAIR, est. whenever, bulbs and bunting. */
export function makeFairArch(): THREE.Mesh {
  const p: G[] = [
    part(box(1.4, 8, 1.4), CREAM, -7, 4, 0),
    part(box(1.4, 8, 1.4), CREAM, 7, 4, 0),
    part(box(16, 1.8, 1.6), RED, 0, 8.7, 0),
    part(box(14, 0.9, 1.7), CREAM, 0, 8.7, 0),
    part(box(16.6, 0.5, 1.9), NEON_GOLD, 0, 9.8, 0),
  ];
  for (let i = 0; i < 13; i++) p.push(part(sph(0.28, 6, 5), NEON_GOLD, -7.5 + i * 1.25, 10.2, 0));
  for (let i = 0; i < 8; i++) p.push(part(cone(0.6, 1.1, 3), i % 2 ? BLUE : CREAM, -6.3 + i * 1.8, 7.4, 0.9, Math.PI, 0, 0));
  return M(p);
}

/** THE PRIZE WHEEL. Nobody has ever won the top slice. */
export function makePrizeWheel(): THREE.Mesh {
  const p: G[] = [
    part(box(2.4, 0.4, 1.6), DARKWOOD, 0, 0.2, 0),
    part(cyl(0.24, 0.3, 2.2, 6), WOOD, 0, 1.3, 0),
    part(cyl(2.1, 2.1, 0.32, 16), CREAM, 0, 4, 0, Math.PI / 2, 0, 0),
  ];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    p.push(part(box(1.7, 0.5, 0.36), i % 2 ? RED : BLUE, Math.cos(a) * 1.05, 4 + Math.sin(a) * 1.05, 0.02, 0, 0, a));
  }
  p.push(part(cyl(0.3, 0.3, 0.5, 10), NEON_GOLD, 0, 4, 0.2, Math.PI / 2, 0, 0));
  p.push(part(cone(0.3, 0.7, 3), 0x2c2438, 0, 6.3, 0.1, Math.PI, 0, 0));
  return M(p);
}

/** THE PIE CONTEST TABLE. Eleven pies, one blue ribbon, four decades of
 *  simmering resentment. */
export function makePieTable(): THREE.Mesh {
  const p: G[] = [
    part(box(6, 0.28, 2.4), WHITE, 0, 1.1, 0),
    part(box(6.2, 0.6, 2.6), RED, 0, 0.85, 0),
    part(cyl(0.12, 0.12, 1.1, 5), WOOD, -2.7, 0.55, -0.9),
    part(cyl(0.12, 0.12, 1.1, 5), WOOD, 2.7, 0.55, -0.9),
    part(cyl(0.12, 0.12, 1.1, 5), WOOD, -2.7, 0.55, 0.9),
    part(cyl(0.12, 0.12, 1.1, 5), WOOD, 2.7, 0.55, 0.9),
  ];
  for (let i = 0; i < 7; i++) {
    const x = -2.4 + i * 0.8;
    p.push(part(cyl(0.36, 0.32, 0.2, 10), mpick([0xe8c9a0, 0xd8a86a, 0xf0dcb8]), x, 1.34, mr(-0.5, 0.5)));
    p.push(part(cyl(0.24, 0.26, 0.12, 8), mpick([0x9a2a3a, 0xd8862a, 0x6a3a6a]), x, 1.46, 0));
  }
  p.push(part(box(0.5, 0.7, 0.06), 0x2f6ad8, 2.6, 1.6, 0.9));           // the blue ribbon
  p.push(part(cyl(0.3, 0.3, 0.08, 10), NEON_GOLD, 2.6, 2.1, 0.9, Math.PI / 2, 0, 0));
  return M(p);
}

/** CORN DOGS / LEMONADE — the fair's food row unit. */
export function makeFairStand(): THREE.Mesh {
  const col = mpick(AWNING);
  const p: G[] = [
    part(box(5, 2.6, 2.6), CREAM, 0, 1.3, 0),
    part(box(5.4, 0.4, 3), col, 0, 2.8, 0),
    part(box(5.4, 0.4, 2), col, 0, 3.4, 1.5, -0.42, 0, 0),
    part(box(5.2, 0.3, 0.5), WOOD, 0, 2.05, 1.4),                       // counter
    part(box(4, 1.1, 0.14), col, 0, 3.9, 0),
    part(box(3, 0.5, 0.18), WHITE, 0, 3.95, 0.08),
    part(cyl(0.1, 0.1, 1.6, 5), STEEL, -2.4, 3.6, 1.4),
    part(cyl(0.1, 0.1, 1.6, 5), STEEL, 2.4, 3.6, 1.4),
  ];
  for (let i = 0; i < 4; i++) p.push(part(cone(0.44, 0.8, 3), i % 2 ? RED : CREAM, -1.8 + i * 1.2, 4.4, 0, Math.PI, 0, 0));
  return M(p);
}

/** HAY BALES, stacked. Fair seating, farm scenery, and the thing kids climb. */
export function makeHayBales(): THREE.Mesh {
  const p: G[] = [];
  const n = 3 + Math.floor(mrnd() * 3);
  for (let i = 0; i < n; i++) {
    const row = i < 3 ? 0 : 1;
    const x = (i % 3) * 2.05 - 2.05, y = row * 1.5 + 0.75;
    p.push(part(cyl(0.85, 0.85, 1.9, 10), HAY, x + (row ? 1 : 0), y, mr(-0.2, 0.2), 0, 0, Math.PI / 2));
    p.push(part(cyl(0.86, 0.86, 0.2, 10), 0xc0a860, x + (row ? 1 : 0), y, 0, 0, 0, Math.PI / 2));
  }
  return noFront(M(p));
}

/** THE TICKET BOOTH. Cash only. Has been "back in 5" since 1994. */
export function makeTicketBooth(): THREE.Mesh {
  return M([
    part(box(2.6, 3, 2.6), CREAM, 0, 1.5, 0),
    part(cone(2.5, 1.4, 4), RED, 0, 3.7, 0, 0, Math.PI / 4, 0),
    part(box(1.6, 1.1, 0.3), NIGHTGLASS, 0, 2, 1.35),
    part(box(1.9, 0.3, 0.45), WOOD, 0, 1.35, 1.45),
    part(box(2, 0.6, 0.14), BLUE, 0, 3.05, 1.4),
    part(cyl(0.1, 0.1, 1, 5), STEEL, 0, 4.9, 0),
    part(box(0.9, 0.6, 0.08), NEON_GOLD, 0.4, 5.3, 0),
  ]);
}

/** THE STRONGMAN BELL. Somebody's uncle rings it every year and pulls
 *  something every year. */
export function makeStrikerBell(): THREE.Mesh {
  const p: G[] = [
    part(box(1.6, 0.4, 1.6), DARKWOOD, 0, 0.2, 0),
    part(box(0.7, 8, 0.7), RED, 0, 4.2, 0),
    part(box(0.9, 0.4, 0.9), CREAM, 0, 8.4, 0),
    part(cyl(0.6, 0.8, 0.9, 10), NEON_GOLD, 0, 9, 0),
    part(box(1.4, 0.6, 0.6), 0x2c2438, 0.9, 0.7, 0, 0, 0, 0.4),         // the mallet
    part(cyl(0.1, 0.1, 1.8, 5), WOOD, 1.5, 0.9, 0, 0, 0, 1.1),
  ];
  for (let i = 0; i < 8; i++) p.push(part(box(0.9, 0.22, 0.75), i % 2 ? CREAM : BLUE, 0, 1 + i * 0.9, 0));
  return M(p);
}

// ═══════════════════════════════════════════════════════════════════════════
// THE FARM — Maple Falls' bottomland, and half its politics
// ═══════════════════════════════════════════════════════════════════════════

/** THE BARN. Gambrel roof, hex sign, doors that don't quite shut. */
export function makeBarn(): THREE.Mesh {
  const p: G[] = [
    part(box(16, 7, 11), BARN, 0, 3.5, 0),
    part(box(16.4, 0.5, 11.4), CREAM, 0, 7.1, 0),
    part(box(16.3, 3, 8), 0x9c2f27, 0, 8.6, 0, 0, 0, 0, 1, 1, 1),       // lower gambrel
    part(box(16.3, 2.6, 4.4), 0x8c2a22, 0, 11.1, 0),                    // upper gambrel
    part(box(16.6, 0.4, 4.6), CREAM, 0, 12.5, 0),
    part(box(5, 5.4, 0.4), 0x7a2119, 0, 2.7, 5.6),                      // big doors
    part(box(0.35, 5.4, 0.5), CREAM, 0, 2.7, 5.75),
    part(box(5.2, 0.35, 0.5), CREAM, 0, 4.4, 5.75),
    part(box(5.2, 0.3, 0.5), CREAM, 0, 0.3, 5.75),
    part(box(3, 2.4, 0.4), 0x7a2119, 0, 9.6, 5.6),                      // hay loft
    part(cyl(1.2, 1.2, 0.24, 10), CREAM, -5.4, 9.4, 5.7, Math.PI / 2, 0, 0),
    part(cyl(0.8, 0.8, 0.28, 8), BLUE, -5.4, 9.4, 5.8, Math.PI / 2, 0, 0),
    part(cyl(0.4, 0.4, 0.3, 8), RED, -5.4, 9.4, 5.9, Math.PI / 2, 0, 0),
    part(cyl(0.1, 0.1, 1.4, 5), STEEL, 6, 13.4, 0),                     // weather vane
    part(box(1.2, 0.5, 0.1), 0x2c2438, 6.4, 14.2, 0),
  ];
  return M(p);
}

/** THE SILO. */
export function makeSilo(): THREE.Mesh {
  const p: G[] = [
    part(cyl(2.2, 2.35, 15, 14), 0xdcd6c8, 0, 7.5, 0),
    part(sph(2.25, 14, 8), STEEL, 0, 15, 0, 0, 0, 0, 1, 0.55, 1),
    part(cyl(0.5, 0.5, 1.2, 8), DARKSTEEL, 0, 16.4, 0),
  ];
  for (let i = 1; i < 7; i++) p.push(part(cyl(2.4, 2.4, 0.16, 14), 0xc4bcac, 0, i * 2.1, 0));
  for (let i = 0; i < 9; i++) p.push(part(box(0.7, 0.14, 0.14), DARKSTEEL, 0, 1.4 + i * 1.6, 2.35));   // ladder
  p.push(part(box(0.14, 14, 0.14), DARKSTEEL, -0.32, 7.5, 2.35));
  p.push(part(box(0.14, 14, 0.14), DARKSTEEL, 0.32, 7.5, 2.35));
  return M(p);
}

/** THE GRAIN ELEVATOR — the tallest thing in the county, right on the tracks. */
export function makeGrainElevator(): THREE.Mesh {
  const p: G[] = [
    part(box(9, 20, 7), 0xd8d0be, 0, 10, 0),
    part(box(9.6, 1, 7.6), 0xc0b6a2, 0, 20.5, 0),
    part(box(5.5, 4.5, 7.8), STEEL, 0, 23.2, 0),                        // headhouse
    part(box(6, 0.6, 8.2), DARKSTEEL, 0, 25.6, 0),
    part(box(3.4, 9, 3.4), 0xc4bcac, -6.2, 4.5, 0),                     // the driveway shed
    part(box(3.8, 0.6, 3.8), STEEL, -6.2, 9.3, 0),
    part(box(2.4, 5, 0.3), 0x6b503a, -6.2, 2.5, 1.75),
    part(box(7, 2, 0.2), RED, 0, 15.5, 3.6),                            // MAPLE FALLS GRAIN CO.
    part(box(5.4, 0.9, 0.26), CREAM, 0, 15.5, 3.68),
    part(box(1.2, 12, 1.2), STEEL, 5.4, 12, 3.9, 0.28, 0, 0),           // the leg
    part(cyl(0.1, 0.1, 2, 5), DARKSTEEL, 0, 26.6, 0),
    part(sph(0.3, 6, 5), RED, 0, 27.6, 0),
  ];
  for (const sz of [-1, 1]) for (let i = 0; i < 3; i++) {
    p.push(part(cyl(2.1, 2.1, 12, 12), 0xcac2b0, 6.5 + i * 4.3, 6, sz * 6.2));
    p.push(part(cone(2.15, 1.6, 12), STEEL, 6.5 + i * 4.3, 12.8, sz * 6.2));
  }
  return M(p);
}

/** THE TRACTOR. Green, obviously. */
export function makeTractor(): THREE.Mesh {
  return M([
    part(box(3.4, 1.1, 1.5), 0x3f7a4e, 0, 1.5, 0),                      // body
    part(box(1.7, 1.4, 1.4), 0x3f7a4e, -0.8, 2.4, 0),                   // hood/engine
    part(box(1.5, 1.5, 1.6), 0x2f5f3c, 1, 2.5, 0),                      // cab base
    part(box(1.3, 1.3, 1.4), GLASS, 1, 3.5, 0),
    part(box(1.6, 0.3, 1.8), NEON_GOLD, 1, 4.3, 0),
    part(cyl(1.15, 1.15, 0.8, 12), 0x2c2438, 1.1, 1.15, 1.05, 0, 0, Math.PI / 2),
    part(cyl(1.15, 1.15, 0.8, 12), 0x2c2438, 1.1, 1.15, -1.05, 0, 0, Math.PI / 2),
    part(cyl(0.62, 0.62, 0.55, 10), 0x2c2438, -1.5, 0.62, 0.85, 0, 0, Math.PI / 2),
    part(cyl(0.62, 0.62, 0.55, 10), 0x2c2438, -1.5, 0.62, -0.85, 0, 0, Math.PI / 2),
    part(cyl(0.6, 0.6, 0.3, 10), NEON_GOLD, 1.1, 1.15, 1.45, 0, 0, Math.PI / 2),
    part(cyl(0.6, 0.6, 0.3, 10), NEON_GOLD, 1.1, 1.15, -1.45, 0, 0, Math.PI / 2),
    part(cyl(0.16, 0.2, 1.6, 6), 0x2c2438, -1.3, 3.7, 0.5),             // exhaust
    part(box(1.6, 0.24, 0.24), RED, -2.2, 1.2, 0),
  ]);
}

/** THE FARMHOUSE — white, porch all the way round, one rocking chair. */
export function makeFarmhouse(): THREE.Mesh {
  const p: G[] = [
    part(box(11, 6, 9), WHITE, 0, 3, 0),
    part(cone(8.4, 3.2, 4), 0x5b6070, 0, 7.6, 0, 0, Math.PI / 4, 0, 1, 1, 0.82),
    part(box(13, 0.3, 3.4), 0xd8d2c4, 0, 2.7, 5.4),                     // porch deck
    part(box(13.4, 0.4, 3.8), WHITE, 0, 4.6, 5.6, -0.14, 0, 0),         // porch roof
    part(box(2.2, 3.2, 0.35), 0x3f7a4e, 0, 1.6, 4.6),
    part(box(2, 1.4, 0.4), STEEL, -3, 6.6, 0),                          // chimney
    part(box(1, 2, 1), BRICK, 4.2, 8.4, 0),
  ];
  for (const cx of [-5.6, -2.8, 0, 2.8, 5.6]) p.push(part(cyl(0.16, 0.18, 2, 6), WHITE, cx, 3.6, 6.7));
  for (const [wx, wy] of [[-3.4, 2], [3.4, 2], [-3.4, 4.6], [0, 4.6], [3.4, 4.6]] as const) {
    p.push(part(box(1.3, 1.7, 0.3), NIGHTGLASS, wx, wy, 4.6));
    p.push(part(box(1.6, 0.24, 0.4), WHITE, wx, wy + 1, 4.65));
  }
  p.push(part(box(0.8, 0.9, 0.7), 0x8c5a4a, 4.5, 3.2, 5.6, 0, 0.3, 0));  // the rocking chair
  p.push(part(box(0.8, 0.14, 0.9), 0x8c5a4a, 4.5, 3.05, 5.6, 0, 0.3, 0));
  return M(p);
}

/** A ROW OF CORN. Laid end to end these build the corn maze. */
export function makeCornRow(len = 8): THREE.Mesh {
  const p: G[] = [];
  const n = Math.max(3, Math.round(len / 1.0));
  for (let i = 0; i < n; i++) {
    const x = -len / 2 + (i / (n - 1)) * len, h = mr(2.6, 3.4);
    p.push(part(cyl(0.07, 0.11, h, 4), 0x6a9a3a, x, h / 2, mr(-0.25, 0.25)));
    for (let k = 0; k < 2; k++) {
      p.push(part(box(0.1, 0.9, 0.5), 0x7ab04a, x, h * (0.48 + k * 0.24), 0, mr(-0.4, 0.4), mr(0, 6.28), mr(-0.7, 0.7)));
    }
    if (i % 3 === 0) p.push(part(cyl(0.13, 0.09, 0.6, 6), CORN, x + 0.1, h * 0.72, 0, 0, 0, 0.3));
  }
  return M(p);
}

/** A PUMPKIN. The patch is a few dozen of these. */
export function makePumpkin(): THREE.Mesh {
  const r = mr(0.4, 0.72);
  return noFront(M([
    part(sph(r, 9, 7), PUMPKIN, 0, r * 0.78, 0, 0, 0, 0, 1, 0.78, 1),
    part(sph(r * 0.86, 9, 7), 0xd8641a, 0, r * 0.78, 0, 0, 0, 0, 1.06, 0.72, 1.06),
    part(cyl(0.09, 0.13, 0.4, 5), 0x5a7a3a, 0, r * 1.4, 0),
    part(box(0.5, 0.08, 0.16), 0x6a9a3a, r * 0.9, r * 0.3, 0, 0, mr(0, 3), 0.2),
  ]));
}

/** THE SCARECROW. Wearing a Dinkle shirt, because the farm has views. */
export function makeScarecrow(): THREE.Mesh {
  const side = mchance(0.5) ? RED : BLUE;
  return M([
    part(box(0.22, 3.4, 0.22), DARKWOOD, 0, 1.7, 0),
    part(box(3, 0.2, 0.2), DARKWOOD, 0, 2.7, 0),
    part(box(1.1, 1.3, 0.6), side, 0, 2.5, 0),
    part(box(0.36, 1.2, 0.36), HAY, -1.15, 2.4, 0, 0, 0, 0.2),
    part(box(0.36, 1.2, 0.36), HAY, 1.15, 2.4, 0, 0, 0, -0.2),
    part(sph(0.42, 8, 6), 0xd8b878, 0, 3.6, 0),
    part(cyl(0.42, 0.5, 0.24, 8), 0xb08a4a, 0, 3.92, 0),
    part(cyl(0.9, 0.9, 0.14, 10), 0xb08a4a, 0, 3.82, 0),
    part(box(0.12, 0.12, 0.12), 0x2c2438, -0.16, 3.66, 0.4),
    part(box(0.12, 0.12, 0.12), 0x2c2438, 0.16, 3.66, 0.4),
  ]);
}

/** CHICKEN COOP. Contains chickens. They also have opinions. */
export function makeChickenCoop(): THREE.Mesh {
  const p: G[] = [
    part(box(4, 2, 3), 0xc9a878, 0, 1, 0),
    part(box(4.4, 0.35, 3.4), 0xa8543f, 0, 2.2, 0, 0, 0, 0.2),
    part(box(1, 1.2, 0.25), 0x6b503a, -1.1, 0.6, 1.6),
    part(box(1.6, 0.2, 1.6), WOOD, 1, 0.35, 2, -0.35, 0, 0),
    part(box(4.2, 1.4, 0.14), 0xd8d8d8, 0, 0.7, 1.55),
  ];
  for (let i = 0; i < 3; i++) {
    const x = mr(-1.6, 1.8), z = mr(2.2, 3.4);
    p.push(part(sph(0.28, 7, 6), mpick([WHITE, 0xd8a86a, 0x8c5a4a]), x, 0.32, z, 0, 0, 0, 1.2, 1, 1));
    p.push(part(sph(0.16, 6, 5), WHITE, x + 0.3, 0.55, z));
    p.push(part(cone(0.08, 0.16, 4), NEON_GOLD, x + 0.44, 0.55, z, 0, 0, -Math.PI / 2));
    p.push(part(box(0.14, 0.16, 0.08), RED, x + 0.3, 0.72, z));
  }
  return M(p);
}

/** THE ROADSIDE PRODUCE STAND. Honesty box. Somebody keeps taking the corn. */
export function makeFarmStand(): THREE.Mesh {
  const p: G[] = [
    part(box(4, 0.3, 2), WOOD, 0, 1.2, 0),
    part(box(4.2, 1.05, 2.2), 0x8c5a4a, 0, 0.525, 0),   // reached the ground 0.3 short

    part(box(4.6, 0.3, 2.6), 0x3f7a4e, 0, 3, 0, -0.2, 0, 0),
    part(cyl(0.14, 0.14, 2.4, 5), WOOD, -1.9, 2, -0.9),
    part(cyl(0.14, 0.14, 2.4, 5), WOOD, 1.9, 2, -0.9),
    part(box(3.4, 0.8, 0.14), CREAM, 0, 3.5, -0.9),
  ];
  for (let i = 0; i < 6; i++) {
    p.push(part(sph(mr(0.2, 0.34), 7, 6), mpick([PUMPKIN, CORN, 0xd8392f, 0x5db06a, 0x9a2a3a]), mr(-1.6, 1.6), 1.55, mr(-0.5, 0.5)));
  }
  return M(p);
}

/** A WATER TROUGH. Where the 4-H heifers drink. */
export function makeTrough(): THREE.Mesh {
  return M([
    part(box(4, 0.9, 1.4), 0x8a929e, 0, 0.45, 0),
    part(box(3.6, 0.2, 1.1), 0x6fa8d8, 0, 0.85, 0),
    part(cyl(0.14, 0.14, 1.4, 5), DARKSTEEL, -2.1, 0.7, 0),
    part(cyl(0.16, 0.16, 0.4, 5), DARKSTEEL, -2.1, 1.4, 0.2, Math.PI / 2, 0, 0),
  ]);
}

// ═══════════════════════════════════════════════════════════════════════════
// MAPLE FALLS HIGH — home of the Fighting Maples (0-9 this season)
// ═══════════════════════════════════════════════════════════════════════════

/** THE HIGH SCHOOL. Brick, three storeys, a clock nobody has fixed. */
export function makeHighSchool(): THREE.Mesh {
  const p: G[] = [
    part(box(26, 9, 13), BRICK, 0, 4.5, 0),
    part(box(26.6, 0.9, 13.6), CREAM, 0, 9.4, 0),
    part(box(8, 12, 10), 0x94472f, 0, 6, 2),                            // centre pavilion
    part(box(8.6, 1, 10.6), CREAM, 0, 12.4, 2),
    part(cone(6, 2.4, 4), 0x5b6070, 0, 14.1, 2, 0, Math.PI / 4, 0),
    part(cyl(1.4, 1.4, 0.3, 14), CREAM, 0, 11.2, 7.2, Math.PI / 2, 0, 0),
    part(cyl(1.05, 1.05, 0.34, 14), NIGHTGLASS, 0, 11.2, 7.3, Math.PI / 2, 0, 0),
    part(box(0.16, 0.8, 0.1), CREAM, 0, 11.5, 7.5),
    part(box(4.4, 0.7, 2.6), CREAM, 0, 5, 8, -0.16, 0, 0),              // entry canopy
    part(box(3.4, 4, 0.4), 0x2f4a7a, 0, 2, 7.2),
    part(box(6, 1.2, 0.3), NEON_GOLD, 0, 8.4, 7.15),                    // MAPLE FALLS HIGH
  ];
  for (let f = 0; f < 3; f++) for (let i = 0; i < 8; i++) {
    const wx = i < 4 ? -12 + i * 2.4 : 5.6 + (i - 4) * 2.4;
    p.push(part(box(1.6, 1.9, 0.3), NIGHTGLASS, wx, 2.2 + f * 3, 6.6));
    p.push(part(box(1.9, 0.24, 0.4), CREAM, wx, 3.3 + f * 3, 6.65));
  }
  roofKit(p, 26, 13, 9.85, 0.7);
  return M(p);
}

/** BLEACHERS — five rows and a rail, facing the field. */
export function makeBleachers(): THREE.Mesh {
  const p: G[] = [];
  for (let i = 0; i < 5; i++) {
    p.push(part(box(16, 0.3, 1.1), STEEL, 0, 0.7 + i * 0.75, -i * 1.15));       // seat
    p.push(part(box(16, 0.7, 0.22), 0x9aa2ae, 0, 0.35 + i * 0.75, -i * 1.15 - 0.5));  // riser
  }
  for (const sx of [-8, -2.6, 2.6, 8]) {
    p.push(part(box(0.28, 4.6, 0.28), DARKSTEEL, sx, 2.3, -4.6));
    p.push(part(box(0.28, 5.4, 6.5), DARKSTEEL, sx, 2.6, -2.6, -0.6, 0, 0, 1, 1, 0.06));
  }
  p.push(part(box(16.4, 0.2, 0.2), DARKSTEEL, 0, 5.4, -4.7));
  p.push(part(box(16.4, 0.2, 0.2), DARKSTEEL, 0, 4.4, -4.7));
  p.push(part(box(16, 1.1, 0.16), NEON_GOLD, 0, 5.9, -4.9));                    // the banner
  p.push(part(box(11, 0.5, 0.2), 0x2f4a7a, 0, 5.9, -4.98));
  return M(p);
}

/** A GOALPOST. Regulation-ish. */
export function makeGoalpost(): THREE.Mesh {
  return M([
    part(box(1.4, 0.3, 1.4), 0xd8d8d8, 0, 0.15, 0),
    part(cyl(0.24, 0.3, 4.6, 8), NEON_GOLD, 0, 2.3, 0),
    part(cyl(0.24, 0.24, 1.6, 8), NEON_GOLD, 0, 4.4, 0.8, Math.PI / 2, 0, 0),
    part(box(6.6, 0.26, 0.26), NEON_GOLD, 0, 4.6, 1.6),
    part(cyl(0.2, 0.2, 6, 8), NEON_GOLD, -3.3, 7.6, 1.6),
    part(cyl(0.2, 0.2, 6, 8), NEON_GOLD, 3.3, 7.6, 1.6),
    part(box(0.1, 1.4, 0.1), RED, -3.3, 11.2, 1.6),
  ]);
}

/** THE SCOREBOARD. HOME 0 — VISITOR 34. */
export function makeScoreboard(): THREE.Mesh {
  return M([
    part(box(0.5, 5, 0.5), DARKSTEEL, -3, 2.5, 0),
    part(box(0.5, 5, 0.5), DARKSTEEL, 3, 2.5, 0),
    part(box(8, 5, 0.7), 0x2c2438, 0, 7.4, 0),
    part(box(8.4, 0.5, 0.9), 0x2f4a7a, 0, 10.1, 0),
    part(box(7.2, 0.9, 0.2), NEON_GOLD, 0, 9.4, 0.4),
    part(box(2.4, 1.6, 0.2), 0x1a1420, -1.9, 7.4, 0.4),
    part(box(2.4, 1.6, 0.2), 0x1a1420, 1.9, 7.4, 0.4),
    part(box(0.4, 1.2, 0.24), 0xff4d3a, -2.4, 7.4, 0.46),
    part(box(0.4, 1.2, 0.24), 0xff4d3a, 1.4, 7.4, 0.46),
    part(box(0.4, 1.2, 0.24), 0xff4d3a, 2.4, 7.4, 0.46),
    part(box(6.6, 0.7, 0.22), CREAM, 0, 5.5, 0.4),
  ]);
}

/** THE MARCHING BAND TRAILER — parked by the field, doors open, one tuba
 *  visible, wrapped in the school colours. */
export function makeBandTrailer(): THREE.Mesh {
  const p: G[] = [
    part(box(11, 3.6, 3.4), CREAM, 0, 3, 0),
    part(box(11.2, 0.4, 3.6), 0x2f4a7a, 0, 4.9, 0),
    part(box(11.2, 0.6, 3.6), NEON_GOLD, 0, 2.2, 0),
    part(box(8, 1.4, 0.2), 0x2f4a7a, 0, 3.4, 1.75),                     // MAPLE FALLS BAND
    part(box(0.4, 3.4, 3.4), DARKSTEEL, 5.6, 3, 0),                     // rear doors, open
    part(box(0.3, 3.2, 2.6), 0xd8d2c4, 6.6, 3, 1.8, 0, 0.6, 0),
    part(box(0.3, 3.2, 2.6), 0xd8d2c4, 6.6, 3, -1.8, 0, -0.6, 0),
    part(box(3, 1, 0.6), DARKSTEEL, -6.4, 1.5, 0),                      // tow hitch
    part(cyl(0.85, 0.85, 0.6, 12), 0x2c2438, -2.4, 0.85, 1.6, 0, 0, Math.PI / 2),
    part(cyl(0.85, 0.85, 0.6, 12), 0x2c2438, -2.4, 0.85, -1.6, 0, 0, Math.PI / 2),
    part(cyl(0.85, 0.85, 0.6, 12), 0x2c2438, 2.4, 0.85, 1.6, 0, 0, Math.PI / 2),
    part(cyl(0.85, 0.85, 0.6, 12), 0x2c2438, 2.4, 0.85, -1.6, 0, 0, Math.PI / 2),
    // the tuba
    part(new THREE.TorusGeometry(0.75, 0.22, 6, 14), NEON_GOLD, 7.6, 1.6, 0, 0, 0.3, 0),
    part(cone(0.9, 1.1, 10), NEON_GOLD, 7.9, 2.6, 0, 0, 0, 0),
  ];
  return M(p);
}

/** THE CONCESSION STAND. Nachos, and the good pretzels. */
export function makeConcession(): THREE.Mesh {
  return M([
    part(box(7, 3.4, 4), CREAM, 0, 1.7, 0),
    part(box(7.4, 0.5, 4.4), 0x2f4a7a, 0, 3.6, 0),
    part(box(6.4, 0.24, 2), NEON_GOLD, 0, 4.1, 2, -0.36, 0, 0),         // propped shutter
    part(box(6.4, 0.4, 0.7), WOOD, 0, 2.1, 2.1),
    part(box(5, 1, 0.16), RED, 0, 4.2, -2.1),
    part(cyl(0.1, 0.1, 1.9, 5), STEEL, -3, 3.1, 1.9),
    part(cyl(0.1, 0.1, 1.9, 5), STEEL, 3, 3.1, 1.9),
    part(box(1.2, 1.2, 0.2), 0xffd23f, -2.2, 2.9, 2.05),
    part(box(1.2, 1.2, 0.2), 0xff7a5a, 2.2, 2.9, 2.05),
  ]);
}

/** THE SCHOOL BUS. */
export function makeSchoolBus(): THREE.Mesh {
  const p: G[] = [
    part(box(11, 3, 3), 0xf5c518, 0, 2.6, 0),
    part(box(2.6, 2, 3), 0xf5c518, -6.2, 2.1, 0),                       // snout
    part(box(11.2, 0.4, 3.2), 0x2c2438, 0, 1.1, 0),
    part(box(11.2, 0.3, 3.2), 0x2c2438, 0, 3, 0),
    part(box(11.4, 0.3, 3.3), 0xe0b010, 0, 4.15, 0),
    part(box(2, 1.3, 3.1), GLASS, -6.1, 2.7, 0),
  ];
  for (let i = 0; i < 6; i++) for (const sz of [-1.53, 1.53]) {
    p.push(part(box(1.3, 1.3, 0.14), GLASS, -4.4 + i * 1.8, 3, sz));
  }
  for (const [x, z] of [[-4.4, 1.6], [-4.4, -1.6], [3.6, 1.6], [3.6, -1.6]] as const) {
    p.push(part(cyl(0.85, 0.85, 0.55, 10), 0x2c2438, x, 0.85, z, 0, 0, Math.PI / 2));
  }
  p.push(part(box(0.8, 0.6, 0.3), RED, -7.4, 3.6, 1.1));
  p.push(part(box(0.8, 0.6, 0.3), RED, -7.4, 3.6, -1.1));
  return M(p);
}

// ═══════════════════════════════════════════════════════════════════════════
// THE STRIP — everything on the highway before you reach town
// ═══════════════════════════════════════════════════════════════════════════

/** THE GAS STATION — canopy, two pumps, and a PRICE BOARD that has been
 *  weaponised by both campaigns. */
export function makeGasStation(): THREE.Mesh {
  const p: G[] = [
    part(box(9, 4, 7), CREAM, -6, 2, 0),                                // the store
    part(box(9.4, 0.6, 7.4), RED, -6, 4.3, 0),
    part(box(6, 2.6, 0.3), GLASS, -6, 2, 3.6),
    part(box(2, 3, 0.3), 0x3f5a7a, -2.4, 1.5, 3.6),
    part(box(7, 0.9, 0.2), NEON_CYAN, -6, 3.6, 3.7),
    // the canopy
    part(box(14, 1.1, 9), WHITE, 5, 6.4, 0),
    part(box(14.4, 0.5, 9.4), RED, 5, 5.7, 0),
    part(box(13.6, 0.4, 8.8), NEON_GOLD, 5, 5.35, 0),
    part(box(0.7, 6, 0.7), STEEL, 0, 3, 3.4),
    part(box(0.7, 6, 0.7), STEEL, 10, 3, 3.4),
    part(box(0.7, 6, 0.7), STEEL, 0, 3, -3.4),
    part(box(0.7, 6, 0.7), STEEL, 10, 3, -3.4),
  ];
  for (const px of [2.4, 7.6]) {                                        // pumps
    p.push(part(box(1.6, 0.4, 3), 0xd0d4dc, px, 0.2, 0));
    p.push(part(box(1.1, 2.4, 1.1), 0xe8ecf2, px, 1.6, -0.7));
    p.push(part(box(1.1, 2.4, 1.1), 0xe8ecf2, px, 1.6, 0.7));
    p.push(part(box(0.9, 0.6, 0.16), 0x1a1420, px, 2.3, -1.28));
    p.push(part(box(0.9, 0.6, 0.16), 0x1a1420, px, 2.3, 1.28));
  }
  // THE PRICE BOARD
  p.push(part(box(0.8, 8, 0.8), STEEL, -12, 4, 4));
  p.push(part(box(4.4, 3.4, 0.6), RED, -12, 9.4, 4));
  p.push(part(box(3.6, 1, 0.2), CREAM, -12, 10.4, 4.35));
  p.push(part(box(3.6, 1.4, 0.2), 0x1a1420, -12, 8.8, 4.35));
  p.push(part(box(0.5, 1, 0.24), NEON_GOLD, -13.2, 8.8, 4.4));
  p.push(part(box(0.5, 1, 0.24), NEON_GOLD, -12.4, 8.8, 4.4));
  p.push(part(box(0.5, 1, 0.24), NEON_GOLD, -11.6, 8.8, 4.4));
  p.push(part(box(0.5, 1, 0.24), NEON_GOLD, -10.8, 8.8, 4.4));
  return M(p);
}

/** THE MAPLE MOTOR LODGE — an L of eight doors, a pool nobody swims in, and
 *  a VACANCY sign with the NO burnt out. */
export function makeMotel(): THREE.Mesh {
  const p: G[] = [
    part(box(24, 4.2, 8), 0xe8dcc0, 0, 2.1, 0),
    part(box(24.6, 0.5, 8.6), BLUE, 0, 4.5, 0),
    part(box(25, 0.4, 3.2), BLUE, 0, 4.1, 5.2, -0.14, 0, 0),            // walkway roof
  ];
  for (let i = 0; i < 8; i++) {
    const x = -10.5 + i * 3;
    p.push(part(box(1.5, 2.8, 0.3), mpick([0x3f5a7a, 0x8c5a4a, 0x3f7a4e]), x, 1.4, 4.1));
    p.push(part(box(1.1, 1.2, 0.28), NIGHTGLASS, x + 1.5, 2.5, 4.1));
    p.push(part(box(0.24, 0.3, 0.1), NEON_GOLD, x - 0.5, 3.1, 4.3));    // room number
    if (i % 2 === 0) p.push(part(cyl(0.14, 0.14, 3.6, 5), STEEL, x + 0.75, 1.8, 5.5));
  }
  // THE SIGN
  p.push(part(box(1, 11, 1), STEEL, -14, 5.5, 2));
  p.push(part(box(5.6, 4.4, 0.7), 0x2c2438, -14, 12.4, 2));
  p.push(part(box(5, 1.6, 0.2), NEON_PINK, -14, 13.5, 2.4));
  p.push(part(box(4.4, 1.1, 0.2), NEON_CYAN, -14, 11.5, 2.4));
  p.push(part(box(1.4, 1.1, 0.24), 0x33303a, -16.2, 11.5, 2.42));       // the "NO", burnt out
  p.push(part(cone(1.4, 2.4, 4), NEON_GOLD, -14, 15.8, 2, 0, Math.PI / 4, 0));
  roofKit(p, 24, 8, 4.75, 0.6);
  return M(p);
}

/** THE MAPLE DRIVE-IN — the screen, the ticket hut, the speaker posts.
 *  Showing the same film since the spring. */
export function makeDriveIn(): THREE.Mesh {
  const p: G[] = [
    part(box(26, 1.6, 3), DARKWOOD, 0, 0.8, 0),
    part(box(25, 15, 1.2), 0xf2eee4, 0, 8.6, 0),                        // THE SCREEN
    part(box(25.6, 0.8, 1.6), 0x2c2438, 0, 16.4, 0),
    part(box(25.6, 0.8, 1.6), 0x2c2438, 0, 1.6, 0),
    part(box(0.9, 16, 1.6), 0x2c2438, -12.6, 8.6, 0),
    part(box(0.9, 16, 1.6), 0x2c2438, 12.6, 8.6, 0),
  ];
  for (const sx of [-9, -3, 3, 9]) {                                     // back braces
    p.push(part(box(0.7, 14, 0.7), DARKSTEEL, sx, 7, -2.6, 0.22, 0, 0));
  }
  p.push(part(box(9, 2.4, 0.4), RED, 0, 18.4, 0));                       // marquee
  p.push(part(box(7.4, 1, 0.24), NEON_GOLD, 0, 18.6, 0.25));
  for (let i = 0; i < 9; i++) p.push(part(sph(0.22, 6, 5), NEON_GOLD, -4 + i, 19.8, 0.1));
  return M(p);
}

/** THE WORLD'S LARGEST BALL OF TWINE (and gift shop). Maple Falls' one
 *  claim on the interstate. The plaque is very specific about "largest". */
export function makeBallOfTwine(): THREE.Mesh {
  const p: G[] = [
    part(cyl(4.4, 5, 1, 12), 0xd8d2c4, 0, 0.5, 0),                       // plinth
    part(cyl(3.6, 4, 0.7, 12), 0xc4bcac, 0, 1.3, 0),
    part(sph(3.5, 14, 10), 0xd8bc7a, 0, 5.1, 0),                         // THE BALL
  ];
  for (let i = 0; i < 12; i++) {                                         // wound twine
    const a = (i / 12) * Math.PI * 2;
    p.push(part(new THREE.TorusGeometry(3.5, 0.15, 4, 14), 0xc4a860, 0, 5.1, 0, Math.PI / 2, a, mr(-0.3, 0.3)));
  }
  p.push(part(box(2.2, 1.5, 0.3), 0x8c5a4a, 0, 1.9, 4.4, -0.4, 0, 0));   // the plaque
  p.push(part(box(1.7, 0.9, 0.2), NEON_GOLD, 0, 1.98, 4.5, -0.4, 0, 0));
  // THE GIFT SHOP
  p.push(part(box(7, 3.6, 5), CREAM, 10, 1.8, 0));
  p.push(part(cone(5.4, 1.8, 4), RED, 10, 4.6, 0, 0, Math.PI / 4, 0, 1, 1, 0.8));
  p.push(part(box(1.8, 2.6, 0.3), 0x3f5a7a, 10, 1.3, 2.6));
  p.push(part(box(2.2, 1.4, 0.3), GLASS, 12.6, 2.1, 2.6));
  p.push(part(box(5.4, 1, 0.2), BLUE, 10, 3.9, 2.7));
  p.push(part(box(0.5, 5, 0.5), STEEL, 16, 2.5, 3));
  p.push(part(box(2.8, 1.8, 0.3), NEON_GOLD, 16, 6, 3));
  p.push(part(box(2.2, 0.7, 0.2), 0x2c2438, 16, 6.2, 3.2));
  return noFront(M(p));
}

/** A BILLBOARD. Whatever is on it, somebody has already complained. */
export function makeBillboard(side = -1): THREE.Mesh {
  const face = side < 0 ? mpick([0xf0a83a, 0x4d7de8, 0xd8586f, 0x3f7a4e]) : (side ? BLUE : RED);
  const p: G[] = [
    part(box(0.7, 8, 0.7), DARKSTEEL, -3, 4, 0),
    part(box(0.7, 8, 0.7), DARKSTEEL, 3, 4, 0),
    part(box(0.4, 5, 0.4), DARKSTEEL, 0, 5, -1.8, 0.5, 0, 0),
    part(box(11, 5, 0.4), 0x2c2438, 0, 10, 0),
    part(box(10.4, 4.4, 0.3), face, 0, 10, 0.25),
    part(box(7.4, 1.5, 0.24), WHITE, 0, 10.8, 0.42),
    part(box(4.4, 0.8, 0.24), WHITE, -1.4, 9.2, 0.42),
    part(box(11.4, 0.5, 0.6), CREAM, 0, 12.8, 0),
  ];
  return M(p);
}

/** A HIGHWAY PYLON SIGN — the tall pole kind you see before the exit. */
export function makePylonSign(): THREE.Mesh {
  const col = mpick([RED, BLUE, 0xf0a83a, 0x4d7de8]);
  return M([
    part(box(0.9, 12, 0.9), STEEL, 0, 6, 0),
    part(box(4.6, 4.6, 1.2), col, 0, 13.4, 0),
    part(box(3.6, 1.4, 0.2), WHITE, 0, 14.2, 0.65),
    part(box(3.6, 1.4, 0.2), WHITE, 0, 14.2, -0.65),
    part(box(2.6, 0.7, 0.2), WHITE, 0, 12.4, 0.65),
    part(box(5, 0.5, 1.5), CREAM, 0, 15.9, 0),
  ]);
}

// ═══════════════════════════════════════════════════════════════════════════
// LAKESIDE — the south shore, the pier, and the fish that got away
// ═══════════════════════════════════════════════════════════════════════════

/** THE FISHING PIER — planks, pilings, a bench and a bait bucket. */
export function makeFishingPier(len = 18): THREE.Mesh {
  const p: G[] = [
    part(box(len, 0.35, 4), TIMBER, 0, 0.75, 0),
  ];
  for (let i = 0; i * 1.2 < len; i++) p.push(part(box(0.1, 0.36, 4), 0xa8906c, -len / 2 + i * 1.2, 0.95, 0));
  for (let i = 0; i * 3 < len; i++) for (const sz of [-1.7, 1.7]) {
    p.push(part(cyl(0.26, 0.3, 2.2, 7), DARKWOOD, -len / 2 + 1 + i * 3, 0.1, sz));
    p.push(part(cyl(0.14, 0.14, 1.5, 6), WOOD, -len / 2 + 1 + i * 3, 1.6, sz));
  }
  for (const sz of [-1.7, 1.7]) p.push(part(box(len, 0.16, 0.16), WOOD, 0, 2.3, sz));
  p.push(part(box(2.4, 0.24, 0.7), WOOD, len / 2 - 3, 1.5, 0));                 // bench
  p.push(part(box(2.4, 0.7, 0.2), WOOD, len / 2 - 3, 1.9, -0.35));
  p.push(part(cyl(0.32, 0.28, 0.6, 8), 0x4d7de8, len / 2 - 1.4, 1.2, 1));       // bait bucket
  p.push(part(cyl(0.06, 0.06, 4, 4), 0x2c2438, len / 2 - 1, 2.6, -1, 0, 0, 0.5));  // a rod, left leaning
  return M(p);
}

/** THE BOAT RAMP — concrete, a dock cleat, and a trailer somebody left. */
export function makeBoatRamp(): THREE.Mesh {
  return M([
    part(box(7, 0.4, 11), 0xd0cec4, 0, 0.2, 0, -0.09, 0, 0),
    part(box(0.5, 0.6, 11), CREAM, -3.5, 0.4, 0, -0.09, 0, 0),
    part(box(0.5, 0.6, 11), CREAM, 3.5, 0.4, 0, -0.09, 0, 0),
    part(cyl(0.24, 0.28, 1.8, 7), DARKWOOD, -4.4, 0.9, -4),
    part(cyl(0.24, 0.28, 1.8, 7), DARKWOOD, 4.4, 0.9, -4),
    part(box(1.2, 0.8, 0.2), RED, -4.4, 2.2, -4),
    part(box(4.4, 0.3, 1.6), DARKSTEEL, 6.5, 0.75, -3, 0, 0.3, 0),               // trailer
    part(cyl(0.5, 0.5, 0.4, 10), 0x2c2438, 5.6, 0.5, -2.2, 0, 0, Math.PI / 2),
    part(cyl(0.5, 0.5, 0.4, 10), 0x2c2438, 7.4, 0.5, -3.8, 0, 0, Math.PI / 2),
  ]);
}

/** THE RANGER TOWER — the lookout over the lake and the pines. */
export function makeRangerTower(): THREE.Mesh {
  const p: G[] = [];
  for (const [lx, lz] of [[-1.7, -1.7], [1.7, -1.7], [-1.7, 1.7], [1.7, 1.7]] as const) {
    p.push(part(cyl(0.2, 0.28, 9, 6), DARKWOOD, lx, 4.5, lz, lz * 0.03, 0, -lx * 0.03));
  }
  for (const y of [3, 6]) {
    p.push(part(box(3.8, 0.16, 0.16), WOOD, 0, y, -1.75));
    p.push(part(box(3.8, 0.16, 0.16), WOOD, 0, y, 1.75));
    p.push(part(box(0.16, 0.16, 3.8), WOOD, -1.75, y, 0));
    p.push(part(box(0.16, 0.16, 3.8), WOOD, 1.75, y, 0));
  }
  p.push(part(box(5.6, 0.35, 5.6), TIMBER, 0, 9.2, 0));
  p.push(part(box(4.4, 2.6, 4.4), CREAM, 0, 10.7, 0));
  p.push(part(box(4, 1.4, 0.3), GLASS, 0, 11.1, 2.2));
  p.push(part(box(0.3, 1.4, 4), GLASS, -2.2, 11.1, 0));
  p.push(part(cone(4, 1.6, 4), 0x3f7a4e, 0, 12.8, 0, 0, Math.PI / 4, 0));
  p.push(part(box(5.8, 0.2, 0.2), WOOD, 0, 10, 2.8));
  p.push(part(cyl(0.08, 0.08, 1.6, 5), STEEL, 0, 14.2, 0));
  p.push(part(box(1.2, 0.8, 0.08), RED, 0.65, 14.6, 0));
  for (let i = 0; i < 8; i++) p.push(part(box(1.1, 0.14, 0.14), WOOD, 2.6, 1 + i * 1.05, 2.4));   // ladder
  return M(p);
}

/** A ROWBOAT, pulled up on the grass. */
export function makeRowboat(): THREE.Mesh {
  const col = mpick([0x4d7de8, 0x3f7a4e, RED, CREAM]);
  const p: G[] = [
    part(sph(2.2, 12, 8), col, 0, 0.5, 0, 0, 0, 0, 1.9, 0.42, 1),
    part(sph(2, 12, 8), 0xd8cdb8, 0, 0.62, 0, 0, 0, 0, 1.85, 0.34, 0.9),
    part(box(2, 0.16, 0.9), WOOD, -0.9, 0.72, 0),
    part(box(2, 0.16, 0.9), WOOD, 0.9, 0.72, 0),
    part(box(4.4, 0.12, 0.12), 0xc9a878, 0, 0.9, 1.1, 0, 0, 0.06),
    part(box(4.4, 0.12, 0.12), 0xc9a878, 0, 0.9, -1.1, 0, 0, -0.06),
  ];
  return M(p);
}

/** THE BAIT SHACK — worms, ice, lottery, and a very firm sign about the dock. */
export function makeBaitShack(): THREE.Mesh {
  return M([
    part(box(6, 3.2, 5), 0x8c7a5a, 0, 1.6, 0),
    part(box(6.6, 0.35, 5.6), 0x5b6070, 0, 3.4, 0, 0, 0, 0.14),
    part(box(1.6, 2.4, 0.3), 0x6b503a, -1.6, 1.2, 2.6),
    part(box(2, 1.3, 0.3), NIGHTGLASS, 1.5, 2, 2.6),
    part(box(4.6, 0.9, 0.2), BLUE, 0, 3.4, 2.7),
    part(box(1.4, 0.9, 0.12), WHITE, 2.4, 1.8, 2.72),
    part(box(1.2, 1.4, 1.2), 0xd0d4dc, 3.6, 0.7, 2.4),                   // the ice chest
    part(box(1.3, 0.2, 1.3), 0x9fd0e8, 3.6, 1.5, 2.4),
    part(cyl(0.4, 0.36, 0.7, 8), 0x3f7a4e, -3.4, 0.35, 2.6),
  ]);
}

/** A PICNIC TABLE. */
export function makePicnicTable(): THREE.Mesh {
  return M([
    part(box(4.4, 0.22, 1.8), TIMBER, 0, 1.35, 0),
    part(box(4.4, 0.2, 0.7), WOOD, 0, 0.8, 1.35),
    part(box(4.4, 0.2, 0.7), WOOD, 0, 0.8, -1.35),
    part(box(0.2, 1.6, 3.4), DARKWOOD, -1.7, 0.7, 0, 0, 0, 0, 1, 1, 0.16),
    part(box(0.2, 1.6, 3.4), DARKWOOD, 1.7, 0.7, 0, 0, 0, 0, 1, 1, 0.16),
    part(box(0.24, 0.9, 3.6), DARKWOOD, -1.7, 0.45, 0),
    part(box(0.24, 0.9, 3.6), DARKWOOD, 1.7, 0.45, 0),
  ]);
}

/** A PARK GRILL — the kind bolted to a post. */
export function makeParkGrill(): THREE.Mesh {
  return M([
    part(cyl(0.16, 0.2, 1.6, 6), DARKSTEEL, 0, 0.8, 0),
    part(box(1.5, 0.5, 1.1), 0x3a3a42, 0, 1.75, 0),
    part(box(1.6, 0.12, 1.2), 0x8a929e, 0, 2.05, 0),
    part(box(1.7, 0.12, 0.16), DARKSTEEL, 0, 2.06, 0.62),
  ]);
}

/** A LIFE-RING POST at the water's edge. */
export function makeLifeRing(): THREE.Mesh {
  return noFront(M([
    part(cyl(0.13, 0.16, 2.4, 6), WHITE, 0, 1.2, 0),
    part(new THREE.TorusGeometry(0.62, 0.2, 7, 14), 0xff5a2a, 0, 2.1, 0.2, Math.PI / 2, 0, 0),
    part(new THREE.TorusGeometry(0.62, 0.21, 7, 14), WHITE, 0, 2.1, 0.2, Math.PI / 2, 0, 0, 1, 1, 0.45),
    part(box(0.7, 0.5, 0.1), RED, 0, 3, 0),
  ]));
}

/** A CANOE RACK — four hulls on a frame. */
export function makeCanoeRack(): THREE.Mesh {
  const p: G[] = [
    part(box(0.24, 3, 0.24), DARKWOOD, -3.2, 1.5, -1.2),
    part(box(0.24, 3, 0.24), DARKWOOD, 3.2, 1.5, -1.2),
    part(box(0.24, 3, 0.24), DARKWOOD, -3.2, 1.5, 1.2),
    part(box(0.24, 3, 0.24), DARKWOOD, 3.2, 1.5, 1.2),
    part(box(7, 0.2, 3), DARKWOOD, 0, 3, 0),
    part(box(7, 0.2, 3), DARKWOOD, 0, 1.5, 0),
  ];
  for (let i = 0; i < 4; i++) {
    p.push(part(sph(1.6, 10, 7), mpick([RED, BLUE, CORN, 0x4d7de8]),
      0, (i < 2 ? 3.4 : 1.9), (i % 2 ? 0.85 : -0.85), 0, 0, 0, 2.4, 0.28, 0.32));
  }
  return M(p);
}

// ═══════════════════════════════════════════════════════════════════════════
// SHARED SMALL DRESSING
// ═══════════════════════════════════════════════════════════════════════════

/** A PLANTER BARREL — Main Street's beautification committee, hard at work. */
export function makePlanter(): THREE.Mesh {
  const p: G[] = [
    part(cyl(0.62, 0.5, 1.1, 10), mpick([0x8c5a4a, 0x3f7a4e, WOOD]), 0, 0.55, 0),
    part(cyl(0.66, 0.66, 0.14, 10), CREAM, 0, 1.08, 0),
  ];
  for (let i = 0; i < 6; i++) {
    p.push(part(sph(0.2, 6, 5), mpick([0xff6fb0, 0xffd23f, RED, 0xa87bff, WHITE]), mr(-0.4, 0.4), mr(1.2, 1.5), mr(-0.4, 0.4)));
  }
  p.push(part(sph(0.55, 8, 6), GRASSY, 0, 1.15, 0, 0, 0, 0, 1, 0.5, 1));
  return noFront(M(p));
}

/** A PICKUP TRUCK, parked. Half the vehicles in Maple Falls are this. */
export function makePickup(): THREE.Mesh {
  const col = mpick([0x3f7a4e, 0x2f4a7a, 0x8c5a4a, 0xd8d2c4, RED]);
  return M([
    part(rbox(5.6, 1.3, 2.4, 0.3), col, 0, 1.5, 0),
    part(rbox(2.4, 1.3, 2.3, 0.26), col, -0.6, 2.6, 0),
    part(rbox(2.2, 1.1, 2.35, 0.2), GLASS, -0.6, 2.65, 0),
    part(rbox(2.8, 0.9, 2.4, 0.16), col, 2, 2, 0),                       // bed sides
    part(rbox(2.6, 0.4, 2.1, 0.1), 0x4a4a52, 2, 2.1, 0),
    part(rbox(5.8, 0.35, 2.5, 0.1), 0x3a3a42, 0, 0.9, 0),
    part(cyl(0.62, 0.62, 0.45, 18), 0x2c2438, -1.7, 0.62, 1.2, 0, 0, Math.PI / 2),
    part(cyl(0.62, 0.62, 0.45, 18), 0x2c2438, -1.7, 0.62, -1.2, 0, 0, Math.PI / 2),
    part(cyl(0.62, 0.62, 0.45, 18), 0x2c2438, 2.1, 0.62, 1.2, 0, 0, Math.PI / 2),
    part(cyl(0.62, 0.62, 0.45, 18), 0x2c2438, 2.1, 0.62, -1.2, 0, 0, Math.PI / 2),
    part(rbox(0.4, 0.4, 2, 0.1), NEON_GOLD, -2.9, 1.7, 0),
    // THE TAILGATE PLATE. This was box(1.1, 0.7, 0.08) at x = 3.35 — a card 1.1
    // units LONG and 0.08 thin, spanning x 2.80..3.90 while the bed it is meant
    // to sit on ends at 3.40. Half a world unit of it hung in open air off the
    // back of every pickup in town, including a whole parked row. It is a
    // tailgate sticker: thin along X, tall in Y, wide in Z, flush to the bed.
    part(rbox(0.08, 0.5, 1.3, 0.04), mchance(0.5) ? RED : BLUE, 3.36, 2.15, 0),
  ]);
}

/** A ROADSIDE MAPLE — the town's namesake, in autumn colour. */
export function makeMapleTree(): THREE.Mesh {
  const leaf = mpick([LEAF_A, LEAF_B, LEAF_C, LEAF_D] as const);
  const p: G[] = [
    part(cyl(0.44, 0.66, 4, 7), BARK, 0, 2, 0),
    part(cyl(0.3, 0.34, 1.8, 6), BARK, 0.7, 4.2, 0, 0, 0, -0.5),
    part(cyl(0.3, 0.34, 1.8, 6), BARK, -0.7, 4.2, 0, 0, 0, 0.5),
  ];
  // The town's namesake tree was seven 20-face icosahedra, flat-shaded — a pile
  // of orange rocks at gameplay distance. Spheres keep the clustered-canopy
  // silhouette and shade smoothly. See PROP_SMOOTH_MAT in island.ts.
  //
  // AND THEN IT WAS SEVEN BALLOONS. Spheres fixed the rocks and introduced the
  // opposite problem: six lobes of radius 1.5-2.1 on a canopy only 4 units
  // across means every lobe is nearly as big as the tree, so the eye resolves
  // each one separately and the whole thing reads as a bunch of inflated
  // balls. Photographed over the fountain plaza it is the largest object in
  // the frame and the least convincing thing in the game.
  //
  // What makes a stylised canopy read as leaves is not fewer, bigger, smoother
  // lobes — it is MORE, SMALLER, and tonally separated, so the silhouette
  // breaks up and the underside goes dark. Thirteen lobes now: six mains, six
  // satellites hung lower and further out in a darker tone, and a crown. The
  // outer-lower ring is what gives a canopy its weight; without it a tree is
  // lit evenly all round and floats.
  //
  // THE SEEDED STREAM IS UNTOUCHED, and that is a hard constraint rather than
  // a nicety: this function is called 603 times while Maple Falls is being
  // populated, and mainstreet.ts's own contract note says a changed draw count
  // "would shift every subsequent authored placement". So it still draws
  // exactly one mpick and then, per lobe, exactly four mr() in the same order
  // and the same ranges as before — captured into variables and reused, rather
  // than re-rolled. The extra lobes are ARITHMETIC on values already drawn.
  // ── THE CANOPY WAS BUILT UPSIDE DOWN, AND ITS TONES DID NOTHING ─────────
  // TEAM STATIC, studio round 1, on the previous version of this fix — and both
  // halves check out.
  //
  // FIRST, the tones were nearly identical. multiplyScalar on a THREE.Color is
  // a LINEAR operation under three's colour management, so x0.74 displays as
  // 0.87 and x1.16 displays as 1.07 and clips. Both accents sat inside a tenth
  // of a stop of the base. island.ts now exports shade()/tint(), which work in
  // the space the eye sees; see the note there for the measured numbers.
  //
  // SECOND, and worse: the satellites were pushed FURTHER OUT than the mains
  // (1.55 against 1.28 on the same ring radius), so they did not break the
  // silhouette up — they added six more cusps to it. Twelve equal circles
  // instead of six. The comment claimed they gave the canopy an underside;
  // geometrically they were widening the outline with more of the same shape.
  //
  // Animal Crossing's canopies never resolve into lobes, and the rule is the
  // inverse of what was here: a DARK MASS carrying small LIGHT accents on top,
  // not light lobes with dark trim on the outside. So the six big lobes are the
  // dark mass and form the silhouette, the satellites are pulled IN and UP as
  // highlights that never touch the outline, and the crown is the lightest
  // thing because it is what the sky hits.
  //
  // THE SEEDED STREAM IS STILL EXACTLY ONE mpick AND FOUR mr() PER LOBE, in the
  // same order and ranges. This runs 603 times while Maple is populated.
  // Tuned by eye against the render, once, after shade()/tint() made the
  // numbers mean what they say. At 0.70/0.34 the separation was real and TOO
  // strong: an autumn orange scaled to 70% is a brown, and a crown lifted a
  // third of the way to white reads as cream sitting on mud. These are the
  // numbers where the canopy has depth and is still the colour of a maple.
  const dark = shade(leaf, 0.80);
  const lit = tint(leaf, 0.15);
  const heroDark = shade(LEAF_HERO, 0.84);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const rr = mr(1.5, 2.1);          // draw 1 — was the lobe radius
    const radA = mr(1.1, 1.9);        // draw 2 — was the x ring radius
    const yy = mr(5.2, 6.6);          // draw 3 — was the height
    const radB = mr(1.1, 1.9);        // draw 4 — was the z ring radius
    // THE MASS: the big lobes, in the dark tone. These and only these make the
    // silhouette, so there are six cusps in the outline and not twelve.
    p.push(part(new THREE.SphereGeometry(rr * 0.74, 10, 8), i % 2 ? dark : heroDark,
      Math.cos(a) * radA * 1.12, yy, Math.sin(a) * radB * 1.12));
    // THE ACCENT: small, pulled INSIDE the mass and lifted, in the light tone.
    // Inside, so it can never widen the outline.
    const b = a + 0.62;
    p.push(part(new THREE.SphereGeometry(rr * 0.34, 8, 6), lit,
      Math.cos(b) * radA * 0.62, yy + 0.70, Math.sin(b) * radB * 0.62));
  }
  // the crown catches the sky, so it is the lightest thing on the tree
  p.push(part(new THREE.SphereGeometry(1.35, 11, 9), tint(leaf, 0.22), 0, 7.1, 0));
  return noFront(mergedProp(p, PROP_SMOOTH_MAT));
}
