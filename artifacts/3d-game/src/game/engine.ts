import { CONFIG, type BoonDef, type SkinDef } from './config';
import { audio } from './audio';
import { FXManager } from './fx';
import { WorldManager } from './world';
import { Player } from './player';
import { makeRivals, type Rival, type WorldView } from './rivals';
import { meta } from './meta';
import { track } from './services';
import { formatTime, dist, clamp, lerp } from './utils';
import { createJoystick } from './input';
import { EventManager } from './events';

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
  reachedForm: string;    // v6 §3: highest evolution form reached
  reachedIndex: number;
  worldEater: boolean;
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
  musicOn: boolean;
  sfxOn: boolean;
  paused: boolean;
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
  togglePause(): void;
  toggleMute(): boolean;
  toggleMusic(): boolean;
  toggleSfx(): boolean;
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
  let evoTitle: { name: string; life: number; max: number } | null = null; // v6 §3 title card
  let powerStamp: { name: string; color: string; life: number; max: number } | null = null; // v6 §4
  let maxCombo = 0;
  let paused = false;
  let roundElapsed = 0;
  let slowmo = 0;                 // ms of slow-motion remaining (finale/evolution)
  let coinBonus = 0;             // extra coins already granted mid-round (finale)
  let evoCoinBonus = 0;         // v6 §3: WORLD EATER results bonus (+200)
  let goldenTimer = 0;          // v6 §2: golden-object spawn cadence (from 2:45)

  // camera state (world-space centre + zoom), smoothed each frame
  let camCX = CONFIG.MAP_SIZE / 2;
  let camCY = CONFIG.MAP_SIZE / 2;
  let camZoom = 0.5;
  let camLookX = 0, camLookY = 0;   // v5 §1: smoothed velocity lookahead

  // v6 §8: cached post-fx surfaces (rebuilt on resize)
  let vignetteCanvas: HTMLCanvasElement | null = null;
  let vignetteW = 0, vignetteH = 0;
  let grainCanvas: HTMLCanvasElement | null = null;
  let grainPattern: CanvasPattern | null = null;

  // daily modifier round flags
  let baseGreed = 1;
  let coinMult = 1;

  const fx = new FXManager();
  const joystick = createJoystick(canvas);
  // v6 §5: world events (golden rush, shrink storm, town fights back)
  const events = new EventManager({
    getWorld: () => world!,
    fx,
    getPlayer: () => player!,
    getRivals: () => rivals,
    banner,
  });

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
    audio.duckMusic(); // v5 §5: duck the track under banners
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
      // v5 §1: everyone starts at the same base radius — no seeded size spread
      rivals[i].spawn(c + Math.cos(a) * rr, c + Math.sin(a) * rr, CONFIG.PLAYER_BASE_RADIUS);
    }

    timeLeft = duration;
    boonUsed.clear();
    activeBoons.length = 0;
    banners.length = 0;
    evoTitle = null;
    powerStamp = null;
    maxCombo = 0;
    roundElapsed = 0;
    slowmo = 0;
    paused = false;
    coinBonus = 0;
    evoCoinBonus = 0;
    goldenTimer = 0;
    events.reset();
    fx.particles.length = 0;
    fx.texts.length = 0;
    fx.rings.length = 0;

    // v5 §1: spawn already correctly framed (no zoom-in animation)
    camCX = player.x;
    camCY = player.y;
    camLookX = camLookY = 0;
    const startView = clamp(
      CONFIG.CAM_VIEW_BASE + (player.radius - CONFIG.PLAYER_BASE_RADIUS) * CONFIG.CAM_VIEW_GROWTH,
      CONFIG.CAM_VIEW_BASE, CONFIG.CAM_VIEW_MAX,
    );
    camZoom = fh / startView;

    audio.startMusic();

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
    triggerPowerPickup(def.id, def.name); // v6 §4: pickup moment
    if (id === 'time') {
      timeLeft += 15000; // v6 §4: BORROWED TIME
      banner('+15 SECONDS', '#FFD23F');
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
    const worldEater = player.formIndex >= CONFIG.FORMS.length - 1;
    if (worldEater) evoCoinBonus = 200; // v6 §3: reaching WORLD EATER awards 200 coins
    const devoured = world.totalStartArea > 0 ? (world.eatenArea / world.totalStartArea) * 100 : 0;
    const coins = Math.floor((player.score / CONFIG.COINS_PER_SCORE + (crown ? 60 : 0)) * coinMult) + coinBonus + evoCoinBonus;
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
      reachedForm: player.formName, reachedIndex: player.formIndex, worldEater,
    };
    track('round_end', { score: player.score, placement, coins });
    audio.stopMusic();
    if (crown || worldEater) audio.playWin(); else audio.playMerge();
    screen = 'results';
    notify();
  }

  function triggerFinale(x: number, y: number) {
    slowmo = 600;
    fx.flash();
    fx.shake(500, 18, 60);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      fx.addConfetti(x + Math.cos(a) * 120, y + Math.sin(a) * 120, CONFIG.COLORS.pops, 26);
    }
    fx.addRing(x, y, '#FFD23F', 20, 900, 8, 900);
    banner('YOU ATE THE WATER TOWER', '#FFD23F');
    // single source of truth: accrue here, granted once via endRound's coin total
    coinBonus += 500;
    audio.playMerge();
  }

  // v6 §3: the transformation moment — slow-mo, shockwave, title card, fanfare
  function triggerEvolution(x: number, y: number, form: number, name: string) {
    slowmo = CONFIG.EVO_SLOWMO_MS;
    fx.flash();
    fx.shake(500, 14, [30, 40, 60]);
    fx.addRing(x, y, '#C77DFF', 24, 900, 10, 700);
    fx.addRing(x, y, '#FFD23F', 12, 640, 7, 560);
    fx.addConfetti(x, y, CONFIG.COLORS.pops, 24);
    evoTitle = { name, life: 1600, max: 1600 };
    audio.playEvolve();
    audio.duckMusic();
    banner('EVOLVED → ' + name, '#C77DFF');
  }

  // ── simulation (fixed step) ──
  function simulate(dt: number) {
    if (!world || !player) return;

    timeLeft -= dt;
    roundElapsed += dt;

    // boons expiry + live effects
    for (let i = activeBoons.length - 1; i >= 0; i--) {
      activeBoons[i].remaining -= dt;
      if (activeBoons[i].remaining <= 0) activeBoons.splice(i, 1);
    }
    // v6 §4: power-up effect magnitudes per spec
    player.magnetMultiplier = 1 + (hasBoon('magnet') ? 0.4 : 0);   // GRAVITY GLUTTON: +40% reach
    player.speedMultiplier = 1 + (hasBoon('overdrive') ? 0.25 : 0); // ZOOMIES: +25% speed
    player.twinMerge = hasBoon('twin');                             // DOUBLE STOMACH
    player.tremorActive = hasBoon('tremor');                        // TENDERIZER
    player.greedMultiplier = baseGreed * (hasBoon('greed') ? 1.5 : 1); // MIDAS MOUTH: ×1.5

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
      rivals[i].update(dt, { objects: world.objects, voids: others, map: CONFIG.MAP_SIZE, elapsed: roundElapsed });
    }

    // objects (suction + eat + living-world AI)
    world.update(dt, player, rivals, fx);

    // v6 §2: golden objects begin at 2:45 remaining, ~every 12s
    if (timeLeft <= CONFIG.GOLDEN_START_MS && timeLeft > 0) {
      goldenTimer -= dt;
      if (goldenTimer <= 0) { goldenTimer = CONFIG.GOLDEN_INTERVAL; world.spawnGolden(player); }
    }

    // v6 §2: catch-up economy — underdog aura + leader decay
    applyCatchUp(dt);

    // v6 §5: world events
    events.update(dt, timeLeft);

    // void vs void
    resolveVoids();

    // drain player fx
    for (const ev of player.pendingFx) {
      if (ev.type === 'absorb') {
        fx.addConfetti(ev.x, ev.y, [ev.color || '#FFD23F', '#FFFFFF']);
      } else if (ev.type === 'chomp') {
        audio.playChomp();
        if (ev.kind) audio.playSignature(ev.kind);
      } else if (ev.type === 'merge') {
        audio.playMerge();
        audio.duckMusic();
        fx.addConfetti(ev.x, ev.y, CONFIG.COLORS.pops);
        fx.shake(220, 8);
        if (ev.text) fx.addText(ev.x, ev.y - 20, ev.text, ev.color || '#FFF');
      } else if (ev.type === 'eatRival') {
        audio.playMerge();
        fx.addConfetti(ev.x, ev.y, CONFIG.COLORS.pops);
        fx.shake(300, 12);
        fx.flash();
        if (ev.text) fx.addText(ev.x, ev.y - 30, ev.text, ev.color || '#FFD23F');
      } else if (ev.type === 'finale') {
        triggerFinale(ev.x, ev.y);
      } else if (ev.type === 'evolve') {
        triggerEvolution(ev.x, ev.y, ev.form || 0, ev.text || '');
      }
    }
    player.pendingFx.length = 0;

    maxCombo = Math.max(maxCombo, player.combo);
    audio.setMusicIntensity(player.combo); // v5 §5: combo ≥ 2 brightens the loop

    // v6 §1: power-up picks at 2:30 / 1:40 / 0:50 remaining
    for (const th of CONFIG.BOON_PICK_TIMES) {
      if (!boonUsed.has(th) && timeLeft <= th && timeLeft > 500) {
        boonUsed.add(th);
        openBoonPick();
        return;
      }
    }

    if (timeLeft <= 0) { timeLeft = 0; endRound(); }
  }

  // v6 §2: standings-driven catch-up. 5th/6th place get a silent underdog aura
  // (faster + faster-growing); the current leader slowly decays above DEVOURER,
  // but never below the form floor it has already reached.
  function applyCatchUp(dt: number) {
    if (!player) return;
    const dtSec = dt / 1000;
    const standings = [player as Player | Rival, ...rivals].sort((a, b) => b.score - a.score);
    for (let i = 0; i < standings.length; i++) {
      const e = standings[i];
      const under = i >= 4; // 5th place onward
      if (e === player) {
        player.underdog = under;
        player.underdogSpeed = under ? 1 + CONFIG.UNDERDOG_SPEED : 1;
        player.underdogGrowth = under ? 1 + CONFIG.UNDERDOG_GROWTH : 1;
      } else {
        const r = e as Rival;
        r.underdog = under;
        r.underdogSpeed = under ? 1 + CONFIG.UNDERDOG_SPEED : 1;
        r.underdogGrowth = under ? 1 + CONFIG.UNDERDOG_GROWTH : 1;
      }
    }
    const leader = standings[0];
    const leaderForm = leader === player ? player.formIndex : (leader as Rival).reachedForm;
    if (leaderForm >= CONFIG.DEVOURER_FORM_INDEX) {
      const floor = leader === player ? player.formFloor : (leader as Rival).formFloor;
      leader.radius = Math.max(floor, leader.radius * (1 - CONFIG.LEADER_DECAY_RATE * dtSec));
    }
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
    // bigger rivals respawn at least 1.5 screen-widths away from the player
    const minDist = (1.5 * fw) / Math.max(0.05, camZoom);
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
          r.getEaten(player.x, player.y, minDist);
          banner(`You devoured ${r.name}!`, '#FFD23F');
        } else if (canEatVoid(r.radius, player.radius, d)) {
          const pr = player.radius;
          fx.shake(360, 16); fx.flash();
          audio.playEaten(); // v5 §5: descending wah when you get eaten
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
        if (canEatVoid(a.radius, b.radius, d)) { a.eatVoid(b.radius); b.getEaten(player.x, player.y, minDist); }
        else if (canEatVoid(b.radius, a.radius, d)) { b.eatVoid(a.radius); a.getEaten(player.x, player.y, minDist); }
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

    // ── camera: zoom OUT as the player grows (v5 §1) ──
    const viewHeight = clamp(
      CONFIG.CAM_VIEW_BASE + (player.radius - CONFIG.PLAYER_BASE_RADIUS) * CONFIG.CAM_VIEW_GROWTH,
      CONFIG.CAM_VIEW_BASE, CONFIG.CAM_VIEW_MAX,
    );
    const targetZoom = fh / viewHeight;
    camZoom = lerp(camZoom, targetZoom, CONFIG.CAM_ZOOM_LERP);

    // ── camera: follow with lookahead, NO dead zone (v5 §1) ──
    const pspd = Math.hypot(player.vx, player.vy);
    const lax = pspd > 0.0001 ? (player.vx / pspd) * CONFIG.CAM_LOOKAHEAD : 0;
    const lay = pspd > 0.0001 ? (player.vy / pspd) * CONFIG.CAM_LOOKAHEAD : 0;
    camLookX = lerp(camLookX, lax, CONFIG.CAM_LOOKAHEAD_LERP);
    camLookY = lerp(camLookY, lay, CONFIG.CAM_LOOKAHEAD_LERP);
    camCX = lerp(camCX, px + camLookX, CONFIG.CAM_POS_LERP);
    camCY = lerp(camCY, py + camLookY, CONFIG.CAM_POS_LERP);

    const shake = fx.getShake();
    const viewW = fw / camZoom, viewH = fh / camZoom;
    const view = { x: camCX - viewW / 2, y: camCY - viewH / 2, w: viewW, h: viewH };

    // background outside the map
    ctx.fillStyle = CONFIG.COLORS.uiBg;
    ctx.fillRect(0, 0, fw, fh);

    // ── world transform: ground → objects (y-sorted) → voidlings → fx ──
    ctx.save();
    ctx.translate(fw / 2 + shake.x, fh / 2 + shake.y);
    ctx.scale(camZoom, camZoom);
    ctx.translate(-camCX, -camCY);

    world.drawGround(ctx, view);
    world.drawDressing(ctx, view);
    world.draw(ctx, clock, view);
    events.draw(ctx, clock); // v6 §5: storm cloud + firetrucks (world space)
    for (const r of rivals) r.draw(ctx, clock, alpha);
    drawPowerAuras(clock); // v6 §4: auras under the player
    player.draw(ctx, clock, alpha);

    if (!paused) fx.update(frameDt);
    fx.draw(ctx);
    ctx.restore();

    // v6 §8: environment post-processing (grain + vignette), under the HUD
    drawPostFX(clock);

    // screen-space FX + HUD
    fx.drawFlash(ctx, fw, fh);

    if (screen === 'game') {
      drawHUD();
      drawJoystickHint();
    }
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

    // score + combo (top right) — v5 §6: keep clear of the 40px pause pill.
    // pill right edge = 12px inset + 40px wide; score right edge sits 8px left of it.
    const scoreRight = fw - (12 + 40 + 8);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '700 26px Fredoka, sans-serif';
    ctx.fillText(String(player.score), scoreRight, 34);
    if (player.combo > 1) {
      ctx.fillStyle = '#FFD23F';
      ctx.font = '700 18px Fredoka, sans-serif';
      ctx.fillText(`COMBO ×${player.comboMult.toFixed(1)}`, scoreRight, 58);
    }

    // leaderboard (top left, dark backdrop, dropped below the timer so it never
    // overlaps the centred timer/bar at narrow widths e.g. 375px)
    const weRadius = CONFIG.FORMS[CONFIG.FORMS.length - 1].radius;
    const board = [
      { name: 'You', score: player.score, color: player.skin.glowColor, me: true, radius: player.radius },
      ...rivals.map((r) => ({ name: r.name, score: r.score, color: r.skin.bodyColor, me: false, radius: r.radius })),
    ].sort((a, b) => b.score - a.score);
    const LB_X = 8, LB_W = 150, LB_TOP = 84, ROW = 20;
    ctx.fillStyle = 'rgba(20,8,43,0.55)';
    roundRectFill(ctx, LB_X, LB_TOP, LB_W, board.length * ROW + 12, 10);
    ctx.textAlign = 'left';
    for (let i = 0; i < board.length; i++) {
      const e = board[i];
      const y = LB_TOP + 18 + i * ROW;
      if (e.me) {
        ctx.fillStyle = 'rgba(255,255,255,0.16)';
        roundRectFill(ctx, LB_X + 3, y - 14, LB_W - 6, ROW - 1, 6);
      }
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '700 12px Nunito, sans-serif';
      ctx.fillText(`${i + 1}`, LB_X + 8, y);
      ctx.fillStyle = e.color;
      ctx.beginPath(); ctx.arc(LB_X + 26, y - 4, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = e.me ? '#FFD23F' : '#FFFFFF';
      ctx.font = (e.me ? '700 ' : '600 ') + '12px Nunito, sans-serif';
      const nm = e.name.length > 9 ? e.name.slice(0, 8) + '…' : e.name;
      ctx.fillText(nm, LB_X + 38, y);
      // v6 §3: crown WORLD EATERs on the leaderboard
      if (e.radius >= weRadius) drawMiniCrown(LB_X + 42 + ctx.measureText(nm).width, y - 8);
      ctx.textAlign = 'right';
      ctx.fillText(String(e.score), LB_X + LB_W - 8, y);
      ctx.textAlign = 'left';
    }

    // banners (center)
    ctx.textAlign = 'center';
    for (let i = 0; i < banners.length; i++) {
      const b = banners[i];
      if (!paused) b.life -= 16;
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

    // v6 §3: evolution progress bar (bottom center)
    const forms = CONFIG.FORMS;
    const fi = player.formIndex;
    const ebW = Math.min(230, fw * 0.62), ebx = fw / 2 - ebW / 2, eby = fh - 52;
    ctx.textAlign = 'center';
    if (fi < forms.length - 1) {
      const cur = forms[fi].radius, next = forms[fi + 1].radius;
      const prog = clamp((player.radius - cur) / (next - cur), 0, 1);
      ctx.fillStyle = 'rgba(20,8,43,0.55)';
      roundRectFill(ctx, ebx, eby, ebW, 9, 5);
      ctx.fillStyle = '#C77DFF';
      roundRectFill(ctx, ebx, eby, ebW * prog, 9, 5);
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = '700 11px Nunito, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(forms[fi].name, ebx, eby - 5);
      ctx.textAlign = 'right';
      ctx.fillText('→ ' + forms[fi + 1].name, ebx + ebW, eby - 5);
    } else {
      ctx.fillStyle = '#FFD23F';
      ctx.font = '700 14px Fredoka, sans-serif';
      ctx.fillText('★ WORLD EATER ★', fw / 2, eby + 4);
    }

    // v6 §3: evolution title card (big Fredoka, scales in then settles)
    if (evoTitle) {
      if (!paused) evoTitle.life -= 16;
      const p = evoTitle.life / evoTitle.max;
      const appear = clamp((1 - p) * 5, 0, 1);           // scale-in over first 20%
      const scale = 1.25 - 0.25 * appear;                 // 1.25 → 1.0
      const a = clamp(evoTitle.life / 450, 0, 1);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(fw / 2, fh * 0.34);
      ctx.scale(scale, scale);
      ctx.textAlign = 'center';
      ctx.font = '700 15px Nunito, sans-serif';
      ctx.fillStyle = '#C77DFF';
      ctx.fillText('EVOLVED', 0, -30);
      ctx.font = '800 40px Fredoka, sans-serif';
      ctx.lineWidth = 6;
      ctx.strokeStyle = 'rgba(20,8,43,0.7)';
      ctx.strokeText(evoTitle.name, 0, 6);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(evoTitle.name, 0, 6);
      ctx.restore();
      if (evoTitle.life <= 0) evoTitle = null;
    }

    // v6 §4: power-up name stamp (fades after pickup)
    if (powerStamp) {
      if (!paused) powerStamp.life -= 16;
      const a = clamp(powerStamp.life / 300, 0, 1);
      const p = 1 - powerStamp.life / powerStamp.max;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(fw / 2, fh * 0.44);
      const sc = 0.8 + Math.min(1, p * 6) * 0.2;
      ctx.scale(sc, sc);
      ctx.textAlign = 'center';
      ctx.font = '800 30px Fredoka, sans-serif';
      ctx.lineWidth = 5;
      ctx.strokeStyle = 'rgba(20,8,43,0.7)';
      ctx.strokeText(powerStamp.name, 0, 0);
      ctx.fillStyle = powerStamp.color;
      ctx.fillText(powerStamp.name, 0, 0);
      ctx.restore();
      if (powerStamp.life <= 0) powerStamp = null;
    }

    // ghost indicator
    if (player.ghost) {
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = '700 16px Nunito, sans-serif';
      ctx.fillText(`SAFE ${Math.ceil(player.ghostTime / 1000)}s`, fw / 2, fh - 24);
    }
  }

  function drawMiniCrown(x: number, y: number) {
    ctx.save();
    ctx.fillStyle = '#FFD23F';
    ctx.strokeStyle = '#1A0B33';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y + 7);
    ctx.lineTo(x, y);
    ctx.lineTo(x + 3, y + 3);
    ctx.lineTo(x + 6, y - 1);
    ctx.lineTo(x + 9, y + 3);
    ctx.lineTo(x + 12, y);
    ctx.lineTo(x + 12, y + 7);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  function drawBoonIcon(x: number, y: number, r: number, b: ActiveBoon) {
    ctx.save();
    ctx.translate(x, y);
    const col = powerColor(b.id);
    ctx.fillStyle = 'rgba(20,8,43,0.7)';
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    drawPowerGlyph(b.id, r * 0.9);
    // radial timer ring (in the power-up's colour)
    ctx.strokeStyle = col;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, r + 2, -Math.PI / 2, -Math.PI / 2 + (b.remaining / b.duration) * Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    ctx.textBaseline = 'alphabetic';
  }

  // v6 §4: each power-up has its own colour + drawn glyph (no letters).
  function powerColor(id: string): string {
    switch (id) {
      case 'overdrive': return '#5AC8FF';
      case 'magnet': return '#C77DFF';
      case 'twin': return '#FF9F5A';
      case 'tremor': return '#FF6B6B';
      case 'greed': return '#FFD23F';
      case 'time': return '#1CC6AE';
      default: return '#FFD23F';
    }
  }

  function drawPowerGlyph(id: string, s: number) {
    ctx.save();
    ctx.lineWidth = Math.max(2, s * 0.14);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = '#FFFFFF';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (id === 'overdrive') {
      ctx.beginPath();
      ctx.moveTo(-s * 0.1, -s * 0.6); ctx.lineTo(-s * 0.4, s * 0.12); ctx.lineTo(-s * 0.05, s * 0.12);
      ctx.lineTo(s * 0.12, s * 0.6); ctx.lineTo(s * 0.4, -s * 0.05); ctx.lineTo(s * 0.05, -s * 0.05);
      ctx.closePath(); ctx.fill();
    } else if (id === 'magnet') {
      ctx.lineWidth = s * 0.3;
      ctx.beginPath(); ctx.arc(0, -s * 0.05, s * 0.4, Math.PI, 0); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-s * 0.4, -s * 0.05); ctx.lineTo(-s * 0.4, s * 0.45);
      ctx.moveTo(s * 0.4, -s * 0.05); ctx.lineTo(s * 0.4, s * 0.45);
      ctx.stroke();
    } else if (id === 'twin') {
      ctx.beginPath(); ctx.arc(-s * 0.22, 0, s * 0.3, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(s * 0.22, 0, s * 0.3, 0, Math.PI * 2); ctx.stroke();
    } else if (id === 'tremor') {
      let a = 1;
      for (const rr of [0.28, 0.46, 0.64]) {
        ctx.globalAlpha = a; a -= 0.3;
        ctx.beginPath(); ctx.arc(0, 0, s * rr, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    } else if (id === 'greed') {
      ctx.beginPath(); ctx.arc(0, 0, s * 0.5, 0, Math.PI * 2); ctx.stroke();
      ctx.font = `700 ${Math.round(s * 0.85)}px Fredoka, sans-serif`;
      ctx.fillText('$', 0, s * 0.04);
    } else if (id === 'time') {
      ctx.beginPath(); ctx.arc(0, 0, s * 0.5, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(0, -s * 0.32);
      ctx.moveTo(0, 0); ctx.lineTo(s * 0.24, s * 0.1);
      ctx.stroke();
    } else {
      ctx.font = `700 ${Math.round(s)}px Fredoka, sans-serif`;
      ctx.fillText('?', 0, s * 0.04);
    }
    ctx.restore();
    ctx.textBaseline = 'alphabetic';
  }

  // v6 §4: pickup moment — brief freeze, colour flash, ring pulse, name stamp, buzz.
  function triggerPowerPickup(id: string, name: string) {
    if (!player) return;
    const col = powerColor(id);
    slowmo = Math.max(slowmo, 400);
    fx.flash();
    fx.addRing(player.x, player.y, col, player.radius + 6, player.radius + 140, 5, 520);
    powerStamp = { name: name.toUpperCase(), color: col, life: 700, max: 700 };
    if (navigator.vibrate) navigator.vibrate(25);
  }

  // v6 §4: active power-up auras — one coloured pulsing ring per active boon.
  function drawPowerAuras(clock: number) {
    if (!player || activeBoons.length === 0) return;
    ctx.save();
    let i = 0;
    for (const b of activeBoons) {
      const pulse = 1 + Math.sin(clock / 220 + i) * 0.04;
      ctx.strokeStyle = powerColor(b.id);
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(player.x, player.y, (player.radius + 9 + i * 6) * pulse, 0, Math.PI * 2);
      ctx.stroke();
      i++;
    }
    ctx.restore();
  }

  // v6 §8: subtle film grain + vignette to seat the art in its world.
  function getVignette(): HTMLCanvasElement {
    if (vignetteCanvas && vignetteW === fw && vignetteH === fh) return vignetteCanvas;
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.floor(fw));
    c.height = Math.max(1, Math.floor(fh));
    const g = c.getContext('2d')!;
    const grd = g.createRadialGradient(fw / 2, fh / 2, Math.min(fw, fh) * 0.34, fw / 2, fh / 2, Math.max(fw, fh) * 0.72);
    grd.addColorStop(0, 'rgba(0,0,0,0)');
    grd.addColorStop(1, 'rgba(10,4,24,0.45)');
    g.fillStyle = grd;
    g.fillRect(0, 0, fw, fh);
    vignetteCanvas = c; vignetteW = fw; vignetteH = fh;
    return c;
  }
  function getGrain(): HTMLCanvasElement {
    if (grainCanvas) return grainCanvas;
    const N = 128;
    const c = document.createElement('canvas');
    c.width = N; c.height = N;
    const g = c.getContext('2d')!;
    const img = g.createImageData(N, N);
    for (let i = 0; i < img.data.length; i += 4) {
      const val = 120 + Math.floor(Math.random() * 135);
      img.data[i] = img.data[i + 1] = img.data[i + 2] = val;
      img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    grainCanvas = c;
    return c;
  }
  function drawPostFX(clock: number) {
    // the grain tile never changes, so build its repeat pattern once
    if (!grainPattern) grainPattern = ctx.createPattern(getGrain(), 'repeat');
    if (grainPattern) {
      ctx.save();
      ctx.globalAlpha = 0.035;
      ctx.globalCompositeOperation = 'overlay';
      const ox = (clock * 0.05) % 128, oy = (clock * 0.07) % 128;
      ctx.fillStyle = grainPattern;
      ctx.translate(-ox, -oy);
      ctx.fillRect(ox, oy, fw + 128, fh + 128);
      ctx.restore();
    }
    ctx.drawImage(getVignette(), 0, 0);
  }

  function drawJoystickHint() {
    if (!CONFIG.SHOW_JOYSTICK_RING) return; // v5 §2: nothing renders at the finger
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

    if (screen === 'game' && !paused) {
      // slow-motion (finale): stretch time without starving the loop
      let simDelta = delta;
      if (slowmo > 0) {
        slowmo -= delta;
        simDelta = delta * 0.35;
      }
      acc += simDelta;
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
      musicOn: audio.musicOn,
      sfxOn: audio.sfxOn,
      paused,
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
    goHome() { screen = 'home'; paused = false; audio.stopMusic(); joystick.setEnabled(false); notify(); },
    togglePause() {
      if (screen !== 'game') return;
      paused = !paused;
      joystick.setEnabled(!paused);
      if (paused) audio.pauseMusic(); else audio.resumeMusic();
      if (!paused) resetClock();
      notify();
    },
    toggleMute() { const m = audio.toggleMute(); notify(); return m; },
    toggleMusic() { const on = audio.toggleMusic(); notify(); return on; },
    toggleSfx() { const on = audio.toggleSfx(); notify(); return on; },
    destroy() {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
      audio.stopMusic(); // prevent the music scheduler interval from leaking on unmount
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
