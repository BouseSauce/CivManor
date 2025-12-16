import React from 'react';

export default function DashboardLayout({ user, onLogout, children, onQuick, empireSummary }) {
  return (
    <div className="dashboard-root">
      <aside className="sidebar panel">
        <div className="panel-header">Quick Actions</div>
        <div className="sidebar-body">
          {empireSummary && (
            <div className="quick-summary" style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Empire Summary</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontSize: 13 }}><strong>Population:</strong> {empireSummary.population}</div>
                <div style={{ fontSize: 13 }}><strong>Food:</strong> {empireSummary.food}</div>
                <div style={{ fontSize: 13 }}><strong>Stone:</strong> {empireSummary.stone}</div>
                <div style={{ fontSize: 13 }}><strong>Carts:</strong> {empireSummary.carts}</div>
              </div>
            </div>
          )}
          <button className="btn" onClick={() => onQuick('world')}>World Browser</button>
          <button className="btn" onClick={() => onQuick('empire')}>My Empire</button>
          <button className="btn" onClick={() => onQuick('settings')}>Settings</button>
          <button className="btn" onClick={() => onQuick('research')}>Research</button>
          <button className="btn" onClick={() => onQuick('messages')}>Messages</button>
          <button className="btn" onClick={() => onQuick('notifications')}>Notifications</button>
          <div className="user-block">
            <div style={{ marginBottom: 6 }}>Logged in as</div>
            <div style={{ fontWeight: 'bold' }}>{user?.username}</div>
            <div style={{ marginTop: 8 }}>
              <button className="btn" onClick={onLogout}>Logout</button>
            </div>
          </div>
        </div>
      </aside>

      <main className="dashboard-main">
        {children}
      </main>
    </div>
  );
}
