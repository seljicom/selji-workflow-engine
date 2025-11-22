
const fs = require('fs');
const path = './src/version.ts';
let txt = fs.readFileSync(path,'utf8');
let match = txt.match(/'(\d+)\.(\d+)\.(\d+)'/);
let [_,maj,min,pat]=match;
pat = Number(pat)+1;
const newV = `'${maj}.${min}.${pat}'`;
txt = txt.replace(/'\d+\.\d+\.\d+'/, newV);
fs.writeFileSync(path, txt);
console.log("Version bumped to", newV);
