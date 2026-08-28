# VERDICT: KILLED

**Decision 4, "sure if you can make it beautiful". Nothing here lands.**

The proposal rests on one sentence, and I measured it false on the shipped
build:

> "The pitch does not change during any of this … the frame's elevation band is
> fixed at **−30.4° (top) to −62.4° (bottom)** throughout."

It is not fixed. Sampled off `__cam.getWorldDirection()` every rendered frame of
the real establishing shot, against `dist/` on the running preview at 4177, with
no patch applied:

| world | pitch at the opening beat | frame band there | peak pitch | reaches 46.4° at |
|---|---|---|---|---|
| **lantern** | **11.8°** | **−4.2 … −27.8** | 57.0° | introT 1.02s |
| **powder** | **15.3°** | **−0.7 … −31.3** | 56.4° | introT 1.00s |
| maple | 46.2° | −30.2 … −62.2 | 46.3° | (fixed all through) |

The camera's optical axis swings **45 degrees** during a 3.5-second shot. At the
beat the proposal photographs, the top of the Lantern frame is **4.2° ABOVE the
horizon** — the horizon is on screen, which `island.ts:707`, `island.ts:772` and
`OWNER-2026-08-25.md` all state never happens in any world at any size. And the
camera is **75 units up**, not the 217 the proposal's model requires
(`0.7239 × 300`), a factor of 2.9.

**Where that leaves the two proposed bodies.** Screen position of a body at a
fixed elevation is `(|el| − (pitch − 16)) / 32` down the frame. Measured through
the shipped shot:

| introT | 0.05s | 0.15s | 0.30s | 0.50s | 0.85s | 1.05s | 1.25s | 1.45s | 2.0s | 2.8s | 3.0s |
|---|---|---|---|---|---|---|---|---|---|---|---|
| lantern body (−34.6) | **121%** | 83% | 47% | 26% | 16% | 12% | 3% | **−7%** | −20% | −1% | 7% |
| powder body (−35.5) | **113%** | 73% | 41% | 25% | 18% | 14% | 7% | **−7%** | −15% | 7% | 12% |

At the beat the photograph plan calls "the opening beat" — the frame the owner
is shown, the frame the crew's four judged images are taken at — **both proposed
bodies are off the BOTTOM of the frame and cannot be seen at all.** They enter
from the bottom at introT ≈ 0.10s, climb the entire height of the frame over the
next 1.2 seconds, exit off the TOP at introT ≈ 1.35–1.45s, and re-enter from the
top for the last half-second. That is not "one calm shape over the world's edge,
at the moment the camera is highest and the child has not touched anything." It
is an object that traverses the frame corner to corner.

**The cause is in the file the proposal read.** `camFollow` is a lag spring
(`prototype3d.ts:9323`, `camFollow.lerp(tmpV, 1 - Math.exp(-5.0 * dt))`). At
introT = introLen the hero hold is at full strength (`e = 1`), so the look point
teleports to the landmark in a single frame — **382.9 units in Lantern** (spawn
`(31, 207.5)` → hero `(14, −175)`) and 277.7 in Powder. The spring needs ~1.0
match-second to catch up, and for that second the camera trails the subject low
and far back, so the axis is shallow. The proposal quotes this exact line in its
own probe ("camFollow closes ~22% of the gap per frame at dt 0.05
(prototype3d.ts:9274)") and then leaves the spring out of the camera model it
built everything on.

**And the instrument hides the defect it would have to expose.** `__pinIntro(u)`
freezes `introT`, which freezes the spring's *target*; the probe then explicitly
waits for `camFollow` to converge on it (`d < 0.05`). Convergence is the one
state the shipped shot never reaches. So §6's five-world falsifier — offered as
"the test of me", the readings that would void the proposal — **would clear on
the pinned build precisely because the pin manufactures the pose the numbers
were computed for.** A self-test that only its own instrument can pass is not a
self-test. Patch 1c's comment, "That is the frame, not a doctored one," is false
in the single dimension the proposal turns on.

**So the answer to the owner's condition is no.** He said photographs first, he
sees them, nothing lands without that. This plan would put in front of him two
pairs of stills of a camera pose the game does not render — 46.4° at 300 units,
when the measured shot is 12–15° at ~360 units or 46.8° at ~190 units and never
both — showing a body at y 13–17% that is at y 113–121% in the frame those
stills claim to be. He would be judging a photograph of something else. That is
flattery by construction, not by taste, and it is the reason this is KILLED
rather than corrected.

**Maple is the tell.** It is the only world with `hero: null`, so its look point
never teleports and its pitch really is nailed at 46.0–46.3 for the whole intro
(measured). The proposal's camera model is exactly right for the one world it
says "CANNOT", and wrong for all four it makes claims about. The four worlds it
tables are the four with a hero pan.

**What survives and should be refiled.** The seeded-draw accounting is correct
and I verified it independently — zero delta on every stream in every world.
Patch 1's four anchors are all present and unique on disk. The triangle and
draw-call cost is genuinely nothing. The `size × 0.8` disc correction is right.
The `_hud` twin frames are the best idea in the document. None of that is enough:
the art is placed for a camera that does not exist.

---

## What I checked on disk

Repo at `b55b638`. Working tree carries the rival-surge edits to
`src/prototype3d.ts` and `src/proto3d/rivals.ts`; I diffed them and **none touch
the camera block (`:9224–9330`)**, so `dist/` (built 09:06) and the working tree
agree on everything below and the measurement is valid for the code being
patched.

**The camera, read rather than accepted.**
- `src/prototype3d.ts:9223–9253` — `targetDist`, the intro block, `introT -= dt`,
  `k2 = max(0, introT / COPY.introLen)`, `camDist = 38 + 262 * k2 * k2`,
  `targetDist = camDist`. Confirmed the smoothing on `:9276` is a no-op while the
  intro runs, so the **scalar** `camDist` is exactly `38 + 262·k2²`.
- `:9262–9274` — the hero hold. `u = introT/introLen`, `q = clamp((u−0.25)/0.5)`,
  `e = q²(3−2q)`, `introHX/introHZ = (hero − void)·e`. At `u = 1`, `e = 1`, so the
  look point **is** the landmark on frame one. This is the teleport.
- `:9279` `steep = clamp((R − 2.5)/5.5, 0, 1)` and `:9280` the `camOffset` lerp.
  Confirmed `steep = 0` at spawn radius and `normalize(0.62, 0.92, 0.62)` gives
  46.376°; `normalize(0.45, 1.4, 0.45)` gives 65.56°. Those two numbers are right.
- **`:9323` `camFollow.lerp(tmpV, 1 - Math.exp(-5.0 * dt))` and `:9324`
  `camera.position.copy(camFollow)`, against `:9325 camera.lookAt(lookX, R * 0.5,
  lookZ)`.** The position is smoothed and the look target is not, so the optical
  axis is `lookPoint − camFollow` and is only `−camOffset` once the spring has
  converged. This is what the proposal omits.
- `camFollow` is seeded once, at `:9663`, and is **not** re-seeded by
  `startMatch` (`:6495–6497` sets `voidState` and `camDist = 50`, nothing else).
  I modelled the most favourable seed (on the ray at 50 units) and the
  measurement confirmed it.
- `:585` `new THREE.PerspectiveCamera(32, aspect, 1, 1000)` — vertical FOV 32,
  far plane 1000. At 430×932 the horizontal field is
  `2·atan(tan(16°)·430/932) = 15.075°`, and the **top-corner** ray is at −30.11°,
  not the centre-column −30.38°. The proposal's −30.1 is the corner and is the
  more careful number; `island.ts:707` and `island.ts:772` both say "about 27
  degrees" and are wrong by 3°.
- `:8298 dt = Math.min(0.05, dtRaw)`. I re-ran the integration at dt = 0.05 (the
  swiftshader clamp) and at 1/60 and got the same swing, so this is not a
  frame-rate artefact.

**The sky, read rather than accepted.**
- `src/proto3d/island.ts:831–861` `SKIES`, and `:862–916` `paint()`. I read
  `paint()` line by line: **no random call of any kind** — gradients, `arc`,
  `ellipse`, `fillRect`, all off `bd`'s own fields. `:917–934`, the placement
  loop, reads only `bd`. The proposal's zero-draw claim is correct.
- `R = S * 0.40` on a 512 canvas at `:865`, so the painted disc is `size × 0.8`.
  Re-derived every angle from the table: giants 6.99 / 7.98 / 7.52 / 7.01 / 7.98°,
  moons 2.22 / 2.22 / 2.50 / 3.02 / 2.51°, proposed 5.233° and 5.599°. All match.
- `:3483–3486` — the celestial layer re-centres on the camera each frame, so a
  body's screen position is a pure function of camera **orientation**. That is why
  the pitch error is fatal rather than cosmetic.
- `:766` `starField.frustumCulled = false`; `:709` `ph = rand(0.15, Math.PI*0.95)`
  with `rand` = `Math.random`. The star field is unseeded and re-shuffles every
  load, in the same two worlds the before/after pair is shot in.
- `sp.userData.planet = true` at `:931` — the probe's tag exists.

**Patch 1's anchors** (all present, all unique):
`__pinQuality: (n: number | null) => void;` (`:1646`);
`_dbg.__quality = () => ({ level: qLevel,` (`:1872`, once);
`let introT = 0, outroT = 0;` (`:5373`, once); `introT -= dt;` (`:9225`, once).
`const COPY = WORLD_COPY[pickedWorld]` is at `:1419` and
`Object.assign(window, _dbgStore)` at `:9668`, both correctly ordered, so
`window.__pinIntro` would reach a probe. Patch 1 works. It measures the wrong
thing.

**Spawns and heroes**, read from source rather than taken from the document:
`LN_SPAWN [6620, 10150]` (`lantern.ts:218`), `PW_SPAWN [6300, 7900]`
(`powder.ts:241`), `GD_SPAWN [5950, 8810]` (`gameday.ts:296`), pirate
`(6950, 10560)` and `MAPLE_SPAWN [6469, 5240]` (`island.ts:229–236`), through
`w(v) = (v − 6000) · 0.05`; heroes from `WORLD_COPY` (`:1273`, `:1329`, `:1360`,
`:1383`, `:1405`). Lateral teleport at the opening beat: lantern 382.9, pirate
352.1, gameday 280.5, powder 277.7, **maple 0**.

**The HUD**, `index.html`: `#board` `left ~10px, max-width 38vw, max-height 152px`
(`:150`) → occupies x 0–40%, y 1–17.4%. `#timer` `left: 42vw; right: 8px;
text-align: center` (`:120`) → its glyphs centre at **x ≈ 70%**, y 1.3–5.6%.
`#titlecard` `radial-gradient(ellipse 78% 34% at 50% 50%)` with
`justify-content: center` (`:567–571`) → the scrim is transparent above
y = 50% − 0.78·34% = 23.5%, and the card's text is vertically centred. The
proposal's titlecard reading is right.

**Measurement, at radius and at introT — stated as the standing rule requires.**
`qa`-grade probe run read-only against the already-running preview on 4177, no
build, no patch, three worlds, sampling `__cam.getWorldDirection()` and
`__matchState().camDist` on every rendered frame from the first frame with
`camDist > 250` to the end of the intro (61 / 60 / 38 frames). Script lives
outside the repo, in the session scratchpad; it is not committed and this verdict
is the only file I wrote. The proposed bodies' on-frame share **across the void's
whole radius range**, computed with the `R·0.5` look-target term the proposal
omits: 100% for R ≤ 3, then lantern 68% / 22% / 0% and powder 85% / 44% / 6% at
R = 3.5 / 4 / 4.5, and **0% for both at every R ≥ 5, through VOID TITAN**.

---

## Corrections (verbatim)

Each correction is the exact text that must replace the exact text quoted. A
refile that keeps any of these sentences is refiled with a known-false premise.

**Correction 1 — §1. The intro pitch. This is the kill.**

The proposal says:

> "The pitch does not change during any of this. `camOffset` is rebuilt every
> frame from `steep = clamp((R - 2.5) / 5.5)` (`:9230`), which is **0** at spawn
> radius, so the rig is `(0.62, 0.92, 0.62).normalize()` and the optical axis is
> **46.4° below horizontal, azimuth 225°, for the whole opening move.** The
> camera sits at `lookPoint + camOffset * camDist` and looks at the look point
> (`:9263-9276`), so distance is the only free variable and the frame's
> elevation band is fixed at **−30.4° (top) to −62.4° (bottom)** throughout."

Replace with:

> The pitch changes by forty-five degrees during the opening move, and the
> camera never occupies the pose this proposal is written against. `camOffset`
> is 0-steep at spawn radius, but `camera.position` is not
> `lookPoint + camOffset * camDist` — it is `camFollow`, a lag spring
> (`prototype3d.ts:9323`, `camFollow.lerp(tmpV, 1 - Math.exp(-5.0 * dt))`), and
> `camera.lookAt` on the next line is not smoothed. On frame one the hero hold
> is at full strength, so the look point teleports to the landmark — 382.9 units
> in Lantern, 277.7 in Powder — and the spring needs about one match-second to
> arrive. Measured on the shipped build: Lantern's optical axis runs
> **11.8° → 57.0°** and Powder's **15.3° → 56.4°**, so the frame's elevation
> band at the opening beat is **−4.2 … −27.8 (Lantern)** and **−0.7 … −31.3
> (Powder)** — the horizon is inside the frame — and it reaches −30.4 … −62.4
> only at introT ≈ 1.0s, by which time the camera is ~190 units from its
> subject, not 300. Maple is the exception and the proof: it is the only world
> with `hero: null`, its look point never teleports, and its pitch is fixed at
> 46.0–46.3 throughout.

**Correction 2 — §1. The ground-reach arithmetic.**

> "With the top-of-frame ray at 30.4° below horizontal from a camera `0.7239·D`
> high and `0.6900·D` back, the ray meets the ground **0.5437·D beyond the look
> point**. … At the opening beat (D = 300) it is **163 units**"

Replace with:

> At the opening beat the camera is **75 units** high, not `0.7239 × 300 = 217`,
> because the follow spring has not arrived — measured, both worlds. The
> `0.5437·D` relation holds only after the spring converges, and at that moment
> D is ~190, giving a reach of ~103 units past the subject rather than 163. No
> instant in the shipped shot has both the 46.4° axis and the 300-unit distance,
> so every sky share in the table below was computed for a frame the game does
> not render.

**Correction 3 — §1 and §2c. Consequently, every table derived from that pose.**

The five-world sky shares ("maple 0.0% · gameday 10.2% · lantern 20.8% ·
powder 26.8% · pirate 29.3%"), the sky elevation bands, the "sky gone by"
column, the §2 body-visibility grids, the §3 per-radius tables, the "0.6–1.2
seconds long" duration, and the whole `── THE SPAWN BAND, WHICH IS A DIFFERENT
BAND ──` comment proposed for `island.ts` are all computed at pitch 46.4° and
camDist 300 and must be struck. Any refile recomputes them **as a function of
introT**, against the measured pitch curve, or does not state them.

**Correction 4 — §9, risk 2.**

> "The body's screen position depends only on the camera's *orientation*, which
> is fixed at 46.4°/225° during the whole intro, so it does not drift with
> camDist — that part is safe."

Replace with:

> The body's screen position depends only on the camera's orientation, and the
> orientation is the thing that moves. Measured on the shipped build, a body at
> −34.6° enters from the BOTTOM of the frame at introT ≈ 0.10s (it is at y 121%
> — off frame — at introT 0.05s), climbs the full height of the frame over the
> next 1.2 seconds, leaves off the TOP at introT ≈ 1.35s, and re-enters from the
> top for the final half-second. A body at −35.5° does the same, entering at
> y 113%. Nothing about this is safe; it is the whole design question.

**Correction 5 — §3, patch 1c's comment, and §8.**

> "NOTE what stays true while it is pinned, because it is what the shot really
> renders … That is the frame, not a doctored one."

Replace with:

> `__pinIntro` freezes `introT`, which freezes the follow spring's TARGET, and
> the probe that uses it then waits for `camFollow` to converge on that target.
> Convergence is the one state the shipped establishing shot never reaches, so a
> pinned frame is not the shot: it is the shot with its defining transient
> removed. Shadows, controls and banners are honestly reported, and the camera
> pose is not. Any photograph taken this way must be labelled as a synthetic
> pose, and the frames a decision is made on must be taken with the spring
> running.

**Correction 6 — §6. The self-test is disarmed by its own instrument.**

> "On the **unpatched** build it must roughly reproduce these five sky shares at
> the pinned opening beat, or this proposal is void and should be killed rather
> than corrected"

Replace with:

> Those five sky shares were computed for the pinned pose, and the probe pins
> before reading, so the probe reproduces them by construction on any build. The
> falsifier can only bite if it samples the UNPINNED shot at named values of
> introT. As written it cannot fail, and I am invoking the sentence's own
> conclusion: the pose is wrong, so the proposal is void.

**Correction 7 — §8A. The control's stated reason is false.**

> "because at r=4 no sky is on screen to hold a new body"

Replace with:

> The recorded 0.0% sky figure is at SPAWN size (r ≈ 1), not at r = 4. At r = 4
> the pitch is 51.8° (including the `R · 0.5` look-target term, which this
> proposal omits) and the frame covers −35.8 … −67.8, so **22% of the Lantern
> disc and 44% of the Powder disc are inside the frustum** and only terrain
> occlusion keeps them out of `shippedlook`. Geometry does not predict those two
> frames are identical, so "if `lantern_look` or `powder_look` changes, patch 2
> is wrong" is a rule that can fire on a correct patch. The bodies are off frame
> at every radius from 5 up, through VOID TITAN — that is the claim the control
> can actually carry.

**Correction 8 — §3, the probe's ceiling.**

> `const FLOOR = 0.0, CEIL = 20.0;`
> "The ceiling is the recorded disaster: an 18-degree body measured 58.3% of the
> frame (island.ts:807-814). 20% is a third of that"

Replace with:

> A 5.23° disc is 4.5% of a 430×932 frame and a 5.60° disc is 5.2%; those are the
> numbers the ceiling must be set from. The recorded disaster was a body sized
> against the 32° VERTICAL field instead of the 15.07° horizontal one — repeat
> that exact error on a 5.23° body and it renders at 11.1°, which is **20.5% of
> the frame**. A ceiling of 20.0 therefore sits half a point above this repo's
> own recorded failure mode, and §9 risk 6 says the A-B-A census under-reports
> (it reads 3.6% where two shipped bodies are geometrically worth ~9%), so the
> reading would arrive near 8% and pass comfortably. The ceiling is inert against
> the one mistake that has actually been made here. Set it from 4.5%, not 58.3%.

**Correction 9 — §4 and §8B. The unseeded before/after.**

Add, verbatim, to the photograph plan:

> Lantern and Powder run on `Math.random`, and so does the star field
> (`island.ts:709`). The `_before` and `_after` frames will therefore differ in
> the crowd, the props and every star as well as in the sky. GOVERNOR ledger #17
> already retracted a Lantern before/after on exactly this ground — "the shoot is
> not pixel-deterministic, the two frames have different compositions". State
> what is held fixed between the pair and what is not, or the pair is not
> evidence.

**Correction 10 — §2, the HUD arithmetic.**

> "`az AZ + 0.055` (both): … +0.055 rad puts the centre at **x ≈ 68%** of the
> frame."

Replace with:

> 0.055 rad is 3.151°, and screen x is
> `0.5 + 0.5 · tan(3.151°)/tan(7.5375°) = 70.8%`. That is further from `#board`
> (x 0–40%) and is the correct direction for the argument, but it is also
> directly under `#timer`, which is `left: 42vw; right: 8px; text-align: center`
> and centres its glyphs at x ≈ 70%, y 1.3–5.6%. The body's upper limb reaches
> y ≈ 6%. They touch.

**Correction 11 — the two comment fixes that are right and are worth landing on
their own, with no art attached.**

The `size × 0.8` finding is correct: `paint()` draws at `R = S * 0.40`
(`island.ts:865`), so `island.ts:812–814`'s "7-8 degrees" describes the sprite
and not the disc. And `island.ts:707` and `island.ts:772` both say the highest
thing on screen is "about 27 degrees below horizontal"; the top-corner ray at
steep 0 is **−30.11°** and the top-centre ray is −30.38°. Both are one-line
comment corrections with zero draws, zero triangles and no photograph condition
attached, and they should be filed separately rather than buried in a patch that
died.

---

### What a refile has to do

Not "raise `el` by 2–3° and re-shoot" (§9 risk 1). The elevation a body needs is
a **function of introT** across a 45° sweep, and no single elevation is right for
more than about a fifth of the shot. A refile either (a) accepts that a
fixed-elevation body crosses the frame bottom-to-top in 1.2 seconds and argues
*that* is the beat, with frames at introT 0.1 / 0.3 / 0.6 / 1.0 / 1.4s taken with
the spring running, or (b) proposes moving the camera, which §7(a) already prices
and correctly declines. What it may not do is place art for a pose that four of
five worlds never hold.

The owner asked for beautiful and said photographs first. He is owed frames of
the shot the game actually renders, at named points on its own curve, before any
body is placed in it.
