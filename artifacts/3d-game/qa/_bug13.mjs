// _bug13 — is the PLAY AGAIN -> HOME race reachable by a real FINGER? Measures
// how long #btnHome stays hit-testable after PLAY AGAIN is tapped, then does it
// with real touch taps at that delay.
import { chromium } from 'playwright';
const PORT=process.argv[2]||'4177';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']});
const p=await b.newPage({viewport:{width:430,height:932},deviceScaleFactor:1,hasTouch:true,isMobile:true});
await p.route('**/functions/v1/ingest-events',r=>r.fulfill({status:200,body:'{}'}));
await p.addInitScript(()=>{try{localStorage.setItem('voidPlayed','1');localStorage.setItem('voidTut','1');
  localStorage.setItem('voidDailyLast',new Date().toDateString());}catch{}});
await p.goto(`http://127.0.0.1:${PORT}/?w=maple`,{waitUntil:'domcontentloaded',timeout:300000});
await p.waitForFunction(()=>!!window.__voidState,null,{timeout:400000}); await p.waitForTimeout(1500);
await p.evaluate(()=>document.getElementById('btnPlay').click()); await p.waitForTimeout(1300);
await p.evaluate(()=>document.querySelector('#worldRow .wCard[data-world="maple"]')?.click());
await p.waitForFunction(()=>(window.__matchState?.().t??0)>0.2,null,{timeout:400000});
await p.evaluate(()=>{window.__renderer.render=()=>{};});
await p.evaluate(()=>window.__rushClock(0)); await p.waitForTimeout(9000);
const trace=await p.evaluate(async()=>{
  const home=document.getElementById('btnHome'); const r0=home.getBoundingClientRect();
  const pt=[r0.left+r0.width/2, r0.top+r0.height/2];
  const rows=[]; const t0=performance.now();
  document.getElementById('btnAgain').click();
  for(let i=0;i<40;i++){ await new Promise(r=>requestAnimationFrame(r));
    const hit=document.elementFromPoint(pt[0],pt[1]);
    rows.push({ms:Math.round(performance.now()-t0), hit:hit? (hit.id||hit.className||hit.tagName):'none',
      endShown:document.getElementById('end').classList.contains('show')});
    if(!rows[rows.length-1].endShown && rows.length>3) break;}
  return {pt:pt.map(Math.round), rows};});
console.log('  btnHome centre '+JSON.stringify(trace.pt));
const first = trace.rows.find(r=>!r.endShown);
console.log('  #end hidden at: '+(first?first.ms+'ms':'STILL SHOWN after '+trace.rows[trace.rows.length-1].ms+'ms'));
console.log('  hit-test at btnHome over time: '+JSON.stringify(trace.rows.slice(0,10)));
await b.close();
