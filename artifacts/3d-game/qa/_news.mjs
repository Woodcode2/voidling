import { chromium } from 'playwright';
const WORLD=process.argv[2]||'maple';
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium',
  args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader'] });
const p = await b.newPage({ viewport:{width:430,height:932}, deviceScaleFactor:3 });
await p.route('**/functions/v1/ingest-events', r=>r.fulfill({status:200,body:'{}'}));
await p.addInitScript(()=>{try{localStorage.setItem('voidPlayed','1');localStorage.setItem('voidTut','1');
  localStorage.setItem('voidDailyLast',new Date().toDateString());}catch{}});
await p.goto(`http://127.0.0.1:4177/?w=${WORLD}`,{waitUntil:'domcontentloaded',timeout:300000});
await p.waitForFunction(()=>!!window.__voidState,null,{timeout:400000});
await p.evaluate(()=>document.querySelectorAll('.show').forEach(e=>{if(['daily','gift'].includes(e.id))e.classList.remove('show')}));
await p.click('#btnPlay'); await p.waitForTimeout(1400);
await p.click(`#worldRow .wCard[data-world="${WORLD}"]`);
await p.waitForFunction(()=>(window.__matchState?.().t??0)>3,null,{timeout:600000});
for (const [label,r] of [['tier0',1.2],['tier1',6],['tier2',11]]) {
  await p.evaluate(rr=>window.__setVoidR(rr), r);
  await p.waitForTimeout(900);
  const lines=[];
  for (let i=0;i<7;i++){
    await p.evaluate(()=>window.__news());
    await p.waitForTimeout(260);
    // the card is `<i>BRAND</i>headline` — the headline is a bare TEXT NODE, so
    // reading n.children gives you the masthead and nothing else. Ask for the
    // line itself, which is the only part anybody is judging.
    const t = await p.evaluate(()=>{ const n=document.getElementById('news'); if(!n) return null;
      const brand=(n.querySelector('i')?.textContent||'').trim();
      return { cls:n.className, brand,
        head:(n.textContent||'').trim().slice(brand.length).trim() }; });
    if(t && !lines.some(l=>l.head===t.head)) lines.push(t);
  }
  const tense = await p.evaluate(()=>window.__matchState().tense.toFixed(2));
  console.log(`\n===== ${WORLD.toUpperCase()} ${label}  tense=${tense} =====`);
  for(const l of lines) console.log('  '+l.brand.padEnd(20)+' '+l.head);
  await p.evaluate(()=>window.__news());
  await p.waitForTimeout(500);
  await p.screenshot({ path:`qa-out/news-${WORLD}-${label}.png`, clip:{x:0,y:60,width:430,height:230} });
}
await b.close();
