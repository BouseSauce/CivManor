# CivBuilder: OGame x Manor Lords

## How to Run

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Start the Game**:
    You need to run both the Backend (Node.js) and Frontend (Vite) servers.

    **Option A: Separate Terminals**
    -   Terminal 1: `npm run server` (Runs on http://localhost:3000)
    -   Terminal 2: `npm run dev` (Runs on http://localhost:5173)

    **Option B: PowerShell Script**
    -   Run `.\start-game.ps1`

## Architecture

-   **Core Logic**: `src/core/` (Shared simulation logic)
-   **Backend**: `server/server.js` (Express API, holds in-memory game state)
-   **Frontend**: `src/frontend/` (React + Vite)

## Features Implemented

-   **Resource Production**: Timber, Stone, Food, etc. generated every second.
-   **Population Dynamics**: Approval system, Starvation, Growth.
-   **Construction Queue**: Real-time building upgrades with costs and timers.
-   **UI**: Dark/Medieval theme with high data density.
