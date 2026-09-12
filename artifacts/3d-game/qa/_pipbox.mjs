import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 } });
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try { localStorage.clear();
  localStorage.setItem('voidPlayed','1'); localStorage.setItem('voidTut','1'); localStorage.setItem('voidMute','1');
  localStorage.setItem('voidDailyLast', new Date().toDateString());
  localStorage.setItem('voidUnlocked','maple,pirate,gameday,lantern,powder,skylark');
} catch {} });
await p.goto('http://127.0.0.1:4177/?w=maple&manual=1', { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 420000 });
await p.evaluate(() => document.getElementById('worlds')?.classList.add('show'));
await p.waitForTimeout(1200);
const r = await p.evaluate(() => {
  const box = (sel) => { const e = document.querySelector(sel); if (!e) return null;
    const b = e.getBoundingClientRect(); const cs = getComputedStyle(e);
    return { w: +b.width.toFixed(1), h: +b.height.toFixed(1), display: cs.display,
      alignSelf: cs.alignSelf, flex: cs.flex, pipSize: cs.getPropertyValue('--pipSize').trim() }; };
  const deep = (sel) => { const e = document.querySelector(sel); const cs = getComputedStyle(e);
    return { height: cs.height, minHeight: cs.minHeight, lineHeight: cs.lineHeight,
      boxSizing: cs.boxSizing, padding: cs.padding, fontSize: cs.fontSize,
      childH: e.firstElementChild ? +e.firstElementChild.getBoundingClientRect().height.toFixed(1) : null }; };
  return { deepPip: deep('.wPips .pip'), deepRow: deep('.wPips .pipRow'),
    card: box('.wPips .pip'), cardDot: box('.wPips .pipDot'),
    row: box('.wPips .pipRow'), wrap: box('.wPips'),
    menu: box('#mlPips .pip'), menuDot: box('#mlPips .pipDot'),
    end: null,
    parentAlign: getComputedStyle(document.querySelector('.wPips').parentElement).alignItems };
});
await p.close(); await b.close();
for (const [k, v] of Object.entries(r)) console.log(`  ${String(k).padEnd(10)} ${JSON.stringify(v)}`);
