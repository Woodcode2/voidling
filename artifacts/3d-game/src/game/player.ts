import { CONFIG, type SkinDef } from './config';
import { clamp, lerp, addAreaToRadius } from './utils';
import { drawParkObject } from './objects';
import { drawVoidling, type VoidlingVisual } from './voidling';
import type { WorldObject } from './world';

interface OrbitItem {
  kind: WorldObject['kind'];
  tier: number;
  iconR: number;
  angle: number;
  phase: 'in' | 'orbit';
  inT: number;
  fromX: number;
  fromY: number;
}

export interface FxEvent {
  type: 'absorb' | 'merge' | 'eatRival' | 'chomp';
  x: number;
  y: number;
  text?: string;
  color?: string;
  big?: boolean;
}

export class Player {
  x = 0; y = 0; prevX = 0; prevY = 0;
  vx = 0; vy = 0;
  private targetVX = 0; private targetVY = 0;
  private inputActive = false;

  radius = CONFIG.PLAYER_BASE_RADIUS;
  score = 0;
  combo = 0;
  comboTimer = 0;

  orbit: OrbitItem[] = [];
  pendingFx: FxEvent[] = [];

  // boons
  magnetMultiplier = 1;
  speedMultiplier = 1;
  twinMerge = false;
  tremorActive = false;
  greedMultiplier = 1;

  // identity
  skin: SkinDef;
  name = 'You';

  // state
  ghostTime = 0;

  // animation
  private blinkTimer = 2000;
  private blinkVal = 0;
  private mouthOpen = 0;
  private chomp = 0;
  private lookX = 0; private lookY = 0;
  private wobblePhase = 0;
  private wobbleX = 1; private wobbleY = 1;
  private breathePhase = 0;
  private orbitClock = 0;

  // per-frame hints set by the engine
  approach = 0;                       // 0..1 how close to an edible
  lookTarget: { x: number; y: number } | null = null;

  constructor(skin: SkinDef) {
    this.skin = skin;
  }

  reset(x: number, y: number, skin: SkinDef) {
    this.x = this.prevX = x;
    this.y = this.prevY = y;
    this.vx = this.vy = this.targetVX = this.targetVY = 0;
    this.radius = CONFIG.PLAYER_BASE_RADIUS;
    this.score = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.orbit = [];
    this.pendingFx = [];
    this.magnetMultiplier = 1;
    this.speedMultiplier = 1;
    this.twinMerge = false;
    this.tremorActive = false;
    this.greedMultiplier = 1;
    this.ghostTime = 0;
    this.skin = skin;
    this.mouthOpen = 0;
    this.chomp = 0;
  }

  get ghost() { return this.ghostTime > 0; }

  get comboMult() { return 1 + Math.min(this.combo, 25) * 0.1; }

  private sizeSpeedFactor() {
    const grown = this.radius / CONFIG.PLAYER_BASE_RADIUS;
    return clamp(1.05 - grown * 0.05, 0.72, 1.05);
  }

  setInput(dirX: number, dirY: number, mag: number) {
    const speed = CONFIG.PLAYER_MAX_SPEED * this.speedMultiplier * this.sizeSpeedFactor();
    this.targetVX = dirX * mag * speed;
    this.targetVY = dirY * mag * speed;
    this.inputActive = mag > 0.01;
  }

  update(dt: number) {
    // velocity toward target; slow glide on release
    const respond = this.inputActive
      ? Math.min(1, dt * 0.018)
      : Math.min(1, dt / CONFIG.RELEASE_DECEL_MS);
    this.vx += (this.targetVX - this.vx) * respond;
    this.vy += (this.targetVY - this.vy) * respond;

    this.prevX = this.x;
    this.prevY = this.y;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    const m = CONFIG.MAP_SIZE;
    this.x = clamp(this.x, this.radius, m - this.radius);
    this.y = clamp(this.y, this.radius, m - this.radius);

    if (this.ghostTime > 0) this.ghostTime -= dt;

    // combo decay
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 0;
    }

    // ── animation ──
    this.orbitClock += dt;
    this.breathePhase += dt;
    this.wobblePhase += dt * 0.009;

    const spd = Math.hypot(this.vx, this.vy);
    const maxSpd = CONFIG.PLAYER_MAX_SPEED;
    const stretch = clamp(spd / maxSpd, 0, 1) * 0.14;
    const dx = spd > 0.0001 ? this.vx / spd : 0;
    const dy = spd > 0.0001 ? this.vy / spd : 0;
    const jiggle = Math.sin(this.wobblePhase) * 0.03;
    this.wobbleX = 1 + stretch * Math.abs(dx) - stretch * Math.abs(dy) + jiggle;
    this.wobbleY = 1 + stretch * Math.abs(dy) - stretch * Math.abs(dx) - jiggle;

    // blink
    this.blinkTimer -= dt;
    if (this.blinkTimer <= 0) {
      this.blinkVal = Math.min(1, this.blinkVal + dt / 70);
      if (this.blinkVal >= 1) this.blinkTimer = 3000 + Math.random() * 2000;
    } else if (this.blinkVal > 0) {
      this.blinkVal = Math.max(0, this.blinkVal - dt / 70);
    }

    // mouth: open near food
    this.mouthOpen = lerp(this.mouthOpen, this.approach, Math.min(1, dt * 0.02));
    if (this.chomp > 0) this.chomp = Math.max(0, this.chomp - dt / 240);

    // look direction
    let tx = dx, ty = dy;
    if (this.lookTarget) {
      const lx = this.lookTarget.x - this.x;
      const ly = this.lookTarget.y - this.y;
      const ld = Math.hypot(lx, ly) || 1;
      tx = lx / ld; ty = ly / ld;
    }
    this.lookX = lerp(this.lookX, tx, Math.min(1, dt * 0.012));
    this.lookY = lerp(this.lookY, ty, Math.min(1, dt * 0.012));

    // orbit item intake tween
    for (const it of this.orbit) {
      if (it.phase === 'in') {
        it.inT += dt / CONFIG.ABSORB_SHRINK_TIME;
        if (it.inT >= 1) it.phase = 'orbit';
      }
    }
  }

  private bumpCombo() {
    this.combo++;
    this.comboTimer = CONFIG.COMBO_DECAY_TIME;
  }

  // Absorb a park object -> orbit ring + score + growth
  absorbObject(obj: WorldObject): number {
    this.bumpCombo();
    this.chomp = 1;
    const gain = Math.round(obj.size * 1.6 * this.comboMult * this.greedMultiplier);
    this.score += gain;
    this.radius = addAreaToRadius(this.radius, Math.PI * obj.size * obj.size * 0.5);

    this.orbit.push({
      kind: obj.kind,
      tier: obj.tier,
      iconR: clamp(obj.size * 0.32, 5, 13),
      angle: Math.random() * Math.PI * 2,
      phase: 'in',
      inT: 0,
      fromX: obj.x,
      fromY: obj.y,
    });
    this.pendingFx.push({ type: 'absorb', x: obj.x, y: obj.y, color: CONFIG.COLORS.tierTint[obj.tier - 1] });
    this.pendingFx.push({ type: 'chomp', x: this.x, y: this.y });

    // trim
    while (this.orbit.filter((o) => o.phase === 'orbit').length > CONFIG.ORBIT_MAX) {
      const idx = this.orbit.findIndex((o) => o.phase === 'orbit');
      if (idx >= 0) this.orbit.splice(idx, 1); else break;
    }

    this.checkMerge();
    return gain;
  }

  private checkMerge() {
    const need = this.twinMerge ? 2 : 3;
    const byTier = new Map<number, OrbitItem[]>();
    for (const it of this.orbit) {
      if (it.phase !== 'orbit') continue;
      const arr = byTier.get(it.tier) || [];
      arr.push(it);
      byTier.set(it.tier, arr);
    }
    for (const [tier, arr] of byTier) {
      if (arr.length >= need) {
        const merge = arr.slice(0, need);
        this.orbit = this.orbit.filter((o) => !merge.includes(o));
        const bonus = Math.round(tier * 120 * this.comboMult * this.greedMultiplier);
        this.score += bonus;
        this.radius = addAreaToRadius(this.radius, 260 * tier);
        this.bumpCombo();
        this.pendingFx.push({ type: 'merge', x: this.x, y: this.y, text: `MERGE +${bonus}`, color: CONFIG.COLORS.tierTint[tier - 1], big: true });
      }
    }
  }

  // Eating a rival voidling
  eatRival(rivalRadius: number) {
    const bonus = Math.round(500 * Math.max(1, this.comboMult));
    this.score += bonus;
    this.radius = addAreaToRadius(this.radius, Math.PI * rivalRadius * rivalRadius * 0.5);
    this.bumpCombo();
    this.chomp = 1;
    this.pendingFx.push({ type: 'eatRival', x: this.x, y: this.y, text: `DEVOURED +${bonus}`, color: '#FFD23F', big: true });
  }

  // Player got eaten -> lose mass, ghost, keep playing
  getEaten() {
    this.radius = Math.max(CONFIG.PLAYER_BASE_RADIUS, this.radius * CONFIG.RESPAWN_MASS_FRAC);
    this.ghostTime = CONFIG.GHOST_TIME;
    this.combo = 0;
    this.orbit = [];
    this.vx = this.vy = 0;
  }

  private visual(t: number): VoidlingVisual {
    return {
      r: this.radius,
      skin: this.skin,
      t,
      lookX: clamp(this.lookX, -1, 1),
      lookY: clamp(this.lookY, -1, 1),
      open: this.mouthOpen,
      chomp: this.chomp,
      blink: this.blinkVal,
      wobbleX: this.wobbleX,
      wobbleY: this.wobbleY,
      lean: clamp(this.vx / CONFIG.PLAYER_MAX_SPEED, -1, 1) * 0.14,
      glow: clamp(this.combo / 16, 0, 1),
      breathe: 1 + Math.sin(this.breathePhase * 0.002) * 0.02,
      ghost: this.ghost,
    };
  }

  draw(ctx: CanvasRenderingContext2D, t: number, alpha: number) {
    const rx = lerp(this.prevX, this.x, alpha);
    const ry = lerp(this.prevY, this.y, alpha);

    // orbit ring (behind body handled by draw order in engine; here after)
    this.drawOrbit(ctx, rx, ry, t);

    // ghost flicker
    if (this.ghost) {
      ctx.save();
      ctx.globalAlpha = 0.5 + Math.sin(t / 90) * 0.15;
      drawVoidling(ctx, rx, ry, this.visual(t));
      ctx.restore();
    } else {
      drawVoidling(ctx, rx, ry, this.visual(t));
    }
  }

  private drawOrbit(ctx: CanvasRenderingContext2D, cx: number, cy: number, t: number) {
    const baseR = this.radius + CONFIG.ORBIT_RADIUS_OFFSET;
    const orbiting = this.orbit.filter((o) => o.phase === 'orbit');
    orbiting.forEach((it, i) => {
      const a = it.angle + this.orbitClock * CONFIG.ORBIT_SPEED + (i / Math.max(1, orbiting.length)) * Math.PI * 2;
      const ox = cx + Math.cos(a) * baseR;
      const oy = cy + Math.sin(a) * baseR;
      ctx.save();
      ctx.translate(ox, oy);
      drawParkObject(ctx, it.kind, it.iconR, { t });
      ctx.restore();
    });
    // intake tween
    for (const it of this.orbit) {
      if (it.phase !== 'in') continue;
      const e = it.inT;
      const tx = cx + Math.cos(it.angle) * baseR;
      const ty = cy + Math.sin(it.angle) * baseR;
      const px = lerp(it.fromX, tx, e);
      const py = lerp(it.fromY, ty, e);
      ctx.save();
      ctx.translate(px, py);
      ctx.globalAlpha = 0.5 + e * 0.5;
      drawParkObject(ctx, it.kind, lerp(it.iconR * 2.2, it.iconR, e), { t });
      ctx.restore();
    }
  }
}
