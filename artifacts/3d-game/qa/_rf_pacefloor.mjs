// REFUTE: "the last third is on rails — pace pinned at 1.2, every match ends at
// the same radius". The rhythm audit measured NINE runs of the SAME greedy
// optimal bot. That is one skill level. This probe runs FOUR skill levels
// against the same world and asks whether the growth law actually collapses
// them onto one curve.
//
// usage: node qa/_rf_pacefloor.mjs <world> <skills csv>
import { chromium } from 'playwright';
import fs from 'node:fs';

const WORLD = process.argv[2] || 'maple';
const SKILLS = (process.argv[3] || 'ace,kid,wander,idle').split(',');
const OUT = process.env.PF_OUT || `/tmp/pf-${WORLD}.json`;

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });

async function run(skill) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
  await p.goto(`http://127.0.0.1:4177/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.evaluate(() => document.querySelectorAll('.show').forEach(e => {
    if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
  await p.waitForFunction(() => { const b = document.getElementById('btnPlay');
    return b && !b.disabled && !/loading|…/i.test(b.textContent || ''); }, null, { timeout: 400000 });
  await p.click('#btnPlay', { force: true }); await p.waitForTimeout(1400);
  await p.click(`#worldRow .wCard[data-world="${WORLD}"]`, { force: true });
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout: 400000 });
  await p.evaluate(() => { window.__renderer.render = () => {}; });

  await p.evaluate((skill) => {
    const FORM_MIN = [0, 1.6, 2.5, 3.6, 5.5, 8.0];
    const FORMS = ['VOIDLING','MUNCHER','GOBBLER','DEVOURER','COLOSSUS','WORLD ENDER'];
    const formFor = r => { let s = 0; for (let i=0;i<FORM_MIN.length;i++) if (r>=FORM_MIN[i]) s=i; return s; };
    const samples = [], forms = [];
    window.__pf = { samples, forms, skill };
    let lastForm = 0;
    const iv = setInterval(() => {
      const ms = window.__matchState?.(); if (!ms) return;
      const t = ms.t;
      // the law, recomputed exactly as prototype3d.ts:3989-4014 does it
      const el2 = t, matchLen = 180, START_R = 0.9, LAW_RATE = 0.025;
      const surgeT = Math.max(0, el2 - matchLen*0.66) / Math.max(1, matchLen*0.34);
      const par = Math.max(1, 60*el2 + 1.6*el2*el2);
      const paceRaw = ms.score / par;
      const pace = Math.min(1.2, Math.max(0, paceRaw));
      const warm = Math.min(1, el2/25);
      const paceK = (1-warm) + warm*(0.60 + 0.40*pace);
      const lawCap = START_R + (0.022*Math.min(el2,30) + LAW_RATE*el2)*paceK
        + surgeT*surgeT*(2.8 + 2.6*pace);
      const floorRaw = START_R*(1 + Math.pow(ms.score/974, 0.57)) + surgeT*surgeT*2.6*pace;
      const scoreFloor = Math.min(lawCap, floorRaw);
      const f = formFor(ms.r);
      if (f > lastForm) { for (let k=lastForm+1;k<=f;k++) forms.push({ form: FORMS[k], t:+t.toFixed(2) }); lastForm = f; }
      samples.push({ t:+t.toFixed(2), r:+ms.r.toFixed(3), score: Math.round(ms.score),
        paceRaw:+paceRaw.toFixed(3), pace:+pace.toFixed(3), lawCap:+lawCap.toFixed(3),
        floor:+scoreFloor.toFixed(3), floorRaw:+floorRaw.toFixed(2),
        rivalTop: Math.round(Math.max(0, ...ms.rivals.map(r=>r.score))),
        rank: 1 + ms.rivals.filter(r=>r.joined && r.score > ms.score).length });
      if (document.getElementById('end')?.classList.contains('show')) clearInterval(iv);
    }, 400);

    const cv = document.querySelector('canvas');
    const cx = innerWidth/2, cy = innerHeight/2;
    if (skill === 'idle') return;              // hands off the glass entirely
    cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: cx, clientY: cy, bubbles: true }));
    const move = (dx, dy) => dispatchEvent(new PointerEvent('pointermove',
      { pointerId: 1, clientX: cx+dx, clientY: cy+dy, bubbles: true }));

    let hold = null, holdT = 0, restT = 0, ang = Math.random()*6.283;
    const tick = () => {
      const now = performance.now()/1000;
      const vs = window.__voidState();
      if (skill === 'ace') {
        let best = null, bd = 1e9;
        for (const e of window.__edibles) {
          if (e.eaten || !e.mesh?.visible || e.radius > vs.r*0.92) continue;
          const dx = e.mesh.position.x - vs.x, dz = e.mesh.position.z - vs.z;
          const d = dx*dx+dz*dz; if (d<bd) { bd=d; best={dx,dz}; }
        }
        if (best) { const m = Math.hypot(best.dx,best.dz)||1; move(best.dx/m*110, best.dz/m*110); }
      } else if (skill === 'kid') {
        // a real seven-year-old: picks something NEARBY that caught the eye —
        // not always the nearest, not always edible — commits to it for a
        // couple of seconds, steers at about two-thirds thumb, and stops to
        // look around now and then.
        if (restT > now) { move(0,0); }
        else {
          if (!hold || holdT < now) {
            const cands = [];
            for (const e of window.__edibles) {
              if (e.eaten || !e.mesh?.visible) continue;
              const dx = e.mesh.position.x - vs.x, dz = e.mesh.position.z - vs.z;
              const d = Math.hypot(dx,dz);
              if (d < 75) cands.push(e);
            }
            hold = cands.length ? cands[(Math.random()*cands.length)|0] : null;
            holdT = now + 1.5 + Math.random()*1.5;
            if (Math.random() < 0.14) restT = now + 0.6 + Math.random()*0.9;
          }
          if (hold && !hold.eaten) {
            const dx = hold.mesh.position.x - vs.x + (Math.random()-0.5)*8;
            const dz = hold.mesh.position.z - vs.z + (Math.random()-0.5)*8;
            const m = Math.hypot(dx,dz)||1; move(dx/m*62, dz/m*62);
          } else { hold = null; move(Math.cos(ang)*62, Math.sin(ang)*62); }
        }
      } else if (skill === 'wander') {
        if (holdT < now) { ang += (Math.random()-0.5)*3; holdT = now + 1.2 + Math.random()*1.6; }
        move(Math.cos(ang)*70, Math.sin(ang)*70);
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, skill);

  await p.waitForFunction(() => document.getElementById('end')?.classList.contains('show'),
    null, { timeout: 1800000 });
  const data = await p.evaluate(() => window.__pf);
  await p.close();
  return data;
}

const res = {};
for (const s of SKILLS) { res[s] = await run(s); console.error(`done ${s}`); }
fs.writeFileSync(OUT, JSON.stringify(res));

console.log(`\n${'='.repeat(96)}\n${WORLD.toUpperCase()}\n${'='.repeat(96)}`);
console.log('skill    finalScore  finalR   biggestForm      WORLD ENDER@   pace@60  pace@120  pace@175  rank');
for (const s of SKILLS) {
  const d = res[s]; const last = d.samples.at(-1);
  const at = t => d.samples.reduce((a,c)=>Math.abs(c.t-t)<Math.abs(a.t-t)?c:a, d.samples[0]);
  const we = d.forms.find(f=>f.form==='WORLD ENDER');
  console.log(`${s.padEnd(8)} ${String(last.score).padStart(10)} ${String(last.r).padStart(7)}  ${(d.forms.at(-1)?.form||'VOIDLING').padEnd(14)} ${(we?we.t.toFixed(1)+'s':'never').padStart(12)}  ${String(at(60).paceRaw).padStart(7)} ${String(at(120).paceRaw).padStart(9)} ${String(at(175).paceRaw).padStart(9)}  #${last.rank}`);
}
for (const s of SKILLS) {
  const d = res[s];
  console.log(`\n-- ${s} --  forms: ${d.forms.map(f=>`${f.form}@${f.t.toFixed(0)}s`).join('  ')}`);
  console.log('    t      r   lawCap  floor  bound     score   paceRaw');
  for (let t=0;t<=180;t+=15) {
    const c = d.samples.reduce((a,x)=>Math.abs(x.t-t)<Math.abs(a.t-t)?x:a, d.samples[0]);
    const bound = Math.abs(c.r-c.lawCap)<0.02 ? 'CAP' : Math.abs(c.r-c.floor)<0.02 ? 'floor' : 'free';
    console.log(`  ${String(c.t.toFixed(0)).padStart(4)} ${String(c.r).padStart(6)} ${String(c.lawCap).padStart(7)} ${String(c.floor).padStart(6)}  ${bound.padEnd(6)} ${String(c.score).padStart(8)}  ${String(c.paceRaw).padStart(8)}`);
  }
}
await b.close();
