import { CONFIG, type ObjectKind } from './config';
import { prng, dist, hashString, clamp, lerp } from './utils';
import { drawParkObject, wind } from './objects';
import { audio } from './audio';
import type { FXManager } from './fx';
import type { Player } from './player';
import type { Rival } from './rivals';

export interface WorldObject {
  id: number;
  kind: ObjectKind;
  tier: number;
  x: number;
  y: number;
  baseSize: number;
  size: number;
  variant: number;
  eaten: boolean;
  wobble: number;
  fleeing: boolean;
  vx: number;            // px/s (living / skid)
  vy: number;
  living: boolean;
  homeX: number;
  homeY: number;
  wanderAngle: number;
  tether: number;        // max wander distance from home
  roadAxis: 'h' | 'v';
  roadDir: number;       // +1 / -1
  honkCd: number;
  captured: boolean;
  captureScale: number;
  captureRot: number;
  shadowX: number;       // v10 §3: ground-shadow anchor (set on first capture frame)
  shadowY: number;
  alertT: number;        // "!" bubble timer (people)
  golden: boolean;       // v6 §2: golden object — 3× mass/score
  arrive: number;        // v8 §2: ms of pop-in scale-up remaining (0 = settled)
}

export interface PlayerStats {
  count: number;
  ducks: number;
  maxTier: number;
  gnomes: number;   // v9 §8: garden gnomes eaten this round (secret GNOME LORD)
}

type BlockType = 'residential' | 'park' | 'plaza' | 'playground' | 'school';
interface Block { gx: number; gy: number; type: BlockType; x0: number; y0: number; }
interface DirtPatch { x: number; y: number; r: number; life: number; maxLife: number; }
interface Fissure { pts: number[][]; life: number; maxLife: number; } // v9 §3: violet crack trail

const MARGIN = (CONFIG.MAP_SIZE - (CONFIG.GRID * CONFIG.BLOCK_SIZE + (CONFIG.GRID - 1) * CONFIG.ROAD_WIDTH)) / 2;
const STRIDE = CONFIG.BLOCK_SIZE + CONFIG.ROAD_WIDTH;

// road centre lines (between the block columns / rows)
const ROAD_CENTERS: number[] = [];
for (let i = 0; i < CONFIG.GRID - 1; i++) {
  ROAD_CENTERS.push(MARGIN + CONFIG.BLOCK_SIZE + CONFIG.ROAD_WIDTH / 2 + i * STRIDE);
}

// ── v6 §7: world edge (starfield beyond the map, dither transition, barrier) ──
type View = { x: number; y: number; w: number; h: number };

function hashInt(x: number, y: number): number {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) | 0;
  return h >>> 0;
}

function drawStars(ctx: CanvasRenderingContext2D, view: View) {
  const cell = 80;
  const x0 = Math.floor(view.x / cell) - 1, y0 = Math.floor(view.y / cell) - 1;
  const x1 = Math.ceil((view.x + view.w) / cell) + 1, y1 = Math.ceil((view.y + view.h) / cell) + 1;
  ctx.save();
  ctx.fillStyle = '#FFFFFF';
  for (let gx = x0; gx <= x1; gx++) {
    for (let gy = y0; gy <= y1; gy++) {
      const h = hashInt(gx, gy);
      if ((h & 3) !== 0) continue; // ~25% of cells carry a star
      const px = gx * cell + (h % cell);
      const py = gy * cell + ((h >> 8) % cell);
      const r = 0.6 + ((h >> 16) & 3) * 0.5;
      ctx.globalAlpha = 0.28 + ((h >> 20) & 7) / 16;
      ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
}

// v9 §4: the world's edge is torn earth, not a hazard barrier. Each visible map
// edge gets an irregular bitten profile (8–14px amplitude), a soil-dark underside
// line, and an undulating violet-pink accretion glow that brightens near the player.
function drawTornRim(ctx: CanvasRenderingContext2D, view: View, S: number, t: number, px: number, py: number) {
  const step = 16;
  const bg = CONFIG.COLORS.uiBg;
  const soil = '#3A2A18';
  const jag = (i: number) => 8 + (hashInt(i, 777) % 7); // 8..14 px inward bite
  const vx0 = Math.max(0, view.x), vx1 = Math.min(S, view.x + view.w);
  const vy0 = Math.max(0, view.y), vy1 = Math.min(S, view.y + view.h);

  // Build a jagged edge profile, carve the outer sliver to space, then trace it.
  const edge = (
    build: (i: number) => [number, number],   // point on the jag line at column/row i
    outer: (i: number) => [number, number],   // matching point on the clean map edge
    a: number, b: number,
  ) => {
    const n = Math.max(1, Math.ceil((b - a) / step));
    const pts: [number, number][] = [];
    for (let k = 0; k <= n; k++) pts.push(build(a + (k * (b - a)) / n));
    // carve: fill the strip between the clean edge and the jag line with space bg
    ctx.save();
    ctx.fillStyle = bg;
    ctx.beginPath();
    const o0 = outer(a); ctx.moveTo(o0[0], o0[1]);
    const oN = outer(b); ctx.lineTo(oN[0], oN[1]);
    for (let k = pts.length - 1; k >= 0; k--) ctx.lineTo(pts[k][0], pts[k][1]);
    ctx.closePath(); ctx.fill();
    // soil-dark underside line
    ctx.beginPath();
    for (let k = 0; k < pts.length; k++) (k ? ctx.lineTo : ctx.moveTo).call(ctx, pts[k][0], pts[k][1]);
    ctx.strokeStyle = soil; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.stroke();
    // accretion glow — undulating, brighter near the player
    for (let k = 0; k < pts.length; k++) {
      const [gx, gy] = pts[k];
      const near = clamp(1 - Math.hypot(px - gx, py - gy) / 900, 0, 1);
      const shimmer = 0.35 + 0.25 * Math.sin(t / 260 + gx * 0.02 + gy * 0.02);
      ctx.globalAlpha = clamp(shimmer + near * 0.5, 0, 1);
      ctx.fillStyle = '#F06BC8';
      ctx.beginPath(); ctx.arc(gx, gy, 2.2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  };

  if (view.y < 0 && view.y + view.h > 0)      // top edge (y = 0)
    edge((x) => [x, jag(x)], (x) => [x, 0], vx0, vx1);
  if (view.y < S && view.y + view.h > S)      // bottom edge (y = S)
    edge((x) => [x, S - jag(x)], (x) => [x, S], vx0, vx1);
  if (view.x < 0 && view.x + view.w > 0)      // left edge (x = 0)
    edge((y) => [jag(y), y], (y) => [0, y], vy0, vy1);
  if (view.x < S && view.x + view.w > S)      // right edge (x = S)
    edge((y) => [S - jag(y), y], (y) => [S, y], vy0, vy1);
}

// v9 §4: a torn-loose ground chunk floating in space — grass clod, fence bit or flowerpot.
function drawChunk(ctx: CanvasRenderingContext2D, type: number, s: number) {
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(10,6,24,0.6)'; ctx.lineWidth = 1.5;
  if (type === 0) {
    // grass clod — soil underside + green cap
    ctx.fillStyle = '#5A4327';
    ctx.beginPath(); ctx.ellipse(0, s * 0.2, s, s * 0.55, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#5FBF6A';
    ctx.beginPath(); ctx.ellipse(0, -s * 0.1, s * 0.92, s * 0.4, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  } else if (type === 1) {
    // fence bit — cream picket
    ctx.fillStyle = '#F2E6C8';
    ctx.beginPath();
    ctx.moveTo(0, -s); ctx.lineTo(s * 0.34, -s * 0.6); ctx.lineTo(s * 0.34, s * 0.8);
    ctx.lineTo(-s * 0.34, s * 0.8); ctx.lineTo(-s * 0.34, -s * 0.6); ctx.closePath();
    ctx.fill(); ctx.stroke();
  } else {
    // flowerpot shard — terracotta trapezoid with soil top
    ctx.fillStyle = '#C86B3C';
    ctx.beginPath();
    ctx.moveTo(-s * 0.7, -s * 0.5); ctx.lineTo(s * 0.7, -s * 0.5);
    ctx.lineTo(s * 0.5, s * 0.6); ctx.lineTo(-s * 0.5, s * 0.6); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#5A4327';
    ctx.beginPath(); ctx.ellipse(0, -s * 0.5, s * 0.7, s * 0.18, 0, 0, Math.PI * 2); ctx.fill();
  }
}

const LIVING_KINDS: ObjectKind[] = ['car', 'person', 'duck', 'dog', 'bird', 'cat', 'squirrel', 'drone', 'schoolbus', 'mower'];

export class WorldManager {
  objects: WorldObject[] = [];
  blocks: Block[] = [];
  dirt: DirtPatch[] = [];
  fissures: Fissure[] = [];   // v9 §3: WORLD ENDER cracked-reality trail (violet, not brown)
  // v9 §4: torn-loose ground chunks drifting in the space beyond the rim
  private spaceChunks: { bx: number; by: number; ox: number; oy: number; ang: number; spin: number; type: number; s: number }[] = [];
  // v5 §3 — precomputed ground-dressing (low-contrast, non-colliding)
  private dressTufts: { x: number; y: number; type: number; rot: number; s: number; a: number }[] = [];
  private dressFence: { x: number; y: number; v: boolean }[] = [];
  private dressHedges: { x: number; y: number; r: number }[] = [];
  private dressMats: { x: number; y: number }[] = [];
  private dressManholes: { x: number; y: number }[] = [];
  size: number;
  totalStartArea = 0;
  eatenArea = 0;
  initialMass = 0;         // v8 §3: frozen starting edible mass (% devoured denom)
  private rampageCd = 0;   // v8 §3: DEVOURER+ instant-pop cadence (≤10/s)
  initialPopulation = 0;   // v6 §2: baseline count for the 85% respawn target
  playerStats: PlayerStats = { count: 0, ducks: 0, maxTier: 0, gnomes: 0 };
  gnomeTotal = 0;              // v9 §8: gnomes present at round start (fixed — gnomes never respawn)
  gnomeLordPending = false;    // v9 §8: set once the player eats every gnome
  private nextId = 0;
  private respawnTimer = 0;
  private rand: () => number = Math.random;

  constructor(size: number) {
    this.size = size;
  }

  private makeObj(kind: ObjectKind, x: number, y: number, opts: Partial<WorldObject> = {}): WorldObject {
    const info = CONFIG.KIND_INFO[kind];
    const baseSize = info.minR + this.rand() * (info.maxR - info.minR);
    const o: WorldObject = {
      id: this.nextId++,
      kind,
      tier: info.tier,
      x, y,
      baseSize,
      size: baseSize,
      variant: Math.floor(this.rand() * 5),
      eaten: false,
      wobble: this.rand() * Math.PI * 2,
      fleeing: false,
      vx: 0, vy: 0,
      living: LIVING_KINDS.includes(kind),
      homeX: x, homeY: y,
      wanderAngle: this.rand() * Math.PI * 2,
      tether: 120,
      roadAxis: 'h',
      roadDir: this.rand() < 0.5 ? 1 : -1,
      honkCd: 0,
      captured: false,
      captureScale: 1,
      captureRot: 0,
      shadowX: 0, shadowY: 0,
      alertT: 0,
      golden: false,
      arrive: 0,
      ...opts,
    };
    this.objects.push(o);
    this.totalStartArea += Math.PI * o.baseSize * o.baseSize;
    return o;
  }

  init(seedStr: string) {
    this.objects = [];
    this.blocks = [];
    this.dirt = [];
    this.fissures = [];
    this.eatenArea = 0;
    this.totalStartArea = 0;
    this.nextId = 0;
    this.respawnTimer = 0;
    this.playerStats = { count: 0, ducks: 0, maxTier: 0, gnomes: 0 };
    this.gnomeTotal = 0;
    this.gnomeLordPending = false;
    const rand = prng(hashString(seedStr));
    this.rand = rand;

    // v9 §4: scatter torn-loose ground chunks in the space beyond the rim
    this.spaceChunks = [];
    const S = this.size, cxm = S / 2, cym = S / 2;
    for (let i = 0; i < 10; i++) {
      let cx: number, cy: number;
      do {
        cx = -220 + rand() * (S + 440);
        cy = -220 + rand() * (S + 440);
      } while (cx > -20 && cx < S + 20 && cy > -20 && cy < S + 20);
      let ox = cx - cxm, oy = cy - cym; const od = Math.hypot(ox, oy) || 1; ox /= od; oy /= od;
      this.spaceChunks.push({ bx: cx, by: cy, ox, oy, ang: rand() * Math.PI * 2, spin: (rand() - 0.5) * 0.0005, type: Math.floor(rand() * 3), s: 14 + rand() * 16 });
    }

    // v7 §2: 4×4 = 16 blocks — 12 residential, 1 park, 1 playground, 1 plaza,
    // 1 school. The water tower sits on a residential corner lot (placed below).
    const layout: BlockType[] = [
      'residential', 'residential', 'plaza',       'residential',
      'residential', 'park',        'playground',  'residential',
      'residential', 'school',      'residential', 'residential',
      'residential', 'residential', 'residential', 'residential',
    ];
    for (let gy = 0; gy < CONFIG.GRID; gy++) {
      for (let gx = 0; gx < CONFIG.GRID; gx++) {
        const type = layout[gy * CONFIG.GRID + gx];
        this.blocks.push({ gx, gy, type, x0: MARGIN + gx * STRIDE, y0: MARGIN + gy * STRIDE });
      }
    }

    const spawnX = this.size / 2, spawnY = this.size / 2;
    for (const b of this.blocks) {
      if (b.type === 'residential') this.fillResidential(b, rand);
      else if (b.type === 'park') this.fillPark(b, rand, spawnX, spawnY);
      else if (b.type === 'plaza') this.fillPlaza(b, rand);
      else if (b.type === 'playground') this.fillPlayground(b, rand);
      else if (b.type === 'school') this.fillSchool(b, rand);
    }

    // v7 §2: water tower on a residential corner lot (the last residential block)
    const resBlocks = this.blocks.filter((b) => b.type === 'residential');
    const wtBlock = resBlocks[resBlocks.length - 1];
    if (wtBlock) {
      const inset = CONFIG.SIDEWALK + 90;
      this.makeObj('watertower', wtBlock.x0 + CONFIG.BLOCK_SIZE - inset, wtBlock.y0 + inset);
    }

    // v7 §2: living cars cruising the road grid (10–14)
    for (let i = 0; i < CONFIG.TRAFFIC_CARS; i++) this.spawnCar(rand);
    // v7 §3: two delivery drones roaming + one school bus on the grid
    this.spawnDrone(rand);
    this.spawnDrone(rand);
    this.spawnBus(rand);

    // trickle up to a healthy population with scattered small edibles
    const target = Math.round(CONFIG.TARGET_POPULATION * CONFIG.DENSITY_MULT);
    while (this.objects.length < target) {
      const b = this.blocks[Math.floor(rand() * this.blocks.length)];
      const p = this.pointInBlock(b, rand);
      const kind = pick(['flower', 'flowerpot', 'gnome', 'apple'] as ObjectKind[], rand);
      if (dist(p.x, p.y, spawnX, spawnY) < 70) continue;
      this.makeObj(kind, p.x, p.y);
    }

    // v5 §3: hard rule — no 300px circle may be edible-empty; patch with T1–T2
    this.validateDensity(rand);
    // v5 §3: build the ground-dressing layer (drawn under objects)
    this.buildDressing(rand);
    // v6 §2: remember the starting count so respawn can top back up to 85%
    this.initialPopulation = this.objects.length;
    this.initialMass = this.totalStartArea; // v8 §3: freeze the % devoured denominator
    // v9 §8: freeze the gnome count — gnomes never respawn, so eating them all is a real feat
    this.gnomeTotal = this.objects.filter((o) => o.kind === 'gnome').length;
  }

  // v5 §3 — guarantee edible coverage across the whole map
  private validateDensity(rand: () => number) {
    const step = 300, R = 300;
    const patch: ObjectKind[] = ['flower', 'flowerpot', 'gnome', 'apple', 'mailbox'];
    const hw = CONFIG.ROAD_WIDTH / 2 + 8; // v10 §6: road half-width + margin for asphalt check
    for (let cy = step / 2; cy < this.size; cy += step) {
      for (let cx = step / 2; cx < this.size; cx += step) {
        // v10 §6: skip grid cells whose centre sits on the asphalt band
        const onRoad = ROAD_CENTERS.some((c) => Math.abs(cx - c) < hw || Math.abs(cy - c) < hw);
        if (onRoad) continue;
        let has = false;
        for (const o of this.objects) {
          if (o.eaten || o.kind === 'watertower') continue;
          if (dist(o.x, o.y, cx, cy) <= R) { has = true; break; }
        }
        if (!has) {
          this.makeObj(
            pick(patch, rand),
            clamp(cx, MARGIN + 20, this.size - MARGIN - 20),
            clamp(cy, MARGIN + 20, this.size - MARGIN - 20),
          );
        }
      }
    }
  }

  // v5 §3 — precompute deterministic dressing so it never flickers frame-to-frame
  private buildDressing(rand: () => number) {
    this.dressTufts = []; this.dressFence = []; this.dressHedges = [];
    this.dressMats = []; this.dressManholes = [];
    const inset = CONFIG.SIDEWALK;
    for (const b of this.blocks) {
      if ((b as any).paved) continue;
      const ix = b.x0 + inset, iy = b.y0 + inset;
      const iw = CONFIG.BLOCK_SIZE - inset * 2, ih = CONFIG.BLOCK_SIZE - inset * 2;
      // grass tufts / daisies / clover / leaves
      for (let i = 0; i < 60; i++) {
        this.dressTufts.push({
          x: ix + rand() * iw, y: iy + rand() * ih,
          type: Math.floor(rand() * 4), rot: rand() * Math.PI * 2,
          s: 0.7 + rand() * 0.8, a: 0.2 + rand() * 0.1,
        });
      }
      if (b.type === 'residential') {
        const step = 18;
        for (let x = ix; x <= ix + iw; x += step) {
          this.dressFence.push({ x, y: iy, v: false });
          this.dressFence.push({ x, y: iy + ih, v: false });
        }
        for (let y = iy; y <= iy + ih; y += step) {
          this.dressFence.push({ x: ix, y, v: true });
          this.dressFence.push({ x: ix + iw, y, v: true });
        }
        const hr = 34;
        this.dressHedges.push({ x: ix + hr, y: iy + hr, r: hr });
        this.dressHedges.push({ x: ix + iw - hr, y: iy + hr, r: hr });
        this.dressHedges.push({ x: ix + hr, y: iy + ih - hr, r: hr });
        this.dressHedges.push({ x: ix + iw - hr, y: iy + ih - hr, r: hr });
      }
    }
    for (const o of this.objects) {
      if (o.kind === 'house') this.dressMats.push({ x: o.x, y: o.y + o.size * 0.55 });
    }
    for (let i = 0; i < 12; i++) {
      const c = ROAD_CENTERS[Math.floor(rand() * ROAD_CENTERS.length)];
      const along = MARGIN + rand() * (this.size - MARGIN * 2);
      if (rand() < 0.5) this.dressManholes.push({ x: along, y: c });
      else this.dressManholes.push({ x: c, y: along });
    }
  }

  // ── block interiors (inset by sidewalk) ──
  private pointInBlock(b: Block, rand: () => number, inset = CONFIG.SIDEWALK + 10) {
    const s = CONFIG.BLOCK_SIZE - inset * 2;
    return { x: b.x0 + inset + rand() * s, y: b.y0 + inset + rand() * s };
  }

  private scatter(b: Block, rand: () => number, kind: ObjectKind, n: number, avoidX?: number, avoidY?: number) {
    for (let i = 0; i < n; i++) {
      const p = this.pointInBlock(b, rand);
      if (avoidX !== undefined && avoidY !== undefined && dist(p.x, p.y, avoidX, avoidY) < 120) continue;
      const o = this.makeObj(kind, p.x, p.y);
      if (kind === 'person') { o.tether = 90; }
      if (kind === 'dog') { o.tether = 160; }
    }
  }

  private fillResidential(b: Block, rand: () => number) {
    this.scatter(b, rand, 'house', 2);
    this.scatter(b, rand, 'shed', 1);
    this.scatter(b, rand, 'tree', 3);
    this.scatter(b, rand, 'mailbox', 2);
    this.scatter(b, rand, 'hydrant', 1);
    this.scatter(b, rand, 'trashcan', 3);
    this.scatter(b, rand, 'bike', 2);
    this.scatter(b, rand, 'birdbath', 1);
    this.scatter(b, rand, 'flower', 6);
    this.scatter(b, rand, 'flowerpot', 4);
    this.scatter(b, rand, 'gnome', 3);
    this.scatter(b, rand, 'person', 2);
    this.scatter(b, rand, 'dog', 1);
    // v7 §3: neighborhood critters + props
    this.scatter(b, rand, 'cat', 1);
    this.scatter(b, rand, 'squirrel', 1);
    this.scatter(b, rand, 'scooter', 1);
    if (rand() < 0.6) this.scatter(b, rand, 'bbq', 1);
    if (rand() < 0.4) this.scatter(b, rand, 'mower', 1);
    if (rand() < 0.7) this.spawnBirds(b, rand, 3);
  }

  private fillPark(b: Block, rand: () => number, spawnX: number, spawnY: number) {
    // pond in a corner of the block
    const pondX = b.x0 + CONFIG.BLOCK_SIZE * 0.68;
    const pondY = b.y0 + CONFIG.BLOCK_SIZE * 0.7;
    const pondR = CONFIG.BLOCK_SIZE * 0.22;
    (b as any).pond = { x: pondX, y: pondY, r: pondR };
    for (let i = 0; i < 6; i++) {
      const a = rand() * Math.PI * 2, rr = rand() * pondR * 0.7;
      const o = this.makeObj('duck', pondX + Math.cos(a) * rr, pondY + Math.sin(a) * rr);
      o.homeX = pondX; o.homeY = pondY; o.tether = pondR * 0.85;
    }
    this.scatter(b, rand, 'fountain', 1, spawnX, spawnY);
    this.scatter(b, rand, 'bench', 4);
    this.scatter(b, rand, 'birdbath', 2);
    this.scatter(b, rand, 'tree', 5);
    this.scatter(b, rand, 'flower', 10);
    this.scatter(b, rand, 'flowerpot', 4);
    this.scatter(b, rand, 'dog', 2);
    this.scatter(b, rand, 'squirrel', 2);
    this.spawnBirds(b, rand, 3);
    this.spawnBirds(b, rand, 3);
    // guarantee small edibles right around the player spawn
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2, rr = 60 + rand() * 70;
      this.makeObj(pick(['flower', 'apple', 'flowerpot'] as ObjectKind[], rand), spawnX + Math.cos(a) * rr, spawnY + Math.sin(a) * rr);
    }
  }

  private fillPlaza(b: Block, rand: () => number) {
    (b as any).paved = true;
    this.scatter(b, rand, 'foodcart', 3);
    this.scatter(b, rand, 'cafetable', 5);
    this.scatter(b, rand, 'person', 6);
    this.scatter(b, rand, 'trashcan', 3);
    this.scatter(b, rand, 'bench', 2);
    this.scatter(b, rand, 'flower', 4);
    this.scatter(b, rand, 'gnome', 2);
    this.scatter(b, rand, 'icecream', 1);
    this.scatter(b, rand, 'scooter', 2);
  }

  // v7 §2/§3: playground park — equipment + trampoline (bounce) + hoop, plus greenery.
  private fillPlayground(b: Block, rand: () => number) {
    this.scatter(b, rand, 'tree', 3);
    this.scatter(b, rand, 'bench', 3);
    this.scatter(b, rand, 'trampoline', 1);
    this.scatter(b, rand, 'hoop', 1);
    this.scatter(b, rand, 'sandbox', 1);
    this.scatter(b, rand, 'swingset', 1);
    this.scatter(b, rand, 'slide', 1);
    this.scatter(b, rand, 'seesaw', 1);
    this.scatter(b, rand, 'flower', 8);
    this.scatter(b, rand, 'person', 3);
    this.scatter(b, rand, 'dog', 1);
  }

  // v7 §2/§3: school block — the SCHOOL is a second T5 trophy (flag + hoop).
  private fillSchool(b: Block, rand: () => number) {
    (b as any).paved = true;
    const cx = b.x0 + CONFIG.BLOCK_SIZE / 2, cy = b.y0 + CONFIG.BLOCK_SIZE * 0.42;
    this.makeObj('school', cx, cy);
    this.scatter(b, rand, 'hoop', 1, cx, cy);
    this.scatter(b, rand, 'bench', 3, cx, cy);
    this.scatter(b, rand, 'tree', 3, cx, cy);
    this.scatter(b, rand, 'person', 4, cx, cy);
    this.scatter(b, rand, 'flower', 6, cx, cy);
    this.scatter(b, rand, 'trashcan', 2, cx, cy);
  }

  private spawnCar(rand: () => number) {
    const horizontal = rand() < 0.5;
    const center = ROAD_CENTERS[Math.floor(rand() * ROAD_CENTERS.length)];
    const lane = (rand() < 0.5 ? 1 : -1) * CONFIG.ROAD_WIDTH * 0.22;
    const along = MARGIN + rand() * (this.size - MARGIN * 2);
    const x = horizontal ? along : center + lane;
    const y = horizontal ? center + lane : along;
    const o = this.makeObj('car', x, y);
    o.roadAxis = horizontal ? 'h' : 'v';
    o.homeX = center + lane; o.homeY = center + lane; // fixed cross-axis coord
    o.roadDir = rand() < 0.5 ? 1 : -1;
  }

  // v7 §3: a startled flock — three birds clustered so they scatter together
  private spawnBirds(b: Block, rand: () => number, n: number) {
    const p = this.pointInBlock(b, rand);
    for (let i = 0; i < n; i++) {
      const o = this.makeObj('bird', p.x + (rand() - 0.5) * 70, p.y + (rand() - 0.5) * 70);
      o.homeX = p.x; o.homeY = p.y; o.tether = 150;
    }
  }

  // v7 §3: delivery drone — spawns anywhere, roams to a first waypoint
  private spawnDrone(rand: () => number) {
    const x = MARGIN + rand() * (this.size - MARGIN * 2);
    const y = MARGIN + rand() * (this.size - MARGIN * 2);
    const o = this.makeObj('drone', x, y);
    o.homeX = MARGIN + rand() * (this.size - MARGIN * 2);
    o.homeY = MARGIN + rand() * (this.size - MARGIN * 2);
    o.tether = 99999;
  }

  // v7 §3: school bus — big vehicle on the road grid (drives like a car)
  private spawnBus(rand: () => number) {
    const horizontal = rand() < 0.5;
    const center = ROAD_CENTERS[Math.floor(rand() * ROAD_CENTERS.length)];
    const lane = (rand() < 0.5 ? 1 : -1) * CONFIG.ROAD_WIDTH * 0.22;
    const along = MARGIN + rand() * (this.size - MARGIN * 2);
    const o = this.makeObj('schoolbus', horizontal ? along : center + lane, horizontal ? center + lane : along);
    o.roadAxis = horizontal ? 'h' : 'v';
    o.homeX = center + lane; o.homeY = center + lane;
    o.roadDir = rand() < 0.5 ? 1 : -1;
  }

  get remaining() {
    return this.objects.filter((o) => !o.eaten).length;
  }

  private canEatByPlayer(player: Player, obj: WorldObject) {
    if (obj.kind === 'watertower') return player.radius >= CONFIG.WATERTOWER_EAT_RADIUS;
    return player.radius >= obj.size * CONFIG.EAT_RATIO;
  }

  private canEat(voidR: number, objSize: number) {
    return voidR >= objSize * CONFIG.EAT_RATIO;
  }

  update(dt: number, player: Player, rivals: Rival[], fx: FXManager) {
    const dtSec = dt / 1000;
    if (this.rampageCd > 0) this.rampageCd -= dt; // v8 §3
    const pForm = player.formIndex;               // v8 §3: fear/rampage scale with form
    const voids = [player, ...rivals];
    let nearestEdibleD = Infinity;
    let nearestEdible: WorldObject | null = null;

    for (const obj of this.objects) {
      if (obj.eaten) continue;
      obj.wobble += dt * 0.004;
      if (obj.arrive > 0) obj.arrive = Math.max(0, obj.arrive - dt); // v8 §2 pop-in
      if (obj.alertT > 0) obj.alertT -= dt;
      if (obj.honkCd > 0 && !obj.living) obj.honkCd -= dt; // v7 §3: prop cooldowns (jingle)

      const canPlayerEat = this.canEatByPlayer(player, obj);
      const dp = dist(obj.x, obj.y, player.x, player.y);

      // v7 §3: ice-cream cart jingle when the player is near
      if (obj.kind === 'icecream' && dp < CONFIG.ICECREAM_JINGLE_RANGE && obj.honkCd <= 0 && !player.ghost) {
        audio.playJingle();
        obj.honkCd = 4200;
      }
      const reach = player.radius * CONFIG.CAPTURE_RADIUS_MULT * player.magnetMultiplier;

      // v8 §3: RAMPAGE — at DEVOURER+ the player obliterates T1–T2 on contact with
      // NO suction pull, rapid-fire capped at 10 pops/sec (the eat pitch-ladder races).
      const rampage = pForm >= CONFIG.DEVOURER_FORM_INDEX && obj.tier <= 2;
      if (rampage && !player.ghost && canPlayerEat && dp < player.radius + obj.size * 0.6 && this.rampageCd <= 0) {
        this.rampageCd = 100;
        this.consumeByPlayer(obj, player, fx);
        continue;
      }

      // ── gravity-well suction (player only) ──
      if (!player.ghost && canPlayerEat && !rampage && dp < reach + obj.size * 0.5) {
        // v10 §3: record shadow anchor on the first frame of capture
        if (!obj.captured) { obj.shadowX = obj.x; obj.shadowY = obj.y; }
        obj.captured = true;
        const nx = (player.x - obj.x) / (dp || 1);
        const ny = (player.y - obj.y) / (dp || 1);
        obj.vx += nx * CONFIG.SUCTION_ACCEL * dtSec;
        obj.vy += ny * CONFIG.SUCTION_ACCEL * dtSec;
        const sp = Math.hypot(obj.vx, obj.vy);
        if (sp > CONFIG.SUCTION_MAX_SPEED) {
          obj.vx = (obj.vx / sp) * CONFIG.SUCTION_MAX_SPEED;
          obj.vy = (obj.vy / sp) * CONFIG.SUCTION_MAX_SPEED;
        }
        obj.x += obj.vx * dtSec;
        obj.y += obj.vy * dtSec;
        obj.captureScale = clamp(dp / (player.radius + obj.size), 0.2, 1);
        // v10 §3: increased spin — 180-360° during capture. Living things flail faster.
        obj.captureRot += dt * (obj.living ? 0.08 : 0.028);
        obj.size = obj.baseSize * obj.captureScale;
        if (dp < player.radius * CONFIG.ABSORB_RADIUS_MULT) {
          this.consumeByPlayer(obj, player, fx);
          continue;
        }
        // still captured -> skip normal AI, but rivals can't grab a captured object
        continue;
      } else if (obj.captured) {
        // escaped the well -> skid and restore size
        obj.captured = false;
        obj.captureScale = 1;
        obj.size = obj.baseSize;
      }

      // restore size if not captured
      if (!obj.captured && obj.size !== obj.baseSize) obj.size = obj.baseSize;

      // ── living-world AI ──
      if (obj.living) this.stepLiving(obj, dt, dtSec, voids, player, fx);

      // ── non-edible collision (too big): push out + slide + feedback ──
      // recompute distance/normal AFTER living AI has moved the object this frame
      const cdx = player.x - obj.x, cdy = player.y - obj.y;
      const cd = Math.hypot(cdx, cdy) || 1;
      if (!player.ghost && !canPlayerEat && cd < player.radius + obj.size) {
        const nx = cdx / cd;
        const ny = cdy / cd;
        // v7 §3: trampoline launches a too-small player 120px the opposite way
        if (obj.kind === 'trampoline' && player.tooBigCd <= 0) {
          const bn = CONFIG.TRAMPOLINE_BOUNCE;
          player.x += nx * bn; player.y += ny * bn;
          player.vx = nx * bn * 5; player.vy = ny * bn * 5;
          fx.addRing(obj.x, obj.y, '#8ECBFF', obj.size, 260, 4, 320);
          audio.playBounce();
          player.tooBigCd = CONFIG.TOOBIG_COOLDOWN;
          continue;
        }
        const overlap = (player.radius + obj.size) - cd;
        player.x += nx * overlap;
        player.y += ny * overlap;
        // kill inward velocity component so the player slides along the surface
        const vn = player.vx * nx + player.vy * ny;
        if (vn < 0) { player.vx -= vn * nx; player.vy -= vn * ny; }
        if (player.tooBigCd <= 0) {
          fx.shake(180, 7, 15);
          fx.addRing(obj.x, obj.y, '#FF6B6B', obj.size * 0.9, 220, 4, 340);
          player.tooBigCd = CONFIG.TOOBIG_COOLDOWN;
        }
        if (player.tremorActive) {
          // v7 §5: level-aware shrink (Lvl I 15%/touch, Lvl II 25%/touch)
          obj.baseSize *= player.tremorFactor; obj.size = obj.baseSize;
          if (player.tremorLogCd <= 0) {
            console.log(`[boon] TENDERIZER shrank ${obj.kind} → ${obj.size.toFixed(1)}`);
            player.tremorLogCd = 500; // throttle to avoid 60fps log spam
          }
        }
      } else if (canPlayerEat && cd < nearestEdibleD) {
        nearestEdibleD = cd;
        nearestEdible = obj;
      }

      // ── rival interaction (pop on contact) ──
      for (const r of rivals) {
        if (!r.alive || r.ghost) continue;
        if (obj.kind === 'watertower') continue; // only WORLD-EATER player eats it
        const dr = dist(obj.x, obj.y, r.x, r.y);
        if (dr < r.radius + obj.size * 0.4 && this.canEat(r.radius, obj.size)) {
          r.eatObject(obj);
          obj.eaten = true;
          break;
        }
      }
    }

    // player look/mouth hints
    if (nearestEdible) {
      player.lookTarget = { x: nearestEdible.x, y: nearestEdible.y };
      player.approach = Math.max(0, 1 - nearestEdibleD / (player.radius * 3.5));
    } else {
      player.lookTarget = null;
      player.approach = 0;
    }

    // dirt patches fade
    for (let i = this.dirt.length - 1; i >= 0; i--) {
      this.dirt[i].life -= dt;
      if (this.dirt[i].life <= 0) this.dirt.splice(i, 1);
    }
    // v9 §3: fissure trail fades
    for (let i = this.fissures.length - 1; i >= 0; i--) {
      this.fissures[i].life -= dt;
      if (this.fissures[i].life <= 0) this.fissures.splice(i, 1);
    }

    // v8 §2: deficit-scaled respawn toward ≥90% of the starting population —
    // 4/s normally, ramping to 8/s once the world drops below 80%.
    this.respawnTimer -= dt;
    if (this.respawnTimer <= 0) {
      const target = Math.round(this.initialPopulation * CONFIG.RESPAWN_TARGET_FRAC);
      const rem = this.remaining;
      if (rem < target) {
        const frac = rem / Math.max(1, this.initialPopulation);
        const rate = frac >= 0.80 ? 4 : lerp(4, 8, clamp((0.80 - frac) / 0.20, 0, 1));
        this.respawnTimer = 1000 / rate;
        this.spawnRespawn(player, voids, fx);
      } else {
        this.respawnTimer = 300; // at floor — recheck a few times a second
      }
    }
  }

  // v8 §2: respawn T1–T2 edibles onto proper ground — lawns/sidewalks, park, and
  // plaza only (never road asphalt) — off the player's screen and never within
  // 1.5× radius of any void. 5% of spawns are a crosswalk apple on a road. Every
  // arrival pops in with a bounce + dust puff so players SEE food returning.
  private spawnRespawn(player: Player, voids: { x: number; y: number; radius: number }[], fx: FXManager) {
    // occasional crosswalk apple on the road grid (≤5% of spawns)
    if (this.rand() < 0.05) {
      const rp = this.roadPoint(player, voids);
      if (rp) { const o = this.makeObj('apple', rp.x, rp.y); o.arrive = 200; this.spawnPuff(rp.x, rp.y, fx); }
      return;
    }
    // v9 §8: gnomes deliberately omitted — they never respawn so GNOME LORD stays achievable
    const kinds: ObjectKind[] = ['flower', 'flowerpot', 'apple', 'mailbox', 'hydrant', 'trashcan'];
    const zones = this.blocks.filter((b) => b.type === 'residential' || b.type === 'park' || b.type === 'plaza');
    if (!zones.length) return;
    let bx = 0, by = 0, bestScore = -Infinity;
    for (let i = 0; i < 12; i++) {
      const b = zones[Math.floor(this.rand() * zones.length)];
      const pt = this.pointInBlock(b, this.rand);
      const dPlayer = dist(pt.x, pt.y, player.x, player.y);
      if (dPlayer < 520) continue; // keep it off the player's screen
      let voidClear = true, nearVoid = Infinity;
      for (const v of voids) {
        const d = dist(pt.x, pt.y, v.x, v.y);
        if (d < v.radius * 1.5) { voidClear = false; break; }
        if (d < nearVoid) nearVoid = d;
      }
      if (!voidClear) continue;
      let near = Infinity;
      for (const o of this.objects) {
        if (o.eaten) continue;
        const d = dist(pt.x, pt.y, o.x, o.y);
        if (d < near) near = d;
      }
      const score = dPlayer * 0.15 + near + nearVoid * 0.05; // favour distant + sparse
      if (score > bestScore) { bestScore = score; bx = pt.x; by = pt.y; }
    }
    if (bestScore === -Infinity) return; // no safe spot this tick; try again next
    const o = this.makeObj(pick(kinds, this.rand), bx, by);
    o.arrive = 200;
    this.spawnPuff(bx, by, fx);
  }

  // v8 §2: a point on the road grid (for the occasional crosswalk apple), still
  // off the player's screen and clear of every void.
  private roadPoint(player: Player, voids: { x: number; y: number; radius: number }[]) {
    const m = CONFIG.MAP_SIZE;
    for (let i = 0; i < 12; i++) {
      const along = MARGIN + this.rand() * (m - MARGIN * 2);
      const center = ROAD_CENTERS[Math.floor(this.rand() * ROAD_CENTERS.length)];
      const horizontal = this.rand() < 0.5;
      const x = horizontal ? along : center;
      const y = horizontal ? center : along;
      if (dist(x, y, player.x, player.y) < 520) continue;
      if (voids.some((v) => dist(x, y, v.x, v.y) < v.radius * 1.5)) continue;
      return { x, y };
    }
    return null;
  }

  // v8 §2: a small dust puff so arrivals read as "popping in"
  private spawnPuff(x: number, y: number, fx: FXManager) {
    fx.addCrumbs(x, y, '#D8C7A2', 6);
  }

  // v9 §3: WORLD ENDER's path leaves jagged violet fissure segments (cracked
  // reality, never brown) — 2–3 branching lines per step, fading over 8s.
  dropCrack(x: number, y: number, radius: number) {
    const lines = 2 + Math.floor(this.rand() * 2); // 2–3 branching cracks
    for (let i = 0; i < lines; i++) {
      const ang = this.rand() * Math.PI * 2;
      const len = radius * (0.5 + this.rand() * 0.6);
      const steps = 4;
      const pts: number[][] = [];
      let cx = x, cy = y;
      for (let k = 0; k <= steps; k++) {
        pts.push([cx, cy]);
        cx += Math.cos(ang) * (len / steps) + (this.rand() - 0.5) * radius * 0.2;
        cy += Math.sin(ang) * (len / steps) + (this.rand() - 0.5) * radius * 0.2;
      }
      this.fissures.push({ pts, life: 8000, maxLife: 8000 });
    }
    if (this.fissures.length > 90) this.fissures.splice(0, this.fissures.length - 90);
  }

  // v6 §2: golden object — 3× mass (bigger radius) and 3× score on consume.
  // v7 §5: ECHO BITE shockwave / EVENT HORIZON aura — pull nearby edibles inward.
  attractEdibles(px: number, py: number, range: number, pull: number) {
    for (const o of this.objects) {
      if (o.eaten) continue;
      const dx = px - o.x, dy = py - o.y;
      const d = Math.hypot(dx, dy);
      if (d > range || d < 1) continue;
      const k = pull * (1 - d / range);
      o.x += (dx / d) * k;
      o.y += (dy / d) * k;
    }
  }

  // v8 §1: nudge any edibles off the round-start footprint of every void so a
  // rival never begins the round sitting inside a cluster (which let bots pop a
  // dozen objects in the first frame and hit 100+ score instantly). Relocates
  // rather than deletes, so the starting population is preserved.
  clearSpawnFootprint(voids: { x: number; y: number; radius: number }[]) {
    const m = CONFIG.MAP_SIZE;
    for (const o of this.objects) {
      if (o.eaten) continue;
      const onVoid = voids.some((v) => dist(o.x, o.y, v.x, v.y) < v.radius * 1.8 + o.size);
      if (!onVoid) continue;
      for (let i = 0; i < 24; i++) {
        const nx = MARGIN + this.rand() * (m - MARGIN * 2);
        const ny = MARGIN + this.rand() * (m - MARGIN * 2);
        if (!voids.some((v) => dist(nx, ny, v.x, v.y) < v.radius * 2 + o.size)) {
          o.x = nx; o.y = ny; break;
        }
      }
    }
  }

  // v8 §7: METEOR SNACK SHOWER — drop an edible snack at an exact point, with a puff.
  dropSnack(x: number, y: number, fx: FXManager) {
    const info = CONFIG.KIND_INFO['apple'];
    const base = (info.minR + this.rand() * (info.maxR - info.minR)) * Math.sqrt(CONFIG.GOLDEN_MASS_MULT);
    const o = this.makeObj('apple', x, y, { golden: true, baseSize: base, size: base });
    o.arrive = 200;
    this.spawnPuff(x, y, fx);
  }

  spawnGolden(player: Player) {
    const m = CONFIG.MAP_SIZE;
    let x = MARGIN + this.rand() * (m - MARGIN * 2);
    let y = MARGIN + this.rand() * (m - MARGIN * 2);
    for (let i = 0; i < 10; i++) {
      x = MARGIN + this.rand() * (m - MARGIN * 2);
      y = MARGIN + this.rand() * (m - MARGIN * 2);
      if (dist(x, y, player.x, player.y) > 320) break;
    }
    const info = CONFIG.KIND_INFO['apple'];
    const base = (info.minR + this.rand() * (info.maxR - info.minR)) * Math.sqrt(CONFIG.GOLDEN_MASS_MULT);
    this.makeObj('apple', x, y, { golden: true, baseSize: base, size: base });
  }

  private stepLiving(obj: WorldObject, dt: number, dtSec: number, voids: { x: number; y: number; radius: number; ghost: boolean }[], player: Player, fx: FXManager) {
    if (obj.kind === 'car' || obj.kind === 'schoolbus') return this.stepCar(obj, dtSec, player);

    // nearest bigger threat
    const skittish = obj.kind === 'bird' || obj.kind === 'cat' || obj.kind === 'squirrel';
    let threat: { x: number; y: number } | null = null;
    let threatD = Infinity;
    for (const v of voids) {
      if (v.ghost) continue;
      if (!this.canEat(v.radius, obj.size)) continue;
      const d = dist(obj.x, obj.y, v.x, v.y);
      const isPlayer = (v as unknown) === player;
      // v8 §3: escalating world fear as the player's form grows.
      let radii: number;
      if (skittish) radii = 5;
      else if (obj.kind === 'person') radii = (isPlayer && player.formIndex >= 2) ? 5 : 3; // GOBBLER+: scream-flee from 5
      else radii = 4;
      // DEVOURER+: critters evacuate the whole visible block ahead of the player
      if (isPlayer && skittish && player.formIndex >= CONFIG.DEVOURER_FORM_INDEX) radii = 9;
      const range = v.radius * radii + (skittish ? 240 : 120);
      if (d < range && d < threatD) { threatD = d; threat = v; }
    }

    if (obj.kind === 'dog' && !threat) {
      // chase nearest duck
      let duck: WorldObject | null = null, dd = Infinity;
      for (const o of this.objects) {
        if (o.eaten || o.kind !== 'duck') continue;
        const d = dist(obj.x, obj.y, o.x, o.y);
        if (d < dd) { dd = d; duck = o; }
      }
      if (duck && dd < 260) {
        const a = Math.atan2(duck.y - obj.y, duck.x - obj.x);
        obj.vx = Math.cos(a) * CONFIG.DOG_SPEED;
        obj.vy = Math.sin(a) * CONFIG.DOG_SPEED;
        this.integrateWander(obj, dtSec);
        obj.fleeing = false;
        return;
      }
    }

    // v7 §3: delivery drone flies a path — roams waypoints across the whole map
    if (obj.kind === 'drone' && !threat) {
      if (dist(obj.x, obj.y, obj.homeX, obj.homeY) < 90) {
        obj.homeX = MARGIN + Math.random() * (this.size - MARGIN * 2);
        obj.homeY = MARGIN + Math.random() * (this.size - MARGIN * 2);
      }
      const a = Math.atan2(obj.homeY - obj.y, obj.homeX - obj.x);
      obj.vx = Math.cos(a) * CONFIG.DRONE_SPEED;
      obj.vy = Math.sin(a) * CONFIG.DRONE_SPEED;
      obj.fleeing = false;
      this.integrateWander(obj, dtSec);
      return;
    }

    const speed = this.moverSpeed(obj);
    const fleeSpeed = this.moverFleeSpeed(obj);

    if (threat) {
      obj.fleeing = true;
      if (obj.kind === 'person' && obj.alertT <= 0) obj.alertT = 900;
      const a = Math.atan2(obj.y - threat.y, obj.x - threat.x);
      obj.vx = Math.cos(a) * fleeSpeed;
      obj.vy = Math.sin(a) * fleeSpeed;
    } else {
      obj.fleeing = false;
      // wander around home within tether
      obj.wanderAngle += (Math.random() - 0.5) * 2 * dtSec;
      const hx = obj.homeX - obj.x, hy = obj.homeY - obj.y;
      const hd = Math.hypot(hx, hy);
      if (hd > obj.tether) {
        obj.wanderAngle = Math.atan2(hy, hx);
      }
      obj.vx = Math.cos(obj.wanderAngle) * speed;
      obj.vy = Math.sin(obj.wanderAngle) * speed;
    }
    this.integrateWander(obj, dtSec);
  }

  private moverSpeed(obj: WorldObject) {
    switch (obj.kind) {
      case 'duck': return CONFIG.DUCK_SPEED;
      case 'bird': return CONFIG.BIRD_SPEED;
      case 'cat': case 'squirrel': return CONFIG.CRITTER_SPEED;
      case 'drone': return CONFIG.DRONE_SPEED;
      case 'mower': return CONFIG.MOWER_SPEED;
      default: return CONFIG.PERSON_SPEED;
    }
  }

  private moverFleeSpeed(obj: WorldObject) {
    switch (obj.kind) {
      case 'duck': return CONFIG.DUCK_SPEED * 2;
      case 'bird': return CONFIG.BIRD_FLEE_SPEED;
      case 'cat': case 'squirrel': return CONFIG.CRITTER_FLEE_SPEED;
      case 'drone': return CONFIG.DRONE_SPEED * 1.3;
      default: return CONFIG.PERSON_FLEE_SPEED;
    }
  }

  private integrateWander(obj: WorldObject, dtSec: number) {
    obj.x = clamp(obj.x + obj.vx * dtSec, obj.size, this.size - obj.size);
    obj.y = clamp(obj.y + obj.vy * dtSec, obj.size, this.size - obj.size);
  }

  private stepCar(obj: WorldObject, dtSec: number, player: Player) {
    const dp = dist(obj.x, obj.y, player.x, player.y);
    const playerBigger = this.canEat(player.radius, obj.size);
    let speed = obj.kind === 'schoolbus' ? CONFIG.BUS_SPEED : CONFIG.CAR_SPEED;

    if (obj.honkCd > 0) obj.honkCd -= dtSec * 1000;
    if (!playerBigger && dp < 240 && obj.honkCd <= 0 && !player.ghost) {
      audio.playHonk();
      obj.honkCd = 2200;
    } else if (player.formIndex >= CONFIG.DEVOURER_FORM_INDEX && dp < player.radius * 4 && obj.honkCd <= 0 && !player.ghost) {
      // v8 §3: DEVOURER+ sets off 2-note car alarms as it looms past
      audio.carAlarm();
      obj.honkCd = 2600;
    }
    if (playerBigger && dp < 300 && !player.ghost) {
      // flee: reverse direction away from the player along the road
      speed = CONFIG.CAR_FLEE_SPEED;
      obj.fleeing = true;
      if (obj.roadAxis === 'h') obj.roadDir = player.x > obj.x ? -1 : 1;
      else obj.roadDir = player.y > obj.y ? -1 : 1;
    } else {
      obj.fleeing = false;
    }

    if (obj.roadAxis === 'h') {
      obj.x += obj.roadDir * speed * dtSec;
      obj.y = obj.homeY;
      if (obj.x < MARGIN) { obj.x = MARGIN; obj.roadDir = 1; }
      else if (obj.x > this.size - MARGIN) { obj.x = this.size - MARGIN; obj.roadDir = -1; }
    } else {
      obj.y += obj.roadDir * speed * dtSec;
      obj.x = obj.homeX;
      if (obj.y < MARGIN) { obj.y = MARGIN; obj.roadDir = 1; }
      else if (obj.y > this.size - MARGIN) { obj.y = this.size - MARGIN; obj.roadDir = -1; }
    }
  }

  private spawnEdge() {
    const edge = Math.floor(this.rand() * 4);
    const m = CONFIG.MAP_SIZE;
    let x = 0, y = 0;
    const t = MARGIN + this.rand() * (m - MARGIN * 2);
    if (edge === 0) { x = t; y = MARGIN * 0.5; }
    else if (edge === 1) { x = t; y = m - MARGIN * 0.5; }
    else if (edge === 2) { x = MARGIN * 0.5; y = t; }
    else { x = m - MARGIN * 0.5; y = t; }
    this.makeObj(pick(['flower', 'flowerpot', 'apple', 'mailbox', 'hydrant'] as ObjectKind[], this.rand), x, y); // v9 §8: no gnomes on respawn
  }

  private consumeByPlayer(obj: WorldObject, player: Player, fx: FXManager) {
    obj.eaten = true;
    this.eatenArea += Math.PI * obj.baseSize * obj.baseSize;
    this.playerStats.count++;
    if (obj.kind === 'duck') this.playerStats.ducks++;
    this.playerStats.maxTier = Math.max(this.playerStats.maxTier, obj.tier);
    // v9 §8: secret — eat EVERY gnome in one round to become GNOME LORD
    if (obj.kind === 'gnome') {
      this.playerStats.gnomes++;
      if (!this.gnomeLordPending && this.gnomeTotal > 0 && this.playerStats.gnomes >= this.gnomeTotal) {
        this.gnomeLordPending = true;
      }
    }

    // reaction flavor
    if (obj.kind === 'house') {
      fx.shake(300, 10, 20);
      fx.addDebris(obj.x, obj.y, '#C4736B', 4);
      fx.addDebris(obj.x, obj.y, '#F6E7B0', 2);
    } else if (obj.kind === 'person') {
      fx.addCrumbs(obj.x, obj.y - obj.baseSize * 0.4, '#FF6FB0', 4); // hat pops off
    } else {
      fx.addCrumbs(obj.x, obj.y, CONFIG.COLORS.tierTint[obj.tier - 1] || '#FFF', 6);
    }
    fx.addRing(obj.x, obj.y, '#FFFFFF', obj.baseSize * 0.6, 220, 3, 300);

    // v8 §3: every T3+ object eaten leaves a persistent scar for the whole round
    if (obj.tier >= 3) {
      const r = obj.baseSize * (obj.kind === 'house' ? 0.9 : 0.55);
      this.dirt.push({ x: obj.x, y: obj.y, r, life: 1e9, maxLife: 1e9 });
    }

    player.absorbObject(obj);

    if (obj.kind === 'watertower') {
      player.pendingFx.push({ type: 'finale', x: obj.x, y: obj.y });
    }
  }

  // v9 §4: draw the drifting torn-loose ground chunks out in space
  private drawSpaceChunks(ctx: CanvasRenderingContext2D, view: { x: number; y: number; w: number; h: number }, t: number) {
    for (const c of this.spaceChunks) {
      const drift = (t * 0.004) % 220;          // slow outward drift, wraps every ~55s
      const x = c.bx + c.ox * drift, y = c.by + c.oy * drift;
      if (x < view.x - 60 || x > view.x + view.w + 60 || y < view.y - 60 || y > view.y + view.h + 60) continue;
      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.translate(x, y);
      ctx.rotate(c.ang + t * c.spin);
      drawChunk(ctx, c.type, c.s);
      ctx.restore();
    }
  }

  // ── ground + decor (drawn before objects, under the world transform) ──
  drawGround(ctx: CanvasRenderingContext2D, view: { x: number; y: number; w: number; h: number }, t = 0, px = 0, py = 0) {
    const G = CONFIG.COLORS.ground;
    const S = this.size;

    // v6 §7: space beyond the world — starfield behind everything
    ctx.fillStyle = CONFIG.COLORS.uiBg;
    ctx.fillRect(view.x, view.y, view.w, view.h);
    drawStars(ctx, view);
    // v9 §4: floating ground-chunks torn loose, drifting in the deep space beyond the rim
    this.drawSpaceChunks(ctx, view, t);

    // ground clipped to the map rect so it can dissolve into space at the edge
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, S, S); ctx.clip();

    // grass base
    ctx.fillStyle = G.lawns[0];
    ctx.fillRect(view.x, view.y, view.w, view.h);

    // roads (asphalt bands spanning the whole map)
    ctx.fillStyle = G.asphalt;
    for (const c of ROAD_CENTERS) {
      ctx.fillRect(view.x, c - CONFIG.ROAD_WIDTH / 2, view.w, CONFIG.ROAD_WIDTH); // horizontal
      ctx.fillRect(c - CONFIG.ROAD_WIDTH / 2, view.y, CONFIG.ROAD_WIDTH, view.h); // vertical
    }

    // blocks: sidewalk band + inner surface
    for (const b of this.blocks) {
      if (b.x0 + CONFIG.BLOCK_SIZE < view.x || b.x0 > view.x + view.w) continue;
      if (b.y0 + CONFIG.BLOCK_SIZE < view.y || b.y0 > view.y + view.h) continue;
      // sidewalk
      ctx.fillStyle = G.sidewalk;
      ctx.fillRect(b.x0, b.y0, CONFIG.BLOCK_SIZE, CONFIG.BLOCK_SIZE);
      // inner surface
      const inset = CONFIG.SIDEWALK;
      const paved = (b as any).paved;
      if (paved) ctx.fillStyle = G.pavement;
      else ctx.fillStyle = G.lawns[(b.gx + b.gy) % G.lawns.length];
      ctx.fillRect(b.x0 + inset, b.y0 + inset, CONFIG.BLOCK_SIZE - inset * 2, CONFIG.BLOCK_SIZE - inset * 2);
      // v6 §8: zone grading — a faint per-district tint so areas read differently
      const tint = b.type === 'park' ? 'rgba(120,220,140,0.06)'
        : b.type === 'plaza' ? 'rgba(255,210,120,0.05)'
        : b.type === 'playground' ? 'rgba(255,150,200,0.05)'
        : b.type === 'school' ? 'rgba(180,140,255,0.07)' : null;
      if (tint) {
        ctx.fillStyle = tint;
        ctx.fillRect(b.x0 + inset, b.y0 + inset, CONFIG.BLOCK_SIZE - inset * 2, CONFIG.BLOCK_SIZE - inset * 2);
      }
      // pond
      const pond = (b as any).pond;
      if (pond) {
        ctx.fillStyle = G.pondEdge;
        ctx.beginPath(); ctx.ellipse(pond.x, pond.y, pond.r + 8, pond.r * 0.8 + 8, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = G.pond;
        ctx.beginPath(); ctx.ellipse(pond.x, pond.y, pond.r, pond.r * 0.8, 0, 0, Math.PI * 2); ctx.fill();
      }
    }

    // road dashed centre lines (40% white)
    ctx.strokeStyle = G.lane;
    ctx.lineWidth = 4;
    ctx.setLineDash([26, 22]);
    ctx.beginPath();
    for (const c of ROAD_CENTERS) {
      ctx.moveTo(view.x, c); ctx.lineTo(view.x + view.w, c);
      ctx.moveTo(c, view.y); ctx.lineTo(c, view.y + view.h);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.restore(); // end ground clip

    // v9 §4: torn-earth rim — irregular bitten edge + undulating accretion glow
    drawTornRim(ctx, view, S, t, px, py);

    // dirt patches (ground decor)
    for (const d of this.dirt) {
      const a = clamp(d.life / d.maxLife, 0, 1) * 0.6;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = G.dirt;
      ctx.beginPath();
      ctx.ellipse(d.x, d.y, d.r, d.r * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // v9 §3: WORLD ENDER fissure trail — dark cracks with glowing violet edges
    for (const f of this.fissures) {
      const a = clamp(f.life / f.maxLife, 0, 1);
      ctx.save();
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath();
      for (let k = 0; k < f.pts.length; k++) {
        const [px, py] = f.pts[k];
        if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.globalAlpha = a * 0.9; ctx.strokeStyle = '#2A1650'; ctx.lineWidth = 5; ctx.stroke();
      ctx.globalAlpha = a * 0.7; ctx.strokeStyle = '#9D6BFF'; ctx.lineWidth = 2; ctx.stroke();
      ctx.restore();
    }
  }

  // ── v5 §3: ground-dressing layer (between ground and objects) ──
  drawDressing(ctx: CanvasRenderingContext2D, view: { x: number; y: number; w: number; h: number }, t = 0, zoom = 1) {
    const inset = CONFIG.SIDEWALK;
    const inView = (x: number, y: number, pad = 20) =>
      x >= view.x - pad && x <= view.x + view.w + pad && y >= view.y - pad && y <= view.y + view.h + pad;

    // mowing stripes (±3% lightness, ~90px bands) on grass blocks
    for (const b of this.blocks) {
      if ((b as any).paved) continue;
      if (b.x0 + CONFIG.BLOCK_SIZE < view.x || b.x0 > view.x + view.w) continue;
      if (b.y0 + CONFIG.BLOCK_SIZE < view.y || b.y0 > view.y + view.h) continue;
      const ix = b.x0 + inset, iy = b.y0 + inset;
      const iw = CONFIG.BLOCK_SIZE - inset * 2, ih = CONFIG.BLOCK_SIZE - inset * 2;
      ctx.save();
      ctx.beginPath(); ctx.rect(ix, iy, iw, ih); ctx.clip();
      const band = 90;
      let k = 0;
      for (let sy = iy; sy < iy + ih; sy += band, k++) {
        ctx.fillStyle = k % 2 === 0 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
        ctx.fillRect(ix, sy, iw, band);
      }
      ctx.restore();
    }

    // road crosswalks at intersections + curb grime
    ctx.save();
    for (const cx of ROAD_CENTERS) {
      for (const cy of ROAD_CENTERS) {
        if (!inView(cx, cy, CONFIG.ROAD_WIDTH)) continue;
        const half = CONFIG.ROAD_WIDTH / 2;
        ctx.fillStyle = 'rgba(255,255,255,0.28)';
        // stripes on the four approaches
        for (let i = -2; i <= 2; i++) {
          const off = i * 14;
          ctx.fillRect(cx - half, cy - half - 20, 8, 16); // north approach column
          ctx.fillRect(cx + off - 4, cy - half - 22, 8, 16);
          ctx.fillRect(cx + off - 4, cy + half + 6, 8, 16);
          ctx.fillRect(cx - half - 22, cy + off - 4, 16, 8);
          ctx.fillRect(cx + half + 6, cy + off - 4, 16, 8);
        }
      }
    }
    ctx.restore();

    // manholes on the roads
    for (const m of this.dressManholes) {
      if (!inView(m.x, m.y)) continue;
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.beginPath(); ctx.arc(m.x, m.y, 12, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(m.x, m.y, 8, 0, Math.PI * 2); ctx.stroke();
    }

    // cream picket fences
    for (const f of this.dressFence) {
      if (!inView(f.x, f.y)) continue;
      ctx.fillStyle = 'rgba(251,239,214,0.55)';
      if (f.v) ctx.fillRect(f.x - 6, f.y - 2, 12, 4);
      else ctx.fillRect(f.x - 2, f.y - 7, 4, 14);
    }

    // corner hedges (low-contrast green blobs)
    for (const h of this.dressHedges) {
      if (!inView(h.x, h.y, h.r)) continue;
      ctx.save();
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = '#2C9A56';
      roundRect(ctx, h.x - h.r, h.y - h.r * 0.7, h.r * 2, h.r * 1.4, 12);
      ctx.fill();
      ctx.restore();
    }

    // welcome mats + stepping stones at house doors
    for (const m of this.dressMats) {
      if (!inView(m.x, m.y, 40)) continue;
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#B98A5E';
      roundRect(ctx, m.x - 16, m.y - 7, 32, 14, 4);
      ctx.fill();
      ctx.fillStyle = 'rgba(240,235,225,0.55)';
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.ellipse(m.x - 18 + i * 18, m.y + 22 + i * 12, 9, 6, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // grass tufts / daisies / clover / leaves
    // v10 §4: skip tufts that would render below ~4px on screen (max-zoom perf cull)
    const gust = wind(t); // v8 §4: shared wind so tufts lean with the world
    for (const d of this.dressTufts) {
      if (!inView(d.x, d.y)) continue;
      if (d.s * 10 * zoom < 4) continue; // screen px ≈ d.s * 10 * zoom
      this.drawTuft(ctx, d, gust);
    }
  }

  private drawTuft(ctx: CanvasRenderingContext2D, d: { x: number; y: number; type: number; rot: number; s: number; a: number }, gust = 0) {
    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.rotate(d.rot + gust * (d.type === 0 ? 0.22 : 0.08)); // blades lean most
    ctx.scale(d.s, d.s);
    ctx.globalAlpha = d.a;
    if (d.type === 0) {
      // tuft: three blades
      ctx.strokeStyle = '#2F8F4E';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      for (const dx of [-3, 0, 3]) {
        ctx.beginPath();
        ctx.moveTo(dx, 4);
        ctx.quadraticCurveTo(dx * 1.4, -3, dx * 1.8, -8);
        ctx.stroke();
      }
    } else if (d.type === 1) {
      // daisy
      ctx.fillStyle = '#FFFFFF';
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.ellipse(Math.cos(a) * 4, Math.sin(a) * 4, 2.4, 1.4, a, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#FFD23F';
      ctx.beginPath(); ctx.arc(0, 0, 2, 0, Math.PI * 2); ctx.fill();
    } else if (d.type === 2) {
      // clover: three dots
      ctx.fillStyle = '#3AA35C';
      for (const a of [0, 2.09, 4.18]) {
        ctx.beginPath();
        ctx.arc(Math.cos(a) * 3, Math.sin(a) * 3, 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // fallen leaf
      ctx.fillStyle = '#C87B3A';
      ctx.beginPath();
      ctx.ellipse(0, 0, 5, 2.6, 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // ── objects (y-sorted) ──
  draw(ctx: CanvasRenderingContext2D, t: number, view: { x: number; y: number; w: number; h: number }) {
    const visible = this.objects.filter((o) =>
      !o.eaten &&
      o.x + o.size >= view.x && o.x - o.size <= view.x + view.w &&
      o.y + o.size >= view.y && o.y - o.size <= view.y + view.h
    );
    visible.sort((a, b) => a.y - b.y);

    // v10 §3: ground shadows for captured objects — stay planted as object lifts toward void
    for (const obj of visible) {
      if (!obj.captured || !obj.shadowX) continue;
      const a = obj.captureScale * 0.45;
      if (a < 0.02) continue;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath();
      ctx.ellipse(obj.shadowX, obj.shadowY, obj.baseSize * 0.75, obj.baseSize * 0.38, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    for (const obj of visible) {
      // v6 §2: golden object aura — gold ring + orbiting sparkles (no blur)
      if (obj.golden) {
        ctx.save();
        ctx.translate(obj.x, obj.y);
        ctx.strokeStyle = '#FFD23F';
        ctx.lineWidth = 3;
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.arc(0, 0, obj.size * 1.3 + Math.sin(t / 200) * 2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#FFF3B0';
        for (let i = 0; i < 4; i++) {
          const a = t / 500 + (i / 4) * Math.PI * 2;
          ctx.beginPath();
          ctx.arc(Math.cos(a) * obj.size * 1.5, Math.sin(a) * obj.size * 1.5, 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
      ctx.save();
      ctx.translate(obj.x, obj.y);
      if (obj.captured) {
        ctx.rotate(obj.captureRot);
      } else {
        const tilt = obj.fleeing ? Math.sin(obj.wobble * 3) * 0.16 : Math.sin(obj.wobble) * 0.04;
        ctx.rotate(tilt);
      }
      if (obj.arrive > 0) {
        // v8 §2: 200ms scale-up bounce (easeOutBack overshoot) on arrival
        const p = 1 - obj.arrive / 200;
        const c1 = 1.70158, c3 = c1 + 1;
        const s = 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);
        ctx.scale(s, s);
      }
      drawParkObject(ctx, obj.kind, obj.size, { t, fleeing: obj.fleeing, variant: obj.variant });
      ctx.restore();

      // "!" alert bubble over fleeing people
      if (obj.alertT > 0 && obj.kind === 'person') {
        ctx.save();
        ctx.globalAlpha = clamp(obj.alertT / 900, 0, 1);
        ctx.fillStyle = '#FF3D68';
        ctx.font = 'bold 22px Fredoka, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('!', obj.x, obj.y - obj.size - 6);
        ctx.restore();
      }
    }
  }
}

function pick<T>(arr: T[], rand: () => number): T {
  return arr[Math.floor(rand() * arr.length)];
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
