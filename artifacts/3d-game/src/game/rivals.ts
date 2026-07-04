import { CONFIG, type SkinDef } from './config';
import { meta } from './meta';
import { clamp, lerp, dist, growRadius } from './utils';
import { drawVoidling, drawUnderdogTrail } from './voidling';
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

  // v6 §2/§3: catch-up + evolution
  underdogSpeed = 1;
  underdogGrowth = 1;
  underdog = false;
  eventSlow = 1;          // v6 §5: event slow (firetruck water), reset each frame
  eventFlee: { x: number; y: number } | null = null; // v7 §4: hazard to run from
  reachedForm = 0;
  // v7 §8: which shop skin this bot is showing off this round
  wearsUnownedSkin = false;
  shopSkinId = '';
  shopSkinName = '';
  // v6 §6: bot brain timers
  satedTime = 0;          // grazes only while > 0 (SATED after a meal)
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
    // v6 §2/§3: form speed bonus (+8% each, stacking) + underdog boost
    const formSpeed = 1 + this.reachedForm * CONFIG.FORM_SPEED_BONUS;
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
    this.score += Math.round(obj.size * 1.3 * (obj.golden ? CONFIG.GOLDEN_SCORE_MULT : 1) * (obj.kind === 'drone' ? CONFIG.DRONE_SCORE_MULT : 1));
    this.radius = growRadius(this.radius, Math.PI * obj.size * obj.size * 0.5 * this.underdogGrowth, CONFIG.DIMINISH_BASE, CONFIG.MAX_RADIUS);
    this.chompV = 1;
    this.satedTime = CONFIG.BOT_SATED_MS;
    this.timeSinceEat = 0;
    this.updateForm();
  }

  eatVoid(radius: number) {
    this.score += 400;
    this.radius = growRadius(this.radius, Math.PI * radius * radius * 0.5 * this.underdogGrowth, CONFIG.DIMINISH_BASE, CONFIG.MAX_RADIUS);
    this.chompV = 1;
    this.satedTime = CONFIG.BOT_SATED_MS;
    this.timeSinceEat = 0;
    this.updateForm();
  }

  // v6 §3: promote through the form ladder (rivals evolve too)
  private updateForm() {
    while (this.reachedForm < CONFIG.FORMS.length - 1 && this.radius >= CONFIG.FORMS[this.reachedForm + 1].radius) {
      this.reachedForm++;
    }
  }

  get formFloor() {
    return Math.max(CONFIG.PLAYER_BASE_RADIUS, CONFIG.FORMS[this.reachedForm].radius);
  }

  // Respawn small elsewhere, briefly ghosted; keep cumulative score.
  // If still bigger than the avoid point's threat, respawn far away.
  getEaten(avoidX?: number, avoidY?: number, minDist = 0) {
    const m = CONFIG.MAP_SIZE;
    // v6 §3: being chomped can't demote below a form already reached
    this.radius = Math.max(this.formFloor, this.radius * CONFIG.RESPAWN_MASS_FRAC);
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
    if (this.underdog && !this.ghost) drawUnderdogTrail(ctx, rx, ry, this.vx, this.vy, this.radius);
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
      form: this.reachedForm,
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
  private relocating = false;   // v7 §1: committed march to a far dense cluster

  constructor(reactionDelay = 240, bias = 1) {
    this.reactionDelay = reactionDelay;
    this.bias = bias;
  }

  private aggressionFrom(elapsed: number) {
    return clamp((elapsed - CONFIG.AGGRO_START_MS) / (CONFIG.AGGRO_FULL_MS - CONFIG.AGGRO_START_MS), 0, 1);
  }

  think(rival: Rival, view: WorldView, dt: number): Intent {
    const aggression = this.aggressionFrom(view.elapsed);

    // v7 §1: anti-idle — a stuck bot commits to marching at a far dense cluster
    if (rival.forceRetarget) {
      rival.forceRetarget = false;
      this.pickRelocate(rival, view);
    }

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

    // v7 §1: while relocating, march straight to the cluster until we arrive
    if (this.relocating) {
      const dd = dist(rival.x, rival.y, this.tx, this.ty);
      if (dd < 180) { this.relocating = false; this.hasTarget = false; this.decisionTimer = 0; }
      else {
        this.state = 'HUNT';
        const dx = this.tx - rival.x, dy = this.ty - rival.y, d = Math.hypot(dx, dy) || 1;
        return this.avoidWalls(rival, { dirX: dx / d, dirY: dy / d, mag: 1 });
      }
    }

    // HUNT / GRAZE targets refresh on a reaction delay
    this.decisionTimer -= dt;
    if (this.decisionTimer <= 0 || !this.hasTarget) {
      this.decisionTimer = this.reactionDelay + Math.random() * 120;
      // v6 §6: SATED bots graze only — no hunting for a beat after a meal
      this.pickTarget(rival, view, rival.satedTime > 0 ? 0 : aggression);
    }

    if (!this.hasTarget) {
      // roam
      this.state = 'GRAZE';
      this.roamTimer -= dt;
      if (this.roamTimer <= 0) {
        this.roamAngle += (Math.random() - 0.5) * 1.6;
        this.roamTimer = 1200 + Math.random() * 1200;
      }
      return this.avoidWalls(rival, { dirX: Math.cos(this.roamAngle), dirY: Math.sin(this.roamAngle), mag: 0.55 });
    }

    const dx = this.tx - rival.x;
    const dy = this.ty - rival.y;
    const d = Math.hypot(dx, dy) || 1;
    return this.avoidWalls(rival, { dirX: dx / d, dirY: dy / d, mag: this.state === 'HUNT' ? 1 : 0.85 });
  }

  // v6 §6: blend in a repulsion vector when within BOT_WALL_MARGIN of an edge.
  private avoidWalls(rival: Rival, intent: Intent): Intent {
    const m = CONFIG.MAP_SIZE;
    const marg = CONFIG.BOT_WALL_MARGIN;
    let rx = 0, ry = 0;
    if (rival.x < marg) rx += (marg - rival.x) / marg;
    if (rival.x > m - marg) rx -= (marg - (m - rival.x)) / marg;
    if (rival.y < marg) ry += (marg - rival.y) / marg;
    if (rival.y > m - marg) ry -= (marg - (m - rival.y)) / marg;
    if (rx === 0 && ry === 0) return intent;
    let dx = intent.dirX * intent.mag + rx * CONFIG.BOT_WALL_FORCE;
    let dy = intent.dirY * intent.mag + ry * CONFIG.BOT_WALL_FORCE;
    const d = Math.hypot(dx, dy) || 1;
    return { dirX: dx / d, dirY: dy / d, mag: Math.min(1, Math.max(intent.mag, Math.hypot(rx, ry))) };
  }

  // v7 §1: find the farthest DENSE cluster of edibles and commit to marching there.
  private pickRelocate(rival: Rival, view: WorldView) {
    const cell = 400;
    const buckets = new Map<string, { n: number; sx: number; sy: number }>();
    for (const o of view.objects) {
      if (o.eaten) continue;
      if (rival.radius < o.size * CONFIG.EAT_RATIO) continue; // only edible clusters
      const cx = Math.floor(o.x / cell), cy = Math.floor(o.y / cell);
      const key = `${cx},${cy}`;
      const b = buckets.get(key) || { n: 0, sx: 0, sy: 0 };
      b.n++; b.sx += o.x; b.sy += o.y;
      buckets.set(key, b);
    }
    let best = -Infinity, bx = 0, by = 0, found = false;
    for (const b of buckets.values()) {
      const cx = b.sx / b.n, cy = b.sy / b.n;
      const d = dist(rival.x, rival.y, cx, cy);
      const score = b.n * (d + 200); // dense AND far
      if (score > best) { best = score; bx = cx; by = cy; found = true; }
    }
    if (!found) {
      // no edible clusters — head to the opposite corner
      bx = rival.x < view.map / 2 ? view.map - 300 : 300;
      by = rival.y < view.map / 2 ? view.map - 300 : 300;
    }
    this.tx = bx; this.ty = by;
    this.relocating = true;
    this.hasTarget = true;
    this.state = 'HUNT';
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

  // v7 §8: bots wear real SHOP skins (accessories render automatically), drawn
  // without replacement and weighted 3× toward skins the player does NOT own —
  // a moving billboard for the store.
  const owned = new Set(meta.data.skinsOwned);
  const pool: SkinDef[] = [];
  for (const s of CONFIG.SKINS) {
    const weight = owned.has(s.id) ? 1 : 3;
    for (let k = 0; k < weight; k++) pool.push(s);
  }
  const chosen: SkinDef[] = [];
  const usedIds = new Set<string>();
  while (chosen.length < CONFIG.RIVAL_COUNT && pool.length) {
    const s = pool[Math.floor(Math.random() * pool.length)];
    if (!usedIds.has(s.id)) { usedIds.add(s.id); chosen.push(s); }
    for (let k = pool.length - 1; k >= 0; k--) if (pool[k].id === s.id) pool.splice(k, 1);
  }

  const rivals: Rival[] = [];
  for (let i = 0; i < CONFIG.RIVAL_COUNT; i++) {
    const base = chosen[i % Math.max(1, chosen.length)] || CONFIG.SKINS[0];
    const skin: SkinDef = { ...base, id: `bot_${i}_${base.id}` }; // unique id, same look
    const reaction = 180 + Math.random() * 260;
    const bias = 0.7 + Math.random() * 0.8;
    const speedScale = 0.9 + Math.random() * 0.2;
    const r = new Rival(names[i], countries[i], skin, new BotController(reaction, bias), speedScale);
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
