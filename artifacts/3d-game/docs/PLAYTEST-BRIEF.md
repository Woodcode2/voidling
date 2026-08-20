# VOIDLING — PLAYTEST BRIEF, 2026-08-19

Six defects from a real session on the owner's iPhone. They are ordered by how
much they cost the game, not by how hard they are.

Read `docs/FABLE-BRIEF.md` first for the game, the rules and the probe
conventions. `docs/MUSIC-BRIEF.md` is the companion to item 3 and its
retractions apply here too.

**One instruction above all the others.** Two of these six are regressions
introduced by the last round of work, and one of them was introduced *by the
fix for another item on this list*. That is the shape of this project's
failures: a confident change, verified by an instrument that could not see the
side effect. So for every item below, before you call it done, ask what ELSE
your change touches and go and look at that too.

---

## THE STANDARD

The owner is comparing this against shipped premium mobile titles and he is
right to. The bar is not "the bug is gone". The bar is:

- **Nothing on screen ever overlaps anything else**, at any device size, in any
  state combination.
- **The character always reads.** Face, eyes, body silhouette, at every size
  and every camera angle. A cosmetic that hides the character is a defect no
  matter what it cost.
- **One tap does one thing**, and the child is never asked to acknowledge a
  screen that exists for the engine's convenience.
- **Every control does what it says.** A toggle that cannot work on the target
  device is worse than no toggle.
- **The world never says no.** This is a game about becoming unstoppable.
- **Motion is continuous.** 60 fps is not the goal; *smooth* is the goal, and a
  thing that updates at 10 Hz looks broken at any frame rate.

---

## 1. NOTHING MOVES SMOOTHLY — "move, pause, move, pause"

> *"Sometimes or most often items or voids move the pause move then pause.
> It's not fluid."*

**This is the most valuable item on the list.** Frame pacing is the first thing
anyone feels and the last thing they can name. A child will not say "the
rivals update at a fixed tick"; they will say the game feels cheap. Fix this
and the game gets better in a way no feature can match.

Read the owner's words precisely: **"items or voids"** — props and RIVAL VOIDS.
He is describing the motion of *entities*, not a low frame rate. That is a
strong signal, because an entity updated at a low fixed rate and rendered at
60 fps looks exactly like "move, pause, move, pause", and **no amount of
frame-rate work will fix it.**

### Chase this order

1. **Entity update rate vs render rate.** Go through `src/proto3d/rivals.ts`
   and `src/proto3d/life.ts` (crowd, vehicles) and every prop animator, and
   find anything that:
   - moves an object inside a `setInterval` or on an accumulator tick,
   - gates on a frame counter (`if (i % 3 === 0)`),
   - or reduces UPDATE rate with distance as an LOD (the crowd distance gate
     is a known one — task #10 shipped it).

   For each: is the rendered position **interpolated between updates**, or does
   the mesh sit still and then jump? If it jumps, that is the bug, and the fix
   is to store previous/next state and lerp in the render pass. This is the
   standard fixed-timestep-with-interpolation pattern and it is the single
   most likely explanation of the owner's exact words.

2. **The clamped `dt`.** `dt` is clamped (search `0.05`). A clamp makes the
   world advance *less* than wall time whenever a frame runs long, so a hitch
   is followed by the world running slow rather than catching up — hitch, drag,
   hitch, drag. Decide deliberately: clamp for physics stability but keep a
   separate unclamped wall delta for anything that should track real time, or
   accumulate the debt and pay it back over the following frames.

3. **Task #40 — the adaptive quality ladder measures fps from the CLAMPED
   `dt`.** So a phone that is stuttering reports a healthy frame rate and never
   demotes quality. The stutter-detector is blind to stutter by construction.
   Fix the measurement first, then see what the ladder does on a real device.

4. **Task #41 — a material sets `needsUpdate` about twice per frame, all
   match.** Every one of those can cost a shader recompile. Find which
   material, find why, and make it not.

5. **Tasks #37 / #38 — link storms.** Eight shader links in one frame around
   t=13s, and a second spike at radius 0.9–1.0. Anything that compiles a
   program *during play* is a guaranteed hitch; move it to load, or warm it
   behind the loading screen.

6. **Periodic heavy work.** `bakeContactShadows`, `validateWorld`, `fitShadow`,
   `_revalQueue` — anything on a cadence is a hitch on a cadence. Budget them
   across frames or move them off the critical path.

### The instrument, and build it first

**You cannot measure frame pacing in this sandbox.** swiftshader renders at
about 1 fps; any timing you take here is the harness's, not the game's. Retract
in advance any conclusion that starts "I measured the frame time and…".

Build a **`?perf=1` overlay**, modelled on the existing `?audio=1` one
(`src/prototype3d.ts`, search `location.search.includes('audio')`), showing
live, on the device:

- frame time **histogram** and the 1% / 0.1% lows — the mean is useless here,
  the tail is the whole complaint
- a **hitch counter**: frames over 33 ms and over 50 ms, since the session start
- **update rate per entity class** (hero, rivals, crowd, vehicles, props)
  against the render rate — this is what proves or kills hypothesis 1
- current quality level, and what the ladder *thinks* the fps is

Then hand the owner a URL and get a screenshot. That single screenshot decides
between the six causes above.

**Done when:** on the owner's device, no entity class updates at less than the
render rate without interpolation, 1% lows are within 2× of the median frame
time, and the hitch counter over a three-minute match is in single digits.

---

## 2. STARTING A GAME NOW TAKES TWO TAPS — a regression, and it is mine

> *"When you start a game it's showing two to begin then you have a begin right
> after. Is two to begin what was implemented to get the music to start??"*

Yes. That is exactly what it is, and he has caught a real regression.

The TAP TO BEGIN gate (`#tapGate`, `armGate()` in `src/prototype3d.ts`) was
added so audio would have a guaranteed user gesture. It works — but on the
fresh-load path it sits *on top of the splash*, and the splash already has a
PLAY button. So the child taps a screen that does nothing visible, and then
taps PLAY. **Two taps where there was one, and the first one is the engine
asking the child for a favour.**

### The thing to understand before you touch it

The audio unlock listeners are registered on `window` in the **capture phase**
(`src/proto3d/audio3d.ts`, search `for (const ev of ['pointerdown'`). They
already fire on *every* tap anywhere in the document, including on PLAY.
`primeOutput` and `promoteSession` are called from that same handler.

So on the **fresh-load path the gate buys nothing** — the child's tap on PLAY
is an equally good gesture, arrives moments later, and is a tap they were going
to make anyway.

The **world-switch reload path is different** and this is why the gate exists
at all: that page auto-starts a match with *no tap whatsoever*, so without a
gate the match genuinely begins in silence and the first joystick contact is
the unlock, seconds in.

### What to build

Recommended: **delete the gate from the fresh-load path, keep it on the
auto-start reload path** — and on that path make it feel like a deliberate
"ready?" beat rather than an apology, because the child *is* about to be
dropped into a live match.

Better still, if you can: **remove the reload entirely** (see the resolution
note in `MUSIC-BRIEF.md` task 3, which declined this with reasons — re-open
that decision if item 5 below sends you into the world-building code anyway).
No reload, no gateless page, no second tap, and the music never stops.

Whatever you choose, **verify the audio guarantee still holds**:
`qa/autoplay.mjs` on all four worlds, plus `--slow` and `--interrupt`, plus
`qa/journey.mjs` and `qa/switch.mjs`. Those probes currently click `#tapGate`;
they will need to follow the flow you build, and **a probe that has been
taught to expect the new flow can no longer tell you the old flow broke** — so
also assert, somewhere, that the very first tap a human makes still unlocks
audio.

**Done when:** cold load to a running match is the same number of taps it was
before the gate existed, and every music probe is still green.

---

## 3. THE RESULTS SCREEN IS A PILE-UP

> *"The end game menu the items don't line up."*

His screenshot shows the end card with, among other things:

- three yellow reward/streak/XP lines stacked and touching, one of them
  overlapping the headline
- **PLAY AGAIN and HOME drawn on top of the TODAY quest list**
- coin-fly particles crossing the text
- the whole thing taller than the viewport with no clear scroll affordance

Two separate problems, and they need separating before either is fixed.

**Layout.** Find `#end` in `index.html` and everything that populates it in
`src/prototype3d.ts`. Establish which children are in flow and which are
absolutely/fixed positioned — buttons landing on a list is the classic
signature of a fixed footer over unbounded content. Then decide the structure
deliberately: a scrolling body with a **pinned footer that has its own opaque
background and safe-area padding**, or a card that is guaranteed to fit. Not
both, and not neither.

**Content.** Count the lines that can appear at once. A reward line, a streak
line, an XP line, a secrets line, a quote, five stat tiles, an affordability
nudge, a shop button and a quest list is not a results screen, it is a
newsletter. A child wants to know: *did I win, what did I get, play again.*
Everything else is secondary and should be demoted, grouped, or shown on a
second beat. **Cut before you arrange** — the layout problem is partly a
symptom of the content problem.

Build a probe (`qa/endlayout.mjs`) that drives to a real results screen at
several device sizes, takes `getBoundingClientRect()` for every element in
`#end`, and **fails on any overlapping pair** and on any content that extends
past the safe area without being scrollable. Run it at 390×844, 430×932 and
360×780 — and with the states that add lines (level-up, new best, quest
completion, affordable skin) forced on together, because that is the worst case
and it is the one the owner hit.

**Done when:** zero overlapping pairs in every state combination at three
device sizes, and the primary action is reachable without scrolling.

---

## 4. HATS ARE STILL WRONG AT THE LARGEST SIZES

> *"Party hat or all hats prob still slightly off."*

He is right, and I know why the previous fix missed it: **every hat measurement
in this project stopped at radius 8.** His screenshot is a VOID TITAN at 27 m —
more than three times outside the range anything was ever verified at.

Current design (`src/proto3d/void3d.ts` animate(), `src/proto3d/hats.ts`):
a hard width cap `HAT_MAX_W = 2.2` body radii measured from authored geometry,
and a camera-tracked lean `hatLean(elev) = clamp(elev − acos(HAT_RIM), MIN,
MAX)` with `HAT_RIM = 0.92`, which rolls the hat back about the body's centre
so it holds a constant height on the silhouette.

**The specific thing to check first:** `HAT_LEAN_MAX` is 0.90 rad. If the play
camera's elevation keeps steepening past the point where the lean saturates,
the hat stops tracking and slides down the face exactly as the screenshot
shows — the pink brim ring crossing the eyes. Compute the camera elevation at
r = 27 and compare it against `HAT_LEAN_MAX + acos(HAT_RIM)`. If it exceeds it,
that is the bug and the clamp is the cause.

Then extend the measurement properly. Build `qa/hatfit.mjs` to report, for
**every hat, at r = 0.9 / 3 / 8 / 16 / 27**:

- the hat's screen-space bounding box relative to the void's disc, in body radii
  from centre
- **the eyes' screen-space box**
- a hard **FAIL on any overlap between the two**

The eyes are the character. A hat may cover any amount of body and no amount of
face. Debug hooks already exist: `window.__voidGroup()`, `__setHat`,
`__grantHats`, `__setVoidR`.

Screenshot every hat at every size and look at them. The numbers find the
failures; only your eyes will tell you whether the party hat looks like a party
hat.

**Done when:** no hat's bounding box intersects the eyes at any of the five
radii, and the contact sheet looks like a character wearing a hat.

---

## 5. A GIANT VOID GETS STUCK ON SCENERY — Pirate Bay

> *"On pirate bay if you get too large you can't go through tight corners etc."*

**This is a design failure, not just a collision bug.** The entire promise of
this genre is that growing makes the world stop mattering. Being wedged on a
walkway at maximum size is the fantasy inverted, and a child who experiences it
learns that getting big is a punishment.

Find the containment rule (`src/prototype3d.ts`: `inDeepWater3`,
`insideIsland3`, the wall/clamp code, `SHOW_WALLS` for a debug view; and the
`bay` layout in `src/proto3d/island.ts`). Then answer one question precisely:

> Is the test **"is the void's CENTRE out of bounds"** or **"does the void's
> EDGE touch something"**?

If it is edge-based, the playable area shrinks by the void's radius in every
direction as it grows, and at VOID TITAN there is almost nowhere it fits. That
would explain the report exactly.

**The fix is a design decision, so make it deliberately:**

- Containment should be **centre-based** — a big void hangs over the water at
  its edges, which looks *right*, because it is a hole.
- Anything that can still block it must be **edible at that size**. If a giant
  void is stopped by a fence it should be able to swallow, that is a
  prop-classification bug — find the largest blocking prop class on Pirate Bay
  and check it against the eat threshold.
- If something must remain impassable (the map boundary), it should **guide,
  not stop** — a soft push along the boundary rather than a wall that eats the
  input, so the void slides along the shoreline instead of sticking.

Measure it: `qa/traverse.mjs` — set the void to r = 1 / 4 / 8 / 16 / 27, warp
it to a set of positions (`__warpVoid`), drive each of eight compass directions
for a fixed number of **match** seconds, and report distance travelled. The
radius where travel collapses is the answer. **Run it on all four worlds** —
the owner found it on Pirate Bay, but if the rule is general it is a general
bug, and Lantern Night's market rows are the obvious second candidate.

**Done when:** at every radius including maximum, the void travels a comparable
distance in every direction from every start position, on every world.

---

## 6. THE PAUSE SHEET — one of those toggles may be a lie

> *"In game menu. What are those options. We can actually have rumble etc?"*

Two things are wrong here at once: the child does not know what the toggles do,
and at least one of them probably cannot work.

**RUMBLE — check this first and be honest about the answer.** Find the haptics
path (`buzz`, `hapticsOn`, `voidHaptics` in `src/prototype3d.ts`). If it calls
`navigator.vibrate`, that API **does not exist on iOS Safari** — the toggle is
inert on the owner's device and on every iPhone. A setting that reports ON and
does nothing is worse than no setting: it teaches a parent the game is broken
in ways they cannot see.

Resolve it one of these ways, and say which and why:
- if a real haptic is reachable from mobile Safari, use it;
- if not, **hide the toggle on devices where it cannot work** rather than
  showing a dead control;
- never leave it showing ON while doing nothing.

**BIG MOTION** — find `reduceMotion` / `setReduceMotion` and list what actually
changes. Then check it honours the OS `prefers-reduced-motion` on first run; an
accessibility control that ignores the system setting is a defect, and for some
children reduced motion is a medical need, not a preference.

**SOUND** — confirm it mutes music *and* effects, and persists.

**And the sheet itself:**
- The labels are jargon to a six-year-old. Say what they do.
- **LEAVE THE MATCH needs a confirmation.** A stray tap should not be able to
  bin a three-minute run. Check whether it has one; if not, add it.

**Done when:** every visible control does something on the owner's device,
every label is comprehensible to a child, and no single tap can destroy a run.

---

## RULES THAT DO NOT BEND

From `docs/FABLE-BRIEF.md` — read them there. The ones most likely to bite on
this list:

1. **Measure, then change.** If a change cannot be measured, build the probe
   first. Probes live in `qa/`.
2. **A single run proves nothing.** Means and spreads.
3. **Run `qa/smoke.mjs` before every push and READ THE OUTPUT for PASS.** Push
   to `main` is a deploy.
4. **Never bypass the CDN egress block**, never disable TLS verification, never
   unset `HTTPS_PROXY`. The 403s in the sandbox are correct.
5. **Do not open a pull request unless asked.** Push to `main`.
6. **Keep model identifiers out of anything pushed.** Chat only.
7. Working directory resets between shell calls — `cd artifacts/3d-game` every
   time.

Plus, for this list specifically:

8. **Item 2 is undoing my own work, and item 4 is a fix that did not go far
   enough.** Do not defend either. The measurements are what matter.
9. **Run the full music suite after item 2** — `qa/autoplay.mjs` × 4 worlds,
   `--slow`, `--interrupt`, `qa/journey.mjs`, `qa/switch.mjs`,
   `qa/fallback.mjs`. Changing the first-tap flow is changing the audio unlock,
   whether or not it looks like it.

---

## THE RETRACTIONS THAT KEEP COSTING THIS PROJECT

Every one of these was asserted confidently and was wrong. They stay written
down because they are all still persuasive.

1. **"The watchdog never runs at the splash."** It ran. The period was counted
   in a `dt` clamped to 0.05, so "every 2 s" was "every 40 frames" — 44 s at the
   harness's 0.9 fps and 2 s on a phone. **A harness artifact generalised into
   a claim about the game.** Item 1 is full of chances to make this exact
   mistake again.
2. **"The synth bed is the fallback."** It was reachable only when the fetch
   *failed*; the day real files shipped it became dead code while matches
   played in silence. Check what your fallbacks are actually conditioned on.
3. **"There is no shared stop for the synth."** All four stop functions
   existed. A comment blocked the right fix for weeks.
4. **"The hat cap caps the hat."** It measured a *world-space* box after
   parenting — carrying the void's radius, the LOD, and a 41% inflation from
   the yawed AABB — so the cap clamped to 1 and did nothing. **Measure geometry
   in the units it was authored in.**
5. **"Pirate Bay times out because swiftshader is slow."** The card was locked.
   Raising the timeout twice could not have worked.
6. **The hat occlusion probe** measured the hero *walking away* between frames,
   because `?len=` puts the game in attract mode. Any probe that diffs two
   frames must hold the subject still.

The pattern never changes: **an instrument that could not see the failure
reported success, and fluent reasoning was built on top of it.** When an
instrument and the owner disagree, the instrument is the suspect.

---

## DEFINITION OF DONE

A child opens the game, taps once, and is playing. The rivals and the town move
like one continuous piece of film. Their void grows until the world is scenery
it rolls straight over. Its face is visible under whatever hat they chose, at
every size. When the match ends they see what they won, laid out cleanly, with
PLAY AGAIN under their thumb. And every switch in the pause menu does exactly
what it says.
