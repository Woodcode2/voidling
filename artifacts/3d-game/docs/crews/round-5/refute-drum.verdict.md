# DRAFT — in progress (refute-drum)

Commit under refutation: 702a3e4 (Lantern drum / eaten_deep.wav / recordingLive gate).
Started 2026-09-02. Appended incrementally; if this header still says DRAFT the record is partial.

## What I ran

## What I checked on disk

## Kill shots

## Corrections (verbatim)

<!-- appended 1: on-disk reads, before any probe -->
### On-disk, read at HEAD 301a8be (audio3d.ts unchanged since 702a3e4: `git log 702a3e4..HEAD -- src/proto3d/audio3d.ts` is empty)

- `git show 702a3e4 --stat`: ONE file, `src/proto3d/audio3d.ts`, +27/-3. No probe, no doc, no README change.
- `dist/` is dated Sep 2 00:13; `find src -newer dist/index.html` is empty; the preview on :4177 serves `assets/main-BlHCCMf5.js` which is the file in `dist/`. So :4177 IS this commit's build.
- `grep -o "eaten_deep" dist/assets/*.js` → nothing. The shipped bundle no longer names the file. `grep -c "srcs.length>0||" dist/assets/main-BlHCCMf5.js` → 1 (the predicate is in the bundle).
- `curl :4177/assets/audio/eaten_deep.wav` → `200 79424`. The asset still ships (as the commit says).
- `sample()` (`audio3d.ts:359-377`) is the ONLY loader of `/assets/audio/*`; every call site: `grep -n "sample('" src/proto3d/audio3d.ts` — see below.
- READERS OF eaten_deep OUTSIDE the commit's two prewarm lists:
  1. `src/game/audio.ts:71` (`eaten_deep: '/assets/audio/eaten_deep.wav'`) and `:483` (`if (this._playSample('eaten_deep', 1, 0.65)) return;`). This is the OLD 2D engine; its importers are `src/ui/UILayer.tsx`, `src/ui/DebugPanel.tsx`, `src/game/{world,events,engine}.ts` — none reachable from `index.html`'s single entry `/src/prototype3d.ts` (its imports: `./game/{stickers,seasons,unlocks,matchdeck}` only, never `./game/audio`). Confirmed dead in the bundle by the dist grep above. NOT a live reader.
  2. `public/assets/audio/README.md:9` (copied into `dist/assets/audio/README.md:9`): a shipped manifest that still says `eaten_deep.wav` "fires when swallowing something big" and "Drop a file here under the exact name and it plays" — FALSE since 702a3e4; nothing reads that slot any more. Doc-only, but it is the file a future asset-dropper will read first.
  3. `qa/_wav.mjs:19` decodes `eaten_deep.wav` at 0.55 and its header (`:5-6`) says "bigEat() ... tr[ies] sample() FIRST and return[s] if the buffer is resident (audio3d.ts:3224...)". Scratch probe (`_`-prefixed), not on the gate; its header is now a false statement about `bigEat()`.
  4. `dist-gw/assets/main-CJg517oQ.js` — an Aug 17 scratch build (gitignored by `dist-*/`), not served. Ignore.
  No service worker, no PWA manifest, no preload manifest (`find . -name 'sw.js' -o -name '*.webmanifest' -o -name 'manifest*.json'` outside node_modules → nothing).
- `docs/HANDOFF.md:351-355` still says the swallow "is now a soft whoosh, not a thud"; `docs/AAA-BRIEF.md:1357` still says "with eaten_deep.wav absent". The proposal's §7 listed these as corrections OWED; the commit did not touch them.
- THE PREDICATE. `recordingLive = () => themeCh.srcs.length > 0 || menuCh.srcs.length > 0` (`:1935`). Where `srcs` is written:
  - `startLoop` `:528-529` pushes each pass's `AudioBufferSourceNode`, capped at 3; ENDED sources are never removed — only `stopLoop` clears. A running loop therefore always has srcs.length in 1..3 (pass 1 pushed synchronously at `:532`).
  - `startLoop` REFUSES on a non-running clock (`:458-460`), sets `cold=true` and pushes nothing → srcs stays 0 → gate open, but nothing is audible either. Consistent.
  - `stopLoop(ch, fade>0)` (`:543-548`) sets `ch.srcs = []` IMMEDIATELY and stops the old sources `fade` s later. So for the 1.2 s after `stopMusic()` (`:4022-4023`) and the 0.6 s after `menuCh` stands down at match start (`:3724-3725`) the recording is STILL AUDIBLE while `recordingLive()` is FALSE. `win()` fires "right after stopMusic()" by design (`:2444-2445`, `prototype3d.ts:4824→4836/4875`), but Lantern's `win()` is `sample('win_warm.wav')`/triangle notes — no drum voice — so nothing percussive rides that window today. Noted as a limit of the predicate, not a kill.
  - `releaseBuf` (`:561`) touches `buf`/`era` only, never `srcs`. `playTrack`/`preload` never touch `srcs` directly; they call `startLoop`. The era guard drops a stale decode before `startLoop` runs, so a released channel cannot resurrect srcs. Consistent.
  - The 404 path: `playTrack` sets `ch.bad=true`, never calls `startLoop` → srcs stays 0 → `recordingLive()` false → stings play over the synth score, and the score's own taikos go to `lnBus` (`:3270-3271`, dest !== master) so they are never gated. Consistent with the commit's claim.
- DRUM VOICES AND WHERE THEY ROUTE (every call, `grep -n -E "bDrum\(|taiko\(|pwDrum\("`):
  - `taiko(master, …)`: `:3518` lanternEvolve, `:3528` lnGateSting ×3, `:3539` lnNoticeSting, `:3547,:3552` lnBathhouseSting ×9, `:3557` lnLastSting ×12 (= `alert()` on Lantern, `:4227`), `:3451,:3484,:3508` via `dest` (need to check what dest those receive — they are inside the Lantern SCORE scheduler, dest = lnBus).
  - `taiko(lnBus, …)`: `:3270-3271` the score. Not gated. Correct.
  - `bDrum(master, …)`: `:2449` bandLand (Maple), `:2997,:3007,:3016,:3036` Game Day stings, `:3971` Game Day generic beat. `bDrum(mapBus|gdBus|gzones.greek.g|dest, …)`: scores, not gated.
  - `pwDrum`: `:3649` (score) and `:3684` (`powderEvolve`, which starts the Powder score under a recording — proposal F3, NOT in this commit). Both to `pwBus`. The governor's "pwDrum routes only to pwBus" is true on disk.
- `pop()` still fires `tone(52, 30, 0.2, 'sine', depth*0.14, 0.03)` to master for depth > 0.35 (`:4109`) — ungated, flagged by the proposal, not proposed. Every big swallow calls `bigEat()` ONLY (`prototype3d.ts:5294`: CHOMP → `audio.bigEat()`; else → `audio.pop(...)`), so bigEat and pop are exclusive per eat.

<!-- appended 2: harness -->
### Harness (all runs on this box, serial, load < 4 checked before each launch)
- Probe: `/tmp/claude-0/.../scratchpad/drumprobe.mjs` (scratch, not landed). Wraps `AudioNode.prototype.connect` (records the graph and splices an `AnalyserNode` fftSize 32768 in front of `destination`), `createOscillator`/`createBufferSource`/`AudioParam.{set,exp,lin}*` (records each voice's frequency schedule) and `AudioScheduledSourceNode.start`. Route classification: master = the GainNode feeding the DynamicsCompressor that feeds destination; musicBus = the lowest-id GainNode feeding master; a voice is `@master` iff its chain reaches master without passing musicBus. Taiko fingerprint = sine 128→52 or 190→88 (`dTone` at `:3147`); bDrum = sine 92→48; sample = buffer 1.7–1.9 s; whoosh = non-loop buffer of 0.34 s.
- A/B "before": the parent `702a3e4^` (= e0f7e13) built in a gitignored worktree `/home/user/voidling/.claude/worktrees/refute-drum-parent` (`npm run build` inside its `artifacts/3d-game`, exit 0, `✓ built in 5.75s`; its bundle `main-BhftODn3.js` names `eaten_deep.wav` 3 times, the live one 0). Served to the SAME page URL by a playwright `route()` from that dist — no second server started.

<!-- appended 3: the asset, measured by me -->
### The sample itself, re-measured (scratch `wavstat.mjs`: RIFF parse, radix-2 FFT over the file, energy share = sum |X|² below cutoff / total; centroid energy-weighted)
```
eaten_deep.wav: 16-bit 1ch 22050 Hz, 1.800 s, peak -0.9 dBFS, RMS -17.1 dBFS
  energy below 120 Hz: 73.2%   spectral centroid 127 Hz   50% of energy below 55 Hz, 90% below 246 Hz
  (first 0.5 s only: RMS -11.7 dBFS, below-120 72.3%, centroid 130 Hz)
win_warm.wav:    3.200 s  below-120 0.0%   centroid 417 Hz
evolve_epic.wav: 2.900 s  below-120 39.4%  centroid 1012 Hz   (first 0.5 s: 0.0%)
gulp_1.wav:      1.280 s  below-120 0.0%   centroid 720 Hz
```
- Peak -0.9 dBFS, half its energy under 55 Hz, a 1.8 s monotonic decay: it is a thud/kick by any reading, so the proposal's CHARACTERISATION stands. Its NUMBER does not: the crew's "93.8% below 120 Hz" came from a naive DFT sampled at 30 log-spaced bins, which is not an energy integral (log-spaced bins pile up at the low end and over-weight it). Round 3's 88.7% is a third grid. A proper FFT energy share is **73.2%** whole-file / **72.3%** first 0.5 s. This matters because the crew's proposed LEG A bar is "no sample above 80% sub-120 Hz": under a correct measurement `eaten_deep.wav` is BELOW that bar and LEG A as specified would PASS the very file it was written to catch. Carried into the probe proposal below.
- Blob history (`git log --all --diff-filter=A -- '*eaten_deep.wav'` → `589e31e`; `git cat-file -s` at a3b3ba2 / 7bad24c / 702a3e4^ / HEAD → 79424 each). The commit's "one unchanged 79,424-byte blob, present on the day the fix declaring it absent was written" is TRUE on disk.

<!-- appended 4: pwDrum premise, on disk (measurement pending) -->
### The governor's pwDrum correction — its premise, read on disk
The commit: "pwDrum takes no dest and routes only to pwBus, a world-score bus that runs solely on the 404 fallback path where there is no recording to clash with."
- `pwDrum` → `pwBus` → `musicBus` → master (`:3622-3634`, `:3656-3663`). True.
- "runs solely on the 404 fallback path": FALSE on disk. `evolve()` `:4154` → `powderEvolve()` `:3678`, whose first line is `if (!pwBus) startPowderScore();` `:3680`. On a Powder match with `powder.mp3` playing, `pwBus` is null (nothing on the recording path builds it), so the FIRST evolution builds the bus, sets `pwRunning = true`, ramps `pwBus.gain` to 0.5 over 1.8 s and starts `setInterval(pwSchedule, 110)` (`:3653-3670`) — the entire Powder score, under the recording — and `powderEvolve()` then plays `pwDrum(t + 0.5, 0.2)` `:3684`; from `musStage >= 3` the scheduler adds `pwDrum(t, 0.16)` every fourth 8th (`:3649`). Nothing on this path sets `synthOn`, so `synthStop()` (`:790`) returns at its first line and never stops it. This is the proposal's F3 (and `docs/STUDIO-ROUND-3.md:7267`), which the commit did NOT land — yet the commit's reason for leaving `pwDrum` ungated assumes F3 is already true. Measured below (Powder run) before it is called a kill.

<!-- appended 5: LIVE run 1 (oscillator data valid; buffer-source data INVALID, see note) -->
### Run 1 — live build on :4177, Lantern, recording playing (`node drumprobe.mjs --tag=LIVE`, log `scratchpad/live.log`)
Harness: swiftshader, 430x932, GPU lock held, load 3.62 at launch. Match clock moving 4.8 s wall after the card tap; `__music()` at the first sample: `theme:{srcs:1, starts:1, dur:146, gain:0.4, cold:false}`, `menu.srcs:0`, `synth:false`, `ctx:running`. So on the real path **`recordingLive()` ≡ `theme.srcs>0 || menu.srcs>0` is TRUE** from the first frame of the match — srcs held exactly one source for the whole run (1/1 before and after every fire).
- Music-only baseline at the output (45 analyser windows of 0.74 s): mean **-33.0 dBFS**, max -29.1.
- `alert()`: 5 voices, **TAIKO@master = 0** (kane's four sine partials 1180/2844/4519/6962 and the clack square 1900→1200 still play). Pre-fix this is 12.
- `evolve()`: 17 voices, TAIKO@master = 0. Koto/shaku/kane all present.
- `matchBeat()` ×4 banners: 11 voices each, TAIKO@master = 0 — but **5 × sine 640→380 @master each**, which is `shime()` (`:3153`, "the small rope-tuned drum that keeps the actual time"). A drum, to master, over the recording, UNGATED. See kill shot 2.
- All four banner strings produced the identical voice set (kane + 5 shime + shaku), i.e. all four routed to `lnNoticeSting` — checked below.
- THE TAIL: `stopMusic()` → `theme.srcs` 1 → **0 immediately**; the output over the next 0.7 s wall still measured -40.7 … -48.8 dBFS (the 1.2 s fade tail; music-only mean is -33); `alert()` fired inside that tail constructed **12 TAIKO@master**. The predicate reads "not live" while the recording is still audible. Small window, real, noted as a limit (nothing percussive is scheduled there by the game today: Lantern's `win()` has no drum).
- **INVALID in this run: every buffer-source count** (bigEat voices=0, boot voices=0 while a 146 s track was audibly playing). Cause: `AudioBufferSourceNode` overrides `start()` on its own prototype; the probe had hooked `AudioScheduledSourceNode.prototype.start` only. Caught because "boot voices = 0" contradicted `theme.srcs = 1`. Hook fixed (both prototypes) and the run repeated — run 2 below is the record for the whoosh; run 1's oscillator counts stand.
- CORRECTION to the line above about the four banners: that was MY bug, not the game's — `fire()` called `p.evaluate(js)` without forwarding the banner string, so `matchBeat(undefined)` fell to the `else lnNoticeSting(lt)` branch (`:3984`) four times. Fixed (argument forwarded) before run 2. The 5 × shime per notice sting stands; the gate/bathhouse stings are measured in run 2.

<!-- appended 6: the other drums, on disk -->
### "The gate now lives where a drum is MADE" — every percussive voice in the file that is written to `master`, read on disk
`grep -n "shime(\|clack(\|geta(\|nHit(\|mSnare(" src/proto3d/audio3d.ts | grep master`:
| voice | what it is (the file's own words) | body | master call sites | gated by 702a3e4? |
|---|---|---|---|---|
| `taiko` `:3142` | "The big drum" | sine 128→52 / 190→88 + skin noise | lnGateSting ×3, lnNoticeSting ×1, lnBathhouseSting ×9, lnLastSting ×12, lanternEvolve ×1 | YES |
| `bDrum` `:1937` | bass drum | sine 92→48 | bandLand, gamedayEvolve, kickoffSting, bandOnSting, fourthQuarterSting, Game Day generic beat `:3971` | YES |
| `shime` `:3152` | "The small rope-tuned drum that keeps the actual time" | sine 640→380 (0.09 s) + noise 0.05 s | lnNoticeSting **×5** (`:3538`) | **NO** |
| `mSnare` `:1925` | marching snare | noise 0.07 s + triangle 195→160 | bandLand `:2450`, Maple roll **×7** `:2487`, `:2501`, `:2514`, gamedayEvolve `:2998`, bandOnSting **×6** `:3015`, fourthQuarterSting **×10** `:3033` | **NO** |
| `nHit` `:962` | filtered noise hit | noise | concessionSting **×5** `:3026`, `:1699` | **NO** |
| `clack` `:3175` / `geta` `:3189` | wood clappers / sandals | noise + square 1900→1200 | lnGateSting ×2, lnLastSting ×1 | NO (arguably not "a drum") |
| `pwDrum` `:3622` | "a soft low drum" | sine 120→48 | via pwBus (see the Powder section) | NO, by the governor's decision |
| `pop()` sub `:4109` | 52→30 sine on every bite > depth 0.35 | sine | master | NO (flagged by the crew, not proposed) |
Every world with a recording (`public/assets/music/`: maple, pirate, gameday, lantern, powder, menu — all present) therefore still has ungated percussion on master: on Lantern the five-stroke shime pattern inside `lnNoticeSting` (fired by `matchBeat` for "drum/tower/start" banners AND as the fall-through for any unmatched banner, `:3982-3984`); on Game Day a six-stroke and a ten-stroke snare roll with the bass drum removed from under them. The commit's sentence "a new sting cannot route around it and still be a drum" is true only for the two voices it gated; two existing drum voices already route around it. Measured for Lantern in run 2 (shime count per banner) — Game Day queued as run 5.
