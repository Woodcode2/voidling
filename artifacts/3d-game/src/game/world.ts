import { CONFIG, type ObjectKind } from './config';
import { prng, dist, hashString } from './utils';
import { drawParkObject } from './objects';
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
  vx: number;
  vy: number;
}

export interface PlayerStats {
  count: number;
  ducks: number;
  maxTier: number;
}

export class WorldManager {
  objects: WorldObject[] = [];
  size: number;
  totalStartArea = 0;
  eatenArea = 0;
  playerStats: PlayerStats = { count: 0, ducks: 0, maxTier: 0 };

  constructor(size: number) {
    this.size = size;
  }

  init(seedStr: string) {
    this.objects = [];
    this.eatenArea = 0;
    this.totalStartArea = 0;
    this.playerStats = { count: 0, ducks: 0, maxTier: 0 };

    const rand = prng(hashString(seedStr));
    let id = 0;
    const c = this.size / 2;

    for (const def of CONFIG.TIER_DEFS) {
      for (let i = 0; i < def.count; i++) {
        const x = rand() * this.size;
        const y = rand() * this.size;
        // keep spawn area (center) clear of big stuff
        if (def.tier > 1 && dist(x, y, c, c) < 240) continue;
        const baseSize = def.minR + rand() * (def.maxR - def.minR);
        const kind = def.kinds[Math.floor(rand() * def.kinds.length)];
        this.objects.push({
          id: id++,
          kind,
          tier: def.tier,
          x, y,
          baseSize,
          size: baseSize,
          variant: Math.floor(rand() * 5),
          eaten: false,
          wobble: rand() * Math.PI * 2,
          fleeing: false,
          vx: 0, vy: 0,
        });
        this.totalStartArea += Math.PI * baseSize * baseSize;
      }
    }
  }

  get remaining() {
    return this.objects.filter((o) => !o.eaten).length;
  }

  private canEat(voidR: number, objSize: number) {
    return voidR >= objSize * CONFIG.EAT_RATIO;
  }

  update(dt: number, player: Player, rivals: Rival[]) {
    const voids = [player, ...rivals];
    let nearestEdibleD = Infinity;
    let nearestEdible: WorldObject | null = null;

    for (const obj of this.objects) {
      if (obj.eaten) continue;
      obj.wobble += dt * 0.004;

      const isFleeKind = CONFIG.FLEEING_KINDS.includes(obj.kind);

      // ── Flee AI ──
      if (isFleeKind) {
        let threat: { x: number; y: number } | null = null;
        let threatD = Infinity;
        for (const v of voids) {
          if (v.ghost) continue;
          if (!this.canEat(v.radius, obj.size)) continue;
          const d = dist(obj.x, obj.y, v.x, v.y);
          const range = v.radius * 5 + 90;
          if (d < range && d < threatD) { threatD = d; threat = v; }
        }
        if (threat) {
          obj.fleeing = true;
          const a = Math.atan2(obj.y - threat.y, obj.x - threat.x);
          const spd = Math.max(0.06, 0.2 - obj.tier * 0.03);
          obj.vx = Math.cos(a) * spd;
          obj.vy = Math.sin(a) * spd;
        } else {
          obj.fleeing = false;
          obj.vx *= 0.9;
          obj.vy *= 0.9;
        }
        if (Math.abs(obj.vx) > 0.001 || Math.abs(obj.vy) > 0.001) {
          obj.x = Math.max(obj.size, Math.min(this.size - obj.size, obj.x + obj.vx * dt));
          obj.y = Math.max(obj.size, Math.min(this.size - obj.size, obj.y + obj.vy * dt));
        }
      }

      // ── Player interaction ──
      const dp = dist(obj.x, obj.y, player.x, player.y);
      const reach = player.radius * player.magnetMultiplier;
      if (dp < reach + obj.size * 0.4) {
        if (this.canEat(player.radius, obj.size)) {
          this.consumeByPlayer(obj, player);
          continue;
        } else {
          // bump back a too-big object
          const a = Math.atan2(player.y - obj.y, player.x - obj.x);
          const overlap = (reach + obj.size * 0.4) - dp;
          player.x -= Math.cos(a) * overlap * 0.4;
          player.y -= Math.sin(a) * overlap * 0.4;
          if (player.tremorActive) {
            obj.baseSize *= 0.9;
            obj.size = obj.baseSize;
          }
        }
      } else if (this.canEat(player.radius, obj.size) && dp < nearestEdibleD) {
        nearestEdibleD = dp;
        nearestEdible = obj;
      }

      // ── Rival interaction ──
      for (const r of rivals) {
        if (!r.alive || r.ghost) continue;
        const dr = dist(obj.x, obj.y, r.x, r.y);
        if (dr < r.radius + obj.size * 0.4 && this.canEat(r.radius, obj.size)) {
          r.eatObject(obj);
          obj.eaten = true;
          break;
        }
      }
    }

    // feed the player look/mouth hints
    if (nearestEdible) {
      player.lookTarget = { x: nearestEdible.x, y: nearestEdible.y };
      player.approach = Math.max(0, 1 - nearestEdibleD / (player.radius * 3.5));
    } else {
      player.lookTarget = null;
      player.approach = 0;
    }
  }

  private consumeByPlayer(obj: WorldObject, player: Player) {
    obj.eaten = true;
    this.eatenArea += Math.PI * obj.baseSize * obj.baseSize;
    this.playerStats.count++;
    if (obj.kind === 'duck') this.playerStats.ducks++;
    this.playerStats.maxTier = Math.max(this.playerStats.maxTier, obj.tier);
    player.absorbObject(obj);
  }

  draw(ctx: CanvasRenderingContext2D, t: number, view: { x: number; y: number; w: number; h: number }) {
    for (const obj of this.objects) {
      if (obj.eaten) continue;
      // cull off-screen
      if (obj.x + obj.size < view.x || obj.x - obj.size > view.x + view.w) continue;
      if (obj.y + obj.size < view.y || obj.y - obj.size > view.y + view.h) continue;

      ctx.save();
      ctx.translate(obj.x, obj.y);
      const tilt = obj.fleeing ? Math.sin(obj.wobble * 3) * 0.14 : Math.sin(obj.wobble) * 0.04;
      ctx.rotate(tilt);
      drawParkObject(ctx, obj.kind, obj.size, { t, fleeing: obj.fleeing, variant: obj.variant });
      ctx.restore();
    }
  }
}
