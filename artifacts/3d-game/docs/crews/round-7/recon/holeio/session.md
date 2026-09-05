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
