# THE `started` CENSUS — every consumer of the match flag, before it is split

*Round 7, stream A, step 2. Produced by four independent scouts sweeping different
consumer categories, then a completeness critic whose only job was to find what the four
missed. Nothing in `prototype3d.ts` is edited until this document exists — that is the
rule the brief sets, and this is the document.*

## The count

**300 sites** across `src/prototype3d.ts`, `src/proto3d/*.ts`, `src/game/*.ts` and `index.html`.

| assignment | count | meaning |
|---|---|---|
| **WORLD** | 81 | should run from load — the world renders, the crowd idles, the player may move |
| **MATCH** | 153 | must wait for the first touch — the clock, scoring, rivals, beats, telemetry |
| **HAZARD** | 52 | will actively break when the flag moves |
| **AMBIGUOUS** | 14 | defensible both ways; a decision, not a lookup |

## The critic's verdict — read this before touching anything

> The dangerous meaning is "the match is running", and specifically the false-negative direction — anything you mis-file as MATCH goes dark. Every gate in this file puts `started` on the live side of an `&&`, so the MATCH classification is the one that turns things OFF, and the sites the scouts missed are almost entirely the sites that have to stay ON during the arm window in order for the player to produce the touch that starts the match: the ghost hand (9678), the DRAG pill and its repeats (9660, 8911), handHold (8910), the keyboard (3306), the edibility sweep (9498), and the escape hatch (7177). Getting the WORLD meaning wrong costs a puff, a desaturation pass, or a zone crossfade — cosmetic, recoverable, visible in a screenshot. Getting the MATCH meaning wrong on any one of those six produces a game that asks a five-year-old to touch the screen while having switched off every instruction that tells them to, and on desktop and in QA produces a literal deadlock: WASD is gated on `started`, so the keyboard cannot generate the first touch. The second half of the same answer is that "the match is running" is not what `started` means today at all — endMatch never clears it, so it is a since-page-load latch that stays true through the results screen and back onto the menu. A split that assumes otherwise will change behaviour in a state the census never names. This census is not safe to build from as it stands, though it is close and worth repairing rather than redoing. Its coverage of matchClock, matchLen, matchElapsed(), elapsed() and startT is complete and correct — I re-grepped all five and found no site the scouts missed, and the startT-is-dead-state call is right. But `started` is where the split actually happens, and there it is missing nine of thirty-three occurrences in prototype3d.ts, all nine in the onboarding, attract-mode and world-presentation region that the split will hurt most. Inside the one gate it does identify (8908), it summarises the contents as clock, beats, banner, countdown, buzzer and growth law, and omits handHold, guideT, presenceT and the intro velocity damper — four pieces of state whose writers sit on the other side of the split. It contains two factual errors that will misdirect a patch: 6061 is not "the dispatch every entry into a match goes through" (6136 and 7616 call beginMatch directly, and 6136 is the first-ever-launch path), and body.intro's removal is at 9855 in normal play, not 5162. And it does not mention the tapGate at 6379-6472 at all — a shipped, tested, comment-documented implementation of exactly the arm-then-touch pattern being proposed, complete with two recorded failures from getting its ordering wrong. Add the nine `started` sites, the four in-gate state variables, the `started`-is-a-latch fact, and the tapGate precedent, and this becomes a map you can cut against.

## The repair — verified by the governor, not by a scout

The critic judged the census "not safe to build from as it stands, though close, and worth
repairing rather than redoing." I repaired it by hand. Three findings, each checked against
the source rather than accepted:

### 1. `started` is a since-page-load latch, not a match state — CONFIRMED

`endMatch()` (`:5161`) sets `ended = true` and **never clears `started`**. The only line in
the file that clears it is `doQuit` (`:7193`). So `started` today means *"a match has begun
at some point since this page loaded"* and stays true through the results screen and back
onto the menu. **The real "the match is live" predicate in this codebase is
`started && !ended`**, which is why that pair appears together at nearly every gate.

This is the single most important fact for step 3, and no plan written without it would
have survived contact.

### 2. Four sites were genuinely in nobody's census

I grepped all 57 occurrences of `started` myself, discarded comments and the two IAP
status strings, and diffed the 36 real code sites against every line the four scouts cited.
Twenty-nine were covered. Four were not — and three of the critic's own "missed nine" turn
out to be newsroom copy containing the word *started* (`:3908`, `:3958`, `:4044`), which is
worth recording because it is exactly the kind of false positive that makes a census look
more complete than it is.

| site | expression | assignment |
|---|---|---|
| `:3306` | `if (started && MOVE_KEYS.includes(e.code))` — keyboard steering | **HAZARD** — the match becomes unstartable from a keyboard, and every desktop probe deadlocks |
| `:6842` | `if (started && e.mesh.visible) spawnPuff(...)` — the puff when a prop despawns | WORLD — cosmetic; a puff during the idle is harmless, a missing one is invisible |
| `:9230` | `else if ((!started \|\| DEBUG_HARNESS) && tClock - lastInput > 4)` — attract mode | **HAZARD** — during the idle `!started` is true, so the void drives itself after four seconds |
| `:9549` | `else if (started && !ended && tClock - lastInput > 8) mood = 'sleepy'` | WORLD — the crowd may look sleepy at an unattended world; that is correct |

### 3. The pattern already exists in this codebase

`#tapGate` (`:6379–6472`) is a shipped, tested, comment-documented implementation of exactly
the arm-then-touch pattern this stream proposes, carrying two recorded failures from getting
its ordering wrong. It is the precedent to read before writing a line — and once the music
start moves to the first touch, it is also the thing this stream deletes.

## THE DESIGN THIS FORCES

Because `started` is a latch and because every gate reads `started && !ended`, the safe
split is **not** to redefine `started`. It is to add one flag above it:

```
armed    — true from beginMatch: the world renders, the crowd idles, the player may move
started  — true from the FIRST INPUT: the clock, scoring, rivals, beats, telemetry
```

- **153 MATCH sites need no edit at all.** They read `started && !ended`; moving the
  assignment of `started` to the first input moves all of them together, correctly, in one
  line.
- **Four hazards are re-gated** from `started` to `armed`: keyboard steering (`:3306`),
  the ghost hand (`:9678`), the drag lesson (`:9660`, `:8911`), and the edibility sweep
  (`:9498`) — everything the player needs in order to *produce* the touch.
- **Attract mode inverts**: `(!started || DEBUG_HARNESS)` becomes `(!armed || DEBUG_HARNESS)`,
  so the void does not drive itself during the idle but still does so behind the menu.
- **The escape hatch** (`:7177`, `qBtn`) is re-gated to `armed` so a child can always leave
  a world they have not started.

That is four re-gates and one moved assignment, against 300 sites. The census earned its
cost by making that small.

That is the governing insight of this step and it inverts the intuition. **Every gate in
the file puts `started` on the live side of an `&&`**, so filing a site as MATCH is what
turns it *off*. The failure mode is therefore not "the match starts too early" — it is a
game that asks a child to touch the screen while having switched off every instruction
that tells them to.

## The 52 hazards

Sites that will actively misbehave when the flag moves. This is the working list for
step 3; each one is either re-gated or explicitly exempted, and none may be left alone.

| site | what it is | why it breaks |
|---|---|---|
| `src/prototype3d.ts:2642` | The rival system is handed the SAME `edibles` array the player eats from. A joined rival removes props from the shared world (its own `shrinking` queu | This is the 'consumes the world' coupling. There is no second larder and no rival-only prop set — so the ONLY thing standing between world-running and a half-eaten map is the join gate at rivals.ts:1077 being fed _t=0. Any regress |
| `src/prototype3d.ts:5846-5854` | Deals THIS match's two middle beats and its light hour. `bumpMatch` (game/matchdeck.ts:36) increments and PERSISTS `voidMatchN` in localStorage. | Split-sensitive in two directions at once. `applyHour` must run at world-ready — it is the lighting the parked camera renders, and without it the world is lit by the raw rig. But `bumpMatch` is a persisted counter meaning 'how man |
| `src/prototype3d.ts:9618-9619` | The crowd's LOD gate: how far out a mover still runs at full rate. Infinity during the intro (camera is 300 units up looking at the whole map), otherw | Its only 'we are not playing yet' term is `introT`, which is set in beginMatch. In the new WORLD-RUNNING state with the camera parked high, introT is 0 and camDist is large, so the gate becomes huge and every mover on the island r |
| `src/prototype3d.ts:5837` | Converts calmT from Infinity to a FINITE 3.4-4.8 seconds. After it expires the crowd may scream, pedestrians panic within the fear radius, and event b | The single most damaging crowd site if it stays at world-ready. It is the only thing in the game that takes the crowd off its permanent calm, and it does so on a wall-clock countdown that starts the moment it is called. Left at wo |
| `src/prototype3d.ts:5804` | Broadcasts the 'match' cue to all six cue listeners in life.ts. Does three different jobs at once: (a) resets bubbles/flashes and per-ped look state,  | It is not one meaning, it is two. (a) and (b) are WORLD teardown/restore and must run at world-ready or the pre-touch world shows last match's residue. (c) `live = true` is a MATCH start — see life.ts:5275 below. This cue needs sp |
| `src/proto3d/life.ts:5275` | SKYLARK FIELD's ascension controller arms here. `reset()` (:5253) zeroes mt, sets nextAt = 22, and re-tethers the whale; `live = true` starts the depa | The most dangerous single site in my area. Splitting the two halves is mandatory: `reset()` is WORLD (without it the whale is never tethered — `userData.tethered` is set NOWHERE else, so pre-touch she is off the peg and legal food |
| `src/proto3d/life.ts:5158, 5289-5294` | SKYLARK's balloon departure schedule. `mt` advances on the WALL-CLOCK dt handed to life.update — which is ungated — and the first balloon is picked at | This is a match-measured, world-CONSUMING schedule that runs entirely outside the `started` block. Today it is only correct because cue('match') lands at world-ready and the player is also playing from that instant. Under the spli |
| `src/prototype3d.ts:9678` | The ghost hand — the wordless drag lesson, the only instruction a pre-reader can follow. | Gates the very thing that produces the first touch. If `started` becomes MATCH-running, the ghost hand can never appear during world-running, so a six-year-old is shown a parked world with no instruction and no way to learn that d |
| `src/prototype3d.ts:5885` | Banks 'this child has seen a match'. Read at :6134 (first-launch autoplay branch), at :5877 as firstEver, and it drives firstRun/the tutorial. | It sits four lines under `started = true` and its own comment argues it belongs at match START rather than at the whistle. If the world-running half carries it, every launch banks the flag before the child does anything — the next |
| `src/prototype3d.ts:8925-8926` | The timer chip's only DOM write, change-gated against lastTimerText so it fires once a second rather than 60x. | It is INSIDE the gate, so during world-running the chip is never painted at all — it shows index.html:1756's literal `<div id="timer">3:00</div>`. That is a coincidental truth for the 180s default and a visible lie for solo (2:00) |
| `src/prototype3d.ts:9709` | The eat/drain loop's gate — the co-gate for ALL scoring. Its comment names the three things it protects against: menu attract mode, the results screen | Not strictly my area (it is the eating scout's line), but it is the load-bearing gate for every score write above. Called out because the growth law (:9131) and this must land on the SAME side: eating enabled with the law enabled  |
| `src/prototype3d.ts:7177` | The in-match ⌂ button opens the pause sheet — the only in-match route to sound, haptics and motion settings. | It is a `!started` early-return on a control the player may legitimately want during world-running (a parent muting the game before the child touches anything). If `started` becomes match-running, this button goes dead on the pre- |
| `src/prototype3d.ts:7186-7193` | doQuit: the LEAVE path. The only place in the file that sets `started = false`. Stamps sec AND `left` (the raw clock) and counts the match toward the  | Three problems at once under the split. (1) `left: Math.round(matchClock)` on a world-running quit reports a full clock for a match that never ran — indistinguishable from an instant rage-quit. (2) countMatch() credits the session |
| `src/prototype3d.ts:6061` | The dispatch every entry into a match goes through: full teardown-and-rebuild if a match has ever run, plain beginMatch on the very first one. | It branches on `started` as 'a match has happened before'. If `started` becomes world-running (true from load), this ALWAYS takes the resetMatch() branch — including the very first PLAY of a fresh install, which then pays the whol |
| `src/prototype3d.ts:7616` | The autostart for ?at= / ?r= / ?len= / ?fast / ?demo — how every QA script gets into a match without touching the screen. | There is no synthetic first touch in the harness. If beginMatch splits and this line only performs the WORLD half, the clock never starts under any QA run and the entire probe fleet times out (see :2183). This call must be made to |
| `src/prototype3d.ts:2183` | __matchState()'s clock/score fields — the debug surface the whole QA fleet polls. | THE hazard of this area. 349 files under qa/ wait on `(window.__matchState?.().t ?? 0) > N` as their definition of 'the match is live' — the idiom appears as `waitForFunction(… t > 0.01 / 0.2 / 5 / 46 …, { timeout: 600000 })`. Und |
| `src/prototype3d.ts:2056` | QA winds the match clock to any value so a harness can photograph the results screen without simulating three real minutes. | 55 files under qa/ call it, most as `__rushClock(0)` to force the whistle. It writes matchClock directly and relies on the frame loop's `matchClock <= 0` check (:9066) being reachable on the next frame. Once that check sits behind |
| `src/prototype3d.ts:10134` | Retires the 'DRAG or WASD to steer' label once the player has driven AND 8 match-seconds have passed. There is no matching write back to '1' anywhere  | This is the label that TELLS the player how to make the first touch, and it is the only HUD element whose retirement is a function of the match clock. Two things break. (1) One-way: opacity is never restored, so once retired the h |
| `index.html:1756` | The timer chip's literal initial content — the only thing on screen until :8926 first writes it. | The other half of the :8925 hazard. Because the DOM write is change-gated AND inside the match gate, this hardcoded string is what a world-running screen displays. It is a lie for solo (2:00) and for every ?len= run, and it will r |
| `index.html:1682-1686` | The CSS that hides the match HUD on the menu, and the two extra rules for overlays and the JS-driven .off class. | body.menu is what currently masks every one of the stale-HUD problems above. beginMatch removes it at :5888 in the same block as `started = true`. The split has to decide which half removes body.menu — the world half (the world is |
| `src/prototype3d.ts:5793` | The single entry into a live match. Every other path (first-launch autostart :6136, launchWorld → startFresh :6062, resetMatch tail :7112, the tap gat | This is the function being split. Nothing below is safe to reason about site-by-site until it is decided which half of beginMatch runs at world-entry and which at first touch. Note it is also called from INSIDE resetMatch (:7112), |
| `src/prototype3d.ts:5851` | bumpMatch() (game/matchdeck.ts:38) READS AND WRITES localStorage 'voidMatchN' — a per-world counter of matches STARTED — and returns the 0-based index | This is the clearest 'counts a match the player never started' write in the file. If it fires at world-ready, every page load burns a match number: the player who loads and walks away still advances the deck, and matchdeck's rule  |
| `src/prototype3d.ts:5865` | The single flag every consumer in this file reads as 'the match is live'. | The split point itself. `startT` is dead (only `void startT`-style reads remain; nothing schedules off it any more — the comment at :3572 records that the rivals were moved off `tClock - startT` for exactly this pause-drift reason |
| `src/prototype3d.ts:5892` | Banks 'this child has seen a match'. Read at :1608 (loader names the world), :5877 (firstEver), :6134 (the first-launch autostart branch), and written | The most consequential write in my area, and its own 20-line comment (:5885) explains why it was moved OUT of endMatch. If it fires at world-ready it marks every visitor as a returning player: the first-launch autostart at :6134 s |
| `src/prototype3d.ts:5912` | Arms the establishing camera move. Consumed at :9841 (not gated on `started` at all — it rides introT alone), which damps velocity at :9034, caps stee | The single worst interaction in the whole split. If introT is armed at FIRST TOUCH, the player's first drag is swallowed: the intro damper (:9034, known) multiplies velocity by ~0.0018x/s for 2.2-3.6 s and controlsLive is false th |
| `src/prototype3d.ts:5920` | Arms the once-in-a-lifetime tutorial beats: the welcome banner and DRAG pill (:9856), the drag nag (:9660), and the danger/bigger beats (:9685). | Every consumer of firstRun is additionally gated on `started`, so today it cannot teach a player who is not playing. If `started` becomes the WORLD flag, all four beats fire at world-entry — 'DRAG to move — eat & GROW!' over a par |
| `src/prototype3d.ts:5923` | Per-match tutorial latches. dragDone is set true by any real steer (:3227 joystick, :3306 keyboard); controlsLive is set at :9855. | controlsLive = false is the one that bites. If the WORLD phase lets the player move (the brief says it should) but controlsLive is only set when introT expires and introT is only armed at match start, then during WORLD-RUNNING con |
| `src/prototype3d.ts:6061` | The only place that chooses between a cold beginMatch and a full resetMatch (world restore, camera reset, banner/bubble clear). | It keys the decision off `started`. If `started` becomes true from load, this branch ALWAYS takes resetMatch() — so the very first match of a session pays the full restore path, and more importantly `soloMode = solo` is assigned b |
| `src/prototype3d.ts:6134` | THE FIRST-LAUNCH PATH. A brand-new profile skips the menu entirely and drops straight into a live match. | Three separate problems under the split. (1) It is the ONLY human path with no tap gate — armGate is never called here — so on first launch there is nothing on screen inviting the touch that would now start the match; a six-year-o |
| `src/prototype3d.ts:6380` | The tap gate's debug bypass: harness and viewer builds fire onTap synchronously with no gesture. | Every qa probe runs with DEBUG_HARNESS. If the first touch becomes the match start and the gate tap is that touch, this bypass keeps the probes working — but if the match start moves to the CANVAS touch instead, no harness will ev |
| `src/prototype3d.ts:6386` | THE TAP GATE'S TAP. On the reload/autoplay path this is the trusted gesture that unlocks audio and then calls launchWorld() (via the rAF at :6459). | The design question the split has to answer. If this tap IS the first touch, the match starts here — under the intro camera, with controlsLive false — and the gate has become a start button, which is what it already reads as ('TAP |
| `src/prototype3d.ts:7385` | THE DAILY REWARD GATE. Evaluated once, at module-init, and it tests whether the menu is currently visible. | Both auto paths already hide the menu before this line runs (:6135 first-launch, :6428 autoplay), so those players get no daily card — the exact class of bug the voidPlayed comment at :5885 says cost 'every player day 1 of the cal |
| `src/prototype3d.ts:7177` | The in-match ⌂ button opens the pause sheet. | #btnQuit is hidden only by body.menu (index.html:1019). During WORLD-RUNNING body.menu is off (:5893 / :6428) but `started` is false, so the button is VISIBLE AND INERT: a child in the world with no match can neither pause nor lea |
| `src/prototype3d.ts:7185` | THE QUIT PATH. Banks lifetime stats to voidStats, counts a match toward the session summary (telemetry.ts:48), emits match_quit, then tears the match  | This is the 'counts a match the player never started' site if the pause path ever becomes reachable pre-touch. countMatch() and match_quit would both fire for a run with sec:0 and left:matchLen. Today it is protected by the `!star |
| `src/prototype3d.ts:7193` | Quit tears down the match by setting both flags. | `ended = true` on a match the player left means startFresh (:6061) takes the resetMatch branch next time. If `started` is repurposed as the world flag, this line ALSO tears down the world — the crowd, the void, the camera — leavin |
| `src/prototype3d.ts:5240` | Day's-first-MATCH XP bonus. | The key is named for a match START but is written at match END. Under the split that is now the correct behaviour — but if anyone 'fixes' the name by moving it to the start, a load-and-leave burns the day's bonus for a match the c |
| `src/prototype3d.ts:8910` | The 0.45 s settle before the ghost hand appears, set at :9855 when the intro ends. | It ticks ONLY inside the match gate. If controlsLive/handHold are set during the WORLD phase (intro at world-entry), handHold never decrements and the ghost hand — the wordless lesson for the very gesture that starts the match — i |
| `src/prototype3d.ts:8911` | The guide pill's own expiry timer — the ONLY thing that hides #guide. | Same defect class. Any showGuide() call made during the WORLD phase leaves a pill on screen permanently, because nothing else removes the .show class. The picker already learned this the hard way — the comment at :6310 records sho |
| `src/prototype3d.ts:9678` | THE GHOST HAND — the wordless drag lesson, on exactly while the lesson is unlearned. | Three of its five terms break under the split: `started` is false pre-touch, `controlsLive` is only set when introT expires (:9855), and `handHold` only decrements inside the match gate (:8910). So under a naive split the hand can |
| `src/prototype3d.ts:9855` | Known site (listed in the brief). Flagged here only for its UI consequences: it is what un-hides the timer/coins/growth/quit chrome and what arms the  | Whichever half introT lands in, this line drags body.intro, controlsLive and handHold with it — three different subsystems in my area. If introT is armed at world-entry, the HUD (including a frozen 3:00 timer) reveals before there |
| `src/prototype3d.ts:9856` | THE WELCOME AND THE FIRST INSTRUCTION. Fires once, on the frame the controls go live, for a brand-new child. | Not gated on `started` at all — it rides introT. Its own comment (:5914) records the exact bug it exists to prevent: 'THE FIRST INSTRUCTION USED TO ARRIVE WHILE THE CONTROLS WERE OFF… A six-year-old obeys the first thing they are  |
| `src/prototype3d.ts:2035` | The QA newsroom probe's definition of 'is a match live'. | Every qa/*.mjs that asserts on the newsroom reads this field. If `started` is repurposed as the world flag, `live` goes true at load and every probe silently starts judging a world with no match — reporting green while measuring n |
| `src/prototype3d.ts:2183` | The main QA state dump's match-time field. | Same exposure as :2035. Probes use `t` to decide when to sample beats, rivals and the arc; a `t` that starts counting at load desynchronises every timed assertion in the suite. |
| `src/prototype3d.ts:2056` | QA hook that winds the match clock forward so a harness can photograph the results screen. | It writes matchClock directly without touching `started`. Under the split a probe could rush the clock on a match that has not begun; :9066 would then fire the whistle and endMatch would bank a full set of persistence writes (void |
| `src/prototype3d.ts:9991-9993` | The evolution ceremony block. Fires voidling.celebrate(), the EVOLVED card, audio.evolve() (:10016, which also ducks the music), camPunch(5) and camDi | This entire block is UNGATED — it sits after the camera block, outside `if (started && !ended && !paused)`. It is inert today only by accident: the only thing that moves voidling.radius upward is the growth law, which IS inside th |
| `src/prototype3d.ts:9840` | The continuous zoom law. At START_R = 0.9 (:3509) this evaluates to exactly 38. | 'The camera is parked high' is not a property this branch has. camDist is seeded at 50 (:663) and the initial placement at :10293 uses it; with introT no longer armed at load, the pre-touch camera springs 50 → 38 over about a seco |
| `src/prototype3d.ts:9851-9853` | The shadow-pass suppression for the establishing shot, and its restore. Not the intro tick itself — this is the shadow toggle my brief calls out. | This is the only thing in the file that turns the shadow pass off for an expensive high camera, and it is keyed to `introT`, which is keyed to beginMatch. The measurement is in the file's own comment at :9844-9850: the high shot r |
| `src/prototype3d.ts:5841` | Harvests every prop's contact-shadow disc out of the prop group and into a single InstancedMesh (:3000-3029, `e.mesh.remove(disc)` at :3025, SH_CAP 40 | THE BIGGEST RENDER HAZARD IN MY AREA. Grep confirms this function has exactly two callers: beginMatch (here) and the +8s/+22s re-sweep (:8903). It is NEVER called at world-build. Until it runs, every prop still carries its own sha |
| `src/prototype3d.ts:5796` | The world-integrity sweep: pushes props off asphalt, retires unfixable ones, and (at :6842) puffs away anything culled while a match is live. | Same shape as bakeContactShadows — its only callers are beginMatch and the re-sweep at :8903. Defer beginMatch and the pre-touch world is the UNVALIDATED world: props standing in road lanes, GLBs that landed badly, and the spawn-c |
| `src/prototype3d.ts:5851-5853` | The matchdeck deals the hour of day, and applyHour (:1042-1049) writes hourSunK, sun.color, island.setDusk() and — through applyLightRig — sun.intensi | A LIGHTING SNAP AT THE MOMENT OF TOUCH. Two of the three hours per world are not the default rig (HOURS at :994-1029: 'golden hour', 'under the floodlights', 'last light', 'low cloud'…), so on roughly two matches in three this is  |
| `src/prototype3d.ts:5912` | Arms the establishing shot. The only writer of introT in the file. | The crux, and it sits at the intersection of my area and three known sites. Because introT is armed here, deferring beginMatch means the establishing shot plays AFTER the first touch — over a child who has already reached for the  |
| `src/prototype3d.ts:6060-6062` | The single entry point into a match. Branches on `started` to decide whether a reset is needed first. | Camera-adjacent and easy to miss. resetMatch is the ONLY thing that restores the hand-authored opening camera: :7080 `velX = 0; velZ = 0; camDist = 50;` and :7092-7095 `camOffset.set(0.62,0.92,0.62).normalize(); camFollow.set(…)`. |

## The 14 decisions

Defensible either way. Each needs a call, and the call is recorded here rather than made
silently in a diff.

- **`src/proto3d/rivals.ts:899`** — Drives the shared void-body shader (jelly idle, nebula drift) for all five siblings, joined or not.
  - Reading WORLD: the bodies are a world material and should idle. Reading MATCH: pinning uTime at 0 pre-touch is harmless because `rv.group.visible` is false for everyone until they join. Either reading ships; flagging it only because it is the one rival uniform written above the `!joined` continue, so it is the only shader state that is live pre-touch.
- **`src/prototype3d.ts:5843-5844`** — The clock is loaded with this match's length. Solo is 120, ?len= overrides, everything else 180.
  - Both readings are defensible. WORLD: the timer chip and any pre-match HUD must show the length the player is about to get — a solo run parked on the world-running screen showing 3:00 and then snapping to 2:00 on first touch is a visible lie (and see :8925, where the chip is never repainted, so 3:00 is exactly what a solo player would see). MATCH: keeping it here means the length can still be chosen by a control the player touches after the world is up. If it moves to the WORLD half, the BEATS reschedule at :5858-5863 MUST move with it or stay below it — its own comment records that it clamps a
- **`src/prototype3d.ts:10151-10153`** — The growth bar's visibility and its per-frame (not 5Hz) repaint.
  - MATCH reading: the bar is 'the one HUD element whose whole job is to look continuous' and it measures progress toward the next form — meaningless before scoring starts, and its own comment insists it is 'only ever a MATCH element'. WORLD reading: the bar showing VOIDLING / NEXT MUNCHKIN / 0% is a perfectly honest picture of a void that has not eaten yet, and popping the whole strip into existence on the first touch is a HUD flash at the worst moment. If it goes WORLD, note paintGrowth's pip-rebuild is edge-gated on gPipStage (:4769) which is NOT reset in resetMatch — it would need clearing whe
- **`index.html:1256-1257`** — body.intro fades the timer, coins, growth bar and the ⌂ button out for the opening shot. Added at :5905 (beginMatch) and removed at :5162 (endMatch) — and, per the note at :9034, in the intro-damper b
  - If world-running owns the opening shot, body.intro is set at load and the HUD is invisible for the whole pre-touch window — which is arguably the right look, but it also hides the ⌂ button (the only route to sound settings, see :7177) for an unbounded time rather than the 2.2-3.6s the class was designed for. If match-running owns it, the HUD is fully lit during world-running with a stale timer. Decide alongside body.menu.
- **`src/prototype3d.ts:5901`** — Restarts the world's title card (cardFade, index.html:567). Its duration is driven from COPY.introLen so the card leaves with the establishing shot.
  - Two defensible readings. WORLD: the title card is the world's name reveal and belongs with the establishing shot at world-entry — the player reads MAPLE FALLS while deciding to touch. MATCH: the card is choreographed against introT and controlsLive (docs/crews/round-5/firstframe/review-choreo.md, quoted at :5897), and playing it at world-entry means a player who waits 30 seconds gets no card at all when the match actually starts. Whichever is chosen, the card and introT (:5912) must stay together — their durations are welded.
- **`src/prototype3d.ts:5910`** — Wall-clock deadline before which the EVOLVED card must not draw (read at :10009: `if (tClock > titleUntil)`).
  - Follows the title card. If the card plays at world-entry and the player waits, titleUntil has long expired by match start — which is fine. If the card plays at first touch but titleUntil is set at world-entry, the first evolution can draw over the title card, which is the exact collision the guard exists to prevent.
- **`src/prototype3d.ts:6076`** — The picker's launch: hide the picker and the menu, wait for the asset pack, then start.
  - This is where the split has to be expressed for the normal path. Reading A: launchWorld enters the WORLD (menu down, camera parked, no clock) and the match waits for the canvas touch. Reading B: launchWorld starts the match as today and the split only affects the auto/first-launch paths. Reading A is what the brief describes, but it means the picker tap dismisses the menu into a world with no HUD prompt at all — the fresh path has no tap gate (:6470) to say 'TAP TO PLAY'.
- **`src/prototype3d.ts:7114`** — PLAY AGAIN on the end card → resetMatch() → beginMatch() at :7112.
  - Does a rematch land in WORLD-RUNNING (parked camera, waiting for another touch) or start immediately? Reading A (consistent): PLAY AGAIN is itself a touch, so the match starts now — but that touch is a DOM button click on #end, not a canvas gesture, so a canvas-touch trigger would make the player tap twice. Reading B: the rematch idles until they steer, which is safer but makes PLAY AGAIN not play. Whichever is picked, resetMatch's tail call to beginMatch (:7112) is the second place the split must be expressed.
- **`src/prototype3d.ts:9660`** — The repeating DRAG lesson — three repeats, three seconds apart, while the child has not yet steered.
  - MATCH reading: it is a tutorial beat and must not lecture a player watching the intro. WORLD reading: it teaches the exact gesture that would START the match — gating it on the match means the child who has not worked out the control is told nothing at all, forever, because the match will never begin. This is the chicken-and-egg at the centre of my area. Strong recommendation: this pill and the ghost hand below must run in the WORLD phase, on the world flag, and only the post-touch beats (:9685) stay MATCH.
- **`src/prototype3d.ts:10059`** — Zone-reactive music layers follow the void across biomes.
  - WORLD reading: if the player can drive during the WORLD phase, the soundtrack should follow them or the dance floor is silent until the clock starts. MATCH reading: the zone layers ride the match track that audio.startMusic() (:5911, known site) begins, so calling setZone before the track exists is a no-op at best.
- **`src/prototype3d.ts:10134`** — Retires the 'DRAG or WASD to steer · HUNGER fuels powers' label once the player has been driving for 8 seconds of match time.
  - It mixes both clocks: `tClock - lastInput` is wall time (are they driving right now) and `matchElapsed() > 8` is match time. If the player drives during a WORLD phase, matchElapsed() is 0 and the label never retires; if the label is meant as pre-match guidance it should retire on the first real steer regardless of the clock. Two readings — WORLD (retire on any drive) or MATCH (retire 8 s into the match).
- **`src/prototype3d.ts:10191`** — The single predicate that decides whether the menu theme should be playing. Feeds both the 2 s level restatement (:10199) and the transition edge (:10212).
  - This is the audio decision the split forces and nobody has made yet. `body.menu` is removed by beginMatch (:5893) and by the auto-play gate (:6429). In WORLD-RUNNING the menu will be hidden but no match will own the music, so onMenu is FALSE and startMusic() has not run — the pre-touch idle plays in total silence, indefinitely. Reading A: that is correct and intentional (the world is quiet until you touch it, and the touch brings the score up on the same gesture). Reading B: a child looking at a living island in silence for thirty seconds reads as broken audio, and the file has a long history 
- **`src/prototype3d.ts:9553-9555`** — The hero's voice, fired on a mood transition. The mood resolve block (:9536-9558) is ungated; only the 'sleepy' branch (:9549) carries `started &&`.
  - 'sleepy' is already MATCH-gated and that is the right call — it is the exact bug beginMatch's `lastInput = tClock` reset was written for (:5809-5817, the owner's 'when the game loads the voids eyes are half closed'). 'scared' is NOT gated: it fires whenever any rival with rv.r > R*1.15 comes within R + rv.r + 16 (:9540-9542). Rivals still update pre-touch — rivals.update at :9633 is gated only on `!ended && !paused` and is merely passed t=0. So a rival drifting past the parked void makes the hero yelp and pull a frightened face before the child has touched anything. Reading A (WORLD): the hero
- **`src/prototype3d.ts:2056, 2183, 2286`** — Three debug/QA hooks that read or write match state: the clock rusher, the state snapshot, and the radius forcer (which also sets the music stage).
  - Not player-facing, but they are `started`/matchClock consumers and the QA harness drives them. __rushClock writes matchClock directly with no regard for whether a match is running — after the split it will happily rush a clock that is not ticking, which is silently a no-op rather than an error. __setVoidR sets the music stage and the visual stage without a match, and it is the most likely trigger for the ungated evolution ceremony at :9991. Whoever owns the probes should decide whether these should assert `started` or auto-begin a match.

## What the four scouts missed

The critic found **19 sites in nobody's census** and **10 indirect consumers** —
functions called from inside a gated block that read match state of their own.

| missed site | what | why it matters |
|---|---|---|
| `src/prototype3d.ts:3306` | `window.addEventListener('keydown', (e) => { if (started && MOVE_KEYS.includes(e.code)) ... })` — the WASD/arrow-key handler is ga | In no scout's census. If `started` becomes the MATCH flag and the match begins on first touch, the keyboard cannot generate a first touch: WASD is dead until the match runs, and the match will not run until the player mo |
| `src/prototype3d.ts:9230` | `} else if ((!started \|\| DEBUG_HARNESS) && tClock - lastInput > 4) {` — ATTRACT MODE. The void self-drives, picks targets and hu | The single most visible miss. Under the split an armed-but-untouched world satisfies `!started`, so four seconds after arming, the void starts driving itself around the island in front of the child who is being asked to  |
| `src/prototype3d.ts:9498` | `if (started && gateT <= 0) {` — the 0.4s size-gate sweep that desaturates every prop too big to eat toward slate. | Not in the census. This is the 'can I eat that?' readability pass — the comment records 115 visible objects silently refusing a child in their first minute as the reason it exists. On an armed world it never runs, so the |
| `src/prototype3d.ts:9660` | `if (firstRun && started && !ended && guideStep === 1 && !nomArmed && dragNags < 3 && guideT <= 0) {` — the DRAG-lesson repeat, th | Missed. This is the onboarding nag for a brand-new child who has not worked out the control — i.e. exactly the child who has not touched, i.e. exactly the child for whom the match has not started. Filing it as MATCH swit |
| `src/prototype3d.ts:9678` | `handEl.classList.toggle('show', teachDrag && started && !ended && controlsLive && handHold <= 0 && !dragDone);` — THE GHOST HAND, | Missed, and it is the worst one. The file's own comment calls it 'the only instruction a pre-reader can follow at all'. It is gated on `started`. Filed as MATCH, a five-year-old on their first launch is shown an island,  |
| `src/prototype3d.ts:9685` | `if (firstRun && started && !ended && guideT <= 0 && nomArmed) {` — the danger lesson ('that one is BIGGER than you — run!') and i | Missed. Less acute than 9660/9678 because it needs nomArmed (a real drag) anyway, but it shares the `guideT <= 0` precondition with a guideT that only decrements inside the match gate (8911), so it inherits that stall. |
| `src/prototype3d.ts:9549` | `else if (started && !ended && tClock - lastInput > 8) mood = 'sleepy';` — the idle face. | Missed. beginMatch:5817 sets `lastInput = tClock` specifically because the owner complained 'when the game loads the voids eyes are half closed'. If the flag reading `started` here goes to the MATCH side, the hero can ne |
| `src/prototype3d.ts:10059` | `if (started) audio.setZone(island.biomeAt(voidState.x, voidState.z));` — the zone crossfade that brings in the dance-floor kick a | Missed. Bare `started`, no `!ended`. Two consequences: on an armed world the music does not follow the void (which matters because attract mode at 9230 will be driving it across biomes), and because `started` is never cl |
| `src/prototype3d.ts:6842` | `if (started && e.mesh.visible) { spawnPuff(...); }` inside validateWorld()'s cull loop. | Missed. The comment records a 5.6-unit ferris wheel blinking out of the world in plain view at t=258s as the reason the puff exists: 'If the player can see it go, it has to go the way everything else goes.' This runs fro |
| `src/prototype3d.ts:8910` | `if (handHold > 0) handHold -= dt;` — INSIDE the match gate. handHold is set to 0.45 at 9855, outside it. | The census summarises the gate's contents as 'the clock decrement, the timer DOM write, the beats/fever/drum machine, the 35s banner, the ten-second ritual, the buzzer, and the growth law' — handHold is not in that list. |
| `src/prototype3d.ts:8911` | `if (guideT > 0) { guideT -= dt; if (guideT <= 0) guideEl().classList.remove('show'); }` — the ONLY decrement of guideT, inside th | Also absent from the census's summary of the gate. showGuide() is called from 9871 (intro end, outside the gate) and 10012 (evolve, outside the gate). On an armed world the DRAG pill is painted and then never expires — i |
| `src/prototype3d.ts:9034` | `if (introT > 0) { const dk = Math.pow(0.9, dt * 60); velX *= dk; velZ *= dk; }` — the intro velocity damper, INSIDE the match gat | The census mentions 9034 only in passing as 'the note at :9034' when discussing body.intro, and never lists it as a site. It is arm-time/match-time split down the middle: the establishing shot will run on the world side, |
| `src/prototype3d.ts:8914-8918` | `presenceT -= dt; if (curStage >= 2 && presenceT <= 0) { presenceT = ...; spawnSuck(...); }` — the ambient suction sparkle, inside | Not enumerated. Minor on its own, but it is a stage-driven VFX heartbeat sitting on the match side while the evolve ceremony that raises curStage (9992-10052) sits on the world side — a state pair the split has to keep c |
| `src/prototype3d.ts:5161-5206` | endMatch() sets `ended = true` (5166) and NEVER sets `started = false`. The only write of `started = false` in the whole file is d | This is the largest structural gap in the census. The census frames `started` as a binary 'the world is running' that is about to be split — but `started` is a LATCH meaning 'a match has been begun since page load and no |
| `src/prototype3d.ts:6136` | `if (!DEBUG_HARNESS && !TOPDOWN && !ASSETVIEW && !localStorage.getItem('voidPlayed')) { menuEl.style.display = 'none'; withWorldRe | The census asserts 6061 (startFresh) is 'the dispatch every entry into a match goes through'. That is false. beginMatch() is called from four places — 6062 (startFresh), 6136 (first launch), 7112 (resetMatch) and 7616 (d |
| `src/prototype3d.ts:6399-6472` | The `voidAutoPlay` reload path: it hides the splash (6428-6429), raises #tapGate reading GETTING READY…, arms it to TAP TO PLAY on | Not in any scout's census, and it is the closest existing precedent for the exact split being planned — a world that idles under an invitation until the player touches. The comments at 6408-6421 and 6474-6485 record two  |
| `src/prototype3d.ts:9855 / 5162` | `document.body.classList.remove('intro')` appears at 9855 (when introT expires and controls go live) as well as at 5162 (endMatch) | The census states body.intro is 'Added at :5905 (beginMatch) and removed at :5162 (endMatch)'. Both line numbers are wrong and one removal is missing: the add is at 5919, and the removal that actually fires in normal pla |
| `index.html:234, 246, 349, 1019` | Four more `body.menu` rules the census did not list: `body.menu #guide`, `body.menu #hand`, `body.menu #news` and `body.menu #btnQ | The census lists only 1682-1686 as 'the CSS that hides the match HUD on the menu'. body.menu is the third proxy for 'a match is happening' (after `started` and `ended`), it is removed at arm time (5893, and 6429 on the r |
| `index.html:516` | `#powers, #hunger, #hungerlbl { display: none !important; }` — powers are carved out for launch. | The census files prototype3d.ts:10134 as a HAZARD because the hungerLbl fade-out has 'no matching write back to 1 anywhere in the file'. True, but moot: #hungerlbl is unconditionally hidden, so 10134 is inert today. Wort |

| indirect consumer | what | why it matters |
|---|---|---|
| `src/prototype3d.ts:5840 → 8903 → 6842` | `_revalQueue = [tClock + 8, tClock + 22]` is armed in beginMatch on WALL time; it fires at 8903, which sits between the outro coun | This is the deferred-callback hazard in its purest form: armed at arm time, fired on wall clock, behaviour branched on the match flag at fire time. If a child looks at an armed world for 25 seconds, both sweeps run befor |
| `src/prototype3d.ts:9870` | `setTimeout(() => announce('🍽️ eat everything SMALLER than you — and have fun!!'), 3000);` armed the frame the intro camera lands  | A real setTimeout armed at what is currently match start, whose callback assumes the match is live. announce() (3424-3431) has NO `started` gate of any kind — its only suppression is the #banner `body.menu` rule (index.h |
| `src/prototype3d.ts:9871 → 8911 → 9660/9685` | showGuide() is called from the world side (9871 at intro end, 10012 in the evolve ceremony) and writes guideT; guideT is decrement | A three-hop stall that no single site reveals. Nothing here reads `started` except the two lesson gates, yet the whole tutorial chain deadlocks: pill shown → timer frozen → pill never hides → lessons permanently blocked. |
| `src/prototype3d.ts:9622 → life.ts:6937` | `life.update(dtw, tClock, ...)` runs every frame with no `started` term. beginMatch calls `life.calm(COPY.introLen + 1.2)` at 5837 | A module whose update is NOT gated but whose state is armed by beginMatch. The calm window exists so 'the opening frame is calm' — no crowd panic on the title card. Armed at arm time, it expires ~4 seconds later regardle |
| `src/prototype3d.ts:5866 / 5872 → 10237-10249 / telemetry.ts:84-95` | `resetFps()` (5866) and `qAccT = 0; qAccN = 0; qCd = 6` (5872) open two measurement windows in beginMatch. The quality ladder accu | Both are indirect consumers of the split via their window boundaries, not via the flag. If the windows open at arm, an idle armed world both spends the ladder's entire 6-second grace on frames nobody is playing and folds |
| `src/prototype3d.ts:5911 → 6408-6413, 6474-6485` | `audio.startMusic(); audio.setMusicStage(0);` in beginMatch, versus the tapGate's whole reason for existing. | Audio unlock requires a user gesture. The reload path's gate exists precisely because 'the reload burned the last page's user activation, so this page cannot legally make a sound until it is touched — which used to mean  |
| `src/prototype3d.ts:10112-10118` | `reactHardCd`, `reactCd`, the `pendingReact[i].at` countdown and `newsCd` are all decremented only inside `if (started && !ended)` | A self-consistent pair today, but it is a queue whose drain is on the match side and whose producers (4261 from beats/hero/evolve) straddle the split — the evolve ceremony at 10030 calls townReacts and is NOT inside any  |
| `src/prototype3d.ts:2183 → qa fleet` | `__matchState().t` is `started ? matchElapsed() : 0` — and qa/README.md:99-108 documents this as the canonical 'is a match running | The census lists 2183 as one HAZARD line. The real surface is the fleet: `t` is the only exported view of the flag, so whichever of the two new flags 2183 reports becomes the definition of 'started' for every probe in th |
| `qa/dailyrace.mjs:61, 91, 97` | `inMatch: !document.body.classList.contains('menu')` is a fourth, DOM-side definition of 'a match is running', and dailyrace asser | body.menu is removed at 6429 on the reload path before the tap gate is even shown, so this probe's notion of inMatch already fires at arm time, and its clock-not-burning assertion becomes trivially true once the clock on |
| `src/prototype3d.ts:9633 → rivals.ts:1076` | `rivals.update(dtw, started && !soloMode ? matchElapsed() : 0, ...)` passes a live `dtw` for the entire arm window while pinning ` | The census covers the `_t` valve but not the `dtw` half. Every dt-integrated thing inside rivals that lives ABOVE the join gate — the shared void-body shader at rivals.ts:899, and the breadcrumb trail at 865 — keeps adva |

## The 13 ordering constraints

Things that must happen in a particular order across the arm/start split. A correct set of
assignments in the wrong order is still a broken match.

1. matchLen must be assigned before the BEATS re-jitter loop runs. prototype3d.ts:5843 sets it and 5860-5863 clamps every beat into it; the comment at 5858 records that one line earlier it clamped against the PREVIOUS match's length, and against 0 on the very first match. If arm sets matchLen and start re-rolls the beats, or the reverse, that bug comes straight back.
2. firstEver must be read before voidPlayed is banked, and firstRun/teachDrag/nomArmed must be derived from that same read. 5877 reads it, 5892 writes it, 5920-5927 consume it. Split those across arm and start and the second read returns false: firstRun goes false, teachDrag goes false on every world but Maple, nomArmed goes true, and the entire first-launch tutorial switches itself off on match one with no error anywhere.
3. Whatever side matchLen lands on, resetMatch:7066 must move with it. rivals.reset(soloMode ? 120 : MATCH_LEN) deliberately re-derives the length rather than reading matchLen, because beginMatch assigns it later at 7112. That re-derivation is a hand-maintained copy of 5843 and it silently rots the moment 5843 moves.
4. handHold is written on the world side and consumed on the match side. 9855 sets handHold = 0.45 the frame the intro ends; 8910 is its only decrement and sits inside the match gate; 9678 requires handHold <= 0. Either both move together or the ghost hand can never appear.
5. guideT has the same arm-write / match-decrement shape, and it gates two further consumers. showGuide() at 9871 and 10012 writes it from outside the gate; 8911 inside the gate is the only decrement; 9660 and 9685 both refuse to fire unless guideT <= 0. A pill raised before start stays on screen and blocks every later lesson permanently.
6. The deferred world re-validation is armed on wall time and fired outside every gate. 5840 arms _revalQueue at tClock+8 and tClock+22; 8903 fires it; the cull it performs branches on `started` at 6842 to decide whether the prop puffs. Arm-to-start delay now decides whether a visible prop vanishes silently.
7. The 3-second announce timer at 9870 is armed at intro end and calls a function with no gate at all. announce() (3424) checks only bannerFree, and #banner's only suppression is body.menu, which arm already removed at 5893.
8. The audio unlock gesture must precede audio.startMusic() (5911). The tapGate on the reload path exists for exactly this (6408-6413), and the fresh-load path deliberately has no gate because the PLAY tap is the gesture (6474-6485). The first-launch path at 6136 has neither, so if arm happens there without a touch the music starts inaudible.
9. The two measurement windows opened in beginMatch — resetFps() at 5866 and qAccT/qAccN/qCd at 5872 — must open at the same moment the thing they measure begins. The ladder accumulates unconditionally (10237) and acts only while started (10238); fpsSummary ships on match_end and match_quit.
10. The timer chip's paint cache and its HTML literal must agree at arm time. lastTimerText (4558) is never reset by resetMatch or beginMatch, and index.html:1756 hardcodes 3:00. Today the lie lasts one frame; if matchClock is loaded at arm and painted only at start, a solo (120s) or ?len= run displays the wrong duration for the entire arm window.
11. body.menu removal (5893, and 6429 on the reload path) and body.intro add/remove (5919 add; 9855 and 5162 remove) are two more arm/start boundaries carrying six CSS rules between them, including #guide, #hand and #btnQuit. body.intro in particular is added on the arm side and removed by the intro timer, not by any match event.
12. Whatever new flag reports through __matchState().t (2183) becomes the definition of 'started' for the whole QA fleet, so that decision has to be made before, not after, the probes are re-run.
13. `started` is not cleared at the whistle. endMatch (5161-5206) sets only `ended`; doQuit (7193) is the sole `started = false`. Before splitting, decide what each new flag reads in all four reachable states — (false,false) boot/menu, (true,false) playing, (true,true) results AND post-btnHome menu, (false,true) post-quit menu — because six bare-`started` sites are live in the third of those today and attract mode is dead there.

## The full census

Every site, by area, with its assignment. `WORLD` = runs from load, `MATCH` = waits for the
first touch, `HAZARD` = breaks, `AMBIGUOUS` = decide.

### RIVALS, BEATS, CROWD & NEWSROOM

| site | assignment | what |
|---|---|---|
| `src/prototype3d.ts:9631` | **WORLD** | The wrapper around the whole rival tick. Deliberately NOT gated on `started` — the comment at :9626-9630 records why: 'Passing t=0 was not enough: the rivals keep moving  |
| `src/prototype3d.ts:9633` | **MATCH** | THE single valve on the entire rival system. `started` chooses between the real match clock and a hard 0; every schedule inside rivals.ts is a function of that `_t`. |
| `src/proto3d/rivals.ts:1076-1077` | **MATCH** | The join gate. Every rival is `joined:false` at construction (:600) and after `reset()` (:823), and joinAt is at minimum rand(2,5)*k seconds. At _t=0 nothing joins and th |
| `src/proto3d/rivals.ts:651` | **MATCH** | Origin of the join schedule, rolled inside reroll(matchLen). Measured from t=0 of the match clock, i.e. the first family member arrives 2-5s in and the hunter at 7-13s. |
| `src/proto3d/rivals.ts:863` | **MATCH** | NIBBLES' predator window. The `_t > 0` term is already an explicit not-started guard. |
| `src/proto3d/rivals.ts:865` | **MATCH** | The player breadcrumb trail ECHO (COPYCAT) drives down, and the source of pvx/pvz used for the BULLY's charge lead. |
| `src/proto3d/rivals.ts:899` | **AMBIGUOUS** | Drives the shared void-body shader (jelly idle, nebula drift) for all five siblings, joined or not. |
| `src/proto3d/rivals.ts:983` | **MATCH** | The family's size ceiling: a clock term plus an 80%-of-player floor. |
| `src/proto3d/rivals.ts:1044` | **MATCH** | The window in which one rival is allowed to swell above the player and take a form off them. Fires once per ~26-40s inside a fraction-of-matchLen window. |
| `src/proto3d/rivals.ts:1747` | **MATCH** | The score ladder: where this rival's score OUGHT to be by now. Feeds the feedforward band controller that multiplies their per-prop earnings. |
| `src/proto3d/rivals.ts:1779-1785` | **MATCH** | 12-second look-ahead and the measured earning rate. The `Math.max(6, _t)` floor exists specifically so the opening seconds do not read as an enormous rate. |
| `src/proto3d/rivals.ts:2000, 2030, 2034` | **MATCH** | Rival bounce, charge flash and halo pulse phase — all driven off _t. |
| `src/prototype3d.ts:2642` | **HAZARD** | The rival system is handed the SAME `edibles` array the player eats from. A joined rival removes props from the shared world (its own `shrinking` queue, then scene.remove |
| `src/prototype3d.ts:7066` | **MATCH** | Re-rolls the cast, the lanes and the join times. Called from resetMatch() ONLY — never from beginMatch(). |
| `src/prototype3d.ts:5860-5864` | **MATCH** | The authored beat schedule is (re)dealt here: each beat's slot jitters ±6s about its authored base and its `fired` latch is cleared. Comment notes it MUST sit after match |
| `src/prototype3d.ts:8908` | **MATCH** | The master match block. Contains the clock decrement, the entire beat scheduler, the fever window, the drum thump, the 35s warning, the 10-second countdown ritual and the |
| `src/prototype3d.ts:8909` | **MATCH** | The only place matchClock moves. Everything downstream — matchElapsed(), elapsed(), the beat scheduler, the arc, the growth law, the rival lanes — is derived from it. |
| `src/prototype3d.ts:8934-8936` | **MATCH** | THE BEAT SCHEDULER. Fires each beat exactly once when the visible clock passes its slot: banner + fever multiplier + ring + flash + buzz + audio sting + townReacts(+8s) + |
| `src/prototype3d.ts:8976` | **MATCH** | Forwards every beat cue into the world (parade, goat, bandfield, avalanche, whale, treasure, drum). Deliberately not a whitelist — qa/beattruth.mjs fails on any cue that  |
| `src/prototype3d.ts:8977` | **MATCH** | Arms SKYLARK's camera look-up twelve match-seconds after the whale card. |
| `src/prototype3d.ts:9900` | **MATCH** | Consumer of the whale look-up. Already carries its own `started` gate. |
| `src/prototype3d.ts:8978` | **MATCH** | Adds up to 12 loot chests to `edibles` around the player's CURRENT position (spawnBeatTreasure, :6956). |
| `src/prototype3d.ts:8979-8985, 9025-9031` | **MATCH** | LANTERN NIGHT's drum tower thumps for the beat's duration. drumRef is resolved lazily on first fire. |
| `src/prototype3d.ts:9015-9021` | **MATCH** | The HAPPY HOUR multiplier window and its pulse rings; expiring it puffs away any leftover treasure chests. |
| `src/prototype3d.ts:5805-5806` | **WORLD** | Beat-state teardown at the top of beginMatch. |
| `src/prototype3d.ts:5846-5854` | **HAZARD** | Deals THIS match's two middle beats and its light hour. `bumpMatch` (game/matchdeck.ts:36) increments and PERSISTS `voidMatchN` in localStorage. |
| `src/prototype3d.ts:9618-9619` | **HAZARD** | The crowd's LOD gate: how far out a mover still runs at full rate. Infinity during the intro (camera is 300 units up looking at the whole map), otherwise derived from cam |
| `src/prototype3d.ts:9622` | **WORLD** | The whole crowd and cast tick. Ungated on purpose (comment at :9629: 'The ambient town deliberately keeps running — the world behind the score card should still look aliv |
| `src/proto3d/life.ts:2583` | **WORLD** | The crowd's panic suppressor. Comment at :2579-2582 is explicit: 'Starts at Infinity, not 0: life.update() runs unconditionally — before the match, on the title card, and |
| `src/prototype3d.ts:5837` | **HAZARD** | Converts calmT from Infinity to a FINITE 3.4-4.8 seconds. After it expires the crowd may scream, pedestrians panic within the fear radius, and event bubbles switch to the |
| `src/proto3d/life.ts:6879-6881, 6913` | **WORLD** | The two consumers of calmT in the main update: the pedestrian chat register (ambient vs panic pool) and the event bubbles. |
| `src/proto3d/life.ts:3178, 3191, 3196, 3241, 3269` | **WORLD** | Per-pedestrian panic, the LANTERN wary band, and the panic-contagion ping loop — all suppressed by calmT. |
| `src/prototype3d.ts:10144` | **MATCH** | Feeds the crowd's mood driver (0..1) from form + devoured%. Already carries an explicit `started` gate that zeroes it. |
| `src/prototype3d.ts:5804` | **HAZARD** | Broadcasts the 'match' cue to all six cue listeners in life.ts. Does three different jobs at once: (a) resets bubbles/flashes and per-ped look state, (b) parks every beat |
| `src/proto3d/life.ts:5275` | **HAZARD** | SKYLARK FIELD's ascension controller arms here. `reset()` (:5253) zeroes mt, sets nextAt = 22, and re-tethers the whale; `live = true` starts the departure schedule. |
| `src/proto3d/life.ts:5158, 5289-5294` | **HAZARD** | SKYLARK's balloon departure schedule. `mt` advances on the WALL-CLOCK dt handed to life.update — which is ungated — and the first balloon is picked at mt = 22s, then roug |
| `src/proto3d/life.ts:5304` | **MATCH** | The finale cascade — the whole field goes up 13 seconds after the whale's card, whether she flew or was eaten. |
| `src/proto3d/life.ts:5281-5283` | **MATCH** | The whale beat un-pegs the whale for twelve seconds — the one window in which she is the biggest meal in the game. |
| `src/proto3d/life.ts:6025-6027` | **MATCH** | MAPLE's parade column. Twelve marchers driven by one mover; `pt` only advances while paradeGo. |
| `src/proto3d/life.ts:5551-5552` | **MATCH** | GAME DAY's marching band walking onto the field. |
| `src/proto3d/life.ts:6184-6194` | **MATCH** | MAPLE's loose goat, placed 20-30 units from the beat's cue position. |
| `src/proto3d/life.ts:4818-4821` | **MATCH** | POWDER PASS's avalanche. Spawns 22 edible snowballs down the Home Run on the beat. |
| `src/proto3d/life.ts:2605-2610` | **WORLD** | The shared cue listener: 'match' clears speech bubbles, camera flashes and per-ped look-up state; 'lift'/'telegraph' make everyone within 40 units look up. |
| `src/prototype3d.ts:5165` | **MATCH** | Puts the crowd back on permanent calm behind the results panel. |
| `src/prototype3d.ts:10077` | **MATCH** | The entire newsroom tick: the finale hero cue, the hero-gone banner, both reaction cooldowns, the pendingReact flush, `newsCd -= dt` and showNews(). |
| `src/prototype3d.ts:4261` | **MATCH** | The single funnel for every reactive headline (beat, evolve, landmark, rivalGone). Explicit `started` guard on entry. |
| `src/prototype3d.ts:4163` | **MATCH** | Module-init of the newsroom's sign-on countdown. Re-armed in resetMatch (:7057) but NOT in beginMatch. |
| `src/prototype3d.ts:4364` | **MATCH** | The sign-on latch: the station's greeting must be the first thing anyone hears, so the reactive queue is cleared before the first card. |
| `src/prototype3d.ts:4372` | **MATCH** | The newsroom's four-phase story driver. `clockProg` inside newsroom_arc.ts:82 is elapsed/matchLen, and arcHigh is a HIGH-WATER MARK that can never reverse. |
| `src/prototype3d.ts:4484` | **MATCH** | The QA newsroom log, timestamped in match seconds. |
| `src/prototype3d.ts:6997-7002` | **MATCH** | Per-match newsroom memory reset. In resetMatch() only — beginMatch() does not do this. |
| `src/prototype3d.ts:4597, 4615, 4630, 4639` | **MATCH** | The four rank-announce branches inside refreshHud (crown taken, crown lost, generic overtake, rival brag). All read rivals.list and all carry `started && !ended`. |
| `src/prototype3d.ts:9685-9700` | **MATCH** | The danger-teach beat: the first time a genuinely bigger joined rival comes within 70 units. |
| `src/prototype3d.ts:9660-9663` | **MATCH** | The DRAG lesson's repeat nag (3 times, 3 seconds apart). |
| `src/prototype3d.ts:9678` | **HAZARD** | The ghost hand — the wordless drag lesson, the only instruction a pre-reader can follow. |
| `src/prototype3d.ts:4727` | **MATCH** | The halfway milestone banner — a once-per-match latch inside the ungated refreshHud. |
| `src/prototype3d.ts:2035` | **MATCH** | _dbg.__newsArc QA probe — reports whether the newsroom is live. The comment notes 'a dead match' is one of the four causes a probe must distinguish. |
| `src/prototype3d.ts:2183` | **MATCH** | The main _dbg telemetry snapshot's match-time field, plus the rival roster dump at :2191-2194 (joined/arch/hunt/lane/surge). |

*HEADLINE: my area is in far better shape than expected, with ONE severe exception and two structural traps.  THE ONE THAT WILL BITE — SKYLARK'S ASCENSION (life.ts:5158/5275/5289-5294, armed from prototype3d.ts:5804 `life.cue('match')`). It is a once-on-a-schedule, world-CONSUMING system measured from match start that runs on the WALL clock through the deliberately-ungated `life.update()` at :9622. It has no `started` gate and no t=0 valve. First balloon departs 22s after cue('match'); departed balloons are removed from `edibles` accounting permanently for that match. If `life.cue('match')` stays at world-ready, a child who watches the title for a minute has already lost ~6 balloons and part *

### THE CLOCK, SCORING AND THE HUD

| site | assignment | what |
|---|---|---|
| `src/prototype3d.ts:3538` | **WORLD** | Module const. The default match length, ?len= overridable. |
| `src/prototype3d.ts:3539` | **MATCH** | ?fast multiplier, read at exactly one site — the per-frame decrement at :8909. |
| `src/prototype3d.ts:3541` | **WORLD** | The module-scope initialisation of the whole match-state block. |
| `src/prototype3d.ts:3585` | **WORLD** | THE canonical 'how long has the match been running' expression. Unclamped — it can read negative before the first tick and >matchLen during the 2s outro. |
| `src/prototype3d.ts:3610` | **WORLD** | The telemetry-safe elapsed: floored at zero because the raw expression reads a hair negative before the first tick. |
| `src/prototype3d.ts:3611` | **WORLD** | m:ss formatter for the timer chip; clamps negatives to 0. |
| `src/prototype3d.ts:5751` | **WORLD** | The declaration of the flag being split. startT is set once at :5865 and read NOWHERE — grep across src/prototype3d.ts, src/proto3d/*.ts and src/game/*.ts finds only the  |
| `src/prototype3d.ts:5865` | **MATCH** | The single moment being split. Everything above it in beginMatch is world setup; everything that reads `started` keys off this. |
| `src/prototype3d.ts:5843-5844` | **AMBIGUOUS** | The clock is loaded with this match's length. Solo is 120, ?len= overrides, everything else 180. |
| `src/prototype3d.ts:5858-5863` | **MATCH** | Per-match beat scheduling: each authored slot jittered +-6s and clamped into matchLen, and every bt.fired cleared. |
| `src/prototype3d.ts:5866` | **MATCH** | Zeroes the frame-rate accumulator that fpsSummary() reports on every match_end and match_quit. |
| `src/prototype3d.ts:5872` | **MATCH** | Restarts the adaptive-quality ladder's sampling window with six seconds of grace. |
| `src/prototype3d.ts:5878-5883` | **MATCH** | The funnel's match_start event. |
| `src/prototype3d.ts:5885` | **HAZARD** | Banks 'this child has seen a match'. Read at :6134 (first-launch autoplay branch), at :5877 as firstEver, and it drives firstRun/the tutorial. |
| `src/prototype3d.ts:5807` | **WORLD** | beginMatch's per-match scalar reset, including the growth-law rate limiter's baseline and the results screen's own bite count. |
| `src/prototype3d.ts:8899` | **WORLD** | The slow-motion outro countdown, ticking on RAW dt outside every gate, and the sole caller of endMatch(). |
| `src/prototype3d.ts:8908` | **MATCH** | THE gate. Everything from :8909 to :9163 lives inside it: the clock decrement, the timer DOM write, the whole beats/fever/drum machine, the 35s banner, the ten-second rit |
| `src/prototype3d.ts:8909` | **MATCH** | The only decrement of the match clock in the file. Scaled by dtw so hit-stop slows it, and by clockSpeed for ?fast. |
| `src/prototype3d.ts:8925-8926` | **HAZARD** | The timer chip's only DOM write, change-gated against lastTimerText so it fires once a second rather than 60x. |
| `src/prototype3d.ts:4558` | **WORLD** | The paint cache backing :8926. Declared high on purpose (TDZ note in the comment) and never reset — not in resetMatch, not in beginMatch. |
| `src/prototype3d.ts:8934` | **MATCH** | The beats block's own copy of match-elapsed (an open-coded matchElapsed()). |
| `src/prototype3d.ts:8935-8936` | **MATCH** | Beat firing: the multiplier, the hero card, the newsroom hand-off, the buzz, the rings, the flash, audio.matchBeat, life.cue. |
| `src/prototype3d.ts:8977` | **MATCH** | SKYLARK's whale beat schedules the void's look-up twelve MATCH seconds after the card. |
| `src/prototype3d.ts:9900` | **MATCH** | The consumer of :8977 — releases the camera look-up. |
| `src/prototype3d.ts:9035` | **MATCH** | The last-35-seconds branch: red timer, the EAT FASTER banner, the ten-second ritual. |
| `src/prototype3d.ts:9036` | **MATCH** | Turns the timer chip red for the last 35 seconds. Cleared at :7111 in resetMatch. |
| `src/prototype3d.ts:9041` | **MATCH** | The 35-second banner, one-shot per match via moments.last30 (reset at :7101). |
| `src/prototype3d.ts:9054-9063` | **MATCH** | The ten-second countdown ritual: one huge numeral a second, a rising-pitch tick, a tightening ring. |
| `src/prototype3d.ts:5431 / 7102` | **MATCH** | The countdown's per-second edge latch and its reset in resetMatch. |
| `src/prototype3d.ts:9066-9071` | **MATCH** | THE BUZZER. The only path to endMatch(): it arms the two-second slow-mo outro, which :8899 counts down and then calls endMatch(). |
| `src/prototype3d.ts:9074` | **MATCH** | The growth-law block's outer guard (?r= debug disables the whole law). |
| `src/prototype3d.ts:9076` | **MATCH** | The growth law's copy of match-elapsed. Feeds surgeT, par, warm and lawCap. |
| `src/prototype3d.ts:9082` | **MATCH** | The finale surge ramp — 0 until two thirds of the clock, 1 at the whistle. |
| `src/prototype3d.ts:9109-9114` | **MATCH** | The pace term: how the run is going against a fitted par curve, blended in over the first 25 match-seconds. |
| `src/prototype3d.ts:9130-9133` | **MATCH** | The ceiling the radius may never exceed. A pure function of the match clock, the score and rivals eaten. |
| `src/prototype3d.ts:9136-9139` | **MATCH** | The growth rate limiter and the absolute clamp, plus the per-frame re-seed of lastR. |
| `src/prototype3d.ts:9151` | **MATCH** | The score floor — strong scoring pulls the radius up toward the cap. |
| `src/prototype3d.ts:9160` | **MATCH** | Applies the floor unless a demotion hold is running. |
| `src/prototype3d.ts:3530` | **WORLD** | Module-scope seed of the rate limiter's previous-frame radius. |
| `src/prototype3d.ts:2721` | **MATCH** | Score for eating a rival, inside rivals.onRivalEaten. |
| `src/prototype3d.ts:2717` | **MATCH** | The only term that can lift the radius past LAW_TOP; added to lawCap at :9133. Reset at :7100. |
| `src/prototype3d.ts:2725` | **MATCH** | Telemetry stamped with the match time. |
| `src/prototype3d.ts:2818` | **MATCH** | A hunter bite steals score. |
| `src/prototype3d.ts:2837-2839` | **MATCH** | The growth bar flashes red when a bite costs you a pip. |
| `src/prototype3d.ts:2848-2851` | **MATCH** | Bite telemetry with a match-time stamp. |
| `src/prototype3d.ts:5529` | **MATCH** | The main scoring line — every prop eaten. pts = radius * 12 * comboMult * preyMult * feverMult. |
| `src/prototype3d.ts:5553` | **MATCH** | Sticker-find bonus points, plus the STICKER FOUND! banner. |
| `src/prototype3d.ts:5603` | **MATCH** | matchEaten is the results screen's BITES tile (:5311) and the `eaten` field on match_end (:5203, :5410) and match_quit (:7190). |
| `src/prototype3d.ts:9709` | **HAZARD** | The eat/drain loop's gate — the co-gate for ALL scoring. Its comment names the three things it protects against: menu attract mode, the results screen, and pause. |
| `src/prototype3d.ts:9631-9634` | **MATCH** | The family's whole clock: join schedule, hunt window, rubber band. Already written as a ternary that hands 0 while !started, and the outer gate deliberately omits `starte |
| `src/prototype3d.ts:5161-5166` | **MATCH** | The results path. Only caller is :8899. |
| `src/prototype3d.ts:5200-5205` | **MATCH** | Solo results telemetry, stamped with elapsed() and the fps window. |
| `src/prototype3d.ts:5408-5414` | **MATCH** | The main results telemetry. |
| `src/prototype3d.ts:5311` | **MATCH** | The results card's BITES tile. |
| `src/prototype3d.ts:7096` | **WORLD** | resetMatch's score/HUD zeroing. |
| `src/prototype3d.ts:7100-7104` | **WORLD** | Clears the feast ceiling, the one-shot milestone latches (half, last30, firstBuilding…), the countdown latch, and the ended flag. |
| `src/prototype3d.ts:7111` | **WORLD** | Clears the last-35-seconds red from the timer chip on a rematch. |
| `src/prototype3d.ts:7066` | **WORLD** | resetMatch scales the family's join times to the length beginMatch is ABOUT to choose — it deliberately re-derives the length rather than reading matchLen. |
| `src/prototype3d.ts:7170-7173` | **MATCH** | Backgrounding the app raises the pause sheet so a child called away does not lose the match. |
| `src/prototype3d.ts:7177` | **HAZARD** | The in-match ⌂ button opens the pause sheet — the only in-match route to sound, haptics and motion settings. |
| `src/prototype3d.ts:7181` | **MATCH** | Pause telemetry, match-time stamped. |
| `src/prototype3d.ts:7186-7193` | **HAZARD** | doQuit: the LEAVE path. The only place in the file that sets `started = false`. Stamps sec AND `left` (the raw clock) and counts the match toward the session. |
| `src/prototype3d.ts:6061` | **HAZARD** | The dispatch every entry into a match goes through: full teardown-and-rebuild if a match has ever run, plain beginMatch on the very first one. |
| `src/prototype3d.ts:7616` | **HAZARD** | The autostart for ?at= / ?r= / ?len= / ?fast / ?demo — how every QA script gets into a match without touching the screen. |
| `src/prototype3d.ts:2183` | **HAZARD** | __matchState()'s clock/score fields — the debug surface the whole QA fleet polls. |
| `src/prototype3d.ts:2056` | **HAZARD** | QA winds the match clock to any value so a harness can photograph the results screen without simulating three real minutes. |
| `src/prototype3d.ts:2035` | **MATCH** | __newsArc()'s `live` field — the probe's answer to 'is this a dead match?', one of the four causes qa/newsarc.mjs distinguishes between. |
| `src/prototype3d.ts:2047` | **WORLD** | __newsArc() publishes this match's length so a probe never assumes 180. |
| `src/prototype3d.ts:2126-2127` | **WORLD** | QA forces a radius and sets frozenR so the growth law stops clawing it back. |
| `src/prototype3d.ts:10137-10138` | **WORLD** | The 5Hz HUD tick. UNGATED — runs every frame from boot, including on the menu and behind the results card. |
| `src/prototype3d.ts:10288` | **WORLD** | The boot-time HUD paint, at the very bottom of the module. |
| `src/prototype3d.ts:4559-4661` | **WORLD** | The rank machine: computes the live board, runs the 1.4s settle, and fires the crown / lost-crown / overtake / overtaken banners. |
| `src/prototype3d.ts:4597-4599` | **MATCH** | The crown banner — taking first place. |
| `src/prototype3d.ts:4615-4617` | **MATCH** | The mirror — losing first place. |
| `src/prototype3d.ts:4630-4634` | **MATCH** | The ordinary overtake banner. |
| `src/prototype3d.ts:4639-4640` | **MATCH** | A rival passing you gets a speech bubble. |
| `src/prototype3d.ts:4708-4724` | **WORLD** | The DEVOURED accounting. Runs inside refreshHud at 5Hz from boot. |
| `src/prototype3d.ts:4727` | **MATCH** | The halfway milestone banner, one-shot per match. |
| `src/prototype3d.ts:4168-4172` | **WORLD** | The continuous 0..1 'how bad has it got', from form and devoured percent. No clock term. |
| `src/prototype3d.ts:10144` | **MATCH** | Hands the crowd its panic level at 5Hz, forced to 0 when no match is live. |
| `src/prototype3d.ts:10151-10153` | **AMBIGUOUS** | The growth bar's visibility and its per-frame (not 5Hz) repaint. |
| `src/prototype3d.ts:4767-4801` | **WORLD** | The bar's paint, change-gated on gPipStage / lastGm / lastGw. |
| `src/prototype3d.ts:3615-3625` | **WORLD** | The coin counter. Ungated, called at module init with 0 to paint the wallet, and again from endMatch, the daily card, the shop and the drop. |
| `src/prototype3d.ts:10134` | **HAZARD** | Retires the 'DRAG or WASD to steer' label once the player has driven AND 8 match-seconds have passed. There is no matching write back to '1' anywhere in the file. |
| `src/prototype3d.ts:10237-10249` | **MATCH** | The adaptive quality ladder. Accumulates unconditionally; only ACTS while `started`. |
| `src/prototype3d.ts:9528` | **MATCH** | The harness auto-fires GULP/COLLAPSE so probes exercise the powers. |
| `src/prototype3d.ts:10031` | **MATCH** | Evolution telemetry with a match-time stamp. Sits in the evolve ceremony block (:9992-10052), which is NOT inside any `started` gate. |
| `src/prototype3d.ts:10077` | **MATCH** | The newsroom's whole per-frame block, including the cooldown that decides when a headline prints. |
| `src/prototype3d.ts:4261` | **MATCH** | The newsroom's reaction entry point, called from beats (:8993), the hero prop (:10105) and evolutions (:10030). |
| `src/prototype3d.ts:4343` | **MATCH** | fillHeadline's {S} token — 'seconds left' in a templated headline. |
| `src/prototype3d.ts:4371-4373` | **MATCH** | The newsroom arc's clock term — morning/doubt/alarm/panic is driven by whichever of 'how much is gone' and 'how far through the clock' is further along. |
| `src/prototype3d.ts:4399, 4410, 4426, 4440, 4454, 4471` | **MATCH** | Six per-world newsroom pickers (skylark, powder, gameday, lantern, pirate, maple) each receive the raw clock. |
| `src/prototype3d.ts:4484` | **MATCH** | The record qa/newsarc.mjs asserts on, timestamped in match seconds. |
| `src/prototype3d.ts:3396, 3422, 3426, 3434, 3436` | **WORLD** | The one-hero-message-at-a-time arbitration, entirely on tClock (wall clock). |
| `index.html:1756` | **HAZARD** | The timer chip's literal initial content — the only thing on screen until :8926 first writes it. |
| `index.html:1682-1686` | **HAZARD** | The CSS that hides the match HUD on the menu, and the two extra rules for overlays and the JS-driven .off class. |
| `index.html:1256-1257` | **AMBIGUOUS** | body.intro fades the timer, coins, growth bar and the ⌂ button out for the opening shot. Added at :5905 (beginMatch) and removed at :5162 (endMatch) — and, per the note a |
| `src/proto3d/telemetry.ts:48` | **MATCH** | Increments the session's match tally reported by session_end. Called from three places: :5200 (solo end), :5408 (match end), :7187 (quit). |
| `src/proto3d/telemetry.ts:52-53` | **WORLD** | Session length measured from module boot in Date.now(), plus the match count. |
| `src/proto3d/telemetry.ts:70-88` | **WORLD** | The fps window reported on match_end and match_quit. tickFrame() is called unconditionally at the top of animate() (:8888). |

*THE ONE-LINE ANSWER FOR MY AREA: the clock itself is easy — `matchClock -= dtw * clockSpeed` (:8909) is the definition of match-running and everything numeric downstream of it (beats, the 35s banner, the ten-second ritual, the buzzer, the growth law, every elapsed() telemetry stamp) follows it cleanly, because every one of those expressions is already safe at a frozen clock. What is NOT easy is the three things bolted to the same line for reasons that have nothing to do with the clock.  THE THREE REAL PROBLEMS, in order of how badly they bite:  1. THE QA FLEET IS BUILT ON `t > 0` MEANING "A MATCH IS LIVE". 349 files under qa/ poll `(window.__matchState?.().t ?? 0) > N` as their only synchron*

### UI, STATE AND PERSISTENCE

| site | assignment | what |
|---|---|---|
| `src/prototype3d.ts:5793` | **HAZARD** | The single entry into a live match. Every other path (first-launch autostart :6136, launchWorld → startFresh :6062, resetMatch tail :7112, the tap gate's onTap) funnels h |
| `src/prototype3d.ts:5794` | **MATCH** | Resets the per-run sticker/curio find list (game/stickers.ts:479). |
| `src/prototype3d.ts:5843` | **MATCH** | Chooses this match's length from soloMode. |
| `src/prototype3d.ts:5844` | **MATCH** | Arms the countdown. The clock is then decremented only inside `if (started && !ended && !paused)` at :8908/:8909. |
| `src/prototype3d.ts:5851` | **HAZARD** | bumpMatch() (game/matchdeck.ts:38) READS AND WRITES localStorage 'voidMatchN' — a per-world counter of matches STARTED — and returns the 0-based index that picks the two  |
| `src/prototype3d.ts:5859` | **MATCH** | Re-rolls each authored beat's fire time and clears its fired latch. |
| `src/prototype3d.ts:5865` | **HAZARD** | The single flag every consumer in this file reads as 'the match is live'. |
| `src/prototype3d.ts:5867` | **MATCH** | Restarts the fps accumulator and the adaptive-quality sampling window; the ladder at :10238 is gated on `started`. |
| `src/prototype3d.ts:5872` | **WORLD** | Stamps ambient telemetry dimensions carried by every later event. |
| `src/prototype3d.ts:5877` | **MATCH** | Reads the 'has ever seen a match' flag BEFORE :5892 banks it. Feeds track('match_start').first, firstRun (:5920), teachDrag (:5922) and nomArmed (:5927). |
| `src/prototype3d.ts:5878` | **MATCH** | The match_start telemetry event. |
| `src/prototype3d.ts:5892` | **HAZARD** | Banks 'this child has seen a match'. Read at :1608 (loader names the world), :5877 (firstEver), :6134 (the first-launch autostart branch), and written again at :5167 in e |
| `src/prototype3d.ts:5893` | **WORLD** | Drops the class that hides the whole in-match HUD. index.html:1682-1683 hides #timer, #growth, #hunger, #hungerlbl, #powers, #banner under body.menu; :234 #guide; :246 #h |
| `src/prototype3d.ts:5894` | **WORLD** | Hides the splash menu. |
| `src/prototype3d.ts:5901` | **AMBIGUOUS** | Restarts the world's title card (cardFade, index.html:567). Its duration is driven from COPY.introLen so the card leaves with the establishing shot. |
| `src/prototype3d.ts:5910` | **AMBIGUOUS** | Wall-clock deadline before which the EVOLVED card must not draw (read at :10009: `if (tClock > titleUntil)`). |
| `src/prototype3d.ts:5912` | **HAZARD** | Arms the establishing camera move. Consumed at :9841 (not gated on `started` at all — it rides introT alone), which damps velocity at :9034, caps steering speed at :9224, |
| `src/prototype3d.ts:5919` | **WORLD** | Sets the class that zeroes opacity on #timer, #coins, #growth and #btnQuit (index.html:1257) for the length of the opening move. Cleared at :9855 when introT expires, and |
| `src/prototype3d.ts:5920` | **HAZARD** | Arms the once-in-a-lifetime tutorial beats: the welcome banner and DRAG pill (:9856), the drag nag (:9660), and the danger/bigger beats (:9685). |
| `src/prototype3d.ts:5922` | **MATCH** | Decides whether the ghost hand runs this match (consumed at :9678). |
| `src/prototype3d.ts:5923` | **HAZARD** | Per-match tutorial latches. dragDone is set true by any real steer (:3227 joystick, :3306 keyboard); controlsLive is set at :9855. |
| `src/prototype3d.ts:5927` | **MATCH** | Arms the once-ever FIRST NOM party (:5613) and gates the drag nag (:9660) and the danger beats (:9685). Set true by a real steer at :3227. |
| `src/prototype3d.ts:6061` | **HAZARD** | The only place that chooses between a cold beginMatch and a full resetMatch (world restore, camera reset, banner/bubble clear). |
| `src/prototype3d.ts:6067` | **WORLD** | PLAY opens the world picker. |
| `src/prototype3d.ts:6073` | **WORLD** | Latch set when a world launch has to wait for the daily card; drained by closeDaily() at :7466 → launchWorld(). |
| `src/prototype3d.ts:6076` | **AMBIGUOUS** | The picker's launch: hide the picker and the menu, wait for the asset pack, then start. |
| `src/prototype3d.ts:6121` | **WORLD** | Reads the persisted solo-mode setting; the toggle writes it at :6127. |
| `src/prototype3d.ts:6127` | **WORLD** | Persists the solo toggle from the world picker. |
| `src/prototype3d.ts:6134` | **HAZARD** | THE FIRST-LAUNCH PATH. A brand-new profile skips the menu entirely and drops straight into a live match. |
| `src/prototype3d.ts:6327` | **WORLD** | World-card tap on a DIFFERENT world: persist the choice, set the autoplay latch, reload to rebuild the island. |
| `src/prototype3d.ts:6352` | **WORLD** | The season ribbon's one-tap world switch — same reload handoff as the picker card. |
| `src/prototype3d.ts:5355` | **WORLD** | The end card's 'TAKE ME THERE →' button after a world unlock — third writer of the same pair. |
| `src/prototype3d.ts:6380` | **HAZARD** | The tap gate's debug bypass: harness and viewer builds fire onTap synchronously with no gesture. |
| `src/prototype3d.ts:6386` | **HAZARD** | THE TAP GATE'S TAP. On the reload/autoplay path this is the trusted gesture that unlocks audio and then calls launchWorld() (via the rAF at :6459). |
| `src/prototype3d.ts:6399` | **WORLD** | The reload handoff: consume the latch, hide the menu, arm the gate, launch on tap. |
| `src/prototype3d.ts:6428` | **WORLD** | On the autoplay path, the splash is torn down BEFORE the gate is armed so the gate sits over the idling island, not over the menu. |
| `src/prototype3d.ts:6452` | **WORLD** | Raises the unarmed 'GETTING READY…' gate over the idling island while the pack settles. |
| `src/prototype3d.ts:6459` | **MATCH** | The gate's payload: defer to the daily card if it is up, otherwise launch. |
| `src/prototype3d.ts:7385` | **HAZARD** | THE DAILY REWARD GATE. Evaluated once, at module-init, and it tests whether the menu is currently visible. |
| `src/prototype3d.ts:7473` | **WORLD** | The daily-claim writes: six keys, plus setStreak(streak) which writes voidStreak and can grant streak skins (voidSkinsOwned / voidSkinsNew). |
| `src/prototype3d.ts:7466` | **WORLD** | Both exits from the daily card (claim and backdrop tap) resume a deferred world launch. |
| `src/prototype3d.ts:7170` | **MATCH** | Backgrounding the app raises the pause sheet. |
| `src/prototype3d.ts:7177` | **HAZARD** | The in-match ⌂ button opens the pause sheet. |
| `src/prototype3d.ts:7181` | **MATCH** | Pause telemetry stamped with match seconds elapsed. |
| `src/prototype3d.ts:7185` | **HAZARD** | THE QUIT PATH. Banks lifetime stats to voidStats, counts a match toward the session summary (telemetry.ts:48), emits match_quit, then tears the match down. |
| `src/prototype3d.ts:7193` | **HAZARD** | Quit tears down the match by setting both flags. |
| `src/prototype3d.ts:7114` | **AMBIGUOUS** | PLAY AGAIN on the end card → resetMatch() → beginMatch() at :7112. |
| `src/prototype3d.ts:7115` | **WORLD** | HOME from the end card restores the menu. |
| `src/prototype3d.ts:5162` | **MATCH** | endMatch's opening: clear the intro class, calm the crowd, latch ended, re-bank voidPlayed. |
| `src/prototype3d.ts:5173` | **MATCH** | Counts today toward the daily streak (writes voidDailyStreak, voidStreakDay, voidLastDay, voidStreak, and can grant streak skins). |
| `src/prototype3d.ts:5181` | **MATCH** | SOLO branch payout: best-percent record, XP, coins, quests. |
| `src/prototype3d.ts:5199` | **MATCH** | Solo branch: lifetime match count to voidStats, plus the session-summary match count. |
| `src/prototype3d.ts:5232` | **MATCH** | Day's-first-win bonus: coins plus a gem. |
| `src/prototype3d.ts:5240` | **HAZARD** | Day's-first-MATCH XP bonus. |
| `src/prototype3d.ts:5247` | **MATCH** | Rank XP award and persist. |
| `src/prototype3d.ts:5252` | **MATCH** | The main voidStats write — matches, wins, best score, best form. |
| `src/prototype3d.ts:5264` | **MATCH** | Weekly-board best score under weekKey() ('voidWeek-YYYY-N'). |
| `src/prototype3d.ts:5288` | **MATCH** | Per-world best (shown on the picker cards via worldBest() at :6260) and the profile PB. |
| `src/prototype3d.ts:5344` | **MATCH** | Finishing a match opens the next world and persists it. |
| `src/prototype3d.ts:5408` | **MATCH** | Session-summary count and the match_end event. |
| `src/prototype3d.ts:5571` | **MATCH** | First-ever sticker find announces the Scrapbook, once per profile. |
| `src/prototype3d.ts:5613` | **MATCH** | The once-in-a-lifetime FIRST NOM party, keyed on a localStorage flag and armed by a real steer. |
| `src/prototype3d.ts:5628` | **MATCH** | Advances the guide from DRAG to EAT after three bites and a real steer. |
| `src/prototype3d.ts:3803` | **MATCH** | Persists quest progress; called from questEvent (:3859) and questComplete (:3853), which fire from onEat, evolve and the solo payout. |
| `src/prototype3d.ts:3791` | **WORLD** | Module-init draw of today's three quests; writes the day key and sweeps encores on a new day. |
| `src/prototype3d.ts:4820` | **WORLD** | One-time streak migration at module init, seeding the shared gate from the two retired ones. |
| `src/prototype3d.ts:7635` | **WORLD** | Save-version migration: prunes unknown skins and repairs the equipped skin. |
| `src/prototype3d.ts:7224` | **WORLD** | The lifetime stats object, read at module init; written by endMatch (:5199/:5257) and doQuit (:7187). |
| `src/prototype3d.ts:7267` | **MATCH** | Pays every earned-but-unpaid trophy once, keyed by name. |
| `src/prototype3d.ts:8908` | **MATCH** | The master match-tick block. Everything inside it — the clock, the beats, the 35-second warning, the final countdown, the growth law, the whistle at :9066 — inherits this |
| `src/prototype3d.ts:8910` | **HAZARD** | The 0.45 s settle before the ghost hand appears, set at :9855 when the intro ends. |
| `src/prototype3d.ts:8911` | **HAZARD** | The guide pill's own expiry timer — the ONLY thing that hides #guide. |
| `src/prototype3d.ts:9498` | **WORLD** | The 'can I eat that?' tint sweep, 2.5x/s. |
| `src/prototype3d.ts:9660` | **AMBIGUOUS** | The repeating DRAG lesson — three repeats, three seconds apart, while the child has not yet steered. |
| `src/prototype3d.ts:9678` | **HAZARD** | THE GHOST HAND — the wordless drag lesson, on exactly while the lesson is unlearned. |
| `src/prototype3d.ts:9685` | **MATCH** | The two in-context danger beats, gated on a real drag having happened. |
| `src/prototype3d.ts:9855` | **HAZARD** | Known site (listed in the brief). Flagged here only for its UI consequences: it is what un-hides the timer/coins/growth/quit chrome and what arms the ghost hand's settle. |
| `src/prototype3d.ts:9856` | **HAZARD** | THE WELCOME AND THE FIRST INSTRUCTION. Fires once, on the frame the controls go live, for a brand-new child. |
| `src/prototype3d.ts:9709` | **MATCH** | THE SIM GATE. The only thing stopping props from being absorbed while the menu, the results card or the pause sheet is up. |
| `src/prototype3d.ts:10009` | **MATCH** | The EVOLVED card and the third guide step, suppressed while the title card is up. |
| `src/prototype3d.ts:10059` | **AMBIGUOUS** | Zone-reactive music layers follow the void across biomes. |
| `src/prototype3d.ts:10077` | **MATCH** | The newsroom block: the finale cue, the reaction queues and the headline cadence. |
| `src/prototype3d.ts:4261` | **MATCH** | The newsroom's own entry guard, independent of the :10077 block. |
| `src/prototype3d.ts:10134` | **AMBIGUOUS** | Retires the 'DRAG or WASD to steer · HUNGER fuels powers' label once the player has been driving for 8 seconds of match time. |
| `src/prototype3d.ts:10144` | **MATCH** | Feeds the crowd's panic level, zeroed outside a match. |
| `src/prototype3d.ts:10151` | **MATCH** | The growth bar — shown only during a live match, because #end is not in OVERLAYS and the bar used to sit on top of the results card. |
| `src/prototype3d.ts:10191` | **WORLD** | Drives the menu theme (start/stop plus a 2 s watchdog restatement). |
| `src/prototype3d.ts:2035` | **HAZARD** | The QA newsroom probe's definition of 'is a match live'. |
| `src/prototype3d.ts:2183` | **HAZARD** | The main QA state dump's match-time field. |
| `src/prototype3d.ts:2056` | **HAZARD** | QA hook that winds the match clock forward so a harness can photograph the results screen. |
| `src/prototype3d.ts:1608` | **WORLD** | Decides whether the loading screen names the world or shows the brand tag — read at module init, long before beginMatch. |
| `src/prototype3d.ts:3444` | **WORLD** | Haptics preference read at module init; written by the pause sheet (:7162) and settings (:7539). |
| `src/prototype3d.ts:3614` | **WORLD** | The coin wallet: read at init, written by every payout (quests, daily card, trophies, end-of-match, gift). |

*CROSS-CUTTING FINDINGS FOR MY AREA  1. STRONG RECOMMENDATION: do not repurpose `started`. It is exported to the QA suite at :2035 (`live: started && !ended`) and :2183 (`t: started ? matchElapsed() : 0`) as the definition of "a match is live", and it is the sole gate on the edible sim (:9709). Add a new world flag and leave `started` meaning MATCH. Every HAZARD I found is really "this site reads `started` for a third meaning" — chrome state, input readiness, or QA truth.  2. THE CHICKEN-AND-EGG. The three things that teach the first touch are all gated on the match being live: the ghost hand (:9678 — `started && controlsLive && handHold <= 0`), the DRAG pill (:9660 — `started`), and the pill*

### AUDIO, EFFECTS AND CAMERA

| site | assignment | what |
|---|---|---|
| `src/prototype3d.ts:382` | **WORLD** | Module-init. Downloads and decodes the menu track and this world's track before any gesture (decode is legal on a suspended context). Orders them by localStorage voidAuto |
| `src/proto3d/audio3d.ts:281-311` | **WORLD** | The audio gesture unlock. Creates/resumes the AudioContext, primes output inside the gesture, warms the recorded kit, and calls repairMusic(). |
| `src/proto3d/audio3d.ts:3888` | **MATCH** | The recorded-kit prefetch. Fetches and decodes the two shipped samples (used by pirateEvolve at :1720 and win() at :4396) so the first evolve/win is the real sample rathe |
| `src/prototype3d.ts:5911` | **MATCH** | startMusic is on the known list. setMusicStage(0) on the same line is not: it resets the escalation ladder (musStage, audio3d.ts:3980) to the ground stage for the new mat |
| `src/prototype3d.ts:10191` | **AMBIGUOUS** | The single predicate that decides whether the menu theme should be playing. Feeds both the 2 s level restatement (:10199) and the transition edge (:10212). |
| `src/prototype3d.ts:10192-10194` | **WORLD** | The music watchdog, counted in wall time. ensureMusic() → repairMusic(), which revives whichever channel is `wanted`; then it restates the desired front-of-house state at |
| `src/prototype3d.ts:10212-10215` | **WORLD** | The menu-theme transition edge. |
| `src/prototype3d.ts:10059` | **MATCH** | Per-frame district sample. Drives the place/zone music layer (audio3d.ts:4121-4153) — the dance floor kit, the market bed, etc. |
| `src/prototype3d.ts:8960` | **MATCH** | The authored beat sting (kickoff / dance party / treasure feast / the drum). Inside the BEATS loop, inside `if (started && !ended && !paused)`. |
| `src/prototype3d.ts:9061` | **MATCH** | The final-ten-seconds countdown tick; pitch climbs as cs falls. Inside `matchClock <= 35`, inside the started gate. |
| `src/prototype3d.ts:9070` | **MATCH** | The whistle: arms outroT = 2.0 (the slow-mo push-in) and fires the fanfare plus two rings. |
| `src/prototype3d.ts:9991-9993` | **HAZARD** | The evolution ceremony block. Fires voidling.celebrate(), the EVOLVED card, audio.evolve() (:10016, which also ducks the music), camPunch(5) and camDist *= 1.07 (:10021), |
| `src/prototype3d.ts:9553-9555` | **AMBIGUOUS** | The hero's voice, fired on a mood transition. The mood resolve block (:9536-9558) is ungated; only the 'sleepy' branch (:9549) carries `started &&`. |
| `src/prototype3d.ts:10072-10073` | **WORLD** | Power-ready toast plus chime, ungated. |
| `src/proto3d/audio3d.ts:815-816, 1683, 2434, 2983, 3323, 3814, 3858` | **MATCH** | The seven per-world synth-score lookahead pumps. Each schedules notes ahead against ctx.currentTime. |
| `src/proto3d/audio3d.ts:699-710` | **WORLD** | The music bus duck. Called only from evolve() (:4350), win() (:4373) and lose() (:4401). |
| `src/prototype3d.ts:10266-10267` | **WORLD** | The one tick of the whole effects module: ages the 12-ring pool, times out the flash overlay, decays shake and kick, and returns the camera offset added after the follow  |
| `src/proto3d/fx.ts:114-122` | **WORLD** | Camera shake and the directed recoil are no-ops at the source. |
| `src/prototype3d.ts:8958-8959, 9003, 9062, 9068-9069` | **MATCH** | Every effects call that lives inside the animate() `started` block: the beat card's ring and flash, the fever-window pulse every 3 s, the final-ten countdown ring, and th |
| `src/prototype3d.ts:2739-2746, 2841, 2846, 2862, 2879, 2891, 2901, 2908, 5460, 5491, 5556, 5616, 5722, 5736-5737, 6977, 10092` | **MATCH** | Sixteen further effects call sites, all inside event handlers rather than in the frame loop. |
| `src/prototype3d.ts:5131-5142` | **MATCH** | The champion confetti — 24 falling DOM sparks over the results card, inside celebrateEnd(). |
| `src/prototype3d.ts:9836` | **WORLD** | The opening of the entire play camera block: targetDist, the intro tick, the look-up, the camDist spring, camOffset steepening, the lookahead, the follow spring, the FOV  |
| `src/prototype3d.ts:9840` | **HAZARD** | The continuous zoom law. At START_R = 0.9 (:3509) this evaluates to exactly 38. |
| `src/prototype3d.ts:9851-9853` | **HAZARD** | The shadow-pass suppression for the establishing shot, and its restore. Not the intro tick itself — this is the shadow toggle my brief calls out. |
| `src/prototype3d.ts:9898` | **MATCH** | The slow-mo push-in at the whistle. |
| `src/prototype3d.ts:9900` | **MATCH** | The Skylark whale look-up trigger — the camera tilts up 12 s after the whale beat card. Armed at :8977 `lookUpAt = matchElapsed() + 12`, inside the beat block. |
| `src/prototype3d.ts:9902-9906` | **WORLD** | The 1 s in / 3 s hold / 1 s out ramp of the look-up, on wall dt. |
| `src/prototype3d.ts:9908` | **WORLD** | The zoom spring — the single line that moves the camera's follow distance. |
| `src/prototype3d.ts:9910-9912` | **WORLD** | The camera pitch steepening with void size, plus the look-up flatten. |
| `src/prototype3d.ts:9923-9925` | **WORLD** | The camera lookahead, smoothed off actual displacement rather than control velocity. |
| `src/prototype3d.ts:9955-9957` | **WORLD** | The follow spring. camFollow is the smoothed state the camera actually renders from; shake is added on top at :10267 and never fed back in. |
| `src/prototype3d.ts:9960-9967` | **WORLD** | The landmark-kit cooldown decay and the FOV punch spring, both on WALL time so they survive hit-stop. |
| `src/prototype3d.ts:9973` | **WORLD** | The fog re-drive — fog rides the zoom so distance melts into cosmos. |
| `src/prototype3d.ts:9986-9988` | **WORLD** | The sun rides the void so the shadow frustum stays over the action, with all three components relative so the sun angle is fixed everywhere on the island. |
| `src/prototype3d.ts:10221-10223` | **WORLD** | LOD band, shadow-frustum refit, and the occluder dissolve that fades props standing between the camera and the hero. |
| `src/prototype3d.ts:10272` | **WORLD** | The half-rate shadow pass. renderer.shadowMap.autoUpdate is false (:143); this line is the only thing that ever requests a shadow render. |
| `src/prototype3d.ts:10275-10282` | **WORLD** | The render call itself, through the bloom composer on the rungs that can afford it. |
| `src/prototype3d.ts:10237-10238` | **MATCH** | The adaptive quality ladder: the accumulator is ungated, the evaluation is gated on `started`. |
| `src/prototype3d.ts:5866` | **MATCH** | Resets the telemetry frame-health window (telemetry.ts:92) so the match's fps summary excludes boot. |
| `src/prototype3d.ts:9805-9811` | **WORLD** | The prop-shake decay — a SECOND full pass over edibles, immediately after the main eat loop closes. |
| `src/prototype3d.ts:9813-9824` | **WORLD** | The 120-particle puff system tick, plus two unconditional needsUpdate flags. |
| `src/prototype3d.ts:5841` | **HAZARD** | Harvests every prop's contact-shadow disc out of the prop group and into a single InstancedMesh (:3000-3029, `e.mesh.remove(disc)` at :3025, SH_CAP 4096). |
| `src/prototype3d.ts:5796` | **HAZARD** | The world-integrity sweep: pushes props off asphalt, retires unfixable ones, and (at :6842) puffs away anything culled while a match is live. |
| `src/prototype3d.ts:5851-5853` | **HAZARD** | The matchdeck deals the hour of day, and applyHour (:1042-1049) writes hourSunK, sun.color, island.setDusk() and — through applyLightRig — sun.intensity, fill.intensity a |
| `src/prototype3d.ts:5912` | **HAZARD** | Arms the establishing shot. The only writer of introT in the file. |
| `src/prototype3d.ts:6060-6062` | **HAZARD** | The single entry point into a match. Branches on `started` to decide whether a reset is needed first. |
| `src/prototype3d.ts:8903` | **MATCH** | The +8 s / +22 s re-sweeps for late GLB arrivals. The queue is filled at beginMatch:5840 (`_revalQueue = [tClock + 8, tClock + 22]`). |
| `src/prototype3d.ts:7170` | **MATCH** | Backgrounding the app raises the pause sheet. |
| `src/prototype3d.ts:2056, 2183, 2286` | **AMBIGUOUS** | Three debug/QA hooks that read or write match state: the clock rusher, the state snapshot, and the radius forcer (which also sets the music stage). |

*SCOPE CONFIRMED. src/proto3d/fx.ts is the effects module in use (imported at prototype3d.ts:36, instantiated at :2643); src/game/fx.ts is dead for this file. fx is never passed to another module — only to _dbg at :2649 — so every effects call site is in prototype3d.ts and the list above is exhaustive.  THE ONE CLEAN RESULT: audio3d.ts has NO match clock. Grepping matchClock / matchElapsed / elapsed across all 239 KB returns zero hits. Escalation runs entirely through setMusicStage → musStage, and every scheduler runs on ctx.currentTime via setInterval. The music therefore cannot desync when the flag moves — it starts when startMusic() is called and stops when stopMusic() is called, and both *
