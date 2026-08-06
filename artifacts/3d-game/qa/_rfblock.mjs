// The honest, device-comparable number: MAIN-THREAD BLOCKING TIME spent on the
// pack. Long tasks after the island build, with the 33 pack URLs served a real
// GLB payload vs served nothing. The delta is pure GLTF parse + texture decode
// + shrinkTexture — CPU work, not swiftshader render time — and on GAME DAY /
// LANTERN NIGHT it buys zero placed meshes.
import { chromium } from 'playwright';
import fs from 'node:fs';
const PORT = process.argv[2] || 4177, WORLD = process.argv[3] || 'gameday', SERVE = process.argv[4] !== 'none';
const body = fs.readFileSync('/tmp/claude-0/-home-user-voidling/1f93d8f7-3ff2-5559-8b0b-a74b62b39437/scratchpad/fake.glb');
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--use-gl=angle','--use-angle=swiftshader','--no-sandbox'] });
const ctx = await b.newContext({ viewport:{width:390,height:844}, deviceScaleFactor:2, hasTouch:true, isMobile:true });
await ctx.addInitScript(() => {
  try { localStorage.setItem('voidPlayed','1'); localStorage.setItem('voidTut','1'); localStorage.setItem('voidAutoPlay','1'); } catch {}
  window.__lt = [];
  try { new PerformanceObserver((l)=>{ for (const e of l.getEntries()) window.__lt.push({s:e.startTime,d:e.duration}); }).observe({type:'longtask',buffered:true}); } catch {}
  window.__islandAt = null;
  Object.defineProperty(window,'__scene',{configurable:true,set(v){window.__islandAt=performance.now();Object.defineProperty(window,'__scene',{value:v,writable:true,configurable:true});},get(){return undefined;}});
  window.__packDone = null;
  window.__barTrace=[];
  const iv=setInterval(()=>{const p=document.getElementById('lPct');if(!p)return;const v=p.textContent;const l=window.__barTrace.at(-1);if(!l||l.v!==v)window.__barTrace.push({t:Math.round(performance.now()),v});if(v==='100%'){window.__packDone=performance.now();clearInterval(iv);} },20);
});
const p = await ctx.newPage();
await p.route('**/functions/v1/ingest-events',(r)=>r.fulfill({status:200,body:'{}'}));
await p.route('**/assets/hf3d/**',(r)=> SERVE ? r.fulfill({status:200,headers:{'content-type':'model/gltf-binary'},body}) : r.fulfill({status:404,body:''}));
await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`,{waitUntil:'commit'});
await p.waitForFunction(()=>window.__packDone!=null,null,{timeout:500000});
await p.waitForTimeout(2000);
const r = await p.evaluate(()=>({ lt: window.__lt, island: window.__islandAt, done: window.__packDone }));
const after = r.lt.filter(e=>e.s > r.island && e.s < r.done);
console.log(JSON.stringify({ world:WORLD, servedPayload:SERVE,
  islandMs: Math.round(r.island), packDoneMs: Math.round(r.done),
  longTasksAfterIsland: after.length,
  blockingMsAfterIsland: Math.round(after.reduce((a,e)=>a+e.d,0)),
  worstTaskMs: Math.round(Math.max(0,...after.map(e=>e.d))) }));
await b.close();
