// ── THE GOAL CHIP, AGAINST THE CLOCK IT SITS UNDER ──────────────────────────
//
// The owner's photograph: on Maple's dot 2 the COLLECT chip reads
// "5 HOUSES 8 CARS 21 SNACKS", wraps to THREE LINES inside a pill declared
// `height: 44px`, and bursts upward through the 2:45 clock. His words: "the
// goal clock and other items to get needs polishing. It's all together."
//
// The chip is `height: 44px` with no width limit, so a long value does not
// shrink or ellipse — it wraps, and the fixed height means the extra lines
// render OUTSIDE the pill's background, over whatever is above.
//
// SET is the worst case and dot 2 is not the only one: pirate's set is
// "6 GOLD 20 CABANAS 60 SNACKS", longer still. This walks every world's five
// dots rather than the one that was photographed, because a bug found on one
// phone at one level is almost never only there.
//
//   node qa/_hudgoal.mjs [port] [world...]
//
// Prints PASS/FAIL per world/dot and writes the top band to qa/out/hudgoal/.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { ALL_WORLDS } from './worlds.mjs';

const PORT = process.argv[2] || '4177';
const WORLDS = process.argv.slice(3).length ? process.argv.slice(3) : ALL_WORLDS;
const OUT = 'qa/out/hudgoal';
mkdirSync(OUT, { recursive: true });
const VIEW = { width: 430, height: 932 };

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
let bad = 0;
const fail = (m) => { console.log(`FAIL — ${m}`); bad++; };
const pass = (m) => console.log(`PASS — ${m}`);
const rows = [];
try {
for (const w of WORLDS) {
  for (const g of [1, 2, 3, 4, 5]) {
    const p = await b.newPage({ viewport: VIEW, deviceScaleFactor: 2 });
    p.on('pageerror', (e) => console.log(`  [pageerror ${w}/${g}] ${e.message.split('\n')[0]}`));
    await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
    await p.addInitScript(() => { try { localStorage.clear();
      localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
      localStorage.setItem('voidMute', '1');
      localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder,skylark'); } catch {} });
    await p.goto(`http://127.0.0.1:${PORT}/?w=${w}&g=${g}&len=180`,
      { waitUntil: 'domcontentloaded', timeout: 300000 });
    await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0, null, { timeout: 600000 }).catch(() => {});
    // let the chip paint at least once with real numbers in it
    await p.waitForFunction(() => {
      const e = document.getElementById('goal');
      return e && !e.hidden && (e.querySelector('.gVal')?.textContent || '').length > 0;
    }, null, { timeout: 180000 }).catch(() => {});

    const m = await p.evaluate(() => {
      const g0 = document.getElementById('goal'), t = document.getElementById('timer');
      if (!g0 || g0.hidden) return null;
      const gr = g0.getBoundingClientRect(), tr = t.getBoundingClientRect();
      const cs = getComputedStyle(g0);
      return {
        label: g0.querySelector('.gLabel')?.textContent || '',
        val: g0.querySelector('.gVal')?.textContent || '',
        // the DECLARED height vs the height the content actually needs. A pill
        // that wraps keeps its box and spills its text; scrollHeight is what
        // tells you, not the rect.
        h: Math.round(gr.height), declared: cs.height,
        scrollH: g0.scrollHeight, scrollW: g0.scrollWidth, clientW: g0.clientWidth,
        right: Math.round(gr.right), left: Math.round(gr.left),
        // does the chip's ink reach into the clock's box?
        overlapsClock: gr.top < tr.bottom && gr.bottom > tr.top,
        offScreen: gr.left < 0 || gr.right > window.innerWidth,
      };
    });
    if (!m) { console.log(`  ${w}/${g}: no chip (goal-free)`); await p.close(); continue; }

    const tag = `${w}-g${g}`;
    await p.screenshot({ path: `${OUT}/${tag}.png`, clip: { x: 0, y: 0, width: VIEW.width, height: 300 } });
    const wraps = m.scrollH > m.h + 2;
    const clipped = m.scrollW > m.clientW + 2;
    rows.push({ tag, ...m, wraps, clipped });
    const why = [wraps && 'WRAPS', clipped && 'CLIPS', m.overlapsClock && 'HITS THE CLOCK', m.offScreen && 'OFF-SCREEN']
      .filter(Boolean).join(' + ');
    if (why) fail(`${tag.padEnd(12)} "${m.label} ${m.val}" — ${why} (box ${m.h}px, content ${m.scrollH}px, ${m.left}..${m.right} of ${VIEW.width})`);
    else pass(`${tag.padEnd(12)} "${m.label} ${m.val}" — one line, ${m.h}px, clear of the clock, on screen`);
    await p.close();
  }
}
} finally { await b.close(); }
console.log(`\n${rows.length} chips measured, ${bad} bad`);
console.log(`shots in ${OUT}/`);
process.exit(bad ? 1 : 0);
