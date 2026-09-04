import { chromium } from 'playwright';
import { ALL_WORLDS } from './worlds.mjs';
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium',
  args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader'] });
for (const wid of ALL_WORLDS) {
  const p = await b.newPage({ viewport:{width:430,height:932}, deviceScaleFactor:1 });
  const msgs = [];
  p.on('console', m => msgs.push(`${m.type()}: ${m.text().slice(0,220)}`));
  p.on('pageerror', e => msgs.push('PAGEERROR: ' + String(e).slice(0,220)));
  await p.addInitScript(()=>{try{localStorage.setItem('voidPlayed','1');localStorage.setItem('voidTut','1');
    localStorage.setItem('voidDailyLast',new Date().toDateString());}catch{}});
  await p.goto(`http://127.0.0.1:4177/?w=${wid}`,{waitUntil:'domcontentloaded',timeout:300000});
  await p.waitForFunction(()=>!!window.__voidState,null,{timeout:400000});
  msgs.length = 0;
  await p.evaluate(()=>window.__validateWorld());
  await p.waitForTimeout(1200);
  const bad = msgs.filter(m => !/403|Forbidden|Failed to load resource/.test(m));
  console.log(`\n══ ${wid.toUpperCase()} ══  ${bad.length ? bad.length + ' line(s)' : 'clean'}`);
  for (const m of bad.slice(0, 14)) console.log('   ', m);
  await p.close();
}
await b.close();
