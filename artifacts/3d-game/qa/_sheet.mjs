// Contact sheet: N frames side by side at a given scale.  node qa/_sheet.mjs out.png scale a.png b.png ...
import fs from 'fs'; import { PNG } from 'pngjs';
const [out, sc, ...files] = process.argv.slice(2); const k = +sc;
const P = files.map((f) => PNG.sync.read(fs.readFileSync(f)));
const w = Math.floor(P[0].width * k), h = Math.floor(P[0].height * k), O = new PNG({ width: (w + 3) * P.length, height: h });
O.data.fill(255);
P.forEach((S, n) => { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const sx = Math.floor(x / k), sy = Math.floor(y / k), i = (sy * S.width + sx) * 4, o = (y * O.width + n * (w + 3) + x) * 4; O.data[o] = S.data[i]; O.data[o + 1] = S.data[i + 1]; O.data[o + 2] = S.data[i + 2]; O.data[o + 3] = 255; } });
fs.writeFileSync(out, PNG.sync.write(O)); console.log(out, O.width, O.height);
