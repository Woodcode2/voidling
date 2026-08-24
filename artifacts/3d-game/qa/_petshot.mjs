// Photograph the two LEGENDARY body-part skins at play size, from the play
// camera. Rexling's snout and Drako's muzzle were seated on the belly.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const PORT = process.argv[2] || '4177';
const TAG = process.argv[3] || 'now';
const OUT = `qa/out/pets/${TAG}`;
mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox','--use-gl=angle','--use-angle=swiftshader'] });
const p = await b.newPage({ viewport:{width:430,height:932}, deviceScaleFactor:2 });
await p.route('**/functions/v1/ingest-events', r=>r.fulfill({status:200,body:'{}'}));
await p.addInitScript(()=>{ try{
  localStorage.setItem('voidPlayed','1'); localStorage.setItem('voidTut','1');
  localStorage.setItem('voidDailyLast', new Date().toDateString());
  localStorage.setItem('voidUnlocked','maple,pirate,gameday,lantern,powder');
}catch{} });
await p.goto(`http://127.0.0.1:${PORT}/?w=maple`,{waitUntil:'domcontentloaded',timeout:300000});
await p.waitForFunction(()=>!!window.__voidState,null,{timeout:400000});
await p.waitForSelector('#btnPlay',{state:'visible',timeout:400000});
await p.evaluate(()=>document.getElementById('btnPlay').click());
await p.waitForSelector('#worldRow .wCard[data-world="maple"]',{state:'visible',timeout:400000});
await p.evaluate(()=>document.querySelector('#worldRow .wCard[data-world="maple"]').click());
await p.waitForFunction(()=>(window.__matchState?.().t??0)>0.2,null,{timeout:400000});
await p.waitForTimeout(2500);
await p.evaluate(()=>{ window.__setVoidR(6); window.__setMood('cruise'); window.__pinMouth(true); });
await p.addStyleTag({content:'#timer,#board,#coins,#quests,#growth,#banner,#count,#news,#hungerlbl,#hunger,#joy,#joyNub,#powers,#evolve,#guide,#hand,#btnQuit,.vb,.vf,.vbN{opacity:0 !important}'});
await p.waitForTimeout(1500);
// the two LEGENDARY body-part skins, verbatim from palette.ts:257 and :262
const SKINS = {
  rexling: { id:'rexling', name:'Rexling', abyss:0x123018, inner:0x2f8038, mid:0x55b850, rim:0x8ef07a,
    glow:0xb8ff8a, acc:'dino', char:{ eyes:'fierce', aura:0xb8ff8a, auraKind:'bubbles', gloss:0.5,
    pattern:'scales', patCol:0x2a6a30, body:'snout' }, cash:2.99 },
  drako: { id:'drako', name:'Drako', abyss:0x0a2030, inner:0x14536a, mid:0x2394a8, rim:0x5ee8d8,
    glow:0xffb054, acc:'dragon', char:{ eyes:'fierce', aura:0xffb054, auraKind:'embers', gloss:0.9,
    pattern:'scales', patCol:0x1e6a7a, body:'muzzle' }, cash:2.99 },
};
for (const id of ['rexling','drako']) {
  await p.evaluate((sk)=>window.__setSkin(sk), SKINS[id]);
  await p.waitForTimeout(1400);
  const box = await p.evaluate(()=>{
    const THREE=window.__THREE, cam=window.__cam, g=window.__voidGroup();
    const c=new THREE.Vector3(); g.getWorldPosition(c);
    const q=c.clone().project(cam);
    const cx=(q.x*0.5+0.5)*innerWidth, cy=(-q.y*0.5+0.5)*innerHeight;
    const r=new THREE.Vector3(); cam.getWorldDirection(r);
    r.cross(cam.up).normalize().multiplyScalar(window.__voidState().r);
    const p1=c.clone().add(r).project(cam);
    const rx=Math.abs((p1.x*0.5+0.5)*innerWidth-cx)||70;
    return {x:Math.max(0,cx-rx*1.5),y:Math.max(0,cy-rx*1.5),width:Math.round(rx*3),height:Math.round(rx*3)};
  });
  await p.screenshot({ path:`${OUT}/${id}.png`, clip: box });
  console.log('  wrote', id+'.png');
}
await b.close();
