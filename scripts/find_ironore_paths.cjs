const fs = require('fs');
const path = require('path');
const file = path.resolve(__dirname, '..', 'data', 'game_save.json');
const raw = fs.readFileSync(file, 'utf8');
const data = JSON.parse(raw);
let found = 0;
function walk(obj, p){
  if (found >= 40) return;
  if (Array.isArray(obj)){
    obj.forEach((v,i) => walk(v, p + `[${i}]`));
    return;
  }
  if (obj && typeof obj === 'object'){
    for (const k of Object.keys(obj)){
      if (k === 'IronOre' || k === 'Ore'){
        console.log(`${p}.${k}`);
        found++;
        if (found >= 40) return;
      }
      walk(obj[k], p + `.${k}`);
      if (found >= 40) return;
    }
  }
}
walk(data, 'root');
console.log('Found:', found);
