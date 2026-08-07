// CAN THE CHILD SEE PLAY AGAIN? Measured as the fraction of each button's box
// that lies inside the viewport, at the find counts a real run produces.
//
//   node qa/endfit2.mjs [port]
//
// The Scrapbook adds a ~64px row to the results screen per sticker found, and
// the screen was already 848px of content in an 844px viewport with none. So
// the run a child most wants to repeat — the one where they found something —
// is exactly the run whose PLAY AGAIN button gets pushed off the bottom. The
// audit measured 0% visible from the SECOND find onward, on every iPhone Apple
// sells.
//
// Driven through renderFinds() with a faked run list rather than by playing:
// this is a layout property of N cards, and playing until a run happens to
// find five would take an hour and still not be a controlled test.
import { chromium } from 'playwright';
const PORT = process.argv[2] || '4188';
const SIZES = [[375, 667, 'iPhone SE 3'], [375, 812, 'iPhone 13 mini'], [390, 844, 'iPhone 15'], [430, 932, 'Pro Max']];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
let bad = 0;
for (const [w, h, label] of SIZES) {
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch { } });
  await p.goto(`http://127.0.0.1:${PORT}/?w=maple`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  // PLAY A REAL MATCH TO THE END. Staging the cards onto an empty #end
  // measured the wrong thing entirely — scrollHeight came back as exactly the
  // viewport height every time, because the score table, the stat cards, the
  // quest chips and the next-goal line were all empty. Those are most of the
  // screen the buttons have to survive. Rushing the clock is the only way to
  // get the genuine article without playing three minutes per size.
  await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => {
    if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
  await p.click('#btnPlay'); await p.waitForTimeout(1200);
  await p.click('#worldRow .wCard[data-world="maple"]');
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout: 400000 });
  await p.evaluate(() => { window.__renderer.render = () => { }; window.__rushClock?.(179); });
  await p.waitForFunction(() => document.getElementById('end')?.classList.contains('show'),
    null, { timeout: 900000 });
  console.log(`\n${label}  ${w}x${h}`);
  for (const n of [0, 1, 2, 3, 5]) {
    const r = await p.evaluate(([finds, vh]) => {
      // stage the results screen with N cards, exactly as renderFinds builds it
      const box = document.getElementById('endFinds');
      const end = document.getElementById('end');
      end.classList.add('show');
      const rows = [];
      for (let i = 0; i < Math.min(3, finds); i++) {
        rows.push(`<div class="stk t-rare"><i>💜</i><span><b>The 1974 Library Book</b>`
          + `<s>MAPLE FALLS HIGH · RARE</s></span></div>`);
      }
      const rest = finds - Math.min(3, finds);
      box.classList.toggle('show', finds > 0);
      box.innerHTML = !finds ? ''
        : `<div class="fLbl">${finds === 1 ? 'NEW STICKER' : finds + ' NEW STICKERS'}</div>`
          + rows.join('') + (rest > 0 ? `<div class="fMore">and ${rest} more in the scrapbook</div>` : '');
      const vis = (el) => {
        if (!el) return -1;
        const b = el.getBoundingClientRect();
        if (b.height <= 0) return 0;
        const top = Math.max(0, b.top), bot = Math.min(vh, b.bottom);
        return Math.max(0, bot - top) / b.height;
      };
      return { content: Math.round(end.scrollHeight),
        again: vis(document.getElementById('btnAgain')),
        home: vis(document.getElementById('btnHome')) };
    }, [n, h]);
    const ok = r.again > 0.99 && r.home > 0.99;
    if (!ok) bad++;
    console.log(`  finds=${n}  content ${String(r.content).padStart(5)}px   PLAY AGAIN ${String(Math.round(r.again * 100)).padStart(3)}%   HOME ${String(Math.round(r.home * 100)).padStart(3)}%  ${ok ? '' : ' <-- CUT OFF'}`);
  }
  await p.close();
}
await b.close();
console.log(bad ? `\n${bad} case(s) hide part of the way back in` : '\nboth buttons fully visible at every find count on every size');
process.exit(bad ? 1 : 0);
