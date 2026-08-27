# VERDICT: SOUND WITH CORRECTIONS

Ruled 2026-08-27 by the round-2b skeptic. I tried to kill this on the sign, on
draw parity, on the tag, on the probe, and on the ground rules. It survived all
five. The corrections below are real errors in the proposal's PROSE and in one
comment line of patch 1; none of them touches the executable code of the six
patch blocks, and each is verbatim and mechanically applicable. Nothing lands
until they are applied.

---

## What I checked on disk

**1. THE SIGN — tried to kill it, failed.**

- Re-derived the convention from the rotation matrix: right-handed rotation
  about +Y is `[cos t, 0, sin t; 0, 1, 0; -sin t, 0, cos t]`, so `rotation.y = t`
  sends local +X to world `(cos t, 0, -sin t)`. The crew's formula is correct.
- Re-ran the empirical leg myself against this repo's own
  `node_modules/three/build/three.module.js` (one-shot node script in the
  scratchpad, no server, no build): `rotation.y = -PI/4` sends `(1,0,0)` to
  `(0.7071, 0.0000, 0.7071)`, dot with normalized `(0.62, 0, 0.62)` =
  **1.000000**; both band edges (-105°, +15°) measure dot **0.500000**;
  the formula error against `(cos t, 0, -sin t)` is ~1e-16. All three of the
  crew's numbers reproduce exactly. The deliberately flipped constant `+PI/4`
  measures dot **-0.000000** — 90° off, not 180° (see correction C3).
- The face really is on local +X: alpine.ts:461-464 (eyes at `(wob*2+0.27)*k`,
  carrot at `(wob*2+0.42)*k`), buttons on +X at :466-467. Verified
  character-for-character.
- `drop()` (island.ts:5154-5161) assigns `mesh.rotation.y = rotY` directly at
  :5157 — no sign flip, no offset. `place()` (:5115-5142) can only override via
  `spinFor` when `userData.spin` is set AND `|rotation.y| < 1e-6` (:5126);
  `makeSnowman` returns `lit(...)` (alpine.ts:502, lit at :137-142), which never
  sets `userData.spin`, and `spinFor` (island.ts:276-279) is a deterministic
  position hash consuming zero draws. The explicit yaw survives.
- Camera azimuth is fixed: `camOffset (0.62, 0.92, 0.62)` at prototype3d.ts:600
  (exact), and the growth steepening — now at **:9231**, not :9217 — sets x and
  z with the identical expression `0.62 + (0.45 - 0.62) * steep`. Azimuth never
  moves. (prototype3d.ts has three commits since the world landed; several of
  the crew's cites into that file drifted +14..+18 lines. island.ts, alpine.ts,
  void3d.ts, bay.ts, powder.ts and rivals.ts cites are all exact.)
- Dress precedent verified on disk at void3d.ts:2041 (exact) and re-run in
  node: `rotation.y = atan2(dx, dz)` sends +Z to `(dx, 0, dz)/L`, so a +X front
  needs `atan2(dx,dz) - PI/2 = -PI/4` at `(1,1)`. Same answer.
- Signpost precedent verified: bay.ts:172 (exact) gives the math bearing
  `atan2(dy, dx)`; island.ts:5209 passes `-pp.ang`; and the board construction
  inside makeSignpost (alpine.ts:699-701) places each board at
  `(cos ry, y, -sin ry)` under `rotation.y = ry` — a fourth, independent
  in-repo confirmation of the +X convention. With P3 mapping 2D y straight to
  world z (island.ts:5152, w() at :77), "face 2D bearing beta" = `rotY = -beta`
  is exactly right, and the lens bearing `atan2(+1,+1) = +PI/4` gives -PI/4.

**2. DRAW PARITY — counted every branch at all five sites, could not kill.**

Before-code at all five anchors matches disk character-for-character
(island.ts:5180-5185, :5193-5194, :5219-5222, :5227-5231, :5290-5296).
`const rnd2 = Math.random;` occurs exactly once in the file, at :5163.
Per site, both/all branches, before and after: village clutter — yaw arg one
draw either way (`snowmanYaw()` contains exactly one `rnd2()`); contest — one
for one, unconditional; lake shore — `kind < 0.7` branch one draw, else branch
one draw; snack ring — `kind < 0.8` both branches one draw; mid-size fill —
`kind >= 0.5 && kind < 0.72` both branches one draw, and the pine-height draw
in the mesh ternary is untouched. The r and qk ternaries contain zero draws.
The position generators (`scatterInRegion`, `clusterAt`, `scatterLand`) return
completed arrays before the loop bodies run and are untouched. JS evaluates
call arguments left-to-right, so the single yaw draw sits at the same stream
position in every case. Branch-to-tag mapping is correct at every site
(snowman iff kind<0.3 / always / >=0.7 / >=0.8 / in [0.5,0.72)), and the
load-bearing `'drift'` tag in patch 6 is preserved with correct nesting.
The five sites are exhaustive: `makeSnowman` is called nowhere else in
island.ts and nowhere outside alpine.ts/island.ts.

**3. THE 'snowman' TAG — the crew's consumer list is INCOMPLETE; the
conclusion survives anyway.** I swept every reader of `userData.qk` in
src/ and qa/. The crew missed four:

- **prototype3d.ts:5243 — `if (qk) questEvent(qk);`** The eat handler
  dispatches EVERY tag as a quest event. This is the one that could have
  killed the patch. It does not: `questEvent` (:3511) matches quests by
  `kind`, and no entry in `QUEST_POOL` (:3315-3336) has kind `'snowman'` —
  the loop matches nothing, no count, no render, no save. Neutral today.
- prototype3d.ts:5251 — `HOUSE_LIKE.includes(qk)`; the list (:3412) is
  `['house','rv','chalet','lodge','hut']`. Neutral.
- prototype3d.ts:5260 — FIRST RUNNER fires on `mover && !qk`; snowmen never
  carry `userData.mover`, so tagged or not, unaffected.
- prototype3d.ts:6143-6144 — the placement validator tests `'house'`/`'car'`
  only. Neutral. (qa/questable.mjs bumps a supply key per tag but only reads
  keys that are drawable quest ids — extra `'snowman'` supply is never read.)

The listed consumers check out at corrected lines: MEAL_NAME (:3719-3728, no
`snowman` key in either branch), mealOf (:3737-3738, `'goat'`/`'car'` only),
the SNOW SHELL drift check (:5032), rivals.ts:771 (exact — and a snowman fails
every clause of the `big` test, so it sinks spinning exactly as before).
`drop`'s signature is as claimed: 5th arg `force = false` (island.ts:5154), so
passing `false` explicitly to reach the `qk` slot is behaviourally identical.
`git log -S`: the tag shipped on sites 2-3 with the world on 2026-08-21.
Risk 4's shape (a future consumer) is now concretely real — `questEvent(qk)`
means a future `'snowman'` quest kind activates the moment someone adds it —
which is an argument FOR completing the census now, as the crew says, but the
"verified by grep of every qk consumer" sentence must be corrected (C1) so no
later reader trusts an incomplete list.

**4. THE PROBE and its bars — would fail before, pass after; blind spot
honestly handled.** ARC: pre-patch, sites 2-3 already tag ~17 snowmen
(12 expected village + 5 contest, minus spotOpen rejections) with uniform
yaws; P(all inside a 120° arc) = (1/3)^N ≈ 7e-8 at N=15 — red on the
pre-patch build, as rule 2 demands (the crew's simulated 1/10000 at N=8
matches (1/3)^8 = 1.5e-4). Post-patch, the jitter range [-PI/3, +PI/3) sits
inside HALF = PI/3 + 1e-6 including the exact rnd2()=0 extreme — green by
construction. DISTINCT and DRILL behave as claimed (24 buckets, ~2.5-4 props
each at the real census, vs 100% in one bucket for a constant-yaw regression).
SELF-CHECK's floor of 8 is below the pre-patch tag count, so the pre-patch
run reaches ARC rather than dying at the census. The settle discipline is
copied verbatim from shipped variety.mjs (localStorage block, __voidState
wait, edible-stability wait, comma-joined `voidUnlocked` — the GOVERNOR-
recorded trap), the 5° bucketing formula is variety.mjs's own line verbatim,
and the census-not-match-clock argument is consistent with shipped practice:
variety.mjs and questable.mjs both boot `?w=` without pressing PLAY and count
completed placements from the menu, so rule 4's wrong-clock trap genuinely
does not apply — the faceparity.mjs trap (cited ~:129-137, on disk ~:130-134)
is about `__matchState().t`, which this probe never reads. `window.__edibles`
and `window.__voidState` are real `_dbg` globals (prototype3d.ts:1731). The
shared-constant blind spot is stated in the probe header and the screenshot
leg is genuinely independent; its warp helper exists (`__warpVoid`, now
:1877, drags camera and spring), the cluster arithmetic holds (clusterAt
radius 220 world units x SCALE 0.05 (island.ts:75) = 11 units against the
owner-doc frame reach of ~14), and the BEFORE-build gate arithmetic is right
except one rounding slip (C6). One quantitative claim about the flipped-sign
signature is wrong and must be corrected (C3, C4): a flipped constant centres
faces 90° off the lens — a field of profiles, of which only a fraction
(roughly a third to a half, given the ±97°/±122° eyes-visible arcs recorded
at alpine.ts:482-489) is fully back-turned. The AFTER gate (zero back-turned
across 8+ snowmen) still rejects a flipped build with near-certainty, so the
leg GATES correctly — but the "ALL back-turned = sign flipped" diagnostic
would likely never trigger on a real flip and must not be the trigger for
touching the constant. Note for the future, not a correction: with the tag
census between 8 and ~25 (a sparse rebake that clears MIN_N), the 25% DRILL
bar acquires a 3-10% false-RED rate — loud in the safe direction, but worth
knowing before anyone debugs a red DRILL on a thinned world.

**5. GROUND RULES.** CREWS-ROUND-2.md rule 1: exact patches, seeded
accounting, triangle cost, probe — all present. The crew's correction of the
retained outline is itself correct: on disk all five sites already pass
`rnd2() * Math.PI * 2`; the defect is direction, not sameness. Owner decision
3 gloss quoted verbatim from OWNER-2026-08-25.md ("Snowmen face the camera.
The fixed 225-degree camera azimuth..."). GOVERNOR ledger: no snowman/yaw/
facing entry exists, so nothing refuted is repeated. HANDS OFF: grepped
island.ts:5144-5299 for `mrnd|mr(|mpick|mchance` — zero hits; alpine.ts's
only textual hit is the accounting comment at :252; the patch adds no seeded
call. The Maple stream cannot move. "Spawn and the opening hand are
hand-authored" refers to the seeded worlds — powder rebuilds from Math.random
every load by design, and parity keeps every non-snowman placement identical
given the same underlying sequence. Environment respected: no tracked file
edited, no server, no build; the only executions were read-only greps and a
one-shot node script against the repo's three.js.

**The side-lead (one paragraph, as asked).** Plausible enough to file as its
own PENDING item — with its remedy struck. I verified the geometry: PISTE
ends at (6100, 2400) ≈ the lodge (6100, 2350) and runs out to y=5800, so the
Home Run is at +y ("south") of the lodge; the entrance and G_HEARTH doorway
are on local +X (alpine.ts:292-294, :336-341); `pwFacingLodge` (powder.ts:
246-247) returns the bearing TO the lodge, so at the aimed point it returns
exactly -PI/2 and the shipped `+ Math.PI` yields rotY = +PI/2 — which, under
the four-way-verified convention, points the doorway at bearing -PI/2, away
from the piste. The diagnosis is coherent, cites real code, and costs one
screenshot to confirm. BUT the crew's one-line fix is algebraically a NO-OP:
`-pwFacingLodge(cx, cy+2000)` = -(-PI/2) = +PI/2, bit-identical to the
shipped value (negation and +PI coincide precisely at ±PI/2). The correct
candidate is `-(PW.pwFacingLodge(PW.LODGE.cx, PW.LODGE.cy + 2000) + Math.PI)`
(= -PI/2). File the lead with C5 applied; do not land anything unrendered.

---

## Corrections (verbatim)

Apply each to `docs/crews/round-2b/snowman-yaw.proposal.md` (C2 also lands in
the patch-1 comment when the patch is applied). Old text is exact; replace
with the new text.

**C1 — the tag-neutrality claim (triangle-cost section).** Replace:

> The tag
> is behaviour-neutral, verified by grep of every `qk` consumer: `MEAL_NAME`
> has no `snowman` key (prototype3d.ts:3701-3710) so `lastMeal` falls through
> to `mealOf()` exactly as with `qk` undefined; `mealOf()` tests only
> `'goat'`/`'car'` (:3719-3720); the shell check tests `'drift'` (:5014);
> rivals' sink check tests `'house'` (rivals.ts:771).

with:

> The tag
> is behaviour-neutral, verified against every `qk` consumer: the eat handler
> dispatches `questEvent(qk)` for ANY tag (prototype3d.ts:5243), but no entry
> in `QUEST_POOL` (:3315-3336) has kind `'snowman'`, so the dispatch matches
> nothing and has no side effects — note this means a future `'snowman'` quest
> kind activates on these tags the day it is added; `HOUSE_LIKE`
> (:3412, tested at :5251) is `['house','rv','chalet','lodge','hut']`; the
> FIRST RUNNER moment (:5260) requires `userData.mover`, which no snowman
> carries; `MEAL_NAME` has no `snowman` key (:3719-3728) so `lastMeal` falls
> through to `mealOf()` exactly as with `qk` undefined; `mealOf()` tests only
> `'goat'`/`'car'` (:3737-3738); the placement validator tests `'house'`/
> `'car'` (:6143-6144); the shell check tests `'drift'` (:5032); rivals' sink
> check tests `'house'` (rivals.ts:771); qa/questable.mjs counts a supply key
> per tag but only ever reads keys that are drawable quest ids.

**C2 — patch 1's comment, stale line number.** In the patch-1 after-block,
replace:

> // every zoom (:9217) — fixed azimuth, so "toward the lens" is the constant

with:

> // every zoom (:9231) — fixed azimuth, so "toward the lens" is the constant

and in the derivation section, replace:

> (:9217, `0.62->0.45` on both, same expression)

with:

> (:9231, `0.62->0.45` on both, same expression)

**C3 — derivation leg 4, the flipped-sign signature.** Replace:

> (It would be unmissable: a flipped sign
>    shows every snowman's scarf-tail and hat-back, zero eyes, in every frame.)

with:

> (It would be caught, but not as all-backs: a flipped sign centres every
>    face 90 degrees off the lens — a field of profiles, a third to a half of
>    them fully back-turned given the ±97°/±122° eyes-visible arcs — so the
>    AFTER bar of zero back-turned fails with near-certainty across 8+
>    snowmen.)

**C4 — screenshot judgment, same error.** Replace:

> (and if ALL are
>      back-turned, the sign is flipped — reject, flip the constant's sign
>      only after re-running derivation leg 1)

with:

> (a wrong-signed constant reads as profiles with MANY back-turned, not
>      all — do not wait for ALL back-turned as the flip signature; on any
>      AFTER failure, re-run derivation leg 1 before touching the constant)

**C5 — the side-lead's remedy is a no-op.** Replace:

> If real, the
> hearth glow authored to be visible from spawn has never been on camera, and
> the fix is deleting `+ Math.PI` and negating: `-pwFacingLodge(...)`.

with:

> If real, the
> hearth glow authored to be visible from spawn has never been on camera. The
> candidate fix is `-(PW.pwFacingLodge(PW.LODGE.cx, PW.LODGE.cy + 2000) +
> Math.PI)` (= -PI/2). NOT `-pwFacingLodge(...)` alone: `pwFacingLodge`
> returns exactly -PI/2 at this call site, so bare negation reproduces the
> shipped +PI/2 bit-for-bit — negation and +PI coincide at ±PI/2.

**C6 — one rounding slip in the BEFORE-build gate.** Replace:

> the chance a uniform build shows zero
>      across 8+ snowmen is 0.54^8..0.68^8 = ~0.6%..4.6%

with:

> the chance a uniform build shows zero
>      across 8+ snowmen is 0.54^8..0.68^8 = ~0.7%..4.6%

**C7 — drifted prototype3d.ts cites (prose only).** Replace `prototype3d.ts:3613`
with `prototype3d.ts:3631` and `the world-picker beat` with `the match beat`
(patch 3's why); replace `prototype3d.ts:1859` with `prototype3d.ts:1877`
(screenshot leg step 2); replace `(TOPDOWN at prototype3d.ts:9596, ASSETVIEW
at :9595)` with `(TOPDOWN and ASSETVIEW, defined at prototype3d.ts:649/:651,
debug cameras at :9163-9166)` (risk 6). prototype3d.ts has moved three
commits since the world landed — re-verify these cites against HEAD when the
patch lands, per round rule 2.

---

## GOVERNOR'S LANDING NOTE — 2026-08-27

Landed with all seven corrections applied. Evidence:

- `qa/snowyaw.mjs` BEFORE (patch reverted, rebuilt): **15 snowmen, 9 outside
  315±60°, exit 1**. AFTER: **91 snowmen, 0 outside, top 5° bucket 9% across
  26 buckets, no duplicates, exit 0**. N rises 15 → 91 because patches 4-6 tag
  three sites that never carried one.
- The rendered sign check (`qa/out/shippedlook/powder_snowyaw.png`): three
  snowmen in frame, all three showing carrot, buttons and hat-front. Zero
  back-turned, which was the pass condition fixed in advance.

**A second sample is recorded here rather than discarded quietly.** The shoot
ran twice; the second frame landed where no snowmen were in frame at all. That
is a null sample — it judges nothing either way — and it was NOT kept as the
evidence frame, because a photograph of no snowmen cannot show a face or a
back. The committed frame is the one with subjects in it. The statistical
weight sits with the census (91 measured) and the photograph carries only the
sign, which is exactly the division of labour the skeptic's C3/C4 corrections
called for.
