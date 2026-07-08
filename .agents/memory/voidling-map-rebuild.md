---
name: VOIDLING Map Rebuild (Prompt 12)
description: Single fixed island plan, new block types, reserved zones, two suburb districts, and ground-art helpers.
---

## Fixed plan
`FIXED_PLAN` in `world.ts` replaces the rotating PLAN_A/B/C + dayOfYear selection. `planName` is hardcoded to `'NEW EARTH'`.

## New block types added to BlockType
`'forest' | 'airport' | 'military'`

- `forest` → `fillForest`: trees, bush, flowers, birds. No buildings.
- `airport` + `military`: **no entity fill at all** — ground art only, baked in `drawMap.ts`.
- `zoo` → `fillZoo`: now empty/reserved body. Animals + structures come next prompt.

## Reserved zones in mapData.ts
```
ZONE_ZOO_R     = [bx0(4), by0(0), bx1(4), by1(0)]  // [7900, 700, 9500, 2300]
ZONE_AIRPORT_R = [bx0(4), by0(4), bx1(4), by1(4)]  // [7900, 7900, 9500, 9500]
ZONE_MILITARY_R= [bx0(5), by0(2), bx1(5), by1(2)]  // [9700, 4300, 11300, 5900]
```

These must be excluded from scatterScenery. Guards are inline bounds checks inside the `tryPlace` loop.

## Two suburb districts via generateLots
Inside the residential fill loop, HOUSE_POOL is selected per-block by column:
- `gx < 3` → `COZY_POOL` (`house`, `house_c`) → resolves to `clayHouseCottageKeys` (rows 2–3 of houses_clay2_sheet.png)
- `gx >= 3` → `FANCY_POOL` (`house_d`) → resolves to `clayHouseFancyKeys` (rows 0–1 of houses_clay2_sheet.png)

`structureSpriteKey` routes accordingly — `house`/`house_c` → cottage, `house_d` → fancy.

## Clay sheets
`houses_clay2_sheet.png` (4×4=16), `downtown_clay2_sheet.png` (4×3=12). Loaded in `clayCity.ts`.
Exported pools: `clayHouseCottageKeys`, `clayHouseFancyKeys`, `claySkyscraperKeys`.
Old `buildings_clay_sheet.png` + `houses_clay_sheet.png` references are dead — new pools replace them.

## Ground art helpers in drawMap.ts
`_paintAirportRunway`, `_paintMilitaryPad`, `_paintZooLayout` — called from `_paintStaticGround` section 8, inside island clip.

## fillPark feast spawn fix
Feast items now scatter within the park block (b.x0/y0 bounds), not at global spawnX/spawnY, because under the fixed plan the park block is NOT at the map center any more.

## v12 §1 ring spawn reduction
Reduced from 8 items at rr=65–145 to 3 items at rr=140–200 (breathing room rule: keep 108px clear of spawn center).

## Forest block off-island
gx=5, gy=0 center (10500, 1500) is outside the island polygon → `fillForest` is skipped by the island check (no entities placed there). ZONE_FOREST_R still covers it for terrain color. The zoo block gx=4, gy=0 (8700, 1500) is inside and gets the empty fillZoo.

**Why:** zoo block center passes isOnIsland but forest block doesn't — it's fine; forest scenery items at gx=5,gy=0 fail the isOnIsland(x,y,120) check naturally.
