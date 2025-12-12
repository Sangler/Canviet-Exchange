const fs=require('fs');const path=require('path');const src=path.join(__dirname,'..','src','routes','requests.js');const s=fs.readFileSync(src,'utf8');
function tokenizeIgnoreStrings(text){
  const tokens=[];let i=0; let inS=false,inD=false,inB=false,esc=false;
  while(i<text.length){const ch=text[i]; if(!inS && !inD && !inB && ch==='/'){const n=text[i+1]||''; if(n==='/' ){ // line comment
      while(i<text.length && text[i] !== '\n') i++; tokens.push({type:'newline'}); i++; continue; } if(n==='*'){ i+=2; while(i<text.length && !(text[i]==='*' && text[i+1]==='/')) i++; i+=2; continue; }}
    if(!inS && !inD && !inB && ch==='"'){ inD=true; i++; continue;} if(inD){ if(ch==='\\') { i+=2; continue;} if(ch==='"'){ inD=false; i++; continue;} i++; continue; }
    if(!inS && !inD && !inB && ch==="'"){ inS=true; i++; continue;} if(inS){ if(ch==='\\'){ i+=2; continue;} if(ch==="'"){ inS=false; i++; continue;} i++; continue; }
    if(!inS && !inD && !inB && ch==='`'){ inB=true; i++; continue;} if(inB){ if(ch==='\\'){ i+=2; continue;} if(ch==='`'){ inB=false; i++; continue;} i++; continue; }
    tokens.push({type:'char',ch,idx:i}); i++; }
  return tokens;
}
const txt=s; const tokens=tokenizeIgnoreStrings(txt);
// Reconstruct simple string skipping whitespace
function isAlpha(c){return /[a-zA-Z_]/.test(c);} 
const textChars = tokens.map(t=>t.type==='char'?t.ch:'\n').join('');
// find all 'try' occurrences (as word) in textChars
const tryPositions=[]; for(let i=0;i<textChars.length-2;i++){ if(textChars.substr(i,3)==='try'){ const pre=textChars[i-1]||' '; const post=textChars[i+3]||' '; if(!isAlpha(pre) && !isAlpha(post)) tryPositions.push(i); }}
function findMatchingBrace(startIdx){ // startIdx points at opening '{' position in text
  let depth=0; for(let i=startIdx;i<textChars.length;i++){ const ch=textChars[i]; if(ch==='{') depth++; else if(ch==='}') { depth--; if(depth===0) return i; }} return -1; }
const unmatched=[];
for(const pos of tryPositions){ // find next '{' after pos
  const after = textChars.indexOf('{', pos); if(after===-1){ unmatched.push({pos,reason:'no opening brace'}); continue;} const match = findMatchingBrace(after); if(match===-1){ unmatched.push({pos, reason:'no matching closing brace'}); continue;} // find next non-space token after match
  let j=match+1; while(j<textChars.length && /[\s]/.test(textChars[j])) j++; const next3 = textChars.substr(j,5);
  if(next3.startsWith('catch') || next3.startsWith('finally')){ continue; } else { unmatched.push({pos, braceOpen:after, braceClose:match, nextSnippet: textChars.substr(j,20)}); }
}
console.log('try positions:', tryPositions.length, 'unmatched:', unmatched.length);
if(unmatched.length>0) console.log(unmatched[0]);
