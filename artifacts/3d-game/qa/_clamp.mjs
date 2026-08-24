import { PNG } from 'pngjs';
import { readFileSync } from 'node:fs';
for (const src of process.argv.slice(2)) {
  const p = PNG.sync.read(readFileSync(src));
  let total=0, g0=0, b0=0, r0=0, any0=0, two0=0, all0=0, sat255=0;
  for (let i=0;i<p.data.length;i+=4){
    const r=p.data[i],g=p.data[i+1],b=p.data[i+2];
    total++;
    const z=(r===0?1:0)+(g===0?1:0)+(b===0?1:0);
    if(r===0)r0++; if(g===0)g0++; if(b===0)b0++;
    if(z>=1)any0++; if(z>=2)two0++; if(z===3)all0++;
    if(r===255&&g===255&&b===255) sat255++;
  }
  const pc=(n)=>`${(100*n/total).toFixed(2)}%`;
  console.log(`${src}\n  R==0 ${pc(r0)}  G==0 ${pc(g0)}  B==0 ${pc(b0)}  >=1 ch at 0 ${pc(any0)}  >=2 ch at 0 ${pc(two0)}  all 3 (pure black) ${pc(all0)}  pure white ${pc(sat255)}`);
}
