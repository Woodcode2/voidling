// THE OPENING FRAME. Spawn and the opening hand are hand-authored and identical
// every load (docs/GOVERNOR.md, HANDS OFF), so the frame a child sees in their
// first second on a world is deterministic. This photographs it.
import { chromium } from 'playwright';
const PORT = process.argv[2] || '4188';
const OUT  = process.argv[3];
const WORLDS = (process.argv[4] || 'maple,pirate,gameday,lantern,powder').split(',');
const TT = parseFloat(process.argv[5] || '0.9');
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium',
  args: ['--no-sandbox','--use-gl=angle','--use-angle=swiftshader'] });
const p = await b.newPage({ viewport:{width:430,height:932}, deviceScaleFactor:3, isMobile:true, hasTouch:true });
p.on('pageerror', e => console.warn('  page error:', String(e).slice(0,120)));
await p.route('**/functions/v1/ingest-events', r => r.fulfill({status:200, body:'{}'}));
for (const w of WORLDS) {
  await p.addInitScript(([world]) => { try {
    localStorage.setItem('voidPlayed','1'); localStorage.setItem('voidTut','1');
    localStorage.setItem('voidCoins','2400');
    localStorage.setItem('voidDailyLast', new Date().toDateString());
    localStorage.setItem('voidUnlocked','maple,pirate,gameday,lantern,powder');
    localStorage.setItem('voidWorld', world);
    localStorage.setItem('voidAutoPlay','1');
  } catch {} }, [w]);
  await p.goto(`http://127.0.0.1:${PORT}/`, { waitUntil:'domcontentloaded', timeout:300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout:400000 });
  await p.waitForFunction(() => {
    const g = document.getElementById('tapGate');
    const armed = !!g && g.classList.contains('show') && g.classList.contains('armed');
    const running = !!window.__matchState && window.__matchState().t > 0.2;
    return armed || running;
  }, null, { timeout:400000 });
  if (await p.evaluate(() => { const g=document.getElementById('tapGate');
      return !!g && g.classList.contains('show') && g.classList.contains('armed'); }))
    await p.click('#tapGate', { force: true, timeout: 60000 }).catch(()=>p.evaluate(()=>document.getElementById('tapGate').click()));
  await p.waitForFunction((tt) => window.__matchState && window.__matchState().t > tt, TT, { timeout:180000 });
  await p.waitForTimeout(60);
  const t = await p.evaluate(() => window.__matchState().t);
  await p.screenshot({ path: `${OUT}/spawn-${w}-t${TT}.png` });
  console.log(`spawn-${w}-t${TT}.png  t=${t.toFixed(2)}s`);
}
await b.close();
