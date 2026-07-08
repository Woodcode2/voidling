---
name: VOIDLING clay food swap (Rebuild Prompt 9)
description: Ending the flat-2D holdouts — routing bonus food + street furniture to the clay food sheet, and the scoping tension around old-2D content with no clay equivalent.
---

# Clay food swap (Kill the 2D Holdouts)

`clayFood.ts` mirrors `clayLife.ts`/`clayScenery.ts` exactly: load `food_clay_sheet.png`
(4×3 = 12), cut via `extractComponents`, inject under `clay_food_N` keys with **spriteBounds
only** (never spriteContactFrac), foot-anchored square pad. `world.ts structureSpriteKey()`
remaps food kinds gated on `clayFoodKeys.length`; `engine.ts` calls `loadClayFood` at boot.

- Sheet cells (row-major): 0 apple, 1 cherries, 2 potted-flower, 3 snail, 4 gnome, 5 coins,
  6 gem, 7 cupcake, 8 mushroom, 9 hydrant, 10 mailbox, 11 trash-bin.
- Generic scattered `apple` rotates through a variety pool (`id % pool`); the other food/
  furniture kinds map to a fixed cell via `CLAY_FOOD_CELL`. `flower` was already clay (nature pool).
- `snail` is NOT a game kind (sheet has one; no old snail existed) — it's just apple-variety filler.

**Why the visual-only rule matters:** these food items are *bonus food* deliberately excluded
from the percent-devoured win math AND respawn population. Because the swap only changes the
draw key (never win math, never contactFrac), percent-devoured is unchanged *by construction* —
you cannot read it numerically off the DOM (canvas HUD), so don't try to prove it live; the
guarantee is structural.

**How to apply:** any future art swap for gameplay-scored vs bonus objects must keep the same
split — remap the draw key, leave the kind/contact/win-math paths alone.

## Scoping tension (recurring)
"Kill every old-2D spawner" collides with "don't touch gameplay balance." Many old-2D kinds
have no clay equivalent AND are live gameplay content: military/defense units (predators),
vignette scenes, zoo animals, beach/playground/field props (scored eatables/decals). Disabling
them = removing content. When a prompt says "disable stray 2D," first separate pure decoration
from scored/predator content and **ask the user** how far to go rather than gutting gameplay.
