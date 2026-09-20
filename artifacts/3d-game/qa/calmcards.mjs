// DOES THE GAME STILL SHOW ITS BIGGEST MOMENTS TO A CHILD WHOSE PARENT TURNED
// ON REDUCE MOTION?
//
//   node qa/calmcards.mjs [port]
//
// iOS puts Reduce Motion under Settings > Accessibility > Motion. Parents turn
// it on for motion sickness, for vestibular disorders, for migraine, and quite
// often just because the phone feels calmer. The setting means DO NOT MOVE
// THINGS. It does not mean do not show them.
//
// This sheet answers it with one catch-all near the end:
//
//     *, *::before, *::after { animation-duration: 0.01ms !important; … }
//
// …which is the rule every accessibility checklist on the internet recommends,
// and it is right for an ambient loop. It is a disaster for a card whose ONLY
// appearance is `animation: <name> <time> forwards` over a keyframe that ends
// at `opacity: 0`. The animation still runs — for one hundredth of a
// millisecond — and `forwards` then holds its last frame. The card is shown and
// hidden between two paints, and the child never sees it at all.
//
// FOUR OF THEM, found by parsing the sheet rather than by remembering:
// #evolve (the form-change ceremony — the whole point of growing), #banner (the
// beat announcements), #news (the newsroom), #titlecard (the level's own name).
//
// ── HOW THE POPULATION IS FOUND ─────────────────────────────────────────────
// Derived, not listed. Every @keyframes whose LAST frame sets opacity 0, then
// every `#id.show { animation: <one of those> … forwards }` rule that uses one.
// A card added next month with the same shape is tested on the day it is added.
//
// ── HOW IT IS MEASURED, AND HOW IT WAS MEASURED WRONG FIRST ────────────────
// Two browser contexts, one with Playwright's reducedMotion emulation on and
// one off, the same card forced open the same way the game opens it. The number
// is VISIBLE MILLISECONDS: how long the card is actually on screen and
// readable. A card a child can read for 1.3 seconds without the setting and 0
// with it is the defect, stated in the only units that matter.
//
// The first cut sampled that with requestAnimationFrame over a wall-clock
// window, which is the obvious way and is wrong HERE: this box renders the live
// island at roughly one frame every two and a half seconds, so a 600ms card
// began and ended between two callbacks and the loop attributed the whole gap
// to whichever state it happened to catch. It produced stable-looking numbers —
// 417ms, 300ms, twice each — that were single samples wearing a stopwatch's
// clothes, and it would have had me "fixing" a card that was already correct.
//
// So the animation is driven instead of watched. getAnimations() gives the
// running Animation objects; pausing them and stepping currentTime in 10ms
// increments samples the card's OWN timeline, deterministically, at whatever
// speed the machine can manage. A card the catch-all has collapsed reports an
// active duration of 0.01ms and scores zero, which is exactly the truth.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const PORT = process.argv[2] || '4177';
const STEP_MS = 10;          // how finely the card's own timeline is walked
let fail = 0, bars = 0;
const ok = (m) => { bars++; console.log(`  ok   ${m}`); };
const no = (m) => { bars++; fail++; console.log(`  BAD  ${m}`); };
const die = (e) => { console.log(`\nFAIL — calmcards threw: ${String(e && e.message || e).split('\n')[0]}`); process.exit(1); };
process.on('uncaughtException', die);
process.on('unhandledRejection', die);

// ── the static half: which keyframes end invisible, and who shows a card with one
const css = readFileSync('index.html', 'utf8');
const vanishes = new Set();
{
  const re = /@keyframes\s+([A-Za-z0-9_-]+)\s*\{/g;
  let m;
  while ((m = re.exec(css))) {
    const name = m[1];
    let i = re.lastIndex, depth = 1;
    while (i < css.length && depth > 0) { if (css[i] === '{') depth++; else if (css[i] === '}') depth--; i++; }
    const body = css.slice(re.lastIndex, i - 1);
    const frames = [...body.matchAll(/([0-9.]+%|from|to)([^{]*)\{([^}]*)\}/g)];
    if (!frames.length) continue;
    const op = (frames[frames.length - 1][3].match(/opacity:\s*([0-9.]+)/) || [])[1];
    if (op !== undefined && parseFloat(op) === 0) vanishes.add(name);
  }
}
const cards = new Map();           // element id -> the keyframe that hides it
{
  const re = /([^{}]+)\{([^{}]*animation:[^{};]*)[;}]/g;
  let m;
  while ((m = re.exec(css))) {
    const sel = m[1].trim().split('\n').pop().trim();
    const an = (m[2].match(/animation:\s*([^;]+)/) || [])[1];
    if (!an || !/forwards/.test(an)) continue;
    const hit = [...an.matchAll(/\b([A-Za-z][A-Za-z0-9_-]*)\b/g)].map((x) => x[1]).filter((n) => vanishes.has(n));
    if (!hit.length) continue;
    // only the plain `#id.show` form: a compound selector is decoration
    // (`.burst > i`, `#count span.pop`) and reduced motion may silence it.
    const id = (sel.match(/^#([A-Za-z0-9_-]+)\.show$/) || [])[1];
    if (id && !cards.has(id)) cards.set(id, hit[0]);
  }
}
if (!cards.size) die(new Error('the static half found no card shown by a vanishing keyframe — the parse broke, not the sheet'));
console.log(`\n  ${vanishes.size} keyframes end at opacity 0; ${cards.size} card(s) are shown by one with fill-mode forwards:`);
for (const [id, k] of cards) console.log(`    #${id}  via @keyframes ${k}`);

const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });

/** Force each card open exactly the way the game does — add .show — and count
 *  how many milliseconds it is genuinely on screen. */
async function run(reduced) {
  const ctx = await br.newContext({ viewport: { width: 430, height: 932 },
    reducedMotion: reduced ? 'reduce' : 'no-preference' });
  const pg = await ctx.newPage();
  await pg.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await pg.addInitScript(() => { try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidMute', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString());
  } catch { } });
  await pg.goto(`http://127.0.0.1:${PORT}/?manual=1`, { waitUntil: 'domcontentloaded', timeout: 400000 });
  await pg.waitForFunction(() => !!window.__voidState, null, { timeout: 600000 });
  // THE MENU HIDES TWO OF THEM BY DESIGN (`body.menu #news { display: none }`),
  // and entering a real match to test a CSS rule would cost fifteen minutes on
  // this box for nothing. The curtain is lifted instead; the cards are all
  // position: fixed and do not care what is behind them.
  await pg.evaluate(() => {
    document.body.classList.remove('menu');
    const m = document.getElementById('menu'); if (m) m.style.display = 'none';
  });
  await pg.waitForTimeout(400);

  const out = {};
  for (const id of cards.keys()) {
    out[id] = await pg.evaluate(async ({ id, step }) => {
      const el = document.getElementById(id);
      if (!el) return { ms: 0, peak: 0, missing: true };
      // THE CURTAIN GOES BACK UP. `body.menu #news { display: none }` and the
      // game's own loop re-adds `menu` to <body> within a frame or two, so
      // lifting it once at the top of the run is not enough — the first cut of
      // this probe read #news as 0ms in BOTH contexts and the bar, which only
      // grades a card that is visible WITHOUT the setting, skipped it in
      // silence. Lifted per card, and reported when it still will not show.
      document.body.classList.remove('menu');
      el.classList.remove('show'); el.classList.remove('bye');
      // give the card something to be: an empty card is still a card, but a
      // zero-height one would read as invisible for the wrong reason
      if (!(el.textContent || '').trim()) el.textContent = 'TEST';
      void el.offsetWidth;                       // restart the animation cleanly
      el.classList.add('show');
      const anims = el.getAnimations();
      if (!anims.length) return { ms: 0, peak: 0, dur: 0, noanim: true };
      let dur = 0;
      for (const a of anims) {
        a.pause();
        const t = a.effect.getComputedTiming();
        dur = Math.max(dur, (t.activeDuration || 0) + (t.delay || 0));
      }
      let vis = 0, peak = 0;
      for (let t = 0; t <= dur; t += step) {
        for (const a of anims) { try { a.currentTime = t; } catch { } }
        const cs = getComputedStyle(el);
        const o = parseFloat(cs.opacity);
        const r = el.getBoundingClientRect();
        if (o > peak) peak = o;
        if (cs.display !== 'none' && cs.visibility !== 'hidden'
          && o >= 0.5 && r.width > 2 && r.height > 2
          && r.bottom > 0 && r.top < innerHeight) vis += step;
      }
      for (const a of anims) { try { a.cancel(); } catch { } }
      const hidden = getComputedStyle(el).display === 'none';
      el.classList.remove('show');
      return { ms: Math.round(vis), peak: +peak.toFixed(2), dur: Math.round(dur), hidden };
    }, { id, step: STEP_MS });
  }
  await ctx.close();
  return out;
}

const normal = await run(false);
const reduce = await run(true);

console.log('\n  card         readable for, walked along the card\'s own timeline');
console.log('               normal      reduce motion');
for (const id of cards.keys()) {
  const n = normal[id], r = reduce[id];
  if (n.missing) { console.log(`  #${id.padEnd(12)} NOT IN THE DOM`); continue; }
  if (n.ms < 300) {
    // NOT a quiet pass. A card the probe could not get on screen WITHOUT the
    // setting cannot be graded with it, and saying nothing is how a guard comes
    // to cover fewer rows than it claims.
    console.log(`  #${String(id).padEnd(12)}     ---         ---   NOT COVERED — only ${n.ms}ms visible`
      + ` without the setting${n.hidden ? ' (still display:none — something re-hid it)' : ''}`);
    continue;
  }
  const want = Math.round(n.ms * 0.9);
  const bad = n.ms >= 300 && r.ms < want;
  console.log(`  #${String(id).padEnd(12)} ${String(n.ms + 'ms').padStart(7)}     ${String(r.ms + 'ms').padStart(7)}`
    + `   of ${n.dur}ms / ${r.dur}ms run${bad ? '   <-- GONE' : ''}`);
}
// 90% OF THE ORIGINAL, NOT A FIXED FLOOR. The sampling is deterministic now, so
// the two runs are directly comparable and the bar can simply ask that the
// setting does not take the card away. The 10% of slack is for a repair that
// legitimately drops a leading transform and starts its fade a frame earlier.
const broken = [...cards.keys()].filter((id) => {
  const n = normal[id], r = reduce[id];
  return !n.missing && n.ms >= 300 && r.ms < Math.round(n.ms * 0.9);
});
const uncovered = [...cards.keys()].filter((id) => !normal[id].missing && normal[id].ms < 300);
if (uncovered.length) {
  console.log(`\n  ·    ${uncovered.length} card(s) could not be put on screen without the setting either, `
    + `so this run does not grade them: ${uncovered.map((i) => '#' + i).join(', ')}`);
}
if (!broken.length) {
  ok(`every one of the ${cards.size - uncovered.length} graded card(s) is still readable with Reduce Motion on`
    + (uncovered.length ? ` (${uncovered.length} not covered — see above)` : ''));
} else {
  no(`${broken.length} of ${cards.size} card(s) are invisible with Reduce Motion on: `
    + broken.map((id) => `#${id} ${normal[id].ms}ms -> ${reduce[id].ms}ms`).join(', '));
  console.log('      Reduce Motion means do not MOVE things. The catch-all at the end of the');
  console.log('      sheet collapses every animation to 0.01ms, and a card whose keyframe ends');
  console.log('      at opacity 0 with fill-mode forwards is therefore shown and hidden between');
  console.log('      two paints. These are the game\'s loudest moments and a whole class of');
  console.log('      children never sees one.');
}
await br.close();
console.log('');
if (fail) { console.log(`FAIL — ${fail} of ${bars} bar(s).`); process.exit(1); }
console.log(`PASS — ${bars} bar: nothing a child has to read disappears when the phone asks for less motion.`);
