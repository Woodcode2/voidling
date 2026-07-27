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
import { part, mergedProp } from './island';

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

// ── the town's colours ─────────────────────────────────────────────────────
// THE TOWN ONLY HAS TWO CANDIDATES. This file used to name a third — "PAT
// SPRUCE", teal — who appears nowhere else in the game: life.ts and all 66
// mentions in newsroom_maple.ts say the challenger is DEB HOLLIS, in blue. So
// twenty-five props were campaigning for a candidate who does not exist, and on
// screen you saw red plaques, teal plaques AND blue plaques and could not tell
// which two were the two sides. The whole premise of the level was unreadable
// because of one constant. Both colours are now the exact values life.ts uses.
export const RED = 0xd8443c;     // MAYOR DINKLE — incumbent, four terms, one idea
export const BLUE = 0x2f6fd0;    // DEB HOLLIS — challenger, blames Dinkle for the weather
const CREAM = 0xf6f0e2, WHITE = 0xfdfaf2, BONE = 0xe8e0cc;
const BARN = 0xb5372e, BRICK = 0xa8543f, SLATE = 0x5b6070, SHINGLE = 0x7a5a44;
const WOOD = 0x9a7a5a, DARKWOOD = 0x6b503a, TIMBER = 0xc0a887;
const GRASSY = 0x5db06a, CORN = 0xd9b845, PUMPKIN = 0xef7a24, HAY = 0xd8c078;
const STEEL = 0xb9c1cc, DARKSTEEL = 0x6f7684, GLASS = 0x9fd0e8, NIGHTGLASS = 0x39506a;
const NEON_PINK = 0xff6fae, NEON_CYAN = 0x74f0ff, NEON_GOLD = 0xffd85e;
const ASPHALT = 0x5a6070, TARMAC = 0x7d8494;
const SHOP_WALL = [0xe4c4a0, 0xc9d8e2, 0xf0d2cc, 0xd8e0c4, 0xe8dcc0, 0xcdc2dc] as const;
const AWNING = [0xd8392f, 0x1fa8a0, 0x3f7a4e, 0xe0a83a, 0x4d7de8, 0xd8586f] as const;
const SHIRTS = [0xff7a5a, 0x5ec8d8, 0xffd23f, 0x8fa9d8, 0xf06fb0, 0x7ed57a, 0xf2f4f8, 0xc98a5a] as const;
const SKIN = [0xf4c9a0, 0xe0a878, 0xc98a5a, 0xffd9b0] as const;
const DENIM = [0x40567a, 0x5a6070, 0x8a6a4a, 0x2f3a52] as const;

type G = THREE.BufferGeometry;
const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
const cyl = (rt: number, rb: number, h: number, s = 8) => new THREE.CylinderGeometry(rt, rb, h, s);
const cone = (r: number, h: number, s = 8) => new THREE.ConeGeometry(r, h, s);
const sph = (r: number, s = 8, t = 6) => new THREE.SphereGeometry(r, s, t);
const M = (p: G[]) => mergedProp(p);

// A PERSON, baked flat. life.ts owns the walking crowd; these are the people
// who are STANDING somewhere for a reason — the four-strong parking-meter
// protest, the two men arguing outside the diner, the pie judges. Static, one
// mesh each, and they put a face in every district life.ts can't reach.
function personParts(out: G[], x: number, z: number, shirt: number, ry = 0, hat?: number): void {
  const skin = mpick(SKIN), leg = mpick(DENIM);
  out.push(part(box(0.34, 0.85, 0.34), leg, x - 0.17, 0.42, z, 0, ry, 0));
  out.push(part(box(0.34, 0.85, 0.34), leg, x + 0.17, 0.42, z, 0, ry, 0));
  out.push(part(box(0.9, 0.95, 0.55), shirt, x, 1.32, z, 0, ry, 0));
  out.push(part(box(0.22, 0.8, 0.22), shirt, x - 0.54, 1.3, z, 0, ry, 0));
  out.push(part(box(0.22, 0.8, 0.22), shirt, x + 0.54, 1.3, z, 0, ry, 0));
  out.push(part(sph(0.36, 8, 6), skin, x, 2.05, z));
  if (hat !== undefined) out.push(part(cyl(0.34, 0.42, 0.22, 8), hat, x, 2.36, z));
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
export function makeDiner(): THREE.Mesh {
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
  // the argument, permanently in progress by the door
  personParts(p, 7.6, 5.6, mpick(SHIRTS), -0.6, RED);
  personParts(p, 9.2, 5.2, mpick(SHIRTS), 2.5, BLUE);
  return M(p);
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

/** A CAMPAIGN LAWN SIGN. side 0 = DINKLE (red), 1 = HOLLIS (blue). There are
 *  hundreds of these. That is the point. */
export function makeLawnSign(side: number): THREE.Mesh {
  const c = side ? BLUE : RED;
  return M([
    part(box(0.06, 0.9, 0.06), 0xd8d8d8, -0.34, 0.45, 0),
    part(box(0.06, 0.9, 0.06), 0xd8d8d8, 0.34, 0.45, 0),
    part(box(1.05, 0.72, 0.07), c, 0, 1.16, 0),
    part(box(0.78, 0.2, 0.1), WHITE, 0, 1.28, 0.02),                   // the name
    part(box(0.5, 0.1, 0.1), WHITE, -0.1, 1.02, 0.02),                 // FOR MAYOR
  ]);
}

/** THE BIG ROADSIDE SIGN — the 4x8 sheet of plywood version, staked in a
 *  field, angled at the traffic. */
export function makeBigSign(side: number): THREE.Mesh {
  const c = side ? BLUE : RED;
  return M([
    part(box(0.22, 2.6, 0.22), DARKWOOD, -1.7, 1.3, 0),
    part(box(0.22, 2.6, 0.22), DARKWOOD, 1.7, 1.3, 0),
    part(box(4.4, 2.4, 0.16), c, 0, 2.9, 0),
    part(box(3.4, 0.7, 0.2), WHITE, 0, 3.2, 0.05),
    part(box(2, 0.34, 0.2), WHITE, -0.6, 2.4, 0.05),
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
  p.push(part(box(1.1, 0.22, 0.14), WHITE, 0.92, 3.35, 0.24, 0, 0, -0.22));
  p.push(part(box(0.7, 0.16, 0.14), WHITE, 0.85, 3.02, 0.24, 0, 0, -0.22));
  return M(p);
}

/** A CITIZEN, standing about. Used to give districts life.ts never visits a
 *  face — the fair judges, the farmhands, the crowd at the drive-in. */
export function makeTownsfolk(hat = false): THREE.Mesh {
  const p: G[] = [];
  personParts(p, 0, 0, mpick(SHIRTS), mr(0, Math.PI * 2), hat ? mpick([0xd8b878, 0x5b6070, RED, BLUE]) : undefined);
  return M(p);
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
  return M(p);
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
  return M([
    part(sph(r, 9, 7), PUMPKIN, 0, r * 0.78, 0, 0, 0, 0, 1, 0.78, 1),
    part(sph(r * 0.86, 9, 7), 0xd8641a, 0, r * 0.78, 0, 0, 0, 0, 1.06, 0.72, 1.06),
    part(cyl(0.09, 0.13, 0.4, 5), 0x5a7a3a, 0, r * 1.4, 0),
    part(box(0.5, 0.08, 0.16), 0x6a9a3a, r * 0.9, r * 0.3, 0, 0, mr(0, 3), 0.2),
  ]);
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
    part(box(4.2, 0.9, 2.2), 0x8c5a4a, 0, 0.75, 0),
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
  return M(p);
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
  return M([
    part(cyl(0.13, 0.16, 2.4, 6), WHITE, 0, 1.2, 0),
    part(new THREE.TorusGeometry(0.62, 0.2, 7, 14), 0xff5a2a, 0, 2.1, 0.2, Math.PI / 2, 0, 0),
    part(new THREE.TorusGeometry(0.62, 0.21, 7, 14), WHITE, 0, 2.1, 0.2, Math.PI / 2, 0, 0, 1, 1, 0.45),
    part(box(0.7, 0.5, 0.1), RED, 0, 3, 0),
  ]);
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
  return M(p);
}

/** A PICKUP TRUCK, parked. Half the vehicles in Maple Falls are this. */
export function makePickup(): THREE.Mesh {
  const col = mpick([0x3f7a4e, 0x2f4a7a, 0x8c5a4a, 0xd8d2c4, RED]);
  return M([
    part(box(5.6, 1.3, 2.4), col, 0, 1.5, 0),
    part(box(2.4, 1.3, 2.3), col, -0.6, 2.6, 0),
    part(box(2.2, 1.1, 2.35), GLASS, -0.6, 2.65, 0),
    part(box(2.8, 0.9, 2.4), col, 2, 2, 0),                              // bed sides
    part(box(2.6, 0.4, 2.1), 0x4a4a52, 2, 2.1, 0),
    part(box(5.8, 0.35, 2.5), 0x3a3a42, 0, 0.9, 0),
    part(cyl(0.62, 0.62, 0.45, 10), 0x2c2438, -1.7, 0.62, 1.2, 0, 0, Math.PI / 2),
    part(cyl(0.62, 0.62, 0.45, 10), 0x2c2438, -1.7, 0.62, -1.2, 0, 0, Math.PI / 2),
    part(cyl(0.62, 0.62, 0.45, 10), 0x2c2438, 2.1, 0.62, 1.2, 0, 0, Math.PI / 2),
    part(cyl(0.62, 0.62, 0.45, 10), 0x2c2438, 2.1, 0.62, -1.2, 0, 0, Math.PI / 2),
    part(box(0.4, 0.4, 2), NEON_GOLD, -2.9, 1.7, 0),
    part(box(1.1, 0.7, 0.08), mchance(0.5) ? RED : BLUE, 3.35, 2.1, 0),  // bumper sticker energy
  ]);
}

/** A ROADSIDE MAPLE — the town's namesake, in autumn colour. */
export function makeMapleTree(): THREE.Mesh {
  const leaf = mpick([0xe86a2a, 0xd8392f, 0xe8a83a, 0xc9502a] as const);
  const p: G[] = [
    part(cyl(0.44, 0.66, 4, 7), 0x7a5a3e, 0, 2, 0),
    part(cyl(0.3, 0.34, 1.8, 6), 0x7a5a3e, 0.7, 4.2, 0, 0, 0, -0.5),
    part(cyl(0.3, 0.34, 1.8, 6), 0x7a5a3e, -0.7, 4.2, 0, 0, 0, 0.5),
  ];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    p.push(part(new THREE.IcosahedronGeometry(mr(1.5, 2.1), 0), i % 2 ? leaf : 0xe8903a,
      Math.cos(a) * mr(1.1, 1.9), mr(5.2, 6.6), Math.sin(a) * mr(1.1, 1.9)));
  }
  p.push(part(new THREE.IcosahedronGeometry(2.3, 0), leaf, 0, 6.6, 0));
  return M(p);
}
