// IS THE WORLD DETERMINISTIC? — measured AFTER the async props have landed.
//
// The first attempt at this fingerprinted window.__edibles as soon as the game
// was ready and reported three different layouts, i.e. "the world reseeds".
// That was the probe, not the game: glb() registers every model-backed prop
// inside template(url).then(...), so those edibles appear whenever the network
// resolves — and in this sandbox the asset CDN is blocked, so each one falls
// back after a failed round trip at a time that varies per run. Snapshotting
// early counts a different number of them every time.
//
// So: wait until the edible count has been STABLE for two seconds before
// taking the fingerprint. Anything still varying after that is the world.
import { chromium } from 'playwright';
const WORLD = process.argv[2] || 'maple';
const RUNS = +(process.argv[3] || 3);
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium',
  args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader'] });
const out = [];
for (let k = 0; k < RUNS; k++) {
  const p = await b.newPage({ viewport:{width:430,height:932}, deviceScaleFactor:1 });
  await p.route('**/functions/v1/ingest-events', r=>r.fulfill({status:200,body:'{}'}));
  await p.addInitScript(()=>{try{localStorage.setItem('voidPlayed','1');localStorage.setItem('voidTut','1');
    localStorage.setItem('voidDailyLast',new Date().toDateString());}catch{}});
  await p.goto(`http://127.0.0.1:4177/?w=${WORLD}`,{waitUntil:'domcontentloaded',timeout:300000});
  await p.waitForFunction(()=>!!window.__voidState,null,{timeout:400000});
  // settle: the count must not move for 2s
  await p.waitForFunction(() => {
    const n = window.__edibles.length;
    if (window.__lastN !== n) { window.__lastN = n; window.__stableSince = performance.now(); return false; }
    return performance.now() - (window.__stableSince || 0) > 2000;
  }, null, { timeout: 300000, polling: 250 });
  const r = await p.evaluate(() => {
    let h = 2166136261;
    const keys = [];
    for (const e of window.__edibles) {
      const m = e.mesh; if (!m) continue;
      keys.push(`${Math.round(m.position.x*4)},${Math.round(m.position.z*4)},${Math.round((e.radius||0)*8)}`);
    }
    keys.sort();                       // order of async arrival must not matter
    for (const k2 of keys) for (let i = 0; i < k2.length; i++) { h ^= k2.charCodeAt(i); h = Math.imul(h,16777619); }
    const vs = window.__voidState();
    return { n: keys.length, hash: (h>>>0).toString(16), spawn: `${vs.x.toFixed(3)},${vs.z.toFixed(3)}` };
  });
  out.push(r);
  console.log(`run ${k+1}: ${r.n} props  hash ${r.hash}  spawn ${r.spawn}`);
  await p.close();
}
await b.close();
const u = (a)=>[...new Set(a)];
console.log(`\n${WORLD.toUpperCase()}: counts ${u(out.map(o=>o.n)).length===1?'IDENTICAL':'differ'}, layout ${u(out.map(o=>o.hash)).length===1?'IDENTICAL — deterministic':'DIFFERS — reseeds'}, spawn ${u(out.map(o=>o.spawn)).length===1?'identical':'differs'}`);
