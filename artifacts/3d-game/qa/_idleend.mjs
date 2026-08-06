// SCRATCH — WHAT THE GAME SAYS TO A CHILD WHO NEVER WORKED OUT THE CONTROL.
//
// Cold install, zero input for the whole match, then the clock is wound to the
// whistle. Prints the results screen verbatim. This is the screen that decides
// whether a confused seven-year-old opens the app a second time.
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => {
  try { localStorage.clear(); } catch {}
  Object.defineProperty(window, '__renderer', { configurable: true,
    set(v) { try { v.render = () => {}; } catch {} Object.defineProperty(window, '__renderer', { value: v, writable: true, configurable: true }); },
    get() { return undefined; } });
});
await p.goto('http://127.0.0.1:4177/', { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__matchState, null, { timeout: 500000 });
await p.waitForFunction(() => window.__matchState().t > 30, null, { timeout: 600000 });
const mid = await p.evaluate(() => ({ t: window.__matchState().t, sc: window.__matchState().score,
  r: window.__voidState().r,
  rivals: window.__matchState().rivals.filter(r => r.joined).map(r => `${r.name} ${r.score} r${r.r.toFixed(1)}`) }));
console.log('at t=30 with zero input:', JSON.stringify(mid, null, 1));
await p.evaluate(() => window.__rushClock(0.5));
await p.waitForFunction(() => document.getElementById('end')?.classList.contains('show'), null, { timeout: 300000 });
await p.waitForTimeout(2500);
const end = await p.evaluate(() => {
  const e = document.getElementById('end');
  const vis = (x) => { const cs = getComputedStyle(x); return cs.display !== 'none' && +cs.opacity > 0.05; };
  return { text: (e.innerText || '').replace(/\n{2,}/g, '\n').trim(),
    buttons: [...e.querySelectorAll('button')].filter(vis).map(x => {
      const r = x.getBoundingClientRect(); return `${x.id || x.className} ${Math.round(r.width)}x${Math.round(r.height)} @y${Math.round(r.y)} "${x.innerText.trim()}"`; }),
    scrolls: e.scrollHeight > e.clientHeight ? `${e.scrollHeight} > ${e.clientHeight} (SCROLLS)` : 'fits',
    words: (e.innerText || '').split(/\s+/).filter(w => /[a-z]/i.test(w)).length };
});
console.log('\n══ THE RESULTS SCREEN, after three minutes of not understanding ══');
console.log(end.text);
console.log('\nbuttons:', end.buttons.join(' | '));
console.log('layout:', end.scrolls, '· readable words on the screen:', end.words);
await b.close();
