// FINAL SHIP CHECK — settles the two contradictions the audit corpus left open:
//   (1) does the main-menu nav row clip on the phones Apple sells?
//   (2) after a real match, are PLAY AGAIN and HOME visible without scrolling,
//       at 0 / 3 / 5 scrapbook finds?
// Renderer is stubbed for the match so the whistle arrives in wall-clock time.
import { chromium } from 'playwright';

const PORT = process.argv[2] || 4177;
const SIZES = [['SE', 375, 667], ['14', 390, 844], ['ProMax', 430, 932]];

const b = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--no-sandbox'],
});

for (const [name, w, h] of SIZES) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  await ctx.addInitScript(() => { try { localStorage.setItem('voidPlayed', '1'); } catch (e) {} });
  const p = await ctx.newPage();
  await p.goto(`http://127.0.0.1:${PORT}/?w=maple`, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => {
    const btn = document.getElementById('btnPlay');
    return btn && btn.getBoundingClientRect().width > 0;
  }, null, { timeout: 300000 });
  await p.waitForTimeout(1200);

  // ── (1) NAV ROW ─────────────────────────────────────────────────────────
  const nav = await p.evaluate(() => {
    const row = document.querySelector('.navRow');
    if (!row) return null;
    const rb = row.getBoundingClientRect();
    return {
      wrap: getComputedStyle(row).flexWrap,
      rowW: Math.round(rb.width), vw: innerWidth,
      docScroll: document.documentElement.scrollWidth,
      cards: [...row.children].map((c) => {
        const bb = c.getBoundingClientRect();
        const vis = Math.max(0, Math.min(innerWidth, bb.right) - Math.max(0, bb.left));
        return `${(c.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 10)}:${Math.round(100 * vis / bb.width)}%`;
      }),
    };
  });
  console.log(`\n== ${name} ${w}x${h} ==`);
  console.log(`  NAV wrap=${nav.wrap} rowW=${nav.rowW} vw=${nav.vw} docScrollW=${nav.docScroll}`);
  console.log(`  NAV cards ${nav.cards.join('  ')}`);

  // ── (2) RESULTS SCREEN after a real match ───────────────────────────────
  await p.evaluate(() => {
    const r = window.__renderer; if (r) r.render = () => {};
    // the daily-gift modal intercepts the PLAY tap on a cold profile
    for (const id of ['daily', 'dailyClose']) {
      const e = document.getElementById(id);
      if (e) { e.click?.(); e.classList.remove('show'); e.style.display = 'none'; }
    }
  });
  await p.click('#btnPlay', { force: true });
  await p.waitForTimeout(400);
  await p.evaluate(() => { window.__setVoidR && window.__setVoidR(7); });
  // rush the clock in slices so endMatch's own frame runs
  for (let i = 0; i < 40; i++) {
    const done = await p.evaluate(() => {
      const ms = window.__matchState && window.__matchState();
      if (ms && ms.t < 172) window.__rushClock && window.__rushClock(174);
      return document.getElementById('end')?.classList.contains('show');
    });
    if (done) break;
    await p.waitForTimeout(300);
  }
  await p.waitForTimeout(900);

  for (const finds of [0, 3, 5]) {
    const m = await p.evaluate((n) => {
      const box = document.getElementById('endFinds');
      if (n === 0) { box.classList.remove('show'); box.innerHTML = ''; }
      else {
        box.classList.add('show');
        box.innerHTML = '<div class="fLbl">' + n + ' NEW STICKERS</div>' +
          Array.from({ length: n }, (_, i) =>
            '<div class="stk t-rare"><i>★</i><span><b>The Second-Biggest Ball of Twine</b>' +
            '<s>MAIN STREET · RARE</s></span></div>').join('');
      }
      const end = document.getElementById('end');
      if (!end || !end.classList.contains('show')) return { err: 'results screen not up' };
      const inner = end.scrollHeight, view = innerHeight;
      const btns = [...end.querySelectorAll('button')].map((btn) => {
        const bb = btn.getBoundingClientRect();
        const vis = Math.max(0, Math.min(innerHeight, bb.bottom) - Math.max(0, bb.top));
        return `${(btn.textContent || '').trim().slice(0, 12)}:${Math.round(100 * vis / Math.max(1, bb.height))}%`;
      });
      return { inner, view, over: inner - view, scrollTop: end.scrollTop, btns };
    }, finds);
    if (m.err) { console.log(`  END finds=${finds}  ${m.err}`); continue; }
    console.log(`  END finds=${finds}  content=${m.inner}px view=${m.view}px overflow=${m.over}px  buttons ${m.btns.join('  ')}`);
  }
  await ctx.close();
}
await b.close();
