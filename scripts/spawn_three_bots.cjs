const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SAVE_PATH = path.join(__dirname, '../data/game_save.json');
const BOT_NAMES = ['AutoBotA', 'AutoBotB', 'AutoBotC'];

function ensureSave() {
  if (!fs.existsSync(SAVE_PATH)) {
    console.error('Save file not found:', SAVE_PATH);
    process.exit(1);
  }
}

function load() { return JSON.parse(fs.readFileSync(SAVE_PATH, 'utf8')); }
function save(data) { fs.writeFileSync(SAVE_PATH, JSON.stringify(data, null, 2)); }

function makeBotUser(name) {
  const id = crypto.randomUUID();
  return {
    id,
    username: name,
    password: 'botpass',
    inventory: { resources: {}, units: {}, cartContents: {} },
    researchedTechs: [],
    activeResearch: null,
    messages: [],
    techLevels: {},
    notifications: []
  };
}

function main() {
  ensureSave();
  const data = load();

  data.users = data.users || {};
  data.areaOwners = data.areaOwners || {};
  data.areaStates = data.areaStates || {};

  // Add bot users if missing
  BOT_NAMES.forEach(name => {
    const exists = Object.values(data.users || {}).some(u => u.username === name);
    if (!exists) {
      const bot = makeBotUser(name);
      data.users[bot.id] = bot;
      console.log('Created bot user', name, bot.id);
    } else {
      console.log('Bot user exists:', name);
    }
  });

  // Find unowned areas and assign up to 3
  const unowned = Object.keys(data.areaOwners || {}).filter(id => !data.areaOwners[id]);
  if (unowned.length === 0) {
    console.error('No unowned areas available to assign to bots.');
    save(data);
    return;
  }

  const botUsers = Object.values(data.users).filter(u => BOT_NAMES.includes(u.username));
  for (let i = 0; i < Math.min(botUsers.length, unowned.length); i++) {
    const user = botUsers[i];
    const areaId = unowned[i];
    data.areaOwners[areaId] = user.id;
    // Create a basic areaState for the bot
    data.areaStates[areaId] = {
      name: `${user.username}'s Hold`,
      tickCount: 0,
      resources: { Timber: 2000, Stone: 1500, Food: 2000, Gold: 200 },
      salvagePool: {},
      population: 20,
      housingCapacity: 200,
      taxRate: 0.1,
      approval: 100,
      hasFirewood: true,
      buildings: { TownHall: 2, Farmhouse: 2, LoggingCamp: 2, StonePit: 1, Watchtower: 1 },
      units: { Villager: 20, Militia: 10, SupplyCart: 1, Spy: 0 },
      assignments: { LoggingCamp: 5, Farmhouse: 5 },
      missions: [],
      idleReasons: {},
      queue: [],
      activeSpies: []
    };
    console.log(`Assigned area ${areaId} to bot ${user.username}`);
  }

  save(data);
  console.log('Spawned/assigned bots. Restart server if needed to pick up changes.');
}

main();
