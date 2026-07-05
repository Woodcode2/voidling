// ─────────────────────────────────────────────────────────────────────────────
// VOIDLING v4 — central tuning + data. Everything the game reads lives here.
// ─────────────────────────────────────────────────────────────────────────────

export type ObjectKind =
  // T1
  | 'apple' | 'flower' | 'flowerpot' | 'gnome'
  // T2
  | 'mailbox' | 'hydrant' | 'trashcan' | 'duck' | 'bike'
  // T3
  | 'person' | 'dog' | 'bench' | 'birdbath' | 'cafetable'
  // T4
  | 'car' | 'tree' | 'foodcart' | 'shed' | 'fountain'
  // T5
  | 'house'
  // Landmark
  | 'watertower'
  // v7 §3: new objects with personality
  | 'cat' | 'squirrel' | 'bird' | 'trampoline' | 'drone' | 'schoolbus'
  | 'bbq' | 'mower' | 'hoop' | 'icecream' | 'scooter'
  // v7 §2: playground equipment + school trophy
  | 'sandbox' | 'swingset' | 'slide' | 'seesaw' | 'school'
  // legacy decor (still drawable, used sparingly)
  | 'mushroom' | 'bush' | 'gazebo'
  // v12 §1: downtown objects
  | 'shop' | 'library' | 'office' | 'skyscraper'
  // v13 §2: Sandy Shores beach objects
  | 'palm' | 'umbrella' | 'sandcastle' | 'surfboard' | 'lifeguard' | 'towel'
  | 'crab' | 'seashell' | 'kayak' | 'car_parked_a' | 'car_parked_b';

export type AccessoryType =
  | 'tricorn' | 'eyepatch' | 'earring'       // pirate
  | 'tiara' | 'sparkleTrail'                 // princess
  | 'helmet' | 'badge'                       // astronaut
  | 'headband'                               // ninja
  | 'wizardHat' | 'beard'                    // wizard
  | 'catEars' | 'whiskers' | 'catMouth'      // kitty
  | 'horns' | 'devilTail' | 'devilBrow';     // devil

export type EyeStyle = 'normal' | 'angled' | 'lashes' | 'angry';

export interface SkinDef {
  id: string;
  name: string;
  cost: number;
  bodyColor: string;
  glowColor: string;
  eyeStyle: EyeStyle;
  extraBlush?: boolean;
  accessories: AccessoryType[];
  premium?: boolean;    // v7 §9: real-money skin (mock IAP)
  priceUSD?: number;    // v7 §9: display price for premium skins
  eyeGlow?: string;     // v9 §6: glowing eye color (lava, dragon)
}

export interface BoonDef {
  id: string;
  name: string;
  desc: string;
}

export interface KindInfo {
  tier: number;
  minR: number;
  maxR: number;
}

export const CONFIG = {
  // Timing
  FIXED_DT: 1000 / 60,   // fixed simulation step (ms)
  MAX_DT: 50,            // clamp frame delta so backgrounding never teleports
  GAME_DURATION: 180,    // v6 §1: 3-minute rounds
  COUNTDOWN_MS: 3600,    // v8 §1: frozen "3..2..1" pre-round (1200ms per count)

  // ── v6 §1: match structure ──
  BOON_PICK_TIMES: [150000, 100000, 50000], // ms remaining: 2:30, 1:40, 0:50
  COINS_PER_SCORE: 200,                       // v7 §9: coins = floor(score / 200)

  // ── v6 §3: evolution ladder (radius-driven, forms only go up in a round) ──
  FORMS: [
    { name: 'VOIDLING',    radius: 18 },
    { name: 'MUNCHER',     radius: 38 },
    { name: 'GOBBLER',     radius: 58 },
    { name: 'DEVOURER',    radius: 84 },
    // v13 §0: final threshold raised (125→155) — 5 crowns by 1:00 should be impossible
    { name: 'WORLD ENDER', radius: 155 },
  ] as { name: string; radius: number }[],
  FORM_SPEED_BONUS: 0.08,        // +8% move speed per form gained, stacking
  EVO_SLOWMO_MS: 600,
  EVO_MORPH_MS: 500,             // v9 §3: body morph crossfade on each evolution
  EVO_SLOWMO_SCALE: 0.3,
  DEVOURER_FORM_INDEX: 3,        // leader decay applies above this form

  // ── v6 §2: respawn + catch-up ──
  RESPAWN_TARGET_FRAC: 0.90,     // v8 §2: keep world ≥90% of initial population
  RESPAWN_RATE_MIN: 2,           // objects/sec
  RESPAWN_RATE_MAX: 4,
  GOLDEN_START_MS: 165000,       // 2:45 remaining — golden objects begin
  GOLDEN_INTERVAL: 12000,
  GOLDEN_MASS_MULT: 3,
  GOLDEN_SCORE_MULT: 3,
  UNDERDOG_SPEED: 0.12,          // 5th/6th place move-speed bonus
  UNDERDOG_GROWTH: 0.25,         // 5th/6th place growth bonus
  LEADER_DECAY_RATE: 0.004,      // mass fraction/sec above DEVOURER

  // ── v6 §5: world events (times are ms remaining) ──
  EVENT_WARN_MS: 2000,
  GOLDEN_RUSH_TIME: 125000,      // 2:05
  GOLDEN_RUSH_DURATION: 10000,
  SHRINK_STORM_TIME: 70000,      // 1:10
  SHRINK_STORM_DURATION: 12000,
  SHRINK_STORM_SPEED_FRAC: 0.7,  // cloud speed vs base player speed
  SHRINK_STORM_LOSS: 0.12,
  FIRETRUCK_DURATION: 12000,     // v9 §5: TOWN FIGHTS BACK v2 lasts 12s
  FIRETRUCK_SLOW: 0.25,          // v9 §5: 25% slow under spray

  // ── v6 §6: bot brain ──
  BOT_SATED_MS: 6000,            // after eating, only graze for this long
  BOT_ANTIIDLE_MS: 4000,         // window to check for being stuck
  BOT_ANTIIDLE_DIST: 80,         // moved less than this in the window → retarget
  BOT_NOEAT_MS: 6000,            // no eat for this long → retarget
  BOT_WALL_MARGIN: 150,          // start steering away within this of an edge
  BOT_WALL_FORCE: 1.2,           // repulsion strength near walls
  BOT_PERCEPTION: 850,           // v9 §2: bots only sense within ~1.5 screen-widths (no global map knowledge)
  BOT_AIM_ERROR_DEG: 15,         // v9 §2: ±aim error, re-corrected every 300–600ms

  // ── v6 §7: world edge fade to starfield ──
  EDGE_FADE: 60,

  // ── v6 §11: home ──
  HOME_TAGLINE: 'THE CUTE WORLD ENDER',

  // Controls (relative-drag virtual joystick)
  JOYSTICK_MAX_DIST: 110,   // px from anchor for full speed
  SHOW_JOYSTICK_RING: false, // v5 §2: anchor-ring viz OFF by default (nothing at finger)

  // Movement feel contract (px/s, px/s²) — v4 §3
  MOVE_ACCEL: 2400,         // toward joystick vector
  MOVE_MAX_SPEED: 340,      // at base size (boons stack on top)
  MOVE_DECEL: 1800,         // on release

  // Camera — v5 §1 (zoom OUT as you grow; no dead zone; velocity lookahead)
  CAM_VIEW_BASE: 620,          // v10 §4: street-level intimacy at round start
  CAM_VIEW_GROWTH: 8,          // + world px per (radius - base radius)
  CAM_VIEW_MAX: 1500,
  CAM_ZOOM_LERP: 0.05,
  CAM_POS_LERP: 0.12,
  CAM_LOOKAHEAD: 70,           // px lead in normalized velocity direction
  CAM_LOOKAHEAD_LERP: 0.08,

  // Suction physics — v4 §2
  CAPTURE_RADIUS_MULT: 1.35,
  ABSORB_RADIUS_MULT: 0.75,
  SUCTION_MAX_SPEED: 600,   // px/s
  SUCTION_ACCEL: 2800,      // px/s²

  // Too-big collision feedback — §0 fix
  TOOBIG_COOLDOWN: 500,     // ms

  // World — v12 §1: the full town — 5×5 grid, 4000×4000
  MAP_SIZE: 4000,
  BLOCK_SIZE: 700,           // 5*700 + 4*100 roads = 3900 + 50*2 margin = 4000
  ROAD_WIDTH: 100,             // v10 §6: narrower roads (was 120)
  SIDEWALK: 44,
  GRID: 5,
  PLAYER_BASE_RADIUS: 18,    // v7 §1: everyone (player + all bots) starts here, identical
  MAX_RADIUS: 170,           // v13 §0: raised (140→170) to match new WORLD ENDER threshold
  DIMINISH_BASE: 18,         // v7 §1: reference radius for (base/current)^0.5 growth falloff

  // v13 §1: The Last Slice — SW coastline geometry
  COAST_SAND_DEPTH: 75,      // px of sand band on west/south edges inside the map
  COAST_WATER_SLOW: 0.8,     // speed multiplier when wading in the coastal sand zone (20% slow)

  // Living world speeds (px/s)
  CAR_SPEED: 60, CAR_FLEE_SPEED: 140,
  PERSON_SPEED: 30, PERSON_FLEE_SPEED: 120,
  DUCK_SPEED: 22, DOG_SPEED: 70,
  // v7 §3: new movers
  BIRD_SPEED: 40, BIRD_FLEE_SPEED: 240,   // birds bolt early and fast
  CRITTER_SPEED: 46, CRITTER_FLEE_SPEED: 210,  // cat / squirrel
  DRONE_SPEED: 115, DRONE_SCORE_MULT: 2,  // delivery drone: fast, 2× score
  BUS_SPEED: 82,                          // school bus cruises the grid
  MOWER_SPEED: 34,                        // lawn mower putters
  TRAMPOLINE_BOUNCE: 120,                 // px launch for a too-small player
  ICECREAM_JINGLE_RANGE: 320,             // play jingle when player within

  // Population / respawn — v12 §1: larger 5×5 world
  TARGET_POPULATION: 800,
  RESPAWN_MIN: 540,         // trickle small objects if below this
  DENSITY_MULT: 1,          // v5 §7: debug-panel density multiplier
  TRAFFIC_CARS: 12,         // v7 §2: cars cruising the road grid (10–14)

  // Absorb / orbit / merge
  ABSORB_SHRINK_TIME: 190,
  ORBIT_RADIUS_OFFSET: 26,   // v5 §4: chips sit at playerRadius + 26
  ORBIT_SPEED: 0.6,          // v5 §4: rad/s (applied as orbitClock/1000 * this)
  ORBIT_MAX: 6,
  COMBO_DECAY_TIME: 4200,
  EAT_RATIO: 0.9,           // eater.radius must exceed target.size * this to absorb objects

  // Water tower is a WORLD-EATER-scale prize
  WATERTOWER_EAT_RADIUS: 300,
  SKYSCRAPER_EAT_RADIUS: 125, // v12 §1: skyscrapers require WORLD ENDER size
  FINAL_FEAST_MS: 30000,      // v12 §2: last 30s triggers the FINAL FEAST
  USE_GROUND_TILES: true,     // v12 §6: tile PNG ground textures when present

  // Audio master levels — v5 §5 (debug-panel adjustable)
  MUSIC_GAIN: 0.3,
  SFX_GAIN: 1,

  // Rivals
  RIVAL_COUNT: 5,
  RIVAL_EAT_RATIO: 1.15,    // eater radius >= 1.15x eaten radius
  GHOST_TIME: 2500,         // invulnerable ms after being eaten
  RESPAWN_MASS_FRAC: 0.65,  // respawn at 65% of mass

  // Bot aggression curve — §7 fix
  AGGRO_START_MS: 15000,    // 0 aggression before this much elapsed
  AGGRO_FULL_MS: 45000,     // 1.0 aggression at/after this
  HUNT_MIN_AGGRO: 0.5,      // HUNT (targeting voids) needs at least this
  RIVAL_SPAWN_SCREENS: 1.5, // bigger-than-player rivals spawn this many screens away

  COLORS: {
    // ── UI: Electric Pop ──
    uiBg: '#14082B',
    uiBg2: '#1E0F3D',
    uiText: '#FFFFFF',
    playBtn: '#FF3D68',
    playBtnEdge: '#B81E44',
    secondaryBtn: '#FFD23F',
    secondaryBtnEdge: '#C79A12',
    secondaryText: '#14082B',

    // ── Ground: muted so it recedes (nothing more contrasty than smallest edible) ──
    ground: {
      asphalt: '#8A93A6',
      asphaltEdge: '#7C8598',
      sidewalk: '#D8D3C8',
      sidewalkSeam: 'rgba(0,0,0,0.06)',
      lane: 'rgba(255,255,255,0.4)',
      lawns: ['#8FCDA0', '#7FC494', '#98D3A8'],
      pavement: '#E4DECF',
      pavementSeam: 'rgba(0,0,0,0.05)',
      pond: '#2D9CDB',          // v10 §2: vivid palette match
      pondEdge: '#FFFFFF',
      driveway: '#C9C4B8',
      dirt: '#B79A6B',
    },

    // Sticker style
    outline: '#FFFFFF',
    shadow: 'rgba(0,0,0,0.14)',

    // Voidling default
    voidBody: '#3A1E6B',
    voidGlow: '#B388FF',
    voidEye: '#FFFFFF',
    pupil: '#1A0B33',

    pops: ['#FF3D68', '#FFD23F', '#2D9CDB', '#1CC6AE', '#B388FF', '#FF9F1C'],
    tierTint: ['#FF6F91', '#FFD23F', '#7ED0FF', '#B388FF', '#FF9F1C', '#FFFFFF'],
  },

  // Per-kind sizing + tier (structured placement reads this)
  KIND_INFO: {
    // T1
    flower:     { tier: 1, minR: 11, maxR: 15 },
    flowerpot:  { tier: 1, minR: 12, maxR: 15 },
    gnome:      { tier: 1, minR: 13, maxR: 16 },
    apple:      { tier: 1, minR: 11, maxR: 14 },
    // T2
    mailbox:    { tier: 2, minR: 19, maxR: 22 },
    hydrant:    { tier: 2, minR: 18, maxR: 21 },
    trashcan:   { tier: 2, minR: 20, maxR: 24 },
    duck:       { tier: 2, minR: 18, maxR: 24 },
    bike:       { tier: 2, minR: 24, maxR: 28 },
    // T3
    person:     { tier: 3, minR: 28, maxR: 34 },
    dog:        { tier: 3, minR: 28, maxR: 33 },
    bench:      { tier: 3, minR: 36, maxR: 44 },
    birdbath:   { tier: 3, minR: 30, maxR: 36 },
    cafetable:  { tier: 3, minR: 34, maxR: 40 },
    // T4
    car:        { tier: 4, minR: 54, maxR: 66 },
    tree:       { tier: 4, minR: 58, maxR: 72 },
    foodcart:   { tier: 4, minR: 56, maxR: 66 },
    shed:       { tier: 4, minR: 62, maxR: 74 },
    fountain:   { tier: 4, minR: 58, maxR: 68 },
    // T5
    house:      { tier: 5, minR: 92, maxR: 116 },
    // Landmark
    watertower: { tier: 6, minR: 150, maxR: 150 },
    // v7 §3: new objects
    squirrel:   { tier: 1, minR: 12, maxR: 15 },
    bird:       { tier: 1, minR: 10, maxR: 13 },
    cat:        { tier: 2, minR: 18, maxR: 22 },
    scooter:    { tier: 2, minR: 20, maxR: 24 },
    drone:      { tier: 3, minR: 22, maxR: 26 },
    bbq:        { tier: 3, minR: 28, maxR: 33 },
    mower:      { tier: 3, minR: 26, maxR: 31 },
    trampoline: { tier: 4, minR: 42, maxR: 48 },
    hoop:       { tier: 4, minR: 42, maxR: 48 },
    icecream:   { tier: 4, minR: 44, maxR: 50 },
    schoolbus:  { tier: 5, minR: 78, maxR: 90 },
    // v7 §2: playground + school
    sandbox:    { tier: 3, minR: 34, maxR: 40 },
    seesaw:     { tier: 3, minR: 34, maxR: 40 },
    swingset:   { tier: 4, minR: 50, maxR: 58 },
    slide:      { tier: 4, minR: 46, maxR: 54 },
    school:     { tier: 5, minR: 104, maxR: 122 },
    // decor
    bush:       { tier: 2, minR: 22, maxR: 30 },
    mushroom:   { tier: 1, minR: 10, maxR: 14 },
    gazebo:     { tier: 5, minR: 92, maxR: 110 },
    // v12 §1: downtown objects
    shop:       { tier: 3, minR: 38, maxR: 48 },
    library:    { tier: 4, minR: 62, maxR: 76 },
    office:     { tier: 5, minR: 88, maxR: 104 },
    skyscraper: { tier: 6, minR: 115, maxR: 130 },
    // v13 §2: Sandy Shores beach objects
    seashell:      { tier: 1, minR: 10, maxR: 14 },
    crab:          { tier: 2, minR: 18, maxR: 24 },
    towel:         { tier: 2, minR: 22, maxR: 28 },
    sandcastle:    { tier: 2, minR: 20, maxR: 26 },
    umbrella:      { tier: 3, minR: 30, maxR: 38 },
    surfboard:     { tier: 3, minR: 34, maxR: 42 },
    palm:          { tier: 4, minR: 56, maxR: 70 },
    lifeguard:     { tier: 4, minR: 52, maxR: 64 },
    kayak:         { tier: 4, minR: 58, maxR: 72 },
    car_parked_a:  { tier: 4, minR: 54, maxR: 66 },
    car_parked_b:  { tier: 4, minR: 54, maxR: 66 },
  } as Record<ObjectKind, KindInfo>,

  // Which kinds run away from a nearby, bigger void
  FLEEING_KINDS: ['duck', 'dog', 'person'] as ObjectKind[],

  SKINS: [
    { id: 'classic',   name: 'Classic',   cost: 0,    bodyColor: '#3A1E6B', glowColor: '#B388FF', eyeStyle: 'normal', accessories: [] },
    { id: 'pirate',    name: 'Pirate',    cost: 800,  bodyColor: '#2C2C36', glowColor: '#8A8AA0', eyeStyle: 'normal', accessories: ['tricorn', 'eyepatch', 'earring'] },
    { id: 'princess',  name: 'Princess',  cost: 800,  bodyColor: '#FF7FC1', glowColor: '#FFC2E2', eyeStyle: 'lashes', extraBlush: true, accessories: ['tiara', 'sparkleTrail'] },
    { id: 'astronaut', name: 'Astronaut', cost: 1000, bodyColor: '#E9EDF6', glowColor: '#AFC6FF', eyeStyle: 'normal', accessories: ['helmet', 'badge'] },
    { id: 'ninja',     name: 'Ninja',     cost: 800,  bodyColor: '#2A2A38', glowColor: '#5E6E8C', eyeStyle: 'angled', accessories: ['headband'] },
    { id: 'wizard',    name: 'Wizard',    cost: 1000, bodyColor: '#5B3AA6', glowColor: '#C9A6FF', eyeStyle: 'normal', accessories: ['wizardHat', 'beard'] },
    { id: 'kitty',     name: 'Kitty',     cost: 600,  bodyColor: '#FFAE73', glowColor: '#FFD9B8', eyeStyle: 'normal', accessories: ['catEars', 'whiskers', 'catMouth'] },
    { id: 'devil',     name: 'Devil',     cost: 1200, bodyColor: '#E63946', glowColor: '#FF6B6B', eyeStyle: 'angry', accessories: ['horns', 'devilTail', 'devilBrow'] },
    // v7 §9: PREMIUM cash skins (mock IAP — no real payments)
    { id: 'galaxy',    name: 'Galaxy',    cost: 0, premium: true, priceUSD: 2.99, bodyColor: '#0D0821', glowColor: '#B98CFF', eyeStyle: 'normal', accessories: [] },
    { id: 'lava',      name: 'Lava',      cost: 0, premium: true, priceUSD: 1.99, bodyColor: '#14090A', glowColor: '#FF7A2B', eyeStyle: 'angry', eyeGlow: '#FF6A00', accessories: [] },
    { id: 'ghost',     name: 'Ghost',     cost: 0, premium: true, priceUSD: 1.99, bodyColor: '#EAF2FF', glowColor: '#7FDBFF', eyeStyle: 'normal', accessories: [] },
    { id: 'midas',     name: 'King Midas', cost: 0, premium: true, priceUSD: 2.99, bodyColor: '#FFD447', glowColor: '#FFD23F', eyeStyle: 'normal', accessories: ['tiara'] },
    { id: 'disco',     name: 'Disco',     cost: 0, premium: true, priceUSD: 2.99, bodyColor: '#3A3A55', glowColor: '#FF5AF0', eyeStyle: 'normal', accessories: [] },
    { id: 'dragon',    name: 'Dragon',    cost: 0, premium: true, priceUSD: 3.99, bodyColor: '#1DB954', glowColor: '#7CFF6B', eyeStyle: 'angry', eyeGlow: '#FFB000', accessories: [] },
  ] as SkinDef[],

  // v6 §4: renamed POWER-UPS (ids unchanged so effect logic still keys off them)
  BOONS: [
    { id: 'magnet',    name: 'Gravity Glutton', desc: 'Absorb reach +40%' },
    { id: 'overdrive', name: 'Zoomies',         desc: 'Move speed +25%' },
    { id: 'twin',      name: 'Double Stomach',  desc: 'Merges need only 2' },
    { id: 'time',      name: 'Borrowed Time',   desc: '+15 seconds, instantly' },
    { id: 'tremor',    name: 'Tenderizer',      desc: 'Touch shrinks big things' },
    { id: 'greed',     name: 'Midas Mouth',     desc: 'All score ×1.5' },
    // v7 §5: four new power-ups
    { id: 'echo',      name: 'Echo Bite',       desc: 'Every 5th bite pulls snacks in' },
    { id: 'shield',    name: 'Bubble Shield',   desc: 'Blocks one chomp, then pops' },
    { id: 'dash',      name: 'Void Dash',       desc: 'Auto-dash 100px every 6s' },
    { id: 'lucky',     name: 'Lucky Gnome',     desc: 'A golden snack every 10s' },
  ] as BoonDef[],

  // v7 §5: synergies — auto-trigger when BOTH members are active at once.
  SYNERGIES: [
    { id: 'sonic',    name: 'SONIC SNACK',   needs: ['overdrive', 'dash'] },   // rainbow speed trail
    { id: 'horizon',  name: 'EVENT HORIZON', needs: ['magnet', 'echo'] },      // constant gentle pull
    { id: 'goldrush', name: 'GOLD RUSH',     needs: ['greed', 'lucky'] },      // faster golden spawns
  ] as { id: string; name: string; needs: string[] }[],

  // Rival identity pools
  BOT_NAMES: ['Kai', 'Luna', 'Maks', 'Ava', 'Rin', 'Zoe', 'Leo', 'Mia', 'Yuki', 'Bex', 'Nova', 'Oda', 'Pia', 'Rex', 'Sol', 'Tao'],
  BOT_COUNTRIES: ['JP', 'BR', 'PL', 'US', 'KR', 'DE', 'FR', 'GB', 'IN', 'MX', 'CA', 'ES', 'IT', 'SE', 'NG', 'AU'],
  BOT_COLORS: [
    { body: '#FF3D68', glow: '#FF9BB5' },
    { body: '#2D9CDB', glow: '#9AD2F5' },
    { body: '#FFD23F', glow: '#FFE79A' },
    { body: '#33C46B', glow: '#A6EBC0' },
    { body: '#FF9F1C', glow: '#FFCf8A' },
    { body: '#9B5DE5', glow: '#D0AEF7' },
    { body: '#00BBF9', glow: '#9BE4FE' },
    { body: '#F15BB5', glow: '#F9AFD9' },
  ],
};
