import { CONFIG, type SkinDef } from './config';
import { isWalkable } from './islandMap'; // Phase 2: island-edge avoidance
import { meta } from './meta';
import { clamp, lerp, dist } from './utils';
import { Void } from './void';
import { drawVoidling, drawUnderdogTrail, drawSparkleTrail } from './voidling';
import { arrivalOffsetY, arrivalDrawShadow, arrivalDrawFX, ARRIVAL_FALL_MS, ARRIVAL_TOTAL_MS } from './arrival';
import type { WorldObject } from './world';

export interface VoidView { x: number; y: number; radius: number; }
export interface WorldView { objects: WorldObject[]; voids: VoidView[]; map: number; elapsed: number; playerScore: number; playerRadius: number; }

export interface Intent { dirX: number; dirY: number; mag: number; }

// Future-proofed: BotController now, NetController later, same interface.
export interface RivalController {
  kind: string;
  think(rival: Rival, view: WorldView, dt: number): Intent;
}

export class Rival extends Void {
  private inDirX = 0; private inDirY = 0; private inMag = 0;
  // Family arc: created dormant (off-map), flipped alive when they sky-fall in.
  alive = false;

  relation: string;               // kin label shown on the nameplate (e.g. "lil bro")
  controller: RivalController;
  speedScale: number;

  // Family-arrival state
  arrived = false;                // has this family member dropped in yet?
  arrivalE = 0;                   // ms elapsed since the sky-fall began
  // Speech bubble (arrival bark + ongoing family banter)
  bubbleText = '';
  bubbleT = 0;                    // ms remaining on the current bubble
  threatToPlayer = false;         // Overnight: engine flags rivals big enough to eat the player
  private banterCd = 14000 + Math.random() * 10000; // ms until next fun line

  // v9 §1: radius/score/formIndex/ghostTime/underdog*/eventSlow/skin/name are on Void
  eventFlee: { x: number; y: number } | null = null; // v7 §4: hazard to run from
  // v7 §8: which shop skin this bot is showing off this round
  wearsUnownedSkin = false;
  shopSkinId = '';
  shopSkinName = '';
  // v6 §6: bot brain timers
  satedTime = 0;          // grazes only while > 0 (SATED after a meal)
  voidSatedMs = 0;        // v13 §0: 10s cooldown after eating another void (bot-on-bot pump prevention)
  timeSinceEat = 0;       // ms since last successful eat (anti-idle)
  idleTimer = 0;          // rolling anti-idle window
  idleAnchorX = 0;        // position at window start
  idleAnchorY = 0;
  forceRetarget = false;  // set when stuck/hungry → controller re-picks

  // anim
  private blinkTimer = 1000 + Math.random() * 3000;
  private blinkVal = 0;
  private mouth = 0;
  private chompV = 0;
  private chompSquashT = 0; // Alive Pack §5: eat-chomp squash timer (ms)
  private lookX = 0; private lookY = 0;
  private wobblePhase = Math.random() * 10;
  private wobbleX = 1; private wobbleY = 1;
  private breathePhase = Math.random() * 1000;
  private bobOffset = 0; // Alive Pack §4: move bob

  constructor(name: string, relation: string, skin: SkinDef, controller: RivalController, speedScale = 1) {
    super(skin);
    this.name = name;
    this.relation = relation;
    this.controller = controller;
    this.speedScale = speedScale;
  }

  spawn(x: number, y: number, radius: number) {
    this.x = this.prevX = x;
    this.y = this.prevY = y;
    this.vx = this.vy = 0;
    this.inDirX = this.inDirY = this.inMag = 0;
    this.radius = radius;
    this.alive = true;
  }

  /** Family arc: drop this member into the match with a sky-fall + bark. Called
   *  by the engine when the arrival schedule fires. Ghosts them for the fall so
   *  they can't be eaten mid-air. */
  beginArrival(x: number, y: number, radius: number, bark: string) {
    this.spawn(x, y, radius);
    this.arrived = true;
    this.arrivalE = 0;
    this.bubbleText = bark;
    this.bubbleT = 3400;
    this.ghostTime = ARRIVAL_TOTAL_MS; // invulnerable while falling in
  }

  setInput(dirX: number, dirY: number, mag: number) {
    this.inDirX = dirX; this.inDirY = dirY; this.inMag = mag;
  }

  update(dt: number, view: WorldView) {
    if (!this.arrived) return; // dormant until the arrival schedule drops them in
    if (this.arrivalE < ARRIVAL_TOTAL_MS) this.arrivalE += dt;
    const airborne = this.arrivalE < ARRIVAL_FALL_MS; // still falling — no AI, no drift

    // Family banter — the kin are having FUN devouring together, and say so.
    if (this.bubbleT > 0) this.bubbleT -= dt;
    if (!airborne) {
      this.banterCd -= dt;
      if (this.banterCd <= 0) {
        this.banterCd = 16000 + Math.random() * 14000;
        if (this.bubbleT <= 0) {
          const pool = CONFIG.FAMILY_BANTER;
          this.bubbleText = pool[Math.floor(Math.random() * pool.length)];
          this.bubbleT = 3000;
        }
      }
    }

    this.tickMorph(dt);     // v9 §3: advance the body-morph crossfade
    this.tickCaptures(dt);  // v15 §0: drain the deferred-absorb orbit queue
    // v16.2 §0: bot radius cap — never more than player × 1.25; absorbs beyond still score them
    if (view.playerRadius > 0 && this.radius > view.playerRadius * CONFIG.BOT_RADIUS_CAP_FRAC) {
      this.radius = view.playerRadius * CONFIG.BOT_RADIUS_CAP_FRAC;
    }
    const intent = airborne ? { dirX: 0, dirY: 0, mag: 0 } : this.controller.think(this, view, dt);
    this.setInput(intent.dirX, intent.dirY, intent.mag);

    const dtSec = dt / 1000;
    const grown = this.radius / CONFIG.PLAYER_BASE_RADIUS;
    const sizeFactor = clamp(1.05 - grown * 0.05, 0.7, 1.05);
    // v6 §2/§3: form speed bonus (+8% each, stacking) + underdog boost
    const formSpeed = 1 + this.formIndex * CONFIG.FORM_SPEED_BONUS;
    const maxSpeed = CONFIG.MOVE_MAX_SPEED * this.speedScale * sizeFactor * 0.95 * formSpeed * this.underdogSpeed * this.eventSlow;

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
    // v6 §7: soft-bounce boundary
    const m = CONFIG.MAP_SIZE;
    if (this.x < this.radius) { this.x = this.radius; this.vx = Math.abs(this.vx) * 0.4; }
    else if (this.x > m - this.radius) { this.x = m - this.radius; this.vx = -Math.abs(this.vx) * 0.4; }
    if (this.y < this.radius) { this.y = this.radius; this.vy = Math.abs(this.vy) * 0.4; }
    else if (this.y > m - this.radius) { this.y = m - this.radius; this.vy = -Math.abs(this.vy) * 0.4; }

    if (this.ghostTime > 0) this.ghostTime -= dt;

    // v6 §6: bot brain timers — sated countdown + anti-idle detection
    if (this.satedTime > 0) this.satedTime -= dt;
    if (this.voidSatedMs > 0) this.voidSatedMs -= dt; // v13 §0: void-sated cooldown
    this.timeSinceEat += dt;
    this.idleTimer += dt;
    if (this.idleTimer >= CONFIG.BOT_ANTIIDLE_MS) {
      // v7 §1: anti-idle triggers on MOVEMENT alone — a giant vacuuming in place
      // is idle even while eating, so it gets force-relocated to a far cluster.
      const moved = dist(this.x, this.y, this.idleAnchorX, this.idleAnchorY);
      if (moved < CONFIG.BOT_ANTIIDLE_DIST) this.forceRetarget = true;
      this.idleTimer = 0;
      this.idleAnchorX = this.x;
      this.idleAnchorY = this.y;
    }

    // anim
    this.breathePhase += dt;
    this.wobblePhase += dt * 0.009;
    const spd = Math.hypot(this.vx, this.vy);
    // Alive Pack §2: squash & stretch — 7% max (was 13%)
    const stretch = clamp(spd / CONFIG.MOVE_MAX_SPEED, 0, 1) * 0.07;
    // Alive Pack §4: move bob
    this.bobOffset = spd > 22 ? Math.sin(this.breathePhase * 0.006) * this.radius * 0.026 : 0;
    // Alive Pack §5: decay chomp squash
    if (this.chompSquashT > 0) this.chompSquashT = Math.max(0, this.chompSquashT - dt);
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
    const scoreGain = Math.round(obj.size * 1.3 * (obj.golden ? CONFIG.GOLDEN_SCORE_MULT : 1) * (obj.kind === 'drone' ? CONFIG.DRONE_SCORE_MULT : 1));
    // v15 §0: orbit parity — deferred 1.6–2.0s before growth, identical to player
    this.captureObject(obj.size, scoreGain);
    this.chompV = 1;
    this.chompSquashT = 80; // Alive Pack §5: eat-chomp squash
    this.satedTime = CONFIG.BOT_SATED_MS;
    this.timeSinceEat = 0;
    // advanceForms() is called inside tickCaptures when the item finalizes
  }

  eatVoid(radius: number) {
    this.score += 400;
    this.absorbVoidMass(radius); // v9 §1: shared growth curve + size cap
    this.chompV = 1;
    this.satedTime = CONFIG.BOT_SATED_MS;
    this.timeSinceEat = 0;
    this.advanceForms();
  }

  // v13 §0: bot-on-bot eat — 25% mass (vs 50% for player-involved), 10s void-sated cooldown
  eatVoidBotOnBot(radius: number) {
    this.score += 200;
    this.absorbVoidMassBotOnBot(radius); // 25% area transfer
    console.debug(`[bot-chomp] ${this.name} ate void r=${radius.toFixed(1)} → gained 25% area, r=${this.radius.toFixed(1)} (SATED 10s)`);
    this.chompV = 1;
    this.satedTime = CONFIG.BOT_SATED_MS;
    this.voidSatedMs = 10000; // 10s void-sated
    this.timeSinceEat = 0;
    this.advanceForms();
  }

  // Respawn small elsewhere, briefly ghosted; keep cumulative score.
  // If still bigger than the avoid point's threat, respawn far away.
  getEaten(avoidX?: number, avoidY?: number, minDist = 0) {
    const m = CONFIG.MAP_SIZE;
    // v6 §3: being chomped can't demote below a form already reached
    this.shrinkOnEaten();
    // Alive Pack §A: retry until the respawn point is both far enough and on the island
    let nx = 200 + Math.random() * (m - 400);
    let ny = 200 + Math.random() * (m - 400);
    const needsDist = avoidX !== undefined && avoidY !== undefined && minDist > 0;
    for (let i = 0; i < 30; i++) {
      const farEnough = !needsDist || dist(nx, ny, avoidX!, avoidY!) >= minDist;
      if (farEnough && isWalkable(nx, ny)) break;
      nx = 200 + Math.random() * (m - 400);
      ny = 200 + Math.random() * (m - 400);
    }
    this.x = this.prevX = nx;
    this.y = this.prevY = ny;
    this.vx = this.vy = 0;
    this.ghostTime = CONFIG.GHOST_TIME;
  }

  draw(ctx: CanvasRenderingContext2D, t: number, alpha: number) {
    const rx = lerp(this.prevX, this.x, alpha);
    const ry = lerp(this.prevY, this.y, alpha);

    // Family arc: sky-fall on arrival — the body drops in with a growing ground
    // shadow, then a dust ring + pebbles on touchdown (shared with the player's).
    const e = this.arrived ? this.arrivalE : 1e9;
    const drop = arrivalOffsetY(e, this.radius);
    const airborne = drop > 0.5;
    if (airborne) arrivalDrawShadow(ctx, rx, ry, this.radius, e);

    if (!airborne) {
      if (this.underdog && !this.ghost) drawUnderdogTrail(ctx, rx, ry, this.vx, this.vy, this.radius);
      // Alive Pack §7: trailing sparkle for GOBBLER+ rivals (form ≥ 2)
      if (this.formIndex >= 2) drawSparkleTrail(ctx, rx, ry, this.vx, this.vy, this.radius, t);
    }
    // Overnight: DANGER RING — a pulsing red halo under any rival currently
    // big enough to devour the player. You always see death coming.
    if (this.threatToPlayer && !airborne && !this.ghost) {
      const pulse = 0.55 + Math.sin(t / 160) * 0.25;
      ctx.save();
      ctx.strokeStyle = `rgba(255,60,80,${pulse.toFixed(2)})`;
      ctx.lineWidth = Math.max(3, this.radius * 0.07);
      ctx.beginPath();
      ctx.arc(rx, ry, this.radius * 1.18, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([14, 10]);
      ctx.strokeStyle = `rgba(255,120,130,${(pulse * 0.7).toFixed(2)})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(rx, ry, this.radius * 1.3, t / 900, t / 900 + Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Alive Pack §5: eat-chomp squash — starts at 0.85, springs to 1.0 over 80 ms
    const chompSquash = this.chompSquashT > 0 ? 1.0 - 0.15 * (this.chompSquashT / 80) : 1.0;
    drawVoidling(ctx, rx, ry + this.bobOffset - drop, {
      r: this.radius,
      skin: this.skin,
      t,
      lookX: clamp(this.lookX, -1, 1),
      lookY: clamp(this.lookY, -1, 1),
      open: this.mouth,
      chomp: this.chompV,
      blink: this.blinkVal,
      wobbleX: this.wobbleX,
      wobbleY: this.wobbleY * chompSquash,
      lean: clamp(this.vx / CONFIG.MOVE_MAX_SPEED, -1, 1) * 0.14, // Alive Pack §1: 8° lean
      glow: 0.15,
      breathe: 1 + Math.sin(this.breathePhase * 0.002) * 0.02,
      ghost: this.ghost,
      form: this.formIndex,
      morph: this.morph,
    });
    arrivalDrawFX(ctx, rx, ry, this.radius, e);
    this.drawTag(ctx, rx, ry - drop);
    if (this.bubbleT > 0 && this.bubbleText) {
      this.drawBark(ctx, rx, ry - drop - this.radius - 34);
    }
  }

  private drawTag(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
    const label = `${this.name} · ${this.relation}`;
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

  /** Speech bubble — arrival bark + ongoing family banter (fades in the last 500ms).
   *  Sized inversely to camera zoom so it reads at constant SCREEN size. */
  private drawBark(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
    const fade = clamp(this.bubbleT / 500, 0, 1);
    ctx.save();
    ctx.globalAlpha = fade;
    const zm = ctx.getTransform().a / Math.min((typeof window !== 'undefined' && window.devicePixelRatio) || 1, 2);
    const fs = clamp(15 / Math.max(0.2, zm), 13, 34);
    ctx.font = `800 ${fs.toFixed(1)}px Nunito, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const w = ctx.measureText(this.bubbleText).width + fs * 1.4;
    const h = fs * 1.8;
    ctx.fillStyle = 'rgba(255,255,255,0.97)';
    ctx.strokeStyle = 'rgba(26,16,64,0.30)';
    ctx.lineWidth = 2;
    roundRect(ctx, cx - w / 2, cy - h / 2, w, h, h * 0.45);
    ctx.fill();
    ctx.stroke();
    // little tail
    ctx.beginPath();
    ctx.moveTo(cx - fs * 0.35, cy + h / 2 - 1);
    ctx.lineTo(cx + fs * 0.35, cy + h / 2 - 1);
    ctx.lineTo(cx, cy + h / 2 + fs * 0.55);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#2A1445';
    ctx.fillText(this.bubbleText, cx, cy);
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

// v9 §2: five bot archetypes, one assigned per bot and randomized each round.
export type Archetype = 'TIMID' | 'GREEDY' | 'HUNTER' | 'WANDERER' | 'BULLY';
export const ARCHETYPES: Archetype[] = ['TIMID', 'GREEDY', 'HUNTER', 'WANDERER', 'BULLY'];

interface Personality {
  fleeThreat: number;    // flee from a void >= rival.radius * this
  fleeRange: number;     // flee-detection distance multiplier
  huntAggroMin: number;  // aggression required before it will hunt voids
  huntAdvantage: number; // must out-size a void by this ratio to hunt it
  goldenBias: number;    // graze weighting toward golden snacks
  grazeRange: number;    // only graze within radius*this (Infinity = anywhere in sight)
  homeBias: number;      // -1 hugs the edges, +1 camps the centre, 0 neutral
}

// TIMID grazes edges & flees early; GREEDY chases gold & ignores danger; HUNTER
// stalks smaller voids; WANDERER patrols & eats opportunistically; BULLY camps
// mid-map and only hunts when clearly bigger.
const PERSONALITIES: Record<Archetype, Personality> = {
  TIMID:    { fleeThreat: 1.02, fleeRange: 1.7,  huntAggroMin: 0.95, huntAdvantage: 1.6,  goldenBias: 1,   grazeRange: Infinity, homeBias: -1 },
  GREEDY:   { fleeThreat: 1.6,  fleeRange: 0.6,  huntAggroMin: 0.7,  huntAdvantage: 1.15, goldenBias: 6,   grazeRange: Infinity, homeBias: 0 },
  HUNTER:   { fleeThreat: 1.12, fleeRange: 1.0,  huntAggroMin: 0.3,  huntAdvantage: 1.12, goldenBias: 1,   grazeRange: Infinity, homeBias: 0 },
  WANDERER: { fleeThreat: 1.15, fleeRange: 1.0,  huntAggroMin: 0.6,  huntAdvantage: 1.25, goldenBias: 1,   grazeRange: 6,        homeBias: 0 },
  BULLY:    { fleeThreat: 1.3,  fleeRange: 0.85, huntAggroMin: 0.5,  huntAdvantage: 1.45, goldenBias: 1.5, grazeRange: Infinity, homeBias: 1 },
};

// ── Bot brain: GRAZE / HUNT / FLEE with a time-based aggression curve ──────────
// Aggression is 0 for the first AGGRO_START_MS, then ramps linearly to 1.0 by
// AGGRO_FULL_MS. Bots may only graze until aggression >= huntAggroMin; only then
// may they HUNT (target other voids). v9 §2: perception is limited to
// BOT_PERCEPTION (no global map knowledge), targeting carries a re-corrected aim
// error, and 30% of retargets fumble to the 2nd-best pick.
export class BotController implements RivalController {
  kind = 'bot';
  state: 'GRAZE' | 'HUNT' | 'FLEE' = 'GRAZE';
  readonly arch: Archetype;
  private p: Personality;
  private decisionTimer = 0;
  private reactionDelay: number;
  private tx = 0; private ty = 0;
  private hasTarget = false;
  private roamAngle = Math.random() * Math.PI * 2;
  private roamTimer = 0;
  private bias: number;   // personality bias on target scoring
  private relocating = false;   // v7 §1: committed march to a far random point
  private aimError = 0;   // v9 §2: current ±aim error (radians)
  private aimTimer = 0;   // v9 §2: countdown to re-roll the aim error

  constructor(reactionDelay = 240, bias = 1, arch: Archetype = 'HUNTER') {
    this.reactionDelay = reactionDelay;
    this.bias = bias;
    this.arch = arch;
    this.p = PERSONALITIES[arch];
  }

  private aggressionFrom(elapsed: number) {
    // War Pack §2: spike to max aggression in final 60s
    if (elapsed >= CONFIG.GAME_DURATION * 1000 - 60000) return 1.0;
    return clamp((elapsed - CONFIG.AGGRO_START_MS) / (CONFIG.AGGRO_FULL_MS - CONFIG.AGGRO_START_MS), 0, 1);
  }

  // v9 §2: re-roll a fresh ±BOT_AIM_ERROR_DEG aim error every 300–600ms
  private updateAim(dt: number) {
    this.aimTimer -= dt;
    if (this.aimTimer <= 0) {
      this.aimTimer = 300 + Math.random() * 300;
      this.aimError = (Math.random() * 2 - 1) * (CONFIG.BOT_AIM_ERROR_DEG * Math.PI / 180);
    }
  }

  // v9 §2: rotate a targeting intent by the current aim error (survival/flee is exact)
  private aim(intent: Intent): Intent {
    if (!this.aimError) return intent;
    const a = Math.atan2(intent.dirY, intent.dirX) + this.aimError;
    return { dirX: Math.cos(a), dirY: Math.sin(a), mag: intent.mag };
  }

  think(rival: Rival, view: WorldView, dt: number): Intent {
    const aggression = this.aggressionFrom(view.elapsed);
    this.updateAim(dt);
    const perceive = CONFIG.BOT_PERCEPTION; // v9 §2: limited sight, no global map knowledge

    // v7 §1: anti-idle — a stuck bot commits to marching to a far random point
    if (rival.forceRetarget) {
      rival.forceRetarget = false;
      this.pickRelocate(rival, view);
    }

    // FLEE is always evaluated (survival first) — within sight only
    let threat: VoidView | null = null;
    let threatD = Infinity;
    for (const v of view.voids) {
      if (v.radius >= rival.radius * this.p.fleeThreat) {
        const d = dist(rival.x, rival.y, v.x, v.y);
        if (d < perceive && d < rival.radius * 7 * this.p.fleeRange + 100 && d < threatD) { threatD = d; threat = v; }
      }
    }
    if (threat) {
      this.state = 'FLEE';
      this.relocating = false;
      const a = Math.atan2(rival.y - threat.y, rival.x - threat.x);
      return this.avoidWalls(rival, { dirX: Math.cos(a), dirY: Math.sin(a), mag: 1 });
    }

    // v7 §4: react to world events — bolt away from a shrink storm / firetrucks
    // that are hunting me this frame.
    if (rival.eventFlee) {
      this.state = 'FLEE';
      this.relocating = false;
      const a = Math.atan2(rival.y - rival.eventFlee.y, rival.x - rival.eventFlee.x);
      return this.avoidWalls(rival, { dirX: Math.cos(a), dirY: Math.sin(a), mag: 1 });
    }

    // v7 §1: while relocating, march to the point until we arrive (with aim wobble)
    if (this.relocating) {
      const dd = dist(rival.x, rival.y, this.tx, this.ty);
      if (dd < 180) { this.relocating = false; this.hasTarget = false; this.decisionTimer = 0; }
      else {
        this.state = 'HUNT';
        const dx = this.tx - rival.x, dy = this.ty - rival.y, d = Math.hypot(dx, dy) || 1;
        return this.avoidWalls(rival, this.aim({ dirX: dx / d, dirY: dy / d, mag: 1 }));
      }
    }

    // HUNT / GRAZE targets refresh on a reaction delay
    this.decisionTimer -= dt;
    if (this.decisionTimer <= 0 || !this.hasTarget) {
      this.decisionTimer = this.reactionDelay + Math.random() * 120;
      // v6 §6: SATED bots graze only — no hunting for a beat after a meal
      this.pickTarget(rival, view, rival.satedTime > 0 ? 0 : aggression, perceive);
    }

    if (!this.hasTarget) {
      // roam — homeBias steers TIMID toward edges and BULLY toward the centre
      this.state = 'GRAZE';
      this.roamTimer -= dt;
      if (this.roamTimer <= 0) {
        this.roamAngle += (Math.random() - 0.5) * 1.6;
        this.roamTimer = 1200 + Math.random() * 1200;
      }
      let rdx = Math.cos(this.roamAngle), rdy = Math.sin(this.roamAngle);
      if (this.p.homeBias !== 0) {
        let hx = view.map / 2 - rival.x, hy = view.map / 2 - rival.y;
        const hd = Math.hypot(hx, hy) || 1;
        const w = 0.5 * this.p.homeBias; // + toward centre, - toward edge
        rdx += (hx / hd) * w; rdy += (hy / hd) * w;
        const rd = Math.hypot(rdx, rdy) || 1; rdx /= rd; rdy /= rd;
      }
      return this.avoidWalls(rival, this.aim({ dirX: rdx, dirY: rdy, mag: 0.55 }));
    }

    const dx = this.tx - rival.x;
    const dy = this.ty - rival.y;
    const d = Math.hypot(dx, dy) || 1;
    return this.avoidWalls(rival, this.aim({ dirX: dx / d, dirY: dy / d, mag: this.state === 'HUNT' ? 1 : 0.85 }));
  }

  // v6 §6: blend in a repulsion vector when within BOT_WALL_MARGIN of an edge.
  // Phase 2: also avoids island edge by sampling ahead of current travel direction.
  private avoidWalls(rival: Rival, intent: Intent): Intent {
    const m = CONFIG.MAP_SIZE;
    const marg = CONFIG.BOT_WALL_MARGIN;
    let rx = 0, ry = 0;
    if (rival.x < marg) rx += (marg - rival.x) / marg;
    if (rival.x > m - marg) rx -= (marg - (m - rival.x)) / marg;
    if (rival.y < marg) ry += (marg - rival.y) / marg;
    if (rival.y > m - marg) ry -= (marg - (m - rival.y)) / marg;

    // Phase 2: sample 350px ahead in direction of travel; if off-island, push toward center
    const aheadX = rival.x + intent.dirX * 350;
    const aheadY = rival.y + intent.dirY * 350;
    if (!isWalkable(aheadX, aheadY) || !isWalkable(rival.x, rival.y)) {
      const cx = m / 2, cy = m / 2;
      const ddx = cx - rival.x, ddy = cy - rival.y;
      const dd = Math.hypot(ddx, ddy) || 1;
      rx += (ddx / dd) * 1.8;
      ry += (ddy / dd) * 1.8;
    }

    if (rx === 0 && ry === 0) return intent;
    let dx = intent.dirX * intent.mag + rx * CONFIG.BOT_WALL_FORCE;
    let dy = intent.dirY * intent.mag + ry * CONFIG.BOT_WALL_FORCE;
    const d = Math.hypot(dx, dy) || 1;
    return { dirX: dx / d, dirY: dy / d, mag: Math.min(1, Math.max(intent.mag, Math.hypot(rx, ry))) };
  }

  // v9 §2: anti-idle without global map knowledge — commit to a far random point.
  private pickRelocate(rival: Rival, view: WorldView) {
    const m = view.map, margin = 300;
    let bx = 0, by = 0, bd = -1;
    for (let i = 0; i < 5; i++) {
      const x = margin + Math.random() * (m - margin * 2);
      const y = margin + Math.random() * (m - margin * 2);
      const d = dist(rival.x, rival.y, x, y);
      if (d > bd) { bd = d; bx = x; by = y; }
    }
    this.tx = bx; this.ty = by;
    this.relocating = true;
    this.hasTarget = true;
    this.state = 'HUNT';
  }

  private pickTarget(rival: Rival, view: WorldView, aggression: number, perceive: number) {
    this.hasTarget = false;

    // Hunt: smaller voids to devour — only once aggression has ramped past the
    // archetype's threshold. Tracks best + 2nd-best so mistakes can fumble.
    if (aggression >= this.p.huntAggroMin) {
      let best = Infinity, second = Infinity;
      let bx = 0, by = 0, sx = 0, sy = 0, found = false, foundS = false;
      for (const v of view.voids) {
        if (rival.radius >= v.radius * this.p.huntAdvantage) {
          const d = dist(rival.x, rival.y, v.x, v.y);
          if (d > perceive || d > rival.radius * 9) continue;
          const score = d / (this.bias * Math.max(0.001, aggression));
          if (score < best) { second = best; sx = bx; sy = by; foundS = found; best = score; bx = v.x; by = v.y; found = true; }
          else if (score < second) { second = score; sx = v.x; sy = v.y; foundS = true; }
        }
      }
      if (found) {
        // v9 §2: 30% of the time, fumble to the 2nd-best pick (if any)
        if (foundS && Math.random() < 0.3) { this.tx = sx; this.ty = sy; }
        else { this.tx = bx; this.ty = by; }
        this.hasTarget = true; this.state = 'HUNT';
        return;
      }
    }

    // Graze: nearest edible object, biased toward bigger (juicier) & golden ones.
    let best = Infinity, second = Infinity;
    let bx = 0, by = 0, sx = 0, sy = 0, found = false, foundS = false;
    for (const o of view.objects) {
      if (o.eaten) continue;
      if (rival.radius < o.size * CONFIG.EAT_RATIO) continue;
      const d = dist(rival.x, rival.y, o.x, o.y);
      if (d > perceive) continue;
      if (d > rival.radius * this.p.grazeRange) continue; // WANDERER only grabs close snacks
      const score = d - o.size * 4 - (o.golden ? this.p.goldenBias * 300 : 0);
      if (score < best) { second = best; sx = bx; sy = by; foundS = found; best = score; bx = o.x; by = o.y; found = true; }
      else if (score < second) { second = score; sx = o.x; sy = o.y; foundS = true; }
    }
    if (found) {
      if (foundS && Math.random() < 0.3) { this.tx = sx; this.ty = sy; }
      else { this.tx = bx; this.ty = by; }
      this.hasTarget = true; this.state = 'GRAZE';
    }
  }
}

// v16 §0: Rubber-band pacing controller — wraps BotController and throttles
// captures when the bot is too far ahead of its rank-based target score.
// Bots still visibly hunt, flee, and cast spells; only absorb frequency is
// reduced (via movement-speed damping) when comfortably ahead.
class PacingController implements RivalController {
  kind = 'bot';
  private inner: BotController;
  private readonly baseFrac: number;   // e.g. 1.15 for rank-0 bot
  private noise = 0;
  private noiseTimer = 0;

  constructor(inner: BotController, rankFrac: number) {
    this.inner = inner;
    this.baseFrac = rankFrac;
    this.noise = (Math.random() * 2 - 1) * CONFIG.PACER_NOISE;
    this.noiseTimer = CONFIG.PACER_RETARGET_MS * Math.random(); // stagger first re-roll
  }

  think(rival: Rival, view: WorldView, dt: number): Intent {
    // Re-roll ±10% noise every 20 s
    this.noiseTimer -= dt;
    if (this.noiseTimer <= 0) {
      this.noiseTimer = CONFIG.PACER_RETARGET_MS;
      this.noise = (Math.random() * 2 - 1) * CONFIG.PACER_NOISE;
    }
    const intent = this.inner.think(rival, view, dt);
    // Only throttle after the first 15 s (warmup) and only when grazing objects
    if (view.elapsed < 15000 || this.inner.state === 'FLEE' || this.inner.state === 'HUNT') {
      return intent;
    }
    const target = view.playerScore * (this.baseFrac + this.noise);
    if (rival.score > target * 1.08) {
      // Too far ahead — drift at 30% effort so the player can catch up visibly
      return { ...intent, mag: intent.mag * 0.30 };
    }
    if (rival.score < target * 0.75) {
      // Behind target — allowed to push slightly faster than normal
      return { ...intent, mag: Math.min(1, intent.mag * 1.15) };
    }
    return intent;
  }
}

export function makeRivals(): Rival[] {
  const names = shuffle(CONFIG.BOT_NAMES).slice(0, CONFIG.RIVAL_COUNT);
  const relations = shuffle(CONFIG.FAMILY_RELATIONS).slice(0, CONFIG.RIVAL_COUNT);
  // v9 §2: one archetype per bot, shuffled so name↔personality randomize each round
  const arches = shuffle(ARCHETYPES);

  // v7 §8: bots wear real SHOP skins (accessories render automatically), drawn
  // without replacement and weighted 2× toward skins the player does NOT own.
  const owned = new Set(meta.data.skinsOwned);
  const pool: SkinDef[] = [];
  for (const s of CONFIG.SKINS) {
    const weight = owned.has(s.id) ? 1 : 2;
    for (let k = 0; k < weight; k++) pool.push(s);
  }
  const chosen: SkinDef[] = [];
  const usedIds = new Set<string>();
  while (chosen.length < CONFIG.RIVAL_COUNT && pool.length) {
    const s = pool[Math.floor(Math.random() * pool.length)];
    if (!usedIds.has(s.id)) { usedIds.add(s.id); chosen.push(s); }
    for (let k = pool.length - 1; k >= 0; k--) if (pool[k].id === s.id) pool.splice(k, 1);
  }

  // v16 §0: rank targets [115%, 95%, 80%, 60%] shuffled so personality stays random
  const pacerTargets = shuffle([...CONFIG.PACER_TARGETS]);

  const rivals: Rival[] = [];
  for (let i = 0; i < CONFIG.RIVAL_COUNT; i++) {
    const base = chosen[i % Math.max(1, chosen.length)] || CONFIG.SKINS[0];
    const skin: SkinDef = { ...base, id: `bot_${i}_${base.id}` };
    const reaction = 180 + Math.random() * 260;
    const bias = 0.7 + Math.random() * 0.8;
    const speedScale = 0.9 + Math.random() * 0.2;
    const arch = arches[i % arches.length];
    const inner = new BotController(reaction, bias, arch);
    const pacer = new PacingController(inner, pacerTargets[i % pacerTargets.length]);
    const r = new Rival(names[i], relations[i % relations.length], skin, pacer, speedScale);
    r.wearsUnownedSkin = !owned.has(base.id);
    r.shopSkinId = base.id;
    r.shopSkinName = base.name;
    rivals.push(r);
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
