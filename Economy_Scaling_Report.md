# Economy & Scaling Analysis

## Current State Analysis

### 1. Cost vs. Production Scaling
*   **Cost Formula:** $Cost_{L+1} = Base \times 1.5^L$
*   **Production Formula:** $Prod_L = (BaseRate \times Workers) \times L \times 1.1^L$
*   **Observation:** Costs grow significantly faster than production.
    *   At Level 10, upgrading costs ~57x base. Production is ~26x base.
    *   At Level 20, upgrading costs ~3,325x base. Production is ~134x base.
    *   **Result:** The "grind" increases exponentially. While typical for idle games, the gap widens too quickly, potentially stalling progress around Level 10-15.

### 2. Build Time Scaling
*   **Formula:** $Time_{L+1} = BaseTime \times 1.5^L$
*   **Observation:** The 1.5 exponent is very aggressive for time.
    *   **Level 1:** 5 minutes
    *   **Level 10:** ~4.8 hours
    *   **Level 20:** ~11.5 days
*   **Result:** Without mechanics to speed up construction (e.g., assigning multiple builders), players will hit a "time wall" where gameplay becomes purely waiting.

### 3. Storage vs. Cost
*   **Storage:** Scales by $1.8^L$
*   **Cost:** Scales by $1.5^L$
*   **Result:** **Healthy.** Storage grows faster than costs, so players will always have enough capacity to afford the next upgrade (provided they upgrade their Storehouse).

### 4. Population & Housing
*   **Housing:** Linear growth (+15 per Town Hall level).
*   **Cost:** Exponential ($1.5^L$).
*   **Result:** The "Cost per Villager" skyrockets.
    *   Level 1: ~33 resources per new slot.
    *   Level 6: ~253 resources per new slot.
    *   This creates a strong soft cap on population, which in turn limits the workforce available to overcome the production deficits mentioned in point #1.

---

## Recommendations

### Suggestion 1: Soften the "Time Wall"
Reduce the build time exponent from **1.5** to **1.2** or **1.25**.
*   *Current (1.5):* Lvl 10 = 4.8 hours
*   *Proposed (1.25):* Lvl 10 = ~45 minutes
*   *Proposed (1.25):* Lvl 20 = ~4 hours
*   This keeps late-game builds significant but achievable within a daily session context.

### Suggestion 2: Boost Production Scaling
Increase the production multiplier from **1.1** to **1.2** or add "Milestone Bonuses".
*   *Option A:* Change formula to $L \times 1.2^L$. This narrows the gap with cost scaling.
*   *Option B:* Keep base scaling but add a x2 multiplier every 10 levels.

### Suggestion 3: Dynamic Housing Scaling
Allow Town Hall housing to scale slightly better than linear, or reduce Town Hall cost scaling.
*   *Proposal:* Add a small multiplier to housing: `Housing = Base + (Level * 15 * 1.1^Level)`.

### Suggestion 4: Gold Generation
Current Gold income (0.5 gold/pop/hour) is quite low relative to costs (e.g., Trade Broker = 20 Gold).
*   *Proposal:* Scale Gold income with **Town Hall Level** or **Approval**.
*   *Formula:* `Gold = Pop * TaxRate * (Base + (TownHallLevel * 0.1))`

### Suggestion 5: "Builder" Assignment
Allow assigning villagers to the "Construction" task to reduce build times.
*   *Mechanic:* `EffectiveTime = BaseTime / (1 + AssignedBuilders)`.
*   This gives players agency over the "Time Wall".

---

## Proposed Code Changes

### 1. Update `src/core/logic/scaling.js`
Change build time calculation to use a lower exponent.

```javascript
export function calculateBuildTime(buildingId, currentLevel) {
    // ...
    // Reduce exponent from config.growthFactor (usually 1.5) to fixed 1.25 for time
    const timeGrowthFactor = 1.25; 
    return Math.floor(baseTimeSeconds * Math.pow(timeGrowthFactor, currentLevel));
}
```

### 2. Update `src/core/gameLoop.js`
Boost production scaling.

```javascript
// In calculateProduction
// Change 1.1 to 1.15 or 1.2
return (baseRate * workers) * level * Math.pow(1.15, level) * seconds;
```

### 3. Update `src/core/logic/economy.js`
Scale tax income with Town Hall level (requires passing TH level to function).

```javascript
export function calculateTaxIncome(pop, taxRate, townHallLevel = 1) {
    const base = 0.5;
    const multiplier = 1 + (townHallLevel * 0.1); // +10% per TH level
    // ...
}
```
