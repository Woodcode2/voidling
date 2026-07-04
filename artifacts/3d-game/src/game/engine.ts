import { CONFIG, type BoonDef, type SkinDef } from './config';
import { audio } from './audio';
import { FXManager, type FloatingText } from './fx';
import { WorldManager } from './world';
import { Player } from './player';
import { Void } from './void';
import { makeRivals, type Rival, type WorldView } from './rivals';
import { meta } from './meta';
import { track } from './services';
import { formatTime, dist, clamp, lerp, xpForLevel } from './utils';
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
  gnomeLord?: boolean;    // v9 §8: secret — ate every gnome in one round
  skinTease?: { botName: string; skinName: string; skinId: string } | null; // v7 §8
  // v7 §11: player-level meta
  xpGain: number;
  level: number;
  xpInLevel: number;
  xpNext: number;
  leveledTo: number | null;   // top level reached this round, or null
}

export interface DailyData { id: string; seed: string; name: string; desc: string; }

export interface Snapshot {
  screen: Screen;
  coins: number;
  highScore: number;
  streak: number;
  equippedSkin: string;
  ownedSkins: string[];
  level: number;      // v7 §11
  xpInLevel: number;  // v7 §11
  xpNext: number;     // v7 §11
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
  iapView(id: string): void;             // v7 §9: mock IAP modal opened
  iapPurchase(id: string): void;         // v7 §9: mock IAP confirmed
  openShop(): void;
  openDaily(): void;
  goHome(): void;
  togglePause(): void;
  toggleMute(): boolean;
  toggleMusic(): boolean;
  toggleSfx(): boolean;
  destroy(): void;
}

interface ActiveBoon { id: string; name: string; remaining: number; duration: number; level: number; }
// v8 §6: one managed callout component — stamped center-top, one at a time, priority ordered
interface Callout { text: string; color: string; priority: number; sparkles: boolean; pulse: boolean; }

const DAILY_MODS = [
  { id: 'golden', name: 'Golden Hour', desc: 'Coins earned this run are doubled.' },
  { id: 'giant', name: 'Head Start', desc: 'You begin extra chunky.' },
  { id: 'frenzy', name: 'Feeding Frenzy', desc: 'Every bite scores 30% more.' },
];

const BOON_DURATION: Record<string, number> = {
  magnet: 18000, overdrive: 16000, twin: 20000, tremor: 14000, greed: 18000,
  // v7 §5
  echo: 16000, shield: 14000, dash: 12000, lucky: 18000,
};

// v7 §5: max power-up level (picking a dupe once → Level II, then it's retired)
const BOON_MAX_LEVEL = 2;

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
  const boonRank = new Map<string, number>();     // v7 §5: times each boon picked (→ level)
  const activeSynergies = new Set<string>();       // v7 §5: currently firing synergies
  // v8 §6: callout queue (only one shows at a time)
  const calloutQueue: Callout[] = [];
  let callout: (Callout & { t: number }) | null = null; // active, t = elapsed ms
  let borderPulse = 0;      // ms of RAMPAGE screen-border pulse remaining
  let storedBest = 0;       // personal best captured at round start
  let bestBeaten = false;   // NEW PERSONAL BEST fired once per round
  let prevRank = 99;        // leaderboard-position tracking
  let saidFirst = false;    // YOU'RE #1! fired
  let saidTop3 = false;     // TOP 3! fired
  let eatStreak = 0;        // absorbs chained within 1.2s
  let lastEatMs = 0;
  let evoTitle: { name: string; life: number; max: number } | null = null; // v6 §3 title card
  let powerStamp: { name: string; color: string; life: number; max: number } | null = null; // v6 §4
  let maxCombo = 0;
  let paused = false;
  let roundElapsed = 0;
  let slowmo = 0;                 // ms of slow-motion remaining (finale/evolution)
  let coinBonus = 0;             // extra coins already granted mid-round (finale)
  let evoCoinBonus = 0;         // v6 §3: WORLD EATER results bonus (+200)
  let gnomeLord = false;        // v9 §8: secret — ate every gnome this round
  // v10 §3: score-text pooling — rapid eats accumulate into one rising number
  let lastScoreText: FloatingText | null = null;
  let lastScoreMs = 0;
  // v10 §5: form badge — full opacity for 2s after any evolution
  let lastEvoElapsed = -9999;
  let goldenTimer = 0;          // v6 §2: golden-object spawn cadence (from 2:45)
  let luckyTimer = 0;           // v7 §5: LUCKY GNOME golden-rain cadence
  let dashTimer = 0;            // v7 §5: VOID DASH 6s auto-dash cadence
  let countdown = 0;            // v8 §1: ms of frozen pre-round "3..2..1" remaining
  let countStep = 0;           // v8 §1: last countdown number beeped
  let crackTimer = 0;          // v8 §3: WORLD EATER cracked-trail cadence

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
  let decayLogAccum = 0;   // v7 §1: throttle for the leader-decay debug log
  let radiiLogAccum = 0;   // v9 §1: 10s cadence for the fairness radius/mass proof log

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

  // v8 §6: everything routes through the callout queue so nothing overlaps/stacks
  function banner(text: string, color = '#FFFFFF', priority = 1, opts: { sparkles?: boolean; pulse?: boolean } = {}) {
    if (callout?.text === text || calloutQueue.some((c) => c.text === text)) return; // dedupe
    calloutQueue.push({ text, color, priority, sparkles: !!opts.sparkles, pulse: !!opts.pulse });
    if (calloutQueue.length > 5) { calloutQueue.sort((a, b) => b.priority - a.priority); calloutQueue.length = 5; }
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
    // v8 §1: keep every void off a food cluster at spawn so no bot pops a pile
    // of objects on the first frame (the "bots have 100+ in 2s" bug).
    world.clearSpawnFootprint([
      { x: player.x, y: player.y, radius: player.radius },
      ...rivals.map((r) => ({ x: r.x, y: r.y, radius: r.radius })),
    ]);

    timeLeft = duration;
    boonUsed.clear();
    activeBoons.length = 0;
    boonRank.clear();
    activeSynergies.clear();
    calloutQueue.length = 0; callout = null; borderPulse = 0;
    storedBest = meta.data.highScore; bestBeaten = false;
    prevRank = 99; saidFirst = false; saidTop3 = false;
    eatStreak = 0; lastEatMs = 0;
    evoTitle = null;
    powerStamp = null;
    maxCombo = 0;
    roundElapsed = 0;
    slowmo = 0;
    paused = false;
    coinBonus = 0;
    evoCoinBonus = 0;
    gnomeLord = false;
    lastScoreText = null; lastScoreMs = 0;
    lastEvoElapsed = -9999;
    goldenTimer = 0;
    luckyTimer = 0;
    dashTimer = 0;
    countdown = 0;
    countStep = 0;
    crackTimer = 0;
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
    countdown = CONFIG.COUNTDOWN_MS; // v8 §1: freeze everyone through "3..2..1"
    countStep = 0;
    joystick.setEnabled(true);
    resetClock();
    track('round_start', { daily });
    notify();
  }

  function hasBoon(id: string) { return activeBoons.some((b) => b.id === id); }
  function boonLevel(id: string) { const b = activeBoons.find((x) => x.id === id); return b ? b.level : 0; }

  // v7 §5: VOID DASH — blink 100px along movement direction, leaving afterimages.
  // SONIC SNACK synergy (ZOOMIES + VOID DASH) recolours the trail rainbow.
  function performDash() {
    if (!player) return;
    let dx = player.vx, dy = player.vy;
    const mag = Math.hypot(dx, dy);
    if (mag < 1) { dx = 1; dy = 0; } else { dx /= mag; dy /= mag; }
    const rainbow = activeSynergies.has('sonic');
    for (let i = 1; i <= 5; i++) {
      const t = i / 5;
      const col = rainbow ? `hsl(${(roundElapsed * 0.4 + i * 55) % 360}, 90%, 66%)` : '#5AFFA0';
      fx.addRing(player.x + dx * 100 * t, player.y + dy * 100 * t, col, player.radius * 0.85, player.radius * 0.85 + 16, 3, 320);
    }
    player.x = clamp(player.x + dx * 100, player.radius, CONFIG.MAP_SIZE - player.radius);
    player.y = clamp(player.y + dy * 100, player.radius, CONFIG.MAP_SIZE - player.radius);
    console.log(`[boon] VOID DASH${rainbow ? ' (SONIC SNACK)' : ''} 100px`);
  }

  // v7 §5: light up / retire synergies as their member power-ups come and go
  function checkSynergies() {
    for (const syn of CONFIG.SYNERGIES) {
      const on = syn.needs.every((n) => hasBoon(n));
      if (on && !activeSynergies.has(syn.id)) {
        activeSynergies.add(syn.id);
        banner(`SYNERGY · ${syn.name}!`, '#FFD23F');
        console.log(`[synergy] ${syn.name} ACTIVE (${syn.needs.join(' + ')})`);
      } else if (!on && activeSynergies.has(syn.id)) {
        activeSynergies.delete(syn.id);
        console.log(`[synergy] ${syn.name} ended`);
      }
    }
  }

  function chooseBoon(id: string) {
    if (screen !== 'boon' || !player) return;
    const def = CONFIG.BOONS.find((b) => b.id === id);
    if (!def) return;
    track('boon_pick', { id });
    triggerPowerPickup(def.id, def.name); // v6 §4: pickup moment

    // v7 §5: draw-without-replacement bookkeeping — a duplicate pick promotes the
    // power-up to Level II; after that it's retired from the pool (see openBoonPick).
    // BORROWED TIME is exempt: it's instant and repeatable, so it never retires.
    const rank = id === 'time' ? 1 : Math.min(BOON_MAX_LEVEL, (boonRank.get(id) || 0) + 1);
    if (id !== 'time') boonRank.set(id, rank);

    if (id === 'time') {
      timeLeft += 15000; // v6 §4: BORROWED TIME
      banner('+15 SECONDS', '#FFD23F');
      console.log('[boon] BORROWED TIME +15s');
    } else {
      const dur = BOON_DURATION[id] || 16000;
      const existing = activeBoons.find((b) => b.id === id);
      if (existing) { existing.remaining = dur; existing.level = rank; }
      else activeBoons.push({ id, name: def.name, remaining: dur, duration: dur, level: rank });
      if (id === 'shield') player.shieldCharge = true; // v7 §5: grant one chomp-block
      banner(def.name.toUpperCase() + (rank >= 2 ? ' II' : '') + '!', '#1CC6AE');
      console.log(`[boon] ${def.name} → Level ${rank}`);
    }
    checkSynergies();
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
    const devoured = world.initialMass > 0 ? (world.eatenArea / world.initialMass) * 100 : 0;
    const coins = Math.floor((player.score / CONFIG.COINS_PER_SCORE + (crown ? 60 : 0)) * coinMult) + coinBonus + evoCoinBonus;
    const newBest = player.score > meta.data.highScore;

    meta.addCoins(coins);
    if (newBest) { meta.data.highScore = player.score; meta.save(); }
    if (isDaily) meta.recordDaily();

    // missions
    meta.updateMission('eat_ducks', world.playerStats.ducks);
    meta.updateMission('combo_4', maxCombo);
    meta.updateMission('tier_4', world.playerStats.maxTier);

    // v7 §8: if a bot in the top 3 is showing off a skin the player doesn't own,
    // surface it on the results screen as a soft nudge toward the shop.
    let skinTease: ResultData['skinTease'] = null;
    for (let i = 0; i < Math.min(3, board.length); i++) {
      const e = board[i];
      if (e !== player && (e as Rival).wearsUnownedSkin) {
        const r = e as Rival;
        skinTease = { botName: r.name, skinName: r.shopSkinName, skinId: r.shopSkinId };
        break;
      }
    }

    // v7 §11: award XP and roll up any level-ups (L5 unlocks Kitty free)
    const xpGain = Math.floor(player.score / 100);
    const { levelsGained, unlocked } = meta.addXP(player.score);
    const leveledTo = levelsGained.length ? levelsGained[levelsGained.length - 1] : null;
    if (unlocked.includes('kitty')) track('unlock_kitty', { level: 5 });

    results = {
      score: player.score, placement, total: board.length, devoured,
      coins, isDaily, crown, highScore: meta.data.highScore, newBest,
      reachedForm: player.formName, reachedIndex: player.formIndex, worldEater,
      gnomeLord,
      skinTease,
      xpGain, level: meta.data.level, xpInLevel: meta.data.xp,
      xpNext: xpForLevel(meta.data.level), leveledTo,
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
    // v8 §5: the new form's music layer drops in on the sting's boom (~400ms)
    window.setTimeout(() => audio.setMusicForm(form), 400);
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
    // v7 §5: power-up effect magnitudes — Level II strengthens each per the spec
    // table. Synergies are handled separately (dash trail / echo aura / spawn rate).
    checkSynergies();
    const mL = boonLevel('magnet'), oL = boonLevel('overdrive');
    const gL = boonLevel('greed'), tL = boonLevel('tremor'), twL = boonLevel('twin');

    player.magnetMultiplier = 1 + (mL ? (mL >= 2 ? 0.7 : 0.4) : 0); // GRAVITY GLUTTON: +40%/+70% reach
    player.speedMultiplier  = 1 + (oL ? (oL >= 2 ? 0.4 : 0.25) : 0); // ZOOMIES: +25%/+40% speed
    player.twinMerge = hasBoon('twin');                             // DOUBLE STOMACH: 2-match merges
    player.twinBonus = twL >= 2 ? 1.5 : 1;                          // DOUBLE STOMACH II: +50% merge bonus
    player.tremorActive = hasBoon('tremor');                        // TENDERIZER
    player.tremorFactor = tL >= 2 ? 0.75 : 0.85;                    // 25% / 15% shrink per touch
    player.greedMultiplier = baseGreed * (gL ? (gL >= 2 ? 2 : 1.5) : 1); // MIDAS MOUTH: ×1.5 / ×2
    player.echoActive = hasBoon('echo');                            // ECHO BITE (pulse fired in absorbObject)
    player.dashActive = hasBoon('dash');                            // VOID DASH (auto-dash below)
    player.luckyActive = hasBoon('lucky');                          // LUCKY GNOME (golden rain below)

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

    // v8 §3: WORLD EATER carves a cracked-ground trail while it roams
    if (player.formIndex >= CONFIG.FORMS.length - 1) {
      crackTimer -= dt;
      if (crackTimer <= 0 && Math.hypot(player.vx, player.vy) > 30) {
        crackTimer = 130;
        world.dropCrack(player.x, player.y, player.radius);
      }
    }

    // v6 §2: golden objects begin at 2:45 remaining, ~every 12s
    if (timeLeft <= CONFIG.GOLDEN_START_MS && timeLeft > 0) {
      goldenTimer -= dt;
      if (goldenTimer <= 0) { goldenTimer = CONFIG.GOLDEN_INTERVAL; world.spawnGolden(player); }
    }

    // v7 §5: LUCKY GNOME — a golden object every 10s (GOLD RUSH synergy → 7s)
    if (player.luckyActive) {
      luckyTimer -= dt;
      if (luckyTimer <= 0) {
        const gold = activeSynergies.has('goldrush');
        luckyTimer = (gold ? 7000 : 10000) * (boonLevel('lucky') >= 2 ? 0.7 : 1);
        world.spawnGolden(player);
        console.log(`[boon] LUCKY GNOME dropped a golden snack${gold ? ' (GOLD RUSH)' : ''}`);
      }
    } else luckyTimer = 0;

    // v7 §5: VOID DASH — every 6s blink 100px along movement, with afterimages
    if (player.dashActive) {
      dashTimer -= dt;
      if (dashTimer <= 0) { dashTimer = 6000; performDash(); }
    } else dashTimer = 0;

    // v7 §5: ECHO BITE shockwave (every 5th absorb) pulls nearby edibles inward
    if (player.echoPulse) {
      player.echoPulse = false;
      world.attractEdibles(player.x, player.y, 260, 46);
      fx.addRing(player.x, player.y, '#7DF9FF', player.radius, player.radius + 130, 5, 420);
      console.log('[boon] ECHO BITE shockwave');
    }
    // v7 §5: EVENT HORIZON — constant gentle pull aura (≈30% of the echo pulse)
    if (activeSynergies.has('horizon')) {
      world.attractEdibles(player.x, player.y, 210, 40 * (dt / 1000));
    }

    // v6 §2: catch-up economy — underdog aura + leader decay
    applyCatchUp(dt);

    // v9 §1: fairness proof — every 10s log all six radii + masses. If bots
    // consistently out-size the player, the shared-Void refactor is incomplete.
    radiiLogAccum += dt;
    if (radiiLogAccum >= 10000) {
      radiiLogAccum = 0;
      const all: Void[] = [player, ...rivals];
      const line = all
        .map((v) => `${v === player ? 'YOU' : (v as Rival).name}: r=${v.radius.toFixed(1)} m=${Math.round(v.mass)} (${v.formName})`)
        .join('  |  ');
      console.debug('[radii] ' + line);
    }

    // v6 §5: world events
    events.update(dt, timeLeft);

    // v9 §8: secret — the moment the last gnome is eaten, crown the GNOME LORD
    if (world.gnomeLordPending && !gnomeLord) {
      gnomeLord = true;
      coinBonus += 150;
      banner('GNOME LORD! +150', '#8FE36B', 5, { sparkles: true });
      audio.playWin();
    }
    // v8 §7: FRENZY MINUTE — ×1.25 score (double streaks handled in the chomp loop)
    player.frenzyMult = events.frenzyActive ? 1.25 : 1;

    // void vs void
    resolveVoids();

    // drain player fx
    for (const ev of player.pendingFx) {
      if (ev.type === 'absorb') {
        fx.addConfetti(ev.x, ev.y, [ev.color || '#FFD23F', '#FFFFFF']);
      } else if (ev.type === 'score') {
        // v10 §3: pool absorb points — rolling 150ms window; each merge resets the clock
        if (lastScoreText && lastScoreText.life > 0 && roundElapsed - lastScoreMs < 150) {
          const prev = parseInt(lastScoreText.text.replace('+', '')) || 0;
          lastScoreText.text = `+${prev + (ev.amount || 0)}`;
          lastScoreMs = roundElapsed; // rolling window: timer resets on each merge
        } else {
          lastScoreText = fx.addScoreText(ev.x, ev.y, ev.amount || 0, ev.color || '#FFF');
          lastScoreMs = roundElapsed;
        }
      } else if (ev.type === 'chomp') {
        audio.playChomp(ev.tier || 1);
        if (ev.kind) audio.playSignature(ev.kind);
        // v10 §3: T4+ objects land with a deep 2px camera punch
        if ((ev.tier || 0) >= 4) fx.shake(80, 2, 0);
        // v8 §6: eat-streak ladder (chains within 1.2s); §7 frenzy counts double
        const inc = events.frenzyActive ? 2 : 1;
        const prevStreak = (roundElapsed - lastEatMs < 1200) ? eatStreak : 0;
        eatStreak = prevStreak + inc;
        lastEatMs = roundElapsed;
        if (prevStreak < 5 && eatStreak >= 5) banner('DOUBLE BITE!', '#8AE6FF', 3);
        else if (prevStreak < 10 && eatStreak >= 10) banner('FEAST!', '#FFD23F', 4);
        else if (prevStreak < 15 && eatStreak >= 15) banner('RAMPAGE!', '#FF5A3C', 5, { pulse: true });
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
        lastEvoElapsed = roundElapsed; // v10 §5: reset form-badge full-opacity window
        triggerEvolution(ev.x, ev.y, ev.form || 0, ev.text || '');
      }
    }
    player.pendingFx.length = 0;

    // v8 §6: personal-best + leaderboard-position callouts
    if (!bestBeaten && storedBest > 0 && player.score > storedBest) {
      bestBeaten = true;
      banner('NEW PERSONAL BEST!', '#FFD23F', 6, { sparkles: true });
    }
    // identity-aware rank with no per-frame allocation/sort: strict-overtake semantics
    let rank = 1;
    for (const r of rivals) if (r.score > player.score) rank++;
    if (rank < prevRank && prevRank !== 99) {
      if (rank === 1 && !saidFirst) { saidFirst = true; banner("YOU'RE #1!", '#FFD23F', 5); }
      else if (rank <= 3 && !saidTop3) { saidTop3 = true; banner('TOP 3!', '#8AE6FF', 3); }
    } else if (rank > prevRank && prevRank === 1) {
      banner('OVERTAKEN!', '#FF6B6B', 2);
      saidFirst = false; // allow re-claiming #1
    }
    prevRank = rank;

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
    // v9 §1: player + all bots are Void instances — the SAME setUnderdog()/
    // applyLeaderDecay() run for everyone, so no controller can be treated specially.
    const standings: Void[] = [player, ...rivals].sort((a, b) => b.score - a.score);
    for (let i = 0; i < standings.length; i++) standings[i].setUnderdog(i >= 4); // 5th place onward
    const leader = standings[0];
    const shed = leader.applyLeaderDecay(dtSec);
    if (shed > 0) {
      // v7 §1: debug — confirm leader decay applies (to bots too), throttled to ~1/s
      decayLogAccum += dt;
      if (decayLogAccum >= 1000) {
        decayLogAccum = 0;
        const who = leader === player ? 'YOU' : (leader as Rival).name;
        console.debug(`[decay] leader ${who} shed ${shed.toFixed(2)}px → r=${leader.radius.toFixed(1)} (${(CONFIG.LEADER_DECAY_RATE * 100).toFixed(1)}%/s)`);
      }
    }
  }

  function openBoonPick() {
    // v7 §5: draw WITHOUT replacement — retire any power-up already at max level
    const pool = CONFIG.BOONS.filter((b) => (boonRank.get(b.id) || 0) < BOON_MAX_LEVEL);
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
          if (player.shieldCharge) {
            // v7 §5: BUBBLE SHIELD blocks this chomp, pops with a burst, then is gone
            player.shieldCharge = false;
            const bi = activeBoons.findIndex((b) => b.id === 'shield');
            if (bi >= 0) activeBoons.splice(bi, 1);
            fx.addConfetti(player.x, player.y, CONFIG.COLORS.pops);
            fx.addRing(player.x, player.y, '#8AB0FF', player.radius, player.radius + 170, 6, 480);
            fx.shake(220, 11); fx.flash();
            banner('BUBBLE SHIELD popped!', '#8AB0FF');
            console.log('[boon] BUBBLE SHIELD blocked a chomp');
          } else {
            const pr = player.radius;
            fx.shake(360, 16); fx.flash();
            audio.playEaten(); // v5 §5: descending wah when you get eaten
            player.getEaten();
            r.eatVoid(pr);
            banner(`${r.name} devoured you — ghosting!`, '#FF6B6B');
          }
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

    // ── camera: zoom OUT as the player grows (v5 §1 / v10 §4: WORLD ENDER extends to 2200) ──
    const isWorldEnder = player.formIndex >= CONFIG.FORMS.length - 1;
    const viewMax = isWorldEnder ? 2200 : CONFIG.CAM_VIEW_MAX;
    const viewHeight = clamp(
      CONFIG.CAM_VIEW_BASE + (player.radius - CONFIG.PLAYER_BASE_RADIUS) * CONFIG.CAM_VIEW_GROWTH,
      CONFIG.CAM_VIEW_BASE, viewMax,
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
    // v8 §3: WORLD EATER — constant 1px screen rumble while moving
    let rmbX = 0, rmbY = 0;
    if (player && player.formIndex >= CONFIG.FORMS.length - 1 && Math.hypot(player.vx, player.vy) > 20) {
      rmbX = (Math.random() - 0.5) * 2; rmbY = (Math.random() - 0.5) * 2;
    }
    ctx.translate(fw / 2 + shake.x + rmbX, fh / 2 + shake.y + rmbY);
    ctx.scale(camZoom, camZoom);
    ctx.translate(-camCX, -camCY);

    world.drawGround(ctx, view, clock, player?.x ?? camCX, player?.y ?? camCY);
    world.drawDressing(ctx, view, clock, camZoom);
    world.draw(ctx, clock, view);
    events.draw(ctx, clock); // v6 §5: storm cloud + firetrucks (world space)
    for (const r of rivals) r.draw(ctx, clock, alpha);
    drawPowerAuras(clock); // v6 §4: auras under the player
    player.draw(ctx, clock, alpha);
    if (gnomeLord) drawGnomeCrown(clock); // v9 §8: secret GNOME LORD crown
    drawFormBadge(); // v10 §5: form name pill under player (and DEVOURER+ rivals)

    if (!paused) fx.update(frameDt);
    fx.draw(ctx);
    ctx.restore();

    // v6 §8: environment post-processing (grain + vignette), under the HUD
    drawPostFX(clock);

    // screen-space FX + HUD
    fx.drawFlash(ctx, fw, fh);

    if (screen === 'game') {
      drawHUD();
      if (countdown > 0) drawCountdown();
      else drawJoystickHint();
    }
  }

  // v8 §1: giant frozen "3..2..1" with a per-number pop-in
  function drawCountdown() {
    const n = Math.ceil(countdown / 1200);
    if (n < 1) return;
    const inStep = countdown - (n - 1) * 1200; // ms remaining within this number
    const age = 1200 - inStep;                 // ms since it appeared
    const pop = clamp(age / 200, 0, 1);
    const scale = 0.55 + pop * 0.45 + Math.sin(pop * Math.PI) * 0.12;
    ctx.save();
    ctx.translate(fw / 2, fh * 0.42);
    ctx.scale(scale, scale);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '800 130px Fredoka, sans-serif';
    ctx.lineWidth = 10;
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.strokeText(String(n), 0, 0);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(String(n), 0, 0);
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
    // v8 §3: running "% OF TOWN DEVOURED" under the score
    if (world) {
      const dv = world.initialMass > 0 ? (world.eatenArea / world.initialMass) * 100 : 0;
      ctx.fillStyle = 'rgba(255,255,255,0.65)';
      ctx.font = '700 14px Fredoka, sans-serif';
      ctx.fillText(`${dv.toFixed(0)}% DEVOURED`, scoreRight, player.combo > 1 ? 78 : 56);
    }

    // leaderboard (top left, dark backdrop, dropped below the timer so it never
    // overlaps the centred timer/bar at narrow widths e.g. 375px)
    // v9 §1: crowns render ONLY for voids currently in the final (WORLD ENDER) form
    const finalForm = CONFIG.FORMS.length - 1;
    const board = [
      { name: 'You', score: player.score, color: player.skin.glowColor, me: true, final: player.formIndex >= finalForm },
      ...rivals.map((r) => ({ name: r.name, score: r.score, color: r.skin.bodyColor, me: false, final: r.formIndex >= finalForm })),
    ].sort((a, b) => b.score - a.score);
    const LB_X = 8, LB_W = 150, LB_TOP = 84, ROW = 20;
    const lbH = board.length * ROW + 12;
    ctx.fillStyle = 'rgba(20,8,43,0.55)';
    roundRectFill(ctx, LB_X, LB_TOP, LB_W, lbH, 10);
    // v7 §7: clip rows to the backdrop so long names / crowns never bleed out
    ctx.save();
    ctx.beginPath();
    ctx.rect(LB_X, LB_TOP, LB_W, lbH);
    ctx.clip();
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
      // v9 §1: crown only voids currently at the final form on the leaderboard
      if (e.final) drawMiniCrown(LB_X + 42 + ctx.measureText(nm).width, y - 8);
      ctx.textAlign = 'right';
      ctx.fillText(String(e.score), LB_X + LB_W - 8, y);
      ctx.textAlign = 'left';
    }
    ctx.restore();

    // v8 §6: unified callout — bouncy scale-in, 900ms hold, whoosh-out, one at a time
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (!callout && calloutQueue.length) {
      calloutQueue.sort((a, b) => b.priority - a.priority);
      callout = { ...calloutQueue.shift()!, t: 0 };
      audio.whoosh();
      audio.duckMusic();
      if (callout.pulse) borderPulse = 900;
    }
    if (callout) {
      if (!paused) callout.t += 16;
      const IN = 260, HOLD = 900, OUT = 260, total = IN + HOLD + OUT;
      let scale = 1, alpha = 1, dx = 0;
      if (callout.t < IN) {
        const p = callout.t / IN;
        const c1 = 1.70158, c3 = c1 + 1;
        scale = 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); // easeOutBack
        alpha = clamp(p * 1.6, 0, 1);
      } else if (callout.t > IN + HOLD) {
        const p = (callout.t - IN - HOLD) / OUT;
        alpha = 1 - p;
        dx = p * p * 70; // whoosh out to the right
      }
      const cy = fh * 0.2;
      ctx.save();
      ctx.globalAlpha = clamp(alpha, 0, 1);
      ctx.translate(fw / 2 + dx, cy);
      ctx.scale(scale, scale);
      ctx.font = '800 35px Fredoka, sans-serif'; // v9 §5: banners 30% bigger
      ctx.lineWidth = 8;
      ctx.strokeStyle = 'rgba(20,8,43,0.7)';
      ctx.strokeText(callout.text, 0, 0);
      ctx.fillStyle = callout.color;
      ctx.fillText(callout.text, 0, 0);
      if (callout.sparkles) {
        const w = ctx.measureText(callout.text).width;
        for (let s = 0; s < 5; s++) {
          const sa = (roundElapsed / 200 + s * 1.3);
          const sx = (Math.sin(sa) * (w / 2 + 16));
          const sy = Math.cos(sa * 1.4) * 16;
          ctx.fillStyle = '#FFF3B0';
          ctx.beginPath(); ctx.arc(sx, sy, 2.2, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.restore();
      if (callout.t >= total) callout = null;
    }
    ctx.textBaseline = 'alphabetic';
    // v8 §7: FRENZY MINUTE — warm glow along the screen edges
    if (events.frenzyActive) {
      const pulse = 0.5 + Math.sin(roundElapsed / 180) * 0.25;
      const grad = ctx.createLinearGradient(0, 0, 0, fh);
      grad.addColorStop(0, `rgba(255,150,60,${0.34 * pulse})`);
      grad.addColorStop(0.16, 'rgba(255,150,60,0)');
      grad.addColorStop(0.84, 'rgba(255,150,60,0)');
      grad.addColorStop(1, `rgba(255,150,60,${0.34 * pulse})`);
      ctx.save();
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, fw, fh);
      const gradX = ctx.createLinearGradient(0, 0, fw, 0);
      gradX.addColorStop(0, `rgba(255,120,40,${0.28 * pulse})`);
      gradX.addColorStop(0.14, 'rgba(255,120,40,0)');
      gradX.addColorStop(0.86, 'rgba(255,120,40,0)');
      gradX.addColorStop(1, `rgba(255,120,40,${0.28 * pulse})`);
      ctx.fillStyle = gradX;
      ctx.fillRect(0, 0, fw, fh);
      ctx.restore();
    }
    // v8 §6: RAMPAGE! screen-border pulse
    if (borderPulse > 0) {
      if (!paused) borderPulse -= 16;
      const pa = (Math.sin(borderPulse / 55) * 0.5 + 0.5) * clamp(borderPulse / 900, 0, 1) * 0.6;
      ctx.save();
      ctx.globalAlpha = pa;
      ctx.lineWidth = 12;
      ctx.strokeStyle = '#FF5A3C';
      ctx.strokeRect(6, 6, fw - 12, fh - 12);
      ctx.restore();
    }

    // v7 §7: evolution progress as a bottom-center pill — glowing fill, form
    // labels inside, raised off the bottom edge to clear the device safe area.
    const forms = CONFIG.FORMS;
    const fi = player.formIndex;
    const SAFE_B = 26;                                   // reserve for home indicator
    const pillW = Math.min(260, fw * 0.68), pillH = 22;
    const pillX = fw / 2 - pillW / 2, pillY = fh - SAFE_B - pillH;
    ctx.textAlign = 'center';
    if (fi < forms.length - 1) {
      const cur = forms[fi].radius, next = forms[fi + 1].radius;
      const prog = clamp((player.radius - cur) / (next - cur), 0, 1);
      // pill track
      ctx.fillStyle = 'rgba(20,8,43,0.62)';
      roundRectFill(ctx, pillX, pillY, pillW, pillH, pillH / 2);
      // glowing fill
      ctx.save();
      ctx.beginPath();
      ctx.rect(pillX, pillY, pillW * prog, pillH);
      ctx.clip();
      ctx.shadowColor = '#C77DFF';
      ctx.shadowBlur = 14;
      ctx.fillStyle = '#C77DFF';
      roundRectFill(ctx, pillX, pillY, pillW, pillH, pillH / 2);
      ctx.restore();
      // labels inside the pill
      ctx.font = '800 11px Fredoka, sans-serif';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'left';
      ctx.fillText(forms[fi].name, pillX + 12, pillY + pillH / 2 + 1);
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.textAlign = 'right';
      ctx.fillText(forms[fi + 1].name, pillX + pillW - 12, pillY + pillH / 2 + 1);
      ctx.textBaseline = 'alphabetic';
    } else {
      ctx.save();
      ctx.shadowColor = '#FFD23F';
      ctx.shadowBlur = 16;
      ctx.fillStyle = 'rgba(20,8,43,0.62)';
      roundRectFill(ctx, pillX, pillY, pillW, pillH, pillH / 2);
      ctx.fillStyle = '#FFD23F';
      ctx.font = '800 14px Fredoka, sans-serif';
      ctx.textBaseline = 'middle';
      ctx.fillText('★ WORLD ENDER ★', fw / 2, pillY + pillH / 2 + 1);
      ctx.textBaseline = 'alphabetic';
      ctx.restore();
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
    // v7 §5: Level II badge
    if (b.level >= 2) {
      ctx.fillStyle = '#FFD23F';
      ctx.font = '700 9px Fredoka, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('II', r - 1, -r + 1);
    }
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
      case 'echo': return '#7DF9FF';
      case 'shield': return '#8AB0FF';
      case 'dash': return '#5AFFA0';
      case 'lucky': return '#FFC24B';
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
      // v7 §6: keep every aura ring within radius+40 no matter how many stack
      const auraOff = Math.min(40, 9 + i * 6);
      ctx.arc(player.x, player.y, (player.radius + auraOff) * pulse, 0, Math.PI * 2);
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
    grd.addColorStop(1, 'rgba(10,4,24,0.03)'); // v10 §2: barely-there vignette (was 0.45)
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
  // v10 §5: form-name pill badge drawn in world space, always ~10 screen-px tall.
  // Full opacity for 2s after evolving; 40% afterwards. Rivals shown at DEVOURER+.
  function drawFormBadge() {
    if (!player || camZoom < 0.05) return;
    const fs = Math.max(5, 10 / camZoom); // constant ~10 screen-px regardless of zoom

    function drawOneBadge(bx: number, by: number, br: number, name: string, alpha: number) {
      if (!name) return;
      const txt = name.toUpperCase();
      ctx.save();
      ctx.font = `600 ${fs}px Fredoka, sans-serif`;
      const tw = ctx.measureText(txt).width;
      const pillH = fs * 2.0;
      const pillW = tw + pillH;
      const pillX = bx - pillW / 2;
      // Orbit chips sit at r + ORBIT_RADIUS_OFFSET (26) + chip radius (~11) = r + 37.
      // Place badge top edge just below that to guarantee no overlap.
      const pillY = by + br + 44 + pillH / 2;
      const rr = pillH / 2;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = 'rgba(0,0,0,0.60)';
      ctx.beginPath();
      (ctx as CanvasRenderingContext2D & { roundRect: (...a: any[]) => void })
        .roundRect(pillX, pillY - pillH / 2, pillW, pillH, rr);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(txt, bx, pillY);
      ctx.restore();
    }

    const fullOpacity = roundElapsed - lastEvoElapsed < 2000;
    drawOneBadge(player.x, player.y, player.radius, player.formName, fullOpacity ? 1.0 : 0.4);

    // Rivals: only show when at DEVOURER form or beyond (formIndex ≥ 3)
    const devoIdx = CONFIG.DEVOURER_FORM_INDEX ?? 3;
    for (const r of rivals) {
      if (!r.alive || r.formIndex < devoIdx) continue;
      const rname = CONFIG.FORMS[r.formIndex]?.name || '';
      drawOneBadge(r.x, r.y, r.radius, rname, 0.4);
    }
  }

  // v9 §8: a little golden crown floating above the GNOME LORD (secret reward)
  function drawGnomeCrown(clock: number) {
    if (!player) return;
    const cw = Math.max(18, player.radius * 0.7);
    const cy = player.y - player.radius - cw * 0.9 - Math.sin(clock / 400) * 3;
    ctx.save();
    ctx.translate(player.x, cy);
    ctx.fillStyle = '#FFD23F';
    ctx.strokeStyle = '#B8860B';
    ctx.lineWidth = Math.max(1, cw * 0.06);
    ctx.beginPath();
    ctx.moveTo(-cw / 2, cw * 0.35);
    ctx.lineTo(-cw / 2, -cw * 0.15);
    ctx.lineTo(-cw / 4, cw * 0.1);
    ctx.lineTo(0, -cw * 0.32);
    ctx.lineTo(cw / 4, cw * 0.1);
    ctx.lineTo(cw / 2, -cw * 0.15);
    ctx.lineTo(cw / 2, cw * 0.35);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    // gem dots
    for (const gx of [-cw / 3, 0, cw / 3]) {
      ctx.fillStyle = gx === 0 ? '#FF6FB0' : '#8ECBFF';
      ctx.beginPath(); ctx.arc(gx, cw * 0.18, cw * 0.07, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function drawPostFX(clock: number) {
    // the grain tile never changes, so build its repeat pattern once
    if (!grainPattern) grainPattern = ctx.createPattern(getGrain(), 'repeat');
    if (grainPattern) {
      ctx.save();
      ctx.globalAlpha = 0.02; // v10 §2: lighter grain (was 0.035)
      ctx.globalCompositeOperation = 'overlay';
      const ox = (clock * 0.05) % 128, oy = (clock * 0.07) % 128;
      ctx.fillStyle = grainPattern;
      ctx.translate(-ox, -oy);
      ctx.fillRect(ox, oy, fw + 128, fh + 128);
      ctx.restore();
    }
    ctx.drawImage(getVignette(), 0, 0);

    // v9 §5: SHRINK STORM dims the scene 8%; METEOR SHOWER tints the sky warm
    if (events.stormActive) {
      ctx.save();
      ctx.globalAlpha = 0.08; ctx.fillStyle = '#0A1030';
      ctx.fillRect(0, 0, fw, fh);
      ctx.restore();
    }
    if (events.meteorActive) {
      ctx.save();
      ctx.globalCompositeOperation = 'overlay';
      ctx.globalAlpha = 0.12; ctx.fillStyle = '#FF8A3C';
      ctx.fillRect(0, 0, fw, fh);
      ctx.restore();
    }

    // v7 §6: WORLD EATER — reality warps ONLY at the screen edges (never a
    // character-attached ring), a pulsing violet edge bloom.
    if (player && player.formIndex >= CONFIG.FORMS.length - 1) {
      const pulse = 0.26 + Math.sin(clock / 260) * 0.12;
      const g = ctx.createRadialGradient(
        fw / 2, fh / 2, Math.min(fw, fh) * 0.44,
        fw / 2, fh / 2, Math.max(fw, fh) * 0.64,
      );
      g.addColorStop(0, 'rgba(199,125,255,0)');
      g.addColorStop(1, `rgba(199,125,255,${pulse})`);
      ctx.save();
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, fw, fh);
      ctx.restore();
    }
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

    if (screen === 'game' && !paused && countdown > 0) {
      // v8 §1: frozen pre-round — count down in real time, nobody moves or scores
      countdown -= delta;
      const n = Math.ceil(countdown / 1200); // 3 → 2 → 1
      if (n !== countStep && n >= 1) { countStep = n; audio.countBeep(n); }
      if (countdown <= 0) {
        countdown = 0;
        countStep = 0;
        audio.eatGo();
        banner('EAT!', '#5AFFA0');
        if (player) {
          fx.addRing(player.x, player.y, '#5AFFA0', player.radius, player.radius + 170, 6, 500);
          fx.addConfetti(player.x, player.y, ['#5AFFA0', '#FFD23F', '#FFFFFF']);
        }
        resetClock(); // don't let the frozen interval count as catch-up time
      }
    } else if (screen === 'game' && !paused) {
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
      level: meta.data.level,
      xpInLevel: meta.data.xp,
      xpNext: xpForLevel(meta.data.level),
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
    iapView(id) { track('iap_view', { id }); },
    iapPurchase(id) {
      // v7 §9: MOCK ONLY — no real payment. Unlock + equip the premium skin and
      // grant a +100 coin goodwill bonus.
      track('iap_click', { id });
      meta.unlockSkin(id);
      meta.equipSkin(id);
      meta.addCoins(100);
      notify();
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
