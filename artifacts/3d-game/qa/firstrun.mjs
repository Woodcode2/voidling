// THE FIRST MATCH A CHILD EVER PLAYS — and whether any match nags.
//
//   node qa/firstrun.mjs [port]
//
// The owner's rule: no timers that pressure. src/prototype3d.ts had `hurry =
// !goal`, and a goal-free match — which is what first launch builds, because it
// calls beginMatch() with no level — ended on a red clock and
// "⏰ 35 SECONDS — EAT FASTER!!". So every new child's very first match finished
// on exactly the pressure the owner ruled out. 3d8b414 had removed it from level
// matches and kept it in goal-free ones as "the game that shipped": a control
// for its own probe, not a decision anyone made.
//
// The same gap left the first match off the ladder the owner built — Maple is
// where all thirty dots begin, and a child's first win counted for none of them.
// And a third: dot 4 is RIVALS ("finish top 3"), rank is counted among JOINED
// rivals only, and in solo nobody joins — so solo made dot 4 a free win.
//
// THREE BARS, each on the match's own clock (GOVERNOR.md rule 4 — the clock runs
// roughly 14x slower than wall time under the software renderer):
//   (a) a cold install's first match is Maple dot 1 from its first armed frame
//   (b) no match nags: a goal-free harness match past the 35-second mark has a
//       clock that is not red and a banner that never said EAT FASTER
//   (c) solo cannot take dot 4: with solo switched on and dot 4 current, a
//       launch still brings the family, and the buzzer has someone to rank against
// The banner is watched the way a child sees it — a MutationObserver on #banner
// from the first byte of the page — because there is no announce log to read.
import { chromium } from 'playwright';
import { openPicker } from './_enter.mjs';

const PORT = process.argv[2] || '4177';
const RED = 'rgb(255, 138, 138)';   // the nag colour, '#ff8a8a'
let bad = 0, bars = 0;
const ok = (m) => { bars++; console.log(`  ok   ${m}`); };
const no = (m) => { bars++; bad++; console.log(`  BAD  ${m}`); };

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });

async function page(storage, q) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 } });
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript((st) => {
    try { localStorage.clear(); for (const [k, v] of Object.entries(st)) localStorage.setItem(k, v); } catch { }
    window.__bannerLog = [];
    const watch = () => {
      const el = document.getElementById('banner');
      if (!el) return setTimeout(watch, 50);
      new MutationObserver(() => {
        const t = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
        if (t && window.__bannerLog[window.__bannerLog.length - 1] !== t) window.__bannerLog.push(t);
      }).observe(el, { childList: true, subtree: true, characterData: true });
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watch); else watch();
  }, storage);
  await p.goto(`http://127.0.0.1:${PORT}/${q}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  return p;
}
const t = (p) => p.evaluate(() => window.__matchState?.().t ?? 0);

console.log('\n  FIRST RUN — the first match a child ever plays, and whether any match nags\n');

// ── (a) a cold install: no storage at all, no query ─────────────────────────
{
  const p = await page({}, '');
  await p.waitForFunction(() => window.__matchState?.().armed === true, null, { timeout: 400000 }).catch(() => { });
  const g = await p.evaluate(() => ({ goalN: window.__wayState?.().goalN ?? -1, armed: window.__matchState?.().armed }));
  console.log(`  ·    cold install: armed=${g.armed} goal=${g.goalN}`);
  if (!g.armed) no('(a) the cold install never armed a match — cannot answer, and silence is a FAIL');
  else if (g.goalN !== 1) no(`(a) a cold install's first match is goal ${g.goalN}, not Maple dot 1 — her first win counts for none of the thirty dots`);
  else ok('(a) a cold install\'s first match is Maple dot 1 from its first armed frame');
  await p.close();
}

// ── (b) no match nags ───────────────────────────────────────────────────────
{
  const p = await page({ voidPlayed: '1', voidTut: '1', voidMute: '1',
    voidDailyLast: new Date().toDateString() }, '?w=maple&len=40');
  // len=40 puts the clock under 35 s about five match-seconds in; sample past it
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 9, null, { timeout: 400000 }).catch(() => { });
  const r = await p.evaluate((RED) => ({
    t: window.__matchState?.().t ?? 0,
    clock: window.__matchState?.().clock ?? -1,
    goalN: window.__wayState?.().goalN ?? -1,
    colour: getComputedStyle(document.getElementById('timer')).color,
    red: getComputedStyle(document.getElementById('timer')).color === RED,
    log: window.__bannerLog.slice(),
  }), RED);
  const nag = r.log.filter((x) => /EAT FASTER/i.test(x));
  console.log(`  ·    harness match: t=${r.t.toFixed(1)} clock=${Math.round(r.clock)} goal=${r.goalN} timer=${r.colour} banners=${r.log.length}`);
  if (r.t < 9 || r.clock > 35) no(`(b) the match never got past the 35-second mark (t=${r.t.toFixed(1)}, clock=${r.clock}) — cannot answer`);
  else if (r.red || nag.length) no(`(b) a goal-free match nags: timer ${r.red ? 'RED ' + RED : r.colour}${nag.length ? `, banner said "${nag[0]}"` : ''}`);
  else ok(`(b) no nag past the 35-second mark: timer ${r.colour}, ${r.log.length} banner(s), none says EAT FASTER`);
  await p.close();
}

// ── (c) solo cannot take dot 4 ──────────────────────────────────────────────
{
  const SEED = JSON.stringify({ v: 1, w: { maple: {
    1: { st: 'clear', best: 24100, pct: 31, n: 1 },
    2: { st: 'clear', best: 3, pct: 22, n: 1 },
    3: { st: 'clear', best: 0, pct: 18, n: 1 } } } });
  const p = await page({ voidPlayed: '1', voidTut: '1', voidMute: '1', voidSolo: '1',
    voidDailyLast: new Date().toDateString(), voidLevels: SEED,
    voidUnlocked: 'maple,pirate,gameday,lantern,powder,skylark' }, '?w=maple&manual=1');
  await openPicker(p);
  await p.evaluate(() => document.querySelector('#worldRow .wCard[data-world="maple"]')?.click());
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout: 400000 }).catch(() => { });
  const g0 = await p.evaluate(() => window.__wayState?.().goalN ?? -1);
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 16, null, { timeout: 600000 }).catch(() => { });
  const r = await p.evaluate(() => {
    const m = window.__matchState?.() ?? {};
    return { t: m.t ?? 0, joined: (m.rivals || []).filter((q) => q.joined).length, total: (m.rivals || []).length };
  });
  console.log(`  ·    solo on, launched from the picker: goal=${g0}  t=${r.t.toFixed(1)}  rivals joined ${r.joined}/${r.total}`);
  if (g0 !== 4) no(`(c) the launch reached goal ${g0}, not dot 4 — the seed did not take, cannot answer`);
  else if (r.t < 16) no(`(c) the match never reached t=16 (t=${r.t.toFixed(1)}) — cannot answer`);
  else if (r.joined === 0) no('(c) dot 4 in solo: nobody joined by t=16, so the child is 1st of 1 and RIVALS is a free win');
  else ok(`(c) dot 4 with solo switched on still brings the family: ${r.joined} rival(s) joined by t=16`);
  await p.close();
}

await b.close();
console.log(`\n${bad ? 'FAIL' : 'PASS'} — ${bad ? `${bad} of ${bars}` : bars} bar(s)`);
process.exit(bad ? 1 : 0);
