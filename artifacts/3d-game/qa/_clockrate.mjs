import { chromium } from 'playwright';
const PORT = process.argv[2] || '4177';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox','--use-gl=angle','--use-angle=swiftshader'] });
const p = await b.newPage({ viewport:{width:430,height:932}, deviceScaleFactor:1 });
await p.route('**/functions/v1/ingest-events', r=>r.fulfill({status:200,body:'{}'}));
await p.addInitScript(()=>{ try{
  localStorage.setItem('voidPlayed','1'); localStorage.setItem('voidTut','1');
  localStorage.setItem('voidDailyLast', new Date().toDateString());
  localStorage.setItem('voidUnlocked','maple,pirate,gameday,lantern,powder');
}catch{} });
await p.goto(`http://127.0.0.1:${PORT}/?w=maple`,{waitUntil:'domcontentloaded',timeout:300000});
await p.waitForFunction(()=>!!window.__voidState,null,{timeout:400000});
await p.waitForSelector('#btnPlay',{state:'visible',timeout:400000});
await p.evaluate(()=>document.getElementById('btnPlay').click());
await p.waitForSelector('#worldRow .wCard[data-world="maple"]',{state:'visible',timeout:400000});
await p.evaluate(()=>document.querySelector('#worldRow .wCard[data-world="maple"]').click());
await p.waitForFunction(()=>(window.__matchState?.().t??0)>0.2,null,{timeout:400000});
const t0 = Date.now(), m0 = await p.evaluate(()=>window.__matchState().t);
await p.waitForTimeout(20000);
const t1 = Date.now(), m1 = await p.evaluate(()=>window.__matchState().t);
const wall = (t1-t0)/1000, match = m1-m0;
console.log(`wall ${wall.toFixed(1)}s -> match clock ${match.toFixed(2)}s   ratio ${(wall/Math.max(0.001,match)).toFixed(1)}x slower`);
// and how many bubbles ever fire in that window
const seen = await p.evaluate(()=>{
  return new Promise(res=>{ let n=0; const t=setInterval(()=>{
    for(const el of document.querySelectorAll('.vb')){ const r=el.getBoundingClientRect();
      if(r.width>2 && getComputedStyle(el).opacity>0.15) n++; }
  },100); setTimeout(()=>{clearInterval(t);res(n);},15000); });
});
console.log(`bubble-frames observed in a further 15s wall: ${seen}`);
await b.close();
