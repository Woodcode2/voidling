import { CONFIG, type ObjectKind } from './config';
import { prng, dist, hashString, clamp } from './utils';
import { drawParkObject } from './objects';
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
  alertT: number;        // "!" bubble timer (people)
  golden: boolean;       // v6 §2: golden object — 3× mass/score
}

export interface PlayerStats {
  count: number;
  ducks: number;
  maxTier: number;
}

type BlockType = 'residential' | 'park' | 'plaza' | 'playground' | 'school';
interface Block { gx: number; gy: number; type: BlockType; x0: number; y0: number; }
interface DirtPatch { x: number; y: number; r: number; life: number; maxLife: number; }

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

function drawEdgeDither(ctx: CanvasRenderingContext2D, view: View, S: number) {
  const F = CONFIG.EDGE_FADE, step = 8;
  const vx0 = Math.max(0, view.x), vy0 = Math.max(0, view.y);
  const vx1 = Math.min(S, view.x + view.w), vy1 = Math.min(S, view.y + view.h);
  ctx.save();
  ctx.fillStyle = CONFIG.COLORS.uiBg;
  // Only the F-wide border bands need dithering, so iterate those strips
  // (work ∝ edge length × F) rather than the whole visible map area.
  const cell = (x: number, y: number) => {
    const d = Math.min(x, y, S - x, S - y);
    if (d > F) return;
    const prob = 1 - d / F;
    if ((hashInt(x, y) % 100) / 100 < prob * 0.9) ctx.fillRect(x, y, step, step);
  };
  const xa = Math.floor(vx0 / step) * step, xb = vx1;
  const ya = Math.floor(vy0 / step) * step, yb = vy1;
  const topEnd = Math.min(yb, F + step);
  const botStart = Math.max(ya, Math.floor((S - F) / step) * step);
  for (let x = xa; x < xb; x += step) {
    for (let y = ya; y < topEnd; y += step) cell(x, y);
    for (let y = botStart; y < yb; y += step) cell(x, y);
  }
  const yInnerA = Math.max(ya, F + step);
  const yInnerB = Math.min(yb, botStart);
  const leftEnd = Math.min(xb, F + step);
  const rightStart = Math.max(xa, Math.floor((S - F) / step) * step);
  for (let y = yInnerA; y < yInnerB; y += step) {
    for (let x = xa; x < leftEnd; x += step) cell(x, y);
    for (let x = rightStart; x < xb; x += step) cell(x, y);
  }
  ctx.restore();
}

function drawBarrier(ctx: CanvasRenderingContext2D, view: View, S: number) {
  const w = 14;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, S, S);
  ctx.rect(w, w, S - 2 * w, S - 2 * w);
  ctx.clip('evenodd');
  ctx.fillStyle = '#FFD23F';
  ctx.fillRect(Math.max(0, view.x), Math.max(0, view.y),
    Math.min(S, view.x + view.w) - Math.max(0, view.x),
    Math.min(S, view.y + view.h) - Math.max(0, view.y));
  ctx.strokeStyle = '#14082B';
  ctx.lineWidth = 8;
  const start = Math.floor((view.x - S) / 22) * 22;
  const end = view.x + view.w;
  ctx.beginPath();
  for (let dx = start; dx < end; dx += 22) {
    ctx.moveTo(dx, view.y); ctx.lineTo(dx + view.h, view.y + view.h);
  }
  ctx.stroke();
  ctx.restore();
}

const LIVING_KINDS: ObjectKind[] = ['car', 'person', 'duck', 'dog', 'bird', 'cat', 'squirrel', 'drone', 'schoolbus', 'mower'];

export class WorldManager {
  objects: WorldObject[] = [];
  blocks: Block[] = [];
  dirt: DirtPatch[] = [];
  // v5 §3 — precomputed ground-dressing (low-contrast, non-colliding)
  private dressTufts: { x: number; y: number; type: number; rot: number; s: number; a: number }[] = [];
  private dressFence: { x: number; y: number; v: boolean }[] = [];
  private dressHedges: { x: number; y: number; r: number }[] = [];
  private dressMats: { x: number; y: number }[] = [];
  private dressManholes: { x: number; y: number }[] = [];
  size: number;
  totalStartArea = 0;
  eatenArea = 0;
  initialPopulation = 0;   // v6 §2: baseline count for the 85% respawn target
  playerStats: PlayerStats = { count: 0, ducks: 0, maxTier: 0 };
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
      alertT: 0,
      golden: false,
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
    this.eatenArea = 0;
    this.totalStartArea = 0;
    this.nextId = 0;
    this.respawnTimer = 0;
    this.playerStats = { count: 0, ducks: 0, maxTier: 0 };
    const rand = prng(hashString(seedStr));
    this.rand = rand;

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
  }

  // v5 §3 — guarantee edible coverage across the whole map
  private validateDensity(rand: () => number) {
    const step = 300, R = 300;
    const patch: ObjectKind[] = ['flower', 'flowerpot', 'gnome', 'apple', 'mailbox'];
    for (let cy = step / 2; cy < this.size; cy += step) {
      for (let cx = step / 2; cx < this.size; cx += step) {
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
    const voids = [player, ...rivals];
    let nearestEdibleD = Infinity;
    let nearestEdible: WorldObject | null = null;

    for (const obj of this.objects) {
      if (obj.eaten) continue;
      obj.wobble += dt * 0.004;
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

      // ── gravity-well suction (player only) ──
      if (!player.ghost && canPlayerEat && dp < reach + obj.size * 0.5) {
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
        obj.captureRot += dt * (obj.living ? 0.03 : 0.012);
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

    // v6 §2: trickle respawn (2–4/s) toward ≥85% of the starting population,
    // spawning off-screen in the emptiest candidate spot (sparse-weighted).
    this.respawnTimer -= dt;
    if (this.respawnTimer <= 0) {
      this.respawnTimer = 250 + this.rand() * 250; // ~2–4 spawns per second
      const target = Math.round(this.initialPopulation * CONFIG.RESPAWN_TARGET_FRAC);
      if (this.remaining < target) this.spawnRespawn(player, voids);
    }
  }

  // v6 §2 / v7 §1: choose an off-screen, sparse spot — never within 2× radius of
  // ANY void — and drop a T1–T3 edible there (no more feeding stationary giants).
  private spawnRespawn(player: Player, voids: { x: number; y: number; radius: number }[]) {
    const m = CONFIG.MAP_SIZE;
    const kinds: ObjectKind[] = ['flower', 'flowerpot', 'gnome', 'apple', 'mailbox', 'hydrant', 'trashcan'];
    let bx = 0, by = 0, bestScore = -Infinity;
    for (let i = 0; i < 10; i++) {
      const x = MARGIN + this.rand() * (m - MARGIN * 2);
      const y = MARGIN + this.rand() * (m - MARGIN * 2);
      const dPlayer = dist(x, y, player.x, player.y);
      if (dPlayer < 520) continue; // keep it off the player's screen
      // v7 §1: reject if inside any void's 2× radius buffer
      let voidClear = true, nearVoid = Infinity;
      for (const v of voids) {
        const d = dist(x, y, v.x, v.y);
        if (d < v.radius * 2) { voidClear = false; break; }
        if (d < nearVoid) nearVoid = d;
      }
      if (!voidClear) continue;
      let near = Infinity;
      for (const o of this.objects) {
        if (o.eaten) continue;
        const d = dist(x, y, o.x, o.y);
        if (d < near) near = d;
      }
      const score = dPlayer * 0.15 + near + nearVoid * 0.05; // favour distant + sparse
      if (score > bestScore) { bestScore = score; bx = x; by = y; }
    }
    if (bestScore === -Infinity) return; // no safe spot this tick; try again next
    this.makeObj(pick(kinds, this.rand), bx, by);
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
      const range = skittish ? v.radius * 5 + 240 : v.radius * 4 + 120; // v7 §3: critters bolt early
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
    this.makeObj(pick(['flower', 'flowerpot', 'gnome', 'apple', 'mailbox', 'hydrant'] as ObjectKind[], this.rand), x, y);
  }

  private consumeByPlayer(obj: WorldObject, player: Player, fx: FXManager) {
    obj.eaten = true;
    this.eatenArea += Math.PI * obj.baseSize * obj.baseSize;
    this.playerStats.count++;
    if (obj.kind === 'duck') this.playerStats.ducks++;
    this.playerStats.maxTier = Math.max(this.playerStats.maxTier, obj.tier);

    // reaction flavor
    if (obj.kind === 'house') {
      fx.shake(300, 10, 20);
      fx.addDebris(obj.x, obj.y, '#C4736B', 4);
      fx.addDebris(obj.x, obj.y, '#F6E7B0', 2);
      this.dirt.push({ x: obj.x, y: obj.y, r: obj.baseSize * 0.9, life: 10000, maxLife: 10000 });
    } else if (obj.kind === 'person') {
      fx.addCrumbs(obj.x, obj.y - obj.baseSize * 0.4, '#FF6FB0', 4); // hat pops off
    } else {
      fx.addCrumbs(obj.x, obj.y, CONFIG.COLORS.tierTint[obj.tier - 1] || '#FFF', 6);
    }
    fx.addRing(obj.x, obj.y, '#FFFFFF', obj.baseSize * 0.6, 220, 3, 300);

    player.absorbObject(obj);

    if (obj.kind === 'watertower') {
      player.pendingFx.push({ type: 'finale', x: obj.x, y: obj.y });
    }
  }

  // ── ground + decor (drawn before objects, under the world transform) ──
  drawGround(ctx: CanvasRenderingContext2D, view: { x: number; y: number; w: number; h: number }) {
    const G = CONFIG.COLORS.ground;
    const S = this.size;

    // v6 §7: space beyond the world — starfield behind everything
    ctx.fillStyle = CONFIG.COLORS.uiBg;
    ctx.fillRect(view.x, view.y, view.w, view.h);
    drawStars(ctx, view);

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

    // v6 §7: dissolve the ground into the starfield near the edge
    drawEdgeDither(ctx, view, S);
    ctx.restore(); // end ground clip

    // v6 §7: striped hazard barrier frames the playable world
    drawBarrier(ctx, view, S);

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
  }

  // ── v5 §3: ground-dressing layer (between ground and objects) ──
  drawDressing(ctx: CanvasRenderingContext2D, view: { x: number; y: number; w: number; h: number }) {
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
    for (const d of this.dressTufts) {
      if (!inView(d.x, d.y)) continue;
      this.drawTuft(ctx, d);
    }
  }

  private drawTuft(ctx: CanvasRenderingContext2D, d: { x: number; y: number; type: number; rot: number; s: number; a: number }) {
    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.rotate(d.rot);
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
