// Dry-run of the _gh_hero.mjs analysis block against a synthetic pair, so a
// 20-minute capture is not lost to a typo in the last 100 lines.
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const mk = await b.newPage({ viewport: { width: 300, height: 300 } });
const pair = await mk.evaluate(() => {
  const draw = (withVoid) => {
    const c = document.createElement('canvas'); c.width = c.height = 300;
    const x = c.getContext('2d');
    x.fillStyle = '#74c352'; x.fillRect(0, 0, 300, 300);
    x.fillStyle = '#bcc4d4'; x.fillRect(0, 200, 300, 100);
    if (withVoid) {
      const g = x.createRadialGradient(150, 150, 10, 150, 150, 90);
      g.addColorStop(0, '#241055'); g.addColorStop(0.7, '#5f2ab4'); g.addColorStop(1, '#cb99ff');
      x.fillStyle = g; x.beginPath(); x.arc(150, 150, 90, 0, Math.PI * 2); x.fill();
      for (const sx of [-32, 32]) {
        x.fillStyle = '#fff'; x.beginPath(); x.arc(150 + sx, 140, 19, 0, Math.PI * 2); x.fill();
        x.fillStyle = '#0d0520'; x.beginPath(); x.arc(150 + sx, 142, 11, 0, Math.PI * 2); x.fill();
      }
      x.fillStyle = '#4a1a68'; x.beginPath(); x.arc(150, 190, 15, 0, Math.PI); x.fill();
      x.fillStyle = '#ff6f91'; x.beginPath(); x.ellipse(150, 194, 10, 5, 0, 0, Math.PI * 2); x.fill();
    }
    return c.toDataURL('image/png').split(',')[1];
  };
  return { a: draw(true), bg: draw(false) };
});
await mk.close();
const rows = [{ R: 1.2, geom: { r: 1.2, camD: 48, pxR: 30, uSmall: 0.5, uStage: 0 }, S: 100, ...pair }];
const src = (await import('node:fs')).readFileSync('qa/_gh_hero.mjs', 'utf8');
const start = src.indexOf('async (rows) => {', src.indexOf('const stats = await an.evaluate'));
const end = src.indexOf('}, results);', start);
const fn = src.slice(start, end + 1);
const an = await b.newPage({ viewport: { width: 900, height: 600 } });
const out = await an.evaluate(new Function('return (' + fn + ')')(), rows);
console.log(JSON.stringify(out, null, 1));
await b.close();
