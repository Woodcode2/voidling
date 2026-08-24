import { PNG } from 'pngjs';
import { readFileSync, writeFileSync } from 'node:fs';
const [src,dst,X,Y,W,H,S]=[process.argv[2],process.argv[3],+process.argv[4],+process.argv[5],+process.argv[6],+process.argv[7],+process.argv[8]||1];
const p=PNG.sync.read(readFileSync(src));
const out=new PNG({width:W*S,height:H*S});
for(let y=0;y<H*S;y++)for(let x=0;x<W*S;x++){
  const i=((Y+Math.floor(y/S))*p.width+(X+Math.floor(x/S)))*4;
  const r=p.data[i],g=p.data[i+1],b=p.data[i+2];
  let c=[25,25,25];
  if(g<12&&b<12&&r>20){
    if(r>=190)c=[255,255,255]; else if(r>=175)c=[255,230,0];
    else if(r>=170)c=[0,255,120]; else if(r>=163)c=[0,160,255];
    else if(r>=140)c=[255,0,200]; else if(r>=90)c=[150,60,255]; else c=[255,120,0];
  }
  const d=(y*out.width+x)*4; out.data[d]=c[0];out.data[d+1]=c[1];out.data[d+2]=c[2];out.data[d+3]=255;
}
writeFileSync(dst,PNG.sync.write(out));
console.log('white>=190 yellow175-189 green170-174 blue163-169 magenta140-162 violet90-139 orange20-89');
