---
name: VOIDLING audio + lifecycle
description: How VOIDLING's procedural audio is structured and the teardown rule that keeps it from leaking.
---

# VOIDLING audio (`src/game/audio.ts`)

Single `audio` object literal with two master gain buses routed to `ctx.destination`:
- **SFX bus** (`sfxGain`) — all one-shots (gulp-pop absorb, merge chord + noise sweep, descending "wah" on death, per-family signatures).
- **MUSIC bus** (`musicGain`) — procedural loop only.

Toggles `sfxOn` / `musicOn` are independent and persisted to localStorage (legacy single `voidling_muted` still read as a fallback for SFX). `muted` is a getter = `!sfxOn` for backward compat with the home-screen sound button.

The music is a **lookahead scheduler**: a `setInterval` (25ms) schedules WebAudio nodes ~0.1s ahead by stepping through a 64-eighth (8-bar) loop. `startMusic/stopMusic/pauseMusic/resumeMusic` manage the interval; `duckMusic` ramps the bus down and back; `setMusicIntensity(combo)` brightens hats/pad at combo ≥ 2.

## Lifecycle rule (why this file exists)
**Any long-lived scheduler/interval started by the engine MUST be stopped in `createGame().destroy()`.**

**Why:** `startMusic()` is called from `engine.start()`. `destroy()` originally only cancelled the rAF + listeners, so unmounting mid-round left the `setInterval` running and it kept scheduling audio nodes forever (a real resource leak flagged in review). Fix was adding `audio.stopMusic()` to `destroy()`.

**How to apply:** when adding any new timer/interval/animation driver to the game, wire its teardown into `engine.destroy()` in the same change.
