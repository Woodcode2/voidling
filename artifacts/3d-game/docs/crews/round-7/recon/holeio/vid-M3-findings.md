# M3 — growth, camera follow, joystick (raw measurer return, verbatim JSON)

Landed 2026-09-06 ~10:15 from workflow wf_1d8d7f37-7dc. Not yet folded into holeio.recon.md §11 (to be §11.9). Skeptic verdict pending.

```json
{
 "findings": [
  {
   "claim": "Hole interior diameter, Size 1 steady state (before size-up)",
   "value": "294 (p5 292, p95 295); 2nd method ellipse-fit width 283-286",
   "unit": "px (original 1320x2868)",
   "frames": "f386-784 clean frames n=271; ellipse fit at f400,760,770,782-784",
   "method": "Per full-res frame (ffmpeg fps=60 decode, reproduces f60 numbering): black mask max(r,g,b)<60, connected component nearest previous centre; widest row extent (last-first black). Second method: cv2.fitEllipse on the black blob contour."
  },
  {
   "claim": "Hole interior diameter, Size 2 steady state (after size-up)",
   "value": "412 (p5 409, p95 416); ellipse-fit 400-414",
   "unit": "px",
   "frames": "f826-1430 clean frames n=463; ellipse fit f830-840,860,1000,1400",
   "method": "Same as above. Full per-frame series f381-1430 in diam.csv with columns frame,t,diameter_px(extent),centre_x,centre_y,run_px(contiguous),vext,bbox,rim ellipse,flag (209 frames interior_occluded by a cone/lamp inside, 70 edge_occluded)."
  },
  {
   "claim": "First stable gameplay frame (camera descent finished)",
   "value": "381 (extent 288; reaches 292-293 by f386); M1's descent end 384-385 agrees",
   "unit": "frame",
   "frames": "f300-500 scan",
   "method": "First frame whose extent is >=98% of the f400-500 median for 10 consecutive frames."
  },
  {
   "claim": "Size-up trigger frame (label Size 1->2, bar reset, diameter step, zoom start all coincide)",
   "value": "785 (t 13.178 s at 59.49 convention / 13.067 s at 60 fps)",
   "unit": "frame",
   "frames": "f783-788 by-eye montage; yellow bar pixels 17.3-17.6k at f770-784 -> 0 at f785-799; extent 294 (f784) -> 336 (f785); flow zoom residual -0.8% at f785",
   "method": "Label read by eye on full-res crops (cited); bar fill = yellow pixel count in hole-relative crop; extent series; homography local-scale residual."
  },
  {
   "claim": "Size-up screen-diameter transition: rise, peak, fall, settle",
   "value": "294 -> peak 538 at f799-800 -> 412 at f815 -> settled 412-416 from f826. Rise 15 fr (250 ms @60 / 252 ms @59.49), fall 16 fr (267 ms), settled 41 fr after trigger (683 ms). Screen peak = +102% of the net step (transient ~2x the eventual step).",
   "unit": "px, frames, ms",
   "frames": "f784-840 per-frame extents in sizeup.csv: 785:336 786:354 787:370 788:384 789:398 790:416 791:434 792:454 793:468 794:488 795:502 796:516 797:527 798:534 799:538 800:538 801:534 802:528 803:522 804:512 805:504 806:487 807:481 808:470 809:459 810:448 811:438 812:428 813:420 814:416 815:412 816-817:411 818-823:414-421 826-833:416-418 834-840:412-414",
   "method": "Black-extent series; rim ellipse width tracks the same shape (281 -> 464-471 at f800-802 -> 367-392)."
  },
  {
   "claim": "Shape of the size-up transition",
   "value": "Rise fits ease-out 1-(1-x)^k, T=15.2 fr, k=1.47 (rms 0.027 normalised) vs linear rms 0.042, smoothstep 0.092. The whole screen curve is NOT a damped spring (best spring fit rms 0.24). The hump is a fast world-size step (world 50% at f792, 90% at f797, done at f800 = 15 fr; overshoot <= +2% at f805) multiplied by a slower camera zoom-out (90% at f820). Implied world diameter ratio 2.16-2.30 (Size 1 -> Size 2).",
   "unit": "normalised fit / frames / ratio",
   "frames": "f784-840 (fits), world estimate = extent/zoom per frame f780-880 in sizeup.csv",
   "method": "scipy curve_fit on normalised extent; world size = screen extent / cumulative ground-scale (flow homography) with bollard cross-check."
  },
  {
   "claim": "Camera follow: hole is NOT pinned; it leads the anchor in the travel direction with a ~4.4-frame first-order lag",
   "value": "centre mean (691.9, 1416.9), sd (37.9, 17.2), range x 573-828 y 1328-1492, max deviation 136 px (x) / 90 px (y). centre_x = 4.38*vx + 661.2 (r=0.83); centre_y = 4.23*vy + 1451.3 (r=0.74); rim-ellipse method x = 4.34*vx + 660.8 (r=0.885), y = 3.73*vy + 1416 (r=0.67); post-size-up x slope 4.53 (r=0.977), y 4.43 (r=0.88). Zero-velocity anchor (661,1451) for the widest interior row = screen-centre x (660), 17 px below centre y (1434). Lag scan peaks at 0-2 frames.",
   "unit": "px, frames of velocity (4.4 fr = 73 ms @60fps, ~57 px at 13 px/fr)",
   "frames": "f386-1430, 821 clean frames with flow (occluded frames excluded); split f386-780 and f840-1430",
   "method": "Ground velocity at the hole = -(displacement of the frame-to-frame homography at the hole centre), from LK optical flow on up to 1500 corners outside HUD/hole/joystick masks, RANSAC (median 207 inliers). Linear regression of centre vs 5-frame-smoothed velocity, both for the black-extent centre and the blue-rim ellipse centre."
  },
  {
   "claim": "Camera zoom-out ratio at the size-up (ground-feature scale before/after)",
   "value": "1.54 by ground objects (bollard cap widths 105-107 -> 67-71 px = 1.54; bollard heights 305-310 -> 196-200 = 1.56; bollard base widths 143-150 -> 94-100 = 1.50); 1.64 by integrated flow scale (0.608). Methods disagree by 6%; quote 1.54 (range 1.50-1.64). Ground features shrink to ~0.65x; joystick ring radius unchanged at 165 px (UI control).",
   "unit": "ratio",
   "frames": "before: f760,770,775,780,784 (caps at (1084,912),(803,1120),(1030,942),(977,974),(933,1001)); after: f840,850,860,1000 (caps at (1147,1024),(953,1177),(1069,973),(1245,840),(877,1119) etc.); flow f785-880",
   "method": "A: red-mask (r>140,g<90,b<110,r-g>80) connected components, bbox width/height of by-eye-identified bollard caps/bodies at the same screen position (perspective cancels). B: per-frame homography Jacobian at the hole centre, bias-corrected by a regression on steady frames (ln s = -2.8e-5 dx + 5.2e-4 dy - 1.2e-3), cumulated from f785."
  },
  {
   "claim": "Camera zoom timing relative to the diameter step",
   "value": "Starts on the same frame as the step (f785 +/-1; first residual -0.8% vs noise sd 0.23%), no lag at onset, but ~3x slower: 5% f788, 25% f794, 50% f800, 75% f809, 90% f820, 95% f827 => ~42 frames (700 ms @60 / 706 ms @59.49) vs world-size growth 90% at f797. Cross-check: standing bollard cap width 78 (f805) 74 (810) 72 (815) 70 (820) 69 (825-830) still shrinking through f825.",
   "unit": "frames / ms / %",
   "frames": "f785-830 (flow_zoom.csv); bollard cap f804-830 (tmp/su frames)",
   "method": "Cumulative bias-corrected homography scale; red-mask cap width tracked per frame."
  },
  {
   "claim": "Joystick first appearance and idle default position",
   "value": "f271 (first gameplay frame; t 4.539 s conv / 4.500 s @60): base (658-660, 2146-2150) = screen-centre x, 74.9% of height; knob concentric (d 1-8 px); ring radius 165 px (Hough median 165, p10 160, p90 169; annulus 164-166); knob radius ~84 px. Not detected on f254-270 (loading screen).",
   "unit": "frame / px",
   "frames": "f254-330 detections listed in joystick.csv; montage f271/f313",
   "method": "Knob = Hough circle r 70-100 validated as near-white (mean RGB>195, sat<25, sd<18) with template-match fallback; base = Hough circle r 150-185 within 235 px of the knob, annulus-template second detector (agree +/-3 px)."
  },
  {
   "claim": "Joystick is FLOATING (base placed under the finger) and also FOLLOWS (base dragged along the knob direction)",
   "value": "Touch-down f314: base jumps from default (660,2150) to (958,2032) (320 px away), knob concentric (d=7), deflection ramps f320 (41 px) -> f338 (174 px). During the single touch episode f314-1473 (1160 fr, 19.3 s) the base drifted (956,2032) -> (1106,1428), bbox x 926-1146 y 1106-2032; it moved >12 px in 28% of 10-frame windows, always along the knob direction (base-motion angle - knob angle median 0.4 deg, MAD 4.5 deg), and was static at full deflection in 27% of windows (moves only when the finger keeps going outward). Release f1474: snaps back to default (658,2150), knob concentric, in ONE frame (no tween). Never disappears during gameplay (last clean gameplay f1514; Control Centre from ~f1525). Only one touch episode exists, so a second-touch base comparison is not available in this clip.",
   "unit": "px / frames",
   "frames": "f313-314 (touch-down), f331-363, 376-399, 483-515, 688-711, 730-765, 776-789, 851-871, 889-906, 957-969, 1087-1108, 1211-1234, 1431-1473 (base-moving runs), f1473-1474 (release)",
   "method": "Per-frame base and knob centres (joystick.csv), 7-frame median smoothing, 10-frame displacement windows."
  },
  {
   "claim": "Knob maximum travel from base centre (clamp radius)",
   "value": "172.7 +/- 3.7 (mean at full deflection; median 173.2, p99 178.5, max 181) = ring radius 165 + 8; knob at >150 px in 94.5% of episode frames",
   "unit": "px",
   "frames": "f314-1473 (1160 frames)",
   "method": "Euclidean distance knob centre - base centre per frame."
  },
  {
   "claim": "Hole speed vs knob displacement: NOT proportional in the observable range; direction follows the knob's screen direction with a 5-frame lag",
   "value": "Speed by deflection bin (px/frame ground motion at hole): 60-120 px: 12.8 (n=7); 120-150: 11.3 (n=6); 150-165: 13.6 (n=55); 165-172: 14.0 (n=266); 172-178: 13.2 (n=653). Sampled moments (frame, knob dist, knob angle, speed, travel angle): f400 176.8/-119/11.87/-115; f600 174.3/-49/14.51/-40; f725 108.7/-63/12.78/-105; f886 79.7/-70/13.40/-141; f889 146.3/-12/9.82/-109; f1000 176.3/-51/13.76/-42. Speed dips to 5.5-7.8 px/fr 3-6 frames AFTER a reversal (f731-732, f890-892) while direction swings. Steering: cross-correlation of knob vs travel unit vectors peaks at lag 5 frames (cos 0.991 vs 0.973 at lag 0), residual offset median +6 deg sd 6.6 deg. Full-deflection speed median 12.7 px/fr (f386-780, Size 1) vs 13.6 (f840-1473, Size 2) on screen: ~constant screen speed, ~1.65x ground speed after the zoom. Release decel f1474-1500: 13.2, 5.2, 3.1, 2.96, 2.8, 2.66, 2.4 ... 1.6 (f1490), 0.8 (f1500).",
   "unit": "px/frame, degrees, frames",
   "frames": "f386-1473 excluding f780-840; reversals f716-736 and f878-896; release f1468-1500",
   "method": "Ground displacement at the hole centre from the per-frame homography vs knob-base distance and angle; binned medians; lagged cross-correlation."
  }
 ],
 "evidence_files": [
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M3/M3_growth_camera_joystick.md",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M3/diam.csv",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M3/sizeup.csv",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M3/flow_zoom.csv",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M3/joystick.csv",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M3/plot_diam_series.png",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M3/plot_sizeup_zoom.png",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M3/plot_camera_follow.png",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M3/plot_joystick.png",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M3/sizeup_montage_f784-840.png",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M3/hole_annot_f00381.png",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M3/hole_annot_f00400.png",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M3/hole_annot_f01000.png",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M3/joystick_montage_f271_313_314_330_400_1000_1473_1474.png",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M3/joystick_f271_f314_f1474_halfscale.png",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M3/bollard_caps_f00770.png",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M3/bollard_caps_f00860.png",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M3/bollard_caps_f01000.png",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M3/tmp/label_783_788.png",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M3/tmp/pass.py",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M3/tmp/pass.pkl",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M3/full",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M3/tmp/su"
 ],
 "caveats": "(1) Frame timing: the f60 set is a 60 fps constant-frame-rate expansion of a 59.49 fps-average stream (ffmpeg fps=60 reproduces its numbering exactly, 1547 frames, 13 duplicated frames), so wall-clock durations are frames/60; the task's (N-1)/59.49 convention overstates times by 0.85 %. CSV t columns use the task convention; ms values are given both ways where they matter. (2) Diameter definition: the task's 'widest contiguous run' collapses whenever a cone/lamp stands inside the hole (209 of 1050 frames); diam.csv carries both the contiguous run (run_px) and the row extent (diameter_px) and flags occluded frames; 70 further frames have the interior edge covered (extent too small, flagged edge_occluded). Frames 824-825 inside the size-up are edge-occluded. (3) The zoom ratio disagrees between methods (ground objects 1.54; integrated flow 1.64); the world-size curve derived by dividing the screen extent by the flow zoom inherits that uncertainty, so its f810-820 dip (-15 % of the step) may be an artefact; the fast rise (world 90 % by f797) and the slow zoom (90 % by f820) are robust. Bollard sizes are 1-2 px quantised (+/-3 % per pair) and bollard identification was by eye (frames and cap positions cited). (4) Camera-follow velocity comes from a planar homography of a 3D scene; the hole centre used is the widest black row (its y is ~31 px below the rim-ellipse centre because of perspective); the speed values are screen px/frame at the hole and change scale with the zoom after f785. (5) Joystick: only one touch episode exists (f314-1473), so floating is inferred from the default->touch placement and base dragging, not from two separate touches; the pre-descent ramp f320-338 cannot be used for speed-vs-deflection because the camera scale changes 4.75x during it (M1); knob/base centres from half-res Hough have ~2 px quantisation. (6) The label switch frame (f785) and the gold pop-up (f787) were read by eye on cited crops; the bar reset at f785 is by yellow-pixel count. (7) out/M3 also contains files with 01:5x timestamps (diam40.csv, diam60.csv, hole*.py, zoom*.py, etc.) from an earlier session that are not part of this report; my outputs are the files listed above."
}
```