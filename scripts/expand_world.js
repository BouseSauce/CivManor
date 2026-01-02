import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, '..', 'data', 'game_save.json');
const BACKUP_FILE = path.join(__dirname, '..', 'data', 'game_save.json.bak.' + Date.now());

function rnd(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

const adj = ['Iron','Silver','Golden','Bright','Shadow','Wind','Storm','River','Stone','Oak','Birch','Raven','Crystal','Sun','Moon','Star','Green','Red','Blue','White'];
const noun = ['Forge','Glen','Hollow','Ford','Vale','Heath','Ridge','Harbor','Cross','Hold','Watch','Hill','Field','Moor','Brook','Gate','Pass','Wood','Cliff','Heights'];
const placeExtras = ['Keep','Hold','Town','Landing','Borough','Port','Village','Market','Rest','Point'];

function makeName() {
  const a = adj[rnd(0, adj.length-1)];
  const n = noun[rnd(0, noun.length-1)];
  if (Math.random() < 0.25) return `${a} ${n} ${placeExtras[rnd(0, placeExtras.length-1)]}`;
  return `${a} ${n}`;
}

async function expand() {
    if (!fs.existsSync(DATA_FILE)) {
        console.error("Save file not found at " + DATA_FILE);
        return;
    }

    console.log("Backing up save to " + BACKUP_FILE);
    fs.copyFileSync(DATA_FILE, BACKUP_FILE);

    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    const areaStates = data.areaStates || {};
    const areaOwners = data.areaOwners || {};

    // Find current max region
    let maxR = 0;
    Object.keys(areaStates).forEach(id => {
        const m = id.match(/^R(\d+):/);
        if (m) {
            const r = parseInt(m[1], 10);
            if (r > maxR) maxR = r;
        }
    });

    console.log(`Current max region: R${maxR}`);
    const startR = maxR + 1;
    const endR = maxR + 10;
    console.log(`Adding regions R${startR} to R${endR}...`);

    let addedAreas = 0;
    for (let ri = startR; ri <= endR; ri++) {
        const regionId = `R${ri}`;
        const areasCount = rnd(12, 15);
        for (let ai = 1; ai <= areasCount; ai++) {
            const areaId = `${regionId}:A${ai}`;
            if (!areaStates[areaId]) {
                areaStates[areaId] = { 
                    id: areaId, 
                    name: makeName() 
                };
                areaOwners[areaId] = null;
                addedAreas++;
            }
        }
    }

    data.areaStates = areaStates;
    data.areaOwners = areaOwners;

    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    console.log(`Successfully added 10 regions and ${addedAreas} new areas.`);
}

expand().catch(console.error);
