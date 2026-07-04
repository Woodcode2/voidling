---
name: VOIDLING architecture
description: How the VOIDLING .io game (artifacts/3d-game) is structured — engine snapshot API, canvas vs DOM split, world/eating model, and the units/timestep contract.
---

# VOIDLING architecture

React DOM renders menus (`ui/UILayer.tsx`); the canvas renders the arena + HUD only. `createGame(canvas)` returns an engine (`game/engine.ts`) exposing `getSnapshot()/subscribe()/start()/togglePause()/...`. The engine notifies subscribers only on discrete state changes (screen switch, pause, coins), never per-frame — the canvas loop runs independently via `requestAnimationFrame`.

## Units & timestep (easy to get wrong)
- **World units == pixels.** The map is `CONFIG.MAP_SIZE` px square.
- The fixed-step loop passes `dt` in **milliseconds** (`FIXED_DT ≈ 16.67`). All v4 movement/physics constants are **px/second**, so every system converts with `dtSec = dt / 1000`. Mixing ms and px/s silently makes things ~16x too fast/slow.
- Game runtime may use `performance.now()` / `Math.random()` freely — durability only matters inside the CodeExecution sandbox, not app code.

## World & eating model (`game/world.ts`)
- Arena is a procedurally-drawn 3×3 block neighborhood ("Maple Court"): residential/park/plaza/landmark blocks, roads between them, `drawGround()` paints asphalt/lawns/sidewalks/pond, `draw()` y-sorts objects.
- **Player eats via a gravity well**, not contact: object within `CAPTURE_RADIUS_MULT·radius` is `captured`, accelerates toward the player (`SUCTION_ACCEL`, capped `SUCTION_MAX_SPEED`), absorbed at `ABSORB_RADIUS_MULT·radius`; it *escapes* if the player leaves. **Rivals eat by pop-on-contact** (different model). A captured object is skipped by the rival loop so it can't be double-eaten.
- Non-edible (too-big) objects are solid: push the player out along the normal + tangential slide, with a `tooBigCd`-gated shake/ring/vibrate. **Recompute the collision normal AFTER living-AI movement each frame** — using the pre-movement distance makes moving cars/people jitter.
- Water tower is a solid obstacle until `player.radius >= WATERTOWER_EAT_RADIUS`, then it's edible and fires the finale.

## Cross-round state
- `start()` must reset every accumulator or state leaks between rounds: `roundElapsed`, `slowmo`, `paused`, `coinBonus`, fx buffers (particles/texts/**rings**), and snap the camera onto the player.
- **Finale coins**: accrue to `coinBonus` only; the single grant happens in `endRound` (`coins = base + coinBonus`). Do NOT also `meta.addCoins` in the finale trigger — that double-awards.
- **Pause must freeze all time-based systems**, not just `simulate`: gate `slowmo` decay, `fx.update`, and HUD banner-lifetime decrements behind `!paused`.

## Camera
Center-based with `CAM_LERP` follow + `CAM_DEADZONE` (screen px → world via `/zoom`) and `ZOOM_LERP` toward `PLAYER_SCREEN_TALL/(2·radius)`. Render transform: `translate(fw/2+shake, fh/2+shake); scale(zoom); translate(-camCenter)`. `fx.draw(ctx)` runs INSIDE that transform (world space); `fx.drawFlash` runs after (screen space).
**Why note this:** the literal `PLAYER_SCREEN_TALL=100` makes early game very zoomed-in (player ~100px), so a lone frame on a wide road can look sparse — that's intended, not a bug.
