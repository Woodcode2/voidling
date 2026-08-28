# VERDICT: SPLIT — P0 and P1 land with corrections. P3 is KILLED. P2-B is KILLED as filed. P4 waits.

*Skeptic, 2026-08-28. Repo at `6a424e6`, working tree clean of tracked edits
(`git status` shows only the crew's own untracked additions plus this file).
I wrote one file: this one. Everything below was run against `dist/` on the
preview already up on 4177, against the crew's own saved frames, and against a
detached `git worktree` for the typechecks.*

I opened the frames — eighteen of them, plus a 5× crop I cut myself — and I
shot my own camera log on a second instrument rather than trusting theirs. The
pictures are the best part of this document and two of them refute sentences
in it.

---

## THE SHORT VERSION

**What is true and now independently confirmed.** The swing, the ring, the
azimuth overshoot, the cause, the sky measurements, the 5.1× bathhouse, the
zero-planets-on-screen finding, and — this is the important one — **P1 is
correct and provably sufficient.** I re-derived the crew's own headline number
(`camY 75.0` at intro frame 1) from the boot seed with a pencil, and it comes
out at **75.06** against a logged **75.0**. That arithmetic is what tells you
P1 works.

**What kills the recommended branch.** P3 paints a horizon band between
**0° and +15° of elevation**. At intro frame 1 the geometric horizon sits at
screen row **124 (lantern), 88 (pirate), 24 (gameday), 22 (powder)**, and the
band is everything ABOVE that row. The crew's own SKY measurement window starts
at row 110 and its own method discards everything above row 104 as HUD. So the
proposed band lands **entirely inside the strip the crew throws away** in three
of the four hero worlds, and reaches **14 rows** into the measured window in the
fourth. Under the recommended P2-B pose (pitch 12.85°) the horizon moves to row
**95**, and the band is inside the discarded strip in **all five worlds**.

**P3 cannot move Bar 3 or Bar 4 by any amount.** Game Day's 110.2× is 110.2×
after P3. Pirate's ratio does not move. The defect this proposal measured —
a near-black sky over a sunlit world, with a 64–110× step at the island's
silhouette — lives from the equator **DOWNWARD**, rows 110 to ~350. The patch
paints upward. They do not overlap.

And the proposal says, in its own words, **"P2-B is blocked on P3."** So the
recommended branch is blocked on a patch that cannot do the job it is blocking
for.

**What separately kills P2-B as filed.** `tmpV` is `camOffset·camDist + look`,
and `camOffset.x === camOffset.z` at every value the game ever gives it —
including `INTRO_OFF`, which the proposal is careful to keep at 0.62 : 0.62. So
`camFollow.copy(tmpV)` pins the optical azimuth at **exactly 225°, every frame
of the intro, in every world**. Today's opening beat is at azimuth **190.4°
(lantern), 177.9° (pirate), 192.4° (powder), 190.8° (gameday)**. P2-B therefore
swings the frame-1 bearing by **32.6° to 47.2°** and does **not** produce
`lantern_f01.png` — the frame the proposal calls "the best frame in this
repository" and builds branch B's whole recommendation on. There is no
photograph of the P2-B pose anywhere in `qa/out/opening/`, and the proposal
never says there isn't one.

That is the same failure the spawn-sky proposal was KILLED for yesterday
(`8187ed0`, `docs/crews/round-2b/spawn-sky.verdict.md`):
*"He would be judging a photograph of something else."*

---

## WHAT I RE-RAN, AND WHAT I ACCEPTED

**Re-ran, on the saved frames or from source (numbers below are mine):**

| what | crew | mine |
|---|---|---|
| gameday sky 110–285: mean / range / true black / ratio | 0.0026 / 0.0034 / 99.8% / 110.2× | 0.0026 / 0.0034 / 99.8% / **110.2×** |
| pirate | 0.0060 / 0.0036 / 60.8% / 64.2× | 0.0060 / 0.0036 / 60.6% / **64.2×** |
| powder | 0.0089 / 0.0077 / 8.1% / 35.7× | 0.0089 / 0.0077 / 8.0% / **35.7×** |
| lantern | 0.0081 / 0.0062 / 10.8% / 10.2× | 0.0081 / 0.0062 / 10.7% / **10.2×** |
| maple | 0.2173 / 0.3625 / 2.5% / 1.2× | 0.2176 / 0.3639 / 2.5% / **1.2×** |
| bathhouse low box mean / P95 / >L0.30 | 0.3151 / 0.8311 / 50.8% | 0.3123 / 0.8311 / **50.1%** |
| bathhouse high box | 0.0614 / 0.5229 / 6.6% | 0.0615 / 0.5229 / **6.5%** |
| gameday top strip 104–150, f01/f02/f03 (+f06/f12, mine) | 100 / 100 / 100 | **99.6 / 99.9 / 100** / 19.3 / 1.3% |
| powder top strip | 36 / 3 / 100 / 99 / 94 | **35.5 / 3.2 / 99.8 / 99.2 / 94.0%** |

Every row of §2's table (`pitch at f1`, `peak pitch`, `max Δaz`, `camera Y`)
re-derived from `<world>_log.json` and matches: peaks **57.09 / 50.90 / 56.44 /
55.81**, max |az−225| **55.2 / 67.6 / 37.5 / 39.6**, and the axis genuinely
crosses 225° at t = 1.00 / 0.70 / 0.95 / 0.90 s and comes back — I printed the
azimuth track and it goes −169.6 → −135 → **−80.0** → −130.9 in Lantern. §2b's
horizon-exit interpolations reproduce to the millisecond: **0.0554 / 0.0708 /
0.0551 / 0.0819 s**.

**And I shot my own, on a different instrument.** Not to check the arithmetic —
to check the instrument. My probe does **not** gate `requestAnimationFrame` at
all; it wraps rAF only to append a camera sample after each of the game's own
callbacks, then free-runs to the end of the intro, in a fresh browser, a fresh
profile and a fresh page load. Pirate Bay, against the same preview on 4177:

| | crew (stepped) | mine (free-running) |
|---|---|---|
| f1 t / camDist / camY | 0.05 / 288.23 / 74.2 | **0.05 / 288.23 / 74.2** |
| f1 pitch / azimuth | 13.08° / 177.79° | **13.08° / 177.87°** |
| f2 pitch / azimuth / camY | 20.11° / −175.79° / 102.1 | **20.11° / −175.74° / 102.1** |
| peak pitch | 50.90° @ t 1.00 | **50.91° @ t 0.98** |
| max \|az − 225°\| | 67.6° @ t 1.45 | **67.6° @ t 1.43** |
| settled, t > 2.6 | 45.90° / −135.00° / camY 27.5 / cd 38 | **45.93° / −134.93° / camY 27.6 / cd 38** |

**The stepping is not perturbing the shot, and neither is my wrapper.** Two
instruments, two page loads, agreement to **0.08° of azimuth and 0.01° of
pitch** at every point checked, including the two values my duty says must not
move — the settled pitch and azimuth.

One correction falls out of it, and it matters for the probe's header rather
than for any finding. §1 argues the gate is safe because *"under swiftshader
every frame already exceeds 50 ms, so `dt` is pinned at 0.05"*. **Not every
frame does** — my free-running log steps 0.05, 0.05, then **0.0316**, and
carries on irregular from there. The conclusion survives anyway, and there is a
better reason for it available in the same file: `dtw = dt` (`:8329`), so the
crowd, the rivals, the void and the camera all integrate the same clamped
delta, and the only `dtRaw` readers in `prototype3d.ts` are `perfFrame`,
`kitCd`, `fovKick` and the quality accumulator (`:8328`, `:9357`, `:9360`,
`:9634`) — none of which touch the scene. Empirically the trajectory came out
step-size-invariant to 0.01° across a run whose steps were **not** uniform,
which is the stronger claim. Put that in `qa/opening.mjs`'s header instead of
the frame-time argument, which is false as stated.

**Anchors, all by before-text on disk, all present, all unique:**
`island.ts:696-699` and `:774-780` verbatim as quoted; `SQ_CX = 6855` (`:208`),
`SQ_HALL_Y = 4640` (`:209`), `landmark(MS.makeTownHall(), …)` (`:6466`),
`AZ = 3.927` (`:830`), the `SKIES` elevations (**−56 … −77**, so the crew's
"three ranges and no two agree" is right and its authority call is right);
`OWNER-2026-08-25.md:207-209` is exactly the sentence quoted, and the paragraph
does end at `:209`; `prototype3d.ts` 600, 1298, 1908/1909, 3340, 6318-6321,
6443, 6526, 8327, 8452, 8613, 9256, 9263, 9281, 9308/9309, 9341/9342, 9352,
9692 all read as claimed.

**Compile in context.** Detached worktree at `6a424e6`, `node_modules`
symlinked. `npx tsc --noEmit` **exit 0** on the baseline, and **exit 0** again
with P2(i), P1, P2(ii), P2(iii) and P4 all applied, each by an anchor match
that I asserted was unique before replacing. The after-code compiles.

**Seeded draws, recounted.** Zero `mrnd()`/`mr()`/`mpick()`/`mchance()` added or
removed by any patch. `island.ts`'s `rand` is `(a,b) => a + Math.random()*(b-a)`
(`:268`), so P3's canvas work touches no seeded stream. P4 changes a `hero`
literal and an `introLen`; neither is drawn. The claim is correct.

**Steady state, checked as instructed — P1 and P2 do not touch it.**
`camOffset` is rewritten from `steep` at `:9309` on every frame, so P2's
`INTRO_OFF` lerp cannot survive one frame past `introT <= 0`; `camFollow.lerp`
returns on the `else` branch the same frame. `fovKick` is **never written**
(`camPunch` is a no-op — the owner's zero-shake order), so the lens is 32°
always and the frame-top elevation is a pure function of `steep`. Measured
steady rows in the crew's own logs: pitch **45.88–45.90**, azimuth **−135.00**,
topEl **−29.88 … −29.90**, in all five worlds. Nothing in P1 or P2 moves any of
it.

**Accepted without re-running:** the per-frame log values I did not re-shoot
(the tables reproduce internally and the frames match them); the planet NDC
coordinates and the 28–41-of-5000 star counts — though I confirmed the *finding*
independently and more cheaply: the planets sit at **−56 … −77°** elevation and
the intro frame spans **+4.13 … −31.27°**, so the two bands do not intersect at
all and "0 of 2 on screen" needs no projection to establish; the 4,694
draw-call figure (the crew flags it as the file's own number).

---

## THE KILL: P3 CANNOT REACH THE SKY IT WAS WRITTEN FOR

The projection is the crew's own, from `opening.mjs`:
`horizonY = (1 − tan(pitch)/tan(16°)) / 2`. Applied to intro frame 1:

| world | pitch f1 | horizon row | +15° row | band rows on frame | of those, below y=104 | inside SKY window 110–285 |
|---|---|---|---|---|---|---|
| lantern | 11.87° | 124 | off the top | 124 | **20** | **14** |
| pirate | 13.08° | 88 | off the top | 88 | **0** | **0** |
| gameday | 15.22° | 24 | off the top | 24 | **0** | **0** |
| powder | 15.27° | 22 | off the top | 22 | **0** | **0** |
| maple | 46.20° | off the top | off the top | 0 | 0 | 0 |
| **P2-B pose** | **12.85°** | **95** | off the top | **95** | **0** | **0** |

§3 states the rule the crew set for itself: *"y < 104 is skipped everywhere: the
score chip, the clock and the home button live there."* The proposed band is
inside that strip in three of four hero worlds today, and in **all five** under
the pose the proposal recommends.

So:

* **Bar 3 fails before P3 and fails identically after it.** Rule 2 of the
  governor is "every fix needs a probe that FAILS before it". The other half is
  that it has to pass after. This one cannot.
* **Bar 4 is worse.** `ground mean / sky mean` reads the same two windows.
  Game Day's **110.2×** is **110.2×** with the band painted. Pirate's does not
  move. Three FAILs before, three FAILs after.
* **Bar 5 passes trivially**, and would have passed trivially even if the band
  were painted in the wrong hemisphere, which is what makes it a weak check.

And the timing says the same thing. The crew measured the horizon's own window
at **0.055–0.082 s** — one to two rendered frames on a phone. The black sky it
photographed lasts **0.3–0.6 s** and includes every frame anyone would cut a
store poster from. P3 addresses the shorter phenomenon and misses the longer
one.

**The refile that would work, stated so the next crew does not have to find it.**
The visible sky at the opening beat runs from the equator **down** to −28…−31°.
The steady-state frame top is **−29.88°** at its very highest (pitch 46.376° at
`steep = 0`, plus the `R·0.5` look-target lift; it only goes lower as R grows,
to −49.6° at VOID TITAN, at every follow distance in 26–340 because the band
depends on `steep` and not on `camDist`). So there is a **≈30° corridor between
0° and −28° that the intro shows and gameplay never does**, and that corridor is
exactly where the measured defect lives. A band painted from **0° down to about
−25°** — not up to +15° — covers the whole measured window and still clears the
gameplay frame top by ~4.9°. That margin is the thinnest invisibility claim in
this repo and it must be MEASURED at R ≤ 2.5 (where pitch is at its minimum),
not argued.

**And the lead the crew walked past.** What Game Day's frame actually shows is a
daylit tree line with black behind it — a silhouette problem at the island's
edge, not a horizon problem at the equator. This repo already owns the mechanism
for that: the additive halo plane at `y = −3`, tightened on 2026-08-25 from 2.1×
to **1.15×** the island so its falloff "finishes just past the coast" — tuned,
like everything else, against the steady-state camera. Whether it reaches a
silhouette seen from 285 units out at pitch 12–15° is unmeasured. Point a probe
at that before painting anything.

---

## THE SECOND KILL: P2-B PINS THE AZIMUTH AND IS RECOMMENDED ON A FRAME IT DOES NOT PRODUCE

`camera.position.copy(camFollow)` and `camFollow.copy(tmpV)` make the optical
axis `look − tmpV = (−camOffset.x·camDist, R·0.5 − camOffset.y·camDist,
−camOffset.z·camDist)`. `camOffset.x === camOffset.z` at `steep = 0` (0.62 :
0.62), at `steep = 1` (0.45 : 0.45), at every lerp between them, and at
`INTRO_OFF` (0.62 : 0.62 — the proposal preserves this deliberately, for the
steering basis, and it is right to). Therefore `atan2(−a, −a) = −135°`
identically. **P2-B renders the entire establishing shot on bearing 225°.**

Today's frame 1 is on bearing 190.4 / 177.9 / 192.4 / 190.8. The proposal is
careful to claim only that `INTRO_OFF` "reproduces … the 11.9–15.3 degrees" of
PITCH — which it does, to a tenth of a degree. But §6 then recommends branch B
with *"the game opens on its best frame every time"* and names
`lantern_f01.png` as that frame. It is not that frame. It is that pitch, from a
bearing 34.6° away, and nobody has seen it.

Decision 4's condition is photographs first. P2-B has none.

This is not a claim that P2-B is wrong. The mechanism is clean, it typechecks,
it is deterministic, it leaves steady state untouched, and its side-effect
audit (`:8613`, `:9000-9003`, `:6318-6321`) is correct — I grepped every
`camOffset` reader in `src/` (`:1908`, `:6318-6321`, `:8613`, `:9000-9003`,
`:9341`, `:9690`) and outside the camera block itself, the boot seed and the
`__warpVoid` QA hook, the **only** consumer that reads `.y` is the corridor
sweep at `:6319`, which is disposed of below. Everything else is x : z only.
It is a claim that **P2-B is not
photographed and therefore cannot be recommended**, and that the sentence
recommending it is false as written.

---

## §9 LEAD 9 IS CLOSED — REFUTED, NOT PENDING

The crew flags `validateWorld()`'s spawn-corridor sweep as possibly reading a
stale `camOffset`. It cannot.

`if (!_validated && island.spawn)` (`:6316`) guards the sweep; `_validated` is a
module `let` set true at `:6349` and **never reset**. `beginMatch()` calls
`validateWorld()` at `:5428`, and sets `introT = COPY.introLen` at `:5534` —
106 lines later. So the sweep runs exactly once per page load, inside the first
`beginMatch`, at a moment when `introT` is still 0 and `R` is `START_R`
(`steep = 0`). Both the module literal and the render loop's `:9309` write give
`camOffset` the same play value there. A world switch is `location.href =
location.pathname` (`:5934`, `:5959`) — a full reload, so the flag resets with
the module.

P2's `INTRO_OFF` can never reach it, because the sweep is over before `introT`
is ever nonzero. P1 does not change it either. **Close the lead.**

---

## CORRECTIONS — each verbatim, each mechanically applicable

### C1 — P0a and P0b must not preserve a number this repo has already measured false

Both replacement blocks keep **"about 27 degrees BELOW the horizontal"** /
**"about −27 degrees at the top of the frame"**. That number is wrong and
`docs/crews/round-2b/spawn-sky.verdict.md` already says so in this repo:
*"`island.ts:707` and `island.ts:772` both say 'about 27 degrees' and are wrong
by 3°."* The crew's own steady-state rows measure the frame top at **−29.88 to
−29.90** in all five worlds. P0 exists to leave true statements on disk; it must
not carry a false one through.

In **P0a**, these three lines of the proposed replacement block

```
      // degrees at spawn and 65 by VOID TITAN, on a 32-degree lens, so the
      // highest thing on screen is about 27 degrees BELOW the horizontal and
      // the lowest is about 81 below.
```

must instead read

```
      // degrees at spawn and 65 by VOID TITAN, on a 32-degree lens, so the
      // highest thing on screen is about 30 degrees BELOW the horizontal and
      // the lowest is about 81 below. ("About 27" stood here and in the
      // PLANETS note below and was wrong by three degrees: measured on the
      // settled frames in qa/out/opening/, the frame top is -29.88 to -29.90
      // in all five worlds at spawn radius.)
```

In **P0b**, these two lines of the proposed replacement block

```
  // by VOID TITAN, on a 32-degree lens, so the visible elevation band runs from
  // about -27 degrees at the top of the frame to about -81 at the bottom, and
```

must instead read

```
  // by VOID TITAN, on a 32-degree lens, so the visible elevation band runs from
  // about -30 degrees at the top of the frame (measured -29.9; the "-27" this
  // line used to carry is a third error nobody caught) to about -81 at the
  // bottom, and
```

### C2 — §4 must retract "no sky band at all"

The proposal writes: *"Match 2 opens 152 units higher, with **no horizon and no
sky band at all**, the bathhouse small, and a bare brown path up the middle of
the frame."* Its own photograph refutes half of that. I measured
`lantern_match2_f01.png` in the crew's own SKY window: **mean L 0.0123, range
0.0041, 24.8% true black** — a sky, by every number in §3. Rows 120–300 read
0.0068–0.0074, statistically indistinguishable from match 1's sky. Roughly a
third of the frame is sky. "The bathhouse small" is not supported either; it
subtends about the same as in match 1.

Replace that sentence with:

```
`qa/out/opening/lantern_match1_f01.png` against
`qa/out/opening/lantern_match2_f01.png`. Match 1 opens low on the glowing
bathhouse. Match 2 opens 152 units higher and 17.6 degrees steeper: the
GEOMETRIC HORIZON is off the frame (frame top -13.48 against +4.12), the
bathhouse is seen down onto rather than across, and a bare brown path fills the
lower middle. Sky is still on screen — measured in the same SKY window, match 2
reads mean 0.0123, range 0.0041, 24.8% true black — because below the horizon
you are still looking past the island's edge into the dome. What changed is the
POSE, not whether there is sky.
```

*(The camera deltas themselves — Δpitch 17.60°, ΔcamY 152.0 — are read from
`__cam.getWorldDirection()` and stand. I also checked the one confound that
would have voided them: `matchdeck.deal()` gives match 2 `hour = n % hours`, a
different light hour — but `HOURS.lantern` has exactly one entry, so the world
the crew chose is the only one of the five where match 2 is lit identically to
match 1. The test is clean. Say so, because it is luck that reads as rigour.)*

### C3 — the "two-pixel mascot" is a fabricated number

§6 calls `maple_f01.png` *"an arbitrary mid-zoom: a two-pixel mascot on grass"*.
I isolated the void in that frame by colour: it spans rows **448–475**, i.e. a
**28 px disc** at DPR 1 on a 932-high frame, with both eyes and the grin legible
at 1:1 (I cropped it at 5× to be sure; the mask's horizontal extent, x 163–228,
catches neighbouring violet, so height is the honest figure). The optics agree —
`camY 74.2 / sin(46.2°)` puts the camera 102.8 units off, and a radius-0.9 body
at 102.8 units through a 32° lens over 932 px subtends **29 px**. "Two-pixel" is
wrong by 14× linear and about 200× in area. Governor rule 3.

Replace with:

```
**Absent:** Maple Falls. World 1, the level a child plays first, has no
establishing MOVE. Its opening frame (`maple_f01.png`) is an arbitrary
mid-zoom at the gameplay angle: the mascot sits mid-frame at about 28 px
across, a road is cut by the top edge, a red tree by the bottom-right corner,
and nothing in the frame is the subject.
```

### C4 — "Maple is flat on every axis" is false

Maple's pitch and azimuth are pinned (46.20 → 46.29 → 45.93; azimuth −135.00
throughout) — that part is right, and the reason given is right. But its camera
Y runs **74.2 → 150.2 → 31.4** across the intro. Maple has a dolly; what it has
not got is an angle move. Replace *"Maple is flat on every axis"* with
**"Maple's angle is flat on both axes — it still dollies, camera Y 74 → 150 →
31, but nothing turns"**, and change *"has no establishing shot"* to **"has no
establishing MOVE"** wherever it appears (§2, §6, P4).

### C5 — the SKY window understates the sky it names

The window is stated and drawn, which is the right discipline, and I could
reproduce every number from it. But `pirate_f01_windows.png` shows the lower red
line at y = 285 with visibly bluer, brighter sky continuing to about y = 350.
Measured over the full sky band instead:

| world | band | crew's range (110–285) | full-band range | crew's ratio | full-band ratio |
|---|---|---|---|---|---|
| gameday | 104–300 | 0.0034 | **0.0034** | 110.2× | **110.2×** |
| powder | 104–340 | 0.0077 | **0.0075** | 35.7× | **34.9×** |
| lantern | 104–315 | 0.0062 | **0.0106** | 10.2× | **9.3×** |
| pirate | 104–345 | 0.0036 | **0.0112** | 64.2× | **52.7×** |

Two consequences. First, **"a flat fill in all four worlds" must be retracted to
two.** This repo's own flat-fill number is 0.008 (OWNER §6); measured honestly,
pirate (0.0112) and lantern (0.0106) are above it. Game Day (0.0034) and Powder
(0.0075) are at or below it and the sentence is earned there. Second, Bar 3's
"FAIL by 8–18×" becomes **FAIL by 5.4–17.6×**, and Bar 4's derivation from
Lantern's 10.2× becomes 9.3×. **The findings survive; the multipliers do not.**
Either widen the window per world and restate, or keep 110–285 and say plainly
that it is a slice of the sky and not the sky.

### C6 — smaller ones, all mechanical

* `index.html:**572**`, not 573 (`#titlecard.show { animation: cardFade 4.2s ease forwards; }`).
* `camOffset.y` is read at `:6319`, not `:6318`.
* §2's "intro" column is the **last stepped frame**, not the authored length.
  Read from source: `introLen` is **maple 2.2** (`:1298`), **pirate 2.2**
  (`:1354`), **gameday 3.4** (`:1385`), **lantern 3.6** (`:1408`), **powder 3.5**
  (`:1430`) — against the 3.45 / 2.15 / 3.35 / 3.26 / 2.13 the table prints.
  (Cross-checked by inverting `camDist = 38 + 262·k²` on frame 1: 3.400 /
  3.597 / 3.501.) Label the column, or the next reader patches the wrong number.
* P4's *"P4 without P1+P2 gives Maple the ring"* overstates by about 5×. The
  ring's size scales with the look-point teleport, and Maple's would be
  `hypot(6855−6469, 4640−5240)·0.05 = **35.7 units**` against Lantern's **382.9**
  — roughly a 7° deflection, not 34°. Say the real number or drop the claim.
* P1's `camOffset.set(...)` line is inert for the camera (`:9309` rewrites
  `camOffset` from `steep` before it is next read for the camera) and its
  comment implies otherwise. Keep the line — it is cheap and defensive — but
  say it is belt-and-braces rather than the fix.

---

## WHAT LANDS, AND ON WHAT EVIDENCE

### P1 — SOUND. Land it on its own, today.

This is the best thing in the document and it does not depend on any art call.
I did not take the crew's word for it; I derived it.

At boot, `:9690-9692` seeds `camFollow` to `camOffset·camDist + spawn` with
`camDist = 50`, and `normalize(0.62, 0.92, 0.62).y = 0.92/1.270906 =
**0.723897**`, so `camFollow.y = **36.195**`. On intro frame 1 the loop sets
`camDist = 38 + 262·k²` with `k = (3.6 − 0.05)/3.6` (lantern's authored
`introLen`, `:1408`) = **292.77** — which is the log's `cd` to the hundredth —
so `tmpV.y = 0.723897 × 292.77 = **211.92**`, and the spring closes
`1 − e^(−5×0.05) = **0.2211992**` of the gap:

```
  36.195 + 0.2211992 × (211.92 − 36.195) = 75.06
```

The crew's log reads **75.0** to its one decimal place. That is the whole
mechanism, arrived at from the source constants with no probe at all, and it
says three things: the shot really is the spring's lag; **no rendered frame
elapses between the boot seed and intro frame 1** (the log's own
`preIntroFrames: 0`, which the arithmetic independently confirms — I integrated
the menu's own `camDist += (38 − camDist)(1 − e^(−1.6·0.05))` and its spring:
five menu frames would put frame 1 at camY **73.9** and a settled menu camera at
**68.3**, against a measured 75.0, which admits essentially none); and **seeding
`camFollow` to that same boot value in `resetMatch()` reproduces frame 1
exactly.** `resetMatch` sets `voidState.x/z = island.spawn` at `:6524`, two
lines above the patch site, so the seed has the right spawn to work from.
Zero draws, zero triangles, zero seeded draws, typechecks, steady state
untouched. **Land it.**

### P0a / P0b / P0c — SOUND WITH CORRECTIONS (C1)

All three anchors verbatim on disk. P0b's second catch — three planet-elevation
ranges in one file and no two agreeing (`:779` "−34 and −62", `:827` "−57 and
−75", `SKIES` −56…−77) — is real and correct, and the SKIES table is the right
authority. Apply C1 and land all three.

### P2-A — mechanism SOUND, art call belongs to the owner

One line, deterministic, pins azimuth 225° and pitch ~46°, photographed at
`lantern_ab_unlagged.png` and `pirate_ab_unlagged.png`. I re-measured the
bathhouse boxes and the 5.1× is real (0.3123 against 0.0615) and is **not** an
artefact of the A/B method: `lantern_f20.png`, from the ordinary shipped run at
pitch 46.27°, measures **0.065** in the same class of box. So the cost of P2-A
is real and it is the cost the ledger already has open on `ROOF = 0x4a5468`.
That is an owner call, correctly framed, with photographs on both sides. Not
mine to decide.

### P2-B — KILLED AS FILED. Refile with photographs.

Not because the idea is wrong. Because it pins the bearing to 225° in every
world (proved above), which means no frame in `qa/out/opening/` shows what it
would look like, and it is recommended on a frame it does not produce. A refile
needs five frames at `INTRO_OFF` — and it needs P3 fixed or dropped, because the
proposal's own blocker sentence otherwise chains it to a dead patch.

### P3 — KILLED. The band is in the wrong hemisphere.

See above. Refile with the band below the equator, the invisibility margin
measured at R ≤ 2.5 rather than argued, and the halo-plane lead checked first.

### P4 — NOT ESTABLISHED, and correctly blocked

Coordinates verified: `w(v) = (v − 6000) × 0.05` with `CX = CZ = 6000`,
`SCALE = 0.05` (`island.ts:75-77`), no axis flip — cross-checked against
Pirate's shipped `hero`, which resolves to the Royal Mariner at world
(8540, 3700) (`island.ts:6179`). `hero: [number, number] | null` (`:1233`)
accepts the literal; it typechecks. `introLen: 2.8` is unphotographed and the
proposal says so. It is blocked on P2, and P2-B is dead, so it waits. Fix C4
and the 35.7-unit correction when it refiles.

### §8's probe — Bar 1 ships. Bars 3 and 4 must not ship as gates yet.

* **Bar 1 (repeatability)** — genuinely fails today; the direction is proved
  from source (`resetMatch` never touches `camFollow`, and I read every writer:
  `:1909`, `:9692`, `:9352`) and P1 provably makes it pass. **This is the bar to
  commit before the fix, exactly as rule 2 asks.**
* **Bar 2 (no ring)** — genuinely fails today; I reproduced every number from
  the logs. But note what it encodes: "|azimuth − 225°| must never be larger
  than on the previous frame" forbids **any** deliberate azimuth motion in any
  future establishing shot. That is an art decision inside a gate. Say so in the
  header or loosen it to a magnitude bar.
* **Bar 3 and Bar 4** — fail today (verified independently, on my own
  measurement) and **fail identically after every patch in this document**.
  A gate that no proposed change can turn green is a permanent red light, and
  under this repo's own rules it is not evidence of anything yet. Hold them out
  of `qa/gate.mjs` until there is a patch that can move them; keep them as a
  recorded measurement in the proposal, which is where they belong.
* **Bar 5** — passes trivially, and would have passed trivially even with the
  band in the wrong hemisphere. Make it assert a POSITIVE: that the band is
  visible during the intro and absent at R ≤ 2.5, or it is not a check.
* One trap for whoever writes it: the shoot is **not pixel-deterministic**.
  `lantern_f01.png` and `lantern_match1_f01.png` are the same camera on the same
  build and differ in **280,742 of 400,760 pixels** (the crowd runs). Their row
  profiles agree to three decimals. Bars 3 and 4 are stable; any per-pixel bar
  would not be.

**On the instrument itself: gating `requestAnimationFrame` is legitimate, and I
proved it the hard way rather than accepting the argument** — see my own
free-running shoot above, which agrees with the crew's stepped log to 0.08° of
azimuth and 0.01° of pitch on Pirate. The header must not repeat the crew's
stated reason, though: not every swiftshader frame exceeds 50 ms (mine stepped
0.05, 0.05, **0.0316**, then irregular). Write down the reason that is true —
`dtw = dt` (`:8329`), so every simulation consumer integrates the same clamped
delta, and the only `dtRaw` readers are `perfFrame`, `kitCd`, `fovKick` and the
quality accumulator (`:8328`, `:9357`, `:9360`, `:9634`), none of which touch
the scene — plus the measured step-size invariance.

---

## WHAT THE PICTURES SAY, HAVING LOOKED AT THEM

`pirate_f01.png` is the finding. A turquoise sunlit resort — teal roof, red
flag, green palms at full daylight key — under a night sky, with a hard edge
between them and no haze at the join. `pirate_f01_join.png` is an honest crop of
it. A child's first frame of Pirate Bay is a lighting contradiction, and the
crew is right to call it a bug.

`gameday_f01.png` is the same defect with a bigger number: a bright concrete lot
under a 99.8%-black magenta band. Its window overlay confirms the measurement
covers the whole visible sky in that world, so the 110.2× is not a windowing
artefact.

`lantern_f01.png` is as good as the crew says. So is `powder_f06.png` — and
`powder_f06` is the frame that quietly argues against the proposal's own thesis:
its horizon is **off the frame** (pitch 38.25°, frame top −22.25°) and it reads
beautifully anyway, because what makes it work is the island's curved limb
against space, not a horizon. "These worlds are rocks floating in space" is the
right premise. `powder_f06.png` is what it looks like when the premise is
honoured.

`pirate_f20.png` and `lantern_f48.png` earn their place. One second into Pirate
Bay's establishing shot, 85% of the frame is flat turquoise water with three
small boats in it. At 2.4 s in Lantern, most of the frame is bare brown dirt.
The ring is not an abstraction; it lands on nothing, twice.

`lantern_match2_f01.png` is the one that argues with its own caption — see C2.

`maple_f01.png` is a mid-zoom with no subject, and that judgement stands even
though the mascot in it is 28 px and not two.

---

## SUMMARY

| patch | verdict |
|---|---|
| **P0a / P0b / P0c** | **SOUND WITH CORRECTIONS** — apply C1, then land |
| **P1** | **SOUND** — land it alone, today; mechanism re-derived from source constants to camY 75.06 against a logged 75.0 |
| **P2-A** | mechanism **SOUND**; the art call is the owner's, and it is framed honestly |
| **P2-B** | **KILLED AS FILED** — pins azimuth to 225°, does not produce the frame it is recommended on, and no photograph of it exists |
| **P3** | **KILLED** — the band is painted above the horizon; the measured sky is below it. It cannot move Bar 3 or Bar 4 by any amount |
| **P4** | **NOT ESTABLISHED** — coordinates and types verified, but blocked on P2 and unphotographed |
| **§8 probe** | Bar 1 **ships**; Bar 2 ships with its art assumption declared; Bars 3–4 **hold**; Bar 5 **rewrite as a positive** |
| **§9 lead 9** | **REFUTED** — `_validated` is a one-shot set before `introT` is ever nonzero |
| **the shoot itself** | **CONFIRMED on a second instrument** — my own un-gated free-running log matches the crew's stepped log to 0.08° az / 0.01° pitch on Pirate, settled camera included |

The measurement work in this proposal is the best in the round and most of it
survived everything I threw at it. What did not survive is the half that turns
measurement into a plan: **the fix is aimed 30 degrees above the defect, and the
recommended pose has never been photographed.** Land P0 and P1. Send the rest
back for two frames and a hemisphere.
