// THE SAME PLACE, TWICE — so a before/after pair differs by the BUILD alone.
//
// qa/shippedlook.mjs pins the void's RADIUS, its MOOD and its MOUTH, and it
// pins the quality rung, so the character is comparable frame to frame. It
// does not pin where he is STANDING. He starts at the world's authored spawn
// and then drifts: he eats out the larder under his feet, the shore eases him
// back in if he is near it, a rival that bites him moves him, and the residual
// velocity from any of that glides him on for another half second. So two runs
// against two builds are photographs of two different corners of the town, and
// every tonal comparison the studio makes is confounded by composition —
// different props, different ground, different amount of sky.
//
// This shoots a NAMED, FIXED world position instead. Two runs against two
// builds now differ by the build.
//
//   node qa/lookpair.mjs [port] [world] [tag]
//
// A PAIR, in full:
//   npm run build && node qa/lookpair.mjs 4177 maple before   # the build you have
//   …make the change, npm run build…
//   node qa/lookpair.mjs 4177 maple after                     # the build you propose
// and then compare qa/out/lookpair/maple_before.png with maple_after.png. The
// two .src stamps beside them carry the source digest each frame was taken
// from: if those two digests are EQUAL, the pair is not an A/B — it is the
// same build photographed twice, and any difference in it is noise.
//
// ── WHAT THIS IS NOT ──────────────────────────────────────────────────────
// It is NOT a pinned camera. A skeptic killed that patch and was right to:
// the follow distance runs 26–340 units across a match and is derived from the
// hero's radius, so freezing the camera freezes a lens the game never uses and
// photographs a framing no child ever sees. This moves the SUBJECT and lets
// the camera do exactly what it does in play — `_dbg.__warpVoid`
// (src/prototype3d.ts:1879) sets voidState.x/z, moves the void's group, and
// snaps camera.position and camFollow to `void + camOffset * camDist` using
// the LIVE camOffset and the LIVE camDist. It touches no light, no material,
// no exposure and no clock. The sun rides the void (prototype3d.ts:9343) but
// both ends of the directional light travel together, so the shadow direction
// is identical wherever he stands.
//
// AND WHAT IT DOES NOT DO, because each one is a trap this file has to cover:
//   · it does not zero velX/velZ. A void that was moving keeps moving after
//     the teleport, so the position has to be re-read and re-corrected, not
//     assumed. (Nothing drives here — prototype3d.ts:8557 ignores a pointer
//     that never moved — so in practice it lands at Δ0.000, and the verdict
//     line prints that number rather than trusting it.)
//   · it does not touch lookVX/lookVZ, so the teleport spikes the camera's
//     look-ahead for about half a second. See the settle below.
//   · it does not check the ground. Warping into the sea is silent; the void
//     is then eased back inland over the following frames and the frame is of
//     somewhere else. Hence the pre-flight against __solidAt.
//   · it does not touch the radius, and the radius is not actually pinned
//     either — see below.
// It DOES move world state that is not rendering: `island.biomeAt(voidState)`
// is what the newsroom, the music and the crowd cues read (prototype3d.ts:4002,
// :4119), so a warped hero is reported in the district he was warped to. That
// is correct behaviour and it is identical in both halves of a pair, but it is
// why this is a LOOK probe and not a gameplay one.
//
// ── WHY THE RADIUS IS RE-ASSERTED, NOT JUST SET ───────────────────────────
// `__setVoidR(r)` sets `frozenR`, and frozenR only stops the growth LAW from
// pulling the hero back to its clock-derived size (prototype3d.ts:8526-8549).
// Eating still grows him: `voidling.setRadius(growRadius(...))` at :5082 is
// not guarded, so a hero parked in a dense district eats his way up while the
// probe believes he is pinned. MEASURED, both on Maple at rung 0 after
// __setVoidR(4): left alone to t > 8, the camera settles at camDist 149.9 —
// the follow distance prototype3d.ts:9223 gives for a radius near 4.8. This
// file, re-asserting R whenever it drifts, settles at 129.1, which is the
// value for 4.000. Sixteen per cent of lens, and with it the whole framing,
// bought entirely by lunch. The Maple run below needed SIX re-asserts between
// t=4.2 and t=10.3 to hold him at 4.000, so this is not a rare case.
// Radius drives camDist drives the framing: a "pinned" radius that drifts is a
// pinned frame that drifts. This settles the spot until the larder under him
// is empty, re-asserts R whenever it moves, and asserts |r - R| at the
// shutter — and the `hero` and `landed` lines report both, every run.
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { createHash } from 'crypto';
import { join } from 'path';
import { PNG } from 'pngjs';

// ── A FRAME RECORDS WHAT IT IS A PHOTOGRAPH OF ────────────────────────────
// Verbatim from qa/shippedlook.mjs, and for its reason: qa/packfresh.mjs first
// compared file mtimes and was defeated with `touch` in the same minute it was
// written, and mtime cannot see an uncommitted edit — which is most of what
// changes during a working session. A digest of the source cannot be bumped
// and cannot be faked by saving a file.
const srcDigest = () => {
  const h = createHash('sha256');
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name < b.name ? -1 : 1)) {
      const q = join(d, e.name);
      if (e.isDirectory()) { walk(q); continue; }
      if (!/\.(ts|tsx)$/.test(e.name)) continue;
      h.update(e.name); h.update(readFileSync(q));
    }
  };
  walk('src');
  return h.digest('hex').slice(0, 16);
};

const PORT = process.argv[2] || '4177';
const WORLD = process.argv[3] || 'maple';
// One filename per world and tag, and the default tag does not vary — see
// qa/shippedlook.mjs on the reshoot that wrote a SECOND set beside a stale one
// and left the pack the teams actually read untouched for 46 hours. The
// canonical shot overwrites itself.
const TAG = process.argv[4] || 'look';
// HIDE_RIVALS=1: the family is hidden at the shutter. A rival that wanders
// into one half of a pair brings a body and a ring the other half lacks —
// Lantern's before/rung2 pair of 2026-09-03 read K 50 → 47 (−6%) with NIBBLES
// and his ring beside the hero in one frame only, and rung 2 cannot darken
// anything by construction. A light-rig comparison measures light, not who
// walked past; the count hidden is printed and the default is unchanged.
const HIDE_RIVALS = process.env.HIDE_RIVALS === '1';
const OUT = 'qa/out/lookpair';

// ── THE PINS ──────────────────────────────────────────────────────────────
// Every one of these is also pinned by qa/shippedlook.mjs, and the pair is
// only comparable if the two probes agree on them. Changing one changes every
// frame in the folder; do it in both files or not at all.
const RUNG = 0;      // the quality rung. A software renderer demotes inside a
                     // few seconds, and a number sampled off a moving ladder is
                     // a number from a rung nobody chose.
const R = 4;         // the hero's radius, and therefore camDist and the whole
                     // framing. 4 is qa/shippedlook.mjs's value.
const SHOOT_T = 10;  // MATCH seconds at the shutter, not wall seconds. The
                     // clock runs 14-40x slower than wall under swiftshader, so
                     // a wall-time wait is a different amount of gameplay on
                     // every machine — and the crowd, the family and the props
                     // have all had a different amount of time to move. Fixing
                     // it in match time is what makes two runs comparable.

// ── WHERE HE STANDS ───────────────────────────────────────────────────────
// island.ts and the world modules author in WORLD units; the scene is
// (v - 6000) * 0.05 of that (prototype3d.ts:1329 does the same arithmetic
// inline for every hero landmark, and life.ts:1605 names the function W3).
const w3 = (v) => (v - 6000) * 0.05;
// The lens's own ground axis. `camOffset.x` and `camOffset.z` are set from the
// same expression at prototype3d.ts:9280, at every radius, so the camera sits
// on the +x/+z diagonal and looks along (-1,-1)/√2 forever — the fixed 225°
// azimuth. `back(d)` is therefore "d units toward the lens", per axis: put a
// landmark at `spot - back(d)` and it lands dead centre, d units up the frame.
const back = (d) => d * Math.SQRT1_2;

// Each spot is a landmark's own authored coordinates plus a step back toward
// the lens, so the thing that makes the world look like itself is IN the
// frame rather than behind the camera. Every one is asserted against the
// game's own containment predicate (`__solidAt`, prototype3d.ts:1746 →
// coastSolid at :634) before the warp — no spot here is a guess about where
// the ground is, and the run dies loudly if the island ever moves under it.
const SPOTS = {
  // ── MAPLE FALLS — THE SQUARE, the town hall up the green ────────────────
  // island.ts:208-209 fixes SQ_CX = 6855 and SQ_HALL_Y = 4640 by hand ("the
  // one place on the island whose geometry is fixed by hand rather than
  // derived from the block grid"), and island.ts:6466 drops the town hall
  // there at radius 6.5 — the largest authored object in Maple Falls and the
  // one its finale is written around (prototype3d.ts:1317). Standing 26 units
  // down the green from it puts the hall centred and high in the frame, with
  // the bandstand on the centre circle, the elm walks, the lawn signs and the
  // war memorial around him. MAPLE_SPAWN (island.ts:225) is 36 units away and
  // does NOT show the hall: projected through the live frustum at a follow
  // distance of 149.9 — WIDER than the 129.1 this file shoots at — the largest
  // edible in the spawn's frame measures 5.06. The lens is about 15 degrees
  // wide in portrait, so a 6.5 landmark 35 units off the diagonal is simply
  // outside the picture. From this spot the file's own `props` line reports
  // the hall in frame on every run.
  maple: { name: 'THE SQUARE — the town hall up the green',
    x: w3(6855) + back(26), z: w3(4640) + back(26) },

  // ── PIRATE BAY — THE RESORT, the Royal Mariner up the strip ─────────────
  // island.ts:6179 drops makeGrandHotel() at world (8540, 3700) at radius 10,
  // on the one site a numeric sweep found with the hotel's own footprint of
  // clearance; prototype3d.ts:1329 makes the same building this world's hero
  // landmark and its finale. 26 units back down the strip.
  // THE SPAWN IS NOT USABLE HERE and the difference is not taste: Dance Cove
  // is at the far south end and the resort is the flagship district. Three
  // other obvious-looking spots on this island — the main stage, the dockside
  // warehouse and the yacht club, each derived the same way from an authored
  // landmark — came back NOT SOLID from __solidAt. Pirate Bay is a thin
  // beachfront ribbon and stepping 26 units off a landmark can put you in the
  // sea. That is why the pre-flight below exists.
  pirate: { name: 'THE RESORT — the Royal Mariner up the strip',
    x: w3(8540) + back(26), z: w3(3700) + back(26) },

  // ── GAME DAY — THE TAILGATE, mid-aisle, rows running off both ways ──────
  // gameday.ts:250-262 lays eleven truck rows across the apron at y = 6600,
  // 6940 … 10000, LOT_AISLE 340 apart (:242). GD_SPAWN (:296) is the midpoint
  // of the 8640/8980 aisle "so the player opens inside the party rather than
  // under a truck"; this is the same construction one aisle north — the
  // midpoint of the 8300/8640 pair — which keeps that 170-unit clearance and
  // puts MORE rows in front of the lens than the spawn does. x = 6400 is well
  // inside both rows' measured ends (:256-257).
  gameday: { name: 'THE TAILGATE — mid-aisle between the 8300 and 8640 rows',
    x: w3(6400), z: w3(8470) },

  // ── LANTERN NIGHT — LANTERN ROW, on the market street ───────────────────
  // lantern.ts:110 runs MARKET up the canal's east bank, and :107-109 says
  // what it is for: "the stalls face west across the water, so the lantern
  // strings span the channel and the player drives under them. This is the
  // sightline the whole level is built around." At world y = 7600 that
  // centreline interpolates to x ≈ 7012, so x = 6900 sits about 112 units west
  // of it — inside MARKET_HALF = 190 (:115) — and about 399 EAST of the canal
  // centreline against CANAL_HALF = 150 (:103): on the street, not in the
  // water. `__biomeAt` answers `stalls` here, which is the check that matters.
  // The camera's ground axis runs north-west from here, straight across the
  // channel to the west bank, which is that sightline. LANTERN ROW is the
  // level's hero district and "the densest thing in the game" (:162).
  lantern: { name: 'LANTERN ROW — the market street, across the canal',
    x: w3(6900), z: w3(7600) },

  // ── POWDER PASS — THE VILLAGE, chalets shoulder to shoulder ─────────────
  // powder.ts:196 calls THE VILLAGE the hero district: "chalets shoulder to
  // shoulder on the south-east shore, all facing the lake, the grit road
  // winding through them", density 1.5, the highest in the level. This point
  // is inside that polygon with the whole visible strip inside it as well.
  // And it is OFF THE ICE, which on this level is a real distinction: `onIce`
  // (:120) is true on the lake ellipse (:100) and within GRIT_HALF = 170 (:116)
  // of the ploughed road (:109), and PW_SPAWN (:241) was itself moved off that
  // road because "the child's first input would be a skid". The nearest point
  // of GRIT to this spot is about 890 units away and the lake ellipse test
  // comes out at 4.9 against its bound of 1, so neither applies — a fixed
  // position has no business being on the one surface with different physics.
  powder: { name: 'THE VILLAGE — chalets on the south-east shore',
    x: w3(6800), z: w3(8800) },
};

// ── the verdict is printed even if this file throws ────────────────────────
// Silence is a FAIL — docs/GOVERNOR.md, "WHAT THE GATE NOW HOLDS". A step that
// prints no verdict did not reach a conclusion, and a probe that cannot
// conclude is not evidence of anything. Nothing below is allowed to exit
// quietly, including a crash inside playwright.
let verdict = null;
const say = (ok, line) => { verdict = `  VERDICT ${ok ? 'PASS' : 'FAIL'} ${line}`; };
// FAIL is a throw, never a bare process.exit: exit() skips the `finally` that
// closes the browser, and a probe that leaks a chromium per failure is a probe
// nobody runs twice.
const QUIT = '__lookpair_verdict_already_set';
const fail = (line) => { say(false, line); throw new Error(QUIT); };
process.on('exit', (code) => {
  if (verdict === null) console.log(`  VERDICT FAIL ${WORLD} — the probe exited (${code}) without reaching a conclusion`);
  else console.log(verdict);
});

const spot = SPOTS[WORLD];
if (!spot) {
  say(false, `${WORLD} — no fixed spot is authored for this world (have: ${Object.keys(SPOTS).join(', ')})`);
  process.exit(1);
}
mkdirSync(OUT, { recursive: true });

const { chromium } = await import('playwright');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
let done = false;
try {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
  // GENEROUS, EVERYWHERE, INCLUDING THE SHUTTER. Playwright's default is 30
  // seconds and under a software renderer a single frame can take longer than
  // that — running the five worlds at once on four cores, `p.screenshot()`
  // timed out on two of them at 30s while the other three passed. Every wait
  // in this file already carried its own long timeout; the screenshot was the
  // one call left on the default, and it failed LOUDLY rather than silently,
  // which is the only reason it was found. Ten minutes for anything with a
  // clock on it.
  p.setDefaultTimeout(600000);
  p.setDefaultNavigationTimeout(600000);
  p.on('pageerror', (e) => console.log(`  [pageerror] ${e.message.split('\n')[0]}`));
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  // ── PIN THE DICE, OPTIONALLY ────────────────────────────────────────────
  // This probe pins the CAMERA and the void's POSITION, which is what it was
  // written for. It does NOT pin the WORLD: four of the five worlds build
  // themselves on Math.random (only Maple runs the seeded mulberry32 stream),
  // so two runs against two builds hold different vehicles in different
  // places, and a colour or lighting judgement across that pair is confounded
  // by content as well as by the build. That confound was found the honest
  // way — a three-way crimson shoot whose frames could not settle the
  // question they were taken for.
  //
  // With SEED=<n> in the environment, Math.random is replaced before any page
  // script runs by a mulberry32 on that seed, so the world generates
  // IDENTICALLY on every run and two builds differ by the build alone. It is
  // opt-in because a seeded Math.random is not what a player gets: it freezes
  // the family's wander and every other unseeded roll, so a frame shot this
  // way is a fair COMPARISON and not a fair sample of the game.
  const SEED = process.env.SEED ? Number(process.env.SEED) : null;
  if (SEED !== null) {
    await p.addInitScript((seed) => {
      let a = (seed >>> 0) + 0x6D2B79F5;
      Math.random = () => {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }, SEED);
  }
  await p.addInitScript(() => {
    try {
      localStorage.clear();
      localStorage.setItem('voidPlayed', '1');
      localStorage.setItem('voidTut', '1');
      localStorage.setItem('voidDailyLast', new Date().toDateString());
      // THE COMMA-JOINED SEED. unlocks.ts:43 splits this on commas — it is a comma-joined
      // string, not JSON. Written as JSON.stringify([...]) — which is what the
      // first probe of the session did, and seven files copied — nothing
      // matches, every world but Maple stays locked, the locked card refuses
      // the tap BY DESIGN, and the probe hangs forever waiting for a match
      // that cannot start. Maple looks fine throughout because read() force-adds
      // it, so the world that always works is the world that hides the bug.
      localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder');
    } catch { }
  });
  // NO DEBUG-HARNESS QUERY PARAMS. prototype3d.ts:3178 turns DEBUG_HARNESS on
  // for ?at ?r ?len ?fast ?demo, and :8619 lets a DEBUG_HARNESS match ATTRACT-
  // DRIVE itself after four idle seconds — the void would wander off the spot
  // this whole file exists to hold him on. `?w=` only.
  await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => {
    if (['daily', 'gift'].includes(e.id)) e.classList.remove('show');
  }));
  await p.evaluate(() => document.getElementById('btnPlay')?.click());
  await p.waitForTimeout(1400);
  await p.evaluate((w) => document.querySelector(`#worldRow .wCard[data-world="${w}"]`)?.click(), WORLD);
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout: 400000 });
  // one pointerdown on the canvas, exactly as qa/shippedlook.mjs: it satisfies
  // the first-gesture latch without steering, because prototype3d.ts:8557 only
  // reads the stick above joy.mag 0.156 and a pointerdown with no move is 0.
  await p.evaluate(() => {
    const cv = document.querySelector('canvas');
    cv.dispatchEvent(new PointerEvent('pointerdown', {
      pointerId: 1, clientX: innerWidth / 2, clientY: innerHeight / 2, bubbles: true }));
  });
  // Past the establishing shot. The longest intro in the game is Lantern's 3.6
  // (prototype3d.ts:1383); while introT runs, the camera is diving from three
  // hundred units up, shadows are OFF (:9234), and a warp lands under a camera
  // that is still travelling.
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 4.2, null, { timeout: 600000 });
  await p.evaluate(() => {
    const cv = document.querySelector('canvas');
    for (const el of Array.from(document.body.children)) {
      if (el !== cv && !el.contains(cv)) el.style.display = 'none';
    }
  });
  await p.evaluate(({ rung, r }) => { window.__pinQuality(rung); window.__setVoidR(r); }, { rung: RUNG, r: R });

  // ── PRE-FLIGHT: is the spot GROUND? ─────────────────────────────────────
  // Asked of the game's own predicate rather than replicated here. A probe
  // that carries its own copy of the containment rule describes the build it
  // was written against forever, and this rule in particular has been wrong
  // twice for exactly that reason (prototype3d.ts:629 says so in the source).
  const ground = await p.evaluate(({ x, z, r }) => ({
    solid: window.__solidAt(x, z, r),
    biome: window.__biomeAt(x, z),
    deep: window.__inDeepWater3(x, z, 2),
  }), { x: spot.x, z: spot.z, r: R });
  if (!ground.solid) {
    fail(`${WORLD} — the fixed spot (${spot.x.toFixed(2)}, ${spot.z.toFixed(2)}) is NOT solid ground for a radius-${R} void `
      + `(biome=${ground.biome} deepWater=${ground.deep}). The world moved under this probe; re-derive the spot, do not shoot.`);
  }

  // ── THE WARP, AND THE SETTLE ────────────────────────────────────────────
  // Warp, then hold him there while three things converge: the local larder
  // empties (so the radius stops climbing), camDist eases to the radius-R
  // follow distance (~2.7 match seconds from a 20-unit gap, at the 1.6/s rate
  // in prototype3d.ts:9276), and the look-ahead spike the teleport puts into
  // lookVX/lookVZ (:9291) decays. Every wait is on MATCH seconds.
  const POS_TOL = 0.35;    // world units. He is not driving, so the only thing
                           // that moves him is residual velocity and the shore;
                           // a third of a unit is a twelfth of his own radius.
  const CAM_TOL = 0.05;    // camDist units of change between samples. The ease
                           // closes 7.7% of the gap per frame, so this is a
                           // remaining gap under 0.7 units out of ~129.
  const R_TOL = R * 0.005; // 0.5% of the radius. Anything above this and the
                           // camera is framed for a different-sized hero.
  const DEADLINE = Date.now() + 25 * 60 * 1000;
  // ONE round trip per iteration, not four. Under swiftshader a frame is most
  // of a second, and every p.evaluate waits for the page's next gap — a loop
  // that reads, then warps, then re-asserts in three separate calls spends
  // three frames doing what one can do. Read and correct in the same call, and
  // report what it corrected.
  const step = ({ x, z, R, posTol, rTol }) => {
    const vs = window.__voidState(), ms = window.__matchState();
    const off = Math.hypot(vs.x - x, vs.z - z);
    let warped = false, reasserted = false;
    if (off > posTol) { window.__warpVoid(x, z); warped = true; }
    if (Math.abs(vs.r - R) > rTol) { window.__setVoidR(R); reasserted = true; }
    return { x: vs.x, z: vs.z, r: vs.r, cam: ms.camDist, t: ms.t, off, warped, reasserted };
  };
  const arg = { x: spot.x, z: spot.z, R, posTol: POS_TOL, rTol: R_TOL };
  let st = null, still = 0, warps = 1, reasserts = 0, iters = 0;
  await p.evaluate(({ x, z }) => {
    window.__warpVoid(x, z);
    // ── PIN THE FACE HERE, AT THE START OF THE SETTLE, NOT AT THE SHUTTER ──
    // qa/shippedlook.mjs pins it moments before the frame, which is enough for
    // the MOUTH (pinMouth is instantaneous) and is not enough for the MOOD.
    // prototype3d.ts:8938 turns the hero `sleepy` at `tClock - lastInput > 8`,
    // and standing on a fixed spot is by definition eight seconds of no input —
    // so this probe manufactures the one mood a parked hero can reach. moodPin
    // (:8939) does override it, but the rig's Zzz billboard has already faded
    // IN and takes its own time to fade out again: a Maple frame taken 0.4
    // match seconds after the pin still had two grey Z's over the void's head,
    // and the run before it did not. Pinning at the top of the settle gives it
    // six match seconds to go, and means `sleepy` is never selected at all.
    window.__setMood?.('cruise');
    window.__pinMouth?.(true);
  }, { x: spot.x, z: spot.z });
  for (;;) {
    if (Date.now() > DEADLINE) {
      fail(`${WORLD} — the spot never settled inside 25 minutes over ${iters} samples `
        + `(last: t=${st ? st.t.toFixed(2) : '?'} off ${st ? st.off.toFixed(3) : '?'}u, pos Δ${st ? st.dpos.toFixed(3) : '?'}, `
        + `camDist ${st ? st.cam.toFixed(1) : '?'} Δ${st ? st.dcam.toFixed(3) : '?'}, r ${st ? st.r.toFixed(3) : '?'}, `
        + `still ${still}/6, after ${warps} warp(s) and ${reasserts} radius re-assert(s)). Nothing shot.`);
    }
    const prev = st;
    st = await p.evaluate(step, arg);
    iters++;
    if (st.warped) warps++;
    if (st.reasserted) reasserts++;
    st.dpos = prev ? Math.hypot(st.x - prev.x, st.z - prev.z) : Infinity;
    st.dcam = prev ? Math.abs(st.cam - prev.cam) : Infinity;
    // A WARP resets the count; a radius re-assert does not. A warp genuinely
    // disturbs the camera — position, camFollow and the look-ahead all move —
    // so the six samples have to start again. A re-assert only nudges the
    // camDist TARGET, and if that nudge is large enough to matter the dcam
    // test below sees it and resets the count on its own. Resetting on both
    // double-counted the same event, and in a district that feeds the hero
    // every second or so it meant the settle could never finish: measured on
    // Pirate Bay, four re-asserts by t=8.8 with still stuck at 0/6.
    if (st.warped) still = 0;
    else if (st.dpos < 0.02 && st.dcam < CAM_TOL) still++;
    else still = 0;
    // SAY WHAT IT IS WAITING FOR. A probe that sits silent for twenty minutes
    // and then reports a timeout has told nobody which of its three conditions
    // was the one that would not close — and the settle is exactly where a
    // world with a busy crowd or a moving shore will hang.
    if (iters % 10 === 1) {
      console.log(`  settle t=${st.t.toFixed(2)} off=${st.off.toFixed(3)} dpos=${st.dpos === Infinity ? '   -  ' : st.dpos.toFixed(3)} `
        + `camDist=${st.cam.toFixed(1)} dcam=${st.dcam === Infinity ? '   -  ' : st.dcam.toFixed(3)} r=${st.r.toFixed(3)} `
        + `still=${still}/6 warps=${warps} reasserts=${reasserts}`);
    }
    // SIX stable samples, not one. __warpVoid snaps camera.position and
    // camFollow, but the teleport also spikes the look-ahead: :9291 feeds
    // (position - camPrevX)/dt into lookVX, and a jump of a hundred units in
    // one frame pins it at its clamp — 2.5 * camDist/60, about five units of
    // look-target offset — which then decays at 6/s. Six samples at 0.15 match
    // seconds is ~0.9s, five time constants, so under 1% of the spike survives
    // into the frame. Three samples would have left 9% of it, and a framing
    // that depends on how many warps the settle needed is the confound this
    // file exists to remove.
    if (still >= 6 && st.t >= SHOOT_T) break;
    // one sample per few frames, on the match clock — never on wall time
    await p.waitForFunction((t) => (window.__matchState?.().t ?? 0) > t, st.t + 0.15, { timeout: 600000 });
  }

  // AN ABSOLUTE MATCH TIME, not "0.4 seconds after whatever the settle took".
  // The settle finishes somewhere inside a 0.15-second sampling window, and a
  // relative wait would hand the crowd, the family and the newsroom a
  // different amount of match time in every run. When the settle finishes
  // early — the normal case — two runs therefore shoot at the same match
  // second. When it runs long (a late meal resets the stability count) the
  // frame is taken as soon as it does settle, and the verdict line prints the
  // real shutter time so nobody has to assume it.
  await p.waitForFunction((t) => (window.__matchState?.().t ?? 0) >= t, SHOOT_T + 0.4, { timeout: 600000 });

  // ── VERIFY THE WARP TOOK, BEFORE THE SHUTTER, NOT AFTER ─────────────────
  // If he is not on the spot, the frame is a photograph of somewhere else and
  // every comparison drawn from it is worthless. Fail loudly instead.
  const fin = await p.evaluate(({ x, z, r, hide }) => {
    const THREE = window.__THREE, cam = window.__cam;
    // THE LAST PINS AND THE READING HAPPEN IN THE SAME TICK, and that order was
    // learned the hard way. An earlier version re-asserted the radius and THEN
    // waited 0.4 match seconds for the shutter — eight frames in which the
    // Pirate Bay resort fed him back up to 4.075, and the check at the bottom
    // correctly refused to shoot. Correctly, and uselessly: the fix is not a
    // looser bar, it is to put him back at the last possible instant. `drift`
    // is what he had reached before that, and it is the number the bar below
    // actually tests — how hard the spot was pulling, not how well the last
    // assignment worked.
    const drift = window.__voidState().r;
    window.__setVoidR(r);
    window.__setMood?.('cruise');
    window.__pinMouth?.(true);
    window.__calm?.();          // and no leftover evolve ribbons across the shot
    // ── THE PROBE CLEANS UP AFTER ITSELF: the eat rings ────────────────────
    // Parking the hero in a dense district is what this file DOES, and a hero
    // parked in food eats — so `fx.ring` (proto3d/fx.ts:96) fires, and a salmon
    // annulus four to six void-radii across sits additively over a third of the
    // frame for up to 1.1 seconds. Whether one is on screen at the shutter
    // depends on when he last swallowed, which is exactly the run-to-run
    // difference this file exists to remove; on the first Maple frame taken
    // here it covered the middle third of the picture. It is also a difference
    // the PROBE causes, not the build. Hidden in this same tick, for the same
    // reason the radius is set here: one more meal between hiding them and the
    // screenshot would put one back.
    //
    // fx.ts:69-77 adds the whole pool — RING_POOL = 12 — as DIRECT children of
    // the scene: RingGeometry(0.86, 1, 48), MeshBasicMaterial, additive. Matched
    // on all of that, over scene.children only, never a deep traverse. The
    // count is checked below and a miss is a FAIL, because a probe that
    // silently skips what it cannot find describes the build it was written
    // against forever (docs/GOVERNOR.md, standing rule 4). Nothing else is
    // suppressed: the puffs, the bubbles and the world's own materials are
    // exactly as shipped.
    let rings = 0;
    for (const o of window.__scene.children) {
      if (!o.isMesh || o.geometry?.type !== 'RingGeometry') continue;
      if (o.geometry.parameters?.innerRadius !== 0.86) continue;
      if (o.material?.blending !== THREE.AdditiveBlending) continue;
      o.visible = false; rings++;
    }
    const vs = window.__voidState(), ms = window.__matchState();
    // HIDE_RIVALS: every direct scene child parked on a rival's (x, z) — the
    // body group sits at y≈r, its halo ring at y=0.14 (rivals.ts) — except
    // anything on the hero's own spot.
    let hidden = 0;
    if (hide) for (const rv of ms.rivals) {
      if (!rv.joined) continue;
      for (const o of window.__scene.children) {
        if (!o.visible || Math.hypot(o.position.x - rv.x, o.position.z - rv.z) > 2.5) continue;
        if (Math.hypot(o.position.x - vs.x, o.position.z - vs.z) < 0.5) continue;
        o.visible = false; hidden++;
      }
    }
    const wp = new THREE.Vector3(vs.x, vs.r, vs.z);
    const sp = wp.clone().project(cam);
    const camD = Math.max(1, cam.position.distanceTo(wp));
    return {
      x: vs.x, z: vs.z, r: vs.r, t: ms.t, camDist: ms.camDist, q: window.__quality(),
      off: Math.hypot(vs.x - x, vs.z - z),
      dr: Math.abs(vs.r - r), drift, rings, hidden,
      cx: (sp.x * 0.5 + 0.5) * innerWidth,
      cy: (1 - (sp.y * 0.5 + 0.5)) * innerHeight,
      pxR: (innerHeight / (2 * camD * Math.tan(cam.fov * Math.PI / 360))) * vs.r,
      face: window.__faceState?.() ?? null,
      // AND WHO ELSE IS IN IT. The family are movers on Math.random and this
      // file cannot pin them — a rival that wanders into shot brings a body,
      // a crown and its own ring with it, and on the first Maple frame taken
      // here one occupied the upper-left quadrant of the picture while the
      // previous run of the SAME build had none. That is a difference between
      // two frames that is not the build, so it is reported on every run
      // rather than left for a reader to notice. It is not a FAIL: rivals are
      // in the game, and a pair whose two halves agree is still a pair. It is
      // a FAIL to be quiet about it.
      //
      // ITS ONE KNOWN LIMIT, written here rather than tuned around: this tests
      // a rival's CENTRE against the frustum, so it is a LOWER BOUND. The
      // Maple frame of 2026-08-28 reports 0 rivals and still carries a salmon
      // arc across its left edge — a rival parked just outside the picture
      // whose own ground ring reaches into it. That ring is not fx.ts's pool
      // (all twelve of those are hidden two lines above) and this file does not
      // hunt it. If a pair disagrees at an edge and the family count says zero,
      // that is where to look.
      family: ms.rivals.filter((rv) => {
        const q = new THREE.Vector3(rv.x, rv.r, rv.z).project(cam);
        return Math.abs(q.x) <= 1 && Math.abs(q.y) <= 1 && q.z <= 1;
      }).map((rv) => `${rv.name} r${rv.r.toFixed(1)}${rv.joined ? '' : ' (unjoined)'}`),
      // WHAT IS ACTUALLY IN THE PICTURE, counted through the REAL camera at
      // the moment of the shutter — not a guess about what ought to be there.
      // A spot chosen for its props is a claim, and this is the number that
      // settles it; a frame that comes back nearly empty is a spot that needs
      // re-deriving, whatever the source comment says. Every edible that is
      // still alive, visible, and inside the frustum.
      ...(() => {
        let props = 0, biggest = 0;
        for (const e of window.__edibles) {
          if (e.eaten || !e.mesh.visible) continue;
          const q = e.mesh.position.clone().project(cam);
          if (Math.abs(q.x) > 1 || Math.abs(q.y) > 1 || q.z > 1) continue;
          props++; if (e.radius > biggest) biggest = e.radius;
        }
        return { props, biggest };
      })(),
    };
  }, { x: spot.x, z: spot.z, r: R, hide: HIDE_RIVALS });
  if (fin.off > POS_TOL || fin.dr > R_TOL || fin.q.pinned !== RUNG) {
    fail(`${WORLD} — the pins did not hold at the shutter: `
      + `wanted (${spot.x.toFixed(2)}, ${spot.z.toFixed(2)}) r${R} rung${RUNG}, `
      + `got (${fin.x.toFixed(2)}, ${fin.z.toFixed(2)}) r${fin.r.toFixed(3)} rung${fin.q.pinned}. Nothing shot.`);
  }
  if (fin.rings !== 12) {
    fail(`${WORLD} — expected fx.ts's 12-ring pool as direct children of the scene and found ${fin.rings}. `
      + `The pool has changed shape; re-derive the match in this file before trusting another frame. Nothing shot.`);
  }
  // HOW HARD WAS THE SPOT PULLING? The radius is exact in the frame because it
  // was set in the same tick as the shutter — but camDist LAGS the radius by
  // about 0.6 seconds (prototype3d.ts:9276), so if he had drifted a long way
  // before that reset, the lens is still framed for the bigger hero and the
  // picture is not the one this file promises. 3% of radius is about 2.4% of
  // follow distance, three units out of 129, which is inside the width of the
  // void's own outline on screen. Above that, say so and shoot nothing.
  if (Math.abs(fin.drift - R) > R * 0.03) {
    fail(`${WORLD} — the hero reached r${fin.drift.toFixed(3)} before the shutter reset him to ${R}: `
      + `more than 3% off, so camDist (${fin.camDist.toFixed(1)}) is still framed for the bigger void. `
      + `This spot feeds him continuously — re-derive it, or accept a different radius. Nothing shot.`);
  }

  // ── AND THE SPOT IS STILL WORTH PHOTOGRAPHING ───────────────────────────
  // A FLOOR, not a target. The point of a named spot is that the frame has the
  // world in it; a spot that has been emptied — by a world edit, by a coastline
  // moving, by the hero eating out a thin district — is a spot that needs
  // re-deriving, and a probe that shoots an empty field and says PASS has told
  // the studio nothing. Twenty is far below where any of the five sit today
  // (measured through this same counter, rung 0, r 4, follow distance 129:
  // maple 87, pirate 133, gameday 176, lantern 210, powder 156), so this can
  // only trip on something genuinely broken.
  if (fin.props < 20) {
    fail(`${WORLD} — only ${fin.props} edibles are in frame at (${spot.x.toFixed(2)}, ${spot.z.toFixed(2)}). `
      + `That is an empty field, not a photograph of a world; the spot needs re-deriving. Nothing shot.`);
  }

  const path = `${OUT}/${WORLD}_${TAG}.png`;
  // ── THE STAMP IS WRITTEN AFTER THE SCREENSHOT ───────────────────────────
  // Two fields: the digest of the source this frame was taken from, and the
  // sha256 of THE FRAME ITSELF. The one-field version diverged in the worst
  // way — a container restart reverted the untracked PNGs to an old snapshot
  // while the committed stamps survived, and qa/packfresh.mjs said PASS over
  // three-day-old pixels. And the ordering is not a detail: the first version
  // of the two-field stamp hashed the file at `path` BEFORE p.screenshot() had
  // replaced it, so it stamped the previous frame, and the gate caught its own
  // writer on all five worlds within minutes.
  await p.screenshot({ path, timeout: 600000 });
  const bytes = readFileSync(path);
  writeFileSync(`${OUT}/${WORLD}_${TAG}.src`,
    srcDigest() + ' ' + createHash('sha256').update(bytes).digest('hex').slice(0, 16));

  // ── AND THE FRAME IS NOT BLANK ──────────────────────────────────────────
  // The last of this file's bars, and like the others it is a floor rather
  // than a taste judgement: a screenshot taken through the wrong path comes
  // back as a flat fill (retraction 8 in docs/GOVERNOR.md — a canvas read
  // after __renderBloom returns the last COMPOSITED frame and measured 0/765).
  // A frame whose luminance spans less than two levels out of 256 is not a
  // photograph of a world. The MEAN beside it is DESCRIPTIVE and deliberately
  // has no bar on it: nothing in this file decides whether a build looks
  // better. That is the reader's job, with the pair in front of them, and a
  // probe that scored it would be inventing a taste metric, which is the
  // failure behind more than one retraction in docs/GOVERNOR.md.
  const png = PNG.sync.read(bytes);
  let lo = 255, hi = 0, sum = 0, n = 0;
  for (let i = 0; i < png.data.length; i += 4) {
    const l = 0.2126 * png.data[i] + 0.7152 * png.data[i + 1] + 0.0722 * png.data[i + 2];
    if (l < lo) lo = l; if (l > hi) hi = l; sum += l; n++;
  }
  const mean = sum / n / 255;
  if (hi - lo < 2) {
    fail(`${WORLD} — the frame is a flat fill (luminance ${lo.toFixed(1)}..${hi.toFixed(1)} of 255). `
      + `Something rendered, but it was not the world. ${path} kept for inspection.`);
  }

  console.log(`  spot   ${spot.name}`);
  console.log(`  ground (${spot.x.toFixed(2)}, ${spot.z.toFixed(2)}) solid=yes biome=${ground.biome}`);
  console.log(`  landed (${fin.x.toFixed(2)}, ${fin.z.toFixed(2)})  Δ${fin.off.toFixed(3)}u after ${warps} warp(s), ${reasserts} radius re-assert(s)`);
  console.log(`  hero   r=${fin.r.toFixed(3)} (wanted ${R}; drifted to ${fin.drift.toFixed(3)} before the shutter reset)  `
    + `mood=${fin.face?.mood ?? '?'} maw=${fin.face ? fin.face.maw.toFixed(3) : '?'} `
    + `smile=${fin.face?.smile} biting=${fin.face?.biting}`);
  console.log(`  props  ${fin.props} edibles in frame, biggest r=${fin.biggest.toFixed(2)}`);
  if (HIDE_RIVALS) console.log(`  hidden ${fin.hidden} rival object(s) at the shutter (HIDE_RIVALS=1)`);
  console.log(`  family ${fin.family.length} rival(s) in frame${fin.family.length ? ': ' + fin.family.join(', ') : ''}`);
  console.log(`  lens   camDist=${fin.camDist.toFixed(1)}  void at (${fin.cx.toFixed(0)}, ${fin.cy.toFixed(0)}) r=${fin.pxR.toFixed(0)} css px`);
  console.log(`  rung   ${fin.q.level} pinned=${fin.q.pinned} pr=${fin.q.pr} shadows=${fin.q.shadows}`);
  console.log(`  rings  ${fin.rings} eat-ring meshes hidden in the shutter tick (fx.ts's pool)`);
  console.log(`  frame  ${png.width}x${png.height}  luminance ${(lo / 255).toFixed(3)}..${(hi / 255).toFixed(3)} mean ${mean.toFixed(4)} (descriptive)`);
  console.log(`  stamp  ${readFileSync(`${OUT}/${WORLD}_${TAG}.src`, 'utf8')}`);
  say(true, `${WORLD} shot at the fixed spot — t=${fin.t.toFixed(2)} match s, camDist ${fin.camDist.toFixed(1)}, `
    + `Δ${fin.off.toFixed(3)}u off the mark, ${fin.props} props and ${fin.family.length} rival(s) in frame → ${path}`
    + (fin.family.length ? `\n  NOTE   a rival is in this frame and this probe cannot pin one. If the other `
      + `half of the pair does not have the same rivals in the same places, the difference between the two `
      + `frames is not only the build — re-shoot until they agree, or read around them.` : ''));
  done = true;
} catch (e) {
  const m = String(e && e.message ? e.message : e).split('\n')[0];
  if (!done && m !== QUIT) say(false, `${WORLD} — ${m}`);
} finally {
  await b.close().catch(() => {});
}
process.exit(done ? 0 : 1);
