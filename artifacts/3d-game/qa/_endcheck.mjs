// Results screen after a REAL match — is PLAY AGAIN on screen, with finds?
import { chromium } from 'playwright';
const PORT = process.argv[2] || 4177;
const W = +(process.argv[3] || 390), H = +(process.argv[4] || 844);

const b = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--no-sandbox'],
});
const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
await ctx.addInitScript(() => { try { localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidDaily', String(Date.now())); } catch (e) {} });
const p = await ctx.newPage();
p.on('console', (m) => { if (m.type() === 'error') console.log('  [err]', m.text().slice(0, 140)); });
await p.goto(`http://127.0.0.1:${PORT}/?w=maple`, { waitUntil: 'domcontentloaded' });
await p.waitForFunction(() => document.getElementById('btnPlay')?.getBoundingClientRect().width > 0, null, { timeout: 300000 });
await p.waitForTimeout(1000);
await p.evaluate(() => {
  if (window.__renderer) window.__renderer.render = () => {};
  document.querySelectorAll('#daily,#giftModal').forEach((e) => { e.classList.remove('show'); e.style.display = 'none'; });
  localStorage.setItem('voidTut', '1');   // skip the one-time teach card
  document.getElementById('btnPlay').click();
});
await p.waitForTimeout(600);
await p.evaluate(() => {
  const card = document.querySelector('#worlds [data-w="maple"]') || document.querySelector('#worlds .wCard');
  card && card.click();
});
await p.waitForTimeout(2500);
console.log('after PLAY:', await p.evaluate(() => JSON.stringify(window.__matchState ? window.__matchState() : null).slice(0, 200)));

for (let i = 0; i < 60; i++) {
  const st = await p.evaluate(() => {
    const ms = window.__matchState ? window.__matchState() : null;
    if (ms && window.__rushClock && ms.clock > 1) window.__rushClock(0.25);
    return { t: ms && ms.t, end: document.getElementById('end')?.classList.contains('show') };
  });
  if (st.end) { console.log(`results up at loop ${i}, t=${st.t}`); break; }
  if (i % 10 === 0) console.log(`  loop ${i} t=${st.t}`);
  await p.waitForTimeout(400);
}
await p.waitForTimeout(1200);

for (const finds of [0, 2, 3, 5, 8]) {
  const m = await p.evaluate((n) => {
    const box = document.getElementById('endFinds');
    if (n === 0) { box.classList.remove('show'); box.innerHTML = ''; }
    else {
      box.classList.add('show');
      box.innerHTML = '<div class="fLbl">' + n + ' NEW STICKERS</div>' +
        Array.from({ length: n }, () =>
          '<div class="stk t-rare"><i>*</i><span><b>The Second-Biggest Ball of Twine</b>' +
          '<s>MAIN STREET . RARE</s></span></div>').join('');
    }
    const end = document.getElementById('end');
    if (!end || !end.classList.contains('show')) return { err: 'not up' };
    end.scrollTop = 0;
    const btns = [...end.querySelectorAll('button')].map((btn) => {
      const bb = btn.getBoundingClientRect();
      const vis = Math.max(0, Math.min(innerHeight, bb.bottom) - Math.max(0, bb.top));
      return `${(btn.textContent || '').trim().slice(0, 11)}=${Math.round(100 * vis / Math.max(1, bb.height))}%`;
    });
    return { inner: end.scrollHeight, view: innerHeight, btns, findsH: Math.round(box.getBoundingClientRect().height) };
  }, finds);
  if (m.err) { console.log(`finds=${finds}  ${m.err}`); continue; }
  console.log(`finds=${finds}  content=${m.inner}px view=${m.view}px overflow=${m.inner - m.view}px findsBlock=${m.findsH}px  ${m.btns.join('  ')}`);
}
await b.close();
