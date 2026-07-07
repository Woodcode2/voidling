---
name: VOIDLING Sound Pack Phase 6
description: Tone.js adaptive music + new SFX implementation decisions and gotchas
---

## Architecture

**Two separate audio systems** (deliberate — avoids AudioContext sharing complexity):
- **SFX bus**: raw WebAudio `sfxGain → ctx.destination`. All existing + new SFX functions.
- **Music bus**: Tone.js → `Tone.getDestination()` → browser output. Completely independent.

**Legacy scheduler kept as fallback**: `startMusic()` immediately starts the old `setInterval` scheduler, then `_startToneMusic()` does `await import('tone')` and kills the scheduler once Tone.js resolves. If import fails, legacy keeps playing.

## Tone.js Details

- A minor, 110 BPM, 8-bar loop
- 5 `Tone.Volume` nodes in `_toneVols[]`; layers 1–4 start `mute=true`, fade in via `setMusicForm(f)` → `_crossfadeToForm(f)` with `rampTo(db, 2)` over 2 seconds
- Danger layer: `_dangerVol` (Tone.Volume) + persistent sawtooth `triggerAttack` + LFO on volume
- Master filter `_masterFilt` (Tone.Filter 20kHz default) sits before `toDestination()`; TIME_WARP sweeps it to 400 Hz
- All Tone nodes pushed to `_toneDisposables[]`, fully disposed in `stopMusic()`

## Key Rules

**Danger layer** (`updateDanger(relDist)`):
- `_dangerMuteTimer: number | null` prevents per-frame setTimeout accumulation
- When unsafe: cancel pending timer, unmute, rampTo
- When safe: only schedule ONE mute timer (guarded by `_dangerMuteTimer === null`)

**toggleMute() semantics**: Silences BOTH SFX and Tone.js music (via `_toneModule.getDestination().mute`). Also sets `this.musicOn = sfxOn`. This is intentional — the HUD mute button is "silence all".

**`setMusicForm(f)`**: The old single-line version at line ~374 was removed to avoid duplicate; the new version handles Tone.js layer crossfade.

## New SFX Added

`playGulp`, `playFalloff`, `playWormhole`, `playEventHorizon`, `playSingularity`, `startTimeWarpFilter`/`stopTimeWarpFilter`, `playPredationEat`, `playPredationEaten`, `playBubblePop`, `playFinalTick(sec)`, `playPedPanic`, `startVacuumHum`/`stopVacuumHum`, `setVacuumActive(bool)`, `updateDanger(relDist)`, `play(event, params)`

## Engine Wiring Sites

| Audio call | Engine site |
|---|---|
| `playFalloff()` | `player.startFall()` |
| `playWormhole()` | castSpell case 'wormhole' |
| `playEventHorizon()` | castSpell case 'event_horizon' |
| `playSingularity()` | castSpell case 'singularity' |
| `startTimeWarpFilter()` | castSpell case 'time_warp' |
| `stopTimeWarpFilter()` | spell expiry `spellTimer <= 0`, when `activeSpell === 'time_warp'` |
| `updateDanger(relDist)` | simulate(), after `setMusicIntensity`, 1.5-screen-width rival check |
| `playFinalTick(sec)` | simulate(), when `timeLeft <= 10000` |
| `setVacuumActive(bool)` | simulate(), after world.update, check objects within reach |
| `playPredationEat()` | fx event 'eatRival' handler |
| `playPedPanic()` | world.ts, when vd.panicked = true |
| `playBubblePop()` | world.ts, when bubbleLife reaches 0 |

## UILayer

- `vd-hud-pills` flex container in GameControls holds pause + sound buttons side-by-side
- Pill buttons use `position: static` when inside `.vd-hud-pills` (overrides default absolute)
- Home component has `onPointerDown={() => engine.unlockAudio()}` for iOS AudioContext unlock
- `unlockAudio()`: calls `audio.init()` + dynamic `import('tone').then(T => T.start())`
