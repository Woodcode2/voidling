// _bug10 — ONE HONEST FULL MATCH. No __setVoidR, no __rushClock. Plays the
// whole 180s driving at food, then reads the real results screen.
import { chromium } from 'playwright';
const PORT=process.argv[2]||'4177'; const W=+(process.argv[3]||375),H=+(process.argv[4]||667);
const WORLD=process.argv[5]||'maple';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']});
const p=await b.newPage({viewport:{width:W,height:H},deviceScaleFactor:2,hasTouch:true,isMobile:true});
const errs=[]; p.on('console',m=>{if(m.type()!=='error'&&m.type()!=='warning')return;const t=m.text();
  if(/403|Forbidden|ERR_(FAILED|BLOCKED)|swiftshader|GroupMarker|THREE.Clock/.test(t))return;errs.push(t.slice(0,200));});
p.on('pageerror',e=>errs.push('PAGEERROR '+String(e.stack||e).slice(0,300)));
await p.route('**/functions/v1/ingest-events',r=>r.fulfill({status:200,body:'{}'}));
await p.addInitScript(()=>{try{localStorage.setItem('voidPlayed','1');localStorage.setItem('voidTut','1');
  localStorage.setItem('voidDailyLast',new Date().toDateString());}catch{}});
await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`,{waitUntil:'domcontentloaded',timeout:300000});
await p.waitForFunction(()=>!!window.__voidState,null,{timeout:400000}); await p.waitForTimeout(1500);
await p.evaluate(()=>document.getElementById('btnPlay').click()); await p.waitForTimeout(1300);
await p.evaluate(w=>document.querySelector(`#worldRow .wCard[data-world="${w}"]`)?.click(),WORLD);
await p.waitForFunction(()=>(window.__matchState?.().t??0)>0.2,null,{timeout:400000});
await p.evaluate(()=>{window.__renderer.render=()=>{};});
await p.evaluate(()=>{const cv=document.querySelector('canvas');const cx=innerWidth/2,cy=innerHeight/2;
  cv.dispatchEvent(new PointerEvent('pointerdown',{pointerId:1,clientX:cx,clientY:cy,bubbles:true}));
  const tick=()=>{const vs=window.__voidState();let best=null,bd=1e9;
    for(const e of window.__edibles){if(e.eaten||!e.mesh?.visible||e.radius>vs.r*0.92)continue;
      const dx=e.mesh.position.x-vs.x,dz=e.mesh.position.z-vs.z;const d=dx*dx+dz*dz;if(d<bd){bd=d;best={dx,dz};}}
    if(best){const m=Math.hypot(best.dx,best.dz)||1;
      dispatchEvent(new PointerEvent('pointermove',{pointerId:1,clientX:cx+best.dx/m*110,clientY:cy+best.dz/m*110,bubbles:true}));}
    requestAnimationFrame(tick);};requestAnimationFrame(tick);});
const marks=[30,60,90,120,150,175];
for(const T of marks){ await p.waitForFunction(t=>(window.__matchState?.().t??0)>t,T,{timeout:900000});
  const s=await p.evaluate(()=>({t:Math.round(window.__matchState().t),score:Math.round(window.__matchState().score),
    r:+window.__voidState().r.toFixed(2), rank:window.__matchState().rank,
    board:(document.getElementById('board')?.textContent||'').replace(/\s+/g,' ').trim().slice(0,90),
    news:(document.getElementById('news')?.textContent||'').trim().slice(0,80)}));
  console.log('   '+JSON.stringify(s)); }
await p.waitForFunction(()=>document.getElementById('end').classList.contains('show'),null,{timeout:900000});
await p.waitForTimeout(2500);
await p.screenshot({path:`qa-out/_bug/full-${WORLD}-${W}x${H}.png`});
const m=await p.evaluate(()=>{const e=document.getElementById('end');
  const g=id=>{const x=document.getElementById(id);if(!x)return null;const r=x.getBoundingClientRect();
    return {top:Math.round(r.top),bot:Math.round(r.bottom),vis:Math.max(0,Math.min(r.bottom,innerHeight)-Math.max(r.top,0))};};
  return {vh:innerHeight,scroll:e.scrollHeight,client:e.clientHeight,
    again:g('btnAgain'),home:g('btnHome'),finds:g('endFinds'),
    findsOn:document.getElementById('endFinds')?.className,
    hd:document.getElementById('endHd').textContent, sub:document.getElementById('endSub').textContent,
    list:(document.getElementById('endList')?.textContent||'').replace(/\s+/g,' ').trim()};});
console.log('\n  FULL-MATCH RESULTS '+WORLD+' @'+W+'x'+H+':\n   '+JSON.stringify(m,null,1).replace(/\n/g,'\n   '));
await b.close();
console.log('\n  errors: '+(errs.length?JSON.stringify([...new Set(errs)]):'(none)'));
