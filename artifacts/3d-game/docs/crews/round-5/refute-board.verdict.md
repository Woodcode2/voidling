# DRAFT — in progress (refute-board) — disk work complete, browser measurements PENDING behind the GPU lock

Commit under refutation: 592e9a3 ("The top-left scoreboard is gone — and the reason he gave for it is false").
Skeptic: refute-board, round 5. Everything below was read at HEAD (582d993) or run on this box on 2026-09-02.

## What I ran

- `git show 592e9a3` (full diff: index.html, qa/solotog.mjs, src/prototype3d.ts — 3 files, +57/-54). Read the diff, then the files at HEAD.
- `grep -n -i board src/*.ts index.html` and `grep -n -i board qa/*.mjs` (every hit read; list under "What I checked").
- `ls qa/sizerank.mjs` → No such file. `git log --all -- qa/sizerank.mjs` → empty. `find / -name 'sizerank*'` → nothing. `ls /home/user/voidling/.claude/worktrees/*/artifacts/3d-game/qa/sizerank.mjs` → nothing. `ls qa/endboard.mjs` → No such file.
- `git diff 592e9a3 HEAD --stat -- src index.html qa` → one later code commit, 0efda23 (23:07:31). `ls -la dist/assets/main-*.js` → built 2026-09-02 00:13:43, i.e. after both. `curl -s :4177/ | grep -c 'id="board"'` → 0. The :4177 preview is the post-removal build; no rebuild needed.
- `nice -n 19 npx tsc --noEmit` at HEAD → exit 0, 6.5s wall.
- PENDING (queued on /tmp/gpu.lock behind the governor's own s2.mjs / drumprobe3 runs since 10:02 UTC): `node scratchpad/refute_board.mjs 4177 docs/crews/round-5/shots` — my re-derivation; `node qa/solotog.mjs 4177`; `node qa/uisystem.mjs 4177`. Source of refute_board.mjs is at the end of this file so the run is reproducible and can be landed as qa/sizerank.mjs.
- Box note: `pgrep -c chromium` is blind on this box — the Playwright binary's process name is `chrome`. It printed 0 at 09:5x while a GPU process sat at 346% CPU. `pgrep -c chrome` is the count that works. Every wait in this lane used the working one.

## What I checked on disk

### 1. What still reads #board
Runtime (src/, index.html): zero live references. `el('board')`, `boardEl`, `lastBoardHtml`, the `#board` rules, `body.menu #board` and the markup are all gone (diff confirmed against HEAD). Remaining hits are comments (src/prototype3d.ts:4243,4247,4313,4324,4345; index.html:118-120,134-153) and unrelated words (quest board, weekly TOP VOIDS board, clapboard, circuit board).

qa/ readers, each read, not trusted from the commit:
| probe | line | how it reads #board | degrades? |
|---|---|---|---|
| qa/contrast2.mjs | 36 | `const el = document.getElementById(id); if (!el) continue;` | yes |
| qa/hudsize.mjs | 29 / 44 | `if (!n) continue;` then `const e = r[id]; if (!e) continue;` | yes (header comment at :1 is stale: "#timer left:42vw, #board max-width:38vw") |
| qa/crowdface.mjs, personsheet.mjs, gapesheet.mjs, moodsheet.mjs, moverface.mjs | HUD_SEL | `addStyleTag({content: HUD_SEL{opacity:0}})` / querySelectorAll — a non-matching id in a selector list is inert | yes |
| qa/_bug9.mjs | 9, 16 | querySelectorAll; `if(!e||!vis(e))return null` | yes |
| qa/_bug10.mjs | 32 | `document.getElementById('board')?.textContent||''` | yes |
| qa/_bug12.mjs | 27 | `if(!e)return false` | yes |
| qa/_mvbubble.mjs | 50-52 | `board && getComputedStyle(board)...` | yes |
| qa/_mvhud.mjs | 24, 56 | `if (el) push(id, el)` | yes |
| qa/_rb_misc.mjs | 63 | `if (!e) return null` | yes |
| qa/_petshot.mjs | 27 | addStyleTag selector | yes |
| **qa/_stickedge.mjs** | **62** | **`document.getElementById('board').dispatchEvent(...)` — no guard** | **NO — throws TypeError on its first case. It is runnable (imports qa/_boot.mjs, which exists; 8 sibling _stick*.mjs probes share that boot).** Not in qa/gate.mjs. |
| qa/solotog.mjs | — | the two `#board` assertions are gone; the `board:` field is gone | n/a (comment at :13 still says "This checks all three" — two remain) |

The commit's "seven probes degrade silently" is true of the seven it meant (the proposal's list). It missed _stickedge.mjs, which is an eighth reader and does not degrade.

### 2. The clock
CSS at HEAD (index.html:124): `position: fixed; top: max(12px, calc(12px + env(safe-area-inset-top, 0px))); left: 0; right: 0; text-align: center; z-index: 5; pointer-events: none`. #coins is `top: calc(12px + env(...top)); right: calc(12px + env(...right))` (:457), #btnQuit `top: calc(56px + inset-top); right: calc(12px + inset-right); 44x44` (:1009). The timer's BOX now spans the full width and its box overlaps #coins' box by construction; what matters visually is the glyph run, which is what my probe measures (Range rect), against #coins and #btnQuit, with CDP safe-area insets top 59 / bottom 34 at 430x932. Nothing else in the top band was positioned off the board's lane: #news is `top: calc(112px + inset)` centred, and its comment explains 112 by the DEVOURED meter and the banner, not the board. PENDING: rects and the shot.

### 3. The ⚡ marker
Grep for ⚡ in src/: the remaining uses are a quest icon (:3401) and a trophy icon (:6708). Readers of `rows[].name` after the change: the crown card (:4282), the lead-lost card (:4300), the "you passed" line (:4316) — all had `.replace('⚡ ','')` guards that are now correctly gone; the brag-bubble lookup at :4325 is `passer.name.endsWith(r.name)`, which is true for a bare name (it was written to tolerate the prefix and tolerates its absence). The end screen's rows (:4866) and `track('match_end')` (:5064-5071, `top: Math.round(rows[0].score)`) were always built from `r.name` directly and never saw a prefix. Telemetry sends no names. No reader expected the prefix. Two comments still describe it (:4313, :4324).

### 4. The end screen
Scores are shown at the end and were before this commit: src/prototype3d.ts:5061 `endList.innerHTML = rows.map(...)` paints rank number (👑 for a winning player), colour dot, name and rounded score for every JOINED void, the same filter the live board used; CSS `#end .er` at index.html:808-815 (16px rows, `.me` highlighted). The headline carries placement (`#${myRank} · …` on a loss, :5023). The Solo path blanks the list (:4854) — Solo has no rivals. So the removal did not leave scores shown nowhere. The proposal's §5.1/§5.2 "must gain" items (a margin per row; naming the winner unconditionally when a trophy or level-up takes the lead line) were NOT landed in 592e9a3 and are not claimed by it. PENDING: the shot.

### 5. The measurement itself
- The commit message and src/prototype3d.ts:4353-4360 state five numbers (786 frames, 99.9%, 99.7%, 41.5% of 4,674, 19.8%) as "Measured … (qa/sizerank.mjs)". qa/sizerank.mjs does not exist at HEAD, in any worktree, or anywhere in git history. The crew document the numbers came from (docs/crews/round-4/hud-subtract.proposal.md §4.2) cites its probe as §7.2; §7 of that document is the literal placeholder text `⟪PROBE⟫`. The governor's scratchpad note for this commit (board.txt, 23:02) is the commit message verbatim with no run. So the numbers were transcribed, not run — Rule 3 by its own wording, in a source comment that "is evidence to every later reader and nobody re-derives".
- The MECHANISM the commit cites is real in source: src/proto3d/rivals.ts:973 `const softCap = Math.max(Math.min(START_R + 0.02 * _t, 1.6), pr * 0.80);` — every non-hunter's radius is clamped to a clock term or 0.8x the player, and score is not in it. A hunter's size is authored separately (`want`). From source alone, size cannot encode score order among non-hunters; the QUESTION is only whether the player's own rank read off size is wrong as often as claimed. PENDING: my per-frame numbers.

### Other facts the commit leans on, checked
- "who can eat you right now is said by the ground halo turning red": rivals.ts:2025-2029 — green when `pr > rv.r * 1.2`, red `0xff5560` when `rv.r > pr * EAT_RATIO`, wind-up strobe `0xff2b3c` during a hunter's charge (:2017-2021), gold when the hunter is the prize. True for size-threat. The ⚡ marked `r.hunting` — the hunter's IDENTITY — which the halo shows only while she is charging or bigger; five minutes later 0efda23 also removed the join card that said "⚡ she CHASES you". Whether the hunter is named anywhere in-match now is the cards lane's question; recorded here, not shot.
- src/proto3d/bubbles.ts:64 `HUD_TOP = 206` is documented as "the top strip the leaderboard, clock and wallet own" — the bubble no-go strip is still sized for the board. Proposal A11 asked for this in its own commit with qa/bubbleclear.mjs green; the commit did not claim it. Open follow-up, not a defect of 592e9a3.
- Six CSS rules: #board, .row, .row.me, .dot, .nm, .sc — six, as stated. Menu-hide selector: gone. Solo toggle line: gone.

## Kill shots

None yet that kills the removal. The following are facts that fail; whether they kill the commit's stated reasoning depends on the PENDING measurement.

1. **The numbers in the source were never run by anyone who can be found.** src/prototype3d.ts:4353-4360 cites `qa/sizerank.mjs`; `ls qa/sizerank.mjs` → No such file; docs/crews/round-4/hud-subtract.proposal.md §7 is `⟪PROBE⟫`. A comment that says "Measured" must point at something on disk (Rule 3, Rule 4).
2. **qa/_stickedge.mjs:62 crashes at HEAD**: `document.getElementById('board').dispatchEvent(...)` on a null. The commit's sweep of readers missed it.
3. **A shipped loading tip tells the child to use the board**: src/prototype3d.ts:5616 `'tip: rival voids can eat YOU — check the leaderboard sizes'`. Player-facing text that names a surface that no longer exists.

## Corrections (verbatim)

PENDING items will be finalised after the run; those below are settled from disk.

C1. src/prototype3d.ts:5616 — replace the line
`  'tip: rival voids can eat YOU — check the leaderboard sizes',`
with
`  'tip: rival voids can eat YOU — a RED ring means run',`
(the halo rule at src/proto3d/rivals.ts:2028; the tip now names the channel the commit says replaces the board).

C2. qa/_stickedge.mjs:62 — replace
`    document.getElementById('board').dispatchEvent(new PointerEvent('pointerup', {`
with
`    document.getElementById('timer').dispatchEvent(new PointerEvent('pointerup', {`
(the event is dispatched at clientX=CX, clientY=8, which is where #timer now sits; both are pointer-events:none top-band chips, so the case keeps its meaning).

C3. src/prototype3d.ts:4313 — delete the line
`    // the board prefixes the chaser with ⚡; the sentence should not`
and at :4324 replace
`    // …the board prefixes the chaser's row with ⚡, so match on the bare name`
with
`    // rows carry the bare name; endsWith is the tolerant match left from the ⚡ era`

C4. index.html:142-153 — delete the three comment blocks that describe the deleted board's geometry, from the line beginning `      /* the score column and the centred timer occupied the same band` through the line ending `Six rows now fit exactly; a seventh would scroll. */` (12 lines). Keep :135-141 (the "N EATEN" retirement is cited by this very commit) and :133-134.

C5. qa/hudsize.mjs:1 — replace
`// The HUD is laid out in vw units (#timer left:42vw, #board max-width:38vw,`
with
`// The HUD is laid out in vw units (#timer left:0/right:0 since the board went,`

C6. qa/solotog.mjs:13 — replace `// are scheduled. This checks all three, then reloads to prove the setting` with `// are scheduled. This checks both, then reloads to prove the setting`.

C7. (PENDING the run) src/prototype3d.ts:4353-4360 — the five transcribed numbers are replaced by the numbers from a probe that exists on disk, and the citation `(qa/sizerank.mjs)` is made true by landing the probe below as qa/sizerank.mjs.

## Appendix — the probe (scratchpad/refute_board.mjs), to be landed as qa/sizerank.mjs
    // refute-board: re-derive the size-vs-score claim per FRAME on the match clock,
    // shoot the HUD with real safe-area insets, shoot the end screen.
    //   node refute_board.mjs <port> <shotdir>
    import { chromium } from 'playwright';
    import fs from 'fs';
    
    const PORT = process.argv[2] || '4177';
    const SHOTS = process.argv[3] || '.';
    const INS = { top: 59, bottom: 34, left: 0, right: 0 };   // iPhone 15 Pro Max portrait, as qa/_mvhud.mjs
    fs.mkdirSync(SHOTS, { recursive: true });
    
    const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
      args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
    const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
    p.setDefaultTimeout(900000);
    const errs = [];
    p.on('pageerror', (e) => errs.push(String(e.message).slice(0, 200)));
    const cdp = await p.context().newCDPSession(p);
    await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: INS });
    await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
    await p.addInitScript(() => { try {
      localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
      localStorage.setItem('voidDailyLast', new Date().toDateString());
      localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder');
    } catch { } });
    
    await p.goto(`http://127.0.0.1:${PORT}/?w=maple`, { waitUntil: 'domcontentloaded', timeout: 300000 });
    await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
    await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => { if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
    const boardInDom = await p.evaluate(() => ({ board: !!document.getElementById('board'), timer: !!document.getElementById('timer') }));
    console.log('dom:', JSON.stringify(boardInDom));
    await p.waitForSelector('#btnPlay', { state: 'visible' });
    await p.evaluate(() => document.getElementById('btnPlay').click());
    await p.waitForSelector('#worldRow .wCard[data-world="maple"]', { state: 'visible' });
    await p.evaluate(() => document.querySelector('#worldRow .wCard[data-world="maple"]').click());
    await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 6, null, { timeout: 600000 });
    
    // driver: chase the nearest swallowable thing (qa/rivalnotice.mjs's player)
    // + per-frame sampler keyed on distinct __matchState().t
    await p.evaluate(() => {
      const cv = document.querySelector('canvas');
      const cx = innerWidth / 2, cy = innerHeight / 2;
      cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: cx, clientY: cy, bubbles: true }));
      window.__SR = []; let lastT = -1;
      const tick = () => {
        const vs = window.__voidState();
        let best = null, bd = 1e9;
        for (const e of window.__edibles) {
          if (e.eaten || !e.mesh?.visible || e.radius > vs.r * 0.92) continue;
          const dx = e.mesh.position.x - vs.x, dz = e.mesh.position.z - vs.z;
          const d = dx * dx + dz * dz;
          if (d < bd) { bd = d; best = { dx, dz }; }
        }
        if (best) {
          const m = Math.hypot(best.dx, best.dz) || 1;
          dispatchEvent(new PointerEvent('pointermove', { pointerId: 1,
            clientX: cx + best.dx / m * 110, clientY: cy + best.dz / m * 110, bubbles: true }));
        }
        const ms = window.__matchState();
        if (ms.t !== lastT && ms.t >= 20 && ms.t <= 60 && window.__SR.length < 20000) {
          lastT = ms.t;
          window.__SR.push({ t: ms.t, you: { s: ms.score, r: ms.r },
            rv: ms.rivals.filter((r) => r.joined).map((r) => ({ n: r.name, s: r.score, r: r.r, h: r.hunt })) });
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    // no draw while sampling: ~9x faster (qa/solotog.mjs); the numbers are state, not pixels
    await p.evaluate(() => { window.__renderer.render = () => {}; });
    await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 60, null, { timeout: 900000 });
    const SR = await p.evaluate(() => window.__SR);
    fs.writeFileSync(`${SHOTS}/board-skeptic-samples.json`, JSON.stringify(SR));
    
    // ── analysis, per frame ──
    let frames = 0, orderDis = 0, meWrong = 0, pairs = 0, inv = 0, ties = 0, sumAbs = 0;
    const trans = {}; let biggest = 0;
    for (const f of SR) {
      if (!f.rv.length) continue;
      frames++;
      const all = [{ n: 'You', s: f.you.s, r: f.you.r, me: true }, ...f.rv];
      const byS = [...all].sort((a, c) => c.s - a.s), byR = [...all].sort((a, c) => c.r - a.r);
      if (byS.some((x, i) => x !== byR[i])) orderDis++;
      const sRank = byS.findIndex((x) => x.me) + 1, rRank = byR.findIndex((x) => x.me) + 1;
      if (sRank !== rRank) meWrong++;
      sumAbs += Math.abs(sRank - rRank);
      const k = `${sRank}->${rRank}`; trans[k] = (trans[k] || 0) + 1;
      if (rRank === 1) biggest++;
      for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
        const a = all[i], c = all[j]; pairs++;
        if (a.s === c.s) continue;
        const hi = a.s > c.s ? a : c, lo = a.s > c.s ? c : a;
        if (hi.r < lo.r) inv++; else if (hi.r === lo.r) ties++;
      }
    }
    const pct = (x, n) => (100 * x / Math.max(1, n)).toFixed(1) + '%';
    const last = SR[SR.length - 1];
    console.log(`\nSIZE vs SCORE — Maple, driven, per frame, t=20..60 on __matchState().t`);
    console.log(`  distinct frames sampled           ${SR.length} (with >=1 joined rival: ${frames}); first t=${SR[0]?.t.toFixed(2)} last t=${last?.t.toFixed(2)}`);
    console.log(`  rivals joined at t=60             ${last?.rv.length}`);
    console.log(`  size order != score order         ${pct(orderDis, frames)} of frames`);
    console.log(`  player's rank read off size wrong ${pct(meWrong, frames)} of frames; mean |dRank| ${(sumAbs / Math.max(1, frames)).toFixed(2)}`);
    console.log(`  strict pair inversions            ${pct(inv, pairs)} of ${pairs} pairs; size-ties w/ different score ${pct(ties, pairs)}`);
    console.log(`  player is the biggest void        ${pct(biggest, frames)} of frames`);
    console.log(`  score rank -> size rank           ${Object.entries(trans).sort((a, c) => c[1] - a[1]).map(([k, v]) => `${k} ${pct(v, frames)}`).join(' · ')}`);
    console.log(`  final frame t=${last?.t.toFixed(1)}: You ${Math.round(last?.you.s)} r${last?.you.r.toFixed(2)} | ` + last?.rv.map((r) => `${r.n} ${Math.round(r.s)} r${r.r.toFixed(2)}${r.h ? ' (hunting)' : ''}`).join(' | '));
    
    // ── HUD frame with render back on ──
    await p.evaluate(() => { delete window.__renderer.render; });
    await p.waitForTimeout(2500);
    const hud = await p.evaluate((ins) => {
      const r = (id) => { const e = document.getElementById(id); if (!e) return null; const cs = getComputedStyle(e); const b = e.getBoundingClientRect();
        return { x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height), r: Math.round(b.right), bo: Math.round(b.bottom),
          cx: +(b.left + b.width / 2).toFixed(1), display: cs.display, left: cs.left, right: cs.right, top: cs.top, ta: cs.textAlign, txt: e.textContent.trim().slice(0, 12) }; };
      const timer = r('timer'), coins = r('coins'), quit = r('btnQuit'), growth = r('growth');
      const ov = (a, c) => a && c ? Math.max(0, Math.min(a.r, c.r) - Math.max(a.x, c.x)) * Math.max(0, Math.min(a.bo, c.bo) - Math.max(a.y, c.y)) : -1;
      // the text itself, not the full-width box: measure the glyph run with a Range
      const te = document.getElementById('timer'); const rg = document.createRange(); rg.selectNodeContents(te); const tb = rg.getBoundingClientRect();
      return { vw: innerWidth, vh: innerHeight, screenCx: innerWidth / 2, timer, timerText: { x: Math.round(tb.left), r: Math.round(tb.right), w: Math.round(tb.width), cx: +(tb.left + tb.width / 2).toFixed(1), y: Math.round(tb.top) },
        coins, quit, growth, ovTimerBoxCoins: ov(timer, coins), ovTimerBoxQuit: ov(timer, quit),
        ovTimerTextCoins: coins ? Math.max(0, Math.min(tb.right, coins.r) - Math.max(tb.left, coins.x)) * Math.max(0, Math.min(tb.bottom, coins.bo) - Math.max(tb.top, coins.y)) : -1,
        ovTimerTextQuit: quit ? Math.max(0, Math.min(tb.right, quit.r) - Math.max(tb.left, quit.x)) * Math.max(0, Math.min(tb.bottom, quit.bo) - Math.max(tb.top, quit.y)) : -1,
        notchInset: ins.top, timerTopClearsNotch: tb.top >= ins.top, t: window.__matchState().t, body: document.body.className };
    }, INS);
    console.log('\nHUD @ 430x932, safe-area top 59:', JSON.stringify(hud, null, 1));
    await p.screenshot({ path: `${SHOTS}/board-skeptic-hud.png` });
    
    // ── end screen ──
    await p.evaluate(() => { window.__rushClock(6); });
    await p.waitForFunction(() => document.getElementById('end')?.classList.contains('show'), null, { timeout: 900000 });
    await p.waitForTimeout(3000);
    const end = await p.evaluate(() => {
      const ms = window.__matchState();
      const rows = [...document.querySelectorAll('#endList .er')].map((e) => e.textContent.replace(/\s+/g, ' ').trim());
      const vis = (id) => { const e = document.getElementById(id); if (!e) return null; const cs = getComputedStyle(e); return cs.display !== 'none' && +cs.opacity > 0.05; };
      return { hd: document.getElementById('endHd')?.textContent, sub: document.getElementById('endSub')?.textContent?.slice(0, 80), rows,
        joined: ms.rivals.filter((r) => r.joined).map((r) => `${r.name} ${Math.round(r.score)}`), you: Math.round(ms.score),
        endListVisible: vis('endList'), timerVisible: vis('timer'), listRect: (() => { const e = document.getElementById('endList'); const b = e.getBoundingClientRect(); return { y: Math.round(b.top), h: Math.round(b.height) }; })() };
    });
    console.log('\nEND SCREEN:', JSON.stringify(end, null, 1));
    await p.screenshot({ path: `${SHOTS}/board-skeptic-end.png` });
    console.log('\npage errors:', errs.length ? errs : 'none');
    await b.close();
