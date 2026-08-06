import { chromium } from 'playwright';
const PORT = process.argv[2] || '4177'; const W=+(process.argv[3]||320), H=+(process.argv[4]||568);
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium', args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']});
const p = await b.newPage({viewport:{width:W,height:H},deviceScaleFactor:2,hasTouch:true,isMobile:true});
await p.route('**/functions/v1/ingest-events', r=>r.fulfill({status:200,body:'{}'}));
await p.addInitScript(()=>{try{localStorage.setItem('voidPlayed','1');localStorage.setItem('voidTut','1');localStorage.setItem('voidDailyLast',new Date().toDateString());}catch{}});
await p.goto(`http://127.0.0.1:${PORT}/`,{waitUntil:'domcontentloaded',timeout:300000});
await p.waitForFunction(()=>!!window.__voidState,null,{timeout:400000});
await p.waitForTimeout(1500);
await p.evaluate(()=>document.getElementById('btnShop').click()); await p.waitForTimeout(1200);
const shop = await p.evaluate(()=>{
  const s=document.getElementById('shop');
  const walk=[]; const rec=(e,d)=>{const r=e.getBoundingClientRect();
    if(r.height>0) walk.push({d, tag:e.tagName+(e.id?'#'+e.id:'')+(e.className&&typeof e.className==='string'?'.'+e.className.split(' ').join('.'):''),
      top:Math.round(r.top),h:Math.round(r.height), txt:(e.textContent||'').trim().slice(0,40)});
    if(d<3) [...e.children].forEach(c=>rec(c,d+1));};
  rec(s,0); return {walk, scroll:s.scrollHeight, client:s.clientHeight};
});
console.log('SHOP DOM @'+W); shop.walk.forEach(w=>console.log('  '.repeat(w.d)+`top=${w.top} h=${w.h} ${w.tag} "${w.txt}"`));
console.log('scrollHeight',shop.scroll,'client',shop.client);
// world card art
await p.evaluate(()=>{document.getElementById('btnBack')?.click();}); await p.waitForTimeout(600);
await p.evaluate(()=>document.getElementById('btnWorlds').click()); await p.waitForTimeout(1200);
const wc = await p.evaluate(()=>[...document.querySelectorAll('#worldRow .wCard')].map(c=>{
  const cs=getComputedStyle(c); const img=c.querySelector('img');
  const inner=[...c.querySelectorAll('*')].map(e=>({t:e.tagName,bg:getComputedStyle(e).backgroundImage.slice(0,120)})).filter(x=>x.bg!=='none');
  return {w:c.dataset.world, bg:cs.backgroundImage.slice(0,140), img: img?{src:img.src,nw:img.naturalWidth,complete:img.complete}:null, inner};}));
console.log('\nWORLD CARDS'); wc.forEach(c=>console.log(' ',JSON.stringify(c)));
await b.close();
