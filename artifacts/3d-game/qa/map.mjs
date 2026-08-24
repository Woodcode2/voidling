import { PNG } from 'pngjs';
import { readFileSync } from 'node:fs';
const [src,sx,sy,sw,sh,step] = process.argv.slice(2);
const p = PNG.sync.read(readFileSync(src));
const X=+sx,Y=+sy,W=+sw,H=+sh,S=+step||4;
const buckets = new Map();
let rows=[];
for(let y=0;y<H;y+=S){
  let line='';
  for(let x=0;x<W;x+=S){
    const i=((Y+y)*p.width+(X+x))*4;
    const r=p.data[i],g=p.data[i+1],b=p.data[i+2];
    const key=`${r>>4},${g>>4},${b>>4}`;
    buckets.set(key,(buckets.get(key)||0)+1);
    // classify: red-dominant?
    let ch='.';
    if(r>g*1.6 && r>b*1.6){ ch = r>200?'A': r>160?'B': r>120?'C': r>80?'D':'E'; }
    else if(r<60&&g<60&&b<60) ch='#';
    else if(r>200&&g>200&&b>200) ch='W';
    else ch='-';
    line+=ch;
  }
  rows.push(line);
}
console.log(rows.join('\n'));
