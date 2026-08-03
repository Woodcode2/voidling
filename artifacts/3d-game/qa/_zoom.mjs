import { chromium } from 'playwright';
import fs from 'node:fs';
fs.mkdirSync('qa-out',{recursive:true});
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium',
  args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader'] });
// deviceScaleFactor 4 so a crop of the crowd is genuinely high-res
const p = await b.newPage({ viewport:{width:430,height:932}, deviceScaleFactor:4 });
await p.route('**/functions/v1/ingest-events', r=>r.fulfill({status:200,body:'{}'}));
await p.addInitScript(()=>{try{localStorage.setItem('voidPlayed','1');localStorage.setItem('voidTut','1');
  localStorage.setItem('voidDailyLast',new Date().toDateString());}catch{}});
await p.goto('http://127.0.0.1:4177/?w=maple',{waitUntil:'domcontentloaded',timeout:300000});
await p.waitForFunction(()=>!!window.__voidState,null,{timeout:400000});
await p.evaluate(()=>document.querySelectorAll('.show').forEach(e=>{if(['daily','gift'].includes(e.id))e.classList.remove('show')}));
await p.click('#btnPlay'); await p.waitForTimeout(1400);
await p.click('#worldRow .wCard[data-world="maple"]');
await p.waitForFunction(()=>(window.__matchState?.().t??0)>5,null,{timeout:600000});
// hide the HUD so nothing overlaps the crop
await p.evaluate(()=>{for(const id of ['hud','growth','news','bubbles','lb','timer','btnQuit'])
  {const e=document.getElementById(id); if(e) e.style.visibility='hidden';}
  document.querySelectorAll('.bub,#titlecard,#banner').forEach(e=>e.style.visibility='hidden');});
await p.screenshot({ path:'qa-out/maple-crowd-zoom.png', clip:{x:95,y:270,width:220,height:170} });
console.log('wrote qa-out/maple-crowd-zoom.png');
await b.close();
