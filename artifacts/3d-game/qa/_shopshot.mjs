// SCRATCH — the shop as a child meets it. Screenshots the grid at three coin
// balances (0 / 500 / 2700) and reports, in pixels, how far down the scroller
// each tier header sits — i.e. what is above the fold on a 430x932 phone, and
// how many screens of scrolling separate a new player from the paid tier.
import { chromium } from 'playwright';
import fs from 'node:fs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
fs.mkdirSync('qa-out/econ', { recursive: true });

for (const [tag, coins, mock] of [['ios', 500, true], ['rich', 2700, false]]) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
  await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript((c) => { try {
    localStorage.clear();
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidCoins', String(c));
    localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} }, coins);
  await p.goto(`http://127.0.0.1:4177/${mock ? '?iapmock=1' : ''}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.evaluate(() => { try { window.__renderer.render = () => {}; } catch {} });
  await p.evaluate(() => document.querySelectorAll('.show').forEach(e => {
    if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
  await p.click('#btnShop'); await p.waitForTimeout(900);
  const geo = await p.evaluate(() => {
    const g = document.getElementById('shopGrid');
    const top = g.getBoundingClientRect().top;
    const heads = [...g.querySelectorAll('.shopTier')].map(h => ({
      txt: h.textContent.replace(/\s+/g, ' ').trim().slice(0, 46),
      y: Math.round(h.getBoundingClientRect().top) }));
    const cards = [...g.querySelectorAll('.skCard')].map(c => ({
      nm: c.querySelector('.nm')?.textContent, pr: c.querySelector('.pr')?.textContent,
      y: Math.round(c.getBoundingClientRect().top) }));
    const sc = document.getElementById('shop');
    return { top: Math.round(top), heads, cards, vh: innerHeight,
      scrollH: g.scrollHeight, clientH: g.clientHeight,
      shopScrollH: sc.scrollHeight, shopClientH: sc.clientHeight,
      legal: document.getElementById('shopLegal')?.textContent?.replace(/\s+/g,' ').trim(),
      restore: !!document.getElementById('btnRestore')?.offsetParent };
  });
  console.log(`\n══ ${tag}  coins=${coins}${mock ? '  (iapmock: purchases live)' : ''}  viewport 430x932`);
  console.log(`   scroller ${geo.shopClientH}px tall, content ${geo.shopScrollH}px  →  ${(geo.shopScrollH / geo.shopClientH).toFixed(2)} screens`);
  for (const h of geo.heads) console.log(`   HEADER  y=${String(h.y).padStart(5)}  ${h.y < 932 ? 'ON SCREEN ' : 'below fold'}  ${h.txt}`);
  for (const c of geo.cards) console.log(`     card  y=${String(c.y).padStart(5)}  ${String(c.nm).padEnd(14)} ${c.pr}`);
  console.log(`   legal: "${geo.legal}"`);
  await p.screenshot({ path: `qa-out/econ/shop-${tag}.png` });
  // scroll to the paid tier and shoot that too
  await p.evaluate(() => {
    const h = [...document.querySelectorAll('#shopGrid .shopTier')].pop();
    h?.scrollIntoView({ block: 'start' });
  });
  await p.waitForTimeout(400);
  await p.screenshot({ path: `qa-out/econ/shop-${tag}-legendary.png` });
  // open the first legendary preview
  await p.evaluate(() => {
    const cards = [...document.querySelectorAll('#shopGrid .skCard.legend')];
    cards[0]?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await p.waitForTimeout(700);
  const prev = await p.evaluate(() => ({
    name: document.getElementById('spName')?.textContent,
    tier: document.getElementById('spTier')?.textContent,
    act: document.getElementById('spAct')?.textContent,
  }));
  console.log(`   preview: ${prev.name} · ${prev.tier} · BUTTON "${prev.act}"`);
  await p.screenshot({ path: `qa-out/econ/prev-${tag}.png` });
  // tap BUY and see what happens (gate?)
  await p.evaluate(() => document.getElementById('spAct')?.dispatchEvent(new MouseEvent('click', { bubbles: true })));
  await p.waitForTimeout(800);
  const after = await p.evaluate(() => ({
    gate: document.getElementById('gate')?.classList.contains('show'),
    sum: document.getElementById('gateSum')?.textContent,
    act: document.getElementById('spAct')?.textContent,
  }));
  console.log(`   after BUY tap: gate=${after.gate} sum="${after.sum}" button="${after.act}"`);
  await p.screenshot({ path: `qa-out/econ/gate-${tag}.png` });
  await p.close();
}
await b.close();
