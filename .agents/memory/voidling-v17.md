---
name: VOIDLING v17 Feel Patch Phase 1
description: Six gameplay-feel changes — no-blocking props, debris bits, wider vacuum, score-driven growth, camera zoom, eat-pop feedback. Critical architectural rules for each system.
---

## Changes Implemented

### §1 — Remove blocking prop collision (world.ts)
- Player slides through uneatable props; prop shakes 100ms instead of pushout.
- `shakeT?: number` added to `WorldObject` interface (optional).
- Shake is ONE-SHOT on contact entry: trigger fires when `obj.shakeT === undefined`.
- `shakeT` decays `100 → 0` in tick, then reset to `undefined` when player is no longer overlapping (`blockingNow === false && obj.shakeT <= 0`).
- **Trampoline exception preserved** — still launches player.
- Map boundary (player.ts `update()` clamp) remains hard.
- Visual shake offset: `Math.sin(shakeT * 1.8) * (shakeT / 100) * 4` px horizontal translate.

### §2 — Bits (config.ts, world.ts, objects.ts)
- New `'bit'` ObjectKind: tier 0, minR 4, maxR 7.
- `canEatByPlayer`: `if (obj.tier === 0) return true` before EAT_RATIO check.
- `spawnBit(x, y, variant)` on World: pushes WorldObject directly (NOT via `makeObj` so `totalStartArea` is unaffected). 2 bits for T2–T3 eats, 3 for T4+.
- `drawBit()` in objects.ts: colored sticker circle + highlight dot.
- Bits get `shakeT: 0` at spawn (not `undefined`) so they don't shake.

### §3 — Vacuum pull (config.ts, world.ts)
- `CAPTURE_RADIUS_MULT: 1.35 → 1.6`.
- Player suction: proximity-weighted `proximityFactor = 1 + 2*(1 - (dp - r)/(reach - r + 1))` — 3× at body edge vs outer rim.
- Rival vacuum: **object-outer loop** (iterate objects, find nearest eligible rival within reach). One velocity impulse per object per frame, no position integration. Eating still happens through the main-loop contact check.
- **Why object-outer loop**: prevents multi-rival re-acceleration per frame.

### §4 — Score-driven growth (void.ts, player.ts)
- `scoreToRadius(s): BASE * (1 + (s / 2600)^0.57)` — targets: 1k→1.6×, 5k→2.5×, 15k→3.5×.
- `applyScoreRadius()`: `clamped = min(target, cap)` → if `clamped > radius`, set radius.
- **Critical**: clamp FIRST (to law ceiling × MAX_RADIUS), then compare to floor. Earlier bug skipped growth when `target > cap` even if `radius < cap`.
- Called in `tickCaptures()` (bots + player) and `finalizeOrbitItem()` (player only).
- Growth Law ceiling still enforced; stages become cosmetic.

### §5 — Camera zoom-out (engine.ts)
- Formula: `viewHeight = clamp(radius * 22.22, 350, fh * 3.5)`.
- Removes `isWorldEnder` special case — new formula naturally extends to WORLD ENDER radius.
- `fh * 3.5` cap keeps sprites readable at max size.

### §6 — Eat feedback (player.ts, world.ts)
- `eatPopScale = 1.06` on each `finalizeOrbitItem()`; decays at `−0.0003/ms` → 1.0 over ~200ms.
- Applied only to visual `r` (in `visual()` method) — physics radius unchanged.
- House shake softened: `300ms/10px → 120ms/2px`. `house_c` and `house_d` grouped same case.

## Architecture Rules
- **Score-driven radius is a floor** — it never decreases radius; mass-based growth can still push higher.
- **Bits are ephemeral debris** — not added to `totalStartArea`; don't push directly via `makeObj`.
- **Rival vacuum is velocity-only** — no `obj.x += vx * dtSec` in the vacuum pass; eating is contact-based in main loop.
- **Shake arms on `undefined`** — don't use `if (!obj.shakeT)` (fails when expired to 0); use `if (obj.shakeT === undefined)`.
