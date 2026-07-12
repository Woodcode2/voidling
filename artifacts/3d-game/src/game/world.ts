import { CONFIG, type ObjectKind } from './config';
import { prng, dist, hashString, clamp, lerp } from './utils';
import { drawParkObject } from './objects'; // wind removed — tuft system deleted in Prompt 14
import { objectSprites, spriteBounds, spriteContactFrac, fxDecals, spriteAspect } from './sprites'; // v11: world-object PNG art; v12 §0: alpha bounds; v16 §3: contact frac; v16.2 §5: fx decals; Prompt 19: aspect map
import { clayHouseKeys, claySkyscraperKeys, clayHouseFancyKeys, clayHouseCottageKeys } from './clayCity'; // Map Rebuild: clay art swap draw keys (cottage + fancy pools)
import { cityBuildingKeys, cityLandmarkKeys, zooPropKeys, streetPropKeys } from './cityAssets'; // Structural Rebuild: new city art pools
import { drawBuilding3D, makeBuildingSpec, makeHouseSpec, makeCivicSpec, ensureBuildingSprite, buildingRoofColor, LIFT, type BuildingSpec } from './city3d'; // hole.io rebuild: pseudo-3D extruded buildings
import {
  clayPeopleKeys, clayVehicleKeys, CLAY_PERSON_KINDS, CLAY_VEHICLE_KINDS,
  SITTER_CLAY_INDICES,
} from './clayLife'; // Prompt 4: clay people + vehicle art swap draw keys; Prompt 19: sitter indices
import { audio } from './audio';
import { drawSpaceBg, drawIsland, drawDriftObjects, drawGrainOverlay, isWalkable, getTerrainAt, TERRAIN } from './islandMap'; // Phase 2→4
import { isOnIsland, isInsideIsland, terrainAtGeom, TERRAIN as GTERRAIN,
  ZONE_FOREST_R, ZONE_PARK_R, ZONE_BEACH_R,
  ZONE_ZOO_R, ZONE_AIRPORT_R, ZONE_MILITARY_R,
  railPointAt, RAIL_TOTAL, railClear } from './mapData'; // Map Rebuild + Structural Build (rail loop)
import {
  loadClayScenery, SCENERY_FOREST, SCENERY_GREEN, SCENERY_PARK, SCENERY_BEACH,
  clayTreeKeys, clayBushKeys, clayFlowerKeys, type SceneryDef,
} from './clayScenery'; // Prompt 5: clay scenery scatter (nature/park/beach)
import {
  clayFoodKeys, clayAppleVarietyKeys, CLAY_FOOD_CELL,
} from './clayFood'; // Prompt 9: clay food + street-furniture art swap
import { clayZooKeys, ZOO_KINDS } from './clayZoo'; // Prompt 16: clay zoo animal keys
import { clayAirportKeys, AIRPORT_KINDS } from './clayAirport'; // Prompt 16: clay airport keys
import { clayMilitaryKeys, MILITARY_KINDS } from './clayMilitary'; // Prompt 16: clay toy army keys
import { setMatchLots, setMatchSportsFields, setMatchBlocks } from './drawMap'; // Map Rebuild: export lot geometry so ground cache bakes yards; Prompt 19 §6: sports field lines
import type { FXManager } from './fx';
import type { Player } from './player';
import type { Rival } from './rivals';

export interface WorldObject {
  id: number;
  kind: ObjectKind;
  tier: number;
  x: number;
  y: number;
  baseSize: number;
  size: number;
  variant: number;
  eaten: boolean;
  wobble: number;
  fleeing: boolean;
  vx: number;            // px/s (living / skid)
  vy: number;
  living: boolean;
  homeX: number;
  homeY: number;
  wanderAngle: number;
  tether: number;        // max wander distance from home
  roadAxis: 'h' | 'v';
  roadDir: number;       // +1 / -1
  honkCd: number;
  captured: boolean;
  captureScale: number;
  captureRot: number;
  lodTier?: number;      // Late-game pass: last LOD tier (hysteresis vs zoom dither)
  shadowX: number;       // v10 §3: ground-shadow anchor (set on first capture frame)
  shadowY: number;
  alertT: number;        // "!" bubble timer (people)
  golden: boolean;       // v6 §2: golden object — 3× mass/score
  arrive: number;        // v8 §2: ms of pop-in scale-up remaining (0 = settled)
  contactRadius: number; // v16 §3: art-derived contact radius (bottom-third scan)
  infra: boolean;        // v16 §2: infra objects never respawn (hydrant/mailbox/trashcan)
  bubbleText: string | null; // v16.2 §1: speech bubble text (null = no bubble)
  bubbleLife: number;    // ms remaining for the speech bubble
  scenery?: boolean;     // Prompt 5: clay scenery — eatable bonus, excluded from win math + respawn
  sceneryKey?: string;   // Prompt 5: explicit clay draw key (overrides kind sprite)
  bldg?: BuildingSpec;   // hole.io rebuild: extruded box building (live pseudo-3D draw)
  shakeT?: number;       // Feel Patch §1: ms of prop-shake remaining (set on blocked contact)
  defense?: boolean;     // War Pack §2: defense unit converging on player
  pelletCd?: number;     // War Pack §2: ms until next pellet fired by this unit
  missileCd?: number;    // Phase 7b §5: heli missile cooldown timer
  trainT?: number;       // Structural Build: rail-loop arc fraction ∈[0,1) for the train
  // Life Pack §3: vignette system
  vignetteData?: {
    id: string;
    ambientText: string | string[]; // single line or a pool (picked per fire)
    panicText: string | string[];
    eatenBanner: string;
    ambientCd: number;   // ms until next ambient bubble may fire
    panicked: boolean;   // true once panic bubble has fired (don't repeat)
  };
  // Rebuild Prompt 16: optional wander/clamp rectangle for zoo animals etc.
  pen?: { x0: number; y0: number; x1: number; y1: number };
  // Prompt 19 Stage 2: seated/static clay person — never wanders or flees.
  sitter?: boolean;
}

export interface PlayerStats {
  count: number;
  ducks: number;
  maxTier: number;
  gnomes: number;   // v9 §8: garden gnomes eaten this round (secret GNOME LORD)
  // v16 §5: contract progress counters
  houses: number;
  cars: number;
  people: number;
  beachItems: number;
  downtownItems: number;
}

// 'cozy' and 'fancy' are sub-variants of residential (different house pools).  [Prompt 15]
type BlockType = 'residential' | 'cozy' | 'fancy' | 'park' | 'plaza' | 'playground' | 'school' | 'downtown' | 'mixed' | 'beach' | 'zoo' | 'townhall' | 'civic' | 'forest' | 'airport' | 'military';
// Dense City: a placed building/house footprint (used for placement, draw sort, and audits)
interface StructureLot { x: number; y: number; size: number; fpR: number; kind: ObjectKind; bldg?: BuildingSpec; }

// Final pass (mover audit): the rotate-to-face-travel gate matched only the OLD
// clay_* sprite keys — after the de-clay migration every vehicle resolved to a
// p3d_*/p3d2_* key and the whole fleet drove SIDEWAYS. One regex, both gates.
const VEHICLE_SPRITE_RE = /^(clay_(vehicle|airport|military)|p3d_(taxi|veh_|firetruck|schoolbus|police|ambulance)|p3d2_(tank|heli|jeep|humvee|missile_truck|radar_van))/;

// Final de-clay: every clay cutout with a procedural twin redirects to it —
// one table catches every placement path (kind cases, scenery keys, pools).
const SPRITE_REDIRECT: Record<string, string> = {
  clay_beach_0: 'p3d2_umbrella',  clay_beach_1: 'p3d2_towel',
  clay_beach_2: 'p3d2_lifeguard', clay_beach_3: 'p3d_palm',
  clay_beach_4: 'p3d2_rowboat',   clay_beach_6: 'p3d2_sandcastle',
  clay_beach_7: 'p3d2_sandcastle', clay_beach_8: 'p3d2_surfboard',
  clay_beach_11: 'p3d2_deckchair',
  clay_park_0: 'p3d2_slide',      clay_park_1: 'p3d2_swing',
  clay_park_2: 'p3d2_gazebo',     clay_park_3: 'p3d2_bench',
  clay_park_4: 'p3d2_picnic',     clay_park_7: 'p3d2_streetlamp',
  clay_park_8: 'p3d2_picnic',     clay_park_11: 'p3d2_streetlamp',
  clay_park_13: 'p3d2_seesaw',    clay_park_15: 'p3d2_fountain',
};

// Overnight: per-biome ambient chatter — each biome SOUNDS like its own place.
type Biome = 'downtown' | 'beach' | 'forest' | 'park' | 'suburb' | 'zoo' | 'other';
const AMBIENT_BY_BIOME: Record<Biome, string[]> = {
  downtown: ['this commute is BRUTAL', 'coffee first. apocalypse later.', 'rent here is criminal',
    'late for a meeting I hate', 'great, road work AGAIN', 'the pigeons own this town',
    'my startup will fix this', 'anyone else hear rumbling?'],
  beach: ['sunscreen me. NOW.', "tide's perfect today", 'sandcastle of my DREAMS',
    'volleyball later?', 'crab looked at me funny', 'lost my flip flop again',
    '5 more minutes of sun', 'the cooler stays with ME'],
  forest: ["s'mores tonight!!", '10,000 steps babyyy', 'that birdsong tho',
    'pine smells like FREEDOM', 'bear spray? check.', 'trail mix is 90% chocolate',
    'nature is healing', 'is this poison ivy??'],
  park: ['picnic weather!!', 'duck stole my sandwich', 'frisbee anyone?',
    'grass so soft here', "kite's really cooking today", 'best pond in town',
    'dog watching > everything'],
  suburb: ["lawn's looking GREAT", 'book club at 6!!', 'smell that? barbecue.',
    'new gnome day!!', 'property values RISING', 'did you see the HOA email?',
    'sprinklers at dawn. bliss.', 'my hedge. my rules.'],
  zoo: ['the penguins!! LOOK!!', 'monkey waved at me!!', 'churros + zebras = day made',
    'do NOT tap the glass', 'flamingos are so extra', 'gift shop first, animals second'],
  other: ['nice day out!', 'lovely weather!', 'what a town, huh?', 'good vibes today'],
};
const PANIC_BY_BIOME: Record<Biome, string[]> = {
  downtown: ['MY STARTUP!!', 'the espresso machine!!', 'not my parking spot!!',
    "I KNEW I should've WFH!!", 'taxi. TAXI!!', 'the quarterly report!!!'],
  beach: ['NOT THE BEACH!', 'my flip flops!!', 'abandon towel!!',
    'the cooler!! SAVE THE COOLER!!', 'sharks were fine, but THIS?!'],
  forest: ['BEAR!! no— WORSE!!', 'my tent!!', 'leave the marshmallows!!',
    'RUN, DALE!!', 'nature is CANCELLED'],
  park: ['MY PICNIC!!', 'protect the ducks!!', "frisbee's GONE!!", 'not the flowers!!'],
  suburb: ['MY LAWN!', 'my petunias!!', 'not my emotional support gnome!!',
    'the HOA will hear about this!!', 'my mortgage!!!', "I just waxed that car!"],
  zoo: ['the animals!! FREE THEM!!', 'zebra, RUN!!', 'not the gift shop!!', 'WHO OPENED THE PENS?!'],
  other: ['RUN!!', 'WHAT IS THAT?!', 'HELP!!', 'nope nope nope nope', '5 stars. very scary.',
    "tell my wife I love h—", 'I KNEW this town was cursed!!'],
};
interface Block { gx: number; gy: number; type: BlockType; x0: number; y0: number; buildingLots?: StructureLot[]; }
interface DirtPatch { x: number; y: number; r: number; life: number; maxLife: number; rot: number; drawScale: number; }
// Feedback Juice §1: cosmetic "swallow ghost" — a copy of an eaten structure's
// sprite that eases into the void. DISPLAY ONLY: no collision, score, or audit.
interface SwallowGhost {
  active: boolean;
  kind: ObjectKind;
  spriteKey: string | null; // resolved objectSprites key (null → procedural draw)
  x0: number; y0: number;   // spawn (last world) position
  x: number; y: number;     // current eased position
  cx: number; cy: number;   // void-center target
  size: number;             // sprite radius at spawn
  rot: number;              // accumulated rotation
  t: number; dur: number;   // elapsed / total ms (0.30–0.45s)
}
interface Fissure { pts: number[][]; life: number; maxLife: number; } // v9 §3: violet crack trail (fallback)
// v16.2 §5: one decal-based fissure stamp per dropCrack() call
interface FissureDecal { x: number; y: number; rot: number; scale: number; size: number; idx: 0|1; life: number; maxLife: number; }
// Life Pack §2: sports field ground decal
interface FieldDecal { kind: ObjectKind; cx: number; cy: number; halfW: number; halfH: number; }
// Life Pack §3: vignette scene config
interface VignetteConfig {
  kind: ObjectKind;
  zone: 'park' | 'downtown' | 'residential' | 'beach' | 'forest' | 'civic' | 'any';
  decal?: ObjectKind; // anchor the scene onto this baked ground decal when present
  ambientText: string | string[]; panicText: string | string[]; eatenBanner: string; always: boolean;
  supportProps?: ObjectKind[]; supportPeds?: ObjectKind[];
}
const VIGNETTE_CONFIGS: VignetteConfig[] = [
  { kind: 'vig_proposal',  zone: 'park',        always: false,
    ambientText: ['Will you marr...', 'I have a whole speech prepared—', 'she said YES!!'],
    panicText:   ["NOT NOW, I'M MID PROPOSAL!", "THE RING! WHERE'S THE RING?!", 'we can elope RIGHT NOW'],
    eatenBanner: '💍 ROMANCE: DEVOURED' },
  { kind: 'vig_soccer',    zone: 'park',         always: true,  decal: 'field_soccer',
    ambientText: ['GOOOAL!', 'DEFENSE!! DEFENSE!!', 'ref, that was SO offside'],
    panicText:   ['REF!! TIME OUT!!', 'MATCH ABANDONED!!', 'it ate the REF?!'],
    eatenBanner: '⚽ SOCCER MATCH: ABSORBED', supportProps: ['pg_soccergoal','pg_soccergoal','pg_soccerball'], supportPeds: ['person_kid','person_kid','tourist'] },
  { kind: 'vig_wedding',   zone: 'park',         always: false,
    ambientText: ['I do!', 'best day EVER 🥂', 'speeches in five!'],
    panicText:   ['maybe this is a sign...', 'SAVE THE CAKE!', 'the DJ already fled!!'],
    eatenBanner: '💒 WEDDING: CONSUMED' },
  { kind: 'vig_couple',    zone: 'park',         always: false,
    ambientText: ['Fifty years, dear.', 'remember our first date?'],
    panicText:   ['NOT LIKE THIS, HAROLD!', 'HAROLD, THE COUPONS!!'],
    eatenBanner: '👴 OLD COUPLE: DEVOURED' },
  { kind: 'vig_busker',    zone: 'downtown',     always: false,
    ambientText: ['🎵', 'tips appreciated!'],
    panicText:   ["EVERYONE'S A CRITIC!!", 'I take REQUESTS, not THIS'],
    eatenBanner: '🎸 BUSKER: SILENCED' },
  { kind: 'vig_painter',   zone: 'park',         always: false,
    ambientText: ['The light is perfect.', 'almost... done...'],
    panicText:   ['MY MASTERPIECE!', 'fine!! abstract art it is!!'],
    eatenBanner: '🎨 MASTERPIECE: DEVOURED' },
  { kind: 'vig_selfie',    zone: 'park',         always: false,
    ambientText: ['Say cheese!', 'ok one more, for real'],
    panicText:   ['WAIT, ONE MORE!', 'this is SO going viral'],
    eatenBanner: '📸 SELFIE MOMENT: EATEN' },
  { kind: 'vig_kite',      zone: 'any',          always: false,
    ambientText: ['Wheee!', 'look how high!!'],
    panicText:   ['MY KITE!!', 'LET GO OF THE STRING, TIMMY'],
    eatenBanner: '🪁 KITE: GONE WITH THE VOID' },
  { kind: 'vig_gardener',  zone: 'residential',  always: false,
    ambientText: ['Just watered those.', 'prize tomatoes, these'],
    panicText:   ['I JUST WATERED THOSE!', 'TAKE THE HOA INSTEAD!'],
    eatenBanner: '🌷 GARDEN: DEVOURED' },
  // ── Overnight events: the island is BUSY ──
  { kind: 'vig_golf',    zone: 'park',  always: true, decal: 'field_golf',
    ambientText: ['FORE!!', 'reading the green…', 'gimme putt. probably.', 'best round of my LIFE'],
    panicText:   ['MULLIGAN!!', 'play it where it LIES!! RUN!!', 'the 19th hole. NOW.'],
    eatenBanner: '⛳ GOLF GAME: SWALLOWED', supportPeds: ['person_dad', 'person_biz'] },
  { kind: 'vig_mayor',   zone: 'civic', always: true,
    ambientText: ['re-elect me and the void LEAVES!', 'we are DEFINITELY handling it', 'the budget is… fine!!', 'cut the ribbon. quickly.'],
    panicText:   ['EVACUATE! WOMEN, CHILDREN, MAYORS FIRST!', "this is my opponent's fault!!", 'I RESIGN!!!'],
    eatenBanner: '🏛️ THE MAYOR: TERM ENDED EARLY', supportPeds: ['person_biz', 'person_granny', 'person_mom', 'person_dad', 'tourist'] },
  { kind: 'vig_school',  zone: 'civic', always: true,
    ambientText: ['the void ate my homework!!', 'field trip CANCELLED?!', 'pop quiz. everyone run.', 'recess FOREVER!!'],
    panicText:   ['SNOW DAY RULES APPLY!!', 'single file, SPRINTING!!', 'the hamster!! save Nibbles!!'],
    eatenBanner: '🎒 CLASS: DISMISSED FOREVER', supportPeds: ['person_kid', 'person_kid', 'person_kid', 'person_mom'] },
  { kind: 'vig_yoga',    zone: 'park',  always: false,
    ambientText: ['namaste~', 'downward void… I mean dog', 'breathe innnnn', 'find your center'],
    panicText:   ['NAMASTAY AWAY!!', 'corpse pose was a MISTAKE', 'find your center. ELSEWHERE.'],
    eatenBanner: '🧘 YOGA CLASS: ABSORBED', supportPeds: ['person_jog', 'person_mom', 'person_elderly'] },
  // Structural Build: beach volleyball — anchored onto the court decal
  { kind: 'person_sun', zone: 'beach', always: true, decal: 'field_volleyball',
    ambientText: ['SPIKE IT!!', 'set! set! SET!', 'point beach team!!'],
    panicText:   ['sand in my EVERYTHING!!', 'GAME. OVER.', 'serve THAT, void!!'],
    eatenBanner: '🏐 VOLLEYBALL MATCH: DEVOURED',
    supportProps: ['beachball', 'towel', 'towel'], supportPeds: ['person_kid', 'tourist', 'person_sun'] },
  // Structural Build: cabana club — deck decal + loungers + drinks
  { kind: 'icecream_vendor', zone: 'beach', always: true, decal: 'field_beachclub',
    ambientText: ['cabana vibes 🍹', 'the club is OPEN', 'towel service, anyone?'],
    panicText:   ['NOT the cabana!!', 'happy hour is CANCELLED', 'save the smoothies!!'],
    eatenBanner: '🍹 CABANA CLUB: CONSUMED',
    supportProps: ['umbrella', 'deckchair', 'deckchair', 'cooler', 'towel'], supportPeds: ['person_sun', 'waiter'] },
  // Structural Build: forest campsite — clearing decal + tents + fire
  { kind: 'tourist', zone: 'forest', always: true, decal: 'field_campsite',
    ambientText: ["s'mores?!", 'nature is HEALING', 'one more ghost story'],
    panicText:   ['BEAR?! no— WORSE!!', 'ABANDON CAMP!!', 'the tent has NO defense stat!!'],
    eatenBanner: '⛺ CAMPSITE: DEVOURED',
    supportProps: ['tent', 'tent', 'campfire', 'picnic_table'], supportPeds: ['tourist', 'person_fish'] },
  // PLAYGROUND: anchor = pg_swing with cluster of equipment + kids
  { kind: 'pg_swing', zone: 'park', always: true,
    ambientText: ['Wheee!', 'higher!! HIGHER!!'],
    panicText:   ['NOT THE SLIDE!', 'EVERYONE OFF THE SWINGS!!'],
    eatenBanner: '🛝 PLAYGROUND: DEVOURED', supportProps: ['pg_slide','pg_seesaw','pg_sandbox','pg_merrygoround'], supportPeds: ['person_mom','person_kid','person_kid'] },
];

/** Pick one line from a string-or-pool (vignette/panic dialogue). */
function pickLine(t: string | string[], rand: () => number): string {
  return Array.isArray(t) ? t[Math.floor(rand() * t.length)] : t;
}

const MARGIN = (CONFIG.MAP_SIZE - (CONFIG.GRID * CONFIG.BLOCK_SIZE + (CONFIG.GRID - 1) * CONFIG.ROAD_WIDTH)) / 2;
const STRIDE = CONFIG.BLOCK_SIZE + CONFIG.ROAD_WIDTH;

// road centre lines (between the block columns / rows)
const ROAD_CENTERS: number[] = [];
for (let i = 0; i < CONFIG.GRID - 1; i++) {
  ROAD_CENTERS.push(MARGIN + CONFIG.BLOCK_SIZE + CONFIG.ROAD_WIDTH / 2 + i * STRIDE);
}

// ── v6 §7: world edge (starfield beyond the map, dither transition, barrier) ──
type View = { x: number; y: number; w: number; h: number };

function hashInt(x: number, y: number): number {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) | 0;
  return h >>> 0;
}

function drawStars(ctx: CanvasRenderingContext2D, view: View) {
  const cell = 80;
  const x0 = Math.floor(view.x / cell) - 1, y0 = Math.floor(view.y / cell) - 1;
  const x1 = Math.ceil((view.x + view.w) / cell) + 1, y1 = Math.ceil((view.y + view.h) / cell) + 1;
  ctx.save();
  ctx.fillStyle = '#FFFFFF';
  for (let gx = x0; gx <= x1; gx++) {
    for (let gy = y0; gy <= y1; gy++) {
      const h = hashInt(gx, gy);
      if ((h & 3) !== 0) continue; // ~25% of cells carry a star
      const px = gx * cell + (h % cell);
      const py = gy * cell + ((h >> 8) % cell);
      const r = 0.6 + ((h >> 16) & 3) * 0.5;
      ctx.globalAlpha = 0.28 + ((h >> 20) & 7) / 16;
      ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
}

// v9 §4: the world's edge is torn earth, not a hazard barrier. Each visible map
// edge gets an irregular bitten profile (8–14px amplitude), a soil-dark underside
// line, and an undulating violet-pink accretion glow that brightens near the player.
function drawTornRim(ctx: CanvasRenderingContext2D, view: View, S: number, t: number, px: number, py: number) {
  const step = 16;
  const bg = CONFIG.COLORS.uiBg;
  const soil = '#3A2A18';
  const jag = (i: number) => 8 + (hashInt(i, 777) % 7); // 8..14 px inward bite
  const vx0 = Math.max(0, view.x), vx1 = Math.min(S, view.x + view.w);
  const vy0 = Math.max(0, view.y), vy1 = Math.min(S, view.y + view.h);

  // Build a jagged edge profile, carve the outer sliver to space, then trace it.
  const edge = (
    build: (i: number) => [number, number],   // point on the jag line at column/row i
    outer: (i: number) => [number, number],   // matching point on the clean map edge
    a: number, b: number,
  ) => {
    const n = Math.max(1, Math.ceil((b - a) / step));
    const pts: [number, number][] = [];
    for (let k = 0; k <= n; k++) pts.push(build(a + (k * (b - a)) / n));
    // carve: fill the strip between the clean edge and the jag line with space bg
    ctx.save();
    ctx.fillStyle = bg;
    ctx.beginPath();
    const o0 = outer(a); ctx.moveTo(o0[0], o0[1]);
    const oN = outer(b); ctx.lineTo(oN[0], oN[1]);
    for (let k = pts.length - 1; k >= 0; k--) ctx.lineTo(pts[k][0], pts[k][1]);
    ctx.closePath(); ctx.fill();
    // soil-dark underside line
    ctx.beginPath();
    for (let k = 0; k < pts.length; k++) (k ? ctx.lineTo : ctx.moveTo).call(ctx, pts[k][0], pts[k][1]);
    ctx.strokeStyle = soil; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.stroke();
    // accretion glow — undulating, brighter near the player
    for (let k = 0; k < pts.length; k++) {
      const [gx, gy] = pts[k];
      const near = clamp(1 - Math.hypot(px - gx, py - gy) / 900, 0, 1);
      const shimmer = 0.35 + 0.25 * Math.sin(t / 260 + gx * 0.02 + gy * 0.02);
      ctx.globalAlpha = clamp(shimmer + near * 0.5, 0, 1);
      ctx.fillStyle = '#F06BC8';
      ctx.beginPath(); ctx.arc(gx, gy, 2.2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  };

  if (view.y < 0 && view.y + view.h > 0)      // top edge (y = 0) — torn earth
    edge((x) => [x, jag(x)], (x) => [x, 0], vx0, vx1);
  // v13 §1: south/west edges are now COASTLINE — no torn earth here
  // if (view.y < S && view.y + view.h > S)   // bottom edge — now ocean coast
  // if (view.x < 0 && view.x + view.w > 0)  // left edge — now ocean coast
  if (view.x < S && view.x + view.w > S)      // right edge (x = S) — torn earth
    edge((y) => [S - jag(y), y], (y) => [S, y], vy0, vy1);
}

// Prompt 14 Stage 3: drawCoast deleted — island floats in space; rim + space bg own every edge.

// v9 §4: a torn-loose ground chunk floating in space — grass clod, fence bit or flowerpot.
function drawChunk(ctx: CanvasRenderingContext2D, type: number, s: number) {
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(10,6,24,0.6)'; ctx.lineWidth = 1.5;
  if (type === 0) {
    // grass clod — soil underside + green cap
    ctx.fillStyle = '#5A4327';
    ctx.beginPath(); ctx.ellipse(0, s * 0.2, s, s * 0.55, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#5FBF6A';
    ctx.beginPath(); ctx.ellipse(0, -s * 0.1, s * 0.92, s * 0.4, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  } else if (type === 1) {
    // fence bit — cream picket
    ctx.fillStyle = '#F2E6C8';
    ctx.beginPath();
    ctx.moveTo(0, -s); ctx.lineTo(s * 0.34, -s * 0.6); ctx.lineTo(s * 0.34, s * 0.8);
    ctx.lineTo(-s * 0.34, s * 0.8); ctx.lineTo(-s * 0.34, -s * 0.6); ctx.closePath();
    ctx.fill(); ctx.stroke();
  } else {
    // flowerpot shard — terracotta trapezoid with soil top
    ctx.fillStyle = '#C86B3C';
    ctx.beginPath();
    ctx.moveTo(-s * 0.7, -s * 0.5); ctx.lineTo(s * 0.7, -s * 0.5);
    ctx.lineTo(s * 0.5, s * 0.6); ctx.lineTo(-s * 0.5, s * 0.6); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#5A4327';
    ctx.beginPath(); ctx.ellipse(0, -s * 0.5, s * 0.7, s * 0.18, 0, 0, Math.PI * 2); ctx.fill();
  }
}

const LIVING_KINDS: ObjectKind[] = [
  'car', 'person', 'duck', 'dog', 'bird', 'cat', 'squirrel', 'drone', 'schoolbus', 'train', 'crab',
  'monkey', 'flamingo', 'penguin', 'zookeeper',
  // War Pack §1: new pedestrian kinds + defense/traffic vehicles
  'person_biz', 'person_jog', 'person_kid', 'person_granny', 'person_fish',
  'person_sun', 'person_guard', 'person_dog', 'person_const',
  'taxi', 'police_car', 'school_bus', 'fire_truck', 'convertible', 'army_jeep',
  // Life Pack §1: people2 — detailed pedestrians
  'person_mom', 'person_dad', 'skateboarder', 'cyclist', 'waiter',
  'icecream_vendor', 'person_jog2', 'person_elderly', 'tourist',
  // Life Pack §3: vignette anchors behave like living NPCs
  'vig_proposal', 'vig_soccer', 'vig_wedding', 'vig_couple', 'vig_busker',
  'vig_painter', 'vig_selfie', 'vig_kite', 'vig_gardener',
  'vig_golf', 'vig_mayor', 'vig_school', 'vig_yoga', 'runner',
  // Life Pack §4: military (defense system)
  'tank', 'attack_heli', 'armored_humvee', 'missile_truck',
  // Rebuild Prompt 16: zoo animals + toy army additions
  'bear', 'zebra', 'tortoise', 'hippo', 'panda', 'seal', 'lion', 'elephant', 'giraffe',
  'radar_van',
];

// Prompt 4: O(1) membership for clay-art draw-key remapping (see clayLife.ts).
const CLAY_PERSON_KIND_SET = new Set<ObjectKind>(CLAY_PERSON_KINDS);
const CLAY_VEHICLE_KIND_SET = new Set<ObjectKind>(CLAY_VEHICLE_KINDS);
// Prompt 20 Stage 4: vignette kinds that draw from the clay people pool and may
// therefore land on a sitter sprite cell (8 or 11). Hoisted as a module-level
// constant so makeObj does not allocate a new Set on every object creation.
const VIGNETTE_SITTER_KINDS: Set<ObjectKind> = new Set([
  'vig_proposal', 'vig_soccer', 'vig_wedding', 'vig_couple',
  'vig_busker', 'vig_painter', 'vig_selfie', 'vig_kite', 'vig_gardener',
] as ObjectKind[]);

export class WorldManager {
  objects: WorldObject[] = [];
  blocks: Block[] = [];
  spawnPoint = { x: 0, y: 0 };  // Batch 1.5: engine spawns/respawns the player here
  private trainRespawnT = 0;    // Structural Build: ms until the eaten express respawns
  private static readonly AUTO_BOX_KINDS = new Set<ObjectKind>([
    'house', 'house_c', 'house_d', 'shop', 'cafe', 'office', 'skyscraper',
    'school', 'library', 'hospital', 'townhall',
  ]); // hole.io rebuild: structure kinds that always render as extruded boxes
  private chatterCd = 4000;         // Overnight: biome ambient-chatter timer
  private townhallPos: { x: number; y: number } | null = null; // Overnight: mayor stage
  private schoolPos: { x: number; y: number } | null = null;   // Overnight: school yard
  houseLots: StructureLot[] = [];   // Dense City: suburb house footprints (public so photo mode can reuse them)
  private structureLots: StructureLot[] = []; // Dense City: houses + downtown buildings (for audit)
  // Feedback Juice §1: fixed-size swallow-ghost pool (cap 40). Preallocated so
  // heavy eating never allocates per frame; a full pool skips the ghost.
  private swallowGhosts: SwallowGhost[] = Array.from({ length: 40 }, () => ({
    active: false, kind: 'bush' as ObjectKind, spriteKey: null,
    x0: 0, y0: 0, x: 0, y: 0, cx: 0, cy: 0, size: 0, rot: 0, t: 0, dur: 0,
  }));
  dirt: DirtPatch[] = [];
  fissures: Fissure[] = [];         // v9 §3: WORLD ENDER cracked-reality trail (violet, not brown)
  fissureDecals: FissureDecal[] = []; // v16.2 §5: decal stamps (used when fx PNGs loaded)
  // v9 §4: torn-loose ground chunks drifting in the space beyond the rim
  private spaceChunks: { bx: number; by: number; ox: number; oy: number; ang: number; spin: number; type: number; s: number }[] = [];
  // v5 §3 — precomputed ground-dressing (low-contrast, non-colliding)
  // Prompt 14 Stage 3: dressTufts, dressFence, dressHedges removed — textures own the surface.
  private dressMats: { x: number; y: number }[] = [];
  private dressManholes: { x: number; y: number }[] = [];
  private dressPaved: { x: number; y: number; kind: 'grate' | 'arrow' | 'leaf' | 'planter'; rot: number; s: number }[] = [];
  size: number;
  totalStartArea = 0;
  eatenArea = 0;
  initialMass = 0;         // v8 §3: frozen starting edible mass (% devoured denom)
  private rampageCd = 0;   // v8 §3: DEVOURER+ instant-pop cadence (≤10/s)
  initialPopulation = 0;   // v6 §2: baseline count for the 85% respawn target
  playerStats: PlayerStats = { count: 0, ducks: 0, maxTier: 0, gnomes: 0, houses: 0, cars: 0, people: 0, beachItems: 0, downtownItems: 0 };
  gnomeTotal = 0;              // v9 §8: gnomes present at round start (fixed — gnomes never respawn)
  gnomeLordPending = false;    // v9 §8: set once the player eats every gnome
  zooSmashed = false;          // v15 §4: zoo gate smashed (one per round)
  townhallEaten = false;       // v15 §4: town hall landmark consumed
  private nextId = 0;
  private respawnTimer = 0;
  respawnMult = 1; // Phase 7b §6: engine sets to 3 during FEEDING FRENZY
  private rand: () => number = Math.random;
  planName = 'METRO';          // v16.2 §6: current city plan name
  openingBeatPersonId = -1;    // v16.2 §1: person who says "Huh… is that a void?"
  // Life Pack §2: sports field decals (rendered in drawGround, not in objects[])
  fieldDecals: FieldDecal[] = [];
  // Life Pack §3: vignette eaten banners — read and cleared by engine.ts each tick
  eatenVignetteBanners: string[] = [];

  constructor(size: number) {
    this.size = size;
  }

  private makeObj(kind: ObjectKind, x: number, y: number, opts: Partial<WorldObject> = {}): WorldObject {
    const info = CONFIG.KIND_INFO[kind];
    const baseSize = info.minR + this.rand() * (info.maxR - info.minR);
    // v16 §3: art-derived contact radius — 0.90 × baseSize × bottom-third width fraction
    // Resolve variant-backed sprite keys (house→house_a, shop→shop_a, skyscraper→skyscraper_a)
    const SPRITE_KEY_MAP: Partial<Record<ObjectKind, string>> = {
      house: 'house_a', shop: 'shop_a', skyscraper: 'skyscraper_a',
    };
    const cFrac = spriteContactFrac.get(SPRITE_KEY_MAP[kind] ?? kind);
    const contactRadius = cFrac != null ? 0.90 * baseSize * cFrac : baseSize * 0.85;
    // v16 §2: infra objects placed once per map, never respawn
    // v16.1 B4: parked cars are infra too (placed on street furniture pass)
    const INFRA_KINDS: ObjectKind[] = ['hydrant', 'mailbox', 'trashcan', 'bench', 'bike', 'scooter', 'car_parked_a', 'car_parked_b', 'streetlamp', 'bus_stop'];
    const o: WorldObject = {
      id: this.nextId++,
      kind,
      tier: info.tier,
      x, y,
      baseSize,
      size: baseSize,
      variant: Math.floor(this.rand() * 5),
      eaten: false,
      wobble: this.rand() * Math.PI * 2,
      fleeing: false,
      vx: 0, vy: 0,
      living: LIVING_KINDS.includes(kind),
      homeX: x, homeY: y,
      wanderAngle: this.rand() * Math.PI * 2,
      tether: 120,
      roadAxis: 'h',
      roadDir: this.rand() < 0.5 ? 1 : -1,
      honkCd: 0,
      captured: false,
      captureScale: 1,
      captureRot: 0,
      shadowX: 0, shadowY: 0,
      alertT: 0,
      golden: false,
      arrive: 0,
      contactRadius,
      infra: INFRA_KINDS.includes(kind),
      bubbleText: null,
      bubbleLife: 0,
      ...opts,
    };
    // hole.io rebuild: ANY structure kind spawned without an explicit parcel
    // spec still renders as an extruded box — no clay-building path remains.
    if (!o.bldg && !o.sceneryKey && WorldManager.AUTO_BOX_KINDS.has(kind)) {
      const spec = (kind === 'house' || kind === 'house_c' || kind === 'house_d')
        ? makeHouseSpec(o.baseSize, (o.id * 2654435761) >>> 0)
        : (kind === 'school' || kind === 'library' || kind === 'hospital' || kind === 'townhall')
          ? makeCivicSpec(kind, o.baseSize, o.id)
          : makeBuildingSpec(kind, o.baseSize * 1.02, o.baseSize * 0.6, 0.8, (o.id * 40503) >>> 0);
      o.bldg = spec;
      o.sceneryKey = ensureBuildingSprite(spec);
      o.contactRadius = Math.max(spec.w, spec.d) * 0.95;
    }
    this.objects.push(o);
    // Prompt 19 Stage 2: seated clay people are permanently static (no wander/flee).
    // Clay key assignment is id % sheet-size; SITTER_CLAY_INDICES tags which cells are seated.
    if (CLAY_PERSON_KINDS.includes(kind) && !o.sitter) {
      const clayIdx = o.id % (clayPeopleKeys.length || 12);
      if (SITTER_CLAY_INDICES.has(clayIdx)) {
        o.sitter = true;
        o.living = false; // prevents wander/flee AI path
        o.tether = 0;     // never pulled from home
      }
    }
    // Prompt 20 Stage 4: vignette anchors (vig_*) draw from the clay people pool
    // just like regular clay persons do, so they can also render as a seated pose
    // (cell 8 or 11). If a vignette entity lands on a sitter cell, mark it static —
    // a seated vig walking is the gliding-seated-man bug reported in Stage 0.
    // VIGNETTE_SITTER_KINDS is a module-level constant (not re-created per call).
    if (VIGNETTE_SITTER_KINDS.has(kind) && !o.sitter) {
      const clayIdx = o.id % (clayPeopleKeys.length || 12);
      if (SITTER_CLAY_INDICES.has(clayIdx)) {
        o.sitter = true;
        o.living = false;
        o.tether = 0;
      }
    }
    // Prompt 5: scenery is bonus food — never part of the % devoured denominator.
    if (!o.scenery) this.totalStartArea += Math.PI * o.baseSize * o.baseSize;
    return o;
  }

  init(seedStr: string) {
    this.objects = [];
    this.blocks = [];
    this.dirt = [];
    this.fissures = [];
    this.fissureDecals = [];
    this.eatenArea = 0;
    this.totalStartArea = 0;
    this.nextId = 0;
    this.respawnTimer = 0;
    this.playerStats = { count: 0, ducks: 0, maxTier: 0, gnomes: 0, houses: 0, cars: 0, people: 0, beachItems: 0, downtownItems: 0 };
    this.gnomeTotal = 0;
    this.gnomeLordPending = false;
    this.fieldDecals = [];
    this.eatenVignetteBanners = [];
    const rand = prng(hashString(seedStr));
    this.rand = rand;

    // v9 §4: scatter torn-loose ground chunks in the space beyond the rim
    this.spaceChunks = [];
    const S = this.size, cxm = S / 2, cym = S / 2;
    for (let i = 0; i < 10; i++) {
      let cx: number, cy: number;
      do {
        cx = -220 + rand() * (S + 440);
        cy = -220 + rand() * (S + 440);
      } while (cx > -20 && cx < S + 20 && cy > -20 && cy < S + 20);
      let ox = cx - cxm, oy = cy - cym; const od = Math.hypot(ox, oy) || 1; ox /= od; oy /= od;
      this.spaceChunks.push({ bx: cx, by: cy, ox, oy, ang: rand() * Math.PI * 2, spin: (rand() - 0.5) * 0.0005, type: Math.floor(rand() * 3), s: 14 + rand() * 16 });
    }

    // Prompt 15: COMPOSITION FIX — clearer district hierarchy.
    // Cozy suburbs NW/W/SW, fancy uptown SW quadrant, tight downtown core center,
    // central plaza (gx=3,gy=2), park + forest east, zoo + airport + military far east.
    const FIXED_PLAN: BlockType[] = [
      'cozy',  'cozy',  'cozy',     'cozy',     'forest',  'forest',   // gy=0: north suburbs + east forest
      'cozy',  'cozy',  'downtown', 'downtown', 'forest',  'zoo',      // gy=1: suburb W, towers C, forest+zoo E
      'fancy', 'fancy', 'downtown', 'plaza',    'park',    'forest',   // gy=2: uptown W, plaza hub, park+forest E
      'fancy', 'fancy', 'downtown', 'downtown', 'park',    'forest',   // gy=3: uptown W, towers C, park+forest E
      'cozy',  'cozy',  'fancy',    'fancy',    'forest',  'airport',  // gy=4: suburbs + uptown + forest + airstrip
      'beach', 'beach', 'beach',    'beach',    'beach',   'military', // gy=5: sandy shores + military corner
    ];
    this.planName = 'COMPOSITION FIX';
    for (let gy = 0; gy < CONFIG.GRID; gy++) {
      for (let gx = 0; gx < CONFIG.GRID; gx++) {
        const type = FIXED_PLAN[gy * CONFIG.GRID + gx];
        this.blocks.push({ gx, gy, type, x0: MARGIN + gx * STRIDE, y0: MARGIN + gy * STRIDE });
      }
    }

    // Dense City: pre-compute per-block house + building lots (island + road gated, no overlaps)
    this.generateLots(rand);
    for (const g of this.swallowGhosts) g.active = false; // Feedback Juice §1: clear pool

    // Batch 1.5: spawn on a cozy suburb street NEAREST the map centre — a real
    // neighbourhood with houses on screen, never the centre road junction.
    // The point sits on the block's inner-west sidewalk strip: house lots are
    // inset well past x0+90, so this is always clear of structures.
    const _cc = this.size / 2;
    const _cozyBlocks = this.blocks.filter((b) => b.type === 'cozy');
    _cozyBlocks.sort((a, b) =>
      Math.hypot(a.x0 + CONFIG.BLOCK_SIZE / 2 - _cc, a.y0 + CONFIG.BLOCK_SIZE / 2 - _cc) -
      Math.hypot(b.x0 + CONFIG.BLOCK_SIZE / 2 - _cc, b.y0 + CONFIG.BLOCK_SIZE / 2 - _cc));
    const _sb = _cozyBlocks[0];
    const spawnX = _sb ? _sb.x0 + 90 : _cc;
    const spawnY = _sb ? _sb.y0 + CONFIG.BLOCK_SIZE / 2 : _cc;
    this.spawnPoint = { x: spawnX, y: spawnY };
    let civicIndex = 0; // track civic blocks (cap at 1 so extra civics reuse the second pattern)
    for (const b of this.blocks) {
      // Alive Pack §A: skip blocks whose center falls outside the island polygon.
      // Blocks that straddle the rim still run their fill — per-item isOnIsland
      // checks inside scatter/scatterPeople catch individual out-of-bound placements.
      const bCx = b.x0 + CONFIG.BLOCK_SIZE / 2;
      const bCy = b.y0 + CONFIG.BLOCK_SIZE / 2;
      if (!isOnIsland(bCx, bCy, 0)) continue; // inset=0: block center must be at least on the island
      if (b.type === 'residential' || b.type === 'cozy' || b.type === 'fancy') this.fillResidential(b, rand);
      else if (b.type === 'park') this.fillPark(b, rand, spawnX, spawnY);
      else if (b.type === 'plaza') this.fillPlaza(b, rand);
      else if (b.type === 'playground') this.fillPlayground(b, rand);
      else if (b.type === 'school') this.fillSchool(b, rand);
      else if (b.type === 'downtown') this.fillDowntown(b, rand);
      else if (b.type === 'mixed') this.fillMixed(b, rand);
      else if (b.type === 'beach') this.fillBeach(b, rand);
      else if (b.type === 'zoo') this.fillZoo(b, rand);
      else if (b.type === 'airport') this.fillAirport(b, rand);
      else if (b.type === 'military') this.fillMilitary(b, rand);
      else if (b.type === 'townhall') this.fillTownHall(b, rand);
      else if (b.type === 'civic') this.fillCivic(b, rand, Math.min(civicIndex++, 1));
      else if (b.type === 'forest') this.fillForest(b, rand);
    }

    // Map Rebuild §1: guarantee a few T1 edibles near player spawn, but keep the
    // immediate area (≤3 void-widths ≈ 108px) clear. Spawn at rr=140–200 instead of
    // 65–145 so the count within 108px stays ≤ 3 (spawn breathing-room rule).
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2, rr = 140 + rand() * 60;
      this.makeObj(pick(['flower', 'apple'] as ObjectKind[], rand),
        clamp(spawnX + Math.cos(a) * rr, MARGIN + 10, this.size - MARGIN - 10),
        clamp(spawnY + Math.sin(a) * rr, MARGIN + 10, this.size - MARGIN - 10));
    }

    // v16.2 §1: opening beat — two people near spawn for "Huh… is that a void?" (at t=2s)
    {
      const bx = clamp(spawnX + 95, MARGIN + 10, this.size - MARGIN - 10);
      const by = clamp(spawnY + 35, MARGIN + 10, this.size - MARGIN - 10);
      const beatPerson = this.makeObj('person', bx, by);
      this.makeObj('person', clamp(spawnX + 115, MARGIN + 10, this.size - MARGIN - 10),
        clamp(spawnY - 25, MARGIN + 10, this.size - MARGIN - 10));
      this.openingBeatPersonId = beatPerson.id;
    }

    // v7 §2: water tower on a residential corner lot (the last residential-class block)
    const resBlocks = this.blocks.filter((b) => b.type === 'residential' || b.type === 'cozy' || b.type === 'fancy');
    const wtBlock = resBlocks[resBlocks.length - 1];
    if (wtBlock) {
      const inset = CONFIG.SIDEWALK + 90;
      const wtX = wtBlock.x0 + CONFIG.BLOCK_SIZE - inset;
      const wtY = wtBlock.y0 + inset;
      if (isOnIsland(wtX, wtY)) this.makeObj('watertower', wtX, wtY);
    }

    // v7 §2: living cars cruising the road grid (10–14)
    for (let i = 0; i < CONFIG.TRAFFIC_CARS; i++) this.spawnCar(rand);
    // v7 §3: two delivery drones roaming + one school bus on the grid
    this.spawnDrone(rand);
    this.spawnDrone(rand);
    this.spawnBus(rand);
    this.spawnTrain(); // Structural Build: the downtown express

    // trickle up to a healthy population with scattered small edibles
    const target = Math.round(CONFIG.TARGET_POPULATION * CONFIG.DENSITY_MULT);
    while (this.objects.length < target) {
      const b = this.blocks[Math.floor(rand() * this.blocks.length)];
      const p = this.pointInBlock(b, rand);
      const kind = pick(['flower', 'flowerpot', 'gnome', 'apple'] as ObjectKind[], rand);
      if (dist(p.x, p.y, spawnX, spawnY) < 70) continue;
      if (!isOnIsland(p.x, p.y)) continue; // Alive Pack §A: skip off-island trickle
      if (!this.clearOfLots(p.x, p.y)) continue; // Overnight: never on a building
      this.makeObj(kind, p.x, p.y);
    }

    // v5 §3: hard rule — no 300px circle may be edible-empty; patch with T1–T2
    this.validateDensity(rand);
    // v5 §3: build the ground-dressing layer (drawn under objects)
    this.buildDressing(rand);
    // Life Pack §2: sports field decals
    this.initSportsFields(rand);
    this.spawnMarathon(rand);
    // Life Pack §3: vignette scenes
    this.initVignettes(rand);

    // Dense City §1: place the pre-generated suburb house lots (dense, per-block).
    {
      for (const lot of this.houseLots) {
        if (lot.bldg) {
          this.makeObj(lot.kind, lot.x, lot.y, {
            size: lot.size, baseSize: lot.size,
            bldg: lot.bldg,
            sceneryKey: ensureBuildingSprite(lot.bldg),
            contactRadius: Math.max(lot.bldg.w, lot.bldg.d) * 0.95,
          });
        } else {
          this.makeObj(lot.kind, lot.x, lot.y, { size: lot.size, baseSize: lot.size });
        }
      }
      console.log('[world] Dense City suburb house lots placed:', this.houseLots.length);
    }
    // Map Rebuild: export lot geometry to drawMap so the ground cache bakes yards/driveways.
    setMatchLots(this.houseLots);
    // Structural Build: residential block rects → ground cache paints internal
    // lanes between house rows (the "engineered neighborhood" read).
    setMatchBlocks(this.blocks
      .filter((b) => b.type === 'cozy' || b.type === 'fancy' || b.type === 'residential')
      .map((b) => ({ x0: b.x0, y0: b.y0, type: b.type === 'fancy' ? 'fancy' as const : 'cozy' as const })));

    // v16.1 B4: street furniture pass — sidewalk trees + curbside parked cars on residential/civic
    const TREE_INSET = CONFIG.SIDEWALK + 16;
    const TREE_STEP = 300;
    const STREET_BLOCKS: BlockType[] = ['residential', 'cozy', 'fancy', 'civic'];
    for (const b2 of this.blocks) {
      if (!STREET_BLOCKS.includes(b2.type)) continue;
      // Sidewalk-edge trees every ~300px along all four sides
      for (let x = b2.x0 + TREE_INSET; x < b2.x0 + CONFIG.BLOCK_SIZE - TREE_INSET; x += TREE_STEP) {
        const ty1 = b2.y0 + TREE_INSET;
        const ty2 = b2.y0 + CONFIG.BLOCK_SIZE - TREE_INSET;
        if (isOnIsland(x, ty1) && this.clearOfLots(x, ty1, 12)) this.makeObj('tree', x, ty1, { infra: true });
        if (isOnIsland(x, ty2) && this.clearOfLots(x, ty2, 12)) this.makeObj('tree', x, ty2, { infra: true });
      }
      for (let y = b2.y0 + TREE_INSET + TREE_STEP; y < b2.y0 + CONFIG.BLOCK_SIZE - TREE_INSET * 1.5; y += TREE_STEP) {
        const tx1 = b2.x0 + TREE_INSET;
        const tx2 = b2.x0 + CONFIG.BLOCK_SIZE - TREE_INSET;
        if (isOnIsland(tx1, y) && this.clearOfLots(tx1, y, 12)) this.makeObj('tree', tx1, y, { infra: true });
        if (isOnIsland(tx2, y) && this.clearOfLots(tx2, y, 12)) this.makeObj('tree', tx2, y, { infra: true });
      }
      // ~30% chance: parked car on each curb side (Alive Pack §A: island-guarded)
      const carPool: ObjectKind[] = ['car_parked_a', 'car_parked_b', 'taxi', 'convertible'];
      const innerW = CONFIG.BLOCK_SIZE - TREE_INSET * 2;
      const cp1x = b2.x0 + TREE_INSET + rand() * innerW, cp1y = b2.y0 + TREE_INSET;
      const cp2x = b2.x0 + TREE_INSET + rand() * innerW, cp2y = b2.y0 + CONFIG.BLOCK_SIZE - TREE_INSET;
      const cp3x = b2.x0 + TREE_INSET,                   cp3y = b2.y0 + TREE_INSET + rand() * innerW;
      const cp4x = b2.x0 + CONFIG.BLOCK_SIZE - TREE_INSET, cp4y = b2.y0 + TREE_INSET + rand() * innerW;
      if (rand() < 0.3 && isOnIsland(cp1x, cp1y) && this.clearOfLots(cp1x, cp1y, 14)) this.makeObj(pick(carPool, rand), cp1x, cp1y, { infra: true });
      if (rand() < 0.3 && isOnIsland(cp2x, cp2y) && this.clearOfLots(cp2x, cp2y, 14)) this.makeObj(pick(carPool, rand), cp2x, cp2y, { infra: true });
      if (rand() < 0.3 && isOnIsland(cp3x, cp3y) && this.clearOfLots(cp3x, cp3y, 14)) this.makeObj(pick(carPool, rand), cp3x, cp3y, { infra: true });
      if (rand() < 0.3 && isOnIsland(cp4x, cp4y) && this.clearOfLots(cp4x, cp4y, 14)) this.makeObj(pick(carPool, rand), cp4x, cp4y, { infra: true });
    }

    // ── Prompt 18 Stage 4: streetlamps + bus stops on all block types ─────────
    // Sidewalk-edge streetlamps every ~380px along N/S edges; E/W at offset.
    // Bus stops in downtown blocks (1 per block face) for urban density.
    const LAMP_INSET = CONFIG.SIDEWALK + 12;
    const LAMP_STEP  = 380;
    const DT_FACE_CHANCE = 0.6; // probability of placing a bus stop on the N face
    for (const b2 of this.blocks) {
      if (b2.type === 'forest' || b2.type === 'beach' || b2.type === 'military') continue;
      // N and S edges (lamp at LAMP_INSET, spaced LAMP_STEP)
      for (let x = b2.x0 + LAMP_INSET + LAMP_STEP * 0.5; x < b2.x0 + CONFIG.BLOCK_SIZE - LAMP_INSET; x += LAMP_STEP) {
        const yn = b2.y0 + LAMP_INSET;
        const ys = b2.y0 + CONFIG.BLOCK_SIZE - LAMP_INSET;
        if (isOnIsland(x, yn)) this.makeObj('streetlamp', x, yn, { infra: true });
        if (isOnIsland(x, ys)) this.makeObj('streetlamp', x, ys, { infra: true });
      }
      // E and W edges (offset by 1.5 steps so lamps alternate with the N/S row)
      for (let y = b2.y0 + LAMP_INSET + LAMP_STEP * 1.5; y < b2.y0 + CONFIG.BLOCK_SIZE - LAMP_INSET * 1.5; y += LAMP_STEP) {
        const xw = b2.x0 + LAMP_INSET;
        const xe = b2.x0 + CONFIG.BLOCK_SIZE - LAMP_INSET;
        if (isOnIsland(xw, y)) this.makeObj('streetlamp', xw, y, { infra: true });
        if (isOnIsland(xe, y)) this.makeObj('streetlamp', xe, y, { infra: true });
      }
      // Downtown: bus stop on the north face (eatable, infra)
      if (b2.type === 'downtown' && rand() < DT_FACE_CHANCE) {
        const bsx = b2.x0 + LAMP_INSET + rand() * (CONFIG.BLOCK_SIZE - LAMP_INSET * 2);
        const bsy = b2.y0 + LAMP_INSET;
        if (isOnIsland(bsx, bsy)) this.makeObj('bus_stop', bsx, bsy, { infra: true });
      }
    }

    // Prompt 5: scatter clay scenery (eatable bonus food, excluded from win math).
    this.scatterScenery(rand);

    // ── Alive Pack §A · SPAWN AUDIT tripwire ────────────────────────────────
    // Every entity must be on walkable island terrain. Any survivor of the
    // per-spawn guards above is removed here and logged. The count MUST be 0
    // before shipping — any non-zero means a spawn path still needs a guard.
    {
      const offIsland = this.objects.filter((o) => !isWalkable(o.x, o.y));
      if (offIsland.length > 0) {
        for (const o of offIsland) {
          console.warn(`[SPAWN AUDIT] off-island: ${o.kind} @ (${o.x.toFixed(0)}, ${o.y.toFixed(0)})`);
        }
        this.objects = this.objects.filter((o) => isWalkable(o.x, o.y));
      }
      console.log(`SPAWN AUDIT: ${offIsland.length} entities off-island (removed)`);
    }

    // ── Dense City §4: placement audit (must read zero for the last three) ──
    {
      const suburbN = this.houseLots.length;
      const downtownN = this.structureLots.length - suburbN;
      const S = this.structureLots;
      let overlaps = 0;
      for (let i = 0; i < S.length; i++) {
        for (let j = i + 1; j < S.length; j++) {
          const a = S[i], c = S[j], md = a.fpR + c.fpR;
          if ((a.x - c.x) ** 2 + (a.y - c.y) ** 2 < md * md) overlaps++;
        }
      }
      let onRoads = 0;
      for (const l of S) if (!this.roadClear(l.x, l.y, l.fpR)) onRoads++;
      let offIsland2 = 0;
      for (const o of this.objects) if (!o.eaten && !isInsideIsland(o.x, o.y)) offIsland2++;
      console.log(`SUBURB LOTS: ${suburbN}`);
      console.log(`DOWNTOWN LOTS: ${downtownN} (landmarks: ${S.filter(l => l.kind === 'landmark').length})`);

      // Overnight: WORLD AUDIT — the automated "agent that runs around
      // verifying everything". Any nonzero count is a placement regression.
      {
        const STRUCT = new Set(['house', 'house_c', 'house_d', 'shop', 'cafe', 'office',
          'skyscraper', 'school', 'library', 'hospital', 'townhall', 'landmark']);
        let propsOnBuildings = 0;
        const examples: string[] = [];
        for (const o of this.objects) {
          if (o.eaten || STRUCT.has(o.kind) || o.kind === 'train' || o.kind === 'bird' || o.kind === 'drone') continue;
          for (const l of S) {
            if ((l.x - o.x) ** 2 + (l.y - o.y) ** 2 < (l.fpR * 0.85) ** 2) {
              propsOnBuildings++;
              if (examples.length < 5) examples.push(`${o.kind}@(${Math.round(o.x)},${Math.round(o.y)}) on ${l.kind}`);
              break;
            }
          }
        }
        const ROAD_KINDS = new Set(['car', 'taxi', 'schoolbus', 'school_bus', 'convertible', 'fire_truck', 'runner']);
        let vehiclesOffRoad = 0;
        for (const o of this.objects) {
          if (o.eaten || !ROAD_KINDS.has(o.kind) || o.infra) continue;
          const onH = ROAD_CENTERS.some((rc) => Math.abs(o.y - rc) < CONFIG.ROAD_WIDTH);
          const onV = ROAD_CENTERS.some((rc) => Math.abs(o.x - rc) < CONFIG.ROAD_WIDTH);
          if (!onH && !onV) vehiclesOffRoad++;
        }
        console.log(`[audit] PROPS ON BUILDINGS: ${propsOnBuildings}${examples.length ? ' — ' + examples.join('; ') : ''}`);
        console.log(`[audit] VEHICLES OFF-ROAD AT SPAWN: ${vehiclesOffRoad}`);
      }
      console.log(`BUILDING OVERLAPS: ${overlaps}`);
      console.log(`BUILDINGS ON ROADS: ${onRoads}`);
      console.log(`OFF-ISLAND ENTITIES: ${offIsland2}`);
    }

    // ── Prompt 5: scenery placement audit (all three MUST read zero) ──
    {
      const sc = this.objects.filter((o) => o.scenery);
      let offIsland = 0, onRoads = 0, onBuildings = 0;
      for (const o of sc) {
        if (!isWalkable(o.x, o.y) || !isInsideIsland(o.x, o.y)) offIsland++;
        if (!this.roadClear(o.x, o.y, o.baseSize)) onRoads++;
        for (const l of this.structureLots) {
          const md = l.fpR + o.baseSize;
          if ((l.x - o.x) ** 2 + (l.y - o.y) ** 2 < md * md) { onBuildings++; break; }
        }
      }
      console.log(`SCENERY COUNT: ${sc.length}`);
      console.log(`SCENERY OFF-ISLAND: ${offIsland}`);
      console.log(`SCENERY ON ROADS: ${onRoads}`);
      console.log(`SCENERY ON BUILDINGS: ${onBuildings}`);
    }

    // Rebuild Prompt 16: ZOO OFF-BLOCK audit — all zoo animals must be inside the
    // painted zoo zone. Any non-zero count means pen bounds are leaking.
    {
      const [zx0, zy0, zx1, zy1] = ZONE_ZOO_R;
      const zooOff = this.objects.filter(
        (o) => ZOO_KINDS.includes(o.kind) && (o.x < zx0 || o.x > zx1 || o.y < zy0 || o.y > zy1),
      ).length;
      console.log(`ZOO OFF-BLOCK: ${zooOff}`);
    }

    // v6 §2: remember the starting count so respawn can top back up to 85%
    // Prompt 5: scenery excluded so it never inflates the respawn target.
    this.initialPopulation = this.objects.filter((o) => !o.scenery).length;
    this.initialMass = this.totalStartArea; // v8 §3: freeze the % devoured denominator
    this.buildLotGrid(); // Perf pass: O(1) lot lookups for per-frame mover avoidance
    // v9 §8: freeze the gnome count — gnomes never respawn, so eating them all is a real feat
    this.gnomeTotal = this.objects.filter((o) => o.kind === 'gnome').length;
  }

  // Rebuild Prompt 5: scatter clay scenery as EATABLE bonus food. Every item is
  // flagged `scenery` so it is excluded from the win math (numerator+denominator)
  // and the respawn population — zero balance impact. Injection is visual-bounds
  // only; here we set a size-correct baseSize/contactRadius per cutout.
  private scatterScenery(rand: () => number) {
    const placed: { x: number; y: number; r: number }[] = [];
    const S = this.size;

    const tryPlace = (
      zone: readonly number[],
      defs: SceneryDef[],
      sand: boolean,
    ): boolean => {
      if (defs.length === 0) return false;
      for (let t = 0; t < 14; t++) {
        const def = defs[Math.floor(rand() * defs.length)];
        const R = def.rMin + rand() * (def.rMax - def.rMin);
        const x = zone[0] + rand() * (zone[2] - zone[0]);
        const y = zone[1] + rand() * (zone[3] - zone[1]);
        // Map Rebuild: exclude reserved zones from all scenery scatter
        if (x >= ZONE_ZOO_R[0]     && x <= ZONE_ZOO_R[2]     && y >= ZONE_ZOO_R[1]     && y <= ZONE_ZOO_R[3])     continue;
        if (x >= ZONE_AIRPORT_R[0]  && x <= ZONE_AIRPORT_R[2]  && y >= ZONE_AIRPORT_R[1]  && y <= ZONE_AIRPORT_R[3])  continue;
        if (x >= ZONE_MILITARY_R[0] && x <= ZONE_MILITARY_R[2] && y >= ZONE_MILITARY_R[1] && y <= ZONE_MILITARY_R[3]) continue;
        if (!isOnIsland(x, y, 120)) continue;
        const terr = terrainAtGeom(x, y);
        if (sand) {
          if (terr !== GTERRAIN.SAND) continue;
        } else if (terr === GTERRAIN.SAND || terr === GTERRAIN.WATER
          || terr === GTERRAIN.SPACE || terr === GTERRAIN.ROAD
          || terr === GTERRAIN.PAVEMENT) {
          // PAVEMENT excluded: park scenery (picnic tables, bushes) was leaking
          // into downtown between the towers — pure nonsense in a city core.
          continue;
        }
        if (!this.roadClear(x, y, R)) continue;
        let blocked = false;
        for (const l of this.structureLots) {
          const md = l.fpR + R + 12;
          if ((l.x - x) ** 2 + (l.y - y) ** 2 < md * md) { blocked = true; break; }
        }
        if (blocked) continue;
        for (const p of placed) {
          const md = p.r + R + 16;
          if ((p.x - x) ** 2 + (p.y - y) ** 2 < md * md) { blocked = true; break; }
        }
        if (blocked) continue;
        this.makeObj('apple', x, y, {
          scenery: true, sceneryKey: def.key,
          baseSize: R, size: R, contactRadius: R * 0.85,
          tier: def.tier, living: false, infra: false,
        });
        placed.push({ x, y, r: R });
        return true;
      }
      return false;
    };

    let forest = 0, park = 0, beach = 0, green = 0;
    for (let i = 0; i < 60; i++) if (tryPlace(ZONE_FOREST_R, SCENERY_FOREST, false)) forest++;
    for (let i = 0; i < 16; i++) if (tryPlace(ZONE_PARK_R, SCENERY_PARK, false)) park++;
    for (let i = 0; i < 18; i++) if (tryPlace(ZONE_BEACH_R, SCENERY_BEACH, true)) beach++;
    const whole = [0, 0, S, S] as const;
    for (let i = 0; i < 60; i++) if (tryPlace(whole, SCENERY_GREEN, false)) green++;

    console.log(`SCENERY PLACED: forest=${forest} park=${park} beach=${beach} greenery=${green} total=${forest + park + beach + green}`);
  }

  // v5 §3 — guarantee edible coverage across the whole map
  private validateDensity(rand: () => number) {
    const step = 300, R = 300;
    const patch: ObjectKind[] = ['flower', 'flowerpot', 'gnome', 'apple', 'mailbox'];
    const hw = CONFIG.ROAD_WIDTH / 2 + 8; // v10 §6: road half-width + margin for asphalt check
    for (let cy = step / 2; cy < this.size; cy += step) {
      for (let cx = step / 2; cx < this.size; cx += step) {
        // v10 §6: skip grid cells whose centre sits on the asphalt band
        const onRoad = ROAD_CENTERS.some((c) => Math.abs(cx - c) < hw || Math.abs(cy - c) < hw);
        if (onRoad) continue;
        // Alive Pack §A: skip cells that are off the island
        if (!isOnIsland(cx, cy)) continue;
        let has = false;
        for (const o of this.objects) {
          if (o.eaten || o.kind === 'watertower') continue;
          if (dist(o.x, o.y, cx, cy) <= R) { has = true; break; }
        }
        if (!has) {
          // Overnight: probe for a lot-clear spot in the cell before patching
          let px2 = clamp(cx, MARGIN + 20, this.size - MARGIN - 20);
          let py2 = clamp(cy, MARGIN + 20, this.size - MARGIN - 20);
          let ok = this.clearOfLots(px2, py2);
          for (let att = 0; att < 6 && !ok; att++) {
            px2 = clamp(cx + (rand() - 0.5) * 240, MARGIN + 20, this.size - MARGIN - 20);
            py2 = clamp(cy + (rand() - 0.5) * 240, MARGIN + 20, this.size - MARGIN - 20);
            ok = this.clearOfLots(px2, py2) && isOnIsland(px2, py2);
          }
          if (ok) this.makeObj(pick(patch, rand), px2, py2);
        }
      }
    }
  }

  // v5 §3 — precompute deterministic dressing so it never flickers frame-to-frame
  private buildDressing(rand: () => number) {
    this.dressMats = []; this.dressManholes = [];
    this.dressPaved = []; // v16.1 B2
    const inset = CONFIG.SIDEWALK;
    for (const b of this.blocks) {
      const ix = b.x0 + inset, iy = b.y0 + inset;
      const iw = CONFIG.BLOCK_SIZE - inset * 2, ih = CONFIG.BLOCK_SIZE - inset * 2;
      if (b.type === 'beach') continue; // Prompt 14 Stage 3: sand speckles removed — tex_sand owns surface
      if ((b as any).paved) {
        // v16.1 B2: paved block dressing — drain grates, direction arrows, leaf litter, concrete planters
        for (let i = 0; i < 6; i++)
          this.dressPaved.push({ x: ix + rand() * iw, y: iy + rand() * ih, kind: 'grate', rot: 0, s: 1 });
        for (let i = 0; i < 4; i++)
          this.dressPaved.push({ x: ix + rand() * iw, y: iy + rand() * ih, kind: 'arrow', rot: Math.floor(rand() * 4) * Math.PI / 2, s: 1 });
        for (let i = 0; i < 8; i++)
          this.dressPaved.push({ x: ix + rand() * iw, y: iy + rand() * ih, kind: 'leaf', rot: rand() * Math.PI * 2, s: 0.5 + rand() * 0.8 });
        for (let i = 0; i < 4; i++)
          this.dressPaved.push({ x: ix + rand() * iw, y: iy + rand() * ih, kind: 'planter', rot: rand() * Math.PI * 0.15, s: 1 });
        continue;
      }
      // Prompt 14 Stage 3: grass tufts removed — tex_grass at full opacity owns the surface.
      // Prompt 14 Stage 3: picket fences + corner hedges removed — baked per-lot yards own fencing.
    }
    for (const o of this.objects) {
      if (o.kind === 'house') this.dressMats.push({ x: o.x, y: o.y + o.size * 0.55 });
    }
    for (let i = 0; i < 12; i++) {
      const c = ROAD_CENTERS[Math.floor(rand() * ROAD_CENTERS.length)];
      const along = MARGIN + rand() * (this.size - MARGIN * 2);
      if (rand() < 0.5) this.dressManholes.push({ x: along, y: c });
      else this.dressManholes.push({ x: c, y: along });
    }
  }

  // v13 §3: per-block edible density audit (callable any time; warns if under quota)
  debugDensity(): void {
    const EDIBLE_TARGET = 18;
    for (const b of this.blocks) {
      const edibles = this.objects.filter((o) =>
        !o.eaten &&
        o.x >= b.x0 && o.x < b.x0 + CONFIG.BLOCK_SIZE &&
        o.y >= b.y0 && o.y < b.y0 + CONFIG.BLOCK_SIZE &&
        CONFIG.KIND_INFO[o.kind]?.tier !== undefined
      ).length;
      if (edibles < EDIBLE_TARGET) {
        console.warn(`[density] block (${b.gx},${b.gy}) type=${b.type}: ${edibles} edibles < target ${EDIBLE_TARGET}`);
      }
    }
    console.log('[density] validation complete');
  }

  // ── block interiors (inset by sidewalk) ──
  private pointInBlock(b: Block, rand: () => number, inset = CONFIG.SIDEWALK + 10) {
    const s = CONFIG.BLOCK_SIZE - inset * 2;
    return { x: b.x0 + inset + rand() * s, y: b.y0 + inset + rand() * s };
  }

  /** Overnight fix ("trees on top of houses"): true when (x,y) keeps `pad`
   *  clearance from every placed structure lot. Scatters retry on failure. */
  private clearOfLots(x: number, y: number, pad = 26): boolean {
    for (const l of this.structureLots) {
      const md = l.fpR + pad;
      if ((l.x - x) ** 2 + (l.y - y) ** 2 < md * md) return false;
    }
    return true;
  }

  // Perf pass: per-frame mover avoidance can't afford the O(lots) scan above —
  // profiling showed clearOfLots at ~0.6ms/frame. A coarse boolean grid (48px
  // cells, ~10px pad baked in) makes the hot check O(1). Conservative: a cell
  // touching any lot circle counts as blocked; movers just pick a new heading.
  private lotGrid: Uint8Array | null = null;
  private lotGridCell = 48;
  private lotGridW = 0;

  private buildLotGrid(): void {
    const cell = this.lotGridCell;
    const w = Math.ceil(this.size / cell);
    this.lotGridW = w;
    const g = new Uint8Array(w * w);
    for (const l of this.structureLots) {
      const r = l.fpR + 10;
      const x0 = Math.max(0, Math.floor((l.x - r) / cell)), x1 = Math.min(w - 1, Math.floor((l.x + r) / cell));
      const y0 = Math.max(0, Math.floor((l.y - r) / cell)), y1 = Math.min(w - 1, Math.floor((l.y + r) / cell));
      for (let gy = y0; gy <= y1; gy++) {
        for (let gx = x0; gx <= x1; gx++) {
          const nx = clamp(l.x, gx * cell, (gx + 1) * cell);
          const ny = clamp(l.y, gy * cell, (gy + 1) * cell);
          if ((nx - l.x) ** 2 + (ny - l.y) ** 2 <= r * r) g[gy * w + gx] = 1;
        }
      }
    }
    this.lotGrid = g;
  }

  private clearOfLotsFast(x: number, y: number): boolean {
    if (!this.lotGrid) return this.clearOfLots(x, y, 6);
    const gx = (x / this.lotGridCell) | 0, gy = (y / this.lotGridCell) | 0;
    if (gx < 0 || gy < 0 || gx >= this.lotGridW || gy >= this.lotGridW) return true;
    return this.lotGrid[gy * this.lotGridW + gx] === 0;
  }

  private scatter(b: Block, rand: () => number, kind: ObjectKind, n: number, avoidX?: number, avoidY?: number) {
    for (let i = 0; i < n; i++) {
      // Alive Pack §A: try up to 5 times to land on the island (covers water + cliff rim)
      let p = this.pointInBlock(b, rand);
      for (let attempt = 0; attempt < 7 && (!isOnIsland(p.x, p.y) || !this.clearOfLots(p.x, p.y)); attempt++) {
        p = this.pointInBlock(b, rand);
      }
      if (!isOnIsland(p.x, p.y) || !this.clearOfLots(p.x, p.y)) continue; // no clean spot — skip
      if (avoidX !== undefined && avoidY !== undefined && dist(p.x, p.y, avoidX, avoidY) < 120) continue;
      const o = this.makeObj(kind, p.x, p.y);
      if (kind === 'person' || (kind as string).startsWith('person_')) { o.tether = 90; }
      if (kind === 'dog') { o.tether = 160; }
    }
  }

  // Life Pack §1 + War Pack §1: zone-biased person scatter — detailed pedestrian sprites only (stick-figure 'person' retired)
  private static readonly BEACH_PEOPLE: ObjectKind[] = [
    'person_fish', 'person_sun', 'person_guard', 'person_jog', 'person_jog2', 'icecream_vendor', 'tourist',
  ];
  private static readonly DOWNTOWN_PEOPLE: ObjectKind[] = [
    'person_biz', 'person_const', 'person_jog', 'skateboarder', 'waiter', 'tourist', 'cyclist',
  ];
  private static readonly RESIDENTIAL_PEOPLE: ObjectKind[] = [
    'person_granny', 'person_elderly', 'person_mom', 'person_dad', 'person_dog',
    'person_kid', 'person_jog', 'cyclist',
  ];
  private static readonly PARK_PEOPLE: ObjectKind[] = [
    'person_jog', 'person_jog2', 'person_kid', 'person_elderly', 'person_mom', 'person_dad',
    'icecream_vendor', 'cyclist', 'tourist',
  ];
  private static readonly ALL_PEOPLE: ObjectKind[] = [
    'person_biz', 'person_jog', 'person_kid', 'person_granny', 'person_fish',
    'person_sun', 'person_guard', 'person_dog', 'person_const',
    // Life Pack §1: people2
    'person_mom', 'person_dad', 'skateboarder', 'cyclist', 'waiter',
    'icecream_vendor', 'person_jog2', 'person_elderly', 'tourist',
  ];

  private scatterPeople(b: Block, rand: () => number, zone: 'beach'|'downtown'|'residential'|'park'|'any', n: number, avoidX?: number, avoidY?: number) {
    const pool = zone === 'beach' ? WorldManager.BEACH_PEOPLE
      : zone === 'downtown'    ? WorldManager.DOWNTOWN_PEOPLE
      : zone === 'residential' ? WorldManager.RESIDENTIAL_PEOPLE
      : zone === 'park'        ? WorldManager.PARK_PEOPLE
      : WorldManager.ALL_PEOPLE;
    for (let i = 0; i < n; i++) {
      // Alive Pack §A: retry until on-island (covers water + cliff rim)
      let p = this.pointInBlock(b, rand);
      for (let attempt = 0; attempt < 7 && (!isOnIsland(p.x, p.y) || !this.clearOfLots(p.x, p.y)); attempt++) {
        p = this.pointInBlock(b, rand);
      }
      if (!isOnIsland(p.x, p.y) || !this.clearOfLots(p.x, p.y)) continue; // no clean spot — skip
      if (avoidX !== undefined && avoidY !== undefined && dist(p.x, p.y, avoidX, avoidY) < 120) continue;
      const kind = pool[Math.floor(rand() * pool.length)];
      const o = this.makeObj(kind, p.x, p.y);
      o.tether = 90;
    }
  }

  /** War Pack §2: spawn a defense unit (police_car / army_jeep) at world position. */
  spawnDefenseUnit(kind: ObjectKind, x: number, y: number): WorldObject {
    const o = this.makeObj(kind, x, y);
    o.defense = true;
    o.living = true;
    o.pelletCd = CONFIG.DEFENSE_PELLET_CD + Math.random() * 1000;
    return o;
  }

  // Life Pack §2: place sports field ground decals in their zones
  /** Overnight: THE MARATHON — a pack of runners endlessly looping the middle
   *  road with spectators cheering from the sidewalk. Runners keep running
   *  even while fleeing (faster). The island's silliest recurring event. */
  private spawnMarathon(rand: () => number) {
    const rc = ROAD_CENTERS[2]; // centre horizontal road
    const startX = 2200 + rand() * 800;
    const RUNNER_LINES = ['PB PACE!!', 'mile 12… of 3', 'who put a VOID on the route?!',
      'CARDIO SAVES LIVES!!', 'water station where!!', 'my playlist just peaked!!'];
    for (let i = 0; i < 8; i++) {
      const x = startX + i * (90 + rand() * 60);
      const y = rc + (rand() - 0.5) * 40;
      if (!isOnIsland(x, y)) continue;
      const o = this.makeObj('runner', x, y);
      o.roadAxis = 'h';
      o.roadDir = 1;
      o.sceneryKey = `p3d_person_${(i * 3 + 1) % 8}`;
      if (rand() < 0.4) { o.bubbleText = RUNNER_LINES[i % RUNNER_LINES.length]; o.bubbleLife = 3500; }
    }
    // spectators on the sidewalk cheering
    const CHEER = ['GO GO GO!!', "you're ALL winners!!", 'my knees hurt watching', 'FREE HIGH FIVES!!'];
    for (let i = 0; i < 4; i++) {
      const sx = startX + 200 + i * 180;
      const sy = rc + (i % 2 ? 1 : -1) * (CONFIG.ROAD_WIDTH / 2 + 34);
      if (!isOnIsland(sx, sy)) continue;
      const o = this.makeObj(i % 2 ? 'person_mom' : 'person_kid', sx, sy);
      o.tether = 40;
      o.bubbleText = CHEER[i]; o.bubbleLife = 4200 + i * 800;
    }
  }

  private initSportsFields(rand: () => number) {
    const parkBlocks = this.blocks.filter(b => b.type === 'park');
    const downtownBlocks = this.blocks.filter(b => b.type === 'downtown');
    const resBlocks = this.blocks.filter(b => b.type === 'residential' || b.type === 'cozy' || b.type === 'fancy');
    const cx = (b: Block) => b.x0 + CONFIG.BLOCK_SIZE / 2;
    const cy = (b: Block) => b.y0 + CONFIG.BLOCK_SIZE / 2;

    // "Why is there a soccer field in the river" — every decal spot must be
    // DRY across its whole rect (park blocks contain the pond/river). Jitter
    // around the preferred spot until a dry position is found; skip if none.
    const drySpot = (fx: number, fy: number, hw: number, hh: number): { x: number; y: number } | null => {
      for (let att = 0; att < 12; att++) {
        const sx = fx + (att ? (rand() - 0.5) * 420 : 0);
        const sy = fy + (att ? (rand() - 0.5) * 420 : 0);
        if (!isOnIsland(sx, sy, Math.round(Math.max(hw, hh)))) continue;
        const wet = [[0, 0], [hw + 40, hh + 40], [-hw - 40, hh + 40], [hw + 40, -hh - 40], [-hw - 40, -hh - 40],
          [hw + 40, 0], [-hw - 40, 0], [0, hh + 40], [0, -hh - 40]].some(
          ([ox, oy]) => terrainAtGeom(sx + ox, sy + oy) === GTERRAIN.WATER,
        );
        if (!wet) return { x: sx, y: sy };
      }
      return null;
    };
    const place = (kind: FieldDecal['kind'], fx: number, fy: number, hw: number, hh: number) => {
      const p = drySpot(fx, fy, hw, hh);
      if (p) this.fieldDecals.push({ kind, cx: p.x, cy: p.y, halfW: hw, halfH: hh });
    };

    if (parkBlocks.length) {
      const pb = parkBlocks[Math.floor(rand() * parkBlocks.length)];
      place('field_soccer', cx(pb), cy(pb), 200, 130);
      const gb = parkBlocks[Math.floor(rand() * parkBlocks.length)];
      place('field_golf', gb.x0 + CONFIG.BLOCK_SIZE * 0.3, gb.y0 + CONFIG.BLOCK_SIZE * 0.32, 160, 120);
    }
    if (downtownBlocks.length) {
      const db = downtownBlocks[Math.floor(rand() * downtownBlocks.length)];
      place('field_basketball', db.x0 + CONFIG.BLOCK_SIZE * 0.75, cy(db), 140, 80);
    }
    if (resBlocks.length) {
      const rb = resBlocks[Math.floor(rand() * resBlocks.length)];
      place('field_tennis', cx(rb), rb.y0 + CONFIG.BLOCK_SIZE * 0.7, 130, 70);
    }
    // Structural Build: beach volleyball court + cabana-club deck + forest campsite
    const beachBlocks = this.blocks.filter(b => b.type === 'beach' && isOnIsland(cx(b), cy(b), 0));
    if (beachBlocks.length) {
      const vb = beachBlocks[Math.floor(rand() * beachBlocks.length)];
      place('field_volleyball', cx(vb), vb.y0 + CONFIG.BLOCK_SIZE * 0.42, 150, 82);
      const cb = beachBlocks[Math.floor(rand() * beachBlocks.length)];
      place('field_beachclub', cb.x0 + CONFIG.BLOCK_SIZE * 0.28, cb.y0 + CONFIG.BLOCK_SIZE * 0.68, 130, 95);
    }
    const forestBlocks = this.blocks.filter(b => b.type === 'forest' && isOnIsland(cx(b), cy(b), 0));
    if (forestBlocks.length) {
      const fb = forestBlocks[Math.floor(rand() * forestBlocks.length)];
      place('field_campsite', cx(fb), cy(fb), 140, 110);
    }
    // Prompt 19 Stage 6: pass field positions to drawMap so lines are baked into ground cache.
    setMatchSportsFields(this.fieldDecals);
  }

  // Life Pack §3: place vignette scenes across the map (7-10 per match)
  private initVignettes(rand: () => number) {
    const getBlocks = (zone: VignetteConfig['zone']) =>
      zone === 'any' ? this.blocks
      : this.blocks.filter(b =>
          zone === 'park' ? b.type === 'park'
        : zone === 'downtown' ? b.type === 'downtown'
        : zone === 'residential' ? (b.type === 'residential' || b.type === 'cozy' || b.type === 'fancy')
        : zone === 'beach' ? b.type === 'beach'
        : zone === 'forest' ? b.type === 'forest'
        : zone === 'civic' ? (b.type === 'civic' || b.type === 'townhall')
        : true
      );

    const alwaysVigs = VIGNETTE_CONFIGS.filter(vc => vc.always);
    const optionalVigs = VIGNETTE_CONFIGS.filter(vc => !vc.always);
    const target = 7 + Math.floor(rand() * 4); // 7–10 total
    const optional = optionalVigs
      .map(v => ({ v, sort: rand() }))
      .sort((a, b) => a.sort - b.sort)
      .slice(0, target - alwaysVigs.length)
      .map(x => x.v);
    const chosen = [...alwaysVigs, ...optional];

    for (const vc of chosen) {
      const blocks = getBlocks(vc.zone);
      if (!blocks.length) continue;
      const b = blocks[Math.floor(rand() * blocks.length)];

      // Soccer vignette anchors on the soccer field decal if available
      let ax = b.x0 + CONFIG.SIDEWALK + rand() * (CONFIG.BLOCK_SIZE - CONFIG.SIDEWALK * 2);
      let ay = b.y0 + CONFIG.SIDEWALK + rand() * (CONFIG.BLOCK_SIZE - CONFIG.SIDEWALK * 2);
      // Structural Build: scenes with a baked decal anchor onto it (soccer field,
      // volleyball court, cabana deck, campsite clearing).
      const dec = vc.decal ? this.fieldDecals.find(f => f.kind === vc.decal) : undefined;
      if (dec) {
        ax = dec.cx + (rand() - 0.5) * dec.halfW * 0.8;
        ay = dec.cy + (rand() - 0.5) * dec.halfH * 0.8;
      }
      // Overnight: civic scenes stage at their real buildings — the mayor
      // speaks on the town-hall steps, students crowd the school yard.
      if (vc.kind === 'vig_mayor' && this.townhallPos) {
        ax = this.townhallPos.x + 40; ay = this.townhallPos.y + 190;
      } else if (vc.kind === 'vig_school' && this.schoolPos) {
        ax = this.schoolPos.x + 60; ay = this.schoolPos.y + 200;
      }
      // Alive Pack §A + Overnight: retry anchor until on-island AND clear of
      // buildings (a wedding inside a house footprint read as chaos)
      for (let vigAtt = 0; vigAtt < 8 && (!isOnIsland(ax, ay) || !this.clearOfLots(ax, ay, 90)); vigAtt++) {
        ax = b.x0 + CONFIG.SIDEWALK + rand() * (CONFIG.BLOCK_SIZE - CONFIG.SIDEWALK * 2);
        ay = b.y0 + CONFIG.SIDEWALK + rand() * (CONFIG.BLOCK_SIZE - CONFIG.SIDEWALK * 2);
      }
      if (!isOnIsland(ax, ay) || !this.clearOfLots(ax, ay, 90)) continue; // no clean stage — skip scene

      const anchor = this.makeObj(vc.kind, ax, ay);
      anchor.tether = 60;
      anchor.vignetteData = {
        id: vc.kind, ambientText: vc.ambientText, panicText: vc.panicText,
        eatenBanner: vc.eatenBanner, ambientCd: 3000 + rand() * 4000, panicked: false,
      };

      // Supporting props scattered within 200px of anchor
      const PROP_SPREAD = 160;
      for (const pk of (vc.supportProps ?? [])) {
        const ox = ax + (rand() - 0.5) * PROP_SPREAD, oy = ay + (rand() - 0.5) * PROP_SPREAD;
        if (!isOnIsland(ox, oy) || !this.clearOfLots(ox, oy)) continue;
        this.makeObj(pk, ox, oy);
      }
      // Supporting peds
      for (const pk of (vc.supportPeds ?? [])) {
        const ox = ax + (rand() - 0.5) * PROP_SPREAD, oy = ay + (rand() - 0.5) * PROP_SPREAD;
        if (!isOnIsland(ox, oy) || !this.clearOfLots(ox, oy, 8)) continue;
        const o = this.makeObj(pk, ox, oy);
        o.tether = 80;
      }
    }
  }

  private fillResidential(b: Block, rand: () => number) {
    // Phase 4 §4: houses now placed on HOUSE_LOTS (street-aligned, lot-based).
    // Random block-scatter houses removed; shed + accessories kept.
    this.scatter(b, rand, 'shed', 1);
    this.scatter(b, rand, 'tree', 3);
    this.scatter(b, rand, 'mailbox', 2);
    this.scatter(b, rand, 'hydrant', 1);
    this.scatter(b, rand, 'trashcan', 2); // v16 §2: max 2 trash per building
    this.scatter(b, rand, 'bike', 1);
    this.scatter(b, rand, 'birdbath', 1);
    this.scatter(b, rand, 'flower', 6);
    this.scatter(b, rand, 'flowerpot', 4);
    this.scatter(b, rand, 'gnome', 3);
    this.scatterPeople(b, rand, 'residential', 4);
    this.scatter(b, rand, 'dog', 1);
    // v7 §3: neighborhood critters + props
    this.scatter(b, rand, 'cat', 1);
    this.scatter(b, rand, 'squirrel', 1);
    if (rand() < 0.6) this.scatter(b, rand, 'bbq', 1);
    if (rand() < 0.4) this.scatter(b, rand, 'bush', 1);
    if (rand() < 0.7) this.spawnBirds(b, rand, 3);
  }

  private fillPark(b: Block, rand: () => number, spawnX: number, spawnY: number) {
    // pond in a corner of the block
    const pondX = b.x0 + CONFIG.BLOCK_SIZE * 0.68;
    const pondY = b.y0 + CONFIG.BLOCK_SIZE * 0.7;
    const pondR = CONFIG.BLOCK_SIZE * 0.22;
    (b as any).pond = { x: pondX, y: pondY, r: pondR };
    for (let i = 0; i < 6; i++) {
      const a = rand() * Math.PI * 2, rr = rand() * pondR * 0.7;
      const dx = pondX + Math.cos(a) * rr, dy = pondY + Math.sin(a) * rr;
      if (!isOnIsland(dx, dy)) continue; // Phase 7a §6: skip ducks spawning off-island
      const o = this.makeObj('duck', dx, dy);
      o.homeX = pondX; o.homeY = pondY; o.tether = pondR * 0.85;
    }
    this.scatter(b, rand, 'fountain', 1, spawnX, spawnY);
    this.scatter(b, rand, 'bench', 4);
    this.scatter(b, rand, 'birdbath', 2);
    this.scatter(b, rand, 'tree', 5);
    this.scatter(b, rand, 'flower', 10);
    this.scatter(b, rand, 'flowerpot', 4);
    this.scatter(b, rand, 'dog', 2);
    this.scatter(b, rand, 'squirrel', 2);
    this.scatterPeople(b, rand, 'park', 6);          // War Pack §1: park visitors
    if (rand() < 0.5) this.scatter(b, rand, 'picnic_table', 1);
    if (rand() < 0.4) this.scatter(b, rand, 'icecream_cart', 1);
    this.spawnBirds(b, rand, 3);
    this.spawnBirds(b, rand, 3);
    // Map Rebuild: park is no longer at the player spawn — scatter the opening feast
    // WITHIN the park block itself rather than around the global spawn point.
    for (let i = 0; i < 14; i++) {
      const px = b.x0 + CONFIG.SIDEWALK + rand() * (CONFIG.BLOCK_SIZE - CONFIG.SIDEWALK * 2);
      const py = b.y0 + CONFIG.SIDEWALK + rand() * (CONFIG.BLOCK_SIZE - CONFIG.SIDEWALK * 2);
      if (!isOnIsland(px, py)) continue;
      if (!this.roadClear(px, py, 15)) continue;
      const kind = pick(['flower', 'apple', 'flowerpot'] as ObjectKind[], rand);
      this.makeObj(kind, px, py);
    }
  }

  // Prompt 15 Stage 2: fountain-centred plaza — the heart of the island.
  private fillPlaza(b: Block, rand: () => number) {
    // Prompt 18 Stage 2: dense plaza rebuild — tight core cluster, lamps, cafe ring, visitors.
    (b as any).paved = true;
    const cx = b.x0 + CONFIG.BLOCK_SIZE / 2;
    const cy = b.y0 + CONFIG.BLOCK_SIZE / 2;
    const B = CONFIG.BLOCK_SIZE; // 1600

    // ── Centrepiece fountain ─────────────────────────────────────────────────
    this.makeObj('fountain', cx, cy);

    // ── Tight bench ring (R ≈ 144px = 0.09×B) — 6 benches ──────────────────
    const BENCH_R = B * 0.09;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
      const bx = cx + Math.cos(a) * BENCH_R, by = cy + Math.sin(a) * BENCH_R;
      if (isOnIsland(bx, by)) this.makeObj('bench', bx, by);
    }

    // ── Streetlamps in the ring gaps (R ≈ 192px = 0.12×B) — 4 lamps ────────
    const LAMP_R = B * 0.12;
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const lx = cx + Math.cos(a) * LAMP_R, ly = cy + Math.sin(a) * LAMP_R;
      if (isOnIsland(lx, ly)) this.makeObj('streetlamp', lx, ly);
    }

    // ── Café tables ringing the lamp circle (R ≈ 224px = 0.14×B) — 5 tables ─
    const CAFE_R = B * 0.14;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + Math.PI / 5;
      const fx = cx + Math.cos(a) * CAFE_R, fy = cy + Math.sin(a) * CAFE_R;
      if (isOnIsland(fx, fy)) this.makeObj('cafetable', fx, fy);
    }

    // ── Flowerpot scatter in the core zone (R 80–240px) ─────────────────────
    for (let i = 0; i < 8; i++) {
      const a = rand() * Math.PI * 2;
      const r = B * 0.05 + rand() * B * 0.10;
      const px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r;
      if (isOnIsland(px, py)) this.makeObj('flowerpot', px, py);
    }

    // ── Food carts at the core perimeter (R ≈ 0.18×B) — 2 carts ────────────
    const CART_R = B * 0.18;
    for (let i = 0; i < 2; i++) {
      const a = Math.PI / 4 + i * Math.PI;
      const fx = cx + Math.cos(a) * CART_R, fy = cy + Math.sin(a) * CART_R;
      if (isOnIsland(fx, fy)) this.makeObj('foodcart', fx, fy);
    }

    // ── Flower bed ring (mid annulus R = 0.20–0.36×B) ───────────────────────
    this.scatter(b, rand, 'flower', 12);
    this.scatter(b, rand, 'apple',  6);

    // ── Corner trees (R ≈ 0.38×B = 608px) ───────────────────────────────────
    const CORNER_R = B * 0.38;
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const tx = cx + Math.cos(a) * CORNER_R, ty = cy + Math.sin(a) * CORNER_R;
      if (isOnIsland(tx, ty) && this.clearOfLots(tx, ty, 12)) this.makeObj('tree', tx, ty);
    }

    // ── Visitors (park strollers + general mix) ───────────────────────────────
    this.scatterPeople(b, rand, 'park',  10);
    this.scatterPeople(b, rand, 'any',    4);
  }

  // v7 §2/§3: playground park — equipment + trampoline (bounce) + hoop, plus greenery.
  private fillPlayground(b: Block, rand: () => number) {
    this.scatter(b, rand, 'tree', 3);
    this.scatter(b, rand, 'bench', 3);
    this.scatter(b, rand, 'trampoline', 1);
    this.scatter(b, rand, 'hoop', 1);
    this.scatter(b, rand, 'sandbox', 1);
    this.scatter(b, rand, 'swingset', 1);
    this.scatter(b, rand, 'slide', 1);
    this.scatter(b, rand, 'seesaw', 1);
    this.scatter(b, rand, 'flower', 8);
    this.scatterPeople(b, rand, 'park', 3);
    this.scatter(b, rand, 'dog', 1);
  }

  // v7 §2/§3: school block — the SCHOOL is a second T5 trophy (flag + hoop).
  private fillSchool(b: Block, rand: () => number) {
    (b as any).paved = true;
    const cx = b.x0 + CONFIG.BLOCK_SIZE / 2, cy = b.y0 + CONFIG.BLOCK_SIZE * 0.42;
    this.makeObj('school', cx, cy);
    this.scatter(b, rand, 'hoop', 1, cx, cy);
    this.scatter(b, rand, 'bench', 3, cx, cy);
    this.scatter(b, rand, 'tree', 3, cx, cy);
    this.scatterPeople(b, rand, 'any', 4, cx, cy);
    this.scatter(b, rand, 'flower', 6, cx, cy);
    this.scatter(b, rand, 'trashcan', 2, cx, cy);
  }

  // ── Dense City helpers ────────────────────────────────────────────────
  // Footprint fraction of an object's radius used for spacing / overlap / road tests.
  private static readonly FP_FRAC = 0.55;

  // True when a footprint of radius fpR centred at (x,y) clears every road band.
  private roadClear(x: number, y: number, fpR: number): boolean {
    const hw = CONFIG.ROAD_WIDTH / 2 + fpR;
    for (const rc of ROAD_CENTERS) {
      if (Math.abs(y - rc) < hw && x >= MARGIN && x <= this.size - MARGIN) return false;
      if (Math.abs(x - rc) < hw && y >= MARGIN && y <= this.size - MARGIN) return false;
    }
    return true;
  }

  /** Which biome a world point sits in (block-type based; beach/zoo by zone rect). */
  biomeAt(x: number, y: number): Biome {
    for (const b of this.blocks) {
      if (x < b.x0 || y < b.y0 || x >= b.x0 + CONFIG.BLOCK_SIZE || y >= b.y0 + CONFIG.BLOCK_SIZE) continue;
      switch (b.type) {
        case 'downtown': case 'plaza': case 'civic': case 'mixed': return 'downtown';
        case 'beach': return 'beach';
        case 'forest': return 'forest';
        case 'park': return 'park';
        case 'zoo': return 'zoo';
        case 'cozy': case 'fancy': case 'residential': return 'suburb';
        default: return 'other';
      }
    }
    return 'other';
  }

  // True when a footprint of radius fpR at (x,y) overlaps none of the given lots.
  private lotFree(x: number, y: number, fpR: number, existing: StructureLot[]): boolean {
    for (const l of existing) {
      const md = fpR + l.fpR;
      if ((x - l.x) ** 2 + (y - l.y) ** 2 < md * md) return false;
    }
    return true;
  }

  // Dense City: generate suburb house lots (dense grid per residential block) and
  // downtown building lots (grid per downtown block, tallest nearest the plaza).
  // Every lot is island-gated, road-cleared, and non-overlapping so the Stage-4
  // audits read zero. Runs after this.blocks is assigned, before the fill loop.
  private generateLots(rand: () => number): void {
    this.houseLots = [];
    this.townhallPos = null;
    this.schoolPos = null;
    this.structureLots = [];
    for (const b of this.blocks) b.buildingLots = undefined;
    const B = CONFIG.BLOCK_SIZE;
    const FP = WorldManager.FP_FRAC;
    const rSize = (k: ObjectKind) => {
      const info = CONFIG.KIND_INFO[k];
      return info.minR + rand() * (info.maxR - info.minR);
    };

    // ── Stage 1: dense suburbs — packed grid per residential block ──
    // Map Rebuild: two suburb districts by block column.
    //   gx < 3  (NW / left):  cozy cottages — clay_house2 rows 2–3
    //   gx ≥ 3  (SE / right): fancier homes — clay_house2 rows 0–1
    // Sprite resolution is handled in structureSpriteKey via kind mapping.
    const COZY_POOL:  ObjectKind[] = ['house', 'house', 'house', 'house_c'];
    const FANCY_POOL: ObjectKind[] = ['house_d', 'house_d', 'house_c', 'house'];
    // Row grid shared with the ground painter (internal lanes bake between rows)
    const H_STEP = CONFIG.LOT_ROW_STEP;
    const H_INSET = CONFIG.LOT_ROW_INSET;
    for (const b of this.blocks) {
      if (b.type !== 'residential' && b.type !== 'cozy' && b.type !== 'fancy') continue;
      // Prompt 15: cozy/fancy types determine pool directly; legacy 'residential' → cozy.
      const HOUSE_POOL = b.type === 'fancy' ? FANCY_POOL : COZY_POOL;
      let row = 0;
      for (let yy = b.y0 + H_INSET; yy <= b.y0 + B - H_INSET; yy += H_STEP, row++) {
        // stagger alternate rows by half a step for an organic, denser read
        const xStart = b.x0 + H_INSET + (row % 2 ? H_STEP * 0.5 : 0);
        for (let xx = xStart; xx <= b.x0 + B - H_INSET; xx += H_STEP) {
          const jx = xx + (rand() - 0.5) * 42;
          const jy = yy + (rand() - 0.5) * 42;
          const kind = HOUSE_POOL[Math.floor(rand() * HOUSE_POOL.length)];
          const size = rSize(kind);
          const fpR = size * FP;
          if (!isInsideIsland(jx, jy)) continue;
          if (!isOnIsland(jx, jy, Math.round(fpR))) continue;
          // Stage 13 §3 (footprint-aware): reject if center OR any cardinal edge touches water.
          if ([[0,0],[fpR,0],[-fpR,0],[0,fpR],[0,-fpR]].some(
            ([ox,oy]) => terrainAtGeom(jx+ox*0.85, jy+oy*0.85) === GTERRAIN.WATER,
          )) continue;
          if (!this.roadClear(jx, jy, fpR)) continue;
          if (!railClear(jx, jy, fpR)) continue; // Structural Build: keep houses off the rail loop
          if (!this.lotFree(jx, jy, fpR, this.structureLots)) continue;
          // hole.io rebuild: houses are pitched-roof extruded boxes now —
          // one visual language across the whole island.
          const lot: StructureLot = {
            x: jx, y: jy, size, fpR, kind,
            bldg: makeHouseSpec(size, Math.floor(rand() * 0x7fffffff)),
          };
          this.houseLots.push(lot);
          this.structureLots.push(lot);
        }
      }
    }

    // ── Stage 2: packed downtown — grid of building lots per downtown block ──
    // Gather every candidate cell across all on-island downtown blocks, rank by
    // distance to the central plaza, then assign tallest→nearest, shortest→edge.
    // Structural Rebuild: one LANDMARK per downtown block, placed FIRST at the
    // block centre so the tower grid packs around it (lotFree rejects overlap).
    // These are the marquee trophy eats — city hall, stadium, ferris wheel...
    for (const b of this.blocks) {
      if (b.type !== 'downtown') continue;
      const lx = b.x0 + B / 2, ly = b.y0 + B / 2;
      if (!isOnIsland(lx, ly, 0)) continue;
      const size = rSize('landmark');
      const fpR = size * FP;
      if (!this.roadClear(lx, ly, fpR) || !railClear(lx, ly, fpR)) continue;
      const lot: StructureLot = { x: lx, y: ly, size, fpR, kind: 'landmark' };
      (b.buildingLots ??= []).push(lot);
      this.structureLots.push(lot);
    }
    // ── hole.io rebuild: street-facing PARCELS, not a crammed cell grid ──
    // Each downtown block gets three west-east building rows (north edge /
    // centre / south edge). Buildings are extruded boxes with varied widths
    // and real gaps between them, fronts on the sidewalk line — the hole.io
    // block structure. Heights/kinds still rank by distance to the plaza.
    const px = this.size / 2, py = this.size / 2;
    interface Parcel { x: number; y: number; hw: number; hd: number; block: Block; d2: number }
    const parcels: Parcel[] = [];
    for (const b of this.blocks) {
      if (b.type !== 'downtown') continue;
      const bCx = b.x0 + B / 2, bCy = b.y0 + B / 2;
      if (!isOnIsland(bCx, bCy, 0)) continue; // mirror the fill-loop block guard
      const lm = (b.buildingLots ?? []).find(l => l.kind === 'landmark');
      const rowYs = [
        b.y0 + CONFIG.SIDEWALK + 150,      // north row (front on north street)
        b.y0 + B / 2,                      // centre row (alleys either side)
        b.y0 + B - CONFIG.SIDEWALK - 150,  // south row (front on south street)
      ];
      for (const ry of rowYs) {
        let cursor = b.x0 + CONFIG.SIDEWALK + 30;
        const endX = b.x0 + B - CONFIG.SIDEWALK - 30;
        while (cursor < endX - 170) {
          const hw = 85 + rand() * 65;  // half-width 85-150
          // depth is the APPARENT (camera-foreshortened) roof depth — shallow
          // slabs, like hole.io viewed at its tilt. Facades carry the height.
          const hd = 58 + rand() * 24;  // half-depth 58-82
          const cx = cursor + hw;
          if (cx + hw > endX) break;
          cursor = cx + hw + 26 + rand() * 44; // gap 26-70 between fronts
          // landmark plaza: keep parcels clear of the marquee building
          if (lm) {
            const md = lm.fpR + Math.max(hw, hd) + 60;
            if ((lm.x - cx) ** 2 + (lm.y - ry) ** 2 < md * md) continue;
          }
          if ([[0, 0], [hw, 0], [-hw, 0], [0, hd], [0, -hd]].some(
            ([ox, oy]) => terrainAtGeom(cx + ox, ry + oy) === GTERRAIN.WATER,
          )) continue;
          if (!isOnIsland(cx, ry, Math.round(Math.max(hw, hd)))) continue;
          if (!railClear(cx, ry, Math.max(hw, hd))) continue;
          parcels.push({ x: cx, y: ry, hw, hd, block: b, d2: (cx - px) ** 2 + (ry - py) ** 2 });
        }
      }
    }
    parcels.sort((a, c) => a.d2 - c.d2);
    const n = Math.max(1, parcels.length - 1);
    const kindForRank = (i: number): ObjectKind => {
      const f = i / n; // 0 = plaza-adjacent (tallest), 1 = zone edge (shortest)
      if (f < 0.45) return 'skyscraper';
      if (f < 0.82) return 'office';
      if (f < 0.93) return 'cafe';
      return 'shop';
    };
    for (let i = 0; i < parcels.length; i++) {
      const c = parcels[i];
      const kind = kindForRank(i);
      const spec = makeBuildingSpec(kind, c.hw, c.hd, i / n, Math.floor(rand() * 0x7fffffff));
      const size = Math.max(c.hw, c.hd) * 1.1; // gameplay radius ≈ footprint half-extent
      const lot: StructureLot = { x: c.x, y: c.y, size, fpR: Math.max(c.hw, c.hd), kind, bldg: spec };
      (c.block.buildingLots ??= []).push(lot);
      this.structureLots.push(lot);
    }
    // Stage 13 §3: RIVER OVERLAPS audit — must read 0 after the WATER guards above.
    const riverOverlaps = [...this.houseLots, ...this.structureLots].filter(
      l => terrainAtGeom(l.x, l.y) === GTERRAIN.WATER,
    ).length;
    console.log('[audit] RIVER OVERLAPS:', riverOverlaps);
  }

  // v12 §1: downtown block — data-driven building lots (Dense City) + street life
  private fillDowntown(b: Block, rand: () => number) {
    (b as any).paved = true; // no grass tufts; uses asphalt/sidewalk tiling
    // Dense City: place the pre-generated, non-overlapping building lots for this block
    for (const lot of b.buildingLots ?? []) {
      if (lot.bldg) {
        // hole.io rebuild: box building — live pseudo-3D draw; the flat
        // composite sprite backs the capture/tumble/swallow-ghost path.
        this.makeObj(lot.kind, lot.x, lot.y, {
          size: lot.size, baseSize: lot.size,
          bldg: lot.bldg,
          sceneryKey: ensureBuildingSprite(lot.bldg),
          contactRadius: Math.max(lot.bldg.w, lot.bldg.d) * 0.95,
        });
      } else {
        this.makeObj(lot.kind, lot.x, lot.y, { size: lot.size, baseSize: lot.size });
      }
    }
    // street furniture — URBAN props only (benches/flowers between towers read
    // as nonsense; keep the core feeling like a city, not a park)
    this.scatter(b, rand, 'cafetable', 3);
    this.scatterPeople(b, rand, 'downtown', 13); // War Pack §1: diverse downtown crowd
    this.scatter(b, rand, 'streetlamp', 2);
    this.scatter(b, rand, 'foodcart', 1);
    this.scatter(b, rand, 'apple', 2);   // T1 for early-game eating
    this.scatter(b, rand, 'car_parked_a', 1);
    this.scatter(b, rand, 'car_parked_b', 1);

    // NEW street art (street_props_sheet): engineered sidewalk furniture on
    // the block perimeter — bus shelter, kiosk, hot dog stand, planters,
    // phone booth, street clock. Placed on the sidewalk band, clear of lots.
    if (streetPropKeys.length >= 12) {
      const B = CONFIG.BLOCK_SIZE;
      const band = CONFIG.SIDEWALK * 0.55; // inset from block edge → on the pavement
      const wants: Array<[string, number]> = [
        [streetPropKeys[0], 42],  // bus shelter
        [streetPropKeys[1], 38],  // kiosk / newsstand
        [streetPropKeys[4], 34],  // hot dog stand
        [streetPropKeys[6], 24],  // planter
        [streetPropKeys[8], 30],  // phone booth
        [streetPropKeys[11], 30], // street clock
      ];
      for (let i = 0; i < wants.length; i++) {
        const [key, R] = wants[i];
        // walk the perimeter: pick an edge + position from the prop index so
        // furniture spreads around the block deterministically per block seed
        const t = (i + rand() * 0.8) / wants.length;
        const per = t * 4;
        const edge = Math.floor(per) % 4;
        const f = 0.15 + (per - Math.floor(per)) * 0.7;
        let x: number, y: number;
        if (edge === 0) { x = b.x0 + f * B; y = b.y0 + band; }
        else if (edge === 1) { x = b.x0 + B - band; y = b.y0 + f * B; }
        else if (edge === 2) { x = b.x0 + f * B; y = b.y0 + B - band; }
        else { x = b.x0 + band; y = b.y0 + f * B; }
        let blocked = false;
        for (const lot of b.buildingLots ?? []) {
          const md = lot.fpR + R + 10;
          if ((lot.x - x) ** 2 + (lot.y - y) ** 2 < md * md) { blocked = true; break; }
        }
        if (!blocked) this.placeSceneryProp(key, x, y, R);
      }
    }
  }

  // v16 §1: civic block — school+library on index 0, hospital+townhall on index 1
  // v16.1 C: civicIdx===1 gets a real townhall landmark instead of watertower
  private fillCivic(b: Block, rand: () => number, civicIdx: number) {
    (b as any).paved = false;
    const cx = b.x0 + CONFIG.BLOCK_SIZE / 2;
    const cy = b.y0 + CONFIG.BLOCK_SIZE * 0.38;
    if (civicIdx === 0) {
      // left civic block: school + library
      this.makeObj('school', cx - CONFIG.BLOCK_SIZE * 0.18, cy);
      this.schoolPos = { x: cx - CONFIG.BLOCK_SIZE * 0.18, y: cy }; // Overnight: students anchor here
      const libP = this.pointInBlock(b, rand, CONFIG.SIDEWALK + 50);
      this.makeObj('library', libP.x, libP.y);
    } else {
      // right civic block: hospital + real town hall landmark
      this.makeObj('hospital', cx, cy);
      const thP = this.pointInBlock(b, rand, CONFIG.SIDEWALK + 60);
      this.makeObj('townhall', thP.x, thP.y); // v16.1 C: real town hall T5 building
      this.townhallPos = { x: thP.x, y: thP.y }; // Overnight: mayor speech anchors here
    }
    // shared amenities
    this.scatter(b, rand, 'bench', 3);
    this.scatter(b, rand, 'tree', 4);
    this.scatter(b, rand, 'flower', 6);
    this.scatterPeople(b, rand, 'any', 4);
    this.scatter(b, rand, 'flowerpot', 3);
    this.scatter(b, rand, 'trashcan', 1);
  }

  // v12 §1: mixed block — shops + library + regular housing
  private fillMixed(b: Block, rand: () => number) {
    const shopCount = 1 + Math.floor(rand() * 2);
    for (let i = 0; i < shopCount; i++) {
      const p = this.pointInBlock(b, rand);
      this.makeObj('shop', p.x, p.y);
    }
    if (rand() < 0.6) {
      const p = this.pointInBlock(b, rand);
      this.makeObj('library', p.x, p.y);
    }
    this.scatter(b, rand, 'house', 1);
    this.scatter(b, rand, 'bench', 2);
    this.scatterPeople(b, rand, 'any', 4);
    this.scatter(b, rand, 'cafetable', 2);
    this.scatter(b, rand, 'flower', 4);
    this.scatter(b, rand, 'gnome', 1);
    this.scatter(b, rand, 'mailbox', 2);
  }

  // Rebuild Prompt 16: the zoo lives — penned animals, flamingo pond, path wanderers.
  private fillZoo(b: Block, rand: () => number) {
    (b as any).zoo = true;
    const [zx0, zy0, zx1, zy1] = ZONE_ZOO_R;
    const bx = (zx0 + zx1) / 2;
    const by = (zy0 + zy1) / 2;
    const bw = zx1 - zx0;
    const bh = zy1 - zy0;
    const ins = 100;
    const penW = Math.floor((bw - ins * 2 - 80) / 3);
    const ph = bh / 2 - ins - 20;

    // 3 top-half pens, 2-3 mixed-species animals each, wandering inside their pen.
    const PEN_ANIMALS: ObjectKind[] = ['lion', 'elephant', 'giraffe', 'bear', 'zebra', 'hippo', 'panda', 'monkey', 'tortoise', 'penguin', 'flamingo', 'seal'];
    for (let col = 0; col < 3; col++) {
      const px = zx0 + ins + col * (penW + 40);
      const py = zy0 + ins;
      const pen: WorldObject['pen'] = { x0: px, y0: py, x1: px + penW, y1: py + ph };
      const count = 2 + Math.floor(rand() * 2); // 2–3 animals per pen
      for (let i = 0; i < count; i++) {
        const cx = pen.x0 + 20 + rand() * (pen.x1 - pen.x0 - 40);
        const cy = pen.y0 + 20 + rand() * (pen.y1 - pen.y0 - 40);
        if (!isOnIsland(cx, cy)) continue;
        const kind = pick(PEN_ANIMALS, rand);
        const o = this.makeObj(kind, cx, cy);
        o.homeX = (pen.x0 + pen.x1) / 2;
        o.homeY = (pen.y0 + pen.y1) / 2;
        o.tether = Math.min(penW, ph) * 0.45;
        o.pen = pen;
      }
    }

    // Flamingo pond (bottom-left) — flamingos + seal.
    const pondX = zx0 + ins + 220;
    const pondY = by + 140;
    for (let i = 0; i < 4; i++) {
      const a = rand() * Math.PI * 2;
      const rr = rand() * 90;
      const cx = pondX + Math.cos(a) * rr;
      const cy = pondY + Math.sin(a) * rr * 0.68;
      if (!isOnIsland(cx, cy)) continue;
      const kind = i < 2 ? 'flamingo' : 'seal';
      const o = this.makeObj(kind, cx, cy);
      o.homeX = pondX; o.homeY = pondY;
      o.tether = 90 + rand() * 40;
      o.pen = { x0: pondX - 120, y0: pondY - 80, x1: pondX + 120, y1: pondY + 80 };
    }

    // Path wanderers: tortoise and monkey wander the zoo block (on paths).
    const pathBounds: WorldObject['pen'] = { x0: zx0 + ins, y0: zy0 + ins, x1: zx1 - ins, y1: zy1 - ins };
    for (const kind of ['tortoise', 'monkey'] as ObjectKind[]) {
      for (let i = 0; i < 2; i++) {
        const cx = pathBounds.x0 + rand() * (pathBounds.x1 - pathBounds.x0);
        const cy = pathBounds.y0 + rand() * (pathBounds.y1 - pathBounds.y0);
        if (!isOnIsland(cx, cy)) continue;
        const o = this.makeObj(kind, cx, cy);
        o.homeX = cx; o.homeY = cy;
        o.tether = 160 + rand() * 80;
        o.pen = pathBounds;
      }
    }

    // Zoo VISITORS — a zoo without people made 0 sense
    this.scatterPeople(b, rand, 'any', 6);

    // NEW zoo art (zoo_props_sheet): habitat features inside pens + a real
    // visitor plaza at the entrance. Without these the zoo read as random
    // animals on grass — "makes 0 sense".
    if (zooPropKeys.length >= 12) {
      // One habitat feature per pen (rock formation / watering hole / log pile)
      const habitat = [zooPropKeys[3], zooPropKeys[5], zooPropKeys[6]];
      for (let col = 0; col < 3; col++) {
        const px = zx0 + ins + col * (penW + 40) + penW / 2;
        const py = zy0 + ins + ph * 0.5;
        this.placeSceneryProp(habitat[col], px, py, 46 + rand() * 10);
      }
      // Stone-rimmed pond under the flamingos (drawn first, animals wade on it)
      this.placeSceneryProp(zooPropKeys[4], pondX, pondY + 30, 78, 1);
      // Entrance plaza (south edge, mid-block): ticket booth, popcorn cart,
      // hedges and info signs along the visitor spine.
      const ex = bx, ey = zy1 - 130;
      // The real red entrance ARCH spans the visitor path (replaces the flat
      // painted rectangles that read as "rough")
      this.placeSceneryProp(zooPropKeys[0], bx, zy1 - ins - 6, 92, 3);
      this.placeSceneryProp(zooPropKeys[7], ex - 150, ey, 44);        // ticket booth
      this.placeSceneryProp(zooPropKeys[11], ex + 130, ey - 30, 36);  // popcorn cart
      this.placeSceneryProp(zooPropKeys[9], ex - 320, ey + 10, 30);   // hedge
      this.placeSceneryProp(zooPropKeys[9], ex + 300, ey + 10, 30);   // hedge
      this.placeSceneryProp(zooPropKeys[8], ex - 60, by + 40, 26);    // info sign
      this.placeSceneryProp(zooPropKeys[8], ex + 220, by - 120, 26);  // info sign
    }
  }

  /** Place a static sprite prop (new city/zoo/street art) as eatable scenery. */
  private placeSceneryProp(key: string, x: number, y: number, R: number, tier = 2) {
    if (!isOnIsland(x, y, 20)) return;
    if (!this.clearOfLots(x, y, R * 0.5)) return; // never on top of a building
    this.makeObj('apple', x, y, {
      scenery: true, sceneryKey: key,
      baseSize: R, size: R, contactRadius: R * 0.85,
      tier, living: false, infra: false,
    });
  }

  // Rebuild Prompt 16: the airport opens — terminal, control tower, hangar, planes, props.
  private fillAirport(b: Block, rand: () => number) {
    (b as any).paved = true;
    const [zx0, zy0, zx1, zy1] = ZONE_AIRPORT_R;
    const bx = (zx0 + zx1) / 2;
    const by = (zy0 + zy1) / 2;

    // Apron is the west-side taxiway: roughly [bx-200, by-130] to [bx-2, by+90].
    const apronX = bx - 160; // center of apron area
    const apronY = by - 50;
    const structures: ObjectKind[] = ['terminal', 'control_tower', 'hangar'];
    for (let i = 0; i < structures.length; i++) {
      const cx = apronX + (i - 1) * 110;
      const cy = apronY + rand() * 40;
      if (isOnIsland(cx, cy)) this.makeObj(structures[i], cx, cy);
    }

    // Two planes parked beside the runway (east of apron, on the runway/taxiway edge).
    for (let i = 0; i < 2; i++) {
      const cx = bx + 40 + rand() * 40;
      const cy = by - 220 + i * 440;
      if (isOnIsland(cx, cy)) {
        const kind = i === 0 ? 'plane_blue' : 'plane_peach';
        const o = this.makeObj(kind, cx, cy);
        o.vx = 0; o.vy = 0; // parked
      }
    }

    // Airport props on the apron.
    const props: ObjectKind[] = ['fuel_truck', 'baggage_cart', 'windsock'];
    for (const kind of props) {
      const cx = apronX + (rand() - 0.5) * 180;
      const cy = apronY + 120 + rand() * 80;
      if (isOnIsland(cx, cy)) this.makeObj(kind, cx, cy);
    }
  }

  // Rebuild Prompt 16: the toy army stages idle units at the military pad.
  private fillMilitary(b: Block, rand: () => number) {
    (b as any).paved = true;
    const [zx0, zy0, zx1, zy1] = ZONE_MILITARY_R;
    const bx = (zx0 + zx1) / 2;
    const by = (zy0 + zy1) / 2;
    const padS = 420;
    const padX0 = bx - padS / 2;
    const padY0 = by - padS / 2;

    // Idle staging: one of each clay unit type, kept within the concrete pad.
    // These are NOT defense-flagged — they are decorative staging only; defense
    // waves spawn separately and still obey the same timing/counts as before.
    const units: ObjectKind[] = ['tank', 'attack_heli', 'army_jeep', 'missile_truck', 'radar_van', 'soldier'];
    for (const kind of units) {
      let placed = false;
      for (let t = 0; t < 10 && !placed; t++) {
        const cx = padX0 + 50 + rand() * (padS - 100);
        const cy = padY0 + 50 + rand() * (padS - 100);
        if (!isOnIsland(cx, cy)) continue;
        const u = this.makeObj(kind, cx, cy);
        // Final pass (mover audit): staged units are decorative — without this
        // they fell into the pedestrian wander path and "walked" off the pad.
        if (kind !== 'soldier') u.living = false;
        placed = true;
      }
    }
  }

  // Map Rebuild: FOREST block — noticeably denser than park greenery.  [Prompt 15: counts raised]
  private fillForest(b: Block, rand: () => number) {
    // Overnight: forest is a real WOODS — dense canopy, undergrowth, wildlife
    this.scatter(b, rand, 'tree',   34);
    this.scatter(b, rand, 'bush',   16);
    this.scatter(b, rand, 'flower',  4);
    this.scatter(b, rand, 'squirrel', 2);
    this.scatter(b, rand, 'bird', 1);
    this.spawnBirds(b, rand, 4);
  }

  // v15 §4: Town Hall — civic hub, fountain, plaza feel, crowd
  private fillTownHall(b: Block, rand: () => number) {
    (b as any).paved = true;
    (b as any).townhall = true;
    const cx = b.x0 + CONFIG.BLOCK_SIZE / 2, cy = b.y0 + CONFIG.BLOCK_SIZE * 0.4;
    this.makeObj('fountain', cx, cy);
    this.scatter(b, rand, 'bench', 5);
    this.scatter(b, rand, 'tree', 4);
    this.scatterPeople(b, rand, 'any', 8);
    this.scatter(b, rand, 'flower', 6);
    this.scatter(b, rand, 'cafetable', 3);
    this.scatter(b, rand, 'foodcart', 2);
    this.scatter(b, rand, 'trashcan', 3);
    this.scatter(b, rand, 'gnome', 2);
    this.scatter(b, rand, 'scooter', 2);
    this.scatter(b, rand, 'apple', 3);
    this.scatter(b, rand, 'icecream', 1);
    this.spawnBirds(b, rand, 3);
  }

  // v13 §2: Sandy Shores beach blocks — beach objects + sunbathers + crabs
  private fillBeach(b: Block, rand: () => number) {
    this.scatter(b, rand, 'palm', 2);
    this.scatter(b, rand, 'umbrella', 3);
    this.scatter(b, rand, 'sandcastle', 2);
    this.scatter(b, rand, 'towel', 4);
    this.scatter(b, rand, 'seashell', 5);
    this.scatter(b, rand, 'crab', 2);
    if (rand() < 0.7) this.scatter(b, rand, 'surfboard', 1);
    if (rand() < 0.5) this.scatter(b, rand, 'kayak', 1);
    if (rand() < 0.4) this.scatter(b, rand, 'lifeguard', 1);
    if (rand() < 0.5) this.scatter(b, rand, 'car_parked_a', 1);
    if (rand() < 0.4) this.scatter(b, rand, 'car_parked_b', 1);
    this.scatterPeople(b, rand, 'beach', 6);
    if (rand() < 0.55) this.scatter(b, rand, 'cooler', 1);
    if (rand() < 0.45) this.scatter(b, rand, 'kite_prop', 1);
    if (rand() < 0.35) this.scatter(b, rand, 'rowboat', 1);
    this.spawnBirds(b, rand, 4); // white seagulls (same bird drawing, beach context)
  }

  // v15 §4: exact block type at a world position (used for district trophies)
  blockTypeAt(x: number, y: number): BlockType | null {
    for (const b of this.blocks) {
      if (x >= b.x0 && x < b.x0 + CONFIG.BLOCK_SIZE &&
          y >= b.y0 && y < b.y0 + CONFIG.BLOCK_SIZE) {
        return b.type;
      }
    }
    return null;
  }

  // v13 §1: map a world position to its named district
  districtAt(x: number, y: number): string {
    const blockLabel = (type: BlockType): string => {
      switch (type) {
        case 'forest':   return 'THE FOREST';
      case 'airport':  return 'AIRSTRIP ALPHA';
      case 'military': return 'RESTRICTED ZONE';
      case 'beach':       return 'SANDY SHORES';
        case 'downtown':    return 'DOWNTOWN';
        case 'school':      return 'SCHOOLYARD';
        case 'playground':  return 'SCHOOLYARD';
        case 'park':        return 'THE PARK';
        case 'zoo':         return 'ZOO';
        case 'townhall':    return 'TOWN HALL';
        case 'civic':       return 'CIVIC DISTRICT';
        default:            return 'MAPLE COURT';
      }
    };
    // exact block check
    for (const b of this.blocks) {
      if (x >= b.x0 && x < b.x0 + CONFIG.BLOCK_SIZE &&
          y >= b.y0 && y < b.y0 + CONFIG.BLOCK_SIZE) {
        return blockLabel(b.type);
      }
    }
    // on a road/sidewalk — find nearest block by centre distance so roads
    // are attributed to the district they border rather than MAPLE COURT
    let nearest: Block | null = null;
    let nearestD = Infinity;
    const half = CONFIG.BLOCK_SIZE / 2;
    for (const b of this.blocks) {
      const bx = b.x0 + half, by = b.y0 + half;
      const d = Math.hypot(x - bx, y - by);
      if (d < nearestD) { nearestD = d; nearest = b; }
    }
    if (nearest) return blockLabel(nearest.type);
    // coast zone fallback (only reached outside all blocks AND no nearest found)
    const sandD = CONFIG.COAST_SAND_DEPTH;
    if (x < sandD || y > this.size - sandD) return 'SANDY SHORES';
    return 'MAPLE COURT';
  }

  private spawnCar(rand: () => number) {
    // Alive Pack §A: retry up to 6 times to land on the island road grid
    for (let attempt = 0; attempt < 6; attempt++) {
      const horizontal = rand() < 0.5;
      const center = ROAD_CENTERS[Math.floor(rand() * ROAD_CENTERS.length)];
      const lane = (rand() < 0.5 ? 1 : -1) * CONFIG.ROAD_WIDTH * 0.22;
      const along = MARGIN + rand() * (this.size - MARGIN * 2);
      const x = horizontal ? along : center + lane;
      const y = horizontal ? center + lane : along;
      if (!isOnIsland(x, y, 0)) continue; // skip off-island road position
      const TRAFFIC_POOL: ObjectKind[] = ['car', 'car', 'car', 'taxi', 'convertible', 'fire_truck', 'school_bus'];
      const trafficKind = TRAFFIC_POOL[Math.floor(rand() * TRAFFIC_POOL.length)];
      const o = this.makeObj(trafficKind, x, y);
      o.roadAxis = horizontal ? 'h' : 'v';
      o.homeX = center + lane; o.homeY = center + lane;
      // Final pass (mover audit): right-hand traffic — direction follows the
      // lane side so same-lane cars never drive head-on into each other.
      o.roadDir = (horizontal ? (lane > 0 ? -1 : 1) : (lane > 0 ? 1 : -1));
      return;
    }
  }

  // v7 §3: a startled flock — three birds clustered so they scatter together
  private spawnBirds(b: Block, rand: () => number, n: number) {
    const p = this.pointInBlock(b, rand);
    for (let i = 0; i < n; i++) {
      const o = this.makeObj('bird', p.x + (rand() - 0.5) * 70, p.y + (rand() - 0.5) * 70);
      o.homeX = p.x; o.homeY = p.y; o.tether = 150;
    }
  }

  // v7 §3: delivery drone — spawns anywhere on the island, roams to a first waypoint
  private spawnDrone(rand: () => number) {
    let x = MARGIN + rand() * (this.size - MARGIN * 2);
    let y = MARGIN + rand() * (this.size - MARGIN * 2);
    for (let att = 0; att < 6 && !isOnIsland(x, y); att++) {
      x = MARGIN + rand() * (this.size - MARGIN * 2);
      y = MARGIN + rand() * (this.size - MARGIN * 2);
    }
    if (!isOnIsland(x, y)) return; // give up if no valid position
    const o = this.makeObj('drone', x, y);
    let hx = MARGIN + rand() * (this.size - MARGIN * 2);
    let hy = MARGIN + rand() * (this.size - MARGIN * 2);
    for (let att = 0; att < 6 && !isOnIsland(hx, hy); att++) {
      hx = MARGIN + rand() * (this.size - MARGIN * 2);
      hy = MARGIN + rand() * (this.size - MARGIN * 2);
    }
    o.homeX = hx; o.homeY = hy;
    o.tether = 99999;
  }

  // v7 §3: school bus — big vehicle on the road grid (drives like a car)
  private spawnBus(rand: () => number) {
    for (let attempt = 0; attempt < 6; attempt++) {
      const horizontal = rand() < 0.5;
      const center = ROAD_CENTERS[Math.floor(rand() * ROAD_CENTERS.length)];
      const lane = (rand() < 0.5 ? 1 : -1) * CONFIG.ROAD_WIDTH * 0.22;
      const along = MARGIN + rand() * (this.size - MARGIN * 2);
      const x = horizontal ? along : center + lane;
      const y = horizontal ? center + lane : along;
      if (!isOnIsland(x, y, 0)) continue;
      const o = this.makeObj('schoolbus', x, y);
      o.roadAxis = horizontal ? 'h' : 'v';
      o.homeX = center + lane; o.homeY = center + lane;
      // Final pass (mover audit): right-hand traffic (matches spawnCar)
      o.roadDir = (horizontal ? (lane > 0 ? -1 : 1) : (lane > 0 ? 1 : -1));
      return;
    }
  }

  // Structural Build: the downtown express — one parametric object following the
  // rail loop; loco + 3 cars are drawn from its arc position. WORLD-ENDER prey.
  spawnTrain() {
    const p = railPointAt(0);
    const o = this.makeObj('train', p.x, p.y, {});
    o.trainT = 0;
    o.scenery = true;   // bonus food: excluded from devour % and respawn population
    o.tether = 0;
    o.wanderAngle = p.a; // reused as heading for the draw pass
  }

  private stepTrain(obj: WorldObject, dtSec: number) {
    obj.trainT = ((obj.trainT ?? 0) + (CONFIG.TRAIN_SPEED * dtSec) / RAIL_TOTAL) % 1;
    const p = railPointAt(obj.trainT);
    obj.vx = (p.x - obj.x) / Math.max(dtSec, 1e-4); // keeps vacuum-wobble math sane
    obj.vy = (p.y - obj.y) / Math.max(dtSec, 1e-4);
    obj.x = obj.homeX = p.x;
    obj.y = obj.homeY = p.y;
    obj.wanderAngle = p.a;
  }

  /** Cute clay express — loco + 3 cars drawn at arc offsets behind the lead. */
  private drawTrain(ctx: CanvasRenderingContext2D, obj: WorldObject, t: number) {
    if (obj.captured) {
      // crumpled single loco while being sucked into the void
      ctx.save();
      ctx.translate(obj.x, obj.y);
      ctx.rotate(obj.captureRot);
      const s = Math.max(0.2, obj.size / 73);
      ctx.scale(s, s);
      this.drawTrainSegment(ctx, 0, t);
      ctx.restore();
      return;
    }
    for (let k = 3; k >= 0; k--) {                 // rear cars first
      const tk = ((obj.trainT ?? 0) - k * (CONFIG.TRAIN_CAR_GAP / RAIL_TOTAL) + 1) % 1;
      const p = railPointAt(tk);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.fillStyle = 'rgba(0,0,0,0.14)';          // planted contact shadow
      ctx.beginPath(); ctx.ellipse(0, 6, 62, 16, 0, 0, Math.PI * 2); ctx.fill();
      ctx.rotate(p.a);                             // local +x = travel direction
      this.drawTrainSegment(ctx, k, t);
      ctx.restore();
    }
  }

  /** One clay train segment centered at origin, +x forward. k=0 loco, 1-3 cars. */
  private drawTrainSegment(ctx: CanvasRenderingContext2D, k: number, t: number) {
    const loco = k === 0;
    const W = loco ? 116 : 104, H = loco ? 54 : 50;
    const body = loco ? '#E4586B' : k % 2 === 1 ? '#5FA8E0' : '#F2B84B';
    // wheels
    ctx.fillStyle = '#2E333D';
    for (const wx of [-W * 0.32, 0, W * 0.32]) {
      ctx.beginPath(); ctx.arc(wx, H * 0.42, 7, 0, Math.PI * 2); ctx.fill();
    }
    // chassis strip
    ctx.fillStyle = '#3E4652';
    roundRect(ctx, -W / 2, H * 0.18, W, H * 0.22, 4); ctx.fill();
    // body
    ctx.fillStyle = body;
    roundRect(ctx, -W / 2, -H / 2, W, H * 0.72, 10); ctx.fill();
    // sticker outline (matches game style)
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 3;
    roundRect(ctx, -W / 2, -H / 2, W, H * 0.72, 10); ctx.stroke();
    if (loco) {
      // cab window + boiler band + stack + cowcatcher
      ctx.fillStyle = '#EAF4FF';
      roundRect(ctx, -W * 0.36, -H * 0.36, W * 0.24, H * 0.34, 5); ctx.fill();
      ctx.fillStyle = '#8B93A3';
      roundRect(ctx, W * 0.02, -H * 0.30, W * 0.34, H * 0.5, 8); ctx.fill();
      ctx.fillStyle = '#3E4652';
      ctx.beginPath(); ctx.arc(W * 0.30, -H * 0.42, 8, 0, Math.PI * 2); ctx.fill();
      // puffing steam (animated)
      const puff = (t / 300) % 3;
      ctx.fillStyle = `rgba(240,246,255,${(0.55 - puff * 0.16).toFixed(2)})`;
      ctx.beginPath(); ctx.arc(W * 0.30 + puff * 8, -H * 0.55 - puff * 10, 6 + puff * 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#6B7484';
      ctx.beginPath();
      ctx.moveTo(W / 2, -H * 0.1); ctx.lineTo(W / 2 + 14, H * 0.34); ctx.lineTo(W / 2, H * 0.34);
      ctx.closePath(); ctx.fill();
    } else {
      // passenger windows
      ctx.fillStyle = '#EAF4FF';
      for (const wx of [-W * 0.28, 0, W * 0.28]) {
        roundRect(ctx, wx - 9, -H * 0.32, 18, H * 0.3, 4); ctx.fill();
      }
    }
  }

  get remaining() {
    // Prompt 5: scenery is excluded from the respawn population so it can't shift balance.
    return this.objects.filter((o) => !o.eaten && !o.scenery).length;
  }

  private canEatByPlayer(player: Player, obj: WorldObject) {
    if (obj.kind === 'watertower') return player.radius >= CONFIG.WATERTOWER_EAT_RADIUS;
    if (obj.kind === 'train') return player.radius >= CONFIG.TRAIN_EAT_RADIUS; // WORLD-ENDER prey
    if (obj.kind === 'skyscraper' || obj.kind === 'landmark') return player.radius >= CONFIG.SKYSCRAPER_EAT_RADIUS; // v12 §1
    if (obj.kind === 'zoo_gate' || obj.kind === 'zoo_wall') return player.radius >= CONFIG.ZOO_GATE_EAT_RADIUS; // v16.1 D
    if (obj.tier === 0) return true; // Feel Patch §2: tier-0 bits always edible
    return player.radius >= obj.size * CONFIG.EAT_RATIO;
  }

  private canEat(voidR: number, objSize: number) {
    return voidR >= objSize * CONFIG.EAT_RATIO;
  }

  update(dt: number, player: Player, rivals: Rival[], fx: FXManager) {
    const dtSec = dt / 1000;
    // Feedback Juice §1: advance cosmetic swallow ghosts (display only)
    for (const g of this.swallowGhosts) {
      if (!g.active) continue;
      g.t += dt;
      if (g.t >= g.dur) { g.active = false; continue; }
      const e = (g.t / g.dur) ** 2;               // ease-in toward the void center
      g.x = g.x0 + (g.cx - g.x0) * e;
      g.y = g.y0 + (g.cy - g.y0) * e;
      g.rot += dt * 0.0025;                        // gentle spin
    }
    if (this.rampageCd > 0) this.rampageCd -= dt; // v8 §3
    const pForm = player.formIndex;               // v8 §3: fear/rampage scale with form
    // Death Rules Pivot: eliminated rivals are out of the match — they must not
    // still act as a frozen "threat" that spooks wildlife/NPCs or blocks spawns.
    const voids = [player, ...rivals.filter((r) => r.alive)];
    let nearestEdibleD = Infinity;
    let nearestEdible: WorldObject | null = null;

    // Overnight: BIOME CHATTER — ordinary pedestrians now talk about where
    // they ARE (beach talk on the beach, commuter gripes downtown...), so
    // every biome sounds like its own place, not just looks like one.
    {
      this.chatterCd -= dt;
      if (this.chatterCd <= 0) {
        this.chatterCd = 2400 + this.rand() * 1800;
        const bubblesNow = this.objects.filter(o => !o.eaten && o.bubbleLife > 0).length;
        if (bubblesNow < 4) {
          // pick a nearby, calm, bubble-free pedestrian
          const cands = this.objects.filter(o =>
            !o.eaten && !o.fleeing && !o.bubbleText && !o.vignetteData &&
            (o.kind.startsWith('person') || ['tourist', 'waiter', 'skateboarder', 'cyclist', 'zookeeper'].includes(o.kind)) &&
            dist(o.x, o.y, player.x, player.y) < 1500);
          if (cands.length) {
            const o = cands[Math.floor(this.rand() * cands.length)];
            const pool = AMBIENT_BY_BIOME[this.biomeAt(o.x, o.y)] ?? AMBIENT_BY_BIOME.other;
            o.bubbleText = pool[Math.floor(this.rand() * pool.length)];
            o.bubbleLife = 3500;
          }
        }
      }
    }

    // Life Pack §3: vignette ambient/panic bubbles (separate pass before main loop)
    {
      let activeBubbles = this.objects.filter(o => !o.eaten && o.bubbleLife > 0).length;
      for (const obj of this.objects) {
        if (obj.eaten || !obj.vignetteData) continue;
        const vd = obj.vignetteData;
        const dp = dist(obj.x, obj.y, player.x, player.y);
        // Panic bubble fires once when player enters close range
        if (!vd.panicked && dp < player.radius + obj.size + 200) {
          vd.panicked = true;
          audio.playPedPanic(); // Sound Pack §9: cartoon squeak when ped panics
          if (!obj.bubbleText && activeBubbles < 4) {
            obj.bubbleText = pickLine(vd.panicText, this.rand); obj.bubbleLife = 5000; activeBubbles++;
          }
        }
        // Ambient bubble fires periodically when player is within 2000 world px
        if (!vd.panicked && dp < 2000) {
          vd.ambientCd -= dt;
          if (vd.ambientCd <= 0 && !obj.bubbleText && activeBubbles < 4) {
            obj.bubbleText = pickLine(vd.ambientText, this.rand); obj.bubbleLife = 4000;
            vd.ambientCd = 8000 + Math.random() * 4000; activeBubbles++;
          }
        }
      }
    }

    for (const obj of this.objects) {
      if (obj.eaten) continue;
      obj.wobble += dt * 0.004;
      if (obj.arrive > 0) obj.arrive = Math.max(0, obj.arrive - dt); // v8 §2 pop-in
      if (obj.alertT > 0) obj.alertT -= dt;
      if (obj.honkCd > 0 && !obj.living) obj.honkCd -= dt; // v7 §3: prop cooldowns (jingle)
      // v16.2 §1: speech bubble life tick
      if (obj.bubbleLife > 0) {
        obj.bubbleLife -= dt;
        if (obj.bubbleLife <= 0) {
          obj.bubbleLife = 0; obj.bubbleText = null;
          audio.playBubblePop(); // Sound Pack §10: tiny pop when bubble expires
        }
      }

      // Feel Patch §1: tick prop-shake timer
      if (obj.shakeT && obj.shakeT > 0) obj.shakeT = Math.max(0, obj.shakeT - dt);

      const canPlayerEat = this.canEatByPlayer(player, obj);
      const dp = dist(obj.x, obj.y, player.x, player.y);

      // v7 §3: ice-cream cart jingle when the player is near
      if (obj.kind === 'icecream' && dp < CONFIG.ICECREAM_JINGLE_RANGE && obj.honkCd <= 0 && !player.ghost) {
        audio.playJingle();
        obj.honkCd = 4200;
      }
      const reach = player.radius * CONFIG.CAPTURE_RADIUS_MULT * player.magnetMultiplier;

      // v8 §3: RAMPAGE — at DEVOURER+ the player obliterates T1–T2 on contact with
      // NO suction pull, rapid-fire capped at 10 pops/sec (the eat pitch-ladder races).
      const rampage = pForm >= CONFIG.DEVOURER_FORM_INDEX && obj.tier <= 2;
      if (rampage && !player.ghost && canPlayerEat && dp < player.radius + obj.size * 0.6 && this.rampageCd <= 0) {
        this.rampageCd = 100;
        this.consumeByPlayer(obj, player, fx);
        continue;
      }

      // ── gravity-well suction (player only) ──
      if (!player.ghost && canPlayerEat && !rampage && dp < reach + obj.size * 0.5) {
        // v10 §3: record shadow anchor on the first frame of capture
        if (!obj.captured) { obj.shadowX = obj.x; obj.shadowY = obj.y; }
        obj.captured = true;
        const nx = (player.x - obj.x) / (dp || 1);
        const ny = (player.y - obj.y) / (dp || 1);
        // Feel Patch §3: proximity-weighted acceleration — 3× stronger at body edge vs outer rim
        const proximityFactor = 1 + 2 * Math.max(0, 1 - (dp - player.radius) / (reach - player.radius + 1));
        obj.vx += nx * CONFIG.SUCTION_ACCEL * proximityFactor * player.suctionMult * dtSec;
        obj.vy += ny * CONFIG.SUCTION_ACCEL * proximityFactor * player.suctionMult * dtSec;
        const sp = Math.hypot(obj.vx, obj.vy);
        if (sp > CONFIG.SUCTION_MAX_SPEED) {
          obj.vx = (obj.vx / sp) * CONFIG.SUCTION_MAX_SPEED;
          obj.vy = (obj.vy / sp) * CONFIG.SUCTION_MAX_SPEED;
        }
        obj.x += obj.vx * dtSec;
        obj.y += obj.vy * dtSec;
        obj.captureScale = clamp(dp / (player.radius + obj.size), 0.2, 1);
        if (obj.living) {
          // living things flail as they're pulled in
          obj.captureRot += dt * 0.08;
        } else {
          // hole.io TIP-IN: structures pivot at their base and FALL toward
          // the hole with accelerating lean — the signature eating feel —
          // instead of the old uniform pinwheel spin.
          const tipDir = nx >= 0 ? 1 : -1;
          const tipT = clamp(1 - obj.captureScale, 0, 1);
          const target = tipDir * (0.12 + Math.pow(tipT, 1.5) * 1.8);
          obj.captureRot += (target - obj.captureRot) * Math.min(1, dt * 0.014);
        }
        obj.size = obj.baseSize * obj.captureScale;
        if (dp < player.radius * CONFIG.ABSORB_RADIUS_MULT) {
          this.consumeByPlayer(obj, player, fx);
          continue;
        }
        // still captured -> skip normal AI, but rivals can't grab a captured object
        continue;
      } else if (obj.captured) {
        // escaped the well -> skid and restore size (and stand back upright)
        obj.captured = false;
        obj.captureScale = 1;
        obj.captureRot = 0;
        obj.size = obj.baseSize;
      }

      // restore size if not captured
      if (!obj.captured && obj.size !== obj.baseSize) obj.size = obj.baseSize;

      // ── living-world AI (skip defense units — engine.ts steers them) ──
      if (obj.living && !obj.defense) this.stepLiving(obj, dt, dtSec, voids, player, fx);

      // ── Feel Patch §1: non-edible collision — player slides through, prop shakes ──
      // Only the map boundary stays hard. Trampoline keeps its special launch.
      const cdx = player.x - obj.x, cdy = player.y - obj.y;
      const cd = Math.hypot(cdx, cdy) || 1;
      const blockingNow = !player.ghost && !canPlayerEat && cd < player.radius + obj.size;
      if (blockingNow) {
        const nx = cdx / cd;
        const ny = cdy / cd;
        // v7 §3: trampoline still launches the player
        if (obj.kind === 'trampoline' && player.tooBigCd <= 0) {
          const bn = CONFIG.TRAMPOLINE_BOUNCE;
          player.x += nx * bn; player.y += ny * bn;
          player.vx = nx * bn * 5; player.vy = ny * bn * 5;
          fx.addRing(obj.x, obj.y, '#8ECBFF', obj.size, 260, 4, 320);
          audio.playBounce();
          player.tooBigCd = CONFIG.TOOBIG_COOLDOWN;
          continue;
        }
        // One-shot shake on contact ENTRY (shakeT === undefined means armed/ready)
        if (obj.shakeT === undefined) obj.shakeT = 100;
        if (player.tremorActive) {
          // v7 §5: level-aware shrink (Lvl I 15%/touch, Lvl II 25%/touch)
          obj.baseSize *= player.tremorFactor; obj.size = obj.baseSize;
          if (player.tremorLogCd <= 0) {
            console.log(`[boon] TENDERIZER shrank ${obj.kind} → ${obj.size.toFixed(1)}`);
            player.tremorLogCd = 500;
          }
        }
      } else {
        // Not currently blocking: re-arm shake for the next contact entry
        if (obj.shakeT !== undefined && obj.shakeT <= 0) obj.shakeT = undefined;
        if (canPlayerEat && cd < nearestEdibleD) {
          nearestEdibleD = cd;
          nearestEdible = obj;
        }
      }

      // ── rival interaction (pop on contact) ──
      for (const r of rivals) {
        if (!r.alive || r.ghost) continue;
        if (obj.kind === 'watertower' || obj.kind === 'train') continue; // only the player eats these
        if (obj.kind === 'skyscraper' || obj.kind === 'landmark') continue; // only WORLD ENDER player eats these
        if (obj.kind === 'zoo_gate' || obj.kind === 'zoo_wall') continue; // v16.1 D: GOBBLER+ only
        const dr = dist(obj.x, obj.y, r.x, r.y);
        // v16 §3: use art-derived contactRadius instead of CONFIG.CONTACT_SCALE
        if (dr < r.radius + obj.contactRadius && this.canEat(r.radius, obj.size)) {
          r.eatObject(obj);
          obj.eaten = true;
          break;
        }
      }
    }

    // ── Feel Patch §3: rival vacuum — pull edible objects toward nearest rival ────
    // Iterate objects (not rivals) so each object is accelerated by at most ONE rival
    // per frame. No position integration here — objects drift over frames and are
    // consumed by the main-loop contact check (lines above).
    for (const obj of this.objects) {
      if (obj.eaten || obj.captured) continue;
      if (obj.kind === 'watertower' || obj.kind === 'skyscraper' || obj.kind === 'train' || obj.kind === 'landmark') continue;
      if (obj.kind === 'zoo_gate' || obj.kind === 'zoo_wall') continue;
      // find nearest rival within vacuum range that can eat this object
      let nearestRival: Rival | null = null;
      let nearestDr = Infinity;
      for (const r of rivals) {
        if (!r.alive || r.ghost) continue;
        if (obj.tier !== 0 && !this.canEat(r.radius, obj.size)) continue;
        const dr = dist(obj.x, obj.y, r.x, r.y);
        const rReach = r.radius * CONFIG.CAPTURE_RADIUS_MULT;
        if (dr < rReach + obj.size * 0.5 && dr < nearestDr) {
          nearestDr = dr;
          nearestRival = r;
        }
      }
      if (!nearestRival) continue;
      const rReach = nearestRival.radius * CONFIG.CAPTURE_RADIUS_MULT;
      const rnx = (nearestRival.x - obj.x) / (nearestDr || 1);
      const rny = (nearestRival.y - obj.y) / (nearestDr || 1);
      const pf = 1 + 2 * Math.max(0, 1 - (nearestDr - nearestRival.radius) / (rReach - nearestRival.radius + 1));
      obj.vx += rnx * CONFIG.SUCTION_ACCEL * pf * dtSec;
      obj.vy += rny * CONFIG.SUCTION_ACCEL * pf * dtSec;
      const sp = Math.hypot(obj.vx, obj.vy);
      if (sp > CONFIG.SUCTION_MAX_SPEED) {
        obj.vx = (obj.vx / sp) * CONFIG.SUCTION_MAX_SPEED;
        obj.vy = (obj.vy / sp) * CONFIG.SUCTION_MAX_SPEED;
      }
    }

    // player look/mouth hints
    if (nearestEdible) {
      player.lookTarget = { x: nearestEdible.x, y: nearestEdible.y };
      player.approach = Math.max(0, 1 - nearestEdibleD / (player.radius * 3.5));
    } else {
      player.lookTarget = null;
      player.approach = 0;
    }

    // dirt patches fade
    for (let i = this.dirt.length - 1; i >= 0; i--) {
      this.dirt[i].life -= dt;
      if (this.dirt[i].life <= 0) this.dirt.splice(i, 1);
    }
    // v9 §3: fissure trail fades
    for (let i = this.fissures.length - 1; i >= 0; i--) {
      this.fissures[i].life -= dt;
      if (this.fissures[i].life <= 0) this.fissures.splice(i, 1);
    }
    // v16.2 §5: fissure decal stamps fade
    for (let i = this.fissureDecals.length - 1; i >= 0; i--) {
      this.fissureDecals[i].life -= dt;
      if (this.fissureDecals[i].life <= 0) this.fissureDecals.splice(i, 1);
    }

    // v8 §2: deficit-scaled respawn toward ≥90% of the starting population —
    // 4/s normally, ramping to 8/s once the world drops below 80%.
    // Structural Build: express respawns a while after being devoured
    if (this.trainRespawnT > 0) {
      this.trainRespawnT -= dt;
      if (this.trainRespawnT <= 0) this.spawnTrain();
    }
    this.respawnTimer -= dt;
    if (this.respawnTimer <= 0) {
      const target = Math.round(this.initialPopulation * CONFIG.RESPAWN_TARGET_FRAC);
      const rem = this.remaining;
      if (rem < target) {
        const frac = rem / Math.max(1, this.initialPopulation);
        // Refill fast enough that the map never feels empty: at heavy depletion
        // (e.g. after a COLLAPSE) the city pours back in at up to 18 objects/s.
        const baseRate = frac >= 0.80 ? 6 : lerp(6, 18, clamp((0.80 - frac) / 0.35, 0, 1));
        const rate = baseRate * this.respawnMult; // Phase 7b §6: ×3 during FEEDING FRENZY
        this.respawnTimer = 1000 / rate;
        this.spawnRespawn(player, voids, fx);
      } else {
        this.respawnTimer = 300; // at floor — recheck a few times a second
      }
    }
  }

  // v8 §2: respawn T1–T2 edibles onto proper ground — lawns/sidewalks, park, and
  // plaza only (never road asphalt) — off the player's screen and never within
  // 1.5× radius of any void. 5% of spawns are a crosswalk apple on a road. Every
  // arrival pops in with a bounce + dust puff so players SEE food returning.
  private spawnRespawn(player: Player, voids: { x: number; y: number; radius: number }[], fx: FXManager) {
    // occasional crosswalk apple on the road grid (≤5% of spawns)
    if (this.rand() < 0.05) {
      const rp = this.roadPoint(player, voids);
      if (rp) { const o = this.makeObj('apple', rp.x, rp.y); o.arrive = 200; this.spawnPuff(rp.x, rp.y, fx); }
      return;
    }
    // v9 §8: gnomes never respawn so GNOME LORD stays achievable
    // v16 §2: INFRA objects (mailbox/hydrant/trashcan/bench/bike/scooter) placed once, never respawn
    const kinds: ObjectKind[] = ['flower', 'flowerpot', 'apple', 'duck', 'seashell', 'crab'];
    const zones = this.blocks.filter((b) => b.type === 'residential' || b.type === 'park' || b.type === 'plaza' || b.type === 'downtown' || b.type === 'mixed' || b.type === 'civic');
    if (!zones.length) return;
    let bx = 0, by = 0, bestScore = -Infinity;
    for (let i = 0; i < 12; i++) {
      const b = zones[Math.floor(this.rand() * zones.length)];
      const pt = this.pointInBlock(b, this.rand);
      const dPlayer = dist(pt.x, pt.y, player.x, player.y);
      if (dPlayer < 520) continue; // keep it off the player's screen
      let voidClear = true, nearVoid = Infinity;
      for (const v of voids) {
        const d = dist(pt.x, pt.y, v.x, v.y);
        if (d < v.radius * 1.5) { voidClear = false; break; }
        if (d < nearVoid) nearVoid = d;
      }
      if (!voidClear) continue;
      if (!isWalkable(pt.x, pt.y)) continue; // Fix 3: never spawn in space
      let near = Infinity;
      for (const o of this.objects) {
        if (o.eaten) continue;
        const d = dist(pt.x, pt.y, o.x, o.y);
        if (d < near) near = d;
      }
      const score = dPlayer * 0.15 + near + nearVoid * 0.05; // favour distant + sparse
      if (score > bestScore) { bestScore = score; bx = pt.x; by = pt.y; }
    }
    if (bestScore === -Infinity) return; // no safe spot this tick; try again next
    const o = this.makeObj(pick(kinds, this.rand), bx, by);
    o.arrive = 200;
    this.spawnPuff(bx, by, fx);
  }

  // v8 §2: a point on the road grid (for the occasional crosswalk apple), still
  // off the player's screen and clear of every void.
  private roadPoint(player: Player, voids: { x: number; y: number; radius: number }[]) {
    const m = CONFIG.MAP_SIZE;
    for (let i = 0; i < 12; i++) {
      const along = MARGIN + this.rand() * (m - MARGIN * 2);
      const center = ROAD_CENTERS[Math.floor(this.rand() * ROAD_CENTERS.length)];
      const horizontal = this.rand() < 0.5;
      const x = horizontal ? along : center;
      const y = horizontal ? center : along;
      if (dist(x, y, player.x, player.y) < 520) continue;
      if (voids.some((v) => dist(x, y, v.x, v.y) < v.radius * 1.5)) continue;
      return { x, y };
    }
    return null;
  }

  // Fix 3: remove ALL off-island initial objects (props, living, infra) once mask is loaded.
  // engine.ts calls this once after loadIslandAssets() resolves.
  filterNonWalkable() {
    const before = this.objects.length;
    this.objects = this.objects.filter((o) => isWalkable(o.x, o.y));
    console.log(`[world] filterNonWalkable: ${before} → ${this.objects.length} objects`);
  }

  // v16.2 §1: set a speech bubble on an object by id
  setBubble(objId: number, text: string, lifeMs: number) {
    const o = this.objects.find((o) => o.id === objId && !o.eaten);
    if (o) { o.bubbleText = text; o.bubbleLife = lifeMs; }
  }

  // v8 §2: a small dust puff so arrivals read as "popping in"
  private spawnPuff(x: number, y: number, fx: FXManager) {
    fx.addCrumbs(x, y, '#D8C7A2', 6);
  }

  // v9 §3: WORLD ENDER's path leaves jagged violet fissure segments (cracked
  // reality, never brown) — 2–3 branching lines per step, fading over 8s.
  dropCrack(x: number, y: number, radius: number) {
    // v16.2 §5: push a decal stamp per crack event (drawn via multiply blend when image loaded)
    this.fissureDecals.push({
      x, y,
      rot: this.rand() * Math.PI * 2,
      scale: 0.7 + this.rand() * 0.6,
      size: radius * 2.5,
      idx: this.rand() < 0.5 ? 0 : 1,
      life: 8000, maxLife: 8000,
    });
    if (this.fissureDecals.length > 90) this.fissureDecals.splice(0, this.fissureDecals.length - 90);

    // Keep procedural polylines as fallback (only rendered when fx PNGs not loaded)
    const lines = 2 + Math.floor(this.rand() * 2);
    for (let i = 0; i < lines; i++) {
      const ang = this.rand() * Math.PI * 2;
      const len = radius * (0.5 + this.rand() * 0.6);
      const steps = 4;
      const pts: number[][] = [];
      let cx = x, cy = y;
      for (let k = 0; k <= steps; k++) {
        pts.push([cx, cy]);
        cx += Math.cos(ang) * (len / steps) + (this.rand() - 0.5) * radius * 0.2;
        cy += Math.sin(ang) * (len / steps) + (this.rand() - 0.5) * radius * 0.2;
      }
      this.fissures.push({ pts, life: 8000, maxLife: 8000 });
    }
    if (this.fissures.length > 90) this.fissures.splice(0, this.fissures.length - 90);
  }

  // v6 §2: golden object — 3× mass (bigger radius) and 3× score on consume.
  // v7 §5: ECHO BITE shockwave / EVENT HORIZON aura — pull nearby edibles inward.
  attractEdibles(px: number, py: number, range: number, pull: number) {
    for (const o of this.objects) {
      if (o.eaten) continue;
      const dx = px - o.x, dy = py - o.y;
      const d = Math.hypot(dx, dy);
      if (d > range || d < 1) continue;
      const k = pull * (1 - d / range);
      o.x += (dx / d) * k;
      o.y += (dy / d) * k;
    }
  }

  /** Signature "void power" blast: yank every edible within `pullRange` sharply
   *  inward, then instantly devour everything inside `consumeRange` that the
   *  player is allowed to eat. At high forms `crushBig` lets it swallow oversized
   *  structures (skyscrapers, water towers) that the size-gate would normally
   *  block — the WORLD-ENDER "collapse" fantasy. Returns the count consumed so
   *  the caller can scale its feedback. */
  voidPowerBlast(player: Player, pullRange: number, consumeRange: number, pull: number, crushBig: boolean, fx: FXManager): number {
    // 1) hard inward pull across the whole reach
    this.attractEdibles(player.x, player.y, pullRange, pull);
    // 2) instant devour inside the consume radius. Snapshot first: consumeByPlayer
    //    mutates object state, so iterate a stable list.
    let eaten = 0;
    for (const o of this.objects) {
      if (o.eaten) continue;
      if (dist(o.x, o.y, player.x, player.y) > consumeRange + o.size) continue;
      // zoo_wall is never edible (structural boundary); everything else is fair
      // game when crushBig, otherwise honour the normal size gate.
      const eligible = crushBig ? o.kind !== 'zoo_wall' : this.canEatByPlayer(player, o);
      if (!eligible) continue;
      this.consumeByPlayer(o, player, fx);
      eaten++;
    }
    return eaten;
  }

  // v8 §1: nudge any edibles off the round-start footprint of every void so a
  // rival never begins the round sitting inside a cluster (which let bots pop a
  // dozen objects in the first frame and hit 100+ score instantly). Relocates
  // rather than deletes, so the starting population is preserved.
  clearSpawnFootprint(voids: { x: number; y: number; radius: number }[]) {
    const m = CONFIG.MAP_SIZE;
    for (const o of this.objects) {
      if (o.eaten) continue;
      const onVoid = voids.some((v) => dist(o.x, o.y, v.x, v.y) < v.radius * 1.8 + o.size);
      if (!onVoid) continue;
      for (let i = 0; i < 24; i++) {
        const nx = MARGIN + this.rand() * (m - MARGIN * 2);
        const ny = MARGIN + this.rand() * (m - MARGIN * 2);
        // Alive Pack §A: relocated objects must also be on the island
        if (isWalkable(nx, ny) && this.clearOfLots(nx, ny) && !voids.some((v) => dist(nx, ny, v.x, v.y) < v.radius * 2 + o.size)) {
          o.x = nx; o.y = ny; break;
        }
      }
    }
  }

  // v8 §7: METEOR SNACK SHOWER — drop an edible snack at an exact point, with a puff.
  dropSnack(x: number, y: number, fx: FXManager) {
    const info = CONFIG.KIND_INFO['apple'];
    const base = (info.minR + this.rand() * (info.maxR - info.minR)) * Math.sqrt(CONFIG.GOLDEN_MASS_MULT);
    const o = this.makeObj('apple', x, y, { golden: true, baseSize: base, size: base });
    o.arrive = 200;
    this.spawnPuff(x, y, fx);
  }

  spawnGolden(player: Player) {
    const m = CONFIG.MAP_SIZE;
    let x = MARGIN + this.rand() * (m - MARGIN * 2);
    let y = MARGIN + this.rand() * (m - MARGIN * 2);
    // First-timer audit: goldens landed on rooftops — require island + off-lot.
    for (let i = 0; i < 24; i++) {
      x = MARGIN + this.rand() * (m - MARGIN * 2);
      y = MARGIN + this.rand() * (m - MARGIN * 2);
      if (dist(x, y, player.x, player.y) > 320 && isOnIsland(x, y) && this.clearOfLots(x, y)) break;
    }
    const info = CONFIG.KIND_INFO['apple'];
    const base = (info.minR + this.rand() * (info.maxR - info.minR)) * Math.sqrt(CONFIG.GOLDEN_MASS_MULT);
    this.makeObj('apple', x, y, { golden: true, baseSize: base, size: base });
  }

  private stepLiving(obj: WorldObject, dt: number, dtSec: number, voids: { x: number; y: number; radius: number; ghost: boolean }[], player: Player, fx: FXManager) {
    // Structural Build: the express follows the rail loop — no flee, no wander.
    if (obj.kind === 'train') return this.stepTrain(obj, dtSec);
    // Prompt 20 Stage 3: all traffic-pool vehicle kinds follow the road network,
    // not free-wander. Previously only 'car' and 'schoolbus' used stepCar; taxi,
    // convertible, fire_truck, and school_bus fell through to stepWander and roamed
    // freely off roads. All are spawned by spawnCar() with roadAxis/homeX/homeY set.
    // Guard: infra=true objects are parked-car dressing (taxi/convertible parked at
    // curbs) — they must NOT enter traffic AI or they start driving from their lot.
    if (!obj.infra && (obj.kind === 'car' || obj.kind === 'schoolbus' ||
        obj.kind === 'taxi' || obj.kind === 'convertible' ||
        obj.kind === 'fire_truck' || obj.kind === 'school_bus')) {
      return this.stepCar(obj, dtSec, player);
    }

    // nearest bigger threat
    const skittish = obj.kind === 'bird' || obj.kind === 'cat' || obj.kind === 'squirrel';
    let threat: { x: number; y: number } | null = null;
    let threatD = Infinity;
    for (const v of voids) {
      if (v.ghost) continue;
      if (!this.canEat(v.radius, obj.size)) continue;
      const d = dist(obj.x, obj.y, v.x, v.y);
      const isPlayer = (v as unknown) === player;
      // v8 §3: escalating world fear as the player's form grows.
      let radii: number;
      if (skittish) radii = 5;
      else if (obj.kind === 'person') radii = (isPlayer && player.formIndex >= 2) ? 5 : 3; // GOBBLER+: scream-flee from 5
      else radii = 4;
      // DEVOURER+: critters evacuate the whole visible block ahead of the player
      if (isPlayer && skittish && player.formIndex >= CONFIG.DEVOURER_FORM_INDEX) radii = 9;
      const range = v.radius * radii + (skittish ? 240 : 120);
      if (d < range && d < threatD) { threatD = d; threat = v; }
    }

    if (obj.kind === 'dog' && !threat) {
      // chase nearest duck
      let duck: WorldObject | null = null, dd = Infinity;
      for (const o of this.objects) {
        if (o.eaten || o.kind !== 'duck') continue;
        const d = dist(obj.x, obj.y, o.x, o.y);
        if (d < dd) { dd = d; duck = o; }
      }
      if (duck && dd < 260) {
        const a = Math.atan2(duck.y - obj.y, duck.x - obj.x);
        obj.vx = Math.cos(a) * CONFIG.DOG_SPEED;
        obj.vy = Math.sin(a) * CONFIG.DOG_SPEED;
        this.integrateWander(obj, dtSec);
        obj.fleeing = false;
        return;
      }
    }

    // v7 §3: delivery drone flies a path — roams waypoints across the whole map
    if (obj.kind === 'drone' && !threat) {
      if (dist(obj.x, obj.y, obj.homeX, obj.homeY) < 90) {
        // Alive Pack §A: pick a new waypoint that is on the island
        let nhx = MARGIN + Math.random() * (this.size - MARGIN * 2);
        let nhy = MARGIN + Math.random() * (this.size - MARGIN * 2);
        for (let wi = 0; wi < 6 && !isWalkable(nhx, nhy); wi++) {
          nhx = MARGIN + Math.random() * (this.size - MARGIN * 2);
          nhy = MARGIN + Math.random() * (this.size - MARGIN * 2);
        }
        obj.homeX = nhx;
        obj.homeY = nhy;
      }
      const a = Math.atan2(obj.homeY - obj.y, obj.homeX - obj.x);
      obj.vx = Math.cos(a) * CONFIG.DRONE_SPEED;
      obj.vy = Math.sin(a) * CONFIG.DRONE_SPEED;
      obj.fleeing = false;
      this.integrateWander(obj, dtSec);
      return;
    }

    const speed = this.moverSpeed(obj);
    const fleeSpeed = this.moverFleeSpeed(obj);

    if (threat) {
      const wasFleeing = obj.fleeing;
      obj.fleeing = true;
      // Panic bubbles: was gated to kind === 'person', but plain 'person' is
      // retired — every real pedestrian is person_* / skateboarder / etc., so
      // bubbles almost never fired and the crowd read as mute. Fixed + funnier.
      const isPed = obj.kind.startsWith('person') ||
        ['skateboarder', 'cyclist', 'waiter', 'icecream_vendor', 'tourist', 'zookeeper', 'soldier'].includes(obj.kind);
      if (isPed) {
        if (obj.alertT <= 0) obj.alertT = 900;
        // 1-in-2 panicking peds pop a speech bubble when they first start fleeing
        if (!wasFleeing && !obj.bubbleText && this.rand() < 0.5) {
          // Overnight: panic lines are BIOME-FLAVORED (beach panic on the
          // beach, HOA panic in the suburbs) with generic spice mixed in.
          const pool = this.rand() < 0.7
            ? (PANIC_BY_BIOME[this.biomeAt(obj.x, obj.y)] ?? PANIC_BY_BIOME.other)
            : PANIC_BY_BIOME.other;
          obj.bubbleText = pool[Math.floor(this.rand() * pool.length)];
          obj.bubbleLife = 2600;
        }
      }
      const a = Math.atan2(obj.y - threat.y, obj.x - threat.x);
      obj.vx = Math.cos(a) * fleeSpeed;
      obj.vy = Math.sin(a) * fleeSpeed;
    } else {
      obj.fleeing = false;
      // wander around home within tether
      obj.wanderAngle += (Math.random() - 0.5) * 2 * dtSec;
      const hx = obj.homeX - obj.x, hy = obj.homeY - obj.y;
      const hd = Math.hypot(hx, hy);
      if (hd > obj.tether) {
        obj.wanderAngle = Math.atan2(hy, hx);
      }
      obj.vx = Math.cos(obj.wanderAngle) * speed;
      obj.vy = Math.sin(obj.wanderAngle) * speed;
    }
    // Terrain avoidance: turn pedestrians away from water AND building lots
    // before integrating. First-timer audit: wandering critters were climbing
    // onto rooftops (snail-on-roof with the eat ring around it).
    if (!obj.fleeing && obj.living) {
      const nx = obj.x + obj.vx * dtSec;
      const ny = obj.y + obj.vy * dtSec;
      if (getTerrainAt(nx, ny) === TERRAIN.WATER || !this.clearOfLotsFast(nx, ny)) {
        obj.wanderAngle += Math.PI + (Math.random() - 0.5) * 0.8; // reverse + wobble
        obj.vx = Math.cos(obj.wanderAngle) * speed;
        obj.vy = Math.sin(obj.wanderAngle) * speed;
      }
    }
    this.integrateWander(obj, dtSec);
  }

  private moverSpeed(obj: WorldObject) {
    switch (obj.kind) {
      case 'duck': return CONFIG.DUCK_SPEED;
      case 'bird': return CONFIG.BIRD_SPEED;
      case 'cat': case 'squirrel': return CONFIG.CRITTER_SPEED;
      case 'drone': return CONFIG.DRONE_SPEED;
      case 'mower': return CONFIG.MOWER_SPEED;
      default: return CONFIG.PERSON_SPEED;
    }
  }

  private moverFleeSpeed(obj: WorldObject) {
    switch (obj.kind) {
      case 'duck': return CONFIG.DUCK_SPEED * 2;
      case 'bird': return CONFIG.BIRD_FLEE_SPEED;
      case 'cat': case 'squirrel': return CONFIG.CRITTER_FLEE_SPEED;
      case 'drone': return CONFIG.DRONE_SPEED * 1.3;
      default: return CONFIG.PERSON_FLEE_SPEED;
    }
  }

  private integrateWander(obj: WorldObject, dtSec: number) {
    obj.x = clamp(obj.x + obj.vx * dtSec, obj.size, this.size - obj.size);
    obj.y = clamp(obj.y + obj.vy * dtSec, obj.size, this.size - obj.size);
    // Rebuild Prompt 16: hard clamp to an optional pen/bounds rectangle.
    if (obj.pen) {
      obj.x = clamp(obj.x, obj.pen.x0 + obj.size, obj.pen.x1 - obj.size);
      obj.y = clamp(obj.y, obj.pen.y0 + obj.size, obj.pen.y1 - obj.size);
    }
  }

  private stepCar(obj: WorldObject, dtSec: number, player: Player) {
    const dp = dist(obj.x, obj.y, player.x, player.y);
    const playerBigger = this.canEat(player.radius, obj.size);
    let speed = obj.kind === 'schoolbus' ? CONFIG.BUS_SPEED
      : obj.kind === 'runner' ? 74   // marathon pace — they NEVER stop running
      : CONFIG.CAR_SPEED;
    // Overnight gag: threatened runners just... run faster. Cardio saves lives.
    if (obj.kind === 'runner' && playerBigger && dp < 420) speed *= 1.7;

    if (obj.honkCd > 0) obj.honkCd -= dtSec * 1000;
    if (!playerBigger && dp < 240 && obj.honkCd <= 0 && !player.ghost) {
      audio.playHonk();
      obj.honkCd = 2200;
    } else if (player.formIndex >= CONFIG.DEVOURER_FORM_INDEX && dp < player.radius * 4 && obj.honkCd <= 0 && !player.ghost) {
      // v8 §3: DEVOURER+ sets off 2-note car alarms as it looms past
      audio.carAlarm();
      obj.honkCd = 2600;
    }
    if (playerBigger && dp < 300 && !player.ghost) {
      // flee: reverse direction away from the player along the road
      speed = CONFIG.CAR_FLEE_SPEED;
      obj.fleeing = true;
      if (obj.roadAxis === 'h') obj.roadDir = player.x > obj.x ? -1 : 1;
      else obj.roadDir = player.y > obj.y ? -1 : 1;
    } else {
      obj.fleeing = false;
    }

    // Phase 4 §4: junction turning — cars can turn at road intersections.
    // Uses wanderAngle (unused for cars) as a per-junction cooldown to prevent rapid oscillation.
    if (!obj.fleeing) {
      const TURN_ZONE = 55; // px radius from junction center
      for (const rc of ROAD_CENTERS) {
        if (obj.roadAxis === 'h') {
          // Horizontal car — can turn onto vertical road at x=rc
          if (Math.abs(obj.x - rc) < TURN_ZONE && obj.wanderAngle <= 0) {
            if (Math.random() < 0.022) { // ~22% per junction crossing
              obj.roadAxis = 'v';
              obj.homeX = rc;
              obj.x = rc; // snap to road center
              obj.roadDir = Math.random() < 0.5 ? 1 : -1;
              obj.wanderAngle = 3.5; // 3.5s cooldown before next turn
              break;
            }
          }
        } else {
          // Vertical car — can turn onto horizontal road at y=rc
          if (Math.abs(obj.y - rc) < TURN_ZONE && obj.wanderAngle <= 0) {
            if (Math.random() < 0.022) {
              obj.roadAxis = 'h';
              obj.homeY = rc;
              obj.y = rc; // snap to road center
              obj.roadDir = Math.random() < 0.5 ? 1 : -1;
              obj.wanderAngle = 3.5;
              break;
            }
          }
        }
      }
      if (obj.wanderAngle > 0) obj.wanderAngle -= dtSec;
    }

    if (obj.roadAxis === 'h') {
      const nx = obj.x + obj.roadDir * speed * dtSec;
      // Alive Pack §A: reverse at the island rim (cliff edge), not just the map rect
      if (!isWalkable(nx, obj.y)) { obj.roadDir *= -1; }
      else { obj.x = nx; }
      obj.y = obj.homeY;
      if (obj.x < MARGIN) { obj.x = MARGIN; obj.roadDir = 1; }
      else if (obj.x > this.size - MARGIN) { obj.x = this.size - MARGIN; obj.roadDir = -1; }
    } else {
      const ny = obj.y + obj.roadDir * speed * dtSec;
      if (!isWalkable(obj.x, ny)) { obj.roadDir *= -1; }
      else { obj.y = ny; }
      obj.x = obj.homeX;
      if (obj.y < MARGIN) { obj.y = MARGIN; obj.roadDir = 1; }
      else if (obj.y > this.size - MARGIN) { obj.y = this.size - MARGIN; obj.roadDir = -1; }
    }
  }

  private spawnEdge() {
    const edge = Math.floor(this.rand() * 4);
    const m = CONFIG.MAP_SIZE;
    let x = 0, y = 0;
    const t = MARGIN + this.rand() * (m - MARGIN * 2);
    if (edge === 0) { x = t; y = MARGIN * 0.5; }
    else if (edge === 1) { x = t; y = m - MARGIN * 0.5; }
    else if (edge === 2) { x = MARGIN * 0.5; y = t; }
    else { x = m - MARGIN * 0.5; y = t; }
    this.makeObj(pick(['flower', 'flowerpot', 'apple', 'mailbox', 'hydrant'] as ObjectKind[], this.rand), x, y); // v9 §8: no gnomes on respawn
  }

  private consumeByPlayer(obj: WorldObject, player: Player, fx: FXManager) {
    obj.eaten = true;
    // Prompt 5: scenery is bonus food — never part of the % devoured numerator.
    if (!obj.scenery) this.eatenArea += Math.PI * obj.baseSize * obj.baseSize;
    this.playerStats.count++;
    if (obj.kind === 'duck') this.playerStats.ducks++;
    this.playerStats.maxTier = Math.max(this.playerStats.maxTier, obj.tier);
    // v9 §8: secret — eat EVERY gnome in one round to become GNOME LORD
    if (obj.kind === 'gnome') {
      this.playerStats.gnomes++;
      if (!this.gnomeLordPending && this.gnomeTotal > 0 && this.playerStats.gnomes >= this.gnomeTotal) {
        this.gnomeLordPending = true;
      }
    }
    // v16 §5: contract progress counters
    const HOUSE_KINDS: ObjectKind[] = ['house', 'house_c', 'house_d'];
    const CAR_KINDS: ObjectKind[] = ['car', 'car_parked_a', 'car_parked_b', 'schoolbus', 'jeep',
      'taxi', 'police_car', 'school_bus', 'fire_truck', 'convertible', 'army_jeep'];
    const BEACH_KINDS: ObjectKind[] = ['palm', 'umbrella', 'sandcastle', 'surfboard', 'lifeguard', 'towel', 'crab', 'seashell', 'kayak'];
    const DOWNTOWN_KINDS: ObjectKind[] = ['shop', 'office', 'skyscraper', 'cafe', 'library'];
    const PEOPLE_KINDS: ObjectKind[] = [
      'person', 'soldier', 'zookeeper',
      'person_biz', 'person_jog', 'person_kid', 'person_granny', 'person_fish',
      'person_sun', 'person_guard', 'person_dog', 'person_const',
      // Life Pack §1: people2
      'person_mom', 'person_dad', 'skateboarder', 'cyclist', 'waiter',
      'icecream_vendor', 'person_jog2', 'person_elderly', 'tourist',
      // Life Pack §3: vignette anchors count as people for contracts
      'vig_proposal', 'vig_soccer', 'vig_wedding', 'vig_couple', 'vig_busker',
      'vig_painter', 'vig_selfie', 'vig_kite', 'vig_gardener',
    ];
    if (HOUSE_KINDS.includes(obj.kind)) this.playerStats.houses++;
    if (CAR_KINDS.includes(obj.kind)) this.playerStats.cars++;
    if (PEOPLE_KINDS.includes(obj.kind)) this.playerStats.people++;
    if (BEACH_KINDS.includes(obj.kind)) this.playerStats.beachItems++;
    if (DOWNTOWN_KINDS.includes(obj.kind)) this.playerStats.downtownItems++;

    // v16.1 D: zooSmashed triggers only when the zoo gate is eaten
    if (obj.kind === 'zoo_gate') this.zooSmashed = true;
    // v16.1 C: townhallEaten triggers on the townhall landmark object
    const blockType = this.blockTypeAt(obj.x, obj.y);
    if (blockType === 'townhall' || (blockType === 'civic' && obj.kind === 'townhall')) this.townhallEaten = true;

    // Life Pack §3: vignette eaten banner (scoreMult=2 already in KIND_INFO for 2× pts)
    if (obj.vignetteData) this.eatenVignetteBanners.push(obj.vignetteData.eatenBanner);

    // reaction flavor
    if (obj.kind === 'zoo_gate') {
      // v16.1 D: zoo gate smashed — big celebration shake + ring
      fx.shake(400, 18, 30);
      fx.addRing(obj.x, obj.y, '#8FE36B', 20, obj.baseSize * 4, 12, 900);
      fx.addDebris(obj.x, obj.y, '#8FE36B', 8);
      fx.addDebris(obj.x, obj.y, '#FFD23F', 4);
    } else if (obj.kind === 'house' || obj.kind === 'house_c' || obj.kind === 'house_d') {
      fx.shake(120, 2, 3); // Feel Patch §6: light shake on house eat (was 300ms/10px)
      fx.addDebris(obj.x, obj.y, '#C4736B', 4);
      fx.addDebris(obj.x, obj.y, '#F6E7B0', 2);
    } else if (obj.kind === 'skyscraper' || obj.kind === 'landmark') {
      if (obj.kind === 'landmark') this.eatenVignetteBanners.push('🏛️ CITY LANDMARK: DEVOURED');
      // v12 §1: skyscraper collapse — 3 shake pulses, debris shower, twin rings
      fx.shake(130, 18, [0, 160, 320]);
      fx.addDebris(obj.x, obj.y, '#5A8AB0', 8);
      fx.addDebris(obj.x, obj.y, '#BFEAFF', 5);
      fx.addDebris(obj.x, obj.y, '#1A3040', 4);
      fx.addRing(obj.x, obj.y, '#5AC8FF', 18, obj.baseSize * 3.2, 8, 750);
      fx.addRing(obj.x, obj.y, '#FFD23F', 10, obj.baseSize * 2, 5, 500);
    } else if (obj.kind === 'train') {
      // Structural Build: devouring the express is a marquee moment
      fx.shake(320, 16, [0, 140, 280]);
      fx.addDebris(obj.x, obj.y, '#E4586B', 8);
      fx.addDebris(obj.x, obj.y, '#5FA8E0', 6);
      fx.addDebris(obj.x, obj.y, '#DCE3EE', 6);
      fx.addRing(obj.x, obj.y, '#DCE3EE', 20, obj.baseSize * 4, 10, 800);
      this.eatenVignetteBanners.push('🚆 EXPRESS LINE: DEVOURED');
      this.trainRespawnT = CONFIG.TRAIN_RESPAWN_MS;
    } else if (obj.kind === 'person') {
      fx.addCrumbs(obj.x, obj.y - obj.baseSize * 0.4, '#FF6FB0', 4); // hat pops off
    } else {
      fx.addCrumbs(obj.x, obj.y, CONFIG.COLORS.tierTint[obj.tier - 1] || '#FFF', 6);
    }
    fx.addRing(obj.x, obj.y, '#FFFFFF', obj.baseSize * 0.6, 220, 3, 300);

    // Feel Patch §2: T2+ eats scatter 2 debris bits
    if (obj.tier >= 2 && obj.kind !== 'bit') {
      const count = obj.tier >= 4 ? 3 : 2;
      for (let b = 0; b < count; b++) this.spawnBit(obj.x, obj.y, obj.variant ?? b);
    }

    // v8 §3 + v16.2 §5: every T3+ object eaten leaves a persistent scar for the whole round
    if (obj.tier >= 3) {
      const r = obj.baseSize * (obj.kind === 'house' ? 0.9 : 0.55);
      this.dirt.push({ x: obj.x, y: obj.y, r, life: 1e9, maxLife: 1e9,
        rot: this.rand() * Math.PI * 2, drawScale: 0.7 + this.rand() * 0.6 });
    }

    player.absorbObject(obj);

    // Feedback Juice §1: cosmetic swallow ghost pulled into the void (display only)
    if (obj.kind !== 'bit') this.spawnSwallowGhost(obj, player.x, player.y);

    if (obj.kind === 'watertower') {
      player.pendingFx.push({ type: 'finale', x: obj.x, y: obj.y });
    }
    if (obj.kind === 'zoo_gate') {
      player.pendingFx.push({ type: 'zoo_break', x: obj.x, y: obj.y }); // v16.1 D: ZOO BREAK! banner
    }
  }

  // Prompt 3: resolve the objectSprites draw key for a grounded structure,
  // honouring the clay-art variety pools. Houses draw from the random clay pool
  // (legacy house_a/house_b/procedural when the clay sheet is absent); skyscraper
  // lots draw from the 3-tower clay pool. Everything else uses its kind key.
  private structureSpriteKey(kind: ObjectKind, id: number, sceneryKey?: string): string | null {
    const k = this.structureSpriteKeyRaw(kind, id, sceneryKey);
    return k ? (SPRITE_REDIRECT[k] ?? k) : k;
  }

  private structureSpriteKeyRaw(kind: ObjectKind, id: number, sceneryKey?: string): string | null {
    // Prompt 5: scenery carries its own explicit clay draw key.
    if (sceneryKey) return sceneryKey;
    // Map Rebuild: cozy district ('house','house_c') → cottage sprites (rows 2-3);
    // fancy district ('house_d') → townhouse/villa sprites (rows 0-1).
    if (kind === 'house' || kind === 'house_c') {
      if (clayHouseCottageKeys.length) return clayHouseCottageKeys[id % clayHouseCottageKeys.length];
      if (clayHouseKeys.length) return clayHouseKeys[id % clayHouseKeys.length];
      return null; // Stage 13 §6: no legacy sticker fallback — procedural draws instead
    }
    if (kind === 'house_d') {
      if (clayHouseFancyKeys.length) return clayHouseFancyKeys[id % clayHouseFancyKeys.length];
      if (clayHouseKeys.length) return clayHouseKeys[id % clayHouseKeys.length];
      return null;
    }
    // Structural Rebuild: downtown resolves to the NEW wide city buildings —
    // the 4 needle-skyscraper era is over. Offices share the pool (varied city).
    if (kind === 'skyscraper' || kind === 'office') {
      if (cityBuildingKeys.length) return cityBuildingKeys[id % cityBuildingKeys.length];
      if (kind === 'skyscraper' && claySkyscraperKeys.length) return claySkyscraperKeys[id % claySkyscraperKeys.length];
    }
    if (kind === 'landmark') {
      return cityLandmarkKeys.length ? cityLandmarkKeys[id % cityLandmarkKeys.length] : null;
    }
    // hole.io rebuild: the LIFE LAYER is procedural now (props3d) — crisp
    // flat-shaded minifigs, vehicles, and vegetation in the same language as
    // the extruded buildings. Visual only; contact radius stays kind-keyed.
    if (CLAY_PERSON_KIND_SET.has(kind)) {
      // stable special outfits, everyday palette for the rest
      switch (kind) {
        case 'waiter':          return 'p3d_person_8';
        case 'icecream_vendor': return 'p3d_person_9';
        case 'person_guard':    return 'p3d_person_10';
        case 'person_const':    return 'p3d_person_11';
        default:                return `p3d_person_${id % 8}`;
      }
    }
    if (kind === 'soldier' || kind === 'zookeeper') return 'p3d_person_10';
    if (CLAY_VEHICLE_KIND_SET.has(kind)) {
      switch (kind) {
        case 'taxi':        return 'p3d_taxi';
        case 'fire_truck':  return 'p3d_firetruck';
        case 'schoolbus':
        case 'school_bus':  return 'p3d_schoolbus';
        default:            return `p3d_veh_${id % 5}`;
      }
    }
    if (kind === 'tree') {
      const TREES = ['p3d_tree_0', 'p3d_tree_1', 'p3d_tree_2', 'p3d_tree_3', 'p3d_pine_0', 'p3d_pine_1'];
      return TREES[id % TREES.length];
    }
    if (kind === 'bush') return `p3d_bush_${id % 2}`;
    if (kind === 'flower' && clayFlowerKeys.length) return clayFlowerKeys[id % clayFlowerKeys.length];
    // Prompt 9: bonus food + street furniture render from the clay food pool
    // (visual only; contact radius + win-math exclusion stay keyed off the kind).
    if (clayFoodKeys.length) {
      if (kind === 'apple' && clayAppleVarietyKeys.length) {
        return clayAppleVarietyKeys[id % clayAppleVarietyKeys.length];
      }
      const cell = CLAY_FOOD_CELL[kind];
      if (cell !== undefined && clayFoodKeys[cell]) return clayFoodKeys[cell];
    }
    // Skins round: zoo animals are procedural now (animals3d) — no more
    // photographic clay cutouts wobbling around the pens.
    if (ZOO_KINDS.includes(kind)) return `a3d_${kind}`;
    // Prompt 16: airport set renders from the clay airport pool.
    if (clayAirportKeys.length) {
      const idx = AIRPORT_KINDS.indexOf(kind);
      if (idx >= 0 && clayAirportKeys[idx]) return clayAirportKeys[idx];
    }
    // Final de-clay: the toy army is procedural now.
    switch (kind) {
      case 'tank':            return 'p3d2_tank';
      case 'attack_heli':     return 'p3d2_heli';
      case 'missile_truck':   return 'p3d2_missile_truck';
      case 'radar_van':       return 'p3d2_radar_van';
      case 'army_jeep':       return 'p3d2_jeep';
      case 'armored_humvee':  return 'p3d2_humvee';
      case 'police_car':      return 'p3d_police';
      default: break;
    }
    // Prompt 16: toy army (defense units) render from the clay military pool.
    if (clayMilitaryKeys.length) {
      const idx = MILITARY_KINDS.indexOf(kind);
      if (idx >= 0 && clayMilitaryKeys[idx]) return clayMilitaryKeys[idx];
    }
    // ── Prompt 18 Stage 1: universal clay mapping ─────────────────────────────
    // Every legacy sticker kind that used to fall through to `return kind`
    // (drawing from beachpark/civic/playground/vignettes sheets) now resolves
    // to the nearest clay_park_* or clay_beach_* key instead.
    //
    // Clay park sheet index (4×4, clay_park_0..15):
    //  0=slide  1=swingset  2=gazebo  3=bench  4=picnic-table  5=soccer-goal
    //  6=pond  7=lamp  8=picnic-table-2  9=soccer-goal-2  10=pond-2
    //  11=lamp-2  12=planter  13=seesaw  14=ice-cream-cart  15=fountain
    //
    // Clay beach sheet index (3×4, clay_beach_0..11):
    //  0=umbrella  1=towel  2=lifeguard-tower  3=palms  4=rowboat  5=beach-ball
    //  6=sandcastle-sm  7=sandcastle-lg  8=surfboard  9=kiddie-pool  10=pier  11=deck-chairs
    switch (kind) {
      // ── Park props → clay_park_* ─────────────────────────────────────────
      case 'bench':        return 'clay_park_3';
      case 'fountain':     return 'clay_park_15';
      case 'cafetable':    return 'clay_park_4';
      case 'foodcart':     return 'clay_park_14';
      case 'icecream_cart':return 'clay_park_14';
      case 'icecream':     return 'clay_park_14';
      case 'birdbath':     return 'clay_park_12';  // planter stand-in
      case 'shed':         return 'clay_park_2';   // gazebo stand-in (closest enclosed structure)
      case 'gazebo':       return 'clay_park_2';
      case 'watertower':   return 'p3d_watertower'; // hole.io rebuild: real procedural tower
      case 'slide':        return 'clay_park_0';
      case 'swingset':     return 'clay_park_1';
      case 'trampoline':   return 'clay_park_1';   // swing stand-in (closest bouncy thing)
      case 'hoop':         return 'clay_park_5';   // soccer goal stand-in
      case 'seesaw':       return 'clay_park_13';
      case 'sandbox':      return 'clay_park_12';  // planter stand-in
      case 'picnic_table': return 'clay_park_8';
      case 'bbq':          return 'clay_park_4';   // picnic table stand-in
      case 'mower':        return 'clay_park_12';  // planter stand-in
      case 'bike':         return 'clay_park_12';  // planter stand-in; no clay bike
      case 'scooter':      return 'clay_park_12';  // planter stand-in; no clay scooter
      case 'drone':        return 'clay_park_7';   // lamp stand-in (small aerial prop)
      case 'streetlamp':   return 'clay_park_7';   // Stage 4 street furniture
      case 'bus_stop':     return 'clay_park_11';  // lamp-2 stand-in
      // ── Playground equipment → clay_park_* ──────────────────────────────
      case 'pg_swing':        return 'clay_park_1';
      case 'pg_slide':        return 'clay_park_0';
      case 'pg_seesaw':       return 'clay_park_13';
      case 'pg_sandbox':      return 'clay_park_12';
      case 'pg_soccergoal':   return 'clay_park_5';
      case 'pg_soccerball':   return 'clay_park_12'; // small planter stand-in
      case 'pg_hoop':         return 'clay_park_5';
      case 'pg_trampoline':   return 'clay_park_1';
      case 'pg_merrygoround': return 'clay_park_11'; // lamp-2 round structure stand-in
      // ── Beach props → clay_beach_* ──────────────────────────────────────
      case 'umbrella':   return 'clay_beach_0';
      case 'towel':      return 'clay_beach_1';
      case 'lifeguard':  return 'clay_beach_2';
      case 'surfboard':  return 'clay_beach_8';
      case 'sandcastle': return 'clay_beach_6';
      case 'crab':       return 'clay_beach_5';   // beach ball stand-in (small critter)
      case 'seashell':   return 'clay_beach_5';   // beach ball stand-in
      case 'kayak':      return 'clay_beach_4';   // rowboat stand-in
      case 'rowboat':    return 'clay_beach_4';
      case 'cooler':     return 'clay_beach_11';  // deck chairs stand-in
      case 'kite_prop':  return 'clay_beach_5';   // beach ball stand-in (light, colourful)
      // ── Beach palm → clay_beach_3 (palm cutout on beach sheet) ─────────────
      case 'palm': return 'p3d_palm'; // hole.io rebuild: procedural palm
      // ── Vehicles: car_parked_a/b and civilian jeep → clay vehicle pool ──────
      // Fallback to clay_park_12 (planter) if the sheet hasn't loaded yet.
      case 'car_parked_a':
      case 'car_parked_b':
      case 'jeep':
        return `p3d_veh_${id % 5}`; // hole.io rebuild: procedural traffic
      // ── Structural Build: beach-fun props → existing clay cutouts ──────────
      case 'beachball': return 'clay_beach_5';
      case 'deckchair': return 'clay_beach_11';
      // ── Critters: no clay cutout — draw procedurally (coloured blobs, still eatable) ──
      case 'dog':      return 'a3d_dog';
      case 'cat':      return 'a3d_cat';
      case 'duck':     return 'a3d_duck';
      case 'squirrel': return 'a3d_squirrel';
      case 'bird':     return 'a3d_bird';
      case 'crab':     return 'a3d_crab';
      case 'train': // Structural Build: bespoke multi-segment procedural draw
      case 'tent':      // Structural Build: procedural camp props
      case 'campfire':
        return null;
      // ── Vignette anchors → clay people pool; fallback to clay_park_4 ────────
      case 'vig_proposal': case 'vig_soccer': case 'vig_wedding': case 'vig_couple':
      case 'vig_busker':   case 'vig_painter': case 'vig_selfie':  case 'vig_kite':
      case 'vig_gardener': case 'vig_golf':    case 'vig_mayor':   case 'vig_school':
      case 'vig_yoga':
        return `p3d_person_${id % 8}`; // hole.io rebuild: procedural minifigs
      // ── Zoo structures (not animals — they're covered by ZOO_KINDS above) ────
      case 'zoo_gate':  return 'clay_park_2';   // gazebo stand-in for arched gate
      case 'zoo_wall':  return 'clay_park_12';  // planter stand-in
      // ── Non-defense soldier (static, not clay-army) → people pool ────────────
      default: break;
    }
    return kind;
  }

  // Feedback Juice §1: spawn a cosmetic swallow ghost at the eaten object's spot.
  // Copies the object's CURRENT sprite; eases into the void over 0.30–0.45s.
  private spawnSwallowGhost(obj: WorldObject, cx: number, cy: number) {
    let g: SwallowGhost | undefined;
    for (const s of this.swallowGhosts) { if (!s.active) { g = s; break; } }
    if (!g) return; // cap hit — skip rather than allocate / drop frames
    // resolve sprite key the same way drawOne does
    const spriteKey = this.structureSpriteKey(obj.kind, obj.id, obj.sceneryKey);
    g.active = true;
    g.kind = obj.kind;
    g.spriteKey = spriteKey && objectSprites.has(spriteKey) ? spriteKey : null;
    g.x0 = g.x = obj.x;
    g.y0 = g.y = obj.y;
    g.cx = cx; g.cy = cy;
    g.size = obj.baseSize;
    g.rot = 0;
    g.t = 0;
    g.dur = 300 + Math.random() * 150; // 0.30–0.45s
  }

  // Feedback Juice §1: draw a swallow ghost — scale→0, sink, spin, fade near end.
  private drawSwallowGhost(ctx: CanvasRenderingContext2D, g: SwallowGhost, t: number) {
    const p = g.t / g.dur;                 // 0→1
    const scale = 1 - p;                    // scale toward zero
    if (scale < 0.02) return;
    const alpha = p < 0.6 ? 1 : Math.max(0, 1 - (p - 0.6) / 0.4); // fade near the end
    const sink = p * g.size * 0.5;          // downward sink (pulled into the void)
    const r = g.size;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(g.x, g.y + sink);
    ctx.rotate(g.rot);
    ctx.scale(scale, scale);
    if (g.spriteKey) {
      const sprite = objectSprites.get(g.spriteKey)!;
      const bn = spriteBounds.get(g.spriteKey) ?? { x: 0, y: 0, w: 1, h: 1 };
      const imgW = sprite instanceof HTMLImageElement ? sprite.naturalWidth : sprite.width;
      const imgH = sprite instanceof HTMLImageElement ? sprite.naturalHeight : sprite.height;
      ctx.drawImage(sprite, bn.x * imgW, bn.y * imgH, bn.w * imgW, bn.h * imgH, -r, -r * 2, r * 2, r * 2);
    } else {
      drawParkObject(ctx, g.kind, r, { t });
    }
    ctx.restore();
  }

  // Feel Patch §2: spawn a debris bit at (x,y) with a random scatter impulse
  private spawnBit(x: number, y: number, variant: number) {
    const r = 4 + Math.random() * 3;
    const ang = Math.random() * Math.PI * 2;
    const spd = 25 + Math.random() * 55;
    const bit: WorldObject = {
      id: this.nextId++,
      kind: 'bit',
      tier: 0,
      x: x + Math.cos(ang) * (r + 6),
      y: y + Math.sin(ang) * (r + 6),
      baseSize: r,
      size: r,
      variant: Math.abs(variant) % 6,
      eaten: false,
      wobble: Math.random() * Math.PI * 2,
      fleeing: false,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      living: false,
      homeX: x,
      homeY: y,
      wanderAngle: ang,
      tether: 0,
      roadAxis: 'h',
      roadDir: 1,
      honkCd: 0,
      captured: false,
      captureScale: 1,
      captureRot: 0,
      shadowX: 0,
      shadowY: 0,
      alertT: 0,
      golden: false,
      arrive: 0,
      contactRadius: r * 0.85,
      infra: false,
      bubbleText: null,
      bubbleLife: 0,
      shakeT: 0,
    };
    this.objects.push(bit);
    // Note: NOT added to totalStartArea — bits are ephemeral debris, not population
  }

  // v9 §4: draw the drifting torn-loose ground chunks out in space
  private drawSpaceChunks(ctx: CanvasRenderingContext2D, view: { x: number; y: number; w: number; h: number }, t: number) {
    for (const c of this.spaceChunks) {
      const drift = (t * 0.004) % 220;          // slow outward drift, wraps every ~55s
      const x = c.bx + c.ox * drift, y = c.by + c.oy * drift;
      if (x < view.x - 60 || x > view.x + view.w + 60 || y < view.y - 60 || y > view.y + view.h + 60) continue;
      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.translate(x, y);
      ctx.rotate(c.ang + t * c.spin);
      drawChunk(ctx, c.type, c.s);
      ctx.restore();
    }
  }

  // ── ground + decor (drawn before objects, under the world transform) ──
  drawGround(ctx: CanvasRenderingContext2D, view: { x: number; y: number; w: number; h: number }, t = 0, px = 0, py = 0, camZoom = 0.15) {
    const G = CONFIG.COLORS.ground;
    const S = this.size;

    // Phase 2 §3: hand-painted floating island replaces tile grid
    // Layer order: space bg → space chunks → drift objects → island painting
    drawSpaceBg(ctx, view, px, py);
    drawStars(ctx, view); // procedural star overlay adds depth on top of space bg
    this.drawSpaceChunks(ctx, view, t);
    drawDriftObjects(ctx);
    drawIsland(ctx, t, camZoom, view); // Phase 4: vector ground; Prompt 20: pass view for live-clip path

    // Life Pack §2 + Prompt 19 Stage 6: sports field lines are baked into the
    // static ground cache by drawMap._paintStaticGround via setMatchSportsFields.
    // The old sprite-sticker draw path is retired — no field_soccer image required.

    // Devour scars — VOID scars, not brown dirt: a dark violet pool with a faint
    // luminous rim, so eaten ground reads as "reality bitten by the void" and the
    // map stays crisp instead of muddying with brown blobs.
    for (const d of this.dirt) {
      const a = clamp(d.life / d.maxLife, 0, 1) * 0.5;
      if (a < 0.01) continue;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(d.x, d.y);
      ctx.rotate(d.rot ?? 0);
      const rx = d.r, ry = d.r * 0.7;
      ctx.fillStyle = 'rgba(26,16,54,0.85)';
      ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(150,110,255,0.35)';
      ctx.lineWidth = Math.max(1.5, d.r * 0.08);
      ctx.beginPath(); ctx.ellipse(0, 0, rx * 0.96, ry * 0.96, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }

    // v9 §3 + v16.2 §5: fissure trail — multiply-blend decal when loaded, else violet polyline
    const fissA = fxDecals.get('fissure_a'), fissB = fxDecals.get('fissure_b');
    if (fissA && fissB) {
      // decal path: one stamp per FissureDecal entry, white bg → invisible via multiply
      for (const fd of this.fissureDecals) {
        const lifeNorm = clamp(fd.life / fd.maxLife, 0, 1);
        const alpha = lifeNorm * 0.85;
        if (alpha < 0.01) continue;
        const img = fd.idx === 0 ? fissA : fissB;
        const s = fd.size * fd.scale;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.globalCompositeOperation = 'multiply';
        ctx.translate(fd.x, fd.y);
        ctx.rotate(fd.rot);
        ctx.drawImage(img, -s / 2, -s / 2, s, s);
        ctx.globalCompositeOperation = 'source-over';
        ctx.restore();
      }
    } else {
      // Fix 5: smooth dark violet void fill — no black scribbles
      for (const f of this.fissures) {
        const a = clamp(f.life / f.maxLife, 0, 1);
        if (a < 0.01) continue;
        ctx.save();
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath();
        for (let k = 0; k < f.pts.length; k++) {
          const [fpx, fpy] = f.pts[k];
          if (k === 0) ctx.moveTo(fpx, fpy); else ctx.lineTo(fpx, fpy);
        }
        // Purple edge glow
        ctx.globalAlpha = a * 0.5;
        ctx.shadowColor = '#7B3FE4'; ctx.shadowBlur = 18;
        ctx.strokeStyle = '#7B3FE4'; ctx.lineWidth = 20; ctx.stroke();
        // Dark violet void fill
        ctx.shadowBlur = 0;
        ctx.globalAlpha = a * 0.9;
        ctx.strokeStyle = '#1A0840'; ctx.lineWidth = 10; ctx.stroke();
        // Bright inner seam
        ctx.globalAlpha = a * 0.55;
        ctx.strokeStyle = '#C27BFF'; ctx.lineWidth = 2; ctx.stroke();
        ctx.restore();
      }
    }
  }

  // ── v5 §3: ground-dressing layer (between ground and objects) ──
  drawDressing(ctx: CanvasRenderingContext2D, view: { x: number; y: number; w: number; h: number }, t = 0, zoom = 1) {
    const inset = CONFIG.SIDEWALK;
    const inView = (x: number, y: number, pad = 20) =>
      x >= view.x - pad && x <= view.x + view.w + pad && y >= view.y - pad && y <= view.y + view.h + pad;

    // mowing stripes (±3% lightness, ~90px bands) on grass blocks
    for (const b of this.blocks) {
      if ((b as any).paved) continue;
      if (b.x0 + CONFIG.BLOCK_SIZE < view.x || b.x0 > view.x + view.w) continue;
      if (b.y0 + CONFIG.BLOCK_SIZE < view.y || b.y0 > view.y + view.h) continue;
      const ix = b.x0 + inset, iy = b.y0 + inset;
      const iw = CONFIG.BLOCK_SIZE - inset * 2, ih = CONFIG.BLOCK_SIZE - inset * 2;
      ctx.save();
      ctx.beginPath(); ctx.rect(ix, iy, iw, ih); ctx.clip();
      const band = 90;
      let k = 0;
      for (let sy = iy; sy < iy + ih; sy += band, k++) {
        ctx.fillStyle = k % 2 === 0 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
        ctx.fillRect(ix, sy, iw, band);
      }
      ctx.restore();
    }

    // road crosswalks at intersections + curb grime
    ctx.save();
    for (const cx of ROAD_CENTERS) {
      for (const cy of ROAD_CENTERS) {
        if (!inView(cx, cy, CONFIG.ROAD_WIDTH)) continue;
        const half = CONFIG.ROAD_WIDTH / 2;
        ctx.fillStyle = 'rgba(255,255,255,0.28)';
        // stripes on the four approaches
        for (let i = -2; i <= 2; i++) {
          const off = i * 14;
          ctx.fillRect(cx - half, cy - half - 20, 8, 16); // north approach column
          ctx.fillRect(cx + off - 4, cy - half - 22, 8, 16);
          ctx.fillRect(cx + off - 4, cy + half + 6, 8, 16);
          ctx.fillRect(cx - half - 22, cy + off - 4, 16, 8);
          ctx.fillRect(cx + half + 6, cy + off - 4, 16, 8);
        }
      }
    }
    ctx.restore();

    // manholes on the roads
    for (const m of this.dressManholes) {
      if (!inView(m.x, m.y)) continue;
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.beginPath(); ctx.arc(m.x, m.y, 12, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(m.x, m.y, 8, 0, Math.PI * 2); ctx.stroke();
    }

    // Prompt 14 Stage 3: picket fence + corner hedge draw loops removed.

    // welcome mats + stepping stones at house doors
    for (const m of this.dressMats) {
      if (!inView(m.x, m.y, 40)) continue;
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#B98A5E';
      roundRect(ctx, m.x - 16, m.y - 7, 32, 14, 4);
      ctx.fill();
      ctx.fillStyle = 'rgba(240,235,225,0.55)';
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.ellipse(m.x - 18 + i * 18, m.y + 22 + i * 12, 9, 6, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // Prompt 14 Stage 3: grass tuft + sand speckle draw loop removed — textures own the surface.

    // v16.1 B2: paved dressing — drain grates, arrows, leaf litter, concrete planters
    for (const p of this.dressPaved) {
      if (!inView(p.x, p.y, 30)) continue;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.scale(p.s, p.s);
      if (p.kind === 'grate') {
        // Drain grate: dark circle with grid
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.lineWidth = 1.2;
        for (let g = -6; g <= 6; g += 4) {
          ctx.beginPath(); ctx.moveTo(g, -9); ctx.lineTo(g, 9); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(-9, g); ctx.lineTo(9, g); ctx.stroke();
        }
        ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = 1.5; ctx.stroke();
      } else if (p.kind === 'arrow') {
        // Painted directional arrow
        ctx.globalAlpha = 0.1;
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.moveTo(0, -14); ctx.lineTo(6, -4); ctx.lineTo(2, -4);
        ctx.lineTo(2, 10); ctx.lineTo(-2, 10); ctx.lineTo(-2, -4);
        ctx.lineTo(-6, -4); ctx.closePath();
        ctx.fill();
      } else if (p.kind === 'leaf') {
        // Leaf litter fleck
        ctx.globalAlpha = 0.18;
        const leafColors = ['#B8860B', '#8B6914', '#6B4F1A', '#A07040'];
        ctx.fillStyle = leafColors[Math.abs(Math.floor(p.x + p.y)) % leafColors.length];
        ctx.beginPath(); ctx.ellipse(0, 0, 6, 2.5, 0, 0, Math.PI * 2); ctx.fill();
      } else if (p.kind === 'planter') {
        // Concrete planter box
        ctx.globalAlpha = 0.22;
        ctx.fillStyle = '#B0A898';
        ctx.fillRect(-14, -10, 28, 20);
        ctx.fillStyle = '#5A8A48';
        ctx.fillRect(-10, -7, 20, 6);
        // rim highlight
        ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1;
        ctx.strokeRect(-14, -10, 28, 20);
      }
      ctx.restore();
    }
  }

  // ── objects (y-sorted) ── Dense City §3: optional void actors interleave by foot-Y
  draw(
    ctx: CanvasRenderingContext2D,
    t: number,
    view: { x: number; y: number; w: number; h: number },
    actors?: { footY: number; draw: () => void }[],
    camZoom?: number,
    vel?: { x: number; y: number },
  ) {
    // Late-game pass: height-aware, zoom-gated, velocity-biased cull to kill
    // building pop-in. The up/down/side extents use the ACTUAL projected 2.5D
    // footprint (tall towers lean up-screen by h*LIFT), so a building enters
    // visible[] before its silhouette reaches the frame edge — no pop-in. The
    // generous BASE_PAD + directional LEAD margins only apply at street zoom
    // (camZoom ≥ 0.8); zoomed out they shrink so the wider net never bloats the
    // already-heavy far view (the LOD tiers below keep any extras cheap).
    const street = (camZoom ?? 1) >= 0.8;
    const BASE_PAD = street ? 96 : 32;
    const LEAD = street ? 260 : 0;
    const vx = vel?.x ?? 0, vy = vel?.y ?? 0, vl = Math.hypot(vx, vy);
    const bx = vl > 1e-3 ? (vx / vl) * LEAD : 0, by = vl > 1e-3 ? (vy / vl) * LEAD : 0;
    const L = view.x - BASE_PAD + Math.min(0, bx), R = view.x + view.w + BASE_PAD + Math.max(0, bx);
    const T = view.y - BASE_PAD + Math.min(0, by), B = view.y + view.h + BASE_PAD + Math.max(0, by);
    const visible = this.objects.filter((o) => {
      if (o.eaten) return false;
      // Structural Build: the train spans ~3 car-gaps behind its lead point
      if (o.kind === 'train') {
        const p = 540;
        return o.x + p >= L && o.x - p <= R && o.y + p >= T && o.y - p <= B;
      }
      // Foot-anchored sprites (trees, landmarks, people) draw UP ~2× their
      // radius from the foot point, so the up-extent must be ~2.2× size or tall
      // art pops in at the top edge; buildings use their projected 2.5D height.
      const up = o.bldg ? o.bldg.h * LIFT + o.bldg.d + o.size : o.size * 2.2;
      const down = o.bldg ? o.bldg.d + o.size : o.size;
      const side = o.bldg ? o.bldg.w + o.bldg.d : o.size;
      return o.x + side >= L && o.x - side <= R && o.y + down >= T && o.y - up <= B;
    });
    // hole.io rebuild: box buildings sort by their SOUTH edge (visual base),
    // everything else by its foot point as before.
    visible.sort((a, b) => (a.y + (a.bldg?.d ?? 0)) - (b.y + (b.bldg?.d ?? 0)));

    // v10 §3: ground shadows for captured objects — stay planted as object lifts toward void
    for (const obj of visible) {
      if (!obj.captured || !obj.shadowX) continue;
      const a = obj.captureScale * 0.45;
      if (a < 0.02) continue;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath();
      ctx.ellipse(obj.shadowX, obj.shadowY, obj.baseSize * 0.75, obj.baseSize * 0.38, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // hole.io rebuild: camera centre drives the extruded-building parallax
    const camCX = view.x + view.w / 2;
    const camCY = view.y + view.h / 2;

    // Perf pass: profiling showed ctx.save() dominating frame cost (2-3 pairs ×
    // hundreds of objects). drawOne now mutates transform freely and resets with
    // a single setTransform to this snapshot — zero save/restore in the hot path.
    const baseTf = ctx.getTransform();
    // Late-game pass: device-px per world-unit (= dpr × camZoom). Drives the LOD
    // tier thresholds so far/small objects skip expensive detail.
    const scaleA = baseTf.a;

    const drawOne = (obj: WorldObject) => {
      // Structural Build: the express draws its own multi-segment body
      if (obj.kind === 'train') { this.drawTrain(ctx, obj, t); return; }
      // hole.io rebuild: live pseudo-3D box draw for uncaptured buildings.
      // Captured ones fall through to the flat-sprite tumble path below.
      // Late-game pass: LEVEL OF DETAIL. drawBuilding3D is the frame's most
      // expensive op (2 clips + 2 transforms + 3-4 drawImages + shadow poly per
      // building). When a building is small on screen (zoomed out at DEVOURER/
      // WORLD ENDER), that detail is invisible — so draw a single flat sprite,
      // or a colored dot when truly tiny. onPx = projected screen height.
      if (obj.bldg && !obj.captured) {
        const shk3 = obj.shakeT ? Math.sin(obj.shakeT * 1.8) * (obj.shakeT / 100) * 4 : 0;
        const b = obj.bldg;
        const onPx = (b.h * LIFT + b.d) * scaleA;
        // hysteresis: only switch tiers when crossing the band by ±3px so the
        // camera's lerped micro-zoom can't make a building flicker between tiers
        const prev = obj.lodTier ?? 2;
        let tier: number;
        // Full pseudo-3D (2 clips + 2 face blits + shadow poly) while the
        // building is a meaningful size on screen — the cull+zoom already cut
        // object count 20×, so keeping near/mid buildings 3D is cheap on GPU and
        // looks best. Only genuinely small FAR buildings drop to the flat baked
        // sprite (1 drawImage, indistinguishable at that size); tiny ones a dot.
        if (onPx >= 52 + (prev < 2 ? 4 : 0)) tier = 2;        // full pseudo-3D
        else if (onPx >= 16 + (prev < 1 ? 3 : prev > 1 ? -3 : 0)) tier = 1; // flat sprite
        else tier = 0;                                        // dot
        obj.lodTier = tier;
        if (tier === 2) {
          drawBuilding3D(ctx, b, obj.x + shk3, obj.y, camCX, camCY);
        } else if (tier === 1) {
          const key = ensureBuildingSprite(b);
          const spr = objectSprites.get(key);
          if (spr) {
            const iw = spr instanceof HTMLImageElement ? spr.naturalWidth : spr.width;
            const ih = spr instanceof HTMLImageElement ? spr.naturalHeight : spr.height;
            const dh = (b.h * LIFT + b.d) * 1.0, dw = dh * (iw / ih);
            // foot-anchored: base of the flat sprite sits at the south edge
            ctx.drawImage(spr, obj.x + shk3 - dw / 2, obj.y + b.d - dh, dw, dh);
          } else {
            drawBuilding3D(ctx, b, obj.x + shk3, obj.y, camCX, camCY);
          }
        } else {
          // far dot — a filled roof-color rect roughly the building footprint
          ctx.fillStyle = buildingRoofColor(b);
          ctx.fillRect(obj.x - b.w, obj.y - b.d, b.w * 2, b.d * 2);
        }
        return;
      }
      // v6 §2: golden object aura — gold ring + orbiting sparkles (no blur)
      if (obj.golden) {
        ctx.save();
        ctx.translate(obj.x, obj.y);
        ctx.strokeStyle = '#FFD23F';
        ctx.lineWidth = 3;
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.arc(0, 0, obj.size * 1.3 + Math.sin(t / 200) * 2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#FFF3B0';
        for (let i = 0; i < 4; i++) {
          const a = t / 500 + (i / 4) * Math.PI * 2;
          ctx.beginPath();
          ctx.arc(Math.cos(a) * obj.size * 1.5, Math.sin(a) * obj.size * 1.5, 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
      // Prompt 19 Stage 1/3: resolve sprite key early so the vehicle-wobble-skip
      // check can reference it before ctx.translate/rotate are called.
      const spriteKey: string | null = this.structureSpriteKey(obj.kind, obj.id, obj.sceneryKey);
      // v11: PNG sprite replaces procedural drawing when present
      const r = obj.size;

      // Late-game pass: far-LOD for props. onHalfPx = the prop's on-screen
      // half-height. Under ~1.6px it is a speck — draw a 1px dot and skip the
      // whole translate/rotate/sprite/shadow path. Between there and ~4px, keep
      // the sprite but drop its shadow (invisible at that size, ~1000 fills/frame
      // saved when zoomed out). Living things always draw fully (they animate).
      const onHalfPx = r * scaleA;
      const skipShadow = onHalfPx < 4;
      if (!obj.captured && !obj.living && !obj.golden && onHalfPx < 1.6) {
        ctx.fillStyle = 'rgba(40,44,60,0.5)';
        ctx.fillRect(obj.x - 1, obj.y - 1, 2, 2);
        return;
      }

      // Feel Patch §1: prop-shake offset — object wiggles horizontally while shakeT > 0
      const shk = obj.shakeT ? Math.sin(obj.shakeT * 1.8) * (obj.shakeT / 100) * 4 : 0;
      // Alive Pack §9: pedestrian bob while walking, rapid shake while panicking
      const isPed = (obj.kind as string).startsWith('person') ||
        ['skateboarder', 'cyclist', 'tourist', 'waiter', 'icecream_vendor'].includes(obj.kind as string);
      const pedBob = isPed && !obj.captured
        ? (obj.fleeing
          ? Math.sin(t / 72 + obj.wobble) * 2.8   // rapid shake when panicking
          : Math.sin(t / 380 + obj.wobble) * 0.8)  // Prompt 19 Stage 3: halved walk bob (1.6→0.8)
        : 0;
      ctx.translate(obj.x + shk, obj.y + pedBob);
      if (obj.captured) {
        ctx.rotate(obj.captureRot);
      } else if (obj.living) {
        // Prompt 7 Stage 1: idle tilt + vacuum wobble are body-language reserved for
        // things MEANT to move — people, animals, and vehicles are all LIVING_KINDS.
        // Buildings, houses, and scenery (living === false) must hold perfectly still.
        // Prompt 19 Stage 3: vehicles never tilt — only people/animals get body-language.
        const isVehicleSprite = spriteKey && VEHICLE_SPRITE_RE.test(spriteKey);
        if (!isVehicleSprite) {
          const tilt = obj.fleeing ? Math.sin(obj.wobble * 3) * 0.16 : Math.sin(obj.wobble) * 0.04;
          // Alive Pack §11: vacuum wobble — dragged objects wobble in the pull direction
          const spd = Math.hypot(obj.vx, obj.vy);
          const vacWobble = (spd > 12)
            ? Math.sin(t / 78 + obj.wobble) * 0.14 * Math.min(1, spd / 80)
            : 0;
          ctx.rotate(tilt + vacWobble);
        }
      }
      if (obj.arrive > 0) {
        // v8 §2: 200ms scale-up bounce (easeOutBack overshoot) on arrival
        const p = 1 - obj.arrive / 200;
        const c1 = 1.70158, c3 = c1 + 1;
        const s = 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);
        ctx.scale(s, s);
      }

      const objSprite = spriteKey ? objectSprites.get(spriteKey) : undefined;

      if (objSprite) {
        // Prompt 20 Stage 4: couple visual scale — hoisted here so both shadow and
        // sprite draw use the same multiplier, keeping them visually consistent.
        const coupleScale = obj.kind === 'vig_couple' ? 1.3 : 1.0;

        // Drop shadow only for grounded objects — captured objects have the v10 §3
        // planted shadow at obj.shadowX/Y; drawing one here would rotate with the tumble.
        // Late-game pass: skipShadow drops the ellipse fill for props too small
        // on screen for it to read (the biggest per-frame saving when zoomed out).
        if (!obj.captured && !skipShadow) {
          // Prompt 19 Stage 4: shadow width scaled by sprite aspect ratio so
          // a wide car casts a wide shadow and a thin gnome casts a narrow one.
          // Prompt 20 Stage 2: for tall, narrow sprites (aspect < 0.8 — skyscrapers,
          // towers, watertowers) the original formula produced a pinhole shadow that
          // made the building look airborne. New formula uses the sprite's actual
          // visual footprint width (aspect × 2r / 2) as the floor.
          const shadowAsr = spriteAspect.get(spriteKey!) ?? 1;
          const formulaW = r * 0.85 * Math.min(shadowAsr * 1.1, 1.7);
          const footprintW = r * Math.min(shadowAsr + 0.3, 1.1); // visual base half-width × 2
          // Batch 1.5: tighter, closer, lighter shadows — planted, not hovering.
          const shadowW = Math.max(formulaW, footprintW) * coupleScale * 0.86;
          const shadowH = (shadowAsr < 0.8 ? r * 0.11 : r * 0.15) * coupleScale;
          const shadowYOff = shadowAsr < 0.8 ? 2 : 3;
          const shadowAlpha = Math.max(0.10, 0.20 - r * 0.0008);
          // Perf pass: no save/restore — only fillStyle + path are touched.
          ctx.fillStyle = `rgba(0,0,0,${shadowAlpha.toFixed(3)})`;
          ctx.beginPath();
          ctx.ellipse(0, shadowYOff, shadowW, shadowH, 0, 0, Math.PI * 2);
          ctx.fill();
        }

        // v12 §0: use tight alpha-bounding-box so transparent padding never inflates visuals
        const bn = spriteBounds.get(spriteKey!) ?? { x: 0, y: 0, w: 1, h: 1 };
        // War Pack: handle both HTMLImageElement (naturalWidth) and HTMLCanvasElement (width)
        const imgW = objSprite instanceof HTMLImageElement ? objSprite.naturalWidth : objSprite.width;
        const imgH = objSprite instanceof HTMLImageElement ? objSprite.naturalHeight : objSprite.height;
        const sx = bn.x * imgW, sy = bn.y * imgH, sw = bn.w * imgW, sh = bn.h * imgH;

        if (obj.captured) {
          ctx.drawImage(objSprite, sx, sy, sw, sh, -r, -r, r * 2, r * 2);
        } else if (spriteKey && VEHICLE_SPRITE_RE.test(spriteKey)) {
          // Prompt 14 §4 + Prompt 16: rotate vehicle-style sprites to face direction of travel.
          // Sheet art faces UP (not east), so +π/2 offset is needed.
          // Pivot is at foot centre (no pre-translate) — vehicle sits flat on the ground.
          let dx = 0, dy = 0;
          if (obj.kind === 'car' || obj.kind === 'schoolbus') {
            if (obj.roadAxis === 'h') dx = obj.roadDir; else dy = obj.roadDir;
          } else { dx = obj.vx; dy = obj.vy; }
          // Prompt 14 Stage 4: sheet art faces UP not east — quarter-turn offset restored.
          const rot = (Math.abs(dx) + Math.abs(dy) > 0.001)
            ? Math.atan2(dy, dx) + Math.PI / 2 : 0;
          // Perf pass: no save/restore — end-of-object setTransform resets rotation.
          ctx.rotate(rot);
          // Prompt 19 Stage 1: aspect-ratio-correct vehicle draw (wide cars don't squash)
          const vasr = spriteAspect.get(spriteKey!) ?? 1;
          const vdH = r * 2, vdW = vdH * vasr;
          ctx.drawImage(objSprite, sx, sy, sw, sh, -(vdW / 2), -(vdH / 2), vdW, vdH);
        } else {
          // Prompt 7 Stage 1: trees & bushes are scenery — the ±1.5° idle wind sway
          // was removed so they draw perfectly still like every other structure.
          // Prompt 19 Stage 1: aspect-ratio-correct foot-anchored draw
          // dH = 2r (height unchanged), dW = 2r * aspect (width preserves ratio)
          const fasrRaw = spriteAspect.get(spriteKey!) ?? 1;
          // Batch 1.5: pencil-tower fix — large structures never draw thinner
          // than 0.46× their height. Small props (lamps, people, gnomes) keep
          // their native aspect untouched.
          const fasr = (r > 90 && fasrRaw < 0.46) ? 0.46 : fasrRaw;
          // coupleScale is hoisted above the shadow block — see Prompt 20 Stage 4 comment.
          const fdH = r * 2 * coupleScale, fdW = fdH * fasr;
          ctx.drawImage(objSprite, sx, sy, sw, sh, -(fdW / 2), -fdH, fdW, fdH);
        }
      } else {
        drawParkObject(ctx, obj.kind, obj.size, { t, fleeing: obj.fleeing, variant: obj.variant });
      }
      ctx.setTransform(baseTf); // Perf pass: single transform reset replaces save/restore

      // "!" alert bubble over fleeing people
      if (obj.alertT > 0 && obj.kind === 'person') {
        ctx.save();
        ctx.globalAlpha = clamp(obj.alertT / 900, 0, 1);
        ctx.fillStyle = '#FF3D68';
        ctx.font = 'bold 22px Fredoka, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('!', obj.x, obj.y - obj.size - 6);
        ctx.restore();
      }
      // v16.2 §1: speech bubble — NPC says something.
      // Overnight fix ("hard to see the chat bubbles"): bubbles were sized in
      // WORLD units so they shrank with camera zoom. Now sized inversely to
      // the current zoom → constant, readable size on SCREEN at any form.
      // Late-game pass: skip speech bubbles for NPCs that are small on screen
      // (zoomed out at DEVOURER/WORLD ENDER) — the bubble is unreadable there
      // and ctx.measureText per bubble was ~166ms/frame of the zoom-out cost.
      if (obj.bubbleText && obj.bubbleLife > 0 && onHalfPx >= 9) {
        const lifeNorm = clamp(obj.bubbleLife / 4500, 0, 1);
        const alpha = lifeNorm > 0.88 ? (1 - lifeNorm) / 0.12 : lifeNorm < 0.18 ? lifeNorm / 0.18 : 1;
        ctx.save();
        ctx.globalAlpha = alpha;
        const zm = ctx.getTransform().a / Math.min((typeof window !== 'undefined' && window.devicePixelRatio) || 1, 2);
        const fontSize = clamp(15 / Math.max(0.2, zm), 13, 34);
        ctx.font = `800 ${fontSize.toFixed(1)}px Nunito, sans-serif`;
        ctx.textAlign = 'center';
        const txtW = ctx.measureText(obj.bubbleText).width;
        const pad = fontSize * 0.5, bw = txtW + pad * 2, bh = fontSize + pad * 1.6;
        const bx = obj.x - bw / 2, by = obj.y - obj.size - bh - 10;
        ctx.fillStyle = 'rgba(255,255,255,0.97)';
        ctx.strokeStyle = 'rgba(26,16,64,0.30)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        if ((ctx as any).roundRect) (ctx as any).roundRect(bx, by, bw, bh, bh * 0.4);
        else ctx.rect(bx, by, bw, bh);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(obj.x - fontSize * 0.35, by + bh); ctx.lineTo(obj.x, by + bh + fontSize * 0.55); ctx.lineTo(obj.x + fontSize * 0.35, by + bh);
        ctx.fillStyle = 'rgba(255,255,255,0.97)';
        ctx.fill();
        ctx.fillStyle = '#1a1040';
        ctx.fillText(obj.bubbleText, obj.x, by + bh - pad * 0.9);
        ctx.restore();
      }
    };

    // Dense City §3 + Feedback Juice §1: interleave void actors (player + rivals)
    // AND cosmetic swallow ghosts into the painter's-order pass by foot-Y, so
    // nearer buildings occlude the void body and ghosts stay depth-correct.
    let hasGhosts = false;
    for (const g of this.swallowGhosts) { if (g.active) { hasGhosts = true; break; } }
    if ((actors && actors.length) || hasGhosts) {
      type Entry = { y: number; obj?: WorldObject; act?: () => void; ghost?: SwallowGhost };
      const merged: Entry[] = [];
      for (const obj of visible) merged.push({ y: obj.y, obj });
      if (actors) for (const a of actors) merged.push({ y: a.footY, act: a.draw });
      for (const g of this.swallowGhosts) { if (g.active) merged.push({ y: g.y, ghost: g }); }
      merged.sort((p, q) => p.y - q.y);
      for (const e of merged) {
        if (e.obj) drawOne(e.obj);
        else if (e.ghost) this.drawSwallowGhost(ctx, e.ghost, t);
        else e.act!();
      }
    } else {
      for (const obj of visible) drawOne(obj);
    }
  }

  // Stage 13 §1: render only the static (non-living, non-eaten) world objects
  // onto an offscreen photo canvas at the given world→pixel scale.
  drawPhotoLayer(ctx: CanvasRenderingContext2D, scale: number): void {
    // Prompt 15 Stage 0: foot-Y-sorted composite of every static object using the
    // same sprite + spriteBounds logic as the main game draw loop.
    const statics = this.objects.filter(o => !o.living && !o.eaten && !o.captured);
    statics.sort((a, b) => (a.y + a.size * 0.5) - (b.y + b.size * 0.5));
    for (const obj of statics) {
      const r  = obj.size * scale;
      const sx = obj.x   * scale;
      const sy = obj.y   * scale;
      const spriteKey = this.structureSpriteKey(obj.kind, obj.id, obj.sceneryKey);
      const spr = spriteKey
        ? (objectSprites as Map<string, HTMLImageElement | HTMLCanvasElement>).get(spriteKey)
        : undefined;
      ctx.save();
      ctx.translate(sx, sy);
      if (spr) {
        const bn = spriteBounds.get(spriteKey!) ?? { x: 0, y: 0, w: 1, h: 1 };
        const imgW = spr instanceof HTMLImageElement ? spr.naturalWidth  : spr.width;
        const imgH = spr instanceof HTMLImageElement ? spr.naturalHeight : spr.height;
        ctx.drawImage(spr,
          bn.x * imgW, bn.y * imgH, bn.w * imgW, bn.h * imgH, // source rect
          -r, -r * 2, r * 2, r * 2,                           // dest: foot at origin, extends up
        );
      } else {
        // Procedural blob when sprite not yet decoded.
        ctx.fillStyle = '#8BC87A';
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.ellipse(0, -r, r * 0.55, r * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      ctx.restore();
    }
  }
}

function pick<T>(arr: T[], rand: () => number): T {
  return arr[Math.floor(rand() * arr.length)];
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
