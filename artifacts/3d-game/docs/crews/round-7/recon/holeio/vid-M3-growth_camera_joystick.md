# M3 — GROWTH, CAMERA AND JOYSTICK (Hole.io, iPhone 16 Pro Max clip, 1320x2868 @ 60 fps CFR, f60 numbering)

All pixel values are ORIGINAL px (full-res decode of recording.mp4 with `-vf fps=60`, verified to reproduce the f60 numbering
frame-for-frame: 1547 frames, residual vs f60 JPEGs 2-3 grey levels). Frame times in the CSVs use the task convention
t=(N-1)/59.49; NOTE the f60 set is a 60 fps constant-frame-rate expansion of a 59.49 fps-average stream (13 duplicated frames),
so wall-clock durations are frames/60 (0.85 % shorter than the 59.49 convention). Both are given below.

Files produced by this session (others in this directory with 01:5x timestamps belong to an earlier session and are not mine):
diam.csv, sizeup.csv, flow_zoom.csv, joystick.csv, plot_diam_series.png, plot_sizeup_zoom.png, plot_camera_follow.png,
plot_joystick.png, sizeup_montage_f784-840.png, hole_annot_f00381/00400/01000.png, joystick_montage_*.png,
joystick_f271_f314_f1474_halfscale.png, bollard_caps_f00770/00860/01000.png, full/ (full-res evidence frames by number),
tmp/pass.py (the single-pass measurement script), tmp/su/ (full-res frames 750-920).

## 1. Hole interior diameter, every frame f381-1430  (diam.csv)
Method: per full-res frame, black mask = max(r,g,b) < 60; connected components (cv2) below the HUD (y>=520); the component nearest
the previous hole centre (+ components whose bbox touches it) = interior. `diameter_px` = widest row's extent (last black − first black + 1),
`run_px` = longest CONTIGUOUS black run on that row (the task's definition; it collapses when a cone/lamp stands inside the hole),
`centre_x` = midpoint of that row's extent, `centre_y` = that row. Also: vext (vertical black extent at centre_x), bbox, and the blue-rim
ellipse (cv2.fitEllipse on the largest blue component, b>195 & r<160 & 120<g<220) as rim_cx/cy/w/h. Flags: interior_occluded
(run < extent−4; 209 frames), edge_occluded (extent < 0.93×rolling median; 70 frames), 763 clean frames.
First stable frame = f381 (first frame with extent >= 98 % of the f400-500 median for 10 consecutive frames; camera descent ends f384-385 per M1).

Steady values (clean frames): Size 1, f386-784: median 294 px (p5 292, p95 295, n=271). Size 2, f826-1430: median 412 px (p5 409, p95 416, n=463).
Interior ellipse aspect vext/extent: 0.635 (Size 1) -> 0.689 (Size 2).
Second method (least-squares ellipse fit to the black blob contour, cv2.fitEllipse, 20 frames): horizontal width 283-286 px (f400,760,770,782-784)
vs extent 292-294; 400-414 px (f830-840,860,1000,1400) vs extent 410-416. Agree within 3 % (the fit hugs the boundary, the extent is the extreme pixel).

Sampled every 30 frames (frame, t59.49, extent px, run px, cx, cy, vext, flag):
381 6.388 288 288 689.5 1398 183 | 411 6.892 293 293 628.0 1404 186 | 441 7.396 293 293 650.0 1396 186 | 471 7.900 292 292 665.5 1398 186
501 8.405 262 55 694.5 1368 186 OCC | 531 8.909 294 294 712.5 1414 184 | 561 9.413 294 294 712.5 1416 188 | 591 9.918 294 294 710.5 1416 188
621 10.422 294 294 706.5 1408 188 | 651 10.926 294 133 706.5 1410 86 OCC | 681 11.430 294 294 706.5 1413 188 | 711 11.935 292 95 671.5 1400 212 OCC
741 12.439 239 239 698.0 1436 192 (edge occluded) | 771 12.943 294 294 714.5 1415 141 | 801 13.448 534 221 713.5 1424 367 OCC (size-up peak, lamp inside)
831 13.952 416 416 705.5 1422 285 | 861 14.456 409 409 659.0 1410 283 | 891 14.960 406 406 670.5 1445 286 | 921 15.465 418 260 728.5 1472 295 OCC
951 15.969 413 411 717.0 1431 284 | 981 16.473 412 244 707.5 1418 284 OCC | 1011 16.978 412 210 705.5 1416 284 OCC | 1041 17.482 410 410 704.5 1410 283
1071 17.986 412 290 699.5 1421 284 OCC | 1101 18.491 410 410 638.5 1411 282 | 1131 18.995 412 412 607.5 1424 284 | 1161 19.499 411 411 616.0 1416 266
1191 20.003 408 408 665.5 1401 281 | 1221 20.508 410 410 684.5 1408 283 | 1251 21.012 412 412 709.5 1418 284 | 1281 21.516 412 412 711.5 1426 284
1311 22.021 412 412 713.5 1428 284 | 1341 22.525 412 412 715.5 1420 286 | 1371 23.029 412 412 719.5 1427 286 | 1401 23.533 414 414 728.5 1440 290

## 2. The size-up step (sizeup.csv, sizeup_montage_f784-840.png, plot_sizeup_zoom.png)
Trigger frame f785 (t 13.178 s @59.49 conv.; 13.067 s @60): on this one frame the label switches "Size 1"->"Size 2" (by eye, f784 vs f785,
label_783_788 montage), the size bar's yellow fill drops from 17.3-17.6k yellow px (f770-784) to 0 (f785-799; a 13-px "pill" reappears by f810),
and the interior extent jumps 294 -> 336. Gold "Size 2" pop-up text visible from f787 (by eye).
Screen interior extent per frame: 784:294 | 785:336 786:354 787:370 788:384 789:398 790:416 791:434 792:454 793:468 794:488 795:502 796:516
797:527 798:534 799:538 800:538 | 801:534 802:528 803:522 804:512 805:504 806:487 807:481 808:470 809:459 810:448 811:438 812:428 813:420
814:416 815:412 816:411 817:411 818:414 819:416 820:418 821-823:421 (824-825 edge-occluded) 826:418 827-833:416-417 834-840:412-414.
=> before 294, after 412-416 (median 415 over f826-840, 412 over f840-999); net screen ratio 1.401.
Rise 785-799 = 15 fr (250 ms @60 / 252 ms @59.49); fall 800-815 = 16 fr (267 ms); settled (within 1 %) from f826 = 41 fr after trigger (683 ms).
Peak 538 px at f799-800 = +102 % of the net step above the final value (i.e. the screen diameter momentarily reaches ~2x the eventual step).
Shape of the rise (normalised 784->799): ease-out 1-(1-x)^k with T=15.2 fr, k=1.47, rms 0.027; linear ramp rms 0.042; smoothstep rms 0.092.
The whole screen curve is NOT a damped spring (best spring fit rms 0.24): the hump is the product of a fast world-size step and a slower camera
zoom-out (section 4). World-size estimate = extent / cumulative zoom (flow method): 294 -> 339 (785) 436 (790) 572 (795) 670 (800) 684 (805, +2 %)
662 (808) 620 (815, −15 % of the step, dip) 646 (820) 665 (826) 675 (830-880). World step ratio 2.30 with the flow zoom (1.64) or 2.16 with the
bollard zoom (1.54); world 50 % at f792 (7 fr), 90 % at f797 (12 fr), reached at f800 (15 fr, 250 ms). The f810-820 dip is within the zoom-estimate
uncertainty (section 4) and should not be reproduced literally; treat the world size as an ease-out step of ~15 fr with <= 2-4 % overshoot.

## 3. Camera follow (diam.csv, plot_camera_follow.png)
Hole centre on screen (extent method, 821 clean frames with flow, f386-1430): mean (691.9, 1416.9), sd (37.9, 17.2), x 573-828, y 1328-1492,
max deviation from the mean 136 px (x) and 90 px (y). Screen centre is (660, 1434). NOT pinned.
Travel velocity v = −(ground displacement at the hole centre) from the frame-to-frame homography (LK optical flow on 1500 corners outside the
hole/HUD/joystick masks, RANSAC, median 207 inliers). Regression on 5-frame-smoothed v:
  centre_x = 4.38 × vx + 661.2 (r = 0.83);  centre_y = 4.23 × vy + 1451.3 (r = 0.74)   [vx +right, vy +down, px/frame]
  rim-ellipse centre (2nd method): x = 4.34 × vx + 660.8 (r = 0.885); y = 3.73 × vy + 1416.0 (r = 0.67)
  after the size-up only (f840-1430): x slope 4.53 (r = 0.977), y slope 4.43 (r = 0.88); before (f386-780): 4.11 / 3.42 (r 0.64 / 0.61, more occlusion).
  Lag scan: correlation peaks at lag 0-2 frames.
=> The hole leads the camera anchor in its travel direction by ~4.4 frames of velocity (73 ms @60 fps; ~57 px at the usual 13 px/fr),
   i.e. a first-order camera lag with time constant ~4.4 frames. Zero-velocity anchor = (661, 1451) for the interior's widest row (= screen
   centre x; 17 px below centre y) and (661, 1416) for the rim-ellipse centre. Travel was mostly up-screen (vy −48..+3, vx −12..+19).

## 4. Camera zoom at the size-up (flow_zoom.csv, bollard_caps_f*.png, tmp/su/)
Ratio, method A (ground objects at the same screen position; identification by eye, sizes by red-mask component bbox): bollard cap widths
105-107 px (f770 caps at (1084,912),(803,1120); f775 (1030,942); f780 (977,974); f784 (933,1001)) -> 67-71 px (f860 (1147,1024),(953,1177);
f1000 (1069,973),(1245,840),(877,1119); f840, f850): 106/69 = 1.54. Bollard heights cap-top to base-bottom 305-310 (f760-784) -> 196-200
(f860, f1000): 1.56. Bollard base widths 143-150 -> 94-100: 1.50.  => zoom-out ratio 1.54 (ground features shrink to 0.65x).
Ratio, method B (integrated per-frame local scale of the ground homography at the hole centre, corrected for the perspective/motion bias fitted on
steady frames ln s = −2.8e-5·dx + 5.2e-4·dy − 1.2e-3): 0.608 => 1.64. Methods disagree by 6 %; A is direct, B accumulates ~50 per-frame estimates
through the flash/burst frames, so quote 1.54 (1.50-1.64).
Timing (method B curve, first sign −0.8 % at f785 vs noise sd 0.23 %): 5 % f788, 25 % f794, 50 % f800, 75 % f809, 90 % f820, 95 % f827 =>
~42 frames (700 ms @60 / 706 ms @59.49). The zoom starts on the SAME frame as the diameter step (f785, ±1) but is ~3x slower than the world-size
growth (world 90 % at f797 vs zoom 90 % at f820). Cross-check: a bollard cap entering at f804 shrinks 112->104 px over f804-809 and the cap of the
standing bollard right of the hole goes 78 (f805) 74 (810) 72 (815) 70 (820) 69 (825-830) — still zooming through f825.
Screen-diameter ratio 1.40 = world ratio (2.16-2.30) / zoom (1.54-1.64). Joystick ring radius stays 165 px through the zoom (UI unaffected).

## 5. Joystick (joystick.csv, joystick_montage_*.png, joystick_f271_f314_f1474_halfscale.png, plot_joystick.png)
Detection: knob = Hough circle r 70-100 px validated as near-white (mean RGB > 195, sat < 25, sd < 18), template match as fallback; base = Hough
circle r 150-185 within 235 px of the knob (annulus template on the high-passed image as a second detector; both agree to ±3 px).
- First appearance f271 (first gameplay frame; t 4.539 s conv / 4.500 s @60): idle default joystick, base (658-660, 2146-2150) = screen-centre x,
  74.9 % of screen height; knob concentric (d = 1-8 px). Ring radius 165 px (Hough median 165, p10 160, p90 169; annulus 164-166); knob radius ~84 px.
- Touch-down f314: base re-placed at (958, 2032), 320 px from the default, knob concentric (d = 7) -> FLOATING (base placed under the finger).
  Knob deflection ramps f320 (41 px) -> f338 (174 px).
- The base is also DRAGGED (follow joystick): over the single touch episode f314-1473 (1160 fr, 19.3 s) the base centre moved from (956,2032) to
  (1106,1428), bbox x 926-1146, y 1106-2032; in 28 % of 10-frame windows it moved > 12 px, always along the knob direction (base-motion angle −
  knob angle: median 0.4°, MAD 4.5°), while 27 % of windows were static at full deflection. Moving runs: f331-363, 376-399, 483-515, 688-711,
  730-765, 776-789, 851-871, 889-906, 957-969, 1087-1108, 1211-1234, 1431-1473 (plus short ones).
- Release f1474: joystick snaps back to the default (658,2150), knob concentric, in ONE frame (no tween). Hole decelerates: speed 12.2 (f1473)
  13.2 (1474) 5.2 (1475) 3.1 (1476) 2.4 (1480) 1.6 (1490) 0.8 (1500) px/fr — sharp drop then slow tail (halving every ~12 fr).
- Disappears: never during gameplay; last clean gameplay frame f1514 (Control Centre from ~f1525). Only ONE touch episode exists in the clip,
  so "two touches compared" is not available; floating is shown by default->touch placement (320 px) and by base dragging.
- Max knob travel from base centre: 172.7 ± 3.7 px (mean at full deflection, median 173.2, p99 178.5, max 181; 94.5 % of episode frames
  are at > 150 px) => clamp radius ≈ 173 px = ring radius 165 + 8.
- Speed vs knob displacement: NOT proportional in the observable range. After the descent the knob leaves the clamp only during two reversals
  (f722-732, f883-891). Speed by deflection bin (px/fr, ground motion at the hole): 60-120 px: 12.8 (n=7); 120-150: 11.3 (n=6); 150-165: 13.6
  (n=55); 165-172: 14.0 (n=266); 172-178: 13.2 (n=653). Sampled moments (frame, knob dist px, knob angle, speed px/fr, travel angle):
    f400  176.8  −119°  11.87  −115°   (full, Size 1)
    f600  174.3   −49°  14.51   −40°   (full, Size 1)
    f725  108.7   −63°  12.78  −105°   (knob crossing the centre in a reversal: speed unchanged)
    f886   79.7   −70°  13.40  −141°   (same, second reversal)
    f889  146.3   −12°   9.82  −109°   (speed dips 3-6 frames AFTER the reversal while the direction swings: f731-732 5.5-7.8, f890-892 6.6-7.8)
    f1000 176.3   −51°  13.76   −42°   (full, Size 2)
  The ramp f320-338 (deflection 41->174 px, speed 0.3->1.1 px/fr) is confounded by the camera descent (scale x4.75, M1) — not usable.
- Steering: the travel direction follows the knob's SCREEN direction (no axis rotation) with a lag of 5 frames (cross-correlation of unit vectors
  peaks at lag 5, mean cos 0.991 vs 0.973 at lag 0; residual offset median +6°, sd 6.6°).
- Speed at full deflection: median 12.7 px/fr (f386-780, Size 1) and 13.6 px/fr (f840-1473, Size 2) on screen; in ground units (x1.54 after the
  zoom) the Size 2 hole travels ~1.65x faster, so the screen speed stays nearly constant (+7 %).
