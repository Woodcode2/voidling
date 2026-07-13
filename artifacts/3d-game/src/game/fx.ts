export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  angle: number;
  spin: number;
  gravity: number;
  shape: 'tri' | 'chunk' | 'crumb';
}

export interface FloatingText {
  x: number;
  y: number;
  text: string;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  vy?: number;  // v10 §3: px/ms rise speed (default 0.05)
}

export interface Ring {
  x: number;
  y: number;
  r: number;
  vr: number;      // expansion px/s
  life: number;
  maxLife: number;
  color: string;
  width: number;
}

// Powers §juice: a tapering light-streak (rocket smear across the screen) —
// rings/particles can't draw a line, so this is its own primitive.
interface Streak { x0: number; y0: number; x1: number; y1: number; color: string; width: number; life: number; maxLife: number; }

// Feedback Juice §3: cosmetic coin particle (pooled, display only)
interface Coin { active: boolean; x: number; y: number; vx: number; vy: number; life: number; maxLife: number; size: number; }

export class FXManager {
  particles: Particle[] = [];
  texts: FloatingText[] = [];
  rings: Ring[] = [];
  streaks: Streak[] = [];
  // Feedback Juice §3: preallocated coin pool (cap 120) — never allocates per frame
  private coins: Coin[] = Array.from({ length: 120 }, () => ({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 0, size: 0 }));
  shakeTime = 0;
  shakeMagnitude = 0;
  flashTime = 0;
  flashMax = 150;             // Powers §juice: flash() can hold longer/brighter for COLLAPSE
  flashColor = '255,255,255';

  // Feedback Juice §3: deactivate all pooled coins (called on match start so
  // no coins carry over visually between rounds).
  clearCoins() { for (const c of this.coins) c.active = false; }

  // Feedback Juice §3: pop a small cosmetic coin burst on a scored eat. Bigger
  // eats spawn a slightly bigger burst. Pure display — no score/game effect.
  addCoinBurst(x: number, y: number, amount: number) {
    const n = Math.min(10, 3 + Math.floor((amount || 0) / 40));
    let spawned = 0;
    for (const c of this.coins) {
      if (spawned >= n) break;
      if (c.active) continue;
      const ang = -Math.PI / 2 + (Math.random() - 0.5) * 1.2; // mostly upward
      const spd = 60 + Math.random() * 100;
      c.active = true;
      c.x = x; c.y = y;
      c.vx = Math.cos(ang) * spd;
      c.vy = Math.sin(ang) * spd;
      c.life = c.maxLife = 500;
      c.size = 5 + Math.random() * 3;
      spawned++;
    }
  }

  update(dt: number) {
    const dtSec = dt / 1000;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.angle += p.spin * dt;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.y -= (t.vy ?? 0.05) * dt;
      t.life -= dt;
      if (t.life <= 0) this.texts.splice(i, 1);
    }

    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.r += r.vr * dtSec;
      r.life -= dt;
      if (r.life <= 0) this.rings.splice(i, 1);
    }

    for (let i = this.streaks.length - 1; i >= 0; i--) {
      this.streaks[i].life -= dt;
      if (this.streaks[i].life <= 0) this.streaks.splice(i, 1);
    }

    // Feedback Juice §3: coins pop up and arc back down, then fade out
    for (const c of this.coins) {
      if (!c.active) continue;
      c.x += c.vx * dtSec;
      c.y += c.vy * dtSec;
      c.vy += 320 * dtSec; // gravity
      c.life -= dt;
      if (c.life <= 0) c.active = false;
    }

    if (this.shakeTime > 0) this.shakeTime -= dt;
    if (this.flashTime > 0) this.flashTime -= dt;
  }

  // Draw in WORLD space — the engine has already applied the camera/zoom transform.
  draw(ctx: CanvasRenderingContext2D) {
    // rings
    for (const r of this.rings) {
      if (r.r <= 0) continue; // contracting shells cross zero — ctx.arc throws on negative r
      const a = Math.max(0, r.life / r.maxLife);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = r.width;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // streaks (rocket smear) — tapering light-lines, drawn under particles
    for (const s of this.streaks) {
      const a = Math.max(0, s.life / s.maxLife);
      ctx.save();
      ctx.globalAlpha = a * 0.6;
      ctx.strokeStyle = s.color;
      ctx.lineWidth = Math.max(0.5, s.width * a);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(s.x0, s.y0);
      ctx.lineTo(s.x1, s.y1);
      ctx.stroke();
      ctx.restore();
    }

    // particles
    for (const p of this.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      if (p.shape === 'chunk') {
        ctx.fillRect(-p.size, -p.size, p.size * 2, p.size * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(-p.size, -p.size, p.size * 2, p.size * 2);
      } else if (p.shape === 'crumb') {
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(0, -p.size);
        ctx.lineTo(p.size, p.size);
        ctx.lineTo(-p.size, p.size);
        ctx.fill();
      }
      ctx.restore();
    }

    // Feedback Juice §3: coins — gold discs with a shine, fading as they fall
    for (const c of this.coins) {
      if (!c.active) continue;
      const a = Math.max(0, c.life / c.maxLife);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = '#FFD23F';
      ctx.strokeStyle = '#B8860B';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(c.x, c.y, c.size, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.beginPath(); ctx.arc(c.x - c.size * 0.3, c.y - c.size * 0.3, c.size * 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    // texts
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const t of this.texts) {
      const alpha = Math.max(0, t.life / t.maxLife);
      ctx.globalAlpha = alpha;
      ctx.font = `bold ${t.size}px Fredoka, sans-serif`;
      ctx.fillStyle = t.color;
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 3;
      ctx.strokeText(t.text, t.x, t.y);
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  // Full-screen white flash (screen space). Longer flashes (>200ms, e.g. the
  // COLLAPSE white-out) clip to full white then fade; the default 150ms pop is
  // byte-identical for existing no-arg callers.
  drawFlash(ctx: CanvasRenderingContext2D, width: number, height: number) {
    if (this.flashTime > 0) {
      const peak = this.flashMax > 200 ? 1.5 : 1;
      const alpha = Math.min(1, (this.flashTime / this.flashMax) * peak);
      ctx.fillStyle = `rgba(${this.flashColor}, ${alpha})`;
      ctx.fillRect(0, 0, width, height);
    }
  }

  getShake() {
    if (this.shakeTime <= 0) return { x: 0, y: 0 };
    return {
      x: (Math.random() - 0.5) * this.shakeMagnitude,
      y: (Math.random() - 0.5) * this.shakeMagnitude,
    };
  }

  addConfetti(x: number, y: number, colors: string[], count = 14) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 0.3 + 0.1;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 800 + Math.random() * 400,
        maxLife: 1200,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 4 + Math.random() * 4,
        angle: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 0.01,
        gravity: 0,
        shape: 'tri',
      });
    }
  }

  // Powers §juice: a tapering light-streak (rocket smear). One stroke, cheap.
  addStreak(x0: number, y0: number, x1: number, y1: number, color: string, width = 10, life = 260) {
    this.streaks.push({ x0, y0, x1, y1, color, width, life, maxLife: life });
  }

  // Powers §juice: particles spawned on a ring around (sx,sy) that CONVERGE on
  // (tx,ty) — the "matter caves into the void" read. Everything else flies out.
  addImplode(sx: number, sy: number, tx: number, ty: number, color: string, count = 16, ringR = 14, life = 340) {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + Math.random() * 0.3;
      const rr = ringR * (0.55 + Math.random() * 0.45);
      const px = sx + Math.cos(a) * rr, py = sy + Math.sin(a) * rr;
      const L = life * (0.7 + Math.random() * 0.3);
      this.particles.push({
        x: px, y: py,
        vx: (tx - px) / L, vy: (ty - py) / L,   // arrive at the target in ~L ms
        life: L, maxLife: L, color,
        size: 2 + Math.random() * 3,
        angle: 0, spin: (Math.random() - 0.5) * 0.03, gravity: 0,
        shape: Math.random() < 0.5 ? 'crumb' : 'chunk',
      });
    }
  }

  // Powers §juice: directional CONE of crumbs on the far arc that rocket back
  // into the mouth — the GULP "yank the crowd in" read. Cone, not a ring.
  addGulpStreaks(mx: number, my: number, dx: number, dy: number, reach: number, halfAngle: number, color: string, count = 14) {
    const base = Math.atan2(dy, dx);
    for (let i = 0; i < count; i++) {
      const a = base + (Math.random() - 0.5) * 2 * halfAngle;
      const r = reach * (0.45 + Math.random() * 0.55);
      const sx = mx + Math.cos(a) * r, sy = my + Math.sin(a) * r;
      const ux = mx - sx, uy = my - sy;
      const ul = Math.hypot(ux, uy) || 1;
      const speed = 0.9 + Math.random() * 0.7;
      this.particles.push({
        x: sx, y: sy,
        vx: (ux / ul) * speed, vy: (uy / ul) * speed,
        life: (ul / speed) * 0.85, maxLife: (ul / speed) * 0.85, color, // dies at 0.85 of the trip → looks absorbed
        size: 3 + Math.random() * 3,
        angle: a, spin: 0, gravity: 0,
        shape: 'crumb',
      });
    }
  }

  // Powers §juice: chunks fired evenly RADIAL-OUTWARD (addDebris is upward-only)
  // — the SHOCKWAVE "erupts outward" read.
  addBlastChunks(x: number, y: number, color: string, count = 16, speed = 0.5) {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + Math.random() * 0.3;
      const spd = speed * (0.6 + Math.random() * 0.8);
      this.particles.push({
        x, y,
        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
        life: 500 + Math.random() * 400, maxLife: 900, color,
        size: 5 + Math.random() * 6,
        angle: Math.random() * Math.PI, spin: (Math.random() - 0.5) * 0.03,
        gravity: 0.0011, shape: 'chunk',
      });
    }
  }

  // small crumbs in an object's color when it's bitten
  addCrumbs(x: number, y: number, color: string, count = 8) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 0.2 + 0.05;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.1,
        life: 400 + Math.random() * 300,
        maxLife: 700,
        color,
        size: 2 + Math.random() * 3,
        angle: 0,
        spin: 0,
        gravity: 0.0009,
        shape: 'crumb',
      });
    }
  }

  // chunky debris (house demolition)
  addDebris(x: number, y: number, color: string, count = 4) {
    for (let i = 0; i < count; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
      const speed = Math.random() * 0.35 + 0.15;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 700 + Math.random() * 400,
        maxLife: 1100,
        color,
        size: 5 + Math.random() * 5,
        angle: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 0.02,
        gravity: 0.0016,
        shape: 'chunk',
      });
    }
  }

  addText(x: number, y: number, text: string, color: string, size = 24): FloatingText {
    const t: FloatingText = { x, y, text, color, life: 1000, maxLife: 1000, size };
    this.texts.push(t);
    return t;
  }

  // v10 §3: score pop — 22px+, rises 40px over 600ms, white outline. Returns ref for pooling.
  addScoreText(x: number, y: number, amount: number, color: string): FloatingText {
    const t: FloatingText = { x, y, text: `+${amount}`, color, life: 600, maxLife: 600, size: 22, vy: 0.067 };
    this.texts.push(t);
    return t;
  }

  addRing(x: number, y: number, color: string, r0 = 8, vr = 260, width = 4, life = 420) {
    this.rings.push({ x, y, r: r0, vr, life, maxLife: life, color, width });
  }

  shake(duration: number, magnitude: number, vibrate: number | number[] = 30) {
    this.shakeTime = duration;
    this.shakeMagnitude = magnitude;
    if (vibrate && navigator.vibrate) navigator.vibrate(vibrate);
  }

  flash(ms = 150, rgb = '255,255,255') {
    this.flashTime = ms;
    this.flashMax = ms;
    this.flashColor = rgb;
  }
}
