const API_BASE_URL = 'http://localhost:3001/api';

let _token = null;

function authHeaders() {
    const h = { 'Content-Type': 'application/json' };
    if (_token) h['Authorization'] = `Bearer ${_token}`;
    return h;
}

export const GameClient = {
    setToken(token) { _token = token; },
    getToken() { return _token; },

    async authFetch(path, opts = {}) {
        const headers = Object.assign({}, opts.headers || {}, authHeaders());
        const response = await fetch(`${API_BASE_URL}${path}`, Object.assign({}, opts, { headers }));

        // If unauthorized, clear token and redirect to login so user can re-authenticate
        if (response.status === 401) {
            _token = null;
            try { localStorage.removeItem('gb_token'); } catch(e) {}
            // Redirect to login page
            if (typeof window !== 'undefined') window.location.href = '/login';
            const text401 = await response.text().catch(() => 'Unauthorized');
            throw { message: 'Unauthorized', error: text401 };
        }

        const text = await response.text();
        try {
            const json = text ? JSON.parse(text) : null;
            if (!response.ok) throw json || { message: response.statusText };
            return json;
        } catch (err) {
            if (response.ok) return text;
            throw err;
        }
    },

    // Legacy: fetch global demo gamestate
    async getGameState() {
        return await this.authFetch('/gamestate', { method: 'GET' });
    },

    async upgradeBuilding(buildingId) {
        return await this.authFetch('/upgrade', { method: 'POST', body: JSON.stringify({ buildingId }) });
    },

    async register(username, password) {
        return await this.authFetch('/register', { method: 'POST', body: JSON.stringify({ username, password }) });
    },

    async login(username, password) {
        const result = await this.authFetch('/login', { method: 'POST', body: JSON.stringify({ username, password }) });
        if (result && result.token) {
            _token = result.token;
        }
        return result;
    },

    async createTestAccount() {
        const result = await this.authFetch('/create-test-account', { method: 'POST' });
        if (result && result.token) {
            _token = result.token;
        }
        return result;
    },

    async listAreas(expandOwners = false) {
        const path = expandOwners ? '/areas?expand=owners' : '/areas';
        return await this.authFetch(path, { method: 'GET' });
    },

    async getArea(areaId) {
        return await this.authFetch(`/area/${areaId}`, { method: 'GET' });
    }

    ,
    async assignWorkers(areaId, buildingId, count) {
        return await this.authFetch(`/area/${areaId}/assign`, { method: 'POST', body: JSON.stringify({ buildingId, count }) });
    }
  ,
    async claimArea(areaId, name) {
        const body = name ? { name } : {};
        return await this.authFetch(`/area/${areaId}/claim`, { method: 'POST', body: JSON.stringify(body) });
    },

    async upgradeArea(areaId, buildingId) {
        return await this.authFetch(`/area/${areaId}/upgrade`, { method: 'POST', body: JSON.stringify({ buildingId }) });
    }
,
    // New: fetch authenticated account info (id, username, inventory)
    async getAccount() {
        return await this.authFetch('/account', { method: 'GET' });
    }
    ,
    async getResearch() {
        return await this.authFetch('/research', { method: 'GET' });
    },
    async startResearch(techId) {
        return await this.authFetch('/research/start', { method: 'POST', body: JSON.stringify({ techId }) });
    },
    async completeResearch() {
        return await this.authFetch('/research/complete', { method: 'POST' });
    }
};
