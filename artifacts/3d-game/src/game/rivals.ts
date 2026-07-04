import { CONFIG, type SkinDef } from './config';
import { clamp, lerp, dist, addAreaToRadius } from './utils';
import { drawVoidling } from './voidling';
import type { WorldObject } from './world';

export interface VoidView { x: number; y: number; radius: number; }
export interface WorldView { objects: WorldObject[]; voids: VoidView[]; map: number; elapsed: number; }

export interface Intent { dirX: number; dirY: number; mag: number; }

// Future-proofed: BotController now, NetController later, same interface.
export interface RivalController {
  kind: string;
  think(rival: Rival, view: WorldView, dt: number): Intent;
}

export class Rival {
  x = 0; y = 0; prevX = 0; prevY = 0;
  vx = 0; vy = 0;                    // px/s
  private inDirX = 0; private inDirY = 0; private inMag = 0;
  radius = CONFIG.PLAYER_BASE_RADIUS;
  score = 0;
  alive = true;
  ghostTime = 0;

  name: string;
  country: string;
  skin: SkinDef;
  controller: RivalController;
  speedScale: number;

  // anim
  private blinkTimer = 1000 + Math.random() * 3000;
  private blinkVal = 0;
  private mouth = 0;
  private chompV = 0;
  private lookX = 0; private lookY = 0;
  private wobblePhase = Math.random() * 10;
  private wobbleX = 1; private wobbleY = 1;
  private breathePhase = Math.random() * 1000;

  constructor(name: string, country: string, skin: SkinDef, controller: RivalController, speedScale = 1) {
    this.name = name;
    this.country = country;
    this.skin = skin;
    this.controller = controller;
    this.speedScale = speedScale;
  }

  get ghost() { return this.ghostTime > 0; }

  spawn(x: number, y: number, radius: number) {
    this.x = this.prevX = x;
    this.y = this.prevY = y;
    this.vx = this.vy = 0;
    this.inDirX = this.inDirY = this.inMag = 0;
    this.radius = radius;
    this.alive = true;
  }

  setInput(dirX: number, dirY: number, mag: number) {
    this.inDirX = dirX; this.inDirY = dirY; this.inMag = mag;
  }

  update(dt: number, view: WorldView) {
    const intent = this.controller.think(this, view, dt);
    this.setInput(intent.dirX, intent.dirY, intent.mag);

    const dtSec = dt / 1000;
    const grown = this.radius / CONFIG.PLAYER_BASE_RADIUS;
    const sizeFactor = clamp(1.05 - grown * 0.05, 0.7, 1.05);
    const maxSpeed = CONFIG.MOVE_MAX_SPEED * this.speedScale * sizeFactor * 0.95;

    const tvx = this.inDirX * this.inMag * maxSpeed;
    const tvy = this.inDirY * this.inMag * maxSpeed;
    const dvx = tvx - this.vx, dvy = tvy - this.vy;
    const dlen = Math.hypot(dvx, dvy);
    const step = (this.inMag > 0.01 ? CONFIG.MOVE_ACCEL : CONFIG.MOVE_DECEL) * dtSec;
    if (dlen <= step || dlen < 0.0001) { this.vx = tvx; this.vy = tvy; }
    else { this.vx += (dvx / dlen) * step; this.vy += (dvy / dlen) * step; }

    this.prevX = this.x; this.prevY = this.y;
    this.x += this.vx * dtSec;
    this.y += this.vy * dtSec;
    const m = CONFIG.MAP_SIZE;
    this.x = clamp(this.x, this.radius, m - this.radius);
    this.y = clamp(this.y, this.radius, m - this.radius);

    if (this.ghostTime > 0) this.ghostTime -= dt;

    // anim
    this.breathePhase += dt;
    this.wobblePhase += dt * 0.009;
    const spd = Math.hypot(this.vx, this.vy);
    const stretch = clamp(spd / CONFIG.MOVE_MAX_SPEED, 0, 1) * 0.13;
    const dx = spd > 0.0001 ? this.vx / spd : 0;
    const dy = spd > 0.0001 ? this.vy / spd : 0;
    const j = Math.sin(this.wobblePhase) * 0.03;
    this.wobbleX = 1 + stretch * Math.abs(dx) - stretch * Math.abs(dy) + j;
    this.wobbleY = 1 + stretch * Math.abs(dy) - stretch * Math.abs(dx) - j;
    this.lookX = lerp(this.lookX, dx, Math.min(1, dt * 0.01));
    this.lookY = lerp(this.lookY, dy, Math.min(1, dt * 0.01));
    this.mouth = lerp(this.mouth, intent.mag > 0.6 ? 0.5 : 0, Math.min(1, dt * 0.01));
    if (this.chompV > 0) this.chompV = Math.max(0, this.chompV - dt / 240);

    this.blinkTimer -= dt;
    if (this.blinkTimer <= 0) {
      this.blinkVal = Math.min(1, this.blinkVal + dt / 70);
      if (this.blinkVal >= 1) this.blinkTimer = 2500 + Math.random() * 2500;
    } else if (this.blinkVal > 0) {
      this.blinkVal = Math.max(0, this.blinkVal - dt / 70);
    }
  }

  eatObject(obj: WorldObject) {
    this.score += Math.round(obj.size * 1.3);
    this.radius = addAreaToRadius(this.radius, Math.PI * obj.size * obj.size * 0.5);
    this.chompV = 1;
  }

  eatVoid(radius: number) {
    this.score += 400;
    this.radius = addAreaToRadius(this.radius, Math.PI * radius * radius * 0.5);
    this.chompV = 1;
  }

  // Respawn small elsewhere, briefly ghosted; keep cumulative score.
  // If still bigger than the avoid point's threat, respawn far away.
  getEaten(avoidX?: number, avoidY?: number, minDist = 0) {
    const m = CONFIG.MAP_SIZE;
    this.radius = Math.max(CONFIG.PLAYER_BASE_RADIUS, this.radius * CONFIG.RESPAWN_MASS_FRAC);
    let nx = 200 + Math.random() * (m - 400);
    let ny = 200 + Math.random() * (m - 400);
    if (avoidX !== undefined && avoidY !== undefined && minDist > 0) {
      for (let i = 0; i < 20 && dist(nx, ny, avoidX, avoidY) < minDist; i++) {
        nx = 200 + Math.random() * (m - 400);
        ny = 200 + Math.random() * (m - 400);
      }
    }
    this.x = this.prevX = nx;
    this.y = this.prevY = ny;
    this.vx = this.vy = 0;
    this.ghostTime = CONFIG.GHOST_TIME;
  }

  draw(ctx: CanvasRenderingContext2D, t: number, alpha: number) {
    const rx = lerp(this.prevX, this.x, alpha);
    const ry = lerp(this.prevY, this.y, alpha);
    drawVoidling(ctx, rx, ry, {
      r: this.radius,
      skin: this.skin,
      t,
      lookX: clamp(this.lookX, -1, 1),
      lookY: clamp(this.lookY, -1, 1),
      open: this.mouth,
      chomp: this.chompV,
      blink: this.blinkVal,
      wobbleX: this.wobbleX,
      wobbleY: this.wobbleY,
      lean: clamp(this.vx / CONFIG.MOVE_MAX_SPEED, -1, 1) * 0.12,
      glow: 0.15,
      breathe: 1 + Math.sin(this.breathePhase * 0.002) * 0.02,
      ghost: this.ghost,
    });
    this.drawTag(ctx, rx, ry);
  }

  private drawTag(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
    const label = `${this.name} · ${this.country}`;
    ctx.save();
    ctx.font = '600 13px Nunito, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const w = ctx.measureText(label).width + 16;
    const y = cy - this.radius - 18;
    ctx.globalAlpha = this.ghost ? 0.5 : 0.92;
    ctx.fillStyle = 'rgba(20,8,43,0.75)';
    roundRect(ctx, cx - w / 2, y - 10, w, 20, 8);
    ctx.fill();
    ctx.fillStyle = this.skin.glowColor;
    ctx.fillText(label, cx, y);
    ctx.restore();
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// ── Bot brain: GRAZE / HUNT / FLEE with a time-based aggression curve ──────────
// Aggression is 0 for the first AGGRO_START_MS, then ramps linearly to 1.0 by
// AGGRO_FULL_MS. Bots may only graze until aggression >= HUNT_MIN_AGGRO; only
// then may they HUNT (target other voids, including the player).
export class BotController implements RivalController {
  kind = 'bot';
  state: 'GRAZE' | 'HUNT' | 'FLEE' = 'GRAZE';
  private decisionTimer = 0;
  private reactionDelay: number;
  private tx = 0; private ty = 0;
  private hasTarget = false;
  private roamAngle = Math.random() * Math.PI * 2;
  private roamTimer = 0;
  private bias: number;   // personality bias on target scoring

  constructor(reactionDelay = 240, bias = 1) {
    this.reactionDelay = reactionDelay;
    this.bias = bias;
  }

  private aggressionFrom(elapsed: number) {
    return clamp((elapsed - CONFIG.AGGRO_START_MS) / (CONFIG.AGGRO_FULL_MS - CONFIG.AGGRO_START_MS), 0, 1);
  }

  think(rival: Rival, view: WorldView, dt: number): Intent {
    const aggression = this.aggressionFrom(view.elapsed);

    // FLEE is always evaluated (survival first)
    let threat: VoidView | null = null;
    let threatD = Infinity;
    for (const v of view.voids) {
      if (v.radius >= rival.radius * CONFIG.RIVAL_EAT_RATIO) {
        const d = dist(rival.x, rival.y, v.x, v.y);
        if (d < rival.radius * 7 + 100 && d < threatD) { threatD = d; threat = v; }
      }
    }
    if (threat) {
      this.state = 'FLEE';
      const a = Math.atan2(rival.y - threat.y, rival.x - threat.x);
      return { dirX: Math.cos(a), dirY: Math.sin(a), mag: 1 };
    }

    // HUNT / GRAZE targets refresh on a reaction delay
    this.decisionTimer -= dt;
    if (this.decisionTimer <= 0 || !this.hasTarget) {
      this.decisionTimer = this.reactionDelay + Math.random() * 120;
      this.pickTarget(rival, view, aggression);
    }

    if (!this.hasTarget) {
      // roam
      this.state = 'GRAZE';
      this.roamTimer -= dt;
      if (this.roamTimer <= 0) {
        this.roamAngle += (Math.random() - 0.5) * 1.6;
        this.roamTimer = 1200 + Math.random() * 1200;
      }
      const m = view.map;
      if (rival.x < 200) this.roamAngle = 0;
      else if (rival.x > m - 200) this.roamAngle = Math.PI;
      if (rival.y < 200) this.roamAngle = Math.PI / 2;
      else if (rival.y > m - 200) this.roamAngle = -Math.PI / 2;
      return { dirX: Math.cos(this.roamAngle), dirY: Math.sin(this.roamAngle), mag: 0.55 };
    }

    const dx = this.tx - rival.x;
    const dy = this.ty - rival.y;
    const d = Math.hypot(dx, dy) || 1;
    return { dirX: dx / d, dirY: dy / d, mag: this.state === 'HUNT' ? 1 : 0.85 };
  }

  private pickTarget(rival: Rival, view: WorldView, aggression: number) {
    this.hasTarget = false;
    let best = Infinity;

    // Hunt: smaller voids to devour — only once aggression has ramped up
    if (aggression >= CONFIG.HUNT_MIN_AGGRO) {
      for (const v of view.voids) {
        if (rival.radius >= v.radius * CONFIG.RIVAL_EAT_RATIO) {
          const d = dist(rival.x, rival.y, v.x, v.y);
          const score = d / (this.bias * aggression);
          if (d < rival.radius * 9 && score < best) {
            best = score; this.tx = v.x; this.ty = v.y; this.hasTarget = true; this.state = 'HUNT';
          }
        }
      }
      if (this.hasTarget) return;
    }

    // Graze: nearest edible object, biased toward bigger (juicier) ones
    best = Infinity;
    for (const o of view.objects) {
      if (o.eaten) continue;
      if (rival.radius < o.size * CONFIG.EAT_RATIO) continue;
      const d = dist(rival.x, rival.y, o.x, o.y);
      const score = d - o.size * 4;
      if (score < best) { best = score; this.tx = o.x; this.ty = o.y; this.hasTarget = true; this.state = 'GRAZE'; }
    }
  }
}

export function makeRivals(): Rival[] {
  const names = shuffle(CONFIG.BOT_NAMES).slice(0, CONFIG.RIVAL_COUNT);
  const countries = shuffle(CONFIG.BOT_COUNTRIES).slice(0, CONFIG.RIVAL_COUNT);
  const colors = shuffle([...CONFIG.BOT_COLORS]).slice(0, CONFIG.RIVAL_COUNT);
  const rivals: Rival[] = [];
  for (let i = 0; i < CONFIG.RIVAL_COUNT; i++) {
    const col = colors[i % colors.length];
    const skin: SkinDef = {
      id: `bot_${i}`,
      name: names[i],
      cost: 0,
      bodyColor: col.body,
      glowColor: col.glow,
      eyeStyle: 'normal',
      accessories: [],
    };
    const reaction = 180 + Math.random() * 260;
    const bias = 0.7 + Math.random() * 0.8;
    const speedScale = 0.9 + Math.random() * 0.2;
    rivals.push(new Rival(names[i], countries[i], skin, new BotController(reaction, bias), speedScale));
  }
  return rivals;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
