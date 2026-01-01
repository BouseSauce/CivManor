
const API_URL = 'http://localhost:3001/api';
const USERNAME = process.argv[2] || ('SimBot_' + Math.floor(Math.random() * 1000000));
const PASSWORD = 'password123';

let token = '';
let areaId = null;
let userId = null;

async function api(endpoint, method = 'GET', body = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
        }
    };
    if (token) {
        options.headers['Authorization'] = `Bearer ${token}`;
    }
    if (body) {
        options.body = JSON.stringify(body);
    }

    try {
        const res = await fetch(`${API_URL}${endpoint}`, options);
        const text = await res.text();
        let data;
        try {
            data = text ? JSON.parse(text) : {};
        } catch (e) {
            console.error(`[JSON ERROR] Failed to parse response from ${endpoint}: ${text.substring(0, 200)}`);
            return { error: 'Invalid JSON' };
        }

        if (!res.ok) {
            return { error: data.error || data.message || `Status ${res.status}`, status: res.status };
        }
        return data;
    } catch (e) {
        console.error(`[FETCH ERROR] ${endpoint}: ${e.message}`);
        return { error: e.message };
    }
}

async function setup() {
    console.log(`\n=== Initializing Simulation Bot: ${USERNAME} ===`);
    
    // 1. Register
    const regRes = await api('/register', 'POST', { username: USERNAME, password: PASSWORD });
    if (regRes.error && !regRes.error.includes('already exists')) {
        console.log(`Registration failed: ${regRes.error}`);
    } else {
        console.log('Registered successfully (or already exists).');
    }

    // 2. Login
    const loginRes = await api('/login', 'POST', { username: USERNAME, password: PASSWORD });
    if (loginRes.error) {
        throw new Error(`Login failed: ${loginRes.error}`);
    }
    token = loginRes.token;
    userId = loginRes.user.id;
    console.log(`Logged in. User ID: ${userId}`);

    // 3. Find or Claim Area
    const areasRes = await api('/areas');
    const regions = areasRes.regions || [];
    
    let ownedArea = null;
    for (const r of regions) {
        for (const a of r.areas) {
            if (a.ownerId === userId) {
                ownedArea = a.id;
                break;
            }
        }
        if (ownedArea) break;
    }

    if (!ownedArea) {
        console.log('Searching for an area to claim...');
        for (const r of regions) {
            for (const a of r.areas) {
                if (!a.ownerId) {
                    const claimRes = await api(`/area/${a.id}/claim`, 'POST');
                    if (!claimRes.error) {
                        ownedArea = a.id;
                        console.log(`Claimed area: ${a.name} (${ownedArea})`);
                        break;
                    }
                }
            }
            if (ownedArea) break;
        }
    }

    if (!ownedArea) throw new Error('Could not find or claim an area.');
    areaId = ownedArea;
    console.log(`Target Area ID: ${areaId}`);
}

async function runSimulation() {
    await setup();

    const GOALS = {
        TownHall: 20,
        Gathering: 15,
        Industry: 10,
        Militia: 1000,
        Scout: 20,
        Spy: 10
    };

    const BUILDING_PRIORITY = [
        // Level 1 Essentials (Build them first)
        { id: 'LoggingCamp', goal: 1 },
        { id: 'StonePit', goal: 1 },
        { id: 'Farmhouse', goal: 1 },
        { id: 'Storehouse', goal: 1 },
        
        // Level 5 Production (Baseline)
        { id: 'LoggingCamp', goal: 5 },
        { id: 'StonePit', goal: 5 },
        { id: 'Farmhouse', goal: 5 },
        
        // Early Town Hall & Housing
        { id: 'TownHall', goal: 5 },
        { id: 'Storehouse', goal: 5 },
        
        // Mid-tier Production
        { id: 'LoggingCamp', goal: 10 },
        { id: 'StonePit', goal: 10 },
        { id: 'Farmhouse', goal: 10 },
        
        // Core progression
        { id: 'TownHall', goal: GOALS.TownHall },
        
        // Secondary Production
        { id: 'LoggingCamp', goal: GOALS.Gathering },
        { id: 'StonePit', goal: GOALS.Gathering },
        { id: 'Farmhouse', goal: GOALS.Gathering },
        
        // Infrastructure
        { id: 'Storehouse', goal: 10 },
        
        // Industry
        { id: 'Sawpit', goal: 10 },
        { id: 'Bloomery', goal: 10 },
        
        // Military & Tech
        { id: 'Barracks', goal: 10 },
        { id: 'Library', goal: 10 },
        { id: 'Watchtower', goal: 5 },
        { id: 'SiegeWorkshop', goal: 5 },
        { id: 'University', goal: 5 },
        { id: 'SteelWorks', goal: 5 }
    ];

    const RESEARCH_PRIORITY = [
        'Basic Sanitation',
        'Hardwood Framing',
        'Fertility Festivals',
        'Preservation'
    ];

    let lastResearchError = '';

    while (true) {
        try {
            const state = await api(`/area/${areaId}`);
            if (state.error) {
                console.log(`Error fetching state: ${state.error}. Retrying in 5s...`);
                await new Promise(r => setTimeout(r, 5000));
                continue;
            }

            const { resources, buildings, units, assignments, stats, queue, missions } = state;
            const currentPop = stats?.currentPop || 0;
            const maxPop = stats?.maxPop || 0;
            const thLvl = buildings.find(b => b.id === 'TownHall')?.level || 0;

            const militiaCount = state.units['Militia'] || 0;
            const scoutCount = state.units['Scout'] || 0;
            const spyCount = state.units['Spy'] || 0;

            // Resource parsing (ensure numbers)
            const res = {
                Timber: Math.floor(resources.Timber || 0),
                Stone: Math.floor(resources.Stone || 0),
                Food: Math.floor(resources.Food || 0),
                Planks: Math.floor(resources.Planks || 0),
                IronIngot: Math.floor(resources.IronIngot || 0),
                Knowledge: Math.floor(resources.Knowledge || 0)
            };

            console.log(`\n--- [${new Date().toLocaleTimeString()}] TH:${thLvl} | Pop:${currentPop}/${maxPop} | Militia:${militiaCount} | Queue:${queue.length} ---`);
            console.log(`Resources: T:${res.Timber} S:${res.Stone} F:${res.Food} P:${res.Planks} I:${res.IronIngot} K:${res.Knowledge}`);
            
            const builtBuildings = buildings.filter(b => b.level > 0);
            console.log(`Buildings: ${builtBuildings.map(b => `${b.id}:L${b.level}`).join(', ')}`);
            
            const activeAssignments = Object.entries(assignments).filter(([_, count]) => count > 0);
            console.log(`Assignments: ${activeAssignments.map(([id, count]) => `${id}:${count}`).join(', ')}`);

            let reasoning = "";
            let nextStep = "";

            // 0. Espionage & Defense
            if (state.proximityAlerts && state.proximityAlerts.length > 0) {
                for (const alert of state.proximityAlerts) {
                    // If not scouted and not already scouting
                    const isScouting = (state.missions || []).some(m => m.type === 'ScoutIncoming' && m.targetMissionId === alert.missionId);
                    if (!alert.scoutedData && !isScouting) {
                        if (res.Knowledge >= 50 && currentPop > 0) {
                            console.log(`[ACTION] Scouting incoming mission: ${alert.missionId}`);
                            await api(`/area/${areaId}/scout-incoming`, 'POST', { targetMissionId: alert.missionId });
                            reasoning += `Scouting incoming attack. `;
                        }
                    }
                    
                    // If scouted and it's a large force, prioritize military
                    if (alert.scoutedData) {
                        const totalUnits = Object.values(alert.scoutedData.units).reduce((a, b) => a + b, 0);
                        if (totalUnits > militiaCount) {
                            reasoning += `Large force detected (${totalUnits} units)! Prioritizing defense. `;
                            // In a real bot, we'd boost Barracks and Militia recruitment here
                        }
                    }
                }
            }

            // 1. Worker Assignment
            let assignOrder = ['LoggingCamp', 'StonePit', 'Farmhouse', 'Farm', 'Sawpit', 'Bloomery', 'Library', 'Smithy', 'TownHall'];
            
            // DYNAMIC ASSIGNMENT:
            // If we are missing a specific resource for our priority, move that building to the front of the assignOrder.
            const currentGoal = BUILDING_PRIORITY.find(g => {
                const b = buildings.find(x => x.id === g.id);
                return b && b.level < g.goal;
            });

            if (currentGoal) {
                const b = buildings.find(x => x.id === currentGoal.id);
                const missingResources = [];
                for (const [rName, amt] of Object.entries(b.upgradeCost || {})) {
                    if ((res[rName] || 0) < amt) missingResources.push(rName);
                }

                // Priority 1: Timber/Stone (Core construction)
                if (missingResources.includes('Timber')) {
                    assignOrder = ['LoggingCamp', ...assignOrder.filter(id => id !== 'LoggingCamp')];
                    reasoning += "Missing Timber for priority, boosting LoggingCamp. ";
                }
                if (missingResources.includes('Stone')) {
                    assignOrder = ['StonePit', ...assignOrder.filter(id => id !== 'StonePit')];
                    reasoning += "Missing Stone for priority, boosting StonePit. ";
                }

                // Priority 2: Food (Only if low or specifically needed)
                // If food is very high (> 5000), deprioritize Farmhouse to the end
                if (res.Food > 5000) {
                    assignOrder = [...assignOrder.filter(id => id !== 'Farmhouse' && id !== 'Farm'), 'Farmhouse', 'Farm'];
                    reasoning += "Food is abundant (>5000), deprioritizing Farmhouse. ";
                } else if (res.Food < 500 || missingResources.includes('Food')) {
                    assignOrder = ['Farmhouse', 'Farm', ...assignOrder.filter(id => id !== 'Farmhouse' && id !== 'Farm')];
                    reasoning += "Food is low or needed, boosting Farmhouse. ";
                }

                // Priority 3: Industry (If we have raw materials but need refined)
                if (missingResources.includes('Planks') && res.Timber > 200) {
                    assignOrder = ['Sawpit', ...assignOrder.filter(id => id !== 'Sawpit')];
                    reasoning += "Missing Planks, boosting Sawpit. ";
                }
                if (missingResources.includes('IronIngot') && res.Stone > 200) {
                    assignOrder = ['Bloomery', ...assignOrder.filter(id => id !== 'Bloomery')];
                    reasoning += "Missing IronIngot, boosting Bloomery. ";
                }
            }

            let currentIdle = currentPop;
            const newAssignments = {};

            // Phase 1: Minimum 1 worker per active building (except deprioritized ones)
            for (const bId of assignOrder) {
                if (currentIdle <= 0) break;
                const b = buildings.find(x => x.id === bId);
                if (!b || b.level === 0) continue;
                if (bId === 'TownHall') continue; 

                // If food is abundant, don't even give the minimum to Farmhouse yet
                if (res.Food > 5000 && (bId === 'Farmhouse' || bId === 'Farm')) continue;

                newAssignments[bId] = 1;
                currentIdle--;
            }

            // Phase 2: Fill up based on priority
            for (const bId of assignOrder) {
                if (currentIdle <= 0) break;
                const b = buildings.find(x => x.id === bId);
                if (!b || b.level === 0) continue;

                const cap = b.maxAssign || 0;
                const current = newAssignments[bId] || 0;
                const space = cap - current;
                
                // If food is abundant, cap Farmhouse at 1 worker max unless it's the only thing left
                let effectiveSpace = space;
                if (res.Food > 5000 && (bId === 'Farmhouse' || bId === 'Farm')) {
                    effectiveSpace = Math.max(0, 1 - current);
                }

                const toAdd = Math.min(currentIdle, effectiveSpace);
                
                if (toAdd > 0) {
                    newAssignments[bId] = current + toAdd;
                    currentIdle -= toAdd;
                }
            }

            // Phase 3: Dump remaining idle workers into the first available building in priority
            if (currentIdle > 0) {
                for (const bId of assignOrder) {
                    if (currentIdle <= 0) break;
                    const b = buildings.find(x => x.id === bId);
                    if (!b || b.level === 0) continue;
                    
                    const cap = b.maxAssign || 0;
                    const current = newAssignments[bId] || 0;
                    const space = cap - current;
                    const toAdd = Math.min(currentIdle, space);
                    
                    if (toAdd > 0) {
                        newAssignments[bId] = current + toAdd;
                        currentIdle -= toAdd;
                    }
                }
            }

            // Only call API if assignments changed
            for (const bId of assignOrder) {
                const target = newAssignments[bId] || 0;
                const current = assignments[bId] || 0;
                if (target !== current) {
                    console.log(`[ACTION] Reassigning ${bId}: ${current} -> ${target}`);
                    await api(`/area/${areaId}/assign`, 'POST', { buildingId: bId, count: target });
                }
            }

            // 2. Construction Logic (Strict Priority)
            if (queue.length < 3) { 
                let foundAction = false;

                // STORAGE CHECK: If we are near capacity, prioritize Storehouse
                const storehouse = buildings.find(b => b.id === 'Storehouse');
                const caps = storehouse?.storageBase || {};
                let nearCap = false;
                for (const [rName, cap] of Object.entries(caps)) {
                    const currentCap = cap * Math.pow(storehouse.storageMultiplier || 1.15, storehouse.level - 1);
                    if (res[rName] > currentCap * 0.9) {
                        nearCap = true;
                        break;
                    }
                }

                const effectivePriority = nearCap 
                    ? [{ id: 'Storehouse', goal: storehouse.level + 1 }, ...BUILDING_PRIORITY]
                    : BUILDING_PRIORITY;

                for (const goal of effectivePriority) {
                    const b = buildings.find(x => x.id === goal.id);
                    if (!b) continue;

                    if (b.level >= goal.goal) continue;
                    
                    if (queue.some(q => q.id === goal.id)) {
                        reasoning += `${goal.id} is already being upgraded. `;
                        nextStep = `Wait for ${goal.id} upgrade to finish.`;
                        break; 
                    }

                    if (b.isLocked) continue; 

                    let canAfford = true;
                    let missing = [];
                    const upgradeCost = b.upgradeCost || {};
                    
                    for (const [rName, amt] of Object.entries(upgradeCost)) {
                        if ((res[rName] || 0) < amt) {
                            canAfford = false;
                            missing.push(`${rName} (${res[rName]}/${amt})`);
                        }
                    }

                    if (canAfford) {
                        reasoning += `Can afford priority upgrade: ${goal.id} to level ${b.level + 1}. `;
                        nextStep = `Upgrade ${goal.id}.`;
                        console.log(`[ACTION] Upgrading ${goal.id} to level ${b.level + 1}...`);
                        const upRes = await api(`/area/${areaId}/upgrade`, 'POST', { buildingId: goal.id });
                        if (!upRes.error) {
                            foundAction = true;
                            break; 
                        } else {
                            console.log(`[ERROR] Upgrade failed: ${upRes.error}`);
                        }
                    } else {
                        // SUPPORT UPGRADE LOGIC:
                        // If we are stalled on a priority, check if we can afford to upgrade a resource building
                        // that produces the missing resource. This speeds up the "wait" time.
                        const resourceBuildings = [
                            { id: 'LoggingCamp', produces: 'Timber' },
                            { id: 'StonePit', produces: 'Stone' },
                            { id: 'Farmhouse', produces: 'Food' }
                        ];

                        let supportAction = false;
                        for (const resBInfo of resourceBuildings) {
                            // Only consider if we are missing the resource this building produces
                            if (!missing.some(m => m.startsWith(resBInfo.produces))) continue;

                            const resB = buildings.find(x => x.id === resBInfo.id);
                            if (!resB || resB.level >= 20) continue; // Don't over-invest in support

                            // Check if we can afford THIS support upgrade
                            let canAffordSupport = true;
                            const supportCost = resB.upgradeCost || {};
                            for (const [rName, amt] of Object.entries(supportCost)) {
                                if ((res[rName] || 0) < amt) { canAffordSupport = false; break; }
                            }

                            if (canAffordSupport) {
                                reasoning += `Stalled on ${goal.id}, but can afford ${resBInfo.id} Lvl ${resB.level + 1} to boost ${resBInfo.produces}. `;
                                nextStep = `Upgrade ${resBInfo.id} (Support Upgrade).`;
                                console.log(`[ACTION] Support Upgrade: ${resBInfo.id} to level ${resB.level + 1}...`);
                                const upRes = await api(`/area/${areaId}/upgrade`, 'POST', { buildingId: resBInfo.id });
                                if (!upRes.error) {
                                    supportAction = true;
                                    break;
                                }
                            }
                        }

                        if (supportAction) {
                            foundAction = true;
                            break;
                        }

                        reasoning += `Highest priority is ${goal.id} Lvl ${b.level + 1}, but missing resources. `;
                        nextStep = `Save resources for ${goal.id}: Missing ${missing.join(', ')}`;
                        break; 
                    }
                }
            } else {
                reasoning += "Construction queue is full. ";
                nextStep = "Wait for construction to complete.";
            }

            // 3. Research Logic
            const userRes = await api('/user/me'); 
            if (userRes.error) {
                console.error(`[RESEARCH ERROR] Could not fetch user info: ${userRes.error}`);
            } else if (userRes && !userRes.activeResearch) {
                let researchAttempted = false;
                for (const techId of RESEARCH_PRIORITY) {
                    const researched = userRes.researchedTechs || [];
                    if (researched.includes(techId)) continue;

                    researchAttempted = true;
                    const resStart = await api('/research/start', 'POST', { techId });
                    if (!resStart.error) {
                        console.log(`[ACTION] Started Research: ${techId}`);
                        lastResearchError = '';
                        break;
                    } else {
                        const errMsg = `Research ${techId} failed: ${resStart.error}`;
                        if (errMsg !== lastResearchError) {
                            console.log(`[RESEARCH] ${errMsg}`);
                            lastResearchError = errMsg;
                        }
                    }
                }
            } else if (userRes.activeResearch) {
                reasoning += `Researching ${userRes.activeResearch.techId}. `;
            }

            console.log(`Reasoning: ${reasoning || "No specific reasoning."}`);
            console.log(`Next Step: ${nextStep || "Continue gathering resources."}`);

            // 4. Recruitment Logic
            if (queue.length < 4) {
                // Militia
                if (militiaCount < GOALS.Militia) {
                    const barracks = buildings.find(b => b.id === 'Barracks');
                    if (barracks && barracks.level > 0) {
                        const count = 20; // Recruit in larger batches
                        if (res.Food > 1000 && res.Timber > 500) {
                            console.log(`[ACTION] Recruiting ${count} Militia...`);
                            await api(`/area/${areaId}/recruit`, 'POST', { unitId: 'Militia', count });
                            reasoning += `Recruiting ${count} Militia. `;
                        }
                    }
                }

                // Scouts
                if (scoutCount < GOALS.Scout) {
                    const watchtower = buildings.find(b => b.id === 'Watchtower');
                    if (watchtower && watchtower.level >= 1) {
                        const count = 5;
                        if (res.Food > 500 && res.Timber > 200) {
                            console.log(`[ACTION] Recruiting ${count} Scouts...`);
                            await api(`/area/${areaId}/recruit`, 'POST', { unitId: 'Scout', count });
                            reasoning += `Recruiting ${count} Scouts. `;
                        }
                    }
                }

                // Spies
                if (spyCount < GOALS.Spy) {
                    const watchtower = buildings.find(b => b.id === 'Watchtower');
                    if (watchtower && watchtower.level >= 20) {
                        const count = 2;
                        if (res.Knowledge > 200 && res.Food > 100) {
                            console.log(`[ACTION] Recruiting ${count} Spies...`);
                            await api(`/area/${areaId}/recruit`, 'POST', { unitId: 'Spy', count });
                            reasoning += `Recruiting ${count} Spies. `;
                        }
                    }
                }
            }

            // 5. Expedition Logic (Resource gathering)
            const activeExpeditions = (missions || []).filter(m => m.type === 'Expedition').length;
            // Send expeditions if we have idle villagers and space for more missions
            if (currentIdle >= 5 && activeExpeditions < 3) {
                const worldRes = await api('/areas');
                if (worldRes && worldRes.regions) {
                    const myRegion = worldRes.regions.find(r => r.areas.some(a => a.id === areaId));
                    const target = myRegion?.areas.find(a => !a.ownerId && a.id !== areaId);

                    if (target) {
                        const villagersToSend = Math.min(currentIdle, 20); // Send up to 20 villagers for better loot
                        console.log(`[ACTION] Sending expedition to ${target.name} with ${villagersToSend} villagers for resources...`);
                        await api(`/area/${areaId}/launch-expedition`, 'POST', { 
                            targetAreaId: target.id, 
                            units: { Villager: villagersToSend } 
                        });
                        reasoning += `Sent expedition to ${target.name} for resources. `;
                    }
                }
            }

            await new Promise(r => setTimeout(r, 2000));

        } catch (e) {
            console.error(`Simulation Loop Error: ${e.message}`);
            await new Promise(r => setTimeout(r, 5000));
        }
    }
}

runSimulation().catch(console.error);
