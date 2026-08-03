// HUD LEGIBILITY, measured the way outlined text actually works.
//
// The first version of this compared a chrome box's MEAN luminance against the
// scene's, and on that metric the match timer scored 1.58:1 on Maple and looked
// like the worst element in the game. It is not: the timer carries a 3px hard
// text-stroke, added precisely to survive any ground, and a box mean cannot see
// an outline — it averages the white glyphs together with the scene showing
// through the gaps between them and reports the average of the two.
//
// What legibility depends on is the LOCAL step: a glyph pixel against the
// pixels touching it. So: shoot the frame with the overlay hidden and again
// with it shown, take the pixels that CHANGED as the chrome, and measure that
// chrome's own internal range. Text against its own backing, which is the
// thing the eye reads, and it is scene-independent by construction — which is
// the entire point of an outline.
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium',
  args:['--use-gl=angle','--use-angle=swiftshader','--no-sandbox'] });
for (const wid of (process.argv[2]||'lantern,maple,gameday').split(',')) {
  const p = await b.newPage({ viewport:{width:430,height:932}, deviceScaleFactor:2 });
  await p.route('**/functions/v1/ingest-events', r=>r.fulfill({status:200,body:'{}'}));
  await p.addInitScript(()=>{try{localStorage.setItem('voidPlayed','1');localStorage.setItem('voidTut','1');
    localStorage.setItem('voidDailyLast',new Date().toDateString());}catch{}});
  await p.goto(`http://127.0.0.1:4177/?w=${wid}`,{waitUntil:'domcontentloaded',timeout:300000});
  await p.waitForFunction(()=>!!window.__voidState,null,{timeout:400000});
  await p.evaluate(()=>document.querySelectorAll('.show').forEach(e=>{if(['daily','gift'].includes(e.id))e.classList.remove('show')}));
  await p.click('#btnPlay'); await p.waitForTimeout(1400);
  await p.click(`#worldRow .wCard[data-world="${wid}"]`);
  await p.waitForFunction(()=>(window.__matchState?.().t??0)>8,null,{timeout:600000});
  await p.evaluate(()=>window.__setVoidR(4.5));
  await p.waitForTimeout(2400);
  const rects = await p.evaluate(() => {
    const IDS = ['board','timer','coins','btnQuit','growth'];
    const out = [];
    for (const id of IDS) {
      const el = document.getElementById(id); if (!el) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 2) continue;
      out.push({ id, x: r.x|0, y: r.y|0, w: Math.ceil(r.width), h: Math.ceil(r.height) });
    }
    return out;
  });
  const withHud = (await p.screenshot()).toString('base64');
  await p.evaluate(()=>{ document.querySelectorAll('body > *').forEach(e=>{
    if (e.tagName!=='CANVAS' && e.tagName!=='SCRIPT') e.style.visibility='hidden'; }); });
  await p.waitForTimeout(500);
  const bare = (await p.screenshot()).toString('base64');
  const res = await p.evaluate(async ([a, c, rs]) => {
    const load = (s) => new Promise((r) => { const i = new Image(); i.onload = () => r(i);
      i.src = 'data:image/png;base64,' + s; });
    const ia = await load(a), ic = await load(c);
    const mk = (im) => { const cv = document.createElement('canvas');
      cv.width = im.width; cv.height = im.height; const g = cv.getContext('2d');
      g.drawImage(im, 0, 0); return g; };
    const ga = mk(ia), gc = mk(ic);
    const K = ia.width / innerWidth;
    const lum = (d, i) => (0.2126*d[i] + 0.7152*d[i+1] + 0.0722*d[i+2]) / 255;
    const out = [];
    for (const r of rs) {
      const X = (r.x*K)|0, Y = (r.y*K)|0, W = (r.w*K)|0, H = (r.h*K)|0;
      if (W < 2 || H < 2) continue;
      const da = ga.getImageData(X, Y, W, H).data;
      const dc = gc.getImageData(X, Y, W, H).data;
      const chrome = [], scene = [];
      for (let i = 0; i < da.length; i += 4) {
        const la = lum(da, i), lc = lum(dc, i);
        scene.push(la);
        if (Math.abs(la - lc) > 0.02) chrome.push(lc);
      }
      chrome.sort((x, y) => x - y); scene.sort((x, y) => x - y);
      const q = (arr, f) => arr.length ? arr[Math.min(arr.length-1, (arr.length*f)|0)] : 0;
      out.push({ id: r.id,
        cov: chrome.length / (scene.length||1),
        lo: q(chrome, 0.06), hi: q(chrome, 0.94),
        sceneMean: scene.reduce((s,v)=>s+v,0)/(scene.length||1) });
    }
    return out;
  }, [bare, withHud, rects]);
  console.log(`\n══ ${wid.toUpperCase()} ══`);
  console.log('  element    chrome cover   dark px   light px   internal contrast');
  for (const e of res) {
    const ratio = (Math.max(e.hi, e.lo) + 0.05) / (Math.min(e.hi, e.lo) + 0.05);
    const flag = ratio < 4.5 ? '   ← under 4.5:1' : ratio < 7 ? '   ← under 7:1' : '';
    console.log(`  ${e.id.padEnd(10)} ${(e.cov*100).toFixed(0).padStart(9)}%   ${e.lo.toFixed(3)}     ${e.hi.toFixed(3)}      ${ratio.toFixed(2)}:1${flag}`);
  }
  await p.close();
}
await b.close();
