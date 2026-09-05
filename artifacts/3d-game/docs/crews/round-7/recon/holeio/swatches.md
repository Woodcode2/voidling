# Swatches — every colour the report quotes

Method: `probe.py px` samples a 13×13 mean at a named pixel; `find.py` clusters a
region by hue/lightness and reports each cluster's mean colour, its share of the
region and its centroid, so a colour is never guessed from a coordinate. Source
frames are the owner's screenshots in `reference/holeio/`, all 1320×2868.
`rel-lum` is WCAG relative luminance.

## The city match (`02-match-city.png`) — the "colour and pop" frame

| what | hex | hsl | rel-lum | how found |
|---|---|---|---|---|
| road asphalt | `#89798f` | (285, 9, 52) | 0.209 | 51.7% of the region (950,1380)-(1320,1900) |
| pavement | `#cbbfc9` | (309, 10, 77) | 0.543 | 14.5% of the same region |
| neutral ground, mean of all chroma<0.12 px | `#87818c` | (275, 5, 53) | — | 55.6% of the playfield |
| car red | `#d6323a` | (357, 66, 52) | 0.168 | px (1180,1430) |
| car blue | `#3661c6` | (222, 57, 49) | 0.133 | cluster, centroid 1053,1541 |
| car yellow | `#deaf2c` | (44, 73, 52) | 0.461 | cluster, centroid 1071,1854 |
| hole rim highlight | `#7cd0ff` | (202, 100, 74) | — | scan row y=1450, x 276-324 |
| hole rim body | `#64b5ff` | (209, 100, 70) | 0.431 | px (1020,1450) |
| hole rim outer dark line | `#0c4580` | (210, 83, 27) | 0.059 | scan row y=1450, x 244-268 |
| hole interior (centre) | `#07171c` | (193, 60, 7) | 0.007 | px (660,1450) |
| hole interior (far edge) | `#02080a` | (192, 67, 2) | 0.002 | px (660,1290) |
| HUD pill blue | `#4e7ffe` | (223, 99, 65) | 0.238 | 47.3% of the timer-ring region |
| HUD progress green | `#25dd02` | (110, 98, 44) | 0.523 | cluster, centroid 536,372 |
| HUD progress hot leading edge | `#9aef0a` | (82, 92, 49) | 0.688 | cluster, centroid 742,351 |
| HUD unfilled track | `#28205a` | (248, 48, 24) | 0.022 | cluster, centroid 737,382 |
| timer ring gold (bright) | `#ffdc00` | (52, 100, 50) | 0.723 | cluster in (90,250)-(270,460) |
| timer ring gold (shade) | `#e8a204` | (42, 96, 46) | 0.430 | same region — the arc is two-tone |

## The end card (`03-well-done.png`)

| what | hex | hsl | rel-lum | share of region |
|---|---|---|---|---|
| "Well Done!" fill, upper | `#feee29` | (55, 100, 58) | 0.822 | 0.8% |
| "Well Done!" fill, mid | `#fff36e` | (55, 100, 71) | 0.864 | 18.1% |
| "Well Done!" fill, lower | `#fef79e` | (55, 98, 81) | 0.899 | 4.2% |
| "Well Done!" stroke orange | `#e54b00` | (20, 100, 45) | 0.217 | 12.1% |
| "Well Done!" stroke deep | `#a52402` | (12, 97, 33) | 0.093 | 3.3% |
| dimmed world behind | `#000213` | (234, 100, 4) | 0.001 | 57.9% |
| coin gold | `#ff9d00` | (37, 100, 50) | 0.452 | px (660,1180) |
| level bar track | `#23174a` | (254, 53, 19) | 0.015 | px (700,1660) |
| level bar fill nub (green) | `#11b311` | (120, 82, 39) | 0.325 | px (160,1660) |
| Continue face | `#38db03` | (105, 97, 44) | 0.516 | 46.1% |
| Continue lower bevel | `#16ae06` | (115, 93, 35) | 0.303 | 28.1% |
| Continue outer rim (cream, not white) | `#f6efda` | (44, 61, 91) | 0.862 | 6.9% |
| Continue drop shadow | `#0e500d` | (119, 72, 18) | 0.058 | 1.0% |

## The main menu (`08-main-menu-ladder.png`)

| what | hex | hsl | rel-lum |
|---|---|---|---|
| background, top | `#4c29be` | (254, 64, 46) | 0.236 |
| background, middle | `#4759c8` | (232, 54, 53) | 0.368 |
| background, lower | `#584ec5` | (245, 51, 54) | 0.350 |
| background, mean of the family | `#4c3cbe` | (247, 52, 49) | 0.085 |
| top HUD bar | `#e9eaf7` | (236, 47, 94) | — |
| PLAY top highlight | `#c4f8b5` | (107, 83, 84) | 0.824 |
| PLAY face | `#63d723` | (99, 72, 49) | 0.512 |
| PLAY lower bevel | `#3ea50f` | (101, 83, 35) | 0.280 |
| ladder pip — completed | `#596793` | (226, 26, 46) | — |
| ladder pip — magenta ("100% clear", owner) | `#8f2599` | (295, 61, 37) | — |
| ladder pip — current, gradient | `#69e420`→`#adf440` | (98,78,51)→(84,89,60) | — |
| ladder pip — locked | `#98affd` | (226, 96, 79) | — |

## Tab backgrounds — each tab is its own colour world

| tab | hex (top) | hsl | frame |
|---|---|---|---|
| STORE | `#2f578f` | (215, 51, 37) | `06-store-tab.png` |
| PLAY (menu) | `#4c29be` | (254, 64, 46) | `08-main-menu-ladder.png` |
| HOLES (skins) | `#d38023` | (32, 71, 49) | `07-holes-tab.png` |

Store section ribbons, from the vertical scan at x=200: DEALS `#2de074` (144,74,53)
green at 17.2–21.8% of screen height; SKIP'ITS `#19d1fb` (191,97,54) cyan at
38.4–43.1%; the deal card itself `#ff9600` (35,100,50) orange; price buttons
`#0cd413` (122,89,44) green.

## Props and light (`10-match-flowers-size1.png`) — the "deep 3d" frame

| what | hex | hsl | rel-lum |
|---|---|---|---|
| bench wood, lit face | `#f3be76` | (34, 84, 71) | 0.573 |
| bench wood, shaded face | `#be8247` | (30, 48, 51) | 0.274 |
| bench metal leg, lit | `#437aaa` | (208, 44, 47) | 0.179 |
| bench metal leg, shaded | `#23557c` | (206, 56, 31) | 0.083 |
| tree canopy, lit | `#147857` | (160, 71, 27) | 0.142 |
| tree canopy, shaded | `#094c43` | (173, 79, 17) | 0.056 |
| pavement, lit | `#e5d7de` | (330, 21, 87) | 0.708 |
| pavement, in shadow | `#a69ec7` | (251, 26, 70) | 0.367 |

The shaded face of a material is never only darker: the tree's shade moves
160°→173° (cooler) and the pavement's shadow moves 330°→251° (violet). Shadows
are hue-shifted, not multiplied.

## The tutorial garden (`04-tutorial-garden.png`)

| what | hex | hsl | share |
|---|---|---|---|
| grass | `#8cc83c` | (86, 56, 51) | 57.8% |
| dark hedge/topiary | `#1a8533` | (134, 67, 31) | 6.1% |
| flower red (bright) | `#fc565c` | (358, 96, 66) | 5.7% |
| flower red (shade) | `#c54050` | (353, 54, 51) | 5.8% |
| flower yellow centre | `#f0de02` | (56, 99, 47) | 1.5% |
| cream path highlight | `#ffebb0` | (45, 99, 84) | 4.5% |

## The splash (`05-splash.png`)

| what | hex | hsl | share |
|---|---|---|---|
| warm cream horizon glow | `#faf6cf` | (54, 82, 90) | 5.8% |
| sky blue | `#3782c6` | (209, 57, 50) | 7.9% |
| warm orange masonry | `#ebb67b` | (32, 74, 70) | 9.1% |
| deep navy (title stroke / shadow) | `#2a1475` | (254, 71, 27) | 4.9% |
| brick red | `#8a2c18` | (11, 71, 32) | 3.9% |
