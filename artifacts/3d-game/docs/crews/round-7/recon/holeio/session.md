# HOLE.IO recon — session log

Agent: Opus 5. Brief: `docs/crews/round-7/holeio-recon-brief.md`. Branch: `claude/holeio-recon`.
All times UTC, 2026-09-05.

## Environment — what could and could not be run

| capability | state | consequence |
|---|---|---|
| Android emulator / adb / Google Play | **absent** (`which adb emulator` → nothing) | **Path A impossible.** The current mobile build could not be installed or played. |
| Chromium 1194 + Playwright + swiftshader | present | usable, but see next row |
| Outbound HTTPS to game hosts | **denied by egress policy** | **Path B impossible.** `poki.com`, `www.crazygames.com`, `hole-io.com` all return `CONNECT tunnel failed, 403` via curl and `net::ERR_TUNNEL_CONNECTION_FAILED` in Chromium. Verified twice. |
| WebFetch to store listings | **denied** | `play.google.com` → `EGRESS_BLOCKED`. Store pages could not be fetched directly. |
| WebSearch | **works** | the only outside channel; used for version history and store description. |
| Pillow (installed this session via pip) | works | all pixel measurement was done locally with it. |
| ffmpeg | present | unused — no video could be fetched. |

**Net: the game was never played, in any build.** Every observation below comes from
ten owner-supplied screenshots of the current iOS build plus web search. This is
stated again at the head of the report; nothing in the report is presented as
played experience.

## Log

- 15:57 Branch `claude/holeio-recon` created; `recon/holeio/` created.
- 15:58 Reachability checks: poki / crazygames / apps.apple.com / play.google.com all 403 at the proxy.
- 15:59 Pillow installed. `probe.py` written (dims / px / region / top / sat / scan).
- 16:01 Chromium launched under the GPU lock; all three game hosts fail at the tunnel. Lock released. Path B closed.
- 16:03 WebSearch returns store metadata: current line is 2.5x, version 2.51.6 seen on mirrors.
- 16:05 Owner's five screenshots measured: all `1320x2868` (iPhone 16 Pro Max native), aspect 2.173.
- 16:08 18 evidence crops cut (`10-*` … `52-*`) and four verified by eye against the source frames.
- 16:15 `find.py` written — locates features by colour cluster and reports centroids, so no measurement depends on a guessed coordinate. (First swatch pass had ~15 mis-sampled points; all were re-taken this way. See Corrections in the report.)
- 16:22 Colourfulness measured; HSL saturation found to be unusable on dark frames (see Corrections). `chroma.py` written and used instead.
- 16:30 Hole geometry, HUD footprint, camera pitch measured from `02`.
- 16:40 **Owner supplied five more screenshots** — main menu, store tab, holes tab, and two frames of a second objective type. Filed as `06`–`10` in `reference/holeio/`. These closed the largest gaps in the brief (L2, L8, L9).
- 16:45 Menu composition, ladder pips, store ribbons, tab backgrounds, prop shading measured.
- 16:52 Hole-size-vs-screen measured across Size 1 / 2 / 14.
- 16:55 Evidence files and report written.

## Screen recording

Not possible: nothing could be run to record. Per the brief this is reported rather
than substituted for. The ten still frames are the entire visual record.

## 2026-09-06 — the owner's recording (resume point)

- 00:52 Owner attached a 25.8 s screen recording of the current iOS build (1320×2868, 59.49 fps, H.264 + AAC). Committed here as `vid-owner-recording-25s.mp4` (22.8 MB) so it survives the container.
- Contents (see `vid-owner-contact-1fps.png`): 0 s store tab · 1–2 s skins tab · ~3 s main menu with a **"SOLO RUN" live-event card (29:21 countdown)** and the ladder now 5·6·7·8·9 with 7 current — **level 6 turned grey after completion while 5 stayed magenta**, which supports the owner's reading that magenta = 100% clear · ~3.5 s a **"LEVEL 7" pre-match booster card** ("Select Boosters to start with an advantage!", slots locked until Lv. 9 and Lv. 13) · ~4 s an animated **"Loading..."** screen (tree, hydrant and taxi falling into a hole) · ~5 s **match opening from a high overhead camera** with the hole a dot inside a red-cone diamond and the **"Goal:" banner unrolling like a paper scroll** (10 yellow / 10 red / 10 blue cars — a THIRD objective type: eat N of each vehicle colour) · 6–24 s play at Size 1→2 (cones, a lamp post, a pedestrian; "+1" floaters; the gold **"Size 2"** pop at ~13 s with a white ground ring, arrows rising inside the hole and the size bar resetting) · 25 s Control Centre.
- Playwright's ffmpeg cannot open MP4; `pip install imageio-ffmpeg` supplied a full ffmpeg 7.0.2. All 1,547 frames were extracted at half scale to the scratchpad (`scratchpad/recon/vid/f60/`), plus `audio.wav` — **the scratchpad does not survive a container rebuild; re-extract from the committed mp4 with** `ffmpeg -i vid-owner-recording-25s.mp4 -vf scale=660:-1 -q:v 3 f%05d.jpg`.
- 01:00 Workflow `wf_1d8d7f37-7dc` launched: four measurers (M1 timeline+opening camera, M2 swallow+floaters+size-up, M3 growth+camera+joystick, M4 audio) then a skeptic re-measuring the headline numbers. At this note, 1 of 5 agent results had landed. If the session was cut before they were folded in, re-run the workflow script at `workflows/scripts/holeio-video-measure-wf_1d8d7f37-7dc.js` (it re-extracts nothing; point it at fresh frames) and write the results into the report as **§11 Motion, from the recording**.
- Owner's standing instruction, recorded: the void is not being replaced by a hole; he is to be refined to a higher standard with the same mechanisms (lit rim, screen-size band, size-up beat).
- 09:45 M1 (timeline) landed and is folded into the report as **§11 Motion, from the recording** (commit after 46f6b00). M1 evidence is committed as `vid-M1-*` here. M2/M3/M4 and the skeptic are re-running in the resumed workflow (task `wwm744ii0`, same run id, M1 cached); their results go into §11 as 11.8–11.11 when they land. Frame rate corrected to 60 fps (§11.7).
