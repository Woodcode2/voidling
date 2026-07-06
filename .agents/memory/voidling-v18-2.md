---
name: VOIDLING v18·2 War Pack
description: Four-pillar War Pack update — new sprites, predation overhaul, defense waves, powers overhaul. BUILD_STAMP v18·2.
---

## What changed (War Pack)

### §1 New Art (wardSprites.ts)
- `wardSprites.ts` loads 3 sprite sheets at runtime and injects sliced `HTMLCanvasElement` entries into `objectSprites`.
- `objectSprites` type widened to `Map<string, HTMLImageElement | HTMLCanvasElement>` in sprites.ts.
- Draw path in world.ts uses `instanceof HTMLImageElement` guard: `naturalWidth/naturalHeight` for images, `width/height` for canvases.
- 9 person kinds replace old `'person'` in spawn tables via `scatterPeople(b, rand, zone, n)` private helper on WorldManager.
- Static person pool arrays are `private static readonly` on WorldManager class.
- 6 new vehicle kinds; `spawnCar` uses a `TRAFFIC_POOL` array; parked-car array also extended.
- 5 beach/park props added; fillBeach, fillPark updated.
- All new kinds added to `LIVING_KINDS`, `FLEEING_KINDS`, `LIVING_ORBIT_KINDS`, `KIND_INFO`, `ObjectKind` union.

### §2 Void Predation Overhaul
- `RIVAL_EAT_RATIO` changed from 1.15 → 1.3.
- 30 s grace period in `resolveVoids()` (`if (roundElapsed < 30000) return`).
- Player-eats-rival: rival loses 50 % of score, player gains that (was hearts-based escalation).
- Rival-eats-player: flat 25 % steal (was hearts-based 25–50 %).
- Rival rim color: gold `#FFD23F` for edible (was green), red for danger; detection range 2.0 screen widths (was 1.5).
- Rival-on-rival kills show random trash-talk banners.
- Final 60 s aggression spike added in `rivals.ts aggressionFrom()`.
- Defense waves: world.objects with `defense = true` flag; `spawnDefenseUnit(kind, x, y)` on WorldManager.
- Defense wave triggers at 5%/20%/35% of `eatenArea / initialMass`.
- `DEFENSE_POLICE_THRESH`, `DEFENSE_ARMY_THRESH`, `DEFENSE_FULL_THRESH`, `DEFENSE_MAX_UNITS`, `DEFENSE_UNIT_SPEED`, `DEFENSE_PELLET_SPEED`, `DEFENSE_PELLET_COST`, `DEFENSE_PELLET_CD`, `DEFENSE_WAVE_CD` added to CONFIG.
- Pellets: `Array<{x,y,vx,vy,life}>` in engine.ts; break combo, cost 20 pts, red flash.
- `pelletCd?: number` and `defense?: boolean` added to WorldObject interface.
- `world.ts update()` skips `stepLiving` for defense units (`!obj.defense` guard).
- Defense unit steering, pellet motion, and pellet cooldowns all use `twDt` (respects TIME_WARP).

### §3 Powers Overhaul
- Old 5 spells (garlic/freeze/switcheroo/puny/bubble) removed.
- New 4 powers in `CONFIG.SPELLS`: event_horizon, wormhole, time_warp, singularity.
- `spellTimerMax` state var added alongside `spellTimer`; both in Snapshot for HUD sweep.
- WORMHOLE is instant: no `activeSpell` state; dash + 500 ms ghost.
- SINGULARITY: black hole object `{x, y, timer, score}` in engine state; `spellTimer` synced from `singularity.timer` each tick.
- TIME_WARP: `twDt = dt * 0.4` passed to rivals.update(), world.update(), defense systems. Player gets full `dt`.
- EVENT_HORIZON: `player.suctionMult = 2` during tick (reset to 1 at start of boon block); `player.magnetMultiplier` boosted to 2.5.
- `player.suctionMult = 1` added as reset in Player.reset() and at boon-magnitude block in engine.ts.
- `world.ts` suction acceleration multiplied by `player.suctionMult`.
- Power button (UILayer): shows when `heldSpell || activeSpell`; conic-gradient sweep when active; power-specific icons + colors.
- Active spell ring drawn around player in world space.
- TIME_WARP blue edge vignette (screen space, after ctx.restore).
- Pellet hit red flash (screen space).

## Watch-outs
- `worldManager.eatenArea` and `worldManager.initialMass` already existed as public fields before this patch; `eatenArea` is incremented in `consumeByPlayer`. `initialMass` was frozen in `init()` via `this.initialMass = this.totalStartArea`.
- `singularity.timer` is decremented in the singularity block; `spellTimer` is set to `singularity.timer` each tick for HUD sync. The general spell tick skips `activeSpell === 'singularity'`.
- wardSprites.ts has a `_loaded` guard so the sheet load runs at most once per page load even if `start()` is called multiple times.
- The wardSprites background-stripper flood-fills from all four corners only on near-white pixels (RGB > 220).
