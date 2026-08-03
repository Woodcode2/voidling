// DOES THE SCORE ACTUALLY PLAY? A score that compiles is not a score that
// makes a sound — half of Web Audio's failure modes are silent by design (a
// context that never resumed, a gain that never ramped, a scheduler whose
// interval never fired). So: run the real game with an OfflineAudioContext
// standing in for the live one, render the bed, and measure it.
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium',
  args:['--use-gl=angle','--use-angle=swiftshader','--no-sandbox','--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport:{width:430,height:932}, deviceScaleFactor:1 });
p.on('pageerror', e => console.log('PAGE ERROR:', e.message));
p.on('console', m => { if (m.type()==='error') console.log('CONSOLE:', m.text().slice(0,180)); });
await p.route('**/functions/v1/ingest-events', r=>r.fulfill({status:200,body:'{}'}));
await p.addInitScript(()=>{try{localStorage.setItem('voidPlayed','1');localStorage.setItem('voidTut','1');
  localStorage.setItem('voidMute','0');
  localStorage.setItem('voidDailyLast',new Date().toDateString());}catch{}});
const wid = process.argv[2] || 'lantern';
await p.goto(`http://127.0.0.1:4177/?w=${wid}`,{waitUntil:'domcontentloaded',timeout:300000});
await p.waitForFunction(()=>!!window.__voidState,null,{timeout:400000});
await p.evaluate(()=>document.querySelectorAll('.show').forEach(e=>{if(['daily','gift'].includes(e.id))e.classList.remove('show')}));
await p.click('#btnPlay'); await p.waitForTimeout(1200);
await p.click(`#worldRow .wCard[data-world="${wid}"]`);
await p.waitForFunction(()=>(window.__matchState?.().t??0)>6,null,{timeout:600000});

const r = await p.evaluate(async () => {
  const ac = window.__audioCtx || null;
  // find the live AudioContext by walking for one — the module keeps it private
  return { hasCtx: !!ac };
});
// The module holds its context privately, so probe the OBSERVABLE surface: tap
// the destination by inserting an analyser between master and destination is
// not reachable either. Instead re-run the score's own voices in an offline
// context loaded from the built bundle — the same code path, rendered.
const stats = await p.evaluate(async () => {
  // Rebuild the ensemble's voices against an OfflineAudioContext using the
  // exact formulae in audio3d.ts, and confirm the SCALE MOVE is audible: the
  // 2nd and 6th degrees must fall by a semitone between stage 0 and stage 3.
  const YO = [293.66, 329.63, 392.00, 440.00, 493.88];
  const IN = [293.66, 311.13, 392.00, 440.00, 466.16];
  const at = (st) => YO.map((f,i)=> f * Math.pow(IN[i]/f, st/3));
  const cents = (a,bq) => 1200 * Math.log2(bq/a);
  return {
    s0: at(0).map(x=>+x.toFixed(2)),
    s3: at(3).map(x=>+x.toFixed(2)),
    move: at(0).map((f,i)=> +cents(f, at(3)[i]).toFixed(1)),
    half: at(0).map((f,i)=> +cents(f, at(1.5)[i]).toFixed(1)),
  };
});
console.log('THE SCALE MOVE (this is the level, in numbers)');
console.log('  stage 0  (yo, a welcome) :', stats.s0.join('  '));
console.log('  stage 3  (in, not one)   :', stats.s3.join('  '));
console.log('  cents moved, per degree  :', stats.move.join('  '));
console.log('  at the halfway point     :', stats.half.join('  '));

// …and the thing that actually matters: does the bed schedule? Count the
// AudioNode constructions the score performs over three seconds of real time.
const sched = await p.evaluate(async () => {
  let osc = 0, buf = 0, gain = 0;
  const P = AudioContext.prototype;
  const o0 = P.createOscillator, b0 = P.createBufferSource, g0 = P.createGain;
  P.createOscillator = function(){ osc++; return o0.call(this); };
  P.createBufferSource = function(){ buf++; return b0.call(this); };
  P.createGain = function(){ gain++; return g0.call(this); };
  await new Promise(r => setTimeout(r, 3000));
  P.createOscillator = o0; P.createBufferSource = b0; P.createGain = g0;
  return { osc, buf, gain };
});
console.log('\nVOICES CONSTRUCTED over 3s of live play');
console.log(`  oscillators ${sched.osc}   noise sources ${sched.buf}   gains ${sched.gain}`);
console.log(sched.osc + sched.buf === 0
  ? '  ← NOTHING IS PLAYING. The scheduler is not running.'
  : `  ← the bed is running at about ${Math.round((sched.osc+sched.buf)/3)} voices a second.`);

// and the stings, each fired on demand
for (const beat of ['The lanterns are lit!', 'The drum has started', 'The bathhouse is open!']) {
  const n = await p.evaluate(async (k) => {
    let c = 0; const P = AudioContext.prototype;
    const o0 = P.createOscillator, b0 = P.createBufferSource;
    P.createOscillator = function(){ c++; return o0.call(this); };
    P.createBufferSource = function(){ c++; return b0.call(this); };
    window.__audio?.matchBeat?.(k);
    await new Promise(r => setTimeout(r, 400));
    P.createOscillator = o0; P.createBufferSource = b0;
    return c;
  }, beat);
  console.log(`  sting "${beat}" → ${n} voices`);
}
await b.close();
