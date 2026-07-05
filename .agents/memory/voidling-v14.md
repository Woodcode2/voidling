---
name: VOIDLING v14 Quality Bar
description: Key decisions and gotchas from the v14 refactor — accretion orbit, real audio, high-rate input, onboarding.
---

## Accretion Orbit (player.ts)
- Growth and score are DEFERRED: `absorbObject()` captures the item and pre-computes `gain`, but calls NOTHING on the void. `finalizeOrbitItem()` applies `absorbObjectMass()` + score once spiralT ≥ 1.
- If you ever add a new call path that captures objects, it MUST follow the same deferred pattern or players will get double-credit.
- OrbitItem cleanup: items are spliced out of the `orbit[]` array inside `tickOrbit()` after `finalized && spiralT >= 1`. If you add new item states, extend this guard.
- Auto-fuse (TRIPLE): triggers when 3 items of the same kind are simultaneously in spiral phase. `checkAutoFuse()` runs after each finalize.
- Capacity enforcement: when `orbit.length >= ORBIT_MAX` the oldest spiral item is force-finalized synchronously.

## FxEvent null-guard rule
- `captureStart` events and any FxEvent with coordinates must be guarded: `if (ev.x != null && ev.y != null)` before passing to fx.addRing / any rendering call.
- The FxEvent interface defines x/y as required, but the pendingFx drain loop must still guard because future callers may omit them.

## Audio sample loader (audio.ts)
- `loadSamples()` sets `_samplesLoaded = true` at entry (not on completion) to prevent parallel fetches. A second call while the first is in-flight returns immediately — synth fallbacks cover the gap.
- `_playSample(name, rate, vol)` returns `true` if the sample was scheduled, `false` if not found/not loaded. The `||` synth-fallback pattern relies on this boolean return — do not change the return type.
- `audio.loadSamples()` is called from `engine.start()` with `.catch(() => {})` — async, non-blocking. Audio init (`audio.init()`) must still come first.

## High-rate input (input.ts)
- Uses `pointerrawupdate` where available, falling back to `pointermove`. Boot log confirms which path is active.
- `e.getCoalescedEvents()` is called on every move event to consume all sub-frame samples — do not skip this in refactors.
- All preventDefault() listeners registered with `{passive: false}`. All listeners cleaned up in `destroy()`.

## Onboarding / Splash (UILayer.tsx)
- Splash: `hasSplash` starts `true` (optimistic); `onError` on the `<img>` sets it `false` and falls back to StarField. The slow-zoom uses a CSS transition (`transform 2s ease-out`, 1.0→1.04 scale) triggered by `zoomed` state on next rAF.
- Onboarding panels: 3 panels with sprite icons that `onError` hide themselves — no hard dependency on object sprites being present.
