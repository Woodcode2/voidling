// ══════════════════════════════════════════════════════════════════════════
//  THE NEWSROOM ARC — the town tells a story, and a child can read it
// ══════════════════════════════════════════════════════════════════════════
//
//    node qa/newsarc.mjs                    # maple
//    ARC_WORLD=pirate node qa/newsarc.mjs   # or gameday, or lantern
//
//  BUDGET 15-35 MINUTES PER WORLD. That is not this probe being wasteful, it is
//  swiftshader: a frame costs about half a second of wall clock, the card
//  animation it waits on is main-thread driven, and sections E and F wait out a
//  real 11-second reaction cooldown and a real match ending. Pirate Bay is the
//  slowest to reach a live match and Maple the quickest. Run it per world.
//
//  Written to docs/NEWSROOM-BRIEF.md deliverable 5, and to the complaint that
//  produced the brief: the owner, reading his own game on a phone, could not
//  tell whether the news was the town or the void — because a family void's
//  speech was being routed into the newspaper (`💬 CHOMPZILLA: ACT TWO: I
//  CHARGE!!`) whenever the speaker was too far away to carry a bubble.
//
//  FIVE ASSERTIONS, all of them about what reached the player:
//    A. THE ARC RUNS FORWARD. Morning first, at least twice, then doubt, alarm,
//       panic — in order, never skipping a rung, never reversing. And morning
//       does not mention the void, because it is the baseline everything else
//       lands against.
//    B. NO VOID EVER SPEAKS IN THE NEWS. Not one card carries a 💬 chip or any
//       of the six family names. This is the original bug and it is checked on
//       the LIVE FEED rather than only on the pools (qa/newsstyle.mjs does the
//       pools) — the two together cover both a bad line and a bad route.
//    C. THE PAPER IS NOT A METRONOME. No headline repeats inside one match.
//    D. THE CARD IS ON SCREEN. A logged headline is evidence the code ran. A
//       measured bounding box with the same text in it is evidence a child
//       could read it. Both, every time.
//    E. A NAMED THING GOING IS REPORTED. Eat a landmark for real, through the
//       real eat path, and the paper says something about it within N seconds
//       — in this world's voice, not the old one-size template.
//
//  ── TWO HONEST SHORTCUTS, DECLARED ────────────────────────────────────────
//  A match is 180 seconds and a frame under swiftshader costs about half a
//  second of wall clock, with dt clamped at 0.05 so the game clock advances at
//  most 0.05s per frame. A naturally-paced full match is therefore ~30 minutes
//  of waiting per world before the arc has even reached PANIC, and the news
//  cadence would give about a dozen samples.
//
//    1. `__news()` fires a card on demand. It is not a test double — it calls
//       the same showNews() the match loop calls, with the same live state, so
//       what it produces is exactly what the player would have seen at that
//       moment. It samples the feed; it does not simulate it.
//    2. `__rushClock(t)` moves the match clock. The clock is one of the arc's
//       two real inputs (the other is how much of the town is gone), so this
//       is the passage of time, which is the thing being tested.
//
//  What is NOT shortcut: the match is real, the void is driven by real pointer
//  gestures, the landmark in section E is eaten by the real eat path, and every
//  assertion reads the DOM the player would have been looking at.
import { chromium } from 'playwright';
import fs from 'node:fs';

// id -> the name a child is told they found, read straight off the source so
// section E can assert the paper printed THAT thing and not some other story.
// Same trick qa/newsstyle.mjs uses: the copy is the fixture.
const STICKER_NAME = Object.fromEntries(
  [...fs.readFileSync(new URL('../src/game/stickers.ts', import.meta.url), 'utf8')
    .matchAll(/id: '([^']+)'[^\n]*name: '((?:[^'\\]|\\.)*)'/g)]
    .map(([, id, n]) => [id, n.replace(/\\'/g, "'")]),
);

const BASE = process.env.HITCH_URL || 'http://localhost:4177/';
const WORLD = process.env.ARC_WORLD || 'maple';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader'] });
const fail = [];
const ok = (cond, msg) => { console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${msg}`); if (!cond) fail.push(msg); };

// the six family names, from FAMILY_TITLE in prototype3d.ts. The town has no
// way to know any of them and must never print one.
const RIVALS = ['WOBBLES', 'GLITZ', 'BITSY', 'CHOMPZILLA', 'DOZER', 'NIBBLES'];
// morning is the ordinary day. If any of these appear in a phase-0 card the
// baseline has been contaminated and every later beat lands on nothing.
const VOIDWORDS = /\b(void|hole|sinkhole|devour|swallow|eaten|guest in the purple)\b/i;

const ctx = await browser.newContext({ viewport: { width: 430, height: 932 } });
await ctx.addInitScript(() => {
  try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidFirstNom', '1');
    localStorage.setItem('voidTut', '1'); localStorage.setItem('voidBookSeen', '1');
    // every world open, so ARC_WORLD can point anywhere without playing three
    // matches to get there first
    localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern');
  } catch { /* private mode */ }
});
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('  PAGE ERROR: ' + e.message));
// ── HOW THIS PROBE REACHES ITS WORLD, AND WHY NOT THROUGH THE PICKER ──────
//
// `?w=<world>` selects the world at module init (prototype3d.ts:306-308) and
// `?len=` sets DEBUG_HARNESS (:2606), which auto-starts the match (:5805). One
// page load, straight into a live match in the world under test.
//
// THE FIRST VERSION TAPPED THE PICKER, and it cost hours. It worked on Maple
// and hung forever on the other three, and the reason is a four-link chain that
// is worth writing down because every link is invisible on its own:
//
//   1. `?len=150` makes DEBUG_HARNESS true, which SUPPRESSES the daily reward
//      card (:5597 `&& !DEBUG_HARNESS`). So the claim loop below found nothing
//      to claim, broke on iteration 0, and never wrote `voidDailyLast`.
//   2. It also auto-starts the match at :5805 — so on Maple the probe was
//      measuring a match that the QUERY STRING had started, not the picker tap.
//   3. Tapping a world that is not the built one reloads via
//      `location.href = location.pathname` (:4869), which DROPS the query
//      string. DEBUG_HARNESS flips false.
//   4. The daily card therefore appears for the first time on load 2, and the
//      autoplay pickup (:4929) correctly refuses to start a match underneath a
//      full-screen modal: `pendingLaunch = true; coverRelease('pack'); return`.
//      `closeDaily()` is the only thing that clears that, and it is reachable
//      only from a tap — so with nobody tapping, the game waits forever.
//
// A CHILD IS NEVER STUCK THERE: they see their reward, tap it, and the match
// starts. The observation that looked like a dead game — t frozen at exactly 0
// with the picker closed and no loading screen — was `__matchState().t`
// returning `started ? matchElapsed() : 0` (:1415), i.e. a hard zero meaning
// "no match has begun", not a stalled clock. Read that field carefully.
//
// Picker navigation is qa/unlocks.mjs's job and it is covered there with
// child-only gestures. This file's subject is the newsroom, so it takes the
// documented direct route and spends its time on headlines.
const resp = await page.goto(`${BASE}?w=${WORLD}&len=150`);
if (!resp || !resp.ok()) { console.log(`server ${resp ? resp.status() : 'down'} at ${BASE}`); process.exit(1); }
await page.waitForFunction(() => '__season' in window, undefined, { timeout: 300000 });
// …and claim the daily anyway if it somehow appears. Cheap, and the failure it
// prevents is silent: a full-screen modal over everything this probe measures.
for (let i = 0; i < 12; i++) {
  const up = await page.evaluate(() => !!document.getElementById('daily')?.classList.contains('show'));
  if (!up) break;
  await page.evaluate(() => document.getElementById('dailyClaim')?.click());
  await page.waitForTimeout(900);
}
const built = await page.evaluate(() => window.__newsArc().world);
ok(built === WORLD, `the world under test is ${WORLD} (built: ${built})`);
// …and say where it got to if the match never starts, so a timeout is a
// diagnosis rather than a mystery.
const tick = setInterval(async () => {
  try {
    const s = await page.evaluate(() => {
      // THE LOADING SCREEN HAS TWO CLASSES, and reading only one of them is how
      // this ticker lied. #loadScr is `.boot` on first paint (index.html:1710,
      // CSS `#loadScr.boot { display: flex }`) and `.show` when raised later —
      // so a check for `.show` alone reports "not loading" while the boot
      // curtain is still covering the screen, which is exactly what it did on
      // Pirate Bay for ten minutes. Read the COMPUTED DISPLAY: it cannot be
      // wrong about whether the player is looking at a curtain.
      const ls = document.getElementById('loadScr');
      return {
        t: window.__matchState ? Math.round(window.__matchState().t * 10) / 10 : null,
        world: localStorage.getItem('voidWorld'),
        picker: !!document.getElementById('worlds')?.classList.contains('show'),
        load: ls ? getComputedStyle(ls).display !== 'none' : false,
        cls: ls ? ls.className : 'MISSING',
      };
    });
    console.log(`     …t=${s.t} world=${s.world} picker=${s.picker} loading=${s.load} (${s.cls})`);
  } catch { /* page may be closing */ }
}, 30000);
await page.waitForFunction(() => window.__matchState && window.__matchState().t > 1, undefined, { timeout: 600000 })
  .finally(() => clearInterval(tick));
console.log(`playing ${WORLD}`);

// drive it like a child: thumb down, circling
await page.evaluate(() => {
  const cv = document.querySelector('canvas');
  const r = cv.getBoundingClientRect();
  cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 9, clientX: r.width / 2, clientY: r.height / 2, bubbles: true }));
  let a = 0;
  setInterval(() => {
    a += 0.13;
    cv.dispatchEvent(new PointerEvent('pointermove', {
      pointerId: 9, clientX: r.width / 2 + Math.cos(a) * 130, clientY: r.height / 2 + Math.sin(a) * 130, bubbles: true,
    }));
  }, 40);
});

/**
 * Fire one card and READ IT OFF THE SCREEN.
 *
 * WAIT ON THE ANIMATION'S OWN CLOCK, NOT ON WALL TIME. `#news.show` runs a
 * 5.6s keyframe animation that takes opacity 0 -> 1 by 9% and holds it to 84%.
 * On a real phone that is half a second. Here it is not: the first draft of
 * this probe slept 900ms and measured 0/14 cards visible, and the diagnosis was
 * not a broken card — `getAnimations()[0].currentTime` was still 0 after 1.5s
 * of wall clock, and reached 1900ms (opacity 1, comfortably inside the hold)
 * at about 2.5s. The animation is main-thread driven and the game is spending
 * ~0.5s per frame under swiftshader, so the animation clock and the wall clock
 * diverge by the same 10-30x factor already documented for the game clock.
 *
 * Sleeping longer would be a guess. Waiting for the card's own timeline to
 * reach the part of itself where it is opaque is the actual question.
 */
const OPAQUE_FROM = 620;    // 9% of 5600 + a frame of margin
const OPAQUE_TO = 4400;     // 84% of 5600, less a frame
async function card() {
  await page.evaluate(() => window.__news());
  await page.waitForFunction((from) => {
    const el = document.getElementById('news');
    const a = el?.getAnimations?.().find((x) => x.animationName === 'news');
    return !!a && (a.currentTime ?? 0) >= from;
  }, OPAQUE_FROM, { timeout: 60000 }).catch(() => {});
  return page.evaluate((win) => {
    const el = document.getElementById('news');
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const st = window.__newsArc();
    const a = el.getAnimations?.().find((x) => x.animationName === 'news');
    const at = a ? (a.currentTime ?? 0) : -1;
    return {
      entry: st.log[st.log.length - 1] ?? null,
      arc: st.arc,
      // WHAT A CHILD COULD ACTUALLY SEE, measured rather than assumed: a real
      // box, inside the viewport, opaque, and sampled while the card is still
      // in the part of its own life where it is meant to be readable.
      onScreen: r.width > 4 && r.height > 4 && r.top >= 0 && r.bottom <= window.innerHeight
        && Number(cs.opacity) > 0.85 && cs.display !== 'none' && cs.visibility !== 'hidden'
        && at >= win[0] && at <= win[1],
      animTime: Math.round(at),
      opacity: Number(cs.opacity),
      shown: (el.textContent || '').trim(),
      chip: el.querySelector('i')?.textContent ?? '',
      cls: el.className,
    };
  }, [OPAQUE_FROM, OPAQUE_TO]);
}

// ── A · THE ARC RUNS FORWARD ──────────────────────────────────────────────
// Walk the clock from the opening seconds to the last thirty, sampling as we
// go. 14 samples over the length of a match is roughly twice the cadence a
// player sees, which is the right density for checking ORDER.
console.log('A. the arc runs forward, and morning comes first');
const seen = [];
// ASK THE GAME HOW LONG THIS MATCH IS. Do not assume the ?len= above survived:
// switching world from the picker reloads with `location.href =
// location.pathname`, which drops the query string, so a run that changed world
// is on the default 180 while this file thinks it is on 150. Every clock target
// below is a fraction of this number, so getting it wrong quietly mis-aims the
// whole arc sweep.
const MATCH = await page.evaluate(() => window.__newsArc().len);
console.log(`     match length ${MATCH}s`);
for (let i = 0; i < 14; i++) {
  const c = await card();
  if (!c.entry) { ok(false, 'the newsroom logged nothing'); break; }
  seen.push(c);
  // …then let time pass. The first three samples sit in the opening seconds so
  // MORNING is reached honestly rather than forced.
  //
  // FLOOR THE CLOCK AT 30 SECONDS. The arc's clock term saturates at 83% of the
  // match (clock 25 here) and PANIC opens at 66% (clock 50), so 30 is past both
  // — while sections E and F still need a LIVE match to run in, and the first
  // draft of this loop drove the clock to 4 and left them nothing.
  const to = MATCH - Math.round(MATCH * Math.min(0.98, (i + 1) / 13));
  await page.evaluate((t) => window.__rushClock(t), Math.max(30, to));
}
ok(seen.length >= 12, `${seen.length} cards sampled`);
const phases = seen.map((c) => c.entry.phase);
console.log(`     phases: ${phases.join(' ')}`);
ok(phases[0] === 0 && phases[1] === 0, `morning owns the first two cards (${phases.slice(0, 2).join(',')})`);
let reversed = null, skipped = null;
for (let i = 1; i < phases.length; i++) {
  if (phases[i] < phases[i - 1] && reversed === null) reversed = `${phases[i - 1]} -> ${phases[i]} at card ${i}`;
  if (phases[i] > phases[i - 1] + 1 && skipped === null) skipped = `${phases[i - 1]} -> ${phases[i]} at card ${i}`;
}
ok(!reversed, `the arc never reverses${reversed ? ` — ${reversed}` : ''}`);
ok(!skipped, `and never skips a rung${skipped ? ` — ${skipped}` : ''}`);
ok(phases.includes(3), `it reaches PANIC (highest ${Math.max(...phases)})`);
for (const p of [0, 1, 2, 3]) ok(phases.includes(p), `phase ${p} appears`);
// the brand chip has to escalate with it, or the arc is invisible
const chips = [...new Set(seen.map((c) => c.chip))];
ok(chips.length >= 2, `the brand chip changes with the story (${chips.join(' | ')})`);
const morningCards = seen.filter((c) => c.entry.phase === 0);
// SCHEDULED morning cards only. A reactive line is by definition about a thing
// the child just did and watched happen — a landmark going in the first ten
// seconds is real news and preempting morning with it is the correct behaviour,
// so it is not evidence the baseline leaked.
const contaminated = morningCards.filter((c) => !c.entry.react).find((c) => VOIDWORDS.test(c.entry.text));
ok(!contaminated, `morning never mentions the void${contaminated ? ` — "${contaminated.entry.text}"` : ''}`);
console.log(`     morning: "${morningCards[0]?.entry.text ?? ''}"`);
console.log(`     panic:   "${seen.filter((c) => c.entry.phase === 3)[0]?.entry.text ?? ''}"`);

// ── B · NO VOID SPEAKS IN THE NEWS ────────────────────────────────────────
console.log('B. no void ever speaks in the news card');
const chatty = seen.find((c) => c.entry.text.includes('💬'));
ok(!chatty, `no speech chip in a headline${chatty ? ` — "${chatty.entry.text}"` : ''}`);
const named = seen.find((c) => RIVALS.some((r) => c.entry.text.toUpperCase().includes(r)));
ok(!named, `no family name in a headline${named ? ` — "${named.entry.text}"` : ''}`);

// ── C · NO REPEATS ────────────────────────────────────────────────────────
console.log('C. the paper does not repeat itself');
const texts = seen.map((c) => c.entry.text);
const dupe = texts.find((t, i) => texts.indexOf(t) !== i);
ok(!dupe, `${new Set(texts).size} distinct lines from ${texts.length} cards${dupe ? ` — repeated "${dupe}"` : ''}`);

// ── D · IT REACHED THE PLAYER ─────────────────────────────────────────────
console.log('D. every card was on screen and said what the log says');
const offScreen = seen.filter((c) => !c.onScreen).length;
ok(offScreen === 0, `${seen.length - offScreen}/${seen.length} cards measured visible on a 430x932 phone`);
const mismatch = seen.find((c) => !c.shown.includes(c.entry.text.slice(0, 24)));
ok(!mismatch, `the painted card matches the record${mismatch ? `\n      log:    "${mismatch.entry.text}"\n      screen: "${mismatch.shown}"` : ''}`);

// ── E · A NAMED THING GOING IS REPORTED ───────────────────────────────────
// Find a real sticker prop, put the void on top of it at a size that can eat
// it, and let the REAL eat path run. No hooks, no forced headline.
console.log('E. eating a named landmark makes the paper say so');
/** The next landmark nobody has eaten yet, skipping any we already attempted.
 *  There is a retry because a RIVAL can take the one we picked — see the
 *  byPlayer note below — and that is not the newsroom's fault. */
const tried = [];
const nextTarget = () => page.evaluate((skip) => {
  const list = window.__edibles || [];
  for (const e of list) {
    const sid = e.mesh?.userData?.sticker;
    if (sid && !skip.includes(sid) && !e.mesh.userData.eaten && e.mesh.visible) {
      return { x: e.mesh.position.x, z: e.mesh.position.z, r: e.radius, sid };
    }
  }
  return null;
}, tried);
let target = await nextTarget();
if (!target) {
  ok(false, 'no sticker prop is placed in this world — nothing to eat');
} else {
  // NAME THE THING, so the assertion cannot pass on somebody else's headline.
  // The first draft asserted only "a reactive line appeared" and went green on
  // `It is big enough for the town hall. The meeting has gone quiet.` — the
  // HERO CUE, which the probe had triggered itself by inflating the void past
  // the 5.86 radius that puts Maple's town hall in reach. Two reactive lines
  // were in the queue and it read the wrong one. Every landmark template
  // carries {X}, so the eaten thing's own name is the evidence.
  let name = STICKER_NAME[target.sid] ?? '';
  ok(!!name, `the target has a printable name (${target.sid} -> "${name}")`);
  // LET THE TOWN FINISH TALKING FIRST. Every reaction shares one 11-second
  // cooldown, and section A rushed the clock through all four match beats, each
  // of which queues one. Under swiftshader that cooldown burns off at game-clock
  // speed — dt is clamped to 0.05, so 11 game-seconds is ~220 frames — and the
  // second draft of this probe walked straight into it and reported "the paper
  // never named it" when the truth was "the paper was not allowed to speak yet".
  // Waiting is honest: it is the same wait a player gets.
  const cd0 = await page.evaluate(() => window.__newsArc());
  console.log(`     waiting out the reaction cooldown (${cd0.reactCd.toFixed(1)}s, queue ${cd0.queue.length}, live ${cd0.live})`);
  // BOTH floors and nothing in flight. A landmark is urgent and clears only the
  // hard floor, but waiting for the soft one too means the check starts from a
  // genuinely quiet newsroom rather than from the middle of somebody else's
  // story — so a failure here means the landmark was refused, not queued.
  await page.waitForFunction(() => {
    const s = window.__newsArc();
    return s.reactCd <= 0 && s.reactHardCd <= 0 && s.queue.length === 0 && s.pending.length === 0;
  }, undefined, { timeout: 300000 }).catch(() => {});
  const before = await page.evaluate(() => window.__newsArc().log.length);
  // …and stay UNDER the hero-cue threshold while doing it. Maple's town hall
  // is r6.5 and the cue fires at voidR >= 6.5/1.11 = 5.86, so a flat "at least
  // 6" — which is what the first draft used — trips the finale on the way past
  // and puts a second reactive line in the queue ahead of this one.
  //
  // THE PLAYER HAS TO BE THE ONE WHO EATS IT, and that is what made this
  // section flaky through three wrong diagnoses.
  //
  // Rivals eat props too. `e.mesh.userData.eaten` goes true whoever took it,
  // but only the PLAYER's eat handler sets `byPlayer` (prototype3d.ts:4332) and
  // collects the sticker (:4224) — and the sticker collection is what fires the
  // landmark reaction. So when a rival got there first, NO REACTION WAS EVER
  // DUE, and a probe waiting on `eaten` alone reported the newsroom as silent
  // about a landmark the player never ate.
  //
  // Measured with scratchpad/ediag.mjs on Pirate Bay: three sticker props went
  // in — lounger-nine, antique-compass, flip-flop — with both reaction floors
  // at 0.0, nothing queued, and NOT ONE reactive line in four following cards.
  // That is the signature of rivals eating them, and it is almost certainly
  // what the original Pirate failure was. It is intermittent by construction,
  // because it depends on where five rivals happen to be — which is exactly why
  // Maple, Game Day and Lantern passed the identical assertion.
  //
  // So: try up to three landmarks. Losing one to a rival is the game working,
  // not the newsroom failing, and a probe that cannot tell those apart is worse
  // than no probe.
  //
  // (An earlier draft of this comment blamed a SHRINK — the probe fitting the
  // void to a small prop, dropping curStage and re-firing evolutions that ate
  // the cooldown. The radius line below refuted it: 0.90 -> 2.38, a growth, and
  // the old and new formulas give the identical number. The `max(cur, fitted)`
  // is kept as a correct guard for runs where the void HAS grown past its
  // target, not as the fix it was briefly billed as.)
  let ate = false;
  for (let attempt = 0; attempt < 3 && target && !ate; attempt++) {
    tried.push(target.sid);
    // …and stay UNDER the hero-cue threshold. Maple's town hall is r6.5 and the
    // cue fires at voidR >= 6.5/1.11 = 5.86, so a flat "at least 6" — the first
    // draft — trips the finale on the way past and puts a second reactive line
    // in the queue ahead of this one.
    const fitted = Math.min(5.4, Math.max(1.4, target.r * 2.5));
    const grew = await page.evaluate((a) => {
      const cur = window.__matchState().r;
      const to = Math.max(cur, a);        // fit the prop, or stay as we are
      window.__setVoidR(to);
      return { from: cur, to };
    }, fitted);
    console.log(`     ${target.sid}: radius ${grew.from.toFixed(2)} -> ${grew.to.toFixed(2)}`
      + ` (prop fits at ${fitted.toFixed(2)})`);
    await page.evaluate((t) => window.__warpVoid(t.x, t.z), target);
    ate = await page.waitForFunction((sid) => {
      const list = window.__edibles || [];
      return list.some((e) => e.mesh?.userData?.sticker === sid
        && e.mesh.userData.eaten && e.mesh.userData.byPlayer);
    }, target.sid, { timeout: 120000 }).then(() => true).catch(() => false);
    if (!ate) {
      const who = await page.evaluate((sid) => {
        const e = (window.__edibles || []).find((x) => x.mesh?.userData?.sticker === sid);
        return e ? { eaten: !!e.mesh.userData.eaten, byPlayer: !!e.mesh.userData.byPlayer } : null;
      }, target.sid);
      console.log(`       ${JSON.stringify(who)} — eaten without byPlayer means a RIVAL took it; trying another`);
      const next = await nextTarget();
      if (next) { target = next; name = STICKER_NAME[next.sid] ?? ''; }
      else break;
    }
  }
  ok(ate, `the PLAYER ate a landmark (${target ? target.sid : 'none left'})`);
  // up to three cards, because breakingNews holds a short queue and the
  // landmark line can sit behind one other story
  let hit = null, onScreen = false, fresh = [];
  for (let i = 0; i < 3 && !hit; i++) {
    const c = await card();
    fresh = await page.evaluate((n) => window.__newsArc().log.slice(n), before);
    hit = fresh.find((e) => e.react && e.text.includes(name.slice(0, 18)));
    if (hit) onScreen = c.onScreen;
  }
  ok(!!hit, `the paper named it${hit ? ` — "${hit.text}"` : ` — nothing in the feed mentions "${name}"`}`);
  // A FAILURE SHOULD BE A DIAGNOSIS. The first version reported only what it
  // did NOT find, which cost a whole round trip to answer the obvious next
  // question: what did the paper say instead, and was it even allowed to speak?
  if (!hit) {
    const st = await page.evaluate(() => window.__newsArc());
    console.log(`       floors at check: hard=${st.reactHardCd.toFixed(1)}s soft=${st.reactCd.toFixed(1)}s`
      + `  pending=${JSON.stringify(st.pending)}  queue=${st.queue.length}`);
    console.log(`       the feed since the eat (${fresh.length} cards):`);
    for (const e of fresh) console.log(`         ${e.react ? 'REACT' : '  arc'} p${e.phase} "${e.text}"`);
  }
  ok(!hit || onScreen, 'and that card was on screen too');
  // the old behaviour, which this replaces: one template, all four worlds
  ok(!hit || !/the whole time\.$/.test(hit.text),
    'and it is not the old one-size-fits-all template');
}

// ── F · A NEW MATCH STARTS AT MORNING ─────────────────────────────────────
// The arc's high-water mark is module state. Without resetArc() in resetMatch()
// the second match of a session opens in PANIC, which is the exact bug class
// the high-water mark was introduced to fix.
console.log('F. PLAY AGAIN starts the story over');
await page.evaluate(() => window.__rushClock(1));
await page.waitForFunction(() => document.getElementById('end')?.classList.contains('show'), undefined, { timeout: 180000 }).catch(() => {});
await page.waitForTimeout(1200);
const again = await page.evaluate(() => {
  const b = document.getElementById('btnAgain') || document.querySelector('#end .again, #end button');
  if (b) { b.click(); return true; }
  return false;
});
if (!again) ok(false, 'could not find PLAY AGAIN on the end screen');
else {
  await page.waitForFunction(() => window.__matchState && window.__matchState().t > 1, undefined, { timeout: 180000 }).catch(() => {});
  await page.waitForTimeout(600);
  const st = await page.evaluate(() => window.__newsArc());
  ok(st.arc.phase === 0 && st.arc.cards === 0 && st.arc.high === 0,
    `the arc is back at morning (phase ${st.arc.phase}, ${st.arc.cards} cards, high ${st.arc.high.toFixed(2)})`);
}

await ctx.close();
await browser.close();
console.log(fail.length ? `\nFAIL — ${fail.length}: ${fail.join(' | ')}` : '\nPASS — the town tells a story, in order, and never in the void\'s voice');
process.exit(fail.length ? 1 : 0);
