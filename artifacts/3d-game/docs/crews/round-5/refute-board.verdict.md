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
