---
name: VOIDLING opening sequence (splash + match-start intro)
description: Splash screen art format pitfalls and a robust pattern for one-shot UI intro timers that must survive main-thread jank and transient overlay interruptions.
---

## Splash/hero art must be compressed
A multi-MB PNG used as full-bleed splash art can silently fail to paint within its display
window (looks like a blank color background) because decode is slow relative to the window.
Convert hero/splash art to a compressed JPEG (ImageMagick or similar) before wiring it up —
verify the actual served file size, not just that the `<img>` tag looks right.

## One-shot intro timers: don't drive sequencing with JS state + setTimeout
A React state machine that swaps phases via `setTimeout(...) -> setState(...)` can have a
phase silently skipped: if the main thread stalls (heavy synchronous work — e.g. procedural
world generation right at match start), the browser may process multiple overdue timer
callbacks back-to-back without an intervening paint, and the visual phase never renders.

**Fix:** mount all phases of a one-shot intro simultaneously in the DOM, and drive the
sequence purely with CSS `animation-delay` timelines (one rule per phase, same keyframe).
The compositor's timeline can't be "skipped" the way JS-driven conditional rendering can —
whatever real-elapsed-time keyframe is current gets painted once rendering resumes, so a
stall just delays visibility, it never drops a phase.

## Gate one-shot triggers on a counter, not on `screen`/mode state
If a UI intro must fire exactly once per some event (e.g. "real match start", not resumes or
interrupting modals), add a dedicated monotonically-incrementing counter to the source of
truth (e.g. an engine snapshot field), bumped only at the exact trigger site. Track it in the
UI via a ref-compared `useEffect` (fire once per counter change, skip the very first/bootstrap
value). Do NOT also gate the component's *mount* on transient mode/screen state (e.g.
`screen === 'game'`) — an interrupting overlay (boon-pick, modal) will unmount it and reset
internal timers/CSS animation progress when it remounts. Instead, keep it mounted for the
whole trigger's lifetime and toggle only `visibility: hidden/visible` (not `display: none`,
which pauses CSS animations) based on the transient state — this hides it behind the modal's
own opaque background without resetting its timeline.

## Testing-sandbox caveat
Under heavy concurrent headless-browser test load (many parallel testing-subagent runs
against one dev server), real wall-clock waits can drift enormously from actual in-page
elapsed time (FPS dropping to ~20, multi-second stalls per "1 second" of requested wait).
When verifying tight timing windows, add a temporary on-screen `performance.now()`-based
debug readout (rAF-driven) as ground truth instead of trusting wall-clock wait instructions —
remove it before shipping.
