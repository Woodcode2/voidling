// WHERE DOES THE LAVENDER COME FROM? island.ts:439-440 derives the sky
// gradient's end stops from WORLD.space with offsetHSL. three keeps Color's
// components in LINEAR-sRGB, and offsetHSL operates on those, so "+0.10
// lightness" applied to a near-black is not a nudge. Print the stops as they
// are actually written into the canvas gradient.
import { chromium } from 'playwright';
const PORT = process.argv[2] || '4177';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 } });
p.setDefaultTimeout(400000);
await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
await p.goto(`http://127.0.0.1:${PORT}/?w=lantern`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__scene, null, { timeout: 400000 });
const r = await p.evaluate(() => {
  const C = window.__scene.fog.color.constructor;
  const base = new C(0x0d0821);
  const hi = base.clone().offsetHSL(0.02, 0.10, 0.10);
  const lo = base.clone().offsetHSL(-0.02, 0.0, -0.035);
  const hsl = {}; base.getHSL(hsl);
  const srgb = c => '#' + c.getHexString();
  const lum = c => { const h = c.getHexString();
    const f = i => { const v = parseInt(h.slice(i, i + 2), 16) / 255;
      return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return +(0.2126 * f(0) + 0.7152 * f(2) + 0.0722 * f(4)).toFixed(4); };
  return {
    workingColorSpace: window.__scene.fog.color.constructor.name + ' components are linear-sRGB',
    'WORLD.space (stop 0.62)': srgb(base) + '  L=' + lum(base),
    'base HSL as offsetHSL sees it': { h: +hsl.h.toFixed(3), s: +hsl.s.toFixed(3), l: +hsl.l.toFixed(4) },
    'lo  = stop 0.00 (ZENITH)': srgb(lo) + '  L=' + lum(lo),
    'hi  = stop 1.00 (NADIR)': srgb(hi) + '  L=' + lum(hi),
    'hi / base luminance': +(lum(hi) / Math.max(lum(base), 1e-6)).toFixed(1) + 'x',
  };
});
console.log(JSON.stringify(r, null, 1));
await b.close();
