// STORE AUDIT probe 2 (scratch): the REVIEWER'S PATH.
//  A. cold, first-ever launch — where does the app put you, and how many taps
//     to the shop / RESTORE PURCHASES? (top-5 IAP rejection: "we could not
//     locate the in-app purchases in your app")
//  B. the returning-player menu at App Store size, to diff against
//     store/01-menu.png (retired 2D game).
import fs from 'node:fs';
import { chromium } from 'playwright';
const OUT = 'qa-out/store'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });

// ── A. cold first run ───────────────────────────────────────────────────────
{
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  await p.goto('http://127.0.0.1:4177/', { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  const snap = async (label) => {
    const s = await p.evaluate(() => ({
      shown: [...document.querySelectorAll('.show')].map((e) => e.id).filter(Boolean),
      menuVis: document.getElementById('menu') ? getComputedStyle(document.getElementById('menu')).display : 'none',
      t: window.__matchState ? +(window.__matchState().t || 0).toFixed(1) : null,
      visibleText: [...document.querySelectorAll('button,[id^=btn]')]
        .filter((e) => e.offsetParent !== null && (e.textContent || '').trim())
        .map((e) => (e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 34)),
    }));
    console.log(label, JSON.stringify(s));
    await p.screenshot({ path: `${OUT}/firstrun-${label}.png` });
  };
  await p.waitForTimeout(1200); await snap('t1');
  await p.waitForTimeout(4000);  await snap('t2');
  await p.waitForTimeout(6000);  await snap('t3');
  await p.close();
}

// ── B. the returning menu, at the exact App Store size ──────────────────────
{
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  await p.addInitScript(() => { try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidCoins', '2400'); localStorage.setItem('voidXP', '900');
    localStorage.setItem('voidStreak', '6');
    localStorage.setItem('voidDailyLast', new Date().toDateString());
    localStorage.setItem('voidStats', JSON.stringify({ matches: 24, wins: 9, best: 141000, bestForm: 5, eaten: 3100, rivals: 7, combo: 22 }));
  } catch {} });
  await p.goto('http://127.0.0.1:4177/', { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.waitForTimeout(4000);
  await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => {
    if (['daily', 'gift', 'titlecard'].includes(e.id)) e.classList.remove('show'); }));
  await p.waitForTimeout(2500);
  const m = await p.evaluate(() => ({
    shown: [...document.querySelectorAll('.show')].map((e) => e.id).filter(Boolean),
    buttons: [...document.querySelectorAll('#menu button, #menu a, #menu [id^=btn]')]
      .filter((e) => e.offsetParent !== null)
      .map((e) => ({ id: e.id, txt: (e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40) })),
    build: document.getElementById('build')?.textContent?.trim(),
  }));
  console.log('\nMENU:', JSON.stringify(m, null, 1));
  await p.screenshot({ path: `${OUT}/menu-real.png` });
  console.log('wrote', `${OUT}/menu-real.png`);
  await p.close();
}
await b.close();
