// What is actually on the menu for a LATE void, per world. Bucketed by radius
// AND by score, because a big prop that scores like a bin is not a finale.
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium',
  args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader'] });
for (const wid of (process.argv[2]||'maple,pirate,gameday,lantern,powder,skylark').split(',')) {
  const p = await b.newPage({ viewport:{width:430,height:932}, deviceScaleFactor:1 });
  await p.route('**/functions/v1/ingest-events', r=>r.fulfill({status:200,body:'{}'}));
  await p.addInitScript(()=>{try{localStorage.setItem('voidPlayed','1');localStorage.setItem('voidTut','1');
    localStorage.setItem('voidDailyLast',new Date().toDateString());}catch{}});
  await p.goto(`http://127.0.0.1:4177/?w=${wid}`,{waitUntil:'domcontentloaded',timeout:300000});
  await p.waitForFunction(()=>!!window.__voidState,null,{timeout:400000});
  const r = await p.evaluate(() => {
    const B = [0,1,2,3,4,5,6,7,8,10,99];
    const n = new Array(B.length-1).fill(0);
    let biggest = [];
    for (const e of window.__edibles) {
      const R = e.radius || 0;
      for (let i=0;i<B.length-1;i++) if (R>=B[i] && R<B[i+1]) { n[i]++; break; }
      if (R >= 4) biggest.push({ r:+R.toFixed(1), qk: e.mesh?.userData?.qk || '' });
    }
    biggest.sort((a,b2)=>b2.r-a.r);
    return { n, B, total: window.__edibles.length, biggest: biggest.slice(0,8),
      big4: biggest.length };
  });
  const lab = r.B.slice(0,-1).map((v,i)=>`${v}-${r.B[i+1]===99?'+':r.B[i+1]}`);
  console.log(`\n══ ${wid.toUpperCase()} ══  ${r.total} edibles`);
  console.log('   ' + lab.map((l,i)=>`${l}:${r.n[i]}`).join('  '));
  console.log(`   radius >= 4 : ${r.big4}  (${(r.big4/r.total*100).toFixed(1)}% of the world)`);
  console.log('   the biggest things a WORLD ENDER can eat: ' + r.biggest.map(x=>`${x.r}${x.qk?'('+x.qk+')':''}`).join(', '));
  await p.close();
}
await b.close();
