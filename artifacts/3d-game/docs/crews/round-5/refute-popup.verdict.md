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

<!-- appended 2: first probes -->
### (ran) `npx tsc --noEmit` — exit 0, 5.1s wall.
### (ran) `node qa/tutstrand.mjs 4177` — exit 1, 82.6s wall.
    before the switch: {"cover":{"on":false,"z":60},"tut":{"on":false,"z":0},"menu":true,"clock":180,"hud":false}
    after the world switch: {"cover":{"on":false,"z":60},"tut":{"on":false,"z":0},"menu":true,"clock":180,"hud":false}
    ok   the child can reach whatever is asking them to tap
    FAIL and a match actually starts / FAIL clock running (180.0 -> 180.0)
  The dump after the "switch" still reads menu:true, hud:false — the page never reloaded. Two reasons, both older than e39e3e0:
  - its seed never writes voidUnlocked, and since 589e31e (2026-08-16, the SAME commit that last touched tutstrand.mjs) the picker's locked-card branch (prototype3d.ts:5925-5936) shakes and returns without writing voidAutoPlay;
  - it never taps #tapGate, and armGate (29a4d6c, 2026-08-19) has required a pointerdown on the reload path since three days after the probe's last edit.
  So the failure is the probe's staleness, not the landing's. Reproduction of the exact seed follows below.
### (ran) scratch s2.mjs maple 4177 — session two (voidPlayed=1, voidTut unset, voidFirstNom unset, all worlds unlocked), PLAY -> Maple card (same-world path: launchWorld() direct, no reload). 211s wall.
    boot: tutInDom=false btnGotItInDom=false cover.on=false tapGate.on=false menu=true
    after pick: menu=false bodyMenu=false cover.on=false tapGate.on=false shown=["titlecard"]
    t>5 (match clock): cover.on=false gate.on=false hand.show=true hand.on=true clock=175
    #hand svg: 283.8 x 186.2 px at (73.1,451.1); filter=drop-shadow(rgba(0, 0, 0, 0.45) 0px 6px 14px); display=block; overflow=visible; #hand width=283.797px (= min(320px, 66vw) at 430w)
    clock running: 174.8 -> 173.3
    after synthetic drag (pointerdown 215,500 -> pointermove 300,560 on canvas), t=6.7: hand.on=true  <-- did NOT leave; investigating whether the synthetic drag reaches joy.mag>0.25 at all
    #end / #loadScr / #shop parentElement = BODY, BODY, BODY (stray </div> reparented nothing)
    page errors: none (one 403 resource — the CDN-blocked hf asset, expected per qa/README)
    shots: qa-out/s2-maple-t5.png, qa-out/s2-maple-drag.png

<!-- appended 3: pirate route + tutstrand seed reproduction -->
### (ran) scratch s2lock.mjs 4177 — tutstrand.mjs's EXACT seed (voidPlayed=1, voidDailyLast, voidWorld=maple, no voidUnlocked), PLAY, click the first non-maple card. 44.6s wall.
    cards before click: maple "wCard sel"; pirate/gameday/lantern/powder all "wCard locked"
    after click: pirate "wCard locked shake why", voidAutoPlay=null, voidWorld=maple, #worlds still .show, navigations since boot: 0
  => tutstrand.mjs never leaves the picker at HEAD. Its two FAILs are the locked-card branch, not the cover.
### (ran) scratch s2.mjs pirate 4177 — session two, PLAY -> Pirate card (different world: voidAutoPlay + reload + gate). 180s wall. exit 0.
    after reload: menu=false bodyMenu=false gated=true tapGate.show=true (z55) cover.on=false voidWorld=pirate tutInDom=false
    gate armed -> pointerdown on #tapGate -> after pick: tapGate.on=false cover.on=false shown=["titlecard"]
    t>5 (match clock): cover.on=false gate.on=false hand.show=false hand.on=false (#hand display=none) clock=175
    clock running: 174.8 -> 173.2
    #end/#loadScr/#shop parent = BODY x3; page errors: none real (2x 403 hf asset)
    shots: qa-out/s2-pirate-gate.png, qa-out/s2-pirate-t5.png
  NOTE on my own Maple run above: the "hand did not leave" line is a PROBE BUG — the post-drag wait (t > 6.5) was already true at dispatch (t=6.7), so the sample preceded any frame. Re-run with a real wait follows.

<!-- appended 4: Maple rerun with the wait fixed -->
### (ran) scratch s2.mjs maple 4177 — RERUN, post-drag wait now `t > tDrag + 2.0`. 259s wall. exit 0.
    t>5: cover.on=false tapGate.on=false menu=false hand.show=true hand.on=true clock=174.9 tutInDom=false
    #hand svg: 283.8 x 186.2 px; filter=drop-shadow(rgba(0, 0, 0, 0.45) 0px 6px 14px); overflow=visible
    clock running: 174.7 -> 173.2
    drag dispatched at t=6.83, sampled at t>8.83: hand.show=false hand.on=false  (the earlier "did not leave" was my wait bug; retracted)
    #end/#loadScr/#shop parent = BODY x3
  Looked at qa-out/s2-maple-t5.png: white ∞ ribbon with its dark under-stroke, white glove with a visible soft shadow, centred on the void at 2:55 on the clock. The surviving `#hand svg` rule renders.
### (ran) scratch s2.mjs fresh 4177 — CUT OFF by the 10-minute call limit with loadavg 9.75 (another job on the box); no numbers. Re-attempt below if load allows.

<!-- appended 5: the collateral CSS deletion, and the gate -->
### (disk) A deletion the message does not own
- The diff removes the WHOLE line index.html(e39e3e0^):1142 `#tut .card, #daily .dCard, #skinPrev .spCard { border-radius: 24px; }` — three selectors, one of them #tut's. `#daily .dCard` (HEAD :1026) and `#skinPrev .spCard` (HEAD :1093) each carry their own `border-radius: 26px`, same specificity (1,1,0), EARLIER in the sheet — so the deleted later rule was the one winning. Before: 24px on both cards; after: 26px. Two surfaces the commit did not name changed by 2px. Introduced by 589e31e (2026-08-16); its message says nothing about the radius. Live computed numbers pending (cascade.mjs, queued behind the GPU lock).
- qa/uisystem.mjs asserts nothing about radii (grep radius|24px|dCard|spCard: 0 hits), so no probe catches this.
### (disk) The gate
- qa/gate.mjs runs qa/switch.mjs (:218) and qa/uisystem.mjs (:209); it does NOT run tutstrand.mjs, worldswitch.mjs or mapleteach.mjs. tutstrand's staleness cannot block the gate.
### GPU lock
- Runs 1-5 above (tutstrand, s2 maple x2, s2lock, s2 pirate) were made WITHOUT the round-5 `mkdir /tmp/gpu.lock` protocol — I read the README after them; each was launched with `pgrep -c chromium` = 0 and 1-min load 2.4-5.9 (recorded per run above). The remaining run takes the lock.

<!-- appended 6: parent build + queue -->
### (built) parent for A/B
- `git worktree add --detach /home/user/voidling/.claude/worktrees/refute-popup-parent e39e3e0^` (gitignored path), node_modules symlinked, `nice -n 19 npm run build` in its artifacts/3d-game -> `✓ built in 6.76s`, bundle `main-D5xeDCkV.js`; its dist/index.html carries `id="tut"` (1 hit). Main's :4177 dist is untouched (`main-` bundle differs; checked below when the A/B runs).
- Queued under the GPU lock (held by another crew since 04:57:48 UTC; my first two 10-minute-capped waiters were replaced by one Monitor'd queue at 05:02): cascade.mjs (card radii on both stylesheets), s2.mjs fresh (hand on a cleared profile), ab.mjs PARENT (session two on the parent build, served to the same URL by a playwright route — no second server), s2daily.mjs (the daily-card door into launchWorld at HEAD).

<!-- appended 7: the cascade, measured -->
### (ran) scratch cascade.mjs — each build's <style> blocks loaded into a bare page, computed border-radius read. GPU lock held 05:04:07-05:04:08, load 3.58.
    PARENT e39e3e0^: {"dCard":"24px","spCard":"24px"}
    HEAD:            {"dCard":"26px","spCard":"26px"}
  The daily card and the skin-preview card each grew 2px of corner radius in a commit whose message says it deleted "every #tut and #btnGotIt style". Confirmed, not inferred.
- HEAD moved during this session: c761620 (verdict-draft ticks only; `git diff --stat ec214f4..HEAD -- src index.html` is empty). :4177 serves `assets/main-BlHCCMf5.js` == dist/assets; the parent worktree's bundle is `main-D5xeDCkV.js`.
- The remaining three browser jobs died on launch inside the queue (no /usr/bin/time on this box — my earlier runs used the shell builtin); relaunched without it.
