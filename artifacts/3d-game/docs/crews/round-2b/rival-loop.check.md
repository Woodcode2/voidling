# CHECK — crew:rival-loop, the landing verified against the verdict

**VERDICT: BROKEN.** The demote hold works and I could not break it. The
universal form bite type-checks and both construction sites are covered. C-A,
C-B, C-E, C-F, C-D all landed. But the working tree now ships a comment that
states a kid-mercy rail the code does not have, and **I measured the gap**:
for **10.4 match seconds** of a 180 s Maple match, two different voids were
simultaneously over the form-bite gate, with nothing between them but the one
global 4.0 s `biteMercy`. That is the exact thing correction C-A was written
to prevent, written into the tree as a promise, on a build where it is false.

The cause is C-A's own premise, not an implementer deviation. The implementer
applied the spec faithfully and the fix is one boolean plus one comment. But
the tree as it stands must not be committed with that comment in it.

Six documentary divergences are listed below as well. Every claim here is a
run or a source read; where I inferred, I say so.

---

## WHAT I RAN

| command | result |
|---|---|
| `npx tsc --noEmit` | clean |
| `npm run build` | clean, 3.91s; `dist/` newer than both edited sources |
| `node qa/rivalswing.mjs maple 4177` | **PASS** — surges 1, stretch lead changes 2, arcs 1 (BIGSHOT, peak 1.275x), B6a 6.02s, B6b 6.02s, 0 game-fired demotions |
| scratchpad overlap probe (mine, not a repo file) | the measurement in §3 |
| `node qa/evolveonce.mjs 4177 maple` | **TIMED OUT twice** — see §5. Not a patch defect; I proved its clause from source instead. |

I also read the implementer's own raw run files, which are still on disk in
the scratchpad (`before.txt`, `after1..after4`, `after5-pirate.txt`), and
compared them line for line against the landing note. Two of those comparisons
are findings; see D4 and D5.

---

## 1. C-C — DOES A FORM LOSS ACTUALLY SURVIVE? **YES. VERIFIED.**

Traced from source, not from the report.

**The hold is on the right statement.** I enumerated every `voidling.setRadius`
call in `prototype3d.ts` — there are exactly ten (1855, 2504, 2520, 2636, 5082,
6486, 8526, 8527, 8549, 9655). Inside a live frame of a live match only these
can move the hero's radius:

```
8526  if (!frozenR && voidling.radius > lastR + maxStep) setRadius(lastR + maxStep)   // lowers only
8527  if (!frozenR && voidling.radius > lawCap)          setRadius(lawCap)            // lowers only
8528  lastR = voidling.radius
8549  if (!frozenR && radius < scoreFloor && tClock >= demoteHold) setRadius(scoreFloor)   // the only riser
5082  setRadius(growRadius(voidling.radius, e.radius))    // eating — the intended way out
```

`lawCap` is monotonic in `el2`, so 8527 can never lift. 2504/2520 are the bite
handler itself; 2636 and 6486 are match start; 1855 is the QA `__setVoidR`;
9655 is the `?r=` debug preview. **The score floor at 8549 is the only per-frame
statement that raises the radius, and it is the one that carries the guard.**

**The hold expires.** `tClock += dt` at 8304 is unconditional and monotonic;
`demoteHold = tClock + 6` at 2517. There is no path that re-arms it.

**The units are right, and this is not obvious.** `tClock` is documented at
3274 as *wall* time, which would have made a 6 s hold 0.15–0.43 MATCH seconds
under swiftshader and the whole patch a no-op on the instrument. It does not,
because both clocks advance on the *same clamped* `dt`: `tClock += dt` (8304)
and `matchClock -= dtw * clockSpeed` (8311), `dt = Math.min(0.05, dtRaw)`. At
`clockSpeed` 1 with no hit-stop, six `tClock` seconds **are** six match
seconds. Measured 5.72 / 5.79 / 6.00 / 6.02 / 6.03 across the landing's five
runs and 6.02 in mine. The claim survives.

**At more than one pace**, as asked:

- *Par run, radius pinned at `lawCap`* (`scoreFloor = min(lawCap, f(score))`
  and `f(score)` is far above it mid-match): the bite drops the radius, the
  floor would restore it in one frame, the guard holds it for six. Measured:
  after2/after4, `r 2.5 → 1.632`, `+0.5s r 1.632/1.636`, `+3.0s r 1.636/1.762`.
- *A run AHEAD of its own floor* (the landing's surprise 2, which is real —
  `f(score) < radius`): the loss partially sticks even without the hold, and
  the hold still applies on top. This is why B6a on the RADIUS, not B6b on the
  form, is the fails-before bar. That reasoning is correct and I confirm it.
- *A weak run*: `scoreFloor` is smaller, same structure, same guard.

**Can the player climb back out inside the hold?** `FORM_MIN = [0, 1.6, 2.5,
3.6, 5.5, 8.0, 13.5]`, demotion lands on `FORM_MIN[st-1] * 1.02`, and the
rate limiter is `0.11 + surgeT*0.16` units/s. The smallest gap (1.632 → 2.5 =
0.868 units) needs 7.9 s outside the finale — longer than the hold, so the
hold, not the climb, is what the trace measures. Inside the finale
(`surgeT → 1`, limiter → 0.27/s) a hard-eating player CAN buy the rung back
inside six seconds, which is the owner's sentence working, not a defect.

**The one thing I would write down:** at `tClock == demoteHold` the floor
restores the whole drop in a single frame, un-rate-limited, because 8549 runs
*after* `lastR = voidling.radius` at 8528. The hero pops from 1.632 to ~3.1
in one frame, and every rival on screen pops with him (see B-2). That is the
spec working as C-C wrote it, but nobody has looked at it.

---

## 2. THE VERBATIM CORRECTIONS

I diffed each correction's text against the bytes on disk.

| correction | on disk |
|---|---|
| C-A (surgeOpen + the whole rationale block) | **identical**, character for character (rivals.ts:907-920) |
| C-B (the `else surgeCd = 4` comment) | **identical** |
| C-C hunk 2 (the hold, set on demotion) | **identical** |
| C-C hunk 3 (the guarded score floor) | **identical** |
| C-C hunk 1 (`demoteHold` beside `biteMercy`) | **NOT identical — see D1** |
| C-D (`dems: 0` on `rivalEv`; counter-based demotions in the probe) | applied |
| C-E (patch 13 anchor B) | **identical** (rivals.ts:1276-1282) |
| C-F (`bitYou` gone, bounty on `rv.stolen > 0`) | applied; `grep -rn bitYou src/ qa/ scripts/` → **0 hits** |
| C-G (the attribution readout, no bar) | present in the probe |
| C-H (two design statements in the prose) | **not applied to the prose at all — see D2** |

I also checked all 22 `**after:**` blocks in the proposal against disk
mechanically. Eight do not match verbatim, and all eight are exactly the ones
the corrections changed (patches 4, 6, 7B, 8, 11, 12, 13B, 14). Nothing else
moved. `RivalHit.form` is required and both construction sites carry it
(`rivals.ts:1600`, `prototype3d.ts:1804` — the only two in `src/ qa/ scripts/`).
`grep -cE "mrnd|mpick|mchance|\bmr\(" src/proto3d/rivals.ts` → **0**. Seeded
draws untouched. Zero new triangles.

---

## 3. KID-MERCY — THE BREAK

> **Is there any path where a child loses two forms in one surge, or is surged
> while the hunter is hunting?**

**Surged while she is hunting: NO.** `hunting = _t > 0 && _t < matchLen*0.55`
(rivals.ts:745) and `surgeOpen` requires `_t > matchLen*0.55` (rivals.ts:920).
The two are disjoint by construction; the `&& !hunting` term is belt-and-
braces and correct. A surge cannot start, or be running, while she hunts.

**But the hunt ending is not the same thing as her stopping being a
form-taker, and C-A assumed it was.**

```
rivals.ts:1557   const canBite = !isHunter || !hunting || rv.cst === 2;
```

For the hunter after `huntEnd`, `!hunting` is **true**, so `canBite` is true
**on contact, with no charge**. Her ceiling then decays at 0.3%/s
(`rv.stuffCap = max(START_R, stuffCap * (1 - dt*0.003))`, rivals.ts:1009) from
the `pr * 1.5` she reached at 55%, while the player's `lawCap` grows at
`LAW_RATE = 0.025` units/s. She therefore sits above `pr * 1.2` — the bite
gate — for roughly the first 25 seconds of the surge stretch. And every bite
this gate fires is now `form: true`, unconditionally (rivals.ts:1600).

**Measured, on the landed build, Maple, the same child driver the probe uses:**

```
huntEnd 99.0s, surge window 99.0-129.6s
Q1  STUFFED HUNTER above pr*1.2 after huntEnd: t=99.1 -> t=120.4, 20.8 match seconds
    surge live t=109.5 -> 131.2
    OVERLAP (surge live AND stuffed hunter over the bite gate): 10.4 match seconds
```

Ten and a half seconds in which **two voids can each take a form off a child,
separated only by one global 4.0 s `biteMercy`.** Against that, the comment
this landing put into `rivals.ts:912-919`:

> `// clock) ran straight through her charges. biteMercy is a SINGLE GLOBAL`
> `// 4.0s window (prototype3d.ts:2460), so two voids that can both take a`
> `// form means a child can lose two forms four seconds apart. The owner`
> `// ruled that out in the same breath as he asked for the tension...`
> `// She owns the first half; the surge owns the stretch after she is`
> `// stuffed...`

She does not stop owning the stretch when she is stuffed. She stops *charging*.
The comment is a load-bearing false statement about a mercy rail, which is the
class GOVERNOR rule 3 exists to stop and the exact charge this verdict levelled
at patch 16.

**Second, independent measurement, from the implementer's own run 3**
(`after3.txt`, the run the landing reports as "FAIL B3"): the player is 3.236
at t=103.6 and the surge pin is set off `pR0 = 1.66`. `1.66 ≈ FORM_MIN[1]*1.02
= 1.632`. So the game fired a demotion between 103.6 s and the pick. At that
moment every non-hunter is clamped to `softCap = 0.80 × 3.236 = 2.59`, and the
gate needed `> 1.2 × 3.236 = 3.88`; no surge was live yet, and a surge starting
inside the preceding 0.5 s sample could ease at most 2.59 → 2.95. **By
elimination the biter was the stuffed hunter, at ~59% of the clock, inside the
stretch C-A handed to the surge.** The landing reports that demotion as
"1 the game fired" and never asks who.

> **Two forms in one surge?**

Not from the same rival, in the ordinary case: one bite sets `surgeT = 0` and
`biteCd = 12`, and the pin sags 3.5%/s, so by t+12 s it is at 0.657× its bite
value while the floor has restored the player. The rail holds *provided the
floor restores the player*. It does not always: the verdict itself flagged the
crack ("a ~0.9 s crack, which the ~16 ms refund of the demotion closes anyway
… **it becomes real if C-C lands**"), C-C landed, and nothing was done about it
or recorded. The condition is `pr(t+12) < 0.69 × pr(bite)` — reachable only for
a player far enough ahead of their own score floor that the floor cannot lift
them back. I could not produce it in a run and I am **not** claiming it as a
bug; I am recording that the verdict predicted it, the predicate came true, and
the landing note does not mention it.

**Two forms from two voids, four seconds apart, is the reachable one**, and it
is B-1 below.

---

## 4. THE PROBE — `qa/rivalswing.mjs`

**Bars: derived, not invented.** Every one of the nine carries its arithmetic
in the header, off shipped constants: B1 from the C-A window plus `rand(4,12)`
and `rand(26,40)`; B2 from "back and forth" = two crossings; B3 from the bite
gate parsed out of `rivals.ts`; B4 from hold ≤18 s plus a worst-case sag
`ln(1.8)/0.035`, ×1.3; B5 from the sag being monotonic; B6a from `FORM_MIN[1]`
against the 0.11 units/s limiter; B7 from the charge cycle, the stuffed
window and the surge; B8 from `biteMercy` 4.0 minus the 0.5 s sample quantum.
It parses the bite gate and `FORM_MIN` out of the real source and **throws** if
the call site moved (rule 4). C-D's counter-based demotions are in. C-G's
readout is in with no bar. Scoping B2/B3/B4 to the stretch is correct and the
justification — softCap's absolute 1.6 term produces a family size lead in the
opening of *every* match, which passes the crew's filed whole-match bar on a
build with no surge — is a real find that I verified in the data (my run:
1.16x at t=30.9; `+35.7s in the opening`).

**Does it fail pre-patch?** On substance, yes, and for the stated reasons:
`ev.surges` does not exist pre-patch (B1), the family cannot leave 0.75–0.85x
in the stretch (B2/B3), and the unguarded floor returns the radius in a frame
(B6a, measured 0.03 match seconds). **But the fails-before run on record was
not produced by the file on disk** — see D5. That run must be re-taken before
this is committed as the failing evidence.

**Does it really measure that a form loss STICKS?** Yes, and it is the best
part of the file: a forced `__bite(true)` through the real handler with a
**per-frame** trace, `halfBackT` on the radius (unconditional) barred and
`stickT` on the form reported beside it. One frame is the only resolution at
which the pre-patch behaviour is visible, and the file says so.

Three weaknesses worth recording, none fatal:

1. The stick clause is only ever measured **before 50% of the clock**, from
   stage 2→1 or 1→0, through `__bite(true)` — which sets `hunter: true`. **No
   bar anywhere measures a real sibling form bite end to end**, and the surge
   stretch, where the new form-bite path actually lives, is never sampled for
   stickiness.
2. `famPeak` is a max over the whole late stretch, so the "the surged rival …
   r X against a pin of Y" line can print a radius the rival reached long after
   the surge ended. In `after3.txt` it printed `the surged rival reached 3.01`
   against a pin of 2.09 — the rival never reached 3.01 while surging.
3. The header says "FOUR of the eight bars" and then lists nine (B6a/B6b).
   Trivial, but it is a count in a header.

---

## 5. C-C'S REQUIRED RUN — `qa/evolveonce.mjs`

C-C required whoever landed it to *"re-run `qa/evolveonce.mjs` to prove
`bestStage` still keeps the ceremony down when the recovery is slowed rather
than instant."* The landing reports a PASS. **I could not reproduce it: the
probe timed out twice**, once alongside another run and once alone, both at its
own guard on line 85:

```
page.waitForFunction: Timeout 600000ms exceeded.  at qa/evolveonce.mjs:85:9
```

Line 85 waits for `__stages().ceremonies >= 2` on a **600 000 ms WALL** budget.
Form 2 arrives at 83–103 match seconds on this build (my run: stage 2 at
t=102.4; `after2`: 92.9; `after4`: 83.1), and the machine is at load average
10 on 4 cores with 22 chromium processes belonging to other crews. At the slow
end of the documented 14–40x clock that is 1160–4100 wall seconds. **This is a
wall-clock guard on a match-clock event — governor rule 4's second failure mode
— and it is pre-existing, not this patch's doing.** It will flake the gate on a
loaded machine whatever else is true.

**So I proved C-C's clause from source instead, which is stronger than the run
would have been.** `evolveCeremonies++` sits inside `if (ns > bestStage)`
(prototype3d.ts:9364-9365), and `bestStage` is written at exactly two places in
the file — `:9365` (increase only) and `:6485` (`resetMatch`). Nothing walks it
back; the bite handler moves `curStage` alone. **A slower recovery therefore
cannot re-fire the ceremony, by construction, at any hold length.** The comment
at `:9417` already says the soundtrack — and only the soundtrack — follows the
climb home, and that is still true.

What the run would still add, and should be taken when the machine is quiet: a
reading that the demote hold does not *stall* the climb badly enough to change
how many forms a child reaches in a match. Nothing in the six post-patch runs on record — their five and mine — suggests it
does, but nothing measures it either.

---

## 6. SCOPE

Nothing landed beyond the verdict. The source diff is exactly patches
1,2,3,4,5,6,7,8,9,10,11,12,13A,14,15,16,17,18 with C-A/C-B/C-C/C-D/C-E/C-F
applied; `qa/rivalswing.mjs` is the new file the verdict's kill entitled them
to write. `hurtUntil` is untouched, the steal-during-mercy asymmetry is
untouched, `announceHtml`/`esc`/`.bCard`/`.bIco`/`.bTx`/`.bSub` all exist.
`demoteHold` is not reset between matches; I traced it and agree it is a no-op
(at match start `playerScore` is 0 so `scoreFloor` is `START_R` and the radius
already equals it).

The working tree also carries untracked files that are **not** this crew's and
are newer than its last edit: `qa/lookpair.mjs` (10:18), `gameday.log` (10:12),
`docs/crews/round-2b/spawn-sky.verdict.md` (10:21),
`docs/crews/round-2b/gameday-red.proposal.md` (09:32) against sources last
edited at 09:06 and `qa/rivalswing.mjs` at 09:21. The implementer flagged one
of the four; all four are somebody else's.

---

## DIVERGENCES — each with its fix

**D1 — C-C hunk 1 is not verbatim, and it truncates a quotation.**
The verdict:

```ts
// interval: "about sixteen milliseconds after the BONK float". That is why
// that probe had to suppress the EVOLVED ceremony rather than the recovery.
```

`prototype3d.ts:2469-2470`:

```ts
// interval: "about sixteen milliseconds". That is why that probe had to
// suppress the EVOLVED ceremony rather than the recovery.
```

`after the BONK float` is dropped from a quotation of `qa/evolveonce.mjs`'s
header — the sentence that identifies *which* sixteen milliseconds. Round-2b
rule 2: a correction is verbatim or it does not exist; the landing says all
three C-C hunks landed as a unit and does not record the edit.
**Fix:** restore the four dropped words and the verdict's line break.

**D2 — C-H was never applied, and never recorded as not applied.**
`git status` shows `docs/crews/round-2b/rival-loop.proposal.md` unmodified, and
the landing note does not contain the string "C-H". Its item 1 was folded into
the patch-8 code comment instead (a better home, and I have no objection), but
its item 2's figure was **silently changed** from the verdict's "the last surge
clears by ~72% of the clock" to "The last surge clears by ~72-79% of the clock
either way" (rivals.ts:893). The new figure is the *more accurate* one — C-A's
"~72%" is wrong for the same reason the landing's own surprise 3 gives — but
changing a correction's number without saying so is the move the round-2b rules
exist to stop.
**Fix:** record in the landing note that C-H was applied to the code comment
rather than the proposal prose, and that item 2's figure was corrected to
72–79% because the last surge starts at 103–111 s and clears at 128–142 s.

**D3 — patch 8's blessed after-text was edited in two further places without
record.** Beyond C-A and C-B, the landed comment (a) replaces the filed bullet
`window 24%-72% of the clock: not in the opening (a VOIDLING has no form to
lose) and not in the finale...` with `not in the finale: VOID TITAN's feast
needs the family eatable`, and (b) inserts a new 11-line paragraph
(`ONE THING THE PROPOSAL CLAIMED AND THE SKEPTIC KILLED...`). Both are
*improvements* — keeping "24%-72%" would have been a false number under C-A —
but the landing says "every anchor verified by BEFORE-TEXT match; all eighteen
were on disk verbatim" and "C-A applied verbatim", which reads as "the
after-texts are the filed ones plus the corrections". They are not.
**Fix:** list both edits in the landing note.

**D4 — the landing quotes a probe run as verbatim with a clause deleted.**
Landing note, "Run 3, maple":

```
peak family/player size    1.126x at t=112.4s   (pin 1.66 x 1.26 = 2.09; the bite gate needs 1.2x)
```

`after3.txt`, as it actually ran:

```
peak family/player size    1.126x at t=112.4s   (pin 1.66 x 1.26 = 2.09; the surged rival reached 3.01; the bite gate needs 1.2x)
```

The deleted clause is the one that would have prompted the question "reached
3.01 when?", which is finding 2 in §4.
**Fix:** quote it as it ran, or mark the elision.

**D5 — "Instrument identical to the one that produced the post-patch runs" is
false.** The raw files show at least three versions of `qa/rivalswing.mjs`:
`before.txt` and `after1.txt` print no peak diagnostic at all; `after2.txt`
and `after3.txt` print `peak family/player size … biggest sibling reached /
the surged rival reached`; `after4.txt`, `after5-pirate.txt` and the file on
disk print `the surged rival NAME: peaked at …`. The **bars** are identical in
all of them — I checked the FAIL strings — so the fails-before argument stands
on substance. The sentence does not, and the pre-patch run was never re-taken
against the file that is being committed.
**Fix:** re-run the pre-patch build with the file on disk and replace the
recorded failing run, or state which version produced it.

**D6 — `qa/titan.mjs` and `qa/laneshort.mjs` were not run.** Recorded honestly
by the implementer and flagged for the governor, so this is a gap rather than a
concealment — but the proposal's own "the other instruments this lands against"
section names four and two were skipped. `titan.mjs` is the one that matters:
its feast depends on the family being eatable in the finale, and this patch is
the first thing in the game's history that can put a non-hunter above the
player. B5 held 6/6 (5 theirs, 1 mine) and every surge cleared by ~131–142 s
against a 180 s whistle, which is the argument — but it is still an argument.
**Fix:** run both.

---

## BUGS

### B-1 — TWO FORM-TAKERS OVERLAP FOR ~10-21 MATCH SECONDS, AND THE TREE SAYS THEY CANNOT. *(the break)*

Proved twice above (§3): once by direct measurement (10.4 s of overlap, the
stuffed hunter over the bite gate for 20.8 s of the stretch), once by
elimination from the implementer's own run 3. The mechanism is three lines:

```
rivals.ts:745    const hunting = _t > 0 && _t < huntEnd;              // huntEnd = matchLen*0.55
rivals.ts:1557   const canBite = !isHunter || !hunting || rv.cst === 2;   // !hunting ⇒ contact bite
rivals.ts:1600   api.onPlayerBitten?.(..., { ..., form: true });          // unconditional
```

The crew already knew: risk 4 says *"the stuffed-hunter contact bite escalates
from 10% to a form"*, and the probe's own B7 derivation budgets
*"HUNTER, stuffed (99-180s) … <=2"* demotions. Neither the landing nor the
verdict connected that to C-A's rationale, which is now in the tree as a
promise.

**Smallest fix — the crew's own recorded corrective, one boolean**
(proposal, risk 4): at `rivals.ts:1600`

```ts
api.onPlayerBitten?.(rv.name, { shrink: 0.85, steal, hunter: heavyBite, form: !(isHunter && !hunting) });
```

The stuffed hunter's contact bite goes back to being the percentage nibble it
has always been (`steal` is already 0 for her — `heavyBite` requires `hunting`),
C-A's "one form-taker at a time" becomes true, the comment becomes true, and
the owner's price still applies to every bite that was ever meant to carry it.
If instead the stuffed-hunter form bite is *wanted*, then C-A's comment must be
rewritten to say so and a second rail found — but it cannot stay as written.

### B-2 — THE DEMOTE HOLD OPENS THE WHOLE FAMILY'S BITE GATE ON A HELD VOIDLING FOR SIX SECONDS.

`softCap = max(min(START_R + 0.02·_t, 1.6), pr*0.80)` (rivals.ts:865). A
demotion out of form 1 lands the player on `max(START_R, FORM_MIN[0]*1.02)` =
**0.918**, and the hold now keeps them there for six match seconds. During
those six seconds:

- `softCap` = **1.6** (the absolute term), and every joined sibling sits at
  exactly 1.6 by mid-match — visible in every run table on record;
- the bite gate is `1.2 × 0.918 = 1.102`. **1.6 > 1.102: the entire family is
  over it**, and every bite it fires is `form: true`;
- the red halo gate is `rv.r > pr * EAT_RATIO` = 1.019 (rivals.ts:1906) —
  **every halo in the game turns red**;
- the approved scared face is `rv.r > R2*1.15 && dist < R2 + rv.r + 16` =
  1.056 within ~18.5 units (prototype3d.ts:8930) — any sibling that close puts
  the hero's face pale for the duration.

Measured ratios during exactly this state: **1.74x** at t=51.8 (`after2.txt`),
**1.74x** at t=51.9 (`after5-pirate.txt`), **1.38x** at t=82.6 (`after2.txt`).
Pre-patch this state lasted 0.03 match seconds. It now lasts 200x longer.

No **second form** can be taken — `if (st > 0)` guards it and `START_R` is the
floor, so the ladder rail holds, and no sibling actually connected in the six post-patch
runs on record. This is an **exposure**, not a measured harm. But it is the
"shit show of every void attacking you" *shape*, produced by the patch that was
supposed to honour the sentence that ruled it out, and it is unrecorded.

There is a visual half to it as well: `softCap` collapsing to 1.6 clamps every
sibling down (`rivals.ts:1038` and `:1853`), then the non-hunter score floor
`min(softCap, f(score))` at `:1847` snaps them all back the frame the hold
expires. In `after3.txt` the family goes 2.589 (t=103.6) → 1.6 during the hold
→ 2.737 (t=114): **five voids shrink 38% and pop back**, twice per demotion,
while the hero does the same at 8549. Nobody has looked at this on screen.

**Smallest fix:** make the mercy window cover the hold —
`biteMercy = tClock + (hit.form ? 6.0 : 2.5)` — so nothing can bite a child
while the game is holding them small. One number; B8's derivation moves from
3.5 to 5.5. It also narrows B-1's four-second door to six.

### B-3 — THE SURGE CAN CLAMP ITS CHOSEN RIVAL *BELOW* ITS ORDINARY CAP.

```ts
rivals.ts:1023-1027   if (rv.surgeT > 0) { … hardCap = rv.surgeR * 1.02; }
rivals.ts:1027-1035   else { rv.surgeR *= 1 - dt*0.035;
                            if (rv.surgeR <= softCap) rv.surgeR = 0; else hardCap = rv.surgeR; }
```

The **sag** branch guards for `surgeR <= softCap`. The **hold** branch does
not: it overwrites `hardCap = softCap` unconditionally, and `hardCap` is the
last word on size at both clamps (`:1038`, `:1853`), *after* the non-hunter
score floor at `:1847`. So whenever the pin ends up below `softCap`, the
"surged" rival is held **smaller than its non-surged siblings** while
`rv.surge` is true, the announce card is up, and the probe is attributing lead
crossings to it.

This is reachable exactly through B-4: `after3.txt`, run 3 of the landing's
five — pin `1.66 × 1.26 = 2.09`, hold cap `2.13`; at t=114 the same table shows
the player back at 3.422 and another sibling at **2.737**. The surged rival was
**22% smaller than an ordinary one** for the rest of its hold.

**Smallest fix:** `hardCap = Math.max(softCap, rv.surgeR * 1.02);`

### B-4 — THE DEMOTE HOLD POISONS THE SURGE PIN, AND THAT IS WHAT THE LANDING'S HEADLINE FAILURE ACTUALLY IS.

`sPick.surgeR = min(R_CAP, max(sPick.r, pr * 1.26))` (rivals.ts:935) pins off
`pr` at the instant of the pick. C-C now depresses `pr` by 35–55% for six
seconds. Pick inside a hold and the pin is worthless the moment the floor
restores the player.

That is run 3 exactly: a form bite at ~107 s, held at 1.632, the scheduler
picks at ~110 s off `pr = 1.66` for a pin of 2.09, the hold expires at ~113 s,
the player snaps back to 3.4, and the "surge" spends the rest of its hold at
0.6x — `family held the size lead 1.6s in the stretch`, peak 1.126x, B3 red.
The landing diagnoses that run as *"how big the player was when the surge
started"*, as if it were free variance, and files three tuning correctives for
a marginal 1.26. **The marginality is real** — my own run peaked at 1.275x, and
the landing's cleared by 1.3–6.8% — but run 3 is not an instance of it. It is a
new coupling between C-C and the scheduler that nobody has written down.

**Smallest fix:** the landing's own corrective 2, which also fixes the
marginality: re-pin while the hold runs —
`if (rv.surgeT > 0) rv.surgeR = Math.max(rv.surgeR, pr * 1.26);` — so the pin
tracks until the hold begins and freezes exactly when the player is told to go
and out-eat it. It is a tuning-adjacent change and needs its own skeptic; I am
naming it, not authorising it.

---

## WHAT I COULD NOT TEST, AND SAY SO

- I did not re-run the **pre-patch** build. Reverting the working tree to take
  that reading risked the tree the governor is about to commit, and the
  substance of the fails-before argument survives on source arithmetic. D5
  stands as a required run, not as a doubt about the mechanism.
- The **two-forms-from-one-rival** crack (§3, end) is arithmetic plus the
  verdict's own prediction. I could not produce it in a run and do not claim it.
- **B-2's harm** is an exposure with the gates measured open, not a measured
  bite. Whether a child actually gets swarmed during a hold needs a driver that
  steers *toward* siblings, which no probe in this repo does.
- `qa/titan.mjs` and `qa/laneshort.mjs` are still unrun (D6).
- My overlap measurement is **one match on Maple**. The arithmetic behind it
  (`1.5·pr₀·e^{-0.003τ}` against `pr₀ + 0.025τ`) says ~25 s on any 180 s par
  run, and the run agreed at 20.8 s. A second world would make it two.
