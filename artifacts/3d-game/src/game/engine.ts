import { CONFIG, type BoonDef, type SkinDef, type ObjectKind } from './config';
import { audio } from './audio';
import { FXManager, type FloatingText } from './fx';
import { WorldManager } from './world';
import { Player } from './player';
import { Void, setRoundElapsed } from './void';
import { makeRivals, type Rival, type WorldView } from './rivals';
import { meta } from './meta';
import { track } from './services';
import { formatTime, dist, clamp, lerp, xpForLevel } from './utils';
import { createJoystick } from './input';
import { EventManager } from './events';
import { loadIslandAssets, updateDrift, isWalkable, islandState, drawDebugMask, drawDebugTerrain, ISLAND_SRC_W } from './islandMap'; // Phase 2
import { extractionLog } from './spriteExtract'; // ?debug=sprites overlay
import { resetGroundCache, resetWaterfallState } from './drawMap'; // Prompt 6 §1/§3 lifecycle
import { loadWardAssets } from './wardSprites'; // War Pack §1
import { loadClayCity } from './clayCity'; // Prompt 3: clay building + house art swap
import { loadClayLife } from './clayLife'; // Prompt 4: clay people + vehicle art swap
import { loadClayScenery } from './clayScenery'; // Prompt 5: clay scenery scatter
import { loadClayFood } from './clayFood'; // Prompt 9: clay food + street-furniture art swap

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
  killedBy?: string;      // Phase 7b §4: name of the void that eliminated the player
  skinTease?: { botName: string; skinName: string; skinId: string } | null; // v7 §8
  // v7 §11: player-level meta
  xpGain: number;
  level: number;
  xpInLevel: number;
  xpNext: number;
  leveledTo: number | null;   // top level reached this round, or null
  district?: string;          // v13 §1: district where the player ended up
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
  trophies: { earned: string[]; counters: import('./meta').TrophyCounters }; // v12 §5
  // v15
  radii: Array<{name:string; radius:number; mass:number; score:number; overLaw:boolean}>;
  heldSpell: BoonDef | null;
  activeSpell: string | null;
  spellTimer: number;     // War Pack §3: ms remaining for active power (0 = none)
  spellTimerMax: number;  // War Pack §3: full power duration (for conic-gradient sweep)
  showHitboxes: boolean;
  // v16 (ticker removed in Fix 7 — events route to banner pill)
  contracts: Array<{id: string; name: string; done: boolean; reward: number}>;
  // Phase 7b
  killedBy?: string; // name of the void that eliminated the player (if eaten)
  planName?: string; // today's city plan name
  matchStartSeq: number; // Rebuild Prompt 10: increments once per real match start (drives the welcome/coaching intro)
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
  castSpell(): void;
  toggleHitboxes(): boolean;
  unlockAudio(): void;
  destroy(): void;
}

interface ActiveBoon { id: string; name: string; remaining: number; duration: number; level: number; }
// v8 §6: one managed callout component — stamped center-top, one at a time, priority ordered
interface Callout { text: string; color: string; priority: number; sparkles: boolean; pulse: boolean; }

// v12 §4: 7 weekday-specific daily modifiers (index = Date.getDay(), 0=Sun..6=Sat)
const DAILY_MODS = [
  { id: 'zoom',   name: 'ZOOM ZOOM',      desc: 'All voids move 20% faster today.' },        // Sun
  { id: 'gnome',  name: 'GNOME DAY',      desc: 'Gnomes are worth 5× score today.' },         // Mon
  { id: 'golden', name: 'GOLDEN HOUR',    desc: 'Golden snacks spawn twice as fast.' },        // Tue
  { id: 'tiny',   name: 'TINY TOWN',      desc: 'Every object is a bit smaller today.' },      // Wed
  { id: 'merge',  name: 'MEGA MERGE',     desc: 'Only 2 matches needed for a TRIPLE.' },       // Thu
  { id: 'frenzy', name: 'FRENZY FRIDAY',  desc: 'Eat streaks last twice as long.' },           // Fri
  { id: 'double', name: 'DOUBLE SCORE',   desc: 'All score is doubled today.' },               // Sat
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
  let matchStartSeq = 0;        // Rebuild Prompt 10: increments once per real match start (never on boon/resume)
  let crackTimer = 0;          // v8 §3: WORLD EATER cracked-trail cadence
  // v15 §3 → War Pack §3: power system
  let heldSpell: BoonDef | null = null;
  let activeSpell: string | null = null;
  let queuedSpell: string | null = null; // Phase 7a §2: queued auto-cast while a spell is active
  let spellTimer = 0;
  let spellTimerMax = 0;          // War Pack §3: full duration for radial sweep HUD
  let showHitboxes = false;
  // War Pack §2: defense wave state
  let defensePhase = 0;           // 0=none 1=police 2=army 3=tanks 4=helis
  let defenseSpawnCd = 0;         // ms until next wave reinforcement
  const defensePellets: Array<{x:number;y:number;vx:number;vy:number;life:number}> = [];
  // Life Pack §4: tank shells + missile-truck rockets (show landing circle before impact)
  const defenseShells: Array<{tx:number;ty:number;warnT:number;warnMax:number;rocket:boolean}> = [];
  // Phase 7b §5: heli missile — 0.8s red-line warning then impact (4% score chip)
  const heliMissiles: Array<{tx:number;ty:number;fromX:number;fromY:number;warnT:number}> = [];
  // War Pack §3: SINGULARITY black hole
  let singularity: {x:number;y:number;timer:number;score:number}|null = null;
  // War Pack §2: ms of red pellet-hit overlay remaining
  let pelletHitFlash = 0;
  // Fix 2: ?debug=mask tints non-walkable cells red for mask verification
  const debugMask     = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === 'mask';
  const debugTerrain  = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === 'terrain';
  const debugSprites  = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === 'sprites';
  const debugFps      = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === 'fps';
  // v16 §5: news ticker + contracts
  let currentTicker: string | null = null;
  let tickerCd = 0; // ms until next ticker fires
  let activeContracts: Array<{id: string; name: string; done: boolean; reward: number}> = [];
  const TICKER_LINES = [
    '🏙️ City hall reports mild seismic activity in the downtown core',
    '🍎 Local orchards report bumper crop — apples spotted rolling down Main St',
    '🐦 Flocks of birds flee rooftops as enormous presence detected nearby',
    '🚰 Fire dept confirms hydrant on Elm Ave missing — residents puzzled',
    '🏠 Several homeowners file complaints after house vanishes overnight',
    '⚡ Traffic cameras offline after ominous shadow passes through grid',
    '🌊 Coastal observers report strange tide patterns near the beach',
    '🌳 Parks dept urges calm after trees reportedly "uprooted themselves"',
    '📰 Eyewitnesses claim to see something enormous eating a school bus',
    '🛸 Area man insists orb in sky is just weather balloon — film at 11',
    '🐕 Missing dog reports surge as neighbourhood pets go for "unexpected walks"',
    '☕ Café owners baffled as tables, chairs vanish mid-morning rush',
    '🚨 Police ask residents to remain indoors during "ongoing situation"',
    '🦀 Crab population on SANDY SHORES up 300% — scientists call it "unusual"',
    '🏗️ Downtown construction halted after crane operator reports unbelievable sight',
    '🎪 Gnome collectors alarmed as garden ornaments reported missing citywide',
  ];
  // Phase 7b §3: secondary news banner — 4 tiers keyed by % of city devoured
  const NEWS_TIER: string[][] = [
    [ // tier 0: < 3%
      'NEWS: Mayor declares National Badminton Day',
      'NEWS: Local gnome wins citywide bake-off',
      'NEWS: City council debates bench comfort standards',
      'NEWS: Pigeon elected honorary citizen by unanimous vote',
      'NEWS: Community garden reports suspicious shadow but no losses',
    ],
    [ // tier 1: 3–10%
      'NEWS: Residents report a large purple concern downtown',
      'NEWS: Mayor: "It is probably nothing." Press conference cancelled',
      'NEWS: Sinkhole experts baffled — and also missing',
      'NEWS: Citywide hotline established; immediately eaten',
      'NEWS: Real-estate prices fall amid "unexplained absences"',
    ],
    [ // tier 2: 10–20%
      'NEWS: MAYOR DENIES VOID FROM HELICOPTER',
      'NEWS: Property values plummet into actual void',
      'NEWS: School replaces fire drill with void drill',
      'NEWS: Downtown "slightly less tall" this morning, residents confirm',
      'NEWS: Area scientists confirm: something is very, very wrong',
    ],
    [ // tier 3: > 20%
      'NEWS: GENERAL: WE TRIED BULLETS.',
      'NEWS: Badminton Day cancelled. City too void.',
      'NEWS: MAYOR: PLEASE. IT ATE MY HOUSE. PLEASE.',
      'NEWS: Scientists confirm city is measurably smaller. "Not great," says scientist.',
      'NEWS: Live coverage suspended. Camera also gone.',
    ],
  ];

  // Fix 7: route ticker lines to the banner pill (news ticker removed from UI)
  function queueTicker(line: string, _durationMs = 6500) {
    banner(line, '#9AAFC8', 2);
  }

  const CONTRACT_POOL = [
    { id: 'eat_houses', name: 'Eat 3 houses', reward: 40 },
    { id: 'eat_cars', name: 'Eat 5 cars', reward: 35 },
    { id: 'eat_gnomes', name: 'Eat all gnomes', reward: 60 },
    { id: 'reach_gobbler', name: 'Reach GOBBLER form', reward: 50 },
    { id: 'eat_beach', name: 'Eat 8 beach items', reward: 45 },
    { id: 'eat_downtown', name: 'Eat 5 downtown props', reward: 40 },
    { id: 'eat_people', name: 'Eat 10 people', reward: 30 },
    { id: 'first_place', name: 'Lead at 1:00 left', reward: 55 },
  ] as const;
  // track progress for contract checking
  const contractProgress: Record<string, number> = {};

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
  // v12 §2: FINAL FEAST state
  let finalFeastFired = false;
  let finalFeastActive = false;
  // Phase 7b §6: FEEDING FRENZY — triggers at 60 s remaining
  let feedingFrenzyFired = false;
  let feedingFrenzyActive = false;
  // Phase 7b §4: killer name for game-over banner / results
  let killedBy = '';
  // Phase 7b §3: secondary news banner
  let newsText = '';
  let newsAlpha = 0;
  let newsTimer = 0;
  let newsCd = 12000; // first news at ~12 s so it doesn't clash with opening beat
  // v16.2 §1: event-based ticker gate flags (prevent repeat fires per round)
  let openingBeatDone = false;
  let roundStartTickerDone = false; // separate gate for the 3s round-start line
  let firstHouseTickerDone = false;
  let zooBreakTickerDone = false;
  let townhallTickerDone = false;
  let devoured15Done = false;
  // Feedback Juice §2: gold milestone banners — fire once per match (reset in start())
  let milestoneForms: boolean[] = [];          // per evolution form index
  const milestonePctFired = new Set<number>(); // 25/50/75/100 % devoured
  // v12 §4: daily mod effect flags (reset in start())
  let dailyFrenzyWindow = 1200;    // ms window for eat streaks (FRENZY FRIDAY → 2400)
  let dailyGoldenInterval = -1;   // -1 = use CONFIG.GOLDEN_INTERVAL; override for GOLDEN HOUR
  let dailyZoomies = 1;            // speed multiplier applied at round start (ZOOM ZOOM → 1.2)
  let dailyAllTiny = false;        // TINY TOWN: shrink all objects one tier
  // v12 §5: per-round trophy tracking
  let roundTriples = 0;
  let roundRivalEats = 0;
  // v13 §1: district where the player ended the round
  let playerDistrict = 'MAPLE COURT';

  const fx = new FXManager();
  // Phase 2: load island assets once at engine creation (async, fallback-safe)
  // Fix 3: once mask is ready, remove any initial props that landed in space
  loadIslandAssets(import.meta.env.BASE_URL).then(() => {
    if (world) world.filterNonWalkable();
  }).catch(() => {});

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
    // v14 §1: async — loads CC0 OGG samples in background; synth fallback until ready
    audio.loadSamples().catch(() => {});
    isDaily = daily;
    // Reset all per-round flags FIRST, then apply the selected daily mod below
    baseGreed = 1;
    coinMult = 1;
    dailyFrenzyWindow = 1200;
    dailyGoldenInterval = -1;
    dailyZoomies = 1;
    dailyAllTiny = false;
    let startRadius = CONFIG.PLAYER_BASE_RADIUS;
    let duration = CONFIG.GAME_DURATION * 1000;

    let seed = 'run_' + Math.floor(Math.random() * 1e9);
    if (daily && dailyData) {
      seed = dailyData.seed;
      switch (dailyData.id) {
        case 'zoom':   dailyZoomies = 1.2;  break;           // ZOOM ZOOM
        case 'gnome':  /* applied after player created */ break;
        case 'golden': dailyGoldenInterval = CONFIG.GOLDEN_INTERVAL * 0.5; break; // GOLDEN HOUR: 2× rate
        case 'tiny':   dailyAllTiny = true;  break;           // TINY TOWN
        case 'merge':  /* handled via player.twinMerge below */ break;
        case 'frenzy': dailyFrenzyWindow = 2400; break;       // FRENZY FRIDAY: 2× streak window
        case 'double': baseGreed = 2; coinMult = 2; break;    // DOUBLE SCORE
      }
    }

    world = new WorldManager(CONFIG.MAP_SIZE);
    world.init(seed);
    // Prompt 6 §1/§3: honour the cache/waterfall lifecycle contract at match start.
    resetGroundCache();
    resetWaterfallState();

    const skin = skinById(meta.data.equippedSkin);
    const c = CONFIG.MAP_SIZE / 2;
    if (!player) player = new Player(skin);
    player.reset(c, c, skin);
    player.radius = startRadius;
    // v12 §4: daily mod post-player-init effects
    if (daily && dailyData) {
      if (dailyData.id === 'gnome') player.gnomeScoreMult = 5;
      if (dailyData.id === 'zoom')  player.speedMultiplier = Math.max(player.speedMultiplier, dailyZoomies);
      if (dailyData.id === 'merge') player.twinMerge = true; // pre-grant MEGA MERGE
    }
    // TINY TOWN: shrink all world objects one size tier
    if (dailyAllTiny) {
      for (const obj of world.objects) { obj.size = Math.max(8, obj.size * 0.72); obj.baseSize = obj.size; }
    }

    rivals = makeRivals();
    for (let i = 0; i < rivals.length; i++) {
      const a = (i / rivals.length) * Math.PI * 2;
      const rr = CONFIG.MAP_SIZE * 0.32;
      // Alive Pack §A: walk spawn inward until it lands on the island
      let spawnX = c + Math.cos(a) * rr;
      let spawnY = c + Math.sin(a) * rr;
      for (let si = 0; si < 24 && !isWalkable(spawnX, spawnY); si++) {
        const scale = 1 - (si + 1) * 0.042;
        spawnX = c + Math.cos(a) * rr * scale;
        spawnY = c + Math.sin(a) * rr * scale;
      }
      rivals[i].spawn(spawnX, spawnY, CONFIG.PLAYER_BASE_RADIUS);
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
    // War Pack: reset power + defense state each round
    heldSpell = null; activeSpell = null; queuedSpell = null; spellTimer = 0; spellTimerMax = 0;
    defensePhase = 0; defenseSpawnCd = 0; defensePellets.length = 0; defenseShells.length = 0;
    singularity = null; pelletHitFlash = 0;
    finalFeastFired = false; finalFeastActive = false;
    feedingFrenzyFired = false; feedingFrenzyActive = false;
    killedBy = ''; roundEnded = false;
    newsText = ''; newsAlpha = 0; newsTimer = 0; newsCd = 12000;
    defenseShells.length = 0; heliMissiles.length = 0;
    openingBeatDone = false;
    roundStartTickerDone = false;
    firstHouseTickerDone = false;
    zooBreakTickerDone = false;
    townhallTickerDone = false;
    devoured15Done = false;
    milestoneForms = [];              // Feedback Juice §2
    milestonePctFired.clear();        // Feedback Juice §2
    roundTriples = 0;
    roundRivalEats = 0;
    events.reset();
    fx.particles.length = 0;
    fx.texts.length = 0;
    fx.rings.length = 0;
    fx.clearCoins(); // Feedback Juice §3: no coin carryover between rounds

    // v5 §1: spawn already correctly framed (no zoom-in animation)
    camCX = player.x;
    camCY = player.y;
    camLookX = camLookY = 0;
    const startView = clamp(
      CONFIG.CAM_VIEW_BASE + (player.radius - CONFIG.PLAYER_BASE_RADIUS) * CONFIG.CAM_VIEW_GROWTH,
      CONFIG.CAM_VIEW_BASE, CONFIG.CAM_VIEW_MAX,
    );
    // Phase 4 §5: no zoom cap — vector ground is crisp at any magnification.
    camZoom = fh / startView;

    audio.startMusic();
    // War Pack §1: load sprite sheets (fire-and-forget; resolves within the first round)
    void loadWardAssets(import.meta.env.BASE_URL);
    void loadClayCity(import.meta.env.BASE_URL); // Prompt 3: clay building + house art swap
    void loadClayLife(import.meta.env.BASE_URL); // Prompt 4: clay people + vehicle art swap
    void loadClayScenery(import.meta.env.BASE_URL); // Prompt 5: clay scenery scatter
    void loadClayFood(import.meta.env.BASE_URL); // Prompt 9: clay food + street-furniture art swap

    results = null;
    screen = 'game';
    matchStartSeq++; // Rebuild Prompt 10: fires the welcome/coaching intro exactly once per real match start
    countdown = CONFIG.COUNTDOWN_MS; // v8 §1: freeze everyone through "3..2..1"
    countStep = 0;
    joystick.setEnabled(true);
    resetClock();
    // v16 §5: news ticker — first line fires 20s in, then every 30s
    currentTicker = null;
    tickerCd = 20000;
    // v16 §5: pick 3 contracts for this round
    const shuffledContracts = [...CONTRACT_POOL].sort(() => Math.random() - 0.5).slice(0, 3);
    activeContracts = shuffledContracts.map((c) => ({ ...c, done: false }));
    for (const k of Object.keys(contractProgress)) delete contractProgress[k];
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
    // Phase 7a §2: spell pickups auto-cast after a 0.6s charge sparkle (no tap button)
    if (id.startsWith('spell_')) {
      const spellId = id.replace('spell_', '');
      const spellDef = CONFIG.SPELLS.find((s) => s.id === spellId);
      if (spellDef) {
        boonChoices = [];
        screen = 'game';
        joystick.setEnabled(true);
        resetClock();
        banner('✨ ' + spellDef.name + ' CHARGING!', spellDef.color ?? '#7BFFED', 1);
        audio.playBoon();
        if (player) fx.addRing(player.x, player.y, spellDef.color ?? '#7BFFED', 0, player.radius * 2.5, 8, 700);
        window.setTimeout(() => {
          if (!player) return;
          if (activeSpell) { queuedSpell = spellId; notify(); return; } // queue if busy
          _executeCast(spellId);
        }, 600);
        notify();
      }
      return;
    }
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

  let roundEnded = false; // Phase 7b: idempotency guard — endRound() must only fire once per round
  function endRound() {
    if (!player || !world) return;
    if (roundEnded) return; // guard against duplicate calls (e.g. timer expires while death timeout pending)
    roundEnded = true;
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

    // v12 §5: trophy counter updates
    meta.updateTrophyCounter('totalBites', world.playerStats.count, 'sum');
    meta.updateTrophyCounter('totalTriples', roundTriples, 'sum');
    meta.updateTrophyCounter('bestRoundBites', world.playerStats.count, 'max');
    meta.updateTrophyCounter('bestDucks', world.playerStats.ducks, 'max');
    meta.updateTrophyCounter('bestDevoured', Math.round(devoured), 'max');
    if (gnomeLord) meta.updateTrophyCounter('gnomeLordTotal', 1, 'sum');
    if (crown) meta.updateTrophyCounter('totalWins', 1, 'sum');
    if (worldEater) meta.updateTrophyCounter('worldEnder', 1, 'sum');
    if (crown) meta.earnTrophy('first_win');
    if (gnomeLord) meta.earnTrophy('gnome_lord');
    if (world.zooSmashed) meta.earnTrophy('zoo_break');
    if (world.townhallEaten) meta.earnTrophy('democracy');
    if (player.score >= 1000) meta.earnTrophy('score_1000');
    if (player.score >= 5000) meta.earnTrophy('score_5000');
    if (player.score >= 10000) meta.earnTrophy('score_10000');
    if (player.formIndex >= 1) meta.earnTrophy('form_bite');
    if (player.formIndex >= 3) meta.earnTrophy('form_devourer');
    if (worldEater) meta.earnTrophy('form_world_ender');
    if (devoured >= 50) meta.earnTrophy('devoured_50pct');
    if (devoured >= 100) meta.earnTrophy('devoured_100pct');
    if (world.playerStats.ducks >= 5) meta.earnTrophy('duck_5');
    if (maxCombo >= 10) meta.earnTrophy('combo_10');
    if (roundTriples >= 3) meta.earnTrophy('triple_combo');
    if (roundRivalEats >= 1) meta.earnTrophy('void_eater');
    if (roundRivalEats >= 5) meta.earnTrophy('void_destroyer');
    if (isDaily) meta.earnTrophy('daily_player');
    if (isDaily && crown) meta.earnTrophy('daily_winner');
    finalFeastFired = false; finalFeastActive = false;

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

    // v13 §1: district where the player ended the round
    const finalDistrict = world ? world.districtAt(player.x, player.y) : 'MAPLE COURT';
    playerDistrict = finalDistrict;

    results = {
      score: player.score, placement, total: board.length, devoured,
      coins, isDaily, crown, highScore: meta.data.highScore, newBest,
      reachedForm: player.formName, reachedIndex: player.formIndex, worldEater,
      gnomeLord, killedBy: killedBy || undefined,
      skinTease,
      xpGain, level: meta.data.level, xpInLevel: meta.data.xp,
      xpNext: xpForLevel(meta.data.level), leveledTo,
      district: finalDistrict,
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
    // Feedback Juice §2: gold milestone banner on each new evolution stage (once
    // per match); a re-evolution after falling keeps the purple flavor banner.
    if (!milestoneForms[form]) {
      milestoneForms[form] = true;
      banner(name, '#FFD23F', 3, { sparkles: true });
    } else {
      banner('EVOLVED → ' + name, '#C77DFF');
    }
    // v16.2 §1: voice ticker on milestone evolutions
    if (form === 2) { // GOBBLER
      queueTicker('🚨 Traffic cameras detect enormous mass entering the downtown core!');
    } else if (form >= CONFIG.FORMS.length - 1) { // WORLD ENDER
      queueTicker('⚠️ EMERGENCY: Category-5 void event underway. Please eat indoors.');
    }
  }

  // ── simulation (fixed step) ──
  function simulate(dt: number) {
    if (!world || !player) return;

    timeLeft -= dt;
    roundElapsed += dt;
    setRoundElapsed(roundElapsed); // v15 §0: Growth Law ceiling

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

    player.suctionMult = 1;  // War Pack §3: reset each tick; EVENT_HORIZON overrides below
    player.magnetMultiplier = 1 + (mL ? (mL >= 2 ? 0.7 : 0.4) : 0); // GRAVITY GLUTTON: +40%/+70% reach
    // v12 §4: compose daily ZOOM ZOOM with boon ZOOMIES so neither overwrites the other
    player.speedMultiplier  = dailyZoomies * (1 + (oL ? (oL >= 2 ? 0.4 : 0.25) : 0));
    // v12 §4: compose daily MEGA MERGE with boon DOUBLE STOMACH
    player.twinMerge = hasBoon('twin') || (isDaily && dailyData?.id === 'merge');
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
    // Fix 4: coast water slow removed — island world has no coastal slow zone
    player.update(dt);

    // Phase 2 §2: ledge falloff — detect when player walks off the island
    if (!player.ghost && player.fallState === 'none') {
      if (!isWalkable(player.x, player.y)) {
        player.startFall();
        audio.playFalloff(); // Sound Pack §7: slide-whistle + poof
        fx.shake(200, 6);
      }
    }
    // Phase 7b §4: fall → drop one stage (at VOIDLING: −15% score sting, run continues)
    if (player.fallState === 'falling' && player.fallTimer <= 0) {
      const cx = CONFIG.MAP_SIZE / 2, cy = CONFIG.MAP_SIZE / 2;
      if (player.formIndex <= 0) {
        // VOIDLING can't drop further — 15% score penalty instead
        player.score = Math.max(0, Math.floor(player.score * 0.85));
        player.respawnFromFall(cx, cy);
        banner('Fell off the island! −15% score 😵', '#FF6B6B', 3, { pulse: true });
      } else {
        const fromName = player.formName;
        player.dropStage();
        player.respawnFromFall(cx, cy);
        player.ghostTime = Math.max(player.ghostTime, 3000);
        fx.addRing(cx, cy, '#FF6B6B', 0, player.radius * 3, 8, 600);
        banner(`Fell off! ↓ ${fromName} → ${player.formName} — 3s shield`, '#FF6B6B', 3, { pulse: true });
      }
    }

    // War Pack §3: TIME WARP — rivals + world move at 40% speed, player runs full dt
    const twDt = (activeSpell === 'time_warp' && spellTimer > 0) ? dt * 0.4 : dt;

    // rivals
    for (let i = 0; i < rivals.length; i++) {
      const others: WorldView['voids'] = [{ x: player.x, y: player.y, radius: player.ghost ? 0.001 : player.radius }];
      for (let j = 0; j < rivals.length; j++) {
        if (j !== i && rivals[j].alive && !rivals[j].ghost) {
          others.push({ x: rivals[j].x, y: rivals[j].y, radius: rivals[j].radius });
        }
      }
      rivals[i].update(twDt, { objects: world.objects, voids: others, map: CONFIG.MAP_SIZE, elapsed: roundElapsed, playerScore: player?.score ?? 0, playerRadius: player?.radius ?? CONFIG.PLAYER_BASE_RADIUS });
    }

    // objects (suction + eat + living-world AI)
    world.respawnMult = feedingFrenzyActive ? 3 : finalFeastActive ? 2 : 1; // Phase 7b §6
    world.update(twDt, player, rivals, fx);
    // Life Pack §3: flush vignette eaten banners
    for (const msg of world.eatenVignetteBanners) banner(msg, '#FFD23F', 3);
    world.eatenVignetteBanners.length = 0;
    updateDrift(twDt); // Phase 2: advance space drift objects

    // War Pack §2: defense wave system
    if (world && player && world.initialMass > 0) {
      const pctDev = world.eatenArea / world.initialMass * 100;
      if (defensePhase < 1 && pctDev >= CONFIG.DEFENSE_POLICE_THRESH) {
        defensePhase = 1; defenseSpawnCd = 0;
        banner('🚔 Police response to your rampage!', '#FF9F1C', 4, { pulse: true });
        queueTicker('🚔 Law enforcement deploying to contain the void entity!');
      }
      if (defensePhase < 2 && pctDev >= CONFIG.DEFENSE_ARMY_THRESH) {
        defensePhase = 2; defenseSpawnCd = 0;
        banner('🪖 ARMY MOBILIZED — Military response incoming!', '#FF4D6D', 5, { pulse: true });
        queueTicker('🪖 Emergency: National Guard and military units scrambled!');
      }
      if (defensePhase < 3 && pctDev >= CONFIG.DEFENSE_FULL_THRESH) {
        defensePhase = 3; defenseSpawnCd = 0;
        banner('🚀 TANKS ROLL IN — Military armor deployed!', '#FF4D6D', 6, { pulse: true });
        queueTicker('🚀 Emergency: Heavy armored vehicles converging on void entity!');
      }
      if (defensePhase < 4 && pctDev >= CONFIG.DEFENSE_HELI_THRESH) {
        defensePhase = 4; defenseSpawnCd = 0;
        banner('🚁 AIR SUPPORT INBOUND — Nothing can stop this now!', '#FF4D6D', 7, { pulse: true });
        queueTicker('🚁 Emergency: Combat helicopters deployed — void entity out of reach!');
      }
      if (defensePhase >= 1) {
        defenseSpawnCd -= dt;
        if (defenseSpawnCd <= 0) {
          defenseSpawnCd = CONFIG.DEFENSE_WAVE_CD;
          spawnDefenseWave(Math.min(defensePhase, 4) as 1|2|3|4);
        }
      }
      // Steer defense units + fire pellets/shells (TIME_WARP slows defense systems too)
      for (const o of world.objects) {
        if (!o.defense || o.eaten) continue;
        const dx = player.x - o.x, dy = player.y - o.y;
        const d = Math.hypot(dx, dy) || 1;
        if (o.kind === 'attack_heli') {
          // Helicopters hover: float 200px above player (in 2D world-space: track Y-200)
          const hoverX = player.x - 200, hoverY = player.y - 200;
          const hdx = hoverX - o.x, hdy = hoverY - o.y;
          const hd = Math.hypot(hdx, hdy) || 1;
          if (hd > 60) { o.vx = (hdx / hd) * CONFIG.DEFENSE_UNIT_SPEED * 0.9; o.vy = (hdy / hd) * CONFIG.DEFENSE_UNIT_SPEED * 0.9; }
          else { o.vx *= 0.88; o.vy *= 0.88; }
          o.x = clamp(o.x + o.vx * (twDt / 1000), 30, CONFIG.MAP_SIZE - 30);
          o.y = clamp(o.y + o.vy * (twDt / 1000), 30, CONFIG.MAP_SIZE - 30);
          // Helis fire pellet bursts
          o.pelletCd = (o.pelletCd ?? CONFIG.DEFENSE_PELLET_CD * 0.7) - twDt;
          if (o.pelletCd <= 0 && d < 1200) {
            o.pelletCd = CONFIG.DEFENSE_PELLET_CD * 0.7 + Math.random() * 600;
            for (let b = 0; b < 3; b++) {
              const spread = (b - 1) * 0.2 + (Math.random() - 0.5) * 0.15;
              const a = Math.atan2(player.y - o.y, player.x - o.x) + spread;
              defensePellets.push({ x: o.x, y: o.y,
                vx: Math.cos(a) * CONFIG.DEFENSE_PELLET_SPEED * 1.1, vy: Math.sin(a) * CONFIG.DEFENSE_PELLET_SPEED * 1.1, life: 3200 });
            }
          }
          // Phase 7b §5: heli missile — fires every 6–8 s with 0.8 s red warning line
          o.missileCd = (o.missileCd ?? (6000 + Math.random() * 2000)) - twDt;
          if ((o.missileCd ?? 1) <= 0 && d < 1400) {
            o.missileCd = 6000 + Math.random() * 2000;
            heliMissiles.push({ tx: player.x + (Math.random()-0.5)*40, ty: player.y + (Math.random()-0.5)*40, fromX: o.x, fromY: o.y, warnT: 800 });
          }
          // Helicopters skip normal suction — handled separately below
        } else if (o.kind === 'tank') {
          // Tanks: slow, fire shells with 1s landing-circle warning
          if (d < 2200) { o.vx = (dx / d) * CONFIG.DEFENSE_TANK_SPEED; o.vy = (dy / d) * CONFIG.DEFENSE_TANK_SPEED; }
          o.x = clamp(o.x + o.vx * (twDt / 1000), 30, CONFIG.MAP_SIZE - 30);
          o.y = clamp(o.y + o.vy * (twDt / 1000), 30, CONFIG.MAP_SIZE - 30);
          o.pelletCd = (o.pelletCd ?? 3000) - twDt;
          if (o.pelletCd <= 0 && d < 1600) {
            o.pelletCd = 3000 + Math.random() * 1500;
            defenseShells.push({ tx: player.x + (Math.random()-0.5)*80, ty: player.y + (Math.random()-0.5)*80,
              warnT: CONFIG.DEFENSE_SHELL_WARN_MS, warnMax: CONFIG.DEFENSE_SHELL_WARN_MS, rocket: false });
          }
        } else if (o.kind === 'missile_truck') {
          // Missile trucks: medium speed, slower rockets
          if (d < 2000) { o.vx = (dx / d) * CONFIG.DEFENSE_UNIT_SPEED * 1.1; o.vy = (dy / d) * CONFIG.DEFENSE_UNIT_SPEED * 1.1; }
          o.x = clamp(o.x + o.vx * (twDt / 1000), 30, CONFIG.MAP_SIZE - 30);
          o.y = clamp(o.y + o.vy * (twDt / 1000), 30, CONFIG.MAP_SIZE - 30);
          o.pelletCd = (o.pelletCd ?? 2400) - twDt;
          if (o.pelletCd <= 0 && d < 1800) {
            o.pelletCd = 2400 + Math.random() * 1200;
            defenseShells.push({ tx: player.x + (Math.random()-0.5)*60, ty: player.y + (Math.random()-0.5)*60,
              warnT: CONFIG.DEFENSE_SHELL_WARN_MS * 1.3, warnMax: CONFIG.DEFENSE_SHELL_WARN_MS * 1.3, rocket: true });
          }
        } else {
          // Police / army_jeep / armored_humvee: standard pellets
          if (d < 2000) {
            const spd = o.kind === 'army_jeep' ? CONFIG.DEFENSE_UNIT_SPEED * 1.3
                      : o.kind === 'armored_humvee' ? CONFIG.DEFENSE_UNIT_SPEED * 0.9
                      : CONFIG.DEFENSE_UNIT_SPEED;
            o.vx = (dx / d) * spd; o.vy = (dy / d) * spd;
          }
          o.x = clamp(o.x + o.vx * (twDt / 1000), 30, CONFIG.MAP_SIZE - 30);
          o.y = clamp(o.y + o.vy * (twDt / 1000), 30, CONFIG.MAP_SIZE - 30);
          o.pelletCd = (o.pelletCd ?? CONFIG.DEFENSE_PELLET_CD) - twDt;
          if (o.pelletCd <= 0 && d < 1400) {
            o.pelletCd = CONFIG.DEFENSE_PELLET_CD + Math.random() * 800;
            const spread = (Math.random() - 0.5) * 0.45;
            const a = Math.atan2(player.y - o.y, player.x - o.x) + spread;
            defensePellets.push({ x: o.x, y: o.y,
              vx: Math.cos(a) * CONFIG.DEFENSE_PELLET_SPEED, vy: Math.sin(a) * CONFIG.DEFENSE_PELLET_SPEED, life: 3200 });
          }
        }
      }
      // Life Pack §4: WORLD ENDER vacuum eats helicopters
      if (player.formIndex >= CONFIG.FORMS.length - 1) {
        const vacuumR = player.radius * player.magnetMultiplier * CONFIG.CAPTURE_RADIUS_MULT;
        for (const o of world.objects) {
          if (o.eaten || !o.defense || o.kind !== 'attack_heli') continue;
          const hd = dist(o.x, o.y, player.x, player.y);
          if (hd < vacuumR) {
            o.eaten = true;
            if (!o.scenery) world.eatenArea += Math.PI * o.baseSize * o.baseSize;
            const heliInfo = CONFIG.KIND_INFO['attack_heli'];
            const hpts = Math.round((heliInfo?.scoreMult ?? 5) * (heliInfo?.minR ?? 54) ** 2 / 100);
            player.score += hpts;
            fx.shake(400, 18); fx.flash();
            fx.addRing(o.x, o.y, '#FF4D6D', 5, 150, 8, 600);
            banner('🚁 Helicopter dragged down and consumed!', '#F15BB5', 4);
          }
        }
      }
      // Update & hit-test pellets (motion slowed by TIME_WARP; flash uses full dt)
      for (let pi = defensePellets.length - 1; pi >= 0; pi--) {
        const p = defensePellets[pi];
        p.x += p.vx * (twDt / 1000); p.y += p.vy * (twDt / 1000); p.life -= twDt;
        if (p.life <= 0) { defensePellets.splice(pi, 1); continue; }
        if (!player.ghost && dist(p.x, p.y, player.x, player.y) < player.radius * 0.88) {
          defensePellets.splice(pi, 1);
          player.combo = 0; player.comboTimer = 0;
          player.score = Math.max(0, player.score - CONFIG.DEFENSE_PELLET_COST);
          pelletHitFlash = 300;
          audio.playEaten();
          banner(`🚔 Pellet hit! -${CONFIG.DEFENSE_PELLET_COST} pts`, '#FF9F1C', 2);
        }
      }
      // Life Pack §4: tank/rocket shell countdown + impact
      for (let si = defenseShells.length - 1; si >= 0; si--) {
        const s = defenseShells[si];
        s.warnT -= twDt;
        if (s.warnT <= 0) {
          defenseShells.splice(si, 1);
          if (!player.ghost && dist(s.tx, s.ty, player.x, player.y) < player.radius * 0.75) {
            const cost = Math.floor(player.score * CONFIG.DEFENSE_SHELL_COST_PCT);
            player.score = Math.max(0, player.score - cost);
            player.combo = 0; player.comboTimer = 0;
            pelletHitFlash = 500;
            audio.playEaten();
            if (cost > 0) banner(`💥 ${s.rocket ? 'Rocket' : 'Tank shell'}! -${cost} pts`, '#FF4D6D', 2);
          }
          fx.addConfetti(s.tx, s.ty, ['#FF4D6D', '#FF9F1C'], 12);
          // Phase 7b §5: tank shell shockwave — scatter nearby small props outward
          if (!s.rocket && world) {
            for (const o of world.objects) {
              if (o.eaten || o.defense || o.tier > 2) continue;
              const od = dist(o.x, o.y, s.tx, s.ty);
              if (od < 220 && od > 0) {
                const sAng = Math.atan2(o.y - s.ty, o.x - s.tx);
                const force = (220 - od) * 0.85;
                o.x = clamp(o.x + Math.cos(sAng) * force, 20, CONFIG.MAP_SIZE - 20);
                o.y = clamp(o.y + Math.sin(sAng) * force, 20, CONFIG.MAP_SIZE - 20);
              }
            }
            fx.addRing(s.tx, s.ty, '#FF9F1C', 0, 220, 6, 500);
          }
        }
      }
      // Phase 7b §5: heli missiles — update countdown + 4% score chip on impact
      for (let mi = heliMissiles.length - 1; mi >= 0; mi--) {
        const m = heliMissiles[mi];
        m.warnT -= twDt;
        if (m.warnT <= 0) {
          heliMissiles.splice(mi, 1);
          if (!player.ghost && dist(m.tx, m.ty, player.x, player.y) < player.radius * 0.9) {
            const cost = Math.floor(player.score * 0.04);
            player.score = Math.max(0, player.score - cost);
            player.combo = 0; player.comboTimer = 0;
            pelletHitFlash = 500;
            audio.playEaten();
            if (cost > 0) banner(`🚁 Missile hit! -${cost} pts`, '#FF4D6D', 2);
          }
          fx.addConfetti(m.tx, m.ty, ['#FF2020', '#FF8800'], 10);
          fx.addRing(m.tx, m.ty, '#FF2020', 0, 90, 4, 360);
          world?.dropCrack(m.tx, m.ty, 26);
        }
      }
      if (pelletHitFlash > 0) pelletHitFlash -= dt;
    }
    // War Pack §3: SINGULARITY black hole update
    if (singularity && world && player) {
      singularity.timer -= dt;
      spellTimer = singularity.timer; // keep HUD radial sweep in sync
      for (const o of world.objects) {
        if (o.eaten || o.defense) continue;
        const sdx = singularity.x - o.x, sdy = singularity.y - o.y;
        const sd = Math.hypot(sdx, sdy) || 1;
        if (sd < 700) {
          const pullF = Math.min(1, 600 / sd) * (dt / 1000) * 1400;
          o.vx += (sdx / sd) * pullF; o.vy += (sdy / sd) * pullF;
        }
        if (sd < 90 && !o.eaten) {
          o.eaten = true;
          if (!o.scenery) world.eatenArea += Math.PI * o.baseSize * o.baseSize;
          singularity.score += Math.max(1, (CONFIG.KIND_INFO[o.kind]?.tier ?? 1) * 5);
        }
      }
      if (singularity.timer <= 0) {
        if (singularity.score > 0) {
          player.score += singularity.score;
          fx.addConfetti(singularity.x, singularity.y, CONFIG.COLORS.pops, 30);
          fx.addRing(singularity.x, singularity.y, '#F15BB5', 10, 400, 8, 600);
          fx.shake(300, 10);
          banner(`⚫ SINGULARITY popped! +${singularity.score}`, '#F15BB5', 3);
        }
        singularity = null; activeSpell = null; spellTimer = 0; spellTimerMax = 0;
        notify();
      }
    }

    // v8 §3: WORLD EATER carves a cracked-ground trail while it roams
    if (player.formIndex >= CONFIG.FORMS.length - 1) {
      crackTimer -= dt;
      if (crackTimer <= 0 && Math.hypot(player.vx, player.vy) > 30) {
        crackTimer = 130;
        world.dropCrack(player.x, player.y, player.radius);
      }
    }

    // v6 §2: golden objects begin at 2:45 remaining, ~every 12s (GOLDEN HOUR → 2×)
    if (timeLeft <= CONFIG.GOLDEN_START_MS && timeLeft > 0) {
      goldenTimer -= dt;
      const gi = dailyGoldenInterval >= 0 ? dailyGoldenInterval : CONFIG.GOLDEN_INTERVAL;
      if (goldenTimer <= 0) { goldenTimer = gi; world.spawnGolden(player); }
    }

    // Phase 7b §6: FEEDING FRENZY — triggers at 60 s remaining
    if (!feedingFrenzyFired && timeLeft <= 60000 && timeLeft > 0) {
      feedingFrenzyFired = true;
      feedingFrenzyActive = true;
      banner('🦑 FEEDING FRENZY! 60 SECONDS!', '#FF3B8A', 8, { pulse: true });
      queueTicker('🦑 FEEDING FRENZY — double predation score, max aggression, last-minute chaos!');
    }

    // v12 §2: FINAL FEAST — triggers at 30s remaining
    if (!finalFeastFired && timeLeft <= CONFIG.FINAL_FEAST_MS && timeLeft > 0) {
      finalFeastFired = true;
      finalFeastActive = true;
      banner('FINAL FEAST! STEAL THEIR SCORE!', '#FF6B6B', 7, { pulse: true });
      queueTicker('🍽️ FINAL FEAST! All voids entering maximum consumption mode!');
    }

    // v16.2 §1: opening beat — person near spawn whispers at t=2s
    if (!openingBeatDone && roundElapsed >= 2000 && world) {
      openingBeatDone = true;
      world.setBubble(world.openingBeatPersonId, 'Huh… is that a void?', 4500);
    }

    // v16.2 §1: round-start ticker fires once at 3s (dedicated gate)
    if (!roundStartTickerDone && roundElapsed >= 3000) {
      roundStartTickerDone = true;
      queueTicker('🏙️ City wakes to reports of unusual void activity in the downtown core…');
    }

    // v16.2 §1: event-based ticker checks
    if (world && player) {
      if (!firstHouseTickerDone && world.playerStats.houses >= 1) {
        firstHouseTickerDone = true;
        queueTicker('🚨 BREAKING: Homeowner reports house consumed overnight — residents panicking');
      }
      if (!zooBreakTickerDone && world.zooSmashed) {
        zooBreakTickerDone = true;
        queueTicker('🦁 BREAKING: Zoo wall breached! Animals reportedly on the loose!');
      }
      if (!townhallTickerDone && world.townhallEaten) {
        townhallTickerDone = true;
        queueTicker('🏛️ BREAKING: City Hall has been devoured. Mayor unavailable for comment.');
      }
      if (!devoured15Done && world.initialMass > 0 && (world.eatenArea / world.initialMass) * 100 >= 15) {
        devoured15Done = true;
        queueTicker('📉 Scientists confirm city is 15% smaller than yesterday');
      }
      // Feedback Juice §2: quarter-city gold milestone banners (once each per match)
      if (world.initialMass > 0) {
        const dpct = (world.eatenArea / world.initialMass) * 100;
        const MS: [number, string][] = [[25, '25% DEVOURED'], [50, 'HALF THE CITY GONE'], [75, '75% DEVOURED'], [100, 'CITY DEVOURED']];
        for (const [thr, msg] of MS) {
          if (dpct >= thr && !milestonePctFired.has(thr)) {
            milestonePctFired.add(thr);
            banner(msg, '#FFD23F', 3, { sparkles: true });
          }
        }
      }
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

    // Fix 7: news ticker routed to banner every 45s (garbled scroll removed)
    if (screen === 'game' && roundElapsed > 5000) {
      tickerCd -= dt;
      if (tickerCd <= 0) {
        tickerCd = 40000 + Math.random() * 10000;
        const line = TICKER_LINES[Math.floor(Math.random() * TICKER_LINES.length)];
        banner(line, '#9AAFC8', 1);
      }
    }

    // Phase 7b §3: secondary news banner — escalates with % devoured
    if (screen === 'game' && roundElapsed > 8000 && world) {
      newsCd -= dt;
      if (newsTimer > 0) {
        newsTimer -= dt;
        if (newsTimer < 700) newsAlpha = Math.max(0, newsTimer / 700);
      }
      if (newsCd <= 0 && newsTimer <= 0) {
        newsCd = 25000 + Math.random() * 15000;
        const devPct = world.initialMass > 0 ? (world.eatenArea / world.initialMass) * 100 : 0;
        const newsTier = devPct >= 20 ? 3 : devPct >= 10 ? 2 : devPct >= 3 ? 1 : 0;
        const pool = NEWS_TIER[newsTier];
        newsText = pool[Math.floor(Math.random() * pool.length)];
        newsAlpha = 1;
        newsTimer = 5500;
      }
    }

    // v16 §5: contract progress + completion checks
    if (screen === 'game' && player && world) {
      const ps = world.playerStats;
      const checkContract = (id: string, met: boolean) => {
        const c = activeContracts.find((c) => c.id === id && !c.done);
        if (c && met) { c.done = true; coinBonus += c.reward; banner(`CONTRACT: ${c.name}! +${c.reward}¢`, '#7BFFED'); notify(); }
      };
      checkContract('eat_houses',   ps.houses >= 3);
      checkContract('eat_cars',     ps.cars >= 5);
      checkContract('eat_gnomes',   ps.gnomes >= world.gnomeTotal && world.gnomeTotal > 0);
      checkContract('eat_beach',    ps.beachItems >= 8);
      checkContract('eat_downtown', ps.downtownItems >= 5);
      checkContract('eat_people',   ps.people >= 10);
      checkContract('reach_gobbler', player.formIndex >= 2);
      // 'first_place': leading during the last 60s window
      if (timeLeft <= 60000 && timeLeft > 59000 && rivals.length > 0) {
        const leading = player.score >= Math.max(...rivals.map((r) => r.score)) && player.score > 0;
        checkContract('first_place', leading);
      }
    }

    // War Pack §3: active power tick
    if (activeSpell && spellTimer > 0 && player && activeSpell !== 'singularity') {
      spellTimer -= dt;
      if (spellTimer <= 0) {
        if (activeSpell === 'event_horizon') player.suctionMult = 1;
        if (activeSpell === 'time_warp') audio.stopTimeWarpFilter(); // Sound Pack §6
        activeSpell = null; spellTimerMax = 0;
        // Phase 7a §2: drain queued spell
        if (queuedSpell && player) { const qs = queuedSpell; queuedSpell = null; _executeCast(qs); }
        notify();
      }
      // EVENT HORIZON: 2.5× vacuum reach + 2× suction pull
      if (activeSpell === 'event_horizon') {
        player.magnetMultiplier = Math.max(player.magnetMultiplier, 2.5);
        player.suctionMult = 2;
      }
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
      console.log('[radii] ' + line);
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
        // Feedback Juice §3: cosmetic coin burst at the score point (display only)
        fx.addCoinBurst(ev.x, ev.y, ev.amount || 0);
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
        // v12 §1: skyscraper topple banner
        if (ev.kind === 'skyscraper') banner('SKYSCRAPER TOPPLED!', '#5AC8FF', 7, { sparkles: true });
        // v8 §6: eat-streak ladder; v12 §4: FRENZY FRIDAY doubles window
        const inc = events.frenzyActive ? 2 : 1;
        const prevStreak = (roundElapsed - lastEatMs < dailyFrenzyWindow) ? eatStreak : 0;
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
        roundTriples++; // v12 §5: track triple combos for trophy
        meta.updateTrophyCounter('totalTriples', 1, 'sum');
      } else if (ev.type === 'eatRival') {
        roundRivalEats++; // v12 §5: track rival eats for trophy
        audio.playChompVoid(); // v14 §1: chomp_void at 0.9, falls back to playMerge synth
        audio.playPredationEat(); // Sound Pack §8: EAT BIG + shimmer
        fx.addConfetti(ev.x, ev.y, CONFIG.COLORS.pops);
        fx.shake(300, 12);
        fx.flash();
        if (ev.text) fx.addText(ev.x, ev.y - 30, ev.text, ev.color || '#FFD23F');
      } else if (ev.type === 'zoo_break') {
        // v16.1 D: zoo gate smashed — big celebration
        fx.shake(400, 18, 30);
        fx.addRing(ev.x, ev.y, '#8FE36B', 20, 240, 12, 900);
        banner('ZOO BREAK!', '#8FE36B', 8, { sparkles: true });
      } else if (ev.type === 'finale') {
        triggerFinale(ev.x, ev.y);
      } else if (ev.type === 'evolve') {
        lastEvoElapsed = roundElapsed; // v10 §5: reset form-badge full-opacity window
        triggerEvolution(ev.x, ev.y, ev.form || 0, ev.text || '');
      } else if (ev.type === 'captureStart') {
        // v14 §2: subtle suction ring at the capture point (item beginning its orbit)
        if (ev.x != null && ev.y != null) {
          fx.addRing(ev.x, ev.y, ev.color || '#FFFFFF', 0, 28, 2, 200);
        }
        audio.playCaptureTick(); // v14 §1: quiet hi-tick per orbit capture
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

    // Sound Pack §8: danger layer — biggest rival that can eat us within 1.5 screen widths
    {
      const screenW = fw / Math.max(0.05, camZoom);
      const dangerThresh = screenW * 1.5;
      let closestD = Infinity;
      for (const r of rivals) {
        if (!r.alive || r.ghost || r.radius <= player.radius * 1.08) continue;
        const d = Math.hypot(r.x - player.x, r.y - player.y);
        if (d < dangerThresh && d < closestD) closestD = d;
      }
      audio.updateDanger(closestD < Infinity ? closestD / dangerThresh : 1);
    }

    // Sound Pack §11: final-10s tick — fire exactly once per integer second during countdown
    if (timeLeft <= 10000 && timeLeft > 0) {
      const thisSec = Math.ceil(timeLeft / 1000);
      audio.playFinalTick(thisSec);
    }

    // Sound Pack §5: vacuum hum — active while any object is within suction reach
    if (player && world) {
      const p = player; // capture for closure — TypeScript narrows but closures lose the guard
      const reach = p.radius * CONFIG.CAPTURE_RADIUS_MULT * p.magnetMultiplier;
      const vacActive = world.objects.some(
        (o) => !o.eaten && Math.hypot(o.x - p.x, o.y - p.y) < reach,
      );
      audio.setVacuumActive(vacActive);
      player.nearFood = vacActive; // Phase 7a: pupil dilation when food in vacuum
    }

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
    // v15 §3: one random slot (≈50% of picks) may be a spell card
    const spellSlot = (CONFIG.SPELLS.length && Math.random() < 0.5) ? Math.floor(Math.random() * 3) : -1;
    for (let i = 0; i < 3; i++) {
      if (i === spellSlot) {
        const sp = CONFIG.SPELLS[Math.floor(Math.random() * CONFIG.SPELLS.length)];
        boonChoices.push({ id: 'spell_' + sp.id, name: sp.name, desc: sp.desc, spell: true, color: sp.color });
      } else if (pool.length) {
        boonChoices.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
      }
    }
    // v15 §3: bot spell AI — each rival gets a 45% chance at an instant spell effect
    for (const r of rivals) {
      if (!r.alive || r.ghost || Math.random() > 0.45) continue;
      const sp = CONFIG.SPELLS[Math.floor(Math.random() * CONFIG.SPELLS.length)];
      if (sp.id === 'puny' && player && r.radius > player.radius * 0.7) {
        player.radius = Math.max(CONFIG.PLAYER_BASE_RADIUS, player.radius * 0.85);
        banner('💫 PUNY BEAM hit you!', '#FF6B6B', 3);
        console.log(`[spell] bot ${r.name} cast PUNY BEAM on player`);
      }
      // other spells (garlic/freeze/bubble/switcheroo) = self-buff, no external effect needed
    }
    audio.playBoon();
    screen = 'boon';
    joystick.setEnabled(false);
    notify();
  }

  function canEatVoid(bigR: number, smallR: number, d: number) {
    return bigR >= smallR * CONFIG.RIVAL_EAT_RATIO && d <= bigR - smallR * 0.15;
  }

  // Life Pack §4 + War Pack §2: spawn a wave of defense units from map edges
  function spawnDefenseWave(phase: 1|2|3|4) {
    if (!world) return;
    const existing = world.objects.filter(o => o.defense && !o.eaten).length;
    if (existing >= CONFIG.DEFENSE_MAX_UNITS) return;
    const count = Math.min(phase >= 3 ? 5 : phase === 2 ? 4 : 3, CONFIG.DEFENSE_MAX_UNITS - existing);
    const S = CONFIG.MAP_SIZE;
    for (let i = 0; i < count; i++) {
      const edge = Math.floor(Math.random() * 4);
      let x: number, y: number;
      if (edge === 0)      { x = Math.random() * S; y = 60; }
      else if (edge === 1) { x = S - 60; y = Math.random() * S; }
      else if (edge === 2) { x = Math.random() * S; y = S - 60; }
      else                 { x = 60; y = Math.random() * S; }
      let kind: ObjectKind;
      if (phase >= 4) {
        // Phase 4: helis (1–2 per wave) plus some tanks
        kind = (i < 2) ? 'attack_heli' : (Math.random() < 0.5 ? 'tank' : 'missile_truck');
      } else if (phase === 3) {
        // Phase 3: tanks + missile trucks
        kind = Math.random() < 0.6 ? 'tank' : 'missile_truck';
      } else if (phase === 2) {
        // Phase 2: army_jeep + armored_humvee
        kind = Math.random() < 0.55 ? 'army_jeep' : 'armored_humvee';
      } else {
        kind = 'police_car';
      }
      world.spawnDefenseUnit(kind, x, y);
    }
  }

  function resolveVoids() {
    if (!player) return;
    // War Pack §2: 30s grace period — no void predation in the opening scramble
    if (roundElapsed < 30000) return;
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
          // War Pack §2: rival loses half its score, player gains that amount
          // Phase 7b §6: feeding frenzy / final feast → steal 100% of score
          const stolen = Math.floor(r.score * (feedingFrenzyActive || finalFeastActive ? 1.0 : 0.5));
          r.score = Math.max(0, r.score - stolen);
          meta.updateTrophyCounter('totalVoidsEaten', 1, 'sum');
          player.eatRival(rr, stolen);
          r.getEaten(player.x, player.y, minDist);
          // Phase 7b §4: rival respawns as VOIDLING after 8 s
          r.formIndex = 0;
          r.radius = CONFIG.FORMS[0].radius;
          r.score = 0;
          r.ghostTime = 8000;
          banner(`You devoured ${r.name}!`, '#FFD23F');
          if (stolen > 0) banner(`Stole ${stolen} pts!`, '#FF9F5A', 3);
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
            audio.playEaten();
            // Phase 7b §4: Agar-style death — eaten at VOIDLING/MUNCHER = game over, else drop one stage
            if (player.formIndex <= 1) {
              // Eaten at lowest two forms → game over
              player.combo = 0; player.orbit = []; player.vx = player.vy = 0;
              player.ghostTime = 5000; // prevent double-eat during death animation
              r.eatVoid(pr);
              killedBy = r.name;
              banner(`${r.name} DEVOURED YOU 💀`, '#FF4D6D', 8, { pulse: true });
              queueTicker(`💀 The void was consumed by ${r.name}! The city breathes again… briefly.`);
              window.setTimeout(() => endRound(), 2200);
            } else {
              // Higher forms: drop one evolution stage, eater gains lost score
              const scoreBefore = player.score;
              player.dropStage();
              const scoreLost = scoreBefore - player.score;
              r.score += Math.floor(scoreLost * (feedingFrenzyActive || finalFeastActive ? 2 : 1));
              player.combo = 0; player.dizzy = 1; player.orbit = [];
              r.eatVoid(pr);
              fx.addRing(player.x, player.y, '#FF6B6B', 0, pr * 3, 8, 700);
              banner(`${r.name} devoured you! ↓ Dropped to ${player.formName}! 3s shield`, '#FF6B6B', 4, { pulse: true });
            }
          }
        }
      }
    }
    // rival vs rival — v13 §0: 25% mass + 10s void-sated to kill the bot mass-pump
    for (let i = 0; i < rivals.length; i++) {
      for (let j = i + 1; j < rivals.length; j++) {
        const a = rivals[i], b = rivals[j];
        if (a.ghost || b.ghost) continue;
        // SATED bots cannot initiate another void-eat
        if (a.voidSatedMs > 0 && b.voidSatedMs > 0) continue;
        const d = dist(a.x, a.y, b.x, b.y);
        if (d > a.radius + b.radius) continue;
        if (canEatVoid(a.radius, b.radius, d) && a.voidSatedMs <= 0) {
          a.eatVoidBotOnBot(b.radius); // 25% mass, sets a.voidSatedMs = 10000
          b.getEaten(player.x, player.y, minDist);
          // Phase 7b §4: eaten rival respawns as VOIDLING after 8s
          b.formIndex = 0; b.radius = CONFIG.FORMS[0].radius; b.score = 0; b.ghostTime = 8000;
          const TRASH_TALK = [`${a.name} obliterated ${b.name}!`, `${a.name} consumed ${b.name}! No mercy!`, `${a.name} devours the competition! 🔥`];
          banner(TRASH_TALK[Math.floor(Math.random() * TRASH_TALK.length)], '#FF9F5A', 2);
        } else if (canEatVoid(b.radius, a.radius, d) && b.voidSatedMs <= 0) {
          b.eatVoidBotOnBot(a.radius);
          a.getEaten(player.x, player.y, minDist);
          // Phase 7b §4: eaten rival respawns as VOIDLING after 8s
          a.formIndex = 0; a.radius = CONFIG.FORMS[0].radius; a.score = 0; a.ghostTime = 8000;
          const TRASH_TALK = [`${b.name} obliterated ${a.name}!`, `${b.name} consumed ${a.name}! No mercy!`, `${b.name} devours the competition! 🔥`];
          banner(TRASH_TALK[Math.floor(Math.random() * TRASH_TALK.length)], '#FF9F5A', 2);
        }
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

    // ── camera: Phase 4 §5 — radius-proportional zoom, NO zoom cap (vector ground is always crisp) ──
    // viewHeight = radius * 28.57 → diameter / fh ≈ 7% (player ~7% of screen height at spawn)
    const viewHeight = clamp(player.radius * 28.57, 350, fh * 6);
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

    // Phase 4: pass camZoom for vector ground cache invalidation
    world.drawGround(ctx, view, clock, camCX, camCY, camZoom);
    world.drawDressing(ctx, view, clock, camZoom);
    // Debug overlays (world-space, drawn before objects)
    if (debugMask)    drawDebugMask(ctx);
    if (debugTerrain) drawDebugTerrain(ctx);
    drawPowerAuras(clock); // v6 §4: auras on the ground beneath the actors (moved for 2.5D)
    // Dense City §3: draw objects + voids in one foot-Y-sorted painter's pass so
    // buildings nearer the camera correctly occlude the void body.
    const drawActors: { footY: number; draw: () => void }[] = [];
    for (const r of rivals) drawActors.push({ footY: r.y + r.radius, draw: () => r.draw(ctx, clock, alpha) });
    const pl = player;
    if (pl) drawActors.push({ footY: pl.y + pl.radius, draw: () => pl.draw(ctx, clock, alpha) });
    world.draw(ctx, clock, view, drawActors);
    events.draw(ctx, clock); // v6 §5: storm cloud + firetrucks (world space)
    // v13 §0: rival rim — green = you can eat them, red = they can eat you
    if (player && !player.ghost) {
      const ratio = CONFIG.RIVAL_EAT_RATIO;
      for (const r of rivals) {
        if (r.ghost || !r.alive) continue;
        const screenDist = Math.hypot(r.x - player.x, r.y - player.y) * camZoom;
        if (screenDist > fw * 2.0) continue; // War Pack: widen detection to 2 screen widths
        const edible = player.radius >= r.radius * ratio;
        const danger = r.radius >= player.radius * ratio;
        if (!edible && !danger) continue;
        const rimColor = edible ? '#FFD23F' : '#FF4D6D'; // War Pack: gold=edible (was green)
        ctx.save();
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius + 4, 0, Math.PI * 2);
        ctx.strokeStyle = rimColor;
        ctx.lineWidth = 3 / camZoom;
        ctx.globalAlpha = 0.75 + 0.25 * Math.sin(clock / 250);
        ctx.stroke();
        ctx.restore();
      }
    }
    // (drawPowerAuras + player/rival bodies now handled above in the interleaved pass)
    // War Pack §3: colored power ring while active (world space)
    if (activeSpell && (spellTimer > 0 || activeSpell === 'singularity') && player) {
      const sp = CONFIG.SPELLS.find(s => s.id === activeSpell);
      if (sp?.color) {
        const t = Math.sin(clock / 200);
        ctx.save();
        ctx.globalAlpha = 0.55 + 0.2 * t;
        ctx.strokeStyle = sp.color;
        ctx.lineWidth = 3.5 / camZoom;
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.radius + 12 + 4 * Math.abs(t), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }
    if (gnomeLord) drawGnomeCrown(clock); // v9 §8: secret GNOME LORD crown

    if (!paused) fx.update(frameDt);
    fx.draw(ctx);
    drawFormBadge(); // v12 §0: form badge after fx (always on top in world space)
    // v15 §1+§3: hitbox overlay + spell visuals (world-space — ctx transform still active)
    if (showHitboxes && world && player) {
      // Object contact circles (contactScale-adjusted radii)
      ctx.lineWidth = 1.5 / camZoom;
      for (const obj of world.objects) {
        if (obj.eaten) continue;
        const cs = (CONFIG.CONTACT_SCALE_OVERRIDES as Record<string, number>)[obj.kind] ?? CONFIG.CONTACT_SCALE;
        ctx.strokeStyle = '#00FFAA'; ctx.globalAlpha = 0.55;
        ctx.beginPath(); ctx.arc(obj.x, obj.y, obj.size * cs, 0, Math.PI * 2); ctx.stroke();
      }
      // Law ceiling ring around the player
      const lawCeil = CONFIG.GROWTH_LAW_BASE + CONFIG.GROWTH_LAW_RATE * (roundElapsed / 1000);
      ctx.strokeStyle = player.radius > lawCeil ? '#FF4D6D' : '#FFD23F';
      ctx.globalAlpha = 0.4; ctx.lineWidth = 2 / camZoom;
      ctx.beginPath(); ctx.arc(player.x, player.y, lawCeil, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    // War Pack §3: SINGULARITY black hole visual (world space)
    if (singularity) {
      const pulse = 0.5 + 0.5 * Math.sin(clock / 130);
      const coreR = 60 + 10 * pulse;
      const grd = ctx.createRadialGradient(singularity.x, singularity.y, 0, singularity.x, singularity.y, coreR * 3.5);
      grd.addColorStop(0, '#000000');
      grd.addColorStop(0.38, '#F15BB5');
      grd.addColorStop(1, 'rgba(241,91,181,0)');
      ctx.save();
      ctx.globalAlpha = 0.88;
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.arc(singularity.x, singularity.y, coreR * 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.65;
      ctx.strokeStyle = '#F15BB5'; ctx.lineWidth = 2.5 / camZoom;
      ctx.beginPath();
      ctx.arc(singularity.x, singularity.y, coreR * 2.8, clock / 900, clock / 900 + Math.PI * 1.5);
      ctx.stroke();
      ctx.restore();
    }
    // War Pack §3: EVENT HORIZON vacuum-zone ring (world space)
    if (activeSpell === 'event_horizon' && player) {
      ctx.globalAlpha = 0.11 + 0.07 * Math.sin(clock / 180);
      ctx.strokeStyle = '#9B5DE5'; ctx.lineWidth = 3 / camZoom;
      ctx.beginPath(); ctx.arc(player.x, player.y, player.radius * 2.5, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    // War Pack §2: defense pellets (world space)
    for (const p of defensePellets) {
      ctx.save();
      const fadeFrac = Math.min(1, p.life / 2500);
      ctx.globalAlpha = fadeFrac * 0.92;
      ctx.fillStyle = '#FFDD44';
      ctx.shadowColor = '#FF8800'; ctx.shadowBlur = 10 / camZoom;
      ctx.beginPath(); ctx.arc(p.x, p.y, 7 / camZoom, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();
    }
    // Life Pack §4: tank/rocket shell landing-circle warning (world space)
    for (const s of defenseShells) {
      const warnFrac = clamp(s.warnT / s.warnMax, 0, 1);
      const cRadius = s.rocket ? 44 : 62;
      ctx.save();
      ctx.globalAlpha = 0.7 - 0.45 * warnFrac;
      ctx.strokeStyle = s.rocket ? '#FF9F1C' : '#FF4D6D';
      ctx.lineWidth = (3 + (1 - warnFrac) * 2) / camZoom;
      ctx.shadowColor = s.rocket ? '#FF9F1C' : '#FF4D6D'; ctx.shadowBlur = 8 / camZoom;
      ctx.beginPath();
      ctx.arc(s.tx, s.ty, cRadius * (0.5 + 0.5 * warnFrac) / camZoom * camZoom, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.restore();
    }
    // Life Pack §4: helicopter shadow ellipse (world space, below the unit)
    if (world) {
      for (const o of world.objects) {
        if (o.eaten || !o.defense || o.kind !== 'attack_heli') continue;
        ctx.save();
        ctx.globalAlpha = 0.22 + 0.08 * Math.sin(clock / 400);
        ctx.fillStyle = '#1a0830';
        ctx.beginPath();
        ctx.ellipse(o.x, o.y + o.size * 0.3, o.size * 1.1, o.size * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        // Phase 7b §5: heli searchlight cone (world space)
        if (player && !player.ghost) {
          const cAng = Math.atan2(player.y - o.y, player.x - o.x);
          const cLen = dist(o.x, o.y, player.x, player.y);
          const cW = Math.min(cLen * 0.28, 180);
          ctx.save();
          ctx.globalAlpha = 0.06 + 0.03 * Math.sin(clock / 700);
          const cGrd = ctx.createLinearGradient(o.x, o.y, player.x, player.y);
          cGrd.addColorStop(0, 'rgba(255,255,200,0)');
          cGrd.addColorStop(1, 'rgba(255,255,180,0.8)');
          ctx.fillStyle = cGrd;
          ctx.beginPath();
          ctx.moveTo(o.x, o.y);
          ctx.lineTo(player.x + Math.cos(cAng + Math.PI / 2) * cW, player.y + Math.sin(cAng + Math.PI / 2) * cW);
          ctx.lineTo(player.x + Math.cos(cAng - Math.PI / 2) * cW, player.y + Math.sin(cAng - Math.PI / 2) * cW);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      }
    }
    // Phase 7b §5: heli missile warning lines (world space, before impact)
    for (const m of heliMissiles) {
      if (m.warnT > 60) {
        const prog = 1 - m.warnT / 800;
        ctx.save();
        ctx.globalAlpha = 0.55 + Math.sin(prog * Math.PI * 10) * 0.3;
        ctx.strokeStyle = '#FF2020';
        ctx.lineWidth = (2 + prog * 2) / camZoom;
        ctx.shadowColor = '#FF4444'; ctx.shadowBlur = 6 / camZoom;
        ctx.setLineDash([8 / camZoom, 5 / camZoom]);
        ctx.beginPath();
        ctx.moveTo(m.fromX, m.fromY);
        ctx.lineTo(m.tx, m.ty);
        ctx.stroke();
        ctx.shadowBlur = 0; ctx.setLineDash([]);
        ctx.lineWidth = 1.5 / camZoom;
        ctx.globalAlpha = 0.65;
        ctx.beginPath(); ctx.arc(m.tx, m.ty, 22 / camZoom, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }
    }
    ctx.restore();

    // ?debug=fps — tiny top-right overlay: frames per second + live object count
    if (debugFps) {
      const txt = `FPS ${fpsSmooth.toFixed(0)}  OBJ ${world ? world.objects.length : 0}`;
      ctx.save();
      ctx.font = 'bold 14px monospace';
      ctx.textBaseline = 'middle';
      const w = ctx.measureText(txt).width + 18;
      const bx = fw - w - 8;
      ctx.fillStyle = 'rgba(0,0,0,0.62)';
      ctx.fillRect(bx, 8, w, 24);
      ctx.fillStyle = fpsSmooth < 30 ? '#FF6B6B' : fpsSmooth < 50 ? '#FFD23F' : '#5AFFA0';
      ctx.fillText(txt, bx + 9, 21);
      ctx.restore();
    }

    // ?debug=sprites — screen-space checkerboard review of every extracted sprite
    if (debugSprites && extractionLog.length > 0) {
      const PAD = 10, CELL = 68, LABEL_H = 14;
      let sx = PAD, sy = PAD;
      ctx.save();
      for (const rec of extractionLog) {
        // Sheet label
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(sx - 2, sy, 240, LABEL_H + 1);
        ctx.fillStyle = '#FFD23F';
        ctx.font = `bold ${LABEL_H - 2}px monospace`;
        ctx.textBaseline = 'top';
        ctx.fillText(`${rec.sheet} (${rec.sprites.length}/${rec.cols * rec.rows})`, sx, sy + 1);
        sy += LABEL_H + 2;

        for (let i = 0; i < rec.sprites.length; i++) {
          const cellX = sx + (i % rec.cols) * (CELL + 3);
          const cellY = sy + Math.floor(i / rec.cols) * (CELL + 3);
          if (cellY + CELL > fh) { sx += rec.cols * (CELL + 3) + 10; sy = PAD; continue; }
          // Checkerboard background
          for (let ty = 0; ty < CELL; ty += 8) {
            for (let tx = 0; tx < CELL; tx += 8) {
              ctx.fillStyle = ((tx + ty) / 8) % 2 === 0 ? '#555' : '#888';
              ctx.fillRect(cellX + tx, cellY + ty, 8, 8);
            }
          }
          const sp = rec.sprites[i];
          if (sp.width > 1) {
            const sc = Math.min(CELL / sp.width, CELL / sp.height);
            ctx.drawImage(sp, cellX + (CELL - sp.width * sc) / 2, cellY + (CELL - sp.height * sc) / 2, sp.width * sc, sp.height * sc);
          }
          // Cell index label
          ctx.fillStyle = 'rgba(0,0,0,0.6)';
          ctx.fillRect(cellX, cellY + CELL - 10, 18, 10);
          ctx.fillStyle = '#fff';
          ctx.font = '8px monospace';
          ctx.fillText(String(i), cellX + 2, cellY + CELL - 2);
        }
        sy += Math.ceil(rec.sprites.length / rec.cols) * (CELL + 3) + 14;
        if (sy > fh - 80) { sx += rec.cols * (CELL + 3) + 14; sy = PAD; }
      }
      ctx.restore();
    }

    // War Pack §3: TIME WARP blue-edge vignette (screen space)
    if (activeSpell === 'time_warp' && spellTimer > 0 && spellTimerMax > 0) {
      const frac = spellTimer / spellTimerMax;
      const grd = ctx.createRadialGradient(fw/2, fh/2, Math.min(fw,fh)*0.2, fw/2, fh/2, Math.max(fw,fh)*0.85);
      grd.addColorStop(0, 'rgba(0,0,0,0)');
      grd.addColorStop(1, `rgba(0,100,220,${(frac * 0.28).toFixed(3)})`);
      ctx.fillStyle = grd; ctx.fillRect(0, 0, fw, fh);
    }
    // War Pack §2: pellet hit flash red overlay (screen space)
    if (pelletHitFlash > 0) {
      ctx.fillStyle = `rgba(255,60,0,${Math.min(0.38, pelletHitFlash / 700 * 0.38).toFixed(3)})`;
      ctx.fillRect(0, 0, fw, fh);
    }

    // Phase 7a §3: NIGHTFALL — stylised dusk tint capped at 22% (gameplay always readable)
    if (events.nightfallActive) {
      ctx.save();
      ctx.fillStyle = 'rgba(18,10,55,0.22)';
      ctx.fillRect(0, 0, fw, fh);
      ctx.restore();
    }

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

    // Phase 7b §4: heart pips removed — hearts system replaced by Agar-style stage drop

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
    // Phase 7b §4: FINAL HEART vignette removed — hearts system replaced by Agar-style stage drop
    // Phase 7b §3: secondary news banner — slides in below the main callout
    if (newsAlpha > 0.02 && newsText) {
      ctx.save();
      ctx.globalAlpha = newsAlpha * 0.9;
      ctx.font = '600 13px Fredoka, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const nw = ctx.measureText(newsText).width + 28;
      const nh = 24;
      const ny = callout ? fh * 0.34 : fh * 0.22;
      ctx.fillStyle = 'rgba(18,10,55,0.82)';
      roundRectFill(ctx, fw / 2 - nw / 2, ny - nh / 2, nw, nh, 6);
      ctx.fillStyle = '#8BBAD0';
      ctx.fillText(newsText, fw / 2, ny);
      ctx.restore();
    }

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

  // v6 §4 + v16.2 §4: active power-up auras — pulsing ring per boon + per-boon persistent visual signature.
  function drawPowerAuras(clock: number) {
    if (!player || activeBoons.length === 0) return;
    const px = player.x, py = player.y, pr = player.radius;
    ctx.save();
    let i = 0;
    for (const b of activeBoons) {
      // base ring (unchanged)
      const pulse = 1 + Math.sin(clock / 220 + i) * 0.04;
      ctx.strokeStyle = powerColor(b.id);
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 3;
      ctx.beginPath();
      const auraOff = Math.min(40, 9 + i * 6);
      ctx.arc(px, py, (pr + auraOff) * pulse, 0, Math.PI * 2);
      ctx.stroke();

      // v16.2 §4: per-boon persistent visual signature
      ctx.save();
      if (b.id === 'magnet') {
        // faint spiral pull-particles at absorb-reach edge
        const reach = pr * ((player as any).magnetMultiplier || 1);
        for (let s = 0; s < 6; s++) {
          const a = (clock / 400 + s * Math.PI / 3) % (Math.PI * 2);
          const rr = reach + Math.sin(clock / 300 + s) * 10;
          ctx.globalAlpha = 0.45; ctx.fillStyle = '#8B5CF6';
          ctx.beginPath(); ctx.arc(px + Math.cos(a) * rr, py + Math.sin(a) * rr, 2.5, 0, Math.PI * 2); ctx.fill();
        }
      } else if (b.id === 'overdrive') {
        // motion streak lines behind the void
        const spd = Math.hypot(player.vx, player.vy);
        if (spd > 25) {
          const ang = Math.atan2(-player.vy, -player.vx);
          for (let s = 0; s < 4; s++) {
            ctx.globalAlpha = 0.28 - s * 0.05; ctx.strokeStyle = '#00FF88'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(px, py);
            ctx.lineTo(px + Math.cos(ang + (s - 1.5) * 0.18) * (pr + 28 + s * 10), py + Math.sin(ang + (s - 1.5) * 0.18) * (pr + 28 + s * 10));
            ctx.stroke();
          }
        }
      } else if (b.id === 'greed') {
        // gold coin sparkles orbiting the void
        for (let s = 0; s < 5; s++) {
          const a = (clock / 550 + s * Math.PI * 2 / 5) % (Math.PI * 2);
          const rr = pr + 16; const sx = px + Math.cos(a) * rr, sy = py + Math.sin(a) * rr;
          ctx.globalAlpha = 0.65; ctx.fillStyle = '#FFD23F';
          ctx.beginPath(); ctx.arc(sx, sy, 3, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = 0.35; ctx.fillStyle = '#FFEB8A';
          ctx.beginPath(); ctx.arc(sx + 1, sy - 1, 1.5, 0, Math.PI * 2); ctx.fill();
        }
      } else if (b.id === 'echo') {
        // faint expanding ring every 2.5s
        const echoPh = (clock % 2500) / 2500;
        if (echoPh < 0.55) {
          ctx.globalAlpha = (0.55 - echoPh) * 0.55;
          ctx.strokeStyle = '#7DF9FF'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(px, py, pr + echoPh * 90, 0, Math.PI * 2); ctx.stroke();
        }
      } else if (b.id === 'shield') {
        // shimmering dashed bubble outline
        const shPulse = 0.45 + Math.sin(clock / 600) * 0.15;
        ctx.globalAlpha = shPulse; ctx.strokeStyle = '#8AB0FF'; ctx.lineWidth = 2.5;
        ctx.setLineDash([6, 4]);
        ctx.beginPath(); ctx.arc(px, py, pr + 7, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
      } else if (b.id === 'lucky') {
        // golden sparkle halo
        for (let s = 0; s < 5; s++) {
          const a = (clock / 800 + s * Math.PI * 2 / 5) % (Math.PI * 2);
          const rr = pr + 22 + Math.sin(clock / 400 + s) * 4;
          ctx.globalAlpha = 0.75; ctx.fillStyle = '#FFD23F';
          ctx.font = '10px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText('✦', px + Math.cos(a) * rr, py + Math.sin(a) * rr);
        }
      } else if (b.id === 'twin') {
        // double-ring pulse every 1.8s
        const twinPh = (clock % 1800) / 1800;
        ctx.globalAlpha = (1 - twinPh) * 0.35; ctx.strokeStyle = '#FF9F5A'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(px, py, pr + twinPh * 50, 0, Math.PI * 2); ctx.stroke();
      } else if (b.id === 'dash') {
        // soft persistent afterimage ring between dashes
        ctx.globalAlpha = 0.2 * (0.5 + 0.5 * Math.sin(clock / 280)); ctx.strokeStyle = '#5AFFA0'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(px, py, pr + 14, 0, Math.PI * 2); ctx.stroke();
      } else if (b.id === 'tremor') {
        // pulsing impact rings to hint at the radius-shrink power
        const trmPh = (clock % 900) / 900;
        ctx.globalAlpha = (1 - trmPh) * 0.4; ctx.strokeStyle = '#FF7A00'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(px, py, pr + trmPh * 35, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.restore();
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
  // Dense City §3: lightweight FPS sampler (capped log count) for perf proof
  let fpsAcc = 0, fpsN = 0, fpsLogs = 0;
  let fpsSmooth = 0; // Prompt 6 §4: smoothed FPS for the ?debug=fps overlay
  function resetClock() { last = performance.now(); acc = 0; }

  function frame(now: number) {
    raf = requestAnimationFrame(frame);
    let delta = now - last;
    last = now;
    if (delta > CONFIG.MAX_DT) delta = CONFIG.MAX_DT; // clamp
    if (delta < 0) delta = 0;
    clock += delta;

    // Prompt 6 §4: smoothed instantaneous FPS (near-zero cost)
    if (delta > 0) fpsSmooth = fpsSmooth ? fpsSmooth * 0.9 + (1000 / delta) * 0.1 : 1000 / delta;

    // Dense City §3: sample FPS a few times per match (perf proof)
    fpsAcc += delta; fpsN++;
    if (screen === 'game' && !paused && fpsAcc >= 2000) {
      if (fpsLogs < 5) {
        console.log(`PERF fps=${(fpsN * 1000 / fpsAcc).toFixed(1)} objects=${world ? world.objects.length : 0}`);
        fpsLogs++;
      }
      fpsAcc = 0; fpsN = 0;
    }

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
          // v13 §0: fairness assertion — at EAT! all 6 radii must equal PLAYER_BASE_RADIUS
          const base = CONFIG.PLAYER_BASE_RADIUS;
          const allV: (Player | Rival)[] = [player, ...rivals];
          const bad = allV.filter((v) => Math.abs(v.radius - base) > 0.5);
          if (bad.length > 0) {
            console.warn('[v13 §0 ASSERTION FAIL] radii at EAT! differ from base:',
              bad.map((v) => `${v === player ? 'YOU' : (v as Rival).name}: r=${v.radius.toFixed(2)}`).join(', '));
          } else {
            console.log(`[v13 §0 ✓] All ${allV.length} radii = ${base} at EAT!`);
          }
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
      audio.init(); // resume AudioContext after tab returns to foreground
    }
  }
  document.addEventListener('visibilitychange', onVisibility);

  // ── public API ──
  function buildSnapshot(): Snapshot {
    const _lawCeiling = CONFIG.GROWTH_LAW_BASE + CONFIG.GROWTH_LAW_RATE * (roundElapsed / 1000);
    const _radii: Snapshot['radii'] = (player && screen === 'game') ? [
      { name: player.name || 'YOU', radius: player.radius, mass: Math.round(player.mass), score: player.score, overLaw: player.radius > _lawCeiling },
      ...rivals.filter((r) => r.alive).map((r) => ({
        name: r.name, radius: r.radius, mass: Math.round(r.mass), score: r.score, overLaw: r.radius > _lawCeiling,
      })),
    ] : [];
    return {
      screen: screen,
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
          trophies: { earned: meta.data.trophiesEarned, counters: meta.data.trophyCounters }, // v12 §5
      radii: _radii,
      heldSpell,
      activeSpell,
      spellTimer,          // War Pack §3
      spellTimerMax,       // War Pack §3
      showHitboxes,
      contracts: [...activeContracts],
      killedBy: killedBy || undefined, // Phase 7b §4: who ate the player
      planName: world?.planName, // v16.2 §6
      matchStartSeq, // Rebuild Prompt 10
    };
  }

  // Phase 7a §2: internal spell executor — called by auto-cast timer and legacy castSpell()
  function _executeCast(spellId: string) {
    if (!player) return;
    const spellDef = CONFIG.SPELLS.find((s) => s.id === spellId);
    const spellColor = spellDef?.color ?? '#7BFFED';
    activeSpell = spellId;
    heldSpell = null;
    console.log('POWER ACTIVATED: ' + spellId);
    switch (spellId) {
      case 'event_horizon':
        spellTimer = 6000; spellTimerMax = 6000;
        audio.playEventHorizon();
        break;
      case 'wormhole': {
        audio.playWormhole();
        const mag = Math.hypot(player.vx, player.vy);
        const ddx = mag > 0.1 ? player.vx / mag : 0;
        const ddy = mag > 0.1 ? player.vy / mag : -1;
        const dashDist = player.radius * 8;
        player.x = clamp(player.x + ddx * dashDist, player.radius + 10, CONFIG.MAP_SIZE - player.radius - 10);
        player.y = clamp(player.y + ddy * dashDist, player.radius + 10, CONFIG.MAP_SIZE - player.radius - 10);
        player.vx = ddx * 220; player.vy = ddy * 220;
        player.ghostTime = 500;
        fx.addRing(player.x, player.y, spellColor, 5, player.radius * 4, 5, 400);
        banner(`⚡ WORMHOLE!`, spellColor, 3);
        activeSpell = null; spellTimer = 0; spellTimerMax = 0;
        break;
      }
      case 'time_warp':
        spellTimer = 5000; spellTimerMax = 5000;
        audio.startTimeWarpFilter();
        break;
      case 'singularity':
        singularity = { x: player.x, y: player.y, timer: 4000, score: 0 };
        spellTimer = 4000; spellTimerMax = 4000;
        audio.playSingularity();
        break;
      default: spellTimer = 5000; spellTimerMax = 5000;
    }
    if (activeSpell) banner(`${spellDef?.name ?? spellId.toUpperCase()}!`, spellColor, 2);
    fx.addRing(player.x, player.y, spellColor, player.radius, player.radius + 120, 5, 500);
    notify();
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
      // v12 §4: daily mod determined by day-of-week (0=Sun…6=Sat)
      const mod = DAILY_MODS[new Date().getDay()];
      dailyData = { id: mod.id, seed: 'daily_' + today, name: mod.name, desc: mod.desc };
      screen = 'dailyIntro';
      notify();
    },
    goHome() { screen = 'home'; paused = false; queuedSpell = null; audio.stopMusic(); joystick.setEnabled(false); notify(); },
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
    castSpell() {
      // Phase 7a §2: power button removed — auto-cast fires from pickup timer.
      // castSpell() is kept for API compatibility; fires heldSpell if still set.
      if (!heldSpell || !player) return;
      const spellId = heldSpell.id.replace('spell_', '');
      heldSpell = null;
      _executeCast(spellId);
    },
    toggleHitboxes() { showHitboxes = !showHitboxes; notify(); return showHitboxes; },
    // Sound Pack Phase 6: iOS unlock — call on first pointerdown on the title screen
    unlockAudio() {
      audio.init();
      import('tone').then((T) => T.start()).catch(() => {/* ignore */});
    },
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
