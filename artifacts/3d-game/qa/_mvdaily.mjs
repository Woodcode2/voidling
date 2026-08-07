// The daily-reward sheet as a returning child actually gets it (last claim
// yesterday), not force-shown with an unrendered grid.
import { chromium } from 'playwright';
const PORT = process.argv[2] || '4237';
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium',
  args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader'] });
for (const [W,H,INS,L] of [[375,667,{top:20,bottom:0,left:0,right:0},'SE3'],
                           [375,812,{top:44,bottom:34,left:0,right:0},'13mini'],
                           [430,932,{top:59,bottom:34,left:0,right:0},'15PM']]) {
  const p = await b.newPage({ viewport:{width:W,height:H}, deviceScaleFactor:1, hasTouch:true, isMobile:true });
  const cdp = await p.context().newCDPSession(p);
  await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: INS });
  await p.route('**/functions/v1/ingest-events', r=>r.fulfill({status:200,body:'{}'}));
  await p.addInitScript(()=>{ try{
    localStorage.setItem('voidPlayed','1'); localStorage.setItem('voidTut','1');
    const y=new Date(Date.now()-864e5); localStorage.setItem('voidDailyLast', y.toDateString());
    localStorage.setItem('voidDailyStreak','3');
  }catch{} });
  await p.goto(`http://127.0.0.1:${PORT}/`, { waitUntil:'domcontentloaded', timeout:300000 });
  await p.waitForFunction(()=>!!window.__voidState,null,{timeout:400000});
  await p.evaluate(()=>{try{window.__renderer.render=()=>{};}catch{}});
  await p.waitForTimeout(2500);
  const r = await p.evaluate((insets)=>{
    const VW=innerWidth, VH=innerHeight, SB=VH-insets.bottom, ST=insets.top;
    const d=document.getElementById('daily'), card=d.querySelector('.dCard');
    const shown=d.classList.contains('show');
    const out=[];
    if(card) for(const el of [card,...card.querySelectorAll('*')]){
      const cs=getComputedStyle(el); if(cs.display==='none') continue;
      const bb=el.getBoundingClientRect(); if(bb.width<3||bb.height<3) continue;
      const A=bb.width*bb.height;
      const I=(l,t,r,bo)=>Math.max(0,Math.min(r,bb.right)-Math.max(l,bb.left))*Math.max(0,Math.min(bo,bb.bottom)-Math.max(t,bb.top));
      const off=1-I(0,0,VW,VH)/A;
      if(off>0.005||I(0,SB,VW,VH)/A>0.005||I(0,0,VW,ST)/A>0.005)
        out.push({sel:el.tagName.toLowerCase()+(el.id?'#'+el.id:'')+(typeof el.className==='string'&&el.className.trim()?'.'+el.className.trim().split(/\s+/)[0]:''),
          txt:(el.textContent||'').replace(/\s+/g,' ').trim().slice(0,26),
          x:Math.round(bb.x),y:Math.round(bb.y),w:Math.round(bb.width),h:Math.round(bb.height),
          off:Math.round(off*1000)/10});
    }
    const cr=card?card.getBoundingClientRect():null;
    return { shown, VW, VH, cells: d.querySelectorAll('#dailyGrid > *').length,
      cardH: cr?Math.round(cr.height):0, cardY: cr?Math.round(cr.top):0,
      cardScroll: card?card.scrollHeight-card.clientHeight:0,
      overflowY: card?getComputedStyle(card).overflowY:'', out };
  }, INS);
  console.log(`${L.padEnd(8)} ${W}x${H}  daily shown:${r.shown}  grid cells:${r.cells}  card ${r.cardH}px @y${r.cardY} (viewport ${r.VH})  card overflow-y:${r.overflowY} hidden:${r.cardScroll}px`);
  for(const e of r.out) console.log(`     off ${e.off}%  ${e.sel.padEnd(20)} @${e.x},${e.y} ${e.w}x${e.h}  "${e.txt}"`);
  await p.screenshot({ path:`qa-out/mv/daily-${L}.png` });
  await p.close();
}
await b.close();
