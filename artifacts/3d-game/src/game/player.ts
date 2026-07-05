// v14 §2 — Accretion Orbit redesign.
// Every captured object enters a spiral orbit and only delivers growth/score
// when the spiral completes (spaghettification → absorption). Score and growth
// are deferred; combo is bumped at capture so chains still register.

import { CONFIG, type SkinDef, type ObjectKind } from './config';
import { clamp, lerp } from './utils';
import { Void } from './void';
import { drawParkObject } from './objects';
import { drawVoidling, drawUnderdogTrail, type VoidlingVisual } from './voidling';
import type { WorldObject } from './world';

// v14 §2: each captured object orbits while spiraling inward; growth/score
// apply only when spiralT reaches 1 (the moment of absorption).
export interface OrbitItem {
  kind: ObjectKind;
  tier: number;
  objSize: number;        // stored for deferred grow — absorbObjectMass(objSize)
  gain: number;           // pre-computed score (deferred until finalize)
  iconR: number;          // display radius, starts big, shrinks toward center
  angle: number;          // current orbital angle (rad), advances over time
  bob: number;            // phase offset for living-thing flail
  phase: 'in' | 'spiral' | 'out';
  inT: number;            // 0→1 fly-in tween
  spiralT: number;        // 0→1 spiral progress (1 = absorbed, finalize fires)
  spiralDur: number;      // total spiral duration ms
  baseOrbitR: number;     // orbit radius at spiral start (set when 'in' → 'spiral')
  fromX: number;
  fromY: number;
  live: boolean;          // living kind → flail while orbiting
  finalized: boolean;     // growth/score already applied (set at spiralT>=1)
  golden: boolean;
}

export interface FxEvent {
  type: 'absorb' | 'merge' | 'eatRival' | 'chomp' | 'finale' | 'evolve' | 'score' | 'captureStart' | 'zoo_break';
  x: number;
  y: number;
  text?: string;
  color?: string;
  big?: boolean;
  kind?: ObjectKind;
  form?: number;
  tier?: number;
  amount?: number;
}

export class Player extends Void {
  private inDirX = 0; private inDirY = 0; private inMag = 0;
  private inputActive = false;

  combo = 0;
  comboTimer = 0;

  cheekPuff = 0;
  dizzy = 0;
  lick = 0;

  orbit: OrbitItem[] = [];
  pendingFx: FxEvent[] = [];

  // boons
  gnomeScoreMult = 1;
  magnetMultiplier = 1;
  speedMultiplier = 1;
  twinMerge = false;
  tremorActive = false;
  greedMultiplier = 1;
  frenzyMult = 1;
  tremorFactor = 0.85;
  twinBonus = 1;
  echoActive = false;
  echoCount = 0;
  echoPulse = false;
  shieldCharge = false;
  shieldPopped = false;
  dashActive = false;
  luckyActive = false;
  tremorLogCd = 0;

  name = 'You';
  tooBigCd = 0;

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
    super(skin);
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
    this.gnomeScoreMult = 1;
    this.magnetMultiplier = 1;
    this.speedMultiplier = 1;
    this.twinMerge = false;
    this.tremorActive = false;
    this.greedMultiplier = 1;
    this.frenzyMult = 1;
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
    this.tickMorph(dt);
    const dtSec = dt / 1000;

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

    const m = CONFIG.MAP_SIZE;
    if (this.x < this.radius) { this.x = this.radius; this.vx = Math.abs(this.vx) * 0.4; }
    else if (this.x > m - this.radius) { this.x = m - this.radius; this.vx = -Math.abs(this.vx) * 0.4; }
    if (this.y < this.radius) { this.y = this.radius; this.vy = Math.abs(this.vy) * 0.4; }
    else if (this.y > m - this.radius) { this.y = m - this.radius; this.vy = -Math.abs(this.vy) * 0.4; }

    if (this.ghostTime > 0) this.ghostTime -= dt;
    if (this.tooBigCd > 0) this.tooBigCd -= dt;
    if (this.tremorLogCd > 0) this.tremorLogCd -= dt;

    // combo decay
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 0;
    }

    // animation
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

    this.mouthOpen = lerp(this.mouthOpen, this.approach, Math.min(1, dt * 0.02));
    if (this.chomp > 0) this.chomp = Math.max(0, this.chomp - dt / 240);

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

    // v14 §2: advance orbit items — fly-in → spiral → absorb
    this.tickOrbit(dt);
  }

  // v14 §2: advance all orbit item phases
  private tickOrbit(dt: number) {
    for (let i = this.orbit.length - 1; i >= 0; i--) {
      const it = this.orbit[i];
      if (it.phase === 'out') {
        it.inT += dt / 180; // reuse inT as fade-out progress
        if (it.inT >= 1) { this.orbit.splice(i, 1); }
        continue;
      }
      if (it.phase === 'in') {
        it.inT += dt / CONFIG.ABSORB_SHRINK_TIME;
        if (it.inT >= 1) {
          it.inT = 1;
          it.phase = 'spiral';
          it.baseOrbitR = this.radius + CONFIG.ORBIT_RADIUS_OFFSET;
        }
        continue;
      }
      if (it.phase === 'spiral') {
        it.spiralT = Math.min(1, it.spiralT + dt / it.spiralDur);
        // angular velocity increases as the orbit shrinks (conserve angular momentum feel)
        const eased = Math.pow(it.spiralT, 0.6);
        const orbitR = it.baseOrbitR * (1 - eased);
        const angVel = CONFIG.ORBIT_SPEED * (orbitR < 4 ? 8 : it.baseOrbitR / Math.max(4, orbitR));
        it.angle += (angVel * dt) / 1000;
        if (!it.finalized && it.spiralT >= 1) {
          this.finalizeOrbitItem(it);
        }
      }
    }

    // auto-fuse check after all ticks
    this.checkAutoFuse();

    // remove fully-finalized spiral items
    for (let i = this.orbit.length - 1; i >= 0; i--) {
      if (this.orbit[i].phase === 'spiral' && this.orbit[i].finalized && this.orbit[i].spiralT >= 1) {
        this.orbit.splice(i, 1);
      }
    }
  }

  private bumpCombo() {
    this.combo++;
    this.comboTimer = CONFIG.COMBO_DECAY_TIME;
  }

  // v14 §2: called when spiralT>=1 — NOW apply growth, score, and fire FX
  private finalizeOrbitItem(it: OrbitItem) {
    it.finalized = true;
    this.absorbObjectMass(it.objSize);
    this.score += it.gain;
    if (it.tier >= 3) this.cheekPuff = 1;
    this.chomp = 1;
    this.checkEvolution();

    // fire the actual pop/score FX at the void center (item has spiraled to center)
    this.pendingFx.push({ type: 'chomp', x: this.x, y: this.y, kind: it.kind, tier: it.tier });
    this.pendingFx.push({
      type: 'score', x: this.x, y: this.y - this.radius - 20,
      amount: it.gain, color: CONFIG.COLORS.tierTint[it.tier - 1] || '#FFFFFF', tier: it.tier,
    });
    this.pendingFx.push({ type: 'absorb', x: this.x, y: this.y, color: CONFIG.COLORS.tierTint[it.tier - 1] });
  }

  // v14 §2: capture object → enters orbit, growth/score deferred
  absorbObject(obj: WorldObject): number {
    this.bumpCombo();
    if (this.echoActive && (++this.echoCount % 5 === 0)) this.echoPulse = true;

    const goldMult = obj.golden ? CONFIG.GOLDEN_SCORE_MULT : 1;
    const kindScoreMult = CONFIG.KIND_INFO[obj.kind]?.scoreMult ?? 1; // v16.1 D: zoo animals 2×
    let gain = Math.round(obj.size * 1.6 * this.comboMult * this.greedMultiplier * goldMult * this.frenzyMult * kindScoreMult);
    if (obj.kind === 'drone') gain *= CONFIG.DRONE_SCORE_MULT;
    if (obj.kind === 'gnome') gain = Math.round(gain * this.gnomeScoreMult);
    if (obj.kind === 'skyscraper') gain *= 3;
    // Note: score is NOT added yet — deferred to finalizeOrbitItem

    const live = (CONFIG.LIVING_ORBIT_KINDS as string[]).includes(obj.kind);

    // v14 §2: spiral duration — DEVOURER+ T1/T2 use fast orbit
    const isFast = this.formIndex >= CONFIG.DEVOURER_FORM_INDEX && obj.tier <= 2;
    const spiralDur = isFast ? CONFIG.ORBIT_SPIRAL_DUR_FAST
      : CONFIG.ORBIT_SPIRAL_DUR + (Math.random() - 0.5) * 400; // ±200ms jitter

    // capacity check: if at 8, instantly finalize the oldest spiral item to make room
    const active = this.orbit.filter((o) => o.phase !== 'out');
    if (active.length >= CONFIG.ORBIT_MAX) {
      const oldest = active.find((o) => o.phase === 'spiral' && !o.finalized);
      if (oldest) { oldest.spiralT = 1; this.finalizeOrbitItem(oldest); }
    }

    this.orbit.push({
      kind: obj.kind,
      tier: obj.tier,
      objSize: obj.size,
      gain,
      iconR: clamp(obj.size * 0.5, 12, 28),
      angle: Math.random() * Math.PI * 2,
      bob: Math.random() * Math.PI * 2,
      phase: 'in',
      inT: 0,
      spiralT: 0,
      spiralDur,
      baseOrbitR: this.radius + CONFIG.ORBIT_RADIUS_OFFSET,
      fromX: obj.x,
      fromY: obj.y,
      live,
      finalized: false,
      golden: obj.golden ?? false,
    });

    // capture-start spark at object position (subtle suction flash)
    this.pendingFx.push({ type: 'captureStart', x: obj.x, y: obj.y, color: CONFIG.COLORS.tierTint[obj.tier - 1] });

    return gain; // returned so caller knows the pending gain (for display)
  }

  // v14 §2: auto-fuse — 3 same-kind items simultaneously in spiral → TRIPLE
  private checkAutoFuse() {
    const need = this.twinMerge ? 2 : 3;
    // count live, non-finalized spiral items by kind
    const byKind = new Map<ObjectKind, OrbitItem[]>();
    for (const it of this.orbit) {
      if (it.phase !== 'spiral' || it.finalized) continue;
      const arr = byKind.get(it.kind) || [];
      arr.push(it);
      byKind.set(it.kind, arr);
    }
    for (const [, arr] of byKind) {
      if (arr.length >= need) {
        const merge = arr.slice(0, need);
        // finalize merged items (apply their individual growth/score)
        for (const it of merge) {
          it.spiralT = 1;
          it.finalized = true;
          this.absorbObjectMass(it.objSize);
          this.score += it.gain;
          this.checkEvolution();
        }
        // remove merged items from orbit
        const mergeSet = new Set(merge);
        this.orbit = this.orbit.filter((o) => !mergeSet.has(o));
        // bonus mass + score for the triple
        const tier = merge[0].tier;
        const bonus = Math.round(tier * 120 * this.comboMult * this.greedMultiplier * this.twinBonus * this.frenzyMult);
        this.score += bonus;
        this.absorbMergeMass(260 * tier);
        this.bumpCombo();
        this.lick = 1;
        this.cheekPuff = 1;
        this.checkEvolution();
        this.pendingFx.push({
          type: 'merge', x: this.x, y: this.y,
          text: `TRIPLE! +${bonus}`, color: '#FFD23F', big: true,
        });
        return; // process one merge per frame to avoid cascades
      }
    }
  }

  // v14 §2: add orbit items from an eaten rival (orbit-theft visual)
  // Spawns 2-3 small orbit items directly into the player's orbit as a reward flourish.
  absorbRivalOrbit(rivalRadius: number) {
    const count = Math.min(3, Math.max(1, Math.round(rivalRadius / 30)));
    const kinds: ObjectKind[] = ['apple', 'flower', 'mailbox', 'duck', 'gnome'];
    for (let k = 0; k < count; k++) {
      const kind = kinds[k % kinds.length];
      const tier = k === 0 ? 2 : 1;
      const active = this.orbit.filter((o) => o.phase !== 'out');
      if (active.length >= CONFIG.ORBIT_MAX) break;
      this.orbit.push({
        kind, tier, objSize: 14, gain: 0, // no extra score — bonus already given via eatRival
        iconR: 14, angle: Math.random() * Math.PI * 2, bob: Math.random() * Math.PI * 2,
        phase: 'spiral', inT: 1, spiralT: 0,
        spiralDur: 800, // fast exit since they're bonus
        baseOrbitR: this.radius + CONFIG.ORBIT_RADIUS_OFFSET + k * 12,
        fromX: this.x, fromY: this.y,
        live: false, finalized: false, golden: false,
      });
    }
  }

  // Eating a rival voidling
  eatRival(rivalRadius: number, stolen = 0) {
    const bonus = Math.round(500 * Math.max(1, this.comboMult));
    this.score += bonus + stolen;
    this.absorbVoidMass(rivalRadius);
    this.bumpCombo();
    this.chomp = 1;
    this.cheekPuff = 1;
    const label = stolen > 0 ? `DEVOURED +${bonus} STOLE +${stolen}` : `DEVOURED +${bonus}`;
    this.pendingFx.push({ type: 'eatRival', x: this.x, y: this.y, text: label, color: '#FFD23F', big: true });
    this.checkEvolution();
    // v14 §2: orbit-theft visual — rival's items scatter into our orbit
    this.absorbRivalOrbit(rivalRadius);
  }

  private checkEvolution() {
    this.advanceForms((formIndex) => {
      this.pendingFx.push({
        type: 'evolve', x: this.x, y: this.y,
        form: formIndex, text: CONFIG.FORMS[formIndex].name,
      });
    });
  }

  getEaten() {
    this.shrinkOnEaten();
    this.ghostTime = CONFIG.GHOST_TIME;
    this.combo = 0;
    this.dizzy = 1;
    // clear orbit on death — items are lost
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
      morph: this.morph,
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

  // v14 §2: Accretion Orbit visual — items spiral in with spaghettification
  private drawOrbit(ctx: CanvasRenderingContext2D, cx: number, cy: number, t: number) {
    for (const it of this.orbit) {
      if (it.phase === 'in') {
        this.drawFlyIn(ctx, it, cx, cy, t);
      } else if (it.phase === 'spiral') {
        this.drawSpiral(ctx, it, cx, cy, t);
      } else if (it.phase === 'out') {
        // fade-out items drift outward
        const a = it.angle;
        const r = it.baseOrbitR + it.inT * 24;
        const ox = cx + Math.cos(a) * r;
        const oy = cy + Math.sin(a) * r;
        ctx.save();
        ctx.translate(ox, oy);
        ctx.globalAlpha = Math.max(0, 1 - it.inT);
        drawParkObject(ctx, it.kind, it.iconR * (1 - it.inT * 0.5), { t });
        ctx.restore();
      }
    }
  }

  // Fly-in phase: arc from capture position to orbit ring
  private drawFlyIn(ctx: CanvasRenderingContext2D, it: OrbitItem, cx: number, cy: number, t: number) {
    const e = it.inT;
    const targetR = this.radius + CONFIG.ORBIT_RADIUS_OFFSET;
    const tx = cx + Math.cos(it.angle) * targetR;
    const ty = cy + Math.sin(it.angle) * targetR;
    const px = lerp(it.fromX, tx, e * e); // ease-in
    const py = lerp(it.fromY, ty, e * e);
    const scale = lerp(1.3, 1.0, e);
    ctx.save();
    ctx.translate(px, py);
    ctx.globalAlpha = 0.5 + e * 0.5;
    ctx.scale(scale, scale);
    drawParkObject(ctx, it.kind, it.iconR, { t });
    ctx.restore();
  }

  // Spiral phase: orbit while shrinking toward center with spaghettification + living-thing flail
  private drawSpiral(ctx: CanvasRenderingContext2D, it: OrbitItem, cx: number, cy: number, t: number) {
    const eased = Math.pow(it.spiralT, 0.6);
    const orbitR = it.baseOrbitR * (1 - eased);
    const iconR = it.iconR * (1 - Math.pow(it.spiralT, 0.5));
    if (iconR < 1.5) return; // too small to draw

    const a = it.angle;
    const ox = cx + Math.cos(a) * orbitR;
    const oy = cy + Math.sin(a) * orbitR;

    // spaghettification: stretch radially toward center as spiralT increases
    const spaghettiStretch = 1 + it.spiralT * 1.6;  // stretch along radial axis
    const spaghettiSqueeze = 1 - it.spiralT * 0.55; // squeeze tangentially
    // radial direction (toward center)
    const radAngle = Math.atan2(oy - cy, ox - cx); // angle from center to item

    // flail for living things
    let flailX = 0, flailY = 0, flailRot = 0;
    if (it.live) {
      const flailAmt = Math.sin(t / 80 + it.bob) * (4 + it.spiralT * 8);
      const flailAmt2 = Math.cos(t / 60 + it.bob * 1.3) * 3;
      // flail perpendicular to radial direction
      flailX = Math.cos(a + Math.PI / 2) * flailAmt;
      flailY = Math.sin(a + Math.PI / 2) * flailAmt;
      flailRot = Math.sin(t / 90 + it.bob) * 0.6;
    }

    ctx.save();
    ctx.translate(ox + flailX, oy + flailY);
    ctx.rotate(radAngle + flailRot); // face the pull direction
    ctx.scale(spaghettiStretch * (it.golden ? 1.15 : 1), spaghettiSqueeze);
    ctx.globalAlpha = it.finalized ? 0 : 1;

    // gold tint for golden objects
    if (it.golden) {
      ctx.shadowColor = '#FFD23F';
      ctx.shadowBlur = 8;
    }

    drawParkObject(ctx, it.kind, iconR, { t });
    ctx.restore();
  }
}
