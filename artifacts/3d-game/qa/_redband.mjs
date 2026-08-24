import { PNG } from 'pngjs';
import { readFileSync } from 'node:fs';
const p=PNG.sync.read(readFileSync(process.argv[2]));
const TOP=620, BOT=p.height-240;
let red=0,b163=0,b150=0,zero=0;
for(let y=TOP;y<BOT;y++)for(let x=0;x<p.width;x++){
  const i=(y*p.width+x)*4,r=p.data[i],g=p.data[i+1],b=p.data[i+2];
  if(!(r>60&&r>g*1.8&&r>b*1.8))continue; red++;
  if(g===0&&b===0)zero++;
  if(r>=163&&r<=174)b163++;
  if(r>=150&&r<=190)b150++;
}
console.log(`play area: ${red} red-dominant px; G=B=0 ${(100*zero/red).toFixed(1)}%; in R 163-174 ${(100*b163/red).toFixed(1)}%; in R 150-190 ${(100*b150/red).toFixed(1)}%`);
