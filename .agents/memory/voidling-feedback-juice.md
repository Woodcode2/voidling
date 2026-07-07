---
name: VOIDLING Feedback Juice (cosmetic feedback layers)
description: The three display-only feedback layers (swallow ghosts, gold milestone banners, coin bursts) and the invariants that keep them from touching game state or the Stage-4 audits.
---

# VOIDLING Feedback Juice — display-only feedback layers

Three purely cosmetic layers added on top of gameplay. **Invariant: none may mutate
game state, score, growth, eat radius, spawning, `objects[]`, `eatenArea`, or the
Stage-4 audits (OFF-ISLAND / OVERLAPS / ON-ROADS must stay 0).** They read state and
draw; they never write it.

## The three layers
- **Swallow ghost (world.ts):** a preallocated fixed-size `swallowGhosts` pool. Spawned
  from `consumeByPlayer()` *after* `player.absorbObject()`, copying the eaten object's
  resolved sprite; eases toward the void center (scale→0, sink, spin, fade) over
  0.30–0.45s. Ticked in `update()`, drawn inside the **foot-Y interleaved draw pass** in
  `world.draw()` so depth stays correct. Pool full → skip (never allocate/drop frames).
- **Gold milestone banners (engine.ts):** reuse the existing `banner()` callout with gold
  `#FFD23F`. `milestoneForms[]` fires once per evolution form; a `milestonePctFired` Set
  fires once per 25/50/75/100% devoured. A re-evolution after a drop keeps the purple
  flavor banner. All milestone flags reset in `start()`.
- **Coin bursts (fx.ts):** preallocated fixed-size coin pool; `addCoinBurst(x,y,amount)`
  is driven from the `'score'` pendingFx handler in engine (bigger amount → bigger burst).
  Coins pop up, arc down under gravity, fade over ~500ms.

## Rules that bit us (fix consistently)
- **Pooled FX must reset per match.** `start()` clears `fx.particles/texts/rings` but the
  coin pool is separate — it needs its own `fx.clearCoins()` in `start()` or coins carry
  over visually into the next round. **Why:** rounds can restart faster than the 500ms
  coin lifetime. **How to apply:** any new pooled FX array added to FXManager must get a
  clear call wired into engine `start()`.
- **No per-frame allocation in the draw pass.** Don't `.filter()` a pool every frame to
  find active entries — iterate the fixed pool directly (early-out flag + inline push into
  the merged list). **Why:** `world.draw()` runs every frame under heavy eating.

## Notes
- The eat/consume path is deferred: `consumeByPlayer` → `player.absorbObject` (spiral
  orbit) → `finalizeOrbitItem` applies real mass+score and pushes the `'score'` pendingFx.
  Coin bursts hang off that `'score'` event, so they fire at absorption (void center), in
  sync with the pooled score-text popup.
- `[SPAWN AUDIT] off-island ... removed` lines are the pre-existing tripwire doing its job
  at spawn; the final `OFF-ISLAND ENTITIES` count still reads 0. Not a regression.
