// DOES THE RESULTS CARD LAY OUT — no overlaps, at three phone sizes, in the
// worst state the game can produce?
//
//   node qa/endlayout.mjs [port]
//
// The owner's screenshot ("the items don't line up") was two structural bugs
// at once: the shop's generic `.burst` rule capturing #drop's state class and
// stretching it over the whole card, and a sticky PLAY AGAIN row with 20px of
// bottom reservation floating over 94px of overflowing quest list. Neither was
// visible to any existing probe, because none ever LOOKED at the end screen.
//
// This one forces the worst case on purpose: a real match end, the daily drop
// available AND OPENED (the state that triggered the collision), stats, finds
// and quests all present — then measures getBoundingClientRect() for every
// visible element in #end and fails on:
//   • any pair of text/control elements overlapping (>4px both axes)
//   • in-flow content that CANNOT scroll clear of the pinned button row
//   • the primary action out of reach
// at 430x932, 390x844 and 360x780 — WITH SIMULATED SAFE-AREA INSETS, because
// env() is 0 in this harness and on a real iPhone every number is ~93px worse.
import { chromium } from 'playwright';

const PORT = process.argv[2] || '4177';
const SIZES = [[430, 932], [390, 844], [360, 780]];
let bad = 0;

for (const [W, H] of SIZES) {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
    args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
  const p = await b.newPage({ viewport: { width: W, height: H } });
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidMute', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString());
    localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder,skylark');
    // the drop must be OFFERABLE: fresh day, zero opened
    localStorage.setItem('voidDropDay', new Date().toDateString());
    localStorage.setItem('voidDropN', '0');
    localStorage.setItem('voidCoins', '9999');   // affordability nudge on
  } catch { /* private */ } });
  await p.goto(`http://127.0.0.1:${PORT}/?w=maple`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  // simulate iPhone insets — env() is 0 here, and the gap it leaves is exactly
  // where the real device puts the home indicator
  await p.addStyleTag({ content: `
    #end { padding-top: calc(54px + 59px) !important; }
    .endGo { padding-bottom: calc(10px + 34px) !important; }` });
  await p.evaluate(() => document.querySelectorAll('.show')
    .forEach((e) => { if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
  if (await p.$('#tapGate.show')) await p.click('#tapGate');
  await p.click('#btnPlay'); await p.waitForTimeout(900);
  await p.click('#worldRow .wCard[data-world="maple"]');
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 1, null, { timeout: 900000 });
  await p.evaluate(() => window.__rushClock(0.05));
  await p.waitForSelector('#end.show', { timeout: 600000 });
  await p.waitForTimeout(1800);

  // open the drop: the press-and-hold ritual, driven for real — this is the
  // state that produced the owner's screenshot
  if (await p.$('#drop.show')) {
    await p.dispatchEvent('#dropOrb', 'pointerdown', { pointerId: 9 });
    await p.waitForTimeout(2200);
    await p.dispatchEvent('#dropOrb', 'pointerup', { pointerId: 9 });
    await p.waitForTimeout(700);   // measure DURING the receipt, not after it folds
  }

  const r = await p.evaluate(() => {
    const end = document.getElementById('endScroll');
    const seen = [];
    // leaf-ish visible elements with content: texts, buttons, tiles
    const want = end.querySelectorAll('#endHd,#endSub,#drop,.dropLbl,#endList,#endFinds,'
      + '#endStats .es,#endNext,#endQuests .q,#btnAgain,#btnHome,#coins');
    for (const e of want) {
      const b = e.getBoundingClientRect();
      const cs = getComputedStyle(e);
      if (b.width < 4 || b.height < 4 || cs.visibility === 'hidden' || cs.display === 'none') continue;
      seen.push({ id: e.id || e.className.split(' ')[0] || e.tagName,
        x: b.x, y: b.y, w: b.width, h: b.height, txt: (e.textContent || '').slice(0, 24) });
    }
    const overlaps = [];
    for (let i = 0; i < seen.length; i++) for (let j = i + 1; j < seen.length; j++) {
      const a = seen[i], c = seen[j];
      // containment is fine (a tile inside the stats row); flag PARTIAL overlap
      const ox = Math.min(a.x + a.w, c.x + c.w) - Math.max(a.x, c.x);
      const oy = Math.min(a.y + a.h, c.y + c.h) - Math.max(a.y, c.y);
      const contains = (p1, p2) => p1.x <= p2.x + 2 && p1.y <= p2.y + 2
        && p1.x + p1.w >= p2.x + p2.w - 2 && p1.y + p1.h >= p2.y + p2.h - 2;
      // The pinned PLAY AGAIN/HOME row is ALLOWED to cover in-flow content —
      // that is what a sticky footer over a scrolling card is, and the
      // separate scroll-clear check below proves nothing is trapped under it.
      // What it may never cover is another CONTROL, and nothing outside the
      // footer may overlap anything. This distinction is the whole probe: the
      // .burst collision was a non-footer pair, and this is what catches the
      // next one of those.
      const footer = (n) => n === 'btnAgain' || n === 'btnHome';
      if (ox > 4 && oy > 4 && !contains(a, c) && !contains(c, a)
          && !(footer(a.id) !== footer(c.id) && (footer(a.id) || footer(c.id)))) {
        overlaps.push(`${a.id}(${a.txt.trim()}) x ${c.id}(${c.txt.trim()}) by ${Math.round(ox)}x${Math.round(oy)}px`);
      }
    }
    // the footer lives OUTSIDE the scrollport now — nothing can ever be
    // under it. Assert exactly that: at full scroll the last content row ends
    // above the footer's top edge.
    end.scrollTop = end.scrollHeight;
    const goTop = document.querySelector('.endGo').getBoundingClientRect().y;
    let buried = null;
    for (const e of end.querySelectorAll('#endQuests .q,#endNext')) {
      const b = e.getBoundingClientRect();
      if (b.height > 4 && b.y + b.height > goTop + 6) buried = (e.id || e.className) + ` bottom ${Math.round(b.y + b.height)} vs row top ${Math.round(goTop)}`;
    }
    end.scrollTop = 0;
    // the footer must be opaque behind its buttons — the see-through
    // gradient is what made "slides under" read as "pile-up" on the owner's
    // phone. The row now carries a SOLID background (the fade is a ::before
    // apron above it); assert the solid is really there.
    const go = document.querySelector('.endGo');
    const bg = getComputedStyle(go).backgroundColor;
    const alpha = bg.startsWith('rgba') ? parseFloat(bg.split(',')[3]) : 1;
    const seeThrough = !(alpha >= 0.9);
    const again = document.getElementById('btnAgain').getBoundingClientRect();
    return { overlaps, buried, seeThrough, againVisible: again.y > 0 && again.y + again.height < innerHeight,
      scrollH: end.scrollHeight, clientH: end.clientHeight };
  });
  const fails = [];
  if (r.overlaps.length) fails.push(...r.overlaps.map((o) => 'overlap: ' + o));
  if (r.buried) fails.push('cannot scroll clear of the pinned row: ' + r.buried);
  if (r.seeThrough) fails.push('the buttons sit in the footer gradient\'s see-through zone');
  if (!r.againVisible) fails.push('PLAY AGAIN is not on screen at the opening scroll position');
  if (fails.length) bad++;
  console.log(`  ${W}x${H}  content ${r.scrollH}px in ${r.clientH}px  ${fails.length ? 'FAIL' : 'ok'}`);
  for (const f of fails) console.log('     ' + f);
  await b.close();
}
console.log('\n  ' + (bad ? `FAIL — ${bad} size(s) with layout defects` : 'PASS — the results card lays out clean at every size, drop opened and all') + '\n');
process.exit(bad ? 1 : 0);
