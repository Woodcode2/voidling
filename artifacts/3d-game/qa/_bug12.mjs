// _bug12 — THE TRANSITION RACE. Tap PLAY AGAIN, then HOME before the new
// match has finished starting. Does the match keep running under the menu?
import { chromium } from 'playwright';
const PORT=process.argv[2]||'4177'; const GAP=+(process.argv[3]||120);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']});
const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,hasTouch:true,isMobile:true});
const errs=[];p.on('pageerror',e=>errs.push(String(e).slice(0,200)));
await p.route('**/functions/v1/ingest-events',r=>r.fulfill({status:200,body:'{}'}));
await p.addInitScript(()=>{try{localStorage.setItem('voidPlayed','1');localStorage.setItem('voidTut','1');
  localStorage.setItem('voidDailyLast',new Date().toDateString());}catch{}});
await p.goto(`http://127.0.0.1:${PORT}/?w=maple`,{waitUntil:'domcontentloaded',timeout:300000});
await p.waitForFunction(()=>!!window.__voidState,null,{timeout:400000}); await p.waitForTimeout(1500);
await p.evaluate(()=>document.getElementById('btnPlay').click()); await p.waitForTimeout(1300);
await p.evaluate(()=>document.querySelector('#worldRow .wCard[data-world="maple"]')?.click());
await p.waitForFunction(()=>(window.__matchState?.().t??0)>0.2,null,{timeout:400000});
await p.evaluate(()=>{window.__renderer.render=()=>{};});
await p.evaluate(()=>window.__rushClock(0)); await p.waitForTimeout(8000);
console.log('  results up. tapping PLAY AGAIN then HOME after '+GAP+'ms');
await p.evaluate(async g=>{document.getElementById('btnAgain').click();
  await new Promise(r=>setTimeout(r,g)); document.getElementById('btnHome')?.click();},GAP);
for(const w of [2000,5000,10000,15000]){ await p.waitForTimeout(w===2000?2000:w-(w===5000?2000:w===10000?5000:10000));
  const s=await p.evaluate(()=>({t:+((window.__matchState?.().t)??-1).toFixed(2),
    score:Math.round(window.__matchState?.().score??-1), r:+((window.__voidState?.().r)??-1).toFixed(2),
    menu:getComputedStyle(document.getElementById('menu')).display,
    coins:document.getElementById('coins').textContent,
    music: !!window.__audio, bodyCls: document.body.className,
    hudVisible:['board','timer','hunger','news'].filter(i=>{const e=document.getElementById(i);
      if(!e)return false;const c=getComputedStyle(e);return c.display!=='none'&&+c.opacity>0.05;})}));
  console.log('   +'+w+'ms: '+JSON.stringify(s)); }
// now press PLAY from the menu while that phantom match runs
console.log('  pressing PLAY from the menu now…');
await p.evaluate(()=>document.getElementById('btnPlay').click()); await p.waitForTimeout(1400);
await p.evaluate(()=>document.querySelector('#worldRow .wCard[data-world="maple"]')?.click());
await p.waitForTimeout(6000);
console.log('   after relaunch: '+JSON.stringify(await p.evaluate(()=>({t:+window.__matchState().t.toFixed(2),
  score:Math.round(window.__matchState().score), r:+window.__voidState().r.toFixed(2),
  menu:getComputedStyle(document.getElementById('menu')).display,
  edibles:window.__edibles.length, geos:window.__renderer.info.memory.geometries,
  scene:window.__scene.children.length}))));
await p.screenshot({path:'qa-out/_bug/race-relaunch.png'});
console.log('  pageerrors: '+JSON.stringify(errs));
await b.close();
