# VOIDLING — MUSIC BRIEF

You are taking over the music system of a children's 3D mobile game that is
being held to top-10 App Store standard. Everything below is measured. Where a
previous diagnosis was wrong, the retraction is included — the wrong version is
persuasive and you will re-derive it otherwise.

Read `docs/FABLE-BRIEF.md` first for the game, the rules and the probe
conventions. This brief covers one subsystem and assumes those.

---

## THE JOB, IN ONE SENTENCE

**A child opens VOIDLING and music is playing, and it does not stop until they
close it.** Not on the menu only. Not once the download finishes. Not after
they happen to touch the right thing. From the first legal instant of the
session to the last, there is a score.

The owner has reported this broken four times. Each round shipped a real fix
that measured correct in every environment reachable from a build machine and
still failed on his daughter's iPhone. Treat that history as the primary
evidence: **the fault is somewhere the existing instruments do not look**, and
your first job is to make it look there.

---

## THE ONE THING THAT IS PHYSICALLY IMPOSSIBLE

No browser will produce sound before a user gesture. iOS, Android, desktop —
all of them. There is no flag, no manifest entry and no trick that is worth
having; the ones that exist are the ones App Review rejects.

So "music from the moment they open the game" cannot mean "before they touch
the screen". It has to mean **the first touch is early, known, and unmissable**
— which is a design problem with a clean design answer. See Task 1.

Everything after that first touch is an ordinary engineering problem and there
is no excuse for a silent frame.

---

## WHERE IT STANDS

Already built and verified — do not redo these, but do not assume they are
sufficient either:

- Five licensed tracks ship: `public/assets/music/{menu,maple,pirate,gameday,lantern}.mp3`,
  128 kbps, 11.5 MB total.
- Both the menu track and the current world's track are fetched and decoded
  during boot, and preloaded from `<head>` before the bundle parses.
- The loop is an equal-power crossfade (`THEME_FADE = 1.6s`), not a `loop=true`
  seam.
- `startLoop()` refuses to schedule against a suspended clock; the repair is
  driven by the AudioContext's own `statechange`, not a frame-loop poll.
- iOS `'interrupted'` (phone call, Siri, lock) recovers — regression-tested.
- Each world's hand-written synth bed covers the download and hands over to the
  recording across 1.2s.
- A silent one-frame buffer is started inside the first gesture (the iOS
  output-prime that a resumed context still needs).

**And the owner still reports it only works after he pauses.** The pause sheet
does not touch the audio engine — `resume()` sets a flag and hides an overlay —
so "pausing fixes it" can only mean the taps, the backgrounding, or the
seconds. That is as far as reasoning gets. Go and measure.

---

## STEP ZERO: GET DATA OFF THE DEVICE

`?audio=1` puts the live engine state and an ordered event log on screen with
three buttons. Use it, and get the owner to use it, before writing a line of
code.

    voidling-3d-game-ruby.vercel.app/?audio=1

- **TEST TONE** — can this page make *any* sound? If this is silent the fault
  is the context, the in-game mute, or **the iPhone's ring/silent switch**,
  which mutes WebAudio in Safari and nothing else. No music-engine work will
  ever be heard, and the product answer is an in-game warning, not a fix.
- **RESTART MUSIC** — forces the repair by hand. If this works, the *trigger*
  is wrong and the engine is fine.
- **UNMUTE** — rules out the setting.

The event log is `audio.musicLog()`; the state is `audio.musicState()`.

If you can get a device on a debugger, do. If you cannot, extend the overlay
until it answers whatever you are about to guess at.

---

## THE AUDIO ITSELF IS WRONG, AND HERE ARE THE NUMBERS

This is the owner's other request — *"if the song has a slow start, trim it a
tad"* — and it is worse than he thinks. Measured with ffmpeg, RMS in 0.5s
windows over the first six seconds, dBFS:

    track      0.0   0.5   1.0   1.5   2.0   2.5   3.0   3.5
    menu      -inf   -45   -24   -28   -28   -24   -29   -27
    maple      -49   -26   -25   -26   -27   -25   -26   -26
    pirate     -23   -21   -22   -21   -21   -20   -19   -18
    gameday   -inf    -9   -13   -17   -23   -29   -33   -35
    lantern    -21   -26   -21   -20   -22   -20   -20   -21

Three separate defects live in that table.

**1. The menu theme opens with a full second of nothing.** Silence for 0.5s,
then -45 dBFS — inaudible on a phone speaker in a room with a child in it. The
track that exists to prove the game has music is quiet for the first second of
every session. This alone could account for a large share of "the music isn't
loading": it *is* loading, and then it says nothing. Maple, the first world
anyone plays, does the same for half a second.

**2. Game Day opens with a transient 20 dB above its own body** — a -9 dBFS hit
at 0.5s decaying to -33 by 3.5s. On a crossfade loop that stinger re-fires
every pass, and it is a cymbal to the face every 3 minutes 24 seconds.

**3. The five tracks are not level-matched.** Integrated loudness:

    pirate   -12.5 LUFS      gameday  -15.8 LUFS      lantern  -17.0 LUFS
    menu     -14.1 LUFS      maple    -19.9 LUFS

A **7.4 LU spread**, and the quietest is Maple — the world every child plays
first. A parent sets the volume on Maple and gets a faceful on Pirate Bay.
That is not a mix, it is five files in a folder.

---

## THE WORK

Ordered. Each item states how it is judged. Do not mark one done without the
measurement.

### 1. Close the activation hole — a TAP TO BEGIN gate

The only way to guarantee music at a known moment is to guarantee a *gesture*
at a known moment. Put a deliberate, designed, full-bleed **TAP TO BEGIN** over
the splash art. It is the first thing the child touches, it unlocks audio
inside a real gesture handler, and the theme starts on that frame.

This is not a workaround, it is what shipped games do, and it converts an
unknowable ("when will they first touch something?") into a guarantee. It also
gives the first frame of music a designed moment to land on instead of
arriving under a menu the child is already reading.

Make it feel like part of the game — the void blinking awake, the title
settling. Not a browser dialog.

**Done when:** time from that tap to the first audible sample is **≤ 150 ms**,
measured on a device, with the buffer already decoded.

### 2. One music director for the whole session

Music is currently started and stopped from a handful of call sites keyed off
`body.menu` and match state. Replace it with a single director owning one state
machine — BOOT → MENU → MATCH(world) → RESULTS → MENU — with declared
transitions and crossfade times.

Requirements:
- The menu theme does **not** restart when moving splash → picker → shop →
  sticker book. It is one continuous piece across the whole front of house.
- Match start crossfades menu → world. Match end crossfades world → menu,
  under the results card, without a gap.
- Exactly one music source is audible at any instant. Prove it.

**Done when:** a probe walks splash → picker → shop → book → match → results →
menu and asserts the music node count never exceeds one and never hits zero.

### 3. Kill the world-switch reload

`location.href = location.pathname` (`prototype3d.ts`) throws the page away to
change world. It discards the running audio, the decoded buffers, the HTTP
connection and the user activation, and the page that comes back starts a match
one frame later with no gesture on it. **It is the single largest structural
obstacle to continuous music** and it is also why every music bug has been
hardest on the three non-Maple worlds.

Rebuild world switching in place. If that is genuinely too large, say so with
evidence and instead make the reload survivable: hand the audio state across in
`sessionStorage` and re-establish inside the first gesture on the new page.

**Done when:** switching world does not reload, or `qa/autoplay.mjs` shows
music continuous across the switch.

**Resolution (executed):** rebuilt-in-place was assessed and declined with
evidence: the world is baked into module evaluation (`setWorld` runs before
five top-level awaits and the whole island builds during import), so in-place
switching is a rearchitecture of the module's boot, not a fix. The shipped
answer is the survivable reload: the new page preloads its own world's track
from `<head>` before the bundle parses, lands on **TAP TO PLAY**, and the tap
is the gesture that starts a scored match. `qa/switch.mjs` walks the owner's
exact path and gates on it — including the deadlock it caught on first run,
where the loading cover sat over the gate forever.

### 4. Never a silent frame — layered fallback

Order of preference at every instant: the recording, else the synth bed, else
nothing is acceptable — there is no third case. The bed already exists and
already hands over; verify it holds under:

- a cold HTTP cache on a throttled connection (`--slow`),
- a decode failure (corrupt the file and check),
- a world with no recording at all (delete one and check).

**Done when:** `qa/autoplay.mjs <world> --slow` reports a covered gap for all
four worlds, and the handover is inaudible.

### 5. Trim, level and loop every track properly

This is the owner's explicit ask and the table above is your starting point.

Build `qa/trackprofile.mjs` first — it must report, for any file: head silence
at -40/-30 dBFS, the 0.5s RMS ramp, integrated LUFS, true peak, and a proposed
`trimStart` / `loopStart` / `loopEnd`. Every judgement below comes from it, and
it must still work for the next track the owner drops in.

Then, per track:

- **Trim the head** so the first audible bar is at t=0. Cut at a zero crossing.
  A track that opens on a deliberate swell keeps the swell — the target is
  *no dead air*, not *no intro*. Judge by the ramp table, not by eye.
- **Normalise to a common target.** −16 LUFS integrated, true peak ≤ −1 dBTP,
  is the mobile-game convention and leaves headroom for the SFX bus and the
  limiter already on master. Use `loudnorm` two-pass, not single-pass.
- **Define the loop region.** A crossfade loop that replays a one-off intro
  every pass is a tell. Set `loopStart` past the intro and `loopEnd` at a
  musical boundary; `AudioBufferSourceNode.start(when, offset)` and
  `loopStart`/`loopEnd` are the mechanism. Game Day's opening stinger (defect 2
  above) is the clearest case: it should play once, on entry, and never again.
- **Store the offsets in a manifest**, not in code. A future track should need
  a JSON row, not an edit to the engine.

Keep the originals recoverable and record every transformation in
`public/assets/music/CREDITS.txt` — it is a rights document and it is already
one round behind. **Do not re-source or replace any track**; the licence rule
in `FABLE-BRIEF.md` is absolute and the owner supplies music.

**Done when:** every shipped track profiles at head silence < 60 ms, integrated
loudness within ±1.0 LU of target, true peak ≤ −1 dBTP, and the loop seam
measures no discontinuity above the noise floor.

### 6. Survive everything a phone does

Regression-test each, in `qa/`:

- incoming call / Siri / lock → `'interrupted'` → return (covered today, keep it)
- background 60 s → foreground
- headphones unplugged mid-match (iOS suspends the route)
- silent switch flipped on — **the brief was WRONG that this cannot be fixed.**
  The switch silences WebAudio in Safari but not HTMLMediaElement playback;
  keeping a looping silent inline `<audio>` element alive (started inside a
  gesture) takes the Playback audio session, and WebAudio then routes through
  it and sounds with the switch on. This is the mechanism unmute.js ships to
  thousands of web games, it is now implemented (`promoteSession` in
  audio3d.ts), and it is the strongest single candidate for the owner's whole
  saga. It pauses when the page hides so the game never holds the audio
  session in the background. `musicState().media` reports it; ?audio=1 shows it
- low power mode
- a second tab of the game

**Done when:** each has a named probe that fails on the pre-fix build.

### 7. Mix like a game, not a playlist

- Duck the music under the newsroom stings, the evolve fanfare and the win/lose
  cue — a few dB, 120 ms in, 400 ms out. It should feel like the score making
  room, not like a volume knob.
- Check the balance on a phone speaker, which is what this is played on. The
  existing `MASTER_VOL` and per-world bus levels were tuned before the
  recordings landed and are almost certainly wrong now.

**Done when:** measured peak of music-plus-sting never clips the master
limiter, and the ducking is audible in a rendered capture.

---

## THE INSTRUMENTS

| probe | answers |
|---|---|
| `qa/autoplay.mjs` | **does music actually start?** `--slow` (is the wait audible as silence?), `--interrupt` (does a call wedge it forever?) |
| `?audio=1` | the live engine and its event log, on a real device |
| `qa/music.mjs` | which file is wired to which world — **and nothing else** |
| `qa/smoke.mjs` | boots, loads, grows, eats, makes sound. Run before every push |
| `qa/trackprofile.mjs` | head/tail silence, loudness, true peak, ramp, proposed manifest row for ANY audio file. `--gate` enforces the task-5 spec |
| `qa/journey.mjs` | the continuity walk: always a score, never two, menu theme starts once across the whole front of house |
| `qa/switch.mjs` | the world-switch reload, end to end — the owner's exact reported path |
| `qa/fallback.mjs` | a 404 slot and an undecodable file both land on the synth bed, audibly |

**`qa/music.mjs` cannot tell you whether anything made a sound.** It launches
Chromium with `--autoplay-policy=no-user-gesture-required`, so the page gets a
running clock from frame one. Every green run it has ever produced is
compatible with total silence on a phone, and for four rounds it printed
`RECORDING` while the owner heard nothing.

Note for any new probe: **dropping that flag does not help.** Headless Chromium
in this sandbox reports `running` at every autoplay-policy setting there is —
verified across four. `qa/autoplay.mjs` therefore enforces the rule *inside the
page*: really suspended, `resume()` really refused until a trusted gesture,
`state` reporting suspended until then. Copy that pattern; do not re-discover it.

---

## RETRACTIONS — DO NOT RE-DERIVE THESE

Every one of these was asserted confidently, some of them in commit messages,
and every one was wrong. They are all still persuasive.

1. **"The watchdog never runs at the splash."** It runs. The period was counted
   in `dt`, which is clamped to 0.05, so "every 2 seconds" was "every 40
   frames" — one call every 44 s at the harness's 0.9 fps, and every 2 s on a
   real phone. A harness artifact generalised into a claim about the game. Now
   on wall time.
2. **"The synth bed is the fallback."** It was reachable only when the fetch
   *failed*. The day real tracks shipped the fetch started succeeding slowly
   instead of failing fast, and the bed became dead code while matches played
   in silence. Check what your fallbacks are actually conditioned on.
3. **"There is no shared stop for the synth."** `stopTown`, `stopTropical`,
   `stopGameday` and `stopLantern` all exist and `stopMusic()` calls all four.
   The comment claiming otherwise blocked the right fix for weeks.
4. **"Pirate Bay times out because swiftshader is slow."** The world card was
   locked; a locked card refuses the tap by design. Raising the timeout twice
   could not have worked.
5. **"A 200 means the file is there."** The preview server answers unknown
   paths with `index.html` at 200. Check content-type and length.
6. **The hat occlusion probe** measured the hero *walking away* between frames
   because `?len=` puts the game in attract mode. Any probe that diffs two
   frames must hold the subject still.

The pattern is the same every time: **an instrument that could not see the
failure reported success, and the reasoning built on top of it was fluent and
wrong.** When an instrument and a human disagree, the instrument is the suspect.

---

## RULES THAT DO NOT BEND

Inherited from `docs/FABLE-BRIEF.md` — read them there — plus, for this work:

- **Never re-source or substitute a track.** CC0 / Public Domain / Pixabay /
  Kenney / Mixkit / Sonniss only, and music is the owner's to supply. You may
  trim, level and loop what is there; you may not replace it.
- **`CREDITS.txt` is a rights document.** Every transformation gets a line. It
  currently carries five rows marked `SOURCE URL MISSING` — that is an open
  item against the owner, not licence to invent sources.
- Run `qa/smoke.mjs` and read the output for PASS before every push. Push to
  `main` is a deploy.
- Do not open a pull request unless asked.

---

## EXECUTION LEDGER — 2026-08-19

What the first execution pass shipped, so nobody re-does or re-trusts it blind:

| task | state | evidence |
|---|---|---|
| 1 gate | **shipped** | `#tapGate`, both boot paths; tap→schedule measured from the in-page log; menu chrome stands down while gated |
| 2 director | **partial** | continuity + single-score asserted by `qa/journey.mjs`; the formal state-machine object was NOT built — the existing channel model plus idempotent `playTrack` met the probe's contract first |
| 3 reload | **survivable, not killed** | see the resolution note under task 3; `qa/switch.mjs` gates the owner's exact path |
| 4 fallback | **shipped** | `qa/fallback.mjs`: 404 and undecodable both land on the bed |
| 5 audio | **shipped** | re-mastered from 256k originals: heads 0ms, −16.4..−16.8 LUFS, TP ≤ −1.4 dBTP; Game Day's stinger plays once (`music-manifest.json` loopStart 4.0); `qa/trackprofile.mjs --gate` green |
| 6 phone | **partial** | interrupted + mute-switch defeat shipped and probed; background-60s, low-power and second-tab probes NOT built |
| 7 mix | **partial** | one duckable music bus, ducks under evolve/win/lose; the rendered-capture verification and a phone-speaker balance pass were NOT done |

Engine defects found and fixed during execution, none visible before it:

- the first pass of every loop faded in over the full 1.6s crossfade window, on
  top of a 1.2s channel ramp — three seconds of engine-made head silence
  stacked on the files' own. The crossfade-in now belongs only to loop seams.
- `playTrack` was not idempotent: the gate and the `body.menu` sync both asking
  for the menu theme restarted it a frame apart (journey caught starts=2).
- the reload path's loading cover was held above the gate it was waiting on —
  a permanent hang on every world switch (`qa/switch.mjs` caught it as an
  untappable gate).
- within 1.5s of a gesture, `startLoop` now schedules against a not-yet-running
  clock on purpose — the resume from that same gesture is in flight, and
  waiting for its promise put whole frames between the tap and the first note.

## DEFINITION OF DONE

A child picks up the phone, taps once, and hears music. They pick a world and
the music changes without a gap. They play, take a call, come back, and it is
still there. They finish, read their score under the theme, and go again. At no
point in that session is there a silent second, and at no point does anyone
have to touch a pause button to make the game work.

Then, and only then, the owner should not have to report this a fifth time.
