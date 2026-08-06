import { chromium } from 'playwright';
const PORT=process.argv[2]||'4177'; const W=+(process.argv[3]||768),H=+(process.argv[4]||1024);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']});
const p=await b.newPage({viewport:{width:W,height:H},deviceScaleFactor:1,hasTouch:true,isMobile:W<700});
await p.route('**/functions/v1/ingest-events',r=>r.fulfill({status:200,body:'{}'}));
await p.addInitScript(()=>{try{localStorage.setItem('voidPlayed','1');localStorage.setItem('voidTut','1');
  localStorage.setItem('voidDailyLast',new Date().toDateString());}catch{}});
await p.goto(`http://127.0.0.1:${PORT}/?w=maple`,{waitUntil:'domcontentloaded',timeout:300000});
await p.waitForFunction(()=>!!window.__voidState,null,{timeout:400000});
await p.waitForTimeout(1200);
// titlecard: does it block taps?
const tc = await p.evaluate(()=>{const t=document.getElementById('titlecard');const cs=getComputedStyle(t);
  const r=t.getBoundingClientRect();
  return {cls:t.className, opacity:cs.opacity, pe:cs.pointerEvents, display:cs.display, z:cs.zIndex,
    rect:[Math.round(r.left),Math.round(r.top),Math.round(r.width),Math.round(r.height)],
    elemAtCentre: (document.elementFromPoint(innerWidth/2, innerHeight/2)||{}).id};});
console.log('  TITLECARD on menu: '+JSON.stringify(tc));
// audio graph
const au = await p.evaluate(()=>{const a=window.__audio; return {present:!!a, keys:a?Object.keys(a).slice(0,14):null, ctx:a?.ctx?.state??null};});
console.log('  __audio: '+JSON.stringify(au));
// shop: coin balance visible?
await p.evaluate(()=>document.getElementById('btnShop').click()); await p.waitForTimeout(1000);
const sc = await p.evaluate(()=>{const c=document.getElementById('coins');const cs=getComputedStyle(c);const r=c.getBoundingClientRect();
  const shop=document.getElementById('shop');
  const inShop=[...shop.querySelectorAll('*')].some(e=>/^\s*✦\s*\d+\s*$/.test(e.textContent||''));
  return {coinsDisplay:cs.display,coinsOpacity:cs.opacity,coinsText:c.textContent,coinsRect:[Math.round(r.top),Math.round(r.left)],
    coinsZ:cs.zIndex, shopZ:getComputedStyle(shop).zIndex, balanceInsideShop:inShop,
    onTop:(document.elementFromPoint(r.left+r.width/2, r.top+r.height/2)||{}).id};});
console.log('  SHOP coin balance: '+JSON.stringify(sc));
await p.screenshot({path:`qa-out/_bug/shop-${W}.png`});
await p.evaluate(()=>document.getElementById('btnBack').click()); await p.waitForTimeout(700);
// end-of-match timing at this viewport
await p.evaluate(()=>document.getElementById('btnPlay').click()); await p.waitForTimeout(1400);
await p.evaluate(()=>document.querySelector('#worldRow .wCard[data-world="maple"]')?.click());
await p.waitForFunction(()=>(window.__matchState?.().t??0)>0.2,null,{timeout:400000});
await p.evaluate(()=>{window.__renderer.render=()=>{};});
await p.waitForFunction(()=>(window.__matchState?.().t??0)>6,null,{timeout:400000});
const t0=Date.now();
await p.evaluate(()=>window.__rushClock(0));
let appeared=null;
for(let i=0;i<60;i++){ await p.waitForTimeout(1000);
  const s=await p.evaluate(()=>({end:document.getElementById('end').classList.contains('show'),
    over:window.__matchState?.().over, t:window.__matchState?.().t}));
  if(s.end){appeared={sec:((Date.now()-t0)/1000).toFixed(1),...s};break;} }
console.log('  END PANEL after rushClock(0) @'+W+'x'+H+': '+JSON.stringify(appeared||'NEVER in 60s'));
await p.screenshot({path:`qa-out/_bug/end-${W}x${H}.png`});
if(appeared){ const m=await p.evaluate(()=>{const e=document.getElementById('end');
  const g=id=>{const x=document.getElementById(id);if(!x)return null;const r=x.getBoundingClientRect();return [Math.round(r.top),Math.round(r.bottom)];};
  return {vh:innerHeight,scroll:e.scrollHeight,client:e.clientHeight,again:g('btnAgain'),home:g('btnHome')};});
  console.log('  results geometry: '+JSON.stringify(m)); }
await b.close();
