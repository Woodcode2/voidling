# THE OPENING BEAT

**Crew: art direction on the establishing shot. Round 3, 2026-08-28.**
*Nothing here has landed. This is a proposal, a photograph set and a probe spec.
Every number below was run on `dist/` at `6a424e6`, rebuilt before the shoot.*

The governor's entry THE HORIZON IS ON SCREEN says the first frame of this game
has never been art-directed against what it actually shows. So the first thing
this crew did was take the picture. **Fifty-seven frames, five worlds, one
identified camera each**, plus five with the measurement windows drawn on
them and five per-frame camera logs — all in `qa/out/opening/`.

Three things came back that nobody has written down before:

1. **It is four worlds, not two.** Pirate Bay and Game Day open above the
   horizon as well; neither is in the governor's table. Its three rows are
   reproduced here to the second decimal — Lantern 11.87 against 11.8, Powder
   15.27 against 15.3, Maple 46.20 against 46.2, peaks 57.09 and 56.44 against
   57.0 and 56.4, camera 75.0 units up against 75 — so this is an extension of
   that measurement, not a disagreement with it.
2. **The 45-degree pitch swing is not the whole move.** The optical axis also
   travels **70 to 115 degrees in AZIMUTH**, overshoots the gameplay angle in
   both axes, and comes back. It is a ring, and the A/B below proves it is the
   follow spring's lag and nothing else.
3. **The opening beat is not the same shot twice.** On a second match it opens
   17.6 degrees higher and 152 units further up, with no horizon at all —
   because `resetMatch()` never reseeds the camera. The owner's standing rule is
   that the opening is "hand-authored and identical every load". The camera is
   not.

And the answer to the question in the brief — *what fills the top of the frame
when the horizon is in it* — is: **a flat fill.** In Game Day, 99.8% of it is
pure black.

---

## 1. HOW THE FRAMES WERE TAKEN, AND WHY THEY CAN BE TRUSTED

Probe: `/tmp/.../scratchpad/opening.mjs` (throwaway, per the brief; the shipping
version is specced in §7). It is not a wait-and-snap.

**It steps the render loop.** A free-running capture of this shot is useless: a
first pass screenshotting "at camDist 286" caught the camera somewhere inside a
**21-degree band**, because that is how far the axis moves between two
consecutive rendered frames at the top of the move. So `requestAnimationFrame`
is gated — the page's callbacks queue, and `__step()` releases exactly one batch
and lets the compositor present it. Every frame below is one identified camera.

**Stepping does not change the shot, and that is measured, not assumed.**
`prototype3d.ts:8327` takes `dt = Math.min(0.05, dtRaw)`, and under swiftshader
every frame already exceeds 50 ms, so `dt` is pinned at 0.05 whether the loop
free-runs or is stepped. The free-running log taken *before* the gate existed
advances `t` in exact 0.05 steps and reads **pitch 11.88 / camY 75.0 / camDist
292.77** at Lantern's first intro frame; the stepped log reads **11.87 / 75.0 /
292.77**. Two later re-runs reproduced it to 0.01 degrees. `dtRaw` itself is
read only by the hitch counters, the quality adapter (pinned to rung 0 here) and
`fovKick`/`kitCd`, none of which move the intro camera.

**Progress is read off the match clock, never wall time.** Intro progress is
`__matchState().camDist`, which `prototype3d.ts:9281` sets to `38 + 262·k²` with
`k = introT / introLen`. It is the only exposed number that tracks the intro
exactly, and `matchState().camDist` exists precisely because a previous probe
tried to reconstruct it from the radius and got it four times wrong.

**The title card is hidden in the sweep, and here is why.** `index.html:573`
runs `#titlecard.show { animation: cardFade 4.2s }` — a CSS **wall** clock —
while the camera move runs on accumulated **match** seconds. On a phone holding
20 fps or better the two coincide (`dt` is `min(0.05, dtRaw)`, so match time IS
wall time above 20 fps) and the 3.4–3.6 s move plays under the 4.2 s card. Under
swiftshader they run away from each other and the card lands at a random opacity
in every frame. So it is hidden for the sweep and shot once at **f12 (t = 0.60
s)**, which is past the card's 14% keyframe where its real opacity is 1.0:
`*_f12_card.png`. Note what that timing means for the finding — the card ramps
0 → 1 over its first 14%, which is 0.59 s, so at the opening beat it is under a
tenth of an opacity by a linear reading of its own keyframes, and lower still
because the animation is `ease`. **The opening beat is not protected by the
title card.** A child sees it raw.

The HUD is **not** hidden. It is on screen in the shipped game from frame 1 and
that is part of what is being judged.

Viewport 430×932, DPR 1, quality pinned to rung 0, all five worlds unlocked.

---

## 2. THE SWING, MEASURED — and a correction to the governor's table

Every row stepped frame by frame off `__cam.getWorldDirection()`. Pitch is
degrees below horizontal. "Frame top" is `fov/2 − pitch`; positive is **above
the horizon**. Azimuth is reported against the gameplay constant of 225°.

| world | pitch at f1 | frame top | horizon at | azimuth at f1 | Δaz from 225° | camera Y | peak pitch | max Δaz | intro |
|---|---|---|---|---|---|---|---|---|---|
| **lantern** | **11.87°** | **+4.13°** | 13.3% down | 190.4° | 34.6° | 75.0 | 57.09° | 55.2° | 3.45 s |
| **pirate**  | **13.08°** | **+2.92°** | 9.5% down  | 177.9° | 47.2° | 74.2 | 50.90° | 67.6° | 2.15 s |
| **powder**  | **15.27°** | **+0.73°** | 2.4% down  | 192.4° | 32.6° | 74.9 | 56.44° | 37.5° | 3.35 s |
| **gameday** | **15.22°** | **+0.78°** | 2.6% down  | 190.8° | 34.2° | 74.9 | 55.81° | 39.6° | 3.26 s |
| maple | 46.20° | −30.20° | off frame | 225.0° | 0.0° | 74.2 | 46.29° | 0.0° | 2.13 s |

**Four of five, not two.** Pirate Bay and Game Day were never sampled. Pirate is
the shallowest-but-one and it is the world where it matters most, because Pirate
Bay is lit as broad daylight.

**The axis rings.** Steady-state is pitch 45.9° / azimuth 225°. The shot starts
33–47° off in azimuth, sweeps *through* 225° at about t = 1.0 s, **overshoots to
37–68° on the other side** at t ≈ 1.5–2.3 s, and drags back. Pitch does the
same: past 45.9° at t = 1.0 s, up to **50.9–57.1°** — steeper than the gameplay
camera ever gets below WORLD ENDER — then back to 46°. Total travel: 70–115° of
azimuth, 45° of pitch, in three and a half seconds.

Maple is flat on every axis because `COPY.hero` is `null` for Maple, so there is
no landmark to pan from. **Maple, world 1, has no establishing shot.**

Raw per-frame logs: `qa/out/opening/<world>_log.json`.

### 2b. The horizon window is short, and this is the honest version of it

The geometric horizon leaves the frame when pitch passes `fov/2` = 16°.
Interpolated off the logs: **t = 0.055 s (gameday, powder), 0.071 s (pirate),
0.082 s (lantern)**. So the horizon proper is on screen for well under a tenth
of a second.

The **sky** stays much longer. The top strip (y 104–150) holds true black
through t = 0.15 s in Game Day (100%, 100%, 100% at t = 0.05/0.10/0.15) and
through t = 0.60 s in Powder (36%, 3%, 100%, 99%, 94%). Sky is a meaningful
share of the frame for roughly the first **0.3–0.6 seconds** — and it includes
frame 1, which is the frame a store video opens on and the frame an App Preview
poster is cut from.

**Not established:** these are the states at t = 0.05 s and later, because
swiftshader's first frame advances 0.05 match-seconds. A 60 fps phone renders
about three frames before that point, at t = 0.017 s, where the spring has
closed less of its gap and the camera is *lower* and the horizon *higher*. I did
not measure that frame and I am not claiming a number for it.

---

## 3. WHAT IS ACTUALLY UP THERE — the measurement

Two stated windows, drawn onto the picture rather than found by an algorithm. A
first version used a smoothness-plus-step skyline detector; it worked on Pirate
and Game Day, fired on 24% of Lantern's columns (bamboo and hanging lanterns
break the smooth run) and **invented a skyline in 226 columns of Maple, which
has no sky in frame at all**. A measurement that needs an unchecked algorithm is
worth less than two windows you can look at, so:

* **SKY** — y 110…285, full width. Verified by eye against every f01 frame and
  drawn in red on `<world>_f01_windows.png`. It is entirely sky in pirate,
  gameday, lantern and powder. In maple it is **ground**, which is the finding
  for maple, not a failure of the window.
* **GROUND** — y 520…760, full width, drawn in green. Inside the world in all five.
* y < 104 is skipped everywhere: the score chip, the clock and the home button
  live there.

Luminance is Rec.709 on sRGB-decoded pixels. "true black" is L < 0.006.

### Intro frame 1

| world | sky mean L | sky range (P95−P5) | sky sat | true black | mean rgb | ground mean L | **ground : sky** |
|---|---|---|---|---|---|---|---|
| **gameday** | **0.0026** | **0.0034** | 0.985 | **99.8%** | (24, 0, 21) | 0.2866 | **110.2×** |
| **pirate**  | **0.0060** | **0.0036** | 1.000 | 60.8% | (0, 17, 42) | 0.3849 | **64.2×** |
| **powder**  | 0.0089 | 0.0077 | 0.998 | 8.1% | (0, 9, 86) | 0.3180 | 35.7× |
| **lantern** | 0.0081 | 0.0061 | 0.965 | 10.8% | (5, 4, 87) | 0.0826 | 10.2× |
| maple | 0.2173 | 0.3625 | 0.473 | 2.5% | (98, 123, 96) | 0.2509 | 1.2× — *this is grass, not sky* |

**This repo already has a bar for that range column and every one of these fails
it.** `docs/OWNER-2026-08-25.md` §6, on the violet halo bug: *"A range of eight
thousandths across a whole frame is not a sky with a colour problem. It is a
flat fill."* The opening beat's sky measures **0.0034 to 0.0077**. Game Day's is
**less than half** the number that got the halo plane rebuilt, and 99.8% of it
is pure black — the same defect class as the toe bug and the flat-red finding,
in the most valuable frame the game has.

Two of these worlds are lit as **daylight**. Pirate Bay is a sunlit turquoise
resort under a black starfield with a 64× step across the skyline; Game Day is a
bright concrete tailgate lot under a near-black magenta band with a 110× step.
The join itself is cropped at 2× in `qa/out/opening/pirate_f01_join.png`
(`pirate_f01.png` rows 250–410): a teal hotel roof, a red flag and a green palm
at full daylight key against a night sky, with no haze, no glow and no gradient
between them.

Lantern's 10.2× and Powder's 35.7× are night and dusk worlds where a dark sky is
the right answer, and they read that way. They are still flat fills.

### And none of the celestial work is in it

Projected through the real camera at intro frame 1 — sprites and the real 5000
star buffer, not arithmetic off a comment:

| world | planets on screen | NDC of the two sprites | stars in frustum |
|---|---|---|---|
| pirate  | **0 of 2** | (−5.68, −5.05), (−6.54, −11.58) | 34 / 5000 |
| gameday | **0 of 2** | (−3.48, −3.84), (−3.44, −8.25) | 41 / 5000 |
| lantern | **0 of 2** | (−6.12, −5.42), (−3.20, −9.36) | 28 / 5000 |
| powder  | **0 of 2** | (−3.18, −3.85), (−3.67, −8.13) | 33 / 5000 |
| maple | 1 of 2 in frustum, at (−0.44, −0.57) — and **behind the island**, whose f01 frame has 0% sky | | 72 / 5000 |

The frame is ±1 in NDC. The planets are three to six **frame-widths** to the
side and four to twelve **frame-heights** below. The cause is structural:
`island.ts:830` pins every planet to `AZ = 3.927` (225°) ± 0.11 rad and
`island.ts:826-829` puts them at −56 to −77° elevation, both authored for the
**steady-state** camera. The intro camera looks along **178–192°** at **+4 to
−28°**. The two bands do not intersect at all.

So the answer to the brief's question, precisely: at the opening beat the top of
the frame is a **flat, near-black slice of the sky dome's equator** carrying 28
to 41 of 5000 stars, one or two soft grey nebula smudges cropped by the frame
and half-hidden behind the score chip (cropped at 3× in
`qa/out/opening/lantern_f01_blob.png`), and **a hard silhouette edge where the
island stops**. No horizon glow, no
atmosphere, no planet, no falloff.

---

## 4. THE SECOND MATCH IS A DIFFERENT SHOT

`resetMatch()` (`prototype3d.ts:6443`) warps the void to spawn and sets
`camDist = 50`, then calls `beginMatch()`, which sets `introT`. **It never
touches `camFollow`** — the smoothed follow position the camera actually renders
from (`prototype3d.ts:3340`, written only at boot `:9692`, in `__warpVoid`
`:1909`, and by the spring `:9352`). So match 2 begins its establishing shot from
wherever match 1 left the camera.

Measured in Lantern (`/tmp/.../scratchpad/matchtwo.mjs`): match 1 → grow the
void to r 9.37 with `__setVoidR` → `__rushClock` to the end → tap PLAY AGAIN →
read intro frame 1.

| | camDist | camera Y | pitch | azimuth | frame top |
|---|---|---|---|---|---|
| match 1, f1 | 292.8 | **75.0** | **11.88°** | −169.61° | **+4.12°** |
| end of match 1 (r 9.37) | 254.5 | 229.9 | 65.11° | −135.00° | −49.11° |
| results screen | 255.6 | 231.2 | 65.11° | −135.00° | −49.11° |
| **match 2, f1** | 292.8 | **227.0** | **29.48°** | −165.20° | **−13.48°** |
| **delta** | — | **+152.0** | **+17.60°** | +4.41° | **−17.60°** |

`qa/out/opening/lantern_match1_f01.png` against
`qa/out/opening/lantern_match2_f01.png`. Match 1 opens on the glowing bathhouse
with a starfield above it. Match 2 opens 152 units higher, with **no horizon and
no sky band at all**, the bathhouse small, and a bare brown path up the middle
of the frame.

`camOffset` (`prototype3d.ts:600`) carries across the same way — it is a mutable
module vector rewritten every frame from `steep`, so at the instant `resetMatch`
runs it still holds the previous match's steepened value.

**This is the third time in this repo's own record that the first run is the
one that works** — the `voidUnlocked` seed, where Maple passed and hid four
broken worlds; the title card's `classList.add` no-op, which played on match 1
and never again; and now the camera. The card bug's own comment says why it
matters: *"PLAY AGAIN is how children actually start matches."*

**Not established:** I ran this in Lantern only, and I grew the void with
`__setVoidR(9)` rather than by playing. A child who plays a normal match reaches
a comparable radius, so the direction is right; the exact delta will vary with
how well the last match went, which is itself the point — **the opening shot
currently depends on your previous score.**

---

## 5. THE CAUSE, PROVED

`prototype3d.ts:9341-9342` builds the camera's target as
`tmpV = camOffset·camDist + (lookX, 0, lookZ)`, and `lookX/lookZ` already carry
`introHX/introHZ`, the slide from the landmark to the void. So **the target is a
correct crane**: camera on the orbit of whatever it is looking at. If
`camera.position` were ever equal to `tmpV`, the optical axis would be exactly
`−camOffset` — pitch 46.4°, azimuth 225° — for the whole intro.

It never is, because `camFollow.lerp(tmpV, 1 − exp(−5·dt))` (`:9352`) has a
0.2-second time constant and starts 150–200 units away from a target that is
itself moving at speed. **The entire "45-degree establishing swing" is the
follow spring's lag.** That is why Maple, whose look point is the void itself,
has no swing at all: lag *along* the offset ray does not change the angle. Only
a look point offset from the orbit centre does.

**A/B, run on the shipped build with no patch applied**
(`/tmp/.../scratchpad/abpose.mjs`). `__warpVoid(x, z)` is a shipped hook that
teleports the void *and* seeds `camFollow` to `void + camOffset·camDist` — which
is exactly the seed §7 P1 asks for. Warping the void onto the landmark makes
`introHX/introHZ` zero, so the look point and the orbit centre coincide and the
camera sits where an unlagged intro would put it:

| world | as shipped, f1 | with the lag removed |
|---|---|---|
| lantern | pitch **11.87°**, az −169.61°, camY 75.0 | pitch **45.34°**, az −136.73°, camY 210.8 |
| pirate  | pitch **13.09°**, az 177.85°, camY 74.2 | pitch **45.61°**, az −137.16°, camY 206.8 |

Frames: `qa/out/opening/lantern_ab_unlagged.png`,
`qa/out/opening/pirate_ab_unlagged.png`. The stated cost of the method: the void
is standing at the landmark in those two frames instead of at its spawn. At
camDist 286 a radius-0.9 void projects to about ten pixels across on a 932-high
viewport, and in both frames it is not distinguishable against the building it
is standing on. What these two frames are evidence of is the CAMERA POSE, which
is printed beside them and comes from `__cam.getWorldDirection()`.

Remove the lag and the pose snaps to within **0.6° of the gameplay pitch and
2.2° of the gameplay azimuth**. That is the whole mechanism, and it means
**every property of the opening beat that this crew was sent to art-direct is an
accident of a spring constant.**

---

## 6. THE JUDGEMENT, AND WHAT I WOULD DO

### It is not one verdict. It is three.

**Broken:** Pirate Bay and Game Day. A sunlit world under a flat black sky with
a hard edge between them, at 64× and 110×, in the first frame of the level. Game
Day's sky band is 99.8% pure black with a luminance range of 0.0034. A child
looking at that frame is looking at a bug.

**Accidentally excellent:** Lantern Night and Powder Pass.
`qa/out/opening/lantern_f01.png` is the best frame in this repository — the
bathhouse lit from the side, lanterns receding, the market falling away, a
starfield above a bamboo silhouette. `powder_f06.png` is the second best. Both
are night-and-dusk worlds where a dark sky is coherent, and both are still
flat fills by the repo's own measure.

**Absent:** Maple Falls. World 1, the level a child plays first, has no
establishing shot. Its opening frame (`maple_f01.png`) is an arbitrary
mid-zoom: a two-pixel mascot on grass, a road cut by the top edge, a red tree
cut by the bottom-right corner, no subject. The ledger already records Maple as
last on every pacing axis while being world 1. It is now also the only world
with no opening.

### The low pose is worth keeping, and this is the number that says so

The obvious "fix" is to remove the lag and let the shot be what its comments
say. Do not do that blind. Measured on the bathhouse in Lantern, boxes drawn by
hand on the building at each pose and reproduced as crops:

| | box | mean L | P95 | share of the box above L 0.30 |
|---|---|---|---|---|
| low pose (as shipped, f1) | `lantern_f01.png` 155,315–275,470 | **0.3151** | 0.8311 | **50.8%** |
| unlagged pose (pitch 45.3°) | `lantern_ab_unlagged.png` 45,360–270,580 | **0.0614** | 0.5229 | **6.6%** |

Both boxes are saved as crops so the reader can check that they are on the
building: `qa/out/opening/lantern_box_low.png` and `lantern_box_high.png`.

**5.1×.** At 12 degrees you see the bathhouse's lit faces and it reads as a
paper lantern the size of a building. At 45 degrees you see its roof, and its
roof is `ROOF = 0x4a5468` — the colour the governor's ledger already records as
"a near-black navy with six tiers… a flat silhouette with orange lines on it".
The high pose photographs the exact defect the ledger has open. (The high box
unavoidably includes some lit plaza around the building's base, which raises its
mean — so the true gap is wider than 5.1×, not narrower.)

The other direction is just as real: `pirate_ab_unlagged.png` puts the ringed
teal planet in frame with its rings, over the coast curve, and it is lovely.
**The high pose is where the planet work finally pays off, and the low pose is
where the landmark lighting pays off.**

### The principle underneath, which is the actual art decision

These worlds are rocks floating in space. **Looking down past the island's edge
into space is coherent. Looking at a HORIZON is not**, because a horizon is an
atmospheric phenomenon and these islands have no air. The low pose promises air
the world does not have — which is exactly why Lantern and Powder survive it (a
dark sky reads as night) and Pirate and Game Day do not (a dark sky over
daylight reads as a hole).

So the choice is honest and it is the owner's:

> **(A)** Keep the premise. Fix the lag, pose the opening beat at or above the
> gameplay angle, never show a horizon, and the planets arrive.
> Cheap, coherent, and it deletes the best frame in the game.
>
> **(B)** Give the islands air. Paint a per-world horizon band into the sky
> dome's equator so that when the shot does show the horizon there is a sky
> there. Then pose the opening beat low **deliberately**, in all five worlds
> including Maple, and the game opens on its best frame every time.

**I recommend (B), and I recommend the correctness patches land regardless.**
The owner's answer on the sky was *"sure if you can make it beautiful"*, and
that question has never actually been asked of the right camera — the crew that
tried was reasoning from the fixed band. This is the first time anyone has known
where to paint. And (B) is the only branch on which the sentence "at no point is
good enough acceptable" has a job to do here: (A) makes the frame *fine*.

---

## 7. THE PATCH SET

Exact patches. **Nothing here has been applied** — this crew wrote one file.
Seeded-draw accounting for every patch below: **zero** `mrnd()`/`mr()`/
`mpick()`/`mchance()` calls added or removed, so Maple's mulberry32 stream is
untouched. Triangle cost: **zero** for P0–P2 and P4; P3 is one canvas operation
at load and adds no geometry.

### P0 — the three false statements, corrected in place

**P0a · `src/proto3d/island.ts:696-699`** (inside the starfield note). Current,
verbatim:

```ts
      // The camera in this game only ever looks DOWN: pitched 46 degrees at
      // spawn and 65 by VOID TITAN, on a 32-degree lens, so the highest thing
      // on screen is about 27 degrees BELOW the horizontal and the lowest is
      // about 81 below. The horizon is never in frame in any world at any size.
```

should read:

```ts
      // THE STEADY-STATE camera in this game only ever looks DOWN: pitched 46
      // degrees at spawn and 65 by VOID TITAN, on a 32-degree lens, so the
      // highest thing on screen is about 27 degrees BELOW the horizontal and
      // the lowest is about 81 below.
      //
      // THIS SENTENCE USED TO END "The horizon is never in frame in any world
      // at any size." That is true of steady-state play and FALSE of the shot
      // the match opens on, and it stood here, in the PLANETS note below and
      // in the owner's answer sheet until somebody stepped the establishing
      // shot frame by frame. Intro frame 1 sits at pitch 11.9 in Lantern, 13.1 in Pirate,
      // 15.2 in Game Day, 15.3 in Powder and 46.2 in Maple, which has no
      // landmark to pan from — so in FOUR worlds of five the top of the frame
      // is 0.7 to 4.1 degrees ABOVE the horizon, and in those four the horizon
      // is on screen for the first ~0.06-0.08 seconds of the match. The band
      // the INTRO shows is +4 to -28 degrees; the steady-state band described
      // above is -27 to -81. A claim about what can be seen in this game has to
      // say which of the two cameras it means, and over what radius range. Frames and numbers:
      // docs/crews/round-3/opening-beat.proposal.md, qa/out/opening/.
```

**P0b · `src/proto3d/island.ts:774-780`** (the planet placement note). It carries
*two* errors: the horizon claim, and "between -34 and -62 degrees", which does
not describe the `SKIES` table twelve lines below it (−56 to −77). Current,
verbatim:

```ts
  // WHERE THEY CAN GO IS NOT A TASTE QUESTION. The camera is pitched 46 degrees
  // down at spawn and 65 by VOID TITAN, on a 32-degree lens, so the visible
  // elevation band runs from about -27 degrees at the top of the frame to about
  // -81 at the bottom. The horizon is never on screen. A planet placed level
  // with the island, or above it, is geometry nobody will ever see — so these
  // sit BELOW and BESIDE, between -34 and -62 degrees, which is also the honest
  // arrangement for a rock floating in space.
```

should read:

```ts
  // WHERE THEY CAN GO IS NOT A TASTE QUESTION, AND THE ANSWER HAS TWO CAMERAS.
  // In STEADY-STATE play the camera is pitched 46 degrees down at spawn and 65
  // by VOID TITAN, on a 32-degree lens, so the visible elevation band runs from
  // about -27 degrees at the top of the frame to about -81 at the bottom, and
  // the horizon is not on screen at any radius a match passes through. A planet
  // placed level with the island, or above it, is geometry nobody will ever see
  // IN PLAY — so these sit BELOW and BESIDE, between -56 and -77 degrees. THAT
  // RANGE IS WRITTEN DOWN THREE TIMES IN THIS FILE AND NO TWO AGREED: this line
  // said "-34 and -62", which describes nothing in the file; the note at :827
  // says "-57 and -75", which is a degree or two out; the SKIES table is the
  // authority and it runs -56 to -77.
  //
  // THE INTRO IS A DIFFERENT CAMERA AND NONE OF THIS IS ON SCREEN IN IT. The
  // establishing shot opens at pitch 11.9-15.3 along azimuth 178-192, not 225,
  // so its frame covers +4 to -28 degrees of elevation inside a 15-degree
  // azimuth slot that misses the planet slot entirely. Projected through the
  // real camera at intro frame 1: ZERO of the eight planets in the four worlds
  // that have an establishing pan are on screen — NDC x -3.2 to -6.5, NDC y
  // -3.8 to -11.6, three to six frame-widths to the side and four to twelve
  // frame-heights below — while 28 to 41 of the 5000 stars are inside the
  // frustum. Maple's giant IS in the frustum and is behind the island, whose
  // opening frame contains no sky at all. Measured in
  // docs/crews/round-3/opening-beat.proposal.md.
```

**P0c · `docs/OWNER-2026-08-25.md:207-209`.** The sentence stays — it is what the
starfield was genuinely rebuilt against — with a correction under it. Insert
immediately after the paragraph ending "…and the horizon never is. Fixed.":

```md
> **CORRECTED 2026-08-28 — and left standing on purpose.** The sentence above,
> "nothing above 27 degrees BELOW horizontal is ever on screen and the horizon
> never is", is true of the camera you play with and false of the camera the
> match opens on. Nobody had separated the two. The establishing shot swings 45
> degrees of pitch and 70-115 degrees of azimuth in three and a half seconds,
> and at the opening beat it sits at pitch 11.9 (Lantern), 13.1 (Pirate), 15.2
> (Game Day) and 15.3 (Powder) — so in four of your five worlds the top of the
> very first frame of the match is ABOVE the horizon, and the horizon is on
> screen — and the title card has barely started to fade in, so nothing is
> covering it. Maple is the fifth, and it has no establishing shot at all. The stars
> were placed correctly for play; so were the planets, and that is the problem —
> at the opening beat none of the eight planets is on screen and 28-41 of 5000
> stars are in frame. Frames and numbers:
> docs/crews/round-3/opening-beat.proposal.md and qa/out/opening/.
```

### P1 — seed the follow spring at match start (correctness; land regardless of the pose decision)

`src/prototype3d.ts:6526`, inside `resetMatch()`. Current:

```ts
  velX = 0; velZ = 0; camDist = 50;
```

becomes:

```ts
  velX = 0; velZ = 0; camDist = 50;
  // ── THE OPENING SHOT USED TO START FROM WHERE THE LAST ONE ENDED ─────────
  // camFollow is the smoothed position the camera actually renders from, and
  // nothing reset it here, so intro frame 1 of match 2 began from wherever
  // match 1 left the camera — 227 units up after a big void, against 75 on a
  // cold start. Measured in Lantern: pitch 11.88 on match 1 and 29.48 on match
  // 2, a 17.6-degree difference in the optical axis of the first frame a child
  // sees, with the horizon in one and not the other. camOffset is a mutable
  // module vector rewritten every frame from `steep` and carries the same way,
  // so both are reset. __warpVoid already does exactly this two lines apart
  // (:1908) and boot does it at :9692; the match start was the one place that
  // did not. "Spawn and the opening hand are hand-authored and identical every
  // load" (GOVERNOR.md, HANDS OFF) has to include the camera.
  camOffset.set(0.62, 0.92, 0.62).normalize();
  camFollow.set(voidState.x + camOffset.x * camDist,
                camOffset.y * camDist,
                voidState.z + camOffset.z * camDist);
```

Cost: two vector writes per match. No draws, no triangles, no seeded draws.

### P2 — author the opening pose, and stop the ring (the pose decision)

**P2-B, the recommended branch.** Two edits.

*(i)* beside `camOffset` at `src/prototype3d.ts:600`, add:

```ts
/** THE OPENING POSE. A low, wide crane on the world's landmark, eased out to
 *  the gameplay diagonal as the dive comes in. atan(0.20 / (0.62*sqrt2)) =
 *  12.85 degrees of pitch, which puts the top of a 32-degree portrait frame
 *  3.15 degrees ABOVE the horizon — i.e. it reproduces, deliberately and
 *  identically in all five worlds, the 11.9-15.3 degrees the follow spring's
 *  lag was producing by accident in four of them and never in Maple. */
const INTRO_OFF = new THREE.Vector3(0.62, 0.20, 0.62).normalize();
```

*(ii)* `src/prototype3d.ts:9308-9309`, immediately after the `steep` blend:

```ts
    const steep = THREE.MathUtils.clamp((R - 2.5) / 5.5, 0, 1);
    camOffset.set(0.62 + (0.45 - 0.62) * steep, 0.92 + (1.4 - 0.92) * steep, 0.62 + (0.45 - 0.62) * steep).normalize();
+   // THE ESTABLISHING SHOT IS A MOVE, NOT A LAG. tmpV below is already a
+   // correct crane — camera on the orbit of whatever it is looking at — so if
+   // camera.position ever equalled it the axis would be a constant 46.4/225
+   // for the whole intro. It never does: the spring at :9352 has a 0.2s time
+   // constant and starts 150-200 units from a target moving at speed, and THAT
+   // lag is the entire 45-degree pitch swing and 70-115-degree azimuth swing,
+   // including a 5-11 degree pitch overshoot and a 38-68 degree azimuth
+   // overshoot at t=1.5-2.3s that lands Pirate on open water (qa/out/opening/
+   // pirate_f20.png) and Lantern on bare dirt (lantern_f48.png). Proved by
+   // A/B: seed camFollow onto the orbit and the pose snaps to 45.3/45.6.
+   // So the move is authored here and the camera is put exactly on it.
+   if (introT > 0) {
+     const k = Math.max(0, Math.min(1, introT / COPY.introLen));
+     camOffset.lerp(INTRO_OFF, k * k * (3 - 2 * k)).normalize();
+   }
```

and at `src/prototype3d.ts:9352`:

```ts
-   camFollow.lerp(tmpV, 1 - Math.exp(-5.0 * dt));
+   // during the intro the camera IS the authored move; the spring resumes the
+   // frame the move lands, and lands ON its own target, so there is no pop
+   if (introT > 0) camFollow.copy(tmpV);
+   else camFollow.lerp(tmpV, 1 - Math.exp(-5.0 * dt));
```

Result: a deterministic three-parameter move — `camDist` on its existing
quadratic, the look point on its existing landmark hand-over, and the rig angle
easing from the crane to the gameplay diagonal. No ring, no lag, identical every
load, and **Maple gets an establishing pose for the first time** even before P4
gives it a landmark.

**P2-A, the fallback branch** if the owner refuses the sky work: drop *(i)* and
*(ii)*, keep only the `camFollow.copy(tmpV)` line. The intro then holds pitch
46.4 / azimuth 225 throughout — photographed at `lantern_ab_unlagged.png` and
`pirate_ab_unlagged.png`. It is coherent, it shows the planets, and it costs
Lantern's landmark 5.1× of its brightness.

**What else reads `camOffset`, checked before proposing this.** The steering
basis (`:8613`, `:9000-9003`) and the spawn-corridor sweep (`:6318-6321`) use it,
and every one of them depends only on the **x : z ratio**, which `INTRO_OFF`
holds at 0.62 : 0.62 exactly as the play offset does — so screen-forward stays
on the same world diagonal and the 45-degree steering bug that `pace.mjs` once
had cannot come back through this. `:6318` also reads `camOffset.y`, but it runs
inside `validateWorld()` at world build, not during a match (see §9, lead 9).
The intro damps control velocity by `0.9^(dt*60)` throughout regardless
(`:8452`), and shadows are off for the whole shot (`:9263`), so a lower rig adds
no shadow pass.

**P2-B is blocked on P3.** Landing the low crane in Pirate and Game Day without
the sky ships a black band over a sunlit world in all five worlds instead of
two. Do not land P2-B alone.

### P3 — the horizon band (the sky; the owner's "sure if you can make it beautiful", asked of the right camera)

The visible slice at the opening beat is the equirect dome's **equator**, and
there the painting is a flat fill. `scene.background` is built at
`island.ts:494-578` (the canvas fallback, installed at `:579-580`) and replaced
at `:632-666` (the painted nebula, tinted per world through a `'color'`
composite and installed at `:663-664`). **Add a horizon
band in both passes, in the same canvas op that already runs there.**

Geometry of it: with `EquirectangularReflectionMapping`, v = 0.5 is the horizon,
so the horizon is row H/2 and +15° of elevation is row H/2 · (1 − 15/90) — on the
1024-high fallback canvas, rows 512 and 427; on the painted crop, which is
`src.height` high (1344 for the shipped asset), rows 672 and 560. Paint a
full-width `createLinearGradient` from the world's horizon colour at the horizon
row to transparent at the +15° row, composited `'lighter'`, in the same pass that
already tints the painting.

Per-world starting palette — **a starting point for a photograph, not a
decision**, exactly as decision 4 requires:

| world | horizon colour | what it is |
|---|---|---|
| pirate | `#2e6f8c` | sea haze. This world is daylight and needs distance, not space |
| gameday | `#6b2f4e` | the magenta dusk `SKY_MOOD` already claims and `bgI 0.34` deletes |
| lantern | `#3a2a5e` over a low `#5a3a2a` | the market's own glow spilling onto the sky |
| powder | `#3f6aa8` with a green lift above | the aurora the `SKY_MOOD` comment promises and the frames do not show |
| maple | `#4a2f6e` | autumn dusk violet, the reference sky's own hue |

Cost: one gradient fill on a canvas that is already being composited at load.
Zero draw calls, zero triangles, zero seeded draws, no new download.

**The invisibility claim this patch makes, stated the way the ledger now
demands:** the band lives between 0° and +15° of elevation. The steady-state
camera's frame top runs −29.9° (spawn, camDist 38) to −49.6° (VOID TITAN, pitch
65.6°) across the **full 26–340 follow-distance range**, so the band cannot
appear in gameplay at any radius; it is visible **only during the intro's first
~0.3–0.6 s**. That claim is exactly the kind this repo has been burned by three
times, so the probe in §7 must verify it by measurement at both ends of the
radius range rather than by this paragraph.

**Also unmeasured and required before landing:** the bloom threshold. A brighter
horizon band feeds the composer, and nobody has checked what it does to
`qa/skypop.mjs`'s halo A/B or to the lamp bloom in Lantern.

### P4 — Maple Falls gets an establishing shot

`src/prototype3d.ts:1298`. Maple is the only world with `hero: null`, and it is
also the only world whose finale landmark is named, cued and eaten — the ledger
added `heroCue` / `heroCueNews` / `heroGone` / `heroName: 'The Town Hall'` in
the same file. **The building the match builds toward should be the building the
match opens on.** `island.ts:6466` places it: `landmark(MS.makeTownHall(),
SQ_CX, SQ_HALL_Y, 6.5, 0, 'town hall')` with `SQ_CX = 6855` (`:208`) and
`SQ_HALL_Y = 4640` (`:209`).

```ts
-   newsGap: [16, 8], signOn: 6, hero: null, introLen: 2.2,
+   newsGap: [16, 8], signOn: 6,
+   // THE TOWN HALL, in 3D: island.ts:6466 places it at world (SQ_CX 6855,
+   // SQ_HALL_Y 4640) and the world-to-3D transform is (v - 6000) * 0.05.
+   // Maple was the one world with no establishing shot — and the one world
+   // whose opening frame is therefore an arbitrary mid-zoom of grass with a
+   // two-pixel mascot in it (qa/out/opening/maple_f01.png). It is world 1.
+   hero: [(6855 - 6000) * 0.05, (4640 - 6000) * 0.05],
+   // 2.2 was tuned for a shot with no subject. Every other world's introLen
+   // was set by looking at the shot; this one has to be too. 2.8 is where to
+   // start — long enough to read a hold-and-travel, still finishing under the
+   // 4.2s title card — and it is a number to photograph, not a number to trust.
+   introLen: 2.8,
```

**P4 is blocked on P1 and P2.** Giving Maple a landmark today would give Maple
the ring as well, since the ring is caused by a look point offset from the orbit
centre and Maple is currently spared only because it has none.

### Flagged, not proposed — the HUD

The establishing shot renders with the **entire match HUD** up from frame 1: the
score chip, the 3:00 clock, the star count, the home button and the growth bar
reading VOIDLING 1m / NEXT MUNCHKIN. It is in every frame in `qa/out/opening/`.
Whether a 3.5-second cinematic under a title card should carry all of that is a
taste call, and the clock in particular is genuinely informative to a child. I
am recording it as seen and leaving the decision alone. In Lantern it also
half-covers the brightest object in the sky (`lantern_f01.png`, x 100–190).

---

## 8. THE PROBE — `qa/opening.mjs`, and the numbers it fails on today

One probe, five printed verdicts, the fifth live only once P3 lands (silence is
a FAIL; `qa/gate.mjs`'s rule). It steps the render loop as described in §1, so it
reads one identified frame at a time and never samples a 21-degree band, and it
carries no copy of what it measures: the camera comes from
`__cam.getWorldDirection()`, the intro's progress from `__matchState().camDist`,
and the colour from a screenshot of the canvas.

**Bar 1 — REPEATABILITY.** Intro frame 1 must be the same shot on match 2 as on
match 1: |Δpitch| ≤ 0.5°, |Δazimuth| ≤ 0.5°, |Δcamera Y| ≤ 2 units, in all five
worlds. *Today, Lantern: **Δpitch 17.60°, Δaz 4.41°, ΔcamY 152.0**. FAIL.*

**Bar 2 — NO RING.** Across the intro, pitch must never exceed the steady-state
45.9° by more than 1.0°, and |azimuth − 225°| must never be larger than it was
on the previous frame. *Today: pitch peaks 50.90° / 55.81° / 56.44° / 57.09°
(pirate / gameday / powder / lantern), and |Δaz| grows from 32.6–47.2° at frame
1 to 37.5–67.6° at t ≈ 1.5–2.3 s. FAIL in four worlds; Maple passes trivially,
which is what a world with no establishing shot looks like.*

**Bar 3 — THE SKY IS A SKY.** In the SKY window at intro frame 1, luminance
range (P95−P5) ≥ **0.06** in every world whose frame shows sky. *Today: pirate
0.0036, gameday 0.0034, lantern 0.0061, powder 0.0077. FAIL, all four, by 8–18×.*
The bar is **CHOSEN**, and its only defence is the two numbers it sits between,
both of them this repo's own: **0.008**, which `OWNER-2026-08-25.md` §6 calls "a
flat fill, not a sky", and **0.698**, the range the same document reports for the
sky it accepts as fixed — measured over a large sky region at radius 10 by a
coastline. A narrow slice just above a horizon is smooth by nature and cannot be
asked for 0.698, so the bar sits near the floor: 7.5× the flat-fill number and
about a twelfth of the accepted one. A skeptic who wants a different multiple has
the frames and the window to argue with. What is not arguable is **0.0034**.

**Bar 4 — NO NIGHT SKY OVER A DAYLIT WORLD.** ground : sky mean-luminance ratio
at intro frame 1 ≤ **12×**. *Today: gameday **110.2×**, pirate **64.2×**, powder
35.7×, lantern 10.2× (pass). FAIL in three.* The bar is derived, not invented:
Lantern is the world where a near-black sky is the correct answer and it
measures 10.2×; no world may sit further from its own sky than the one where
that separation is deliberate, plus a little headroom.

**Bar 5 — the band stays out of gameplay** (only if P3 lands). Sample the SKY
window at `camDist` 38 and at 340, in all five worlds, and assert the horizon
band contributes nothing at either end. Stated because invisibility claims in
this repo have now been wrong three times for assuming one camera position, and
a fourth time — this week — for assuming one camera.

**Cost check, on the existing instrument.** `prototype3d.ts:9256` records the
opening frame at 4,694 draw calls and 1.40M triangles on Game Day against 1,241
and 355k in settled play — that is the file's number, not one this crew ran.
Re-measure it with `qa/lnperf.mjs` before and after P2, because the crane pose
changes what is inside the frustum on the most expensive frame in the game.

---

## 9. WHAT THIS CREW DID NOT ESTABLISH

Listed so a skeptic does not have to find them.

1. **The true first frame on a 60 fps phone.** Everything above starts at
   t = 0.05 s, because swiftshader's first frame advances a full clamped `dt`. A
   phone renders about three frames before that. The spring will have closed
   less of its gap, so the camera is *lower* and the horizon *higher* than
   anything photographed here. Unmeasured, and I make no number for it.
2. **The match-2 test ran in Lantern only**, and grew the void with
   `__setVoidR(9)` rather than by playing a match.
3. **The bathhouse boxes were hand-drawn per pose** and cover different areas.
   The bias runs against the claim (the high box includes lit plaza), not for it.
4. **Star occlusion.** 28–41 stars are in the *frustum* at frame 1; how many are
   behind the island is not measured. The visible count in the frames is lower.
5. **Bloom.** No measurement of what a brighter horizon band does to the
   composer, the halo A/B, or Lantern's lamps.
6. **Frame cost of any proposed pose.** Not measured. Bar 5 and the `lnperf`
   check exist for exactly that reason.
7. **The P3 palette is a starting point for a photograph.** Five hex values
   chosen by eye against each world's own `SKY_MOOD` tint. The owner's condition
   on decision 4 was photographs first, and none of these has been rendered.
8. **The title card was never composited onto the opening beat.** Its real
   opacity at t = 0.05 s is about 8% by the `cardFade` keyframes; I hid it
   rather than reconstruct a curve I would then be quoting as evidence.
9. **A LEAD, NOT A FINDING — `validateWorld()` may read a stale `camOffset`
   too.** `prototype3d.ts:6318-6321` clears props out of the opening sight-line
   using `camOffset`, in the pass whose own comment opens *"The opening is
   hand-authored and identical every load, so whatever sits in the first frame
   sits there forever."* It runs once at world build, and `camOffset` is the
   same mutable module vector §4 shows carrying across a match — its x : z ratio
   is constant, but the `camY / camH` slope that sets the width of the cleared
   wedge is 1.049 at the play offset and 2.20 at the fully steepened one. So a
   world built straight after a big-void match may clear a narrower corridor
   than the same world built cold. **I did not measure this and I am not
   claiming it happens** — the call order of `launchWorld`, `resetMatch` and
   `validateWorld` decides it and I did not trace it. It is the same class as §4
   and P1 would likely close it; somebody should point a probe at it.

---

## 10. THE FRAMES — every one, by path

All in `qa/out/opening/`, 430×932, DPR 1, quality rung 0, HUD as shipped, title
card hidden except where noted. `fNN` is the intro frame index; frame 1 is the
opening beat and each frame is 0.05 match-seconds.

**The opening beat, five worlds — start here.**
`maple_f01.png` · `pirate_f01.png` · `gameday_f01.png` · `lantern_f01.png` ·
`powder_f01.png`

**The measurement windows drawn on the frame** (red = SKY y 110–285, green =
GROUND y 520–760): `<world>_f01_windows.png`, five files.

**The swing, per world** — f01, f02, f03, f06, f12, f20, f32, f48 at
t = 0.05, 0.10, 0.15, 0.30, 0.60, 1.00, 1.60, 2.40 s, plus the last intro frame
and a settled gameplay frame at t = 8 s:
`<world>_f{01,02,03,06,12,20,32,48}.png`, `<world>_f<NN>_end.png`,
`<world>_steady.png`. Maple and Pirate have no f48 — their intros are 2.13 s and
2.15 s, i.e. 43 frames, so they end before it.

**The frames the ring lands on** — described, not measured, because what is
wrong with them is composition: `pirate_f20.png` (t = 1.00 s — almost the whole
frame is open water with three small boats in it), `pirate_f32.png` (t = 1.59 s
— near-black slabs and pillars cutting across the frame at the pier),
`lantern_f48.png` (t = 2.40 s — bare brown dirt filling most of the frame).

**The title card over the shot**, at t = 0.60 s where its real opacity is 1.0:
`<world>_f12_card.png`, five files.

**The second match:** `lantern_match1_f01.png` against `lantern_match2_f01.png`.

**The A/B with the spring's lag removed:** `lantern_ab_unlagged.png`,
`pirate_ab_unlagged.png`.

**Crops, so the three close readings can be checked:**
`pirate_f01_join.png` (the daylight/night join at 2×) · `lantern_f01_blob.png`
(the nebula smudge behind the score chip at 3×) · `lantern_box_low.png` and
`lantern_box_high.png` (the bathhouse at both poses, the boxes the 5.1× was
measured in).

**Per-frame camera logs:** `<world>_log.json` — every stepped frame's t,
camDist, radius, camera position, pitch, azimuth, fov, frame-top elevation and
horizon position, plus the shot list.
