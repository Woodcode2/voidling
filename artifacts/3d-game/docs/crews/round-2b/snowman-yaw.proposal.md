# ROUND 2B — crew:snowman-yaw proposal

**Status: PROPOSAL ONLY. No skeptic has ruled. Nothing here has landed.**

Re-derived from scratch per docs/CREWS-ROUND-2.md (the round-2 original is
lost). Every line number below was verified on disk 2026-08-27. Every number
in this file was either run by this crew today (the sign check and the bar
simulations, commands included) or is cited to the file that recorded it.

---

## decision (crew's own framing)

Decision 3 — "sure." Owner doc gloss: "Snowmen face the camera. The fixed
225-degree camera azimuth makes this a placement-yaw change, jittered so the
field does not look drilled" (docs/OWNER-2026-08-25.md).

One correction to the retained round-2 outline before anything else: the
outline says "alpine.ts snowmen share a fixed facing." **On disk they do
not.** All five snowman drop sites in the powder block already pass
`rnd2() * Math.PI * 2` — a uniform spin (island.ts:5184, :5194, :5221,
:5229-5230, :5294-5295). The defect is not sameness, it is that a uniform
spin points a third of the snowmen into the hillside: alpine.ts's own 36-yaw
sweep (recorded at alpine.ts:482-489, beside the recent brim 0.30\*k fix at
:495) measured a snowman's eyes reaching the camera from only 54% of yaws
(topper, pre-brim-fix) / 68% (bobble). The brim fix widened the per-snowman
visible arc; this patch is the other half its comment names ("the rest is the
yaw"): put every snowman INSIDE the visible arc, each at its own angle.

So the patch replaces uniform spin with **-PI/4 +/- 60 degrees of jitter** at
the five drop sites, and tags every snowman `qk: 'snowman'` so the probe can
census them. alpine.ts is untouched.

## title

Snowman yaw: every face into the lens arc, no two alike

---

## the derivation everything hangs on — WHICH yaw faces the camera

The snowman builder puts the face on **local +X**: coal eyes at
`(wob*2 + 0.27)*k`, carrot at `(wob*2 + 0.42)*k`, both +X of centre
(alpine.ts:461-464); buttons down the +X side (:466-467).

The camera rides the hero at `camOffset (0.62, 0.92, 0.62)` normalized
(prototype3d.ts:600). Growth steepens pitch but `x` always equals `z`
(:9217, `0.62->0.45` on both, same expression), so the azimuth is fixed for
the whole match: from any prop, "toward the lens" is the constant world
ground direction **(+1, 0, +1)/sqrt(2)**, at every player size.

Three.js `rotation.y = t` sends local +X to world `(cos t, 0, -sin t)`.
Setting `cos t = 1/sqrt(2)`, `-sin t = 1/sqrt(2)` gives **t = -PI/4**
(315 degrees) dead-on.

**How the sign was verified — four legs, because a flipped sign is the one
error that makes this patch strictly worse than the bug:**

1. **Empirically, against the repo's own three.js build** (run 2026-08-27,
   node, `three/build/three.module.js` from this repo's node_modules):

   ```js
   const o = new THREE.Object3D(); o.rotation.y = -Math.PI / 4;
   o.updateMatrixWorld(true);
   new THREE.Vector3(1, 0, 0).applyQuaternion(o.quaternion)
   // -> (0.7071, 0.0000, 0.7071); dot with normalized (0.62, 0, 0.62) = 1.000000
   ```

   Arc edges also run: t = -105deg and t = +15deg both measure dot 0.5000 =
   cos(60deg) toward the lens.

2. **The shipped dress precedent** (void3d.ts:2041):
   `dress.rotation.y = atan2(dx, dz)` points a **+Z**-front at the camera,
   and hats visibly face the lens in every frame in the repo. A +X front is
   the +Z front rotated: `atan2(dx, dz) - PI/2` with `(dx, dz) = (1, 1)`
   gives `PI/4 - PI/2 = -PI/4`. Same answer.

3. **The shipped signpost precedent** (island.ts:5209): boards are built
   pointing local +X (alpine.ts:687-704), the piste tangent's math bearing is
   `ang = atan2(dy, dx)` (bay.ts:172), and the call site passes `-pp.ang` —
   i.e. the repo's own working rule is "face 2D bearing beta => rotY = -beta".
   The lens bearing is `atan2(+1, +1) = +PI/4`, so rotY = -PI/4. Same answer.

4. **The screenshot leg below** — mandatory, because the numeric probe shares
   the -PI/4 constant with the patch and therefore CANNOT catch a wrong-signed
   design. Only a rendered frame can. (It would be unmissable: a flipped sign
   shows every snowman's scarf-tail and hat-back, zero eyes, in every frame.)

**Why +/-60 degrees.** Both jitter extremes keep the face within 60 degrees
of the lens axis (dot 0.5, measured above) — inside even the WORST recorded
eyes-visible arc (54% of 360 = ~+/-97 degrees, topper pre-brim-fix; bobble
~+/-122; both derived from alpine.ts:482-489's recorded sweep), with ~35
degrees to spare against the narrow one. Wide enough that a 120-degree band
sampled continuously never reads as drilled (bar simulation below); narrow
enough that zero snowmen show the back of the head. And the fiction holds:
this world's stated register is everyone watching the hole (alpine.ts:38-44),
and the snowmen are built "mid-wave when the hole arrived" (:468). Waving AT
the camera is in-register; chalets keep facing the lake.

---

## patch 1 — src/proto3d/island.ts (the helper)

**anchor:** line 5163, `const rnd2 = Math.random;` — the only occurrence in
the file (grepped), two lines below the powder `drop()` at :5154.

**before:**
```ts
    const rnd2 = Math.random;
```

**after:**
```ts
    const rnd2 = Math.random;
    // ── SNOWMAN YAW — owner decision 3, 2026-08-26: "sure" ────────────────
    // The face is built on local +X (alpine.ts:461-464). rotation.y = t sends
    // local +X to world (cos t, 0, -sin t), and the camera rides the hero at
    // camOffset (0.62, 0.92, 0.62) (prototype3d.ts:600) whose x equals z at
    // every zoom (:9217) — fixed azimuth, so "toward the lens" is the constant
    // world direction (+1, 0, +1)/sqrt2 from every prop, all match long.
    // cos t = -sin t = sqrt(1/2) gives t = -PI/4 dead-on (verified against
    // this repo's three: applyQuaternion measures dot 1.000000; the signpost
    // at :5209 and the dress yaw at void3d.ts:2041 agree). +/-60deg of jitter
    // keeps every face inside the arc the eyes actually reach the camera from
    // (alpine.ts:482-489: 54%/68% of a 36-yaw sweep = arcs of ~+/-97/122deg)
    // while no two snowmen share a yaw. ONE rnd2() draw, exactly like the
    // uniform spin this replaces at each site, so the Math.random sequence
    // downstream of every call site is unchanged. qa/snowyaw.mjs reads the
    // tagged census live and FAILED on the uniform-spin build.
    const snowmanYaw = () => -Math.PI / 4 + (rnd2() - 0.5) * (Math.PI * 2 / 3);
```

**why:** one constant, one draw, defined beside the RNG it consumes, scoped to
the powder block because yaw is placement policy, not a builder property —
the file's own doctrine ("an explicit rotY from a call site still wins",
island.ts:5125). Yaw range is [-105deg, +15deg], i.e. 315 +/- 60.

## patch 2 — src/proto3d/island.ts (village clutter)

**anchor:** lines 5180-5185, the village small-stuff scatter; drop at :5184.

**before:**
```ts
    for (const p2 of PW.scatterInRegion(REG('village'), 40, rnd2, 90)) {
      const kind = rnd2();
      const mesh = kind < 0.3 ? AL.makeSnowman() : kind < 0.55 ? AL.makeSled()
        : kind < 0.72 ? AL.makeLogPile() : kind < 0.88 ? AL.makeSkiRack() : AL.makeSnowballStack();
      drop(mesh, p2, kind < 0.3 ? 1.0 : 0.6, rnd2() * Math.PI * 2, false, kind < 0.3 ? 'snowman' : undefined);
    }
```

**after:**
```ts
    for (const p2 of PW.scatterInRegion(REG('village'), 40, rnd2, 90)) {
      const kind = rnd2();
      const mesh = kind < 0.3 ? AL.makeSnowman() : kind < 0.55 ? AL.makeSled()
        : kind < 0.72 ? AL.makeLogPile() : kind < 0.88 ? AL.makeSkiRack() : AL.makeSnowballStack();
      drop(mesh, p2, kind < 0.3 ? 1.0 : 0.6, kind < 0.3 ? snowmanYaw() : rnd2() * Math.PI * 2, false, kind < 0.3 ? 'snowman' : undefined);
    }
```

**why:** the snowman branch (`kind < 0.3`, ~12 of 40 attempts) takes the lens
arc; sleds, log piles, racks and stacks keep their uniform spin. Both branches
of the ternary consume exactly one `rnd2()` draw, so every later prop in the
build lands identically. The site already tags `'snowman'`.

## patch 3 — src/proto3d/island.ts (the contest cluster)

**anchor:** lines 5193-5194, inside the square block.

**before:**
```ts
      for (const p2 of PW.clusterAt(cx - 300, cy - 220, 5, 220, rnd2))
        drop(AL.makeSnowman(), p2, 1.0, rnd2() * Math.PI * 2, false, 'snowman');
```

**after:**
```ts
      for (const p2 of PW.clusterAt(cx - 300, cy - 220, 5, 220, rnd2))
        drop(AL.makeSnowman(), p2, 1.0, snowmanYaw(), false, 'snowman');
```

**why:** the contest is the hero snowman shot (the world-picker beat
`powder.contest` at prototype3d.ts:3613 points a child straight at it) and
today an average of ~1.9 of its five entrants face away from the lens
(uniform arc share, arithmetic below). One draw before, one draw after.

## patch 4 — src/proto3d/island.ts (lake-shore cluster)

**anchor:** lines 5219-5222.

**before:**
```ts
    for (const p2 of PW.clusterAt(PW.LAKE.cx + PW.LAKE.rx * 0.7, PW.LAKE.cy + PW.LAKE.ry * 0.6, 6, 320, rnd2)) {
      const kind = rnd2();
      drop(kind < 0.4 ? AL.makeSled() : kind < 0.7 ? AL.makeSkiRack() : AL.makeSnowman(), p2, kind < 0.4 ? 0.55 : 1.0, rnd2() * Math.PI * 2);
    }
```

**after:**
```ts
    for (const p2 of PW.clusterAt(PW.LAKE.cx + PW.LAKE.rx * 0.7, PW.LAKE.cy + PW.LAKE.ry * 0.6, 6, 320, rnd2)) {
      const kind = rnd2();
      drop(kind < 0.4 ? AL.makeSled() : kind < 0.7 ? AL.makeSkiRack() : AL.makeSnowman(), p2, kind < 0.4 ? 0.55 : 1.0,
        kind < 0.7 ? rnd2() * Math.PI * 2 : snowmanYaw(), false, kind < 0.7 ? undefined : 'snowman');
    }
```

**why:** same one-draw-per-branch shape. This site never tagged its snowmen;
it does now, purely so the probe's census is complete. `drop`'s `force`
parameter already defaults to `false` (island.ts:5154), so passing it
explicitly to reach the `qk` slot changes nothing.

## patch 5 — src/proto3d/island.ts (spawn snack ring)

**anchor:** lines 5227-5231.

**before:**
```ts
    for (const p2 of PW.clusterAt(PW.PW_SPAWN[0] + 300, PW.PW_SPAWN[1] - 200, 8, 380, rnd2)) {
      const kind = rnd2();
      drop(kind < 0.5 ? AL.makeSled() : kind < 0.8 ? AL.makeSnowballStack() : AL.makeSnowman(), p2,
        kind < 0.5 ? 0.55 : kind < 0.8 ? 0.6 : 1.0, rnd2() * Math.PI * 2);
    }
```

**after:**
```ts
    for (const p2 of PW.clusterAt(PW.PW_SPAWN[0] + 300, PW.PW_SPAWN[1] - 200, 8, 380, rnd2)) {
      const kind = rnd2();
      drop(kind < 0.5 ? AL.makeSled() : kind < 0.8 ? AL.makeSnowballStack() : AL.makeSnowman(), p2,
        kind < 0.5 ? 0.55 : kind < 0.8 ? 0.6 : 1.0, kind < 0.8 ? rnd2() * Math.PI * 2 : snowmanYaw(),
        false, kind < 0.8 ? undefined : 'snowman');
    }
```

**why:** these are the snowmen a child sees in the first three seconds (the
ring exists for the FTUE first meal, per the comment at :5225-5226). Same
one-draw shape; tag added for the census.

## patch 6 — src/proto3d/island.ts (mid-size fill)

**anchor:** lines 5290-5296.

**before:**
```ts
    for (const p2 of PW.scatterLand(320, rnd2, 60)) {
      const kind = rnd2();
      const mesh = kind < 0.5 ? AL.makePine(3 + rnd2() * 3) : kind < 0.72 ? AL.makeSnowman()
        : kind < 0.88 ? AL.makeDrift() : AL.makeLogPile();
      drop(mesh, p2, kind < 0.5 ? 1.3 : kind < 0.72 ? 1.0 : kind < 0.88 ? 0.95 : 0.9,
        rnd2() * Math.PI * 2, false, kind >= 0.72 && kind < 0.88 ? 'drift' : undefined);
    }
```

**after:**
```ts
    for (const p2 of PW.scatterLand(320, rnd2, 60)) {
      const kind = rnd2();
      const mesh = kind < 0.5 ? AL.makePine(3 + rnd2() * 3) : kind < 0.72 ? AL.makeSnowman()
        : kind < 0.88 ? AL.makeDrift() : AL.makeLogPile();
      drop(mesh, p2, kind < 0.5 ? 1.3 : kind < 0.72 ? 1.0 : kind < 0.88 ? 0.95 : 0.9,
        kind >= 0.5 && kind < 0.72 ? snowmanYaw() : rnd2() * Math.PI * 2, false,
        kind >= 0.72 && kind < 0.88 ? 'drift' : kind >= 0.5 && kind < 0.72 ? 'snowman' : undefined);
    }
```

**why:** the biggest snowman population (~70 of 320 attempts) and the one the
far field is made of — a back-turned snowman at distance is a white blob with
a scarf, a lens-facing one carries eyes, buttons and carrot, which is exactly
the accent-pixel argument TEAM STATIC's brim finding already established
(alpine.ts:490-494). The existing `'drift'` tag is load-bearing (the SNOW
SHELL check at prototype3d.ts:5014 keys on it) and is preserved verbatim in
the extended ternary; pines and drifts keep uniform spin (pines are
noFront-tagged, but the explicit rotY wins, per :5126 — unchanged behaviour).

---

## draw accounting

**Seeded stream (mrnd/mr/mpick/mchance — the Maple mulberry32, load-bearing
per GOVERNOR.md HANDS OFF): delta ZERO, added and removed.** Grepped
2026-08-27: no seeded call anywhere in the powder block (island.ts:5144-5299)
nor anywhere in alpine.ts (the only textual hit is the accounting comment at
alpine.ts:252). This patch introduces none. Maple Falls cannot move.

**Unseeded stream (Math.random, which is what `rnd2` IS — island.ts:5163):
count- and position-identical.** At every one of the five sites the yaw
argument consumed exactly ONE `rnd2()` draw before the patch and consumes
exactly ONE after — `snowmanYaw()` contains a single `rnd2()`, and every
branch of every new conditional draws exactly once. No other expression is
touched; alpine.ts's internal `rnd`/`pick`/`Math.random` calls are untouched.
Powder has no load-to-load determinism to protect (it rebuilds from
Math.random every load, unlike Maple), so this parity is hygiene rather than
necessity — but it means the patch is placement-inert for every non-snowman
prop: same number of draws, same order, so given the same underlying sequence
every sled, pine, drift and chalet lands exactly where it would have.

**Population arithmetic** (branch expectation, not a measurement — the landed
count depends on `spotOpen` rejections and the probe reports the real one):
40x0.3 + 5 + 6x0.3 + 8x0.2 + 320x0.22 = ~91 snowman drop attempts per load.

## triangle cost

**Zero.** No geometry, no materials, no draw calls, no new meshes. The patch
writes one rotation scalar and one `userData.qk` string per snowman. The tag
is behaviour-neutral, verified by grep of every `qk` consumer: `MEAL_NAME`
has no `snowman` key (prototype3d.ts:3701-3710) so `lastMeal` falls through
to `mealOf()` exactly as with `qk` undefined; `mealOf()` tests only
`'goat'`/`'car'` (:3719-3720); the shell check tests `'drift'` (:5014);
rivals' sink check tests `'house'` (rivals.ts:771). Sites 2-3 (patches 2-3)
have shipped the `'snowman'` tag for some time already with no consumer —
extending it to the other three sites only completes the census.

---

## the probe — qa/snowyaw.mjs (new file, lands WITH the patch)

Placement census, not a match-time measurement — placements are complete once
the edible count is stable, so it uses variety.mjs's settle discipline rather
than the match clock (rule 4's wrong-clock trap does not apply to a build-time
census; the boot and stability waits are copied from the shipped
variety.mjs:74-86 verbatim, including the comma-joined `voidUnlocked` TRAP).

**Bars, and why each fails on the build it must fail on** (simulation run by
this crew 2026-08-27, node, 10,000 trials each; the script is four lines of
arithmetic per bar and a skeptic can rerun it from this file's description):

- **ARC** — every tagged snowman's `rotation.y` within circular distance
  `PI/3 + 1e-6` of `-PI/4`. On the PRE-patch build yaws are uniform, measured
  inside-share 0.332 in simulation (expected 1/3), and the all-inside
  assertion came up falsely green **1 in 10,000 trials at N=8** — with the
  real N in the tens it is astronomically red. FAILS BEFORE, as GOVERNOR
  rule 2 demands.
- **DISTINCT** — no two snowmen with bit-identical `rotation.y` ("no two
  stare down the same axis", the brief's words, taken literally). Under the
  patch a collision needs two identical float64 draws (P ~ N^2 / 2^53);
  a regression to a shared constant trips it instantly.
- **DRILL** — the top 5-degree bucket (variety.mjs's own bucketing, :96)
  holds at most 25% of the snowmen. A constant-yaw "fix" puts 100% in one
  bucket; the patched jitter measured a false-red **0 in 10,000 trials at
  N=60**.
- **SELF-CHECK** — fewer than 8 tagged snowmen: FAIL loudly and refuse to
  conclude (a census that finds nothing is not a PASS — GOVERNOR: silence is
  a FAIL). This is why patches 4-6 add the missing tags.

```js
// DO THE SNOWMEN FACE THE LENS? — owner decision 3 ("sure"), round 2b.
//
// The claim: every snowman's placement yaw sits inside -PI/4 +/- PI/3 (the
// camera-facing arc for a +X-front prop under camOffset (0.62, 0.92, 0.62)),
// no two share a yaw, and no 5-degree bucket holds the field.
//
// FAILS BEFORE the patch: the uniform-spin build admits ~1/3 of snowmen to
// the arc, so all-inside is green with probability (1/3)^N — simulated
// 1/10000 at N=8, and N here runs in the tens.
//
// LIMIT, stated: this probe shares the -PI/4 constant with the patch, so it
// verifies the patch LANDED AS DESIGNED and cannot catch a wrong-signed
// DESIGN. The screenshot leg in the proposal is the independent check for
// the sign. Run both once; only this one gates thereafter.
//
// TRAP (variety.mjs, verbatim): voidUnlocked is a COMMA-JOINED STRING.
// TRAP (variety.mjs, verbatim): props register asynchronously — wait for a
// stable edible count before counting anything.
//
//   node qa/snowyaw.mjs [port]
import { chromium } from 'playwright';

const PORT = process.argv[2] || '4177';
const CEN = -Math.PI / 4, HALF = Math.PI / 3 + 1e-6;
const MIN_N = 8;          // fewer tagged snowmen = census broken, refuse to conclude
const MAX_BUCKET = 0.25;  // anti-drill: top 5-deg bucket holds at most 25%

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString());
  localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder');
} catch {} });
await p.goto(`http://127.0.0.1:${PORT}/?w=powder`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.waitForFunction(() => {
  const n = window.__edibles.length;
  if (window.__lastN !== n) { window.__lastN = n; window.__stableSince = performance.now(); return false; }
  return performance.now() - (window.__stableSince || 0) > 2000;
}, null, { timeout: 300000, polling: 250 });

const yaws = await p.evaluate(() =>
  window.__edibles.filter(e => e.mesh?.userData?.qk === 'snowman').map(e => e.mesh.rotation.y));
await b.close();

if (yaws.length < MIN_N) {
  console.log(`FAIL — only ${yaws.length} snowman-tagged props found (need ${MIN_N}): `
    + `the census or the tags are broken; refusing to conclude`);
  process.exit(1);
}
const circ = (a, c) => { const d = Math.abs(a - c) % (Math.PI * 2); return d > Math.PI ? Math.PI * 2 - d : d; };
const outside = yaws.filter(y => circ(y, CEN) > HALF).length;
const buckets = new Map();
for (const y of yaws) {
  const deg = Math.round((((y % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) * 180 / Math.PI / 5) * 5;
  buckets.set(deg, (buckets.get(deg) || 0) + 1);
}
const top = Math.max(...buckets.values());
const dup = yaws.length !== new Set(yaws).size;
console.log(`  ${yaws.length} snowmen — ${outside} outside 315+/-60deg, `
  + `top 5-deg bucket ${top} (${(top / yaws.length * 100).toFixed(0)}%) across ${buckets.size} buckets, `
  + `exact duplicates: ${dup}`);
const bad = [];
if (outside) bad.push(`${outside} snowmen face outside the camera arc`);
if (dup) bad.push('two snowmen share a bit-identical yaw');
if (top / yaws.length > MAX_BUCKET) bad.push(`one 5-deg bucket holds ${(top / yaws.length * 100).toFixed(0)}% (bar ${MAX_BUCKET * 100}%) — drilled`);
console.log(bad.length ? 'FAIL — ' + bad.join('; ') : 'PASS — every snowman faces the lens arc, no two alike');
process.exit(bad.length ? 1 : 0);
```

## the screenshot leg — the independent check for the SIGN, judged like this

Run ONCE on the before build and ONCE on the after build, then the numeric
probe gates forever. Procedure:

1. Boot powder through the real entry — PLAY, then the powder card. `?w=`
   alone lands on the menu with the match never started; this is the recorded
   trap at qa/faceparity.mjs:129-137.
2. In the page, list `__edibles` with `userData.qk === 'snowman'`, take the
   contest cluster (the five tagged snowmen nearest each other), and
   `_dbg.__warpVoid(cx, cz)` to their centroid (the warp exists at
   prototype3d.ts:1859 and drags the camera with it). The cluster spread is
   ~11 3D units (clusterAt radius 220 world units x SCALE 0.05); the frame
   reaches ~14 units past the hero at spawn size (docs/OWNER-2026-08-25.md),
   so the cluster fits without touching the void's size. Screenshot the
   canvas. Repeat for the two next-densest snowman groups: three frames,
   at least 8 fully-visible snowmen total.
3. **Judgment, binary, fixed in advance:** a snowman is BACK-TURNED if
   neither coal eye nor any part of the orange carrot is visible in the
   frame (the back view offers only scarf tail and white spheres — the
   buttons sit on the face side, alpine.ts:466-467, so ambiguity is low).
   - AFTER build PASSES iff **zero** back-turned snowmen across all three
     frames. One back-turned snowman = the patch failed (and if ALL are
     back-turned, the sign is flipped — reject, flip the constant's sign
     only after re-running derivation leg 1).
   - BEFORE build must show **at least one** back-turned snowman across the
     same three frames, or the shot is not exercising the defect. Expected:
     roughly a third back-turned; the chance a uniform build shows zero
     across 8+ snowmen is 0.54^8..0.68^8 = ~0.6%..4.6% (derived from
     alpine.ts:482-489's arcs). If it happens, re-shoot once; twice zero
     means investigate the shooter, not the patch.

Rule-5 note (verify from the front): the frames are taken from the play
camera, which for this defect IS the front — the whole point is that this
camera's azimuth never changes.

**variety.mjs interplay, so the skeptic need not wonder:** powder's
MAX_SHARED_FACING bar (0.55) is untouched by concentrating ~91 snowmen into a
120-degree band — they spread across ~24 five-degree buckets (~4 props per
bucket) inside a world whose thousands of lumps, drifts and pines keep
uniform spin. The `never-turned` share is also unchanged: every snowman still
receives an explicit rotY.

---

## side observation, NOT part of this patch — filed as a LEAD (rule 1: PENDING)

Resolving the repo's three bearing conventions surfaced this: the lodge is
dropped with `PW.pwFacingLodge(PW.LODGE.cx, PW.LODGE.cy + 2000) + Math.PI`
(island.ts:5169). `pwFacingLodge` returns the math bearing TO the lodge
(powder.ts:246-247), so from the point 2000 south of it that is
`atan2(-2000, 0) = -PI/2`; plus PI = `+PI/2`. Under the convention verified
four ways above (`rotY = -bearing` to face a bearing — the same rule the
signposts at :5209 use correctly), `rotY = +PI/2` points the lodge's +X
front — the G_HEARTH doorway, "the warmest note in the map ... approached
head-on from spawn" (alpine.ts:294, :337-341) — at 2D bearing `-PI/2`:
**north, into the wall behind it**, 180 degrees from the piste. If real, the
hearth glow authored to be visible from spawn has never been on camera, and
the fix is deleting `+ Math.PI` and negating: `-pwFacingLodge(...)`. This
crew has NOT rendered a frame to confirm and does not propose the change —
it is exactly one screenshot's work for whichever crew or skeptic next has a
renderer up, and it is recorded here so it stops hiding.

## risks

1. **The sign** — the one catastrophic failure mode, and the numeric probe is
   structurally blind to it (shared constant). Mitigated by four independent
   derivation legs above, of which one is empirical against the repo's own
   three.js and one is a mandatory rendered A/B with a fixed judgment. Residual
   risk after both: negligible.
2. **Drilled look.** 120 degrees of continuous jitter across ~24 buckets;
   DRILL bar plus the screenshot judge. If the owner wants looser, the arc is
   one constant (`Math.PI * 2 / 3`) — a retune, not a redesign.
3. **Fiction tension** — chalets face the lake, snowmen now face the lens.
   Covered by the owner's own decision ("Snowmen face the camera") and by the
   kit's register: snowmen built mid-wave at the arriving hole (alpine.ts:468).
4. **The `'snowman'` tag acquiring a consumer later** (a meal name, a quest
   hook) — then patches 4-6 changed behaviour retroactively. Today's grep says
   no consumer exists; the tag has shipped on two sites for some time. A
   future consumer must expect ALL snowmen tagged, which after this patch is
   true for the first time.
5. **Probe floor N=8 on a sparse rebake.** If a future density pass cuts
   snowman counts, the probe fails loudly rather than passing on thin data —
   deliberate; it prints the census so sparse-world and lost-tags are
   distinguishable.
6. **Debug views** (TOPDOWN at prototype3d.ts:9596, ASSETVIEW at :9595) look
   from other angles, where the bias reads as a uniformly-turned field.
   Debug-only, no child ever sees them.
7. **Interaction with the brim fix** (alpine.ts:495, `0.30 * k`, the recent
   change): none negative — strictly compositive. The brim fix widened each
   snowman's eyes-visible arc; this patch places every snowman inside it. If
   the brim were ever reverted to 0.36, the topper's visible arc (~+/-97deg
   at spawn pitch) still contains this patch's +/-60deg band with margin.
