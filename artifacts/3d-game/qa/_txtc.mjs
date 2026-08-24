// text-vs-plate contrast: modal colour = plate, 95th-pct luminance = ink.
import fs from 'fs'; import { PNG } from 'pngjs';
const [,,file,...rest]=process.argv;
const p=PNG.sync.read(fs.readFileSync(file));
const lin=(v)=>{v/=255;return v<=0.04045?v/12.92:Math.pow((v+0.055)/1.055,2.4);};
const L=(r,g,b)=>0.2126*lin(r)+0.7152*lin(g)+0.0722*lin(b);
for(let i=0;i<rest.length;i+=5){
 const label=rest[i], x=+rest[i+1],y=+rest[i+2],w=+rest[i+3],h=+rest[i+4];
 const px=[];
 for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++){const o=(p.width*yy+xx)<<2;px.push([p.data[o],p.data[o+1],p.data[o+2]]);}
 const ls=px.map(c=>L(...c)).sort((a,b)=>a-b);
 const lo=ls[Math.floor(ls.length*0.20)], hi=ls[Math.floor(ls.length*0.97)];
 // modal background = median
 const med=ls[Math.floor(ls.length*0.5)];
 const R=(a,b)=>((Math.max(a,b)+0.05)/(Math.min(a,b)+0.05));
 console.log(`${label.padEnd(22)} ink(p97)=${hi.toFixed(4)} plate(median)=${med.toFixed(4)} p20=${lo.toFixed(4)}  ink:plate=${R(hi,med).toFixed(2)}:1  ink:p20=${R(hi,lo).toFixed(2)}:1`);
}
