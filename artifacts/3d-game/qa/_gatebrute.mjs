// SCRATCH — CAN A CHILD BRUTE-FORCE THE PARENTAL GATE?
// The gate (prototype3d.ts:3475) re-rolls its sum only inside askGrownUp().
// A WRONG answer clears the box and leaves gateAns untouched, with no attempt
// counter and no delay. So one gate can be attacked by typing numbers.
// This types 72,73,74… until it gets in, and reports how many taps that took.
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 } });
await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.clear();
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidCoins', '0');
  localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
await p.goto('http://127.0.0.1:4177/?iapmock=1', { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => { try { window.__renderer.render = () => {}; } catch {} });
await p.evaluate(() => document.querySelectorAll('.show').forEach(e => {
  if (['daily','gift'].includes(e.id)) e.classList.remove('show'); }));
await p.click('#btnShop'); await p.waitForTimeout(600);
// open the first LEGENDARY card and tap BUY
await p.evaluate(() => {
  const cards = [...document.querySelectorAll('#shopGrid .skCard')];
  cards.find(c => c.classList.contains('legend'))?.click();
});
await p.waitForTimeout(400);
await p.click('#spAct'); await p.waitForTimeout(400);
const sum = await p.evaluate(() => document.getElementById('gateSum')?.textContent);
let taps = 0, got = null, sums = new Set();
const t0 = Date.now();
for (let guess = 60; guess <= 200; guess++) {
  taps++;
  await p.fill('#gateIn', String(guess));
  await p.click('#gateGo');
  sums.add(await p.evaluate(() => document.getElementById('gateSum')?.textContent));
  const open = await p.evaluate(() => document.getElementById('gate')?.classList.contains('show'));
  if (!open) { got = guess; break; }
}
const ms = Date.now() - t0;
console.log(`gate sum shown: "${sum}"`);
console.log(`distinct sums seen across ${taps} wrong answers: ${[...sums].join(' | ')}`);
console.log(got !== null
  ? `BROKEN IN: answer ${got} accepted after ${taps} taps (${(ms/1000).toFixed(1)}s of scripted typing)`
  : `not broken in ${taps} taps`);
// what did it unlock?
const after = await p.evaluate(() => ({
  btn: document.getElementById('spAct')?.textContent,
  owned: localStorage.getItem('voidSkinsOwned'),
}));
console.log(`after: button="${after.btn}"  owned=${after.owned}`);
await b.close();
