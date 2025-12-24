# Worker Scaling Analysis & Recommendations

## Current Mechanic: Linear Scaling
Currently, production is calculated as:
$$ Production = (BaseRate \times Workers) \times (Level \times 1.15^{Level}) $$

**Characteristics:**
*   **Fixed Marginal Gain:** Adding the 10th villager yields exactly the same increase as adding the 1st villager.
*   **Gameplay Effect:** Players simply "fill up" their highest-level building first. There is no strategic choice between "spreading out" workers vs. "concentrating" them, other than the hard cap on capacity.
*   **Obsolescence:** Lower-level buildings are strictly inferior and are ignored until the main building is full.

## Proposed Improvement: Diminishing Returns ("Crowding")
To make assignment more strategic, we can apply a **diminishing returns** exponent to the worker count. This simulates overcrowding, logistical inefficiencies, or limited workspace.

**Formula:**
$$ Production = BaseRate \times (Level \times 1.15^{Level}) \times (Workers^{0.9}) $$

**Characteristics:**
*   **Decreasing Marginal Gain:** The 1st villager is 100% efficient. The 10th villager might only be ~80% efficient.
*   **Strategic Choice:** It becomes mathematically better to assign the first few workers to a *lower-level* building (if available) than to crowd the last few slots of a high-level building.
*   **"Wide" Playstyle:** Encourages building multiple production sites rather than just one mega-site.

## Comparison Table (Level 5 Farm)

| Workers | Linear Output (Current) | Diminishing Output (Proposed ^0.9) | Efficiency Loss |
| :--- | :--- | :--- | :--- |
| 1 | 100% | 100% | 0% |
| 2 | 200% | 186% | -14% |
| 5 | 500% | 425% | -75% (cumulative) |
| 10 | 1000% | 794% | -206% (cumulative) |

## Alternative: Tiered Efficiency (Thresholds)
Instead of a smooth curve, use thresholds:
*   **Workers 1-5:** 100% Efficiency
*   **Workers 6-10:** 80% Efficiency
*   **Workers 11+:** 50% Efficiency

## Recommendation
I recommend the **Diminishing Returns (Exponent 0.9)** approach. It adds organic depth without complex rules. It naturally balances "Tall" (high level) vs "Wide" (more buildings) strategies.

**Would you like me to apply the Diminishing Returns (0.9 exponent) change to the game loop?**
