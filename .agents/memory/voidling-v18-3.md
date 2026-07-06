---
name: VOIDLING v18·3 Life Pack
description: Changes introduced in the Life Pack (Phase 3c): people2, sports field decals, vignette system, tier-4 military (tanks + helis).
---

## Summary
Four changes shipped in v18·3 (BUILD_STAMP `v18 · 3`).

## Change 1 — Population upgrade (people2)
- `people2_sheet.png` (3×3, 9 kinds) loaded in `wardSprites.ts` alongside original `people_sheet.png`.
- Stick-figure `person` retired from all scatter zone pools (`BEACH_PEOPLE`, `DOWNTOWN_PEOPLE`, etc.) — it still exists in KIND_INFO but never spawns.
- `PEOPLE2_KINDS` exported from `wardSprites.ts`: `person_mom, person_dad, skateboarder, cyclist, waiter, icecream_vendor, person_jog2, person_elderly, tourist`.
- All nine added to `LIVING_KINDS` and all zone pool arrays in `world.ts`.

## Change 2 — Sports field decals
- `fields_sheet.png` (1×3: `field_soccer`, `field_basketball`, `field_tennis`) loaded with dark-violet BG stripping.
- `WorldManager.fieldDecals: FieldDecal[]` — NOT in `objects[]`, non-edible, non-collidable.
- `initSportsFields(rand)` places them during `init()` after `buildDressing`.
- Rendered in `drawGround()` after `drawIsland()` and grain overlay, before any props.

## Change 3 — Vignette system
- `vignettes_sheet.png` (3×3: 9 anchor sprites) + `playground_sheet.png` (3×3: 9 equipment props).
- `VIGNETTE_CONFIGS[]` constant in `world.ts` defines all 10 vignette types (vig_soccer + pg_swing are `always:true`).
- `WorldObject.vignetteData?` carries `{id, ambientText, panicText, eatenBanner, ambientCd, panicked}`.
- `WorldManager.eatenVignetteBanners: string[]` — engine reads and clears with `length = 0` each tick.
- Bubble logic: separate pre-loop pass in `world.update()` — cap of 4 active bubbles, panic fires once, ambient 8–12s cooldown per anchor.
- Eating a vignette anchor: `consumeByPlayer()` pushes `eatenBanner` onto `eatenVignetteBanners`; KIND_INFO `scoreMult=2` gives 2× points.

## Change 4 — Tier-4 military
- Phase 3 banner changed to "TANKS ROLL IN"; phase 4 added at `DEFENSE_HELI_THRESH` (50%).
- `defenseShells[]` in engine.ts: land with 1s warning circle; countdown via `warnT`, impact only if player in radius, score cost = `DEFENSE_SHELL_COST_PCT` fraction.
- `spawnDefenseWave` now typed `1|2|3|4`; phase-2 may spawn `armored_humvee`, phase-3 spawns tanks/missile_trucks, phase-4 spawns `attack_heli` (1–2 per wave) + heavy ground.
- Helicopter hover: tracks `(player.x-200, player.y-200)` offset; fires 3-pellet bursts.
- WORLD ENDER exception: player at last form can vacuum-eat helis if within vacuum radius.
- Shadow ellipse drawn in world space below each `attack_heli`.

## wardSprites.ts rewrite
- `stripBackground()` now adaptive: corner-samples reference colour, flood-fills at distance² < 2500. Handles both white (old sheets) and dark-violet `#14082B` (new sheets) automatically.

## Key rules
- **Why:** `defenseShells.length = 0` must be in `start()` resets or shells survive between rounds.
- **Why:** Field decals must stay out of `objects[]` or they would be edible and affect % devoured.
- **How to apply:** Any future ground-decal system should use the same `fieldDecals: FieldDecal[]` pattern.
