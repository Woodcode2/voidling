// SCRATCH — what opening THE SCRAPBOOK costs. 48 cards at 512x512; the grid
// shows one world (12) at a time, lazily.
import { chromium } from 'playwright';
const PORT = process.argv[2] || 4188;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-gl=angle','--use-angle=swiftshader','--no-sandbox','--enable-precise-memory-info'] });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await ctx.addInitScript(() => { try {
  localStorage.setItem('voidPlayed','1'); localStorage.setItem('voidTut','1');
  // pretend everything has been found, so every cell paints its art
  localStorage.setItem('voidStickers', 'antique-compass,beach-ball-cannon,blue-sedan,car-nine,catfish-photo,chain-crew,clock-tower,coconut-decks,crab-manager,doreen-casserole,dwight-ladder,eleven-bowls,enormous-hat,far-pool,flip-flop,foam-finger,fox-mask,gerald-sled,good-cup,good-mustard,grill-nine,gus-sandwich,harbour-seagull,inflatable-swans,kasa-umbrella,kevin-beetle,lemonade-stand,library-book,lost-sandal,lost-temple,lounger-nine,marge-meter,maze-middle,motorhome-cat,offering-box,parked-sofa,pearl-zucchini,ponta-dumpling,royal-mariner,sleeping-koi,tree-trampoline,twelfth-gate,twine-ball,twine-trophy,upside-lantern,vending-raccoon,water-tower,yuzu-stair');
} catch {} });
const p = await ctx.newPage();
await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
const stk = [];
p.on('response', r => { if (/\/assets\/stickers\//.test(r.url())) stk.push([r.url().split('/').pop(), r.status(), Number(r.headers()['content-length']||0)]); });
await p.goto(`http://127.0.0.1:${PORT}/?w=maple`, { waitUntil: 'commit' });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.waitForTimeout(3000);
console.log('sticker requests during boot:', stk.length);
// find every localStorage key the sticker save uses
console.log('save keys:', await p.evaluate(() => Object.keys(localStorage).filter(k => /stk|stick|scrap|find/i.test(k))));
const t0 = Date.now();
await p.evaluate(() => document.getElementById('btnBook')?.click());
await p.waitForTimeout(4000);
console.log(`open book: ${Date.now() - t0}ms wall, ${stk.length} sticker files requested, ${(stk.reduce((a,b)=>a+b[2],0)/1024).toFixed(0)} KB`);
const cells = await p.evaluate(() => ({ cells: document.querySelectorAll('#bookGrid .bkCell').length,
  imgs: document.querySelectorAll('#bookGrid img.stkArt').length,
  tabs: document.querySelectorAll('#bookTabs button').length }));
console.log('grid:', JSON.stringify(cells));
// switch every tab, which is what a child does
for (const w of ['pirate','gameday','lantern']) {
  await p.evaluate((w) => { document.querySelector(`#bookTabs button[data-w="${w}"]`)?.click(); }, w);
  await p.waitForTimeout(2500);
}
console.log(`after touring all four tabs: ${stk.length} files, ${(stk.reduce((a,b)=>a+b[2],0)/1024).toFixed(0)} KB`);
await b.close();
