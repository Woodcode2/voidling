// SCRATCH — the results screen AFTER the shop has been bought out, which is
// where every player is from about their fourth match onward. nextGoal()
// returns null once every priced skin is owned, and #endNext is emptied
// (prototype3d.ts:2246) — so the one line whose job is to say what to play for
// next is blank for the entire rest of the game's life.
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
for (const [tag, owned] of [['fresh', ['classic']],
  ['boughtout', ['classic', 'toxic', 'sunset', 'ocean', 'candy', 'honey']]]) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
  await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript((o) => { try {
    localStorage.clear();
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidCoins', '4200');
    localStorage.setItem('voidSkinsOwned', JSON.stringify(o));
    localStorage.setItem('voidSaveVer', '2');
    localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} }, owned);
  await p.goto('http://127.0.0.1:4177/?w=maple', { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.evaluate(() => document.querySelectorAll('.show').forEach(e => {
    if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
  await p.click('#btnPlay'); await p.waitForTimeout(1400);
  await p.click('#worldRow .wCard[data-world="maple"]');
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout: 400000 });
  await p.evaluate(() => { window.__renderer.render = () => {}; window.__setVoidR?.(9); window.__rushClock?.(176); });
  await p.waitForFunction(() => document.getElementById('end')?.classList.contains('show'),
    null, { timeout: 600000 });
  await p.waitForTimeout(1600);
  const r = await p.evaluate(() => ({
    next: document.getElementById('endNext')?.innerHTML || '',
    nextTxt: document.getElementById('endNext')?.textContent?.trim() || '',
    coins: localStorage.getItem('voidCoins'),
    sub: document.getElementById('end')?.querySelector('.sub')?.textContent,
  }));
  console.log(`${tag.padEnd(10)} wallet ${r.coins}✦  endNext = ${r.nextTxt ? `"${r.nextTxt}"` : 'EMPTY — no goal shown'}  (${r.next.length} chars of html)`);
  await p.evaluate(() => { try { window.__renderer.render = () => {}; } catch {} });
  await p.screenshot({ path: `qa-out/econ/end-${tag}.png`, timeout: 120000 }).catch(e => console.log('  (shot skipped)'));
  await p.close();
}
await b.close();
