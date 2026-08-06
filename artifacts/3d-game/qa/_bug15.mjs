// _bug15 — the mid-match FIND moment, WORLD ENDER, and getting eaten.
import { chromium } from 'playwright';
const PORT=process.argv[2]||'4177';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']});
const p=await b.newPage({viewport:{width:320,height:568},deviceScaleFactor:2,hasTouch:true,isMobile:true});
const errs=[];p.on('pageerror',e=>errs.push(String(e.stack||e).slice(0,240)));
p.on('console',m=>{if(m.type()==='error'){const t=m.text();if(!/403|Forbidden|ERR_|swiftshader|GroupMarker/.test(t))errs.push('ERR '+t.slice(0,180));}});
await p.route('**/functions/v1/ingest-events',r=>r.fulfill({status:200,body:'{}'}));
await p.addInitScript(()=>{try{localStorage.setItem('voidPlayed','1');localStorage.setItem('voidTut','1');
  localStorage.setItem('voidDailyLast',new Date().toDateString());}catch{}});
await p.goto(`http://127.0.0.1:${PORT}/?w=maple`,{waitUntil:'domcontentloaded',timeout:300000});
await p.waitForFunction(()=>!!window.__voidState,null,{timeout:400000}); await p.waitForTimeout(1400);
await p.evaluate(()=>document.getElementById('btnPlay').click()); await p.waitForTimeout(1300);
await p.evaluate(()=>document.querySelector('#worldRow .wCard[data-world="maple"]')?.click());
await p.waitForFunction(()=>(window.__matchState?.().t??0)>0.2,null,{timeout:400000});
// drive toward the nearest CURIO so a find fires naturally
await p.evaluate(()=>{const cv=document.querySelector('canvas');const cx=innerWidth/2,cy=innerHeight/2;
  cv.dispatchEvent(new PointerEvent('pointerdown',{pointerId:1,clientX:cx,clientY:cy,bubbles:true}));
  const tick=()=>{const vs=window.__voidState();let best=null,bd=1e9;
    for(const e of window.__edibles){if(e.eaten||!e.mesh?.visible||e.radius>vs.r*0.92)continue;
      const dx=e.mesh.position.x-vs.x,dz=e.mesh.position.z-vs.z;const d=dx*dx+dz*dz;if(d<bd){bd=d;best={dx,dz};}}
    if(best){const m=Math.hypot(best.dx,best.dz)||1;
      dispatchEvent(new PointerEvent('pointermove',{pointerId:1,clientX:cx+best.dx/m*110,clientY:cy+best.dz/m*110,bubbles:true}));}
    requestAnimationFrame(tick);};requestAnimationFrame(tick);});
// poll for the find card, screenshot it
let found=null;
for(let i=0;i<180;i++){ await p.waitForTimeout(500);
  const f=await p.evaluate(()=>{const c=document.querySelector('#findCard,.findCard,#find,.curioFind');
    const any=[...document.querySelectorAll('.show')].map(e=>e.id||e.className).filter(Boolean);
    return {any, t:window.__matchState?.().t};});
  if(f.any.some(x=>/find|curio|stk/i.test(x))){ found=f; await p.screenshot({path:'qa-out/_bug/findmoment.png'}); break;}
  if((f.t??0)>70) break;}
console.log('  mid-match find moment: '+JSON.stringify(found||'not observed in 70 match-seconds'));
// WORLD ENDER
await p.evaluate(()=>window.__setVoidR(40)); await p.waitForTimeout(2500);
const we=await p.evaluate(()=>({r:+window.__voidState().r.toFixed(2),
  growth:(document.getElementById('growth')?.textContent||'').replace(/\s+/g,' ').trim(),
  banner:(document.getElementById('banner')?.textContent||'').trim(),
  evolve:(document.getElementById('evolve')?.textContent||'').replace(/\s+/g,' ').trim(),
  fog:!!window.__scene.fog, camY:+window.__cam.position.y.toFixed(1)}));
console.log('  WORLD ENDER: '+JSON.stringify(we));
await p.screenshot({path:'qa-out/_bug/worldender-320.png'});
// getting eaten: shrink the void tiny next to the biggest rival
const eaten=await p.evaluate(async()=>{const before=window.__voidState().r;
  window.__setVoidR(0.5); await new Promise(r=>setTimeout(r,6000));
  return {before:+before.toFixed(2), after:+window.__voidState().r.toFixed(2),
    score:Math.round(window.__matchState().score), over:window.__matchState().over,
    banner:(document.getElementById('banner')?.textContent||'').trim()};});
console.log('  shrunk to r=0.5 among grown rivals: '+JSON.stringify(eaten));
await p.screenshot({path:'qa-out/_bug/tiny-320.png'});
console.log('  errors: '+JSON.stringify([...new Set(errs)]));
await b.close();
