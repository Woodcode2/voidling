import { PNG } from 'pngjs';
import { readFileSync } from 'node:fs';
const [src, ...pts] = process.argv.slice(2);
const p = PNG.sync.read(readFileSync(src));
for (const pt of pts) {
  const [x, y] = pt.split(',').map(Number);
  // average a 3x3
  let r=0,g=0,b=0,n=0;
  for (let dy=-1;dy<=1;dy++) for (let dx=-1;dx<=1;dx++){
    const i=((y+dy)*p.width+(x+dx))*4; r+=p.data[i];g+=p.data[i+1];b+=p.data[i+2];n++;
  }
  r=Math.round(r/n);g=Math.round(g/n);b=Math.round(b/n);
  const L = 0.2126*(r/255)**2.2 + 0.7152*(g/255)**2.2 + 0.0722*(b/255)**2.2;
  console.log(`${pt.padEnd(12)} rgb(${r},${g},${b})  Ylin=${L.toFixed(4)}`);
}
