---
name: VOIDLING Prompt 14 The Numbers Fix
description: Density constants, zombie system removal, car rotation fix, sidewalk widening, dead-code cleanup.
---

## Decisions

### Density constants (world.ts generateLots)
- `H_STEP` 400 → 280 (FP_FRAC=0.55, avg house radius 104, fpR≈57, gap ≈ 166 at step 280 = 1.45× footprint diameter — well under 0.6× rendered size; lotFree prevents actual overlaps)
- `DT_STEP` 540 → 360 (enlarged building radii + tighter step → gap ≤ 0.3× at plaza core)
- `kindForRank` shares: 45% skyscraper / 35% office / 12% cafe / 8% shop (outermost band only)
- Building sizes bumped: skyscraper minR 115→125 maxR 130→150; office minR 88→95 maxR 104→118

### Sidewalk width (drawMap.ts)
- `SW` 28 → 60 world units — readable at gameplay zoom

### Zombie systems deleted (Stage 3)
- `drawCoast` function (was already dead code — never called; deleted definition)
- `dressFence` / `dressHedges` — population removed from `buildDressing`, draw loops removed, private fields removed
- `dressTufts` (120 grass tufts + sand speckles) — same removal pattern
- `drawTuft()` helper function deleted (dead after tuft draw loop removed)
- `wind` import from './objects' removed (only consumer was tuft loop)

### Car rotation (Stage 4)
- Prompt 13 incorrectly removed `+Math.PI/2` assuming sheet faced east
- Prompt 14 restores it: sheet faces UP, so `rot = atan2(dy,dx) + Math.PI/2`
- No pre-translate; pivot stays at foot centre

**Why:** H_STEP/DT_STEP reductions fill the city without touching the lotFree collision system — the guard prevents actual overlaps regardless of step size. Zombie systems were O(120×blocks) per frame — perf win and visual clarity.

**How to apply:** If the city looks too sparse again, reduce H_STEP further (not below ~220 or lotFree rejection rate spikes). If BUILDING OVERLAPS audit > 0, check DT_INSET = CONFIG.SIDEWALK + 110.
