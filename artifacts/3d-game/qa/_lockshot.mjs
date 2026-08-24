// Shoot the world picker in the state a REAL new player sees it: they finished
// one Maple match (session 1 auto-plays, prototype3d.ts:5561), so Pirate is
// open and Game Day / Lantern / Powder are locked (unlocks.ts:83).
import { chromium } from 'playwright';
const PORT = process.argv[2] || '4188';
const OUT  = process.argv[3];
const UNLOCKED = process.argv[4] || 'maple,pirate';
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium',
  args: ['--no-sandbox','--use-gl=angle','--use-angle=swiftshader'] });
const p = await b.newPage({ viewport:{width:430,height:932}, deviceScaleFactor:3 });
await p.route('**/functions/v1/ingest-events', r => r.fulfill({status:200, body:'{}'}));
await p.addInitScript(([u]) => { try {
  localStorage.setItem('voidPlayed','1'); localStorage.setItem('voidTut','1');
  localStorage.setItem('voidDailyLast', new Date().toDateString());
  localStorage.setItem('voidUnlocked', u);
  localStorage.setItem('voidBest_maple','8420');
  for (const w of ['pirate','gameday','lantern','powder']) localStorage.removeItem(`voidBest_${w}`);
} catch {} }, [UNLOCKED]);
await p.goto(`http://127.0.0.1:${PORT}/`, { waitUntil:'domcontentloaded', timeout:300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout:400000 });
await p.waitForSelector('#btnPlay', { state:'visible', timeout:400000 });
await p.evaluate(() => document.getElementById('btnPlay').click());
await p.waitForSelector('#worldRow .wCard[data-world="maple"]', { state:'visible', timeout:400000 });
await p.waitForTimeout(2500);
await p.screenshot({ path: OUT, fullPage: false });
const geo = await p.evaluate(() => {
  const o=[];
  for (const c of document.querySelectorAll('#worldRow .wCard[data-world]')) {
    const art=c.querySelector('.wArt'), ar=art.getBoundingClientRect();
    const t=c.querySelector('b').getBoundingClientRect();
    const s=c.querySelector('span').getBoundingClientRect();
    const bd=c.querySelector('.wBody').getBoundingClientRect();
    o.push({w:c.dataset.world, locked:c.classList.contains('locked'),
      art:{h:+ar.height.toFixed(1),w:+ar.width.toFixed(1)},
      bodyH:+bd.height.toFixed(1), bodyFrac:+(bd.height/ar.height).toFixed(3),
      titleTopFrac:+((t.top-ar.top)/ar.height).toFixed(3),
      subTopFrac:+((s.top-ar.top)/ar.height).toFixed(3),
      best:c.querySelector('.wBest').textContent});
  }
  return {cards:o, doc:document.documentElement.scrollHeight, vh:innerHeight};
});
console.log(JSON.stringify(geo,null,1));
await b.close();
