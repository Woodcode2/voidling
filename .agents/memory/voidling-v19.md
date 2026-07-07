---
name: VOIDLING v19·0 Phase 4 Vector Rebuild
description: Vector ground (drawMap.ts), geometry terrain (mapData.ts), island image retired from gameplay; TDZ rule for module-init geometry calls.
---

## Vector ground (drawMap.ts)
- Draws the full island as vector geometry (terrain patches, roads, water) without any PNG for gameplay.
- `tracIslandPath(cc)` + `cc.clip()` wraps all road fills, curbs, dashes, crosswalks — nothing renders outside the island polygon.

## TDZ rule
Any function in `mapData.ts` or `drawMap.ts` that calls into geometry helpers at module-init time will throw a TDZ error. Always call them lazily (inside an exported init function or from engine start-up, not at top-level module scope).

## islandState.formSprites (retired in Phase 7a)
`islandState.formSprites[]` existed as an evolution-sprite override in `Player.draw()` for forms 1+. **Removed in Phase 7a**: Player.draw() now unconditionally calls `drawVoidling()` for all forms so the procedural body renders consistently. Do not restore this path.
