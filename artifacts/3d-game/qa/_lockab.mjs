// A/B the locked-card treatment: shipped filter vs candidate, same build,
// same frame. index.html:1248 is the only line that differs.
import { chromium } from 'playwright';
const PORT=process.argv[2]||'4188', OUT=process.argv[3], FILT=process.argv[4]||'saturate(0.62) brightness(0.85)';
const b=await chromium.launch({executablePath:process.env.CHROME_PATH||'/opt/pw-browsers/chromium',
  args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']});
const p=await b.newPage({viewport:{width:430,height:932},deviceScaleFactor:3});
await p.route('**/functions/v1/ingest-events', r=>r.fulfill({status:200,body:'{}'}));
await p.addInitScript(()=>{try{
  localStorage.setItem('voidPlayed','1');localStorage.setItem('voidTut','1');
  localStorage.setItem('voidDailyLast',new Date().toDateString());
  localStorage.setItem('voidUnlocked','maple,pirate');
  localStorage.setItem('voidBest_maple','8420');
}catch{}});
await p.goto(`http://127.0.0.1:${PORT}/`,{waitUntil:'domcontentloaded',timeout:300000});
await p.waitForFunction(()=>!!window.__voidState,null,{timeout:400000});
await p.waitForSelector('#btnPlay',{state:'visible',timeout:400000});
await p.evaluate(()=>document.getElementById('btnPlay').click());
await p.waitForSelector('#worldRow .wCard[data-world="maple"]',{state:'visible',timeout:400000});
await p.waitForTimeout(2500);
await p.evaluate((f)=>{const s=document.createElement('style');
  s.textContent=`#worlds .wCard.locked .wArt{filter:${f} !important}`;document.head.appendChild(s);},FILT);
await p.waitForTimeout(600);
await p.screenshot({path:`${OUT}/picker-candidate.png`, timeout:180000});
console.log('wrote picker-candidate.png with', FILT);
await b.close();
