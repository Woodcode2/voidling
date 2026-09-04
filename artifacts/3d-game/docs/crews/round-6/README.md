# Round 6 — the sixth world (opened 2026-09-04)

The owner opened it in one line: **"World 6. I want this one to be exceptional.
Every detail, item placement every needs to be dialed in. Learn from past
mistakes."**

`docs/FABLE-LAUNCH-BRIEF.md` §0 allowed a sixth world to be DESIGNED in round 5
and **built only if the four refinement streams were green first**. They are:
placement (A1), purpose (A2), materials and light (B), sky (C), the first frame
(D), and the newsroom — each landed with its own push gate, the last of them
PASS 20/20 at 11:48 UTC today. So world 6 is a build, not a memo.

## The order of work
1. **The contract** — `world6.contract.md`. What a world IS, derived from the
   five that exist, before anybody designs anything. Its most valuable half is
   not the list of things to do; it is the list of things that fail SILENTLY.
2. **The design panel** — `world6.design.md`. Six independent concepts from six
   different starting points, each judged on the child's eye, the engine and the
   author, plus the one question that overrides all three: does the silhouette
   hold, or is it a repaint of an island we already ship?
3. **The owner picks.** The brief gives world 6 no skeptic — the governor and
   the owner judge it.
4. **The build**, in the contract's own sequence, each piece committed the
   moment it typechecks, then the full push gate before main moves.

## What the contract found before world 6 existed

Of roughly 140 obligations, **twelve fail at compile time**. Everything else
fails by falling through to Maple Falls, or by a probe reporting clean on a
world it has no branch for. A world 6 that fills the twelve Records and nothing
else compiles, boots, and renders Maple's island shape, Maple's ground, Maple's
5,782 props, Maple's crowd, Maple's paper and Maple's music under world 6's sky.

Three of its findings are about the game as it ships TODAY, and the governor
verified each one by reading the source rather than taking the report:

- **`qa/placement.mjs` is in no gate profile.** `grep -c placement qa/gate.mjs`
  → **0**. The instrument built for the owner's sharpest complaint — "you have
  trees on roads" — runs only when somebody remembers to run it. Fifteen probes
  are in that position.
- **`worldData()` in that same probe has no default and no throw**
  (`qa/placement.mjs:125-160`, five `if`s). Point it at a world it does not know
  and it prints `road 0 ok` and PASSES. World 6 would have been born clean.
- **Powder Pass scatters Lantern Night's moon lanterns every Christmas.**
  `seasons.ts:68` declares `snowday` for `powder`, 18 December to 4 January.
  `prototype3d.ts:1608` picks the seasonal prop with an if-chain — harvest,
  regatta, homecoming, **else a moon lantern** — and `scatterSeasonProps` places
  up to 44 of them. Nobody wrote a snow-day branch when the fifth world was
  added, and nothing anywhere says so. This is the contract's own thesis,
  already true: *a world added to the game must be added to every table, and the
  tables keyed by an if-chain are the silent ones.*

## The owner's decision — 2026-09-04

> "These are all really excellent. Let's go with the first one. But later once
> we're live let's explore the other two. Build the first one to AAA quality."

**SKYLARK FIELD is the build.** FEEDING TIME (Crater Park Zoo) and TIDE TABLE are
held for post-launch and are recorded in full in `world6.design.md` so neither
has to be re-derived.

A disused grass-and-concrete airfield floating in space, and once a year, for one
morning, a hundred hot air balloons come to it. A match is that morning —
trailers arriving in the dark to the mass ascension at sunrise, compressed to
three minutes. **The food escapes upwards.** Eat the balloon first and you get
the balloon; eat the ropes first and it goes up without you, and everybody waves
at it.

### What must be settled BEFORE the land module is written

The concept's own judge named two, and neither is a matter of opinion:

1. **Occlusion.** A twenty-metre standing envelope at 225° down can hide the
   child's own void, which this game may never do. Measure it at 430×932 with a
   stand-in before any balloon factory is written. If the answer is "balloons
   must be shorter than they are", the world survives; if it is "the field holds
   four standing at once", the promise thins and the design changes.
2. **Starvation.** It is the smallest island proposed (~35 Mu² against Powder's
   45) and three runways at half-width 500 cover half of it. Powder starved its
   child driver at 403–3,253 points on 843 edibles against Maple's 5,790. Count
   before `WORLD_PAR` is written, not after.

And two the judge found in the concept's own geometry, to be fixed on paper:
**three of the six runway thresholds as written fall off the island**, and **two
of the three runway designators disagree with their own bearings.**

### And two instrument gaps that must close first

From `world6.contract.md`, both verified by reading the source. These go in
before world 6's land module exists, because otherwise the world is built against
an instrument that cannot see it:

- `qa/placement.mjs` is in **no gate profile** (`grep -c placement qa/gate.mjs`
  → 0). The auditor built for "you have trees on roads" runs only when somebody
  remembers.
- `worldData()` at `qa/placement.mjs:125` has five `if`s, no default and no
  throw. Point it at an unknown world and it prints `road 0 ok` and PASSES.

## Risk 1 — OCCLUSION — RETIRED 2026-09-04, from the source

The design's own judge called this the risk that could sink the world: *"A
twenty-metre standing envelope viewed at 225° down covers a lot of ground and
can hide the child's own void — the single thing this game may never do."*

It cannot, and the reason is a system that already ships.

**The geometry.** `camOffset` is `(0.62, 0.92, 0.62).normalize()`
(`prototype3d.ts:626`), which puts the camera **46.4° above horizontal**. An
object of height *h* therefore hides `h / tan(46.4°)` = **0.95 h** of ground
behind it. A 20-unit balloon hides 19 units.

**The control.** The game already ships props that tall and taller — the
placement audit measured Maple's `#0 bldg h=19.4` and Pirate Bay's
`#2737 bldg h=23.4`. A balloon is not a new class of occluder; it is the same
class as a barn.

**The mechanism.** `fadeOccluders()` (`prototype3d.ts:1021`) walks every edible
each frame, projects it onto the camera→hero axis, and dissolves anything within
`voidling.radius * 1.35 + 1.2` of that axis down to a 62%-solid ghost, easing
rather than snapping. Its own comment records it being tuned against *"11.5-unit
lift pylons fading when they truly cross the sight line"*.

**And participation is automatic.** `armFade()` is called inside `mergedProp()`
(`island.ts:4361`) — the single function every prop kit in the game uses to build
a merged mesh. A balloon built to the house rules is armed the moment it exists.
It does not have to opt in; it would have to opt out.

**What this leaves as a real requirement on the prop kit**, and it is the only
one: *a standing balloon must be ONE edible with a radius that reflects its
envelope.* If an envelope were built as several separate meshes, only the piece
actually crossing the axis would ghost, and the child would see a balloon with a
hole in it. One mesh, one radius, one fade.

Still open, and a look question rather than a survival one: whether a
twenty-unit envelope at 62% *reads well* when it ghosts. That needs the picture,
and the picture needs a balloon.
