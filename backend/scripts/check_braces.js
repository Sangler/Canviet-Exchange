const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '..', 'src', 'routes', 'requests.js');
const text = fs.readFileSync(p, 'utf8');
const lines = text.split(/\r?\n/);
let depth = 0;
let firstNegative = null;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const opens = (line.match(/\{/g) || []).length;
  const closes = (line.match(/\}/g) || []).length;
  depth += opens - closes;
  if (depth < 0 && firstNegative === null) firstNegative = { line: i + 1, depth };
}
console.log('final depth:', depth);
if (firstNegative) console.log('first negative at line', firstNegative.line, 'depth', firstNegative.depth);
// print lines around where depth is highest
let running = 0; let maxDepth = 0; let maxLine = 0;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const opens = (line.match(/\{/g) || []).length;
  const closes = (line.match(/\}/g) || []).length;
  running += opens - closes;
  if (running > maxDepth) { maxDepth = running; maxLine = i + 1; }
}
console.log('max depth:', maxDepth, 'at line', maxLine);
if (maxLine) {
  const start = Math.max(0, maxLine - 5);
  const end = Math.min(lines.length, maxLine + 5);
  console.log('Context around max depth:');
  for (let i = start; i < end; i++) {
    console.log((i+1).toString().padStart(4, ' ')+':', lines[i]);
  }
}
