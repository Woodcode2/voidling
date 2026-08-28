// THE COLOUR A/B THAT lookpair CANNOT DO.
// Game Day regenerates its layout every load (Math.random, not Maple's seeded
// stream), so two runs differ in world content and a colour judgement across
// them is confounded. This renders ONE frame, swaps only the crimson on the
// live materials, renders again, and restores — so the two PNGs differ by
// nothing but the colour. The restore is verified by re-render and hash.
import { chromium } from 'playwright';
import { createHash } from 'node:crypto';
import { readFileSync, mkdirSync } from 'node:fs';
const PORT = process.argv[2] || '4177';
const OUT = 'qa/out/redab'; mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox','--use-gl=angle','--use-angle=swiftshader'] });
const p = await b.newPage({ viewport:{width:430,height:932}, deviceScaleFactor:2 });
await p.route('**/functions/v1/ingest-events', r=>r.fulfill({status:200,body:'{}'}));
await p.addInitScript(()=>{try{
  localStorage.setItem('voidPlayed','1'); localStorage.setItem('voidTut','1');
  localStorage.setItem('voidDailyLast', new Date().toDateString());
  localStorage.setItem('voidUnlocked','maple,pirate,gameday,lantern,powder');
}catch{}});
await p.goto(`http://127.0.0.1:${PORT}/?w=gameday`, {waitUntil:'domcontentloaded', timeout:300000});
await p.waitForFunction(()=>!!window.__voidState, null, {timeout:400000});
await p.evaluate(()=>document.querySelectorAll('.show').forEach(e=>{
  if(['daily','gift'].includes(e.id)) e.classList.remove('show');}));
await p.evaluate(()=>document.getElementById('btnPlay')?.click());
await p.waitForTimeout(1400);
await p.evaluate(()=>document.querySelector('#worldRow .wCard[data-world="gameday"]')?.click());
await p.waitForFunction(()=>(window.__matchState?.().t??0)>0.2,null,{timeout:400000});
await p.evaluate(()=>{const cv=document.querySelector('canvas');
  cv.dispatchEvent(new PointerEvent('pointerdown',{pointerId:1,clientX:innerWidth/2,clientY:innerHeight/2,bubbles:true}));});
await p.waitForFunction(()=>(window.__matchState?.().t??0)>8,null,{timeout:600000});
await p.evaluate(()=>{const cv=document.querySelector('canvas');
  for(const el of Array.from(document.body.children)) if(el!==cv&&!el.contains(cv)) el.style.display='none';});
await p.evaluate(()=>window.__pinQuality(0));
await p.evaluate(()=>{window.__setMood?.('cruise'); window.__pinMouth?.(true); window.__calm?.();});
await p.waitForTimeout(800);
// freeze: stop the loop advancing so both renders are the SAME frame
const swap = async (target) => p.evaluate(({to}) => {
  const T = window.__THREE; const hits = [];
  window.__scene.traverse((o)=>{
    const mats = o.material ? (Array.isArray(o.material)?o.material:[o.material]) : [];
    for (const m of mats) {
      if (!m || !m.color) continue;
      const hex = m.color.getHex();
      if (hex === 0xc4453f || hex === 0xc4342f) { hits.push([m, hex]); m.color.setHex(to); }
      else if (hex === 0x92312d || hex === 0x922520) { hits.push([m, hex]); m.color.setHex(to === 0xc4342f ? 0x922520 : 0x92312d); }
    }
  });
  window.__redabRestore = hits;
  return hits.length;
}, {to: target});
const shot = async (tag) => { const path=`${OUT}/gameday_${tag}.png`; await p.screenshot({path});
  return [path, createHash('sha256').update(readFileSync(path)).digest('hex').slice(0,12)]; };
const [pA, hA] = await shot('after_ledger');           // the build as it now stands
const n = await swap(0xc4342f);                         // back to the shipped colour
const [pB, hB] = await shot('before_shipped');
const m = await swap(0xc4453f);                         // restore
const [pC, hC] = await shot('restore_check');
await b.close();
console.log(`  materials touched: ${n} (restore pass ${m})`);
console.log(`  ${pA}  ${hA}`);
console.log(`  ${pB}  ${hB}`);
console.log(`  restore ${hC === hA ? 'BIT-IDENTICAL to the first frame — the swap leaked nothing' : `DIFFERS (${hC} vs ${hA}) — DO NOT TRUST THIS PAIR`}`);
console.log(hC === hA && hA !== hB ? 'REDAB: PASS — one frame, one variable' : 'REDAB: FAIL');
process.exit(hC === hA && hA !== hB ? 0 : 1);
