// _bug4 — THE TORTURE RUN. One page, driven adversarially, console watched
// throughout. Every step reports match state so a hang is visible as a clock
// that stopped moving in MATCH time.
import { chromium } from 'playwright';
const PORT = process.argv[2] || '4177';
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium',
  args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']});
const p = await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,hasTouch:true,isMobile:true});
const log = [];
let phase = 'boot';
p.on('console', m => { if (m.type()!=='error' && m.type()!=='warning') return;
  const t=m.text(); if (/403|Forbidden|ERR_(FAILED|BLOCKED)|swiftshader|GroupMarkerNotSet/.test(t)) return;
  log.push(`[${phase}] ${m.type().toUpperCase()} ${t.slice(0,220)}`); });
p.on('pageerror', e => log.push(`[${phase}] PAGEERROR ${String(e.stack||e).slice(0,400)}`));
p.on('requestfailed', r => { const u=r.url(); if (/\/assets\/(hf|hf3d)\//.test(u)) return;
  log.push(`[${phase}] REQFAIL ${u.slice(0,140)}`); });
await p.route('**/functions/v1/ingest-events', r=>r.fulfill({status:200,body:'{}'}));
await p.addInitScript(()=>{try{localStorage.setItem('voidPlayed','1');localStorage.setItem('voidTut','1');
  localStorage.setItem('voidDailyLast',new Date().toDateString());}catch{}
  window.__unhandled=[]; addEventListener('unhandledrejection',e=>window.__unhandled.push(String(e.reason).slice(0,200)));});
await p.goto(`http://127.0.0.1:${PORT}/`,{waitUntil:'domcontentloaded',timeout:300000});
await p.waitForFunction(()=>!!window.__voidState,null,{timeout:400000});
await p.waitForTimeout(1500);
const R=[]; const say=(k,v)=>{R.push(`  ${k.padEnd(38)} ${v}`); console.log(`  ${k.padEnd(38)} ${v}`);};
const st = () => p.evaluate(()=>{ const m=window.__matchState?.(); const v=window.__voidState?.();
  return {t:m?.t, score:m?.score, r:v?.r, over:m?.over, showing:[...document.querySelectorAll('.show')].map(e=>e.id||e.className).filter(Boolean),
    menu:getComputedStyle(document.getElementById('menu')).display}; });
// helper: advance MATCH time by dt while driving toward food
const drive = () => p.evaluate(()=>{ if(window.__driving) return; window.__driving=1;
  const cv=document.querySelector('canvas'); const cx=innerWidth/2, cy=innerHeight/2;
  cv.dispatchEvent(new PointerEvent('pointerdown',{pointerId:1,clientX:cx,clientY:cy,bubbles:true}));
  const tick=()=>{ const vs=window.__voidState(); let best=null,bd=1e9;
    for(const e of window.__edibles){ if(e.eaten||!e.mesh?.visible||e.radius>vs.r*0.92) continue;
      const dx=e.mesh.position.x-vs.x, dz=e.mesh.position.z-vs.z; const d=dx*dx+dz*dz;
      if(d<bd){bd=d;best={dx,dz};}}
    if(best){const m=Math.hypot(best.dx,best.dz)||1;
      dispatchEvent(new PointerEvent('pointermove',{pointerId:1,clientX:cx+best.dx/m*110,clientY:cy+best.dz/m*110,bubbles:true}));}
    requestAnimationFrame(tick);}; requestAnimationFrame(tick);});
const untilT = async (target) => { try {
  await p.waitForFunction(t=>(window.__matchState?.().t??0)>t, target, {timeout:400000}); return true;
} catch { return false; } };

// ── M1: start from menu, play, watch for stalls ─────────────────────────────
phase='m1-start';
await p.evaluate(()=>document.getElementById('btnPlay').click()); await p.waitForTimeout(1400);
await p.evaluate(()=>document.querySelector('#worldRow .wCard[data-world="maple"]')?.click());
if(!await untilT(0.2)) say('M1 never started','TIMEOUT');
await p.evaluate(()=>{window.__renderer.render=()=>{};});
await drive();
phase='m1-play'; await untilT(25); say('M1 @t25', JSON.stringify(await st()));

// ── resize storm mid-match ──────────────────────────────────────────────────
phase='resize';
for (const [w,h] of [[320,568],[844,390],[768,1024],[390,844]]) {
  await p.setViewportSize({width:w,height:h}); await p.waitForTimeout(700);
  const s = await p.evaluate(()=>{ const c=document.querySelector('canvas');
    return {cw:c.width,ch:c.height,sw:Math.round(c.getBoundingClientRect().width),
      sh:Math.round(c.getBoundingClientRect().height), dw:innerWidth, dh:innerHeight,
      scrollW:document.documentElement.scrollWidth, joy:!!document.getElementById('joy')}; });
  say(`resize ${w}x${h}`, JSON.stringify(s));
}
say('after resize storm', JSON.stringify(await st()));

// ── background / foreground ────────────────────────────────────────────────
phase='bg';
const bgres = await p.evaluate(async()=>{ const t0=window.__matchState().t;
  Object.defineProperty(document,'visibilityState',{value:'hidden',configurable:true});
  Object.defineProperty(document,'hidden',{value:true,configurable:true});
  document.dispatchEvent(new Event('visibilitychange'));
  dispatchEvent(new Event('blur'));
  await new Promise(r=>setTimeout(r,3000));
  const t1=window.__matchState().t;
  Object.defineProperty(document,'visibilityState',{value:'visible',configurable:true});
  Object.defineProperty(document,'hidden',{value:false,configurable:true});
  document.dispatchEvent(new Event('visibilitychange')); dispatchEvent(new Event('focus'));
  await new Promise(r=>setTimeout(r,1500));
  const t2=window.__matchState().t;
  return {hiddenDrift:+(t1-t0).toFixed(2), resumeAdv:+(t2-t1).toFixed(2),
    paused: document.getElementById('pause')?.classList.contains('show'),
    audio: window.__audio?.ctx?.state};});
say('backgrounded: match-time drift', JSON.stringify(bgres));

// ── pause sheet, every control ─────────────────────────────────────────────
phase='pause';
const pz = await p.evaluate(async()=>{ const o={};
  document.getElementById('btnQuit').click(); await new Promise(r=>setTimeout(r,600));
  o.opened=document.getElementById('pause').classList.contains('show');
  for(const id of ['pauseSound','pauseHaptics','pauseMotion']){
    const el=document.getElementById(id); el.click(); await new Promise(r=>setTimeout(r,200));
    o[id]=el.querySelector('b').textContent; el.click(); await new Promise(r=>setTimeout(r,200));
    o[id+'2']=el.querySelector('b').textContent;}
  document.getElementById('pauseResume').click(); await new Promise(r=>setTimeout(r,600));
  o.closed=!document.getElementById('pause').classList.contains('show');
  return o;});
say('pause sheet toggles', JSON.stringify(pz));

// ── joystick spam ──────────────────────────────────────────────────────────
phase='joyspam';
const before = await st();
await p.evaluate(async()=>{ const cv=document.querySelector('canvas');
  for(let i=0;i<400;i++){ const x=Math.random()*innerWidth,y=Math.random()*innerHeight;
    cv.dispatchEvent(new PointerEvent('pointerdown',{pointerId:2+i%3,clientX:x,clientY:y,bubbles:true}));
    dispatchEvent(new PointerEvent('pointermove',{pointerId:2+i%3,clientX:Math.random()*innerWidth,clientY:Math.random()*innerHeight,bubbles:true}));
    if(i%3===0) dispatchEvent(new PointerEvent('pointerup',{pointerId:2+i%3,clientX:x,clientY:y,bubbles:true}));
    if(i%40===0) await new Promise(r=>setTimeout(r,16));}
  // leave no stuck pointer
  for(let id=0;id<6;id++) dispatchEvent(new PointerEvent('pointerup',{pointerId:id,clientX:0,clientY:0,bubbles:true}));});
await p.waitForTimeout(1500);
say('after 400-event joystick spam', JSON.stringify(await st()));
say('  clock still moving', (await st()).t > before.t ? 'yes':'NO — STALLED');

// ── powers spam ────────────────────────────────────────────────────────────
phase='powers';
const pw = await p.evaluate(async()=>{ const o=[];
  for(let i=0;i<25;i++){ document.getElementById('pw1')?.click(); document.getElementById('pw3')?.click();
    await new Promise(r=>setTimeout(r,60)); }
  o.push({p1:document.getElementById('pw1')?.disabled, p3:document.getElementById('pw3')?.disabled});
  return o;});
say('powers spam', JSON.stringify(pw));

// ── WORLD ENDER + clock to zero ────────────────────────────────────────────
phase='ender';
await p.evaluate(()=>window.__setVoidR(40));
await p.waitForTimeout(2000);
say('at r=40', JSON.stringify(await st()));
phase='timeout';
await p.evaluate(()=>window.__rushClock(0));
await p.waitForTimeout(9000);
say('after clock->0', JSON.stringify(await st()));
await p.screenshot({path:'qa-out/_bug/torture-end1.png'});
const endInfo = await p.evaluate(()=>{ const e=document.getElementById('end');
  const r=e.getBoundingClientRect(); const again=document.getElementById('btnAgain').getBoundingClientRect();
  const home=document.getElementById('btnHome').getBoundingClientRect();
  return {shown:e.classList.contains('show'), scroll:e.scrollHeight, client:e.clientHeight,
    again:[Math.round(again.top),Math.round(again.bottom)], home:[Math.round(home.top),Math.round(home.bottom)], vh:innerHeight};});
say('results screen', JSON.stringify(endInfo));

// ── instant rematch x3 ─────────────────────────────────────────────────────
for (let i=2;i<=4;i++){
  phase='rematch'+i;
  await p.evaluate(()=>document.getElementById('btnAgain').click());
  const ok = await untilT(0.2);
  if(!ok){ say(`M${i} rematch`,'NEVER STARTED — HANG'); break; }
  await p.waitForTimeout(2500);
  const s = await st(); say(`M${i} started`, JSON.stringify(s));
  const cnt = await p.evaluate(()=>({edibles:window.__edibles.length,
    visible:window.__edibles.filter(e=>e.mesh?.visible).length,
    sceneKids:window.__scene.children.length,
    geos:window.__renderer.info.memory.geometries, texs:window.__renderer.info.memory.textures,
    calls:window.__renderer.info.render.calls, tris:window.__renderer.info.render.triangles}));
  say(`  M${i} scene`, JSON.stringify(cnt));
  await p.evaluate(()=>{window.__driving=0;}); await drive();
  await untilT(12);
  await p.evaluate(()=>window.__rushClock(0)); await p.waitForTimeout(8000);
  say(`  M${i} ended`, JSON.stringify(await st()));
}
// ── back to menu, switch worlds, play again ────────────────────────────────
phase='switch';
await p.evaluate(()=>document.getElementById('btnHome').click()); await p.waitForTimeout(2500);
say('home from results', JSON.stringify(await st()));
for (const w of ['pirate','gameday','lantern']){
  phase='world-'+w;
  await p.evaluate(()=>document.getElementById('btnWorlds').click()); await p.waitForTimeout(900);
  const clicked = await p.evaluate(w=>{const c=document.querySelector(`#worldRow .wCard[data-world="${w}"]`);
    if(!c) return 'no card'; const btn=c.querySelector('button')||c; btn.click(); return 'ok';}, w);
  if(clicked!=='ok'){ say(w,'CARD MISSING'); continue; }
  const ok = await untilT(0.2);
  if(!ok){ say(w,'NEVER STARTED — HANG'); await p.screenshot({path:`qa-out/_bug/hang-${w}.png`}); continue; }
  await p.evaluate(()=>{window.__renderer.render=()=>{};window.__driving=0;}); await drive();
  await untilT(20);
  const s = await st(); say(`${w} @t20`, JSON.stringify(s));
  const inf = await p.evaluate(()=>({calls:window.__renderer.info.render.calls,
    tris:window.__renderer.info.render.triangles, geos:window.__renderer.info.memory.geometries,
    texs:window.__renderer.info.memory.textures, edibles:window.__edibles.length}));
  say(`  ${w} render`, JSON.stringify(inf));
  await p.evaluate(()=>window.__rushClock(0)); await p.waitForTimeout(8000);
  await p.evaluate(()=>document.getElementById('btnHome').click()); await p.waitForTimeout(2200);
}
const unh = await p.evaluate(()=>window.__unhandled||[]);
await p.screenshot({path:'qa-out/_bug/torture-final.png'});
await b.close();
console.log('\n  ── CONSOLE / ERRORS ──');
if(!log.length) console.log('    (clean)');
[...new Set(log)].forEach(l=>console.log('    '+l));
console.log('  unhandled rejections: '+JSON.stringify(unh));
