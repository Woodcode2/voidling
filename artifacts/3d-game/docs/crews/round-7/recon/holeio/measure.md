# Measurements — value, unit, source, method

Every number the report quotes appears here with the frame it came from and how it
was taken. Screen is 1320×2868 px (iPhone 16 Pro Max native, aspect 2.173); all
percentages of "screen height" are of 2868 px and "screen width" of 1320 px.

## Colourfulness (L5) — chroma, not HSL saturation

`chroma.py`: image resized to 330 px wide (LANCZOS), chroma = (max−min)/255 per pixel.

| frame / region | median chroma | p90 | % of px with chroma>0.35 | median value |
|---|---|---|---|---|
| `02` city playfield (y 500–2600) | 0.102 | 0.482 | 25.4% | 0.69 |
| `02` city ground+cars detail (950,1380)-(1320,1900) | 0.086 | 0.608 | 20.2% | 0.56 |
| `04` tutorial garden (y 300–2400) | **0.580** | 0.608 | **87.7%** | 0.84 |
| `05` splash, whole frame | 0.314 | 0.647 | 44.2% | 0.79 |
| `03` end card, whole frame | 0.078 | 0.529 | 12.4% | 0.09 |
| `01` premium, whole frame | 0.208 | 0.745 | 28.9% | 0.36 |

**The saturation gap, city playfield (`02`, y 900–2600, 440×567 sample):**

| group | share of playfield | mean colour |
|---|---|---|
| chroma < 0.12 (ground, road, pavement) | **55.6%** | `#87818c` hsl(275, 5, 53) |
| chroma > 0.35 (props, hole, UI) | **20.8%** | — |

The city ground is a neutral stage at 5–10% saturation; the objects on it run
46–99%. The tutorial garden inverts this: 87.7% of it is saturated.

## Hole geometry (L6)

Method: horizontal scan of `02-match-city.png` at y=1450, a row chosen because it
crosses the rim cleanly on both sides (away from the taxi at the upper-left rim and
the truck at the right).

| quantity | value |
|---|---|
| interior (black) span | x 368–980 = **612 px** |
| bright rim band, left / right | x 276–324 / 1000–1048 |
| dark outer line, left / right | x 244–268 / 1056–1080 |
| outer diameter (dark line to dark line) | **836 px** = 63.3% of screen width |
| rim thickness, left / right | 124 px / 100 px, mean **112 px** |
| **rim thickness ÷ outer diameter** | **13.4%** |
| widest interior row (separate pass) | y=1510, 637 px |
| interior vertical extent at x=660 | y 1239–1705 = 466 px |
| **interior ellipse ratio (h/w)** | 466 / 637 = **0.73** |
| **implied camera pitch above ground** | asin(0.73) = **47°** |
| hole centre on screen | 50% x, 51% y |

**Hole size on screen vs Size label** (longest dark run per frame):

| label | frame | interior width | % of screen width |
|---|---|---|---|
| Size 1 | `10-match-flowers-size1.png` | 298 px | 22.6% |
| Size 2 | `09-match-flowers-size2.png` | 418 px | 31.7% |
| Size 14 | `02-match-city.png` | 637 px | 48.3% |

Size 1→14 is a 14× nominal growth but only a **2.1× growth on screen**, so the
camera pulls back roughly 6.6× across a match. The hole never stops being the
biggest single object in frame and never fills it.

## HUD footprint (L4)

Bright-blue UI bounding box in `02`, restricted to y<520 so the hole rim cannot
contaminate it:

| quantity | value |
|---|---|
| bounding box | x 30–1292, y 150–518 |
| width | 1262 px = **95.6% of screen width** |
| height | 368 px = **12.8% of screen height** |
| vertical position | 5.2% – 18.1% from the top |

## Contrast ratios (WCAG formula)

| pair | ratio | frame |
|---|---|---|
| hole interior vs rim highlight | **9.12 : 1** | 02 |
| "Well Done!" fill vs its orange stroke | 3.42 : 1 | 03 |
| "Well Done!" fill vs background | **17.9 : 1** | 03 |
| "Well Done!" stroke vs background | 5.24 : 1 | 03 |
| Continue cream rim vs dark background | 17.9 : 1 | 03 |
| HUD progress green vs unfilled track | **7.96 : 1** | 02 |
| bench wood lit vs shaded face | 2.09 : 1 | 10 |
| tree canopy lit vs shaded | 2.54 : 1 | 10 |
| pavement lit vs its shadow | 1.79 : 1 | 10 |
| PLAY button vs menu background | 4.21 : 1 | 08 |
| top HUD bar vs menu background | 6.50 : 1 | 08 |

## Main menu composition (L2)

| quantity | value |
|---|---|
| pixels in the violet-blue background family (h 225–265°, chroma 0.20–0.62, L 30–62%) | **44.8% of the frame** |
| mean background | `#4c3cbe` hsl(247, 52, 49) |
| background gradient, top → middle → bottom | `#4c29be` → `#4759c8` → `#584ec5` |
| diorama + content vertical extent | y 600–1996 = **49% of screen height** |
| top HUD bar | y 208–248 … 300–344, i.e. 7.3–12.0% |
| ladder pip row | centred y ≈ 1900 (66% of screen height) |
| PLAY button | y ≈ 2150–2350 (75–82%) |
| tab bar | below y ≈ 2450 (85%+) |

**Ladder pips**, from the horizontal scan at y=1900 (5 pips):

| pip | x span | centre | colour | reading |
|---|---|---|---|---|
| 4 | 40–208 | 124 | `#596793` grey-blue | completed |
| 5 | 292–456 | 374 | `#8f2599` magenta | 100%-cleared (owner's reading) |
| 6 | 556–772 | 660 | `#69e420`→`#adf440` gradient, largest, white ring | current |
| 7 | 868–1036 | 950 | `#98affd` + padlock | locked |
| 8 | 1120–1180+ | ~1200 | `#98affd` + padlock | locked |

Pip 6 spans 216 px against 168 px for pip 4 — the current step is ~29% wider than
its neighbours.

## Counters read off the frames

| frame | reading |
|---|---|
| `02` | timer 13:25; progress 767/1000; skull counter 5; Size 14 |
| `09` | timer 3:17; flowers blue 108 / red 93 / yellow 118; Size 2 |
| `10` | timer 3:47; flowers blue 108 / red 93 / yellow 140; Size 1 |
| `03` | coin +200; level bar 1/14 |
| `01` | coins 2.95k; Skip'its 0; premium $12.99 |
| `06` | coins 3.55k; Skip'its 0; packs 10/$3.99, 50/$14.99, 200/$49.99; coins 1000/$2.99, 5000/$11.99, 10000/$24.99; deal $12.99 |
| `07` | CLASSIC HOLES 1/27; SPECIAL HOLES 0/16 |
| `08` | coins 3.55k; locked reward "LEVEL 8"; pips 4–8 |

Between `10` (3:47) and `09` (3:17) the timer falls 30 s and the yellow flower
count falls 140→118 while blue and red are unchanged, so **the three counters
count DOWN — they are flowers remaining, not collected**, and each colour is
tracked separately.
