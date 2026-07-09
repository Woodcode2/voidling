---
name: VOIDLING Stage Personality System
description: Per-stage body colors, swirl hues, bob amplitude, blush suppression, voice lines, and evolution flash added in Task #4.
---

## Stage palette (voidling.ts _STAGE_BODY / _STAGE_SWIRL)
Each form (0–4) has a unique gradient identity baked into `drawProceduralBody`:
- 0 VOIDLING: soft indigo `#1A1040→#2D1B68→#4535A0` + indigo-lavender swirl
- 1 MUNCHER: warm plum `#28104A→#4B1E78→#7A38A0` + pink-lavender swirl
- 2 GOBBLER: hot magenta `#28083A→#601060→#9C2090` + hot-pink swirl
- 3 DEVOURER: deep crimson `#1E0418→#4C0828→#841445` + blood-rose swirl
- 4 WORLD ENDER: abyss `#040212→#0C0630→#181055` + cold-starlight swirl

**Why:** The body gradient was previously a single flat purple for all stages — transformation felt like growth without identity change.

**How to apply:** Both arrays are module-level constants in `voidling.ts`; index with `Math.min(form, 4)` before any gradient/swirl draw call.

## Blush suppression (voidling.ts drawFace)
- `_blushMult`: DEVOURER+(form≥3)→0, GOBBLER(form=2)→0.45, else→1
- Applied as a multiplier on the final `blushA` alpha so normal skin extraBlush values are respected.

## Bob amplitude (player.ts)
`_BOB_AMP = [0.034, 0.040, 0.028, 0.018, 0.010]` indexed by formIndex.
VOIDLING bounces eagerly, MUNCHER most bouncy (hungry), GOBBLER steady strut, DEVOURER heavy, WORLD ENDER barely moves.

## Stage voice lines (engine.ts)
`_VOID_VOICE[form]` — 4 lines per stage, fires every 22–40 s via `_voidVoiceTimer`.
Bubble drawn in world-space above player with ctx.save/restore pair and fade-in/out.
State reset (`_voidVoiceTimer=18000, _playerBubbleText=null, _playerBubbleLife=0`) in round-start init block (~line 505).

## Evolution color flash (engine.ts)
`_STAGE_FLASH[form]` — stage hue flashed as a screen-space overlay (0.42 peak alpha, power-law decay over 450 ms) when `triggerEvolution()` fires.
`_evolveFlashT` is decremented in the render function (not simulate) using `frameDt`.
Reset in round-start init block.

## Pause safety
`_voidVoiceTimer` and `_playerBubbleLife` are decremented inside `simulate()`, which is gated by `!paused` — they naturally pause with the game.
