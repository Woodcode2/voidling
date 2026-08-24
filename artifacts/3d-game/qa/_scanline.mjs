import { PNG } from 'pngjs';
import { readFileSync } from 'node:fs';
const [src,x0,y0,x1,y1,n]=[process.argv[2],+process.argv[3],+process.argv[4],+process.argv[5],+process.argv[6],+process.argv[7]||30];
const p=PNG.sync.read(readFileSync(src));
let prev='';
for(let k=0;k<=n;k++){
  const x=Math.round(x0+(x1-x0)*k/n), y=Math.round(y0+(y1-y0)*k/n);
  const i=(y*p.width+x)*4; const s=`rgb(${p.data[i]},${p.data[i+1]},${p.data[i+2]})`;
  if(s!==prev) console.log(`  ${String(x).padStart(4)},${String(y).padStart(4)}  ${s}`);
  prev=s;
}
