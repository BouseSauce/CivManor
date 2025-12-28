const API_BASE_URL = 'http://localhost:3001/api';

let _token = null;

function authHeaders() {
    const h = { 'Content-Type': 'application/json' };
    if (_token) h['Authorization'] = `Bearer ${_token}`;
    return h;
}

function publicFetch(path, opts = {}) {
    const headers = Object.assign({}, opts.headers || {}, { 'Content-Type': 'application/json' });
    return fetch(`${API_BASE_URL}${path}`, Object.assign({}, opts, { headers }));
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
        let json = null;
        try { json = text ? JSON.parse(text) : null; } catch (e) { /* non-JSON response (HTML/error page) */ }
        if (!response.ok) {
            const payload = (json && typeof json === 'object') ? json : { message: text || response.statusText };
            const message = payload && (payload.message || payload.error || payload.msg) ? (payload.message || payload.error || payload.msg) : (text || response.statusText);
            throw { status: response.status, error: payload, text, message };
        }
        // Return parsed JSON (or null if body empty)
        return json;
    },

    // Admin helper: reads admin secret from localStorage and sends as x-admin-secret
    async adminFetch(path, opts = {}) {
        const adminSecret = (typeof window !== 'undefined') ? localStorage.getItem('gb_admin_secret') : null;
        const headers = Object.assign({}, opts.headers || {}, authHeaders());
        if (adminSecret) headers['x-admin-secret'] = adminSecret;
        const response = await fetch(`${API_BASE_URL}${path}`, Object.assign({}, opts, { headers }));

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
        // Areas listing is public — avoid triggering auth failures on invalid tokens
        const response = await publicFetch(path, { method: 'GET' });
        const text = await response.text();
        let json = null;
        try { json = text ? JSON.parse(text) : null; } catch (e) { /* ignore */ }
        if (!response.ok) throw json || { message: response.statusText };
        return json;
    },

    async getArea(areaId) {
        const resp = await this.authFetch(`/area/${areaId}`, { method: 'GET' });
        try {
            if (typeof window !== 'undefined' && resp) {
                // Provide listeners with previous snapshot (resources + timestamp) to compute deltas
                window.__lastFetchedArea = window.__lastFetchedArea || {};
                window.__lastFetchedAt = window.__lastFetchedAt || {};
                const prevSnapshot = window.__lastFetchedArea[resp.id] || null;
                const prevTs = window.__lastFetchedAt[resp.id] || null;
                window.dispatchEvent(new CustomEvent('area:fetched', { detail: { area: resp, prevSnapshot, prevTs } }));
                // store current snapshot + timestamp for next comparison
                window.__lastFetchedArea[resp.id] = resp;
                window.__lastFetchedAt[resp.id] = Date.now();
            }
        } catch (e) { /* ignore */ }
        return resp;
    },

    async sendMessage(toUserId, subject, body) {
        const resp = await this.authFetch('/messages/send', { method: 'POST', body: JSON.stringify({ toUserId, subject, body }) });
        try {
            if (typeof window !== 'undefined' && resp) {
                window.dispatchEvent(new CustomEvent('message:notif', { detail: { text: `Message sent to ${toUserId}` } }));
                // Also notify that notifications likely changed for recipient side
                window.dispatchEvent(new CustomEvent('notifications:changed'));
            }
        } catch (e) {}
        return resp;
    },

    async getInbox() {
        const resp = await this.authFetch('/messages/inbox', { method: 'GET' });
        try { if (typeof window !== 'undefined' && resp) {
            const unread = (resp.messages || []).filter(m => !m.read).length;
            window.dispatchEvent(new CustomEvent('notifications:changed', { detail: { unread } }));
        } } catch(e){}
        return resp;
    },

    async getNotificationCount() {
        return await this.authFetch('/notifications/count', { method: 'GET' });
    },

    async getNotifications() {
        return await this.authFetch('/notifications', { method: 'GET' });
    },

    async getEspionageReports() {
        return await this.authFetch('/espionage/reports', { method: 'GET' });
    },

    async getIntel(targetAreaId) {
        return await this.authFetch(`/espionage/intel/${targetAreaId}`, { method: 'GET' });
    },

    async sendSpy(targetAreaId, originAreaId) {
        return await this.authFetch('/espionage/spy', { method: 'POST', body: JSON.stringify({ targetAreaId, originAreaId }) });
    },

    async markNotificationRead(notificationId) {
        return await this.authFetch('/notifications/mark-read', { method: 'POST', body: JSON.stringify({ notificationId }) });
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
        try {
            console.log('[GameClient.assignWorkers] sending', { areaId, buildingId, count });
        } catch (e) {}
        const resp = await this.authFetch(`/area/${areaId}/assign`, { method: 'POST', body: JSON.stringify({ buildingId, count }) });
        try {
            if (typeof window !== 'undefined' && resp) {
                        try {
                            window.__lastFetchedArea = window.__lastFetchedArea || {};
                            // Merge updated fields into the last fetched snapshot so UI components reading it see authoritative counts
                            window.__lastFetchedArea[areaId] = Object.assign({}, window.__lastFetchedArea[areaId] || {}, { assignments: resp.assignments, idleReasons: resp.idleReasons || {}, units: resp.units });
                        } catch (e) {}
                        window.dispatchEvent(new CustomEvent('area:updated', { detail: { areaId, assignments: resp.assignments, idleReasons: resp.idleReasons || {}, units: resp.units } }));
                }
        } catch (e) { /* ignore */ }
        return resp;
    },

    async toggleAutoAssign(areaId, buildingId, enabled) {
        const resp = await this.authFetch(`/area/${areaId}/auto-assign`, { method: 'POST', body: JSON.stringify({ buildingId, enabled }) });
        try {
            if (typeof window !== 'undefined' && resp) {
                window.dispatchEvent(new CustomEvent('area:updated', { detail: { areaId, autoAssign: resp.autoAssign } }));
            }
        } catch (e) {}
        return resp;
    },

    async claimArea(areaId, name) {
        const body = name ? { name } : {};
        return await this.authFetch(`/area/${areaId}/claim`, { method: 'POST', body: JSON.stringify(body) });
    },

    async upgradeArea(areaId, buildingId) {
        return await this.authFetch(`/area/${areaId}/upgrade`, { method: 'POST', body: JSON.stringify({ buildingId }) });
    },

    async recruitUnits(areaId, unitType, count) {
        return await this.authFetch(`/area/${areaId}/recruit`, { method: 'POST', body: JSON.stringify({ unitType, count }) });
    },

    async cancelUpgrade(areaId, itemId, itemType = 'Building') {
        // Accept either legacy { buildingId } or new { id, type }
        return await this.authFetch(`/area/${areaId}/cancel-upgrade`, { method: 'POST', body: JSON.stringify({ id: itemId, type: itemType }) });
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
    },

    // Admin endpoints
    async adminCompleteBuildings(areaId) {
        const body = areaId ? { areaId } : {};
        return await this.adminFetch('/admin/complete-buildings', { method: 'POST', body: JSON.stringify(body) });
    },

    async adminGrant(payload) {
        // payload: { userId?, areaId?, resources: { key: amount, ... } }
        return await this.adminFetch('/admin/grant', { method: 'POST', body: JSON.stringify(payload) });
    },

    async adminGetConfig() {
        return await this.adminFetch('/admin/config', { method: 'GET' });
    }
    ,
    async recruit(areaId, unitId, count) {
        return await this.authFetch(`/area/${areaId}/recruit`, { method: 'POST', body: JSON.stringify({ unitId, count }) });
    },

    async attackArea(originAreaId, targetAreaId, units) {
        return await this.authFetch(`/area/${originAreaId}/attack`, { method: 'POST', body: JSON.stringify({ targetAreaId, units }) });
    },

    async launchExpedition(originAreaId, targetAreaId, units) {
        return await this.authFetch(`/area/${originAreaId}/expedition`, { method: 'POST', body: JSON.stringify({ targetAreaId, units }) });
    },

    async launchScout(areaId, targetMissionId) {
        return await this.authFetch(`/area/${areaId}/scout-incoming`, { 
            method: 'POST', 
            body: JSON.stringify({ targetMissionId }) 
        });
    },

    async setRationLevel(areaId, level) {
        return await this.authFetch(`/area/${areaId}/ration-level`, { method: 'POST', body: JSON.stringify({ level }) });
    },

    async buyCivicUpgrade(areaId, buildingId, upgradeId) {
        return await this.authFetch(`/area/${areaId}/civic-upgrade`, { method: 'POST', body: JSON.stringify({ buildingId, upgradeId }) });
    },

    async collectSalvage(targetAreaId, collectorAreaId) {
        return await this.authFetch(`/area/${targetAreaId}/collect-salvage`, { method: 'POST', body: JSON.stringify({ collectorAreaId }) });
    }
};
