// full powder match: drive, eat, hit the avalanche beat, finish, read the news
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 } });
p.on('pageerror', (e) => console.log('PAGEERR', String(e).slice(0, 200)));
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try { localStorage.setItem('voidPlayed','1'); localStorage.setItem('voidTut','1');
  localStorage.setItem('voidMute','1'); localStorage.setItem('voidDailyLast', new Date().toDateString());
  localStorage.setItem('voidUnlocked','maple,pirate,gameday,lantern,powder'); } catch {} });
await p.goto('http://127.0.0.1:4177/?w=powder&len=40', { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 2, null, { timeout: 900000 });
// ice check: warp onto the lake, is the steering factor live?
const ice = await p.evaluate(() => {
  const st = window.__voidState();
  return { at: [Math.round(st.x), Math.round(st.z)] };
});
console.log('spawned at', JSON.stringify(ice));
// let the match run; drive around via joystick synth events? use suction: grow and eat
await p.evaluate(() => window.__setVoidR(3));
for (let i = 0; i < 10; i++) {
  await p.waitForTimeout(4000);
  const st = await p.evaluate(() => ({
    t: Math.round(window.__matchState().t), clock: Math.round(window.__matchState().clock),
    score: Math.round(window.__matchState().score),
    news: document.querySelector('#news')?.textContent?.slice(0, 90) ?? '',
  }));
  console.log(JSON.stringify(st));
  if (st.clock <= 1) break;
}
await p.waitForFunction(() => document.getElementById('end')?.classList.contains('show'), null, { timeout: 300000 }).catch(() => console.log('no end screen'));
const end = await p.evaluate(() => ({ hd: document.getElementById('endHd')?.textContent ?? document.querySelector('#end .big')?.textContent ?? '?' }));
console.log('END:', JSON.stringify(end));
await b.close();
