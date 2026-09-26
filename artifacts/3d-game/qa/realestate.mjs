// THE OWNER'S REAL ESTATE — what a whole match puts across the screen, in seconds
//
//   node qa/realestate.mjs [port] [world|all]      (SEED, default 7)
//
// The owner, 2026-09-25, on a screen recording of his own match in Safari on an
// iPhone 17 Pro Max:
//
//   "these events, like there's a bakery sale or double points or whatever it
//    is. I say we get rid of that. It's empty real estate. ... the news in the
//    morning, I think is a cool idea. And then maybe just like progressively
//    throughout, once in a while, you know, hit key milestones, like you evolve
//    to a certain size or you consume a certain item, then maybe there's a news
//    thing there. Because so much of the screen keeps getting taken up."
//
// One whole match per world, on the nearest-edible autopilot, hand-cranked at
// 16.667 ms a frame exactly as qa/goalcurve.mjs does it. WHOLE, because a card
// on the picker starts her current dot and a met goal ends the match on the
// spot: a fresh profile's dot 1 on Maple is over in about 65 match-seconds.
// So dots 1-3 are seeded as won and the match is dot 4, RIVALS, which only the
// buzzer decides — 180 seconds, through the door a child uses. The frame clock
// (tClock) IS a phone's wall clock, and a 2.4 s card is 2.4 s of it, however
// slowly this sandbox renders. Rendering is stubbed once the clock runs;
// nothing here is visual except which cards reached the DOM and for how long.
//
// WHAT IT COUNTS. Every time #banner, #news or #evolve is handed its `show`
// class — caught inline by an own-property classList.add on the element, the
// trick qa/attention.mjs uses for innerHTML, because a MutationObserver batches
// a whole crank of sixty frames into one record and stamps them all alike. A
// card holds the screen from that moment for its own animation's length, read
// off the live stylesheet (getComputedStyle, the element wearing .show), cut
// short by the next card on the same element, by a banner pulled down early
// (.bye), and by the end card, under which the whole HUD is hidden.
//
// WHY each news card is up is the game's own word, not a guess from timing:
// newsLog carries the reason the line was filed (`why`: 'morning' for the
// sign-on, 'arc' for a scheduled headline, a reaction's kind, or the one-shot
// that filed it). Read through __newsArc().
//
// THE BARS — the owner's words, each made into something a build can fail:
//   (a) NO EVENT CARD. No #banner paint carries a beat's title (read off the
//       build's own __beats, so the list cannot go stale), and nothing offers
//       a score multiplier: no x2/x3 badge on a banner or in the NOMS pill.
//   (b) THE MORNING. The first news card of the match is the sign-on.
//   (c) ...AND THEN ONLY MILESTONES. Every later card is filed by an
//       evolution ('evolve', 'ender') or a named thing eaten ('landmark': a
//       sticker find or the world's hero landmark) — and at least one such
//       card airs, so the paper still speaks when a child earns it.
//   (d) NO SMALL FIRSTS. FIRST CAR, FIRST BUILDING, FIRST RUNNER and A WHOLE
//       MOTORHOME never reach #banner.
//   (e) THE WORLD STILL HAPPENS. Every beat that carries a world cue (the
//       parade, the goat, the chests, the avalanche, the whale) has fired by
//       the buzzer — the cards went, the town's own happenings did not.
//
// REPORTED, not barred: seconds of #news and #banner per match — the headline
// number — with #evolve beside them for scale, and every card by its reason.
//
// RETRACTED, 2026-09-25 — "#banner 0.0 s (24 cards)" on Pirate, on the build
// after the fix. The card length was read with .show ADDED to whatever the
// element wore at the buzzer, and a banner pulled down at the end wears .bye,
// whose `animation: none !important` read back as 0 s. That was the probe, not
// the game. The length is now read with the class list set to 'show' alone,
// and a card whose length reads 0 is a FAIL instead of a silent zero.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { ALL_WORLDS, initScript } from './worlds.mjs';
import { DRIVE_NEAREST } from './_drive.mjs';
import { openPicker } from './_enter.mjs';

const pos = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const PORT = pos[0] || '4177';
const WORLD_ARG = pos[1] || 'all';
const SEED = Number(process.env.SEED || '7');
const worlds = WORLD_ARG === 'all' ? ALL_WORLDS : WORLD_ARG.split(',');
for (const w of worlds) if (!ALL_WORLDS.includes(w)) { console.log(`\nFAIL — unknown world "${w}"`); process.exit(1); }
process.on('uncaughtException', (e) => { console.log(`\nFAIL — threw: ${e.message.split('\n')[0]}`); process.exit(1); });
process.on('unhandledRejection', (e) => { console.log(`\nFAIL — rejected: ${String(e && e.message || e).split('\n')[0]}`); process.exit(1); });

// the reasons a news card may be up after the morning, per the owner
const MILESTONE = new Set(['evolve', 'ender', 'landmark']);
const SMALL_FIRST = /FIRST (CAR|BUILDING|RUNNER)|A WHOLE MOTORHOME/i;
const OUT = 'qa/out/realestate';
mkdirSync(OUT, { recursive: true });

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const t0 = Date.now();
const rows = [];
let bad = 0;
const say = (ok, bar, msg) => { console.log(`    ${ok ? 'ok  ' : 'BAD '} (${bar}) ${msg}`); if (!ok) bad++; };

for (const world of worlds) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  p.on('pageerror', (e) => console.log(`  [pageerror] ${e.message.split('\n')[0]}`));
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(initScript(SEED));
  await p.addInitScript(() => { try {
    localStorage.setItem('voidDailyLast', new Date().toDateString());
    localStorage.setItem('voidFirstNom', '1');
    localStorage.setItem('voidBookSeen', '1');   // the once-per-LIFETIME scrapbook card is not a match's
    const w = {};
    for (const id of (localStorage.getItem('voidUnlocked') || 'maple').split(',')) {
      w[id] = {};
      for (let g = 1; g < 4; g++) w[id][String(g)] = { st: 'done', best: 0, pct: 0, first: '', n: 1 };
    }
    localStorage.setItem('voidLevels', JSON.stringify({ v: 1, seen: 1, w }));
  } catch { } });
  await p.goto(`http://127.0.0.1:${PORT}/?w=${world}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 420000 });
  const missing = await p.evaluate(() => ['__matchState', '__newsArc', '__edibles', '__renderer', '__beats', '__kindTally']
    .filter((k) => !(k in window)));
  if (missing.length) { console.log(`\nFAIL — this build has no ${missing.join(', ')}; realestate reads nothing without them`); process.exit(1); }
  // the same settle goalcurve waits for: late GLBs keep registering edibles
  await p.waitForFunction(() => {
    const n = window.__edibles.length;
    if (window.__lastN !== n) { window.__lastN = n; window.__stableSince = performance.now(); return false; }
    return performance.now() - (window.__stableSince || 0) > 2000;
  }, null, { timeout: 300000, polling: 250 });
  await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => {
    if (['daily', 'gift'].includes(e.id)) e.classList.remove('show');
  }));
  await openPicker(p);
  await p.waitForSelector(`#worldRow .wCard[data-world="${world}"]`, { state: 'visible', timeout: 400000 });
  await p.evaluate((w) => document.querySelector(`#worldRow .wCard[data-world="${w}"]`)?.click(), world);
  await p.waitForFunction(() => (window.__matchState?.().armed ?? false) === true, null, { timeout: 400000 });
  const dot = await p.evaluate(() => window.__goalState?.()?.n ?? 0);
  if (dot !== 4) { console.log(`\nFAIL — ${world}: the card started dot ${dot}, not the full-length dot 4 this reading needs`); process.exit(1); }

  // ── THE TAPS, before the first touch so the opening card is caught ───────
  await p.evaluate(() => {
    const L = window.__re = { cards: [], noms: [], endAt: null };
    const tc = () => window.__matchState?.().tClock ?? 0;
    const txt = (el) => (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 90);
    const add = DOMTokenList.prototype.add;
    for (const id of ['banner', 'news', 'evolve', 'end']) {
      const el = document.getElementById(id);
      if (!el) continue;
      el.classList.add = function (...toks) {
        if (toks.includes('show') || toks.includes('bye')) {
          L.cards.push({ id, what: toks.includes('show') ? 'show' : 'bye', tc: +tc().toFixed(3),
            t: +(window.__matchState?.().t ?? 0).toFixed(2), txt: txt(el),
            mul: id === 'banner' && !!el.querySelector('.bMul') });
        }
        return add.apply(this, toks);
      };
    }
    // the NOMS pill paints through innerHTML; a multiplier badge rides in it
    const noms = document.getElementById('noms');
    const HD = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
    if (noms) Object.defineProperty(noms, 'innerHTML', { configurable: true,
      get() { return HD.get.call(this); },
      set(v) { if (/×\d/.test(String(v))) L.noms.push({ tc: +tc().toFixed(3), html: String(v).slice(0, 60) }); HD.set.call(this, v); } });
  });

  await p.evaluate(DRIVE_NEAREST);
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout: 400000 });
  await p.evaluate(() => { window.__renderer.render = () => { }; });
  // the crank — goalcurve's, verbatim in intent: rAF as a queue, time as a
  // counter, one real frame to move the in-flight callbacks onto the stub
  await p.evaluate(() => {
    const raw = window.requestAnimationFrame.bind(window);
    window.__virt = performance.now();
    performance.now = () => window.__virt;
    window.__q = [];
    window.requestAnimationFrame = (cb) => { window.__q.push(cb); return window.__q.length; };
    raw(() => { });
  });
  await p.waitForFunction(() => (window.__q || []).length >= 2, null, { timeout: 60000 }).catch(() => { });
  const armedQ = await p.evaluate(() => (window.__q || []).length);
  if (armedQ < 2) { console.log(`\nFAIL — ${world}: only ${armedQ} rAF consumer(s) on the virtual clock; the match is not being played`); process.exit(1); }
  let ended = false, broke = false;
  for (let sec = 0; sec < 400 && !ended; sec++) {
    const r = await p.evaluate((step) => {
      for (let i = 0; i < 60; i++) {
        const due = window.__q; window.__q = [];
        if (!due.length) return { broke: true };
        window.__virt += step;
        for (const cb of due) cb(window.__virt);
      }
      return { ended: !!document.getElementById('end')?.classList.contains('show') };
    }, 1000 / 60);
    if (r.broke) { broke = true; break; }
    ended = r.ended;
  }
  const R = await p.evaluate(() => {
    // each card's own length, off the stylesheet, on the element wearing .show
    // AND NOTHING ELSE. The first version added .show to whatever the element
    // was wearing at the buzzer, and a banner pulled down at the end wears
    // .bye, whose `animation: none !important` read back as 0 s — Pirate's
    // twenty-four banners reported 0.0 s of screen on the after build, which
    // was the probe, not the game. The class list is set to 'show' alone for
    // the read and put back; className bypasses the tap on classList.add.
    const dur = {};
    for (const id of ['banner', 'news', 'evolve']) {
      const el = document.getElementById(id);
      const was = el.className;
      el.className = 'show';
      dur[id] = parseFloat(getComputedStyle(el).animationDuration.split(',')[0]) || 0;
      el.className = was;
    }
    const na = window.__newsArc();
    const ms = window.__matchState();
    return { L: window.__re, dur, log: na.log, len: na.len, tEnd: ms.t, tcEnd: ms.tClock,
      beats: (window.__beats || []).map((x) => ({ title: String(x.title || ''), cue: x.cue || null, fired: !!x.fired })),
      k: { ...window.__kindTally() }, score: Math.round(ms.score) };
  });
  await p.close();
  if (broke) { console.log(`\nFAIL — ${world}: the rAF chain broke mid-match (animate() threw)`); process.exit(1); }
  const noLen = Object.entries(R.dur).filter(([, v]) => !(v > 0)).map(([k]) => k);
  if (noLen.length) { console.log(`\nFAIL — ${world}: no card length could be read off the stylesheet for #${noLen.join(', #')}; every second below would be a guess`); process.exit(1); }
  if (!ended) { console.log(`\nFAIL — ${world}: the match never reached the end card`); process.exit(1); }

  // ── OCCUPANCY on the frame clock ────────────────────────────────────────
  const endEv = R.L.cards.find((c) => c.id === 'end' && c.what === 'show');
  const tcStop = endEv ? endEv.tc : R.tcEnd;
  const shows = (id) => R.L.cards.filter((c) => c.id === id && c.what === 'show' && c.tc < tcStop);
  const held = (id) => {
    const evs = R.L.cards.filter((c) => c.id === id);
    let s = 0;
    const list = shows(id);
    for (const c of list) {
      const cut = evs.find((x) => x.tc > c.tc);   // the next show or bye on this element
      s += Math.max(0, Math.min(c.tc + R.dur[id], cut ? cut.tc : Infinity, tcStop) - c.tc);
    }
    return s;
  };
  const news = held('news'), banner = held('banner'), evolve = held('evolve');

  // the news cards in the order they aired, with the game's reason for each
  const log = R.log.filter((x) => x.tc === undefined || x.tc < tcStop);
  const whyN = {};
  for (const x of log) whyN[x.why ?? '?'] = (whyN[x.why ?? '?'] || 0) + 1;
  const titles = R.beats.map((x) => x.title.toLowerCase()).filter(Boolean);
  const bnr = shows('banner');
  const beatCards = bnr.filter((c) => titles.some((t) => c.txt.toLowerCase().includes(t)));
  const mulCards = bnr.filter((c) => c.mul);
  const smallFirsts = bnr.filter((c) => SMALL_FIRST.test(c.txt));

  console.log(`\n  ══ ${world.toUpperCase()} ══  ${R.tEnd.toFixed(0)} match-s · score ${R.score.toLocaleString()} · SEED ${SEED}`);
  console.log(`     ON SCREEN  #news ${news.toFixed(1)} s (${shows('news').length} cards)  ·  #banner ${banner.toFixed(1)} s (${bnr.length} cards)  ·  together ${(news + banner).toFixed(1)} s`
    + `  ·  #evolve ${evolve.toFixed(1)} s (${shows('evolve').length}), for scale`);
  console.log(`     card lengths off the stylesheet: news ${R.dur.news}s · banner ${R.dur.banner}s · evolve ${R.dur.evolve}s`);
  console.log(`     news by reason: ${Object.entries(whyN).map(([k, v]) => `${k} ${v}`).join(' · ') || 'none'}`);
  for (const x of log) console.log(`       ${String(x.t).padStart(4)}s  ${(x.why ?? '?').padEnd(13)} ${x.text.slice(0, 74)}`);
  console.log(`     banners: ${bnr.map((c) => `${c.t.toFixed(0)}s "${c.txt.slice(0, 34)}"`).join(' | ') || 'none'}`);

  say(beatCards.length === 0 && mulCards.length === 0 && R.L.noms.length === 0, 'a',
    `event cards ${beatCards.length}${beatCards.length ? ` (e.g. "${beatCards[0].txt.slice(0, 40)}")` : ''}, multiplier badges on a banner ${mulCards.length}, in the NOMS pill ${R.L.noms.length}`);
  const first = log[0];
  say(!!first && first.why === 'morning', 'b', first ? `the first card is "${first.why}" at ${first.t}s: ${first.text.slice(0, 60)}` : 'no news card aired at all');
  const later = log.slice(1);
  const offBeat = later.filter((x) => !MILESTONE.has(x.why));
  const miles = later.filter((x) => MILESTONE.has(x.why));
  say(offBeat.length === 0 && miles.length > 0, 'c',
    `${later.length} card(s) after the morning: ${miles.length} at a milestone, ${offBeat.length} not`
    + (offBeat.length ? ` (${[...new Set(offBeat.map((x) => x.why))].join(', ')})` : ''));
  say(smallFirsts.length === 0, 'd', `small first-of-kind banners ${smallFirsts.length}${smallFirsts.length ? ` ("${smallFirsts[0].txt.slice(0, 40)}")` : ''}`
    + ` — the run ate ${R.k.car || 0} car(s) and ${R.k.house || 0} house(s), and runners besides`);
  const cued = R.beats.filter((x) => x.cue);
  const unfired = cued.filter((x) => !x.fired);
  say(cued.length === 0 || unfired.length === 0, 'e',
    `${cued.length - unfired.length}/${cued.length} world cue(s) fired (${cued.map((x) => x.cue).join(', ') || 'none dealt this match'})`);

  const row = { world, seed: SEED, tEnd: +R.tEnd.toFixed(1), score: R.score, newsSec: +news.toFixed(1), bannerSec: +banner.toFixed(1),
    evolveSec: +evolve.toFixed(1), newsCards: shows('news').length, bannerCards: bnr.length, whyN, dur: R.dur,
    log, banners: bnr, noms: R.L.noms, beats: R.beats, kinds: R.k };
  rows.push(row);
  writeFileSync(`${OUT}/${world}.json`, JSON.stringify(row, null, 1));
}
await b.close();

console.log('\n  THE HEADLINE — seconds of screen the banners and the news take per match');
for (const r of rows) console.log(`    ${r.world.padEnd(8)} news ${String(r.newsSec).padStart(5)} s + banners ${String(r.bannerSec).padStart(5)} s = ${(r.newsSec + r.bannerSec).toFixed(1).padStart(5)} s   (${r.newsCards} + ${r.bannerCards} cards)`);
const tot = rows.reduce((s, r) => s + r.newsSec + r.bannerSec, 0);
console.log(`    all ${rows.length}    ${tot.toFixed(1)} s, mean ${(tot / Math.max(1, rows.length)).toFixed(1)} s a match`);
const secs = ((Date.now() - t0) / 1000).toFixed(0);
console.log(bad ? `\nFAIL — ${bad} bar(s) across ${rows.length} world(s): the match still spends the screen on what the owner cut [${secs}s]`
  : `\nPASS — ${rows.length} world(s): no event cards or multipliers, the news speaks in the morning and at milestones, the town's own happenings still happen [${secs}s]`);
process.exit(bad ? 1 : 0);
