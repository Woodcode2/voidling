# STREAM A — THE OPENING IS THE PLAYER'S

*The governor, directing. Round 7, stream A of the polish plan. Every number here was
measured — ours in this tree, theirs from the owner's 25.8 s recording of the current
HOLE.IO build. Where a number is a target rather than a measurement it says so. The
builder works from this document; the probe in §6 is written before the build and must
fail on the current tree first.*

**Standing constraints.** The void stays a creature, not a hole. No ads. 4+ stays 4+.
`node qa/gate.mjs --profile=push --port=4177` stays green at every commit. Nothing lands
without a skeptic verdict.

---

## 0. THE VERDICT AND THE DIAGNOSIS

The owner, on the game he is competing with:

> "The game looks beautiful. We are so far behind... The sense of accomplishment."

And on the standard:

> "It's critical we build this to surpass hole.io. They have millions in budget. We only
> have each other."

The diagnosis, in one line:

> **Their opening belongs to the player. Ours belongs to the camera.**

In HOLE.IO the world loads, and then *nothing happens* — no clock, no score, no pressure
— until you touch the screen. Your touch starts everything at once: the clock, the
joystick under your finger, and a 1.17-second camera descent that you are **playing
through**. Your first point lands while the camera is still coming down.

In ours the match starts on load. `beginMatch` sets `started = true` and the clock begins
before the intro camera runs; the intro then takes 2.2 to 3.6 seconds depending on the
world, with the controls damped to nothing and `controlsLive` false throughout. The
screenshot our own QA probe takes five seconds into a Maple match already reads **2:55**:
five seconds of a three-minute match spent before the player was allowed to move.

That is the whole gap in the opening. It is not art, it is not content, and it is not
budget. It is three seconds of authorship that we take from the player and they give away.

---

## 1. WHAT IS ACTUALLY THERE — MEASURED

| Fact | Ours | Theirs | Where |
|---|---|---|---|
| Match starts on | **load** (same-world path fires immediately; other worlds reload into a TAP TO PLAY gate) | **the first touch** | `prototype3d.ts:6076` `launchWorld`, `:5793` `beginMatch`, `:6398` tap gate / §11.5 |
| Clock during the intro | **running** — `started = true` before the camera move | **not started** — the timer's 4:00 extrapolates back to the touch-down frame | `:5793`, `:8909` / §11.5 |
| Intro camera length | **2.2 s** maple, 2.2 pirate, 3.4 gameday, 3.6 lantern, 3.5 powder, 3.4 skylark | **1.167 s**, every time | `:1423–1577` `introLen` / §11.5 |
| Intro camera law | `camDist = 38 + 262·k²` — **quadratic ease-in on distance** | **ease-in-out on camera height** (50% at t = 0.45), ease-in-quad on ground scale | `:9841` / §11.5 |
| Ground scale over the intro | not measured (camera-driven) | **×4.755** | `:9841` / §11.5 |
| Controls during the intro | **dead** — `controlsLive` false, velocity damped `0.9^(dt·60)` | **live from the first frame of the descent** | `:9855`, `:9034` / §11.5 |
| First point scored | after the intro | **during the descent**, at 45% of it | / §11.5 |
| Goal shown at match start | `#titlecard`: three lines on a scrim, fading over `introLen + 0.45 s` | a scroll that unrolls in 117 ms, holds 383 ms, rolls up in 100 ms, on a timer | `index.html:1804`, `prototype3d.ts:5908` / §11.5 |
| Joystick | floating; base follows past `JOY_R·1.7` = 108.8 px; ring 128 px = 29.8% of a 430 px viewport | floating **and dragged**; ring 330 px = 25.0% of width; snaps back in one frame on release | `prototype3d.ts:3145`, `:3187` / §11.9 |
| Speed law | heading lerped with amplitude weight `0.28 + 0.72·mag²` — **speed rises with deflection** | **constant speed**, direction only: 11–14 px/frame at every deflection above 60 px | `:3138–3300` / §11.9 |
| Void on screen at spawn | **20.2%** of width (Maple), 17.8–20.7% across six worlds | **22.6%** | `recon/self/*-spawn-t5.png` / §2 L4 |
| Sound in the opening | music bed and SFX | **silence until 6.14 s** | `audio3d.ts` / §11.10 |

Two of those rows are ours to keep: we have sound and they do not, and our joystick's
ring is already close. Every other row is a change.

---

## 2. WHERE THEIR OPENING IS WEAK

Parity is not the goal. The owner's instruction is to surpass a game with a studio
behind it, and the recording shows six weaknesses in their opening that cost them
nothing to leave in — because their protagonist is an absence and cannot carry a
moment. Ours is a creature with a face, so these are ours to take.

| # | Their weakness | Measured | Why they can't fix it |
|---|---|---|---|
| 1 | **The idle is dead time.** 717 ms of a static camera over a static world before the first touch. Nothing moves, nothing is said, nothing is established. | §11.5: cone-pair scale 1.0000 ± 0.0002 over 43 frames; hole 22×14 px unchanged | A hole cannot arrive, look around, or be pleased to be there |
| 2 | **The opening is silent.** The audio track is exact digital zero until 6.14 s — after the match has started. No menu taps, no loading sound, no music. | §11.10 | They ship no music bed at all |
| 3 | **The goal card is an announcement, not a contract.** Total time on screen 717 ms: 117 ms unroll, 383 ms open, 100 ms roll-up. Three counters to read in a third of a second. | §11.5 | With no persistent goal display, the card is all there is |
| 4 | **The descent reveals nothing.** 1.17 s of camera travel that shows the same patch of pavement, closer. | §11.5 | Their maps have no landmark worth landing on |
| 5 | **The joystick tells a lie.** A default joystick is drawn at the screen's centre-bottom before any touch, then jumps 320 px when the finger lands. | §11.9 | Cosmetic, and nobody complains |
| 6 | **The first bite is luck.** Their first "+1" lands at 45% of the descent because a cone happened to be there. | §11.5 (first floater f356, descent f316–385) | No control over where the player spawns relative to food |

## 3. THE DESIGN — THEIR SKELETON, OUR FLESH

**Keep every measured bone.** Touch-gated start, clock on the touch, ~1.2 s ease-in-out
descent, controls live throughout, a bite during the descent, a timer-driven goal card.
That skeleton is why their opening feels immediate and ours feels like a cutscene.

**Then add the four things a hole cannot do.** Each is cheap, each is measurable, none
delays the player by a single frame.

### 3.1 The idle is an ARRIVAL, not a wait

The void is not sitting there waiting for input. He **arrives**: he drops in and lands,
the ground takes the impact, he blinks and looks around at the world he is about to eat.
The nearest two or three crowd members notice him — a head turn, one bubble. The world's
goal is *said*, not just printed.

Hard rule: **the arrival is interruptible on every frame.** The first touch cuts it dead
— no wind-down, no "let me finish". A player who taps at 200 ms gets the same descent as
one who watches for four seconds. The arrival exists for the player who waits, and costs
the player who doesn't exactly nothing.

Why this beats them: their 717 ms is a buffer. Ours is a character being introduced, in
a world that reacts to him, in the same amount of time or less.

### 3.2 A guaranteed first bite

Their first "+1" is luck. Ours is a rule: **the spawn guarantees at least one edible prop
within reach**, so that the first touch always produces a bite within ~600 ms, in every
world, on every level. The "+1" lands while the camera is still coming down.

Why this beats them: the owner asked for the sense of accomplishment. This delivers it in
the first second of every single match, by construction rather than by map luck.

### 3.3 The descent ends on the hero

Their descent reveals nothing. Ours already knows how to reveal — the current intro holds
on each world's hero landmark for the first quarter of a 2.2–3.6 s move, which is exactly
why it reads as a cutscene. **Do not choose between the reveal and the pace: land the
reveal inside the 1.2 s.** The descent starts wide enough to hold the landmark in frame
and settles with it still in frame, so the player sees what they came to eat while they
are already eating.

Why this beats them: we get their immediacy and keep the thing their maps don't have.

### 3.4 Sound from the first frame

They are silent until 6.1 s. We are not. The arrival lands with a sound, the goal card
unrolls with one, the descent has a bed under it, and the first bite is heard. From
§11.10 we take their discipline — one fixed sample per event, no pitch randomisation, no
combo ramp — and reject their silence.

## 4. WHAT MUST NOT HAPPEN

- The clock must not run before the first touch. Not one frame.
- The controls must not be dead during the descent. Not one frame.
- The arrival must not delay, gate or soften the first touch.
- The goal card must not block input, and must not wait for the player.
- Nothing in the opening may add a ring, a burst or a rim reaction to an eat (§11.8:
  through a swallow their rim is unchanged to a third of a pixel).
- The void is not a hole. The rim work belongs to stream D; nothing here changes what he
  is.

---

## 5. THE BARS

Every bar is a number the probe reads. A bar with no probe is not a bar. Reference
viewport 430×932, DPR 2, `npx vite preview --port 4177`, Chromium under swiftshader with
the GPU lock (`mkdir /tmp/gpu.lock`). "Frames" are at 60 fps unless stated. Their number
is given for every bar so the builder can see what is being matched and what is being
beaten.

| # | Bar | Ours must be | Theirs | Source |
|---|---|---|---|---|
| A1 | Clock frames elapsed before the first touch-down | **0** | 0 (timer starts on the touch frame, f313.7 ≈ f314) | §11.5 |
| A2 | Any scoring, rival, beat or newsroom event before the first touch | **none** | none observable | §11.5 |
| A3 | Idle length available before touch | **≥ 0.5 s, unbounded** | 717 ms then the player touched | §11.5 |
| A4 | Touch-down → void first moves | **≤ 8 frames (133 ms)** | 7 frames (117 ms) | §11.5 |
| A5 | Descent duration | **1.10–1.30 s** | 1,167 ms | §11.5 |
| A6 | Descent easing, camera **height** progress | **ease-in-out**, 50% at t = 0.40–0.50 | ease-in-out, 50% at t = 0.45 | §11.5 |
| A7 | Ground scale over the descent | **×4.0–5.5** | ×4.755 | §11.5 |
| A8 | Frames of the descent with controls dead | **0** | 0 | §11.5 |
| A9 | First "+1" floater | **within the descent, at 30–60% of it** | at 45% (f356 of f316–385) | §11.5 |
| A10 | Edible prop within reach at spawn | **≥ 1, in every world, every level** | not guaranteed | §11.5, ours by design |
| A11 | Goal card: unroll / open / roll-up | **≤ 150 ms / 350–600 ms / ≤ 150 ms** | 117 / 383 / 100 ms | §11.5 |
| A12 | Goal card starts | **~0.5 s after the first gameplay frame, on a timer, regardless of input** | f301 ≈ 0.5 s, timer-driven | §11.5 |
| A13 | Frames in which the goal card blocks or swallows input | **0** | 0 | §11.5 |
| A14 | Joystick base on touch-down | **anchors under the finger** | jumps 320 px from its default | §11.9 |
| A15 | Joystick ring diameter | **24–26% of screen width** | 330 px of 1320 = 25.0% | §11.9 |
| A16 | Steering lag, knob direction → travel direction | **≤ 100 ms** | 5 frames = 83 ms | §11.9 |
| A17 | Speed at full deflection, across sizes | **constant within 10%** | 12.7 → 13.6 px/frame (+7%) | §11.9 |
| A18 | Void screen share at spawn | **22–26% of width** | 22.6% | §2 L4, `recon/self/` |
| A19 | Hero landmark in frame at the settled camera | **yes, every world** | n/a — they have none | ours |
| A20 | Sound in the opening | **arrival, goal card, descent bed, first bite all audible** | silent until 6.14 s | §11.10 |
| A21 | Arrival interruptible | **first touch cuts it on any frame; A4–A8 unchanged whether the player taps at 0.2 s or 4 s** | n/a | ours |
| A22 | Frame time through the opening, reference device | **≤ 16.7 ms at the 95th percentile** | not measurable from a recording | ours |

## 6. THE PROBE — `qa/opening.mjs`

Written **before** the build, and it must FAIL on the current build for A1, A5, A6, A8,
A9, A10, A19, A20 and A21 before a line of the opening is changed. A probe that passes on
the unbuilt feature is not a probe.

What it does:

1. Serves the built game, opens a world, and records the opening as a frame series with
   timestamps — not screenshots at chosen moments, a **series**, so easing can be fitted
   rather than asserted.
2. Reads the game's own state each frame through the QA hook (see §7 for what exists and
   what must be added): clock value, `started`/`controlsLive` flags, camera height and
   distance, void world radius, joystick base and knob, goal-card state, floater spawns.
3. Synthesises a touch at a chosen delay, and runs the whole series **twice**: once
   tapping at 200 ms and once at 4 s, then asserts the two descents are identical within
   tolerance (bar A21).
4. Fits the camera-height progress curve against linear, ease-out, ease-in, ease-in-out
   and smoothstep, and reports the best fit with its RMS — the same method used on their
   recording, so the two numbers are comparable.
5. Measures ground scale over the descent from the projected size of a fixed world
   feature, not from the camera parameter, so a wrong camera maths cannot pass itself.
6. Asserts every bar in §5 and prints a table with each bar's measured value beside its
   target and its Hole.io reference.

It must also emit `qa-out/opening/<world>-<frame>.png` for the first, the touch, the
midpoint and the settle, so a human can see what the numbers describe.

Registered in `qa/gate.mjs` under the push profile once green.

---

## 7. THE RISKS, NAMED

The dangerous part of this stream is not the camera. It is that **`started` and
`matchClock` currently mean "the world is running"**, and this brief splits that into two
meanings: *the world is running* (true from load) and *the match is running* (true from
the first touch). Everything that reads either flag has to be assigned to one or the
other, deliberately, one at a time.

| Risk | Why it bites | Rule |
|---|---|---|
| **A consumer of `started` keeps its old meaning** — rivals begin hunting, a beat fires, the newsroom talks, telemetry logs a match, audio ducks — while the player has not touched | These are scattered across the loop; a miss is silent and only shows up as "the rivals ate half the map before I moved" | Enumerate every reader of `started` and `matchClock` before changing either. Each one is explicitly assigned to **world-running** or **match-running**. The list goes in the commit message. |
| **The hero-landmark reveal is destroyed** to hit 1.2 s | It is the thing their maps do not have; losing it to match their pacing is a net loss | Bar A19: the landmark must be in frame at the settle. The reveal moves *inside* the descent, it does not get deleted. |
| **Controls live during the descent lets the player leave the arena** | The camera is interpolating while the player is already moving | Clamp the void to the island as normal; the camera follows the void from the first frame of the descent, so it cannot be outrun. |
| **The two paths diverge** — same-world relaunch vs page reload | The reload path has a tap gate, the other does not; after this stream they must be one behaviour | Bar A21 is run on **both** paths. |
| **The clock starting late shortens nothing but feels longer** | 180 s is unchanged; the player simply gets the descent for free | Confirm `MATCH_LEN` is untouched; the change is when counting starts, not how long it runs. |
| **Solo mode and the tutorial** have their own start paths | Easy to fix the main path and leave two broken ones | The probe runs solo and first-run as separate cases. |

## 8. THE ORDER OF WORK

1. **Write `qa/opening.mjs` first** and run it on the untouched tree. It must fail A1,
   A5, A6, A8, A9, A10, A19, A20, A21. Commit the probe and its failing output. *A probe
   that has never failed has never been tested.*
2. **Enumerate the readers** of `started` and `matchClock` (§7 row 1) and commit the list
   as a document before changing either.
3. **Split the flag**: `worldReady` (from load) and `matchLive` (from the first touch).
   Assign every consumer. Gate the clock on `matchLive`. Probe: A1, A2 go green.
4. **Rebuild the descent**: 1.2 s, ease-in-out on camera height, ×4.75 ground scale,
   controls live from frame one, landmark in frame at the settle. Probe: A4–A8, A19.
5. **The arrival**: the void drops in, blinks, looks around; two or three crowd members
   notice; interruptible on every frame. Probe: A3, A21.
6. **The guaranteed first bite**: one edible prop placed within reach at spawn, every
   world, every level. Probe: A9, A10.
7. **The goal card**: unroll / hold / roll-up on a timer, non-blocking. Probe: A11–A13.
8. **The joystick and speed law**: anchor under the finger, constant speed with direction
   only, steering lag ≤ 100 ms. Probe: A14–A17.
9. **Sound**: arrival, goal card, descent bed, first bite. Probe: A20.
10. **Register `qa/opening.mjs` in the push gate.** Then the skeptic verdict, then the
    owner sees it.

Steps 3 through 9 are each one commit with its probe result in the message. If a step
cannot go green, it stops and reports rather than proceeding — a half-applied flag split
is worse than none.

## 9. DONE MEANS

- `node qa/opening.mjs` green on all 22 bars, on all six worlds, on both start paths, in
  solo and first-run.
- `node qa/gate.mjs --profile=push --port=4177` green.
- Four frames per world in `qa-out/opening/` showing first frame, touch, midpoint, settle.
- A one-page verdict from the builder stating, for each bar, the measured number beside
  the target and beside Hole.io's — no adjectives.
- The governor's skeptic verdict on top of it.

*Nothing in this stream is finished because it looks right. It is finished when the
numbers say it is, and a skeptic has tried to prove they are wrong.*
