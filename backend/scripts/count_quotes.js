const fs=require('fs');const p=require('path').join(__dirname,'..','src','routes','requests.js');const s=fs.readFileSync(p,'utf8');let inSingle=false,inDouble=false,inBack=false,esc=false,line=1;let single=0,double=0,back=0;for(let i=0;i<s.length;i++){const ch=s[i];if(ch==='\n')line++;if(!inSingle && !inDouble && !inBack && ch==='/'){const n=s[i+1]||''; if(n==='/' ){ // line comment
    while(i<s.length && s[i] !== '\n') i++; continue;
  } if(n==='*'){ // block comment
    i+=2; while(i<s.length && !(s[i]==='*' && s[i+1]==='/')){ if(s[i]==='\n')line++; i++; } i+=1; continue; }
}
if(!inSingle && !inDouble && !inBack && ch==="'"){inSingle=true; single++; esc=false; continue;} if(inSingle){ if(ch==='\\' && !esc) esc=true; else if(ch==="'" && !esc){ inSingle=false;} else esc=false; continue; }
if(!inSingle && !inDouble && !inBack && ch==='"'){inDouble=true; double++; esc=false; continue;} if(inDouble){ if(ch==='\\' && !esc) esc=true; else if(ch==='"' && !esc){ inDouble=false;} else esc=false; continue; }
if(!inSingle && !inDouble && !inBack && ch==='`'){ inBack=true; back++; esc=false; continue;} if(inBack){ if(ch==='\\' && !esc) esc=true; else if(ch==='`' && !esc){ inBack=false;} else esc=false; continue; }}
console.log('single quotes:', single, 'double quotes:', double, 'backticks:', back);