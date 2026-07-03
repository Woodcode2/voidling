import { CONFIG } from './config';
import { lerp, dist } from './utils';
import type { WorldObject } from './world';
import { audio } from './audio';
import type { FXManager } from './fx';
import { track } from './services';
import { meta } from './meta';

export interface OrbitIcon {
  type: number;
  angle: number;
  removing: boolean;
}

export class Player {
  x: number;
  y: number;
  baseRadius: number;
  radius: number;
  targetRadius: number;
  squash: number = 1;

  vx: number = 0;
  vy: number = 0;
  
  orbit: OrbitIcon[] = [];
  combo: number = 1;
  score: number = 0;
  timeSinceMerge: number = 0;

  magnetMultiplier: number = 1;
  speedMultiplier: number = 1;
  twinMerge: boolean = false;
  tremorActive: boolean = false;
  greedMultiplier: number = 1;

  fx: FXManager;

  constructor(x: number, y: number, fx: FXManager) {
    this.x = x;
    this.y = y;
    this.baseRadius = CONFIG.PLAYER_BASE_RADIUS;
    this.radius = this.baseRadius;
    this.targetRadius = this.baseRadius;
    this.fx = fx;
  }

  update(dt: number, targetX: number, targetY: number, isDragging: boolean) {
    // Movement
    if (isDragging) {
      const angle = Math.atan2(targetY - this.y, targetX - this.x);
      const d = dist(this.x, this.y, targetX, targetY);
      const speed = Math.min(d * 0.05, 0.4) * this.speedMultiplier;
      
      this.vx = Math.cos(angle) * speed * dt;
      this.vy = Math.sin(angle) * speed * dt;
    } else {
      this.vx *= 0.9;
      this.vy *= 0.9;
    }

    this.x += this.vx;
    this.y += this.vy;

    // Radius smoothing
    this.radius = lerp(this.radius, this.targetRadius, dt * 0.01);
    
    // Squash return
    this.squash = lerp(this.squash, 1, dt * 0.01);

    // Orbit update
    const orbitSpeed = CONFIG.ORBIT_SPEED * dt;
    for (const o of this.orbit) {
      o.angle += orbitSpeed;
    }

    // Combo decay
    if (this.combo > 1) {
      this.timeSinceMerge += dt;
      if (this.timeSinceMerge > CONFIG.COMBO_DECAY_TIME) {
        this.combo--;
        this.timeSinceMerge = 0;
      }
    }
  }

  onAbsorbComplete(obj: WorldObject) {
    // Area based growth: + 40% of obj area
    const currentArea = Math.PI * Math.pow(this.targetRadius, 2);
    const addedArea = Math.PI * Math.pow(obj.baseSize, 2) * 0.4;
    this.targetRadius = Math.sqrt((currentArea + addedArea) / Math.PI);

    this.squash = 1.08;
    this.score += Math.floor(10 * this.greedMultiplier);
    
    audio.playBlip(this.combo);
    
    this.addToOrbit(obj);

    meta.updateMission('eat_ducks', 1); // rough stub, ideally check if it's a duck
  }

  addToOrbit(obj: WorldObject) {
    // Add to ring
    const newAngle = this.orbit.length > 0 ? this.orbit[this.orbit.length-1].angle - (Math.PI/3) : 0;
    this.orbit.push({ type: obj.type, angle: newAngle, removing: false });
    
    if (this.orbit.length > 6) {
      this.orbit.shift();
    }

    this.checkMerge();
  }

  checkMerge() {
    const required = this.twinMerge ? 2 : 3;
    const counts = new Map<number, OrbitIcon[]>();
    
    for (const o of this.orbit) {
      if (!counts.has(o.type)) counts.set(o.type, []);
      counts.get(o.type)!.push(o);
    }

    for (const [type, group] of counts.entries()) {
      if (group.length >= required) {
        // Merge!
        this.combo++;
        this.timeSinceMerge = 0;
        
        const tier = Math.floor(type / 10);
        const mergeScore = 150 * this.combo * this.greedMultiplier;
        this.score += mergeScore;

        // Bonus growth
        const currentArea = Math.PI * Math.pow(this.targetRadius, 2);
        // Approximation of area added
        const addedArea = Math.PI * Math.pow(tier * 10, 2) * 3;
        this.targetRadius = Math.sqrt((currentArea + addedArea) / Math.PI);

        // FX
        this.fx.addConfetti(this.x, this.y, CONFIG.COLORS.pops);
        this.fx.addText(this.x, this.y - this.radius, `+${mergeScore}`, '#FFFFFF');
        this.fx.shake(120, 3);
        this.fx.flash();
        audio.playMerge();
        
        track('merge', { type, combo: this.combo });
        meta.updateMission('combo_4', this.combo);

        // Remove from orbit
        this.orbit = this.orbit.filter(o => !group.includes(o));
        break;
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, skinDef: any, worldDrawObjectShape: Function) {
    ctx.save();
    ctx.translate(this.x, this.y);
    
    // Scale for squash
    const speed = Math.hypot(this.vx, this.vy);
    const stretch = 1 + Math.min(speed * 0.05, 0.2);
    const angle = Math.atan2(this.vy, this.vx);
    
    ctx.rotate(angle);
    ctx.scale(this.squash * stretch, this.squash / stretch);
    ctx.rotate(-angle);

    // Glow
    ctx.shadowColor = skinDef.glow;
    ctx.shadowBlur = 20;
    ctx.fillStyle = skinDef.glow;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius + 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Body
    ctx.fillStyle = skinDef.body;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    const eyeOffset = Math.min(speed * 2, this.radius * 0.3);
    const eyeRadius = this.radius * 0.15;
    const eyeX = Math.cos(angle) * eyeOffset;
    const eyeY = Math.sin(angle) * eyeOffset;

    ctx.fillStyle = CONFIG.COLORS.voidlingEyes;
    ctx.beginPath();
    ctx.arc(eyeX - this.radius*0.3, eyeY - this.radius*0.2, eyeRadius, 0, Math.PI*2);
    ctx.arc(eyeX + this.radius*0.3, eyeY - this.radius*0.2, eyeRadius, 0, Math.PI*2);
    ctx.fill();

    ctx.restore();

    // Orbit Ring
    const orbitDistance = this.radius + CONFIG.ORBIT_RADIUS_OFFSET;
    for (let i = 0; i < this.orbit.length; i++) {
      const o = this.orbit[i];
      const ox = this.x + Math.cos(o.angle) * orbitDistance;
      const oy = this.y + Math.sin(o.angle) * orbitDistance;
      
      ctx.save();
      ctx.translate(ox, oy);
      worldDrawObjectShape(ctx, o.type, 8); // simplified icon
      ctx.restore();
    }
  }
}
