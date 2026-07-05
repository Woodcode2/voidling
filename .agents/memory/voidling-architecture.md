---
name: VOIDLING architecture
description: Overall engine/UI architecture for the VOIDLING game (artifacts/3d-game)
---

# VOIDLING Architecture

## Core pattern
React-DOM menus + HTML5 Canvas arena, joined by a `createGame()` engine that exposes a snapshot/subscribe API (notifies only on discrete state changes, never per-frame).

## World size (v12)
- MAP_SIZE = 4000, 5×5 grid (25 blocks), STRIDE = 800, MARGIN = 50
- TARGET_POPULATION = 800
- Block types: residential | park | plaza | playground | school | downtown | mixed
- DOWNTOWN blocks: gx∈{2,3} × gy∈{2,3} — contain skyscrapers, offices, street life
- Player spawns at map center (2000,2000); T1 edibles seeded around spawn in init()

## Skyscraper
- Edible only by player at radius ≥ CONFIG.SKYSCRAPER_EAT_RADIUS (125)
- Visual collapse FX: 3 shake pulses + debris shower + twin rings
- Rivals skip skyscrapers (same as watertower)
- Scores 3× via absorbObject multiplier

## Daily mods (v12 §4)
- 7 weekday mods (index = Date.getDay(), 0=Sun..6=Sat): zoom/gnome/golden/tiny/merge/frenzy/double
- **Critical**: reset dailyFrenzyWindow/dailyGoldenInterval/dailyZoomies/dailyAllTiny BEFORE the switch in start(), not in the bulk reset block afterward.
- **Critical**: in simulate(), compose daily effects with boon effects (multiply, not overwrite):
  - speedMultiplier = dailyZoomies × (1 + boon bonus)
  - twinMerge = hasBoon('twin') || (isDaily && dailyData?.id === 'merge')

## FINAL FEAST (v12 §2)
- Triggers at timeLeft ≤ CONFIG.FINAL_FEAST_MS (30000ms)
- Score steal: stealFrac = finalFeastActive ? 0.5 : 0.25
- Stolen score subtracted from rival, added to player via eatRival(rr, stolen)

## Screen flow
Snapshot.screen drives UILayer switch: home → (splash on mount 1800ms) → home | shop | dailyIntro | boon | game | results
- showSplash and showTrophies are local UILayer state, early-return before switch
- Trophy Room: 18 defs, reads snap.trophies.earned

## Snapshot
Includes: screen, coins, highScore, streak, equippedSkin, ownedSkins, level, xpInLevel, xpNext, boonChoices, results, daily, muted, musicOn, sfxOn, paused, trophies

## Sprite alpha bounding box (v12 §0)
- spriteBounds Map<string, {x,y,w,h}> (normalized 0..1) stored in sprites.ts
- draw() uses 6-arg drawImage with trimmed source rect to cut transparent padding
- Glow rings: 2 rings at r×0.05 step, max r×1.10 (was 3 @ r×0.12)
- drawFormBadge() moved AFTER fx.draw() so it's always on top in world space
