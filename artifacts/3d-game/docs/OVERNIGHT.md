# OVERNIGHT BRIEF — make VOIDLING a top-10 App Store game

Owner's mandate, given 2026-08-08 evening: work through the night. By morning
they port to the App Store and supply music. Everything else is mine to drive.

> "A beautifully designed game, visually breathtaking from every item, ground
> pixel, events etc. Item placement needs to be dialed in. Items crisp and well
> defined. World events that make this super fun. Void family fun. If something
> is missing to make this addicting, add it."

The concept is the asset: **a cute void that eats worlds.** Everything below
serves that.

---

## RULES THAT DO NOT BEND

1. **Measure, then change.** This codebase has cost me seven wrong conclusions
   in one day, every one caught by an instrument and none by reasoning. If a
   change cannot be measured, build the probe first.
2. **A single run proves nothing.** `qa/ab.mjs` exists because three readings of
   59/44/48 turned out to be one number measured three times. Means and spreads,
   or it did not happen.
3. **Never rebuild `dist/` while a probe is running.** It contaminated a
   five-match A/B: later runs silently loaded the new bundle.
4. **Commit unverified work as unverified.** Say so in the message. Retract in
   the next commit if the instrument disagrees; never defend.
5. **Licence rule for any asset: CC0 / Public Domain / Pixabay / Kenney only.**
   Egress blocks both downloads AND the pages, so a session cannot choose
   tracks — see `public/assets/music/README.md`.
6. **Run `qa/smoke.mjs` before every push to main.** Push to main is a deploy.
   IT LISTENS ON **4177**, not 4173 — the two are different servers and a
   container restart kills both. `node qa/smoke.mjs | tail -2` in a `&&` chain
   will report a CONNECTION REFUSED stack and STILL let the push through,
   because tail exits 0. I claimed "smoke green" in b88d120 on exactly that
   false signal. Check the output says PASS; do not trust the exit status of a
   pipeline.
7. Working directory resets to the repo root between commands. `cd
   artifacts/3d-game` first, every time.

---

## PRIORITY ORDER

### 1. THE MATCH MUST BE A CONTEST  (the only structural gap)

**NINE ATTEMPTS, AND THE MAP IS NOW CLEAR. READ THIS BEFORE TRYING A TENTH.**

Measured, `qa/ab.mjs`, 5 matches each, maple/child:

| attempt | lever | leader/lane | verdict |
|---|---|---|---|
| baseline | — | 47.4% sd 6.2 | player wins 5/5 |
| 1-3 (pre-existing) | raise band ceiling | — | failed, documented in rivals.ts |
| 4 | rival size cap 0.78 -> 0.88 | worse | ALSO broke eating rivals (0.88 > 1/1.2) |
| 5 | crumb floor 0.45r -> 0.18r (larder) | inside noise | real finding, kept |
| 6 | band squared past setpoint | 41.8% sd 11.4 | failed |
| **7** | **player combo sub-linear** | **62.2% sd 9.2** | **WORKED — kept, 0.24 is optimum** |
| 8 | combo pushed to 0.18 | 59.8% sd 14.2 | saturated |
| 8b | field 3-5 -> 3 rivals | 53.5% sd 16.2 | failed, DOUBLED variance |
| 9 | larder takes 3 items/tick | 61.1% sd 10.1 | failed (bites +3.7pp, score flat) |

**THE REASON THEY ALL FAIL.** `leader/lane` is SCALE-INVARIANT. The lane is
`0.94 x pScore` and the band is `want/score`, so any change that scales the
player, the target, or a rival's earnings gets cancelled by the band's own
negative feedback. Attempt 9 is the proof: the family ate measurably MORE
(36.7% -> 40.4% of all bites) and scored exactly the same, because earning more
drops `off`, which drops the multiplier, which drops points per bite.

The band is not a broken corrective. It is a controller holding the ratio at a
fixed point near 60%, and it will absorb anything fed into it.

**SO THE TENTH ATTEMPT MUST CHANGE THE CONTROLLER, NOT ITS INPUTS.**

### CORRECTION to what an earlier pass recorded here

An earlier note in this file claimed the absolute half of
`top = min(FIELD_TOP*shape*scale, max(floor, pScore*0.94))` "never binds". That
is wrong, and the arithmetic is worth keeping because the real answer is
sharper. At full time (`shape = 1`) with a child run at 98,000:

| term | value |
|---|---|
| `par = FIELD_TOP * 0.46` | 7,360 |
| `ratio = pScore/par` | 13.3 |
| `scale = 0.62 + 0.38 * ratio^0.88` | 4.33 |
| branch A `= FIELD_TOP * scale` | **69,200  <- binds** |
| branch B `= 0.94 * pScore` | 92,120 |

Branch A DOES bind. But branch A expands to
`9920 + 6080 * (pScore/7360)^0.88` — it is very nearly proportional to
`pScore^0.88`. **Both branches are functions of the player.** That 0.88 exponent
is the whole story of attempt 8: cutting the player 98k -> 82k moves
leader/player from 0.706 to 0.739, three percentage points against a
measurement noise of nine.

### WHAT WAS ACTUALLY BUILT (attempt 10, two changes)

Both were needed; the analysis says neither alone suffices.

1. **The band is no longer `want/score`.** That is proportional control, and a
   P controller with a throttled plant converges BELOW setpoint by exactly what
   the throttle costs — measured, the leader sat at 47% of lane while the band
   read 1.68, i.e. the shortfall and the correction were the same number.
   Squaring past the setpoint (which the shipped code did) only changed the
   fixed point from `want^(1/2)` to `want^(2/3)`. Still short, differently.

   It is now **feedforward against a measured plant gain**: each rival tracks
   `rv.raw`, the points it earned BEFORE any multiplier, and the band is
   `need / rawRate` where `need` is the rate that reaches the lane 12 seconds
   ahead. No steady-state error by construction, and it self-calibrates to a
   world's prop density instead of assuming one.

2. **`want` is anchored to an absolute per-world par**, `WORLD_PAR` in
   prototype3d.ts, so the target stops fleeing. Measured with
   `qa/ab.mjs 5 <world> child`, par set at 0.85 of the child mean:

   | world | child mean | par |
   |---|---|---|
   | maple | 104,400 (sd 17,200) | 88,000 |
   | gameday | 230,000 (sd 38,600) | 195,000 |
   | pirate | not yet measured | provisional 88,000 |
   | lantern | not yet measured | provisional 88,000 |

   The owner's floor ("never finish below 3rd") is now STRUCTURAL rather than
   tuned: `top = min(par*shape, pScore * PLAYER_CEIL)` with `PLAYER_CEIL = 1.15`.
   Lane 1 wants 0.68 of top and satiety lets it overshoot to 1.2x, so its best
   case is 0.816 x top = 0.94 x the player. Lane 1 cannot beat the player at
   all; only the leader can. A bad run finishes 2nd, a good one 1st.

Do NOT try: another ceiling, another exponent, another size cap, another field
size, or another cut to the player's multipliers. Nine runs say the OLD
controller ate all of them.

### MEASURED: ATTEMPT 10 WORKS
### (numbers below are PRE-re-derivation — the final baseline is further down)

**READ THIS BEFORE USING THE 106.9% AS A BASELINE.** These figures were taken
with the provisional par (maple 88,000). Par was then re-derived from
post-change player scores (maple 80,000 — the values and their verification
live as annotations on WORLD_PAR in prototype3d.ts), and the FINAL calibration
is: maple leader/lane **80.9%**, wins 3/5, worst 2nd; pirate 99.8%; gameday
88.7% (wins 4/5); lantern 82.6% (sd 37.4) — worst place 2nd on all four.
A regression gate on 2026-08-13 read maple at 78.9% (sd 7.5) against this and
was FIRST misread as a 28-point regression against the stale 106.9 below —
the whole day's renderer work had moved nothing. Compare against 80.9, not
106.9.

`qa/ab.mjs 5 <world> child`, 5 matches each, against the baselines above:

| | baseline | attempt 10 | target |
|---|---|---|---|
| maple leader/lane | 59.6% sd 14.5 | **106.9% sd 14.7** | 85-110% |
| gameday leader/lane | 42.9% sd 16.2 | **88.7% sd 23.7** | 85-110% |
| maple place (mean/worst) | 1.0 / 1st | 1.6 / **2nd** | <= 3 |
| gameday place (mean/worst) | 1.0 / 1st | 1.2 / **2nd** | <= 3 |
| maple family bite share | 40.7% | 50.1% | — |

Both worlds moved about 47 points against spreads of 15-24, so this is real by
the file's own rule. The player no longer wins 5/5 anywhere; the closest match
finished **92,243 to 93,398**, a gap of 1,155 points in three minutes. The
owner's floor holds structurally — worst place seen is 2nd, on both worlds,
because lane 1 cannot reach the player by construction.

Two things this also established:

1. **The win condition is exactly one comparison.** The player wins iff their
   score beats par: below par the leader lands on par and finishes behind, above
   it the leader is capped at `PLAYER_CEIL x score` and finishes ahead. Win rate
   is P(score > par) and nothing else, which makes par the single difficulty
   dial. The model predicted 40% on Maple against 2/5 observed.
2. **Par moves when you change it.** A hungrier family eats the island the
   player was going to eat, so the same child driver went 110,983 -> 88,294 on
   Maple, a 20% drop. Par calibrated on pre-change scores is therefore too high
   by construction. Maple is now 80,000 (was 94,000) and wants one more pass.

### PIRATE AND LANTERN, MEASURED — AND A NEW WALL

Both had been running a provisional 80,000 they inherited for no reason beyond
being the worlds nobody had reached. Their first ever calibrations:

| world | child mean | par when measured | leader reached | player |
|---|---|---|---|---|
| pirate | 112,498 | 105,000 | **63,044 (max 72,384)** | won 5/5 |
| lantern | 199,791 | 80,000 (way low) | 70,890 | won 5/5 |

**Lantern** is simply mis-scaled: the child scores 199,791 against a par of
80,000, so the leader hits its target and is still lapped. Raise par and
re-measure; the family reaches ~80k when asked for ~80k, so there is headroom.

**Pirate is a different problem and it is the old lesson returning.** Asked for
105,000 the leader could only manage 63,044 — it never once reached par, in any
of five matches. The family is FOOD-LIMITED there, not multiplier-limited, and
that breaks the clean rule above: the player won the run where they scored only
80,982, because the leader could only find 54,744 points of food.

The subtlety specific to the new controller: because the band is
`need / rawRate`, giving that family MORE FOOD changes nothing — the controller
simply lowers the multiplier to hold the same target. The only thing that can
bind is the band hitting its clamp of 24. So before touching anything, MEASURE
WHETHER THE BAND IS SATURATED on pirate. If it is, the clamp is the lever. If it
is not, the rivals are failing to find food at all and the larder's search
radius or the size cap is the lever. Do not guess between those two.

### CORRECTION: PIRATE WAS NEVER FOOD-LIMITED

The entry above concluded from five matches that Pirate's family could not reach
par and was FOOD-limited. That was wrong, and both halves of the check say so:

  - Instrumented the lane multiplier itself (rivals.bandStat, exposed through
    __matchState().band). Over 22,451 samples on Pirate the band ran a MEAN OF
    2.61 and sat pinned at its 24 clamp for 1.9% of the time. A controller
    asking for 2.6x is not starved of authority; raising the ceiling — the fix I
    was about to reach for — would have changed nothing.
  - Re-measured with qa/ab.mjs, same par, same driver: leader/lane 99.8%
    (sd 18.5), leader/player 93.8%, player place 1.4, worst place 2nd, wins 3/5.
    That is inside the target band.

What actually differed was the FIELD SIZE. The pessimistic sample ran with
5,5,5,4,3 rivals splitting one island; the second ran leaner. This file already
records that field size doubles variance (attempt 8b) and the sd here is 18.5 —
so five matches were enough to manufacture a structural-looking problem out of
nothing. Instrument first, and re-measure before believing a mean.

### ALL FOUR WORLDS ARE NOW MEASURED AND IN SPEC

Lantern's par was a placeholder 80,000 against a measured child mean of 199,791,
so the leader hit its target and was lapped anyway. Set to 150,000 — 0.75 of the
mean, the ratio Maple settled at — and re-measured:

| world | par | leader/lane | wins | place mean | worst |
|---|---|---|---|---|---|
| maple | 80,000 | 80.9% | 3/5 | 1.4 | 2nd |
| pirate | 105,000 | 99.8% | 3/5 | 1.4 | 2nd |
| gameday | 175,000 | 88.7% | 4/5 | 1.2 | 2nd |
| lantern | 150,000 | 82.6% | 3/5 | 1.4 | 2nd |

**The owner's floor holds on every world**: worst place seen is 2nd everywhere,
and that is structural rather than tuned — lane 1 tops out at 0.94 x the player
even after satiety, so only the leader can ever beat them.

A note on Lantern's spread: sd 37.4 on leader/lane, much wider than the others.
On three of five runs the leader could not reach par at all (65k-99k against
150k); on the other two it sailed past (133k, 135k) and took the match. The
OUTCOMES are right and match Maple's profile exactly, so this is shipped as is —
but if Lantern ever needs another pass, the lever is the spread, not the mean.
Do not "fix" the mean; it is already where it should be.

Verify any attempt with `node qa/ab.mjs 5 maple child 4173`.

### 1b. THE VOID RENDERS IN THE WRONG COLOUR SPACE  (found, measured, NOT shipped)

**The hero's body shader writes raw linear values into an sRGB buffer.** Proven
by rendering one colour two ways in the same frame:

| path | `0x5f2ab4` renders as |
|---|---|
| `MeshBasicMaterial` | `(90, 24, 188)` — correct |
| raw `ShaderMaterial` (the void) | **`(29, 6, 116)`** — the linear value |

`THREE.Color` converts a hex to the linear working space on assignment and every
normal material converts back on the way out via `<colorspace_fragment>`. The
void is a `ShaderMaterial`, so three appends nothing, and it ends at a bare
`gl_FragColor`. The character's purple is therefore displayed at roughly a third
of its authored brightness and pulled toward blue.

The consequence is bigger than one wrong colour: **every palette ever chosen for
this character was judged through that filter**, including the `qa/voidgrid.mjs`
sweep that picked the current one. It is a strong candidate for why no set of
hex values has ever matched the key art.

WHY IT IS NOT SHIPPED, and what the next attempt must know:
- Adding `#include <colorspace_pars_fragment>` DUPLICATES it — three already
  prepends it to every ShaderMaterial, and the fragment shader then fails to
  compile with "'LinearTransferOETF' : function already has a body". When that
  happens the void is not drawn AT ALL, and a colour probe cheerfully measures
  the grass behind him and reports a hue of 83 degrees. Only the tone-mapping
  pars need declaring.
- With just `<tonemapping_pars_fragment>` + `<tonemapping_fragment>` +
  `<colorspace_fragment>` it compiles and looks right on the probe's rung, but
  **`qa/smoke.mjs` still FAILS** with a ShaderMaterial compile error. Smoke runs
  at `deviceScaleFactor: 1`, which lands on a different quality rung — bloom
  off, so the frame goes straight to the canvas instead of through a render
  target. That path is not fixed. Reproduce with
  `node qa/smoke.mjs`, not with a DPR-2 probe, which passes clean.
- And the owner has since approved the CURRENT look ("It was this purple
  before"). The palette is compensating for the crush, so correcting the encode
  without re-tuning the palette will change a look he has explicitly blessed.
  This is now a taste decision with a render attached, not a silent fix.

### 2. VISUAL — "breathtaking from every ground pixel"
The shop already renders at native resolution filling 86% of frame. The WORLD
does not get the same scrutiny. In rough value order:

- **Post-processing.** `grep createConvolver`-equivalent for visuals: check
  whether there is ANY post chain. Bloom on the void's rim and on lantern/neon
  emissives is the single biggest "expensive game" tell for the least work.
- **Ground.** The islands are painted to a canvas texture. Check its resolution
  against device pixels — the shop was rendering at 0.67x native and nobody had
  noticed. The same class of bug on a ground plane is very likely.
- **Item crispness.** Owner: "items crisp and well defined". Check mipmaps,
  anisotropy, and whether merged kit props lost their normals.
- **Item placement.** The road sweep was measuring 45% of each prop (fixed,
  82a049f). Look for the same shape of bug in the OTHER placement rules —
  water, cliffs, plaza edges, and the three worlds that are not Maple.

### 3. WORLD EVENTS + VOID FAMILY  ("super fun", "family fun")
- The family already has arch types, voice lines, a hunter arc and a marquee
  meal. Once #1 lands they will actually be felt. Re-playtest before adding.
- Scheduled beats exist (`announceBeat`). Audit what fires, when, and whether
  the last 30 seconds of a match has a shape.
- The fun audit (`w4bfnaeh0`, 14 ideas / 6 survived) has five findings not yet
  built: first-60-seconds, moment-vs-celebration mismatches, what looks
  unfinished in motion, the reason to play a fourth time, and reading it as a
  six-year-old. Re-run it if the file is gone.

### 4. THE REASON TO PLAY AGAIN — RESOLVED 2026-08-13, owner's call
The coin curve now doubles per step: first three skins in a child's first
evening, top four cost 30+ matches EACH, total 174,400✦ ≈ 317 matches at the
measured 550/match. The table and its arithmetic live on PRICES in
prototype3d.ts. nextGoal() keeps pointing the results screen at the cheapest
unowned skin, so there is a stated goal from match 1 to match ~300.

### 5. STILL OPEN, SMALLER
- Mouth sits left of the eye midline at size; body silhouette goes lumpy.
  (Pupil pinning fixed in bceeb1c — that was the big one.)
- The smile itself. Owner called it "weird looking". TASTE CALL — render three
  variants at 20m and let them pick; do not silently change a face.
- `store/preview.mp4` is still the retired 2D game and there is no tool to
  reshoot it.
- 17 IAP products need creating in App Store Connect (owner-only).

---

## THE INSTRUMENTS (use them, extend them)

| probe | answers |
|---|---|
| `qa/ab.mjs` | N matches, mean + sd. The only trustworthy difficulty read. |
| `qa/difficulty.mjs` | expert / child / flail drivers. Can a bad player win? |
| `qa/laneshort.mjs` | per-second: leader vs lane, larder eligibility, size cap |
| `qa/titan.mjs` | is the top form earned? Fails BOTH ways, incl. a broken control |
| `qa/framing.mjs` | every shop render: fill %, centring, native resolution |
| `qa/shopdoors.mjs` | both shop entrances paint |
| `qa/streakunlock.mjs`, `qa/streakdrift.mjs` | the daily/streak counter |
| `qa/tutstrand.mjs` | the session-two world-switch dead end |
| `qa/iapdoc.mjs` | APPSTORE.md vs the client's real product list |
| `qa/smoke.mjs` | boots, loads, grows, eats, makes sound |
| `qa/facewrap.mjs` | how far the face is seated onto the ball, one knob swept |
| `qa/glosscov.mjs` | what fraction of each world is allowed to shine, by vertex |
| `qa/glossgap.mjs` | WHERE a world's surface area is, and which of it is matte |
| `qa/grounding.mjs` | is the hero standing on the floor, by differencing the disc |
| `qa/groundsurf.mjs` | the ground's road/grass material mask, and a roughness sweep |
| `qa/shippedlook.mjs` | what the CANVAS shows — the only probe that sees the real path |

### THE PROBE THAT COULD NOT SEE THE BUG
Every colour probe in `qa/` measures by calling `renderer.render()` into its own
`WebGLRenderTarget` and reading it back. That is the DIRECT path. For weeks
`heroface` reported healthy saturation while the owner reported a purple wash,
and both were right about different frames: `bloomOn` initialised to `true` and
`applyQuality()` is only called when the adapter CHANGES rung, so every device
that held 60 fps shipped the EffectComposer path — which three renders with
`NoToneMapping`, skipping the whole graded tone map, and into a target with no
MSAA. The better the phone, the worse the game looked.

**No probe that renders its own frame can catch a whole-pipeline swap.**
`qa/shippedlook.mjs` screenshots the canvas and pins the rung; use it whenever a
colour or crispness claim is about what SHIPS rather than about a shader.

### A DEAD END, RECORDED SO IT IS NOT RE-PROPOSED
Splitting the ground into road and grass by ROUGHNESS does nothing. Measured on
the fixed pipeline with the camera provably held: 0.02% of pixels change and the
peak delta is 6/255 between roughness 0.97 and 0.45. The island floor is one
flat horizontal plane, so the sun's mirror direction never points at this camera
and sharpening a lobe that is off screen changes nothing; the only other
specular source is the RoomEnvironment IBL, pinned at 0.15 on purpose. A wet or
sunlit road needs normal VARIATION, not roughness. The verified material MASK is
kept in `island.ts` at neutral values for whoever does that.
| `qa/groundsurf.mjs` | the ground's material mask, and sweeps of what it drives |

### TWO NEGATIVE RESULTS ON THE GROUND, SO NOBODY SPENDS THE DAY AGAIN

**Ground roughness cannot do anything in this game.** The whole island is one
`MeshStandardMaterial` at roughness 0.97 — tarmac, lawn, sand and plaza all
answer the sun identically — and the obvious fix is to split it. It does not
work, and the measurement is not close: with the camera provably still (0.000
drift, see below), taking the road from 0.97 to 0.45 changes **zero** pixels by
more than 3/255, and 0.05 — a near mirror — moves 5.3% of the frame with a peak
difference of 9/255.

The reason rules out every other value: the ground is one FLAT HORIZONTAL plane,
so its normal is +Y everywhere, the sun has exactly one mirror direction, and at
this camera's elevation that direction does not point at the lens. Sharpening an
off-screen lobe changes nothing on screen. The only other specular source is the
RoomEnvironment IBL, pinned at 0.15 because higher desaturates the island.
**A wet-looking road needs normal VARIATION, not lower roughness.**

**And the material mask is the hard part, not the effect.** Two heuristics
selected literally nothing — the mask rendered with the tarmac pure black both
times — because both were tuned against mainstreet's `ASPHALT` (0x5a6070), which
is a PROP colour. The ground bake paints `WORLD.road`, which on Maple is
0x6b7292: neither as dark nor as desaturated. Matching the world's own road
colour in CHROMATICITY (rgb over luminance, so the grain multiply cannot move
it) gives road 0.000 against a nearest neighbour of 0.286. Guessing at a colour
when the exact one is in palette.ts was the entire mistake.

### HOW TO PHOTOGRAPH ONE VARIABLE IN A LIVE GAME
`qa/facewrap.mjs` exists to compare four values of one constant, and getting
four comparable pictures took three wrong attempts. All three failures looked
like a real difference in the thing being measured. Reuse the recipe, not the
mistakes:

1. **Hide every DOM layer over the canvas**, not just `#joy`. The newsroom
   bubbles and the HUD run on their own clock.
2. **Capture the rAF loop** (`window.requestAnimationFrame = cb => pend = cb`)
   and hand-crank it. `animate()` re-arms on its LAST line, so a throw inside it
   kills the loop silently — listen for `pageerror`.
3. **Virtualise `performance.now` too.** `animate()` takes dt from
   `THREE.Clock`, which reads the real wall clock — so a hand-cranked frame
   still advances the game by however long the previous *screenshot encode*
   took, clamped to 50 ms. Four variants × 50 ms is enough for the follow camera
   to reframe and the maw to shut between shots.
4. **Do not re-assert `__setVoidR` between shots.** `setRadius` sets a target
   the growth spring eases toward, so re-asserting it on a void that has grown
   past it shrinks him a little every step — a monotonic ramp across the sweep
   that reads precisely as "the change makes his face smaller". It cost a wrong
   conclusion before it was caught by noticing the BODY had shrunk too, and the
   body is not what the knob touches.
5. **Assert the freeze held.** Sample `__matchState().t`, sleep 600 ms of wall
   clock, sample again, fail loudly if it moved. A freeze that quietly does not
   freeze manufactures the exact artefact it was installed to prevent.
6. **Step with dt = 0 between variants, and PRINT THE CAMERA DRIFT.** A
   hand-cranked frame still advances the virtual clock by whatever you tell it
   to, so two frames per variant at 1/60 is 33 ms of world per shot — and a void
   at r=7 travels ~145 units a second. That drifted the camera 14.8 units across
   four shots and reported **90% of pixels changed**, which reads as an enormous
   lighting effect and was the camera moving. At dt = 0 the frame still draws,
   uniforms still bind, and nothing integrates. The real number was 0.00%.
