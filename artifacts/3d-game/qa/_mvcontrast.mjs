// TEXT CONTRAST on every menu-side screen, at phone size.
//
// The backdrop is RESOLVED, not guessed: for each text node the probe walks the
// ancestor chain compositing background-color over background-color until it
// reaches an opaque layer. Elements whose chain never becomes opaque (text over
// the live WebGL canvas, or over a background-IMAGE such as the world-picker
// poster art) are reported separately as UNRESOLVED rather than given a number
// this environment cannot honestly produce — contrast2.mjs is the probe for
// text over the scene.
//
// WCAG AA: 4.5:1 for text under 18.66px/24px-bold, 3.0:1 at or above it.
import { chromium } from 'playwright';

const PORT = process.argv[2] || '4237';
const SCREENS = [
  ['menu', null],
  ['worlds', async (p) => p.click('#btnPlay')],
  ['book', async (p) => p.click('#btnBook')],
  ['shop', async (p) => p.click('#btnShop')],
  ['trophies', async (p) => p.click('#btnTrophies')],
  ['topvoids', async (p) => p.click('#btnTop')],
  ['settings', async (p) => p.click('#btnSettings')],
  ['tut', async (p) => p.evaluate(() => document.getElementById('tut').classList.add('show'))],
  ['gate', async (p) => p.evaluate(() => document.getElementById('gate').classList.add('show'))],
  ['pause', async (p) => p.evaluate(() => document.getElementById('pause').classList.add('show'))],
];
const OVERLAYS = ['worlds', 'book', 'shop', 'trophies', 'topvoids', 'settings', 'tut',
  'daily', 'gate', 'policy', 'pause', 'skinPrev', 'end', 'loadScr'];

const SCAN = (overlays) => {
  const px = (s) => { const m = /rgba?\(([^)]+)\)/.exec(s); if (!m) return null;
    const n = m[1].split(',').map(Number); return { r: n[0], g: n[1], b: n[2], a: n.length > 3 ? n[3] : 1 }; };
  const over = (fg, bg) => ({ r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 });
  const L = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const ratio = (a, b) => { const l1 = L(a), l2 = L(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };

  let root = null, rootName = 'menu';
  for (const id of overlays) { const e = document.getElementById(id);
    if (e && getComputedStyle(e).display !== 'none' && e.classList.contains('show')) { root = e; rootName = id; } }
  if (!root) root = document.getElementById('menu');

  const out = [];
  for (const el of [root, ...root.querySelectorAll('*')]) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) continue;
    const txt = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join(' ').trim();
    if (!txt) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    const fs = parseFloat(cs.fontSize);
    const fw = parseInt(cs.fontWeight, 10) || 400;
    const large = fs >= 24 || (fs >= 18.66 && fw >= 700);
    // resolve the backdrop
    let bg = null, unresolved = '', node = el, chain = [];
    while (node && node !== document.documentElement.parentElement) {
      const c = getComputedStyle(node);
      if (c.backgroundImage !== 'none') { unresolved = 'background-image on ' + (node.id || node.className || node.tagName); break; }
      const b = px(c.backgroundColor);
      if (b && b.a > 0) { chain.push(b); if (b.a >= 0.999) break; }
      node = node.parentElement;
    }
    if (!unresolved) {
      if (!chain.length || chain[chain.length - 1].a < 0.999) unresolved = unresolved || 'no opaque backdrop';
      else { bg = chain[chain.length - 1]; for (let i = chain.length - 2; i >= 0; i--) bg = over(chain[i], bg); }
    }
    const fg0 = px(cs.color);
    const stroke = parseFloat(cs.webkitTextStrokeWidth || '0') || 0;
    if (unresolved || !bg || !fg0) {
      out.push({ txt: txt.slice(0, 38), fs, fw, large, unresolved: unresolved || 'no colour', stroke,
        sel: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/)[0] : '') });
      continue;
    }
    const fg = fg0.a < 1 ? over(fg0, bg) : fg0;
    out.push({ txt: txt.slice(0, 38), fs, fw, large, stroke,
      ratio: Math.round(ratio(fg, bg) * 100) / 100,
      need: large ? 3 : 4.5,
      fgc: `rgb(${Math.round(fg.r)},${Math.round(fg.g)},${Math.round(fg.b)})`,
      bgc: `rgb(${Math.round(bg.r)},${Math.round(bg.g)},${Math.round(bg.b)})`,
      sel: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/)[0] : '') });
  }
  return { rootName, out };
};

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
const cdp = await p.context().newCDPSession(p);
await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 47, bottom: 34, left: 0, right: 0 } });
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString());
  localStorage.setItem('voidCoins', '2500'); } catch { } });
await p.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => { try { window.__renderer.render = () => { }; } catch { } });
await p.waitForTimeout(1200);

const fails = [], unres = [];
for (const [name, open] of SCREENS) {
  await p.evaluate((ids) => { for (const id of ids) document.getElementById(id)?.classList.remove('show'); }, OVERLAYS);
  await p.waitForTimeout(100);
  if (open) { try { await open(p); } catch (e) { console.log(`!! ${name}: ${e.message.split('\n')[0]}`); continue; } }
  await p.waitForTimeout(400);
  const { rootName, out } = await p.evaluate(SCAN, OVERLAYS);
  const bad = out.filter(o => o.ratio !== undefined && o.ratio < o.need);
  const u = out.filter(o => o.unresolved);
  console.log(`\n── ${name} (${rootName})  ${out.length} text nodes, ${bad.length} under AA, ${u.length} unresolvable`);
  for (const o of bad.sort((x, y) => x.ratio - y.ratio))
    console.log(`   ${String(o.ratio).padStart(5)}:1  need ${o.need}  ${String(o.fs).padStart(5)}px/${o.fw}  ${o.fgc} on ${o.bgc}  ${o.sel.slice(0, 26).padEnd(26)} "${o.txt}"`);
  for (const o of u) console.log(`   UNRES  ${String(o.fs).padStart(5)}px/${o.fw} stroke${o.stroke}  ${o.unresolved.slice(0, 30).padEnd(30)} ${o.sel.slice(0, 22).padEnd(22)} "${o.txt}"`);
  fails.push(...bad.map(o => ({ ...o, screen: name })));
  unres.push(...u.map(o => ({ ...o, screen: name })));
}
await p.close(); await b.close();
console.log(`\n${fails.length} text nodes below WCAG AA on resolvable backdrops; ${unres.length} unresolvable (text over canvas or over art).`);
