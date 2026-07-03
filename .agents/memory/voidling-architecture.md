---
name: VOIDLING architecture
description: The React-DOM-menus / canvas-arena split and engine snapshot API that VOIDLING is built on.
---

# VOIDLING engine ↔ UI split

VOIDLING (`artifacts/3d-game/`, preview path `/`) is a mobile-first Canvas 2D arcade PWA. Its UI is split two ways and joined by a single engine API:

- **React DOM renders ALL menus** (Home / Shop / Results / BoonPicker / DailyIntro) plus the in-game control buttons — every control is a real `<button>`.
- **Canvas renders ONLY the arena + HUD** (timer, score, leaderboard, boon icons, banners).
- They are connected by `createGame(canvas)` → `GameEngine` with `getSnapshot()`, `subscribe(cb)`, and control methods (`start / chooseBoon / buySkin / equipSkin / openShop / openDaily / goHome / toggleMute / destroy`). `App.tsx` subscribes and re-renders `UILayer` from the snapshot.

**Why:** Rendering menus/buttons on the canvas caused unreliable taps on mobile. Moving menus to real DOM buttons fixed tap handling and accessibility. Keeping the arena on canvas keeps the 60fps sim off React's reconciler.

**How to apply:**
- `engine.subscribe` must fire ONLY on discrete state changes (screen transitions, coins/skin/mute changes) — NEVER per frame — or React re-renders at 60fps during gameplay. Keep `notify()` calls out of the rAF loop.
- The in-game overlay container is `pointer-events: none` with `pointer-events: auto` only on its buttons, so the full-canvas relative-drag joystick still receives pointer events everywhere else.
- Simulation uses a fixed timestep + interpolation alpha; pause the rAF loop on `visibilitychange` (hidden) and reset the clock on resume so a backgrounded tab doesn't accumulate a huge catch-up delta.
- Palette is "Electric Pop" (violet `#14082B` base); there must be no cream `#FDF6EC` anywhere. Default skin id is `classic` (legacy `default` is migrated to `classic` on meta load).
