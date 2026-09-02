# DRAFT — in progress (refute-board)

Commit under refutation: 592e9a3

## What I ran

## What I checked on disk

## Kill shots

## Corrections (verbatim)

### (append 1) disk reads, first pass
- `qa/sizerank.mjs` DOES NOT EXIST at HEAD (`ls qa/sizerank.mjs` -> No such file). The commit message and the comment at src/prototype3d.ts:4355 cite it as the source of 786 frames / 99.9% / 99.7% / 41.5% / 19.8%.
- `qa/_stickedge.mjs:62` hard-derefs `document.getElementById('board').dispatchEvent(...)` — no guard.
- `src/prototype3d.ts:5616` LOAD_TIPS still ships `'tip: rival voids can eat YOU — check the leaderboard sizes'`.
- `src/prototype3d.ts:4313` and `:4324` comments still say "the board prefixes the chaser with ⚡".
- guarded readers confirmed by read: qa/contrast2.mjs:36 `if (!el) continue`; qa/_bug9.mjs:9 querySelectorAll + :16 `if(!e||!vis(e))return null`; qa/_bug10.mjs:32 `?.textContent`; qa/_bug12.mjs:27 `if(!e)return false`; qa/_mvbubble.mjs:50-52 `board && ...`.
- unread yet: qa/hudsize.mjs, qa/_rb_misc.mjs r(), qa/_mvhud.mjs SNAP.

### (append 2) disk reads, second pass
- Only code commit after 592e9a3 is 0efda23 (2026-09-01 23:07:31, src/prototype3d.ts only); dist/ was built 2026-09-02 00:13:43, so the :4177 preview IS the post-removal build. `curl :4177/ | grep -c 'id="board"'` -> 0. No rebuild needed for this refutation.
- `qa/sizerank.mjs` is cited by docs/crews/round-4/hud-subtract.proposal.md §4.2/§7.2 as the crew's probe; it was never landed in qa/ (git log --all -- qa/sizerank.mjs is empty; find / finds nothing). All five headline numbers in the commit message and in src/prototype3d.ts:4353-4360 were therefore transcribed from a crew document, not re-run — Rule 3 as written ("every number you write down must be one you actually ran"). The governor's own scratchpad board.txt (Sep 1 23:02) is the commit message verbatim, no run log.
- End screen: src/prototype3d.ts:5061 `endList.innerHTML = rows.map(...)` renders rank / colour dot / name / score for every JOINED void (same filter as the deleted board); CSS `#end .er` at index.html:808-815. Solo path (:4854) blanks the list. So scores ARE reflected at the end; item 4 is not a kill on that ground — still to be shot.
- ⚡ readers: src/prototype3d.ts:4324 brag-bubble lookup is `passer.name.endsWith(r.name)` — works on the bare name (it worked on the prefixed one too). End-screen rows (:4866) and track('match_end') (:5064-5071) always built from `r.name` directly and never saw the prefix. Only other ⚡ uses are a quest icon (:3401) and a trophy icon (:6708) — unrelated. No reader expected the prefix.
- `rivals.ts` is at src/proto3d/rivals.ts; `softCap = Math.max(Math.min(START_R + 0.02 * _t, 1.6), pr * 0.80)` at :973 — the mechanism the commit cites is real in source.
- Stale text left by the commit: index.html:133-152 four comment blocks still describe the board ("Own pill, clear of the board", "The board is capped and the player's row is pinned visible", "Six rows now fit exactly; a seventh would scroll") above the growth-bar rule; qa/hudsize.mjs:1 header "(#timer left:42vw, #board max-width:38vw"; qa/solotog.mjs:13 "This checks all three" after two of the three were cut; src/prototype3d.ts:4313,:4324 "the board prefixes the chaser with ⚡".
- Box state: a chromium job from the parent session (s2.mjs fresh 4177) is running, load 4.2, no /tmp/gpu.lock held. Holding all browser work until it exits.

### (append 3) probe launched
- Box went quiet at 10:0x UTC (chromium=0, load 3.38). Took /tmp/gpu.lock and ran my own re-derivation (`scratchpad/refute_board.mjs`, copied below in "What I ran"): 430x932, CDP safe-area insets top 59 / bottom 34, Maple, chase-nearest driver from qa/rivalnotice.mjs (a STRONGER player than the crew's rotating heading — chosen to attack the number from the side the crew's caveat 3 admits it did not cover), samples every distinct `__matchState().t` in 20..60, then render restored for the HUD frame, then `__rushClock(6)` for the end screen. Shots to docs/crews/round-5/shots/board-skeptic-{hud,end}.png.
- 10:02 UTC another agent took /tmp/gpu.lock before my run started (mkdir failed, chromium=0 at that instant). Re-queued on the lock (atomic mkdir, stale >25 min, chromium=0, load<3.5) rather than running under it.
- BOX NOTE for the governor: `pgrep -c chromium` (the count the brief tells us to check) is blind — the Playwright binary's process name is `chrome` (`/opt/pw-browsers/chromium-1194/chrome-linux/chrome`). It returned 0 at 09:5x while a GPU process was at 346% CPU. `pgrep -c chrome` is the count that works. The 10:04:27 lock belongs to `qa/tutstrand.mjs 4202` (started 10:04:28); queued behind it.

### (append 4) the crew's probe is a placeholder
- docs/crews/round-4/hud-subtract.proposal.md §7 "THE PROBE" contains only the literal text `⟪PROBE⟫`. §7.2 (sizerank) and §7.3 (endboard) are cited in the body; neither file exists in qa/, in any worktree, or in git history (`git log --all -- qa/sizerank.mjs` empty; `ls qa/endboard.mjs` -> No such file). The five numbers the commit puts in a source comment cannot be re-run by anyone from anything on disk.
- Proposal A11 (src/proto3d/bubbles.ts:61-64 `HUD_TOP = 206`, "the top strip the leaderboard, clock and wallet own") was deliberately NOT landed; the 206px no-speech strip is still sized for a board that is gone. Not a kill of this commit (the proposal itself asked for it in its own commit with qa/bubbleclear.mjs green) — recorded as the open follow-up.
- The deleted ⚡ marked `r.hunting` (the BULLY archetype's identity). The halo the commit says replaces it is coloured by SIZE threat, not identity. 0efda23 (five minutes later) removed the join card that said "⚡ she CHASES you". Whether the hunter is still identified anywhere in-match is being checked (rivals.ts halo rule) — this is the cards lane's surface as much as mine, so it goes in as a note, not a shot, unless the halo also fails to mark her.
- `npx tsc --noEmit` at HEAD: exit 0, 6.5s wall (run under nice -n 19 while the popup lane held the GPU).
- The five HUD_SEL probes (crowdface, personsheet, gapesheet, moodsheet, moverface) consume `#board` only inside an addStyleTag string / querySelectorAll — a non-matching selector is inert. qa/_stickedge.mjs IS runnable (imports qa/_boot.mjs, which exists) and now throws `TypeError: Cannot read properties of null (reading 'dispatchEvent')` at :62 on its first case.
