import { chromium } from 'playwright';
const PORT='4177';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']});
const p=await b.newPage({viewport:{width:430,height:932},deviceScaleFactor:1});
await p.route('**/functions/v1/ingest-events',r=>r.fulfill({status:200,body:'{}'}));
await p.addInitScript(()=>{try{localStorage.setItem('voidPlayed','1');localStorage.setItem('voidTut','1');
localStorage.setItem('voidDailyLast',new Date().toDateString());
localStorage.setItem('voidUnlocked','maple,pirate,gameday,lantern,powder,skylark');}catch{}});
await p.goto(`http://127.0.0.1:${PORT}/?w=maple`,{waitUntil:'domcontentloaded',timeout:300000});
await p.waitForFunction(()=>!!window.__voidState,null,{timeout:400000});
await p.waitForSelector('#btnPlay',{state:'visible',timeout:400000});
await p.evaluate(()=>document.getElementById('btnPlay').click());
await p.waitForSelector('#worldRow .wCard[data-world="maple"]',{state:'visible',timeout:400000});
await p.evaluate(()=>document.querySelector('#worldRow .wCard[data-world="maple"]').click());
await p.waitForFunction(()=>(window.__matchState?.().t??0)>0.2,null,{timeout:400000});
await p.waitForTimeout(2000);
const S={ id:'drako', name:'Drako', abyss:0x0a2030, inner:0x14536a, mid:0x2394a8, rim:0x5ee8d8,
  glow:0xffb054, acc:'dragon', char:{ eyes:'fierce', aura:0xffb054, auraKind:'embers', gloss:0.9,
  pattern:'scales', patCol:0x1e6a7a, body:'muzzle' }, cash:2.99 };
await p.evaluate((sk)=>window.__setSkin(sk), S);
await p.waitForTimeout(1200);
console.log(JSON.stringify(await p.evaluate(()=>{
  const g=window.__voidGroup(); const out=[];
  g.traverse(o=>{ if(o.name==='dress'){ for(const c of o.children)
    out.push({type:c.type, visible:c.visible, kids:c.children.length,
      pos:[+c.position.x.toFixed(2),+c.position.y.toFixed(2),+c.position.z.toFixed(2)]}); } });
  return { dressChildren: out, dressFound: out.length>0 };
}),null,1));
await b.close();
