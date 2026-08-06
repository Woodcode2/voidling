// _bug5 — REMATCH CARRY-OVER + RESULTS-SCREEN FOLD. No driving at all, so any
// growth in the first seconds of a rematch is not the probe's doing.
import { chromium } from 'playwright';
const PORT=process.argv[2]||'4177'; const W=+(process.argv[3]||390),H=+(process.argv[4]||844);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']});
const p=await b.newPage({viewport:{width:W,height:H},deviceScaleFactor:1,hasTouch:true,isMobile:true});
await p.route('**/functions/v1/ingest-events',r=>r.fulfill({status:200,body:'{}'}));
await p.addInitScript(()=>{try{localStorage.setItem('voidPlayed','1');localStorage.setItem('voidTut','1');
  localStorage.setItem('voidDailyLast',new Date().toDateString());}catch{}});
await p.goto(`http://127.0.0.1:${PORT}/?w=maple`,{waitUntil:'domcontentloaded',timeout:300000});
await p.waitForFunction(()=>!!window.__voidState,null,{timeout:400000});
await p.waitForTimeout(1200);
await p.evaluate(()=>document.getElementById('btnPlay').click()); await p.waitForTimeout(1400);
await p.evaluate(()=>document.querySelector('#worldRow .wCard[data-world="maple"]')?.click());
await p.waitForFunction(()=>(window.__matchState?.().t??0)>0.2,null,{timeout:400000});
await p.evaluate(()=>{window.__renderer.render=()=>{};});
const sample=async(tag)=>{
  const rows=[];
  for(const T of [0.3,1,2,4,8]){
    try{await p.waitForFunction(t=>(window.__matchState?.().t??0)>t,T,{timeout:200000});}catch{}
    rows.push(await p.evaluate(()=>({t:+window.__matchState().t.toFixed(2),score:Math.round(window.__matchState().score),
      r:+window.__voidState().r.toFixed(3), show:[...document.querySelectorAll('.show')].map(e=>e.id).filter(Boolean).join(',')})));
  }
  console.log(`  ${tag}`); rows.forEach(r=>console.log(`      t=${String(r.t).padEnd(6)} score=${String(r.score).padEnd(6)} r=${String(r.r).padEnd(7)} show=[${r.show}]`));
};
await sample('MATCH 1 (fresh from menu)');
// grow it so the rematch has something to leak, then end
await p.evaluate(()=>window.__setVoidR(9)); await p.waitForTimeout(1500);
await p.evaluate(()=>window.__rushClock(0)); await p.waitForTimeout(9000);
const endM = async () => p.evaluate(()=>{ const e=document.getElementById('end'); const vh=innerHeight;
  const g=id=>{const x=document.getElementById(id); if(!x) return null; const r=x.getBoundingClientRect();
    return {top:Math.round(r.top),bot:Math.round(r.bottom),h:Math.round(r.height)};};
  return {vh, scroll:e.scrollHeight, client:e.clientHeight, overflowY:getComputedStyle(e).overflowY,
    again:g('btnAgain'), home:g('btnHome'), finds:g('endFinds'), quests:g('endQuests'), stats:g('endStats'),
    findsShown: document.getElementById('endFinds')?.classList.contains('show')};});
console.log('\n  RESULTS SCREEN @'+W+'x'+H+': '+JSON.stringify(await endM()));
await p.screenshot({path:`qa-out/_bug/results-${W}x${H}.png`});
for(let i=2;i<=4;i++){
  await p.evaluate(()=>document.getElementById('btnAgain').click());
  await p.waitForFunction(()=>(window.__matchState?.().t??0)>0.2,null,{timeout:400000});
  await sample(`MATCH ${i} (instant rematch, NO input)`);
  await p.evaluate(()=>window.__setVoidR(9)); await p.waitForTimeout(1200);
  await p.evaluate(()=>window.__rushClock(0)); await p.waitForTimeout(9000);
}
await b.close();
