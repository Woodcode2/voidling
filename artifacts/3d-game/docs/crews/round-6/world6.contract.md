# THE WORLD 6 CONTRACT

> Produced 2026-09-04 by the `world6-contract` workflow (run wf_5627a9db-a52): ten
> parallel readers over land / prop kit / island.ts / prototype3d.ts / life.ts /
> the newsroom / audio / everything-else / the past-mistakes ledger / the probes,
> then one synthesis, then three adversarial completeness critics (one re-reading
> the source for what it missed, one asking which recorded failure it would still
> allow, one asking what breaks at runtime if you follow it exactly), then a
> revise. 15 agents, 0 errors, 2.4M tokens, 105 minutes. 187 raw obligations in,
> 33 candidate misses found by the critics.
>
> The owner opened world 6 with: "I want this one to be exceptional. Every detail,
> item placement every needs to be dialed in. Learn from past mistakes." This
> document is the second half of that sentence.

# THE WORLD 6 CONTRACT — FINAL

*Merged from ten subsystem readings plus three adversarial critiques, all critique anchors re-verified against source 2026-09-04. Build top to bottom.*

**Read this first.** Of ~140 obligations, **twelve fail at compile time**. Everything else fails by falling through to Maple Falls, or by a probe reporting clean on a world it has no branch for. A world 6 that fills the twelve Records and nothing else compiles, boots, and renders **Maple's island shape, Maple's ground, Maple's 5,782 props, Maple's crowd, Maple's paper, Maple's music, under world 6's sky** — plus, now verified: **no cars, no train, no ducks** (life.ts:2579, :4474, :4405 are `worldId() === 'maple' ? n : 0`), **a new surface that plays exactly like grass** (prototype3d.ts:8943), and **44 Lantern Night moon lanterns** if it declares a season (prototype3d.ts:1636).

**Anchors drift.** Re-resolve every line number by symbol before editing. `docs/AAA-BRIEF.md:739`'s 27-row table has drifted further (it cites island.ts:56 for WorldId, now :59; prototype3d.ts:305 for WORLDS, now :352; :501 for WORLD_PAR, now :548; :636 for WORLD_LIGHT, now :734).

**On copying Powder.** Best template for the **land module** and the **prop kit**. Worst available template for **OUTFIT, flee-line dispatch B, matchBeat stings, sticker art, sticker CREDITS rows, react pools, the smoke regex, and the staged-vignette pass** — eight places it shipped unfilled (§11).

---

# §0 — THE SILENT OBLIGATIONS (the whole list, up front)

Nothing here throws, types, or reds. Every one ships green. Grouped by why it is silent.

## A. Falls through to Maple Falls (dispatch chains)
| # | Site | Anchor | Silent result |
|---|---|---|---|
| A1 | `silPoly()` | island.ts:339 | Maple's coastline is your ground slab, cliff, bake clip, halo and every containment test |
| A2 | `insideIslandWorld()` | island.ts:354, branch :359 | collidable coast ≠ visible coast; props admitted over open space |
| A3 | `spawn3()` | island.ts:230, powder :232, tail :235 | void starts at Maple's `[6469,5240]`, likely in space; also mis-seeds SPAWN_KEEP_OUT (:239) and `nearSpawn()` (:242) |
| A4 | `inWater3` / `inDeepWater3` | island.ts:394-420, :436-441 | two invisible bodies of water on painted ground (Game Day's 39×39 in THE QUAD, 87×66 at Maple's lagoon) |
| A5 | `biomeAt()` | island.ts:3592, powder :3610 | every point reports a Maple biome → Maple crowd, prop sets, captions; and `addWanderer` line 1 is `if (!biomeAt(hx,hz) \|\| wet(...)) return;` (life.ts:2598) → **zero crowd, zero errors** |
| A6 | Foliage pool | island.ts:4372 (trees), :4830 (bushes) | Maple's high-summer green |
| A7 | Ground bake block | island.ts sited among :1077 / :1250 / :1520 / :1855 | featureless flat green slab in Maple's outline |
| A8 | Populate block | before island.ts:6569 | **total**: Maple's nine districts, 5,782 props, coast fringe, food ring, balloon |
| A9 | `W6_BEATS` ternary tail | prototype3d.ts:3759-3762 (`: MAPLE_BEATS`) | Maple's bake sale, dog parade and county fair, under world 6's brand |
| A10 | Ten audio dispatch points | audio3d.ts §9 table | Maple's banjo; **matchBeat is a live Powder defect today** |
| A11 | Season prop | prototype3d.ts:1613/:1620/:1629/**:1636 else** | **LIVE BUG**: `snowday` matches no branch, so Powder's SNOW DAY scatters 44 **moon lanterns** for a fortnight each December (scatterSeasonProps :1646-1663 places 44). World 6 inherits it the day it declares a season |
| A12 | `placeStickers`' own `distOf()` | **prototype3d.ts:1550-1552** | third district-translation site. `MAPLE_DIST` / `GAMEDAY_DIST`, tail `return b;`. A world 6 on the **Record** district pattern (§14.6 calls that an open choice) has all twelve stickers fail the 4000-sample match and get dropped by `if (!put) continue` (:1578) |
| A13 | Crowd `wet()` guard | life.ts:2596 | only if interior water; Maple's symptom was 62 people standing in the river |

## B. Silent because the table is `Record<string, …>` (a miss compiles clean)
| # | Table | Anchor | Silent result |
|---|---|---|---|
| B1 | `WORLD_NAMES` | prototype3d.ts:347 | tab reads `WORLD ENDER · undefined`; **title card prints the literal word `undefined` over the establishing shot** (:1472, :1474); season ribbon :6030 |
| B2 | `WORLD_PAR` | prototype3d.ts:548 | rivals fall to the legacy scale-invariant ladder (rivals.ts:736-775) — field frozen at 76,000 against a 300,000 player run, three minutes of a leaderboard that never says anything true |
| B3 | `MED_BY_WORLD` / `HARD_BY_WORLD` | prototype3d.ts:3510, :3517, fallbacks :3524-3525 | dead quest chips; recorded three times (:3479-3496) |
| B4 | `MID_REACT` | newsroom_react.ts:377 | wrong beat's reaction prints (`reactLine` :456 falls back to `w.beat[inp.beat]`) |
| B5 | `CARD_ART` / `CARD_FALLBACK` | prototype3d.ts:5878, :5922 | empty rectangle with a title under it (:5924-5928) |

## C. Silent because the probe has no branch, no world in its list, or is in no gate
| # | Instrument | Anchor | Silent result |
|---|---|---|---|
| C1 | `qa/placement.mjs` `worldData()` | :125-160, five `if`s, **no default, no throw** | prints `road 0 ok / roadend 0 ok` and **PASSES**; a tree in world 6's main street is invisible |
| C2 | `qa/placement.mjs` in the gate | **verified `grep -c placement qa/gate.mjs` → 0** | the instrument built for the owner's sharpest complaint runs only when someone remembers |
| C3 | **Fifteen probes are in NO gate profile and in NO package.json script** — verified: `formsep, groundgrain, glossgap, glosscov, variety, snowyaw, music, pockets, lookpair, placement, rigexposure, lookbook, crowdface, moverbands, blackprops` (all `grep -c` = 0 in both files) | qa/gate.mjs:60-299 | §12 presents each bar "with its probe"; **bars G, H, V and the whole gloss argument run only by hand.** GOVERNOR.md:725-728: *"A probe that has not run in this environment has not run."* |
| C4 | **There are FOUR profiles, not two** — `PROFILE` defaults to `live` (gate.mjs:43); `gamutzero` (:190) and `packfresh` (:194) are `profiles:['art']`; `edgespeed` (:165), `ringmeaning` (:184), `rivalnotice` (:186) are `['quality']` | gate.mjs:43 | **bar J (gamut) blocks no push.** The draft filed gamutzero/packfresh under "push profile" — corrected here |
| C5 | Hardcoded five-world default lists | `lookbook.mjs:22`, `rigexposure.mjs:22`, `variety.mjs:41`, `skypop.mjs:47`, `spaceshot.mjs:19`, `faceparity.mjs:58`, `pickerfit.mjs:79` **and :80**, plus **four-world** lists (Powder already invisible): `glosscov.mjs:24`, `bookshot.mjs:53`, `heap.mjs:23`, `shading.mjs:20`, `artaudit.mjs:16` | each prints a clean verdict with world 6 unexamined |
| C6 | `qa/moverbands.mjs:22` — world list is a literal **inside the for-loop, no argv override** | :22 | the census written for the owner's "item lag" complaint cannot be pointed at world 6 at all |
| C7 | `qa/groundgrain.mjs:126` (`argv[3] \|\| 'powder'`) and `qa/grounding.mjs:135` (same) | | run with just a port and they **print a clean verdict about Powder Pass** while world 6 goes unmeasured |
| C8 | `qa/crowdface.mjs:16` (`argv[3] \|\| 'maple'`) | | world 6's crowd is never photographed |
| C9 | `qa/lookbook.mjs` pins two of its shots | :57 (`personsheet … 'maple'`), :63 (`_dumpbake 'maple'`) | **world 6's 3072px ground bake — all of Phase 5.1 and bar G — is structurally absent from the pack the eight studio teams review.** STUDIO.md rule 1 forbids reviewing a surface not seen rendered |
| C10 | Gate steps pinned to a literal that no `WORLDS` entry widens | `evolveonce` `qa/evolveonce.mjs PORT 'maple'` (gate.mjs:123); fast `faceparity` pinned `pirate, powder` (:99) | §9.8 calls evolve *"the single most important moment in the match loop"* and **the gate verifies it on world 6 with nothing** |
| C11 | `qa/lookpair.mjs` `SPOTS` (:150) needs a hand-surveyed world-6 row | refuses at :243-245 | fails loudly, but blocks every paired look measurement — authoring the row is a survey job, before the first pair |
| C12 | The other push-profile hand edits | §10.2 table below | newsstyle prints `clean` and meters nothing; firstframe **hangs forever**; vary reds for the wrong reason |
| C13 | `qa/pockets.mjs:16` default is `gameday,maple,pirate,lantern` | | Powder is absent and so is world 6; nothing else enforces the null-off-land contract |

## D. Silent because a data shape is unchecked
| # | Obligation | Anchor | Silent result |
|---|---|---|---|
| D1 | **`MID_POOL` must be exactly four** | prototype3d.ts:3779, `dealMids` :3821-3825, `PAIRS` matchdeck.ts:48 | key is compile-enforced, **length is not**: `{...undefined}` spreads nothing → blank banner and a **NaN score multiplier, on match 2 only** |
| D2 | `MatchBeat.news` × 6 | :3672, never read (:8624 does not pass it) | six strings that will never air |
| D3 | Sticker `biome` strings | stickers.ts:241, :342; `if (!put) continue` :1578 | a sticker whose biome does not match is dropped without a word |
| D4 | `qk` tags | island.ts:5344-5353 | quest counters, `{M}`, FIRST CAR / FIRST BUILDING and SHOWOFF's "that one is big" all silently dead (Game Day carried none) |
| D5 | `userData.authored` | prototype3d.ts:6379-6382 | Pirate lost **7 of 13** r≥7 props at match start — hotel, fort, lighthouse — and five audits measured what remained |
| D6 | `HOURS[0]` must be a no-op | prototype3d.ts:907, promise :895-897 | match 1 is not lit as tuned |
| D7 | `leg` / `paceMul` | life.ts:2620, :348-350 | `leg: 0` by omission roots nobody; `paceMul ≥ 2.4` re-opens the standing-ring bug (45s of a 180s match, score frozen) |
| D8 | `if (!r) continue` in the cast loop | life.ts:4021-4027 | *"a quarter of the map, zero spirits, no error"* |
| D9 | **`WORLD_LIGHT.hemiI` is INERT** | iface prototype3d.ts:718; rows :735-824; **`RIG.hemiI: 0.22` flat at :864**, read at :934 and :951 | only `hemiSky`/`hemiGround` reach the light. Its own comment: *"flat across worlds on purpose — the per-world hemiI in the table was never once applied at construction, and every world was tuned without it."* **A crew tuning a dark or pale world reaches for hemiI first and attributes a frame change to a number the renderer never reads.** GOVERNOR.md's rule: *"a value nobody reads is not a setting, it is a comment."* (`exposure` was inert too and was unlocked 2026-08-26, :864-870 — it reaches the renderer now.) |

## E. Silent because the asset is simply absent
| # | Asset | Anchor | Silent result |
|---|---|---|---|
| E1 | `public/assets/music/<w6>.mp3` | audio3d.ts:3721-3726 | synth bed forever; **and `qa/smoke.mjs:38`'s MUSIC_SLOT regex omits powder today — a synth-only world 6 fails twice on a build working as designed** |
| E2 | Twelve `public/assets/stickers/*.webp` | stickerFace prototype3d.ts:6194 | `onerror` swaps in a tier glyph; **Powder's whole scrapbook page is emoji today** (66 webp on disk, none for Powder) |
| E3 | **`public/assets/stickers/CREDITS.txt`** — a *second* provenance ledger, one tab-separated row per .webp (source URL + rights) | file:1 | twelve rows owed; nothing enforces it (iapdoc checks only paths named in APPSTORE.md) |
| E4 | `public/assets/music/CREDITS.txt` row | CREDITS.txt:29-38 | *"worse than an empty record because an empty record is honest"* — a 4+ rights exposure |
| E5 | Boot preload id | index.html:43 (hand-copied duplicate of WORLDS) | first match starts on the synth bed |
| E6 | Poster painting | prototype3d.ts:5878 | world 6 has none waiting; budget one |

## F. Silent because the table has a consumer the contract never pointed at
| # | Obligation | Anchor | Silent result |
|---|---|---|---|
| F1 | **The surface predicate's real consumer** | **prototype3d.ts:8943**: `const iceK = onIce3(voidState.x, voidState.z) ? 0.26 : 1;` feeding the velocity blend at :8944 | hard-coded call to **Powder's** predicate by name, no world-6 arm, no table. Build §2.7 exactly and world 6's ice/mud/sand is painted, walkable, water-exempt and **drives identically to grass.** The comment at :8937-8941: *"The one verb this game has is steering, and this is the first world that changes it."* |
| F2 | The shell's second consumer | prototype3d.ts:5140 `eatRatioNow = EAT_RATIO * (shellT > 0 ? 1.45 : 1)` | a new verb that multiplies eating is **scoring input to the WORLD_PAR measurement** (§8.5) |
| F3 | **Vehicles, train and pond life are hard-gated to Maple** | life.ts:2579 (`worldId() === 'maple' ? 30 : 0` cars), :2407 (`ROAD_CENTERS_3D : []`), :4474 (`buildTrain()`), :4405 (4 ducks) | world 6 ships **zero traffic**: dead FIRST CAR moment, no `qk:'car'` supply, and a `'cars'` chip in MED_BY_WORLD that can never clear. The draft saw only the downstream quest symptom |
| F4 | **life.ts has TWO per-world passes** | build pass: :3155 maple, :3208 pirate, :3961 lantern, :4049 powder, :4208 gameday. **Staged set-pieces: :4513 pirate, :4587 gameday (six vignettes + `addGD` + its own GdBiome→dress Record :4590-4593), :4692 maple** | Powder has no second pass, which is part of why it reads thinner. Build to a one-block model and world 6 gets scattered cast and no staged scenes |
| F5 | **The crowd update gate** | prototype3d.ts:9289-9290: `(introT > 0 ? Infinity : camDist * 2.2 + 90) * (pickedWorld === 'pirate' ? 2 : 1)` | doubled for Pirate because its movers cross open water with nothing occluding the mid-distance and the half-rate band read to the owner as **"item lag."** A bowl, a frozen lake or a pitch is exactly that shape |
| F6 | **The arc's pacing is a prop-COUNT decision** | `newsroom_arc.ts:80` `pctProg = clamp01((devouredPct - 2) / 38)`; `devouredPct = Math.round((consumed / max(1, initialMass)) * 100)` **prototype3d.ts:4436**, `initialMass = edibles.length` **:9948** | §7.8's *"World 6 supplies pools, not pacing"* is **half wrong**: the module is world-blind, its driver is not. The phase a child reaches by minute one, the HALF banner (:4440) and `{P}`/`{R}` in every LIVE headline are all set by how many props world 6 places. island.ts:5457-5459 records the swing as real (843 edibles vs Maple's 5,790). **Phase 4.10's ladder and Phase 5's census are newsroom-pacing decisions.** |
| F7 | **The corridor number, before the outline is drawn** | `coastMargin(R0)` **prototype3d.ts:650**: `grown*(1-taper) + 2.0*taper + 1.2`; at R≥16 → 3.2, tested at eight points by `coastSolid()` (:660) | a TITAN needs **6.4 3D units (128 world units)** of clear land through any neck. The comment records it tuned against every authored walkway including Pirate's 6.5u pier tongue. Bar A is the after-the-fact measurement; **this is the rule to author against** |
| F8 | The populate block's loading-bar seams | powder is the **only** block with interior `await breathe(...)` — island.ts:5373, :5411, :5430, :5456, :5520 (lantern/gameday/pirate blocks have none; each gets one seam before it at :5828, :6106, :6568) | a seamless block returns *"the longest stretch a child waits through"* (prototype3d.ts:1530-1533) to one main-thread chunk under a frozen bar — the *"is it frozen?"* failure fixed at :1512-1517 |
| F9 | `inLagoon3` and `WATERFALL`/`FERRIS` | island.ts:378 (ellipse :265, **no world guard, verified**), called unconditionally from `place()` :5298 and prototype3d.ts:6490-6498; WATERFALL :266 used unguarded :3466-3490, animated :3664-3665; FERRIS :3503 two-way ternary | prop-free bald patches on real land **today** (rasterised: gameday 1,127,200 world-u², lantern 372,600, powder 160,000, pirate 0 — reader's caveat: raw control points, 10-unit grid, never visually confirmed). **Photograph, do not trust the number** |
| F10 | Picker tagline length | **index.html:952-956**: *"LANTERN NIGHT shipped with a 33-character subtitle against a ceiling of about 22 and sat visibly higher than GAME DAY beside it"*; `min-height: 2.5em` reserves two lines so the next one cannot push the title out of the scrim | a copy constraint that has already broken the row once; §8.10 specified the markup and not the budget |
| F11 | `teachDrag` | prototype3d.ts:5633 `firstEver \|\| pickedWorld === 'maple'` | the default is correct for a new world — **record the decision**, it is a `pickedWorld ===` site inside the match-start block and belongs in the sweep |
| F12 | Four more audio dispatch points than the draft's ten | `bigEat()` audio3d.ts:4129, `win()` :4191 (*"the loudest thing in the match, on purpose"*), `alert()` :4231 (fired prototype3d.ts:2465, :2653), `ready()` :4254 (fired on every news card, :4216) | none mandatory; a list that stops at ten says the win sting and the alert sting are not per-world decisions |
| F13 | The refuted "make it less matte" fixes | `scene.environment` **prototype3d.ts:568**: *"AND IT STAYS RoomEnvironment, which was tried and reverted"* — measured **15% darker on Game Day (0.406 → 0.343)**; `environmentIntensity = 0.15` :609; GOVERNOR.md:255-281 ran shared-prop roughness 0.85→0.55 and reverted it; round 5 killed the gradient-environment rung at −10.2%/−20.7% (`docs/crews/round-5/materials.proposal.md:55-66`) | **a crew chasing "exceptional" reaches for exactly these.** Cite GOVERNOR.md's HANDS OFF list (:539-570) in the world-6 brief |

---

## PHASE 0 — Decisions before any code

| Decision | Why first | Anchor |
|---|---|---|
| **Six district id words nobody else owns** | The Biome union forbids sharing; life.ts keys voice, speed, prop sets, captions and panic off these literals. **One vocabulary must serve the level, the newsroom, the stickers, the audio zones — and `placeStickers`' `distOf` (A12)** | island.ts:22-57, :3607-3610; prototype3d.ts:1550-1552 |
| **Seeded or unseeded random stream** | mainstreet.ts:12-14 forbids `Math.random`; alpine.ts:132-133 declares its own unseeded `rnd`/`pick`. Retrofitting reshuffles every prop | mainstreet.ts:12-14, alpine.ts:132-133, island.ts:285-288 |
| **Land polygon shape, and what it is for** | Powder's oval never pinches; Lantern waists to 4.2k at y≈6000 to read as a street. **Author against `coastMargin`: 6.4 3D units clear through any neck (F7)** | powder.ts:60-72, lantern.ts:55-67, prototype3d.ts:650 |
| **Does world 6 change the ground's behaviour** | Forces a predicate, an `onX3` export, early returns in `inWater3`/`inDeepWater3` — **AND a world-6 arm at prototype3d.ts:8943, or the verb does not change (F1)** | powder.ts:120-124, island.ts:374-377, :410-419, :436-440, prototype3d.ts:8943 |
| **Season: yes or no** | Four worlds have a season with 4 stickers; Powder has one with **zero**. **And a season needs a `makeSeasonProp` branch or it scatters 44 moon lanterns (A11)** | seasons.ts:46, :68; stickers.ts:341-344; prototype3d.ts:1613-1645 |
| **Does the world teach a new verb** | If yes: a loading tip **and** a first-time in-world announce **and** a steering/scoring consumer | prototype3d.ts:5705-5709, :5167-5175, :8943, :5140 |
| **How many edibles** | **This sets the newsroom's pacing** (F6) and the quest supply (bar R) and the hoover economy (§4.10) | newsroom_arc.ts:80, prototype3d.ts:4436, :9948 |
| **Does it carry traffic** | Cars/train/ducks are Maple-only; world 6 authors its own or has none (F3) | life.ts:2579, :2407, :4474, :4405 |

**Scope gate.** `docs/FABLE-LAUNCH-BRIEF.md:32-35` permits world 6 to be *designed* freely and *built* only if the four refinement streams are green. All four filed SOUND — but the placement stream's "Owed" list (`docs/crews/round-5/placement.proposal.md:186-193`) is **not closed**, and placement is in no gate (C2). Get an explicit ruling.

---

## PHASE 1 — The union widen: one edit, twelve free errors

**1.1 — `src/proto3d/island.ts:59`** — add `| '<w6>'` to `WorldId`.

**1.2 — Four parallel unions that reference `WorldId` not at all:** `WorldKey` unlocks.ts:28; `Sticker.world` stickers.ts:43; `SeasonEvent.world` seasons.ts:33; `ReactWorld` newsroom_react.ts:50 — **compile-coupled**, prototype3d.ts:4039 and :4046 pass a `WorldId` as `ReactIn.world`.

**1.3 — The Records `tsc` will name.** `tsconfig.base.json:15` has `strictNullChecks` and **not** `noUncheckedIndexedAccess` — that single fact is the whole compile/silent boundary.

| # | Table | Anchor | Note |
|---|---|---|---|
| 1 | `PLANS` | island.ts:155 | 6×6 `Record<WorldId, Biome[][]>`; region worlds reuse a grid (`powder: GAMEDAY_PLAN`). Comment :152-155 states the purpose |
| 2 | `SKY_MOOD` | island.ts:610 | dereferenced unguarded at :628; `fog` → `new THREE.Fog(MOOD.fog, 420, 1500)` :629 |
| 3 | `SKIES` | island.ts:866 | `Body[]` (:831); all five ship 2 bodies, el ≈ −56/−76, az = AZ ± 0.11, **AZ = 3.927 (225°)**; `ring` inherits DISC_R 0.29 / DISC_FIT (:906-914) |
| 4 | `GRAIN` | island.ts:3216 | `[fine, mid, coarse, repeat]` → `uGrain` :3273. Bar G |
| 5 | `biomeColor` | island.ts:2071 | **the only compile gate that catches new district names.** `null` = the world's own bake paints it |
| 6 | `WORLD_LIGHT` | prototype3d.ts:734 (iface :717, powder :824) | 12 fields — **`hemiI` is one of them and is inert (D9)**. Read :828; hemi :951, fill :962-965, sun :966-975; `exposure` reaches the renderer via RIG.exposure :878 / applyLightRig :934-939 |
| 7 | `HOURS` | prototype3d.ts:907 | index 0 a no-op (:895-897); length read as data (:5562-5564); empty array throws in beginMatch |
| 8 | `WORLD_COPY` | prototype3d.ts:1314 (iface :1238) | 17 fields — §8.2 |
| 9 | `MID_POOL` | prototype3d.ts:3779 | key enforced, **length not** (D1) |
| 10 | book `NAMES` | prototype3d.ts:6241 | also the tab enumerator (`Object.keys` :6243) |
| 11 | `WORLD_LABEL` | unlocks.ts:34 | name on a locked card |
| 12 | `BY_WORLD` | newsroom_react.ts:334 | `Record<ReactWorld, WorldReact>` |

---

## PHASE 2 — The land module `src/proto3d/<w6>.ts`

powder.ts:2-3: *"Same contract as lantern.ts: a land polygon, districts, a spawn, and the placement queries island.ts asks."*

**Coordinate frame is global.** `SCALE = 0.05`, `CX = CZ = 6000`, `w = (v) => (v - CX) * SCALE` (island.ts:75-78). Duplicated at life.ts:35 and parsed back out by qa/placement.mjs:117, which asserts `CX === CZ`. All five polygons sit roughly inside x/y 1500–10600.

| Order | Export | Anchor | If skipped |
|---|---|---|---|
| 2.1 | Import + **re-export** the eight bay.ts primitives (`pointInPoly, smoothPoly, distToPath, pathPointAt, spotFree, spotOpen, claimSpot, resetPlacement`) | powder.ts:40-45 | life.ts:4108 and island.ts:5334/5346/5352 call them *through* the land module. **Do not fork** — powder.ts:44 |
| 2.2 | `Pt`, `X_LAND` (clockwise, north = −y), `X_LAND_SMOOTH = smoothPoly(X_LAND, 6)`, `X_LAND_RING` | powder.ts:47, 60-72 | feeds `silPoly()` island.ts:342 whose bbox :462-466 sets ground extent and bake mapping `pxW/pyW` :1048-1051. **Contain on the SMOOTHED ring** — gameday.ts:66-71 records the smoother cutting 141 units off a corner |
| 2.3 | `distToEdge` | powder.ts:75 | the only way to dress the rim; `scatterLand` band :320; life.ts:4073 |
| 2.4 | `HERO = {cx,cy,rx,ry}` (**integers, that key order, one line**), `HERO_MESH_K`, `inHero` | powder.ts:81-94 | **two numbers for two jobs** (:83-87). Precinct: island.ts:1235, :5377-5379. qa/placement.mjs:157 parses it by regex. The `× 1.10` inside the predicate is **undocumented — see §14** |
| 2.5 | Each authored line: `PATH`, `PATH_HALF` (integer), `pathNamePoint(t) → {x,y,ang}` | powder.ts:109-116, :132-145 | bake strokes from these constants (island.ts:1186-1187, :1194-1195); movers ride them (life.ts:4108, :4139; island.ts:5419-5421); placement **parses them from source text** (:151-153). `ang` is not optional (island.ts:5422, life.ts:4118) |
| 2.6 | One **authored furniture generator** | `liftPylons` powder.ts:152-162; `stallSlots` lantern.ts:263 | both worlds have exactly one |
| 2.7 | Surface predicate **iff the ground changes** | `onIce` powder.ts:120-124 → `onIce3` island.ts:374-377 → **`iceK` prototype3d.ts:8943 (F1)** | powder.ts:25-34: *"THE LAKE IS WALKABLE, AND THAT IS NOT NEGOTIABLE… any water boundary through the play space cuts the legal set with an invisible wall no child can read."* **A surface query, never a boundary** |
| 2.8 | `onXLand` | powder.ts:250 | wired island.ts:359 |
| 2.9 | `xFacingHero` | powder.ts:246-247 | the world's **default** bearing, not its only one (Powder's chalets face the lake, island.ts:5390) |
| 2.10 | `XBiome`, `XRegion {id;name;poly;density}`, `X_REGIONS` **ordered by priority, catch-all last** | powder.ts:165-227 | `xRegionAt` returns the **first** containing polygon (:254). `REG = (id) => …find(...)!` island.ts:5354, life.ts:4050 — a missing id is a **runtime crash during world build**. `name`/`density` verified dead to the runtime; ship both |
| 2.11 | `xRegionAt` — **null off the land, NEVER null on it** | powder.ts:252-256 | qa/pockets.mjs:5-8. Any on-land null is an invisible wall. Catch-all region **and** trailing catch-all return |
| 2.12 | `xPlaceable(wx, wy, clear = 40)` | powder.ts:262-268 | the only place "nowhere may a prop stand" lives. Lantern's incomplete one: **378 props in the channel at SEED=7** (:243-249) |
| 2.13 | `X_SPAWN`, **with the measurement written down** | powder.ts:241 | MAPLE_SPAWN's comment (island.ts:222-231) records 0.08 units of clearance — *"the void's own body was touching the nearest solid prop."* Also the bar-D constraint (§12) |
| 2.14 | The scatter trio + opts, **copied verbatim** | powder.ts:273-341 | every positional slot load-bearing (life.ts:4073 passes `band` 4th). `sep * 20` is the world→3D bridge (:282, :286). The sep/r trap island.ts:5546-5556 / bay.ts:300-305 (Game Day: *"2,364 requested, 861 placed"*). **Samplers are best-effort**: give up after `n*60` / `n*90` |
| 2.15 | **The rim rule** | powder.ts:222-224 | *"Do NOT scatterInRegion into this polygon — it spans the map"*; life.ts:4071 obeys by name |
| 2.16 | **Source-text format for qa/placement.mjs** | :102-113 | `export const NAME: Pt[] = [ … ];` / `NAME_HALF = <digits>;` / `{ cx, cy, rx, ry }` integers, that order, single line. :100 throws by design |

---

## PHASE 3 — island.ts wiring (A1–A7, A13 above)

island.ts:339-344 carries the warning: *"A CHAIN, not a ternary pair. Every one of these that stayed two-way handed the new world Maple's answer silently."*

Translate district ids at `biomeAt` if they collide (lantern :3597-3604, gameday :3612-3619). The `as Biome | null` cast compiles only while the unions overlap. Powder sidesteps the foliage ternary entirely by never calling `makeTree()` — **a dedicated art module is the cleaner pattern than a branch in a shared factory.**

**3.8 — Sweep for unguarded Maple constants, do not only fill known branch points** (F9).

---

## PHASE 4 — The prop kit `src/proto3d/<w6kit>.ts`

**4.1 — House-rules banner, four bullets verbatim** (alpine.ts:9-13; identical at nightmarket.ts:8-12, luxe.ts:11, tailgate.ts:11): one merged mesh on PROP_SHARED_MAT; no per-prop materials or textures, flat shading, chunky silhouettes; y=0 is the ground and the nose faces +X; under ~140 parts. Then the two or three rules only true here, each with the failure it prevents (alpine.ts:15-50).

**4.2 — Construction.** `part()` island.ts:4173 + `mergedProp()` :4313 on `PROP_SHARED_MAT` :3901. **Never a bare `THREE.Mesh`** — draw calls (:3897-3900, a hydrant alone at 8) and `armFade` inside `mergedProp` (:4361), so an unhooked mesh *"would inherit the previous occluder's 0.3 and disappear"* (:4109-4113).

**4.3 — "One draw call" is per material family.** `lit()` returns a Group of two meshes by design. Do not "fix" it.

**4.4 — Anything that burns is a second merged mesh on `PROP_GLOW_MAT`** (island.ts:4237, HDR 1.75). Each kit re-declares its own `lit()` (alpine.ts:137-142, nightmarket.ts:128-133). Glow colours must match the ground bake *"or the lantern looks like it is hovering over somebody else's light."* Powder proves the idiom is not night-only (alpine.ts:36-44).

**4.5 — `registerGloss(...)` at module scope** (alpine.ts:119-130; gloss.ts:50). Unregistered colours get gloss 0 — *"72% of the island … dead matte"* on Pirate (gloss.ts:38-42). **The map is GLOBAL, last-write-wins** (gloss.ts:31-45): Game Day's GOLD and Main Street's FAIR_C are the same hex and the second *"silently demoted every gold surface in the STADIUM"*, caught only because glosscov watched strong fall 27.1% → 17.9%. **glosscov is a four-world list and in no gate (C3/C5) — run it by hand, with world 6 named.** Register from gloss.ts, never from a module in the island import cycle (gloss.ts:8-18).

**4.6 — The top-down rules.** `camOffset = (0.62, 0.92, 0.62).normalize()` (prototype3d.ts:626) → pitch 46.4°, 65.6° at the steep zoom (:9574); azimuth fixed at 225° because `camOffset.x === camOffset.z`. Two free consequences: *toward the lens* is one constant world direction (exploited island.ts:5357-5371), and **−X is the shadow side** (alpine.ts:437).

| Rule | Anchor | Settled by |
|---|---|---|
| **THE ROOF IS THE FACE** | nightmarket.ts:492-506; alpine.ts:15-24; `capRoof()` :159-212 | *"the bathhouse is a black rectangle… From up there the building is six stacked roof plates in a near-black tile."* / *"A roof that is white to the edge merges with the white ground and the building vanishes; the dark strip is what says 'this white is SITTING ON something.'"* Already fixed once: inset 0.45 a side (:168-179) |
| **Identity colour on the ROOF** | alpine.ts:234, :239-254, applied :281 | *"the village was two dozen identical white slabs… New Horizons puts a house's identity colour on its ROOF precisely because that is the face its camera can see."* Keep an **unpainted variant** in the set; use colours already in the palette and gloss table; index off the width argument so the random stream is unchanged |
| **Nothing that must be seen sits under an overhang** | nightmarket.ts:262-268, :507-512; alpine.ts:477-495 | canopy half-extents **plus the prop's own radius**, then a visible cord. Powder's topper snowman: brim r 0.36 over head r 0.32 → 0.30; deleting the hats was **rejected** (−79% accent pixels on half the population). *"One number moves; the character keeps its hat."* |
| **Saturated accent on UP-facing surfaces** | nightmarket.ts:674-681; alpine.ts:232-233 | *"all it ever saw was the top of a grey head."* Powder's second job: *"anything flat carries white"* |
| **Vertical accents and patterns, not colours, on large flat tops** | nightmarket.ts:867-869, :563-564, :225-238; alpine.ts:550-553 | *"a stripe is the one pattern that survives being seen from directly above at any distance"*; the ski rack is *"six vertical accent stripes for the price of one prop"* |
| **Model goods with volume** | nightmarket.ts:1100-1117; alpine.ts:660-672 | *"the counter top is exactly where a child's eye already is"*; three indexed boxes plus a turned cylinder, **no new randomness** |
| **No neutral greys; every colour ΔE ≥ 6** | nightmarket.ts:56-79; alpine.ts:65-95; bar qa/formsep.mjs:23-31 | *"a prop painted in one has its top and its side render as the SAME colour and therefore has no form at all."* THE BLUE SHADOW RULE alpine.ts:26-34. Every colour a `const NAME = 0xRRGGBB;` so formsep's regex finds it |
| **The most numerous prop needs its own silhouette** | alpine.ts:432-445 | *"A pure-white mound on pure-white ground is invisible; the blue underside is the entire silhouette"* and *"a faceted drift reads as a rock."* `mergedProp` auto-picks PROP_SMOOTH_MAT at ≥50% round parts (island.ts:4307-4335) — **pass it deliberately** |

**4.7 — `noFront()` discipline.** alpine.ts:56-60 (`userData.spin = 1`); tag island.ts:283, `spinFor` :276, applied by `place()` :5307. Tag symmetric props only (Powder tags four: :427, :445, :522, :719); author a real yaw at the call site otherwise (island.ts:5389-5391, :5424, `snowmanYaw()` :5372). island.ts:5300-5306: **5,043 of Maple's 5,782 props at exactly 0 radians — 87%** *"is what the owner's phone photo shows as 'bare minimum'."* Lantern's `plant()` leaves `rotY` undefined unless `face` is set (:5560-5563). **The probe behind that number, `qa/variety.mjs`, has a five-world default list and is in no gate (C3/C5).**

**4.8 — y = 0 is the ground plane** (alpine.ts:12; `mesh.position.set(x3,0,z3)` island.ts:5299; `bakeContactAO` :4267-4300, AO_FRAC 0.34 capped 0.55). island.ts:4239-4245 calls this most of *"what separates a clay render from a toy photographed on a table."* Declare the one legitimate exception the way `makeLiftChair` does (alpine.ts:617).

**4.9 — Under ~140 parts each.** island.ts:4180-4189 measures Game Day at **376 MB of vertex buffers inside a 446 MB JS heap (84%)**, 36.9 bytes/vertex, nothing releases the CPU copy. **No probe counts parts (bar Y).**

**4.10 — Ship a size LADDER, both ends.** nightmarket.ts:913-935: `0-1: 2509 … 11: 1` — *"22 props at radius 4 or above out of 5,293, which is 0.4%… the last minute of a match, when the hero is a WORLD ENDER sixteen metres across, is spent hoovering crumbs."* Rungs :937, :1009, :1075. The other end, island.ts:5457-5464: *"843 edibles against Maple's 5,790 and only 208 small ones against ~2,600 — the child driver starved."* Answer: one cheap sub-1 factory reused at scale. **This count also sets the newsroom's pacing (F6) and the quest supply (bar R).**

**4.11 — Name the landmark meshes** `g.name = '<landmark>'` (alpine.ts:362-364, nightmarket.ts:1003-1005) so the beat can point at a tower that visibly thumps.

**4.12 — Do not rebuild shared furniture.** alpine.ts:765-766: *"The kit deliberately has no makeLamp: island.ts already owns the street lamp, and one lamp design across worlds is how the game stays one game."* Close the kit with a comment naming what was deliberately not built.

**4.13 — THE KIT IS WHERE THE SPHERE RATCHET BREAKS.** `qa/roundlod.mjs:62` is `const DIR = 'src/proto3d';` and globs **every** `.ts` in it. Verified `SphereGeometry` line counts: **alpine.ts 25**, luxe.ts 65, tailgate.ts 33, nightmarket.ts 16, life.ts 33, island.ts 37, bay.ts 0. So the draft's *"none of the land modules contains a SphereGeometry call"* is true and **misleading**: world 6's kit *and* its crowd module both count against `BASELINE = 154` (:49) and `TRI_BASELINE = 39018` (:60), on the push profile. A single new 14×10 sphere adds 252. Build from existing factories, or lower BASELINE in the same commit with the arithmetic in the message.

---

## PHASE 5 — Ground bake and populate

**5.1 — Ground bake block** `if (WORLD_ID === '<w6>') { … }` sited among the siblings (powder :1077-1243, pirate :1250-1499, lantern :1520-1844, gameday :1855-2068). Each re-fills the whole 3072px canvas with its own base and paints regions with locally-declared `pxW/pyW`. Skipped → A7. Powder's block is most explicit: *"Snow is the easiest ground in the game to get wrong: flat white reads as a blank canvas, not a place"* — base `#dfe7f6`, **never pure white**; and it is the only block documenting avoidance of `Math.random` inside the guard (:1127). **Nothing in the studio pack ever renders this (C9) — dump it by hand with `qa/_dumpbake.mjs <w6>`.**

**5.2 — Populate block ending in `return;`** placed **before** the Maple section at island.ts:6569 (powder :5332-5522, lantern :5534-5826, gameday :5834-6104, pirate :6108-6565). Skipped → A8. `:5521 return; // POWDER PASS is fully populated — the Maple grid pass must not run`. **Carry Powder's five `await breathe(...)` seams (F8).**

**5.3 — Author `drop()` with all three of Powder's improvements from the start** (island.ts:5344-5353): the per-kind surface veto (landed after placement counted **20 pines rooted in the frozen lake**), `mesh.userData.authored = true` on forced drops (D5), and `mesh.userData.qk = qk` (D4). `qa/_qkcensus.mjs`: Maple carries house 70, car 67, roadworks 20, bridge 8, goat 1 and **5,729 props with no tag at all**; Pirate tags nothing but 7 cars.

**5.4 — `force` is ONLY for marking an authored landmark.** GOVERNOR.md:616-617: *"A forced drop is a skipped test."* Powder measured `inside 31 → 43` at SEED=7 from a patch whose author believed they were working around a radius-matching rule; the correct fix was the rule (bay.ts:300-305).

**5.5 — Registration**: `import * as W6 from './<w6kit>';` (cf. `AL` island.ts:17); `drop(W6.makeX(), p2, radius, rotY, force?, qk?)`. **The radius is the prop's EAT radius, authored at the call site** — `place()` passes it to `addEdible` and `shouldCast(r, mesh)` decides real shadow vs contact blob at a bar of 4 (:5310-5321).

**5.6 — The runtime road corrector does nothing outside Maple.** `pickedWorld === 'maple' ? ROAD_CENTERS_3D : []` prototype3d.ts:6485 inside `validateWorld()` (:6425, `__validateWorld` :1806). For any other world it does only the off-island cull (:6478) and one `settleFootprints()`. **World 6's authored scatter is what ships.** The comment at :6483 records the same class of miss (*"written as 'not pirate' — so Pirate Bay was fixed and Game Day, which arrived later, inherited the bug"*). Compounds with C1: a non-Maple world with roads has **neither** a corrector nor an auditor.

**5.7 — Traffic, train and pond life if you want them** (F3): life.ts:2579, :2407, :4474, :4405. A `'cars'` chip in `MED_BY_WORLD` is a lie without this.

---

## PHASE 6 — The crowd (`life.ts`)

**6.1 — TWO per-world blocks, not one** (F4). Build pass inside `createLife` before `return { update, calm, … }` (:5629): powder :4049-4206, maple :3155, pirate :3208, lantern :3961, gameday :4208. **Staged set-piece pass: gameday :4587 (six vignettes, `addGD`, its own GdBiome→dress Record :4590-4593), pirate :4513, maple :4692.** Without the build block: no townsfolk, nothing throws, purpose samples ~0 movers so `travellerPct = 0/max(1,0) = 0` and the FAIL-LINE fires on an empty world.

**6.2 — The `place()` helper is the entire purpose opt-in.** life.ts:4051-4057 passes `leg` and the 1.15 as arguments 11 and 12 to `addWanderer` (:2597); the gate is `const errand = leg !== undefined && leg > 0;` (:2620). Without them the person runs the pre-2026-09-04 body (:2757-2759). Before the errand landed, across all five worlds (`docs/crews/round-5/purpose-data/before.log`): **drift median 0.085–0.238 against 0.30, 7–23% travellers against 33%. Every world failed.** Powder after: drift 0.984, 361 of 386 completed a journey.

**6.3 — Choose `leg` from the world's feature pitch, in 3D units, arithmetic written down.** lantern 20 (:3985-3988), gameday 22 (:4243-4244), powder 24 (:4056), maple 32 (:3136), pirate 22 (:3233). Drawn as `leg * rand(0.85, 1.15)`, shortened 0.7×/0.45× on fallbacks (:2651); leash `max(leg * 3.0, tether)` (:354, :2625). **Never below ~18** — at leg 12 the spread band is 10.2–13.8 and no leg crosses purpose's GO 15 (qa/purpose.mjs:84).

**6.4 — `paceMul` strictly below 2.4** (life.ts:348-350; flee :2727, contagion :2792). Shipped: lantern 1.3, gameday 1.25, powder 1.15. Breaking it re-opens the ring bug (:4226-4238) — **45 seconds of a 180-second match with the score frozen.**

**6.5 — Root the posted cast with an explicit `leg: 0`.** Only pirate (:3233) and gameday's aisle crowd (:4311) do. **A tight tether alone roots nobody.** Live trap: Lantern's "rooted" stallholders (`lnPlace` defaults `leg ?? 20`, leash `max(60, 2.2) = 60`) are free to walk 20 units off their counters. Elsewhere the opt-out is by omission (maple :3110-3117, pirate :3641-3648, :3267, gameday :4598, :4832, :4368).

**6.6 — The cast table governs head count. No global cap, no auto-fill, no default.** PW_CAST :4058-4064 (327 + 30 rim), LN_CAST :3992 (≈971), GD_CAST :4257 (≈497), pirate :3232, maple ZONE_CAST :3087 (≈317). **`if (!r) continue` is a silent skip** (D8) — Game Day throws loudly instead (:4280); **prefer the loud version.** Powder's modest counts are argued from the perf budget (:4046-4048); the only written one is `docs/AAA-BRIEF.md:893-902`: ≤450 MB JS heap worst world.

**6.7 — Populate the fallback district with `scatterLand` + a band** (life.ts:4072-4075; same fix on lantern :4021-4027). Its speech pools get used by anyone who *wanders* in, even with an empty cast list.

**6.8 — `OUTFIT` keys** life.ts:892, consumed :1000. Failure at :951-953: *"without these eight, every person on the level fell through to OUTFIT.cozy and the crowd came out in suburban pastels at a football game."* **VERIFIED LIVE GAP: OUTFIT has no key for any of Powder's six districts.** Copy Lantern or Game Day.

**6.9 — Speech pools, and BOTH dispatch sites** (~3000 lines apart). A (ambient): life.ts:5708-5709 plus fallbacks :5719-5720. B (flee line): life.ts:2745-2747. **VERIFIED LIVE GAP: Powder wires A and not B** — every fleeing skier shouts `PANIC.generic` ("AAAAH!!", "RUN FOR IT!!", "tell my cat I love her!!"). life.ts:5701-5705: *"Nothing here shares a literal with another world precisely so that fall-through cannot happen silently."*

**6.10 — Movers and the purpose bar.** qa/purpose.mjs:74-75 skips only absent `userData.mover` and `qk === 'car'`; **every other mover counts as a person**, and a closed loop scores drift ≈0. Powder: 22 loop movers (:4079-4102, :4106, :4133, :4156, :4184) against 361 walkers. **Design the ratio; do not discover it on the gate.** `fast: true` (:4088/:4136/:4159, iface :361-364) exempts from the distance stagger (:5660-5686) — smoothness, not purpose. **And decide the crowd update gate (F5), prototype3d.ts:9289.** The census for it, `qa/moverbands.mjs:22`, **cannot be pointed at world 6 without editing the file.**

**6.11 — The greeting register is optional, hard-gated to Lantern** (life.ts:2701-2702, pool :2194, fired :2713-2718). **Coupling:** `greetCd` is drawn for every wanderer on every world (:2612) and reused as the errand's first-dwell stagger (:2630) *specifically so no new random draw is spent*. Changing that draw shifts every downstream seeded placement.

**6.12 — Global, not per-world:** the ERR constants (:351-357), `contactShadow(radius * 0.55)` and `ptsMult = 1.5` (:2670-2673).

**6.13 — Nothing photographs world 6's crowd** (C8). `qa/crowdface.mjs:16` defaults to maple and is in no gate; `qa/personsheet.mjs` rejects any body above radius 1.6 while every adult is 2.4 and every child 1.9 (GOVERNOR.md:482-494) — *"the crowd's face has never been looked at."* Shoot it by hand.

---

## PHASE 7 — The paper `src/proto3d/newsroom_<w6>.ts`

Nothing about the paper is shared. Powder is 709 lines, Lantern 724. **That is the size of this obligation.**

**7.1 — Exports:** `<W>_BRAND: [string,string,string]` (:90), `type <Wd>Dist` (:68), `interface <W>Ctx` (:70), `pick<W>News(ctx, rnd = Math.random)` (:641), `reset<W>News()` (:570), `<w>NewsCount()` (:579). **Game Day additionally exports an alias surface under bare names** (`pickNews`, `resetNews`, `mealKind`, `newsAudit`, `BRAND`, `type NewsCtx`, `type Dist` — newsroom_gameday.ts:1295-1300); that is an option, not a requirement.

**7.2 — The pools**, Powder's counts as the floor:

| Pool | Anchor | Count | Notes |
|---|---|---|---|
| `SIGN_ON` | :100 | 13 | guaranteed first card, **no tokens**, ≤1 "!" (newsroom.ts:22) |
| `MORNING` | :126 | 26 | phase 0, no tokens, no greeting. qa/newsarc.mjs:285 fails any phase-0 card matching `/\b(void\|hole\|sinkhole\|devour\|swallow\|eaten\|guest in the purple)\b/i`. `MORNING_MIN_CARDS = 2` forces two every match — a thin pool is what a child meets first, every time |
| `GENERAL` ×3 | :159/:234/:305 → :545 | 41/42/41 | last resort (:699). Split `T0/T1/T2` shape **requires a second edit at qa/newsstyle.mjs:105** (`splitGeneral`) or `grab(src,'GENERAL')` throws — the meter **crashes rather than reports** |
| `T0/T1/T2_BY_DIST` | :203 → :546 | 24/18/18 | missing key degrades silently at :675; **not metered by newsstyle at all** (:28-32) — the least-defended lines in the corpus |
| `MEAL_*` → `BY_MEAL` | :395/:419/:442/:467, :493 | 5/5/6, 5/5/5, 6/6/5, 6/6/6 | classifier `mealKind` (newsroom.ts:724) is keyword matching: house/villa/hut→house, car/truck/van→car, building/landmark/big→big, else small. **CORRECTED: it is re-implementable per world** — `gamedayMealKind` newsroom_gameday.ts:727 adds home/rv/bus and is re-exported as `mealKind` at :1297, and MEAL_NAME's gameday branch carries an `rv:` key only that classifier can route. So world 6 either names its edibles inside the shared keyword set **or writes eight lines of classifier** — do not rename chalet/lodge/gondola to satisfy a table |
| `LIVE` | :501 | 12 | vocabulary fixed at :498-500: `{F}{M}{P}{R}{S}{D}`, *"those SIX and no others"*; never open with `{D}` or `{M}` |
| `SIGN_OFF` | :375 | 10 | fired :666; `signedOff` :550, cleared :572 — *"a sign-off that fires twice is not an ending"* |
| `DIST_NAME` | :631 | 6 | **every value carries its own article**; newsstyle :84-85 computes worst-case fill from `longestDistrict`, :151 fails `/\b(the\|a\|an\|no)\s+\{D\}/i`. "the High Shoulder" is 17 chars off the 78-char budget of every `{D}` line |

**7.3 — The machinery** (copy Powder; it is the one where every exit goes through `air()`): `RECENT_MAX = 14` holding **raw templates** (:555, :656-657, :706-707); selection :696-699 takes the first pool with an unsaid line; the **drone guard** :558-567 (`openers` capped at 4, `droning()` on the last two, applied as a **preference** at :653 and — **filled**, not raw — at :703; caught on Game Day at SEED=7, four cards all opening "The"); `air()` :596 with `TICKER_MAX = 78` :588 called by all four exits (:644, :658, :668, :708); `fill()` :611-620 (`{M}` → `fragment()` clipped 22, first clause, no terminal stop; `{P}` clamped 1..99 with `{R}` from the same rounded value; `{F}` 14; `{S}` ceiled ≥1); `usable()` :625-627 applied to **all four** pools at :676-679; weighting :684-692 (≈34% district / 22% meal / 28% live / 16% general — order lists are fallback chains, so effective share drifts toward whichever pools are fresh).

**7.4 — `newsroom_react.ts` entry** (:293, iface :73-83), added to `ReactWorld` :50 and `BY_WORLD` :334. Floor 20 literals (newsstyle :185); **ship 27** (Powder has 22, with 4 landmark lines against everyone else's 7). `{X}` budgeted against `SUBJECT_MAX = 34` (:71). `reactLine()` returns null for an unknown world (:450-451) and every call site treats null as silence — **a landmark going, the void evolving, and one void eating another reported by nothing at all.** House rule :376: the town reacting to the beat **meeting the void**, eight seconds after the banner — never an echo.

**7.5 — `MID_REACT`** (:377, powder :427), keys `'<w6>.<beatid>'`, first two aliasing `BY_WORLD.<w6>.beat[1]`/`[2]` **by reference**; ids must match MID_POOL's `id:` (prototype3d.ts:3806-3815). Silent (B4). **Metered by nothing**, and Powder's two pools carry the only two over-length lines in the file (79 and 81 chars), both losing their punchline. **Hand-check at 78.**

**7.6 — Wiring in prototype3d.ts:** import :40-44; district whitelist beside `PW_DISTS` :55; `else if (pickedWorld === '<w6>')` before the bare `} else {` at :4193; brand in the **queued-card chain** :4133-4136; `reset<W>News()` at :6681. Three silent sub-failures: no module → **the Maple Falls Bugle, Mayor Dinkle, Marge's parking meter, for three minutes**; no brand chip → the chip flickers between two papers; no reset → PLAY AGAIN gives a paper that has used its best lines and newsarc section F fails.

**7.7 — WHAT THE PAPER MAY NEVER SAY** (all quoted from source):
1. **No rival names, ever** — newsroom_powder.ts:39-44; enforcement newsroom.ts:58-64 (*"`usable()` refuses point blank to air any template containing a token outside {D}{M}{F}{P}{R}{S}"*). Machine-checked twice (newsstyle :178, :203-205; newsarc :294).
2. **No void ever speaks in a news card** — newsroom_react.ts:36-37; origin newsstyle :169-175 (`💬 CHOMPZILLA: ACT TWO: I CHARGE!!` under a town newspaper's brand chip).
3. **Nobody is ever hurt and nobody is ever eaten** — newsroom_react.ts:40-41, newsroom_powder.ts:35-37. **Not machine-checked anywhere — a reader's job.**
4. **Rated 4+, broader than danger** — newsroom.ts:65-68 (no alcohol, gambling, money trouble, real politics); standing instruction prototype3d.ts:4197-4199 (*"NO ELECTION… Do not put the election back"*). **Also unmetered.**

**7.8 — The arc module is world-blind; its DRIVER is not** (F6, corrected). `PHASE_AT [0, 0.13, 0.45, 0.78]` (:36), `MORNING_MIN_CARDS = 2` (:48), `TIER_OF_PHASE [0,0,1,2]` (:33), driver `max(pctProg, clockProg)` with the form floor (:80-99). No per-world hook exists — **but `pctProg` is a prop-count ratio, so world 6's edible census is a newsroom-pacing decision.**

**7.9 — Crowd voice pools are optional and are NOT the paper** (newsroom_maple.ts:912/993, newsroom_gameday.ts:817/944; life.ts:2345-2347 falls back). If added, they must join `qa/_newscensus.mjs:56-58`'s exclusion list.

---

## PHASE 8 — The runtime shell

**8.1 — `WORLDS` (prototype3d.ts:352, validated :355) and `WORLD_NAMES` (:347).** WORLDS is a runtime whitelist — absent means unreachable, `?w=` and `voidWorld` fall back to Maple, and the picker card silently launches the wrong world (:348-351). WORLD_NAMES → B1.

**8.2 — `WORLD_COPY`, 17 fields** (:1314, iface :1238, powder :1447): `n, newsGap:[min,spread], signOn, hero:[x,z]|null, introLen, icon, sub, ender, enderNews, winSub, winTitles[], place, heroCue|null, heroCueNews|null, heroGone|null, heroName|null, houseNews, rivalFullNews`. **`hero` is in 3D coords and is a hand-copy** (:1452-1453) — moving world 6's landmark means editing two files. The table exists because three fields were hard-coded to Game Day and **Pirate Bay and Lantern Night both raised "🏟️ THE STADIUM IS IN REACH" at the biggest moment of the match, followed by a headline naming Hank Prewitt** (:1223-1236, :1268-1278). Consumers: `introLen` :5619, :5621, :9545, :9557; `hero` :9556-9567; `signOn` :3916, :6779; `newsGap` :9790; heroCue quartet :9741-9769; `houseNews` :5389; `rivalFullNews` :2707; `place` :4440; `winTitles` :4978; `ender/enderNews` :9705-9706. **`heroName` null means the paper says nothing at the single biggest moment in a match.**

**8.3 — Beats.** `W6_BEATS` ×4 (cf. powder :3745-3757) at at:30/dur:14, at:66/dur:16, at:110/dur:18, at:148/dur:32 — mults 2,2,2,3, each with col/flash/icon/title/sub/news; slots 1 and 2 carry a stable `id`; a set-piece carries `cue`. Extend the ternary at :3759-3762 (A9). `matchLen` is global (:3331, :5554). A `cue` is a contract with life.ts/island.ts. `MatchBeat.news` → D2.

**8.4 — `MID_POOL` exactly four** → D1. `matchdeck.ts:48` `PAIRS = [[0,1],[2,3],[3,0],[1,2]]`, *"Authored so consecutive entries share no index IN EITHER SLOT."*

**8.5 — `WORLD_PAR` — a MEASURED number** (:548). Method: `node qa/ab.mjs 5 <w6> child`, target a child winning 70-75%, par ≈ 0.75 of the measured mean, **then re-measure** (two passes). Skipped → B2. **If world 6 has a shell or any eat-ratio modifier (F2), measure after it lands.** Powder's 45000 still carries a caveat (:555-558) that it was measured against a 150k placeholder.

**8.6 — Quest board.** `MED_BY_WORLD` :3510, `HARD_BY_WORLD` :3517 (B3); `EASY_Q` :3460 is **global** — every world must serve 'snack', 'gold' and 'combo'. `HOUSE_LIKE` :3534 — **Powder is the world that made it necessary** ('chalet','lodge','hut'); until those were added the houses quest and FIRST BUILDING were both dead. Recorded three times (:3479-3496). **Live defect to fix or inherit:** `addEncoreQuest`'s banned set (:3609) is a hand-written second list that does not consult MED/HARD_BY_WORLD, so **a cleared Powder board can still draw an uncompletable Big Fish chip**; questable replays the daily draw and would not see it.

**8.7 — `MEAL_NAME`** (:3841, consumed :5292, `mealOf()` :3857) is a **two-branch ternary, not a table**, keyed by `qk`. `lastMeal` lands as `{M}` in 22 templates. Two rules enforced only here: never a terminal stop or comma (:3862-3869 — *"It ate a guest. mid-sentence.."* reached a real card) and **never a person's name** (:3872-3879 — the 4+ rule was broken at this substitution point, not in the pools).

**8.8 — Twelve stickers.** `Sticker = {id (never rename — save key AND art filename), world, name, where, biome, hint, tier, art}`; set stickers.ts:241, spread into `STICKERS` :342. **CORRECTED: the `biome` string must match what `distOf()` returns, not raw `biomeAt` — and `distOf` translates on maple and gameday (A12, prototype3d.ts:1550-1552).** Missing set → `✨ 0 SECRETS` (:5967), book 0/0, results line :6213 never appears. Mismatch → D3 (four of Maple's twelve failed this way from a sampling-box bug alone, :1569-1574). Placement is deterministic off the sticker id *"so a hiding place is a secret a child can tell someone about, not a slot machine."* **newsarc section E requires world 6 to place sticker props** or it fails with *"no sticker prop is placed in this world — nothing to eat"*; its retry-up-to-three exists because rivals ate Pirate's first — **place more than three.** Art on disk → E2; provenance rows → E3.

**8.9 — Unlock ladder.** `WORLD_ORDER` unlocks.ts:31 is silent and is the one that matters: `gateFor` :74 returns null for `i <= 0` so an absent world **reports as unlocked and never locks**; `completeWorld` :83 returns null for `i >= length - 1`, so **finishing Powder currently opens nothing**. Appending world 6 **changes Powder's behaviour too** — it starts firing an unlock ceremony it has never fired (:5059-5075). `migrate()` :55 grandfathers any world with a `voidBest_` key, so a tester who used `?w=` can never see its own lock again. **No per-world IAP** (unlocks.ts:15-16, `PRICES` :4624, :4614) — **no store work.**

**8.10 — Picker card, poster and fallback.** `<div class="wCard" data-world="<w6>">` with `.wArt`, `.wNum`, `.wBody` (`<b>NAME</b><span>TAGLINE</span>`), `.wBest`, `.wGo` — index.html:1928-1953. Binder prototype3d.ts:5947 iterates `#worldRow .wCard[data-world]` — **no element, no listener, no lock state, no best score, no season chip.** `.wNum` text must agree with `WORLD_COPY.n` (:1477). `CARD_ART` :5878 / `CARD_FALLBACK` :5922 → B5; the `/assets/hf/…png` literal shape is what `scripts/asset-refs.mjs` scans so `pnpm build:ios` vendors it. `#worldRow` (index.html:895-902) is `auto-fit, minmax(min(190px,40vw),1fr))` with **no per-world CSS — the sixth poster reflows by itself.** **But the reflow narrows every column at every viewport, and bar K is measured at one (qa/pickerfit.mjs:72, 430×932)** while the recorded lesson is the opposite (GOVERNOR.md:661-665: splash lines passed at 430×932 and 440×956 and failed at 440×814, 430×740, 393×700, 375×667 — which is why the splash step sweeps six, gate.mjs:176-178). **Shoot the picker at the small viewports by hand.** **Tagline ceiling ~22 chars (F10).** Preload id → E5.

**8.11 — Loading tips and the eat-time special case.** `LOAD_TIPS.push(...)` at :5705 (base :5683); eat hook `e.mesh.userData.qk === '<tag>' && pickedWorld === '<w6>'` at :5167. Optional, but **the loading screen is the only place a rule can be read before it is felt.** Powder pays for its two verbs in both places (:5705-5709, :5167-5175). **A new rule is a tip PLUS a first-time announce PLUS a real consumer (F1/F2) — three places, not one.** Also record `teachDrag` (F11).

**8.12 — Verified NOT obligations.** `DISTRICT` (:3890) is dead — its only reference is inside `fillHeadline` (:4082), which has zero callers, as does `pickHeadline` (:4073). `rivals.ts`, `void3d.ts`, `bubbles.ts`, `hats.ts`, `store3d.ts`, `palette.ts` have no per-world surface; rivals' only per-world input is `par`.

---

## PHASE 9 — Audio

**Fourteen dispatch points, one JSON row, one hard-coded array in index.html, three QA lists and one mp3. The compiler catches none.**

| # | Site | Anchor | Falls through to |
|---|---|---|---|
| 9.1 | `const isW6 = () => worldId() === '<w6>'` | :3581 (cf. :937-938, :3075) | the hook everything hangs on |
| 9.2 | `worldSynth()` | :712 | Maple's banjo — and `startTown` sets `mapRunning = true` (:2424), un-gating Maple's district beds (:2243) |
| 9.3 | `synthStop()` | :789 | **synth score and licensed track play simultaneously for the rest of the match** |
| 9.4 | `startMusic()` synth ternary | :3730 | Maple's bed |
| 9.5 | `stopMusic()` | :4042 | score runs past the whistle, under the win sting, into results; interval never cleared |
| 9.6 | slot ternary ×2 | :3735 **and** :3862 | `'maple'` — and maple.mp3 exists, so no 404, no synth fallback: **world 6 plays Maple's licensed banjo under its own score for a full match** |
| 9.7 | `jingle()` guard | :3807-3809 | **subtractive** — doing nothing produces *sound*: Maple's municipal eight notes (`jingleQuote` :2456) |
| 9.8 | `evolve()` | :4169, chain :4172-4176, model :3696-3706 | `mapleEvolve()` :1715 — **the town band's fanfare on every evolution.** Verified on world 6 by **nothing in the gate** (C10) |
| 9.9 | `matchBeat()` stings | :3980, gameday :3983, lantern :3995, `if (!isPirate())` :4008 | **LIVE DEFECT ON POWDER**: no powder branch, and all four titles match none of the regexes, so every one falls to `townFanfare()` (:2537). **Maple Falls' town band answers the avalanche.** Copy **Lantern** :3995-4006, match generously (:3986-3988) |
| 9.10 | `setZone()` place layer | :3942, gameday :3947, lantern :3955, `if (!isPirate())` :3963 | a decision to record. Powder's omission is written (`docs/AAA-BRIEF.md:1086-1089`). Silent no-op **unless 9.2 is also skipped** — then `mapRunning` is true and a colliding biome name raises a Maple district bed. Refs: `MZoneId` :2147, `MZONE_VOL` :2148, `mNormZone` :2157, `buildMBed` :2176, `mApplyZones` :2232; strings arrive via prototype3d.ts:9721 |
| 9.11 | **Four more, none mandatory** (F12) | `bigEat()` :4129, `win()` :4191, `alert()` :4231, `ready()` :4254 | Maple's squares and Maple's chime. **The win sting IS a per-world decision** |

**9.12 — The one asset on disk.** `public/assets/music/<worldId>.mp3`, filename identical to the WorldId literal (:3721-3726: *"PRESENCE OF THE FILE IS THE SWITCH"*). House spec CREDITS.txt:24-26: **−16 LUFS integrated, −1.5 dBTP, 128 kbps 44.1 kHz stereo, under ~3 MB, no head silence, 60-120s, no vocals, a loop point that does not click.** **mp3 only** — `docs/AUDIO-SOURCING.md:107`, open-source Chromium cannot decode AAC, so an `.m4a` renamed `.mp3` is the classic silent failure. Licence: Pixabay / CC0 / PD / Kenney / Mixkit / Sonniss; **CC-BY, CC-BY-NC, CC-BY-SA all rejected** (CREDITS.txt:7-10). One row with title, artist, source URL, licence (E4). *(All six current rows read "(title not recorded) … SOURCE URL MISSING" — do not add a seventh.)*

**9.13 — `music-manifest.json`**: `"<w6>": { "loopStart": <seconds> }`, read by `loopFor()` (:423-427) as `row?.loopStart ?? 0`. Only needed if the track opens on a stinger — Game Day forced the file (:21-25): its first 1.5s measures **20 dB above the body** and was re-firing every three and a half minutes.

**9.14 — Per-world tuning:** `PIR_VOL 0.42` :1321, `MAP_VOL 0.40` :1810, `GD_VOL 0.42` :2611; Lantern :3313 and Powder :3684 ramp to 0.5 inline with no named constant. `docs/MUSIC-BRIEF.md:268-270` warns these were tuned before the recordings landed and *"are almost certainly wrong now."* **Global, do not touch:** MASTER_VOL 0.62 :122, THEME_FADE 1.6s :438, `duckMusic` :698, the drumless cover pad :728, the watchdog/`repairMusic` :791, the menu channel and MENU_URL :437, and the shared one-shots. **No per-world SFX asset** — `public/assets/audio/` holds 31 shared one-shots.

**9.15 — Copy Powder's two structural improvements.** `ensurePwBus()` split out of `startPowderScore()` (:3668 vs :3680) so a one-shot can reach the bus without starting the scheduler under a recording (:3664-3667) — that fix solved **32 stray score voices in 8s**; and the fallback drum gated on `recordingLive()` (:3632). The scheduler reads module-level `musStage` (0..4) and escalates on it (:3575-3580), beat length deriving from stage (`60 / (96 + musStage*8) / 2`, :3650).

---

## PHASE 10 — Registering world 6 with the machines

**Nothing above is verified until this phase is done. A world absent from a probe's list ships green — and fifteen probes are in no gate at all (C3).**

**10.1 — `qa/gate.mjs:46`** — `const WORLDS = [..., '<w6>'];`. Five steps are generated and four widened:

| Generated | Anchor | Profile / budget |
|---|---|---|
| `smoke:<w6>` | :68 | **live only** (`smoke:maple` alone is push+live+art), 420s, pf |
| `postpipe:<w6>` | :230 | live+art, 420s, exitCode |
| `switch:<w6>` | :234 | live, 420s, pf |
| `newsarc:<w6>` | :256 | live, 600s, exitCode, `env ARC_WORLD` |
| `hero:<w6>` | :272 | live+art, 300s, pf |

Widened: `traverse` :73 (900s), `vary` :77 (900s), `faceparity:all` :103 (4200s), `questable` :215 (1200s). Live profile 55 → 60 steps. `docs/AAA-BRIEF.md:764`: *"a fifth world with no gates regresses silently."*

**10.2 — The asymmetry.** The **push** profile is 20 steps and gains **nothing** automatically. Every edit below is to the *probe*, not the gate — and these are the cheap fast steps that would catch world 6 earliest.

| Probe | Edit | Failure if skipped |
|---|---|---|
| `qa/newsstyle.mjs:38-40` (`F` map) | `<w6>: 'newsroom_<w6>.ts'` | **prints `clean` and meters nothing.** *"POWDER PASS was missing from this list for its whole life."* When added it *"immediately found seven shipped lines whose worst-case token fill overruns the ticker"* (79-95 chars against 78) — one was the line the voice judge called the best Powder line in the codebase |
| `qa/newsstyle.mjs:105` | only for the split-GENERAL shape | **the meter CRASHES rather than fails** |
| `qa/newsstyle.mjs:183` | uppercase world name | react pool unmetered |
| `qa/newsfeed.mjs:31` | default list (**gate passes no world args**) | sequence never read |
| `qa/purpose.mjs:41` **and :58** | both | crowd never measured; a missing seed hangs to its timeout |
| `qa/smoke.mjs:38` (`MUSIC_SLOT`) | the id **or** ship the mp3 | **verified: powder is absent and survives only because powder.mp3 exists.** A synth-only world 6 fails twice on a build working as designed (:146-150); smoke.mjs:24-28 calls that *"the state in which a smoke gate stops meaning anything"* |
| `qa/music.mjs:22` | **verified still four worlds** | the only probe that can tell a playing recording from a playing synth never looks. **Also in no gate** |
| `qa/vary.mjs:23-31` | `BASELINE`, `HOURS_AUTHORED` | both **wrong-reason reds**: no BASELINE → fails on its first run; no HOURS_AUTHORED → `undefined > 1` is false, silently takes the single-hour branch |
| `qa/firstframe.mjs:32` **and :51** (`INTRO_LEN`, hand-copied from WORLD_COPY) | `<w6>: <introLen>` | `waitT(NaN)` never resolves — **the probe HANGS forever rather than erroring** |
| `qa/skycut.mjs:28` | the id | wrong moments sampled |
| `qa/placement.mjs:82` **and a `worldData()` branch :125-160** | see 10.4 | **vacuous PASS** |
| `qa/gamutzero.mjs:208` **and :233** | id + kit module | unmeasured — **and it is `profiles:['art']` (gate.mjs:190), so it blocks no push** |
| `qa/packfresh.mjs:32` | the id | unmeasured — **also `['art']`** (:194) |
| `qa/formsep.mjs:57 / :60-64 / :72-76` | `KEY = <WORLD_LIGHT × 1.31>`; `OWN = ['<kit>.ts']`; `NO_PALETTE` gains `'<w6>.ts'` | **exits 1** — *"N module(s) with palettes are unclassified"* — once the kit carries ≥8 colour constants (:125-135). Under `MIN_SAMPLE = 8` a world is reported **unexamined, not passing** (:77-82). The list is exhaustive by design (:69-73). **In no gate** |
| `qa/normals.mjs:83-96` (`FACETED_BUDGET`) | only for Icosahedron/Dodecahedron/Octahedron/Tetrahedron | fails on push. Written because Maple's most-placed prop used an Icosahedron as a **mound**. alpine.ts has no entry |
| `qa/pockets.mjs:16` | must be invoked with an explicit world | Powder is absent and so is world 6 |
| `qa/iapdoc.mjs:118-126` | see 10.6 | **push profile, fails first** |
| **`qa/rigexposure.mjs:22`** | the id | the probe §1 cites for *"table == renderer"* has a five-world default **and is in no gate** |
| **`qa/variety.mjs:41`**, **`qa/skypop.mjs:47`**, **`qa/spaceshot.mjs:19`**, **`qa/faceparity.mjs:58`**, **`qa/lookbook.mjs:22`**, **`qa/glosscov.mjs:24`** (4-world), **`qa/bookshot.mjs:53`**, **`qa/heap.mjs:23`**, **`qa/shading.mjs:20`**, **`qa/artaudit.mjs:16`** (all 4-world) | the id | each prints a clean verdict with world 6 unexamined |
| **`qa/moverbands.mjs:22`** | edit the literal in the for-loop — **no argv override** | the owner's "item lag" number is never taken on world 6 |
| **`qa/groundgrain.mjs:126`**, **`qa/grounding.mjs:135`** | **pass the world explicitly** | they default to `'powder'` and print a clean verdict about Powder Pass |
| **`qa/crowdface.mjs:16`** | pass the world | world 6's crowd is never photographed |
| **`qa/lookpair.mjs:150`** | a hand-surveyed `SPOTS` row (off the new surface, inside the hero district — cf. the powder entry's reasoning) | refuses at :243-245; blocks every paired look measurement |
| **`qa/lookbook.mjs:57` and :63** | unpin `personsheet 'maple'` and `_dumpbake 'maple'` | **world 6's ground bake never reaches the studio pack** |
| **`qa/gate.mjs:123`** (`evolveonce … 'maple'`) and **:99** (faceparity `pirate, powder`) | re-point or add a world-6 run | the evolve moment and the fast face pass are verified on world 6 by nothing |

**10.3 — The `voidUnlocked` seed string.** `localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder,<w6>')` — a **COMMA-JOINED STRING, not JSON** (unlocks.ts:38-43; qa/snowyaw.mjs:16 carries the trap in its header). **75 files contain the five-world literal.** Seventeen are gate-invoked: switch.mjs:35, questable.mjs:63, traverse.mjs:44, vary.mjs:47, econ.mjs:41 and :74, faceparity.mjs:125, **pickerfit.mjs:79 and :80** (:80 is a *second* five-world literal clearing `voidBest_` — miss it and `.wBest` renders a stale string against bar K), evolveonce.mjs:49, purpose.mjs:58, firstframe.mjs:137, juice.mjs:30, aftermatch.mjs:42, uisystem.mjs:25, postpipe.mjs:42, newsfeed.mjs:45, newsarc.mjs:93. **`qa/lockedcards.mjs:59` is the deliberate exception** — do not change it.

*If skipped:* the card is locked, the probe taps a card that **refuses by design** (prototype3d.ts:5990-6006) and hangs to SIGKILL; the gate reports `timed out after 420s — load 3.2 on 4 core(s)`, **which reads as "the machine was busy" and is the most misleadable red in the system.** GOVERNOR.md:529-535: the governor wrote this seed as `JSON.stringify([...])` into eight files, nothing matched, **Maple looked fine throughout because `read()` force-adds it**, and three screenshot runs were spent on the wrong hypothesis. *"The world that always works is the world that hides the bug."*

**10.4 — `qa/placement.mjs` — the two gaps.** (a) `worldData(wid)` :125-160 has **no default and no throw** → C1. Powder's branch :150-158 is the model: two polylines (GRIT as `road`, PISTE as `piste` so gates and pylons are info) and two ellipses, LAKE tagged `ice: true` with the reason in place. **Any walkable-by-design surface needs the same explicit classification or every prop on it fails.** (b) It is in no gate (C2). It already sets its own exit code (:465), so `verdict: exitCode` is the right rule. **Registering it with world 6's numbers as the bar is the single highest-value item on this list, and it must happen before world 6 exists** — otherwise there is no failing run to point at.

**What placement does NOT catch** (do not mistake a green for a clean world): movers excluded outright (:192) — every person, car and animal unaudited; only `__edibles` read; props with no geometry under `GROUND_H = 1.0` get **only** the float check (:255) — awnings, hanging signs and banners get no road/water/offisland/inside/overlap check; `userData.spin` props are excluded from `solid` (:231) so **tree-through-tree is info, never a fail — the owner's literal words were "trees on roads"**; `door` requires **both** `qk === 'house'` and a child Group scaled exactly (1.2, 1.3) (island.ts:3719's `makeHouse` signature), so **the door category is structurally dead on Powder and reports 0 with no warning**; the bench fingerprint is a hardcoded geometry signature (:220); door-facing is Maple-only (:341); `float`/`sunk` are measured against y=0 so **any terrain elevation breaks both**; no SEED by default; and **nothing measures density, spacing, rhythm, repetition or composition.** GOVERNOR.md:656-658: *"The pixels found it; no counter could… It took a cinematographer looking at the first frame and asking where the hotel was."* **Photographs (`--shots`) are not optional evidence.**

**10.5 — Measure the world a child plays.** Every placement number after `__validateWorld()` (prototype3d.ts:6425, `settleFootprints()` :6514 behind the `_validated` latch :6185/:6585, prints its own line :6584). The crew's after-table read *"Maple: inside 184 → 186"* — apparently no change — for a patch that **retires 278 props on Maple at match start.** *Unbudgeted cost: the settle hitch is Maple 253 ms / Game Day 87 ms at match start; moving it to the loading screen is still OWED and a sixth world adds to it.*

**10.6 — `qa/iapdoc.mjs`** parses `WORLD_ORDER` out of unlocks.ts and `\*\*(zero|…|seven) worlds\*\*` out of APPSTORE.md and compares numerically (:118-126). **APPSTORE.md:327** must become `**six worlds** — … and <NAME>`, and :51-53's music file list must gain the slot. Push profile, **blocks first**. *"This said 'two worlds', then 'four worlds', each time a world late… this block is pasted straight into App Store Connect and it was selling a fifth of the game to nobody."* It also asserts every `` `public/...` `` path named in APPSTORE.md exists.

**10.7 — The screenshot pipeline.** `scripts/shoot-store.mjs:239` (the seed) and :74-77 (`EXPECTED`, eight filenames). `docs/CREWS-ROUND-1B.md:154` calls :239 *"the most expensive missing line in the repo"* — a locked card under the tap, two 400s `waitForFunction` timeouts, **after the purge block has already emptied store/ into .previous/.** The shoot purges before it captures. A mixed `store/` folder is Guideline 2.3.3, what the previous submission was rejected for. *(Whether world 6 earns a shot is open: the eight shots cover 3 of 5 worlds.)*

**10.8 — `scripts/safety-scan.mjs`** walks the whole src tree, so world 6 is covered automatically — but the rule bites hardest here: zero matches of the thirteen BAD patterns (:39-53) in non-comment code, and **zero `\bholes?\b` inside any string literal** except the two sanctioned gags (:75-78). Push profile, exitCode. **A new newsroom is 250+ new lines reaching for synonyms; "hole" is the obvious one.** The sanction is for the JOKE, not the file — rewording a sanctioned line fails again on purpose.

**10.9 — The inverse sweep, done once, before the build.** `grep -rn "'powder'" qa/ scripts/` and `grep -rln "maple,pirate,gameday,lantern" qa/ scripts/`. GOVERNOR ledger #9: `npm run safety` was green while blind to **135 of 146 files**. The lists in 10.2 and 10.3 are a large sample, **not the sweep.**

---

## PHASE 11 — Where Powder is the wrong template

| # | What Powder did not do | Anchor | Copy instead |
|---|---|---|---|
| 1 | **No `OUTFIT` keys** — its whole crowd wears `OUTFIT.cozy` | life.ts:892, :951-953 | Lantern or Game Day |
| 2 | **Flee-line dispatch B unwired** — every fleeing skier shouts `PANIC.generic` | life.ts:2745-2747 | Lantern's arm, then your own |
| 3 | **No `matchBeat()` branch** — Maple's town band answers the avalanche | audio3d.ts:4008 | Lantern :3995-4006 |
| 4 | **Zero sticker art on disk, zero CREDITS rows, zero seasonal stickers for a season it has** | stickers.ts:241, :341-344; seasons.ts:68; stickers/CREDITS.txt | any of the first four |
| 5 | **Missing from qa/music.mjs and qa/smoke.mjs's regex; 22 react lines against 27; 4 landmark lines against 7** | qa/music.mjs:22, qa/smoke.mjs:38, newsroom_react.ts | Maple or Pirate for the paper |
| 6 | **No second per-world life.ts pass** — no staged vignettes | life.ts:4587 (gameday), :4513 (pirate), :4692 (maple) | Game Day |
| 7 | **A season with a prop that falls through to the moon lantern** | prototype3d.ts:1636 | write the branch |
| 8 | **Half the integration surface of the world before it** | — | — |

**The completeness test.** `docs/AAA-BRIEF.md:777` §5.6: *"`grep -rn "<newworld>" src/ index.html qa/*.mjs \| grep -v ^qa/_ \| wc -l` is within ~15% of lantern's 260"*, and *"Every dispatch site you touched is an exhaustive table, not a ternary with a silent maple fallback."* **Measured now: lantern 394, powder 195.** Powder carries roughly half, against a ±15% bar. **World 6's target is ~335-455.** That one command is the cheapest check available.

---

## §12 — THE NUMERIC BARS

**Read the "runs where" column first: nine of these bars have no gate step (C3), and one probe defaults to measuring Powder (C7).**

| Bar | Number | Probe / anchor | Runs where |
|---|---|---|---|
| **A. Containment** | ≥97% of walkable cells reachable from spawn at each of r ∈ {1,4,8,16,27} through `window.__solidAt` | qa/traverse.mjs:31, :92; **author against `coastMargin` prototype3d.ts:650 — 6.4 3D units through any neck** | live |
| **B. Purpose** | `travellerPct ≥ 0.33` **and** `driftMedian ≥ 0.30` over 30 match-seconds | qa/purpose.mjs:176; journey = leave by 15u, hold inside 3u for 1.5s (:84); drift only on people the void never came within 45u of | push+live+quality |
| **C. Placement** | after `__validateWorld()`: **inside ≤3, road ≤1, water 0, roadend 0, door 0** | `SEED=7 node qa/placement.mjs <w6> <port> --json= --shots=`; table `docs/crews/round-5/placement.proposal.md:132-143`. Tolerances ROAD_LIP 0.25, FLOAT_TOL 0.30, SUNK_TOL 0.60, OVERLAP_TOL 0.35, DOOR_CLEAR 1.6, BENCH_NEAR 10, DECK_BAND 3.5. Pre-sweep: Maple 189 inside solids, Pirate 109 road hits, Lantern 355 on the canal, Powder 951 overlaps and 612 on the ice | **NO GATE** |
| **D. Hero occlusion** | ≤8% of the hero hidden on the opening frame | qa/hero.mjs:115-119 — **a spawn constraint, decided before any prop is placed** | live+art |
| **E. Smoke** | 0 same-origin asset failures, radius strictly grows, **≥20 props eaten in 25 match-seconds**, `window.__audio` non-null, 0 console errors | qa/smoke.mjs:157-163; the eat filter skips `e.radius > vs.r * 0.92`, so twenty props must be **smaller than the starting void** within reach of spawn | live (maple only on push) |
| **F. Postpipe** | \|Δsat\| ≤ 0.02, \|Δval\| ≤ 0.02, frame mean \|ΔRGB\| ≤ 4/255 (historical wash ~30), hero sat loss ≤ 0.05, `scene.background.mapping` equirect | qa/postpipe.mjs:161-170 | live+art |
| **G. Ground grain** | beat Powder's coarse-layer-0 failure: **median 16×16 luminance sd 0.0036 vs gameday's 0.0360**, 51.3% flat tiles vs maple's 13.3% | qa/groundgrain.mjs; GRAIN island.ts:3216. Powder `[0.45,0.16,0.22,7]`. **A low-contrast ground must repeat the texels-per-device-pixel reasoning at the 340-unit clamp, not copy maple's `[0.45,0.08,0.00,9]`** | **NO GATE, and defaults to 'powder' (:126)** |
| **H. Form separation** | every colour CIE76 **ΔE ≥ 6** lit vs shaded under the world's own key; lifts the **minimum reaching ΔE 7** with hue held | qa/formsep.mjs:23-31 | **NO GATE** |
| **I. Albedo** | second channel ≥ **0.08** of the dominant in linear light, for any literal whose largest linear channel > 0.25 | qa/albedo.mjs:15; 22 colours at 1753 sites were under it; Game Day's crimson rendered **84.7% of its red pixels with green and blue at exactly zero**. **Allowlist is keyed to the file** (:58) | push+live+quality |
| **J. Gamut** | ≤ **1.5%** of lit chromatic pixels (dominant ≥128, chroma ≥0.30) may carry a dead channel | qa/gamutzero.mjs:210; maple 9.91% FAIL vs powder 0.76% ok; readings between clean and ~4% are *"unresolved, reshoot"* | **art profile only — blocks no push** |
| **K. Picker contrast** | ≥ **4.5:1** rendered ink contrast (P95 glyph core vs P30 surround, halo included) over 95% of pixels behind each line; `.wBest` **exactly one line** | qa/pickerfit.mjs:68, :190, :253-276. **Fix the type treatment; never the poster, which is APPROVED.** Measured at one viewport (:72) — **shoot 375-440px widths by hand** | push+live+art |
| **L. Locked card** | worst-pair CIE Lab **ΔE ≥ 10** across the top 58% under `saturate(0.28) brightness(0.62)`; pair count 3 → 6 | qa/lockedcards.mjs:39, :128-134. *"the snow world goes from 40% bright pixels to 0.8%"* — **a pale or monochrome world 6 is the highest-risk shape** | push+live+art |
| **M. Newsstyle (line)** | ≤78 chars at worst-case fill ({M}=22, {F}=14, {D}=longest DIST_NAME, {P}{R}{S}=2); tokens only `[DMFPRS]`; opens with a capital or token; ≤1 `?`; no `?!`/`!?`/`…`/em dash; tier 0 **zero** `!`, tier 1 ≤1, tier 2 `!!` or none but **never a lone `!`**, never more than two; `{S}` tier 2 only; no article before `{D}` | qa/newsstyle.mjs:129-151; pass rule `/^clean$/m` | push+live |
| **N. Newsstyle (corpus)** | ≤45% exactly-two-sentence, ≥35% one-sentence, ≥2 question marks | :157-159. **57% of Maple's lines were exactly two sentences, LIVE ran to 71%, and in ~1,500 lines across four worlds there was not ONE question mark.** Powder 51/42/6% — the tightest margin of the five | push+live |
| **O. React pool** | ≥20 literals (floor); **ship 27**; `{X}` at SUBJECT_MAX 34 and `{F}` 14 against 78 | newsstyle :185-186, :193; newsroom_react.ts:71 | push+live |
| **P. Newsfeed** | over 26 cards at SEED=7: **0** repeated headlines, longest same-opening-word run **≤3**, **0** unfilled `{[A-Z]}` | qa/newsfeed.mjs:108, rungs `[0.9,0.9,1.4,2.2,3.2,4.4,6.0,8.0,11.0]` | push+live |
| **Q. Newsarc** | ≥12 cards; phases[0] and [1] both 0; never decreasing; never `> prev+1`; phase 3 reached; all of 0-3 appear; ≥2 brand chips; no VOIDWORDS in a morning card; no 💬, no rival name; 14 texts distinct; visible on 430×932 with painted text matching the log's first 24 chars; a sticker prop eatable **by the player** at r ≤ 5.4 with a reactive line naming it within 3 cards; after PLAY AGAIN phase 0 / cards 0 / high 0 | qa/newsarc.mjs:264-489 | live |
| **R. Questable** | **365/365** day-seeds clearable. Supply counted as the eat handler scores it: `r<1`→snack, `r≥6`→big, `gild`, `2.6≤r≤3.4`→cabana, `qk`→that tag, `qk ∈ houseLike`→also house | qa/questable.mjs:38, :74-140. *"THIS BUG HAS SHIPPED THREE TIMES."* **Either tag buildings with a `qk` in `houseLike`, or place ≥3 props of radius ≥6, or both — at placement time** | live |
| **S. Vary** | match 0's middle pair == BASELINE exactly; matches 1 and 2 each change **both** slots; if hours >1 the hour changes between match 0 and 1 **and `sunI`/`sunHex` change with it**; if hours ==1 no match deals a non-zero hour; opener and finale titles never move | qa/vary.mjs:82-104 → **≥3 middle-slot alternatives and ≥2 hours with distinct key-light colours** | live |
| **T. Roundlod** | total sphere spend `Σ 2·W·(H−1)` ≤ **39,018** (:60); low-tess (`W<10 && H<10`) call count ≤ **154** (:49); every new round thing ≥10 on at least one axis | qa/roundlod.mjs:62 scans **all of `src/proto3d`** — **CORRECTED: the KIT is where this breaks** (alpine 25 SphereGeometry lines, luxe 65, tailgate 33, nightmarket 16, life 33, island 37, bay 0). One new 14×10 sphere adds 252 | push+live+art |
| **U. Track profile** | head silence at −40 dB ≤60 ms; integrated **−16 LUFS ±1.0 LU**; true peak ≤ −1.0 dBTP; tail silence ≤0.2 s (*"a hole at every loop seam"*) | qa/trackprofile.mjs:42, :142-145 — **SKIPS and counts as a pass when ffmpeg is absent** | live, optional |
| **V. Front-facing yaw** | every front-bearing class inside the camera arc: `CEN = −π/4`, `HALF = π/3`; `MIN_N = 8`; `MAX_BUCKET = 0.25` anti-drill | qa/snowyaw.mjs:24 — **9 of 15 snowmen outside the arc before, 0 of 91 after.** World 6's equivalent (stalls, shopfronts, benches) **has no probe and needs one written before the world is judged** | **NO GATE** |
| **W. Landmark survival** | N of N r≥7 props survive the boot passes | qa/_bigprops.mjs, qa/_heroprop.mjs — Pirate lost 7 of 13 | manual |
| **X. WORLD_PAR** | ≈0.75 of a measured child-driver mean; child wins **70-75%** | `node qa/ab.mjs 5 <w6> child`. **Measure twice**, and after any eat-ratio modifier lands (F2) | manual |
| **Y. Prop budget** | ≤ **~140 parts** per factory; ≤ **450 MB** JS heap worst world | alpine.ts:13; `docs/AAA-BRIEF.md:893-902` (*"nothing in this brief may raise a world's peak"*). **No probe counts parts**; `qa/heap.mjs:23` is a four-world list in no gate | **NO GATE** |
| **Z. Integration surface** | within ~15% of lantern's **394** | `docs/AAA-BRIEF.md:777` §5.6 | manual |
| **AA. Crowd speed** | `paceMul` **< 2.4** strictly; `leg` **≥ ~18** | life.ts:348-350; qa/purpose.mjs:84 | via B |
| **AB. Gloss coverage** | strong-gloss fraction must not fall when world 6's colours land (GOLD/FAIR_C precedent: 27.1% → 17.9%) | qa/glosscov.mjs:24 (**four-world list**), qa/glossgap.mjs | **NO GATE** |
| **AC. Rig exposure** | WORLD_LIGHT row == what the renderer applies | qa/rigexposure.mjs:22 (five-world default). **Note `hemiI` is exempt by design — it is inert (D9)** | **NO GATE** |
| **AD. Mover bands** | world 6's loop movers in the visible half-rate band, against the owner's *"item lag"* complaint | qa/moverbands.mjs:22 — **literal in the for-loop, no argv override**; decide `crowdGate` (F5) | **NO GATE** |

---

## §13 — HOW TO MEASURE (rules that have cost instruments)

**13.1 — Never render your own frame.** `three@0.185.1` forces `NoToneMapping` into a `WebGLRenderTarget` (`docs/FABLE-LAUNCH-BRIEF.md:185-188`; prototype3d.ts:181, :1124; headers of grounding.mjs:20-21, groundgrain.mjs:30-31, ringmeaning.mjs:79-80, firstframe.mjs:21). **Six instruments lost:** `_zgrade` modelled a tone curve replaced hours earlier; `_headcover` reported 28.8% bare scalp after the hair was raised; `_distinct` could not see a CSS change; `skypop` read a stale composited frame (`preserveDrawingBuffer` false) and measured 0/765 against a true 484/765. **Every look claim on world 6 comes from a screenshot of the page canvas.**

**13.2 — Use the match clock, not wall time.** Sample on `window.__matchState().t`. `_clockrate` measures ~14×; the launch brief (:189-190) widens it to **14-40× under swiftshader.** `qa/bubbleclear.mjs` reported *"bubbles up 0% of frames"* in three worlds — **a PASS on no data**; `faceparity` then flaked the gate on the identical fault, in a file whose own header described it. Wall-clock animation must be checked **from the DOM** and called unphotographable (the title card's 4.2s fade reads opacity 0 in every sampled frame; its duration is checked against `introLen`).

**13.3 — Pre-register the ruling, then take the number.** GOVERNOR.md:631-634, :713-716: *"A bar registered before the measurement is the bar that gets to fail you."* The rung-3 kill gate died at −10.2% and −20.7% *"with nothing to argue about; a gate written after seeing 10% would have found a reason for 10%"*; the newsroom's opener bar, registered in advance, failed **Game Day** — a world that stream had never touched — so the bar stood and the game changed.

**13.4 — Pair the runs, not just the builds.** Same probe, same SEED, same length, on a before build **verified to lack the feature.** `qa/lookpair.mjs` is *"the only way two builds of a non-Maple world are comparable"* (`docs/FABLE-LAUNCH-BRIEF.md:196-197`) — **and it needs a world-6 `SPOTS` row first (C11).** Three recorded failures: a "before" measured on a commit that already contained the errand; before-feeds of 20 cards against an after of 26, read as *"the ticker STALLING on six draws"*, a phenomenon that never happened; and e0f7e13's *"rendered worst 26.3"* with **no run behind it anywhere in docs/.**

**13.5 — Hide the family and match prop counts on every look-pair.** `HIDE_RIVALS=1`; re-shoot any pair whose printed prop counts differ. Noise floor of one build, three shots: **K 128/128/128, Y05 34/34/35.** Lantern's first pair read −6% on a rung that cannot darken anything (NIBBLES and his red ring were in the before frame); Maple's after read +3.9%, traced by `_pxdiff` to **a rival eating a tree before the shutter** (78 → 76 props).

**13.6 — Every number names the command that produced it.** GOVERNOR.md:30-39, :496-511, :625-628, :717-720. JSON in `docs/crews/<round>/*-data/`; keep confounded runs **beside** the clean ones. Building `qa/blackprops.mjs` the governor wrote a measurement into the header and set the bar from it — **the measurement had never been taken; when it was, it came out exactly backwards** (0.0009/0.0023 against 0.0157), and the invented bar passed both holes he had already cropped and looked at. Also: the newsroom apply script printed *"kept 208, cut 8, fixed 6"* while five of the six "fixes" had **deleted the condemned line and inserted nothing.** **A probe column that contradicts the picture is retracted, not explained.**

**13.7 — An invisibility claim must state its radius range and whether it holds during the intro.** Camera follow runs **26-340 units**, not the 40 a crew assumed; the establishing shot's optical axis swings **45° in 3.5 s**; at the opening beat the top of the Lantern frame sits **4.2° above the horizon.** Three failures: 1,500 authored stars **never once on screen**; planets at 640-900 units clipped by a far plane of 1000; a proposal to cheapen the Maple balloon on a frustum claim from one assumed distance. The false horizon premise was stated in island.ts:707, island.ts:772 **and** docs/OWNER-2026-08-25.md. **A premise repeated in three files is not thereby true.**

**13.8 — A header that describes a gap as a design will be believed.** GOVERNOR.md:728-730. Lantern and Powder shipped as the only worlds with no per-meal and no LIVE pool — 237 and 229 lines against 487-558, **only three pools ever reaching air** — and both headers said *"This world has no LIVE pool and no per-meal pools … keep them."* Everyone read intent. **Record what is missing as missing.**

**13.9 — A probe that has not run in this environment has not run.** GOVERNOR.md:725-728. Fifteen of the instruments this contract cites are in no gate profile and in no npm script (C3). **"Green" only counts for the steps that executed** — print the step list and check it against §12's "runs where" column.

**13.10 — Measure the screen the owner holds.** GOVERNOR.md:661-665: every splash line passed at 430×932 and 440×956 and **failed at 440×814, 430×740, 393×700 and 375×667** — which is why the splash step sweeps six viewports (gate.mjs:176-178) and why bar K's single viewport (pickerfit.mjs:72) is not enough for a sixth card in an auto-fit grid.

**13.11 — Commit the moment it typechecks.** Containers live ~35 minutes when a crew is probing (GOVERNOR.md:618-620); the remote branch is the only durable copy. No probe can enforce this; it cost four killed agents in the placement lane alone.

---

## §14 — DISAGREEMENTS, DISPUTED CLAIMS, AND WHAT IS UNKNOWN

**Resolved disagreements**

1. **Is Powder the template?** Kit and land readers say yes; crowd, paper and mistakes readers name eight places it is the worst (§11). **Resolution: Powder at HEAD for land and kit; Lantern/Game Day/Maple/Pirate for OUTFIT, panic dispatch B, matchBeat, stickers, the newsroom and the staged-vignette pass.**
2. **`MID_POOL` length 4.** `PAIRS = [[0,1],[2,3],[3,0],[1,2]]` verified at matchdeck.ts:48 with the comment confirming intent. **The failure mode (a spread of `undefined` producing a beat with no `mult`) follows from JS semantics but is unverified on the live build. Worth a probe rather than trust.**
3. **`inLagoon3` and the waterfall.** `inLagoon3` re-verified as unguarded and unconditionally called. **The rasterised areas carry the reader's caveat — raw control points, 10-unit grid, never visually confirmed. Leads to photograph, not settled defects.**
4. **`jingle()`.** No caller of `audio.jingle()` was found in prototype3d.ts — it may be dormant. It is a published method on the interface (:49) and all four prior worlds opted out, so the omission is a latent inconsistency, not an audible bug today.
5. **`SKIES[WORLD_ID] ?? []`** — dead defensiveness *while* the Record stays exhaustive. Both readers right.
6. **District pattern is a genuine open choice** — Record (prototype3d.ts:4228, :4239) vs whitelist array (:55-57) vs cast (:4183). The two newest worlds chose the whitelist; a weak signal. **NEW CONSTRAINT: the Record pattern also obliges a third `distOf` arm at :1551 (A12).** That tilts the choice toward the whitelist.
7. **`MatchBeat.news`** — verified read nowhere. Six strings must be written that will never air. Do not spend time on them.
8. **Line numbers** — readers cite the same call sites ±5 lines. Re-resolve by symbol.

**DISPUTED — kept, with the reason**

- **DISPUTED (partly): "the meal classifier is imported, never re-implemented."** The draft's rule and the consequence it draws (*"World 6's edible display names must contain those substrings or three of four pools never air"*) is **wrong as an absolute**: `gamedayMealKind` (newsroom_gameday.ts:727) re-implements it and is re-exported as `mealKind` (:1297). **Kept as a default, not a law** — importing the shared one is simpler and four of five worlds do it; a world whose nouns are chalet/lodge/gondola should write the classifier, not rename its props.
- **DISPUTED (premise, not conclusion): bar T.** The draft's *"none of bay.ts, gameday.ts, lantern.ts or powder.ts contains a SphereGeometry call — all 36 live in island.ts"* is true of the **land modules** and false as a picture of the ratchet: roundlod scans all of `src/proto3d` and the kits carry 25-65 calls each. **The conclusion ("build from existing factories") survives; the reasoning behind it is replaced (§4.13).**
- **DISPUTED (scope): §7.8 "the arc is GLOBAL."** True of the module, false of the driver (F6). Kept, corrected in place.
- **DISPUTED (profile): gamutzero and packfresh as push-profile obligations.** Both are `profiles:['art']` (gate.mjs:190, :194). The edits are still owed; **the claim that they block a push is wrong.**
- **DISPUTED (completeness): §10.2's list and §10.3's seventeen files.** Both verified accurate as far as they go and both **incomplete** — see 10.9. Kept with the sample framing made explicit.
- **DISPUTED (bar K): "a sixth poster reflows by itself."** The CSS claim is verified true (index.html:895-902, no per-world CSS). The **inference** that nothing needs checking is not: a sixth column narrows every card at every width, and the probe measures one viewport (13.10). Kept with the caveat attached.

**Flagged uncertain by the reader who found it**

- **The `* 1.10` inside `inHero`/`inBathhouse`** (powder.ts:91, lantern.ts:86) is identical in both worlds and **explained in neither.** Do not treat it as tunable without finding out what it pads.
- **`qa/pockets.mjs`'s default list** omits Powder and will omit world 6. Whether Powder is swept there by another route needs confirming with whoever owns the gate.
- **`prototype3d.ts:1452-1454`'s hero centre** is a hand-copy with a comment naming the source. Whether it was meant to be synced or imported is unknown.
- **Region `name`/`density`** — verified dead to the runtime. powder.ts:220-222 says the catch-all *"gets a real entry here because the newsroom needs a poly and a name for it"*; **the newsroom could not be found reading it, so that sentence is aspirational.** Ship both.
- **`skyTex`** (island.ts:71, returned untinted at :3655) has no consumer found in prototype3d.ts — apparently dead, but if anything uses it as the IBL, every world shares one environment.
- **`WORLD` (palette.ts:50) has no per-world variants.** `WORLD.cliff` (island.ts:3403), the underside cap `0x1c1636` (:3406), the base grass (:1063) and the violet halo (:1025-1027) are global. **World 6 cannot change its cliff colour without changing all five shipped worlds.** Bug or house style, undetermined.
- **`src/game/audio.ts`** (1,580 lines) is believed legacy 2D and not in the shipping build (index.html:2124 loads only `/src/prototype3d.ts`). **High-confidence, not proven.**
- **Twelve stickers per world** — all five ship twelve, nothing enforces it; seasonal sets ship four. Rule or convention unknown.
- **`gate.mjs:99`** pins the fast `faceparity` pair to `pirate, powder` as *"the measured best and worst."* If world 6 becomes the new worst, re-measure.
- **The ERR constants** (life.ts:351-357) are global; no per-world override found.
- **`fear` and `radius`** are per-call-site with no stated rule (fear 16 on lantern/powder, 18-24 elsewhere; radius 2.4 adult / 1.9 kid). Only guidance is the ring warning at life.ts:4226-4238.
- **The `kid` proportion** is per-world authorial (powder 0.45, lantern 0.2). No rule, no bar.
- **`tension()`'s 0.42/0.74 act thresholds** on a world with a different match length — not traced.
- **Stale docs that will mislead you:** `docs/AAA-BRIEF.md:1096` says powder.mp3 does not exist by design — **it does** (3,585,296 bytes, 1cf275b). `public/assets/music/README.md` and `docs/AUDIO-SOURCING.md` list only four world slots and call theme.mp3 "the menu", which audio3d.ts:3785-3787 retracts. The :739 contract table's line numbers have all drifted.
- **Reader coverage, stated:** island.ts is 7,487 lines, read at every `WORLD_ID` site (52), not linearly — *"there may be world-shaped assumptions buried in code that never mentions WORLD_ID (the waterfall and the lagoon are exactly that shape)"* — and the critique round found four more of exactly that shape in prototype3d.ts (:1551, :1636, :8943, :9289). traverse/faceparity/postpipe/questable were read only at their world-list and failure lines. **No reader ran the game or any probe.**

---

## §15 — THE STRUCTURAL FIXES WORTH DOING FIRST

Four readers arrived at it independently and `docs/AAA-BRIEF.md:783` already asks: **convert the silent dispatch sites into exhaustive tables.** `spawn3()`, `silPoly()`, `insideIslandWorld()`, `biomeAt()`, `inWater3()`, `inDeepWater3()` are all chains falling through to Maple. `setWorld()` shows the pattern and its comment says why (island.ts:152-155). **The same edit four to six times converts six silent failures into six compile errors.**

Two more for about two characters each: retyping **`WORLD_PAR`** and **`WORLD_NAMES`** from `Record<string, …>` to `Record<WorldId, …>` converts the two worst silent runtime failures — a leaderboard that never says anything true, and a title card reading the literal word `undefined`.

Three added by this round:
- **`makeSeasonProp`'s `ev.id` chain (prototype3d.ts:1613-1645) → a `Record<string, () => Object3D>` or an explicit throw.** It is shipping a live bug on Powder today (A11).
- **`placeStickers`' `distOf` (:1550-1552) → the same table the newsroom uses.** Three copies of one translation is how the third gets forgotten.
- **Register `qa/placement.mjs` in the gate with `verdict: exitCode`, and give `worldData()` a `throw` default (C1/C2)** — before world 6 exists, so there is a failing run to point at.

Do these **for world 7's sake.** World 6 can be built carefully against this document; world 7 will be built by someone who has not read it.

---

## §16 — WHAT WOULD MAKE WORLD 6 EXCEPTIONAL RATHER THAN COMPLETE

A contract defines complete. Everything above, done perfectly, produces a world that is fully wired and indistinguishable in kind from the five that ship. What separates the newest world from the older ones, and what round 5 learned about what actually reads as quality, is smaller and more specific than the checklist.

**1. Powder's real advance was that its kit argued from a photograph, not from a rule.** Every older kit says "chunky silhouettes, flat shading." alpine.ts says *"a village with dark windows on a snow day reads abandoned"* (:36-44), *"grey snow reads as slush, and a valley of slush is a washed-out valley"* (:26-34), *"a faceted drift reads as a rock, and the one thing a drift must never do is look like it would hurt to slide into"* (:432-445). Each is a named failure with a named fix. **World 6's kit header should be readable as a critique of a picture nobody has taken yet.** That is what makes the next contributor's copy of it any good.

**2. One number moves; the character keeps its hat.** The topper-snowman fix (§4.6) is the round-5 template for every art note: the eyes reached the camera in 54% of drops against 68% for the bobble, traced to a brim r 0.36 over a head r 0.32, **moved to 0.30** — and the proposed fix of deleting both hat branches was **rejected** because it cut accent pixels 79% on half the population. Exceptional worlds are made of measured single-number changes that preserve character. Complete worlds are made of deletions that fix a metric.

**3. Give the world a verb, and pay for it in all four places.** Powder is the only world that changes how the game plays: `onIce` → `onIce3` → **`iceK` at prototype3d.ts:8943** → the snow shell's `eatRatioNow` multiplier at :5140 → three loading tips (:5705-5709) → a first-time in-world announce (:5167-5175). That is a five-file chain for one idea. Four of the five worlds have no verb at all. **A world 6 that adds one and wires the whole chain is the only kind of sixth world that is not a re-skin.**

**4. Make the finale come to the player.** Powder's AVALANCHE (`cue: 'avalanche'`) is the only finale in the game where the food arrives rather than waiting. The other four worlds' set-pieces are a place the child drives to. **The cue string is a contract with life.ts and island.ts and it is the cheapest place in the whole build to be genuinely novel.**

**5. Author the second life.ts pass Powder skipped.** Game Day's six staged vignettes (life.ts:4587-4600, with `addGD` and its own dress Record) are the difference between a crowd and a town. Powder has scattered cast and no scenes, and that is why it reads thinner than Lantern at a third of the head count. **Head count is not the lever; staged moments are.**

**6. Ship the ladder at both ends, and know what it does to the paper.** nightmarket's census (`0-1: 2509 … 11: 1`) and Powder's hoover economy (843 edibles, mean scores in the low thousands) are the same lesson from opposite ends. **And the count sets the newsroom's pacing (F6)** — so the size ladder is simultaneously an art decision, an economy decision and a writing decision. No other world has been designed with all three held at once.

**7. Write the paper's district lines like they are the reason the file exists.** `T0/T1/T2_BY_DIST` is **metered by nothing** (§7.2) and is *"the whole reason this file is per-district"* (:637-640). The unmetered pools are where the voice lives; the metered ones are where the compliance lives. Powder's best line was found only when newsstyle was finally pointed at it — and it was over-length. **Hand-read the district and MID_REACT pools at 78 characters, out loud, in order.**

**8. Take the numbers nobody will take for you.** Nine of §12's bars have no gate step. Bar G defaults to measuring Powder. The studio pack renders five worlds and pins the ground bake to Maple. **Being exceptional here means running `groundgrain`, `formsep`, `variety`, `snowyaw`, `glosscov`, `moverbands`, `crowdface`, `lookpair` and `placement` by hand, with `<w6>` named, and putting the JSON in `docs/crews/<round>/`.** That is roughly an afternoon, and it is the only difference between "the gate is green" and "the world was looked at."

**9. Photograph it before you defend it.** GOVERNOR.md:656-658: *"The pixels found it; no counter could. Five placement audits had run on Pirate and all of them measured what remained. It took a cinematographer looking at the first frame and asking where the hotel was."* **Unpin `qa/lookbook.mjs:57` and :63, dump world 6's own bake and character sheet, and put the pack in front of the eight teams before anyone writes a proposal.**

**10. Do not reach for the two fixes that are already dead.** RoomEnvironment stays (prototype3d.ts:568 — the swap measured 15% darker on Game Day, 0.406 → 0.343); shared-prop roughness stays at 0.85 (GOVERNOR.md:255-281, reverted); the gradient-environment rung died at −10.2%/−20.7%. And **`WORLD_LIGHT.hemiI` is inert** — tuning it and measuring a frame is how a crew credits a number the renderer never reads (D9). **Exceptional means finding a new lever, not re-pulling three that were already pulled and photographed.**


---

## APPENDIX A — COMPILE-ENFORCED OBLIGATIONS (17)

1. WorldId union — src/proto3d/island.ts:59 (the widen that generates the rest)
2. PLANS: Record<WorldId, Biome[][]> — island.ts:155
3. SKY_MOOD: Record<WorldId, …> — island.ts:610 (also crashes at :628 if cast away)
4. SKIES: Record<WorldId, Body[]> — island.ts:866
5. GRAIN: Record<WorldId, [fine,mid,coarse,repeat]> — island.ts:3216
6. biomeColor: Record<Biome, number|null> — island.ts:2071 (the ONLY compile gate that catches new district ids)
7. WORLD_LIGHT: Record<WorldId, WorldLight>, 12 fields, no optionals — prototype3d.ts:734 (note hemiI is inert, D9)
8. HOURS: Record<WorldId, WorldHour[]> — prototype3d.ts:907 (key enforced; index-0 no-op and non-empty are NOT)
9. WORLD_COPY: Record<WorldId, …>, 17 fields — prototype3d.ts:1314
10. MID_POOL: Record<WorldId, MatchBeat[]> — prototype3d.ts:3779 (key enforced; LENGTH 4 is not — D1)
11. book NAMES: Record<WorldId, string> — prototype3d.ts:6241 (also the tab enumerator at :6243)
12. WORLD_LABEL: Record<WorldKey, string> — src/game/unlocks.ts:34
13. BY_WORLD: Record<ReactWorld, WorldReact> — src/proto3d/newsroom_react.ts:334
14. ReactWorld union — newsroom_react.ts:50, compile-coupled to prototype3d.ts:4039 and :4046 which pass a WorldId as ReactIn.world
15. WorldKey unlocks.ts:28, Sticker.world stickers.ts:43, SeasonEvent.world seasons.ts:33 — hand-copied unions; widening is required but each fails only where a Record keys off it
16. Re-export of the eight bay.ts placement primitives from the land module — powder.ts:40-45 (life.ts:4108 and island.ts:5334/5346/5352 call them through it; dropping the re-export fails to compile)
17. XRegion interface fields id/name/poly/density — powder.ts:165 (name and density are verified dead to the runtime but required by the type)

## APPENDIX B — SILENT OBLIGATIONS (61)

Nothing here throws, types, or reds. Every one ships green.

1. A1 silPoly() falls through to MAPLE_SIL — island.ts:339: ground slab, cliff, bake clip, halo and every containment test become Maple's coastline
2. A2 insideIslandWorld() falls through to a ray-cast on SIL_POLY — island.ts:354/:359: visible coast and collidable coast disagree; place() admits props over open space
3. A3 spawn3() falls through to MAPLE_SPAWN [6469,5240] — island.ts:230/:235: the void starts in space; also mis-seeds SPAWN_KEEP_OUT :239 and nearSpawn() :242
4. A4 inWater3 and inDeepWater3 fall through to Maple's POND/RIVER/LAGOON — island.ts:394-420, :436-441: invisible walls on painted ground (Game Day's 39x39 in THE QUAD, 87x66 at the lagoon). Add a guard even with no water
5. A5 biomeAt() falls through to the Maple grid clamp — island.ts:3592/:3610: every point reports a Maple biome, and addWanderer's first line (life.ts:2598) then silently places ZERO people
6. A6 Foliage pool ternary — island.ts:4372 trees, :4830 bushes: Maple's high-summer green
7. A7 Ground bake block missing — island.ts among :1077/:1250/:1520/:1855: featureless flat green slab in Maple's outline, no roads, no districts, no coastline stroke
8. A8 Populate block missing — before island.ts:6569: SILENT AND TOTAL. Maple's nine districts, ~5,782 props, coast fringe, food ring and balloon are built instead
9. A9 W6_BEATS ternary tail is ': MAPLE_BEATS' — prototype3d.ts:3759-3762: Maple's bake sale, dog parade and county fair under world 6's brand
10. A10 Ten (fourteen) audio dispatch points fall through to Maple — audio3d.ts §9; matchBeat has NO powder branch today, so Maple's town band answers the avalanche (:4008 vs Lantern :3995-4006)
11. A11 LIVE BUG: makeSeasonProp's ev.id chain has no default — prototype3d.ts:1613/:1620/:1629/:1636 else: 'snowday' matches nothing, so Powder's SNOW DAY scatters 44 Lantern moon lanterns every December (scatterSeasonProps :1646-1663)
12. A12 placeStickers has its OWN district translation — prototype3d.ts:1550-1552 (MAPLE_DIST/GAMEDAY_DIST, tail 'return b'): a world 6 on the Record district pattern loses all twelve stickers to 'if (!put) continue' (:1578) without a word
13. A13 wet() crowd water guard is maple-only — life.ts:2596: 62 townsfolk stood in interior water for a whole match
14. B1 WORLD_NAMES is Record<string,…> — prototype3d.ts:347: tab reads 'WORLD ENDER · undefined' and the title card prints the literal word undefined over the establishing shot (:1472, :1474)
15. B2 WORLD_PAR is Record<string,number> — prototype3d.ts:548: rivals fall to the legacy scale-invariant ladder (rivals.ts:732-775); the field froze at 76,000 against a 300,000 player run
16. B3 MED_BY_WORLD / HARD_BY_WORLD are Record<string,string[]> with explicit maple fallbacks — prototype3d.ts:3510/:3517/:3524-3525: dead quest chips, shipped three times
17. B4 MID_REACT is Record<string,string[]> — newsroom_react.ts:377: reactLine falls back at :456 to the shipped beat's reaction, so the hot-chocolate beat fires and the ticker reports the frozen lake
18. B5 CARD_ART / CARD_FALLBACK are Record<string,string> — prototype3d.ts:5878/:5922: paintWorldCard returns early and the picker shows an empty rectangle with a title under it
19. C1 qa/placement.mjs worldData() is five ifs with no default and no throw — :125-160: an unbranched world prints 'road 0 ok / roadend 0 ok' and PASSES; a tree in world 6's main street is invisible
20. C2 qa/placement.mjs is in no gate profile — verified grep -c placement qa/gate.mjs -> 0
21. C3 FIFTEEN probes are in no gate profile AND no package.json script — verified zero hits in both files for: formsep, groundgrain, glossgap, glosscov, variety, snowyaw, music, pockets, lookpair, placement, rigexposure, lookbook, crowdface, moverbands, blackprops. Bars G, H, V, AB, AC, AD and Y therefore run only when someone remembers
22. C4 There are FOUR gate profiles, not two — gate.mjs:43 defaults to 'live'; gamutzero (:190) and packfresh (:194) are art-only, edgespeed (:165), ringmeaning (:184) and rivalnotice (:186) are quality-only. Bar J blocks no push
23. C5 Hardcoded five-world default lists that print a clean verdict with world 6 unexamined: lookbook.mjs:22, rigexposure.mjs:22, variety.mjs:41, skypop.mjs:47, spaceshot.mjs:19, faceparity.mjs:58, pickerfit.mjs:79 AND :80. Four-world lists (Powder already invisible): glosscov.mjs:24, bookshot.mjs:53, heap.mjs:23, shading.mjs:20, artaudit.mjs:16
24. C6 qa/moverbands.mjs:22 has its world list inside the for-loop with no argv override — the census for the owner's 'item lag' complaint cannot be pointed at world 6 at all
25. C7 qa/groundgrain.mjs:126 and qa/grounding.mjs:135 default to the string 'powder' — run with just a port they print a clean verdict about Powder Pass while world 6 goes unmeasured
26. C8 qa/crowdface.mjs:16 defaults to 'maple' and is in no gate — world 6's crowd is never photographed (and personsheet rejects bodies above r1.6 while every adult is 2.4)
27. C9 qa/lookbook.mjs pins two shots to maple — :57 personsheet, :63 _dumpbake: world 6's 3072px ground bake (all of Phase 5.1 and bar G) is structurally absent from the pack the eight studio teams review, against STUDIO.md rule 1
28. C10 Gate steps pinned to literals no WORLDS entry widens — evolveonce 'maple' (gate.mjs:123) and fast faceparity 'pirate, powder' (:99): the evolve moment, called the most important in the match loop, is verified on world 6 by nothing
29. C11 qa/lookpair.mjs SPOTS (:150) needs a hand-surveyed world-6 row or it refuses (:243-245) — fails loudly, but blocks every paired look measurement the method requires
30. C12 Push-profile probe edits (§10.2): newsstyle:38-40 prints 'clean' and meters nothing; newsstyle:105 CRASHES rather than fails; newsfeed:31 never reads the sequence; purpose:41 and :58 (missing seed hangs to timeout); smoke:38 MUSIC_SLOT; music.mjs:22; vary:23-31 (two wrong-reason reds); firstframe:32 and :51 HANGS FOREVER on waitT(NaN); skycut:28; gamutzero:208 and :233; packfresh:32; formsep:57/:60-64/:72-76; normals:83-96; pockets:16; iapdoc:118-126
31. C13 qa/pockets.mjs:16 default is gameday,maple,pirate,lantern — Powder is absent and so is world 6; nothing else enforces the null-off-land contract
32. D1 MID_POOL length is not compile-enforced — prototype3d.ts:3779, dealMids :3821-3825, PAIRS matchdeck.ts:48: with 2 or 3 entries the spread of undefined yields a beat with no title, no icon, no col and no mult — blank banner and NaN score multiplier, and it only appears on match 2
33. D2 MatchBeat.news is required and read nowhere — prototype3d.ts:3672, :8624: six strings must be written that will never air
34. D3 A sticker whose biome string does not match distOf() is dropped without a word — stickers.ts:241, prototype3d.ts:1578; four of Maple's twelve failed this way from a sampling-box bug alone
35. D4 Missing qk tags kill the daily quest counters, the newsroom {M}, FIRST CAR, FIRST BUILDING and SHOWOFF's 'that one is big' — island.ts:5344-5353, :5837; Game Day carried none and all four were dead there
36. D5 Missing userData.authored loses landmarks to the settle tie-break — prototype3d.ts:6379-6382: seven of Pirate's thirteen r>=7 props (hotel, fort, lighthouse) were retired the instant a match started
37. D6 HOURS[0] must be a no-op against the WORLD_LIGHT row — prototype3d.ts:895-897: otherwise match 1 of a fresh profile is not lit as tuned
38. D7 leg: 0 by omission roots nobody (life.ts:2620) and paceMul >= 2.4 re-opens the standing-ring bug (life.ts:348-350, :4226-4238) — 45 seconds of a 180-second match with the score frozen
39. D8 'if (!r) continue' in the cast loop is a silent skip — life.ts:4021-4027: 'a quarter of the map, zero spirits, no error'. Game Day throws loudly instead (:4280); prefer that
40. D9 WORLD_LIGHT.hemiI is INERT — iface prototype3d.ts:718, rows :735-824, but RIG.hemiI is a flat 0.22 (:864) read at :934 and :951. Only hemiSky/hemiGround reach the light. A crew tuning a dark or pale world will credit a frame change to a number the renderer never reads
41. E1 No public/assets/music/<w6>.mp3 — audio3d.ts:3721-3726: synth bed forever, and qa/smoke.mjs:38's MUSIC_SLOT regex omits powder today, so a synth-only world 6 fails twice on a correct build
42. E2 No sticker .webp files — prototype3d.ts:6194: onerror silently swaps in a tier glyph; Powder's entire scrapbook page is emoji today
43. E3 No rows in public/assets/stickers/CREDITS.txt — a SECOND provenance ledger (one tab-separated row per .webp) that nothing enforces; twelve rows owed
44. E4 No row in public/assets/music/CREDITS.txt — 'worse than an empty record because an empty record is honest'; a 4+ App Store rights exposure
45. E5 Missing id in index.html:43's boot preload array (a hand-copied duplicate of WORLDS) — the first match starts on the synth bed
46. E6 No poster painting — budget one; Powder reused the FROST PEAKS teaser and CARD_ART carries two keys for one file (:5911, :5916), leftover, not a pattern
47. F1 The surface predicate's real consumer is prototype3d.ts:8943 (iceK feeding the velocity blend at :8944) — hard-coded to Powder's predicate by name with no world-6 arm and no table. Build the island.ts sweep exactly and world 6's ice/mud/sand is painted, walkable, water-exempt and drives identically to grass
48. F2 The shell's second consumer is eatRatioNow at prototype3d.ts:5140 (x1.45) — a new verb that multiplies eating is scoring input to the WORLD_PAR measurement
49. F3 Cars, the train and pond life are hard-gated to Maple — life.ts:2579 (30 : 0), :2407 (ROAD_CENTERS_3D : []), :4474 buildTrain(), :4405 ducks: world 6 ships with zero traffic, a dead FIRST CAR moment, no qk:'car' supply, and a 'cars' quest chip that can never clear
50. F4 life.ts has TWO per-world passes — the build pass (:3155/:3208/:3961/:4049/:4208) and a LATER staged-vignette pass (gameday :4587 with addGD and its own dress Record :4590-4593, pirate :4513, maple :4692). Powder has no second pass, which is part of why it reads thinner
51. F5 The crowd update gate is a per-world knob — prototype3d.ts:9289-9290, doubled for Pirate because open water left nothing occluding the mid-distance and the half-rate band read to the owner as 'item lag'
52. F6 The newsroom arc's pacing IS a prop-count decision — newsroom_arc.ts:80 pctProg from devouredPct, computed as consumed/initialMass at prototype3d.ts:4436 with initialMass = edibles.length at :9948. World 6's edible census sets the phase a child reaches by minute one, the HALF banner (:4440) and every {P}/{R}
53. F7 The corridor rule to author the polygon against is coastMargin — prototype3d.ts:650, tested at eight points by coastSolid (:660): at R>=16 the margin is 3.2, so a TITAN needs 6.4 3D units (128 world units) through any neck. Bar A only measures it afterwards
54. F8 The populate block's loading-bar seams — powder is the ONLY block with interior await breathe() (island.ts:5373, :5411, :5430, :5456, :5520); without them the longest stretch a child waits through returns to one main-thread chunk under a frozen bar (prototype3d.ts:1512-1517, :1530-1533)
55. F9 Unguarded Maple globals that ship into every world — inLagoon3 (island.ts:378, ellipse :265, verified NO world guard, called unconditionally from place() :5298 and prototype3d.ts:6490-6498), WATERFALL (:266, unguarded :3466-3490, animated :3664-3665), FERRIS (:3503, two-way ternary). Bald patches on real land today; rasterised areas carry the reader's caveat
56. F10 The picker tagline has an unstated ~22-character ceiling — index.html:952-956: Lantern shipped a 33-char subtitle and sat visibly higher than Game Day beside it; min-height 2.5em exists so the next one cannot push the title out of the scrim
57. F11 teachDrag is a per-world decision — prototype3d.ts:5633 (firstEver || pickedWorld === 'maple'): the default is correct for a new world, but it is a pickedWorld === site inside the match-start block and belongs in the sweep
58. F12 Four more audio dispatch points than the ten listed — bigEat() audio3d.ts:4129, win() :4191 ('the loudest thing in the match, on purpose'), alert() :4231, ready() :4254 (fired on every news card): the win sting and the alert sting ARE per-world decisions
59. G1 The five-world 'voidUnlocked' comma-joined seed string appears in 75 files, seventeen of them gate-invoked (§10.3) — a miss taps a card that refuses by design (prototype3d.ts:5990-6006) and hangs to SIGKILL, reported as 'timed out after 420s — load 3.2 on 4 core(s)', the most misleadable red in the system
60. G2 What qa/placement.mjs does NOT catch even when green: movers excluded (:192), only __edibles read, sub-GROUND_H props get only the float check (:255), spin-tagged props excluded from solid (:231) so tree-through-tree is info, door requires qk 'house' AND a (1.2,1.3) child Group so the category is dead on Powder, the bench fingerprint is a hardcoded geometry signature (:220), door-facing is maple-only (:341), float/sunk assume y=0, no SEED by default, and nothing measures density, spacing, rhythm, repetition or composition
61. G3 Placement numbers taken before __validateWorld() describe a world that does not survive to the first frame — prototype3d.ts:6425, settleFootprints :6514 behind the _validated latch :6185/:6585; the crew's 'Maple: inside 184 -> 186' was read off a state hiding 278 retired props

## APPENDIX C — THE BARS WORLD 6 MUST CLEAR (30)

1. A. Containment — >=97% of walkable cells reachable from spawn at each of r in {1,4,8,16,27}, flood-filled through window.__solidAt. qa/traverse.mjs:31, :92 (live profile). Author against coastMargin (prototype3d.ts:650): 6.4 3D units of clear land through any neck.
2. B. Purpose — travellerPct >= 0.33 AND driftMedian >= 0.30 over a 30-match-second sample. qa/purpose.mjs:176; journey = leave the last anchor by 15u, hold inside 3u for 1.5s (:84). Push+live+quality. Requires edits at purpose.mjs:41 and :58.
3. C. Placement — after __validateWorld(): inside <=3, road <=1, water 0, roadend 0, door 0. SEED=7 node qa/placement.mjs <w6> <port> --json= --shots=; docs/crews/round-5/placement.proposal.md:132-143. IN NO GATE (verified grep -c placement qa/gate.mjs -> 0) and needs a worldData() branch at :125-160.
4. D. Hero occlusion — <=8% of the hero hidden on the opening frame. qa/hero.mjs:115-119, live+art. A spawn-placement constraint decided before any prop is placed.
5. E. Smoke — 0 same-origin asset failures, radius strictly grows, >=20 props eaten in 25 match-seconds, window.__audio non-null, 0 console errors. qa/smoke.mjs:157-163; the eat filter skips e.radius > vs.r * 0.92, so twenty props must be smaller than the starting void within reach of spawn. Live only (smoke:maple alone is push+live+art).
6. F. Postpipe — |dsat| <= 0.02, |dval| <= 0.02, whole-frame mean |dRGB| <= 4/255, hero saturation loss from glow <= 0.05, scene.background.mapping equirect. qa/postpipe.mjs:161-170, live+art.
7. G. Ground grain — beat Powder's coarse-layer-0 failure: median 16x16 luminance sd 0.0036 against gameday's 0.0360, 51.3% flat tiles against maple's 13.3%. qa/groundgrain.mjs (GRAIN at island.ts:3216). IN NO GATE and its world argument DEFAULTS TO 'powder' (:126) — pass <w6> explicitly.
8. H. Form separation — every colour reaches CIE76 dE >= 6 between a lit and a shaded face under the world's own key; lifts are the minimum reaching dE 7 with hue held and the dark variant still darker. qa/formsep.mjs:23-31. IN NO GATE; needs KEY/OWN/NO_PALETTE edits at :57/:60-64/:72-76 or it exits 1 once the kit carries >=8 colour constants.
9. I. Albedo — second channel >= 0.08 of the dominant in linear light for any literal whose largest linear channel > 0.25. qa/albedo.mjs:15, push+live+quality. Allowlist is keyed to the file (:58), so reusing an allowlisted hex in a new file fails.
10. J. Gamut — <=1.5% of lit chromatic pixels (dominant >=128, chroma >=0.30) may carry a dead channel. qa/gamutzero.mjs:210. ART PROFILE ONLY (gate.mjs:190) — it blocks no push. Readings between clean and ~4% are 'unresolved, reshoot'.
11. K. Picker contrast — >=4.5:1 rendered ink contrast (P95 glyph core vs P30 surround, halo included) over 95% of the pixels behind each line; .wBest renders as exactly one line. qa/pickerfit.mjs:68, :190, :253-276, push+live+art. Measured at ONE viewport (:72); a sixth card narrows every column, so shoot 375-440px widths by hand (GOVERNOR.md:661-665). Also needs seed edits at :79 AND :80.
12. L. Locked card — worst-pair CIE Lab dE >= 10 across the top 58% of locked cards under saturate(0.28) brightness(0.62); pair count grows 3 -> 6. qa/lockedcards.mjs:39, :128-134, push+live+art. A pale or monochrome world 6 is the highest-risk shape.
13. M. Newsstyle per line — <=78 chars at worst-case token fill ({M}=22, {F}=14, {D}=longest DIST_NAME, {P}{R}{S}=2); tokens only [DMFPRS]; opens with a capital or a token; <=1 '?'; no '?!', '!?', ellipsis or em dash; tier 0 zero '!', tier 1 <=1, tier 2 '!!' or none but never a lone '!' and never more than two; {S} tier 2 only; no article before {D}. qa/newsstyle.mjs:129-151, pass rule /^clean$/m. Needs the F-map edit at :38-40 or it prints clean and meters nothing.
14. N. Newsstyle corpus — <=45% exactly-two-sentence lines, >=35% one-sentence, >=2 question marks. qa/newsstyle.mjs:157-159. Origin: 57% of Maple's lines were exactly two sentences, LIVE ran to 71%, and ~1,500 lines across four worlds contained not one question mark. Powder is 51/42/6, three points of headroom.
15. O. React pool — >=20 literals (hard floor), ship 27; {X} budgeted at SUBJECT_MAX 34 and {F} at 14 against 78. qa/newsstyle.mjs:185-186, :193; newsroom_react.ts:71. Needs the react-loop edit at newsstyle:183.
16. P. Newsfeed — over 26 cards at SEED=7: 0 repeated headlines, longest same-opening-word run <=3, 0 unfilled {[A-Z]} tokens. qa/newsfeed.mjs:108; needs the default-list edit at :31 because the gate passes no world args.
17. Q. Newsarc — >=12 cards; phases[0] and [1] both 0; never decreasing, never > prev+1; phase 3 reached; all of 0-3 appear; >=2 brand chips; no VOIDWORDS in a morning card; no speech bubble and no rival name; 14 texts distinct; cards visible on 430x932 with painted text matching the log's first 24 chars; a sticker prop eatable BY THE PLAYER at r <= 5.4 with a reactive line naming it within 3 cards; after PLAY AGAIN phase 0 / cards 0 / high 0. qa/newsarc.mjs:264-489, live. Section E requires world 6 to place sticker props — place more than three.
18. R. Questable — 365/365 day-seeds clearable, supply counted as the eat handler scores it (r<1 snack, r>=6 big, gild, 2.6<=r<=3.4 cabana, qk that tag, qk in houseLike also house). qa/questable.mjs:38, :74-140, live. Either tag buildings with a qk in HOUSE_LIKE (prototype3d.ts:3534) or place >=3 props of radius >=6, or both — decided at placement time.
19. S. Vary — match 0's middle pair == BASELINE exactly; matches 1 and 2 each change BOTH middle slots; if hours >1 the hour changes between match 0 and 1 and sunI/sunHex change with it; if hours ==1 no match deals a non-zero hour; opener and finale titles never move. qa/vary.mjs:82-104, live. Implies >=3 middle-slot alternatives and >=2 hours with distinct key-light colours; needs BASELINE and HOURS_AUTHORED at :23-31 or it reds for the wrong reason.
20. T. Roundlod — total sphere spend sum(2*W*(H-1)) <= 39,018 (qa/roundlod.mjs:60); low-tess (W<10 && H<10) call count <= 154 (:49); every new round thing >=10 on at least one axis. Push+live+art, one second. CORRECTED: DIR = 'src/proto3d' (:62) globs every .ts, and the KIT is where the spheres are (alpine 25 SphereGeometry lines, luxe 65, tailgate 33, nightmarket 16, life 33, island 37, bay 0). One new 14x10 sphere adds 252.
21. U. Track profile — head silence at -40 dB <= 60 ms; integrated -16 LUFS +/-1.0 LU; true peak <= -1.0 dBTP; tail silence <= 0.2 s. qa/trackprofile.mjs:42, :142-145, live, optional: SKIPS and counts as a pass when ffmpeg is absent.
22. V. Front-facing yaw — every front-bearing prop class inside the camera-facing arc: CEN = -pi/4, HALF = pi/3; MIN_N = 8 (fewer and it refuses to conclude); MAX_BUCKET = 0.25 anti-drill. qa/snowyaw.mjs:24. Measured 9 of 15 snowmen outside the arc before, 0 of 91 after. IN NO GATE, and world 6's equivalent (stalls, shopfronts, benches) has no probe — write one before the world is judged.
23. W. Landmark survival — N of N r>=7 props survive the boot passes. qa/_bigprops.mjs, qa/_heroprop.mjs. Pirate lost 7 of 13. Manual.
24. X. WORLD_PAR — approx 0.75 of a measured child-driver mean, child winning 70-75%. node qa/ab.mjs 5 <w6> child. Measure twice (it converges in two passes), and re-measure after any eat-ratio modifier lands (prototype3d.ts:5140).
25. Y. Prop budget — <= ~140 parts per factory; <= 450 MB JS heap worst world. alpine.ts:13; docs/AAA-BRIEF.md:893-902. NO PROBE COUNTS PARTS, and qa/heap.mjs:23 is a four-world list in no gate.
26. Z. Integration surface — grep -rn "<w6>" src/ index.html qa/*.mjs | grep -v ^qa/_ | wc -l within ~15% of lantern's 394. docs/AAA-BRIEF.md:777 section 5.6. Measured now: lantern 394, powder 195 — world 5 shipped half-wired. Target ~335-455.
27. AA. Crowd speed — paceMul strictly < 2.4; leg >= ~18. life.ts:348-350; qa/purpose.mjs:84. Breaking paceMul re-opens the standing-ring bug measured at 45 seconds of a 180-second match with the score frozen.
28. AB. Gloss coverage — the strong-gloss fraction must not fall when world 6's colours land (the GOLD/FAIR_C collision took it 27.1% -> 17.9%). qa/glosscov.mjs:24 (a FOUR-world list) and qa/glossgap.mjs (which measured 72% of Pirate Bay dead matte). BOTH IN NO GATE.
29. AC. Rig exposure — the WORLD_LIGHT row must equal what the renderer applies. qa/rigexposure.mjs:22 (five-world default). IN NO GATE. Note hemiI is exempt by design: it is inert (RIG.hemiI flat 0.22 at prototype3d.ts:864).
30. AD. Mover bands — world 6's loop movers counted in the visible half-rate band, against the owner's 'item lag' complaint; decide crowdGate (prototype3d.ts:9289) deliberately. qa/moverbands.mjs:22 — IN NO GATE and its world list is a literal inside the for-loop with no argv override.

## APPENDIX D — OPEN QUESTIONS (18)

1. Scope gate: docs/FABLE-LAUNCH-BRIEF.md:32-35 permits world 6 to be built only if the four refinement streams are green, but the placement stream's own Owed list (docs/crews/round-5/placement.proposal.md:186-193) is not closed and qa/placement.mjs is in no gate profile. Get an explicit ruling before building.
2. Register qa/placement.mjs in the gate (verdict: exitCode, it already sets its own at :465) and give worldData() a throw default — this must happen BEFORE world 6 exists, or there is no failing run to point at. Who owns that commit?
3. The other fourteen ungated probes (formsep, groundgrain, glossgap, glosscov, variety, snowyaw, music, pockets, lookpair, rigexposure, lookbook, crowdface, moverbands, blackprops): are they ungated by decision or by drift? Several carry bars this contract treats as binding.
4. What is the '* 1.10' inside inHero (powder.ts:91) and inBathhouse (lantern.ts:86)? Identical in both worlds, explained in neither, origin not found. Do not treat it as tunable until someone knows what it pads.
5. District pattern for world 6: Record (maple/gameday, prototype3d.ts:4228/:4239) or whitelist array (lantern/powder, :55-57)? The Record pattern now carries a third obligation nobody documented — a distOf arm at prototype3d.ts:1551 — which argues for the whitelist. Confirm before the vocabulary is fixed.
6. Does world 6 change the ground? If yes, who writes the world-6 arm at prototype3d.ts:8943, and should iceK become a table keyed by surface rather than a hard-coded call to Powder's predicate by name?
7. Should makeSeasonProp's ev.id chain (prototype3d.ts:1613-1645) be fixed for Powder now? It is shipping 44 Lantern moon lanterns on the snow every December, and world 6 inherits it the day it declares a season.
8. Is qa/lookbook.mjs's maple pin (:57 personsheet, :63 _dumpbake) deliberate? As it stands the studio's eight teams can pass world 6 without its ground bake or its people ever being rendered, against STUDIO.md rule 1.
9. Should WORLD_PAR and WORLD_NAMES be retyped to Record<WorldId, ...>? Roughly two characters each, and it converts the two worst silent runtime failures into compile errors.
10. Does world 6 earn App Store screenshots? The eight shots cover 3 of 5 worlds today, so 'every world gets a shot' is not the existing rule — but scripts/shoot-store.mjs:239's seed must be updated regardless, and the shoot purges store/ before it captures.
11. prototype3d.ts:1452-1454's hero centre is a hand-copy of the land module's landmark position with a comment naming the source. Was that meant to be synced or imported? As it stands, moving world 6's landmark means editing two files.
12. WORLD (palette.ts:50) has no per-world variants: WORLD.cliff (island.ts:3403), the underside cap 0x1c1636 (:3406), the base grass (:1063) and the violet halo (:1025-1027) are global. World 6 cannot change its cliff colour without changing all five shipped worlds. Bug or house style?
13. Twelve stickers per world — rule or convention? All five ship twelve, nothing enforces it, and seasonal sets ship four. Also: does world 6 owe a seasonal set if it declares a season (Powder does not have one)?
14. gate.mjs:99 pins the fast faceparity pair to 'pirate, powder' as the measured best and worst. If world 6 becomes the new worst, that pair should be re-measured — by whom, and when?
15. Is qa/pockets.mjs run on Powder by any route? Its default list (:16) omits it, and nothing else enforces the region-lookup's null-off-land contract.
16. skyTex (island.ts:71, returned untinted at :3655) has no consumer found in prototype3d.ts. Dead, or is something using it as the IBL — in which case every world shares one environment?
17. Is src/game/audio.ts (1,580 lines) really out of the shipping build? index.html:2124 loads only /src/prototype3d.ts and nothing under src/proto3d/ imports it, but App.tsx's reachability from the built bundle was never verified.
18. The settle hitch (Maple 253 ms / Game Day 87 ms at match start) is still OWED to the loading screen and a sixth world adds to it. Does world 6 wait for that fix or pay the hitch?
