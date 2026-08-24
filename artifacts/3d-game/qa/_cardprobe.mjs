// DOES THE WORLD'S NAME CARD ACTUALLY PLAY OVER THE ESTABLISHING SHOT?
// prototype3d.ts:1147 — "the world's name over a shot of the world's landmark".
// index.html:572 runs `cardFade 4.2s` on #titlecard.show: opacity 1 from 14%
// (0.59s) to 72% (3.02s) of the animation.
import { chromium } from 'playwright';
const PORT=process.argv[2]||'4188', W=process.argv[3]||'gameday';
const b=await chromium.launch({executablePath:process.env.CHROME_PATH||'/opt/pw-browsers/chromium',
  args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']});
const p=await b.newPage({viewport:{width:430,height:932},deviceScaleFactor:1,isMobile:true,hasTouch:true});
await p.route('**/functions/v1/ingest-events', r=>r.fulfill({status:200,body:'{}'}));
await p.addInitScript(([w])=>{try{
  localStorage.setItem('voidPlayed','1');localStorage.setItem('voidTut','1');
  localStorage.setItem('voidDailyLast',new Date().toDateString());
  localStorage.setItem('voidUnlocked','maple,pirate,gameday,lantern,powder');
  localStorage.setItem('voidWorld',w);localStorage.setItem('voidAutoPlay','1');
}catch{}},[W]);
await p.goto(`http://127.0.0.1:${PORT}/`,{waitUntil:'domcontentloaded',timeout:300000});
await p.waitForFunction(()=>!!window.__voidState,null,{timeout:400000});
await p.waitForFunction(()=>{const g=document.getElementById('tapGate');
  return (!!g&&g.classList.contains('show')&&g.classList.contains('armed'))
    ||(!!window.__matchState&&window.__matchState().t>0.2);},null,{timeout:400000});
// START SAMPLING BEFORE THE TAP — the card is armed inside beginMatch().
await p.evaluate(()=>{ window.__cardLog=[];
  const tc=document.getElementById('titlecard');
  const t0=performance.now();
  const id=setInterval(()=>{
    const o=parseFloat(getComputedStyle(tc).opacity);
    const t=window.__matchState? window.__matchState().t : -1;
    window.__cardLog.push([+( (performance.now()-t0)/1000 ).toFixed(2), +t.toFixed(2), +o.toFixed(3),
      tc.classList.contains('show'), (tc.querySelector('.name')||{}).textContent]);
    if(window.__cardLog.length>320) clearInterval(id);
  },50);});
if(await p.evaluate(()=>{const g=document.getElementById('tapGate');
  return !!g&&g.classList.contains('show')&&g.classList.contains('armed');}))
  await p.click('#tapGate',{force:true,timeout:60000}).catch(()=>{});
await p.waitForTimeout(16000);
const log=await p.evaluate(()=>window.__cardLog);
const shown=log.filter(r=>r[2]>0.5);
console.log(`world=${W}  samples=${log.length}  peak opacity=${Math.max(...log.map(r=>r[2])).toFixed(3)}`);
console.log(`  frames with opacity>0.5: ${shown.length}  (match t range ${shown.length?shown[0][1]+'..'+shown[shown.length-1][1]:'-'})`);
console.log('  name text seen:', [...new Set(log.map(r=>r[4]))].join(' | '));
console.log('  maxMatchT=', Math.max(...log.map(r=>r[1])).toFixed(2));
console.log('  samples with 0.4<matchT<4.0:');
for(const r of log.filter(r=>r[1]>0.4&&r[1]<4.0).slice(0,30)) console.log('   ', r.slice(0,4).join('  '));
await b.close();
