# VERDICT: SPLIT — THE SURGE LIVES WITH CORRECTIONS; THE UNIVERSAL FORM BITE AND THE PROBE ARE KILLED

Read against the tree at `7344a73` (working tree clean; RUNG 1 is committed, so
every prototype3d line in the proposal sits **+18** lines lower on disk — I
matched every anchor by BEFORE-TEXT and every one of the eighteen was there,
verbatim, at exactly that offset). I tried the softcap/hardcap kill the brief
asked for first and **failed** — the escape works. I killed the design's
headline claim on a different fact, and it is a fact the repo already wrote
down and then forgot.

| group | patches | verdict |
|---|---|---|
| THE SURGE (scheduler, state, cap escape, no-visits, cue, QA) | 2,3,4,5,6,7,8,9,10,14,17,18 | **SOUND WITH CORRECTIONS** (C-A, C-B) |
| THE COMEBACK EDGE | 11 | **SOUND WITH CORRECTIONS** (C-F) |
| THE UNIVERSAL FORM BITE | 1,12,13,15,16 | **KILLED AS FILED** — revivable only with C-C |
| the stale-comment rewrite | 13 (anchor B) | **KILLED** — it replaces a false comment with a differently false one (C-E) |
| `qa/rivalswing.mjs` | new file | **KILLED AS WRITTEN** — two of its six bars cannot fire (C-D), a third contradicts the design's own range (C-A), and it cannot tell the owner's clause from a timer (C-G) |

---

## THE KILL

**A form loss lasts one frame. The score floor hands it straight back, and the
repo has this in writing already.**

`src/prototype3d.ts:8499-8500`, inside the growth law, running every frame of
every live match (`if (started && !ended && !paused)` at :8269, `if (!bigStart)`
at :8420):

```ts
      const scoreFloor = Math.min(lawCap, START_R * (1 + Math.pow(playerScore / 974, 0.57)) + surgeT * surgeT * 2.6 * pace);
      if (!frozenR && voidling.radius < scoreFloor) voidling.setRadius(scoreFloor);
```

The handler's demotion (`:2483-2484`) sets the radius to
`down = FORM_MIN[st-1] * 1.02`. Nothing in a bite moves `lawCap` — it is
`START_R + (clock terms) * paceK + feastR` — and nothing moves `playerScore` by
more than the steal (8% capped 1200 for the hunter, the patch's proposed 5%
capped 600 for a sibling). So on the very next frame `voidling.radius` is
restored to `min(lawCap, f(playerScore))`, `stageFor()` reads the restored
radius at `:9310`, and `curStage` climbs back with it.

Worked at the design's own window, a par run at 60s (par ≈ 9.4k, the figure in
the growth-law comment at `:8449`): `lawCap = 0.9 + (0.022·30 + 0.025·60)·1.0
= 3.06`; the raw floor is `0.9·(1 + (9400/974)^0.57) = 4.18`; so
`scoreFloor = min(3.06, 4.18) = 3.06 = lawCap`. The player's radius mid-match
is therefore *pinned exactly at lawCap*, a bite drops it to `1.632`, and one
frame later it is 3.06 again. I ran the same arithmetic at pace 0.5 and pace
0.25 (a child who is barely scoring): the floor still lands at or above the
form the player was in, so `curStage` returns in both.

**This is not my inference. `qa/evolveonce.mjs`'s own header states it:**

> "The score floor is a pure function of playerScore, so it hands the radius
> straight back — and about sixteen milliseconds after the BONK float, a child
> who has just been eaten gets the EVOLVED card…"

That probe's fix was to suppress the *ceremony* (`bestStage`), not to make the
demotion stick. `prototype3d.ts:9367-9369` says the same thing from the other
side: *"A child who is demoted and climbs back should hear the music come back
with them."* The climb back is ~16 ms.

So the owner's sentence — *"If a void eats you it should be more punishing then
10 percent loss. Like a level loss"* — is **not delivered today for the hunter
and would not be delivered by this patch for anyone.** What the proposal
actually ships under the banner "A LEVEL. Not a percentage" is a float, a red
wash, a one-frame HUD blink, and a ≤600-point steal. The steal is real and
durable. The level loss is not. Patch 16's replacement comment —
*"drops you to the bottom of the form you are in"* — is exactly the class of
load-bearing false statement GOVERNOR.md rule 3 exists to stop, and patch 13
invokes that rule while patch 16 breaks it four lines of comment later.

The proposal never mentions the score floor. Neither does its risk list.

**Consequence for the probe:** `qa/rivalswing.mjs` measures demotions by polling
`window.__stages().cur` every 0.5 **match** seconds. Under swiftshader a match
second is 14-40 wall seconds, so a 0.5-match-second sampler steps over ~7-20
seconds of wall time; the demoted state lives one frame. Both demotion bars —
`demos > 6` and `demos >= 2 && minGap < 3.5` — are dead instruments that will
report `0` on a build where every mercy rail is broken. Two of the six bars in
the file the crew wrote to prove kid-mercy cannot fail.

---

## What I checked on disk

**1. SOFTCAP/HARDCAP ORDER — the brief's first kill target. IT SURVIVES.**

Traced the exact statement order in the patched code at `rivals.ts:882-911`:

```
let hardCap = softCap;                 // :882 — a `let`, reassignable
if (isHunter) { … hardCap = want*1.04 / rv.stuffCap … }
} else if (rv.surgeR > 0) { … hardCap = rv.surgeR*1.02  (hold)
                              hardCap = rv.surgeR       (sag) }
rv.surge = rv.surgeR > 0;
if (rv.r > hardCap) rv.r = hardCap;    // :911 — reads the ESCAPED hardCap
```

The `else if` binds to `if (isHunter)` (the `}` it replaces is the one closing
that block at :910; braces balance). `hardCap` is reassigned **before** both
clamps. I checked for a second clamp and found it: `:1689`, after the eating
loop, and it reads the *same* `hardCap` local. I checked the non-hunter score
floor at `:1683` — `Math.min(softCap, …)`, and it only ever raises `rv.r`, so
it cannot fight the sag; during the sag `hardCap = surgeR > softCap ≥ floor`, so
the two never contradict. `grep`ed every `softCap`/`hardCap`/`rv.r =` site in the
file (lines 840, 861, 867, 882, 886-888, 896-902, 911, 926, 1654, 1669, 1683-84,
1689): no other ceiling touches a non-hunter. **A surged non-hunter genuinely
exceeds `softCap`. The design is not dead on this.**

**2. TYPE SAFETY — clean.** `grep -rn "onPlayerBitten|RivalHit"` across `src/`,
`qa/`, `scripts/` returns exactly two construction sites: `rivals.ts:1436`
(patch 12) and `prototype3d.ts:1802` (patch 15). Both covered. Making `form`
required is therefore safe. Every consumer of `hit.*` is at `:2465, 2466, 2467,
2481, 2484, 2492, 2494-97, 2512, 2523, 2524, 2525` — patch 16 covers 2465,
2481, 2512, 2523, 2524, 2525; `hunterBites` at :2466 correctly stays
hunter-keyed. `hurtUntil` at :2467 is *left* keyed on `hit.hunter`, so a
sibling's form bite gives the 0.9s hurt instead of 1.3s — an inconsistency, not
a break.

`R` objects are constructed at exactly one site (`roster.push`, `:457`; `:513`
only re-pushes existing ones), so patch 6 covers the required-field additions.
`interface R` is declared inside `createRivals` at `:386` and the scheduler is
inside `update()` inside the same factory, so `R`, `rivals`, `rand`, `R_CAP`,
`api`, `pickLine`, `RIVAL_VOICE`, `surgeCd`, `px/pz/pr/dt/_t/matchLen` are all
in scope. `onSurge` is optional so `api` at `:665` needs no initialiser;
`rivals` is `const rivals = createRivals(...)` at `:2353`, typed `Rivals`, so
`rivals.onSurge = …` type-checks. `announceHtml` (`:3093`, hoisted `function`)
and `esc` (`:3069`) are both in scope for patch 17 — `onStuffed` at `:2573` uses
both, exactly as claimed. `noUnusedParameters` is off (`onNotice` at `:2554`
ignores `name`). The `__matchState` excess-property precedent holds: `lane`,
`dry` and `full` already ride the map past the declared type at `:1669-1671`
and ship, and `surge` is declared on `Rival` by patch 2 the same way they are.

**3. THE OWNER'S SENTENCE, clause by clause.**

- *"if they're larger"* — **delivered.** Verified downstream for free, exactly
  as claimed: `rivals.ts:1742` turns the halo red at `rv.r > pr * EAT_RATIO`
  (1.11), `prototype3d.ts:8881` fires the **approved** scared face at
  `rv.r > R2 * 1.15` inside `R2 + rv.r + 16`, and the look gate is 0.75x
  (`:1210`). At 1.26x all three open. This is the first time in the game's
  history the fear face fires for a sibling, and it is the thing the owner
  actually asked for in item 1. Credit where due.
- *"you go and consume and come back"* — **NOT delivered as described.** The
  proposal's counterplay is "eat the island, outgrow the pin". You cannot. The
  player's radius is pinned at `lawCap` by the score floor; eating props does
  not raise `lawCap`, it raises `pace`, and `paceK = 0.60 + 0.40·pace` tops out
  at 1.08 — at most ~5-8% of radius above par, against the 51.2% needed
  (`pr > 1.2 × 1.26 × pr₀`). The **only** term that lifts the law is `feastR`
  (`:8481`, `+= FEAST_PER_RIVAL(1.25) × clamp(rr/6, 0.55, 1.5)` at `:2423`),
  which is bought by eating **rivals** — 0.69 units per sibling, released at
  `maxStep` 0.11 units/s. So the real loop is "eat two of your other siblings
  in twelve seconds", which is a different and much narrower sentence than the
  one the design writes. The crew cites `feastR` in one clause and then
  describes a prop-eating counterplay everywhere else.
- *"back and forth"* — **delivered, but by the sag, not by the player.** The
  patch-9 comment concedes it: *"a player who ate nothing still gets the lead
  handed back."* One surge = exactly one lead crossing out and one back.
- *"challenged but give them an edge"* — the edge is intact: `PLAYER_CEIL`
  (`rivals.ts:239`, used at `:594`) is untouched, `laneWant` untouched.
- *"more punishing then 10 percent loss. Like a level loss"* — **NOT
  delivered.** See THE KILL.

**Is the 1.26x pin the counterplay it claims?** No. It is a well-shaped,
bounded, self-clearing bulge, and that is genuinely worth having. It is not a
skill expression, because the growth law will not let a player buy radius with
props inside eighteen seconds.

**4. KID-MERCY, against the real handler code.**

- *One bite ends the surge* — holds. `rv.surgeT = 0` starts the sag; `biteCd 12`
  and the sag together mean the same rival is under 1.2x long before it can bite
  again. I checked the worst case (a demotion drops `pr`, lengthening the tail):
  from `st=4` at r=5.5, `down = 3.672`, the gate closes at ~12.9 s against a 12 s
  `biteCd` — a ~0.9 s crack, which the ~16 ms refund of the demotion (THE KILL)
  closes anyway, and which the global `biteMercy` would not. Marginal, and it
  becomes real if C-C lands. Noted in C-A.
- *Demotion floor* — `if (st > 0)` guards it, `FORM_MIN[0]` is `0` and falsy so
  `(FORM_MIN[0] || START_R) * 1.02` yields 0.918 and `Math.max(START_R, …)`
  floors it at 0.9. No rung below the first. ✔
- *BULLY/COPYCAT exclusion and the cast* — verified from source. `NAMES` at
  `:78`, `ARCH_OF` casting NIBBLES=BULLY / ECHO=COPYCAT, and `reroll` at `:494`:
  `count = 3 + floor(rand*3)`, `picked = ['NIBBLES', ...others.slice(0, max(2, count-1))]`.
  Worst cast is NIBBLES + 2 others; if both are ECHO and one of
  {JELLY, BIGSHOT, GRUMPS}, one eligible sibling remains. **The crew's cast
  arithmetic is correct.**
- *No pursuit* — patch 10 is right and the anchor is right: `sociable` at `:1007`
  is the only gate that *starts* a visit (`:1008`), and patch 8 cancels one in
  flight. ✔
- **THE MERCY CLAIM THAT DOES NOT HOLD:** *"never started while the hunter is
  mid-charge"* is technically true and practically empty. The charge state
  machine (`:1233-1265`) is `cst 0` prowl `rand(21,34)`s → `cst 1` 0.85s →
  `cst 2` 2.6s → `cst 3` 1.7s. `cst >= 1` is **5.15 s of a 26-39 s cycle —
  about 15% of frames.** The guard blocks a surge only when she is already
  committed. The hunt runs to 55% of the clock; the crew's own timeline puts the
  first surge at 47-55 s and its life at 25-31 s, so **the first surge of every
  match runs straight through one or more of her charges.** `biteMercy`
  (`prototype3d.ts:2460-2462`) is a single global 4.0 s window, so once a
  sibling can also take a form, a child can lose two forms **four seconds
  apart, from two different voids** — for the first time in this game. The
  owner ruled that out in the same breath as he asked for the tension. This is
  correction C-A, and it is the one I would not land without.

**5. THE PROBE.** Dependencies all exist and are real: `__edibles` (`:1731`),
`__stages` (`:1797`), `__renderer` (`:1710` area), `__newsArc`, `ev: rivalEv`
(`:1895`). The driver and the `timeout: 900000` end-of-match wait are copied
from `qa/laneshort.mjs:61-130`, which disables rendering the same way and does
complete a full match — so the clock-rate objection I expected does **not**
apply. Fails-before: `ev.surges` is absent pre-patch and reads 0 ✔;
`changes >= 2` cannot be met pre-patch because `famR/pR` never leaves ~0.62-0.85
(the measured distribution at `rivals.ts:1195`) ✔; `arcsDone` is empty
pre-patch ✔. **Three of six bars genuinely fail before.** The other three:

- Filtering the hunter out of the size series does **not** create the blind spot
  the brief suspected — post-patch nothing but a surge can push a non-hunter's
  ratio over 1.03, so a non-swinging match cannot pass `changes >= 2`. That
  carve-out is correct.
- `share > 0.45` is **inconsistent with the design's own stated ranges.** At the
  top of `rand(12,18)` the rival is larger for hold + sag-to-parity ≈ 18 + 5.3 =
  23.3 s (the player grows ~0.8-1.0%/s while the pin is absolute, so parity
  arrives at `ln(1.26)/(0.035+0.009)`). Two surges = 46.6 s in a 100.8 s window
  = **46%.** The crew's own timeline produces a FAIL against the crew's own
  ceiling. See C-A.
- The probe cannot tell the owner's clause from a stopwatch: `arcsDone` is
  satisfied by the sag alone. See C-G.

**6. THE COMEBACK EDGE.** Marquee arithmetic is **character-identical**
(`Math.round(400 + rv.r * 180 + looted + rv.stolen)`), and
`if (marquee) { rv.score -= looted; rv.stolen = 0; }` is untouched; the new
payback rides an `else if`, so the hunter's branch cannot reach it. No double
count: the sibling's `rv.stolen` moves *out* of `rv.score` and *into* `pts`
once, then zeroes. No negative score: `Math.max(0, rv.score - rv.stolen)`.
Eating the hunter mid-hunt would take the else-branch, but that requires
`pr > rv.r * 1.2` while she eases to 1.5x — unreachable, so it is dead code, not
a bug. **Patch 11 is arithmetically clean.** One flaw, C-F.

**Seeded draws:** verified, not taken on trust.
`grep -cE "mrnd|mpick|mchance|\bmr\(" src/proto3d/rivals.ts` → **0**. The
Maple mulberry32 stream is untouched. Triangle claim is sound — the surge scales
an existing body through the existing `group.scale` at `:1709`.

---

## Corrections (verbatim)

### C-A — ONE FORM-TAKER AT A TIME. `surgeOpen` must exclude the hunt. *(blocks patch 8)*

In **patch 8**'s after-text, replace the line

```ts
      const surgeOpen = _t > matchLen * 0.24 && _t < matchLen * 0.72;
```

with

```ts
      // …AND NOT WHILE THE HUNT IS RUNNING. The `cst >= 1` guard below blocks
      // only the 5.15s of a 26-39s charge cycle in which she is already
      // committed — about 15% of frames — so under the first draft the FIRST
      // surge of every match (47-55s, against a hunt that ends at 55% of the
      // clock) ran straight through her charges. biteMercy is a SINGLE GLOBAL
      // 4.0s window (prototype3d.ts:2460), so two voids that can both take a
      // form means a child can lose two forms four seconds apart. The owner
      // ruled that out in the same breath as he asked for the tension: "I
      // don't want to create this shit show of every void attacking you."
      // She owns the first half; the surge owns the stretch after she is
      // stuffed, which is also the stretch where the finale law is opening and
      // "come back and eat it" is a thing a player can actually do.
      const surgeOpen = _t > matchLen * 0.55 && _t < matchLen * 0.72 && !hunting;
```

Consequences, stated so nobody re-derives them: the window is 99-129.6 s on a
180 s clock; `surgeCd` has long expired by then, so **exactly one surge fires,
at ~99 s, clearing by ~124-130 s.** The crew's "2 surges" timeline is gone and
its `larger-share` arithmetic falls to ~23% of the 24-80% window, comfortably
under the probe's 45% ceiling — which resolves the second inconsistency without
touching the bar. `qa/titan.mjs`'s dependency is *better* served than by the
filed version: every surge is cleared well before the whistle. The probe's
`surges < 1` and `changes < 2` bars both remain satisfiable at exactly 1 surge.
Update the proposal's timeline paragraph and the patch-8 comment's "one surge at
a time; never started while the hunter is mid-charge" bullet to say
**"never started while the hunter is hunting"**, because the old wording is what
made a 15% guard look like a rail.

### C-B — the `else` retry must not be able to spin. *(patch 8)*

In **patch 8**'s after-text, replace

```ts
          } else surgeCd = 4;   // nobody in the 40-200 band right now — ask again shortly
```

with

```ts
          } else surgeCd = 4;   // nobody in the 40-200 band right now — ask again
          // shortly. This retry costs one Math.random per 4s of an open window
          // and nothing else; it can never fire a surge it did not pick.
```

(No behavioural change. The line is called out because under C-A the window is
30.6 s wide and a 4 s retry is now a meaningful share of it; the comment stops
the next reader tuning it blind.)

### C-C — REVIVAL CONDITION for patches 1, 12, 15, 16: a form loss must survive longer than one frame.

Patches 1/12/15/16 are **KILLED as filed** and may re-land only with these three
hunks in the same commit. Without them the group ships a comment that says
"A LEVEL. Not a percentage." on top of code that gives the level back in about
sixteen milliseconds.

**hunk 1** — `src/prototype3d.ts`, before-text (on disk `:2459-2460`):

```ts
let hungryT = -99, hurtUntil = 0, smugUntil = 0, prevMood: Mood = 'cruise';
let biteMercy = 0;   // global mercy: two big rivals overlapping must not chain-bite
```

after:

```ts
let hungryT = -99, hurtUntil = 0, smugUntil = 0, prevMood: Mood = 'cruise';
let biteMercy = 0;   // global mercy: two big rivals overlapping must not chain-bite
// THE DEMOTE HOLD. tClock until which the score floor may not undo a form loss.
// Without it a demotion lives ONE FRAME: the floor (growth law, below) is a
// pure function of playerScore and lawCap, and a bite moves neither by more
// than a few per cent, so the radius — and with it curStage — is handed
// straight back on the next frame. qa/evolveonce.mjs's own header records the
// interval: "about sixteen milliseconds after the BONK float". That is why
// that probe had to suppress the EVOLVED ceremony rather than the recovery.
// A level loss nobody can see is not "more punishing then 10 percent loss"
// (the owner, decision 2) — it is less.
let demoteHold = 0;
```

**hunk 2** — `src/prototype3d.ts`, before-text (on disk `:2485-2490`):

```ts
    if (st > 0) {
      curStage = stageFor(voidling.radius);
      voidling.setStage(VISUAL_STAGE[curStage] ?? 0);
      audio.setMusicStage(VISUAL_STAGE[curStage] ?? 0);
      demoted = curStage < st;
    }
```

after:

```ts
    if (st > 0) {
      curStage = stageFor(voidling.radius);
      voidling.setStage(VISUAL_STAGE[curStage] ?? 0);
      audio.setMusicStage(VISUAL_STAGE[curStage] ?? 0);
      demoted = curStage < st;
      // …and HOLD it. Six seconds of match clock in which the score floor may
      // not lift the radius back. Eating still grows you — growRadius and the
      // rate limiter are untouched — so the way out is the owner's own
      // sentence, go and consume; and the hold expires by itself, so no child
      // is ever stuck under it. Six is the smallest number that survives a
      // 0.5s sampler with margin; it is a starting value, not a measured one,
      // and the first landing run is what sets it.
      if (demoted) { demoteHold = tClock + 6; rivalEv.dems++; }
    }
```

**hunk 3** — `src/prototype3d.ts`, before-text (on disk `:8499-8500`):

```ts
      const scoreFloor = Math.min(lawCap, START_R * (1 + Math.pow(playerScore / 974, 0.57)) + surgeT * surgeT * 2.6 * pace);
      if (!frozenR && voidling.radius < scoreFloor) voidling.setRadius(scoreFloor);
```

after:

```ts
      const scoreFloor = Math.min(lawCap, START_R * (1 + Math.pow(playerScore / 974, 0.57)) + surgeT * surgeT * 2.6 * pace);
      // …AND IT MAY NOT UNDO A FORM LOSS. See demoteHold beside biteMercy.
      // Measured from source, a par run at 60s: lawCap 3.06, raw floor 4.18,
      // so scoreFloor IS lawCap and the player's radius sits pinned exactly on
      // it — which means a demotion to FORM_MIN[st-1]*1.02 was restored on the
      // next frame and curStage climbed straight back at the stageFor() call
      // in the frame loop. Suppressing the floor for six seconds is what turns
      // "like a level loss" from a thing that is announced into a thing that
      // happens.
      if (!frozenR && voidling.radius < scoreFloor && tClock >= demoteHold) voidling.setRadius(scoreFloor);
```

The failing-before run for this is already written and already in the repo:
`qa/evolveonce.mjs`'s header describes the exact defect. Whoever lands it must
add a reading — radius and `curStage` at bite+0.5 s and bite+3 s — and re-run
`qa/evolveonce.mjs` to prove `bestStage` still keeps the ceremony down when the
recovery is slowed rather than instant.

### C-D — the probe must count demotions from the handler, not from a stage poll. *(patch 14 + the probe)*

**patch 14**, after-text becomes:

```ts
const rivalEv = { bites: 0, hunterBites: 0, stolen: 0, charges: 0, nearMiss: 0, eaten: 0, marquee: 0, notices: 0, surges: 0, dems: 0 };
```

In **`qa/rivalswing.mjs`**, in the sample object, after the `bites:` line add:

```js
        dems: ms.ev?.dems ?? 0,
```

and replace the block

```js
// 5) demotions and mercy spacing
let demos = 0, lastDemoT = -99, minGap = 99;
for (let i = 1; i < S.length; i++) if (S[i].stage < S[i - 1].stage) {
  demos++;
  if (lastDemoT > 0) minGap = Math.min(minGap, S[i].t - lastDemoT);
  lastDemoT = S[i].t;
}
```

with

```js
// 5) demotions and mercy spacing — read from the HANDLER'S OWN COUNTER, never
//    from a stage poll. Before the demote hold (see demoteHold in
//    prototype3d.ts) a form loss lived ONE FRAME, because the score floor is a
//    pure function of playerScore and hands the radius straight back —
//    qa/evolveonce.mjs's header measures the interval at "about sixteen
//    milliseconds". A 0.5-MATCH-second sampler steps over 7-20 wall seconds
//    under swiftshader, so polling __stages().cur reported ZERO demotions on a
//    build where every mercy rail was broken. A monotonic counter cannot miss
//    one however short it is; only the GAP loses resolution, and 0.5s of
//    resolution is ample against a 3.5s bar.
let demos = 0, lastDemoT = -99, minGap = 99;
for (let i = 1; i < S.length; i++) if (S[i].dems > S[i - 1].dems) {
  demos += S[i].dems - S[i - 1].dems;
  if (lastDemoT > 0) minGap = Math.min(minGap, S[i].t - lastDemoT);
  lastDemoT = S[i].t;
}
```

Note the consequence for the fails-before argument, and record it: this gives
the probe a **third** independent pre-patch failure (`ev.dems` is absent, so
`demos` reads 0 — and with no surge and no sibling form bite that is the *true*
pre-patch answer, which makes the two demotion bars vacuously green rather than
red). The demotion bars are therefore a **post-patch guard**, not a
fails-before claim, and the header must say so instead of implying otherwise.

### C-E — patch 13 anchor B replaces a false comment with a false comment.

The look gate is `rv.r > pr * 0.75` (`rivals.ts:1210`). The bite gate is
`rv.r > pr * 1.2` (`:1417`). A rival at 0.75-0.85x — which the measured
distribution at `:1195` says is 94% of them — **cannot bite at all**, so neither
"the ordinary 10%" (the old text) nor "costs A FORM" (the proposed text) is
true of the void a child is actually being told to steer around. Replace
patch 13 anchor B's after-text with:

```ts
        // No pursuit. No charge. And walking into one usually costs NOTHING:
        // this gate opens at 0.75x, the bite gate at 1.2x, and 94% of the
        // family lives at 0.75-0.85x (the distribution below). The exception
        // is THE SURGE — a sibling held above 1.2x can bite, and since owner
        // decision 2 that bite costs a form. So the look is a peer sizing you
        // up, except during a surge, when it is the real warning. The whole
        // job is to make a child steer around a big void instead of through it.
```

Patch 13 anchor A is fine as written and lands.

### C-F — the revenge bounty must not be payable on a bite the handler threw away. *(patch 11 + 12)*

`rivals.ts` fires `api.onPlayerBitten` unconditionally, and the handler's first
line is `if (tClock < biteMercy) return;` (`:2462`). Under the filed patch,
`rv.bitYou = true` is set on a bite the player never took, so the +150 bounty is
payable for nothing. The crew deferred the identical asymmetry on `steal` as
pre-existing risk #1, which is fair — but `bitYou` is **new**, so it does not
get to inherit the bug. Drop the field. In **patch 4**, delete `bitYou: boolean;`
from the added line, leaving:

```ts
    surgeR: number; surgeT: number;
```

in **patch 6** delete `bitYou: false,`, in **patch 7 anchor B** delete
`rv.bitYou = false;`, in **patch 12** delete the line `rv.bitYou = true;`, and
in **patch 11** replace the two lines

```ts
            : Math.round(100 + rv.r * 40 + rv.stolen + (rv.bitYou ? 150 : 0));
```
```ts
          rv.bitYou = false;
```

with

```ts
            : Math.round(100 + rv.r * 40 + rv.stolen + (rv.stolen > 0 ? 150 : 0));
```

and nothing, respectively. `rv.stolen > 0` is true of exactly the rivals a
revenge bounty is for, carries no new state, and inherits risk #1 rather than
adding a second copy of it.

### C-G — the probe cannot tell the owner's clause from a stopwatch. *(the probe)*

`arcsDone` is satisfied by the sag alone: the rival becomes eatable in ~13 s
whether the player ate the whole island or stood still. The owner's sentence is
about the player doing something. Add, after the `arcsDone` block:

```js
// 3b) WHO CLOSED THE ARC — the player, or the clock? The pin is 1.26x the
//     player's radius AT SURGE START and it never tracks, so a player who
//     "went and consumed" reaches pR >= 1.512x (1.2 x 1.26) the radius they
//     had when it opened and eats the rival on its own terms; a player who ate
//     nothing gets the same arc handed to them by the 3.5%/s sag. Both look
//     identical in arcsDone. This reports which one happened.
//     NO BAR YET, deliberately: the ceiling on how fast a player CAN grow is
//     lawCap, and props do not move lawCap — only feastR does, at 0.69 units
//     per sibling eaten, released through a 0.11 units/s rate limiter. Whether
//     that is reachable inside a hold is exactly what the first landing run is
//     for. Guessing the bar here is the qa/blackprops.mjs mistake.
let pR0 = 0, pRmax = 0;
for (const s of S) { if (!pR0 && s.rivals.some((r) => r.surge)) pR0 = s.pR; if (s.pR > pRmax) pRmax = s.pR; }
const earnedK = pR0 ? pRmax / pR0 : 0;
```

and, in the record, after the `larger->eatable arcs` line:

```js
console.log(`player radius across the surge: ${pR0.toFixed(2)} -> ${pRmax.toFixed(2)} (${earnedK.toFixed(2)}x; 1.51x = ate past the pin, below = the sag handed it back)`);
```

### C-H — two design statements to correct in the prose, because they will be read as measurements.

1. §design, *"The pin is the whole counterplay: the player who goes and consumes
   grows past a rival that cannot follow"* — replace with:
   **"Eating props cannot close the gap: the player's radius is pinned at
   `lawCap` by the score floor, and props move `lawCap` only through `pace`
   (≤+8% above par). The one term that lifts the law is `feastR` — 0.69 units
   per sibling swallowed, released at 0.11 units/s — so the counterplay inside a
   hold is 'eat two of your other siblings', and outside it the sag is what
   returns the lead."**
2. §design, *"the surge window closes at 72% of the clock so the finale and VOID
   TITAN's feast are never fought against a wall"* — a surge started at 71.9%
   runs to ~89%. Under C-A it clears by ~72%, so the sentence becomes true; say
   **"the last surge clears by ~72% of the clock"** rather than describing the
   start gate.

---

## What I could not kill, and say so plainly

The cap escape. I went at it the way the brief asked, traced every clamp in the
file, and it holds: `hardCap` is a per-rival `let` reassigned before both
clamps, and the surge is the first non-hunter escape in the game's history. The
scheduler's cast arithmetic is right, the seeded-draw accounting is right and I
re-ran the grep rather than believing it, the triangle claim is right, patch 11
is arithmetically clean, every one of the eighteen before-texts is on disk
verbatim, and the three warning systems the crew says fire for free (red halo at
1.11x, the approved scared face at 1.15x, the look gate at 0.75x) all really do.
This is a careful proposal. It is killed on the one thing it never looked at —
the growth law that has been quietly refunding this game's only punishment since
before the hunter shipped.
