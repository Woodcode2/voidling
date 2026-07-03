import { CONFIG, type BoonDef, type SkinDef } from './config';
import { audio } from './audio';
import { FXManager } from './fx';
import { WorldManager } from './world';
import { Player } from './player';
import { makeRivals, type Rival, type WorldView } from './rivals';
import { meta } from './meta';
import { track } from './services';
import { formatTime, dist, clamp } from './utils';
import { createJoystick } from './input';

export type Screen = 'home' | 'game' | 'boon' | 'results' | 'shop' | 'dailyIntro';

export interface ResultData {
  score: number;
  placement: number;
  total: number;
  devoured: number;
  coins: number;
  isDaily: boolean;
  crown: boolean;
  highScore: number;
  newBest: boolean;
}

export interface DailyData { id: string; seed: string; name: string; desc: string; }

export interface Snapshot {
  screen: Screen;
  coins: number;
  highScore: number;
  streak: number;
  equippedSkin: string;
  ownedSkins: string[];
  boonChoices: BoonDef[];
  results: ResultData | null;
  daily: DailyData | null;
  muted: boolean;
}

export interface GameEngine {
  getSnapshot(): Snapshot;
  subscribe(cb: () => void): () => void;
  start(daily: boolean): void;
  chooseBoon(id: string): void;
  buySkin(id: string): { ok: boolean; reason?: string };
  equipSkin(id: string): void;
  openShop(): void;
  openDaily(): void;
  goHome(): void;
  toggleMute(): boolean;
  destroy(): void;
}

interface ActiveBoon { id: string; name: string; remaining: number; duration: number; }
interface Banner { text: string; color: string; life: number; max: number; }

const DAILY_MODS = [
  { id: 'golden', name: 'Golden Hour', desc: 'Coins earned this run are doubled.' },
  { id: 'giant', name: 'Head Start', desc: 'You begin extra chunky.' },
  { id: 'frenzy', name: 'Feeding Frenzy', desc: 'Every bite scores 30% more.' },
];

const BOON_DURATION: Record<string, number> = {
  magnet: 18000, overdrive: 16000, twin: 20000, tremor: 14000, greed: 18000,
};

function skinById(id: string): SkinDef {
  return CONFIG.SKINS.find((s) => s.id === id) || CONFIG.SKINS[0];
}

export function createGame(canvas: HTMLCanvasElement): GameEngine {
  const ctx = canvas.getContext('2d')!;
  meta.load();

  // ── shared state ──
  let screen: Screen = 'home';
  let world: WorldManager | null = null;
  let player: Player | null = null;
  let rivals: Rival[] = [];
  let timeLeft = 0;
  let isDaily = false;
  let dailyData: DailyData | null = null;
  let boonChoices: BoonDef[] = [];
  let results: ResultData | null = null;
  const boonUsed = new Set<number>();
  const activeBoons: ActiveBoon[] = [];
  const banners: Banner[] = [];
  let maxCombo = 0;

  // daily modifier round flags
  let baseGreed = 1;
  let coinMult = 1;

  const fx = new FXManager();
  const joystick = createJoystick(canvas);

  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((cb) => cb());

  // ── canvas sizing (DPR capped at 3) ──
  let dpr = 1, fw = 0, fh = 0;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 3);
    fw = window.innerWidth;
    fh = window.innerHeight;
    canvas.width = Math.max(1, Math.floor(fw * dpr));
    canvas.height = Math.max(1, Math.floor(fh * dpr));
    canvas.style.width = fw + 'px';
    canvas.style.height = fh + 'px';
  }
  window.addEventListener('resize', resize);
  resize();

  function banner(text: string, color = '#FFFFFF') {
    banners.push({ text, color, life: 1900, max: 1900 });
    if (banners.length > 4) banners.shift();
  }

  // ── round lifecycle ──
  function start(daily: boolean) {
    audio.init();
    isDaily = daily;
    baseGreed = 1;
    coinMult = 1;
    let startRadius = CONFIG.PLAYER_BASE_RADIUS;
    let duration = CONFIG.GAME_DURATION * 1000;

    let seed = 'run_' + Math.floor(Math.random() * 1e9);
    if (daily && dailyData) {
      seed = dailyData.seed;
      if (dailyData.id === 'golden') coinMult = 2;
      if (dailyData.id === 'giant') startRadius = CONFIG.PLAYER_BASE_RADIUS * 1.7;
      if (dailyData.id === 'frenzy') baseGreed = 1.3;
    }

    world = new WorldManager(CONFIG.MAP_SIZE);
    world.init(seed);

    const skin = skinById(meta.data.equippedSkin);
    const c = CONFIG.MAP_SIZE / 2;
    if (!player) player = new Player(skin);
    player.reset(c, c, skin);
    player.radius = startRadius;

    rivals = makeRivals();
    for (let i = 0; i < rivals.length; i++) {
      const a = (i / rivals.length) * Math.PI * 2;
      const rr = CONFIG.MAP_SIZE * 0.32;
      rivals[i].spawn(c + Math.cos(a) * rr, c + Math.sin(a) * rr, CONFIG.PLAYER_BASE_RADIUS * (0.9 + Math.random() * 0.6));
    }

    timeLeft = duration;
    boonUsed.clear();
    activeBoons.length = 0;
    banners.length = 0;
    maxCombo = 0;
    fx.particles.length = 0;
    fx.texts.length = 0;

    results = null;
    screen = 'game';
    joystick.setEnabled(true);
    resetClock();
    track('round_start', { daily });
    notify();
  }

  function hasBoon(id: string) { return activeBoons.some((b) => b.id === id); }

  function chooseBoon(id: string) {
    if (screen !== 'boon' || !player) return;
    const def = CONFIG.BOONS.find((b) => b.id === id);
    if (!def) return;
    track('boon_pick', { id });
    if (id === 'time') {
      timeLeft += 10000;
      banner('+10 SECONDS', '#FFD23F');
    } else {
      const dur = BOON_DURATION[id] || 16000;
      const existing = activeBoons.find((b) => b.id === id);
      if (existing) existing.remaining = dur;
      else activeBoons.push({ id, name: def.name, remaining: dur, duration: dur });
      banner(def.name.toUpperCase() + '!', '#1CC6AE');
    }
    audio.playBoon();
    screen = 'game';
    joystick.setEnabled(true);
    resetClock();
    notify();
  }

  function endRound() {
    if (!player || !world) return;
    joystick.setEnabled(false);

    const board = [player, ...rivals].sort((a, b) => b.score - a.score);
    const placement = board.findIndex((e) => e === player) + 1;
    const crown = placement === 1;
    const devoured = world.totalStartArea > 0 ? (world.eatenArea / world.totalStartArea) * 100 : 0;
    const coins = Math.floor((player.score / 120 + (crown ? 60 : 0)) * coinMult);
    const newBest = player.score > meta.data.highScore;

    meta.addCoins(coins);
    if (newBest) { meta.data.highScore = player.score; meta.save(); }
    if (isDaily) meta.recordDaily();

    // missions
    meta.updateMission('eat_ducks', world.playerStats.ducks);
    meta.updateMission('combo_4', maxCombo);
    meta.updateMission('tier_4', world.playerStats.maxTier);

    results = {
      score: player.score, placement, total: board.length, devoured,
      coins, isDaily, crown, highScore: meta.data.highScore, newBest,
    };
    track('round_end', { score: player.score, placement, coins });
    audio.playMerge();
    screen = 'results';
    notify();
  }

  // ── simulation (fixed step) ──
  function simulate(dt: number) {
    if (!world || !player) return;

    timeLeft -= dt;

    // boons expiry + live effects
    for (let i = activeBoons.length - 1; i >= 0; i--) {
      activeBoons[i].remaining -= dt;
      if (activeBoons[i].remaining <= 0) activeBoons.splice(i, 1);
    }
    player.magnetMultiplier = 1 + (hasBoon('magnet') ? 0.8 : 0);
    player.speedMultiplier = 1 + (hasBoon('overdrive') ? 0.35 : 0);
    player.twinMerge = hasBoon('twin');
    player.tremorActive = hasBoon('tremor');
    player.greedMultiplier = baseGreed + (hasBoon('greed') ? 0.6 : 0);

    // input
    if (joystick.state.active) {
      player.setInput(joystick.state.dirX, joystick.state.dirY, joystick.state.mag);
    } else {
      player.setInput(0, 0, 0);
    }
    player.update(dt);

    // rivals
    for (let i = 0; i < rivals.length; i++) {
      const others: WorldView['voids'] = [{ x: player.x, y: player.y, radius: player.ghost ? 0.001 : player.radius }];
      for (let j = 0; j < rivals.length; j++) {
        if (j !== i && rivals[j].alive && !rivals[j].ghost) {
          others.push({ x: rivals[j].x, y: rivals[j].y, radius: rivals[j].radius });
        }
      }
      rivals[i].update(dt, { objects: world.objects, voids: others, map: CONFIG.MAP_SIZE });
    }

    // objects (eat + flee)
    world.update(dt, player, rivals);

    // void vs void
    resolveVoids();

    // drain player fx
    for (const ev of player.pendingFx) {
      if (ev.type === 'absorb') {
        audio.playBlip(Math.min(player.combo, 12));
        fx.addConfetti(ev.x, ev.y, [ev.color || '#FFD23F', '#FFFFFF']);
      } else if (ev.type === 'merge') {
        audio.playMerge();
        fx.addConfetti(ev.x, ev.y, CONFIG.COLORS.pops);
        fx.shake(220, 8);
        if (ev.text) fx.addText(ev.x, ev.y - 20, ev.text, ev.color || '#FFF');
      } else if (ev.type === 'eatRival') {
        audio.playMerge();
        fx.addConfetti(ev.x, ev.y, CONFIG.COLORS.pops);
        fx.shake(300, 12);
        fx.flash();
        if (ev.text) fx.addText(ev.x, ev.y - 30, ev.text, ev.color || '#FFD23F');
      }
    }
    player.pendingFx.length = 0;

    maxCombo = Math.max(maxCombo, player.combo);

    // boon picker gates at 60s and 30s remaining
    for (const th of [60000, 30000]) {
      if (!boonUsed.has(th) && timeLeft <= th && timeLeft > 500) {
        boonUsed.add(th);
        openBoonPick();
        return;
      }
    }

    if (timeLeft <= 0) { timeLeft = 0; endRound(); }
  }

  function openBoonPick() {
    const pool = [...CONFIG.BOONS];
    boonChoices = [];
    for (let i = 0; i < 3 && pool.length; i++) {
      boonChoices.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    }
    audio.playBoon();
    screen = 'boon';
    joystick.setEnabled(false);
    notify();
  }

  function canEatVoid(bigR: number, smallR: number, d: number) {
    return bigR >= smallR * CONFIG.RIVAL_EAT_RATIO && d <= bigR - smallR * 0.15;
  }

  function resolveVoids() {
    if (!player) return;
    // player vs rivals
    if (!player.ghost) {
      for (const r of rivals) {
        if (!r.alive || r.ghost) continue;
        const d = dist(player.x, player.y, r.x, r.y);
        if (d > player.radius + r.radius) continue;
        if (canEatVoid(player.radius, r.radius, d)) {
          const rr = r.radius;
          fx.addConfetti(r.x, r.y, CONFIG.COLORS.pops);
          fx.shake(280, 12); fx.flash();
          player.eatRival(rr);
          r.getEaten();
          banner(`You devoured ${r.name}!`, '#FFD23F');
        } else if (canEatVoid(r.radius, player.radius, d)) {
          const pr = player.radius;
          fx.shake(360, 16); fx.flash();
          player.getEaten();
          r.eatVoid(pr);
          banner(`${r.name} devoured you — ghosting!`, '#FF6B6B');
        }
      }
    }
    // rival vs rival
    for (let i = 0; i < rivals.length; i++) {
      for (let j = i + 1; j < rivals.length; j++) {
        const a = rivals[i], b = rivals[j];
        if (a.ghost || b.ghost) continue;
        const d = dist(a.x, a.y, b.x, b.y);
        if (d > a.radius + b.radius) continue;
        if (canEatVoid(a.radius, b.radius, d)) { a.eatVoid(b.radius); b.getEaten(); }
        else if (canEatVoid(b.radius, a.radius, d)) { b.eatVoid(a.radius); a.getEaten(); }
      }
    }
  }

  // ── render ──
  function render(alpha: number, clock: number, frameDt: number) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (!world || !player || screen === 'home' || screen === 'shop' || screen === 'dailyIntro') {
      ctx.fillStyle = CONFIG.COLORS.uiBg;
      ctx.fillRect(0, 0, fw, fh);
      return;
    }

    const px = player.prevX + (player.x - player.prevX) * alpha;
    const py = player.prevY + (player.y - player.prevY) * alpha;
    const shake = fx.getShake();
    const camX = px - fw / 2 + shake.x;
    const camY = py - fh / 2 + shake.y;

    drawArena(camX, camY);

    ctx.save();
    ctx.translate(-camX, -camY);
    world.draw(ctx, clock, { x: camX, y: camY, w: fw, h: fh });
    for (const r of rivals) r.draw(ctx, clock, alpha);
    player.draw(ctx, clock, alpha);
    ctx.restore();

    fx.update(frameDt);
    fx.draw(ctx, camX, camY);
    fx.drawFlash(ctx, fw, fh);

    if (screen === 'game') {
      drawHUD();
      drawJoystickHint();
    }
  }

  function drawArena(camX: number, camY: number) {
    const C = CONFIG.COLORS;
    ctx.fillStyle = C.field;
    ctx.fillRect(0, 0, fw, fh);

    ctx.save();
    ctx.translate(-camX, -camY);

    // checker texture
    const cell = 220;
    const x0 = Math.floor(camX / cell) * cell;
    const y0 = Math.floor(camY / cell) * cell;
    ctx.fillStyle = C.fieldDark;
    for (let x = x0; x < camX + fw + cell; x += cell) {
      for (let y = y0; y < camY + fh + cell; y += cell) {
        if (((x / cell) + (y / cell)) % 2 === 0) ctx.fillRect(x, y, cell, cell);
      }
    }

    const S = CONFIG.MAP_SIZE;
    // paths
    ctx.fillStyle = 'rgba(255,210,63,0.85)';
    roundRectFill(ctx, S * 0.08, S * 0.54, S * 0.84, 96, 40);
    roundRectFill(ctx, S * 0.46, S * 0.08, 96, S * 0.84, 40);

    // pond
    const pondX = S * 0.7, pondY = S * 0.34, pr = 280;
    ctx.fillStyle = C.pondEdge;
    ctx.beginPath(); ctx.ellipse(pondX, pondY, pr + 12, pr * 0.62 + 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = C.pond;
    ctx.beginPath(); ctx.ellipse(pondX, pondY, pr, pr * 0.62, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.25; ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.ellipse(pondX - pr * 0.3, pondY - pr * 0.25, pr * 0.4, pr * 0.16, -0.4, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;

    // hedge border
    ctx.lineWidth = 46;
    ctx.strokeStyle = '#12907C';
    ctx.lineJoin = 'round';
    ctx.strokeRect(0, 0, S, S);
    ctx.lineWidth = 6;
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.strokeRect(23, 23, S - 46, S - 46);

    ctx.restore();
  }

  function drawHUD() {
    if (!player) return;
    const C = CONFIG.COLORS;
    ctx.textBaseline = 'alphabetic';

    // timer (top center)
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '700 34px Fredoka, sans-serif';
    ctx.fillText(formatTime(timeLeft), fw / 2, 46);
    // time bar
    const barW = Math.min(240, fw * 0.5), bx = fw / 2 - barW / 2, by = 56;
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    roundRectFill(ctx, bx, by, barW, 8, 4);
    ctx.fillStyle = timeLeft < 15000 ? '#FF3D68' : '#FFD23F';
    roundRectFill(ctx, bx, by, barW * clamp(timeLeft / (CONFIG.GAME_DURATION * 1000), 0, 1), 8, 4);

    // active boon icons under timer
    let ibx = fw / 2 - (activeBoons.length * 40) / 2 + 20;
    for (const b of activeBoons) {
      drawBoonIcon(ibx, by + 34, 15, b);
      ibx += 40;
    }

    // score + combo (top right)
    ctx.textAlign = 'right';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '700 26px Fredoka, sans-serif';
    ctx.fillText(String(player.score), fw - 16, 40);
    if (player.combo > 1) {
      ctx.fillStyle = '#FFD23F';
      ctx.font = '700 18px Fredoka, sans-serif';
      ctx.fillText(`COMBO ×${player.comboMult.toFixed(1)}`, fw - 16, 64);
    }

    // leaderboard (top left)
    const board = [
      { name: 'You', score: player.score, color: player.skin.glowColor, me: true },
      ...rivals.map((r) => ({ name: r.name, score: r.score, color: r.skin.bodyColor, me: false })),
    ].sort((a, b) => b.score - a.score);
    ctx.textAlign = 'left';
    for (let i = 0; i < board.length; i++) {
      const e = board[i];
      const y = 30 + i * 22;
      if (e.me) {
        ctx.fillStyle = 'rgba(255,255,255,0.16)';
        roundRectFill(ctx, 6, y - 15, 168, 20, 6);
      }
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '700 13px Nunito, sans-serif';
      ctx.fillText(`${i + 1}`, 12, y);
      ctx.fillStyle = e.color;
      ctx.beginPath(); ctx.arc(30, y - 5, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = e.me ? '#FFD23F' : '#FFFFFF';
      ctx.font = (e.me ? '700 ' : '600 ') + '13px Nunito, sans-serif';
      ctx.fillText(e.name, 42, y);
      ctx.textAlign = 'right';
      ctx.fillText(String(e.score), 172, y);
      ctx.textAlign = 'left';
    }

    // banners (center)
    ctx.textAlign = 'center';
    for (let i = 0; i < banners.length; i++) {
      const b = banners[i];
      b.life -= 16;
      const a = clamp(b.life / 400, 0, 1);
      ctx.globalAlpha = a;
      ctx.fillStyle = b.color;
      ctx.font = '700 22px Fredoka, sans-serif';
      ctx.strokeStyle = 'rgba(20,8,43,0.6)';
      ctx.lineWidth = 4;
      const y = fh * 0.2 + i * 30;
      ctx.strokeText(b.text, fw / 2, y);
      ctx.fillText(b.text, fw / 2, y);
      ctx.globalAlpha = 1;
    }
    for (let i = banners.length - 1; i >= 0; i--) if (banners[i].life <= 0) banners.splice(i, 1);

    // ghost indicator
    if (player.ghost) {
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = '700 16px Nunito, sans-serif';
      ctx.fillText(`SAFE ${Math.ceil(player.ghostTime / 1000)}s`, fw / 2, fh - 24);
    }
  }

  function drawBoonIcon(x: number, y: number, r: number, b: ActiveBoon) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(20,8,43,0.7)';
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#FFD23F';
    ctx.font = '700 14px Fredoka, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(b.name[0], 0, 1);
    // radial timer
    ctx.strokeStyle = '#1CC6AE';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, r + 2, -Math.PI / 2, -Math.PI / 2 + (b.remaining / b.duration) * Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    ctx.textBaseline = 'alphabetic';
  }

  function drawJoystickHint() {
    const s = joystick.state;
    if (!s.active) return;
    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(s.anchorX, s.anchorY, CONFIG.JOYSTICK_MAX_DIST, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.arc(s.anchorX, s.anchorY, 10, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.6;
    ctx.beginPath(); ctx.arc(s.curX, s.curY, 22, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // ── main loop (fixed timestep + interpolation) ──
  let last = performance.now();
  let acc = 0;
  let clock = 0;
  let raf = 0;
  function resetClock() { last = performance.now(); acc = 0; }

  function frame(now: number) {
    raf = requestAnimationFrame(frame);
    let delta = now - last;
    last = now;
    if (delta > CONFIG.MAX_DT) delta = CONFIG.MAX_DT; // clamp
    if (delta < 0) delta = 0;
    clock += delta;

    if (screen === 'game') {
      acc += delta;
      let steps = 0;
      while (acc >= CONFIG.FIXED_DT && steps < 5) {
        simulate(CONFIG.FIXED_DT);
        acc -= CONFIG.FIXED_DT;
        steps++;
        if (screen !== 'game') break; // a boon pick / end may have paused us
      }
      if (steps >= 5) acc = 0;
    }
    const alpha = screen === 'game' ? clamp(acc / CONFIG.FIXED_DT, 0, 1) : 1;
    render(alpha, clock, delta);
  }
  raf = requestAnimationFrame(frame);

  // Pause the loop while the tab is hidden; resume with a fresh clock so we
  // don't try to "catch up" a huge delta accumulated during backgrounding.
  function onVisibility() {
    if (document.hidden) {
      cancelAnimationFrame(raf);
      raf = 0;
    } else if (!raf) {
      resetClock();
      raf = requestAnimationFrame(frame);
    }
  }
  document.addEventListener('visibilitychange', onVisibility);

  // ── public API ──
  function buildSnapshot(): Snapshot {
    return {
      screen,
      coins: meta.data.coins,
      highScore: meta.data.highScore,
      streak: meta.data.streak,
      equippedSkin: meta.data.equippedSkin,
      ownedSkins: meta.data.skinsOwned,
      boonChoices,
      results,
      daily: dailyData,
      muted: audio.muted,
    };
  }

  return {
    getSnapshot: buildSnapshot,
    subscribe(cb) { listeners.add(cb); return () => listeners.delete(cb); },
    start,
    chooseBoon,
    buySkin(id) {
      const s = skinById(id);
      if (meta.data.skinsOwned.includes(id)) return { ok: false, reason: 'owned' };
      if (meta.data.coins < s.cost) return { ok: false, reason: 'coins' };
      meta.addCoins(-s.cost);
      meta.unlockSkin(id);
      meta.equipSkin(id);
      track('skin_buy', { id });
      notify();
      return { ok: true };
    },
    equipSkin(id) {
      meta.equipSkin(id);
      if (player && screen !== 'game') player.skin = skinById(id);
      notify();
    },
    openShop() { screen = 'shop'; notify(); },
    openDaily() {
      const today = new Date().toDateString();
      const mod = DAILY_MODS[Math.abs(hashDate(today)) % DAILY_MODS.length];
      dailyData = { id: mod.id, seed: 'daily_' + today, name: mod.name, desc: mod.desc };
      screen = 'dailyIntro';
      notify();
    },
    goHome() { screen = 'home'; joystick.setEnabled(false); notify(); },
    toggleMute() { const m = audio.toggleMute(); notify(); return m; },
    destroy() {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
      joystick.destroy();
    },
  };
}

function hashDate(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}

function roundRectFill(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
  ctx.fill();
}
