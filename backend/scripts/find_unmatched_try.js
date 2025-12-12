const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '..', 'src', 'routes', 'requests.js');
const text = fs.readFileSync(p, 'utf8');
let inSingle=false, inDouble=false, inBacktick=false, inLineComment=false, inBlockComment=false, prev='';
let depth=0;
const tries=[];
const catches=[];
for (let i=0;i<text.length;i++){
  const ch = text[i];
  const next = text[i+1] || '';
  // handle comments
  if (!inSingle && !inDouble && !inBacktick) {
    if (!inBlockComment && ch==='/' && next==='/') { inLineComment=true; }
    if (!inLineComment && ch==='/' && next==='*') { inBlockComment=true; i++; prev=''; continue; }
  }
  if (inLineComment) { if (ch==='\n') inLineComment=false; prev=ch; continue; }
  if (inBlockComment) { if (ch==='*' && next==='/') { inBlockComment=false; i++; prev=''; continue; } prev=ch; continue; }
  // handle strings
  if (!inSingle && !inDouble && !inBacktick && ch==="'" ) { inSingle=true; prev=ch; continue; }
  if (inSingle) { if (ch==="'" && prev!=='\\') inSingle=false; prev=ch; continue; }
  if (!inSingle && !inDouble && !inBacktick && ch==='"' ) { inDouble=true; prev=ch; continue; }
  if (inDouble) { if (ch==='"' && prev!=='\\') inDouble=false; prev=ch; continue; }
  if (!inSingle && !inDouble && !inBacktick && ch==='`' ) { inBacktick=true; prev=ch; continue; }
  if (inBacktick) { if (ch==='`' && prev!=='\\') inBacktick=false; prev=ch; continue; }
  // now safe to detect keywords and braces
  // detect 'try' keyword
  if (ch==='t' && text.substr(i,4)==='try ') {
    tries.push({pos:i, depth});
  }
  if (ch==='t' && text.substr(i,4)==='try{') {
    tries.push({pos:i, depth});
  }
  // detect 'catch'
  if (ch==='c' && text.substr(i,6).startsWith('catch')) {
    catches.push({pos:i, depth});
  }
  if (ch==='{' ) depth++;
  if (ch==='}') depth--;
}
console.log('tries:', tries.length, 'catches:', catches.length, 'finalDepth:', depth);
// find tries that don't have catch at same or lower depth
const unmatched = [];
for (let t of tries) {
  // find a catch whose pos > t.pos and depth <= t.depth
  const found = catches.find(c => c.pos > t.pos);
  if (!found) unmatched.push(t);
}
console.log('unmatched tries count:', unmatched.length);
if (unmatched.length>0) console.log('first unmatched try at pos',unmatched[0].pos);
