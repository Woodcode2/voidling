---
name: VOIDLING v16.2 Pressure & Personality
description: Covers §0–§6 of v16.2: bot size cap, town voice / speech bubbles, hearts system, boon signatures, 6×6 map with rotating plans, event-based tickers.
---

## Key decisions

**§0 Relative Size Law**
- `BOT_RADIUS_CAP_FRAC: 1.25` in config; clamp applied in `Rival.update()` AFTER `tickCaptures()` so score still accumulates naturally; only visual/collision growth is blocked.

**§1 Town Voice**
- `WorldObject` has `bubbleText: string|null; bubbleLife: number`; ticked in `update()`, rendered in `draw()` (white rounded-rect + tail above NPC).
- `WorldManager.openingBeatPersonId` stores id of the NPC placed near spawn; `setBubble(id, text, ms)` is the public setter.
- `queueTicker(line, durationMs?)` in engine.ts overrides random ticker cadence for event-driven lines; sets `tickerCd` high so the event line isn't immediately overwritten.
- Gate flags (all reset in `start()`): `openingBeatDone`, `roundStartTickerDone` (separate from `firstHouseTickerDone`), `firstHouseTickerDone`, `zooBreakTickerDone`, `townhallTickerDone`, `devoured15Done`.

**§3 Hearts**
- `hearts = 3` is a base-class field on `Void` (so both player AND rivals carry it).
- Steal fraction is keyed on hearts BEFORE the chomp: `{3→25%, 2→35%, 1→50%, 0→50%}`.
- Bug fix: map preHp (not postHp) to get the right steal tier.
- FINAL HEART (player.hearts===0): player's own steals from rivals are doubled (min(0.75, base×2)); rivals' steal from player stays at 50% tier.
- Ticker fires ONLY on the transition to 0 hearts (`preHp > 0 && player.hearts === 0`).
- Rivals also lose hearts when the player eats them; `rivalStealMap` escalates accordingly.

**§4 Boon Signatures**
- Extended `drawPowerAuras()` with per-boon visual loops after the base ring draw; uses `ctx.save()/restore()` per boon to isolate alpha/style state.

**§5 WORLD ENDER FX**
- Ticker fires on triggerEvolution() for form 2 (GOBBLER) and final form (WORLD ENDER).

**§6 6×6 Map / Rotating Plans**
- `MAP_SIZE 4800`, `GRID 6`; `ROAD_CENTERS` auto-recomputes from `CONFIG.GRID` at module init — no manual edit.
- Three named plans: METRO / SUBURBIA / SEASIDE; selected by `(UTC day index) % 3` for daily variety.
- `WorldManager.planName` exposed in Snapshot so UILayer can show "TODAY: {PLAN} DAY".

**Why `roundStartTickerDone` is separate from `firstHouseTickerDone`:**
Using `firstHouseTickerDone` as the guard for both the 3s round-start line AND the first-house event caused the round-start line to re-queue every tick for the entire 3000–3100ms window (no flag set to stop it). Split into two flags: `roundStartTickerDone` (set on first queue, fires once at ≥3s) and `firstHouseTickerDone` (set when first house is eaten).
