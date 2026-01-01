import React, { useEffect, useState } from 'react';
import { GameClient } from '../api/client';

export default function GreatArchives() {
  const [activeTab, setActiveTab] = useState('notifications');
  const [notifications, setNotifications] = useState([]);
  const [espionageReports, setEspionageReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedReportId, setExpandedReportId] = useState(null);

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

  const renderReport = (payload, reportId) => {
    if (!payload) return null;
    
    if (payload.type === 'spy_report') {
      const isExpanded = expandedReportId === reportId;
      return (
        <div style={{ marginTop: 8, padding: 8, background: 'rgba(255,255,255,0.02)', borderRadius: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setExpandedReportId(isExpanded ? null : reportId)}>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Spy Report</div>
              <div style={{ fontSize: 13 }}><strong>Target:</strong> {payload.targetAreaId}</div>
            </div>
            <i className={`fa-solid fa-chevron-${isExpanded ? 'up' : 'down'}`} style={{ opacity: 0.5 }}></i>
          </div>
          <div style={{ marginTop: 6 }}>
            <div style={{ fontWeight: 700 }}>Status</div>
            <div style={{ color: payload.success ? '#4caf50' : '#f44336' }}>
              {payload.success ? `Infiltration Successful (Depth: ${payload.depth})` : 'Spy Captured'}
            </div>
          </div>
          {payload.success && isExpanded && payload.intel && (
            <div style={{ marginTop: 12, padding: 8, background: 'rgba(0,0,0,0.2)', borderRadius: 4, border: '1px solid rgba(255,255,255,0.1)' }}>
              {payload.intel.resources && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--accent-gold)', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: 4 }}>Resources</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 4 }}>
                    {Object.entries(payload.intel.resources).map(([res, val]) => (
                      <div key={res} style={{ fontSize: 11 }}>
                        <span style={{ opacity: 0.7 }}>{res}:</span> {Math.floor(val)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {payload.intel.buildings && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--accent-gold)', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: 4 }}>Buildings</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 4 }}>
                    {Object.entries(payload.intel.buildings).map(([bld, lvl]) => (
                      <div key={bld} style={{ fontSize: 11 }}>
                        <span style={{ opacity: 0.7 }}>{bld}:</span> Lvl {lvl}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {payload.intel.units && (
                <div>
                  <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--accent-gold)', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: 4 }}>Garrison</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 4 }}>
                    {Object.entries(payload.intel.units).map(([unit, count]) => (
                      <div key={unit} style={{ fontSize: 11 }}>
                        <span style={{ opacity: 0.7 }}>{unit}:</span> {count}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {payload.success && !isExpanded && (
            <div style={{ marginTop: 6, fontSize: 12, fontStyle: 'italic', opacity: 0.7 }}>
              Click to expand gathered intelligence.
            </div>
          )}
        </div>
      );
    }

    if (payload.type === 'spy_caught') {
      return (
        <div style={{ marginTop: 8, padding: 12, background: 'rgba(183, 28, 28, 0.1)', borderRadius: 6, border: '1px solid rgba(183, 28, 28, 0.3)' }}>
          <div style={{ fontWeight: 700, color: '#ff5252', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '1px' }}>
            <i className="fa-solid fa-skull-crossbones" style={{ marginRight: 8 }}></i>
            Spy Lost
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-main)' }}>
            Your spy was caught and executed in <strong>{payload.areaName || payload.areaId}</strong>.
          </div>
        </div>
      );
    }

    if (payload.type === 'spy_discovered') {
      return (
        <div style={{ marginTop: 8, padding: 12, background: 'rgba(46, 125, 50, 0.1)', borderRadius: 6, border: '1px solid rgba(46, 125, 50, 0.3)' }}>
          <div style={{ fontWeight: 700, color: '#4caf50', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '1px' }}>
            <i className="fa-solid fa-eye" style={{ marginRight: 8 }}></i>
            Counter-Espionage
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-main)' }}>
            An enemy spy was discovered and executed in <strong>{payload.areaName || payload.areaId}</strong>!
            {payload.originAreaId && (
              <div style={{ marginTop: 8, padding: 8, background: 'rgba(0,0,0,0.2)', borderRadius: 4, borderLeft: '3px solid #4caf50' }}>
                <i className="fa-solid fa-location-dot" style={{ marginRight: 8, color: '#4caf50' }}></i>
                Intelligence suggests the spy came from <strong>{payload.originAreaId}</strong>.
              </div>
            )}
          </div>
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

    if (payload.type === 'spy_recall') {
      return (
        <div style={{ marginTop: 8, padding: 12, background: 'rgba(255, 255, 255, 0.05)', borderRadius: 6, border: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <div style={{ fontWeight: 700, color: 'var(--accent-gold)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '1px' }}>
            <i className="fa-solid fa-arrow-rotate-left" style={{ marginRight: 8 }}></i>
            Spy Recalled
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-main)' }}>
            Your spy has been successfully recalled from <strong>{payload.targetAreaId}</strong>.
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

    if (payload.type === 'attack_report' || payload.type === 'expedition_report') {
      const { unitsSent, unitsReturned, loot, log, originAreaId, targetAreaId } = payload;
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
    }

    return null;
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
                {n.payload && renderReport(n.payload, n.id)}
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
            {espionageReports.map(r => {
              const isExpanded = expandedReportId === r.id;
              return (
                <div key={r.id} style={{ 
                  padding: 16, 
                  borderRadius: 4, 
                  background: 'rgba(0,0,0,0.2)', 
                  color: 'var(--text-main)',
                  border: '1px solid var(--wood-light)',
                  boxShadow: '2px 2px 5px rgba(0,0,0,0.2)',
                  position: 'relative',
                  fontFamily: 'var(--font-body)',
                  cursor: r.type === 'spy_report' && r.success ? 'pointer' : 'default'
                }} onClick={() => {
                  if (r.type === 'spy_report' && r.success) {
                    setExpandedReportId(isExpanded ? null : r.id);
                  }
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 12 }}>{new Date(r.timestamp).toLocaleTimeString()}</span>
                          {r.success && <i className={`fa-solid fa-chevron-${isExpanded ? 'up' : 'down'}`} style={{ opacity: 0.5 }}></i>}
                        </div>
                      </div>
                      <div style={{ fontSize: 14, lineHeight: 1.6 }}>
                        Status: <span style={{ color: r.success ? '#2e7d32' : '#c62828', fontWeight: 700 }}>{r.success ? 'SUCCESS' : 'CAUGHT'}</span>
                        <br />
                        Intel Depth: <CensoredText text={r.depth} isCensored={!r.success} />
                      </div>

                      {r.success && isExpanded && r.intel && (
                        <div style={{ marginTop: 12, padding: 12, background: 'rgba(0,0,0,0.3)', borderRadius: 4, border: '1px solid rgba(255,215,0,0.2)' }}>
                          {r.intel.resources && (
                            <div style={{ marginBottom: 12 }}>
                              <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--accent-gold)', borderBottom: '1px solid rgba(255,215,0,0.2)', marginBottom: 6, textTransform: 'uppercase' }}>Resources</div>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 8 }}>
                                {Object.entries(r.intel.resources).map(([res, val]) => (
                                  <div key={res} style={{ fontSize: 13 }}>
                                    <span style={{ opacity: 0.7 }}>{res}:</span> {Math.floor(val)}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {r.intel.buildings && (
                            <div style={{ marginBottom: 12 }}>
                              <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--accent-gold)', borderBottom: '1px solid rgba(255,215,0,0.2)', marginBottom: 6, textTransform: 'uppercase' }}>Buildings</div>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8 }}>
                                {Object.entries(r.intel.buildings).map(([bld, lvl]) => (
                                  <div key={bld} style={{ fontSize: 13 }}>
                                    <span style={{ opacity: 0.7 }}>{bld}:</span> Lvl {lvl}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {r.intel.units && (
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--accent-gold)', borderBottom: '1px solid rgba(255,215,0,0.2)', marginBottom: 6, textTransform: 'uppercase' }}>Garrison</div>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8 }}>
                                {Object.entries(r.intel.units).map(([unit, count]) => (
                                  <div key={unit} style={{ fontSize: 13 }}>
                                    <span style={{ opacity: 0.7 }}>{unit}:</span> {count}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                  <div style={{ marginTop: 12, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, opacity: 0.7 }}>
                    CONFIDENTIAL - WATCHTOWER EYES ONLY
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

