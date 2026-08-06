// _bug6 — RESULTS SCREEN FOLD across devices, and NO-INPUT DRIFT on rematch.
import { chromium } from 'playwright';
const PORT=process.argv[2]||'4177';
const DEV=[[320,568,'SE1'],[375,667,'SE2/3'],[390,844,'iPhone 12-15'],[430,932,'15 Pro Max'],[768,1024,'iPad']];
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']});
console.log('\n  RESULTS SCREEN — is PLAY AGAIN above the fold?\n');
for(const [W,H,nm] of DEV){
  const p=await b.newPage({viewport:{width:W,height:H},deviceScaleFactor:1,hasTouch:true,isMobile:W<700});
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
  await p.evaluate(()=>window.__setVoidR(9)); await p.waitForTimeout(1200);
  await p.evaluate(()=>window.__rushClock(0)); await p.waitForTimeout(9000);
  const m=await p.evaluate(()=>{const e=document.getElementById('end');
    const g=id=>{const x=document.getElementById(id); if(!x)return null; const r=x.getBoundingClientRect();
      return {top:Math.round(r.top),bot:Math.round(r.bottom)};};
    return {vh:innerHeight, scroll:e.scrollHeight, client:e.clientHeight, scrollTop:e.scrollTop,
      again:g('btnAgain'), home:g('btnHome')};});
  const vis = m.again ? Math.max(0, Math.min(m.again.bot, m.vh) - Math.max(m.again.top,0)) : 0;
  const hvis = m.home ? Math.max(0, Math.min(m.home.bot, m.vh) - Math.max(m.home.top,0)) : 0;
  console.log(`  ${String(W)+'x'+H} ${nm.padEnd(12)} content ${m.scroll}px in ${m.client}px  PLAY AGAIN ${JSON.stringify(m.again)} visible ${vis}px  HOME ${JSON.stringify(m.home)} visible ${hvis}px`);
  await p.screenshot({path:`qa-out/_bug/res-${W}x${H}.png`});
  await p.close();
}
// drift
const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,hasTouch:true,isMobile:true});
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
const track=async(tag)=>{const rows=[];
  for(const T of [0.5,2,5,10]){ try{await p.waitForFunction(t=>(window.__matchState?.().t??0)>t,T,{timeout:200000});}catch{}
    rows.push(await p.evaluate(()=>{const v=window.__voidState();return {t:+window.__matchState().t.toFixed(2),x:+v.x.toFixed(2),z:+v.z.toFixed(2),r:+v.r.toFixed(3)};}));}
  const d=Math.hypot(rows[3].x-rows[0].x, rows[3].z-rows[0].z);
  console.log(`\n  ${tag}: no-input travel t0.5->t10 = ${d.toFixed(2)} world units`);
  rows.forEach(r=>console.log(`      t=${r.t} pos=(${r.x},${r.z}) r=${r.r}`));};
await track('MATCH 1');
await p.evaluate(()=>window.__setVoidR(9)); await p.waitForTimeout(1200);
await p.evaluate(()=>window.__rushClock(0)); await p.waitForTimeout(9000);
await p.evaluate(()=>document.getElementById('btnAgain').click());
await p.waitForFunction(()=>(window.__matchState?.().t??0)>0.2,null,{timeout:400000});
await track('MATCH 2 (rematch)');
await b.close();
