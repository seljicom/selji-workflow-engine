const fs = require('fs');
const path = './src/version.ts';
let txt = fs.readFileSync(path, 'utf8');
const match = txt.match(/'(\d+)\.(\d+)\.(\d+)'/);
if (!match) {
  console.error('Could not find version in version.ts');
  process.exit(1);
}
let [_, major, minor, patch] = match;
const newPatch = Number(patch) + 1;
const newVersion = `'${major}.${minor}.${newPatch}'`;
txt = txt.replace(/'\d+\.\d+\.\d+'/, newVersion);
fs.writeFileSync(path, txt);
console.log('Version bumped to', newVersion);
