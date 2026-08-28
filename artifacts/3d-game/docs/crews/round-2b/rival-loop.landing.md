# LANDING — crew:rival-loop, owner decision 2

**Status: APPLIED TO THE WORKING TREE, NOT COMMITTED.** The governor commits.
Files touched: `src/proto3d/rivals.ts`, `src/prototype3d.ts`, and one new file
`qa/rivalswing.mjs`. Nothing else. Typecheck clean, build clean, probe run five
times post-patch across two worlds and three times pre-patch.

The verdict (`rival-loop.verdict.md`) was the specification. Where it and the
proposal disagreed, the verdict won.

---

## THE HEADLINE

Everything the verdict authorised landed, and the demote hold works exactly as
constructed — a form loss now lasts **5.72–6.03 match seconds** instead of the
**0.03 match seconds** I measured on the pre-patch build. That is the verdict's
kill, fixed and measured at both ends.

**One bar fails, and it is not a bar I moved.** `B3` — "the surged sibling must
actually clear the 1.2x bite gate" — failed on **2 of 5** post-patch runs. The
surge's 1.26x pin is set from the player's radius at surge start and the rival
eases in over a ~1.8s time constant, during which the player keeps growing; on
two runs the ratio peaked at **1.126x** and below **1.2x**, so the sibling could
never have bitten and the universal form bite never applied to it. The three
passing runs peaked at **1.215x, 1.253x, 1.268x** — a margin of 1.3% to 5.7%
over the gate. This is a real, measured marginality in the design's central
number. It is diagnosed in full below and **not fixed**, because fixing it means
moving a tuning constant the verdict did not authorise moving.

---

## WHAT LANDED

### THE SURGE — patches 2, 3, 4, 5, 6, 7, 8, 9, 10, 14, 17, 18, with C-A and C-B

All twelve applied. Every anchor was verified by **before-text match**, not line
number, and every one of them was on disk verbatim.

**C-A applied verbatim.** `src/proto3d/rivals.ts`, the scheduler:

```ts
const surgeOpen = _t > matchLen * 0.55 && _t < matchLen * 0.72 && !hunting;
```

replacing the filed `_t > matchLen * 0.24 && _t < matchLen * 0.72`. The
patch-8 comment block carries C-A's full rationale verbatim, and the kid-mercy
bullet now reads "never started while the hunter is HUNTING" rather than
"mid-charge", exactly as C-A instructed.

**C-B applied verbatim** — the `else surgeCd = 4` retry comment.

**One correction to C-A's own stated consequence, found by running it.** C-A
says "`surgeCd` has long expired by then, so exactly one surge fires, at ~99s".
`surgeCd` does *not* expire before then: the whole scheduler block, including
`surgeCd -= dt`, is gated on `surgeOpen`, so the clock only starts at 55% of the
match. The first surge therefore fires `rand(4,12)`s **into** the window —
103–111s on a 180s clock, not 99s. C-A's *conclusion* (exactly one surge per
match) is right and was confirmed five times out of five: `surges fired 1` on
every post-patch run.

### THE COMEBACK EDGE — patch 11, with C-F

Applied. C-F's four deletions all made: `bitYou` does not exist anywhere in the
tree. The bounty rides `rv.stolen > 0`, and the reasoning C-F gave for that is
written into the code comment so the next reader does not re-add the flag.

### THE UNIVERSAL FORM BITE — patches 1, 12, 15, 16, ONLY with C-C

Landed as one unit with all three C-C hunks, in this one working-tree change.
`demoteHold` is declared beside `biteMercy`, set on demotion, counted into
`rivalEv.dems`, and read by the score floor. `RivalHit.form` is required; `tsc
--noEmit` is clean and both construction sites (`rivals.ts:1600`,
`prototype3d.ts:1804`) are covered — grepped independently of the compiler.

**The hold expires by itself, verified five times.** `tClock >= demoteHold` with
`tClock` monotonic, and the measured recoveries are 5.72, 5.79, 6.00, 6.02,
6.03 match seconds against a constructed 6.0. `qa/evolveonce.mjs` re-run and
green: *"the form came back (2) and the ceremony did not: 2 ceremonies before
and after the bite, best form held at 2"* — which is precisely what C-C asked
whoever landed it to prove.

### Patch 13

Anchor A landed as filed. **Anchor B did NOT land as filed** — it is killed, and
C-E's replacement text is in its place verbatim.

---

## WHAT I DELIBERATELY DID NOT LAND

- **The proposal's `qa/rivalswing.mjs`.** Not copied, not adapted. A new file.
- **`bitYou`** in any form (C-F).
- **Patch 13 anchor B's filed text** (C-E).
- **The proposal's 24%-72% surge window** (C-A).
- **Any change to the 1.26 pin, the 0.55 easing rate, the 12-18s hold or the
  3.5%/s sag**, even though the probe shows the pin is marginal against the bite
  gate. The verdict authorised the design as specified; retuning it to make my
  own bar go green is the exact move the brief forbids. Recorded below for
  whoever files the follow-up.
- **The steal-during-mercy asymmetry** (the crew's risk 1). Still there, still
  pre-existing, still not this patch's to fix.
- **`hurtUntil` is still keyed on `hit.hunter`** (the verdict flagged it as "an
  inconsistency, not a break"). Patch 16 did not touch that line and neither did
  I. A sibling's form bite gives 0.9s of hurt face where the hunter's gives 1.3s.

---

## THE PROBE — `qa/rivalswing.mjs`, new, mine

The proposal's probe was killed as written. This one is built against C-D, C-A
and C-G, and every bar states its derivation in the file header. Nine bars:
`B1` surges ≥ 1 · `B2` size-lead changes ≥ 2 · `B3` larger→eatable arcs ≥ 1 ·
`B4` family-larger ≤ 45 match seconds · `B5` nothing still surging at the
whistle · `B6a` the radius loss is held ≥ 2.0s · `B6b` the form loss is held
≥ 2.0s · `B7` organic demotions ≤ 8 · `B8` min demotion gap ≥ 3.5s.

Four things it does that the filed probe could not:

1. **Demotions come from the handler's own monotonic counter** (`ev.dems`,
   C-D), never a stage poll.
2. **The stick clause is measured on a forced bite through the real handler**
   (`__bite(true)`, the `qa/evolveonce.mjs` precedent) with a **per-frame**
   trace. One frame is the only resolution at which the pre-patch behaviour is
   visible at all. The bite is fired before 50% of the clock so it cannot
   confound the surge bars, and the probe reports "no conclusion" and fails if
   it never lands.
3. **B2, B3 and B4 are scored in the surge stretch (`t ≥ matchLen*0.55`)**, the
   mechanism's own boundary under C-A — see the correction below.
4. **C-G's attribution readout** is there with no bar, plus a diagnostic that
   follows the surged rival **by name** so the surge cannot be credited with a
   sibling that never surged.

### Three corrections the probe forced on my own first draft

**(a) The crew's `changes >= 2` bar passes on a build with no surge.** I wrote
that the pre-patch family "never reaches 1.03x, so `changes` is 0". Measured, it
does: `softCap = max(min(START_R + 0.02t, 1.6), pr*0.80)` has an absolute 1.6
term that sits **above** the player until a par run outgrows 1.6 at ~45s. Three
pre-patch maple runs read the family at up to **1.12x** the player around
t=20–41s, with **2 whole-match lead changes** and **28–32s of family size lead**
on one of them. Scored over the whole match, the filed bar is green on the
pre-patch build. Scoping to the stretch is what makes it a bar; the whole-match
figures are still printed beside it.

**(b) The verdict's kill is right but not universal.** It says a form loss
"lasts about sixteen milliseconds" because the score floor "hands the radius
straight back". Measured, whether the *form* comes back depends on where the
radius sat **relative to the floor** at the instant of the bite. Two pre-patch
readings from an identical forced bite (`r 2.522 -> 1.632`, form 2 -> 1, both
times):

  · **t = 72.4s — the form came back.** At bite+0.5s the trace reads
    `r 2.383, form 2`. The floor had put the radius back over the 2.5 boundary
    on the frame after the bite, which lifted `curStage` to 2 at the frame
    loop's `ns > curStage`; `lawCap` then sagged and dragged the radius down to
    2.383, but `curStage` never falls except in the bite handler, so the form
    stayed restored.
  · **t = 83.0s — it did not.** `r 2.209, form 1` at +0.5s and `r 2.231, form 1`
    at +3.0s, and it never returned inside a 9s trace. That run had eaten its
    way **above** its own score floor, so the floor could only restore the
    radius to 2.209 — under the 2.5 boundary — and the bite took real ground.

So `B6b`, on the form, is only *usually* red pre-patch, and a
bar that is only usually red is not a fails-before claim. That is why the barred
measurement is **`B6a`, on the radius**, which is unconditional: the floor puts
the radius back in one frame in every case. Pre-patch `B6a` read **0.03 match
seconds**; post-patch it reads 5.7–6.0.

**(c) `famR` as a family max credits the surge with the wrong rival.** Late in a
match the ordinary 0.80x softCap on a radius-12 player is a bigger number than
any surge, so the peak-ratio diagnostic now tracks the surged rival by name.

### FAILS BEFORE — the pre-patch run, verbatim

Instrument identical to the one that produced the post-patch runs, against the
build at `b55b638`:

```
  (parsed from source: bite gate 1.2x, demote hold ABSENT — pre-patch build, form mercy ABSENT — pre-patch build, FORM_MIN[1] 1.6)

══ DOES IT SWING?
  surges fired               0
  size-lead changes (3% hys) 0 in the stretch (t>=99s), 2 over the whole match — t=22.8->family, t=51->player
  larger->eatable arcs       0
  family held the size lead  0.0s in the stretch  (+32.3s in the opening, which is softCap's 1.6 term, not the surge)
  still surging at the end   no

══ DOES A FORM LOSS STICK? (one bite forced through the real handler)
  bite at t=75.62s, try 1: r 2.238 -> 0.918, form 1 -> 0
  bite +0.5s: r 2.003  form 1
  bite +3.0s: r 2.066  form 1
  half the 1.320-unit drop was back after 0.03 match seconds   <- B6a, the hold itself
  the FORM stayed lost for 0.03 match seconds   <- B6b, what the child sees   (378 frames traced)

══ THE KID-MERCY RAILS
  demotions: 0 total, 0 the game fired
  bites: 2   family prop bites: 17

RIVALSWING: FAIL
  - B1 surges 0 < 1 — the mechanism never fired (this is what a pre-patch build reads)
  - B2 lead changes in the stretch 0 < 2 — no back-and-forth: the lead must go AND come back
  - B3 no rival went above 1.2x and back below in the stretch — "go and consume and come back" is unproven
  - B6a half the radius drop was back in 0.03s < 2.0 — the score floor handed it straight back
  - B6b the form loss lasted 0.03s < 2.0 — the demotion is not something a child can see
```

Five of nine bars red before the patch. `B4`, `B5`, `B7` and `B8` are vacuously
green pre-patch and are stated in the file header as **post-patch guards on the
kid-mercy rails, not fails-before claims** — exactly as C-D instructed.

### AFTER — all five post-patch runs

| # | world | surges | lead changes (stretch) | arcs | surged rival's peak | B6a | B6b | demotions (game-fired) | closest pair | verdict |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | maple | 1 | 2 | 0 | <1.2x (no diag yet) | 6.02s | 6.02s | 0 | — | **FAIL B3** |
| 2 | maple | 1 | 2 | 1 | 1.253x | 5.72s | 6.00s | 2 | 6.7s | PASS |
| 3 | maple | 1 | 2 | 0 | 1.126x | 6.03s | 6.03s | 1 | 31.2s | **FAIL B3** |
| 4 | maple | 1 | 2 | 1 | 1.268x | 5.79s | 5.79s | 0 | — | PASS |
| 5 | pirate | 1 | 2 | 1 | 1.215x | 6.00s | 6.00s | 1 | 26.6s | PASS |

Run 4, maple, in full — the shape a passing run has:

```
══ DOES IT SWING?
  surges fired               1
  size-lead changes (3% hys) 2 in the stretch (t>=99s), 2 over the whole match — t=110->family, t=128.6->player
  larger->eatable arcs       1 — GRUMPS (>1.2x @110s, eatable @132.2s)
  who closed the arc         player r 3.52 -> 6.15 across the surge = 1.75x  (>=1.51x means the player ate past the pin; below, the sag handed it back)
  the surged rival           GRUMPS: peaked at 1.268x the player at t=110.5s, r 4.35 against a pin of 3.52 x 1.26 = 4.43 — the bite gate needs 1.2x
  family held the size lead  18.1s in the stretch  (+9.5s in the opening, which is softCap's 1.6 term, not the surge)
  still surging at the end   no

══ DOES A FORM LOSS STICK? (one bite forced through the real handler)
  bite at t=72.07s, try 1: r 2.503 -> 1.632, form 2 -> 1
  bite +0.5s: r 1.636  form 1
  bite +3.0s: r 1.762  form 1
  half the 0.871-unit drop was back after 5.79 match seconds   <- B6a, the hold itself
  the FORM stayed lost for 5.79 match seconds   <- B6b, what the child sees   (302 frames traced)

══ THE KID-MERCY RAILS
  demotions: 1 total, 0 the game fired
  bites: 1   family prop bites: 22

RIVALSWING: PASS — the match swings, the swing completes, the form loss sticks, and the mercy rails held
```

Run 3, maple — the shape a failing run has:

```
  surges fired               1
  size-lead changes (3% hys) 2 in the stretch (t>=99s), 6 over the whole match
  larger->eatable arcs       0
  who closed the arc         player r 1.66 -> 4.65 across the surge = 2.81x
  peak family/player size    1.126x at t=112.4s   (pin 1.66 x 1.26 = 2.09; the bite gate needs 1.2x)
  family held the size lead  1.6s in the stretch

RIVALSWING: FAIL
  - B3 no rival went above 1.2x and back below in the stretch — "go and consume and come back" is unproven
```

---

## THE FAILING BAR, DIAGNOSED

**B3 fails because the 1.26x pin is not 1.26x by the time the rival gets
there.** Three facts, all from the shipped code:

1. `sPick.surgeR = min(R_CAP, max(sPick.r, pr * 1.26))` pins an **absolute**
   radius from the player's radius *at that instant*.
2. The rival then **eases** toward it: `rv.r += (rv.surgeR - rv.r) * min(1, dt *
   0.55)` — a ~1.8 second time constant, starting from about `0.80 * pr`, so it
   is still ~10% short of the pin two seconds in and ~3% short after four.
3. The player keeps growing the whole time, and the growth-law rate limiter
   allows `0.11` units/s **before** the finale surge lifts it. At a player
   radius of 1.66 that is **6.6%/s**; at 3.52 it is **3.1%/s**.

So the 26% margin the design bought is spent by the player's own growth during
the easing lag, and how much survives depends on how big the player was when the
surge started. Measured: pins set at pr₀ = 3.52 and 2.84 cleared the gate
(1.268x, 1.253x); a pin set at pr₀ = 1.66 did not (1.126x). Run 5 on Pirate
cleared it by **1.3%** (1.215x against 1.2x) — the surged rival reached exactly
its pin of 3.18 and the player had still grown 2.53 → 2.62 underneath it.

**Why this matters beyond the bar:** a surged sibling that never reaches 1.2x
cannot satisfy `rv.r > pr * 1.2`, so it cannot bite, so the universal form bite
— the half of this proposal the owner's sentence was actually about — does not
apply to it. On 2 of 5 runs the surge was pressure a child can see and nothing
more. The red halo (`EAT_RATIO` 1.11) and the approved scared face (1.15x) both
still fired on those runs, so the *tell* is honest; the *price* is not always
behind it.

**The correctives, ranked, none applied.** In the crew's own words its tuning
triplet is "designed, not measured", and its risk 6 named the hold length as the
first lever — for the opposite failure. The measured failure is too little, not
too much, and the levers are:

- **Raise the ease rate** (`dt * 0.55` → higher) so the rival arrives before the
  player's growth eats the margin. Smallest change, no effect on the sag, the
  hold, the window or the softCap; it does make the growth more of a "pop",
  which is what the 0.55 was chosen to avoid.
- **Re-pin during the ramp**: hold `surgeR = max(surgeR, pr * 1.26)` while
  `surgeT > 0` so the pin tracks until the hold begins, then freezes. This keeps
  the pin's counterplay meaning (it stops tracking exactly when the player is
  told to go and out-eat it) at the cost of one line.
- **Raise 1.26.** Blunt, and it walks toward the hunter's 1.5x loom, which the
  design deliberately stays under.

I did not pick one. Each changes the balance number the verdict blessed, and the
brief is explicit that a bar moved to fit a result is not a bar — the same is
true of a constant moved to make a bar go green without a skeptic on it.

---

## THE OTHER INSTRUMENTS

- **`qa/evolveonce.mjs` — PASS**, and required by C-C. *"the form came back (2)
  and the ceremony did not: 2 ceremonies before and after the bite, best form
  held at 2."* The demote hold slows the recovery without letting the ceremony
  re-fire, which is the exact thing C-C asked to be proven.
- **`qa/rivalnotice.mjs` — PASS at 2.7 looks/min on maple**, inside the 0.8–7
  band, so the patch is not killed by its own stated kill condition. One caveat
  worth writing down: that probe samples only the first **45 match seconds**,
  and under C-A the surge window does not open until **99s**. Its reading
  therefore says nothing about looks *during* a surge. If the band matters
  during a surge, that probe needs a longer sample, not a new bar.
- **`qa/titan.mjs` and `qa/laneshort.mjs` — NOT RUN.** Both were on the crew's
  re-run list. `B5` (nothing surging at the whistle) held 5/5 and every surge
  cleared by ~132–136s against a 180s whistle, which is the dependency
  `titan.mjs` cares about, but that is an argument and not a run. Flagged for
  the governor.

---

## SEEDED-DRAW ACCOUNTING, RE-VERIFIED

`grep -cE "mrnd|mpick|mchance|\bmr\(" src/proto3d/rivals.ts` → **0**. The Maple
mulberry32 stream is untouched by every line of this change. New `Math.random`
draws, all through the file's own unseeded `rand()`: one per `createRivals`
(`:447`), one per `reset()` (`:699`), and per surge one hold length (`:936`),
one next-gap (`:943`), one speak cooldown and one `pickLine` — about six per
match now that exactly one surge fires, down from the proposal's ~eight.

**Zero new triangles.** The surge scales an existing always-resident rival body
through the `group.scale` path that already sizes it.

---

## WHAT THE VERDICT DID NOT ANTICIPATE

1. **B3 fails 2 of 5.** The design's central number is marginal against the gate
   it was chosen to clear. Diagnosed above. This is the finding of the landing.
2. **The kill is conditional, not universal.** A pre-patch form loss survives if
   the player had eaten their way above their own score floor. The verdict's
   arithmetic assumed the radius "sits pinned exactly at lawCap", which is true
   of a par-or-better run and not of one that is ahead of its floor.
3. **C-A's own consequence paragraph is wrong about *when*.** `surgeCd` cannot
   expire before the window opens because the block that decrements it is gated
   on the window. First surge 103–111s, not ~99s. The conclusion — exactly one
   surge — is right and was confirmed 5/5.
4. **The opening of every match already contains a family size lead**, worth up
   to 32 match seconds and 2 whole-match lead changes, from `softCap`'s absolute
   1.6 term. It is authored, pre-existing and nothing to do with this patch —
   but it is enough to make the crew's filed `changes >= 2` bar pass on a
   pre-patch build.
5. **`demoteHold` is never reset between matches**, exactly like `biteMercy`
   beside it, which is never reset either. A rematch begun within 6 seconds of a
   demotion carries a stale hold. Traced through: at match start `playerScore` is
   0 so `scoreFloor` is `START_R` and the radius already equals it, so the
   suppressed write is a no-op. Bounded, self-clearing, harmless — recorded
   rather than fixed, because a reset is a line the verdict did not authorise
   and the pattern it would break is the one already in the file.
6. **`qa/rivalnotice.mjs` cannot see a surge** — it stops sampling 54 match
   seconds before the window opens.

---

## COMMANDS RUN

```
cd /home/user/voidling/artifacts/3d-game
npx tsc --noEmit                       # clean
npm run build                          # clean
node qa/rivalswing.mjs maple 4177      # x3 pre-patch (FAIL), x4 post-patch (2 PASS, 2 FAIL B3)
node qa/rivalswing.mjs pirate 4177     # x1 post-patch (PASS)
node qa/evolveonce.mjs 4177 maple      # PASS
node qa/rivalnotice.mjs 4177 maple     # PASS, 2.7/min
```
