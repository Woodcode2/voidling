---
name: VOIDLING v16 The City That Makes Sense
description: Key decisions, gotchas, and architecture from the v16 implementation
---

# VOIDLING v16 Architecture Decisions

## §0 Rubber-band Pacing
- `RIVAL_COUNT` reduced 5→4; `WORLD ENDER` radius 155→110; `MAX_RADIUS` 170→135
- `PacingController` wraps `BotController` in `rivals.ts` — throttles movement to 30% when >8% ahead of rank target, boosts 15% when lagging. Only throttles when not in FLEE/HUNT state and after 15s warmup.
- `WorldView.playerScore` field added — engine passes `player?.score ?? 0` each rivals tick.
- Pacer targets shuffled each round so rank↔fraction stays random.

## §1 Fixed 5×5 City Plan
Layout (gy=0 top → gy=4 south coast):
```
R R V V R
R R D D R
P Z D D R
R R D R R
C C C C C
```
- West column is now RESIDENTIAL (was beach). Coast slow in `events.ts` AND `engine.ts` both updated to only check `y > mz - sandD`.
- `BlockType` union includes `'civic'` — `fillCivic(idx)` dispatches: idx=0 → school+library, idx=1 → hospital+watertower (landmark).
- `civicIndex` counter increments per `civic` block in the fill loop; variable declared just before the loop.

## §2 Infra vs Consumables
- INFRA_KINDS (`hydrant, mailbox, trashcan, bench, bike, scooter`) tagged with `obj.infra = true` in makeObj.
- Respawn pool now: `['flower', 'flowerpot', 'apple', 'duck', 'seashell', 'crab']` — no infra.
- `fillResidential` reduced to 2 trash per block (from 3) per spec.

## §3 Art-derived Contact Radius
- `spriteContactFrac: Map<string, number>` in `sprites.ts` — populated by `scanAlphaBounds` scanning bottom 2/3 to 1 of sprite image.
- `makeObj` resolves variant-backed sprite keys: `{house→house_a, shop→shop_a, skyscraper→skyscraper_a}` before lookup.
- `contactRadius = 0.90 × baseSize × cFrac`, fallback `baseSize × 0.85`.
- `WorldObject` now has `contactRadius: number` and `infra: boolean` fields.
- Rival eat check uses `obj.contactRadius` instead of `obj.size * CONTACT_SCALE * 0.4`.

## §5 News Ticker + Contracts
- 16 pre-written ticker lines; fires 20s after round start, then every 28-36s; auto-clears after 6s.
- 3 contracts picked per round from `CONTRACT_POOL` (8 types); completion tracked via `world.playerStats` counters.
- `PlayerStats` extended: `houses, cars, people, beachItems, downtownItems`.
- `consumeByPlayer` in `world.ts` increments these counters.
- Engine `checkContract(id, met)` helper completes + awards `coinBonus` + fires banner.
- Contract chips rendered in `GameControls` top-left, below score HUD.

## §7 Fixes Applied
- Spell boon cards: fully opaque teal/violet solid fill (was translucent gradient).
- Ocean water: `drawCoast` in `world.ts` now renders in-map water strip 90px above map south edge (inside beach blocks).
- West coast code entirely removed (west column is residential in v16).
- Build stamp updated to `v16 · 1`.

## §4/§6 NOT Implemented
- Form sprites (§4): requires PNG assets `assets/forms/form_1.png…form_5.png` which don't exist.
- Speech bubbles / stakes card (§5 parts): deferred for v17.
- THE GUARD (§6): Jeep + soldier drawing functions added; trigger logic + spawning in engine deferred.

## New Drawing Functions (objects.ts)
- `drawCafe`: warm storefront with awning, coffee cup sign, steam waft.
- `drawHospital`: white civic building with red cross sign.
- `drawJeep`: army green 4-wheel vehicle.
- `drawSoldier`: green uniform person with round shield (shield hidden when fleeing).
- `house_c/house_d`: delegate to `drawHouse(ctx, r, t, 2/3)` for variant selection.

## Coast Slow — Two Places to Update
`events.ts` line ~164 AND `engine.ts` ~line 652 both apply coast slow. Both must be updated when beach layout changes.
**Why:** The events system runs its own per-tick pass that can override engine pre-move slow.
