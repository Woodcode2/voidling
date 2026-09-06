# M2 — raw measurer return (verbatim JSON)

Landed 2026-09-06 from workflow wf_1d8d7f37-7dc. Folded into holeio.recon.md §11.

```json
{
 "findings": [
  {
   "claim": "Eat events f357-1430: 19 cones, 4 lamp posts and 2 people swallowed; 1 lamp post (f1190-1236) tilted but NOT swallowed (no XP step). Full table with rim-contact / first-interior / last-visible / gone / XP frames in M2_swallow_floaters_sizeup.md section 1.1",
   "value": "19 cones + 4 lamps + 2 people = 25 eats",
   "unit": "count",
   "frames": "C1 545-561, C2 577-592, C3 605-620, L1 472-540, L2 644-670, C4 690-704, P1 707-716, C5 738-755, C6 768-785, C7 786-806, L3 ~816-834, C8 ~841-857, P2 869-883, C9 913-932, C10 ~928-944, C11 946-963, L4 974-992, C12 1003-1019, C13 1023-1038, C14 1044-1058, C15 1062-1077, C16 1104-1117, C17 1125-1139, C18 1144-1159, C19 1160-1176; L5 1190-1236 not eaten",
   "method": "runs of non-dark pixels inside the interior ellipse (track.py fAll>1200, events.py), split with conesink.py red-inside-interior counts and confirmed by the size-bar XP step frames (bar_n yellow-pixel area jumps); L3 by eye (tracker ellipse stale during the zoom)"
  },
  {
   "claim": "Cone eat duration from the first red pixel over the interior to the last visible pixel is 15-17 frames in both hole sizes; XP is granted 0-4 frames after the last pixel; the +1 floater pops 1-4 frames after the XP step",
   "value": "15-17 (252-286 ms); XP lag +2/+4/+3/+4/0; floater lag +1..+4",
   "unit": "frames (ms)",
   "frames": "C1 545-560 (XP 562, +1 at 563); C2 577-591 (595, 596); C3 605-619 (622, 623); C5 738-754 (758, 759); C12 1003-1018 (1018, 1019); Size-2 cones C13-C19 13-16 fr",
   "method": "method A: fAll>1200 run (track.py); method B: conesink.py n_red_inner>0 run gives 16-18 (agrees within 1-2 fr = threshold); XP from bar_n step; floater first frame from NCC tracks"
  },
  {
   "claim": "A cone SINKS: it is dragged toward the hole centre (no rotation, principal-axis angle constant at its resting -22..-27 deg) and then drops straight down, clipped by the near rim, with the top descending 50-58 px/frame; cap width and stripe-to-top distance unchanged (no scale, no rotation); the drop takes 6 frames",
   "value": "top_rel -127,-119,-67.5,-12.5,+46,gone (C2 f587-592); cap width 83-88 px constant; stripe-to-top 112-114 px constant; drop 6 fr = 101 ms",
   "unit": "px per frame / frames",
   "frames": "C2 f572-592 (C1 f544-561: -143.5,-95.5,-46,-37.5,+16.5,+72.5 over 555-560; C3 f602-620: -167.5,-117.5,-65.5,-10.5,-2,+56 over 614-619)",
   "method": "conesink.py: union of red pixels inside the outer rim ellipse(+25 px) per frame: top/bottom y relative to the interior centre, max row width in the top 22 rows, white-stripe centroid; objtrack.py PCA angle of the red blob"
  },
  {
   "claim": "No burst, ring or particle on a cone, lamp or person eat, and the rim does not react (outer ellipse unchanged to <=1 px)",
   "value": "rim during C2 382.9x297.7 vs pre 383.0x297.9 vs post 382.5x297.5; during C12 (Size 2) 530.1x413.9 vs 529.5x414.4 / 529.1x413.5; white px inside the rim region 0-250 (knob baseline) on all cone eats",
   "unit": "px (outer rim width x height)",
   "frames": "pre 562-574, during 575-592, post 593-601; C3 602-620; C12 1003-1019; lamp/person post-frames 671-690, 884-895, 993-1002",
   "method": "rimfit.py 72-ray outer-rim ellipse least squares (rms 0.8-1.4 px on these frames); fW in track.py; by eye on ev_cone_f545/ and ev_lamp_f473/"
  },
  {
   "claim": "Lamp post 1 TIPS OVER as it is eaten: the blue-mask principal angle goes from ~0 to -62 deg in 14 frames (accelerating 2-6 deg/frame), it lies across the near rim for ~8 frames, then slides in base-first; total 69 frames",
   "value": "angle -5.4 (f488), -14.2, -19.0, -25.0, -26.8, -29.6, -32.2, -40.0, -43.1, -45.3, -44.8, -47.9, -52.6, -55.8, -61.7 (f502); base contact f471, gone f540 = 69 fr / 1160 ms",
   "unit": "degrees from vertical / frames",
   "frames": "f455-540 (tip-over f488-502, lying f502-510, sliding in f510-539)",
   "method": "objtrack.py lamp: rim-blue mask minus the rim annulus, PCA principal-axis angle; fB (blue inside the interior) series from track.py; ev_lamp_f473/ every frame"
  },
  {
   "claim": "Lamp post 2 falls to horizontal in 6 frames and sinks head-last (26 frames); lamp post 4 tilts +20 deg in 2 frames then sinks head-last (18 frames); lamp post 5 with its base only partly over the rim tilts and is left behind, not eaten (rigid-body behaviour)",
   "value": "L2 angle 5.5 (f657), 31.9, 74.1, 81.6, 87.8, 87.1 (f663) then 61.6, 60.7, 50.0, 40.3, 21.8 (f665-669), gone f670 = 26 fr / 437 ms; L4 -20 -> -30 (f982) -> -40.6 (f983) ... -39.1 (f991), gone f992 = 18 fr / 303 ms; L5 no XP step, bar 12021 px unchanged f1250-1370",
   "unit": "degrees / frames",
   "frames": "L2 f644-670, L4 f974-992, L5 f1190-1236",
   "method": "objtrack.py lamp PCA angle (obj_lamp644.csv, obj_lamp974.csv), fB series, bar_n; L5 tilt by eye (evidence/lamp5_notEaten_f1200-1256_half_4fr.png)"
  },
  {
   "claim": "People are swallowed fastest: person 1 is inside for 9 frames, person 2 for 14; they drop in lying flat (ragdoll) and visibly spin about the vertical axis (by eye)",
   "value": "P1 9 fr / 151 ms (f707-715, XP f716); P2 14 fr / 235 ms (f869-882, XP f880)",
   "unit": "frames (ms)",
   "frames": "P1 705-716, P2 869-883",
   "method": "fAll/fO series (track.py), bar_n XP step; rotation by eye on evidence/person1_f640-725 and person2_f864-884 (person-mask angle series too noisy to quote)"
  },
  {
   "claim": "XP ledger from the size bar: every object = 1 XP regardless of type; Size 1 bar fills ~2000 px (11.5 %) per eat, is full at 9 and the 10th eat (C6, f785) triggers the size-up; Size 2 fills 715-851 px (4.1-4.9 %) per eat (~22 XP to Size 3); the fill jumps in one frame (no tween)",
   "value": "Size-1 steps +2040,+1961,+2088,+2029,+2005,+1903,+1853 px; Size-2 steps +402(f806, partial),+573,+515,+686,+839,+780,+758,+788,+779,+809,+851,+835,+740,+724,+747,+715; jump f561 2990 -> f562 5036",
   "unit": "yellow-fill px area (bar 360x48 = 17458 px full)",
   "frames": "steps at f369, ~513-536, 562, 595, 622, 674, 707, 716, 758, [785 reset], 806, 833, 857, 880, 932, 943, 962, 994, 1018, 1037, 1058, 1078, 1117, 1139, 1159, 1175",
   "method": "track.py bar_n: count of (r>210,g>150,b<90) pixels in the band 60-260 px below the interior, 5-frame-median step detection (foreign_series.csv)"
  },
  {
   "claim": "'+1' floater appearance: white fill with a ~4-5 px dark-grey outline, glyph height 49 px (57 with outline), width 62/70 px, heavy rounded sans; it pops in at full size and full opacity in ONE frame (no scale-in) and never changes size",
   "value": "49x62 px white / 57x70 px with outline; outline darkest (80,73,81); pre-spawn NCC 0.27-0.37 at scales 0.3-1.1 vs 0.71-0.91 at scale 1.0 on the first frame; best scale 1.0 on 100 % of 1169 detections",
   "unit": "px (original)",
   "frames": "f560 (template), first frames f623, 717, 944, 963, 1019 and the 1-frame crops f558-572",
   "method": "pixel thresholds on f560 (min(rgb)>225 white, max<150 outline); cv2 TM_CCOEFF_NORMED at scales 0.6-1.2 (floaters_global.py), pop-in check at 0.3-1.1 in frames first-3..first-1"
  },
  {
   "claim": "Floater spawn point: ~0.45 x rim outer width above the rim centre (about 20 px above the far rim edge), scaling with the hole; x jitter about +-100 px, y jitter +-40 px; no relation to where the object sank",
   "value": "Size 1 dy median -168 (range -157..-199), dx -104..+8 with rim 382 px; Size 2 dy median -240 (-208..-298), dx -104..+50 with rim 531 px",
   "unit": "px relative to the rim-ellipse centre (+y down)",
   "frames": "Size 1 tracks first frames 533, 563, 623, 675, 712, 717, 759; Size 2 tracks 810-1176 (16 tracks)",
   "method": "floaters_global.py first detection minus the rim centre from track.py (floaters_tracks_summary.csv spawn_rel_rim)"
  },
  {
   "claim": "Floater motion is screen-space: dx = 0.00 px/frame while the ground moves 2-13 px/frame; it rises 66 px total with a strong ease-out (12-13 px in the first frame, ~1 px/frame by n=20, ~0.3 by n=50); the rise is the same 60-66 px at Size 1 and Size 2",
   "value": "rise px at n frames after spawn: 1:12.7, 2:18.0, 3:22.0, 4:25.2, 5:28.2, 7:32.3, 10:38.0, 15:44.2, 20:49.2, 25:53.2, 30:56.2, 40:61.2, 50:64.2, 59:66.3 (mean of 6 tracks); ~ 12 + 12 ln(n) within 3 px",
   "unit": "px (original)",
   "frames": "T3 623-682, T7 717-776, T11 834-892, T15 963-1016, T17 1019-1068, T24 1176-1235; ground motion from M3 flow2.csv dxA/dyA",
   "method": "NCC track centres per frame (floaters_tracks_series.csv), floater_curve_mean.csv"
  },
  {
   "claim": "Floater alpha: ~10-frame hold at 1.0 then a linear fade of ~0.019/frame to 0; lifetime 60 +-1 frames = 1009 ms",
   "value": "alpha at n: 0-7: 0.96-1.00, 10: 0.94, 12: 0.90, 15: 0.87, 20: 0.81, 25: 0.71, 30: 0.63, 35: 0.53, 40: 0.44, 45: 0.35, 50: 0.25, 55: 0.14, 59: 0.03",
   "unit": "alpha (gain/1.37) vs frames since spawn",
   "frames": "same 6 clean tracks; all four unmerged full-length tracks end on frame 59-60 (623-682, 717-776, 834-892, 1176-1235)",
   "method": "least-squares slope of the matched patch on the opaque template (gain), normalised by 1.37 = mean gain of the first 5 frames across all tracks; the f560 template instance was at 0.73"
  },
  {
   "claim": "Two floaters close together ('+1 +1'): each is an independent instance at its own spawn point \u2014 no stacking, no offset logic, no merge into '+2'; the older one has already risen and faded so they read as a diagonal pair; when the spawn points coincide the new one simply draws over the old",
   "value": "f563: old (653,1175) alpha 0.66 vs new (711,1241) -> 58 px right, 66 px lower; f1160: old (610,1069) vs new (612,1160) -> 91 px lower; f596 and f881: gain jumps 0.84->1.28 and 1.06->1.25 at the same screen position",
   "unit": "px (original)",
   "frames": "f533/f563/f596 (contact sheet 9-10 s), f858/f881, f1140/f1160; 1-frame crops evidence/floaters_f558-572_fullres_1fr.png",
   "method": "NCC track positions and gains at the second spawn frame (floaters_tracks_series.csv)"
  },
  {
   "claim": "Size-up trigger frame is f785 (the frame the 10th object is gone): in that single frame the bar empties and reads 'Size 2' and the rim starts growing; the glow disk appears at f786, the gold label and the arrow burst at f787; rim peaks f799; settled f815; label gone f832; disk gone f838",
   "value": "f785 bar 17289->0 px + 'Size 2' text; rim 383.1 -> 435.5 (fit) / 377 -> 427 (scan); f786 ring partial (lum 222.6 vs 219 ground); f787 gold px 0 -> 11636; whole effect f785-838 = 54 fr / 908 ms",
   "unit": "frame",
   "frames": "784-838",
   "method": "bar_n (track.py), text by eye on sizebar_f783-787_fullres.png, rimfit.py + track.py rim scans, sizeup.py gold-mask count and ring radial scans, label crops by eye (nothing at f786, full label at f787)"
  },
  {
   "claim": "'Size 2' label: gold gradient (#f9e256 -> #eeb32c) with a dark orange-brown (#832e17) outline, 290 x 89 px, centred on the hole, screen-fixed in x; NO scale-in, NO overshoot (bbox identical to the pixel on all 29 frames); rises 101 px with an ease-out, holds 27 frames fully opaque, then fades linearly over 17 frames",
   "value": "bbox x 571-860 constant f787-815, h 88-90; top y 1129 (f787), 1105, 1095, 1090, 1082, 1080, 1075, 1069, 1068, 1063, 1060, 1059, 1056, 1054, 1051, 1049, 1047, 1045, 1043 (f805) ... 1028 (f815); alpha 1.0 f787-813, 0.87 (815), 0.75 (817), 0.63 (818), 0.56 (823), 0.47 (825), 0.36 (827), 0.23 (829), 0.09 (831), 0.02 (832)",
   "unit": "px / alpha",
   "frames": "787-832",
   "method": "sizeup.py gold mask (r>180,g>120,b<130,r-b>90,r-g<80) bbox per frame; sizeup2.py label alpha = mean (r-b) over the 312x96 label box minus ground, normalised by the plateau 108; colours from find.py clusters at f800"
  },
  {
   "claim": "Size-up glow ring is a soft white disk (white near the rim, cream #fcfceb toward the edge) drawn on the ground around the hole; its outer radius grows from 249 to ~420 px (17 -> 155 px beyond the rim) with an ease-out over f787-815 while the rim overshoots, stays opaque to ~f813, then fades linearly to the ground level over f814-838",
   "value": "radius (left side) 249 (f787), 271, 291, 307, 322 (791), 358 (794), 380 (797), 399 (800), 414 (804), 417 (805), 420 (810-812), 418 (814), 409 (816-821), then 382, 362, 342, 318, 291, 282 (831), gone 832; annulus brightness 224 (787), 246 (789), 250-253 (790-812), 248 (816-820), 243 (823), 239 (826), 235 (828), 232 (830), 227 (832), 224 (834), 221 (836), 219.5 (838) = ground 219",
   "unit": "px from the rim centre / mean RGB",
   "frames": "786-838",
   "method": "sizeup.py: 16 radial scans of the ring mask (min>175, r>225, g>225) from the rim centre starting just outside the rim, median over angles 135-225 deg (away from the joystick); sizeup2.py mean lum of the annulus 15-60 px outside the rim"
  },
  {
   "claim": "Size-up arrow burst: 6-8 pale up-arrows/chevrons (white with a light-blue tint over the interior, #c1e6fa/#cdf7fc), each ~70-90 px wide, rise out of the far rim from f787, reach the label height (~200 px) by f795-800 and fade out by ~f806-810 (~20 px/frame then slowing); plus 3-5 small sparkle stars at the disk edge f790-806",
   "value": "visible f787-~810 = ~23 fr / 390 ms; pale-pixel excess inside the rim region peaks 8500-10200 px f793-800 over a ~3000 px knob baseline, back to baseline f806",
   "unit": "frames / px",
   "frames": "787-810",
   "method": "by eye on evidence/sizeup_label_crops_f784-836.png and ev_sizeup_f785/ (every frame); sizeup2.py arrows_n (min(rgb)>170 inside the outer ellipse, red/gold-dilated exclusions) for timing only"
  },
  {
   "claim": "Rim on screen through the size-up: 383 -> 704 px peak at f799 (+84 %) -> 531 px settled at f815 (+39 %), 14 frames up, 16 frames back, small +9 px bump f821-824 (world growth + camera zoom-out; decomposition is M3's)",
   "value": "outer width 383 (784), 435 (785), 458, 479, 499, 516, 537 (790), 563, 589, 611, 636, 655, 670, 686, 698, 704 (799), 702, 698, 690, 680, 666, 653 (805), 638, 624, 607, 592, 578 (810), 564, 553, 531 (815), 530 (818), 537 (821), 540 (824), 535 (830), 531 (845+); height 299 -> 522 -> 414",
   "unit": "px (outer rim ellipse)",
   "frames": "784-848",
   "method": "rimfit.py 72-ray ellipse fit (rimA.csv; row/column-scan method in trkB.csv agrees to within 5-10 px except where a cone sits on the widest row)"
  },
  {
   "claim": "Hole rim geometry (for scale): Size 1 outer ellipse 382.6 x 297.5 px, stable to +-1 px f390-784; Size 2 531 x 414 px f830-1440; interior dark ellipse 288 x 183 (Size 1)",
   "value": "382.6 x 297.5 (min-max 381-384 x 296-299) -> 531 x 414 (529-535 x 411-417); ratio 1.39",
   "unit": "px (original)",
   "frames": "390-784 and 830-1440",
   "method": "rimfit.py medians (second method: track.py row/column scans 375 x 299 and 525 x 415; M3 diam.csv interior 288 px)"
  }
 ],
 "evidence_files": [
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M2/M2_swallow_floaters_sizeup.md",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M2/ev_cone_f545/contact_f00528-f00562.jpg",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M2/ev_cone_f545/",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M2/ev_lamp_f473/contact_f00452-f00540.jpg",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M2/ev_lamp_f473/",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M2/ev_sizeup_f785/contact_f00776-f00848.jpg",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M2/ev_sizeup_f785/",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M2/evidence/floaters_f558-572_fullres_1fr.png",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M2/evidence/floaters_f520-600_fullres_4fr.png",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M2/evidence/floater_f560_4x.png",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M2/plus1_template_f00560.png",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M2/evidence/sizeup_label_crops_f784-836.png",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M2/evidence/sizeup_f780-848_half_2fr.png",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M2/evidence/sizebar_f783-787_fullres.png",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M2/evidence/lamp1_f455-510_half_3fr.png",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M2/evidence/lamp1_f480-540_half_2fr.png",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M2/evidence/lamp1_aftermath_f540-600_half_4fr.png",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M2/evidence/lamp4_f970-992_half_2fr.png",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M2/evidence/lamp5_notEaten_f1200-1256_half_4fr.png",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M2/evidence/person1_f640-725_half_5fr.png",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M2/evidence/person2_f864-884_half_2fr.png",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M2/evidence/cone_f736-769_half_3fr.png",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M2/evidence/cone_and_sizeup_f740-797_half_3fr.png",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M2/evidence/cones_f892-964_half_4fr.png",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M2/evidence/cones_f1143-1178_half_3fr.png",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M2/evidence/cone0_f336-369_half_3fr.png",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M2/events.csv",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M2/foreign_series.csv",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M2/trkA.csv",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M2/trkB.csv",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M2/trkC.csv",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M2/rimA.csv",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M2/rimB.csv",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M2/conesink_c545.csv",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M2/conesink_c577.csv",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M2/conesink_c605.csv",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M2/conesink_c738.csv",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M2/conesink_c1003.csv",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M2/conesink_c896.csv",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M2/conesink_c1145.csv",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M2/obj_cone545.csv",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M2/obj_cone577.csv",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M2/obj_cone605.csv",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M2/obj_lamp473.csv",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M2/obj_lamp644.csv",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M2/obj_lamp974.csv",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M2/obj_lamp1190.csv",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M2/sizeup_series.csv",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M2/sizeup2_series.csv",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M2/floaters_tracks_series.csv",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M2/floaters_tracks_summary.csv",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M2/floater_curve_mean.csv",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M2/track.py",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M2/rimfit.py",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M2/conesink.py",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M2/objtrack.py",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M2/sizeup.py",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M2/sizeup2.py",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M2/floaters_global.py",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M2/flg_analyse.py",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M2/events.py",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M2/crops.py"
 ],
 "caveats": "(1) Full-res frames were read from M3's decode (../M3/_full/f*.jpg, 1320x2868, JPEG q~92 \u2014 identical source video; JPEG blocking adds ~1 px noise to edges). (2) The tracker's interior ellipse is refreshed only on 'clean' frames; during the size-up zoom (f785-~840) no clean frame occurred, so fAll/fB/fR for lamp post 3 (f816-834) and cone C8 (f841-857) are unreliable \u2014 those two events are timed by eye from the montages and by the size-bar XP steps (f833, f857), not by the mask. (3) Rim 'no reaction' is established only on cone eats (rms 0.8-1.4 px); on lamp/person eats the post/body lies across the rim so the fit is corrupted during the event \u2014 only the frames immediately before/after are compared. (4) The cone 'principal-axis angle' has a resting value of -22..-30 deg (perspective + base plate), so 'no rotation' means the angle stays at that value; when the base becomes hidden the moment-based angle drifts to -35..-43 without the cone tilting (cap width/stripe confirm). (5) Person rotation could not be measured (mask too noisy); stated by eye only. (6) Floater alpha is a contrast-gain proxy normalised to the brightest instances (1.37); absolute alpha could differ by ~5 % if the true fully-opaque gain is higher than any instance measured. Two floater tracks (T2, T12) were merged by the linker where a new '+1' spawned on the old one; per-instance numbers use only the unmerged tracks. (7) The arrow burst is quantified by eye only (overlaps label, cone, ring); the 'arrows_n' series is contaminated by the joystick knob and the cone stripe and is used for timing only. (8) Lamp post 1's XP step is inferred (bar hidden by the post f513-536; fill 1233 -> 3024 px by f545). (9) The half-scale contact-sheet frame numbers assume f=(t*59.49)+1; all measurements here used the full-res frames directly. (10) An earlier abandoned M2 run had left files in this folder; they were moved to _stale_prev_run/ and are not used by any number above."
}
```
