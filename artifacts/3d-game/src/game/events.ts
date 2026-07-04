import { CONFIG } from './config';
import { dist, clamp } from './utils';
import { audio } from './audio';
import type { Player } from './player';
import type { Rival } from './rivals';
import type { WorldManager } from './world';
import type { FXManager } from './fx';

// v6 §5: WORLD EVENTS — timed hazards/boons with a 2s warning + horn each.
//  • GOLDEN RUSH   @2:05  (10s)  — a flurry of golden objects
//  • SHRINK STORM  @1:10  (12s)  — a cloud hunts #1, shaving mass on touch
//  • TOWN FIGHTS BACK       — on any WORLD EATER: 2 firetrucks spray & slow it
// Bots react naturally: golden objects are bigger, so grazers prefer them.

type Void = Player | Rival;

export interface EventDeps {
  getWorld: () => WorldManager;
  fx: FXManager;
  getPlayer: () => Player;
  getRivals: () => Rival[];
  banner: (text: string, color: string, priority?: number) => void;
}

interface Truck { x: number; y: number; until: number; kind: 'fire' | 'police'; }
interface Meteor { x: number; y: number; vy: number; groundY: number; }
interface Strike { x: number; y: number; age: number; struck: boolean; } // v9 §5: telegraphed lightning

// v8 §7: the four schedulable events (TOWN FIGHTS BACK stays trigger-based)
type EventId = 'goldenRush' | 'shrinkStorm' | 'meteor' | 'frenzy';

export class EventManager {
  private warned = new Set<string>();
  private fired = new Set<string>();
  private goldenRushUntil = 0;
  private goldenRushTimer = 0;
  private storm: { x: number; y: number; until: number; hitCd: number; target: Void } | null = null;
  private trucks: Truck[] = [];
  private truckTarget: Void | null = null;
  private truckCd = 0;
  private sprayTimer = 0;      // v9 §5: accumulated spray time toward the next 2s drain tick
  private sprayDrained = 0;    // v9 §5: total mass drained this assault (cap −15%)
  private sirenCd = 0;         // v9 §5: siren wail cadence
  private strikes: Strike[] = []; // v9 §5: SHRINK STORM lightning strikes
  private strikeTimer = 0;
  private strikeCount = 0;     // v9 §5: total strikes fired this storm (hard cap 3)
  // v8 §7
  private meteors: Meteor[] = [];
  private meteorUntil = 0;
  private meteorTimer = 0;
  private frenzyUntil = 0;
  private frenzyOn = false;
  private stormLastTarget: Void | null = null; // never targeted twice in a row
  private slotA: EventId = 'goldenRush';
  private slotB: EventId = 'shrinkStorm';
  private prevPair = '';                         // no identical pair two rounds running

  constructor(private deps: EventDeps) {}

  get frenzyActive() { return this.frenzyOn; }
  get stormActive() { return this.storm !== null; }         // v9 §5: engine dims 8% during storm
  get meteorActive() { return this.meteors.length > 0 || this.meteorUntil > 0; } // warm tint

  reset() {
    this.warned.clear();
    this.fired.clear();
    this.goldenRushUntil = 0;
    this.goldenRushTimer = 0;
    this.storm = null;
    this.trucks = [];
    this.truckTarget = null;
    this.truckCd = 0;
    this.sprayTimer = 0;
    this.sprayDrained = 0;
    this.sirenCd = 0;
    this.strikes = [];
    this.strikeTimer = 0;
    this.strikeCount = 0;
    this.meteors = [];
    this.meteorUntil = 0;
    this.meteorTimer = 0;
    this.frenzyUntil = 0;
    this.frenzyOn = false;
    this.pickEvents();
  }

  // v8 §7: draw 2 distinct events; never the identical pair two rounds in a row
  private pickEvents() {
    const pool: EventId[] = ['goldenRush', 'shrinkStorm', 'meteor', 'frenzy'];
    let a: EventId = 'goldenRush', b: EventId = 'shrinkStorm', key = '';
    for (let tries = 0; tries < 24; tries++) {
      const i = Math.floor(Math.random() * pool.length);
      let j = Math.floor(Math.random() * pool.length);
      while (j === i) j = Math.floor(Math.random() * pool.length);
      a = pool[i]; b = pool[j];
      key = [a, b].slice().sort().join('+');
      if (key !== this.prevPair) break;
    }
    this.prevPair = key;
    this.slotA = a; this.slotB = b;
  }

  private warnFor(id: EventId): string {
    switch (id) {
      case 'goldenRush': return 'GOLDEN RUSH INCOMING';
      case 'shrinkStorm': return 'SHRINK STORM INCOMING';
      case 'meteor': return 'METEOR SHOWER INCOMING';
      case 'frenzy': return 'FRENZY MINUTE INCOMING';
    }
  }

  private fireEvent(id: EventId, timeLeft: number) {
    switch (id) {
      case 'goldenRush': return this.startGoldenRush(timeLeft);
      case 'shrinkStorm': return this.startStorm(timeLeft);
      case 'meteor': return this.startMeteor(timeLeft);
      case 'frenzy': return this.startFrenzy(timeLeft);
    }
  }

  private allVoids(): Void[] { return [this.deps.getPlayer(), ...this.deps.getRivals()]; }
  private formOf(v: Void): number { return v.formIndex; } // v9 §1: unified on the Void base
  private floorOf(v: Void): number { return (v as { formFloor: number }).formFloor; }
  private worldEater(): Void | null {
    const last = CONFIG.FORMS.length - 1;
    return this.allVoids().find((v) => this.formOf(v) >= last) || null;
  }

  update(dt: number, timeLeft: number) {
    const player = this.deps.getPlayer();
    const rivals = this.deps.getRivals();
    // reset per-frame event state on every void
    player.eventSlow = 1;
    for (const r of rivals) { r.eventSlow = 1; r.eventFlee = null; }

    // v8 §7: two scheduled slots draw from the event pool (~2:05 and ~1:10)
    this.schedule('slotA', CONFIG.GOLDEN_RUSH_TIME, timeLeft, this.warnFor(this.slotA), () => this.fireEvent(this.slotA, timeLeft));
    this.schedule('slotB', CONFIG.SHRINK_STORM_TIME, timeLeft, this.warnFor(this.slotB), () => this.fireEvent(this.slotB, timeLeft));

    // GOLDEN RUSH: spawn goldens rapidly while the window is open
    if (this.goldenRushUntil && timeLeft > this.goldenRushUntil) {
      this.goldenRushTimer -= dt;
      if (this.goldenRushTimer <= 0) { this.goldenRushTimer = 900; this.deps.getWorld().spawnGolden(player); }
    } else {
      this.goldenRushUntil = 0;
    }

    this.updateStorm(dt, timeLeft);
    this.updateMeteor(dt, timeLeft);

    // FRENZY MINUTE window (engine reads frenzyActive for ×1.25 + double streaks)
    this.frenzyOn = this.frenzyUntil > 0 && timeLeft > this.frenzyUntil;
    if (this.frenzyUntil > 0 && timeLeft <= this.frenzyUntil) this.frenzyUntil = 0;

    // TOWN FIGHTS BACK: whenever a WORLD EATER exists and no trucks are out
    this.truckCd -= dt;
    if (this.trucks.length === 0 && this.truckCd <= 0) {
      const we = this.worldEater();
      if (we) this.startTrucks(we, timeLeft);
    }
    this.updateTrucks(dt, timeLeft);
  }

  private schedule(id: string, atMs: number, timeLeft: number, warn: string, fire: () => void) {
    if (!this.warned.has(id) && timeLeft <= atMs + CONFIG.EVENT_WARN_MS && timeLeft > atMs) {
      this.warned.add(id);
      this.deps.banner(warn, '#FFD23F');
      audio.playEvent();
    }
    if (!this.fired.has(id) && timeLeft <= atMs) { this.fired.add(id); fire(); }
  }

  private startGoldenRush(timeLeft: number) {
    this.goldenRushUntil = timeLeft - CONFIG.GOLDEN_RUSH_DURATION;
    this.goldenRushTimer = 0;
    this.deps.banner('GOLDEN RUSH!', '#FFD23F');
    audio.eventHorn('goldenRush');
  }

  private startStorm(timeLeft: number) {
    const l = this.pickStormTarget();
    this.storm = { x: l.x - 280, y: l.y - 280, until: timeLeft - CONFIG.SHRINK_STORM_DURATION, hitCd: 0, target: l };
    this.strikes = []; this.strikeTimer = 3500; this.strikeCount = 0; // v9 §5: fresh 3-strike budget
    this.deps.banner('SHRINK STORM — RUN!', '#5AC8FF', 4);
    audio.eventHorn('shrinkStorm');
  }

  // v8 §7: target the leader, but never the same void twice in a row; near-tie → random
  private pickStormTarget(): Void {
    const sorted = this.allVoids().slice().sort((a, b) => b.score - a.score);
    let target = sorted[0];
    if (sorted.length > 1 && sorted[0].score > 0) {
      const gap = (sorted[0].score - sorted[1].score) / sorted[0].score;
      if (gap <= 0.15) target = Math.random() < 0.5 ? sorted[0] : sorted[1];
    }
    if (target === this.stormLastTarget && sorted.length > 1) {
      target = sorted.find((v) => v !== this.stormLastTarget) || target;
    }
    this.stormLastTarget = target;
    return target;
  }

  // v8 §7: METEOR SNACK SHOWER — 10s of edible snacks raining down
  private startMeteor(timeLeft: number) {
    this.meteorUntil = timeLeft - 10000;
    this.meteorTimer = 0;
    this.deps.banner('METEOR SNACK SHOWER!', '#FFB86B', 4);
    audio.eventHorn('meteor');
  }

  private updateMeteor(dt: number, timeLeft: number) {
    if (this.meteorUntil && timeLeft > this.meteorUntil) {
      this.meteorTimer -= dt;
      if (this.meteorTimer <= 0) { this.meteorTimer = 220; this.spawnMeteor(); }
    } else if (this.meteorUntil) {
      this.meteorUntil = 0;
    }
    for (const mt of this.meteors) mt.y += mt.vy * (dt / 1000);
    for (let i = this.meteors.length - 1; i >= 0; i--) {
      const mt = this.meteors[i];
      if (mt.y >= mt.groundY) {
        this.deps.getWorld().dropSnack(mt.x, mt.groundY, this.deps.fx);
        this.deps.fx.addCrumbs(mt.x, mt.groundY, '#D8C7A2', 8);
        // v9 §5: each impact bumps the screen (2px) and throws a dust ring
        this.deps.fx.shake(120, 2, 8);
        this.deps.fx.addRing(mt.x, mt.groundY, '#D8C7A2', 6, 46, 3, 260);
        audio.meteorThump();
        this.meteors.splice(i, 1);
      }
    }
  }

  private spawnMeteor() {
    const m = CONFIG.MAP_SIZE, margin = 140;
    const p = this.deps.getPlayer();
    let gx: number, gy: number;
    if (Math.random() < 0.7) {
      // bias toward the player so the shower is visible on-screen
      gx = clamp(p.x + (Math.random() - 0.5) * 1200, margin, m - margin);
      gy = clamp(p.y + (Math.random() - 0.5) * 1400, margin, m - margin);
    } else {
      gx = margin + Math.random() * (m - margin * 2);
      gy = margin + Math.random() * (m - margin * 2);
    }
    this.meteors.push({ x: gx, y: gy - 470, vy: 920, groundY: gy });
  }

  // v8 §7: FRENZY MINUTE — 15s of ×1.25 score + double streaks (engine reads frenzyActive)
  private startFrenzy(timeLeft: number) {
    this.frenzyUntil = timeLeft - 15000;
    this.deps.banner('FRENZY MINUTE! ×1.25', '#FF9F45', 5);
    audio.eventHorn('frenzy');
  }

  private updateStorm(dt: number, timeLeft: number) {
    const s = this.storm;
    if (!s) { this.strikes = []; return; }
    if (timeLeft <= s.until) { this.storm = null; this.strikes = []; return; }

    // v9 §5: exactly 3 telegraphed lightning strikes over the storm window (~every 3.5s).
    // Gate on a total counter, not the live array length (removed strikes must not free slots).
    this.strikeTimer -= dt;
    if (this.strikeTimer <= 0 && this.strikeCount < 3) {
      this.strikeTimer = 3500;
      this.strikeCount++;
      const l = s.target;
      this.strikes.push({
        x: l.x + (Math.random() - 0.5) * 260,
        y: l.y + (Math.random() - 0.5) * 260,
        age: 0, struck: false,
      });
    }
    const strikeR = 84;
    for (let i = this.strikes.length - 1; i >= 0; i--) {
      const st = this.strikes[i];
      st.age += dt;
      if (!st.struck && st.age >= 800) {
        st.struck = true;
        audio.lightningCrack();
        this.deps.fx.shake(220, 9, 16);
        this.deps.fx.addRing(st.x, st.y, '#DCE6FF', 10, strikeR + 40, 5, 320);
        for (const v of this.allVoids()) {
          if (dist(st.x, st.y, v.x, v.y) < strikeR + v.radius) {
            v.radius = Math.max(this.floorOf(v), v.radius * Math.sqrt(1 - 0.08)); // −8% mass
          }
        }
      }
      if (st.age >= 1100) this.strikes.splice(i, 1);
    }
    const l = s.target; // v8 §7: locked target for the whole storm window
    // v7 §4: if #1 is a bot, it panics and runs from the cloud
    if (l !== this.deps.getPlayer()) (l as Rival).eventFlee = { x: s.x, y: s.y };
    const a = Math.atan2(l.y - s.y, l.x - s.x);
    const sp = CONFIG.MOVE_MAX_SPEED * CONFIG.SHRINK_STORM_SPEED_FRAC * (dt / 1000); // escapable at 70%
    s.x += Math.cos(a) * sp;
    s.y += Math.sin(a) * sp;
    if (s.hitCd > 0) s.hitCd -= dt;
    const stormR = 90;
    if (s.hitCd <= 0 && dist(s.x, s.y, l.x, l.y) < stormR + l.radius) {
      s.hitCd = 700;
      const factor = Math.sqrt(1 - CONFIG.SHRINK_STORM_LOSS); // −12% mass
      l.radius = Math.max(this.floorOf(l), l.radius * factor);
      this.deps.fx.shake(200, 8, 15);
      this.deps.fx.addRing(l.x, l.y, '#5AC8FF', l.radius, l.radius + 60, 4, 300);
    }
  }

  // v9 §5: TOWN FIGHTS BACK v2 — 4 firetrucks + 2 police cars converge from off-screen
  private startTrucks(target: Void, timeLeft: number) {
    this.truckTarget = target;
    this.sprayTimer = 0;
    this.sprayDrained = 0;
    this.sirenCd = 0;
    const until = timeLeft - CONFIG.FIRETRUCK_DURATION;
    this.trucks = [];
    const total = 6; // 4 fire + 2 police
    for (let i = 0; i < total; i++) {
      const a = (i / total) * Math.PI * 2 + 0.3;
      const R = 620; // spawn off-screen around the target
      this.trucks.push({
        x: target.x + Math.cos(a) * R,
        y: target.y + Math.sin(a) * R,
        until,
        kind: i < 4 ? 'fire' : 'police',
      });
    }
    this.truckCd = CONFIG.FIRETRUCK_DURATION + 15000;
    // v7 §4: name the WORLD ENDER the town is rallying against
    const nm = target === this.deps.getPlayer() ? 'YOU' : ((target as Rival).name || 'THE ENDER');
    this.deps.banner(`TOWN FIGHTS BACK vs ${nm}!`, '#FF6B6B');
    audio.eventHorn('town');
  }

  private updateTrucks(dt: number, timeLeft: number) {
    if (this.trucks.length === 0) return;
    const target = this.truckTarget;
    if (!target) { this.trucks = []; return; }

    // siren layer while the assault runs
    this.sirenCd -= dt;
    if (this.sirenCd <= 0) { this.sirenCd = 900; audio.siren(); }

    const ender = this.formOf(target) >= CONFIG.FORMS.length - 1;
    let nearest: Truck | null = null, nd = Infinity;
    let spraying = false;

    for (let i = this.trucks.length - 1; i >= 0; i--) {
      const t = this.trucks[i];
      const a = Math.atan2(target.y - t.y, target.x - t.x);
      const sp = CONFIG.MOVE_MAX_SPEED * 0.9 * (dt / 1000);
      const d = dist(t.x, t.y, target.x, target.y);

      // v9 §5: a WORLD ENDER can EAT the vehicles — "DELICIOUS IRONY!"
      if (ender && d < target.radius + 14) {
        this.trucks.splice(i, 1);
        if (target === this.deps.getPlayer()) target.score += 500;
        this.deps.banner('DELICIOUS IRONY! +500', '#FFD23F', 4);
        this.deps.fx.addRing(t.x, t.y, '#FFD23F', 10, 70, 4, 320);
        audio.playChomp(3);
        continue;
      }

      if (d > 200) { t.x += Math.cos(a) * sp; t.y += Math.sin(a) * sp; }
      if (d < 300) {
        // 25% slow + a slight knockback pushing the target away from the spray
        target.eventSlow = Math.min(target.eventSlow, 1 - CONFIG.FIRETRUCK_SLOW);
        const kb = 26 * (dt / 1000);
        target.x -= Math.cos(a) * kb;
        target.y -= Math.sin(a) * kb;
        spraying = true;
      }
      if (d < nd) { nd = d; nearest = t; }
    }

    // v9 §5: real damage — every 2 full seconds under spray drains −3% mass, capped −15%
    if (spraying && this.sprayDrained < 0.15) {
      this.sprayTimer += dt;
      while (this.sprayTimer >= 2000 && this.sprayDrained < 0.15) {
        this.sprayTimer -= 2000;
        this.sprayDrained += 0.03;
        const factor = Math.sqrt(1 - 0.03);
        target.radius = Math.max(this.floorOf(target), target.radius * factor);
        this.deps.fx.shake(160, 6, 12);
        this.deps.fx.addRing(target.x, target.y, '#7FDBFF', target.radius, target.radius + 40, 4, 260);
      }
    } else if (!spraying) {
      this.sprayTimer = Math.max(0, this.sprayTimer - dt * 0.5);
    }

    // v7 §4: a targeted bot runs from the nearest vehicle
    if (nearest && target !== this.deps.getPlayer()) {
      (target as Rival).eventFlee = { x: nearest.x, y: nearest.y };
    }

    if (this.trucks.length === 0 || timeLeft <= this.trucks[0].until) {
      this.trucks = []; this.truckTarget = null;
    }
  }

  // Drawn inside the world/camera transform (world coordinates).
  draw(ctx: CanvasRenderingContext2D, clock: number) {
    const s = this.storm;
    if (s) {
      const R = 90;
      ctx.save();
      ctx.globalAlpha = 0.88;
      ctx.fillStyle = '#5A6B8C';
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(s.x + Math.cos(a) * R * 0.5, s.y + Math.sin(a) * R * 0.35, R * 0.55, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#6E80A6';
      ctx.beginPath(); ctx.arc(s.x, s.y, R * 0.7, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#FFE066';
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      const jx = Math.sin(clock * 0.02) * 2;
      ctx.beginPath();
      ctx.moveTo(s.x - 6 + jx, s.y);
      ctx.lineTo(s.x + 3, s.y + 18);
      ctx.lineTo(s.x - 4, s.y + 18);
      ctx.lineTo(s.x + 6, s.y + 42);
      ctx.stroke();
      ctx.restore();
    }

    // v8 §7: falling snacks with drop shadows + motion trails
    for (const mt of this.meteors) {
      const prog = clamp(1 - (mt.groundY - mt.y) / 470, 0, 1); // 0 high → 1 near ground
      ctx.save();
      ctx.globalAlpha = 0.12 + prog * 0.28;
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.ellipse(mt.x, mt.groundY, 9 + prog * 13, 3 + prog * 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      // motion trail
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = '#FFE08A';
      ctx.beginPath();
      ctx.ellipse(mt.x, mt.y - 16, 5, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      // the snack
      ctx.fillStyle = '#FF5A5A';
      ctx.beginPath(); ctx.arc(mt.x, mt.y, 11, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#7ACB5A';
      ctx.beginPath(); ctx.ellipse(mt.x + 4, mt.y - 10, 4, 2, -0.6, 0, Math.PI * 2); ctx.fill();
    }

    // v9 §5: lightning telegraph rings + bolts
    for (const st of this.strikes) {
      ctx.save();
      if (!st.struck) {
        // telegraph: a pulsing ground ring shrinking toward the strike
        const p = clamp(st.age / 800, 0, 1);
        ctx.globalAlpha = 0.5 + 0.3 * Math.sin(clock * 0.03);
        ctx.strokeStyle = '#DCE6FF';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(st.x, st.y, 84 * (1.2 - p * 0.4), 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 0.14;
        ctx.fillStyle = '#8FA6FF';
        ctx.beginPath(); ctx.arc(st.x, st.y, 84, 0, Math.PI * 2); ctx.fill();
      } else if (st.age < 1000) {
        // bolt flash from the sky
        ctx.globalAlpha = clamp(1 - (st.age - 800) / 200, 0, 1);
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        ctx.beginPath();
        let bx = st.x, by = st.y - 420;
        ctx.moveTo(bx, by);
        for (let k = 0; k < 5; k++) {
          bx = st.x + (Math.random() - 0.5) * 28;
          by += 84;
          ctx.lineTo(bx, by);
        }
        ctx.stroke();
      }
      ctx.restore();
    }

    for (const t of this.trucks) {
      ctx.save();
      ctx.translate(t.x, t.y);
      // shadow
      ctx.fillStyle = 'rgba(20,8,43,0.22)';
      roundRect(ctx, -22 + 6, -10 + 8, 44, 20, 5); ctx.fill();
      // body — firetruck red or police navy/white
      ctx.fillStyle = t.kind === 'fire' ? '#E23B4E' : '#25408F';
      roundRect(ctx, -22, -10, 44, 20, 5); ctx.fill();
      if (t.kind === 'police') { ctx.fillStyle = '#FFFFFF'; roundRect(ctx, -22, -2, 44, 6, 2); ctx.fill(); }
      // cab window
      ctx.fillStyle = '#CFE4FF';
      roundRect(ctx, 6, -8, 12, 15, 3); ctx.fill();
      // v9 §5: flashing light bar (red/blue alternating)
      const on = Math.floor(clock / 180) % 2 === 0;
      ctx.fillStyle = on ? '#FF2D55' : '#2B8CFF';
      roundRect(ctx, -10, -14, 8, 5, 2); ctx.fill();
      ctx.fillStyle = on ? '#2B8CFF' : '#FF2D55';
      roundRect(ctx, 0, -14, 8, 5, 2); ctx.fill();
      // wheels
      ctx.fillStyle = '#2B1A44';
      ctx.beginPath();
      ctx.arc(-10, 12, 5, 0, Math.PI * 2);
      ctx.arc(12, 12, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      if (this.truckTarget) {
        const tg = this.truckTarget;
        ctx.save();
        ctx.fillStyle = 'rgba(120,200,255,0.75)';
        for (let i = 0; i < 6; i++) {
          const p = (clock * 0.004 + i / 6) % 1;
          const wx = t.x + (tg.x - t.x) * p;
          const wy = t.y + (tg.y - t.y) * p - Math.sin(p * Math.PI) * 34;
          ctx.beginPath(); ctx.arc(wx, wy, 3.5, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
      }
    }
  }
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
