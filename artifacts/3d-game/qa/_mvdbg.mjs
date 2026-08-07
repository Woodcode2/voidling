import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox','--use-gl=angle','--use-angle=swiftshader'] });
for (const url of ['?w=maple&len=12','?w=maple']) {
  const p = await b.newPage({ viewport: { width: 375, height: 667 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
  await p.route('**/functions/v1/ingest-events', r=>r.fulfill({status:200,body:'{}'}));
  await p.addInitScript(()=>{try{localStorage.setItem('voidPlayed','1');localStorage.setItem('voidTut','1');localStorage.setItem('voidDailyLast',new Date().toDateString());}catch{}});
  await p.goto('http://127.0.0.1:4237/'+url, { waitUntil:'domcontentloaded', timeout:300000 });
  await p.waitForFunction(()=>!!window.__voidState,null,{timeout:400000});
  await p.waitForTimeout(3000);
  console.log(url, await p.evaluate(()=>{
    const m=document.getElementById('menu'), b=document.getElementById('btnPlay');
    const r=b.getBoundingClientRect();
    return { bodyClass: document.body.className, menuDisplay: getComputedStyle(m).display,
      playRect:[Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)],
      playVis: getComputedStyle(b).visibility, playDisp: getComputedStyle(b).display,
      shown: [...document.querySelectorAll('.show')].map(e=>e.id||e.className).slice(0,8) };
  }));
  await p.close();
}
await b.close();
