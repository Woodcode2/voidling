# VERDICT: SPLIT — Patch 1 SOUND · Patch 2 SOUND · Patch 3 KILLED · Patch 4 KILLED AS FILED · Patch 5 SOUND WITH CORRECTIONS (TRI_BASELINE = 39,018)

Skeptic, round 2B, decision 5. I read the proposal in full, re-ran the census
myself with the probe's own regex, re-derived every sag and triangle number,
and read every cited line on this tree. Patches 1, 2 and 5 survived everything
I threw at them. Patch 3 dies on its one load-bearing claim — the balloon is
NOT out of the gameplay frustum, and the number that said so was reasoned, not
run, against a camera whose real follow distance is 26–340 units, not 40.
Patch 4 is a rider on 3 by its own title and shares the same false premise;
it dies with it (its poke-through math, which I verified, is correct — that is
not what killed it).

## What I checked on disk

### 1. The census — run, not reasoned (CONFIRMED EXACTLY)

I replicated `qa/roundlod.mjs`'s counting verbatim (comment-line skip
`/^\s*(\/\/|\*|\/\*)/` at :63, regex
`/SphereGeometry\(\s*([^,()]+),\s*(\d+)\s*,\s*(\d+)\s*\)/g` at :64) over
`src/proto3d/*.ts` (32 files) in an independent script, and ran
`node qa/roundlod.mjs` itself (exit 0, "PASS — the debt is unchanged at 154"):

- counted single-line calls: **220** ✓
- under-bar hits (both axes single-digit): **154** ✓
- site spend Σ 2·W·(H−1): **39,242** ✓
- 39,242 − 440 = 38,802 ✓ and 39,242 − 224 = **39,018** ✓ (the fallback that now governs)
- 10×8 counted calls: **33** ✓ (§2's grammar claim)
- top-of-census rows verified: void3d.ts:603 96×72 (13,632), rivals.ts:301
  40×30 (2,320), void3d.ts:2395 20×16 (600), assets3d.ts:165 18×14 (468),
  tailgate.ts:558 18×14 (468), tailgate.ts:559 16×12 (352), void3d.ts:1303
  16×12 (352), life.ts:544 16×11 (320), tailgate.ts:869/883 14×10 (252) — all ✓.
  Note (not a kill): the "top of the census" table silently omits three peer
  252-tri sites — hatgeo.ts:1620, island.ts:4206 (the tree bar itself),
  mainstreet.ts:1761. Selection, not miscount; the sums are exact.

### 2. Instance counts (CONFIRMED)

- `plant()` at island.ts:5639-5643 is verbatim as quoted:
  `GD.scatterInRegion(REG(id), n, Math.random, clear, { sep: r })` — n is an
  attempt count, scatter can reject. ✓
- makeFootball: island.ts:5719 (`'lot'`, 70) + :5799 (`'practice'`, 50) = **120** ✓
- makeHelmetProp: island.ts:5728 (`'lot'`, 40) + :5797 (`'practice'`, 60) +
  :5822 (`'bowl'`, 34) = **134** ✓
- Repo-wide grep (all file types): `TAILGATE_KIT` appears ONLY at its
  definition, tailgate.ts:1235 — **zero consumers** ✓. makeFootball /
  makeHelmetProp call sites: their definitions (:867, :880), the dead
  TAILGATE_KIT entries (:1266-1267), and the five island.ts plant lines above.
  **No other spawn path exists.** ✓
- Balloon: `spawnBalloon` is called exactly once, island.ts:7225, inside the
  Maple builder (the `[maple]` diagnostics at :7221-7222 are in the same
  function). One instance, Maple only ✓.

### 3. The silhouette rule (CONFIRMED for patches 1–2; the camera parenthetical is FALSE)

- island.ts:4201-4203 comment verified verbatim ("14x10 is the point where the
  profile stops reading as a polygon at the closest the camera ever gets");
  R0 = rand(2.2, 2.9) at :4199 ✓. Tree bar: 2.9·(1−cos(π/14)) = 2.9·0.025072
  = **0.0727** ✓.
- Patch 1: worst radius 0.5·1.12 = 0.56 (the :883 scale is (1.12, 1.0, 1.04) ✓);
  0.56·(1−cos 18°) = 0.56·0.048943 = **0.0274** — 2.65× under the bar ✓.
- Patch 2: 0.2·0.048943 = **0.0098** — 7.4× under ✓; meridian at H=8 is
  22.5°/row, sag 0.2·(1−cos 11.25°)·1.6 ≈ 0.006, several times under ✓.
- Materials: `finishSoft` → `mergedProp(parts, PROP_SMOOTH_MAT)`
  (tailgate.ts:79-81) ✓; `PROP_SMOOTH_MAT` is `flatShading: false`
  (island.ts:3741) ✓; makeFootball and makeHelmetProp both return
  `finishSoft(p)` (:876, :892) ✓. Balloon materials are `flatShading: true`
  (assets3d.ts:166, :174) ✓ — the disclosure in §4 is accurate.
- **§1's "void 10–40 units from camera" is false on this tree** —
  prototype3d.ts:9174: `Math.min(340, Math.max(26, 38 * Math.pow(R / 0.9, 0.82)))`.
  This does not touch patches 1–2 (their case is a distance-independent ratio
  against the tree at "any shared distance"), but it metastasizes into the
  patch-3 kill below.

### 4. THE KILL — patch 3's frustum claim is arithmetically false

The claim (§4): the balloon "is out of frame entirely: … the camera tops out
near void-center + 40·sin 65.6° ≈ 46 … An object level with or above the
camera cannot enter a frustum whose highest ray points 30° down."

On disk:

- prototype3d.ts:9174 — camDist runs **26 to 340**, not to 40. The file's own
  comment at :934 says the camera "sits ~318 units at WORLD ENDER and sees
  roughly +/-150-190 units of ground".
- prototype3d.ts:9264-9266 — `tmpV.copy(camOffset).multiplyScalar(camDist);
  tmpV.x += lookX; tmpV.z += lookZ;` — camera world **height is
  camOffset.y·camDist, absolute** (nothing is added to y). With the steepening
  at :9231-9232 (camOffset (0.62,0.92,0.62) → (0.45,1.4,0.45), i.e. pitch
  46.4° → 65.6° — I verified both endpoint angles), normalized camOffset.y is
  0.724 → 0.910, so **camera height runs ≈27 → ≈309 units**.
- The envelope's underside is at world y ≈ 45.6 (group 42±2.2 at
  island.ts:3491-3494 ✓ verified verbatim, + local y 9.6 at assets3d.ts:168 ✓,
  − 3.1·1.24); its top ≈ 57.6. **The camera rises above the balloon's
  underside from R ≈ 2.0 (camDist ≈ 68) and above its top from R ≈ 2.3** —
  early-mid match, every match.
- Once above it, the balloon is inside the frustum's vertical band
  [pitch−16°, pitch+16°] over a wide horizontal window. Computed from the
  same constants: at R=2.5 the window is 8–25 u horizontal from the camera
  (slant 16–29 u); R=3: 13–43 u; R=5: 26–96 u; R=8: 25–137 u; R=12: 38–208 u.
  Concrete ordinary configurations (void on the island, balloon on its 125-u
  orbit, dead on the fixed 225° view azimuth): R=5, void (−107.5,−107.5),
  balloon at orbit angle 225° → depression 53.0° inside [39.5°, 71.5°], slant
  99 u, IN FRAME. R=8 → depression 56.1° inside [49.1°, 81.1°], slant 190 u,
  IN FRAME. R=12 → depression 50.2°, slant 312 u (far plane 1000), IN FRAME.
  The balloon laps the island every ~5 minutes, so the azimuth alignment
  recurs continuously.
- The GOVERNOR "1500 stars" analogy fails on the one property that matters:
  the starfield is **re-centred on the camera every frame**
  (island.ts:3485-3486), so its elevation band is camera-relative and fixed.
  The balloon is world-anchored while the camera climbs to ~309. Same for
  OWNER-2026-08-25's "−34 to −62 degrees, the only band the camera can see" —
  that governs camera-anchored sky content, not a prop at fixed world height.

Consequences, in the proposal's own terms: the 14×10 sag of 0.0777 (7% over
the tree bar — arithmetic ✓) was excused solely by "its triangles buy gameplay
pixels never", which is false; and the disclosed flat-shading coarsening
(equatorial facet 1.08 → 1.39 u, arithmetic ✓) is photographable at the
gameplay camera — at the R≈2.5–4 approaches (slant 16–50 u) a 1.39-u facet
subtends 1.6–5°, tens of pixels. §8's own criterion — "any Maple shot that
frames the balloon [showing a legible delta] is a KILL on the patch that
caused it" — plus §8's false prediction ("patches 3–4 are out of the gameplay
frustum") close the case. GOVERNOR standing rule 3 (every number written down
must be one you actually ran) is the epitaph: 40·sin 65.6° ≈ 46 was never run
against prototype3d.ts:9174. **KILLED.** A refile must stand on photographs at
mid/late-match camera heights (R 2.5–12), not on this arithmetic.

### 5. Patch 4 (CONFIRMED math, KILLED as filed)

- Anchor assets3d.ts:173 verified verbatim, 10-space indent ✓; gores share the
  envelope's scale (1, 1.24, 1) and y 9.6 (:175) ✓, so the pre-scale radial
  argument survives the squash.
- Poke-through math ✓: φ span π/5.5 = 32.727°, /4 = 8.18°/segment, half-angle
  4.09°; 3.13·cos 4.09° = 3.1220 ≥ 3.122 vs envelope ≤ 3.1 → ≥ 0.022 proud,
  PROVIDED the θ rings align (same H): with matched rings both meshes chord
  identically in θ, so the margin holds between rings and at the poles
  (gore pole 3.881 vs envelope pole 3.844).
- The load-bearing constraint is real, and I confirmed its failure mode: with
  (4,10) gores on an 18×14 envelope, the gore mid-chord between its H=10
  rings dips to 3.13·cos 4.09°·cos 9° = **3.0836 < 3.1** — envelope ring
  vertices poke through by up to ~0.016. Landing 4 without 3 is a geometry
  bug, exactly as §5 says.
- Verdict: the patch is titled "lands only WITH Patch 3". Patch 3 is killed,
  so patch 4 as written (`3.13, 4, 10`) **must not land — KILLED as filed.**
  The §5 conditional variant (`3.13, 4, 14`) is geometrically sound (matched
  H=14 rings, same 0.022 margin) but is ALSO argued invisible via the same
  false frustum claim, and its stated arithmetic is wrong (see Corrections):
  savings are −624, not −520. If the crew wants the gore reduction, refile it
  with patch 3's replacement under the same photograph gate.

### 6. Patch 5 mechanics (CONFIRMED; constant must be the proposal's own fallback)

- Anchors verified byte-exact and unique on this tree: `const BASELINE = 154;`
  at :49 (sole occurrence as a statement); `const hits = [];` + `let total = 0;`
  at :58-59; `total++;` + `const w = Number(m[2]), h = Number(m[3]);` at
  :65-66; the 5d before-text at :85-88, and the proposal's uniqueness argument
  is correct — `}` + `console.log('');` occurs at :81-82 AND :85-86, and only
  the second is followed by a blank line and `if (hits.length > BASELINE) {`.
- The spend counter is inserted inside the same `matchAll` loop that counts
  `total`, so it prices exactly the counted calls — and every counted call is
  a full 3-arg sphere, for which 2·W·(H−1) is exact. (For θ-partial caps the
  formula would be wrong, but the regex cannot count those; the proposal even
  used correct cap-aware arithmetic for the declined dish: 266→150 ×34 = 3,944 ✓.)
- Gate compatibility: qa/gate.mjs:181-183 runs roundlod under `verdict: pf` in
  profiles push/live/art; pf (:360-365) parses `^\s*PASS\s*[—-]` / `^\s*FAIL\s*[—-]`
  lines. The new FAIL branch prints `FAIL — the sphere spend grew: …` and
  exits 1 → gate fails ✓. The two info lines (`  site spend: …`,
  `  the spend FELL, …`) start with spaces + lowercase, so they cannot trip
  either pattern ✓. Exit codes stay 0/1/2; the 10-file abort guard is upstream
  and untouched ✓.
- Deadlock: none possible. Both ratchets are independent threshold checks on
  independent quantities, both constants live in this one file, and the probe
  enforces nothing about commit messages — a debt-paydown commit lowers
  BASELINE and raises TRI_BASELINE in the same edit. The escape wording is
  convention, same exposure BASELINE has always had (risk 3 states this honestly).
- The constant: with the balloon rider killed, **TRI_BASELINE = 39,018**
  (39,242 − 112 − 112), exactly the fallback the proposal itself wrote in §7.
  The 5a comment's arithmetic must change with it — verbatim block below.
  38,802 must not land: it would brick the gate on the post-patch-1+2 tree
  (spend 39,018 > 38,802 → permanent FAIL).

### 7. Ground rules, HANDS OFF, seeded streams (CONFIRMED)

- docs/CREWS-ROUND-2.md decision 5 and round-2B rules read; the proposal is an
  exact patch with anchors, draw accounting, triangle cost, and a probe, and
  its §8 landing order gives GOVERNOR rule 2 its failing run (patch 5 first,
  FAIL on unharvested geometry — with 39,018 the expected failing line changes,
  see Corrections). Owner decision 5 (OWNER-2026-08-25.md:342-343) read.
- HANDS OFF respected: patches touch tailgate.ts:869/883, assets3d.ts:165/173,
  qa/roundlod.mjs only. Nothing in void3d.ts, rivals.ts, life.ts heads,
  fear-face geometry, or hero-worn hatgeo caps.
- Seeded stream: word-boundary grep for mrnd/mr/mpick/mchance in tailgate.ts
  and assets3d.ts — **0 hits in both** ✓. tailgate's local rnd/pick (:74-75)
  are Math.random ✓; makeHelmetProp's `pick` (:881) is that Math.random pick;
  Game Day's plant() scatters with Math.random (island.ts:5641) ✓;
  spawnBalloon's fallback (:159-193) makes no random calls ✓. Segment-count
  literals draw nothing. Delta 0 on every stream, as claimed.
- Line-drift notes (text matched, numbers off, NOT kills): the "pack is gone"
  prose sits at assets3d.ts:109-115 (the proposal cites :96-101, where the
  inert-opts declarations live — opts.h inert ✓ :91); "drifting scenery seen
  from a long way off" is at assets3d.ts:157 ✓ as cited.

### 8. Totals re-checked

−112/instance (252→140) ✓ ×134 = −15,008 ✓; ×120 = −13,440 ✓; sum −28,448 ✓;
×111 B = 3.16 MB ✓ (111 B/tri stated in the roundlod header ✓); war chest
28,448 / (252−80) = 165.4 conversions ✓. Balloon envelope −216 ✓ and gores
−752 ✓ die with their patches. Spawn counts are attempts — the tree's own
comment at island.ts:5633-5637 records 861/2,364 placements on a prior
(since-fixed) build; risk 1's "upper bound" framing is honest and stands.

## Corrections (verbatim)

**C1 — Patch 5a, the constant and its comment (replaces the proposal's 5a
"After" block in full; required because patches 3–4 are killed):**

```js
const BASELINE = 154;

// THE SPEND — the same counted calls, priced instead of judged:
// 2*W*(H-1) summed per call SITE (not per instance; the probe cannot see
// spawn loops). It ratchets DOWN like BASELINE and for the same reason:
// triangles harvested from over-tessellated spheres can otherwise be
// quietly given back. RAISING it has exactly one legitimate case — paying
// under-bar debt down (8x6 -> 14x10) costs triangles by design — and it
// happens in the same commit that lowers BASELINE, with the arithmetic in
// the commit message. 39018 = 39242 measured on the pre-harvest tree,
// minus 224: two 14x10 -> 10x8 (tailgate.ts:869,883).
const TRI_BASELINE = 39018;
```

**C2 — §8 step 1's expected failing run (evidence line for the landing
commit) becomes:**

```
FAIL — the sphere spend grew: 39242 against a recorded 39018.
```

and step 2's expected passing line becomes `site spend: 39018 …`.

**C3 — for the record, and binding on any refile of the gore patch: §5's
conditional arithmetic "(i.e. `3.13, 4, 14` — −520 instead of −752)" is
wrong. Per gore 2·4·13 = 104; four gores 1,040 → 416; the saving is −624,
not −520.** (The proposal's own formula, applied by the proposal's own rules —
φ-partial spheres keep both poles, so 2·W·(H−1) applies.)

Patches 5b, 5c and 5d land exactly as written in the proposal. Patches 1 and 2
land exactly as written. Patches 3 and 4 do not land; any refile stands on
lookbook photographs framed at R 2.5–12 camera heights, with the frustum claim
retracted.
