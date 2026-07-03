import { prng } from './utils';

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
}

export interface FloatingText {
  x: number;
  y: number;
  text: string;
  life: number;
  maxLife: number;
  color: string;
}

export class FXManager {
  particles: Particle[] = [];
  texts: FloatingText[] = [];
  shakeTime = 0;
  shakeMagnitude = 0;
  flashTime = 0;

  update(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.angle += p.spin * dt;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.y -= 0.05 * dt; // float up
      t.life -= dt;
      if (t.life <= 0) this.texts.splice(i, 1);
    }

    if (this.shakeTime > 0) this.shakeTime -= dt;
    if (this.flashTime > 0) this.flashTime -= dt;
  }

  draw(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number) {
    ctx.save();
    ctx.translate(-cameraX, -cameraY);

    // Particles (Confetti)
    for (const p of this.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      
      // Draw triangle
      ctx.beginPath();
      ctx.moveTo(0, -p.size);
      ctx.lineTo(p.size, p.size);
      ctx.lineTo(-p.size, p.size);
      ctx.fill();
      
      ctx.rotate(-p.angle);
      ctx.translate(-p.x, -p.y);
    }

    // Texts
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 24px Fredoka, sans-serif';
    for (const t of this.texts) {
      const alpha = Math.max(0, t.life / t.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = t.color;
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 3;
      ctx.strokeText(t.text, t.x, t.y);
      ctx.fillText(t.text, t.x, t.y);
    }

    ctx.restore();
    ctx.globalAlpha = 1;
  }

  drawFlash(ctx: CanvasRenderingContext2D, width: number, height: number) {
    if (this.flashTime > 0) {
      const alpha = this.flashTime / 150;
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.fillRect(0, 0, width, height);
    }
  }

  getShake() {
    if (this.shakeTime <= 0) return { x: 0, y: 0 };
    return {
      x: (Math.random() - 0.5) * this.shakeMagnitude,
      y: (Math.random() - 0.5) * this.shakeMagnitude
    };
  }

  addConfetti(x: number, y: number, colors: string[]) {
    for (let i = 0; i < 14; i++) {
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
        spin: (Math.random() - 0.5) * 0.01
      });
    }
  }

  addText(x: number, y: number, text: string, color: string) {
    this.texts.push({
      x, y, text, color, life: 1000, maxLife: 1000
    });
  }

  shake(duration: number, magnitude: number) {
    this.shakeTime = duration;
    this.shakeMagnitude = magnitude;
    if (navigator.vibrate) navigator.vibrate(30);
  }

  flash() {
    this.flashTime = 150;
  }
}
