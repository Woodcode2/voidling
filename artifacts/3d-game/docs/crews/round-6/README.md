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
