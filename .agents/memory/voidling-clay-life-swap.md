---
name: VOIDLING clay art swap — people + vehicles + heading rotation
description: Extending the image-only clay swap to pedestrians and traffic, and the correct way to make top-down vehicle sprites face their direction of travel.
---

# Clay people + vehicle swap (sibling of clayCity.ts)

`clayLife.ts` mirrors `clayCity.ts`: run the clay sheets through `extractComponents`
and inject into SEPARATE pool keys (`clay_person_N` / `clay_vehicle_N`), then
remap the ambient pedestrian + moving-traffic kinds onto those pools in
`world.ts structureSpriteKey()`. Same gameplay rule: set **only** `spriteBounds`,
never `spriteContactFrac` — contact radius is derived in `makeObj` from the
unchanged KIND key, so eat-contact is identical.

## Two padding modes, chosen by whether the sprite rotates
- **People → foot-anchored square-pad** (`toSquareFoot`) + `bounds{0,0,1,1}`,
  drawn through the existing foot-Y path `(-r,-r*2,2r,2r)`. The pedestrian bob
  (`pedBob`) keys off `obj.kind` (the `isPed` set), NOT the sprite key, so
  swapping the sprite keeps the walk/panic bob for free.
- **Vehicles → CENTER-anchored square-pad** (`toSquareCenter`) + `bounds{0,0,1,1}`.
  A foot-anchored car would ORBIT its feet when rotated. Centre-padding + a draw
  branch that `translate(0,-r)` then `rotate` then draws centred `(-r,-r,2r,2r)`
  makes it spin about its middle while keeping the world foot anchor at `obj.y`.

## Vehicle heading rotation (the "stiff car" fix)
Sheet art points UP (north). Rotate by `atan2(dy,dx) + Math.PI/2`.
**Heading source differs by kind — this is the trap:**
- `car` / `schoolbus` are driven by `stepCar`, which mutates `obj.x/obj.y`
  directly and **never sets `vx/vy`**. Derive heading from `roadAxis`+`roadDir`
  (`'h'`→(roadDir,0), `'v'`→(0,roadDir)).
- Other traffic kinds (`taxi`/`convertible`/`fire_truck`/`school_bus`) are NOT
  routed to `stepCar` (only `car`/`schoolbus` are, at the `stepLiving` dispatch);
  they wander via `vx/vy`. Use `(vx,vy)`. They naturally face their wander
  vector, which can look diagonal — that's correct, not a bug.
Gate the branch on `spriteKey.startsWith('clay_vehicle')`, not on kind, so a
missing sheet cleanly falls back to the old foot-anchored draw.

## Load-order safety
`loadWardAssets` / `loadClayCity` / `loadClayLife` are all fire-and-forget in
`start()`. Because clay injects into DISTINCT pool keys (never the ward kind
keys), there is no clobber race, and `structureSpriteKey` falls back to `kind`
when a pool is empty. **Why:** keeping a separate `clay_*` key namespace is what
makes ordering irrelevant — reuse this strategy for future swaps.

## Extraction count caveat
`extractComponents(img, cols, rows)` assigns components to the NEAREST grid cell.
Offline `-connected-components` mapped the vehicles sheet as 5×3=15, but the
in-game cutter yielded 13 (two nearest-cell collisions collapsed pairs). Not a
defect — still clean, no merges/chops. Don't assume offline component count ==
in-game cutout count; verify the `[clayLife]` log + `?debug=sprites`.
