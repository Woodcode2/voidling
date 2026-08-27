# CREWS — ROUND 1B, the verbatim record

Re-run of the two crews whose round-1 output was lost to a container restart
before it could be committed. The prior skeptics' corrections were written
into these briefs as BINDING constraints. Committed the moment the workflow
returned, before anything was landed — the rule that round 1's loss taught.



============================================================================
## RESULT 1
============================================================================

All cited regions read directly: audio3d.ts :393-417 (LoopChan), :434-548 (startLoop/stopLoop), :552-588 (playTrack decode at :570-571), :597-617 (preload decode at :606), :633-643 (reviveCh), :762-774 (repairMusic — only revives `wanted` channels, so a released, un-wanted channel is never auto-refetched), :3681-3699 (startMusic), :3717-3733 (menu start/stop), :3792-3815 (preloadMusic straight-in ordering via voidAutoPlay), :3836-3860 (musicState — `dur` already reads 0 when buf is null), :3967-3982 (stopMusic). Callers read in prototype3d.ts: :4668 (endMatch), :6481 (doQuit), :5385 (match start), :9446/9451 (menu sync). All edits land in one file; prototype3d.ts needs no change.

PATCH — /home/user/voidling/artifacts/3d-game/src/proto3d/audio3d.ts (7 hunks)

HUNK 1 — lines 411-415 (LoopChan tail): add an era field.
```ts
    /** how many times a loop has been STARTED this session — the continuity
     *  probe (qa/journey.mjs) reads this: a menu theme that is one continuous
     *  piece across splash → picker → shop → book starts exactly once. */
    starts: number;
    /** bumped by releaseBuf(): a fetch/decode begun under an older era
     *  discards its result instead of resurrecting a buffer that was just
     *  released — without this, a quit during the download re-leaks the
     *  track the moment the decode resolves. */
    era: number;
  }
```

HUNK 2 — line 417 (mkChan): replace with
```ts
    ({ buf: null, bad: false, loading: false, wanted: false, gain: null, timer: null, srcs: [], vol, cold: false, loop: 0, starts: 0, era: 0 });
```

HUNK 3 — insert after line 548 (stopLoop's closing brace):
```ts
  /** Drop a channel's decoded track so its ~50-80 MB of PCM becomes
   *  collectable. Playing sources hold their own reference to the
   *  AudioBuffer, so calling this mid-fade never cuts audio — the memory
   *  goes once the fade's sources are collected. The era bump makes any
   *  in-flight fetch/decode for this channel discard its result (see
   *  playTrack/preload). `bad`, `loop` and `starts` are deliberately
   *  untouched: release is about memory, not forgetting what the channel
   *  learned. */
  function releaseBuf(ch: LoopChan, name: string) {
    ch.era++;
    if (!ch.buf) return;
    logEv(`released ${name} buffer (${Math.round(ch.buf.duration)}s PCM)`);
    ch.buf = null;
  }
```

HUNK 4 — lines 564-571 (playTrack): capture era, guard the only assignment.
```ts
    ch.loading = true;
    const era = ch.era;
    (async () => {
      for (const u of urls) {
        try {
          const r = await fetch(u);
          if (!r.ok) continue;
          const buf = await c.decodeAudioData(await r.arrayBuffer());
          // released while this was in flight: drop the result rather than
          // re-leaking it; loading clears so the next ask can fetch fresh.
          if (ch.era !== era) { ch.loading = false; logEv(`stale decode dropped ${u.split('/').pop()}`); return; }
          ch.buf = buf;
```
(rest of the function unchanged, including `ch.loop = loopFor(u);` onward)

HUNK 5 — lines 600-607 (preload): same guard.
```ts
    ch.loading = true;
    const era = ch.era;
    return (async () => {
      for (const u of urls) {
        try {
          const r = await fetch(u);
          if (!r.ok) continue;
          const buf = await c.decodeAudioData(await r.arrayBuffer());
          // same stale-era discard as playTrack: a release during this fetch
          // must not be undone by its own tail.
          if (ch.era !== era) { ch.loading = false; logEv(`stale preload dropped ${u.split('/').pop()}`); return; }
          ch.buf = buf;
          ch.loop = loopFor(u);
```
(line 608's log still reads `ch.buf.duration` — identical value, unchanged)

HUNK 6 — lines 3684-3685 (startMusic), after the existing two lines:
```ts
      menuCh.wanted = false;
      stopLoop(menuCh, 0.6);
      // …and give its decoded PCM back for the match — but ONLY if the menu
      // actually played it. starts === 0 means a straight-in page
      // (voidAutoPlay): the preloaded menu buffer there is the designed warm
      // quit — the first trip back to the menu starts instantly from it — so
      // it stays. Menu-first pages have starts > 0, quit back through a
      // re-fetch the HTTP cache serves, and run the match one track lighter.
      if (menuCh.starts > 0) releaseBuf(menuCh, 'menu');
```

HUNK 7 — lines 3974-3975 (stopMusic), after the existing two lines:
```ts
      themeCh.wanted = false;
      stopLoop(themeCh, 1.2);
      // post-whistle: give the decoded match track back. The fading sources
      // hold their own reference, so the 1.2s tail plays out untouched; a
      // rematch re-fetches from the HTTP cache and re-decodes under the same
      // 400ms synth-bed grace every cold start already gets.
      releaseBuf(themeCh, 'theme');
```

RACE-GUARD SOUNDNESS (read, not probed): the codebase's only two `ch.buf` assignments (:571, :606) both now sit behind the era check; both release sites set `wanted = false` first (stopMusic :3974, startMusic :3684), and repairMusic (:772-773) only revives wanted channels, so a discarded decode is never silently refetched — the next explicit playTrack/preload/reviveCh does it with `loading` honestly false. Per binding correction 2, no probe is claimed to prove this guard; any future probe must throttle only the SECOND request for the same track so a fetch is genuinely in flight at the quit — a probe without that throttle must not be advertised as proving the race guard.

ACCOUNTING (honest, per binding correction 3): a decoded ~3-4 min stereo track is ≈50-80 MB of Float32 PCM. Before: both tracks resident from decode to page unload (≈100-160 MB, whole session). After, menu-first pages: one track resident during a match (menu released at whistle-in, saving ≈50-80 MB in-match), theme released post-whistle. After, straight-in pages: two tracks stay resident during the match — unchanged by design, preserving the warm quit — and they gain only the post-whistle theme release; from their second match on (menu has starts > 0 by then) they match the menu-first accounting. Recurring cost: each menu return on menu-first pages and each rematch pays one HTTP-cache re-fetch plus one main-thread re-decode (~100-400 ms), masked by the existing 400 ms synthCover grace and the 0.6/1.2 s fades. Zero change to: triangles, draw calls, materials, textures, sphere segment counts (qa/roundlod.mjs ratchet untouched), seeded-draw stream (0 mrnd/mr/mpick/mchance calls added, 0 removed), audio-graph topology, and grading — no per-channel clip is added anywhere; releaseBuf only nulls a JS reference. `starts` counting and qa/journey.mjs walks are byte-identical; musicState's `dur: 0` after a release is the honest residency signal a probe can read.

CHILD-VISIBLE CHANGE: nothing on screen changes; the only audible difference is that a rematch (or a menu return on a menu-first page) may open on the familiar synth bed for a fraction of a second while the track re-decodes — exactly like today's cold start — in exchange for the game no longer holding two full albums' worth of RAM mid-match on the phones most likely to kill the tab for it.


============================================================================
## RESULT 2
============================================================================

VERDICT: SOUND WITH CORRECTIONS

All audio3d.ts anchors verified exact against /home/user/voidling/artifacts/3d-game/src/proto3d/audio3d.ts: LoopChan :393-415, mkChan :416-417, startLoop/stopLoop :434-548 (starts++ at :477, cold refusal at :452-453), playTrack :552-588 with the only two `ch.buf` assignments in the file at :571 and :606 (grep-confirmed), preload :597-617 (log at :608 reads ch.buf.duration), reviveCh :633-643, repairMusic :762-774 (wanted-only revive at :772-773), startMusic body :3681-3699 (menuCh.wanted=false / stopLoop at :3684-3685), stopMusic :3967-3982 (themeCh.wanted=false / stopLoop at :3974-3975), musicState dur at :3840. Hunk anchors and the "rest unchanged" claims all hold. Hard constraints: no mrnd/mr/mpick/mchance in any hunk (constraint 1 clean), no rendering surface touched (constraint 2 clean), no per-channel clip and the PCM math checks out — 44.1kHz x 2ch x 4B x 180-240s = 63-85 MB, "50-80 MB" is honest (constraint 3 clean). The release-mid-fade claim is correct WebAudio semantics (sources hold their own AudioBuffer reference), and the era guard is sound as read: both release sites clear `wanted` first, repairMusic revives only wanted channels, and a re-request racing a stale fetch is declined by the `loading` gate then healed by the 2s watchdog restatement (prototype3d.ts :9497-9514) under the cover pad — bounded delay, never permanent silence.

CORRECTIONS, shortest first:

1. Stale citations: every prototype3d.ts line cited is off by 60-68 lines against the real file (/home/user/voidling/artifacts/3d-game/src/prototype3d.ts) — stopMusic callers are :4728 (endMatch) and :6541 (doQuit), startMusic is :5445, the menu sync is :9514/:9519, not :4668/:6481/:5385/:9446-9451. The semantic claims survive (those callers exist; no prototype3d.ts change needed), but "all cited regions read directly" was read against a stale revision.

2. "starts === 0 means a straight-in page" (HUNK 6 comment) is false in one real case: on a menu-first page where the child's very first gesture is PLAY, startLoop refuses cold at :452-453 before `starts++` at :477, so menuCh.starts is 0 and the menu buffer is kept through the match. Benign (it errs toward today's residency), but the comment and the "menu-first pages: one track resident during a match" accounting line both overclaim; the comment should say "never audibly started".

3. "Fraction of a second" understates the audible gap. The codebase's own measurement (:732-734) is 314/934/1067/3061 ms for the cover-to-recording handover; the re-fetch is cached but the decode dominates, so a menu return or rematch on a struggling phone can sit on the bed for 1-3 s, not a fraction. The tradeoff is still fine; the sentence is not.

4. The load-bearing omission: qa/aftermatch.mjs is never mentioned, and it is the probe aimed at exactly the leg this patch lands on. Its `station(..., mustBeMenu=true)` (qa/aftermatch.mjs :54-72, :88, :101) demands the RECORDED menu — bed does not count — at srcs>0, not cold, gain >= 0.3, only 2500 ms after #end shows or body.menu lands. Pre-patch that is instant (buf resident); post-patch legs 1-2 must complete refetch+decode+startLoop inside 2.5 s on the swiftshader harness the repo itself measured at 0.9 fps (~1.1 s per event-loop turn, and the fetch→arrayBuffer→decode→startLoop chain is 3-4 turns), so 'results card' (leg 1) and 'quit → splash' (leg 2) are at real risk of intermittent FAIL. Leg 3 is protected by the starts>0 guard exactly as designed. The submission's claim that only journey.mjs matters is wrong — journey.mjs (asserts starts pre-match at :65-66, and 'in match' only forbids menu srcs at :73) is indeed untouched, but aftermatch.mjs must be run against the patched build before this ships, and if the 2.5 s settle proves too tight in the harness, the honest fix is widening that probe's settle with a comment, not weakening the release.

Child-audible reality, as verified: nothing visual changes; the one audible change is the results card and menu return (and rematches) opening on the drumless cover pad for up to ~1-3 s on slow devices while the released track re-decodes — acceptable, but state it at that size.


============================================================================
## RESULT 3
============================================================================

RE-DERIVED RECORD — scripts/shoot-store.mjs vs the live tree (HEAD 6d85e23; the script file is byte-identical to HEAD, but note another session is committing to src/prototype3d.ts live, so prototype3d line numbers below are as of this audit)

Method: read the script end to end; checked every selector, every localStorage seed, and every `__`-hook against `/home/user/voidling/artifacts/3d-game/index.html`, `src/prototype3d.ts`, `src/game/unlocks.ts`, `src/proto3d/{void3d,store3d,island,assets3d}.ts`. Ran nothing; edited nothing.

════ DEFECT 1 — CONFIRMED. The lock guard tests a class the live game never sets ════
- Where: `scripts/shoot-store.mjs:377-388`, the faulty line is **385**: `return card.classList.contains('lock') ? 'locked' : '';`
- Live tree: the ONLY writer of a world-card lock state is `src/prototype3d.ts:5818` — `c.classList.toggle('locked', !!gate)` — and its styles are `#worlds .wCard.locked …` at `index.html:1266-1272`. No card in the picker markup (`index.html:1919-1943`) carries `lock`; the only `.wCard.lock` code left is read-only vestige of the retired FROST teaser (`prototype3d.ts:5877, 5881` — querySelectorAll over an empty set; dead CSS at `index.html:1009, 1015-1016, 1139`).
- The guard's own provenance comment (script lines 380-384) claims it was "Verified against index.html:967,973,1097 (`.wCard.lock`)" — those lines today hold an unrelated comment, another comment, and the `againPulse` animation. The comment has the history exactly inverted: today `lock` is the token that "matches nothing and makes this guard a decoration".
- Failure scenario: any unlock drift (sixth world appended to `WORLD_ORDER` but not to the seed string at script line 239, key rename, private-mode storage throw) puts a `locked` card under the tap. The guard returns `''`, `tap()` clicks the card, the live handler (`prototype3d.ts:5820-5839`) shakes it and returns WITHOUT navigating, and `enterMatch` waits out two 400 s `waitForFunction` timeouts — after the purge block (script 147-167) has already emptied `store/` into `.previous/`. That is the exact "most expensive missing line in the repo" catastrophe the SEED comment (script 220-239) documents; the guard exists to turn it into a one-second refusal and currently cannot fire.
- Exact patch — replace script line 385:
```js
    return card.classList.contains('locked') ? 'locked' : '';
```
  and correct the stale comment at 380-384 to cite `prototype3d.ts:5818` / `index.html:1266-1272`.
- Accounting: script-only. Seeded-draw stream: 0 calls added, 0 removed (no game code touched). No new materials, textures, or spheres; roundlod ratchet untouched. Grade untouched — no clip anywhere. Zero triangle/memory cost.
- Child-visible change: nothing in the game; on the App Store side it keeps the eight listing screenshots truthful by making a mis-seeded shoot refuse loudly instead of silently destroying the set.

════ DEFECT 2 — PLAUSIBLE (skeptic to weigh; cannot be confirmed without running). Shot 08's wait is the one match-path timeout left at 120 s ════
- Where: `scripts/shoot-store.mjs:615` — `waitForFunction(() => document.getElementById('end')?.classList.contains('show'), null, { timeout: 120000 })`.
- Live tree: `__rushClock(0.3)` sets `matchClock` (`prototype3d.ts:1766`), which drains at `matchClock -= dtw * clockSpeed` (`:8232`); at zero the game arms a 2.0 s slow-mo outro BEFORE results (`:8400-8401`), decremented at `:8246`, and only `endMatch()` then shows `#end` (`:4759/4967`). By the script's own measurements the software-renderer clock runs 14-40x slower than wall (script lines 277-278, 493-495), and every other match-path wait was raised to 400 s for exactly that reason (lines 408, 414, 430, 442) — this one wait was not. Failure mode: run dies on the eighth shot with seven on disk, full-run mode, exit 1.
- Exact patch — line 615: change `{ timeout: 120000 }` to `{ timeout: 400000 }`.
- Accounting: script-only; 0 draws, 0 materials, 0 cost. Child sees/hears: nothing.

════ DEFECT 3 — CONFIRMED, cosmetic. The header lies about the set size ════
- Where: `scripts/shoot-store.mjs:6` ("The five images in store/…") and `:11` ("same five shots") vs `EXPECTED` at lines 74-76 and the run instructions at line 23 ("writes store/01..08") — the set is eight.
- Exact patch: line 6 `five images` → `eight images`; line 11 `same five shots` → `same eight shots`.
- Accounting: comment-only, zero everything. Child sees: nothing.

════ VERIFIED-CLEAN LEDGER — the known traps and everything else checked (do not re-fix these) ════
- `voidUnlocked` seed (script 239): comma-joined string `'maple,pirate,gameday,lantern,powder'` — matches `src/game/unlocks.ts:38-48` (`KEY='voidUnlocked'`, `raw.split(',')`) and `WORLD_ORDER` ids at `:28-31`. CORRECT — do not convert to JSON.
- `?w=` trap: the script never uses `?w=`; flow is boot `/` → `#btnPlay` (`index.html:1822`; handler `prototype3d.ts:5596-5599` opens `#worlds`) → world card. CORRECT.
- `#tapGate` trap: script 424-429 dispatches a real `PointerEvent('pointerdown')`; live listener is `pointerdown` on the gate element (`prototype3d.ts:5907`, no `isTrusted` check); the `show`/`armed` race at script 409-418 matches pre-arm (`:5969-5973`) → arm (`:5904-5905`), and `requestedReady` (`src/proto3d/assets3d.ts:36-47`) resolves immediately so the gate always arms. CORRECT.
- Hooks — none renamed. All 11 used hooks exist as `_dbg` assignments landing on `window` atomically at module end (`prototype3d.ts:9571-9572` — `_dbgLive = true; Object.assign(window, _dbgStore)`): `__voidState` :1759, `__edibles` :1713, `__news` :1715, `__rushClock` :1766, `__setMood` :1770 (moods include `'frenzy'`, `void3d.ts:19,1237`), `__faceState` :1775 (`smile = mouth.visible`, `void3d.ts:1588`; frenzy's `maw: 0.12` keeps the smile mesh visible), `__pinMouth` :1787, `__calm` :1793, `__setVoidR` :1833, `__warpVoid` :1859, `__matchState` :1869 (`t` present at :1877).
- Other selectors: `#btnShop` (`index.html:1828`, handler `:6007`, default tab `voids` → `paintVoids`); `#shopGrid .skCard canvas` — cards built `prototype3d.ts:7436-7476` with `<canvas id="skcv_…">`, sized square ONLY on paint (`:7754` `cv.width = size; cv.height = size`), so the 300×150-until-painted wait at script 596-599 is sound; `.skCard.legend` (`:7448`, cash skins live in `src/game/config.ts` §9); `?iapmock=1` honored (`store3d.ts:78, 94`); `#shop`/`#end`/`#worldRow`/`#tapGate`/`daily`/`gift` all present (`index.html:2016/2088/1918/1975/1948/1833`); `#end.show` written by `endMatch` (`:4759/4967`); daily modal suppressed by the `voidDailyLast=today` seed (`:6731-6732`); first `canvas` in the DOM is the game canvas (`:342 insertBefore(body.firstChild)`); autoplay's pointer scheme matches the live joystick (`:2874` pointerdown on canvas, `:2892` pointermove on window keyed to the same pointerId); `Edible {mesh, radius, eaten}` (`:1138`).
- Seeds: every other key has a live reader with matching shape (voidPlayed :5358/:5618, voidTut :5551/:5611, voidCoins :3220, voidXP :4303, voidStreak :4304 + migration :4321-4327, voidStats :6511 — extra keys harmless).
- Lantern framing: `w(v)=(v-6000)*0.05` matches `island.ts:75-76` (`SCALE=0.05`, `CX=CZ=6000`); bathhouse at grid (6280, 2500) confirmed `island.ts:1526`.

Note for the fixing crew: the tree-side halves of Defect 1 — dead `.wCard.lock` CSS (`index.html:1009,1015-1016,1139`) and the no-op teaser loops (`prototype3d.ts:5877-5885`) — are live-tree dead code from the same rename; removing them is a separate, zero-pixel cleanup and was not patched here per the no-edit directive.


============================================================================
## RESULT 4
============================================================================

VERDICT: SOUND WITH CORRECTIONS

All three defects are real in the files as they exist; the two patch lines that matter are correct; the constraint accounting is honest. Four corrections, none fatal.

**Corrections (shortest first)**

1. Defect 2's supporting cite "every other match-path wait ... (lines 408, 414, 430, 442)" is wrong on 442. `/home/user/voidling/artifacts/3d-game/scripts/shoot-store.mjs:439-442` is `growTo` — timeout 150000 with a catch fallback, not 400 s. The 400 s waits are 408, 414, 430-431 only. The defect itself stands unchanged.

2. Defect 2's game cite `prototype3d.ts:8232` is wrong: `matchClock -= dtw * clockSpeed;` is at `/home/user/voidling/artifacts/3d-game/src/prototype3d.ts:8256` (8232 is inside hitStop). Its neighbors are exact: outro armed `outroT = 2.0` at :8400-8401, decremented by sim `dt` at :8246, `endEl.classList.add('show')` at :4759 and :4967, `__rushClock` at :1766. The arithmetic holds: 0.3 + 2.0 sim-seconds at the script's own measured 14-40x slowdown (script lines 277-278, 493-495) is roughly 32-92+ wall seconds against a 120 s budget — genuinely marginal; "PLAUSIBLE" is the right label and the 400000 patch at script line 615 matches the file's own convention.

3. Defect 1's failure narrative says "waits out two 400 s waitForFunction timeouts" — it is one. After the locked-card tap (handler at prototype3d.ts:5821-5847 returns at :5839 without navigating; no reload, so no gate — `armGate` is only reached on the voidAutoPlay path, :5920/:5978), script line 408 passes instantly (`__voidState` already set) and lines 409-414 time out at 400 s and throw uncaught, killing the run before line 430. Same catastrophe — the purge at script 147-167 has already run — half the wait.

4. Defect 3's patch is only half right. Line 11 ("same five shots") describes the script's own output and contradicts `EXPECTED` (script 74-76, eight files) — patch it. But line 6's sentence describes the retired 2D set store/ held when the header was written; changing "five images" to "eight images" makes the header claim the CURRENT eight images depict the retired 2D game, which is false — store/ on disk today holds this script's eight 3D shots (verified: `/home/user/voidling/artifacts/3d-game/store/01-menu.png` ... `08-results.png`, with the same eight in `store/.previous/`). The right fix for line 6 is tense, not count: e.g. `// The five images store/ used to hold were of the RETIRED 2D game — SOLO RUN button,`. (Git history starts at root 589e31e with the 8-shot set already committed, so "five" is the 2D-set count and cannot be eight.)

**Defect 1 — independently CONFIRMED, patch correct.** Script line 385 tests `'lock'`; the only live writer of a world-card lock state is `c.classList.toggle('locked', !!gate)` at prototype3d.ts:5818 (the other `toggle('locked', ...)` at :7104 is shop skin cards); live CSS is `#worlds .wCard.locked` at index.html:1266-1272; the picker markup at index.html:1919-1943 carries no `lock`; :5877/:5881 are read-only querySelectorAlls over `.wCard.lock` (empty set — dead frost-teaser vestige), dead CSS at index.html:1009, 1015-1016, 1139. The provenance comment's cited lines are today exactly as the submission says: index.html:967 and :973 are comment prose, :1097 is `animation: againPulse`. Replacement `return card.classList.contains('locked') ? 'locked' : '';` matches the real writer.

**Ledger spot-checked and true.** voidUnlocked comma format matches `/home/user/voidling/artifacts/3d-game/src/game/unlocks.ts:31` (WORLD_ORDER), :38 (KEY), :43 (`raw.split(',')`) — JSON would break it; tapGate `pointerdown` at prototype3d.ts:5907, no isTrusted, pre-arm :5969-5973 → arm :5904-5905; `requestedReady` resolves immediately (assets3d.ts:36-46); all 11 hooks exist (`__voidState` :1759, `__edibles` :1713, `__news` :1715, `__setMood` :1770, `__faceState` :1775, `__pinMouth` :1787, `__calm` :1793, `__setVoidR` :1833, `__warpVoid` :1859, `__matchState` :1869 with `t` at :1877 — all exact), though the module-end `_dbgLive = true; Object.assign(window, _dbgStore)` is now at :9603-9604, not :9571-9572; `smile: mouth.visible` void3d.ts:1588 exact; frenzy `maw: 0.12` void3d.ts:1237 exact; island.ts:75-77 and bathhouse (6280, 2500) ~:1526 exact; store3d.ts `iapmock` :78, `iapAvailable` :94; `skcv_` :7463, `cv.width = size` :7754 exact; index.html ids 1822/1828/1833/1918/1948/1975/2016/2088 all exact; canvas insertBefore prototype3d.ts:342 exact; daily suppress :6731-6732 exact; autoplay scheme :2874/:2892 exact; Edible :1138 exact. Seed-reader line numbers drifted +43-60 (actual: voidCoins :3263, voidXP :4363, voidStreak :4364, migration ~:4378-4381, voidStats :6571, voidPlayed :5418/:5433, voidTut :5611) — content true, lines stale, consistent with the disclosed live editing of prototype3d.ts.

**Constraints.** 1-3 pass trivially: every patch is inside scripts/shoot-store.mjs — 0 seeded draws added/removed, 0 materials/textures/spheres, no grade clip introduced, 0 triangle/memory cost. A child sees and hears nothing different; a store visitor sees the same eight screenshots — what changes is only that a mis-seeded future shoot dies loudly in a second instead of silently destroying the set it exists to protect.
