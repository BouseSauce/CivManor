import React, { useEffect, useState } from 'react';

const DEFAULT_SETTINGS = {
  population: true,
  assignment: true,
  message: true,
  research: true
};

function loadSettings() {
  try {
    const raw = localStorage.getItem('gb_notifications_settings');
    if (!raw) return DEFAULT_SETTINGS;
    return Object.assign({}, DEFAULT_SETTINGS, JSON.parse(raw));
  } catch (e) { return DEFAULT_SETTINGS; }
}

function saveSettings(s) { try { localStorage.setItem('gb_notifications_settings', JSON.stringify(s)); } catch (e) {} }

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState([]);
  const [settings, setSettings] = useState(loadSettings());

  useEffect(() => {
    const onAreaUpdated = (e) => {
      if (!settings.assignment) return;
      const d = e.detail || {};
      const msg = `Assignments updated for area ${d.areaId}`;
      push({ type: 'assignment', text: msg });
    };

    const onAreaFetched = (e) => {
      if (!settings.population) return;
      const d = e.detail || {};
      // d should contain area and prevPopulation
      if (!d.prevPopulation || !d.area) return;
      const delta = (d.area.population || 0) - d.prevPopulation;
      if (delta === 0) return;
      const text = delta > 0 ? `Population increased by ${delta} in ${d.area.name}` : `Population decreased by ${Math.abs(delta)} in ${d.area.name}`;
      push({ type: 'population', text });
    };

    const onMessage = (e) => {
      if (!settings.message) return;
      const d = e.detail || {};
      push({ type: 'message', text: d.text || 'New message' });
    };

    const onResearch = (e) => {
      if (!settings.research) return;
      const d = e.detail || {};
      push({ type: 'research', text: d.text || 'Research update' });
    };

    window.addEventListener('area:updated', onAreaUpdated);
    window.addEventListener('area:fetched', onAreaFetched);
    window.addEventListener('message:notif', onMessage);
    window.addEventListener('research:notif', onResearch);

    return () => {
      window.removeEventListener('area:updated', onAreaUpdated);
      window.removeEventListener('area:fetched', onAreaFetched);
      window.removeEventListener('message:notif', onMessage);
      window.removeEventListener('research:notif', onResearch);
    };
  }, [settings]);

  function push(n) {
    setNotifications(prev => [{ id: Date.now() + Math.random(), ...n, ts: Date.now() }, ...prev].slice(0, 50));
  }

  const clearAll = () => setNotifications([]);

  const toggle = (k) => {
    const next = { ...settings, [k]: !settings[k] };
    setSettings(next);
    saveSettings(next);
  };

  return (
    <div className="panel">
      <div className="panel-header">Notifications</div>
      <div style={{ padding: 12 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <div style={{ fontWeight: 700 }}>Settings</div>
          <div style={{ marginLeft: 'auto' }}>
            <button className="btn" onClick={clearAll}>Clear</button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
          <label style={{ fontSize: 13 }}><input type="checkbox" checked={settings.population} onChange={() => toggle('population')} /> Population</label>
          <label style={{ fontSize: 13 }}><input type="checkbox" checked={settings.assignment} onChange={() => toggle('assignment')} /> Assignments</label>
          <label style={{ fontSize: 13 }}><input type="checkbox" checked={settings.message} onChange={() => toggle('message')} /> Messages</label>
          <label style={{ fontSize: 13 }}><input type="checkbox" checked={settings.research} onChange={() => toggle('research')} /> Research</label>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {notifications.length === 0 && <div style={{ color: 'var(--text-muted)' }}>No notifications</div>}
          {notifications.map(n => (
            <div key={n.id} style={{ padding: 8, borderRadius: 6, background: 'rgba(255,255,255,0.02)', display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 700 }}>{n.text}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(n.ts).toLocaleString()}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
