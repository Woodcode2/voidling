// REFUTATION probe. Two questions the finding turns on:
//  1. What does the SHIPPED coastline test cost today? (finding claims 9,955-12,645 ns)
//  2. What does the whole biomeAt cost, i.e. how much is the region loop the
//     finding wants a bbox on actually worth?
import { chromium } from 'playwright';
const PORT = process.env.PORT || 4177;
const WORLDS = (process.argv[2] || 'maple,pirate,gameday,lantern').split(',');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
for (const wid of WORLDS) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
  await p.goto(`http://127.0.0.1:${PORT}/?w=${wid}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__insideIsland3 && !!window.__biomeAt, null, { timeout: 400000 });
  const r = await p.evaluate(() => {
    const isl = window.__insideIsland3, bio = window.__biomeAt, N = 20000, B = 25;
    let sink = 0;
    // points on the playfield, the same distribution both tests see
    const XS = new Float64Array(N), ZS = new Float64Array(N);
    for (let i = 0; i < N; i++) { XS[i] = (i % 700) - 350; ZS[i] = ((i * 7) % 700) - 350; }
    let onLand = 0; for (let i = 0; i < N; i++) if (isl(XS[i], ZS[i])) onLand++;
    const ISL = () => { let a = 0; for (let i = 0; i < N; i++) if (isl(XS[i], ZS[i])) a++; sink += a; };
    const BIO = () => { let a = 0; for (let i = 0; i < N; i++) if (bio(XS[i], ZS[i])) a++; sink += a; };
    const mn = (fn) => { let best = 1e9; for (let k = 0; k < B; k++) { const t = performance.now(); fn(); const d = performance.now() - t; if (d < best) best = d; } return best; };
    ISL(); BIO();
    const a = mn(ISL), c = mn(BIO);
    return { islNs: a * 1e6 / N, bioNs: c * 1e6 / N, landFrac: onLand / N, sink };
  });
  console.log(`${wid.padEnd(8)} insideIsland3 ${r.islNs.toFixed(0)} ns/call | biomeAt ${r.bioNs.toFixed(0)} ns/call | region-loop share ${(r.bioNs - r.islNs).toFixed(0)} ns | ${(r.landFrac * 100).toFixed(0)}% of probes on land`);
  await p.close();
}
await b.close();
