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
  // legacy decor (still drawable, used sparingly)
  | 'mushroom' | 'bush' | 'gazebo';

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
  GAME_DURATION: 90,     // seconds

  // Controls (relative-drag virtual joystick)
  JOYSTICK_MAX_DIST: 110,   // px from anchor for full speed

  // Movement feel contract (px/s, px/s²) — v4 §3
  MOVE_ACCEL: 2400,         // toward joystick vector
  MOVE_MAX_SPEED: 340,      // at base size (boons stack on top)
  MOVE_DECEL: 1800,         // on release

  // Camera — v4 §3
  CAM_LERP: 0.10,
  CAM_DEADZONE: 40,         // screen px
  ZOOM_LERP: 0.06,
  PLAYER_SCREEN_TALL: 100,  // target on-screen diameter
  PLAYER_SCREEN_MIN: 64,
  PLAYER_SCREEN_MAX: 140,

  // Suction physics — v4 §2
  CAPTURE_RADIUS_MULT: 1.35,
  ABSORB_RADIUS_MULT: 0.75,
  SUCTION_MAX_SPEED: 600,   // px/s
  SUCTION_ACCEL: 2800,      // px/s²

  // Too-big collision feedback — §0 fix
  TOOBIG_COOLDOWN: 500,     // ms

  // World
  MAP_SIZE: 2800,
  BLOCK_SIZE: 800,
  ROAD_WIDTH: 120,
  SIDEWALK: 44,
  GRID: 3,
  PLAYER_BASE_RADIUS: 26,

  // Living world speeds (px/s)
  CAR_SPEED: 60, CAR_FLEE_SPEED: 140,
  PERSON_SPEED: 30, PERSON_FLEE_SPEED: 120,
  DUCK_SPEED: 22, DOG_SPEED: 70,

  // Population / respawn
  TARGET_POPULATION: 300,
  RESPAWN_MIN: 250,         // trickle small objects if below this

  // Absorb / orbit / merge
  ABSORB_SHRINK_TIME: 190,
  ORBIT_RADIUS_OFFSET: 22,
  ORBIT_SPEED: 0.0024,
  ORBIT_MAX: 6,
  COMBO_DECAY_TIME: 4200,
  EAT_RATIO: 0.9,           // eater.radius must exceed target.size * this to absorb objects

  // Water tower is a WORLD-EATER-scale prize
  WATERTOWER_EAT_RADIUS: 300,

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
      pond: '#8FBFE0',
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
    // decor
    bush:       { tier: 2, minR: 22, maxR: 30 },
    mushroom:   { tier: 1, minR: 10, maxR: 14 },
    gazebo:     { tier: 5, minR: 92, maxR: 110 },
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
    { id: 'devil',     name: 'Devil',     cost: 1200, bodyColor: '#C42A2A', glowColor: '#FF6B6B', eyeStyle: 'angry', accessories: ['horns', 'devilTail', 'devilBrow'] },
  ] as SkinDef[],

  BOONS: [
    { id: 'magnet',    name: 'Magnet',     desc: 'Absorb reach +40%' },
    { id: 'overdrive', name: 'Overdrive',  desc: 'Move speed +25%' },
    { id: 'twin',      name: 'Twin Merge', desc: 'Merges need only 2' },
    { id: 'time',      name: 'Time Shard', desc: '+10 seconds now' },
    { id: 'tremor',    name: 'Tremor',     desc: 'Bumps shrink big things' },
    { id: 'greed',     name: 'Greed',      desc: 'All score ×1.5' },
  ] as BoonDef[],

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
