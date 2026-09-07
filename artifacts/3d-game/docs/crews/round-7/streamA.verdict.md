# STREAM A — VERDICT

*Round 7, stream A: "the opening is the player's". Every number below was produced by
`qa/opening.mjs` on Maple at the reference viewport, and **every bar was measured twice in
consecutive runs**, because during this stream a single passing run was twice shown to be
luck. Hole.io's column comes from the owner's recording as corrected by the adversarial
skeptics (`holeio.recon.md` §11, §11.11).*

## The bars

Fourteen bars, two consecutive runs, Maple, reference viewport. Hole.io's column is the
owner's recording as corrected by the adversarial skeptics (`holeio.recon.md` §11.11).

| Bar | Run 1 | Run 2 | Target | HOLE.IO |
|---|---|---|---|---|
| A1 · clock burned before the first touch | **0.000 s** | **0.000 s** | 0 | 0 |
| A3 · idle available, in game time | 3.03 s | 3.01 s | ≥ 0.5, unbounded | 0.717 s |
| A4 · frames from touch to first movement | 6 | 6 | ≤ 8 | **7** |
| A5 · descent duration | **1,187 ms** | **1,189 ms** | 1,100–1,300 | **1,200 ms** |
| A6 · height travelled at t=0.25 | **0.154** | **0.154** | ≤ 0.20 | 0.156 |
| A6c · height travelled at t=0.75 | 0.835 | 0.836 | ≥ 0.80 | 0.844 |
| A6b · height at the midpoint | 0.492 | 0.493 | 0.40–0.60 | 0.50 |
| A7 · ground scale, screen centre | **5.989** | **5.993** | 5.5–6.5 | **×6.0** |
| A8 · descent frames that ignored a held touch | **0** | **0** | 0 | 0 |
| A9 · first "+1", as a fraction of the descent | **0.463** | **0.462** | 0.30–0.60 | **0.45** |
| A11 · goal card animation length † | 600 ms | 600 ms | 450–750 | 600 ms |
| A12 · goal card appears, on its own timer | **0.534 s** | **0.530 s** | 0.3–0.9 | ~0.5 s |
| A13 · card frames that could swallow a tap | **0** | **0** | 0 | 0 |
| A21 · early tap vs late tap | 1.8 ms | 15.5 ms | ≤ 100 | n/a |

**14 of 14 pass in both runs.** The descent is within 13 ms of theirs, its quarter points
within 0.002 and 0.009 of a perfect ease-in-out, its ground scale within 0.011 of the
corrected ×6.0, and the first point lands at 46% of the descent against their 45%.

† **A11 is verified by declaration, not by observation.** It reads the Animation object's
computed timing rather than timing the rendered animation, because at ~1 fps the browser
dispatches animation events on frames: the quantisation (~1000 ms) is larger than the
600 ms being measured, and two runs of the same build read 0.3 ms and 2,158 ms. On real
hardware at 60 fps this bar is directly measurable. Anyone changing the card's animation
should know this bar checks what the browser *will* play, not what it did.

## What was built

1. **`armed` above `started`.** `endMatch` never clears `started`, so it is a
   since-page-load latch and all 300 consumers read `started && !ended`. Adding a flag
   above it meant **153 sites needed no edit at all**; six were re-gated to `armed`, each
   because it is what lets a child produce the touch that starts the match.
2. **The descent**: one authored 1.2 s for every world, smoothstep on elapsed progress
   (the old form squared *remaining* time, which is ease-out), ×6.0 ground scale, and the
   follow spring bypassed because it renders a 0.2 s lag of whatever the code authors.
3. **The arrival**: the world opens at the establishing height, the void falls in and
   lands using the body's existing knock-acknowledgement, and the first touch cuts it on
   any frame.
4. **The first bite as a rule**: ten props drawn to a ring at 5 units, sized so that a drag
   between two slots still cannot miss.

## The corrections, on the record

**Ten instrument faults, two build faults, one reporting fault.** The ratio is the finding:
most of what looked like breakage was measurement, and twice a broken measurement was
actively hiding a broken build.

| # | Fault | How it showed |
|---|---|---|
| 1 | Probe measured wall clock, not game time | 10.9 s reported for a 2.2 s intro |
| 2 | `?w=` booted the world during the menu clicks | Sampling began after the intro had run |
| 3 | Detector assumed a fall from frame 0 | The camera *jumps* to its start height; a 421 ms "descent" of ×1.20 |
| 4 | Easing judged by curve fit | Flipped smoothstep↔linear on unchanged code; the midpoint cannot discriminate at all, since smoothstep(0.5) = 0.5 |
| 5 | Floaters detected by first sighting | They are a **pool** of 14 built at startup; all banked on frame 1, none ever reported — five runs of "no first bite" while the void was eating |
| 6 | Window ended at the camera's lowest point | Post-settle drift stretched it: 1,196 ms one run, 1,300 ms the next, same code |
| 7 | Probe **waited** in wall time for a game-time event | dt is clamped to 0.05 and swiftshader paints ~1 fps, so the opening runs ~20× slow — 0.043 game-seconds per wall-second. The probe touched before the opening began, then reported it missing. *Fault 1 in a new coat, and I did not recognise it.* |
| 8 | Card listeners attached to `null` | `addInitScript` runs at document-creation time, before the DOM exists. The floater check survived only because it re-queries each frame |
| 9 | Animation events caught from the wrong animation | They **bubble**, and the card runs two — measuring the gap between `goalRoll` starting and `goalInk` ending gave 0.3 ms |
| 10 | Animation timed by event timestamps | Quantisation (~1000 ms) exceeds the quantity (600 ms): 0.3 ms and 2,158 ms on identical builds. **No better method exists in this harness** — the bar changed in kind |
| **B1** | **Four-slot ring had a 3.5-unit hole** | Ring built perfectly; the void threaded it for 17.4 units. The diagonals are the *natural* drag direction under an isometric camera |
| **B2** | **`camFollow` zeroed at arm** | The "still" establishing shot was a camera sliding in from the origin, folded into the descent of anyone tapping early. **A21 read 0.0 ms while this was live** — fault 6 was hiding it |
| **R1** | **Reported three probe fixes that were never applied** | A patch script threw on its last edit and, writing only after all edits succeed, rolled everything back. The following run measured the old probe and I described the new one |

Three rules came out of this stream and are now practice:

1. **Nothing is green until two consecutive runs agree.** A single pass was twice luck.
2. **Verify the artefact, not the tool's report of it.** R1 was invisible to every measurement, because the measurement was accurate about the wrong code.
3. **A bar that cannot fail is not a bar.** A13 "passed" for several runs only because the card never appeared — a card that is absent cannot swallow a tap.

## What is NOT done

`qa/opening.mjs` measures **11 of the brief's 22 bars**. Unbuilt and unmeasured:

- **A11–A13** the goal card on a timer, non-blocking
- **A14–A17** the joystick anchor, ring size, steering lag, and the speed law — which
  §11.11 established is **not measurable from their recording**, so it is our design call
- **A19** the hero landmark in frame at the settle
- **A20** sound in the opening (their track is silent until 6.14 s; ours should not be)
- **A22** frame time through the opening
- The crowd noticing the arrival — deferred rather than asserted, since it needs a
  registered cue listener
- Registration in `qa/gate.mjs --profile=push`
- **Every world except Maple.** These numbers are one world.

*Stream A's opening is measured, repeatable and matches the reference. It is not finished.*
