import fs from 'fs'; import { PNG } from 'pngjs';
const [,,file,...rest] = process.argv;
const png = PNG.sync.read(fs.readFileSync(file));
// rest = x,y,w,h ... print min/max/mean and the extreme pixels
for (let i=0;i<rest.length;i+=4){
  const x=+rest[i],y=+rest[i+1],w=+rest[i+2],h=+rest[i+3];
  let best=null,bl=-1,dark=null,dl=2;
  let sr=0,sg=0,sb=0,n=0;
  for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++){
    const o=(png.width*yy+xx)<<2; const r=png.data[o],g=png.data[o+1],b=png.data[o+2];
    const L=(0.2126*Math.pow(r/255,2.2)+0.7152*Math.pow(g/255,2.2)+0.0722*Math.pow(b/255,2.2));
    sr+=r;sg+=g;sb+=b;n++;
    if(L>bl){bl=L;best=[r,g,b];}
    if(L<dl){dl=L;dark=[r,g,b];}
  }
  const rel=(L)=>L+0.05;
  console.log(`[${x},${y} ${w}x${h}] mean=(${(sr/n)|0},${(sg/n)|0},${(sb/n)|0})  brightest=(${best})L=${bl.toFixed(4)}  darkest=(${dark})L=${dl.toFixed(4)}  ratio=${(rel(bl)/rel(dl)).toFixed(2)}:1`);
}
