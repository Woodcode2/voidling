// _bug8 — the money + meta surfaces: daily, gift, skin preview, buy, gate,
// restore, privacy. Driven at 320 (iPhone SE) with a real console watch.
import { chromium } from 'playwright';
const PORT=process.argv[2]||'4177'; const W=+(process.argv[3]||320),H=+(process.argv[4]||568);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']});
const p=await b.newPage({viewport:{width:W,height:H},deviceScaleFactor:2,hasTouch:true,isMobile:true});
const errs=[]; let ph='boot';
p.on('console',m=>{if(m.type()!=='error'&&m.type()!=='warning')return;const t=m.text();
  if(/403|Forbidden|ERR_(FAILED|BLOCKED)|swiftshader|GroupMarkerNotSet|THREE.Clock/.test(t))return;errs.push(`[${ph}] ${t.slice(0,200)}`);});
p.on('pageerror',e=>errs.push(`[${ph}] PAGEERROR ${String(e.stack||e).slice(0,300)}`));
await p.route('**/functions/v1/ingest-events',r=>r.fulfill({status:200,body:'{}'}));
// warm player, but daily NOT claimed today
await p.addInitScript(()=>{try{localStorage.setItem('voidPlayed','1');localStorage.setItem('voidTut','1');
  localStorage.removeItem('voidDailyLast');}catch{}});
await p.goto(`http://127.0.0.1:${PORT}/`,{waitUntil:'domcontentloaded',timeout:300000});
await p.waitForFunction(()=>!!window.__voidState,null,{timeout:400000});
await p.waitForTimeout(2200);
const geom=(id)=>p.evaluate(id=>{const e=document.getElementById(id);if(!e)return null;const r=e.getBoundingClientRect();
  const kids=[...e.querySelectorAll('button,input')].map(k=>{const b=k.getBoundingClientRect();
    return {id:k.id||k.className,t:(k.textContent||'').trim().slice(0,20),top:Math.round(b.top),bot:Math.round(b.bottom),w:Math.round(b.width),h:Math.round(b.height),
      offscreen:b.bottom>innerHeight+1||b.top<-1||b.right>innerWidth+1||b.left<-1};});
  return {shown:e.classList.contains('show'),scroll:e.scrollHeight,client:e.clientHeight,vh:innerHeight,kids};},id);
ph='daily';
console.log('  DAILY on boot: '+JSON.stringify(await geom('daily')));
await p.screenshot({path:'qa-out/_bug/m-daily.png'});
await p.evaluate(()=>document.getElementById('dailyClaim')?.click()); await p.waitForTimeout(1200);
console.log('  after CLAIM: '+JSON.stringify(await p.evaluate(()=>({daily:document.getElementById('daily').classList.contains('show'),
  coins:document.getElementById('coins').textContent}))));
await p.evaluate(()=>document.querySelectorAll('#daily.show,#gift.show').forEach(e=>e.classList.remove('show')));
ph='gift';
const g=await p.evaluate(()=>{const x=document.getElementById('gift');const cs=getComputedStyle(x);const r=x.getBoundingClientRect();
  return {display:cs.display,rect:[Math.round(r.left),Math.round(r.top),Math.round(r.width),Math.round(r.height)],
    offscreen:r.bottom>innerHeight+1||r.left<-1};});
console.log('  GIFT button: '+JSON.stringify(g));
await p.evaluate(()=>document.getElementById('gift').click()); await p.waitForTimeout(1200);
await p.screenshot({path:'qa-out/_bug/m-gift.png'});
console.log('  after GIFT tap, showing: '+JSON.stringify(await p.evaluate(()=>[...document.querySelectorAll('.show')].map(e=>e.id).filter(Boolean))));
await p.evaluate(()=>document.querySelectorAll('.show').forEach(e=>{if(e.id&&e.id!=='titlecard')e.classList.remove('show');}));
ph='shop';
await p.evaluate(()=>document.getElementById('btnShop').click()); await p.waitForTimeout(1200);
// tap a locked coin skin you cannot afford
const buy=await p.evaluate(async()=>{const c=[...document.querySelectorAll('.skCard.locked')][0];
  const nm=c.querySelector('.nm')?.textContent; c.click(); await new Promise(r=>setTimeout(r,900));
  const sp=document.getElementById('skinPrev');
  return {name:nm, prevShown:sp.classList.contains('show'), act:document.getElementById('spAct')?.textContent,
    tier:document.getElementById('spTier')?.textContent, coins:document.getElementById('coins').textContent};});
console.log('  tap locked coin skin: '+JSON.stringify(buy));
await p.screenshot({path:'qa-out/_bug/m-skinprev.png'});
console.log('  skinPrev geom: '+JSON.stringify(await geom('skinPrev')));
const buy2=await p.evaluate(async()=>{document.getElementById('spAct')?.click(); await new Promise(r=>setTimeout(r,900));
  return {showing:[...document.querySelectorAll('.show')].map(e=>e.id).filter(Boolean), coins:document.getElementById('coins').textContent,
    banner:document.getElementById('banner')?.textContent};});
console.log('  tap BUY with 0..few coins: '+JSON.stringify(buy2));
await p.evaluate(()=>document.getElementById('spClose')?.click()); await p.waitForTimeout(500);
ph='iap';
const iap=await p.evaluate(async()=>{const c=[...document.querySelectorAll('.skCard.legend')][0];
  c?.click(); await new Promise(r=>setTimeout(r,900));
  const out={prev:document.getElementById('skinPrev').classList.contains('show'),act:document.getElementById('spAct')?.textContent};
  document.getElementById('spAct')?.click(); await new Promise(r=>setTimeout(r,1200));
  out.after=[...document.querySelectorAll('.show')].map(e=>e.id).filter(Boolean);
  out.gate=document.getElementById('gate').classList.contains('show');
  out.sum=document.getElementById('gateSum')?.textContent;
  return out;});
console.log('  tap a $2.99 LEGENDARY: '+JSON.stringify(iap));
await p.screenshot({path:'qa-out/_bug/m-gate.png'});
console.log('  gate geom: '+JSON.stringify(await geom('gate')));
// wrong answer then right answer
const gt=await p.evaluate(async()=>{const i=document.getElementById('gateIn');
  i.value='3'; document.getElementById('gateGo').click(); await new Promise(r=>setTimeout(r,500));
  const err=document.getElementById('gateErr').textContent;
  const [a,b]=(document.getElementById('gateSum').textContent||'').split('×').map(s=>parseInt(s));
  i.value=String(a*b); document.getElementById('gateGo').click(); await new Promise(r=>setTimeout(r,1500));
  return {err, gateStillUp:document.getElementById('gate').classList.contains('show'),
    showing:[...document.querySelectorAll('.show')].map(e=>e.id).filter(Boolean),
    banner:document.getElementById('banner')?.textContent};});
console.log('  gate wrong->right: '+JSON.stringify(gt));
await p.screenshot({path:'qa-out/_bug/m-afterbuy.png'});
ph='restore';
await p.evaluate(()=>document.querySelectorAll('.show').forEach(e=>{if(e.id&&!['titlecard','shop'].includes(e.id))e.classList.remove('show');}));
const rst=await p.evaluate(async()=>{document.getElementById('btnRestore').click(); await new Promise(r=>setTimeout(r,1500));
  return {showing:[...document.querySelectorAll('.show')].map(e=>e.id).filter(Boolean), banner:document.getElementById('banner')?.textContent};});
console.log('  RESTORE PURCHASES: '+JSON.stringify(rst));
ph='privacy';
await p.evaluate(()=>document.querySelectorAll('.show').forEach(e=>{if(e.id&&e.id!=='titlecard')e.classList.remove('show');}));
await p.evaluate(()=>document.getElementById('btnSettings').click()); await p.waitForTimeout(700);
const pv=await p.evaluate(async()=>{document.getElementById('setPrivacy').click(); await new Promise(r=>setTimeout(r,1200));
  const f=document.getElementById('polFrame');
  return {gate:document.getElementById('gate').classList.contains('show'), policy:document.getElementById('policy').classList.contains('show'), src:f?.getAttribute('src')};});
console.log('  PRIVACY POLICY: '+JSON.stringify(pv));
await p.screenshot({path:'qa-out/_bug/m-policy.png'});
await b.close();
console.log('\n  errors: '+(errs.length?'':'(none)')); [...new Set(errs)].forEach(e=>console.log('    '+e));
