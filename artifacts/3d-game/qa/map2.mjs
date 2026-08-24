import { PNG } from 'pngjs';
import { readFileSync } from 'node:fs';
const [src,sx,sy,sw,sh] = process.argv.slice(2);
const p = PNG.sync.read(readFileSync(src));
const X=+sx,Y=+sy,W=+sw,H=+sh;
const rows=[];
for(let y=0;y<H;y++){
  let line='';
  for(let x=0;x<W;x++){
    const i=((Y+y)*p.width+(X+x))*4;
    const r=p.data[i],g=p.data[i+1],b=p.data[i+2];
    const L=(0.2126*r+0.7152*g+0.0722*b)/255;
    // skin ~ (200,150,110)
    let ch;
    if(L<0.06) ch='#';        // near black (INK / deep hair)
    else if(L<0.14) ch='+';   // dark
    else if(r>g&&g>b&&r-b>40&&L>0.28) ch='S';  // skin-ish warm
    else if(L>0.55) ch='W';
    else ch='.';
    line+=ch;
  }
  rows.push(line);
}
console.log(rows.join('\n'));
