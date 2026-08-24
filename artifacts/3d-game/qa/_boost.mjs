import fs from 'fs'; import { PNG } from 'pngjs';
const [,,src,dst,X,Y,W,H,GAIN] = process.argv;
const p = PNG.sync.read(fs.readFileSync(src));
const x=+X,y=+Y,w=+W,h=+H,g=+(GAIN||8);
const o = new PNG({width:w,height:h});
// find min per region then amplify
let mn=[255,255,255];
for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++){const s=(p.width*(y+yy)+(x+xx))<<2;for(let c=0;c<3;c++) mn[c]=Math.min(mn[c],p.data[s+c]);}
for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++){const s=(p.width*(y+yy)+(x+xx))<<2,d=(w*yy+xx)<<2;
  for(let c=0;c<3;c++) o.data[d+c]=Math.max(0,Math.min(255,(p.data[s+c]-mn[c])*g));
  o.data[d+3]=255;}
fs.writeFileSync(dst, PNG.sync.write(o));
console.log('min',mn,'->',dst);
