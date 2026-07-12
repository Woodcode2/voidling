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
  | 'cat' | 'squirrel' | 'bird' | 'trampoline' | 'drone' | 'schoolbus' | 'train'
  | 'bbq' | 'mower' | 'hoop' | 'icecream' | 'scooter'
  // v7 §2: playground equipment + school trophy
  | 'sandbox' | 'swingset' | 'slide' | 'seesaw' | 'school'
  // legacy decor (still drawable, used sparingly)
  | 'mushroom' | 'bush' | 'gazebo'
  // v12 §1: downtown objects
  | 'shop' | 'library' | 'office' | 'skyscraper'
  // v13 §2: Sandy Shores beach objects
  | 'palm' | 'umbrella' | 'sandcastle' | 'surfboard' | 'lifeguard' | 'towel'
  | 'crab' | 'seashell' | 'kayak' | 'car_parked_a' | 'car_parked_b'
  // v16 §1: new civic + downtown sprites
  | 'cafe' | 'hospital' | 'house_c' | 'house_d'
  // v16 §6: The Guard
  | 'jeep' | 'soldier'
  // Rebuild Prompt 16: airport set
  | 'terminal' | 'control_tower' | 'hangar' | 'plane_blue' | 'plane_peach'
  | 'baggage_cart' | 'windsock' | 'fuel_truck'
  // Rebuild Prompt 16: toy army
  | 'radar_van'
  // v16.1 C: real town hall landmark
  | 'townhall'
  // v16.1 D: zoo animals + structures
  | 'elephant' | 'giraffe' | 'lion'
  | 'monkey' | 'flamingo' | 'penguin'
  | 'zoo_gate' | 'zoo_wall' | 'zookeeper'
  // Rebuild Prompt 16: additional zoo animals
  | 'bear' | 'zebra' | 'tortoise' | 'hippo' | 'panda' | 'seal'
  // Feel Patch: debris bit (tier 0, always edible)
  | 'bit'
  // War Pack §1: diverse pedestrians (replace old stick-figure 'person' in spawns)
  | 'person_biz' | 'person_jog' | 'person_kid' | 'person_granny' | 'person_fish'
  | 'person_sun' | 'person_guard' | 'person_dog' | 'person_const'
  // War Pack §1: new traffic + defense vehicles
  | 'taxi' | 'police_car' | 'school_bus' | 'fire_truck' | 'convertible' | 'army_jeep'
  // War Pack §1: new beach/park props
  | 'cooler' | 'rowboat' | 'picnic_table' | 'kite_prop' | 'icecream_cart'
  // Life Pack §1: people2 sheet (9 new detailed pedestrians)
  | 'person_mom' | 'person_dad' | 'skateboarder' | 'cyclist' | 'waiter'
  | 'icecream_vendor' | 'person_jog2' | 'person_elderly' | 'tourist'
  // Life Pack §3: vignette anchors (from vignettes_sheet 3×3, row-major)
  | 'vig_proposal' | 'vig_soccer' | 'vig_wedding' | 'vig_couple' | 'vig_busker'
  | 'vig_painter' | 'vig_selfie' | 'vig_kite' | 'vig_gardener'
  | 'vig_golf' | 'vig_mayor' | 'vig_school' | 'vig_yoga' | 'runner'
  // Life Pack §3: playground props (from playground_sheet 3×3)
  | 'pg_swing' | 'pg_slide' | 'pg_seesaw' | 'pg_sandbox' | 'pg_soccergoal'
  | 'pg_soccerball' | 'pg_hoop' | 'pg_trampoline' | 'pg_merrygoround'
  // Life Pack §4: military units (now clay toy army from Prompt 16)
  | 'tank' | 'attack_heli' | 'armored_humvee' | 'missile_truck'
  // Life Pack §2: sports fields (ground decals — not edible world objects)
  | 'field_soccer' | 'field_basketball' | 'field_tennis'
  | 'field_volleyball' | 'field_campsite' | 'field_beachclub' | 'field_golf'
  | 'beachball' | 'deckchair' | 'tent' | 'campfire' | 'landmark'
  // Prompt 18 Stage 4: street furniture (clay-mapped props)
  | 'streetlamp' | 'bus_stop';

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
  fx?: string;          // Skins overhaul: one-line effect tagline (shop copy)
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
  scoreMult?: number;  // v16.1 D: animals worth 2×
}

export const CONFIG = {
  // Timing
  FIXED_DT: 1000 / 60,   // fixed simulation step (ms)
  MAX_DT: 50,            // clamp frame delta so backgrounding never teleports
  GAME_DURATION: 210,    // v16.2 §6: 3:30 rounds
  COUNTDOWN_MS: 3600,    // v8 §1: frozen "3..2..1" pre-round (1200ms per count)

  // ── v6 §1: match structure ──
  BOON_PICK_TIMES: [170000, 110000, 60000], // v16.2 §6: ms remaining in 3:30 round (2:50, 1:50, 1:00)
  COINS_PER_SCORE: 200,                       // v7 §9: coins = floor(score / 200)

  // ── v6 §3: evolution ladder (radius-driven, forms only go up in a round) ──
  FORMS: [
    { name: 'VOIDLING',    radius: 18 },
    // First-timer audit: thresholds front-loaded (38/58/84 → 32/50/78) — a fresh
    // player's first playtest reached MUNCHER only at the final whistle, so the
    // whole evolution fantasy was invisible in match one. First evo now lands
    // ~40s in for an average run; WORLD ENDER stays a strong-run prize.
    { name: 'MUNCHER',     radius: 32 },
    { name: 'GOBBLER',     radius: 50 },
    { name: 'DEVOURER',    radius: 78 },
    { name: 'WORLD ENDER', radius: 110 },
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
  BOT_WALL_MARGIN: 400,          // start steering away within this of an edge
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

  // Suction physics — v4 §2 / Feel Patch: wider vacuum radius
  CAPTURE_RADIUS_MULT: 1.6,
  ABSORB_RADIUS_MULT: 0.75,
  SUCTION_MAX_SPEED: 600,   // px/s
  SUCTION_ACCEL: 2800,      // px/s²

  // Too-big collision feedback — §0 fix
  TOOBIG_COOLDOWN: 500,     // ms

  // v16.2 §0: bot radius cap — a bot's radius may never exceed player × this factor
  BOT_RADIUS_CAP_FRAC: 1.55,  // Overnight: was 1.25 — BELOW the 1.3 eat ratio, so rivals could NEVER eat you. Danger is real now.

  // v16.2 §2: The Guard blockade constants
  GUARD_JEEP_COUNT: 4,
  GUARD_SOLDIER_PER_LINE: 9,
  GUARD_BLOCKADE_LINES: 2,
  GUARD_SECOND_WAVE_DELAY: 45000, // ms after first blockade eaten

  // World — Phase 2: floating island — 12000×12000 world (2.5× old map)
  MAP_SIZE: 12000,
  BLOCK_SIZE: 1600,          // 6*1600 + 5*110 roads = 10150; margin 925 each side
  ROAD_WIDTH: 110,  // Prompt 18 Stage 3: reduced from 200 (~45% narrower roads)
  SIDEWALK: 100,
  // House-lot row grid (shared by world-gen AND the ground painter so internal
  // lanes/driveways bake in exactly the right places between house rows).
  LOT_ROW_INSET: 170,  // = SIDEWALK + 70 — first row offset from block edge
  LOT_ROW_STEP: 280,   // row/column spacing between lots
  LANE_OFFSET: 140,    // internal lane centerline = rowY + this (midway between rows)
  LANE_W: 56,          // internal lane width
  GRID: 6,
  PLAN_NAMES: ['METRO', 'SUBURBIA', 'SEASIDE'] as string[], // v16.2 §6: rotating city plans
  PLAYER_BASE_RADIUS: 18,    // v7 §1: everyone (player + all bots) starts here, identical
  MAX_RADIUS: 135,           // v16 §0: lowered to match new WORLD ENDER threshold (110)
  DIMINISH_BASE: 18,         // v7 §1: reference radius for (base/current)^0.5 growth falloff
  // v15 §0: The Growth Law — maxRadius(t) = BASE + RATE × secondsElapsed
  GROWTH_LAW_BASE: 18,       // px at t=0 (same as PLAYER_BASE_RADIUS)
  GROWTH_LAW_RATE: 0.92,     // px/s — being huge at 0:26 becomes mathematically impossible

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
  TARGET_POPULATION: 2000,
  RESPAWN_MIN: 1200,        // trickle small objects if below this
  DENSITY_MULT: 1,          // v5 §7: debug-panel density multiplier
  TRAFFIC_CARS: 34,         // v7 §2: cars cruising the road grid (busier streets)

  // Absorb / orbit / merge
  ABSORB_SHRINK_TIME: 150,       // ms for fly-in phase
  ORBIT_RADIUS_OFFSET: 30,       // v14 §2: chips sit at playerRadius + 30 (slightly wider for spiral room)
  ORBIT_SPEED: 1.8,              // v14 §2: rad/s — faster orbit spin for drama (was 0.6)
  ORBIT_MAX: 8,                  // v14 §2: capacity raised 6→8
  ORBIT_SPIRAL_DUR: 1800,        // v14 §2: normal spiral duration ms (1.6–2.0s midpoint)
  ORBIT_SPIRAL_DUR_FAST: 500,    // v14 §2: DEVOURER+ T1/T2 fast orbit ms
  COMBO_DECAY_TIME: 4200,
  EAT_RATIO: 0.9,           // eater.radius must exceed target.size * this to absorb objects
  // v15 §1: Collision truth — object contact radius multipliers
  CONTACT_SCALE: 0.90,       // global multiplier applied to obj.size during collision checks
  CONTACT_SCALE_OVERRIDES: { tree: 0.85, house_a: 0.85, house_b: 0.85, skyscraper_a: 0.80, skyscraper_b: 0.80 } as Record<string, number>,

  // Water tower is a WORLD-EATER-scale prize
  WATERTOWER_EAT_RADIUS: 300,
  SKYSCRAPER_EAT_RADIUS: 125, // v12 §1: skyscrapers require WORLD ENDER size
  // Structural Build: the downtown express train (rail loop food, WORLD-ENDER prey)
  TRAIN_SPEED: 120,        // wu/s → ~1 lap per 2.5 min
  TRAIN_CAR_GAP: 150,      // arc-length spacing loco → car
  TRAIN_EAT_RADIUS: 110,   // matches FORMS[4] WORLD ENDER threshold
  TRAIN_RESPAWN_MS: 30000,
  ZOO_GATE_EAT_RADIUS: 58,    // v16.1 D: zoo gate requires GOBBLER+
  FINAL_FEAST_MS: 30000,      // v12 §2: last 30s triggers the FINAL FEAST
  USE_GROUND_TILES: true,     // v12 §6: tile PNG ground textures when present

  // Audio master levels — v5 §5 (debug-panel adjustable)
  MUSIC_GAIN: 0.22,          // v14 §1: lowered (0.3→0.22) so samples sit clearly on top
  SFX_GAIN: 1,

  // v16 §0: rubber-band pacing — 4 bots (5 voids total)
  // Rank targets as fractions of player score: rank1=115%, rank2=95%, rank3=80%, rank4=60%
  // ±10% personality noise re-rolled every 20 s
  PACER_TARGETS: [1.15, 0.95, 0.80, 0.60] as number[],
  PACER_NOISE: 0.10,
  PACER_RETARGET_MS: 20000,

  // Rivals
  RIVAL_COUNT: 4,
  RIVAL_EAT_RATIO: 1.3,     // War Pack: eater radius >= 1.3× eaten radius (was 1.15)
  GHOST_TIME: 3000,         // invulnerable ms after being eaten (Death Rules Pivot: ~3s after ANY respawn)
  RESPAWN_MASS_FRAC: 0.65,  // respawn at 65% of mass

  // Bot aggression curve — §7 fix
  AGGRO_START_MS: 15000,    // 0 aggression before this much elapsed
  AGGRO_FULL_MS: 45000,     // 1.0 aggression at/after this
  HUNT_MIN_AGGRO: 0.5,      // HUNT (targeting voids) needs at least this
  RIVAL_SPAWN_SCREENS: 1.5, // bigger-than-player rivals spawn this many screens away

  // War Pack §2 + Life Pack §4: defense wave thresholds (% of world devoured)
  DEFENSE_POLICE_THRESH: 5,    // % devoured → police cars deploy
  DEFENSE_ARMY_THRESH: 20,     // % devoured → army jeeps + humvees join
  DEFENSE_FULL_THRESH: 35,     // % devoured → TANKS ROLL IN (+ missile trucks)
  DEFENSE_HELI_THRESH: 50,     // % devoured → AIR SUPPORT INBOUND (helicopters)
  DEFENSE_MAX_UNITS: 12,       // cap on active defense units (perf guard)
  DEFENSE_UNIT_SPEED: 190,     // px/s base speed toward player
  DEFENSE_TANK_SPEED: 70,      // px/s — tanks are heavy, move slowly
  DEFENSE_PELLET_SPEED: 220,   // px/s projectile speed
  DEFENSE_PELLET_COST: 20,     // score lost per pellet hit (no heart loss)
  DEFENSE_PELLET_CD: 2200,     // ms between pellets per unit
  DEFENSE_WAVE_CD: 18000,      // ms between wave reinforcements
  DEFENSE_SHELL_WARN_MS: 1000, // ms landing-circle visible before impact
  DEFENSE_SHELL_COST_PCT: 0.05,// 5% of score per shell/rocket hit

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
    train:      { tier: 5, minR: 66,  maxR: 80, scoreMult: 4 }, // Structural Build: express train
    landmark:   { tier: 5, minR: 150, maxR: 185, scoreMult: 5 }, // Structural Rebuild: marquee city trophies

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
    shop:       { tier: 3, minR: 50, maxR: 64 },
    library:    { tier: 4, minR: 62, maxR: 76 },
    office:     { tier: 5, minR: 130, maxR: 155 },  // Structural Rebuild: wide mid-rise city art needs real bulk
    skyscraper: { tier: 6, minR: 185, maxR: 215 },  // Prompt 19: calibrated to ≈6–7× person (was 4.4×)
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
    // v16 §1: new civic + downtown sprites
    cafe:          { tier: 4, minR: 72, maxR: 90 },
    hospital:      { tier: 5, minR: 100, maxR: 120 },
    house_c:       { tier: 5, minR: 92, maxR: 116 },
    house_d:       { tier: 5, minR: 92, maxR: 116 },
    // v16 §6: The Guard
    jeep:          { tier: 4, minR: 58, maxR: 72 },
    soldier:       { tier: 3, minR: 26, maxR: 32 },
    // v16.1 C: town hall landmark
    townhall:      { tier: 5, minR: 104, maxR: 122 },
    // v16.1 D: zoo animals (2× score) + zoo structures
    elephant:      { tier: 5, minR: 62, maxR: 74,  scoreMult: 2 },  // Prompt 19: calibrated to ≈2.2× person (was 3.2×)
    giraffe:       { tier: 4, minR: 72, maxR: 88,  scoreMult: 2 },
    lion:          { tier: 4, minR: 58, maxR: 72,  scoreMult: 2 },
    monkey:        { tier: 2, minR: 18, maxR: 24,  scoreMult: 2 },
    flamingo:      { tier: 2, minR: 20, maxR: 26,  scoreMult: 2 },
    penguin:       { tier: 2, minR: 18, maxR: 22,  scoreMult: 2 },
    bear:          { tier: 4, minR: 64, maxR: 80,  scoreMult: 2 },
    zebra:         { tier: 4, minR: 58, maxR: 72,  scoreMult: 2 },
    tortoise:      { tier: 2, minR: 22, maxR: 28,  scoreMult: 2 },
    hippo:         { tier: 5, minR: 78, maxR: 96,  scoreMult: 2 },
    panda:         { tier: 3, minR: 36, maxR: 46,  scoreMult: 2 },
    seal:          { tier: 2, minR: 24, maxR: 30,  scoreMult: 2 },
    zoo_gate:      { tier: 5, minR: 104, maxR: 122 },
    zoo_wall:      { tier: 4, minR: 48, maxR: 58 },
    zookeeper:     { tier: 3, minR: 28, maxR: 34 },
    // Rebuild Prompt 16: airport set (props are eatable bonus food, excluded from win math)
    terminal:      { tier: 5, minR: 96, maxR: 116 },
    control_tower: { tier: 5, minR: 92, maxR: 112 },
    hangar:        { tier: 5, minR: 100, maxR: 120 },
    plane_blue:    { tier: 5, minR: 88, maxR: 108 },
    plane_peach:   { tier: 5, minR: 86, maxR: 106 },
    baggage_cart:  { tier: 3, minR: 32, maxR: 42 },
    windsock:      { tier: 2, minR: 18, maxR: 24 },
    fuel_truck:    { tier: 4, minR: 56, maxR: 70 },
    // Rebuild Prompt 16: toy army additions
    radar_van:     { tier: 4, minR: 60, maxR: 76, scoreMult: 3 },
    // Feel Patch: debris bits — tier 0, always edible at any radius
    bit:           { tier: 0, minR: 4, maxR: 7 },
    // War Pack §1: people (T3 — same tier as old 'person', smaller for kid)
    person_biz:    { tier: 3, minR: 28, maxR: 34 },
    person_jog:    { tier: 3, minR: 28, maxR: 34 },
    person_kid:    { tier: 2, minR: 20, maxR: 26 },
    person_granny: { tier: 3, minR: 28, maxR: 34 },
    person_fish:   { tier: 3, minR: 28, maxR: 34 },
    person_sun:    { tier: 3, minR: 30, maxR: 38 },
    person_guard:  { tier: 3, minR: 28, maxR: 34 },
    person_dog:    { tier: 3, minR: 32, maxR: 40 },
    person_const:  { tier: 3, minR: 28, maxR: 34 },
    // War Pack §1: vehicles
    taxi:          { tier: 4, minR: 54, maxR: 66 },
    police_car:    { tier: 4, minR: 54, maxR: 66, scoreMult: 3 },
    school_bus:    { tier: 5, minR: 78, maxR: 90 },
    fire_truck:    { tier: 5, minR: 80, maxR: 96, scoreMult: 2 },
    convertible:   { tier: 4, minR: 50, maxR: 62 },
    army_jeep:     { tier: 4, minR: 58, maxR: 72, scoreMult: 3 },
    // War Pack §1: beach/park props
    cooler:        { tier: 2, minR: 18, maxR: 24 },
    rowboat:       { tier: 4, minR: 58, maxR: 72 },
    picnic_table:  { tier: 3, minR: 38, maxR: 48 },
    kite_prop:     { tier: 2, minR: 22, maxR: 28 },
    icecream_cart: { tier: 3, minR: 36, maxR: 46 },
    // Life Pack §1: people2 — 1.2× bigger than old stick figures so art detail reads
    person_mom:      { tier: 3, minR: 34, maxR: 42 },   // stroller = larger footprint
    person_dad:      { tier: 3, minR: 34, maxR: 42 },
    skateboarder:    { tier: 3, minR: 32, maxR: 40 },
    cyclist:         { tier: 3, minR: 38, maxR: 48 },   // with bike
    waiter:          { tier: 3, minR: 32, maxR: 40 },
    icecream_vendor: { tier: 3, minR: 36, maxR: 46 },
    person_jog2:     { tier: 3, minR: 32, maxR: 40 },
    person_elderly:  { tier: 3, minR: 30, maxR: 38 },
    tourist:         { tier: 3, minR: 32, maxR: 40 },
    // Life Pack §3: vignette anchors — T3, 2× score, flee when player approaches
    vig_proposal:    { tier: 3, minR: 36, maxR: 46, scoreMult: 2 },
    vig_soccer:      { tier: 3, minR: 38, maxR: 48, scoreMult: 2 },
    vig_wedding:     { tier: 3, minR: 38, maxR: 48, scoreMult: 2 },
    vig_couple:      { tier: 3, minR: 34, maxR: 42, scoreMult: 2 },
    vig_busker:      { tier: 3, minR: 30, maxR: 38, scoreMult: 2 },
    vig_painter:     { tier: 3, minR: 32, maxR: 40, scoreMult: 2 },
    vig_selfie:      { tier: 3, minR: 34, maxR: 42, scoreMult: 2 },
    vig_kite:        { tier: 3, minR: 30, maxR: 38, scoreMult: 2 },
    vig_gardener:    { tier: 3, minR: 30, maxR: 38, scoreMult: 2 },
    // Overnight events: golf / mayor speech / school / yoga + marathon runners
    vig_golf:        { tier: 3, minR: 32, maxR: 40, scoreMult: 2 },
    vig_mayor:       { tier: 3, minR: 34, maxR: 42, scoreMult: 3 },
    vig_school:      { tier: 3, minR: 30, maxR: 38, scoreMult: 2 },
    vig_yoga:        { tier: 3, minR: 30, maxR: 38, scoreMult: 2 },
    runner:          { tier: 2, minR: 16, maxR: 19, scoreMult: 2 },
    // Life Pack §3: playground equipment props
    pg_swing:        { tier: 4, minR: 52, maxR: 62 },
    pg_slide:        { tier: 4, minR: 48, maxR: 58 },
    pg_seesaw:       { tier: 3, minR: 38, maxR: 46 },
    pg_sandbox:      { tier: 3, minR: 36, maxR: 44 },
    pg_soccergoal:   { tier: 4, minR: 54, maxR: 66 },
    pg_soccerball:   { tier: 1, minR: 10, maxR: 14 },
    pg_hoop:         { tier: 4, minR: 46, maxR: 56 },
    pg_trampoline:   { tier: 4, minR: 44, maxR: 54 },
    pg_merrygoround: { tier: 4, minR: 50, maxR: 60 },
    // Life Pack §4: military units — building-tier, big score
    tank:            { tier: 5, minR: 96, maxR: 116, scoreMult: 5 },  // 5× car
    attack_heli:     { tier: 5, minR: 82, maxR: 100, scoreMult: 5 },
    armored_humvee:  { tier: 4, minR: 62, maxR: 78,  scoreMult: 3 },
    missile_truck:   { tier: 4, minR: 64, maxR: 80,  scoreMult: 3 },
    // Life Pack §2: fields (ground decals — never edible)
    field_soccer:     { tier: 0, minR: 260, maxR: 260 },
    field_basketball: { tier: 0, minR: 200, maxR: 200 },
    field_tennis:     { tier: 0, minR: 200, maxR: 200 },
    field_volleyball: { tier: 0, minR: 180, maxR: 180 },   // Structural Build: beach court decal
    field_campsite:   { tier: 0, minR: 190, maxR: 190 },   // forest clearing decal
    field_beachclub:  { tier: 0, minR: 170, maxR: 170 },   // cabana deck decal
    field_golf:       { tier: 0, minR: 160, maxR: 160 },   // putting green decal
    beachball:        { tier: 1, minR: 13, maxR: 18 },     // Structural Build: beach fun props
    deckchair:        { tier: 3, minR: 30, maxR: 40 },
    tent:             { tier: 3, minR: 40, maxR: 52 },
    campfire:         { tier: 2, minR: 20, maxR: 26 },
    // Prompt 18 Stage 4: street furniture (clay-mapped, eatable infra)
    streetlamp:  { tier: 2, minR: 14, maxR: 18 },
    bus_stop:    { tier: 3, minR: 32, maxR: 40 },
  } as Record<ObjectKind, KindInfo>,

  // Which kinds run away from a nearby, bigger void
  FLEEING_KINDS: [
    'duck', 'dog', 'person',
    'person_biz', 'person_jog', 'person_kid', 'person_granny', 'person_fish',
    'person_sun', 'person_guard', 'person_dog', 'person_const',
    // Life Pack §1: people2
    'person_mom', 'person_dad', 'skateboarder', 'cyclist', 'waiter',
    'icecream_vendor', 'person_jog2', 'person_elderly', 'tourist',
    // Life Pack §3: vignette anchors also flee
    'vig_proposal', 'vig_soccer', 'vig_wedding', 'vig_couple', 'vig_busker',
    'vig_painter', 'vig_selfie', 'vig_kite', 'vig_gardener',
    'monkey', 'flamingo', 'penguin',
    // Rebuild Prompt 16: zoo animals also flee from bigger voids
    'bear', 'zebra', 'tortoise', 'hippo', 'panda', 'seal', 'lion', 'elephant', 'giraffe',
  ] as ObjectKind[],

  // v14 §2: living kinds that flail while in orbit
  LIVING_ORBIT_KINDS: [
    'duck', 'dog', 'person',
    'person_biz', 'person_jog', 'person_kid', 'person_granny', 'person_fish',
    'person_sun', 'person_guard', 'person_dog', 'person_const',
    // Life Pack §1: people2
    'person_mom', 'person_dad', 'skateboarder', 'cyclist', 'waiter',
    'icecream_vendor', 'person_jog2', 'person_elderly', 'tourist',
    // Life Pack §3: vignette anchors
    'vig_proposal', 'vig_soccer', 'vig_wedding', 'vig_couple', 'vig_busker',
    'vig_painter', 'vig_selfie', 'vig_kite', 'vig_gardener',
    'cat', 'squirrel', 'bird', 'crab', 'monkey', 'flamingo', 'penguin',
  ] as ObjectKind[],

  SKINS: [
    // Economy: LoL model — grind coins for skins (common 500 / rare 1500 /
    // epic 4000); legendary skins below are money-only. ~60-90m of play per
    // rare at 50-150c a match feels earned without being a wall.
    { id: 'classic',   name: 'Classic',   cost: 0,    bodyColor: '#3A1E6B', glowColor: '#B388FF', eyeStyle: 'normal', accessories: [] },
    { id: 'kitty',     name: 'Kitty',     cost: 500,  bodyColor: '#FFAE73', glowColor: '#FFD9B8', eyeStyle: 'normal', accessories: ['catEars', 'whiskers', 'catMouth'] },
    { id: 'ninja',     name: 'Ninja',     cost: 500,  bodyColor: '#2A2A38', glowColor: '#5E6E8C', eyeStyle: 'angled', accessories: ['headband'] },
    { id: 'pirate',    name: 'Pirate',    cost: 1500, bodyColor: '#2C2C36', glowColor: '#8A8AA0', eyeStyle: 'normal', accessories: ['tricorn', 'eyepatch', 'earring'] },
    { id: 'princess',  name: 'Princess',  cost: 1500, bodyColor: '#FF7FC1', glowColor: '#FFC2E2', eyeStyle: 'lashes', extraBlush: true, accessories: ['tiara', 'sparkleTrail'] },
    { id: 'wizard',    name: 'Wizard',    cost: 1500, bodyColor: '#5B3AA6', glowColor: '#C9A6FF', eyeStyle: 'normal', accessories: ['wizardHat', 'beard'] },
    { id: 'astronaut', name: 'Astronaut', cost: 4000, bodyColor: '#E9EDF6', glowColor: '#AFC6FF', eyeStyle: 'normal', accessories: ['helmet', 'badge'] },
    { id: 'devil',     name: 'Devil',     cost: 4000, bodyColor: '#E63946', glowColor: '#FF6B6B', eyeStyle: 'angry', accessories: ['horns', 'devilTail', 'devilBrow'] },
    // v7 §9: PREMIUM cash skins (mock IAP — no real payments)
    { id: 'galaxy',    name: 'Galaxy',    cost: 0, premium: true, priceUSD: 2.99, bodyColor: '#0D0821', glowColor: '#B98CFF', eyeStyle: 'normal', accessories: [], fx: 'Living starfield body · orbiting star trail · nebula halo' },
    { id: 'lava',      name: 'Lava',      cost: 0, premium: true, priceUSD: 1.99, bodyColor: '#14090A', glowColor: '#FF7A2B', eyeStyle: 'angry', eyeGlow: '#FF6A00', accessories: [], fx: 'Molten crack body · rising embers · pulsing heat ring' },
    { id: 'ghost',     name: 'Ghost',     cost: 0, premium: true, priceUSD: 1.99, bodyColor: '#EAF2FF', glowColor: '#7FDBFF', eyeStyle: 'normal', accessories: [], fx: 'Translucent spectre · trailing echo wisps' },
    { id: 'midas',     name: 'King Midas', cost: 0, premium: true, priceUSD: 2.99, bodyColor: '#FFD447', glowColor: '#FFD23F', eyeStyle: 'normal', accessories: ['tiara'], fx: 'Molten gold sheen · travelling glint · radiant crown rays' },
    { id: 'disco',     name: 'Disco',     cost: 0, premium: true, priceUSD: 2.99, bodyColor: '#3A3A55', glowColor: '#FF5AF0', eyeStyle: 'normal', accessories: [], fx: 'Hue-cycling mirrorball body · rotating light beams' },
    { id: 'dragon',    name: 'Dragon',    cost: 0, premium: true, priceUSD: 3.99, bodyColor: '#1DB954', glowColor: '#7CFF6B', eyeStyle: 'angry', eyeGlow: '#FFB000', accessories: [], fx: 'Emerald scale armour · rim flames · breathing ember glow' },
  ] as SkinDef[],

  // v6 §4: renamed POWER-UPS (ids unchanged so effect logic still keys off them)
  // Overnight: MUTATIONS — permanent evolution-path picks offered when you
  // evolve (replaces the timed "boon" screens the playtest called stale).
  BOONS: [
    { id: 'magnet',    name: 'EVENT HORIZON',  desc: 'Your pull reaches 40% further' },
    { id: 'overdrive', name: 'FRENZY GLANDS',  desc: 'Move 25% faster. Forever.' },
    { id: 'twin',      name: 'TWIN STOMACHS',  desc: 'Merges need only 2 pieces' },
    { id: 'tremor',    name: 'TREMOR MAW',     desc: 'Your touch shrinks big things' },
    { id: 'greed',     name: 'MIDAS GULLET',   desc: 'All score ×1.5' },
    { id: 'echo',      name: 'ECHO BITE',      desc: 'Every 5th bite pulls snacks in' },
    { id: 'shield',    name: 'SECOND SKIN',    desc: 'Survive one devouring, then it molts' },
    { id: 'dash',      name: 'BLINK STEP',     desc: 'Auto-dash every 6s' },
    { id: 'lucky',     name: 'GOLDEN HUNGER',  desc: 'A golden snack every 10s' },
    { id: 'predator',  name: 'PREDATOR JAW',   desc: 'Devour family at just 1.18× their size' },
    { id: 'dense',     name: 'DENSE CORE',     desc: 'Immune to knockback and artillery stagger' },
  ] as BoonDef[],

  // Signature VOID POWERS (PULL -> COLLAPSE) live in engine.ts VOID_POWERS —
  // one per form, cooldown-gated. (The old timed pickup powers were removed.)

  // v7 §5: synergies — auto-trigger when BOTH members are active at once.
  SYNERGIES: [
    { id: 'sonic',    name: 'SONIC SNACK',   needs: ['overdrive', 'dash'] },   // rainbow speed trail
    { id: 'horizon',  name: 'EVENT HORIZON', needs: ['magnet', 'echo'] },      // constant gentle pull
    { id: 'goldrush', name: 'GOLD RUSH',     needs: ['greed', 'lucky'] },      // faster golden spawns
  ] as { id: string; name: string; needs: string[] }[],

  // Rival identity pools
  BOT_NAMES: ['Kai', 'Luna', 'Maks', 'Ava', 'Rin', 'Zoe', 'Leo', 'Mia', 'Yuki', 'Bex', 'Nova', 'Oda', 'Pia', 'Rex', 'Sol', 'Tao'],
  BOT_COUNTRIES: ['JP', 'BR', 'PL', 'US', 'KR', 'DE', 'FR', 'GB', 'IN', 'MX', 'CA', 'ES', 'IT', 'SE', 'NG', 'AU'],

  // ── Family arc ─────────────────────────────────────────────────────────────
  // The other voids are the player's FAMILY, not national rivals. They notice
  // the feast and sky-fall in one at a time over the match. Relation label shows
  // on their nameplate; each arrives with a bark.
  FAMILY_RELATIONS: ['lil bro', 'big sis', 'cousin', 'mom', 'dad', 'twin', 'auntie', 'uncle'],
  FAMILY_BARKS: [
    'room for one more?',
    'you started without me?!',
    'save some city for me!',
    'ooh, snacks!',
    'family feast!!',
    'no fair, I want in!',
    'is that… a whole city?',
    'scoot over, sib.',
  ],
  // ms-elapsed at which each successive family member drops in (index = arrival
  // order). You begin (almost) alone; the sky fills as the city panics.
  FAMILY_ARRIVAL_MS: [5000, 38000, 82000, 132000],
  // Ongoing mid-match banter — the family is HAVING FUN devouring together.
  FAMILY_BANTER: [
    'nom nom nom nom',
    'this city SLAPS',
    'mom look, no hands!',
    'race you to the zoo!',
    'I ate a whole BUS!',
    'family feast!!!',
    'save room for downtown!',
    'who ate my snack pile?!',
    'growing up so fast 🥲',
    'last one to the beach is a snack!',
    'do I have car in my teeth?',
    'grandma would be proud',
  ],
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
