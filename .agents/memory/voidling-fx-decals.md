---
name: VOIDLING fx decals (asset manifest 6)
description: Fissure and scar decal loading + rendering for WORLD ENDER trail and T3+ scar marks.
---

## Asset locations
- `public/assets/fx/fissure_a.png` — 1024×1024, white BG, multiply blend
- `public/assets/fx/fissure_b.png` — 1024×1024, white BG, multiply blend
- `public/assets/fx/scar.png` — 1024×1024, transparent PNG, normal blend

## Loading (sprites.ts)
- `fxDecals: Map<string, HTMLImageElement>` exported from module scope in sprites.ts
- Loaded inside `loadSprites()` in the FX_IDS loop **without** alpha-bounds scan (full-frame decals)
- Logs: `[VOIDLING fx] loaded: fissure_a, fissure_b, scar | fallback: `

## Rendering (world.ts drawGround())
- **Fissures**: `FissureDecal[]` array in WorldManager — one stamp per `dropCrack()` call (random rot, scale 0.7–1.3, size=radius×2.5, random A/B pick). Ticked in `update()`. When both fissure images loaded: `ctx.globalCompositeOperation = 'multiply'`, `globalAlpha = lifeNorm × 0.85`. White pixels vanish; dark cracks with violet glow sit in the ground. Fallback: procedural violet polylines from `fissures[]` array.
- **Scar**: `DirtPatch` now has `rot` and `drawScale` fields. When scar image loaded: draw decal with normal blend. Fallback: procedural ellipse (existing behavior).

**Why multiply for fissures:** The fissure images have deliberately white backgrounds. `multiply` blend makes white invisible (white × any = any), so only the dark crack+glow content shows. Do NOT alpha-trim or background-remove these images.

**How to apply:** If adding new fx decals, add key to FX_IDS in sprites.ts. Skip scanAlphaBounds — do NOT add fx keys to OBJECT_IDS or any other array that triggers the alpha scan.
