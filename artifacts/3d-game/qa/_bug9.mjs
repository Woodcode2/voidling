// _bug9 — LANDSCAPE + the in-match HUD at 320, and the cold tutorial card.
import { chromium } from 'playwright';
const PORT=process.argv[2]||'4177';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']});
const measure = async (p,tag)=>p.evaluate(tag=>{
  const vw=innerWidth,vh=innerHeight; const out={tag,vw,vh,off:[],small:[]};
  const vis=e=>{let a=e;while(a&&a!==document.body){const c=getComputedStyle(a);
    if(c.display==='none'||c.visibility==='hidden'||+c.opacity===0)return false;a=a.parentElement;}return true;};
  document.querySelectorAll('button,.wCard,.navCard,.setRow,#joy,#hunger,#news,#board,#timer,#coins,#powers,#growth,#quests,#hungerlbl').forEach(e=>{
    if(!vis(e))return; const r=e.getBoundingClientRect(); if(!r.width||!r.height)return;
    const id=(e.id||e.className)+'"'+(e.textContent||'').trim().slice(0,20)+'"';
    if(r.bottom>vh+1||r.top<-1||r.right>vw+1||r.left<-1) out.off.push(id+' '+[r.left,r.top,r.right,r.bottom].map(Math.round).join(','));
    if(e.tagName==='BUTTON'&&(r.width<44||r.height<44)) out.small.push(id+` ${Math.round(r.width)}x${Math.round(r.height)}`);});
  // do HUD elements overlap each other?
  const ids=['board','timer','coins','quests','growth','news','banner','hunger','hungerlbl','powers','btnQuit'];
  const rs=ids.map(i=>{const e=document.getElementById(i); if(!e||!vis(e))return null;const r=e.getBoundingClientRect();
    return r.width&&r.height?{i,r}:null;}).filter(Boolean);
  out.overlap=[]; for(let a=0;a<rs.length;a++)for(let c=a+1;c<rs.length;c++){
    const A=rs[a].r,B=rs[c].r; const ox=Math.min(A.right,B.right)-Math.max(A.left,B.left);
    const oy=Math.min(A.bottom,B.bottom)-Math.max(A.top,B.top);
    if(ox>4&&oy>4) out.overlap.push(`${rs[a].i}∩${rs[c].i} ${Math.round(ox)}x${Math.round(oy)}`);}
  return out;},tag);
for (const [W,H,nm] of [[568,320,'SE landscape'],[844,390,'iPhone 12 landscape'],[320,568,'SE portrait']]){
  const p=await b.newPage({viewport:{width:W,height:H},deviceScaleFactor:2,hasTouch:true,isMobile:true});
  await p.route('**/functions/v1/ingest-events',r=>r.fulfill({status:200,body:'{}'}));
  await p.addInitScript(()=>{try{localStorage.setItem('voidPlayed','1');localStorage.setItem('voidTut','1');
    localStorage.setItem('voidDailyLast',new Date().toDateString());}catch{}});
  await p.goto(`http://127.0.0.1:${PORT}/?w=maple`,{waitUntil:'domcontentloaded',timeout:300000});
  await p.waitForFunction(()=>!!window.__voidState,null,{timeout:400000}); await p.waitForTimeout(1600);
  console.log(`\n  === ${nm} ${W}x${H} — MENU ===`);
  const m=await measure(p,'menu'); console.log('   off: '+JSON.stringify(m.off)); console.log('   small: '+JSON.stringify(m.small));
  await p.screenshot({path:`qa-out/_bug/land-menu-${W}x${H}.png`});
  await p.evaluate(()=>document.getElementById('btnPlay').click()); await p.waitForTimeout(1300);
  console.log('   WORLDS panel off: '+JSON.stringify((await measure(p,'worlds')).off));
  await p.screenshot({path:`qa-out/_bug/land-worlds-${W}x${H}.png`});
  await p.evaluate(()=>document.querySelector('#worldRow .wCard[data-world="maple"]')?.click());
  await p.waitForFunction(()=>(window.__matchState?.().t??0)>0.2,null,{timeout:400000});
  await p.waitForTimeout(4000);
  const h=await measure(p,'hud');
  console.log('   HUD off: '+JSON.stringify(h.off));
  console.log('   HUD small buttons: '+JSON.stringify(h.small));
  console.log('   HUD overlaps: '+JSON.stringify(h.overlap));
  await p.screenshot({path:`qa-out/_bug/land-hud-${W}x${H}.png`});
  await p.close();
}
// cold tutorial
const p=await b.newPage({viewport:{width:320,height:568},deviceScaleFactor:2,hasTouch:true,isMobile:true});
await p.route('**/functions/v1/ingest-events',r=>r.fulfill({status:200,body:'{}'}));
await p.addInitScript(()=>{try{localStorage.setItem('voidPlayed','1');localStorage.removeItem('voidTut');
  localStorage.setItem('voidDailyLast',new Date().toDateString());}catch{}});
await p.goto(`http://127.0.0.1:${PORT}/?w=maple`,{waitUntil:'domcontentloaded',timeout:300000});
await p.waitForFunction(()=>!!window.__voidState,null,{timeout:400000}); await p.waitForTimeout(1600);
await p.evaluate(()=>document.getElementById('btnPlay').click()); await p.waitForTimeout(1300);
await p.evaluate(()=>document.querySelector('#worldRow .wCard[data-world="maple"]')?.click()); await p.waitForTimeout(1600);
console.log('\n  === TUTORIAL 320x568 ===');
console.log('   '+JSON.stringify(await p.evaluate(()=>{const t=document.getElementById('tut');const r=t.getBoundingClientRect();
  const g=document.getElementById('btnGotIt').getBoundingClientRect();
  return {shown:t.classList.contains('show'),scroll:t.scrollHeight,client:t.clientHeight,vh:innerHeight,
    gotIt:[Math.round(g.top),Math.round(g.bottom)], text:(t.textContent||'').replace(/\s+/g,' ').trim().slice(0,220)};})));
await p.screenshot({path:'qa-out/_bug/tut-320.png'});
await b.close();
