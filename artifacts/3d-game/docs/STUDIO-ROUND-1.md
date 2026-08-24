# THE STUDIO — ROUND 1, 2026-08-24

## STATUS: INCOMPLETE, AND THESE FINDINGS ARE UNREFUTED

The run hit an account session limit part way through. What that means for
anyone reading this:

| | |
|---|---|
| **Reported** | TEAM STATIC, TEAM MOTION, TEAM GROUND — the three reviews below |
| **Never ran** | TEAM LIGHT, TEAM HERO, TEAM UI, TEAM CHOREOGRAPHY, TEAM AUDIO |
| **Never ran** | the SKEPTIC for all three teams that did report |
| **Never ran** | ART DIRECTION, and the governor's order of work |

**The skeptic pass is the half that did not happen, and it is the half that
matters most.** Charter rule: a finding counts only once an independent party has
opened the cited file and failed to kill it. Nothing below has been through that.
Treat every finding here as a *claim*, not a defect, until it is checked — this
project has six standing retractions because a confident wrong finding is
persuasive.

The governor verified two load-bearing claims by hand before this file was
committed; those are marked in the notes below. Everything else is the team's
word.

**To resume rather than re-run:** the three completed reviews are cached by the
workflow runtime, so a resume replays them instantly and only the failed agents
cost anything:

```
Workflow({ scriptPath: '/home/user/voidling/.claude/workflows/studio.js',
           resumeFromRunId: 'wf_2b68fae5-95f' })
```

---


═══════════════════════════════════════════════════════════════════
TEAM STATIC
═══════════════════════════════════════════════════════════════════
--- THE TEAM'S REVIEW ---
## VERDICT: NO-SHIP

The most-placed small prop in Maple Falls is a flat-faceted 20-face die with gumballs stuck to it, and the town's namesake tree still reads as a bunch of balloons after the fix that was supposed to close it — both are visible three times over in the single hero screenshot.

## THE BAR

**Donut County** (Ben Esposito, 2018 — Apple Design Award, App Store Game of the Year finalist). Same genre we are in: a hole eats a town, camera locked high and looking down. What it does mechanically is the thing this repo has not internalised — **because the camera looks down, the roof is the facade.** Every Donut County object is authored top-first: roofs carry a second colour band and a ridge/seam line, awnings are pitched rather than flat, and small dressing (plants, cacti, trash) is built from a *stem-and-blade profile* rather than a ball, because a ball has no top and no silhouette from above. Nothing in that game presents a large single-colour horizontal face to the camera.

Second bar, for the canopy only: **Animal Crossing: New Horizons.** Its trees never resolve into individual lobes. Mechanically: the canopy is a *dark mass* with small light accents on top, not light lobes with dark accents on the outside, and the underside is roughly a full stop down from the crown.

Where we sit: only POWDER PASS has understood the roof rule — `alpine.ts` `capRoof()` gives every chalet slate + a snow cap + a cornice cylinder + a chimney, and it is the only world in the five where buildings read as buildings from above. Maple, Lantern, Pirate and Game Day all present their largest horizontal surfaces as one flat untextured colour. On canopies we are behind AC:NH by a structural inversion, not by a tuning amount.

## FINDINGS

### The flower bed is a green d20 with gumballs on it
SEVERITY: blocker
AT: src/proto3d/island.ts:4403
SAW: `maple_trees.png` — four of them in one frame, at roughly (240,1290), (430,1300), (115,890), (110,1420). Each is a hard-faceted green polyhedron with individual triangular faces catching separate flat tones, with 4–5 coloured balls sitting on it. Two of them (the red ball at ~(250,1265), the purple at ~(455,1290)) hang past the edge of the mound with daylight under them. Three feet away in the same frame sit `makeBush` instances that are smooth. Same shot in `maple_look.png`. This is the *exact* pathology the codebase has already condemned twice in writing — island.ts:4300 ("ONE SPHERE IS JELLY"), mainstreet.ts:1662 ("a pile of orange rocks") — left standing in the prop that gets placed more than any other.

EVIDENCE:
```ts
function makeFlowers(): THREE.Group {
  const parts = [part(new THREE.IcosahedronGeometry(0.7, 0), 0x5db06a, 0, 0.5, 0, 0, 0, 0, 1, 0.7, 1)];
  for (let i = 0; i < 5; i++)
    parts.push(part(new THREE.SphereGeometry(0.16, 6, 5), pick([...]), rand(-0.5, 0.5), 0.8, rand(-0.5, 0.5)));
  const g = new THREE.Group(); g.add(mergedProp(parts));
```
And the reason the gates never caught it — island.ts:3677:
```ts
const ROUND_GEO = /^(Cylinder|Cone|Sphere|Torus|Lathe|Capsule|Tube)/;
```
`Icosahedron` is not in that list, so `roundV = 0` for the mound — but the five blossoms *are* round, so `mergedProp`'s vote is 5/6 = 0.83 ≥ `ROUND_SHARE` and the whole prop is assigned `PROP_SMOOTH_MAT` (island.ts:3462). `PolyhedronGeometry` carries per-face normals, which `part()`'s `toNonIndexed()` preserves, so the mound renders faceted *on the smooth material*. `qa/shading.mjs` counts those triangles in its **smooth %** column. The probe reports the material, not the normals, and the material is a lie here.

Also: `makeFlowers` is in 9 of the 11 Maple biome pools (island.ts:4476–4490), double-weighted in `cozy` and `park`, plus the shared `makeTinyProp` pool at 4444 and six direct scatter loops (5623, 5769, 5814, 5864, 6226, 6253, 6832).

FIX: swap the mound to `SphereGeometry(0.7, 9, 6)` scaled `(1, 0.7, 1)` — it then matches `ROUND_GEO`, the auto-classifier keeps working, and it shades smoothly. Give each blossom a stem (`CylinderGeometry(0.02, 0.03, 0.28, 4)`) and seat the blossom on the mound surface instead of a fixed `y = 0.8`, which is what puts them in the air at the corners. Cost: **zero draw calls, zero materials** (still one merged mesh); +70 tris for the sphere, +40 for five stems ≈ **+110 tris per bed**. Across Maple that is well under 100k triangles and ~4 MB of vertex data — an order of magnitude cheaper than the three-lobe treatment `makeBush` got, and the failure here is facets, not lobe count. **No determinism cost:** `pick`/`rand` (island.ts:268, 284) are `Math.random`, not the seeded `mrnd` stream, so the internal draw count is free to change.

GATE: `qa/normals.mjs` — walk every registered edible; for each mesh whose material is `PROP_SMOOTH_MAT`, count triangles where all three vertex normals agree (dot > 0.9999) and report the fraction per prop builder. A prop sitting on the smooth material with a majority of flat-normal triangles is claiming to be smooth and rendering faceted. Bar: no builder above 40%. Today `makeFlowers` is 20/20 flat on its mound; after the swap it is 0. This is the gate `qa/shading.mjs` should have been — it has all the traversal plumbing already.

### The maple canopy is still a bunch of balloons, and the tone map is inverted
SEVERITY: blocker
AT: src/proto3d/mainstreet.ts:1677
SAW: `maple_trees.png` and `maple_look.png`, bottom-right quadrant. The orange canopy is the largest object in the frame after the void. Its outline is a scalloped run of **twelve individually resolvable circles of near-identical size**, each with its own specular highlight. The intended dark ring is not distinguishable anywhere in the image — I cannot pick a single darker lobe out of the orange mass. The red maple beside it is the same. This is the fix the ledger records as landed; it did not land in the pixels.

EVIDENCE:
```ts
const dark = new THREE.Color(leaf).multiplyScalar(0.74).getHex();
const lit  = new THREE.Color(leaf).multiplyScalar(1.16).getHex();
...
p.push(part(new THREE.SphereGeometry(rr * 0.66, 10, 8), i % 2 ? leaf : LEAF_HERO,
  Math.cos(a) * radA * 1.28, yy, Math.sin(a) * radB * 1.28));
const b = a + 0.62;
p.push(part(new THREE.SphereGeometry(rr * 0.44, 8, 6), dark,
  Math.cos(b) * radA * 1.55, yy - 0.95, Math.sin(b) * radB * 1.55));
```
Two separate reasons it fails, both arithmetic:

1. **The satellites are pushed further out than the mains** — `1.55` vs `1.28` on the same `radA`/`radB`. So they do not break the silhouette up, they *add six more circles to it*. Twelve equal cusps instead of six. The comment says the outer-lower ring "gives a canopy its weight"; geometrically it is widening the outline with more of the same primitive.

2. **The tone separation is ~1/8 stop, not the ~1/3 the code thinks it is.** three r185 has `ColorManagement.enabled = true`, so `new THREE.Color(hex)` holds *linear* values (island.ts:3702 says exactly this about `_pc.setHex`). `multiplyScalar(0.74)` is therefore a linear scale, and `getHex()` converts back to sRGB — the displayed darkening is **0.74^(1/2.2) ≈ 0.87**. 13% darker. `lit` at ×1.16 linear is ×1.07 displayed, and on `LEAF_A = 0xe86a2a` the red channel clips at 232→248. Both accents are inside a tenth of a stop of the base.

3. And structurally: `makeTree` (island.ts:3861), the canopy in this repo that *does* read, puts the **dark tone on the largest lobe** (`SphereGeometry(R0)`) and hangs small light accents on it. `makeMapleTree` inverts that — six large lobes in the light tone, six small ones in the dark. There is no dark mass for the light to sit on, which is the AC:NH rule.

FIX: three edits, **zero new seeded draws** — all arithmetic on `rr`, `radA`, `radB`, `yy`, already in hand, exactly the pattern the existing comment defends.
- Pull the satellites *inside* the mains: `1.55` → `0.86`, and drop them further: `yy - 0.95` → `yy - 1.35`. They become the underside mass, not extra outline.
- Invert the tone map to match `makeTree`: give the six **mains** the dark tone and the six satellites the base/hero tone, and add one large `dark` core sphere at `radius rr * 0.95, (0, yy - 0.4, 0)` so the canopy has a body.
- Widen the multiplier to survive the linear→sRGB round trip: `0.74` → `0.48` (displayed ≈ 0.71, a real half-stop), `1.16` → `1.40` (displayed ≈ 1.17).

Cost: one extra sphere per tree at `(10,8)` ≈ 144 tris. At 603 maple trees ≈ **87k triangles, one draw call each, unchanged**. Heap ≈ 3 MB. Nothing else moves — same 1 `mpick` + 24 `mr()` in the same order and ranges, so the placement stream is byte-identical.

GATE: `qa/canopy.mjs` — spawn one `makeMapleTree` alone against a flat background at the play camera's pitch and framing, mask the canopy by hue, and report two numbers: (a) **boundary cusp count** — walk the silhouette and count direction reversals; a leafy canopy is high-frequency, a lobe ring is a small number of large smooth convex arcs. Bar: no single convex arc may span more than 12% of the perimeter (today six arcs span ~15% each). (b) **canopy luminance spread** — P90/P10 within the mask. Bar ≥ 2.0; today it is ~1.3, and 1.3 is the number that proves the dark ring is not reaching the screen. Both fail on the current build; both pass after.

### Every roof in four of the five worlds is one flat blank colour — and the camera looks down
SEVERITY: major
AT: src/proto3d/nightmarket.ts:214, src/proto3d/tailgate.ts:318
SAW: three worlds, three images.
- `lantern_look.png`, dead centre: the stall canopy is a flat red parallelogram roughly 4.6 × 3.0 units — the second-largest object in the frame — with no ridge, no seam, no colour break, and a solid black underside plane below and right of it. The valance, the lantern, the griddle glow and the stallholder are all on faces this camera barely sees.
- `gameday_look.png`, centre-right: the canopy pyramid is a featureless cream triangle, the largest single surface in that half of the frame. Its `CRIM` valance is edge-on and contributes nothing from above.
- `pirate_look.png`, top-left: the food-truck roof is the same flat red quad, its scalloped fringe visible on one edge only.
Against these, `powder_look.png` is the control: the chalet roofs are the only roofs in the game with a value break, and they are the only buildings in the five shots that read as architecture rather than as coloured card.

EVIDENCE — nightmarket.ts:213–215, where the comment and the geometry disagree:
```ts
  // the canopy: a shallow ridge with a striped valance
  solid.push(part(new THREE.BoxGeometry(wD * 1.15, 0.16, dD * 1.2), VERM, 0, h, 0));
  solid.push(part(new THREE.BoxGeometry(wD * 1.17, 0.09, dD * 1.22), VERM_D, 0, h - 0.1, 0));
```
Two axis-aligned boxes. Rise = 0. It is a table top, not a ridge. And tailgate.ts:318:
```ts
  p.push(part(new THREE.ConeGeometry(2.6, 0.95, 4), top, 0, 3.24, 0, 0, Math.PI / 4));
```
One part, one colour, four faces.

FIX: copy what `alpine.ts:159 capRoof()` already does, since it is the only version in the repo that works.
- **Stall**: replace the single flat `VERM` box with two boxes pitched ±0.22 rad about Z meeting at a ridge, plus a `CylinderGeometry(0.09, 0.09, wD*1.2, 6)` ridge roll in `VERM_D` laid along the ridge. +2 parts, ≈ **+44 tris per stall, zero new draw calls**.
- **Game Day canopy**: keep the cone, add four thin `BoxGeometry(0.07, 0.06, 2.7)` hip battens in the valance colour along the four hips, rotated to the pyramid's slope. Four seam lines break a blank pyramid into four readable quarters. **+48 tris, zero draw calls.** This is precisely the Donut County move — a seam, not a texture.
- **Pirate food-truck roof**: same two-box pitch as the stall.

GATE: `qa/roofs.mjs` — for every registered edible, isolate triangles with `normal.y > 0.7`, and for any prop whose up-facing area exceeds 4 sq units report the area share of its single most common vertex colour. Bar: **no prop's roof may be more than 85% one colour.** Today the stall canopy is 100% `VERM`, the Game Day canopy 100% `top`, and `makeBarrel`'s lid 100% stave. The alpine chalet passes at ~55% (snow cap / slate / cornice / chimney). The bar is set by the world that already got it right, which is the only kind of bar worth having.

### The pirate barrels have no bulge and a blank lid
SEVERITY: major
AT: src/proto3d/island.ts:4193
SAW: `pirate_look.png` — three barrels in one frame (yellow at ~(100,470), teal at ~(195,1195), gold at ~(20,600)). Each is a straight-sided cylinder with two black hoops and a completely blank flat top disc. At this camera the *lid is most of the prop*, and it is one flat colour. They read as painted oil drums, or from directly above, as poker chips. A barrel's entire recognisable silhouette is the bulge, and there isn't one — worse, the taper runs the wrong way (0.9 at the top, 0.75 at the bottom).

EVIDENCE:
```ts
function makeBarrel(): THREE.Group {
  const parts = [
    part(new THREE.CylinderGeometry(0.9, 0.75, 2.2, 12), PAINTED_STAVE(), 0, 1.1, 0),
    part(new THREE.TorusGeometry(0.88, 0.09, 6, 14), 0x2e2a34, 0, 0.55, 0, Math.PI / 2),
    part(new THREE.TorusGeometry(0.88, 0.09, 6, 14), 0x2e2a34, 0, 1.65, 0, Math.PI / 2),
```
FIX: one `LatheGeometry` over a 7-point profile — `(0.62,0) (0.80,0.4) (0.92,0.85) (0.95,1.1) (0.92,1.35) (0.80,1.8) (0.62,2.2)` — at 12 radial segments, replacing the cylinder. `Lathe` matches `ROUND_GEO` so it auto-classifies round and auto-smooths through `mergedProp`; no call-site change. Add a recessed lid: `CylinderGeometry(0.52, 0.52, 0.06, 12)` in a darkened stave colour at `y = 2.18`, which is what stops the top being one flat disc. Cost: lathe ≈ 144 tris vs cylinder's 48, plus 24 for the lid — **+120 tris per barrel, still one draw call, no new material.** Barrel counts are in the tens per world; negligible. `PAINTED_STAVE` is `Math.random`, so no determinism cost.
GATE: fold into `qa/roofs.mjs` (the blank-lid half), plus one line: for any prop whose name matches `barrel|drum|cask`, the maximum XZ radius must occur between 30% and 70% of the prop's height. Today the max is at 100% (the top rim). After the lathe it is at 50%.

### Four newspaper boxes in one frame, each with a blank white card for a front page
SEVERITY: major
AT: src/proto3d/mainstreet.ts:727
SAW: `maple_trees.png` at ~(615,375), ~(790,480), ~(140,1060), ~(75,1290) — four `makeNewsBox` instances, each showing a plain `CREAM` rectangle where the paper's front page goes. Same four in `maple_look.png`. This is the *identical* defect that `signLines()` was written to fix, and `signLines()` lives 60 lines above this function in the same file. It was applied to lawn signs, big signs and protester placards and never to the news box, which is placed in five biome pools (island.ts:4483, 4486, 4487, 4488, 4489) and two authored rows (6126, 6168).

EVIDENCE:
```ts
export function makeNewsBox(): THREE.Mesh {
  return M([
    part(box(0.6, 1, 0.5), DARKSTEEL, 0, 0.5, 0),
    part(box(0.8, 1.1, 0.7), mpick([0x2f6ad8, 0x3f7a4e, 0xd8586f]), 0, 1.5, 0),
    part(box(0.55, 0.6, 0.1), CREAM, 0, 1.7, 0.36),   // ← the blank front page
```
FIX: capture the `mpick` result into `const c`, then append `...signLines(0, 1.72, 0.42, 0.40, 0.44, 0x3a3440, 3, (c >> 12) & 7)`. `signLines` (mainstreet.ts:765) draws **zero** random numbers — its `RATIO` table is fixed and its `variant` comes from the caller — and `(c >> 12) & 7` is a hash of a value already in hand, so this costs **no seeded draw**, exactly the pattern the brief names. Cost: 3 boxes ≈ **36 tris, zero draw calls, zero materials.**
GATE: `qa/signface.mjs` — enumerate every prop part in the CREAM/WHITE family whose face area exceeds 0.2 sq units and whose normal is not vertical; each must have at least two sibling parts within 0.12 units in front of it along its normal. Fails on `makeNewsBox` today (0 rows), passes after. It will also sweep the rest of the game for the same defect, which is the point — I found this one by looking, and there will be others I did not.

### Four tiny-prop builders never got merged
SEVERITY: minor
AT: src/proto3d/island.ts:4452
SAW: code only. The render does not show it because a draw call is not a pixel — but it is 3× the cost of every other small prop, and it is directly against the "props are merged to ONE draw call each" constraint.
EVIDENCE: `makeMushroom` builds three separate `THREE.Mesh` objects (stem, cap, dot) with three `stdMat` materials; `makeShell` (4445), `makeGolfball` (4466) and `makeLuggage` (4494) do the same on a smaller scale. Every other builder in this file routes through `mergedProp`. In the `forest` biome pool (4478) mushrooms are double-weighted, so *half* the forest's tiny props are three-draw props.
FIX: route all four through `mergedProp(parts)` like their neighbours. `stdMat` does cache (island.ts:3358), so this is a draw-call saving, not a material saving: −2 calls per mushroom, −1 per luggage. Triangles unchanged.
GATE: `qa/calls.mjs` (or extend `qa/propcount.mjs`) — assert that no prop registered as a single edible contains more than one `Mesh` unless it also carries a `PROP_GLOW_MAT` or `lit()` glow child. Fails on mushroom/shell/golfball/luggage today.

## IS THIS THE BEST THIS CAN BE?

No — and the gap is one idea, not fifty.

**The camera looks down, so the top of everything is the front of everything, and this repo has only figured that out in one file.** `alpine.ts` builds roofs the way a top-down game must: `capRoof()` gives four value bands and a ridge, `chimney()` breaks the plane, and POWDER PASS is consequently the only world in the five screenshots where architecture reads as architecture rather than as coloured card. Every other world hands the camera its blankest surface. That single principle explains the stall canopy, the Game Day pyramid, the pirate truck roof, the barrel lid, and — in the same breath — the flower bed, whose failure is that a squashed ball seen from above has *no* top and therefore has to invent one out of facets.

Ranked, what stands between here and the bar:

1. **Fix the two blockers.** The flower bed and the maple canopy are both in the hero frame, both are the *most-repeated* object of their class, and both are re-treads of defects this team has already written essays about. `makeFlowers` costs +110 tris. The maple fix costs +144 tris and zero seeded draws. Neither is expensive; both were simply not looked at.

2. **Apply the roof rule across the four worlds that lack it,** starting with the props that present the largest horizontal area: stall canopy, Game Day canopy, food-truck roof, barrel lid, and — I did not audit them, but the same builders exist — `makeMarketShed`, `makeKura`, `makeTeahouse` in nightmarket.ts and `makeFairTent`, `makeFairStand`, `makeTicketBooth` in mainstreet.ts. `qa/roofs.mjs` will name the actual list rather than my guess, which is why that probe is worth building before the fixes rather than after.

3. **Repair the gate that let all of this through.** `qa/shading.mjs` measures which *material* a triangle is on. `makeFlowers` sits on `PROP_SMOOTH_MAT` and renders faceted, and the probe scores it in the smooth column. Every faceted-polyhedron-on-smooth-material prop in the game is currently invisible to the only instrument that was supposed to see it. `qa/normals.mjs` measures the buffer instead of the assignment, and it is maybe forty lines. This is the third shipped failure to pass every gate; the pattern in all three is that the probe measured the *intent* and the pixels showed the *result*.

4. **Then re-examine the tonal arithmetic everywhere it appears.** `multiplyScalar` under `ColorManagement.enabled` is a linear operation whose displayed effect is roughly the 1/2.2 power of what the number reads like. `makeMapleTree` (0.74→0.87), `makeBush` (0.80→0.90), `makeTree` (0.70→0.85) and `makeChalet`'s siblings all use it. `makeTree` survives because its dark tone is on the *biggest* lobe, so structure covers for the weak multiplier; the other two do not have that protection. Every two-tone prop in the game is roughly half as two-tone as its author believed.

What is genuinely good and should not be touched: the bench got its legs and reads correctly in `maple_trees.png`; `makeSnowman` is the best small prop in the game — the wobble, the one raised arm, the coin-flip hat — and it is the only builder that models *who made the thing* rather than what it is; `alpine.ts`'s roof kit is the standard the rest of the game should be measured against; and `signLines` is the right answer to lettering at this resolution, which is why leaving the news box out of it is worth flagging as a major rather than a polish.

## COVERAGE

**Images read (all with the Read tool):**
- `qa/out/shippedlook/maple_look.png` — required
- `qa/out/shippedlook/lantern_look.png` — required
- `qa/out/shippedlook/powder_look.png` — required
- `qa/out/shippedlook/maple_trees.png` — the higher-resolution read of the same Maple framing; this is where the flower-bed facets and the twelve-lobe canopy outline are unambiguous
- `qa/out/shippedlook/pirate_look.png` — I own static in all five worlds
- `qa/out/shippedlook/gameday_look.png` — same

**Code read:**
- `src/proto3d/island.ts` — `part()`/`ROUND_GEO` (3670–3725), `stdMat` (3358), `PROP_SMOOTH_MAT` (3455–3470), `mergedProp`/`ROUND_SHARE` (3796–3835), `makeTree`/`makePine` (3861–3890), `makeBarrel`/`makeCannon` (4189–4206), `makeBush` (4300–4328), `makeMailbox`/`makeBench` (4331–4356), `makeTorch`/`makeCone`/`makeHydrant`/`makeTrash` (4358–4400), `makeFlowers`/`makeCoins` (4402–4420), `makeTinyProp`/`makeShell`/`makeMushroom`/`makeGolfball`/`tinyForMaple`/`makeLuggage` (4444–4500), `place()`/`spinFor` (4753–4785), plus every `makeFlowers`/`makePlanter`/`makeNewsBox` call site (grep)
- `src/proto3d/mainstreet.ts` — `mr`/`mpick` (41–42), foliage constants (168–169, 209), `makeNewsBox`/`makeParkingMeter` (722–740), `signLines` (752–784), `makeLawnSign`/`makeBigSign`/`makeProtester`/`makeTownsfolk`/`makeNoticeBoard` (786–856), `makePlanter`/`makePickup`/`makeMapleTree` (1596–1687), builder index (grep)
- `src/proto3d/alpine.ts` — `capRoof`/`chimney` (159–190), `makeChalet` (203–234), `makeDrift`/`makeSnowman`/`makeSnowballStack` (389–460), builder index
- `src/proto3d/nightmarket.ts` — `makeStall` (204–244), builder index
- `src/proto3d/tailgate.ts` — `makeCanopy` (312–334), builder index, prop registry (1240–1257)
- `package.json` (three r185, for the ColorManagement claim)

**QA read:** `qa/variety.mjs` (1–50), `qa/shading.mjs` (1–40), `qa/propcount.mjs` (1–30), `qa/out/lookbook.json`, `ls qa/`

**Not read, and worth someone's time:** the ~50 remaining landmark builders in `island.ts` (I read only what I could see failing, per the brief), `luxe.ts` in full, and the nightmarket/mainstreet roofed builders that `qa/roofs.mjs` would enumerate. I ran no browser, no build, and edited nothing.

--- THE SKEPTIC ---



═══════════════════════════════════════════════════════════════════
TEAM MOTION
═══════════════════════════════════════════════════════════════════
--- THE TEAM'S REVIEW ---
## VERDICT: NO-SHIP

The largest population in the world a child sees first — the static townsfolk of Maple Falls — are welded statues that cannot animate at all, standing in one pose with one hairstyle and one garment cut beside a walking crowd that breathes, strides, skips, dances and sits, and the seam between the two species is visible in the character sheet.

## THE BAR

**Katamari Damacy / We Love Katamari (Namco)** — the direct genre ancestor, a ball that eats a town at a fixed high camera. Mechanically its crowd is *not* higher-poly than ours; a Katamari citizen is roughly our part count. What it does is spend its whole budget on **authored pose plus a never-stopping loop**: every human in the field is doing one specific thing forever (arms up, squatting, sitting on a bench, cycling, doing calisthenics, queueing), and the town is populated in **clusters that face each other** — a family, a queue, a ring around a busker. Nothing in Katamari stands facing a random compass bearing with its arms at its sides. Second bar, for legibility at size: **Crossy Road (Hipster Whale)** — every character is silhouette-first and *nothing is ever still*; even a stationary chicken squashes on a loop, because at 30 screen pixels motion is what separates a creature from scenery.

Where we sit: `life.ts` **meets or beats Katamari per person.** Six merged meshes on one material, a real walk cycle with torso counter-rotation and head lag (`life.ts:2802-2820`), plus flee, skip, work, conga, dance and event-manager poses, nine hairstyles, fifteen garments that change the silhouette. That work is good and I am not asking for it again.

`personParts` in `mainstreet.ts` is **below both bars on every axis Katamari is strongest on**, and it is the population that stands on the plaza where the match opens. Twelve `makeTownsfolk` call sites in `island.ts` plant on the order of a hundred of them across Maple, plus the four protesters outside the town hall, and every single one is a frozen mesh.

## FINDINGS

### The static townsfolk are statues — nothing in the town stands still and breathes
SEVERITY: blocker
AT: src/proto3d/mainstreet.ts:831, src/proto3d/island.ts:6133

SAW: `qa/out/person/front_zoom.png` — five townsfolk in a row, every one with both legs dead vertical and parallel, arms locked, not one weight shift between them. Same in `maple_front.png` (five figures, y≈740-880) and `maple_threequarter.png`. Compare `back_zoom.png`, which caught `life.ts` movers mid-stride: shoulders rolled, arms out of phase, legs apart. The person sheet also proves it structurally — the probe turns people to face camera and waits 900ms; the ones that *held* the imposed rotation instead of steering away are exactly the ones that cannot move.

EVIDENCE: `makeTownsfolk` returns geometry, not a rig —
```ts
export function makeTownsfolk(hat = false): THREE.Mesh {
  const p: G[] = [];
  personParts(p, 0, 0, mpick(SHIRTS), mr(0, Math.PI * 2), hat ? ... : undefined);
  return mergedProp(p, PROP_SMOOTH_MAT);   // a face is not architecture
}
```
and `island.ts:4798` `drop()` → `place()` registers it as static decor, never a mover. Meanwhile `life.ts:2796` states the standard the statics fail: *"The phase always advances (so a standing person breathes and shifts weight instead of being a statue)"*.

FIX: the merged mesh's local origin is the person's feet (built at `x=0,z=0`, placed after), so a whole-body idle needs no geometry at all. Register the one-person meshes in a light per-frame list and write **yaw only** — `m.rotation.y = base + Math.sin(t * 0.9 + phase) * 0.055`, phase hashed from the drop position. **0 draw calls, 0 triangles**, ~120 `rotation.y` writes per frame against a mover system that already updates 200-966 records. Yaw and not bob deliberately: vertical is foreshortened away at the 46° camera (the dance branch at `life.ts:2778` says exactly this), and a bob would lift the body off its baked contact shadow, which is the trap `life.ts:2823` (`cs.position.y = 0.045 - mesh.position.y`) exists to dodge.

GATE: `qa/stillness.mjs` — capture the world matrix of every person-sized edible (radius 0.5-1.6, verts ≥ 2000) at t and t+1.2s and report the fraction bit-identical. Maple today ≈ 100% of the static population frozen; gate at < 15%.

### Two species side by side: the static arm has no elbow, no skin forearm and no hand
SEVERITY: blocker
AT: src/proto3d/mainstreet.ts:367

SAW: `front_zoom.png` versus `back_zoom.png`, same build, same camera. In `back_zoom` the movers' arms end in clear brown balls that read as hands and the sleeve stops above them. In `front_zoom` the statics' arms are single pale tubes the same colour as the chest running unbroken to the wrist, and the "hand" is invisible — because it is exactly the same radius as the arm it is stuck on. At the play camera in `maple_front.png` several of these arms have vanished into the torso entirely and the figure reads as a bowling pin.

EVIDENCE: mainstreet.ts:367-370 — one straight cylinder, then a hand at the wrist's own radius:
```ts
out.push(part(cyl(0.10 * T, 0.115 * T, 0.74 * T, 9), shirt, a.cx, a.cy, a.cz, a.rx, 0, a.rz));
out.push(part(sph(0.115 * T, 7, 5), skin, a.hx, a.hy, a.hz));
```
`0.115 / 0.115 = 1.00`. Next door, life.ts:1093-1094 gets both things right and says why:
```ts
p.push(pc(B.taper, loCol, 0, -0.755 * A, 0.055 * A, 0.20 * gr, 0.52 * A, 0.20 * gr, Math.PI + 0.2));
p.push(pc(B.dot, skin, 0, -1.01 * A, 0.115 * A, 0.26 * gr));
```
forearm radius `0.10gr`, hand radius `0.13gr` — **1.30×**, plus `+0.2 rad` of elbow, under the comment *"a dead-straight prism from shoulder to fingertip is the other half of the 'moving block' tell"*. And `loCol = fullArm ? shirt : skin` gives the mover a skin forearm that separates from the shirt; the static's arm is shirt-coloured to the fingertip.

FIX: port the three numbers. Split the static arm into upper (`0.74T → 0.42T`, shirt) and forearm (`0.36T`, skin unless the wear is long-sleeved) with the forearm's aim rotated ~0.2 rad forward of the upper, and take the hand to `0.150 * T`. Cost: **+1 part per arm** — a 9-sided open cylinder, 36 triangles — so **+~80 triangles per person, 0 draw calls** (same `mergedProp` merge, same `PROP_SMOOTH_MAT`). ~10k triangles across all of Maple's statics. **0 seeded draws**: `armAt()` already hashes its aim, and the forearm reuses the same hash.

GATE: `qa/species.mjs` — for the six people `personsheet` picks, walk the geometry and report per population (static vs mover) the ratio of hand radius to wrist radius and the count of distinct vertex colours below the shoulder line. Today statics report 1.00 and one colour; movers report 1.30 and two. Gate: the two populations must land within 15% of each other on both.

### One hairstyle and one garment cut across the entire static population
SEVERITY: major
AT: src/proto3d/mainstreet.ts:386

SAW: `front_zoom.png` — five heads, five identical squashed caps, differing only in colour. `maple_front.png` and `maple_side.png` the same. The movers carry nine hair silhouettes (`life.ts:931` `HAIRS`) and fifteen `Wear` values that change the outline — a dress that flares wider than the shoulders, a robe to the shins, a hood, waders. The statics have exactly one of each. That is Katamari's uniformity failure precisely: identical stamps, and `qa/variety.mjs`'s own header already names it ("A prop type whose every instance has an identical vertex count and identical bounding box is a stamp, however nice the stamp is") — it just never ran the test on people.

EVIDENCE:
```ts
out.push(part(sph(0.38 * T, 12, 8), hairCol, hxc, 2.42 * T, hzc, 0, ry, 0, 1, 0.55, 1));
```
One primitive, one placement, for every townsperson in the game. The colour varies via the `v1` hash; the shape never does.

FIX: three more silhouettes off a third hash of the values already in hand (`h3` from `x,z,shirt,ry` — costs **no seeded draw**, same pattern the file already uses at mainstreet.ts:311): **bun** (cap + `sph(0.15T)` behind the crown), **bob** (cap + a `cyl(0.34T, 0.30T, 0.34T)` skirt down to the jaw), **ponytail** (cap + a tapered tube aft). Two extra parts on two-thirds of the population, **~+150 triangles each, 0 draw calls.** Same trick for the garment: a `flare` cylinder from the hip in place of the chest cylinder gives a dress, and it is the same part count.

GATE: extend `qa/variety.mjs` with a FORM pass restricted to person-sized edibles: count distinct (vertexCount, bbox) signatures across the static population. Maple returns 1 today (only the height jitter `T` moves it, and it moves it continuously — so bucket to 0.05). Gate ≥ 4.

### The town is full of benches and nobody sits on any of them
SEVERITY: major
AT: src/proto3d/island.ts:6114, src/proto3d/island.ts:6533, src/proto3d/life.ts:1600

SAW: `maple_front.png`, bottom-left — a wooden park bench, empty. Same bench empty in `maple_side.png` and `maple_threequarter.png`. `island.ts` plants benches at 5946, 6114, 6192, 6452, 6533 and 6602; not one of them has a person on it. Katamari's single strongest crowd read is that some of its people are *not standing* — a field where every human is vertical reads as a shelf of figurines however good each figurine is.

EVIDENCE: the mechanism exists and is already shipped in another world —
```ts
posed(crewman, -1.15, -1.15, 0.55, 0.55);       // sitting, hands on the oars
```
(life.ts:4916, via `posed()` at life.ts:1600). Maple, the town with all the benches, uses it zero times.

FIX: a `seated` flag on `personParts` — rotate the two leg cylinders 90° about the person's own right axis (`rx`/`rz` are already solved for an arbitrary aim by `armAt`'s arithmetic; the same solve applies) and drop the hip/chest/head stack by `0.55T` to seat height. **Same parts, same count: 0 extra triangles, 0 extra draw calls, 0 seeded draws.** Then in `island.ts`, do not *add* bodies — re-target existing ones. Keep every `scatter()` and `row()` call exactly as it is so the stream is byte-identical, and move the mesh of every third scattered townsperson onto a bench position from the row already computed above it. **Net 0 draw calls, net 0 edibles, no change to the score economy.**

GATE: `qa/seats.mjs` — count bench meshes per world, then count person-sized edibles whose centre sits within 1.2u horizontally and 0.5u vertically of a bench's seat plane. Maple returns 0 today. Gate ≥ 6, and ≥ 25% of benches occupied.

### Nobody in Maple Falls is looking at anybody, and no call site can aim them
SEVERITY: major
AT: src/proto3d/mainstreet.ts:833

SAW: only visible in code from a still image, because the person sheet overrides every facing by design (`q.m.rotation.y = faceCam + turn`, personsheet.mjs:105) — that is exactly what the probe is for, and it is why this one needs saying in code. In play the effect is that the plaza is a field of people facing uniformly random compass bearings.

EVIDENCE:
```ts
personParts(p, 0, 0, mpick(SHIRTS), mr(0, Math.PI * 2), hat ? ... : undefined);
```
The facing is drawn *inside* the factory and never returned. The final heading is `ry_internal + rotY_drop`, and since `ry_internal` is invisible to the caller, the twelve `drop(MS.makeTownsfolk(...), x, y, 1.2)` sites in `island.ts` cannot aim a person at anything — not at another person, not at the bandstand, not at the town hall.

FIX: `export function makeTownsfolk(hat = false, aim?: number)` — **still call `mr(0, Math.PI * 2)` unconditionally** and discard its value when `aim` is supplied. The draw happens, in the same order, the same number of times: the seeded stream is bit-identical and no authored placement in Maple moves. Then pair them at the call sites: for each scattered position, place its neighbour from the next position in the same batch and set both `aim`s to face the midpoint. **0 draw calls, 0 triangles, 0 stream change.**

GATE: `qa/facing.mjs` (or a third column on `variety.mjs`'s FACING pass) — for each static townsperson, take the nearest other townsperson within 6u and measure the angle between facing and the vector to them. Uniform-random today: mean |cos| ≈ 0.5, no mass near 1. Gate: ≥ 30% within 40° of facing a neighbour inside 6u.

### The dog slides
SEVERITY: major
AT: src/proto3d/life.ts:1692, src/proto3d/life.ts:4804

SAW: code only — no dog is in frame in any of the five images, and that is itself worth noting, because the dog walks the `main`/`burb` loop where the match opens. The render does not show it because the person sheet relocates its six subjects and the dog is not one of them.

EVIDENCE: `makeDog()` returns `grp1(mergedProp([...]))` — one welded mesh with four rigid `MG.cyl6` legs and no rig at all — and it is then translated across the pavement by
```ts
follow(rec.mesh, dog, 2.0, 9, true);
```
Four fixed legs sliding on a plane is the exact defect life.ts:489 records as the thing that made the *people* read as "a brick sliding across the sand".

FIX: `grp1` already wraps the merged mesh in a Group, so the child has a free local transform. On the same per-frame record `follow()` already drives: `m.rotation.z = Math.sin(t * 13) * 0.07; m.position.y = Math.abs(Math.sin(t * 13)) * 0.08;` — a trot bob and roll. **0 draw calls, 0 triangles.** (Keep the contact shadow on the Group, not the child, so the bob does not lift it.) A wagging tail would need the tail split into a second merge — **+1 draw call per dog, ~4 dogs** — and is not worth it until the trot is in.

GATE: fold into `qa/stillness.mjs` as a second assertion — any edible whose world position changes over 1s while *every* descendant's local transform is bit-identical is sliding. The dog and goat fail today; the people pass. Gate: zero sliding movers.

### Every person in the game has eyes; not one animal does
SEVERITY: minor
AT: src/proto3d/life.ts:1692, src/proto3d/life.ts:1712, src/proto3d/life.ts:1962

SAW: code only — no animal appears in the five images. Worth fixing anyway because the goat is the *finale chase prize* (`life.ts:4815`, gilded, 25 coins) and gets a camera pointed at it by design.

EVIDENCE: `makeDog`'s ten parts are body, head, muzzle, two ears, tail, four legs — no eye, no nose. `makeGoat`'s fourteen parts likewise. `makeAnimal`'s elephant, lion and sheep likewise. The two long comments in `life.ts:1117` and `mainstreet.ts:395` about a bare ball being "the loudest cheap tell on a person" apply verbatim to a bare ball on a goat.

FIX: two `INK` dots each, sized off the head sphere the same way the townsfolk's are (3% proud, lateral extent under half the skull). Dog and goat are `mergedProp` → **0 draw calls, ~200 triangles each.** `makeAnimal` builds separate meshes per part, so merge both eyes into **one** extra mesh: **+1 draw call per animal × 6 zoo animals = 6 draw calls**, not 12.

GATE: `qa/critters.mjs` — the `personsheet` trick applied to animals: relocate and turn the dog, goat and each zoo species to face the camera and shoot them. Plus a numeric assert that each animal mesh carries ≥ 2 parts with luminance < 0.15 inside the forward third of its bounding box. Zero today.

### The static hair cap is wider than the skull it sits on
SEVERITY: polish
AT: src/proto3d/mainstreet.ts:386

SAW: `front_zoom.png` — the leftmost figure's black hair has a visible overhanging rim, and it reads as a moulded bowl helmet rather than hair. The arithmetic: skull `sph(0.36T)` at `2.22T`; cap `sph(0.38T, 12, 8)` scaled `(1, 0.55, 1)` at `2.42T`. At the cap's own centre height the skull's radius is `√(0.36² − 0.20²) = 0.299T`, so the cap stands **0.081T proud — 27% wider than the head there**. And it is tessellated 12×8 against a skull at 16×11, so the coarser of the two is the one on the outside edge.

FIX: `sph(0.355 * T, 16, 9)` and lift the centre to `2.40 * T`. **0 draw calls; triangles up ~90 per person, down again once the flange stops needing to be smooth.**

GATE: covered by the FORM/silhouette pass in `qa/species.mjs` above — assert no head-region part's horizontal extent exceeds the skull's at the same y.

### The character sheet does not hide the HUD, and never writes the crops its own header promises
SEVERITY: minor
AT: qa/personsheet.mjs:63

SAW: all four of `maple_front/threequarter/side/back.png` carry the timer, the score chip, the growth bar, the home button and two speech bubbles — one of which ("Shake my hand. Firm. Good.") sits over the subjects' feet in `maple_side.png`. This is our instrument and it is dirty.

EVIDENCE:
```js
await p.addStyleTag({ content: '#hud,#quests,#news,#bubbles,.banner,#joy,#topbar,#formbar{opacity:0 !important}' });
```
`index.html` has no `#hud`, no `#bubbles`, no `#topbar` and no `#formbar`, and `banner` is an **id**, not a class. The real ids are `#timer #board #coins #quests #growth #banner #count #news #hungerlbl #hunger #joy #powers #guide #btnQuit`; bubbles are `.vb` / `.vf` (bubbles.ts:161,170). Separately the header promises *"one tight crop per person"* at `qa/out/person/<world>_<n>.png` and the loop only ever writes the four angles — the only tight crops on disk (`front_zoom.png`, `side_zoom.png`, `back_zoom.png`) are hand-made and three days older than the sheets.

FIX: correct the selector list and add the per-person crop loop using the `sx, sy` the probe already computes and returns. Probe-only; zero runtime cost.

GATE: the probe asserts on itself — after the style tag, `expect` zero visible elements matching the HUD selector list, and `expect` six crop files written.

## IS THIS THE BEST THIS CAN BE?

No. Ranked by life bought per triangle:

1. **Make the statues move.** Zero triangles, zero draw calls, and it is the difference between a town and a diorama. Crossy Road's whole legibility strategy is that nothing is ever still; we have a hundred people standing in the opening frame that literally cannot move a joint. This is the single highest-value change on the list and it is also the cheapest.
2. **Sit somebody down.** Also zero triangles — the pose function is written, the benches are planted, the seated pose already ships in Pirate Bay. One seated figure per park bench changes the read of the whole plaza, because *variety of posture* is what Katamari trades on, not variety of mesh.
3. **Turn people toward each other.** Zero triangles, zero draw calls, no seeded draw. Two people facing each other is a conversation; two people facing north is inventory. This one is close to free and I would take it before any geometry work.
4. **Close the species gap in the arm.** ~80 triangles a head. It is the one place where a single frame side-by-side gives the game away, and the correct numbers are already sitting in the file next door.
5. **Three more static hairstyles and one flared garment.** ~150 triangles a head, and it kills the last "one mould" tell on the population.
6. **Trot the dog, then give the animals eyes.** Small, but the goat is a finale beat with a camera on it.

Two things I am *not* asking to change, and want on record as judged rather than skipped. The **eye marks are correct** — I looked for the failure that shipped last time and it is genuinely fixed. In `front_zoom.png` at 900px they read as drawn eyes with no bulge and no pale break in the silhouette, and in `maple_side.png` they are correctly invisible from the side, which is what the 0.195-of-0.36 lateral extent in the comment predicts. Do not touch them, and do not add a mouth: at 30 pixels there is room for a mark and nothing else, and `gameday_look.png` confirms the same treatment holds up on the mascot at three times the size. The **rival voids** (`rivals.ts:273-330`) are also right — billboarded eyes with blush and a kawaii smile, drawn to the hero's chart rather than the crowd's, which is exactly the correct split.

The remaining gap is not resolution and it is not polygons. It is that half our population is furniture.

## COVERAGE

Images read: `qa/out/person/maple_front.png`, `maple_threequarter.png`, `maple_side.png`, `maple_back.png`, `qa/out/shippedlook/gameday_look.png`, plus `qa/out/person/front_zoom.png`, `side_zoom.png`, `back_zoom.png` (the older tight crops, which is where the arm and hand evidence is legible).

Files read: `src/proto3d/life.ts` (437-620 body kit and `makeCar`; 928-1230 `makePerson`, `HAIRS`, `ADULT`/`CHILD`, the face block, `makeCast`; 1580-1625 routes and `posed`; 1692-1760 `makeDog`/`makeGoat`/`makeBike`; 1962-2010 `makeAnimal`/`makeBird`; 2640-2860 the mover update and every pose branch; 2988-2998 the zoo; 4790-4830 the dogwalker and the goat; 4916 the seated crewman), `src/proto3d/mainstreet.ts` (120-150 palettes; 250-470 `personParts` in full; 810-840 `makeProtester`/`makeTownsfolk`), `src/proto3d/rivals.ts` (grepped for the face — 273-369 `makeRivalMesh`, 1602-1606 the billboard loop), `src/proto3d/island.ts` (4795-4802 `drop`, 5935-6610 the twelve townsfolk and bench placements), `index.html` (element ids), `qa/personsheet.mjs` (whole file), `qa/crowdgate.mjs` and `qa/variety.mjs` (headers), `src/proto3d/bubbles.ts` (DOM classes).

--- THE SKEPTIC ---



═══════════════════════════════════════════════════════════════════
TEAM GROUND
═══════════════════════════════════════════════════════════════════
--- THE TEAM'S REVIEW ---
## VERDICT: NO-SHIP

Three of the five worlds spend 85% of their ground-detail budget on a texture layer whose texel is smaller than one screen pixel at every camera the game ever uses, and Pirate Bay's dance floor renders at the same luminance as the hero standing on it (90.4 vs 89.8 of 255) — both measured, both in the frames below.

## THE BAR

**Crossy Road** (Hipster Whale) — the highest-grossing endless hopper ever made, and it has *no ground texture at all*. It works because it does two things mechanically: (1) every adjacent surface is separated by a hard **value** step — its road sits around 0.18 luminance against grass at 0.55, roughly 3:1 — and (2) the ground carries a **strip rhythm** at roughly one character-width per band, so the floor has cadence rather than being one field. Crossy Road proves you can ship a top-10 game with a flat ground *provided value and rhythm do the work grain doesn't*.

Measured against that: Game Day's car park is `rgb(60,46,46)`, `rgb(60,46,45)`, `rgb(67,53,52)` at three widely separated points in the same frame — one value across the entire visible ground, with local contrast of 0.67–0.86 of 255 at a 2-css-px radius. We are below Crossy Road on the one axis Crossy Road actually uses, *and* we have no grain to fall back on. Pirate Bay's party floor is worse: its two checker cells are 1.03:1 apart in value as authored, against the 1.35:1 minimum `palette.ts` sets for itself.

Second bar, for edges and mid-scale: **Animal Crossing: New Horizons**. Its entire path system exists so a path never terminates on a straight line — per-corner alpha masks blend path into grass across a full tile — and its ground carries readable variation at roughly one-quarter tile, i.e. the scale of a footstep. We have no feature anywhere between 0.3 and 1.6 3D units.

**The scale facts, remeasured.** The brief's "~50 css px per unit, ~11x magnification" assumes a camera closer than the game uses. `prototype3d.ts:8351` clamps `camDist` to `38·(r/0.9)^0.82`: 38 at spawn, ~128 at radius 4 (the camera `qa/shippedlook.mjs:70` shoots from), up to 340. With fov 32 on a 932-css-px viewport that is **42.8 → 12.7 → 4.8 css px per 3D unit**, so one bake texel is **9.1 → 2.7 → 1.0 css px**. Everything below is in 3D units, which is camera-independent.

## FINDINGS

### The ground's detail budget is spent below one pixel
SEVERITY: blocker
AT: `src/proto3d/island.ts:2812-2814`

SAW: `qa/out/shippedlook/gameday_look.png` — the asphalt lot fills most of the frame and has no surface whatsoever. `qa/out/shippedlook/maple_look.png` — a horizontal pixel scan of open lit grass at y=1520, x=170..203 reads `(122,181,69)` to `(125,182,72)`: **the lawn moves by 3 of 255 across 30 css px**. `qa/out/shippedlook/powder_look.png` — snow at (480,120) has local contrast 0.28/255 at radius 1.

EVIDENCE:
```
maple:   [0.45, 0.08, 0.00, 9],
pirate:  [0.45, 0.08, 0.00, 9],
gameday: [0.45, 0.08, 0.00, 9],
```
and the layers they weight (`island.ts:2919-2920`):
```
vec3 g  = texture2D(uDetail, vMapUv * 140.0).rgb;
vec3 g2 = texture2D(uDetail, vMapUv * 34.0).rgb;
```
128px tile × 140 repeat = 17,920 texels across ~650 3D units → **0.036 units per texel = 1.55 css px at spawn, 0.46 at radius 4, 0.17 late**. It is at or under one pixel for the entire match. That layer carries **0.45 of the 0.53 total weight**. The layer that does resolve (34×, 0.149 units/texel = 6.4 css px at spawn) carries 0.08. The mottle — the only layer with structure *and* colour, and the only one whose blobs (radius 2.3–11.9 units at repeat 9 = 29–151 css px at the shipped camera) land in the band the eye reads — carries **0.00**.

The file already did this arithmetic, for Lantern, at `island.ts:2694-2701`: *"128 x 140 = 17,920 texels ... four texels per pixel — so the mip chain averages the entire layer to flat grey before it ever reaches the screen."* Lantern was fixed. The other three were left on the mix that comment condemns.

The negative result that justified `gCoarse = 0` (`island.ts:2795-2808`) is not safe: `_grainab.mjs` moved the **coarse** weight and reported **mid-detail energy**, inside a stated ±6% noise floor. It measured the wrong octave. That is the same instrument error as the leaf-litter luminance mean.

FIX: give the three daylight worlds the mix Lantern already ships at 60fps — `maple/pirate/gameday: [0.12, 0.28, 0.25, 9]`. Keep repeat at 9 (Lantern's 7 is proven, 9 is the existing value; no new tiling risk). **Exposure is safe by construction**: the mottle tile is explicitly normalised to mean 128 at `island.ts:2766-2784` precisely so weight changes cannot move the level's mean. Cost: **0 draw calls, 0 triangles**; it re-enables one `texture2D` per ground fragment on three worlds via the `if (uGrain.z > 0.0)` branch at `island.ts:2925` — a cost Lantern already pays. Confirm with `qa/lnperf.mjs`-style GPU timing before/after on Game Day, whose lot is the largest ground fraction in the game.

GATE: `qa/groundband.mjs` — hide props, pin the camera at both `__setVoidR(0.9)` and `(4)`, and report high-pass energy on a clean ground patch at radii corresponding to **0.05, 0.1, 0.2, 0.4, 0.8, 1.6, 3.2, 6.4 3D units**. Fail if the 0.2–0.8-unit band is under 40% of the 3.2–6.4 band. Today Maple's park block measures 1.18 at 0.85 units against 6.97 at 13.6 units — a ratio of 0.17.

### Pirate Bay's dance floor is the same luminance as the hero
SEVERITY: blocker
AT: `src/proto3d/island.ts:916`, `981`, `984`

SAW: `qa/out/shippedlook/pirate_look.png`. Void body at (250,1030): `rgb(107,76,176)`, luminance **89.8**. Party floor magenta at (330,1330): `rgb(162,65,134)`, luminance **90.4**. Party floor purple at (300,1250): `rgb(109,82,134)`, luminance **91.7**. The void's lower-left rim and its orbit ring dissolve into the floor on the left side of the frame.

EVIDENCE:
```
party: '#5e2f72',
...
const cell = 175;
g.fillStyle = (ix + iy) % 2 === 0 ? 'rgba(255,120,200,0.62)' : 'rgba(90,200,255,0.5)';
```
As authored: magenta cell = `0.62·(255,120,200) + 0.38·(94,47,114)` = `(194,92,167)`, luminance 119. Blue cell = `(92,124,185)`, luminance 122. **Cell-to-cell ratio 1.026:1.** `palette.ts:60-65` states the house standard — *"neighbours that actually meet on the map are at least ~1.35:1 apart"* — and applied it to sand/pavement, meadow/forest and Game Day's three sands. It was never applied here. A checkerboard whose two squares are the same value is not a checkerboard; it is a hue mosaic, which is exactly what the frame shows.

`biomeColor` at `island.ts:1684` carries the argument that already forbids this: *"the player is 0x9a5cff and the match opens there, so the one thing the ground under the spawn must not be is pale violet pavement."* Pirate Bay put the player on violet ground anyway.

FIX: darken the slab and lift the tiles, which is also what a real lit dance floor does. `DCOL.party '#5e2f72' → '#2b1b38'` (luminance ~34) and drop the cell alphas to `0.72`/`0.58` so the cells land near luminance 150 and 120 — floor-to-cell 3.5:1, cell-to-cell 1.25:1, and the whole district ≥1.9:1 from the void's 90. Cost: **0 draw calls, 0 triangles, bake-time only, three literals.** Cell size needs no change: measured on screen it renders at 60–150 css px, which is correct.

GATE: `qa/heroground.mjs` — for each world, at radius 0.9 and 4, take the void's silhouette mask, sample the mean luminance inside it and in an annulus 20 css px outside it, and fail if the ratio is under 1.30. Today Pirate returns **1.007**.

### Nothing in Maple's bake occupies the band between a footprint and a lawn
SEVERITY: major
AT: `src/proto3d/island.ts:1804-1815`, `2632`

SAW: `qa/out/bake/maple.png`. Octave curve on a pure park block (window 620,180,330×300, 0% road chromaticity), high-pass energy by radius converted to 3D units:

```
0.21u: 0.22   0.43u: 0.56   0.85u: 1.18   1.7u: 2.05
3.4u: 3.26    6.8u: 5.01    13.6u: 6.97
```
Monotonic. **Every bit of the lawn's variation is at 3 units and above.** At 0.85 units the local contrast is 1.18/255 — 0.5%. That is the hole, and it is the band a child's eye uses to decide whether a surface is grass or paper.

EVIDENCE:
```
g.arc(x0 + lr() * bw, y0 + lr() * bh, lrange(bw * 0.07, bw * 0.22), 0, Math.PI * 2);
```
`bw` is one 1600-world block = 80 3D units, so those patches are **radius 5.6–17.6 units** — 364 to 1144 css px across at spawn, i.e. *wider than the phone screen*. The lawn fix over-corrected: it went from grain scale (invisible) straight past screen scale to larger than screen (also invisible, just differently). Meanwhile the leaf drifts at `island.ts:2632` — `drange(1.6, 3.6) * U` — are the one ground feature in the game authored at the right scale, and they got there because someone did this exact arithmetic by hand at `island.ts:2577-2586`. That is the template.

The same octave error repeats twice more: Game Day's mown stripes (`island.ts:1505-1507`, pitch 210–260 world = 10.5–13 units = 341–422 css px at spawn — the player stands inside one) and Pirate's jungle dapple, whose own comment at `island.ts:960-966` concedes it spans "500 to 1160 pixels".

FIX: a third matched pair inside the existing lawn loop, at the missing scale:
```
for (let i = 0; i < 60; i++) for (const up of [true, false]) { ... lrange(bw * 0.008, bw * 0.026) ... alpha 0.18 }
```
= radius 0.64–2.1 units. Uses the existing `lr()` mulberry32 stream, so it takes **no draw from the mainstreet seeded stream** and shifts no authored placement. Matched warm/cool pairs keep the block mean where `qa/ground.mjs` measures it. Cost: **0 draw calls, 0 triangles**; ~4,300 extra canvas arcs at bake time against the 4,000 the base pass already does.

GATE: `qa/groundband.mjs` as above — this is the same probe; it fails on the same number.

### Game Day's car park is one value across the whole frame
SEVERITY: major
AT: `src/proto3d/island.ts:1475`, `1505-1507`

SAW: `qa/out/shippedlook/gameday_look.png`. Three patches at (192,1536), (384,1728), (576,1728) — separated by a third of the frame — read `rgb(60,46,46)`, `(60,46,45)`, `(67,53,52)`. Detail energy 0.17 / 0.34 / 0.67 / 0.89 / 1.00 at radii 1/2/4/8/16 device px. It is a gradient, not a surface.

EVIDENCE:
```
rvpark: 0x8a8578, lot: 0x6e6b74, plaza: 0xb9b3a8, bowl: 0xb9b3a8,
...
stripe('greek', 210, true);
stripe('campus', 240, false);
stripe('practice', 260, false);
```
Three grass districts get mown stripes. The **lot** — the largest single surface in the world, and the one the void spends the opening minute crossing — gets a flat fill and nothing else. Also note `biomeColor.lot` at `island.ts:1706` says `0x918e97` while `GD_FLOOR.lot` says `0x6e6b74`; the second is what paints, and the extensive comment justifying the pale value sits next to the value that is not used.

FIX: give the lot the marking a car park actually has, all inside the existing `gpath(GD_R('lot').poly); g.clip()`: (a) drive aisles — bands 3 units wide at 1.15× the lot value, running the stall direction, at a pitch of 6 units so a pair is ~1 screen-width at spawn and ~3 late; (b) tyre-polished lanes down each aisle centre at 0.90×; (c) a scatter of ~400 patch repairs at radius 0.5–1.5 units, matched light/dark so the mean holds. Cost: **0 draw calls, 0 triangles**, ~900 bake-time ops.

GATE: `qa/groundband.mjs` restricted to a lot-interior window, plus a simple check that the max−min of patch means across three separated lot windows exceeds 12/255. Today it is **7/255**.

### Powder Pass's snow renders as saturated steel blue at 43% luminance
SEVERITY: major (joint with LIGHT — GROUND owns half)
AT: `src/proto3d/island.ts:756-774`

SAW: `qa/out/shippedlook/powder_look.png`. The snow at (480,120) is `rgb(65,118,157)` — **saturation 0.585, luminance 109.5/255**. Near the void at (600,1600) it is `rgb(91,98,119)`, luminance 97.9. Snow that is darker and more saturated than Maple's grass. The ground and the sky are the same blue at the top of the frame and the horizon has no edge. Detail energy 0.29/0.52/0.85 at radii 1/2/4 — the flattest surface in the whole set.

EVIDENCE:
```
g.fillStyle = '#dfe7f6'; g.fillRect(0, 0, TEX, TEX);
...
g.strokeStyle = 'rgba(92,116,176,0.34)'; g.lineWidth = 900 * PU;  ppath(ring, true); g.stroke();
g.strokeStyle = 'rgba(92,116,176,0.22)'; g.lineWidth = 1700 * PU; ppath(ring, true); g.stroke();
```
Composited at the rim, the bake goes from `(223,231,246)` luminance 229 to `(159,175,212)` luminance **174 — a 24% cut before the rig touches it**, over a 1700-world-unit band which is where the opening camera sits. The rig then takes 174 → 109 and swings R/B from 0.75 to 0.41. So GROUND supplies a quarter of the loss and all of the pre-shift; LIGHT supplies the rest.

FIX / PATH: this is the experiment, not a guess. Run `node qa/_dumpbake.mjs powder` (it exists, and nobody has ever looked at Powder's canvas) and put it beside `powder_look.png`. If the bake is 174 and the render is 109, halve the rim strokes to `0.18`/`0.10` — cost 0 draw calls — and hand the remaining 0.63× to LIGHT. Also: `GRAIN.powder = [0.20, 0.06, 0.00, 9]` is the weakest mix in the file, on the argument that "fresh powder is the smoothest ground in the game". Snow is smooth in *shape*; it is not smooth in *sparkle*, and this is the one surface where the mottle's warm/cool blobs are exactly right — wind crust, shade, ski tracks.

GATE: `qa/groundvalue.mjs` — sample the mean ground colour in each world's play frame with props hidden; fail if any world's ground saturation exceeds 0.35 or if a world named for snow returns luminance under 0.60. Today Powder returns **0.585 / 0.43**.

### Maple's river foam is a road centre line
SEVERITY: minor
AT: `src/proto3d/island.ts:2431-2432`

SAW: `qa/out/bake/maple.png`, the river running down the right third of the canvas — a regular white dash sequence down the exact centre of the channel, geometrically identical to the lane dashes painted on the roads in the same image.

EVIDENCE:
```
g.strokeStyle = 'rgba(233,246,255,0.30)'; g.lineWidth = pxW(30) - pxW(0);
g.setLineDash([pxW(70) - pxW(0), pxW(210) - pxW(0)]);
riverPath(); g.stroke(); g.setLineDash([]);
```
70 on / 210 off, width 30, centred on a 118-world-unit channel = 1.5 units of dash, 4.5 units of gap, 1.5 units wide, dead centre. `setLineDash` is what the road lane markings used before they were moved to geometry at `island.ts:2965`.

FIX: replace the single centred dashed stroke with two broken strokes offset ±25 world units from the centreline, each with `setLineDash([40, 95])` and a per-stroke `lineDashOffset` so the two never line up. Cost: **0 draw calls**, one extra bake stroke.

GATE: `qa/groundband.mjs --river` — walk the RIVER polyline in the dumped bake, sample luminance along the centreline, and fail if the periodic component with a period under 8 3D units has an amplitude over 10/255. Today it is **15/255**.

### The bake's noise is `Math.random`, so no pixel gate can ever be written against the ground
SEVERITY: minor
AT: `src/proto3d/island.ts:733-737`, `758-762`, `1032-1046`, `1464-1468`, `1477-1484`, `2712`, `2740`

SAW: code only. It does not show in a single render because every individual draw is sub-threshold — which is exactly why it survived. It shows the moment you try to diff two loads.

EVIDENCE: the lawn tone pass (`island.ts:1786`) and the leaf drifts (`island.ts:2591`) each carry a hand-rolled mulberry32 with the comment *"Not Math.random (the town would differ every load)"*. Everything else in the bake does not: Maple's 4,000 base mottle blobs, Powder's 3,600, Game Day's 3,200 plus 2,600 leaf specks, Pirate's entire 22,000-draw grain and tuft pass, and both shader tiles at `2712` and `2740`.

`qa/determ.mjs` fingerprints `window.__edibles`. It has never looked at the ground.

FIX: one `brnd()` seeded from a per-world constant, hoisted above the bake, and `const rand = (a,b) => a + brnd()*(b-a)` shadowed inside the bake scope. Takes **no draw from the mainstreet stream**, so no authored placement moves. Cost: 0.

GATE: extend `qa/determ.mjs` to hash `groundMat.map.image.toDataURL()` across two loads of each world and assert equality. Fails today on pirate, gameday, lantern and powder.

## IS THIS THE BEST THIS CAN BE?

No, and the gap is one idea repeated six times: **every ground feature in this game is authored either at grain scale or at map scale, and almost nothing sits in the 0.3–3 3D unit band that the play camera actually reads.**

The evidence is a single monotonic curve. Maple's park block, high-pass energy by radius: 0.22 at 0.21u, 1.18 at 0.85u, 3.26 at 3.4u, 6.97 at 13.6u. All the energy is at the top. The shader layers make the same error from the other end: 0.45 of the weight sits at 0.036 units per texel, which is 0.46 css px on screen. The two halves of the ground system are aimed at the two places the eye is not.

Ranked, what stands between here and there:

1. **Reweight the three daylight worlds to Lantern's mix.** One line each, zero draw calls, exposure-safe by construction because the mottle tile is mean-normalised. This is the largest single improvement available anywhere on my surface and it is three literals.
2. **Fix the party floor's value.** Three literals. It is currently a hero-readability defect, not a taste one.
3. **Add the missing 0.6–2-unit pass to Maple's lawn loop, the lot's aisles to Game Day, and halve the mown-stripe pitch.** All bake-time, all zero-cost, all using streams that already exist.
4. **Powder's snow.** Dump the bake first; do not guess which side of the pipeline owns the blue.
5. **Water.** Only Pirate Bay has a real water surface (`island.ts:3096-3125`, one animated `ShaderMaterial`). Maple's pond, lagoon and river and Powder's lake are paint on the same flat plane as the grass — at the shipped camera the pond is three concentric flat discs. That same material, instantiated for Maple's pond and lagoon as two `ShapeGeometry` meshes sharing one material, costs **2 draw calls and roughly 200 triangles** and would make the one thing in Maple a six-year-old will point at behave like water. Cheapest real upgrade on the list after the weights.
6. **Normal variation on the road.** `island.ts:2860-2880` already establishes that roughness cannot get there, and that the *mask* works and is exact per world. The next step is perturbing the normal from the detail texture already fetched. It is real work on the largest surface in the game and it should be last.

What I am not asking for, and want on the record as good: the lane dashes and zebra crossings are **geometry**, not bake (`island.ts:2962-3010`) — razor-sharp at every zoom, and correctly reasoned. Anisotropy is 16 on the ground and the note explaining why is right. The mottle tile's mean-normalisation is the single best piece of engineering on this surface. And **contact is solid** — I scanned under the park bench in `maple_look.png` at y=1520 and the cast shadow ramps the grass from G183 to G147 over 14 css px, attached at the feet, with the legs resolving individually; nothing floats.

Do the five grounds read as five places? **At district scale, yes** — Maple green, Pirate cream-and-magenta, Game Day grey-purple, Powder blue, Lantern ink. **At material scale, no**: all five are one flat albedo plus one grey speckle, so the only thing separating them is paint colour. That is why the strongest ground in the set is Pirate's (real beach banding, tuft strokes, wind ripples, and an actual animated water shader) and the weakest is Powder's — and the difference between them is not art direction, it is how many of the three detail layers were switched on.

One correction for the record: the brief's texel arithmetic (~50 css px per unit, 11× magnification) assumes a camera closer than the game ever uses. Measured from `prototype3d.ts:8351` and `qa/shippedlook.mjs:70`, the ground is magnified **9.1 css px per bake texel at spawn, 2.7 at radius 4, 1.0 at the far clamp** — a 9× swing across one match. No single authored scale can be right for all of it, which is the real argument for a broadband ground, and the real argument against leaving `gCoarse` at zero.

## COVERAGE

**Images read (Read tool):**
- `qa/out/bake/maple.png` (3072²) — required
- `qa/out/shippedlook/maple_look.png` — required
- `qa/out/shippedlook/pirate_look.png` — required
- `qa/out/shippedlook/gameday_look.png`
- `qa/out/shippedlook/powder_look.png`

Not read: `lantern_look.png` (Lantern is the one world already carrying the three-octave mix and was not in scope for the regression I was chasing).

**Images measured numerically** (pngjs, no browser, no build): all five above — patch means, saturation, per-octave high-pass energy at radii 1/2/4/8/16/32/64, pixel scan lines across district boundaries, prop shadow ramps, and stddev/percentile windows on the bake.

**Files read:** `src/proto3d/island.ts` (bake block 710–1200, Game Day 1440–1520, biome colours 1665–1745, Maple lawn 1758–1818, roads 1819–1910, river/pond/lagoon 2379–2470, leaf litter 2560–2660, texture + shader 2686–3010), `src/proto3d/palette.ts` (full), `docs/STUDIO.md` (full), `docs/HANDOFF.md` §1–4, `qa/ground.mjs`, `qa/determ.mjs`, `qa/grounding.mjs`, `qa/_dumpbake.mjs`, `qa/shippedlook.mjs` (camera setup), `src/prototype3d.ts` camera constants.

**Not run:** Playwright, any build, any browser. No file edited.

--- THE SKEPTIC ---

