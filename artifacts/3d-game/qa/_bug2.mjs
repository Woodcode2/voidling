// _bug2 — MENU NAV ROW across real device widths. Measures how much of each
// nav card is clipped off the viewport edge.
import { chromium } from 'playwright';
const PORT = process.argv[2] || '4177';
const DEVICES = [[768,1024,'iPad 9.7 portrait'],[834,1112,'iPad Air portrait'],[1024,768,'iPad landscape'],[1366,1024,'iPad Pro landscape']];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox','--use-gl=angle','--use-angle=swiftshader'] });
console.log('\n  MENU NAV ROW — clipping by device width\n');
for (const [W,H,name] of DEVICES) {
  const p = await b.newPage({ viewport:{width:W,height:H}, deviceScaleFactor:2, hasTouch:true, isMobile:W<700 });
  await p.route('**/functions/v1/ingest-events', r => r.fulfill({status:200,body:'{}'}));
  await p.addInitScript(() => { try { localStorage.setItem('voidPlayed','1');
    localStorage.setItem('voidTut','1'); localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch{} });
  await p.goto(`http://127.0.0.1:${PORT}/`, {waitUntil:'domcontentloaded', timeout:300000});
  await p.waitForFunction(()=>!!window.__voidState,null,{timeout:400000});
  await p.waitForTimeout(1500);
  const r = await p.evaluate(() => {
    const row = document.querySelector('.navRow');
    const cards = [...document.querySelectorAll('.navCard')];
    const rr = row.getBoundingClientRect();
    return { rowW: Math.round(rr.width), rowL: Math.round(rr.left), rowR: Math.round(rr.right),
      overX: getComputedStyle(row).overflowX,
      cards: cards.map(c => { const b = c.getBoundingClientRect();
        const vis = Math.max(0, Math.min(b.right, innerWidth) - Math.max(b.left, 0));
        return { t: c.id, w: Math.round(b.width), vis: Math.round(vis),
          pct: Math.round(vis/b.width*100) }; }),
      // is the menu's own vertical space enough?
      menuScroll: document.getElementById('menu').scrollHeight,
      menuClient: document.getElementById('menu').clientHeight,
      playR: (()=>{const b=document.getElementById('btnPlay').getBoundingClientRect();return [Math.round(b.top),Math.round(b.bottom)];})(),
      footR: (()=>{const f=document.querySelector('#menu .foot');if(!f)return null;const b=f.getBoundingClientRect();return [Math.round(b.top),Math.round(b.bottom)];})(),
    };
  });
  const clipped = r.cards.filter(c=>c.pct<100);
  console.log(`  ${String(W).padStart(4)}x${String(H).padEnd(4)} ${name.padEnd(24)} row ${r.rowW}px (${r.rowL}..${r.rowR}) overflow-x:${r.overX}  menu ${r.menuClient}/${r.menuScroll}`);
  if (clipped.length) console.log(`        CLIPPED: ` + clipped.map(c=>`${c.t} ${c.pct}% visible (${c.vis}/${c.w}px)`).join('  |  '));
  if (r.footR && r.footR[1] > H) console.log(`        FOOT below fold: ${r.footR}`);
  await p.close();
}
await b.close();
