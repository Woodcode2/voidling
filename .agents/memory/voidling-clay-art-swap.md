---
name: VOIDLING clay art swap (buildings + houses)
description: How to swap sticker building/house art for cutouts from new 3D sheets without touching gameplay or the draw path.
---

# Clay art swap — image-only sprite replacement

Swapping flat sticker building/house art for cutouts from new clay-render 3D
sheets, via `clayCity.ts`, extracted with the existing `extractComponents`
(spriteExtract.ts) and injected into `objectSprites`.

## Non-square cutout → existing 2r×2r draw path (the key trick)
The object draw maps a sprite's `spriteBounds` region into a FIXED `2r×2r`
square (`drawImage(..., -r, -r*2, 2r, 2r)`). All shipped object PNGs are square
(1024²), so tight-bbox content is ~square and isn't distorted. A tall cutout
(e.g. skyscraper bbox ~320×839) would be squished if injected directly.
**Fix without a new draw path:** pad each tight cutout into a SQUARE canvas
`S=max(w,h)`, object anchored bottom-centre (`drawImage(src,(S-w)/2, S-h)`),
then set `spriteBounds[key] = {0,0,1,1}`. Square→square renders undistorted and
foot-anchored through the unchanged path.
**Why:** honours "reuse the existing foot-Y-sorted bottom-center draw path; no
new draw path" while fixing aspect.

## Gameplay-safety rule for any sprite override
Eat/contact radius is derived in `makeObj` from `spriteContactFrac` (keyed via
`SPRITE_KEY_MAP[kind] ?? kind`, e.g. house→house_a, skyscraper→skyscraper_a).
`spriteBounds` is VISUAL-ONLY. So an image-only swap must set **only**
`spriteBounds`, never `spriteContactFrac`, or it silently changes gameplay
contact. `injectVisual` in clayCity.ts does exactly this.

## Irregular clay sheets extract clean at default threshold
Soft-edged clay renders WITH soft contact shadows on the standard `#1E1338`
BG cut cleanly through the pipeline at its default threshold — no halos, no
merges, no chops, and the flood-fill removes the soft shadows entirely (the
game draws its own drop-shadow ellipse, so that's ideal). **No cutter tuning
was needed.** Verify offline fast with ImageMagick:
`magick sheet.png -alpha set -fuzz 13% -fill none -draw "color 0,0 floodfill"`
composited over a checkerboard reproduces the cutter's output closely.
`-connected-components 4` with `area-threshold ~8000` (=0.2% of 2048²) gives
exact component counts + bbox centres to fix the cols×rows grid deterministically
before wiring.

## Variety without touching lots
Houses draw from a random pool (`clayHouseKeys[obj.id % len]`), skyscraper lots
from a 3-tower pool (`claySkyscraperKeys[obj.id % len]`), resolved in
`world.ts structureSpriteKey(kind,id)` used by BOTH the main draw and
`spawnSwallowGhost`. Empty pools → legacy house_a/b/procedural + procedural
skyscraper fallback, so a failed sheet load degrades gracefully.
