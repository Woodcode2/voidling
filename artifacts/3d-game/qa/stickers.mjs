// EVERY STICKER HAS TO BE REACHABLE, AND FAILING TO PLACE ONE IS SILENT.
//
//   node qa/stickers.mjs [world]
//
// A curio is placed by rejection sampling: pick a point, keep it if it lands
// in the district the sticker's clue names. If it never does — because the
// district id is wrong, or the sampling box does not reach that part of the
// island — the placer gives up after its budget and the sticker simply never
// exists. Nothing throws, nothing logs, and a child hunts forever for a thing
// that is not there.
//
// Both failures happened on the first run. Four of Maple's twelve were missing:
// the sampling box was +/-130 units on an island that spans +/-290, so the
// strip, the lake shore and the woods could not be sampled at all; and
// 'water-tower' asked for district 'park', which is a BIOME id that
// MAPLE_DIST folds into 'fair' and is therefore never a district. So this
// counts them, every world, and prints where each one ended up.
import { chromium } from 'playwright';
const W = process.argv[2] || 'maple';
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium',
  args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader'] });
const p = await b.newPage({ viewport:{width:430,height:932} });
await p.route('**/functions/v1/ingest-events', r=>r.fulfill({status:200,body:'{}'}));
await p.addInitScript(()=>{try{localStorage.setItem('voidPlayed','1');localStorage.setItem('voidTut','1');
  localStorage.setItem('voidDailyLast',new Date().toDateString());localStorage.removeItem('voidStickers');}catch{}});
p.on('pageerror', e => console.log('PAGE ERROR:', e.message));
await p.goto(`http://127.0.0.1:4177/?w=${W}`,{waitUntil:'domcontentloaded',timeout:300000});
await p.waitForFunction(()=>!!window.__voidState,null,{timeout:400000});
await p.evaluate(()=>document.querySelectorAll('.show').forEach(e=>{if(['daily','gift'].includes(e.id))e.classList.remove('show')}));
await p.click('#btnPlay'); await p.waitForTimeout(1400);
await p.click(`#worldRow .wCard[data-world="${W}"]`);
await p.waitForFunction(()=>(window.__matchState?.().t??0)>4,null,{timeout:600000});
const r = await p.evaluate(()=>{
  const out=[];
  for (const e of window.__edibles) {
    const id = e.mesh?.userData?.sticker;
    if (id) out.push({ id, r:+e.radius.toFixed(2), x:+e.mesh.position.x.toFixed(1), z:+e.mesh.position.z.toFixed(1),
      biome:String(window.__biomeAt(e.mesh.position.x, e.mesh.position.z)) });
  }
  return out;
});
console.log(`${W}: ${r.length} curios placed`);
for (const c of r) console.log(`  ${c.id.padEnd(18)} r=${String(c.r).padStart(5)}  (${String(c.x).padStart(7)},${String(c.z).padStart(7)})  biome=${c.biome}`);
await b.close();
