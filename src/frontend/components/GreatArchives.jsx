import React, { useEffect, useState } from 'react';
import { GameClient } from '../api/client';

export default function GreatArchives() {
  const [activeTab, setActiveTab] = useState('notifications');
  const [notifications, setNotifications] = useState([]);
  const [espionageReports, setEspionageReports] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const resp = await GameClient.getNotifications();
      const sorted = (resp.notifications || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setNotifications(sorted.map(n => ({ ...n })));
    } catch (e) {
      console.error('Failed to load notifications', e);
    } finally { setLoading(false); }
  };

  const loadEspionage = async () => {
    setLoading(true);
    try {
      const resp = await GameClient.getEspionageReports();
      setEspionageReports(resp.reports || []);
    } catch (e) {
      console.error('Failed to load espionage reports', e);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (activeTab === 'notifications') loadNotifications();
    if (activeTab === 'espionage') loadEspionage();
  }, [activeTab]);

  const markRead = async (id) => {
    try {
      await GameClient.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      window.dispatchEvent(new CustomEvent('notifications:changed'));
    } catch (e) { console.error('Failed to mark notification read', e); }
  };

  const renderReport = (payload) => {
    if (!payload) return null;
    
    if (payload.type === 'spy_report') {
      return (
        <div style={{ marginTop: 8, padding: 8, background: 'rgba(255,255,255,0.02)', borderRadius: 6 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Spy Report</div>
          <div style={{ fontSize: 13 }}><strong>Target:</strong> {payload.targetAreaId}</div>
          <div style={{ marginTop: 6 }}>
            <div style={{ fontWeight: 700 }}>Status</div>
            <div style={{ color: payload.success ? '#4caf50' : '#f44336' }}>
              {payload.success ? `Infiltration Successful (Depth: ${payload.depth})` : 'Spy Captured'}
            </div>
          </div>
          {payload.success && (
            <div style={{ marginTop: 6, fontSize: 12, fontStyle: 'italic' }}>
              Detailed intel available in the World Map.
            </div>
          )}
        </div>
      );
    }

    if (payload.type === 'spy_detected') {
      return (
        <div style={{ marginTop: 8, padding: 12, background: 'rgba(183, 28, 28, 0.1)', borderRadius: 6, border: '1px solid rgba(183, 28, 28, 0.3)' }}>
          <div style={{ fontWeight: 700, color: '#ff5252', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '1px' }}>
            <i className="fa-solid fa-shield-halved" style={{ marginRight: 8 }}></i>
            Security Alert
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-main)' }}>
            A spy from <strong>{payload.originAreaId}</strong> was detected and captured in your region!
          </div>
          <div style={{ fontSize: 11, opacity: 0.6, marginTop: 8 }}>
            {new Date(payload.timestamp).toLocaleString()}
          </div>
        </div>
      );
    }

    if (payload.type === 'movement_alert') {
      return (
        <div style={{ marginTop: 8, padding: 12, background: 'rgba(255, 152, 0, 0.1)', borderRadius: 6, border: '1px solid rgba(255, 152, 0, 0.3)' }}>
          <div style={{ fontWeight: 700, color: '#ff9800', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '1px' }}>
            <i className="fa-solid fa-person-running" style={{ marginRight: 8 }}></i>
            Movement Detected
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-main)', lineHeight: '1.4' }}>
            {payload.message}
          </div>
          <div style={{ fontSize: 11, opacity: 0.6, marginTop: 8, fontStyle: 'italic' }}>
            Target: {payload.targetAreaId}
          </div>
        </div>
      );
    }

    if (payload.type === 'defender_attack_report') {
      const { unitsSent, survivingDefenders, originalDefenders, loot, log, originAreaId, targetAreaId } = payload;
      return (
        <div style={{ marginTop: 8, padding: 12, background: 'rgba(183, 28, 28, 0.1)', borderRadius: 6, border: '1px solid rgba(183, 28, 28, 0.3)' }}>
          <div style={{ fontWeight: 700, color: '#ff5252', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '1px' }}>
            <i className="fa-solid fa-burst" style={{ marginRight: 8 }}></i>
            Defense Report
          </div>
          <div style={{ fontSize: 13 }}><strong>Target:</strong> {targetAreaId} (Attacked by {originAreaId})</div>
          
          <div style={{ marginTop: 8 }}>
            <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--accent-gold)' }}>Enemy Forces</div>
            <div style={{ color: '#ddd', fontSize: 12 }}>{unitsSent ? Object.entries(unitsSent).filter(([_, v]) => v > 0).map(([k,v])=>`${k}: ${v}`).join(', ') : 'Unknown'}</div>
          </div>

          <div style={{ marginTop: 8 }}>
            <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--accent-gold)' }}>Defenders (Original → Surviving)</div>
            <div style={{ color: '#ddd', fontSize: 12 }}>
              {Object.keys(originalDefenders || {}).length > 0 ? 
                Object.keys(originalDefenders).map(type => {
                  const orig = originalDefenders[type] || 0;
                  const surv = survivingDefenders[type] || 0;
                  return `${type}: ${orig} → ${surv}`;
                }).join(', ') : 'None'}
            </div>
          </div>

          <div style={{ marginTop: 8 }}>
            <div style={{ fontWeight: 700, fontSize: 12, color: '#ff5252' }}>Resources Lost</div>
            <div style={{ color: '#ddd', fontSize: 12 }}>{loot && Object.entries(loot).filter(([_, v]) => v > 0).length > 0 ? Object.entries(loot).filter(([_, v]) => v > 0).map(([k,v])=>`${k}: ${v}`).join(', ') : 'None'}</div>
          </div>

          {log && log.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontWeight: 700, fontSize: 12 }}>Battle Log</div>
              <div style={{ color: '#bbb', fontSize: 11, maxHeight: '100px', overflowY: 'auto' }}>
                {log.map((l,i)=>(<div key={i}>{l.msg || `Round ${l.round}: ${l.defendersLost} defenders lost, ${l.attackersLost} attackers lost`}</div>))}
              </div>
            </div>
          )}
        </div>
      );
    }

    const { type, unitsSent, unitsReturned, loot, log, originAreaId, targetAreaId } = payload;
    return (
      <div style={{ marginTop: 8, padding: 8, background: 'rgba(255,255,255,0.02)', borderRadius: 6 }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>{payload.type === 'expedition_report' ? 'Expedition Report' : 'Attack Report'}</div>
        <div style={{ fontSize: 13 }}><strong>From:</strong> {originAreaId} → <strong>Target:</strong> {targetAreaId}</div>
        <div style={{ marginTop: 6 }}>
          <div style={{ fontWeight: 700 }}>Units Sent</div>
          <div style={{ color: '#ddd' }}>{unitsSent ? Object.entries(unitsSent).filter(([_, v]) => v > 0).map(([k,v])=>`${k}: ${v}`).join(', ') : '—'}</div>
        </div>
        <div style={{ marginTop: 6 }}>
          <div style={{ fontWeight: 700 }}>Units Returned</div>
          <div style={{ color: '#ddd' }}>{unitsReturned ? Object.entries(unitsReturned).filter(([_, v]) => v > 0).map(([k,v])=>`${k}: ${v}`).join(', ') : '—'}</div>
        </div>
        <div style={{ marginTop: 6 }}>
          <div style={{ fontWeight: 700 }}>Loot</div>
          <div style={{ color: '#ddd' }}>{loot ? (Object.entries(loot).filter(([_, v]) => v > 0).length > 0 ? Object.entries(loot).filter(([_, v]) => v > 0).map(([k,v])=>`${k}: ${v}`).join(', ') : 'None') : 'None'}</div>
        </div>
        {log && log.length > 0 && (
          <div style={{ marginTop: 6 }}>
            <div style={{ fontWeight: 700 }}>Log</div>
            <div style={{ color: '#ddd' }}>{log.map((l,i)=>(<div key={i}>{l.msg || JSON.stringify(l)}</div>))}</div>
          </div>
        )}
      </div>
    );
  };

  const CensoredText = ({ text, isCensored }) => {
    if (!isCensored) return <span>{text}</span>;
    return (
      <span style={{ 
        background: '#000', 
        color: '#000', 
        padding: '0 4px', 
        borderRadius: 2,
        userSelect: 'none'
      }}>
        {text.replace(/./g, 'X')}
      </span>
    );
  };

  return (
    <div className="panel medieval-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <span>The Great Archives</span>
        <div className="tabs" style={{ display: 'flex', gap: 12 }}>
          <button 
            className={`btn ${activeTab === 'notifications' ? 'btn-primary' : ''}`} 
            onClick={() => setActiveTab('notifications')}
          >
            Notifications
          </button>
          <button 
            className={`btn ${activeTab === 'espionage' ? 'btn-primary' : ''}`} 
            onClick={() => setActiveTab('espionage')}
          >
            Intelligence Reports
          </button>
        </div>
      </div>

      <div className="panel-body" style={{ padding: 16, overflowY: 'auto', flex: 1 }}>
        {activeTab === 'notifications' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {loading && <div>Loading...</div>}
            {!loading && notifications.length === 0 && <div style={{ color: 'var(--text-muted)' }}>No notifications</div>}
            {notifications.map(n => (
              <div key={n.id} style={{ padding: 12, borderRadius: 6, background: n.read ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 16 }}>{n.text || (n.payload && (n.payload.type === 'expedition_report' ? 'Expedition returned' : 'Report'))}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(n.createdAt).toLocaleString()}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {!n.read && <button className="btn btn-small" onClick={() => markRead(n.id)}>Mark Read</button>}
                  </div>
                </div>
                {n.payload && renderReport(n.payload)}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'espionage' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontStyle: 'italic', color: 'var(--text-muted)', marginBottom: 8 }}>
              "Knowledge is the sharpest blade in the dark."
            </div>
            {loading && <div>Loading...</div>}
            {!loading && espionageReports.length === 0 && <div style={{ color: 'var(--text-muted)' }}>No active intelligence reports. Build a Watchtower to detect movement.</div>}
            {espionageReports.map(r => (
              <div key={r.id} style={{ 
                padding: 16, 
                borderRadius: 4, 
                background: 'rgba(0,0,0,0.2)', 
                color: 'var(--text-main)',
                border: '1px solid var(--wood-light)',
                boxShadow: '2px 2px 5px rgba(0,0,0,0.2)',
                position: 'relative',
                fontFamily: 'var(--font-body)'
              }}>
                {r.type === 'proximity' ? (
                  <>
                    <div style={{ fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: 8, paddingBottom: 4, display: 'flex', justifyContent: 'space-between', color: 'var(--accent-gold)' }}>
                      <span>PROXIMITY ALERT: {r.areaId}</span>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(r.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div style={{ fontSize: 14, lineHeight: 1.6 }}>
                      Movement detected to the <strong>{r.direction}</strong>.
                      <br />
                      Estimated Force Size: <CensoredText text={r.sizeLabel} isCensored={r.distance > 1.5} />
                      <br />
                      Distance: <CensoredText text={`${Math.round(r.distance * 10) / 10} leagues`} isCensored={r.distance > 1.0} />
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontWeight: 700, borderBottom: '1px solid rgba(0,0,0,0.1)', marginBottom: 8, paddingBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
                      <span>SPY REPORT: {r.targetAreaId}</span>
                      <span style={{ fontSize: 12 }}>{new Date(r.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div style={{ fontSize: 14, lineHeight: 1.6 }}>
                      Status: <span style={{ color: r.success ? '#2e7d32' : '#c62828', fontWeight: 700 }}>{r.success ? 'SUCCESS' : 'CAUGHT'}</span>
                      <br />
                      Intel Depth: <CensoredText text={r.depth} isCensored={!r.success} />
                    </div>
                  </>
                )}
                <div style={{ marginTop: 12, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, opacity: 0.7 }}>
                  CONFIDENTIAL - WATCHTOWER EYES ONLY
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

