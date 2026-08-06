// _bug14 — the coin chip vs the results headline, and the mid-match FIND moment.
import { chromium } from 'playwright';
const PORT=process.argv[2]||'4177';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']});
for(const [W,H] of [[320,568],[375,667],[390,844],[430,932]]){
  const p=await b.newPage({viewport:{width:W,height:H},deviceScaleFactor:1,hasTouch:true,isMobile:true});
  await p.route('**/functions/v1/ingest-events',r=>r.fulfill({status:200,body:'{}'}));
  await p.addInitScript(()=>{try{localStorage.setItem('voidPlayed','1');localStorage.setItem('voidTut','1');
    localStorage.setItem('voidCoins','1204');localStorage.setItem('voidDailyLast',new Date().toDateString());}catch{}});
  await p.goto(`http://127.0.0.1:${PORT}/?w=pirate`,{waitUntil:'domcontentloaded',timeout:300000});
  await p.waitForFunction(()=>!!window.__voidState,null,{timeout:400000}); await p.waitForTimeout(1400);
  await p.evaluate(()=>document.getElementById('btnPlay').click()); await p.waitForTimeout(1300);
  await p.evaluate(()=>document.querySelector('#worldRow .wCard[data-world="pirate"]')?.click());
  await p.waitForFunction(()=>(window.__matchState?.().t??0)>0.2,null,{timeout:400000});
  await p.evaluate(()=>{window.__renderer.render=()=>{};});
  await p.evaluate(()=>window.__setVoidR(40)); await p.waitForTimeout(1500);
  await p.evaluate(()=>window.__rushClock(0));
  await p.waitForFunction(()=>document.getElementById('end').classList.contains('show'),null,{timeout:400000});
  await p.waitForTimeout(2000);
  const m=await p.evaluate(()=>{const c=document.getElementById('coins').getBoundingClientRect();
    const h=document.getElementById('endHd'); const r=h.getBoundingClientRect();
    // measure the ink, not the block: use the first line's text rects
    const rng=document.createRange(); rng.selectNodeContents(h);
    const rects=[...rng.getClientRects()].map(x=>({l:Math.round(x.left),t:Math.round(x.top),r:Math.round(x.right),b:Math.round(x.bottom)}));
    const ov=rects.map(x=>{const ox=Math.min(x.r,c.right)-Math.max(x.l,c.left);
      const oy=Math.min(x.b,c.bottom)-Math.max(x.t,c.top); return (ox>0&&oy>0)?`${Math.round(ox)}x${Math.round(oy)}`:null;}).filter(Boolean);
    return {coins:document.getElementById('coins').textContent.trim(),
      coinsRect:[Math.round(c.left),Math.round(c.top),Math.round(c.right),Math.round(c.bottom)],
      hd:h.textContent, hdRects:rects, overlap:ov,
      coinsZ:getComputedStyle(document.getElementById('coins')).zIndex,
      endZ:getComputedStyle(document.getElementById('end')).zIndex};});
  console.log(`  ${W}x${H} coins=${m.coins} ${JSON.stringify(m.coinsRect)} z=${m.coinsZ} vs #end z=${m.endZ}`);
  console.log(`         headline "${m.hd}" lines ${JSON.stringify(m.hdRects)}`);
  console.log(`         TEXT-ON-TEXT OVERLAP: ${m.overlap.length?m.overlap.join(','):'none'}`);
  await p.screenshot({path:`qa-out/_bug/coinclash-${W}.png`});
  await p.close();
}
await b.close();
