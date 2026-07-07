---
name: VOIDLING Phase 7b — World and War Pack
description: Agar death rules, feeding frenzy, heli missiles, tank shockwave, news banner, no-slow fix, rival VOIDLING respawn.
---

## Key decisions

**Agar death (Part 4)**
- `dropStage()` on the Void base class (void.ts): decrements formIndex, sets radius to midpoint of old/new form band, caps score via inverse applyScoreRadius formula (score = 2600 * ((midR/BASE - 1)^(1/0.57)) * 0.92), ghostTime=3000.
- At formIndex ≤ 1 eaten by rival → game over: ghostTime=5000 (prevents double-eat), window.setTimeout(endRound, 2200), killedBy=r.name.
- Fall at formIndex=0 → −15% score only, no game over.
- Rivals reset to VOIDLING (formIndex=0, radius=FORMS[0].radius, score=0, ghostTime=8000) on any eat event (player-eats-rival AND rival-vs-rival).
- Hearts system fully removed: hearts=0, HUD pips removed, FINAL HEART vignette removed.

**endRound() idempotency (CRITICAL)**
- Added `roundEnded` closure boolean; endRound() returns early if already fired.
- Reset in start(). This prevents double XP/coin awards when setTimeout death races with timer expiry.

**Feeding Frenzy (Part 6)**
- Triggers at 60s remaining (separate from FINAL FEAST at 30s).
- Sets world.respawnMult=3 (world.ts has the field); FINAL FEAST → 2; normal → 1.
- Double predation score transfer (feedingFrenzyActive OR finalFeastActive) applied consistently on ALL predation branches.
- feedingFrenzyActive resets via roundEnded/start() reset block.

**News banner (Part 3)**
- Secondary banner slot, 4-tier pool in NEWS_TIER constant, keyed by % devoured (<3/3-10/10-20/>20%).
- newsAlpha/newsTimer/newsCd closure vars; first fires at ~12s; each showing lasts 5.5s with 700ms fade.
- Rendered below callout at fh*0.34 (or fh*0.22 if no callout).

**No-slow fix (Part 5)**
- Coast water slow block removed from events.ts entirely.
- Firetruck eventSlow line removed; only positional push kept.
- Only TIME WARP (existing) may slow player.

**Army weapons (Part 5)**
- Heli missile: missileCd field added to WorldObject interface; fires every 6–8s; 0.8s red dashed warning line + circle in world space; 4% score chip + confetti + ring + world.dropCrack on impact.
- Tank shockwave: on shell impact, scatter tier≤2 non-defense props within 220px outward; ring FX.
- Heli searchlight cone: drawn in world space from heli toward player; subtle cone fill.

**EMP van: deferred** — not implemented in Phase 7b; spec marked as lower priority.
**City placement (Part 1) + Density/Rush Hour (Part 2): deferred** — Parts 4/6/3/5 were priority.
