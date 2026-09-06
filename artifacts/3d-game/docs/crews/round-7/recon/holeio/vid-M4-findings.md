# M4 — raw measurer return (verbatim JSON)

Landed 2026-09-06 from workflow wf_1d8d7f37-7dc. Folded into holeio.recon.md §11.

```json
{
 "findings": [
  {
   "claim": "Audio is exact digital zero from the start of the recording until the first gameplay sound: there is no store/holes-tab, LEVEL 7 card, Loading-screen or menu-tap audio at all",
   "value": "6.1428 (first non-zero int16 sample in the 22.05 k wav); native 44.1 k AAC decode: first non-zero 6.1068, first sample above -60 dBFS 6.1459",
   "unit": "s",
   "frames": "f1-f366 silent; first non-zero at f366.4 (wav) / f366.5 (native, -60 dB threshold)",
   "method": "numpy scan of int16 samples for first non-zero (wav) and of the ffmpeg f32 native decode; RMS per 0.5 s is -inf for every window 0.0-6.0 s (rms_0p5s.csv). Two sources agree within 40 ms."
  },
  {
   "claim": "Audio ends well before the recording ends; the Control Centre / recording-stop and the last ~2.6 s of gameplay carry no sound",
   "value": "last non-zero sample 21.3749 (wav) / 21.432 (native, below -60 dBFS after 21.374); silence 21.375-25.821 = 4446 ms = 264.5 frames",
   "unit": "s",
   "frames": "f1272.6 last non-zero; f1273-f1547 digital zero",
   "method": "last non-zero int16 sample; zero-run scan"
  },
  {
   "claim": "There is no music bed under the menu or the gameplay; every sound is a discrete SFX and the signal returns to exact zero between them",
   "value": "20.7 % of 20 ms windows inside 6.2-20.7 s are exactly zero; 15 internal zero runs >= 20 ms (e.g. 6.4727-8.0561 s = 1583 ms, 15.2254-15.7298 s = 504 ms, 11.7597-11.9402 s = 180 ms); no sustained spectral lines on the 0-8 kHz spectrogram",
   "unit": "fraction / ms",
   "frames": "f386-f480 (1583 ms gap), f907-f936 (504 ms gap), whole clip",
   "method": "int16 zero-run scan; 20 ms RMS windows (p10 = exact zero, p25 -64.3 dBFS, median -37.6); visual inspection of spectrogram_zoom_6-21s.png"
  },
  {
   "claim": "Tempo of the music bed",
   "value": "not measurable here: no music exists. Onset-envelope autocorrelation max is only 0.095 (lag 1.126 s = 53 BPM); low-band (<200 Hz) envelope autocorrelation max 0.206 at lag 0.313 s = 191 BPM, which is the cone-eating cadence (17.245 -> 17.544 -> 17.885 -> 18.228 s = 299 / 341 / 343 ms), not a beat. Consequently no tempo change at match start or at the size-up",
   "unit": "BPM (n/a)",
   "frames": "f363-f1273 (6.1-21.4 s); cadence run f1027-f1085",
   "method": "autocorrelation of normalised spectral flux (STFT 1024/256) and of a 4th-order 200 Hz low-passed RMS envelope over 6.1-21.4 s, peaks searched 0.25-2.0 s lag"
  },
  {
   "claim": "Spectral-flux onset detection finds 75 peaks, all inside the gameplay window; template matching merges them into 30 sound events (29 eats + 1 sting)",
   "value": "75 flux peaks between 6.165 and 20.643 s; 30 events between 6.157 and 20.024 s",
   "unit": "count",
   "frames": "f368-f1229 (flux peaks); f367.3-f1192.2 (events)",
   "method": "STFT 1024/256 Hann, log1p(1000*|X|), half-wave-rectified flux, peaks >= local median (0.5 s) + 0.08, 50 ms min spacing (onsets_raw.csv); then normalised cross-correlation of 80-500 ms waveform templates cut from one clean instance of each sample (template_matches.csv, events_classified.csv)"
  },
  {
   "claim": "The cone/standard eat sound 'E' (a two-hit low gulp with a brighter tail) is one fixed sample: identical pitch, identical level, no combo ramp across consecutive eats",
   "value": "13 instances at 6.157, 9.101, 9.570, 10.125, 10.594, 11.447, 12.855, 14.903, 15.757, 16.269, 16.781, 18.829, 19.810 s; waveform NCC vs the 9.570 s instance >= 0.996 at pitch ratio 1.00 for 12/13 (0.958 at 18.829, overlapped by a lamp-post tail); best ratio 1.00 for all 13 in a 0.90-1.10 search at 0.01 steps; peak level -6.0 to -6.4 dB rel clip max on 12/13 (first instance -9.2 dB, a constant -2.9 dB gain offset across its whole 300 ms, not a fade); spectral centroid of first 120 ms 631-723 Hz; acf f0 432-441 Hz on the first hit, second hit 47 ms later with peaks 335/388/443/650 Hz, tail at +105 ms centroid 1.55 kHz; duration 260 ms to <-45 dB (15.5 frames), last non-zero 316-327 ms",
   "unit": "s / dB / Hz / ms",
   "frames": "f367.3, 542.4, 570.3, 603.3, 631.2, 682.0, 765.8, 887.6, 938.4, 968.8, 999.3, 1121.1, 1179.5",
   "method": "Method 1: STFT centroid over 80 ms and 120 ms after each flux onset. Method 2: normalised cross-correlation of the 9.570 s waveform (120 ms and 300 ms templates, plus the 80-300 ms tail alone) against the clip, with the template resampled at ratios 0.90-1.10. Both methods agree: no pitch or brightness rise across eats"
  },
  {
   "claim": "Cone eats at Size 2 also use two bright 'whoosh' samples (H-a, H-b) that are likewise fixed in pitch and level; brightness differences in the eat table are sample changes, not a ramp",
   "value": "H-a at 15.965, 17.245, 17.885, 19.592 s (mutual NCC 0.997; 15.965 = 0.79 due to overlap), peak -11.2 to -11.7 dB, centroid 4988-5003 Hz (noise burst peaks 5.5-6.1 kHz) with a soft tonal tail at +105 ms, acf f0 817 Hz, -18.8 dB, duration 285-335 ms (17-19 frames). H-b at 14.130, 14.557 (person-2 fall), 17.544, 18.228, 19.250 s (mutual NCC 0.88-0.996), peak -10.2 to -10.8 dB, centroid 4.0-5.0 kHz. H-a vs H-b NCC only 0.77-0.83 (different samples). Best pitch ratio 1.00 (H-b 0.99-1.01 with <0.05 NCC gain). Observed but unexplained: all 6 cone eats at Size 1 used E; at Size 2 cones split E x4 (+2 uncertain), H-a x4, H-b x4",
   "unit": "s / dB / Hz / ms",
   "frames": "H-a: f950.8, 1026.9, 1065.0, 1166.5; H-b: f841.6, 867.0, 1044.7, 1085.4, 1146.2",
   "method": "pairwise NCC matrix of the first 80 ms among all 9 whoosh instances; pitch-ratio NCC search; STFT centroid; visual read of mont_B/C/D.png (cone sinking at the cited frames, by eye)"
  },
  {
   "claim": "Lamp posts get one of two metallic 'clank' samples, fixed pitch and level",
   "value": "C (variant 1) at 8.120, 18.403, 20.024 s: NCC 0.975-0.998, peak -7.2 to -8.7 dB, 935 ms to <-45 dB (55.6 frames) with a quiet second part at +546 ms (-21 dB), peaks 982/1319/2293/2649 Hz then 1876/2293/2646/3723 Hz, centroid ~4.2 kHz. W2 (variant 2) at 10.918, 16.422 s: NCC 0.88, peak -12.4/-12.5 dB, 505/355 ms, peaks 1542/2318/2767/2853 Hz. Lamp posts 2 and 3 are additionally preceded by an E gulp 324 ms / 153 ms earlier (10.594, 16.269 s); lamp posts 1, 4, 5 are not",
   "unit": "s / dB / ms",
   "frames": "C: f484.1 (post tips f481-497), f1095.8 (post f1092-1108, cone also sinks f1096-1108 with no separate sound), f1192.2 (post f1189-1205); W2: f650.5 (post sinks f643-659), f977.9 (f972-986)",
   "method": "template NCC with 250 ms and 150 ms templates; 5 ms RMS envelope for duration; frames read by eye from mont_A/C/D.png and mont_fullres_ambiguousE.png"
  },
  {
   "claim": "The two persons eaten play different scream samples with descending pitch glides; person 1 is the second-loudest sound in the clip",
   "value": "Person 1: whoosh at 12.030 s then voiced scream f0 339 Hz -> 334 Hz plateau 12.05-12.23 s -> glide down to 206 Hz at 12.79 s; peak -4.3 dB rel max at 12.179 s; 815 ms to <-45 dB (48.5 frames). Person 2: H-b whoosh at 14.557 s, scream at 14.690 s with f0 817 -> 345 -> 122 Hz over 14.67-14.83 s (160 ms voiced), peak -5.4 dB; whole event 341 ms; NCC of scream cores = 0.09 (different sample)",
   "unit": "s / Hz / dB / ms",
   "frames": "person 1: f716.7 (falls in f709-713); person 2: f867.0 whoosh (falls f867-875), f874.9 scream",
   "method": "30 ms autocorrelation f0 track at 20 ms hop; NCC of the 120 ms scream core (12.170 s) against the clip; frames by eye from mont_B.png"
  },
  {
   "claim": "The Size 1 -> Size 2 size-up sting is the loudest sound in the clip and it lags the visual size-up",
   "value": "audio starts 13.2591 s (first non-zero after a 77 ms zero gap) with a ~100 ms lead-in at -31 dB, loud hit at 13.355 s, peak 0.0 dB rel clip max (-0.17 dBFS) at 13.653-13.700 s, ends 14.120 s: duration 861 ms = 51.2 frames (method 2: >-40 dB envelope 13.285-14.085 = 800 ms = 47.6 frames). Visual: white ring flash from f786 (13.195 s), yellow 'Size 2' label first at f787 (13.212 s), label gone by f824 (36 frames = 605 ms visible). Label leads audio start by 2.7 frames (47 ms) and the loud hit by 8.5 frames (143 ms). Tonal content: low body 128/301/396/480 Hz, then 269-283 Hz (13.45-13.75 s), then a 1.5-3 kHz shimmer tail 13.75-14.1 s",
   "unit": "s / dB / frames / ms",
   "frames": "audio f789.7 (start), f795.5 (hit), f813-816 (peak), f840.5 (end); visual f786 (flash), f787 (label), f823 (label last)",
   "method": "zero-run boundaries and 5 ms RMS envelope for the audio; per-frame pixel counts in the half-scale region (200,500)-(500,620): yellow label pixels (hue 40-65 deg, sat >0.7, light 0.5-0.8) = 0 at f786 vs 2564 at f787; white-cyan ring pixels 4 -> 61 -> 73 -> 151 at f785 -> f786 -> f787 -> f788"
  },
  {
   "claim": "No SFX in the clip uses randomised pitch; per-sample level is constant",
   "value": "best resampling ratio 1.00 for every instance of E (13), C (3), W2 (2), H-a (4); 0.99-1.01 for H-b (5) with NCC gain <0.05; level spread per sample <= 0.5 dB except the first E (-2.9 dB)",
   "unit": "ratio / dB",
   "frames": "all event frames listed in events_classified.csv",
   "method": "NCC of each template resampled at ratios 0.90-1.10 (step 0.01, scipy resample_poly) within +-60 ms of each instance"
  },
  {
   "claim": "Loudness envelope (RMS per 0.5 s)",
   "value": "whole-clip RMS -27.3 dBFS; loudest 0.5 s window 13.5-14.0 s at -17.4 dBFS (sting), then 12.0-12.5 s -18.1 (scream 1) and 13.0-13.5 -18.9; typical eat-run windows -24 to -27 dBFS (9.0-11.0, 15.5-17.0, 18.0-19.0, 19.5-20.5 s); whoosh-only windows 17.0-18.0 s -38.7 to -39.9; 21.0-21.5 s -62.6 (lamp-post tail); all windows 0-6.0 s and 21.5-26.0 s exactly zero (written as -120)",
   "unit": "dBFS",
   "frames": "per-window frame ranges in rms_0p5s.csv (e.g. 13.5-14.0 s = f804-f832)",
   "method": "RMS and peak of each 0.5 s block of the 22.05 k wav; also 20 ms-window statistics inside 6.2-20.7 s: median -37.6, p90 -20.8, p25 -64.3 dBFS, p10 exact zero"
  },
  {
   "claim": "Native audio stream is stereo in the container but effectively dual-mono, so the mono wav loses nothing",
   "value": "L and R RMS identical to 0.1 dB in five test windows; max |L-R| = 0.23 (codec noise); 44.1 kHz AAC-LC 64 kb/s",
   "unit": "dB",
   "frames": "windows 8.12-8.7, 9.57-9.9, 12.03-12.5, 13.35-13.9, 17.24-17.5 s",
   "method": "ffmpeg f32le decode of recording.mp4, per-channel RMS"
  },
  {
   "claim": "Timing of eat sounds relative to the visible eat",
   "value": "eat sound onset lands within +-4 frames (+-67 ms) of the frame at which the object starts to sink into the hole, for every cone eat that was checked; at match start the '+1' floater is already visible at f360-363, 4-7 frames before the first sound at f367.3",
   "unit": "frames",
   "frames": "e.g. 9.101 s = f542.4 vs cone sinking f542-554; 9.570 s = f570.3 vs f574-582; 17.245 s = f1026.9 vs f1027-1035; 6.157 s = f367.3 vs '+1' at f360",
   "method": "read by eye from the F-8..F+8 montages mont_A-D.png and mont_fullres_ambiguousE.png; not a pixel measurement"
  }
 ],
 "evidence_files": [
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M4/M4_audio_findings.md",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M4/spectrogram_0-8kHz_onsets.png",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M4/spectrogram_zoom_6-21s.png",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M4/events_classified.csv",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M4/eats_table.csv",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M4/onsets_raw.csv",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M4/onsets_pitch.csv",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M4/template_matches.csv",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M4/rms_0p5s.csv",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M4/mont_A.png",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M4/mont_B.png",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M4/mont_C.png",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M4/mont_D.png",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M4/mont_fullres_ambiguousE.png",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M4/evidence/f00367.jpg",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M4/evidence/f00484.jpg",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M4/evidence/f00546.jpg",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M4/evidence/f00651.jpg",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M4/evidence/f00717.jpg",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M4/evidence/f00787.jpg",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M4/evidence/f00796.jpg",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M4/evidence/f00842.jpg",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M4/evidence/f00867.jpg",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M4/evidence/f00875.jpg",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M4/evidence/f01027.jpg",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M4/evidence/f01096.jpg",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M4/evidence/f01193.jpg",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M4/a1.py",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M4/a5.py",
  "/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/recon/vid/out/M4/a7.py"
 ],
 "caveats": "1. dB levels are relative to the clip's max sample (0.9811 = -0.17 dBFS, inside the sting), so 'rel max' = dBFS + 0.17; the recording is a screen capture at the owner's volume, so absolute game mix levels are unknown (only ratios between samples are meaningful). 2. Whether Hole.io has music that the owner had muted cannot be told from this clip; the recording simply contains no music and no UI sounds. The 0-6.14 s silence could also be iOS not capturing app audio until the match started; either way nothing is measurable there. 3. Object classification per onset was read by eye from the frame montages (mont_A-D.png, mont_fullres_ambiguousE.png); three E-gulp instances (10.594, 14.903, 19.810 s) have no clearly visible new object and are marked uncertain in events_classified.csv; 16.269 s coincides with lamp post 3 entering the hole. 4. The rule choosing E vs H-a vs H-b for cones and C vs W2 for lamp posts is not determinable from 13/4/5 and 3/2 instances; the only pattern seen is that all six Size-1 cone eats used E. 5. The cone that sinks at f792-804 during the sting has no separately resolved eat sound (an E partial NCC match of 0.53 at 13.666 s is ambiguous); the sting masks that region. 6. The 22.05 kHz mono wav vs the native 44.1 kHz decode differ by up to 40 ms only at sub -60 dBFS tails (resampling); all onset times are from the wav and are consistent between the flux method and the NCC method to within 10 ms. 7. Sound durations 'to <-45 dB' are cut short where the next SFX overlaps (noted per row); 'last non-zero' values are given alongside. 8. The M4 output folder also contains files written by an earlier process at 10:14-10:28 (a1_basic.py, a2_onsets.py, a3_final.py, onsets.csv, av_lag_plus1*.csv, tiles_onsets_*.png, strip_*.png, zoom_*.png, spectrogram_onsets.png, plus1_template_f543.png, flux_med.npy, onset_idx.npy, spec_preview.png, flux_preview.png); their first onset (6.166 s, f367, -9.2 dB) agrees with mine but none of my numbers depend on them. 9. Nothing was written inside the git repository."
}
```
