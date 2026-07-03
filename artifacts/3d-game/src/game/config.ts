// ─────────────────────────────────────────────────────────────────────────────
// VOIDLING v2 — central tuning + data. Everything the game reads lives here.
// ─────────────────────────────────────────────────────────────────────────────

export type ObjectKind =
  | 'apple' | 'flower' | 'mushroom'          // T1
  | 'duck' | 'dog'                           // T2
  | 'person' | 'bench' | 'bush'              // T3
  | 'car' | 'tree' | 'fountain' | 'foodcart' // T4
  | 'gazebo';                                // T5

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

export interface TierDef {
  tier: number;
  kinds: ObjectKind[];
  minR: number;
  maxR: number;
  count: number;
}

export const CONFIG = {
  // Timing
  FIXED_DT: 1000 / 60,   // fixed simulation step (ms)
  MAX_DT: 50,            // clamp frame delta so backgrounding never teleports
  GAME_DURATION: 90,     // seconds

  // Controls (relative-drag virtual joystick)
  JOYSTICK_MAX_DIST: 110,   // px from anchor for full speed
  PLAYER_MAX_SPEED: 0.46,   // world units / ms at full tilt
  RELEASE_DECEL_MS: 200,    // glide to a stop on release

  // World
  MAP_SIZE: 3200,
  PLAYER_BASE_RADIUS: 26,

  // Absorb / orbit / merge
  ABSORB_SHRINK_TIME: 190,
  ORBIT_RADIUS_OFFSET: 16,
  ORBIT_SPEED: 0.0024,
  ORBIT_MAX: 6,
  COMBO_DECAY_TIME: 4200,
  EAT_RATIO: 0.9,           // eater.radius must exceed target.size * this to absorb objects

  // Rivals
  RIVAL_COUNT: 5,
  RIVAL_EAT_RATIO: 1.15,    // eater radius >= 1.15x eaten radius
  RIVAL_OVERLAP: 0.6,       // overlap >= 60% of smaller
  GHOST_TIME: 2500,         // invulnerable ms after being eaten
  RESPAWN_MASS_FRAC: 0.65,  // respawn at 65% of mass

  COLORS: {
    // ── Electric Pop ──────────────────────────────────────────────────────
    uiBg: '#14082B',          // deep space violet (UI screens)
    uiBg2: '#1E0F3D',         // slightly lighter panel violet
    uiText: '#FFFFFF',
    playBtn: '#FF3D68',       // hot coral
    playBtnEdge: '#B81E44',   // darker coral bottom edge (2.5D)
    secondaryBtn: '#FFD23F',  // electric yellow
    secondaryBtnEdge: '#C79A12',
    secondaryText: '#14082B',

    // Arena
    field: '#1CC6AE',         // saturated turquoise
    fieldDark: '#15A892',
    path: '#FFD23F',
    pond: '#2D9CDB',
    pondEdge: '#1E7BB0',
    checkA: '#FF3D68',
    checkB: '#FFFFFF',

    // Sticker style
    outline: '#FFFFFF',
    shadow: 'rgba(0,0,0,0.12)',

    // Voidling default
    voidBody: '#3A1E6B',
    voidGlow: '#B388FF',
    voidEye: '#FFFFFF',
    pupil: '#1A0B33',

    pops: ['#FF3D68', '#FFD23F', '#2D9CDB', '#1CC6AE', '#B388FF', '#FF9F1C'],
    tierTint: ['#FF6F91', '#FFD23F', '#7ED0FF', '#B388FF', '#FF9F1C'],
  },

  // Object generation
  TIER_DEFS: [
    { tier: 1, kinds: ['apple', 'flower', 'mushroom'],        minR: 10, maxR: 16, count: 58 },
    { tier: 2, kinds: ['duck', 'dog'],                        minR: 18, maxR: 27, count: 34 },
    { tier: 3, kinds: ['person', 'bench', 'bush', 'dog'],     minR: 30, maxR: 44, count: 26 },
    { tier: 4, kinds: ['car', 'tree', 'fountain', 'foodcart'],minR: 52, maxR: 74, count: 14 },
    { tier: 5, kinds: ['gazebo'],                             minR: 92, maxR: 118, count: 3 },
  ] as TierDef[],

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
