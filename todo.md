# Project Plan: OGame x Manor Lords

## Phase 1: Foundation & Data Structures
- [x] **Project Setup**: Initialize repository structure (Frontend/Backend separation or Monolith).
- [x] **Data Structures**:
    - [x] Implement `ResourceEnum` (T1-T4 resources).
    - [ ] Implement `ResourceStack` class.
    - [x] Implement `UnitTypeEnum`.
- [x] **Configuration**:
    - [x] Create `BUILDING_CONFIG` with Growth Factors ($GF$).
    - [x] Create `BUILDING_PREREQS` (Tech Tree logic).

## Phase 2: Core Logic & Simulation
- [x] **Scaling Logic**:
    - [x] Implement `calculateUpgradeCost` (Universal Formula).
- [x] **Economy & Population**:
    - [x] Implement `calculateApproval` (Pop, Capacity, Food, Tax).
    - [x] Implement `processPopulationTick` (Starvation, Growth/Decline).
- [x] **Military & Logistics**:
    - [x] Implement `calculateNetDamage` (Combat formula).
    - [x] Implement `determineTargetingOrder` (Priority sorting).
    - [x] Implement `calculateTravelTime` (Distance & Penalties).

## Phase 3: UI Implementation (OGame Style)
- [x] **Layout Skeleton**: CSS Grid/Flexbox layout for high data density.
- [x] **Components**:
    - [x] `AreaHeaderBar`: Resource display.
    - [x] `AreaOverviewPanel`: Stats (Pop, Approval) and Queue.
    - [x] `AreaManagementPanel` / `ManagementPanel`: Building/Unit cards with status states.

## Phase 4: Integration & Game Loop
- [x] **Game Loop**: Tick system for resource generation and population updates.
- [x] **State Management**: Central store for game state (Resources, Buildings, Units) — prototype in-memory implementation.
- [ ] **Save/Load**: LocalStorage persistence (partial: auth token; full game save not implemented).

## Phase 5: UI/UX & Polish
- [x] **Building Detail Panel**:
    - [x] Refactor to "Dark Parchment" aesthetic.
    - [x] Fix React rendering bugs (null checks).
- [x] **World Map**:
    - [x] Switch to Pointy-Topped Hexes.
    - [x] Implement Meta-Spiral Layout (Hexagonal board of hexagonal regions).
    - [x] Fix alignment issues with Absolute Positioning.
    - [x] Implement "Board Game" visuals (Red enemy borders, gold player borders, owner badges).
    - [x] Remove gaps/dead tiles.
    - [x] Improve readability (Top-down view, larger icons).
- [x] **UI Refactoring (Dark Walnut & Parchment)**:
    - [x] Global CSS Theme (`.beveled-panel`, `.standard-card`, `Cinzel`, `EB Garamond`).
    - [x] Dashboard Layout (Chassis).
    - [x] Map Tab (`RegionView`, `WorldBrowser`).
    - [x] Buildings Tab (`QueuePanel`, `BuildingDetailPanel`, `BuildingCard`).
    - [x] Military Tab (`MilitaryPanel`).
    - [x] Research Tab (`TechTree`, `ResearchStrip`, `ResearchCard`, `ResearchPanel`).

## Notes & Next Tasks
- Remaining near-term work:
  - Implement `ResourceStack` helper (if needed).
  - Add local persistence for game state (save/load).
  - Wire frontend to show ` /api/account` inventory and disable Claim when no carts remain.
  - Improve unit naming (e.g., add `CivilizationCart` alias if desired).

_Updated: 2025-12-16_
