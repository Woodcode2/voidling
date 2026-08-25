import { PNG } from 'pngjs';
import { readFileSync, writeFileSync } from 'node:fs';
const [src,dst,n] = process.argv.slice(2); const N=+n||4;
const p = PNG.sync.read(readFileSync(src));
const W=Math.floor(p.width/N), H=Math.floor(p.height/N);
const o=new PNG({width:W,height:H});
for(let y=0;y<H;y++)for(let x=0;x<W;x++){let r=0,g=0,b=0;for(let dy=0;dy<N;dy++)for(let dx=0;dx<N;dx++){const i=((y*N+dy)*p.width+(x*N+dx))*4;r+=p.data[i];g+=p.data[i+1];b+=p.data[i+2];}const c=N*N,d=(y*W+x)*4;o.data[d]=r/c;o.data[d+1]=g/c;o.data[d+2]=b/c;o.data[d+3]=255;}
writeFileSync(dst,PNG.sync.write(o));console.log(dst,W,H);
