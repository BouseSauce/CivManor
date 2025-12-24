import React, { useEffect, useState } from 'react';
import { GameClient } from '../api/client';

export default function DashboardLayout({ user, onLogout, children, onQuick, empireSummary }) {
  const [notifCount, setNotifCount] = useState(0);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try { const resp = await GameClient.getNotificationCount(); if (mounted) setNotifCount(resp.count || 0); } catch(e){}
    };
    load();

    const onChange = (e) => {
      // If event has detail.unread prefer that, otherwise refetch
      if (e && e.detail && typeof e.detail.unread === 'number') {
        setNotifCount(e.detail.unread);
      } else {
        GameClient.getNotificationCount().then(r => setNotifCount(r.count || 0)).catch(()=>{});
      }
    };
    window.addEventListener('notifications:changed', onChange);
    window.addEventListener('message:notif', onChange);
    return () => { mounted = false; window.removeEventListener('notifications:changed', onChange); window.removeEventListener('message:notif', onChange); };
  }, []);

  return (
    <div className="dashboard-root" style={{ height: '100vh', display: 'flex', justifyContent: 'flex-start', alignItems: 'stretch', padding: '20px' }}>
      <div className="chassis-container" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'row', gap: '20px' }}>
        {/* Sidebar */}
        <aside className="sidebar" style={{ width: '80px', display: 'flex', flexDirection: 'column', gap: '12px', flexShrink: 0 }}>
          <div className="nav-icon" onClick={() => onQuick('empire')} title="Empire"><i className="fa-solid fa-crown"></i></div>
          <div className="nav-icon" onClick={() => onQuick('world')} title="World Map"><i className="fa-solid fa-map"></i></div>
          <div className="nav-icon" onClick={() => onQuick('research')} title="Research"><i className="fa-solid fa-flask"></i></div>
          <div className="nav-icon" onClick={() => onQuick('messages')} title="Messages"><i className="fa-solid fa-envelope"></i></div>
          <div className="nav-icon" onClick={() => onQuick('notifications')} title="Great Archives" style={{ position: 'relative' }}>
            <i className="fa-solid fa-book-bookmark"></i>
            {notifCount > 0 && (
              <div style={{ position: 'absolute', top: -6, right: -6, background: '#b71c1c', color: '#fff', width: 20, height: 20, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', border: '2px solid #3e2723' }}>{notifCount}</div>
            )}
          </div>
          <div className="nav-icon" onClick={() => onQuick('admin')} title="Admin"><i className="fa-solid fa-hammer"></i></div>
          
          <div className="nav-icon nav-icon-settings" onClick={() => onQuick('settings')} title="Settings">
            <i className="fa-solid fa-gear"></i>
          </div>
          <div className="nav-icon nav-icon-logout" onClick={onLogout} title="Logout">
            <i className="fa-solid fa-right-from-bracket"></i>
          </div>
        </aside>

        {/* Main Content - Stacked Parchment */}
        <main className="dashboard-main stacked-parchment" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
