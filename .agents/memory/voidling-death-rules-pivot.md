---
name: VOIDLING Death Rules Pivot
description: Rewrote death/respawn to "evolution stage IS life" (no hearts); rivals now drop-a-stage or get truly eliminated like the player.
---

## Rule shape
- No hearts. `formIndex` (evolution stage) is the only life total, for player and rivals alike.
- Eaten above the smallest stage → `dropStage()` + respawn elsewhere + ~3s ghost; keep playing.
- Eaten at the smallest stage (VOIDLING) → game over (player) / true elimination, `alive = false` (rival).
- Falling off the map edge at the smallest stage is a score penalty + respawn, never a death — this was already correct before the pivot and needed no change.

## The two failure modes that ate most of the effort
1. **Symmetry gaps between player and rival respawn.** Rivals' `getEaten()` already relocated + reset ghost; the player's `dropStage()` only shrank/ghosted *in place*. "Drop a stage and respawn" was silently interpreted as "drop a stage" alone until code review caught it. Added a `respawnPlayerAfterEaten()` mirroring the rival's random-walkable-point-away-from-eater logic. **Why:** any half-migrated Agar-style mechanic will have this kind of asymmetry — check both directions (player-affects-rival AND rival-affects-player) explicitly, don't assume one path's fix covers the other.
2. **`alive` gating is not one flag flip — it's a checklist across every aggregate.** Marking `rival.alive = false` is not enough by itself. Every loop that builds a `[player, ...rivals]`-style array needs an explicit filter, or a "removed from match" rival keeps acting: it can still scare NPCs/block spawns (world.ts's per-frame void list), receive underdog aid / cause leader decay (engine.ts catch-up standings), and even occupy a placement slot at `endRound()` with its frozen score. **How to apply:** whenever you introduce a persistent-but-inactive entity state (eliminated, disconnected, defeated), grep every `[player, ...rivals]` / `...things.map` aggregate in the file and decide per-site whether inactive entities belong — don't rely on the display layer (leaderboard "OUT" styling) as proof the simulation layer is also correct.

## Live-proof technique for hard-to-trigger branches
Automated Playwright testers could not reliably force real rival collisions (weak/slow steering, RNG rival placement) across ~8 attempts. What worked: add a temporary, clearly-labeled QA-only keyboard hook gated behind a dedicated query flag (not `?debug=1` — that flag already opens an unrelated full-width bottom sound-board overlay in this app that blocks clicks on the home screen) that calls the *exact same production functions* the real collision code calls (`dropStage()`, `getEaten()`, `endRound()`) rather than re-implementing the logic. This gives real evidence of the actual code path, not a simulated stand-in. Delete the hook (and its `console.log` breadcrumbs) before finishing — grep for the temp flag name and any temp log prefixes to confirm zero remnants.
