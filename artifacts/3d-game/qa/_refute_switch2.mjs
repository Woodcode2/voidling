// REFUTE-SWITCH-2 — N reps of the only comparison that matters:
//   BOOT   : a plain warm navigation to the same world (what launching the app
//            from the home screen costs once the browser/webview is warm)
//   SWITCH : tapping a DIFFERENT world card (the reload path under test)
// Reports module-eval (domContentLoadedEventEnd, i.e. bundle parse + GL init +
// PMREM + createIsland) and the tap→ticking-clock total, plus an in-page CPU
// bench so a reader can see how contended the box was for each rep.
import { chromium } from 'playwright';
const PORT = process.argv[2] || 4191;
const REPS = +(process.argv[3] || 3);
const FROM = 'maple', TO = 'gameday';
const boots = [], switches = [], evalsB = [], evalsS = [], benches = [];

for (let i = 0; i < REPS; i++) {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--use-gl=angle','--use-angle=swiftshader','--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await ctx.addInitScript(() => { try { localStorage.setItem('voidPlayed','1'); localStorage.setItem('voidTut','1');
    localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
  const p = await ctx.newPage();
  await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
  const dcl = () => p.evaluate(() => Math.round(performance.getEntriesByType('navigation')[0].domContentLoadedEventEnd));

  // prime the HTTP + code cache so BOOT and SWITCH are both "warm browser"
  await p.goto(`http://127.0.0.1:${PORT}/?w=${FROM}`, { waitUntil: 'commit' });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 900000 });

  // BOOT: warm navigation, menu → PLAY → SAME card (no reload) → ticking clock
  const t0 = Date.now();
  await p.goto(`http://127.0.0.1:${PORT}/?w=${FROM}`, { waitUntil: 'commit' });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 900000 });
  evalsB.push(await dcl());
  await p.evaluate(() => document.getElementById('btnPlay').click());
  await p.waitForTimeout(300);
  await p.evaluate((w) => document.querySelector(`#worldRow .wCard[data-world="${w}"]`)
    .dispatchEvent(new MouseEvent('click', { bubbles: true })), FROM);
  await p.waitForFunction(() => typeof window.__matchState === 'function' && window.__matchState().t > 0.4,
    null, { timeout: 900000 });
  boots.push(Date.now() - t0);

  // SWITCH: back to a warm menu, then tap a DIFFERENT card (reload path)
  await p.goto(`http://127.0.0.1:${PORT}/?w=${FROM}`, { waitUntil: 'commit' });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 900000 });
  await p.evaluate(() => document.getElementById('btnPlay').click());
  await p.waitForTimeout(300);
  const t1 = Date.now();
  await p.evaluate((w) => document.querySelector(`#worldRow .wCard[data-world="${w}"]`)
    .dispatchEvent(new MouseEvent('click', { bubbles: true })), TO);
  await p.waitForFunction(() => typeof window.__matchState === 'function' && window.__matchState().t > 0.4,
    null, { timeout: 900000 });
  switches.push(Date.now() - t1);
  evalsS.push(await dcl());
  benches.push((await p.evaluate(() => { const t = performance.now(); let s = 0;
    for (let i = 0; i < 3e7; i++) s += Math.sqrt(i % 1000); return { ms: +(performance.now()-t).toFixed(0), s: s|0 }; })).ms);
  await b.close();
  console.log(`rep ${i+1}: boot ${boots[i]}ms (eval ${evalsB[i]})   switch ${switches[i]}ms (eval ${evalsS[i]})   cpubench ${benches[i]}ms`);
}
const mn = a => Math.min(...a), md = a => [...a].sort((x,y)=>x-y)[a.length>>1];
console.log(`\nBOOT   nav→clock  min ${mn(boots)}  med ${md(boots)}   moduleEval min ${mn(evalsB)}`);
console.log(`SWITCH tap→clock  min ${mn(switches)}  med ${md(switches)}   moduleEval min ${mn(evalsS)}`);
console.log(`RATIO switch/boot  min ${(mn(switches)/mn(boots)).toFixed(2)}x  med ${(md(switches)/md(boots)).toFixed(2)}x  eval ${(mn(evalsS)/mn(evalsB)).toFixed(2)}x`);
