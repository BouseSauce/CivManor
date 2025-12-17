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

        // If unauthorized, clear token and surface the error for the app to handle
        if (response.status === 401) {
            _token = null;
            try { localStorage.removeItem('gb_token'); } catch(e) {}
            const text401 = await response.text().catch(() => 'Unauthorized');
            // Throw an error so callers can decide how to react (e.g., show login UI)
            throw { message: 'Unauthorized', error: text401, status: 401 };
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
        const resp = await this.authFetch(`/area/${areaId}`, { method: 'GET' });
        try {
            if (typeof window !== 'undefined' && resp) {
                // Allow listeners to detect population changes by including prevPopulation
                const prev = window.__lastFetchedArea && window.__lastFetchedArea[resp.id] ? window.__lastFetchedArea[resp.id].population : null;
                window.dispatchEvent(new CustomEvent('area:fetched', { detail: { area: resp, prevPopulation: prev } }));
                window.__lastFetchedArea = window.__lastFetchedArea || {};
                window.__lastFetchedArea[resp.id] = resp;
            }
        } catch (e) { /* ignore */ }
        return resp;
    },

    async sendMessage(toUserId, subject, body) {
        const resp = await this.authFetch('/messages/send', { method: 'POST', body: JSON.stringify({ toUserId, subject, body }) });
        try {
            if (typeof window !== 'undefined' && resp) {
                window.dispatchEvent(new CustomEvent('message:notif', { detail: { text: `Message sent to ${toUserId}` } }));
            }
        } catch (e) {}
        return resp;
    },

    async getInbox() {
        return await this.authFetch('/messages/inbox', { method: 'GET' });
    },

    async getSent() {
        return await this.authFetch('/messages/sent', { method: 'GET' });
    },

    async listUsers() {
        return await this.authFetch('/users', { method: 'GET' });
    },

    async markMessageRead(messageId) {
        return await this.authFetch('/messages/mark-read', { method: 'POST', body: JSON.stringify({ messageId }) });
    },

    async assignWorkers(areaId, buildingId, count) {
        const resp = await this.authFetch(`/area/${areaId}/assign`, { method: 'POST', body: JSON.stringify({ buildingId, count }) });
        try {
            if (typeof window !== 'undefined' && resp) {
                window.dispatchEvent(new CustomEvent('area:updated', { detail: { areaId, assignments: resp.assignments, units: resp.units } }));
            }
        } catch (e) { /* ignore */ }
        return resp;
    },

    async claimArea(areaId, name) {
        const body = name ? { name } : {};
        return await this.authFetch(`/area/${areaId}/claim`, { method: 'POST', body: JSON.stringify(body) });
    },

    async upgradeArea(areaId, buildingId) {
        return await this.authFetch(`/area/${areaId}/upgrade`, { method: 'POST', body: JSON.stringify({ buildingId }) });
    },

    // New: fetch authenticated account info (id, username, inventory)
    async getAccount() {
        return await this.authFetch('/account', { method: 'GET' });
    },

    async getResearch() {
        return await this.authFetch('/research', { method: 'GET' });
    },

    async startResearch(techId) {
        const resp = await this.authFetch('/research/start', { method: 'POST', body: JSON.stringify({ techId }) });
        try { if (typeof window !== 'undefined' && resp) window.dispatchEvent(new CustomEvent('research:notif', { detail: { text: `Research started: ${techId}` } })); } catch(e){}
        return resp;
    },

    async completeResearch() {
        const resp = await this.authFetch('/research/complete', { method: 'POST' });
        try { if (typeof window !== 'undefined' && resp) window.dispatchEvent(new CustomEvent('research:notif', { detail: { text: `Research complete` } })); } catch(e){}
        return resp;
    }
};
