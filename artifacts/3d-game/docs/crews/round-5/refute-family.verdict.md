# VERDICT: SOUND WITH CORRECTIONS — e0f7e13 (refute-family)

The change does what it says where it can be measured: `sk.rim` no longer reaches any consumer a child sees
in a match, the authored margins reproduce exactly (42.2 to a cue, 41.6 between siblings, 44.0 to white),
the costume set is a bijection, no code path assumes a sibling's skin, and the kid-mercy rails pass on the
build. I could not kill it. What I found instead: the ink set was never measured against the sixth void on
the island (BIGSHOT's ink is the hero's own violet, ΔE 4.9), a seventh consumer keeps its own colour table
(the weekly board), the rendered half of the commit's evidence rests on a probe that failed three of three
runs today for instrument reasons and twice told its reader to loosen the bar, and one number in the commit
message ("rendered worst 26.3") has no run behind it. Four corrections, each verbatim and typechecked or
syntax-checked where code. The rendered numbers are mine, from an instrument that re-projects the ring
before every shot: worst sibling-to-meaning on screen **31.3** (NIBBLES vs the near-miss WHITE, over the
palest ground in Maple), closest sibling pair **25.5** (ECHO/NIBBLES), rho median 0.80 — nothing under 7.

Commit under refutation: `e0f7e13` — FAMILY_SKIN re-dealt, FAMILY_INK added, `roster.push` colour
`sk.rim` → `FAMILY_INK[nm]`. HEAD at start `301a8be`; `dist/` built 00:13 UTC from `0efda23`, the last
commit that touched `src/` (`git log --since="2026-09-02 00:13" -- src/` is empty), so the :4177
preview serves exactly the code under refutation. The bundle contains all five FAMILY_INK values
and the new FAMILY_SKIN order `univoid,kingvoid,shadowninja,drako,rexling` (`main-BlHCCMf5.js`).

Skeptic: refute-family, round 5. Every number below is one I ran on this box today; commands are
given beside them. Times are UTC.

## What I ran

| when | command | result |
|---|---|---|
| 03:57 | `node qa/ringmeaning.mjs --authored` (HEAD) | exit 0. COSTUME bijection PASS. MEANING worst NIBBLES/SAFE **42.2**, IDENTITY worst ECHO/GRUMPS **41.6**, bar 25. Reproduces the commit's authored claims exactly. |
| 03:54–04:00 | `node qa/ringmeaning.mjs 4177` rendered run #1, GPU lock held, load 0.2 before / 4.1–4.5 during (my own three chrome processes, nothing else) | **exit 1 — instrument failure, not a colour finding.** GRUMPS's ring, 850/892 mask px. All five inks rendered to one dark green: JELLY rgb(59,129,74) BIGSHOT (66,110,77) ECHO (40,130,44) NIBBLES (65,131,76) GRUMPS (65,131,77); WIND-UP → (179,128,61). rho min **0.01** (NIBBLES/GRUMPS 75.8→0.6). Mask stability median 9, **p90 173**. Five colours authored ≥41.6 apart cannot render inside ΔE 0.6 through any tone curve; that green is the rexling body (mid `0x55b850`) parked on its own frozen ring — GRUMPS is the HOARDER, working a drifting patch at exactly the spot the probe froze. The probe gates stability on the median only, passed, and printed "the pipeline compresses harder than the bar assumed". See correction C. |
| 04:01–04:09 | `node qa/ringmeaning.mjs 4177` rendered run #2, lock held | **exit 1 — a second, different instrument failure.** JELLY's ring at NDC 0.07,0.24, scale 1.80: mask attempts 38 / 71 / 64 px of 766 projected (702 "too dim": neither the white nor the black reference ring moved the band's pixels by 25), so the ring the probe froze was not where it photographed. No colour was measured. Caveat: overlapped 04:03–04:06 by a second browser I launched by mistake (a `node -e "import(...)"` syntax check executed a scratch probe; killed by pid) — contention can slow a shoot, it cannot make a white ring invisible. Two runs, two failure modes, on top of the six the landing already lists: the rendered pass of this probe does not conclude reliably enough to be evidence either way (GOVERNOR: silence is a FAIL, and so is a probe that cannot conclude). |
| 04:09–04:12 | `node qa/rivalswing.mjs maple 4177`, lock held, sole browser (profile check at 04:12:32), rendering disabled by the probe | **PASS, exit 0.** 353 samples over 180.5 s. Surges 1; lead changes 2 in the stretch (t=105.1→family, 125.6→player), 6 whole-match; larger→eatable arc JELLY >1.2x @107.7 s, eatable @126.6 s; player closed it (r 3.00→4.89 = 1.63x ≥ 1.51x); surged rival JELLY peaked 1.255x at t=111.7 s against pin 3.77; forced bite at t=75.61 s r 2.106→0.918 form 1→0, form stayed lost 6.01 match s (467 frames traced); demotions 1 total / 0 game-fired; bites 1, family prop bites 15. The kid-mercy rails hold on the build under refutation. |
| (00:20, first launch) | `scratchpad/ringmeaning.run1.log` — a rendered run left in the shared scratchpad by the crew that died at the session limit, same build | exit 1, the same failure as my run #1: GRUMPS's ring, 424 px mask, stability median 0 / p90 1 (a static frame), and all nine colours rendered to one green — SAFE and ECHO at ΔE **0.0** rendered against 83.7 authored — followed by the same "pipeline compresses… re-derive BAR" verdict. Not my run, so not my number; it is the third time today the instrument printed that sentence about a frame that was not of the ring. |
| 04:26–04:33 | `scratchpad/ringshot.mjs` v1 — my own instrument: a ring of the halo's exact material around the PINNED player, band projected once, lock held | Collapsed like the others (all inks → rgb(175,165,137), 1598 of 2870 band px rejected as motion). Same disease, so I stopped and diagnosed instead of re-running. |
| 04:34–04:37 | `scratchpad/ringdiag.mjs` — four full-frame shots 1.5 match s apart with the game's state dumped beside each (`scratchpad/diag/diag0-3.png`) | **The cause.** With the radius pinned at 1.9 and the hero fixed at (23.5,−38.0), the camera went (45,33,−16) → (57,50,−4) → (60,54,−2) → (58,51,−4) across the four shots: the follow distance is eased toward its target at 1.6/s (`prototype3d.ts:9341`) and was still travelling ~20 u after the pin; NIBBLES, the bully, was standing at **0 u** from the player at t=22.1 (she joins on top of you and prowls your block); `#hand` (the figure-8 tutorial, live since `a4f5bf6`) and `#titlecard` were up over the canvas. Every ring instrument today — the repo's probe (whose header says "the radius is pinned, so camDist is a constant"), the crew's 00:20 run and my v1 — projected its band once and then photographed where the ring used to be. |
| 04:43–04:56 | `scratchpad/ringshot2.mjs` v2 — re-projects the band from the live camera before every shot; OFF→COLOUR→OFF per colour; `#hand`/`#titlecard` hidden; halo material then fx material (`fx.ts:74`, additive, α 0.5, radius 7) | Camera stable at (57.7,50.8,−3.8) from the third shot on; zero collapsed pairs; masks 950–1316 px of ~1912. Table below. Two rows contaminated and marked: WIND-UP (shot first, camera moved 10.8 u) and NIBBLES (866 px motion-rejected, grey median). |
| 04:57–05:03 | `scratchpad/ringshot3.mjs` — the two contaminated rows re-shot: NIBBLES ×3, WHITE ×2, WIND-UP ×2, SAFE ×1 | First shot of the run garbage again (camera moved 12.3 u — this is now a rule: the first colour after the pin is never valid). Then NIBBLES_b/NIBBLES_c rgb(101,193,177)/(100,193,177), ΔE **0.2** apart; WIND-UP_a/_b ΔE 1.6; WHITE_a/_b 0.0; SAFE identical to v2's (91,193,115). NIBBLES/WHITE **31.3**, NIBBLES/SAFE 34.5, NIBBLES/WIND-UP 103.4. The 15.4 in v2 was a mover, not the ring. |
| ~03:59 | `scratchpad/de.mjs` — CIE76 on `qa/ringmeaning.mjs`'s own `lab()` (copied verbatim) | tables in the kill shots below |
| ~04:00 | `scratchpad/search.mjs`, `search2.mjs` — grid search of sRGB (step 2–3) for a BIGSHOT ink ≥25 from cues, white, the other four inks AND the hero's violets | no violet/purple hue clears the hero set; best families magenta (`#ff00ff` 41.9), tan (`#b6885c` 51.5), green (forbidden by the commit's own "not green" rule). Chosen `#ff2ad4`, see correction A. |
| ~04:01 | real `qa/ringmeaning.mjs --authored` on a scratch copy of `rivals.ts` with BIGSHOT `0xff2ad4` | PASS; MEANING worst unchanged 42.2, IDENTITY worst unchanged 41.6; BIGSHOT nearest cue DANGER 72.3 |
| ~04:02 | corrections A+B applied to a scratch copy of `src/` (`scratchpad/tsc/artifacts/3d-game`, same relative depth, `tsconfig.base.json`/`lib`/`node_modules` symlinked): `nice tsc --noEmit -p tsconfig.json` | exit 0 in 17.8 s. Negative control: one planted `const __neg: number = 'a'` → exit 2 `TS2322`, so the check is live. `qa/ringmeaning.mjs --authored` on that copy still resolves `identity colours via FAMILY_INK in rivals.ts` (the probe's regex accepts `export const`). |

## What I checked on disk

- **The diff** (`git show e0f7e13 --stat`): one file, `src/proto3d/rivals.ts`, +117/−9. Four hunks: two comment
  edits about GRUMPS, the FAMILY_SKIN re-deal with its comment block, the FAMILY_INK table, and the one-token
  `color: sk.rim` → `color: FAMILY_INK[nm]` at `rivals.ts:587`. **`qa/ringmeaning.mjs` is not in this commit** —
  it landed in `1fdc8ef` ("Round 4's family fix and hero proposal — the source change is NOT in this commit").
  The message's "qa/ringmeaning.mjs fails on the old colours and passes on the new" is a claim about a probe that
  arrived separately; true, but the commit does not carry its own evidence.
- **The halo block** is at `rivals.ts:2015-2031` on HEAD, not the brief's `~1904-1922` (the commit added ~110
  comment lines above it). Five branches, parsed by the probe from the source: WIND-UP `0xff2b3c`, PRIZE
  `0xffcf3a`, SAFE `0x54e88a`, DANGER `0xff5560`, NEUTRAL `rv.color`. Only NEUTRAL carries a sibling colour.
- **Every read of a sibling's colour** (`grep -rn "\.color\b"` over `src/`, filtered to rival objects):
  `rivals.ts:1052` onSurge, `:1094` onJoin, `:1460` onNotice, `:2030` NEUTRAL halo — all `rv.color`/`sPick.color`;
  `prototype3d.ts:2429` bubble chip, `:4252` live rows, `:4869` end-screen rows → `:5062` dot, all `r.color`.
  `onJoin` (`prototype3d.ts:2397`) receives the colour and draws nothing (the card went in `0efda23`; there is no
  `announceJoin` left in `src/`). **No consumer reads `sk.rim` on any of those paths.** The two residual
  `sk.rim` reads are `rivals.ts:295` (`const color = sk.rim`, consumed only by the dead `idx % 5 === 2` curl —
  `sk.acc` is truthy for every rival, verdict §2a) and `applySkinToBody` (`void3d.ts:488-489`, the BODY's fresnel
  and swirl — the layer the probe's own header says it does not measure). The halo is constructed with
  `sk.glow` (`rivals.ts:388`) but the join path falls straight through to the halo block in the same frame
  (`rivals.ts:1066-1097`, no `continue` after `joined = true`), so no frame ever shows the shop colour on a ring.
- **A seventh consumer the commit did not list**: `prototype3d.ts:6784-6786`, `weeklyBoard()` — the menu's
  TOP VOIDS board (`index.html:1800` `#btnTop` → `:1977` `#topvoids`, rendered at `:6795` as `.dot2`) seeds the
  same five names with literal colours: NIBBLES `0x7ed57a`, ECHO `0xff9a3a`, BIGSHOT `0xff6fb0`, GRUMPS
  `0x4d8ff0`, JELLY `0x2fd8c0`. Pre-existing — it disagreed with `sk.rim` before the commit too — but the commit
  says "a sibling's colour is its identity everywhere a child meets it". Measured: on that board JELLY wears
  NIBBLES's match colour (ΔE **9.2** from `#5ee8d8`) and BIGSHOT wears JELLY's (**15.0** from `#ff8fd0`); NIBBLES's
  board green is 16.2 from SAFE. Correction B.
- **The sixth void on the island.** The commit measured its five inks against four cues and white. It never
  measured them against the player. `PLAYER_COLOR = 0x9a5cff` (`prototype3d.ts:3238`, the "You" dot on the end
  screen `:4869→5062` and on the weekly board `:6789`); the hero's default skin rim `0xa96bff` and glow
  `0xb98cff` (`palette.ts:37-38,158`); the player's own fx rings `0xb875ff` (`:8511`) and `0xc9a6ff` (`:5377,5391,9465`).
  BIGSHOT's new ink `#b96bff` is ΔE **4.9** from the hero's rim (under `qa/formsep.mjs`'s MIN_DE 6 — the same
  colour), **6.4** from the evolve ring, **11.9** from PLAYER_COLOR (under the commit's own IDENTITY bar of 25).
  GRUMPS `#9ea0fa` is 12.4 from the quest ring and 20.7 from the hero glow (both at the player's feet, not the
  rival's — noted, not corrected). Correction A.
- **The body layer moved with the costumes** (`palette.ts:256-263`, untouched by the commit): ECHO now wears
  shadowninja, rim `#ff4d5e` (ΔE **3.1** from DANGER) and glow sprite `#ff7a8a` (20.7 from DANGER) — the copycat baby
  has a red-lit body under a blue ring. GRUMPS's rexling rim `#8ef07a` is 16.6 from SAFE; BIGSHOT's kingvoid rim
  `#ffd25a` is 11.3 from PRIZE; NIBBLES's drako glow `#ffb054` is 25.7 from PRIZE. Before the commit the same red
  body was JELLY's — moved, not introduced, and the landing (`family-fix.landing.md` §5) flags ECHO's. An owner
  call on `palette.ts`, not a defect of this commit.
- **Blast radius of the costume re-deal** (`grep -rn` for the five skin ids and five sibling names over `src/`,
  `qa/`, `scripts/`): `store3d.ts:41-45` keys IAP product ids by SKIN id, not sibling; `qa/framing.mjs:117`
  reads `#skcv_univoid`, the store's preview canvas, no sibling; `qa/_petcheck.mjs`, `qa/_petshot.mjs`,
  `qa/_gh_side.mjs` carry skin literals but no sibling mapping (all underscore scratch, none in `qa/gate.mjs`);
  `qa/_rf_face2.mjs` finds NIBBLES by name only; `qa/newsstyle.mjs:172` / `qa/newsarc.mjs:75` still list
  WOBBLES/GLITZ/BITSY/CHOMPZILLA/DOZER — stale since `502fe1b`, unrelated to skins; telemetry
  (`prototype3d.ts:4136,4153`) carries `rivalName` only; `FAMILY_TITLE` (`:2390`) is keyed by name. **Nothing in
  the repo assumes NIBBLES wears kingvoid.** `src/game/*.ts` (the 2D game) has no sibling names.
- **Item 4, the record.** `docs/crews/round-4/void-cast.verdict.md` never says "NIBBLES passes, do not break it".
  Its only **PASSES** (`:66`) is Uni-Void's 32-px silhouette — a costume, not a casting. Its §4 table lists all
  five and says "three of five are three characters wearing one body", which leaves NIBBLES/king and
  BIGSHOT/unicorn as the two that agreed. `docs/crews/round-4/void-cast.priority.md:290` said to CUT the re-deal;
  the owner then said "fix the mismatch, keep the names" (`docs/OWNER-2026-08-29.md`). The landing's argument
  (`family-fix.landing.md:144-152`) pins **both** NIBBLES and BIGSHOT and then says the remaining three have "only
  two ways" (the two derangements of three) — true, but the verdict did not pin BIGSHOT. With BIGSHOT free,
  `{NIBBLES:kingvoid, BIGSHOT:drako, JELLY:univoid, ECHO:shadowninja, GRUMPS:rexling}` keeps NIBBLES:kingvoid
  and fixes all three the verdict named. What rules it out is the rule the implementer introduced ("how dangerous
  a costume looks must track how dangerous the sibling is") — a design judgement, not a measurement. The one
  measurable point survives Order 2 only at the body layer: NIBBLES is the sole sibling whose ring goes PRIZE
  gold (`isHunter && !hunting` branch), and kingvoid's body rim is 11.3 from PRIZE where drako's is 89.9.
- **The commit message's "rendered worst 26.3"** appears in no record: `grep -rn "26\.3" docs/` finds nothing;
  `family-fix.landing.md` reports 36.0 (GRUMPS's ring, 149 px) and 34.6 (ECHO's, 879 px). A number in a commit
  message with no run behind it in the record is what rule 3 is about (correction D).
- **`qa/gate.mjs`** does not run `qa/ringmeaning.mjs` (no match for `ringmeaning` in the file; `rivalnotice` is
  on probation at `:161-170`).

## Kill shots

Each one is what I tried, and what happened. Numbers are from the runs above.

**1. Rendered, not authored — did the ACES path pull any sibling under the bar?** Authored margins are
huge (worst sibling-to-cue 42.2, sibling-to-sibling 41.6, sibling-to-white 44.0, all CIE76). The
consumers split in two: the DOM ones (bubble chip `bubbles.ts:279-282`, the leaderboard/end-screen/weekly
dots) paint the hex directly — no tone mapping — so their rendered margins ARE the authored ones. The WebGL
ones are the NEUTRAL halo branch (`rivals.ts:2030`, MeshBasicMaterial α 0.85) and the fx LOOK/SURGE rings
(`fx.ts:74`, additive). The repo's own instrument for the halo failed twice on this box for instrument reasons
(run #1: an occluder; run #2: mask starved) and measured nothing. My own instrument, once it re-projected per shot
(`ringshot2`/`ringshot3`, halo material, canvas screenshots, Maple's pale plaza pavement — the ground that
lifts every colour hardest — camera stable, stable medians only):

| sibling | WIND-UP | PRIZE | SAFE | DANGER | WHITE | worst |
|---|---|---|---|---|---|---|
| JELLY `#ff8fd0` → rgb(203,135,173) | 67.3 (67) | 87.3 (102) | 88.1 (121) | 49.2 (49) | 39.5 (59) | WHITE **39.5** |
| BIGSHOT `#b96bff` → rgb(154,103,205) | 98.3 (109) | 124.9 (149) | 116.7 (153) | 82.1 (93) | 70.3 (94) | WHITE 70.3 |
| ECHO `#1ac6ff` → rgb(38,173,201) | 111.6 (129) | 95.4 (117) | 59.0 (84) | 93.4 (111) | 39.5 (51) | WHITE 39.5 |
| NIBBLES `#5ee8d8` → rgb(101,193,177) | 103.8 (130) | 74.0 (90) | 34.5 (42) | 87.0 (114) | 31.3 (44) | WHITE **31.3** |
| GRUMPS `#9ea0fa` → rgb(132,146,200) | 94.8 (107) | 100.1 (122) | 81.6 (114) | 76.2 (88) | 39.7 (58) | WHITE 39.7 |
| BIGSHOT_FIX `#ff2ad4` → rgb(206,65,178) | 83.4 (84) | 125.2 (143) | 130.2 (166) | 70.9 (72) | 81.9 (104) | DANGER 70.9 |

Rendered cue pixels: WIND-UP rgb(207,63,26), PRIZE (202,179,35), SAFE (91,193,115), DANGER (206,89,65),
WHITE (202,203,196). Sibling pairs rendered: ECHO/NIBBLES **25.5**, JELLY/GRUMPS 31.3, ECHO/GRUMPS 33.6,
BIGSHOT/GRUMPS 37.0, JELLY/BIGSHOT 38.7, the rest ≥ 50. `#ff2ad4` vs the four others ≥ 42.9. rho over 55
pairs: min 0.60, median 0.80, max 1.00 — which is also what the landing's two runs measured (0.62/0.65,
median 0.81/0.83) on a different ring over different ground, so the governor's rho was right even though
his probe cannot be made to repeat it today. The additive LOOK/SURGE material is a different story and is
recorded below, but it is not this commit's. **Nothing a child sees in the NEUTRAL branch is under 7; the
smallest rendered margin is 31.3, four and a half times the floor.** Not a kill.

**2. Every consumer of `rv.color`.** Tried to find one that still reads `sk.rim`: none (the six the commit
lists all read `rv.color`, which is `FAMILY_INK[nm]` at `rivals.ts:587`; the two residual `sk.rim` reads are
a dead branch and the body shader). Found two things the commit did not measure: a seventh consumer with its
own literal colours (the weekly board, correction B) and a sixth identity the ink set was never checked
against — the player's (correction A: BIGSHOT `#b96bff` is ΔE 4.9 from the hero's rim, 6.4 from the bubble
chip's default dot and the evolve ring, 11.9 from the "You" dot). Inside a match no sibling shows two colours,
which is the kill the brief describes; the two findings are corrections.

**3. Blast radius of the costume re-deal.** Nothing in `src/`, `qa/` or `scripts/` assumes NIBBLES wears
kingvoid or any sibling wears any skin: store product ids are keyed by skin id, the store preview canvas is
keyed by skin id, the three scratch probes that carry skin literals carry no sibling, telemetry carries names
only. Not a kill.

**4. "NIBBLES passes, do not break it."** The verdict never says it; its one PASSES is a silhouette test on
Uni-Void. The landing's "only two ways" argument silently pins BIGSHOT too; with BIGSHOT free there IS a deal
that keeps NIBBLES:kingvoid and fixes the three named (BIGSHOT:drako). What excludes it is the implementer's
rule (costume danger tracks sibling danger) — a design judgement the owner approved in substance ("fix the
mismatch, keep the names") without being shown the alternative. The one measurable point favours the landed
deal: NIBBLES is the only sibling whose ring goes PRIZE gold, and kingvoid's body rim is 11.3 from PRIZE where
drako's is 89.9. Not a kill; the record should say the argument was incomplete (correction D).

**5. `qa/rivalswing.mjs`** on the build under refutation: PASS on every bar. The commit touched no behaviour
(the surge and mercy code is untouched by the diff), and the probe agrees. Not a kill.

**6. The commit's own evidence.** "qa/ringmeaning.mjs fails before and passes after" is true of the authored
half (the landing shows the failing run; I reproduce the passing one). The rendered half failed 3 of 3 runs
today for one diagnosed reason (the camera is not where the probe assumes — correction C) and, in two of
them, printed a confident instruction to loosen the bar. And "rendered worst 26.3" in the message has no run behind it in
any record. Rule 3 and 3b; corrections C and D.

## Corrections (verbatim)

Each one is mechanically applicable. A and B were applied together to a scratch copy of `src/` and
typechecked (`tsc --noEmit` exit 0, negative control exit 2); the real `qa/ringmeaning.mjs --authored` passes
on that copy with the same worst numbers (42.2 / 41.6). C was applied to a scratch copy of the probe and
syntax-checked (`node --check`) and run in `--authored` mode.

### A. BIGSHOT's ink is the hero's own colour — `rivals.ts`

Measured (CIE76, the probe's own `lab()`): `#b96bff` is ΔE 4.9 from the hero's default rim `0xa96bff`, 6.4 from
the player's evolve ring `0xb875ff`, 11.9 from `PLAYER_COLOR 0x9a5cff` — the "You" dot that sits in the same
column as BIGSHOT's dot on the end screen (`prototype3d.ts:5062`) and the weekly board (`:6795`). The commit's
own IDENTITY bar is 25. Every violet/purple hue fails the same test (grid search, `search.mjs`): the hero owns
that family. `#ff2ad4` (L* 60, the stage-light magenta a showoff would pick) measures: WIND-UP 83.8, PRIZE 143.4,
SAFE 166.1, DANGER 72.3, WHITE ≥ 41.9, JELLY ≥ 41.9, PLAYER_COLOR 45.8, hero rim 43.7, evolve ring 41.9.

In `src/proto3d/rivals.ts`, replace the line

```
    JELLY: 0xff8fd0, BIGSHOT: 0xb96bff, ECHO: 0x1ac6ff,
```
with
```
    JELLY: 0xff8fd0, BIGSHOT: 0xff2ad4, ECHO: 0x1ac6ff,
```
and in the comment block above it replace
```
  //   BIGSHOT #b96bff  amethyst — the gems set in the crown he wears
```
with
```
  //   BIGSHOT #ff2ad4  stage-light magenta. NOT the amethyst violet this first
  //                    tried (#b96bff): that was ΔE 4.9 from the hero's own rim
  //                    (#a96bff) and 11.9 from PLAYER_COLOR — the sixth void on
  //                    the island, whose dot sits beside BIGSHOT's on every
  //                    results list. Violet is the hero's family; nobody else
  //                    wears it. (round 5, refute-family)
```

### B. The weekly board carries a second colour table for the same five names — `rivals.ts` + `prototype3d.ts`

In `src/proto3d/rivals.ts`, delete the four lines

```
  const FAMILY_INK: Record<string, number> = {
    JELLY: 0xff8fd0, BIGSHOT: 0xff2ad4, ECHO: 0x1ac6ff,
    NIBBLES: 0x5ee8d8, GRUMPS: 0x9ea0fa,
  };
```
(after A; before A the second line reads `BIGSHOT: 0xb96bff`) and put in their place
```
  // (the table itself is module-scope and exported — see FAMILY_INK above —
  // because the menu's TOP VOIDS board in prototype3d.ts names the same five
  // siblings and must not carry a second copy of their colours.)
```
and immediately before the line `export type Arch = 'BULLY' | 'COWARD' | 'SHOWOFF' | 'COPYCAT' | 'HOARDER';` insert
```
export const FAMILY_INK: Record<string, number> = {
  JELLY: 0xff8fd0, BIGSHOT: 0xff2ad4, ECHO: 0x1ac6ff,
  NIBBLES: 0x5ee8d8, GRUMPS: 0x9ea0fa,
};
```
`qa/ringmeaning.mjs`'s `tableIn()` regex still resolves it (`identity colours resolved via FAMILY_INK in rivals.ts`).

In `src/prototype3d.ts`, replace
```
import { createRivals, RIVAL_VOICE } from './proto3d/rivals';
```
with
```
import { createRivals, RIVAL_VOICE, FAMILY_INK } from './proto3d/rivals';
```
and replace the three lines
```
    { name: 'NIBBLES', color: 0x7ed57a }, { name: 'ECHO', color: 0xff9a3a },
    { name: 'BIGSHOT', color: 0xff6fb0 }, { name: 'GRUMPS', color: 0x4d8ff0 },
    { name: 'JELLY', color: 0x2fd8c0 }, { name: 'B1G-B1TE', color: 0xd85a5a },
```
with
```
    { name: 'NIBBLES', color: FAMILY_INK.NIBBLES }, { name: 'ECHO', color: FAMILY_INK.ECHO },
    { name: 'BIGSHOT', color: FAMILY_INK.BIGSHOT }, { name: 'GRUMPS', color: FAMILY_INK.GRUMPS },
    { name: 'JELLY', color: FAMILY_INK.JELLY }, { name: 'B1G-B1TE', color: 0xd85a5a },
```

### C. The probe photographs where the ring was, and blames the pipeline — `qa/ringmeaning.mjs`

Three runs today (mine ×2, the crew's at 00:20) and none measured a ring. The cause is measured, not
guessed (`ringdiag`, 04:34): the probe's own premise — "the radius is pinned, so camDist is a constant"
(`qa/ringmeaning.mjs`, the `__reAim` comment) — is false. `camDist` is eased toward its target at 1.6/s
(`prototype3d.ts:9341`) and was still travelling ~20 u when every shoot started; the band is projected once
from the frozen transform and never again; the first colour of every run fires while the camera moves 10–12 u.
On top of that the bully joins on top of the player and stands at 0 u, the HOARDER walks back onto his own
frozen ring, and `#hand` sits over the canvas on Maple since `a4f5bf6`. Run #1 then printed `FAIL — the
pipeline compresses harder than the bar assumed (0.01 < 0.5) … Re-derive BAR from this rho.` about five inks
that had rendered within ΔE 0.6 of each other — a photograph of a dinosaur. Rule 3b.

Two mechanical edits. First, re-project before every shot instead of once: in `qa/ringmeaning.mjs` the band
`px` is computed inside the freeze block from `FX, FY, FZ, FS` and the camera at that instant; move that
loop into a function `window.__band = () => { … same loop, reading window.__cam now … }` and call it from
`shoot()` after `__reAim()` so `target.px`, `CLIP` and the mask are rebuilt per colour, with the OFF frames
bracketing each colour rather than the whole shoot (the shape of `scratchpad/ringshot2.mjs`, which
measured every colour on the first try after v1 had failed the same way as the probe). Second, until that
lands, make the failure say what it is: replace the line

```
      if (rhoMin.rho < RHO_ASSUMED) {
```
with
```
      // INSTRUMENT SELF-CHECK (round 5, refute-family): two colours authored >= BAR
      // apart cannot land within FLOOR of each other through a monotone pipeline.
      // When they do, the shoot photographed something other than the ring — a
      // sibling parked on its own frozen ring (measured 2026-09-02: GRUMPS's
      // rexling body turned all five inks into rgb(59-66,110-131,44-77), rho 0.01,
      // while the median-only stability gate passed at 9 with p90 173) — and no
      // rho from that frame is evidence about the pipeline. Say so; do not tell
      // the reader to re-derive BAR from it.
      const collapsed = ratios.filter((r) => r.au >= BAR && r.re < FLOOR);
      if (collapsed.length) {
        fails++;
        console.log(`  RENDERED  INSTRUMENT FAILURE — ${collapsed.length} pair(s) authored >= ΔE ${BAR} apart rendered `
          + `under ΔE ${FLOOR} (${collapsed.slice(0, 3).map((r) => `${r.a}/${r.b} ${r.au.toFixed(1)}→${r.re.toFixed(1)}`).join(', ')}). `
          + `Something other than the ring was photographed (mask p90 drift ${dP90}/255); no rho here is about the pipeline. Re-run.`);
      } else if (rhoMin.rho < RHO_ASSUMED) {
```
And the rival the probe freezes: it excludes COPYCAT and BULLY because they come to the player, but the HOARDER
comes back to his patch. Replace
```
    const NAME = (away[0] ?? st0.rivals.find((r) => r.joined)).name;
```
with
```
    // …and not the HOARDER first: he works a drifting patch around the very
    // spot his ring was frozen and parks his body on it (run #1, 2026-09-02).
    away.sort((a, b) => (a.arch === 'HOARDER') - (b.arch === 'HOARDER'));
    const NAME = (away[0] ?? st0.rivals.find((r) => r.joined)).name;
```

### D. The record

- The commit message's "rendered worst is 26.3" has no run behind it anywhere in `docs/`. The recorded runs are
  36.0 (GRUMPS's ring) and 34.6 (ECHO's) in `docs/crews/round-4/family-fix.landing.md`, plus the runs in this
  file. Note it in `docs/GOVERNOR.md`'s retractions as a rule-3 miss, and cite the run, not the message.
- `qa/ringmeaning.mjs` is not in `qa/gate.mjs`. Add to the quality tier, beside `rivalnotice`:
```
  { id: 'ringmeaning', tier: 'quality', profiles: ['quality'], timeout: 900,
    cmd: ['node', 'qa/ringmeaning.mjs', PORT], verdict: pf },
```
  (format copied from the `rivalnotice` entry at `qa/gate.mjs:169-170`; `pf` is the file's PASS/FAIL verdict.)

### Not corrections — recorded for the owner and the ledger

- **The LOOK and SURGE rings cannot carry a colour over pale ground, and never could.** `fx.ring` is
  additive (`fx.ts:74`) at ≤ 0.8 opacity falling to 0 over the flight. Measured (`ringshot2`, fx material,
  α 0.5, radius 7, same pavement, camera stable): every colour renders to a pale wash — WIND-UP rgb(199,184,128),
  PRIZE (214,203,145), SAFE (186,209,161), DANGER (215,185,150), WHITE (214,208,194), JELLY (214,192,181),
  BIGSHOT (198,180,197), ECHO (180,202,195), NIBBLES (187,209,183), GRUMPS (194,186,195). The cues collapse
  among themselves — WIND-UP/PRIZE **6.8** rendered against 84 authored — before any sibling does: sibling vs
  WHITE 7.7 (JELLY), 11.5 (ECHO), 12.4 (NIBBLES), 14.2 (GRUMPS), 19.0 (BIGSHOT); BIGSHOT/GRUMPS **5.8**. rho
  median 0.25. `prototype3d.ts:2625-2628` promises "one ring in the rival's OWN colour"; over pavement the
  material cannot keep that promise for any ink, including the old rims, and the commit did not touch it.
  It is the material, not the table: fix it (normal blending, as the halo) or stop calling the look ring a
  colour cue. PENDING, owner/governor; it moves every ring in the game and belongs with ledger #11.

- `palette.ts:263` shadowninja's rim `#ff4d5e` (ΔE 3.1 from DANGER) and glow `#ff7a8a` now light ECHO's body.
  The ring says blue, the body says RUN. The commit did not open `palette.ts` and should not have; but the body
  is bigger than the ring.
- The shop sells GRUMPS's costume as "Rexling". Already flagged in the landing.

<!-- 04:14 UTC notes for the final:
 - DOM consumers (bubble chip bubbles.ts:279-282, HUD/end-screen/weekly dots) paint the authored hex directly; no ACES. Their margins ARE the authored ones. The chip's fallback colour `#b875ff` (bubbles.ts:279) is dE 6.4 from BIGSHOT's ink: BIGSHOT's chip dot = the anonymous default dot.
 - brief says "the repo's dE 7 bar"; qa/formsep.mjs:37 MIN_DE = 6 (7 is ledger #16's lift target). I hold the rendered numbers to 7 anyway.
 - rivalswing running since 04:09:04 (only browser on the box at 04:12:32: profile Y2ezgr = mine; load 5.3). -->
