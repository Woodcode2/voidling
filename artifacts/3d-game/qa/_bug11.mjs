// _bug11 — WHAT A SIX-YEAR-OLD ACTUALLY DOES: mash every button twice,
// tap during transitions, and give the URL nonsense.
import { chromium } from 'playwright';
const PORT=process.argv[2]||'4177';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']});
const mk=async()=>{const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,hasTouch:true,isMobile:true});
  const errs=[]; p.on('console',m=>{if(m.type()!=='error')return;const t=m.text();
    if(/403|Forbidden|ERR_(FAILED|BLOCKED)|swiftshader|GroupMarker/.test(t))return;errs.push(t.slice(0,180));});
  p.on('pageerror',e=>errs.push('PAGEERROR '+String(e.stack||e).slice(0,260)));
  await p.route('**/functions/v1/ingest-events',r=>r.fulfill({status:200,body:'{}'}));
  await p.addInitScript(()=>{try{localStorage.setItem('voidPlayed','1');localStorage.setItem('voidTut','1');
    localStorage.setItem('voidDailyLast',new Date().toDateString());}catch{}});
  return {p,errs};};
const boot=async(p,q='')=>{await p.goto(`http://127.0.0.1:${PORT}/${q}`,{waitUntil:'domcontentloaded',timeout:300000});
  await p.waitForFunction(()=>!!window.__voidState,null,{timeout:400000}); await p.waitForTimeout(1500);};
const st=p=>p.evaluate(()=>({t:window.__matchState?.().t,r:window.__voidState?.().r,
  show:[...document.querySelectorAll('.show')].map(e=>e.id).filter(Boolean),
  menu:getComputedStyle(document.getElementById('menu')).display}));

// A — double-tap PLAY then double-tap a world card
{const {p,errs}=await mk(); await boot(p);
 await p.evaluate(async()=>{const b=document.getElementById('btnPlay');b.click();b.click();b.click();});
 await p.waitForTimeout(1300);
 await p.evaluate(async()=>{const c=document.querySelector('#worldRow .wCard[data-world="maple"]');
   c.click();c.click();c.click();});
 await p.waitForFunction(()=>(window.__matchState?.().t??0)>1,null,{timeout:400000});
 await p.waitForTimeout(3000);
 const s=await st(p);
 const dbl=await p.evaluate(()=>({edibles:window.__edibles.length, scene:window.__scene.children.length,
   geos:window.__renderer.info.memory.geometries, canvases:document.querySelectorAll('canvas').length}));
 console.log('  A triple-tap PLAY + triple-tap world card: '+JSON.stringify(s)+' '+JSON.stringify(dbl));
 console.log('     errors: '+JSON.stringify([...new Set(errs)]));
 await p.close();}

// B — triple-tap PLAY AGAIN on the results screen
{const {p,errs}=await mk(); await boot(p,'?w=maple');
 await p.evaluate(()=>document.getElementById('btnPlay').click()); await p.waitForTimeout(1300);
 await p.evaluate(()=>document.querySelector('#worldRow .wCard[data-world="maple"]')?.click());
 await p.waitForFunction(()=>(window.__matchState?.().t??0)>0.2,null,{timeout:400000});
 await p.evaluate(()=>{window.__renderer.render=()=>{};});
 await p.evaluate(()=>window.__rushClock(0)); await p.waitForTimeout(8000);
 const base=await p.evaluate(()=>({geos:window.__renderer.info.memory.geometries,scene:window.__scene.children.length}));
 await p.evaluate(()=>{const a=document.getElementById('btnAgain');a.click();a.click();a.click();});
 await p.waitForTimeout(6000);
 const s=await st(p);
 const after=await p.evaluate(()=>({geos:window.__renderer.info.memory.geometries,scene:window.__scene.children.length,
   edibles:window.__edibles.length, canvases:document.querySelectorAll('canvas').length}));
 console.log('  B triple-tap PLAY AGAIN: '+JSON.stringify(s));
 console.log('     before '+JSON.stringify(base)+'  after '+JSON.stringify(after));
 console.log('     errors: '+JSON.stringify([...new Set(errs)]));
 // C — tap HOME immediately after PLAY AGAIN (transition race)
 await p.evaluate(()=>window.__rushClock(0)); await p.waitForTimeout(8000);
 await p.evaluate(async()=>{document.getElementById('btnAgain').click();
   await new Promise(r=>setTimeout(r,120)); document.getElementById('btnHome')?.click();});
 await p.waitForTimeout(6000);
 console.log('  C PLAY AGAIN then HOME 120ms later: '+JSON.stringify(await st(p)));
 await p.screenshot({path:'qa-out/_bug/race-again-home.png'});
 console.log('     errors: '+JSON.stringify([...new Set(errs)]));
 await p.close();}

// D — nonsense deep links
for(const q of ['?w=atlantis','?w=','?w=MAPLE','?utm_source=tiktok&w=lantern']){
 const {p,errs}=await mk();
 try{ await boot(p,q); }catch(e){ console.log('  D '+q+' BOOT FAILED '+String(e).slice(0,80)); await p.close(); continue; }
 const s=await p.evaluate(()=>({menu:getComputedStyle(document.getElementById('menu')).display,
   world:document.getElementById('btnWorlds')?.textContent.replace(/\s+/g,' ').trim().slice(0,40),
   t:window.__matchState?.().t}));
 console.log('  D '+q.padEnd(28)+JSON.stringify(s)+' errs='+JSON.stringify([...new Set(errs)]));
 await p.close();}

// E — mash the settings/pause rows 30x each from the menu
{const {p,errs}=await mk(); await boot(p);
 const r=await p.evaluate(async()=>{document.getElementById('btnSettings').click();
   await new Promise(r=>setTimeout(r,500)); const out={};
   for(const id of ['setSound','setHaptics','setMotion','setStats']){
     for(let i=0;i<31;i++) document.getElementById(id).click();
     await new Promise(r=>setTimeout(r,200));
     out[id]=document.getElementById(id).querySelector('b')?.textContent;}
   out.showing=[...document.querySelectorAll('.show')].map(e=>e.id).filter(Boolean);
   return out;});
 console.log('  E mash settings 31x each: '+JSON.stringify(r));
 console.log('     errors: '+JSON.stringify([...new Set(errs)]));
 await p.close();}
await b.close();
