const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

const PID_FILE = path.join(__dirname, '..', 'server', '.server.pid');
const PORT = 3001;

function isPortInUse(port) {
    try {
        const output = execSync(`netstat -ano | findstr :${port}`).toString();
        return output.includes('LISTENING');
    } catch (e) {
        return false;
    }
}

function getPidFromPort(port) {
    try {
        const output = execSync(`netstat -ano | findstr :${port}`).toString();
        const lines = output.split('\n');
        for (const line of lines) {
            if (line.includes('LISTENING')) {
                const parts = line.trim().split(/\s+/);
                return parts[parts.length - 1];
            }
        }
    } catch (e) {}
    return null;
}

function isPidRunning(pid) {
    try {
        process.kill(pid, 0);
        return true;
    } catch (e) {
        return false;
    }
}

async function ensureServer() {
    console.log(`Checking if server is running on port ${PORT}...`);

    let existingPid = null;
    if (fs.existsSync(PID_FILE)) {
        existingPid = fs.readFileSync(PID_FILE, 'utf8').trim();
        console.log(`Found PID file with PID: ${existingPid}`);
    }

    const portPid = getPidFromPort(PORT);

    if (portPid) {
        console.log(`Port ${PORT} is in use by PID: ${portPid}`);
        
        if (existingPid && existingPid === portPid) {
            console.log("Server is already running and matches the PID file. No action needed.");
            process.exit(0);
        } else {
            console.log("Port 3001 is in use but doesn't match our PID file (or PID file missing).");
            console.log("This might be an old instance or another process. You may need to kill it manually if it's not the server.");
            // We don't kill it automatically to be safe, but we inform the user.
            process.exit(1);
        }
    }

    console.log("Server not detected on port 3001. Starting server...");
    
    const serverProcess = spawn('node', ['server/server.js'], {
        cwd: path.join(__dirname, '..'),
        detached: true,
        stdio: 'ignore'
    });

    serverProcess.unref();
    console.log(`Server started with PID: ${serverProcess.pid}`);
    process.exit(0);
}

ensureServer();
