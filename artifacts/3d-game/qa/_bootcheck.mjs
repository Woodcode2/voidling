// Does it still reach a frame? The menu deletion's failure mode is a top-level
// TypeError that aborts module evaluation before animate() runs, so the boot
// curtain never lifts — no thrown error visible in a screenshot, just a
// permanent loading screen.
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 } });
const errs = [];
p.on('pageerror', (e) => errs.push(e.message));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1'); } catch {} });
await p.goto('http://127.0.0.1:4177/?w=maple', { waitUntil: 'domcontentloaded', timeout: 300000 });
let ok = true;
try { await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 }); }
catch { ok = false; }
const st = await p.evaluate(() => ({
  chip: !!document.getElementById('btnWorlds'),
  solo: !!document.getElementById('btnSolo'),
  tog: !!document.getElementById('soloTog'),
  cover: document.getElementById('loadScr')?.classList.contains('show') ?? null,
}));
console.log('reached a frame:', ok);
console.log('page errors:', errs.length ? errs : 'none');
console.log('btnWorlds gone:', !st.chip, ' btnSolo gone:', !st.solo, ' soloTog present:', st.tog);
console.log('loading curtain still up:', st.cover);
await b.close();
process.exit(ok && !errs.length && !st.chip && !st.solo && st.tog ? 0 : 1);
