// IS THE HARNESS ALIVE, OR IS THE BOX?
//
//   node qa/_tick.mjs [world] [dpr]
//
// Every probe in the kit blocks on `__matchState().t > N`. When that times out
// there are two very different explanations — the match never STARTED, or the
// software renderer is simply crawling — and the failure looks identical from
// the outside. This prints the match clock against the wall clock every few
// seconds so the two can be told apart, and reports the harness's real-time
// ratio, which every other probe's timeout should be sized off.
import { chromium } from 'playwright';

const WORLD = process.argv[2] || 'maple';
const DPR = Number(process.argv[3] || 1);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: DPR });
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString());
} catch { /* private mode */ } });
const t0 = Date.now();
const el = () => ((Date.now() - t0) / 1000).toFixed(0).padStart(4);
await p.goto(`http://127.0.0.1:4177/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
console.log(`${el()}s  dom`);
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
console.log(`${el()}s  __voidState up`);
await p.evaluate(() => document.querySelectorAll('.show')
  .forEach((e) => { if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
await p.click('#btnPlay'); await p.waitForTimeout(1400);
console.log(`${el()}s  PLAY`);
await p.click(`#worldRow .wCard[data-world="${WORLD}"]`);
console.log(`${el()}s  world card clicked`);
for (let i = 0; i < 40; i++) {
  await p.waitForTimeout(15000);
  const s = await p.evaluate(() => {
    const m = window.__matchState?.();
    return { t: m?.t ?? -1, r: m?.r ?? -1, n: (m?.rivals ?? []).length,
      vis: document.visibilityState, fps: window.__fpsProbe ?? null };
  });
  const wall = (Date.now() - t0) / 1000;
  console.log(`${el()}s  matchT=${s.t.toFixed(2)}  r=${s.r.toFixed(2)}  rivals=${s.n}  ratio=${(s.t / wall).toFixed(3)}x realtime`);
  if (s.t > 30) break;
}
await b.close();
