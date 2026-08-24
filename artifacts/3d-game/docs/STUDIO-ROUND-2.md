# STUDIO — ROUND 2

Run 2026-08-24. 18 agents, 8 teams, 8 skeptics, art direction, governor plan.
2,493,730 subagent tokens, 678 tool calls. Verdict: **NO-SHIP**.

This file is the verbatim record of the round. It has not been edited for length.
Findings here are NOT yet verified — the studio is an instrument, not an oracle.
Six retractions stand against earlier probe work in this repo; treat every claim
below as a lead to check against the source, not as a fact.

Board (all 8 teams + their skeptics): `docs/STUDIO-ROUND-2-BOARD.md`

---

## ART DIRECTION

I have what I need — including a timing fact that changes how several of the board's findings should be read.

## VERDICT: NO-SHIP

The hero wears a different face in Powder Pass than in the other four worlds, and which face he wears is decided by how many props the level designer scattered — the one element that must be identical everywhere is the only one that isn't.

**A timing note the whole board needs first.** `maple_look.png` was shot 08-23 23:21. The canopy and flower-bed fixes landed in `207e2cb` at 08-24 00:47. `maple_front.png` (08-24 01:09) is the only Maple frame in the pack that postdates them. Every finding on this board citing flower-bed facets or the twelve-lobe canopy in `maple_look.png` is citing a stale frame — the facets are gone (`island.ts:4459` is now `SphereGeometry(R, 9, 6)` with stems). What survives into the post-fix frame is a different defect with a different cause, below.

---

## DOES IT READ AS ONE GAME?

**Half.** It reads as one game's *world* and five different games' *finishes*.

The form language is genuinely unified and it is good: in all five frames every object is primitive-assembled, untextured, silhouette-first, and obeys the same smooth-vs-flat rule. Put the Maple bench, the Powder snowman, the Pirate barrel and the Lantern stall on one sheet and they are unmistakably from one kit. The hero is the strongest identity asset in the product — same purple, same face, same rim, same scale relationship in every frame. A child would recognise this game from a thumbnail.

What does not cohere is everything downstream of the geometry: **exposure, shadow character, and the hero's expression.** In `maple_look.png` the world is high-key, saturated, with soft grey shadows. In `gameday_look.png` the same kit is dark, desaturated, and every shadow is a hard black silhouette pasted on tarmac — the fire truck's cab-top and body-side render as the *same* flat red because two channels are on the floor. In `lantern_look.png` the bottom third of the frame carries no material information at all. In `powder_look.png` the palette narrows to blue-grey-white and the hero grins; in the other four he does not. These are not five moods of one renderer. They are three renderers.

---

## THE STYLE, STATED

> **THE CUTE WORLD ENDER — visual language.**
>
> Everything in this world is **assembled from primitives, never modelled and never textured.** A prop is five to twenty spheres, cylinders, cones and boxes, merged into one mesh carrying per-vertex colour — one draw call, no maps of any kind. **Identity lives entirely in silhouette**; surface carries nothing, so if a prop doesn't read as itself in black at 40 pixels, it is not finished.
>
> **The single most important rule is the smooth/flat split.** Anything grown or soft — foliage, people, snow, the hero — is smooth-shaded and built from round primitives. Anything built or manufactured — architecture, boxes, signs, vehicles — is flat-shaded with visible facets. This is mechanical, not a matter of taste: `ROUND_GEO` (`island.ts:3677`) plus a 50% vote (`ROUND_SHARE`, `island.ts:3834`) assigns the material. A faceted plant or a smoothed shopfront is a language error, not a style choice.
>
> **Detail stops at the mark.** Lettering is implied by tonal bars, never glyphs (`signLines`). A face is two ink dots and a painted brow — a mark, never a feature; there is no mouth on a townsperson and no white sclera on anyone but the hero. Two-tone props are built as **a dark mass carrying small light accents**, never light lobes with dark trim, and the tones are set with `shade()`/`tint()` (`island.ts:3698`) which work in display space so the numbers mean what they say.
>
> **Palette is spaced, not picked.** District grounds sit at least 1.35:1 apart in value so neighbours separate without outlines. Props draw from small named pools per world. **Violet belongs to the hero alone** — nothing else in the game is allowed near his hue, because he is the only thing on screen that is the player.
>
> **Light is a mood, not a setup.** One key, one non-shadow-casting fill, one hemisphere, authored per world for how the place should *feel*. Shadows are the only ground detail that exists, so they must read. **The hero is deliberately exempt from all of it** — he carries a fixed view-space illustration key (`void3d.ts:236`) so his read is identical wherever the camera swings. That is correct and should not be undone.
>
> **Proportion is the one literal thing.** A bench is bench-sized, a person person-sized, a house house-sized. Everything else is stylised, but scale relationships are load-bearing, because the entire game is a size comparison.

**Where it sits:** between **Donut County** (Annapurna, 2018) — same verb, same locked-high camera, same untextured primitive kit — and **Animal Crossing: New Horizons** (Nintendo, 2020) for its palette warmth and canopy treatment, with **Crossy Road**'s (Hipster Whale, 2014) silhouette-first legibility discipline underneath it. It is explicitly *not* Katamari Damacy (too dense, too photographic a prop kit) and explicitly *not* hole.io (flat-shaded everything, no character, no palette).

---

## WHERE IT BREAKS

Ranked by how much each costs the read.

### 1. The hero has two faces and the level dressing chooses which
**SEVERITY: blocker** · **AT:** `src/proto3d/void3d.ts:1939` with `void3d.ts:1166` and `src/prototype3d.ts:8809`

**SAW:** `powder_look.png` — a wide dark grin with a pink tongue, brows up, blush on. It is genuinely lovely and it is the face this game is sold on. `maple_look.png`, `pirate_look.png`, `gameday_look.png`, `lantern_look.png` — all four show a small **portrait-format** dark oval with a pink dash, sitting at the level of the lower eyelids. It reads as a nostril. Same probe, same `__setVoidR(4)`, same wait, four of five worlds. In `maple_front.png` at spawn radius it is a black speck and the hero has no mouth at all.

**EVIDENCE:**
```
void3d.ts:1939    mouth.visible = mo < 0.25;
void3d.ts:1166    hungry:  { pupil: 1.28, smile: 1.1, maw: 0.26, ... },
prototype3d.ts:8809  if (d < reach * 0.85) hungryT = tClock;   // food in the well
```
`mo = Math.max(biteEnvelope, mp.maw)`. `hungry` floors `mo` at **0.26** — one hundredth over the threshold that hides the grin — and `hungryT` is refreshed by *any* edible inside the magnet well with a 0.45 s window. In Maple, Pirate, Game Day and Lantern something is always in the well, so `hungry` never lapses. Powder Pass is edible-starved, so it falls to `cruise`, `mp.maw = 0`, and the grin shows.

This is the cross-team defect. TEAM HERO found the threshold and called it a bug. TEAM CHOREOGRAPHY's skeptic found the mood floor and called it a mood-collapse. Neither could see from inside their own surface what the two make together: **the hero's expression is currently a readout of level prop density.** The gape is also authored portrait (`mawDark.scale.set(1, 1.15, 1)`, `void3d.ts:1042`) against a grin that is landscape (`lip.scale.set(1.34, 0.76, 1)`), so the swap is a 2:1 aspect flip — two unrelated mouths, exactly what the comment at `void3d.ts:1000` says was supposed to have been unified.

**FIX:** three constants, **0 draw calls, 0 triangles, 0 seeded draws.** `mawDark.scale.set(1.34, 0.92, 1)` so the gape grows out of the grin's own footprint; `tongue.scale.set(1.50, 0.70, 1)`; `mouth.visible = mo < 0.55`. At `hungry`'s 0.26 that draws a small dark parting *inside a visible grin* — a hungry, slightly-open smile, which is what the mood table plainly asks for. Do not "fix" this by widening the hungry window or thinning the magnet well: the mood is right, the threshold is wrong.

**GATE:** `qa/faceparity.mjs` — for each of the five worlds, at `__setVoidR(4)`, mask the face disc and measure the mouth's bounding box as pixels near `MOUTH_RIM 0x2a0e2e` or `MOUTH_IN 0xff6f91`. Assert (a) width ≥ height in every world, and (b) the **spread of mouth width across the five worlds is under 25%**. Today Powder returns a landscape grin and the other four return portrait ovals at roughly a fifth of its width — (a) fails on four worlds, (b) fails outright. This is the probe the studio does not have and needs: a *parity* probe, not a per-world one.

### 2. Two tree languages stand in one frame, and the fix that shipped did not close it
**SEVERITY: blocker** · **AT:** `src/proto3d/mainstreet.ts:1716` against `src/proto3d/island.ts:3909`

**SAW:** `maple_front.png` — the post-fix frame, 08-24 01:09. Top-left and centre: green trees that read as soft lobed clouds; you cannot pick individual lobes out of them. Bottom-right: the autumn cluster, where I can count a dozen individually legible balls — a tan one beside a red one beside a brown one, each with its own highlight. Same frame, same camera, same distance, same material. One is foliage; the other is a bag of marbles. Also visible in `maple_look.png` (pre-fix) but the fix has since landed and **it did not close it**, which is the finding.

**EVIDENCE:** The structural fix worked — the dark mass is now the silhouette and the accents are pulled inside. What is left is a colour rule, and it is the opposite of `makeTree`'s:
```
island.ts:3903     const base = pick(foliagePool());          // ONE hue
island.ts:3909     part(SphereGeometry(R0,14,10), dark, ...)  // shade(base,0.70)
island.ts:3910-12  ... base ... light=tint(base,0.26) ... base
```
```
mainstreet.ts:1705  const dark = shade(leaf, 0.80);
mainstreet.ts:1707  const heroDark = shade(LEAF_HERO, 0.84);
mainstreet.ts:1716  ... i % 2 ? dark : heroDark, ...            // TWO hues, ALTERNATING
```
`PROPS.foliage` is `[0x5dbe63, 0x4faa5a, 0x6cc86e]` — three greens inside about 8° of hue. A green tree is **one hue in three values**, so adjacent lobes fuse and the canopy reads as a mass. A maple tree alternates `leaf` and `LEAF_HERO` around the six-lobe ring; for `leaf = LEAF_B (0xd8392f, a true red)` against `LEAF_HERO (0xe8903a, an amber)` that is roughly 24° of hue *and* a 1.6:1 value step **between neighbouring lobes**. Different-coloured adjacent lobes are individually legible by construction. That is the balloon read, and no amount of restructuring removes it while the hue alternates.

**FIX:** delete the alternation. `i % 2 ? dark : heroDark` → `dark`, and set `heroDark = shade(leaf, 0.70)` so the ring carries **one hue in two values** exactly as `makeTree` does; keep `LEAF_HERO` for the crown only, where a single lighter cap reads as sky-catch rather than as a second species. **0 draw calls, 0 triangles, 0 seeded draws** — the `mpick` and four `mr()` per lobe are untouched, so Maple's placement stream is byte-identical. Two tokens.

**GATE:** `qa/canopyhue.mjs` — build one `makeTree` and one `makeMapleTree` offscreen, read their merged vertex colours, and report the **hue standard deviation across each canopy's lobes**. Assert the two species land within 1.5× of each other. Today `makeTree` is near zero and `makeMapleTree` is large; after, both are near zero. This is a static geometry probe, no browser, milliseconds.

### 3. Three of five worlds are graded by a renderer nobody authored
**SEVERITY: major** · **AT:** `src/prototype3d.ts:755`, `:816`

**SAW:** the four world frames side by side. `maple_look.png` is bright and soft. `gameday_look.png` is murky, and the fire truck's top face and side face are the same flat red — there is no shading in a lit object because two of its three channels are pinned to zero. `lantern_look.png`'s lower third is a featureless brown-black smear. `powder_look.png` is pale but blue-on-blue with the flattest ground in the set.

**EVIDENCE:** `exposure` is declared, authored five times (1.0 / 1.0 / 1.12 / 1.42 / 1.18 at `:657, :660, :675, :705, :716`) and read zero times — `RIG.exposure` is the literal `1.0` at `:755` and that is what reaches `:816`. TEAM LIGHT's skeptic is right that wiring it is a re-grade and a re-shoot, not a token. **My call, as art direction: do not wire it, and do not leave it either.** Delete `exposure` from `WorldLight`, move the 1.0 into `RIG` with an on-purpose comment beside `hemiI`'s, and put a retraction line on the ledger entry that credits `1.34 → 1.42` with an improvement it never produced. Then close the actual gap with the transform, not the multiplier: `prototype3d.ts:270`'s `max(vec3(0.0), (color - 0.014)/(1.0-0.014))` is a **per-channel hard clamp**, and it is what makes the truck flat and Lantern's floor dead. A luminance-space soft knee is four ALU, cannot zero a channel, and moves nothing above midtone by more than 2/255 — so nothing anyone tuned is disturbed. That is the change that makes the five worlds look like one renderer.

**FIX:** delete the dead field (0 pixels change); replace the toe with the asymptotic knee (0 draw calls, 0 triangles, 4 ALU). **GATE:** `qa/colorpipe.mjs` gains a channel-floor sweep — no in-gamut input with all three channels above zero may produce an output channel of exactly zero. Plus a per-world frame assertion: share of pixels with any channel ≤ 2 must be under 8%, and **the spread of that share across the five worlds under 10 points.** Today it runs 6% to 30%.

### 4. The camera looks down, and one world out of five builds for it
**SEVERITY: major** · **AT:** `src/proto3d/nightmarket.ts:214`, `src/proto3d/tailgate.ts:318`, against `src/proto3d/alpine.ts:159`

**SAW:** `lantern_look.png`, dead centre — the stall canopy is a flat red parallelogram, the second-largest object in frame, with no ridge, no seam and no colour break. `gameday_look.png`, centre-right — the canopy is a blank cream pyramid, the largest surface in that half of the frame. `powder_look.png` — the chalet roofs are the only roofs in the game with a value break, and they are the only buildings in the five shots that read as architecture rather than as coloured card.

**EVIDENCE:** `nightmarket.ts:214-215` is two axis-aligned boxes with **rise = 0** under a comment reading "a shallow ridge." `tailgate.ts:318` is one four-sided cone in one colour, with its valance at y 2.6 — *below* the cone — so from above it contributes nothing. `alpine.ts:159 capRoof()` lays pitched slate, a ridge-biased snow cap, a cornice cylinder and gable boards: four elements, three tones, real pitch.

**FIX:** this is a language rule, so state it as one — **no prop may present more than 85% of its up-facing area in a single colour** — and apply `capRoof`'s kit. Stall: two boxes pitched ±0.22 rad plus a ridge roll (+2 parts, ~44 tris). Game Day canopy: four thin hip battens in the valance colour along the pyramid's hips (+48 tris). Both stay inside the existing merge: **0 draw calls, 0 materials.**

**GATE:** `qa/roofs.mjs` — for every registered edible, isolate triangles with `normal.y > 0.7`; for any prop whose up-facing area exceeds 2 square units, report the area share of its most common vertex colour. Bar: 85%. Set at 2, not 4, so a barrel lid (2.54) is inside it — 4 was TEAM STATIC's number and their own skeptic showed it misses the lid they cite. Exempt props whose *entire* geometry is one colour (drifts, slabs) so a monochrome-by-design prop is not a failure.

### 5. Maple's three commonest dressing props are one idea
**SEVERITY: major** · **AT:** `src/proto3d/island.ts:4437`, `island.ts:4335`, `src/proto3d/mainstreet.ts` planters

**SAW:** `maple_front.png` — planters at (555,330) and (720,340), flower beds at (590,910), (285,1240), (450,1250), bushes at (300,940) and (310,1100). Post-fix, all three now resolve to the same read: *a green-or-pale rounded mass with coloured balls on it.* Three of the four most-placed props in the world are one silhouette in three sizes. `qa/variety.mjs` checks variation *within* a prop type and by construction cannot see this.

**FIX:** differentiate by **form axis**, not by colour or count. Give the planter a vertical read (taller, straight-sided, one upright stem-and-blade cluster rather than scattered berries) and the flower bed a horizontal one (wider, flatter dome, blossoms at a single height). Bush stays as the pure mass. That is the Donut County move — dressing is built stem-and-blade, not ball-on-mound, precisely because a ball has no top and this camera only sees tops. Cost is a re-proportion, not new parts: **0 draw calls, roughly 0 triangles.**

**GATE:** extend `qa/variety.mjs` with a **cross-type** pass — bucket every prop under 2 units by (bbox aspect ratio, part count, dominant hue) and assert no three prop *types* land in the same bucket. Fails today on flowers/planter/bush.

### 6. Pirate Bay's own portrait contains no pirate
**SEVERITY: major** · **AT:** world composition, `island.ts` Pirate district layout

**SAW:** `pirate_look.png` is shot at spawn after a 3-second wait (`qa/shippedlook.mjs:60-73`), so it is the opening of the world. It shows a cream promenade with magenta and blue painted stripes, an ice-cream truck, two oil-drum barrels, a neon vending kiosk and beachgoers. Nothing in that frame says pirate. The district palette confirms the frame is doing its job — `DCOL` (`island.ts:923`) has `port`, `oldtown` and `cove`, and the match simply does not open in any of them.

**FIX:** this is a spawn decision, not a prop bug, and it is cheap either way. Either move Pirate's spawn to the `port`/`oldtown` boundary so the first ten seconds contain a mast, a chest and a cannon — all of which are already built (`island.ts:3928` onward) — or plant three authored pirate landmarks in the resort's sightline. I would move the spawn: the props exist, and hand-authored spawn is already the standing pattern.

**GATE:** `qa/firstlook.mjs` — for each world, at spawn, assert at least three registered edibles within the camera frustum come from that world's **identity prop list** (a short authored array per world). Fails on Pirate today.

### 7. The hero never picks up his world's light colour
**SEVERITY: minor** · **AT:** `src/proto3d/void3d.ts:236`

**SAW:** across all five frames the hero's lit rim is the same violet-white. In `lantern_look.png` he is the only thing in the frame not lit by lanterns; in `powder_look.png` the only thing not lit by cold sky.

I want the view-space key **on the record as correct and not to be touched** — it is why he reads identically at every camera swing, and in Lantern it is the only thing keeping him legible against a near-black world. Every world's sun also sits up-and-to-the-left (`off` x negative, y positive in all five rigs), so the constant already agrees with the scene. What is missing is one uniform: tint the key's *colour* per world (amber in Lantern, cold blue in Powder) while leaving its *direction* fixed. **One uniform, 0 draw calls.** He stays the same character; he stops being a sticker.

**GATE:** fold into `qa/heroswatch.mjs` — assert the hero's rim hue tracks `LIGHT.sun` hue within 30° per world, while his body hue stays within 5° of `VOID.mid` in all five. Today rim hue is identical in all five.

---

## CROSS-TEAM CONFLICTS

**A. Everyone's "free" triangles land in one 4 MB gap.** Six teams each proposed additions described as zero-cost because they add no draw calls: STATIC's roofs and barrel lathe, MOTION's split forearms (+80/person × ~100 statics) and three hairstyles (+150 × two-thirds), the maple crown (+144 × 603 trees), the landed flower stems (+110 × ~500 beds). Summed at the repo's own measured 36.9 bytes/vertex, that is roughly **160k triangles ≈ 18 MB of resident CPU-side vertex data.** Game Day sits at ~446 MB against a 450 MB budget and the audit found 84% of it is exactly this. **Trade:** triangles are not free here even when draw calls are. **Recommend:** every geometry addition above lands in Maple, Pirate, Lantern and Powder first and is *measured on Game Day before it lands there* — and Game Day, which has no maple trees and no townsfolk kit, is barely affected by the two largest items anyway. Do not let six teams each spend the same 4 MB.

**B. LIGHT wants exposure up on three worlds; GROUND wants those same three re-weighted to Lantern's grain mix.** Both move mean luminance on Game Day, and the file's own measurement at `island.ts:2799` records the grain weight change costing mean 0.706 → 0.671. **Trade:** if both land unmeasured, Game Day moves twice in opposite directions and nobody knows which lever did what. **Recommend:** neither, yet. Do the toe (finding 3) first — it is exposure-neutral by construction — then re-measure. GROUND's skeptic is also right that the defect is the speckle tile's contrast (σ≈10) and not its resolution, and raising the tile's own σ is grey-symmetric and therefore genuinely exposure-neutral. Do that before touching any world's weights.

**C. LIGHT wants Powder's sun dropped to 24° for shadow structure; GROUND wants Powder's snow brighter.** These are the same surface pulling opposite ways: `sin(elev)` goes 0.75 → 0.40, a 47% key loss on a plane that is 75% of the frame, and the proposal budgets only a `normalBias` bump. **Recommend:** GROUND's move first — halve the bake's rim strokes (`island.ts:763-774`), which is bake-time, reversible and costs nothing — then re-measure. If Powder still reads flat, drop the sun *with* a key payback number the way Game Day already paid one (`sunI 1.75 → 3.05`), not without.

**D. HERO wants a heavier contact shadow; the toe is currently crushing Game Day's shadows to `rgb(0,0,0)`.** In `pirate_look.png` the hero's missing shadow is genuinely the most visible grounding failure in the pack — every lamppost, barrel and pedestrian lays a hard shadow and the largest object on screen lays nothing. But a heavier disc landing on Game Day and Lantern stacks onto shadows that are already at the floor, and HERO's own skeptic notes the stronger disc has been rejected on sight twice. **Recommend:** toe first, then re-profile the gradient against the recovered ramp, then put an A/B in front of the owner. Do not ship a shadow strength off arithmetic — that is what got rejected twice.

**E. MOTION's `aim` parameter re-rolls the crowd it is aiming.** Overriding `ry` in `makeTownsfolk` is deterministic, but `ry` feeds the hashes at `mainstreet.ts:311-312` that pick hair colour, shoe colour, height jitter and both arm splays. Every re-aimed person changes appearance. **Recommend:** take the fix — two people facing each other is worth it — but derive `aim` as an *additive* rotation applied to the mesh after construction, not as a replacement for the internal `ry`. Same zero cost, and the crowd's existing look is preserved.

**F. UI's opaque HUD plates and CHOREOGRAPHY's panel entrances do not fight, and both should land.** Noting it because it is the one place where two teams' work composes cleanly: opaque `.clay` plates with a baked rim, arriving on a 0.22 s spring, is the Royal Match read in two changes.

---

## THE SINGLE HIGHEST-VALUE VISUAL CHANGE IN THE GAME

**Make the hero's mouth the same mouth in all five worlds — `void3d.ts:1939`, `:1042`, `:1043`, three constants.**

The bar is **Kirby** (HAL Laboratory, thirty years and still shipping), and the mechanic is not subtle: Kirby's entire identity is one expression that never changes shape, only size. His mouth is always wider than tall and always opens toward the width of his own body, in every game, on every background, at every scale — because the inhale *is* the verb and the face *is* the product. hole.io ships at #1 free with a hero that is a black disc with no face at all, and it works precisely because that disc is identical in every level. We are trying to do the harder and better thing — a character with an authored face — and we have built a genuinely excellent one: `powder_look.png` shows brows, blush, a broad grin and a pink tongue, and it is the single best-looking asset in this repo. Then in Maple, Pirate, Game Day and Lantern — 80% of the content, and the world every child plays first — that face is replaced by a portrait-format dark oval that reads as a nostril, for the majority of playtime, because `mp.maw`'s 0.26 sits one hundredth over a `< 0.25` threshold and dense levels never let the mood lapse. The child on the owner's phone is steering a character whose expression is a side effect of how many flower beds the level has. Three constants cost nothing — zero draw calls, zero triangles, zero seeded draws, nothing tuned depends on them — and they hand the game's best asset back to four-fifths of the game. Nothing else on this board, including the toe, changes what a six-year-old is looking at for as many seconds per match for as little risk. The toe is second, and it is second only because its symptom is *quality* while this one's symptom is *identity*, and identity is the question I was asked.

---

## COVERAGE

**Images read (Read tool, full frames):** `qa/out/shippedlook/maple_look.png`, `pirate_look.png`, `gameday_look.png`, `lantern_look.png`, `powder_look.png`, `qa/out/person/maple_front.png` — all six required, all read before any code. Timestamps cross-checked against `git log` to establish which frames pre- and post-date `207e2cb`.

**Files read:** `src/proto3d/void3d.ts` (mouth/maw rig 1000-1056, MOODS 1155-1180, mo/visibility 1925-1945, form-light shader 224-240); `src/prototype3d.ts` (mood resolution 8570-8600, magnet/hungry 8775-8815, `WorldLight` + all five rigs 640-720, `RIG`/exposure 725-760, 816); `src/proto3d/mainstreet.ts` (`makeMapleTree` 1643-1727, leaf palette 168-169, 209); `src/proto3d/island.ts` (`makeTree` 3898-3915, `makePine`, `makeBush` 4335-4357, `makeFlowers` 4437-4470, `makeCoins`, `shade`/`tint`/`part` 3690-3730, `PROP_SMOOTH_MAT` 3455-3480, `ROUND_GEO`/`ROUND_SHARE`, `DCOL` 918-932); `src/proto3d/nightmarket.ts` (`makeStall` 208-222); `src/proto3d/tailgate.ts` (`makeCanopy` 312-322); `src/proto3d/alpine.ts` (`capRoof` 159-186); `src/proto3d/palette.ts` (foliage pool); `qa/shippedlook.mjs` (camera and framing 55-80).

**Not run:** no browser, no build, no Playwright. **No file edited.**

---

## GOVERNOR PLAN

# THE GOVERNOR'S ORDER OF WORK

**Verified before writing.** I read `maple_front.png` (01:09, the only post-fix Maple frame), `powder_look.png`, `gameday_look.png`, `lantern_look.png`, `pirate_look.png`, `maple_side_2.png`, and confirmed 22 code claims against HEAD `1c31c6c`. Three board findings died on contact with the repo; two more were already fixed. What follows is what survived my own eyes.

**One timing fact the board must absorb:** `207e2cb` landed 00:47. `maple_look.png` and `maple_trees.png` are 23:08–23:21 — **stale**. `maple_front.png` (01:09) is the only current Maple frame. `island.ts:4459` is now `SphereGeometry(R, 9, 6)` with stems and seated blossoms — I read it. **TEAM STATIC's first blocker is already shipped fixed.** Art direction's timing note was right and the rest of the board was citing a dead frame.

---

## WHAT BLOCKS

Eight. Each verified by me, in the pixels or in the file, at HEAD.

**B1 — The hero has no mouth in four of five worlds.** *(HERO + ART DIRECTION)*
I opened all five frames. `powder_look.png`: a wide landscape grin with a pink tongue, brows, blush — the best asset in this repo. `maple_front.png`, `pirate_look.png`, `gameday_look.png`, `lantern_look.png`: a small **portrait-format black oval with a pink dash**, sitting below the eyes. It reads as a nostril. At spawn radius in `maple_front.png` he has no mouth at all — a ~9px speck. `void3d.ts:1939` is `mouth.visible = mo < 0.25`; `void3d.ts:1166` floors `hungry` at `maw: 0.26`. One hundredth over. Powder is edible-starved so it falls to `cruise` and the grin shows. **The hero's expression is a readout of level prop density.**

**B2 — The grade zeroes colour channels.** *(LIGHT, upheld by its skeptic)*
`prototype3d.ts:270` verbatim: `color = max( vec3( 0.0 ), ( color - 0.014 ) / ( 1.0 - 0.014 ) );`. Per-channel hard clamp at sRGB 31. In `gameday_look.png` I can see the consequence: the fire truck's shadow and the person's shadow are **solid black silhouettes pasted on brown tarmac** — 3.26% of the frame is exactly `rgb(0,0,0)` — and the truck's top face and side face are the same flat red. In `lantern_look.png` the bottom third carries no material information at all. This is what makes three worlds look like a different renderer.

**B3 — The score floater is invisible on the default world.** *(UI, measured worse by its skeptic)*
`bubbles.ts:145` is `-webkit-text-stroke: 1px rgba(70,20,50,0.35)` with no `paint-order`. `#ff7da8` against Maple grass measures **1.00:1** — the same luminance. It fires on every single eat.

**B4 — ~100 people in the opening frame cannot move a joint.** *(MOTION)*
`makeTownsfolk` returns a `THREE.Mesh` through `mergedProp`; `place()` registers it as decor, never a mover. In `maple_front.png` I count seven townsfolk in a row, every leg dead vertical, not one weight shift, beside an empty bench.

**B5 — Two tree languages in one frame.** *(ART DIRECTION — supersedes STATIC's stale version)*
`mainstreet.ts:1716` is `i % 2 ? dark : heroDark` — two hues alternating around the lobe ring. `island.ts:3900` uses one `base` hue in three values. In the **post-fix** `maple_front.png`: the green trees are soft unresolvable masses; the autumn cluster bottom-right is a bag of individually legible tan/orange/brown/red marbles. The structural fix landed. The colour rule did not.

**B6 — The audio the game ships is below hole.io.** *(AUDIO, 10/10 survived)*
`startTown`/`startTropical`/`startGameday`/`startLantern` are reachable only through `synthCover`, which runs only when every MP3 404s. All six MP3s are present. Every world's ambience, every district layer and every escalation stage is dead. `powderEvolve` (`:3640`) calls `startPowderScore()` on the first evolve — Powder plays two scores at once for ~170s. `eaten_deep.wav` **exists** (79,424 B, tracked) under a comment that says it is absent, and it is 88% sub-120 Hz: the owner's "8-bit thud", never fixed.

**B7 — `biomeColor` is dead code for four of five worlds.** *(GROUND's skeptic)*
Consumed at exactly one site, `island.ts:1739`, guarded `if (WORLD_ID === 'maple')`. Game Day's documented albedo lift and Pirate's documented 1.35:1 sand re-spacing were committed into unreachable code.

**B8 — The reward beat plays backwards.** *(CHOREOGRAPHY's skeptic elevated this above the team's own blockers)*
`void3d.ts:1802`. `evolveT` counts **down**, so the sine runs 2π→0: **−12% shrink first**, +4% pop after. `prototype3d.ts:9022` pulls the camera back 7% on the same frame. At the moment the HUD prints EVOLVED, the void gets smaller from two directions.

---

## THE ORDER OF WORK

**Standing constraint on every job below.** Art direction's conflict A is real and I am enforcing it: six teams proposed "free" triangles totalling ~160k ≈ **18 MB of CPU-side vertex data** against Game Day's ~4 MB of headroom. Triangles are not free here even when draw calls are. **No geometry addition lands on Game Day until it has been measured there.** Jobs 1–8 add zero triangles by design.

---

### JOB 0 — Clean the camera *(instrument; blocks every visual judgement below)*
**Files:** `qa/shippedlook.mjs`, `qa/heroface.mjs`, `qa/personsheet.mjs`

Four defects in our own eyes, three of which I verified myself:

1. **Every hero frame in the pack carries false orbit rings.** I can see violet and amber ribbons arcing across the hero and out to frame edge in all five `*_look.png`. `__setVoidR` sets `ringBurst = 1`; it decays on **sim** time while the probe waits on **wall** time at ~1 fps. The fix needs no source change: `void3d.ts:1323` is `rings.name = 'rings'` with a comment saying it was named so outside code could switch it off. `scene.getObjectByName('rings').visible = false` before the shot.
2. **`qa/heroface/` has never photographed a size the player sees.** `camDist` eases on the same clamped `dt`. Drive the clock — `for (let i=0;i<80;i++) window.__step(0.05)` — instead of waiting.
3. **`qa/out/person/maple_side_2.png` is a solid purple field.** I opened it: 570×630 of the void's body, no person, and the probe printed "6 crops". Assert per-crop channel variance above a floor. And pick 3 with `userData.mover` + 3 without — the sheet has only ever photographed statics, which is how MOTION came to argue "two species side by side" from six protesters.
4. **There is no current HUD render in this repo.** `qa/out/store/*_hud.png` is 08-17 and shows retired form names. Nine of UI's findings are source-only for that reason. Shoot one HUD-up in-match frame per world at the final ten.

**Cost:** test code only. **Gate:** each probe asserts on itself — zero visible ring pixels, settled `camDist` within 2%, non-uniform crops, mover/static split non-zero per angle.

---

### JOB 1 — Give him his mouth back  ▲ THE ONE THING
**Files:** `src/proto3d/void3d.ts:1042`, `:1043`, `:1939`

Three constants:
- `mawDark.scale.set(1, 1.15, 1)` → `set(1.34, 0.92, 1)` — the gape grows out of the grin's own footprint instead of replacing it with a portrait oval. 1.34 is the x-stretch the lip already carries.
- `tongue.scale.set(1.15, 0.7, 1)` → `set(1.50, 0.70, 1)`.
- `mouth.visible = mo < 0.25` → `mo < 0.55`. At `hungry`'s 0.26 that draws a small dark parting **inside a visible grin** — the hungry, slightly-open smile the mood table plainly asks for.

`void3d.ts:1044` already states "the gape and the closed mouth overlap for one mood step and the gape has to win it" — this widens a handled state, it does not create one. Nothing tuned depends on these; `rivals.ts` has no `maw`, so it does not multiply by six.

**Cost:** 0 draw calls, 0 triangles, 0 seeded draws.
**Gate:** `qa/faceparity.mjs` (Job 0's sibling — see instruments). Fails today: four worlds return width < height at ~a fifth of Powder's mouth width. Passes after.

---

### JOB 2 — One renderer, five worlds
**Files:** `src/prototype3d.ts:270`, `:640`, `:755`

**(a) Replace the toe with a luminance-space soft knee.** `l` is already computed on the line above for the split tone, so this is a drop-in:
```glsl
const float TOE = 0.014;
float lo = max( 1e-4, l );
float lg = lo * lo * ( 1.0 + TOE ) / ( lo + TOE );
color *= lg / lo;
```
Asymptotic to zero, so no in-gamut input can zero a channel. Verified by two independent re-implementations to agree with the shipped curve within 0.002 for l ≥ 0.1 — **nothing anyone tuned above midtone moves by more than 2/255.**

**(b) Delete `exposure` from `WorldLight`**, move the literal `1.0` into `RIG` with an on-purpose comment beside `hemiI`'s, and put a **retraction line on the ledger entry** that credits `exposure 1.34→1.42` with an improvement it never produced. I confirmed: five authors filled that field in and nothing reads it. Do **not** wire it — that is a re-grade plus a re-shoot of every approved screenshot, with no Mac.

**Cost:** 0 draw calls, 0 triangles, 4 ALU, 0 seeded draws.
**Gate:** `qa/colorpipe.mjs` gains a channel-floor sweep — no input with all three channels > 0 may yield an output channel == 0. Plus a per-world frame assertion: share of pixels with any channel ≤ 2 under 8%, **and the spread across the five worlds under 10 points** (today 6%→30%), plus pure-`rgb(0,0,0)` share under 0.5% (Game Day is 3.26%).

---

### JOB 3 — The first bite has to read
**Files:** `src/proto3d/bubbles.ts:142–148`, `:110`, `:137`; `index.html:392`

One stylesheet, four edits:
- `.vf` — `-webkit-text-stroke: 3px rgba(12,6,26,0.92); paint-order: stroke fill;` (`.vf.big` at 4px). Takes pink from 1.00:1 to ~9.8:1 and mint to ~13.9:1 **on any ground**. Neither property affects the box, so `slot.w/h` and the de-collision maths at `:269` are untouched.
- `#count span` — `-webkit-text-stroke: 8px rgba(12,6,26,0.92); paint-order: stroke fill;` and drop the `0 0 38px` glow that is currently softening the edge. Gold 13.8:1, hot 7.1:1.
- Dead font weights: `800`/`900` → `700` (Fredoka ships 300–700; `font-synthesis: none` at `index.html:71` means those three declarations are lying), and `.vbN` 10px → 12px — that is the rival's *name*, below the probe's own 11px floor.

**Cost:** 0 draw calls, 0 triangles, 0 seeded draws.
**Gate:** add `'count'` and a `.vf` case to `qa/contrast2.mjs:33`, add a fifth `['match', …]` screen to `qa/uisystem.mjs:33`, **and add `contrast2` to the `push` profile in `qa/gate.mjs`** — I checked; it is in no profile at all. Both instruments were built after a failure and scoped to the failure instead of to the surface.

---

### JOB 4 — The town stops being furniture
**Files:** `src/proto3d/mainstreet.ts` (`personParts`, `makeTownsfolk`), `src/proto3d/island.ts` (twelve townsfolk sites, six bench sites)

Three changes, all zero-triangle:
- **Breathe.** Register the one-person meshes in a per-frame list. Take the skeptic's version over the team's: `mergedProp` merges in place with no recentring, so the origin is the feet — `m.scale.set(1+b*0.5, 1-b, 1+b*0.5)` with `b = sin(t*1.1+phase)*0.012` keeps the feet planted and never lifts the contact shadow. Yaw alone is a statue slowly rotating.
- **Sit.** `makeTownsfolk(hat, seated)` — decided at construction, not by moving a mesh afterward. Rotate the two leg cylinders 90°, drop the stack by `0.55T`. Re-target existing scattered bodies onto bench positions; add no bodies, so the score economy and the seeded stream are untouched. **State the `claimSpot` bookkeeping in the commit** or the next reviewer files it as a collision bug.
- **Aim.** Take art direction's correction, not MOTION's fix: apply `aim` as an **additive rotation on the mesh after construction**. Overriding the internal `ry` feeds `mainstreet.ts:311–312` and would re-roll hair colour, shoe colour, height jitter and both arm splays on every re-aimed person. Additive is the same zero cost and preserves the crowd.

**Cost:** 0 draw calls, 0 triangles, 0 seeded draws. ~120 transform writes/frame against a mover system already updating 200–966 records.
**Gate:** `qa/stillness.mjs` — fraction of person-sized edibles whose world matrix is bit-identical at t and t+1.2s; bar < 15% (today ~100%). Plus `qa/seats.mjs`: ≥25% of benches occupied (today 0).

---

### JOB 5 — One tree language
**Files:** `src/proto3d/mainstreet.ts:1707`, `:1716`

`i % 2 ? dark : heroDark` → `dark`, and `heroDark = shade(leaf, 0.70)` so the ring is **one hue in two values**, exactly as `makeTree` is. Keep `LEAF_HERO` for the crown only, where a single lighter cap reads as sky-catch rather than a second species.

**Cost:** 0 draw calls, 0 triangles. The `mpick` and four `mr()` per lobe are untouched — **Maple's placement stream is byte-identical.**
**Gate:** `qa/canopyhue.mjs` — build one `makeTree` and one `makeMapleTree` offscreen, read merged vertex colours, report hue standard deviation across each canopy's lobes; assert within 1.5× of each other. Static, no browser, milliseconds.

---

### JOB 6 — Reconnect the audio *(the largest job here; budget half a day)*
**Files:** `src/proto3d/audio3d.ts`

Three fixes, in cost order:
- **`:4059`** — invert `bigEat()` so the synth whoosh is the shipping voice and `eaten_deep.wav` is opt-in, or delete the file. One line. This closes a complaint the owner has raised three times and that the ledger records as fixed. Do the same at `:1687` and `:4127` (Maple alone gets a generic riser; Pirate alone gets a bespoke win).
- **`:3640`** — extract node construction into `ensurePwBus(c)`. `powderEvolve` needs the bus, not the scheduler. One line.
- **`:750` — split ambience from score.** `start<World>Amb()` (ambience gain + zone layers + an ambience-only interval) called unconditionally from `startMusic()`; `start<World>Band()` called from `synthCover('score')`. Feed the recording's stage to the ambience gain so escalation survives. **Note the skeptic's scoping: Powder has no ambience layer** — four worlds have district beds, the fifth has a bare score. Do not go looking for `pwAmbience`.

While in the file: `startSynth()` at `:775` has **zero callers** — I verified. It ramps the whole synth layer's master gain. Same rot, twenty lines from the same finding.

**Do not take AUDIO's limiter fix as written** — it routes one-shots around `master`, which carries `MASTER_VOL` and is the only node `setMuted()` touches; mute would silence the music and leave the chomps at 1.6×. The skeptic's topology is the correct one: `sfxBus → lim → master → destination`, `musicBus → master → destination`.

**Cost:** 0 draw calls, 0 triangles, 0 seeded draws. ~15–25 concurrent voices/world at levels already authored and already run on the 404 path.
**Gate:** `qa/ambience.mjs` — with the real MP3 playing, ≥4 voices/s and two districts moving a zone gain above 0.001. And **stop using `synthOn` as the doubling test** — it is false on both broken paths and has now missed this twice. `musicState()` must report all five bed gains.

---

### JOB 7 — Ground the hero
**Files:** `src/proto3d/void3d.ts:615–626`, `:658`; `qa/grounding.mjs`

`pirate_look.png` is the argument and it takes one glance: the ice-cream truck, the lamppost (a full spoke-wheel shadow), both barrels, four pedestrians and the vending kiosk each lay a hard dark shadow on pale sand — and **the void, by far the largest object in frame, lays nothing.**

But: **HERO's specific gradient profile is not sound** — its hidden-zone model is 2.4× off, and `void3d.ts:600–614` records this disc being rejected on sight twice. And `qa/grounding.mjs` already exists, already does ablation differencing, and by the skeptic's numbers **probably passes today**. So the job is, in order: (1) Job 2's toe, so Game Day's ramp stops being clipped to black; (2) re-run `qa/grounding.mjs` and retune its threshold against what the recovered ramp shows; (3) re-profile the gradient; (4) **put an A/B in front of the owner.** Do not ship a shadow strength off arithmetic — that is precisely what got rejected twice.

**Cost:** 0 draw calls, 0 triangles, 0 new textures.

---

### JOB 8 — Cheap time and cheap transitions *(one afternoon, all zero-cost)*
**Files:** `src/proto3d/void3d.ts:1802`; `src/prototype3d.ts:2317`, `:9040`, `:4882`, `:8840`; `index.html:1286`, `:681`

- **The evolve pop (B8).** Replace `:1802` with an explicit two-phase envelope — small squash first, then a decaying overshoot peaking near +14%. The correct pattern is eight lines above it at `:1798` (−24% inhale, +18% burst), sitting on a switched-off power.
- **The two set-piece moments have no time channel.** `hitStop` has one call site; `fx.shake`/`fx.kick`/`camPunch` are no-ops by the owner's order and nothing replaced them. Add `hitStop(0.10)` after `animGulp()` at `:2317` and `hitStop(0.13)` at `:9040`. `animGulp` already opens the maw on that frame, so these need no delay.
- **The gold flash never paints.** `fx.flash` writes one shared div twice synchronously at `:2322`; amber is overwritten by violet before any paint. Stagger or delete the dead call.
- **The freeze holds the mood floor.** Delay `hitStop` by ~0.105 s so it lands on the pose. Guard against `outroT`/`ended`. Fix `:8840–8841` `dt` → `dtw` (particles are the only thing moving during a freeze) and correct the two comments at `:8024` and `:8388` that say the opposite.
- **CSS:** add `#pause.show .setCard` to the `modalIn` list at `:1286` — I checked, it is the only sheet in the product that hard-cuts. Add `#end.show { animation: modalIn … }`. `index.html:2039` already contains `<div id="endHd">TIME!</div>` as **dead placeholder markup** — `endHd.textContent` is unconditionally overwritten at `:4583`/`:4665`. The word is authored and can never reach a child.

**Do not take UI's render-skip fix.** I verified `prototype3d.ts:1793`: the entire `ovl` machinery is inside `if (import.meta.env.DEV || …has('stamp'))`. `body.ovl` does not exist on the shipped build. Gate the render on `#book`/`.metaScr` `.show` read directly; throttle rather than skip under the translucent `#end`/`#pause`.

---

### JOB 9 — The roof rule *(cut line: below here only if 1–8 land)*
**Files:** `nightmarket.ts:214`, `tailgate.ts:318`, `island.ts` (`makeBarrel`), `mainstreet.ts:735`

State it as a language rule, because that is what it is: **no prop may present more than 85% of its up-facing area in a single colour.** `alpine.ts:159 capRoof()` is the only version in the repo that obeys it, and Powder is the only world whose buildings read as architecture. Stall: two boxes pitched ±0.22 rad plus a ridge roll (+44 tris). Game Day canopy: four hip battens (+48 tris). Barrel: one `LatheGeometry` — matches `ROUND_GEO`, so the classifier stays honest with no call-site change (+120 tris). News box: `...signLines(0, 1.72, 0.42, 0.40, 0.44, 0x3a3440, 3, (c >> 12) & 7)` — I verified `signLines` draws **no** random numbers, so hashing off the already-drawn `mpick` costs no seeded draw (+36 tris). Four blank white cards are visible in `maple_front.png` beside lawn signs that carry legible bars.

**Also here, zero pixels:** delete the non-Maple half of `biomeColor` (B7) so it cannot lie again. Re-authoring Game Day's lot albedo waits until after Job 2 is measured — art direction's conflict B is right that two levers moving the same world in opposite directions leaves nobody knowing which did what.

**Gate:** `qa/roofs.mjs` at **2 sq units**, not 4 — 4 was TEAM STATIC's number and their own skeptic showed it misses the 2.54 sq unit barrel lid they cite. Exempt props whose entire geometry is one colour.

---

## WHAT I AM NOT DOING, AND WHY

Said out loud so it does not rot as a silent backlog.

**Already fixed at HEAD — discard, do not re-open.** The flower-bed d20 (`island.ts:4459` is a sphere with stems; I read it). The hair-cap flange (`mainstreet.ts:394` is `sph(0.355*T, 16, 9)` at `2.40*T` — the reviewer's proposed fix, character for character). The personsheet HUD selectors. The maple canopy's *structural* inversion. Four teams cited stale frames for these.

**Killed by the skeptics; not smuggled back.**
- *The party floor / hero-dissolves finding.* I looked at `pirate_look.png` myself: the void is a clearly bounded purple mass over a much lighter magenta band. Pirate has the **strongest** hero-to-ground separation of the five. The proposed `qa/heroground.mjs` at a 1.30 floor would fail all five worlds — a gate that fails on a build nobody disputes.
- *Per-world `coreBias` on the hero.* `void3d.ts:232` says the view-space key is deliberate illustration lighting. It also desynchronises the mouth colour derivation at `:521` and all thirteen shop skins. The only per-world lever LIGHT owns for hero separation is ground albedo.
- *Trimming `gameday.fillI` and `powder.fillI` for shadow contrast.* Inverted — it compares a WCAG ratio against a linear-energy target. It would darken the one world whose shadows are already `rgb(0,0,0)` and the one world already inside its authored window. **This one would have shipped damage.**
- *"Seven forms are five pictures."* Deliberate, with the rationale three lines above the cited line, and argued from no render at all. This is an owner question — build the contact sheet on `qa/voidsheet.mjs` + `qa/titan.mjs` and ask him — not a defect.
- *Hard-zeroing the intro velocity.* Would deliberately re-create the failure `prototype3d.ts:5265` records fixing: "a six-year-old obeys the first thing they are told, drags, and learns that the screen does not respond." Only the misleading comment survives.
- *The joystick nub as a major.* `qa/heroface.mjs:85` hides `#joy`; the ring in that frame is pre-fix pixels; the hero is 55.6 CSS px at r=12, not 157. Take the free `background: transparent; border: 3px solid` change as polish, carry no SAW.
- *`qa/normals.mjs` as TEAM STATIC specified it.* It was built, run, and **retracted** — its own header records failing eighteen forms because a prop earns the smooth material at half its parts being round. Do not re-propose a runtime flat-share bar.
- *A new `qa/grounded.mjs`.* `qa/grounding.mjs` already does it better, by ablation.

**Real, but not worth two days.** Ground octave structure (the 0.3–3 unit band is 1% deep in every world, and GROUND's own skeptic showed the diagnosis is contrast, not resolution — raise the speckle tile's σ, which is grey-symmetric and exposure-neutral, before touching any world's weights). Powder's sun angle (needs a key-payback number or it is a darkening, not a raking). Normal variation on the ground plane. VSM shadows. Positional audio. Water for Maple's pond. Animal eyes. The mushroom/luggage merge (2 builders, not the 4 claimed). `#soloTog`'s safe-area inset. The four SF Pro glyphs. `.clay` on zero elements plus twenty literal border-radius values. The 140 MB of resident PCM.

**Not a code change:** the 30 SFX files with no rights record. `public/assets/audio/CREDITS.txt`, one line per file, anything unsourceable deleted. Cheap, and the archaeology in AUDIO's finding is wrong — `589e31e` is this repo's root commit. Argue it from the current directory state.

---

## NEW INSTRUMENTS NEEDED

Each is a deliverable **before** the work it gates.

1. **Clean frames (Job 0).** Ring-suppressed, clock-settled, mover-inclusive, blank-crop-asserting, plus a HUD-up in-match shot per world. **Nothing on this board can be judged until this lands** — every hero frame in the pack carries false ribbons, and `qa/out/store/` is 08-17 stale, so the eight App Store screenshots are also blocked on it.
2. **`qa/faceparity.mjs`** — gates Job 1. The studio has per-world probes and no **cross-world parity** probe. Mask the face disc at `__setVoidR(4)` in all five worlds; assert width ≥ height everywhere and mouth-width spread under 25%. This is the shape of instrument that would have caught B1 the day it appeared.
3. **`qa/canopyhue.mjs`** — gates Job 5. Static, no browser.
4. **`qa/ambience.mjs`** + `musicState()` reporting all five bed gains — gates Job 6. Every audio conclusion in the last two ledger entries was drawn from `synthOn`, which is false on both broken paths.
5. **`qa/stillness.mjs`** — gates Job 4.

**Three existing instruments are lying and must be repaired in place:**
- **`qa/juice.mjs` is at 3/4 with zero headroom.** I grepped it: `fovKick` is declared, decayed and exported, and **never assigned** — it was written by `camPunch`, which is now a no-op. One of its four channels is permanently unreachable. The next channel to regress flips it to FAIL and the obvious "fix" is lowering the threshold.
- **`qa/contrast2.mjs` is in no gate profile** and watches five elements. Its header essay on why a box-mean cannot see an outline is the best measurement thinking in the kit, and it does not run.
- **`qa/ground.mjs` measures at radii 1/3/8 device px** — 0.04 to 0.31 world units. Every ground feature anyone has authored lives between 0.5 and 18 units. The measurement kit for that surface cannot see the surface, which is why both `gCoarse = 0` and the daylight mixes look "measured".

---

## THE ONE THING

**Job 1. Three constants in `void3d.ts`.**

I opened all five world frames before I opened a line of code. In `powder_look.png` the void has a broad grin, a pink tongue, raised brows and blush — it is the best-looking asset in this repository and it is what this game is sold on. In `maple_front.png`, `pirate_look.png`, `gameday_look.png` and `lantern_look.png` — 80% of the content, including the world every child plays first and the frame the match opens on — that mouth is a small portrait-format black oval with a pink dash. It is not a bad mouth. It reads as a **nostril**. And at spawn radius, where the owner's daughter meets him in the first second of every match, it is a nine-pixel speck and he has no mouth at all.

The cause is `mp.maw = 0.26` against `mouth.visible = mo < 0.25` — one hundredth — and a `hungry` mood that dense levels never let lapse. So which face the hero wears is decided by how many props the level designer scattered. Powder is edible-starved, which is the only reason one world out of five gets the real character.

The bar is Kirby: one expression that never changes shape, only size, always wider than tall, in every game on every background — because the inhale *is* the verb and the face *is* the product. hole.io ships at #1 free with a hero that is a black disc with no face at all, and it works because that disc is identical in every level. We are attempting the harder and better thing and we have already built it. We are just not showing it.

Zero draw calls, zero triangles, zero seeded draws, nothing tuned depends on it, and the file's own comment says the overlap state it widens is already handled. Nothing else on this board changes what a six-year-old is looking at for as many seconds per match, for as little risk. The toe is second, and only because its symptom is *quality* while this one's symptom is *identity*.