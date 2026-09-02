# DRAFT — in progress (refute-popup)

Commit under refutation: e39e3e0 (DRAG TO MOVE #tut modal deleted).
Started 2026-09-02. Appending as measurements land.

## What I ran

## What I checked on disk

## Kill shots

## Corrections (verbatim)

<!-- appended 1: on-disk reads, before any probe -->
### (disk) diff vs. message
- `git show e39e3e0`: 2 files, +29/-95. Deletes #tut markup, all #tut/#btnGotIt CSS, the launchWorld() early-return branch (with coverRelease('pack')), the btnGotIt handler, `tutEl`, 'tut' from OVERLAYS, and the voidTut write in the debug bypass. Matches the message.
- NOT in the message: the markup removal ran from `<div id="tut">` through the card's `</div>` and left the OUTER `</div>` as a context line. index.html:2027 at HEAD is now a `</div>` with no opener, under an orphan `<!-- ── first-run tutorial ── -->` comment at :2026. Tag-stack walk (scratch divstack.mjs): at that point the open stack is `html > body` — no div in scope — so the HTML5 parser ignores it. Same in dist/index.html:2029. Parent commit e39e3e0^ walks clean (0 mismatches). Cosmetic, not functional; goes in corrections.
- Orphan grep (`tut|tutEl|btnGotIt|voidTut|.tTitle|.tBody|.tEmoji|.tHand` over src/ and index.html): 4 hits, ALL inside comments — prototype3d.ts:5727, :5757, :9080; index.html:1729. No live reference. :9080 ("the ONLY place it was written down is the #tut card") is now a stale comment describing a deleted element.
- OVERLAYS (prototype3d.ts:1959-1975): only consumer is the build-stamp/`body.ovl` MutationObserver block — `.some()` over ids and a `for...of` to observe each; nothing indexes by position. 'tut' removal is safe.
- withWorldReady (5669-5698): fast path `if (packReady) { coverRelease('pack', cb); return; }`, slow path takes coverHold('pack') and releases after preload/12s cap. launchWorld() (5716-5745) now unconditionally calls withWorldReady(() => startFresh(soloOn())).
- World-switch block (6012-6083): NO synchronous coverHold('pack') any more — the hold "moves INSIDE the tap" and the gate arms after preload; the gate callback does `if daily.show -> pendingLaunch + coverRelease('pack')` else launchWorld(). closeDaily() (6918-6922) calls launchWorld() when pendingLaunch. Same-world card and event ribbon call launchWorld() directly (5938, 5963).
- Hand (a4f5bf6, landed after e39e3e0 but before HEAD): `handEl.classList.toggle('show', teachDrag && started && !ended && controlsLive && !dragDone)` at :9120; `teachDrag = firstEver || pickedWorld === 'maple'` at :5562.
- #hand CSS (index.html:245-250): `#hand svg { display:block; width:100%; height:auto; overflow:visible; filter: drop-shadow(0 6px 14px rgba(0,0,0,0.45)); }` — the surviving half of the split selector.
- dist/index.html mtime 2026-09-02 00:13:43; last src/index.html-touching commit 0efda23 at 2026-09-01 23:07:31; working tree clean for src/ and index.html. dist == HEAD. No rebuild needed.
- qa/ probes still naming the deleted element: hud.mjs:78-85, hud2.mjs:65-79 (all `?.` guarded — degrade, not throw), tutstrand.mjs (vis('tut') returns {on:false,z:0} for a missing id — degrades). 398 qa files seed `voidTut` — a dead key, harmless.
