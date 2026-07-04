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
}

export interface PlayerStats {
  count: number;
  ducks: number;
  maxTier: number;
}

type BlockType = 'residential' | 'park' | 'plaza' | 'landmark';
interface Block { gx: number; gy: number; type: BlockType; x0: number; y0: number; }
interface DirtPatch { x: number; y: number; r: number; life: number; maxLife: number; }

const MARGIN = (CONFIG.MAP_SIZE - (CONFIG.GRID * CONFIG.BLOCK_SIZE + (CONFIG.GRID - 1) * CONFIG.ROAD_WIDTH)) / 2;
const STRIDE = CONFIG.BLOCK_SIZE + CONFIG.ROAD_WIDTH;

// road centre lines (between the block columns / rows)
const ROAD_CENTERS: number[] = [];
for (let i = 0; i < CONFIG.GRID - 1; i++) {
  ROAD_CENTERS.push(MARGIN + CONFIG.BLOCK_SIZE + CONFIG.ROAD_WIDTH / 2 + i * STRIDE);
}

const LIVING_KINDS: ObjectKind[] = ['car', 'person', 'duck', 'dog'];

export class WorldManager {
  objects: WorldObject[] = [];
  blocks: Block[] = [];
  dirt: DirtPatch[] = [];
  size: number;
  totalStartArea = 0;
  eatenArea = 0;
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

    // 9 block types: 6 residential, 1 park, 1 plaza, 1 landmark
    const layout: BlockType[] = [
      'plaza', 'residential', 'residential',
      'residential', 'park', 'residential',
      'residential', 'residential', 'landmark',
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
      else this.fillLandmark(b, rand);
    }

    // 8 living cars cruising the road grid
    for (let i = 0; i < 8; i++) this.spawnCar(rand);

    // trickle up to a healthy population with scattered small edibles
    while (this.objects.length < CONFIG.TARGET_POPULATION) {
      const b = this.blocks[Math.floor(rand() * this.blocks.length)];
      const p = this.pointInBlock(b, rand);
      const kind = pick(['flower', 'flowerpot', 'gnome', 'apple'] as ObjectKind[], rand);
      if (dist(p.x, p.y, spawnX, spawnY) < 70) continue;
      this.makeObj(kind, p.x, p.y);
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
  }

  private fillLandmark(b: Block, rand: () => number) {
    (b as any).paved = true;
    const cx = b.x0 + CONFIG.BLOCK_SIZE / 2, cy = b.y0 + CONFIG.BLOCK_SIZE / 2;
    this.makeObj('watertower', cx, cy);
    this.scatter(b, rand, 'bench', 3, cx, cy);
    this.scatter(b, rand, 'tree', 4, cx, cy);
    this.scatter(b, rand, 'flower', 6, cx, cy);
    this.scatter(b, rand, 'person', 2, cx, cy);
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

      const canPlayerEat = this.canEatByPlayer(player, obj);
      const dp = dist(obj.x, obj.y, player.x, player.y);
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
        if (player.tremorActive) { obj.baseSize *= 0.92; obj.size = obj.baseSize; }
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

    // trickle respawn of small edibles at the map edges
    this.respawnTimer -= dt;
    if (this.respawnTimer <= 0) {
      this.respawnTimer = 500;
      if (this.remaining < CONFIG.RESPAWN_MIN && this.objects.length < CONFIG.TARGET_POPULATION + 40) {
        for (let i = 0; i < 3; i++) this.spawnEdge();
      }
    }
  }

  private stepLiving(obj: WorldObject, dt: number, dtSec: number, voids: { x: number; y: number; radius: number; ghost: boolean }[], player: Player, fx: FXManager) {
    if (obj.kind === 'car') return this.stepCar(obj, dtSec, player);

    // nearest bigger threat
    let threat: { x: number; y: number } | null = null;
    let threatD = Infinity;
    for (const v of voids) {
      if (v.ghost) continue;
      if (!this.canEat(v.radius, obj.size)) continue;
      const d = dist(obj.x, obj.y, v.x, v.y);
      if (d < v.radius * 4 + 120 && d < threatD) { threatD = d; threat = v; }
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

    const speed = obj.kind === 'duck' ? CONFIG.DUCK_SPEED : CONFIG.PERSON_SPEED;
    const fleeSpeed = obj.kind === 'duck' ? CONFIG.DUCK_SPEED * 2 : CONFIG.PERSON_FLEE_SPEED;

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

  private integrateWander(obj: WorldObject, dtSec: number) {
    obj.x = clamp(obj.x + obj.vx * dtSec, obj.size, this.size - obj.size);
    obj.y = clamp(obj.y + obj.vy * dtSec, obj.size, this.size - obj.size);
  }

  private stepCar(obj: WorldObject, dtSec: number, player: Player) {
    const dp = dist(obj.x, obj.y, player.x, player.y);
    const playerBigger = this.canEat(player.radius, obj.size);
    let speed = CONFIG.CAR_SPEED;

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

    // grass base (borders + default)
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

    // map border hedge
    ctx.strokeStyle = '#12907C';
    ctx.lineWidth = 24;
    ctx.strokeRect(0, 0, S, S);

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

  // ── objects (y-sorted) ──
  draw(ctx: CanvasRenderingContext2D, t: number, view: { x: number; y: number; w: number; h: number }) {
    const visible = this.objects.filter((o) =>
      !o.eaten &&
      o.x + o.size >= view.x && o.x - o.size <= view.x + view.w &&
      o.y + o.size >= view.y && o.y - o.size <= view.y + view.h
    );
    visible.sort((a, b) => a.y - b.y);

    for (const obj of visible) {
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
