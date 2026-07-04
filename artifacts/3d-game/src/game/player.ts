import { CONFIG, type SkinDef, type ObjectKind } from './config';
import { clamp, lerp, growRadius } from './utils';
import { drawParkObject } from './objects';
import { drawVoidling, drawUnderdogTrail, type VoidlingVisual } from './voidling';
import type { WorldObject } from './world';

interface OrbitItem {
  kind: WorldObject['kind'];
  tier: number;
  iconR: number;          // intake-tween start size only
  angle: number;          // intake target angle
  slotA: number;          // live orbit angle (kept when fading out)
  bob: number;            // per-chip bob phase offset
  phase: 'in' | 'orbit' | 'out';
  inT: number;
  outT: number;
  fromX: number;
  fromY: number;
}

export interface FxEvent {
  type: 'absorb' | 'merge' | 'eatRival' | 'chomp' | 'finale' | 'evolve';
  x: number;
  y: number;
  text?: string;
  color?: string;
  big?: boolean;
  kind?: ObjectKind;
  form?: number;    // v6 §3: form index reached (for 'evolve')
}

export class Player {
  x = 0; y = 0; prevX = 0; prevY = 0;
  vx = 0; vy = 0;                    // px/s
  private inDirX = 0; private inDirY = 0; private inMag = 0;
  private inputActive = false;

  radius = CONFIG.PLAYER_BASE_RADIUS;
  score = 0;
  combo = 0;
  comboTimer = 0;

  // v6 §3: evolution form ladder — index into CONFIG.FORMS; only goes up
  formIndex = 0;
  cheekPuff = 0;        // 400ms after eating T3+
  dizzy = 0;            // 1s after being chomped
  lick = 0;             // 800ms after a TRIPLE

  orbit: OrbitItem[] = [];
  pendingFx: FxEvent[] = [];

  // boons
  magnetMultiplier = 1;
  speedMultiplier = 1;
  twinMerge = false;
  tremorActive = false;
  greedMultiplier = 1;
  // v7 §5: new power-up effect state
  tremorFactor = 0.85;   // TENDERIZER shrink-per-touch (Lvl I 15%, Lvl II 25%)
  twinBonus = 1;         // DOUBLE STOMACH II: +50% merge bonus
  echoActive = false;    // ECHO BITE held
  echoCount = 0;         // absorbs counted toward the next pulse
  echoPulse = false;     // set on every 5th absorb; engine fires the shockwave
  shieldCharge = false;  // BUBBLE SHIELD: one chomp-block available
  shieldPopped = false;  // set when the shield eats a chomp; engine consumes it
  dashActive = false;    // VOID DASH held (engine runs the 6s auto-dash)
  luckyActive = false;   // LUCKY GNOME held (engine spawns goldens)
  tremorLogCd = 0;       // throttle for the TENDERIZER debug log
  underdogSpeed = 1;      // v6 §2: 5th/6th place move-speed bonus (silent)
  underdogGrowth = 1;     // v6 §2: 5th/6th place growth bonus
  underdog = false;       // v6 §2: faint blue trail when trailing
  eventSlow = 1;          // v6 §5: firetruck water / event slow (reset each frame)

  // identity
  skin: SkinDef;
  name = 'You';

  // state
  ghostTime = 0;
  tooBigCd = 0;                      // ms cooldown on "too big" feedback

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

  // per-frame hints set by the world
  approach = 0;
  lookTarget: { x: number; y: number } | null = null;

  constructor(skin: SkinDef) {
    this.skin = skin;
  }

  reset(x: number, y: number, skin: SkinDef) {
    this.x = this.prevX = x;
    this.y = this.prevY = y;
    this.vx = this.vy = 0;
    this.inDirX = this.inDirY = this.inMag = 0;
    this.inputActive = false;
    this.radius = CONFIG.PLAYER_BASE_RADIUS;
    this.score = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.formIndex = 0;
    this.cheekPuff = 0;
    this.dizzy = 0;
    this.lick = 0;
    this.orbit = [];
    this.pendingFx = [];
    this.magnetMultiplier = 1;
    this.speedMultiplier = 1;
    this.twinMerge = false;
    this.tremorActive = false;
    this.greedMultiplier = 1;
    this.tremorFactor = 0.85;
    this.twinBonus = 1;
    this.echoActive = false;
    this.echoCount = 0;
    this.echoPulse = false;
    this.shieldCharge = false;
    this.shieldPopped = false;
    this.dashActive = false;
    this.luckyActive = false;
    this.tremorLogCd = 0;
    this.ghostTime = 0;
    this.tooBigCd = 0;
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
    this.inDirX = dirX;
    this.inDirY = dirY;
    this.inMag = mag;
    this.inputActive = mag > 0.01;
  }

  update(dt: number) {
    const dtSec = dt / 1000;

    // ── velocity: accel toward joystick vector, decel to stop on release (px/s) ──
    // v6 §3: each form gained grants +8% move speed, stacking.
    const formSpeed = 1 + this.formIndex * CONFIG.FORM_SPEED_BONUS;
    const maxSpeed = CONFIG.MOVE_MAX_SPEED * this.speedMultiplier * this.sizeSpeedFactor() * formSpeed * this.underdogSpeed * this.eventSlow;
    const tvx = this.inputActive ? this.inDirX * this.inMag * maxSpeed : 0;
    const tvy = this.inputActive ? this.inDirY * this.inMag * maxSpeed : 0;
    const dvx = tvx - this.vx;
    const dvy = tvy - this.vy;
    const dlen = Math.hypot(dvx, dvy);
    const step = (this.inputActive ? CONFIG.MOVE_ACCEL : CONFIG.MOVE_DECEL) * dtSec;
    if (dlen <= step || dlen < 0.0001) {
      this.vx = tvx; this.vy = tvy;
    } else {
      this.vx += (dvx / dlen) * step;
      this.vy += (dvy / dlen) * step;
    }

    this.prevX = this.x;
    this.prevY = this.y;
    this.x += this.vx * dtSec;
    this.y += this.vy * dtSec;

    // v6 §7: soft-bounce boundary — nudge back in and reflect a little energy
    const m = CONFIG.MAP_SIZE;
    if (this.x < this.radius) { this.x = this.radius; this.vx = Math.abs(this.vx) * 0.4; }
    else if (this.x > m - this.radius) { this.x = m - this.radius; this.vx = -Math.abs(this.vx) * 0.4; }
    if (this.y < this.radius) { this.y = this.radius; this.vy = Math.abs(this.vy) * 0.4; }
    else if (this.y > m - this.radius) { this.y = m - this.radius; this.vy = -Math.abs(this.vy) * 0.4; }

    if (this.ghostTime > 0) this.ghostTime -= dt;
    if (this.tooBigCd > 0) this.tooBigCd -= dt;
    if (this.tremorLogCd > 0) this.tremorLogCd -= dt; // v7 §5: throttle tremor log

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
    const maxSpd = CONFIG.MOVE_MAX_SPEED;
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

    // v6 §9: expression timers (cheek puff 400ms, dizzy 1s, tongue-lick 800ms)
    if (this.cheekPuff > 0) this.cheekPuff = Math.max(0, this.cheekPuff - dt / 400);
    if (this.dizzy > 0) this.dizzy = Math.max(0, this.dizzy - dt / 1000);
    if (this.lick > 0) this.lick = Math.max(0, this.lick - dt / 800);

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

    // orbit item intake tween + overflow fade-out
    for (let i = this.orbit.length - 1; i >= 0; i--) {
      const it = this.orbit[i];
      if (it.phase === 'in') {
        it.inT += dt / CONFIG.ABSORB_SHRINK_TIME;
        if (it.inT >= 1) it.phase = 'orbit';
      } else if (it.phase === 'out') {
        it.outT += dt / 220;
        if (it.outT >= 1) this.orbit.splice(i, 1);
      }
    }
    // v5 §4: enforce the 6-chip cap after intake transitions (oldest fades out)
    while (this.orbit.filter((o) => o.phase === 'orbit').length > CONFIG.ORBIT_MAX) {
      const idx = this.orbit.findIndex((o) => o.phase === 'orbit');
      if (idx >= 0) this.orbit[idx].phase = 'out'; else break;
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
    // v7 §5: ECHO BITE — every 5th absorb queues a shockwave pulse (engine fires it)
    if (this.echoActive && (++this.echoCount % 5 === 0)) this.echoPulse = true;
    const goldMult = obj.golden ? CONFIG.GOLDEN_SCORE_MULT : 1; // v6 §2
    let gain = Math.round(obj.size * 1.6 * this.comboMult * this.greedMultiplier * goldMult);
    if (obj.kind === 'drone') gain *= CONFIG.DRONE_SCORE_MULT; // v7 §3: drone worth 2×
    this.score += gain;
    this.radius = growRadius(this.radius, Math.PI * obj.size * obj.size * 0.5 * this.underdogGrowth, CONFIG.DIMINISH_BASE, CONFIG.MAX_RADIUS);
    if (obj.tier >= 3) this.cheekPuff = 1; // v6 §9: cheek puff on T3+
    this.checkEvolution();

    this.orbit.push({
      kind: obj.kind,
      tier: obj.tier,
      iconR: clamp(obj.size * 0.5, 14, 30),
      angle: Math.random() * Math.PI * 2,
      slotA: 0,
      bob: Math.random() * Math.PI * 2,
      phase: 'in',
      inT: 0,
      outT: 0,
      fromX: obj.x,
      fromY: obj.y,
    });
    this.pendingFx.push({ type: 'absorb', x: obj.x, y: obj.y, color: CONFIG.COLORS.tierTint[obj.tier - 1] });
    this.pendingFx.push({ type: 'chomp', x: this.x, y: this.y, kind: obj.kind });

    // v5 §4: cap at 6 — the oldest fades out on overflow
    while (this.orbit.filter((o) => o.phase === 'orbit').length > CONFIG.ORBIT_MAX) {
      const idx = this.orbit.findIndex((o) => o.phase === 'orbit');
      if (idx >= 0) this.orbit[idx].phase = 'out'; else break;
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
        const bonus = Math.round(tier * 120 * this.comboMult * this.greedMultiplier * this.twinBonus);
        this.score += bonus;
        this.radius = growRadius(this.radius, 260 * tier * this.underdogGrowth, CONFIG.DIMINISH_BASE, CONFIG.MAX_RADIUS);
        this.bumpCombo();
        this.lick = 1; // v6 §9: tongue-lick grin after a TRIPLE
        this.pendingFx.push({ type: 'merge', x: this.x, y: this.y, text: `TRIPLE! +${bonus}`, color: '#FFD23F', big: true });
        this.checkEvolution();
      }
    }
  }

  // Eating a rival voidling
  eatRival(rivalRadius: number) {
    const bonus = Math.round(500 * Math.max(1, this.comboMult));
    this.score += bonus;
    this.radius = growRadius(this.radius, Math.PI * rivalRadius * rivalRadius * 0.5 * this.underdogGrowth, CONFIG.DIMINISH_BASE, CONFIG.MAX_RADIUS);
    this.bumpCombo();
    this.chomp = 1;
    this.cheekPuff = 1;
    this.pendingFx.push({ type: 'eatRival', x: this.x, y: this.y, text: `DEVOURED +${bonus}`, color: '#FFD23F', big: true });
    this.checkEvolution();
  }

  // v6 §3: promote through the form ladder; forms only go up within a round.
  private checkEvolution() {
    while (
      this.formIndex < CONFIG.FORMS.length - 1 &&
      this.radius >= CONFIG.FORMS[this.formIndex + 1].radius
    ) {
      this.formIndex++;
      this.pendingFx.push({
        type: 'evolve', x: this.x, y: this.y,
        form: this.formIndex, text: CONFIG.FORMS[this.formIndex].name,
      });
    }
  }

  // v6 §3: floor the radius at the current form's threshold (chomp/decay can't demote)
  get formFloor() {
    return Math.max(CONFIG.PLAYER_BASE_RADIUS, CONFIG.FORMS[this.formIndex].radius);
  }

  get formName() { return CONFIG.FORMS[this.formIndex].name; }

  // Player got eaten -> lose mass, ghost, keep playing
  getEaten() {
    // v6 §3: being chomped can't drop you below a form you've already reached
    this.radius = Math.max(this.formFloor, this.radius * CONFIG.RESPAWN_MASS_FRAC);
    this.ghostTime = CONFIG.GHOST_TIME;
    this.combo = 0;
    this.dizzy = 1; // v6 §9: dizzy swirl eyes for 1s
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
      lean: clamp(this.vx / CONFIG.MOVE_MAX_SPEED, -1, 1) * 0.14,
      glow: clamp(this.combo / 16, 0, 1),
      breathe: 1 + Math.sin(this.breathePhase * 0.002) * 0.02,
      ghost: this.ghost,
      form: this.formIndex,
      cheekPuff: this.cheekPuff,
      dizzy: this.dizzy,
      lick: this.lick,
    };
  }

  draw(ctx: CanvasRenderingContext2D, t: number, alpha: number) {
    const rx = lerp(this.prevX, this.x, alpha);
    const ry = lerp(this.prevY, this.y, alpha);

    if (this.underdog && !this.ghost) drawUnderdogTrail(ctx, rx, ry, this.vx, this.vy, this.radius);

    this.drawOrbit(ctx, rx, ry, t);

    if (this.ghost) {
      // 40% opacity + dashed outline ring, plus a soft flicker
      ctx.save();
      ctx.globalAlpha = 0.4;
      drawVoidling(ctx, rx, ry, this.visual(t));
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = 0.7;
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([8, 6]);
      ctx.lineDashOffset = -(t / 40) % 14;
      ctx.beginPath();
      ctx.arc(rx, ry, this.radius + 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    } else {
      drawVoidling(ctx, rx, ry, this.visual(t));
    }
  }

  private drawOrbit(ctx: CanvasRenderingContext2D, cx: number, cy: number, t: number) {
    // v5 §4: white circular chips on a faint dashed orbit at playerRadius+26
    const CHIP_R = 11;                  // 22px chip
    const ICON_R = CHIP_R * 0.7;        // icon fills 70%
    const orbitR = this.radius + CONFIG.ORBIT_RADIUS_OFFSET;
    const orbiting = this.orbit.filter((o) => o.phase === 'orbit');
    const outs = this.orbit.filter((o) => o.phase === 'out');

    // faint dashed orbit path
    if (orbiting.length + outs.length > 0) {
      ctx.save();
      ctx.globalAlpha = 0.25;
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.arc(cx, cy, orbitR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // tiers one short of a merge -> gold telegraph
    const need = this.twinMerge ? 2 : 3;
    const tierCount = new Map<number, number>();
    for (const o of orbiting) tierCount.set(o.tier, (tierCount.get(o.tier) || 0) + 1);
    const telegraph = new Set<number>();
    for (const [tier, n] of tierCount) if (n >= need - 1) telegraph.add(tier);

    const spin = (this.orbitClock / 1000) * CONFIG.ORBIT_SPEED; // rad (0.6 rad/s)

    const drawChip = (it: OrbitItem, a: number, alpha: number, rr: number) => {
      const ox = cx + Math.cos(a) * rr;
      const oy = cy + Math.sin(a) * rr;
      ctx.save();
      ctx.translate(ox, oy);
      ctx.globalAlpha = alpha;
      const accent = CONFIG.COLORS.tierTint[it.tier - 1] || '#FFFFFF';
      if (telegraph.has(it.tier) && it.phase === 'orbit') {
        const pulse = 0.5 + Math.sin(t / 140) * 0.5;
        ctx.save();
        ctx.globalAlpha = alpha * (0.3 + pulse * 0.4);
        ctx.fillStyle = '#FFD23F';
        ctx.beginPath();
        ctx.arc(0, 0, CHIP_R + 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(0, 0, CHIP_R, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, CHIP_R - 1, 0, Math.PI * 2);
      ctx.stroke();
      drawParkObject(ctx, it.kind, ICON_R, { t });
      ctx.restore();
    };

    orbiting.forEach((it, i) => {
      const a = spin + (i / orbiting.length) * Math.PI * 2;
      it.slotA = a;
      const twin = telegraph.has(it.tier);
      const bob = Math.sin(t / 300 + it.bob) * 2;               // ±2px bob
      const drift = twin ? Math.sin(t / 200 + i) * 3 : 0;        // gold drift
      drawChip(it, a, 1, orbitR + bob + drift);
    });

    // fading overflow chips drift outward
    for (const it of outs) drawChip(it, it.slotA, 1 - it.outT, orbitR + it.outT * 18);

    // intake tween (flying into the ring)
    for (const it of this.orbit) {
      if (it.phase !== 'in') continue;
      const e = it.inT;
      const tx = cx + Math.cos(it.angle) * orbitR;
      const ty = cy + Math.sin(it.angle) * orbitR;
      const px = lerp(it.fromX, tx, e);
      const py = lerp(it.fromY, ty, e);
      ctx.save();
      ctx.translate(px, py);
      ctx.globalAlpha = 0.5 + e * 0.5;
      drawParkObject(ctx, it.kind, lerp(it.iconR * 1.6, ICON_R, e), { t });
      ctx.restore();
    }
  }
}
