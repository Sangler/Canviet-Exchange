const fs=require('fs');const path=require('path');const src=path.join(__dirname,'..','src','routes','requests.js');const out=path.join(__dirname,'tmp.js');const text=fs.readFileSync(src,'utf8');const lines=text.split(/\r?\n/);
const { execSync } = require('child_process');
let lo=1, hi=lines.length, bad=hi;
while(lo<=hi){ const mid=Math.floor((lo+hi)/2); const prefix=lines.slice(0,mid).join('\n'); fs.writeFileSync(out,prefix,'utf8'); try{ execSync(`node --check ${out}`,{stdio:'ignore'}); // ok
 lo=mid+1; }catch(e){ bad=mid; hi=mid-1; }}
console.log('first bad line:', bad);