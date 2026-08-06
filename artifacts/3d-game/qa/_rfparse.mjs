// WARM COST: every pack URL fulfilled from LOCAL MEMORY (zero network delay),
// with a synthetic GLB the same shape as the real ones (40k tris + 1024² PNG,
// 4.4 MB). What remains is GLTF parse + texture decode + the shrinkTexture
// canvas pass — the bill an iOS bundled launch or a warm HTTP cache still pays
// on GAME DAY / LANTERN NIGHT, which place none of these meshes.
import { chromium } from 'playwright';
import fs from 'node:fs';
const PORT = process.argv[2] || 4177;
const WORLD = process.argv[3] || 'gameday';
const SERVE = process.argv[4] !== 'none';
const body = fs.readFileSync('/tmp/claude-0/-home-user-voidling/1f93d8f7-3ff2-5559-8b0b-a74b62b39437/scratchpad/fake.glb');
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--use-gl=angle','--use-angle=swiftshader','--no-sandbox'] });
const ctx = await b.newContext({ viewport:{width:390,height:844}, deviceScaleFactor:2, hasTouch:true, isMobile:true });
await ctx.addInitScript(() => {
  try { localStorage.setItem('voidPlayed','1'); localStorage.setItem('voidTut','1'); localStorage.setItem('voidAutoPlay','1'); } catch {}
  window.__barTrace = [];
  const iv = setInterval(() => {
    const p = document.getElementById('lPct'); if (!p) return;
    const v = p.textContent, last = window.__barTrace[window.__barTrace.length-1];
    if (!last || last.v !== v) window.__barTrace.push({ t: Math.round(performance.now()), v });
    if (v === '100%') clearInterval(iv);
  }, 20);
  window.__islandAt = null;
  Object.defineProperty(window, '__scene', { configurable:true,
    set(v){ window.__islandAt = performance.now(); Object.defineProperty(window,'__scene',{value:v,writable:true,configurable:true}); }, get(){ return undefined; } });
});
const p = await ctx.newPage();
await p.route('**/functions/v1/ingest-events',(r)=>r.fulfill({status:200,body:'{}'}));
let n=0;
await p.route('**/assets/hf3d/**', (r)=>{ n++; SERVE ? r.fulfill({status:200,headers:{'content-type':'model/gltf-binary'},body}) : r.fulfill({status:404,body:''}); });
await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`,{waitUntil:'commit'});
await p.waitForFunction(()=> (window.__barTrace||[]).some(e=>e.v==='100%'), null, { timeout: 400000 });
const r = await p.evaluate(()=>({ trace: window.__barTrace, islandAt: window.__islandAt }));
const hit = r.trace.find(e=>e.v==='100%');
const prev = r.trace[r.trace.indexOf(hit)-1];
console.log(JSON.stringify({ world:WORLD, servedRealPayload:SERVE, glbRequests:n,
  islandBuiltAtMs: Math.round(r.islandAt), gateReleasedAtMs: hit.t,
  packWaitAfterIslandMs: Math.round(hit.t - r.islandAt), barBeforeRelease: prev?prev.v:null }));
await b.close();
