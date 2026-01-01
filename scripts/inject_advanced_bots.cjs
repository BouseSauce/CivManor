
const fs = require('fs');
const path = require('path');

const SAVE_PATH = path.join(__dirname, '../data/game_save.json');
const bots = ['Bot1', 'Bot2', 'Bot3', 'Bot4', 'Bot5'];

function inject() {
    if (!fs.existsSync(SAVE_PATH)) {
        console.error('Save file not found!');
        return;
    }

    const data = JSON.parse(fs.readFileSync(SAVE_PATH, 'utf8'));
    const botUsers = Object.values(data.users).filter(u => bots.includes(u.username));

    if (botUsers.length < 5) {
        console.error(`Only found ${botUsers.length} bots in save file. Expected 5.`);
        return;
    }

    const unownedAreaIds = Object.keys(data.areaOwners).filter(id => data.areaOwners[id] === null).slice(0, 5);

    if (unownedAreaIds.length < 5) {
        console.error(`Only found ${unownedAreaIds.length} unowned areas. Need 5.`);
        return;
    }

    botUsers.forEach((user, i) => {
        const areaId = unownedAreaIds[i];
        console.log(`Assigning ${areaId} to ${user.username}`);
        
        data.areaOwners[areaId] = user.id;
        
        const state = {
            name: `${user.username}'s Stronghold`,
            tickCount: 0,
            resources: {
                Timber: 5000,
                Stone: 5000,
                Food: 5000,
                Knowledge: 200,
                Coal: 0, Planks: 0, IronIngot: 0, Steel: 0, Horse: 0, Horses: 0, Captives: 0, Villager: 0
            },
            salvagePool: {},
            population: 30,
            housingCapacity: 500,
            taxRate: 0.1,
            approval: 100,
            hasFirewood: true,
            buildings: {
                TownHall: 5,
                LoggingCamp: 5,
                StonePit: 5,
                Storehouse: 2,
                Barracks: 2,
                Farmhouse: 5,
                Sawpit: 0, Bloomery: 0, Library: 0, Watchtower: 0, ArcheryRange: 0, SiegeWorkshop: 0, CharcoalKiln: 0, University: 0, SteelWorks: 0, UrbanDistrict: 0, CitadelWatch: 0, Stable: 0
            },
            units: {
                Villager: 30,
                Militia: 100,
                Spearmen: 0, Knights: 0, Trebuchet: 0, CargoWagon: 1, Scout: 0, ManAtArms: 0, ImperialGuard: 0, Archer: 0, LargeCargoWagon: 0, Mangonel: 0, Spy: 0, Scholar: 0
            },
            assignments: {
                LoggingCamp: 10,
                StonePit: 10,
                Farmhouse: 10,
                TownHall: 0
            },
            missions: [],
            idleReasons: {},
            queue: []
        };

        data.areaStates[areaId] = state;
    });

    fs.writeFileSync(SAVE_PATH, JSON.stringify(data, null, 2));
    console.log('Injection complete.');
}

inject();
