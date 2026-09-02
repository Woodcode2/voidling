# VERDICT: SOUND WITH CORRECTIONS (refute-popup, e39e3e0) — launch 3 was forced to return with three browser runs still in flight; see the closing section

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

<!-- ══ RESUMED 2026-09-02 09:44 UTC, third launch of this lane (the second was cut by the session limit after appended 7). Rule 3: nothing above is a number I ran; every figure I rely on below is re-run in this launch and labelled (rerun). Where I cite an earlier appended entry it is as a lead, not as evidence. ══ -->
### (disk, rerun) state at resume
- HEAD bb89582; `git log e39e3e0..HEAD -- src index.html` = 0efda23, 592e9a3, a4f5bf6 (three landings after the popup one); `git status --short src index.html` empty.
- dist/index.html + assets mtime 2026-09-02 00:13:43 > last src commit; :4177 returns 200 and serves `assets/main-BlHCCMf5.js` == dist/. `grep -c 'id="tut"' dist/index.html` = 0. The preview IS HEAD; no rebuild.
- /proc/loadavg 0.29 0.08 0.02, `pgrep -c chromium` 0, /tmp/gpu.lock absent. Parent worktree from appended 6 is gone (`git worktree list` shows main only).
### (disk, rerun) orphans and consumers, re-read at HEAD bb89582
- `grep -nE "\btut\b|tutEl|btnGotIt|voidTut|\.tTitle|\.tBody|\.tEmoji|\.tHand" src/*.ts index.html` → 4 hits, all comment lines: prototype3d.ts:5727, :5757, :9080; index.html:1729. `'knows'`/`.knows`: 1 hit, a comment (:5730). No live reference in src/ or index.html.
- `modalIn`: 4 hits in index.html — the @keyframes at :1130 and three live users (:1023 #daily, :1092 #skinPrev, :1334 #settings/#gate). Not orphaned by the deletion.
- voidTut outside src/qa/docs/dist: `scripts/shoot-store.mjs` (a seed write, no reader) and a stale `dist-gw/` bundle. Dead key, as the message says.
- `tutorial_view` / `tutorial_done` event names: still listed in APPSTORE.md:81 and docs/STUDIO-ROUND-3.md:1328/1333 as emitted events. Nothing in src/ emits them now. Docs-only; a correction, not a kill.
- OVERLAYS (prototype3d.ts:1959-1975): consumers are `OVERLAYS.some(id => document.getElementById(id)?.classList.contains('show'))` and `for (const id of OVERLAYS) { const n = document.getElementById(id); if (n) mo.observe(...) }`. Both key by id string and null-guard; nothing indexes by position. Its output is `bs.style.display` (dev build stamp) and `body.ovl` (quest board hides under an overlay). Removing 'tut' changes nothing for the other nine ids.
- The stray close tag: ran scratch divstack.mjs on index.html and dist/index.html — `index.html: 1 mismatched close tags {"line":2027,"tag":"div","top":"body#@1704","wouldClose":"NONE (ignored by parser)"}`; dist/index.html the same at :2029. The open stack at that point is `html > body`, so the HTML5 parser drops the `</div>` (parse error, no tree change). Cosmetic. Under the orphan `<!-- ── first-run tutorial ── -->` comment at :2026.
- The `/* ── first-run tutorial ── */` CSS section header at index.html:1632 now heads an empty section (the next rule is "hide gameplay HUD while in the menu").
- launchWorld() (:5717-5745): first two comment lines (:5720-5721, "one-time teach card before the first menu-launched match: it's the only place the danger loop ... lives") describe the deleted card in the present tense; :5757-5760 ("never saw the danger card") and :9080-9081 ("the ONLY place it was written down is the #tut card — which is shown from launchWorld()") likewise. Three stale comments; corrections.
- The cover on every door into launchWorld() at HEAD: (1) same-world card :5938 and (2) ribbon :5964 call launchWorld() directly with no hold taken; (3) the voidAutoPlay reload block (:6012-6084) takes NO synchronous coverHold any more (the hold "moves INSIDE the tap", :6029-6035), arms the gate after `Promise.race([preloadP, 12s])` sets `packReady = true` (:6068), and its tap callback either launches (:6083) or, with #daily up, sets pendingLaunch + coverRelease('pack') (:6079-6080) and lets (4) closeDaily() (:6918-6922) call launchWorld(). On every door launchWorld() reaches withWorldReady() (:5744), whose fast path is `if (packReady) { coverRelease('pack', cb); return; }` (:5685) and whose slow path takes coverHold('pack') (:5688) and releases it after the race + 300ms (:5697). No door reaches a 'pack' hold without a matching release; the early return that skipped withWorldReady() is the only code that ever did, and it is gone. Measured below.
- qa/gate.mjs job list (grep `id: '`): 37 jobs; tutstrand.mjs is not one of them (the browser UI jobs are uisystem :209 and switch :218). Five underscore probes still dereference #tut unguarded (`_bug9.mjs:56`, `_mvcontrast.mjs:23`, `_mvgeom.mjs:41`, `_tutorder.mjs:56`, `_mvcold.mjs:84`) — none is in the gate; hud2.mjs:77 is `?.`-guarded.
### (ran, rerun) `npx tsc --noEmit` — exit 0, 09:44:52→09:44:57 (5s).
### (ran, rerun) `node qa/tutstrand.mjs 4177` (HEAD) — exit 1, 69s wall, lock taken at load 0.20 / chromium 0, 09:44:57→09:46:06
    before the switch: {"cover":{"on":false,"z":60},"tut":{"on":false,"z":0},"menu":true,"clock":180,"hud":false}
    ok   a second world exists to switch to   pirate
    after the world switch: {"cover":{"on":false,"z":60},"tut":{"on":false,"z":0},"menu":true,"clock":180,"hud":false}
    ok   the child can reach whatever is asking them to tap   cover z=60 on=false, tut z=0 on=false
    FAIL and a match actually starts | FAIL and its clock is running (180.0s -> 180.0s)
  The cover is DOWN (cover.on=false) on both samples — the assertion this probe was written for passes. What fails is that no match starts, and the "after the switch" dump still says menu:true, hud:false: the page did not reload. Whether that is the landing or the probe is settled below by running the identical probe against the parent build e39e3e0^ (worktree at .claude/worktrees/refute-popup-parent, `npm run build` ✓ built in 7.31s, served by `vite preview --port 4202`).
  RETRACTED line above: I wrote the CSS section header is at "index.html:1632" without reading it. `grep -n "first-run tutorial" index.html` gives the real lines — see the correction list, which uses those.

### (ran, rerun) scratch s2.mjs maple 4177 — session two (voidPlayed=1, voidTut/voidFirstNom unset, all five worlds in voidUnlocked), PLAY → Maple card (same-world door: launchWorld() direct). Lock taken at load 2.55 / chromium 0, 09:46:06. Partial — the run was still going when the output was forced (see closing section); these lines are its log as written.
    boot: tutInDom=false btnGotItInDom=false cover.on=false tapGate.on=false menu=true voidTut=null; #end/#loadScr/#shop parent = BODY x3
    radii (live, HEAD): {"dCard":"26px","spCard":"26px"}
    after PLAY: worlds.show=true; after pick: menu=false bodyMenu=false cover.on=false tapGate.on=false shown=["titlecard"]  ← no modal of any kind
    t>5 (match clock t=5.0, clock=175): cover.on=false tapGate.on=false hand.show=true hand.on=true shown=["hand","titlecard",...]
    #hand svg: 283.8 x 186.2 px at (73.1,451.1); filter=drop-shadow(rgba(0, 0, 0, 0.45) 0px 6px 14px); display=block; overflow=visible; #hand width 283.797px (= min(320px,66vw) at 430w)
    shot: scratchpad r3/s2-maple-t5.png (not copied to docs/crews/round-5/shots — forced return)
  So on the same-world door at HEAD: the menu hides, no #tut exists, the cover is down at pick and at t>5, the match clock is running (180→175 by match t=5), and the surviving `#hand svg` half of the split selector renders the SVG at full #hand width with the drop-shadow. Items 2 (Maple) and 4 of the brief: held.
### (disk, rerun) the locked-card branch predates the landing
- `git show e39e3e0^:…/prototype3d.ts | grep -c "c.classList.add('shake', 'why')"` = 1 and the same on e39e3e0 = 1: the picker refuses a locked world identically on the parent. tutstrand's seed has no voidUnlocked and unlocks.ts:70 `isUnlocked = w => migrate(read()).has(w)` with read() on that key — so its pirate tap never writes voidAutoPlay on either build. tutstrand's two FAILs at HEAD are the probe's seed, not the cover; its cover assertion PASSED (cover.on=false, both dumps). The parent A/B (`qa/tutstrand.mjs 4202`) was queued as chain2 and had not started when the return was forced.

## Closing — what is and is not established (launch 3, forced return 09:48 UTC)
ESTABLISHED by runs in this launch: tsc clean; tutstrand's cover assertion passes at HEAD; session-two Maple starts with no modal, cover down, gate down, clock running, hand shown with the right size and shadow; the stray </div> is parser-ignored; no live orphan reference; OVERLAYS keys by id, never by position; every door into launchWorld() reaches withWorldReady() (source trace above).
NOT established in this launch (the prior launch's appended 3-7 report them, but those are not my numbers): the Pirate (reload+gate) door end to end, the fresh-profile hand, the daily-card door, the parent-build A/B of tutstrand/s2, and the 24px parent radius. The chain kept running after the forced return: logs land in the session scratchpad `r3/` (`s2pirate.log`, `s2fresh.log`, `s2lock.log`, `s2daily.log`, `cascade.log`, `parent/p_*.log`) and are harvestable by the next launch of this lane — they are not part of this verdict.
Nothing tried killed the change. Verdict stands as SOUND WITH CORRECTIONS on the evidence above; the Pirate door is the one item the brief demanded that this launch did not itself finish.

## Kill shots
None landed. Tried: (1) the cover hold on every door into launchWorld() — source trace + tutstrand cover assertion + s2 maple cover.on=false at pick and t>5; (2) tutstrand's FAIL — traced to its own seed (locked-card branch present on both builds, cover down); (3) orphan references — none live; (4) the split #hand selector — measured rendering; (5) OVERLAYS — id-keyed, null-guarded; (6) the stray </div> — parser-ignored, #end/#loadScr/#shop still BODY children.

## Corrections (verbatim)
1. index.html:2026-2027 — delete both lines `    <!-- ── first-run tutorial ── -->` and `    </div>` (the closer has no opener; parser drops it).
2. index.html:1628 — delete the line `      /* ── first-run tutorial ── */` (heads an empty section).
3. src/prototype3d.ts:5720-5721 — replace `  // one-time teach card before the first menu-launched match: it's the only
  // place the danger loop ("eat the family when bigger, RUN when not") lives` with `  // the one-time teach card that used to live here is gone; the danger loop is
  // taught in context by the firstRun beats (see "THE RULE NOBODY WAS EVER TAUGHT")`.
4. src/prototype3d.ts:9080-9081 — replace `  // ONLY place it was written down is the #tut card — which is shown from
  // launchWorld(), reachable only through the menu. The very first launch` with `  // ONLY place it was written down WAS the #tut card (deleted in e39e3e0) —
  // shown from launchWorld(), reachable only through the menu. The very first launch`.
5. APPSTORE.md:81 — replace `tutorial_view/done,` with nothing (no code emits either event); same at docs/STUDIO-ROUND-3.md:1328 or leave that file as history.
6. qa/tutstrand.mjs — after the line `    localStorage.setItem('voidWorld', 'maple');` insert `    localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder');   // the picker refuses a locked world since 589e31e`; and after the post-reload `await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });` insert `await p.waitForFunction(() => document.getElementById('tapGate')?.classList.contains('armed'), null, { timeout: 400000 });
await p.locator('#tapGate').dispatchEvent('pointerdown');   // armGate (29a4d6c) needs a pointerdown on the reload path`. Without both edits the probe cannot reach the journey its header names on any build.
7. GOVERNOR CALL, not applied blind: the deleted rule `#tut .card, #daily .dCard, #skinPrev .spCard { border-radius: 24px; }` (index.html(e39e3e0^):1142) also governed two surviving cards; live at HEAD both read 26px (s2 maple, above). If 24px was intended, add after index.html:1133 (`#dailyClaim:active, #spAct:active {...}`) the line `      #daily .dCard, #skinPrev .spCard { border-radius: 24px; }`.

### (ran, rerun) s2.mjs maple — COMPLETED after the section above was written: exit 0, 153s wall, 09:46:06→09:48:39. Final line: `S2 maple: PASS — no modal, cover down, gate down, clock running, hand taught then left`. [123.1s] clock running: 174.8 -> 173.3 [148.7s] drag dispatched at t=6.70, sampled at t>8.70 S2 maple: PASS — no modal, cover down, gate down, clock running, hand taught then left  after drag: hand.on="hand":{"show":false,"on":false,"z":8}. Only captured error: the CDN-blocked hf asset 403 (expected per qa/README). Correction 7's anchor line re-read and fixed to the real `#dailyClaim:active` line (1133).
