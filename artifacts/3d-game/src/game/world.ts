import { CONFIG } from './config';
import { prng, dist } from './utils';
import type { Player } from './player';

export interface WorldObject {
  id: number;
  type: number;
  tier: number;
  x: number;
  y: number;
  baseSize: number;
  size: number; // Current visual size
  eaten: boolean;
  absorbProgress: number; // 0 to 1
  wobble: number;
  fleeing: boolean;
  vx: number;
  vy: number;
}

export class WorldManager {
  objects: WorldObject[] = [];
  mapWidth: number;
  mapHeight: number;
  totalStartArea = 0;
  eatenArea = 0;

  constructor(size: number) {
    this.mapWidth = size;
    this.mapHeight = size;
  }

  init(seedStr: string) {
    this.objects = [];
    this.eatenArea = 0;
    this.totalStartArea = 0;

    let hash = 0;
    for (let i = 0; i < seedStr.length; i++) {
      hash = Math.imul(31, hash) + seedStr.charCodeAt(i) | 0;
    }
    const rand = prng(hash);

    const TIER_DEFS = [
      { tier: 1, minSize: 8, maxSize: 14, count: 60, types: 4 },
      { tier: 2, minSize: 16, maxSize: 26, count: 40, types: 4 },
      { tier: 3, minSize: 30, maxSize: 45, count: 25, types: 4 },
      { tier: 4, minSize: 50, maxSize: 75, count: 12, types: 3 },
      { tier: 5, minSize: 85, maxSize: 120, count: 3, types: 3 }
    ];

    let idSequence = 0;

    for (const def of TIER_DEFS) {
      for (let i = 0; i < def.count; i++) {
        const x = rand() * this.mapWidth;
        const y = rand() * this.mapHeight;
        const baseSize = def.minSize + rand() * (def.maxSize - def.minSize);
        const type = Math.floor(rand() * def.types);

        // Keep center somewhat clear for start
        if (dist(x, y, this.mapWidth/2, this.mapHeight/2) < 150 && def.tier > 1) {
          continue;
        }

        this.objects.push({
          id: idSequence++,
          type: (def.tier * 10) + type,
          tier: def.tier,
          x,
          y,
          baseSize,
          size: baseSize,
          eaten: false,
          absorbProgress: 0,
          wobble: rand() * Math.PI * 2,
          fleeing: false,
          vx: 0,
          vy: 0
        });
        this.totalStartArea += Math.PI * baseSize * baseSize;
      }
    }
  }

  update(dt: number, player: Player) {
    for (const obj of this.objects) {
      if (obj.eaten) continue;

      obj.wobble += dt * 0.005;

      const d = dist(obj.x, obj.y, player.x, player.y);
      const reach = player.radius * player.magnetMultiplier;

      // Flee logic (Tier 2 and 3 mobile objects like ducks/dogs)
      if ((obj.tier === 2 || obj.tier === 3) && obj.type % 2 === 0) { // arbitrary subset flees
        if (d < player.radius * 3 && obj.size < player.radius * 0.9) {
          obj.fleeing = true;
          const angle = Math.atan2(obj.y - player.y, obj.x - player.x);
          const speed = (4 - obj.tier) * 0.1; 
          obj.vx = Math.cos(angle) * speed;
          obj.vy = Math.sin(angle) * speed;
        } else {
          obj.fleeing = false;
          obj.vx *= 0.9;
          obj.vy *= 0.9;
        }
      }

      if (obj.fleeing) {
        obj.x += obj.vx * dt;
        obj.y += obj.vy * dt;
        obj.x = Math.max(0, Math.min(this.mapWidth, obj.x));
        obj.y = Math.max(0, Math.min(this.mapHeight, obj.y));
      }

      // Absorb logic
      if (obj.absorbProgress > 0) {
        obj.absorbProgress += dt / CONFIG.ABSORB_SHRINK_TIME;
        
        // Pull towards player
        const t = obj.absorbProgress;
        obj.x = obj.x + (player.x - obj.x) * t;
        obj.y = obj.y + (player.y - obj.y) * t;
        obj.size = obj.baseSize * (1 - t);

        if (obj.absorbProgress >= 1) {
          obj.eaten = true;
          player.onAbsorbComplete(obj);
          this.eatenArea += Math.PI * obj.baseSize * obj.baseSize;
        }
      } else if (d < reach + obj.size) {
        if (obj.size < player.radius * 0.9) {
          // Start absorb
          obj.absorbProgress = 0.01;
        } else {
          // Bump
          const angle = Math.atan2(obj.y - player.y, obj.x - player.x);
          const overlap = (reach + obj.size) - d;
          player.x -= Math.cos(angle) * overlap * 0.1;
          player.y -= Math.sin(angle) * overlap * 0.1;

          if (player.tremorActive) {
            obj.baseSize *= 0.85;
            obj.size = obj.baseSize;
          }
        }
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    for (const obj of this.objects) {
      if (obj.eaten || obj.absorbProgress >= 1) continue;

      ctx.save();
      ctx.translate(obj.x, obj.y);

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.1)';
      ctx.beginPath();
      ctx.ellipse(0, obj.size * 0.3, obj.size * 0.8, obj.size * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Wobble
      if (obj.fleeing || obj.absorbProgress > 0) {
        ctx.rotate(Math.sin(obj.wobble * 2) * 0.2);
      } else {
        ctx.rotate(Math.sin(obj.wobble) * 0.05);
      }

      this.drawObjectShape(ctx, obj.type, obj.size);

      ctx.restore();
    }
  }

  drawObjectShape(ctx: CanvasRenderingContext2D, type: number, size: number) {
    const tier = Math.floor(type / 10);
    const subType = type % 10;
    const color = CONFIG.COLORS.tiers[tier - 1] || '#999';

    ctx.fillStyle = color;
    
    // Simplistic shape library
    if (subType === 0) { // Circle
      ctx.beginPath(); ctx.arc(0, 0, size, 0, Math.PI * 2); ctx.fill();
    } else if (subType === 1) { // Square
      ctx.fillRect(-size, -size, size * 2, size * 2);
    } else if (subType === 2) { // Triangle
      ctx.beginPath(); ctx.moveTo(0, -size); ctx.lineTo(size, size); ctx.lineTo(-size, size); ctx.fill();
    } else { // Hexagon
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        ctx.lineTo(Math.cos(i * Math.PI / 3) * size, Math.sin(i * Math.PI / 3) * size);
      }
      ctx.fill();
    }
    
    // Add two-tone detail
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath(); ctx.arc(-size*0.3, -size*0.3, size*0.3, 0, Math.PI * 2); ctx.fill();
  }
}
