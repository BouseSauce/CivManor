import React, { useState } from 'react';
import { GameClient } from '../api/client';

export default function AdminPanel({ onRefresh }) {
  const [secret, setSecret] = useState(localStorage.getItem('gb_admin_secret') || '');
  const [status, setStatus] = useState('');
  const [config, setConfig] = useState(null);
  const [grantUserId, setGrantUserId] = useState('');
  const [grantAreaId, setGrantAreaId] = useState('');
  const [grantKey, setGrantKey] = useState('Food');
  const [grantAmount, setGrantAmount] = useState(100);

  const login = () => {
    localStorage.setItem('gb_admin_secret', secret);
    setStatus('Saved admin secret. Use the actions below.');
  };

  const logout = () => {
    localStorage.removeItem('gb_admin_secret');
    setSecret('');
    setStatus('Cleared admin secret');
  };

  const handleComplete = async () => {
    setStatus('Completing builds...');
    try {
      const res = await GameClient.adminCompleteBuildings();
      setStatus('Complete response: ' + JSON.stringify(res));
      if (onRefresh) onRefresh();
    } catch (e) { setStatus('Error: ' + (e?.message || JSON.stringify(e))); }
  };

  const handleCompleteResearch = async () => {
    setStatus('Completing research...');
    try {
      const res = await GameClient.adminCompleteResearch(grantUserId || undefined);
      setStatus('Complete research response: ' + JSON.stringify(res));
      if (onRefresh) onRefresh();
    } catch (e) { setStatus('Error: ' + (e?.message || JSON.stringify(e))); }
  };

  const handleGrant = async () => {
    setStatus('Granting resources...');
    try {
      const payload = { userId: grantUserId || undefined, areaId: grantAreaId || undefined, resources: { [grantKey]: Number(grantAmount) } };
      const res = await GameClient.adminGrant(payload);
      setStatus('Grant response: ' + JSON.stringify(res));
      if (onRefresh) onRefresh();
    } catch (e) { setStatus('Error: ' + (e?.message || JSON.stringify(e))); }
  };

  const handleGetConfig = async () => {
    setStatus('Fetching config...');
    try {
      const c = await GameClient.adminGetConfig();
      setConfig(c);
      setStatus('Fetched config');
    } catch (e) { setStatus('Error: ' + (e?.message || JSON.stringify(e))); }
  };

  return (
    <div className="panel">
      <div className="panel-header">Admin Panel</div>
      <div className="panel-body" style={{ padding: 12 }}>
        <div style={{ marginBottom: 8 }}>
          <label style={{ display: 'block', marginBottom: 6 }}>Admin Password (x-admin-secret)</label>
          <input value={secret} onChange={e => setSecret(e.target.value)} style={{ width: '100%' }} placeholder="Enter admin password" />
          <div style={{ marginTop: 8 }}>
            <button className="btn" onClick={login}>Save</button>
            <button className="btn" onClick={logout} style={{ marginLeft: 8 }}>Clear</button>
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 'bold', marginBottom: 6 }}>Actions</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" onClick={handleComplete}>Complete All Buildings (server)</button>
            <button className="btn" onClick={handleCompleteResearch}>Complete Active Research</button>
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 'bold', marginBottom: 6 }}>Grant Resources</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input placeholder="userId (optional)" value={grantUserId} onChange={e => setGrantUserId(e.target.value)} />
            <input placeholder="areaId (optional)" value={grantAreaId} onChange={e => setGrantAreaId(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input value={grantKey} onChange={e => setGrantKey(e.target.value)} />
            <input type="number" value={grantAmount} onChange={e => setGrantAmount(e.target.value)} />
            <button className="btn" onClick={handleGrant}>Grant</button>
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <button className="btn" onClick={handleGetConfig}>View Server Config</button>
          {config && (
            <pre style={{ marginTop: 8, maxHeight: 240, overflow: 'auto', background: '#fafafa', padding: 8 }}>{JSON.stringify(config, null, 2)}</pre>
          )}
        </div>

        <div style={{ marginTop: 12 }}>
          <div style={{ color: 'var(--text-muted)' }}>{status}</div>
        </div>
      </div>
    </div>
  );
}
