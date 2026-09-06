# M1 — Timeline and screens (Hole.io, iPhone 16 Pro Max recording)

All frame numbers are the f60 set (`f60/fNNNNN.jpg`, half-res 660x1434; multiply px by 2 for the 1320x2868 original).
**Frame timing (verified):** the f60 set is 60 fps constant: frame N is at t = (N-1)/60 s. Verified by decoding
the source at (N-1)/60 vs (N-1)/59.49 for N=400/900/1500 and comparing with fNNNNN.jpg: MAD 2.9/2.3/4.5 vs 13.1/22.4/7.2.
1547 frames = 25.783 s = the container duration; the source has 1534 frames (pts 16.667 ms apart, 60 fps nominal)
with dropped-frame gaps at t=4.300 s (50 ms), 4.417 s (83 ms), 7.733 s (67 ms), 17.735 s (67 ms) and 25.27-25.36 s;
those gaps are filled with 13 duplicated frames in f60 (zero-diff frames 260-261, 267-270, ~465-467, ~1065-1067).
Durations below are ms at 60 fps (16.667 ms/frame); at the stated 59.49 fps multiply by 1.0086.
H.264 keyframes every 250 source frames (src 0,250,500,...,1500 -> f60 1,251,510,760,1010,1263,1513).

## 1. Screen timeline (per-frame whole-image MAD vs previous frame, `framediff.csv`; confirmed by eye in `mont_cuts*.png`)

| screen | frames | n | ms @60 | how found |
|---|---|---|---|---|
| store tab (idle) | 1-49 | 49 | 817 | per-frame MAD <=0.3 until f50 |
| store->holes tap transition (store content still on screen; HUD pill pops from ~25% to 100%: coin icon w 8,11,18,22,30 half-px at f50-54; nav hole icon grows 90->131 px) | 50-54 | 5 | 83 | MAD 11.7 at f50, then 3.2,1.9,1.5,1.1 |
| holes tab, EMPTY blue panel (grid not drawn yet) | 55 | 1 | 17 | hard cut MAD 77.1; by eye |
| holes tab CLASSIC HOLES grid | 56-101 | 46 | 767 | grid appears f56 (MAD 29.8) |
| special-holes tab EMPTY panel | 102 | 1 | 17 | MAD 35.2; by eye |
| holes tab SPECIAL HOLES grid | 103-127 | 25 | 417 | MAD 36.6 at f103 |
| holes tab CLASSIC HOLES grid (2nd time, drawn immediately) | 128-153 | 26 | 433 | MAD 25.5 at f128 |
| main menu (city, level pills 5-9, SOLO RUN card, PLAY) | 154-205 | 52 | 867 | hard cut MAD 75.1 at f154 |
| LEVEL 7 booster card pop-in | 206-220 | 15 | 250 | card interior width series (`card_popin.csv`) |
| LEVEL 7 booster card static (PLAY/X pop in, then PLAY pressed f249-253) | 221-253 | 33 | 550 | |
| Loading... | 254-270 | 17 | 283 | hard cut MAD 86.0 in, 87.0 out |
| gameplay, idle high camera (joystick drawn, no input) | 271-313 | 43 | 717 | cone scale 1.000, hole static |
| gameplay, touch-down f314 -> camera descent | 314-385 | 72 | 1200 | cone-pair scale, hole width |
| gameplay, settled camera | 386-1514 | 1129 | 18817 | |
| iOS Control Centre (recording stopped) | 1515-1547 | 33 | 550 | MAD 17.6/39.8/26.1/11.6/8.3 at f1515-1519, then <=6 |

First gameplay frame: **f271 (t = 4.500 s)**. Recording end: **f1547 (t = 25.767 s)**. Last clean gameplay frame f1514.
No standalone "main menu" existed before the holes tab — the clip starts on the store tab; the main menu is f154-205 only.

Sub-events measured:
- Holes-tab entrance (f55-72): active tab header bounces: tab top edge y 194 (f55) -> 203 (f63) -> 199 (f70), settled f72 (18 fr, 300 ms). Nav hole icon width 131 (f55) -> 177 (f74) ease-out (from 90 at f49; whole growth 25 fr, 417 ms). Green "+" buttons on the coin/ticket pills pop f67-80 (green px 11 at f67, peak 33 at f72-73, settles 17 by f79).
- Main-menu entrance (f154-177): nav hole icon shrinks 177 -> 90 px over f154-159 (6 fr, 100 ms); HUD coin pill pops with overshoot: coin-yellow px 61 (f154) -> 674 (f164) -> ~510 (f168+) (15 fr, 250 ms); PLAY-button region per-frame diff decays 2.6 -> 0 by f177 (a 23-frame settle, 383 ms; position/size constant 398x73 half-px, so a colour/sheen fade). PLAY tap: pills+PLAY region diff spikes f190-199.
- Backdrop dim before the card: background luminance 43.7 -> 20.6 (-53%) over f200-218; HUD-region 43.0 -> 19.7 over f200-214, ~linear 1.6 lum/frame.
- Card pop-in (cream interior width, half-px): f206 125, 207 265, 208 380, 209 473, 210 537, 211 589, 212 619, 213 636, **214 641 (peak = 110% of final)**, 215 637, 216 627, 217 615, 218 600, 219 589, 220 583 = final. Scale-in with ~10% overshoot; 9 fr to peak, 6 fr settle, 15 fr = 250 ms total. Starts from the screen centre (206: bbox x267-392, y669-824).
- PLAY button on the card: green px 0 (f214) -> 1173 (f215) -> peak 22781 (f223) -> 19587 (f230): 16 fr pop, ~16% area overshoot. X button: orange px 7 (f224) -> peak ~488 (f231) -> 256 (f238): 15 fr pop with large overshoot.
- PLAY press on card: green px 19583 -> 16383 over f249-253 (pressed/dark state), cut to Loading at f254.
- Control Centre: slides in f1515-1519 (5 fr), static f1520, small changes to f1546.

## 2. LEVEL 7 booster card (full-res frame f240 = `full_f00240.png`, crops `card_f00240_*.png`; text read by eye)
Strings, verbatim: **"LEVEL 7"** (title, dark red-brown on cream header) · **"Lv. 9"** and **"Lv. 13"** (dark purple, under the two slot tiles) ·
**"Select Boosters to start with an advantage!"** (two centred lines, red-brown, lower cream panel) · **"PLAY"** (white with dark outline, green pill).
The close button is an orange circle with a dark-orange "x" glyph (no text). Visible behind the dimmed backdrop: HUD "3.75k" (coins), "0" (tickets),
avatar box, gear; "LEVEL 8" badge (top-left); crossed "ADS" badge (top-right); nav labels "STORE", "HOLES". Note the badge says LEVEL 8 while the card says LEVEL 7 and the selected level pill is 7 (8, 9 padlocked).
Slots: two, both LOCKED (padlock icon over a purple-grey booster silhouette); unlock labels Lv. 9 and Lv. 13. No booster names, no third slot, no price.
Buttons: PLAY (green pill x328-998, y1993-2215 full-res = 670x223 px = 50.8% of screen width); X close (orange circle x1124-1229, y754-856, ~105 px = 8% of width, centre (1176,805)).
Background: the main menu dimmed by a dark overlay (-53% luminance); city, HUD, nav bar stay visible.
Geometry (full-res 1320x2868, measured by colour masks on f240): outer card **y 704-2401 = 1698 px = 59.2% of screen height** (top edge at 24.5%, bottom at 83.7%);
x 45-1274 = 1230 px = 93.2% of width. Sections: cream header y727-1011; orange body y1012-1662 with two white tiles (x237-582 and x742-1086, y1098-1544, 345x447 each);
cream lower panel y1663-1992 with a torn-paper edge at the join; blue footer to y2368; darker blue lip y2369-2401.
Colours: frame #6c7ff2 (108,127,245), cream (250,241,224), orange (252,170,95), PLAY green (95,208,18)-(130,226,42), lip (74,91,227).

## 3. Loading screen (f254-270, 17 fr, 283 ms) — STATIC
Drawn: royal-blue background (mean RGB 19,87,205), a stack of objects falling into a hole with vertical light streaks (green tree top, red hydrant, yellow taxi in the hole), small yellow stars, "Loading..." text (white, bold) below. No progress bar.
Animation test: per-frame max pixel change <=25/255 at half-res and <=43 at full res (source frames decoded directly, `loadfull/L01-L15.png`); no pixel changes >30 at half-res in any frame.
Object centroids (full-res): taxi (506.7,1447.2)->(506.3,1447.2), tree (536.2,859.2)->(535.7,859.1), hydrant within 1-2 px — motion < 0.03 px/frame; region luminance 109.00->109.02; "Loading..." text luminance 74.93->74.88.
=> nothing moves, nothing fades, no loop. (The source recorder dropped 6 frames here — 50 + 83 ms gaps at 4.300/4.417 s — consistent with the app stalling while loading; the f60 set fills them with duplicates 260-261 and 267-270.)

## 4. Match opening
Idle phase f271-313 (43 fr, 717 ms): cone-pair scale 1.0000+-0.0002 (141 red cone blobs tracked, `descent_scale_conetrack.csv`), hole interior 22x14 half-px at (329.5,707.5) (row/column dark-run scan, `hole_knob_series.csv`), joystick ring+knob white blob at (326.6,1072.0), 77x77 bbox, unchanged.
Goal scroll (top centre, x150-505, y~264-408 half-px when open): rolled scroll visible by f301 (by eye, `mont_open271-346.png`), unrolls f308-314 (region MAD 17.8-30.2; white-paper x-extent 388->504), open f315-337, rolls up f338-343 (x-extent 485->388->0), gone f344. Timer-driven (starts before any input).
**Touch-down f314**: ring+knob blob jumps from (326.6,1072.0) to (476.2,1013.8) (old-spot MAD 50.0 at f314). Knob deflection begins **f319** (blob centroid 476.4->487.4, new-spot MAD 30.6). **Hole first moves f321** (centre 329.5->330.0->330.5->331.0 at f321-323; ground translation dx +0.2/frame from f321).
**Descent** (cone-pair scale S vs f271; cumulative product of per-frame median pairwise-distance ratios of mutually-matched red blobs):
S = 1.0004 (f315), 1.0016 (316), 1.008 (319), 1.026 (323), 1.091 (330), 1.231 (337), 1.499 (344), 1.898 (350), 2.563 (357), 3.324 (364), 4.008 (371), 4.416 (378), **4.755 (385)**; step rate peaks 4.5%/frame at f351-354, falls below 0.3%/frame at f385.
Window f316-385: **70 frames = 1167 ms**. Thresholds on the same series: 0.1%-99.9%: f318-391 (73 fr, 1217 ms); 1%-99%: f326-389 (63 fr, 1050 ms); 5%-95%: f336-384 (48 fr, 800 ms).
Progress at 10 points (`descent_progress_10pt.csv`), t over f316-385; scale-progress = (S-1)/(S_end-1); height-progress = (1-1/S)/(1-1/S_end) (perspective camera: on-screen scale ∝ 1/height):
t 0.1 f323: S 1.026, scale-p 0.007, height-p 0.032 | 0.2 f330: 1.091, 0.024, 0.105 | 0.3 f337: 1.231, 0.062, 0.238 | 0.4 f344: 1.499, 0.133, 0.422 | 0.5 f350: 1.898, 0.239, 0.599 | 0.6 f357: 2.563, 0.416, 0.772 | 0.7 f364: 3.324, 0.619, 0.885 | 0.8 f371: 4.008, 0.801, 0.950 | 0.9 f378: 4.416, 0.910, 0.980 | 1.0 f385: 4.755, 1.000, 1.000.
Easing (RMS vs the curve): camera-height progress fits **ease-in-out** (ease-in-out-quad 0.063, smootherstep 0.064, sine 0.067, smoothstep 0.069; linear 0.113; ease-out-quad 0.155); ground-scale progress fits ease-in-quad (0.081; linear 0.163). 50% height progress at f347 (t=0.45), 10%/90% at f330/f366.
Second method — hole interior width: 22 half-px (f271-320) -> 23 (f321) -> 25 (330) -> 45 (350) -> 63 (360) -> 82 (370) -> 101 (380) -> 108 (385) -> 107+-2 (386-430). Ratio 4.9 vs cone 4.755 (3% apart; the hole ate its first cone f340-356), end f384-385 in both. Agree.
Hole aspect 22x14 (0.64) -> 108x86 (0.80): the camera also tilts toward top-down (view angle from vertical ~acos(aspect): ~50 deg -> ~37 deg, rough).
Camera start-to-end: ground scale x4.75 => camera distance ends at ~21% of the start distance.
HUD: timer ring scales in f372-383 (yellow px 3,14,158,301,458,766,834,860,902,925,957,992; 12 fr, 200 ms). "Size 1" bar pops in one frame at f369; first "+1" floater pops f356.
**Timer**: digit-region changes (`timer_digit_diff.csv`) at f438,501,563,625,688,750,813,875,937,999,1061,1124,1186,1249,1311,1373,1435,1498; by eye f437->438 = 3:59->3:58, f812->813 = 3:53->3:52, f1434->1436 = 3:43->3:42 (`mont_timer_tick438.png`, `mont_timer_missed.png`). Linear fit frame = 438.33 + 62.33 k (residuals <= 0.6 fr): **tick period 62.33 fr = 1.039 s @60 fps (1.048 s @59.49)**. Extrapolated: 4:00->3:59 at f376.0 (during the HUD scale-in; "4:00" readable f371-374, "3:59" from f377-378 by eye, `mont_timer.png`); 4:00 start at f313.7 = the touch-down frame. So the timer does NOT run in the idle phase f271-313; it starts with the first touch and runs through the descent (3:59 appears at f376 while S = 4.33 of 4.755). The HUD is off screen f271-371, so the display cannot be read during most of the descent; the phase is inferred from the later ticks.
Joystick first appears: f271 (the first gameplay frame), ring bbox 77x77 half-px (ring diameter ~154 full-px) at (326.6,1072.0), knob concentric (no deflection). Not distinguishable whether a finger was already down or this is a default idle joystick.

## 5. Menu motion when the player is not scrolling
Store f1-49: no scroll (row-profile cross-correlation shift 0 px for all 49 frames). Whole-frame per-frame MAD 0.0-0.3. One idle animation: the white 4-point sparkle at the ADS banner's top-left twinkles (scale pulse) — white px 261 (f1) -> 305 (f24) -> 218 (f49); half-period >= 25 fr; full period not measurable in 49 frames (>= ~60 fr). Sunburst rays behind the ADS logo: no rotation >= 0.25 deg over 49 frames (angular-profile correlation). Nav STORE icon static (centroid (74.5,1384.0) all frames). No shine sweeps (10000-pack bright-px centroid 525.4-525.5 all frames). HUD "+" buttons: green px 25 -> 16 over f1-11 then constant (tail of a pop that began before the clip).
Holes tab: after the entrance settles (f72) all regions <= 0.3 MAD/frame for f73-101, 104-127, 129-153 — nothing periodic; the FREE button does not pulse (bright px 1306 constant f87-101).
Main menu f162-199: the city scene drifts slowly with parallax (sub-pixel template tracking vs f162, `menu_diff_f162_f199_x3.png`): helipad on the tallest tower +6.0 px x / -1.0 y over 37 fr (0.16 px/frame half-res); left tower edge -2.0/-3.5; right building +2.0/+3.0; right cloud +3.0/+3.5; island base, SOLO RUN card, PLAY button, HUD: 0.0. Not a 2D rotation (best fit 0.1 deg, MAD 11.17 -> 10.85), translation or scale (all worse than identity) — consistent with a slow 3D camera orbit/turntable. Motion accelerates over the window (helipad +2 px by f180, +6 by f199); period/reversal not measurable in 46 frames. Helicopter rotor: no resolvable rotation beyond the drift.
Loading screen: static (section 3). Booster card f221-248: static (cream px constant 178930+-10).

## Files
framediff.csv (whole-frame MAD per frame), timeline.csv, card_popin.csv, descent_scale_conetrack.csv, hole_knob_series.csv, descent_progress_10pt.csv, timer_digit_diff.csv, src_pts.txt, src_frametypes.txt, menu_cells.npy, scripts diff.py / conetrack.py / descent.py; evidence frames in frames/ (named by frame number), full-res full_f*.png, crops and montages mont_*.png / crop_*.png / *_diff_*.png.
