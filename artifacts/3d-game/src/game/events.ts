import { CONFIG } from './config';
import { dist } from './utils';
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
  banner: (text: string, color: string) => void;
}

interface Truck { x: number; y: number; until: number; }

export class EventManager {
  private warned = new Set<string>();
  private fired = new Set<string>();
  private goldenRushUntil = 0;
  private goldenRushTimer = 0;
  private storm: { x: number; y: number; until: number; hitCd: number } | null = null;
  private trucks: Truck[] = [];
  private truckTarget: Void | null = null;
  private truckCd = 0;

  constructor(private deps: EventDeps) {}

  reset() {
    this.warned.clear();
    this.fired.clear();
    this.goldenRushUntil = 0;
    this.goldenRushTimer = 0;
    this.storm = null;
    this.trucks = [];
    this.truckTarget = null;
    this.truckCd = 0;
  }

  private allVoids(): Void[] { return [this.deps.getPlayer(), ...this.deps.getRivals()]; }
  private leader(): Void { return this.allVoids().reduce((a, b) => (b.score > a.score ? b : a)); }
  private formOf(v: Void): number { return 'formIndex' in v ? (v as Player).formIndex : (v as Rival).reachedForm; }
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

    this.schedule('goldenRush', CONFIG.GOLDEN_RUSH_TIME, timeLeft, 'GOLDEN RUSH INCOMING', () => this.startGoldenRush(timeLeft));
    this.schedule('shrinkStorm', CONFIG.SHRINK_STORM_TIME, timeLeft, 'SHRINK STORM INCOMING', () => this.startStorm(timeLeft));

    // GOLDEN RUSH: spawn goldens rapidly while the window is open
    if (this.goldenRushUntil && timeLeft > this.goldenRushUntil) {
      this.goldenRushTimer -= dt;
      if (this.goldenRushTimer <= 0) { this.goldenRushTimer = 900; this.deps.getWorld().spawnGolden(player); }
    } else {
      this.goldenRushUntil = 0;
    }

    this.updateStorm(dt, timeLeft);

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
    audio.playEvent();
  }

  private startStorm(timeLeft: number) {
    const l = this.leader();
    this.storm = { x: l.x - 280, y: l.y - 280, until: timeLeft - CONFIG.SHRINK_STORM_DURATION, hitCd: 0 };
    this.deps.banner('SHRINK STORM — RUN!', '#5AC8FF');
    audio.playEvent();
  }

  private updateStorm(dt: number, timeLeft: number) {
    const s = this.storm;
    if (!s) return;
    if (timeLeft <= s.until) { this.storm = null; return; }
    const l = this.leader(); // always hunts #1
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

  private startTrucks(target: Void, timeLeft: number) {
    this.truckTarget = target;
    const until = timeLeft - CONFIG.FIRETRUCK_DURATION;
    this.trucks = [
      { x: target.x - 220, y: target.y - 200, until },
      { x: target.x + 220, y: target.y + 200, until },
    ];
    this.truckCd = CONFIG.FIRETRUCK_DURATION + 15000;
    // v7 §4: name the WORLD EATER the town is rallying against
    const nm = target === this.deps.getPlayer() ? 'YOU' : ((target as Rival).name || 'THE EATER');
    this.deps.banner(`TOWN FIGHTS BACK vs ${nm}!`, '#FF6B6B');
    audio.playEvent();
  }

  private updateTrucks(dt: number, timeLeft: number) {
    if (this.trucks.length === 0) return;
    const target = this.truckTarget;
    if (target) {
      let nearest: Truck | null = null, nd = Infinity;
      for (const t of this.trucks) {
        const a = Math.atan2(target.y - t.y, target.x - t.x);
        const sp = CONFIG.MOVE_MAX_SPEED * 0.9 * (dt / 1000);
        const d = dist(t.x, t.y, target.x, target.y);
        if (d > 200) { t.x += Math.cos(a) * sp; t.y += Math.sin(a) * sp; }
        if (d < 280) target.eventSlow = Math.min(target.eventSlow, 1 - CONFIG.FIRETRUCK_SLOW);
        if (d < nd) { nd = d; nearest = t; }
      }
      // v7 §4: a targeted bot runs from the nearest firetruck
      if (nearest && target !== this.deps.getPlayer()) {
        (target as Rival).eventFlee = { x: nearest.x, y: nearest.y };
      }
    }
    if (timeLeft <= this.trucks[0].until) { this.trucks = []; this.truckTarget = null; }
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

    for (const t of this.trucks) {
      ctx.save();
      ctx.translate(t.x, t.y);
      ctx.fillStyle = 'rgba(20,8,43,0.22)';
      roundRect(ctx, -22 + 6, -10 + 8, 44, 20, 5); ctx.fill();
      ctx.fillStyle = '#E23B4E';
      roundRect(ctx, -22, -10, 44, 20, 5); ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      roundRect(ctx, 6, -8, 12, 15, 3); ctx.fill();
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
