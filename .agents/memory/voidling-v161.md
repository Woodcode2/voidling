---
name: VOIDLING v16.1 The Render Fix
description: Orb-normalized sprite drawing, paved block dressing, real zoo rebuild with gate rule, real town hall, zoo animal scoreMult, street furniture pass.
---

## Key decisions & durable rules

**A — Orb-normalized sprite drawing (voidling.ts + sprites.ts)**
- `spriteOrb: Map<string, {w,cy}>` exported from sprites.ts; populated by `scanAlphaBounds` for form sprites, skin sprites, and object sprites.
- Orb band = rows 35%–95% of trimmed height; widest pixel run per row wins.
- Draw: `scale = (2*r) / (orb.w * naturalWidth)`, draw at `(-iw/2, -orbCyPx)` so orb-center row sits at y=0.
- A3: `drawFormBody` is skipped when Classic+form sprite active (art has morph baked in). Condition: `!(_activeBody && skin.id === 'classic' && _formSprite)`.
- Fallback to `r*2.2` box when no orb data.

**Why:** Sprites with non-square or tall art were drawing the orb too small or mis-centered relative to the gameplay radius circle.

**B — Paved block dressing (world.ts)**
- `dressPaved` array field on WorldManager; filled in `buildDressing` for paved blocks (drain grates ×6, direction arrows ×4, leaf flecks ×8, concrete planters ×4). Drawn at end of `drawDressing`.
- Old code had `if ((b as any).paved) continue;` — removed to enable paved dressing.
- Leaf color uses deterministic modulo array index (NOT `pick(arr, rand)` which requires a function).
- Downtown gets `rgba(120,150,210,0.06)` tint; paving-tile grid every 26px at `rgba(0,0,0,0.045)`.

**C — Real town hall (world.ts + config.ts)**
- `fillCivic` civicIdx===1 now places `townhall` instead of `watertower`. Standalone `watertower` still on residential corner lot.
- `townhallEaten` triggers on `obj.kind === 'townhall'` (not watertower in civic block).
- `townhall`: tier 5, minR 104, maxR 122 (≈ school).

**D — Real zoo (world.ts + config.ts)**
- Zoo perimeter walls (`zoo_wall`) every 90px; south-center gap (±90px from cx) for the gate.
- `zoo_gate` at south-center. Gate + walls require `radius >= CONFIG.ZOO_GATE_EAT_RADIUS` (= 58, GOBBLER). Rivals cannot eat them.
- `zooSmashed = true` only when `zoo_gate` is eaten (was: any zoo-block eat). Fires `pendingFx 'zoo_break'` for "ZOO BREAK!" banner in engine.
- zoo_break FX pattern: world fires shake+ring+debris immediately; engine handles banner via pendingFx (same pattern as watertower finale).
- `scoreMult?: number` on `KindInfo`; zoo animals set to `scoreMult: 2`. Applied once in `player.absorbObject` via `kindScoreMult`.
- Animal kinds: elephant(T5), giraffe/lion(T4), monkey/flamingo/penguin(T2, living+fleeing), zookeeper(T3, person variant).
- zoo_gate/zoo_wall added to OBJECT_IDS for future PNG art slots.
- Street furniture pass (B4): after `buildDressing`, loop residential+civic blocks: trees every ~300px on sidewalk inset, ~30% parked cars on 4 curb sides (all `infra: true`).

**BUILD_STAMP**: `v16 · 2` (in UILayer.tsx).
