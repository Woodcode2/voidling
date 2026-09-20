// CAN A CHILD SEE WHERE SHE IS, AND CAN SHE GO BACK ONCE SHE HAS FINISHED?
//
//   node qa/ladderflag.mjs [port]
//
// Two owner asks from the same message, and they are the same feature seen
// from both ends of a world:
//
//   "maybe an arrow or something floating above the current level saying okay
//    or something"
//   "after they beat the last level for that world that world become
//    permanently unlocked in like a level picker"
//
// While a world is UNFINISHED the ladder is a queue and one dot is next, so a
// flag points at it. Once it is FINISHED there is no next, so the flag goes and
// the card says PICK ANY LEVEL instead. A probe that only checked one of those
// would pass a build where the flag sat over dot 5 forever, pointing at nothing.
//
// ── WHAT THIS CATCHES THAT A SCREENSHOT DOES NOT ────────────────────────────
// The flag is absolutely positioned above a 52px dot inside a card whose gap to
// the world switcher is 8px. If the space above the row is ever trimmed, the
// flag slides under the switcher's pill and is simply gone — on a screen where
// everything still looks right. Bar (d) measures the overlap in pixels.
import { chromium } from 'playwright';

const PORT = process.argv[2] || '4177';
let fail = 0, bars = 0;
const ok = (m) => { bars++; console.log(`  ok   ${m}`); };
const no = (m) => { bars++; fail++; console.log(`  BAD  ${m}`); };
const die = (e) => { console.log(`\nFAIL — ladderflag threw: ${String(e && e.message || e).split('\n')[0]}`); process.exit(1); };
process.on('uncaughtException', die);
process.on('unhandledRejection', die);

// voidLevels is levels.ts's own store. Seeded directly so each profile is
// exactly the state being examined — 'done' is a met goal, which is what
// worldDone() counts; 'fin' (there when the clock ran out) deliberately is not.
const MIDWORLD = { v: 1, w: { maple: { 1: { st: 'done', n: 2 }, 2: { st: 'done', n: 1 } } } };
const FINISHED = { v: 1, w: { maple: {
  1: { st: 'clear', n: 2 }, 2: { st: 'done', n: 1 }, 3: { st: 'done', n: 3 },
  4: { st: 'done', n: 1 }, 5: { st: 'done', n: 2 } } } };
// ONE DOT SHORT, and the short one is 'fin'. This is the profile that catches a
// worldDone() written with `!== 'locked'` instead of "passed": she was on dot 5
// when the clock ran out, which is not finishing it.
const NEARLY = { v: 1, w: { maple: {
  1: { st: 'clear', n: 2 }, 2: { st: 'done', n: 1 }, 3: { st: 'done', n: 3 },
  4: { st: 'done', n: 1 }, 5: { st: 'fin', n: 4 } } } };

const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });

async function look(levels) {
  const pg = await br.newPage({ viewport: { width: 390, height: 844 } });
  pg.on('pageerror', (e) => console.log(`  [pageerror] ${e.message.split('\n')[0]}`));
  await pg.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await pg.addInitScript((lv) => { try {
    localStorage.clear();
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidMute', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString());
    localStorage.setItem('voidWorld', 'maple');
    localStorage.setItem('voidLevels', JSON.stringify(lv));
  } catch { } }, levels);
  await pg.goto(`http://127.0.0.1:${PORT}/?w=maple&manual=1`, { waitUntil: 'domcontentloaded', timeout: 400000 });
  await pg.waitForFunction(() => !!window.__voidState, null, { timeout: 600000 });
  await pg.waitForFunction(() => (document.getElementById('mlWorld')?.textContent || '').length > 0,
    null, { timeout: 120000 });
  await pg.waitForTimeout(900);
  const r = await pg.evaluate(() => {
    const flags = [...document.querySelectorAll('.pipFlag')];
    const pips = [...document.querySelectorAll('#mlPips .pip')];
    const here = pips.findIndex((p) => p.classList.contains('here'));
    const sw = document.getElementById('worldSwitch')?.getBoundingClientRect();
    const f = flags[0]?.getBoundingClientRect();
    const dot = here >= 0 ? pips[here].getBoundingClientRect() : null;
    return {
      n: flags.length,
      inHere: flags.length ? pips.indexOf(flags[0].closest('.pip')) : -1,
      here: here + 1,
      states: pips.map((p) => (p.className.match(/s-(\w+)/) || [])[1]),
      roam: !!document.getElementById('menuLadder')?.classList.contains('roam'),
      line: document.getElementById('mlGoal')?.textContent || '',
      // how far the flag's top sits BELOW the switcher's bottom; negative means
      // the two overlap and the flag is behind the pill
      clear: f && sw ? +(f.top - sw.bottom).toFixed(1) : null,
      // and that it actually sits over the dot rather than on it
      above: f && dot ? +(dot.top - f.bottom).toFixed(1) : null,
      onScreen: f ? f.top > 0 && f.bottom < innerHeight && f.width > 10 && f.height > 8 : false,
      text: flags[0]?.textContent || '',
    };
  });
  await pg.close();
  return r;
}

const mid = await look(MIDWORLD);
const fin = await look(FINISHED);
const near = await look(NEARLY);

const show = (name, r) => console.log(`\n  ${name}: ${r.states.join('·')}  here=${r.here}  roam=${r.roam}`
  + `  flags=${r.n}${r.n ? ` in pip ${r.inHere + 1} "${r.text}"` : ''}  line="${r.line}"`
  + (r.clear !== null ? `\n    flag clears the switcher by ${r.clear}px and sits ${r.above}px above its dot` : ''));
show('mid-world', mid);
show('one dot short (dot 5 is fin, not done)', near);
show('finished', fin);

// (a) — a queue has a next, and the flag is on it
if (mid.n === 1 && mid.inHere === mid.here - 1 && mid.onScreen) {
  ok(`(a) mid-world: one flag, on the dot she is on (${mid.here}), on screen`);
} else {
  no(`(a) mid-world: expected exactly one flag inside the here pip and visible — `
    + `got ${mid.n} flag(s), in pip ${mid.inHere + 1}, here=${mid.here}, onScreen=${mid.onScreen}`);
}

// (d) — and it is not behind the world switcher
if (mid.clear !== null && mid.clear >= 0 && mid.above >= 0) {
  ok(`(d) mid-world: the flag clears the world switcher by ${mid.clear}px and points down at its dot from ${mid.above}px`);
} else {
  no(`(d) mid-world: the flag is not in the gap it needs — ${mid.clear}px from the switcher, `
    + `${mid.above}px above its dot (either negative means it is drawn under something)`);
}

// (b) — a finished world has no next
if (fin.roam && fin.n === 0 && /PICK ANY/i.test(fin.line)) {
  ok(`(b) finished: no flag, the card is in roam, and the line reads "${fin.line}"`);
} else {
  no(`(b) finished: expected roam + no flag + a pick-any line — got roam=${fin.roam}, `
    + `${fin.n} flag(s), line="${fin.line}"`);
}

// (c) — and every dot is playable, which is the ask itself
if (fin.states.every((s) => s !== 'locked')) {
  ok(`(c) finished: none of the five dots is locked, so every one plays when tapped (${fin.states.join('·')})`);
} else {
  no(`(c) finished: ${fin.states.filter((s) => s === 'locked').length} dot(s) still locked on a world she has `
    + `beaten — the picker the owner asked for is not there: ${fin.states.join('·')}`);
}

// (e) — 'fin' is not finishing. The profile that catches worldDone() written
// as "not locked" rather than "passed".
if (!near.roam && near.n === 1) {
  ok(`(e) one dot short: still a queue — the flag is back and the card is not in roam`);
} else {
  no(`(e) one dot short: dot 5 is 'fin' (the clock ran out), which is NOT beating it — `
    + `but the card says roam=${near.roam} with ${near.n} flag(s)`);
}

// (f) — the button and the ring may never point at different things. index.html
// states that invariant over the ladder card, and a finished world is where it
// quietly broke: pip() derives `here` from the state and neither 'done' nor
// 'clear' is a here-state, so nothing carried the ring while PLAY went on
// launching dot 5.
if (fin.here === 5) {
  ok(`(f) finished: the ring is on dot 5, which is the dot PLAY launches — the button's target is visible`);
} else {
  no(`(f) finished: PLAY launches dot 5 on a finished world and the ring is on dot ${fin.here || 'nothing'} — `
    + `the button and the ring point at different things`);
}

await br.close();
console.log('');
if (fail) { console.log(`FAIL — ${fail} of ${bars} bar(s).`); process.exit(1); }
console.log(`PASS — ${bars} bars: the flag points at the next dot, and a world she has beaten becomes a shelf.`);
