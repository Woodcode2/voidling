# STREAM A — VERDICT

*Round 7, stream A: "the opening is the player's". Every number below was produced by
`qa/opening.mjs` on Maple at the reference viewport, and **every bar was measured twice in
consecutive runs**, because during this stream a single passing run was twice shown to be
luck. Hole.io's column comes from the owner's recording as corrected by the adversarial
skeptics (`holeio.recon.md` §11, §11.11).*

## The bars

| Bar | Run 1 | Run 2 | Target | HOLE.IO |
|---|---|---|---|---|
| A1 · clock burned before the first touch | **0.000 s** | **0.000 s** | 0 | 0 |
| A3 · idle available, unbounded | 29.4 s | 27.6 s | ≥ 0.5 | 0.717 s (then they touched) |
| A4 · touch → first movement | **0 ms** | **0 ms** | ≤ 133 | 117 ms |
| A5 · descent duration | **1,150 ms** | **1,193 ms** | 1,100–1,300 | **1,200 ms** |
| A6 · height travelled at t=0.25 | 0.146 | **0.155** | ≤ 0.20 | 0.156 (ease-in-out) |
| A6c · height travelled at t=0.75 | 0.811 | **0.839** | ≥ 0.80 | 0.844 |
| A6b · height at the midpoint | 0.471 | 0.496 | 0.40–0.60 | 0.50 |
| A7 · ground scale, screen centre | 5.852 | **5.997** | 5.5–6.5 | **×6.0** |
| A8 · descent frames with controls dead | **0** | **0** | 0 | 0 |
| A9 · first "+1", as a fraction of the descent | 0.435 | **0.503** | 0.30–0.60 | **0.45** |
| A21 · early tap vs late tap | 0.0 ms | 42.9 ms | ≤ 100 | n/a |

**11 of 11 pass in both runs.** Run 2's descent is within 7 ms of theirs, its quarter points
within 0.001 and 0.005 of a perfect ease-in-out (fit error 0.003), and its ground scale
within 0.003 of the corrected ×6.0.

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

Six instrument faults and two build faults. The ratio is the point: **most of what looked
like breakage was measurement**, and one of the instrument faults was actively hiding a
build fault.

| # | Fault | How it showed |
|---|---|---|
| 1 | Probe measured wall clock, not game time | 10.9 s reported for a 2.2 s intro |
| 2 | `?w=` in the URL booted the world during the menu clicks | Sampling began after the intro had run |
| 3 | Descent detector assumed a fall from frame 0 | Camera *jumps* to its start height; a 421 ms "descent" of ×1.20 |
| 4 | Easing judged by curve fit | Flipped smoothstep↔linear on unchanged code (RMS 0.034 vs 0.032); the midpoint cannot discriminate at all, since smoothstep(0.5)=0.5 |
| 5 | Floaters detected by first sighting | They are a **pool** of 14 created at startup, so all were banked on frame 1 and none ever reported — five runs of "no first bite" while the void was eating |
| 6 | Window ended at the camera's lowest point | Post-settle drift stretched it; 1,196 ms / 0.560 one run, 1,300 ms / 0.624 the next, same code |
| **B1** | **Four-slot ring had a 3.5-unit hole** | Ring built perfectly; the void threaded it for 17.4 units. The diagonals are the *natural* drag direction under an isometric camera |
| **B2** | **`camFollow` zeroed at arm** | The "still" establishing shot was a camera sliding in from the origin, folded into the descent of anyone who tapped early. **Bar A21 read 0.0 ms while this was live** — fault 6 was hiding it |

The lesson worth keeping: **a probe that fails flatteringly is more dangerous than one that
fails loudly.** A21 scored perfectly for three runs while the bug it exists to catch was in
the build. Nothing is green here until two consecutive runs say so.

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
