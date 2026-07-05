---
name: VOIDLING v15 The Law, The Spells, The Zoo
description: v15 changes — Growth Law, orbit parity, spells, contactScale, ZOO/TOWNHALL, debug panel
---

## §0 Growth Law
- `void.ts`: module-level `_roundElapsedSec`, `setRoundElapsed(ms)` export. `grow()` computes `lawCeiling = GROWTH_LAW_BASE + GROWTH_LAW_RATE * t`, logs `[LAW] clamped {name} at t={s}` on any blocked absorb. Uses UNCAPPED `growRadius()` result then checks overshoot — do NOT pass lawCeiling as the max into growRadius or the log is unreachable.
- `engine.ts`: calls `setRoundElapsed(roundElapsed)` AFTER `roundElapsed += dt` each simulate tick.
- Orbit parity: `Void.captureObject(objSize, score)` + `Void.tickCaptures(dt)` on base class. `Rival.eatObject()` calls `captureObject` (no instant `absorbObjectMass`). `Rival.update()` calls `tickCaptures(dt)`.
- Bot skin weight: 2× toward unowned (was 3×).

## §1 Collision truth
- `CONFIG.CONTACT_SCALE = 0.90`, `CONFIG.CONTACT_SCALE_OVERRIDES = { tree:0.85, house_a:0.85, house_b:0.85, skyscraper_a:0.80, skyscraper_b:0.80 }` (both in config.ts).
- Rival eat check: `effSize = obj.size * csR` applied to the `0.4` boundary.
- Hitbox drawing: in world-space (camera transform still active); just use `ctx.arc(obj.x, obj.y, obj.size * cs, ...)` directly. No manual screen coord calculation inside the world-transform save/restore block.
- HITBOXES toggle: `engine.toggleHitboxes()` → `snap.showHitboxes`, drawn in render loop.

## §2 Music infrastructure
- `audio.ts`: `_musicTracks`, `_activeTrackSrc`, `_activeTrackGain` fields. `loadMusicTracks()` tries `/assets/music/track_1–4.ogg`; falls back to synth if absent. `playMusicFile(idx)` does 2s crossfade loop.
- Music assets dir: `public/assets/music/` (empty for now; synth fallback active).

## §3 Spells
- `config.ts`: `BoonDef` extended with `spell?: boolean; color?: string`. `CONFIG.SPELLS` array with 5 entries (garlic/freeze/switcheroo/puny/bubble), each with `id/name/desc/color`.
- `engine.ts`: `chooseBoon()` detects `id.startsWith('spell_')` → holds in `heldSpell`; standard boons unchanged. `openBoonPick()` inserts one spell slot at 50% probability. Bot spell AI: 45% chance each bot applies PUNY BEAM on player (other spells are self-buff no-ops).
- `castSpell()`: all 5 branches. SWITCHEROO is instant (swap pos, clear activeSpell). PUNY BEAM is instant (85% radius, log). GARLIC/FREEZE/BUBBLE have timers. Spell effects tick in `simulate()`.
- `Snapshot`: `heldSpell: BoonDef | null`, `activeSpell: string | null`, `showHitboxes: boolean`, `radii: Array<{name,radius,mass,score,overLaw}>`.
- `UILayer.tsx`: Boon cards with teal gradient + `✨ SPELL · TAP TO HOLD` label when `b.spell`. SPELL button 72×72 teal bottom-right when `snap.heldSpell` is set, calls `engine.castSpell()`.

## §4 Living town
- `world.ts`: `BlockType` extended with `'zoo' | 'townhall'`. Layout: `(gx=3,gy=0) = zoo`, `(gx=4,gy=1) = townhall` (replaced residential blocks).
- `fillZoo()`: lush green zoo with pond (duck home), 6 trees, 12 flowers, animals, gnomes, zoo=true on block.
- `fillTownHall()`: paved civic plaza, fountain, 8 persons, benches, food carts.
- Zone tints: zoo `rgba(80,210,120,0.11)`, townhall `rgba(255,195,90,0.08)`, park tint boosted to `0.08`.

## §5 Quick wins
- Splash: 4500ms (was 1800ms).
- Build stamp: `v15 · 1`.
- `@keyframes vd-spell-pulse` in `ui.css`.

## Debug panel
- `SoundBoard` now accepts `{ snap, engine }` props. Shows: RADII section (2×/sec via setInterval), HITBOXES checkbox, MUSIC gain sliders, SPELL STATE, SOUNDS grid.
